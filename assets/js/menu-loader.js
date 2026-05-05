// assets/js/menu-loader.js
(() => {
  "use strict";

  const container = document.getElementById('menu-container');
  if (!container) return;

  const currentPage = window.location.pathname.split('/').pop() || 'portal.html';

  fetch('./menu-content.html')
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      // Marca o link ativo baseado na página atual
      const links = container.querySelectorAll('a.menu-link');
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        const page = href.split('/').pop();
        if (page === currentPage) {
          link.classList.add('is-active');
        }
      });

      // Dispara evento para que menu.js possa inicializar
      document.dispatchEvent(new CustomEvent('menu-loaded'));
    })
    .catch(err => {
      console.error('[menu-loader] Falha ao carregar menu:', err);
    });
})();
