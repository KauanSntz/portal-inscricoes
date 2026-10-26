const express = require('express');
const axios = require('axios');
const router = express.Router();
const sheetsCrud = require('../services/sheetsCrudService');
const sheetsService = require('../services/sheetsService');

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'portal-inscricoes-tickets';
const SHEET_PROCESSOS = process.env.URL_PROCESSOS || 'processos_normalizados';
const CAMPOS_PROCESSO = ['codigo', 'tipo_ingresso', 'unidade_id', 'modalidade', 'periodo', 'link'];
const MODALIDADES_VALIDAS = ['PRESENCIAL', 'EAD', 'SEMIPRESENCIAL', 'FLEX', 'HÍBRIDO'];
const MAX_ITENS_LOTE = 1000;

// ============================================
// Autenticação: token do Firebase de um super_admin
// ============================================

function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

async function isAdmin(req, res, next) {
  // Scripts/automação: a senha só vale se ADMIN_PASSWORD estiver configurada no servidor (não há senha padrão)
  const password = req.headers['x-admin-password'];
  if (password && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const payload = token ? decodeJwtPayload(token) : null;

  if (!payload || payload.aud !== FIREBASE_PROJECT_ID || !payload.user_id || payload.exp * 1000 < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  try {
    // O Firestore valida a assinatura do token e aplica as regras de segurança (usuário lê o próprio doc)
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(payload.user_id)}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });

    const tipo = data.fields?.tipo?.stringValue;
    if (tipo !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Apenas Super Admin pode alterar estes dados.' });
    }

    req.adminUser = { uid: payload.user_id, email: payload.email || '' };
    next();
  } catch (error) {
    const status = error.response?.status;
    if (status === 404) {
      return res.status(403).json({ error: 'Forbidden', message: 'Usuário sem cadastro no sistema.' });
    }
    if (status === 401 || status === 403) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Não foi possível validar o usuário. Faça login novamente.' });
    }
    console.error(`[ADMIN] Falha ao validar usuário no Firestore: ${error.message}`);
    res.status(503).json({ error: 'Service Unavailable', message: 'Não foi possível validar o usuário agora. Tente novamente.' });
  }
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

    const generatedId = unidade_id || nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_');

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

// ============================================
// Processos (links de inscrição)
// O mesmo código pode ser usado por várias unidades (ex: EAD dos polos),
// por isso a chave de cada linha é código + unidade_id.
// ============================================

