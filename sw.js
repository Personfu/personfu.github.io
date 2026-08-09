/**
 * FLLC CYBERWORLD SERVICE WORKER
 * Retires public/offline game caches and hands legacy member routes to FLLC.
 */

const MEMBER_GATEWAY = 'https://www.fllc.net/cyberworld';

const LEGACY_MEMBER_ROUTES = new Set([
  '/adversaries.html',
  '/ai.html',
  '/arcade.html',
  '/ctf-trail.html',
  '/cyber.html',
  '/cyberos-iso.html',
  '/cyberworld-codex.html',
  '/cyberworld-game.html',
  '/cyberworld.html',
  '/discuss.html',
  '/dogfight-legacy.html',
  '/dogfight.html',
  '/forensics.html',
  '/games.html',
  '/hangar-legacy.html',
  '/hangar.html',
  '/intel.html',
  '/nodes.html',
  '/profile.html',
  '/redops.html',
  '/research.html',
  '/signal-lab.html',
  '/simulator.html',
  '/stars.html',
  '/wargames.html',
]);

const LEGACY_MEMBER_PREFIXES = [
  '/CyberWorld/',
  '/CyberWorld_login/',
  '/legacy/',
  '/rpg/',
  '/simulator/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('fllc-')).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isLegacyMemberRoute =
    LEGACY_MEMBER_ROUTES.has(url.pathname) ||
    LEGACY_MEMBER_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  if (isLegacyMemberRoute) {
    event.respondWith(Response.redirect(MEMBER_GATEWAY, 302));
  }
});
