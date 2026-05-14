const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { pool } = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret';

// Middleware de autenticação — exportado para usar nas outras rotas
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Middleware de admin
async function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, remember } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ? AND active = 1', [email.toLowerCase().trim()]);
    if (!user) return res.status(401).json({ error: 'Email ou senha incorretos' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email ou senha incorretos' });
    const expiresIn = remember ? '30d' : '8h';
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, SECRET, { expiresIn });
    res.json({ token, expiresIn, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — verifica token atual
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── GESTÃO DE USUÁRIOS (admin) ──

// GET /api/auth/users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, role, active, created_at FROM users ORDER BY name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });
  try {
    const [[exists]] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (exists) return res.status(400).json({ error: 'Email já cadastrado' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, active) VALUES (?,?,?,?,1)',
      [name.trim(), email.toLowerCase().trim(), hash, role||'user']
    );
    const [[user]] = await pool.query('SELECT id, name, email, role, active FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role, active } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET name=?, email=?, password_hash=?, role=?, active=? WHERE id=?',
        [name, email.toLowerCase().trim(), hash, role||'user', active??1, req.params.id]);
    } else {
      await pool.query('UPDATE users SET name=?, email=?, role=?, active=? WHERE id=?',
        [name, email.toLowerCase().trim(), role||'user', active??1, req.params.id]);
    }
    const [[user]] = await pool.query('SELECT id, name, email, role, active FROM users WHERE id = ?', [req.params.id]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/setup — cria o primeiro admin (usa ADMIN_SETUP_KEY)
router.post('/setup', async (req, res) => {
  const { name, email, password, setup_key } = req.body;
  if (setup_key !== process.env.ADMIN_SETUP_KEY) return res.status(403).json({ error: 'Chave inválida' });
  try {
    const [[exists]] = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']);
    if (exists) return res.status(400).json({ error: 'Admin já existe' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (name, email, password_hash, role, active) VALUES (?,?,?,?,1)',
      [name.trim(), email.toLowerCase().trim(), hash, 'admin']);
    res.json({ ok: true, message: 'Admin criado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, requireAuth };