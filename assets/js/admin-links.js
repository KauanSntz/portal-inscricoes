// ============================================
// Admin Links - Importação e Gerenciamento
// ============================================
// Os dados vêm da aba processos_normalizados. O mesmo código de processo pode
// ser usado por várias unidades (ex: EAD dos polos), então cada linha é
// identificada por código + unidade_id.

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000' : 'https://portal-inscricoes.onrender.com';
const LOTE_MAXIMO = 500;

let currentLinks = [];        // linhas da planilha (ativas e inativas)
let unidades = [];            // [{ id, nome }]
let unitIndex = new Map();    // chave normalizada (id ou nome) -> unidade_id
let parsedLinks = [];
let adminIniciado = false;
let feedbackTimer = null;

const $ = (id) => document.getElementById(id);

const esc = (valor) => String(valor ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const semAcento = (valor) => String(valor || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// Mesmo formato de unidade_id usado pelo backend (routes/admin.js)
const slugUnidade = (valor) => semAcento(valor).trim().toLowerCase().replace(/\s+/g, '_');

// Chave para comparar nomes: "MANAUS - COMPENSA" e "manaus_-_compensa" viram "manaus_compensa"
const unitKey = (valor) => semAcento(valor).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const termoBusca = (valor) => semAcento(valor).toLowerCase();

// --------------------------------------------
// Autenticação (verifica o tipo do usuário no Firestore)
// --------------------------------------------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = './index.html';
    return;
  }
  if (adminIniciado) return;

  try {
    const doc = await db.collection('users').doc(user.uid).get();
    const tipo = doc.exists ? (doc.data().tipo || 'comum') : 'comum';
    localStorage.setItem('userType', tipo);

    if (tipo !== 'super_admin') {
      showAccessDenied();
      return;
    }

    adminIniciado = true;
    $('adminContent').classList.remove('hidden');
    await loadData();
  } catch (err) {
    console.error('[admin-links] Erro ao verificar permissão:', err);
    showAccessDenied('Não foi possível verificar sua permissão. Recarregue a página.');
  } finally {
    hideAppLoading();
  }
});

function hideAppLoading() {
  const appLoading = $('app-loading');
  if (appLoading) appLoading.remove();
}

function showAccessDenied(message) {
  if (message) $('accessDeniedText').textContent = message;
  $('adminContent').classList.add('hidden');
  $('accessDenied').classList.remove('hidden');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('is-active', el.id === tabId));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.toggle('is-active', el.dataset.tab === tabId));
  if (tabId === 'manageTab') renderManageLinks();
}

function showLoading(show, text = 'Processando...') {
  $('loadingText').textContent = text;
  $('loading').classList.toggle('hidden', !show);
}

// Mensagens de erro ficam na tela até a próxima ação; as demais somem sozinhas
function showFeedback(message, type = 'info') {
  const el = $('feedback');
  clearTimeout(feedbackTimer);
  el.textContent = message;
  el.className = `feedback feedback--${type}`;
  if (type !== 'error') {
    feedbackTimer = setTimeout(() => el.classList.add('hidden'), 6000);
  }
}

