'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const FIELD = require('../CyberWorld/ascension-field.js');
let groups = 0;
function test(name, run) { run(); groups++; console.log('  PASS ' + name); }
function frozen(state) { Object.freeze(state.samples); Object.freeze(state.steps); return Object.freeze(state); }
function surveyed() { return FIELD.targets.slice(0, 3).reduce((state, target) => FIELD.inspect(state, target.id).state, FIELD.start(FIELD.fresh()).state); }
function routed() { return FIELD.chooseRoute(surveyed(), 'fallback').state; }
function complete() { return FIELD.STEP_ORDER.reduce((state, step) => FIELD.act(state, step).state, routed()); }
function checkResult(out, ok) { assert.equal(out.ok, ok); assert.equal(FIELD.valid(out.state), true); assert.equal(typeof out.message, 'string'); assert.ok(out.message.length > 20); }

test('pure CommonJS and browser-global entry points share the public contract', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../CyberWorld/ascension-field.js'), 'utf8'), context);
  assert.equal(typeof context.window.CW_ASCENSION_FIELD.start, 'function');
  assert.equal(JSON.stringify(context.window.CW_ASCENSION_FIELD.fresh()), JSON.stringify(FIELD.fresh()));
  assert.equal(FIELD.targets.length, 4);
  assert.equal(FIELD.targets, FIELD.TARGETS);
  assert.deepEqual(FIELD.targets.map(target => target.id), ['field-uplink', 'field-backup', 'field-clinic', 'field-switch']);
  FIELD.targets.forEach(target => ['title', 'where', 'evidence', 'lesson'].forEach(key => assert.equal(typeof target[key], 'string')));
  assert.ok(Object.isFrozen(FIELD)); assert.ok(Object.isFrozen(FIELD.targets));
});

test('contract acceptance and switch visits do not fabricate observations', () => {
  const initial = frozen(FIELD.fresh());
  checkResult(FIELD.inspect(initial, 'field-switch'), true);
  assert.deepEqual(FIELD.inspect(initial, 'field-switch').state, FIELD.fresh());
  const started = FIELD.start(initial);
  checkResult(started, true); assert.equal(started.state.phase, 'survey'); assert.deepEqual(started.state.samples, []);
  assert.deepEqual(FIELD.start(frozen(started.state)).state, started.state);
  assert.deepEqual(initial, FIELD.fresh());
  checkResult(FIELD.inspect(started.state, 'field-switch'), true);
  assert.deepEqual(FIELD.inspect(started.state, 'field-switch').state.samples, []);
});

test('physical observations are order-independent, immutable, and idempotent', () => {
  let state = FIELD.fresh();
  for (const id of ['field-clinic', 'field-uplink', 'field-backup']) {
    const before = structuredClone(state);
    const out = FIELD.inspect(frozen(state), id);
    checkResult(out, true); assert.deepEqual(state, before); assert.equal(out.state.phase, 'survey');
    assert.equal(out.state.samples.length, before.samples.length + 1);
    assert.deepEqual(FIELD.inspect(frozen(out.state), id).state, out.state);
    state = out.state;
  }
  assert.equal(state.samples.length, 3); assert.equal(state.route, null);
  const unknown = FIELD.inspect(state, '__proto__'); checkResult(unknown, false); assert.deepEqual(unknown.state, state);
  const cloned = FIELD.normalize(state); cloned.samples.pop(); assert.equal(state.samples.length, 3);
});

test('all route options and switch actions require the independent three-site survey', () => {
  const state = FIELD.inspect(FIELD.start(FIELD.fresh()).state, 'field-uplink').state;
  for (const route of ['fallback', 'shutdown', 'primary', 'unknown']) {
    const out = FIELD.chooseRoute(frozen(state), route); checkResult(out, false); assert.deepEqual(out.state, state);
  }
  for (const step of FIELD.STEP_ORDER) {
    const out = FIELD.act(state, step); checkResult(out, false); assert.deepEqual(out.state, state);
  }
  assert.throws(() => FIELD.rewardFiles(state, 'EARLY'), /Complete The Last Mile/);
  assert.throws(() => FIELD.rewardFiles(surveyed(), 'EARLY'), /Complete The Last Mile/);
});

