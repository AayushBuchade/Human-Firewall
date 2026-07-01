/**
 * routes/apiDashboard.js — Simple Unified Dashboard Endpoint
 *
 * GET /api/dashboard
 *
 * Returns a single JSON object containing the most important metrics
 * for the authenticated user. Designed for quick display in the
 * extension popup or a lightweight dashboard widget.
 *
 * Response:
 * {
 *   user:            { id, name, email, role, riskScore }
 *   totalScanned:    number  — emails scanned by this user
 *   phishingFound:   number  — PHISHING verdict count
 *   suspiciousFound: number  — SUSPICIOUS verdict count
 *   riskScore:       number  — current cumulative score (0-100)
 *   riskLevel:       "low" | "medium" | "high" | "critical"
 *   recentScans:     last 5 scan summaries
 * }
 */

const express = require('express');
const router = express.Router();

const { requireAuth }        = require('../middleware/auth');
const { findUserById }       = require('../models/userModel');
const { getLogsForUser }     = require('../models/emailLogModel');
const { getRiskEventsForUser } = require('../models/riskEventModel');

/**
 * Maps a 0–100 risk score to a human-readable level label.
 */
function getRiskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

router.get('/', requireAuth, async (req, res) => {
  const { userId } = req.user;

  try {
    // Run all three queries in parallel for a single fast response
    const [user, logs, riskEvents] = await Promise.all([
      findUserById(userId),
      getLogsForUser(userId, 50),
      getRiskEventsForUser(userId, 10),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    // Compute verdict counts from scan history
    const phishingFound   = logs.filter(l => l.verdict === 'PHISHING').length;
    const suspiciousFound = logs.filter(l => l.verdict === 'SUSPICIOUS').length;

    return res.json({
      user: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        role:      user.role,
        riskScore: user.risk_score,
      },
      totalScanned:    logs.length,
      phishingFound,
      suspiciousFound,
      riskScore:  user.risk_score,
      riskLevel:  getRiskLevel(user.risk_score),
      // Last 5 scans for the summary panel
      recentScans: logs.slice(0, 5).map(l => ({
        id:          l.id,
        subject:     l.subject,
        verdict:     l.verdict,
        score:       l.score,
        senderEmail: l.sender_email || '',
        scannedAt:   l.created_at,
      })),
      // Last 5 risk events for the activity feed
      recentRiskEvents: riskEvents.slice(0, 5).map(e => ({
        scoreChange: e.score_change,
        scoreAfter:  e.score_after,
        severity:    e.severity,
        reason:      e.reason,
        timestamp:   e.created_at,
      })),
    });

  } catch (err) {
    console.error('[Dashboard] Error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load dashboard' });
  }
});

module.exports = router;
