// assets/js/pos-graduacao-modal.js
// Modal de Pós-Graduação - carregado em todas as páginas
(() => {
  'use strict';

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:3000'
    : 'https://portal-inscricoes.onrender.com';

  const TABS = [
    { key: 'semana', label: 'Semana' },
    { key: 'sabado', label: 'Sabado' },
    { key: 'ao-vivo', label: 'Ao Vivo' },
    { key: 'ead', label: 'EAD' },
  ];

  const DURACOES_EAD = ['6', '9', '12', '15'];

  const norm = window.norm || ((s) =>
    String(s || '').trim().toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, ''));

  const debounce = window.debounce || ((fn, ms = 150) => {
    let t = null;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  });

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
    } catch { }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }

  function buildCopyMsgSimples(item) {
    return [
      `Curso de ${item.curso} – Pós-graduação | Duração: ${item.duracao} meses`,
      `Investimento:`,
      `• 1ª Mensalidade: ${item.primeiraMsg}`,
      `• Valor sem Desconto: ${item.valorIntegral}`,
      `• Valor com bolsa: ${item.valorBolsa}`,
      `• Valor com 10% de Desconto de pontualidade: ${item.pontualidade}`
    ].join('\n');
  }

  function buildCopyMsgEAD(item, duracao) {
    const valMap = { '6': item.meses6, '9': item.meses9, '12': item.meses12, '15': item.meses15 };
    const pontMap = { '6': item.pontualidade6, '9': item.pontualidade9, '12': item.pontualidade12, '15': item.pontualidade15 };
    const val = valMap[duracao] || item.meses15;
    const pont = pontMap[duracao] || item.pontualidade15;
    return [
      `Curso de ${item.curso} – Pós-graduação | Duração: ${duracao} meses`,
      `Investimento:`,
      `• 1ª Mensalidade: ${item.taxaMatricula}`,
      `• A partir da 2ª mensalidade: ${val}`,
      `• Valor com 10% de Desconto de pontualidade: ${pont}`
    ].join('\n');
  }

  const posGraduacaoModal = (() => {
    let overlay = null;
    let searchInput, duracaoRow, listEl, emptyEl;
    let isOpen = false, lastFocus = null;
    let currentTab = 'semana';
    let currentDuracao = 'todos';
    let allData = {};
    let currentData = [];

    const lockScroll = () => {
      document.body.style.overflow = 'hidden';
    };
    const unlockScroll = () => {
      document.body.style.overflow = '';
    };

    async function loadTab(tab) {
      if (allData[tab]) return allData[tab];
      try {
        const res = await fetch(`${API_BASE}/pos-graduacao/${tab}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        allData[tab] = json.data || [];
        return allData[tab];
      } catch (e) {
        console.error('[PosGrad] Erro:', tab, e);
        return [];
      }
    }

    function renderList() {
      if (!listEl) return;
      const q = norm(searchInput ? searchInput.value : '');
      let items = currentData.slice();

      if (q) {
        items = items.filter(item => norm(item.curso || '').includes(q));
      }

      // Filtro de duracao para EAD
      if (currentTab === 'ead' && currentDuracao !== 'todos') {
        items = items.filter(item => {
          const valMap = { '6': item.meses6, '9': item.meses9, '12': item.meses12, '15': item.meses15 };
          return valMap[currentDuracao] && valMap[currentDuracao].trim() !== '';
        });
      }

      listEl.innerHTML = '';

      if (!items.length) {
        emptyEl.hidden = false;
        emptyEl.textContent = q ? 'Nenhum curso encontrado.' : 'Nenhum dado disponivel.';
        return;
      }
      emptyEl.hidden = true;

      items.forEach(item => {
        const card = document.createElement('article');
        card.className = 'info-card curso-card';

        if (currentTab === 'ead') {
          const pontMap = { '6': item.pontualidade6, '9': item.pontualidade9, '12': item.pontualidade12, '15': item.pontualidade15 };
          const durAtual = currentDuracao !== 'todos' ? currentDuracao : '15';
          const valMap = { '6': item.meses6, '9': item.meses9, '12': item.meses12, '15': item.meses15 };
          card.innerHTML = `
            <div class="curso-header">
              <h4 class="curso-nome">${item.curso}</h4>
              <span class="curso-duracao-badge">${durAtual} meses</span>
            </div>
            <div class="curso-valores">
              <div class="primeira-mensalidade">1a Mensalidade: ${item.taxaMatricula}</div>
              <div>Mensalidade: ${valMap[durAtual] || item.meses15}</div>
              <div>Com 10% pontualidade: ${pontMap[durAtual] || item.pontualidade15}</div>
            </div>
          `;
          const copyBtn = document.createElement('button');
          copyBtn.className = 'info-copy-btn';
          copyBtn.textContent = 'Copiar mensagem';
          copyBtn.addEventListener('click', async () => {
            const ok = await copyText(buildCopyMsgEAD(item, durAtual));
            copyBtn.textContent = ok ? 'Copiado!' : 'Erro';
            setTimeout(() => copyBtn.textContent = 'Copiar mensagem', 1400);
          });
          card.appendChild(copyBtn);
        } else {
          card.innerHTML = `
            <div class="curso-header">
              <h4 class="curso-nome">${item.curso}</h4>
              <span class="curso-duracao-badge">${item.duracao} meses</span>
            </div>
            <div class="curso-valores">
              <div class="primeira-mensalidade">1a Mensalidade: ${item.primeiraMsg}</div>
              <div>Sem Desconto: ${item.valorIntegral}</div>
              <div>Com bolsa: ${item.valorBolsa}</div>
              <div>Com pontualidade: ${item.pontualidade}</div>
            </div>
          `;
          const copyBtn = document.createElement('button');
          copyBtn.className = 'info-copy-btn';
          copyBtn.textContent = 'Copiar mensagem';
          copyBtn.addEventListener('click', async () => {
            const ok = await copyText(buildCopyMsgSimples(item));
            copyBtn.textContent = ok ? 'Copiado!' : 'Erro';
            setTimeout(() => copyBtn.textContent = 'Copiar mensagem', 1400);
          });
          card.appendChild(copyBtn);
        }

        listEl.appendChild(card);
      });
    }

    async function switchTab(tab) {
      currentTab = tab;
      currentDuracao = 'todos';

      overlay.querySelectorAll('.pos-tab-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.tab === tab);
      });

      if (duracaoRow) duracaoRow.style.display = tab === 'ead' ? 'flex' : 'none';

      overlay.querySelectorAll('.pos-dur-btn').forEach(b =>
        b.classList.toggle('is-active', b.dataset.dur === 'todos'));

      emptyEl.hidden = false;
      emptyEl.textContent = 'Carregando...';
      listEl.innerHTML = '';

      currentData = await loadTab(tab);
      renderList();
    }

    function ensure() {
      if (overlay) return;

      overlay = document.createElement('div');
      overlay.className = 'modal-overlay info-overlay';
      overlay.id = 'pos-graduacao-modal';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = '';

      const modal = document.createElement('div');
      modal.className = 'modal info-modal';
      modal.style.maxWidth = '860px';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      // Cabecalho
      const head = document.createElement('div');
      head.className = 'modal-head info-head';
      const titleEl = document.createElement('div');
      titleEl.className = 'modal-title info-title';
      titleEl.textContent = 'Pos-Graduacao';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close info-close';
      closeBtn.type = 'button';
      closeBtn.textContent = '\u00d7';
      closeBtn.addEventListener('click', () => close());
      head.appendChild(titleEl);
      head.appendChild(closeBtn);

      // Corpo
      const body = document.createElement('div');
      body.className = 'modal-body info-body';
      body.style.overflowY = 'auto';

      // Abas de navegação principal
      const navTabsRow = document.createElement('div');
      navTabsRow.className = 'pos-tabs-row';
      navTabsRow.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem; border-bottom: 1px solid var(--line-soft); padding-bottom: 0.5rem;';

      const btnValores = document.createElement('button');
      btnValores.className = 'pos-tab-btn tab is-active';
      btnValores.type = 'button';
      btnValores.textContent = 'Valores';

      const btnInfo = document.createElement('button');
      btnInfo.className = 'pos-tab-btn tab';
      btnInfo.type = 'button';
      btnInfo.textContent = 'Informações Pós';

      navTabsRow.appendChild(btnValores);
      navTabsRow.appendChild(btnInfo);

      // Valores Container
      const valoresContainer = document.createElement('div');
      valoresContainer.id = 'pos-valores-container';

      // Abas de Filtro de Valores
      const tabsRow = document.createElement('div');
      tabsRow.className = 'pos-tabs-row';
      tabsRow.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.75rem;';
      TABS.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'pos-tab-btn tab' + (t.key === 'semana' ? ' is-active' : '');
        btn.type = 'button';
        btn.dataset.tab = t.key;
        btn.textContent = t.label;
        btn.addEventListener('click', () => switchTab(t.key));
        tabsRow.appendChild(btn);
      });

      // Filtro duracao EAD
      duracaoRow = document.createElement('div');
      duracaoRow.style.cssText = 'display:none; gap:0.5rem; flex-wrap:wrap; align-items:center; margin-bottom:0.75rem;';
      const durLabel = document.createElement('span');
      durLabel.textContent = 'Duração:';
      durLabel.style.fontSize = '0.85rem';
      duracaoRow.appendChild(durLabel);

      const todosBtn = document.createElement('button');
      todosBtn.className = 'pos-dur-btn tag is-active';
      todosBtn.type = 'button';
      todosBtn.dataset.dur = 'todos';
      todosBtn.textContent = 'Todos';
      todosBtn.addEventListener('click', () => {
        currentDuracao = 'todos';
        duracaoRow.querySelectorAll('.pos-dur-btn').forEach(b =>
          b.classList.toggle('is-active', b.dataset.dur === 'todos'));
        renderList();
      });
      duracaoRow.appendChild(todosBtn);

      DURACOES_EAD.forEach(d => {
        const btn = document.createElement('button');
        btn.className = 'pos-dur-btn tag';
        btn.type = 'button';
        btn.dataset.dur = d;
        btn.textContent = `${d} meses`;
        btn.addEventListener('click', () => {
          currentDuracao = d;
          duracaoRow.querySelectorAll('.pos-dur-btn').forEach(b =>
            b.classList.toggle('is-active', b.dataset.dur === d));
          renderList();
        });
        duracaoRow.appendChild(btn);
      });

      // Busca
      const searchRow = document.createElement('div');
      searchRow.className = 'search-row info-search-row';
      searchInput = document.createElement('input');
      searchInput.className = 'search-input info-search';
      searchInput.type = 'search';
      searchInput.placeholder = 'Buscar curso de pós-graduação...';
      searchInput.addEventListener('input', debounce(() => renderList(), 200));
      searchRow.appendChild(searchInput);

      listEl = document.createElement('div');
      listEl.className = 'info-grid pos-grid-2col';

      emptyEl = document.createElement('div');
      emptyEl.className = 'empty info-empty';
      emptyEl.textContent = 'Carregando...';

      valoresContainer.appendChild(tabsRow);
      valoresContainer.appendChild(duracaoRow);
      valoresContainer.appendChild(searchRow);
      valoresContainer.appendChild(emptyEl);
      valoresContainer.appendChild(listEl);

      // Info Container
      const infoContainer = document.createElement('div');
      infoContainer.id = 'pos-info-container';
      infoContainer.style.display = 'none';
      infoContainer.innerHTML = `
        <div class="info-card" style="margin-bottom: 1rem; padding: 1.25rem;">
          <h4 style="margin-top:0; margin-bottom:0.75rem; color:var(--accent); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            📅 Pontualidade
          </h4>
          <p style="margin:0; font-size: 0.95rem;">dia 10</p>
        </div>
        
        <div class="info-card" style="margin-bottom: 1rem; padding: 1.25rem;">
          <h4 style="margin-top:0; margin-bottom:1rem; color:var(--accent); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            📍 Pós-Graduação Presencial
          </h4>
          <ul style="margin-top:0; padding-left:1.5rem; margin-bottom:1.25rem; font-size: 0.95rem; line-height: 1.5;">
            <li style="margin-bottom: 0.25rem;"><strong>1ª Mensalidade:</strong> R$ 99,90</li>
            <li><strong>Horário:</strong> 18h às 22h</li>
          </ul>
          
          <div class="pos-info-box">
            <p style="margin:0 0 0.5rem 0; font-weight: 600; color: var(--accent);">Sede e Sul:</p>
            <ul style="margin:0; padding-left:1.5rem; font-size: 0.9rem;">
              <li>Dias: Terça e Quinta</li>
            </ul>
          </div>
          
          <div class="pos-info-box">
            <p style="margin:0 0 0.5rem 0; font-weight: 600; color: var(--accent);">Leste:</p>
            <ul style="margin:0; padding-left:1.5rem; font-size: 0.9rem;">
              <li>Dias: Segunda e Quarta</li>
            </ul>
          </div>
          
          <div class="pos-info-box" style="margin-bottom:0;">
            <p style="margin:0 0 0.5rem 0; font-weight: 600; color: var(--accent);">Sábado <span style="font-weight: normal; font-size: 0.85rem;">(todas as unidades, se houver turma formada)</span>:</p>
            <ul style="margin:0; padding-left:1.5rem; font-size: 0.9rem;">
              <li>Horário: 08h às 17h</li>
            </ul>
          </div>
        </div>

        <div class="info-card" style="padding: 1.25rem;">
          <h4 style="margin-top:0; margin-bottom:1rem; color:var(--accent); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            💻 Pós-Graduação EAD
          </h4>
          <ul style="margin-top:0; padding-left:1.5rem; margin-bottom:1.25rem; font-size: 0.95rem; line-height: 1.5;">
            <li style="margin-bottom: 0.5rem;"><strong>1ª Mensalidade:</strong> R$ 49,90</li>
            <li><strong>O aluno escolhe a duração do curso:</strong>
              <ul style="margin-top:0.5rem; margin-bottom:0.25rem; padding-left: 1.25rem; list-style-type: square;">
                <li style="margin-bottom: 0.25rem;">6 meses <span style="color: var(--accent); font-size: 0.85rem;">→ TCC opcional</span></li>
                <li style="margin-bottom: 0.25rem;">9 meses</li>
                <li style="margin-bottom: 0.25rem;">12 meses <span style="color: var(--accent); font-size: 0.85rem;">→ TCC opcional</span></li>
                <li>15 meses</li>
              </ul>
            </li>
          </ul>
          
          <div class="pos-info-box" style="font-size: 0.9rem; border-left: 3px solid var(--accent);">
            <p style="margin:0;"><strong>Ao Vivo:</strong> modalidade complementar (informativo apenas)</p>
          </div>
        </div>
      `;

      // Lógica de Alternância de Abas Principais
      btnValores.addEventListener('click', () => {
        btnValores.classList.add('is-active');
        btnInfo.classList.remove('is-active');
        valoresContainer.style.display = 'block';
        infoContainer.style.display = 'none';
      });

      btnInfo.addEventListener('click', () => {
        btnInfo.classList.add('is-active');
        btnValores.classList.remove('is-active');
        valoresContainer.style.display = 'none';
        infoContainer.style.display = 'block';
      });

      // Armazenamos as referências das abas no objeto modal para uso futuro no open()
      posGraduacaoModal._btnValores = btnValores;
      posGraduacaoModal._btnInfo = btnInfo;

      body.appendChild(navTabsRow);
      body.appendChild(valoresContainer);
      body.appendChild(infoContainer);
      modal.appendChild(head);
      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) close();
      });
    }

    async function open(tab = 'valores') {
      ensure();

      if (tab === 'informacoes' && posGraduacaoModal._btnInfo) {
        posGraduacaoModal._btnInfo.click();
      } else if (posGraduacaoModal._btnValores) {
        posGraduacaoModal._btnValores.click();
      }

      lastFocus = document.activeElement;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      isOpen = true;
      lockScroll();
      if (searchInput) searchInput.value = '';
      await switchTab('semana');
      if (searchInput) searchInput.focus();
    }

    function close() {
      if (!overlay || !isOpen) return;
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      isOpen = false;
      unlockScroll();
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    return { open, close };
  })();

  window.posGraduacaoModal = posGraduacaoModal;

})();