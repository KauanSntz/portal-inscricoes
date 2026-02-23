(function () {
  StorageDB.seedDemoData();
  const currentUser = Guards.guardStudentPage();
  if (!currentUser) return;

  const greeting = document.getElementById('student-greeting');
  const newLogSection = document.getElementById('new-log-section');
  const historySection = document.getElementById('history-section');
  const historyList = document.getElementById('history-list');
  const feedback = document.getElementById('save-feedback');
  const form = document.getElementById('studylog-form');

  greeting.textContent = `Olá, ${currentUser.name} (estudante)`;

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('pt-BR');
  }

  function renderHistory() {
    const logs = StorageDB.getStudyLogs()
      .filter((log) => log.studentId === currentUser.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (!logs.length) {
      historyList.innerHTML = '<div class="list-item"><p class="muted">Sem registros ainda.</p></div>';
      return;
    }

    historyList.innerHTML = logs
      .map(
        (log) => `
      <div class="list-item">
        <div class="item-header">
          <strong>${formatDate(log.date)} · ${log.discipline}</strong>
          <button class="btn btn-danger" data-delete-id="${log.id}" type="button">Excluir</button>
        </div>
        <div>Tempo: ${log.time_minutes} min</div>
        <div>Dificuldades: ${log.difficulties}</div>
        <div>Próximos passos: ${log.next_steps}</div>
      </div>`
      )
      .join('');
  }

  document.getElementById('open-new-log').addEventListener('click', function () {
    newLogSection.classList.remove('hidden');
  });

  document.getElementById('open-history').addEventListener('click', function () {
    historySection.classList.remove('hidden');
    renderHistory();
  });

  document.getElementById('logout-btn').addEventListener('click', function () {
    Auth.logout();
    window.location.href = './login.html';
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const payload = {
      id: StorageDB.uid(),
      studentId: currentUser.id,
      date: document.getElementById('log-date').value,
      discipline: document.getElementById('log-discipline').value.trim(),
      content: document.getElementById('log-content').value.trim(),
      time_minutes: Number(document.getElementById('log-time').value),
      difficulties: document.getElementById('log-difficulties').value.trim(),
      next_steps: document.getElementById('log-next-steps').value.trim()
    };

    if (
      !payload.date ||
      !payload.discipline ||
      !payload.content ||
      !payload.time_minutes ||
      !payload.difficulties ||
      !payload.next_steps
    ) {
      feedback.textContent = 'Preencha todos os campos.';
      return;
    }

    const logs = StorageDB.getStudyLogs();
    logs.push(payload);
    StorageDB.saveStudyLogs(logs);

    feedback.textContent = 'Salvo';
    form.reset();
    renderHistory();
  });

  historyList.addEventListener('click', function (event) {
    const button = event.target.closest('[data-delete-id]');
    if (!button) return;

    const logId = button.dataset.deleteId;
    const logs = StorageDB.getStudyLogs();
    const target = logs.find((log) => log.id === logId);

    if (!target || target.studentId !== currentUser.id) {
      alert('Você só pode excluir seus próprios registros.');
      return;
    }

    StorageDB.saveStudyLogs(logs.filter((log) => log.id !== logId));
    renderHistory();
  });
})();