// --------------------------------------------
// API
// --------------------------------------------
async function apiAdmin(path, { method = 'GET', body } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');

  const token = await user.getIdToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/admin${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erro ${res.status} na API`);
  return data;
}

async function loadData() {
  showLoading(true, 'Carregando links da planilha...');
  try {
    const [processos, unidadesResp] = await Promise.all([
      apiAdmin('/processos'),
      fetch(`${API_URL}/unidades`).then(r => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] }))
    ]);

    currentLinks = processos.data || [];
    buildUnitIndex(unidadesResp.data || []);
    renderManageLinks();
    if (parsedLinks.length) {
      parsedLinks.forEach(updateStatus);
      renderPreview();
    }
  } catch (err) {
    console.error('[admin-links] Erro ao carregar links:', err);
    showFeedback(`Erro ao carregar links: ${err.message}`, 'error');
  } finally {
    showLoading(false);
  }
}

function buildUnitIndex(listaUnidades) {
  const porSlug = new Map();
  listaUnidades.forEach(u => {
    const s = slugUnidade(u.unidade_id);
    if (s && !porSlug.has(s)) porSlug.set(s, { id: u.unidade_id, nome: u.nome || u.unidade_id });
  });
  // Polos que existem nos processos mas não estão cadastrados na aba "unidades"
  currentLinks.forEach(p => {
    const s = slugUnidade(p.unidade_id);
    if (s && !porSlug.has(s)) porSlug.set(s, { id: p.unidade_id, nome: p.unidade_id.replace(/_/g, ' ').toUpperCase() });
  });

  unidades = [...porSlug.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  unitIndex = new Map();
  unidades.forEach(u => unitIndex.set(unitKey(u.id), u.id));
  unidades.forEach(u => {
    const k = unitKey(u.nome);
    if (k && !unitIndex.has(k)) unitIndex.set(k, u.id);
  });

  $('unitOptions').innerHTML = unidades
    .map(u => `<option value="${esc(u.id)}">${esc(u.nome)}</option>`)
    .join('');
}

const nomeUnidade = (id) => {
  const u = unidades.find(x => slugUnidade(x.id) === slugUnidade(id));
  return u ? u.nome : String(id || '').toUpperCase();
};

// --------------------------------------------
// Aba 1: Parsing e Preview
// --------------------------------------------
const MODALIDADE_SUFIXOS = [
  [/\s*\bSEMI\s*-?\s*PRESENCIAL\s*-?\s*FLEX$/, 'FLEX'],
  [/\s*\bSEMI\s*-?\s*FLEX$/, 'FLEX'],
  [/\s*100\s*%\s*-?\s*EAD$/, 'EAD'],   // aceita "BAURU100% EAD"
  [/\s*\bEAD\s*-?\s*100\s*%$/, 'EAD'],
  [/\s*\bSEMI\s*-?\s*PRESENCIAL$/, 'SEMIPRESENCIAL'],
  [/\s*\bH[IÍ]BRIDO$/, 'HÍBRIDO'],
  [/\s*\bPRESENCIAL$/, 'PRESENCIAL'],
  [/\s*\bFLEX$/, 'FLEX'],
  [/\s*\bEAD$/, 'EAD']
];

const TIPO_REGEX = /^(VESTIBULAR|MATR[IÍ]CULA)(\s+ONLINE)?\b\s*-?\s*/;
const URL_REGEX = /https?:\/\/\S+/i;
const LINHA_PROCESSO = /^[^A-Z0-9]*(\d{1,6})\s*[-–—.:)]?\s+(.+)$/;

function limparLinha(linha) {
  return linha
    .toUpperCase()
    .replace(/[*_~]/g, ' ')        // formatação do WhatsApp
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function limparUrl(url) {
  return url.trim().replace(/[.,;)\]]+$/, '');
}

/**
 * Lê "3434 VESTIBULAR ONLINE - LESTE PRESENCIAL - 2026/2" e devolve os campos.
 */
function parseTitulo(titulo) {
  const m = titulo.match(LINHA_PROCESSO);
  if (!m) return null;

  const item = { codigo: m[1], titulo, tipo_ingresso: '', modalidade: '', periodo: '', unidadeTexto: '', erro: '' };
  let resto = m[2].trim();

  const periodo = resto.match(/\s*-?\s*(\d{4})\s*[/.-]\s*([1-9])\s*$/);
  if (periodo) {
    item.periodo = `${periodo[1]}/${periodo[2]}`;
    resto = resto.slice(0, periodo.index);
  }
  resto = resto.replace(/^[\s-]+|[\s-]+$/g, '');

  const tipo = resto.match(TIPO_REGEX);
  if (tipo) {
    item.tipo_ingresso = tipo[1].startsWith('VEST') ? 'VESTIBULAR ONLINE' : 'MATRÍCULA ONLINE';
    resto = resto.slice(tipo[0].length);
  } else if (resto.includes(' - ')) {
    const partes = resto.split(' - ');
    item.tipo_ingresso = partes.shift().trim();
    resto = partes.join(' - ');
  }
  resto = resto.replace(/^[\s-]+|[\s-]+$/g, '');

  for (const [regex, modalidade] of MODALIDADE_SUFIXOS) {
    if (regex.test(resto)) {
      item.modalidade = modalidade;
      resto = resto.replace(regex, '');
      break;
    }
  }
  item.unidadeTexto = resto.replace(/^[\s-]+|[\s-]+$/g, '');

  // Modalidade ausente só é erro para processo novo (ver updateStatus)
  if (!item.tipo_ingresso) item.erro = 'Tipo de ingresso não identificado';
  else if (!item.periodo) item.erro = 'Período (ex: 2026/2) não encontrado na linha';

  return item;
}

function resolverUnidade(item) {
  item.novaUnidade = '';
  if (!item.unidadeTexto) {
    item.unidade_id = '';   // sem unidade: aplica a todas as unidades com o código
    return;
  }
  const id = unitIndex.get(unitKey(item.unidadeTexto));
  if (id) {
    item.unidade_id = id;
  } else {
    item.novaUnidade = unitKey(item.unidadeTexto);
    item.unidade_id = item.novaUnidade;
  }
}

function parseText() {
  const linhas = $('importText').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (linhas.length === 0) {
    showFeedback('Cole algum texto para processar.', 'error');
    return;
  }

  parsedLinks = [];
  for (let i = 0; i < linhas.length; i++) {
    const original = linhas[i];
    if (/^https?:\/\//i.test(original)) continue;   // link solto, sem título antes

    const urlNaLinha = original.match(URL_REGEX);
    const item = parseTitulo(limparLinha(urlNaLinha ? original.replace(URL_REGEX, '') : original));
    if (!item) continue;   // cabeçalho ou texto livre

    if (urlNaLinha) {
      item.link = limparUrl(urlNaLinha[0]);
    } else if (i + 1 < linhas.length && /^https?:\/\//i.test(linhas[i + 1])) {
      item.link = limparUrl(linhas[i + 1].match(URL_REGEX)[0]);
      i++;
    } else {
      item.link = '';
      item.erro = item.erro || 'Link não encontrado na linha seguinte';
    }

    resolverUnidade(item);
    item.incluir = true;
    parsedLinks.push(item);
  }

  // O mesmo código + unidade repetido no texto: vale a última ocorrência
  const vistos = new Map();
  parsedLinks.forEach((item, idx) => {
    if (item.erro) return;
    const chave = `${item.codigo}|${slugUnidade(item.unidade_id)}`;
    if (vistos.has(chave)) {
      const anterior = parsedLinks[vistos.get(chave)];
      anterior.erro = 'Repetido no texto (vale a última ocorrência)';
    }
    vistos.set(chave, idx);
  });

  parsedLinks.forEach(updateStatus);
  renderPreview();
}

function avisosDoItem(item) {
  const avisos = [];
  if (item.link) {
    try {
      const ps = new URL(item.link).searchParams.get('ps');
      if (ps && ps !== item.codigo) avisos.push(`O link aponta para ps=${ps}, diferente do código ${item.codigo}`);
    } catch (e) {
      // validado pelo status
    }
  }
  if (item.novaUnidade && item.unidade_id === item.novaUnidade) {
    avisos.push(`Unidade "${item.unidadeTexto}" não cadastrada — será criada como "${item.novaUnidade}"`);
  }
  return avisos;
}

function updateStatus(item) {
  item.detalhe = '';
  item.alvos = 0;
  item.avisos = avisosDoItem(item);

  if (item.erro) {
    item.status = 'erro';
    item.detalhe = item.erro;
    return;
  }
  try {
    const url = new URL(item.link);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch (e) {
    item.status = 'erro';
    item.detalhe = 'Link inválido';
    return;
  }

  const comUnidade = Boolean(item.unidade_id);
  const linhas = comUnidade
    ? currentLinks.filter(r => r.codigo === item.codigo && slugUnidade(r.unidade_id) === slugUnidade(item.unidade_id))
    : currentLinks.filter(r => r.codigo === item.codigo && !r.deleted_at);

  if (linhas.length === 0) {
    if (comUnidade && !item.modalidade) {
      item.status = 'erro';
      item.detalhe = 'Modalidade não identificada (obrigatória para processo novo)';
    } else if (comUnidade) {
      item.status = 'novo';
    } else {
      item.status = 'erro';
      item.detalhe = 'Código não existe na planilha — informe a unidade';
    }
    return;
  }

  const campos = comUnidade ? ['tipo_ingresso', 'unidade_id', 'modalidade', 'periodo', 'link'] : ['periodo', 'link'];
  const mudancas = new Set();
  let inativo = false;
  linhas.forEach(r => {
    campos.forEach(c => { if (item[c] && item[c] !== r[c]) mudancas.add(c === 'tipo_ingresso' ? 'tipo' : c === 'unidade_id' ? 'unidade' : c); });
    if (r.deleted_at) inativo = true;
  });

  item.alvos = linhas.length;
  if (inativo) {
    item.status = 'reativar';
    item.detalhe = 'Está inativo e será reativado';
  } else if (mudancas.size) {
    item.status = 'atualizar';
    item.detalhe = `Muda: ${[...mudancas].join(', ')}`;
  } else {
    item.status = 'inalterado';
  }
  if (!comUnidade) item.detalhe = `${item.detalhe ? item.detalhe + ' · ' : ''}${linhas.length} unidade(s) com este código`;
}

const STATUS_BADGES = {
  novo: '<span class="status-badge status-badge--novo">Novo</span>',
  atualizar: '<span class="status-badge status-badge--update">Atualizar</span>',
  reativar: '<span class="status-badge status-badge--update">Reativar</span>',
  inalterado: '<span class="status-badge status-badge--inalterado">Inalterado</span>',
  erro: '<span class="status-badge status-badge--error">Erro</span>'
};

const podeSalvar = (item) => ['novo', 'atualizar', 'reativar'].includes(item.status);

function renderPreview() {
  const area = $('previewArea');
  const tbody = $('previewBody');

  if (parsedLinks.length === 0) {
    area.classList.add('hidden');
    showFeedback('Nenhum processo encontrado no texto. Confira se cada título começa com o código e é seguido do link.', 'error');
    return;
  }

  area.classList.remove('hidden');
  tbody.innerHTML = parsedLinks.map((p, idx) => {
    const salvavel = podeSalvar(p);
    const avisos = (p.avisos || []).map(a => `<div class="preview-warning">⚠ ${esc(a)}</div>`).join('');
    const detalhe = p.detalhe ? `<div class="preview-detail">${esc(p.detalhe)}</div>` : '';
    const linkCell = p.link
      ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">Abrir</a>`
      : '—';

    return `
      <tr class="${p.status === 'erro' ? 'row--error' : ''}">
        <td class="col-check"><input type="checkbox" class="preview-check" data-idx="${idx}" ${salvavel && p.incluir ? 'checked' : ''} ${salvavel ? '' : 'disabled'} /></td>
        <td class="font-bold">${esc(p.codigo)}</td>
        <td>
          <input type="text" class="unit-input" list="unitOptions" data-idx="${idx}" value="${esc(p.unidade_id)}" placeholder="todas com o código" />
          <div class="preview-detail">${p.unidade_id ? esc(nomeUnidade(p.unidade_id)) : 'Todas as unidades com este código'}</div>
        </td>
        <td>${esc(p.tipo_ingresso || '—')} / ${esc(p.modalidade || '—')}</td>
        <td>${esc(p.periodo || '—')}</td>
        <td>${linkCell}</td>
        <td>${STATUS_BADGES[p.status] || ''}${detalhe}${avisos}</td>
      </tr>
    `;
  }).join('');

  const contagem = parsedLinks.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});
  const partes = [
    contagem.novo && `${contagem.novo} novo(s)`,
    contagem.atualizar && `${contagem.atualizar} para atualizar`,
    contagem.reativar && `${contagem.reativar} para reativar`,
    contagem.inalterado && `${contagem.inalterado} inalterado(s)`,
    contagem.erro && `${contagem.erro} com erro`
  ].filter(Boolean);
  $('previewSummary').textContent = `${parsedLinks.length} processo(s) lido(s): ${partes.join(', ')}.`;
  $('previewSelectAll').checked = parsedLinks.some(p => podeSalvar(p) && p.incluir);
}

