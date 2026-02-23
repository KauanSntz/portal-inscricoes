(function () {
  StorageDB.seedDemoData();
  const currentUser = Guards.guardTeacherPage();
  if (!currentUser) return;

  document.getElementById('teacher-greeting').textContent = `Olá, ${currentUser.name} (professor)`;

  const studentList = document.getElementById('student-list');
  const selectedStudentLogs = document.getElementById('selected-student-logs');
  const lowFrequencyList = document.getElementById('low-frequency-list');
  const recentDifficultiesList = document.getElementById('recent-difficulties-list');

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('pt-BR');
  }

  function getStudents() {
    return StorageDB.getUsers().filter((user) => user.role === 'estudante');
  }

  function getLogsByStudent(studentId) {
    return StorageDB.getStudyLogs()
      .filter((log) => log.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderStudents() {
    const students = getStudents();
    if (!students.length) {
      studentList.innerHTML = '<div class="list-item"><p class="muted">Sem alunos cadastrados.</p></div>';
      return;
    }

    studentList.innerHTML = students
      .map(
        (student) => `
      <button class="btn list-item student-trigger" data-student-id="${student.id}" type="button">
        <strong>${student.name}</strong><br>
        <span class="muted">${student.email}</span>
      </button>`
      )
      .join('');
  }

  function renderStudentLogs(studentId) {
    const students = getStudents();
    const student = students.find((item) => item.id === studentId);
    if (!student) {
      selectedStudentLogs.innerHTML = '<p class="muted">Aluno não encontrado.</p>';
      return;
    }

    const logs = getLogsByStudent(student.id);
    if (!logs.length) {
      selectedStudentLogs.innerHTML = `<div class="list-item"><p class="muted">${student.name} ainda não possui registros.</p></div>`;
      return;
    }

    selectedStudentLogs.innerHTML = logs
      .map(
        (log) => `
      <div class="list-item">
        <strong>${formatDate(log.date)} · ${log.discipline}</strong>
        <div>Tempo: ${log.time_minutes} min</div>
        <div>Conteúdo: ${log.content}</div>
        <div>Dificuldades: ${log.difficulties}</div>
        <div>Próximos passos: ${log.next_steps}</div>
      </div>`
      )
      .join('');
  }

  function renderLowFrequency() {
    const students = getStudents();
    const logs = StorageDB.getStudyLogs();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    const flagged = students.filter((student) => {
      const count = logs.filter((log) => {
        const when = new Date(`${log.date}T00:00:00`);
        return log.studentId === student.id && when >= start;
      }).length;
      return count < 3;
    });

    if (!flagged.length) {
      lowFrequencyList.innerHTML = '<div class="list-item"><p class="muted">Nenhum aluno em baixa frequência.</p></div>';
      return;
    }

    lowFrequencyList.innerHTML = flagged
      .map(
        (student) => `
      <div class="list-item">
        <strong>${student.name}</strong>
        <span class="pill">baixa frequência</span>
      </div>`
      )
      .join('');
  }

  function renderRecentDifficulties() {
    const students = getStudents();
    const studentById = Object.fromEntries(students.map((s) => [s.id, s.name]));
    const logs = StorageDB.getStudyLogs()
      .slice()
      .sort((a, b) => {
        const ad = `${a.date} ${a.id}`;
        const bd = `${b.date} ${b.id}`;
        return bd.localeCompare(ad);
      })
      .slice(0, 20)
      .filter((log) => log.difficulties && log.difficulties.trim());

    if (!logs.length) {
      recentDifficultiesList.innerHTML = '<div class="list-item"><p class="muted">Sem dificuldades registradas.</p></div>';
      return;
    }

    recentDifficultiesList.innerHTML = logs
      .map(
        (log) => `
      <div class="list-item">
        <strong>${studentById[log.studentId] || 'Aluno'}</strong>: ${log.difficulties}
      </div>`
      )
      .join('');
  }

  document.getElementById('logout-btn').addEventListener('click', function () {
    Auth.logout();
    window.location.href = './login.html';
  });

  studentList.addEventListener('click', function (event) {
    const button = event.target.closest('[data-student-id]');
    if (!button) return;
    renderStudentLogs(button.dataset.studentId);
  });

  renderStudents();
  renderLowFrequency();
  renderRecentDifficulties();
})();
