/**
 * routes/auth.js — Authentication Routes (DB-backed)
 *
 * Refactored from in-memory arrays to PostgreSQL via userModel.
 * Same API surface as before — no breaking changes to clients/extension.
 *
 * POST /api/auth/login   — verify credentials, return JWT
 * POST /api/auth/signup  — create user in DB, return JWT
 * GET  /api/auth/me      — verify token, return user profile
 * DELETE /api/auth/users/:id — admin: delete a user from DB
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authLimiter } = require('../middleware/rateLimiter');
const { findUserByEmail, findUserById, createUser, deleteUser } = require('../models/userModel');
const { findOrgById } = require('../models/orgModel');

const router = express.Router();

// Default org for single-tenant / demo mode — matches the seeded org in schema.sql
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '12h';
const BCRYPT_ROUNDS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function issueToken(user) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

  return jwt.sign(
    {
      userId: user.id,
      email:  user.email,
      role:   user.role,
      orgId:  user.org_id || DEFAULT_ORG_ID,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function serializeUser(user) {
  return {
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    department: user.department,
    orgId:      user.org_id || DEFAULT_ORG_ID,
    // Derive avatar initials from name (not stored in DB)
    avatar:     (user.name || '?')
                  .split(' ')
                  .map(w => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2),
  };
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', authLimiter, async (req, res) => {
  try {
    const email    = typeof req.body.email    === 'string' ? req.body.email.trim().toLowerCase()    : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Fetch from DB — returns null if email doesn't exist
    const user = await findUserByEmail(email);
    if (!user) {
      // Use same error message for both "not found" and "wrong password"
      // to prevent email enumeration attacks
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      token: issueToken(user),
      user:  serializeUser(user),
    });

  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

router.post('/signup', authLimiter, async (req, res) => {
  try {
    const name       = typeof req.body.name       === 'string' ? req.body.name.trim()       : '';
    const email      = typeof req.body.email      === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password   = typeof req.body.password   === 'string' ? req.body.password          : '';
    const department = typeof req.body.department === 'string' ? req.body.department.trim()  : 'General';

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 10) {
      return res.status(400).json({ message: 'Password must be at least 10 characters long' });
    }

    // Check if email already exists in this org
    const existing = await findUserByEmail(email, DEFAULT_ORG_ID);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = await createUser({
      name,
      email,
      passwordHash,
      role:       'employee',
      department,
      orgId:      DEFAULT_ORG_ID,
    });

    return res.status(201).json({
      token: issueToken(newUser),
      user:  serializeUser(newUser),
    });

  } catch (err) {
    // Unique constraint violation (race condition — two simultaneous signups)
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error('[Auth] Signup error:', err.message);
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token' });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);

    // Always fetch fresh data from DB (role/department may have changed)
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(serializeUser(user));

  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error('[Auth] /me error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// ─── DELETE /api/auth/users/:id ────────────────────────────────────────────────

router.delete('/users/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { id } = req.params;
  if (id === decoded.userId) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  try {
    const target = await findUserById(id);
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin accounts' });
    }

    await deleteUser(id);
    return res.json({ message: `User "${target.name}" deleted successfully` });

  } catch (err) {
    console.error('[Auth] Delete user error:', err.message);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;
