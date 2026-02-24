const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const VALID_PRIORITIES = ['high', 'medium', 'low'];
const VALID_SORT_FIELDS = ['created_at', 'updated_at', 'due_date', 'priority', 'text'];
const VALID_SORT_DIRS = ['asc', 'desc'];

// All todo routes require authentication
router.use(authenticate);

// GET /api/todos
router.get('/', (req, res) => {
  const {
    page = '1',
    limit = '20',
    filter,
    priority,
    project_id,
    sort_by = 'created_at',
    sort_dir = 'desc',
    archived = 'false'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const sortField = VALID_SORT_FIELDS.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = VALID_SORT_DIRS.includes(sort_dir) ? sort_dir : 'desc';

  const conditions = ['user_id = ?'];
  const params = [req.user.id];

  if (archived === 'true') {
    conditions.push('archived_at IS NOT NULL');
  } else {
    conditions.push('archived_at IS NULL');
  }

  if (filter === 'active') {
    conditions.push('completed = 0');
  } else if (filter === 'completed') {
    conditions.push('completed = 1');
  }

  if (priority && VALID_PRIORITIES.includes(priority)) {
    conditions.push('priority = ?');
    params.push(priority);
  }

  if (project_id) {
    conditions.push('project_id = ?');
    params.push(project_id);
  }

  const where = conditions.join(' AND ');
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM todos WHERE ${where}`).get(...params);
  const total = countRow.total;

  const todos = db.prepare(
    `SELECT * FROM todos WHERE ${where} ORDER BY ${sortField} ${sortDir} LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  res.json({
    data: todos.map(formatTodo),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      total_pages: Math.ceil(total / limitNum)
    }
  });
});

// GET /api/todos/search
router.get('/search', (req, res) => {
  const { q, priority, project_id, completed, page = '1', limit = '20' } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'q (search query) is required' });
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = ['user_id = ?', 'archived_at IS NULL', "(text LIKE ? OR description LIKE ?)"];
  const searchTerm = `%${q.trim()}%`;
  const params = [req.user.id, searchTerm, searchTerm];

  if (priority && VALID_PRIORITIES.includes(priority)) {
    conditions.push('priority = ?');
    params.push(priority);
  }

  if (project_id) {
    conditions.push('project_id = ?');
    params.push(project_id);
  }

  if (completed === 'true') {
    conditions.push('completed = 1');
  } else if (completed === 'false') {
    conditions.push('completed = 0');
  }

  const where = conditions.join(' AND ');
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM todos WHERE ${where}`).get(...params);
  const total = countRow.total;

  const todos = db.prepare(
    `SELECT * FROM todos WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  res.json({
    data: todos.map(formatTodo),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      total_pages: Math.ceil(total / limitNum)
    }
  });
});

// POST /api/todos
router.post('/', (req, res) => {
  const { text, description, priority = 'medium', due_date, project_id, recurring_pattern } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (project_id) {
    const project = db.prepare(
      'SELECT id FROM projects WHERE id = ? AND (owner_id = ? OR id IN (SELECT project_id FROM collaborators WHERE user_id = ?))'
    ).get(project_id, req.user.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO todos (id, user_id, project_id, text, description, priority, due_date, recurring_pattern)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.id, project_id || null, text.trim(), description || null, priority, due_date || null, recurring_pattern || null);

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  res.status(201).json(formatTodo(todo));
});

// POST /api/todos/bulk-update
router.post('/bulk-update', (req, res) => {
  const { ids, updates } = req.body || {};

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'updates object is required' });
  }

  const allowedFields = ['completed', 'priority', 'project_id', 'archived_at'];
  const setClauses = [];
  const params = [];

  if (typeof updates.completed === 'boolean') {
    setClauses.push('completed = ?');
    params.push(updates.completed ? 1 : 0);
  }

  if (updates.priority && VALID_PRIORITIES.includes(updates.priority)) {
    setClauses.push('priority = ?');
    params.push(updates.priority);
  }

  if (updates.archive === true) {
    setClauses.push("archived_at = datetime('now')");
  } else if (updates.archive === false) {
    setClauses.push('archived_at = NULL');
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid update fields provided' });
  }

  setClauses.push("updated_at = datetime('now')");

  const placeholders = ids.map(() => '?').join(', ');
  const result = db.prepare(
    `UPDATE todos SET ${setClauses.join(', ')} WHERE id IN (${placeholders}) AND user_id = ?`
  ).run(...params, ...ids, req.user.id);

  res.json({ updated: result.changes });
});

// GET /api/todos/:id
router.get('/:id', (req, res) => {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(formatTodo(todo));
});

// PUT /api/todos/:id
router.put('/:id', (req, res) => {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  const { text, description, completed, priority, due_date, project_id, recurring_pattern } = req.body || {};

  const updates = {};

  if (text !== undefined) {
    if (!text.trim()) return res.status(400).json({ error: 'text cannot be empty' });
    updates.text = text.trim();
  }

  if (description !== undefined) updates.description = description;
  if (typeof completed === 'boolean') updates.completed = completed ? 1 : 0;

  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }
    updates.priority = priority;
  }

  if (due_date !== undefined) updates.due_date = due_date;
  if (project_id !== undefined) updates.project_id = project_id;
  if (recurring_pattern !== undefined) updates.recurring_pattern = recurring_pattern;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`);
  setClauses.push("updated_at = datetime('now')");
  const values = Object.values(updates);

  db.prepare(
    `UPDATE todos SET ${setClauses.join(', ')} WHERE id = ?`
  ).run(...values, req.params.id);

  const updated = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  res.json(formatTodo(updated));
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.status(204).end();
});

function formatTodo(todo) {
  return {
    id: todo.id,
    user_id: todo.user_id,
    project_id: todo.project_id,
    text: todo.text,
    description: todo.description,
    completed: Boolean(todo.completed),
    priority: todo.priority,
    due_date: todo.due_date,
    recurring_pattern: todo.recurring_pattern,
    created_at: todo.created_at,
    updated_at: todo.updated_at,
    archived_at: todo.archived_at
  };
}

module.exports = router;
