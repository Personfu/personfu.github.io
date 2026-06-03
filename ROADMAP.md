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

- [ ] Responsive canvas: Phaser scale → RESIZE, fill viewport container
- [ ] Camera follows player or fits active district
- [ ] Label de-overlap for landmarks and NPCs
- [ ] Separate NPC name vs role lines
- [ ] Dedupe building labels per district
- [ ] HUD overlay never clips at any viewport size
- [ ] Mobile/responsive pass with touch controls
- [ ] Acceptance: readable at any size, no clip, no overlap

## EPIC 2 — Refactor the Monolith (P1)

- [ ] Extract data to `src/game/data/`
- [ ] Extract systems to `src/game/systems/`
- [ ] Extract scenes to `src/game/scenes/`, HUD to `src/components/game/hud/`
- [ ] Engine.tsx becomes a thin orchestrator

## EPIC 3 — World Build-Out (P1)

- [ ] Tilemaps per district with collision layers
- [ ] Four sectors fully explorable and connected
- [ ] Ambient life: roaming NPCs, drones, weather, day-night
- [ ] In-world building entrances launch module simulators
- [ ] Building interiors for key locations

## EPIC 4 — Original Story, Factions & Progression (P1)

- [ ] Multi-act original narrative (rogue AI / corrupted grid threat)
- [ ] Faction & reputation system (2-4 factions)
- [ ] Branching dialogue trees for named NPCs
- [ ] Quest engine: main quests + repeatable side jobs
- [ ] Character progression: tiers, skill tree, gear, Codex
- [ ] Supabase persistence with guest/solo fallback

## EPIC 5 — Combat as Cybersecurity Education (P1)

- [ ] Every daemon maps to a real attack class with educational behavior
- [ ] Kill-chain engagement verbs: RECON → EXPLOIT → PERSIST → EXFIL → PATCH
- [ ] Detection/noise meter (blue team pressure)
- [ ] Player tools as simulated mini-tasks (fictional puzzles)
- [ ] Counter-card on every win showing real mitigation
- [ ] Balance pass across all tiers

## EPIC 6 — Educational Module Simulators (P1)

- [ ] WarGames Academy / CTF Trail: progressive challenge rooms
- [ ] Signal Lab: packet-desk puzzle
- [ ] Forensics Lab: triage logs/artifacts
- [ ] RedOps Arena: scoped simulated red-team scenarios
- [ ] Intel / Research: OSINT source-grading exercises
- [ ] AI Arsenal: safe automation/analysis ops bench

## EPIC 7 — Multiplayer & Backend (P2)

- [ ] Colyseus server deployment
- [ ] Solo-mode fallback works fully offline
- [ ] Supabase auth + RLS + character persistence
- [ ] OPS ONLINE reflects real presence or simulated status

## EPIC 8 — UI/UX, Audio & Accessibility (P2)

- [ ] All OPERATIVE CONSOLE tabs functional
- [ ] Loading sequence, settings panel, pause menu
- [ ] Procedural/licensed-clean audio with mute toggle
- [ ] Keyboard navigation, ARIA, reduced-motion support

## EPIC 9 — Performance & QA (P2)

- [ ] Texture atlases, lazy-load per district, 60fps target
- [ ] React error boundaries, WebGL fallback
- [ ] Unit tests for combat math, mission state, progression
- [ ] Cross-browser + GitHub Pages basePath verification

## EPIC 10 — Content Complete (P3)

- [ ] Every desktop icon leads to a finished feature
- [ ] Codex filled with all daemons, districts, factions, tools
- [ ] Final narrative continuity pass
- [ ] Deploy, verify on Pages, tag release
