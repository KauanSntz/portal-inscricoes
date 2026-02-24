(function () {
  DB.seed();
  Guards.guardLoginLikePage();

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const result = Auth.login({
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    });
    if (!result.ok) {
      UI.toast(result.message);
      return;
    }
    Guards.redirectToRoleHome(result.user.role);
  });
})();
