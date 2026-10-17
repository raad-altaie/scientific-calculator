#!/bin/sh
# Package the extension for the extension stores: runtime files only. One zip for
# Chrome and Edge, one for Firefox, which has its own manifest
set -e
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/scientific-calculator-$VERSION.zip"
FIREFOX_OUT="dist/scientific-calculator-$VERSION-firefox.zip"
FILES="manifest.json managed_schema.json options.html popup.html css js imgs fonts/Play-Regular.ttf"

mkdir -p dist
rm -f "$OUT" "$FIREFOX_OUT"
zip -r -X -q "$OUT" $FILES -x '*.DS_Store'
echo "Created $OUT"

# dist/firefox is also the folder to load in Firefox's about:debugging
rm -rf dist/firefox
mkdir -p dist/firefox
rsync -aR --exclude .DS_Store $FILES dist/firefox/
rm dist/firefox/managed_schema.json
node scripts/firefox-manifest.js manifest.json dist/firefox/manifest.json
(cd dist/firefox && zip -r -X -q "../$(basename "$FIREFOX_OUT")" .)
echo "Created $FIREFOX_OUT"
