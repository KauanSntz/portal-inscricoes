(function () {
  DB.seed();
  Guards.guardLoginLikePage();

  document.getElementById('cadastro-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const result = Auth.register({
      name: document.getElementById('name').value,
      role: document.getElementById('role').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    });

    if (!result.ok) {
      UI.toast(result.message);
      return;
    }

    UI.toast('Cadastro realizado com sucesso!');
    setTimeout(() => { window.location.href = './login.html'; }, 650);
  });
})();
