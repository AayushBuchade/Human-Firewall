/**
 * models/riskEventModel.js — Risk Event DB Operations
 *
 * Append-only audit log of every risk score change event.
 * Combined with updateRiskScore() in userModel.js — both
 * should always be called together inside a transaction.
 *
 * Public API:
 *   createRiskEvent({ userId, orgId, scoreChange, scoreAfter, severity, trigger, reason, details })
 *   getRiskEventsForUser(userId, limit)
 *   getRiskEventsForOrg(orgId, limit)
 */

const { query } = require('../db');

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * createRiskEvent — inserts one risk score change record.
 *
 * @param {object} params
 * @param {string|null} params.userId      - FK to users.id
 * @param {string|null} params.orgId       - FK to organizations.id
 * @param {number}      params.scoreChange - Delta applied (+50, +25, 0, -5...)
 * @param {number}      params.scoreAfter  - New cumulative score after delta
 * @param {string}      params.severity    - low | medium | high | critical
 * @param {string}      params.trigger     - email_scan | training | admin_reset
 * @param {string}      params.reason      - Human-readable reason (first analysis reason)
 * @param {object}      params.details     - { subject, senderEmail, verdict, flags... }
 * @returns {Promise<RiskEventRow>}
 */
async function createRiskEvent({
  userId = null,
  orgId = null,
  scoreChange = 0,
  scoreAfter = 0,
  severity = 'low',
  trigger = 'email_scan',
  reason = '',
  details = {},
}) {
  const sql = `
    INSERT INTO risk_events
      (user_id, org_id, score_change, score_after, severity, trigger, reason, details)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, score_change, score_after, severity, created_at
  `;

  const { rows } = await query(sql, [
    userId,
    orgId,
    Math.round(scoreChange),
    Math.max(0, Math.min(100, Math.round(scoreAfter))),
    severity,
    trigger,
    reason.slice(0, 500),
    JSON.stringify(details),
  ]);

  return rows[0];
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * getRiskEventsForUser — audit trail for one user, newest first.
 * Used by GET /api/admin/risk-events?userId=...
 *
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<RiskEventRow[]>}
 */
async function getRiskEventsForUser(userId, limit = 100) {
  const { rows } = await query(
    `SELECT id, user_id, score_change, score_after, severity, trigger, reason, details, created_at
     FROM risk_events
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, Math.min(limit, 500)]
  );
  return rows;
}

/**
 * getRiskEventsForOrg — cross-user risk event feed for admin dashboard.
 *
 * @param {string|null} orgId
 * @param {number} limit
 * @returns {Promise<RiskEventRow[]>}
 */
async function getRiskEventsForOrg(orgId, limit = 100) {
  if (orgId) {
    const { rows } = await query(
      `SELECT re.id, re.user_id, u.email AS user_email, re.score_change,
              re.score_after, re.severity, re.trigger, re.reason, re.created_at
       FROM risk_events re
       LEFT JOIN users u ON u.id = re.user_id
       WHERE re.org_id = $1
       ORDER BY re.created_at DESC
       LIMIT $2`,
      [orgId, Math.min(limit, 500)]
    );
    return rows;
  }

  // No org filter — global feed
  const { rows } = await query(
    `SELECT re.id, re.user_id, u.email AS user_email, re.score_change,
            re.score_after, re.severity, re.trigger, re.reason, re.created_at
     FROM risk_events re
     LEFT JOIN users u ON u.id = re.user_id
     ORDER BY re.created_at DESC
     LIMIT $1`,
    [Math.min(limit, 500)]
  );
  return rows;
}

module.exports = {
  createRiskEvent,
  getRiskEventsForUser,
  getRiskEventsForOrg,
};
