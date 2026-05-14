const express = require('express');
const router  = express.Router();
const { pool } = require('./db');

// ── PROJECTS ──────────────────────────────────────────

// GET /api/projects  — lista todos com segmentos
router.get('/projects', async (req, res) => {
  try {
    const [projects] = await pool.query(
      'SELECT * FROM projects ORDER BY position, id'
    );
    const [segments] = await pool.query(
      'SELECT * FROM segments ORDER BY project_id, position, id'
    );
    const result = projects.map(p => ({
      ...p,
      segments: segments
        .filter(s => s.project_id === p.id)
        .map(s => ({
          ...s,
          start_date: s.start_date instanceof Date
            ? s.start_date.toISOString().split('T')[0]
            : s.start_date,
          end_date: s.end_date instanceof Date
            ? s.end_date.toISOString().split('T')[0]
            : s.end_date,
        })),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
router.post('/projects', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    const [[{ maxPos }]] = await pool.query('SELECT MAX(position) as maxPos FROM projects');
    const [result] = await pool.query(
      'INSERT INTO projects (name, position) VALUES (?, ?)',
      [name.trim(), (maxPos || 0) + 1]
    );
    const [[project]] = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...project, segments: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/projects/:id', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    await pool.query('UPDATE projects SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    const [[project]] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/projects/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEGMENTS ─────────────────────────────────────────

// POST /api/projects/:pid/segments
router.post('/projects/:pid/segments', async (req, res) => {
  const { label, start_date, end_date, status } = req.body;
  if (!label?.trim() || !start_date || !end_date)
    return res.status(400).json({ error: 'label, start_date e end_date são obrigatórios' });
  try {
    const [[{ maxPos }]] = await pool.query(
      'SELECT MAX(position) as maxPos FROM segments WHERE project_id = ?', [req.params.pid]
    );
    const [result] = await pool.query(
      'INSERT INTO segments (project_id, label, start_date, end_date, status, position) VALUES (?,?,?,?,?,?)',
      [req.params.pid, label.trim(), start_date, end_date, status || 'planejado', (maxPos || 0) + 1]
    );
    const [[seg]] = await pool.query('SELECT * FROM segments WHERE id = ?', [result.insertId]);
    res.status(201).json(seg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/segments/:id
router.put('/segments/:id', async (req, res) => {
  const { label, start_date, end_date, status } = req.body;
  if (!label?.trim() || !start_date || !end_date)
    return res.status(400).json({ error: 'label, start_date e end_date são obrigatórios' });
  try {
    await pool.query(
      'UPDATE segments SET label=?, start_date=?, end_date=?, status=? WHERE id=?',
      [label.trim(), start_date, end_date, status || 'planejado', req.params.id]
    );
    const [[seg]] = await pool.query('SELECT * FROM segments WHERE id = ?', [req.params.id]);
    if (!seg) return res.status(404).json({ error: 'Bloco não encontrado' });
    res.json(seg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/segments/:id
router.delete('/segments/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM segments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Bloco não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/reorder
router.put('/projects/reorder', async (req, res) => {
  const { ids } = req.body; // array de IDs na nova ordem
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids obrigatório' });
  try {
    await Promise.all(ids.map((id, i) =>
      pool.query('UPDATE projects SET position = ? WHERE id = ?', [i, id])
    ));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:pid/segments/reorder
router.put('/projects/:pid/segments/reorder', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids obrigatório' });
  try {
    await Promise.all(ids.map((id, i) =>
      pool.query('UPDATE segments SET position = ? WHERE id = ? AND project_id = ?', [i, id, req.params.pid])
    ));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
