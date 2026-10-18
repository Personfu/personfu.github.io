'use strict';
// Bundle original browser scene sources and the pinned Three.js dependency.
// The committed output is served directly by GitHub Pages; no source maps or
// network/CDN imports are required at runtime.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const entries = ['ascension-world3d', 'ascension-response3d'];
for (const name of entries) {
  const source = path.join(root, 'CyberWorld', 'src', name + '.js');
  if (!fs.existsSync(source)) {
    console.error('3D source is not ready: ' + path.relative(root, source));
    process.exitCode = 1;
  }
}
if (!process.exitCode) {
  const registry = spawnSync(process.execPath, ['scripts/ascension-asset-registry.cjs'], { cwd: root, stdio: 'inherit' });
  if (registry.status !== 0) process.exit(registry.status || 1);
  for (const name of entries) {
    esbuild.buildSync({
      absWorkingDir: root,
      entryPoints: ['CyberWorld/src/' + name + '.js'],
      outfile: 'CyberWorld/' + name + '.js',
      bundle: true,
      platform: 'browser',
      format: 'iife',
      target: 'es2022',
      minify: true,
      sourcemap: false,
      charset: 'utf8',
      legalComments: 'eof',
      logLevel: 'info',
    });
  }
  // A content-derived cache version changes with the exact public runtime,
  // including shared engine assets. A failed update cannot delete an active
  // worker's previous complete snapshot.
  const workerPath = path.join(root, 'CyberWorld/ascension-sw.js');
  const worker = fs.readFileSync(workerPath, 'utf8');
  const hash = crypto.createHash('sha256');
  hash.update(worker.replace(/const VERSION = '[^']+';/, "const VERSION = 'CONTENT_VERSION';"));
  const files = [...new Set([...worker.matchAll(/['"](\/(?:CyberWorld|assets)\/[^'"\n]+\.(?:html|js|css|webmanifest|webp|png|svg|txt))['"]/g)].map(match => match[1]))].sort();
  for (const file of files) { hash.update(file); hash.update(fs.readFileSync(path.join(root, '.' + file))); }
  const version = 'cw-ascension-public-3d-' + hash.digest('hex').slice(0, 16);
  const updated = worker.replace(/const VERSION = '[^']+';/, "const VERSION = '" + version + "';");
  if (updated !== worker) fs.writeFileSync(workerPath, updated);
  console.log('Offline runtime snapshot: ' + version + ' (' + files.length + ' explicit public files).');
}
