const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /cursos-tecnicos
 * Retorna cursos técnicos com filtro opcional por unidade
 * Query params:
 *   - unidade: filtra por unidade (ex: manoa, norte, leste)
 */
router.get('/', async (req, res) => {
  try {
    const { unidade } = req.query;

    const filtros = {};
    if (unidade) {
      filtros.unidade = unidade;
    }

    const cursos = await sheetsService.getCursosTecnicos(filtros);

    console.log(`[RESPONSE] /cursos-tecnicos - ${cursos.length} resultados`);

    res.json({
      total: cursos.length,
      data: cursos
    });
  } catch (error) {
    console.error(`[ERRO] /cursos-tecnicos - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar os cursos técnicos. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;