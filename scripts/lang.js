// The languages of the calculator (js/lang.js): what there is to translate, en.js with the English of each text by a
// short name, and each language's file of words by the same names.
//
//   node scripts/lang.js                     each language: how much of it is translated, and to check
//   node scripts/lang.js update              en.js and every language brought up to the code: a new text named, ''
//                                            in each language till translated; one that changed a little keeps its
//                                            name and words, put on the language's list to check
//   node scripts/lang.js add es Español      js/lang/es.js made, every name in it '', and es put on the options' list
//   node scripts/lang.js missing es          what es has no words for yet, and what it has to check: name: English
//   node scripts/lang.js merge es words.json the words of a file put into es.js, by name { "clear": "Borrar" } or by
//                                            the English { "Clear": "Borrar" }; one to check taken off the list
//   node scripts/lang.js export es           es's words as JSON, by name, for a translator or a translation site
//   node scripts/lang.js check               every language's values, {n}, and tags, <sup>, as the English's (test)
//   node scripts/lang.js strings             every English text there is to translate
//
// The English is found in the code: what goes through tr(), trn(), CalcLang.t() and CalcLang.n(); the words of the
// cards, formulas, tips and the rest that main.js translates as it shows them (their t, d, l, c, name, head, note and
// title, the choices of a card, what a formula's letters stand for, the lines of a menu, a notice); and the words
// of the pages, as CalcLang.dom() translates them. What is put together as it is shown, 'Angles in ' + unit, is
// not found till it is written as tr('Angles in {unit}', …). In the calculator, localStorage.langDebug = true keeps
// what it showed with no words in CalcLang.missing, and localStorage.lang = '"qps"' shows what is not translated
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = ['js/main.js', 'js/tips.js', 'js/formulas.js', 'js/units.js', 'js/chem.js', 'js/physics.js', 'js/biology.js', 'js/options.js', 'js/popup.js', 'web/js/options.js', 'web/js/app.js'];
const PAGES = ['popup.html', 'options.html', 'web/index.html'];
const PROPS = new Set(['t', 'd', 'l', 'c', 'name', 'aria', 'head', 'note', 'title', 'text', 'small']); // of the data main.js translates as it shows it
// what main.js translates as it shows it, by the value of a call it is: notify(text), svgText(x, y, text) …
const ARGS = { tr: 0, setTitle: 0, notify: 0, svgText: 2, svgOf: 3, planeSvg: 1, graphDrawing: 0, curveDrawing: 0, drawnTile: 1, textRow: 0, bioWarn: 1 };
const WORDS = /[A-Za-z]{2}/; // a text to translate has a word: x, r and θ are maths
// lists of main.js and popup.js whose words they show with tr(): of each of their entries, these places, [id, 'Shown',
// 'in a note']; values, of an object of them { root: 'Root' }
const LISTS = { BY: [1, 2], STATS_FITS: [1], ZONE_CHOICES: [0], GRAPH_NAMES: 'values', PANELS: [0] };

// ---------------- the code ---------------- //

// A string as it is in the code, its escapes read
function unescape(body) {
    return body.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (m, e) => {
        if (e[0] === 'u') return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16));
        if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
        return { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0', '\n': '' }[e] ?? e;
    });
}

