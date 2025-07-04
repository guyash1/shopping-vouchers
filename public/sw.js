// Service Worker for Shopping Vouchers App
// עבודה בסיסית עם cache לPWA

const CACHE_NAME = 'shopping-vouchers-v2';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/static/media/logo.svg',
  '/manifest.json'
];

// התקנת Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// העברת בקשות דרך Cache - עם הגנה על Firebase Auth
self.addEventListener('fetch', (event) => {
  // רשימת URLs שלא צריך לcache (Firebase Auth)
  const skipCacheUrls = [
    'firebase.googleapis.com',
    'securetoken.googleapis.com',
    'identitytoolkit.googleapis.com',
    'accounts.google.com',
    'oauth2.googleapis.com',
    'www.googleapis.com/oauth2',
    '__/auth/'
  ];
  
  // בדיקה אם זה קשור ל-Firebase Auth
  const shouldSkipCache = skipCacheUrls.some(url => 
    event.request.url.includes(url)
  );
  
  // אם זה Firebase Auth - תן לזה לעבור ישירות בלי cache
  if (shouldSkipCache) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // אחרת - השתמש בlogic הרגיל
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// עדכון Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// הודעות Push (לעתיד)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// לחיצה על Notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
}); 