// Optional local UI smoke: node scripts/smoke_defender_path_browser.mjs
// Uses an installed Chrome/Chromium and its DevTools protocol; no npm package required.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CASES } = require('../CyberWorld_login/defender-path.js');

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const page = pathToFileURL(join(repo, 'CyberWorld_login', 'defender-path.html')).href;
const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'google-chrome');
const profile = await mkdtemp(join(tmpdir(), 'cw-defender-smoke-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, page
], { stdio: 'ignore', windowsHide: true });

let socket;
try {
  let port;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await new Promise((done) => setTimeout(done, 100)); }
  }
  assert.ok(port, 'Chrome did not expose its debugging port');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const tab = tabs.find((item) => item.type === 'page' && item.url.startsWith('file:'));
  assert.ok(tab, 'Defender Path tab did not open');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', fail, { once: true }); });
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const reply = JSON.parse(event.data);
    if (!reply.id || !pending.has(reply.id)) return;
    const { done, fail } = pending.get(reply.id); pending.delete(reply.id);
    if (reply.error) fail(new Error(reply.error.message)); else done(reply.result);
  });
  function command(method, params) {
    const id = nextId++;
    return new Promise((done, fail) => { pending.set(id, { done, fail }); socket.send(JSON.stringify({ id, method, params })); });
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    ready = await evaluate("document.readyState === 'complete' && document.querySelectorAll('.mission').length === 10");
    if (ready) break;
    await new Promise((done) => setTimeout(done, 100));
  }
  assert.ok(ready, 'Ten case buttons did not render');
  assert.equal(await evaluate("document.getElementById('progress-meter').getAttribute('aria-valuenow')"), '0');

  await evaluate("document.querySelector('input[value=reply]').click();document.querySelector('.question button[type=submit]').click()");
  assert.equal(await evaluate("!!document.querySelector('.feedback.bad')"), true, 'Wrong-answer feedback missing');
  assert.equal(await evaluate("document.getElementById('progress-meter').getAttribute('aria-valuenow')"), '0');
  await evaluate("[...document.querySelectorAll('.actions button')].find(b=>b.textContent==='SHOW HINT').click()");
  assert.equal(await evaluate("!!document.querySelector('.hint')"), true, 'Hint did not open');
  await evaluate("document.querySelector('input[value=pressure]').click();document.querySelector('.question button[type=submit]').click()");
  assert.equal(await evaluate("!!document.querySelector('.feedback.ok')"), true, 'Correct-answer explanation missing');
  assert.equal(await evaluate("document.getElementById('progress-meter').getAttribute('aria-valuenow')"), '10');
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('cyberworld.defender-path.v1'))"), ['d01']);

  for (let index = 1; index < CASES.length; index++) {
    const c = CASES[index];
    const scrollBefore = await evaluate('window.scrollY');
    await evaluate(`document.querySelectorAll('.mission')[${index}].click()`);
    assert.equal(await evaluate("document.querySelector('.case .tag').textContent"), `${c.stage} · path ${c.range} · ${c.id.toUpperCase()}`);
    assert.equal(await evaluate('window.scrollY'), scrollBefore, `${c.id} selection jumped the page`);
    assert.equal(await evaluate("document.activeElement.classList.contains('mission')"), true, `${c.id} lost keyboard focus`);
    const expected = JSON.stringify(c.expected);
    const solve = `(() => {
      const answer=${expected}; const form=document.querySelector('.question');
      if (${JSON.stringify(c.type)}==='single') form.querySelector('input[value="'+answer+'"]').click();
      else if (${JSON.stringify(c.type)}==='multi') answer.forEach(id=>form.querySelector('input[value="'+id+'"]').click());
      else if (${JSON.stringify(c.type)}==='order') answer.forEach((id,i)=>form.querySelector('select[name="'+(i+1)+'"]').value=id);
      else if (${JSON.stringify(c.type)}==='match') Object.entries(answer).forEach(([id,value])=>form.querySelector('select[name="'+id+'"]').value=value);
      else form.querySelector('input[name="estimate"]').value=String(answer);
      form.querySelector('button[type="submit"]').click();
    })()`;
    await evaluate(solve);
    const closure = await evaluate("({ok:!!document.querySelector('.feedback.ok'),feedback:document.querySelector('.feedback')?.textContent,values:[...document.querySelectorAll('.question select')].map(s=>s.value)})");
    assert.equal(closure.ok, true, `${c.id} did not close: ${JSON.stringify(closure)}`);
    assert.equal(await evaluate("document.getElementById('progress-meter').getAttribute('aria-valuenow')"), String((index + 1) * 10));
  }
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('cyberworld.defender-path.v1')).length"), 10);

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Mobile body overflows horizontally');
  console.log('Defender Path browser smoke passed: wrong answer, hint, all ten cases, focus, no scroll jump, and 390px layout.');
} finally {
  socket?.close();
  chrome.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
