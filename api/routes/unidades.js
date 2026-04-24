const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /unidades
 * Retorna todas as unidades
 * Query params:
 *   - tipo: filtra por tipo (ex: capital, interior)
 */
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    const filtros = tipo ? { tipo } : {};
    
    const unidades = await sheetsService.getUnidades(filtros);

    console.log(`[RESPONSE] /unidades - ${unidades.length} resultados`);

    res.json({ data: unidades });
  } catch (error) {
    console.error(`[ERRO] /unidades - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar as unidades. Tente novamente mais tarde.'
    });
  }
});

/**
 * GET /unidades/:unidade_id
 * Retorna uma unidade específica pelo ID
 */
router.get('/:unidade_id', async (req, res) => {
  try {
    const { unidade_id } = req.params;
    const unidade = await sheetsService.getUnidadeById(unidade_id);

    if (!unidade) {
      return res.status(404).json({
        error: 'Não encontrado',
        message: `Unidade com ID ${unidade_id} não encontrada`
      });
    }

    console.log(`[RESPONSE] /unidades/${unidade_id} - encontrado`);

    res.json(unidade);
  } catch (error) {
    console.error(`[ERRO] /unidades/:unidade_id - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar a unidade. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;