/* Original CyberWorld simulation. All combat affects fictional, local training constructs. */
export const CONTROLS = Object.freeze([
  Object.freeze({ action: 'strike', key: 'J / left click', label: 'Phase strike', description: 'Chain three close-range hits. The finisher staggers and pushes constructs away.' }),
  Object.freeze({ action: 'burst', key: 'K', label: 'Containment burst', description: 'Spend 30 energy to break shields and stagger nearby constructs.' }),
  Object.freeze({ action: 'dodge', key: 'Space', label: 'Phase dodge', description: 'Spend 18 energy to dash through a telegraphed attack.' }),
  Object.freeze({ action: 'overclock', key: 'L / Q', label: 'Overclock', description: 'Spend 35 energy to slow constructs for three seconds.' }),
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

const TAU = Math.PI * 2;
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const position = value => clamp(value, -CONFIG.bounds, CONFIG.bounds);
const angle = value => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const alive = enemy => enemy.hp > 0 && enemy.phase !== 'dead';

export function createCombat() {
  return {
    version: 1, phase: 'ready', wave: 1, health: 100, energy: 100, combo: 0, score: 0, time: 0,
    cooldowns: { strike: 0, burst: 0, dodge: 0, overclock: 0 },
    player: { x: 0, z: 5, facing: Math.PI, attackUntil: 0, dodgeUntil: 0, invulnerableUntil: 0 },
    enemies: [], events: [], kills: 0, dodges: 0, comboUntil: 0,
    overclockUntil: 0, waveDelay: 0, nextEnemyId: 1, nextEventId: 1,
  };
}

function copy(state) {
  if (!state || state.version !== 1 || !Array.isArray(state.enemies) || !Array.isArray(state.events)) return createCombat();
  return {
    ...state,
    player: { ...state.player }, cooldowns: { ...state.cooldowns },
    enemies: state.enemies.slice(0, 4).map(enemy => ({ ...enemy })),
    events: state.events.slice(-CONFIG.maxEvents).map(event => ({ ...event })),
  };
}

function event(state, type, x, z, text, extra = {}) {
  state.events.push({ id: state.nextEventId++, type, x, z, text, time: state.time, ...extra });
  if (state.events.length > CONFIG.maxEvents) state.events.splice(0, state.events.length - CONFIG.maxEvents);
}

function spawnWave(state) {
  const positions = [[0, -7], [-6.5, -3], [6.5, -3]];
  state.enemies = CONFIG.waves[state.wave - 1].map((type, index) => {
    const rule = CONFIG.enemies[type], [x, z] = positions[index];
    return { id: state.nextEnemyId++, type, hp: rule.hp, maxHp: rule.hp, shield: rule.shield, maxShield: rule.shield,
      x, z, facing: 0, phase: 'chase', timer: 0.45 + index * 0.2, attackX: x, attackZ: z, attackRadius: rule.radius };
  });
  state.waveDelay = 0;
  event(state, 'wave', 0, -6, state.wave === 3 ? 'Wave 3 — Prism Warden. Break its shield; escape the wide amber telegraph.' : `Wave ${state.wave} — read the amber telegraphs, then counter.`);
}

function finishWave(state) {
  if (state.phase !== 'active' || state.waveDelay > 0 || state.enemies.some(alive)) return;
  state.combo = 0;
  if (state.wave === CONFIG.waves.length) {
    state.phase = 'victory';
    state.score += Math.round(state.health * 5);
    event(state, 'victory', state.player.x, state.player.z, 'BREACH CONTAINED — the training grid is secure.');
  } else {
    state.waveDelay = CONFIG.wavePause;
    state.health = Math.min(100, state.health + 12);
    state.energy = Math.min(100, state.energy + 20);
    event(state, 'wave-clear', state.player.x, state.player.z, `Wave ${state.wave} clear · +12 integrity · +20 energy`);
  }
}

function damage(state, enemy, amount, push, shieldBreak = false) {
  if (!alive(enemy)) return;
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
  if (type === 'start' && state.phase === 'ready') { state.phase = 'active'; spawnWave(state); return state; }
  if (state.phase !== 'active' || !Object.hasOwn(state.cooldowns, type) || state.cooldowns[type] > 0) return state;
  if (type === 'strike') {
    state.cooldowns.strike = CONFIG.strikeCooldown;
    state.player.attackUntil = state.time + 0.22;
    const target = state.enemies.filter(alive).filter(enemy => distance(enemy, state.player) <= CONFIG.strikeRange)
      .sort((a, b) => distance(a, state.player) - distance(b, state.player) || a.id - b.id)[0];
    if (!target) { state.combo = 0; event(state, 'miss', state.player.x, state.player.z, 'Close the distance'); return state; }
    state.player.facing = Math.atan2(target.x - state.player.x, target.z - state.player.z);
    state.combo = state.time <= state.comboUntil ? state.combo % 3 + 1 : 1;
    state.comboUntil = state.time + CONFIG.comboWindow;
    const finisher = state.combo === 3;
    event(state, 'strike', state.player.x, state.player.z, finisher ? 'PHASE FINISHER' : 'PHASE STRIKE', { facing: state.player.facing, combo: state.combo, radius: CONFIG.strikeRange });
    damage(state, target, finisher ? 38 : state.combo === 2 ? 27 : 24, finisher ? 2.2 : 0);
    state.energy = Math.min(100, state.energy + 3);
    if (finisher) { state.score += 25; event(state, 'combo', target.x, target.z, 'TRIPLE PHASE · STAGGER'); }
  } else if (type === 'burst') {
    if (state.energy < CONFIG.burstCost) return state;
    state.energy -= CONFIG.burstCost; state.cooldowns.burst = CONFIG.burstCooldown;
    state.player.attackUntil = state.time + 0.32;
    event(state, 'burst', state.player.x, state.player.z, 'CONTAINMENT BURST');
    for (const enemy of state.enemies) if (alive(enemy) && distance(enemy, state.player) <= CONFIG.burstRadius) damage(state, enemy, 42, 2.8, true);
  } else if (type === 'dodge') {
    if (state.energy < CONFIG.dodgeCost) return state;
    state.energy -= CONFIG.dodgeCost; state.cooldowns.dodge = CONFIG.dodgeCooldown;
    state.player.dodgeUntil = state.time + CONFIG.dodgeDuration;
    state.player.invulnerableUntil = state.time + CONFIG.dodgeDuration;
    state.dodges++;
    event(state, 'dodge', state.player.x, state.player.z, 'PHASE DODGE');
  } else if (type === 'overclock') {
    if (state.energy < CONFIG.overclockCost) return state;
    state.energy -= CONFIG.overclockCost; state.cooldowns.overclock = CONFIG.overclockCooldown;
    state.overclockUntil = state.time + CONFIG.overclockDuration;
    event(state, 'overclock', state.player.x, state.player.z, 'OVERCLOCK · CONSTRUCT TIME 35%');
  }
  finishWave(state);
  return state;
}

/** Advance a bounded simulation step; the world owns movement and supplies the avatar position. */
export function advance(input, delta, player = {}) {
  const state = copy(input);
  const dt = clamp(finite(delta), 0, CONFIG.maxStep);
  if (state.phase !== 'active' || dt === 0) return state;
  state.player.x = position(finite(player.x, state.player.x));
  state.player.z = position(finite(player.z, state.player.z));
  state.player.facing = angle(finite(player.facing, state.player.facing));
  const oldTime = state.time;
  state.time = Math.min(86400, state.time + dt);
  const slowTime = Math.max(0, Math.min(dt, state.overclockUntil - oldTime));
  const enemyDt = dt - slowTime * (1 - CONFIG.overclockScale);
  for (const key of Object.keys(state.cooldowns)) state.cooldowns[key] = Math.max(0, state.cooldowns[key] - dt);
  state.energy = Math.min(100, state.energy + dt * CONFIG.energyPerSecond);
  if (state.time > state.comboUntil) state.combo = 0;
  if (state.waveDelay > 0) {
    state.waveDelay = Math.max(0, state.waveDelay - dt);
    if (state.waveDelay === 0) { state.wave++; spawnWave(state); }
    return state;
  }
  for (const enemy of state.enemies) {
    if (!alive(enemy) || state.phase !== 'active') continue;
    const rule = CONFIG.enemies[enemy.type];
    enemy.facing = Math.atan2(state.player.x - enemy.x, state.player.z - enemy.z);
    if (enemy.phase === 'windup') {
      enemy.timer = Math.max(0, enemy.timer - enemyDt);
      if (enemy.timer > 0) continue;
      const hit = Math.hypot(state.player.x - enemy.attackX, state.player.z - enemy.attackZ) <= enemy.attackRadius;
      const immune = state.player.invulnerableUntil > state.time;
      event(state, 'enemy-attack', enemy.attackX, enemy.attackZ, hit && !immune ? `INTEGRITY −${rule.damage}` : immune && hit ? 'PHASE EVADE' : 'ATTACK EVADED', { enemyId: enemy.id, radius: enemy.attackRadius, hit: hit && !immune });
      if (hit && !immune) {
        state.health = Math.max(0, state.health - rule.damage); state.combo = 0;
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
  return state;
}