// The code as its tokens: { s } a string, { id } a name, { p } anything else, as ( or :. Comments, templates and
// regular expressions are passed over, a / read as one where a value is to come
function tokens(src) {
    const out = [];
    let i = 0;
    const valueNext = () => {
        const last = out[out.length - 1];
        return !last || (last.p && !/^([)\]}]|num|re|tpl)$/.test(last.p)) || (last.id && /^(return|typeof|case|in|of|delete|void|throw|new)$/.test(last.id));
    };
    while (i < src.length) {
        const c = src[i];
        if (/\s/.test(c)) {
            i++;
        } else if (src.startsWith('//', i)) {
            i = src.indexOf('\n', i);
            if (i < 0) break;
        } else if (src.startsWith('/*', i)) {
            i = src.indexOf('*/', i + 2) + 2;
        } else if (c === '\'' || c === '"') {
            let j = i + 1;
            while (src[j] !== c) j += src[j] === '\\' ? 2 : 1;
            out.push({ s: unescape(src.slice(i + 1, j)) });
            i = j + 1;
        } else if (c === '`') { // a template: its text and what is in its ${}, passed over
            let j = i + 1, depth = 0;
            while (j < src.length && (src[j] !== '`' || depth)) {
                if (src[j] === '\\') j++;
                else if (src.startsWith('${', j)) depth++, j++;
                else if (src[j] === '}' && depth) depth--;
                j++;
            }
            out.push({ p: '`' });
            i = j + 1;
        } else if (c === '/' && valueNext()) { // a regular expression, to the / that ends it, not one in [ ]
            let j = i + 1, inClass = false;
            while (j < src.length && (src[j] !== '/' || inClass)) {
                if (src[j] === '\\') j++;
                else if (src[j] === '[') inClass = true;
                else if (src[j] === ']') inClass = false;
                j++;
            }
            j++;
            while (/[a-z]/.test(src[j])) j++;
            out.push({ p: 're' });
            i = j;
        } else if (/[A-Za-z_$]/.test(c)) {
            const m = /^[\w$]+/.exec(src.slice(i, i + 80));
            out.push({ id: m[0] });
            i += m[0].length;
        } else if (/[0-9]/.test(c)) {
            const m = /^[0-9a-fA-FxXobn._e]+/.exec(src.slice(i, i + 80));
            out.push({ p: 'num' });
            i += m[0].length;
        } else {
            out.push({ p: c });
            i++;
        }
    }
    return out;
}

// A text of strings alone, 'one ' + 'two', at token i: [the text, the token after it], or null where it has more in it
function literal(list, i) {
    let text = '';
    if (!list[i] || list[i].s === undefined) return null;
    for (;;) {
        text += list[i].s;
        i++;
        if (list[i] && list[i].p === '+' && list[i + 1] && list[i + 1].s !== undefined) i++;
        else break;
    }
    if (list[i] && list[i].p === '+') return null; // 'Angles in ' + unit
    return [text, i];
}

