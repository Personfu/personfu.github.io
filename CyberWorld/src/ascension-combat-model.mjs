/* Original CyberWorld simulation. All combat affects fictional, local training constructs. */
export const CONTROLS = Object.freeze([
  Object.freeze({ action: 'strike', key: 'J / left click', label: 'Phase strike', description: 'Chain three close-range hits. The finisher staggers and pushes constructs away.' }),
  Object.freeze({ action: 'burst', key: 'K', label: 'Containment burst', description: 'Use energy to break shields and stagger nearby constructs.' }),
  Object.freeze({ action: 'dodge', key: 'Space', label: 'Phase dodge', description: 'Use energy to dash through a telegraphed attack.' }),
  Object.freeze({ action: 'overclock', key: 'L / Q', label: 'Overclock', description: 'Use energy to slow constructs for three seconds.' }),
]);

const SENTINEL = Object.freeze({ hp: 48, shield: 0, speed: 2.2, reach: 2.65, radius: 1.9, windup: 1, recover: 1.1, damage: 15 });
const STRIKER = Object.freeze({ hp: 62, shield: 12, speed: 2.5, reach: 2.7, radius: 1.9, windup: 0.95, recover: 1, damage: 17 });
const WARDEN = Object.freeze({ hp: 180, shield: 48, speed: 1.65, reach: 3.4, radius: 2.8, windup: 1.3, recover: 1.35, damage: 26 });
export const CONFIG = Object.freeze({
  bounds: 11, maxStep: 0.1, maxEvents: 32, strikeRange: 3.2, burstRadius: 4.8,
  strikeCooldown: 0.34, burstCooldown: 5, dodgeCooldown: 1.1, overclockCooldown: 12,
  burstCost: 30, dodgeCost: 18, overclockCost: 35, energyPerSecond: 8,
  dodgeDistance: 2.8, dodgeDuration: 0.65, overclockDuration: 3, overclockScale: 0.35,
  comboWindow: 1.15, wavePause: 1.2,
  waves: Object.freeze([Object.freeze(['sentinel', 'sentinel']), Object.freeze(['sentinel', 'striker', 'sentinel']), Object.freeze(['warden', 'striker', 'sentinel'])]),
  enemies: Object.freeze({ sentinel: SENTINEL, striker: STRIKER, warden: WARDEN }),
  reward: Object.freeze({ xp: 260, credits: 140, item: 'PHASE-GAUNTLET' }),
  controls: CONTROLS,
});

