'use strict';
// Contract tests for the real shared engines. Browser rendering and input are
// exercised separately; this harness isolates durable state and public APIs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const gameplaySource = fs.readFileSync(path.join(root, 'CyberWorld', 'gameplay.js'), 'utf8');
const worldSource = fs.readFileSync(path.join(root, 'CyberWorld', 'cw-world.js'), 'utf8');
const academySource = fs.readFileSync(path.join(root, 'CyberWorld', 'cw-academy.js'), 'utf8');

function browser(initial, ascension = false, systemReduced = false) {
  const data = new Map(initial === undefined ? [] : [['cw.operative.v1', typeof initial === 'string' ? initial : JSON.stringify(initial)]]);
  const events = [];
  const handlers = new Map();
  const documentHandlers = new Map(), createdElements = [];
  const storage = {
    getItem: key => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
  const document = {
    body: { appendChild() {} }, readyState: 'loading',
    addEventListener(name, callback) { if (!documentHandlers.has(name)) documentHandlers.set(name, []); documentHandlers.get(name).push(callback); }, getElementById() { return null; },
    querySelector() { return null; },
    dispatchEvent(event) { events.push(event); return !event.defaultPrevented; },
    createElement(tag) { createdElements.push(tag); return { classList: { add() {}, remove() {} } }; },
  };
  const window = {
    CW_ASCENSION: ascension, location: { search: '' },
    addEventListener(name, callback) { handlers.set(name, callback); },
  };
  const motionQuery = { matches: systemReduced, addEventListener(name, callback) { handlers.set('motion:' + name, callback); } };
  window.matchMedia = () => motionQuery;
  const context = {
    window, document, localStorage: storage, sessionStorage: storage,
    Image: class {}, MutationObserver: class { observe() {} },
    CustomEvent: class {
      constructor(type, options) { this.type = type; Object.assign(this, options); }
      preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
    },
    setTimeout() {}, setInterval() {}, clearTimeout() {}, clearInterval() {},
    URLSearchParams, console,
  };
  return { context, window, data, storage, events, handlers, documentHandlers, createdElements, motionQuery };
}

const legacy = {
  callsign: 'AUDITOR', level: 1, xp: 80, credits: 21,
  inventory: { 'OLD-DECK': 2 }, completed: { old: 123 },
  customLegacy: { preserve: true },
};
const b = browser(legacy, true);
vm.runInNewContext(gameplaySource, b.context, { filename: 'gameplay.js' });
const api = b.window.__cwGameplay;
assert.deepEqual(JSON.parse(b.data.get('cw.operative.v1')), legacy, 'Loading must not rewrite a legacy save');
assert.equal(typeof api.refresh, 'function');

// Academy changes the same localStorage record in the same page, without a
// storage event. A later game reward must include its latest XP/completions.
const academyWrite = JSON.parse(b.data.get('cw.operative.v1'));
academyWrite.xp = 90;
academyWrite.completed.academy = 456;
b.storage.setItem('cw.operative.v1', JSON.stringify(academyWrite));
api.gainXp(20);
assert.equal(api.state().level, 2, 'External XP must participate in level crossing');
assert.equal(api.state().xp, 10);
assert.equal(api.state().completed.academy, 456);

assert.equal(api.completeMission('ascension:signal', { xp: 30, credits: 50, item: 'SIGNAL-LENS' }), true);
const earned = JSON.parse(b.data.get('cw.operative.v1'));
assert.equal(earned.xp, 40);
assert.equal(earned.credits, 71);
assert.equal(earned.inventory['SIGNAL-LENS'], 1);
assert.equal(earned.customLegacy.preserve, true);
assert.equal(earned.inventory['OLD-DECK'], 2);
assert.equal(earned.completed.old, 123);
assert.equal(api.completeMission('ascension:signal', { xp: 999, credits: 999, item: 'SIGNAL-LENS' }), false);
assert.deepEqual(JSON.parse(b.data.get('cw.operative.v1')), earned, 'A replay must not award or rewrite the save');

// A reload must retain the completion guard, so reopening a case cannot farm XP.
const reloaded = browser(earned, true);
vm.runInNewContext(gameplaySource, reloaded.context);
assert.equal(reloaded.window.__cwGameplay.completeMission('ascension:signal', { xp: 999 }), false);
assert.equal(reloaded.window.__cwGameplay.state().xp, 40);

// Another tab's save is reflected through the storage-event bridge.
const secondTab = JSON.parse(b.data.get('cw.operative.v1'));
secondTab.credits = 200;
b.storage.setItem('cw.operative.v1', JSON.stringify(secondTab));
b.handlers.get('storage')({ key: 'cw.operative.v1' });
assert.equal(api.state().credits, 200);
api.gainCredits(5);
assert.equal(api.state().credits, 205);
api.gainItem('NO-ZERO-ITEM', 0);
assert.equal(api.state().inventory['NO-ZERO-ITEM'], undefined);
assert.equal(api.completeMission('__proto__', { xp: 999 }), false);

for (const bad of [
  '{broken JSON',
  { level: 'broken', xp: -44, credits: 'oops', inventory: [], completed: [], flags: 'broken' },
]) {
  const corrupt = browser(bad, true);
  vm.runInNewContext(gameplaySource, corrupt.context);
  const recovered = corrupt.window.__cwGameplay;
  assert.equal(recovered.state().level, 1);
  assert.equal(recovered.state().xp, 0);
  assert.equal(recovered.state().credits, 0);
  assert.equal(recovered.completeMission('valid-mission', { xp: 25 }), true);
  assert.equal(recovered.state().xp, 25);
}

const quota = browser(legacy, true);
quota.storage.setItem = () => { throw new Error('QuotaExceededError'); };
vm.runInNewContext(gameplaySource, quota.context);
const sessionGame = quota.window.__cwGameplay;
assert.equal(sessionGame.completeMission('session-case', { xp: 30, credits: 8, item: 'SESSION-LENS' }), true);
assert.equal(sessionGame.state().inventory['SESSION-LENS'], 1, 'A HUD refresh must preserve session-only gear');
assert.equal(sessionGame.state().credits, 29);
assert.equal(sessionGame.completeMission('session-case', { xp: 999 }), false, 'Session-only rewards remain idempotent');
assert.equal(sessionGame.persistence().saved, false);
sessionGame.updateProfile({ callsign: 'OFFLINE AGENT', path: 'soc', look: { suit: '#48ffd5' } });
assert.equal(sessionGame.state().callsign, 'OFFLINE AGENT', 'Identity remains usable while storage is blocked');
const replacement = sessionGame.state(); replacement.callsign = 'REPLACED OFFLINE'; replacement.inventory['IMPORTED-LENS'] = 1;
sessionGame.replaceState(replacement);
assert.equal(sessionGame.state().callsign, 'REPLACED OFFLINE');
assert.equal(sessionGame.state().inventory['IMPORTED-LENS'], 1);
assert.equal(sessionGame.storageStatus().persistent, false);
assert.deepEqual(JSON.parse(quota.data.get('cw.operative.v1')), legacy, 'Failed writes never erase the old durable save');

const blocked = browser(undefined, true);
blocked.storage.getItem = blocked.storage.setItem = () => { throw new Error('SecurityError'); };
vm.runInNewContext(gameplaySource, blocked.context);
assert.equal(blocked.window.__cwGameplay.completeMission('private-session', { xp: 25 }), true);
assert.equal(blocked.window.__cwGameplay.state().xp, 25, 'Blocked reads and writes retain current-session progress');

// Retired consoles must never steal movement or mount a second game in the
// public 3D route. Their existing entry APIs still open the current deck.
const publicRoute = browser(legacy, true), publicActions = [];
publicRoute.context.document.body.dataset = { phase: 'playing' };
publicRoute.window.__cwAscension = {
  openDeck(tab) { publicActions.push('deck:' + tab); },
  close() { publicActions.push('close'); },
  startMission() { publicActions.push('mission'); },
};
vm.runInNewContext(gameplaySource, publicRoute.context);
vm.runInNewContext(academySource, publicRoute.context);
assert.equal(publicRoute.createdElements.length, 0, 'Public boot must not mount legacy Academy or arena UI');
let prevented = false;
function publicKey(key) {
  for (const callback of publicRoute.documentHandlers.get('keydown') || []) callback({key,target:{tagName:'BODY'},preventDefault(){prevented=true;}});
}
publicKey('a'); assert.equal(prevented, false, 'A remains available for movement');
assert.equal(publicActions.length, 0);
publicKey('m'); assert.equal(prevented, true); assert.equal(publicActions.pop(), 'deck:map');
publicRoute.window.__cwGameplay.open('combat'); assert.equal(publicActions.pop(), 'deck:missions');
publicRoute.window.__cwGameplay.startMission(publicRoute.window.__cwGameplay.missions()[0].id); assert.equal(publicActions.pop(), 'mission');
publicRoute.window.__cwAcademy.open(); assert.equal(publicActions.pop(), 'deck:academy');
publicRoute.window.__cwAcademy.goOverview(); assert.equal(publicActions.pop(), 'deck:academy');
publicRoute.window.__cwAcademy.close(); assert.equal(publicActions.pop(), 'close');
assert.equal(publicRoute.createdElements.length, 0, 'Compatibility calls must not reintroduce a flat legacy console');

for (const mode of [true, false]) {
  const worldBrowser = browser(undefined, mode);
  vm.runInNewContext(worldSource, worldBrowser.context, { filename: 'cw-world.js' });
  const world = worldBrowser.window.__cwWorld;
  assert.equal(world.view(), 'plaza');
  assert.equal(world.setOverclock(true), true);
  assert.equal(world.snapshot().overclock, true);
  assert.equal(world.setOverclock(false), false);
  assert.equal(world.setReducedMotion(true), true);
  assert.equal(world.snapshot().reducedMotion, true);
  assert.equal(world.setReducedMotion(false), false);
  world.setMovement(1, -1);
  assert.equal(typeof world.interact, 'function');
  assert.equal(typeof world.toDistrict, 'function');
  assert.equal(typeof world.refresh, 'function');
}

const motionBrowser = browser(undefined, true, true);
vm.runInNewContext(worldSource, motionBrowser.context);
const motionWorld = motionBrowser.window.__cwWorld;
assert.equal(motionWorld.snapshot().reducedMotion, true, 'OS preference is honored before the shell boots');
assert.equal(motionWorld.setReducedMotion(false), true, 'An OS preference remains honored when the explicit preference is off');
motionBrowser.motionQuery.matches = false;
motionBrowser.handlers.get('motion:change')();
assert.equal(motionWorld.snapshot().reducedMotion, false, 'Changing the OS preference restores standard motion');
motionWorld.setReducedMotion(true);
motionBrowser.motionQuery.matches = true;
motionBrowser.handlers.get('motion:change')();
motionBrowser.motionQuery.matches = false;
motionBrowser.handlers.get('motion:change')();
assert.equal(motionWorld.snapshot().reducedMotion, true, 'An explicit reduced-motion choice survives OS changes');

console.log('Ascension engine checks passed: legacy preservation, Academy synchronization, reload-safe rewards, cross-tab updates, corrupt-save recovery, public shortcut delegation, both world modes, and system/user reduced-motion preferences.');
