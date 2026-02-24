const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

function canManageProject(projectId, userId) {
  return db.prepare('SELECT id FROM projects WHERE id = ? AND owner_id = ?').get(projectId, userId);
}

function canAccessProject(projectId, userId) {
  return db.prepare(
    `SELECT p.id FROM projects p
     WHERE p.id = ? AND (p.owner_id = ? OR EXISTS (
       SELECT 1 FROM collaborators c WHERE c.project_id = p.id AND c.user_id = ?
     ))`
  ).get(projectId, userId, userId);
}

// GET /api/projects
router.get('/', (req, res) => {
  const projects = db.prepare(
    `SELECT p.*,
       (SELECT COUNT(*) FROM todos t WHERE t.project_id = p.id AND t.archived_at IS NULL) as todo_count
     FROM projects p
     WHERE p.owner_id = ? OR EXISTS (
       SELECT 1 FROM collaborators c WHERE c.project_id = p.id AND c.user_id = ?
     )
     ORDER BY p.created_at DESC`
  ).all(req.user.id, req.user.id);

  res.json({ data: projects });
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, color = '#3B82F6', icon } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO projects (id, owner_id, name, color, icon) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.user.id, name.trim(), color, icon || null);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  if (!canManageProject(req.params.id, req.user.id)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name, color, icon } = req.body || {};
  const updates = {};

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
    updates.name = name.trim();
  }
  if (color !== undefined) updates.color = color;
  if (icon !== undefined) updates.icon = icon;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`);
  db.prepare(
    `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`
  ).run(...Object.values(updates), req.params.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id = ? AND owner_id = ?').run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.status(204).end();
});

// POST /api/projects/:id/invite
router.post('/:id/invite', (req, res) => {
  if (!canManageProject(req.params.id, req.user.id)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { email, permission_level = 'view' } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const validPermissions = ['view', 'edit', 'admin'];
  if (!validPermissions.includes(permission_level)) {
    return res.status(400).json({ error: `permission_level must be one of: ${validPermissions.join(', ')}` });
  }

  const invitee = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (!invitee) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (invitee.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot invite yourself' });
  }

  const existing = db.prepare(
    'SELECT id FROM collaborators WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, invitee.id);

  if (existing) {
    db.prepare(
      'UPDATE collaborators SET permission_level = ? WHERE project_id = ? AND user_id = ?'
    ).run(permission_level, req.params.id, invitee.id);
  } else {
    db.prepare(
      'INSERT INTO collaborators (id, project_id, user_id, permission_level) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), req.params.id, invitee.id, permission_level);
  }

  res.json({ message: 'Collaborator added successfully', permission_level });
});

module.exports = router;
