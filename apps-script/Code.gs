/**
 * API do Portal de Inscrições em Google Apps Script (substitui a API Express do Render).
 *
 * Roda dentro da planilha "Banco de Dados" e a lê/grava direto, então a planilha
 * pode ficar PRIVADA (sem "qualquer pessoa com o link") e não precisa de conta de serviço.
 *
 * O site chama via assets/js/portal-api.js: um POST (text/plain, sem preflight de CORS)
 * com { route, method, query, body, token }. A resposta é sempre { status, body }:
 * Apps Script não deixa escolher o código HTTP, então o status vai dentro do JSON.
 *
 * Permissões:
 *   - leituras públicas (links, unidades, cursos, preços, pós, contatos): sem login
 *   - diário de bordo (tem CPF/telefone) e operadores: usuário logado no Firebase
 *   - /admin/* e PUT /operadores: super_admin
 * O token do Firebase é validado lendo users/{uid} no Firestore com o próprio token
 * (o Firestore confere a assinatura), igual ao que routes/admin.js fazia.
 *
 * Como publicar: ver apps-script/README.md.
 */

const SPREADSHEET_ID = '1t2upLN5hFLLf0Bqwgd_kheS9f1ztXJiMfrm1BSRp-Bo';
const FIREBASE_PROJECT_ID = 'portal-inscricoes-tickets';

const ABA_PROCESSOS = 'processos_normalizados';
const CAMPOS_PROCESSO = ['codigo', 'tipo_ingresso', 'unidade_id', 'modalidade', 'periodo', 'link'];
const MODALIDADES_VALIDAS = ['PRESENCIAL', 'EAD', 'SEMIPRESENCIAL', 'FLEX', 'HÍBRIDO'];
const MAX_ITENS_LOTE = 1000;
const CACHE_LEITURA_S = 60;

// ============================================
// Entrada
// ============================================

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder(400, { error: 'Bad Request', message: 'Corpo inválido (esperado JSON).' });
  }
  return executar(req);
}

// GET só para leituras públicas (facilita testar no navegador: ...exec?route=processos&limit=2)
function doGet(e) {
  const query = Object.assign({}, e.parameter);
  const route = query.route || '';
  delete query.route;
  return executar({ route, method: 'GET', query, body: null, token: '' });
}

function executar(req) {
  try {
    const r = rotear(req);
    return responder(r.status || 200, r.body);
  } catch (err) {
    if (err && err.httpStatus) {
      return responder(err.httpStatus, { error: err.httpError, message: err.message });
    }
    console.error(err && err.stack || err);
    return responder(500, { error: 'Internal Server Error', message: String(err && err.message || err) });
  }
}

function responder(status, body) {
  return ContentService
    .createTextOutput(JSON.stringify({ status, body }))
    .setMimeType(ContentService.MimeType.JSON);
}

function erroHttp(status, error, message) {
  const err = new Error(message);
  err.httpStatus = status;
  err.httpError = error;
  return err;
}

const ok = (body) => ({ status: 200, body });

// ============================================
// Rotas (mesmos caminhos e respostas da API Express)
// ============================================

