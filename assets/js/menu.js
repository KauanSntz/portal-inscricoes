// assets/js/menu.js
(() => {
  "use strict";

  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuClose = document.getElementById('menuClose');
  const menuOverlay = document.getElementById('menuOverlay');

  if (!menuToggle || !sideMenu || !menuClose || !menuOverlay) return;

  function openMenu() {
    sideMenu.classList.add('is-open');
    menuOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  // Fecha o menu ao clicar fora dele
document.addEventListener('click', (e) => {
  const sideMenu = document.getElementById('sideMenu');
  const menuToggle = document.getElementById('menuToggle');
  
  if (!sideMenu || !menuToggle) return;
  
  // Se o menu estiver aberto e o clique NÃO foi no menu nem no botão de abrir
  if (sideMenu.classList.contains('is-open') && 
      !sideMenu.contains(e.target) && 
      !menuToggle.contains(e.target)) {
    closeMenu();
  }
});

  function closeMenu() {
    sideMenu.classList.remove('is-open');
    menuOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  menuToggle.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  menuOverlay.addEventListener('click', closeMenu);

  // Submenus genéricos
  const submenuItems = document.querySelectorAll('.menu-item-with-submenu');
  
  submenuItems.forEach(item => {
    const toggle = item.querySelector('.submenu-toggle');
    const submenu = item.querySelector('.submenu');
    
    if (toggle && submenu) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        submenuItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.querySelector('.submenu-toggle')?.classList.remove('is-open');
            otherItem.querySelector('.submenu')?.classList.remove('is-open');
          }
        });
        toggle.classList.toggle('is-open');
        submenu.classList.toggle('is-open');
      });
    }
  });

  // Ações dos submenus
  const submenuLinks = document.querySelectorAll('.submenu-link');
  submenuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
       closeMenu();
      const action = link.dataset.action;
      if (action === 'open-setores') {
        if (window.setoresModal) window.setoresModal.open();
      } else if (action === 'open-coordenadores') {
        if (window.coordenadoresModal) window.coordenadoresModal.open();
      }
    });
  });

  // Listener específico para o botão de Cursos Técnicos (os outros são tratados globalmente)
const cursosTecnicosBtn = document.querySelector('.menu-link[data-action="open-cursos-tecnicos"]');
if (cursosTecnicosBtn) {
  cursosTecnicosBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.cursosTecnicosModal) {
      window.cursosTecnicosModal.open();
      closeMenu();
    }
  });
}

  // Elementos que NÃO fecham o menu
  const keepOpenSelectors = [
    '.submenu-toggle',
    '.submenu button',
    '.user-profile'
  ];

  sideMenu.querySelectorAll('a, button').forEach(el => {
    const shouldKeepOpen = keepOpenSelectors.some(selector => el.matches(selector));
    if (!shouldKeepOpen) {
      el.addEventListener('click', closeMenu);
    }
  });
})();