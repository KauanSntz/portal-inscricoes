// assets/js/theme-manager.js
// Gerencia todos os temas (coloridos + Copa)
(() => {
  const THEMES = {
    'blue':   { class: 'theme-blue' },
    'pink':   { class: 'theme-pink' },
    'red':    { class: 'theme-red' },
    'green':  { class: 'theme-green' },
    'yellow': { class: 'theme-yellow' },
    'orange': { class: 'theme-orange' },
    'copa':   { class: 'copa-theme' },
  };

  function applyTheme(name) {
    // Remove todas as classes de tema
    Object.values(THEMES).forEach(t => document.body.classList.remove(t.class));
    document.body.classList.remove('dark-mode');
    
    // Aplica o tema selecionado
    if (THEMES[name]) {
      document.body.classList.add(THEMES[name].class);
    }
    
    // Salva no localStorage (unificado)
    localStorage.setItem('theme', name);
    localStorage.removeItem('selectedTheme');
  }

  // Aplica tema salvo ou Copa como padrão
  const savedTheme = localStorage.getItem('theme') || 'copa';
  applyTheme(savedTheme);

  // Listener global para botões de tema
  document.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('.theme-option');
    if (!themeBtn) return;
    
    const theme = themeBtn.dataset.theme;
    applyTheme(theme);
    
    // Fecha submenu após seleção
    const themeSubmenu = themeBtn.closest('.submenu');
    if (themeSubmenu) {
      themeSubmenu.classList.remove('is-open');
      themeSubmenu.previousElementSibling?.classList.remove('is-open');
    }
  });
})();
