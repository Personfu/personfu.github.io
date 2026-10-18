# CyberWorld / Codebreaker: Ascension

Content version: 1. Release target: public browser vertical slice, 2026-10-18.

**Pitch:** A playable cyber-city where the operative's superpower is visibility.
Explore the Grid, find a signal, build an evidence chain, contain the affected
system, and return with a better CyberDeck. Cinematic awareness and traversal
inspire the pacing; all characters, narrative, art, and code remain original.

## 1. Current state and preservation inventory

The repository is a static GitHub Pages site, with archived exported Next assets
and several independent game engines. There is no editable root Next application;
this release adds a scoped npm verification and Three.js bundling project. The canonical root `index.html` is a
working Win98 operator desktop. It must remain that desktop.

| Existing area | Actual state | Ascension treatment |
| --- | --- | --- |
| Root desktop, OPS BRIEFING, app windows | Working shell and ecosystem links | Add a public game launch; preserve shell and existing apps |
| `/CyberWorld/` | Separate project-site deployment overrides this repository's copied gateway | Integrate Ascension runtime in the project deployment; keep member subroutes distinct |
| `cyberworld.html`, `cyberworld-game.html` | Compatibility redirects | Preserve; do not silently repoint memberships |
| `CyberWorld/cw-world.js` | Substantial dormant canvas engine | Preserve legacy rendering; public 3D uses its compatible world API |
| `gameplay.js`, `cw-academy.js` | Missions, gear, XP, graded challenges | Preserve shared operative and Academy content |
| `cw-onboarding.js`, `cw-net.js` | Older account gate and cloud RPC client | Keep available; do not auto-load account gates for guests |
| `/rpg/`, `js/cyberworld-world.js` | Separate Phaser and DOM world engines | Preserve as legacy systems; avoid a fourth competing save |
| CTF Trail, Defender Path, Signal Vault | Separate public training experiences | Retain working routes; connect through clearly labelled portals |
| WarGames, RedOps, Signal Lab, arcade, simulator | Historical game modules; some member-routed | Inventory destinations before enabling district links |
| GovINT, Repo Atlas, FLLC, NASA/maker pages | Separate products and projects | Cross-links with purpose; retain distinct identity and routes |
| Root `sw.js` | Redirects member game routes to FLLC | Narrow exceptions for the public project home and Ascension entry |

### Duplication map and technical debt

- World navigation exists in the framework-free canvas engine, old Phaser RPG,
  DOM world map, and exported Next bundle. Ascension uses a dedicated Three.js
  source with the established world API; old compiled bundles are not edited.
- Progress is split among `cw.operative.v1`, `cyberworld-player`, `cw_profile`,
  CTF progress, Academy completions, and training badges. Preserve these records;
  introduce campaign-specific state rather than claiming all formats are unified.
- The old `kind: instant` missions award XP on click. Ascension's graded evidence
  and ordered response workbench is the authoritative local campaign completion
  path; old drills retain compatibility.
- Academy writes shared storage directly; gameplay previously retained stale
  memory. The engine now refreshes external changes and merges locally changed
  fields before saving. All new campaign rewards use an idempotent mutation API.
- The old canvas has two `drawSectorView` declarations. Preserve behavior in this
  release; consolidate behind rendering regression coverage later.
- Older README/design documents describe a convoy game. This document describes
  Ascension without erasing those earlier modes.

## 2. What this release builds

The public entry boots without an account. An operative chooses a handle, neon
signature, and specialization, enters Cyber Plaza, meets Agent Zero, opens a
CyberDeck, and enters SOC Tower. Seven connected original cases support a graded
first mission and a complete local campaign arc. The first case combines packet
timing, sequence reassembly, hexadecimal decoding, corroborating endpoint evidence,
and reversible containment. Evidence, notes, gear, XP, and completion survive reload.

The public scene is now a true Three.js/WebGL 3D world: perspective camera, original
geometric buildings and articulated operatives, collision, raycast click-to-walk,
real-time lighting/shadows, volumetric city layout, and dimensional SOC/Academy/Lab
interiors. The old canvas world remains archived for legacy routes. Agent creation
uses the same 3D operative model on a separate renderer/pedestal. Overclock slows
simulated traffic to 20% and reveals spatial evidence paths. Containment is a separate
interactive WebGL network scene with ordered defensive decisions. No action targets
a real host. An Academy exercise and packet arcade are CyberDeck activities.

Guest presence shares only public handle/appearance and position data. It connects
through public Supabase Realtime and falls back to an honestly labelled same-browser
channel or solo mode. Other operatives use actual peer positions, not invented
population counts. This is a social vertical slice, not an authoritative MMO server.

## 3. Story bible and campaign map

