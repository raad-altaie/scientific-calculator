// The languages of the calculator (js/lang.js): what there is to translate, and each language's file of words.
//
//   node scripts/lang.js                    each language: how much of it is translated
//   node scripts/lang.js update es Español  js/lang/es.js made, or brought up to date: every English text of the
//                                           calculator in it, its words kept, a new one '' till it is translated;
//                                           and the language put on the options' list by its own name
//   node scripts/lang.js missing es         the English that es has no words for yet
//   node scripts/lang.js strings            every English text there is to translate
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
const SCRIPTS = ['js/main.js', 'js/tips.js', 'js/formulas.js', 'js/units.js', 'js/chem.js', 'js/physics.js', 'js/biology.js', 'js/options.js', 'web/js/options.js', 'web/js/app.js'];
const PAGES = ['popup.html', 'options.html', 'web/index.html'];
const PROPS = new Set(['t', 'd', 'l', 'c', 'name', 'aria', 'head', 'note', 'title', 'text', 'small']); // of the data main.js translates as it shows it
// what main.js translates as it shows it, by the value of a call it is: notify(text), svgText(x, y, text) …
const ARGS = { tr: 0, notify: 0, svgText: 2, svgOf: 3, planeSvg: 1, graphDrawing: 0, curveDrawing: 0, drawnTile: 1, textRow: 0, bioWarn: 1 };
const WORDS = /[A-Za-z]{2}/; // a text to translate has a word: x, r and θ are maths

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
        if (tok.id && next && next.p === '(' && (ARGS[tok.id] !== undefined || tok.id === 'trn') && !(list[i - 1] && list[i - 1].p === '.') && !(list[i - 1] && list[i - 1].id === 'function')) call = tok.id;
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
            if (call === 'tr') {
                const lit = literal(list, at);
                if (lit) add(lit[0], true);
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
    return all;
}

const fileOf = (code) => path.join(ROOT, 'js/lang', code + '.js');

// a language's words, as its file has them
function readLang(code) {
    let table = {};
    if (!fs.existsSync(fileOf(code))) return null;
    vm.runInNewContext(fs.readFileSync(fileOf(code), 'utf8'), { CalcLang: { add: (c, t) => { table = t; } } });
    return table;
}

const done = (v) => (typeof v === 'string' ? !!v : !!v && typeof v === 'object' && !!v.other);

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
    const text = '{ ' + Object.keys(langs).map((c) => (/^\w+$/.test(c) ? c : JSON.stringify(c)) + ': ' + JSON.stringify(name && c === code ? name : langs[c]).replace(/^"|"$/g, '\'')).join(', ') + ' }';
    ['js/lang.js', 'web/js/lang.js'].forEach((file) => {
        const at = path.join(ROOT, file);
        fs.writeFileSync(at, fs.readFileSync(at, 'utf8').replace(/var LANGS = \{[^}]*\}/, 'var LANGS = ' + text));
    });
}

// The file of a language: every text of the calculator, by the file it is first found in, its words where it has
// them, '' where not; a text with a form for each number, as many forms as the language has. What it has words for
// that is no longer in the calculator is kept at its end, for a text that changed a little, till it is taken out
function writeLang(code, name, all, table) {
    const forms = (() => {
        try {
            return new Intl.PluralRules(code).resolvedOptions().pluralCategories;
        } catch (e) {
            return ['one', 'other'];
        }
    })();
    const lines = [], q = JSON.stringify;
    let from = '';
    all.forEach((info, text) => {
        let own = table[text];
        if (info.from !== from) {
            from = info.from;
            lines.push('', '    // ' + from);
        }
        if (info.one) { // forms: '{n} day' as one, '{n} days' as the rest
            own = own && typeof own === 'object' ? own : {};
            lines.push('    ' + q(text) + ': { ' + forms.map((f) => f + ': ' + q(own[f] || '')).join(', ') + ' }, // one: ' + q(info.one));
        } else {
            lines.push('    ' + q(text) + ': ' + q(typeof own === 'string' ? own : '') + ',');
        }
    });
    const old = Object.keys(table).filter((text) => !all.has(text) && done(table[text]));
    if (old.length) {
        lines.push('', '    // no longer in the calculator: kept for a text that changed a little; taken out once it is not needed');
        old.forEach((text) => lines.push('    ' + q(text) + ': ' + q(table[text]) + ','));
    }
    const head = '// ' + (name || langList()[code] || code) + ': the words of the calculator, by their English (js/lang.js). Brought up to date\n' +
        '// with node scripts/lang.js update ' + code + '; a text left \'\' shows in English till it is translated. Each keeps its\n' +
        '// tags, <sup>2</sup>, and the names of its values, {n}, as they are\n';
    const text = head + 'CalcLang.add(' + q(code) + ', {' + lines.join('\n').replace(/,(\s*(\/\/[^\n]*)?\s*)$/, '$1') + '\n});\n';
    ['js/lang', 'web/js/lang'].forEach((dir) => {
        fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
        fs.writeFileSync(path.join(ROOT, dir, code + '.js'), text);
    });
}

const [command, code, name] = process.argv.slice(2);
const all = allTexts();

if (command === 'strings') {
    all.forEach((info, text) => console.log(text));
} else if (command === 'update' && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(code || '')) {
    if (!readLang(code) && !name) {
        console.error('A new language needs its own name: node scripts/lang.js update ' + code + ' <its name>');
        process.exit(1);
    }
    writeLang(code, name, all, readLang(code) || {});
    listLang(code, name);
    console.log('js/lang/' + code + '.js and web/js/lang/' + code + '.js: ' + all.size + ' texts');
} else if (command === 'missing' && code) {
    const table = readLang(code);
    if (!table) {
        console.error('No js/lang/' + code + '.js');
        process.exit(1);
    }
    all.forEach((info, text) => {
        if (!done(table[text])) console.log(text);
    });
} else if (!command) {
    const langs = langList();
    console.log(all.size + ' texts to translate');
    Object.keys(langs).filter((c) => c !== 'en').forEach((c) => {
        const table = readLang(c) || {}, have = [...all.keys()].filter((text) => done(table[text])).length;
        console.log(c + ' ' + langs[c] + ': ' + have + ' of ' + all.size + ' (' + Math.floor(100 * have / all.size) + '%)');
    });
} else {
    console.error('node scripts/lang.js [update <code> [name] | missing <code> | strings]');
    process.exit(1);
}
