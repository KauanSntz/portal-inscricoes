(function () {
  const DB_KEYS = {
    users: 'de_users',
    logs: 'de_studylogs',
    session: 'de_session'
  };

  function readCollection(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  function writeCollection(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function getUsers() {
    return readCollection(DB_KEYS.users);
  }

  function saveUsers(users) {
    writeCollection(DB_KEYS.users, users);
  }

  function getStudyLogs() {
    return readCollection(DB_KEYS.logs);
  }

  function saveStudyLogs(logs) {
    writeCollection(DB_KEYS.logs, logs);
  }

  function getSession() {
    const raw = localStorage.getItem(DB_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  }

  function saveSession(session) {
    localStorage.setItem(DB_KEYS.session, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(DB_KEYS.session);
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function seedDemoData() {
    const hasUsers = getUsers().length > 0;
    const hasLogs = getStudyLogs().length > 0;
    if (hasUsers || hasLogs) return;

    const profId = uid();
    const studentId = uid();

    const users = [
      { id: profId, name: 'Prof. Carlos', email: 'prof@example.com', password: '123456', role: 'professor' },
      { id: studentId, name: 'Ana Estudante', email: 'ana@example.com', password: '123456', role: 'estudante' }
    ];

    const today = new Date();
    const day = 24 * 60 * 60 * 1000;

    const logs = [
      {
        id: uid(),
        studentId,
        date: new Date(today.getTime() - day).toISOString().slice(0, 10),
        discipline: 'Direito Constitucional',
        content: 'Controle de constitucionalidade e revisão de casos.',
        time_minutes: 90,
        difficulties: 'Fixar diferenças entre ADI e ADC.',
        next_steps: 'Resolver 20 questões e revisar mapa mental.'
      },
      {
        id: uid(),
        studentId,
        date: new Date(today.getTime() - day * 3).toISOString().slice(0, 10),
        discipline: 'Redação',
        content: 'Estrutura argumentativa para temas de concursos.',
        time_minutes: 70,
        difficulties: 'Concluir a introdução mais rapidamente.',
        next_steps: 'Treinar 2 introduções em 30 minutos.'
      },
      {
        id: uid(),
        studentId,
        date: new Date(today.getTime() - day * 8).toISOString().slice(0, 10),
        discipline: 'Direito Penal',
        content: 'Teoria do crime e causas excludentes.',
        time_minutes: 60,
        difficulties: 'Memorizar classificações doutrinárias.',
        next_steps: 'Criar flashcards dos conceitos principais.'
      }
    ];

    saveUsers(users);
    saveStudyLogs(logs);
  }

  window.StorageDB = {
    DB_KEYS,
    uid,
    getUsers,
    saveUsers,
    getStudyLogs,
    saveStudyLogs,
    getSession,
    saveSession,
    clearSession,
    seedDemoData
  };
})();
