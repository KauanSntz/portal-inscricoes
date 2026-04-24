const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /processos
 * Retorna todos os processos com join de unidades e modalidades
 * Query params:
 *   - unidade_id: filtra por unidade
 *   - modalidade: filtra por modalidade
 *   - periodo: filtra por período
 *   - codigo: filtra por código
 *   - limit: limite de resultados (padrão: 10)
 *   - offset: offset para paginação (padrão: 0)
 */
router.get('/', async (req, res) => {
  try {
    const { unidade_id, modalidade, periodo, codigo, limit = 10, offset = 0 } = req.query;

    const filtros = {
      unidade_id,
      modalidade,
      periodo,
      codigo
    };

    // Remove filtros undefined
    Object.keys(filtros).forEach(key => {
      if (filtros[key] === undefined) delete filtros[key];
    });

    const processos = await sheetsService.getProcessos(filtros);
    const total = processos.length;

    // Aplica paginação
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const data = processos.slice(start, end);

    console.log(`[RESPONSE] /processos - ${data.length} resultados (total: ${total})`);

    res.json({
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data
    });
  } catch (error) {
    console.error(`[ERRO] /processos - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar os processos. Tente novamente mais tarde.'
    });
  }
});

/**
 * GET /processos/:codigo
 * Retorna um processo específico pelo código
 */
router.get('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const processo = await sheetsService.getProcessoByCodigo(codigo);

    if (!processo) {
      return res.status(404).json({
        error: 'Não encontrado',
        message: `Processo com código ${codigo} não encontrado`
      });
    }

    console.log(`[RESPONSE] /processos/${codigo} - encontrado`);

    res.json(processo);
  } catch (error) {
    console.error(`[ERRO] /processos/:codigo - ${error.message}`);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível buscar o processo. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;