#!/usr/bin/env python3
"""Build CyberWorld_login/manifest.json (public commitments only) and
hints.json (per-finding hints + intentional-weakness + false-flag lists).

v5 adds Tier 5 (deeper exploit chain F31-F33) and hides the answer key
from the public manifest. Hints load on demand via intercept.html.
"""
from __future__ import annotations
import hashlib
import hmac
import json
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGIN = ROOT / "CyberWorld_login"

# === Canonical confirmation tokens (private; live only in this script
#     and the page-side JS code -- analysts derive them from gameplay).
ANSWERS = {
    1:  "cyberworld:F01:client-side-auth-only",
    2:  "cyberworld:F02:sessionStorage:cw.r",
    3:  "cyberworld:F03:csp:script-src:unsafe-inline",
    4:  "cyberworld:F04:honeypot:website,middleName",
    5:  "cyberworld:F05:assets/seal.png:bound-asset",
    6:  "cyberworld:F06:alpha-lsb+iend-trailer",
    7:  "cyberworld:F07:bloom-filter+set:client-only",
    8:  "cyberworld:F08:hashcash:sha256:18bits:client",
    9:  "cyberworld:F09:inline-bootstrap-is-the-artifact",
    10: "cyberworld:F10:console.html:revalidates",
    11: "cyberworld:F11:rsa-toy-factored:n=3233=53*61",
    12: "cyberworld:F12:rsa-toy-decrypted:m=2026",
    13: "cyberworld:F13:ecdsa-p256-verified",
    14: "cyberworld:F14:hmac-truncated-collision-found",
    15: "cyberworld:F15:vigenere-rivest-broken",
    16: "cyberworld:F16:nextjs-middleware-bypass:CVE-2025-29927",
    17: "cyberworld:F17:mitre-attack:T1078:valid-accounts",
    18: "cyberworld:F18:ir-phase:eradication",
    19: "cyberworld:F19:actor:UNC5337:ivanti-connect-secure",
    20: "cyberworld:F20:zwsp-stego-extracted",
    21: "cyberworld:F21:sw:intercepts:/api/v1/",
    22: "cyberworld:F22:jwt:alg-none:accepted",
    23: "cyberworld:F23:cookie:cw_role:decoy",
    24: "cyberworld:F24:jwt:forge:role=admin",
    25: "cyberworld:F25:idor:profile:uid=42",
    26: "cyberworld:F26:path-traversal:etc/cyberworld.flag",
    27: "cyberworld:F27:xff:127.0.0.1:bypass",
    28: "cyberworld:F28:hpp:token-last-wins",
    29: "cyberworld:F29:race:redeem",
    30: "cyberworld:F30:chain:jwt+xcwops",
    31: "cyberworld:F31:jwt:hs256-rs256-key-confusion",
    32: "cyberworld:F32:proto-pollution:admin-console",
    33: "cyberworld:F33:sw-cache:poisoning:pre-auth-read",
}

fingerprints = {i: hashlib.sha256(a.encode()).digest()[:4].hex() for i, a in ANSWERS.items()}
master = 0
for v in fingerprints.values():
    master ^= int(v, 16)

# Tier-2 cryptanalysis constants
m_F12 = 2026
c_F12 = pow(m_F12, 17, 3233)
assert pow(c_F12, 2753, 3233) == m_F12

F14_KEY        = "cyberworld:F14:hmac16"
F14_ANCHOR_MSG = "Phoenix-2026"
F14_TAG16      = hmac.new(F14_KEY.encode(), F14_ANCHOR_MSG.encode(), hashlib.sha256).hexdigest()[:4]

F15_KEY = "RIVEST"
F15_PT  = "INFORMATIONHIDINGISACRYPTOGRAPHICPRIMITIVE"
def vig_enc(pt, k):
    out = []
    for i, c in enumerate(pt):
        s = ord(k[i % len(k)]) - 65
        out.append(chr((ord(c) - 65 + s) % 26 + 65))
    return "".join(out)