const waves = value => Object.freeze(value.map(wave => Object.freeze(wave)));
const enemySet = (sentinel, striker, warden) => Object.freeze({ sentinel: Object.freeze(sentinel), striker: Object.freeze(striker), warden: Object.freeze(warden) });
// CONFIG remains the original challenge's public tuning. Each run selects an
// explicit profile; these frozen definitions never enter a mutable save record.
export const PROFILES = Object.freeze({
  standard: Object.freeze({ ...CONFIG, id: 'standard', label: 'Standard', maxHealth: 100, eligibleReward: true,
    healthPerSecond: 0, healthRegenDelay: 0, waveHealth: 12, waveEnergy: 20, pushScale: 1, noAttacks: false, spawnDelay: 0.45 }),
  rookie: Object.freeze({ ...CONFIG, id: 'rookie', label: 'Rookie', maxHealth: 120, eligibleReward: true,
    strikeRange: 3.6, burstRadius: 5.2, burstCost: 20, dodgeCost: 8, overclockCost: 25,
    burstCooldown: 4, dodgeCooldown: 0.8, overclockCooldown: 10, dodgeDuration: 0.85, energyPerSecond: 14,
    healthPerSecond: 3, healthRegenDelay: 5, waveHealth: 35, waveEnergy: 35, wavePause: 2.4,
    comboWindow: 1.6, pushScale: 0.7, noAttacks: false, spawnDelay: 1.2,
    waves: waves([['sentinel'], ['sentinel', 'striker'], ['warden']]),
    enemies: enemySet(
      { ...SENTINEL, hp: 42, speed: 1.5, windup: 1.65, recover: 1.7, damage: 8 },
      { ...STRIKER, hp: 58, shield: 8, speed: 1.7, windup: 1.6, recover: 1.6, damage: 9 },
      { ...WARDEN, hp: 115, shield: 24, speed: 1.1, windup: 2, recover: 1.9, damage: 14 }),
  }),
  blackout: Object.freeze({ ...CONFIG, id: 'blackout', label: 'Blackout Run', scenario: 'blackout-run', maxHealth: 120, eligibleReward: false,
    strikeRange: 3.7, burstRadius: 5.1, strikeCooldown: 0.31, burstCost: 18, dodgeCost: 7, overclockCost: 20,
    burstCooldown: 3.8, dodgeCooldown: 0.75, overclockCooldown: 9, dodgeDuration: 0.8, energyPerSecond: 16,
    healthPerSecond: 4, healthRegenDelay: 4.5, waveHealth: 35, waveEnergy: 40, wavePause: 1.8,
    comboWindow: 1.5, pushScale: 0.55, noAttacks: false, spawnDelay: 0.9,
    waves: waves([['sentinel', 'sentinel'], ['striker', 'sentinel'], ['warden', 'striker']]),
    spawnPositions: waves([[-3, -2.5], [3, -2.5]]),
    objectives: Object.freeze([
      Object.freeze({ id: 'intercept-breach', title: 'Intercept breach', instruction: 'Stop the two intruders before they reach the relay. Move close and attack; amber ground means dodge.' }),
      Object.freeze({ id: 'break-malware-shield', title: 'Break malware shield', instruction: 'Clear the shielded malware and its guard. Burst breaks shields; steady attacks work too.' }),
      Object.freeze({ id: 'restore-relay', title: 'Restore relay', instruction: 'Beat the relay Warden and the last intruder. The server comes back online only after both are stopped.' }),
    ]),
    enemies: enemySet(
      { ...SENTINEL, hp: 60, speed: 1.8, windup: 1.5, recover: 1.6, damage: 9 },
      { ...STRIKER, hp: 65, shield: 20, speed: 1.65, windup: 1.7, recover: 1.6, damage: 10 },
      { ...WARDEN, hp: 125, shield: 30, speed: 1.25, windup: 1.9, recover: 1.8, damage: 15 }),
  }),
  practice: Object.freeze({ ...CONFIG, id: 'practice', label: 'Practice', maxHealth: 100, eligibleReward: false,
    strikeRange: 3.6, burstRadius: 5.2, burstCost: 0, dodgeCost: 0, overclockCost: 0,
    burstCooldown: 2, dodgeCooldown: 0.5, overclockCooldown: 4, dodgeDuration: 0.85, energyPerSecond: 20,
    healthPerSecond: 0, healthRegenDelay: 0, waveHealth: 0, waveEnergy: 0,
    comboWindow: 2, pushScale: 0, noAttacks: true, spawnDelay: 0,
    waves: waves([['sentinel']]),
    enemies: enemySet({ ...SENTINEL, hp: 72, speed: 0, damage: 0 }, STRIKER, WARDEN),
  }),
});

function selectProfile(difficulty, fallback) { return typeof difficulty === 'string' && Object.hasOwn(PROFILES, difficulty) ? PROFILES[difficulty] : PROFILES[fallback]; }
function profileFor(state) { return selectProfile(state?.difficulty, 'standard'); }
function metadata(profile) {
  return { difficulty: profile.id, label: profile.label, totalWaves: profile.waves.length,
    totalEnemies: profile.waves.reduce((total, wave) => total + wave.length, 0), maxHealth: profile.maxHealth,
    eligibleReward: profile.eligibleReward,
    ...(profile.scenario ? { scenario: profile.scenario } : {}),
    abilityCosts: { strike: 0, burst: profile.burstCost, dodge: profile.dodgeCost, overclock: profile.overclockCost } };
}
function missionState(state) {
  const profile = profileFor(state);
  if (!profile.objectives) return state;
  const index = Math.max(0, Math.min(profile.waves.length - 1, state.wave - 1));
  const earlierTargets = profile.waves.slice(0, index).reduce((total, wave) => total + wave.length, 0);
  const stageTargets = profile.waves[index].length;
  const stageDefeated = Math.max(0, Math.min(stageTargets, state.kills - earlierTargets));
  const completed = state.phase === 'victory' && state.kills === state.totalEnemies;
  state.objective = { ...profile.objectives[index], stage: index + 1, totalStages: profile.waves.length,
    defeated: Math.max(0, Math.min(state.totalEnemies, state.kills)), totalTargets: state.totalEnemies,
    stageDefeated, stageTargets, stageComplete: stageDefeated === stageTargets, completed, relayRestored: completed };
  return state;
}

const TAU = Math.PI * 2;
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const position = value => clamp(value, -CONFIG.bounds, CONFIG.bounds);
const angle = value => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const alive = enemy => enemy.hp > 0 && enemy.phase !== 'dead';

