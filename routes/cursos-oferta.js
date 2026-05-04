const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /cursos-oferta
 * Retorna cursos por unidade e modalidade
 * Query params:
 *   - unidade_id: filtra por unidade (ex: sede, leste, sul)
 *   - modalidade: filtra por modalidade (ex: presencial, ead)
 */
router.get('/', async (req, res) => {
  try {
    const { unidade_id, modalidade } = req.query;
    let cursos = await sheetsService.getCursosOferta();

    if (unidade_id) {
      cursos = cursos.filter(c => c.unidade_id === unidade_id);
    }
    if (modalidade) {
      cursos = cursos.filter(c => c.modalidade === modalidade);
    }

    console.log(`[RESPONSE] /cursos-oferta - ${cursos.length} resultados`);
    res.json({ total: cursos.length, data: cursos });
  } catch (error) {
    console.error(`[ERRO] /cursos-oferta - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar os cursos. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;
