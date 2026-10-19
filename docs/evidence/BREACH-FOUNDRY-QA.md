# Breach Foundry release verification

Local release checks completed October 18, 2026 on Windows. These results cover
the maintained source and its generated public mount; production verification
must also check the published Pages revision and actual live game.

## Checks

- Typecheck, scoped lint and static build passed.
- All 13 deterministic verification suites passed, including ten combat behavior
  groups and the exact 31-source/32-output public export contract.
- The full browser run passed all 20 tests in 5.8 minutes. The preceding download
  smoke and complete seven-case campaign checks also passed. This covers combat,
  Last Mile physical recovery, touch controls, actual peer discovery, offline
  installation, audio, field exploration, evidence downloads and save rollback.
- The generated `/play-cyberworld/` build installed exactly 24 public resources.
  A fresh synthetic operative continued after the local server was stopped and
  the browser went offline. The rigged arena rendered, ordinary keyboard input
  moved the operative and damaged a construct, and the downloaded practice kit's
  files matched their online versions byte for byte with independently checked
  ZIP CRC32 values. See `breach-foundry-offline-proof.json` and screenshot.
- Actual input selected the loaded rig's Punch_Right, Kick_Right and Roll clips;
  Overclock activated and no uncaught JavaScript error occurred. See
  `breach-foundry-animation-proof.json` and the associated pose screenshots.

The UI-driven combat test clears all eight constructs across three waves twice.
It checks the first reward, repeat-win idempotence, ZIP contents, score persistence
and reload. A separate touch run verifies movement, reachable ability targets,
real defeat and retry without losing campaign progress. No test grants health,
position, kills, cooldowns or rewards to manufacture a win.

## Review and limits

Independent review caught stale post-dodge model coordinates, repeated enemy clip
resets, a sideways strike arc, animation speed during Overclock and overwritten
damage-text fading. Those issues were corrected before the final build. Visual
playtesting also corrected the opening camera's portal occlusion and a phone
toast covering health. The final camera and phone screenshots were inspected.

`BREACH-FOUNDRY-PLAYTEST.md` records the full independent critique and an earlier
diagnostic-trace teardown timeout. The final controlled combat run and complete
browser run both exited successfully with the long combat coach's tracing off;
all gameplay assertions and explicit screenshots remained.

The fresh renderer sample is in `../ASCENSION-PERFORMANCE.md` and
`../benchmarks/ascension-renderer.json`. It measures the Plaza on this machine,
not sustained arena load or physical-phone thermals. The phone playtest is browser
emulation. This release is a stylized 3D action alpha, not a completed AAA MMO.

No executable from the supplied commercial-game archive was launched and no
archive code or assets enter the public deployment. The new arena, game rules
and fiction are original; the existing licensed character rig retains its credit.
