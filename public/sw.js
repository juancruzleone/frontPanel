const CACHE_NAME = 'leonix-v1';
const urlsToCache = [
  '/',
  '/index.html',
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

  // Para rutas de la aplicación, siempre devolver index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then((response) => {
          return response || fetch('/index.html');
        })
    );
    return;
  }

  // Para recursos estáticos, usar estrategia cache-first
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request);
        })
    );
    return;
  }

  // Para otras peticiones, usar network-first
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Manejo de mensajes para sincronización
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    const pendingData = await getPendingData();
    
    if (pendingData.length > 0) {
      for (const data of pendingData) {
        try {
          await sendPendingData(data);
          await removePendingData(data.id);
        } catch (error) {
          // Error syncing data
        }
      }
    }
  } catch (error) {
    // Background sync failed
  }
}

async function getPendingData() {
  return [];
}

async function sendPendingData(data) {
  // Send pending data
}

async function removePendingData(id) {
  // Remove sent data
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