**Black Freight:** Signed freight manifests disagree with deliveries. A trusted
package crossed a policy boundary. The player reconstructs the first evidenced
divergence while preserving essential city deliveries. The enemy is uncertainty,
not a nationality. Morrow Exchange is a fictional access broker; infrastructure
overlap does not establish a state sponsor.

Agent Zero coordinates the case. Nova protects service continuity. Hex studies
cryptographic trust. Sable preserves evidence. Mira challenges source confidence.
Patch engineers recovery. Orbit coordinates defensive exercises. These original
offices can teach agency-inspired disciplines without implying agency endorsement
or player employment. Game badges are independent achievements, not official awards.

| Case | Playable reasoning | Reward capability/theme |
| --- | --- | --- |
| Route Zero | Periodic source → sequence order → hex → corroboration → containment | Traffic Lens / packet evidence |
| A Trusted Package | Compare signature and vendor-origin policy | Static Diff / trust boundaries |
| Roads Without Cities | Authoritative DNS vs unexpired cached answer | Resolver Map / avoid false positives |
| The Machine That Repeats | Recover toy plaintext using reused-keystream XOR | Cipher Prism / nonce discipline |
| Bounds of Trust | Repair and exercise an integer/range predicate | Boundary Guard / safe parser validation |
| The Dependency | Compute SHA-256 and locate first preserved artifact mismatch | Provenance Lens / chain of custody |
| Hold the Grid | Order the technical chain, retain uncertainty, contain and verify | Grid Keeper / coordinated recovery |

Debriefs state the observation, the defensive counter, confidence limits, and the
next unresolved question. Hints are progressive; reading is not timed. Failure is
reversible and cannot destroy the player's campaign. Rewards occur after a verified
case is filed, once per case, even after reload.

## 4. World and progression

Cyber Plaza is the social entry. SOC Tower holds case evidence and response.
Academy is the training hall; Player Lab displays identity and earned gear. The
Grid map connects existing destinations only when reachable and tested. Later
districts include Signal District, Archive, Codebreaker Annex, Network Core,
Identity District, Cloud Spire, Hardware Alley, Undergrid, and Orbital Command.
Names on a map do not count as implemented interiors.

Factions remain GHOSTNET, IRONWALL, NULLSEC, and DAEMON. Specializations express
identity; they do not prevent players from solving the campaign. Current progression
is operative level/XP, credits, case badges, and item unlocks. Large skill trees,
crafting, player housing customization, squads, and competitive ranks require later
playable systems; cosmetic names must not pretend to implement them.

## 5. Technical architecture and extension contracts

The static entry loads gameplay → Academy → guest network → bundled Three.js world
→ scenario data → 3D response renderer → campaign → shell. No install, billing,
login, external target, or server runtime is
required for the local mission loop. Styles are additive and scoped to Ascension.

| Module | Responsibility |
| --- | --- |
| `ascension.html`, `ascension.css`, `ascension-shell.js` | Entry, title, creator, shell HUD, input, settings |
| `src/ascension-world3d.js` → `ascension-world3d.js` | Public Three.js city/interiors, original operative, movement/collision, scene transitions, spatial Overclock, 3D creator |
| `cw-world.js` | Archived compatible canvas engine for legacy routes |
| `gameplay.js` | Shared operative state, XP, credits, inventory, idempotent rewards |
| `ascension-data.js` | Versioned authored cases, artifacts, hints, debriefs, defensive counters |
| `ascension-campaign.js`, campaign CSS | Case validation, response sequence, journal, CyberDeck, local campaign save |
| `src/ascension-response3d.js` → `ascension-response3d.js` | Interactive 3D containment graph and response feedback |
| `ascension-net.js` | Ephemeral guest identity, normalized position, real presence and fallback labels |

World actions dispatch cancellable `cw:action` on `document` with
`{action,target}`. Campaign handlers call `preventDefault()` to own `npc:zero`,
`ascension:mission`, or a specific mission action. Scene changes emit bubbling
`cw:view` with `{view,district}`. `__cwWorld` preserves legacy methods and adds
`snapshot()`, `setMovement(x,y)`, `interact()`, `setOverclock(active)`, and
`setReducedMotion(active)`.
Movement uses elapsed time, pauses under game dialogs, and clears when focus is lost.
Reduced motion honors both the explicit setting and OS changes: ambient clocks,
particles, pulses, flashes, and Overclock traffic animation stop while movement,
interaction, real peer position updates, and static evidence paths remain available.
The 3D API also exposes `createPreview(canvas,profile)`, `setSoundEnabled(on)`,
`setGraphicsQuality(preset,custom)`, and measured renderer diagnostics. Snapshots retain
the shell's screen-coordinate minimap contract and add explicit world x/z coordinates.
Repeated static geometry is instanced; removed scene resources are disposed. The city
renderer keeps a still background while an interactive response/creator renderer is
active, avoiding two expensive moving scenes at once.
Guest x/y coordinates are normalized to viewport dimensions and published at a
bounded rate by the network adapter; remote avatars render only in a matching zone.

