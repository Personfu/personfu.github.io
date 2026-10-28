// Original runtime materials and clothing. No external images or character data.
export function createFacadeSurface(THREE, accent) {
  const canvas = document.createElement('canvas'), lights = document.createElement('canvas');
  canvas.width = lights.width = 512; canvas.height = lights.height = 1024;
  const p = canvas.getContext('2d'), e = lights.getContext('2d');
  p.fillStyle = '#263342'; p.fillRect(0, 0, 512, 1024);
  e.fillStyle = '#000000'; e.fillRect(0, 0, 512, 1024);
  let seed = accent >>> 0;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const hue = '#' + accent.toString(16).padStart(6, '0');
  for (let row = 0; row < 24; row++) for (let col = 0; col < 12; col++) {
    const x = col * 43, y = row * 43;
    p.fillStyle = row % 4 === 0 ? '#101d2b' : '#344351'; p.fillRect(x, y, 42, 42);
    p.fillStyle = '#09141f'; p.fillRect(x + 5, y + 5, 32, 30);
    p.fillStyle = '#577080'; p.fillRect(x + 4, y + 35, 34, 2);
    if (random() > .40) {
      const color = random() > .74 ? '#d5b582' : random() > .46 ? '#a0c2ce' : hue;
      e.fillStyle = color; e.globalAlpha = .14 + random() * .48; e.fillRect(x + 7, y + 7, 28, 25); e.globalAlpha = 1;
      p.fillStyle = '#69848d'; p.globalAlpha = .3; p.fillRect(x + 7, y + 7, 28, 25); p.globalAlpha = 1;
      if (random() > .55) { e.clearRect(x + 20, y + 7, 3, 25); p.fillStyle = '#13232d'; p.fillRect(x + 20, y + 7, 3, 25); }
      if (random() > .7) { e.clearRect(x + 7, y + 16, 28, 3); }
    }
    if (col % 5 === 0 && row % 3 === 0) {
      p.fillStyle = '#586572'; p.fillRect(x + 10, y + 26, 23, 10);
      p.fillStyle = '#121f2a'; for (let n = 0; n < 4; n++) p.fillRect(x + 12, y + 28 + n * 2, 19, 1);
      e.clearRect(x + 10, y + 26, 23, 10);
    }
  }
  // Small stains, seams and conduits break up clean repeated window grids.
  p.strokeStyle = '#101c28'; p.lineWidth = 3;
  for (const x of [85, 303, 470]) { p.beginPath(); p.moveTo(x, 0); p.lineTo(x, 410); p.lineTo(x + 15, 430); p.lineTo(x + 15, 1024); p.stroke(); }
  for (let n = 0; n < 650; n++) { p.fillStyle = random() > .5 ? '#a2b5c008' : '#00000018'; p.fillRect(random() * 512, random() * 1024, 1 + random() * 9, random() * 20); }
  const map = new THREE.CanvasTexture(canvas), emissiveMap = new THREE.CanvasTexture(lights);
  for (const texture of [map, emissiveMap]) { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; }
  return new THREE.MeshStandardMaterial({ color: 0x9daab4, map, emissiveMap, emissive: 0xffffff,
    emissiveIntensity: .72, roughness: .67, metalness: .28 });
}

export function dressOperative(THREE, rig, config) {
  const head = rig.getObjectByName('Head'), chest = rig.getObjectByName('Chest'), hips = rig.getObjectByName('Hips');
  if (!head || !chest) return;
  const dark = new THREE.MeshStandardMaterial({ color: 0x111b27, roughness: .86, metalness: .06 });
  const cloth = new THREE.MeshStandardMaterial({ color: config.frame === 'ghost' ? 0x141b2a : 0x233344, roughness: .8, metalness: .1 });
  const trim = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 1.1, roughness: .3, metalness: .65 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x071623, roughness: .18, metalness: .8 });
  function mesh(parent, geometry, material, x, y, z, scale) {
    const value = new THREE.Mesh(geometry, material); value.position.set(x, y, z);
    if (scale) value.scale.set(...scale); value.castShadow = config.castShadow !== false; parent.add(value); return value;
  }
  const wardrobe = new THREE.Group(); wardrobe.name = 'Original streetwear'; head.add(wardrobe);
  if (config.frame === 'ghost' || config.frame === 'runner') {
    mesh(wardrobe, new THREE.SphereGeometry(1, 18, 12, Math.PI * .84, Math.PI * 1.32, 0, Math.PI * .83), cloth, 0, .105, -.005, [.17, .20, .18]);
    const collar = mesh(chest, new THREE.CylinderGeometry(.15, .17, .11, 12, 1, true), dark, 0, .15, .015); collar.rotation.x = .12;
    if (hips) {
      for (const side of [-1, 1]) {
        const flap = mesh(hips, new THREE.BoxGeometry(.17, .43, .055), cloth, side * .13, -.15, -.07);
        flap.rotation.z = side * -.16; flap.rotation.x = -.09;
        mesh(flap, new THREE.BoxGeometry(.008, .32, .008), trim, side * .061, -.015, -.031);
      }
    }
  }
  // A dark faceplate and a narrow light strip make the silhouette legible at
  // gameplay distance; the original animated body remains visible and posed.
  mesh(wardrobe, new THREE.SphereGeometry(1, 16, 8), glass, 0, .12, .105, [.13, .065, .055]);
  mesh(wardrobe, new THREE.BoxGeometry(.21, .011, .012), trim, 0, .13, .157);
  mesh(chest, new THREE.BoxGeometry(.25, .27, .045), cloth, 0, -.015, .10);
  mesh(chest, new THREE.BoxGeometry(.16, .21, .035), dark, -.09, .015, .14);
  mesh(chest, new THREE.BoxGeometry(.013, .13, .01), trim, -.15, .015, .165);
  mesh(chest, new THREE.BoxGeometry(.07, .026, .018), trim, .11, .07, .15);
}
