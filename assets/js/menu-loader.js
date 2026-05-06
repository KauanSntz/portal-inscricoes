// assets/js/menu-loader.js
(() => {
  'use strict';

  // Mapeamento de páginas para os links do menu
  const menuLinks = [
    { href: './portal.html', text: 'Portal', dataAction: null },
    { href: './links.html', text: 'Central de Links', dataAction: null },
    { href: null, text: 'Pesquisar cursos', dataAction: 'open-global-search' },
    { href: null, text: 'Pesquisar preços', dataAction: 'open-prices-menu' },
    { href: null, text: 'Cursos Técnicos', dataAction: 'open-cursos-tecnicos' },
    { href: './diario.html', text: 'Diário de Bordo', dataAction: null },
    // Submenu Informações será tratado separadamente
  ];

  const userType = localStorage.getItem('userType') || 'comum';
  if (userType === 'super_admin') {
    menuLinks.splice(2, 0, { href: './admin-links.html', text: 'Gerenciar Links', dataAction: null });
  }

  const menuHTML = `
    <div class="side-menu" id="sideMenu">
      <div class="side-menu-header">
        <button class="menu-close" id="menuClose">✕</button>
      </div>
      <nav class="side-menu-nav">
        ${menuLinks.map(link => link.href 
          ? `<a class="menu-link" href="${link.href}">${link.text}</a>` 
          : `<button class="menu-link" type="button" data-action="${link.dataAction}">${link.text}</button>`
        ).join('')}

        <!-- Submenu Informações -->
        <div class="menu-item-with-submenu">
          <button class="menu-link submenu-toggle">
            Informações <span class="arrow">▼</span>
          </button>
          <div class="submenu">
            <button class="menu-link submenu-link" data-action="open-setores">Setores</button>
            <button class="menu-link submenu-link" data-action="open-coordenadores">Coordenação</button>
          </div>
        </div>

        <!-- Submenu Tema -->
        <div class="menu-item-with-submenu">
          <button class="menu-link submenu-toggle">
            Tema <span class="arrow">▼</span>
          </button>
          <div class="submenu">
            <button class="menu-link submenu-link theme-option" data-theme="blue">Padrão</button>
            <button class="menu-link submenu-link theme-option" data-theme="pink">Rosa</button>
            <button class="menu-link submenu-link theme-option" data-theme="red">Vermelho</button>
            <button class="menu-link submenu-link theme-option" data-theme="green">Verde</button>
            <button class="menu-link submenu-link theme-option" data-theme="yellow">Amarelo</button>
            <button class="menu-link submenu-link theme-option" data-theme="orange">Laranja</button>
            <button class="menu-link submenu-link theme-option" data-theme="copa">⚽ Copa (Escuro)</button>
          </div>
        </div>

        <a class="menu-link" href="./tickets.html" id="tickets-link" style="display:none;">
          Tickets 
          <span id="tickets-badge" class="badge" style="background-color:#dc2626;">0</span>
          <span id="tickets-andamento-badge" class="badge" style="background-color:#f59e0b; margin-left:0.2rem;">0</span>
        </a>

        <button class="menu-link" id="logout-btn-menu" onclick="logout()" style="display:none;">Sair</button>

        <div class="user-profile" id="user-profile" style="display: none;">
          <div class="user-info">
            <span class="user-name" id="user-name"></span>
            <span class="user-email" id="user-email"></span>
          </div>
        </div>
      </nav>
    </div>
    <div class="menu-overlay" id="menuOverlay"></div>
  `;

  // Insere o menu no início do main (ou onde preferir)
  const main = document.querySelector('main.app-shell');
  if (main) {
    main.insertAdjacentHTML('afterbegin', menuHTML);
  }

  // Marca o link ativo baseado na URL atual
  const currentPage = window.location.pathname.split('/').pop() || 'portal.html';
  document.querySelectorAll('.menu-link[href]').forEach(link => {
    if (link.getAttribute('href') === `./${currentPage}`) {
      link.classList.add('is-active');
    }
  });
})();