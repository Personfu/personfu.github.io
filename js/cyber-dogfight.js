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
    lastSpawn: 0,
    time: 0
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
      if (event.key === ' ') {
        event.preventDefault();
        fire();
      }
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
      pulse: 0
    };
  }

  function launch() {
    state.mode = 'sortie';
    state.enemies = [];
    state.shots = [];
    state.particles = [];
    state.threat = Math.min(100, 28 + state.wave * 6);
    resetPlayer();
    addLog(`SORTIE ${String(state.wave).padStart(2, '0')} ACTIVE`);
    spawnEnemy(true);
    spawnEnemy(true);
    renderPanels();
  }

  function dock() {
    state.mode = 'hangar';
    state.threat = Math.max(0, state.threat - 16);
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
    if (state.mode !== 'sortie') return;
    const now = performance.now();
    const player = state.player;
    if (now - state.lastShot < 120 || player.heat > 94) return;
    state.lastShot = now;
    player.heat += 4.5;
    const speed = 8.5 + CRAFT[state.selected].speed;
    state.shots.push({
      x: player.x + Math.cos(player.angle) * 24,
      y: player.y + Math.sin(player.angle) * 24,
      vx: Math.cos(player.angle) * speed,
      vy: Math.sin(player.angle) * speed,
      life: 54,
      team: 'player'
    });
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
      const turn = (2.2 + craft.turn) * dt;
      if (keys.has('arrowleft') || keys.has('a')) player.angle -= turn;
      if (keys.has('arrowright') || keys.has('d')) player.angle += turn;
      if (keys.has('arrowup') || keys.has('w')) player.speed += (140 + craft.speed * 70) * dt;
      if (keys.has('arrowdown') || keys.has('s')) player.speed -= 130 * dt;
      if (keys.has(' ')) fire();
      player.speed = clamp(player.speed, 30, 220 + craft.speed * 60);
      player.x += Math.cos(player.angle) * player.speed * dt;
      player.y += Math.sin(player.angle) * player.speed * dt;
      wrap(player);

      if (now - state.lastSpawn > Math.max(620, 1600 - state.wave * 55)) {
        state.lastSpawn = now;
        spawnEnemy(false);
      }
    } else {
      player.angle = -Math.PI / 2 + Math.sin(now / 900) * .035;
      player.speed *= .92;
      player.x += (canvas.clientWidth * .5 - player.x) * .04;
      player.y += (canvas.clientHeight * .64 - player.y) * .04;
    }

    player.heat = Math.max(0, player.heat - 24 * dt);
    player.pulse = Math.max(0, player.pulse - 60 * dt);

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
    for (const enemy of state.enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.vx += dx / dist * enemy.aggression * dt;
      enemy.vy += dy / dist * enemy.aggression * dt;
      enemy.vx *= .992;
      enemy.vy *= .992;
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;
      enemy.angle = Math.atan2(enemy.vy, enemy.vx);
      wrap(enemy);

      if (dist < enemy.radius + 22) {
        player.shield -= 18 * dt;
        enemy.hp -= 10 * dt;
        burst((enemy.x + player.x) / 2, (enemy.y + player.y) / 2, '#ff667d', 2);
      }
    }

    for (const shot of state.shots) {
      if (shot.team !== 'player') continue;
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const hit = Math.hypot(enemy.x - shot.x, enemy.y - shot.y) < enemy.radius + 8;
        if (!hit) continue;
        enemy.hp -= 42;
        shot.life = 0;
        burst(enemy.x, enemy.y, '#00d8ff', 8);
      }
    }

    const before = state.enemies.length;
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
    const kills = before - state.enemies.length;
    if (kills) {
      state.score += kills * (140 + state.wave * 20);
      state.threat = Math.max(0, state.threat - kills * 5);
      addLog(`TARGETS CLEARED +${kills}`);
    }

    if (state.mode === 'sortie' && state.enemies.length === 0 && state.threat <= 8) {
      state.wave += 1;
      state.threat = Math.min(100, 30 + state.wave * 6);
      addLog(`WAVE ${String(state.wave).padStart(2, '0')} QUEUED`);
      spawnEnemy(true);
      spawnEnemy(true);
    }

    if (player.shield <= 0) {
      state.score = Math.max(0, state.score - 300);
      state.mode = 'hangar';
      addLog('AIRFRAME RECOVERED');
      resetPlayer();
      state.enemies = [];
      state.threat = 18;
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
      vx: (Math.random() - .5) * (close ? 2 : 5),
      vy: (Math.random() - .5) * (close ? 2 : 5),
      hp: 70 + state.wave * 9,
      radius: 18 + Math.random() * 10,
      angle: 0,
      aggression: 34 + state.wave * 3
    };
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
    drawSky(w, h, time);
    if (state.mode === 'hangar') drawHangar(w, h, time); else drawSortie(w, h, time);
    drawCraft(state.player, CRAFT[state.selected], 1, true);
    if (state.player.pulse > 0) {
      ctx.strokeStyle = `rgba(117,239,255,${state.player.pulse / 22})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, 190 - state.player.pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawSky(w, h, time) {
    const craft = CRAFT[state.selected];
    const backdrop = state.mode === 'sortie' ? backdrops[state.selected % backdrops.length] : backdrops[(state.selected + 2) % backdrops.length];
    if (backdrop && backdrop.complete && backdrop.naturalWidth) {
      drawCoverImage(backdrop, w, h);
      ctx.fillStyle = state.mode === 'sortie' ? 'rgba(2,6,11,.18)' : 'rgba(2,6,11,.48)';
      ctx.fillRect(0, 0, w, h);
      sourceBadge.textContent = `${craft.model} source scene // ${state.camera === 0 ? 'pursuit' : state.camera === 1 ? 'tactical' : state.camera === 2 ? 'cockpit' : 'satellite'} camera`;
      return;
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#020409');
    gradient.addColorStop(.55, '#05101c');
    gradient.addColorStop(1, '#010306');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(117,239,255,.34)';
    for (let index = 0; index < 72; index += 1) {
      const x = (index * 97 + time * 18) % w;
      const y = (index * 53 + Math.sin(time + index) * 8) % h;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
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
    ctx.strokeStyle = 'rgba(0,216,255,.18)';
    ctx.lineWidth = 1;
    for (let x = ((time * 80) % 56) - 56; x < w + 56; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - w * .3, h);
      ctx.stroke();
    }
    for (const enemy of state.enemies) drawEnemy(enemy);
    for (const shot of state.shots) drawShot(shot);
    for (const particle of state.particles) drawParticle(particle);
    drawHarfangHud(w, h);
  }

  function drawHarfangHud(w, h) {
    const player = state.player;
    ctx.fillStyle = 'rgba(235,250,255,.86)';
    ctx.font = '700 11px Share Tech Mono, monospace';
    ctx.fillText(`HEALTH: ${Math.max(0, Math.round(player.shield))}`, 26, 28);
    ctx.fillText(`BULLETS: ${Math.max(0, 1000 - Math.round(player.heat * 6))}`, 26, 43);
    ctx.fillText(`CAP: ${Math.round((player.angle * 180 / Math.PI + 360) % 360)}`, w * .49, 28);
    ctx.fillText(`ALTITUDE (M): ${Math.round(1600 + Math.sin(state.time / 1200) * 260)}`, w - 215, 44);
    ctx.fillText(`LINEAR SPEED (KM/H): ${Math.round(player.speed * 4.2)}`, w - 215, h - 58);
    ctx.strokeStyle = 'rgba(117,239,255,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(86, h - 92, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, h - 92); ctx.lineTo(144, h - 92); ctx.moveTo(86, h - 150); ctx.lineTo(86, h - 34); ctx.stroke();
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
    ctx.strokeStyle = '#ff667d';
    ctx.fillStyle = 'rgba(255,102,125,.18)';
    ctx.lineWidth = 2;
    path([[22, 0], [-14, -14], [-8, 0], [-14, 14]], true);
    ctx.restore();
  }

  function drawShot(shot) {
    ctx.strokeStyle = '#75efff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shot.x, shot.y);
    ctx.lineTo(shot.x - shot.vx * 1.8, shot.y - shot.vy * 1.8);
    ctx.stroke();
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