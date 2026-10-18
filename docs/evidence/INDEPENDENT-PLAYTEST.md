# Independent CyberWorld play review

2026-10-18 · reviewed in installed Chrome with fresh browser contexts and service
workers blocked. Final renderer reviewed: `cw-ascension-public-3d-6dd0d98dfd775edb`.

**The opening loop passes as a playable stylized 3D alpha. This does not establish
AAA art, action combat, or MMO scale.**

## Actual play evidence

[Gameplay recording](ascension-rig-walkthrough.webm): 35.373 seconds, 1440 × 900,
VP8 WebM. Chrome captured the displayed viewport, including the HUD and dialogs;
native MediaRecorder encoded those frames. This is actual runtime play with the
local licensed character model, rather than an illustrated mockup. Sound is off
in the recording. The earlier procedural-character recording is historical and
is superseded by this file.

The recorded flow exercises A/W traversal, the new CyberDeck map through M,
Escape, Plaza Overclock, E near Agent Zero, SOC travel, right-drag camera orbit,
the first packet investigation, the five-step WebGL recovery, and filing the
debrief. It produced zero unhandled JavaScript errors, one completed case,
180 campaign XP and TRAFFIC-LENS.

The independent critique found and retested the legacy A shortcut, blank first
containment arena, mobile graphics override, missing touch camera, foreground
lamp, clipped lighting, ground z-fighting and oversized labels. Those defects
were corrected. A second focused review found that legacy styles hid the nearby
interaction prompt. The new prompt now identifies the target and provides a
working E button; it hides while a modal is open. Two browser regressions verify
desktop and phone placement, including clear space around the touch controls.

## Character and phone checks

The local Quaternius GLB loads for the creator, operative and ten scene characters.
Idle, walk and run animations are distinct; camera orbit and movement remain
responsive. Invisible sword geometry is excluded from character grounding.
The robot's narrow mechanical lower legs are part of the source design. The
geometry and animation are credited in the adjacent asset registry; they are not
claimed as original CyberWorld character art.

A forced 404 for `Character.glb` retains the procedural fallback and playable
movement, without unhandled exceptions. This verifies failure handling rather
than making the fallback the intended visual experience.

A fresh 390 × 844 touch context defaults to low graphics, displays a 3D creator
preview, and supports a real touch camera drag without moving the operative.
The interaction prompt remains above the E control and to the right of the D-pad.
Control hints are readable and explain camera movement. This is phone viewport
and input verification on desktop hardware, not testing on a physical phone.

## Screenshots

- [Title](rig-title.png), [creator](rig-creator.png), [Plaza](rig-plaza.png)
- [Overclock](rig-overclock.png), [SOC](rig-soc.png)
- [Containment](rig-containment.png), [recovery](rig-recovery.png), [reward](rig-debrief.png)
- [Phone creator](rig-mobile-creator.png), [phone world](rig-mobile.png)

## Remaining quality bar

The character rig and authored interface improve this alpha substantially, but
the city still uses a simple stylized material and environment kit. Repeated
building forms, limited character variety, spatial mission staging, richer
animation, layered sound and environmental storytelling remain high-value art
and design work. The mission's strongest quality is defensible evidence reasoning;
its encounter is a 3D systems recovery simulation, not third-person action combat
or a cinematic boss fight.

Crowd routes are scripted. Named-character memory is local authored state.
Presence is not authoritative cooperative gameplay. Cloud identity migration,
production content editors, broader regions and the full MMO remain future work.
The primary release process separately owns the complete campaign, persistence,
offline, route, performance and production-deployment gates.
