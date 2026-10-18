import * as THREE from 'three';

// Original spatial response exercise. State and grading remain in the campaign.
let current = null;
const COLORS = { cyan: 0x55ffe0, blue: 0x3c9fff, threat: 0xff427f, gold: 0xffd288, violet: 0xad79ff };

export function dispose() {
  if (current) current.dispose();
  current = null;
}

export function mount(containerOrCanvas, getState, options = {}) {
  dispose();
  const suppliedCanvas = containerOrCanvas instanceof HTMLCanvasElement;
  const host = suppliedCanvas ? containerOrCanvas.parentElement : containerOrCanvas;
  if (!host) throw new Error('The response arena needs a visible host.');
  const canvas = suppliedCanvas ? containerOrCanvas : document.createElement('canvas');
  if (!suppliedCanvas) host.appendChild(canvas);
  canvas.dataset.renderer = 'three-webgl';
  canvas.setAttribute('aria-label', 'Interactive three-dimensional response arena. Holographic infrastructure nodes connect through packet conduits. The same target selection and recovery actions are available in the buttons below.');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050b17);
  scene.fog = new THREE.FogExp2(0x050b17, 0.032);
  const camera = new THREE.PerspectiveCamera(43, 2.45, 0.1, 70);
  camera.position.set(8.2, 8.4, 12.8);
  camera.lookAt(0, 0.4, 0.3);
  scene.add(new THREE.HemisphereLight(0x83b4e8, 0x081229, 1.6));
  const keyLight = new THREE.DirectionalLight(0xb6deff, 3.3);
  keyLight.position.set(-4, 10, 6); keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -9; keyLight.shadow.camera.right = 9;
  keyLight.shadow.camera.top = 8; keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.normalBias = 0.035; scene.add(keyLight);
  const rim = new THREE.PointLight(COLORS.violet, 28, 22, 2); rim.position.set(2, 5, -4); scene.add(rim);
  const tealLight = new THREE.PointLight(COLORS.cyan, 16, 12, 2); tealLight.position.set(-4, 2, -1); scene.add(tealLight);
  const mat = (color, emissive = 0, strength = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: strength, metalness: 0.65, roughness: 0.3 });
  const dark = mat(0x13243d), shell = mat(0x1f4057), black = mat(0x0d172b);
  const glowCyan = mat(0x153d3d, COLORS.cyan, 2.3);
  const glowBlue = mat(0x173153, COLORS.blue, 1.8);
  const glowThreat = mat(0x401b35, COLORS.threat, 2.1);
  const glowGold = mat(0x55432d, COLORS.gold, 1.9);
  const materialBank = [dark, shell, black, glowCyan, glowBlue, glowThreat, glowGold];
  function solid(geometry, material, parent, position, scale) {
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true;
    if (position) mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    (parent || scene).add(mesh); return mesh;
  }
  function box(parent, width, height, depth, material, position) { return solid(new THREE.BoxGeometry(width, height, depth), material, parent, position); }
  function ring(parent, radius, thickness, material, y) {
    const mesh = solid(new THREE.TorusGeometry(radius, thickness, 8, 48), material, parent, [0, y, 0]); mesh.rotation.x = Math.PI / 2; return mesh;
  }
  const floor = solid(new THREE.PlaneGeometry(36, 28), mat(0x081323), scene, [0, -0.12, 0]); floor.rotation.x = -Math.PI / 2;
  const grid = new THREE.GridHelper(30, 48, 0x23566b, 0x10263d); grid.position.y = -0.1; scene.add(grid);
  const stage = box(scene, 13.4, 0.2, 8.3, dark, [0, -0.07, 0.3]);
  const frame = new THREE.EdgesGeometry(stage.geometry);
  const frameLines = new THREE.LineSegments(frame, new THREE.LineBasicMaterial({ color: 0x3b7c94, transparent: true, opacity: 0.6 })); frameLines.position.copy(stage.position); scene.add(frameLines);

  const nodes = {}, hitMeshes = [], labels = [];
  const labelLayer = document.createElement('div'); labelLayer.className = 'cwas-arena-labels'; labelLayer.setAttribute('aria-hidden', 'true'); host.appendChild(labelLayer);
  function node(id, title, x, z, target, color) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.userData.target = target; scene.add(group);
    solid(new THREE.CylinderGeometry(0.92, 1.08, 0.18, 8), black, group, [0, 0.06, 0]);
    const accent = mat(0x173545, color, 1.4); materialBank.push(accent);
    const baseRing = ring(group, 0.94, 0.035, accent, 0.18);
    const label = document.createElement('span'); label.className = 'cwas-arena-label'; label.textContent = title; labelLayer.appendChild(label);
    labels.push({ element: label, group, offset: new THREE.Vector3(0, 2.15, 0) });
    nodes[id] = { group, accent, baseRing, label }; return group;
  }
  const archive = node('archive', 'TRUSTED ARCHIVE', -4.7, -1.7, 'subnet', COLORS.cyan);
  for (let i = 0; i < 4; i++) box(archive, 1.3, 0.23, 1.02, i === 3 ? glowCyan : shell, [0, 0.4 + i * 0.29, 0]);
  for (let i = 0; i < 3; i++) box(archive, 0.85, 0.035, 0.025, glowCyan, [0, 0.47 + i * 0.29, 0.52]);
  const relay = node('relay', 'ROUTE VALIDATOR', -0.5, -1.7, 'subnet', COLORS.blue);
  solid(new THREE.CylinderGeometry(0.48, 0.64, 1.2, 6), shell, relay, [0, 0.8, 0]);
  const relayCore = solid(new THREE.OctahedronGeometry(0.46), glowBlue, relay, [0, 1.5, 0]);
  const relayOrbit = ring(relay, 0.68, 0.035, glowBlue, 1.18); relayOrbit.rotation.x = Math.PI * 0.3;
  const city = node('city', 'ESSENTIAL DELIVERIES', 4.2, -1.7, 'subnet', COLORS.cyan);
  const cityLights = [];
  [[-0.4,0.35,0.42,1.3],[0.22,-0.3,0.5,1.65],[0.5,0.35,0.32,0.95],[-0.35,-0.38,0.35,0.85]].forEach(([x,z,w,h]) => {
    box(city,w,h,w,shell,[x,h/2+0.22,z]);
    for(let j=0;j<3;j++)cityLights.push(box(city,w*0.7,0.045,0.025,glowCyan,[x,0.4+j*0.3,z+w/2+0.01]));
  });
  const dispatcher = node('dispatcher', 'DISPATCHER 23 / AFFECTED', -0.5, 2.4, 'dispatcher', COLORS.threat);
  const dispatcherShell=box(dispatcher,1.15,1.25,0.85,black,[0,0.85,0]);
  for(let i=0;i<4;i++){box(dispatcher,0.85,0.14,0.05,shell,[0,0.45+i*0.25,0.46]);box(dispatcher,0.12,0.06,0.06,glowThreat,[0.34,0.46+i*0.25,0.5]);}
  const token = solid(new THREE.IcosahedronGeometry(0.25), glowGold, dispatcher, [0.8,1.38,0]);
  const threat = node('threat', 'UNAUTHORIZED ROUTE', 4.2, 2.4, 'dispatcher', COLORS.threat);
  const threatCore = solid(new THREE.IcosahedronGeometry(0.55,0),glowThreat,threat,[0,0.95,0]);
  const threatOrbit=ring(threat,0.7,0.045,glowThreat,0.95);threatOrbit.rotation.x=Math.PI*0.15;

  const cage = new THREE.Group(); dispatcher.add(cage);
  const cageEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.9,2.1,1.7));
  const cageMat = new THREE.LineBasicMaterial({color:COLORS.cyan,transparent:true,opacity:0.9});
  const cageWire = new THREE.LineSegments(cageEdges,cageMat);cageWire.position.y=1.05;cage.add(cageWire);
  const cageShellMat = new THREE.MeshBasicMaterial({color:COLORS.cyan,transparent:true,opacity:0.055,side:THREE.DoubleSide,depthWrite:false});
  solid(new THREE.BoxGeometry(1.9,2.1,1.7),cageShellMat,cage,[0,1.05,0]);cage.visible=false;
  const preserved = new THREE.Group();preserved.position.set(-0.4,1.9,0);archive.add(preserved);
  const evidenceChip = solid(new THREE.BoxGeometry(0.42,0.08,0.5),glowGold,preserved);evidenceChip.rotation.z=-0.25;
  ring(preserved,0.42,0.018,glowGold,0);preserved.visible=false;
  const selection = ring(dispatcher,1.12,0.055,glowGold,0.22);
  const subnetSelection = ring(relay,1.1,0.055,glowGold,0.22);subnetSelection.visible=false;
  const victoryColumnMat=new THREE.MeshBasicMaterial({color:COLORS.cyan,transparent:true,opacity:0.07,side:THREE.DoubleSide,depthWrite:false});
  const victoryColumn=solid(new THREE.CylinderGeometry(0.9,0.9,5,32,1,true),victoryColumnMat,city,[0,2.7,0]);victoryColumn.visible=false;

  const routes=[];
  function conduit(from,to,color,{malicious=false,recovery=false,hidden=false}={}) {
    const a=nodes[from].group.position.clone().add(new THREE.Vector3(0,0.35,0)),b=nodes[to].group.position.clone().add(new THREE.Vector3(0,0.35,0));
    const center=a.clone().lerp(b,0.5);center.y=0.7;
    const curve=new THREE.CatmullRomCurve3([a,center,b]);
    const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2,metalness:0.3,roughness:0.25,transparent:true,opacity:0.8});materialBank.push(material);
    const tube=solid(new THREE.TubeGeometry(curve,32,0.042,6,false),material,scene);tube.castShadow=false;
    const sheathMaterial=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.065,depthWrite:false});materialBank.push(sheathMaterial);
    const sheath=solid(new THREE.TubeGeometry(curve,32,0.14,8,false),sheathMaterial,scene);sheath.castShadow=false;
    const packets=[];for(let i=0;i<5;i++){const packet=solid(new THREE.BoxGeometry(0.16,0.16,0.36),material,scene);packet.castShadow=false;packets.push(packet);}
    const route={curve,tube,sheath,packets,material,sheathMaterial,color,malicious,recovery,hidden};routes.push(route);return route;
  }
  conduit('archive','relay',COLORS.cyan);conduit('relay','city',COLORS.cyan);
  conduit('dispatcher','threat',COLORS.threat,{malicious:true});
  conduit('dispatcher','relay',COLORS.violet,{recovery:true});
  conduit('threat','relay',COLORS.threat,{hidden:true,malicious:true});
  const revealPlaneMat=new THREE.MeshBasicMaterial({color:COLORS.violet,transparent:true,opacity:0.035,side:THREE.DoubleSide,depthWrite:false});
  const revealPlane=solid(new THREE.PlaneGeometry(12,7),revealPlaneMat,scene,[0,0.23,0.4]);revealPlane.rotation.x=-Math.PI/2;revealPlane.visible=false;
  scene.traverse(object=>{if(object.isMesh && object.parent!==scene){let ancestor=object;while(ancestor&&!ancestor.userData.target)ancestor=ancestor.parent;if(ancestor)hitMeshes.push(object);}});
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hit(event) {
    const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const intersections=raycaster.intersectObjects(hitMeshes,false);if(!intersections.length)return null;
    let object=intersections[0].object;while(object&&!object.userData.target)object=object.parent;return object?object.userData.target:null;
  }
  const onClick=event=>{const target=hit(event);if(target&&typeof options.onSelect==='function')options.onSelect(target);};
  const onMove=event=>{canvas.style.cursor=hit(event)?'pointer':'default';};
  canvas.addEventListener('click',onClick);canvas.addEventListener('pointermove',onMove);
  let width=0,height=0,raf=0,disposed=false,phase=0,last=performance.now();
  const worldPosition=new THREE.Vector3(),tangent=new THREE.Vector3(),packetUp=new THREE.Vector3(0,0,1);
  function resize() {
    const nextWidth=Math.max(1,canvas.clientWidth||host.clientWidth||880),nextHeight=Math.max(260,Math.min(420,nextWidth*0.39));
    if(nextWidth===width&&nextHeight===height)return;
    width=nextWidth;height=nextHeight;renderer.setSize(width,height,false);canvas.style.height=height+'px';camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  function render(now) {
    if(disposed)return;resize();
    const s=typeof getState==='function'?getState()||{}:{},motionOff=!!s.reducedMotion;
    // RAF's timestamp can precede performance.now() recorded during mounting.
    // A negative phase would sample before the first spline segment.
    const elapsed=Math.max(0,Math.min(60,now-last))/1000;last=now;
    if(!motionOff)phase+=elapsed*(s.overclockActive?0.17:0.85);
    cage.visible=!!s.isolated;preserved.visible=!!s.snapshot;victoryColumn.visible=!!s.verified;
    selection.visible=s.selectedTarget!=='subnet';subnetSelection.visible=s.selectedTarget==='subnet';
    token.material=s.rotated?glowCyan:glowGold;
    dispatcherShell.material=s.restored?shell:black;
    nodes.dispatcher.accent.emissive.setHex(s.isolated?COLORS.cyan:COLORS.threat);
    nodes.threat.accent.emissiveIntensity=s.isolated?0.25:1.4;
    threatCore.material=s.isolated?black:glowThreat;
    revealPlane.visible=!!s.overclockActive;
    const activePhase=motionOff?0:phase;
    relayCore.rotation.y=activePhase*0.7;relayOrbit.rotation.z=activePhase*0.4;threatCore.rotation.y=-activePhase*0.7;
    threatOrbit.rotation.z=activePhase*0.5;token.rotation.y=activePhase*1.2;preserved.rotation.y=activePhase*0.5;
    victoryColumn.rotation.y=activePhase*0.2;
    routes.forEach(route=>{
      const visible=!route.hidden||s.overclockActive;
      const blocked=route.malicious&&s.isolated;
      const restoring=route.recovery&&!s.restored;
      route.tube.visible=visible;route.sheath.visible=visible;
      route.material.opacity=blocked?0.12:restoring?0.18:0.9;
      route.material.emissiveIntensity=blocked?0.1:s.overclockActive?3.1:2;
      route.sheathMaterial.opacity=blocked?0.01:s.overclockActive?0.15:0.065;
      if(route.recovery){route.material.color.setHex(s.restored?COLORS.cyan:COLORS.violet);route.material.emissive.setHex(s.restored?COLORS.cyan:COLORS.violet);}
      route.packets.forEach((packet,i)=>{packet.visible=visible&&!blocked&&!restoring;const t=(activePhase*0.33+i/5)%1;route.curve.getPointAt(t,worldPosition);packet.position.copy(worldPosition);route.curve.getTangentAt(t,tangent).normalize();packet.quaternion.setFromUnitVectors(packetUp,tangent);});
    });
    const targetLabel=s.verified?'DISPATCHER 23 / RECOVERED':s.isolated?'DISPATCHER 23 / ISOLATED':'DISPATCHER 23 / AFFECTED';
    nodes.dispatcher.label.textContent=targetLabel;nodes.threat.label.textContent=s.isolated?'UNAUTHORIZED ROUTE / BLOCKED':'UNAUTHORIZED ROUTE';
    labels.forEach(label=>{label.group.getWorldPosition(worldPosition);worldPosition.add(label.offset).project(camera);label.element.style.transform=`translate(${(worldPosition.x*0.5+0.5)*width}px,${(-worldPosition.y*0.5+0.5)*height}px) translate(-50%,-50%)`;});
    renderer.render(scene,camera);raf=requestAnimationFrame(render);
  }
  resize();raf=requestAnimationFrame(render);
  const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;if(resizeObserver)resizeObserver.observe(host);
  current={dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);if(resizeObserver)resizeObserver.disconnect();canvas.removeEventListener('click',onClick);canvas.removeEventListener('pointermove',onMove);labelLayer.remove();const geometries=new Set(),materials=new Set(materialBank);scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material){if(Array.isArray(object.material))object.material.forEach(material=>materials.add(material));else materials.add(object.material);}});geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());renderer.dispose();renderer.forceContextLoss();if(!suppliedCanvas)canvas.remove();}};
  return current;
}

window.__cwResponse3D = { mount, dispose };
