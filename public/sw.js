const CACHE_NAME = 'leonix-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo leonix 5.svg',
  '/theme-init.js'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
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
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // No cachear extensiones de Chrome, data URLs, o esquemas no soportados
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'chrome:' || 
      url.protocol === 'moz-extension:' || 
      url.protocol === 'data:' ||
      url.protocol === 'blob:' ||
      url.protocol === 'file:') {
    return;
  }

  // API Requests: cachear únicamente lecturas seguras. Las mutaciones se dejan pasar
  // para que la app cliente las encole y sincronice con Zustand/localStorage.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      // Network First para GETs de API
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open('api-cache').then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(request);
          })
      );
    }
    return;
  }

  // Para rutas de la aplicación, siempre devolver index.html (Navigation fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Para recursos estáticos, usar estrategia stale-while-revalidate
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // Fallback genérico
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Manejo de mensajes para sincronización
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sync') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({ type: 'TRIGGER_SYNC' });
  }
}

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { message: event.data.text() };
  }

  const title = payload.title || 'Nueva notificación';
  const options = {
    body: payload.message || payload.body || '',
    icon: payload.icon || '/logo leonix 5.svg',
    badge: payload.badge || '/logo leonix 5.svg',
    data: payload.data || { url: '/ordenes-trabajo' },
    tag: payload.tag || 'leonix-push',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/ordenes-trabajo';

  const url = new URL(targetUrl, self.location.origin);
  const isSafeUrl = url.origin === self.location.origin;
  
  if (!isSafeUrl) {
    return;
  }

  const safeTargetUrl = url.href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(safeTargetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(safeTargetUrl);
      }
    })
  );
});
