// ============================================
// Admin Unidades - Lógica CRUD
// ============================================

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000' : 'https://portal-inscricoes.onrender.com';
let unidades = [];
let deleteTargetId = '';

// --------------------------------------------
// Inicialização
// --------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  // Simulação de permissão (fake)
  // No futuro, substituir pela verificação real via Firebase Auth
  const userType = localStorage.getItem('userType') || 'comum';
  
  if (userType !== 'super_admin') {
    showAccessDenied();
    return;
  }

  setupMenu();
  loadUnidades();
  setupFormValidation();
}

// --------------------------------------------
// Menu (herdado do app.js)
// --------------------------------------------
function setupMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');

  if (menuToggle && sideMenu) {
    menuToggle.addEventListener('click', () => sideMenu.classList.add('is-open'));
    menuClose?.addEventListener('click', () => sideMenu.classList.remove('is-open'));
    menuOverlay?.addEventListener('click', () => sideMenu.classList.remove('is-open'));
  }

  // Theme switcher
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.body.dataset.theme = theme;
      localStorage.setItem('theme', theme);
    });
  });

  // Carregar tema salvo
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) document.body.dataset.theme = savedTheme;
}

// --------------------------------------------
// Acesso
// --------------------------------------------
function showAccessDenied() {
  document.getElementById('adminContent').style.display = 'none';
  document.getElementById('accessDenied').style.display = 'block';
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sideMenu').classList.add('is-open');
  });
}

// --------------------------------------------
// API - Buscar Unidades
// --------------------------------------------
async function loadUnidades() {
  showLoading(true);
  
  try {
    const res = await fetch(`${API_URL}/unidades`);
    const data = await res.json();
    
    // Filtrar apenas ativas para display inicial
    unidades = data.data?.filter(u => u.ativo === 'SIM') || [];
    // Manter todas para uso interno (validação)
    data.data?.forEach(u => {
      if (!unidades.find(x => x.unidade_id === u.unidade_id)) {
        unidades.push(u);
      }
    });
    
    renderUnidades(unidades);
  } catch (err) {
    showFeedback('Erro ao carregar unidades', 'error');
    console.error(err);
  } finally {
    showLoading(false);
  }
}

