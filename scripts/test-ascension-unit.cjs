'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const suites = [
  ['Authored content schema', ['scripts/validate-content.cjs']],
  ['Campaign invariants', ['scripts/test-ascension-campaign.cjs']],
  ['Downloadable case artifact integrity', ['scripts/browser-downloads-smoke.cjs', '--fixtures-only']],
  ['Animated rig and local asset closure', ['scripts/test_ascension_rig.cjs']],
  ['Shared-engine state contracts', ['scripts/test_ascension_engine.cjs']],
  ['Guest presence', ['scripts/test_ascension_net.cjs']],
  ['Protected/public root routes', ['scripts/test_service_worker_routes.cjs']],
  ['Public offline worker', ['scripts/test_ascension_sw.cjs']],
  ['Public user-site game mount', ['scripts/test-public-mount.cjs']],
  ['Static public asset closure', ['scripts/validate-static.cjs', 'build']],
];
let failures = 0;
for (const [label, args] of suites) {
  console.log('\n' + label);
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) { failures++; if (result.error) console.error(result.error.message); }
}
console.log('\n' + (suites.length - failures) + '/' + suites.length + ' Ascension verification suites passed.');
if (failures) process.exitCode = 1;
