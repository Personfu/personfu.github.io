#!/usr/bin/env node
'use strict';

// Verify the existing GitHub Pages subtree. This script never deploys or changes
// hosting settings. The release marker identifies the expected static payload.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const GOVINT = path.join(ROOT, 'GovINT');
const ORIGINAL_URL = 'https://personfu.github.io/GovINT/';
const MAX_WAIT_MS = 8 * 60 * 1000;
const POLL_INTERVAL_MS = 10 * 1000;

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readRelease() {
  const release = JSON.parse(fs.readFileSync(path.join(GOVINT, 'release.json'), 'utf8'));
  if (!release.id || typeof release.id !== 'string') throw new Error('The release marker needs an id.');
  if (release.url !== ORIGINAL_URL) throw new Error(`The release URL must remain ${ORIGINAL_URL}`);
  if (release.source_repository !== 'Personfu/personfu.github.io' || release.source_directory !== 'GovINT') {
    throw new Error('The release must identify the original public Pages repository and GovINT directory.');
  }
  if (!release.files || !Object.keys(release.files).length) throw new Error('No critical release files are recorded.');
  for (const [name, hash] of Object.entries(release.files)) {
    const resolved = path.resolve(GOVINT, name);
    if (!resolved.startsWith(GOVINT + path.sep) || path.isAbsolute(name) || !/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error(`Invalid release file or SHA-256: ${name}`);
    }
  }
  return release;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in GovINT: ${filename}`);
    return entry.isDirectory() ? walk(filename) : [filename];
  });
}

function decodeEntities(text) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (whole, code) => {
    if (code[0] === '#') return String.fromCodePoint(parseInt(code.slice(code[1].toLowerCase() === 'x' ? 2 : 1), code[1].toLowerCase() === 'x' ? 16 : 10));
    return named[code.toLowerCase()] || whole;
  });
}

function validateReference(value, filename, errors) {
  value = decodeEntities(value.trim());
  if (!value || value.startsWith('#')) return;
  let url;
  try {
    const localPath = path.relative(ROOT, filename).split(path.sep).join('/');
    url = new URL(value, new URL(localPath, 'https://personfu.github.io/'));
  } catch {
    errors.push(`${path.relative(ROOT, filename)} has an invalid local URL: ${value}`);
    return;
  }
  if (url.origin !== 'https://personfu.github.io') return;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { errors.push(`${path.relative(ROOT, filename)} has an invalid encoded URL: ${value}`); return; }
  let target = path.join(ROOT, pathname);
  if (!fs.existsSync(target)) {
    errors.push(`${path.relative(ROOT, filename)} → ${value}`);
    return;
  }
  if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) errors.push(`${path.relative(ROOT, filename)} → ${value} (no file/index)`);
}

function checkCss(css, filename, errors) {
  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) validateReference(match[2], filename, errors);
  for (const match of css.matchAll(/@import\s+(['"])(.*?)\1/g)) validateReference(match[2], filename, errors);
}

function verifyLocal(release = readRelease()) {
  for (const [name, expected] of Object.entries(release.files)) {
    const filename = path.join(GOVINT, name);
    if (!fs.existsSync(filename) || sha256(fs.readFileSync(filename)) !== expected) throw new Error(`Critical release hash mismatch: ${name}`);
  }
  const files = walk(GOVINT);
  const errors = [];
  let htmlCount = 0;
  let cssCount = 0;
  let jsCount = 0;
  for (const filename of files) {
    const extension = path.extname(filename).toLowerCase();
    if (extension === '.html') {
      htmlCount++;
      const html = fs.readFileSync(filename, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      // Inline JavaScript can contain HTML examples; only parse actual elements.
      const markup = html.replace(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi, '<script$1></script>');
      for (const match of markup.matchAll(/\b(?:href|src|poster|action)\s*=\s*(["'])(.*?)\1/gi)) validateReference(match[2], filename, errors);
      for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) checkCss(match[1], filename, errors);
    } else if (extension === '.css') {
      cssCount++;
      checkCss(fs.readFileSync(filename, 'utf8'), filename, errors);
    } else if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
      jsCount++;
      try { childProcess.execFileSync(process.execPath, ['--check', filename], { stdio: 'pipe' }); }
      catch (error) { errors.push(`JavaScript syntax failure: ${path.relative(ROOT, filename)}\n${String(error.stderr || error.message).slice(0, 2000)}`); }
    }
  }
  if (errors.length) throw new Error(`GovINT static verification failed:\n${errors.join('\n')}`);
  console.log(`Verified ${release.id}: ${Object.keys(release.files).length} critical hashes, ${htmlCount} HTML files, ${cssCount} stylesheets and ${jsCount} JavaScript files.`);
  return { criticalFiles: Object.keys(release.files).length, htmlCount, cssCount, jsCount };
}

async function verifyLive(release = readRelease(), options = {}) {
  const fetcher = options.fetcher || global.fetch;
  const now = options.now || Date.now;
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = Math.min(options.timeoutMs ?? MAX_WAIT_MS, MAX_WAIT_MS);
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const deadline = now() + timeoutMs;
  let attempt = 0;
  let lastFailure = 'The expected release has not been served yet.';
  async function retrieve(relative, nonce) {
    const remaining = deadline - now();
    if (remaining <= 0) throw new Error('Publication verification deadline reached.');
    const url = new URL(relative, ORIGINAL_URL);
    url.searchParams.set('govint_release_check', `${release.id}.${nonce}`);
    const response = await fetcher(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(Math.max(1, Math.min(15000, remaining))) });
    if (!response.ok) throw new Error(`${relative}: HTTP ${response.status}`);
    if (response.url && new URL(response.url).origin !== new URL(ORIGINAL_URL).origin) throw new Error(`${relative}: redirected away from the original GitHub Pages host.`);
    return response;
  }
  while (now() < deadline) {
    attempt++;
    try {
      const marker = await retrieve('release.json', `${attempt}.marker`);
      const live = await marker.json();
      if (live.id !== release.id) throw new Error(`release.json is serving ${JSON.stringify(live.id)}, expected ${release.id}.`);
      for (const [name, expected] of Object.entries(release.files)) {
        if (live.files?.[name] !== expected) throw new Error(`release.json has an older or different hash for ${name}.`);
      }
      await Promise.all(Object.entries(release.files).map(async ([name, expected], index) => {
        const response = await retrieve(name, `${attempt}.${index}`);
        if (sha256(Buffer.from(await response.arrayBuffer())) !== expected) throw new Error(`The original URL is still serving different bytes for ${name}.`);
      }));
      const message = `Verified LIVE: ${ORIGINAL_URL} serves ${release.id} and all ${Object.keys(release.files).length} critical file hashes.`;
      console.log(message);
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## GovINT original URL verified\n\n${message}\n`);
      return { url: ORIGINAL_URL, id: release.id, criticalFiles: Object.keys(release.files).length, attempts: attempt };
    } catch (error) {
      lastFailure = error.message;
      console.log(`Publication check ${attempt}: ${lastFailure}`);
    }
    const remaining = deadline - now();
    if (remaining > 0) await sleep(Math.min(intervalMs, remaining));
  }
  throw new Error(`The original GitHub Pages URL did not serve the expected release within ${Math.round(timeoutMs / 1000)} seconds. Last result: ${lastFailure}`);
}

module.exports = { readRelease, sha256, verifyLocal, verifyLive };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--local', '--live'].includes(arg)) || args.includes('--local') && args.includes('--live')) {
    console.error('Usage: node scripts/verify-govint-release.cjs [--local|--live]');
    process.exitCode = 2;
  } else {
    Promise.resolve(args.includes('--live') ? verifyLive() : verifyLocal()).catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