F15_CT = vig_enc(F15_PT, F15_KEY)

F13_MSG = "Phoenix Operations: May 26 2026"
F13_PK_HEX = ""
F13_SIG_HEX = ""
try:
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    sk_seed = int.from_bytes(hashlib.sha256(b"cyberworld:training:v2:F13:p256-sk").digest(), "big") % (2**255 - 19)
    sk = ec.derive_private_key(sk_seed or 1, ec.SECP256R1())
    pkn = sk.public_key().public_numbers()
    pk_raw = b"\x04" + pkn.x.to_bytes(32, "big") + pkn.y.to_bytes(32, "big")
    sig_der = sk.sign(F13_MSG.encode("ascii"), ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(sig_der)
    F13_PK_HEX  = pk_raw.hex()
    F13_SIG_HEX = (r.to_bytes(32, "big") + s.to_bytes(32, "big")).hex()
except Exception as exc:
    print("WARN: ECDSA setup failed:", exc)

# Asset fingerprints
seal  = (LOGIN / "assets" / "seal.png").read_bytes()
skull = (LOGIN / "assets" / "skull.png").read_bytes()
PNG_IEND = b"\x00\x00\x00\x00IEND\xaeB\x60\x82"
tail_off = seal.rfind(PNG_IEND) + len(PNG_IEND)
tail = seal[tail_off:]
from PIL import Image
img = Image.open(LOGIN / "assets" / "seal.png").convert("RGBA")
w, h = img.size; px = img.load()
def rb(i):
    v = 0
    for bit in range(8):
        p = i*8 + bit; x = p % w; y = p // w
        v = (v << 1) | (px[x, y][3] & 1)
    return v
L = (rb(0) << 24) | (rb(1) << 16) | (rb(2) << 8) | rb(3)
alpha = bytes(rb(i + 4) for i in range(L))

# Public-safe titles (no direct answers leaked beyond what gameplay produces).
TITLES = {
    1:  "Client-side authentication only",
    2:  "Fake session lives in window.sessionStorage",
    3:  "Content-Security-Policy permits inline scripts",
    4:  "Honeypot fields exist (bot-friction only)",
    5:  "PNG asset is bound into the auth path",
    6:  "PNG carries two stego side-channels",
    7:  "Weak-password screen is client-side",
    8:  "Proof-of-work is local; computation, not identity",
    9:  "The big inline bootstrap is intentional",
    10: "console.html re-validates everything independently",
    11: "RSA-toy modulus is factorable",
    12: "RSA-toy ciphertext decrypts to a small integer",
    13: "ECDSA P-256 signature verifies",
    14: "16-bit-truncated HMAC has birthday collisions",
    15: "Vigenere ciphertext breaks via Kasiski + IC",
    16: "Name the CVE behind the symptom",
    17: "Map the TTP to a MITRE ATT&CK technique",
    18: "Name the NIST SP 800-61 phase",
    19: "Identify the Mandiant actor cluster",
    20: "Extract the zero-width-space flag",
    21: "A service worker intercepts /api/v1/*",
    22: "The JWT verifier accepts alg=none",
    23: "Role/admin cookies are decoy bait",
    24: "Forge a JWT and reach /admin/users",
    25: "An IDOR exists on /profile",
    26: "A path traversal exists on /files",
    27: "X-Forwarded-For is trusted on /admin/geo",
    28: "HTTP Parameter Pollution on /hpp",
    29: "Race condition on /redeem",
    30: "Chain primitives to reach /internal/flag",
    31: "JWT HS256/RS256 key-confusion on /internal/super",
    32: "Object.prototype pollution opens /admin/console",
    33: "SW cache is read before authorization on /admin/cached-users",
}

# Private hints (move out of public manifest)
HINTS = {
    1:  "Submit credentials with the network tab open; no POST leaves the origin.",
    2:  "DevTools -> Application -> Session Storage -> cw.r is editable.",
    3:  "Read the CSP meta tag; script-src lists 'unsafe-inline'.",
    4:  "View source for inputs positioned off-screen.",
    5:  "Compute sha256 of assets/seal.png; compare to manifest.json.",
    6:  "Run ../scripts/lsb_decode.py and ../scripts/png_trailer_scan.py.",
    7:  "Inspect weakPasswords Set + Bloom filter in the inline script.",
    8:  "Read proofOfWork(); the difficulty is in the source.",
    9:  "Read the comment banner at the top of the inline script.",
    10: "Open console.html; it re-fetches and re-hashes the asset.",
    11: "n is tiny. Trial-divide.",
    12: "BigInt mod-exp. The exponent d is in the source.",
    13: "WebCrypto subtle.verify('ECDSA', {hash:'SHA-256'}, ...).",
    14: "Birthday bound on truncated HMAC; the grinder is in intercept.html.",
    15: "Six-letter cryptographer's surname; plaintext is A-Z only.",
    16: "March 2025 Next.js advisory; x-middleware-subrequest header.",
    17: "Initial Access tactic; stolen-cred reuse.",
    18: "NIST SP 800-61 phases: Preparation / Detection&Analysis / Containment / Eradication / Recovery.",
    19: "Mandiant January-2025 advisory.",
    20: "Look at U+200B and U+200D between two words of the brief.",
    21: "DevTools -> Application -> Service Workers.",
    22: "Send Authorization: Bearer <hdr>.<payload>. (note trailing dot).",
    23: "Flip cw_role to admin; /admin/users still 403s.",
    24: "Pair the alg=none forge with role=admin.",
    25: "Enumerate /profile?uid=N; one uid is special.",
    26: "Read the source; the demo handler honors ../.",
    27: "Add an X-Forwarded-For header. Common spoof IP.",
    28: "URLSearchParams.getAll picks the last value.",
    29: "Promise.all over six POSTs.",
    30: "Three primitives required: alg=none + role=admin + custom op header.",
    31: "Fetch /api/v1/auth/keys.pub; sign HS256 with the PEM bytes.",
    32: "POST a JSON body to /api/v1/config/merge that touches __proto__.",
    33: "POST anything to /api/v1/cache/put?key=admin/users, then GET cached-users.",
}

FALSE_FLAGS = [
    ".env.bak (X-CTF-Decoy: true, watermarked DECOY__)",
    ".git/HEAD (refs/heads/decoy-honeypot)",
    "backup.zip (PK header, no central directory)",
    "config.json (api_key=DECOY__, jwt_secret=DECOY__)",
    "admin.php / wp-admin/ (no PHP, no WordPress)",
    "/api/v1/debug?secret=admin (returns thanks for trying)",
    "/api/v1/lab/sysinfo (fake nginx/PHP server fingerprint)",
    "/api/v1/__proto__/polluted (no real sink)",
    "noscript <form action='/cgi-bin/cyberworld-login.cgi'>",
    "hidden data-fake-flag=CTF_FLAG{F00_decoy_only_real_flags_start_at_F21}",
    "HTML comment CYBERWORLD_JWT_SECRET=DECOY__see_alg_none_F22",
    "Cookies cw_admin_token + cw_csrf (backend never reads)",
]

INTENTIONAL_WEAKNESSES = [
    "script-src 'unsafe-inline' allows the inline bootstrap to be the audited artifact",
    "session token lives only in window.sessionStorage; no server-side validation",
    "proof-of-work is local (Hashcash, 18-bit difficulty) and proves only compute, not identity",
    "weak-password screen is client-side (Set + Bloom filter) and bypassable",
    "rate-limit counter (cw.a) is sessionStorage-scoped and resettable",
    "console.html performs only client-side session-signature verification",
    "RSA-toy parameters in crypto.html are deliberately undersized",
    "HMAC truncation to 16 bits in F14 is deliberately within birthday range",
    "Vigenere demo in F15 is a textbook break; not used for any auth path",
    "SW JWT verifier accepts alg=none (CVE-2015-9235 class)",
    "SW JWT verifier accepts HS256 signed with the published RSA public PEM (key confusion; RFC 8725 sec. 3.1)",
    "SW /profile lacks any access control (IDOR; CWE-639)",
    "SW /files honors '../' in name parameter (path traversal; CWE-22)",
    "SW /admin/geo trusts the first X-Forwarded-For hop (CWE-348)",
    "SW /hpp uses URLSearchParams.getAll and picks the last value (CWE-235)",
    "SW /redeem state is process-wide and races (CWE-362)",
    "SW /config/merge is a vulnerable deep-merge into Object.prototype (CWE-1321)",
    "SW /cache/put writes without auth; /admin/cached-users reads before auth (CWE-639)",
    "cw_role / cw_admin_token / cw_csrf cookies are bait; backend ignores them",
]

# ===== Public manifest (commitments + asset integrity only) =====
public_manifest = {
    "schema":  "cyberworld.training.manifest.v5",
    "issued":  "2026-05-27T00:00:00Z",
    "expires": "2027-05-27T00:00:00Z",
    "author":  {
        "name":    "Person / FLLC",
        "site":    "https://fllc.net",
        "contact": "https://github.com/Personfu",
        "tagline": "Hack the impossible. Defend the future.",
        "purpose": "defensive-analyst CTF training; no real credentials accepted, transmitted, or stored",
    },
    "scope": {
        "directory": "/CyberWorld_login/",
        "entry":     "/CyberWorld_login/index.html",
        "brief":     "/CyberWorld_login/challenge.html",
        "lab":       "/CyberWorld_login/lab.html",
        "console":   "/CyberWorld_login/console.html",
        "intercept": "/CyberWorld_login/intercept.html",
        "lore":      "/CyberWorld_login/lore.html",
        "sw":        "/CyberWorld_login/sw-ctf.js",
        "hints":     "/CyberWorld_login/hints.json",
        "robots":    "/CyberWorld_login/robots.txt",
        "mmo_grant": "localStorage.cw.role = 'operator' (post Tier 4); 'superoperator' (post Tier 5)",
    },
    "asset_fingerprints": {
        "seal.png":            hashlib.sha256(seal).hexdigest(),
        "seal.png:size":       len(seal),
        "seal.png:tail_size":  len(tail),
        "seal.png:iend_tail":  hashlib.sha256(tail).hexdigest(),
        "seal.png:alpha_lsb":  hashlib.sha256(alpha).hexdigest(),
        "seal.png:alpha_len":  L,
        "seal.png:alpha_crc32_ieee": f"{zlib.crc32(alpha) & 0xffffffff:08x}",
        "skull.png":           hashlib.sha256(skull).hexdigest(),
        "skull.png:size":      len(skull),
    },
    # Verification artefacts only -- no plaintext answers; the analyst still
    # has to derive m, the IDOR uid, the traversal target, the race threshold,
    # and the operator header from gameplay / source reading.
    "challenge_artifacts": {
        "rsa_toy":    {"n": 3233, "e": 17, "F12_ciphertext": c_F12},
        "hmac_f14":   {"key_published": F14_KEY, "anchor_msg": F14_ANCHOR_MSG, "target_tag16": F14_TAG16},
        "vigenere":   {"alphabet": "A-Z", "ciphertext": F15_CT},
        "ecdsa_p256": {"curve": "P-256", "hash": "SHA-256", "public_key_uncompressed_hex": F13_PK_HEX, "message_utf8": F13_MSG, "signature_raw_hex": F13_SIG_HEX},
        "api_v1":     {
            "prefix":      "/CyberWorld_login/api/v1/",
            "endpoint_count": 22,
            "discovery":   "GET /api/v1/debug/echo or /CyberWorld_login/robots.txt",
            "hints_at":    "/CyberWorld_login/hints.json (load on demand)",
        },
    },
    "math_primitives": {
        "hashcash":       "RFC-style v1 stamp: 1:bits:date:resource:ext:rand:counter (Back, 2002)",
        "birthday_bound": "E[stamps] = 2^bits; E[16-bit-HMAC collisions] ~= 2^8",
        "session_hmac":   "HMAC-SHA-256 over canonical(session-claims || tail24) using K = SHA-256('cyberworld:training:v2:2026-05-26:personfu')",
        "crc32_ieee":     "polynomial 0xEDB88320 (reflected); over alpha-LSB payload",
        "modexp_toy":     "RSA toy: e=17 mod n=3233",
        "ecdsa_p256":     "ECDSA NIST P-256 / SHA-256 (FIPS 186-5)",
        "vigenere":       "poly-alphabetic over Z/26; Kasiski + IC analysis",
        "zwsp_stego":     "U+200B (0) / U+200D (1), 8 bits/byte MSB-first",
        "jwt_alg_none":   "JWS RFC 7515 'none'; verifiers MUST reject when verifying (RFC 8725 sec. 3.2)",
        "jwt_key_conf":   "HS/RS key confusion (RFC 8725 sec. 3.1)",
        "proto_pollute":  "CWE-1321; deep-merge into Object.prototype via __proto__",
        "cache_confused": "CWE-639; trust placed in unauthenticated cache content",
        "gf2_32_xor":     "33 finding tokens XOR over GF(2)^32 close to master_xor",
    },
    "findings": [
        {
            "n": i,
            "tier": (1 if i <= 10 else 2 if i <= 15 else 3 if i <= 20 else 4 if i <= 30 else 5),
            "title": TITLES[i],
            "answer_sha256_prefix": fingerprints[i],
        }
        for i in range(1, 34)
    ],
    "master_xor": f"{master:08x}",
    "publishing_key_derivation": "K = SHA-256('cyberworld:training:v2:2026-05-26:personfu')",
}

# ===== Hints / weaknesses / decoys (loaded on demand) =====
hints_doc = {
    "schema":  "cyberworld.training.hints.v5",
    "for":     "cyberworld.training.manifest.v5",
    "note":    "Loaded by intercept.html via explicit user action ('Hint' button). Reading this file directly is a spoiler.",
    "hints":   {str(i): HINTS[i] for i in range(1, 34)},
    "intentional_weaknesses": INTENTIONAL_WEAKNESSES,
    "false_flags": FALSE_FLAGS,
    "answer_commitments_canonical_sha256": {str(i): hashlib.sha256(ANSWERS[i].encode()).hexdigest() for i in range(1, 34)},
}

def assert_ascii(obj, path="root"):
    if isinstance(obj, str):
        for ch in obj:
            if ord(ch) > 0x7e:
                raise SystemExit(f"non-ASCII at {path}: {ch!r}")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            assert_ascii(k, path + "/" + str(k)); assert_ascii(v, path + "/" + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            assert_ascii(v, path + f"[{i}]")
assert_ascii(public_manifest); assert_ascii(hints_doc)

canonical = json.dumps(public_manifest, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
K = hashlib.sha256(b"cyberworld:training:v2:2026-05-26:personfu").digest()
sig = hmac.new(K, canonical.encode("utf-8"), hashlib.sha256).hexdigest()

public_manifest["signature"] = {
    "algorithm":        "HMAC-SHA-256",
    "key_derivation":   "cyberworld:training:v2:2026-05-26:personfu",
    "canonicalization": "json.dumps(body, separators=(',',':'), sort_keys=True) of all fields except this one; body is ASCII-only",
    "value":            sig,
}

(LOGIN / "manifest.json").write_text(json.dumps(public_manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
(LOGIN / "hints.json").write_text(json.dumps(hints_doc, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")

print("schema      = cyberworld.training.manifest.v5")
print("findings    = 33 across 5 tiers")
print("master_xor  =", f"{master:08x}")
print("signature   =", sig)
print("public      = CyberWorld_login/manifest.json")
print("hints       = CyberWorld_login/hints.json (separate file; loaded on demand)")
