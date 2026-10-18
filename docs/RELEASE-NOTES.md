# CyberWorld / Black Freight — public 3D alpha

2026-10-18 · first playable production milestone, not the completed MMO vision.

## The Last Mile expansion

A new street contract asks operatives to protect a clinic supply line without
disconnecting essential services. Inspect three physical devices around the city,
corroborate an independent baseline and a service dependency, then operate the
continuity pedestal. Unsupported routing choices explain their consequences and
leave the investigation intact. Recovery requires preserving evidence, isolating
the affected uplink, restoring the verified lane and measuring the delivery.

The world responds: freight, fallback and clinic paths change state, device lights
and signs update, and the medical supply drone resumes its actual 3D route after
verification. Motion respects pause and reduced-motion settings. The contract
works alongside the original seven cases and survives save export/import. Its
evidence ZIP includes logs, CSV observations and blank offline notes; the earned
kit includes an original badge, Continuity Prism receipt and preserved field report.
Rewards use the existing idempotent receipt, so reloads and repeated downloads
cannot award duplicate XP, credits or modules.

## Playable in this release

The public entry is `/play-cyberworld/`, linked from the existing operator
desktop and public game aliases. A guest creates an operative, explores the 3D
plaza, talks to Agent Zero, enters SOC Tower and completes seven connected original
investigations. Operative creation, city/interiors and containment use actual WebGL
geometry. The camera follows from third person, supports mouse/touch orbit and zoom,
and avoids blocking geometry. Keyboard, touch and gamepad share the movement bridge.

The final art pass replaces primitive humanoids with a credited, locally bundled
Quaternius rig: 25 bones, actual idle/walk/run animations and independent skeletons
for the operative, citizens and connected peers. Outfit colors carry through the
3D creator. Visible posed vertices ground the feet; the unused sword is hidden.
An original adaptive synth score, footsteps, rain and server ambience respond
to movement, interiors and Overclock. Sound remains opt-in. Nearby characters
and entrances expose a visible, usable interaction prompt on desktop and phone.

The city includes an authored shop street, loading alley, scheduled citizen routes,
a walkable maintenance ramp and rooftop, a hidden archive, a quartermaster and a
three-repeater field route. Characters remember authored conversations locally.
Earned credits buy focus cells; Overclock slows simulated traffic and reveals paths.
CyberDeck tools reconstruct bytes, test bounds and calculate actual SHA-256 digests.
Containment preserves evidence, isolates the affected producer, rotates its token,
restores the trusted route and visibly verifies recovery. It is a 3D systems-recovery
simulation, not third-person action combat.

Every available case now offers an offline evidence ZIP, with a brief, original
artifacts and integrity manifest. Route Zero includes a valid six-record synthetic
PCAP plus CSV, JSON and endpoint logs. The evidence inspector selects files,
searches records and displays raw hex/ASCII offsets. Individual artifacts can be
downloaded directly. Filed cases unlock original badge SVGs, certificates and
module receipts; private notes and account data never enter those souvenirs.

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
  and nine deterministic suites pass. The build verifies local asset closure.
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

See [latest independent verdict](evidence/INDEPENDENT-PLAYTEST.md), [35-second actual gameplay](evidence/ascension-rig-walkthrough.webm),
[performance measurements](ASCENSION-PERFORMANCE.md), [asset registry](ASCENSION-ASSET-REGISTRY.md)
and [verification scope](ascension-verification.md). Desktop GPU numbers and phone
viewport emulation do not establish physical-phone or Safari performance.

## Remaining production gates

The current licensed character rig and procedural environment art are
below a modern AAA bar. Bespoke character variety, richer materials, spatial mission
staging, action encounters, cinematic bosses, production music and deeper authored
district life remain substantial work. Scripted game AI is not a live generative
NPC service. Presence is not authoritative co-op or an MMO server. Cloud identity
migration, moderation, large Operations, world streaming, full content editors,
Orbital Command and Mars Relay are future milestones.

The [studio contract](STUDIO-CONTRACT.md), [design guide](ASCENSION-DESIGN.md) and
[internal Quest Studio](../tools/quest-studio.html) establish interfaces and a content
review pipeline. They do not stand in for those unbuilt systems. Public copy must
describe this release as the first playable 3D alpha and avoid claiming the complete
AAA/MMO directive has been achieved.
