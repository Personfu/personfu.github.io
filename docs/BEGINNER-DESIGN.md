# Start with a little win

The October 27, 2026 update changes the first-time experience from technical
investigation to a short physical adventure. The player follows one marked
destination, walks through three collectible sparks and restores a beacon by
matching a word that remains visible. A wrong choice preserves progress and
explains the next action. Reading is never timed.

The title and creator use plain language. A new player sees one current goal,
movement instructions, distance and a glowing 3D trail. Unrelated mission labels
are hidden while this guided route is active. Explore freely restores the normal
HUD; Quick Play can resume unfinished First Light. Existing case progress is
preserved and returning investigators can choose the new jobs at any time.

## Short activities

| Adventure | Player action | First-win reward |
| --- | --- | --- |
| First Light | Walk, collect three sparks, match BLUE | 60 XP, 40 coins, Spark Companion |
| Spark Sweep | Find five physical collectibles | 70 XP, 35 coins, Spark Trail |
| Drone Delivery | Guide a following drone through three ordered pads | 60 XP, 30 coins, Courier Pin |
| Signal Match | Match five visible color words; mistakes are recoverable | 50 XP, 25 coins, Neon Switch |
| Safe Sparring | Learn attacks on one harmless stationary target | 30 XP, 15 coins, Training Token |

The original smiling orb companion follows the actual operative after First
Light. The courier drone also follows the operative during its route. Ground
markers, arrows and breadcrumbs are bounded; movement respects pause and reduced
motion. Color matching includes words and shapes rather than relying on hue.

Repeat city jobs update local win/best records without repeating XP, coins or
gear. Practice can be replayed freely but grants its token once. The existing
mission receipt makes rewards idempotent. All new progress lives in the sanitized
operative flags, so it participates in existing atomic export/import and rollback
without adding an independent save key. Older exports remain valid.

## Gentle combat and coached cases

Combat waits at a briefing before a match begins. Practice cannot damage the
player. Rookie is the default and has one opponent in its first round, 120 health,
longer attack warnings, lower damage, cheaper abilities, recovery after a break
and generous healing between rounds. Its four opponents can be beaten using
movement and ordinary held punches. Standard retains the original eight-opponent
challenge. Help freezes a running fight and resumes it in place.

All seven story cases default to Coach: one explained clue at a time, a small
glossary, explicit buttons to use a clue and a final navigation button to review
the actual finding. Real decoding, regression tests and hashes still execute.
The player verifies, recovers and files the case; the coach never fabricates
completion. Solo mode preserves the earlier manual approach. Feedback identifies
the missing clue and reassures the player that nothing was lost.

Downloadable beginner guides, a blank adventure journal and the First Light badge
are generated locally and work offline. Reward files whitelist public achievement
data and exclude case notes and account information. Every action remains inside
the fictional browser game. These additions improve the stylized alpha's opening;
they do not establish AAA production quality or authoritative MMO gameplay.
