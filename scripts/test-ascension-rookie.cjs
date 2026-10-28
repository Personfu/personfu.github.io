'use strict';
// The beginner adventures are a pure local state machine. These checks exercise
// player-visible actions, replay records and the exact public reward boundary.
const assert = require('node:assert/strict');
const ROOKIE = require('../CyberWorld/ascension-rookie.js');
let groups = 0;
function test(name, run) { run(); groups++; console.log('  PASS ' + name); }
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value); Object.values(value).forEach(freeze);
  }
  return value;
}
function check(out, finished = null) {
  assert.equal(ROOKIE.valid(out.state), true, 'Every action returns a valid serializable adventure state');
  assert.equal(out.finished, finished); assert.equal(typeof out.message, 'string'); assert.ok(out.message.length > 12);
  assert.deepEqual(JSON.parse(JSON.stringify(out.state)), out.state);
  return out.state;
}
function next(state) { return ROOKIE.targets(state).find(target => target.state === 'next'); }
function firstLight(input = ROOKIE.initial(), wrong = false) {
  let state = check(ROOKIE.start(input, 'intro'));
  state = check(ROOKIE.touch(state, 'intro-welcome'));
  for (const id of ['intro-spark-2', 'intro-spark-0', 'intro-spark-1']) state = check(ROOKIE.touch(state, id));
  state = check(ROOKIE.touch(state, 'rookie-beacon'));
  if (wrong) state = check(ROOKIE.choose(state, 'violet'));
  return check(ROOKIE.choose(state, 'blue'), 'intro');
}
function sweep(input) {
  let state = check(ROOKIE.start(input, 'sweep'));
  for (let i = 0; i < 5; i++) state = check(ROOKIE.touch(state, 'sweep-' + i), i === 4 ? 'sweep' : null);
  return state;
}
function courier(input) {
  let state = check(ROOKIE.start(input, 'courier'));
  for (let i = 0; i < 3; i++) state = check(ROOKIE.touch(state, 'courier-' + i), i === 2 ? 'courier' : null);
  return state;
}
function match(input, wrong = false) {
  const words = { '#49bfff': 'blue', '#ffbe65': 'amber', '#b797ff': 'violet' };
  let state = check(ROOKIE.start(input, 'match'));
  state = check(ROOKIE.touch(state, 'rookie-beacon'));
  if (wrong) state = check(ROOKIE.choose(state, 'not-the-visible-word'));
  // Read each visible marker's clue; no case solution or memorized pattern.
  for (let i = 0; i < 5; i++) {
    const clue = next(state); assert.equal(clue.id, 'rookie-beacon'); assert.ok(words[clue.color]);
    state = check(ROOKIE.choose(state, words[clue.color]), i === 4 ? 'match' : null);
  }
  return state;
}

test('fresh state is isolated, complete, valid and free of account or reward balances', () => {
  const first = ROOKIE.initial(), second = ROOKIE.initial();
  assert.equal(ROOKIE.valid(first), true); assert.deepEqual(ROOKIE.normalize(first), first);
  first.done.push('intro'); first.records.intro = { wins: 7, best: 99 };
  assert.deepEqual(second.done, []); assert.deepEqual(second.records, {});
  assert.deepEqual(Object.keys(ROOKIE.JOBS).sort(), ['courier', 'intro', 'match', 'practice', 'sweep']);
  Object.values(ROOKIE.JOBS).forEach(job => {
    assert.ok(job.title && job.copy && job.time && job.item);
    assert.ok(Number.isInteger(job.xp) && job.xp > 0); assert.ok(Number.isInteger(job.credits) && job.credits > 0);
  });
  for (const key of ['xp', 'credits', 'inventory', 'completed', 'account', 'accessToken', 'notes']) assert.equal(key in second, false);
});

