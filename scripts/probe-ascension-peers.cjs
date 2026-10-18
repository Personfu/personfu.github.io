'use strict';
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const protocol = [], snapshots = [], departure = [];
  function watch(page, label) {
    page.on('pageerror', error => console.log(label + ' PAGE_ERROR ' + error.message));
    page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
      try {
        const frame = JSON.parse(String(payload));
        if (['phx_reply', 'presence_state', 'presence_diff', 'system', 'phx_close', 'phx_error'].includes(frame.event)) protocol.push({ tab: label, event: frame.event, ref: frame.ref,
          status: frame.payload?.status, reason: frame.payload?.response?.reason || frame.payload?.message,
          stateCount: frame.event === 'presence_state' ? Object.keys(frame.payload || {}).length : undefined,
          joins: frame.payload?.joins ? Object.keys(frame.payload.joins).length : undefined,
          leaves: frame.payload?.leaves ? Object.keys(frame.payload.leaves).length : undefined });
      } catch (_) {}
    }));
  }
  try {
    const one = await context.newPage(); watch(one, 'one');
    await one.goto('http://127.0.0.1:4173/CyberWorld/ascension.html', { waitUntil: 'domcontentloaded' });
    await one.waitForFunction(() => window.__cwAscensionShell && window.__cwWorld);
    await one.locator('#cwas-begin').click(); await one.locator('#cwas-handle').fill('TAB-PROBE');
    await one.locator('#cwas-creator-form button[type=submit]').click();
    const two = await context.newPage(); watch(two, 'two');
    await two.goto('http://127.0.0.1:4173/CyberWorld/ascension.html', { waitUntil: 'domcontentloaded' });
    await two.waitForFunction(() => window.__cwAscensionShell);
    await two.locator('#cwas-continue').click();
    for (let second = 0; second <= 20; second += 2) {
      const snapshot = await Promise.all([one, two].map(page => page.evaluate(() => ({ status: window.__cwAscensionNet.status(), peers: window.__cwAscensionNet.peers().map(peer => ({ sessionId: peer.sessionId, transport: peer.transport })) }))));
      snapshots.push({ second, snapshot });
      console.log(JSON.stringify({ second, snapshot }));
      if (second < 20) await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('PROTOCOL ' + JSON.stringify(protocol));
    const otherId = await two.evaluate(() => window.__cwAscensionNet.status().sessionId);
    await two.close();
    for (let second = 0; second <= 20; second += 2) {
      const snapshot = await one.evaluate(id => ({ status: window.__cwAscensionNet.status(), departedStillPresent: window.__cwAscensionNet.peers().some(peer => peer.sessionId === id) }), otherId);
      departure.push({ second, ...snapshot }); console.log('AFTER_CLOSE ' + JSON.stringify(departure.at(-1)));
      if (!snapshot.departedStillPresent) break;
      if (second < 20) await one.waitForTimeout(2000);
    }
    const reciprocal = snapshots.find(({ snapshot }) => snapshot.every(tab => tab.status.mode === 'cloud') &&
      snapshot[0].peers.some(peer => peer.sessionId === snapshot[1].status.sessionId && peer.transport === 'cloud') &&
      snapshot[1].peers.some(peer => peer.sessionId === snapshot[0].status.sessionId && peer.transport === 'cloud'));
    const absent = departure.find(snapshot => !snapshot.departedStillPresent);
    const report = { capturedAt: new Date().toISOString(), browser: await browser.version(),
      networkSourceSha256: crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../CyberWorld/ascension-net.js'))).digest('hex'),
      verified: !!reciprocal && !!absent, reciprocalCloudAtSecond: reciprocal?.second ?? null, departedAbsentAtSecond: absent?.second ?? null,
      snapshots, departure, protocol };
    const output = path.resolve(__dirname, '../docs/benchmarks/ascension-peer-probe.json');
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    if (!report.verified) process.exitCode = 1;
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
