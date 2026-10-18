import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { createCityAudio } from './ascension-audio.js';

// Original CyberWorld environment with a credited Quaternius character rig.
// Every terminal and packet is fictional game state.
// This engine replaces only the public Ascension renderer; legacy worlds survive.
(() => {
  'use strict';
  if (window.__cwWorld3D) return;
  window.__cwWorld3D = true;
  const C = { cyan: 0x48ffd5, blue: 0x49bfff, amber: 0xffbe65, violet: 0xb797ff, pink: 0xff6f9d };
  const state = {
    view: 'plaza', district: null, open: false, width: innerWidth, height: innerHeight,
    position: new THREE.Vector3(0, 0, 10), destination: new THREE.Vector3(0, 0, 10),
    movement: new THREE.Vector2(), keys: new Set(), facing: 0, moving: false, waypoints: [],
    overclock: false, reducedMotion: false, motionPreference: false, focus: null,
    time: 0, phase: 0, last: 0, orbit: 0.25, distance: 9.5, orbiting: false, quality: 'high', fps: 60,
    graphics: { resolution: 1.6, shadows: true, effects: true, shadowSize: 2048 },
  };
  let renderer, scene, camera, root, canvas, world, actor, context, frameId, composer;
  let city, room, floor, rain, clockQuery, sceneLight, sun;
  const obstacles = [], targets = [], peers = new Map(), animated = [], paths = [];
  const pickables = [], walkableMeshes = [], playerPos = new THREE.Vector3();
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const cameraRay = new THREE.Ray(), cameraBox = new THREE.Box3();
  const cameraFocus = new THREE.Vector3(), cameraHit = new THREE.Vector3(), cameraDirection = new THREE.Vector3();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const materials = new Map();
  const worldLabels = new Set(), labelPosition = new THREE.Vector3();
  const fieldSites = [
    { id: 'field-uplink', title: 'FREIGHT UPLINK', x: -6, z: -17, color: C.amber, description: 'The Last Mile: inspect the freight transmitter before changing its shared route.' },
    { id: 'field-backup', title: 'FALLBACK RELAY', x: -28, z: -6, color: C.blue, description: 'The Last Mile: verify an independent fallback in Service Alley 03.' },
    { id: 'field-clinic', title: 'CLINIC SUPPLY', x: 10, z: 3, color: C.cyan, description: 'The Last Mile: inspect the held medical delivery and its clean supply route.' },
    { id: 'field-switch', title: 'ROUTE SWITCH', x: -12, z: 1, color: C.violet, description: 'The Last Mile: preserve evidence, contain the freight uplink and restore clinic deliveries.' },
  ];
  const fieldSampleIds = new Set(fieldSites.map(site => site.id));
  let fieldState = { phase: 'available', samples: [], route: null, steps: [], feedback: '' }, fieldWorld = null;
  const cityAudio = createCityAudio();
  function setSoundEnabled(on) { return cityAudio.setEnabled(on); }
  function cue(frequency = 440) { cityAudio.cue(frequency); }
  const characterURL = new URL('assets/cyberworld/models/Character.glb', document.currentScript?.src || document.baseURI).href;
  const characterAgents = new Set(), rigGeometries = new Set();
  let characterPromise, characterTemplate, characterStatus = 'unrequested';
  const shared = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 16, 12),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 20),
    plane: new THREE.PlaneGeometry(1, 1),
    capsule: new THREE.CapsuleGeometry(1, 1, 4, 12),
  };
  function material(color, glow = false, extra = {}) {
    const key = JSON.stringify([color, glow, extra]);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.58,
      metalness: 0.42, ...(glow ? { emissive: color, emissiveIntensity: .42, roughness: 0.24 } : {}), ...extra }));
    return materials.get(key);
  }
  function box(parent, x, y, z, w, h, d, color, glow = false, extra = {}) {
    const mesh = new THREE.Mesh(shared.box, material(color, glow, extra));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = !glow; mesh.receiveShadow = !glow; parent.add(mesh); return mesh;
  }
  function cylinder(parent, x, y, z, radius, height, color, glow = false) {
    const mesh = new THREE.Mesh(shared.cylinder, material(color, glow));
    mesh.position.set(x, y, z); mesh.scale.set(radius, height, radius);
    mesh.castShadow = !glow; mesh.receiveShadow = !glow; parent.add(mesh); return mesh;
  }
  function ring(parent, x, y, z, radius, color, width = 0.045) {
    const geometry = new THREE.TorusGeometry(radius, width, 6, 64);
    const mesh = new THREE.Mesh(geometry, material(color, true)); mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function textSprite(text, color = '#d9f8ff', scale = 3.2, background = true) {
    const image = document.createElement('canvas'); image.width = 768; image.height = 160;
    const ctx = image.getContext('2d');
    if (background) { ctx.fillStyle = 'rgba(3,12,23,.86)'; ctx.fillRect(0, 20, 768, 120);
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(2, 22, 764, 116); }
    ctx.font = '600 46px monospace'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 384, 82, 720);
    const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
    const sprite = new THREE.Sprite(mat); sprite.scale.set(scale, scale * 160 / 768, 1);
    sprite.userData.labelSize = { width: scale, height: scale * 160 / 768 };
    worldLabels.add(sprite); return sprite;
  }
  function point(parent, x, y, z, color, intensity = 8, distance = 12) {
    const light = new THREE.PointLight(color, intensity, distance, 2); light.position.set(x, y, z); parent.add(light); return light;
  }
  function markTarget(parent, id, title, action, x, z, color, description) {
    const marker = new THREE.Group(); marker.position.set(x, 0, z); parent.add(marker);
    cylinder(marker, 0, 0.13, 0, 0.7, 0.18, 0x152831);
    ring(marker, 0, 0.24, 0, 0.8, color);
    const sign = textSprite(title, '#' + color.toString(16).padStart(6, '0'), 3.4);
    sign.position.set(0, 3.1, 0); marker.add(sign);
    marker.userData.target = { id, title, action, description, x, z, mesh: marker };
    targets.push(marker.userData.target); pickables.push(marker);
    return marker;
  }
  function collision(x, z, halfX, halfZ, height=2) { obstacles.push({ x, z, halfX, halfZ, height }); }
  function elevation(x,z) {
    if(state.district)return 0;
    if(x>=11.4&&x<=14.6&&z>=12&&z<=23)return (z-12)/11*4.2;
    if(x>=11.4&&x<=23&&z>=23&&z<=31)return 4.2;
    return 0;
  }
  function batchStaticMeshes(parent) {
    // Keep authored detail while collapsing repeated static meshes into draw calls.
    // Characters, transit, interaction markers and sprites stay individually live.
    parent.updateMatrixWorld(true);
    const groups = new Map(), sharedGeometry = new Set(Object.values(shared));
    const inverse = parent.matrixWorld.clone().invert();
    parent.traverse(mesh => {
      if (!mesh.isMesh || mesh.isInstancedMesh || !sharedGeometry.has(mesh.geometry)) return;
      let ancestor = mesh.parent;
      while (ancestor && ancestor !== parent) {
        if (ancestor.userData.parts || ancestor.userData.dynamic || ancestor.userData.target) return;
        ancestor = ancestor.parent;
      }
      const key = mesh.geometry.uuid + ':' + mesh.material.uuid;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ mesh, matrix: new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld) });
    });
    groups.forEach(items => {
      if (items.length < 3) return;
      const sample = items[0].mesh, batch = new THREE.InstancedMesh(sample.geometry, sample.material, items.length);
      items.forEach((item, index) => { batch.setMatrixAt(index, item.matrix); item.mesh.removeFromParent(); });
      batch.castShadow = sample.castShadow; batch.receiveShadow = sample.receiveShadow;
      batch.computeBoundingSphere(); parent.add(batch);
    });
  }
  function collides(x, z) {
    const limit = state.district ? 10.7 : 48;
    if (Math.abs(x) > limit || Math.abs(z) > limit) return true;
    if(Math.abs(elevation(x,z)-state.position.y)>.65)return true;
    return obstacles.some(o => Math.abs(x - o.x) < o.halfX + 0.35 && Math.abs(z - o.z) < o.halfZ + 0.35);
  }

  function building(parent, x, z, width, depth, height, accent, label, interactive = false) {
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    box(group, 0, height / 2, 0, width, height, depth, 0x101c2d);
    box(group, -width * 0.35, height * 0.52, 0, width * 0.22, height * 1.07, depth * 1.04, 0x17283c);
    box(group, 0, 0.3, 0, width + 0.8, 0.6, depth + 0.8, 0x23323e);
    box(group, 0, height + 0.18, 0, width + 0.4, 0.36, depth + 0.4, 0x2a3b4b);
    box(group, -width / 2 + 0.12, height / 2, depth / 2 + 0.02, 0.12, height, 0.08, accent, true);
    box(group, width / 2 - 0.12, height / 2, depth / 2 + 0.02, 0.12, height, 0.08, accent, true);
    // Batched facade windows keep skyline draw calls bounded.
    const columns = Math.max(2, Math.floor(width / 1.25)), rows = Math.max(2, Math.floor((height - 2) / 1.5));
    const count = columns * rows, panes = new THREE.InstancedMesh(shared.box, material(accent, true, { emissiveIntensity: 0.62 }), count);
    const transform = new THREE.Object3D();
    for (let row = 0, i = 0; row < rows; row++) for (let col = 0; col < columns; col++, i++) {
      transform.position.set(-width * .4 + col * width * .8 / Math.max(1, columns - 1), 2.3 + row * (height - 3.1) / Math.max(1, rows - 1), depth / 2 + .04);
      transform.scale.set(.46, .65, .04); transform.updateMatrix(); panes.setMatrixAt(i, transform.matrix);
      panes.setColorAt(i, new THREE.Color().setHex((i * 13 + row) % 5 === 0 ? 0x15232d : accent));
    }
    group.add(panes);
    box(group, 0, height + 0.6, 0, 2.4, 0.8, 2.2, 0x35414a);
    for (let i = 0; i < 3; i++) box(group, -1 + i * .6, height + 1.05, -.3, .08, .18, 1.3, 0x080f18);
    cylinder(group, width * .32, height + 1.6, -.6, .06, 3.0, 0x566879);
    cylinder(group, width * .32, height + 3.15, -.6, .12, .14, accent, true);
    // Service risers and canopy make the reachable building facades tactile.
    box(group, width * .49, 2.2, depth * .18, .18, 4.4, .18, 0x52616a);
    box(group, width * .49, .7, depth * .34, .55, .18, depth * .45, 0x52616a);
    if (interactive) {
      box(group, 0, 1.7, depth / 2 + .12, 2.8, 3.2, .18, 0x030a16);
      box(group, -1.38, 1.8, depth / 2 + .2, .09, 3.5, .09, accent, true);
      box(group, 1.38, 1.8, depth / 2 + .2, .09, 3.5, .09, accent, true);
      box(group, 0, 3.5, depth / 2 + .2, 2.9, .1, .1, accent, true);
      box(group, 0, 3.8, depth / 2 + 1.1, width * .75, .22, 2.5, 0x2c3545);
      box(group, 0, 3.66, depth / 2 + 2.25, width * .75, .06, .1, accent, true);
      const sign = textSprite(label, '#' + accent.toString(16).padStart(6, '0'), width * .82);
      sign.position.set(0, 5.1, depth / 2 + .5); group.add(sign);
    }
    collision(x, z, width / 2, depth / 2, height);
    return group;
  }

  function makeProceduralAgent(color = C.cyan, skin = 0xb47c61, frame = 'sentinel') {
    const group = new THREE.Group(), parts = {};
    const coat = frame === 'ghost' ? 0x10131f : 0x172538;
    function rounded(parent, x, y, z, w, h, d, surface, glow = false) {
      const mesh = new THREE.Mesh(shared.capsule, material(surface, glow, glow ? { emissiveIntensity: .85 } : {}));
      mesh.position.set(x,y,z); mesh.scale.set(w/2,h/3,d/2); parent.add(mesh); return mesh;
    }
    function ellipsoid(parent,x,y,z,w,h,d,surface,glow=false) {
      const mesh=new THREE.Mesh(shared.sphere,material(surface,glow));mesh.position.set(x,y,z);mesh.scale.set(w/2,h/2,d/2);parent.add(mesh);return mesh;
    }
    // Rounded tailored torso, shoulder pads and articulated limbs are original
    // stylized characters rather than a block/voxel silhouette.
    rounded(group,0,1.30,0,.73,.98,.44,coat);
    rounded(group,0,.98,-.03,.77,.44,.48,0x111b2b);
    rounded(group,0,1.58,.22,.5,.10,.06,color,true);
    rounded(group,-.245,1.20,.225,.045,.62,.045,color,true);
    rounded(group,.245,1.20,.225,.045,.62,.045,color,true);
    ellipsoid(group,.12,1.31,.252,.12,.12,.045,color,true);
    cylinder(group,0,1.79,0,.11,.17,skin);
    ellipsoid(group,0,1.99,.005,.35,.38,.33,skin);
    const hairColor=frame==='tinker'?0xabb9b8:frame==='runner'?0x462b2a:frame==='ghost'?0x17212d:0x291c1a;
    ellipsoid(group,0,2.145,-.025,.38,.15,.35,hairColor);
    ellipsoid(group,-.18,2.005,0,.045,.1,.08,skin);ellipsoid(group,.18,2.005,0,.045,.1,.08,skin);
    ellipsoid(group,0,1.982,.174,.07,.09,.065,skin);
    rounded(group,0,1.914,.164,.105,.023,.018,0x5a342e);
    if(frame==='ghost'||frame==='sentinel'){
      const visorGeometry=new THREE.SphereGeometry(1,18,8,0,Math.PI,Math.PI*.37,Math.PI*.15);
      const visor=new THREE.Mesh(visorGeometry,material(color,true,{emissiveIntensity:.28,metalness:.7,roughness:.15}));
      visor.position.set(0,2.035,.015);visor.scale.set(.19,.18,.175);group.add(visor);
    }else{
      for(const side of [-1,1])ellipsoid(group,side*.069,2.036,.166,.035,.027,.02,0x15212a);
    }
    for (const [name, side] of [['left', -1], ['right', 1]]) {
      const arm = new THREE.Group(); arm.position.set(side * .45, 1.59, 0); group.add(arm);
      ellipsoid(arm,0,-.03,0,.27,.24,.29,coat);
      rounded(arm,0,-.32,0,.235,.72,.26,coat);
      ellipsoid(arm,0,-.57,.015,.22,.18,.25,coat);
      rounded(arm,0,-.72,.025,.18,.22,.22,0x111b25);
      rounded(arm,0,-.17,.145,.14,.07,.03,color,true);
      const leg = new THREE.Group(); leg.position.set(side * .2, .86, 0); group.add(leg);
      rounded(leg,0,-.32,0,.27,.69,.30,0x0d1725);
      ellipsoid(leg,0,-.35,.15,.22,.20,.06,0x15202d);
      ellipsoid(leg,0,-.74,.085,.32,.23,.48,0x222f3b);
      ellipsoid(leg,0,-.80,.13,.32,.07,.40,0x090f19);
      parts[name + 'Arm'] = arm; parts[name + 'Leg'] = leg;
    }
    rounded(group,0,1.31,-.28,.46,.57,.23,0x27374a);
    box(group, 0, 1.35, -.395, .29, .06, .025, color, true);
    if(frame==='ghost'){
      const skirt=new THREE.Mesh(new THREE.CylinderGeometry(.3,.43,.66,12),material(0x111823));skirt.position.set(0,.87,-.04);skirt.scale.z=.7;group.add(skirt);
    }else if(frame==='tinker'){
      rounded(group,0,1.35,-.40,.64,.74,.36,0x46525c);rounded(group,.41,.99,.08,.22,.35,.25,0x8e6545);
      ellipsoid(group,-.08,2.18,0,.34,.08,.29,0x64747b);
    }else if(frame==='runner'){
      rounded(group,.37,.93,.08,.29,.42,.30,0x695142);const strap=box(group,0,1.36,.237,.065,.77,.025,0x65524e);strap.rotation.z=-.38;
    }
    const halo = ring(group, 0, .035, 0, .56, color, .016); halo.material = material(color, true, { emissiveIntensity: .26 });
    group.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = true; });
    group.userData.parts = parts; group.userData.walk = 0; return group;
  }
  function attachCharacterRig(agent) {
    if (!characterTemplate || agent.userData.disposed || agent.userData.rig) return;
    const rig = cloneSkeleton(characterTemplate.scene), config = agent.userData.character;
    const accent = new THREE.Color(config.color), jacket = accent.clone().lerp(new THREE.Color(0x18283d),.70);
    const shadow = jacket.clone().multiplyScalar(.52), pants = new THREE.Color(0x101924);
    const palette = { Material:jacket, Main:jacket, Accent:accent, Accent_Dark:shadow, Black:pants, Blade:new THREE.Color(0x889da6), Blade_Edge:accent };
    rig.traverse(node => {
      // The kit includes a sword attachment; field operatives carry a CyberDeck
      // in this game. Do not show a weapon merely because it exists in the kit.
      if (node.name === 'Sword') node.visible = false;
      if (!node.isMesh) return;
      node.frustumCulled = false;
      node.castShadow = agent.userData.castCharacterShadow;
      node.receiveShadow = true;
      const recolor = original => {
        const surface = original.clone();
        if (palette[surface.name] && surface.color) surface.color.copy(palette[surface.name]);
        surface.roughness = .72; surface.metalness = .12;
        if (surface.name === 'Accent' && surface.emissive) { surface.emissive.copy(accent); surface.emissiveIntensity=.10; }
        return surface;
      };
      node.material = Array.isArray(node.material) ? node.material.map(recolor) : recolor(node.material);
    });
    const mixer = new THREE.AnimationMixer(rig), actions = {};
    ['Idle_Neutral','Walk','Run','Interact','Wave'].forEach(name => {
      const clip = THREE.AnimationClip.findByName(characterTemplate.animations,name);
      if (clip) actions[name] = mixer.clipAction(clip);
    });
    actions.Idle_Neutral?.play(); mixer.update(0);
    function visibleBounds() {
      rig.updateMatrixWorld(true);
      rig.traverseVisible(node=>{if(node.isSkinnedMesh)node.skeleton.update();});
      const bounds = new THREE.Box3();
      // setFromObject(root) includes invisible attachments and cached bind-pose
      // bounds. Normalize the visible, posed vertices only, so the feet contact
      // the actual floor instead of floating above a hidden sword's bounds.
      rig.traverseVisible(node=>{if(node.isMesh)bounds.union(new THREE.Box3().setFromObject(node,true));});
      return bounds;
    }
    const bounds = visibleBounds(), size = bounds.getSize(new THREE.Vector3());
    rig.scale.multiplyScalar(2.17 / Math.max(.01,size.y));
    const aligned = visibleBounds(), center = aligned.getCenter(new THREE.Vector3());
    rig.position.x -= center.x; rig.position.y -= aligned.min.y; rig.position.z -= center.z;
    agent.userData.rig = { root:rig,mixer,actions,current:actions.Idle_Neutral,name:'Idle_Neutral' };
    if (agent.userData.fallback) { agent.remove(agent.userData.fallback); releaseGroup(agent.userData.fallback); agent.userData.fallback=null; }
    agent.add(rig);
  }
  function loadCharacterRig() {
    if (characterPromise) return characterPromise;
    characterStatus = 'loading';
    characterPromise = new GLTFLoader().loadAsync(characterURL).then(gltf => {
      characterTemplate = gltf; characterStatus = 'ready';
      gltf.scene.traverse(node => { if(node.isMesh)rigGeometries.add(node.geometry); });
      characterAgents.forEach(attachCharacterRig); return gltf;
    }).catch(() => { characterStatus = 'fallback'; return null; });
    return characterPromise;
  }
  function makeAgent(color = C.cyan, skin = 0xb47c61, frame = 'sentinel') {
    const group = new THREE.Group();
    group.userData.character={color,skin,frame}; group.userData.castCharacterShadow=true;
    group.userData.walk=0; group.userData.fallback=makeProceduralAgent(color,skin,frame);
    group.add(group.userData.fallback); characterAgents.add(group);
    if (characterTemplate) attachCharacterRig(group); else loadCharacterRig();
    return group;
  }
  function gait(agent, moving, dt, running = false) {
    if (!agent) return;
    const rig = agent.userData.rig;
    if (rig) {
      const name = moving ? (running && rig.actions.Run ? 'Run' : 'Walk') : 'Idle_Neutral';
      const next = rig.actions[name] || rig.actions.Idle_Neutral;
      if(next && rig.current!==next) { rig.current?.fadeOut(.18); next.reset().fadeIn(.18).play(); rig.current=next; rig.name=name; }
      if (!state.reducedMotion) rig.mixer.update(dt);
      agent.position.y=agent.userData.groundY||0; return;
    }
    if (agent.userData.fallback) {
      agent.position.y=agent.userData.groundY||0; gait(agent.userData.fallback,moving,dt,running); return;
    }
    if (!state.reducedMotion) agent.userData.walk += dt * (moving ? 10 : 1);
    const phase = agent.userData.walk, swing = moving && !state.reducedMotion ? Math.sin(phase) * .55 : 0;
    const p = agent.userData.parts;
    p.leftArm.rotation.x = swing; p.rightArm.rotation.x = -swing;
    p.leftLeg.rotation.x = -swing; p.rightLeg.rotation.x = swing;
    agent.position.y = (agent.userData.groundY||0)+(!state.reducedMotion && moving ? Math.abs(Math.sin(phase)) * .035 : 0);
  }
  function npc(parent, id, title, action, x, z, color, description) {
    const styles={zero:['ghost',0x9d6b55],cipher:['tinker',0xcf9a77],byte:['runner',0x9b735e],lyra:['tinker',0x715247],patch:['runner',0xc59370],nova:['sentinel',0x9a6b55]};
    const style=styles[id]||['sentinel',0xc59370];
    const agent = makeAgent(color,style[1],style[0]);
    agent.scale.setScalar(id==='zero'?1.08:id==='lyra'?.94:id==='byte'?.96:1);
    agent.userData.castCharacterShadow=false;
    agent.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=false;});
    agent.position.set(x, 0, z); parent.add(agent);
    const label = textSprite(title, '#' + color.toString(16).padStart(6, '0'), 2.5); label.position.set(0, 2.75, 0); agent.add(label);
    agent.userData.target = { id, title, action, description, x, z, mesh: agent };
    targets.push(agent.userData.target); pickables.push(agent); animated.push(agent); return agent;
  }

  function authorStreet(parent) {
    // An authored second pedestrian street, service alley and accessible roof
    // give the district destinations and routes beyond the central arrival ring.
    box(parent,0,.012,18,40,.018,6,0x101b28);
    for(let x=-18;x<=18;x+=3){box(parent,x,.028,18,.8,.018,.09,C.amber,true,{emissiveIntensity:.4});}
    for(let i=0;i<5;i++){
      const x=-8+i*4.2,z=-27.2,col=[C.amber,C.pink,C.blue,C.violet,C.cyan][i];
      const shop=new THREE.Group();shop.position.set(x,0,z);parent.add(shop);
      box(shop,0,1.9,0,3.9,3.8,3.6,0x283343);
      box(shop,0,1.55,1.83,3.5,2.6,.08,0x07121d);
      for(let panel=0;panel<3;panel++){box(shop,-1.1+panel*1.1,1.5,1.9,.94,2.2,.035,0x254957,false,{roughness:.13,metalness:.85});box(shop,-1.64+panel*1.1,1.6,1.96,.04,2.7,.04,col,true);}
      const awning=box(shop,0,3.2,2.3,4.0,.12,1.4,0x1b263b);awning.rotation.x=.12;
      box(shop,0,3.1,3.0,4,.08,.1,col,true);
      const labels=['NIGHT SHIFT / REPAIRS','TRACELESS / TEA','OPEN CIRCUIT','MEMORY EXCHANGE','ROUTE RECORDS'];
      const label=textSprite(labels[i],'#'+col.toString(16).padStart(6,'0'),3.9);label.position.set(0,4.05,1.9);shop.add(label);
      for(let vent=0;vent<3;vent++)box(shop,-1+vent,4.08,0,.7,.35,1.2,0x4b5662);
      collision(x,z,1.95,1.8);
    }
    // Loading alley: freight, exposed services and an illuminated maintenance route.
    box(parent,-28,.025,1,.1,.025,32,C.violet,true,{emissiveIntensity:.3});
    for(let i=0;i<6;i++){
      const z=-12+i*4.8;
      box(parent,-31,.12,z,2.4,.24,2.2,0x293b42);
      box(parent,-31, .72,z,1.8,1.1,1.6,0x53544e);
      box(parent,-31,1.31,z,1.7,.08,1.5,0x273243);
      box(parent,-31.94,.72,z,.04,1.05,1.65,C.amber,true,{emissiveIntensity:.18});
      collision(-31,z,1.2,1.1);
    }
    for(let i=0;i<3;i++){
      const cableCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-23,7.2,-16+i*8),new THREE.Vector3(-30,5,-11+i*8),new THREE.Vector3(-37,7.8,-16+i*8));
      const tube=new THREE.Mesh(new THREE.TubeGeometry(cableCurve,24,.035,5,false),material(i===1?C.violet:0x354957,i===1));parent.add(tube);
    }
    const alleyLabel=textSprite('SERVICE 03 / KEEP THE CLEAN ROUTE','#9caed0',5.2);alleyLabel.position.set(-28,5,-14);parent.add(alleyLabel);
    const rampLength=Math.hypot(11,4.2);
    const ramp=new THREE.Mesh(new THREE.BoxGeometry(3.2,.18,rampLength),material(0x394b59));
    ramp.position.set(13,2.1,17.5);ramp.rotation.x=-Math.atan2(4.2,11);ramp.receiveShadow=true;ramp.castShadow=true;parent.add(ramp);walkableMeshes.push(ramp);
    const rampSign = textSprite('ROOFTOP ACCESS / FOLLOW AMBER', '#ffbe65', 3.5);
    rampSign.position.set(13,2.9,10.8); parent.add(rampSign);
    for (let step=0;step<9;step++) {
      const z=12.25+step*1.15, y=(z-12)/11*4.2+.11;
      const left=box(parent,12.84,y,z,.42,.022,.075,C.amber,true,{emissiveIntensity:.35});left.rotation.y=-.58;
      const right=box(parent,13.16,y,z,.42,.022,.075,C.amber,true,{emissiveIntensity:.35});right.rotation.y=.58;
    }
    for(const x of [11.45,14.55]){
      const rail=box(parent,x,3.0,17.5,.07,.07,rampLength,0x82919c);rail.rotation.x=-Math.atan2(4.2,11);
      for(let step=0;step<6;step++)cylinder(parent,x,(step/5*4.2)/2+.5,12+step/5*11,.035,step/5*4.2+1,0x607d8a);
    }
    const terrace=new THREE.Mesh(new THREE.BoxGeometry(11.6,.25,8),material(0x2d3c4d));terrace.position.set(17.2,4.05,27);terrace.receiveShadow=true;terrace.castShadow=true;parent.add(terrace);walkableMeshes.push(terrace);
    for(const x of [11.7,22.7])for(const z of [23.5,30.5])cylinder(parent,x,2,z,.18,4,0x3c5361);
    for(const z of [23,31])box(parent,18,4.8,z,9.8,.075,.075,0x7b8e9d);
    box(parent,23,4.8,27,.075,.075,8,0x7b8e9d);
    for(let i=0;i<6;i++){const z=23+i*1.6;cylinder(parent,23,4.55,z,.045,1,0x728795);box(parent,23,4.26,z,.08,.04,.8,C.violet,true);}
    const dishMount=new THREE.Group();dishMount.position.set(20,4.2,27);parent.add(dishMount);
    cylinder(dishMount,0,1.2,0,.085,2.4,0x536c7a);
    const dish=new THREE.Mesh(new THREE.SphereGeometry(1.2,20,10,0,Math.PI*2,0,Math.PI*.42),material(0x526473,false,{side:THREE.DoubleSide,metalness:.75}));dish.position.set(0,2.1,0);dish.rotation.z=.6;dish.rotation.x=-.4;dishMount.add(dish);
    const signal=markTarget(parent,'roof-signal','ROOFTOP / UNCLAIMED SIGNAL','studio:secret',17,27,C.violet,'A maintenance relay is repeating a signal nobody claimed.');signal.position.y=4.2;signal.userData.target.y=4.2;
    markTarget(parent,'trace-one','TRACE 01 / FREIGHT CROSSING','studio:beacon',-4,12,C.cyan,'A physical signal beacon. Interact to record its local evidence.');
    markTarget(parent,'trace-two','TRACE 02 / SERVICE ALLEY','studio:beacon',-28,-2,C.cyan,'A physical signal beacon. Interact to record its local evidence.');
    const roofBeacon=markTarget(parent,'trace-three','TRACE 03 / ROOFTOP RELAY','studio:beacon',21,29,C.cyan,'A physical signal beacon. Interact to record its local evidence.');roofBeacon.position.y=4.2;roofBeacon.userData.target.y=4.2;
    npc(parent,'lyra','LYRA / FABRICATION','studio:vendor',7.5,17,C.amber,'Inspect locally crafted modules and hardware tradeoffs.');
    npc(parent,'patch','PATCH / FIELDCRAFT','studio:trainer',-9.5,14,C.blue,'Train evidence discipline before the next operation.');
    const crew=[
      {name:'Mara / courier',color:C.amber,route:[[-7,7],[-7,13],[2,15],[7,10],[7,4]]},
      {name:'Ivo / night shift',color:C.violet,route:[[8,-4],[8,-8],[2,-8],[-7,-8],[-8,-3]]},
      {name:'Sena / systems',color:C.blue,route:[[-5,9],[-12,10],[-14,5],[-9,1],[-6,4]]},
      {name:'Kiran / telemetry',color:C.cyan,route:[[9,8],[13,8],[15,12],[8,14],[4,10]]},
    ];
    crew.forEach((config,index)=>{
      const mesh=makeAgent(config.color,0x9c7059,index%2?'ghost':'sentinel');mesh.position.set(config.route[0][0],0,config.route[0][1]);parent.add(mesh);
      const name=textSprite('CITIZEN / '+config.name,'#9eb7c7',2.4);name.position.y=2.7;mesh.add(name);
      animated.push({type:'crowd',mesh,route:config.route,segment:1,wait:index*2,speed:.8+index*.12});
    });
  }
  function updateCrowd(item,dt) {
    if(state.reducedMotion)return;
    if(item.wait>0){item.wait-=dt;gait(item.mesh,false,dt);return;}
    const waypoint=item.route[item.segment],dx=waypoint[0]-item.mesh.position.x,dz=waypoint[1]-item.mesh.position.z,distance=Math.hypot(dx,dz);
    if(distance<.15){item.segment=(item.segment+1)%item.route.length;item.wait=2.5+item.segment*1.1;gait(item.mesh,false,dt);return;}
    const step=Math.min(distance,item.speed*dt);item.mesh.position.x+=dx/distance*step;item.mesh.position.z+=dz/distance*step;item.mesh.rotation.y=Math.atan2(dx,dz);gait(item.mesh,true,dt);
  }

  function fieldLabel(previous, text, color, parent, y, width = 3.5) {
    if (previous?.userData.fieldText === text) return previous;
    if (previous) { previous.removeFromParent(); worldLabels.delete(previous); previous.material.map.dispose(); previous.material.dispose(); }
    const label = textSprite(text, color, width); label.userData.fieldText = text;
    label.position.y = y; parent.add(label); return label;
  }
  function normaliseField(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      phase: ['available','survey','routing','complete'].includes(source.phase) ? source.phase : 'available',
      samples: Array.isArray(source.samples) ? [...new Set(source.samples.filter(id => fieldSampleIds.has(id)))] : [],
      route: source.route === 'fallback' ? 'fallback' : null,
      steps: Array.isArray(source.steps) ? [...new Set(source.steps.filter(step => ['snapshot','isolate','restore','verify'].includes(step)))] : [],
      feedback: typeof source.feedback === 'string' ? source.feedback.slice(0, 240) : '',
    };
  }
  function setFieldState(value) {
    fieldState = normaliseField(value);
    if (!fieldWorld) return;
    const complete = fieldState.phase === 'complete', isolated = fieldState.steps.includes('isolate');
    const fallback = fieldState.route === 'fallback', restored = fieldState.steps.includes('restore');
    fieldWorld.terminals.forEach((terminal, id) => {
      const sampled = fieldState.samples.includes(id);
      const color = complete || sampled ? '#77f5ad' : '#' + terminal.site.color.toString(16).padStart(6, '0');
      terminal.lamp.material.color.set(color); terminal.lamp.material.emissive.set(color);
      const status = id === 'field-uplink' ? (isolated ? 'FREIGHT / CONTAINED' : 'FREIGHT / SHARED ROUTE')
        : id === 'field-backup' ? (fallback ? 'FALLBACK / CONNECTED' : 'FALLBACK / INDEPENDENT')
        : id === 'field-clinic' ? (complete ? 'CLINIC / DELIVERIES LIVE' : 'CLINIC / DELIVERY HELD')
        : complete ? 'LAST MILE / RECOVERED' : fieldState.steps.includes('snapshot') ? 'ROUTE / EVIDENCE SAVED' : 'LAST MILE / INSPECT';
      terminal.label = fieldLabel(terminal.label, status, color, terminal.marker, terminal.labelHeight, 3.65);
      terminal.marker.userData.target.description = complete ? 'The Last Mile is recovered. Inspect the evidence and claim your field reward.' : terminal.site.description;
    });
    fieldWorld.links.forEach(link => {
      const active = link.kind === 'freight' ? !isolated : link.kind === 'fallback' ? fallback : restored;
      const color = link.kind === 'clinic' && restored ? 0x77f5ad : link.color;
      link.mesh.material.color.setHex(color); link.mesh.material.emissive.setHex(color);
      link.mesh.material.opacity = active ? .76 : .13;
      link.packet.material.color.setHex(color); link.packet.material.emissive.setHex(color);
      link.packet.visible = active && !state.reducedMotion;
      link.active = active;
    });
    fieldWorld.droneStatus = fieldLabel(fieldWorld.droneStatus, complete ? 'MEDICAL / EN ROUTE' : 'MEDICAL / HOLD', complete ? '#77f5ad' : '#ffbe65', fieldWorld.drone, 1.05, 2.6);
    if (!complete) { fieldWorld.drone.position.set(10,1.25,3); fieldWorld.drone.rotation.y=0; fieldWorld.segment=1; fieldWorld.moving=false; }
  }
  function authorFieldContract(parent) {
    const group = new THREE.Group(); group.userData.dynamic = true; parent.add(group);
    fieldWorld = { group, terminals: new Map(), links: [], drone: null, droneStatus: null, segment: 1, moving: false,
      droneRoute: [[10,3],[10,11],[5,14],[-5,14],[-7,8],[4,7],[10,3]] };
    fieldSites.forEach(site => {
      const marker = markTarget(group, site.id, site.title, 'studio:field', site.x, site.z, site.color, site.description);
      // Replace the generic marker sign with a compact stateful device label.
      const oldLabel = marker.children.find(child => child.isSprite);
      if (oldLabel) { oldLabel.removeFromParent(); worldLabels.delete(oldLabel); oldLabel.material.map.dispose(); oldLabel.material.dispose(); }
      if (site.id === 'field-uplink') {
        box(marker,0,.8,0,1.35,1.25,1.1,0x33424e); box(marker,0,1.5,0,1.55,.14,1.3,0x152330);
        for (const x of [-.46,.46]) { cylinder(marker,x,2.15,0,.055,2.9,0x84949d); for(let y=1.5;y<3.5;y+=.5)box(marker,0,y,0,.98,.035,.05,0x5b707b); }
        const dish = new THREE.Mesh(new THREE.SphereGeometry(.82,18,8,0,Math.PI*2,0,Math.PI*.43),material(0x8a9aa2,false,{side:THREE.DoubleSide,metalness:.8}));
        dish.position.set(0,3.35,0); dish.rotation.x=-.85; marker.add(dish);
        box(marker,0,1,-.58,.95,.58,.05,site.color,true); cylinder(marker,0,3.87,0,.055,.45,site.color,true);
      } else if (site.id === 'field-backup') {
        box(marker,0,.25,0,1.9,.2,1.2,0x566574);
        for(const x of [-.62,0,.62]) { cylinder(marker,x,1.12,0,.24,1.6,0x24394c); ring(marker,x,1.74,0,.25,site.color,.035); box(marker,x,.88,.26,.09,.6,.04,site.color,true); }
        box(marker,0,2.06,0,2.05,.15,1.2,0x162537);
        const panel=box(marker,0,2.48,-.12,2.05,.09,1.4,0x3b6d97);panel.rotation.x=-.4;
        for(const x of [-.65,0,.65]){const seam=box(marker,x,2.49,-.12,.025,.015,1.32,site.color,true);seam.rotation.x=-.4;}
        box(marker,.9,1.3,.44,.3,.7,.18,0x101d2b);box(marker,.9,1.4,.54,.18,.4,.025,site.color,true);
      } else if (site.id === 'field-clinic') {
        cylinder(marker,0,.28,0,1.06,.18,0x536774);ring(marker,0,.39,0,.95,site.color,.04);
        box(marker,0,.4,0,.77,.025,.2,0xc7e6e4,true);box(marker,0,.4,0,.2,.025,.77,0xc7e6e4,true);
        for(const x of [-1.08,1.08])cylinder(marker,x,1.35,-.85,.055,2.7,0x617e8d);
        box(marker,0,2.7,-.85,2.55,.17,.6,0x2e4a55);box(marker,0,2.78,-.85,.8,.025,.18,site.color,true);
        box(marker,-1.3,.58,-.1,.55,.82,.8,0xdae3dc);box(marker,-1.3,.65,.32,.32,.12,.025,site.color,true);box(marker,-1.3,.65,.32,.1,.36,.025,site.color,true);
      } else {
        cylinder(marker,0,.43,0,.7,.55,0x35414e);cylinder(marker,0,1.01,0,.24,.8,0x536b78);
        const desk=box(marker,0,1.46,0,1.95,.18,1.15,0x172d3e);desk.rotation.x=.15;
        for(let i=0;i<3;i++){const x=-.63+i*.63;box(marker,x,1.57,-.04,.43,.06,.65,[C.amber,C.blue,C.cyan][i],true);cylinder(marker,x,1.78,-.52,.065,.46,0x6e8293);}
        ring(marker,0,.18,0,1.08,site.color,.03);
      }
      const lamp=new THREE.Mesh(shared.sphere,material(site.color,true).clone());lamp.scale.setScalar(.11);lamp.position.set(.66,site.id==='field-uplink'?1.45:1.95,.5);marker.add(lamp);
      fieldWorld.terminals.set(site.id,{site,marker,lamp,label:null,labelHeight:site.id==='field-uplink'?4.5:3.3});
      collision(site.x,site.z,site.id==='field-clinic'?1.1:.9,site.id==='field-clinic'?1:.7,site.id==='field-uplink'?4:2.9);
      batchStaticMeshes(marker);
    });
    const createLink=(kind,points,color)=>{
      const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
      const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.025,4,false),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.8,transparent:true,opacity:.6,depthWrite:false}));group.add(mesh);
      const packet=new THREE.Mesh(shared.sphere,material(color,true).clone());packet.scale.setScalar(.11);group.add(packet);
      fieldWorld.links.push({kind,color,curve,mesh,packet,active:false});
    };
    createLink('freight',[[-6,2.7,-17],[-5,3,-9],[-8,2.3,-3],[-12,1.8,1]],C.amber);
    createLink('fallback',[[-28,2.1,-6],[-27,2.4,-3],[-24,2.8,0],[-18,2.5,1],[-12,1.8,1]],C.blue);
    // The clean route skirts the central monument instead of passing through it.
    createLink('clinic',[[-12,1.8,1],[-9,2.4,4],[-3,2.5,5],[4,2.4,5],[10,1.9,3]],C.amber);
    const drone=new THREE.Group();drone.userData.dynamic=true;drone.position.set(10,1.25,3);group.add(drone);fieldWorld.drone=drone;
    box(drone,0,0,0,.72,.22,.95,0xb9d3d5);box(drone,0,-.33,0,.66,.42,.73,0x263e50);
    box(drone,0,-.35,.38,.34,.1,.025,C.cyan,true);box(drone,0,-.35,.38,.1,.3,.025,C.cyan,true);
    for(const x of [-.66,.66])for(const z of [-.54,.54]){box(drone,x*.5,.02,z*.5,.72,.05,.07,0x6c8796);cylinder(drone,x,.12,z,.3,.035,0x132d3b);ring(drone,x,.16,z,.31,C.cyan,.018);}
    batchStaticMeshes(drone);
    animated.push({type:'field'});
    setFieldState(window.__cwCity?.state?.().field);
  }
  function updateFieldWorld(dt) {
    if (!fieldWorld) return;
    const complete=fieldState.phase==='complete', running=complete&&!state.reducedMotion&&!blocked()&&!document.hidden;
    fieldWorld.moving=running;
    const drone=fieldWorld.drone;
    if(running){
      const target=fieldWorld.droneRoute[fieldWorld.segment],dx=target[0]-drone.position.x,dz=target[1]-drone.position.z,distance=Math.hypot(dx,dz);
      if(distance<.12)fieldWorld.segment=(fieldWorld.segment+1)%fieldWorld.droneRoute.length;
      else {const stride=Math.min(distance,dt*2.3);drone.position.x+=dx/distance*stride;drone.position.z+=dz/distance*stride;drone.rotation.y=Math.atan2(dx,dz);}
      drone.position.y=THREE.MathUtils.damp(drone.position.y,2.75,2,dt)+Math.sin(state.time*2)*.0015;
    }
    fieldWorld.links.forEach((link,index)=>{link.packet.visible=link.active&&!state.reducedMotion;if(link.packet.visible)link.packet.position.copy(link.curve.getPoint((state.time*.18+index*.28)%1));});
  }
  document.addEventListener('cw:field-state',event=>setFieldState(event.detail));

  function makeCity() {
    city = new THREE.Group(); scene.add(city);
    floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material(0x14212c, false, { roughness: .38, metalness: .63 }));
    // The plaza inset has its own top at y=0. Keeping the large ground beneath
    // it prevents coplanar depth shimmer in the title's low aerial camera.
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.055; floor.receiveShadow = true; city.add(floor);
    walkableMeshes.push(floor);
    cylinder(city, 0, -.10, 0, 12.2, .2, 0x24333f);
    ring(city, 0, .025, 0, 11.5, C.cyan, .027); ring(city, 0, .026, 0, 10.85, C.violet, .014);
    cylinder(city, 0, .12, 0, 2.6, .24, 0x131f2d); ring(city, 0, .265, 0, 2.3, C.amber);
    collision(0,0,2.4,2.4);
    const core = new THREE.Group(); city.add(core); core.position.y = 2.7;
    const octa = new THREE.Mesh(new THREE.OctahedronGeometry(.82, 0), material(C.cyan, true, { wireframe: true, emissiveIntensity: 2 })); core.add(octa);
    const solid = new THREE.Mesh(new THREE.OctahedronGeometry(.5, 0), material(0x3acfb8, false, { metalness: .9, roughness: .1 })); core.add(solid);
    animated.push({ core, type: 'core' });
    point(city, 0, 3, 0, C.cyan, 6, 14);
    for (let i = -4; i <= 4; i++) {
      box(city, i * 4, .016, 0, .025, .012, 92, 0x34606a, true, { emissiveIntensity: .13 });
      box(city, 0, .018, i * 4, 92, .012, .025, 0x34606a, true, { emissiveIntensity: .13 });
    }
    for (let i = 0; i < 32; i++) {
      const angle = i / 32 * Math.PI * 2, r = 11.9;
      box(city, Math.sin(angle) * r, .035, Math.cos(angle) * r, .12, .04, .55, i % 4 ? C.cyan : C.amber, true);
    }
    const facilities = [
      ['soc', 'SOC TOWER', -17, -16, 11, 9, 17, C.cyan],
      ['academy', 'CIPHER ACADEMY', 15, -16, 12, 9, 12, C.violet],
      ['lab', 'OPERATIVE LAB', 21, 7, 9, 7, 8, C.amber],
      ['net', 'NET CAFE', -22, 8, 10, 7, 9, C.pink],
    ];
    facilities.forEach(([id, title, x, z, w, d, h, color]) => {
      building(city, x, z, w, d, h, color, title, true);
      markTarget(city, id, title, 'district:' + id, x, z + d / 2 + 2.8, color, 'Enter ' + title.toLowerCase() + '.');
      for (let s = -1; s <= 1; s += 2) {
        cylinder(city, x + s * w * .5, .4, z + d / 2 + 2, .18, .8, 0x49535a);
        cylinder(city, x + s * w * .5, .85, z + d / 2 + 2, .19, .1, color, true);
      }
    });
    const skyline = [[-38,-29,10,12,29],[0,-37,11,10,34],[32,-29,12,13,25],[-42,0,9,12,23],[40,0,9,10,31],[-34,32,12,10,20],[0,40,12,10,27],[33,33,10,12,24],[-20,-41,8,8,21],[19,-41,9,8,39],[-44,22,8,10,25],[44,23,8,9,19]];
    skyline.forEach((b, i) => building(city, b[0], b[1], b[2], b[3], b[4], [C.blue,C.violet,C.amber][i%3], '', false));
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5, x = Math.sin(angle) * 14, z = Math.cos(angle) * 14;
      if(z>9)continue;
      cylinder(city, x, 1.9, z, .08, 3.8, 0x354554);
      const lamp = box(city, x, 3.8, z, 1.2, .12, .32, C.amber, true);
      lamp.rotation.y = -angle;
      if (i % 2 === 0) point(city, x, 3.55, z, C.amber, 3, 10);
      box(city, x + .7, .28, z + .7, 1.5, .5, .7, 0x253b3e);
      box(city, x + .7, .58, z + .7, 1.3, .1, .55, 0x406557);
    }
    // Ground reflections are material response on actual floor geometry.
    for (let i = 0; i < 12; i++) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 24), material(0x294653, false, { metalness: .95, roughness: .08, transparent: true, opacity: .48 }));
      patch.rotation.x = -Math.PI / 2; patch.scale.set(1.2 + i % 3, .4 + (i % 4) * .2, 1);
      patch.position.set(Math.sin(i * 2.4) * 18, .021, Math.cos(i * 1.7) * 19); city.add(patch);
    }
    npc(city, 'zero', 'AGENT ZERO', 'npc:zero', -3.4, 4.6, C.pink, 'Your handler has the first Codebreaker signal.');
    npc(city, 'cipher', 'PROFESSOR CIPHER', 'academy', 7, -5.4, C.violet, 'Read and decode synthetic evidence.');
    npc(city, 'byte', 'BYTE / GUIDE', 'ascension:mission', 4.8, 6.8, C.amber, 'Open your active operation.');
    markTarget(city, 'codebreaker', 'CODEBREAKER SIGNAL', 'ascension:mission', -7, -1, C.amber, 'Investigate the Ghost Freight case.');
    authorStreet(city);
    authorFieldContract(city);
    // Hanging service conduits and elevated transit make the skyline a volume.
    for (const x of [-28,28]) {
      box(city, x, 8, 0, .5, .5, 62, 0x223340);
      box(city, x - .28, 8.07, 0, .06, .06, 62, C.blue, true);
      for (let z = -24; z <= 24; z += 16) box(city, x, 4, z, .4, 8, .4, 0x354452);
    }
    const car = new THREE.Group(); car.userData.dynamic = true; box(car, 0, 0, 0, 1.8, .8, 4.3, 0x32445c);
    box(car, 0, .46, .2, 1.6, .6, 2.8, 0x152538); box(car, 0, .16, 2.18, 1.3, .1, .04, C.amber, true);
    city.add(car); animated.push({ car, type: 'transit' });
    const drops = new Float32Array(1200 * 3);
    for (let i = 0; i < drops.length; i += 3) { drops[i] = Math.sin(i * 13.17) * 47; drops[i+1] = (i % 83) / 83 * 32; drops[i+2] = Math.cos(i * 6.91) * 47; }
    const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(drops, 3));
    rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: 0x9cd5ed, size: .035, transparent: true, opacity: .32, depthWrite: false })); city.add(rain);
    batchStaticMeshes(city);
  }

  function releaseGroup(group) {
    if (!group) return;
    scene?.remove(group);
    const geometries = new Set(), ownMaterials = new Set(), textures = new Set();
    const cached = new Set(materials.values()), sharedGeometry = new Set([...Object.values(shared),...rigGeometries]);
    group.traverse(node => {
      if (node.userData.character) {
        node.userData.disposed=true; characterAgents.delete(node);
        if(node.userData.rig){node.userData.rig.mixer.stopAllAction();node.userData.rig.mixer.uncacheRoot(node.userData.rig.root);}
      }
      if (node.isSprite) worldLabels.delete(node);
      if (node.isSkinnedMesh) node.skeleton.dispose();
      if (node.geometry && !sharedGeometry.has(node.geometry)) geometries.add(node.geometry);
      const list = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
      list.forEach(mat => { if (!cached.has(mat)) { ownMaterials.add(mat); if (mat.map) textures.add(mat.map); } });
      if (node.isInstancedMesh) node.dispose();
    });
    geometries.forEach(value=>value.dispose()); ownMaterials.forEach(value=>value.dispose()); textures.forEach(value=>value.dispose());
  }
  function clearSceneObjects() {
    targets.length = 0; obstacles.length = 0; pickables.length = 0; walkableMeshes.length = 0; clearPaths();
    animated.length = 0; peers.forEach(peer => releaseGroup(peer.mesh)); peers.clear();
    if (city) { releaseGroup(city); city = null; }
    if (room) { releaseGroup(room); room = null; }
    fieldWorld = null;
    rain = null;
  }
  function consoleStation(parent, x, z, color, label) {
    const desk = new THREE.Group(); desk.position.set(x, 0, z); parent.add(desk);
    box(desk, 0, .77, 0, 2.8, .14, 1.2, 0x344559);
    box(desk, -.98, .36, 0, .14, .72, .8, 0x203143); box(desk, .98, .36, 0, .14, .72, .8, 0x203143);
    box(desk, 0, 1.38, -.37, 2.25, 1.1, .13, 0x07111d);
    box(desk, 0, 1.4, -.29, 2.08, .94, .025, color, true, { emissiveIntensity: .45 });
    for (let row = 0; row < 5; row++) box(desk, -.12 + row * .025, 1.08 + row * .14, -.27, 1.58 - row * .18, .018, .014, 0xd9fff2, true, { emissiveIntensity: .5 });
    box(desk, 0, .86, .28, 1.1, .045, .35, 0x112331);
    const title = textSprite(label, '#' + color.toString(16).padStart(6,'0'), 2.8); title.position.set(0, 2.5, -.35); desk.add(title);
    collision(x, z, 1.4, .65); return desk;
  }
  function makeInterior(id) {
    room = new THREE.Group(); scene.add(room);
    const accent = id === 'soc' ? C.cyan : id === 'academy' ? C.violet : id === 'lab' ? C.amber : C.pink;
    const names = { soc: 'SOC TOWER / INCIDENT BRIDGE', academy: 'CIPHER ACADEMY / BYTE LAB', lab: 'YOUR LAB / AFTER HOURS', net: 'NET CAFE / OPERATIVE LOUNGE', map: 'NETWORK CORE / THE GRID' };
    const ground = box(room, 0, -.16, 0, 24, .3, 24, 0x192d3a); ground.receiveShadow = true;
    box(room, 0, 3.3, -11.6, 24, 6.6, .5, 0x121e30);
    box(room, -11.6, 3.3, 0, .5, 6.6, 24, 0x16243a);
    box(room, 11.6, 3.3, 0, .5, 6.6, 24, 0x16243a);
    for (let x = -10; x <= 10; x += 4) { box(room, x, .02, 0, .035, .015, 23, accent, true, { emissiveIntensity: .16 }); box(room, x, 6.2, -11.25, .08, .12, .1, accent, true); }
    box(room, 0, 6.4, -11.25, 23, .10, .10, accent, true);
    box(room, -11.25, .18, 0, .1, .1, 23, accent, true); box(room, 11.25, .18, 0, .1, .1, 23, accent, true);
    const heading = textSprite(names[id] || names.map, '#' + accent.toString(16).padStart(6,'0'), 10);
    heading.position.set(0, 5.2, -10.9); room.add(heading);
    point(room, -6, 5, -5, accent, 28, 23); point(room, 7, 4.5, 4, C.amber, 19, 22);
    for (let i = 0; i < 7; i++) {
      const x = -9.7 + i * 3.2;
      box(room, x, 2.05, -10.6, 1.4, 4, .7, 0x080f1c);
      for (let j = 0; j < 8; j++) { box(room, x, .5 + j * .43, -10.2, 1.12, .30, .08, 0x253c4a); box(room, x+.43, .5+j*.43, -10.14, .05, .08, .025, (j+i)%3 ? accent : C.amber, true); }
    }
    if (id === 'soc') {
      const screen = box(room, 0, 3.45, -10.02, 10.5, 3.2, .12, 0x062b35, true, { emissiveIntensity: .35 });
      for (let i = 0; i < 9; i++) { const bar = box(room, -4.2 + i * 1.05, 2.8 + i%3 * .18, -9.94, .65, .4+i%4*.31, .03, i===6 ? C.pink : C.cyan, true); screen.userData.graph = bar; }
      consoleStation(room, -5, -3.5, C.cyan, 'TRAFFIC ANALYSIS'); consoleStation(room, 5, -3.5, C.amber, 'EVIDENCE CHAIN');
      npc(room, 'nova', 'NOVA / INCIDENT RESPONSE', 'ascension:mission', -1.8, -2, C.cyan, 'Inspect the dispatcher capture.');
      markTarget(room, 'triage', 'CODEBREAKER / ACTIVE CASE', 'ascension:mission', 3, 1.8, C.amber, 'Reconstruct the evidence; protect the clean route.');
    } else if (id === 'academy') {
      for (let i = 0; i < 3; i++) consoleStation(room, -6 + i * 6, -3, C.violet, ['HEX WORKBENCH','CIPHER STATION','PROTOCOL LAB'][i]);
      npc(room, 'cipher', 'PROFESSOR CIPHER', 'academy', 0, 1.2, C.violet, 'Open the local Byte Lab.');
      markTarget(room, 'arcade', 'PACKET SORT / ARCADE', 'ascension:arcade', 7, 4, C.pink, 'Classify eight synthetic packets.');
    } else if (id === 'lab') {
      consoleStation(room, -5, -4, C.amber, 'YOUR CYBERDECK');
      box(room, 5, 1.4, -6, 4.4, .18, 1.2, 0x53636b); box(room, 5, 2.8, -6, 4.4, .18, 1.2, 0x53636b);
      for (let i = 0; i < 4; i++) { const trophy = new THREE.Mesh(new THREE.IcosahedronGeometry(.28, 0), material([C.cyan,C.violet,C.amber,C.pink][i], true)); trophy.position.set(3.5+i, 1.8, -6); room.add(trophy); }
      box(room, 6, .48, 5, 4, .8, 2, 0x283149); box(room, 6, 1.08, 5.8, 4, .7, .45, 0x283149);
      markTarget(room, 'loadout', 'LOADOUT / EARNED MODULES', 'console:inventory', -4.8, 0, C.amber, 'Inspect your shared operative inventory.');
      markTarget(room, 'journal', 'CASE NOTES', 'ascension:journal', 4.5, -.5, C.violet, 'Review your private local case notes.');
    } else {
      for (const x of [-6,6]) consoleStation(room, x, -3.5, accent, 'NET TERMINAL');
      ring(room, 0, .05, 0, 3.6, accent);
      markTarget(room, 'roster', 'CONNECTED OPERATIVES', 'ascension:roster', 0, 0, accent, 'See actual live or same-browser peers.');
      npc(room, 'byte', 'BYTE / OPERATIVE GUIDE', 'ascension:mission', 4, 3, C.amber, 'Your next case is waiting.');
    }
    markTarget(room, 'plaza', 'RETURN TO CYBER PLAZA', 'plaza', 0, 8.7, C.cyan, 'Leave the interior and return to the city.');
    batchStaticMeshes(room);
    state.position.set(0, 0, 6.2); state.destination.copy(state.position);
  }

  function dispatch(action, target = null) {
    const event = new CustomEvent('cw:action', { cancelable: true, detail: { action, target } });
    if (!document.dispatchEvent(event)) return;
    if (action.startsWith('district:')) toDistrict(action.split(':')[1]);
    else if (action === 'plaza') toPlaza();
    else if (action === 'academy') window.__cwAscension?.openDeck('academy');
    else if (action === 'ascension:arcade') window.__cwAscension?.openDeck('arcade');
    else if (action === 'ascension:journal') window.__cwAscension?.openDeck('journal');
    else if (action === 'ascension:roster') document.getElementById('cwas-roster')?.click();
    else if (action.startsWith('console:')) window.__cwAscension?.openDeck(action.split(':')[1]);
    else if (action === 'ascension:mission' || action.startsWith('npc:')) window.__cwAscension?.startMission();
  }
  function viewEvent() { document.dispatchEvent(new CustomEvent('cw:view', { bubbles: true, detail: { view: state.view, district: state.district } })); }
  function profile() {
    const op = window.__cwGameplay?.state() || {};
    const color = /^#[0-9a-f]{6}$/i.test(op.look?.suit || '') ? Number.parseInt(op.look.suit.slice(1), 16) : C.cyan;
    return { op, color };
  }
  function rebuild(id) {
    clearSceneObjects(); state.focus = null; state.keys.clear(); state.movement.set(0,0);
    if (!id) { makeCity(); state.position.set(0,0,10); state.destination.copy(state.position); }
    else makeInterior(id);
    if (actor) releaseGroup(actor);
    const p = profile(); actor = makeAgent(p.color, 0xa97559, p.op.look?.frame); scene.add(actor);
    actor.position.copy(state.position);
    scene.fog = new THREE.FogExp2(id ? 0x061220 : 0x081425, id ? .018 : .013);
    state.last = 0;
    camera.position.copy(state.position).add(new THREE.Vector3(8,9,12));
    refresh(); viewEvent();
  }
  function toPlaza() { ensureMounted(); state.view = 'plaza'; state.district = null; rebuild(null); }
  function toDistrict(id) { ensureMounted(); if (!['soc','academy','lab','net','map','field','relay','storm','profile','console'].includes(id)) return;
    if (['field','relay','storm'].includes(id)) { dispatch('ascension:mission', {id}); return; }
    const nextDistrict = id === 'profile' ? 'lab' : id === 'console' ? 'soc' : id;
    // Stage a readable arrival even if the player orbited behind a city wall.
    // Subsequent camera movement inside this district remains player-controlled.
    if (state.district !== nextDistrict) state.orbit = .12;
    state.view = 'district'; state.district = nextDistrict; rebuild(state.district); }
  function snapshot() {
    return { view: state.view, district: state.district, width: state.width, height: state.height,
      avatar: { x: (state.position.x + 50) / 100 * state.width, y: (state.position.z + 50) / 100 * state.height,
        tx: (state.destination.x + 50) / 100 * state.width, ty: (state.destination.z + 50) / 100 * state.height,
        dir: Math.sin(state.facing) >= 0 ? 1 : -1, moving: state.moving, worldX: state.position.x, worldZ: state.position.z, ready: !!actor },
      world: { x: state.position.x, y: state.position.y, z: state.position.z },
      targets: targets.map(target=>({id:target.id,title:target.title,x:target.x,z:target.z,action:target.action})),
      field: { ...fieldState, samples: [...fieldState.samples], steps: [...fieldState.steps],
        targets: fieldSites.map(site=>({id:site.id,x:site.x,z:site.z,action:'studio:field'})),
        convoy: { recovered:fieldState.phase==='complete',moving:!!fieldWorld?.moving&&!state.reducedMotion&&!blocked()&&!document.hidden,
          position:fieldWorld ? {x:fieldWorld.drone.position.x,y:fieldWorld.drone.position.y,z:fieldWorld.drone.position.z} : null } },
      focus: state.focus ? { id: state.focus.id, type: '3d', x: state.focus.x, z: state.focus.z } : null,
      overclock: state.overclock, reducedMotion: state.reducedMotion, renderer: 'webgl',
      diagnostics: { renderer: 'webgl', drawCalls: renderer?.info.render.calls || 0, triangles: renderer?.info.render.triangles || 0, fps: Math.round(state.fps), quality: state.quality, graphics: { ...state.graphics }, characterAsset:characterStatus, characterAnimation:actor?.userData.rig?.name||'procedural-fallback', riggedCharacters:[...characterAgents].filter(agent=>agent.userData.rig).length, audio:cityAudio.snapshot() } };
  }
  function blocked() {
    if (document.body.dataset.phase && document.body.dataset.phase !== 'playing') return true;
    return ['cwas-modal','cwas-title','cwas-creator'].some(id => { const el = document.getElementById(id); return el && !el.hidden && getComputedStyle(el).display !== 'none'; });
  }
  function clearMovement() { state.keys.clear(); state.movement.set(0,0); state.destination.copy(state.position); state.waypoints=[]; state.moving = false; }
  function navigate(point) {
    state.waypoints=[];
    if(!state.district){
      const targetHeight=elevation(point.x,point.z);
      if(state.position.y<.1&&targetHeight>3.5)state.waypoints=[new THREE.Vector3(13,0,12),new THREE.Vector3(13,4.2,23.2),point.clone()];
      else if(state.position.y>3.5&&targetHeight<.1)state.waypoints=[new THREE.Vector3(13,4.2,23.2),new THREE.Vector3(13,0,12),point.clone()];
    }
    state.destination.copy(state.waypoints.length?state.waypoints.shift():point);
  }
  function nearest() {
    let found = null, distance = 4.1;
    targets.forEach(target => {
      const vertical=(target.y||0)-state.position.y;
      if(Math.abs(vertical)>1.5)return;
      const d=Math.hypot(target.x-state.position.x,target.z-state.position.z,vertical);
      if(d<distance){found=target;distance=d;}
    });
    return found;
  }
  function interact() {
    if (blocked()) return;
    const target = nearest();
    if (target) { clearMovement(); cue(580); dispatch(target.action, { id: target.id, title: target.title, action: target.action }); }
    else window.__cwAscensionShell?.toast('Move closer to a person, doorway or terminal.');
  }
  function refresh() {
    if (!actor) return;
    const p = profile();
    const appearance = JSON.stringify([p.color,p.op.look?.frame]);
    if (actor.userData.appearance !== appearance) {
      releaseGroup(actor); actor = makeAgent(p.color, 0xa97559, p.op.look?.frame); actor.userData.appearance = appearance;
      actor.position.copy(state.position); scene.add(actor);
    }
  }
  function setMovement(x,y) {
    state.movement.set(THREE.MathUtils.clamp(Number(x)||0,-1,1),THREE.MathUtils.clamp(Number(y)||0,-1,1));
    if (!x && !y) state.destination.copy(state.position);
  }
  function setReducedMotion(active) { state.motionPreference=!!active; state.reducedMotion=!!active||!!clockQuery?.matches; if(rain)rain.visible=!state.reducedMotion&&state.graphics.effects; return state.reducedMotion; }
  function setGraphicsQuality(quality, options = {}) {
    const presets = {
      low: { resolution: 1, shadows: false, effects: false, shadowSize: 1024 },
      medium: { resolution: 1.25, shadows: true, effects: false, shadowSize: 1024 },
      high: { resolution: 1.6, shadows: true, effects: true, shadowSize: 2048 },
      ultra: { resolution: 2, shadows: true, effects: true, shadowSize: 2048 },
    };
    state.quality = quality === 'custom' || presets[quality] ? quality : 'high';
    state.graphics = state.quality === 'custom' ? {
      resolution: THREE.MathUtils.clamp(Number(options.resolution) || 1, .5, 2),
      shadows: options.shadows !== false, effects: options.effects !== false, shadowSize: 2048,
    } : { ...presets[state.quality] };
    if (renderer) {
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, state.graphics.resolution));
      renderer.shadowMap.enabled = state.graphics.shadows;
      if (sun && sun.shadow.mapSize.x !== state.graphics.shadowSize) {
        sun.shadow.map?.dispose(); sun.shadow.map = null;
        sun.shadow.mapSize.set(state.graphics.shadowSize,state.graphics.shadowSize);
      }
      renderer.shadowMap.needsUpdate = true;
      composer?.setPixelRatio(renderer.getPixelRatio()); composer?.setSize(state.width,state.height);
    }
    if (rain) rain.visible = !state.reducedMotion && state.graphics.effects;
    return state.quality;
  }
  function setOverclock(active) {
    state.overclock=!!active;
    if (root) root.dataset.overclock=String(state.overclock);
    return state.overclock;
  }
  function clearPaths() {
    paths.forEach(path => { scene.remove(path); path.geometry.dispose(); path.material.dispose(); }); paths.length=0;
  }
  function updatePaths() {
    clearPaths();
    if (!state.overclock) return;
    targets.forEach((target,i) => {
      const start=state.position.clone().add(new THREE.Vector3(0,.4,0)), end=new THREE.Vector3(target.x,(target.y||0)+.3,target.z);
      const middle=start.clone().lerp(end,.5); middle.y=2.4+Math.min(4,start.distanceTo(end)*.12);
      const curve=new THREE.QuadraticBezierCurve3(start,middle,end);
      const geometry=new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
      const hot=target.action==='ascension:mission'||target.id==='zero';
      const path=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:hot?C.amber:C.cyan,transparent:true,opacity:.75}));
      path.userData.curve=curve; path.userData.offset=i*.18; scene.add(path); paths.push(path);
      const packet=new THREE.Mesh(shared.sphere,material(hot?C.amber:C.cyan,true)); packet.scale.setScalar(.10);
      path.userData.packet=packet; path.add(packet);
    });
  }
  let pathAnchor=new THREE.Vector3(999,0,999), pathMode=false;
  function updatePeers(dt) {
    const source=window.__cwAscensionNet?.peers()||[]; const live=new Set();
    source.slice(0,64).forEach(peer=>{
      if(peer.zone!==(state.district||'plaza'))return;
      const id=peer.sessionId||peer.device;live.add(id);
      let item=peers.get(id);
      if(!item){const color=/^#[0-9a-f]{6}$/i.test(peer.color||'')?parseInt(peer.color.slice(1),16):C.blue;
        const mesh=makeAgent(color);const name=textSprite(String(peer.callsign||'OPERATIVE').slice(0,24),'#b8dcff',2.5);name.position.y=2.75;mesh.add(name);scene.add(mesh);item={mesh,position:new THREE.Vector3()};peers.set(id,item);}
      item.position.set(THREE.MathUtils.clamp(Number(peer.x)||0,0,1)*100-50,Number(peer.z)||0,THREE.MathUtils.clamp(Number(peer.y)||0,0,1)*100-50);
      item.mesh.userData.groundY=item.position.y;
      item.mesh.position.lerp(item.position,1-Math.exp(-dt*12)); item.mesh.rotation.y=Number(peer.facing)||0;gait(item.mesh,!!peer.moving,dt);
    });
    peers.forEach((item,id)=>{if(!live.has(id)){releaseGroup(item.mesh);peers.delete(id);}});
  }

  function ensureMounted() {
    if (renderer) return;
    root=document.createElement('div');root.id='cwg-root';root.className='on cwas-world3d';
    Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'0'});
    canvas=document.createElement('canvas');canvas.id='cwg-canvas';canvas.setAttribute('aria-label','Three dimensional Cyber Plaza. Use WASD or arrows to move, E to interact. CyberDeck controls provide text alternatives.');
    canvas.setAttribute('tabindex','-1');Object.assign(canvas.style,{width:'100%',height:'100%',display:'block',touchAction:'none'});root.appendChild(canvas);
    context=document.createElement('div');context.id='cwg-action';context.className='cwas-3d-context';context.hidden=true;
    context.innerHTML='<div id="cwg-action-title"></div><p id="cwg-action-sub"></p><button type="button" id="cwg-action-go">E / INTERACT</button>';
    root.appendChild(context);document.body.prepend(root);document.getElementById('cwg-action-go').addEventListener('click',interact);
    try {
      renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    } catch(error) {
      const notice=document.createElement('p');notice.className='cwas-webgl-error';notice.textContent='This 3D world needs WebGL. Enable browser hardware acceleration or use another WebGL-capable browser. Your local saves are preserved.';root.appendChild(notice);throw error;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(innerWidth,innerHeight);
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();scene.background=new THREE.Color(0x081425);
    camera=new THREE.PerspectiveCamera(49,innerWidth/innerHeight,.15,250);camera.position.set(23,16,27);
    scene.add(new THREE.HemisphereLight(0x8ab7dc,0x18212d,2.2));
    sceneLight=new THREE.AmbientLight(0x7c8cba,.55);scene.add(sceneLight);
    sun=new THREE.DirectionalLight(0xffdfbe,2.7);sun.position.set(-18,38,20);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:1,far:100});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun);
    const rim=new THREE.DirectionalLight(C.violet,1.4);rim.position.set(12,12,-25);scene.add(rim);
    const bounce=new THREE.DirectionalLight(0x49d2dc,.7);bounce.position.set(-12,5,-5);scene.add(bounce);
    const moon=new THREE.Mesh(new THREE.SphereGeometry(4,24,16),new THREE.MeshBasicMaterial({color:0xb7cbe5}));moon.position.set(-50,60,-100);scene.add(moon);
    clockQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');setReducedMotion(false);clockQuery?.addEventListener?.('change',()=>setReducedMotion(state.motionPreference));
    composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.12,.45,1.65));
    composer.addPass(new OutputPass());renderer.info.autoReset=false;
    if(innerWidth<720)setGraphicsQuality('low');
    bindInput();state.open=true;rebuild(null);frameId=requestAnimationFrame(tick);
  }
  function bindInput() {
    window.addEventListener('resize',()=>{state.width=innerWidth;state.height=innerHeight;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer?.setSize(innerWidth,innerHeight);});
    document.addEventListener('keydown',event=>{
      if(event.defaultPrevented||blocked()||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
      const key=event.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){state.keys.add(key);event.preventDefault();}
      if(key==='e'){event.preventDefault();interact();}
    });
    document.addEventListener('keyup',event=>state.keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMovement();cityAudio.update({moving:false,paused:document.hidden,hidden:document.hidden,view:state.view,district:state.district,overclock:state.overclock});});
    canvas.addEventListener('contextmenu',event=>event.preventDefault());
    let down=null;
    canvas.addEventListener('pointerdown',event=>{if(blocked())return;down={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,button:event.button,type:event.pointerType};if(event.button===2){state.orbiting=true;canvas.setPointerCapture(event.pointerId);}});
    canvas.addEventListener('pointermove',event=>{
      if(down?.type==='touch'&&!state.orbiting&&Math.hypot(event.clientX-down.startX,event.clientY-down.startY)>6){state.orbiting=true;canvas.setPointerCapture(event.pointerId);}
      if(state.orbiting&&down){state.orbit+=(event.clientX-down.x)*.006;down.x=event.clientX;down.y=event.clientY;}
    });
    canvas.addEventListener('pointerup',event=>{
      if(state.orbiting){state.orbiting=false;down=null;return;}if(!down||blocked())return;
      const moved=Math.hypot(event.clientX-down.x,event.clientY-down.y);down=null;if(moved>8)return;
      pointer.set(event.clientX/state.width*2-1,-event.clientY/state.height*2+1);ray.setFromCamera(pointer,camera);
      const hits=ray.intersectObjects(pickables,true);if(hits.length){let node=hits[0].object;while(node&&!node.userData.target)node=node.parent;
        if(node?.userData.target){const target=node.userData.target;const destination=new THREE.Vector3(target.x,elevation(target.x,target.z+1.6),target.z+1.6);navigate(destination);if(Math.abs((target.y||0)-state.position.y)<=1.5&&Math.hypot(target.x-state.position.x,target.z-state.position.z,(target.y||0)-state.position.y)<4.1)dispatch(target.action,{id:target.id,title:target.title});return;}}
      const walkHit=ray.intersectObjects(walkableMeshes,false)[0];
      const point=walkHit?walkHit.point.clone():new THREE.Vector3();
      if((walkHit||ray.ray.intersectPlane(groundPlane,point))&&Math.abs(point.x)<48&&Math.abs(point.z)<48){point.y=elevation(point.x,point.z);navigate(point);}
    });
    canvas.addEventListener('pointercancel',()=>{state.orbiting=false;down=null;clearMovement();});
    canvas.addEventListener('wheel',event=>{if(blocked())return;event.preventDefault();state.distance=THREE.MathUtils.clamp(state.distance+event.deltaY*.012,8,23);},{passive:false});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();window.__cwAscensionShell?.toast('3D renderer paused. Your case remains saved.');});
    canvas.addEventListener('webglcontextrestored',()=>window.__cwAscensionShell?.toast('3D renderer restored.'));
  }
  function updatePlayer(dt) {
    if(blocked()){clearMovement();return;}
    let x=(state.keys.has('d')||state.keys.has('arrowright')?1:0)-(state.keys.has('a')||state.keys.has('arrowleft')?1:0)+state.movement.x;
    let z=(state.keys.has('s')||state.keys.has('arrowdown')?1:0)-(state.keys.has('w')||state.keys.has('arrowup')?1:0)+state.movement.y;
    const keyboard=Math.hypot(x,z)>.01;
    const speed=state.keys.has('shift')?7.2:4.2;
    if(keyboard){state.waypoints=[];const angle=state.orbit;const rotatedX=x*Math.cos(angle)+z*Math.sin(angle),rotatedZ=-x*Math.sin(angle)+z*Math.cos(angle);x=rotatedX;z=rotatedZ;
      const length=Math.max(1,Math.hypot(x,z));state.destination.copy(state.position).add(new THREE.Vector3(x/length*speed*dt,0,z/length*speed*dt));}
    if(state.position.distanceTo(state.destination)<.16&&state.waypoints.length)state.destination.copy(state.waypoints.shift());
    const delta=state.destination.clone().sub(state.position),distance=delta.length();state.moving=distance>.025;
    if(state.moving){delta.multiplyScalar(Math.min(distance,speed*dt)/Math.max(distance,.001));
      const nx=state.position.x+delta.x,nz=state.position.z+delta.z;
      if(!collides(nx,state.position.z))state.position.x=nx;
      if(!collides(state.position.x,nz))state.position.z=nz;
      state.position.y=elevation(state.position.x,state.position.z);
      state.facing=Math.atan2(delta.x,delta.z);}
    actor.position.copy(state.position);actor.userData.groundY=state.position.y;actor.rotation.y=state.facing;gait(actor,state.moving,dt,state.keys.has('shift'));
  }
  function renderWorld() {
    renderer.info.reset();
    if(composer&&state.graphics.effects)composer.render();else renderer.render(scene,camera);
  }
  function updateWorldLabels() {
    // Labels are world markers, not full-screen banners. Cap their projected
    // width in CSS pixels and fade markers passing close behind the operative.
    camera.updateMatrixWorld();
    const maxWidth = state.width < 600 ? 125 : 160;
    const projection = state.height / (2 * Math.tan(camera.fov * Math.PI / 360));
    worldLabels.forEach(label => {
      label.getWorldPosition(labelPosition); labelPosition.applyMatrix4(camera.matrixWorldInverse);
      const depth = -labelPosition.z, size = label.userData.labelSize;
      const scale = Math.min(1, maxWidth * Math.max(.1,depth) / (size.width * projection));
      label.scale.set(size.width * scale,size.height * scale,1);
      label.material.opacity = THREE.MathUtils.clamp((depth-2)/3,0,1);
      label.visible = depth > 2;
    });
  }
  function avoidCameraObstacles(desired) {
    cameraFocus.copy(state.position); cameraFocus.y += 1.5;
    cameraDirection.copy(desired).sub(cameraFocus);
    const length = cameraDirection.length();
    if (length < .01) return desired;
    cameraDirection.multiplyScalar(1 / length); cameraRay.set(cameraFocus, cameraDirection);
    let clearDistance = length;
    const consider = (x,z,halfX,halfZ,height) => {
      cameraBox.min.set(x-halfX-.2,-.2,z-halfZ-.2);
      cameraBox.max.set(x+halfX+.2,height+.25,z+halfZ+.2);
      if (cameraRay.intersectBox(cameraBox,cameraHit)) {
        const distance = cameraFocus.distanceTo(cameraHit);
        if (distance > .3) clearDistance = Math.min(clearDistance, Math.max(1.2,distance-.45));
      }
    };
    obstacles.forEach(obstacle => consider(obstacle.x,obstacle.z,obstacle.halfX,obstacle.halfZ,obstacle.height));
    if (state.district) { consider(-11.6,0,.25,12,6.6); consider(11.6,0,.25,12,6.6); consider(0,-11.6,12,.25,6.6); }
    return desired.copy(cameraFocus).addScaledVector(cameraDirection,clearDistance);
  }
  let peerTime=0, pathTime=0, backgroundPaused=false;
  function tick(now) {
    frameId=requestAnimationFrame(tick);if(!state.open||!renderer){cityAudio.update({paused:true,hidden:document.hidden,moving:false});return;}
    const elapsed=state.last?Math.max(.001,(now-state.last)/1000):1/60;
    const dt=Math.min(.05,elapsed);state.last=now;
    const modal=document.getElementById('cwas-modal');
    const pauseBackground=(modal&&!modal.hidden)||document.body.dataset.phase==='creator';
    if(pauseBackground){
      clearMovement(); context.hidden=true;
      cityAudio.update({moving:false,view:state.view,district:state.district,overclock:state.overclock,paused:true,hidden:document.hidden});
      if(!backgroundPaused){
        renderWorld();
        window.__cwAscensionNet?.publishPosition({x:(state.position.x+50)/100,y:(state.position.z+50)/100,zone:state.district||'plaza',facing:state.facing,moving:false});
      }
      backgroundPaused=true;return;
    }
    backgroundPaused=false;
    // Simulation steps are bounded after stalls, but diagnostics report actual
    // wall-clock frame rate instead of an artificial 20 fps minimum.
    state.fps += (1 / elapsed - state.fps) * .05;
    const simulationDt=dt*(state.overclock ? .2 : 1);if(!state.reducedMotion)state.time+=simulationDt;
    updatePlayer(dt);
    cityAudio.update({moving:state.moving,running:state.keys.has('shift'),view:state.view,district:state.district,overclock:state.overclock,paused:blocked(),hidden:document.hidden});
    const title=document.body.dataset.phase==='title'||document.body.dataset.phase==='creator';
    if(title){const angle=state.reducedMotion ? .58 : .58+Math.sin(state.time*.045)*.18;
      playerPos.set(Math.sin(angle)*34,19,Math.cos(angle)*34);camera.position.lerp(playerPos,1-Math.exp(-dt*2));camera.lookAt(0,2.3,-4);
    }else{
      const offset=new THREE.Vector3(Math.sin(state.orbit)*state.distance,state.distance*.46,Math.cos(state.orbit)*state.distance);
      playerPos.copy(state.position).add(offset);avoidCameraObstacles(playerPos);
      camera.position.lerp(playerPos,1-Math.exp(-dt*5));avoidCameraObstacles(camera.position);
      camera.lookAt(state.position.x,state.position.y+1.5,state.position.z);
    }
    animated.forEach(item=>{
      if(item.type==='core'){item.core.rotation.y=state.time*.35;item.core.position.y=2.7+Math.sin(state.time*.7)*.2;}
      else if(item.type==='transit'){item.car.position.set(28,8.75,Math.sin(state.time*.08)*27);}
      else if(item.type==='crowd')updateCrowd(item,simulationDt);
      else if(item.type==='field')updateFieldWorld(simulationDt);
      else gait(item,false,dt);
    });
    if(rain){rain.visible=!state.reducedMotion&&state.graphics.effects;const positions=rain.geometry.attributes.position;
      if(rain.visible){for(let i=0;i<positions.count;i++){let y=positions.getY(i)-simulationDt*12;if(y<0)y=32;positions.setY(i,y);}positions.needsUpdate=true;}}
    if(now-peerTime>120){updatePeers(Math.max(.12,(now-peerTime)/1000));peerTime=now;}
    if(state.overclock!==pathMode||(state.overclock&&(now-pathTime>500||pathAnchor.distanceTo(state.position)>2))){updatePaths();pathMode=state.overclock;pathAnchor.copy(state.position);pathTime=now;}
    paths.forEach(path=>{const t=(state.time*.32+path.userData.offset)%1;path.userData.packet.position.copy(path.userData.curve.getPoint(t));});
    const target=blocked()?null:nearest();state.focus=target;context.hidden=!target;
    if(target){const titleEl=document.getElementById('cwg-action-title'),sub=document.getElementById('cwg-action-sub');if(titleEl.textContent!==target.title)titleEl.textContent=target.title;if(sub.textContent!==target.description)sub.textContent=target.description;}
    if(window.__cwAscensionNet&&actor)window.__cwAscensionNet.publishPosition({x:(state.position.x+50)/100,y:(state.position.z+50)/100,z:state.position.y,zone:state.district||'plaza',facing:state.facing,moving:state.moving});
    updateWorldLabels(); renderWorld();
  }
  function createPreview(targetCanvas, initial = {}) {
    const previewRenderer = new THREE.WebGLRenderer({ canvas: targetCanvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    const width = targetCanvas.clientWidth || targetCanvas.width || 480;
    const height = targetCanvas.clientHeight || targetCanvas.height || 560;
    previewRenderer.setSize(width, height, false); previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewRenderer.toneMapping = THREE.ACESFilmicToneMapping; previewRenderer.toneMappingExposure = 1.35;
    const previewScene = new THREE.Scene(), previewCamera = new THREE.PerspectiveCamera(35, width / height, .1, 40);
    previewCamera.position.set(3.4, 2.6, 5.6); previewCamera.lookAt(0, 1.1, 0);
    previewScene.add(new THREE.HemisphereLight(0xbadfff, 0x18243b, 2.8));
    const key = new THREE.DirectionalLight(0xd2e9ff, 3); key.position.set(3, 6, 4); previewScene.add(key);
    const edge = new THREE.DirectionalLight(C.violet, 2.2); edge.position.set(-3, 3, -3); previewScene.add(edge);
    const stage = new THREE.Group(); previewScene.add(stage);
    cylinder(stage, 0, -.16, 0, 1.25, .3, 0x243449); ring(stage, 0, .005, 0, 1.12, C.cyan, .025);
    let previewAgent, previewFrame, disposed = false, elapsed = 0, previous = 0;
    function update(next = {}) {
      if (previewAgent) { previewScene.remove(previewAgent); releaseGroup(previewAgent); }
      const color = /^#[0-9a-f]{6}$/i.test(next.color || '') ? parseInt(next.color.slice(1),16) : C.cyan;
      previewAgent = makeAgent(color, 0xa97559, next.frame || (next.path === 'osint' ? 'ghost' : 'sentinel'));
      previewAgent.rotation.y = .38; previewScene.add(previewAgent);
    }
    update(initial);
    function draw(now) {
      if (disposed) return;
      const dt = previous ? Math.min(.05, (now - previous) / 1000) : 1/60; previous = now;
      if (!state.reducedMotion) elapsed += dt;
      gait(previewAgent,false,dt);
      previewAgent.rotation.y = .38 + Math.sin(elapsed * .32) * .25;
      previewRenderer.render(previewScene, previewCamera); previewFrame = requestAnimationFrame(draw);
    }
    previewFrame = requestAnimationFrame(draw);
    return { update, dispose() { disposed = true; cancelAnimationFrame(previewFrame); releaseGroup(previewAgent); releaseGroup(stage); previewRenderer.dispose(); } };
  }
  window.__cwWorld={
    open(){ensureMounted();state.open=true;if(root)root.hidden=false;},
    close(){state.open=false;clearMovement();if(root)root.hidden=true;},
    refresh, toPlaza, toDistrict, toGrid(){toDistrict('map');},toSector(){toDistrict('academy');},
    view(){return state.view;},snapshot,setMovement,interact,setOverclock,setReducedMotion,
    setSoundEnabled,setGraphicsQuality,createPreview,
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureMounted,{once:true});else ensureMounted();
})();
