// Original CyberWorld district art. Agency and dossier names are labels in a
// fictional training city, not official insignias or attribution claims.
export function createCyberpunkDistrict({ THREE, parent, textSprite, releaseGroup, artURL }) {
  const group = new THREE.Group(); group.name = 'CyberWorld neon districts'; group.userData.dynamic = true; parent.add(group);
  const geometries = new Set(), materials = new Set(), textures = new Set(), disposedTextures = new WeakSet(), labels = new Set();
  const colors = { blue: 0x52d5ff, cyan: 0x66ffdc, violet: 0xc29cff, red: 0xff547f, gold: 0xffc96c, steel: 0x496473, dark: 0x0d1c2b };
  const recipes = new Map(); let disposed = false, time = 0;
  const ownGeometry = value => { geometries.add(value); return value; };
  const ownMaterial = value => { materials.add(value); return value; };
  // A small original brushed-panel texture gives actual depth-bearing metal
  // surfaces variation under the shared city lighting, instead of flat blocks.
  const panelPixels = new Uint8Array(128 * 128 * 4);
  let panelSeed = 6371;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    panelSeed = (Math.imul(panelSeed, 1664525) + 1013904223) >>> 0;
    const seam = x < 2 || y < 2 || x === 64 || y === 96, value = seam ? 94 : 176 + (panelSeed >>> 28) * 3;
    const i = (y * 128 + x) * 4; panelPixels[i] = value; panelPixels[i + 1] = Math.min(255, value + 5); panelPixels[i + 2] = Math.min(255, value + 11); panelPixels[i + 3] = 255;
  }
  const panelMap = new THREE.DataTexture(panelPixels, 128, 128); panelMap.colorSpace = THREE.SRGBColorSpace;
  panelMap.wrapS = panelMap.wrapT = THREE.RepeatWrapping; panelMap.magFilter = THREE.LinearFilter; panelMap.minFilter = THREE.LinearMipmapLinearFilter;
  panelMap.generateMipmaps = true; panelMap.anisotropy = 4; panelMap.needsUpdate = true; textures.add(panelMap);
  const metal = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, map: panelMap, roughness: .4, metalness: .78, envMapIntensity: .8 }));
  const neon = ownMaterial(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  const shapes = {
    box: ownGeometry(new THREE.BoxGeometry(1, 1, 1)),
    cylinder: ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 16)),
    torus: ownGeometry(new THREE.TorusGeometry(1, .055, 6, 48)),
  };
  const transform = new THREE.Object3D(), tint = new THREE.Color();
  function part(shape, surface, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const key = shape + ':' + surface; if (!recipes.has(key)) recipes.set(key, []);
    recipes.get(key).push({ color, x, y, z, sx, sy, sz, rx, ry, rz });
  }
  const box = (color, x, y, z, sx, sy, sz, light = false, ry = 0, rz = 0) => part('box', light ? 'neon' : 'metal', color, x, y, z, sx, sy, sz, 0, ry, rz);
  const cylinder = (color, x, y, z, radius, height, light = false) => part('cylinder', light ? 'neon' : 'metal', color, x, y, z, radius, height, radius);
  function line(color, a, b, width = .06, light = true) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start), length = delta.length();
    if (length < .001) return;
    const center = start.add(end).multiplyScalar(.5), rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    const angles = new THREE.Euler().setFromQuaternion(rotation);
    part('box', light ? 'neon' : 'metal', color, center.x, center.y, center.z, width, length, width, angles.x, angles.y, angles.z);
  }
  function localPoint(x, y, z, baseX, baseY, baseZ, yaw) {
    return [baseX + x * Math.cos(yaw) + z * Math.sin(yaw), baseY + y, baseZ - x * Math.sin(yaw) + z * Math.cos(yaw)];
  }
  function panelFrame(x, y, z, width, height, yaw, accent) {
    const frameBox = (px, py, pz, sx, sy, sz, color, light = false) => {
      const p = localPoint(px, py, pz, x, y, z, yaw); box(color, ...p, sx, sy, sz, light, yaw);
    };
    // Keep the entire backing behind the textured face at local z=0.
    frameBox(0, 0, -.28, width + .45, height + .45, .4, colors.dark);
    frameBox(0, height / 2 + .16, .08, width + .55, .09, .12, accent, true);
    frameBox(0, -height / 2 - .16, .08, width + .55, .09, .12, accent, true);
    for (const side of [-1, 1]) {
      frameBox(side * (width / 2 + .16), 0, .08, .09, height + .36, .12, accent, true);
      frameBox(side * width * .43, -height / 2 - 1.35, -.24, .28, 2.55, .4, colors.steel);
      frameBox(side * width * .43, -height / 2 - 2.65, -.24, 1.1, .18, .85, colors.steel);
    }
    for (let n = 0; n < 5; n++) frameBox(-width * .39 + n * .3, -height / 2 - .36, .05, .16, .075, .09, accent, true);
  }

  // All text panels share one original atlas. Their plane geometry is merged
  // into a single draw rather than creating a texture/material for each sign.
  const panels = [
    { title: 'BLUE CELL', subtitle: 'FBI / CASEWORK', footer: 'PROTECT · TRACE · RECOVER', color: '#52d5ff' },
    { title: 'GHOST CELL', subtitle: 'CIA / INTEL ARCHIVE', footer: 'COLLECT · QUESTION · CORROBORATE', color: '#c29cff' },
    { title: 'RED TEAM', subtitle: 'MALWARE LAB', footer: 'ISOLATED SIMULATIONS / NO LIVE TARGETS', color: '#ff547f' },
    { title: 'THREAT ARCHIVE', subtitle: 'EQUATION · SHINYHUNTERS', footer: 'DOSSIER LABELS / NO ATTRIBUTION CLAIM', color: '#ffc96c' },
    { title: 'ILLUMINATE', subtitle: 'CIPHER BUREAU', footer: 'READ THE PATTERN / ORIGINAL FICTION', color: '#66ffdc' },
    { title: 'CYBERWORLD', subtitle: 'THE CITY IS YOUR SANDBOX', footer: 'ONE SMALL WIN / ONE BIGGER WORLD', color: '#52d5ff' },
  ];
  function atlasTexture() {
    const canvas = globalThis.document?.createElement?.('canvas');
    if (!canvas) {
      const fallback = new THREE.DataTexture(new Uint8Array([14, 31, 47, 255]), 1, 1);
      fallback.needsUpdate = true; textures.add(fallback); return fallback;
    }
    canvas.width = 1024; canvas.height = 768;
    const context = canvas.getContext('2d');
    if (!context) {
      const fallback = new THREE.DataTexture(new Uint8Array([14, 31, 47, 255]), 1, 1);
      fallback.needsUpdate = true; textures.add(fallback); return fallback;
    }
    function text(value, x, y, size, color, maxWidth = 466) {
      context.font = '700 ' + size + 'px monospace'; context.fillStyle = color; context.fillText(value, x, y, maxWidth);
    }
    panels.forEach((panel, index) => {
      const x = index % 2 * 512, y = Math.floor(index / 2) * 256;
      context.fillStyle = '#06121f'; context.fillRect(x, y, 512, 256);
      context.strokeStyle = '#142d3e'; context.lineWidth = 1;
      for (let grid = 0; grid <= 512; grid += 32) { context.beginPath(); context.moveTo(x + grid, y); context.lineTo(x + grid, y + 256); context.stroke(); }
      for (let grid = 0; grid <= 256; grid += 32) { context.beginPath(); context.moveTo(x, y + grid); context.lineTo(x + 512, y + grid); context.stroke(); }
      context.fillStyle = panel.color; context.fillRect(x + 18, y + 18, 5, 216);
      context.fillRect(x + 31, y + 18, 106, 3); context.fillRect(x + 362, y + 233, 131, 3);
      text('DOSSIERS / TRAINING SIM', x + 36, y + 45, 14, panel.color);
      text(panel.title, x + 34, y + 116, panel.title.length > 12 ? 43 : 55, '#eefbff');
      text(panel.subtitle, x + 36, y + 160, 24, panel.color);
      text(panel.footer, x + 36, y + 200, 13, '#b2c8d5');
      text('ORIGINAL FICTION / NO AGENCY AFFILIATION', x + 36, y + 222, 10, '#7093a6');
      for (let i = 0; i < 6; i++) context.fillRect(x + 455 + i * 6, y + 29, 2, 6 + i * 2);
    });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4; textures.add(texture); return texture;
  }
  const atlas = atlasTexture(), signMaterial = ownMaterial(new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false, side: THREE.DoubleSide }));
  const signPlanes = [], heroPlanes = [];
  function sign(index, x, y, z, width, height, yaw = 0) {
    signPlanes.push({ index, x, y, z, width, height, yaw });
    panelFrame(x, y, z, width, height, yaw, Number.parseInt(panels[index].color.slice(1), 16));
  }
  function mergedPlanes(items, atlasUV) {
    const positions = [], normals = [], uvs = [], indices = [], vertex = new THREE.Vector3();
    items.forEach((item, itemIndex) => {
      transform.position.set(item.x, item.y, item.z); transform.rotation.set(0, item.yaw, 0); transform.scale.set(1, 1, 1); transform.updateMatrix();
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(transform.matrix);
      const corners = [[-item.width / 2, -item.height / 2, 0], [item.width / 2, -item.height / 2, 0], [item.width / 2, item.height / 2, 0], [-item.width / 2, item.height / 2, 0]];
      corners.forEach(point => { vertex.set(...point).applyMatrix4(transform.matrix); positions.push(vertex.x, vertex.y, vertex.z); normals.push(normal.x, normal.y, normal.z); });
      const col = item.index % 2, row = Math.floor(item.index / 2), u0 = atlasUV ? col / 2 : 0, u1 = atlasUV ? (col + 1) / 2 : 1;
      const v0 = atlasUV ? 1 - (row + 1) / 3 : 0, v1 = atlasUV ? 1 - row / 3 : 1;
      uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
      const start = itemIndex * 4; indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    });
    const geometry = ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeBoundingSphere();
    return geometry;
  }

  // Elevated, inward-facing key art stays in front of the facility facades and
  // outside the teaching routes. One image resource supplies both billboards.
  for (const side of [-1, 1]) {
    const billboard = { index: 0, x: side * 24, y: side < 0 ? 12.5 : 14, z: -5.8, width: 13.4, height: 6.7, yaw: side * -.82 };
    heroPlanes.push(billboard); panelFrame(billboard.x, billboard.y, billboard.z, billboard.width, billboard.height, billboard.yaw, side < 0 ? colors.blue : colors.red);
  }
  const heroMaterial = ownMaterial(new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false, side: THREE.DoubleSide }));
  const heroMesh = new THREE.Mesh(mergedPlanes(heroPlanes, false), heroMaterial); heroMesh.name = 'Shared district key art'; group.add(heroMesh);
  group.userData.artStatus = 'fallback';
  function disposeTexture(texture) { if (texture && !disposedTextures.has(texture)) { disposedTextures.add(texture); texture.dispose(); } }
  if (typeof artURL === 'string' && artURL) {
    group.userData.artStatus = 'loading';
    const pending = new THREE.TextureLoader().load(artURL, texture => {
      if (disposed) { disposeTexture(texture); return; }
      textures.add(texture); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      heroMaterial.map = texture; heroMaterial.needsUpdate = true; group.userData.artStatus = 'ready';
    }, undefined, () => { if (!disposed) group.userData.artStatus = 'fallback'; });
    if (disposed) disposeTexture(pending); else textures.add(pending);
  }
  sign(0, -17, 19.7, -10.9, 11.4, 5.7, .14);
  sign(1, -37.2, 18, 1, 8.3, 4.15, Math.PI / 2);
  sign(2, 15, 15.2, -10.9, 11.4, 5.7, -.14);
  sign(3, 35.1, 13.1, 6, 9.2, 4.6, -.98);
  sign(4, 0, 36.7, -31.3, 10.8, 5.4);
  sign(5, 0, 8.5, 24, 13.2, 3.4, Math.PI);

  // Two industrial data gateways frame the district without narrowing the
  // beginner playground (x -8..6, z 5..18).
  for (const gate of [{ z: -8, height: 8.8, color: colors.blue }, { z: 24, height: 7.8, color: colors.violet }]) {
    for (const side of [-1, 1]) {
      box(colors.dark, side * 10.4, gate.height / 2, gate.z, .75, gate.height, 1.2);
      box(gate.color, side * 10.4, gate.height / 2, gate.z + .64, .11, gate.height - .4, .08, true);
      box(colors.steel, side * 10.4, .22, gate.z, 1.65, .44, 1.75);
      for (let slat = 0; slat < 5; slat++) box(slat % 2 ? colors.steel : gate.color, side * 10.4, .68 + slat * .22, gate.z + .68, .7, .09, .045, slat % 2 === 0);
      line(colors.steel, [side * 10.3, gate.height - 1.1, gate.z], [side * 8.7, gate.height, gate.z], .25, false);
    }
    box(colors.dark, 0, gate.height, gate.z, 21.8, .65, 1.2);
    box(gate.color, 0, gate.height - .22, gate.z + .65, 20, .055, .07, true);
    for (let i = -8; i <= 8; i += 2) box(colors.steel, i, gate.height + .52, gate.z, 1.4, .32, .85);
  }
  // Rooftop circuits and fins make existing towers read as inhabited systems.
  for (const roof of [{ x: -17, z: -16, y: 17.6, color: colors.blue }, { x: 15, z: -16, y: 12.6, color: colors.red }, { x: 21, z: 7, y: 8.65, color: colors.gold }]) {
    for (const side of [-1, 1]) {
      line(roof.color, [roof.x + side * 4.5, roof.y, roof.z - 3.1], [roof.x + side * 4.5, roof.y, roof.z + 3.1], .07);
      line(roof.color, [roof.x + side * 4.5, roof.y, roof.z + 3.1], [roof.x + side * 2, roof.y, roof.z + 3.1], .07);
      cylinder(roof.color, roof.x + side * 4.5, roof.y + .12, roof.z - 3.1, .15, .24, true);
    }
    for (let fin = 0; fin < 7; fin++) box(colors.steel, roof.x - 2.7 + fin * .9, roof.y + .7, roof.z - 2.8, .12, 1.4, 1.5);
  }
  // Side-street server banks, status lights and rainlit power pylons.
  for (const side of [-1, 1]) {
    const accent = side < 0 ? colors.blue : colors.red;
    for (let rack = 0; rack < 4; rack++) {
      const x = side * 35.5, z = -5 + rack * 4.1;
      box(colors.dark, x, 1.9, z, 1.65, 3.8, 1.25); box(colors.steel, x, .13, z, 1.85, .26, 1.5);
      for (let tray = 0; tray < 8; tray++) {
        box(colors.steel, x, .45 + tray * .39, z + .65, 1.3, .22, .045);
        for (let led = 0; led < 3; led++) box((tray + led) % 4 ? accent : colors.gold, x - .43 + led * .14, .48 + tray * .39, z + .69, .06, .055, .025, true);
      }
    }
    for (const z of [-2, 17]) {
      const x = side * 30.5;
      cylinder(colors.steel, x, 2.9, z, .16, 5.8); box(colors.dark, x, 5.5, z, .7, .9, .7);
      box(accent, x, 5.6, z + .38, .38, .54, .06, true);
      line(accent, [x - .55, .13, z], [x + .55, .13, z], .055);
      for (let n = 0; n < 3; n++) line(accent, [x - .5, .08, z + .65 + n * .2], [x + .5, .08, z + .65 + n * .2], .025);
    }
  }

  // An original eye-shaped cryptography crown: no pyramid, seal or agency mark.
  part('torus', 'neon', colors.cyan, 0, 41, -33, 5.5, 1.9, .65);
  part('torus', 'neon', colors.violet, 0, 41, -32.95, 1.13, 1.13, .7);
  for (const side of [-1, 1]) {
    line(colors.cyan, [side * 5.3, 41, -33], [side * 7, 43.3, -33], .09);
    line(colors.cyan, [side * 5.3, 41, -33], [side * 7, 38.7, -33], .09);
    cylinder(colors.steel, side * 3.8, 37.2, -35, .16, 6.1);
    cylinder(colors.cyan, side * 3.8, 40.35, -35, .22, .16, true);
  }
  const pupilMaterial = ownMaterial(new THREE.MeshBasicMaterial({ color: colors.cyan, toneMapped: false, wireframe: true }));
  const pupil = new THREE.Mesh(ownGeometry(new THREE.IcosahedronGeometry(.76, 1)), pupilMaterial); pupil.position.set(0, 41, -32.8); pupil.name = 'Original cipher-eye pupil'; group.add(pupil);
  const pupilCore = new THREE.Mesh(ownGeometry(new THREE.OctahedronGeometry(.32, 0)), neon); pupilCore.position.copy(pupil.position); group.add(pupilCore);

  // Layer the existing facility façades with service gantries, rolled shutters,
  // exoskeleton ribs and exposed rooftop plumbing. Every substantial element
  // is attached to an existing building or outside the welcoming first route.
  for (const face of [{ x: -17, z: -11.15, height: 17.2, width: 10.7, accent: colors.blue }, { x: 15, z: -11.15, height: 12.2, width: 11.7, accent: colors.red }]) {
    for (let rib = 0; rib < 6; rib++) {
      const x = face.x - face.width * .46 + rib * face.width * .184;
      box(colors.steel, x, face.height * .62, face.z, .2, face.height * .69, .34);
      box(face.accent, x + .13, face.height * .63, face.z + .2, .028, face.height * .62, .035, true);
      box(colors.dark, x, face.height + .7, face.z - .45, .5, 1.4, .6);
      box(face.accent, x, face.height + 1.4, face.z - .45, .32, .07, .32, true);
    }
    box(colors.dark, face.x, 4.35, face.z + .3, face.width + .5, .28, .9);
    box(face.accent, face.x, 4.18, face.z + .76, face.width, .045, .055, true);
    for (const sign of [-1, 1]) {
      line(colors.steel, [face.x + sign * face.width * .41, 4.5, face.z + .7], [face.x + sign * face.width * .31, 6.1, face.z - .1], .12, false);
      cylinder(colors.steel, face.x + sign * face.width * .4, face.height + 1, face.z - 2.4, .18, 2);
      part('torus', 'metal', colors.steel, face.x + sign * face.width * .4, face.height + 1.9, face.z - 2.4, .38, .38, .38, Math.PI / 2);
    }
  }
  for (const shop of [{ x: -22, z: 11.72, accent: colors.violet }, { x: 21, z: 10.72, accent: colors.gold }]) {
    // The original central doors stay open and visible.
    for (const side of [-1, 1]) {
      const x = shop.x + side * 3.3;
      box(colors.dark, x, 1.8, shop.z, 1.8, 3.2, .12);
      for (let slat = 0; slat < 11; slat++) box(colors.steel, x, .35 + slat * .27, shop.z + .09, 1.7, .12, .07);
      box(shop.accent, x - side * .92, 1.8, shop.z + .1, .055, 3.1, .08, true);
      box(colors.dark, x, 3.52, shop.z + .55, 2.4, .16, 1.35);
      box(shop.accent, x, 3.41, shop.z + 1.25, 2.3, .035, .055, true);
    }
  }
  for (const roof of [{ x: -38, y: 29.5, z: -29 }, { x: 32, y: 25.5, z: -29 }, { x: 40, y: 31.5, z: 0 }, { x: -34, y: 20.5, z: 32 }]) {
    box(colors.dark, roof.x, roof.y + 1.4, roof.z, 5.5, 2.8, 4);
    for (let vent = 0; vent < 7; vent++) box(colors.steel, roof.x - 2.4 + vent * .8, roof.y + 2.9, roof.z, .17, .55, 4.3);
    cylinder(colors.steel, roof.x + 2.5, roof.y + 4.2, roof.z - 1, .1, 7);
    cylinder(colors.red, roof.x + 2.5, roof.y + 7.75, roof.z - 1, .15, .13, true);
    line(colors.cyan, [roof.x - 2.7, roof.y + 2.8, roof.z + 2.1], [roof.x + 2.7, roof.y + 2.8, roof.z + 2.1], .045);
  }

  const signMesh = new THREE.Mesh(mergedPlanes(signPlanes, true), signMaterial); signMesh.name = 'Original district sign atlas'; group.add(signMesh);
  let instanceCount = 0;
  recipes.forEach((items, key) => {
    const [shape, surface] = key.split(':'), batch = new THREE.InstancedMesh(shapes[shape], surface === 'metal' ? metal : neon, items.length);
    items.forEach((item, index) => {
      transform.position.set(item.x, item.y, item.z); transform.rotation.set(item.rx, item.ry, item.rz); transform.scale.set(item.sx, item.sy, item.sz);
      transform.updateMatrix(); batch.setMatrixAt(index, transform.matrix); tint.setHex(item.color); batch.setColorAt(index, tint);
    });
    batch.name = 'District art batch / ' + key; batch.castShadow = false; batch.receiveShadow = surface === 'metal'; batch.computeBoundingSphere(); group.add(batch); instanceCount += items.length;
  });
  recipes.clear();
  const packets = new THREE.InstancedMesh(shapes.box, neon, 10); packets.name = 'Data gateway light couriers'; packets.frustumCulled = false; group.add(packets);
  for (let i = 0; i < 10; i++) packets.setColorAt(i, tint.setHex(i % 2 ? colors.violet : colors.blue));
  if (typeof textSprite === 'function') {
    for (const entry of [{ x: -31.5, text: 'BLUE CELL / DEFEND THE GRID', color: '#8ce4ff' }, { x: 31.5, text: 'RED TEAM / TRAINING ONLY', color: '#ff9ab3' }]) {
      const label = textSprite(entry.text, entry.color, 5.5); label.position.set(entry.x, 6.7, 8); labels.add(label); group.add(label);
    }
  }
  const reflectionMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x36738d, metalness: .96, roughness: .075, transparent: true, opacity: .32, depthWrite: false }));
  const reflections = new THREE.InstancedMesh(ownGeometry(new THREE.PlaneGeometry(1, 1)), reflectionMaterial, 6);
  [[-30.5,-2],[-30.5,17],[30.5,-2],[30.5,17],[-10.4,-8],[10.4,-8]].forEach(([x,z], i) => {
    transform.position.set(x, .033, z + 1.3); transform.rotation.set(-Math.PI / 2, 0, .15 * (i % 2 ? 1 : -1)); transform.scale.set(1.5, 3.2, 1); transform.updateMatrix(); reflections.setMatrixAt(i, transform.matrix);
  });
  reflections.name = 'Rainlit district puddles'; reflections.computeBoundingSphere(); group.add(reflections);
  function update(dt, { paused = false, reducedMotion = false } = {}) {
    if (disposed) return;
    const elapsed = Math.max(0, Math.min(.1, Number.isFinite(dt) ? dt : 0));
    if (!paused && !reducedMotion) time += elapsed;
    pupil.rotation.y = time * .23; pupil.rotation.z = time * .09; pupilCore.rotation.y = -time * .34;
    packets.visible = !reducedMotion;
    for (let i = 0; i < 10; i++) {
      const t = (time * .055 + i / 10) % 1;
      transform.position.set(-9.5 + t * 19, 8.6, -7.3); transform.rotation.set(0, 0, 0); transform.scale.set(.15, .1, .35);
      transform.updateMatrix(); packets.setMatrixAt(i, transform.matrix);
    }
    packets.instanceMatrix.needsUpdate = true;
    group.userData.cyberpunkStats = { instances: instanceCount, staticBatches: [...group.children].filter(node => node.isInstancedMesh && node !== packets && node !== reflections).length,
      drawObjects: group.children.filter(node => node.isMesh || node.isSprite).length, labels: labels.size, artStatus: group.userData.artStatus,
      artBillboards: 2, originalDossierSigns: panels.length, paused: !!paused, reducedMotion: !!reducedMotion };
  }
  function dispose() {
    if (disposed) return; disposed = true;
    [...labels].forEach(label => {
      label.removeFromParent();
      if (releaseGroup) releaseGroup(label); else { label.material?.map?.dispose(); label.material?.dispose(); }
    });
    labels.clear(); group.removeFromParent(); group.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(disposeTexture);
    geometries.clear(); materials.clear(); textures.clear();
  }
  update(0, { reducedMotion: true });
  return { update, dispose, group };
}