export function createCombat(options = {}) {
  const profile = selectProfile(options?.difficulty, 'rookie');
  return missionState({
    version: 1, ...metadata(profile), phase: 'ready', wave: 1, health: profile.maxHealth, energy: 100, combo: 0, score: 0, time: 0,
    cooldowns: { strike: 0, burst: 0, dodge: 0, overclock: 0 },
    player: { x: 0, z: 5, facing: Math.PI, attackUntil: 0, dodgeUntil: 0, invulnerableUntil: 0 },
    enemies: [], events: [], kills: 0, dodges: 0, comboUntil: 0,
    overclockUntil: 0, waveDelay: 0, nextEnemyId: 1, nextEventId: 1, lastDamageAt: -10,
  });
}

function copy(state) {
  if (!state || state.version !== 1 || !Array.isArray(state.enemies) || !Array.isArray(state.events)) return createCombat();
  return missionState({
    ...state, ...metadata(profileFor(state)),
    player: { ...state.player }, cooldowns: { ...state.cooldowns },
    enemies: state.enemies.slice(0, 4).map(enemy => ({ ...enemy })),
    events: state.events.slice(-CONFIG.maxEvents).map(event => ({ ...event })),
  });
}

function event(state, type, x, z, text, extra = {}) {
  state.events.push({ id: state.nextEventId++, type, x, z, text, time: state.time, ...extra });
  if (state.events.length > CONFIG.maxEvents) state.events.splice(0, state.events.length - CONFIG.maxEvents);
}

function spawnWave(state) {
  const profile = profileFor(state);
  const positions = profile.spawnPositions || (profile.noAttacks ? [[0, 3]] : [[0, -7], [-6.5, -3], [6.5, -3]]);
  state.enemies = profile.waves[state.wave - 1].map((type, index) => {
    const rule = profile.enemies[type], [x, z] = positions[index];
    return { id: state.nextEnemyId++, type, hp: rule.hp, maxHp: rule.hp, shield: rule.shield, maxShield: rule.shield,
      x, z, facing: 0, phase: 'chase', timer: profile.spawnDelay + index * 0.2, attackX: x, attackZ: z, attackRadius: rule.radius };
  });
  state.waveDelay = 0;
  const prompt = profile.objectives ? `Stage ${state.wave} — ${profile.objectives[state.wave - 1].title}. ${profile.objectives[state.wave - 1].instruction}`
    : profile.noAttacks ? 'Practice — move close and hold Strike. This target will not attack.'
    : profile.id === 'rookie' && state.wave === 1 ? 'Wave 1 — one construct. Move close, then hold Strike.'
      : state.wave === 3 ? 'Wave 3 — Prism Warden. Break its shield; escape the wide amber telegraph.'
        : `Wave ${state.wave} — read the amber telegraphs, then counter.`;
  event(state, 'wave', 0, -6, prompt);
}

function finishWave(state) {
  if (state.phase !== 'active' || state.waveDelay > 0 || state.enemies.some(alive)) return;
  const profile = profileFor(state);
  state.combo = 0;
  if (state.wave === profile.waves.length) {
    state.phase = 'victory';
    state.score += Math.round(state.health * 5);
    event(state, 'victory', state.player.x, state.player.z, profile.scenario === 'blackout-run' ? 'RELAY RESTORED — Blackout Run complete.' : profile.noAttacks ? 'PRACTICE COMPLETE — ready to try a Rookie run?' : 'BREACH CONTAINED — the training grid is secure.');
  } else {
    state.waveDelay = profile.wavePause;
    state.health = Math.min(profile.maxHealth, state.health + profile.waveHealth);
    state.energy = Math.min(100, state.energy + profile.waveEnergy);
    event(state, 'wave-clear', state.player.x, state.player.z, `Wave ${state.wave} clear · +${profile.waveHealth} integrity · +${profile.waveEnergy} energy`);
  }
}

