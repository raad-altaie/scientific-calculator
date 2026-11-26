// Run with: node scripts/pages.js (scripts/sync-web.sh runs it)
// A page of the website at each address of the calculator (js/routes.js): web/physics/motion/projectile/index.html, served
// at raad.dev/calculator/physics/motion/projectile/, a folder's, as every host serves one the same, with or without its
// last /: GitHub Pages sends physics/motion to physics/motion/ where a folder of that name is. Each is web/index.html with its own title, description, canonical
// address, breadcrumbs and text for search engines, and its base the calculator's folder; the calculator opens on what
// the address shows (web/js/app.js). The cards' names and what they do are read from the files they are made in, as
// written, not run: js/main.js needs a page. And web/404.html, for an address of no page of its own, as the table by
// density, or of nothing there is any more, which opens the calculator on the nearest, on a host that serves a folder's
// own 404.html; GitHub Pages serves the site's alone, which sends such an address to the calculator as ?to= (web/js/app.js).
// And web/sitemap.xml with every address. The pages are made anew each time, the old ones
// taken away first: they are not kept in git (.gitignore)
'use strict';

var fs = require('fs'),
    path = require('path'),
    espree = require('espree'),
    CalcRoutes = require('../js/routes.js'),
    CalcChem = require('../js/chem.js'),
    CalcUnits = require('../js/units.js'),
    ROOT = path.join(__dirname, '..'),
    WEB = path.join(ROOT, 'web'),
    SITE = 'https://raad.dev/calculator/',
    NAME = 'Scientific Calculator';

// ---------- the cards, as written ---------- //

// the cards of each tool, by the name of their list and the file it is in
var LISTS = [
    ['solve', 'SOLVE_TOOLS', 'js/solve-panel.js'], ['numbers', 'NUMBER_TOOLS', 'js/numbers-panel.js'], ['phys', 'PHYS_TOOLS', 'js/phys-panel.js'],
    ['bio', 'BIO_TOOLS', 'js/bio-panel.js'], ['chem', 'CHEM_TOOLS', 'js/chem-panel.js'], ['conv', 'DATE_TOOLS', 'js/main.js'], ['stats', 'TEST_TOOLS', 'js/main.js']
];

function walk(node, visit) {
    if (!node || typeof node.type !== 'string') return;
    visit(node);
    Object.keys(node).forEach(function (k) {
        var v = node[k];
        if (Array.isArray(v)) v.forEach(function (c) { walk(c, visit); });
        else if (v && typeof v.type === 'string') walk(v, visit);
    });
}

