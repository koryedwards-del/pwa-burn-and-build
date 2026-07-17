#!/usr/bin/env python3
"""Trim outer black matte on the brand logo into UI (transparent) and print (white) PNGs."""
from __future__ import annotations

from collections import deque
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


def load_source_with_matte() -> Image.Image:
    """Use UI logo; if corners are already transparent, restore matte from git original."""
    im = Image.open(UI_TARGET).convert('RGBA')
    corners = [
        im.getpixel((0, 0)),
        im.getpixel((im.width - 1, 0)),
        im.getpixel((0, im.height - 1)),
        im.getpixel((im.width - 1, im.height - 1)),
    ]
    if all(p[3] > 200 and p[0] < 45 and p[1] < 45 and p[2] < 45 for p in corners):
        return im

    import subprocess

    raw = subprocess.check_output(
        ['git', 'show', 'f7bd919:img/brand/bblogo.png'],
        cwd=ROOT,
    )
    from io import BytesIO

    return Image.open(BytesIO(raw)).convert('RGBA')


def write_logo_variants() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    source = load_source_with_matte()
    pixels = np.array(source)

    ui = flood_fill_outer_matte(pixels, (0, 0, 0, 0))
    Image.fromarray(ui).save(UI_TARGET, optimize=True)

    print_logo = flood_fill_outer_matte(pixels, (255, 255, 255, 255))
    Image.fromarray(print_logo).save(PRINT_TARGET, optimize=True)

    print(f'Wrote {UI_TARGET} ({UI_TARGET.stat().st_size} bytes, transparent corners)')
    print(f'Wrote {PRINT_TARGET} ({PRINT_TARGET.stat().st_size} bytes, white corners)')


if __name__ == '__main__':
    write_logo_variants()
