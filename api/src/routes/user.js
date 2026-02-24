const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/user/profile
router.get('/profile', (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, avatar_url, email_verified, mfa_enabled, created_at, updated_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    email_verified: Boolean(user.email_verified),
    mfa_enabled: Boolean(user.mfa_enabled),
    created_at: user.created_at,
    updated_at: user.updated_at
  });
});

// PUT /api/user/profile
router.put('/profile', (req, res) => {
  const { name, avatar_url, current_password, new_password } = req.body || {};
  const updates = {};

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
    updates.name = name.trim();
  }

  if (avatar_url !== undefined) {
    updates.avatar_url = avatar_url;
  }

  if (new_password !== undefined) {
    if (!current_password) {
      return res.status(400).json({ error: 'current_password is required to set a new password' });
    }
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'new_password must be at least 8 characters' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    updates.password_hash = bcrypt.hashSync(new_password, 12);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.updated_at = new Date().toISOString();
  const setClauses = Object.keys(updates).map(k => `${k} = ?`);

  db.prepare(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
  ).run(...Object.values(updates), req.user.id);

  const user = db.prepare(
    'SELECT id, email, name, avatar_url, email_verified, mfa_enabled, created_at, updated_at FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    email_verified: Boolean(user.email_verified),
    mfa_enabled: Boolean(user.mfa_enabled),
    created_at: user.created_at,
    updated_at: user.updated_at
  });
});

// GET /api/user/settings
router.get('/settings', (req, res) => {
  const user = db.prepare(
    'SELECT mfa_enabled FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json({
    mfa_enabled: Boolean(user.mfa_enabled),
    notifications_enabled: true,
    theme: 'system'
  });
});

// PUT /api/user/settings
router.put('/settings', (req, res) => {
  const { mfa_enabled } = req.body || {};
  const updates = {};

  if (typeof mfa_enabled === 'boolean') {
    updates.mfa_enabled = mfa_enabled ? 1 : 0;
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    const setClauses = Object.keys(updates).map(k => `${k} = ?`);
    db.prepare(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
    ).run(...Object.values(updates), req.user.id);
  }

  const user = db.prepare('SELECT mfa_enabled FROM users WHERE id = ?').get(req.user.id);
  res.json({
    mfa_enabled: Boolean(user.mfa_enabled),
    notifications_enabled: true,
    theme: 'system'
  });
});

module.exports = router;
