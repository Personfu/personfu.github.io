'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { exportPublic, verifyExport, requiredFiles, cachePrefix } = require('./export-cyberworld-public.cjs');
const root = path.resolve(__dirname, '..');
function harness(source, failingPath = null) {
  const handlers = new Map(), stores = new Map(), requests = [];
  const state = { online: true, skipped: 0, claimed: 0 };
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const storage = stores.get(name);
      return { async put(key, response) { storage.set(String(key), response.clone()); }, async match(key) { return storage.get(String(key))?.clone(); } };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const contract = vm.runInNewContext(source + '\n({ files: FILES, version: VERSION });', {
    URL, Request, Response, Set, Promise, caches,
    fetch: async request => {
      requests.push(request);
      if (!state.online) throw new Error('Offline');
      const pathname = new URL(request.url).pathname;
      return new Response('public:' + pathname, { status: pathname === failingPath ? 503 : 200 });
    },
    self: { location: { origin: 'https://personfu.github.io' }, addEventListener: (name, fn) => handlers.set(name, fn), skipWaiting: () => state.skipped++, clients: { claim: async () => state.claimed++ } },
  });
  return {
    stores, requests, state, contract,
    async lifecycle(name) { let done; handlers.get(name)({ waitUntil: value => done = value }); await done; },
    fetch(pathname, mode = 'cors', method = 'GET') {
      let response;
      handlers.get('fetch')({ request: { url: new URL(pathname, 'https://personfu.github.io').href, mode, method }, respondWith: value => response = Promise.resolve(value) });
      return response;
    },
    activatePatch() { handlers.get('message')({ data: { type: 'ACTIVATE_PATCH' } }); },
  };
}
(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cyberworld-public-'));
  try {
    const output = path.join(temporary, 'mount');
    const report = exportPublic({ output });
    const committedOutput = path.join(root, 'play-cyberworld');
    const committedReport = JSON.parse(fs.readFileSync(path.join(committedOutput, 'ascension-deployment.json'), 'utf8'));
    verifyExport(committedOutput, committedReport);
    assert.deepEqual(committedReport, report, 'Committed public deployment metadata must match a fresh maintained-source export; run npm run build');
    for (const file of report.files) assert.deepEqual(fs.readFileSync(path.join(committedOutput, file.path)), fs.readFileSync(path.join(output, file.path)), 'Committed public bytes drifted: ' + file.path);
    assert.equal(report.files.length, 32);
    assert.equal(report.source.files.length, 31);
    assert.equal(report.offline.files.length, 24);
    assert.ok(report.offline.files.every(url => url.startsWith('/play-cyberworld/')));
    assert.equal(JSON.stringify(exportPublic({ output })), JSON.stringify(report), 'Repeated exports have identical manifests and versions');
    const model = 'assets/cyberworld/models/Character.glb';
    assert.deepEqual(fs.readFileSync(path.join(output, model)), fs.readFileSync(path.join(root, 'CyberWorld', model)), 'GLB is copied byte for byte');
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    assert.match(html, /https:\/\/personfu\.github\.io\/play-cyberworld\/ascension\.html/);
    assert.match(html, /href="\.\.\/index\.html"/);
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|http-equiv\s*=\s*["']refresh/i);
    const shell = fs.readFileSync(path.join(output, 'ascension-shell.js'), 'utf8');
    assert.match(shell, /https:\/\/www\.fllc\.net\/cyberworld/);
    assert.match(shell, /\.\.\/GovINT\/index\.html/);
    const changedSize = structuredClone(report);
    changedSize.files[0].bytes++;
    assert.throws(() => verifyExport(output, changedSize), /integrity check failed/);
    const changedHash = structuredClone(report);
    changedHash.files[0].sha256 = '0'.repeat(64);
    assert.throws(() => verifyExport(output, changedHash), /integrity check failed/);
    fs.writeFileSync(path.join(output, 'private-account.html'), 'must never ship');
    assert.throws(() => verifyExport(output, report), /unlisted files/);
    fs.unlinkSync(path.join(output, 'private-account.html'));
    const sourceRoot = path.join(temporary, 'source');
    for (const file of requiredFiles) {
      const source = file === 'assets/favicon.svg' ? file : 'CyberWorld/' + file;
      const target = path.join(sourceRoot, source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, source), target);
    }
    for (const file of requiredFiles.filter(file => !file.endsWith('.glb'))) {
      const source = file === 'assets/favicon.svg' ? file : 'CyberWorld/' + file;
      const target = path.join(sourceRoot, source);
      fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace(/\r\n?/g, '\n'));
    }
    const lfReport = exportPublic({ sourceRoot, output: path.join(temporary, 'lf-checkout') });
    assert.deepEqual(lfReport, report, 'LF and CRLF source checkouts produce identical output metadata and runtime bytes');
    // A non-snapshot asset still participates in the exact exported-byte version.
    fs.appendFileSync(path.join(sourceRoot, 'CyberWorld/assets/cyberworld/data-shard.svg'), '\n<!-- maintained source edit -->\n');
    const changed = exportPublic({ sourceRoot, output: path.join(temporary, 'changed') });
    assert.notEqual(changed.offline.version, report.offline.version, 'Current uncommitted source bytes drive exports');
    const workerSource = fs.readFileSync(path.join(output, 'ascension-sw.js'), 'utf8');
    const failed = harness(workerSource, '/play-cyberworld/ascension-world3d.js');
    failed.stores.set(cachePrefix + 'previous', new Map([['saved-snapshot', 'preserved']]));
    failed.stores.set('cw-ascension-public-project-other', new Map([['other-game', 'preserved']]));
    await assert.rejects(failed.lifecycle('install'), /Public game resource unavailable/);
    assert.equal(failed.stores.has(failed.contract.version), false, 'A partial install is removed');
    assert.equal(failed.stores.get(cachePrefix + 'previous').get('saved-snapshot'), 'preserved', 'Failed install preserves previous complete snapshot');
    assert.equal(failed.stores.get('cw-ascension-public-project-other').get('other-game'), 'preserved', 'Failed install preserves unrelated game caches');
    assert.equal(failed.state.skipped, 0);
    const worker = harness(workerSource);
    for (const name of [cachePrefix + 'old', 'cw-ascension-public-3d-other', 'cw-ascension-public-project-other', 'personfu-root-cache']) worker.stores.set(name, new Map());
    await worker.lifecycle('install');
    assert.equal(worker.state.skipped, 0, 'Installed updates wait for safe activation');
    await worker.lifecycle('activate');
    assert.equal(worker.stores.has(cachePrefix + 'old'), false);
    for (const name of ['cw-ascension-public-3d-other', 'cw-ascension-public-project-other', 'personfu-root-cache']) assert.ok(worker.stores.has(name), 'Other game/root caches survive activation: ' + name);
    assert.equal(worker.stores.get(worker.contract.version).size, 24);
    assert.ok(worker.requests.every(request => request.credentials === 'omit' && new URL(request.url).pathname.startsWith('/play-cyberworld/')));
    worker.state.online = false;
    for (const alias of ['/play-cyberworld/', '/play-cyberworld/index.html']) {
      const response = await worker.fetch(alias, 'navigate');
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), 'https://personfu.github.io/play-cyberworld/ascension.html');
    }
    const response = await worker.fetch('/play-cyberworld/ascension.html?case=2', 'navigate');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /public:\/play-cyberworld\/ascension\.html/);
    assert.equal((await worker.fetch('/play-cyberworld/ascension-world3d.js')).status, 200);
    for (const credit of ['/play-cyberworld/THIRD_PARTY_LICENSES.txt', '/play-cyberworld/assets/cyberworld/models/CHARACTER-LICENSE.md']) assert.equal((await worker.fetch(credit, 'navigate')).status, 200, 'Cached public credits remain readable');
    assert.equal(worker.stores.get(worker.contract.version).size, 24, 'Aliases and queries cannot enlarge cache');
    const requestCount = worker.requests.length;
    assert.equal((await worker.fetch('/play-cyberworld/login/index.html', 'navigate')).headers.get('location'), 'https://www.fllc.net/cyberworld');
    assert.equal(worker.fetch('/play-cyberworld/api/progress'), undefined);
    assert.equal(worker.fetch('/CyberWorld/ascension.html', 'navigate'), undefined);
    assert.equal(worker.fetch('https://other.test/play-cyberworld/ascension.html'), undefined);
    assert.equal(worker.fetch('/play-cyberworld/ascension.html', 'cors', 'POST'), undefined);
    assert.equal(worker.requests.length, requestCount, 'Private, foreign and non-GET requests never enter cache flow');
    worker.activatePatch();
    assert.equal(worker.state.skipped, 1);
    console.log('Public mount: deterministic 31-source/32-output contract, exact integrity, local closure, source edits, isolated caches, failed install and offline aliases pass.');
  } finally {
    // temporary is an absolute directory created by mkdtemp above, never user data.
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
