const express = require('express');
const router = express.Router();
const { getDiarioBordo, salvarDiarioBordo } = require('../services/sheetsService');

/**
 * GET /diario
 * Lista registros do diário de bordo
 * Query params: operador, data, cpf, nome, limit
 */
router.get('/', async (req, res) => {
  try {
    const filtros = {};
    if (req.query.operador) filtros.operador = req.query.operador;
    if (req.query.data) filtros.data = req.query.data;
    if (req.query.cpf) filtros.cpf = req.query.cpf;
    if (req.query.nome) filtros.nome = req.query.nome;

    let registros = await getDiarioBordo(filtros);

    // Paginação
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      registros = registros.slice(0, limit);
    }

    res.json({
      total: registros.length,
      data: registros
    });
  } catch (error) {
    console.error('[ERRO] GET /diario:', error.message);
    res.status(500).json({ error: 'Erro ao buscar registros do diário' });
  }
});

/**
 * POST /diario
 * Salva um novo registro no diário de bordo via Google Apps Script
 */
router.post('/', async (req, res) => {
  try {
    const {
      acao,
      id_registro,
      id_operador,
      nome_operador,
      data_inscricao,
      tipo_inscricao,
      nome,
      telefone,
      nascimento,
      cpf,
      curso,
      modalidade,
      unidade,
      situacao
    } = req.body;

    // Validação básica (ignorar se for exclusão ou se for edição parcial sem nome/cpf)
    if (req.body.acao !== 'excluir' && req.body.acao !== 'editar' && (!nome || !cpf)) {
      return res.status(400).json({ error: 'Nome e CPF são obrigatórios para novos registros.' });
    }

    const resultado = await salvarDiarioBordo({
      acao: acao || 'novo',
      id_registro: id_registro || '',
      id_operador: id_operador || '',
      nome_operador: nome_operador || '',
      data_inscricao: data_inscricao || '',
      tipo_inscricao: tipo_inscricao || '',
      nome: nome || '',
      telefone: telefone || '',
      nascimento: nascimento || '',
      cpf: cpf || '',
      curso: curso || '',
      modalidade: modalidade || '',
      unidade: unidade || '',
      situacao: situacao || ''
    });

    res.json(resultado);
  } catch (error) {
    console.error('[ERRO] POST /diario:', error.message);
    res.status(500).json({ error: 'Erro ao salvar registro no diário' });
  }
});

module.exports = router;
