# Breach Foundry

An original, real-time sparring encounter alongside CyberWorld's investigation
campaign. The player fights local training constructs in three escalating waves:
sentinels, shielded strikers, then a Warden with support. The encounter can be won
or lost through player actions. Defeat offers a fresh attempt without taking away
campaign progress or credits.

Movement, distance and timing determine the outcome. A quick three-hit sequence
produces a stagger and knockback. Disrupt breaks nearby shields; Evade physically
moves the operative and grants brief immunity; Overclock slows construct movement
and attack timers while the player's abilities remain on normal time. These
abilities use energy, regeneration and cooldowns. Ground telegraphs retain the
position selected at windup, allowing the player to move clear before impact.

The scene uses the credited Quaternius character rig's punch, kick, roll, hit and
death animations. A dodge can leave one short-lived, frozen snapshot of the actual
visible skinned pose. Enemy health/shield bars and bounded combat effects remain
part of the 3D arena. Reduced motion suppresses nonessential movement and effects
while keeping essential warnings legible. Settings pauses the encounter.

The world copies the operative's position and facing into the combat model at
arena start, before each ability command and after a completed dash. This pose
sync does not advance simulation time, so immediate follow-up attacks use the
actual position without shortening immunity, cooldowns or telegraphs.

Enemy clips hold their current action phase for its full duration rather than
restarting it each frame. Overclock advances enemy animation at 35% speed to match
their slowed simulation; the operative stays on normal time. The arena's opening
camera orbit uses a 0.55-radian offset to keep the foreground portal out of view.

Keyboard and mouse: WASD/arrows move, J or left click strikes, K disrupts, Space
evades, L/Q activates Overclock, right drag orbits. Touch supplies the movement
pad and four ability buttons. Gamepad maps A/B/X/Y to strike/evade/disrupt/Overclock.
The first victory awards 260 XP, 140 credits and PHASE-GAUNTLET through the existing
idempotent mission receipt. Further wins improve local score records. Best score,
win count and earned gear travel with the sanitized operative save. Active fights
are temporary; reloading returns to the city instead of resuming an unsafe frame.

The practice ZIP contains controls, counters and a blank practice log. The earned
ZIP contains an original badge, module receipt and achievement text. These are
local game souvenirs; private notes and authentication data are never included.

## Supplied archive

The provided `The Matrix - Path of Neo.zip` was inspected read-only. Its 5,200
entries include packaged game actors, native executables, DLLs and shader files;
it is a Windows game distribution rather than an editable browser application.
Its wrapper readme describes frame-rate-dependent timing problems, reinforcing
the decision to use bounded delta-time simulation and explicit pause tests here.
No executable was launched. No code or assets from the archive are redistributed
with CyberWorld. The encounter uses original code and the previously documented
licensed character asset.

All actions affect fictional local constructs, never real hosts or networks.
The defensive theme is layered observation, separation, containment and verified
recovery. The game remains an independent stylized alpha, not an official agency
product or a completed AAA MMO.