// The text of a value as written: a string, strings joined with +, or tr('… {n} …', { n: … }), its words with each {name}
// of a string given, the rest left out. null for any other
function text(node) {
    var a, b, s, values = {};
    if (!node) return null;
    if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
    if (node.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked;
    if (node.type === 'BinaryExpression' && node.operator === '+') {
        a = text(node.left);
        b = text(node.right);
        return a !== null && b !== null ? a + b : null;
    }
    if (node.type === 'CallExpression' && node.callee.name === 'tr' && (s = text(node.arguments[0])) !== null) {
        if (node.arguments[1] && node.arguments[1].type === 'ObjectExpression') {
            node.arguments[1].properties.forEach(function (p) { values[p.key.name || p.key.value] = text(p.value); });
        }
        return s.replace(/\{(\w+)\} ?/g, function (all, k) { return typeof values[k] === 'string' ? values[k] + ' ' : ''; });
    }
    return null;
}

// each tool's cards, by tab: { phys: { motion: [{ id, t, d }] } }
function readCards() {
    var cards = {}, sources = {};
    LISTS.forEach(function (l) {
        var file = sources[l[2]] || (sources[l[2]] = espree.parse(fs.readFileSync(path.join(ROOT, l[2]), 'utf8'), { ecmaVersion: 2022 })), found = false;
        walk(file, function (node) {
            if (node.type !== 'VariableDeclarator' || node.id.name !== l[1] || !node.init || node.init.type !== 'ObjectExpression') return;
            found = true;
            cards[l[0]] = cards[l[0]] || {};
            node.init.properties.forEach(function (tab) {
                cards[l[0]][tab.key.name || tab.key.value] = (tab.value.elements || []).filter(function (e) { return e && e.type === 'ObjectExpression'; }).map(function (e) {
                    var card = {};
                    e.properties.forEach(function (p) {
                        var k = p.key && (p.key.name || p.key.value);
                        if (k === 'id' || k === 't' || k === 'd') card[k] = text(p.value);
                    });
                    return card;
                }).filter(function (card) { return card.id && card.t; });
            });
        });
        if (!found) throw new Error(l[1] + ' not found in ' + l[2]);
    });
    // the converter's groups of units, as main.js makes their cards (UNIT_TOOLS)
    cards.conv.units = CalcUnits.units.map(function (g) {
        var names = g.list.map(function (u) { return u.t; });
        return {
            id: 'units-' + g.c.toLowerCase().replace(/[^a-z]+/g, '-'), t: g.c,
            d: 'Convert ' + g.c.toLowerCase() + ' between ' + names.length + ' units: ' + names.slice(0, 6).join(', ') + (names.length > 6 ? ' and more' : '') + '. Type a value in any of them.'
        };
    });
    return cards;
}

// ---------- the words of each page ---------- //

// what the HTML of a name or a text reads as: no tags, its entities as their characters, one space between words
function plain(html) {
    return String(html).replace(/<sup>/g, '^').replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function attr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A description for search results: its sentences while they fit in about 160 characters, cut at a word with … if the
// first is longer
function short(s) {
    var out = '', full = false;
    // a sentence ends at . ! or ? before a space, not at the point of 196.97
    plain(s).split(/(?<=[.!?])\s+/).forEach(function (x) {
        if (full) return;
        if ((out + ' ' + x).trim().length <= 160) out = (out + ' ' + x).trim();
        else if (!out) out = x.slice(0, 157).replace(/\s+\S*$/, '') + '…';
        else full = true;
    });
    return out;
}

// each tool's own words: its title, what it is for, and what its cards are called, calculators or not
var TOOL_WORDS = {
    fx: { title: 'Formulas and Constants', d: 'Over 140 formulas of maths, physics, chemistry and finance, each worked out as you type its values, and 78 physical constants (CODATA 2022).', cards: '' },
    conv: { title: 'Unit Converter and Date Calculator', d: 'Convert length, mass, temperature, speed, data, pressure, energy and 30 more groups of units, and count days between dates.', cards: 'converter' },
    graph: { title: 'Graphing Calculator', d: 'Graph up to 25 functions with their roots, extremes, crossings, slope and tangent; sliders, areas, inequalities, polar and parametric curves.', cards: '' },
    numbers: { title: 'Matrix, Complex Number and Base Calculators', d: 'Matrices up to 10 × 10 with determinant, inverse and eigenvalues; complex numbers, bases, bits, prime factors, hashes and IP subnets.', cards: 'calculator' },
    solve: { title: 'Equation Solver, Calculus and Finance Calculators', d: 'Solve equations and inequalities, find derivatives and integrals, work out triangles and shapes, probabilities, loans and savings.', cards: 'calculator' },
    chem: { title: 'Periodic Table and Chemistry Calculators', d: 'An interactive periodic table of all 118 elements, molar mass, balancing equations, limiting reactants, molarity, pH and gas laws.', cards: 'calculator' },
    phys: { title: 'Physics Calculators', d: 'Physics calculators for electronics, motion, forces, waves, heat and matter, and modern physics: Ohm’s law, projectiles, lenses, decay and more.', cards: 'calculator' },
    bio: { title: 'Biology Calculators', d: 'Biology calculators for genetics, DNA and PCR, proteins and enzymes, lab dilutions, cells, health and ecology.', cards: 'calculator' },
    stats: { title: 'Statistics Calculator', d: 'Mean, median, standard deviation, quartiles, histogram and box plot of a list; regression of pairs; t-tests, chi-squared and ANOVA.', cards: 'test' }
};

// what a tab of no cards is for, where its tool's words are of more than it
var TAB_WORDS = {
    'chem/table': 'An interactive periodic table of all 118 elements, coloured by kind, electronegativity, melting point and more. Click one for its properties and story.'
};

// the tabs of their tool's name, by what they are
var TAB_NAMES = { 'solve/solve': 'Equation Solver', 'graph/graph': 'Function Grapher', 'fx/formulas': 'Formulas of Maths, Science and Money' };

// what the periodic table shows coloured by each of its filters (routes.js TABLE_BY)
var TABLE_BY_WORDS = {
    cat: 'metals, nonmetals, metalloids, noble gases, halogens, lanthanides and actinides, each in a colour of its own',
    en: 'the electronegativity of every element, on the Pauling scale, from the least to the most', block: 'the s, p, d and f blocks of the elements',
    ie: 'the first ionization energy of every element, from the least to the most', affinity: 'the electron affinity of every element, from the least to the most',
    radius: 'the atomic radius of every element, from the smallest to the largest', state: 'whether each element is a solid, a liquid or a gas, at any temperature you choose',
    mp: 'the melting point of every element, from the lowest to the highest', bp: 'the boiling point of every element, from the lowest to the highest',
    density: 'the density of every element, from the least to the most', mass: 'the atomic mass of every element, from the lightest to the heaviest',
    year: 'the year each element was discovered, from ancient times to the newest'
};

var CATS = { nonmetal: 'a nonmetal', noble: 'a noble gas', alkali: 'an alkali metal', alkaline: 'an alkaline earth metal', metalloid: 'a metalloid', halogen: 'a halogen',
    post: 'a post-transition metal', transition: 'a transition metal', lanthanide: 'a lanthanide', actinide: 'an actinide' };

// The words of the page at an address: { title: its own name, before the names of those it is in (page), h1, d: its description, text: what the page says of it without the calculator }
function words(r, table, cards) {
    var tool = table.tools[r.go], w = TOOL_WORDS[r.go], card, e, names, h1;
    if (r.kind === 'tool') {
        names = tool.tabs.map(function (t) { return t[2]; });
        return { title: w.title, h1: w.title, d: w.d, text: w.d + ' Its tabs: ' + names.join(', ') + '.' };
    }
    if (r.kind === 'tab') {
        names = ((cards[r.go] || {})[r.tab] || []).map(function (c) { return plain(c.t); });
        // a tab of its tool's name by what it is, Equation Solver; of cards, calculators of what it is for, Motion Calculators
        h1 = TAB_NAMES[r.go + '/' + r.tab] || titled(r.t) + (!names.length ? '' : w.cards === 'calculator' ? ' Calculators' : w.cards === 'converter' ? ' Converters' : '');
        return { title: h1, h1: h1 + ' – ' + tool.t, d: short(names.length ? r.t + ', in ' + tool.t + ': ' + names.slice(0, 12).join(', ') + (names.length > 12 ? ' and more' : '') + '.' : TAB_WORDS[r.go + '/' + r.tab] || w.d),
            text: names.length ? 'The ' + r.t.toLowerCase() + ' tab of ' + tool.t + ': ' + names.join(', ') + '.' : TAB_WORDS[r.go + '/' + r.tab] || w.d };
    }
    if (r.kind === 'by') {
        h1 = 'Periodic Table by ' + titled(r.t);
        return { title: titled(r.t), h1: h1, d: short('The periodic table coloured by ' + r.t.toLowerCase() + ': ' + TABLE_BY_WORDS[r.by] + '. Click an element for all it is.'),
            text: 'The periodic table of all 118 elements coloured by ' + r.t.toLowerCase() + ': ' + TABLE_BY_WORDS[r.by] + '. Click an element for its properties, isotopes and story.' };
    }
    if (r.kind === 'element') {
        e = CalcChem.elements[r.id - 1];
        h1 = e.name + ' (' + e.s + ')';
        return { title: h1, h1: h1,
            d: short(e.name + ' (' + e.s + '), element ' + e.z + ', ' + (CATS[e.cat] || 'an element') + ': atomic mass ' + e.mass + ', electron configuration ' + e.config +
                '. Its properties, isotopes and story on an interactive periodic table.'),
            text: e.name + ', ' + e.s + ', is element ' + e.z + ' of the periodic table, ' + (CATS[e.cat] || 'an element') + ' of period ' + e.period +
                (e.group ? ' and group ' + e.group : '') + (e.state ? ', ' + e.state + ' at room temperature' : '') + '. Its atomic mass is ' + e.mass +
                ' and its electron configuration ' + e.config + '. ' + (e.uses || '') };
    }
    card = ((cards[r.go] || {})[r.tab] || []).filter(function (c) { return c.id === r.id; })[0] || { t: r.t, d: '' };
    names = titled(plain(card.t));
    h1 = r.go === 'conv' && r.tab === 'units' ? names + ' Converter' : /calculator/i.test(names) || w.cards !== 'calculator' ? names : names + ' Calculator';
    return { title: h1, h1: h1, d: short(card.d ? after(h1, plain(card.d)) : h1 + '.'), text: plain(card.d || '') };
}

// A card's name as a title, Restriction Digest: each word with a capital, but the small ones; DNA, pH and t-test as they are
function titled(name) {
    return name.split(' ').map(function (word, i) {
        return (i && /^(a|an|and|as|at|by|for|from|in|of|on|or|the|to)$/.test(word)) || /^[a-z]+[A-Z]/.test(word) || /^[a-z]-/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

// what a card does after its name, Quadratic Calculator: its two roots…; a word in capitals, DNA, kept
function after(name, d) {
    return name + ': ' + (/^[A-Z][a-z]/.test(d) ? d.charAt(0).toLowerCase() + d.slice(1) : d);
}

// ---------- the pages ---------- //

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// a part of the page put in place of another, which must be there
function swap(html, find, put, what) {
    if (!find.test(html)) throw new Error('web/index.html: ' + what + ' not found');
    // put as it is: a $ of its words, a loan of $1,000, not read as a part of what was found
    return html.replace(find, typeof put === 'function' ? put : function () { return put; });
}

// The page at an address: index.html, its base the calculator's folder, its head of this address, its breadcrumbs, and
// its text for a page read without its script
function page(base, r, w, table) {
    var url = SITE + r.path + '/', up = [], at = r, html = base, crumbs, title, trail = [w.title];
    while (at) {
        up.unshift(at);
        at = at.up ? table.byPath[at.up] : null;
    }
    // its title as its address has it: its own name, then each it is in, Light and Photons Calculator | Waves | Physics; a
    // name the same as the one it is in said once, Solve of Solve
    up.slice(0, -1).reverse().forEach(function (x) {
        var name = titled(plain(x.t));
        if (name !== trail[trail.length - 1]) trail.push(name);
    });
    title = trail.join(' | ') + ' | ' + NAME;
    crumbs = [{ name: NAME, url: SITE }].concat(up.map(function (x) { return { name: plain(x.kind === 'element' ? x.t : x.t), url: SITE + x.path + '/' }; }));
    html = swap(html, /<base href="\.\/">/, '<base href="' + '../'.repeat(r.path.split('/').length) + '">', 'its <base href="./">');
    html = swap(html, /<title>[^<]*<\/title>/, '<title>' + esc(title) + '</title>', 'its title');
    html = swap(html, /(<meta name="description" content=")[^"]*/, function (all, at) { return at + attr(w.d); }, 'its description');
    html = swap(html, /(<link rel="canonical" href=")[^"]*/, function (all, at) { return at + url; }, 'its canonical address');
    html = swap(html, /(<meta property="og:url" content=")[^"]*/, function (all, at) { return at + url; }, 'its og:url');
    html = swap(html, /(<meta property="og:title" content=")[^"]*/, function (all, at) { return at + attr(trail.join(' | ')); }, 'its og:title');
    html = swap(html, /(<meta property="og:description" content=")[^"]*/, function (all, at) { return at + attr(w.d); }, 'its og:description');
    html = swap(html, /(<meta name="twitter:title" content=")[^"]*/, function (all, at) { return at + attr(trail.join(' | ')); }, 'its twitter:title');
    html = swap(html, /(<meta name="twitter:description" content=")[^"]*/, function (all, at) { return at + attr(w.d); }, 'its twitter:description');
    html = swap(html, /(<meta name="keywords" content=")[^"]*/, function (all, at) { return at + attr([w.h1.toLowerCase()].concat(up.slice(0, -1).map(function (x) { return plain(x.t).toLowerCase(); }), 'scientific calculator', 'online calculator').join(', ')); }, 'its keywords');
    html = swap(html, /(<\/script>\s*)(<script>\s*\/\/ the options hidden)/, function (all, end, next) {
        return end + '<script type="application/ld+json">\n' + JSON.stringify({
            '@context': 'https://schema.org', '@type': 'BreadcrumbList',
            itemListElement: crumbs.map(function (c, i) { return { '@type': 'ListItem', position: i + 1, name: c.name, item: c.url }; })
        }, null, 4) + '\n    </script>\n    ' + next;
    }, 'the script after its JSON-LD');
    html = swap(html, /<noscript>[\s\S]*?<\/noscript>/, '<noscript>\n        <h1>' + esc(w.h1) + '</h1>\n        <p>' + esc(w.text.trim()) + '</p>\n        <p>' +
        crumbs.slice(0, -1).map(function (c) { return '<a href="' + c.url + '">' + esc(c.name) + '</a>'; }).join(' › ') +
        '. It needs JavaScript to run; nothing you type leaves your browser.</p>\n    </noscript>', 'its <noscript>');
    return html;
}

// what an earlier run made, taken away: each tool's folder, its page of before as well, physics.html, and 404.html
function clear(table) {
    Object.keys(table.tools).forEach(function (go) {
        var p = table.tools[go].path;
        fs.rmSync(path.join(WEB, p + '.html'), { force: true });
        fs.rmSync(path.join(WEB, p), { recursive: true, force: true });
    });
    fs.rmSync(path.join(WEB, '404.html'), { force: true });
}

function write(file, html) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
}

function main() {
    var base = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8'), cards = readCards(),
        table = CalcRoutes.build(cards, CalcChem.elements), urls = [], sitemap, kept;
    clear(table);
    table.list.forEach(function (r) {
        // an element by another filter than kind, and an element's address of before, have none: 404.html opens them
        if (r.page === false) return;
        write(path.join(WEB, r.path, 'index.html'), page(base, r, words(r, table, cards), table));
        urls.push(SITE + r.path + '/');
    });
    // 404.html: the calculator, at whatever address it is served, its files by the folder's own address; not a page to find
    write(path.join(WEB, '404.html'), swap(swap(swap(base, /<base href="\.\/">/, '<base href="/calculator/">', 'its <base href="./">'),
        /(<meta name="robots" content=")[^"]*/, function (all, at) { return at + 'noindex'; }, 'its robots'), /\s*<link rel="canonical" href="[^"]*">/, '', 'its canonical address'));
    // the sitemap: the pages of its own, as they were, then one of each address
    sitemap = fs.readFileSync(path.join(WEB, 'sitemap.xml'), 'utf8');
    kept = (sitemap.match(/ {4}<url>[\s\S]*?<\/url>\n/g) || []).filter(function (u) {
        var loc = /<loc>([^<]*)<\/loc>/.exec(u);
        return loc && !Object.keys(table.tools).some(function (go) { return loc[1].indexOf(SITE + table.tools[go].path) === 0; });
    });
    fs.writeFileSync(path.join(WEB, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        kept.join('') + urls.map(function (u) { return '    <url>\n        <loc>' + u + '</loc>\n    </url>\n'; }).join('') + '</urlset>\n');
    console.log('web/: ' + urls.length + ' pages of addresses, ' + urls.length + ' of them in sitemap.xml, and 404.html');
}

// run, it makes the pages; required, as by the tests, it gives what it reads them from
if (require.main === module) main();
module.exports = { readCards: readCards, LISTS: LISTS };
