#!/usr/bin/env python3
"""Trim outer black matte on the brand logo.

Source: solid bblogo with square black corners (git f7bd919 export).
Outputs:
  bblogo.png        — UI on dark backgrounds (outer matte → transparent)
  bblogo-print.png  — Print Shop on white paper (outer matte → white, RGB, no alpha)
"""
from __future__ import annotations

from collections import deque
from io import BytesIO
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    raise SystemExit('Pillow and numpy required') from exc

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / 'img' / 'brand'
UI_TARGET = BRAND / 'bblogo.png'
PRINT_TARGET = BRAND / 'bblogo-print.png'
SOLID_SOURCE_COMMIT = 'f7bd919:img/brand/bblogo.png'


def is_matte(r: int, g: int, b: int, alpha: int) -> bool:
    if alpha < 20:
        return True
    return r < 45 and g < 45 and b < 45


def flood_fill_outer_matte(pixels: np.ndarray, fill: tuple[int, int, int, int]) -> np.ndarray:
    out = pixels.copy()
    height, width = out.shape[:2]
    visited = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if visited[y, x]:
            return
        r, g, b, alpha = out[y, x]
        if is_matte(int(r), int(g), int(b), int(alpha)):
            visited[y, x] = True
            queue.append((x, y))

    for x in range(width):
        try_seed(x, 0)
        try_seed(x, height - 1)
    for y in range(height):
        try_seed(0, y)
        try_seed(width - 1, y)

    while queue:
        x, y = queue.popleft()
        out[y, x] = fill
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height or visited[ny, nx]:
                continue
            r, g, b, alpha = out[ny, nx]
            if is_matte(int(r), int(g), int(b), int(alpha)):
                visited[ny, nx] = True
                queue.append((nx, ny))

    return out


def load_solid_source() -> Image.Image:
    import subprocess

    raw = subprocess.check_output(['git', 'show', SOLID_SOURCE_COMMIT], cwd=ROOT)
    return Image.open(BytesIO(raw)).convert('RGBA')


def write_logo_variants() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    pixels = np.array(load_solid_source())

    ui = flood_fill_outer_matte(pixels, (0, 0, 0, 0))
    Image.fromarray(ui).save(UI_TARGET, optimize=True)

    print_rgba = flood_fill_outer_matte(pixels, (255, 255, 255, 255))
    Image.fromarray(print_rgba).convert('RGB').save(PRINT_TARGET, optimize=True)

    print(f'Wrote {UI_TARGET} ({UI_TARGET.stat().st_size} bytes, transparent outer matte)')
    print(f'Wrote {PRINT_TARGET} ({PRINT_TARGET.stat().st_size} bytes, white outer matte, RGB)')


if __name__ == '__main__':
    write_logo_variants()
