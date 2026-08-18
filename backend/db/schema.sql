-- =============================================================================
-- schema.sql — Aware Guard PostgreSQL Schema Upgraded
-- =============================================================================

-- Enable UUID generation (PostgreSQL built-in since v13)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables in reverse order of dependencies to reset cleanly
DROP VIEW IF EXISTS org_scan_summary CASCADE;
DROP TABLE IF EXISTS security_activity CASCADE;
DROP TABLE IF EXISTS employee_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS employee_training_progress CASCADE;
DROP TABLE IF EXISTS training_attempts CASCADE;
DROP TABLE IF EXISTS training_questions CASCADE;
DROP TABLE IF EXISTS training_lessons CASCADE;
DROP TABLE IF EXISTS training_modules CASCADE;
DROP TABLE IF EXISTS training_courses CASCADE;
DROP TABLE IF EXISTS risk_events CASCADE;
DROP TABLE IF EXISTS risk_scores CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS phishing_events CASCADE;
DROP TABLE IF EXISTS phishing_simulations CASCADE;
DROP TABLE IF EXISTS phishing_templates CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- =============================================================================
-- 1. organizations
-- =============================================================================
CREATE TABLE organizations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  plan        VARCHAR(50)  NOT NULL DEFAULT 'free',   -- free | starter | enterprise
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed default organization
INSERT INTO organizations (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Corp', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. departments
-- =============================================================================
CREATE TABLE departments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_dept_per_org UNIQUE(org_id, name)
);

-- =============================================================================
-- 3. users
-- =============================================================================
CREATE TABLE users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(320) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(120) NOT NULL DEFAULT '',
  role            VARCHAR(20)  NOT NULL DEFAULT 'employee', -- employee | admin
  department      VARCHAR(100) NOT NULL DEFAULT 'General',
  department_id   UUID         REFERENCES departments(id) ON DELETE SET NULL,
  org_id          UUID         REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Behavior, analytics and training fields
  job_role                       VARCHAR(100) NOT NULL DEFAULT 'Employee',
  risk_score                     INTEGER      NOT NULL DEFAULT 40 CHECK (risk_score BETWEEN 0 AND 100),
  risk_level                     VARCHAR(50)  NOT NULL DEFAULT 'Low Risk',
  phishing_attempts              INTEGER      NOT NULL DEFAULT 0,
  phishing_clicked               INTEGER      NOT NULL DEFAULT 0,
  phishing_reported              INTEGER      NOT NULL DEFAULT 0,
  credential_submission_attempts INTEGER      NOT NULL DEFAULT 0,
  training_completed             INTEGER      NOT NULL DEFAULT 0,
  training_progress              INTEGER      NOT NULL DEFAULT 0,
  training_xp                    INTEGER      NOT NULL DEFAULT 0,
  lessons_completed              JSONB        NOT NULL DEFAULT '[]', -- Array of lesson IDs (cached for ease of use)
  failed_quizzes                 INTEGER      NOT NULL DEFAULT 0,
  successful_quizzes             INTEGER      NOT NULL DEFAULT 0,
  last_activity                  TIMESTAMPTZ,
  last_phishing_event            TIMESTAMPTZ,
  account_created                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  security_streak                INTEGER      NOT NULL DEFAULT 0,
  total_simulations              INTEGER      NOT NULL DEFAULT 0,
  created_at                     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  avatar                         VARCHAR(10)  NOT NULL DEFAULT '',

  CONSTRAINT users_email_org_unique UNIQUE (email, org_id)
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users (org_id);
CREATE INDEX IF NOT EXISTS idx_users_risk_score ON users (risk_score DESC);

