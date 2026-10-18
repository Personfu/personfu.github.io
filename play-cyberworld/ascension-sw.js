/* Public Ascension runtime only. No account, API, member page or remote request
 * is cached. The dedicated public scope retains member gateway redirects.
 * The build derives VERSION from the complete public runtime contents.
 */
'use strict';
const VERSION = 'cw-ascension-play-0c76eeada87bfc3d';
const PREFIX = 'cw-ascension-play-';
const ENTRY = '/play-cyberworld/ascension.html';
const MEMBER_GATEWAY = 'https://www.fllc.net/cyberworld';
const FILES = [
  ENTRY,
  '/play-cyberworld/ascension.webmanifest',
  '/play-cyberworld/ascension.css',
  '/play-cyberworld/ascension-campaign.css',
  '/play-cyberworld/gameplay.css',
  '/play-cyberworld/cw-academy.css',
  '/play-cyberworld/cw-world.css',
  '/play-cyberworld/gameplay.js',
  '/play-cyberworld/cw-academy.js',
  '/play-cyberworld/ascension-net.js',
  '/play-cyberworld/ascension-data.js',
  '/play-cyberworld/ascension-downloads.js',
  '/play-cyberworld/ascension-campaign.js',
  '/play-cyberworld/ascension-city.js',
  '/play-cyberworld/ascension-field.js',
  '/play-cyberworld/ascension-shell.js',
  '/play-cyberworld/ascension-world3d.js',
  '/play-cyberworld/ascension-response3d.js',
  '/play-cyberworld/THIRD_PARTY_LICENSES.txt',
  '/play-cyberworld/assets/cyberworld/models/Character.glb',
  '/play-cyberworld/assets/cyberworld/models/CHARACTER-LICENSE.md',
  '/play-cyberworld/assets/favicon.svg',
];
const ALLOWED = new Set(FILES);

function cacheable(response) {
  return response && response.ok && !response.redirected && (response.type === 'basic' || response.type === 'default');
}

self.addEventListener('install', event => {
  // Install a complete snapshot or leave the previous worker active. Updates
  // wait for an explicit safe-point activation message from the game shell.
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    try {
      await Promise.all(FILES.map(async pathname => {
        const request = new Request(new URL(pathname, self.location.origin), { credentials: 'omit', cache: 'reload' });
        const response = await fetch(request);
        if (!cacheable(response)) throw new Error('Public game resource unavailable: ' + pathname);
        await cache.put(pathname, response);
      }));
    } catch (error) {
      await caches.delete(VERSION);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== VERSION).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'ACTIVATE_PATCH') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // GitHub serves this dedicated public prefix from the user-site deployment.
  // Its public home converges on the canonical offline-capable game entry.
  if (request.mode === 'navigate' && (url.pathname === '/play-cyberworld/' || url.pathname === '/play-cyberworld/index.html')) { event.respondWith(Response.redirect(new URL(ENTRY, self.location.origin).href, 302)); return; }
  // Explicit public resources include human-readable credits and provenance.
  // Other scoped navigations retain the established member gateway.
  if (request.mode === 'navigate' && url.pathname.startsWith('/play-cyberworld/') && !ALLOWED.has(url.pathname)) {
    event.respondWith(Response.redirect(MEMBER_GATEWAY, 302));
    return;
  }
  if (!ALLOWED.has(url.pathname)) return;
  event.respondWith((async () => {
    let cache = null;
    try { cache = await caches.open(VERSION); } catch (_) { /* Online play survives unavailable storage. */ }
    // Strip query strings so cache size is bounded by the explicit file list.
    const canonical = new Request(new URL(url.pathname, self.location.origin), { credentials: 'omit', cache: 'no-cache' });
    try {
      const response = await fetch(canonical);
      if (cacheable(response)) {
        if (cache) try { await cache.put(url.pathname, response.clone()); } catch (_) { /* A full cache must not reject a usable network response. */ }
        return response;
      }
      const cached = cache && await cache.match(url.pathname);
      if (cached) return cached;
      return response;
    } catch (_) {
      const cached = cache && await cache.match(url.pathname);
      return cached || new Response('Public game resource unavailable offline. Reconnect to install the complete Grid patch.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
