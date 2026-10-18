'use strict';
// Static-site verification. No source rewriting, deployment or legacy rebundling.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
const errors = [];
function fail(message) { errors.push(message); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function exists(file) { try { return fs.statSync(path.join(root, file)).isFile(); } catch (_) { return false; } }
function javascriptFiles() {
  const sources = fs.existsSync(path.join(root, 'CyberWorld/src')) ? fs.readdirSync(path.join(root, 'CyberWorld/src')).filter(name => /^ascension-.*\.js$/.test(name)).map(name => 'CyberWorld/src/' + name) : [];
  return fs.readdirSync(path.join(root, 'CyberWorld')).filter(name => /^ascension-.*\.js$/.test(name)).map(name => 'CyberWorld/' + name)
    .concat(sources, ['CyberWorld/cw-world.js', 'CyberWorld/gameplay.js', 'sw.js', 'scripts/test_ascension_net.cjs', 'scripts/test_ascension_sw.cjs', 'scripts/test-ascension-unit.cjs', 'scripts/build-ascension-3d.cjs', 'scripts/ascension-asset-registry.cjs', 'scripts/benchmark-ascension.cjs', 'scripts/probe-ascension-peers.cjs', 'scripts/validate-static.cjs']);
}
function bundled(file) { return /^CyberWorld\/ascension-(?:world|response)3d\.js$/.test(file); }
function lint() {
  const files = javascriptFiles();
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    if (result.status !== 0) fail(file + ': ' + (result.stderr || result.error?.message || 'JavaScript syntax check failed'));
    if (/\/ascension-/.test(file) && !bundled(file)) {
      const source = read(file);
      if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(source)) fail(file + ': dynamic code execution is outside the browser simulation boundary');
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsb_secret_[A-Za-z0-9_]+|\bsk_live_[A-Za-z0-9]+/.test(source)) fail(file + ': private key or production secret found in browser source');
    }
  }
  const html = read('CyberWorld/ascension.html');
  let inlineCount = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
    inlineCount++;
    try { new vm.Script(match[2], { filename: 'ascension.html inline script ' + inlineCount }); }
    catch (error) { fail(error.message); }
  }
  console.log('Scoped JavaScript syntax and simulation-boundary lint: ' + files.length + ' files, ' + inlineCount + ' inline scripts.');
}

function build() {
  const visited = new Set();
  let references = 0;
  function resolveReference(from, raw, recurse) {
    const value = raw.replace(/&amp;/g, '&').trim();
    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return;
    let clean;
    try { clean = decodeURIComponent(value.split(/[?#]/)[0]); } catch (_) { fail(from + ': malformed local URL ' + value); return; }
    if (!clean) return;
    const resolved = clean.startsWith('/') ? path.resolve(root, '.' + clean) : path.resolve(root, path.dirname(from), clean);
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { fail(from + ': local reference escapes static root: ' + value); return; }
    let target = relative.replace(/\\/g, '/');
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) target = target.replace(/\/$/, '') + '/index.html';
    references++;
    if (!exists(target)) { fail(from + ': missing local asset ' + value + ' -> ' + target); return; }
    if (recurse && /\.(?:css|webmanifest)$/i.test(target)) visit(target);
  }
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    if (!exists(file)) { fail('Missing static entry ' + file); return; }
    const source = read(file);
    if (/\.html$/i.test(file)) {
      for (const match of source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) resolveReference(file, match[1], true);
      for (const match of source.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) match[1].split(',').forEach(item => resolveReference(file, item.trim().split(/\s+/)[0], true));
    } else if (/\.css$/i.test(file)) {
      for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) resolveReference(file, match[1], true);
      for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gi)) resolveReference(file, match[1], true);
    } else if (/\.webmanifest$/i.test(file)) {
      let manifest;
      try { manifest = JSON.parse(source); } catch (error) { fail(file + ': ' + error.message); return; }
      for (const key of ['start_url', 'id']) if (manifest[key]) resolveReference(file, manifest[key], false);
      for (const icon of manifest.icons || []) if (icon.src) resolveReference(file, icon.src, false);
    }
  }
  visit('CyberWorld/ascension.html');
  visit('index.html');
  for (const file of javascriptFiles().filter(file => /\/ascension-/.test(file) && !bundled(file))) {
    for (const match of read(file).matchAll(/["']((?:\.\.?\/|\/|assets\/)[^"'\n]+\.(?:webp|png|jpe?g|svg|ogg|mp3|wav|json))(?:[?#][^"']*)?["']/gi)) resolveReference('CyberWorld/ascension.html', match[1], false);
  }
  const game = read('CyberWorld/ascension.html');
  if (!/window\.CW_ASCENSION\s*=\s*true/.test(game)) fail('Ascension entry must enable its isolated public game mode');
  if (/http-equiv\s*=\s*["']refresh/i.test(game)) fail('Ascension entry must render the game instead of redirecting');
  for (const bundle of ['ascension-world3d.js', 'ascension-response3d.js']) {
    if (!game.includes(bundle)) fail('Public entry must load the local 3D runtime: ' + bundle);
  }
  if (exists('CyberWorld/ascension-sw.js')) {
    const worker = read('CyberWorld/ascension-sw.js');
    const runtimeList = worker.match(/const FILES = \[([\s\S]*?)\];/)[1] + worker.match(/const ENTRY = '[^']+';/)[0];
    const offlineFiles = [...new Set([...runtimeList.matchAll(/['"](\/(?:CyberWorld|assets)\/[^'"\n]+\.(?:html|js|css|webmanifest|webp|png|svg|txt))['"]/g)].map(match => match[1]))];
    let offlineBytes = 0;
    for (const file of offlineFiles) {
      resolveReference('CyberWorld/ascension-sw.js', file, true);
      if (exists(file.slice(1))) offlineBytes += fs.statSync(path.join(root, file.slice(1))).size;
    }
    if (offlineFiles.length > 32 || offlineBytes > 12 * 1024 * 1024) fail('Public offline snapshot exceeds its bounded 32-file / 12 MiB budget');
    console.log('Bounded offline snapshot: ' + offlineFiles.length + ' files, ' + (offlineBytes / 1024 / 1024).toFixed(2) + ' MiB.');
  }
  console.log('Static deployment closure: ' + references + ' local references across ' + visited.size + ' entry/style/manifest files.');
  console.log('The source tree is the GitHub Pages deployment output; no duplicate legacy bundle was generated.');
}
if (mode === 'lint') lint();
else if (mode === 'build') build();
else fail('Usage: node scripts/validate-static.cjs lint|build');
if (errors.length) { errors.forEach(error => console.error(error)); process.exitCode = 1; }