// --------------------------------------------
// Render
// --------------------------------------------
function renderUnidades(list) {
  const tbody = document.getElementById('unidadesBody');
  const empty = document.getElementById('emptyState');
  const table = document.getElementById('tableContainer');

  // Ordenar por ordem
  list.sort((a, b) => parseInt(a.ordem || 99) - parseInt(b.ordem || 99));

  if (list.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'flex';
    tbody.innerHTML = '';
    return;
  }

  table.style.display = 'block';
  empty.style.display = 'none';

  tbody.innerHTML = list.map(u => `
    <tr data-id="${u.unidade_id}">
      <td class="id-cell">${u.unidade_id}</td>
      <td>${u.nome}</td>
      <td><span class="badge badge--${u.tipo}">${formatTipo(u.tipo)}</span></td>
      <td>${u.ordem || '-'}</td>
      <td>${u.ativo === 'SIM' ? '<span class="status-badge status--active">Ativo</span>' : '<span class="status-badge status--inactive">Inativo</span>'}</td>
      <td class="actions-cell">
        <button class="btn btn--small" onclick="editUnidade('${u.unidade_id}')">Editar</button>
        <button class="btn btn--small btn--danger" onclick="confirmDelete('${u.unidade_id}')">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function formatTipo(tipo) {
  const map = {
    'capital': 'Capital',
    'polo_proprio': 'Polo Próprio',
    'polo': 'Polo',
    'outro': 'Outro'
  };
  return map[tipo] || tipo;
}

// --------------------------------------------
// Busca/Filtro
// --------------------------------------------
function filterUnidades() {
  const term = document.getElementById('searchInput').value.toLowerCase();
  
  if (!term) {
    renderUnidades(unidades.filter(u => u.ativo === 'SIM'));
    return;
  }

  const filtered = unidades.filter(u => 
    u.ativo === 'SIM' && (
      u.unidade_id.includes(term) || 
      u.nome.toLowerCase().includes(term) ||
      u.tipo.includes(term)
    )
  );
  
  renderUnidades(filtered);
}

// --------------------------------------------
// Modal - Formulário
// --------------------------------------------
function openModal(unidadeId = null) {
  const modal = document.getElementById('formModal');
  const title = document.getElementById('modalTitle');
  const submitBtn = document.getElementById('submitBtn');
  const form = document.getElementById('unidadeForm');

  // Limpar erros
  clearErrors();

  if (unidadeId) {
    // Modo edição
    const u = unidades.find(x => x.unidade_id === unidadeId);
    if (!u) return;

    title.textContent = 'Editar Unidade';
    submitBtn.textContent = 'Salvar';
    document.getElementById('editId').value = unidadeId;
    document.getElementById('unidadeId').value = u.unidade_id;
    document.getElementById('unidadeId').readOnly = true;
    document.getElementById('unidadeNome').value = u.nome;
    document.getElementById('unidadeTipo').value = u.tipo;
    document.getElementById('unidadeOrdem').value = u.ordem || '';
    document.getElementById('unidadeAtivo').value = u.ativo === 'SIM' ? 'SIM' : 'NÃO';
  } else {
    // Modo criação
    title.textContent = 'Nova Unidade';
    submitBtn.textContent = 'Criar';
    form.reset();
    document.getElementById('editId').value = '';
    document.getElementById('unidadeId').readOnly = false;
    
    // Auto-sugerir ordem
    const maxOrdem = Math.max(...unidades.map(u => parseInt(u.ordem) || 0), 0);
    document.getElementById('unidadeOrdem').value = maxOrdem + 1;
  }

  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
}

function closeModal() {
  const modal = document.getElementById('formModal');
  modal.classList.remove('is-open');
  document.body.classList.remove('modal-open');
}

// --------------------------------------------
// Validação do Formulário
// --------------------------------------------
function setupFormValidation() {
  const idInput = document.getElementById('unidadeId');
  
  // Gerar ID automaticamente a partir do nome
  const nomeInput = document.getElementById('unidadeNome');
  nomeInput?.addEventListener('input', () => {
    if (!document.getElementById('editId').value) {
      const slug = nomeInput.value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      idInput.value = slug;
    }
  });

  // Validar unicidade do ID
  idInput?.addEventListener('blur', () => {
    const editId = document.getElementById('editId').value;
    const currentId = idInput.value;
    
    // Se editando, ignorar o próprio registro
    const exists = unidades.find(u => u.unidade_id === currentId && u.unidade_id !== editId);
    
    const errorEl = document.getElementById('idError');
    if (exists) {
      errorEl.textContent = 'ID já existe!';
      idInput.classList.add('input-error');
    } else {
      errorEl.textContent = '';
      idInput.classList.remove('input-error');
    }
  });
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

function validateForm() {
  clearErrors();
  let valid = true;

  const id = document.getElementById('unidadeId').value.trim();
  const nome = document.getElementById('unidadeNome').value.trim();
  const editId = document.getElementById('editId').value;

  if (!id) {
    document.getElementById('idError').textContent = 'ID é obrigatório';
    valid = false;
  }

  if (!nome) {
    document.getElementById('nomeError').textContent = 'Nome é obrigatório';
    valid = false;
  }

  // Verificar duplicata
  const exists = unidades.find(u => u.unidade_id === id && u.unidade_id !== editId);
  if (exists) {
    document.getElementById('idError').textContent = 'ID já existe!';
    valid = false;
  }

  return valid;
}

// --------------------------------------------
// Submit - Criar/Atualizar
// --------------------------------------------
async function submitForm(e) {
  e.preventDefault();
  
  if (!validateForm()) return;

  const editId = document.getElementById('editId').value;
  const isEdit = !!editId;

  const data = {
    unidade_id: document.getElementById('unidadeId').value.trim(),
    nome: document.getElementById('unidadeNome').value.trim().toUpperCase(),
    tipo: document.getElementById('unidadeTipo').value,
    ordem: document.getElementById('unidadeOrdem').value || '99',
    ativo: document.getElementById('unidadeAtivo').value
  };

  const btn = document.getElementById('submitBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const url = isEdit 
      ? `${API_URL}/admin/unidades/${editId}`
      : `${API_URL}/admin/unidades`;
    
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': localStorage.getItem('adminPassword') || 'admin123'
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      showFeedback(result.message || 'Erro ao salvar', 'error');
      return;
    }

    showFeedback(isEdit ? 'Unidade atualizada!' : 'Unidade criada!', 'success');
    closeModal();
    loadUnidades();

  } catch (err) {
    showFeedback('Erro ao conectar com o servidor', 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// --------------------------------------------
// Editar
// --------------------------------------------
function editUnidade(id) {
  openModal(id);
}

// --------------------------------------------
// Excluir (confirmação)
// --------------------------------------------
function confirmDelete(id) {
  console.log('[confirmDelete] ID:', id);
  deleteTargetId = id;
  const u = unidades.find(x => x.unidade_id === id);
  console.log('[confirmDelete] Unidade encontrada:', u);
  document.getElementById('confirmMessage').textContent = 
    `Tem certeza que deseja excluir "${u?.nome || id}"?`;
  
  document.getElementById('confirmModal').classList.add('is-open');
  document.body.classList.add('modal-open');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('is-open');
  document.body.classList.remove('modal-open');
  deleteTargetId = '';
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
  console.log('[confirmDeleteBtn] deleteTargetId:', deleteTargetId);
  if (!deleteTargetId) {
    console.log('[confirmDeleteBtn] deleteTargetId vazio!');
    return;
  }

  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Excluindo...';

  try {
    console.log('[confirmDeleteBtn] Enviando DELETE para:', `${API_URL}/admin/unidades/${deleteTargetId}`);
    const res = await fetch(`${API_URL}/admin/unidades/${deleteTargetId}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': localStorage.getItem('adminPassword') || 'admin123' }
    });

    console.log('[confirmDeleteBtn] Status:', res.status);
    const result = await res.json();
    console.log('[confirmDeleteBtn] Result:', result);

    if (!res.ok) {
      showFeedback(result.message || 'Erro ao excluir', 'error');
      return;
    }

    showFeedback('Unidade excluída!', 'success');
    closeConfirm();
    loadUnidades();

  } catch (err) {
    showFeedback('Erro ao conectar com o servidor', 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Excluir';
  }
});

// --------------------------------------------
// Feedback/Loading
// --------------------------------------------
function showFeedback(message, type = 'info') {
  const el = document.getElementById('feedback');
  el.textContent = message;
  el.className = `feedback feedback--${type}`;
  el.classList.remove('hidden');

  setTimeout(() => el.classList.add('hidden'), 3000);
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
  document.getElementById('tableContainer').style.display = show ? 'none' : 'block';
}

// --------------------------------------------
// Utilitários
// --------------------------------------------
function logout() {
  localStorage.removeItem('userType');
  localStorage.removeItem('adminPassword');
  window.location.href = './login.html';
}

// Inicializar senha admin (para testes)
if (!localStorage.getItem('adminPassword')) {
  localStorage.setItem('adminPassword', 'admin123');
}