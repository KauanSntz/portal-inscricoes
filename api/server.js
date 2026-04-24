require('dotenv').config();
const express = require('express');
const cors = require('cors');

const processosRoutes = require('./routes/processos');
const unidadesRoutes = require('./routes/unidades');
const modalidadesRoutes = require('./routes/modalidades');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logger básico
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rotas
app.use('/processos', processosRoutes);
app.use('/unidades', unidadesRoutes);
app.use('/modalidades', modalidadesRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API Portal Inscrições rodando' });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Tratamento de erros globais
app.use((err, req, res, next) => {
  console.error(`[ERRO] ${err.message}`);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse http://localhost:${PORT}`);
});

module.exports = app;