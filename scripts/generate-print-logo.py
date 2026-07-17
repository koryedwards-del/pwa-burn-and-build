#!/usr/bin/env python3
"""Trim and resize img/brand/bblogo.png for Print Shop headers."""
from __future__ import annotations

import io
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    raise SystemExit('Pillow required: pip install pillow') from exc

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'img' / 'brand' / 'bblogo.png'
OUT = ROOT / 'img' / 'brand' / 'bblogo-print.png'
MAX_EDGE = 160

im = Image.open(SRC).convert('RGBA')
bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)

ratio = MAX_EDGE / max(im.width, im.height)
size = (max(1, round(im.width * ratio)), max(1, round(im.height * ratio)))
im = im.resize(size, Image.Resampling.LANCZOS)
im.save(OUT, format='PNG', optimize=True)
print(f'Wrote {OUT} ({size[0]}x{size[1]}, {OUT.stat().st_size} bytes)')
