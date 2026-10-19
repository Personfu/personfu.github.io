# Breach Foundry independent playtest

Tested on October 18, 2026 in Chrome on Windows, with a 1440 × 900 desktop viewport and a 390 × 844 touch-enabled phone viewport. The phone check is browser emulation, not a physical-device benchmark.

The final controlled run of `tests/browser/ascension-combat.spec.cjs` passed both tests, exit 0, in 2.2 minutes. The desktop test used real displayed abilities and keyboard input to clear all eight constructs across three waves twice. It verified movement, J without opening case notes, Overclock, pause in Settings, valid practice and reward ZIP CRCs, one-time XP/credits/gear, best-score persistence, and reload. The phone test operated the displayed movement pad, tapped Evade, checked four 44-pixel ability targets, allowed a real defeat, and retried at full health without losing campaign progress.

No test sets health, enemy state, position, cooldowns or earned rewards directly. The coach reads telegraphs and presses ordinary controls. Decorative external fonts are blocked for deterministic timing; local fallback fonts remain visible.

## Iteration findings

- The original phone city welcome toast covered the combat integrity meter. Combat now suppresses unrelated city toast overlays; the reward result remains visible.
- The original starting camera looked through the exit portal beam and obscured the avatar. The final world starts its arena orbit at 0.55 radians, and the redundant exit label was removed.
- The mobile launch button inherited an absolute-position rule and could overlap the street contract. Its explicit normal flow and 44-pixel target were restored.
- The first test spent too long on download/screenshot setup while the battle continued. The timed fight now starts fresh using Leave and Enter after the file checks. The model was not weakened.

## Trace teardown limitation

An earlier traced run passed every desktop gameplay assertion, including the second victory and reload, before the tracing/context cleanup stalled. Its final successful assertion began at trace time 89,703.71 ms; After Hooks began at 89,704.63 ms; Close Context began at 90,991.58 ms. Only context teardown timed out around 331,427.08 ms. The phone case also passed. This is not reported as a fully passing run.

The combat file now disables expensive per-action tracing for its long coach loop (more than 1,500 recorded calls); explicit screenshots and all behavioral assertions remain. The subsequent controlled run passed both tests and cleanup without increasing the deadlines. Other browser suites retain their normal trace settings.

## Quality assessment

This is an original, playable action-arena addition to the existing stylized 3D alpha. It has visible construct health/shields, amber attack tells, close-range combos, burst spacing, evasion, and an earned module with a downloadable souvenir. It is not a AAA action game or a full MMO. Further combat depth would benefit from more enemy attack patterns, authored traversal encounters, directional defense and more varied animation transitions.

The final untraced animation check also exited 0. Actual keyboard input selected `Punch_Right`, `Kick_Right` and `Roll` on the loaded character rig, and Overclock became active without a JavaScript error. The five final screenshots were inspected: the operative is visible beside the exit portal; the amber filled attack disc and cross are distinct from the cyan floor rings; the roll afterimage is visible. The clip check changes no combat state directly.

Evidence: `breach-foundry-live-combat.png`, `breach-foundry-victory.png`, `breach-foundry-phone.png`, `breach-foundry-final-camera.png`, `breach-foundry-punch.png`, `breach-foundry-kick.png`, `breach-foundry-roll.png`, `breach-foundry-telegraph.png`, and `breach-foundry-animation-proof.json`.
