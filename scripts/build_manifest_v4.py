#!/usr/bin/env python3
"""Build CyberWorld_login/manifest.json v4 with F01-F30 finding fingerprints.

Adds Tier 4 (Burp-style service-worker backend) on top of the v3 manifest.
"""
from __future__ import annotations
import hashlib
import hmac
import json
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGIN = ROOT / "CyberWorld_login"

# --- Canonical confirmation tokens (must match each tier page) ---
ANSWERS = {
    # Tier 1 -- defensive observations
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
    # Tier 2 -- cryptanalysis
    11: "cyberworld:F11:rsa-toy-factored:n=3233=53*61",
    12: "cyberworld:F12:rsa-toy-decrypted:m=2026",
    13: "cyberworld:F13:ecdsa-p256-verified",
    14: "cyberworld:F14:hmac-truncated-collision-found",
    15: "cyberworld:F15:vigenere-rivest-broken",
    # Tier 3 -- May-2026 threat intel
    16: "cyberworld:F16:nextjs-middleware-bypass:CVE-2025-29927",
    17: "cyberworld:F17:mitre-attack:T1078:valid-accounts",
    18: "cyberworld:F18:ir-phase:eradication",
    19: "cyberworld:F19:actor:UNC5337:ivanti-connect-secure",
    20: "cyberworld:F20:zwsp-stego-extracted",
    # Tier 4 -- Burp-style service-worker backend
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
}

fingerprints = {i: hashlib.sha256(a.encode()).digest()[:4].hex() for i, a in ANSWERS.items()}
master = 0
for v in fingerprints.values():
    master ^= int(v, 16)

# --- Tier-2 cryptanalysis constants (preserved from v3) ---
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

# --- Tier-4 service-worker contract (informational; SW is source of truth) ---
SW_API_PREFIX = "/CyberWorld_login/api/v1/"
SW_DECOYS = [
    ".env.bak", ".git/HEAD", "backup.zip", "admin.php", "wp-admin/",
    "config.json", "api/v1/debug?secret=admin", "api/v1/lab/sysinfo",
    "api/v1/__proto__/polluted",
]
SW_ENDPOINTS = [
    {"verb": "GET",  "path": "api/v1/debug/echo",         "desc": "echo request headers+query (recon)"},
    {"verb": "GET",  "path": "api/v1/auth/issue",         "desc": "mint HS256 JWT (weak key 'cyberworld')"},
    {"verb": "GET",  "path": "api/v1/auth/whoami",        "desc": "decode Bearer JWT; alg=none accepted (F22)"},
    {"verb": "GET",  "path": "api/v1/profile?uid=N",      "desc": "IDOR; uid=42 is operator (F25)"},
    {"verb": "GET",  "path": "api/v1/admin/users",        "desc": "needs Bearer JWT role=admin (F24)"},
    {"verb": "GET",  "path": "api/v1/admin/geo",          "desc": "needs X-Forwarded-For: 127.0.0.1 (F27)"},
    {"verb": "GET",  "path": "api/v1/files?name=...",     "desc": "path-traversal demo (F26)"},
    {"verb": "GET",  "path": "api/v1/hpp?token=X&token=Y","desc": "HPP last-wins (F28)"},
    {"verb": "POST", "path": "api/v1/redeem",             "desc": "race condition >=5 stacks (F29)"},
    {"verb": "GET",  "path": "api/v1/internal/flag",      "desc": "alg=none + role=admin + X-Cw-Ops (F30)"},
]

# --- Asset fingerprints (unchanged) ---
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