function onUnitInputChange(input) {
  const item = parsedLinks[Number(input.dataset.idx)];
  if (!item) return;

  const valor = input.value.trim();
  if (!valor) {
    item.unidade_id = '';
    item.novaUnidade = '';
  } else {
    const id = unitIndex.get(unitKey(valor));
    item.unidade_id = id || unitKey(valor);
    item.novaUnidade = id ? '' : unitKey(valor);
    if (!id) item.unidadeTexto = valor;
  }
  updateStatus(item);
  renderPreview();
}

async function confirmImport() {
  const selecionados = parsedLinks.filter(p => p.incluir && podeSalvar(p));
  if (selecionados.length === 0) {
    showFeedback('Não há links novos ou modificados selecionados para salvar.', 'info');
    return;
  }

  const unidadesNovas = [...new Set(selecionados.filter(p => p.novaUnidade && p.unidade_id === p.novaUnidade).map(p => p.unidade_id))];
  if (unidadesNovas.length && !confirm(`Estas unidades ainda não existem e serão criadas:\n\n${unidadesNovas.join('\n')}\n\nSe for erro de digitação, cancele e escolha a unidade certa na coluna "Unidade". Continuar?`)) {
    return;
  }

  const itens = selecionados.map(p => ({
    codigo: p.codigo,
    unidade_id: p.unidade_id,
    tipo_ingresso: p.tipo_ingresso,
    modalidade: p.modalidade,
    periodo: p.periodo,
    link: p.link
  }));

  const btn = $('btnConfirmImport');
  btn.disabled = true;
  showLoading(true, `Salvando ${itens.length} link(s)...`);

  const total = { criados: 0, atualizados: 0, reativados: 0, inalterados: 0, erros: [] };
  try {
    for (let i = 0; i < itens.length; i += LOTE_MAXIMO) {
      const r = await apiAdmin('/processos/lote', { method: 'POST', body: { itens: itens.slice(i, i + LOTE_MAXIMO) } });
      total.criados += r.criados || 0;
      total.atualizados += r.atualizados || 0;
      total.reativados += r.reativados || 0;
      total.inalterados += r.inalterados || 0;
      total.erros.push(...(r.erros || []));
    }
  } catch (err) {
    console.error('[admin-links] Erro ao salvar:', err);
    showLoading(false);
    btn.disabled = false;
    showFeedback(`Erro ao salvar: ${err.message}. Nada foi perdido do texto colado; confira e tente de novo.`, 'error');
    await loadData();
    return;
  }

  // A Central de Links guarda cache no navegador por 5 min
  localStorage.removeItem('portal_links_cache');

  showLoading(false);
  btn.disabled = false;

  const resumo = `${total.criados} criado(s), ${total.atualizados} linha(s) atualizada(s), ${total.reativados} reativada(s).`;
  if (total.erros.length) {
    const lista = total.erros.slice(0, 5).map(e => `${e.codigo}${e.unidade_id ? '/' + e.unidade_id : ''}: ${e.motivo}`).join(' | ');
    showFeedback(`${resumo} ${total.erros.length} erro(s): ${lista}`, 'error');
  } else {
    showFeedback(`✅ ${resumo}`, 'success');
    $('importText').value = '';
    parsedLinks = [];
    $('previewArea').classList.add('hidden');
  }

  await loadData();
}

