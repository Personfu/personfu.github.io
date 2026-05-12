#!/usr/bin/env python3
"""
CyberWorld payload builder.

Generates:
- Stego PNGs in ../png_payloads/stego/   (LSB, tEXt/zTXt, EXIF, polyglot PNG+ZIP)
- QR PNGs    in ../qr_payloads/          (CVE refs, vCards, mitigation playbooks)
- Index pages for both directories

All payload content is CTF-style or public-CVE reference material.
No exploit code, no working malware, no credential collection.
Educational / red-team training use only.
"""
from __future__ import annotations
import base64
import hashlib
import hmac
import html
import io
import json
import os
import shutil
import struct
import sys
import textwrap
import zipfile
from pathlib import Path

try:
    import qrcode
    from PIL import Image, PngImagePlugin, ImageDraw, ImageFont
except ImportError as exc:
    print(f"missing dependency: {exc.name}", file=sys.stderr)
    print(f"install with: {sys.executable} -m pip install qrcode pillow", file=sys.stderr)
    sys.exit(1)

ROOT  = Path(__file__).resolve().parents[1]
STEGO = ROOT / "png_payloads" / "stego"
QRDIR = ROOT / "qr_payloads"
SCRIPTS = ROOT / "scripts"
LOGIN = ROOT / "CyberWorld_login"
LOGIN_ASSETS = LOGIN / "assets"
SKULL_SOURCE = Path.home() / "Downloads" / "icons8-skull-64.png"
SKULL_ASSET = LOGIN_ASSETS / "skull.png"
STEGO.mkdir(parents=True, exist_ok=True)
QRDIR.mkdir(parents=True, exist_ok=True)
SCRIPTS.mkdir(parents=True, exist_ok=True)
LOGIN_ASSETS.mkdir(parents=True, exist_ok=True)

MAX_LSB_MESSAGE_BYTES = 16 * 1024
TRAILER_MAGIC = b"\nCYBERWORLD_TRAILER_V1\n"
PNG_IEND = b"\x00\x00\x00\x00IEND\xaeB`\x82"


def html_text(value: object) -> str:
    """Escape generated index content so CVE text cannot become markup."""
    return html.escape(str(value), quote=True)


def cve_qr_name(cve_id: str) -> str:
    safe_slug = cve_id.lower().replace("/", "_")
    return f"cve_{safe_slug}.png"


def install_skull_asset() -> None:
    """Use a checked-in local skull asset instead of a third-party hotlink."""
    if not SKULL_SOURCE.exists():
        raise FileNotFoundError(f"skull icon not found: {SKULL_SOURCE}")
    shutil.copyfile(SKULL_SOURCE, SKULL_ASSET)

