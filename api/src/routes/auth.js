const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function storeRefreshToken(userId, rawToken) {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), userId, hash, expiresAt);
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, name, password } = req.body || {};

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'email, name, and password are required' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const id = uuidv4();

  db.prepare(
    'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
  ).run(id, email.toLowerCase(), passwordHash, name);

  const user = db.prepare('SELECT id, email, name, avatar_url, email_verified, created_at FROM users WHERE id = ?').get(id);

  const accessToken = generateAccessToken(user);
  const rawRefresh = generateRefreshToken();
  storeRefreshToken(user.id, rawRefresh);

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      email_verified: Boolean(user.email_verified),
      created_at: user.created_at
    },
    access_token: accessToken,
    refresh_token: rawRefresh,
    token_type: 'Bearer'
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const accessToken = generateAccessToken(user);
  const rawRefresh = generateRefreshToken();
  storeRefreshToken(user.id, rawRefresh);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      email_verified: Boolean(user.email_verified),
      created_at: user.created_at
    },
    access_token: accessToken,
    refresh_token: rawRefresh,
    token_type: 'Bearer'
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { refresh_token } = req.body || {};

  if (refresh_token) {
    const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
  }

  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refresh_token } = req.body || {};

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const stored = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime("now")'
  ).get(hash);

  if (!stored) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(stored.user_id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Rotate refresh token
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
  const newAccessToken = generateAccessToken(user);
  const newRawRefresh = generateRefreshToken();
  storeRefreshToken(user.id, newRawRefresh);

  res.json({
    access_token: newAccessToken,
    refresh_token: newRawRefresh,
    token_type: 'Bearer'
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  // Always respond with success to avoid email enumeration
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // In production this would validate the reset token from a reset_tokens table
  res.status(400).json({ error: 'Invalid or expired reset token' });
});

// GET /api/auth/verify-email
router.get('/verify-email', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  // In production this would validate the email verification token
  res.status(400).json({ error: 'Invalid or expired verification token' });
});

module.exports = router;
