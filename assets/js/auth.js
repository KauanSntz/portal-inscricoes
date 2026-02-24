(function () {
  const roles = { estudante: 'estudante', professor: 'professor' };

  const normalizeEmail = (email) => email.trim().toLowerCase();
  const getCurrentUser = () => {
    const session = DB.getSession();
    if (!session?.userId) return null;
    return DB.getUsers().find((u) => u.id === session.userId) || null;
  };

  function register({ name, email, password, role }) {
    if (!name?.trim() || !email?.trim() || !password?.trim() || !role) return { ok: false, message: 'Preencha todos os campos.' };
    const users = DB.getUsers();
    if (users.some((u) => u.email === normalizeEmail(email))) return { ok: false, message: 'Email já cadastrado.' };
    users.push({ id: DB.uid(), name: name.trim(), email: normalizeEmail(email), password: password.trim(), role });
    DB.setUsers(users);
    return { ok: true };
  }

  function login({ email, password }) {
    const user = DB.getUsers().find((u) => u.email === normalizeEmail(email) && u.password === password);
    if (!user) return { ok: false, message: 'Credenciais inválidas.' };
    DB.setSession({ userId: user.id });
    return { ok: true, user };
  }

  function logout() { DB.clearSession(); }

  window.Auth = { roles, getCurrentUser, register, login, logout };
})();
