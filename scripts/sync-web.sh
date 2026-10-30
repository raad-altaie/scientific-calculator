#!/bin/sh
# Copy the calculator from the extension into web/, so the website follows it.
# The web-only changes are not edited into the copies: web/css/site.css holds
# them, and this script only puts the calculator's markup into web/index.html.
set -e
cd "$(dirname "$0")/.."

cp css/style.css css/options.css web/css/
cp js/engine.js js/tips.js js/formulas.js js/maths.js js/units.js js/icons.js js/chem.js js/physics.js js/biology.js js/main.js web/js/
cp imgs/icon.png imgs/icon128.png web/imgs/
cp fonts/Play-Regular.ttf fonts/Play-Bold.ttf web/fonts/

# the calculator itself: what popup.html has between its two marks goes between
# the same two marks of web/index.html, in place of what was there
awk '
    FNR == NR {
        if (/<!-- \/calculator -->/) copy = 0
        if (copy) calc = calc $0 "\n"
        if (/<!-- calculator:/) copy = 1
        next
    }
    /<!-- \/calculator -->/ { printf "%s", calc; skip = 0 }
    !skip { print }
    /<!-- calculator:/ { skip = 1 }
' popup.html web/index.html > web/index.html.new

grep -q 'id="calculator"' web/index.html.new || {
    rm web/index.html.new
    echo "popup.html or web/index.html changed: the calculator was not copied" >&2
    exit 1
}
mv web/index.html.new web/index.html
echo "web/ is up to date"