function rotear(req) {
  const method = String(req.method || 'GET').toUpperCase();
  const partes = String(req.route || '').replace(/^\/+|\/+$/g, '').split('/').map(decodeURIComponent);
  const q = req.query || {};
  const body = req.body || {};
  const [r0, r1, r2] = partes;

  if (method === 'GET') {
    if (r0 === '' || r0 === 'health') return ok({ status: 'ok', servico: 'portal-inscricoes (Apps Script)' });
    if (r0 === 'processos' && !r1) return ok(listarProcessosPublico(q));
    if (r0 === 'processos' && r1) return processoPorCodigo(r1);
    if (r0 === 'unidades' && !r1) return ok({ data: filtrar(unidadesAtivas(), q.tipo && (u => u.tipo === q.tipo)) });
    if (r0 === 'unidades' && r1) return unidadePorId(r1);
    if (r0 === 'modalidades') return ok({ data: lerAbaCache('modalidades') });
    if (r0 === 'coordenadores') return ok(comTotal(listarCoordenadores(q)));
    if (r0 === 'setores-contato') return ok(comTotal(lerAbaCache('setores_contato')));
    if (r0 === 'cursos-oferta') return ok(comTotal(listarCursosOferta(q)));
    if (r0 === 'precos-cursos') return ok(comTotal(listarPrecos(q)));
    if (r0 === 'cursos-tecnicos') return ok(listarCursosTecnicos());
    if (r0 === 'pos-graduacao' && r1) return posGraduacao(r1);
  }

  if (r0 === 'diario') {
    const usuario = exigirLogin(req.token);
    if (method === 'GET') return ok(listarDiario(q));
    if (method === 'POST') return salvarDiario(body, usuario);
  }

  if (r0 === 'operadores') {
    if (method === 'GET') {
      exigirSuperAdmin(req.token);
      return ok(comTotal(lerAba('OPERADORES')));
    }
    if (method === 'POST') return criarOperador(body, exigirLogin(req.token));
    if (method === 'PUT' && r1) {
      exigirSuperAdmin(req.token);
      return atualizarOperador(r1, body);
    }
  }

  if (r0 === 'admin') {
    const admin = exigirSuperAdmin(req.token);
    if (r1 === 'processos') {
      if (method === 'GET' && !r2) return ok(listarProcessosAdmin());
      if (method === 'POST' && r2 === 'lote') return ok(comSucesso(aplicarLote(itensDoBody(body)), admin, 'lote'));
      if (method === 'POST' && r2 === 'inativar') return ok(Object.assign({ success: true }, alterarStatus(itensDoBody(body), false)));
      if (method === 'POST' && r2 === 'reativar') return ok(Object.assign({ success: true }, alterarStatus(itensDoBody(body), true)));
    }
    if (r1 === 'unidades') {
      if (method === 'POST' && !r2) return criarUnidade(body);
      if (method === 'PUT' && r2) return atualizarUnidade(r2, body);
      if (method === 'DELETE' && r2) return excluirUnidade(r2);
    }
  }

  throw erroHttp(404, 'Not Found', 'Endpoint não encontrado');
}

const comTotal = (data) => ({ total: data.length, data });
const filtrar = (lista, pred) => (pred ? lista.filter(pred) : lista);

// ============================================
// Planilha: leitura no formato do OpenSheet (cabeçalho = chave, valores como texto)
// ============================================

let _planilha = null;
function planilha() {
  if (!_planilha) _planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
  return _planilha;
}

// Nome da aba sem diferenciar maiúsculas/acentos de espaço ("pós sabado" = "Pós Sabado")
function aba(nome) {
  const alvo = String(nome).trim().toLowerCase();
  const sh = planilha().getSheets().find(s => s.getName().trim().toLowerCase() === alvo);
  if (!sh) throw erroHttp(404, 'Not Found', `Aba "${nome}" não encontrada`);
  return sh;
}

/** Tabela da aba: headers, linhas como objetos (com _row = nº da linha na planilha). */
function tabela(nome) {
  const sh = aba(nome);
  const valores = sh.getDataRange().getDisplayValues();
  const headers = (valores[0] || []).map(h => String(h));
  const rows = [];
  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    if (!linha.some(v => v !== '')) continue;
    const obj = { _row: i + 1 };
    headers.forEach((h, c) => { if (h !== '') obj[h] = linha[c]; });
    rows.push(obj);
  }
  return { sh, headers, rows };
}

function semRow(rows) {
  return rows.map(r => {
    const o = Object.assign({}, r);
    delete o._row;
    return o;
  });
}

function lerAba(nome) {
  return semRow(tabela(nome).rows);
}

