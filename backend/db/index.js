/**
 * db/index.js — PostgreSQL Connection Pool
 *
 * Works with:
 *   1. Railway PostgreSQL using DATABASE_URL
 *   2. Local PostgreSQL using DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
 */

const { Pool } = require('pg');

// ─────────────────────────────────────────────────────────────
// DATABASE CONFIGURATION
// ─────────────────────────────────────────────────────────────

// Railway provides DATABASE_URL.
// Local development can use the individual DB_* variables.
let poolConfig;

if (process.env.DATABASE_URL) {
  // ───────────────────────────────────────────────────────────
  // RAILWAY / PRODUCTION
  // ───────────────────────────────────────────────────────────

  console.log('[DB] Using DATABASE_URL');

  poolConfig = {
    connectionString: process.env.DATABASE_URL,

    // Railway PostgreSQL requires SSL for external connections.
    ssl: {
      rejectUnauthorized: false,
    },
  };
} else {
  // ───────────────────────────────────────────────────────────
  // LOCAL DEVELOPMENT
  // ───────────────────────────────────────────────────────────

  console.log('[DB] Using local DB_* configuration');

  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'awareguard',
  };
}

// ─────────────────────────────────────────────────────────────
// CONNECTION POOL
// ─────────────────────────────────────────────────────────────

const pool = new Pool({
  ...poolConfig,

  // Maximum number of simultaneous database connections
  max: 10,

  // Close idle connections after 30 seconds
  idleTimeoutMillis: 30000,

  // Fail if connection cannot be established within 5 seconds
  connectionTimeoutMillis: 5000,
});

// ─────────────────────────────────────────────────────────────
// POOL EVENTS
// ─────────────────────────────────────────────────────────────

pool.on('connect', () => {
  console.log('[DB] PostgreSQL connection established');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected PostgreSQL pool error:', err.message);
});

// ─────────────────────────────────────────────────────────────
// QUERY HELPER
// ─────────────────────────────────────────────────────────────

async function query(text, params = []) {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);

    const duration = Date.now() - start;

    if (
      process.env.NODE_ENV !== 'production' ||
      duration > 200
    ) {
      console.log(
        `[DB] query (${duration}ms) rows=${result.rowCount}`
      );
    }

    return result;
  } catch (err) {
    console.error(
      '[DB] Query error:',
      err.message,
      '| SQL:',
      text.slice(0, 120)
    );

    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// GET CLIENT
// ─────────────────────────────────────────────────────────────

async function getClient() {
  return pool.connect();
}

// ─────────────────────────────────────────────────────────────
// TEST DATABASE CONNECTION
// ─────────────────────────────────────────────────────────────

async function testConnection() {
  try {
    const { rows } = await pool.query(
      'SELECT NOW() AS now'
    );

    console.log(
      `[DB] Connected to PostgreSQL — server time: ${rows[0].now}`
    );

    return true;
  } catch (err) {
    console.error(
      '[DB] PostgreSQL connection failed:',
      err.message
    );

    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  query,
  getClient,
  testConnection,
  pool,
};