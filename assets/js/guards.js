(function () {
  const redirectToRoleHome = (role) => {
    window.location.href = role === Auth.roles.professor ? './professor.html' : './estudante.html';
  };

  function requireAuth() {
    const user = Auth.getCurrentUser();
    if (!user) {
      window.location.href = './login.html';
      return null;
    }
    return user;
  }

  function guardLoginLikePage() {
    const user = Auth.getCurrentUser();
    if (user) redirectToRoleHome(user.role);
  }

  function guardStudentPage() {
    const user = requireAuth();
    if (!user) return null;
    if (user.role !== Auth.roles.estudante) {
      redirectToRoleHome(user.role);
      return null;
    }
    return user;
  }

  function guardProfessorPage() {
    const user = requireAuth();
    if (!user) return null;
    if (user.role !== Auth.roles.professor) {
      redirectToRoleHome(user.role);
      return null;
    }
    return user;
  }

  window.Guards = { redirectToRoleHome, requireAuth, guardLoginLikePage, guardStudentPage, guardProfessorPage };
})();
