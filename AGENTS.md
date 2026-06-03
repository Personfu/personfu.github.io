# AGENTS.md — Hard Rules for All Contributors & AI Agents

These rules gate every task. Violating any one is a blocking issue.

## 1. Original IP Only

Capture the scale, tone, and structure of a large persistent MMO (factions, a
continuous world, long mission arcs, a living grid). **Do not** reproduce
The Matrix Online's story, characters, locations, lore, or assets. **Do not**
port or adapt the mxoemu C++ source, or the ClubPenguin/RuneScape/Pokémon forks.
Write all narrative, names, and art as original CyberWorld work.

## 2. Simulated & Sandboxed Security Content

Every "attack," "tool," and "exploit" operates **only on in-game fictional
state**. Nothing may scan, connect to, exploit, or generate payloads against
real hosts or networks. Treat `png_payloads/`, `qr_payloads/`, `msf-service/`
as lab-only fiction; do not wire them to anything that could affect a real
system. Each attack must ship with its real-world defensive counter as the
teaching payload.

## 3. Preserve the Existing Shell & Aesthetic

The topbar, SECTOR NAV, Win98 desktop, OPS BRIEFING, neon-on-dark cyberpunk
theme, Orbitron / Share Tech Mono fonts — these stay. Improve content inside
the shell; don't replace the shell. `page.tsx`, `cyber.module.css`,
`globals.css` define the look. `index.html` is the canonical desktop entry.

## 4. Every Commit Must Build Clean

Run `npm run typecheck` (tsc), `npm run lint`, and `npm run build` (static
export) before each commit. Never commit a red build. For the static parent
site, verify that all linked pages exist and desktop icons resolve.

## 5. Small, Reviewable Commits

One epic-task per PR/commit with a clear message. After each, verify the
static export still works at the `/CyberWorld` basePath.
