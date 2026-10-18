// The maths on the pages: each sum, each equation or inequality of x, and each IP network, 192.168.0.1/24,
// that the calculator can work out gets a small calculator icon after it, in its line. Over the icon its result shows, and a
// click opens the calculator with it. Pages only get this script once its option is turned on, on
// the options page; it is off at first. The text of the page is read here, in the browser: only what is
// clicked goes to the calculator, and nothing leaves the computer. The calculator's engine comes into
// the page only when there is maths on it, and its solver when an equation is hovered (background.js).
// find, what of a text is maths, works on its own in Node as well, for the tests
(function (root) {
    'use strict';

    // numbers, lists, codes, quantities, dates, money, choices, complex numbers and equations together (picks.js)
    const Picks = root.CalcPicks || (typeof require === 'function' ? require('./picks.js') : null);

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

    // An IP network: an IPv4 address with its prefix, 192.168.0.1/24, or its mask, 192.168.0.1 255.255.255.0;
    // or an IPv6 address with its prefix, 2001:db8::/32. Not an address alone: it has no network to work out
    const IPV4 = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2})(?!\d)|[ \t]+(255\.\d{1,3}\.\d{1,3}\.\d{1,3}))/y;
    const IPV6 = /([0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7})\/(\d{1,3})(?!\d)/iy;

    // a mask: its 1s all on the left, 255.255.240.0
    function isMask(text) {
        const parts = text.split('.').map(Number);
        if (parts.some((part) => part > 255)) return false;
        const zeros = ~parts.reduce((all, part) => all * 256 + part, 0) >>> 0;
        return ((zeros + 1) & zeros) === 0;
    }

    // up to eight groups of up to four hexadecimal digits, :: once for a run of 0s
    function isIpv6(text) {
        const halves = text.split('::');
        const groups = halves.map((half) => (half ? half.split(':') : []));
        const count = groups.reduce((n, g) => n + g.length, 0);
        return halves.length <= 2 && groups.every((g) => g.every((group) => /^[0-9a-f]{1,4}$/i.test(group))) &&
            (halves.length === 2 ? count < 8 : count === 8);
    }

    function readAddress(s, i) {
        let m, to;
        IPV4.lastIndex = i;
        if ((m = IPV4.exec(s))) {
            if (m.slice(1, 5).some((part) => +part > 255) || +m[5] > 32 || (m[6] && !isMask(m[6]))) return null;
        } else {
            IPV6.lastIndex = i;
            if (!(m = IPV6.exec(s)) || +m[2] > 128 || !isIpv6(m[1])) return null;
        }
        to = i + m[0].length;
        if (AFTER.test(s.slice(to, to + 2))) return null; // 10.0.0.1/24.5
        const text = m[0].replace(/\s+/g, ' ');
        return { from: i, to: to, text: text, left: text, kind: 'subnet', trig: false };
    }

    // the next characters of s from i are a function's bracket or number: sin(30), sin 30, √2
    function takes(s, i, bracketed) {
        if (s[i] === '(') return true;
        if (bracketed) return false;
        while (s[i] === ' ') i++;
        return /[\d.π(√]/.test(s[i] || '');
    }

    // What of s from start is one sum, equation or inequality, read as the calculator reads it, or
    // null. Each place it could end is kept, so a sum ends at its last whole part: 2 + 3 of 2 + 3 +
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

    // Each sum, equation, inequality and IP network in a text: [{ from, to, text, left, kind, trig }], from
    // and to where it is in the text; text for the calculator; left, before its =, which a sum works out;
    // kind 'sum', 'equation', 'inequality' or 'subnet'; trig, of the unit of angles
    // y = …, f(x) = …: a function of x to draw, its head and what follows it
    const HEAD = /(?:y|[fgh]\s*\(\s*x\s*\))\s*=\s*/y;
    function readCurve(s, i, formal) {
        HEAD.lastIndex = i;
        const head = HEAD.exec(s);
        const c = head && read(s, i + head[0].length, formal, true);
        if (!c) return null;
        const name = head[0].replace(/\s+/g, '').replace(/=$/, '');
        return Object.assign(c, { from: i, shown: name + ' = ' + c.text });
    }

    // A derivative, d/dx (x³ – 2x) or the derivative of sin(x): a curve, its slope, to draw; at a point,
    // d/dx x³ at x = 2, its value there, in its card. A Taylor or Maclaurin series of a function, about a
    // point, to an order. A differential equation, y′ = x + y with y(0) = 1, and where it starts
    const D_HEAD = /(?:the\s+)?(?:derivative\s+of\s+|d\s*\/\s*dx\s*)/iy;
    const T_HEAD = /(taylor|maclaurin)\s+(?:series|expansion|polynomial)\s+(?:of|for)\s+(?:f\s*\(\s*x\s*\)\s*=\s*)?/iy;
    const POINT = '(-?\\d+(?:\\.\\d+)?|-?π|-?pi)(?![\\p{L}\\p{N}])';
    const D_AT = new RegExp('\\s*,?\\s*(?:at|when|for|where)\\s+x\\s*=\\s*' + POINT, 'iuy');
    const T_ABOUT = new RegExp('\\s*,?\\s*(?:about|at|around|near|cent(?:er|re)d\\s+at)\\s+(?:x\\s*=\\s*)?' + POINT, 'iuy');
    const T_ORDER = /\s*,?\s*(?:(?:up\s+)?to\s+(?:order|degree|power)\s+|(?:of\s+)?(?:order|degree)\s+)(\d{1,2})(?![\p{L}\p{N}])/iuy;
    const ODE = /(?:y\s*['′’]|dy\s*\/\s*dx)\s*=\s*((?:[-+−–(\dxy.\s×*·⋅/^²³)]|sin|cos|tan|exp|ln|log|sqrt|e(?![a-z]))+?)\s*(?:,|;|\bwith\b|\band\b|\bgiven\b|\bwhere\b|\bif\b)\s*(?:(?:with|and|given|where)\s+)?y\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)\s*=\s*(-?\d+(?:\.\d+)?)(?![\p{L}\p{N}])/iuy;

    const atPoint = (re, s, i) => {
        re.lastIndex = i;
        return re.exec(s);
    };

    function readCalculus(s, i) {
        let m;
        if ((m = atPoint(D_HEAD, s, i))) {
            const c = read(s, i + m[0].length, true, true);
            if (!c) return null;
            const f = tidy(c.text), at = atPoint(D_AT, s, c.to);
            if (at) {
                const x = at[1].replace(/pi/i, 'π');
                return { from: i, to: c.to + at[0].length, kind: 'derivative', trig: c.trig, fields: { f: f, x: x }, text: 'd/dx ' + f + ' at x = ' + x, left: '' };
            }
            const slope = tidy('d/dx(' + f + ')');
            return { from: i, to: c.to, kind: 'graph', trig: c.trig, fields: { f: slope }, text: slope, shown: slope.replace('d/dx', 'd/dx '), left: '' };
        }
        if ((m = atPoint(T_HEAD, s, i))) {
            const c = read(s, i + m[0].length, true, true);
            if (!c) return null;
            let to = c.to, a = '0', n = '7', k;
            if ((k = atPoint(T_ABOUT, s, to))) {
                a = k[1].replace(/pi/i, 'π');
                to += k[0].length;
            }
            if ((k = atPoint(T_ORDER, s, to)) && +k[1] <= 12) {
                n = k[1];
                to += k[0].length;
            }
            const f = tidy(c.text);
            return { from: i, to: to, kind: 'taylor', trig: c.trig, fields: { f: f, a: a, n: n }, text: 'Taylor series of ' + f + ' about ' + a, left: '' };
        }
        if ((m = atPoint(ODE, s, i))) {
            const f = tidy(m[1].replace(/[−–]/g, '-').replace(/[·⋅*]/g, '×').replace(/²/g, '^2').replace(/³/g, '^3'));
            if (!/[xy]/.test(f) || (f.match(/\(/g) || []).length !== (f.match(/\)/g) || []).length) return null;
            const x0 = m[2], y0 = m[3];
            return { from: i, to: i + m[0].length, kind: 'ode', trig: /sin|cos|tan/.test(f), fields: { f: f, x0: x0, y0: y0, x: String(+x0 + 1) },
                text: 'y′ = ' + f + ', y(' + x0 + ') = ' + y0, left: '' };
        }
        return null;
    }

    function find(s, formal) {
        const found = [];
        for (let i = 0; i < s.length;) {
            const m = START.test(s[i]) && !(i && BEFORE.test(s[i - 1])) && (readCalculus(s, i) || readCurve(s, i, formal) || readAddress(s, i) || read(s, i, formal));
            if (m) {
                found.push(m);
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

    // A matrix of up to 10×10, each of its rows as long, read as the Matrix card of the numbers takes it:
    // its size, 2×3, and a box for each number, a11 to a23. det: its determinant is asked for
    function matrixOf(body, det, length) {
        const rows = body.split(ROW).map((r) => r.split(CELL).map((cell) => tidy(cell)));
        const cols = rows[0].length;
        if (rows.length > 10 || cols > 10 || rows.length * cols < 2 || rows.some((r) => r.length !== cols || r.some((cell) => !cell))) return null;
        const fields = { size: rows.length + '×' + cols };
        rows.forEach((r, i) => r.forEach((cell, j) => {
            fields['a' + (i + 1) + (j + 1)] = cell;
        }));
        return { from: 0, to: length, kind: 'matrix', det: det, rows: rows, fields: fields, trig: false,
            text: '[' + rows.map((r) => r.join(' ')).join('; ') + ']', left: '' };
    }

    // ∫, Σ, Π or lim, with their ends and what follows them: the cards of the solver that work them out
    function bigOf(op, below, above, body) {
        const inf = (v) => tidy(v).replace(/∞/g, 'inf'); // as the solver's boxes take it
        const shown = (v) => v.replace(/inf/g, '∞');
        if (op === '∫') { // ∫₀¹ x² dx
            const m = /^(.*?)\s*×?\s*d\s*×?\s*x$/.exec(body);
            if (!m || !m[1].trim() || !below || !above) return null;
            const f = tidy(m[1]), a = inf(below), b = inf(above);
            return { kind: 'integral', fields: { f: f, a: a, b: b }, text: '∫ ' + f + ' dx from ' + shown(a) + ' to ' + shown(b) };
        }
        if (op === 'lim') { // lim x→0 sin(x)/x
            const m = /^x\s*→\s*(.+)$/.exec(below);
            if (!m || above || !body) return null;
            const f = tidy(body), a = inf(m[1]);
            return { kind: 'limit', fields: { f: f, a: a }, text: 'lim x → ' + shown(a) + ' of ' + f };
        }
        const m = /^([nkij])\s*=\s*(.+)$/.exec(below); // Σ k² for k = 1 to 10, of n, k, i or j
        if (!m || !above || !body) return null;
        const f = tidy(body), a = tidy(m[2]), b = inf(above);
        return { kind: op === '∑' ? 'series' : 'product', v: m[1], fields: { f: f, a: a, b: b },
            text: (op === '∑' ? 'Σ ' : 'Π ') + f + ', ' + m[1] + ' from ' + a + ' to ' + shown(b) };
    }

    // What a formula marked as maths is, read as a line by fromTex or fromMathML: one sum, equation or
    // inequality, the whole of it; or an integral, a sum or product of terms, or a limit. Null if it is
    // none, as E = mc^2, or not all of it is: [{ text, left, kind, trig, fields }]
    function formal(line) {
        const t = String(line).replace(/\s+/g, ' ').trim();
        if (!t || t.includes(BAD) || t.length > 2000) return null;
        // a matrix alone, A = [1 2; 3 4] as well; its determinant, |A| or det A
        const mat = new RegExp('^(?:[A-Z]\\s*=\\s*)?(det\\s*|abs\\(\\s*)?\\(?\\s*' + MAT + '([^' + MAT + ']+)' + MAT + '\\s*\\)?\\s*\\)?$').exec(t);
        if (mat && mat[2].includes('=')) { // equations together, in an array of a line each
            return formal(mat[2].split(ROW).map((r) => r.split(CELL).join(' ')).join(', '));
        }
        if (mat) return matrixOf(mat[2], !!mat[1], t.length);
        if (t.includes(MAT) || t.length > 300) return null;
        const big = new RegExp('^' + BIG + '(∫|∑|∏|lim)' + SEP + '([^' + SEP + ']*)' + SEP + '([^' + END + ']*)' + END + '(.*)$').exec(t);
        if (big) {
            const c = bigOf(big[1], big[2].trim(), big[3].trim(), big[4].trim());
            if (!c || /[\u0001-\u0004]/.test(Object.values(c.fields).join(''))) return null;
            return Object.assign(c, { from: 0, to: t.length, left: c.text, trig: /sin|cos|tan/.test(c.fields.f) });
        }
        if (t.includes(BIG) || t.includes('_')) return null;
        // \binom{52}{5}, and its value after it if it is given
        const choice = /^\(?\s*([CP])\(\s*(\d{1,4})\s*,\s*(\d{1,4})\s*\)\s*\)?(?:\s*=\s*[\d,\s]+)?$/.exec(t); // in its brackets, as MathML draws it
        if (choice && +choice[3] <= +choice[2]) {
            const e = choice[1] + '(' + choice[2] + ', ' + choice[3] + ')';
            return { from: 0, to: t.length, kind: 'exact', panel: 'numbers', card: 'exact', fields: { e: e }, text: e, left: '', trig: false };
        }
        // equations together, of cases; a complex number; the whole line, or with its answer after it
        const pick = Picks && Picks.find(t).filter((c) => /^(system|complex|exact)$/.test(c.kind) && !c.from && /^\s*(?:=\s*[-\d.,\s]*)?$/.test(t.slice(c.to)))[0];
        if (pick) return Object.assign(pick, { from: 0, to: t.length, left: '', trig: false });
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

    // ---------------- formulas and constants, by what they are ---------------- //

    // A formula of the f(x) panel, E = mc² or written ρ = \frac{m}{V}: its letters have no values, so it is
    // not worked out; its icon tells what it is, and opens it in the panel, its letters in boxes. And a
    // constant, by its name in the text: speed of light, Planck's constant. formulas.js has them

    // a formula as the panel writes it, its fractions (calc-fr), roots (calc-root), powers and indices,
    // as a line: E = mc<sup>2</sup> is E = mc^(2)
    function lineOfHtml(html) {
        const tokens = String(html).match(/<[^>]+>|[^<]+/g) || [];
        let k = 0;
        const parts = (close) => {
            const out = [];
            while (k < tokens.length) {
                const t = tokens[k++];
                if (t === close) return out;
                if (t[0] !== '<') {
                    out.push({ text: t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') });
                    continue;
                }
                const m = /^<(span|sup|sub)(?:\s+class="([^"]*)")?>$/.exec(t);
                if (m) out.push({ tag: m[1], cls: m[2] || '', kids: parts('</' + m[1] + '>') });
            }
            return out;
        };
        const line = (list) => list.map((p) => {
            if (p.text !== undefined) return p.text;
            const spans = p.kids.filter((q) => q.tag);
            if (p.cls === 'calc-fr' && spans.length === 2) return '((' + line(spans[0].kids) + ')/(' + line(spans[1].kids) + '))';
            if (p.cls === 'calc-root') return '√(' + line(p.kids) + ')';
            if (p.tag === 'sup') return '^(' + line(p.kids) + ')';
            if (p.tag === 'sub') return '_(' + line(p.kids) + ')';
            return line(p.kids);
        }).join('');
        return line(parts());
    }

    // A formula reduced to one way of writing it, so a page's and the panel's meet: no spaces, no ×
    // between letters, ² as ^2, ½ as 1/2, brackets round a letter or a number alone gone
    function canon(line) {
        let t = String(line)
            .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^(' + [...m].map((ch) => (ch === '⁻' ? '-' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch))).join('') + ')')
            .replace(/½/g, '(1/2)').replace(/⅓/g, '(1/3)').replace(/¼/g, '(1/4)')
            .replace(/[−–]/g, '-').replace(/[×·⋅*]/g, ' ');
        let was;
        do {
            was = t;
            t = tidy(t).replace(/\((\d+)\/(\d+)\)/g, '$1/$2').replace(/_\(([^()]+)\)/g, '_$1');
        } while (t !== was);
        return t.replace(/\s+/g, '');
    }

    // other ways the formulas are written
    const FORMULA_ALIASES = {
        'Ideal gas law': ['PV = nRT'], 'Pythagorean theorem': ['a² + b² = c²'], 'Kinetic energy': ['KE = ½mv²', 'K = ½mv²'],
        "Ohm's law": ['V = RI', 'U = RI'], 'Speed': ['v = d/t', 's = d/t'], 'Density': ['ρ = m/V'], 'Pressure': ['P = F/A', 'p = F/A'],
        'Wave speed': ['v = λf', 'c = fλ', 'c = λf'], 'Photon energy': ['E = hν'], 'Potential energy': ['PE = mgh', 'U = mgh'],
        'Weight': ['F = mg'], 'Power': ['P = W/t'], 'Electric power': ['P = IV'], 'Charge': ['Q = I t'],
        'Area of a circle': ['A = πr²'], 'Circumference of a circle': ['C = 2πr', 'C = πd']
    };
    // and the constants, by their other names; some are words of their own, not taken
    const CONSTANT_ALIASES = {
        'Planck constant': ["Planck's constant"], 'Reduced Planck constant': ["reduced Planck's constant", 'Dirac constant'],
        'Avogadro constant': ["Avogadro's number", "Avogadro's constant", 'Avogadro number'], 'Boltzmann constant': ["Boltzmann's constant"],
        'Gravitational constant': ['Newtonian constant of gravitation', 'constant of gravitation'], 'Speed of light': ['speed of light in vacuum'],
        'Electron mass': ['mass of the electron', 'mass of an electron'], 'Proton mass': ['mass of the proton', 'mass of a proton'],
        'Neutron mass': ['mass of the neutron', 'mass of a neutron'], 'Standard gravity': ['acceleration due to gravity', 'standard acceleration of gravity'],
        "Wien's constant": ["Wien's displacement constant"], 'Coulomb constant': ["Coulomb's constant"], 'Faraday constant': ["Faraday's constant"],
        'Rydberg constant': ["Rydberg's constant"], 'Vacuum permittivity': ['permittivity of free space'], 'Vacuum permeability': ['permeability of free space']
    };
    const NOT_CONSTANTS = new Set(['Pi', 'Bar', '0 °C in kelvin', 'Day on Mars', 'Square root of 2', 'Square root of 3', 'Natural log of 2', 'Natural log of 10']);
    const nameKey = (name) => name.toLowerCase().replace(/[’`]/g, "'").replace(/[\s\-–]+/g, ' ');
    const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

    // A formula of letters, as the text writes it: E = mc² as E=mc^2 or E = m·c², with spaces or none
    function plainPattern(key) {
        let re = '', last = '';
        for (let k = 0; k < key.length; k++) {
            const ch = key[k];
            const power = ch === '^' && /^\^(-?\d+|[a-zA-Z]+)/.exec(key.slice(k));
            if (power) {
                const sup = [...power[1]].map((c) => SUPER_OF[c] || '').join('');
                re += '(?:\\s*\\^\\s*\\(?' + escape(power[1]) + '\\)?' + (sup.length === power[1].length ? '|' + sup : '') + ')';
                k += power[0].length - 1;
                last = 'x';
                continue;
            }
            const half = /^(1\/2|1\/3|1\/4)/.exec(key.slice(k));
            if (half && !last) {
                re += '(?:' + { '1/2': '½', '1/3': '⅓', '1/4': '¼' }[half[1]] + '|' + half[1][0] + '\\s*/\\s*' + half[1][2] + ')';
                k += 2;
                last = 'x';
                continue;
            }
            if ('=+-/'.includes(ch)) {
                re += '\\s*' + (ch === '-' ? '[-−–]' : escape(ch)) + '\\s*';
                last = '';
                continue;
            }
            if (last) re += '\\s*[×·⋅*]?\\s*';
            re += escape(ch);
            last = ch;
        }
        return new RegExp('(?<![\\p{L}\\p{N}_^])' + re + '(?![\\p{L}\\p{N}_⁰¹²³⁴⁵⁶⁷⁸⁹^])', 'gu');
    }

    // What the text is searched for: each formula by its one way of writing it, those of letters alone by
    // a pattern as well, and the names of the constants, the longest first: reduced Planck before Planck
    function namedIndex(data) {
        const formulas = new Map(), simple = [], names = new Map();
        data.formulas.forEach((group) => group.list.forEach((item) => {
            [lineOfHtml(item.f)].concat(FORMULA_ALIASES[item.t] || []).forEach((line) => {
                const key = canon(line);
                if (!formulas.has(key)) formulas.set(key, item);
                if (/^[\p{L}\d=+\-^π/]+$/u.test(key) && key.length >= 4 && /^[^=]+=[^=]+$/.test(key) && !simple.some((p) => p.key === key)) {
                    simple.push({ key: key, re: plainPattern(key), item: item });
                }
            });
        }));
        data.constants.forEach((group) => group.list.forEach((item) => {
            if (NOT_CONSTANTS.has(item.t)) return;
            [item.t].concat(CONSTANT_ALIASES[item.t] || []).forEach((name) => names.set(nameKey(name), item));
        }));
        const words = [...names.keys()].sort((a, b) => b.length - a.length)
            .map((name) => escape(name).replace(/'/g, "['’]").replace(/ /g, '[\\s\\-–]+'));
        return { formulas: formulas, simple: simple, names: names, constants: new RegExp('(?<![\\p{L}\\p{N}])(' + words.join('|') + ')(?![\\p{L}\\p{N}])', 'giu') };
    }

    // The formulas and constants of a text: [{ from, to, kind 'formula' or 'constant', name, text }]; of
    // two that overlap, the first and longest
    function findNamed(s, index) {
        const out = [];
        let m;
        if (!index) return out;
        if (s.includes('=')) {
            index.simple.forEach((p) => {
                p.re.lastIndex = 0;
                while ((m = p.re.exec(s))) out.push({ from: m.index, to: m.index + m[0].length, kind: 'formula', name: p.item.t, text: m[0] });
            });
        }
        index.constants.lastIndex = 0;
        while ((m = index.constants.exec(s))) {
            const item = index.names.get(nameKey(m[1]));
            if (item) out.push({ from: m.index, to: m.index + m[0].length, kind: 'constant', name: item.t, text: m[0] });
        }
        out.sort((a, b) => a.from - b.from || b.to - a.to);
        return out.filter((n, k) => !out.slice(0, k).some((o) => o.from < n.to && n.from < o.to));
    }

    // a formula marked as maths, TeX or MathML, that is one of the panel's
    function formulaOf(line, index) {
        const t = String(line).replace(/\s+/g, ' ').trim();
        const item = index && !t.includes(BAD) && !t.includes(BIG) && index.formulas.get(canon(t));
        return item ? { from: 0, to: t.length, kind: 'formula', name: item.t, text: tidy(t), left: tidy(t), trig: false } : null;
    }

    // Text selected on a page: what of the calculator it is. As maths marked as maths, the whole of it,
    // TeX too; else the one sum, network, formula or constant in it, as a sentence with 2 + 3 in it
    // a number, a list of them, a code, a quantity or a date first, as picks.js reads them. order: of dates, as
    // readDate takes it
    function selected(text, index, order) {
        const p = Picks && Picks.picked(text, order);
        if (p) return p;
        const t = String(text).replace(/\s+/g, ' ').trim();
        if (!t || t.length > 300) return null;
        const line = /\\[a-zA-Z]/.test(t) ? fromTex(t) : t;
        const c = formal(line) || formulaOf(line, index);
        if (c) return c;
        const whole = find(line, true).filter((m) => !m.from && m.to === line.length);
        if (whole.length) return whole[0];
        const some = without(find(t).concat(findNamed(t, index)), Picks ? Picks.find(t, order) : []);
        return some.length === 1 ? some[0] : null;
    }

    // what two readers find, those of the first kept where they overlap
    function without(others, first) {
        return first.concat(others.filter((c) => !first.some((o) => o.from < c.to && c.from < o.to))).sort((a, b) => a.from - b.from);
    }

    // The websites the icons are turned off on, with the menu of a right click (background.js), kept as
    // pageMathsOff. Each by its name without www.: www.example.com is example.com, but en.wikipedia.org
    // is not de.wikipedia.org
    const siteOf = (host) => String(host || '').toLowerCase().replace(/^www\./, '');
    const offOn = (list, host) => Array.isArray(list) && list.includes(siteOf(host));

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { find: find, fromTex: fromTex, formal: formal, tidy: tidy, canon: canon, lineOfHtml: lineOfHtml,
            namedIndex: namedIndex, findNamed: findNamed, formulaOf: formulaOf, selected: selected, without: without,
            siteOf: siteOf, offOn: offOn };
        return;
    }
    if (typeof document === 'undefined' || !(document.documentElement instanceof HTMLElement) || !document.body) return;


    // ---------------- the icons on the page ---------------- //

    const id = 'scientific-calculator-page-maths';
    const TAG = 'scientific-calculator-maths'; // an icon, in the text after its sum
    const STOP = 'scientific-calculator-maths-stop'; // told to an older copy of this script: it takes its icons out
    const MAX = 300; // icons on a page at most
    const UNITS = ['Rad', 'Deg', 'Grad']; // as the calculator names them
    // what is not read: code, boxes to type in, and what is not text
    const SKIP = 'script, style, noscript, template, textarea, input, select, option, button, code, pre, kbd, samp, svg, math, canvas, iframe, object, video, audio, ' +
        '.katex, .mwe-math-element, mjx-container, [class^="MathJax"], [class*=" MathJax"]';
    // the formulas drawn by Wikipedia, KaTeX and MathJax, and MathML itself: each is read as one formula
    const FORMAL_BOX = '.katex, .mwe-math-element, mjx-container, [class^="MathJax"], [class*=" MathJax"], math';
    // what needs no engine: a formula or a constant is only told of
    const NAMED = new Set(['formula', 'constant']);
    // the kinds a card of the solver works out, by the card
    const CARD = { integral: 'integral', series: 'sum', product: 'product', limit: 'limit', derivative: 'derivative', taylor: 'taylor', ode: 'ode' };
    // of a date 03/04/2024: the month first on a page of the US, else the day
    const lang = document.documentElement.lang || navigator.language || '';
    const ORDER = /-US$/i.test(lang) || (/^en$/i.test(lang) && /-US$/i.test(navigator.language || '')) ? 'mdy' : 'dmy';
    // the elements within a line of text; any other starts a line of its own
    const INLINE = new Set(['A', 'ABBR', 'B', 'BDI', 'BDO', 'BIG', 'CITE', 'DATA', 'DEL', 'DFN', 'EM', 'FONT', 'I', 'INS', 'LABEL',
        'MARK', 'NOBR', 'Q', 'S', 'SMALL', 'SPAN', 'STRIKE', 'STRONG', 'SUB', 'SUP', 'TIME', 'TT', 'U', 'VAR']);
    // a text with no operator or address, and no number or x, has no sum, and is not read further
    const QUICK = /[-+−–×*·⋅÷/^=√⁰¹²³⁴⁵⁶⁷⁸⁹<>≤≥!%]|sin|cos|tan|log|ln|sqrt|exp|abs|mod|\d\.\d+\.\d+\.\d/i;

    // An older copy of this script (the extension was updated) no longer works: it takes its icons
    // out of the text, which it puts back as it was, and this copy puts them in again
    document.dispatchEvent(new Event(STOP));
    document.getElementById(id)?.remove();

    // the layer of the tip, over the page
    const layer = document.createElement('div');
    const layerRoot = layer.attachShadow({ mode: 'closed' });
    const tipSheet = new CSSStyleSheet();
    const markSheet = new CSSStyleSheet();
    const tip = document.createElement('div');
    // the formulas and constants to look for, of formulas.js, which comes into the page with this script
    const index = window.CalcFormulas ? namedIndex(window.CalcFormulas) : null;
    let marks = []; // in the order they went in: { host, button, block, c, value, answer, head, headText, tail, tailText }
    let unit = 0; // the calculator's unit of angles: 0 Rad, 1 Deg, 2 Grad
    let tipFor = null; // the icon whose result shows
    let fontAsked = false;

    layer.id = id;
    // placed in the page, not over the window, so the tip goes with the text as it scrolls
    layer.style.cssText = 'all: initial !important; position: absolute !important; left: 0 !important; top: 0 !important; ' +
        'width: 0 !important; height: 0 !important; z-index: 2147483646 !important; display: block !important;';

    // Style sheets made here are not stopped by the security rules of the page. An icon is a letter
    // of the line, as big as its text, within limits, and sits on it as a letter does
    markSheet.replaceSync(`
        button {
            all: initial;
            display: inline-block;
            box-sizing: border-box;
            font-size: inherit;
            width: clamp(12px, 0.95em, 18px);
            height: clamp(12px, 0.95em, 18px);
            margin: 0 0.12em 0 0.22em;
            vertical-align: -0.14em;
            cursor: pointer;
            opacity: 0.85;
            transition: opacity 0.15s, transform 0.15s ease-out;
            -webkit-user-select: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        img {
            display: block;
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.35));
            pointer-events: none;
        }

        button:hover,
        button.on {
            opacity: 1;
            transform: scale(1.15);
        }

        @media print {
            button {
                display: none;
            }
        }
    `);

    // the tip is the calculator's own, as over its keys
    tipSheet.replaceSync(`
        .tip {
            position: absolute;
            width: max-content; /* its layer has no width to fit in */
            max-width: 260px;
            box-sizing: border-box;
            padding: 8px 10px 9px;
            background: #1f333c;
            border: 1px solid #4d6b80;
            border-radius: 7px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
            color: #d3d9e2;
            font: 12px/1.4 'Scientific Calculator Play', 'Play', sans-serif;
            text-align: left;
            white-space: normal;
            pointer-events: none;
            -webkit-user-select: none;
            user-select: none;
            animation: tip-in 0.12s ease-out;
        }

        .tip[hidden] {
            display: none;
        }

        @keyframes tip-in {
            from {
                opacity: 0;
                transform: translateY(3px);
            }
        }

        /* the point toward the icon, as the calculator's tip has */
        .tip::before,
        .tip::after {
            content: '';
            position: absolute;
            left: var(--arrow, 50%);
            clip-path: polygon(0 0, 100% 0, 50% 100%);
        }

        .tip::before {
            top: 100%;
            width: 14px;
            height: 7px;
            margin-left: -7px;
            background: #4d6b80;
        }

        .tip::after {
            top: calc(100% - 1px);
            width: 13.172px;
            height: 6.586px;
            margin-left: -6.586px;
            background: #1f333c;
        }

        .tip.below::before,
        .tip.below::after {
            top: auto;
            clip-path: polygon(50% 0, 100% 100%, 0 100%);
        }

        .tip.below::before {
            bottom: 100%;
        }

        .tip.below::after {
            bottom: calc(100% - 1px);
        }

        .eq {
            color: #acb4c1;
            overflow-wrap: anywhere;
        }

        .value {
            margin-top: 3px;
            color: #fff;
            font-size: 16px;
            line-height: 1.3;
            overflow-wrap: anywhere;
        }

        .plot {
            display: block;
            width: 236px;
            height: 118px;
            margin: 6px 0 2px;
            background: #172830;
            border-radius: 4px;
        }

        .plot .axis {
            fill: none;
            stroke: #4d6b80;
            stroke-width: 1;
        }

        .plot .curve {
            fill: none;
            stroke: #e7868f;
            stroke-width: 2;
            stroke-linejoin: round;
        }

        /* the icon of text selected: at its end, in its line, over the page */
        .pick {
            all: initial;
            position: absolute;
            width: 18px;
            height: 18px;
            cursor: pointer;
            transition: opacity 0.15s, transform 0.15s ease-out;
            -webkit-tap-highlight-color: transparent;
        }

        .pick img {
            display: block;
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
            pointer-events: none;
        }

        .pick:hover,
        .pick.on {
            opacity: 1;
            transform: scale(1.15);
        }

        .pick[hidden] {
            display: none;
        }

        .rows {
            display: grid;
            grid-template-columns: auto auto;
            gap: 2px 10px;
            margin-top: 5px;
        }

        .rows span:nth-child(odd) {
            color: #acb4c1;
        }

        .rows span:nth-child(even) {
            color: #fff;
            font-size: 13px;
            overflow-wrap: anywhere;
        }

        .note {
            margin-top: 3px;
            color: #acb4c1;
            font-size: 11px;
        }

        .more {
            margin-top: 5px;
            padding-top: 4px;
            border-top: 1px solid #34505e;
            color: #acb4c1;
            font-size: 11px;
        }

        @media print {
            .tip {
                display: none;
            }
        }
    `);
    layerRoot.adoptedStyleSheets = [tipSheet];
    tip.className = 'tip';
    tip.hidden = true;
    layerRoot.appendChild(tip);

    const alive = () => layer.isConnected && !!chrome.runtime?.id;

    // the width of the window without its scroll bar; of the body in an old page, in quirks mode
    const roomAcross = () => (document.compatMode === 'BackCompat' ? document.body : document.documentElement).clientWidth;

    // ---------------- reading the page ---------------- //

    // the line an element is in: the element that holds it, as a paragraph
    function blockOf(el) {
        while (INLINE.has(el.tagName) && el.parentElement) el = el.parentElement;
        return el;
    }

    // A line of the page as one text, its sum split by no tag: 3<sup>2</sup> + 4<sup>2</sup> is read
    // 3² + 4². segs: where each part of the text is in the page, those of a text node
    function newRun(block) {
        return { block: block, text: '', segs: [], sup: null, wrap: false };
    }

    function addText(run, node) {
        const parent = node.parentElement;
        const script = parent.closest('sup, sub');
        const sup = script && run.block.contains(script) ? script : null;
        const data = node.data;

        if (run.sup && run.sup !== sup) { // out of a power
            if (run.wrap) run.text += ')';
            run.sup = null;
        }
        if (!sup) {
            run.segs.push({ at: run.text.length, node: node, off: 0, len: data.length });
            run.text += data;
            return;
        }
        if (sup.tagName === 'SUB') { // x₁, log₂: not of a sum
            run.text += '\u0001';
            return;
        }
        if (!run.sup) { // into a power: 2, –1 as ², ⁻¹; x + 1 in brackets; [1], a footnote, is not one
            const all = sup.textContent.trim();
            run.sup = sup;
            run.wrap = !/^[-−–]?\d+$/.test(all);
            if (run.wrap && !/^[\dx+\-−–().\s]+$/.test(all)) {
                run.text += '\u0001';
                run.wrap = false;
                return;
            }
            if (run.wrap) run.text += '^(';
        } else if (!run.wrap && !/^[-−–]?\d+$/.test(sup.textContent.trim())) {
            return; // a footnote, its other parts
        }
        for (let k = 0; k < data.length; k++) {
            const ch = run.wrap ? data[k] : SUPER_OF[data[k]];
            if (!ch) continue; // the spaces of a power
            run.segs.push({ at: run.text.length, node: node, off: k, len: 1 });
            run.text += ch;
        }
    }

    // the place in the page of a character of the run, or just after it with end; null for one the run
    // added, as the ^( of a power
    function point(run, at, end) {
        for (const g of run.segs) {
            if (at >= g.at && at < g.at + g.len) return [g.node, g.off + at - g.at + (end ? 1 : 0)];
        }
        return null;
    }

    function rangeOf(run, from, to) {
        let a = null, b = null;
        for (let k = from; k < to && !a; k++) a = point(run, k, false);
        for (let k = to - 1; k >= from && !b; k--) b = point(run, k, true);
        if (!a || !b) return null;
        const range = document.createRange();
        range.setStart(a[0], a[1]);
        range.setEnd(b[0], b[1]);
        return range;
    }

    function readRun(run, found) {
        if (run.sup && run.wrap) run.text += ')';
        // a number, or x: sin(x) = cos(x); and the formulas and constants, which a sum keeps out of its place.
        // What picks.js reads, 5 km in miles or a loan, is read first, a sum in it not as well
        const sums = without(/[\dπx]/.test(run.text) && QUICK.test(run.text) ? find(run.text) : [], Picks ? Picks.find(run.text, ORDER) : []);
        const named = findNamed(run.text, index).filter((n) => !sums.some((c) => c.from < n.to && n.from < c.to));
        sums.concat(named).forEach((c) => {
            const range = rangeOf(run, c.from, c.to);
            if (range) found.push({ range: range, block: run.block, c: c });
        });
    }

    // MathML as a line, as fromTex reads TeX: mfrac as ((a)/(b)), msqrt as √(…), msup as ^(…)
    const MO = {
        '-': '-', '−': '-', '–': '-', '+': '+', '×': '×', '⋅': '×', '·': '×', '∗': '×', '*': '×', '÷': '÷', '/': '/', '∕': '/',
        '=': '=', '<': '<', '>': '>', '≤': '≤', '≥': '≥', '⩽': '≤', '⩾': '≥', '(': '(', ')': ')', '[': '(', ']': ')', '!': '!',
        '%': '%', '→': '→', '|': '|', '∞': '∞', '\u2061': '', '\u2062': '×', '\u2063': ' ', '\u2064': '+'
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
        if (name === 'msqrt') return '√(' + row(kids) + ')';
        if (name === 'mroot') return '((' + fromMathML(kids[0]) + ')^(1/(' + fromMathML(kids[1]) + ')))';
        if (name === 'msup') { // r², or (x + 1)²: brackets round a base of more than one piece
            const base = fromMathML(kids[0]).trim();
            return (/^([a-zA-Zπ]|\d+(\.\d+)?)$/.test(base) ? base : '(' + base + ')') + '^(' + fromMathML(kids[1]) + ')';
        }
        if (name === 'msub') return fromMathML(kids[0]) + '_(' + fromMathML(kids[1]) + ')';
        if (name === 'mfenced') return (el.getAttribute('open') ?? '(') + row(kids) + (el.getAttribute('close') ?? ')');
        if (/^(math|mrow|mstyle|mpadded|menclose)$/.test(name)) return row(kids);
        if (name === 'mtable') { // a matrix: its rows, each of its numbers, as fromTex keeps them
            return MAT + kids.filter((r) => /^(mtr|mlabeledtr)$/.test(r.localName))
                .map((r) => [...r.children].filter((d) => d.localName === 'mtd').map((d) => row([...d.children]).trim()).join(CELL)).join(ROW) + MAT;
        }
        return BAD; // an accent, a symbol of its own
    }

    // the pieces of a row; |x| is abs(x), and a function applied with no brackets has them: sin⁡x is sin(x)
    function row(kids) {
        let out = '', bars = 0;
        for (let k = 0; k < kids.length; k++) {
            let piece = fromMathML(kids[k]);
            if (piece === '|') piece = ++bars % 2 ? 'abs(' : ')';
            if (kids[k + 2] && kids[k + 1].localName === 'mo' && kids[k + 1].textContent === '\u2061') {
                const arg = fromMathML(kids[k + 2]);
                piece += /^\s*\(/.test(arg) ? arg : '(' + arg + ')';
                k += 2;
            }
            out = join(out, piece);
        }
        return out;
    }

    // A formula drawn as maths: what it is, by its MathML, else its TeX; null if it is none of ours
    function readFormula(math, tex) {
        for (const line of [math && fromMathML(math), tex && fromTex(tex)]) {
            const c = line && (formal(line) || formulaOf(line, index));
            if (c) return c;
        }
        return null;
    }

    // The formulas drawn in an element: Wikipedia's, its MathML hidden for screen readers with its TeX; KaTeX's,
    // its MathML with its TeX; MathJax 3's, its MathML for screen readers; MathJax 2's, its TeX in a script
    // after it; and MathML on its own. The icon goes after the drawing, or at its end in a line of its own
    function collectFormal(top, found) {
        const all = (selector) => (top.matches(selector) ? [top] : []).concat([...top.querySelectorAll(selector)]);
        const done = new Set();
        // the TeX: kept by KaTeX and Wikipedia in an annotation, by MathJax 4 on the math itself
        const tex = (math) => math?.getAttribute('data-latex') || math?.querySelector('annotation[encoding="application/x-tex"]')?.textContent;

        all('.mwe-math-element, .katex, mjx-container').forEach((box) => {
            if (box.parentElement?.closest('.mwe-math-element, .katex, mjx-container')) return;
            const math = box.querySelector('math');
            if (math) done.add(math);
            const c = readFormula(math, tex(math));
            if (!c) return;
            const at = box.matches('.mwe-math-element') ? { el: box } : { el: box.querySelector(':scope > .katex-html') || box, append: true };
            found.push({ anchor: at, block: blockOf(box.parentElement || box), c: c });
        });
        all('script[type^="math/tex"]').forEach((script) => {
            const shown = script.previousElementSibling;
            if (!shown || !/MathJax/.test(shown.className)) return; // not drawn yet
            const c = readFormula(null, script.textContent);
            if (c) found.push({ anchor: { el: shown, append: true }, block: blockOf(shown.parentElement || shown), c: c });
        });
        all('math').forEach((math) => {
            if (done.has(math) || math.parentElement?.closest(FORMAL_BOX)) return;
            const c = readFormula(math, tex(math));
            if (c) found.push({ anchor: { el: math }, block: blockOf(math.parentElement || math), c: c });
        });
    }

    // the sums in an element and all in it, line by line
    function collect(top, found) {
        if (top.isContentEditable || top.closest('code, pre, textarea, [contenteditable=""], [contenteditable="true"]')) return;
        collectFormal(top, found);
        if (top.closest(SKIP)) return;
        // an icon of an older copy, not yet taken out, is not text of the line
        const walker = document.createTreeWalker(top, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.nodeType === 1 && (n.localName === TAG || n.matches(SKIP) || n.isContentEditable) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
        });
        const blocks = new Map(); // of each element, its line
        let run = null;

        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (n.nodeType === 1) {
                if (!INLINE.has(n.tagName) && run) { // a line of its own, or a <br>, ends the line
                    readRun(run, found);
                    run = null;
                }
                continue;
            }
            const parent = n.parentElement;
            if (!parent) continue;
            if (!blocks.has(parent)) blocks.set(parent, blockOf(parent));
            const block = blocks.get(parent);
            if (run && run.block !== block) {
                readRun(run, found);
                run = null;
            }
            if (!run) run = newRun(block);
            addText(run, n);
        }
        if (run) readRun(run, found);
    }

    // ---------------- the calculator ---------------- //

    // The engine, and with maths the solver, put into this page by background.js the first time they
    // are needed. Each asked once
    const loading = {};
    function load(maths) {
        const has = () => !!(maths ? window.CalcMaths : window.CalcEngine);
        if (has()) return Promise.resolve(true);
        if (!loading[maths]) {
            loading[maths] = new Promise((done) => {
                try {
                    chrome.runtime.sendMessage({ command: 'page-maths-engine', maths: maths }, () => {
                        void chrome.runtime.lastError;
                        done(has());
                    });
                } catch (e) {
                    done(false); // the extension was updated or turned off
                }
            }).then((ok) => {
                if (!ok) delete loading[maths];
                return ok;
            });
        }
        return loading[maths];
    }

    // a sum worked out as the calculator would, in its unit of angles; null if it gives an error
    function workOut(text) {
        try {
            const engine = new window.CalcEngine();
            if (!engine.paste(text, unit, true) || engine.error) return null;
            engine.press('=', unit);
            const v = +engine.value;
            return engine.error || !isFinite(v) ? null : v;
        } catch (e) {
            return null;
        }
    }

    // What is found is one the calculator works out: a sum to a number; a function of x alone; a matrix
    // of numbers, kept as values; an equation the solver reads. An address is read whole already, and a
    // formula or a constant only told of
    function checked(c, value) {
        if (c.kind === 'sum') return value !== null;
        if (c.panel || c.kind === 'ode') return true; // read whole by its reader; its tip works it out
        if (c.kind === 'derivative' || c.kind === 'taylor') return readable(c.fields.f + '=0') && !isNaN(bound(c.kind === 'taylor' ? c.fields.a : c.fields.x));
        if (CARD[c.kind]) return calculable(c);
        if (c.kind === 'graph') return readable(c.fields.f + '=0');
        if (c.kind === 'matrix') {
            c.values = c.rows.map((r) => r.map(workOut));
            return c.values.every((r) => r.every((v) => v !== null));
        }
        return NAMED.has(c.kind) || c.kind === 'subnet' || readable(c.text);
    }

    // ∫, Σ, Π and lim: a function the solver reads, of x, or of its n, k, i or j, and ends that are numbers or ∞
    function calculable(c) {
        try {
            const g = window.CalcEngine.graph(c.fields.f, false, {});
            if (!g || g.letters.some((letter) => letter !== c.v)) return false;
            return (c.kind === 'limit' ? [c.fields.a] : [c.fields.a, c.fields.b]).every((end) => !isNaN(bound(end)));
        } catch (e) {
            return false;
        }
    }

    // both sides of an equation, or the three parts of –2 < 3x + 1 < 7, are functions of x the solver reads
    function readable(text) {
        const sides = text.split(/[=<>≤≥]/);
        return sides.length >= 2 && sides.length <= 3 && sides.every((side) => {
            try {
                const g = window.CalcEngine.graph(side, false, {});
                return !!g && !g.letters.length;
            } catch (e) {
                return false;
            }
        });
    }

    // a number as the calculator shows it: up to 12 digits, – for minus, ᴇ for its power of ten
    function shown(v) {
        if (v === Infinity) return '∞';
        if (v === -Infinity) return '–∞';
        return String(+(+v).toPrecision(12) || 0).replace(/e\+?/, 'ᴇ').replace(/-/g, '–');
    }

    // the text of the calculator, as it shows it, its whole powers raised: x^2 as x²
    // fractions: written in them, 1/2 + 1/3 keeps its /
    const pretty = (text, fractions) => text.replace(/\^(?:\((-?\d+)\)|(\d+))/g, (m, a, b) => [...(a || b)].map((ch) => SUPER_OF[ch]).join(''))
        .replace(/\*/g, '×').replace(/\/(?!dx)/g, fractions ? '/' : '÷').replace(/-/g, '–'); // d/dx as it is
    // an exact form, as the solver writes it: (1 + √5)/2, π²/6
    const exactText = (form) => form.replace(/-/g, '–');

    // What the tip says: { lines, note }. A sum is worked out already; an equation and an
    // inequality the first time the tip shows, as the solver does
    function answer(mark) {
        const c = mark.c;
        if (c.kind === 'sum') {
            const f = c.frac && window.CalcEngine.fraction(mark.value); // 5/6, as the calculator's a/b shows it
            return Promise.resolve({ lines: f ? ['= ' + (f[0] < 0 ? '–' : '') + Math.abs(f[0]) + '/' + f[1], '≈ ' + shown(mark.value)] : ['= ' + shown(mark.value)] });
        }
        if (c.kind === 'formula') return Promise.resolve(formulaTip(c.name));
        if (c.kind === 'graph') return Promise.resolve(curveTip(c));
        if (c.kind === 'constant') return Promise.resolve(constantTip(c.name));
        if (c.panel) { // of picks.js, by the calculator's maths and units
            return load(true).then((ok) => {
                try {
                    return ok ? Picks.tipOf(c, window.CalcMaths, window.CalcEngine, window.CalcUnits, unit) : null;
                } catch (e) {
                    return null;
                }
            });
        }
        return load(true).then((ok) => {
            if (!ok) return null;
            try {
                return c.kind === 'equation' ? roots(window.CalcMaths.solve(c.text, false, unit, NaN, NaN, true), c.v) :
                    c.kind === 'subnet' ? network(window.CalcMaths.subnet(c.text)) :
                    c.kind === 'matrix' ? matrixTip(c) :
                    CARD[c.kind] ? calculus(c) :
                    holds(window.CalcMaths.inequality(c.text, false, unit, NaN, NaN), c.v);
            } catch (e) {
                return null;
            }
        });
    }

    const sub = (n) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]);

    // A Taylor series written out, x – x³/6 + x⁵/120 + …, of (x – a) about a; a coefficient a fraction where it is one
    function seriesText(coefs, a) {
        const v = a === '0' ? 'x' : '(x ' + (a[0] === '-' ? '+ ' + a.slice(1) : '– ' + a) + ')';
        const terms = [];
        coefs.forEach((k, n) => {
            if (Math.abs(k) < 1e-12) return;
            const f = window.CalcEngine.fraction(Math.abs(k)), [p, q] = f && f[1] <= 1e6 ? f : [shown(Math.abs(k)), 1];
            const power = n === 0 ? '' : n === 1 ? v : v + [...String(n)].map((d) => SUPER_OF[d]).join('');
            // 1, x, 2x³, x³/6, 3x²/4
            const body = n === 0 ? p + (q === 1 ? '' : '/' + q) : (String(p) === '1' ? '' : p) + power + (q === 1 ? '' : '/' + q);
            terms.push([k < 0, body]);
        });
        if (!terms.length) return '0';
        return terms.map(([minus, body], i) => (i ? (minus ? ' – ' : ' + ') : minus ? '–' : '') + body).join('') + ' + …';
    }

    // an end typed for the solver: inf, –inf, or what the engine works out, π/2
    function bound(text) {
        if (/^[-+]?inf$/.test(text)) return text[0] === '-' ? -Infinity : Infinity;
        const v = workOut(text);
        return v === null ? NaN : v;
    }

    // ∫ f(x) dx, Σ and Π of f(n), lim f(x), as the cards of the solver work them out: the value, and its exact
    // form where it has one; of a limit that differs from below and above, both
    function calculus(c) {
        const f = c.fields, M = window.CalcMaths, exact = (v) => M.exactOf(v, 1e-9, 'constants', 0, () => true);
        if (c.kind === 'derivative') { // its value, slope and the slope of that at x, as the card has them
            const curve = M.fn(f.f, false), x = bound(f.x);
            if (!curve) return null;
            const slopes = M.slopes(curve, x, unit), at = 'x = ' + f.x.replace('-', '–');
            return { title: 'd/dx ' + pretty(f.f) + ' at ' + at, lines: ['f′ = ' + shown(slopes[0])], rows: [['f', shown(curve.at(x, unit, true))], ['f″', shown(slopes[1])]],
                more: 'Click to open it in Derivative, with its tangent.' };
        }
        if (c.kind === 'taylor') {
            const r = M.taylor(f.f, false, unit, bound(f.a), +f.n);
            if (r.error || !r.coefs) return null;
            return { title: 'Taylor series of ' + pretty(f.f) + (f.a === '0' ? '' : ' about ' + f.a.replace('-', '–')), lines: [seriesText(r.coefs, f.a)],
                note: 'To the power ' + f.n + '.', more: 'Click to open it in Taylor series, with each coefficient.' };
        }
        if (c.kind === 'ode') {
            const r = M.ode(f.f, false, unit, +f.x0, +f.y0, +f.x);
            if (r.error) return null;
            return { title: 'y′ = ' + pretty(f.f) + ', y(' + f.x0 + ') = ' + f.y0, lines: [isNaN(r.y) ? 'No value on the way' : 'y(' + f.x + ') ≈ ' + shown(r.y)],
                rows: isNaN(r.y) ? [] : [['y′(' + f.x + ')', shown(r.slope)]], note: 'By the steps of Runge and Kutta.', more: 'Click to open it in Differential equation, to choose x.' };
        }
        const said = (v, form) => (!isFinite(v) && !Number.isNaN(v) ? '= ' + shown(v) : isNaN(v) ? 'No value' :
            '= ' + (form && exactText(form) !== shown(v) ? exactText(form) + ' ≈ ' : '') + shown(v));
        if (c.kind === 'series' || c.kind === 'product') {
            const r = M.series(f.f, false, unit, bound(f.a), bound(f.b), c.kind === 'product');
            return r.error ? null : { lines: [said(r.value, r.exact)] };
        }
        const curve = M.fn(f.f, false);
        if (!curve) return null;
        if (c.kind === 'integral') {
            const v = M.integral(curve, bound(f.a), bound(f.b), unit);
            return { lines: [said(v, isFinite(v) ? exact(v) : null)], note: isNaN(v) ? 'It has no value on the way, or does not settle.' : '' };
        }
        const r = M.limit(curve, bound(f.a), unit);
        if (!isNaN(r.value)) return { lines: [said(r.value)] };
        return { lines: ['From below ' + (isNaN(r.left) ? 'none' : shown(r.left)), 'From above ' + (isNaN(r.right) ? 'none' : shown(r.right))],
            note: 'The two sides differ: it has no limit there.' };
    }

    // A function of x drawn small, as the graph would at first: x from –10 to 10, y as far as most of it goes, the
    // axes where they are in view; and where it crosses the y axis
    function curveTip(c) {
        const g = window.CalcEngine.graph(c.fields.f, false, {});
        const W = 236, H = 118, n = 236, xs = [], ys = [];
        for (let k = 0; k <= n; k++) {
            const x = -10 + 20 * k / n, y = g.at(x, unit);
            xs.push(x);
            ys.push(isFinite(y) ? y : NaN);
        }
        const sorted = ys.filter(isFinite).sort((a, b) => a - b);
        if (!sorted.length) return { title: c.shown || c.text, lines: ['No value from x = –10 to 10'] };
        let lo = sorted[Math.floor(sorted.length * 0.05)], hi = sorted[Math.ceil(sorted.length * 0.95) - 1];
        if (lo > 0 && lo < (hi - lo)) lo = 0; // the x axis in view, when it is near
        if (hi < 0 && -hi < (hi - lo)) hi = 0;
        if (hi - lo < 1e-9) {
            lo -= 1;
            hi += 1;
        }
        const pad = (hi - lo) * 0.08;
        lo -= pad;
        hi += pad;
        const px = (x) => (x + 10) / 20 * W, py = (y) => H - (y - lo) / (hi - lo) * H;
        const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
        const line = (d, cls) => {
            const p = svg.appendChild(document.createElementNS(svgNS, 'path'));
            p.setAttribute('d', d);
            p.setAttribute('class', cls);
        };
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('class', 'plot');
        line('M0 ' + py(0) + 'H' + W + 'M' + px(0) + ' 0V' + H, 'axis');
        let d = '', on = false;
        ys.forEach((y, k) => {
            // no line through where it has no value, nor down a jump out of view, as tan x has
            const out = !isFinite(y) || y < lo - (hi - lo) * 2 || y > hi + (hi - lo) * 2;
            if (out) {
                on = false;
                return;
            }
            d += (on ? 'L' : 'M') + px(xs[k]).toFixed(1) + ' ' + Math.max(-H, Math.min(2 * H, py(y))).toFixed(1);
            on = true;
        });
        line(d, 'curve');
        const at0 = g.at(0, unit);
        return {
            title: pretty(c.shown || c.text), svg: svg,
            rows: [['x', '–10 to 10'], ['y', shown(+lo.toPrecision(3)) + ' to ' + shown(+hi.toPrecision(3))]].concat(isFinite(at0) ? [['At x = 0', shown(at0)]] : [])
        };
    }

    // A matrix's determinant, rank and inverse, as the Matrix card has them; the inverse of up to 3×3, that fits
    function matrixTip(c) {
        const a = c.values, M = window.CalcMaths, square = a.length === a[0].length;
        const det = square ? M.det(a) : NaN, inv = square ? M.inverse(a) : null;
        const rows = [['Size', a.length + '×' + a[0].length], ['Rank', String(M.rank(a))]];
        if (square && !c.det) rows.splice(1, 0, ['det', shown(det)]);
        const short = (v) => shown(+v.toPrecision(6)); // the inverse to 6 digits, to fit; the card has them all
        if (square && a.length <= 3) rows.push(['Inverse', inv ? '[' + inv.map((r) => r.map(short).join(' ')).join('; ') + ']' : 'none: det is 0']);
        return {
            title: (c.det ? 'det ' : '') + '[' + c.rows.map((r) => r.map((cell) => cell.replace(/-/g, '–')).join(' ')).join('; ') + ']',
            lines: c.det ? [square ? '= ' + shown(det) : 'Not square: no determinant'] : [],
            rows: rows, note: square ? '' : 'Not square: no determinant nor inverse.'
        };
    }

    // the formulas' and the constants' own markup as text: m<sub>e</sub> as mₑ, s<sup>2</sup> as s², a fraction as a/b
    const SUB_OF = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ',
        h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ', i: 'ᵢ', r: 'ᵣ', '+': '₊', '-': '₋', '−': '₋' };
    function plain(html) {
        const each = (text, map) => [...text].map((ch) => map[ch] || ch).join('');
        return lineOfHtml(html).replace(/\^\(([^()]*)\)/g, (m, t) => ([...t].every((ch) => SUPER_OF[ch]) ? each(t, SUPER_OF) : '^' + t))
            .replace(/_\(([^()]*)\)/g, (m, t) => each(t, SUB_OF)).replace(/\(\(([^()]+)\)\/\(([^()]+)\)\)/g, (m, a, b) =>
                (/^\w+$/.test(a) ? a : '(' + a + ')') + '/' + (/^\w+$/.test(b) ? b : '(' + b + ')'));
    }

    const itemOf = (list, name) => {
        for (const group of list) for (const item of group.list) if (item.t === name) return item;
        return null;
    };

    // a formula's name, as it is written, what it gives, and its letters
    function formulaTip(name) {
        const f = itemOf(window.CalcFormulas.formulas, name);
        return f && { title: f.t, lines: [plain(f.f)], note: plain(f.d), rows: f.v.map((v) => [plain(v[1]), v[2]]) };
    }

    // a constant's symbol = its value and unit, 6.674 × 10⁻¹¹ m³/(kg·s²), and what it is
    function constantTip(name) {
        const k = itemOf(window.CalcFormulas.constants, name);
        if (!k) return null;
        const parts = (+k.v.toPrecision(12)).toExponential().split('e'), a = Math.abs(k.v);
        const value = a >= (k.v % 1 ? 1e6 : 1e12) || a < 1e-3 ? parts[0] + ' × 10' + each10(+parts[1]) : String(+k.v.toPrecision(12));
        return { title: k.t, lines: [plain(k.s) + ' = ' + value.replace(/-/g, '−') + (k.u ? ' ' + plain(k.u) : '')], note: plain(k.d) };
    }
    const each10 = (n) => [...String(n)].map((ch) => SUPER_OF[ch]).join('');

    // x = 2, or x₁ = 2 and x₂ = 3, each with its exact form if it has one: (1 + √5)/2 ≈ 1.618…
    function roots(r, v) {
        const x = v || 'x';
        if (!r || r.error) return null;
        if (!r.roots.length) return { lines: ['No root found'] };
        const many = r.roots.length > 6;
        const name = x;
        const lines = r.roots.slice(0, 6).map((root, i) => {
            const exact = r.exact && r.exact[i] && exactText(r.exact[i]);
            return name + (r.roots.length > 1 ? sub(i + 1) : '') + ' = ' + (exact && exact !== shown(root) ? exact + ' ≈ ' : '') + shown(root);
        });
        return {
            lines: lines,
            note: r.more ? 'The ' + r.roots.length + ' roots nearest 0 of many: the calculator shows them all.' :
                many ? 'And ' + (r.roots.length - 6) + ' more: the calculator shows them all.' : ''
        };
    }

    // 2⁹⁶: a count of addresses of IPv6, a power of 2, as a number while it is a short one
    function power(count) {
        const bits = count.toString(2).length - 1;
        return count <= BigInt(1e12) ? String(count) : '2' + String(bits).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    }

    // An IP network as the calculator's IP subnet shows it, its main tiles: of IPv4 its network, broadcast,
    // mask, hosts and kind; of IPv6, which has no broadcast nor mask, its network, last address and size
    function network(r) {
        if (!r || r.error) return null;
        if (r.v6) {
            const ip = window.CalcMaths.ipv6Text;
            return {
                rows: [['Network', ip(r.network) + '/' + r.prefix], ['Last address', ip(r.last)], ['Addresses', power(r.all)],
                    ['/64 networks', r.subnets === null ? '–' : power(r.subnets)], ['Kind', r.kind]]
            };
        }
        const ip = window.CalcMaths.ipText;
        return {
            rows: [['Network', ip(r.network) + '/' + r.prefix], ['Broadcast', ip(r.broadcast)], ['Mask', ip(r.mask)],
                ['Hosts', r.hosts.toLocaleString('en-US') + (r.hosts > 1 ? ': ' + ip(r.first) + ' – ' + ip(r.last) : '')], ['Kind', r.kind]]
        };
    }

    // where an inequality holds: x < –2 or x > 2
    function holds(r, v) {
        const x = v || 'x';
        if (!r || r.error) return null;
        if (!r.parts.length) return { lines: ['It holds for no ' + x] };
        return {
            lines: r.parts.map((p) => {
                if (p.from === p.to) return x + ' = ' + shown(p.from);
                if (p.from === -Infinity && p.to === Infinity) return 'Every ' + x;
                if (p.from === -Infinity) return x + ' ' + (p.toIn ? '≤' : '<') + ' ' + shown(p.to);
                if (p.to === Infinity) return x + ' ' + (p.fromIn ? '≥' : '>') + ' ' + shown(p.from);
                return shown(p.from) + ' ' + (p.fromIn ? '≤' : '<') + ' ' + x + ' ' + (p.toIn ? '≤' : '<') + ' ' + shown(p.to);
            }).map((line, i) => (i ? 'or ' : '') + line)
        };
    }

    // ---------------- the icons ---------------- //

    // A sum found, worked out: its icon goes into the text, just after it
    function add(f) {
        const c = f.c, range = f.range;
        if (marks.length >= MAX) return;
        if (range ? !range.endContainer.isConnected || range.endContainer.nodeType !== 3 || range.collapsed : !f.anchor.el.isConnected) return;
        const value = c.kind === 'sum' ? workOut(c.left) : null;
        // an address is read whole already, and a formula or a constant only told of
        if (!checked(c, value)) return;

        const host = document.createElement(TAG);
        const root = host.attachShadow({ mode: 'closed' });
        const button = document.createElement('button');
        const logo = document.createElement('img');
        const mark = { host: host, button: button, block: f.block, c: c, value: value, answer: null, head: null, headText: '', tail: null, tailText: '' };

        // the styles of the page do not reach it: it has the size of the text round it, and nothing more.
        // nowrap: the line does not break between the sum and its icon
        host.style.cssText = 'all: initial !important; display: inline !important; font-size: inherit !important; line-height: inherit !important; ' +
            'white-space: nowrap !important;';
        root.adoptedStyleSheets = [markSheet];
        button.type = 'button';
        button.tabIndex = -1; // not one more stop for Tab on every sum of the page
        button.setAttribute('aria-label', 'Open in Scientific Calculator');
        logo.src = chrome.runtime.getURL('imgs/icon128.png');
        logo.alt = '';
        logo.draggable = false;
        button.appendChild(logo);
        // and a word joiner either side, for the browsers that break there all the same
        root.append('\u2060', button, '\u2060');
        button.addEventListener('pointerenter', () => showTip(mark));
        button.addEventListener('pointerleave', () => hideTip(mark));
        button.addEventListener('click', (event) => {
            event.preventDefault(); // nor does a link round it open
            event.stopPropagation(); // the page does not take the click as its own
            openCalculator(mark);
        });
        if (range) {
            put(mark, range.endContainer, range.endOffset);
        } else if (f.anchor.append) {
            f.anchor.el.appendChild(host);
        } else {
            f.anchor.el.after(host);
        }
        marks.push(mark);
    }

    // The icon in the text at the end of its sum. Where the sum ends its text, as 2 + 3</b>, it goes after
    // the elements that end with it: out of a power, a link. Else the text is split there: the page's
    // text node keeps the sum, and the rest is a text node of its own after the icon
    function put(mark, node, offset) {
        if (offset < node.data.length) {
            mark.head = node;
            mark.tail = node.splitText(offset);
            mark.headText = node.data;
            mark.tailText = mark.tail.data;
            mark.tail.before(mark.host);
            return;
        }
        let after = node;
        while (!after.nextSibling && after.parentElement !== mark.block && INLINE.has(after.parentElement.tagName)) after = after.parentElement;
        after.after(mark.host);
    }

    // The icon out of the text, and the text one again where it was split. Unless the page changed it
    // meanwhile: a page that wrote its text node again, or took it out, has no use for the rest
    function remove(mark) {
        if (tipFor === mark) hideTip(mark);
        mark.host.remove();
        if (!mark.tail) return;
        const head = mark.head, tail = mark.tail;
        if (head.isConnected && head.data === mark.headText && head.nextSibling === tail && tail.data === mark.tailText) {
            head.appendData(tail.data);
            tail.remove();
        } else if (!head.isConnected || head.data !== mark.headText) {
            tail.remove();
        }
    }

    // the icons in these elements, or no longer in the page, taken out: the last first, so a text
    // split twice is put together in the order it was split
    function clear(tops) {
        const gone = marks.filter((mark) => !mark.block.isConnected || !mark.host.isConnected || tops.some((el) => el.contains(mark.block)));
        if (!gone.length) return;
        gone.reverse().forEach(remove);
        marks = marks.filter((mark) => !gone.includes(mark));
    }

    // the font of the calculator, for its tip: put in the page the first time a tip shows
    function loadFont() {
        if (fontAsked) return;
        fontAsked = true;
        fetch(chrome.runtime.getURL('fonts/Play-Regular.ttf'))
            .then((response) => response.arrayBuffer())
            .then((data) => {
                const font = new FontFace('Scientific Calculator Play', data);
                document.fonts.add(font);
                return font.load();
            })
            .catch(() => { }); // the tip has the page's sans-serif
    }

    function showTip(mark) {
        tipFor = mark;
        mark.button.classList.add('on');
        loadFont();
        (mark.answer || (mark.answer = answer(mark))).then((said) => {
            if (tipFor !== mark || !said) return;
            const c = mark.c;
            const eq = document.createElement('div');
            const more = document.createElement('div');

            tip.textContent = '';
            eq.className = 'eq';
            eq.textContent = said.title || (c.kind === 'subnet' ? c.text : pretty(c.shown || (c.kind === 'sum' ? c.left : c.text), c.frac));
            tip.appendChild(eq);
            (said.lines || []).forEach((line) => {
                const value = tip.appendChild(document.createElement('div'));
                value.className = 'value';
                value.textContent = line;
            });
            if (said.svg) tip.appendChild(said.svg);
            if (said.rows) { // a name and its value on each line, as the tiles of a card
                const rows = tip.appendChild(document.createElement('div'));
                rows.className = 'rows';
                said.rows.forEach(([name, value]) => {
                    rows.appendChild(document.createElement('span')).textContent = name;
                    rows.appendChild(document.createElement('span')).textContent = value;
                });
            }
            if (said.note) {
                const note = tip.appendChild(document.createElement('div'));
                note.className = 'note';
                note.textContent = said.note;
            }
            more.className = 'more';
            more.textContent = (c.trig ? 'In ' + UNITS[unit] + '. ' : '') + (c.frac && (said.lines || []).length > 1 ? 'Opens with a/b on, in fractions. ' : '') + (c.v && !CARD[c.kind] ? 'Solved for ' + c.v + '; the solver writes it with x. ' : '') +
                (said.more ? said.more : c.kind === 'formula' ? 'Click to open it in the formulas, its letters to fill in.' :
                c.kind === 'graph' ? 'Click to draw it in the graph.' : c.kind === 'matrix' ? 'Click to open it in Matrix, with its transpose and powers.' :
                c.kind === 'constant' ? 'Click to open it in the constants.' : 'Click to open it in the calculator.');
            tip.appendChild(more);
            tip.hidden = false;
            placeTip(mark);
        });
    }

    function hideTip(mark) {
        if (tipFor !== mark) return;
        tipFor = null;
        mark.button.classList.remove('on');
        tip.hidden = true;
    }

    // over the icon, or under it with no room above; within the window
    function placeTip(mark) {
        const icon = mark.button.getBoundingClientRect();
        const width = tip.offsetWidth, height = tip.offsetHeight;
        const middle = icon.left + icon.width / 2;
        const left = Math.max(4, Math.min(roomAcross() - width - 4, middle - width / 2));
        const below = icon.top - height - 9 < 0;
        const top = below ? icon.bottom + 9 : icon.top - height - 9;

        tip.classList.toggle('below', below);
        tip.style.left = left + window.scrollX + 'px';
        tip.style.top = top + window.scrollY + 'px';
        tip.style.setProperty('--arrow', Math.max(10, Math.min(width - 10, middle - left)) + 'px');
    }

    // The calculator opens with it: a sum worked out in the display, an equation in its card of the
    // solver, an IP network in its card of the numbers. background.js keeps it for the calculator, and
    // opens Detached Mode
    // What picks.js reads opens in its card, its panel and card with its boxes. Equations together have their
    // card once they are worked out, as their tip does
    function openCalculator(mark) {
        const c = mark.c;
        hideTip(mark);
        if (mark === picked) hidePick();
        const ready = c.kind === 'system' && !c.fields.a1 && !c.fields.e1 ? mark.answer || (mark.answer = answer(mark)) : Promise.resolve();
        ready.then(() => {
            try {
                chrome.runtime.sendMessage(c.panel ? { command: 'open-page-maths', text: c.text || '', kind: 'card', fields: Object.assign({ panel: c.panel, card: c.card || '' }, c.fields) } :
                    { command: 'open-page-maths', text: c.kind === 'sum' ? c.left : c.text, kind: c.kind,
                        fields: NAMED.has(c.kind) ? { name: c.name } : c.kind === 'sum' ? { frac: c.frac ? '1' : '0' } : c.fields || {} });
            } catch (e) {
                stop(); // the extension was updated or turned off after this page was opened
            }
        });
    }


    // ---------------- text selected ---------------- //

    // Text selected that the calculator reads: an icon at its end, over the page, with the same tip and
    // click as the icons in the text. It goes as the selection does
    const pick = document.createElement('button');
    const pickLogo = document.createElement('img');
    let picked = null; // its mark: { button, c, value, answer }
    let picking = 0;

    pick.type = 'button';
    pick.className = 'pick';
    pick.hidden = true;
    pick.tabIndex = -1;
    pick.setAttribute('aria-label', 'Open the selection in Scientific Calculator');
    pickLogo.src = chrome.runtime.getURL('imgs/icon128.png');
    pickLogo.alt = '';
    pickLogo.draggable = false;
    pick.appendChild(pickLogo);
    layerRoot.appendChild(pick);
    pick.addEventListener('pointerenter', () => picked && showTip(picked));
    pick.addEventListener('pointerleave', () => picked && hideTip(picked));
    pick.addEventListener('mousedown', (event) => event.preventDefault()); // the selection stays
    pick.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (picked) openCalculator(picked);
    });

    function hidePick() {
        if (picked) hideTip(picked);
        picked = null;
        pick.hidden = true;
    }

    // What the selection is, worked out as the icons' are; the engine is put in first if it is needed
    function whatIs(text) {
        const c = selected(text, index, ORDER);
        if (!c) return Promise.resolve(null);
        return (NAMED.has(c.kind) ? Promise.resolve(true) : load(false)).then((ok) => {
            if (!ok) return null;
            const value = c.kind === 'sum' ? workOut(c.left) : null;
            return checked(c, value) ? { c: c, value: value } : null;
        });
    }

    // The middle of the letters selected, up and down, in the window: measured in their own font, how far
    // they go above their baseline and below it, the baseline as far below the top of their box as the font
    // reaches up. Without a measure, the middle of their box
    let measure = null;
    function middleOf(text, el, r, em) {
        try {
            const style = getComputedStyle(el || document.body);
            measure = measure || document.createElement('canvas').getContext('2d');
            measure.font = style.font || [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');
            const m = measure.measureText(text.trim().split('\n').pop());
            const up = m.fontBoundingBoxAscent, down = m.fontBoundingBoxDescent;
            if (!(up > 0) || !(m.actualBoundingBoxAscent > 0)) return r.top + r.height / 2;
            const baseline = r.top + up * r.height / (up + down || r.height); // the box as the font fills it
            return baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
        } catch (e) {
            return r.top + r.height / 2;
        }
    }

    function readSelection() {
        const sel = window.getSelection();
        const text = sel && !sel.isCollapsed && sel.rangeCount ? sel.toString() : '';
        if (!text.trim() || text.length > 20000) return hidePick(); // a list of numbers may be long, as a column of a table
        const range = sel.getRangeAt(0);
        const box = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        if (!box || box.isContentEditable || box.closest('input, textarea')) return hidePick();
        const ask = ++picking;
        whatIs(text).then((found) => {
            if (ask !== picking || !alive()) return;
            if (!found) return hidePick();
            const rects = range.getClientRects(), r = rects[rects.length - 1] || range.getBoundingClientRect();
            if (!r || (!r.width && !r.height)) return hidePick();
            if (picked) hideTip(picked);
            picked = { button: pick, c: found.c, value: found.value, answer: null };
            const end = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
            const em = parseFloat(getComputedStyle(end || document.body).fontSize) || r.height / 1.2;
            const size = Math.round(Math.max(16, Math.min(26, em * 1.15))); // a little bigger than the letters
            pick.style.width = pick.style.height = size + 'px';
            pick.style.left = Math.min(r.right + 2, roomAcross() - size - 2) + window.scrollX + 'px';
            pick.style.top = middleOf(text, end, r, em) - size / 2 + window.scrollY + 'px';
            pick.hidden = false;
        });
    }

    // once the selection is made: the button let go, or the keys that select
    const onPicked = (event) => {
        if (event.composedPath().includes(layer)) return;
        setTimeout(readSelection, 10);
    };
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (picked && (!sel || sel.isCollapsed)) hidePick();
    });

    // Calculate "…" of the menu of a right click (background.js): the selection opens in the calculator as
    // its icon would; what is none of ours is put in the display as it is, as Paste would
    function openSelected(text) {
        whatIs(text).then((found) => {
            const c = found ? found.c : { kind: 'sum', left: String(text).trim(), text: String(text).trim() };
            openCalculator({ c: c, button: pick });
        });
    }

    // ---------------- following the page ---------------- //

    // the lines whose text changed, read again together a moment later
    const changed = new Set();
    let timer = 0;

    function readAgain(el) {
        changed.add(el);
        if (!timer) timer = setTimeout(readChanged, 300);
    }

    function readChanged() {
        timer = 0;
        if (!alive()) return stop();
        const all = [...changed].filter((el) => el.isConnected);
        const tops = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
        const found = [];

        changed.clear();
        quietly(() => clear(tops));
        tops.forEach((el) => collect(el, found));
        if (found.some((f) => !NAMED.has(f.c.kind))) {
            load(false).then((ok) => {
                if (ok && alive()) quietly(() => found.forEach(add));
            });
        } else if (found.length) {
            quietly(() => found.forEach(add)); // formulas and constants alone need no engine
        }
    }

    // whole lines, as a paragraph or a box put in or taken out, and the spaces between them
    const wholeLines = (nodes) => [...nodes].every((n) => (n.nodeType === 1 ? !INLINE.has(n.tagName) && n.localName !== TAG : !n.data.trim()));

    // A change of the page. Its icons in the lines it changed come out at once, so the page finds its
    // text as it left it, and the lines are read again. Lines put in between others, as a page adds
    // them, are read alone, and those taken out lose their icons, the others keeping theirs
    function heard(list) {
        const lines = new Set(), added = new Set();
        let removed = false;
        list.forEach((m) => {
            const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
            const box = target && target.closest(FORMAL_BOX); // drawn again, as by KaTeX: its line
            const el = box ? box.parentElement || box : target;
            if (!el || !el.isConnected) return;
            if (!box && m.type === 'childList' && !INLINE.has(el.tagName) && wholeLines(m.addedNodes) && wholeLines(m.removedNodes)) {
                m.addedNodes.forEach((n) => n.nodeType === 1 && added.add(n));
                removed = removed || m.removedNodes.length > 0;
                return;
            }
            lines.add(blockOf(el));
        });
        if (lines.size || removed) quietly(() => clear([...lines]));
        lines.forEach(readAgain);
        added.forEach(readAgain);
    }

    const observer = new MutationObserver(heard);

    // what this script changes in the page is not heard as a change of the page; what the page
    // changed before it still is
    function quietly(change) {
        const before = observer.takeRecords();
        change();
        observer.takeRecords();
        if (before.length) heard(before);
    }

    // Taken out, the text as it was: when the option or the website is turned off, or a newer copy
    // comes. It starts again when the website is turned on, unless it is no longer wanted at all
    let retired = false;

    function start() {
        if (retired || layer.isConnected || !chrome.runtime?.id) return;
        document.documentElement.appendChild(layer);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        window.addEventListener('resize', onScroll);
        document.addEventListener('mouseup', onPicked);
        document.addEventListener('keyup', onPicked);
        readAgain(document.body);
    }

    function stop() {
        hidePick();
        quietly(() => clear([document.documentElement]));
        observer.disconnect();
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
        document.removeEventListener('mouseup', onPicked);
        document.removeEventListener('keyup', onPicked);
        clearTimeout(timer);
        layer.remove();
    }

    function onScroll() {
        if (tipFor) hideTip(tipFor);
    }


    // The calculator's unit, as popup.js keeps it: a sum of an angle is worked out again in another
    const readUnit = (value) => {
        unit = value === 1 || value === 2 ? value : 0;
    };

    // for good: the option was turned off, or a newer copy of this script came
    const retire = () => {
        retired = true;
        if (layer.isConnected) stop();
    };
    document.addEventListener(STOP, retire);

    chrome.storage.local.get(['angleUnit', 'pageMathsOff'], (items) => {
        readUnit(items?.angleUnit);
        if (!offOn(items?.pageMathsOff, location.hostname)) start();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || retired || !chrome.runtime?.id) return;
        if (changes.angleUnit) readUnit(changes.angleUnit.newValue);
        // this website turned off or on: at once, without a reload
        if (changes.pageMathsOff) {
            if (offOn(changes.pageMathsOff.newValue, location.hostname)) return layer.isConnected && stop();
            if (!layer.isConnected) return start();
        }
        if (changes.angleUnit && alive()) readAgain(document.body);
    });

    // the option was turned off: the icons go right away, the text as it was. Calculate "…" of the
    // menu still reads the selection on a website the icons are turned off on
    chrome.runtime.onMessage.addListener((message, sender, answerIt) => {
        if (message?.command === 'remove-page-maths') retire();
        if (message?.command === 'page-maths-selection' && !retired && chrome.runtime?.id && typeof message.text === 'string') {
            openSelected(message.text);
            answerIt(true); // background.js opens the calculator itself without this page
        }
    });
})(typeof window !== 'undefined' ? window : this);