function damage(state, enemy, amount, push, shieldBreak = false) {
  if (!alive(enemy)) return;
  push *= profileFor(state).pushScale;
  if (shieldBreak && enemy.shield > 0) {
    enemy.shield = 0;
    event(state, 'shield-break', enemy.x, enemy.z, 'SHIELD BROKEN', { enemyId: enemy.id });
  }
  const absorbed = Math.min(enemy.shield, amount);
  enemy.shield -= absorbed;
  const dealt = Math.min(enemy.hp, amount - absorbed);
  enemy.hp -= dealt;
  state.score += 10;
  event(state, 'hit', enemy.x, enemy.z, absorbed > 0 ? `${dealt} · shield ${absorbed}` : String(dealt), { enemyId: enemy.id, damage: dealt });
  if (enemy.hp <= 0) {
    enemy.hp = 0; enemy.phase = 'dead'; enemy.timer = 0;
    state.kills++;
    state.score += enemy.type === 'warden' ? 300 : 100;
    event(state, 'kill', enemy.x, enemy.z, enemy.type === 'warden' ? 'WARDEN CONTAINED' : 'CONSTRUCT CONTAINED', { enemyId: enemy.id });
    return;
  }
  if (push > 0) {
    let dx = enemy.x - state.player.x, dz = enemy.z - state.player.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) { dx = Math.sin(state.player.facing); dz = Math.cos(state.player.facing); }
    else { dx /= length; dz /= length; }
    enemy.x = position(enemy.x + dx * push); enemy.z = position(enemy.z + dz * push);
    enemy.phase = 'recover'; enemy.timer = 0.85;
  }
}

/** Commands never advance time. Cooldowns make repeated same-frame input inert. */
export function command(input, action) {
  const state = copy(input), type = typeof action === 'string' ? action : action?.type;
  const profile = profileFor(state);
  if (type === 'start' && state.phase === 'ready') { state.phase = 'active'; spawnWave(state); return missionState(state); }
  if (state.phase !== 'active' || !Object.hasOwn(state.cooldowns, type) || state.cooldowns[type] > 0) return state;
  if (type === 'strike') {
    state.cooldowns.strike = profile.strikeCooldown;
    state.player.attackUntil = state.time + 0.22;
    const target = state.enemies.filter(alive).filter(enemy => distance(enemy, state.player) <= profile.strikeRange)
      .sort((a, b) => distance(a, state.player) - distance(b, state.player) || a.id - b.id)[0];
    if (!target) { state.combo = 0; event(state, 'miss', state.player.x, state.player.z, 'Close the distance'); return state; }
    state.player.facing = Math.atan2(target.x - state.player.x, target.z - state.player.z);
    state.combo = state.time <= state.comboUntil ? state.combo % 3 + 1 : 1;
    state.comboUntil = state.time + profile.comboWindow;
    const finisher = state.combo === 3;
    event(state, 'strike', state.player.x, state.player.z, finisher ? 'PHASE FINISHER' : 'PHASE STRIKE', { facing: state.player.facing, combo: state.combo, radius: profile.strikeRange });
    damage(state, target, finisher ? 38 : state.combo === 2 ? 27 : 24, finisher ? 2.2 : 0);
    state.energy = Math.min(100, state.energy + 3);
    if (finisher) { state.score += 25; event(state, 'combo', target.x, target.z, 'TRIPLE PHASE · STAGGER'); }
  } else if (type === 'burst') {
    if (state.energy < profile.burstCost) return state;
    state.energy -= profile.burstCost; state.cooldowns.burst = profile.burstCooldown;
    state.player.attackUntil = state.time + 0.32;
    event(state, 'burst', state.player.x, state.player.z, 'CONTAINMENT BURST', { radius: profile.burstRadius });
    for (const enemy of state.enemies) if (alive(enemy) && distance(enemy, state.player) <= profile.burstRadius) damage(state, enemy, 42, 2.8, true);
  } else if (type === 'dodge') {
    if (state.energy < profile.dodgeCost) return state;
    state.energy -= profile.dodgeCost; state.cooldowns.dodge = profile.dodgeCooldown;
    state.player.dodgeUntil = state.time + profile.dodgeDuration;
    state.player.invulnerableUntil = state.time + profile.dodgeDuration;
    state.dodges++;
    event(state, 'dodge', state.player.x, state.player.z, 'PHASE DODGE');
  } else if (type === 'overclock') {
    if (state.energy < profile.overclockCost) return state;
    state.energy -= profile.overclockCost; state.cooldowns.overclock = profile.overclockCooldown;
    state.overclockUntil = state.time + profile.overclockDuration;
    event(state, 'overclock', state.player.x, state.player.z, 'OVERCLOCK · CONSTRUCT TIME 35%');
  }
  finishWave(state);
  return missionState(state);
}

