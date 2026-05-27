# CyberWorld Login -- Training-Range Brief (v3)

> **TRAINING ENVIRONMENT -- NO REAL CREDENTIALS.**
> This range is a defensive-analyst CTF surface. It accepts any input
> that passes its local validation, builds a fake session in
> `window.sessionStorage`, and forwards you to a console + lab that
> re-check that fake session. It never POSTs, never calls a backend,
> and never reaches any third-party origin.
> *Do not enter real usernames, passwords, emails, or recovery
> identifiers.*

| Surface | URL | Role |
|---|---|---|
| Entry | `index.html` | login (Findings F01-F10 observable here) |
| Console | `console.html` | re-verifies session; Tier 1 rubric |
| Lab | `lab.html` | hub linking the three tiers; aggregate progress |
| Crypto | `crypto.html` | Tier 2 cryptanalysis (F11-F15) |
| Intel | `intel.html` | Tier 3 May-2026 threat intel (F16-F20) |
| Recovery | `recovery.html` | local-only training ticket |
| Manifest | `manifest.json` | HMAC-SHA-256 signed; all fingerprints |
| Brief | `CHALLENGE.md` | this document |
| Robots | `robots.txt` | analyst breadcrumb |
| Decoders | `../scripts/lsb_decode.py`, `../scripts/png_trailer_scan.py` | offline helpers |

The CTF is small, self-contained, and meant to be solved with browser
DevTools, `curl`, Python REPL, `pngcheck`, `exiftool`, and a calculator.
The intended completion time is ~2 hours for a focused analyst.

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

## §B · The 20-Finding Rubric

Each finding has a **canonical confirmation token** -- a fixed short
string. Each page that owns a finding writes that token to
`sessionStorage.cw.solved[n]` when the analyst proves they understand
the finding (either by pasting the token directly on the Console, or
by solving the page's interactive widget on Crypto / Intel).

`manifest.json[findings][n].answer_sha256_prefix` publishes the first
**32 bits** of SHA-256 of the canonical token. Pasting your candidate
into the Console will hash it locally and tell you whether the first
4 bytes match. You never need to send anything to a server; the
entire check is in your browser tab.

When you have all 20 prefixes, XOR them as 32-bit integers -- the
result is the published `master_xor`. This is a linear code over
**GF(2)<sup>32</sup>**:

```
master_xor = T1 XOR T2 XOR ... XOR T20
```

For the shipped manifest, `master_xor = 0xba1274e7`.

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
