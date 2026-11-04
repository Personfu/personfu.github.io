# Browser runtime for CyberWorld verification

The static game uses Playwright 1.64.1, but that package bundles Chromium
156.0.8078.4. CVE-2026-118306 affects Chrome before 156.0.8078.73. Updating
the driver alone does not fix the browser. QA now uses the exact official Chrome
for Testing 157.0.8103.38 archive and checks its size, SHA-256, extracted executable
receipt and actual running version before opening pages. The system Chrome channel
and user browser profile are never selected.

Run `npm ci --ignore-scripts --strict-peer-deps --legacy-peer-deps=false`, then
`python tests/install-secure-browser.py`. Linux CI installs only OS dependencies
with `playwright install-deps chromium`, then verifies the matching hash-pinned
sandbox helper in a root-protected temporary-runner location. Sandbox enforcement
stays enabled; no AppArmor/sysctl policy is weakened. Archive hashes are reproducible
download pins, not independent signature verification. Only Linux x64 and Windows
x64 are currently supported; other platforms fail closed.

`node tests/security/browser-inert-smoke.cjs` opens only synthetic in-memory HTML
with requests blocked. CI also checks the real Playwright configuration without
executing the game suite. The existing full browser suite includes a public
Presence transport path. It must not be presented as an offline test or run against
real services under AGENTS.md; a disposable transport fixture remains separate work.
Existing gameplay, download-integrity, movement and offline assertions are retained.

Existing scheduled and verification workflows now pin Node 24.22.1 and reviewed
action commits, replacing Node 20/unspecified Node 22. Secret-pattern checks retain
their existing matching behavior but suppress matched values in CI logs. Discord
command registration and briefing broadcasts were not executed as tests.

The frozen application lock, static export, game content and service deployments
are unchanged. A verified test browser does not attest the browser version used by
website visitors or the running Railway/Discord services.

Sources reviewed November 3, 2026:

- [Chrome CNA via NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-118306)
- [Playwright 1.64.1 browser metadata](https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/browsers.json)
- [Official Chrome for Testing channel metadata](https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json)
- [Chromium Ubuntu sandbox guidance](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md)

- [Node.js October security releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)


## November 3 browser security release

Reviewed November 4, 2026: [Google's Chrome 157 release](https://chromereleases.googleblog.com/2026/11/stable-channel-update-for-desktop.html) lists 213 security fixes, including seven critical issues: CVE-2026-121156, CVE-2026-121229, CVE-2026-121246, CVE-2026-121035, CVE-2026-121247, CVE-2026-121203 and CVE-2026-121126. The reviewed runtime and minimum accepted version are now 157.0.8103.38. The earlier 156.0.8078.73 floor addressed CVE-2026-118306 only; the previously reviewed 156.0.8078.80 pin is no longer sufficient for this release. This does not establish that every fixed issue was exploitable in this harness.

Both supported archives have fresh size/SHA-256 pins; Linux uses the matching helper from the same archive. Boundary tests reject the former pin and 157.0.8103.37, and accept 157.0.8103.38. Archive validation, executable receipts, actual browser-version preflight, sandbox enforcement and all existing application assertions remain required. No package-manager, release-age, host-security or retry policy is relaxed. Running services, previously downloaded caches and published artifacts still require independent rollout evidence.