// --------------------------------------------
// Aba 2: Gerenciar, editar link e inativar
// --------------------------------------------
function textoBuscaProcesso(p) {
  return termoBusca([p.codigo, p.unidade_id, nomeUnidade(p.unidade_id), p.tipo_ingresso, p.modalidade, p.periodo, p.link].join(' '));
}

function renderManageLinks() {
  const tbody = $('linksBody');
  const termo = termoBusca($('searchInput').value.trim());
  const mostrarInativos = $('showInactive').checked;

  let lista = currentLinks.filter(p => mostrarInativos || !p.deleted_at);
  if (termo) lista = lista.filter(p => textoBuscaProcesso(p).includes(termo));
  lista = lista.slice().sort((a, b) =>
    nomeUnidade(a.unidade_id).localeCompare(nomeUnidade(b.unidade_id), 'pt-BR') ||
    String(a.codigo).localeCompare(String(b.codigo), 'pt-BR')
  );

  const ativos = currentLinks.filter(p => !p.deleted_at).length;
  $('linksCount').textContent = `${lista.length} exibido(s) · ${ativos} ativo(s) na planilha`;

  $('manageTable').classList.toggle('hidden', lista.length === 0);
  $('emptyState').classList.toggle('hidden', lista.length > 0);
  $('selectAll').checked = false;

  const usoPorCodigo = currentLinks.reduce((acc, p) => {
    if (!p.deleted_at) acc[p.codigo] = (acc[p.codigo] || 0) + 1;
    return acc;
  }, {});

  tbody.innerHTML = lista.map(p => {
    const attrs = `data-codigo="${esc(p.codigo)}" data-unidade="${esc(p.unidade_id)}"`;
    const compartilhado = usoPorCodigo[p.codigo] > 1 ? `<div class="preview-detail">Código usado por ${usoPorCodigo[p.codigo]} unidades</div>` : '';
    const acao = p.deleted_at
      ? `<button class="btn btn--sm" type="button" data-action="reactivate" ${attrs}>Reativar</button>`
      : `<button class="btn btn--sm btn--danger" type="button" data-action="deactivate" ${attrs}>Inativar</button>`;

    return `
      <tr class="${p.deleted_at ? 'row--inactive' : ''}">
        <td class="col-check">${p.deleted_at ? '' : `<input type="checkbox" class="row-checkbox" ${attrs} />`}</td>
        <td class="font-bold">${esc(p.codigo)}</td>
        <td>${esc(nomeUnidade(p.unidade_id))}<div class="preview-detail">${esc(p.unidade_id)}</div></td>
        <td>${esc(p.tipo_ingresso)} / ${esc(p.modalidade || '—')}${compartilhado}</td>
        <td>${esc(p.periodo)}${p.deleted_at ? '<div class="preview-detail">inativo</div>' : ''}</td>
        <td class="link-cell">
          ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : '—'}
          <button class="btn btn--sm" type="button" data-action="edit-link" ${attrs}>Editar</button>
        </td>
        <td>${acao}</td>
      </tr>
    `;
  }).join('');
}

