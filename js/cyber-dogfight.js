(() => {
  'use strict';

  const REPO = 'dogfight/dogfight-sandbox-hg2/';
  const SCREENSHOTS = [
    `${REPO}screenshots/screenshot_0.png`,
    `${REPO}screenshots/screenshot_1.png`,
    `${REPO}screenshots/screenshot_2.png`,
    `${REPO}screenshots/screenshot_3.png`,
    `${REPO}screenshots/screenshot_4.png`,
    `${REPO}screenshots/screenshot_5.png`
  ];

  const CRAFT = [
    { id: 'f47', designator: 'F-47', name: 'Boeing F-47 Thunderstorm NGAD', generation: 'Seventh Gen Fighter', model: 'TFX', speed: 1.35, turn: 1.15, shield: 110, mission: 'CYBERWORLD HANGAR // F-47 NGAD CHECKOUT', uid: 'a89532840fea44bbb7cc7ce2e6483cfb', source: 'https://sketchfab.com/3d-models/boeing-f-47-thunderstorm-ngad-a89532840fea44bbb7cc7ce2e6483cfb', hull: 'delta', classPath: 'source/aircraft_tfx.py', scenePath: 'source/assets/machines/tfx/TFX.scn', thrust: 20, speedCeiling: 2500, maxAltitude: 30000, missiles: ['AIM_SL', 'AIM_SL', 'AIM_SL', 'AIM_SL'], mobileParts: ['aileron_left', 'aileron_right', 'elevator', 'rudder_left', 'rudder_right'], screenshot: SCREENSHOTS[0] },
    { id: 'tr3b', designator: 'TR-3B', name: 'TR-3B Black Manta - OMSX', generation: 'UAP / ARV', model: 'Miuss', speed: 2.4, turn: 1.8, shield: 160, mission: 'CYBERWORLD UAP INTERCEPT // TR-3B SHADOW', uid: 'faaff1bb94e847d3b2efacdb458ac43a', source: 'https://sketchfab.com/3d-models/tr-3b-black-manta-omsx-faaff1bb94e847d3b2efacdb458ac43a', hull: 'triangle', classPath: 'source/aircraft_miuss.py', scenePath: 'source/assets/machines/mius/miuss.scn', thrust: 20, speedCeiling: 3000, maxAltitude: 50000, missiles: ['Mica', 'Meteor', 'AIM_SL', 'AIM_SL', 'Meteor', 'Mica'], mobileParts: ['aileron_left', 'aileron_right', 'elevator'], screenshot: SCREENSHOTS[1] },
    { id: 'tictac', designator: 'TT-01', name: 'Tic-Tac UAP / UFO with Warp Bubble', generation: 'UAP / Transmedium', model: 'Miuss', speed: 3.0, turn: 2.0, shield: 130, mission: 'CYBERWORLD SENSOR CHASE // TIC-TAC WARP BUBBLE', uid: 'be98ae34d7dd49009164f0472c85bdd9', source: 'https://sketchfab.com/3d-models/tic-tac-uap-ufo-with-warp-bubble-be98ae34d7dd49009164f0472c85bdd9', hull: 'capsule', classPath: 'source/aircraft_miuss.py', scenePath: 'source/assets/machines/mius/miuss.scn', thrust: 20, speedCeiling: 3000, maxAltitude: 50000, missiles: ['Mica', 'Meteor', 'AIM_SL', 'AIM_SL', 'Meteor', 'Mica'], mobileParts: ['field envelope', 'capsule shell', 'sensor chase'], screenshot: SCREENSHOTS[2] },
    { id: 'sr75', designator: 'SR-75', name: 'SR-75 Penetrator', generation: 'Hypersonic Recon', model: 'F16', speed: 2.2, turn: .75, shield: 90, mission: 'CYBERWORLD DEEP RECON // SR-75 PENETRATOR', uid: 'a2ead21184e6435aac3aee8dc6aa9017', source: 'https://sketchfab.com/3d-models/sr-75-penetrator-a2ead21184e6435aac3aee8dc6aa9017', hull: 'dart', classPath: 'source/aircraft_f16.py', scenePath: 'source/assets/machines/f16/f16.scn', thrust: 20, speedCeiling: 2500, maxAltitude: 30000, missiles: ['AIM_SL', 'Karaoke', 'CFT'], mobileParts: ['aileron', 'elevator', 'rudder', 'gear'], screenshot: SCREENSHOTS[3] },
    { id: 'ngad-prime', designator: 'NGAD-P', name: 'Lockheed NGAD Prime - Concept Fighter', generation: 'Sixth/Seventh Gen Fighter', model: 'Eurofighter', speed: 1.28, turn: 1.2, shield: 105, mission: 'CYBERWORLD AIR DOMINANCE // NGAD PRIME', uid: 'e18a52bd7d444a12b06359dbdff6b3f8', source: 'https://sketchfab.com/3d-models/lockheed-ngad-prime-concept-fighter-e18a52bd7d444a12b06359dbdff6b3f8', hull: 'delta', classPath: 'source/aircraft_eurofighter.py', scenePath: 'source/assets/machines/eurofighter/eurofighter_blend.scn', thrust: 20, speedCeiling: 2500, maxAltitude: 30000, missiles: ['Meteor', 'Mica', 'Mica', 'Mica', 'Mica', 'Meteor'], mobileParts: ['wing_flap', 'elevator', 'rudder', 'brake_flap'], screenshot: SCREENSHOTS[4] },
    { id: 'faxx', designator: 'FA-XX', name: 'Boeing FA-XX', generation: 'Sixth Gen Naval Fighter', model: 'Rafale', speed: 1.22, turn: 1.25, shield: 100, mission: 'CYBERWORLD CARRIER DECK // FA-XX', uid: 'a910120ddc034d40a8ba6158dc12626e', source: 'https://sketchfab.com/3d-models/boeing-fa-xx-a910120ddc034d40a8ba6158dc12626e', hull: 'naval', classPath: 'source/aircraft_rafale.py', scenePath: 'source/assets/machines/rafale/rafale.scn', thrust: 20, speedCeiling: 2500, maxAltitude: 30000, missiles: ['Mica', 'Meteor', 'Meteor', 'Meteor', 'Meteor', 'Mica'], mobileParts: ['canards', 'flaps', 'elevator', 'gear'], screenshot: SCREENSHOTS[5] },
    { id: 'orion', designator: 'ORION', name: 'NASA Orion Spacecraft', generation: 'Orbital Spacecraft', model: 'TFX', speed: .9, turn: .45, shield: 180, mission: 'CYBERWORLD ORBITAL ESCORT // ORION', uid: '1b783d2e242b4021a9ccdce44a051dc3', source: 'https://sketchfab.com/3d-models/nasa-orion-spacecraft-1b783d2e242b4021a9ccdce44a051dc3', hull: 'orbital', classPath: 'source/aircraft_tfx.py', scenePath: 'source/assets/machines/tfx/TFX.scn', thrust: 20, speedCeiling: 2500, maxAltitude: 30000, missiles: ['escort beacon', 'orbital telemetry'], mobileParts: ['service module', 'crew module', 'navigation ring'], screenshot: SCREENSHOTS[0] }
  ];

  const COMMANDS = ['Home thrust+', 'End thrust-', 'B/N brake', 'C/V flaps', 'G gear', 'A autopilot', 'I IA', 'Enter gun', 'F1 missile', 'T target'];
  const backdrops = SCREENSHOTS.map((src) => {
    const image = new Image();
    image.src = src;
    return image;
  });

  const canvas = document.getElementById('dogfight-canvas');
  const ctx = canvas.getContext('2d');
  const roster = document.getElementById('craft-roster');
  const dossier = document.getElementById('dossier');
  const craftName = document.getElementById('craft-name');
  const craftStatus = document.getElementById('craft-status');
  const missionTitle = document.getElementById('mission-title');
  const shieldBar = document.getElementById('shield-bar');
  const heatBar = document.getElementById('heat-bar');
  const threatBar = document.getElementById('threat-bar');
  const shieldLabel = document.getElementById('shield-label');
  const heatLabel = document.getElementById('heat-label');
  const threatLabel = document.getElementById('threat-label');
  const taskMode = document.getElementById('task-mode');
  const taskScore = document.getElementById('task-score');
  const taskWave = document.getElementById('task-wave');
  const sourceBadge = document.getElementById('source-badge');

  const keys = new Set();
  const STARS = Array.from({ length: 180 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.8 + 0.4,
    bright: Math.random(),
    drift: Math.random() * 0.00012 + 0.00004
  }));
  const state = {
    selected: 0,
    mode: 'hangar',
    score: 0,
    wave: 1,
    camera: 0,
    threat: 0,
    log: [],
    player: null,
    shots: [],
    enemies: [],
    particles: [],
    lastShot: 0,
    lastMissile: 0,
    lastSpawn: 0,
    time: 0,
    shake: 0,
    trail: [],
    locked: -1,
    waveState: 'active',
    waveTimer: 0
  };

  function init() {
    roster.innerHTML = CRAFT.map((craft, index) => `
      <button class="craft" data-index="${index}">
        <span class="badge">${escapeHtml(craft.designator)}</span>
        <span><strong>${escapeHtml(craft.name)}</strong><small>${escapeHtml(craft.generation)} / Dogfight class ${escapeHtml(craft.model)}</small></span>
      </button>`).join('');

    roster.addEventListener('click', (event) => {
      const button = event.target.closest('[data-index]');
      if (!button) return;
      state.selected = Number(button.dataset.index);
      resetPlayer();
      renderPanels();
    });

    document.getElementById('launch-btn').addEventListener('click', launch);
    document.getElementById('dock-btn').addEventListener('click', dock);
    document.getElementById('pulse-btn').addEventListener('click', pulse);
    document.getElementById('camera-btn').addEventListener('click', cycleCamera);
    window.addEventListener('keydown', (event) => {
      keys.add(event.key.toLowerCase());
      if (event.key === ' ') { event.preventDefault(); fire(); }
      if (event.key === 'Tab') { event.preventDefault(); cycleLock(); }
      if (event.key.toLowerCase() === 'm') fireMissile();
    });
    window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
    window.addEventListener('resize', resize);

    resize();
    resetPlayer();
    addLog('HANGAR READY');
    renderPanels();
    requestAnimationFrame(frame);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.max(640, Math.floor(rect.width * scale));
    canvas.height = Math.max(420, Math.floor(rect.height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function resetPlayer() {
    const craft = CRAFT[state.selected];
    state.player = {
      x: canvas.clientWidth * .5,
      y: canvas.clientHeight * .64,
      angle: -Math.PI / 2,
      speed: 0,
      shield: craft.shield,
      heat: 0,
      pulse: 0,
      missiles: craft.missiles.filter(m => !['escort beacon','orbital telemetry'].includes(m)).length || 0
    };
  }

  function launch() {
    state.mode = 'sortie';
    state.enemies = [];
    state.shots = [];
    state.particles = [];
    state.threat = Math.min(100, 28 + state.wave * 6);
    state.locked = -1;
    state.waveState = 'active';
    state.waveTimer = 0;
    resetPlayer();
    addLog(`SORTIE ${String(state.wave).padStart(2, '0')} ACTIVE`);
    spawnEnemy(true);
    renderPanels();
  }

  function dock() {
    state.mode = 'hangar';
    state.threat = Math.max(0, state.threat - 16);
    state.locked = -1;
    state.waveState = 'active';
    state.shots = [];
    resetPlayer();
    addLog('RETURNED TO FLIGHT DECK');
    renderPanels();
  }

  function pulse() {
    if (state.mode !== 'sortie') return;
    const player = state.player;
    if (player.heat > 78) return;
    player.heat += 20;
    player.pulse = 22;
    for (const enemy of state.enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 190) {
        enemy.hp -= 34;
        enemy.vx += dx / dist * 2.8;
        enemy.vy += dy / dist * 2.8;
        burst(enemy.x, enemy.y, '#75efff', 10);
      }
    }
    addLog('PULSE DISCHARGE');
  }

  function cycleCamera() {
    state.camera = (state.camera + 1) % 4;
    addLog(['PURSUIT VIEW', 'TACTICAL VIEW', 'COCKPIT HUD', 'SATELLITE VIEW'][state.camera]);
    renderPanels();
  }

  function fire() {
    if (state.mode !== 'sortie' || state.waveState !== 'active') return;
    const now = performance.now();
    const player = state.player;
    if (now - state.lastShot < 280 || player.heat > 90) return;
    state.lastShot = now;
    player.heat += 5;
    const speed = 6.5 + CRAFT[state.selected].speed * 0.5;
    state.shots.push({
      x: player.x + Math.cos(player.angle) * 24,
      y: player.y + Math.sin(player.angle) * 24,
      vx: Math.cos(player.angle) * speed,
      vy: Math.sin(player.angle) * speed,
      life: 70,
      team: 'player',
      missile: false
    });
  }

  function fireMissile() {
    if (state.mode !== 'sortie' || state.waveState !== 'active') return;
    const player = state.player;
    if (player.missiles <= 0) { addLog('NO MISSILES REMAINING'); return; }
    const now = performance.now();
    if (now - state.lastMissile < 7000) { addLog('MISSILE COOLDOWN ACTIVE'); return; }
    state.lastMissile = now;
    player.missiles -= 1;
    const targetIdx = state.locked >= 0 && state.locked < state.enemies.length
      ? state.locked
      : state.enemies.findIndex(e => e.hp > 0);
    if (targetIdx < 0) { addLog('NO LOCK — MISSILE SAFED'); return; }
    const ang = player.angle;
    state.shots.push({
      x: player.x + Math.cos(ang) * 26,
      y: player.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * 5.2,
      vy: Math.sin(ang) * 5.2,
      angle: ang,
      life: 160,
      team: 'player',
      missile: true,
      targetIdx
    });
    addLog(`MISSILE AWAY // ${CRAFT[state.selected].missiles[0] || 'AIM'}`);
  }

  function cycleLock() {
    if (state.enemies.length === 0) { state.locked = -1; return; }
    state.locked = (state.locked + 1) % state.enemies.length;
    addLog(`LOCK-ON: ${state.enemies[state.locked].kind.toUpperCase()}`);
  }

  function frame(now) {
    const dt = Math.min(.04, (now - state.time) / 1000 || .016);
    state.time = now;
    update(dt, now);
    draw(now / 1000);
    requestAnimationFrame(frame);
  }

  function update(dt, now) {
    const player = state.player;
    const craft = CRAFT[state.selected];

    if (state.mode === 'sortie') {
      if (state.waveState === 'cleared') {
        state.waveTimer -= dt;
        player.shield = Math.min(CRAFT[state.selected].shield, player.shield + 6 * dt);
        if (state.waveTimer <= 0) {
          state.wave += 1;
          state.threat = Math.min(100, 30 + state.wave * 5);
          state.waveState = 'active';
          state.locked = -1;
          addLog(`WAVE ${String(state.wave).padStart(2, '0')} COMMENCING`);
          spawnEnemy(false);
          if (state.wave > 2) spawnEnemy(false);
        }
        // Still update particles and HUD during cleared phase
        updateParticles();
        updateHud();
        return;
      }

      const turn = (0.9 + craft.turn * 0.28) * dt;
      if (keys.has('arrowleft') || keys.has('a')) player.angle -= turn;
      if (keys.has('arrowright') || keys.has('d')) player.angle += turn;
      if (keys.has('arrowup') || keys.has('w')) player.speed += (55 + craft.speed * 18) * dt;
      if (keys.has('arrowdown') || keys.has('s')) player.speed -= 48 * dt;
      if (keys.has(' ')) fire();
      player.speed = clamp(player.speed, 18, 90 + craft.speed * 22);
      player.x += Math.cos(player.angle) * player.speed * dt;
      player.y += Math.sin(player.angle) * player.speed * dt;
      wrap(player);

      if (now - state.lastSpawn > Math.max(8000, 18000 - state.wave * 400)) {
        state.lastSpawn = now;
        if (state.enemies.length < 3 + state.wave) spawnEnemy(false);
      }
    } else {
      player.angle = -Math.PI / 2 + Math.sin(now / 900) * .035;
      player.speed *= .92;
      player.x += (canvas.clientWidth * .5 - player.x) * .04;
      player.y += (canvas.clientHeight * .64 - player.y) * .04;
    }

    player.heat = Math.max(0, player.heat - 24 * dt);
    player.pulse = Math.max(0, player.pulse - 60 * dt);
    state.shake = Math.max(0, state.shake - dt * 8);

    if (state.mode === 'sortie') {
      state.trail.push({ x: player.x, y: player.y, life: 18 });
      if (state.trail.length > 28) state.trail.shift();
    } else {
      state.trail = [];
    }
    for (const pt of state.trail) pt.life -= 1;
    state.trail = state.trail.filter(pt => pt.life > 0);

    for (const shot of state.shots) {
      shot.x += shot.vx;
      shot.y += shot.vy;
      shot.life -= 1;
    }
    state.shots = state.shots.filter((shot) => shot.life > 0 && shot.x > -80 && shot.x < canvas.clientWidth + 80 && shot.y > -80 && shot.y < canvas.clientHeight + 80);

    updateEnemies(dt);
    updateParticles();
    updateHud();
  }

  function updateEnemies(dt) {
    const player = state.player;
    const now = performance.now();

    for (const enemy of state.enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Kind-based movement
      if (enemy.kind === 'heavy') {
        // Heavy: slow steady approach, doesn't orbit
        enemy.vx += dx / dist * enemy.aggression * dt * 0.7;
        enemy.vy += dy / dist * enemy.aggression * dt * 0.7;
      } else if (enemy.kind === 'drone') {
        // Drone: keeps medium distance, orbits
        const orbit = dist > 200 ? 1 : dist < 120 ? -0.4 : 0.6;
        const perp = Math.atan2(dy, dx) + Math.PI / 2;
        enemy.vx += (dx / dist * orbit + Math.cos(perp) * 0.3) * enemy.aggression * dt;
        enemy.vy += (dy / dist * orbit + Math.sin(perp) * 0.3) * enemy.aggression * dt;
      } else {
        // Fighter: standard intercept
        enemy.vx += dx / dist * enemy.aggression * dt;
        enemy.vy += dy / dist * enemy.aggression * dt;
      }
      enemy.vx *= .978;
      enemy.vy *= .978;
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;
      enemy.angle = Math.atan2(enemy.vy, enemy.vx);
      wrap(enemy);

      // Enemy return fire — slow, inaccurate, long cooldown
      if (now > enemy.nextShot && dist < 340) {
        const spread = (Math.random() - .5) * 0.45;
        const aim = Math.atan2(dy, dx) + spread;
        const spd = enemy.kind === 'heavy' ? 4.5 : 3.8;
        state.shots.push({
          x: enemy.x + Math.cos(aim) * (enemy.radius + 8),
          y: enemy.y + Math.sin(aim) * (enemy.radius + 8),
          vx: Math.cos(aim) * spd,
          vy: Math.sin(aim) * spd,
          life: 90,
          team: 'enemy',
          missile: false
        });
        const cooldown = enemy.kind === 'drone' ? 3200 + Math.random() * 1400
          : enemy.kind === 'heavy' ? 5500 + Math.random() * 2000
          : 4800 + Math.random() * 2400;
        enemy.nextShot = now + cooldown;
        addLog(`HOSTILE FIRE // ${enemy.kind.toUpperCase()}`);
      }

      // Ram collision
      if (dist < enemy.radius + 22) {
        player.shield -= 14 * dt;
        enemy.hp -= 8 * dt;
        state.shake = Math.min(state.shake + 0.3, 3.0);
        burst((enemy.x + player.x) / 2, (enemy.y + player.y) / 2, '#ff667d', 3);
      }
    }

    // Shot collision
    for (const shot of state.shots) {
      if (shot.team === 'player' || shot.missile) {
        // Player shots hit enemies
        if (shot.team === 'player') {
          for (const enemy of state.enemies) {
            if (enemy.hp <= 0) continue;
            const hitR = shot.missile ? enemy.radius + 18 : enemy.radius + 7;
            if (Math.hypot(enemy.x - shot.x, enemy.y - shot.y) < hitR) {
              enemy.hp -= shot.missile ? 120 : 35;
              shot.life = 0;
              state.shake = Math.min(state.shake + (shot.missile ? 0.8 : 0.14), 3.0);
              const cnt = shot.missile ? 22 : 10;
              burst(enemy.x, enemy.y, '#00d8ff', cnt);
              burst(enemy.x, enemy.y, '#ffffff', shot.missile ? 8 : 3);
              if (shot.missile) addLog('MISSILE IMPACT — TARGET HIT');
            }
          }
        }
      } else {
        // Enemy shots hit player
        if (Math.hypot(player.x - shot.x, player.y - shot.y) < 26) {
          player.shield -= 12;
          shot.life = 0;
          state.shake = Math.min(state.shake + 0.6, 3.0);
          burst(player.x, player.y, '#ff667d', 6);
          addLog('SHIELD HIT');
        }
      }
    }

    // Missile tracking update
    for (const shot of state.shots) {
      if (!shot.missile || shot.life <= 0) continue;
      const target = state.enemies[shot.targetIdx];
      if (target && target.hp > 0) {
        const desired = Math.atan2(target.y - shot.y, target.x - shot.x);
        let diff = desired - shot.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        shot.angle += clamp(diff, -0.028, 0.028);
        shot.vx = Math.cos(shot.angle) * 5.2;
        shot.vy = Math.sin(shot.angle) * 5.2;
      }
    }

    const before = state.enemies.length;
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
    const kills = before - state.enemies.length;
    if (kills) {
      state.score += kills * (180 + state.wave * 25);
      state.threat = Math.max(0, state.threat - kills * 8);
      addLog(`${kills > 1 ? kills + 'x ' : ''}TARGET NEUTRALISED`);
      // Clamp locked index
      if (state.locked >= state.enemies.length) state.locked = state.enemies.length - 1;
    }

    if (state.mode === 'sortie' && state.waveState === 'active' && state.enemies.length === 0 && state.threat <= 8) {
      state.waveState = 'cleared';
      state.waveTimer = 4.0;
      state.shots = state.shots.filter(s => s.team === 'player');
      addLog(`WAVE ${String(state.wave).padStart(2, '0')} SECURE — STANDBY`);
    }

    if (player.shield <= 0) {
      state.score = Math.max(0, state.score - 300);
      state.mode = 'hangar';
      addLog('AIRFRAME CRITICAL — RETURNING TO DECK');
      resetPlayer();
      state.enemies = [];
      state.shots = [];
      state.threat = 18;
      state.shake = 0;
      state.trail = [];
      state.waveState = 'active';
      renderPanels();
    }
  }

  function spawnEnemy(close) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const edge = Math.floor(Math.random() * 4);
    const enemy = {
      x: edge === 0 ? -30 : edge === 1 ? w + 30 : Math.random() * w,
      y: edge === 2 ? -30 : edge === 3 ? h + 30 : Math.random() * h,
      vx: (Math.random() - .5) * (close ? 0.8 : 1.6),
      vy: (Math.random() - .5) * (close ? 0.8 : 1.6),
      hp: 70 + state.wave * 9,
      angle: 0,
      kind: ['fighter','drone','heavy'][Math.floor(Math.random() * (state.wave < 3 ? 2 : 3))],
      nextShot: performance.now() + 3000 + Math.random() * 4000
    };
    if (enemy.kind === 'heavy') {
      enemy.hp = 180 + state.wave * 18;
      enemy.radius = 32 + Math.random() * 8;
      enemy.aggression = 6 + state.wave * 0.8;
    } else if (enemy.kind === 'drone') {
      enemy.hp = 50 + state.wave * 6;
      enemy.radius = 14 + Math.random() * 5;
      enemy.aggression = 12 + state.wave * 1.2;
    } else {
      enemy.hp = 70 + state.wave * 9;
      enemy.radius = 18 + Math.random() * 8;
      enemy.aggression = 10 + state.wave * 1.4;
    }
    state.enemies.push(enemy);
  }

  function burst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 22 + Math.random() * 20, color });
    }
  }

  function updateParticles() {
    for (const particle of state.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 1;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function draw(time) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const sx = state.shake > 0 ? (Math.random() - .5) * state.shake * 3 : 0;
    const sy = state.shake > 0 ? (Math.random() - .5) * state.shake * 3 : 0;
    ctx.save();
    ctx.translate(sx, sy);

    drawSky(w, h, time);
    if (state.mode === 'hangar') drawHangar(w, h, time); else drawSortie(w, h, time);
    drawTrail();
    drawCraft(state.player, CRAFT[state.selected], 1, true);
    if (state.player.pulse > 0) {
      const pulseFrac = state.player.pulse / 22;
      ctx.strokeStyle = `rgba(117,239,255,${pulseFrac * 0.9})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#75efff';
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, 190 - state.player.pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      const ring2 = 190 - state.player.pulse * 3 + 14;
      ctx.strokeStyle = `rgba(117,239,255,${pulseFrac * 0.35})`;
      ctx.beginPath(); ctx.arc(state.player.x, state.player.y, ring2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawSky(w, h, time) {
    const craft = CRAFT[state.selected];
    const backdrop = state.mode === 'sortie' ? backdrops[state.selected % backdrops.length] : backdrops[(state.selected + 2) % backdrops.length];
    if (backdrop && backdrop.complete && backdrop.naturalWidth) {
      drawCoverImage(backdrop, w, h);
      ctx.fillStyle = state.mode === 'sortie' ? 'rgba(2,6,11,.22)' : 'rgba(2,6,11,.54)';
      ctx.fillRect(0, 0, w, h);
      sourceBadge.textContent = `${craft.model} source scene // ${state.camera === 0 ? 'pursuit' : state.camera === 1 ? 'tactical' : state.camera === 2 ? 'cockpit' : 'satellite'} camera`;
    } else {
      // Deep space gradient background
      const gradient = ctx.createRadialGradient(w * .5, h * .3, 0, w * .5, h * .5, Math.max(w, h) * .85);
      gradient.addColorStop(0, '#061428');
      gradient.addColorStop(.45, '#030810');
      gradient.addColorStop(1, '#010204');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Nebula layer 1
    const neb1 = ctx.createRadialGradient(w * .72, h * .28, 0, w * .72, h * .28, w * .38);
    neb1.addColorStop(0, 'rgba(30,14,80,.22)');
    neb1.addColorStop(.6, 'rgba(8,2,28,.1)');
    neb1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb1; ctx.fillRect(0, 0, w, h);
    // Nebula layer 2
    const neb2 = ctx.createRadialGradient(w * .22, h * .64, 0, w * .22, h * .64, w * .32);
    neb2.addColorStop(0, 'rgba(0,40,72,.18)');
    neb2.addColorStop(.7, 'rgba(0,8,20,.08)');
    neb2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb2; ctx.fillRect(0, 0, w, h);

    // Star field
    for (const star of STARS) {
      const sx = ((star.x + time * star.drift) % 1) * w;
      const sy = star.y * h;
      const twinkle = .5 + .5 * Math.sin(time * 2.8 + star.bright * 12);
      const alpha = .3 + twinkle * .68;
      ctx.globalAlpha = alpha;
      if (star.r > 1.4) {
        // Bright star with cross flare
        ctx.fillStyle = '#dff8ff';
        ctx.beginPath(); ctx.arc(sx, sy, star.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha * .35;
        ctx.strokeStyle = '#75efff';
        ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(sx - star.r * 3, sy); ctx.lineTo(sx + star.r * 3, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - star.r * 3); ctx.lineTo(sx, sy + star.r * 3); ctx.stroke();
      } else {
        ctx.fillStyle = star.bright > .6 ? '#a8d8f0' : '#dff8ff';
        ctx.fillRect(sx, sy, star.r, star.r);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawCoverImage(image, w, h) {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const iw = image.naturalWidth * scale;
    const ih = image.naturalHeight * scale;
    ctx.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }

  function drawHangar(w, h, time) {
    ctx.save();
    ctx.translate(w / 2, h * .72);
    ctx.strokeStyle = 'rgba(0,216,255,.32)';
    ctx.lineWidth = 1;
    for (let line = -18; line <= 18; line += 1) {
      const offset = line * 42;
      ctx.beginPath();
      ctx.moveTo(offset, 20);
      ctx.lineTo(offset * 5, -h * .62);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-w, -line * 28);
      ctx.lineTo(w, -line * 28);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(0,216,255,.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * .18, h * .20, w * .64, h * .48);
    ctx.fillStyle = 'rgba(0,216,255,.08)';
    ctx.fillRect(w * .18, h * .20, w * .64, h * .48);
    ctx.fillStyle = 'rgba(255,209,102,.75)';
    ctx.fillRect(w * .22 + Math.sin(time * 3) * 14, h * .69, w * .18, 3);
    drawCarrierDeck(w, h, time);
  }

  function drawCarrierDeck(w, h, time) {
    ctx.save();
    ctx.translate(w * .5, h * .66);
    ctx.rotate(-.02 + Math.sin(time) * .004);
    ctx.fillStyle = 'rgba(7,17,30,.82)';
    ctx.strokeStyle = 'rgba(220,247,255,.5)';
    ctx.lineWidth = 2;
    path([[-250, -44], [185, -66], [292, -16], [238, 56], [-260, 48]], true);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.moveTo(-205, 0); ctx.lineTo(210, -8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,209,102,.55)';
    for (let i = -4; i <= 4; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * 42, -34); ctx.lineTo(i * 42 + 34, 40); ctx.stroke();
    }
    ctx.restore();
  }

  function drawSortie(w, h, time) {
    // Scrolling parallax grid
    const gx = (time * 60) % 64;
    ctx.strokeStyle = 'rgba(0,216,255,.09)';
    ctx.lineWidth = .8;
    for (let x = gx - 64; x < w + 64; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - w * .15, h); ctx.stroke();
    }
    for (let y = (time * 22) % 48; y < h + 48; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // Horizon glow
    const hg = ctx.createLinearGradient(0, h * .62, 0, h * .72);
    hg.addColorStop(0, 'rgba(0,180,255,.0)');
    hg.addColorStop(.5, 'rgba(0,216,255,.07)');
    hg.addColorStop(1, 'rgba(0,0,0,.0)');
    ctx.fillStyle = hg; ctx.fillRect(0, h * .55, w, h * .22);

    for (let i = 0; i < state.enemies.length; i++) {
      drawEnemy(state.enemies[i]);
      drawEnemyReticle(state.enemies[i], time, i);
    }
    for (const shot of state.shots) drawShot(shot);
    for (const particle of state.particles) drawParticle(particle);
    drawHarfangHud(w, h, time);
  }

  function drawTrail() {
    if (state.trail.length < 2) return;
    for (let i = 1; i < state.trail.length; i++) {
      const a = state.trail[i - 1];
      const b = state.trail[i];
      const alpha = (i / state.trail.length) * 0.55;
      ctx.strokeStyle = `rgba(117,239,255,${alpha})`;
      ctx.lineWidth = 1.8 * (i / state.trail.length);
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00d8ff';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function drawEnemyReticle(enemy, time, idx) {
    const isLocked = idx === state.locked;
    const r = enemy.radius + (isLocked ? 14 : 10);
    const pulse = .5 + .5 * Math.sin(time * (isLocked ? 6 : 3.5));
    const baseColor = isLocked ? `rgba(255,209,102,${.7 + pulse * .3})` : `rgba(255,102,125,${.4 + pulse * .25})`;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = isLocked ? 1.8 : 1.1;
    ctx.shadowBlur = isLocked ? 14 : 6;
    ctx.shadowColor = isLocked ? '#ffd166' : '#ff667d';

    if (isLocked) {
      // Diamond lock indicator
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y - r);
      ctx.lineTo(enemy.x + r * .7, enemy.y);
      ctx.lineTo(enemy.x, enemy.y + r);
      ctx.lineTo(enemy.x - r * .7, enemy.y);
      ctx.closePath(); ctx.stroke();
      // Rotating ring
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, r + 6, time * 1.5, time * 1.5 + Math.PI * 1.4);
      ctx.stroke();
    } else {
      // Corner brackets
      const blen = 8;
      for (const [cx, cy, ax, ay] of [[-r,-r,1,0],[-r,-r,0,1],[r,-r,-1,0],[r,-r,0,1],[r,r,-1,0],[r,r,0,-1],[-r,r,1,0],[-r,r,0,-1]]) {
        ctx.beginPath();
        ctx.moveTo(enemy.x + cx, enemy.y + cy);
        ctx.lineTo(enemy.x + cx + ax * blen, enemy.y + cy + ay * blen);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // Health bar above enemy
    const maxHp = enemy.kind === 'heavy' ? 180 + state.wave * 18 : enemy.kind === 'drone' ? 50 + state.wave * 6 : 70 + state.wave * 9;
    const pct = clamp(enemy.hp / maxHp, 0, 1);
    const bw = enemy.radius * 2.6;
    const bx = enemy.x - bw / 2;
    const by = enemy.y - enemy.radius - 16;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(bx, by, bw, 5);
    const col = pct > .6 ? '#6cffba' : pct > .3 ? '#ffd166' : '#ff667d';
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, bw * pct, 5);
    // Kind label
    ctx.fillStyle = 'rgba(220,240,255,.65)';
    ctx.font = '9px \'Share Tech Mono\', monospace';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.kind.toUpperCase(), enemy.x, by - 3);
    ctx.textAlign = 'left';
    ctx.font = '700 11px \'Share Tech Mono\', monospace';
  }

  function drawHarfangHud(w, h, time) {
    const player = state.player;
    const craft = CRAFT[state.selected];
    ctx.font = '700 11px \'Share Tech Mono\', monospace';

    // Wave cleared banner
    if (state.waveState === 'cleared') {
      const bAlpha = .72 + .18 * Math.sin(time * 3);
      ctx.fillStyle = `rgba(108,255,186,${bAlpha})`;
      ctx.font = '700 22px \'Share Tech Mono\', monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SECTOR SECURE — WAVE CLEARED', w / 2, h / 2 - 12);
      ctx.font = '700 12px \'Share Tech Mono\', monospace';
      ctx.fillStyle = 'rgba(200,240,255,.7)';
      ctx.fillText(`NEXT WAVE IN ${Math.ceil(Math.max(0, state.waveTimer))}s`, w / 2, h / 2 + 14);
      ctx.textAlign = 'left';
      ctx.font = '700 11px \'Share Tech Mono\', monospace';
    }

    // Top-left status block
    ctx.fillStyle = 'rgba(4,10,18,.72)';
    ctx.fillRect(14, 14, 210, 68);
    ctx.strokeStyle = 'rgba(0,216,255,.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, 210, 68);
    ctx.fillStyle = 'rgba(235,250,255,.88)';
    ctx.fillText(`HEALTH  ${Math.max(0, Math.round(player.shield))} / ${craft.shield}`, 22, 32);
    ctx.fillText(`HEAT    ${Math.round(player.heat)}%`, 22, 47);
    ctx.fillText(`HDG ${String(Math.round((player.angle * 180 / Math.PI + 360 + 90) % 360)).padStart(3,'0')}°  SPD ${Math.round(player.speed * 3.6)} km/h`, 22, 62);
    ctx.fillText(`ALT ${Math.round(2400 + Math.sin(state.time / 1400) * 320)} m`, 22, 77);

    // Missile readout (top right)
    const mLabel = `MSSL ${player.missiles} / ${craft.missiles.filter(m => !['escort beacon','orbital telemetry'].includes(m)).length}`;
    const lockLabel = state.locked >= 0 && state.locked < state.enemies.length
      ? `LOCK: ${state.enemies[state.locked].kind.toUpperCase()}` : 'NO LOCK';
    ctx.fillStyle = 'rgba(4,10,18,.72)';
    ctx.fillRect(w - 200, 14, 186, 50);
    ctx.strokeStyle = state.locked >= 0 ? 'rgba(255,209,102,.6)' : 'rgba(0,216,255,.35)';
    ctx.strokeRect(w - 200, 14, 186, 50);
    ctx.fillStyle = state.locked >= 0 ? '#ffd166' : 'rgba(235,250,255,.7)';
    ctx.textAlign = 'right';
    ctx.fillText(mLabel, w - 18, 32);
    ctx.fillText(lockLabel, w - 18, 49);
    ctx.fillText('[M] FIRE  [TAB] CYCLE', w - 18, 57);
    ctx.textAlign = 'left';

    // Mini radar (bottom-left)
    const rx = 76, ry = h - 82, rr = 56;
    ctx.fillStyle = 'rgba(2,6,12,.8)';
    ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,216,255,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,216,255,.18)';
    ctx.beginPath(); ctx.arc(rx, ry, rr * .5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx - rr, ry); ctx.lineTo(rx + rr, ry); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, ry - rr); ctx.lineTo(rx, ry + rr); ctx.stroke();
    // Player dot
    ctx.fillStyle = '#75efff';
    ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill();
    // Enemy dots
    const radarScale = rr / Math.max(w, h) * 1.6;
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      const ex = clamp(rx + (e.x - player.x) * radarScale, rx - rr + 3, rx + rr - 3);
      const ey = clamp(ry + (e.y - player.y) * radarScale, ry - rr + 3, ry + rr - 3);
      ctx.fillStyle = i === state.locked ? '#ffd166' : '#ff667d';
      ctx.beginPath(); ctx.arc(ex, ey, e.kind === 'heavy' ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Controls hint (bottom-right)
    ctx.fillStyle = 'rgba(100,160,190,.55)';
    ctx.font = '10px \'Share Tech Mono\', monospace';
    ctx.textAlign = 'right';
    ctx.fillText('WASD/ARROWS: steer  SPACE: cannon  M: missile  TAB: lock  PULSE btn: EMP', w - 12, h - 10);
    ctx.textAlign = 'left';
    ctx.font = '700 11px \'Share Tech Mono\', monospace';
  }

  function drawCraft(entity, craft, scale, friendly) {
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(entity.angle);
    ctx.scale(scale, scale);
    ctx.strokeStyle = friendly ? '#75efff' : '#ff667d';
    ctx.fillStyle = friendly ? 'rgba(0,216,255,.18)' : 'rgba(255,102,125,.2)';
    ctx.lineWidth = 2;

    if (craft.hull === 'triangle') {
      path([[28, 0], [-18, -22], [-8, 0], [-18, 22]], true);
      ctx.fillStyle = 'rgba(117,239,255,.35)';
      circle(0, 0, 7);
      circle(-12, -14, 4);
      circle(-12, 14, 4);
    } else if (craft.hull === 'capsule') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 11, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      circle(18, 0, 4);
    } else if (craft.hull === 'orbital') {
      path([[24, 0], [-10, -14], [-24, 0], [-10, 14]], true);
      ctx.strokeRect(-13, -19, 18, 38);
    } else if (craft.hull === 'dart') {
      path([[34, 0], [-26, -9], [-8, 0], [-26, 9]], true);
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-24, 22); ctx.lineTo(-10, 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-24, -22); ctx.lineTo(-10, -5); ctx.stroke();
    } else {
      path([[30, 0], [-20, -17], [-7, 0], [-20, 17]], true);
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-31, 25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-31, -25); ctx.stroke();
    }

    if (friendly && state.mode === 'sortie') {
      ctx.strokeStyle = 'rgba(255,209,102,.45)';
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(-48 - state.player.speed * .08, Math.sin(performance.now() / 40) * 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    const glow = enemy.kind === 'heavy' ? '#ff4455' : enemy.kind === 'drone' ? '#ffaa22' : '#ff667d';
    ctx.strokeStyle = glow;
    ctx.fillStyle = enemy.kind === 'heavy' ? 'rgba(255,60,70,.22)' : enemy.kind === 'drone' ? 'rgba(255,160,34,.16)' : 'rgba(255,102,125,.14)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = glow;
    ctx.lineWidth = enemy.kind === 'heavy' ? 2.5 : 1.8;
    const r = enemy.radius;
    if (enemy.kind === 'heavy') {
      // Hexagonal heavy
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,60,70,.45)';
      ctx.beginPath(); ctx.arc(0, 0, r * .5, 0, Math.PI * 2); ctx.stroke();
    } else if (enemy.kind === 'drone') {
      // Diamond drone
      path([[r, 0], [0, -r * .55], [-r * .7, 0], [0, r * .55]], true);
      ctx.strokeStyle = 'rgba(255,170,34,.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, Math.PI * 2); ctx.stroke();
    } else {
      // Fighter
      path([[r * .9, 0], [-r * .65, -r * .7], [-r * .3, 0], [-r * .65, r * .7]], true);
      ctx.beginPath(); ctx.moveTo(-r * .3, 0); ctx.lineTo(-r * .9, r * .9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * .3, 0); ctx.lineTo(-r * .9, -r * .9); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawShot(shot) {
    if (shot.missile) {
      // Missile: bright dot with trail
      ctx.fillStyle = '#ffd166';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffd166';
      ctx.beginPath(); ctx.arc(shot.x, shot.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,209,102,.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x - shot.vx * 4, shot.y - shot.vy * 4);
      ctx.stroke();
    } else if (shot.team === 'enemy') {
      // Enemy shot: orange-red
      ctx.strokeStyle = 'rgba(255,140,60,.85)';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff8c3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x - shot.vx * 2.2, shot.y - shot.vy * 2.2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      // Player cannon round: cyan
      ctx.strokeStyle = '#75efff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00d8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x - shot.vx * 2.2, shot.y - shot.vy * 2.2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function drawParticle(particle) {
    ctx.globalAlpha = clamp(particle.life / 32, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 2, 2);
    ctx.globalAlpha = 1;
  }

  function path(points, fill) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
  }

  function circle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  function wrap(entity) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (entity.x < -40) entity.x = w + 40;
    if (entity.x > w + 40) entity.x = -40;
    if (entity.y < -40) entity.y = h + 40;
    if (entity.y > h + 40) entity.y = -40;
  }

  function renderPanels() {
    const craft = CRAFT[state.selected];
    document.querySelectorAll('.craft').forEach((button, index) => button.classList.toggle('active', index === state.selected));
    craftName.textContent = craft.name;
    craftStatus.textContent = `${craft.generation} / ${craft.mission}`;
    missionTitle.textContent = craft.mission;
    dossier.innerHTML = `
      <section class="card"><img class="shot" src="${craft.screenshot}" alt="Harfang dogfight source screenshot"></section>
      <section class="card"><h3>Airframe</h3><div class="kv"><b>Designator</b><span>${escapeHtml(craft.designator)}</span><b>Class</b><span>${escapeHtml(craft.generation)}</span><b>Dogfight</b><span>${escapeHtml(craft.model)}</span><b>UID</b><span>${escapeHtml(craft.uid)}</span></div></section>
      <section class="card"><h3>Harfang Source Class</h3><div class="kv"><b>Class File</b><span>${escapeHtml(craft.classPath)}</span><b>Scene</b><span>${escapeHtml(craft.scenePath)}</span><b>Thrust</b><span>${craft.thrust}</span><b>Ceiling</b><span>${craft.speedCeiling} km/h</span><b>Max Alt</b><span>${craft.maxAltitude} m</span><b>Loadout</b><span>${escapeHtml(craft.missiles.join(', '))}</span><b>Parts</b><span>${escapeHtml(craft.mobileParts.join(', '))}</span></div></section>
      <section class="card"><h3>Source Model</h3><p><a class="source-link" href="${craft.source}" target="_blank" rel="nofollow noopener noreferrer">Open verified Sketchfab source</a></p></section>
      <section class="card"><h3>Local Harfang Path</h3><p><a class="source-link" href="dogfight/README.md">dogfight/cyberworld_theme.py</a> launches the themed Python integration when Harfang dependencies are installed.</p></section>
      <section class="card"><h3>Source Controls</h3><div class="cmd-grid">${COMMANDS.map((command) => `<span>${escapeHtml(command)}</span>`).join('')}</div></section>
      <section class="card"><h3>Flight Log</h3><div class="mission-log">${state.log.map((entry) => `<div>${escapeHtml(entry)}</div>`).join('')}</div></section>`;
    updateHud();
  }

  function updateHud() {
    const player = state.player;
    const craft = CRAFT[state.selected];
    const shieldPct = clamp(player.shield / craft.shield * 100, 0, 100);
    shieldBar.style.width = `${shieldPct}%`;
    heatBar.style.width = `${clamp(player.heat, 0, 100)}%`;
    threatBar.style.width = `${clamp(state.threat, 0, 100)}%`;
    shieldLabel.textContent = String(Math.round(shieldPct));
    heatLabel.textContent = String(Math.round(player.heat));
    threatLabel.textContent = String(Math.round(state.threat));
    taskMode.textContent = state.mode.toUpperCase();
    taskScore.textContent = `SCORE ${String(state.score).padStart(6, '0')}`;
    taskWave.textContent = `WAVE ${String(state.wave).padStart(2, '0')}`;
  }

  function addLog(message) {
    state.log.unshift(`${new Date().toLocaleTimeString()} // ${message}`);
    state.log = state.log.slice(0, 12);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  init();
})();