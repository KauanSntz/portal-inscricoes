const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /coordenadores
 * Retorna coordenadores com JOIN de unidades
 * Query params:
 *   - unidade_id: filtra por unidade
 */
router.get('/', async (req, res) => {
  try {
    const { unidade_id } = req.query;

    const filtros = {};
    if (unidade_id) {
      filtros.unidade_id = unidade_id;
    }

    const coordenadores = await sheetsService.getCoordenadores(filtros);

    console.log(`[RESPONSE] /coordenadores - ${coordenadores.length} resultados`);

    res.json({
      total: coordenadores.length,
      data: coordenadores
    });
  } catch (error) {
    console.error(`[ERRO] /coordenadores - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar os coordenadores. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;