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
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data = { body: event.data.text() };
    }
  }

  // 1. Handle Incoming Audio/Video Calls (WhatsApp Style)
  if (data.type === 'incoming_call') {
    const callerName = data.callerName || 'Tolee User';
    const callType = data.callType === 'video' ? 'Video' : 'Audio';
    const title = `📞 Incoming ${callType} Call`;
    const options = {
      body: `${callerName} is calling you on Tolee...`,
      icon: data.callerAvatar || '/logo.png',
      badge: '/logo.png',
      tag: `call-${data.callId || 'active'}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 500, 250, 500],
      data: {
        type: 'incoming_call',
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        callType: data.callType || 'audio',
        url: `/chat?callId=${data.callId}&action=answer&callerId=${data.callerId}&callType=${data.callType || 'audio'}`
      },
      actions: [
        { action: 'answer', title: '📞 Answer' },
        { action: 'decline', title: '❌ Decline' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
    return;
  }

  // 2. Handle Call Cancellation / Expiration (Dismiss Notification)
  if (data.type === 'call_ended' || data.type === 'call_cancelled') {
    const callTag = `call-${data.callId || 'active'}`;
    event.waitUntil(
      self.registration.getNotifications({ tag: callTag }).then((notifications) => {
        notifications.forEach((notif) => notif.close());
      })
    );
    return;
  }

  // 3. Handle AI Alarm Reminder
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

  // 1. Incoming Call Notification Click Handling
  if (data.type === 'incoming_call') {
    if (action === 'decline') {
      // Hit decline endpoint
      event.waitUntil(
        fetch('/api/notifications/send-call-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'dismiss', callId: data.callId })
        }).catch(() => {})
      );
      return;
    }

    // Answer action vs clicking the notification body
    const isAnswerAction = action === 'answer';
    const targetUrl = isAnswerAction 
      ? `/chat?callId=${data.callId}&action=answer&callerId=${data.callerId}&callerName=${encodeURIComponent(data.callerName || '')}&callerAvatar=${encodeURIComponent(data.callerAvatar || '')}&callType=${data.callType || 'audio'}`
      : `/chat?callId=${data.callId}&incoming=true&callerId=${data.callerId}&callerName=${encodeURIComponent(data.callerName || '')}&callerAvatar=${encodeURIComponent(data.callerAvatar || '')}&callType=${data.callType || 'audio'}`;

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: isAnswerAction ? 'INCOMING_CALL_ANSWER_SIGNAL' : 'INCOMING_CALL_SIGNAL',
              callId: data.callId,
              callType: data.callType,
              callerId: data.callerId,
              callerName: data.callerName,
              callerAvatar: data.callerAvatar
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
    );
    return;
  }

  // 2. Alarm Reminder Notification Click Handling
  const targetUrl = data.url || '/ai-manager';

  if (action === 'stop') {
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
