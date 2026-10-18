'use strict';
// Measure the geometry constructors and original model builders actually used
// by the scene, without creating a WebGL context or contacting any service.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sha = bytes => crypto.createHash('sha256').update(typeof bytes === 'string' ? bytes.replace(/\r\n/g, '\n') : bytes).digest('hex');
function triangles(geometry) { return (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3; }
function modelStats(group) {
  let meshTriangles = 0, spriteTriangles = 0, meshes = 0;
  const geometries = new Set(), materials = new Set();
  group.traverse(node => {
    if (node.isMesh) { meshTriangles += triangles(node.geometry) * (node.isInstancedMesh ? node.count : 1); meshes++; geometries.add(node.geometry.uuid); }
    if (node.isSprite) spriteTriangles += 2;
    if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => materials.add(material.uuid));
  });
  return { meshTriangles, spriteTriangles, meshes, uniqueGeometries: geometries.size, uniqueMaterials: materials.size };
}
(async () => {
  const THREE = await import('three');
  const sourcePath = 'CyberWorld/src/ascension-world3d.js';
  const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
  const helperStart = source.indexOf('  const shared = {'), helperEnd = source.indexOf('  function textSprite(');
  const buildingStart = source.indexOf('  function building('), agentStart = source.indexOf('  function makeAgent('), agentEnd = source.indexOf('  function gait(');
  if ([helperStart, helperEnd, buildingStart, agentStart, agentEnd].some(index => index < 0)) throw new Error('Scene builder structure changed; update the geometry registry extractor.');
  const context = vm.createContext({ THREE });
  vm.runInContext('const C={cyan:0x48ffd5}; const materials=new Map(); function collision(){} function textSprite(){return new THREE.Sprite(new THREE.SpriteMaterial());}\n' +
    source.slice(helperStart, helperEnd) + source.slice(buildingStart, agentStart) + source.slice(agentStart, agentEnd) +
    '\nglobalThis.models={}; for(const frame of ["sentinel","ghost","runner","tinker"]) models[frame]=makeAgent(undefined,undefined,frame); models.referenceTower=building(new THREE.Group(),0,0,8,8,16,0x48ffd5,"",false); models.referenceVenue=building(new THREE.Group(),0,0,8,8,16,0x48ffd5,"Reference",true);', context);
  const primitives = [
    ['unit-box', new THREE.BoxGeometry(1, 1, 1), 'BoxGeometry(1,1,1)'],
    ['world-sphere', new THREE.SphereGeometry(1, 16, 12), 'SphereGeometry(1,16,12)'],
    ['world-cylinder', new THREE.CylinderGeometry(1, 1, 1, 20), 'CylinderGeometry(1,1,1,20)'],
    ['world-capsule', new THREE.CapsuleGeometry(1, 1, 4, 12), 'CapsuleGeometry(1,1,4,12)'],
    ['world-ring', new THREE.TorusGeometry(1, .045, 6, 64), 'TorusGeometry(radius,width,6,64)'],
    ['operative-visor', new THREE.SphereGeometry(1,18,8,0,Math.PI,Math.PI*.36,Math.PI*.23), 'SphereGeometry(1,18,8,0,PI,PI*.36,PI*.23)'],
    ['arena-ring', new THREE.TorusGeometry(1,.1,8,48), 'TorusGeometry(radius,thickness,8,48)'],
    ['arena-conduit', new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(),new THREE.Vector3(1,0,0)),32,.042,6,false), 'TubeGeometry(curve,32,.042,6,false)'],
    ['arena-conduit-sheath', new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(),new THREE.Vector3(1,0,0)),32,.14,8,false), 'TubeGeometry(curve,32,.14,8,false)'],
    ['octahedron', new THREE.OctahedronGeometry(1,0), 'OctahedronGeometry(radius,0)'],
    ['icosahedron', new THREE.IcosahedronGeometry(1,0), 'IcosahedronGeometry(radius,0)'],
  ].map(([id, geometry, constructor]) => ({ id, constructor, triangles: triangles(geometry) }));
  const original = { provenance: 'Original project-authored procedural model builder', source: sourcePath, sourceSha256: sha(source), modelLicense: 'No separate model license is declared in the repository; this registry does not grant a new license.' };
  const registry = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    countingMethod: 'Indexed triangle faces (or position-count/3 for nonindexed geometry); instanced counts multiplied by instances. Composite counts exclude shadow/postprocessing passes and report label sprites separately.',
    models: Object.entries(context.models).map(([id, group]) => ({ id, ...original, parameters: id.startsWith('reference') ? { width: 8, depth: 8, height: 16, interactive: id === 'referenceVenue' } : { frame: id }, ...modelStats(group) })),
    primitives,
    renderingDependency: { package: 'three', version: require('../node_modules/three/package.json').version, license: 'MIT', copyright: 'Copyright © 2010–2026 three.js authors', source: 'https://github.com/mrdoob/three.js', distributedLicense: 'CyberWorld/THIRD_PARTY_LICENSES.txt' },
    supportingArt: [{ path: 'CyberWorld/assets/cyberworld/ascension-plaza.webp', provenance: 'Original image generated for this project using OpenAI image generation; see docs/ASCENSION-ART.md', use: 'Supporting social-preview/offline illustration, not the playable 3D world', triangles: null, sha256: sha(fs.readFileSync(path.join(root, 'CyberWorld/assets/cyberworld/ascension-plaza.webp'))) }],
    limitations: ['Reference tower counts vary with dimensions and facade window count.', 'These counts are per model, not total visible scene draw calls.', 'Material/texture GPU allocations and renderer performance require a browser capture.', 'No imported commercial-game model, character, agency seal or licensed franchise asset is used by these builders.'],
  };
  fs.writeFileSync(path.join(root, 'data/ascension-assets.json'), JSON.stringify(registry, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'CyberWorld/THIRD_PARTY_LICENSES.txt'), 'CyberWorld browser rendering dependency\nThree.js ' + registry.renderingDependency.version + '\nhttps://github.com/mrdoob/three.js\n\n' + fs.readFileSync(path.join(root, 'node_modules/three/LICENSE'), 'utf8'));
  console.log('Measured original model registry: ' + registry.models.length + ' composites and ' + primitives.length + ' geometry primitives; complete Three.js MIT notice copied for static distribution.');
})().catch(error => { console.error(error); process.exitCode = 1; });
