(function () {
  function toast(message) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="m8 12 2.6 2.6L16 9.2" stroke="currentColor" stroke-width="1.8"/></svg>${message}`;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  const fmtDateLong = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtDateShort = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('pt-BR');
  };

  window.UI = { toast, fmtDateLong, fmtDateShort };
})();
