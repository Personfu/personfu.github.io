'use strict';
// Reproducible proof of the actual generated public mount, with a fresh guest
// profile. All gameplay input goes through visible buttons and keyboard events.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { crc32 } = require('node:zlib');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const mount = path.join(root, 'play-cyberworld');
const output = process.env.CW_COMBAT_EVIDENCE_DIR
  ? path.resolve(process.env.CW_COMBAT_EVIDENCE_DIR)
  : path.join(root, 'docs', 'evidence');
const callsign = 'OFFLINE-FORGE';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

function unzip(stored) {
  const data = Buffer.from(stored), files = new Map(); let offset = 0;
  while (offset + 30 <= data.length && data.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(data.readUInt16LE(offset + 8), 0, 'Practice ZIP must use independently readable stored entries.');
    const bytes = data.readUInt32LE(offset + 18), nameBytes = data.readUInt16LE(offset + 26), extra = data.readUInt16LE(offset + 28);
    const start = offset + 30 + nameBytes + extra, end = start + bytes;
    assert(end <= data.length, 'ZIP entry is complete.');
    const name = data.subarray(offset + 30, offset + 30 + nameBytes).toString('utf8');
    assert(name && !files.has(name) && !/[\\/]/.test(name), 'ZIP names are unique, flat public filenames.');
    const body = data.subarray(start, end);
    assert.equal(crc32(body), data.readUInt32LE(offset + 14), name + ' CRC32');
    files.set(name, body); offset = end;
  }
  assert(offset + 4 <= data.length && data.readUInt32LE(offset) === 0x02014b50, 'ZIP central directory exists.');
  assert(data.length >= 22 && data.readUInt32LE(data.length - 22) === 0x06054b50, 'ZIP end record exists.');
  assert.equal(data.readUInt16LE(data.length - 12), files.size, 'ZIP entry count matches.');
  return files;
}

