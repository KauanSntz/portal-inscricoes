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

/**
 * POST /unidades
 * Criar nova unidade (STUB - requer implementação de write no Google Sheets)
 */
router.post('/', async (req, res) => {
  try {
    const { unidade_id, nome, tipo, ordem } = req.body;

    if (!unidade_id || !nome) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'unidade_id e nome são obrigatórios'
      });
    }

    res.status(501).json({
      error: 'Não implementado',
      message: 'CRUD de unidades requer configuração do Google Sheets API. Funcionalidade em desenvolvimento.'
    });
  } catch (error) {
    console.error(`[ERRO] POST /unidades - ${error.message}`);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível criar a unidade.'
    });
  }
});

/**
 * PUT /unidades/:unidade_id
 * Atualizar unidade existente (STUB)
 */
router.put('/:unidade_id', async (req, res) => {
  try {
    const { unidade_id } = req.params;
    const { nome, tipo, ordem, ativo } = req.body;

    res.status(501).json({
      error: 'Não implementado',
      message: 'CRUD de unidades requer configuração do Google Sheets API. Funcionalidade em desenvolvimento.'
    });
  } catch (error) {
    console.error(`[ERRO] PUT /unidades/:unidade_id - ${error.message}`);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível atualizar a unidade.'
    });
  }
});

/**
 * DELETE /unidades/:unidade_id
 * Excluir unidade (soft delete - STUB)
 */
router.delete('/:unidade_id', async (req, res) => {
  try {
    const { unidade_id } = req.params;

    res.status(501).json({
      error: 'Não implementado',
      message: 'CRUD de unidades requer configuração do Google Sheets API. Funcionalidade em desenvolvimento.'
    });
  } catch (error) {
    console.error(`[ERRO] DELETE /unidades/:unidade_id - ${error.message}`);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível excluir a unidade.'
    });
  }
});

module.exports = router;