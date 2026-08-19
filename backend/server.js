/**
 * server.js — Aware Guard API Server v3.0 (PostgreSQL-backed)
 *
 * Boot sequence:
 *  1. Load environment variables (.env)
 *  2. Validate critical env vars (JWT_SECRET, DB_*)
 *  3. Test PostgreSQL connection — fail fast if DB is unreachable
 *  4. Register middleware (CORS, rate limiter, security headers)
 *  5. Mount route handlers
 *  6. Start listening
 *
 * Extensibility:
 *  - WebSockets: add socket.io after app.listen()
 *  - Stripe:     add billing middleware before /api/admin routes
 *  - AI:         swap risk engine internals in utils/riskEngine.js
 */

const crypto = require('crypto');
const path   = require('path');

// Load .env before anything else (idempotent if vars are already set)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors    = require('cors');

// ─── DB ───────────────────────────────────────────────────────────────────────
const { testConnection } = require('./db');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const phishingRoutes     = require('./routes/phishing');
const behaviorRoutes     = require('./routes/behavior');
const dashboardRoutes    = require('./routes/dashboard');       // existing SaaS dashboard
const apiDashboardRoute  = require('./routes/apiDashboard');    // NEW: GET /api/dashboard
const trainingRoutes     = require('./routes/training');
const emailAnalysisRoutes = require('./routes/emailAnalysis');  // extension endpoint
const adminRoutes        = require('./routes/admin');

// ─── Middleware Imports ───────────────────────────────────────────────────────
const { apiLimiter } = require('./middleware/rateLimiter');

// ─── App Init ─────────────────────────────────────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ─── JWT Secret Guard ─────────────────────────────────────────────────────────
// Generate ephemeral secret in dev if not set — safe since sessions are short-lived.
// In production, JWT_SECRET MUST be set via environment variable.
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET must be set in production. Exiting.');
    process.exit(1);
  }
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[Security] JWT_SECRET not set. Generated ephemeral secret — sessions will reset on restart.');
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev
  'http://localhost:5174',  // Vite dev (alternate port)
  'http://localhost:3000',  // Next.js
  'https://humanfirewall.up.railway.app', // Railway frontend
  'https://precious-endurance-production-819e.up.railway.app', // Railway deployed frontend
  'https://precious-endurance-production-819e.up.railway.app', // Railway deployed frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin)                                   return callback(null, true); // server-to-server / curl
    if (ALLOWED_ORIGINS.includes(origin))          return callback(null, true);
    if (origin.startsWith('chrome-extension://'))  return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options',  'nosniff');
  res.setHeader('X-Frame-Options',         'DENY');
  res.setHeader('Referrer-Policy',         'no-referrer');
  res.setHeader('Permissions-Policy',      'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request ID ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  next();
});

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.requestId?.slice(0, 8)} ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/analyze-email',  emailAnalysisRoutes);  // Chrome Extension endpoint
app.use('/api/dashboard',      dashboardRoutes);      // Employee dashboard (GET /:userId)
app.use('/api/ext-dashboard',  apiDashboardRoute);    // Extension popup dashboard (GET / with auth)
app.use('/api/phishing',       phishingRoutes);
app.use('/api/behavior',       behaviorRoutes);
app.use('/api/training',       trainingRoutes);
app.use('/api/admin',          adminRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'Aware Guard API',
    version:   '3.0.0',
    timestamp: new Date().toISOString(),
    database:  'postgresql',
    features:  ['phishing-detection', 'risk-scoring', 'email-analysis', 'multi-tenant', 'postgresql'],
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:   'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ error: 'CORS_ERROR', message: err.message });
  }
  console.error('[Server Error]', req.requestId, err.message);
  return res.status(500).json({
    error:     'INTERNAL_ERROR',
    message:   'An unexpected error occurred',
    requestId: req.requestId,
  });
});

// ─── Startup ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    // Test DB before opening port — fail fast if Postgres is down
    await testConnection();
  } catch (err) {
    console.error('\n[FATAL] Cannot connect to PostgreSQL:', err.message);
    console.error('Make sure PostgreSQL is running and .env DB_* variables are correct.');
    console.error('See backend/.env.example for required variables.\n');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🛡️  Aware Guard API v3.0 (PostgreSQL)\n`);
    console.log(`   📡 http://localhost:${PORT}/api/health`);
    console.log(`   📧 POST http://localhost:${PORT}/api/analyze-email`);
    console.log(`   📊 GET  http://localhost:${PORT}/api/dashboard (auth required)\n`);
  });
}

start();

module.exports = app;


