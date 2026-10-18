# CyberWorld / Black Freight — public 3D alpha

2026-10-18 · first playable production milestone, not the completed MMO vision.

## Playable in this release

The public entry is `/CyberWorld/ascension.html`, linked from the existing operator
desktop and public game aliases. A guest creates an operative, explores the 3D
plaza, talks to Agent Zero, enters SOC Tower and completes seven connected original
investigations. Operative creation, city/interiors and containment use actual WebGL
geometry. The camera follows from third person, supports mouse/touch orbit and zoom,
and avoids blocking geometry. Keyboard, touch and gamepad share the movement bridge.

The city includes an authored shop street, loading alley, scheduled citizen routes,
a walkable maintenance ramp and rooftop, a hidden archive, a quartermaster and a
three-repeater field route. Characters remember authored conversations locally.
Earned credits buy focus cells; Overclock slows simulated traffic and reveals paths.
CyberDeck tools reconstruct bytes, test bounds and calculate actual SHA-256 digests.
Containment preserves evidence, isolates the affected producer, rotates its token,
restores the trusted route and visibly verifies recovery. It is a 3D systems-recovery
simulation, not third-person action combat.

XP, credits, modules, notes, discoveries and conversation memory persist locally.
Versioned exports exclude private account data. Imports validate before writing,
journal prior values and recover from interruption. Mission receipts and rewards
save together. Storage failure keeps a playable session available for export.

Actual guest presence uses the existing public Realtime project, with truthful
same-browser/solo fallbacks. No authenticated account, table or entitlement was
changed. The scoped offline worker installs a complete bounded public snapshot;
an update applies only after an explicit verified save. Legacy training pages,
archived engines and FLLC member gateways remain preserved.

## Build, playtest and critique evidence

- TypeScript compatibility/bridge checks, scoped syntax/security lint, static build
  and seven deterministic suites pass. The build verifies local asset closure.
- The actual Chrome campaign test completes all seven acts, with incorrect-answer
  checks, reversible recovery, tool outputs, reload resume and idempotent rewards.
- Browser coverage includes creator, movement, graphics settings, modal pause,
  phone layout, genuine peer discovery/departure, offline reload, explicit patch
  application, legacy-save preservation, export/import and storage-failure recovery.
- The physical field-route test walks to all three repeaters, climbs the ramp,
  discovers the rooftop relay, earns modules, buys a focus cell and checks reload.
- An independent critic rejected the first presentation and found a legacy A-key
  interception and a first-frame spline failure. Both were fixed. Subsequent work
  corrected label occlusion, coplanar shimmer, camera obstruction, excessive glow,
  mobile camera input and HUD dominance. The final opening has no unhandled errors.

See [independent verdict](qa/independent-critique.md), [33-second actual gameplay](qa/opening-gameplay.webm),
[performance measurements](ASCENSION-PERFORMANCE.md), [asset registry](ASCENSION-ASSET-REGISTRY.md)
and [verification scope](ascension-verification.md). Desktop GPU numbers and phone
viewport emulation do not establish physical-phone or Safari performance.

## Remaining production gates

The original procedural character/environment art and rigid-part animation are
below a modern AAA bar. Bespoke production rigs, richer materials, spatial mission
staging, action encounters, cinematic bosses, dynamic music and deeper authored
district life remain substantial work. Scripted game AI is not a live generative
NPC service. Presence is not authoritative co-op or an MMO server. Cloud identity
migration, moderation, large Operations, world streaming, full content editors,
Orbital Command and Mars Relay are future milestones.

The [studio contract](STUDIO-CONTRACT.md), [design guide](ASCENSION-DESIGN.md) and
[internal Quest Studio](../tools/quest-studio.html) establish interfaces and a content
review pipeline. They do not stand in for those unbuilt systems. Public copy must
describe this release as the first playable 3D alpha and avoid claiming the complete
AAA/MMO directive has been achieved.
