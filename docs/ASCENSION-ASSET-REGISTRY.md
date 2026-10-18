# Runtime asset registry

`data/ascension-assets.json` records measured geometry and source hashes for the
current original scene builders and the credited animated character. Regenerate it with `npm run assets:registry`
after changing model geometry. The registry executes only the project-authored
model-construction functions and parses the local GLB with Three.js; it creates no WebGL context and
contacts no external service.

| Asset | Source | Geometry / provenance |
| --- | --- | --- |
| Main player, creator, NPCs, citizens and actual peers | `CyberWorld/assets/cyberworld/models/Character.glb` | Quaternius Cyberpunk Game Kit, pack-specific CC0. 899,196 bytes, 7,520 triangles including the hidden sword, 25 bones, 10 skinned material meshes, 22 authored clips. Runtime uses Idle_Neutral, Walk and Run, with independent skeletons and palette materials for each avatar. This is one shared base model, not four different character meshes. |
| Sentinel, Ghost, Runner, Tinker fallback frames | `CyberWorld/src/ascension-world3d.js`, `makeProceduralAgent` | Original articulated procedural load/failure fallback. Exact measured mesh/material counts are in the registry. The fallback is removed after the real rig loads. |
| Reference skyline tower | Same file, `building`, dimensions 8×8×16 | Current reference shape is 952 mesh triangles. Facade windows use instancing; dimensions and window rows change the count. |
| Reachable venue facade | Same builder with interaction canopy/sign | Original modular building; exact current count and parameters are recorded in the JSON registry. Label sprites are counted separately. |
| Response arena, holographic nodes, tubes and moving packets | `CyberWorld/src/ascension-response3d.js` | Original procedural composition. The registry records primitive triangle counts; total live scene cost is measured with renderer counters. |
| Text labels, surfaces, rain and audio | Scene source / browser canvas and Web Audio | Generated in the browser; no downloaded texture pack or commercial game soundtrack. Rain/lines are not mesh triangles. |
| Supporting Plaza illustration | `CyberWorld/assets/cyberworld/ascension-plaza.webp` | Original generated supporting illustration. Provenance and prompt are documented in `ASCENSION-ART.md`; it is not the playable 3D environment. |
| Three.js 0.186.1 | Pinned npm dependency / `https://github.com/mrdoob/three.js` | MIT, copyright © 2010–2026 three.js authors. Full license is distributed in `CyberWorld/THIRD_PARTY_LICENSES.txt`. |

Triangle counts count indexed faces, multiply instanced meshes by instance
count, and exclude shadow/bloom/compositing passes. A Sprite label contributes
two presentation triangles separately. They are not renderer draw-call counts,
and lower triangle counts alone do not establish faster GPU performance.

The original procedural game models have no separate model-license declaration
in this repository. This registry records provenance and does not assign them
the rendering library's MIT license. No commercial-game model, character,
franchise environment or official agency seal is imported by these builders.

The imported character is separately credited to Quaternius. Pack/source URLs,
binary SHA-256, CC0 reference and current general license context are recorded in
`CyberWorld/assets/cyberworld/models/CHARACTER-LICENSE.md` and distributed with the
game. The source asset's unused sword is hidden; its mesh count remains included
in the conservative registry total. `node scripts/test_ascension_rig.cjs` verifies
the real GLB header/hash, no external texture or buffer fetch, required animations,
and independently cloned skeletons. Model-load failures preserve playable fallback
avatars and do not discard progress.

Performance captures and their exact browser/GPU/measurement limits are recorded
separately in `ASCENSION-PERFORMANCE.md` and `benchmarks/ascension-renderer.json`.
