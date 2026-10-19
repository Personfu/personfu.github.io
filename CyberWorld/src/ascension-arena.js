// Original CyberWorld Breach Foundry. Combat is fictional, local game state.
// The host owns the renderer and the licensed character rigs; this view owns
// only its stage, four reusable combatant slots and bounded visual effects.
export function createArena({ THREE, parent, makeAgent, textSprite, gait, animateCombat, releaseGroup, getPlayerAgent }) {
  const stage = new THREE.Group(); stage.name = 'Breach Foundry';
  stage.userData.arena = true; stage.userData.dynamic = true; parent.add(stage);
  const geometryBank = new Set(), materialBank = new Set(), labels = new Set();
  const enemies = new Map(), effects = [], seenEvents = new Set(), seenOrder = [];
  const colors = { cyan: 0x58ffe2, amber: 0xffce76, red: 0xff5875, blue: 0x64baff, violet: 0xbda1ff };
  const limit = 4, effectLimit = 20;
  let disposed = false, lastTime = -1, visualTime = 0;
  function geometry(value) { geometryBank.add(value); return value; }
  function surface(color, extra = {}) {
    const value = new THREE.MeshStandardMaterial({ color, metalness: .72, roughness: .42, ...extra });
    materialBank.add(value); return value;
  }
  function lightSurface(color, opacity = 1) {
    const value = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity,
      depthWrite: opacity >= 1, toneMapped: false, side: THREE.DoubleSide });
    materialBank.add(value); return value;
  }
  const unitBox = geometry(new THREE.BoxGeometry(1, 1, 1));
  const unitCylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 32));
  const healthPlane = geometry(new THREE.PlaneGeometry(1, 1));
  const sparkGeometry = geometry(new THREE.OctahedronGeometry(1, 0));
  const dark = surface(0x121e29), steel = surface(0x344756), edge = surface(0x65818b), black = surface(0x050d16);
  const cyan = surface(0x184a4d, { emissive: colors.cyan, emissiveIntensity: .7 });
  const amber = surface(0x715036, { emissive: colors.amber, emissiveIntensity: .55 });
  const glow = lightSurface(colors.cyan), muted = lightSurface(0x2d5260), warning = lightSurface(colors.amber);
  function mesh(shape, material, host = stage, position = [0, 0, 0], scale = [1, 1, 1]) {
    const result = new THREE.Mesh(shape, material); result.position.set(...position); result.scale.set(...scale);
    result.castShadow = !material.isMeshBasicMaterial; result.receiveShadow = true; host.add(result); return result;
  }
  function box(host, x, y, z, w, h, d, material) { return mesh(unitBox, material, host, [x, y, z], [w, h, d]); }
  function cylinder(host, x, y, z, radius, height, material) { return mesh(unitCylinder, material, host, [x, y, z], [radius, height, radius]); }
  function ring(host, radius, thickness, material, y = .03, arc = Math.PI * 2) {
    const value = mesh(geometry(new THREE.TorusGeometry(radius, thickness, 6, 72, arc)), material, host, [0, y, 0]);
    value.rotation.x = Math.PI / 2; return value;
  }
  function label(text, color, size, host, x, y, z, background = true) {
    const value = textSprite(text, color, size, background); labels.add(value); value.position.set(x, y, z); host.add(value); return value;
  }
  function releaseLabel(value) {
    if (!value || !labels.delete(value)) return;
    value.removeFromParent();
    if (releaseGroup) releaseGroup(value);
    else { value.material?.map?.dispose(); value.material?.dispose(); }
  }

  // A square service deck supports the host's complete movement bounds. The
  // circular fighting floor and perimeter mechanisms are visual, never hidden
  // blockers in the middle of a dodge route.
  box(stage, 0, -.23, 0, 22, .42, 22, black);
  cylinder(stage, 0, -.11, 0, 10.65, .2, dark);
  const deck = new THREE.Group(); stage.add(deck);
  const plateCount = 12, plateGeometry = geometry(new THREE.CylinderGeometry(10.3, 10.3, .035, 64, 1, false, 0, Math.PI / 6 - .025));
  const plates = new THREE.InstancedMesh(plateGeometry, surface(0x22333e), plateCount);
  const transform = new THREE.Object3D();
  for (let i = 0; i < plateCount; i++) {
    transform.position.set(0, -.007, 0); transform.rotation.y = i * Math.PI / 6; transform.updateMatrix(); plates.setMatrixAt(i, transform.matrix);
    plates.setColorAt(i, new THREE.Color(i % 2 ? 0x8da1ad : 0x6e8796));
  }
  plates.receiveShadow = true; deck.add(plates);
  ring(deck, 9.4, .035, muted); ring(deck, 9.52, .018, cyan); ring(deck, 5.7, .014, muted);
  ring(deck, 2.1, .023, muted); ring(deck, 1.75, .012, muted);
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12, radius = 8.8;
    const stripe = box(deck, Math.sin(angle) * radius, .035, Math.cos(angle) * radius, .055, .018, .35, i % 3 ? muted : warning);
    stripe.rotation.y = angle;
  }
  // Inlaid circuit lanes carry light towards the perimeter server banks.
  for (const sign of [-1, 1]) {
    box(deck, sign * 6.9, .035, 0, .045, .025, 12.8, cyan);
    for (let i = 0; i < 5; i++) {
      box(deck, sign * (6.9 - i * .13), .035, -6.4 + i * .13, .36, .025, .045, cyan);
      box(deck, sign * (6.9 - i * .13), .035, 6.4 - i * .13, .36, .025, .045, cyan);
    }
    for (let i = 0; i < 14; i++) box(deck, sign * 10.2, .05, -8.45 + i * 1.3, .62, .07, .13, i % 2 ? amber : steel);
  }
  const boltGeometry = geometry(new THREE.CylinderGeometry(.055, .055, .035, 6));
  const bolts = new THREE.InstancedMesh(boltGeometry, edge, 48);
  for (let i = 0; i < 48; i++) {
    const angle = i * Math.PI / 24; transform.position.set(Math.sin(angle) * 9.85, .045, Math.cos(angle) * 9.85);
    transform.rotation.set(0, angle, 0); transform.updateMatrix(); bolts.setMatrixAt(i, transform.matrix);
  }
  deck.add(bolts);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4 + Math.PI / 8, radius = 10.3;
    const pylon = new THREE.Group(); pylon.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius); pylon.rotation.y = angle; stage.add(pylon);
    box(pylon, 0, .12, 0, .92, .24, .88, steel);
    box(pylon, 0, 1.45, 0, .45, 2.8, .45, dark);
    box(pylon, 0, 1.5, -.255, .22, 2.3, .055, cyan);
    box(pylon, 0, 2.85, 0, .72, .19, .65, edge);
    for (let slat = 0; slat < 4; slat++) box(pylon, 0, .42 + slat * .16, -.29, .5, .055, .045, slat % 2 ? amber : black);
    // Short plates define the edge without a visual wall through the camera.
    const barrier = mesh(geometry(new THREE.CylinderGeometry(10.2, 10.2, 1.5, 18, 1, true, angle - .22, .44)),
      lightSurface(colors.cyan, .055), stage, [0, .95, 0]);
    barrier.userData.arenaBarrier = true;
  }

  const server = new THREE.Group(); server.name = 'Foundry server core'; server.position.set(0, 0, -9.8); stage.add(server);
  box(server, 0, .12, 0, 3.2, .24, 1.3, steel);
  for (const side of [-1, 1]) {
    box(server, side * 1.15, 1.75, 0, .68, 3.25, .85, black);
    for (let rack = 0; rack < 7; rack++) {
      box(server, side * 1.15, .4 + rack * .39, .455, .52, .24, .045, steel);
      box(server, side * 1.15 + .15, .44 + rack * .39, .485, .065, .055, .025, rack % 3 ? cyan : amber);
    }
  }
  cylinder(server, 0, 1.75, 0, .48, 3.2, surface(0x144952, { transparent: true, opacity: .3, depthWrite: false, emissive: 0x1c5961, emissiveIntensity: .4 }));
  const core = mesh(geometry(new THREE.OctahedronGeometry(.46, 0)), cyan, server, [0, 1.8, 0]);
  const coreHalo = ring(server, .7, .025, glow, 1.8); coreHalo.rotation.x = Math.PI * .21;
  label('BREACH FOUNDRY', '#a9dce9', 5.3, server, 0, 4.15, .1);
  label('READ THE TELL / BREAK THE CHAIN', '#ffce76', 4.2, server, 0, 3.6, .15);

  const portal = new THREE.Group(); portal.name = 'Foundry exit portal'; portal.position.set(0, 0, 10.15); stage.add(portal);
  box(portal, 0, .08, 0, 3.7, .16, 1.25, steel);
  for (const side of [-1, 1]) {
    box(portal, side * 1.58, 1.75, 0, .28, 3.5, .5, steel);
    box(portal, side * 1.41, 1.75, -.28, .06, 3.2, .08, cyan);
  }
  box(portal, 0, 3.48, 0, 3.45, .2, .52, steel); box(portal, 0, 3.35, -.28, 2.85, .055, .08, cyan);
  const portalFieldMaterial = lightSurface(colors.cyan, .075);
  const portalField = mesh(healthPlane, portalFieldMaterial, portal, [0, 1.7, 0], [2.72, 3.1, 1]);
  for (let i = 0; i < 8; i++) {
    const step = box(portal, 0, .023, -1.3 - i * .22, .2 + i * .075, .018, .045, muted); step.name = 'Exit approach';
  }
  // Industrial detail is batched before the dynamic combatants exist, so all
  // the rack lights, warning stripes and pylon plates cost a handful of draws.
  stage.updateMatrixWorld(true);
  const batches = new Map(), stageInverse = stage.matrixWorld.clone().invert();
  stage.traverse(node => {
    if (!node.isMesh || node.isInstancedMesh || ![unitBox, unitCylinder].includes(node.geometry)) return;
    const key = node.geometry.uuid + ':' + node.material.uuid;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push({ node, matrix: new THREE.Matrix4().multiplyMatrices(stageInverse, node.matrixWorld) });
  });
  batches.forEach(items => {
    if (items.length < 3) return;
    const sample = items[0].node, batch = new THREE.InstancedMesh(sample.geometry, sample.material, items.length);
    items.forEach((item, index) => { batch.setMatrixAt(index, item.matrix); item.node.removeFromParent(); });
    batch.castShadow = sample.castShadow; batch.receiveShadow = sample.receiveShadow;
    batch.computeBoundingSphere(); stage.add(batch);
  });

  function spriteSurface(color) {
    const value = new THREE.SpriteMaterial({ color, depthWrite: false, depthTest: false, toneMapped: false });
    materialBank.add(value); return value;
  }
  const healthBackground = spriteSurface(0x101c27), healthGreen = spriteSurface(0x5affc1), shieldBlue = spriteSurface(colors.blue);
  function bar(material, host, width, height, y) {
    const value = new THREE.Sprite(material); value.scale.set(width, height, 1); value.position.y = y; host.add(value); return value;
  }
  const targetRingGeometry = geometry(new THREE.RingGeometry(.62, .69, 36));
  const dangerCircleGeometry = geometry(new THREE.CircleGeometry(1, 48));
  const dangerOutlineGeometry = geometry(new THREE.RingGeometry(.95, 1, 48));
  const types = {
    striker: { color: colors.red, name: 'BREACH STRIKER', frame: 'sentinel', scale: 1 },
    brute: { color: colors.amber, name: 'FORGE BRUTE', frame: 'sentinel', scale: 1.17 },
    warden: { color: colors.violet, name: 'CHAIN WARDEN', frame: 'ghost', scale: 1.12 },
    runner: { color: colors.red, name: 'BREACH RUNNER', frame: 'runner', scale: .96 },
    sentinel: { color: colors.blue, name: 'BREACH SENTINEL', frame: 'sentinel', scale: 1 },
  };
  function enemyView(enemy) {
    const style = types[enemy.type] || types.striker;
    const host = new THREE.Group(); host.name = 'Foundry enemy ' + enemy.id; host.userData.arenaEnemy = enemy.id; stage.add(host);
    const agent = makeAgent(style.color, 0x987265, style.frame); agent.scale.setScalar(style.scale); host.add(agent);
    const overhead = new THREE.Group(); overhead.position.y = 2.9 * style.scale; host.add(overhead);
    bar(healthBackground, overhead, 1.72, .15, 0);
    const hp = bar(healthGreen, overhead, 1.6, .09, 0);
    const shield = bar(shieldBlue, overhead, 1.6, .045, -.13);
    const name = label(style.name, '#' + style.color.toString(16).padStart(6, '0'), 2.7, overhead, 0, .38, 0, false);
    const targetMaterial = lightSurface(style.color, .7);
    const targetRing = mesh(targetRingGeometry, targetMaterial, host, [0, .05, 0]); targetRing.rotation.x = -Math.PI / 2;
    const hazard = new THREE.Group(); hazard.name = 'Fixed attack telegraph'; hazard.userData.arenaTelegraph = enemy.id; stage.add(hazard);
    const dangerMaterial = lightSurface(colors.amber, .18), outlineMaterial = lightSurface(colors.amber, .88);
    mesh(dangerCircleGeometry, dangerMaterial, hazard).rotation.x = -Math.PI / 2;
    mesh(dangerOutlineGeometry, outlineMaterial, hazard, [0, .002, 0]).rotation.x = -Math.PI / 2;
    const cross = box(hazard, 0, .006, 0, .7, .012, .035, outlineMaterial);
    box(hazard, 0, .006, 0, .035, .012, .7, outlineMaterial); cross.userData.attackCenter = true;
    hazard.visible = false;
    return { host, agent, hp, shield, overhead, targetRing, targetMaterial, hazard, dangerMaterial, outlineMaterial,
      name, hpValue: enemy.hp, phase: enemy.phase, hitTime: 0, style, type: enemy.type };
  }
  function releaseEnemy(view) {
    releaseLabel(view.name); view.agent.removeFromParent();
    if (releaseGroup) releaseGroup(view.agent);
    // A host-provided rig releaser is required to dispose skeletons and uncache
    // animation mixers without touching the shared model geometry.
    else view.agent.userData.disposed = true;
    view.host.removeFromParent(); view.hazard.removeFromParent();
    [view.targetMaterial, view.dangerMaterial, view.outlineMaterial].forEach(value => { materialBank.delete(value); value.dispose(); });
  }

  const effectRingGeometry = geometry(new THREE.RingGeometry(.85, 1, 48));
  const effectArcGeometry = geometry(new THREE.RingGeometry(.72, 1, 32, 1, -Math.PI / 2 - .85, 1.7));
  function removeGhost(effect) {
    if (!effect.ghost) return;
    effect.ghost.group.removeFromParent(); effect.ghost.geometries.forEach(value => value.dispose());
    materialBank.delete(effect.ghost.material); effect.ghost.material.dispose(); effect.ghost = null;
  }
  function dodgeAfterimage(host, facing) {
    const source = typeof getPlayerAgent === 'function' ? getPlayerAgent() : null;
    if (!source) return null;
    source.updateWorldMatrix(true, true);
    const sourceInverse = source.matrixWorld.clone().invert(), meshes = [];
    // A snapshot is a posed, static mesh: no cloned skeleton, animation mixer,
    // network actor or additional character instance survives the dodge.
    source.traverseVisible(node => {
      if (node.isSkinnedMesh && node.geometry?.attributes?.position && meshes.length < 8) meshes.push(node);
    });
    if (!meshes.length) return null;
    const vertexCount = meshes.reduce((sum, node) => sum + node.geometry.attributes.position.count, 0);
    if (vertexCount > 60000) return null;
    const ghost = new THREE.Group(); ghost.name = 'Licensed rig frozen dodge pose';
    ghost.userData.arenaAfterimage = true; ghost.rotation.y = source.rotation.y - facing; ghost.scale.copy(source.scale); host.add(ghost);
    const ghostMaterial = new THREE.MeshBasicMaterial({ color: colors.violet, transparent: true, opacity: .22,
      depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
    materialBank.add(ghostMaterial);
    const geometries = [], vertex = new THREE.Vector3();
    meshes.forEach(node => {
      node.skeleton.update();
      const frozen = node.geometry.clone(), count = node.geometry.attributes.position.count;
      const positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
      for (let i = 0; i < count; i++) { node.getVertexPosition(i, vertex); positions.setXYZ(i, vertex.x, vertex.y, vertex.z); }
      frozen.setAttribute('position', positions); frozen.deleteAttribute('skinIndex'); frozen.deleteAttribute('skinWeight');
      frozen.computeBoundingSphere(); geometries.push(frozen);
      const echo = new THREE.Mesh(frozen, ghostMaterial); echo.matrixAutoUpdate = false;
      echo.matrix.multiplyMatrices(sourceInverse, node.matrixWorld); echo.frustumCulled = false; ghost.add(echo);
    });
    return { group: ghost, geometries, material: ghostMaterial };
  }
  function removeEffect(effect) {
    removeGhost(effect);
    releaseLabel(effect.label); effect.group.removeFromParent(); materialBank.delete(effect.material); effect.material.dispose();
    const index = effects.indexOf(effect); if (index >= 0) effects.splice(index, 1);
  }
  function addEffect(event, reducedMotion) {
    if (effects.length >= effectLimit) removeEffect(effects[0]);
    const kind = String(event.type || 'hit').toLowerCase();
    const dodge = /dodge|evade/.test(kind), burst = /burst|pulse|heavy|parry|shield-break|overclock/.test(kind), wave = /wave|victory|complete/.test(kind);
    const enemyAttack = kind === 'enemy-attack';
    const enemyDamage = /^(hit|kill)$|enemy.*hit|damage/.test(kind), playerDamage = /player.*hit|hurt/.test(kind) || (kind === 'enemy-attack' && event.hit);
    const color = playerDamage ? colors.red : burst ? colors.blue : dodge ? colors.violet : wave ? colors.cyan : colors.amber;
    const group = new THREE.Group(); group.position.set(Number(event.x) || 0, 0, Number(event.z) || 0); group.rotation.y = Number(event.facing) || 0;
    group.name = 'Combat feedback ' + kind; group.userData.arenaEffect = kind; stage.add(group);
    const material = lightSurface(color, .9);
    const ringMesh = mesh(burst || dodge || wave || enemyAttack ? effectRingGeometry : effectArcGeometry, material, group, [0, dodge || enemyAttack ? .14 : burst ? .18 : 1.05, 0]);
    ringMesh.rotation.x = -Math.PI / 2;
    const particles = [];
    if (!reducedMotion && !wave) {
      const count = dodge ? 3 : 6;
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2;
        const spark = mesh(sparkGeometry, material, group, [Math.sin(angle) * .3, .65 + (i % 3) * .18, Math.cos(angle) * .3], [.045, .11, .045]);
        particles.push({ mesh: spark, x: Math.sin(angle), z: Math.cos(angle), y: .3 + (i % 3) * .25 });
      }
    }
    const text = typeof event.text === 'string' ? event.text.slice(0, 30) : '';
    const damageLabel = text ? label(text, '#' + color.toString(16).padStart(6, '0'), wave ? 4.3 : 2.6, group, 0, enemyDamage || playerDamage ? 2.8 : 2.2, 0, false) : null;
    const effect = { group, material, ring: ringMesh, particles, label: damageLabel, age: 0,
      life: reducedMotion ? .75 : wave ? 1.6 : dodge ? .42 : .72, burst, dodge, wave, reducedMotion,
      radius: Number(event.radius) || (kind === 'burst' ? 4.8 : burst ? 2.5 : dodge ? .9 : wave ? 2 : 1.35) };
    if (dodge && !reducedMotion) {
      effects.forEach(removeGhost);
      effect.ghost = dodgeAfterimage(group, Number(event.facing) || 0);
    }
    effects.push(effect);
  }
  function clearEvents() {
    effects.slice().forEach(removeEffect); seenEvents.clear(); seenOrder.length = 0;
  }
  function update(combatState, dt, { reducedMotion = false } = {}) {
    if (disposed) return;
    const state = combatState && typeof combatState === 'object' ? combatState : {};
    const elapsed = Math.max(0, Math.min(.1, Number(dt) || 0));
    const now = Number(state.time) || 0;
    const enemyElapsed = elapsed * (Number(state.overclockUntil) > now ? .35 : 1);
    if (now < lastTime) clearEvents(); lastTime = now;
    if (!reducedMotion) visualTime += elapsed;
    core.rotation.y = visualTime * .55; coreHalo.rotation.z = visualTime * .3;
    portalFieldMaterial.opacity = state.phase === 'victory' ? .2 : .07;
    portalField.material.color.setHex(state.phase === 'victory' ? colors.cyan : colors.blue);
    const live = new Set();
    (Array.isArray(state.enemies) ? state.enemies : []).slice(0, limit).forEach(enemy => {
      if (!enemy || !['string', 'number'].includes(typeof enemy.id)) return;
      const enemyId = String(enemy.id); live.add(enemyId);
      let view = enemies.get(enemyId);
      if (view && view.type !== enemy.type) { releaseEnemy(view); enemies.delete(enemyId); view = null; }
      if (!view) { view = enemyView(enemy); enemies.set(enemyId, view); }
      const dead = enemy.phase === 'dead' || Number(enemy.hp) <= 0;
      const ratio = Math.max(0, Math.min(1, Number(enemy.hp) / Math.max(1, Number(enemy.maxHp) || 1)));
      if (Number(enemy.hp) < Number(view.hpValue)) view.hitTime = .2;
      view.hpValue = enemy.hp; view.hitTime = Math.max(0, view.hitTime - elapsed);
      view.host.position.set(Number(enemy.x) || 0, 0, Number(enemy.z) || 0); view.agent.rotation.y = Number(enemy.facing) || 0;
      view.hp.scale.x = 1.6 * ratio;
      view.shield.visible = !dead && Number(enemy.shield) > 0;
      view.shield.scale.x = 1.6 * Math.max(0, Math.min(1, (Number(enemy.shield) || 0) / Math.max(1, Number(enemy.maxShield) || 1)));
      view.overhead.visible = !dead; view.targetRing.visible = !dead;
      const chasing = enemy.phase === 'chase' && !dead;
      const pose = dead ? 'dead' : view.hitTime > 0 ? 'hit' : enemy.phase === 'windup' ? 'windup' : enemy.phase === 'recover' ? 'recover' : null;
      if (pose && animateCombat) animateCombat(view.agent, pose, enemyElapsed, true);
      else if (gait) gait(view.agent, chasing, enemyElapsed, chasing);
      view.agent.visible = !dead || (Number(enemy.timer) || 0) < 1;
      // The telegraph remains pinned to the model's committed attack point.
      // It never follows a dodging player and remains fully readable with
      // reduced motion. No random flashing is used for urgency.
      const telegraph = enemy.phase === 'windup' && !dead;
      view.hazard.visible = telegraph;
      if (telegraph) {
        const radius = Math.max(.4, Math.min(4.5, Number(enemy.attackRadius) || (enemy.type === 'brute' ? 2.1 : 1.45)));
        view.hazard.position.set(Number.isFinite(enemy.attackX) ? enemy.attackX : view.host.position.x, .06,
          Number.isFinite(enemy.attackZ) ? enemy.attackZ : view.host.position.z);
        view.hazard.scale.set(radius, 1, radius);
        const urgent = (Number(enemy.timer) || 0) < .24, color = urgent ? colors.red : colors.amber;
        view.dangerMaterial.color.setHex(color); view.outlineMaterial.color.setHex(color);
        view.dangerMaterial.opacity = urgent ? .27 : .17;
      }
      view.targetMaterial.opacity = view.hitTime > 0 ? 1 : .65; view.phase = enemy.phase;
    });
    enemies.forEach((view, id) => { if (!live.has(id)) { releaseEnemy(view); enemies.delete(id); } });
    (Array.isArray(state.events) ? state.events : []).slice(-32).forEach(event => {
      if (!event || event.id === undefined || event.id === null) return;
      const key = String(event.id); if (seenEvents.has(key)) return;
      seenEvents.add(key); seenOrder.push(key);
      if (seenOrder.length > 256) seenEvents.delete(seenOrder.shift());
      if (event.type === 'telegraph') return;
      const source = state.enemies?.find(enemy => String(enemy.id) === String(event.enemyId));
      addEffect({ ...event, facing: Number.isFinite(event.facing) ? event.facing : source?.facing ?? state.player?.facing ?? 0 }, reducedMotion);
    });
    effects.slice().forEach(effect => {
      effect.age += elapsed; const progress = Math.min(1, effect.age / effect.life);
      if (progress >= 1) { removeEffect(effect); return; }
      effect.material.opacity = .85 * (1 - progress);
      const motionOff = reducedMotion || effect.reducedMotion;
      if (motionOff) removeGhost(effect);
      else if (effect.ghost) effect.ghost.material.opacity = .22 * (1 - progress);
      const scale = motionOff ? effect.radius : effect.dodge ? effect.radius * (.5 + progress * .5) : effect.radius * (.15 + progress * .85);
      effect.ring.scale.setScalar(scale);
      if (effect.label) { effect.label.userData.feedbackOpacity = 1 - progress; effect.label.material.opacity = 1 - progress; effect.label.position.y += motionOff ? 0 : elapsed * .8; }
      effect.particles.forEach(particle => { particle.mesh.visible = !motionOff; });
      if (!motionOff) effect.particles.forEach(particle => {
        particle.mesh.position.set(particle.x * progress * 1.7, .7 + particle.y * progress + Math.sin(progress * Math.PI) * .5, particle.z * progress * 1.7);
        particle.mesh.rotation.z += elapsed * 3;
      });
    });
    stage.userData.arenaStats = { enemies: enemies.size, effects: effects.length, telegraphs: [...enemies.values()].filter(view => view.hazard.visible).length,
      afterimages: effects.filter(effect => !!effect.ghost).length,
      enemyLimit: limit, effectLimit, phase: state.phase || 'idle', reducedMotion: !!reducedMotion };
  }
  function dispose() {
    if (disposed) return; disposed = true;
    clearEvents(); enemies.forEach(releaseEnemy); enemies.clear(); [...labels].forEach(releaseLabel);
    stage.removeFromParent();
    stage.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
    geometryBank.forEach(value => value.dispose()); materialBank.forEach(value => value.dispose());
    geometryBank.clear(); materialBank.clear();
  }
  return { update, dispose, group: stage };
}
