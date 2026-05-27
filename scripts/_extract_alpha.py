#!/usr/bin/env python3
"""Extract the alpha-LSB length-prefixed payload from a PNG and write to stdout (bytes)."""
import sys
from pathlib import Path
from PIL import Image

path = Path(sys.argv[1]).resolve()
img = Image.open(path).convert("RGBA")
w, h = img.size
px = img.load()


def rb(i: int) -> int:
    v = 0
    for bit in range(8):
        p = i * 8 + bit
        x = p % w
        y = p // w
        v = (v << 1) | (px[x, y][3] & 1)
    return v


length = (rb(0) << 24) | (rb(1) << 16) | (rb(2) << 8) | rb(3)
out = bytes(rb(i + 4) for i in range(length))
sys.stdout.buffer.write(out)
