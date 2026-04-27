const express = require('express');
const router = express.Router();
const axios = require('axios');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycby8b4xiDWKVYums7HLlBwLdep-cpgykKGT0sRlolQVJFvGGvcuZLQi3jItu9EKg0qXX6w/exec';

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

    const response = await axios.post(APPS_SCRIPT_URL, {
      aba: 'OPERADORES',
      id: id || '',
      uid: uid || '',
      nome,
      email,
      tipo: tipo || 'comum'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      maxRedirects: 5
    });

    res.json(response.data);
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

    const response = await axios.post(APPS_SCRIPT_URL, {
      aba: 'OPERADORES',
      acao: 'editar',
      uid: uid,
      tipo: tipo
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      maxRedirects: 5
    });

    res.json(response.data);
  } catch (error) {
    console.error('[ERRO] PUT /operadores:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar operador' });
  }
});

module.exports = router;