test('malformed imports normalize into bounded valid state without unknown or private fields', () => {
  const malformed = [
    null, undefined, [], 'bad', 7, {},
    { ...ROOKIE.initial(), version: 999, notes: 'PRIVATE_NOTES', accessToken: 'PRIVATE_TOKEN' },
    { ...ROOKIE.initial(), intro: -5, step: Infinity, mistakes: '999999', dismissed: 1, active: 'unknown' },
    { ...ROOKIE.initial(), sparks: [0, 0, 1, 99], collected: [4, 4, -1, 2], done: ['intro', 'intro', 'evil'] },
    { ...ROOKIE.initial(), records: { intro: { wins: -8, best: Infinity, notes: 'PRIVATE_RECORD' }, evil: { wins: 2, best: 3 } } },
    { ...ROOKIE.initial(), intro: 2, sparks: [0] },
    { ...ROOKIE.initial(), intro: 3, done: ['intro'], sparks: [] },
    { ...ROOKIE.initial(), active: 'courier', step: 5 },
  ];
  for (const input of malformed) {
    const normalized = ROOKIE.normalize(freeze(input));
    assert.equal(ROOKIE.valid(normalized), true, 'Invalid import must not produce an invalid state: ' + JSON.stringify(input));
    assert.deepEqual(ROOKIE.normalize(normalized), normalized, 'Normalization is stable');
    assert.equal(JSON.stringify(normalized).includes('PRIVATE_'), false);
    assert.ok(normalized.step <= 5 && normalized.mistakes <= 999);
    if (normalized.active === 'courier') assert.ok(next(normalized), 'An imported active delivery must retain a reachable next stop');
  }
  const invalid = [
    {}, { ...ROOKIE.initial(), version: 2 }, { ...ROOKIE.initial(), extra: true },
    { ...ROOKIE.initial(), active: 'practice' }, { ...ROOKIE.initial(), dismissed: 'false' },
    { ...ROOKIE.initial(), intro: 3, done: ['intro'] },
    { ...ROOKIE.initial(), active: 'courier', step: 5 },
    { ...ROOKIE.initial(), sparks: [0, 0] }, { ...ROOKIE.initial(), done: ['wrong'] },
    { ...ROOKIE.initial(), records: [] }, { ...ROOKIE.initial(), records: { intro: { wins: -1, best: 10 } } },
    { ...ROOKIE.initial(), records: { intro: { wins: 1, best: 101 } } },
    { ...ROOKIE.initial(), records: { intro: { wins: 1, best: 10, extra: true } } },
  ];
  invalid.forEach(state => assert.equal(ROOKIE.valid(state), false, 'Structural validation rejects impossible or unknown fields'));
});

test('actions, targets, guides and normalization never mutate frozen caller state', () => {
  const state = freeze(ROOKIE.start(ROOKIE.initial(), 'intro').state), before = JSON.stringify(state);
  ROOKIE.touch(state, 'intro-welcome'); ROOKIE.choose(state, 'blue'); ROOKIE.start(state, 'courier');
  ROOKIE.practice(state); ROOKIE.targets(state); ROOKIE.guide(state); ROOKIE.normalize(state);
  assert.equal(JSON.stringify(state), before);
  const copy = ROOKIE.normalize(state); copy.sparks.push(2); copy.records.intro = { wins: 1, best: 20 };
  assert.deepEqual(state.sparks, []); assert.deepEqual(state.records, {});
  const unknown = ROOKIE.start(state, '__proto__'); check(unknown); assert.deepEqual(unknown.state, state);
  const absent = ROOKIE.touch(state, 'not-a-marker'); check(absent); assert.deepEqual(absent.state, state);
});