`__cwGameplay.refresh()` reloads the latest sanitized operative.
`completeMission(id,{xp,credits,item,title})` returns `true` only for a newly awarded
completion. The campaign never derives a real entitlement from this client result.
`replaceState(next)` installs a sanitized local or session-only record;
`storageStatus().persistent` reports whether durable storage succeeded. Blocked
storage retains operative progression in memory so it can still be exported.

### Content schema

Current data is a JavaScript object with `version`, campaign identity, `factions`,
`liaisons`, `codex`, and `missions`. Each mission has a stable `id`, `act`, `kind`,
title/brief/objective, skill/NPC, synthetic artifacts, progressive `hints`, `reward`,
badge, `debrief`, `defense`, codex references, and optional `containment` stage.
Artifact fields vary by kind: packets/logs, code diffs, DNS records, toy cipher bytes,
parser predicate, provenance bytes/digest, or ordered observations. Validators must
check the evidence relationship, not just a nearby completion button.

Future authoring adds explicit `content_version`, dependency IDs, localization keys,
accessibility descriptions, difficulty, expected duration, and migration functions.
Validate IDs and references in CI before community content is accepted. Do not load
untrusted remote JavaScript as a quest format.

## 6. Save migration and recovery

| Record | Policy |
| --- | --- |
| `cw.operative.v1` | Retain identity, inventory, completions, XP, and unknown legacy fields |
| `cw.net.v1`, `cw.device.v1`, `cw.onboarding.v1` | Preserve; guests do not impersonate authenticated identities |
| `cw.ascension.v1` | Separate versioned campaign state; stable case IDs and reward guards |
| `cw.ascension.profile.v1`, `cw.ascension.settings.v1`, `cw.ascension.position.v1` | Local identity presentation, user preferences and district restore; no authentication credentials |
| `cyberworld-player`, `cw_profile` | Detect for an explicit one-click import later; never silently replace |
| Story/CTF/training keys | Keep independent; badges are imported only with a defined mapping |

Malformed JSON or invalid numeric/collection fields recover to safe defaults without
rewriting a save merely on load. Unknown operative fields survive normal mutations.
Shared Academy writes refresh before subsequent gameplay rewards. Other-tab writes
are reflected through the storage event. Reloading a filed case cannot duplicate XP
or gear. A storage failure must be displayed; do not claim durable persistence when
only the current session is retained. Settings provide a versioned JSON export/import
with bounded file/schema validation and a pre-import backup. Account tokens and
sessions are excluded. Import replaces the selected local game records explicitly.

## 7. Interface, art, sound, mobile, accessibility

Keep the original neon-on-midnight identity and operator desktop. The Ascension
presentation has a dedicated original city scene, readable labels and NPC silhouettes,
compact sector navigation, objective, radio, minimap, operative card, and CyberDeck.
UI text stays DOM-rendered; spatial labels use local text textures on 3D signs.
High-contrast text/shape cues
accompany color. Generated art is original visual dressing, not a license to copy
another game's map, characters, logos, or assets.

Desktop: WASD/arrows and click-to-walk; Shift runs; E interacts. The shell exposes
CyberDeck, journal, inventory, and Overclock. Touch: compact directional pad, interact,
CyberDeck, Overclock; no hover-only task. iPad landscape is a primary layout target.
Menus need labelled buttons, visible focus, modal focus containment, Escape/back,
and text alternatives for mission graphs. Canvas action must have equivalent DOM
choices for case completion. Reduced motion must reduce nonessential motion/flashes.
Sound starts after a user gesture and can be muted. Basic Gamepad API input maps
the left stick to movement and A/X/Y to interaction/Overclock/CyberDeck; physical
controller/browser coverage still needs verification. Full input remapping,
audio category sliders, localization, and comprehensive screen-reader traversal of
the spatial world remain later work, not release claims.

## 8. Security, privacy, and performance budgets

All investigation bytes, addresses, tokens, tools, commands, and response targets
are fictional local state. No raw sockets, host scanning, exploit generation, or
external traffic capture is added. Public GitHub/source links are navigation or
read-only references. Never wire `msf-service`, PNG/QR payload labs, or live tools
to campaign actions. Every case includes its defensive counter and confidence limit.

Peer metadata is untrusted display data: sanitize text/color, clamp coordinates,
bound peers/messages, expire stale sessions, and separate zones. Guests publish
handles, never emails, auth tokens, billing state, location, or real identity. They
cannot award remote XP, change someone else's save, or grant membership. Public
position presence is not moderation-ready global chat. Do not re-enable unrestricted
chat until mute/block/report, rate limits, and operator moderation exist.