/** Advance a bounded simulation step; the world owns movement and supplies the avatar position. */
export function advance(input, delta, player = {}) {
  const state = copy(input);
  const profile = profileFor(state);
  const dt = clamp(finite(delta), 0, CONFIG.maxStep);
  if (state.phase !== 'active' || dt === 0) return state;
  state.player.x = position(finite(player.x, state.player.x));
  state.player.z = position(finite(player.z, state.player.z));
  state.player.facing = angle(finite(player.facing, state.player.facing));
  const oldTime = state.time;
  state.time = Math.min(86400, state.time + dt);
  const slowTime = Math.max(0, Math.min(dt, state.overclockUntil - oldTime));
  const enemyDt = dt - slowTime * (1 - profile.overclockScale);
  for (const key of Object.keys(state.cooldowns)) state.cooldowns[key] = Math.max(0, state.cooldowns[key] - dt);
  state.energy = Math.min(100, state.energy + dt * profile.energyPerSecond);
  if (profile.healthPerSecond > 0 && state.time - state.lastDamageAt >= profile.healthRegenDelay) {
    state.health = Math.min(profile.maxHealth, state.health + dt * profile.healthPerSecond);
  }
  if (state.time > state.comboUntil) state.combo = 0;
  if (state.waveDelay > 0) {
    state.waveDelay = Math.max(0, state.waveDelay - dt);
    if (state.waveDelay === 0) { state.wave++; spawnWave(state); }
    return missionState(state);
  }
  for (const enemy of state.enemies) {
    if (!alive(enemy) || state.phase !== 'active') continue;
    const rule = profile.enemies[enemy.type];
    enemy.facing = Math.atan2(state.player.x - enemy.x, state.player.z - enemy.z);
    if (profile.noAttacks) continue;
    if (enemy.phase === 'windup') {
      enemy.timer = Math.max(0, enemy.timer - enemyDt);
      if (enemy.timer > 0) continue;
      const hit = Math.hypot(state.player.x - enemy.attackX, state.player.z - enemy.attackZ) <= enemy.attackRadius;
      const immune = state.player.invulnerableUntil > state.time;
      event(state, 'enemy-attack', enemy.attackX, enemy.attackZ, hit && !immune ? `INTEGRITY −${rule.damage}` : immune && hit ? 'PHASE EVADE' : 'ATTACK EVADED', { enemyId: enemy.id, radius: enemy.attackRadius, hit: hit && !immune });
      if (hit && !immune) {
        state.health = Math.max(0, state.health - rule.damage); state.combo = 0; state.lastDamageAt = state.time;
        if (state.health === 0) { state.phase = 'defeat'; event(state, 'defeat', state.player.x, state.player.z, 'SIMULATION ENDED — retry and dodge the amber ground circles.'); }
      } else if (hit && immune) state.score += 15;
      enemy.phase = 'recover'; enemy.timer = rule.recover;
      continue;
    }
    if (enemy.timer > 0) { enemy.timer = Math.max(0, enemy.timer - enemyDt); continue; }
    if (enemy.phase === 'recover') enemy.phase = 'chase';
    if (distance(enemy, state.player) <= rule.reach) {
      enemy.phase = 'windup'; enemy.timer = rule.windup;
      enemy.attackX = state.player.x; enemy.attackZ = state.player.z; enemy.attackRadius = rule.radius;
      event(state, 'telegraph', enemy.attackX, enemy.attackZ, enemy.type === 'warden' ? 'WARDEN CLEAVE — LEAVE THE AMBER CIRCLE' : 'Incoming strike — move or phase dodge', { enemyId: enemy.id, radius: enemy.attackRadius, duration: rule.windup });
      continue;
    }
    const dx = state.player.x - enemy.x, dz = state.player.z - enemy.z, length = Math.hypot(dx, dz);
    const step = Math.min(rule.speed * enemyDt, Math.max(0, length - 1.2));
    if (length > 0) { enemy.x = position(enemy.x + dx / length * step); enemy.z = position(enemy.z + dz / length * step); }
  }
  // Stable pair order and equal displacement keep constructs from stacking.
  for (let i = 0; i < state.enemies.length; i++) for (let j = i + 1; j < state.enemies.length; j++) {
    const a = state.enemies[i], b = state.enemies[j];
    if (!alive(a) || !alive(b) || a.phase === 'windup' || b.phase === 'windup') continue;
    let dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    if (length >= 1.3) continue;
    if (length < 0.001) { dx = 1; dz = 0; length = 1; }
    const separation = Math.min(0.12, (1.3 - Math.min(length, 1.3)) * 0.5);
    a.x = position(a.x - dx / length * separation); a.z = position(a.z - dz / length * separation);
    b.x = position(b.x + dx / length * separation); b.z = position(b.z + dz / length * separation);
  }
  finishWave(state);
  return missionState(state);
}
