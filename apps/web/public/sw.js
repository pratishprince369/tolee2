const CACHE_NAME = 'tolee-pwa-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/default-user-avatar.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn('[PWA SW] Pre-caching failed during install:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ----------------------------------------------------
// NATIVE MOBILE & PWA PUSH NOTIFICATION HANDLERS
// ----------------------------------------------------

self.addEventListener('push', (event) => {
  let data = { title: '⏰ TOLEE AI ALARM REMINDER', body: 'You have a scheduled reminder!', reminderId: '' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'You have an active AI reminder.',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `tolee-alarm-${data.reminderId || Date.now()}`,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: '/ai-manager',
      reminderId: data.reminderId
    },
    actions: [
      { action: 'stop', title: '✅ Stop Alarm' },
      { action: 'snooze', title: '⏰ Snooze 5 Min' },
      { action: 'open', title: '👁 Open AI Manager' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '⏰ TOLEE AI ALARM REMINDER', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.url || '/ai-manager';

  if (action === 'stop') {
    // Notify all open client windows to stop audio ringtone
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'STOP_ALARM_SIGNAL', reminderId: data.reminderId });
        });
      })
    );
  } else if (action === 'snooze') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'SNOOZE_ALARM_SIGNAL', reminderId: data.reminderId });
        });
      })
    );
  } else {
    // Open AI Manager tab directly
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/ai-manager') && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
    );
  }
});

// ----------------------------------------------------
// FETCH STRATEGY FOR PWA
// ----------------------------------------------------

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/_next/') ||
    url.pathname.includes('webpack-hmr')
  ) {
    return;
  }

  const isStaticAsset = url.pathname.match(/\.(png|jpg|jpeg|svg|ico|json|js|css)$/);
  const isRootPage = url.pathname === '/';
  
  if (!isStaticAsset && !isRootPage) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Network error occurred', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