test('First Light teaches walking, three collectible sparks and one visible color without case knowledge', () => {
  let state = check(ROOKIE.start(ROOKIE.initial(), 'intro'));
  assert.equal(state.intro, 0); assert.equal(next(state).id, 'intro-welcome');
  assert.equal(ROOKIE.guide(state).progress, 0); assert.match(ROOKIE.guide(state).copy, /WASD|arrow|click/);
  assert.equal(ROOKIE.rewardFiles(state, 'EARLY'), null);
  const early = ROOKIE.choose(state, 'blue'); check(early); assert.equal(early.finished, null); assert.deepEqual(early.state, state);
  state = check(ROOKIE.touch(state, 'intro-welcome'));
  assert.equal(state.intro, 1); assert.equal(ROOKIE.guide(state).progress, 1);
  assert.equal(ROOKIE.targets(state).filter(target => target.state === 'next').length, 1);
  for (const id of ['intro-spark-2', 'intro-spark-0', 'intro-spark-1']) {
    state = check(ROOKIE.touch(state, id));
    const repeated = ROOKIE.touch(state, id); check(repeated); assert.deepEqual(repeated.state, state);
  }
  assert.equal(state.intro, 2); assert.equal(state.sparks.length, 3);
  assert.equal(next(state).id, 'rookie-beacon'); assert.equal(ROOKIE.guide(state).progress, 2);
  assert.equal(ROOKIE.rewardFiles(state, 'NOT YET'), null);
  const visit = ROOKIE.touch(state, 'rookie-beacon'); check(visit); assert.match(visit.message, /matching color|clue/); state = visit.state;
  const miss = ROOKIE.choose(state, 'amber'); check(miss);
  assert.match(miss.message, /No problem/); assert.match(miss.message, /BLUE/);
  assert.deepEqual(miss.state.sparks, state.sparks); assert.equal(miss.state.intro, 2); assert.equal(miss.state.active, 'intro');
  state = check(ROOKIE.choose(miss.state, 'blue'), 'intro');
  assert.equal(state.intro, 3); assert.equal(state.active, null); assert.deepEqual(state.done, ['intro']);
  assert.deepEqual(state.records.intro, { wins: 1, best: 95 }); assert.equal(ROOKIE.guide(state), null);
  assert.equal(ROOKIE.rewardFiles(state, 'EXPLORER').length, 3);
});

test('treasure hunt collects every unique spark and marks already visited targets', () => {
  let state = check(ROOKIE.start(firstLight(), 'sweep'));
  const positions = ROOKIE.targets(state);
  assert.equal(positions.length, 5); assert.equal(new Set(positions.map(target => target.id)).size, 5);
  positions.forEach(target => { assert.ok(Number.isFinite(target.x) && Number.isFinite(target.z)); assert.equal(target.kind, 'spark'); });
  for (const [index, id] of ['sweep-4', 'sweep-2', 'sweep-0', 'sweep-3', 'sweep-1'].entries()) {
    state = check(ROOKIE.touch(state, id), index === 4 ? 'sweep' : null);
    if (index < 4) {
      assert.equal(ROOKIE.targets(state).find(target => target.id === id).state, 'done');
      assert.equal(ROOKIE.guide(state).progress, index + 1);
    }
    assert.deepEqual(ROOKIE.touch(state, id).state, state);
  }
  assert.equal(state.collected.length, 5); assert.ok(state.done.includes('sweep')); assert.deepEqual(state.records.sweep, { wins: 1, best: 100 });
});

test('drone deliveries require the correct three-stop order and wrong stops keep progress', () => {
  let state = check(ROOKIE.start(ROOKIE.initial(), 'courier'));
  assert.equal(next(state).id, 'courier-0'); assert.equal(ROOKIE.guide(state).total, 3);
  for (const id of ['courier-1', 'courier-2']) {
    const wrong = ROOKIE.touch(freeze(state), id); check(wrong); assert.deepEqual(wrong.state, state); assert.match(wrong.message, /bright delivery pad first/);
  }
  state = check(ROOKIE.touch(state, 'courier-0')); assert.equal(state.step, 1); assert.equal(next(state).id, 'courier-1');
  assert.deepEqual(ROOKIE.touch(state, 'courier-0').state, state);
  assert.deepEqual(ROOKIE.touch(state, 'courier-2').state, state);
  state = check(ROOKIE.touch(state, 'courier-1')); assert.equal(state.step, 2); assert.equal(next(state).id, 'courier-2');
  state = check(ROOKIE.touch(state, 'courier-2'), 'courier');
  assert.equal(state.active, null); assert.equal(state.step, 3); assert.deepEqual(state.done, ['courier']);
});

