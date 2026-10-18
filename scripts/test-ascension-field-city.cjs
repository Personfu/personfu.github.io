'use strict';
// Exercise the actual city controller and shared reward engine together.
// Rendering is covered by browser tests; this isolates migration and durability.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const FIELD = require('../CyberWorld/ascension-field.js');
const root = path.resolve(__dirname, '..');
const CITY_KEY = 'cw.ascension.city.v1', OPERATIVE_KEY = 'cw.operative.v1';
const sources = ['gameplay.js', 'ascension-field.js', 'ascension-city.js'].map(name => ({ name, code: fs.readFileSync(path.join(root, 'CyberWorld', name), 'utf8') }));
const plain = value => JSON.parse(JSON.stringify(value));
const legacyCity = { version: 1, visits: { vendor: 7, trainer: 9, secret: 2 }, training: true, beacons: ['trace-one', 'trace-three'], discovered: true };
const legacyOperative = { callsign: 'FIELD-AUDITOR', level: 1, xp: 80, credits: 21, inventory: { 'OLD-DECK': 2 }, completed: { old: 123, 'city:forgotten-relay': 456 }, customLegacy: { preserve: true } };
function completedField() {
  let state = FIELD.targets.slice(0, 3).reduce((current, target) => FIELD.inspect(current, target.id).state, FIELD.fresh());
  state = FIELD.chooseRoute(state, 'fallback').state;
  return FIELD.STEP_ORDER.reduce((current, step) => FIELD.act(current, step).state, state);
}
function boot(city, operative = legacyOperative, options = {}) {
  const data = new Map([[CITY_KEY, JSON.stringify(city)], [OPERATIVE_KEY, JSON.stringify(operative)]]), writes = [], events = [];
  let operativeWriteFailures = options.operativeWriteFailures || 0;
  const storage = {
    getItem(key) { return data.get(key) || null; },
    setItem(key, value) {
      writes.push({ key, value: String(value) });
      if (key === OPERATIVE_KEY && operativeWriteFailures > 0) { operativeWriteFailures--; throw new Error('Simulated operative storage exhaustion'); }
      data.set(key, String(value));
    },
    removeItem(key) { data.delete(key); }
  };
  const document = {
    readyState: 'loading', body: { appendChild() {} },
    getElementById() { return null; }, querySelector() { return null; },
    addEventListener() {}, dispatchEvent(event) { events.push(event); return true; },
    createElement() { return { classList: { add() {}, remove() {} } }; }
  };
  const window = { CW_ASCENSION: true, location: { search: '' }, addEventListener() {} };
  const context = {
    window, document, localStorage: storage, sessionStorage: storage, URLSearchParams, console,
    CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    MutationObserver: class { observe() {} },
    setTimeout() {}, setInterval() {}, clearTimeout() {}, clearInterval() {}
  };
  const environment = vm.createContext(context);
  sources.forEach(source => vm.runInContext(source.code, environment, { filename: source.name }));
  return { city: window.__cwCity, operative: window.__cwGameplay, data, storage, writes, events };
}
function preservedLegacy(actual) {
  const value = plain(actual);
  Object.keys(legacyCity).forEach(key => assert.deepEqual(value[key], legacyCity[key], 'Migration must preserve city ' + key));
}
let groups = 0;
function test(name, run) { run(); groups++; console.log('  PASS ' + name); }

test('legacy city saves gain a fresh field contract without rewriting prior progress', () => {
  const b = boot(legacyCity);
  preservedLegacy(b.city.state());
  assert.deepEqual(plain(b.city.state().field), FIELD.fresh());
  assert.equal(b.city.validateState(legacyCity), true);
  assert.equal(b.writes.length, 0, 'Merely loading an older save must not rewrite it');
  assert.deepEqual(JSON.parse(b.data.get(CITY_KEY)), legacyCity);
  assert.deepEqual(JSON.parse(b.data.get(OPERATIVE_KEY)), legacyOperative);
  const event = b.events.find(event => event.type === 'cw:field-state');
  assert.ok(event, 'Normalized field state must reach the 3D scene on load');
  assert.equal(event.detail.phase, 'available');
  const detached = b.city.state(); detached.visits.vendor = 0; detached.field.samples.push('field-uplink');
  assert.equal(b.city.state().visits.vendor, 7); assert.equal(b.city.state().field.samples.length, 0);
});

test('corrupt new field progress is repaired without deleting unrelated city history', () => {
  const malformed = { ...completedField(), steps: ['snapshot', 'restore'], privateNote: 'MUST NOT ENTER FIELD RECORD' };
  const source = { ...legacyCity, field: malformed };
  const b = boot(source);
  preservedLegacy(b.city.state());
  const recovered = plain(b.city.state().field);
  assert.equal(FIELD.valid(recovered), true); assert.equal(recovered.phase, 'routing');
  assert.deepEqual(recovered.steps, ['snapshot']); assert.equal(recovered.samples.length, 3);
  assert.equal(recovered.route, 'fallback'); assert.equal('privateNote' in recovered, false);
  assert.equal(b.operative.state().credits, 21); assert.equal(b.operative.state().inventory['CONTINUITY-PRISM'], undefined);
  assert.equal(b.city.validateState(source), false, 'Repairing local storage must not weaken import validation');
  const unsupported = boot({ ...legacyCity, field: { ...completedField(), version: 999 } });
  preservedLegacy(unsupported.city.state()); assert.deepEqual(plain(unsupported.city.state().field), FIELD.fresh());
});

