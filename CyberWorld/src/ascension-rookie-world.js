// Original CyberWorld quick-quest scenery. This helper draws friendly markers
// only; the host registers interactions and owns all quest rules and rewards.
export function createRookieWorld({ THREE, parent, textSprite, releaseGroup }) {
  const group = new THREE.Group(); group.name = 'Rookie playground'; group.userData.dynamic = true;
  parent.add(group);
  const geometries = new Set(), materials = new Set(), labels = new Set();
  const palette = { blue: 0x65c9ff, amber: 0xffcc70, violet: 0xc6a5ff, cyan: 0x7effdf, done: 0x79caff };
  let disposed = false, time = 0, followerReady = false;
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const ownGeometry = value => { geometries.add(value); return value; };
  function material(color, emissive = false, extra = {}) {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .46, metalness: .25,
      ...(emissive ? { emissive: color, emissiveIntensity: .52 } : {}), ...extra });
    materials.add(value); return value;
  }
  function flat(color, opacity = 1) {
    const value = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity,
      depthWrite: opacity >= 1, toneMapped: false, side: THREE.DoubleSide });
    materials.add(value); return value;
  }
  const shape = {
    box: ownGeometry(new THREE.BoxGeometry(1, 1, 1)),
    sphere: ownGeometry(new THREE.SphereGeometry(1, 16, 12)),
    cylinder: ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 24)),
    torus: ownGeometry(new THREE.TorusGeometry(1, .065, 6, 40)),
    spark: ownGeometry(new THREE.OctahedronGeometry(1, 0)),
    cone: ownGeometry(new THREE.ConeGeometry(.23, .52, 5)),
    disc: ownGeometry(new THREE.CircleGeometry(1, 32)),
  };
  const dark = material(0x183449), pale = material(0xb0d4df), white = flat(0xe4ffff), eye = flat(0x092638);
  const blue = material(palette.blue, true), cyan = material(palette.cyan, true), gold = material(palette.amber, true);
  function mesh(geometry, surface, host, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
    const value = new THREE.Mesh(geometry, surface); value.position.set(x, y, z); value.scale.set(sx, sy, sz);
    value.castShadow = false; value.receiveShadow = !surface.isMeshBasicMaterial; host.add(value); return value;
  }
  function box(host, x, y, z, sx, sy, sz, surface) { return mesh(shape.box, surface, host, x, y, z, sx, sy, sz); }
  function sphere(host, x, y, z, sx, sy, sz, surface) { return mesh(shape.sphere, surface, host, x, y, z, sx, sy, sz); }
  function ring(host, x, y, z, radius, surface, horizontal = true) {
    const value = mesh(shape.torus, surface, host, x, y, z, radius, radius, radius);
    if (horizontal) value.rotation.x = Math.PI / 2;
    return value;
  }
  function makeLabel(text, color, width, host, x, y, z, background = true) {
    const value = textSprite(text, color, width, background); value.userData.rookieLabel = true; value.position.set(x, y, z); labels.add(value); host.add(value); return value;
  }
  function releaseLabel(value) {
    if (!value || !labels.delete(value)) return;
    value.removeFromParent();
    if (releaseGroup) releaseGroup(value);
    else { value.material?.map?.dispose(); value.material?.dispose(); }
  }
  function color(value) {
    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return Number.parseInt(value.slice(1), 16);
    return Object.hasOwn(palette, value) ? palette[value] : palette.cyan;
  }

  // Six reusable slots bound both the scene cost and the number of labels.
  // Slots never register logical targets or change the host's pickable list.
  function markerSlot(index) {
    const host = new THREE.Group(); host.name = 'Rookie marker ' + index; host.userData.dynamic = true; group.add(host);
    const accent = material(palette.cyan, true), haze = flat(palette.cyan, .08);
    mesh(shape.cylinder, dark, host, 0, .07, 0, .65, .14, .65);
    const floorRing = ring(host, 0, .17, 0, .7, accent);
    const floorGlow = mesh(shape.disc, haze, host, 0, .015, 0, .93, .93, .93); floorGlow.rotation.x = -Math.PI / 2;
    const ringShape = new THREE.Group(); host.add(ringShape);
    ring(ringShape, 0, 1.12, 0, .66, accent, false);
    ring(ringShape, 0, 1.12, 0, .51, pale, false);
    const sparkShape = new THREE.Group(); host.add(sparkShape);
    const shard = mesh(shape.spark, accent, sparkShape, 0, 1.12, 0, .3, .44, .3);
    const orbit = ring(sparkShape, 0, 1.12, 0, .47, pale); orbit.rotation.x = Math.PI * .3;
    const beaconShape = new THREE.Group(); host.add(beaconShape);
    mesh(shape.cylinder, pale, beaconShape, 0, .56, 0, .24, .9, .24);
    mesh(shape.cylinder, dark, beaconShape, 0, .26, 0, .38, .2, .38);
    sphere(beaconShape, 0, 1.16, 0, .33, .33, .33, accent);
    ring(beaconShape, 0, 1.15, 0, .48, accent);
    mesh(shape.cylinder, pale, beaconShape, 0, 1.53, 0, .09, .16, .09);
    const padShape = new THREE.Group(); host.add(padShape);
    mesh(shape.cylinder, accent, padShape, 0, .2, 0, .52, .16, .52);
    mesh(shape.cylinder, pale, padShape, 0, .3, 0, .27, .045, .27);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      sphere(padShape, Math.sin(angle) * .75, .17, Math.cos(angle) * .75, .11, .06, .11, accent);
    }
    const check = new THREE.Group(); check.position.set(0, 1.25, .1); host.add(check);
    const a = box(check, -.13, -.04, 0, .1, .34, .08, white); a.rotation.z = .7;
    const b = box(check, .13, .09, 0, .1, .62, .08, white); b.rotation.z = -.55;
    host.visible = false;
    return { host, accent, haze, floorRing, ringShape, sparkShape, beaconShape, padShape, shard, orbit, check,
      label: null, labelKey: '', state: 'todo' };
  }
  const slots = Array.from({ length: 6 }, (_, index) => markerSlot(index));

  // A large down arrow communicates the next stop without relying on color.
  const waypoint = new THREE.Group(); waypoint.name = 'Next quick-quest stop'; group.add(waypoint);
  const pointer = mesh(shape.cone, gold, waypoint, 0, 2.72, 0); pointer.rotation.z = Math.PI;
  const waypointLabel = makeLabel('NEXT STOP', '#ffdb92', 2.15, waypoint, 0, 3.18, 0, false);
  waypointLabel.userData.rookieWaypoint = true; waypoint.visible = false;
  const crumbGeometry = ownGeometry(new THREE.BufferGeometry());
  crumbGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .18, .13, 0, -.13, -.13, 0, -.13], 3));
  crumbGeometry.computeVertexNormals();
  const crumbMaterial = flat(palette.amber, .8);
  const crumbs = new THREE.InstancedMesh(crumbGeometry, crumbMaterial, 22); crumbs.name = 'Rookie breadcrumb arrows';
  crumbs.userData.rookieBreadcrumbs = true; crumbs.count = 0; crumbs.frustumCulled = false; group.add(crumbs);
  const transform = new THREE.Object3D(), followTarget = new THREE.Vector3();

  // A repaired neighborhood beacon remains visible after the first welcome.
  const restored = new THREE.Group(); restored.name = 'Restored welcome beacon'; restored.position.set(-5, 0, 15);
  restored.userData.rookieRestoredBeacon = true; group.add(restored);
  mesh(shape.cylinder, dark, restored, 0, .11, 0, .72, .22, .72);
  ring(restored, 0, .25, 0, .68, blue);
  mesh(shape.cylinder, pale, restored, 0, .78, 0, .22, 1.1, .22);
  sphere(restored, 0, 1.5, 0, .33, .33, .33, blue);
  ring(restored, 0, 1.5, 0, .52, blue);
  makeLabel('YOU BROUGHT THE LIGHT BACK', '#a2dfff', 3.5, restored, 0, 2.42, 0);
  restored.visible = false;

  // The guide is a small original floating orb with a readable friendly face.
  const companion = new THREE.Group(); companion.name = 'Rookie orb companion'; companion.userData.rookieCompanion = true;
  const orb = new THREE.Group(); companion.add(orb); group.add(companion);
  sphere(orb, 0, 0, 0, .26, .26, .25, pale);
  sphere(orb, 0, -.01, .2, .21, .13, .065, dark);
  for (const side of [-1, 1]) sphere(orb, side * .075, .015, .253, .025, .039, .018, white);
  const smileA = box(orb, -.025, -.07, .256, .055, .014, .016, cyan); smileA.rotation.z = -.3;
  const smileB = box(orb, .025, -.07, .256, .055, .014, .016, cyan); smileB.rotation.z = .3;
  ring(orb, 0, 0, 0, .34, cyan); sphere(orb, 0, .34, 0, .055, .055, .055, cyan);
  makeLabel('YOUR LITTLE GUIDE', '#b8ffeb', 2.3, companion, 0, .67, 0, false);
  companion.visible = false;

  const drone = new THREE.Group(); drone.name = 'Friendly delivery drone'; drone.userData.rookieCourier = true;
  const droneBody = new THREE.Group(); drone.add(droneBody); group.add(drone);
  sphere(droneBody, 0, 0, 0, .42, .16, .32, pale);
  sphere(droneBody, 0, -.015, .26, .23, .09, .07, dark);
  for (const side of [-1, 1]) sphere(droneBody, side * .075, .005, .32, .025, .03, .014, white);
  box(droneBody, 0, -.27, 0, .35, .3, .3, gold);
  box(droneBody, 0, -.27, .156, .06, .29, .015, pale);
  const rotors = [];
  for (const x of [-.51, .51]) for (const z of [-.36, .36]) {
    const arm = box(droneBody, x * .6, 0, z * .6, .54, .05, .05, dark); arm.rotation.y = x * z > 0 ? -.6 : .6;
    ring(droneBody, x, .035, z, .2, cyan);
    const rotor = new THREE.Group(); rotor.position.set(x, .045, z); droneBody.add(rotor);
    box(rotor, 0, 0, 0, .32, .025, .045, dark); box(rotor, 0, 0, 0, .045, .025, .32, dark); rotors.push(rotor);
  }
  makeLabel('DELIVERY BUDDY', '#ffdfa3', 2.3, drone, 0, .58, 0, false); drone.visible = false;

  function update(value, dt, { player, paused = false, reducedMotion = false } = {}) {
    if (disposed) return;
    const state = value && typeof value === 'object' ? value : {};
    const elapsed = clamp(finite(dt), 0, .1), active = !!state.active;
    if (!paused && !reducedMotion) time += elapsed;
    const seen = new Set(), targets = [];
    for (const target of Array.isArray(state.targets) ? state.targets : []) {
      if (targets.length >= 6) break;
      if (!target || !['string', 'number'].includes(typeof target.id) || !Number.isFinite(target.x) || !Number.isFinite(target.z)) continue;
      const id = String(target.id);
      if (seen.has(id) || target.x < -12 || target.x > 8 || target.z < 5 || target.z > 18) continue;
      seen.add(id); targets.push({ ...target, id });
    }
    slots.forEach((slot, index) => {
      const target = active ? targets[index] : null; slot.host.visible = !!target;
      if (!target) { releaseLabel(slot.label); slot.label = null; slot.labelKey = ''; return; }
      const next = target.state === 'next', done = target.state === 'done';
      const targetColor = done ? palette.done : color(target.color);
      const kind = ['ring', 'spark', 'beacon', 'pad'].includes(target.kind) ? target.kind : 'ring';
      slot.host.position.set(target.x, 0, target.z);
      slot.host.userData.rookieTarget = { id: target.id, kind, state: done ? 'done' : next ? 'next' : 'todo' };
      slot.accent.color.setHex(targetColor); slot.accent.emissive.setHex(targetColor);
      slot.accent.emissiveIntensity = next ? .68 : done ? .4 : .32;
      slot.haze.color.setHex(targetColor); slot.haze.opacity = next ? .12 : .055;
      slot.floorRing.scale.setScalar(next ? .78 : .7);
      slot.ringShape.visible = !done && kind === 'ring'; slot.sparkShape.visible = !done && kind === 'spark';
      slot.beaconShape.visible = kind === 'beacon'; slot.padShape.visible = kind === 'pad'; slot.check.visible = done && kind !== 'beacon';
      slot.shard.rotation.y = time * .8; slot.shard.position.y = 1.12 + (!reducedMotion ? Math.sin(time * 1.8 + index) * .065 : 0);
      slot.orbit.rotation.z = time * .35;
      const title = (typeof target.title === 'string' ? target.title : 'Quick quest').slice(0, 38);
      const text = done ? 'DONE / ' + title : title, textColor = '#' + targetColor.toString(16).padStart(6, '0');
      const key = text + ':' + textColor + ':' + kind + ':' + (next ? 'next' : done ? 'done' : 'todo');
      if (slot.labelKey !== key) {
        releaseLabel(slot.label); slot.label = makeLabel(text, textColor, next ? 3.05 : 2.75, slot.host, 0, kind === 'beacon' ? 2.15 : 2.05, 0);
        slot.labelKey = key;
      }
      slot.state = target.state;
    });
    const destination = active ? targets.find(target => target.state === 'next') : null;
    waypoint.visible = !!destination;
    if (destination) { waypoint.position.set(destination.x, !reducedMotion ? Math.sin(time * 2) * .055 : 0, destination.z); }

    const position = player?.position || player;
    const playerX = finite(position?.x), playerY = finite(position?.y), playerZ = finite(position?.z, 10);
    crumbs.count = 0;
    if (destination) {
      const dx = destination.x - playerX, dz = destination.z - playerZ, distance = Math.hypot(dx, dz);
      if (distance > 1.25) {
        const count = Math.min(22, Math.max(1, Math.floor((distance - .8) / .65))), facing = Math.atan2(dx, dz);
        for (let i = 0; i < count; i++) {
          const fraction = (.6 + i * (distance - 1.2) / Math.max(1, count - 1)) / distance;
          transform.position.set(playerX + dx * fraction, .06, playerZ + dz * fraction); transform.rotation.set(0, facing, 0); transform.scale.setScalar(1);
          transform.updateMatrix(); crumbs.setMatrixAt(i, transform.matrix);
        }
        crumbs.count = count; crumbs.instanceMatrix.needsUpdate = true;
      }
    }
    const unlocked = !!state.companion;
    restored.visible = unlocked && !targets.some(target => active && target.kind === 'beacon' && Math.hypot(target.x + 5, target.z - 15) < .5);
    companion.visible = unlocked; drone.visible = active && state.job === 'courier';
    if (!paused || !followerReady) {
      const blend = reducedMotion || !followerReady ? 1 : 1 - Math.exp(-elapsed * 6);
      followTarget.set(playerX + 1.15, playerY + 1.65, playerZ + .65); companion.position.lerp(followTarget, blend);
      followTarget.set(playerX - 1.15, playerY + 1.18, playerZ + .9); drone.position.lerp(followTarget, blend);
      companion.rotation.y = Math.atan2(playerX - companion.position.x, playerZ - companion.position.z);
      drone.rotation.y = Math.atan2(playerX - drone.position.x, playerZ - drone.position.z);
      followerReady = true;
    }
    orb.position.y = reducedMotion ? 0 : Math.sin(time * 1.7) * .055;
    droneBody.position.y = reducedMotion ? 0 : Math.sin(time * 1.9 + .7) * .035;
    rotors.forEach((rotor, index) => { rotor.rotation.y = reducedMotion ? 0 : time * (index % 2 ? -17 : 17); });
    group.visible = active || unlocked;
    group.userData.rookieStats = { targets: active ? targets.length : 0, next: destination?.id || null,
      breadcrumbs: crumbs.count, companion: companion.visible, courier: drone.visible, restoredBeacon: restored.visible,
      companionPosition: companion.visible ? { x: companion.position.x, y: companion.position.y, z: companion.position.z } : null,
      courierPosition: drone.visible ? { x: drone.position.x, y: drone.position.y, z: drone.position.z } : null,
      labels: labels.size, targetLimit: 6, breadcrumbLimit: 22, paused: !!paused, reducedMotion: !!reducedMotion };
  }
  function dispose() {
    if (disposed) return; disposed = true;
    [...labels].forEach(releaseLabel); group.removeFromParent(); crumbs.dispose();
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
    geometries.clear(); materials.clear();
  }
  group.visible = false;
  return { update, dispose, group };
}
