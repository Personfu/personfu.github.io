"""Install the pinned Chrome sandbox helper only on a disposable Linux CI runner."""
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

if sys.platform != "linux" or os.geteuid() == 0 or os.environ.get("GITHUB_ACTIONS") != "true":
    raise SystemExit("Sandbox installation requires an unprivileged disposable GitHub Linux runner")
repo = Path(__file__).resolve().parent.parent
pin = json.loads((repo / "tests/security/chrome-pin.json").read_text(encoding="utf8"))
source = repo / ".cache/security-chrome" / pin["version"] / "linux-x64/chrome-linux64/chrome_sandbox"
target = Path("/usr/lib/fllc-ci/chrome-sandbox")
if os.environ.get("CHROME_DEVEL_SANDBOX") != str(target):
    raise SystemExit("Unexpected Chrome sandbox helper configuration")
if source.is_symlink() or not source.is_file():
    raise SystemExit("Pinned Chrome sandbox source is not a regular file")
if hashlib.sha256(source.read_bytes()).hexdigest() != pin["platforms"]["linux-x64"]["sandboxSha256"]:
    raise SystemExit("Chrome sandbox helper hash mismatch")
for parent in target.parent.parents:
    info = parent.lstat()
    if stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
        raise SystemExit("Sandbox installation parent is not root-protected")
if target.parent.exists() or target.parent.is_symlink():
    raise SystemExit("Dedicated CI sandbox installation already exists; refusing overwrite")
subprocess.run(["sudo", "install", "-d", "-o", "root", "-g", "root", "-m", "755", str(target.parent)], check=True)
subprocess.run(["sudo", "install", "-o", "root", "-g", "root", "-m", "4755", str(source), str(target)], check=True)
for path in (target, *target.parents):
    info = path.lstat()
    if stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
        raise SystemExit("Chrome sandbox helper and parents must remain root-protected")
info = target.stat()
if not stat.S_ISREG(info.st_mode) or not info.st_mode & stat.S_ISUID:
    raise SystemExit("Chrome setuid sandbox installation failed")
if hashlib.sha256(target.read_bytes()).hexdigest() != pin["platforms"]["linux-x64"]["sandboxSha256"]:
    raise SystemExit("Installed sandbox helper hash mismatch")
print("Verified matching pinned Chrome sandbox helper in a root-protected CI directory; OS security policy unchanged")
