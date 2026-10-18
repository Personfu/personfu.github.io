'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'CyberWorld', 'ascension-sw.js'), 'utf8');
const handlers = new Map(), stores = new Map();
const origin = 'https://personfu.github.io';
let online = true, storageUnavailable = false, skipWaiting = 0, claimed = 0, fetches = [];
const caches = {
  async open(name) {
    if (storageUnavailable) throw new Error('Storage unavailable');
    if (!stores.has(name)) stores.set(name, new Map());
    const storage = stores.get(name);
    return { async put(key, response) { storage.set(String(key), response.clone()); }, async match(key) { return storage.get(String(key))?.clone(); } };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
};
const declaredFiles = vm.runInNewContext(source + '\nFILES;', { URL, Request, Response, Set, Promise, caches,
  fetch: async request => { fetches.push(request); if (!online) throw new Error('Offline'); return new Response('public:' + new URL(request.url).pathname); },
  self: { location: { origin }, addEventListener: (name, fn) => handlers.set(name, fn), skipWaiting: () => skipWaiting++, clients: { claim: async () => claimed++ } },
});
async function lifecycle(name) { let done; handlers.get(name)({ waitUntil: value => done = value }); await done; }
function fetchEvent(pathname, mode = 'cors', method = 'GET') {
  let result;
  handlers.get('fetch')({ request: { url: origin + pathname, mode, method }, respondWith: value => result = Promise.resolve(value) });
  return result;
}
(async () => {
  stores.set('cw-ascension-public-old', new Map());
  stores.set('unrelated-account-cache', new Map());
  await lifecycle('install');
  assert.equal(skipWaiting, 0, 'Patch installation must wait for a game safe point');
  await lifecycle('activate');
  assert.equal(claimed, 1);
  assert.equal(stores.has('cw-ascension-public-old'), false);
  assert.equal(stores.has('unrelated-account-cache'), true);
  const publicCache = [...stores.entries()].find(([name]) => name.startsWith('cw-ascension-public-'))[1];
  assert.equal(publicCache.size, declaredFiles.length, 'The complete explicit public resource set is cached');
  assert.ok(publicCache.size <= 32, 'Offline resource count remains bounded');
  assert.ok(publicCache.has('/CyberWorld/THIRD_PARTY_LICENSES.txt'), 'Complete rendering license remains available offline');
  assert.ok(publicCache.has('/CyberWorld/assets/cyberworld/models/Character.glb'), 'Animated operative stays available offline');
  assert.ok(publicCache.has('/CyberWorld/assets/cyberworld/models/CHARACTER-LICENSE.md'), 'Character provenance stays available offline');
  assert.ok(fetches.every(request => request.credentials === 'omit'));
  assert.ok(fetches.every(request => !/auth|api\/|profile|login/.test(new URL(request.url).pathname)));
  const initialSize = publicCache.size;
  const fresh = await fetchEvent('/CyberWorld/ascension.html?case=1', 'navigate');
  assert.equal(fresh.status, 200);
  assert.equal(publicCache.size, initialSize, 'Query variations cannot grow the cache');
  assert.equal(new URL(fetches.at(-1).url).search, '');
  online = false;
  const offline = await fetchEvent('/CyberWorld/ascension.html', 'navigate');
  assert.equal(offline.status, 200);
  assert.match(await offline.text(), /public:\/CyberWorld\/ascension.html/);
  const bundle = await fetchEvent('/CyberWorld/ascension-world3d.js');
  assert.equal(bundle.status, 200, 'The bundled 3D runtime is available offline');
  for (const credit of ['/CyberWorld/THIRD_PARTY_LICENSES.txt', '/CyberWorld/assets/cyberworld/models/CHARACTER-LICENSE.md']) {
    const response = await fetchEvent(credit, 'navigate');
    assert.equal(response.status, 200, 'Public credits are readable as offline navigations');
    assert.equal(response.redirected, false);
  }
  online = true; storageUnavailable = true;
  const noStorage = await fetchEvent('/CyberWorld/ascension.html', 'navigate');
  assert.equal(noStorage.status, 200, 'Unavailable browser storage must not break online play');
  online = false;
  const unavailable = await fetchEvent('/CyberWorld/ascension.html', 'navigate');
  assert.equal(unavailable.status, 503, 'Unavailable uncached offline resources receive an honest failure');
  storageUnavailable = false;
  assert.equal(fetchEvent('/CyberWorld/', 'navigate'), undefined, 'Project home remains a public network navigation');
  assert.equal(fetchEvent('/CyberWorld/index.html', 'navigate'), undefined, 'Project index remains public');
  for (const protectedPath of ['/CyberWorld/login/index.html', '/CyberWorld/member/profile.html']) {
    const response = await fetchEvent(protectedPath, 'navigate');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'https://www.fllc.net/cyberworld');
  }
  assert.equal(fetchEvent('/CyberWorld/member-save.json'), undefined);
  assert.equal(fetchEvent('/CyberWorld/api/progress'), undefined);
  assert.equal(fetchEvent('/CyberWorld/ascension.html', 'cors', 'POST'), undefined);
  let foreign;
  handlers.get('fetch')({ request: { url: 'https://other.test/CyberWorld/ascension.html', mode: 'navigate', method: 'GET' }, respondWith: value => foreign = value });
  assert.equal(foreign, undefined);
  handlers.get('message')({ data: { type: 'ACTIVATE_PATCH' } });
  assert.equal(skipWaiting, 1);
  console.log('Public offline worker: bounded resources, complete install, safe-point update, offline bundles and member boundaries pass.');
})().catch(error => { console.error(error); process.exitCode = 1; });
