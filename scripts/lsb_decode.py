#!/usr/bin/env python3
"""LSB decoder for CyberWorld stego PNGs.
Reads the red-channel LSB. First 4 bytes (big-endian) are the payload length.
Usage: python lsb_decode.py path/to/png [r|g|b|a]
"""
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

    sys.stdout.buffer.write(payload + b"\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
