/**
 * FLLC CYBERWORLD SERVICE WORKER v1.0
 * Provides offline-first caching for all public game assets.
 * Strategy: Cache-First for assets, Network-First for HTML pages.
 */

const CACHE_VERSION = 'fllc-v11-cyberworld-runtime-stability-20260510';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

/* Core assets to pre-cache on install */
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/cyberworld.html',
  '/wargames.html',
  '/arcade.html',
  '/signal-lab.html',
  '/redops.html',
  '/forensics.html',
  '/intel.html',
  '/hangar.html',
  '/dogfight.html',
  '/js/hangar-static.js',
  '/js/cyber-dogfight.js',
  '/rpg/index.html',
  '/rpg/login.html',
  '/rpg/js/game.js',
  '/rpg/js/scenes/SceneBoot.js',
  '/rpg/js/scenes/SceneLogin.js',
  '/rpg/js/scenes/SceneCharacter.js',
  '/rpg/js/scenes/SceneTutorial.js',
  '/rpg/js/scenes/SceneOperationsDeck.js',
  '/rpg/js/scenes/SceneLobby.js',
  '/rpg/js/scenes/SceneWorldMap.js',
  '/rpg/js/scenes/SceneMinigame.js',
  '/js/cyberworld-world.js',
  '/js/wargames-engine.js',
  '/js/multiplayer-client.js',
  '/js/story-sync.js',
  '/js/signal-lab.js',
  '/js/redops-missions.js',
];

/* ── INSTALL: pre-cache static assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(() => { /* silently skip missing assets */ })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: delete old cache versions ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('fllc-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: Cache-First for JS/CSS/images, Network-First for HTML ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Only handle same-origin and Google Fonts */
  const isGoogleFonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isGoogleFonts && url.origin !== self.location.origin) return;

  const isHotAsset =
    url.pathname === '/hangar.html' ||
    url.pathname === '/js/hangar-static.js' ||
    url.pathname === '/dogfight.html' ||
    url.pathname === '/js/cyber-dogfight.js' ||
    url.pathname === '/CyberWorld/' ||
    url.pathname.startsWith('/CyberWorld/_next/static/chunks/');
  if (isHotAsset) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* HTML pages: Network-First (stay up to date when online) */
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  /* Everything else: Cache-First */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') return response;
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
        return response;
      }).catch(() => { /* network failure, return nothing */ });
    })
  );
});
