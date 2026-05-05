// ============================================
// Admin Links - Importação e Gerenciamento
// ============================================

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000' : 'https://portal-inscricoes.onrender.com';
let currentLinks = [];
let parsedLinks = [];

const KNOWN_UNITS = [
  'SEDE', 'LESTE', 'SUL', 'NORTE', 'OESTE', 'COMPENSA', 
  'BOA VISTA', 'COARI', 'ITACOATIARA', 'MANACAPURU', 
  'MANOA', 'PARINTINS', 'PARÁ', 'SANTARÉM', 'TABATINGA', 'TEFÉ'
];

document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  const userType = localStorage.getItem('userType') || 'admin';
  
  if (userType !== 'super_admin') {
    showAccessDenied();
    return;
  }

  await loadCurrentLinks();
}

function showAccessDenied() {
  document.getElementById('adminContent').style.display = 'none';
  document.getElementById('accessDenied').style.display = 'block';
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('is-active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('is-active'));
  
  document.getElementById(tabId).classList.add('is-active');
  event.currentTarget.classList.add('is-active');

  if(tabId === 'manageTab') {
    renderManageLinks();
  }
}

function showLoading(show, text = 'Processando...') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function showFeedback(message, type = 'info') {
  const el = document.getElementById('feedback');
  el.textContent = message;
  el.className = `feedback feedback--${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// --------------------------------------------
// Carregar Links do Banco
// --------------------------------------------
async function loadCurrentLinks() {
  showLoading(true, 'Carregando banco de dados...');
  try {
    const res = await fetch(`${API_URL}/processos?limit=1000`);
    const data = await res.json();
    currentLinks = (data.data || []).filter(p => !p.deleted_at);
  } catch (err) {
    showFeedback('Erro ao carregar links do banco', 'error');
    console.error(err);
  } finally {
    showLoading(false);
    const appLoading = document.getElementById('app-loading');
    if (appLoading) appLoading.style.display = 'none';
  }
}

// --------------------------------------------
// Aba 1: Parsing e Preview
// --------------------------------------------
function extractUnidadeModalidade(texto) {
  texto = texto.trim();
  let unidade = 'NÃO IDENTIFICADA';
  let modalidade = texto;

  for (const u of KNOWN_UNITS) {
    if (texto.startsWith(u + ' ') || texto === u) {
      unidade = u;
      modalidade = texto.substring(u.length).trim();
      break;
    }
  }

  // Se a unidade for PARÁ, o regex pode pegar "PARÁ PRESENCIAL", a lógica acima já resolve
  if (!modalidade) modalidade = 'OUTRO';
  return { unidade, modalidade };
}

function parseText() {
  const text = document.getElementById('importText').value;
  if (!text.trim()) {
    showFeedback('Cole algum texto para processar.', 'error');
    return;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  parsedLinks = [];

  let i = 0;
  while (i < lines.length) {
    const l1 = lines[i];
    
    // Verifica se a linha começa com número (código)
    if (/^\d+/.test(l1)) {
      const l2 = (i + 1 < lines.length) ? lines[i+1] : '';
      
      if (l2.startsWith('http')) {
        // Regex: (Codigo) (Tipo) - (Unidade e Modalidade) - (Periodo)
        // Ex: 3424   VESTIBULAR ONLINE - SEDE PRESENCIAL - 2026/2
        const match = l1.match(/^(\d+)\s+(.+?)\s*-\s*(.+?)\s*-\s*(\d{4}\/\d)/);
        
        if (match) {
           const codigo = match[1];
           const tipo_ingresso = match[2].replace(' ONLINE', '').trim();
           const descStr = match[3];
           const periodo = match[4];
           const link = l2;

           const { unidade, modalidade } = extractUnidadeModalidade(descStr);

           // Verificar se já existe no banco
           const existente = currentLinks.find(c => String(c.codigo) === String(codigo));
           let status = 'novo';
           if (existente) {
             status = existente.link !== link ? 'atualizar' : 'inalterado';
           }

           parsedLinks.push({
             codigo,
             tipo_ingresso,
             unidade_id: unidade,
             modalidade,
             periodo,
             link,
             status
           });
        }
        i++; // pular a linha do link
      }
    }
    i++;
  }

  renderPreview();
}

function renderPreview() {
  const tbody = document.getElementById('previewBody');
  const area = document.getElementById('previewArea');

  if (parsedLinks.length === 0) {
    area.style.display = 'none';
    showFeedback('Nenhum link válido encontrado no texto.', 'error');
    return;
  }

  area.style.display = 'block';
  tbody.innerHTML = parsedLinks.map(p => {
    let badge = '';
    if (p.status === 'novo') badge = '<span class="status-badge status-badge--novo">Novo</span>';
    else if (p.status === 'atualizar') badge = '<span class="status-badge status-badge--update">Atualizar</span>';
    else badge = '<span class="status-badge status-badge--inalterado">Inalterado</span>';

    return `
      <tr>
        <td class="font-bold">${p.codigo}</td>
        <td>${p.unidade_id}</td>
        <td>${p.tipo_ingresso} / ${p.modalidade}</td>
        <td>${p.periodo}</td>
        <td>${badge}</td>
      </tr>
    `;
  }).join('');
}

async function confirmImport() {
  const toProcess = parsedLinks.filter(p => p.status === 'novo' || p.status === 'atualizar');
  
  if (toProcess.length === 0) {
    showFeedback('Não há links novos ou modificados para salvar.', 'info');
    return;
  }

  const btn = document.getElementById('btnConfirmImport');
  btn.disabled = true;
  showLoading(true, `Salvando ${toProcess.length} links... Isso pode demorar.`);

  const password = localStorage.getItem('adminPassword') || 'admin123';
  let successCount = 0;
  let errorCount = 0;

  for (const item of toProcess) {
    try {
      const isUpdate = item.status === 'atualizar';
      const url = isUpdate ? `${API_URL}/admin/processos/${item.codigo}` : `${API_URL}/admin/processos`;
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify(item)
      });

      if (res.ok) successCount++;
      else errorCount++;
      
      // Delay to avoid hitting Google Sheets API rate limits
      await new Promise(r => setTimeout(r, 600));

    } catch (err) {
      errorCount++;
    }
  }

  await loadCurrentLinks(); // recarrega o banco
  
  // Invalidar cache da Central de Links para que novos links apareçam
  localStorage.removeItem('portal_links_cache');
  console.log('[admin-links] Cache da Central de Links invalidado');

  showLoading(false);
  btn.disabled = false;
  
  document.getElementById('importText').value = '';
  document.getElementById('previewArea').style.display = 'none';
  
  if (errorCount === 0) {
    showFeedback(`${successCount} links processados com sucesso!`, 'success');
  } else {
    showFeedback(`${successCount} salvos, ${errorCount} erros.`, 'update');
  }
}

// --------------------------------------------
// Aba 2: Gerenciar e Inativar
// --------------------------------------------
function renderManageLinks(filterTerm = '') {
  const tbody = document.getElementById('linksBody');
  const emptyState = document.getElementById('emptyState');
  const tableContainer = tbody.closest('.table-container');
  const linksCount = document.getElementById('linksCount');
  const term = filterTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let list = currentLinks;
  if (term) {
    list = list.filter(p => {
      return (p.codigo && p.codigo.includes(term)) ||
             (p.unidade_id && p.unidade_id.toLowerCase().includes(term)) ||
             (p.modalidade && p.modalidade.toLowerCase().includes(term));
    });
  }

  linksCount.textContent = `${list.length} link${list.length !== 1 ? 's' : ''} encontrado${list.length !== 1 ? 's' : ''}`;

  if (list.length === 0) {
    tableContainer.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  tableContainer.style.display = 'block';
  emptyState.style.display = 'none';

  tbody.innerHTML = list.map(p => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${p.codigo}" /></td>
      <td class="font-bold">${p.codigo}</td>
      <td>${p.unidade_id}</td>
      <td>${p.tipo_ingresso} / ${p.modalidade}</td>
      <td>${p.periodo}</td>
      <td>
        <button class="btn btn--small btn--danger" onclick="deleteSingle('${p.codigo}')">Inativar</button>
      </td>
    </tr>
  `).join('');
}

