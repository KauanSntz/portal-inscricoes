(function () {
  StorageDB.seedDemoData();
  Guards.guardLoginPage();

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  registerForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const result = Auth.registerUser({
      name: document.getElementById('register-name').value,
      email: document.getElementById('register-email').value,
      password: document.getElementById('register-password').value,
      role: document.getElementById('register-role').value
    });

    if (!result.ok) {
      alert(result.message);
      return;
    }

    registerForm.reset();
    alert('Cadastro realizado com sucesso.');
  });

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const result = Auth.login(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );

    if (!result.ok) {
      alert(result.message);
      return;
    }

    Guards.redirectByRole(result.user.role);
  });
})();
