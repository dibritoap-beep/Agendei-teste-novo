// Service Worker para AGENDEI (Offline, Background Alarms & Web Push)
const CACHE_NAME = 'agendei-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora chamadas de API ou Firestore
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.hostname.includes('firestore') || url.hostname.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// ==========================================
// PUSH EM SEGUNDO PLANO (APLICATIVO FECHADO)
// ==========================================
self.addEventListener('push', (event) => {
  let data = {
    title: 'AGENDEI - Alerta de Compromisso',
    body: 'Você tem um compromisso na sua agenda!',
    callAlert: false,
    url: '/'
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const isCall = !!data.callAlert || data.type === 'CALL';

  const notificationOptions = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || (isCall ? 'agendei-call-alert' : 'agendei-reminder'),
    vibrate: isCall ? [600, 200, 600, 200, 600, 200, 1000] : [300, 150, 300],
    requireInteraction: true,
    data: {
      url: data.url || (isCall ? `/?call=true&title=${encodeURIComponent(data.title)}` : '/'),
      callAlert: isCall,
      appointmentId: data.appointmentId
    },
    actions: isCall ? [
      { action: 'answer', title: '📞 Atender Chamada' },
      { action: 'open', title: 'Ver Detalhes' }
    ] : [
      { action: 'open', title: 'Abrir Agenda' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// ==========================================
// CLIQUE NA NOTIFICAÇÃO (ABRE O APP / LIGAÇÃO)
// ==========================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  let targetUrl = notifData.url || '/';

  if (event.action === 'answer' || notifData.callAlert) {
    targetUrl = targetUrl.includes('call=true') ? targetUrl : `/?call=true`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ==========================================
// MENSAGENS LOCAIS OU NOTIFICATION TRIGGERS
// ==========================================
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, callAlert, timestamp, url } = event.data;
    const isCall = !!callAlert;

    const options = {
      body: body || 'Você tem um compromisso agendado!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || (isCall ? 'agendei-call-alert' : 'agendei-reminder'),
      vibrate: isCall ? [600, 200, 600, 200, 600, 200, 1000] : [300, 150, 300],
      requireInteraction: true,
      data: {
        url: url || (isCall ? `/?call=true&title=${encodeURIComponent(title || '')}` : '/'),
        callAlert: isCall
      },
      actions: isCall ? [
        { action: 'answer', title: '📞 Atender Chamada' },
        { action: 'open', title: 'Ver Detalhes' }
      ] : [
        { action: 'open', title: 'Abrir Agenda' }
      ]
    };

    if (timestamp && 'showTrigger' in Notification.prototype && typeof TimestampTrigger !== 'undefined') {
      try {
        options.showTrigger = new TimestampTrigger(timestamp);
      } catch (e) {
        console.warn('TimestampTrigger error:', e);
      }
    }

    self.registration.showNotification(title || 'AGENDEI - Lembrete', options);
  }
});
