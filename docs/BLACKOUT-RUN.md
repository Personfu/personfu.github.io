# Blackout Run

October 27, 2026. The main title now offers a direct action mission. Play Blackout
Run enters a local guest session; Start begins the encounter. New guests use a
hooded packet runner. Returning players keep their identity, inventory and saves.
Create Operative, the five gentle Quick Play activities and coached cases remain
available.

## Playable mission

Three short stages require six actual enemy defeats: intercept the breach, break
the malware shield and restore the relay. There is no technical quiz. Move with
WASD/arrows, hold J or left mouse/Punch to attack, Space to dodge, K to burst and
L to slow enemies. Shift sprints. On-screen controls support touch.

The action profile has 120 health, visible attack warnings, regeneration and
forgiving energy costs. Short assisted strikes close the final few steps through
the real collision checks. Hit pauses, restrained camera kick, layered strike
trails and locally synthesized percussion give attacks feedback. Reduced motion
suppresses camera impulses; audio stays opt-in. Doing nothing can still lose.

Victory awards 180 XP, 90 credits and Relay Runner once. The badge, mission report
and receipt download as an independently readable ZIP. Replays cannot duplicate
rewards or grant Phase Gauntlet. The three existing sparring profiles retain their
behavior and rewards.

## Actual world changes

The combat view is a wet street courtyard with layered building fronts, skyline,
shops, cables, servers, rain and three colored practical lights. The complete
movement square remains clear. Character outfits use original bone-attached
hoods, coats, vests and visors on the credited animated rig. City facades now have
window/interior-light, seam, vent and weathering textures; distant floating labels
are culled. The title illustration supports the game and is not a substitute for
its WebGL graphics.

This is an original fictional browser action game. Agency names and research
dossiers do not claim endorsement, real intrusions or agency attribution.

## Evidence

`tests/browser/blackout-action.spec.cjs` plays through actual stages and a repeat
win using movement, held punches and bursts, checks rewards and ZIP integrity,
and verifies two-tap phone entry and controls. It never changes health, positions
or completion flags. Screenshots and scene/UI observations are recorded under
`docs/evidence/blackout-*`. Deterministic combat tests also verify an imperfect
novice win, idle defeat, immutable profiles and objective/reward boundaries.
