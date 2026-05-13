const express = require('express');
const router = express.Router();
const crud = require('../services/sheetsCrudService');
const sheetsService = require('../services/sheetsService');

/**
 * GET /operadores
 * Retorna lista de operadores
 */
router.get('/', async (req, res) => {
  try {
    const operadores = await sheetsService.getOperadores();
    res.json({
      total: operadores.length,
      data: operadores
    });
  } catch (error) {
    console.error(`[ERRO] GET /operadores: ${error.message}`);
    res.status(503).json({ error: 'Erro ao buscar operadores' });
  }
});

/**
 * POST /operadores
 * Salva um novo operador na aba OPERADORES do Google Sheets
 */
router.post('/', async (req, res) => {
  try {
    const { id, uid, nome, email, tipo } = req.body;

    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }

    const rowData = {
      id: id || '',
      uid: uid || '',
      nome,
      email,
      tipo: tipo || 'comum'
    };

    const response = await crud.appendRow('OPERADORES', rowData);

    res.json({ status: 'success', data: response });
  } catch (error) {
    console.error('[ERRO] POST /operadores:', error.message);
    res.status(500).json({ error: 'Erro ao salvar operador' });
  }
});

/**
 * PUT /operadores/:uid
 * Atualiza o tipo de um operador existente
 */
router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { tipo } = req.body;

    if (!tipo) {
      return res.status(400).json({ error: 'Tipo é obrigatório.' });
    }

    const existingRow = await crud.findRowByField('OPERADORES', 'uid', uid);
    if (!existingRow) {
      return res.status(404).json({ error: 'Operador não encontrado.' });
    }

    const updatedRow = { ...existingRow, tipo };
    const response = await crud.updateRow('OPERADORES', 'uid', uid, updatedRow);

    res.json({ status: 'success', data: response });
  } catch (error) {
    console.error('[ERRO] PUT /operadores:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar operador' });
  }
});

module.exports = router;

