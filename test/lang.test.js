// Run with: node test/lang.test.js
// The languages (js/lang.js): the one chosen or the browser's, words by their English with English where there
// are none, values and forms of a number, the pseudo-language; and what scripts/lang.js finds to translate
'use strict';

var fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    childProcess = require('child_process'),
    ROOT = path.join(__dirname, '..'),
    SOURCE = fs.readFileSync(path.join(ROOT, 'js/lang.js'), 'utf8'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

// lang.js run as a page runs it: with what localStorage keeps, the browser's languages, and the languages it has
// (its LANGS) as given; then the words of each given language added, as its file does
function load(kept, languages, langs, tables) {
    var box = {
        localStorage: { getItem: function (k) { return kept[k] === undefined ? null : JSON.stringify(kept[k]); } },
        navigator: { languages: languages, language: languages[0] },
        Intl: Intl
    };
    box.window = box;
    vm.runInNewContext(SOURCE.replace(/var LANGS = \{[^}]*\}/, 'var LANGS = ' + JSON.stringify(langs)), box);
    Object.keys(tables || {}).forEach(function (code) { box.CalcLang.add(code, tables[code]); });
    return box.CalcLang;
}

var LANGS = { en: 'English', es: 'Español', 'pt-BR': 'Português (Brasil)' },
    ES = { Clear: 'Borrar', 'Not yet': '', '{n} of {all}': '{n} de {all}', '{n} days': { one: '{n} día', other: '{n} días' } },
    L;

// which language: the one chosen, else the browser's first that there is, else English
check(load({}, ['en-US'], LANGS).code === 'en', 'English for an English browser');
check(load({}, ['es-MX', 'en'], LANGS).code === 'es', 'a browser in es-MX gets es');
check(load({}, ['pt-BR'], LANGS).code === 'pt-BR', 'pt-BR as itself, where there is one');
check(load({}, ['fr-FR', 'es'], LANGS).code === 'es', 'the browser\'s next language, where there is none of the first');
check(load({}, ['fr-FR'], LANGS).code === 'en', 'English where there is none of the browser\'s');
check(load({ lang: 'es' }, ['en-US'], LANGS).code === 'es', 'the one chosen, over the browser\'s');
check(load({ lang: 'xx' }, ['es'], LANGS).code === 'es', 'one chosen that there is not: the browser\'s');
check(load({ lang: 'xx' }, ['es'], LANGS).chosen() === 'auto', 'and it reads as auto');
check(load({ lang: 'es' }, ['en'], LANGS).locale === 'es', 'the locale for dates');

// words by their English, English where there are none
L = load({ lang: 'es' }, ['en'], LANGS, { es: ES });
check(L.t('Clear') === 'Borrar', 'a word');
check(L.t('Not yet') === 'Not yet', 'one left \'\' is English');
check(L.t('Never seen') === 'Never seen', 'one not in the file is English');
check(L.t('{n} of {all}', { n: 3, all: 10 }) === '3 de 10', 'values put in', L.t('{n} of {all}', { n: 3, all: 10 }));
check(L.t('{n} of {x}', { n: 3 }) === '3 of {x}', 'a value not given stays as it is');
check(L.n(1, '{n} day', '{n} days') === '1 día' && L.n(5, '{n} day', '{n} days') === '5 días', 'the forms of a number');
check(L.n(2, '{n} week', '{n} weeks') === '2 weeks', 'forms not translated: English');
L = load({}, ['en'], LANGS);
check(L.n(1, '{n} day', '{n} days') === '1 day' && L.n(0, '{n} day', '{n} days') === '0 days', 'English forms');
check(L.t('Clear') === 'Clear' && L.t('{a} and {b}', { a: 'x', b: 'y' }) === 'x and y', 'English as it is, its values put in');

// the pseudo-language: every word marked, tags, entities and values kept; maths as it is
L = load({ lang: 'qps' }, ['en'], LANGS);
check(L.code === 'qps' && L.locale === 'en', 'the pseudo-language');
check(/^\[Çļéåŕ ~+\]$/.test(L.t('Clear')), 'a word accented, longer, in brackets', L.t('Clear'));
check(L.t('Press <b>Enter</b> &amp; {n}', { n: 2 }).indexOf('<b>') > -1 && L.t('Press <b>Enter</b> &amp; {n}', { n: 2 }).indexOf('&amp; 2') > -1, 'its tags, entities and values kept');
check(L.t('x') === 'x' && L.t('R<sub>C</sub>') === 'R<sub>C</sub>', 'a letter alone is maths');

// what there is to translate: the words of the code and of the pages, not their classes, nor the names on the keys
var found = childProcess.execFileSync('node', [path.join(ROOT, 'scripts/lang.js'), 'strings']).toString().split('\n');
['Clear', 'With 2nd: {f}', '{n} decimal places', '{n} boxes are not numbers.', 'Results', 'Number format', 'Search units', 'Loan', 'Language'].forEach(function (text) {
    check(found.indexOf(text) > -1, 'found to translate: ' + text);
});
['calc-sv-item', 'sin', 'MODE', 'Deg', '{n} decimal place'].forEach(function (text) {
    check(found.indexOf(text) < 0, 'not to translate: ' + text);
});
check(found.filter(Boolean).length === new Set(found.filter(Boolean)).size, 'each once');

// every language's file: loads, and is on the list
fs.readdirSync(path.join(ROOT, 'js/lang')).filter(function (f) { return /\.js$/.test(f); }).forEach(function (file) {
    var code = file.replace(/\.js$/, ''), table = null;
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/lang', file), 'utf8'), { CalcLang: { add: function (c, t) { table = c === code ? t : null; } } });
    check(!!table, file + ': its words, under its code');
    check(new RegExp('var LANGS = \\{[^}]*\\b' + code.replace('-', '\\-') + '\\b').test(SOURCE), file + ': on the list of lang.js');
});

console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
