// assets/js/theme-manager.js
// Gerencia apenas tema Copa (modo escuro)
(() => {
  // Aplicar Copa ao carregar (padrão escuro)
  const savedTheme = localStorage.getItem('theme') || 'copa';
  applyTheme(savedTheme);
  
  // Listener para botão Copa
  document.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('.theme-option');
    if (!themeBtn) return;
      
    const theme = themeBtn.dataset.theme;
    applyTheme(theme);
  });
  
  function applyTheme(theme) {
    // Remove todas as classes de tema
    document.body.classList.remove('dark-mode', 'copa-theme', 
      'theme-blue', 'theme-pink', 'theme-red', 'theme-green', 'theme-yellow', 'theme-orange');
    
    if (theme === 'copa') {
      document.body.classList.add('copa-theme');
    }
    
    localStorage.setItem('theme', theme);
  }
})();
