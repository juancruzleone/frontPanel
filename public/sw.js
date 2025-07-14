const CACHE_NAME = 'leone-suite-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  // Agregar otros recursos importantes
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
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
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  // Verificar que la request sea válida para cachear
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

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(request).then(
          (response) => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          }
        );
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
    // Aquí se puede implementar la sincronización de datos pendientes
    console.log('Background sync triggered');
    
    // Obtener datos pendientes del localStorage
    const pendingData = await getPendingData();
    
    if (pendingData.length > 0) {
      // Intentar enviar datos pendientes
      for (const data of pendingData) {
        try {
          await sendPendingData(data);
          await removePendingData(data.id);
        } catch (error) {
          console.error('Error syncing data:', error);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function getPendingData() {
  // Esta función se implementaría para obtener datos del IndexedDB
  // Por ahora retornamos un array vacío
  return [];
}

async function sendPendingData(data) {
  // Implementar envío de datos pendientes
  console.log('Sending pending data:', data);
}

async function removePendingData(id) {
  // Implementar eliminación de datos enviados
  console.log('Removing sent data:', id);
} 