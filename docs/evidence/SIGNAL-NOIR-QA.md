# Beginner adventures and Signal Noir visual verification

October 27, 2026. Authored sources remain in `CyberWorld/`; the public runtime is
generated in `play-cyberworld/`. Original art and its full generation prompt are
documented in `../CYBERPUNK-ART.md`.

## What was reviewed

Desktop (1440 × 900) and phone viewport (390 × 844) captures cover the title,
animated operative creator, guided opening, Quick Play, Coach and combat briefing.
The new title art does not cover the operative preview or replace the playable
WebGL scene. Phone cards scroll within the dialog and appearance controls have
44-pixel targets. The new city decoration uses 14 draw objects for 687 details,
including two shared-art billboards and six original dossier signs.

The visual review found and corrected a real depth issue: solid sign backings
extended in front of the textured faces. Backings now end behind the faces.
Right-drag and touch orbit can also tilt the camera; its position stays above
the existing ramp and rooftop surface. Added context tests exercise actual mouse
input and camera clearance, rather than assigning camera or player positions.

An independent input review found controller shortcuts could run through the
new dialogs. Quick Play and combat preparation now block movement and shortcuts;
held buttons must be released before becoming new actions. Two regressions use
a virtual input device, with no gameplay state or health grants.

## Verification

- TypeScript, scoped syntax/lint, static build and all 14 deterministic suites pass.
- The final complete browser run passed 31/31 tests, plus the separate
  download-integrity and seven-case campaign helpers. This includes Blackout
  victory/replay, held mouse release, phone entry, all earlier combat profiles,
  beginner adventures, controller isolation, camera clearance and save rollback.
- The public contract contains 35 source files, 36 runtime files plus the deployment
  manifest, with 28 bounded offline resources (3.11 MiB).
- The exporter and checkout attributes preserve the original GLB and WebP bytes.
  Integrity tests compare actual bytes, hashes and sizes and reject extra files.
- With the server stopped and Chrome offline, the exact generated 28-resource
  snapshot rendered the rig, accepted ordinary combat input, completed First
  Light and all six Blackout targets, restored the relay and produced independently
  checked reward ZIPs. See `beginner-offline-proof.json` (snapshot
  `cw-ascension-play-d0e35450a4894856`).

The browser regression, offline proof and renderer benchmark reports accompany
this record. Screenshots are evidence of these viewport checks, not a claim of
AAA production quality or a physical-device performance measurement.

## Gameplay boundaries

Blackout Run now offers two-click action entry, three stages, six real opponents,
an independent once-only reward and a locally generated report/badge ZIP. The
rebuilt street encounter, hooded operative, actual punches and warning circles
were visually inspected at both viewport sizes. Its phone health, prompt and
action regions have verified clear gaps. See `../BLACKOUT-RUN.md` and the
`blackout-visual-proof.json` observations.

First Light, the five-spark hunt, three-stop drone delivery, visible-word color
matches and harmless sparring require player actions. Beginner progress and public
souvenirs survive existing save export/import; repeated wins cannot duplicate
XP, currency or gear. Practice cannot claim arena gear. Coach gives explained
clues while the player still verifies, recovers and files each investigation.

Agency references are thematic training labels. Equation and ShinyHunters are
optional primary-source dossiers, separate from the fictional campaign attackers;
Illuminate is explicitly original fiction. No agency endorsement or invented
attribution is implied.
