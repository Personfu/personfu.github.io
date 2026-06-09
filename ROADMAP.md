# CyberWorld Build Roadmap

Repo: `personfu/personfu.github.io`
Stack: Next.js 16 (static export to `/CyberWorld`) · Phaser 3.90 · Colyseus · Supabase

## EPIC 0 — Build Health & Repo Hygiene (P0)

- [x] Dedupe index variants — canonical is `index.html`; rest archived to `/legacy`
- [x] Add `AGENTS.md` capturing the 5 Hard Rules
- [x] Add `ROADMAP.md` (this file)
- [ ] Confirm clean baseline: `npm install`, `npm run dev`, `npm run build`, typecheck, lint
- [ ] Verify `/CyberWorld` basePath export (all assets prefixed, no 404s on Pages)

## EPIC 1 — Rendering & Scaling (P0)

- [x] Responsive canvas: Phaser scale → RESIZE via augment.js runtime patch
- [x] Camera follows player via augment.js runtime patch
- [x] Label de-overlap for landmarks and NPCs via augment.js
- [ ] Separate NPC name vs role lines (requires Next.js source)
- [ ] Dedupe building labels per district (requires Next.js source)
- [x] HUD overlay never clips at any viewport size (CSS fixes)
- [x] Mobile/responsive pass — sidebars collapse at 960px, mobile at 600px
- [ ] Acceptance: partial — CSS/JS overlay approach; full fix needs Next.js source rebuild

## EPIC 2 — Refactor the Monolith (P1)

- [ ] Extract data to `src/game/data/`
- [ ] Extract systems to `src/game/systems/`
- [ ] Extract scenes to `src/game/scenes/`, HUD to `src/components/game/hud/`
- [ ] Engine.tsx becomes a thin orchestrator

## EPIC 3 — World Build-Out (P1)

- [ ] Tilemaps per district with collision layers
- [ ] Four sectors fully explorable and connected
- [x] Ambient life: roaming drones via augment.js (NPCs/weather/day-night need Next.js source)
- [ ] In-world building entrances launch module simulators
- [ ] Building interiors for key locations

## EPIC 4 — Original Story, Factions & Progression (P1)

- [x] Multi-act original narrative (AXIOM rogue AI, 3 acts across 4 sectors)
- [x] Faction & reputation system (GRIDWATCH, PHANTOM SYNDICATE, NEXUS CORP)
- [x] Story beats delivered via dialogue on key mission completion
- [x] Quest engine: 22 missions, available→active→complete state machine
- [x] Character progression: tiers 1-10, 5 skill domains, gear, Codex
- [ ] Supabase persistence (localStorage only for now; guest/solo works)

## EPIC 5 — Combat as Cybersecurity Education (P1)

- [x] 16 daemons mapped to real attack classes (DDoS, MITM, SQLi, XSS, etc.)
- [x] Kill-chain verbs: RECON, EXPLOIT, PATCH, RUN with tactical differences
- [x] Detection/noise meter (0-100, SOC SENTINEL strikes at max)
- [x] Counter-card on every win showing real attack + mitigation
- [x] Balance pass: Tier I teachable, Tier IV boss is a real challenge

## EPIC 6 — Educational Module Simulators (P1)

- [x] WarGames Academy: 10 progressive challenges (scope, browser security, sessions, APIs, passwords, cloud IR, OSINT, SIEM, packets, crypto)
- [x] CTF Trail: 12 capture-the-flag challenges across 4 categories
- [x] Signal Lab: 6 packet analysis exercises
- [x] Forensics Lab: 5 digital forensics investigation cases
- [x] RedOps Arena: 5 scoped red-team simulation scenarios
- [x] Intel Desk: 5 OSINT/intelligence analysis exercises
- [x] Research Vault: 6-section cybersecurity knowledge base
- [x] AI Arsenal: 5 AI/automation exercises
- [x] Adversaries: 12 fictional threat actor profiles
- [x] Cyber Arcade: 4 playable minigames
- [x] CyberOS ISO Builder: defense-in-depth configurator
- [x] Nodes: interactive network topology map
- [x] Discuss: 12 in-world forum threads
- [x] CyberWorld Codex: lore encyclopedia
- [x] Profile: operative dossier with export/import
- [x] Stars: 12 achievements
- [x] Games Hub: launcher linking all 18 modules

## EPIC 7 — Multiplayer & Backend (P2)

- [ ] Colyseus server deployment
- [x] Solo-mode fallback works fully offline (localStorage + service worker)
- [ ] Supabase auth + RLS + character persistence
- [ ] OPS ONLINE reflects real presence or simulated status

## EPIC 8 — UI/UX, Audio & Accessibility (P2)

- [x] OPERATIVE CONSOLE: 6 tabs (Missions, Combat, Inventory, Profile, Codex, Map)
- [x] Loading sequence, settings panel (audio/motion/particles), pause menu (P or Esc)
- [x] Procedural Web Audio (click/confirm/hit/win/error) with mute toggle via Settings
- [x] Keyboard navigation (M key toggle, P pause, Escape close, focus-visible outlines, ARIA labels)

## EPIC 9 — Performance & QA (P2)

- [ ] Texture atlases, lazy-load per district, 60fps target (needs Next.js source)
- [x] WebGL fallback overlay via augment.js (graceful degradation when canvas fails)
- [x] Unit tests for combat math (20 assertions, `node tests/combat-math.test.js`)
- [ ] Cross-browser + GitHub Pages basePath verification

## EPIC 10 — Content Complete (P3)

- [x] Every desktop icon leads to a finished feature (see `AUDIT.md`)
- [x] Codex filled with all daemons, districts, factions, tools
- [x] Final narrative continuity pass (3 acts wired through gameplay.js)
- [ ] Deploy, verify on Pages, tag release
