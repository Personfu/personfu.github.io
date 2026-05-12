#!/usr/bin/env python3
"""Detect and print benign data appended after PNG IEND.
Usage: python png_trailer_scan.py <png-or-directory>
"""
from __future__ import annotations

import sys
from pathlib import Path

PNG_IEND = b"\x00\x00\x00\x00IEND\xaeB`\x82"
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