function filterLinks() {
  const term = document.getElementById('searchInput').value;
  renderManageLinks(term);
}

function toggleSelectAll(checkbox) {
  const boxes = document.querySelectorAll('.row-checkbox');
  boxes.forEach(b => b.checked = checkbox.checked);
}

async function deleteSingle(codigo) {
  if (!confirm(`Tem certeza que deseja inativar o processo ${codigo}? O Portal deixará de exibir a modalidade se não houver links suficientes.`)) {
    return;
  }
  await executeDelete([codigo]);
}

async function confirmBulkDelete() {
  const checked = document.querySelectorAll('.row-checkbox:checked');
  const codigos = Array.from(checked).map(c => c.value);

  if (codigos.length === 0) {
    showFeedback('Nenhum link selecionado.', 'info');
    return;
  }

  if (!confirm(`Tem certeza que deseja inativar ${codigos.length} processo(s)?`)) {
    return;
  }

  await executeDelete(codigos);
}

async function executeDelete(codigos) {
  showLoading(true, `Inativando ${codigos.length} processo(s)...`);
  const password = localStorage.getItem('adminPassword') || 'admin123';
  
  let successCount = 0;
  for (const codigo of codigos) {
    try {
      const res = await fetch(`${API_URL}/admin/processos/${codigo}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password }
      });
      if (res.ok) successCount++;
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(e);
    }
  }

  await loadCurrentLinks();
  // Invalidar cache da Central de Links
  localStorage.removeItem('portal_links_cache');
  renderManageLinks(document.getElementById('searchInput').value);
  showLoading(false);
  showFeedback(`${successCount} processo(s) inativado(s) com sucesso.`, 'success');
  document.getElementById('selectAll').checked = false;
}

function logout() {
  localStorage.removeItem('userType');
  localStorage.removeItem('adminPassword');
  window.location.href = './login.html';
}
