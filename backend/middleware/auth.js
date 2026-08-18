const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication token required',
    });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({
        error: 'TOKEN_EXPIRED',
        message: 'Session expired. Please log in again.',
      });
    }
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next();
}

function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = verifyToken(token);
  } catch {
    req.user = null;
  }
  return next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
