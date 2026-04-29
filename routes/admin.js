const express = require('express');
const router = express.Router();
const sheetsCrud = require('../services/sheetsCrudService');
const { invalidateCache } = require('../services/sheetsService');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function authMiddleware(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(authMiddleware);

router.post('/unidades', async (req, res) => {
  try {
    const { unidade_id, nome, tipo, ordem, ativo } = req.body;
    
    if (!unidade_id || !nome || !tipo) {
      return res.status(400).json({ error: 'Campos obrigatórios: unidade_id, nome, tipo' });
    }

    const result = await sheetsCrud.appendRow('unidades', {
      unidade_id,
      nome: nome.toUpperCase(),
      tipo,
      ordem: ordem || '99',
      ativo: ativo || 'SIM',
      deleted_at: ''
    });

    invalidateCache('unidades');

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[POST /admin/unidades] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/unidades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipo, ordem, ativo } = req.body;

    const updateData = {};
    if (nome) updateData.nome = nome.toUpperCase();
    if (tipo) updateData.tipo = tipo;
    if (ordem) updateData.ordem = ordem;
    if (ativo) updateData.ativo = ativo;

    const result = await sheetsCrud.updateRow('unidades', 'unidade_id', id, updateData);
    
    invalidateCache('unidades');

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[PUT /admin/unidades/:id] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/unidades/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sheetsCrud.updateRow('unidades', 'unidade_id', id, {
      deleted_at: new Date().toISOString()
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[DELETE /admin/unidades/:id] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;