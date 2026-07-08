#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/_site"

rm -rf "$OUT"
mkdir -p "$OUT"

cp -r "$ROOT/landing/." "$OUT/"
cp "$ROOT/CNAME" "$OUT/CNAME"

for path in myplan createyourfoodplan css js data img icons contacts shell; do
  cp -r "$ROOT/$path" "$OUT/$path"
done

for file in privacypolicy.html support.html sw.js favicon.ico favicon-16x16.png favicon-32x32.png apple-touch-icon.png; do
  if [ -f "$ROOT/$file" ]; then
    cp "$ROOT/$file" "$OUT/$file"
  fi
done

echo "Built GitHub Pages site at $OUT"
