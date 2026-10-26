// assets/js/service-worker.js

self.addEventListener('install', (event) => {
  console.log('✅ Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ativado');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificação clicada', event.notification);
  event.notification.close();
  // Caminho relativo ao próprio arquivo: funciona no GitHub Pages (/portal-inscricoes/) e no Render (/)
  event.waitUntil(clients.openWindow(new URL('../../tickets.html', self.location).href));
});