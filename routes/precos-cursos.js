const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /precos-cursos
 * Retorna preços de cursos
 * Query params:
 *   - unidade_id: filtra por unidade (ex: manaus, compensa, __all__)
 *   - modalidade: filtra por modalidade (ex: presencial, ead)
 *   - plano: filtra por plano (ex: enem_vestibular, transfer_portador)
 */
router.get('/', async (req, res) => {
  try {
    const { unidade_id, modalidade, plano } = req.query;
    let precos = await sheetsService.getPrecosCursos();

    if (unidade_id) {
      precos = precos.filter(p => p.unidade_id === unidade_id || p.unidade_id === '__all__');
    }
    if (modalidade) {
      precos = precos.filter(p => p.modalidade === modalidade);
    }
    if (plano) {
      precos = precos.filter(p => p.plano === plano);
    }

    console.log(`[RESPONSE] /precos-cursos - ${precos.length} resultados`);
    res.json({ total: precos.length, data: precos });
  } catch (error) {
    console.error(`[ERRO] /precos-cursos - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar os preços. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;