test('unsupported routes explain dependencies without deleting progress', () => {
  const state = frozen(surveyed());
  const shutdown = FIELD.chooseRoute(state, 'shutdown'); checkResult(shutdown, false); assert.match(shutdown.message, /clinic deliveries/i); assert.deepEqual(shutdown.state, state);
  const primary = FIELD.chooseRoute(state, 'primary'); checkResult(primary, false); assert.match(primary.message, /independent evidence/i); assert.deepEqual(primary.state, state);
  const invalid = FIELD.chooseRoute(state, null); checkResult(invalid, false); assert.deepEqual(invalid.state, state);
  const accepted = FIELD.chooseRoute(state, 'fallback'); checkResult(accepted, true); assert.equal(accepted.state.phase, 'routing'); assert.match(accepted.message, /independent sealed manifest M-204/);
  assert.deepEqual(accepted.state.steps, []);
  assert.deepEqual(FIELD.chooseRoute(frozen(accepted.state), 'fallback').state, accepted.state);
  checkResult(FIELD.chooseRoute(accepted.state, 'shutdown'), false);
  assert.deepEqual(FIELD.chooseRoute(accepted.state, 'shutdown').state, accepted.state);
});

test('recovery is a strict four-step prefix and every error is reversible', () => {
  let state = routed();
  for (const [index, step] of FIELD.STEP_ORDER.entries()) {
    for (const later of FIELD.STEP_ORDER.slice(index + 1)) {
      const bad = FIELD.act(frozen(state), later); checkResult(bad, false); assert.deepEqual(bad.state, state);
    }
    const unknown = FIELD.act(state, 'delete'); checkResult(unknown, false); assert.deepEqual(unknown.state, state);
    const next = FIELD.act(frozen(state), step); checkResult(next, true);
    assert.deepEqual(next.state.steps, FIELD.STEP_ORDER.slice(0, index + 1));
    assert.equal(next.state.phase, index === 3 ? 'complete' : 'routing');
    for (const previous of next.state.steps) assert.deepEqual(FIELD.act(frozen(next.state), previous).state, next.state);
    if (index < 3) assert.throws(() => FIELD.rewardFiles(next.state, 'EARLY'));
    state = next.state;
  }
  assert.deepEqual(FIELD.start(frozen(state)).state, state);
  assert.equal(FIELD.act(state, 'verify').message.includes('No duplicate'), true);
  for (const target of FIELD.targets) assert.deepEqual(FIELD.inspect(frozen(state), target.id).state, state);
});

test('malformed state cannot claim completion or unknown stages', () => {
  const bad = [null, [], {}, { ...FIELD.fresh(), version: 2 }, { ...FIELD.fresh(), phase: 'complete' }, { ...FIELD.fresh(), route: 'fallback' }, { ...FIELD.fresh(), steps: ['snapshot'] }, { ...surveyed(), samples: ['field-uplink', 'field-uplink', 'field-backup'] }, { ...routed(), steps: ['restore'] }, { ...routed(), phase: 'complete', steps: ['snapshot', 'isolate'] }, { ...complete(), steps: ['snapshot', 'isolate', 'restore', 'verify', 'verify'] }, { ...complete(), privateNotes: 'DO NOT EXPORT' }];
  for (const value of bad) {
    assert.equal(FIELD.valid(value), false);
    const normalized = FIELD.normalize(value); assert.equal(FIELD.valid(normalized), true);
    assert.notEqual(normalized, value);
    assert.throws(() => FIELD.rewardFiles(value, 'FORGED'));
  }
  const broken = { ...routed(), steps: ['snapshot', 'isolate', 'verify'], privateNotes: 'SECRET' };
  const recovered = FIELD.normalize(broken);
  assert.deepEqual(recovered.steps, ['snapshot', 'isolate']); assert.equal(recovered.phase, 'routing');
  assert.deepEqual(Object.keys(recovered).sort(), ['phase', 'route', 'samples', 'steps', 'version']);
  const invalidAction = FIELD.act(broken, 'restore'); checkResult(invalidAction, false); assert.deepEqual(invalidAction.state, recovered);
  assert.equal(FIELD.act(recovered, 'restore').ok, true);
  assert.deepEqual(FIELD.normalize({ ...complete(), samples: ['field-uplink', 'field-clinic'] }).steps, []);
  assert.equal(FIELD.normalize({ ...complete(), samples: ['field-uplink', 'field-clinic'] }).phase, 'survey');
});

