// MINUM MALAM SISWA — service worker
// Cache name is versioned. Bump V when the app changes so old shells get evicted.
// Current: v68 (build marker in the page corner, so a stale cache is visible at a glance)
const V = 'v68-20261029';
// the DuitNow QR and the install icons must survive a cold, offline start
const SHELL = ['./', './index.html', './drinks-order.html', './manifest.json', './qr-duitnow.jpg', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(V)
      .then((c) => c.addAll(SHELL))
      .catch(() => { /* shell fetch failure must not block install */ })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first so the menu/config always come from Firestore on a good connection,
// cache only as an offline fallback.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never cache or intercept Firebase traffic.
  if (url.hostname.endsWith('googleapis.com') ||
      url.hostname.endsWith('firebaseio.com') ||
      url.hostname.endsWith('gstatic.com') ||
      url.hostname.endsWith('google.com')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const cp = r.clone();
          caches.open(V).then((c) => c.put(req, cp));
          return r;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r && r.status === 200 && r.type === 'basic') {
        const cp = r.clone();
        caches.open(V).then((c) => c.put(req, cp));
      }
      return r;
    }))
  );
});