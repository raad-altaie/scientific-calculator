#!/bin/sh
# Package the extension for the Chrome Web Store: runtime files only.
set -e
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/scientific-calculator-$VERSION.zip"

mkdir -p dist
rm -f "$OUT"
zip -r -X -q "$OUT" \
    manifest.json calc.html options.html popup.html \
    css js imgs \
    fonts/PixelPoint.ttf fonts/Play-Regular.ttf \
    -x '*.DS_Store'

echo "Created $OUT"
