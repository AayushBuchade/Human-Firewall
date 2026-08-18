/**
 * models/userModel.js — User DB Operations
 *
 * All queries are async and throw on DB failure — callers must use try/catch.
 * Passwords are NEVER stored in plain text; only password_hash is written here.
 *
 * Public API:
 *   createUser({ name, email, passwordHash, role, department, orgId })
 *   findUserByEmail(email, orgId?)
 *   findUserById(id)
 *   updateRiskScore(userId, newScore)
 *   deleteUser(userId)
 *   listUsersForOrg(orgId, { limit, offset })
 */

const { query } = require('../db');

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * createUser — inserts a new user row and returns the full record.
 *
 * @param {{ name, email, passwordHash, role, department, orgId }} params
 * @returns {Promise<UserRow>}
 */
async function createUser({ name, email, passwordHash, role = 'employee', department = 'General', orgId = null }) {
  const sql = `
    INSERT INTO users (name, email, password_hash, role, department, org_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, email, role, department, org_id, risk_score, created_at
  `;

  // email is normalized to lowercase at the route layer before reaching here
  const { rows } = await query(sql, [name, email.toLowerCase(), passwordHash, role, department, orgId]);
  return rows[0];
}

/**
 * updateRiskScore — atomically updates a user's cumulative risk score.
 * Clamps the value in the DB to the 0–100 range enforced by the CHECK constraint.
 *
 * @param {string} userId
 * @param {number} newScore - Already-clamped value (0–100)
 * @returns {Promise<{ risk_score: number }>}
 */
async function updateRiskScore(userId, newScore) {
  const clamped = Math.max(0, Math.min(100, Math.round(newScore)));

  const { rows } = await query(
    'UPDATE users SET risk_score = $1 WHERE id = $2 RETURNING risk_score',
    [clamped, userId]
  );

  return rows[0] || null;
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * findUserByEmail — looks up a user by email address.
 * Optionally scoped to an org for multi-tenant uniqueness enforcement.
 *
 * @param {string} email
 * @param {string|null} orgId
 * @returns {Promise<UserRow|null>}
 */
async function findUserByEmail(email, orgId = null) {
  let sql, params;

  if (orgId) {
    // Scoped lookup: same email can exist in multiple orgs
    sql = `
      SELECT id, name, email, password_hash, role, department, org_id, risk_score, created_at
      FROM users
      WHERE LOWER(email) = LOWER($1) AND org_id = $2
      LIMIT 1
    `;
    params = [email, orgId];
  } else {
    // Global lookup (used during login when orgId is not yet known)
    sql = `
      SELECT id, name, email, password_hash, role, department, org_id, risk_score, created_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `;
    params = [email];
  }

  const { rows } = await query(sql, params);
  return rows[0] || null;
}

/**
 * findUserById — retrieves a user by their UUID.
 *
 * @param {string} id
 * @returns {Promise<UserRow|null>}
 */
async function findUserById(id) {
  const { rows } = await query(
    `SELECT id, name, email, password_hash, role, department, org_id, risk_score, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * listUsersForOrg — paginated user list for admin dashboard.
 * Returns users sorted by risk_score DESC (highest risk first).
 *
 * @param {string} orgId
 * @param {{ limit: number, offset: number }} options
 * @returns {Promise<{ users: UserRow[], total: number }>}
 */
async function listUsersForOrg(orgId, { limit = 20, offset = 0 } = {}) {
  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT id, name, email, role, department, org_id, risk_score, created_at
       FROM users
       WHERE org_id = $1 AND role != 'admin'
       ORDER BY risk_score DESC
       LIMIT $2 OFFSET $3`,
      [orgId, limit, offset]
    ),
    query('SELECT COUNT(*) AS total FROM users WHERE org_id = $1 AND role != $2', [orgId, 'admin']),
  ]);

  return {
    users: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
}

/**
 * deleteUser — hard-deletes a user (admin use only).
 * Related email_logs and risk_events retain user_id = NULL (ON DELETE SET NULL).
 *
 * @param {string} userId
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
async function deleteUser(userId) {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [userId]);
  return rowCount > 0;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateRiskScore,
  listUsersForOrg,
  deleteUser,
};
