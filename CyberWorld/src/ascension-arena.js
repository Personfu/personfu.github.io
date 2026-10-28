// Original CyberWorld Breach Foundry. Combat is fictional, local game state.
// The host owns the renderer and the licensed character rigs; this view owns
// only its stage, four reusable combatant slots and bounded visual effects.
export function createArena({ THREE, parent, makeAgent, textSprite, gait, animateCombat, releaseGroup, getPlayerAgent, artURL }) {
  const stage = new THREE.Group(); stage.name = 'Breach Foundry';
  stage.userData.arena = true; stage.userData.dynamic = true; parent.add(stage);
  const geometryBank = new Set(), materialBank = new Set(), textureBank = new Set(), disposedTextures = new WeakSet(), labels = new Set();
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
  const unitSphere = geometry(new THREE.SphereGeometry(1, 12, 8));
  const healthPlane = geometry(new THREE.PlaneGeometry(1, 1));
  const sparkGeometry = geometry(new THREE.OctahedronGeometry(1, 0));
  const dark = surface(0x121e29), steel = surface(0x344756), edge = surface(0x65818b), black = surface(0x050d16);
  const cyan = surface(0x184a4d, { emissive: colors.cyan, emissiveIntensity: .7 });
  const amber = surface(0x715036, { emissive: colors.amber, emissiveIntensity: .55 });
  const magenta = surface(0x4d173b, { emissive: colors.red, emissiveIntensity: 1.2 });
  const windowBlue = lightSurface(0x5dd9f0), windowPink = lightSurface(0xeb648e), windowGold = lightSurface(0xd6a55c);
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

  const transform = new THREE.Object3D();
  function roadTextures() {
    const size = 256, paint = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
    let seed = 91763;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = seed >>> 28, crack = Math.abs(x - (83 + Math.sin(y * .073) * 8)) < .8;
      paint[i] = crack ? 5 : 17 + grain; paint[i + 1] = crack ? 9 : 25 + grain; paint[i + 2] = crack ? 15 : 34 + grain; paint[i + 3] = 255;
      const wet = Math.round(169 + Math.sin(x * .019 + y * .011) * 10 + Math.cos(y * .027 - x * .008) * 9 + grain * 1.4);
      rough[i] = rough[i + 1] = rough[i + 2] = wet; rough[i + 3] = 255;
    }
    const map = new THREE.DataTexture(paint, size, size), roughnessMap = new THREE.DataTexture(rough, size, size);
    for (const texture of [map, roughnessMap]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(12, 14); texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.anisotropy = 4; texture.needsUpdate = true; textureBank.add(texture);
    }
    map.colorSpace = THREE.SRGBColorSpace; return { map, roughnessMap };
  }
  // The entire ±11 court is clear. All substantial architecture, servers and
  // furniture sit beyond it; only paint, drains and shallow puddles cross it.
  const street = surface(0x8296a9, { ...roadTextures(), roughness: .72, metalness: .3, envMapIntensity: .65 });
  const road = mesh(geometry(new THREE.PlaneGeometry(70, 88)), street, stage, [0, -.009, 0]); road.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    box(stage, side * 11.8, .1, 0, .58, .2, 29, steel);
    box(stage, side * 11.48, .13, 0, .055, .06, 27, side < 0 ? cyan : magenta);
    for (let i = -10; i <= 10; i++) {
      box(stage, side * 10.75, .013, i, .28, .018, .76, black);
      for (let slat = 0; slat < 3; slat++) box(stage, side * 10.75, .025, i + slat * .2 - .2, .27, .012, .035, edge);
    }
    for (let z = -8; z <= 9; z += 3.4) box(stage, side * .2, .014, z, .075, .012, 1.4, warning);
  }
  box(stage, 0, .1, -11.8, 23, .2, .58, steel);
  const roadPaint = surface(0xadb6b1, { roughness: .85 });
  for (let i = -4; i <= 4; i++) box(stage, i * .85, .015, 7.4, .48, .014, 2.1, roadPaint);
  const puddleSurface = surface(0x254c68, { roughness: .12, metalness: .42, transparent: true, opacity: .20, depthWrite: false });
  const puddleGeometry = geometry(new THREE.CircleGeometry(1, 24));
  const puddles = new THREE.InstancedMesh(puddleGeometry, puddleSurface, 12);
  for (let i = 0; i < 12; i++) {
    transform.position.set(Math.sin(i * 2.3) * 9.1, .002, Math.cos(i * 1.9) * 9.4); transform.rotation.set(-Math.PI / 2, 0, 0);
    transform.scale.set(1.2 + i % 3 * .4, .35 + i % 4 * .15, 1); transform.updateMatrix(); puddles.setMatrixAt(i, transform.matrix);
  }
  puddles.computeBoundingSphere(); stage.add(puddles);

  // Narrow façades, overhangs and stepped towers form an actual street, rather
  // than a circular platform floating in a featureless backdrop.
  const trim = surface(0x243c4b), masonry = surface(0x1a2534), paleMetal = surface(0x6e7c83);
  function facade(x, z, width, depth, height, accent, facing) {
    const building = new THREE.Group(); building.position.set(x, 0, z); building.rotation.y = facing; stage.add(building);
    box(building, 0, height / 2, 0, width, height, depth, masonry);
    box(building, width * .32, height * .62, -.5, width * .22, height * .9, depth * .88, dark);
    box(building, 0, height + .18, 0, width + .45, .36, depth + .4, steel);
    box(building, 0, 1.9, depth / 2 + .04, width * .85, 3.3, .1, black);
    for (let bay = 0; bay < 3; bay++) {
      const px = -width * .3 + bay * width * .3;
      box(building, px, 1.9, depth / 2 + .11, width * .235, 2.8, .04, trim);
      for (let bar = 0; bar < 7; bar++) box(building, px, .8 + bar * .32, depth / 2 + .16, width * .23, .045, .035, paleMetal);
    }
    box(building, 0, 3.62, depth / 2 + .67, width * 1.03, .2, 1.55, steel);
    box(building, 0, 3.48, depth / 2 + 1.42, width, .045, .08, accent);
    for (const side of [-1, 1]) {
      box(building, side * width * .45, height * .5, depth / 2 + .09, .12, height - .5, .14, steel);
      box(building, side * width * .43, height * .5, depth / 2 + .19, .035, height - 1, .035, accent);
    }
    for (let row = 0; row < Math.floor((height - 5) / 1.5); row++) for (let col = 0; col < 4; col++) {
      if ((row * 7 + col * 3 + Math.round(x)) % 5 === 0) continue;
      box(building, -width * .35 + col * width * .235, 5 + row * 1.5, depth / 2 + .04, width * .12, .64, .035, accent);
    }
    for (let fin = 0; fin < 5; fin++) box(building, -width * .3 + fin * width * .15, height + .55, 0, .12, .75, depth * .7, steel);
  }
  for (const side of [-1, 1]) for (let block = 0; block < 3; block++) facade(side * 17.4, -10.3 + block * 10.3, 9.8, 5.4, 13 + (block + (side > 0 ? 1 : 0)) % 3 * 3.3, side < 0 ? windowBlue : windowPink, side < 0 ? Math.PI / 2 : -Math.PI / 2);
  facade(0, -17.8, 34, 6, 18.4, windowGold, 0);
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? -1 : 1, z = -35 + Math.floor(i / 2) * 10.5, x = side * (26 + i % 3 * 4), height = 24 + i % 5 * 5.4;
    facade(x, z, 7 + i % 3, 6.5, height, [windowBlue, windowPink, windowGold][i % 3], side < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  // Sagging insulated service lines use instanced cylindrical sections.
  const cableUp = new THREE.Vector3(0, 1, 0), cableDirection = new THREE.Vector3();
  for (let wire = 0; wire < 6; wire++) {
    const z = -8 + wire * 3.1, curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-15, 10.5 + wire * .2, z), new THREE.Vector3(0, 7.3 + wire * .15, z + 1.3), new THREE.Vector3(15, 11.5, z));
    const points = curve.getPoints(22);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], center = a.clone().add(b).multiplyScalar(.5), length = a.distanceTo(b);
      const cable = mesh(unitCylinder, black, stage, center.toArray(), [.035, length, .035]); cable.quaternion.setFromUnitVectors(cableUp, cableDirection.copy(b).sub(a).normalize());
    }
  }
  for (const side of [-1, 1]) for (let unit = 0; unit < 4; unit++) {
    const x = side * 12.8, z = -9 + unit * 5.9;
    box(stage, x, .73, z, 1.4, 1.45, 1.2, trim); box(stage, x, 1.48, z, 1.5, .12, 1.3, steel);
    for (let vent = 0; vent < 6; vent++) box(stage, x, .3 + vent * .18, z + .62, 1.1, .05, .025, black);
    cylinder(stage, x, 1.58, z, .37, .1, black);
  }
  function signAtlas() {
    const canvas = globalThis.document?.createElement?.('canvas'), ctx = canvas?.getContext?.('2d');
    if (!ctx) { const t = new THREE.DataTexture(new Uint8Array([12, 26, 39, 255]), 1, 1); t.needsUpdate = true; textureBank.add(t); return t; }
    canvas.width = canvas.height = 1024;
    const copy = [['Breach Foundry', 'AFTER-HOURS RESPONSE DISTRICT', '#6de7ff'], ['Ghost market', 'REPAIR / TRADE / KEEP THE SIGNAL', '#f293c2'], ['Null service', 'SYSTEMS / OPEN ALL NIGHT', '#ffcd78'], ['Grid access', 'RETURN TO THE CITY', '#7fffd7']];
    copy.forEach(([title, subtitle, color], row) => {
      const y = row * 256; ctx.fillStyle = '#07121d'; ctx.fillRect(0, y, 1024, 256); ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(8, y + 8, 1008, 240);
      ctx.fillStyle = color; ctx.font = '700 94px sans-serif'; ctx.fillText(title, 38, y + 132, 940);
      ctx.fillStyle = '#c7dce4'; ctx.font = '22px monospace'; ctx.fillText(subtitle, 42, y + 192, 920);
      for (let tick = 0; tick < 14; tick++) ctx.fillRect(780 + tick * 12, y + 222, 3, 9);
    });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; textureBank.add(texture); return texture;
  }
  const shopAtlas = signAtlas(), shopSignMaterial = new THREE.MeshBasicMaterial({ map: shopAtlas, toneMapped: false, side: THREE.DoubleSide }); materialBank.add(shopSignMaterial);
  function shopSign(index, x, y, z, w, h, yaw) {
    const host = new THREE.Group(); host.position.set(x, y, z); host.rotation.y = yaw; stage.add(host);
    box(host, 0, 0, -.16, w + .24, h + .24, .2, black);
    const plane = geometry(new THREE.PlaneGeometry(w, h)), uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, (uv.getY(i) + 3 - index) / 4);
    const panel = mesh(plane, shopSignMaterial, host); panel.name = 'Foundry diegetic shop sign';
    box(host, 0, h / 2 + .08, .02, w + .2, .055, .06, index === 1 ? magenta : cyan);
  }
  shopSign(0, 0, 8.2, -14.65, 19, 4.75, 0);
  shopSign(1, -14.6, 6.2, .2, 9, 2.25, Math.PI / 2);
  shopSign(2, 14.6, 7.8, -5.2, 9, 2.25, -Math.PI / 2);
  shopSign(3, 0, 8, 23, 6.2, 1.55, Math.PI);
  const accentLights = [[colors.blue, -10.5, 6, -7, 22], [colors.red, 10.5, 5.5, 2, 24], [colors.amber, 0, 7, -12, 16]];
  accentLights.forEach(([color, x, y, z, intensity]) => { const light = new THREE.PointLight(color, intensity, 25, 2); light.position.set(x, y, z); stage.add(light); });

  const server = new THREE.Group(); server.name = 'Foundry server core'; server.position.set(0, 0, -12.8); stage.add(server);
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
  const portal = new THREE.Group(); portal.name = 'Foundry exit portal'; portal.position.set(-13.2, 0, 8); stage.add(portal);
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
  let posterStatus = 'fallback';
  if (typeof artURL === 'string' && artURL) {
    const posterMaterial = new THREE.MeshBasicMaterial({ map: shopAtlas, toneMapped: false, side: THREE.DoubleSide }); materialBank.add(posterMaterial);
    const poster = mesh(geometry(new THREE.PlaneGeometry(4.2, 2.1)), posterMaterial, stage, [11, 12.4, -14.58]); poster.name = 'Street district poster';
    posterStatus = 'loading';
    const pending = new THREE.TextureLoader().load(artURL, texture => {
      if (disposed) { if (!disposedTextures.has(texture)) { disposedTextures.add(texture); texture.dispose(); } return; }
      textureBank.add(texture); texture.colorSpace = THREE.SRGBColorSpace; posterMaterial.map = texture; posterMaterial.needsUpdate = true; posterStatus = 'ready';
    }, undefined, () => { if (!disposed) posterStatus = 'fallback'; });
    textureBank.add(pending);
  }
  const rainPositions = new Float32Array(560 * 3);
  for (let i = 0; i < 560; i++) { rainPositions[i * 3] = Math.sin(i * 7.13) * 18; rainPositions[i * 3 + 1] = 1 + i % 83 / 83 * 20; rainPositions[i * 3 + 2] = Math.cos(i * 4.91) * 19; }
  const rainGeometry = geometry(new THREE.BufferGeometry()); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.PointsMaterial({ color: 0xa6c9de, size: .025, transparent: true, opacity: .38, depthWrite: false }); materialBank.add(rainMaterial);
  const rain = new THREE.Points(rainGeometry, rainMaterial); rain.name = 'Foundry street rain'; rain.frustumCulled = false; stage.add(rain);
  // Industrial detail is batched before the dynamic combatants exist, so all
  // the rack lights, warning stripes and pylon plates cost a handful of draws.
  stage.updateMatrixWorld(true);
  const batches = new Map(), stageInverse = stage.matrixWorld.clone().invert();
  stage.traverse(node => {
    if (!node.isMesh || node.isInstancedMesh || ![unitBox, unitCylinder, unitSphere].includes(node.geometry)) return;
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
    warden: { color: colors.violet, name: 'Prism Warden', frame: 'ghost', scale: 1.22 },
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
    const name = enemy.type === 'warden' ? label(style.name, '#d8c8ff', 2.35, overhead, 0, .38, 0, false) : null;
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
      name, attachments: [], armorReady: false, hpValue: enemy.hp, phase: enemy.phase, hitTime: 0, style, type: enemy.type };
  }
  const boneScale = new THREE.Vector3();
  function dressEnemy(view) {
    const rig = view.agent.userData.rig?.root;
    if (!rig || view.armorReady) return;
    view.agent.updateWorldMatrix(true, true);
    function attachment(boneName, shape, material, x, y, z, w, h, d) {
      // GLTFLoader removes punctuation from animation-bound node names.
      const bone = rig.getObjectByName(boneName) || rig.getObjectByName(boneName.replaceAll('.', '')); if (!bone) return;
      bone.getWorldScale(boneScale);
      const piece = new THREE.Mesh(shape, material); piece.name = 'Original construct class armor';
      piece.position.set(x / Math.max(.0001, Math.abs(boneScale.x)), y / Math.max(.0001, Math.abs(boneScale.y)), z / Math.max(.0001, Math.abs(boneScale.z)));
      piece.scale.set(w / Math.max(.0001, Math.abs(boneScale.x)), h / Math.max(.0001, Math.abs(boneScale.y)), d / Math.max(.0001, Math.abs(boneScale.z)));
      bone.add(piece); view.attachments.push(piece);
    }
    const boss = view.type === 'warden';
    for (const side of ['L', 'R']) {
      attachment('Shoulder.' + side, unitSphere, steel, 0, 0, 0, boss ? .33 : .2, boss ? .21 : .14, boss ? .32 : .2);
      attachment('LowerArm.' + side, unitBox, dark, 0, -.08, 0, .18, view.type === 'striker' ? .42 : .27, .2);
      attachment('LowerArm.' + side, unitBox, view.targetMaterial, 0, -.08, .11, .06, view.type === 'striker' ? .4 : .21, .035);
    }
    attachment('Chest', unitBox, black, 0, -.08, -.27, boss ? .66 : .4, boss ? .8 : .5, .24);
    if (boss) for (const side of [-1, 1]) {
      attachment('Chest', unitBox, view.targetMaterial, side * .31, .36, -.3, .055, .62, .055);
      attachment('Chest', unitBox, edge, side * .33, .11, -.31, .12, .7, .12);
    }
    view.armorReady = true;
  }
  function releaseEnemy(view) {
    releaseLabel(view.name); view.attachments.forEach(piece => piece.removeFromParent()); view.attachments.length = 0; view.agent.removeFromParent();
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
    effect.particleBatch?.dispose();
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
    material.blending = THREE.AdditiveBlending;
    const ringMesh = mesh(burst || dodge || wave || enemyAttack ? effectRingGeometry : effectArcGeometry, material, group, [0, dodge || enemyAttack ? .14 : burst ? .18 : 1.05, 0]);
    ringMesh.rotation.x = -Math.PI / 2;
    const particles = []; let particleBatch = null;
    if (!reducedMotion && !wave) {
      const count = dodge ? 6 : burst ? 16 : 10;
      particleBatch = new THREE.InstancedMesh(sparkGeometry, material, count); particleBatch.frustumCulled = false; group.add(particleBatch);
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2;
        particles.push({ x: Math.sin(angle), z: Math.cos(angle), y: .3 + (i % 3) * .25, index: i });
      }
    }
    const text = kind === 'hit' ? typeof event.text === 'string' ? event.text.slice(0, 18) : '' : kind === 'combo' ? '3 HIT COMBO' : kind === 'shield-break' ? 'Shield broken' : '';
    const damageLabel = text ? label(text, '#' + color.toString(16).padStart(6, '0'), 1.9, group, 0, 2.65, 0, false) : null;
    const trail = !burst && !dodge && !wave && !enemyAttack ? mesh(effectArcGeometry, material, group, [0, 1.3, 0]) : null;
    if (trail) { trail.rotation.set(-Math.PI / 2, 0, .12); trail.scale.set(.86, .86, .86); }
    const effect = { group, material, ring: ringMesh, trail, particles, particleBatch, label: damageLabel, age: 0,
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
    rain.visible = !reducedMotion;
    if (!reducedMotion) {
      const positions = rainGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) { let y = positions.getY(i) - elapsed * 8.5; if (y < 0) y += 21; positions.setY(i, y); }
      positions.needsUpdate = true;
    }
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
      dressEnemy(view);
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
      if (effect.trail) { effect.trail.visible = !motionOff; effect.trail.scale.setScalar(scale * .82); effect.trail.rotation.z = .12 + progress * .65; }
      if (effect.particleBatch) {
        effect.particleBatch.visible = !motionOff;
        if (!motionOff) {
          effect.particles.forEach(particle => {
            transform.position.set(particle.x * progress * 2.4, .7 + particle.y * progress + Math.sin(progress * Math.PI) * .6, particle.z * progress * 2.4);
            transform.rotation.set(progress * 3, particle.index, progress * 4); transform.scale.set(.025, .13 * (1 - progress), .025);
            transform.updateMatrix(); effect.particleBatch.setMatrixAt(particle.index, transform.matrix);
          });
          effect.particleBatch.instanceMatrix.needsUpdate = true;
        }
      }
    });
    stage.userData.arenaStats = { enemies: enemies.size, effects: effects.length, telegraphs: [...enemies.values()].filter(view => view.hazard.visible).length,
      afterimages: effects.filter(effect => !!effect.ghost).length,
      enemyLimit: limit, effectLimit, phase: state.phase || 'idle', reducedMotion: !!reducedMotion,
      setting: 'wet-cyberpunk-street', posterStatus, practicalLights: 3, rainDrops: rainPositions.length / 3 };
  }
  function dispose() {
    if (disposed) return; disposed = true;
    clearEvents(); enemies.forEach(releaseEnemy); enemies.clear(); [...labels].forEach(releaseLabel);
    stage.removeFromParent();
    stage.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
    geometryBank.forEach(value => value.dispose()); materialBank.forEach(value => value.dispose());
    textureBank.forEach(texture => { if (!disposedTextures.has(texture)) { disposedTextures.add(texture); texture.dispose(); } });
    geometryBank.clear(); materialBank.clear(); textureBank.clear();
  }
  return { update, dispose, group: stage };
}
