(function () {
  DB.seed();
  const currentUser = Guards.guardProfessorPage();
  if (!currentUser) return;

  document.getElementById('hello-prof').textContent = `Prof. ${currentUser.name}`;

  const mStudents = document.getElementById('m-students');
  const mLogs = document.getElementById('m-logs');
  const mLow = document.getElementById('m-low');
  const lowChips = document.getElementById('low-chips');
  const accordion = document.getElementById('students-accordion');
  const recentEl = document.getElementById('recent-difficulties');

  const students = () => DB.getUsers().filter((u) => u.role === 'estudante');
  const logs = () => DB.getStudyLogs();
  const logsByStudent = (id) => logs().filter((l) => l.studentId === id).sort((a, b) => b.date.localeCompare(a.date));
  const countLast7Days = (studentId) => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return logs().filter((l) => l.studentId === studentId && new Date(`${l.date}T00:00:00`) >= start).length;
  };

  function renderMetrics() {
    const s = students();
    const allLogs = logs();
    const low = s.filter((stu) => countLast7Days(stu.id) < 3);
    mStudents.textContent = s.length;
    mLogs.textContent = allLogs.length;
    mLow.textContent = low.length;

    if (!low.length) {
      lowChips.innerHTML = '<span class="chip">Nenhum aluno</span>';
    } else {
      lowChips.innerHTML = low.map((stu) => `<span class="chip">${stu.name} (${countLast7Days(stu.id)})</span>`).join('');
    }
  }

  function renderAccordion() {
    const s = students();
    if (!s.length) {
      accordion.innerHTML = '<article class="log-card">Sem alunos cadastrados.</article>';
      return;
    }

    accordion.innerHTML = s.map((stu) => {
      const list = logsByStudent(stu.id);
      const renderedLogs = list.length
        ? list.map((log) => `<article class="log-card"><div class="log-top"><span class="pill">${log.discipline}</span><span>${UI.fmtDateLong(log.date)}</span><span>${log.time_minutes}min</span></div><p class="log-content">${log.content}</p><p class="log-difficulty">${log.difficulties}</p></article>`).join('')
        : '<article class="log-card">Sem registros.</article>';
      return `
        <article class="accordion-item" data-acc="${stu.id}">
          <div class="acc-head">
            <div class="acc-left">
              <span class="avatar">${stu.name.charAt(0).toUpperCase()}</span>
              <div>
                <div class="acc-name">${stu.name}</div>
                <div class="acc-sub">${list.length} registros</div>
              </div>
            </div>
            <span>⌄</span>
          </div>
          <div class="acc-body">${renderedLogs}</div>
        </article>
      `;
    }).join('');
  }

  function renderRecentDifficulties() {
    const mapNames = Object.fromEntries(students().map((s) => [s.id, s.name]));
    const recent = logs().slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
    if (!recent.length) {
      recentEl.innerHTML = '<article class="log-card">Sem dificuldades recentes.</article>';
      return;
    }
    recentEl.innerHTML = recent.map((log) => `
      <article class="log-card">
        <div class="log-top">${mapNames[log.studentId] || 'Aluno'} • ${log.discipline} • ${UI.fmtDateShort(log.date)}</div>
        <p class="log-content">${log.difficulties}</p>
      </article>
    `).join('');
  }

  document.getElementById('logout-btn').addEventListener('click', () => { Auth.logout(); window.location.href = './login.html'; });
  accordion.addEventListener('click', (e) => {
    const head = e.target.closest('.acc-head');
    if (!head) return;
    head.parentElement.classList.toggle('open');
  });

  renderMetrics();
  renderAccordion();
  renderRecentDifficulties();
})();
