require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const { initDB } = require('./db');
const routes     = require('./routes');
const scopeRoutes = require('./scope-routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', routes);
app.use('/api/scopes', scopeRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Erro ao inicializar banco:', err.message);
    process.exit(1);
  });
