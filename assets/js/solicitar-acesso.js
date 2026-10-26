// assets/js/solicitar-acesso.js
// "Solicitar acesso" nas telas de login (index.html e login.html).
//
// A pessoa cria a conta, mas ela nasce com tipo "pendente": só entra no sistema depois que
// um admin ou super_admin aprova em admin-users.html. E-mail fora de @fametro.edu.br, quando
// aprovado, vira acesso temporário de 3 dias (ver admin-users.html e firestore.rules).
//
// A conta é criada numa segunda instância do Firebase, então a tela de login não "loga"
// a pessoa (e não redireciona para o portal) enquanto a solicitação é enviada.
(function () {
  const DOMINIO_FAMETRO = '@fametro.edu.br';

  const MENSAGENS_CONTA = {
    pendente: 'Sua solicitação de acesso ainda não foi aprovada. Aguarde um administrador.',
    expirada: 'Seu acesso temporário terminou. Quando tiver o e-mail @fametro.edu.br, solicite acesso de novo com ele.',
    inativa: 'Sua conta não tem acesso ao sistema. Fale com um administrador.'
  };

  const ERROS = {
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Se já pediu acesso, aguarde a aprovação.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'Senha muito curta (mínimo 6 caracteres).',
    'auth/network-request-failed': 'Verifique sua internet.'
  };

  function mostrar(texto, sucesso) {
    const div = document.getElementById('login-message');
    if (!div) return alert(texto);
    div.textContent = texto;
    div.style.display = 'flex';
    div.style.backgroundColor = sucesso ? '#d4edda' : '#f8d7da';
    div.style.color = sucesso ? '#155724' : '#721c24';
    div.style.border = sucesso ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
  }

  function montar() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm || !window.firebase || !firebase.apps.length) return;

    const conta = new URLSearchParams(location.search).get('conta');
    if (MENSAGENS_CONTA[conta]) mostrar(MENSAGENS_CONTA[conta], false);

    const link = document.createElement('p');
    link.style.cssText = 'margin-top:1rem;text-align:center;';
    link.innerHTML = 'Não tem acesso? <a href="#" id="show-solicitar">Solicitar acesso</a>';
    loginForm.appendChild(link);

    const form = document.createElement('form');
    form.id = 'solicitar-form';
    form.style.cssText = 'display:none;margin-top:1rem;';
    form.innerHTML = `
      <h3>Solicitar acesso</h3>
      <p style="font-size:0.85rem;opacity:0.8;margin:0 0 0.75rem;">
        Use seu e-mail <strong>${DOMINIO_FAMETRO}</strong>. Com outro e-mail, o acesso aprovado é
        temporário (3 dias).
      </p>
      <div class="field"><span>Nome completo</span>
        <input type="text" id="sol-nome" class="search-input" required></div>
      <div class="field"><span>E-mail</span>
        <input type="email" id="sol-email" class="search-input" required></div>
      <div class="field"><span>Senha</span>
        <input type="password" id="sol-senha" class="search-input" minlength="6" required></div>
      <div class="field"><span>Confirmar senha</span>
        <input type="password" id="sol-senha2" class="search-input" minlength="6" required></div>
      <button type="submit" class="btn btn--accent btn--block" id="btn-solicitar">Enviar solicitação</button>
      <p style="margin-top:0.5rem;text-align:center;"><a href="#" id="voltar-login">Voltar para login</a></p>
    `;
    loginForm.after(form);

    const alternar = (paraSolicitar) => {
      loginForm.style.display = paraSolicitar ? 'none' : 'block';
      form.style.display = paraSolicitar ? 'block' : 'none';
      const div = document.getElementById('login-message');
      if (div) div.style.display = 'none';
    };
    document.getElementById('show-solicitar').addEventListener('click', (e) => { e.preventDefault(); alternar(true); });
    document.getElementById('voltar-login').addEventListener('click', (e) => { e.preventDefault(); alternar(false); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('sol-nome').value.trim();
      const email = document.getElementById('sol-email').value.trim().toLowerCase();
      const senha = document.getElementById('sol-senha').value;
      if (!nome) return mostrar('Informe seu nome.', false);
      if (senha !== document.getElementById('sol-senha2').value) return mostrar('As senhas não coincidem.', false);

      const btn = document.getElementById('btn-solicitar');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      const app = firebase.apps.find(a => a.name === 'solicitacao') || firebase.initializeApp(firebase.app().options, 'solicitacao');
      const auth = app.auth();
      try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
        const cred = await auth.createUserWithEmailAndPassword(email, senha);
        await cred.user.updateProfile({ displayName: nome });
        await app.firestore().collection('users').doc(cred.user.uid).set({
          nome,
          email,
          tipo: 'pendente',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        form.reset();
        alternar(false);
        mostrar(email.endsWith(DOMINIO_FAMETRO)
          ? 'Solicitação enviada! Você poderá entrar assim que um administrador aprovar.'
          : 'Solicitação enviada! Como o e-mail não é @fametro.edu.br, o acesso, quando aprovado, vale por 3 dias.', true);
      } catch (err) {
        mostrar(ERROS[err.code] || ('Não foi possível enviar: ' + (err.message || err.code)), false);
      } finally {
        await auth.signOut().catch(() => {});
        btn.disabled = false;
        btn.textContent = 'Enviar solicitação';
      }
    });
  }

  window.addEventListener('load', montar);
})();