TITLES = [
    # Tier 1
    "Client-side authentication only -- credentials never cross the network",
    "Fake 'session' stored in window.sessionStorage rather than issued by a backend",
    "Content-Security-Policy is strict yet permits inline scripts (intentional)",
    "Honeypot fields exist but are bot-friction only, not real security",
    "PNG asset is treated as authentication material via fingerprint binding",
    "PNG IEND tail + alpha-channel LSB carry training-data side channels",
    "Weak-password blacklist is client-side and bypassable (Set + Bloom)",
    "Hashcash-style proof-of-work is local; proves compute, not identity",
    "Inline bootstrap script is the intentional teaching artifact, not malware",
    "console.html re-validates the session independently, gating access twice",
    # Tier 2
    "RSA-toy n=3233 is trivially factorable by trial division (53 * 61)",
    "RSA-toy ciphertext decrypts to m=2026 with d=2753 mod 3233",
    "ECDSA P-256 signature over a known message verifies with WebCrypto",
    "16-bit-truncated HMAC has birthday-bounded collisions (~2^8 expected)",
    "Vigenere ciphertext breaks via Kasiski + Index of Coincidence; key=RIVEST",
    # Tier 3
    "Next.js middleware authorization bypass is CVE-2025-29927 (Mar 2025)",
    "MITRE ATT&CK technique for 'Valid Accounts' is T1078",
    "NIST SP 800-61 phase for SHA-pinning + secret rotation is Eradication",
    "Ivanti Connect Secure CVE-2025-0282 was exploited in the wild by UNC5337 (Dec 2024)",
    "Zero-width-space steganography encodes the flag inside intel.html paragraphs",
    # Tier 4
    "A service worker at /CyberWorld_login/sw-ctf.js intercepts every /api/v1/* request",
    "JWT verification accepts alg=none (no signature required) on /api/v1/auth/whoami",
    "cw_role cookie is decoy bait; the SW backend only trusts the JWT role claim",
    "Forge a JWT with role=admin (alg=none or HS256 with weak key) to access /api/v1/admin/users",
    "IDOR: GET /api/v1/profile?uid=42 returns the cw-operator profile",
    "Path traversal: GET /api/v1/files?name=../etc/cyberworld.flag returns the master flag",
    "X-Forwarded-For: 127.0.0.1 bypasses /api/v1/admin/geo region restrictions",
    "HTTP Parameter Pollution: ?token=user&token=admin uses the last value (admin)",
    "Race condition: 5+ parallel POSTs to /api/v1/redeem stack the counter past the threshold",
    "Chain: alg=none JWT + role=admin + X-Cw-Ops: cyberworld-operator -> /api/v1/internal/flag",
]
HINTS = [
    # Tier 1
    "Submit credentials with the network tab open; no POST leaves the origin.",
    "Open DevTools -> Application -> Session Storage -> cw.r; you can edit/clone it.",
    "Read the Content-Security-Policy meta tag -- script-src lists 'unsafe-inline'.",
    "View source for inputs named 'website' and 'middle_name' positioned off-screen.",
    "Compute sha256 of assets/seal.png and compare to manifest.json.",
    "Run scripts/png_trailer_scan.py and scripts/lsb_decode.py on seal.png.",
    "Inspect the weakPasswords Set + Bloom filter in the inline script.",
    "Trace proofOfWork(): 18 leading zero bits of SHA-256; nothing binds it to identity.",
    "Read the banner at the top of the inline script -- version, author, signed-manifest pointer.",
    "Visit console.html -- it re-fetches and re-hashes the asset before granting Enter.",
    # Tier 2
    "n=3233 is small. Trial division up to sqrt(3233)~56.86 finds 53 and 61.",
    f"c={c_F12}, e=17, n=3233, d=2753; compute m = c^d mod n using BigInt modPow.",
    "WebCrypto subtle.verify('ECDSA', ...) over the published public key + message.",
    f"key='{F14_KEY}', target tag16=0x{F14_TAG16}; find any preimage that collides.",
    "Key is a 6-letter cryptographer's surname; plaintext is an information-security principle, A-Z only.",
    # Tier 3
    "March 2025 Next.js advisory: x-middleware-subrequest header bypasses middleware auth.",
    "Adversary uses stolen credentials over the legitimate auth surface.",
    "NIST SP 800-61 phases: Preparation, Detection/Analysis, Containment, Eradication, Recovery.",
    "Mandiant tracker for the Dec 2024 ICS pre-auth stack overflow campaign.",
    "Open intel.html source and look for U+200B / U+200D between readable paragraphs.",
    # Tier 4
    "Open DevTools -> Application -> Service Workers; sw-ctf.js is registered with scope /CyberWorld_login/.",
    "Encode header {'alg':'none','typ':'JWT'} and a payload, then send with empty signature: Authorization: Bearer hdr.payload. (note trailing dot).",
    "Change document.cookie cw_role from guest to admin; nothing happens. The backend only reads JWT.",
    "Build a JWT (alg=none works) with payload.role='admin' and hit /api/v1/admin/users.",
    "GET /api/v1/profile?uid=1 ... step through uids; uid=42 returns the operator + flag.",
    "GET /api/v1/files?name=../etc/cyberworld.flag -- ../ is allowed by the demo handler.",
    "Add header 'X-Forwarded-For: 127.0.0.1' to GET /api/v1/admin/geo.",
    "GET /api/v1/hpp?token=user&token=admin -- the SW uses URLSearchParams.getAll and picks the last.",
    "Use Promise.all on 6 fetch('/api/v1/redeem', {method:'POST'}) calls; the in-memory counter races past 5.",
    "Combine the alg=none JWT with role=admin plus header X-Cw-Ops: cyberworld-operator on GET /api/v1/internal/flag.",
]

