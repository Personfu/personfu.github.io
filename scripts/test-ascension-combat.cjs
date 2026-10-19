'use strict';
// Deterministic behavior checks for the local-only action simulation.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const { createCombat, command, advance, CONFIG, CONTROLS } = await import(pathToFileURL(path.join(__dirname, '../CyberWorld/src/ascension-combat-model.mjs')).href);
  let groups = 0;
  const test = (name, run) => { run(); groups++; console.log('  PASS ' + name); };
  const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };
  const started = () => command(createCombat(), 'start');
  function tick(state, seconds, player = state.player) { for (let i = 0; i < Math.ceil(seconds / 0.05); i++) state = advance(state, Math.min(0.05, seconds - i * 0.05), player); return state; }
  const safe = { x: 10, z: 10, facing: 0 };
  function stagedEnemy(type = 'warden') {
    let state = started();
    const template = state.enemies[0], rule = CONFIG.enemies[type];
    state.enemies = [{ ...template, type, hp: rule.hp, maxHp: rule.hp, shield: rule.shield, maxShield: rule.shield,
      x: 0, z: 0, phase: 'chase', timer: 0, attackRadius: rule.radius }];
    state.player = { ...state.player, x: 0, z: 2.4 };
    return state;
  }

  test('original simulation exports a serializable, isolated ready state and explicit start', () => {
    const ready = createCombat(), second = createCombat();
    assert.equal(ready.phase, 'ready'); assert.equal(ready.health, 100); assert.equal(ready.energy, 100);
    assert.deepEqual(JSON.parse(JSON.stringify(ready)), ready);
    ready.cooldowns.strike = 99; assert.equal(second.cooldowns.strike, 0);
    assert.deepEqual(command(second, 'strike'), second);
    const active = command(deepFreeze(second), { type: 'start' });
    assert.equal(active.phase, 'active'); assert.equal(active.wave, 1); assert.equal(active.enemies.length, 2);
    assert.deepEqual(command(active, 'start'), active);
    assert.equal(CONTROLS.length, 4); assert.equal(CONFIG.reward.item, 'PHASE-GAUNTLET');
    assert.deepEqual(CONFIG.reward, { xp: 260, credits: 140, item: 'PHASE-GAUNTLET' });
  });

  test('commands and time steps preserve frozen inputs and exact pause semantics', () => {
    const active = deepFreeze(started()), before = JSON.stringify(active);
    command(active, 'strike'); command(active, 'burst'); command(active, 'dodge'); command(active, 'overclock');
    advance(active, 0.05, safe);
    assert.equal(JSON.stringify(active), before);
    for (const dt of [0, -1, NaN, Infinity, undefined, '0.1']) assert.deepEqual(advance(active, dt, safe), active);
    const paused = command(stagedEnemy(), 'overclock');
    assert.deepEqual(advance(paused, 0, safe), paused, 'Pause must freeze all timers, positions and energy');
    assert.deepEqual(command(active, '__proto__'), active);
  });

  test('dt is capped, supplied movement is bounded, and nonfinite positions cannot poison the state', () => {
    const active = started();
    assert.deepEqual(advance(active, 9999, safe), advance(active, CONFIG.maxStep, safe));
    const moved = advance(active, 0.05, { x: 9999, z: -9999, facing: 700 });
    assert.equal(moved.player.x, 11); assert.equal(moved.player.z, -11); assert.ok(Math.abs(moved.player.facing) <= Math.PI);
    const preserved = advance(moved, 0.05, { x: NaN, z: Infinity, facing: NaN });
    assert.equal(preserved.player.x, 11); assert.equal(preserved.player.z, -11);
    assert.ok(Number.isFinite(preserved.player.facing));
    assert.ok(preserved.enemies.every(enemy => Math.abs(enemy.x) <= 11 && Math.abs(enemy.z) <= 11));
  });

  test('same-frame attack spam is inert and a timed three-hit chain staggers and pushes', () => {
    let state = stagedEnemy();
    state.enemies[0].shield = 0;
    state = command(state, 'strike');
    const first = JSON.stringify(state);
    for (let i = 0; i < 1000; i++) state = command(state, 'strike');
    assert.equal(JSON.stringify(state), first); assert.equal(state.combo, 1);
    state = tick(state, 0.36, state.player); state = command(state, 'strike');
    assert.equal(state.combo, 2);
    state = tick(state, 0.36, state.player); state = command(state, 'strike');
    assert.equal(state.combo, 3); assert.equal(state.enemies[0].phase, 'recover');
    assert.ok(state.enemies[0].z < -1.9); assert.ok(state.events.some(event => event.type === 'combo'));
    state = tick(state, CONFIG.comboWindow + 0.01, safe); assert.equal(state.combo, 0);
    let far = started(); far = command(far, 'strike');
    assert.equal(far.combo, 0); assert.equal(far.enemies[0].hp, far.enemies[0].maxHp);
    assert.equal(far.cooldowns.strike, CONFIG.strikeCooldown);
  });

  test('burst breaks shields only inside its radius, consumes energy once, and cancels windups', () => {
    let state = stagedEnemy();
    state.enemies[0].phase = 'windup'; state.enemies[0].timer = 0.5;
    state.enemies.push({ ...state.enemies[0], id: 99, x: 10, z: -10 });
    const before = deepFreeze(state);
    const burst = command(before, 'burst');
    assert.equal(burst.energy, 70); assert.equal(burst.cooldowns.burst, 5);
    assert.equal(burst.enemies[0].shield, 0); assert.equal(burst.enemies[0].hp, CONFIG.enemies.warden.hp - 42);
    assert.equal(burst.enemies[0].phase, 'recover'); assert.deepEqual(burst.enemies[1], state.enemies[1]);
    assert.ok(burst.events.some(event => event.type === 'shield-break'));
    assert.deepEqual(command(burst, 'burst'), burst);
    const exhausted = { ...state, energy: 29 };
    assert.deepEqual(command(exhausted, 'burst'), exhausted);
  });

  test('telegraphs retain fixed ground positions and moving outside avoids damage', () => {
    let state = stagedEnemy('sentinel');
    state = advance(state, 0.05, state.player);
    assert.equal(state.enemies[0].phase, 'windup');
    assert.equal(state.enemies[0].attackX, 0); assert.equal(state.enemies[0].attackZ, 2.4);
    assert.equal(state.enemies[0].attackRadius, 1.9);
    state = tick(state, 0.5, safe);
    assert.equal(state.health, 100); assert.equal(state.enemies[0].attackZ, 2.4);
    state = tick(state, 0.6, safe);
    assert.equal(state.health, 100);
    assert.ok(state.events.some(event => event.type === 'enemy-attack' && !event.hit));
    let caught = stagedEnemy('sentinel'); caught = advance(caught, 0.05, caught.player);
    caught = tick(caught, 1.05, caught.player);
    assert.equal(caught.health, 85, 'Remaining in the ground circle must cost integrity');
    assert.equal(caught.enemies[0].phase, 'recover');
  });

  test('timed dodge grants limited immunity and obeys energy/cooldown without moving the world avatar', () => {
    let state = stagedEnemy('sentinel'); state = advance(state, 0.05, state.player);
    state = tick(state, 0.55, state.player);
    const positionBefore = { x: state.player.x, z: state.player.z };
    state = command(state, 'dodge');
    assert.equal(state.dodges, 1); assert.equal(state.energy, 82);
    assert.equal(state.player.x, positionBefore.x); assert.equal(state.player.z, positionBefore.z);
    assert.equal(state.player.invulnerableUntil, state.time + 0.65);
    assert.deepEqual(command(state, 'dodge'), state);
    state = tick(state, 0.5, state.player);
    assert.equal(state.health, 100); assert.ok(state.events.some(event => event.text === 'PHASE EVADE'));
    let early = stagedEnemy('sentinel'); early = advance(early, 0.05, early.player);
    early = command(early, 'dodge'); early = tick(early, 1.05, early.player);
    assert.equal(early.health, 85, 'Dodging before the hit is not permanent immunity');
    const empty = { ...started(), energy: 17 };
    assert.deepEqual(command(empty, 'dodge'), empty);
  });

  test('overclock slows only construct timers; player cooldowns and energy remain on normal time', () => {
    let normal = stagedEnemy('sentinel'); normal = advance(normal, 0.05, normal.player);
    const slow = command(normal, 'overclock');
    const fastStep = advance(normal, 0.1, normal.player), slowStep = advance(slow, 0.1, slow.player);
    assert.ok(Math.abs(fastStep.enemies[0].timer - 0.9) < 1e-9);
    assert.ok(Math.abs(slowStep.enemies[0].timer - 0.965) < 1e-9);
    assert.ok(Math.abs(slowStep.cooldowns.overclock - 11.9) < 1e-9);
    assert.ok(Math.abs(slowStep.energy - 65.8) < 1e-9);
    assert.equal(slowStep.time, fastStep.time);
    assert.deepEqual(command(slowStep, 'overclock'), slowStep);
    const empty = { ...normal, energy: 34 }; assert.deepEqual(command(empty, 'overclock'), empty);
  });

  test('a stationary idle operative can lose, with no automatic victory or dead-construct damage', () => {
    let idle = started();
    idle = tick(idle, 60, idle.player);
    assert.equal(idle.phase, 'defeat'); assert.equal(idle.health, 0); assert.equal(idle.kills, 0);
    assert.equal(idle.events.filter(event => event.type === 'defeat').length, 1);
    assert.deepEqual(tick(idle, 20), idle); assert.deepEqual(command(idle, 'strike'), idle);
    assert.equal(createCombat().health, 100, 'Retry begins from a fresh state');
    let dead = stagedEnemy('sentinel'); dead.enemies[0].hp = 0; dead.enemies[0].phase = 'dead'; dead.enemies[0].timer = 0;
    dead = advance(dead, 0.1, dead.player); assert.equal(dead.health, 100); assert.equal(dead.waveDelay, CONFIG.wavePause);
    assert.equal(dead.events.some(event => event.type === 'enemy-attack'), false);
  });

  test('an active player can clear all three escalating waves, earn one victory, and keep events bounded', () => {
    let state = started(), waves = new Set(), elapsed = 0;
    // A deterministic tactical player approaches a target, counters, then moves
    // out of fixed ground circles during windups. No state/HP manipulation.
    for (let step = 0; step < 12000 && state.phase === 'active'; step++) {
      waves.add(state.wave);
      const enemies = state.enemies.filter(enemy => enemy.hp > 0 && enemy.phase !== 'dead');
      const target = enemies.sort((a, b) => Math.hypot(a.x - state.player.x, a.z - state.player.z) - Math.hypot(b.x - state.player.x, b.z - state.player.z))[0];
      let player = { ...state.player };
      if (target) {
        const danger = enemies.find(enemy => enemy.phase === 'windup' && Math.hypot(player.x - enemy.attackX, player.z - enemy.attackZ) <= enemy.attackRadius + 0.3);
        if (danger) {
          const dx = player.x - danger.attackX, dz = player.z - danger.attackZ;
          const len = Math.hypot(dx, dz);
          player.x = Math.max(-11, Math.min(11, player.x + (len > 0.01 ? dx / len : 1) * 0.3));
          player.z = Math.max(-11, Math.min(11, player.z + (len > 0.01 ? dz / len : 0) * 0.3));
        } else {
          const dx = target.x - player.x, dz = target.z - player.z, len = Math.hypot(dx, dz);
          if (len > 2.7) { player.x += dx / len * 0.3; player.z += dz / len * 0.3; }
        }
      }
      state = advance(state, 0.05, player);
      if (target && Math.hypot(target.x - player.x, target.z - player.z) <= CONFIG.strikeRange) state = command(state, 'strike');
      if (target?.shield > 0 && Math.hypot(target.x - player.x, target.z - player.z) <= CONFIG.burstRadius) state = command(state, 'burst');
      elapsed += 0.05;
      assert.ok(state.events.length <= CONFIG.maxEvents);
    }
    assert.equal(state.phase, 'victory', `Tactical play must be winnable after ${elapsed}s`);
    assert.deepEqual([...waves], [1, 2, 3]); assert.equal(state.kills, 8); assert.ok(state.score >= 1000);
    assert.equal(state.events.filter(event => event.type === 'victory').length, 1);
    assert.equal(new Set(state.events.map(event => event.id)).size, state.events.length);
    assert.ok(state.events.every(event => Number.isInteger(event.id)));
    assert.deepEqual(command(state, 'burst'), state); assert.deepEqual(tick(state, 30), state);
    assert.equal(state.events.filter(event => event.type === 'victory').length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  });

  console.log(`PASS ascension combat: ${groups} behavior groups`);
})().catch(error => { console.error(error); process.exitCode = 1; });
