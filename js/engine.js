// Calculator engine: immediate execution with operator precedence and one
// level per open bracket. Every value carries an expression node, so the
// equation line is printed from exactly what was computed.
(function (root) {
    'use strict';

    var PI = Math.PI,
        MAX_DEL = 50,
        MAX_DEL_CHARS = 60000, // total size of what DEL can take back
        MAX_NODES = 60, // a longer expression continues from its subtotal
        MAX_LEVELS = 30, // open brackets
        MAX_PASTE = 500, // characters of a pasted equation
        RANK = { '=': 0, '+': 1, '–': 1, '×': 2, '÷': 2, 'yx': 3, 'x√y': 3, 'EE': 3 },
        SYMBOL = { 'x2': '<sup>2</sup>', 'x3': '<sup>3</sup>', 'x!': '!', '%': '%' },
        NAME = {
            'sin-1': 'sin<sup>-1</sup>', 'cos-1': 'cos<sup>-1</sup>', 'tan-1': 'tan<sup>-1</sup>',
            'sinh-1': 'sinh<sup>-1</sup>', 'cosh-1': 'cosh<sup>-1</sup>', 'tanh-1': 'tanh<sup>-1</sup>',
            'log2': 'log<sub>2</sub>'
        },
        SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻', // superscript digits and minus, in plain text
        WORDS = { // function names in pasted text
            'sin': 'sin', 'cos': 'cos', 'tan': 'tan', 'sinh': 'sinh', 'cosh': 'cosh', 'tanh': 'tanh',
            'asin': 'sin-1', 'acos': 'cos-1', 'atan': 'tan-1', 'asinh': 'sinh-1', 'acosh': 'cosh-1', 'atanh': 'tanh-1',
            'arcsin': 'sin-1', 'arccos': 'cos-1', 'arctan': 'tan-1', 'arsinh': 'sinh-1', 'arcosh': 'cosh-1', 'artanh': 'tanh-1',
            'ln': 'ln', 'log': 'log', 'sqrt': '√', 'exp': 'ex'
        },
        OPS = { // operator characters in pasted text
            '+': '+', '-': '-', '−': '-', '–': '-', '—': '-', '*': '×', '×': '×', '·': '×', '⋅': '×',
            '/': '÷', '÷': '÷', '^': '^', '(': '(', ')': ')', '!': '!', '%': '%', '√': '√'
        },
        LANCZOS = [ // coefficients for the gamma function
            0.99999999999999709182, 57.156235665862923517, -59.597960355475491248, 14.136097974741747174,
            -0.49191381609762019978, 0.33994649984811888699e-4, 0.46523628927048575665e-4,
            -0.98374475304879564677e-4, 0.15808870322491248884e-3, -0.21026444172410488319e-3,
            0.21743961811521264320e-3, -0.16431810653676389022e-3, 0.84418223983852743293e-4,
            -0.26190838401581408670e-4, 0.36899182659531622704e-5
        ],
        ZERO = BigInt(0), ONE = BigInt(1), TEN = BigInt(10), // whole numbers of any size, for exact arithmetic
        BAD = {}, // thrown when pasted text is not an expression
        plainText = false, // printing for the clipboard: no tags
        UNARY = { // t: how the key is printed, f: how it is computed
            '1/x': { t: 'inv', f: function (x) { return arith('÷', 1, x); } },
            'x2': { t: 'post', f: function (x) { return tidy(arith('×', x, x)); } },
            'x3': { t: 'post', f: function (x) { return tidy(arith('×', arith('×', x, x), x)); } },
            'x!': { t: 'post', f: factorial },
            'ex': { t: 'pow', base: 'e', f: function (x) { return Math.exp(x); } },
            '2x': { t: 'pow', base: '2', f: function (x) { return Math.pow(2, x); } },
            '√': { t: 'fn', f: function (x) { return Math.sqrt(x); } },
            'log': { t: 'fn', f: function (x) { return Math.log10(x); } },
            'ln': { t: 'fn', f: function (x) { return Math.log(x); } },
            'log2': { t: 'fn', f: function (x) { return Math.log2(x); } },
            'sin': { t: 'fn', f: function (x, deg) { return trig(x, deg, sinDeg, Math.sin); } },
            'cos': { t: 'fn', f: function (x, deg) { return trig(x, deg, cosDeg, Math.cos); } },
            'tan': { t: 'fn', f: function (x, deg) { return trig(x, deg, tanDeg, Math.tan); } },
            'sin-1': { t: 'fn', f: function (x, deg) { return fromRad(Math.asin(x), deg); } },
            'cos-1': { t: 'fn', f: function (x, deg) { return fromRad(Math.acos(x), deg); } },
            'tan-1': { t: 'fn', f: function (x, deg) { return fromRad(Math.atan(x), deg); } },
            'sinh': { t: 'fn', f: function (x) { return Math.sinh(x); } },
            'cosh': { t: 'fn', f: function (x) { return Math.cosh(x); } },
            'tanh': { t: 'fn', f: function (x) { return Math.tanh(x); } },
            'sinh-1': { t: 'fn', f: function (x) { return Math.asinh(x); } },
            'cosh-1': { t: 'fn', f: function (x) { return Math.acosh(x); } },
            'tanh-1': { t: 'fn', f: function (x) { return Math.atanh(x); } }
        };

    // ---------- accuracy ---------- //

    // a result within rounding error of a short decimal is that decimal:
    // 1.2100000000000002 is 1.21, 30.000000000000004 is 30
    function tidy(x) {
        var c = +x.toPrecision(12);
        return Math.abs(c - x) <= Math.abs(x) * 4.5e-16 ? c : x;
    }

    // ---------- exact + – × ÷ ---------- //

    // The machine stores 0.1 only approximately, so its own arithmetic says
    // 0.1 + 0.2 – 0.3 is 5.55e-17. Here the four operations are worked out
    // exactly, on fractions of whole numbers, and rounded once at the end.

    // a number as a fraction [top, bottom]. A number of up to 15 digits is the
    // decimal it shows (0.1 is one tenth); a longer one, like 1 ÷ 3, is exactly
    // the value the machine holds, so those results stay as they always were
    function fraction(x) {
        var m = /^(-?)(\d+)\.?(\d*)(?:e([+-]\d+))?$/.exec(String(x)), e, n, view, hi;
        if ((m[2] + m[3]).replace(/^0+|0+$/g, '').length <= 15) {
            e = (+m[4] || 0) - m[3].length;
            n = BigInt(m[1] + m[2] + m[3]);
            return e < 0 ? [n, TEN ** BigInt(-e)] : [n * TEN ** BigInt(e), ONE];
        }
        view = new DataView(new ArrayBuffer(8)); // the 64 bits of the number
        view.setFloat64(0, x);
        hi = view.getUint32(0);
        e = (hi >>> 20) & 0x7ff;
        n = (BigInt(hi & 0xfffff) << BigInt(32)) | BigInt(view.getUint32(4));
        if (e) n |= ONE << BigInt(52); else e = 1;
        if (x < 0) n = -n;
        e -= 1075;
        return e < 0 ? [n, ONE << BigInt(-e)] : [n << BigInt(e), ONE];
    }

    // the number nearest to top ÷ bottom, a tie going to the even neighbour as
    // the machine does; null when it is too small or large to round here
    function nearest(n, d) {
        var neg = n < ZERO, lead, shift, q, x;
        if (n === ZERO) return 0;
        if (neg) n = -n;
        lead = n.toString(2).length - d.toString(2).length; // the result is about 2^lead
        if (lead < -1020 || lead > 1030) return null;
        shift = 64 - lead; // 64 or 65 bits of the result, more than a number keeps
        if (shift > 0) n <<= BigInt(shift); else d <<= BigInt(-shift);
        q = n / d;
        if (n % d) q |= ONE; // remembers that something was cut off
        x = Number(q); // rounds to the 53 bits a number keeps
        for (; shift > 1000; shift -= 1000) x *= Math.pow(2, -1000);
        x *= Math.pow(2, -shift);
        return neg ? -x : x;
    }

    function arith(op, a, b) {
        var x, y, n, d, r = null;
        if (isFinite(a) && isFinite(b) && (op !== '÷' || b)) {
            x = fraction(a);
            y = fraction(b);
            if (op === '×') {
                n = x[0] * y[0];
                d = x[1] * y[1];
            } else if (op === '÷') {
                n = x[0] * y[1];
                d = x[1] * y[0];
                if (d < ZERO) {
                    n = -n;
                    d = -d;
                }
            } else {
                n = x[0] * y[1] + (op === '+' ? y[0] : -y[0]) * x[1];
                d = x[1] * y[1];
            }
            r = nearest(n, d);
        }
        // out of range, or a division by zero: the machine's own answer
        return r !== null ? r : op === '+' ? a + b : op === '–' ? a - b : op === '×' ? a * b : a / b;
    }

    // sine, cosine and tangent of degrees. The angle is brought into 0..45
    // without rounding, so sin 180 is 0 and cos 60 is 0.5, not nearly so
    function sinDeg(x) {
        var sign = 1, r = x % 360;
        if (r < 0) {
            r = -r;
            sign = -1;
        }
        if (r > 180) {
            r = 360 - r;
            sign = -sign;
        }
        if (r > 90) r = 180 - r;
        if (r === 30) return sign * 0.5;
        return sign * (r > 45 ? Math.cos((90 - r) * PI / 180) : Math.sin(r * PI / 180)) || 0;
    }

    function cosDeg(x) {
        var sign = 1, r = Math.abs(x) % 360;
        if (r > 180) r = 360 - r;
        if (r > 90) {
            r = 180 - r;
            sign = -1;
        }
        if (r === 60) return sign * 0.5;
        return sign * (r > 45 ? Math.sin((90 - r) * PI / 180) : Math.cos(r * PI / 180)) || 0;
    }

    function tanDeg(x) {
        var sign = 1, r = x % 180;
        if (r < 0) {
            r = -r;
            sign = -1;
        }
        if (r > 90) {
            r = 180 - r;
            sign = -sign;
        }
        if (r === 90) return NaN; // no tangent at 90, 270, ...
        if (r === 45) return sign;
        return sign * (r > 45 ? 1 / Math.tan((90 - r) * PI / 180) : Math.tan(r * PI / 180)) || 0;
    }

    // radians that are a whole number of degrees within rounding (π ÷ 6, 2 × π)
    // are computed as those degrees, so they give the same exact results
    function trig(x, deg, inDegrees, inRadians) {
        var d = deg ? x : x * 180 / PI, n = Math.round(d);
        if (deg) return inDegrees(x);
        return Math.abs(d) <= 1e6 && Math.abs(d - n) <= 1e-15 * Math.max(1, Math.abs(d)) ? inDegrees(n) : inRadians(x);
    }

    function fromRad(x, deg) {
        return deg ? tidy(x * 180 / PI) : x;
    }

    // gamma function, Lanczos approximation (g = 607/128, 15 terms); checked
    // against exact values to about 15 digits over the whole factorial range
    function gamma(z) {
        var x, t, i, half;
        if (z < 0.5) return PI / (Math.sin(PI * z) * gamma(1 - z)); // reflection
        z -= 1;
        x = LANCZOS[0];
        for (i = 1; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i);
        t = z + 607 / 128 + 0.5;
        half = Math.pow(t, (z + 0.5) / 2); // in two steps, so large factorials do not overflow early
        return Math.sqrt(2 * PI) * half * Math.exp(-t) * half * x;
    }

    // whole numbers are multiplied out; anything else is gamma(n + 1)
    function factorial(n) {
        var res = 1;
        if (Math.floor(n) !== n) return gamma(n + 1);
        if (n < 0 || n > 170) return NaN;
        while (n > 1) res *= n--;
        return res;
    }

    // the n-th root of a; odd roots of negative numbers are real (³√-8 is -2)
    function nthRoot(a, n) {
        if (!n) return NaN;
        if (n < 0) return 1 / nthRoot(a, -n);
        if (a < 0) {
            if (n % 2 === 1) return -nthRoot(-a, n);
            return Number.isInteger(1 / n) ? tidy(Math.pow(a, 1 / n)) : NaN; // the 0.5th root is the square
        }
        return n === 2 ? Math.sqrt(a) : n === 3 ? Math.cbrt(a) : tidy(Math.pow(a, 1 / n));
    }

    // a × 10^b; a whole power only moves the decimal point, which is exact
    function timesTen(a, b) {
        var s = String(a);
        return Math.floor(b) === b && Math.abs(b) < 400 && s.indexOf('e') < 0 ? Number(s + 'e' + b) : a * Math.pow(10, b);
    }

    function binary(op, a, b) {
        switch (op) {
            case '+':
            case '–':
            case '×':
            case '÷': return arith(op, a, b);
            case 'yx': return tidy(Math.pow(a, b));
            case 'x√y': return nthRoot(a, b);
            case 'EE': return timesTen(a, b);
        }
    }

    function newLevel() {
        return { stack: [], rep: null }; // rep: last operator and operand, for repeating '='
    }

    // typed numbers keep their digits as entered, computed ones are shortened when printed
    function num(v, typed) {
        return { t: 'num', v: typed ? v.replace(/\.$/, '').replace(/^-0$/, '0') : String(+v), typed: !!typed };
    }

    function size(n) {
        return n ? 1 + size(n.arg) + size(n.l) + size(n.r) : 0;
    }

    // keeps a very long expression small: it is replaced by its value
    function bounded(node, val) {
        return isFinite(val) && size(node) > MAX_NODES ? num(val) : node;
    }

    function unaryNode(key, arg) {
        var u = UNARY[key];
        return u.t === 'fn' ? { t: 'fn', name: key, arg: arg } :
            u.t === 'post' ? { t: 'post', op: key, arg: arg } :
                u.t === 'inv' ? { t: 'inv', arg: arg } : { t: 'pow', base: u.base, arg: arg };
    }

    // feeds an operand and the next operator into a level's stack; everything of
    // the same or higher rank is computed, values and nodes together
    function reduce(st, key, val, node) {
        var top = st[st.length - 1], e;
        if (RANK[key] <= RANK[top.op]) {
            e = binary(top.op, top.val, val);
            top = st[st.length - 1] = {
                val: e,
                op: key,
                node: bounded({ t: 'bin', op: top.op, l: top.node, r: node }, e)
            };
        }
        if (RANK[key] > RANK[top.op]) {
            st.push({ val: val, op: key, node: node });
        } else if (st.length > 1 && RANK[key] <= RANK[st[st.length - 2].op]) {
            e = st.pop();
            return reduce(st, key, e.val, e.node);
        }
        return st[st.length - 1];
    }

    // ---------- printing ---------- //

    // computed numbers print with 13 significant digits, whole numbers in full
    function short(v) {
        var n = +v, a = Math.abs(n);
        if (!isFinite(n) || !a) return String(n);
        if (a >= 1e16 || a < 1e-6) { // exponent form, like the display
            return n.toPrecision(13).replace(/(\.\d*?)0+(e|$)/, '$1$2').replace(/\.(e|$)/, '$1');
        }
        return String(+n.toPrecision(Math.max(13, String(Math.floor(a)).length + 2)));
    }

    function text(n) {
        return n.typed ? n.v : short(n.v);
    }

    function isAtom(n) {
        return n.t === 'const' || n.t === 'fn' || n.t === 'group' || n.t === 'open' ||
            (n.t === 'num' && !/^-|e/.test(text(n)));
    }

    function wrap(n) {
        return isAtom(n) ? show(n) : '(' + show(n) + ')';
    }

    // for the clipboard, superscript characters stand in for the tags
    function tags(s) {
        return !plainText ? s : s.replace(/<sub>2<\/sub>/g, '₂').replace(/<sup>(-?\d+)<\/sup>/g, function (m, d) {
            return d.replace(/./g, function (c) { return SUPER.charAt('0123456789-'.indexOf(c)); });
        });
    }

    function radical(n) {
        var index = n.r ? show(n.r) : 'x';
        if (!plainText) return '<sup>' + index + '</sup>√' + wrap(n.l);
        if (!n.r) return 'ˣ√' + wrap(n.l);
        return /^-?\d+$/.test(index) ? tags('<sup>' + index + '</sup>') + '√' + wrap(n.l) :
            wrap(n.l) + '^(1/' + wrap(n.r) + ')';
    }

    function show(n) {
        var l, r;
        switch (n.t) {
            case 'num': return text(n);
            case 'const': return n.name;
            case 'neg': return '-' + (n.arg.t === 'post' ? show(n.arg) : wrap(n.arg));
            case 'fn': return tags(NAME[n.name] || n.name) + '(' + show(n.arg.t === 'group' ? n.arg.arg : n.arg) + ')';
            case 'post': return wrap(n.arg) + tags(SYMBOL[n.op]);
            case 'inv': return '1/' + wrap(n.arg);
            case 'pow': return n.base + '^' + wrap(n.arg);
            case 'group': return '(' + show(n.arg) + ')';
            case 'open': return '(' + (n.arg ? show(n.arg) : ''); // bracket still open
        }
        // binary; n.r is missing while the second operand is still awaited
        if (n.op === 'x√y') return radical(n);
        if (n.op === 'yx') return wrap(n.l) + '^' + (n.r ? wrap(n.r) : '');
        if (n.op === 'EE') return wrap(n.l) + 'E' + (n.r ? (n.r.t === 'num' ? text(n.r) : wrap(n.r)) : '');
        l = rank(n.l) < RANK[n.op] ? '(' + show(n.l) + ')' : show(n.l);
        if (!n.r) return l + ' ' + n.op;
        r = rank(n.r) <= RANK[n.op] ? '(' + show(n.r) + ')' : show(n.r);
        return l + ' ' + n.op + ' ' + r;
    }

    // how tightly a node holds together when it stands next to an operator;
    // 1/x reads as a division, so 8 ÷ (1/2) keeps its brackets
    function rank(n) {
        return n.t === 'bin' ? RANK[n.op] : n.t === 'inv' ? RANK['÷'] : 9;
    }

    // ---------- pasted text ---------- //

    // numbers written with separators: 1,234.5 and 1.234,5 are both 1234.5.
    // A lone comma is a decimal mark (1,5) unless it splits groups of three (1,234)
    function separators(s) {
        return s.replace(/\d[\d.,]*\d/g, function (n) {
            var c = n.lastIndexOf(','), d = n.lastIndexOf('.');
            if (c < 0) return /^[1-9]\d{0,2}(\.\d{3}){2,}$/.test(n) ? n.replace(/\./g, '') : n;
            if (d < 0) return /^[1-9]\d{0,2}(,\d{3})+$/.test(n) ? n.replace(/,/g, '') : n.replace(',', '.');
            return c > d ? n.replace(/\./g, '').replace(/,/g, '.') : n.replace(/,/g, '');
        });
    }

    function tokens(s) {
        var out = [], m, c, prev, word;
        while (s) {
            c = s.charAt(0);
            prev = out[out.length - 1];
            if ((m = /^\s+/.exec(s))) {
                // skipped
            } else if ((m = /^(\d+\.?\d*|\.\d+)/.exec(s))) {
                out.push({ t: 'num', v: m[0] });
            } else if (prev && (prev.t === 'num' || prev.v === ')') &&
                    (m = /^(E(?=\s*$|[+\-–−]?[\d.(a-zA-Z√∛π])|e(?=[+\-–−]?\d))/.exec(s))) {
                out.push({ t: 'op', v: 'EE' }); // 5E3, 1.5e-7, 2E(3!)
            } else if ((m = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/.exec(s))) {
                out.push({ t: 'sup', v: m[0].replace(/./g, function (ch) { return '0123456789-'.charAt(SUPER.indexOf(ch)); }) });
            } else if (c === 'ˣ') {
                out.push({ t: 'sup', v: 'x' }); // root still waiting for its index
                m = [c];
            } else if (c === '∛') {
                out.push({ t: 'sup', v: '3' }, { t: 'op', v: '√' });
                m = [c];
            } else if ((m = /^log(₂|2(?=\s*\()|10(?=\s*\())/i.exec(s))) {
                out.push({ t: 'fn', v: m[1] === '10' ? 'log' : 'log2' });
            } else if ((m = /^[a-zA-Z]+/.exec(s))) {
                word = m[0].toLowerCase();
                if (WORDS.hasOwnProperty(word)) out.push({ t: 'fn', v: WORDS[word] });
                else if (word === 'pi') out.push({ t: 'const', v: 'π' });
                else if (word === 'e') out.push({ t: 'const', v: 'e' });
                else if (word === 'x') out.push({ t: 'op', v: '×' });
                else return null;
            } else if (c === 'π') {
                out.push({ t: 'const', v: 'π' });
                m = [c];
            } else if ((m = /^\*\*/.exec(s))) {
                out.push({ t: 'op', v: '^' });
            } else if (OPS.hasOwnProperty(c)) {
                out.push({ t: 'op', v: OPS[c] });
                m = [c];
            } else {
                return null;
            }
            s = s.slice(m[0].length);
        }
        return out;
    }

    // false if the pasted text stops inside n
    function whole(n) {
        return !n ? false : n.t === 'group' ? !n.open : n.t === 'bin' ? whole(n.r) : n.arg ? whole(n.arg) : true;
    }

    // reads an expression in the usual notation; null if it is not one.
    // The text may stop early ("2 +", "2 × (3"), as a copied line can
    function parse(s) {
        var toks = tokens(s), i = 0, tree;

        function end() {
            return i >= toks.length;
        }

        function is(v, at) {
            var t = toks[at === undefined ? i : at];
            return !!t && t.t === 'op' && t.v === v;
        }

        function need(n) {
            if (!whole(n)) throw BAD;
            return n;
        }

        function signed(v) {
            return v.charAt(0) === '-' ? { t: 'neg', arg: { t: 'num', v: v.slice(1) } } : { t: 'num', v: v };
        }

        function inverse() { // sin⁻¹, sin^-1, sin^(-1)
            var open;
            if (!end() && toks[i].t === 'sup' && toks[i].v === '-1') {
                i++;
                return true;
            }
            open = is('(', i + 1) ? 1 : 0;
            if (is('^') && is('-', i + 1 + open) && toks[i + 2 + open] && toks[i + 2 + open].v === '1' &&
                (!open || is(')', i + 4))) {
                i += 3 + 2 * open;
                return true;
            }
            return false;
        }

        function primary() {
            var t = toks[i++], n, key;
            if (!t) throw BAD;
            if (t.t === 'num' || t.t === 'const') return t;
            if (t.t === 'op' && t.v === '(') {
                if (end()) return { t: 'group', arg: null, open: true };
                n = sum();
                if (is(')')) {
                    i++;
                    return { t: 'group', arg: n };
                }
                if (!end()) throw BAD;
                return { t: 'group', arg: n, open: true };
            }
            if (t.t === 'fn') {
                key = /^(sin|cos|tan)h?$/.test(t.v) && inverse() ? t.v + '-1' : t.v;
                n = is('(') ? primary() : postfix();
                if (n.open && whole(n.arg)) n.open = false; // "sin(30": closed like '=' would
                return { t: 'fn', key: key, arg: need(n) };
            }
            if (t.t === 'op' && t.v === '√') return { t: 'fn', key: '√', arg: need(postfix()) };
            if (t.t === 'sup' && is('√')) { // ³√8
                i++;
                n = need(postfix());
                return { t: 'bin', op: 'x√y', l: n, r: t.v === 'x' ? null : signed(t.v) };
            }
            throw BAD;
        }

        function postfix() {
            var n = primary(), t;
            for (; !end(); i++) {
                t = toks[i];
                if (t.t === 'op' && (t.v === '!' || t.v === '%')) {
                    n = { t: 'post', key: t.v === '!' ? 'x!' : '%', arg: need(n) };
                } else if (t.t === 'sup' && t.v !== 'x' && !is('√', i + 1)) {
                    n = t.v === '2' || t.v === '3' ? { t: 'post', key: 'x' + t.v, arg: need(n) } :
                        { t: 'bin', op: 'yx', l: need(n), r: signed(t.v) };
                } else {
                    break;
                }
            }
            return n;
        }

        function power() {
            var n = postfix(), op;
            if (!is('^') && !is('EE')) return n;
            op = toks[i++].v === '^' ? 'yx' : 'EE';
            if (op === 'yx' && n.t === 'const' && n.v === 'e') return { t: 'fn', key: 'ex', arg: need(unary()) };
            return { t: 'bin', op: op, l: need(n), r: end() ? null : unary() };
        }

        function unary() {
            if (is('-')) {
                i++;
                return { t: 'neg', arg: need(unary()) };
            }
            if (is('+')) i++;
            return power();
        }

        function product() {
            var n = unary(), op;
            for (;;) {
                if (is('×') || is('÷')) op = toks[i++].v;
                else if (!end() && (is('(') || is('√') || /^(fn|const|sup)$/.test(toks[i].t))) op = '×'; // 2π, 2(3 + 4)
                else return n;
                n = { t: 'bin', op: op, l: need(n), r: end() ? null : unary() };
            }
        }

        function sum() {
            var n = product(), op;
            while (is('+') || is('-')) {
                op = toks[i++].v === '+' ? '+' : '–';
                n = { t: 'bin', op: op, l: need(n), r: end() ? null : product() };
            }
            return n;
        }

        if (!toks || !toks.length) return null;
        try {
            tree = sum();
        } catch (err) {
            if (err !== BAD) throw err;
            return null;
        }
        return end() ? tree : null;
    }

    // ---------- engine ---------- //

    function Engine() {
        this.memory = 0;
        this.reset();
    }

    Engine.prototype.reset = function () {
        this.levels = [newLevel()]; // one per open bracket
        this.value = '0'; // what the display shows
        this.entry = 'fresh'; // fresh: waiting for an operand, typing: number being typed, result: computed value
        this.node = null; // expression of the value, null for a plain number
        this.done = null; // finished expression after '='
        this.error = false;
        this.failed = ''; // equation that produced the error
        this.history = []; // earlier states of the calculation in progress, for DEL
    };

    Engine.prototype.snapshot = function () {
        return JSON.stringify({
            levels: this.levels, value: this.value, entry: this.entry, node: this.node,
            done: this.done, error: this.error, failed: this.failed
        });
    };

    Engine.prototype.restore = function (snap) {
        var s = JSON.parse(snap);
        if (!s || !s.levels || !s.levels.length || typeof s.value !== 'string') {
            throw new Error('bad calculator state');
        }
        this.levels = s.levels;
        this.value = s.value;
        this.entry = s.entry;
        this.node = s.node;
        this.done = s.done;
        this.error = s.error;
        this.failed = s.failed;
    };

    Engine.prototype.save = function () {
        return { state: this.snapshot(), history: this.history.slice() };
    };

    Engine.prototype.load = function (data) {
        this.restore(data.state);
        this.history = [];
        (data.history || []).forEach(this.remember, this);
    };

    Engine.prototype.remember = function (snap) {
        var chars = snap.length, i;
        this.history.push(snap);
        for (i = this.history.length - 1; i > 0 && chars + this.history[i - 1].length <= MAX_DEL_CHARS; i--) {
            chars += this.history[i - 1].length;
        }
        this.history.splice(0, Math.max(chars > MAX_DEL_CHARS ? i + 1 : i, this.history.length - MAX_DEL));
    };

    // the equation line of a saved state, null if it cannot be read
    function lineOf(snap) {
        var e = Object.create(Engine.prototype);
        try {
            e.restore(snap);
        } catch (err) {
            return null;
        }
        return e.equation();
    }

    // true if the saved state has everything that waits in pre, plus an operand
    // on top: the same outer brackets and the same pending operations
    function continues(snap, pre) {
        var last = pre.levels.length - 1, s, d, mine, theirs;
        try {
            s = JSON.parse(snap);
        } catch (err) {
            return true; // unreadable: nothing DEL could return to
        }
        if (!s || !s.levels || s.levels.length <= last) return false;
        for (d = 0; d <= last; d++) {
            mine = pre.levels[d].stack;
            theirs = s.levels[d].stack || [];
            if (d < last ? theirs.length !== mine.length : theirs.length < mine.length) return false;
            if (JSON.stringify(theirs.slice(0, mine.length)) !== JSON.stringify(mine)) return false;
        }
        return true;
    }

    // true if the key starts a new operand in place of the displayed one
    function drops(key, entry, done) {
        if (/^[\d.]$/.test(key)) return entry === 'result';
        if (/^(π|e|Rand|mr|C|paste)$/.test(key)) return entry !== 'fresh';
        return key === '(' && !!done;
    }

    // records the state before an accepted key, so DEL can take the key back.
    // Only the calculation in progress is kept: a result or an error ends it,
    // and an operand that was replaced or cleared is forgotten for good
    Engine.prototype.track = function (snap, key) {
        var pre, dropped, line, i, st;
        if (this.done || this.error) {
            this.history = [];
            return;
        }
        pre = JSON.parse(snap);
        if (RANK[key] && pre.entry === 'fresh' && pre.levels[pre.levels.length - 1].stack.length) {
            return; // an operator typed again replaces the old one
        }
        dropped = drops(key, pre.entry, pre.done);
        if (dropped) {
            st = pre.levels[pre.levels.length - 1].stack;
            pre.value = st.length ? String(st[st.length - 1].val) : '0'; // as right after the operator
            pre.entry = 'fresh';
            pre.node = null;
        }
        pre.done = null;
        pre.error = false;
        pre.failed = '';
        snap = JSON.stringify(pre);
        if (dropped) { // forgets how the dropped operand was built
            line = lineOf(snap);
            for (i = this.history.length - 1; i >= 0 && lineOf(this.history[i]) !== line; i--);
            if (i >= 0) {
                this.history.length = i + 1;
                return;
            }
            // no earlier state looks like this one, as after 5 ( 2 ) where '(' also
            // multiplied: only the steps inside the operand go, the ones before stay
            while (this.history.length && continues(this.history[this.history.length - 1], pre)) {
                this.history.pop();
            }
        }
        this.remember(snap);
    };

    // takes back the last key of the calculation in progress: a digit, an
    // operator, a function or a bracket. Never returns to an earlier calculation
    Engine.prototype.del = function () {
        var line = this.equation(), snap, old;
        while (this.history.length) {
            snap = this.history.pop();
            old = lineOf(snap);
            if (old !== null && old !== line) { // skips states that look the same
                this.restore(snap);
                return true;
            }
        }
        if (this.entry !== 'typing') return false;
        this.value = this.value.slice(0, -1); // nothing remembered: still removes the last digit
        if (!/\d/.test(this.value)) {
            this.value = '0';
            this.entry = 'fresh';
        }
        return true;
    };

    // the displayed value as an operand
    Engine.prototype.operand = function () {
        return { val: +this.value, node: this.node || num(this.value, this.entry === 'typing') };
    };

    // the displayed value as the operand of a function or a higher operator.
    // A share like the 20 of 200 + 10% reads as 10% only right after + or –,
    // so anywhere else the line shows the number itself: 200 + 20 × 3 = 260
    Engine.prototype.part = function () {
        var arg = this.operand();
        if (arg.node.share) arg.node = num(this.value);
        return arg;
    };

    Engine.prototype.operator = function (key) {
        var lvl = this.levels[this.levels.length - 1], st = lvl.stack,
            arg = RANK[key] > 1 ? this.part() : this.operand();
        if (!st.length) { // first operand of this level
            lvl.rep = { op: key, val: null };
        } else if (this.entry === 'fresh') { // operator typed again: take the old one back
            arg = st.pop();
        }
        lvl.rep.op = key;
        if (st.length) {
            reduce(st, key, arg.val, arg.node);
        } else {
            st.push({ val: arg.val, op: key, node: arg.node });
        }
        this.value = String(st[st.length - 1].val);
        this.entry = 'fresh';
        this.node = null;
        this.done = null;
    };

    Engine.prototype.equals = function () {
        var lvl = this.levels[0], top, d;
        if (this.done && lvl.rep && lvl.rep.val !== null) { // repeating '='
            top = {
                val: binary(lvl.rep.op, +this.value, lvl.rep.val),
                node: { t: 'bin', op: lvl.rep.op, l: num(this.value), r: num(lvl.rep.val) }
            };
        } else {
            top = this.operand();
            for (d = this.levels.length - 1; d >= 0; d--) { // closes all open brackets
                lvl = this.levels[d];
                if (lvl.rep && lvl.rep.val === null) lvl.rep.val = top.val;
                if (lvl.stack.length) {
                    top = reduce(lvl.stack, '=', top.val, top.node);
                    lvl.stack = [];
                }
                if (d) top = { val: top.val, node: { t: 'group', arg: top.node } };
            }
            this.levels.length = 1;
        }
        this.value = String(top.val);
        this.entry = 'result';
        this.node = null;
        this.done = top.node;
    };

    // returns false if the key is not accepted in the current state
    Engine.prototype.apply = function (key, deg) {
        var lvl = this.levels[this.levels.length - 1], st = lvl.stack, cur, arg, top;

        this.error = false;
        this.failed = '';

        if (/^[\d.]$/.test(key)) {
            cur = this.entry === 'typing' ? this.value : '0';
            if (key === '.' ? cur.indexOf('.') > -1 : cur.replace(/\D/g, '').length >= 15) return false;
            this.value = (cur + key).replace(/^(-?)0(\d)$/, '$1$2');
            this.entry = 'typing';
            this.node = null;
            this.done = null;
        } else if (key === '+/–') {
            if (this.entry === 'fresh') { // starts a negative number
                this.value = '-0';
                this.entry = 'typing';
            } else if (this.entry === 'typing') {
                this.value = /^-/.test(this.value) ? this.value.substr(1) : '-' + this.value;
            } else {
                this.value = String(-this.value);
                cur = this.node;
                if (cur) this.node = cur.t === 'neg' ? cur.arg : { t: 'neg', arg: cur };
                if (cur && cur.share) this.node.share = true; // -(10%) is still a share
            }
            this.done = null;
        } else if (RANK[key]) {
            this.operator(key);
        } else if (key === '%') {
            arg = this.part();
            top = st[st.length - 1];
            cur = arith('÷', arg.val, 100);
            // after + or – it is a share of the number before: 200 + 10% adds 20.
            // Anywhere else it is a hundredth: 500 × 8% is 500 × 0.08
            this.value = String(top && RANK[top.op] === 1 ? arith('÷', arith('×', top.val, arg.val), 100) : cur);
            this.entry = 'result';
            this.node = bounded({ t: 'post', op: '%', arg: arg.node }, +this.value);
            if (this.node.t === 'post' && +this.value !== cur) this.node.share = true; // not a hundredth
            this.done = null;
        } else if (UNARY[key]) {
            arg = this.part();
            this.value = String(UNARY[key].f(arg.val, deg));
            this.entry = 'result';
            this.node = bounded(unaryNode(key, arg.node), +this.value);
            this.done = null;
        } else if (key === 'π' || key === 'e' || key === 'Rand' || key === 'mr') {
            this.value = String(key === 'π' ? PI : key === 'e' ? Math.E : key === 'Rand' ? Math.random() : this.memory);
            this.entry = 'result';
            this.node = null; // a constant shows its digits, like any computed number
            this.done = null;
        } else if (key === '(') {
            if (this.levels.length >= MAX_LEVELS) return false;
            if (!this.done && this.entry !== 'fresh') this.operator('×'); // 5 ( means 5 × (
            if (isFinite(+this.value)) {
                this.levels.push(newLevel());
                this.entry = 'fresh';
                this.node = null;
            }
            this.done = null;
        } else if (key === ')') {
            if (this.levels.length < 2 || (this.entry === 'fresh' && !st.length)) return false;
            arg = this.operand();
            top = st.length ? reduce(st, '=', arg.val, arg.node) : arg;
            this.levels.pop();
            this.value = String(top.val);
            this.entry = 'result';
            this.node = { t: 'group', arg: top.node };
        } else if (key === '=') {
            this.equals();
        } else if (key === 'C') { // clears the current number only
            this.value = '0';
            this.entry = 'fresh';
            this.node = null;
            this.done = null;
        } else {
            return false;
        }
        return true;
    };

    Engine.prototype.fail = function () {
        var line = this.equation();
        this.levels = [newLevel()];
        this.value = '0';
        this.entry = 'fresh';
        this.node = null;
        this.done = null;
        this.error = true;
        this.failed = line;
    };

    Engine.prototype.press = function (key, deg) {
        var snap;
        if (key === 'AC') {
            this.reset();
            return true;
        }
        if (/^m[c+-]$/.test(key)) { // memory keys leave the calculation alone
            this.memory = key === 'mc' ? 0 : arith(key === 'm+' ? '+' : '–', this.memory, +this.value);
            if (key !== 'mc' && this.entry === 'typing') { // the next digit starts a new number
                this.node = num(this.value, true);
                this.entry = 'result';
            }
            return true;
        }
        snap = this.snapshot();
        if (!this.apply(key, deg)) {
            this.restore(snap);
            return false;
        }
        if (!isFinite(+this.value)) this.fail();
        this.track(snap, key);
        return true;
    };

    // enters a parsed expression the way the keys would; false if a key is refused
    Engine.prototype.type = function (tree, deg) {
        var self = this, ok = true, halted = false, st = this.levels[this.levels.length - 1].stack, unit = null;

        // After a waiting power, root or EE the first pasted operand stays in
        // one piece, as the text reads: 2^ and 1E2 make 2^(1E2), not (2^1)E2
        if (st.length && RANK[st[st.length - 1].op] === 3) {
            for (unit = tree; unit.t === 'bin' && RANK[unit.op] < 3; unit = unit.l);
            if (unit.t !== 'bin') unit = null;
        }

        function key(k) {
            if (!ok || halted) return;
            ok = self.press(k, deg);
            halted = self.error; // an error ends the calculation
        }

        function bracketed(n) {
            key('(');
            go(n);
            if (whole(n)) key(')'); // left open where the text stops inside
        }

        function go(n) {
            var i;
            if (n === unit) {
                unit = null;
                return bracketed(n);
            }
            switch (n.t) {
                case 'num':
                    if (n.v.replace(/\D/g, '').length > 15) { // more digits than the keys take: entered whole
                        if (ok && !halted) ok = self.put(+n.v);
                    } else {
                        for (i = 0; i < n.v.length; i++) key(n.v.charAt(i));
                    }
                    break;
                case 'const':
                    key(n.v); // π or e
                    break;
                case 'group':
                    key('(');
                    if (n.arg) go(n.arg);
                    if (!n.open) key(')');
                    break;
                case 'neg':
                    if (n.arg.t === 'bin') bracketed(n.arg); else go(n.arg);
                    key('+/–');
                    break;
                case 'fn':
                case 'post': // the keys apply to the operand typed before them
                    if (n.arg.t === 'bin' || n.arg.t === 'neg') bracketed(n.arg); else go(n.arg);
                    key(n.key);
                    break;
                default: // binary; the engine sorts out the precedence itself
                    if (n.l.t === 'bin' && RANK[n.l.op] < RANK[n.op]) bracketed(n.l); else go(n.l);
                    key(n.op);
                    if (n.r && n.r.t === 'bin' && RANK[n.r.op] <= RANK[n.op]) bracketed(n.r); else if (n.r) go(n.r);
            }
        }

        go(tree);
        return ok;
    };

    // a number replaces the displayed one; an equation is entered in its place
    Engine.prototype.paste = function (str, deg) {
        var s = separators(String(str).trim()), n, tree, snap, hist, equals;
        if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) { // 1e2 and 1E2 alike
            n = parseFloat(s);
        } else {
            s = s.replace(/^=\s*/, '');
            equals = s.indexOf('=') > -1; // "2 + 3 =" and "2 + 3 = 5" are evaluated
            tree = s.length <= MAX_PASTE && parse(equals ? s.slice(0, s.indexOf('=')) : s);
            if (tree) {
                snap = this.snapshot();
                hist = this.history.slice();
                if (this.entry !== 'fresh') this.press('C');
                if (this.type(tree, deg)) {
                    if (equals && !this.error) this.press('=', deg);
                    return true;
                }
                this.restore(snap);
                this.history = hist;
                return false; // an equation is pasted whole or not at all
            }
            n = parseFloat(s); // not an equation: as before, a text that starts with a number
        }
        return this.put(n);
    };

    // puts a number in the display, in place of the one shown
    Engine.prototype.put = function (n) {
        var snap;
        if (!isFinite(n)) return false;
        snap = this.snapshot();
        this.error = false;
        this.failed = '';
        this.value = String(n);
        this.entry = 'result';
        this.node = null;
        this.done = null;
        this.track(snap, 'paste');
        return true;
    };

    // the expression being built, null when nothing was entered yet
    Engine.prototype.tree = function () {
        var node = this.node ||
                (this.entry === 'typing' ? { t: 'num', v: this.value, typed: true } :
                    this.entry === 'result' ? num(this.value) : null),
            st, d, i;
        for (d = this.levels.length - 1; d >= 0; d--) {
            st = this.levels[d].stack;
            for (i = st.length - 1; i >= 0; i--) {
                node = { t: 'bin', op: st[i].op, l: st[i].node, r: node };
            }
            if (d) node = { t: 'open', arg: node };
        }
        return node;
    };

    // true while there is only a number, no expression yet
    Engine.prototype.plain = function () {
        var node = this.tree();
        return !node || node.t === 'num';
    };

    // the equation, as text with <sup>/<sub> tags
    Engine.prototype.equation = function () {
        var node;
        if (this.error) return this.failed;
        if (this.done) return this.done.t === 'num' ? '' : show(this.done) + ' ='; // "9 =" says nothing
        node = this.tree();
        return node ? show(node) : '';
    };

    // the equation as plain text, for the clipboard
    Engine.prototype.text = function () {
        plainText = true;
        try {
            return this.equation().replace(/<[^>]+>/g, '');
        } finally {
            plainText = false;
        }
    };

    root.CalcEngine = Engine;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Engine;
    }
})(typeof window !== 'undefined' ? window : this);
