require('dotenv').config();
const express = require('express');
const cors = require('cors');

const processosRoutes = require('./routes/processos');
const unidadesRoutes = require('./routes/unidades');
const modalidadesRoutes = require('./routes/modalidades');
const coordenadoresRoutes = require('./routes/coordenadores');
const setoresContatoRoutes = require('./routes/setores-contato');
const diarioRoutes = require('./routes/diario');
const adminRoutes = require('./routes/admin');
const operadoresRoutes = require('./routes/operadores');
const cursosOfertaRoutes = require('./routes/cursos-oferta');
const precosCursosRoutes = require('./routes/precos-cursos');
const cursosTecnicosRoutes = require('./routes/cursos-tecnicos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/processos', processosRoutes);
app.use('/unidades', unidadesRoutes);
app.use('/modalidades', modalidadesRoutes);
app.use('/coordenadores', coordenadoresRoutes);
app.use('/setores-contato', setoresContatoRoutes);
app.use('/diario', diarioRoutes);
app.use('/admin', adminRoutes);
app.use('/operadores', operadoresRoutes);
app.use('/cursos-oferta', cursosOfertaRoutes);
app.use('/precos-cursos', precosCursosRoutes);
app.use('/cursos-tecnicos', cursosTecnicosRoutes);

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API Portal Inscrições rodando' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

app.use((err, req, res, next) => {
  console.error(`[ERRO] ${err.message}`);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse http://localhost:${PORT}`);
});

module.exports = app;