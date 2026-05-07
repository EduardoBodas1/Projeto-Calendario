const express = require('express');
const router  = express.Router();
const { pool } = require('./db');

// Helper: busca escopo completo de um projeto
async function getFullScope(projectId) {
  const [[scope]] = await pool.query(
    'SELECT * FROM project_scopes WHERE project_id = ?', [projectId]
  );
  if (!scope) return null;
  const [objectives] = await pool.query(
    'SELECT * FROM scope_objectives WHERE project_id = ? ORDER BY position, id', [projectId]
  );
  const [risks] = await pool.query(
    'SELECT * FROM scope_risks WHERE project_id = ? ORDER BY position, id', [projectId]
  );
  const [team] = await pool.query(
    'SELECT * FROM scope_team WHERE project_id = ? ORDER BY position, id', [projectId]
  );
  return { ...scope, objectives, risks, team };
}

// GET /api/scopes — lista escopo de todos os projetos
router.get('/', async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects ORDER BY position, id');
    const result = [];
    for (const p of projects) {
      const scope = await getFullScope(p.id);
      result.push({
        project_id:   p.id,
        project_name: p.name,
        scope: scope || null,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scopes/:pid
router.get('/:pid', async (req, res) => {
  try {
    const [[project]] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.pid]);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
    const scope = await getFullScope(req.params.pid);
    res.json({ project_id: project.id, project_name: project.name, scope });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/scopes/:pid — salva escopo completo (upsert)
router.put('/:pid', async (req, res) => {
  const { descricao, responsavel, cliente, prioridade, status, progresso, orc_total, orc_gasto, objectives, risks } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Upsert do escopo principal
    await conn.query(`
      INSERT INTO project_scopes (project_id, descricao, responsavel, cliente, prioridade, status, progresso, orc_total, orc_gasto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        descricao   = VALUES(descricao),
        responsavel = VALUES(responsavel),
        cliente     = VALUES(cliente),
        prioridade  = VALUES(prioridade),
        status      = VALUES(status),
        progresso   = VALUES(progresso),
        orc_total   = VALUES(orc_total),
        orc_gasto   = VALUES(orc_gasto)
    `, [
      req.params.pid,
      descricao   || null,
      responsavel || null,
      cliente     || null,
      prioridade  || 'media',
      status      || 'planejado',
      progresso   || 0,
      orc_total   || 0,
      orc_gasto   || 0,
    ]);

    // Substituir objetivos
    if (Array.isArray(objectives)) {
      await conn.query('DELETE FROM scope_objectives WHERE project_id = ?', [req.params.pid]);
      for (let i = 0; i < objectives.length; i++) {
        const o = objectives[i];
        if (!o.text?.trim()) continue;
        await conn.query(
          'INSERT INTO scope_objectives (project_id, text, done, position) VALUES (?,?,?,?)',
          [req.params.pid, o.text.trim(), o.done ? 1 : 0, i]
        );
      }
    }

    // Substituir riscos
    if (Array.isArray(risks)) {
      await conn.query('DELETE FROM scope_risks WHERE project_id = ?', [req.params.pid]);
      for (let i = 0; i < risks.length; i++) {
        const r = risks[i];
        if (!r.text?.trim()) continue;
        await conn.query(
          'INSERT INTO scope_risks (project_id, nivel, text, position) VALUES (?,?,?,?)',
          [req.params.pid, r.nivel || 'medio', r.text.trim(), i]
        );
      }
    }

    await conn.commit();
    const scope = await getFullScope(req.params.pid);
    res.json(scope);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── TEAM ──────────────────────────────────────────────

// POST /api/scopes/:pid/team
router.post('/:pid/team', async (req, res) => {
  const { name, role } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    const [[{ maxPos }]] = await pool.query(
      'SELECT MAX(position) as maxPos FROM scope_team WHERE project_id = ?', [req.params.pid]
    );
    const [result] = await pool.query(
      'INSERT INTO scope_team (project_id, name, role, position) VALUES (?,?,?,?)',
      [req.params.pid, name.trim(), role?.trim() || '', (maxPos || 0) + 1]
    );
    const [[member]] = await pool.query('SELECT * FROM scope_team WHERE id = ?', [result.insertId]);
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/scopes/:pid/team/:mid
router.delete('/:pid/team/:mid', async (req, res) => {
  try {
    await pool.query('DELETE FROM scope_team WHERE id = ? AND project_id = ?', [req.params.mid, req.params.pid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
