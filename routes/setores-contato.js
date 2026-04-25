const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /setores-contato
 * Retorna contatos de setores administrativos
 */
router.get('/', async (req, res) => {
  try {
    const setores = await sheetsService.getSetoresContato();

    console.log(`[RESPONSE] /setores-contato - ${setores.length} resultados`);

    res.json({
      total: setores.length,
      data: setores
    });
  } catch (error) {
    console.error(`[ERRO] /setores-contato - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar os contatos de setores. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;