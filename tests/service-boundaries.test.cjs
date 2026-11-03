const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');

function request(port, method, route, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request({ hostname: '127.0.0.1', port, method, path: route,
      headers: payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {},
    }, res => {
      let text = '';
      res.on('data', data => { text += data; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.setTimeout(3000, () => req.destroy(new Error('Fixture request timeout')));
    req.on('error', reject);
    req.end(payload);
  });
}

async function fixture(t, service) {
  const entry = path.resolve(__dirname, '..', service, 'server.js');
  const source = `
    let outbound = 0, nvd = null;
    global.fetch = async (url, options) => {
      outbound++;
      if (String(url).startsWith('https://services.nvd.nist.gov/rest/json/cves/2.0?')) {
        nvd = { keyInUrl: String(url).includes(process.env.NVD_API_KEY),
          headerCorrect: options.headers.apiKey === process.env.NVD_API_KEY, redirect: options.redirect };
        return { ok: true, status: 200, json: async () => ({ vulnerabilities: [], totalResults: 0 }) };
      }
      throw new Error('Outbound network forbidden in fixture');
    };
    const loaded = require(${JSON.stringify(entry)});
    const server = loaded.server || require('node:http').createServer(loaded.app);
    server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
    process.on('message', () => process.send({ outbound, nvd }));
  `;
  const child = spawn(process.execPath, ['-e', source], {
    cwd: path.dirname(entry), windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: { ...process.env, NODE_ENV: 'test', PORT: '0', DATABASE_URL: '', REDIS_URL: '',
      STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', JWT_SECRET: 'isolated-fixture-signing-material-not-a-real-key',
      NVD_API_KEY: 'isolated-nvd-fixture-never-valid', ADMIN_KEY: 'isolated-admin-fixture', MSF_RPC_URL: 'http://127.0.0.1:1',
      MSF_RPC_PASS: 'isolated-rpc-fixture', MSF_GW_URL: 'http://127.0.0.1:1', ORIZON_URL: 'http://127.0.0.1:1' },
  });
  t.after(() => child.kill());
  const [message] = await Promise.race([
    once(child, 'message'),
    once(child, 'exit').then(() => { throw new Error('Fixture failed to start'); }),
  ]);
  return { child, port: message.port, async outboundCount() {
    const result = once(child, 'message'); child.send('count'); return (await result)[0].outbound;
  } };
}

test('catalog service cannot forward commands even with RPC configuration present', { timeout: 15000 }, async t => {
  const f = await fixture(t, 'msf-service');
  const simulation = await request(f.port, 'POST', '/api/console', { command: 'help' });
  assert.equal(simulation.status, 200);
  assert.notEqual(simulation.body.mode, 'live');
  const live = await request(f.port, 'POST', '/api/console/live', { command: 'help' });
  assert.ok([403, 410].includes(live.status));
  assert.equal(await f.outboundCount(), 0);
});

test('multiplayer backend rejects arbitrary targets and live gateways without leaking diagnostics', { timeout: 15000 }, async t => {
  const f = await fixture(t, 'multiplayer-server');
  for (const target of ['http://127.0.0.1', 'http://[::1]', 'https://training.invalid', 'http://127.0.0.1.nip.io']) {
    const response = await request(f.port, 'GET', '/api/tools/headers?url=' + encodeURIComponent(target));
    assert.equal(response.status, 410);
    assert.equal(response.body.mode, 'simulation-only');
  }
  for (const route of ['/api/osint/rdap?domain=training.invalid', '/api/osint/dns?domain=training.invalid']) {
    assert.equal((await request(f.port, 'GET', route)).status, 410);
  }
  for (const route of ['/api/msf-gw/console', '/api/orizon/scan']) {
    assert.equal((await request(f.port, 'POST', route, { command: 'help' })).status, 410);
  }
  assert.equal((await request(f.port, 'GET', '/api/stats')).status, 403);
  assert.equal(await f.outboundCount(), 0);
  const intel = await request(f.port, 'GET', '/api/threat/nvd?q=fixture');
  assert.equal(intel.status, 200);
  const state = once(f.child, 'message'); f.child.send('state');
  const transport = (await state)[0].nvd;
  assert.equal(transport.keyInUrl, false);
  assert.equal(transport.headerCorrect, true);
  assert.equal(transport.redirect, 'error');
});