# ---------------------------------------------------------------------------
# CVE knowledge base (publicly disclosed, developer/web-user impact, 2024-2026)
# ---------------------------------------------------------------------------
CVES = [
    {
        "id":  "CVE-2025-29927",
        "name":"Next.js middleware authorization bypass",
        "sev": "CRITICAL", "cvss": 9.1, "published": "2025-03-21",
        "impact":"Web apps using Next.js middleware for auth could be bypassed by a crafted x-middleware-subrequest header. Affects Next.js < 15.2.3 / 14.2.25 / 13.5.9 / 12.3.5.",
        "mitigation":"Upgrade. Block x-middleware-subrequest at the edge. Add server-side auth checks in handlers, not only in middleware.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2025-29927"
    },
    {
        "id":  "CVE-2025-30066",
        "name":"tj-actions/changed-files compromise",
        "sev": "HIGH", "cvss": 8.6, "published": "2025-03-15",
        "impact":"A malicious commit to the popular GitHub Action tj-actions/changed-files caused CI runners to print repository secrets to build logs. Public repos with build logs visible are at highest risk.",
        "mitigation":"Pin third-party actions by SHA, not by tag. Rotate any secret exposed in runs since 2025-03-14. Enable GitHub secret scanning + push protection.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2025-30066"
    },
    {
        "id":  "CVE-2025-24813",
        "name":"Apache Tomcat partial PUT RCE",
        "sev": "CRITICAL", "cvss": 9.8, "published": "2025-03-10",
        "impact":"Partial PUT + session-file persistence + path-equivalence bug enables an unauthenticated attacker to write a serialized payload that Tomcat deserializes -> RCE.",
        "mitigation":"Patch to 11.0.3 / 10.1.35 / 9.0.99. Disable writeable default servlet (readonly=true). Disable file-based session persistence in production.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2025-24813"
    },
    {
        "id":  "CVE-2024-3094",
        "name":"XZ Utils (liblzma) backdoor",
        "sev": "CRITICAL", "cvss": 10.0, "published": "2024-03-29",
        "impact":"Hostile maintainer planted a multi-stage backdoor in xz 5.6.0/5.6.1; on systems where sshd is linked with liblzma (most Linux distros via systemd) it would allow remote code execution under SSH.",
        "mitigation":"Verify xz version; downgrade to 5.4.6 or distro-pinned. Audit build pipelines for tarballs that ship m4/build-to-host.m4 different from upstream.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2024-3094"
    },
    {
        "id":  "CVE-2024-6387",
        "name":"regreSSHion — OpenSSH signal-handler race",
        "sev": "HIGH", "cvss": 8.1, "published": "2024-07-01",
        "impact":"Signal-handler race in OpenSSH's sshd on glibc Linux allows unauthenticated RCE as root. Exploitation is slow but real.",
        "mitigation":"Upgrade OpenSSH to 9.8p1+. Set LoginGraceTime 0 as workaround. Restrict sshd exposure with TCP wrappers / firewall.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2024-6387"
    },
    {
        "id":  "CVE-2025-0282",
        "name":"Ivanti Connect Secure stack overflow",
        "sev": "CRITICAL", "cvss": 9.0, "published": "2025-01-08",
        "impact":"Pre-auth stack overflow in Ivanti Connect Secure / Policy Secure / Neurons for ZTA gateways. Exploited in the wild since at least Dec 2024 by UNC5337.",
        "mitigation":"Patch ICS 22.7R2.5+. Run the Ivanti Integrity Checker Tool. Assume compromise if exposed pre-Jan 2025.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2025-0282"
    },
    {
        "id":  "CVE-2024-49113",
        "name":"LDAPNightmare — Windows LDAP client OOB read",
        "sev": "HIGH", "cvss": 7.5, "published": "2024-12-10",
        "impact":"Crafted LDAP referral causes Windows LSASS to read out of bounds -> crash and memory disclosure. Hostile DC/relay can crash domain-joined hosts.",
        "mitigation":"Install December 2024 cumulative update. Block outbound CLDAP to untrusted networks.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2024-49113"
    },
    {
        "id":  "CVE-2024-27198",
        "name":"JetBrains TeamCity auth bypass",
        "sev": "CRITICAL", "cvss": 9.8, "published": "2024-03-04",
        "impact":"Path-alternative auth bypass in TeamCity on-prem grants admin token to unauthenticated attackers. Mass-exploited by BianLian / Jasmin ransomware.",
        "mitigation":"Patch to 2023.11.4. Rotate all admin tokens; audit settings.kt / config DSL commits.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2024-27198"
    },
    {
        "id":  "CVE-2024-23897",
        "name":"Jenkins CLI args4j arbitrary file read",
        "sev": "HIGH", "cvss": 9.8, "published": "2024-01-24",
        "impact":"args4j '@' file expansion lets unauthenticated callers of the Jenkins CLI read arbitrary files: SSH keys, credentials.xml, secrets.",
        "mitigation":"Patch to 2.442+ / LTS 2.426.3. Disable CLI over remoting and HTTP. Rotate Jenkins master credentials.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2024-23897"
    },
    {
        "id":  "CVE-2024-45519",
        "name":"Zimbra postjournal SMTP RCE",
        "sev": "CRITICAL", "cvss": 9.8, "published": "2024-09-27",
        "impact":"Crafted CC: header parsed by postjournal triggers command injection -> RCE. Mass-exploited within days of disclosure.",
        "mitigation":"Disable postjournal or patch (8.8.15 P46 / 9.0.0 P41 / 10.0.9 / 10.1.1). Drop unauth SMTP.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2024-45519"
    },
    {
        "id":  "CVE-2024-21412",
        "name":"Windows SmartScreen Internet-Shortcut bypass",
        "sev": "HIGH", "cvss": 8.1, "published": "2024-02-13",
        "impact":"Internet-Shortcut (.url) pointing at remote .url chains evades SmartScreen MOTW prompt. Used by Water Hydra / DarkGate / Phemedrone Stealer.",
        "mitigation":"Apply Feb 2024 Patch Tuesday. Block .url attachments at gateway. Disable .url auto-download.",
        "ref": "https://nvd.nist.gov/vuln/detail/CVE-2024-21412"
    },
    {
        "id":  "POLYFILL-IO-2024",
        "name":"polyfill.io supply-chain hijack",
        "sev": "HIGH", "cvss": 0,    "published": "2024-06-25",
        "impact":"After polyfill.io was acquired by 'Funnull', the CDN began serving malicious mobile-redirect JS to >100,000 sites including major SaaS.",
        "mitigation":"Remove cdn.polyfill.io. Use Cloudflare / Fastly community mirrors. Add Subresource Integrity (SRI) to every <script> from a 3rd-party CDN.",
        "ref": "https://www.cisa.gov/news-events/alerts/2024/06/27/widespread-supply-chain-compromise-impacting-polyfillio"
    }
]