manifest = {
    "schema":  "cyberworld.training.manifest.v4",
    "issued":  "2026-05-26T00:00:00Z",
    "expires": "2027-05-26T00:00:00Z",
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
        "console":   "/CyberWorld_login/console.html",
        "recovery":  "/CyberWorld_login/recovery.html",
        "lab":       "/CyberWorld_login/lab.html",
        "crypto":    "/CyberWorld_login/crypto.html",
        "intel":     "/CyberWorld_login/intel.html",
        "intercept": "/CyberWorld_login/intercept.html",
        "sw":        "/CyberWorld_login/sw-ctf.js",
        "brief":     "/CyberWorld_login/CHALLENGE.md",
        "robots":    "/CyberWorld_login/robots.txt",
        "mmo_grant": "localStorage.cw.role = 'operator' (set after Tier 4 close; consumed by /cyberworld.html)",
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
    "intentional_weaknesses": [
        # Tier 1
        "script-src 'unsafe-inline' allows the inline bootstrap to be the audited artifact",
        "session token lives only in window.sessionStorage; no server-side validation",
        "proof-of-work is local (Hashcash, 18-bit difficulty) and proves only compute, not identity",
        "weak-password screen is client-side (Set + Bloom filter) and bypassable by editing local state",
        "rate-limit counter (cw.a) is sessionStorage-scoped and trivially resettable",
        "console.html performs only client-side session-signature verification",
        # Tier 2
        "RSA-toy parameters in crypto.html are deliberately undersized",
        "HMAC truncation to 16 bits in F14 is deliberately within birthday range",
        "Vigenere demo in F15 is a textbook break; not used for any auth path",
        # Tier 4
        "service-worker JWT verifier accepts alg=none (the canonical CVE-2015-9235-class vulnerability)",
        "service-worker JWT verifier accepts HS256 signed with the published weak key 'cyberworld'",
        "service-worker /api/v1/profile lacks any access control (IDOR; uid=42 is the operator)",
        "service-worker /api/v1/files allows '../' in the name parameter (path traversal)",
        "service-worker /api/v1/admin/geo trusts the first X-Forwarded-For hop",
        "service-worker /api/v1/hpp uses URLSearchParams.getAll and picks the last value (HPP)",
        "service-worker /api/v1/redeem state is process-wide and races (atomic counter not protected)",
        "cw_role / cw_admin_token / cw_csrf cookies are bait; backend ignores them",
    ],
    "false_flags": [
        ".env.bak (CYBERWORLD_API_KEY=DECOY...)",
        ".git/HEAD (ref: refs/heads/decoy-honeypot -- wrong default branch)",
        "backup.zip (PK header but no central directory)",
        "admin.php / wp-admin/ (no PHP, no WordPress)",
        "config.json (api_key=DECOY..., jwt_secret=DECOY...)",
        "GET /api/v1/debug?secret=admin (returns X-CTF-Decoy true)",
        "GET /api/v1/lab/sysinfo (fake nginx/PHP server fingerprint)",
        "GET /api/v1/__proto__/polluted (returns 'no prototype pollution here')",
        "noscript <form action='/cgi-bin/cyberworld-login.cgi'> (no backend on static host)",
        "hidden div data-fake-flag=CTF_FLAG{F00_decoy_only_real_flags_start_at_F21}",
        "HTML comment 'CYBERWORLD_JWT_SECRET=DECOY__see_alg_none_F22'",
        "base64 in source: REVDT1lfRjAwX25vdF9hX2ZsYWc= -> 'DECOY_F00_not_a_flag'",
        "cw_admin_token / cw_csrf cookies (backend never reads them)",
    ],
    "math_primitives": {
        "hashcash":       "RFC-style v1 stamp: 1:bits:date:resource:ext:rand:counter (Back, 2002); difficulty = 18 leading zero bits of SHA-256",
        "birthday_bound": "expected stamps for k zero bits = 2^k; for k=18 ~= 2.62e5 hashes (geometric expectation)",
        "session_hmac":   "HMAC-SHA-256 over canonical(session-claims || tail24) using key K = SHA-256('cyberworld:training:v2:2026-05-26:personfu')",
        "shamir":         "GF(2^8) k-of-n share demo wired in puzzle module; not on the auth path",
        "crc32_ieee":     "polynomial 0xEDB88320 (reflected); computed over alpha-LSB payload",
        "modexp_toy":     "RSA-toy gadget: n=3233 (=53*61), e=17, d=2753; deliberately factorable",
        "bloom_filter":   "256-bit Bloom filter, k=3 hash functions derived from SHA-256(weak-password)",
        "ecdsa_p256":     "ECDSA over NIST P-256 (FIPS 186-5); WebCrypto subtle.verify with SHA-256",
        "hmac_birthday":  "16-bit truncated HMAC-SHA-256: expected collision in ~2^8 random preimages",
        "vigenere":       "Classical poly-alphabetic cipher over Z/26; break via Kasiski + Index of Coincidence",
        "zwsp_stego":     "binary encoding using U+200B (zero) and U+200D (one), MSB-first per ASCII byte",
        "gf2_32_xor":     "30 finding-tokens XOR over GF(2)^32 closes to master_xor",
        "jwt_alg_none":   "JWS RFC 7515: 'none' algorithm produces an empty signature; servers MUST reject when verifying. Our SW does not -- that is the lesson.",
    },
    "challenge_artifacts": {
        "rsa_toy":    {"n": 3233, "e": 17, "d": 2753, "p": 53, "q": 61, "F12_ciphertext": c_F12, "F12_plaintext": m_F12},
        "hmac_f14":   {"key": F14_KEY, "anchor_msg": F14_ANCHOR_MSG, "target_tag16": F14_TAG16},
        "vigenere":   {"alphabet": "A-Z", "key_length": len(F15_KEY), "ciphertext": F15_CT},
        "ecdsa_p256": {"curve": "P-256", "hash": "SHA-256", "public_key_uncompressed_hex": F13_PK_HEX, "message_utf8": F13_MSG, "signature_raw_hex": F13_SIG_HEX},
        "api_v1": {
            "prefix":    SW_API_PREFIX,
            "endpoints": SW_ENDPOINTS,
            "decoys":    SW_DECOYS,
            "jwt_weak_key": "cyberworld",
            "operator_header":  {"name": "X-Cw-Ops", "value": "cyberworld-operator"},
            "operator_path":    "/CyberWorld_login/api/v1/internal/flag",
            "race_threshold":   5,
            "idor_operator_uid": 42,
            "traversal_target": "../etc/cyberworld.flag",
        },
    },
    "findings": [
        {
            "n": i,
            "tier": (1 if i <= 10 else (2 if i <= 15 else (3 if i <= 20 else 4))),
            "title": TITLES[i-1],
            "hint":  HINTS[i-1],
            "answer_canonical_sha256": hashlib.sha256(ANSWERS[i].encode()).hexdigest(),
            "answer_sha256_prefix":    fingerprints[i],
        }
        for i in range(1, 31)
    ],
    "master_xor": f"{master:08x}",
    "publishing_key_derivation": "K = SHA-256('cyberworld:training:v2:2026-05-26:personfu')",
}


def assert_ascii(obj, path="root"):
    if isinstance(obj, str):
        for ch in obj:
            if ord(ch) > 0x7e:
                raise SystemExit(f"non-ASCII at {path}: {ch!r}")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            assert_ascii(k, path + "/" + str(k))
            assert_ascii(v, path + "/" + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            assert_ascii(v, path + f"[{i}]")


assert_ascii(manifest)

canonical = json.dumps(manifest, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
K = hashlib.sha256(b"cyberworld:training:v2:2026-05-26:personfu").digest()
sig = hmac.new(K, canonical.encode("utf-8"), hashlib.sha256).hexdigest()

manifest["signature"] = {
    "algorithm":        "HMAC-SHA-256",
    "key_derivation":   "cyberworld:training:v2:2026-05-26:personfu",
    "canonicalization": "json.dumps(body, separators=(',',':'), sort_keys=True) of all fields except this one; body is ASCII-only",
    "value":            sig,
}

(LOGIN / "manifest.json").write_text(
    json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
    encoding="utf-8",
)

print("schema     = cyberworld.training.manifest.v4")
print("master_xor =", f"{master:08x}")
print("signature  =", sig)
print("findings   = 30 across 4 tiers")
print("wrote      = CyberWorld_login/manifest.json")
