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

console.log((failures ? failures + ' of ' : 'All ') + checks + ' checks' + (failures ? ' failed' : ' passed') + ' (parts)');
process.exit(failures ? 1 : 0);
