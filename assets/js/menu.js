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

  // Troca de tema
  const themeOptions = document.querySelectorAll('.theme-option');
  const savedTheme = localStorage.getItem('selectedTheme') || 'blue';
  document.body.classList.add(`theme-${savedTheme}`);

  themeOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const theme = opt.dataset.theme;
      document.body.classList.forEach(cls => {
        if (cls.startsWith('theme-')) {
          document.body.classList.remove(cls);
        }
      });
      document.body.classList.add(`theme-${theme}`);
      localStorage.setItem('selectedTheme', theme);
      
      const themeSubmenu = opt.closest('.submenu');
      if (themeSubmenu) {
        themeSubmenu.classList.remove('is-open');
        themeSubmenu.previousElementSibling?.classList.remove('is-open');
      }
    });
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