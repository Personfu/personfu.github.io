# Public mount release check

2026-10-18: Chrome 155 tested the exact generated `/play-cyberworld/` output
from an independent local server, with a fresh profile and service workers enabled.
The cached version was `cw-ascension-play-3cf27ebd75ccb9c3`.

The operative moved in the WebGL scene with ten loaded rigged characters. The
installed model's 899,196 bytes matched its expected SHA-256. After disconnecting
the browser, reloading the public home reached the canonical game entry and
retained the operative, campaign state and private case notes. The mission ZIP
downloaded offline, contained its synthetic PCAP, and excluded those notes. The
actual Settings → Credits link opened the included license text offline. There
were no page exceptions, local HTTP failures or authentication requests.

The machine-readable results and screenshot are `ascension-public-offline-proof.json`
and `ascension-public-offline.png` beside this report. This validates the public
export, not the production URL. Production is checked separately after Pages builds.

Independent code review and ten deterministic suites additionally cover exact
public file integrity, LF/CRLF portability, local asset closure, cache isolation,
failed install recovery, safe update activation, license navigation and protected
member routes. Earlier final-game checks include all seven cases and sixteen
browser scenarios; the qualified twenty-minute player session is documented in
`LONG-PLAYTEST.md`. These checks do not establish AAA visual quality, a complete
MMO, or physical mobile-device performance.
