// Run with: node test/sync.test.js
// The website's copy of the calculator, web/, the same as the extension's: every file
// scripts/sync-web.sh copies there, and the calculator's markup of popup.html in
// web/index.html. The list is read from that script, so a file added to it is checked too
'use strict';

var fs = require('fs'),
    path = require('path'),
    root = path.join(__dirname, '..'),
    script = fs.readFileSync(path.join(root, 'scripts/sync-web.sh'), 'utf8'),
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
    try {
        return fs.readFileSync(path.join(root, file));
    } catch (e) {
        return null;
    }
}

// each cp line of the script: its files, a folder's *.js each file in it, into the folder at its end
var pairs = [];
script.split('\n').forEach(function (line) {
    var words = line.replace(/\s+2>.*$|\s*\|\|.*$/, '').trim().split(/\s+/), into;
    if (words[0] !== 'cp' || words.length < 3) return;
    into = words.pop();
    words.slice(1).forEach(function (from) {
        var files = [from];
        if (from.indexOf('*') > -1) {
            var dir = path.dirname(from), ending = path.basename(from).replace('*', '');
            files = fs.readdirSync(path.join(root, dir)).filter(function (f) { return f.endsWith(ending); })
                .map(function (f) { return dir + '/' + f; });
        }
        files.forEach(function (f) { pairs.push([f, into.replace(/\/?$/, '/') + path.basename(f)]); });
    });
});

check(pairs.length > 20, 'the files of scripts/sync-web.sh read', pairs.length + ' found');
pairs.forEach(function (p) {
    var a = read(p[0]), b = read(p[1]);
    check(a !== null, p[0] + ' is there');
    check(b !== null, p[1] + ' is there: run scripts/sync-web.sh');
    if (a !== null && b !== null) check(a.equals(b), p[1] + ' the same as ' + p[0] + ': an edit made in one of them only');
});

// the calculator itself: what popup.html has between its two marks, as web/index.html has it
function calculator(file) {
    var text = String(read(file) || ''), start = text.indexOf('<!-- calculator:'), end = text.indexOf('<!-- /calculator -->');
    if (start < 0 || end < start) return null;
    return text.slice(text.indexOf('\n', start) + 1, end);
}

var popup = calculator('popup.html'), web = calculator('web/index.html');
check(popup !== null && web !== null, 'the calculator marked in popup.html and web/index.html');
check(popup === web, 'the calculator of web/index.html the same as popup.html\'s: run scripts/sync-web.sh');

// the cache of the service worker named by the version and a sum of every other file of web/, as scripts/sync-web.sh
// sets it: a file changed after the script ran, and offline copies of the old ones would be kept
var crypto = require('crypto'), sha1 = function (b) { return crypto.createHash('sha1').update(b).digest('hex'); }, files = [];
(function walk(dir) {
    fs.readdirSync(path.join(root, 'web', dir), { withFileTypes: true }).forEach(function (d) {
        var rel = dir + '/' + d.name;
        if (d.isDirectory()) walk(rel); else if (rel !== './sw.js' && d.name !== '.DS_Store') files.push(rel);
    });
})('.');
var sum = sha1(files.sort().map(function (f) { return sha1(read('web/' + f)) + '  ' + f + '\n'; }).join('')).slice(0, 8),
    version = JSON.parse(String(read('manifest.json'))).version,
    cache = /^const CACHE = '([^']*)';$/m.exec(String(read('web/sw.js')));
check(cache && cache[1] === 'calculator-' + version + '-' + sum, 'web/sw.js: its CACHE of this version and these files: run scripts/sync-web.sh',
    (cache ? cache[1] : 'none') + ', not calculator-' + version + '-' + sum);

console.log((failures ? failures + ' of ' : 'All ') + checks + ' checks' + (failures ? ' failed' : ' passed') + ' (sync)');
process.exit(failures ? 1 : 0);
