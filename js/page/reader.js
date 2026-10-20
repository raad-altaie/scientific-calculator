// The maths of a page's text, as the calculator reads it: each sum, and what each feature of the instant answers
// adds to it. A feature is a file of its own, put into the pages only while it is turned on, on the options page
// (background.js): solve.js, graph.js, numbers.js, formulas.js, converter.js, statistics.js and chemistry.js. Each
// adds itself here, with what it reads and what its tips say; page/answers.js puts the icons in the page. This file
// comes into the page first, and again with the features as they are chosen once more, each time empty of them.
// Read here, in the browser; it works in Node as well, for the tests
(function (root) {
    'use strict';

    // ---------------- the features ---------------- //

    // Each feature, in the order it came, as background.js puts them in:
    //   name, as the options keep it; kinds, what it finds, as c.kind: a kind no feature has is not kept, though the
    //     maths of the text reads it, as an equation without the solver
    //   find(s, order, raw): what it finds in a line of text; of its tier, 0 before all else, as the chemistry, 1 before
    //     the sums, as quantities and dates, the first and longest of them kept, or 3 after them, where no sum is, as the
    //     formulas. raw: the line with the digits of its <sub>, of a chemical formula. order: of dates, as readDate takes it
    //   at(s, i, formal): one thing of a line from i, tried before a sum there, as a derivative or a curve
    //   formal(line), formalLast(line): a line of maths marked as maths, read whole, before it is read as a sum, or after
    //   picked(text, order), pickedLast(text): text selected that is one of its own alone, before the maths, or after
    //   needs: what is put in the page before its icons go in, to check them: 'engine', the default, 'chem', or null for
    //     nothing; uses: what its tips need, 'maths' unless it says, as needs
    //   check(c, unit, lib): it is one the calculator works out, on unless it says; tip(c, unit, lib): what its tip says,
    //     { title, lines, svg, rows, note, more }, as answers.js shows them. unit: of angles; lib: the calculator's
    //     { engine, maths, units, chem }
    const features = [];
    const kinds = new Map([['sum', null]]); // each kind, by its feature; a sum is of none, it is always read

    function add(feature) {
        features.push(feature);
        feature.kinds.forEach((kind) => kinds.set(kind, feature));
    }

    const on = (c) => kinds.has(c.kind);
    const featureOf = (c) => kinds.get(c.kind) || null;
    const having = (hook) => features.filter((f) => f[hook]);

    // ---------------- the maths of a line of text ---------------- //

    // the functions of the calculator, by the names it reads in pasted text
    const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'asinh', 'acosh', 'atanh',
        'arcsin', 'arccos', 'arctan', 'arsinh', 'arcosh', 'artanh', 'ln', 'log', 'sqrt', 'exp', 'abs', 'round', 'floor', 'ceil',
        'ceiling', 'trunc']);
    // words of English as well: a function only with its bracket, round(2.5), not round 5
    const BRACKETED = new Set(['exp', 'abs', 'round', 'floor', 'ceil', 'ceiling', 'trunc']);
    const TRIG = /^(a|arc)?(sin|cos|tan)$/; // a result in the unit of angles
    const SUPERS = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
    // fractions of one character: ½, and 1½ as 1 + ½
    const VULGAR = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
        '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };
    const SUPER_OF = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '−': '⁻', '–': '⁻' };
    const MINUS = '-−–';
    const OPERATORS = '+-−–×*·⋅÷/^';
    // a number: 12, 1,234.5, .5, $20, 6.02e23
    const NUMBER = /[$€£¥]?(?:(?:\d{1,3}(?:,\d{3})+(?!\d)|\d+)(?:\.\d+)?|\.\d+)(?:e[-+]?\d+(?![\p{L}\d]))?/uy;
    const WORD = /\p{L}+/uy;
    // where a sum can start; not right after a letter or a number, nor these: COVID-19, 10:30, v1.2, 3/4/2025
    const START = /[\d.$€£¥([√π+\-−–\p{L}½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/u;
    const BEFORE = /[\p{L}\p{N}_.,:;/\\@#&'’^-]/u;
    // nor end right before them: 5 + 3cm, 1 + 2.3.4
    const AFTER = /^(?:[\p{L}\p{N}_]|[.,:/]\p{N})/u;

    // the next characters of s from i are a function's bracket or number: sin(30), sin 30, √2
    function takes(s, i, bracketed) {
        if (s[i] === '(') return true;
        if (bracketed) return false;
        while (s[i] === ' ') i++;
        return /[\d.π(√]/.test(s[i] || '');
    }

    // What of s from start is one sum, equation or inequality, read as the calculator reads it, or
    // null. Each place it could end is kept, so a sum ends at its last whole part: 2 + 3 of 2 + 3 +
    // curve: a function of x to draw, of graph.js, after its y =
    function read(s, start, formal, curve) {
        // out: the text for the calculator; ops, strong: its operators, those that are surely of maths;
        // fn: its functions and roots; rel: =, <, >, ≤ or ≥, after left, the length of out before it; rel2:
        // the second of an inequality, the same way as the first: –2 < 3x + 1 < 7
        const st = { out: '', ops: 0, strong: 0, fn: 0, post: 0, x: false, trig: false, rel: '', rel2: '', left: 0, leftOps: 0, depth: 0 };
        let i = start, want = true, sign = false, good = null, open = null;
        const keep = () => {
            if (!want && !st.depth) good = { ...st, to: i };
        };
        const operand = (text, to) => {
            st.out += text;
            i = to;
            want = sign = false;
            keep();
        };

        for (;;) {
            // longer than a sum is taken: read no further, as each place in a long run would read all of it again
            if (st.out.length > 200) return null;
            const from = i;
            while (i < s.length && /\s/.test(s[i])) i++;
            const spaced = i > from;
            if (i >= s.length) break;
            const c = s[i];

            if (spaced) st.out += ' ';
            if (want) {
                if (c === '(' || c === '[') {
                    st.out += '(';
                    st.depth++;
                    i++;
                    sign = false;
                    continue;
                }
                if ((MINUS.includes(c) || c === '+') && !sign) { // a sign, once: –3, 2 × –3
                    st.out += c === '+' ? '+' : '-';
                    sign = true;
                    i++;
                    continue;
                }
                if (c === '√') {
                    st.out += '√';
                    st.fn++;
                    i++;
                    continue;
                }
                if (c === 'π') {
                    operand('π', i + 1);
                    continue;
                }
                if (VULGAR[c]) {
                    operand('(' + VULGAR[c] + ')', i + 1);
                    continue;
                }
                WORD.lastIndex = i;
                const w = WORD.exec(s);
                if (w) {
                    const name = w[0].toLowerCase(), to = i + w[0].length;
                    if (name === 'x') {
                        st.x = true;
                        operand('x', to);
                    } else if (formal && w[0] === 'e') { // in maths marked as maths, e is the constant
                        operand('e', to);
                    } else if (name === 'pi') {
                        operand('π', to);
                    } else if (FUNCTIONS.has(name) && takes(s, to, BRACKETED.has(name))) {
                        st.out += name;
                        st.fn++;
                        st.trig = st.trig || TRIG.test(name);
                        i = to;
                    } else {
                        break;
                    }
                    continue;
                }
                NUMBER.lastIndex = i;
                const n = NUMBER.exec(s);
                if (!n) break;
                const to = i + n[0].length;
                if (/^[.,:]\d/.test(s.slice(to, to + 2))) return null; // 1.2.3, 10:30, 1,5: not a number of a sum
                WORD.lastIndex = to;
                const unit = WORD.exec(s);
                const times = unit && FUNCTIONS.has(unit[0].toLowerCase()) && takes(s, to + unit[0].length, BRACKETED.has(unit[0].toLowerCase())); // 2sqrt(6)
                if (unit && !times && !/^(x|pi|π)$/i.test(unit[0]) && !(formal && unit[0] === 'e')) break; // 5kg, 3rd, 2a
                const whole = n[0].replace(/[$€£¥,]/g, '');
                if (VULGAR[s[to]] && /^\d+$/.test(whole)) { // 1½
                    operand('(' + whole + '+' + VULGAR[s[to]] + ')', to + 1);
                    continue;
                }
                operand(whole, to);
                continue;
            }

            // after a number, a bracket or x: what is done to it, and what comes next
            if (!spaced) {
                if (SUPERS.includes(c)) { // 3², 10⁻⁶
                    let j = i;
                    while (j < s.length && SUPERS.includes(s[j])) j++;
                    st.out += s.slice(i, j);
                    st.post++;
                    i = j;
                    keep();
                    continue;
                }
                if ((c === '!' && s[i + 1] !== '=') || c === '%' || c === '°') {
                    st.out += c;
                    if (formal && c === '!') st.strong++; // 10! marked as maths: a sum, not a cry
                    i++;
                    keep();
                    continue;
                }
                if (c === '(') { // 2(3 + 4)
                    st.out += '(';
                    st.depth++;
                    i++;
                    want = true;
                    continue;
                }
                if (c === 'π') {
                    operand('π', i + 1);
                    continue;
                }
                WORD.lastIndex = i;
                const w = WORD.exec(s);
                if (w && /^(x|pi)$/i.test(w[0])) { // 2x, 2pi
                    if (/^x$/i.test(w[0])) st.x = true;
                    operand(/^x$/i.test(w[0]) ? 'x' : 'π', i + w[0].length);
                    continue;
                }
                if (formal && w && w[0] === 'e') { // 2e
                    operand('e', i + 1);
                    continue;
                }
                if (w && FUNCTIONS.has(w[0].toLowerCase()) && takes(s, i + w[0].length, BRACKETED.has(w[0].toLowerCase()))) { // 2sqrt(6), 3sin(x)
                    const name = w[0].toLowerCase();
                    st.out += name;
                    st.fn++;
                    st.trig = st.trig || TRIG.test(name);
                    i += w[0].length;
                    want = true;
                    sign = false;
                    continue;
                }
            }
            if (c === ')' || c === ']') {
                if (!st.depth) break;
                st.out += ')';
                st.depth--;
                i++;
                keep();
                continue;
            }
            if (OPERATORS.includes(c)) {
                // 3-1 and 10 – 20 are scores and ranges as often as sums, 3/4 a date: these alone
                // are not taken, but with = or another operator they are
                const tight = !spaced && !/\s/.test(s[i + 1] || '');
                st.out += c === '−' || c === '–' ? '-' : c === '·' || c === '⋅' ? '×' : c;
                st.ops++;
                // 3/4 is a date as often, 2×2 and 1920×1080 a size; marked as maths, a fraction and a product
                if (formal || !(c === '-' || c === '–' || ((c === '/' || c === '×') && tight))) st.strong++;
                want = true;
                sign = false;
                i++;
                continue;
            }
            WORD.lastIndex = i;
            const w = WORD.exec(s);
            const word = w ? w[0].toLowerCase() : '';
            // 3 x 4: x between numbers is times, as 1920 x 1080; 10 mod 3; 15% of 80
            if (spaced && ((word === 'x' && /^\s+[\d.(]/.test(s.slice(i + 1, i + 3))) || word === 'mod' ||
                (word === 'of' && st.out.trim().endsWith('%')))) {
                st.out += word === 'mod' ? 'mod' : '×';
                st.ops++;
                if (word !== 'x') st.strong++;
                want = true;
                sign = false;
                i += word.length;
                continue;
            }
            const rel = s.startsWith('<=', i) ? '≤' : s.startsWith('>=', i) ? '≥' : '=<>≤≥'.includes(c) ? c : '';
            const second = st.rel && !st.rel2 && st.rel !== '=' && rel !== '=' && /[<≤]/.test(st.rel) === /[<≤]/.test(rel);
            if (rel && (!st.rel || second) && !st.depth && !(c === '=' && /[=>]/.test(s[i + 1] || '')) && !(c === '<' && /[-<]/.test(s[i + 1] || ''))) {
                if (second) {
                    st.rel2 = rel;
                } else {
                    st.rel = rel;
                    st.left = st.out.length;
                    st.leftOps = st.ops + st.fn;
                }
                st.out += rel;
                i += s.startsWith('<=', i) || s.startsWith('>=', i) ? 2 : 1;
                want = true;
                sign = false;
                if (rel === '=') open = { ...st, to: i }; // 2 + 3 = with nothing after it ends at its =
                continue;
            }
            break;
        }

        if (open && (!good || good.to < open.to)) good = open;
        if (!good || AFTER.test(s.slice(good.to, good.to + 2))) return null;

        const out = good.out.replace(/\s+/g, ' ').trim();
        const left = (good.rel ? good.out.slice(0, good.left) : good.out).replace(/\s+/g, ' ').trim();
        const right = good.rel ? good.out.slice(good.left + good.rel.length).replace(/\s+/g, ' ').trim() : '';
        const plain = /^[-+]?(?:[\d.]+π?|π)$/;
        let kind;

        if (curve) { // y = x² – 4x + 3: a function of x, which is drawn; y = 2 and y = x draw little
            return good.x && !good.rel && good.ops + good.fn + good.post > 0 && out.length <= 200 ?
                { from: start, to: good.to, text: out, left: out, kind: 'graph', trig: good.trig, fields: { f: out } } : null;
        }
        if (out.length > 200 || !(/[\dπ]/.test(out) || (good.x && good.fn))) return null; // sin(x) = cos(x) needs no number
        if (good.x) {
            // y = 2x + 1 is a curve, not an equation; x = 5 is solved already
            if (!good.rel || !right) return null;
            if ((left === 'x' && plain.test(right.replace(/\s+/g, ''))) || (right === 'x' && plain.test(left.replace(/\s+/g, '')))) return null; // x = - 3 too
            kind = good.rel === '=' ? 'equation' : 'inequality';
        } else {
            if (good.rel && good.rel !== '=') return null; // 2 < 3: nothing to work out
            if (!(good.rel ? good.leftOps : good.strong + good.fn)) return null; // 42, 5!, 10-20, 3/4
            kind = 'sum';
        }
        // written in fractions, 1/2 + 1/3, and no decimals: its result as a fraction too
        const frac = kind === 'sum' && /\d\s*\)?\s*\/\s*\(?\s*\d/.test(left) && !/\d\.\d|\.\d|\de[-+]?\d/.test(left);
        return { from: start, to: good.to, text: out, left: left, kind: kind, trig: good.trig, frac: frac || undefined };
    }

    // Each sum, equation and inequality in a text, and what the features read at a place of it, as an IP network or
    // a curve: [{ from, to, text, left, kind, trig }], from and to where it is in the text; text for the calculator;
    // left, before its =, which a sum works out; kind 'sum', 'equation', 'inequality', or a feature's; trig, of the
    // unit of angles. What is of a feature turned off is passed over whole, not read again in parts
    function find(s, formal) {
        const readers = having('at');
        const found = [];
        for (let i = 0; i < s.length;) {
            let m = null;
            if (START.test(s[i]) && !(i && BEFORE.test(s[i - 1]))) {
                for (let k = 0; k < readers.length && !m; k++) m = readers[k].at(s, i, formal);
                m = m || read(s, i, formal);
            }
            if (m) {
                if (on(m)) found.push(m);
                i = m.to;
            } else {
                i++;
            }
        }
        return found;
    }

    // ---------------- maths marked as maths: TeX and MathML ---------------- //

    // A formula of a page's maths, TeX or MathML, read as a line of text the calculator reads, as
    // typed: \frac{1}{2} is ((1)/(2)), \sqrt{x} √(x), x^{2} x^(2). What it has no reading of, as x_1
    // or ±, makes it BAD, and it is not taken. ∫, Σ, Π and lim are kept with their ends, as
    // BIG ∫ SEP below SEP above END, and what follows them
    const BAD = '\u0002';
    const BIG = '\u0003', SEP = '\u0001', END = '\u0004';
    // a matrix: MAT its rows, ROW between them, CELL between the numbers of a row, MAT
    const MAT = '\u0006', ROW = '\u0007', CELL = '\u0008';
    const TEX = {
        cdot: '×', times: '×', ast: '×', div: '÷', pi: 'π', infty: '∞', le: '≤', leq: '≤', leqslant: '≤', ge: '≥', geq: '≥',
        geqslant: '≥', lt: '<', gt: '>', to: '→', rightarrow: '→', '%': '%', $: '', ',': ' ', ';': ' ', ':': ' ', '>': ' ',
        ' ': ' ', '!': '', quad: ' ', qquad: ' ', displaystyle: '', textstyle: '', scriptstyle: '', limits: '', nolimits: '',
        bf: '', rm: '', it: '', sf: '', tt: '', cal: '', normalsize: '', large: '', Large: '', LARGE: '', huge: '', Huge: '', small: '',
        footnotesize: '', scriptsize: '', tiny: '', over: '\u0005', // {a \over b}: a fraction of what is before and after it
        // letters of formulas: ρ = m/V, E = hν
        alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', varepsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ',
        nu: 'ν', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', omega: 'ω', Omega: 'Ω', hbar: 'ħ', det: ' det', prime: "'"
    };
    const TEX_FRACTIONS = new Set(['frac', 'dfrac', 'tfrac', 'cfrac']);
    const TEX_WRAPS = new Set(['mathrm', 'mathit', 'mathbf', 'mathsf', 'mathtt', 'mathnormal', 'boldsymbol', 'bm', 'pmb', 'text',
        'textrm', 'textit', 'textbf', 'mbox', 'operatorname']);
    const TEX_BIG = { int: '∫', sum: '∑', prod: '∏', lim: 'lim' };

    // two pieces of a line put together: two letters apart, dx as d x, xy as x y, so neither is a word
    const join = (out, piece) => out + (/[a-zA-Z]$/.test(out) && /^[a-zA-Z]/.test(piece) ? ' ' : '') + piece;

    function fromTex(source) {
        const s = String(source);
        let i = 0, bars = 0;
        const space = () => {
            while (i < s.length && /\s/.test(s[i])) i++;
        };
        const command = () => {
            const m = /^(?:[a-zA-Z]+|[^a-zA-Z])/.exec(s.slice(i));
            i += m ? m[0].length : 0;
            return m ? m[0] : '';
        };
        // what ^, _, \frac and \sqrt take: a group in braces, or one piece
        const arg = () => {
            space();
            if (s[i] !== '{') return piece();
            i++;
            const t = row('}');
            i++;
            return t;
        };
        // what is in braces, as it is written: {bmatrix}
        const braced = () => {
            space();
            if (s[i] !== '{') return '';
            const close = s.indexOf('}', i);
            const t = close < 0 ? '' : s.slice(i + 1, close);
            i = close < 0 ? s.length : close + 1;
            return t.trim();
        };
        // \left( and \right): brackets; \left| and \right|, |x|, are abs(x); \left. is nothing
        const delimiter = (open) => {
            space();
            const d = s[i] === '\\' ? (i++, '\\' + command()) : s[i++] || '';
            if (d === '.') return '';
            if (/^(\||\\vert|\\lvert|\\rvert|\\\|)$/.test(d)) return open ? 'abs(' : ')';
            return open ? '(' : ')';
        };

        function piece() {
            const c = s[i];
            if (c === undefined) return '';
            if (c === '\\') {
                i++;
                const n = command();
                if (TEX_FRACTIONS.has(n)) {
                    const a = arg(), b = arg();
                    return '((' + a + ')/(' + b + '))';
                }
                if (/^[dt]?binom$/.test(n)) { // \binom{52}{5}: a choice, as Exactly takes it
                    const a = arg(), b = arg();
                    return 'C(' + a.trim() + ', ' + b.trim() + ')';
                }
                if (n === 'sqrt') {
                    space();
                    let root = '';
                    if (s[i] === '[') {
                        i++;
                        root = row(']');
                        i++;
                    }
                    const a = arg();
                    return root ? '((' + a + ')^(1/(' + root + ')))' : '√(' + a + ')';
                }
                if (n === 'left' || n === 'right' || /^[bB]igg?[lr]?$/.test(n)) return delimiter(n === 'left' || /l$/.test(n));
                if (n === 'begin') { // \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}: a matrix; |…| of vmatrix its determinant
                    const env = braced();
                    if (env === 'array') braced(); // its columns, {cc}
                    const close = '\\end{' + env + '}', at = s.indexOf(close, i);
                    const body = at < 0 ? '' : s.slice(i, at);
                    i = at < 0 ? s.length : at + close.length;
                    // equations together, one a line, in cases or aligned: 2x + y = 5, x – y = 1
                    if (/^(cases|rcases|aligned|align\*?|gathered|gather\*?|split|eqnarray\*?)$/.test(env) && body.includes('=')) {
                        return body.split(/\\\\/).filter((r) => r.trim()).map((r) => fromTex(r.replace(/&/g, ' ')).trim()).join(', ');
                    }
                    if (!/^([pbBvV]?matrix|smallmatrix|array)$/.test(env) || !body.trim()) return BAD;
                    const rows = body.split(/\\\\/).filter((r) => r.trim()).map((r) => r.split('&').map((cell) => fromTex(cell).trim()).join(CELL));
                    const m = MAT + rows.join(ROW) + MAT;
                    return /^[vV]/.test(env) ? 'abs(' + m + ')' : /^[pbB]/.test(env) ? '(' + m + ')' : m;
                }
                if (n === 'lvert') return 'abs(';
                if (n === 'rvert') return ')';
                if (TEX_WRAPS.has(n)) { // \text{ of } and \operatorname{sin} as they are written; \mathbf{x} as maths
                    space();
                    if (!/^(text|textrm|textit|textbf|mbox|operatorname|mathrm)$/.test(n) || s[i] !== '{') return ' ' + arg() + ' ';
                    const close = s.indexOf('}', i);
                    const words = close < 0 ? '' : s.slice(i + 1, close);
                    i = close < 0 ? s.length : close + 1;
                    return ' ' + words.trim() + (n === 'operatorname' ? '' : ' ');
                }
                if (TEX_BIG[n]) {
                    let below = '', above = '';
                    for (let k = 0; k < 4; k++) {
                        space();
                        if (s[i] === '_') {
                            i++;
                            below = arg();
                        } else if (s[i] === '^') {
                            i++;
                            above = arg();
                        } else if (/^\\(no)?limits/.test(s.slice(i))) {
                            i += s.startsWith('\\limits', i) ? 7 : 9;
                        } else {
                            break;
                        }
                    }
                    return BIG + TEX_BIG[n] + SEP + below + SEP + above + END;
                }
                if (FUNCTIONS.has(n)) { // \sin x is sin(x), \sin 2x sin(2x); \sin(x) keeps its own
                    space();
                    if (s[i] === '(' || s.startsWith('\\left', i)) return ' ' + n;
                    let a = piece();
                    while (/^\d+(\.\d+)?$/.test(a) && /[a-zA-Z]/.test(s[i] || '')) a += piece();
                    return ' ' + n + '(' + a + ')';
                }
                return Object.prototype.hasOwnProperty.call(TEX, n) ? TEX[n] : BAD;
            }
            i++;
            if (c === '{') { // a group: 1{,}000 is 1000; {x + 1}^2 keeps its brackets
                const t = row('}');
                i++;
                return t.trim() === ',' ? '' : /[-+−×÷/^=<>≤≥ ]/.test(t.trim()) ? '(' + t + ')' : t;
            }
            if (c === '^') { // y^{\prime} is y'
                const a = arg();
                return /^\s*'+\s*$/.test(a) ? a.trim() : '^(' + a + ')';
            }
            if (c === '_') return '_(' + arg() + ')'; // x_1: of a formula, not of the calculator
            if (c === '|') return ++bars % 2 ? 'abs(' : ')';
            if (c === '&' || c === '#') return BAD; // a table
            if (c === '~') return ' ';
            return c;
        }

        function row(end) {
            let out = '';
            while (i < s.length && s[i] !== end) out = join(out, piece());
            const over = out.indexOf('\u0005');
            return over < 0 ? out : '((' + out.slice(0, over) + ')/(' + out.slice(over + 1).replace(/\u0005/g, BAD) + '))';
        }

        return row();
    }

    // MathML as a line, as fromTex reads TeX: mfrac as ((a)/(b)), msqrt as √(…), msup as ^(…)
    const MO = {
        '-': '-', '−': '-', '–': '-', '+': '+', '×': '×', '⋅': '×', '·': '×', '∗': '×', '*': '×', '÷': '÷', '/': '/', '∕': '/',
        '=': '=', '<': '<', '>': '>', '≤': '≤', '≥': '≥', '⩽': '≤', '⩾': '≥', '(': '(', ')': ')', '[': '(', ']': ')', '!': '!',
        '%': '%', '→': '→', '|': '|', '∞': '∞', '⁡': '', '⁢': '×', '⁣': ' ', '⁤': '+'
    };
    const bigOp = (el) => {
        const t = el && el.localName === 'mo' ? el.textContent.trim() : '';
        return { '∫': '∫', '∑': '∑', '∏': '∏', lim: 'lim' }[t] || '';
    };

    function fromMathML(el) {
        const name = el.localName, kids = [...el.children];
        const text = el.textContent.normalize('NFKC').replace(/\s+/g, '');
        if (name === 'semantics') return kids[0] ? fromMathML(kids[0]) : BAD;
        if (/^(annotation|annotation-xml|mphantom|none|mprescripts)$/.test(name)) return '';
        if (name === 'mn') return text;
        if (name === 'mi') return text === 'ⅇ' ? 'e' : FUNCTIONS.has(text) ? ' ' + text : text;
        if (name === 'mo') return text === 'lim' ? 'lim' : MO[text] !== undefined ? MO[text] : BAD;
        if (name === 'mtext') return el.textContent.trim() ? ' ' + el.textContent.trim() + ' ' : ' ';
        if (name === 'mspace') return ' ';
        if (/^(msubsup|munderover|msub|munder|mover|msup)$/.test(name) && bigOp(kids[0])) { // ∫₀¹, Σ, lim
            const low = /^(msubsup|munderover|msub|munder)$/.test(name) ? fromMathML(kids[1]) : '';
            const high = /^(msubsup|munderover)$/.test(name) ? fromMathML(kids[2]) : /^(mover|msup)$/.test(name) ? fromMathML(kids[1]) : '';
            return BIG + bigOp(kids[0]) + SEP + low + SEP + high + END;
        }
        if (name === 'mfrac') { // of no line, as KaTeX draws \binom: a choice, 52 over 5
            if (kids.length !== 2) return BAD;
            const a = fromMathML(kids[0]), b = fromMathML(kids[1]);
            return parseFloat(el.getAttribute('linethickness')) === 0 ? 'C(' + a.trim() + ', ' + b.trim() + ')' : '((' + a + ')/(' + b + '))';
        }
        if (name === 'msqrt') return '√(' + mathRow(kids) + ')';
        if (name === 'mroot') return '((' + fromMathML(kids[0]) + ')^(1/(' + fromMathML(kids[1]) + ')))';
        if (name === 'msup') { // r², or (x + 1)²: brackets round a base of more than one piece
            const base = fromMathML(kids[0]).trim();
            return (/^([a-zA-Zπ]|\d+(\.\d+)?)$/.test(base) ? base : '(' + base + ')') + '^(' + fromMathML(kids[1]) + ')';
        }
        if (name === 'msub') return fromMathML(kids[0]) + '_(' + fromMathML(kids[1]) + ')';
        if (name === 'mfenced') return (el.getAttribute('open') ?? '(') + mathRow(kids) + (el.getAttribute('close') ?? ')');
        if (/^(math|mrow|mstyle|mpadded|menclose)$/.test(name)) return mathRow(kids);
        if (name === 'mtable') { // a matrix: its rows, each of its numbers, as fromTex keeps them
            return MAT + kids.filter((r) => /^(mtr|mlabeledtr)$/.test(r.localName))
                .map((r) => [...r.children].filter((d) => d.localName === 'mtd').map((d) => mathRow([...d.children]).trim()).join(CELL)).join(ROW) + MAT;
        }
        return BAD; // an accent, a symbol of its own
    }

    // the pieces of a row; |x| is abs(x), and a function applied with no brackets has them: sin⁡x is sin(x)
    function mathRow(kids) {
        let out = '', bars = 0;
        for (let k = 0; k < kids.length; k++) {
            let piece = fromMathML(kids[k]);
            if (piece === '|') piece = ++bars % 2 ? 'abs(' : ')';
            if (kids[k + 2] && kids[k + 1].localName === 'mo' && kids[k + 1].textContent === '⁡') {
                const arg = fromMathML(kids[k + 2]);
                piece += /^\s*\(/.test(arg) ? arg : '(' + arg + ')';
                k += 2;
            }
            out = join(out, piece);
        }
        return out;
    }

    // brackets round a number or a letter alone taken off, for the eye and the boxes: ((1)/(2)) is (1/2),
    // x^(2) x^2. Not after a function or a number, sin(x), 2(3), nor round a minus, (-3)^2
    // a pair of brackets round nothing but another pair, ((a)), as one
    function single(t) {
        const pairs = [], open = [];
        [...t].forEach((ch, k) => {
            if (ch === '(') open.push(k);
            else if (ch === ')' && open.length) pairs.push([open.pop(), k]);
        });
        const close = new Map(pairs);
        const drop = new Set();
        pairs.forEach(([a, b]) => {
            if (t[a + 1] === '(' && close.get(a + 1) === b - 1) drop.add(a).add(b);
        });
        return drop.size ? [...t].filter((ch, k) => !drop.has(k)).join('') : t;
    }

    function tidy(text) {
        let t = String(text).replace(/\s+/g, ' ').trim(), was;
        do {
            was = t;
            t = t.replace(/(?<![\w.π)])\(\s*([\d.]+|[a-zA-Zπ])\s*\)/g, '$1').replace(/\(\s*\)/g, '').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
            // ((x + 7)) once, and (t^2) as t^2 where no power or function takes it
            t = single(t).replace(/(?<![\w.π)^])\(([a-zA-Zπ]|\d+)\^(\d+|[a-zA-Z])\)(?![\^\w(])/g, '$1^$2');
        } while (t !== was);
        return t;
    }

    // What a formula marked as maths is, read as a line by fromTex or fromMathML: one sum, equation or
    // inequality, the whole of it; or what a feature reads of it whole first, as an integral or a matrix. Null if
    // it is none, as E = mc^2, or not all of it is: [{ text, left, kind, trig, fields }]
    function formal(line) {
        const t = String(line).replace(/\s+/g, ' ').trim();
        if (!t || t.includes(BAD) || t.length > 2000) return null;
        for (const f of having('formal')) {
            const c = f.formal(t);
            if (c) return on(c) ? c : null;
        }
        if (t.includes(MAT) || t.includes(BIG) || t.includes('_') || t.length > 300) return null;
        // An equation or an inequality of one letter, t² + 3t – 10 = 4 + 8t: solved as one of x, which the
        // solver takes, and told with its own letter. e is the constant
        const letters = [...new Set(t.match(/(?<![A-Za-z])[A-Za-df-z](?![A-Za-z])/g) || [])];
        const v = letters.length === 1 && letters[0] !== 'x' && !/(?<![A-Za-z])x(?![A-Za-z])/.test(t) && /[=<>≤≥]/.test(t) ? letters[0] : '';
        const asX = (v ? t.replace(new RegExp('(?<![A-Za-z])' + v + '(?![A-Za-z])', 'g'), 'x') : t)
            .replace(/\(\(d\)\/\(d ?x\)\)/g, 'd/dx').replace(/\(\(d ?y\)\/\(d ?x\)\)/g, 'dy/dx'); // \frac{d}{dx}, \frac{dy}{dx}
        const m = find(asX, true);
        if (m.length !== 1 || m[0].from || m[0].to !== asX.length || m[0].kind === 'subnet') return null;
        if (v && m[0].kind === 'sum') return null;
        if (m[0].kind === 'graph') m[0].fields = { f: tidy(m[0].fields.f) };
        return Object.assign(m[0], { text: tidy(m[0].text), left: tidy(m[0].left), v: v || undefined, shown: v ? tidy(t) : m[0].shown && tidy(m[0].shown) });
    }

    // a line marked as maths, read whole as maths, or as what a feature reads after it: a formula of the panel
    function marked(line) {
        const c = formal(line);
        if (c) return c;
        for (const f of having('formalLast')) {
            const named = f.formalLast(line);
            if (named) return named;
        }
        return null;
    }

    // ---------------- all of it ---------------- //

    // of a list, the first and longest of two that overlap
    function firstLongest(list) {
        const kept = [];
        list.slice().sort((a, b) => a.from - b.from || b.to - a.to).forEach((c) => {
            if (!kept.some((o) => o.from < c.to && c.from < o.to)) kept.push(c);
        });
        return kept;
    }

    // what two readers find, those of the first kept where they overlap
    function without(others, first) {
        return first.concat(others.filter((c) => !first.some((o) => o.from < c.to && c.from < o.to))).sort((a, b) => a.from - b.from);
    }

    // What of a line the features find with what its maths is, sums, as find reads it: each by its tier, the
    // chemistry first, 2H2 + O2 → 2H2O no sum, then 5 km in miles or a loan, a sum in them not as well, then
    // the sums, and the formulas where no sum is. raw: the line with the digits of its <sub>, as H₂O
    function found(s, order, raw, sums) {
        const tiers = [[], [], sums, []];
        having('find').forEach((f) => tiers[f.tier].push(...f.find(s, order, raw === undefined ? s : raw).filter(on)));
        return tiers.reduce((kept, list) => without(firstLongest(list), kept), []);
    }

    // What the features find before the sums, alone: as picks.js did, for the tests
    function before(s, order) {
        return firstLongest([].concat(...having('find').filter((f) => f.tier === 1).map((f) => f.find(s, order, s))));
    }

    // text selected that a feature reads first, alone: a number, a list of them, a code, a quantity or a date
    function picked(text, order) {
        for (const f of having('picked')) {
            const c = f.picked(text, order);
            if (c) return c;
        }
        return null;
    }

    // Text selected on a page: what of the calculator it is. What a feature reads alone first; then as maths
    // marked as maths, the whole of it, TeX too; else the one sum or network of the whole of it; then what a
    // feature reads after the maths, a chemical formula or an element alone; else the one thing in it, as a
    // sentence with 2 + 3 in it. order: of dates, as readDate takes it
    function selected(text, order) {
        const p = picked(text, order);
        if (p) return p;
        const t = String(text).replace(/\s+/g, ' ').trim();
        if (!t || t.length > 300) return null;
        const line = /\\[a-zA-Z]/.test(t) ? fromTex(t) : t;
        const c = marked(line);
        if (c) return c;
        const whole = find(line, true).filter((m) => !m.from && m.to === line.length);
        if (whole.length) return whole[0];
        for (const f of having('pickedLast')) {
            const late = f.pickedLast(t);
            if (late) return late;
        }
        const some = found(t, order, t, find(t));
        return some.length === 1 ? some[0] : null;
    }

    // The websites the icons are turned off on, with the menu of a right click (background.js), kept as
    // pageMathsOff. Each by its name without www.: www.example.com is example.com, but en.wikipedia.org
    // is not de.wikipedia.org
    const siteOf = (host) => String(host || '').toLowerCase().replace(/^www\./, '');
    const offOn = (list, host) => Array.isArray(list) && list.includes(siteOf(host));

    // ---------------- for the tips ---------------- //

    // a number as the calculator shows it: up to 12 digits, – for minus, ᴇ for its power of ten
    function shown(v) {
        if (v === Infinity) return '∞';
        if (v === -Infinity) return '–∞';
        return String(+(+v).toPrecision(12) || 0).replace(/e\+?/, 'ᴇ').replace(/-/g, '–');
    }

    // a number of a card: up to 12 digits, its thousands grouped, – for minus, × 10ⁿ for a large or a small one
    function grouped(v, digits) {
        if (!isFinite(v)) return v > 0 ? '∞' : v < 0 ? '–∞' : '–';
        const a = Math.abs(v), r = +v.toPrecision(digits || 12);
        if (a && (a >= 1e15 || a < 1e-6)) {
            const [m, e] = r.toExponential().split('e');
            return m.replace('-', '–') + ' × 10' + [...String(+e)].map((ch) => SUPER_OF[ch]).join('');
        }
        return r.toLocaleString('en-US', { maximumFractionDigits: 12 }).replace('-', '–');
    }

    // the text of the calculator, as it shows it, its whole powers raised: x^2 as x²
    // fractions: written in them, 1/2 + 1/3 keeps its /
    const pretty = (text, fractions) => text.replace(/\^(?:\((-?\d+)\)|(\d+))/g, (m, a, b) => [...(a || b)].map((ch) => SUPER_OF[ch]).join(''))
        .replace(/\*/g, '×').replace(/\/(?!dx)/g, fractions ? '/' : '÷').replace(/-/g, '–'); // d/dx as it is
    // an exact form, as the solver writes it: (1 + √5)/2, π²/6
    const exactText = (form) => form.replace(/-/g, '–');
    const sub = (n) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]);

    // a sum worked out as the calculator would, by its engine, in its unit of angles; null if it gives an error
    function workOut(text, unit, Engine) {
        try {
            const engine = new Engine();
            if (!engine.paste(text, unit, true) || engine.error) return null;
            engine.press('=', unit);
            const v = +engine.value;
            return engine.error || !isFinite(v) ? null : v;
        } catch (e) {
            return null;
        }
    }

    // both sides of an equation, or the three parts of –2 < 3x + 1 < 7, are functions of x the solver reads
    function readable(text, Engine) {
        const sides = text.split(/[=<>≤≥]/);
        return sides.length >= 2 && sides.length <= 3 && sides.every((side) => {
            try {
                const g = Engine.graph(side, false, {});
                return !!g && !g.letters.length;
            } catch (e) {
                return false;
            }
        });
    }

    // an end typed for the solver: inf, –inf, or what the engine works out, π/2
    function bound(text, unit, Engine) {
        if (/^[-+]?inf$/.test(text)) return text[0] === '-' ? -Infinity : Infinity;
        const v = workOut(text, unit, Engine);
        return v === null ? NaN : v;
    }

    const CalcPageReader = {
        add: add, on: on, featureOf: featureOf, features: features,
        read: read, find: find, fromTex: fromTex, fromMathML: fromMathML, tidy: tidy, formal: formal, marked: marked,
        found: found, before: before, picked: picked, selected: selected, without: without, firstLongest: firstLongest,
        siteOf: siteOf, offOn: offOn, shown: shown, grouped: grouped, pretty: pretty, exactText: exactText, sub: sub,
        workOut: workOut, readable: readable, bound: bound,
        AFTER: AFTER, BAD: BAD, BIG: BIG, SEP: SEP, END: END, MAT: MAT, ROW: ROW, CELL: CELL, SUPER_OF: SUPER_OF
    };
    root.CalcPageReader = CalcPageReader;
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPageReader;
})(typeof window !== 'undefined' ? window : this);
