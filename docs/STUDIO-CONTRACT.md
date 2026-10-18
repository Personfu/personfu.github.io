# CyberWorld studio contract

Revision 1 · 2026-10-18 · opening production milestone: Cyber Plaza / Black Freight.

The destination is a persistent third-person cybersecurity universe. The release
gate for this iteration is an authored, replayable opening district and complete
investigation. Passing engineering checks alone does not establish visual quality
or MMO scale. Unbuilt regions and online systems remain explicit future work.

## Ownership and boundaries

| Studio responsibility | Owner / modules |
| --- | --- |
| Direction, integration, interface, release | Primary / ascension.html, ascension.css, ascension-shell.js |
| Rendering, environment, character, camera, animation, movement | World specialist / src/ascension-world3d.js |
| Cybersecurity, narrative, quests, containment, progression | Campaign specialist / ascension-data.js, ascension-campaign.js, src/ascension-response3d.js |
| Presence, offline lifecycle, performance, privacy | Network specialist / ascension-net.js, ascension-sw.js, build and performance tools |
| Independent player-experience critique | Critic / read-only playtest, screenshots and issue report |

Agents own separate modules and communicate before changing another module's
public interface. The critic must not initially author the component it reviews.
Production roles may share an owner within the available concurrent agent slots.

## Stable runtime bridges

- `__cwWorld`: open/close, toPlaza/toDistrict, refresh, snapshot, setMovement,
  interact, setOverclock, setReducedMotion, setGraphicsQuality, setSoundEnabled,
  createPreview. World positions are metres on X/Z; Y is elevation. Presence and
  minimap coordinates normalize `(x + 50) / 100`, `(z + 50) / 100`.
- `snapshot()`: view, district, world{x,z}, avatar, dimensions, focus, renderer,
  reducedMotion, overclock, diagnostics. Consumers must not mutate renderer state.
- `cw:action`: cancelable document event, detail `{action,target}`. Content may
  consume actions; the renderer owns geometry, collision and raycasting.
- `__cwGameplay`: state/refresh/replaceState, completeMission(id,reward), storageStatus.
  Reward IDs are stable and idempotent. Existing Academy saves remain compatible.
- `__cwAscension`: startMission/openDeck/talkZero/close, objective/state,
  exportState/importState/validateState/syncRewards, toggleOverclock.
- `__cwResponse3D.mount(canvas,getState,options)` returns a disposable encounter.
  The campaign owns the recovery sequence. The scene presents that state.
- `__cwAscensionNet`: start/stop, peers/status/me/onChange, publishPosition.
  Only actual connected sessions become peer avatars. No fabricated population.

## Data, saves and content

Keep stable mission, item and NPC IDs. Mission data carries the objective,
evidence, validator kind, hints, debrief, defensive lesson and reward. New content
uses registered validator kinds; arbitrary quest JavaScript never executes.
`cw.ascension.v1` stores campaign state; `cw.operative.v1` remains the shared
operative. Profile/settings/position use separate versioned keys. Preserve legacy
keys, snapshot before migration and report unavailable persistence. Export only
allowlisted game state, never account credentials. Import validates first, journals
the previous save, rolls back partial writes and synchronizes rewards once.

## Asset and visual standards

Original or appropriately licensed assets only. Registry entries identify source,
license, usage, geometry/texture costs and lifecycle. Runtime sources live under
`CyberWorld/src/`; compiled local bundles are the Pages deployment assets.
No commercial game rips. Geometry must read as a coherent place and character;
an engineering greybox is not accepted as the intended final art direction.
Use lighting, material response, signage, wear, moving inhabitants and purposeful
points of interest. Third-person play must retain visibility and readable controls.
Modals pause traversal. Reduced motion and lighter graphics remain playable.

## Performance and network budgets

Aim for 60 fps desktop / 30 fps mobile, then measure actual hardware and disclose
coverage. Cap pixel ratio, bound peers and 8 Hz movement publication, batch repeated
meshes, dispose unique GPU resources on district/encounter changes and stop hidden
scene work. The public offline snapshot is explicitly allowlisted and bounded to
12 MiB; downloading the whole future universe is prohibited. Never treat presence
as an authoritative combat/progression server. Authenticated co-op, moderation and
cloud saves require a reviewed backend contract before being claimed as shipped.

## Acceptance and critique loop

Build → run → play → observe → measure → critique → fix → repeat. Verify creator,
movement, camera, NPC interaction, all campaign validators, reversible containment,
reward/reload, bad saves, mobile controls, offline update, actual peers and legacy
routes. Capture title, character, street, interior and encounter frames. Record a
walk/interaction/Overclock/interior sequence. The independent critic reviews player
experience and identifies the highest-value defects. Resolve material issues before
release. Run typecheck, lint, build and relevant tests before every commit; verify
the actual production URL after publication. Never label the entire MMO complete
because one milestone passed.
