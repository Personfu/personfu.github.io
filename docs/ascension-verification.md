# Static game verification

This repository deploys static files directly to GitHub Pages. The root build
bundles the two original Three.js scene sources under `CyberWorld/src/` into
local minified browser IIFEs, then validates their public static resource
closure. It does not rebuild the unrelated committed legacy Next.js bundle.
No production service or secret is required for these checks.

Use Node.js 22 or later, then run `npm ci` using the committed lockfile.

| Command | Actual check |
| --- | --- |
| `npm run typecheck` | TypeScript compiler validates strict new network contracts and parses selected preserved/new browser JavaScript with `allowJs`, `checkJs: false`, and `noEmit`. This is compatibility/syntax coverage for legacy JavaScript, not a claim of full semantic typing. |
| `npm run lint` | Checks the syntax of Ascension scripts, the modified world/gameplay/worker scripts, verification tools and entry inline scripts. New game scripts are also checked for dynamic code execution and obvious embedded private keys or live secrets. No legacy code is reformatted. |
| `npm run build` | Bundles both 3D scenes and pinned Three.js locally with esbuild, derives a content-versioned offline snapshot, validates Ascension and desktop local references, recursively checks styles and manifest resources and confirms the public entry loads both 3D bundles. The static source tree is deployment output; no duplicate legacy assets or `dist` copy is generated. |
| `npm test` | Runs campaign, shared engine, presence, public/member route, bounded offline worker and static resource suites. |
| `npm run test:network` | Runs deterministic tests for public presence protocol handling, actual local-tab discovery, privacy, movement throttling, failures and cleanup. |
| `npm run test:browser` | Runs the existing full campaign browser suite followed by the project's Playwright browser tests. Use the configured local Chromium executable for this environment. |

Browser tests must separately cover runtime interactions, dynamic image loading,
screen sizes, motion settings, actual public entry navigation and service-worker
updates. The static build does not fetch third-party services or claim to verify
their availability. The network module gracefully degrades when the grid cannot
be reached; see `ascension-network.md` for its integration and security model.

Dependencies are pinned to exact versions and locked at the repository root.
Three.js is bundled into the static scene outputs; no CDN is needed to load the
renderer. New original scene sources receive simulation-boundary lint checks;
generated vendor bundles receive syntax checks without false positives from
third-party renderer internals. No source maps or separate browser downloads
are generated during the build.

The scoped `/CyberWorld/ascension-sw.js` worker caches only an explicit public
runtime list (at most 32 files / 12 MiB), never APIs, accounts, member pages or
third-party resources. More-specific scope preserves the existing member-route
redirects. A complete update installs before activation; an existing session
must send `ACTIVATE_PATCH` at a safe point. Runtime requests try the network
first and fall back to the installed snapshot. Account saves remain in their
existing local storage and are never part of an offline response cache.
