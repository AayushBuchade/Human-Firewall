/**
 * routes/emailAnalysis.js — Email Analysis Routes (DB-backed)
 *
 * Refactored from in-memory emailLogs[] to PostgreSQL.
 * All writes use transactions: email_log + risk_event + user.risk_score
 * are either all committed or all rolled back.
 *
 * API surface unchanged — Chrome Extension requires no updates.
 *
 * POST /api/analyze-email         — main analysis endpoint (extension calls this)
 * POST /api/analyze-email/report  — mark a scan as confirmed phishing
 * GET  /api/analyze-email/logs    — authenticated user's scan history
 */

const express = require('express');
const router = express.Router();

const { analyzeEmail }           = require('../utils/riskEngine');
const { analyzeEmailLimiter }    = require('../middleware/rateLimiter');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validateAnalysisPayload } = require('../services/validation');

// DB models (replacing in-memory stores)
const { createEmailLog, markAsReported, getLogsForUser, getLogById } = require('../models/emailLogModel');
const { createRiskEvent }        = require('../models/riskEventModel');
const { updateRiskScore, findUserById } = require('../models/userModel');
const { getClient }              = require('../db');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * mapSeverity — converts a 0-100 score to a severity label.
 * Mirrors the logic in the old riskProfileService.
 */
function mapSeverity(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

/**
 * getRiskDelta — points to add to user's cumulative risk profile per verdict.
 */
function getRiskDelta(verdict) {
  return { PHISHING: 50, SUSPICIOUS: 25, SAFE: 0 }[verdict] ?? 0;
}

// ─── POST /api/analyze-email ──────────────────────────────────────────────────

/**
 * Main endpoint called by the Chrome Extension content script.
 *
 * Flow (when user is authenticated):
 *  1. Validate & sanitize input
 *  2. Run risk engine (synchronous, in-process)
 *  3. DB transaction:
 *     a. INSERT email_logs
 *     b. INSERT risk_events (if verdict != SAFE)
 *     c. UPDATE users.risk_score (if verdict != SAFE)
 *  4. Return verdict + logId to extension
 *
 * When user is anonymous (no JWT), steps 3b/3c are skipped.
 * The email_log is still written with user_id = NULL.
 */
router.post('/', analyzeEmailLimiter, optionalAuth, async (req, res) => {
  // ── Input Validation ─────────────────────────────────────────────────────
  const { value, error } = validateAnalysisPayload(req.body);
  if (error) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: error });
  }

  // ── Risk Engine (pure function — no I/O) ─────────────────────────────────
  const analysis = analyzeEmail({
    subject:    value.subject,
    body:       value.body,
    sender:     value.sender,
    links:      value.links,
    reportType: req.body.reportType === 'click_intercept' ? 'click_intercept' : 'email_open',
  });

  const userId = req.user?.userId || null;
  const orgId  = req.user?.orgId  || null;

  // ── DB Write (transaction) ────────────────────────────────────────────────
  let logId;

  if (userId) {
    // Authenticated user — use a transaction to keep all writes atomic
    let client;
    try {
      client = await getClient();
      await client.query('BEGIN');

      // 1. Log the scan
      const { rows: logRows } = await client.query(
        `INSERT INTO email_logs
           (user_id, user_email, org_id, platform, message_id, subject,
            sender, verdict, score, reasons, flagged_links, indicators)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          userId,
          req.user.email,
          orgId,
          value.platform,
          value.messageId || null,
          value.subject.slice(0, 200),
          JSON.stringify(value.sender),
          analysis.verdict,
          analysis.score,
          JSON.stringify(analysis.reasons),
          JSON.stringify(analysis.flaggedLinks),
          JSON.stringify(analysis.indicators || {}),
        ]
      );
      logId = logRows[0].id;

      // 2. If risk increased, insert a risk event and update user score
      const delta = getRiskDelta(analysis.verdict);
      if (delta > 0) {
        // Compute new score (clamped 0–100)
        const userRow = await client.query(
          'SELECT risk_score FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        const currentScore  = userRow.rows[0]?.risk_score ?? 0;
        const newScore      = Math.min(100, currentScore + delta);

        await client.query(
          'UPDATE users SET risk_score = $1 WHERE id = $2',
          [newScore, userId]
        );

        await client.query(
          `INSERT INTO risk_events
             (user_id, org_id, score_change, score_after, severity, trigger, reason, details)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            userId,
            orgId,
            delta,
            newScore,
            mapSeverity(analysis.score),
            'email_scan',
            (analysis.reasons[0] || '').slice(0, 500),
            JSON.stringify({
              subject:     value.subject.slice(0, 120),
              senderEmail: value.sender.email,
              verdict:     analysis.verdict,
              score:       analysis.score,
              platform:    value.platform,
            }),
          ]
        );
      }

      await client.query('COMMIT');

    } catch (dbErr) {
      if (client) await client.query('ROLLBACK');
      console.error('[EmailAnalysis] DB transaction failed:', dbErr.message);
      // Don't fail the request — return the analysis result with a warning
      // The extension should still show the verdict even if logging failed
      logId = null;
    } finally {
      if (client) client.release();
    }

  } else {
    // Anonymous scan — just write the log row (no risk profile update)
    try {
      const logRow = await createEmailLog({
        userId:       null,
        userEmail:    value.userEmail || 'anonymous',
        orgId:        null,
        platform:     value.platform,
        messageId:    value.messageId,
        subject:      value.subject,
        sender:       value.sender,
        verdict:      analysis.verdict,
        score:        analysis.score,
        reasons:      analysis.reasons,
        flaggedLinks: analysis.flaggedLinks,
        indicators:   analysis.indicators || {},
      });
      logId = logRow?.id || null;
    } catch (dbErr) {
      console.warn('[EmailAnalysis] Anonymous log write failed (non-fatal):', dbErr.message);
      logId = null;
    }
  }

  console.log(`[EmailAnalysis] verdict=${analysis.verdict} score=${analysis.score} platform=${value.platform} user=${req.user?.email || 'anonymous'}`);

  return res.json({
    verdict:      analysis.verdict,
    score:        analysis.score,
    reasons:      analysis.reasons,
    flaggedLinks: analysis.flaggedLinks,
    indicators:   analysis.indicators,
    sender:       value.sender,
    logId,
  });
});