function startEditLink(btn) {
  const { codigo, unidade } = btn.dataset;
  const processo = currentLinks.find(p => p.codigo === codigo && p.unidade_id === unidade);
  if (!processo) return;

  const compartilhado = currentLinks.filter(p => p.codigo === codigo && !p.deleted_at).length;
  const cell = btn.closest('td');
  const attrs = `data-codigo="${esc(codigo)}" data-unidade="${esc(unidade)}"`;
  cell.innerHTML = `
    <div class="link-edit">
      <input type="url" class="search-input link-input" value="${esc(processo.link)}" aria-label="Novo link" />
      ${compartilhado > 1 ? `<label class="manage-toggle"><input type="checkbox" class="link-all" /> Aplicar às ${compartilhado} unidades com o código ${esc(codigo)}</label>` : ''}
      <div class="link-edit__actions">
        <button class="btn btn--sm btn--accent" type="button" data-action="save-link" ${attrs}>Salvar</button>
        <button class="btn btn--sm" type="button" data-action="cancel-edit">Cancelar</button>
      </div>
    </div>
  `;
  cell.querySelector('.link-input').focus();
}

async function saveLink(btn) {
  const { codigo, unidade } = btn.dataset;
  const cell = btn.closest('td');
  const link = cell.querySelector('.link-input').value.trim();
  const todas = cell.querySelector('.link-all')?.checked;

  try {
    const url = new URL(link);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch (e) {
    showFeedback('Informe um link válido começando com https://', 'error');
    return;
  }

  btn.disabled = true;
  showLoading(true, 'Salvando link...');
  try {
    const r = await apiAdmin('/processos/lote', {
      method: 'POST',
      body: { itens: [{ codigo, unidade_id: todas ? '' : unidade, link }] }
    });
    if (r.erros?.length) throw new Error(r.erros[0].motivo);
    localStorage.removeItem('portal_links_cache');
    showFeedback(`✅ Link atualizado (${(r.atualizados || 0) + (r.reativados || 0)} linha(s)).`, 'success');
    await loadData();
  } catch (err) {
    btn.disabled = false;
    showLoading(false);
    showFeedback(`Erro ao salvar link: ${err.message}`, 'error');
  }
}

async function alterarStatus(itens, ativo) {
  const acao = ativo ? 'reativar' : 'inativar';
  showLoading(true, `${ativo ? 'Reativando' : 'Inativando'} ${itens.length} processo(s)...`);
  try {
    const r = await apiAdmin(`/processos/${acao}`, { method: 'POST', body: { itens } });
    localStorage.removeItem('portal_links_cache');
    const falhas = r.naoEncontrados?.length ? ` ${r.naoEncontrados.length} não encontrado(s).` : '';
    showFeedback(`✅ ${r.alterados} processo(s) ${ativo ? 'reativado(s)' : 'inativado(s)'}.${falhas}`, falhas ? 'update' : 'success');
    await loadData();
  } catch (err) {
    showLoading(false);
    showFeedback(`Erro ao ${acao}: ${err.message}`, 'error');
  }
}

async function confirmBulkDelete() {
  const itens = Array.from(document.querySelectorAll('.row-checkbox:checked'))
    .map(c => ({ codigo: c.dataset.codigo, unidade_id: c.dataset.unidade }));

  if (itens.length === 0) {
    showFeedback('Nenhum link selecionado.', 'info');
    return;
  }
  if (!confirm(`Inativar ${itens.length} processo(s)? Eles deixam de aparecer no portal (dá para reativar depois em "Mostrar inativos").`)) {
    return;
  }
  await alterarStatus(itens, false);
}

function logout() {
  localStorage.removeItem('userType');
  localStorage.removeItem('adminPassword');
  auth.signOut().finally(() => { window.location.href = './index.html'; });
}

// --------------------------------------------
// Eventos
// --------------------------------------------
function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  $('btnParse').addEventListener('click', parseText);
  $('btnClear').addEventListener('click', () => {
    $('importText').value = '';
    parsedLinks = [];
    $('previewArea').classList.add('hidden');
  });
  $('btnConfirmImport').addEventListener('click', confirmImport);

  $('previewSelectAll').addEventListener('change', (e) => {
    parsedLinks.forEach(p => { if (podeSalvar(p)) p.incluir = e.target.checked; });
    renderPreview();
  });

  $('previewBody').addEventListener('change', (e) => {
    if (e.target.classList.contains('preview-check')) {
      const item = parsedLinks[Number(e.target.dataset.idx)];
      if (item) item.incluir = e.target.checked;
    } else if (e.target.classList.contains('unit-input')) {
      onUnitInputChange(e.target);
    }
  });

  let buscaTimer = null;
  $('searchInput').addEventListener('input', () => {
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(renderManageLinks, 150);
  });
  $('showInactive').addEventListener('change', renderManageLinks);
  $('btnBulkDelete').addEventListener('click', confirmBulkDelete);

  $('selectAll').addEventListener('change', (e) => {
    document.querySelectorAll('.row-checkbox').forEach(b => { b.checked = e.target.checked; });
  });

  $('linksBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, codigo, unidade } = btn.dataset;

    if (action === 'edit-link') startEditLink(btn);
    else if (action === 'cancel-edit') renderManageLinks();
    else if (action === 'save-link') await saveLink(btn);
    else if (action === 'deactivate') {
      if (confirm(`Inativar o processo ${codigo} da unidade ${nomeUnidade(unidade)}? Ele deixa de aparecer no portal.`)) {
        await alterarStatus([{ codigo, unidade_id: unidade }], false);
      }
    } else if (action === 'reactivate') {
      await alterarStatus([{ codigo, unidade_id: unidade }], true);
    }
  });
}

bindEvents();
