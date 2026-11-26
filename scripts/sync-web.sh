#!/bin/sh
# Copy the calculator from the extension into web/, so the website follows it.
# The web-only changes are not edited into the copies: web/css/site.css holds
# them, and this script only puts the calculator's markup into web/index.html.
set -e
cd "$(dirname "$0")/.."

cp css/style.css css/options.css web/css/
cp js/lang.js js/engine.js js/tips.js js/formulas.js js/maths.js js/units.js js/icons.js js/chem.js js/physics.js js/biology.js js/graph.js js/chem-panel.js js/phys-panel.js js/bio-panel.js js/solve-panel.js js/numbers-panel.js js/routes.js js/main.js web/js/
# the languages: each one's words, js/lang/<code>.js (lang.js)
mkdir -p web/js/lang
rm -f web/js/lang/*.js
cp js/lang/*.js web/js/lang/ 2>/dev/null || true
cp imgs/icon.png imgs/icon128.png web/imgs/
cp fonts/*.woff2 fonts/*-OFL.txt web/fonts/

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

# a page at the address of each tool, tab, card, element and group of units, physics/motion/projectile, and
# sitemap.xml with them: made from web/index.html, so after it (scripts/pages.js)
node scripts/pages.js

# the cache of the service worker named by the version and by what every other file of web/ holds: any change, a
# release or a fix put up without one, is a new sw.js, so the service worker is installed again and keeps the new
# files, not old copies of those it is rarely asked for, as other languages' words (sw.js)
VERSION=$(node -p "require('./manifest.json').version")
SUM=$(cd web && find . -type f ! -name sw.js ! -name .DS_Store -print0 | LC_ALL=C sort -z | xargs -0 shasum | shasum | cut -c1-8)
sed -i.bak "s/^const CACHE = '[^']*';$/const CACHE = 'calculator-$VERSION-$SUM';/" web/sw.js && rm web/sw.js.bak
grep -q "^const CACHE = 'calculator-$VERSION-$SUM';$" web/sw.js || { echo "web/sw.js: its CACHE line not found" >&2; exit 1; }
echo "web/ is up to date"
