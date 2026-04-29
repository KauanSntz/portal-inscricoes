const express = require('express');
const router = express.Router();
const sheetsCrud = require('../services/sheetsCrudService');
const sheetsService = require('../services/sheetsService');

function isAdmin(req, res, next) {
  const password = req.headers['x-admin-password'];
  
  if (!password) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Header x-admin-password required' });
  }

  const validPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password !== validPassword) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid password' });
  }

  next();
}

router.use(isAdmin);

async function validateUnidade(req, res, next) {
  const { nome, tipo } = req.body;
  
  if (!nome || !tipo) {
    return res.status(400).json({ error: 'Bad Request', message: 'nome and tipo are required' });
  }

  next();
}

async function validateProcesso(req, res, next) {
  const { codigo, tipo_ingresso, unidade_id, modalidade } = req.body;
  
  if (!codigo || !tipo_ingresso || !unidade_id || !modalidade) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'codigo, tipo_ingresso, unidade_id, modalidade are required' 
    });
  }

  next();
}

router.post('/unidades', validateUnidade, async (req, res) => {
  try {
    const { nome, tipo, unidade_id, ordem } = req.body;
    
    const generatedId = unidade_id || nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
    
    const existing = await sheetsCrud.findRowByField('unidades', 'unidade_id', generatedId);
    if (existing && !existing.deleted_at) {
      return res.status(409).json({ error: 'Conflict', message: `Unidade ${generatedId} already exists` });
    }

    const isUpdate = existing && existing.deleted_at;
    
    const data = {
      unidade_id: generatedId,
      nome: nome.toUpperCase(),
      tipo,
      ordem: ordem || '99',
      ativo: 'SIM',
      deleted_at: ''
    };

    if (isUpdate) {
      await sheetsCrud.updateRow('unidades', 'unidade_id', generatedId, data);
    } else {
      await sheetsCrud.appendRow('unidades', data);
    }

    sheetsService.invalidateCache();
    console.log(`[ADMIN] Unidade ${generatedId} ${isUpdate ? 'updated' : 'created'}`);

    res.json({ success: true, action: isUpdate ? 'update' : 'create', unidade_id: generatedId });
  } catch (error) {
    console.error(`[ERRO] /admin/unidades - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.put('/unidades/:unidade_id', async (req, res) => {
  try {
    const { unidade_id } = req.params;
    const { nome, tipo, ordem, ativo } = req.body;

    const existing = await sheetsCrud.findRowByField('unidades', 'unidade_id', unidade_id);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: `Unidade ${unidade_id} not found` });
    }

    const data = {
      ...existing,
      nome: nome ? nome.toUpperCase() : existing.nome,
      tipo: tipo || existing.tipo,
      ordem: ordem || existing.ordem,
      ativo: ativo || existing.ativo,
      deleted_at: ''
    };

    await sheetsCrud.updateRow('unidades', 'unidade_id', unidade_id, data);
    sheetsService.invalidateCache();
    console.log(`[ADMIN] Unidade ${unidade_id} updated`);

    res.json({ success: true, action: 'update', unidade_id });
  } catch (error) {
    console.error(`[ERRO] /admin/unidades/:id - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.delete('/unidades/:unidade_id', async (req, res) => {
  try {
    const { unidade_id } = req.params;

    const existing = await sheetsCrud.findRowByField('unidades', 'unidade_id', unidade_id);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: `Unidade ${unidade_id} not found` });
    }

    if (existing.deleted_at) {
      return res.status(409).json({ error: 'Conflict', message: `Unidade ${unidade_id} already deleted` });
    }

    await sheetsCrud.deleteRow('unidades', 'unidade_id', unidade_id);
    sheetsService.invalidateCache();
    console.log(`[ADMIN] Unidade ${unidade_id} deleted`);

    res.json({ success: true, action: 'delete', unidade_id });
  } catch (error) {
    console.error(`[ERRO] /admin/unidades/:id - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.post('/processos', validateProcesso, async (req, res) => {
  try {
    const { codigo, tipo_ingresso, unidade_id, modalidade, periodo, link } = req.body;
    
    const existing = await sheetsCrud.findRowByField('processos_normalizados', 'codigo', String(codigo));
    if (existing && !existing.deleted_at) {
      return res.status(409).json({ error: 'Conflict', message: `Processo ${codigo} already exists` });
    }

    const isUpdate = existing && existing.deleted_at;
    
    const data = {
      codigo: String(codigo),
      tipo_ingresso,
      unidade_id,
      modalidade,
      periodo: periodo || 46054,
      link: link || '',
      deleted_at: ''
    };

    if (isUpdate) {
      await sheetsCrud.updateRow('processos_normalizados', 'codigo', String(codigo), data);
    } else {
      await sheetsCrud.appendRow('processos_normalizados', data);
    }

    sheetsService.invalidateCache();
    console.log(`[ADMIN] Processo ${codigo} ${isUpdate ? 'updated' : 'created'}`);

    res.json({ success: true, action: isUpdate ? 'update' : 'create', codigo });
  } catch (error) {
    console.error(`[ERRO] /admin/processos - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.put('/processos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { tipo_ingresso, unidade_id, modalidade, periodo, link } = req.body;

    const existing = await sheetsCrud.findRowByField('processos_normalizados', 'codigo', codigo);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: `Processo ${codigo} not found` });
    }

    const data = {
      ...existing,
      codigo,
      tipo_ingresso: tipo_ingresso || existing.tipo_ingresso,
      unidade_id: unidade_id || existing.unidade_id,
      modalidade: modalidade || existing.modalidade,
      periodo: periodo || existing.periodo,
      link: link || existing.link,
      deleted_at: ''
    };

    await sheetsCrud.updateRow('processos_normalizados', 'codigo', codigo, data);
    sheetsService.invalidateCache();
    console.log(`[ADMIN] Processo ${codigo} updated`);

    res.json({ success: true, action: 'update', codigo });
  } catch (error) {
    console.error(`[ERRO] /admin/processos/:codigo - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.delete('/processos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const existing = await sheetsCrud.findRowByField('processos_normalizados', 'codigo', codigo);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: `Processo ${codigo} not found` });
    }

    if (existing.deleted_at) {
      return res.status(409).json({ error: 'Conflict', message: `Processo ${codigo} already deleted` });
    }

    await sheetsCrud.deleteRow('processos_normalizados', 'codigo', codigo);
    sheetsService.invalidateCache();
    console.log(`[ADMIN] Processo ${codigo} deleted`);

    res.json({ success: true, action: 'delete', codigo });
  } catch (error) {
    console.error(`[ERRO] /admin/processos/:codigo - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;