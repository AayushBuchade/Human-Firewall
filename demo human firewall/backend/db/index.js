/**
 * db/index.js — PostgreSQL Connection Pool
 *
 * All DB queries in the application go through this module's `query()` helper.
 * Using a pool (not a single client) ensures connections are reused and the
 * app can handle concurrent requests efficiently.
 *
 * Configuration is driven entirely by environment variables so the same code
 * works in development, staging, and production without changes.
 *
 * Required env vars (set in .env):
 *   DB_HOST     — PostgreSQL host (default: localhost)
 *   DB_PORT     — PostgreSQL port (default: 5432)
 *   DB_USER     — Database username
 *   DB_PASSWORD — Database password
 *   DB_NAME     — Database name
 *
 * Future extensibility:
 *   - Replace with `pg` + `pgBouncer` for high-concurrency production
 *   - Wrap `query()` with an OpenTelemetry span for distributed tracing
 */

const { Pool } = require('pg');

// ─── Pool Configuration ───────────────────────────────────────────────────────

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'awareguard',

  // Connection pool sizing — tune based on expected concurrency
  max:              10,   // maximum simultaneous clients
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 5000, // fail fast if no client available within 5s
});

// ─── Pool Event Listeners ─────────────────────────────────────────────────────

pool.on('connect', () => {
  // Fires each time a new physical connection is established
  // Useful for setting default session configs (e.g., timezone, search_path)
});

pool.on('error', (err) => {
  // Fires on unexpected errors on idle clients — log and keep running
  console.error('[DB] Unexpected pool error:', err.message);
});

// ─── Query Helper ─────────────────────────────────────────────────────────────

/**
 * query(text, params)
 *
 * Thin wrapper around pool.query that adds structured error logging.
 * All models in /models/* should use this function — never require `pg` directly.
 *
 * @param {string}   text   - Parameterized SQL statement
 * @param {any[]}    params - Ordered parameter array matching $1, $2, ...
 * @returns {Promise<pg.QueryResult>}
 *
 * @example
 * const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    // Only log slow queries in production; log all in dev
    if (process.env.NODE_ENV !== 'production' || duration > 200) {
      console.log(`[DB] query (${duration}ms) rows=${result.rowCount}`);
    }
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '| SQL:', text.slice(0, 120));
    throw err; // Re-throw — callers must handle DB errors with try/catch
  }
}

/**
 * getClient()
 *
 * Acquires a dedicated client from the pool for multi-statement transactions.
 * Caller MUST call client.release() in a finally block to prevent pool leaks.
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT ...');
 *   await client.query('UPDATE ...');
 *   await client.query('COMMIT');
 * } catch (err) {
 *   await client.query('ROLLBACK');
 *   throw err;
 * } finally {
 *   client.release();
 * }
 */
async function getClient() {
  return pool.connect();
}

/**
 * testConnection()
 *
 * Verifies the DB is reachable at startup.
 * Call this from server.js before app.listen() — fail fast if DB is down.
 */
async function testConnection() {
  const { rows } = await query('SELECT NOW() AS now');
  console.log(`[DB] Connected to PostgreSQL — server time: ${rows[0].now}`);
}

module.exports = { query, getClient, testConnection };