test('strict imports reject inconsistent field data before any city or reward mutation', () => {
  const b = boot(legacyCity), beforeCity = plain(b.city.state()), beforeOperative = plain(b.operative.state());
  const beforeStorage = Array.from(b.data.entries()), beforeWrites = b.writes.length;
  const invalid = [
    { ...legacyCity, field: { ...completedField(), steps: ['snapshot', 'verify'] } },
    { ...legacyCity, field: { ...FIELD.fresh(), phase: 'complete' } },
    { ...legacyCity, field: { ...completedField(), samples: ['field-uplink', 'field-uplink', 'field-backup'] } }
  ];
  invalid.forEach(value => {
    assert.equal(b.city.validateState(value), false);
    assert.throws(() => b.city.importState(value), /Invalid city save/);
    assert.deepEqual(plain(b.city.state()), beforeCity); assert.deepEqual(plain(b.operative.state()), beforeOperative);
    assert.deepEqual(Array.from(b.data.entries()), beforeStorage); assert.equal(b.writes.length, beforeWrites);
  });
  b.city.importState(legacyCity);
  preservedLegacy(b.city.state()); assert.deepEqual(plain(b.city.state().field), FIELD.fresh());
  assert.equal(FIELD.valid(JSON.parse(b.data.get(CITY_KEY)).field), true);
});

test('a completed field journal recovers its missing reward once and preserves older receipts', () => {
  const b = boot({ ...legacyCity, field: completedField() });
  preservedLegacy(b.city.state());
  const earned = plain(b.operative.state());
  assert.equal(earned.inventory['CONTINUITY-PRISM'], 1); assert.equal(earned.inventory['OLD-DECK'], 2);
  assert.equal(earned.credits, 131); assert.equal(earned.level, 3); assert.equal(earned.xp, 65);
  assert.equal(earned.completed.old, 123); assert.equal(earned.completed['city:forgotten-relay'], 456);
  assert.ok(earned.completed['city:last-mile']); assert.equal(earned.customLegacy.preserve, true);
  const durable = JSON.parse(b.data.get(OPERATIVE_KEY));
  assert.deepEqual(durable, earned, 'Receipt, item, credits, and XP must persist in one operative snapshot');
  const rewardWrites = b.writes.filter(write => write.key === OPERATIVE_KEY);
  assert.equal(rewardWrites.length, 1);
  for (let i = 0; i < 3; i++) b.city.reloadState();
  b.city.importState({ ...legacyCity, field: completedField() });
  assert.deepEqual(plain(b.operative.state()), earned);
  assert.equal(b.writes.filter(write => write.key === OPERATIVE_KEY).length, 1, 'Replay must not even rewrite the operative reward snapshot');
  const reloaded = boot(plain(b.city.state()), earned);
  assert.deepEqual(plain(reloaded.operative.state()), earned);
  assert.equal(reloaded.writes.length, 0);
});

test('resuming a partial recovery never grants the earned item early', () => {
  const partial = { ...completedField(), phase: 'routing', steps: ['snapshot', 'isolate', 'restore'] };
  const b = boot({ ...legacyCity, field: partial });
  preservedLegacy(b.city.state());
  assert.deepEqual(plain(b.city.state().field), partial);
  assert.equal(b.operative.state().credits, 21); assert.equal(b.operative.state().completed['city:last-mile'], undefined);
  assert.equal(b.operative.state().inventory['CONTINUITY-PRISM'], undefined);
  assert.throws(() => FIELD.rewardFiles(plain(b.city.state().field), 'EARLY'));
  assert.equal(b.writes.length, 0);
});

test('failed reward persistence remains idempotent in-session and recovers after a new boot', () => {
  const completedCity = { ...legacyCity, field: completedField() };
  const b = boot(completedCity, legacyOperative, { operativeWriteFailures: 1 });
  const sessionReward = plain(b.operative.state());
  assert.equal(sessionReward.inventory['CONTINUITY-PRISM'], 1); assert.equal(sessionReward.credits, 131);
  assert.equal(b.operative.persistence().saved, false);
  assert.deepEqual(JSON.parse(b.data.get(OPERATIVE_KEY)), legacyOperative, 'Failed write cannot leave a durable completion receipt without its reward');
  b.city.reloadState(); assert.deepEqual(plain(b.operative.state()), sessionReward);
  const recovered = boot(JSON.parse(b.data.get(CITY_KEY)), JSON.parse(b.data.get(OPERATIVE_KEY)));
  const durableReward = plain(recovered.operative.state());
  assert.equal(durableReward.inventory['CONTINUITY-PRISM'], 1); assert.equal(durableReward.credits, 131);
  assert.equal(durableReward.xp, 65); assert.equal(durableReward.level, 3);
  assert.ok(durableReward.completed['city:last-mile']); assert.equal(durableReward.completed.old, 123);
  recovered.city.reloadState(); assert.deepEqual(plain(recovered.operative.state()), durableReward);
  assert.equal(recovered.operative.persistence().saved, true);
});

console.log('Field/city integration: ' + groups + ' migration and reward test groups passed.');
