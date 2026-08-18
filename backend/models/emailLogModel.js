/**
 * models/emailLogModel.js — Email Log DB Operations
 *
 * Stores every email scan result from the Chrome Extension.
 * Rows are insert-only (append-only audit log).
 * The only mutation allowed is setting reported_phishing = true.
 *
 * Public API:
 *   createEmailLog({ userId, userEmail, orgId, platform, messageId,
 *                    subject, sender, verdict, score, reasons,
 *                    flaggedLinks, indicators })
 *   markAsReported(logId, reportedBy)
 *   getLogById(logId)
 *   getLogsForUser(userId, limit)
 *   getLogsForOrg(orgId, { verdict, reportedOnly, limit, offset })
 *   getOrgScanSummary(orgId)
 */

const { query } = require('../db');

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * createEmailLog — inserts one scan result row.
 *
 * JSONB columns (sender, reasons, flagged_links, indicators) accept JavaScript
 * objects/arrays — pg driver serializes them to JSON automatically.
 *
 * @returns {Promise<EmailLogRow>} the inserted row including db-generated id & created_at
 */
async function createEmailLog({
  userId = null,
  userEmail = 'anonymous',
  orgId = null,
  platform = 'unknown',
  messageId = null,
  subject = '',
  sender = {},
  verdict,
  score,
  reasons = [],
  flaggedLinks = [],
  indicators = {},
}) {
  const sql = `
    INSERT INTO email_logs
      (user_id, user_email, org_id, platform, message_id, subject,
       sender, verdict, score, reasons, flagged_links, indicators)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, verdict, score, created_at
  `;

  const { rows } = await query(sql, [
    userId,
    userEmail,
    orgId,
    platform,
    messageId || null,
    subject.slice(0, 200),
    JSON.stringify(sender),
    verdict,
    score,
    JSON.stringify(reasons),
    JSON.stringify(flaggedLinks),
    JSON.stringify(indicators),
  ]);

  return rows[0];
}

/**
 * markAsReported — sets reported_phishing = true and records who reported it.
 * Called by POST /api/analyze-email/report.
 *
 * @param {string} logId    - UUID of the email_logs row
 * @param {string} reportedBy - Email of the user submitting the report
 * @returns {Promise<boolean>} true if updated, false if logId not found
 */
async function markAsReported(logId, reportedBy = 'anonymous') {
  const { rowCount } = await query(
    `UPDATE email_logs
     SET reported_phishing = TRUE,
         reported_at = NOW(),
         reported_by = $2
     WHERE id = $1 AND reported_phishing = FALSE`,
    [logId, reportedBy]
  );
  return rowCount > 0;
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * getLogById — fetches a single log row by its UUID.
 *
 * @param {string} logId
 * @returns {Promise<EmailLogRow|null>}
 */
async function getLogById(logId) {
  const { rows } = await query(
    `SELECT id, user_id, user_email, org_id, subject, sender, verdict, score,
            reasons, flagged_links, reported_phishing, reported_at, reported_by, created_at
     FROM email_logs WHERE id = $1`,
    [logId]
  );
  return rows[0] || null;
}

/**
 * getLogsForUser — returns a user's recent scan history, newest first.
 * Used by GET /api/analyze-email/logs (authenticated endpoint).
 *
 * @param {string} userId
 * @param {number} limit - max rows to return (default 50)
 * @returns {Promise<EmailLogRow[]>}
 */
async function getLogsForUser(userId, limit = 50) {
  const { rows } = await query(
    `SELECT id, subject, verdict, score, reported_phishing,
            sender->>'email' AS sender_email, created_at
     FROM email_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, Math.min(limit, 200)]
  );
  return rows;
}

/**
 * getLogsForOrg — paginated, filterable log list for admin dashboard.
 *
 * @param {string|null} orgId
 * @param {{ verdict, reportedOnly, limit, offset }} options
 * @returns {Promise<{ logs: EmailLogRow[], total: number }>}
 */
async function getLogsForOrg(orgId, { verdict = null, reportedOnly = false, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params = [];

  if (orgId) {
    params.push(orgId);
    conditions.push(`org_id = $${params.length}`);
  }

  if (verdict) {
    params.push(verdict.toUpperCase());
    conditions.push(`verdict = $${params.length}`);
  }

  if (reportedOnly) {
    conditions.push('reported_phishing = TRUE');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Run data and count queries in parallel for efficiency
  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT id, user_email, subject, sender->>'email' AS sender_email,
              verdict, score, flagged_links, reported_phishing, created_at
       FROM email_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Math.min(limit, 200), offset]
    ),
    query(
      `SELECT COUNT(*) AS total FROM email_logs ${whereClause}`,
      params
    ),
  ]);

  return {
    logs: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
}

/**
 * getOrgScanSummary — returns the pre-aggregated org_scan_summary view row.
 * Backed by the DB view defined in schema.sql for O(1) admin dashboard queries.
 *
 * @param {string|null} orgId
 * @returns {Promise<ScanSummary>}
 */
async function getOrgScanSummary(orgId) {
  if (orgId) {
    const { rows } = await query(
      'SELECT * FROM org_scan_summary WHERE org_id = $1',
      [orgId]
    );
    return rows[0] || { total_scans: 0, phishing_count: 0, suspicious_count: 0, safe_count: 0, reported_count: 0 };
  }

  // No org filter — return global totals
  const { rows } = await query(`
    SELECT
      SUM(total_scans)::INT      AS total_scans,
      SUM(phishing_count)::INT   AS phishing_count,
      SUM(suspicious_count)::INT AS suspicious_count,
      SUM(safe_count)::INT       AS safe_count,
      SUM(reported_count)::INT   AS reported_count,
      AVG(avg_score)::NUMERIC(5,1) AS avg_score
    FROM org_scan_summary
  `);
  return rows[0] || {};
}

module.exports = {
  createEmailLog,
  markAsReported,
  getLogById,
  getLogsForUser,
  getLogsForOrg,
  getOrgScanSummary,
};
