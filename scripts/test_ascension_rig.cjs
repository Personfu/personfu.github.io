'use strict';
// Verify the real binary asset, skin cloning and animation data independently
// from browser UI. This prevents an offline update shipping an HTML error page
// as a model or accidentally sharing one skeleton across every operative.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
(async () => {
  const root = path.resolve(__dirname,'..');
  const data = fs.readFileSync(path.join(root,'CyberWorld/assets/cyberworld/models/Character.glb'));
  assert.equal(data.readUInt32LE(0),0x46546c67);
  assert.equal(data.readUInt32LE(4),2);
  assert.equal(data.readUInt32LE(8),data.length);
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),'e3f0912206908cbf3a68846f8f55856495c2c81231642998a42ff850ff1347a3');
  const jsonSize = data.readUInt32LE(12);
  const description = JSON.parse(data.subarray(20,20+jsonSize).toString('utf8'));
  assert(description.buffers.every(buffer=>!buffer.uri),'GLB cannot fetch an external buffer');
  assert.equal((description.images||[]).length,0,'This asset has no texture closure');
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  const model = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const clips = ['Idle_Neutral','Walk','Run','Interact','Wave'];
  clips.forEach(name=>assert(THREE.AnimationClip.findByName(model.animations,name),`Missing ${name} animation`));
  let triangles=0,bones=0,skinned=0;
  model.scene.traverse(node=>{if(node.isBone)bones++;if(node.isSkinnedMesh){skinned++;triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;}});
  assert(skinned>0 && bones>10,'Actual skinned/rigged geometry is required');
  const first=clone(model.scene),second=clone(model.scene);
  let firstSkin,secondSkin;
  first.traverse(node=>{if(node.isSkinnedMesh&&!firstSkin)firstSkin=node;});
  second.traverse(node=>{if(node.isSkinnedMesh&&!secondSkin)secondSkin=node;});
  assert.notEqual(firstSkin.skeleton,secondSkin.skeleton);
  assert.notEqual(firstSkin.skeleton.bones[0],secondSkin.skeleton.bones[0]);
  assert.equal(firstSkin.geometry,secondSkin.geometry,'Geometry stays shared while skeletons are independent');
  const mixer=new THREE.AnimationMixer(first);
  mixer.clipAction(THREE.AnimationClip.findByName(model.animations,'Walk')).play();
  mixer.update(.5); first.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(first),size=bounds.getSize(new THREE.Vector3());
  assert(Number.isFinite(size.y)&&size.y>.1&&size.y<100,'Animation preserves finite character bounds');
  console.log(`Verified Quaternius rig: ${data.length} bytes, ${bones} bones, ${skinned} skinned meshes, ${triangles} triangles, ${model.animations.length} clips; independent animated skeletons and same-origin asset closure.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
