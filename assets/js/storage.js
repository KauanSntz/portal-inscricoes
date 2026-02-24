(function () {
  const KEYS = {
    users: 'users',
    studyLogs: 'studyLogs',
    session: 'session'
  };

  const parse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const getUsers = () => parse(localStorage.getItem(KEYS.users), []) || [];
  const setUsers = (users) => localStorage.setItem(KEYS.users, JSON.stringify(users));
  const getStudyLogs = () => parse(localStorage.getItem(KEYS.studyLogs), []) || [];
  const setStudyLogs = (logs) => localStorage.setItem(KEYS.studyLogs, JSON.stringify(logs));
  const getSession = () => parse(localStorage.getItem(KEYS.session), null);
  const setSession = (session) => localStorage.setItem(KEYS.session, JSON.stringify(session));
  const clearSession = () => localStorage.removeItem(KEYS.session);

  function seed() {
    if (getUsers().length || getStudyLogs().length) return;
    const teacherId = uid();
    const studentId = uid();
    setUsers([
      { id: teacherId, name: 'Paulo Professor', email: 'prof@example.com', password: '123456', role: 'professor' },
      { id: studentId, name: 'Ana Estudante', email: 'ana@example.com', password: '123456', role: 'estudante' }
    ]);
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    setStudyLogs([
      { id: uid(), studentId, date: new Date(now.getTime() - 1 * day).toISOString().slice(0, 10), discipline: 'Lógica de programação', content: 'Estruturas condicionais e repetição.', time_minutes: 30, difficulties: 'Um if dentro de outro if.' },
      { id: uid(), studentId, date: new Date(now.getTime() - 3 * day).toISOString().slice(0, 10), discipline: 'Matemática', content: 'Equações e porcentagem.', time_minutes: 45, difficulties: 'Questões de regra de três composta.' },
      { id: uid(), studentId, date: new Date(now.getTime() - 8 * day).toISOString().slice(0, 10), discipline: 'Português', content: 'Interpretação de texto.', time_minutes: 40, difficulties: 'Localizar tese principal rapidamente.' }
    ]);
  }

  window.DB = { KEYS, uid, getUsers, setUsers, getStudyLogs, setStudyLogs, getSession, setSession, clearSession, seed };
})();
