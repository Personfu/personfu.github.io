"""Install only the reviewed Chrome archive; no shell or browser-profile changes."""
import sys
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import stat
import tempfile
import urllib.request
import zipfile

REPO = Path(__file__).resolve().parent.parent
PIN = json.loads((REPO / "tests/security/chrome-pin.json").read_text(encoding="utf8"))


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def safe_members(archive, root):
    members = archive.infolist()
    if len(members) > 16000 or sum(item.file_size for item in members) > 2_000_000_000:
        raise ValueError("Browser archive exceeds extraction budget")
    seen = set()
    for item in members:
        name = item.orig_filename
        path = PurePosixPath(name)
        mode = item.external_attr >> 16
        if (not name or "\\" in name or ":" in name or "\x00" in name
                or path.is_absolute() or ".." in path.parts or "." in name.split("/")
                or not path.parts or path.parts[0] != root
                or item.file_size > 600_000_000
                or stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)):
            raise ValueError("Unsafe browser archive member")
        key = name.rstrip("/").casefold()
        if key in seen:
            raise ValueError("Duplicate browser archive member")
        seen.add(key)
    return members


def install():
    machine = platform.machine().lower()
    if machine not in ("amd64", "x86_64"):
        raise ValueError("No reviewed browser pin for this architecture")
    key = {"Linux": "linux-x64", "Windows": "win32-x64"}.get(platform.system())
    if key not in PIN["platforms"]:
        raise ValueError("No reviewed browser pin for this operating system")
    pin = PIN["platforms"][key]
    base = REPO / ".cache/security-chrome"
    base.mkdir(parents=True, exist_ok=True)
    if base.is_symlink() or not base.resolve().is_relative_to(REPO):
        raise ValueError("Browser cache must stay inside this checkout")
    target = base / PIN["version"] / key
    if target.exists() or target.is_symlink():
        raise FileExistsError("Browser target exists; use a fresh checkout or review that cache")
    with tempfile.TemporaryDirectory(prefix="install-", dir=base) as temporary:
        stage = Path(temporary)
        archive_path = stage / pin["archive"]
        browser_platform = {"linux-x64": "linux64", "win32-x64": "win64"}[key]
        url = f"https://storage.googleapis.com/chrome-for-testing-public/{PIN['version']}/{browser_platform}/{pin['archive']}"
        # Refuse redirects so the reviewed origin and immutable path remain authoritative.
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                raise ValueError("Unexpected browser download redirect")
        opener = urllib.request.build_opener(NoRedirect())
        size = 0
        with opener.open(url, timeout=60) as response, archive_path.open("xb") as output:
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                if size > pin["bytes"]:
                    raise ValueError("Browser archive exceeds pinned size")
                output.write(chunk)
        if archive_path.stat().st_size != pin["bytes"] or digest(archive_path) != pin["sha256"]:
            raise ValueError("Browser archive SHA-256 or size mismatch")
        extracted = stage / "verified"
        extracted.mkdir()
        with zipfile.ZipFile(archive_path) as archive:
            members = safe_members(archive, pin["root"])
            for item in members:
                destination = extracted.joinpath(*PurePosixPath(item.filename).parts)
                if item.is_dir():
                    destination.mkdir(parents=True, exist_ok=True)
                    continue
                destination.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(item) as source, destination.open("xb") as output:
                    while chunk := source.read(1024 * 1024):
                        output.write(chunk)
                if os.name != "nt":
                    destination.chmod(0o755 if (item.external_attr >> 16) & 0o111 else 0o644)
        executable = extracted / pin["root"] / pin["executable"]
        if not executable.is_file():
            raise ValueError("Pinned executable is missing")
        (extracted / "receipt.json").write_text(json.dumps({
            "version": PIN["version"], "archiveSha256": pin["sha256"],
            "executableSha256": digest(executable)
        }, indent=2) + "\n", encoding="utf8")
        target.parent.mkdir(parents=True, exist_ok=True)
        # Both locations are verified children of our checkout, on the same volume.
        if not target.parent.resolve().is_relative_to(base.resolve()):
            raise ValueError("Browser target escaped cache")
        extracted.rename(target)
    print(f"Installed reviewed Chrome {PIN['version']} for {key}; archive hash verified")


if __name__ == "__main__":
    if len(sys.argv) != 1:
        raise SystemExit("Archive path overrides are unsupported; only the pinned official download is allowed")
    install()
