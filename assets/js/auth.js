(function () {
  function findUserByEmail(email) {
    return StorageDB.getUsers().find((user) => user.email === email.toLowerCase()) || null;
  }

  function getCurrentUser() {
    const session = StorageDB.getSession();
    if (!session || !session.userId) return null;
    return StorageDB.getUsers().find((u) => u.id === session.userId) || null;
  }

  function registerUser(payload) {
    const name = payload.name.trim();
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;
    const role = payload.role;

    if (!name || !email || !password || !role) {
      return { ok: false, message: 'Preencha todos os campos.' };
    }

    if (findUserByEmail(email)) {
      return { ok: false, message: 'Email já cadastrado.' };
    }

    const users = StorageDB.getUsers();
    users.push({ id: StorageDB.uid(), name, email, password, role });
    StorageDB.saveUsers(users);
    return { ok: true };
  }

  function login(email, password) {
    const user = StorageDB.getUsers().find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password
    );

    if (!user) {
      return { ok: false, message: 'Credenciais inválidas.' };
    }

    StorageDB.saveSession({ userId: user.id });
    return { ok: true, user };
  }

  function logout() {
    StorageDB.clearSession();
  }

  window.Auth = {
    getCurrentUser,
    registerUser,
    login,
    logout
  };
})();