// The texts a value at token i can be, to where it ends: 'Loan', or each of a choice, x ? 'Yes' : 'No', as the value is
// shown whole; not a text joined to more, nor one compared, nor what is in a call
function leaves(list, i) {
    const out = [];
    for (let depth = 0, k = i; list[k]; k++) {
        const t = list[k];
        if (/^[([{]$/.test(t.p)) {
            if (t.p !== '(' || (list[k - 1] && (list[k - 1].id || /^[)\]]$/.test(list[k - 1].p)))) { // a call, an array or an object: passed over
                for (let d = 0; list[k]; k++) {
                    if (/^[([{]$/.test(list[k].p)) d++;
                    else if (/^[)\]}]$/.test(list[k].p) && --d === 0) break;
                }
                continue;
            }
            depth++;
            continue;
        }
        if (/^[)\]}]$/.test(t.p)) {
            if (--depth < 0) break;
            continue;
        }
        if (!depth && (t.p === ',' || t.p === ';')) break;
        if (t.s === undefined) continue;
        const lit = literal(list, k), prev = list[k - 1], after = lit ? list[lit[1]] : null;
        if (lit && !(prev && /^[+=!<>]$/.test(prev.p)) && !(after && /^[=!<>]$/.test(after.p))) out.push(lit[0]);
        k = lit ? lit[1] - 1 : k;
        while (list[k + 1] && list[k + 1].p === '+') { // the rest of a text joined to more: passed over
            k += 2;
            if (list[k] && /^[([{]$/.test(list[k].p)) k--;
        }
    }
    return out;
}

// the strings of a list of them, [ 'a', 'b' ] at token i (the [), each alone
function strings(list, i) {
    const out = [];
    for (i++; list[i] && list[i].p !== ']'; i++) {
        const lit = literal(list, i);
        if (lit) {
            out.push(lit[0]);
            i = lit[1] - 1;
        } else if (list[i].p === '[' || list[i].p === '{' || list[i].p === '(') {
            return out; // not a list of strings alone
        }
    }
    return out;
}

// The English of a script: [text, plural], plural the one form of a text of trn() or CalcLang.n()
function scriptTexts(src) {
    const list = tokens(src), out = [];
    const add = (text, own, one) => {
        if (typeof text === 'string' && (own || (WORDS.test(text.replace(/<[^>]*>/g, ' ')) && /[A-Z ]/.test(text) && !/^(calc-|#)/.test(text)))) {
            out.push([text, one]);
        }
    };
    list.forEach((tok, i) => {
        const next = list[i + 1], after = list[i + 2];
        let call = '';
        if (tok.id && next && next.p === '(' && (ARGS[tok.id] !== undefined || tok.id === 'trn' || tok.id === 'trc') && !(list[i - 1] && list[i - 1].p === '.') && !(list[i - 1] && list[i - 1].id === 'function')) call = tok.id;
        if (tok.id === 'CalcLang' && next && next.p === '.' && after && /^(t|n)$/.test(after.id) && list[i + 3] && list[i + 3].p === '(') call = after.id === 't' ? 'tr' : 'trn';
        if (call) {
            let at = (tok.id === 'CalcLang' ? i + 3 : i + 1) + 1; // after the (
            if (call === 'trn') { // trn(n, one, other): past the number, to the first comma not in brackets
                let depth = 0;
                for (; list[at] && !(depth === 0 && list[at].p === ','); at++) {
                    if (/[([{]/.test(list[at].p)) depth++;
                    if (/[)\]}]/.test(list[at].p)) depth--;
                }
                const one = literal(list, at + 1), other = one && list[one[1]] && list[one[1]].p === ',' && literal(list, one[1] + 1);
                if (other) add(other[0], true, one[0]);
                return;
            }
            if (call === 'tr') { // a text, or either of two: tr(x ? 'a' : 'b')
                const lit = literal(list, at);
                if (lit) add(lit[0], true);
                else leaves(list, at).forEach((text) => add(text, true));
                return;
            }
            if (call === 'trc') { // trc(context, text): kept under both, as CalcLang.c keeps it
                const context = literal(list, at), text = context && list[context[1]] && list[context[1]].p === ',' && literal(list, context[1] + 1);
                if (text) add(context[0] + '\u0004' + text[0], true);
                return;
            }
            for (let k = ARGS[call], depth = 0; k > 0 && list[at]; at++) { // to its value: past as many commas not in brackets
                if (/^[([{]$/.test(list[at].p)) depth++;
                else if (/^[)\]}]$/.test(list[at].p) && --depth < 0) return;
                else if (!depth && list[at].p === ',') k--;
            }
            leaves(list, at).forEach((text) => add(text));
            return;
        }
        // a property of the data: t: 'Loan', choice: ['Monthly', 'Yearly'], and a formula's letters, v: [['r', 'r', 'radius']]
        if ((tok.id || tok.s !== undefined) && next && next.p === ':' && !(list[i - 1] && list[i - 1].p === '?')) {
            const key = tok.id || tok.s;
            if (PROPS.has(key)) {
                leaves(list, i + 2).forEach((text) => add(text));
            } else if (key === 'ph') { // what a box holds, its hint, a word of small letters as well: volts
                leaves(list, i + 2).forEach((text) => add(text, WORDS.test(text)));
            } else if (key === 'choice' && after && after.p === '[') {
                strings(list, i + 2).forEach((text) => add(text));
            } else if (key === 'v' && after && after.p === '[' && list[i + 3] && list[i + 3].p === '[') {
                for (let j = i + 3; list[j] && list[j].p === '['; ) {
                    const three = strings(list, j);
                    if (three[2]) add(three[2], true);
                    while (list[j] && list[j].p !== ']') j++;
                    j++;
                    if (list[j] && list[j].p === ',') j++;
                }
            }
        }
        // a list of LISTS: BY = [['auto', 'Auto'], …], GRAPH_NAMES = { root: 'Root', … }
        if (tok.id && LISTS[tok.id] && next && next.p === '=' && after && /^[[{]$/.test(after.p)) {
            const at = LISTS[tok.id];
            for (let j = i + 3, depth = 1, place = 0; list[j] && depth; j++) {
                const t = list[j];
                if (/^[[{]$/.test(t.p)) depth++, place = 0;
                else if (/^[\]}]$/.test(t.p)) depth--;
                else if (t.p === ',') place++;
                else if (t.s !== undefined && (at === 'values' ? list[j - 1].p === ':' : depth === 2 && at.includes(place))) add(t.s, true);
            }
        }
        // a line of a menu: ['Copy', function () { … }]
        if (tok.p === '[' && next && next.s !== undefined && after && after.p === ',' && list[i + 3] && list[i + 3].id === 'function') add(next.s, true);
    });
    return out;
}

// ---------------- the pages ---------------- //

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', times: '×', divide: '÷', pi: 'π', radic: '√', minus: '−', ndash: '–', mdash: '—', hellip: '…', deg: '°', middot: '·', copy: '©' };

function decode(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
        if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
        return ENTITIES[e] ?? m;
    });
}

const keyOf = (text) => text.replace(/\s+/g, ' ').trim(); // as lang.js keeps the page's texts

// The English of a page, as CalcLang.dom() translates it: each text, its title, placeholder, aria-label and alt;
// a data-t element's whole; nothing in one marked translate="no", nor in a script, a style, a drawing or a key
function pageTexts(html) {
    const out = [], stack = [], VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;
    const SKIP = /^(script|style|svg|code|kbd|textarea)$/i;
    const skipping = () => stack.some((el) => el.skip);
    const add = (text) => {
        const key = keyOf(decode(text));
        if (WORDS.test(key)) out.push([key]);
    };
    const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
    let m, whole = null; // a data-t element: where its inside starts, and how deep it is
    while ((m = re.exec(html))) {
        if (m[4] !== undefined) {
            if (!skipping() && !whole) add(m[4]);
            continue;
        }
        if (!m[2]) continue; // a comment
        const name = m[2], attrs = m[3] || '';
        if (m[1]) { // a closing tag: up to the element it closes
            const at = stack.map((el) => el.name).lastIndexOf(name.toLowerCase());
            if (at > -1) {
                if (whole && whole.depth === at) {
                    if (!skipping()) add(html.slice(whole.from, m.index));
                    whole = null;
                }
                stack.length = at;
            }
            continue;
        }
        const skip = SKIP.test(name) || /\stranslate=["']no["']/.test(attrs);
        if (!skip && !skipping() && !whole) {
            for (const a of attrs.matchAll(/\s(title|placeholder|aria-label|alt)=(?:"([^"]*)"|'([^']*)')/g)) add(a[2] ?? a[3]);
        }
        if (VOID.test(name) || /\/\s*$/.test(attrs)) continue;
        stack.push({ name: name.toLowerCase(), skip });
        if (!whole && /\sdata-t(\s|=|$)/.test(attrs)) whole = { from: re.lastIndex, depth: stack.length - 1 };
    }
    return out;
}

// ---------------- the languages ---------------- //

// Every English text there is to translate, each once, in the order found: { text: { one, from } }
function allTexts() {
    const all = new Map();
    const take = (file, list) => list.forEach(([text, one]) => {
        if (!all.has(text)) all.set(text, { from: file, one });
        else if (one) all.get(text).one = one;
    });
    SCRIPTS.forEach((file) => take(file, scriptTexts(fs.readFileSync(path.join(ROOT, file), 'utf8'))));
    PAGES.forEach((file) => take(file, pageTexts(fs.readFileSync(path.join(ROOT, file), 'utf8'))));
    take('js/chem.js', chemTexts());
    take('js/units.js', require(path.join(ROOT, 'js/units.js')).units.flatMap((g) => g.list.map((u) => [u.t]))); // meters as well, a word of small letters
    return all;
}

// The periodic table's words, as main.js shows them: each element's name, its uses and where its name comes from, its
// magnetism, crystal and look, of chem.js; who found it where that is not a person (Egyptians); and the names of the tiles of an element, the keys
// of CHEM_FACTS in main.js
function chemTexts() {
    const chem = require(path.join(ROOT, 'js/chem.js')), out = [];
    chem.elements.forEach((e) => {
        [e.name, e.uses, e.story, e.magnetic, e.crystal, e.appearance].forEach((text) => text && out.push([text]));
        [e.foundBy, e.isolatedBy].forEach((who) => who && /humans|ians|ists|civilisation|^Middle East$/.test(who) && !/\(/.test(who) && out.push([who]));
    });
    const facts = /CHEM_FACTS = \{([^}]*)\}/.exec(fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8'));
    if (facts) for (const m of facts[1].matchAll(/'([^']+)':/g)) out.push([m[1]]);
    return out;
}

const DIRS = ['js/lang', 'web/js/lang']; // each file written to both copies
const fileOf = (code) => path.join(ROOT, 'js/lang', code + '.js');
const q = JSON.stringify;

// A file of js/lang as it is: its words by name, and the names it has to check, those translated from an earlier
// English, the third of its CalcLang.add
function readFile(code) {
    let words = null, check = [];
    if (!fs.existsSync(fileOf(code))) return null;
    vm.runInNewContext(fs.readFileSync(fileOf(code), 'utf8'), { CalcLang: { add: (c, w, k) => { words = w; check = k || []; } } });
    return { words: words || {}, check: new Set(check) };
}

// the English of a text of en.js, as the code asks for it (lang.js): the text, the other of a number's forms, or a
// text of a context, 'state' and the text with \u0004 between
const englishOf = (entry) => (typeof entry === 'string' ? entry : entry.other !== undefined ? entry.other : entry.context + '\u0004' + entry.text);

// a text of en.js from its English: { one, other } for a number's, { context, text } for one of a context
function entryOf(text, info) {
    if (info.one) return { one: info.one, other: text };
    if (text.includes('\u0004')) return { context: text.split('\u0004')[0], text: text.split('\u0004')[1] };
    return text;
}

const done = (v) => (typeof v === 'string' ? !!v : !!v && typeof v === 'object' && !!v.other);

// A name for a text, of its first words that say most, 'Results are rounded to {places}.' results_rounded_places;
// one of a context with its context after, solid_state; _2 after one already taken
const STOP = new Set('a an the is are be been it its this that these those'.split(' '));
function nameFor(text, taken) {
    const words = (s) => decode(s.replace(/<[^>]*>/g, ' ')).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().match(/[a-z0-9]+/g) || [];
    const [context, own] = text.includes('\u0004') ? text.split('\u0004') : ['', text];
    const every = words(own), said = every.filter((w) => !STOP.has(w));
    const base = (said.length ? said : every).slice(0, 4).concat(context ? words(context) : []).join('_') || 'text';
    let name = base;
    for (let i = 2; taken.has(name); i++) name = base + '_' + i;
    taken.add(name);
    return name;
}

// How alike two texts are, 0 to 1: 1 less the letters to change, of the longer one's
function alike(a, b) {
    if (Math.min(a.length, b.length) / Math.max(a.length, b.length) < 0.75) return 0;
    let row = Array.from({ length: b.length + 1 }, (v, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const next = [i];
        for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        row = next;
    }
    return 1 - row[b.length] / Math.max(a.length, b.length);
}

// The English of the calculator by name: each text of the code under the name it had, a text that changed a
// little under the name of the one it was, the rest under new names. { names: text → name, renamed: the names whose
// English changed }
function nameAll(all, en) {
    const was = new Map(Object.keys(en).map((name) => [englishOf(en[name]), name]));
    const gone = [...was.keys()].filter((text) => !all.has(text)), names = new Map(), renamed = new Set();
    const taken = new Set(Object.keys(en)); // a name of a text gone is not given again: its words would come with it
    const kind = (entry) => (typeof entry === 'string' ? 'text' : entry.other !== undefined ? 'forms' : 'context');
    all.forEach((info, text) => {
        if (was.has(text)) return names.set(text, was.get(text));
        let best = 0, near = -1;
        gone.forEach((old, i) => { // of the same kind: a text for a text, forms for forms
            const like = old && kind(en[was.get(old)]) === kind(entryOf(text, info)) ? alike(old, text) : 0;
            if (like > best) best = like, near = i;
        });
        if (best >= 0.75) {
            names.set(text, was.get(gone[near]));
            renamed.add(was.get(gone[near]));
            gone[near] = null;
        }
    });
    all.forEach((info, text) => {
        if (!names.has(text)) names.set(text, nameFor(text, taken));
    });
    return { names, renamed };
}

// The languages of the options' list, as lang.js has them
function langList() {
    const src = fs.readFileSync(path.join(ROOT, 'js/lang.js'), 'utf8');
    return vm.runInNewContext('(' + /var LANGS = (\{[^}]*\})/.exec(src)[1] + ')');
}

// a language put on the list by its own name, in both copies of lang.js
function listLang(code, name) {
    const langs = langList();
    if (langs[code] === name || !name) return;
    langs[code] = name;
    const text = '{ ' + Object.keys(langs).map((c) => (/^\w+$/.test(c) ? c : q(c)) + ': ' + q(langs[c]).replace(/^"|"$/g, '\'')).join(', ') + ' }';
    ['js/lang.js', 'web/js/lang.js'].forEach((file) => {
        const at = path.join(ROOT, file);
        fs.writeFileSync(at, fs.readFileSync(at, 'utf8').replace(/var LANGS = \{[^}]*\}/, 'var LANGS = ' + text));
    });
}

function write(code, text) {
    DIRS.forEach((dir) => {
        fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
        fs.writeFileSync(path.join(ROOT, dir, code + '.js'), text);
    });
}

// the lines of a file, by the file of the calculator each text is first found in
function grouped(all, names, line) {
    const lines = [];
    let from = '';
    all.forEach((info, text) => {
        if (info.from !== from) {
            from = info.from;
            lines.push((lines.length ? '\n' : '') + '    // ' + from);
        }
        lines.push('    ' + q(names.get(text)) + ': ' + line(names.get(text), text, info) + ',');
    });
    return lines.join('\n').replace(/,$/, '');
}

// en.js: the English of each name, as the code has it
function writeEn(all, names) {
    write('en', '// English: the text of each name, as the code asks for it (js/lang.js); each language has its words by these\n' +
        '// names. Made by node scripts/lang.js update from the code: not to be changed here, but in the code\n' +
        'CalcLang.add("en", {\n' + grouped(all, names, (name, text, info) => {
            const entry = entryOf(text, info);
            return typeof entry === 'string' ? q(entry) : '{ ' + Object.keys(entry).map((k) => k + ': ' + q(entry[k])).join(', ') + ' }';
        }) + '\n});\n');
}

// A language's file: every name of en.js, its words where it has them, '' where not; one of a number's forms with as
// many forms as the language has. After them, the names of those to check: translated from an earlier English
function writeLang(code, all, names, words, check) {
    const forms = (() => {
        try {
            return new Intl.PluralRules(code).resolvedOptions().pluralCategories;
        } catch (e) {
            return ['one', 'other'];
        }
    })();
    const body = grouped(all, names, (name, text, info) => {
        const own = words[name];
        if (!info.one) return q(typeof own === 'string' ? own : '');
        return '{ ' + forms.map((f) => f + ': ' + q((own && typeof own === 'object' && own[f]) || '')).join(', ') + ' }';
    });
    const toCheck = [...names.values()].filter((name) => check.has(name) && done(words[name]));
    write(code, '// ' + (langList()[code] || code) + ': the words of the calculator, by the names of js/lang/en.js, which has the English\n' +
        '// of each. Brought up to date with node scripts/lang.js update; a text left \'\' shows in English till it is\n' +
        '// translated. Each keeps its tags, <sup>2</sup>, and the names of its values, {n}, as they are\n' +
        'CalcLang.add(' + q(code) + ', {\n' + body + '\n}' + (toCheck.length ? ', [\n    // translated from an earlier English: to check, then taken off this list\n    ' + toCheck.map(q).join(',\n    ') + '\n]' : '') + ');\n');
}

// Every language and en.js brought up to the code: new texts named, '' in each language till translated; a text
// that changed a little keeps its name and its words, to check; the words of a text no longer there taken out
function update(all) {
    const en = (readFile('en') || { words: {} }).words, { names, renamed } = nameAll(all, en);
    writeEn(all, names);
    const codes = Object.keys(langList()).filter((c) => c !== 'en');
    codes.forEach((c) => {
        const file = readFile(c) || { words: {}, check: new Set() };
        renamed.forEach((name) => file.check.add(name));
        writeLang(c, all, names, file.words, file.check);
    });
    return { names, renamed, codes };
}

// The names of en.js, by their English as the code asks for it
function namesNow() {
    const en = (readFile('en') || { words: {} }).words;
    return { en, byText: new Map(Object.keys(en).map((name) => [englishOf(en[name]), name])) };
}

// What is wrong with a language's words: a name en.js has not, or the wrong kind of value; the values, {n}, and the
// tags, <sup>, not those of the English. A form of a number may leave out its number: one, as a word
function problems(code, en, words) {
    const out = [], marks = (s, re) => [...new Set(s.match(re) || [])].sort().join(' ');
    const VALUES = /\{\w+\}/g, TAGS = /<\/?[a-zA-Z][\w-]*/g;
    Object.keys(words).forEach((name) => {
        const entry = en[name], own = words[name];
        if (!Object.prototype.hasOwnProperty.call(en, name)) return out.push(name + ': not a name of en.js');
        const english = typeof entry === 'string' ? entry : entry.other !== undefined ? entry.other : entry.text;
        if (entry.other !== undefined) {
            if (own === '' || own === undefined) return;
            if (typeof own !== 'object') return out.push(name + ': forms of a number, { one: …, other: … }, not a text');
            Object.keys(own).forEach((form) => {
                const v = own[form];
                if (!v) return;
                const extra = (v.match(VALUES) || []).filter((m) => !english.includes(m) && !entry.one.includes(m));
                if (extra.length) out.push(name + '.' + form + ': ' + extra.join(' ') + ' is not a value of the English');
                if (marks(v, TAGS) !== marks(english, TAGS)) out.push(name + '.' + form + ': its tags are not those of the English');
            });
            return;
        }
        if (typeof own !== 'string') return out.push(name + ': a text, not ' + typeof own);
        if (!own) return;
        if (marks(own, VALUES) !== marks(english, VALUES)) out.push(name + ': its values, ' + (marks(own, VALUES) || 'none') + ', are not the English\'s, ' + (marks(english, VALUES) || 'none'));
        if (marks(own, TAGS) !== marks(english, TAGS)) out.push(name + ': its tags, ' + (marks(own, TAGS) || 'none') + ', are not the English\'s, ' + (marks(english, TAGS) || 'none'));
    });
    return out;
}

const [command, code, name] = process.argv.slice(2);
const usage = 'node scripts/lang.js [update | add <code> <name> | missing <code> | merge <code> <file.json> | export <code> | check | strings]';
const isCode = (c) => /^[a-z]{2,3}(-[A-Z]{2})?$/.test(c || '');

if (command === 'strings') {
    allTexts().forEach((info, text) => console.log(text));
} else if (command === 'update') {
    const { names, renamed, codes } = update(allTexts());
    console.log('js/lang/en.js: ' + names.size + ' texts' + (renamed.size ? ', ' + renamed.size + ' changed a little, to check: ' + [...renamed].join(', ') : '') +
        (codes.length ? '; brought up to date: ' + codes.join(', ') : ''));
} else if (command === 'add' && isCode(code) && name) {
    if (langList()[code]) {
        console.error(code + ' is already on the list: node scripts/lang.js update brings it up to date');
        process.exit(1);
    }
    listLang(code, name);
    update(allTexts());
    console.log('js/lang/' + code + '.js and its copy in web/: every text, \'\' till it is translated');
} else if (command === 'merge' && isCode(code) && name) { // { "clear": "Borrar", … }, or by the English, { "Clear": "Borrar", … }
    if (!readFile(code)) {
        console.error('No js/lang/' + code + '.js: make it first with node scripts/lang.js add ' + code + ' <its name>');
        process.exit(1);
    }
    // en.js and every language brought up to the code first: a text new since the last update put in as well, by its
    // name or its English, and no name left in the language that en.js has not
    const all = allTexts(), { names } = update(all), file = readFile(code), { en, byText } = namesNow();
    const words = JSON.parse(fs.readFileSync(name, 'utf8'));
    // by name where each is a name, else by the English: a name can be an English text too, points of Points
    const byName = Object.keys(words).every((key) => Object.prototype.hasOwnProperty.call(en, key));
    let taken = 0;
    Object.keys(words).forEach((key) => {
        const at = byName ? key : byText.get(key);
        if (!at) return console.error('Not a name nor a text of the calculator: ' + key.slice(0, 80));
        file.words[at] = words[key];
        file.check.delete(at);
        taken++;
    });
    writeLang(code, all, names, file.words, file.check);
    console.log(taken + ' texts put into js/lang/' + code + '.js and its copy in web/');
} else if (command === 'missing' && isCode(code)) { // each: its name, and the English
    const file = readFile(code), { en } = namesNow();
    if (!file) {
        console.error('No js/lang/' + code + '.js');
        process.exit(1);
    }
    Object.keys(en).forEach((n) => {
        if (!done(file.words[n])) console.log(n + ': ' + englishOf(en[n]).replace('\u0004', ' | '));
        else if (file.check.has(n)) console.log(n + ' (to check): ' + englishOf(en[n]).replace('\u0004', ' | '));
    });
} else if (command === 'export' && isCode(code)) { // as JSON, by name, for a translation site or a translator
    const file = readFile(code);
    if (!file) {
        console.error('No js/lang/' + code + '.js');
        process.exit(1);
    }
    console.log(JSON.stringify(file.words, null, 2));
} else if (command === 'check') {
    const { en, byText } = namesNow(), all = allTexts();
    let bad = 0;
    const stale = [...all.keys()].filter((text) => !byText.has(text));
    if (stale.length) {
        bad++;
        console.log('en.js is not up to date with the code, ' + stale.length + ' texts: node scripts/lang.js update');
    }
    Object.keys(langList()).filter((c) => c !== 'en').forEach((c) => {
        const file = readFile(c);
        if (!file) return bad++, console.log(c + ': no js/lang/' + c + '.js');
        problems(c, en, file.words).forEach((p) => {
            bad++;
            console.log(c + ' ' + p);
        });
    });
    if (bad) process.exit(1);
    console.log('Every language is good');
} else if (!command) {
    const langs = langList(), { en } = namesNow(), size = Object.keys(en).length;
    console.log(size + ' texts to translate');
    Object.keys(langs).filter((c) => c !== 'en').forEach((c) => {
        const file = readFile(c) || { words: {}, check: new Set() }, have = Object.keys(en).filter((n) => done(file.words[n])).length;
        console.log(c + ' ' + langs[c] + ': ' + have + ' of ' + size + ' (' + Math.floor(100 * have / size) + '%)' + (file.check.size ? ', ' + file.check.size + ' to check' : ''));
    });
} else {
    console.error(usage);
    process.exit(1);
}