async function main() {
  const started = Date.now(), report = { proof: 'breach-foundry-generated-mount-offline-v1', result: 'running',
    started_utc: new Date(started).toISOString(), profile: 'fresh synthetic guest', state_grants: false,
    gameplay_input: 'visible UI buttons and physical keyboard events only', external_requests: 'blocked' };
  fs.mkdirSync(output, { recursive: true });
  const reportPath = path.join(output, 'breach-foundry-offline-proof.json');
  const screenshotPath = path.join(output, 'breach-foundry-offline.png');
  let browser, context, server, deadline, requests = 0;
  async function stopServer() {
    if (!server?.listening) return;
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  }
  async function work() {
    const deployment = JSON.parse(fs.readFileSync(path.join(mount, 'ascension-deployment.json'), 'utf8'));
    const offline = deployment.offline;
    assert.equal(offline.files.length, 24, 'Build the 24-resource combat snapshot before running this proof.');
    assert.equal(offline.entry, '/play-cyberworld/ascension.html');
    assert(offline.version.startsWith('cw-ascension-play-'));
    assert(offline.files.every(name => name.startsWith('/play-cyberworld/')));
    report.snapshot = { version: offline.version, resources: offline.files.length };
    const worldBytes = fs.readFileSync(path.join(mount, 'ascension-world3d.js'));
    report.world_sha256 = hash(worldBytes);
    server = http.createServer((request, response) => {
      requests++;
      let pathname;
      try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
      catch (_) { response.writeHead(400).end(); return; }
      if (!pathname.startsWith('/play-cyberworld/')) { response.writeHead(404).end(); return; }
      const relative = pathname.slice('/play-cyberworld/'.length) || 'index.html';
      const file = path.resolve(mount, relative);
      if (!file.startsWith(mount + path.sep)) { response.writeHead(403).end(); return; }
      fs.readFile(file, (error, bytes) => {
        if (error) { response.writeHead(404).end(); return; }
        response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
          'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }).end(bytes);
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 15000 });
    context = await browser.newContext({ viewport: { width: 1440, height: 960 }, serviceWorkers: 'allow',
      acceptDownloads: true, reducedMotion: 'no-preference' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    if (context.routeWebSocket) await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(8000); page.setDefaultNavigationTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + offline.entry, { waitUntil: 'domcontentloaded' });
    await page.locator('#cwas-begin').click();
    await page.locator('#cwas-handle').fill(callsign);
    await page.locator('#cwas-creator-form button[type="submit"]').click();
    await page.waitForFunction(() => document.body.dataset.phase === 'playing' && window.__cwWorld?.snapshot().diagnostics.characterAsset === 'ready');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const installed = await page.evaluate(async version => {
      await navigator.serviceWorker.ready;
      const cache = await caches.open(version);
      return (await cache.keys()).map(request => new URL(request.url).pathname).sort();
    }, offline.version);
    assert.deepEqual(installed, [...offline.files].sort(), 'All 24 exact public resources are installed.');

    await page.locator('#cwas-combat-open').click();
    await page.waitForFunction(() => window.__cwWorld?.snapshot().combat?.phase === 'active');
    const expected = await page.evaluate(() => window.__cwCombatUI.briefFiles());
    assert.equal(expected.length, 3);
    async function downloadKit(filename) {
      const pending = page.waitForEvent('download', { timeout: 8000 });
      await page.locator('#cwcombat-brief').click();
      const download = await pending;
      assert.equal(download.suggestedFilename(), 'cyberworld-breach-foundry-practice.zip');
      const bytes = fs.readFileSync(await download.path()), entries = unzip(bytes);
      assert.deepEqual([...entries.keys()].sort(), expected.map(file => file.name).sort());
      expected.forEach(file => assert.deepEqual(entries.get(file.name), Buffer.from(file.data, 'utf8'), file.name + ' exactly matches the public guide.'));
      assert.match(entries.get('breach-foundry-field-guide.txt').toString(), /DEFENSIVE COUNTER/);
      assert.equal(JSON.parse(entries.get('defense-counters.json')).live_targets, false);
      if (filename) fs.writeFileSync(path.join(output, filename), bytes);
      return { sha256: hash(bytes), bytes: bytes.length,
        files: [...entries].map(([name, data]) => ({ name, bytes: data.length, sha256: hash(data) })) };
    }
    const onlineKit = await downloadKit();
    await page.locator('#cwcombat-exit').click();
    await page.waitForFunction(() => !window.__cwWorld?.snapshot().combat);
    const identityBefore = await page.evaluate(() => window.__cwGameplay?.state()?.callsign);
    assert.equal(identityBefore, callsign);
    await context.setOffline(true);
    await stopServer(); // Offline proof cannot silently fall back to localhost.
    report.local_server_stopped_before_reload = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#cwas-continue').click();
    await page.waitForFunction(() => document.body.dataset.phase === 'playing' && window.__cwWorld?.snapshot().diagnostics.characterAsset === 'ready');
    assert.equal(await page.evaluate(() => navigator.onLine), false);
    assert.equal(await page.evaluate(() => window.__cwGameplay?.state()?.callsign), callsign);
    await page.locator('#cwas-combat-open').click();
    await page.waitForFunction(() => {
      const state = window.__cwWorld?.snapshot();
      return state?.combat?.phase === 'active' && state.combat.wave === 1 && state.diagnostics.riggedCharacters >= 3 && state.diagnostics.drawCalls > 0;
    });
    const before = await page.evaluate(() => window.__cwWorld.snapshot());
    await page.keyboard.down('w'); await page.waitForTimeout(1100); await page.keyboard.up('w');
    const moved = await page.evaluate(() => window.__cwWorld.snapshot());
    assert(Math.hypot(moved.world.x - before.world.x, moved.world.z - before.world.z) > 1, 'Offline keyboard movement changes the physical operative position.');
    await page.waitForFunction(() => {
      const state = window.__cwWorld?.snapshot();
      return state?.combat?.phase === 'active' && state.combat.enemies.some(enemy => enemy.hp > 0 && Math.hypot(enemy.x - state.world.x, enemy.z - state.world.z) <= 3.1);
    }, null, { timeout: 8000 });
    const scoreBefore = await page.evaluate(() => window.__cwWorld.snapshot().combat.score);
    await page.keyboard.press('j');
    await page.waitForFunction(score => window.__cwWorld.snapshot().combat.score > score && window.__cwWorld.snapshot().combat.events.some(event => event.type === 'hit'), scoreBefore);
    const offlineKit = await downloadKit('breach-foundry-practice-offline.zip');
    assert.deepEqual(offlineKit.files, onlineKit.files, 'Offline downloaded files match the online practice pack byte for byte.');
    const final = await page.evaluate(() => window.__cwWorld.snapshot());
    assert.equal(final.renderer, 'webgl'); assert.equal(final.diagnostics.characterAsset, 'ready');
    assert(final.diagnostics.riggedCharacters >= 3 && final.diagnostics.triangles > 0);
    assert.equal(final.combat.phase, 'active'); assert.equal(final.combat.wave, 1);
    assert.deepEqual(errors, [], 'The complete online/offline flow has no uncaught page errors.');
    await page.screenshot({ path: screenshotPath });
    report.result = 'pass';
    report.checks = ['24 exact cached public resources', 'operative created using the UI', 'online ZIP independently verified',
      'localhost server stopped', 'actual entry reloaded offline', 'saved operative continued using the UI',
      'rigged WebGL arena rendered offline', 'keyboard movement', 'keyboard strike damaged a construct', 'offline ZIP matches online guide'];
    report.offline = { navigator_online: false, controlled: await page.evaluate(() => !!navigator.serviceWorker.controller),
      wave: final.combat.wave, phase: final.combat.phase, score: final.combat.score,
      rigged_characters: final.diagnostics.riggedCharacters, draw_calls: final.diagnostics.drawCalls, triangles: final.diagnostics.triangles,
      keyboard_distance: Number(Math.hypot(moved.world.x - before.world.x, moved.world.z - before.world.z).toFixed(3)), kit: offlineKit };
    report.online_kit = onlineKit; report.local_resource_requests = requests;
    report.screenshot = path.basename(screenshotPath);
  }
  try {
    await Promise.race([work(), new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Offline combat proof exceeded its 60-second limit.')), 60000); })]);
  } catch (error) {
    report.result = 'fail'; report.error = String(error.message || error); throw error;
  } finally {
    clearTimeout(deadline);
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await stopServer();
    report.elapsed_seconds = Number(((Date.now() - started) / 1000).toFixed(3));
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
  console.log('PASS: generated combat mount, exact 24-resource offline snapshot, real rig, UI-only operative, keyboard movement/strike and matching offline practice ZIP.');
  console.log(path.relative(root, reportPath));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
