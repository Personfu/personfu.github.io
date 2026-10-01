import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = readFileSync(resolve(root, 'index.html'), 'utf8');
const atlas = readFileSync(resolve(root, 'repo-atlas.html'), 'utf8');

test('desktop app IDs are unique and local app targets exist', () => {
  const apps = [...desktop.matchAll(/\{id:'([^']+)'[^\n]*?url:'([^']+)'/g)].map((match) => ({ id: match[1], url: match[2] }));
  assert.ok(apps.length >= 30);
  assert.equal(new Set(apps.map((app) => app.id)).size, apps.length);
  for (const app of apps) {
    if (/^https?:\/\//.test(app.url)) continue;
    const target = app.url.split(/[?#]/)[0];
    assert.ok(existsSync(resolve(root, target)), `${app.id} target missing: ${target}`);
  }
});

test('public repo icons visibly identify forks and connect to the complete catalog', () => {
  for (const id of ['repoatlas', 'webatlas', 'signalvault', 'cveintel', 'nasatmat', 'cissql', 'spywatch', 'cybercard', 'stonk']) {
    assert.match(desktop, new RegExp(`id:'${id}'`));
  }
  for (const label of ['Codebreaker Fork', 'CyberFlipper Fork', 'CyberChef Fork']) {
    assert.ok(desktop.includes(label));
  }
  assert.match(atlas, /users\/Personfu\/repos\?type=public/);
  assert.match(atlas, /fork:\!\!r\.fork/);
  assert.match(atlas, /No third-party project is presented as FLLC-owned/);
});

test('atlas and desktop inline JavaScript parse cleanly', () => {
  for (const [name, html] of [['desktop', desktop], ['atlas', atlas]]) {
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
    assert.ok(scripts.length > 0, `${name} has an inline application script`);
    for (const script of scripts) new vm.Script(script, { filename: `${name}.inline.js` });
  }
});

test('repo atlas provides safe external links, search, tabs, and a compact load-more path', () => {
  assert.match(atlas, /rel='noopener noreferrer'/);
  assert.match(atlas, /id="search"/);
  assert.match(atlas, /id="tab-websites"/);
  assert.match(atlas, /id="more-repos"/);
  assert.match(atlas, /list\.slice\(0,visibleRepos\)/);
  assert.match(desktop, /return path\+sep\+'cw_frame='\+Date\.now\(\)\+fragment/);
});
