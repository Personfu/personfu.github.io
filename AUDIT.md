# CyberWorld Content-Complete Audit (Epic 10)

Generated against `claude/lucid-rubin-BelW0`. Each desktop icon maps to a
verified, non-stub feature.

## Desktop icon → feature map

| Icon                | Target                  | Status | Notes                                                       |
|---------------------|-------------------------|--------|-------------------------------------------------------------|
| HANGAR 3D           | `hangar.html`           | LIVE   | App shell loads `js/hangar-static.js` (27 KB) — 22 embeds   |
| SIMULATOR           | `simulator.html`        | LIVE   | Redirects to `/CyberWorld/` (math viz integrated in-engine) |
| CTF TRAIL           | `ctf-trail.html`        | LIVE   | 12 challenges, 4 categories, flag submission (37 KB)        |
| WARGAMES ACADEMY    | `wargames.html`         | LIVE   | 10 progressive challenges (40 KB)                           |
| SIGNAL LAB          | `signal-lab.html`       | LIVE   | 6 packet analysis exercises (16 KB)                         |
| FORENSICS LAB       | `forensics.html`        | LIVE   | 5 forensic investigations (21 KB)                           |
| REDOPS ARENA        | `redops.html`           | LIVE   | 5 scoped red-team scenarios (23 KB)                         |
| INTEL DESK          | `intel.html`            | LIVE   | 5 OSINT exercises (15 KB)                                   |
| ADVERSARIES         | `adversaries.html`      | LIVE   | 12 fictional threat-actor profiles (18 KB)                  |
| RESEARCH VAULT      | `research.html`         | LIVE   | 6-section knowledge base (15 KB)                            |
| AI ARSENAL          | `ai.html`               | LIVE   | 5 AI/automation exercises (28 KB)                           |
| NODES               | `nodes.html`            | LIVE   | 20-node interactive topology canvas                         |
| ARCADE              | `arcade.html`           | LIVE   | 4 minigames (13 KB)                                         |
| GAMES HUB           | `games.html`            | LIVE   | Hub linking all modules                                     |
| CYBEROS ISO         | `cyberos-iso.html`      | LIVE   | Defense-in-depth configurator (11 KB)                       |
| DOGFIGHT DECK       | `dogfight.html`         | LIVE   | Redirects to `dogfight-legacy.html` (9.9 KB)                |
| DISCUSS             | `discuss.html`          | LIVE   | 12 in-world forum threads (12 KB)                           |
| CYBERWORLD CODEX    | `cyberworld-codex.html` | LIVE   | Lore encyclopedia (33 KB)                                   |
| STARS               | `stars.html`            | LIVE   | 12 achievements verified vs save data                       |
| PROFILE             | `profile.html`          | LIVE   | Operative dossier with export / import                      |

## Engine surface (CyberWorld/)

| Layer        | Status | Notes                                                        |
|--------------|--------|--------------------------------------------------------------|
| Phaser game  | LIVE   | Compiled Next.js export; canvas runtime intact               |
| augment.js   | LIVE   | Runtime patches: RESIZE scale, camera follow, label fix,     |
|              |        | ambient drones, WebGL-fail fallback                          |
| augment.css  | LIVE   | Responsive HUD, 960px / 600px breakpoints                    |
| gameplay.js  | LIVE   | 6-tab console, 16 daemons, 22 missions, 3-act narrative,     |
|              |        | loader, pause menu, settings, procedural audio               |
| gameplay.css | LIVE   | Console, loader, pause, settings styles                      |

## Tests

| File                                | Status | Coverage                                       |
|-------------------------------------|--------|------------------------------------------------|
| `tests/combat-math.test.js`         | 20/20  | Damage, noise, SOC strike, XP curve, rep, HP   |

Run with `node tests/combat-math.test.js`.

## Known deferred items (require infrastructure outside this repo)

- **Epic 2** Monolith refactor — needs the Next.js source repo, not the export
- **Epic 3** Tilemap-level world detail — same
- **Epic 7** Colyseus / Supabase — runtime servers, separate deploys
- **Epic 9** Texture atlases, lazy-load per district — Next.js source needed

All other backlog items in EPIC 0/1/4/5/6/8/10 are complete and shipped on
this branch.
