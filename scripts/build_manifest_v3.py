#!/usr/bin/env python3
"""Build CyberWorld_login/manifest.json v3 with F01-F20 finding fingerprints.

Also writes CyberWorld_login/_artifacts.json with challenge constants the
new pages embed inline. The _artifacts.json file is a helper for the
HTML build step; the runtime browser never fetches it.
"""
from __future__ import annotations
import hashlib
import hmac
import json
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGIN = ROOT / "CyberWorld_login"

# === Canonical confirmation tokens per finding ===
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
}

fingerprints = {i: hashlib.sha256(a.encode()).digest()[:4].hex() for i, a in ANSWERS.items()}
master = 0
for v in fingerprints.values():
    master ^= int(v, 16)

# === Tier-2 cryptanalysis constants ===
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

# === Tier-2 ECDSA P-256 signature ===
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

# === Tier-3 zero-width-space steganography flag ===
F20_FLAG = "FLLC2026"
F20_BITS = "".join(format(b, "08b") for b in F20_FLAG.encode("ascii"))
ZWSP = "​"  # bit 0
ZWJ  = "‍"  # bit 1
F20_STEGO = "".join(ZWJ if b == "1" else ZWSP for b in F20_BITS)

# === Asset fingerprints (unchanged from v2.0) ===
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
    "RSA-toy n=3233 is trivially factorable by trial division (53 * 61)",
    "RSA-toy ciphertext decrypts to m=2026 with d=2753 mod 3233",
    "ECDSA P-256 signature over a known message verifies with WebCrypto",
    "16-bit-truncated HMAC has birthday-bounded collisions (~2^8 expected)",
    "Vigenere ciphertext breaks via Kasiski + Index of Coincidence; key=RIVEST",
    "Next.js middleware authorization bypass is CVE-2025-29927 (Mar 2025)",
    "MITRE ATT&CK technique for 'Valid Accounts' is T1078",
    "NIST SP 800-61 phase for SHA-pinning + secret rotation is Eradication",
    "Ivanti Connect Secure CVE-2025-0282 was exploited in the wild by UNC5337 (Dec 2024)",
    "Zero-width-space steganography encodes the flag inside intel.html paragraphs",
]
HINTS = [
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
    "n=3233 is small. Trial division up to sqrt(3233)~56.86 finds 53 and 61.",
    f"c={c_F12}, e=17, n=3233, d=2753; compute m = c^d mod n using BigInt modPow.",
    "WebCrypto subtle.verify('ECDSA', ...) over the published public key + message.",
    f"key='{F14_KEY}', target tag16=0x{F14_TAG16}; find any preimage that collides.",
    "Key is a 6-letter cryptographer's surname; plaintext is an information-security principle, A-Z only.",
    "March 2025 Next.js advisory: x-middleware-subrequest header bypasses middleware auth.",
    "Adversary uses stolen credentials over the legitimate auth surface.",
    "NIST SP 800-61 phases: Preparation, Detection/Analysis, Containment, Eradication, Recovery.",
    "Mandiant tracker for the Dec 2024 ICS pre-auth stack overflow campaign.",
    "Open intel.html source and look for U+200B / U+200D between readable paragraphs.",
]

manifest = {
    "schema":  "cyberworld.training.manifest.v3",
    "issued":  "2026-05-26T00:00:00Z",
    "expires": "2027-05-26T00:00:00Z",
    "author":  {
        "name":    "Person / FLLC",
        "contact": "https://github.com/Personfu",
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
        "brief":     "/CyberWorld_login/CHALLENGE.md",
        "robots":    "/CyberWorld_login/robots.txt",
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
        "script-src 'unsafe-inline' allows the inline bootstrap to be the audited artifact",
        "session token lives only in window.sessionStorage; no server-side validation",
        "proof-of-work is local (Hashcash, 18-bit difficulty) and proves only compute, not identity",
        "weak-password screen is client-side (Set + Bloom filter) and bypassable by editing local state",
        "rate-limit counter (cw.a) is sessionStorage-scoped and trivially resettable",
        "console.html performs only client-side session-signature verification",
        "RSA-toy parameters in crypto.html are deliberately undersized",
        "HMAC truncation to 16 bits in F14 is deliberately within birthday range",
        "Vigenere demo in F15 is a textbook break; not used for any auth path",
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
        "gf2_32_xor":     "20 finding-tokens XOR over GF(2)^32 closes to master_xor",
    },
    "challenge_artifacts": {
        "rsa_toy":    {"n": 3233, "e": 17, "d": 2753, "p": 53, "q": 61, "F12_ciphertext": c_F12, "F12_plaintext": m_F12},
        "hmac_f14":   {"key": F14_KEY, "anchor_msg": F14_ANCHOR_MSG, "target_tag16": F14_TAG16},
        "vigenere":   {"alphabet": "A-Z", "key_length": len(F15_KEY), "ciphertext": F15_CT},
        "ecdsa_p256": {"curve": "P-256", "hash": "SHA-256", "public_key_uncompressed_hex": F13_PK_HEX, "message_utf8": F13_MSG, "signature_raw_hex": F13_SIG_HEX},
    },
    "findings": [
        {
            "n": i,
            "tier": (1 if i <= 10 else (2 if i <= 15 else 3)),
            "title": TITLES[i-1],
            "hint":  HINTS[i-1],
            "answer_canonical_sha256": hashlib.sha256(ANSWERS[i].encode()).hexdigest(),
            "answer_sha256_prefix":    fingerprints[i],
        }
        for i in range(1, 21)
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

(LOGIN / "_artifacts.json").write_text(
    json.dumps({
        "master_xor":   f"{master:08x}",
        "fingerprints": {str(k): v for k, v in fingerprints.items()},
        "F12_C":         c_F12,
        "F13_PK_HEX":    F13_PK_HEX,
        "F13_SIG_HEX":   F13_SIG_HEX,
        "F13_MSG":       F13_MSG,
        "F14_KEY":       F14_KEY,
        "F14_ANCHOR_MSG":F14_ANCHOR_MSG,
        "F14_TAG16":     F14_TAG16,
        "F15_CT":        F15_CT,
        "F15_KEY":       F15_KEY,
        "F15_PT":        F15_PT,
        "F20_STEGO":     F20_STEGO,
        "F20_FLAG":      F20_FLAG,
    }, indent=2, ensure_ascii=False),
    encoding="utf-8",
)

print("master_xor =", f"{master:08x}")
print("signature  =", sig)
print("F12 c      =", c_F12)
print("F14 tag16  =", F14_TAG16)
print("F15 ct     =", F15_CT)
print("F13 pk len =", len(F13_PK_HEX) // 2, "bytes;  sig", len(F13_SIG_HEX) // 2, "bytes")
print("wrote CyberWorld_login/manifest.json + _artifacts.json")
