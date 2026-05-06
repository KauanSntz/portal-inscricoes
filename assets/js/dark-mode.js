// assets/js/dark-mode.js
// Apenas Light/Dark Mode no botão
(() => {
  const toggle = document.getElementById('dark-mode-toggle');
  if (!toggle) return;
  
  const modeText = toggle.querySelector('.mode-text');
  const modeIcon = toggle.querySelector('.mode-icon');
  
  const applyMode = (isDark) => {
    // Remove dark mode e copa-theme (não devem conflitar)
    document.body.classList.remove('dark-mode');
    
    if (isDark) {
      document.body.classList.add('dark-mode');
      if (modeText) modeText.textContent = 'Claro';
      if (modeIcon) modeIcon.textContent = '☀️';
    } else {
      if (modeText) modeText.textContent = 'Escuro';
      if (modeIcon) modeIcon.textContent = '🌙';
    }
  };
  
  const saved = localStorage.getItem('darkMode') === 'true';
  applyMode(saved);
  
  toggle.addEventListener('click', () => {
    const isNowDark = !document.body.classList.contains('dark-mode');
    applyMode(isNowDark);
    localStorage.setItem('darkMode', isNowDark);
  });
})();