// Leituras públicas com cache curto (o CacheService guarda até 100 KB por chave)
function lerAbaCache(nome) {
  const cache = CacheService.getScriptCache();
  const chave = 'aba:' + nome;
  const guardado = cache.get(chave);
  if (guardado) return JSON.parse(guardado);
  const dados = lerAba(nome);
  try {
    cache.put(chave, JSON.stringify(dados), CACHE_LEITURA_S);
  } catch (e) {
    // grande demais para o cache: segue sem cache
  }
  return dados;
}

function limparCache(nome) {
  CacheService.getScriptCache().remove('aba:' + nome);
}

/** Acha a coluna pelo nome, sem diferenciar maiúsculas. Cria no fim se `criar`. */
function coluna(sh, headers, nome, criar) {
  const idx = headers.findIndex(h => h.trim().toLowerCase() === nome.toLowerCase());
  if (idx >= 0) return idx + 1;
  if (!criar) return 0;
  const col = headers.length + 1;
  sh.getRange(1, col).setValue(nome);
  headers.push(nome);
  return col;
}

/** Grava os campos de um objeto numa linha (só nas colunas que existem). */
function gravarCampos(sh, headers, row, campos, criarColunas) {
  Object.keys(campos).forEach(campo => {
    const col = coluna(sh, headers, campo, criarColunas);
    if (col) sh.getRange(row, col).setValue(campos[campo]);
  });
}

/** Acrescenta linhas mapeando cada campo para a coluna de mesmo nome. */
function acrescentar(sh, headers, itens) {
  if (!itens.length) return;
  const mapa = headers.map(h => h.trim().toLowerCase());
  const linhas = itens.map(item => {
    const porNome = {};
    Object.keys(item).forEach(k => { porNome[k.toLowerCase()] = item[k]; });
    return mapa.map(h => (h in porNome ? porNome[h] : ''));
  });
  sh.getRange(sh.getLastRow() + 1, 1, linhas.length, headers.length).setValues(linhas);
}

