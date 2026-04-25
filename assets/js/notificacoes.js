// assets/js/notificacoes.js
(() => {
  'use strict';

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.log('❌ Notificações não suportadas');
    return;
  }

  const STORAGE_KEY_ABERTOS = 'notificadosAbertos';
  const STORAGE_KEY_CONCLUIDOS = 'notificadosConcluidos';

  function carregarNotificados() {
    const abertos = new Set();
    const concluidos = new Set();
    try {
      const savedAbertos = localStorage.getItem(STORAGE_KEY_ABERTOS);
      if (savedAbertos) JSON.parse(savedAbertos).forEach(id => abertos.add(id));
      const savedConcluidos = localStorage.getItem(STORAGE_KEY_CONCLUIDOS);
      if (savedConcluidos) JSON.parse(savedConcluidos).forEach(id => concluidos.add(id));
    } catch (e) {
      console.warn('Erro ao carregar notificados', e);
    }
    return { abertos, concluidos };
  }

  function salvarNotificados(abertos, concluidos) {
    try {
      localStorage.setItem(STORAGE_KEY_ABERTOS, JSON.stringify(Array.from(abertos)));
      localStorage.setItem(STORAGE_KEY_CONCLUIDOS, JSON.stringify(Array.from(concluidos)));
    } catch (e) {
      console.warn('Erro ao salvar notificados', e);
    }
  }

  let { abertos: notificadosAbertos, concluidos: notificadosConcluidos } = carregarNotificados();

  const audio = new Audio('./assets/audio/notification.mp3');
  audio.load();

  function tocarSom() {
    audio.play().catch(e => console.log('⚠️ Autoplay bloqueado:', e));
  }

  let swRegistration = null;
  let swReady = false; // indica se o service worker já está pronto

  // Função que exibe a notificação, usando o service worker se disponível
  function mostrarNotificacao(titulo, opcoes) {
    if (swRegistration) {
      swRegistration.showNotification(titulo, opcoes)
        .then(() => console.log('✅ Notificação via SW exibida:', titulo))
        .catch(err => {
          console.error('❌ Erro ao mostrar notificação via SW, usando fallback:', err);
          // Fallback
          try {
            new Notification(titulo, opcoes);
          } catch (e) {
            console.error('❌ Fallback de notificação também falhou:', e);
          }
        });
    } else {
      try {
        new Notification(titulo, opcoes);
        console.log('✅ Notificação via fallback exibida:', titulo);
      } catch (e) {
        console.error('❌ Fallback de notificação falhou:', e);
      }
    }
  }

  async function verificarNotificacoes(user) {
    if (!user) return;
    console.log('🔍 Verificando notificações...');

    const db = firebase.firestore();
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userTipo = userDoc.data()?.tipo;
    console.log('👤 Tipo do usuário:', userTipo);

    // 1. Tickets abertos para admins
    if (userTipo === 'admin' || userTipo === 'super_admin') {
      console.log('👑 Usuário é admin, buscando tickets abertos...');
      const abertosSnap = await db.collection('tickets')
        .where('status', '==', 'aberto')
        .orderBy('criadoEm', 'desc')
        .limit(5)
        .get();
      console.log(`📊 Encontrados ${abertosSnap.size} tickets abertos`);

      abertosSnap.forEach(doc => {
        const ticketId = doc.id;
        if (!notificadosAbertos.has(ticketId)) {
          notificadosAbertos.add(ticketId);
          console.log('🔔 Tentando enviar notificação para ticket', ticketId);
          mostrarNotificacao('🎫 Novo Ticket Aberto', {
            body: `Ticket #${ticketId.slice(0,6)} - ${doc.data().problema.substring(0,50)}...`,
            silent: false,
            tag: ticketId
          });
          tocarSom();
          console.log('🔔 Notificação de abertura processada', ticketId);
        } else {
          console.log('⏭️ Ticket já notificado:', ticketId);
        }
      });
    }

    // 2. Tickets concluídos para o criador
    const concluidosSnap = await db.collection('tickets')
      .where('status', '==', 'concluido')
      .where('criadoPor', '==', user.uid)
      .orderBy('concluidoEm', 'desc')
      .limit(5)
      .get();

    concluidosSnap.forEach(doc => {
      const ticketId = doc.id;
      if (!notificadosConcluidos.has(ticketId)) {
        notificadosConcluidos.add(ticketId);
        mostrarNotificacao('✅ Ticket Concluído', {
          body: `Seu ticket #${ticketId.slice(0,6)} foi resolvido.`,
          silent: false,
          tag: ticketId
        });
        tocarSom();
        console.log('🔔 Notificação de conclusão processada', ticketId);
      }
    });

    salvarNotificados(notificadosAbertos, notificadosConcluidos);
  }

  // Inicialização
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      console.log('👤 Usuário não logado – notificações desativadas');
      return;
    }

    console.log('👤 Usuário logado – iniciando notificações');
    console.log('🔔 Permissão atual:', Notification.permission);

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('❌ Permissão negada');
        return;
      }
    }

    // Registrar service worker
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        swRegistration = registrations[0];
        console.log('✅ Service Worker já está ativo', swRegistration);
        swReady = true;
      } else {
        const basePath = window.location.pathname.includes('portal-inscricoes') ? '/portal-inscricoes' : '';
        swRegistration = await navigator.serviceWorker.register(`${basePath}/assets/js/service-worker.js`);
        console.log('✅ Service Worker registrado', swRegistration);
        swReady = true;
      }
    } catch (err) {
      console.error('❌ Erro ao registrar Service Worker:', err);
      // Mesmo sem service worker, podemos usar fallback
      swReady = true; // para permitir a verificação
    }

    // Aguarda um pequeno tempo para garantir que o SW esteja pronto (opcional)
    setTimeout(() => {
      // Iniciar polling
      setInterval(() => verificarNotificacoes(user), 30000);
      verificarNotificacoes(user);
    }, 500);
  });
})();