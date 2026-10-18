# Original art and browser rendering

The playable Ascension city, operative creator and containment arena use real Three.js/WebGL geometry. Buildings, lights, conduits and moving packets are authored by the game's source. The operative, creator, NPCs, citizens and actual peers use a credited local Quaternius animated character; the illustration below is not used as a flat substitute for the 3D world.

## Animated operative

The runtime character comes from [Quaternius's Cyberpunk Game Kit](https://quaternius.com/packs/cyberpunkgamekit.html), whose specific pack page and [original 2022 release](https://www.patreon.com/quaternius/posts/cyberpunk-game-68965667) identify it as CC0. The newer [general license](https://quaternius.com/license.html) also permits incorporating assets into finished games. CyberWorld credits the artist and does not claim to have authored the model or animations. See `CyberWorld/assets/cyberworld/models/CHARACTER-LICENSE.md` for the provenance, hashes and license context.

The self-contained 899KB GLB has 25 bones and 22 animations. The player crossfades between actual authored idle/walk/run clips; each avatar has an independent skeleton and recolored materials. The same rig appears in the creator and world. One base model is currently shared across roles; production character variety remains future art work. The unused sword attachment is hidden. The original procedural humanoids remain a load/failure fallback, replaced after the GLB loads. No CDN or external texture fetch is needed.

## Supporting illustration

`CyberWorld/assets/cyberworld/ascension-plaza.webp` is an original supporting illustration, generated with the built-in image-generation tool and compressed to WebP as an archived concept illustration. The unmodified generated master stays in the creator's local generated-images folder. No copyrighted game assets or official agency seals were supplied.

Prompt used:

> Use case: stylized-concept. Asset: clean playable background for an original browser cyberpunk roleplaying game CYBERWORLD. Create a beautiful premium pixel-art/isometric-near-top-down cyberpunk city plaza at midnight, ultra-wide landscape 16:9, coherent richly detailed hand-pixelated environment. Large spacious open walkable dark blue stone paved plaza in center and lower half, rain reflective neon cyan and amber puddles, tasteful purple accents, extremely dark midnight navy architecture with teal-lit windows and warm amber lanterns. Layout for interactable building positions: upper left academy glass-fronted building, top middle tall luminous emerald portal arch, upper right violet net-cafe pavilion; lower left/center at x32% y60% small amber-lit SOC operations building, right middle x84% y49% small cyan player lab booth, lower right x79% y70% beautiful blue map gate. High distant cybercity towers beyond the plaza. Central space at x50% y50% EMPTY and traversable. Flat ground fills 45% of scene. High quality crisp pixel art with substantial architectural depth. No characters, no people, no HUD, no user-interface, no menus, no counters, no stats, no text whatsoever, no readable lettering, no watermarks, no seals, no logos. Original game universe, no copyrighted characters. The scene itself fills the whole image edge-to-edge. Color grade cinematic midnight, restrained bloom, beautiful cyan reflections.

This illustration was created before the user requested the final fully 3D direction. It is retained as supporting CyberWorld art, excluded from the public offline runtime. Social previews show actual gameplay. Existing CyberWorld artwork remains archived without alteration.

## References

- The user's Path of Neo reference informs mission variety, progression and heightened awareness, not characters, dialogue, environments or assets.
- The user's browser-port discussion informs instant browser access. Ascension is original browser code, not a port or emulator of that commercial game.
- Historical research cards link directly to MITRE ATT&CK and carry retrieval dates; fictional campaign enemies are separate.

## Third-party rendering library

Three.js / Copyright © the three.js authors / MIT license. The dependency is pinned in the lockfile. Its package includes the complete license; the browser bundler preserves required legal notices.
