'use strict';
// Deterministic, public-only mirror. CyberWorld/ remains the maintained source;
// no private project checkout, Git revision or account application is required.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const basePath = '/play-cyberworld';
const cachePrefix = 'cw-ascension-play-';
const requiredFiles = [
  'ascension.html', 'ascension.webmanifest', 'ascension.css',
  'ascension-campaign.css', 'gameplay.css', 'cw-academy.css', 'cw-world.css',
  'gameplay.js', 'cw-academy.js', 'ascension-net.js', 'ascension-data.js',
  'ascension-campaign.js', 'ascension-downloads.js', 'ascension-city.js', 'ascension-field.js', 'ascension-shell.js',
  'ascension-world3d.js', 'ascension-response3d.js', 'ascension-sw.js',
  'THIRD_PARTY_LICENSES.txt', 'assets/favicon.svg',
  'assets/cyberworld/operative-sprite.svg', 'assets/cyberworld/data-shard.svg',
  'assets/cyberworld/watcher-daemon.svg', 'assets/cyberworld/sentinel-ice.svg',
  'assets/cyberworld/firewall-tower.svg', 'assets/cyberworld/exfil-gate.svg',
  'assets/cyberworld/models/Character.glb',
  'assets/cyberworld/models/CHARACTER-LICENSE.md',
];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function inventory(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('Public runtime symlink is forbidden: ' + name);
    return entry.isDirectory() ? inventory(path.join(directory, entry.name), name + '/') : [name];
  }).sort();
}
function validateModel(bytes) {
  if (bytes.length < 28 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Incomplete glTF 2 character binary.');
  const jsonLength = bytes.readUInt32LE(12), binaryOffset = 20 + jsonLength;
  if (bytes.toString('ascii', 16, 20) !== 'JSON' || binaryOffset + 8 > bytes.length) throw new Error('Invalid character JSON chunk.');
  const document = JSON.parse(bytes.toString('utf8', 20, binaryOffset));
  const binaryLength = bytes.readUInt32LE(binaryOffset);
  if (bytes.toString('ascii', binaryOffset + 4, binaryOffset + 8) !== 'BIN\0' || binaryOffset + 8 + binaryLength !== bytes.length) throw new Error('Invalid character binary chunk.');
  if (!document.buffers?.length || document.buffers.some(buffer => buffer.uri !== undefined || buffer.byteLength > binaryLength) || (document.images ?? []).some(image => image.uri !== undefined)) throw new Error('Character dependencies must be embedded.');
  if (!document.skins?.length || !document.animations?.length) throw new Error('Character rig and animations are required.');
}
function replaceContract(source, before, after, label) {
  if (!source.includes(before)) throw new Error('Source contract changed: ' + label);
  return source.replace(before, after);
}
function workerContract(source) {
  const context = { URL, Request, Response, Set, Promise, self: { addEventListener() {} } };
  const result = vm.runInNewContext(source + '\n({ files: FILES, entry: ENTRY, prefix: PREFIX, version: VERSION });', context);
  const files = Array.from(result.files);
  if (files.length !== 22 || new Set(files).size !== 22 || result.entry !== basePath + '/ascension.html' || result.prefix !== cachePrefix || !result.version.startsWith(cachePrefix)) throw new Error('Public offline snapshot must contain exactly 22 isolated resources.');
  if (files.some(url => !url.startsWith(basePath + '/') || /(?:^|\/)(?:api|auth|login|account|member)(?:\/|\.)/i.test(url))) throw new Error('Offline snapshot escaped the public game.');
  return { files: files.sort(), entry: result.entry, prefix: result.prefix, version: result.version };
}
function contentVersion(files) {
  const hash = crypto.createHash('sha256');
  for (const name of [...files.keys()].sort()) {
    const bytes = name === 'ascension-sw.js'
      ? Buffer.from(files.get(name).toString('utf8').replace(/const VERSION = '[^']+';/, "const VERSION = 'CONTENT_VERSION';"))
      : files.get(name);
    hash.update(name + '\0' + bytes.length + '\0').update(bytes);
  }
  return cachePrefix + hash.digest('hex').slice(0, 16);
}
function prepare(sourceRoot = root) {
  const files = new Map(), sources = [];
  for (const name of requiredFiles) {
    const sourceName = name === 'assets/favicon.svg' ? name : 'CyberWorld/' + name;
    const absolute = path.join(sourceRoot, sourceName);
    if (!fs.lstatSync(absolute).isFile()) throw new Error('Source must be a regular file: ' + sourceName);
    const original = fs.readFileSync(absolute);
    const bytes = name.endsWith('.glb') ? original : Buffer.from(original.toString('utf8').replace(/\r\n?/g, '\n'));
    if (name.endsWith('.glb')) validateModel(bytes);
    if (name.endsWith('.js')) new vm.Script(bytes.toString('utf8'), { filename: sourceName });
    files.set(name, bytes);
    sources.push({ path: sourceName, sha256: digest(bytes), bytes: bytes.length });
  }
  let entry = files.get('ascension.html').toString('utf8');
  entry = replaceContract(entry, 'href="../assets/favicon.svg"', 'href="assets/favicon.svg"', 'HTML favicon');
  entry = replaceContract(entry, 'https://personfu.github.io/CyberWorld/ascension.html', 'https://personfu.github.io' + basePath + '/ascension.html', 'canonical game URL');
  // Optional remote fonts are excluded from this self-contained public mount.
  entry = entry.replace(/^.*<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\s*\n/gm, '');
  if (!entry.includes('window.CW_ASCENSION=true') || /http-equiv\s*=\s*["']refresh/i.test(entry) || /<script\b[^>]*src=["']https?:/i.test(entry)) throw new Error('Public entry must run the local game.');
  files.set('ascension.html', Buffer.from(entry));
  files.set('index.html', Buffer.from(entry));
  let data = files.get('ascension-data.js').toString('utf8');
  for (const [portrait, local] of [['gray_fang', 'watcher-daemon'], ['cinder_veil', 'sentinel-ice'], ['black_specter', 'firewall-tower']]) {
    data = replaceContract(data, '../assets/adversaries/' + portrait + '.svg', 'assets/cyberworld/' + local + '.svg', 'mount-local fictional adversary portrait');
  }
  files.set('ascension-data.js', Buffer.from(data));
  let manifestText = files.get('ascension.webmanifest').toString('utf8');
  manifestText = replaceContract(manifestText, '../assets/favicon.svg', 'assets/favicon.svg', 'manifest favicon');
  const manifest = JSON.parse(manifestText.replaceAll('/CyberWorld/', basePath + '/'));
  files.set('ascension.webmanifest', Buffer.from(JSON.stringify(manifest) + '\n'));
  let worker = files.get('ascension-sw.js').toString('utf8');
  worker = replaceContract(worker, "'/assets/favicon.svg'", "'/CyberWorld/assets/favicon.svg'", 'worker favicon');
  worker = replaceContract(worker, "const PREFIX = 'cw-ascension-public-';", "const PREFIX = '" + cachePrefix + "';", 'isolated worker cache prefix');
  worker = worker.replaceAll('/CyberWorld/', basePath + '/');
  const homePass = "if (request.mode === 'navigate' && (url.pathname === '" + basePath + "/' || url.pathname === '" + basePath + "/index.html')) return;";
  worker = replaceContract(worker, homePass, homePass.replace('return;', '{ event.respondWith(Response.redirect(new URL(ENTRY, self.location.origin).href, 302)); return; }'), 'canonical offline home');
  worker = worker.replace('More-specific ' + basePath + '/ scope retains member gateway redirects.', 'The dedicated public scope retains member gateway redirects.');
  worker = worker.replace("GitHub serves this prefix from Personfu/CyberWorld's project deployment.", 'GitHub serves this dedicated public prefix from the user-site deployment.');
  worker = worker.replace('Its public home launches Ascension; account/member subroutes stay separate.', 'Its public home converges on the canonical offline-capable game entry.');
  files.set('ascension-sw.js', Buffer.from(worker));
  worker = worker.replace(/const VERSION = '[^']+';/, "const VERSION = '" + contentVersion(files) + "';");
  files.set('ascension-sw.js', Buffer.from(worker));
  const offline = workerContract(worker);
  let offlineBytes = 0;
  for (const url of offline.files) {
    const bytes = files.get(url.slice(basePath.length + 1));
    if (!bytes) throw new Error('Unlisted offline dependency: ' + url);
    offlineBytes += bytes.length;
  }
  if (offlineBytes > 12 * 1024 * 1024) throw new Error('Offline snapshot exceeds 12 MiB.');
  return { files, sources, offline: { ...offline, bytes: offlineBytes } };
}
function verifyExport(output, report) {
  const expected = [...requiredFiles, 'index.html'].sort();
  if (JSON.stringify(report.files.map(file => file.path).sort()) !== JSON.stringify(expected)) throw new Error('Export manifest must contain exactly the public game and home alias.');
  if (JSON.stringify(inventory(output)) !== JSON.stringify([...expected, 'ascension-deployment.json'].sort())) throw new Error('Public output contains missing or unlisted files.');
  const known = new Set(expected), files = new Map();
  function check(from, raw, navigation = false) {
    const value = raw.replaceAll('&amp;', '&').trim();
    if (!value || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(value)) return;
    // Deliberate user-site exits remain available without joining the snapshot.
    if (navigation && ['../index.html', '../GovINT/index.html'].includes(value)) return;
    const pathname = new URL(value, 'https://example.invalid' + basePath + '/' + from).pathname;
    if (!pathname.startsWith(basePath + '/')) throw new Error('Runtime dependency escapes public mount: ' + value);
    const name = decodeURIComponent(pathname.slice(basePath.length + 1));
    if (!known.has(name)) throw new Error('Missing public runtime dependency: ' + value);
  }
  for (const file of report.files) {
    const bytes = fs.readFileSync(path.join(output, file.path));
    if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) throw new Error('Export integrity check failed: ' + file.path);
    files.set(file.path, bytes);
    if (file.path.endsWith('.glb')) { validateModel(bytes); continue; }
    const source = bytes.toString('utf8');
    if (source.includes('\r')) throw new Error('Public text must use LF: ' + file.path);
    if (file.path.endsWith('.js')) {
      new vm.Script(source, { filename: file.path });
      for (const match of source.matchAll(/["']((?:\.\.?\/|\/|assets\/)[^"'\n]+\.(?:webp|png|jpe?g|svg|ogg|mp3|wav|json|glb|md))(?:[?#][^"']*)?["']/gi)) check(file.path, match[1]);
    }
    if (file.path.endsWith('.html')) {
      for (const match of source.matchAll(/<([\w-]+)\b[^>]*?\b(src|href)\s*=\s*["']([^"']+)["']/gi)) {
        if (match[1].toLowerCase() !== 'a' && /^(?:https?:)?\/\//i.test(match[3]) && !(match[1].toLowerCase() === 'link' && match[0].includes('rel="canonical"'))) throw new Error('Remote runtime dependency: ' + match[3]);
        check(file.path, match[3], match[1].toLowerCase() === 'a');
      }
    }
    if (file.path.endsWith('.css')) for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) check(file.path, match[1]);
    if (file.path.endsWith('.webmanifest')) {
      const manifest = JSON.parse(source);
      for (const key of ['start_url', 'id']) check(file.path, manifest[key]);
      if (manifest.scope !== basePath + '/') throw new Error('Manifest scope escaped the public mount.');
      for (const icon of manifest.icons ?? []) check(file.path, icon.src);
    }
  }
  const worker = files.get('ascension-sw.js').toString('utf8'), contract = workerContract(worker);
  if (contentVersion(files) !== contract.version || JSON.stringify(contract.files) !== JSON.stringify(report.offline.files) || report.offline.version !== contract.version || report.offline.prefix !== cachePrefix) throw new Error('Public cache version does not match exported bytes.');
  const offlineBytes = contract.files.reduce((sum, url) => sum + files.get(url.slice(basePath.length + 1)).length, 0);
  if (offlineBytes !== report.offline.bytes || offlineBytes > 12 * 1024 * 1024) throw new Error('Offline byte manifest does not match the snapshot.');
  if (!files.get('index.html').equals(files.get('ascension.html'))) throw new Error('Public home must ship the same game.');
  return report;
}
function exportPublic(options = {}) {
  const output = options.output ?? path.join(root, 'play-cyberworld');
  const prepared = prepare(options.sourceRoot ?? root);
  const expected = new Set([...prepared.files.keys(), 'ascension-deployment.json']);
  // Refuse unknown files instead of recursively deleting an arbitrary output.
  if (fs.existsSync(output)) for (const name of inventory(output)) if (!expected.has(name)) throw new Error('Unexpected public output file; review it before export: ' + name);
  for (const [name, bytes] of prepared.files) {
    const target = path.join(output, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  const report = {
    schemaVersion: 1,
    source: { directory: 'CyberWorld/', favicon: 'assets/favicon.svg', contract: 'Explicit 29-file public game allowlist; rebuilt from current maintained source bytes', files: prepared.sources },
    deployment: 'Personfu/personfu.github.io static user-site mount; public game only',
    aliases: [basePath + '/', basePath + '/index.html', basePath + '/ascension.html'],
    transforms: ['UTF-8 text normalized to LF; GLB binary preserved', 'Public mount canonical, manifest and worker paths', 'Mount-local favicon and fictional adversary portrait references; optional remote font links omitted', 'Independent worker cache namespace and content-derived version', 'Public home converges on canonical entry under service-worker control'],
    offline: prepared.offline,
    files: [...prepared.files].map(([name, bytes]) => ({ path: name, sha256: digest(bytes), bytes: bytes.length })),
  };
  fs.writeFileSync(path.join(output, 'ascension-deployment.json'), JSON.stringify(report, null, 2) + '\n');
  return verifyExport(output, report);
}
module.exports = { basePath, cachePrefix, requiredFiles, digest, prepare, exportPublic, verifyExport };
if (require.main === module) {
  const report = exportPublic();
  console.log('Public user-site game: ' + report.files.length + ' verified files; ' + report.offline.files.length + ' offline resources; ' + report.offline.version + '.');
}