-- =============================================================================
-- 4. campaigns
-- =============================================================================
CREATE TABLE campaigns (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  target_departments  JSONB        NOT NULL DEFAULT '[]', -- Array of department names or IDs
  attack_category     VARCHAR(100) NOT NULL,
  difficulty          VARCHAR(50)  NOT NULL,
  num_simulations     INTEGER      NOT NULL DEFAULT 0,
  start_date          TIMESTAMPTZ  NOT NULL,
  end_date            TIMESTAMPTZ  NOT NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. phishing_templates
-- =============================================================================
CREATE TABLE phishing_templates (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID         REFERENCES campaigns(id) ON DELETE SET NULL,
  subject               VARCHAR(255) NOT NULL,
  sender_name           VARCHAR(255) NOT NULL,
  sender_email          VARCHAR(255) NOT NULL,
  body                  TEXT         NOT NULL,
  category              VARCHAR(100) NOT NULL,
  difficulty            VARCHAR(50)  NOT NULL,
  attack_technique      VARCHAR(100) NOT NULL DEFAULT '',
  risk_score            INTEGER      NOT NULL DEFAULT 0,
  red_flags             JSONB        NOT NULL DEFAULT '[]', -- JSON array of red flags
  expected_user_action  VARCHAR(255) NOT NULL DEFAULT 'Ignore',
  explanation           TEXT         NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. phishing_simulations
-- =============================================================================
CREATE TABLE phishing_simulations (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID         NOT NULL REFERENCES phishing_templates(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id   UUID         REFERENCES campaigns(id) ON DELETE CASCADE,
  status        VARCHAR(50)  NOT NULL DEFAULT 'sent', -- sent | opened | clicked | reported | ignored
  acted_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. phishing_events
-- =============================================================================
CREATE TABLE phishing_events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id   UUID         REFERENCES phishing_simulations(id) ON DELETE SET NULL,
  user_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
  event_type      VARCHAR(50)  NOT NULL, -- EMAIL_OPENED, LINK_CLICKED, PHISHING_REPORTED, MARKED_SAFE, ATTACHMENT_OPENED, ANALYSIS_REQUESTED
  details         JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8. email_logs (Chrome extension scanning history)
-- =============================================================================
CREATE TABLE email_logs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         REFERENCES users(id) ON DELETE SET NULL,
  user_email        VARCHAR(320) NOT NULL DEFAULT 'anonymous',
  org_id            UUID         REFERENCES organizations(id) ON DELETE SET NULL,
  platform          VARCHAR(30)  NOT NULL DEFAULT 'unknown',
  message_id        VARCHAR(180),
  subject           VARCHAR(200) NOT NULL DEFAULT '',
  sender            JSONB        NOT NULL DEFAULT '{}',
  verdict           VARCHAR(20)  NOT NULL CHECK (verdict IN ('SAFE', 'SUSPICIOUS', 'PHISHING')),
  score             INTEGER      NOT NULL CHECK (score BETWEEN 0 AND 100),
  reasons           JSONB        NOT NULL DEFAULT '[]',
  flagged_links     JSONB        NOT NULL DEFAULT '[]',
  indicators        JSONB        NOT NULL DEFAULT '{}',
  reported_phishing BOOLEAN      NOT NULL DEFAULT FALSE,
  reported_at       TIMESTAMPTZ,
  reported_by       VARCHAR(320),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id    ON email_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_verdict    ON email_logs (verdict);
CREATE INDEX IF NOT EXISTS idx_email_logs_org_id     ON email_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);

-- =============================================================================
-- 9. risk_scores
-- =============================================================================
CREATE TABLE risk_scores (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score         INTEGER      NOT NULL CHECK (score BETWEEN 0 AND 100),
  recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 10. risk_events
-- =============================================================================
CREATE TABLE risk_events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
  org_id       UUID         REFERENCES organizations(id) ON DELETE SET NULL,
  score_change INTEGER      NOT NULL,
  score_after  INTEGER      NOT NULL CHECK (score_after BETWEEN 0 AND 100),
  severity     VARCHAR(20)  NOT NULL DEFAULT 'low',
  trigger      VARCHAR(50)  NOT NULL DEFAULT 'email_scan',
  reason       VARCHAR(500) NOT NULL DEFAULT '',
  details      JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_events_user_id   ON risk_events (user_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_created   ON risk_events (created_at DESC);

-- =============================================================================
-- 11. training_courses
-- =============================================================================
CREATE TABLE training_courses (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  description   TEXT         NOT NULL DEFAULT '',
  category      VARCHAR(100) NOT NULL,
  difficulty    VARCHAR(50)  NOT NULL DEFAULT 'beginner',
  duration      VARCHAR(50)  NOT NULL DEFAULT '10 min',
  xp            INTEGER      NOT NULL DEFAULT 100,
  icon          VARCHAR(50)  NOT NULL DEFAULT '🎣',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 12. training_modules
-- =============================================================================
CREATE TABLE training_modules (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID         NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT         NOT NULL DEFAULT '',
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 13. training_lessons
-- =============================================================================
CREATE TABLE training_lessons (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id     UUID         NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  content       TEXT         NOT NULL DEFAULT '',
  tip           VARCHAR(500),
  slides        JSONB        NOT NULL DEFAULT '[]', -- Array of slides
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 14. training_questions
-- =============================================================================
CREATE TABLE training_questions (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id             UUID         NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  question_text         TEXT         NOT NULL,
  options               JSONB        NOT NULL, -- Array of strings
  correct_option_index  INTEGER      NOT NULL,
  explanation           TEXT         NOT NULL DEFAULT '',
  type                  VARCHAR(50)  NOT NULL DEFAULT 'multiple_choice', -- multiple_choice | true_false | spot_red_flag | email_analysis
  extra_data            JSONB        NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 15. training_attempts
-- =============================================================================
CREATE TABLE training_attempts (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     UUID         NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  question_id   UUID         NOT NULL REFERENCES training_questions(id) ON DELETE CASCADE,
  is_correct    BOOLEAN      NOT NULL,
  answer_index  INTEGER      NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 16. employee_training_progress
-- =============================================================================
CREATE TABLE employee_training_progress (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id             UUID         NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  status                VARCHAR(50)  NOT NULL DEFAULT 'in_progress', -- in_progress | completed
  progress_percentage   INTEGER      NOT NULL DEFAULT 0,
  completed_lessons     JSONB        NOT NULL DEFAULT '[]', -- Array of lesson IDs
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_course UNIQUE(user_id, course_id)
);

-- =============================================================================
-- 17. badges
-- =============================================================================
CREATE TABLE badges (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL UNIQUE,
  description           VARCHAR(255) NOT NULL,
  icon                  VARCHAR(50)  NOT NULL DEFAULT '🏆',
  requirement_type      VARCHAR(50)  NOT NULL, -- phishing_reported_streak | training_completed | etc.
  requirement_threshold INTEGER      NOT NULL,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 18. employee_badges
-- =============================================================================
CREATE TABLE employee_badges (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id      UUID         NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_badge UNIQUE(user_id, badge_id)
);

-- =============================================================================
-- 19. security_activity
-- =============================================================================
CREATE TABLE security_activity (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL, -- COMPLETED_LESSON | REPORTED_PHISHING | FAILED_PHISHING | SUBMITTED_CREDENTIALS | INCIDENT_REPORTED
  description   VARCHAR(500) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 20. Views
-- =============================================================================
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
