// RehabFlow offline worker.
// The app runs from this version's saved copy. A new version downloads in the background
// and waits until the person taps "تحديث" in the app (message SKIP_WAITING).
const VERSION = 19;
const CACHE = 'rehabflow-v' + VERSION;
const FONT_CACHE = 'rehabflow-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest', './three.min.js', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  const t = e.data && e.data.type;
  if (t === 'SKIP_WAITING') self.skipWaiting();
  else if (t === 'VERSION' && e.source) e.source.postMessage({ type: 'VERSION', version: VERSION });
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonts: keep a copy across versions so the app looks right offline.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }))));
    return;
  }
  if (url.origin !== location.origin) return;

  // The app itself: always this version's copy, so an update applies only when accepted.
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(c => c.match('./index.html')).then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok) c.put(req, r.clone());
    return r;
  }))));
});