test('Signal Match retains visible clues after mistakes and completes all five rounds', () => {
  let state = check(ROOKIE.start(ROOKIE.initial(), 'match'));
  assert.equal(ROOKIE.guide(state).total, 5);
  const first = next(state), miss = ROOKIE.choose(freeze(state), 'violet'); check(miss);
  assert.match(miss.message, /BLUE/); assert.equal(miss.state.step, 0); assert.equal(next(miss.state).color, first.color);
  assert.equal(miss.state.active, 'match'); assert.deepEqual(miss.state.done, []);
  state = match(miss.state, true);
  assert.equal(state.step, 5); assert.equal(state.active, null); assert.deepEqual(state.done, ['match']);
  assert.deepEqual(state.records.match, { wins: 1, best: 95 });
});

test('all adventures replay with unique completion IDs, improving bests and no model-level XP or inventory side effects', () => {
  let state = firstLight(ROOKIE.initial(), true); state = sweep(state); state = courier(state); state = match(state, true);
  assert.deepEqual(state.done, ['intro', 'sweep', 'courier', 'match']);
  assert.equal(state.records.intro.best, 95); assert.equal(state.records.match.best, 95);
  state = firstLight(freeze(state)); state = sweep(state); state = courier(state); state = match(state);
  assert.deepEqual(state.done, ['intro', 'sweep', 'courier', 'match']);
  assert.equal(new Set(state.done).size, state.done.length);
  for (const id of state.done) assert.deepEqual(state.records[id], { wins: 2, best: 100 });
  state = firstLight(state, true); assert.deepEqual(state.records.intro, { wins: 3, best: 100 }, 'A slower replay cannot erase a better record');
  for (const key of ['xp', 'credits', 'inventory', 'completed', 'account', 'accessToken', 'notes']) assert.equal(key in state, false, 'The pure adventure model leaves shared rewards to the idempotent integration');
});

test('safe sparring completion is idempotent without clearing other earned adventures', () => {
  const before = firstLight(), state = check(ROOKIE.practice(freeze(before)), 'practice');
  assert.deepEqual(state.done, ['intro', 'practice']); assert.deepEqual(state.records.practice, { wins: 1, best: 100 });
  assert.deepEqual(state.records.intro, before.records.intro);
  const repeated = ROOKIE.practice(freeze(state)); check(repeated); assert.deepEqual(repeated.state, state);
  assert.equal(repeated.finished, null); assert.equal(state.done.filter(id => id === 'practice').length, 1);
});

test('earned downloads expose only public achievement data, escaping SVG callsigns and stripping account/private notes', () => {
  assert.equal(ROOKIE.rewardFiles(ROOKIE.initial(), 'EARLY'), null);
  const state = match(courier(sweep(firstLight())));
  const dirty = { ...state, notes: 'PRIVATE_NOTE_DO_NOT_EXPORT', account: 'PRIVATE_ACCOUNT_DO_NOT_EXPORT', accessToken: 'PRIVATE_ACCESS_TOKEN',
    records: { ...state.records, intro: { ...state.records.intro, notes: 'PRIVATE_RECORD_NOTE' } } };
  const files = ROOKIE.rewardFiles(freeze(dirty), 'MIRA<&>"\'\u0000\n');
  assert.deepEqual(files.map(file => file.name), ['first-light-badge.svg', 'spark-companion.json', 'you-did-it.txt']);
  assert.deepEqual(files, ROOKIE.rewardFiles(state, 'MIRA<&>"\'\u0000\n'));
  const exported = files.map(file => file.data).join('\n'); assert.equal(exported.includes('PRIVATE_'), false);
  assert.match(files[0].data, /MIRA&lt;&amp;&gt;&quot;&#39;/); assert.equal(files[0].data.includes('MIRA<&>'), false);
  const receipt = JSON.parse(files[1].data);
  assert.equal(receipt.callsign, 'MIRA<&>"\''); assert.equal(receipt.item, 'SPARK-COMPANION'); assert.equal(receipt.official_certification, false);
  assert.deepEqual(receipt.adventures, state.done); assert.deepEqual(receipt.records, state.records);
  assert.ok(JSON.parse(ROOKIE.rewardFiles(state, 'A'.repeat(100))[1].data).callsign.length <= 32);
  files.forEach(file => { assert.equal(typeof file.data, 'string'); assert.ok(file.data.length > 100); assert.ok(!/[\\/]|\.\./.test(file.name)); });
});

console.log(`PASS ascension rookie: ${groups} behavior groups`);