# ---------------------------------------------------------------------------
# PNG helpers
# ---------------------------------------------------------------------------
def make_base_png(text: str, color=(20,28,52), neon=(0,255,231), size=(640, 400)) -> Image.Image:
    img = Image.new("RGB", size, color)
    d   = ImageDraw.Draw(img)
    try:
        font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 26)
        font_sm  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 14)
    except Exception:
        font_big = ImageFont.load_default()
        font_sm  = ImageFont.load_default()
    d.rectangle([(8,8),(size[0]-8,size[1]-8)], outline=neon, width=2)
    d.text((24, 18), "CYBERWORLD :: STEGO CARRIER", fill=neon, font=font_big)
    if SKULL_ASSET.exists():
        with Image.open(SKULL_ASSET) as skull_opened:
            skull = skull_opened.convert("RGBA").resize((64, 64))
        img.paste(skull, (size[0] - 96, 24), skull)
    y = 70
    for line in textwrap.wrap(text, width=70):
        d.text((24, y), line, fill=(220,220,235), font=font_sm)
        y += 18
    d.text((24, size[1]-32), "personfu.github.io/CyberWorld_login", fill=(255,191,0), font=font_sm)
    return img

def lsb_embed(img: Image.Image, message: bytes) -> Image.Image:
    """Embed a length-prefixed message in the LSB of R channel."""
    if len(message) > MAX_LSB_MESSAGE_BYTES:
        raise ValueError(f"payload too large: {len(message)} bytes")
    img = img.convert("RGB")
    px  = img.load()
    w, h = img.size
    payload = struct.pack(">I", len(message)) + message
    bit_count = len(payload) * 8
    if bit_count > w * h:
        raise ValueError("payload too large for image")
    bit_index = 0
    for y in range(h):
        for x in range(w):
            if bit_index >= bit_count:
                break
            byte = payload[bit_index // 8]
            bit = (byte >> (7 - (bit_index % 8))) & 1
            r, g, b = px[x, y]
            r = (r & 0xFE) | bit
            px[x, y] = (r, g, b)
            bit_index += 1
        if bit_index >= bit_count:
            break
    return img


def alpha_lsb_embed(img: Image.Image, message: bytes) -> Image.Image:
    """Embed a length-prefixed message in the alpha-channel LSB."""
    if len(message) > MAX_LSB_MESSAGE_BYTES:
        raise ValueError(f"payload too large: {len(message)} bytes")
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    payload = struct.pack(">I", len(message)) + message
    bit_count = len(payload) * 8
    if bit_count > w * h:
        raise ValueError("payload too large for image")

    bit_index = 0
    for y in range(h):
        for x in range(w):
            if bit_index >= bit_count:
                break
            byte = payload[bit_index // 8]
            bit = (byte >> (7 - (bit_index % 8))) & 1
            r, g, b, a = px[x, y]
            alpha = 254 | bit
            px[x, y] = (r, g, b, alpha)
            bit_index += 1
        if bit_index >= bit_count:
            break
    return img


def save_png_with_text(img: Image.Image, path: Path, text_chunks: dict[str,str], ztxt: dict[str,str]|None=None):
    meta = PngImagePlugin.PngInfo()
    for k, v in text_chunks.items():
        meta.add_text(k, v)
    meta.add_itxt("CyberWorld-iTXt", "benign CTF metadata carrier; no executable code")
    meta.add(b"cwLD", b"custom ancillary chunk: CyberWorld training marker")
    if ztxt:
        for k, v in ztxt.items():
            meta.add_text(k, v, zip=True)
    img.save(path, "PNG", pnginfo=meta, optimize=True)


def append_iend_trailer(path: Path, label: str, payload: dict[str, object]) -> None:
    """Append benign CTF data after IEND so trailer scanners can detect it."""
    raw = path.read_bytes()
    iend_offset = raw.rfind(PNG_IEND)
    if iend_offset < 0:
        raise ValueError(f"PNG IEND marker not found: {path}")
    png_end = iend_offset + len(PNG_IEND)
    trailer = {
        "schema": "cyberworld.iend_trailer.v1",
        "label": label,
        "note": "benign appended training data after PNG IEND; browsers display only the image",
        "payload": payload,
    }
    encoded = json.dumps(trailer, separators=(",", ":"), sort_keys=True).encode("utf-8")
    path.write_bytes(raw[:png_end] + TRAILER_MAGIC + encoded + b"\n")

def append_zip_to_png(png_path: Path, zip_payload: dict[str, bytes], out_path: Path):
    """Make a PNG+ZIP polyglot — most readers see the PNG, unzip sees the archive."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in zip_payload.items():
            if Path(name).is_absolute() or ".." in Path(name).parts:
                raise ValueError(f"unsafe zip member path: {name}")
            z.writestr(name, data)
    out_path.write_bytes(png_path.read_bytes() + buf.getvalue())

# ---------------------------------------------------------------------------
# Build stego PNGs
# ---------------------------------------------------------------------------
def build_stego():
    artifacts = []

    # 1. LSB-encoded CTF flag
    msg = b"CTF_FLAG{lsb_red_channel_2026_cyberworld} :: see qr_payloads/cve_index.png"
    img = make_base_png("LSB stego carrier — message hidden in red-channel LSBs.")
    img = lsb_embed(img, msg)
    p = STEGO / "01_lsb_flag.png"
    save_png_with_text(img, p, {"Title":"LSB CTF flag","Author":"CyberWorld","Comment":"decode: read LSB of R; first 4 bytes are big-endian length"})
    append_iend_trailer(p, "lsb_flag_trailer", {
        "ctf_flag": "CTF_FLAG{iend_trailer_lsb_confirmed}",
        "extract": "scan for CYBERWORLD_TRAILER_V1 after the PNG IEND marker",
    })
    artifacts.append(("01_lsb_flag.png", "LSB-encoded CTF flag in red channel (decoder: see scripts/lsb_decode.py)"))

    # 2. tEXt + zTXt chunks (in-band metadata)
    img = make_base_png("tEXt / zTXt chunks contain CVE notes — open with `pngcheck -tv` or exiftool.")
    p = STEGO / "02_text_chunks_cves.png"
    save_png_with_text(img, p,
        text_chunks={
            "Author": "Person / FLLC",
            "Title": "CyberWorld CVE quick-ref",
            "CTF_FLAG": "CTF_FLAG{text_chunk_metadata_pngcheck}",
            "CVE-2025-29927": "Next.js middleware bypass — header x-middleware-subrequest",
            "CVE-2024-3094":  "XZ-utils liblzma backdoor — sshd RCE",
        },
        ztxt={
            "Playbook": json.dumps({
                "id":"cyberworld-quick-ref",
                "cves":[c["id"] for c in CVES],
                "note":"compressed (zTXt) — exiftool -PNG:Playbook will decompress"
            })
        })
    append_iend_trailer(p, "text_chunk_trailer", {
        "ctf_flag": "CTF_FLAG{iend_trailer_plus_text_chunks}",
        "chunks": ["tEXt", "zTXt", "iTXt", "cwLD"],
    })
    artifacts.append(("02_text_chunks_cves.png", "tEXt + compressed zTXt chunks with CVE quick-reference; pngcheck -tv to dump"))

    # 3. EXIF JSON payload (PNG technically uses eXIf chunk; Pillow supports via 'exif=')
    img = make_base_png("EXIF (eXIf) chunk carries a JSON SBOM-style manifest.")
    manifest = {
        "schema":"cyberworld.exif.v1",
        "ctf_flag":"CTF_FLAG{exif_json_chunk_2026}",
        "iocs":[
            "sha256:319feb15fb1995a99e26cffec40ddca8ca6ff1c0ca3c1ce1c7e6db4a3b3e4f6c (xz backdoor stage-1, public)",
            "sha256:0b8c61d2b3a5d9b7b9c3d2e0c43efeb8cba2cd5cbb1f0f63d52d3bcce82a4d4e (tj-actions hijack, public)"
        ],
        "cves":[{"id":c["id"],"sev":c["sev"]} for c in CVES]
    }
    p = STEGO / "03_exif_manifest.png"
    save_png_with_text(img, p, {"Manifest": json.dumps(manifest)})
    append_iend_trailer(p, "manifest_trailer", {
        "ctf_flag": "CTF_FLAG{iend_trailer_manifest}",
        "manifest_sha256": hashlib.sha256(json.dumps(manifest, sort_keys=True).encode("utf-8")).hexdigest(),
    })
    artifacts.append(("03_exif_manifest.png", "Embedded JSON SBOM-style manifest with public IOCs and CVE list"))

    # 4. PNG+ZIP polyglot — flag + CVE reports as ZIP appended after IEND
    cover = make_base_png("PNG+ZIP polyglot — `unzip` this file to read the appended archive.")
    p_cover = STEGO / "_tmp_cover.png"
    save_png_with_text(cover, p_cover, {"Note":"polyglot — append ZIP after IEND"})
    cves_md = ("# CyberWorld CVE pack (May 2026)\n\n" +
               "\n\n".join(f"## {c['id']} — {c['name']}\n*severity*: {c['sev']} (CVSS {c['cvss']})\n*published*: {c['published']}\n\n**Impact**\n\n{c['impact']}\n\n**Mitigation**\n\n{c['mitigation']}\n\n**Reference**: {c['ref']}" for c in CVES))
    polyglot = STEGO / "04_png_zip_polyglot.png"
    append_zip_to_png(p_cover, {
        "FLAG.txt": b"CTF_FLAG{png_zip_polyglot_iend_appended}\n",
        "cves.md":  cves_md.encode("utf-8"),
        "README.txt": b"This file is a valid PNG and a valid ZIP archive.\nMost image viewers ignore the trailing bytes; `unzip` reads the central directory from the end.\n",
        "TRAILER.txt": b"The ZIP archive itself is appended after the PNG IEND marker.\n"
    }, polyglot)
    p_cover.unlink(missing_ok=True)
    artifacts.append(("04_png_zip_polyglot.png", "Valid PNG + valid ZIP polyglot. `unzip 04_png_zip_polyglot.png` reveals CVE pack"))

    # 5. Visual-only PNG that re-points to QR index
    img = make_base_png("Decoder map — start with this image, then move to qr_payloads/cve_index.png.")
    p = STEGO / "00_decoder_map.png"
    save_png_with_text(img, p, {"Map":"01->LSB R-LSB; 02->pngcheck -tv; 03->exif Manifest; 04->unzip; QR index in ../qr_payloads/cve_index.png"})
    append_iend_trailer(p, "decoder_map_trailer", {
        "ctf_flag": "CTF_FLAG{iend_trailer_decoder_map}",
        "methods": ["IEND trailer", "tEXt/zTXt/iTXt", "LSB", "PNG+ZIP polyglot"],
    })
    artifacts.append(("00_decoder_map.png", "Index / decoder map for the other stego carriers"))

    # 6. Alpha-channel LSB carrier. Alpha is 254/255, so it remains visually opaque.
    msg = b"CTF_FLAG{alpha_channel_lsb_training_payload} :: alpha LSB, first 4 bytes length"
    img = make_base_png("Alpha-channel LSB carrier - opacity values hold a benign CTF payload.")
    img = alpha_lsb_embed(img, msg)
    p = STEGO / "05_alpha_lsb_payload.png"
    save_png_with_text(img, p, {"Title": "Alpha-channel LSB CTF payload", "Comment": "decode: read alpha-channel LSB; first 4 bytes are big-endian length"})
    append_iend_trailer(p, "alpha_lsb_trailer", {
        "ctf_flag": "CTF_FLAG{iend_trailer_alpha_lsb}",
        "extract": "alpha channel LSB plus CYBERWORLD_TRAILER_V1 marker after IEND",
    })
    artifacts.append(("05_alpha_lsb_payload.png", "Alpha-channel LSB carrier plus detectable IEND trailer"))

    return artifacts

# ---------------------------------------------------------------------------
# Build QR codes
# ---------------------------------------------------------------------------
def make_qr(content: str, path: Path, box_size: int = 8, ec="H"):
    levels = {"L":qrcode.constants.ERROR_CORRECT_L,
              "M":qrcode.constants.ERROR_CORRECT_M,
              "Q":qrcode.constants.ERROR_CORRECT_Q,
              "H":qrcode.constants.ERROR_CORRECT_H}
    if ec not in levels:
        raise ValueError(f"unsupported QR error-correction level: {ec}")
    q = qrcode.QRCode(version=None, error_correction=levels[ec], box_size=box_size, border=4)
    q.add_data(content)
    q.make(fit=True)
    img = q.make_image(fill_color="#00ffe7", back_color="#0a0d18").convert("RGB")
    img.save(path, "PNG")

def build_qrs():
    artifacts = []

    # Per-CVE QR codes pointing at NVD
    for c in CVES:
        p = QRDIR / cve_qr_name(c["id"])
        make_qr(c["ref"], p, box_size=6)
        artifacts.append((p.name, f"{c['id']} ({c['sev']} {c['cvss']}) → NVD detail"))

    # Master CVE index QR (JSON of all CVEs)
    idx_payload = json.dumps({
        "schema":"cyberworld.cve.index.v1",
        "issued":"2026-05-12",
        "cves":[{"id":c["id"],"sev":c["sev"],"cvss":c["cvss"],"ref":c["ref"]} for c in CVES]
    }, separators=(",",":"))
    make_qr(idx_payload, QRDIR / "cve_index.png", box_size=4, ec="L")
    artifacts.append(("cve_index.png", "Compact JSON index of all CVEs"))

    # vCard for the operator
    vcard = (
        "BEGIN:VCARD\nVERSION:3.0\n"
        "FN:Person — FLLC / CyberWorld\n"
        "TITLE:Founder, Lead Systems Architect\n"
        "ORG:FLLC\n"
        "URL:https://personfu.github.io/CyberWorld_login/\n"
        "NOTE:Red-team training environment. Educational use only.\n"
        "EMAIL:pfurulie@gmail.com\n"
        "END:VCARD"
    )
    make_qr(vcard, QRDIR / "vcard_operator.png", box_size=6)
    artifacts.append(("vcard_operator.png", "vCard 3.0 for the operator"))

    # Login URL QR
    make_qr("https://personfu.github.io/CyberWorld_login/", QRDIR / "login_url.png", box_size=8)
    artifacts.append(("login_url.png", "Direct URL to CyberWorld login"))

    # JWT demo (HS256 with key 'cyberworld' — purely a decoder exercise)
    header = base64.urlsafe_b64encode(json.dumps({"alg":"HS256","typ":"JWT"}).encode()).rstrip(b"=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "iss":"cyberworld",
        "sub":"trainee",
        "iat":1747000000,
        "exp":1778536000,
        "scope":"ctf:read",
        "flag":"CTF_FLAG{jwt_decode_then_verify_hs256}"
    }).encode()).rstrip(b"=")
    sig = base64.urlsafe_b64encode(hmac.new(b"cyberworld", header+b"."+payload, hashlib.sha256).digest()).rstrip(b"=")
    jwt = (header+b"."+payload+b"."+sig).decode()
    make_qr(jwt, QRDIR / "jwt_decoder_demo.png", box_size=4)
    artifacts.append(("jwt_decoder_demo.png", "Demo JWT (HS256, key 'cyberworld'). Decode it; CTF flag is in the body."))

    # Mitigation playbook (compact)
    playbook = json.dumps({
        "schema":"cyberworld.playbook.v1",
        "title":"Top dev/web-user hygiene — May 2026",
        "steps":[
            "Pin GitHub Actions by full commit SHA, not by tag (CVE-2025-30066).",
            "Add SRI to every <script src> from a 3rd-party CDN; drop polyfill.io.",
            "Server-side authorize each route even when middleware authorizes (CVE-2025-29927).",
            "Disable Tomcat writable default servlet + file session persistence (CVE-2025-24813).",
            "Verify xz-utils version <5.6.0 or >=5.4.6 (CVE-2024-3094).",
            "Patch OpenSSH ≥ 9.8p1 (CVE-2024-6387); set LoginGraceTime 0 if unpatchable.",
            "Apply Dec 2024 Windows CU (CVE-2024-49113).",
            "Rotate TeamCity tokens; pin to 2023.11.4+ (CVE-2024-27198).",
            "Disable Jenkins CLI over remoting; patch 2.442+ (CVE-2024-23897).",
            "Force WebAuthn / passkey for admin paths; disable SMS OTP."
        ]
    }, separators=(",",":"))
    make_qr(playbook, QRDIR / "mitigation_playbook.png", box_size=3, ec="L")
    artifacts.append(("mitigation_playbook.png", "Compact JSON mitigation playbook (Top dev/web hygiene, May 2026)"))

    # WiFi config QR (training/lab AP only — clearly marked)
    wifi = "WIFI:S:CyberWorld-Lab;T:WPA;P:training-only-not-prod;H:false;;"
    make_qr(wifi, QRDIR / "wifi_lab.png", box_size=6)
    artifacts.append(("wifi_lab.png", "WPA-PSK QR for the CyberWorld training lab AP (not production)"))

    # Geo + event SMS demo
    geo = "geo:33.4484,-112.0740?q=Phoenix+AZ"
    make_qr(geo, QRDIR / "geo_phx.png", box_size=6)
    artifacts.append(("geo_phx.png", "geo: URI — Phoenix lab coordinates"))

    sms = "SMSTO:+10000000000:CYBERWORLD ENROL TRAINEE-001"
    make_qr(sms, QRDIR / "sms_enrol.png", box_size=6)
    artifacts.append(("sms_enrol.png", "SMSTO URI — training enrollment template"))

    return artifacts

# ---------------------------------------------------------------------------
# Build index pages
# ---------------------------------------------------------------------------
COMMON_HEAD = """<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
  body{{background:#0f1320;color:#dfe;font-family:'Share Tech Mono',monospace;margin:0;padding:24px;max-width:1100px;margin:0 auto}}
  h1{{color:#00ffe7;text-shadow:0 0 10px #00ffe7;margin:0 0 4px}}
  .sub{{color:#ff0055;text-shadow:0 0 6px #ff0055;margin-bottom:16px}}
  .nav a{{color:#cfe;text-decoration:none;margin-right:12px;padding:4px 8px;border:1px solid rgba(0,255,231,.4);border-radius:4px;font-size:.85em}}
  .nav a:hover{{color:#ff0055;border-color:#ff0055}}
  .card{{background:rgba(20,28,52,.92);border:1px solid rgba(0,255,231,.4);border-radius:8px;padding:14px;margin:12px 0}}
  .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}}
  .grid figure{{margin:0;background:#0a0d18;border:1px solid rgba(0,255,231,.3);border-radius:6px;padding:10px;text-align:center}}
  .grid img{{width:100%;height:auto;image-rendering:pixelated;background:#0a0d18}}
  .grid figcaption{{font-size:.8em;color:#cfe;margin-top:6px}}
  .grid a{{color:#00ffe7;text-decoration:none}}
  .grid a:hover{{color:#ff0055}}
  table{{width:100%;border-collapse:collapse;font-size:.85em}}
  th,td{{border-bottom:1px solid rgba(0,255,231,.2);padding:6px;text-align:left;vertical-align:top}}
  th{{color:#00ffe7}}
  code{{background:#0a0d18;padding:2px 4px;border-radius:3px;color:#ffd870}}
  footer{{margin-top:24px;border-top:1px solid rgba(0,255,231,.2);padding-top:10px;font-size:.8em;color:#9ab}}
</style></head><body>
<div class="nav">
  <a href="../">..</a>
  <a href="../CyberWorld_login/">CyberWorld_login</a>
  <a href="../png_payloads/">png_payloads</a>
  <a href="../qr_payloads/">qr_payloads</a>
</div>
<h1>{h1}</h1>
<div class="sub">{sub}</div>
"""

COMMON_FOOT = """
<footer>// CyberWorld training environment — all payloads are CVE references and CTF flags.<br>
No working exploit code, no malware, no credential collection. Educational / red-team awareness use only.
</footer></body></html>"""

def write_png_index(stego_artifacts):
    rows = []
    for name, desc in stego_artifacts:
        safe_name = html_text(name)
        safe_desc = html_text(desc)
        rows.append(f'<figure><a href="stego/{safe_name}"><img src="stego/{safe_name}" alt="{safe_name}"></a><figcaption><a href="stego/{safe_name}">{safe_name}</a><br>{safe_desc}</figcaption></figure>')
    body = f"""
<div class="card">
  <h2 style="color:#00ffe7;margin-top:0">Stego carriers</h2>
  <div class="grid">{''.join(rows)}</div>
</div>

<div class="card">
  <h2 style="color:#00ffe7;margin-top:0">Decoders</h2>
  <table>
    <tr><th>Carrier</th><th>How to read it</th></tr>
    <tr><td>01_lsb_flag.png</td><td><code>python scripts/lsb_decode.py png_payloads/stego/01_lsb_flag.png</code></td></tr>
    <tr><td>05_alpha_lsb_payload.png</td><td><code>python scripts/lsb_decode.py png_payloads/stego/05_alpha_lsb_payload.png a</code></td></tr>
    <tr><td>02_text_chunks_cves.png</td><td><code>pngcheck -tv 02_text_chunks_cves.png</code> &nbsp; or &nbsp; <code>exiftool 02_text_chunks_cves.png</code></td></tr>
    <tr><td>03_exif_manifest.png</td><td><code>exiftool -Manifest 03_exif_manifest.png</code></td></tr>
    <tr><td>00/01/02/03 trailers</td><td><code>python scripts/png_trailer_scan.py png_payloads/stego</code></td></tr>
    <tr><td>04_png_zip_polyglot.png</td><td><code>unzip 04_png_zip_polyglot.png -d out/</code></td></tr>
  </table>
</div>

<div class="card">
  <h2 style="color:#00ffe7;margin-top:0">Legacy payload references</h2>
  <p>The text files in this directory (credential_stealer_*.txt, persistence_*.txt, rat_*.txt, downloader_*.txt) are the original training references. They are kept for the prior CTF track; new content lives in <code>stego/</code> and <code>../qr_payloads/</code>.</p>
  <ul>
    <li><a href="README.md">README.md</a></li>
    <li><a href="phishing_hidden_url_qr.txt">phishing_hidden_url_qr.txt</a> → moved to <a href="../qr_payloads/login_url.png">qr_payloads/login_url.png</a></li>
  </ul>
</div>
"""
    out = COMMON_HEAD.format(title="png_payloads", h1="png_payloads", sub="steganography carriers — LSB · text chunks · EXIF · polyglot") + body + COMMON_FOOT
    (ROOT / "png_payloads" / "index.html").write_text(out, encoding="utf-8")

def write_qr_index(qr_artifacts):
    rows = []
    for name, desc in qr_artifacts:
        safe_name = html_text(name)
        safe_desc = html_text(desc)
        rows.append(f'<figure><a href="{safe_name}"><img src="{safe_name}" alt="{safe_name}"></a><figcaption><a href="{safe_name}">{safe_name}</a><br>{safe_desc}</figcaption></figure>')
    cve_rows = "".join(
        f'<tr><td><a href="{html_text(cve_qr_name(c["id"]))}">{html_text(cve_qr_name(c["id"]))}</a></td>'
        f'<td>{html_text(c["id"])}</td><td>{html_text(c["sev"])} ({html_text(c["cvss"])})</td><td>{html_text(c["name"])}</td>'
        f'<td><a href="{html_text(c["ref"])}">NVD</a></td></tr>'
        for c in CVES
    )
    body = f"""
<div class="card">
  <h2 style="color:#00ffe7;margin-top:0">QR carriers</h2>
  <div class="grid">{''.join(rows)}</div>
</div>

<div class="card">
  <h2 style="color:#00ffe7;margin-top:0">CVE coverage</h2>
  <table>
    <tr><th>QR</th><th>CVE</th><th>Severity</th><th>Name</th><th>Ref</th></tr>
    {cve_rows}
  </table>
</div>

<div class="card">
  <h2 style="color:#00ffe7;margin-top:0">How to read these QRs</h2>
  <p>Use any modern phone camera or <code>zbarimg</code>:</p>
  <pre>zbarimg cve_index.png
zbarimg jwt_decoder_demo.png
zbarimg mitigation_playbook.png</pre>
  <p>The <code>cve_index.png</code> QR carries a compact JSON document; the per-CVE QRs deep-link to NVD; the JWT QR is an HS256 token signed with the key <code>cyberworld</code> — decode it, verify it, find the flag.</p>
</div>
"""
    out = COMMON_HEAD.format(title="qr_payloads", h1="qr_payloads", sub="QR carriers — CVE refs, vCard, mitigation playbook, JWT demo, wifi, geo, sms") + body + COMMON_FOOT
    (ROOT / "qr_payloads" / "index.html").write_text(out, encoding="utf-8")

# ---------------------------------------------------------------------------
# Decoder scripts
# ---------------------------------------------------------------------------
PNG_TRAILER_SCANNER = """#!/usr/bin/env python3
\"\"\"Detect and print benign data appended after PNG IEND.
Usage: python png_trailer_scan.py <png-or-directory>
\"\"\"
from __future__ import annotations

import sys
from pathlib import Path

PNG_IEND = b"\\x00\\x00\\x00\\x00IEND\\xaeB`\\x82"
MAX_FILES = 256
MAX_TRAILER_BYTES = 1024 * 1024


def candidate_paths(path: Path) -> list[Path]:
    if path.is_file():
        return [path]
    if not path.is_dir():
        raise ValueError(f"not a file or directory: {path}")
    files = sorted(p for p in path.iterdir() if p.is_file() and p.suffix.lower() == ".png")
    if len(files) > MAX_FILES:
        raise ValueError(f"too many PNG files: {len(files)}")
    return files


def scan_png(path: Path) -> tuple[int, bytes]:
    raw = path.read_bytes()
    iend_offset = raw.rfind(PNG_IEND)
    if iend_offset < 0:
        raise ValueError("IEND marker not found")
    trailer_offset = iend_offset + len(PNG_IEND)
    trailer = raw[trailer_offset:]
    if len(trailer) > MAX_TRAILER_BYTES:
        raise ValueError(f"trailer too large: {len(trailer)} bytes")
    return trailer_offset, trailer


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: png_trailer_scan.py <png-or-directory>", file=sys.stderr)
        return 2

    try:
        paths = candidate_paths(Path(argv[1]))
        for path in paths:
            offset, trailer = scan_png(path)
            if trailer:
                preview = trailer[:240].decode("utf-8", errors="backslashreplace")
                preview = preview.encode("unicode_escape").decode("ascii")
                print(f"{path}: {len(trailer)} trailing bytes after IEND at offset {offset}: {preview}")
            else:
                print(f"{path}: no trailing bytes after IEND")
    except (OSError, ValueError) as exc:
        print(f"scan failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
"""


LSB_DECODER = """#!/usr/bin/env python3
\"\"\"LSB decoder for CyberWorld stego PNGs.
Reads the red-channel LSB. First 4 bytes (big-endian) are the payload length.
Usage: python lsb_decode.py path/to/png [r|g|b|a]
\"\"\"
from __future__ import annotations

import struct
import sys
from pathlib import Path

from PIL import Image

MAX_PAYLOAD_BYTES = 16 * 1024


CHANNEL_INDEX = {"r": 0, "g": 1, "b": 2, "a": 3}


def read_lsb_bytes(path: Path, channel: str) -> bytes:
    with Image.open(path) as opened:
        img = opened.convert("RGBA")
    width, height = img.size
    if width <= 0 or height <= 0:
        raise ValueError("image has invalid dimensions")

    pixels = img.load()
    header = bytearray()
    payload = bytearray()
    current_byte = 0
    bit_count = 0
    expected_payload_len = None
    max_bits = width * height

    for bit_index in range(max_bits):
        x = bit_index % width
        y = bit_index // width
        current_byte = (current_byte << 1) | (pixels[x, y][CHANNEL_INDEX[channel]] & 1)
        bit_count += 1

        if bit_count != 8:
            continue

        if expected_payload_len is None:
            header.append(current_byte)
            if len(header) == 4:
                expected_payload_len = struct.unpack(">I", bytes(header))[0]
                if expected_payload_len > MAX_PAYLOAD_BYTES:
                    raise ValueError(f"declared payload too large: {expected_payload_len} bytes")
        else:
            payload.append(current_byte)
            if len(payload) == expected_payload_len:
                return bytes(payload)

        current_byte = 0
        bit_count = 0

    raise ValueError("payload not found or image is truncated")


def main(argv: list[str]) -> int:
    if len(argv) not in (2, 3):
        print("usage: lsb_decode.py <png> [r|g|b|a]", file=sys.stderr)
        return 2

    channel = argv[2].lower() if len(argv) == 3 else "r"
    if channel not in CHANNEL_INDEX:
        print("channel must be one of: r, g, b, a", file=sys.stderr)
        return 2

    try:
        payload = read_lsb_bytes(Path(argv[1]), channel)
    except (OSError, ValueError) as exc:
        print(f"decode failed: {exc}", file=sys.stderr)
        return 1

    sys.stdout.buffer.write(payload + b"\\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
"""

# ---------------------------------------------------------------------------
def main():
    install_skull_asset()
    print("[*] building stego PNGs …")
    stego_art = build_stego()
    print("    built", len(stego_art), "carriers")
    print("[*] building QR PNGs …")
    qr_art = build_qrs()
    print("    built", len(qr_art), "QRs")
    print("[*] writing index pages …")
    write_png_index(stego_art)
    write_qr_index(qr_art)
    trailer_scanner_path = SCRIPTS / "png_trailer_scan.py"
    trailer_scanner_path.write_text(PNG_TRAILER_SCANNER, encoding="utf-8")
    os.chmod(trailer_scanner_path, 0o755)
    decoder_path = SCRIPTS / "lsb_decode.py"
    decoder_path.write_text(LSB_DECODER, encoding="utf-8")
    os.chmod(decoder_path, 0o755)
    print("[*] done")

if __name__ == "__main__":
    main()
