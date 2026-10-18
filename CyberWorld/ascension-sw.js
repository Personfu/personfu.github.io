/* Public Ascension runtime only. No account, API, member page or remote request
 * is cached. More-specific /CyberWorld/ scope retains member gateway redirects.
 * The build derives VERSION from the complete public runtime contents.
 */
'use strict';
const VERSION = 'cw-ascension-public-3d-2ea4353da279401b';
const PREFIX = 'cw-ascension-public-';
const ENTRY = '/CyberWorld/ascension.html';
const MEMBER_GATEWAY = 'https://www.fllc.net/cyberworld';
const FILES = [
  ENTRY,
  '/CyberWorld/ascension.webmanifest',
  '/CyberWorld/ascension.css',
  '/CyberWorld/ascension-campaign.css',
  '/CyberWorld/gameplay.css',
  '/CyberWorld/cw-academy.css',
  '/CyberWorld/cw-world.css',
  '/CyberWorld/gameplay.js',
  '/CyberWorld/cw-academy.js',
  '/CyberWorld/ascension-net.js',
  '/CyberWorld/ascension-data.js',
  '/CyberWorld/ascension-downloads.js',
  '/CyberWorld/ascension-campaign.js',
  '/CyberWorld/ascension-city.js',
  '/CyberWorld/ascension-field.js',
  '/CyberWorld/ascension-shell.js',
  '/CyberWorld/ascension-world3d.js',
  '/CyberWorld/ascension-response3d.js',
  '/CyberWorld/THIRD_PARTY_LICENSES.txt',
  '/CyberWorld/assets/cyberworld/models/Character.glb',
  '/CyberWorld/assets/cyberworld/models/CHARACTER-LICENSE.md',
  '/assets/favicon.svg',
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
  // GitHub serves this prefix from Personfu/CyberWorld's project deployment.
  // Its public home launches Ascension; account/member subroutes stay separate.
  if (request.mode === 'navigate' && (url.pathname === '/CyberWorld/' || url.pathname === '/CyberWorld/index.html')) return;
  // Explicit public resources include human-readable credits and provenance.
  // Other scoped navigations retain the established member gateway.
  if (request.mode === 'navigate' && url.pathname.startsWith('/CyberWorld/') && !ALLOWED.has(url.pathname)) {
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
