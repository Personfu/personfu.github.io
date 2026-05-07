from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


HERE = Path(__file__).resolve().parent
UPSTREAM = HERE / "dogfight-sandbox-hg2"
SOURCE = UPSTREAM / "source"
MANIFEST = HERE / "assets.json"
ENTRYPOINT = SOURCE / "cyberworld_main.py"
RUNTIME = SOURCE / "cyberworld_theme_runtime.py"


def validate() -> dict[str, object]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    required_files = [
        UPSTREAM / "README.md",
        SOURCE / "main.py",
        SOURCE / "master.py",
        SOURCE / "Missions.py",
        ENTRYPOINT,
        RUNTIME,
    ]
    missing = [str(path.relative_to(HERE)) for path in required_files if not path.exists()]
    return {
        "upstream": str(UPSTREAM),
        "entrypoint": str(ENTRYPOINT),
        "aircraft": len(manifest["aircraft"]),
        "start_scene": manifest["start_scene"],
        "missing": missing,
    }


def print_status() -> int:
    status = validate()
    print(json.dumps(status, indent=2))
    return 1 if status["missing"] else 0


def run_game(extra_args: list[str]) -> int:
    status = validate()
    if status["missing"]:
        print("CyberWorld dogfight integration is incomplete:")
        for missing_path in status["missing"]:
            print(f"  missing: {missing_path}")
        return 1

    command = [sys.executable, str(ENTRYPOINT), *extra_args]
    return subprocess.call(command, cwd=SOURCE)


def main() -> int:
    parser = argparse.ArgumentParser(description="CyberWorld launcher for harfang3d/dogfight-sandbox-hg2")
    parser.add_argument("--check", action="store_true", help="validate files and print integration status")
    parser.add_argument("args", nargs=argparse.REMAINDER, help="arguments passed through to the upstream game")
    parsed = parser.parse_args()

    if parsed.check:
        return print_status()
    return run_game(parsed.args)


if __name__ == "__main__":
    raise SystemExit(main())