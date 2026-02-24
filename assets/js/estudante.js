(function () {
  DB.seed();
  const currentUser = Guards.guardStudentPage();
  if (!currentUser) return;

  const helloEl = document.getElementById('hello-user');
  const metricCount = document.getElementById('metric-count');
  const metricTime = document.getElementById('metric-time');
  const historyList = document.getElementById('history-list');
  const modal = document.getElementById('studylog-modal');
  const form = document.getElementById('studylog-form');

  helloEl.textContent = `Olá, ${currentUser.name}`;

  const ownLogs = () => DB.getStudyLogs().filter((l) => l.studentId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));

  function renderMetrics(logs) {
    metricCount.textContent = String(logs.length);
    const total = logs.reduce((acc, log) => acc + Number(log.time_minutes || 0), 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    metricTime.textContent = `${h}h${m}m`;
  }

  function emptyCard() {
    return `<article class="log-card empty-card"><svg viewBox="0 0 24 24" fill="none"><path d="M3.5 6.5C3.5 5.67 4.17 5 5 5h6c1.05 0 2.07.37 2.88 1.03L15 7v11l-.76-.61A4.6 4.6 0 0 0 11.38 16H5a1.5 1.5 0 0 1-1.5-1.5v-8Z" stroke="currentColor" stroke-width="1.8"/><path d="M20.5 6.5c0-.83-.67-1.5-1.5-1.5h-6c-1.05 0-2.07.37-2.88 1.03L9 7v11l.76-.61A4.6 4.6 0 0 1 12.62 16H19a1.5 1.5 0 0 0 1.5-1.5v-8Z" stroke="currentColor" stroke-width="1.8"/></svg><p>Nenhum registro ainda. Comece a estudar!</p></article>`;
  }

  function renderHistory() {
    const logs = ownLogs();
    renderMetrics(logs);

    if (!logs.length) {
      historyList.innerHTML = emptyCard();
      return;
    }

    historyList.innerHTML = logs.map((log) => `
      <article class="log-card">
        <div class="log-top">
          <span class="pill">${log.discipline}</span>
          <span>${UI.fmtDateLong(log.date)}</span>
          <span>${log.time_minutes}min</span>
          <button class="delete-btn" type="button" data-del="${log.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 11v6m4-6v6M7 7l1 13h8l1-13M9 7l1-2h4l1 2" stroke="currentColor" stroke-width="1.8"/></svg></button>
        </div>
        <p class="log-content">${log.content}</p>
        <p class="log-difficulty">Dificuldade: ${log.difficulties}</p>
      </article>
    `).join('');
  }

  document.getElementById('logout-btn').addEventListener('click', () => { Auth.logout(); window.location.href = './login.html'; });
  document.getElementById('open-modal').addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      id: DB.uid(),
      studentId: currentUser.id,
      date: document.getElementById('log-date').value,
      discipline: document.getElementById('log-discipline').value.trim(),
      content: document.getElementById('log-content').value.trim(),
      time_minutes: Number(document.getElementById('log-time').value),
      difficulties: document.getElementById('log-difficulties').value.trim()
    };

    if (!payload.date || !payload.discipline || !payload.content || !payload.time_minutes || !payload.difficulties) {
      UI.toast('Preencha todos os campos.');
      return;
    }

    const logs = DB.getStudyLogs();
    logs.push(payload);
    DB.setStudyLogs(logs);
    form.reset();
    modal.classList.add('hidden');
    UI.toast('Registro salvo!');
    renderHistory();
  });

  historyList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const logId = btn.dataset.del;
    const logs = DB.getStudyLogs();
    const target = logs.find((l) => l.id === logId);
    if (!target || target.studentId !== currentUser.id) {
      UI.toast('Acesso negado.');
      return;
    }
    DB.setStudyLogs(logs.filter((l) => l.id !== logId));
    renderHistory();
    UI.toast('Registro excluído.');
  });

  renderHistory();
})();