| Budget/guard | Target for this slice |
| --- | --- |
| Critical first download | ≤ 2 MB compressed including original city artwork; measure before release |
| Rendering | Aim 60 fps desktop, 30 fps midrange mobile; cap delta after backgrounding |
| Network position | At most 8 publications/second; coalesce frames and bound peers to 128 |
| Optional services | Local mission remains playable when presence/fonts are unavailable |
| Scenario execution | No `eval`, remote quest code, production secrets, or real target connections |
| Persistence | User-visible failure; idempotent case rewards; preserve legacy fields |
| Asset routing | Same-origin static assets; scoped public route exception, no broad SW rewrite |

These are acceptance budgets, not measured device benchmarks. Profile request size,
frame pacing, long tasks, touch targets, and memory before asserting cross-device
performance. Avoid synchronous network work in the render loop.

## 9. Phased expansion and ecosystem integration

1. **Release the slice:** reachable public game, complete first case, original city,
   seven-case local progression, truthful guest presence, save/reload, tests/screenshots.
2. **Deepen the city:** interactive district interiors, NPC memory, progression choices,
   equipment behavior, housing, sound layers, accessibility and mobile device coverage.
3. **Expand Codebreaker:** longer evidence chains and alternate solutions; forensic,
   SOC, sysadmin, IAM, cloud, hardware and OSINT arcs. Keep reusable case schemas.
4. **Add cooperative and orbital play:** squads and shared incident goals first;
   telemetry integrity, clock/units puzzles, constellation routing, and Mars Relay next.
5. **Authoring/live operations:** reviewed community contracts, season content,
   moderation, recovery tools, and an internal quality/incident dashboard.

FLLC is an optional identity and professional intelligence connection. Preserve
distinct domains and products. Cloud saves require supported OAuth/Supabase flows,
explicit account linking, per-user RLS, and server validation. Never pass raw tokens
in URLs or manufacture cross-domain login. Paid features and competitive state must
be decided server-side. A future schema can separate profiles, operatives, quest
progress, inventory, achievements, housing, parties, chat, mission logs and settings;
this release does not claim those tables were created.

GovINT becomes an Archive portal teaching records provenance and source confidence.
Use supplied/public research with explicit source and freshness labels, and synthetic
identities for puzzles. Preserve GovINT routes; do not silently turn a research query
into a game action or vice versa. PersonFu research and Repo Atlas become optional
context terminals, not unsolicited data collection.

NASA/ASCEND and maker projects inspire Orbital Command, balloon telemetry, sensor
calibration, RF propagation, printable payload tradeoffs and a lab hardware bench.
Use simulated telemetry and units/uncertainty lessons. Real hardware operation,
aerospace safety decisions, physical targeting, and drone control are out of scope.

## 10. QA and release acceptance

Automated state contracts: `node scripts/test_ascension_engine.cjs`. Network and
campaign suites exercise peer fallback, validators, ordered response, reward guards,
and save normalization. Existing desktop, Signal Vault, Defender Path and service
worker route suites remain part of regression checks. Syntax-check changed scripts.
The static build now bundles pinned Three.js sources using esbuild and validates the
deployment closure/offline snapshot. This is a genuine static build, not a Next
application rebuild. Use the root package scripts for typecheck, lint, and build.

| Scenario | Required evidence |
| --- | --- |
| Fresh anonymous player | Title → creator → plaza; no login gate |
| First mission | Agent Zero → SOC evidence → correct finding → containment → filed reward |
| Learning | Incorrect finding stays incomplete; hints/debrief explain why |
| Overclock | Actual traffic slowdown and revealed evidence; deactivation restores timing |
| Persistence | Reload resumes case; filed reward stays single; legacy gear remains |
| Controls | Keyboard, pointer and touch can reach the same core loop; modal focus pauses movement |
| Presence | Two real sessions see peer positions; offline/fallback labels remain honest |
| Storage/network failure | Session continues where possible and reports actual persistence/connectivity |
| Service worker | Ascension stays public; FLLC member routes and scoped CTF worker retain behavior |
| Visual/routes | New art and every linked local asset load; shell pages still reachable |

Before production sign-off, test Chrome/Edge, Firefox, Safari, iOS Safari, Android
Chrome and iPadOS; fresh/legacy saves; offline/slow network; presence unavailable;
and service-worker update behavior. Record which devices were actually tested.
Publish screenshots of title, plaza, evidence and containment. A preview or local
test is not proof of production deployment. Release notes must distinguish verified
shipping behavior, known limits, and roadmap work. Never call this a finished MMORPG
because a district card or an online counter exists.
