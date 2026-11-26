// Run with: node test/parts.test.js
// The files main.js makes as it starts, graph.js and each js/*-panel.js: what each gives the
// calculator in its shared list, part.x, against what main.js and the other files read and
// write of it. A name read that is not given is undefined, and only fails when its card is
// drawn (graphPart.GRAPH_CURVES once); one written needs its setter, or it throws. And each
// name given, and each forwarder of main.js to it, is a function of its own: made twice in
// a file, the second one takes the place of the first everywhere (saveGraph once: Save as
// PNG stored the graph in place of saving its picture)
'use strict';

var fs = require('fs'),
    path = require('path'),
    espree = require('espree'),
    escope = require('eslint-scope'),
    root = path.join(__dirname, '..'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

// how many times each name is made in a file, in any of its functions
function declared(text) {
    var counts = {};
    escope.analyze(espree.parse(text, { ecmaVersion: 2022, range: true }), { ecmaVersion: 2022 }).scopes.forEach(function (scope) {
        scope.variables.forEach(function (v) {
            if (v.defs.length) counts[v.name] = (counts[v.name] || 0) + v.defs.length;
        });
    });
    return counts;
}

var main = read('js/main.js'),
    files = fs.readdirSync(path.join(root, 'js')).filter(function (f) { return /^(graph|.+-panel)\.js$/.test(f); }).map(function (f) { return 'js/' + f; }),
    texts = {},
    parts = [];

files.forEach(function (f) { texts[f] = read(f); });

// each part as main.js makes it: var graphPart = {}; CalcGraph({ … }, graphPart);
var made = /^ {4}var (\w+Part) = \{\};\n {4}(Calc\w+)\(\{/gm, m;
while ((m = made.exec(main))) {
    var maker = m[2], file = files.filter(function (f) { return texts[f].indexOf('global.' + maker + ' = function') > -1; })[0];
    parts.push({ name: m[1], global: maker, file: file });
}
check(parts.length === files.length, 'a part of main.js for each of ' + files.join(', '), parts.map(function (p) { return p.name; }).join(', '));

parts.forEach(function (p) {
    var t = p.name + ' (' + (p.file || p.global + '?') + '): ';
    if (!p.file) return check(false, t + 'its file found');
    var text = texts[p.file],
        head = 'Object.defineProperties(shared, Object.getOwnPropertyDescriptors({\n',
        a = text.indexOf(head), b = text.indexOf('\n        }));', a),
        fns = {}, gets = {}, sets = {}, counts = declared(text);

    check(a > -1 && b > a, t + 'its shared list found');
    text.slice(a + head.length, b).split(/,\n/).forEach(function (e) {
        var x;
        e = e.trim();
        if ((x = /^(\w+): (\w+)$/.exec(e))) fns[x[1]] = x[2];
        else if ((x = /^get (\w+)\(\)/.exec(e))) gets[x[1]] = true;
        else if ((x = /^set (\w+)\(v\)/.exec(e))) sets[x[1]] = true;
        else check(false, t + 'an entry of its shared list as the split makes them', e);
    });

    // what every file reads and writes of it
    [{ file: 'js/main.js', text: main }].concat(files.filter(function (f) { return f !== p.file; }).map(function (f) { return { file: f, text: texts[f] }; })).forEach(function (u) {
        var re = new RegExp('\\b' + p.name + '\\.(\\w+)(\\s*(?:[-+*/%]?=(?!=)|\\+\\+|--))?', 'g'), x, seen = {};
        while ((x = re.exec(u.text))) {
            var key = x[1] + (x[2] ? '=' : '');
            if (seen[key]) continue;
            seen[key] = true;
            check(fns[x[1]] || gets[x[1]], t + u.file + ' reads ' + p.name + '.' + x[1] + ': it is given');
            if (x[2]) check(sets[x[1]], t + u.file + ' writes ' + p.name + '.' + x[1] + ': it has a setter');
        }
    });

    // each name given made once in its file, and each forwarder of main.js once in main.js
    var mainCounts = declared(main);
    Object.keys(fns).forEach(function (n) {
        check(counts[fns[n]] === 1, t + fns[n] + ' made once in ' + p.file, (counts[fns[n]] || 0) + ' times');
    });
    var fwd = new RegExp('^    function (\\w+)\\(\\) \\{ return ' + p.name + '\\.(\\w+)\\.apply\\(this, arguments\\); \\}$', 'gm'), y;
    while ((y = fwd.exec(main))) {
        check(y[1] === y[2] && fns[y[2]], t + 'main.js forwards ' + y[1] + ' to a function it gives');
        check(mainCounts[y[1]] === 1, t + y[1] + ' made once in main.js', (mainCounts[y[1]] || 0) + ' times');
    }
});

// The addresses (js/routes.js): each tool's tabs those of its panel in popup.html, in its order, so a tab added there has
// an address too; and every card of a tab one of its own, as scripts/pages.js reads them: of two of one name, only the
// first would have one, and a card whose list is not written as it reads it would have none
var CalcRoutes = require('../js/routes.js'), popupHtml = read('popup.html'), cards = require('../scripts/pages.js').readCards(),
    routeTable = CalcRoutes.build(cards, require('../js/chem.js').elements),
    PANEL_CLASS = { fx: 'calc-fx', conv: 'calc-conv', graph: 'calc-graph', numbers: 'calc-numbers', solve: 'calc-solve', chem: 'calc-chem', phys: 'calc-phys', bio: 'calc-bio', stats: 'calc-stats' };
CalcRoutes.TOOLS.forEach(function (tool) {
    var at = popupHtml.indexOf('<div class="calc-past ' + PANEL_CLASS[tool.go] + '">'), head = at < 0 ? '' : popupHtml.slice(at, popupHtml.indexOf('calc-past-close', at)),
        tabs = (head.match(/data-tab="[^"]+"/g) || []).map(function (t) { return t.slice(10, -1); });
    check(tabs.join() === tool.tabs.map(function (t) { return t[0]; }).join(), 'routes.js: the tabs of ' + tool.go + ' as popup.html has them', tabs.join() + ' in popup.html');
    tool.tabs.forEach(function (tab) {
        var of = (cards[tool.go] || {})[tab[0]] || [], have = routeTable.list.filter(function (r) { return r.kind === 'card' && r.go === tool.go && r.tab === tab[0]; });
        check(have.length === of.length, 'routes: an address for each card of ' + tool.go + ' ' + tab[0], have.length + ' of ' + of.length);
    });
});
check(routeTable.list.filter(function (r) { return r.kind === 'card'; }).length > 300, 'routes: the cards read from their files', routeTable.list.length);
// and each card as written in its file, counted apart from how pages.js reads it: a tab's list that is not an array
// written out, an entry that is not an object written out, or a card whose id or name pages.js cannot read (a
// variable, a call other than tr) would have no page or place in the sitemap, though the calculator gives it an address
require('../scripts/pages.js').LISTS.forEach(function (l) {
    var found = false;
    (function walk(node) {
        if (!node || typeof node.type !== 'string') return;
        if (node.type === 'VariableDeclarator' && node.id.name === l[1] && node.init && node.init.type === 'ObjectExpression') {
            found = true;
            node.init.properties.forEach(function (tab) {
                var name = tab.key.name || tab.key.value, written = tab.value.type === 'ArrayExpression' ? tab.value.elements : null,
                    read = ((cards[l[0]] || {})[name] || []).length;
                check(written && written.every(function (e) { return e && e.type === 'ObjectExpression'; }), 'pages.js: ' + l[1] + '.' + name + ' an array of cards written out', l[2]);
                if (written) check(read === written.length, 'pages.js: every card of ' + l[1] + '.' + name + ' read, its id and name', read + ' of ' + written.length + ' in ' + l[2]);
            });
            return;
        }
        Object.keys(node).forEach(function (k) {
            var v = node[k];
            if (Array.isArray(v)) v.forEach(walk);
            else if (v && typeof v.type === 'string') walk(v);
        });
    })(espree.parse(read(l[2]), { ecmaVersion: 2022 }));
    check(found, 'pages.js: ' + l[1] + ' in ' + l[2]);
});
// the periodic table's filters, as its buttons in popup.html are, in their order
check((popupHtml.match(/class="calc-pt-mode" data-by="[^"]+"/g) || []).map(function (m) { return /data-by="([^"]+)"/.exec(m)[1]; }).join() ===
    CalcRoutes.TABLE_BY.map(function (b) { return b[0]; }).join(), 'routes.js: the filters of the periodic table as popup.html has them');

console.log((failures ? failures + ' of ' : 'All ') + checks + ' checks' + (failures ? ' failed' : ' passed') + ' (parts)');
process.exit(failures ? 1 : 0);
