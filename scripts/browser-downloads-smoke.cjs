/* Real browser downloads, fixture integrity, earned rewards and evidence inspection. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { crc32: standardCRC32 } = require('node:zlib');
const { chromium } = require('@playwright/test');
const cases = require('../CyberWorld/ascension-data.js').missions;
const files = require('../CyberWorld/ascension-downloads.js');
const root = path.resolve(__dirname, '..');
function unzip(stored) {
  const data = Buffer.from(stored), entries = {};
  let at = 0;
  while (data.readUInt32LE(at) === 0x04034b50) {
    assert.equal(data.readUInt16LE(at + 8), 0);
    const length = data.readUInt32LE(at + 18), names = data.readUInt16LE(at + 26), extra = data.readUInt16LE(at + 28);
    const name = data.subarray(at + 30, at + 30 + names).toString();
    const body = data.subarray(at + 30 + names + extra, at + 30 + names + extra + length);
    assert.equal(standardCRC32(body), data.readUInt32LE(at + 14), `${name} standard CRC32`);
    entries[name] = body; at += 30 + names + extra + length;
  }
  assert.equal(data.readUInt32LE(at), 0x02014b50);
  assert.equal(data.readUInt32LE(data.length - 22), 0x06054b50);
  assert.equal(data.readUInt16LE(data.length - 12), Object.keys(entries).length);
  return entries;
}
function verifyPcap(data) {
  assert.equal(data.readUInt32LE(0), 0xa1b2c3d4); assert.equal(data.readUInt32LE(20), 101);
  let offset = 24, index = 0;
  while (offset < data.length) {
    const size = data.readUInt32LE(offset + 8), ip = data.subarray(offset + 16, offset + 16 + size), record = cases[0].packets[index];
    assert.equal(ip[0], 0x45); assert.equal(ip[9], 17); assert.equal(ip.readUInt16BE(2), size);
    assert.equal(Array.from(ip.subarray(12, 16)).join('.'), record.src);
    let checksum = 0; for (let n = 0; n < 20; n += 2) checksum += ip.readUInt16BE(n); while (checksum >>> 16) checksum = (checksum & 65535) + (checksum >>> 16); assert.equal(checksum, 65535);
    assert.equal(ip.readUInt16BE(24), size - 20); assert.equal(ip.readUInt16BE(26), 0);
    assert.deepEqual(JSON.parse(ip.subarray(28)), record);
    assert.equal(data.readUInt32LE(offset), Math.floor(Number(record.time)));
    offset += 16 + size; index++;
  }
  assert.equal(index, 6); assert.equal(offset, data.length);
}
for (const mission of cases) {
  const original = files.artifacts(mission), entries = unzip(files.zip(original));
  const manifest = JSON.parse(entries['artifact-manifest.json']);
  assert.equal(manifest.case_id, mission.id); assert.equal(manifest.synthetic, true);
  for (const entry of manifest.files) { assert.equal(entries[entry.name].length, entry.bytes); assert.equal(files.crc32(entries[entry.name]).toString(16).padStart(8, '0'), entry.crc32); }
  assert.doesNotMatch(entries['mission-brief.txt'].toString(), /DEBRIEF|HINT LAYERS|ANSWER KEY:/);
  assert.throws(() => files.reward(mission, false, 'QA'), /File this case/);
}
verifyPcap(unzip(files.zip(files.artifacts(cases[0])))['dispatcher-capture.pcap']);
assert.equal(unzip(files.zip(files.artifacts(cases[5])))['reviewed-build.bin'].toString(), 'abc');
assert.equal(unzip(files.zip(files.artifacts(cases[5])))['customer-package.bin'].toString(), 'abd');
async function main() {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json', '.glb': 'model/gltf-binary' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (error, data) => { if (error) return res.writeHead(404).end(); res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(data); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/CyberWorld/ascension.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__cwAscension && window.CW_ASCENSION_DOWNLOADS);
    await page.locator('#cwas-begin').click(); await page.locator('#cwas-handle').fill('FILE-OPERATIVE'); await page.locator('#cwas-creator-form button[type=submit]').click();
    await page.waitForFunction(() => document.body.dataset.phase === 'playing');
    await page.evaluate(() => window.__cwAscension.startMission('route-zero'));
    assert.equal(await page.locator('[data-action=reward-download]').count(), 0);
    await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'reward-download'; b.dataset.value = 'route-zero'; b.id = 'forged-reward'; document.querySelector('.cwas-dialog-content').appendChild(b); });
    await page.locator('#forged-reward').click(); assert.match(await page.locator('#cwas-status').innerText(), /File the case before/);
    async function capture(selector) { const event = page.waitForEvent('download'); await page.locator(selector).click(); const download = await event; return { name: download.suggestedFilename(), data: fs.readFileSync(await download.path()) }; }
    const mission = await capture('[data-action=case-download]'); assert.equal(mission.name, 'cyberworld-route-zero-mission.zip'); const entries = unzip(mission.data); verifyPcap(entries['dispatcher-capture.pcap']);
    assert.deepEqual(JSON.parse(entries['packet-records.json']), cases[0].packets);
    await page.locator('[data-action=case-inspect]').click();
    await page.locator('[data-evidence-file]').selectOption({ label: `packet-records.csv / ${entries['packet-records.csv'].length} bytes` });
    await page.locator('[data-evidence-search]').fill('10.77.4.23'); assert.match(await page.locator('[data-evidence-summary]').innerText(), /3 text matches/); assert.equal((await page.locator('[data-evidence-output]').innerText()).split('\n').length, 3);
    await page.locator('[data-evidence-mode=hex]').click(); assert.match(await page.locator('[data-evidence-output]').innerText(), /^000000  22 74 69 6d 65/);
    const csv = await capture('[data-evidence-download]'); assert.equal(csv.name, 'packet-records.csv'); assert.deepEqual(csv.data, entries['packet-records.csv']);
    await page.locator('[data-action=mission]').click(); await page.locator('[data-action=investigate]').click();
    await page.locator('[name=source]').selectOption('10.77.4.23'); await page.locator('[name=order]').fill('1,2,3'); await page.locator('[name=message]').fill('ROUTE OVERRIDE'); await page.locator('[name=evidence]').selectOption('unauthorized'); await page.locator('[data-puzzle] button[type=submit]').click();
    for (const action of ['snapshot', 'isolate', 'rotate', 'restore', 'verify']) await page.locator(`[data-action=respond][data-value=${action}]`).click();
    await page.locator('[data-action=debrief]').click(); assert.equal(await page.locator('[data-action=reward-download]').count(), 0); await page.locator('[data-action=complete]').click();
    await page.evaluate(() => { const state = window.__cwAscension.exportState(); state.notes = 'PRIVATE-NOTE-NEVER-EXPORT'; window.__cwAscension.importState(state); });
    const rewards = await capture('[data-action=reward-download]'), earned = unzip(rewards.data), receipt = JSON.parse(earned['module-receipt.json']);
    assert.equal(receipt.module, 'TRAFFIC-LENS'); assert.equal(receipt.callsign, 'FILE-OPERATIVE'); assert.equal(receipt.official_certification, false); assert.match(earned['route-zero-badge.svg'].toString(), /<svg/); assert.match(earned['achievement-certificate.txt'].toString(), /not an official agency award/); assert.doesNotMatch(rewards.data.toString(), /PRIVATE-NOTE-NEVER-EXPORT/);
    await page.evaluate(() => window.__cwAscension.openDeck('inventory')); assert.equal(await page.locator('[data-action=reward-download]').count(), 1);
    await page.evaluate(() => window.__cwAscension.openDeck('arcade')); await page.locator('[data-action=arcade-start]').click(); for (const answer of ['DNS', 'HTTPS', 'NTP', 'DNS', 'HTTPS', 'NTP', 'DNS', 'HTTPS']) await page.locator(`[data-action=arcade-answer][data-value=${answer}]`).click(); assert.match(await page.locator('.cwas-panel strong').first().innerText(), /8 \/ 8/);
    assert.deepEqual(errors, []);
    console.log('PASS: 7 evidence packs, ZIP CRC32 manifests, valid 6-record PCAP, actual browser downloads, reward gating, byte inspector search/hex/file export, private-note exclusion, and immediate arcade best.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
if (process.argv.includes('--fixtures-only')) console.log('Mission artifacts: seven ZIPs, standard CRC32 and six exact synthetic PCAP records verified.');
else main().catch(error => { console.error(error); process.exitCode = 1; });