// ─── POST /api/analyze-email/report ──────────────────────────────────────────

/**
 * Called by the extension popup "Report Phishing" button.
 * Marks an existing email_logs row as user-confirmed phishing.
 */
router.post('/report', optionalAuth, async (req, res) => {
  const { logId, userEmail } = req.body;

  if (!logId) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'logId is required' });
  }

  try {
    const reportedBy = req.user?.email || userEmail || 'anonymous';
    const updated    = await markAsReported(logId, reportedBy);

    if (!updated) {
      // Could be: logId not found, or already reported
      const exists = await getLogById(logId);
      if (!exists) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Log entry not found' });
      }
      // Already reported — idempotent response
    }

    return res.json({
      success: true,
      message: 'Phishing report submitted. Thank you for helping keep your organization safe.',
      logId,
    });

  } catch (err) {
    console.error('[EmailAnalysis] Report error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to submit report' });
  }
});

// ─── GET /api/analyze-email/logs ─────────────────────────────────────────────

/**
 * Returns the authenticated user's scan history from the DB.
 * Requires valid JWT.
 */
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const logs = await getLogsForUser(req.user.userId, 50);

    return res.json({
      logs: logs.map(l => ({
        id:               l.id,
        subject:          l.subject,
        verdict:          l.verdict,
        score:            l.score,
        senderEmail:      l.sender_email || '',
        reportedPhishing: l.reported_phishing,
        timestamp:        l.created_at,
      })),
      total: logs.length,
    });

  } catch (err) {
    console.error('[EmailAnalysis] Logs fetch error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch scan history' });
  }
});

module.exports = router;
