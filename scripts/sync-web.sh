#!/bin/sh
# Copy the calculator from the extension into web/, so the website follows it.
# The web-only changes are not edited into the copies: web/css/calc-overrides.css
# holds them, and this script only links it into calc.html.
set -e
cd "$(dirname "$0")/.."

cp css/style.css css/options.css web/css/
cp js/engine.js js/tips.js js/formulas.js js/main.js web/js/
cp imgs/icon.png imgs/icon128.png web/imgs/
cp fonts/Play-Regular.ttf fonts/Play-Bold.ttf web/fonts/

# calc.html: a viewport tag and the link to the overrides, after the style sheet
sed -e 's|<meta charset="utf-8">|&\n    <meta name="viewport" content="width=device-width, initial-scale=1">|' \
    -e 's|<link rel="stylesheet" type="text/css" href="css/style.css">|&\n    <link rel="stylesheet" type="text/css" href="css/calc-overrides.css">|' \
    calc.html > web/calc.html

grep -q calc-overrides web/calc.html || { echo "calc.html changed: the overrides link was not added" >&2; exit 1; }
echo "web/ is up to date"
