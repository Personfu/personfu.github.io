'use strict';
// Deterministic behavior checks for the local-only action simulation.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const { createCombat, command, advance, CONFIG, PROFILES, CONTROLS } = await import(pathToFileURL(path.join(__dirname, '../CyberWorld/src/ascension-combat-model.mjs')).href);
  let groups = 0;
  const test = (name, run) => { run(); groups++; console.log('  PASS ' + name); };
  const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };
  const standard = () => createCombat({ difficulty: 'standard' });
  const started = (difficulty = 'standard') => command(createCombat({ difficulty }), 'start');
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
    const ready = standard(), second = standard();
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
    assert.equal(standard().health, 100, 'Retry begins from a fresh state');
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

  test('rookie is the safe default, with explicit immutable profiles and honest reward metadata', () => {
    const rookie = createCombat();
    assert.equal(rookie.difficulty, 'rookie'); assert.equal(rookie.health, 120); assert.equal(rookie.maxHealth, 120);
    assert.equal(rookie.totalWaves, 3); assert.equal(rookie.totalEnemies, 4); assert.equal(rookie.eligibleReward, true);
    assert.deepEqual(rookie.abilityCosts, { strike: 0, burst: 20, dodge: 8, overclock: 25 });
    for (const options of [undefined, null, {}, { difficulty: 'unknown' }, { difficulty: '__proto__' }, { difficulty: 'constructor' }]) {
      assert.equal(createCombat(options).difficulty, 'rookie');
    }
    const old = standard(); assert.equal(old.difficulty, 'standard'); assert.equal(old.totalEnemies, 8); assert.equal(old.health, 100);
    assert.deepEqual(old.abilityCosts, { strike: 0, burst: 30, dodge: 18, overclock: 35 });
    assert.ok(Object.isFrozen(PROFILES)); assert.ok(Object.isFrozen(PROFILES.rookie.enemies.sentinel));
    const frozen = deepFreeze(command(rookie, 'start')), before = JSON.stringify(frozen);
    const next = command(frozen, 'dodge'); next.abilityCosts.dodge = 999;
    assert.equal(JSON.stringify(frozen), before); assert.equal(PROFILES.rookie.dodgeCost, 8);
    assert.equal(advance(frozen, 0.05, safe).difficulty, 'rookie');
  });

  test('rookie gives a lone first opponent, a longer warning and cheaper limited dodge', () => {
    let rookie = started('rookie'); assert.equal(rookie.enemies.length, 1);
    const enemy = rookie.enemies[0];
    rookie = tick(rookie, 1.3, { x: enemy.x, z: enemy.z + 2, facing: Math.PI });
    assert.equal(rookie.enemies[0].phase, 'windup');
    assert.ok(rookie.enemies[0].timer > 1.5); assert.equal(rookie.health, 120);
    const warned = deepFreeze(rookie);
    const dodge = command(warned, 'dodge');
    assert.equal(dodge.energy, 92); assert.equal(dodge.cooldowns.dodge, 0.8);
    assert.equal(dodge.player.invulnerableUntil, dodge.time + 0.85);
    assert.deepEqual(command(dodge, 'dodge'), dodge, 'Forgiving dodge still has a cooldown');
    const struck = tick(warned, 1.7, warned.player);
    assert.equal(struck.health, 112, 'A missed tell costs 8 integrity rather than the Standard 15');
    assert.ok(struck.events.some(event => event.type === 'enemy-attack' && event.hit));
  });

  test('rookie recovery requires a real break from hits and stays within its health and energy caps', () => {
    let state = started('rookie');
    const enemy = state.enemies[0];
    state = tick(state, 3.2, { x: enemy.x, z: enemy.z + 2, facing: Math.PI });
    assert.equal(state.health, 112);
    const hitTime = state.lastDamageAt;
    state = tick(state, 4.6, safe);
    assert.ok(state.time - hitTime < 5); assert.equal(state.health, 112, 'Moving clear does not grant instant health');
    state = tick(state, 4, safe);
    assert.equal(state.health, 120); assert.equal(state.energy, 100);
    const spent = command(state, 'burst');
    assert.equal(spent.energy, 80); assert.equal(spent.cooldowns.burst, 4);
    assert.equal(tick(spent, 2, safe).energy, 100);
    const paused = deepFreeze(spent); assert.deepEqual(advance(paused, 0, safe), paused);
  });

  test('rookie can be finished by a novice using approach and measured strikes, without perfect dodges or HP edits', () => {
    let state = started('rookie'), lastStrike = -1, sufferedDamage = false;
    const seenWaves = new Set(), counts = [];
    for (let step = 0; step < 2400 && state.phase === 'active'; step++) {
      if (!seenWaves.has(state.wave)) { seenWaves.add(state.wave); counts.push(state.enemies.length); }
      const targets = state.enemies.filter(enemy => enemy.hp > 0 && enemy.phase !== 'dead');
      const target = targets.sort((a, b) => Math.hypot(a.x - state.player.x, a.z - state.player.z) - Math.hypot(b.x - state.player.x, b.z - state.player.z))[0];
      const player = { ...state.player };
      if (target) {
        const dx = target.x - player.x, dz = target.z - player.z, len = Math.hypot(dx, dz);
        if (len > 2.2) { player.x += dx / len * 0.15; player.z += dz / len * 0.15; }
      }
      const previousHealth = state.health;
      state = advance(state, 0.05, player);
      if (state.health < previousHealth) sufferedDamage = true;
      // Wait through the first warning once, as a beginner might, then punch.
      if (state.time > 5 && state.time - lastStrike >= 0.65) { state = command(state, 'strike'); lastStrike = state.time; }
      assert.ok(state.health <= state.maxHealth); assert.ok(state.energy <= 100); assert.ok(state.events.length <= 32);
    }
    assert.equal(state.phase, 'victory'); assert.equal(state.kills, 4); assert.deepEqual(counts, [1, 2, 1]);
    assert.equal(state.eligibleReward, true); assert.equal(state.dodges, 0);
    assert.ok(sufferedDamage, 'The novice test includes recoverable mistakes, not perfect play');
    assert.equal(state.events.filter(event => event.type === 'victory').length, 1);
  });

  test('rookie remains an encounter: doing nothing can lose and never completes a wave', () => {
    const idle = tick(started('rookie'), 100);
    assert.equal(idle.phase, 'defeat'); assert.equal(idle.kills, 0); assert.equal(idle.wave, 1);
    assert.equal(idle.events.some(event => event.type === 'victory'), false);
  });

  test('practice is one stationary harmless target, still requires attacks and cannot award challenge gear', () => {
    const initial = started('practice');
    assert.equal(initial.eligibleReward, false); assert.equal(initial.totalWaves, 1); assert.equal(initial.totalEnemies, 1);
    assert.deepEqual(initial.abilityCosts, { strike: 0, burst: 0, dodge: 0, overclock: 0 });
    const idle = tick(deepFreeze(initial), 60, initial.player);
    assert.equal(idle.phase, 'active'); assert.equal(idle.health, 100); assert.equal(idle.kills, 0);
    assert.equal(idle.enemies[0].x, initial.enemies[0].x); assert.equal(idle.enemies[0].z, initial.enemies[0].z);
    assert.equal(idle.events.some(event => event.type === 'telegraph' || event.type === 'enemy-attack'), false);
    let state = command(idle, 'strike'); state = tick(state, 0.4, state.player);
    state = command(state, 'strike'); state = tick(state, 0.4, state.player); state = command(state, 'strike');
    assert.equal(state.phase, 'victory'); assert.equal(state.kills, 1); assert.equal(state.eligibleReward, false);
    assert.equal(state.enemies[0].x, initial.enemies[0].x); assert.equal(state.enemies[0].z, initial.enemies[0].z);
    assert.deepEqual(command(state, 'strike'), state);
    assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  });

  test('Blackout Run is explicit, immutable and distinct from the existing arena reward', () => {
    const ready = createCombat({ difficulty: 'blackout' });
    assert.equal(ready.difficulty, 'blackout'); assert.equal(ready.label, 'Blackout Run'); assert.equal(ready.scenario, 'blackout-run');
    assert.equal(ready.health, 120); assert.equal(ready.maxHealth, 120); assert.equal(ready.totalWaves, 3); assert.equal(ready.totalEnemies, 6);
    assert.equal(ready.eligibleReward, false, 'Blackout uses its own UI receipt, never the Phase Gauntlet receipt');
    assert.deepEqual(ready.abilityCosts, { strike: 0, burst: 18, dodge: 7, overclock: 20 });
    assert.deepEqual(ready.objective, { id: 'intercept-breach', title: 'Intercept breach', instruction: PROFILES.blackout.objectives[0].instruction,
      stage: 1, totalStages: 3, defeated: 0, totalTargets: 6, stageDefeated: 0, stageTargets: 2, stageComplete: false, completed: false, relayRestored: false });
    assert.ok(Object.isFrozen(PROFILES.blackout.objectives)); assert.ok(Object.isFrozen(PROFILES.blackout.objectives[0]));
    assert.ok(Object.isFrozen(PROFILES.blackout.spawnPositions[0])); assert.ok(Object.isFrozen(PROFILES.blackout.enemies.warden));
    const frozen = deepFreeze(command(ready, 'start')), before = JSON.stringify(frozen);
    const dodged = command(frozen, 'dodge');
    dodged.objective.title = 'not shared'; dodged.abilityCosts.dodge = 999;
    assert.equal(JSON.stringify(frozen), before); assert.equal(PROFILES.blackout.objectives[0].title, 'Intercept breach');
    assert.deepEqual(advance(frozen, 0, safe), frozen);
    assert.equal(createCombat().difficulty, 'rookie'); assert.equal(createCombat().totalEnemies, 4);
    assert.equal(standard().totalEnemies, 8); assert.equal(createCombat({difficulty:'practice'}).totalEnemies, 1);
  });

  test('Blackout objective metadata cannot complete a mission or skip stages without actual kills', () => {
    const original = started('blackout');
    const forgedText = { ...original, objective: { ...original.objective, defeated: 6, completed: true, relayRestored: true } };
    const checked = command(deepFreeze(forgedText), 'not-an-action');
    assert.equal(checked.wave, 1); assert.equal(checked.kills, 0); assert.equal(checked.phase, 'active');
    assert.equal(checked.objective.defeated, 0); assert.equal(checked.objective.completed, false); assert.equal(checked.objective.relayRestored, false);
    assert.deepEqual(tick(checked, 1, checked.player).objective, original.objective);
    assert.equal(checked.events.some(event => event.type === 'victory'), false);
  });

  test('a novice can restore the Blackout relay through six real defeats, combos and shield breaks', () => {
    let state = started('blackout'), lastStrike = -1, damaged = false, comboSeen = false, shieldBroken = false, sawLastIntruder = false;
    const stages = [], counts = [];
    for (let frame = 0; frame < 3000 && state.phase === 'active'; frame++) {
      if (stages.length < state.wave) { stages.push(state.objective.id); counts.push(state.enemies.length); }
      const candidates = state.enemies.filter(enemy => enemy.hp > 0 && enemy.phase !== 'dead');
      const target = candidates.sort((a, b) => Math.hypot(a.x - state.player.x, a.z - state.player.z) - Math.hypot(b.x - state.player.x, b.z - state.player.z))[0];
      const player = { ...state.player };
      if (target) {
        const dx = target.x - player.x, dz = target.z - player.z, length = Math.hypot(dx, dz);
        if (length > 2) { player.x += dx / length * .14; player.z += dz / length * .14; }
      }
      const previousHealth = state.health;
      state = advance(state, .05, player);
      if (state.health < previousHealth) damaged = true;
      // The beginner waits long enough to miss an early warning. Afterwards,
      // ordinary approach + unhurried strikes and a shield burst can recover.
      if (state.time > 4.8 && target) {
        const distance = Math.hypot(target.x - state.player.x, target.z - state.player.z);
        if (target.shield > 0 && distance < PROFILES.blackout.burstRadius) state = command(state, 'burst');
        if (state.time - lastStrike >= .55) { state = command(state, 'strike'); lastStrike = state.time; }
      }
      comboSeen ||= state.events.some(event => event.type === 'combo');
      shieldBroken ||= state.events.some(event => event.type === 'shield-break');
      if (state.kills === 5) { sawLastIntruder = true; assert.equal(state.objective.relayRestored, false); }
      assert.equal(state.objective.stage, state.wave);
      assert.equal(state.objective.defeated, state.kills);
      assert.equal(state.objective.stageDefeated, state.kills - (state.wave - 1) * 2);
      assert.ok(state.health <= 120 && state.energy <= 100 && state.events.length <= 32);
      if (state.phase !== 'victory') assert.equal(state.objective.completed, false);
    }
    assert.equal(state.phase, 'victory'); assert.equal(state.kills, 6);
    assert.deepEqual(stages, ['intercept-breach', 'break-malware-shield', 'restore-relay']); assert.deepEqual(counts, [2, 2, 2]);
    assert.equal(state.objective.stageDefeated, 2); assert.equal(state.objective.stageComplete, true);
    assert.equal(state.objective.completed, true); assert.equal(state.objective.relayRestored, true);
    assert.equal(state.eligibleReward, false); assert.ok(damaged && comboSeen && shieldBroken && sawLastIntruder);
    assert.equal(state.events.filter(event => event.type === 'victory').length, 1);
    assert.deepEqual(command(state, 'strike'), state); assert.deepEqual(tick(state, 20), state);
    assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  });

  test('Blackout idle play can lose and never quietly restores the server', () => {
    const idle = tick(started('blackout'), 100);
    assert.equal(idle.phase, 'defeat'); assert.equal(idle.kills, 0); assert.equal(idle.wave, 1);
    assert.equal(idle.objective.stageDefeated, 0); assert.equal(idle.objective.completed, false); assert.equal(idle.objective.relayRestored, false);
    assert.equal(idle.events.some(event => event.type === 'victory'), false);
  });

  console.log(`PASS ascension combat: ${groups} behavior groups`);
})().catch(error => { console.error(error); process.exitCode = 1; });
