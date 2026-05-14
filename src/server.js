require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const { initDB } = require('./db');
const routes     = require('./routes');
const scopeRoutes = require('./scope-routes');
const { router: authRoutes, requireAuth } = require('./auth-routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rotas de auth (sem proteção)
app.use('/api/auth', authRoutes);

// Todas as outras rotas exigem autenticação
app.use('/api', requireAuth, routes);
app.use('/api/scopes', requireAuth, scopeRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

initDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)))
  .catch(err => { console.error('❌ Erro:', err.message); process.exit(1); });