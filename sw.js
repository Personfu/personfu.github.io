/** CyberWorld service worker v1.1: cache public modules and keep active route files fresh. */

const CACHE_VERSION = 'fllc-v19-cyberworld-routing-20260617';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const PRECACHE_ASSETS = [
  '/', '/index.html', '/cyberworld.html', '/cyberworld-game.html', '/CyberWorld/', '/CyberWorld_login/',
  '/login.html', '/signin.html', '/game.html', '/hub.html', '/mathviz.html', '/route-check.html',
  '/cyberworld-routes.json', '/js/cyberworld-router-fix.js', '/wargames.html', '/arcade.html',
  '/signal-lab.html', '/redops.html', '/forensics.html', '/intel.html', '/hangar.html',
  '/dogfight.html', '/simulator.html', '/js/hangar-static.js', '/js/cyber-dogfight.js',
  '/rpg/index.html', '/rpg/login.html', '/js/cyberworld-world.js', '/js/wargames-engine.js',
  '/js/multiplayer-client.js', '/js/story-sync.js', '/js/signal-lab.js', '/js/redops-missions.js'
];

const ROUTE_ALIASES = new Map([
  ['/login', '/CyberWorld_login/'], ['/signin', '/CyberWorld_login/'], ['/game', '/cyberworld-game.html'],
  ['/hub', '/CyberWorld/'], ['/mathviz', '/simulator.html'], ['/hangar', '/hangar.html']
]);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => Promise.allSettled(PRECACHE_ASSETS.map(url => cache.add(url).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fllc-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && request.mode === 'navigate') {
    const target = ROUTE_ALIASES.get(url.pathname.replace(/\/$/, ''));
    if (target) { event.respondWith(Response.redirect(new URL(target, self.location.origin).href, 302)); return; }
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/CyberWorld_login/')) return;
  const isGoogleFonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isGoogleFonts && url.origin !== self.location.origin) return;

  const isHotAsset = ['/index.html','/js/cyberworld-router-fix.js','/cyberworld-routes.json','/route-check.html','/hangar.html','/js/hangar-static.js','/simulator.html','/cyberworld-game.html','/dogfight.html','/js/cyber-dogfight.js','/CyberWorld/','/CyberWorld/index.html','/CyberWorld/augment.css','/CyberWorld/augment.js','/CyberWorld/gameplay.css','/CyberWorld/gameplay.js'].includes(url.pathname) || url.pathname.startsWith('/CyberWorld/_next/static/chunks/');

  if (isHotAsset) {
    event.respondWith(fetch(request, { cache: 'no-store' }).then(response => { const clone = response.clone(); caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone)); return response; }).catch(() => caches.match(request)));
    return;
  }

  if (request.destination === 'document') {
    event.respondWith(fetch(request).then(response => { const clone = response.clone(); caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone)); return response; }).catch(() => caches.match(request).then(r => r || caches.match('/index.html'))));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if (!response || response.status !== 200 || response.type === 'error') return response; const clone = response.clone(); caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone)); return response; }).catch(() => {})));
});