const slugUnidade = (valor) => String(valor || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().replace(/\s+/g, '_');

const chaveProcesso = (codigo, unidadeId) => `${String(codigo || '').trim()}|${slugUnidade(unidadeId)}`;

function normalizarModalidade(valor) {
  const m = String(valor || '').trim().toUpperCase();
  if (!m) return '';
  if (m.includes('FLEX')) return 'FLEX';
  if (m.includes('EAD')) return 'EAD';
  if (m.startsWith('SEMI')) return 'SEMIPRESENCIAL';
  if (m.startsWith('HIBRIDO') || m.startsWith('HÍBRIDO')) return 'HÍBRIDO';
  return m;
}

function normalizarItem(raw = {}) {
  return {
    codigo: String(raw.codigo ?? '').trim(),
    unidade_id: slugUnidade(raw.unidade_id),
    tipo_ingresso: String(raw.tipo_ingresso ?? '').trim().toUpperCase(),
    modalidade: normalizarModalidade(raw.modalidade),
    periodo: String(raw.periodo ?? '').trim(),
    link: String(raw.link ?? '').trim()
  };
}

function validarItem(item) {
  if (!/^\d+$/.test(item.codigo)) return 'Código inválido';
  if (item.modalidade && !MODALIDADES_VALIDAS.includes(item.modalidade)) {
    return `Modalidade inválida (${item.modalidade})`;
  }
  if (item.periodo && !/^\d{4}\/\d$/.test(item.periodo)) return 'Período inválido (use AAAA/N, ex: 2026/2)';
  if (item.link) {
    try {
      const url = new URL(item.link);
      if (!['http:', 'https:'].includes(url.protocol)) return 'Link deve começar com http(s)://';
    } catch (e) {
      return 'Link inválido';
    }
  }
  return null;
}

function atualizarCacheProcessos(rows) {
  const data = rows
    .filter(r => String(r.codigo || '').trim())
    .map(({ _row, ...resto }) => resto);
  sheetsService.setCache('processos', data);
}

async function lerProcessos(colunasObrigatorias) {
  const { headers, rows } = await sheetsCrud.getSheetData(SHEET_PROCESSOS);
  const headersOk = await sheetsCrud.ensureHeaders(SHEET_PROCESSOS, headers, colunasObrigatorias);
  return { headers: headersOk, rows };
}

/**
 * Cria/atualiza vários processos com uma leitura e no máximo duas escritas na planilha.
 * - Com unidade_id: atualiza a linha código+unidade (reativando se estiver inativa) ou cria uma nova.
 * - Sem unidade_id: atualiza link/período de todas as unidades ativas que usam o código.
 */
async function aplicarLote(itens) {
  const { headers, rows } = await lerProcessos([...CAMPOS_PROCESSO, 'deleted_at']);

  const porChave = new Map();
  rows.forEach(r => {
    if (!String(r.codigo || '').trim()) return;
    const chave = chaveProcesso(r.codigo, r.unidade_id);
    if (!porChave.has(chave)) porChave.set(chave, []);
    porChave.get(chave).push(r);
  });

  const resultado = { criados: 0, atualizados: 0, reativados: 0, inalterados: 0, erros: [] };
  const alteracoes = [];
  const novos = [];

  for (const raw of itens) {
    const item = normalizarItem(raw);
    const falha = (motivo) => resultado.erros.push({ codigo: item.codigo, unidade_id: item.unidade_id, motivo });

    const erro = validarItem(item);
    if (erro) { falha(erro); continue; }

    let alvos;
    let campos;
    if (item.unidade_id) {
      alvos = porChave.get(chaveProcesso(item.codigo, item.unidade_id)) || [];
      campos = ['tipo_ingresso', 'unidade_id', 'modalidade', 'periodo', 'link'];
    } else {
      alvos = rows.filter(r => String(r.codigo).trim() === item.codigo && !r.deleted_at);
      campos = ['periodo', 'link'];
    }

    if (alvos.length === 0) {
      if (!item.unidade_id) {
        falha('Código não encontrado na planilha. Informe a unidade para cadastrar.');
        continue;
      }
      if (!item.tipo_ingresso || !item.modalidade || !item.periodo || !item.link) {
        falha('Para cadastrar um processo novo informe tipo, modalidade, período e link.');
        continue;
      }
      const novo = { ...item, deleted_at: '' };
      novos.push(novo);
      porChave.set(chaveProcesso(item.codigo, item.unidade_id), [novo]);
      resultado.criados++;
      continue;
    }

    for (const alvo of alvos) {
      const mudancas = {};
      campos.forEach(campo => {
        if (item[campo] && item[campo] !== alvo[campo]) mudancas[campo] = item[campo];
      });

      // Item repetido no mesmo lote para uma linha que ainda vai ser criada
      if (!alvo._row) {
        Object.assign(alvo, mudancas);
        continue;
      }

      const reativar = Boolean(alvo.deleted_at);
      if (reativar) mudancas.deleted_at = '';

      if (Object.keys(mudancas).length === 0) {
        resultado.inalterados++;
        continue;
      }

      Object.assign(alvo, mudancas);
      Object.entries(mudancas).forEach(([field, value]) => alteracoes.push({ row: alvo._row, field, value }));
      if (reativar) resultado.reativados++;
      else resultado.atualizados++;
    }
  }

  try {
    await sheetsCrud.updateCells(SHEET_PROCESSOS, headers, alteracoes);
    await sheetsCrud.appendRows(SHEET_PROCESSOS, headers, novos);
  } catch (error) {
    sheetsService.invalidateCache();
    throw error;
  }

  if (alteracoes.length || novos.length) atualizarCacheProcessos([...rows, ...novos]);
  return resultado;
}

/**
 * Inativa (soft delete) ou reativa processos identificados por código + unidade_id.
 */
async function alterarStatus(itens, ativo) {
  const { headers, rows } = await lerProcessos(['deleted_at']);
  const agora = new Date().toISOString();
  const resultado = { alterados: 0, inalterados: 0, naoEncontrados: [] };
  const alteracoes = [];

  for (const raw of itens) {
    const chave = chaveProcesso(raw?.codigo, raw?.unidade_id);
    const alvos = rows.filter(r => String(r.codigo || '').trim() && chaveProcesso(r.codigo, r.unidade_id) === chave);

    if (!raw?.unidade_id || alvos.length === 0) {
      resultado.naoEncontrados.push({ codigo: raw?.codigo, unidade_id: raw?.unidade_id });
      continue;
    }

    alvos.forEach(alvo => {
      const jaEsta = ativo ? !alvo.deleted_at : Boolean(alvo.deleted_at);
      if (jaEsta) {
        resultado.inalterados++;
        return;
      }
      alvo.deleted_at = ativo ? '' : agora;
      alteracoes.push({ row: alvo._row, field: 'deleted_at', value: alvo.deleted_at });
      resultado.alterados++;
    });
  }

  try {
    await sheetsCrud.updateCells(SHEET_PROCESSOS, headers, alteracoes);
  } catch (error) {
    sheetsService.invalidateCache();
    throw error;
  }

  if (alteracoes.length) atualizarCacheProcessos(rows);
  return resultado;
}

function lerItensDoBody(req, res) {
  const itens = req.body?.itens;
  if (!Array.isArray(itens) || itens.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Envie { itens: [...] } com pelo menos um item.' });
    return null;
  }
  if (itens.length > MAX_ITENS_LOTE) {
    res.status(400).json({ error: 'Bad Request', message: `Máximo de ${MAX_ITENS_LOTE} itens por envio.` });
    return null;
  }
  return itens;
}

// Lista direto da planilha (sem o cache do OpenSheet), incluindo inativos
router.get('/processos', async (req, res) => {
  try {
    const { rows } = await sheetsCrud.getSheetData(SHEET_PROCESSOS);
    const data = rows
      .filter(r => String(r.codigo || '').trim())
      .map(({ _row, ...r }) => ({ ...r, codigo: String(r.codigo).trim(), deleted_at: r.deleted_at || '' }));
    res.json({ total: data.length, data });
  } catch (error) {
    console.error(`[ERRO] GET /admin/processos - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.post('/processos/lote', async (req, res) => {
  const itens = lerItensDoBody(req, res);
  if (!itens) return;

  try {
    const resultado = await aplicarLote(itens);
    console.log(`[ADMIN] Lote de processos por ${req.adminUser?.email || 'script'}: ${JSON.stringify({ ...resultado, erros: resultado.erros.length })}`);
    res.json({ success: resultado.erros.length === 0, ...resultado });
  } catch (error) {
    console.error(`[ERRO] /admin/processos/lote - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.post('/processos/inativar', async (req, res) => {
  const itens = lerItensDoBody(req, res);
  if (!itens) return;

  try {
    const resultado = await alterarStatus(itens, false);
    console.log(`[ADMIN] ${resultado.alterados} processo(s) inativado(s) por ${req.adminUser?.email || 'script'}`);
    res.json({ success: true, ...resultado });
  } catch (error) {
    console.error(`[ERRO] /admin/processos/inativar - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.post('/processos/reativar', async (req, res) => {
  const itens = lerItensDoBody(req, res);
  if (!itens) return;

  try {
    const resultado = await alterarStatus(itens, true);
    console.log(`[ADMIN] ${resultado.alterados} processo(s) reativado(s) por ${req.adminUser?.email || 'script'}`);
    res.json({ success: true, ...resultado });
  } catch (error) {
    console.error(`[ERRO] /admin/processos/reativar - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Rotas individuais (compatibilidade) — usam a mesma lógica do lote

router.post('/processos', validateProcesso, async (req, res) => {
  try {
    const resultado = await aplicarLote([req.body]);
    if (resultado.erros.length) {
      return res.status(400).json({ error: 'Bad Request', message: resultado.erros[0].motivo });
    }
    const action = resultado.criados ? 'create' : (resultado.inalterados ? 'none' : 'update');
    console.log(`[ADMIN] Processo ${req.body.codigo}/${req.body.unidade_id} ${action}`);
    res.json({ success: true, action, codigo: String(req.body.codigo) });
  } catch (error) {
    console.error(`[ERRO] /admin/processos - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Sem unidade_id (body ou ?unidade_id=), atualiza link/período de todas as unidades com o código
router.put('/processos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const unidade_id = req.body.unidade_id || req.query.unidade_id || '';
    const resultado = await aplicarLote([{ ...req.body, codigo, unidade_id }]);

    if (resultado.erros.length) {
      const status = resultado.erros[0].motivo.startsWith('Código não encontrado') ? 404 : 400;
      return res.status(status).json({ error: status === 404 ? 'Not Found' : 'Bad Request', message: resultado.erros[0].motivo });
    }

    console.log(`[ADMIN] Processo ${codigo}${unidade_id ? '/' + unidade_id : ''} updated`);
    res.json({ success: true, action: 'update', codigo, ...resultado });
  } catch (error) {
    console.error(`[ERRO] /admin/processos/:codigo - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

router.delete('/processos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    let unidade_id = req.query.unidade_id || '';

    if (!unidade_id) {
      const { rows } = await sheetsCrud.getSheetData(SHEET_PROCESSOS);
      const ativos = rows.filter(r => String(r.codigo || '').trim() === codigo && !r.deleted_at);
      if (ativos.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: `Processo ${codigo} not found` });
      }
      if (ativos.length > 1) {
        return res.status(409).json({
          error: 'Conflict',
          message: `O código ${codigo} é usado por ${ativos.length} unidades. Informe ?unidade_id=`
        });
      }
      unidade_id = ativos[0].unidade_id;
    }

    const resultado = await alterarStatus([{ codigo, unidade_id }], false);
    if (resultado.naoEncontrados.length) {
      return res.status(404).json({ error: 'Not Found', message: `Processo ${codigo}/${unidade_id} not found` });
    }
    if (resultado.alterados === 0) {
      return res.status(409).json({ error: 'Conflict', message: `Processo ${codigo}/${unidade_id} already deleted` });
    }

    console.log(`[ADMIN] Processo ${codigo}/${unidade_id} deleted`);
    res.json({ success: true, action: 'delete', codigo, unidade_id });
  } catch (error) {
    console.error(`[ERRO] /admin/processos/:codigo - ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
