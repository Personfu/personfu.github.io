const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
const source = readFileSync(join(root, 'sw.js'), 'utf8');
const handlers = new Map();
const origin = 'https://personfu.github.io';
vm.runInNewContext(source, {
  URL,
  Response,
  self: {
    location: { origin },
    addEventListener: (name, handler) => handlers.set(name, handler),
  },
  caches: { keys: async () => [] },
}, { filename: 'sw.js' });

assert.equal(typeof handlers.get('fetch'), 'function', 'Root worker must register a fetch handler');
function navigate(path, mode = 'navigate') {
  let response;
  const url = path.startsWith('http') ? path : origin + path;
  handlers.get('fetch')({ request: { mode, url }, respondWith: (value) => { response = value; } });
  return response;
}

for (const route of [
  '/CyberWorld_login/',
  '/CyberWorld_login/index.html',
  '/CyberWorld_login/lab.html',
  '/CyberWorld_login/defender-path.html',
  '/CyberWorld_login/crypto.html',
  '/CyberWorld_login/intercept.html',
  '/ctf-trail.html',
]) assert.equal(navigate(route), undefined, `Public training route was redirected: ${route}`);

for (const route of [
  '/CyberWorld/',
  '/CyberWorld/index.html',
  '/rpg/login.html',
  '/legacy/index.html',
  '/simulator/index.html',
]) {
  const response = navigate(route);
  assert.equal(response?.status, 302, `Member route lost its redirect: ${route}`);
  assert.equal(response.headers.get('location'), 'https://www.fllc.net/cyberworld');
}
assert.equal(navigate('/CyberWorld_login/api/v1/debug/echo', 'cors'), undefined, 'CTF API subrequests must be left to its scoped worker');
assert.equal(navigate('https://other.invalid/CyberWorld/'), undefined, 'Cross-origin navigation must not be redirected');

const gate = readFileSync(join(root, 'CyberWorld_login', 'index.html'), 'utf8');
const trainingWorker = readFileSync(join(root, 'CyberWorld_login', 'sw-ctf.js'), 'utf8');
const casebook = readFileSync(join(root, 'CyberWorld_login', 'defender-path.html'), 'utf8');
const ctfTrail = readFileSync(join(root, 'ctf-trail.html'), 'utf8');
assert.match(gate, /serviceWorker\.register\("sw-ctf\.js",\s*\{\s*scope:\s*"\.\/"\s*\}\)/);
assert.match(trainingWorker, /const SCOPE\s*=\s*"\/CyberWorld_login\/"/);
assert.match(casebook, /href="\.\.\/ctf-trail\.html"/);
assert.match(ctfTrail, /href="\/CyberWorld_login\/challenge\.html"/);
assert.match(ctfTrail, /href="\/CyberWorld_login\/defender-path\.html"/);
assert.doesNotMatch(ctfTrail, /<script\b|<form\b/i, 'Public CTF index must not contain a member-only runtime or login form');
console.log('Root service worker leaves public CTF pages to the training scope and still redirects protected legacy routes.');
