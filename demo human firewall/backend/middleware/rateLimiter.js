/**
 * middleware/rateLimiter.js — In-Memory Rate Limiter
 *
 * Protects sensitive endpoints from abuse without requiring Redis.
 * For production scale, replace with `express-rate-limit` + Redis store.
 *
 * Usage:
 *   const { apiLimiter, authLimiter, analyzeEmailLimiter } = require('../middleware/rateLimiter');
 *   router.post('/login', authLimiter, handler);
 *   router.post('/analyze-email', analyzeEmailLimiter, handler);
 */

/**
 * createRateLimiter(options)
 *
 * Factory function — returns an Express middleware that rate-limits by IP.
 *
 * @param {object} options
 * @param {number} options.windowMs      - Time window in milliseconds
 * @param {number} options.maxRequests   - Max requests allowed in window
 * @param {string} options.message       - Error message when limit exceeded
 */
function createRateLimiter({ windowMs, maxRequests, message }) {
  // Map: IP → { count, windowStart }
  const store = new Map();

  // Clean up stale IP records every 5 minutes to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of store.entries()) {
      if (now - data.windowStart > windowMs) {
        store.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return function rateLimiter(req, res, next) {
    // Respect X-Forwarded-For for clients behind proxies/load balancers
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';
    const now = Date.now();

    const record = store.get(ip);

    if (!record || (now - record.windowStart) > windowMs) {
      // New window for this IP
      store.set(ip, { count: 1, windowStart: now });
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((windowMs - (now - record.windowStart)) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message,
        retryAfterSeconds: retryAfter,
      });
    }

    next();
  };
}

// ─── Pre-configured Limiters ─────────────────────────────────────────────────

/** General API limiter — 100 req/minute per IP */
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many requests. Please slow down.',
});

/** Auth limiter — 10 login/register attempts per 15 minutes (brute-force protection) */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many authentication attempts. Try again in 15 minutes.',
});

/** Email analysis limiter — 30 scans/minute per IP (extension may call frequently) */
const analyzeEmailLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Email scan rate limit exceeded. Wait before scanning again.',
});

module.exports = { createRateLimiter, apiLimiter, authLimiter, analyzeEmailLimiter };
