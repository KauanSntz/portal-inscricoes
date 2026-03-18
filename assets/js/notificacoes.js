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
      if (savedAbertos) {
        JSON.parse(savedAbertos).forEach(id => abertos.add(id));
      }
      const savedConcluidos = localStorage.getItem(STORAGE_KEY_CONCLUIDOS);
      if (savedConcluidos) {
        JSON.parse(savedConcluidos).forEach(id => concluidos.add(id));
      }
    } catch (e) {
      console.warn('Erro ao carregar notificados do localStorage', e);
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

  async function verificarNotificacoes(user) {
    if (!user) return;
    console.log('🔍 Verificando notificações...');

    const db = firebase.firestore();

    const userDoc = await db.collection('users').doc(user.uid).get();
    const userTipo = userDoc.data()?.tipo;

    if (userTipo === 'admin' || userTipo === 'super_admin') {
      const abertosSnap = await db.collection('tickets')
        .where('status', '==', 'aberto')
        .orderBy('criadoEm', 'desc')
        .limit(5)
        .get();

      abertosSnap.forEach(doc => {
        const ticketId = doc.id;
        if (!notificadosAbertos.has(ticketId)) {
          notificadosAbertos.add(ticketId);
          if (swRegistration) {
            swRegistration.showNotification('🎫 Novo Ticket Aberto', {
              body: `Ticket #${ticketId.slice(0, 6)} - ${doc.data().problema.substring(0, 50)}...`,
              silent: false,
              tag: ticketId
            });
          } else {
            new Notification('🎫 Novo Ticket Aberto', {
              body: `Ticket #${ticketId.slice(0, 6)} - ${doc.data().problema.substring(0, 50)}...`,
              silent: false
            });
          }
          tocarSom();
          console.log('🔔 Notificação de abertura enviada', ticketId);
        }
      });
    }

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
        if (swRegistration) {
          swRegistration.showNotification('✅ Ticket Concluído', {
            body: `Seu ticket #${ticketId.slice(0, 6)} foi resolvido.`,
            silent: false,
            tag: ticketId
          });
        } else {
          new Notification('✅ Ticket Concluído', {
            body: `Seu ticket #${ticketId.slice(0, 6)} foi resolvido.`,
            silent: false
          });
        }
        tocarSom();
        console.log('🔔 Notificação de conclusão enviada', ticketId);
      }
    });

    salvarNotificados(notificadosAbertos, notificadosConcluidos);
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      console.log('👤 Usuário não logado – notificações desativadas');
      return;
    }

    console.log('👤 Usuário logado – iniciando notificações');

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('❌ Permissão negada');
        return;
      }
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        swRegistration = registrations[0];
        console.log('✅ Service Worker já está ativo', swRegistration);
      } else {
        const basePath = window.location.pathname.includes('portal-inscricoes') ? '/portal-inscricoes' : '';
        swRegistration = await navigator.serviceWorker.register(`${basePath}/assets/js/service-worker.js`);
        console.log('✅ Service Worker registrado', swRegistration);
      }
    } catch (err) {
      console.error('❌ Erro ao registrar Service Worker:', err);
    }

    setInterval(() => verificarNotificacoes(user), 30000);
    verificarNotificacoes(user);
  });
})();