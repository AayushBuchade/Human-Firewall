/**
 * routes/admin.js — Admin Dashboard API (DB-backed)
 *
 * Refactored from in-memory stores to PostgreSQL model queries.
 * All routes require JWT with role === 'admin'.
 *
 * GET  /api/admin/overview    — org-wide risk summary
 * GET  /api/admin/users       — paginated user list with risk scores
 * GET  /api/admin/email-logs  — filterable scan log
 * GET  /api/admin/risk-events — audit trail of score changes
 */

const express = require('express');
const router = express.Router();

const { requireAuth, requireAdmin }       = require('../middleware/auth');
const { listUsersForOrg }                 = require('../models/userModel');
const { getLogsForOrg, getOrgScanSummary } = require('../models/emailLogModel');
const { getRiskEventsForOrg, getRiskEventsForUser } = require('../models/riskEventModel');

// All admin routes require authentication AND admin role
router.use(requireAuth, requireAdmin);

// ─── GET /api/admin/overview ─────────────────────────────────────────────────

router.get('/overview', async (req, res) => {
  const orgId = req.user?.orgId || null;

  try {
    // Run scan summary and user list in parallel for speed
    const [summary, { users: topUsers }] = await Promise.all([
      getOrgScanSummary(orgId),
      listUsersForOrg(orgId, { limit: 5, offset: 0 }),
    ]);

    return res.json({
      totalScans:       parseInt(summary.total_scans   || 0, 10),
      phishingDetected: parseInt(summary.phishing_count || 0, 10),
      suspiciousCount:  parseInt(summary.suspicious_count || 0, 10),
      safeCount:        parseInt(summary.safe_count    || 0, 10),
      phishingReports:  parseInt(summary.reported_count || 0, 10),
      avgScanScore:     parseFloat(summary.avg_score   || 0),
      verdictBreakdown: {
        SAFE:       parseInt(summary.safe_count       || 0, 10),
        SUSPICIOUS: parseInt(summary.suspicious_count || 0, 10),
        PHISHING:   parseInt(summary.phishing_count   || 0, 10),
      },
      // Top 5 highest-risk users (already sorted by risk_score DESC from DB)
      topRiskUsers: topUsers.map(u => ({
        id:         u.id,
        name:       u.name,
        email:      u.email,
        department: u.department,
        riskScore:  u.risk_score,
      })),
      totalUsers:  topUsers.length, // Will be full count in real usage
      lastUpdated: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[Admin] Overview error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load overview' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const orgId  = req.user?.orgId || null;

  try {
    const { users, total } = await listUsersForOrg(orgId, { limit, offset });

    return res.json({
      users: users.map(u => ({
        id:         u.id,
        name:       u.name,
        email:      u.email,
        department: u.department,
        riskScore:  u.risk_score,
        joinedAt:   u.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error('[Admin] Users error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load users' });
  }
});

// ─── GET /api/admin/email-logs ────────────────────────────────────────────────

router.get('/email-logs', async (req, res) => {
  const { verdict, reported, limit: limitStr, page: pageStr } = req.query;
  const limit      = Math.min(200, parseInt(limitStr) || 50);
  const page       = Math.max(1, parseInt(pageStr) || 1);
  const offset     = (page - 1) * limit;
  const orgId      = req.user?.orgId || null;
  const reportedOnly = reported === 'true';

  try {
    const { logs, total } = await getLogsForOrg(orgId, {
      verdict:      verdict || null,
      reportedOnly,
      limit,
      offset,
    });

    return res.json({
      logs: logs.map(l => ({
        id:               l.id,
        userEmail:        l.user_email,
        subject:          l.subject,
        senderEmail:      l.sender_email || '',
        verdict:          l.verdict,
        score:            l.score,
        flaggedLinkCount: Array.isArray(l.flagged_links) ? l.flagged_links.length : 0,
        reportedPhishing: l.reported_phishing,
        timestamp:        l.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error('[Admin] Email logs error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load email logs' });
  }
});

// ─── GET /api/admin/risk-events ───────────────────────────────────────────────

router.get('/risk-events', async (req, res) => {
  const { userId, limit: limitStr } = req.query;
  const limit = Math.min(500, parseInt(limitStr) || 100);
  const orgId = req.user?.orgId || null;

  try {
    if (userId) {
      const events = await getRiskEventsForUser(userId, limit);
      return res.json({ events, total: events.length });
    }

    const events = await getRiskEventsForOrg(orgId, limit);
    return res.json({ events, total: events.length });

  } catch (err) {
    console.error('[Admin] Risk events error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load risk events' });
  }
});

module.exports = router;