test('downloadable mission artifacts are original evidence and blank notes only', () => {
  const first = FIELD.briefFiles(FIELD.fresh());
  assert.deepEqual(first, FIELD.briefFiles({ ...complete(), notes: 'SECRET_PRIVATE_NOTE', accessToken: 'SECRET_TOKEN' }));
  assert.deepEqual(first.map(file => file.name), ['last-mile-brief.txt', 'uplink-change.log', 'sealed-maintenance-manifest.csv', 'clinic-delivery-observations.csv', 'field-notes.txt']);
  first.forEach(file => { assert.equal(typeof file.data, 'string'); assert.ok(file.data.length > 40); assert.ok(!file.name.includes('/') && !file.name.includes('..')); });
  const combined = first.map(file => file.data).join('\n');
  assert.match(combined, /original synthetic field contract/i); assert.match(combined, /independent-read-only/);
  assert.match(combined, /approval=missing/); assert.match(combined, /functioning-dispatch-lane/);
  assert.doesNotMatch(combined, /SECRET_|earned-module|recovery_steps|selected_route|LAST MILE KEEPER/);
  assert.doesNotMatch(first.find(file => file.name === 'field-notes.txt').data, /LANTERN|fallback/);
  first[0].data = 'changed'; assert.notEqual(FIELD.briefFiles()[0].data, 'changed');
});

test('earned artifacts escape handles, whitelist data, and do not grant duplicate rewards', () => {
  const state = frozen(complete());
  const before = JSON.stringify(state);
  const files = FIELD.rewardFiles(state, '<script>\u0000&"x"</script>');
  assert.deepEqual(files.map(file => file.name), ['last-mile-keeper.svg', 'continuity-prism-receipt.json', 'last-mile-field-report.json']);
  assert.doesNotMatch(files[0].data, /<script>|\u0000/); assert.match(files[0].data, /&lt;script&gt;&amp;&quot;x&quot;&lt;\/script&gt;/);
  const receipt = JSON.parse(files[1].data), report = JSON.parse(files[2].data);
  assert.deepEqual(FIELD.REWARD, { xp: 220, credits: 110, item: 'CONTINUITY-PRISM', badge: 'LAST MILE KEEPER' });
  assert.equal(receipt.item, FIELD.REWARD.item); assert.equal(receipt.official_certification, false);
  assert.equal(report.collected_evidence.length, 3); assert.deepEqual(report.collected_evidence.map(item => item.id), FIELD.targets.slice(0, 3).map(target => target.id));
  assert.equal(report.selected_route.choice, 'fallback'); assert.deepEqual(report.recovery_steps, FIELD.STEP_ORDER);
  assert.equal(report.outcome.clinic_crates_delivered, report.outcome.clinic_crates_required);
  assert.deepEqual(FIELD.rewardFiles(state, receipt.callsign), files); assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.parse(FIELD.rewardFiles(state, 'z'.repeat(200))[1].data).callsign.length, 32);
  assert.equal(JSON.parse(FIELD.rewardFiles(state, '\n\t')[1].data).callsign, 'LOCAL OPERATIVE');
  assert.throws(() => FIELD.rewardFiles({ ...state, privateNotes: 'SECRET' }, 'USER'));
  assert.doesNotMatch(files.map(file => file.data).join('\n'), /accessToken|privateNotes|SECRET/);
});

console.log('The Last Mile: ' + groups + ' deterministic test groups passed.');
