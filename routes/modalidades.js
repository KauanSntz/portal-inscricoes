const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /modalidades
 * Retorna todas as modalidades
 */
router.get('/', async (req, res) => {
  try {
    const modalidades = await sheetsService.getModalidades();

    console.log(`[RESPONSE] /modalidades - ${modalidades.length} resultados`);

    res.json({ data: modalidades });
  } catch (error) {
    console.error(`[ERRO] /modalidades - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar as modalidades. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;