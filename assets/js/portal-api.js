// assets/js/portal-api.js
// Cliente da API do portal, que agora roda em Google Apps Script (apps-script/Code.gs)
// em vez do servidor Express no Render.
//
// portalFetch('/processos?limit=10', { method, body }) imita o fetch(): devolve
// { ok, status, json() } com o mesmo corpo que a API Express devolvia, então as telas
// só trocam `fetch(\`${API_URL}/rota\`, ...)` por `portalFetch('/rota', ...)`.
//
// Por baixo é sempre um POST text/plain (não dispara preflight de CORS no Apps Script)
// com { route, method, query, body, token }. O token do Firebase vai junto quando há
// alguém logado; as rotas protegidas (diário, operadores, admin) exigem.
(function () {
  // URL do app da web publicado (Implantar → Nova implantação → App da Web). Ver apps-script/README.md.
  const PORTAL_API_URL = 'https://script.google.com/macros/s/AKfycbzm7jfTcrQYbZRUAayT2nwwmTYKe8IwToXx9actxNs5Gso4r2_kdz5x1lYWQCKbdAU52g/exec';

  async function tokenAtual() {
    try {
      const user = window.firebase && firebase.apps && firebase.apps.length && firebase.auth().currentUser;
      return user ? await user.getIdToken() : '';
    } catch (e) {
      return '';
    }
  }

  function separar(caminho) {
    const url = new URL(String(caminho).replace(/^\/*/, '/'), 'https://portal.local');
    const query = {};
    url.searchParams.forEach((valor, chave) => { query[chave] = valor; });
    return { route: url.pathname.replace(/^\/+/, ''), query };
  }

  async function portalFetch(caminho, init = {}) {
    const { route, query } = separar(caminho);
    let body = init.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { /* mantém como veio */ }
    }

    const payload = {
      route,
      method: String(init.method || 'GET').toUpperCase(),
      query,
      body: body || null,
      token: await tokenAtual()
    };

    let status = 0;
    let corpo = null;
    try {
      const res = await fetch(PORTAL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      const envelope = await res.json();
      status = envelope.status;
      corpo = envelope.body;
    } catch (err) {
      console.error(`[portal-api] Falha ao chamar ${route}:`, err);
      status = 503;
      corpo = { error: 'Service Unavailable', message: 'Não foi possível falar com o servidor. Verifique a conexão e tente novamente.' };
    }

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => corpo
    };
  }

  // Contas que podem usar o sistema. "excluido" (e conta sem cadastro em users/) fica de fora.
  const TIPOS_ATIVOS = ['comum', 'admin', 'super_admin'];

  // Vigia de conta: em qualquer página, quem loga sem cadastro ativo é deslogado.
  // Não existe mais auto-cadastro: quem cria usuários é o super_admin (admin-users.html).
  function vigiarConta() {
    if (!window.firebase || !firebase.apps || !firebase.apps.length || !firebase.firestore) return;
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const doc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (doc.exists && TIPOS_ATIVOS.includes(doc.data().tipo)) return;
      } catch (e) {
        return;   // falha de rede não derruba ninguém; a API e as regras do Firestore barram de qualquer jeito
      }
      localStorage.removeItem('userType');
      await firebase.auth().signOut();
      if (!/(^|\/)(index|login)\.html$|\/$/.test(location.pathname)) {
        location.href = './index.html?conta=inativa';
      }
    });
  }

  window.PORTAL_API_URL = PORTAL_API_URL;
  window.PORTAL_TIPOS_ATIVOS = TIPOS_ATIVOS;
  window.portalFetch = portalFetch;
  window.addEventListener('load', vigiarConta);
})();
