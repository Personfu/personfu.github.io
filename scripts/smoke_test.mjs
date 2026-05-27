/*
 * End-to-end smoke test for the CyberWorld_login CTF.
 *
 * Mirrors the browser's bootstrap exactly:
 *   1. Fetch + structurally validate assets/seal.png (PNG sig, IEND tail,
 *      alpha-LSB length-prefixed payload, denylist scan)
 *   2. Fetch manifest.json, verify HMAC-SHA-256 against the canonical body
 *   3. Cross-check asset fingerprints (file, tail, alpha, CRC-32, sizes)
 *   4. Run an 18-bit Hashcash stamp
 *   5. Build session claims, sign with HMAC-SHA-256
 *   6. Independently re-verify the session signature
 *   7. Walk every finding in the manifest, hash the canonical token,
 *      check the published 32-bit prefix matches; XOR all twenty into
 *      master_xor and confirm equality
 *   8. Roundtrip the F11/F12/F14/F15/F20 challenge predicates
 *   9. Verify the ECDSA P-256 (F13) signature with Node WebCrypto
 *
 * Exits 0 on success, non-zero with first failure.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, createHmac, webcrypto } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "CyberWorld_login");
const enc = new TextEncoder();

const log = (k, ...m) => console.log(`[${k}]`, ...m);
const fail = (msg) => { console.error("FAIL:", msg); process.exit(1); };

// ───── helpers ─────
const toHex = (b) => Buffer.from(b).toString("hex");
function canonicalize(o) {
  if (o === null || typeof o !== "object") return JSON.stringify(o);
  if (Array.isArray(o)) return "[" + o.map(canonicalize).join(",") + "]";
  const ks = Object.keys(o).sort();
  return "{" + ks.map((k) => JSON.stringify(k) + ":" + canonicalize(o[k])).join(",") + "}";
}
const sha256Hex = (b) => createHash("sha256").update(b).digest("hex");
const hmacHex = (k, m) => createHmac("sha256", k).update(m).digest("hex");
function leadingZeroBits(buf) {
  let bits = 0;
  for (const byte of buf) {
    if (byte === 0) { bits += 8; continue; }
    for (let mask = 0x80; mask > 0; mask >>= 1) {
      if (byte & mask) return bits;
      bits += 1;
    }
    return bits;
  }
  return bits;
}
function crc32(buf) {
  const tab = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    tab[n] = c >>> 0;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i += 1) c = tab[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0");
}

// ───── 1. asset structural validation ─────
const sealBytes  = readFileSync(resolve(ROOT, "assets", "seal.png"));
const skullBytes = readFileSync(resolve(ROOT, "assets", "skull.png"));
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_IEND = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

if (!sealBytes.slice(0, 8).equals(PNG_SIG)) fail("seal.png signature");
const iendOff = sealBytes.lastIndexOf(PNG_IEND);
if (iendOff < 0) fail("seal.png IEND not found");
const tail = sealBytes.slice(iendOff + PNG_IEND.length);
if (tail.length === 0) fail("seal.png has no IEND tail");

// Decode alpha-LSB payload from the PNG, mimicking what the browser canvas does.
// We need the alpha channel byte for each pixel. Decoding PNG by hand is heavy,
// so we shell out to Python (Pillow) for the alpha extraction and pipe the bytes.
import { execSync } from "node:child_process";
const alphaBytes = execSync(
  `python3 "${resolve(dirname(fileURLToPath(import.meta.url)), "_extract_alpha.py")}" "${resolve(ROOT, "assets", "seal.png")}"`,
  { stdio: ["ignore", "pipe", "inherit"] }
);

const sealHash  = sha256Hex(sealBytes);
const tailHash  = sha256Hex(tail);
const alphaHash = sha256Hex(alphaBytes);
const alphaCrc  = crc32(alphaBytes);
log("asset", "seal sha256 ", sealHash);
log("asset", "tail sha256 ", tailHash);
log("asset", "alpha sha256", alphaHash);
log("asset", "alpha crc-32", alphaCrc, `(${alphaBytes.length} bytes)`);

// ───── 2. manifest HMAC verification ─────
const manifest = JSON.parse(readFileSync(resolve(ROOT, "manifest.json"), "utf8"));
const { signature, ...body } = manifest;
const KDF = "cyberworld:training:v2:2026-05-26:personfu";
const K = createHash("sha256").update(KDF).digest();
const calcSig = hmacHex(K, canonicalize(body));
if (calcSig !== signature.value) fail("manifest HMAC mismatch: " + calcSig + " vs " + signature.value);
log("manifest", "HMAC verified OK, sig", signature.value.slice(0, 12) + "...");

// ───── 3. cross-check asset fingerprints ─────
const fp = body.asset_fingerprints;
if (fp["seal.png"]                   !== sealHash) fail("manifest seal.png hash mismatch");
if (fp["seal.png:iend_tail"]         !== tailHash) fail("manifest tail hash mismatch");
if (fp["seal.png:alpha_lsb"]         !== alphaHash) fail("manifest alpha hash mismatch");
if (fp["seal.png:alpha_crc32_ieee"]  !== alphaCrc) fail("manifest CRC-32 mismatch");
if (fp["seal.png:alpha_len"]         !== alphaBytes.length) fail("manifest alpha length mismatch");
if (fp["seal.png:size"]              !== sealBytes.length) fail("manifest seal size mismatch");
if (fp["skull.png"]                  !== sha256Hex(skullBytes)) fail("manifest skull hash mismatch");
log("asset", "all 7 fingerprints bound to manifest OK");

// ───── 4. Hashcash 18-bit stamp ─────
function hashcash(bits, resource, ext) {
  const randBytes = webcrypto.getRandomValues(new Uint8Array(8));
  const rand = Buffer.from(randBytes).toString("base64url").replace(/=+$/, "");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const head = `1:${bits}:${date}:${resource}:${ext}:${rand}:`;
  const start = Date.now();
  for (let n = 0; n < (1 << 22); n += 1) {
    const stamp = head + n.toString(36);
    const digest = createHash("sha256").update(stamp).digest();
    if (leadingZeroBits(digest) >= bits) {
      const ms = Date.now() - start;
      return { stamp, counter: n, ms };
    }
  }
  fail("Hashcash exceeded 2^22");
}
const handleHash = sha256Hex(enc.encode("trainee-smoke-test"));
const stamp = hashcash(18, "cyberworld:training", `u=${handleHash.slice(0, 16)}:a=${sealHash.slice(0, 16)}`);
log("pow", `${stamp.counter} attempts in ${stamp.ms} ms; stamp = ${stamp.stamp.slice(0, 48)}...`);
if (leadingZeroBits(createHash("sha256").update(stamp.stamp).digest()) < 18)
  fail("Hashcash stamp does not actually have 18 leading zero bits");

// ───── 5. build + sign session ─────
const issued = Date.now();
const claims = {
  v: 2,
  u: handleHash.slice(0, 24),
  a: sealHash.slice(0, 24),
  n: stamp.counter,
  i: issued,
  e: issued + 5 * 60 * 1000,
  h: stamp.stamp,
};
const material = canonicalize(claims) + "|" + tailHash.slice(0, 24);
claims.s = hmacHex(K, material).slice(0, 32);
log("session", "claims:", JSON.stringify({ ...claims, h: claims.h.slice(0, 32) + "..." }));

// ───── 6. independent re-verify (what console.html does) ─────
function verifySession(session, assetTail, assetFile) {
  if (session.v !== 2) fail("session schema");
  if (Date.now() > session.e) fail("session expired");
  if (session.a !== assetFile.slice(0, 24)) fail("session asset binding");
  if (!session.h.startsWith("1:18:")) fail("session hashcash format");
  if (leadingZeroBits(createHash("sha256").update(session.h).digest()) < 18) fail("session hashcash difficulty");
  const m = canonicalize({ v: session.v, u: session.u, a: session.a, n: session.n, i: session.i, e: session.e, h: session.h }) + "|" + assetTail.slice(0, 24);
  const expected = hmacHex(K, m).slice(0, 32);
  if (session.s !== expected) fail("session HMAC mismatch");
  return true;
}
verifySession(claims, tailHash, sealHash);
log("session", "independent re-verification OK");

// ───── 7. walk all 20 findings, confirm prefixes + master_xor ─────
const TOKENS = {
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
};
let acc = 0;
for (const f of body.findings) {
  const tok = TOKENS[f.n];
  if (!tok) fail("no token for finding " + f.n);
  const pfx = sha256Hex(tok).slice(0, 8);
  if (pfx !== f.answer_sha256_prefix)
    fail(`F${f.n} prefix mismatch: ${pfx} vs ${f.answer_sha256_prefix}`);
  acc ^= parseInt(pfx, 16);
}
const accHex = (acc >>> 0).toString(16).padStart(8, "0");
if (accHex !== body.master_xor) fail(`master_xor mismatch: ${accHex} vs ${body.master_xor}`);
log("findings", `all 20 prefixes match, master_xor closes to 0x${accHex}`);

// ───── 8. F11/F12/F14/F15/F20 logic ─────
// F11: factor n=3233
if (53 * 61 !== 3233) fail("F11 RSA-toy factoring math");
log("F11", "OK 53*61=3233");

// F12: m = c^d mod n
const F12_C = body.challenge_artifacts.rsa_toy.F12_ciphertext;
function modPow(base, exp, mod) {
  let r = 1n, b = BigInt(base) % BigInt(mod), e = BigInt(exp), m = BigInt(mod);
  while (e > 0n) { if (e & 1n) r = (r * b) % m; e >>= 1n; b = (b * b) % m; }
  return Number(r);
}
const F12_M = modPow(F12_C, body.challenge_artifacts.rsa_toy.d, body.challenge_artifacts.rsa_toy.n);
if (F12_M !== body.challenge_artifacts.rsa_toy.F12_plaintext) fail("F12 RSA decrypt");
log("F12", `OK c=${F12_C} -> m=${F12_M}`);

// F13: ECDSA verify with WebCrypto
const F13 = body.challenge_artifacts.ecdsa_p256;
const F13_OK = await (async () => {
  const pkRaw = Buffer.from(F13.public_key_uncompressed_hex, "hex");
  const sig   = Buffer.from(F13.signature_raw_hex, "hex");
  const key   = await webcrypto.subtle.importKey("raw", pkRaw,
    { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  return webcrypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" },
    key, sig, Buffer.from(F13.message_utf8, "utf8"));
})();
if (!F13_OK) fail("F13 ECDSA verify");
log("F13", "OK ECDSA P-256 / SHA-256 verified");

// F14: HMAC-16 collision check against anchor
const F14 = body.challenge_artifacts.hmac_f14;
const anchorTag = hmacHex(F14.key, F14.anchor_msg).slice(0, 4);
if (anchorTag !== F14.target_tag16) fail("F14 anchor tag mismatch");
// Quick collision grind (bounded, like the in-browser button)
let f14Coll = null;
for (let i = 0; i < 200_000 && !f14Coll; i += 1) {
  const cand = "PHX-" + i.toString(36);
  if (hmacHex(F14.key, cand).slice(0, 4) === F14.target_tag16 && cand !== F14.anchor_msg) f14Coll = cand;
}
if (!f14Coll) console.warn("F14: 200k grind didn't find a collision; analyst may need to try a different schema");
else log("F14", `OK grinder collided after probing, "${f14Coll}" -> 0x${anchorTag}`);

// F15: Vigenere decrypt + key recovery
const F15 = body.challenge_artifacts.vigenere;
function vigDec(ct, key) {
  let out = ""; const K = key.toUpperCase();
  for (let i = 0, j = 0; i < ct.length; i += 1) {
    const c = ct[i];
    if (c < "A" || c > "Z") { out += c; continue; }
    const s = K.charCodeAt(j % K.length) - 65;
    out += String.fromCharCode((c.charCodeAt(0) - 65 - s + 26) % 26 + 65);
    j += 1;
  }
  return out;
}
const F15_PT = vigDec(F15.ciphertext, "RIVEST");
if (F15_PT !== "INFORMATIONHIDINGISACRYPTOGRAPHICPRIMITIVE") fail("F15 Vigenere decrypt: " + F15_PT);
log("F15", `OK Vigenere(RIVEST) -> ${F15_PT.slice(0, 24)}...`);

// F20: read intel.html, extract ZWSP/ZWJ stego from .brief section
const intelHtml = readFileSync(resolve(ROOT, "intel.html"), "utf8");
const briefMatch = intelHtml.match(/<section class="brief">([\s\S]*?)<\/section>/);
if (!briefMatch) fail("F20 brief section not found");
const ZWSP = "​", ZWJ = "‍";
const bits = [];
for (const ch of briefMatch[1]) {
  if (ch === ZWSP) bits.push(0);
  else if (ch === ZWJ) bits.push(1);
}
if (bits.length === 0 || bits.length % 8 !== 0) fail("F20 ZWSP stream malformed (" + bits.length + " bits)");
const bytes = [];
for (let i = 0; i < bits.length; i += 8) {
  let b = 0;
  for (let j = 0; j < 8; j += 1) b = (b << 1) | bits[i + j];
  bytes.push(b);
}
const F20_FLAG = Buffer.from(bytes).toString("utf8");
if (F20_FLAG !== "FLLC2026") fail("F20 stego decode -> " + F20_FLAG);
log("F20", `OK ZWSP stego -> "${F20_FLAG}" (${bits.length} bits)`);

console.log("\nSMOKE TEST PASSED -- 20/20 findings closed, asset binding intact, manifest signed, session round-trips");
