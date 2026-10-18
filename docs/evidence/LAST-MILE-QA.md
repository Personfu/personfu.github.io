# The Last Mile release verification

2026-10-18: the new street contract was played from a fresh operative using the
actual movement input and collision geometry. No positions, evidence samples or
rewards were granted by test setup. Three nearby E interactions recorded the
uplink, maintenance archive and clinic observations. Both unsupported plans and an
early verification attempt produced reversible feedback. The four ordered recovery
steps completed the contract and restarted a physically moving delivery drone.

Actual mission and earned reward ZIPs passed independent CRC32 and archive-directory
checks. A repeated download did not change credits, XP or inventory. Reload and
UI import into another fresh browser context retained the contract and exactly one
Continuity Prism. XP used the existing level progression; the 220-XP award is not
misreported as 220 XP remaining after the level-up.

The full regression run passed the seven-case campaign and 17 of 18 browser
scenarios. It caught an old phone HUD positioning rule placing the new contract
button over the case-file button. Separate normal-flow tap targets fix the overlap;
all three affected phone checks then passed (nearby interaction, field contract,
and the original evidence inspector/download). The field contract also passed its
desktop and 390px checks independently. The initial phone review led to a fixed
44px close control and an Accept button above the source cards.

Typecheck, lint, build and all 12 deterministic suites passed, including nine
model groups and six real-engine city/reward integration groups. These prove old
city progress survives migration, malformed new contract state repairs only that
contract, imports remain strict, and missing reward receipts recover once even
after a failed save. The exported file snapshot is exact and stays within its
22-resource / 2.49-MiB offline allowance.

A fresh Chrome 155 session installed the exact generated public mount, loaded ten
rigged characters, moved, saved notes, disconnected and reloaded the canonical game.
Both the original mission ZIP and new Last Mile evidence ZIP downloaded offline;
private case notes stayed out of the packs and the Credits link remained usable.
No local HTTP failures, page exceptions or authentication requests occurred.
`last-mile-offline-proof.json` records cache `cw-ascension-play-0c76eeada87bfc3d`.

The renderer benchmark was refreshed for the exact world bundle in
`../benchmarks/ascension-renderer.json`. These are desktop-GPU headless browser
measurements with phone viewport emulation, not physical-phone or AAA quality
guarantees. The independent tester found more spatial consequence from the devices
and delivery drone; the game remains a stylized alpha with overlay-heavy casework.

Screenshots: `last-mile-recovered-desktop.png`, `last-mile-delivery-world.png`,
`last-mile-phone.png` and `last-mile-offline.png`. Production is verified separately
after the reviewed release reaches Pages.
