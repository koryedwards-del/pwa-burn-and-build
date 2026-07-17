#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/_site"

rm -rf "$OUT"
mkdir -p "$OUT"

cp -r "$ROOT/landing/." "$OUT/"
cp "$ROOT/CNAME" "$OUT/CNAME"

for path in createyourfoodplan questionnaire program-report menuplanner css data img contacts; do
  cp -r "$ROOT/$path" "$OUT/$path"
done

# landing/ also has js/ (calculator). Merge repo js into OUT/js — do not cp -r js js
# or GitHub Pages ends up with /js/js/startSite.js while HTML loads /js/startSite.js.
mkdir -p "$OUT/js"
cp -r "$ROOT/js/." "$OUT/js/"

ASSET_VERSION=$(sed -n "s/.*ASSET_VERSION = '\([^']*\)'.*/\1/p" "$ROOT/js/assetVersion.js" | head -1)
if [ -z "$ASSET_VERSION" ]; then
  echo "Could not read ASSET_VERSION from js/assetVersion.js" >&2
  exit 1
fi

find "$OUT" -name '*.html' -print0 | while IFS= read -r -d '' file; do
  perl -pi -e "s/\\?v=[0-9]*/?v=${ASSET_VERSION}/g" "$file"
done

echo "Built GitHub Pages site at $OUT (asset v${ASSET_VERSION})"
