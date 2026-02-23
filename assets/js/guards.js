(function () {
  function redirectByRole(role) {
    if (role === 'estudante') {
      window.location.href = './estudante.html';
      return;
    }
    window.location.href = './professor.html';
  }

  function requireAuth() {
    const user = Auth.getCurrentUser();
    if (!user) {
      window.location.href = './login.html';
      return null;
    }
    return user;
  }

  function guardLoginPage() {
    const user = Auth.getCurrentUser();
    if (user) redirectByRole(user.role);
  }

  function guardStudentPage() {
    const user = requireAuth();
    if (!user) return null;
    if (user.role !== 'estudante') {
      redirectByRole(user.role);
      return null;
    }
    return user;
  }

  function guardTeacherPage() {
    const user = requireAuth();
    if (!user) return null;
    if (user.role !== 'professor') {
      redirectByRole(user.role);
      return null;
    }
    return user;
  }

  window.Guards = {
    redirectByRole,
    requireAuth,
    guardLoginPage,
    guardStudentPage,
    guardTeacherPage
  };
})();