function comTrava(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// ============================================
// Login (Firebase)
// ============================================

function exigirLogin(token) {
  if (!token) throw erroHttp(401, 'Unauthorized', 'Faça login para continuar.');

  const cache = CacheService.getScriptCache();
  const hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  const guardado = cache.get('tok:' + hash);
  if (guardado) return JSON.parse(guardado);

  let payload;
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = parte + '==='.slice((parte.length + 3) % 4);
    payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(pad)).getDataAsString());
  } catch (e) {
    payload = null;
  }
  if (!payload || payload.aud !== FIREBASE_PROJECT_ID || !payload.user_id || payload.exp * 1000 < Date.now()) {
    throw erroHttp(401, 'Unauthorized', 'Sessão inválida ou expirada. Faça login novamente.');
  }

  // O Firestore valida a assinatura do token e aplica as regras (o usuário lê o próprio doc)
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(payload.user_id)}`;
  const resp = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  const code = resp.getResponseCode();
  if (code === 404) throw erroHttp(403, 'Forbidden', 'Usuário sem cadastro no sistema.');
  if (code === 401 || code === 403) throw erroHttp(401, 'Unauthorized', 'Não foi possível validar o usuário. Faça login novamente.');
  if (code !== 200) throw erroHttp(503, 'Service Unavailable', 'Não foi possível validar o usuário agora. Tente novamente.');

  const fields = JSON.parse(resp.getContentText()).fields || {};
  const usuario = {
    uid: payload.user_id,
    email: payload.email || '',
    tipo: (fields.tipo && fields.tipo.stringValue) || 'comum'
  };
  const restante = Math.floor(payload.exp - Date.now() / 1000);
  if (restante > 30) cache.put('tok:' + hash, JSON.stringify(usuario), Math.min(300, restante));
  return usuario;
}

function exigirSuperAdmin(token) {
  const usuario = exigirLogin(token);
  if (usuario.tipo !== 'super_admin') {
    throw erroHttp(403, 'Forbidden', 'Apenas Super Admin pode alterar estes dados.');
  }
  return usuario;
}

// ============================================
// Leituras públicas
// ============================================

function unidadesAtivas() {
  return lerAbaCache('unidades').filter(u => !u.deleted_at);
}

function processosAtivos() {
  const nomes = {};
  lerAbaCache('unidades').forEach(u => { nomes[u.unidade_id] = u.nome; });
  return lerAba(ABA_PROCESSOS)
    .filter(p => String(p.codigo || '').trim() && !p.deleted_at)
    .map(p => Object.assign({}, p, { unidade_nome: nomes[p.unidade_id] || null }));
}

function listarProcessosPublico(q) {
  let lista = processosAtivos();
  ['unidade_id', 'modalidade', 'periodo', 'codigo'].forEach(campo => {
    if (q[campo] !== undefined && q[campo] !== '') lista = lista.filter(p => p[campo] === q[campo]);
  });
  const limit = parseInt(q.limit || 10, 10);
  const offset = parseInt(q.offset || 0, 10);
  return { total: lista.length, limit, offset, data: lista.slice(offset, offset + limit) };
}

function processoPorCodigo(codigo) {
  const p = processosAtivos().find(x => x.codigo === codigo);
  if (!p) throw erroHttp(404, 'Não encontrado', `Processo com código ${codigo} não encontrado`);
  return ok(p);
}

function unidadePorId(id) {
  const u = lerAbaCache('unidades').find(x => x.unidade_id === id);
  if (!u || u.deleted_at) throw erroHttp(404, 'Não encontrado', `Unidade com ID ${id} não encontrada`);
  return ok(u);
}

function listarCoordenadores(q) {
  const nomes = {};
  unidadesAtivas().forEach(u => { nomes[u.unidade_id] = u.nome; });
  let lista = lerAbaCache('coordenadores').map(c => Object.assign({}, c, { unidade_nome: nomes[c.unidade_id] || null }));
  if (q.unidade_id) lista = lista.filter(c => c.unidade_id === q.unidade_id);
  return lista;
}

function listarCursosOferta(q) {
  let lista = lerAbaCache('cursos_oferta');
  if (q.unidade_id) lista = lista.filter(c => c.unidade_id === q.unidade_id);
  if (q.modalidade) lista = lista.filter(c => c.modalidade === q.modalidade);
  return lista;
}

function listarPrecos(q) {
  let lista = lerAbaCache('precos_cursos');
  if (q.unidade_id) lista = lista.filter(p => p.unidade_id === q.unidade_id || p.unidade_id === '__all__');
  if (q.modalidade) lista = lista.filter(p => p.modalidade === q.modalidade);
  if (q.plano) lista = lista.filter(p => p.plano === q.plano);
  return lista;
}

// Linhas da aba → { unidade, endereco, cursos: [{ nome, duracao, turnos, valores, primeiraMensalidade }] }
function listarCursosTecnicos() {
  const unidades = new Map();
  lerAbaCache('cursos_tecnicos').forEach(row => {
    if (!unidades.has(row.unidade)) unidades.set(row.unidade, { unidade: row.unidade, endereco: row.endereco, cursos: new Map() });
    const u = unidades.get(row.unidade);
    if (!u.cursos.has(row.curso)) {
      u.cursos.set(row.curso, {
        nome: row.curso,
        duracao: row.duracao,
        turnos: [],
        valores: {},
        primeiraMensalidade: parseFloat(row.primeira_mensalidade) || 0
      });
    }
    const c = u.cursos.get(row.curso);
    if (row.turno && c.turnos.indexOf(row.turno) < 0) c.turnos.push(row.turno);
    if (row.turno && row.valor) c.valores[row.turno] = parseFloat(row.valor) || 0;
  });
  return Array.from(unidades.values()).map(u => ({ unidade: u.unidade, endereco: u.endereco, cursos: Array.from(u.cursos.values()) }));
}

const moeda = (v) => (v ? String(v).trim().replace(/^R\$\s*/, 'R$ ') : '');

function posSimples(r) {
  return {
    curso: (r['CURSO'] || '').trim(),
    duracao: (r['DURAÇÃO'] || '').trim(),
    primeiraMsg: moeda(r['1° \nMENSALIDADE'] || r['1° MENSALIDADE'] || ''),
    valorIntegral: moeda(r['VALOR DA MENSALIDADE INTEGRAL'] || ''),
    valorBolsa: moeda(r[' MENSALIDADE COM DESCONTO 50%'] || r['MENSALIDADE COM DESCONTO 50%'] || ''),
    pontualidade: moeda(r['10% DE PONTUALIDADE'] || '')
  };
}

function posEAD(r) {
  return {
    curso: (r['EAD'] || '').trim(),
    taxaMatricula: moeda(r['TAXA DE MATRÍCULA'] || ''),
    valorTotal: moeda(r['VALOR TOTAL DO CURSO'] || ''),
    meses6: moeda(r['  6 MESES     (SEM TCC)'] || r['6 MESES'] || ''),
    pontualidade6: moeda(r['10% PONTUALIDADE 6 MESES'] || r['10% PONTUALIDADE'] || ''),
    meses9: moeda(r['9 MESES'] || ''),
    pontualidade9: moeda(r['10% PONTUALIDADE 9 MESES'] || r['10% PONTUALIDADE'] || ''),
    meses12: moeda(r['12 MESES          \n(SEM TCC)'] || r['12 MESES'] || ''),
    pontualidade12: moeda(r['10% PONTUALIDADE 12 MESES'] || r['10% PONTUALIDADE'] || ''),
    meses15: moeda(r['15 MESES'] || ''),
    pontualidade15: moeda(r['10% PONTUALIDADE 15 MESES'] || r['10% PONTUALIDADE'] || '')
  };
}

function posGraduacao(tab) {
  const abas = { semana: 'pós semana', sabado: 'pós sabado', 'ao-vivo': 'pós ao vivo', ead: 'pós EAD' };
  if (!abas[tab]) throw erroHttp(404, 'Not Found', 'Endpoint não encontrado');
  const raw = lerAbaCache(abas[tab]);
  const data = tab === 'ead'
    ? raw.filter(r => r['EAD'] && r['EAD'].trim()).map(posEAD)
    : raw.filter(r => r['CURSO'] && r['CURSO'].trim()).map(posSimples);
  return ok({ status: 'ok', modalidade: tab, data });
}

// ============================================
// Diário de bordo (dados pessoais: só logado)
// ============================================

function listarDiario(q) {
  let registros = lerAba('diario_bordo').map(r => {
    const o = {};
    Object.keys(r).forEach(k => { o[k.toUpperCase()] = r[k]; });
    return o;
  }).filter(r => String(r.SITUACAO || '').toLowerCase() !== 'inativo');

  if (q.operador) registros = registros.filter(r => String(r.ID_OPERADOR) === String(q.operador));
  if (q.data) registros = registros.filter(r => r.DATA_INSCRICAO === q.data);
  if (q.cpf) registros = registros.filter(r => String(r.CPF || '').indexOf(q.cpf) >= 0);
  if (q.nome) {
    const termo = String(q.nome).toLowerCase();
    registros = registros.filter(r => String(r.NOME || '').toLowerCase().indexOf(termo) >= 0);
  }
  if (q.limit) registros = registros.slice(0, parseInt(q.limit, 10));
  return comTotal(registros);
}

function salvarDiario(b, usuario) {
  const acao = b.acao || 'novo';
  if (acao !== 'excluir' && acao !== 'editar' && (!b.nome || !b.cpf)) {
    throw erroHttp(400, 'Bad Request', 'Nome e CPF são obrigatórios para novos registros.');
  }
  const campos = ['id_registro', 'id_operador', 'nome_operador', 'data_inscricao', 'tipo_inscricao', 'nome',
    'telefone', 'nascimento', 'cpf', 'curso', 'modalidade', 'unidade', 'situacao'];
  const dados = {};
  campos.forEach(c => { dados[c] = b[c] || ''; });

  return comTrava(() => {
    const { sh, headers, rows } = tabela('diario_bordo');
    const chave = headers.find(h => h.toLowerCase() === 'id_registro') || 'id_registro';
    const alvo = acao === 'novo' ? null : rows.find(r => String(r[chave]) === String(dados.id_registro));

    if (acao === 'excluir') {
      if (!alvo) throw erroHttp(500, 'Internal Server Error', `Registro ${dados.id_registro} não encontrado para exclusão`);
      gravarCampos(sh, headers, alvo._row, { situacao: 'inativo' }, false);
    } else if (acao === 'editar') {
      if (!alvo) throw erroHttp(500, 'Internal Server Error', `Registro ${dados.id_registro} não encontrado para edição`);
      gravarCampos(sh, headers, alvo._row, dados, false);
    } else {
      acrescentar(sh, headers, [dados]);
    }
    console.log(`[DIARIO] ${acao} ${dados.id_registro} por ${usuario.email}`);
    return ok({ status: 'ok', action: acao, data: dados });
  });
}

// ============================================
// Operadores
// ============================================

function criarOperador(b, usuario) {
  if (!b.nome || !b.email) throw erroHttp(400, 'Bad Request', 'Nome e email são obrigatórios.');
  // Cada pessoa só cadastra a si mesma (o uid vem do token, não do corpo)
  const dados = { id: b.id || '', uid: usuario.uid, nome: b.nome, email: b.email, tipo: 'comum' };
  return comTrava(() => {
    const { sh, headers } = tabela('OPERADORES');
    acrescentar(sh, headers, [dados]);
    return ok({ status: 'success', data: dados });
  });
}

function atualizarOperador(uid, b) {
  if (!b.tipo) throw erroHttp(400, 'Bad Request', 'Tipo é obrigatório.');
  return comTrava(() => {
    const { sh, headers, rows } = tabela('OPERADORES');
    const chave = headers.find(h => h.toLowerCase() === 'uid') || 'uid';
    const alvo = rows.find(r => r[chave] === uid);
    if (!alvo) throw erroHttp(404, 'Not Found', 'Operador não encontrado.');
    gravarCampos(sh, headers, alvo._row, { tipo: b.tipo }, false);
    return ok({ status: 'success', data: { uid, tipo: b.tipo } });
  });
}

// ============================================
// Admin: unidades
// ============================================

const slugUnidade = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, '_');

function criarUnidade(b) {
  if (!b.nome || !b.tipo) throw erroHttp(400, 'Bad Request', 'nome and tipo are required');
  const id = b.unidade_id || slugUnidade(b.nome);
  return comTrava(() => {
    const { sh, headers, rows } = tabela('unidades');
    const existente = rows.find(r => r.unidade_id === id);
    if (existente && !existente.deleted_at) throw erroHttp(409, 'Conflict', `Unidade ${id} already exists`);
    const dados = { unidade_id: id, nome: String(b.nome).toUpperCase(), tipo: b.tipo, ordem: b.ordem || '99', ativo: 'SIM', deleted_at: '' };
    if (existente) gravarCampos(sh, headers, existente._row, dados, true);
    else {
      coluna(sh, headers, 'deleted_at', true);
      acrescentar(sh, headers, [dados]);
    }
    limparCache('unidades');
    return ok({ success: true, action: existente ? 'update' : 'create', unidade_id: id });
  });
}

function atualizarUnidade(id, b) {
  return comTrava(() => {
    const { sh, headers, rows } = tabela('unidades');
    const existente = rows.find(r => r.unidade_id === id);
    if (!existente) throw erroHttp(404, 'Not Found', `Unidade ${id} not found`);
    gravarCampos(sh, headers, existente._row, {
      nome: b.nome ? String(b.nome).toUpperCase() : existente.nome,
      tipo: b.tipo || existente.tipo,
      ordem: b.ordem || existente.ordem,
      ativo: b.ativo || existente.ativo,
      deleted_at: ''
    }, true);
    limparCache('unidades');
    return ok({ success: true, action: 'update', unidade_id: id });
  });
}

function excluirUnidade(id) {
  return comTrava(() => {
    const { sh, headers, rows } = tabela('unidades');
    const existente = rows.find(r => r.unidade_id === id);
    if (!existente) throw erroHttp(404, 'Not Found', `Unidade ${id} not found`);
    if (existente.deleted_at) throw erroHttp(409, 'Conflict', `Unidade ${id} already deleted`);
    gravarCampos(sh, headers, existente._row, { deleted_at: new Date().toISOString() }, true);
    limparCache('unidades');
    return ok({ success: true, action: 'delete', unidade_id: id });
  });
}

// ============================================
// Admin: processos (links). A chave de cada linha é código + unidade_id,
// porque o mesmo código é usado por várias unidades (ex: EAD dos polos).
// ============================================

const chaveProcesso = (codigo, unidade) => `${String(codigo || '').trim()}|${slugUnidade(unidade)}`;

function normalizarModalidade(v) {
  const m = String(v || '').trim().toUpperCase();
  if (!m) return '';
  if (m.indexOf('FLEX') >= 0) return 'FLEX';
  if (m.indexOf('EAD') >= 0) return 'EAD';
  if (m.indexOf('SEMI') === 0) return 'SEMIPRESENCIAL';
  if (m.indexOf('HIBRIDO') === 0 || m.indexOf('HÍBRIDO') === 0) return 'HÍBRIDO';
  return m;
}

function normalizarItem(raw) {
  raw = raw || {};
  return {
    codigo: String(raw.codigo == null ? '' : raw.codigo).trim(),
    unidade_id: slugUnidade(raw.unidade_id),
    tipo_ingresso: String(raw.tipo_ingresso == null ? '' : raw.tipo_ingresso).trim().toUpperCase(),
    modalidade: normalizarModalidade(raw.modalidade),
    periodo: String(raw.periodo == null ? '' : raw.periodo).trim(),
    link: String(raw.link == null ? '' : raw.link).trim()
  };
}

function validarItem(item) {
  if (!/^\d+$/.test(item.codigo)) return 'Código inválido';
  if (item.modalidade && MODALIDADES_VALIDAS.indexOf(item.modalidade) < 0) return `Modalidade inválida (${item.modalidade})`;
  if (item.periodo && !/^\d{4}\/\d$/.test(item.periodo)) return 'Período inválido (use AAAA/N, ex: 2027/1)';
  if (item.link && !/^https?:\/\/[^\s]+$/i.test(item.link)) return 'Link inválido';
  return null;
}

function itensDoBody(body) {
  const itens = body && body.itens;
  if (!Array.isArray(itens) || itens.length === 0) throw erroHttp(400, 'Bad Request', 'Envie { itens: [...] } com pelo menos um item.');
  if (itens.length > MAX_ITENS_LOTE) throw erroHttp(400, 'Bad Request', `Máximo de ${MAX_ITENS_LOTE} itens por envio.`);
  return itens;
}

function comSucesso(resultado, admin, acao) {
  console.log(`[ADMIN] ${acao} por ${admin.email}: criados=${resultado.criados} atualizados=${resultado.atualizados} erros=${resultado.erros.length}`);
  return Object.assign({ success: resultado.erros.length === 0 }, resultado);
}

// Lista direto da planilha, incluindo inativos
function listarProcessosAdmin() {
  const data = lerAba(ABA_PROCESSOS)
    .filter(r => String(r.codigo || '').trim())
    .map(r => Object.assign({}, r, { codigo: String(r.codigo).trim(), deleted_at: r.deleted_at || '' }));
  return comTotal(data);
}

/**
 * Cria/atualiza vários processos.
 * - Com unidade_id: atualiza a linha código+unidade (reativando se estiver inativa) ou cria uma nova.
 * - Sem unidade_id: atualiza link/período de todas as unidades ativas que usam o código.
 */
function aplicarLote(itens) {
  return comTrava(() => {
    const { sh, headers, rows } = tabela(ABA_PROCESSOS);
    CAMPOS_PROCESSO.concat(['deleted_at']).forEach(c => coluna(sh, headers, c, true));

    const porChave = new Map();
    rows.forEach(r => {
      if (!String(r.codigo || '').trim()) return;
      const k = chaveProcesso(r.codigo, r.unidade_id);
      if (!porChave.has(k)) porChave.set(k, []);
      porChave.get(k).push(r);
    });

    const resultado = { criados: 0, atualizados: 0, reativados: 0, inalterados: 0, erros: [] };
    const alteradas = new Map();   // _row -> { campo: valor }
    const novos = [];

    itens.forEach(raw => {
      const item = normalizarItem(raw);
      const falha = (motivo) => resultado.erros.push({ codigo: item.codigo, unidade_id: item.unidade_id, motivo });
      const erro = validarItem(item);
      if (erro) return falha(erro);

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
        if (!item.unidade_id) return falha('Código não encontrado na planilha. Informe a unidade para cadastrar.');
        if (!item.tipo_ingresso || !item.modalidade || !item.periodo || !item.link) {
          return falha('Para cadastrar um processo novo informe tipo, modalidade, período e link.');
        }
        const novo = Object.assign({}, item, { deleted_at: '' });
        novos.push(novo);
        porChave.set(chaveProcesso(item.codigo, item.unidade_id), [novo]);
        resultado.criados++;
        return;
      }

      alvos.forEach(alvo => {
        const mudancas = {};
        campos.forEach(c => { if (item[c] && item[c] !== alvo[c]) mudancas[c] = item[c]; });
        if (!alvo._row) {   // repetido no mesmo lote para uma linha que ainda vai ser criada
          Object.assign(alvo, mudancas);
          return;
        }
        const reativar = Boolean(alvo.deleted_at);
        if (reativar) mudancas.deleted_at = '';
        if (Object.keys(mudancas).length === 0) {
          resultado.inalterados++;
          return;
        }
        Object.assign(alvo, mudancas);
        alteradas.set(alvo._row, Object.assign(alteradas.get(alvo._row) || {}, mudancas));
        if (reativar) resultado.reativados++;
        else resultado.atualizados++;
      });
    });

    alteradas.forEach((mudancas, row) => gravarCampos(sh, headers, row, mudancas, false));
    acrescentar(sh, headers, novos);
    return resultado;
  });
}

/** Inativa (soft delete) ou reativa processos identificados por código + unidade_id. */
function alterarStatus(itens, ativo) {
  return comTrava(() => {
    const { sh, headers, rows } = tabela(ABA_PROCESSOS);
    coluna(sh, headers, 'deleted_at', true);
    const agora = new Date().toISOString();
    const resultado = { alterados: 0, inalterados: 0, naoEncontrados: [] };

    itens.forEach(raw => {
      raw = raw || {};
      const chave = chaveProcesso(raw.codigo, raw.unidade_id);
      const alvos = rows.filter(r => String(r.codigo || '').trim() && chaveProcesso(r.codigo, r.unidade_id) === chave);
      if (!raw.unidade_id || alvos.length === 0) {
        resultado.naoEncontrados.push({ codigo: raw.codigo, unidade_id: raw.unidade_id });
        return;
      }
      alvos.forEach(alvo => {
        const jaEsta = ativo ? !alvo.deleted_at : Boolean(alvo.deleted_at);
        if (jaEsta) {
          resultado.inalterados++;
          return;
        }
        alvo.deleted_at = ativo ? '' : agora;
        gravarCampos(sh, headers, alvo._row, { deleted_at: alvo.deleted_at }, false);
        resultado.alterados++;
      });
    });
    return resultado;
  });
}
