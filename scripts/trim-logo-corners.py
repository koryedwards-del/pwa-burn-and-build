#!/usr/bin/env python3
"""Flood-fill outer black matte on img/brand/bblogo.png to transparency."""
from __future__ import annotations

from collections import deque
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    raise SystemExit('Pillow and numpy required') from exc

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'img' / 'brand' / 'bblogo.png'


def is_matte(r: int, g: int, b: int, alpha: int) -> bool:
    if alpha < 20:
        return True
    return r < 45 and g < 45 and b < 45


def trim_logo_corners(path: Path = TARGET) -> None:
    im = Image.open(path).convert('RGBA')
    pixels = np.array(im, copy=True)
    height, width = pixels.shape[:2]
    visited = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if visited[y, x]:
            return
        r, g, b, alpha = pixels[y, x]
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
        pixels[y, x] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height or visited[ny, nx]:
                continue
            r, g, b, alpha = pixels[ny, nx]
            if is_matte(int(r), int(g), int(b), int(alpha)):
                visited[ny, nx] = True
                queue.append((nx, ny))

    Image.fromarray(pixels).save(path, optimize=True)
    print(f'Trimmed {path} ({path.stat().st_size} bytes)')


if __name__ == '__main__':
    trim_logo_corners()
