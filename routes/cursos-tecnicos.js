const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /cursos-tecnicos
 * Retorna cursos técnicos agrupados por unidade
 * Formato: [{ unidade, endereco, cursos: [{ nome, duracao, turnos, valores, primeiraMensalidade }] }]
 */
router.get('/', async (req, res) => {
  try {
    const data = await sheetsService.getCursosTecnicos();
    console.log(`[RESPONSE] /cursos-tecnicos - ${data.length} unidades`);
    res.json(data);
  } catch (error) {
    console.error(`[ERRO] /cursos-tecnicos - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar os cursos técnicos. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;
