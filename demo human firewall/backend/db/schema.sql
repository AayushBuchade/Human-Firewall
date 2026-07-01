-- =============================================================================
-- schema.sql — Aware Guard PostgreSQL Schema
--
-- Run this once against a fresh database to initialize all tables.
--   psql -U postgres -d awareguard -f schema.sql
--
-- Design decisions:
--   - UUIDs as primary keys (avoids sequential ID enumeration attacks)
--   - created_at with DEFAULT NOW() (never set manually in application code)
--   - org_id FK on all tenant-scoped tables (multi-tenant from day 1)
--   - risk_score stored as INTEGER (0–100) on users table for fast dashboard queries
--   - JSONB columns for flexible metadata (reasons[], flagged_links[]) — queryable
--   - Indexes on all FK columns and high-frequency filter columns
-- =============================================================================

-- Enable UUID generation (PostgreSQL built-in since v13)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. organizations
--    Top-level tenant entity. Every user belongs to exactly one organization.
--    Used to scope all data (email_logs, risk_events) by tenant.
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  plan        VARCHAR(50)  NOT NULL DEFAULT 'free',   -- free | starter | enterprise
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed a default organization for local development
INSERT INTO organizations (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Corp', 'enterprise')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 2. users
--    Core user table. Stores authentication credentials and cumulative risk score.
--    The risk_score column is updated in-place on every email scan so the admin
--    dashboard can do a single fast SELECT without aggregating risk_events.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(320) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(120) NOT NULL DEFAULT '',
  role            VARCHAR(20)  NOT NULL DEFAULT 'employee', -- employee | admin
  department      VARCHAR(100) NOT NULL DEFAULT 'General',
  org_id          UUID         REFERENCES organizations(id) ON DELETE SET NULL,
  risk_score      INTEGER      NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Enforce email uniqueness per organization (same email can exist in different orgs)
  CONSTRAINT users_email_org_unique UNIQUE (email, org_id)
);

-- Index for login lookups (most frequent query on this table)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
-- Index for org-scoped admin queries
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users (org_id);
-- Index for risk dashboard sorting
CREATE INDEX IF NOT EXISTS idx_users_risk_score ON users (risk_score DESC);


-- =============================================================================
-- 3. email_logs
--    Immutable record of every email scanned by the Chrome Extension.
--    One row per scan. Never updated (except the reported_phishing flag).
--    JSONB columns (reasons, flagged_links, sender) allow flexible schema
--    evolution without ALTER TABLE migrations.
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         REFERENCES users(id) ON DELETE SET NULL,
  user_email        VARCHAR(320) NOT NULL DEFAULT 'anonymous',
  org_id            UUID         REFERENCES organizations(id) ON DELETE SET NULL,
  platform          VARCHAR(30)  NOT NULL DEFAULT 'unknown',   -- gmail | outlook | unknown
  message_id        VARCHAR(180),                              -- Gmail/Outlook internal ID (dedup)
  subject           VARCHAR(200) NOT NULL DEFAULT '',
  sender            JSONB        NOT NULL DEFAULT '{}',        -- { name, email, domain, displayText }
  verdict           VARCHAR(20)  NOT NULL CHECK (verdict IN ('SAFE', 'SUSPICIOUS', 'PHISHING')),
  score             INTEGER      NOT NULL CHECK (score BETWEEN 0 AND 100),
  reasons           JSONB        NOT NULL DEFAULT '[]',        -- string[]
  flagged_links     JSONB        NOT NULL DEFAULT '[]',        -- string[]
  indicators        JSONB        NOT NULL DEFAULT '{}',        -- { urgency, authority, financial, ... }
  reported_phishing BOOLEAN      NOT NULL DEFAULT FALSE,
  reported_at       TIMESTAMPTZ,
  reported_by       VARCHAR(320),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast user history queries (GET /api/analyze-email/logs)
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id    ON email_logs (user_id);
-- Admin verdict filtering (?verdict=PHISHING)
CREATE INDEX IF NOT EXISTS idx_email_logs_verdict    ON email_logs (verdict);
-- Admin org-scoped queries
CREATE INDEX IF NOT EXISTS idx_email_logs_org_id     ON email_logs (org_id);
-- Deduplication by platform message ID
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON email_logs (message_id) WHERE message_id IS NOT NULL;
-- Recent-first ordering (most common sort)
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);


-- =============================================================================
-- 4. risk_events
--    Append-only audit log of every risk score change.
--    Used for the admin risk timeline and forensics.
--    Never delete rows — this is an immutable audit trail.
-- =============================================================================

CREATE TABLE IF NOT EXISTS risk_events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
  org_id       UUID         REFERENCES organizations(id) ON DELETE SET NULL,
  score_change INTEGER      NOT NULL,           -- Can be negative (risk reduced by training)
  score_after  INTEGER      NOT NULL CHECK (score_after BETWEEN 0 AND 100),
  severity     VARCHAR(20)  NOT NULL DEFAULT 'low',  -- low | medium | high | critical
  trigger      VARCHAR(50)  NOT NULL DEFAULT 'email_scan',  -- email_scan | training | admin_reset
  reason       VARCHAR(500) NOT NULL DEFAULT '',
  details      JSONB        NOT NULL DEFAULT '{}',  -- { subject, senderEmail, verdict, ... }
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit trail queries per user
CREATE INDEX IF NOT EXISTS idx_risk_events_user_id   ON risk_events (user_id);
-- Org-wide risk event reports
CREATE INDEX IF NOT EXISTS idx_risk_events_org_id    ON risk_events (org_id);
-- Time-series queries (admin risk timeline)
CREATE INDEX IF NOT EXISTS idx_risk_events_created   ON risk_events (created_at DESC);
-- Severity filtering
CREATE INDEX IF NOT EXISTS idx_risk_events_severity  ON risk_events (severity);


-- =============================================================================
-- 5. Helpful views (optional — for reporting queries)
-- =============================================================================

-- Per-org scan summary — used by /api/admin/overview
CREATE OR REPLACE VIEW org_scan_summary AS
SELECT
  org_id,
  COUNT(*)                                                        AS total_scans,
  COUNT(*) FILTER (WHERE verdict = 'PHISHING')                    AS phishing_count,
  COUNT(*) FILTER (WHERE verdict = 'SUSPICIOUS')                  AS suspicious_count,
  COUNT(*) FILTER (WHERE verdict = 'SAFE')                        AS safe_count,
  COUNT(*) FILTER (WHERE reported_phishing = TRUE)                AS reported_count,
  AVG(score)::NUMERIC(5,1)                                        AS avg_score,
  MAX(created_at)                                                 AS last_scan_at
FROM email_logs
GROUP BY org_id;
