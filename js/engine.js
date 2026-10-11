// Calculator engine: immediate execution with operator precedence and one
// level per open bracket. Every value carries an expression node, so the
// equation line is printed from exactly what was computed.
(function (root) {
    'use strict';

    var PI = Math.PI,
        MAX_DEL = 50,
        MAX_DEL_CHARS = 70000, // total size of what DEL can take back
        MAX_NODES = 60, // a longer expression continues from its subtotal
        MAX_LEVELS = 30, // open brackets
        MAX_PASTE = 500, // characters of a pasted equation
        MAX_PAST = 50, // finished calculations kept in the history
        MAX_PAST_CHARS = 100000, // total size of the history
        MAX_EDIT = 300, // pieces of an equation being edited
        ANGLE = /^(sin|cos|tan)(-1)?$/, // functions whose result depends on Deg or Rad
        RANK = {
            '=': 0, '+': 1, '–': 1, '×': 2, '÷': 2, 'mod': 2,
            'nCr': 2.5, 'nPr': 2.5, 'gcd': 2.5, 'lcm': 2.5, 'yx': 3, 'x√y': 3, 'logy': 3, 'EE': 3
        },
        SYMBOL = { 'x2': '<sup>2</sup>', 'x3': '<sup>3</sup>', 'x!': '!', '%': '%' },
        NAME = {
            'sin-1': 'sin<sup>-1</sup>', 'cos-1': 'cos<sup>-1</sup>', 'tan-1': 'tan<sup>-1</sup>',
            'sinh-1': 'sinh<sup>-1</sup>', 'cosh-1': 'cosh<sup>-1</sup>', 'tanh-1': 'tanh<sup>-1</sup>',
            'log2': 'log<sub>2</sub>'
        },
        SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻', // superscript digits and minus, in plain text
        SUB = '₀₁₂₃₄₅₆₇₈₉', // subscript digits, for the base of a logarithm
        WORDS = { // function names in pasted text
            'sin': 'sin', 'cos': 'cos', 'tan': 'tan', 'sinh': 'sinh', 'cosh': 'cosh', 'tanh': 'tanh',
            'asin': 'sin-1', 'acos': 'cos-1', 'atan': 'tan-1', 'asinh': 'sinh-1', 'acosh': 'cosh-1', 'atanh': 'tanh-1',
            'arcsin': 'sin-1', 'arccos': 'cos-1', 'arctan': 'tan-1', 'arsinh': 'sinh-1', 'arcosh': 'cosh-1', 'artanh': 'tanh-1',
            'ln': 'ln', 'log': 'log', 'sqrt': '√', 'exp': 'ex', 'abs': 'abs'
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
        marks = null, // printing for editing: computed numbers are put here whole, a mark stands in for each
        stacking = false, // printing for fraction mode: a division is drawn as a fraction, one part over the other
        MARK = /^\uE000(\d+)\uE001/,
        // an angle in degrees, minutes and seconds: 12°30′15″, 12°30'15", 51°30′26″N
        DMS = /^(\d+\.?\d*|\.\d+)\s*°(?:\s*(\d+\.?\d*|\.\d+)\s*['′’](?!['′’]))?(?:\s*(\d+\.?\d*|\.\d+)\s*(?:["″”]|['′’]{2}))?(?:\s*([NSEW])(?![a-zA-Z]))?/,
        UNARY = { // t: how the key is printed, f: how it is computed
            '1/x': { t: 'inv', f: function (x) { return arith('÷', 1, x); } },
            'x2': { t: 'post', f: function (x) { return tidy(arith('×', x, x)); } },
            'x3': { t: 'post', f: function (x) { return tidy(arith('×', arith('×', x, x), x)); } },
            'x!': { t: 'post', f: factorial },
            'ex': { t: 'pow', base: 'e', f: function (x) { return Math.exp(x); } },
            '2x': { t: 'pow', base: '2', f: function (x) { return Math.pow(2, x); } },
            '10x': { t: 'pow', base: '10', f: function (x) { return timesTen(1, x); } },
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
            'tanh-1': { t: 'fn', f: function (x) { return Math.atanh(x); } },
            'abs': { t: 'fn', f: function (x) { return Math.abs(x); } }
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

    // the ways to take r of n things, in order (nPr) or not (nCr); whole
    // numbers 0 ≤ r ≤ n only. Worked out exactly, step by step: nCr stays a
    // whole number at every step. nCr ≥ 2^k with k = min(r, n − r), and
    // nPr ≥ r!, so a long loop is never needed to know a result is too large
    function choose(n, r, ordered) {
        var k, res = ONE, i;
        if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || r > n) return NaN;
        k = ordered ? r : Math.min(r, n - r);
        if (k > (ordered ? 170 : 1024)) return Infinity;
        for (i = 0; i < k; i++) {
            res *= BigInt(n) - BigInt(i);
            if (!ordered) res /= BigInt(i + 1);
        }
        return Number(res);
    }

    // what is left of a after taking away whole b's: the sign of b, as in
    // mathematics (-7 mod 3 is 2). Exact, on the fractions: 0.3 mod 0.1 is 0
    function mod(a, b) {
        var x, y, n, d, q, r;
        if (!b || !isFinite(a) || !isFinite(b)) return NaN;
        x = fraction(a);
        y = fraction(b);
        n = x[0] * y[1]; // a ÷ b = n ÷ d
        d = x[1] * y[0];
        if (d < ZERO) {
            n = -n;
            d = -d;
        }
        q = n / d; // cut toward 0, then down
        if (n % d !== ZERO && n < ZERO) q -= ONE;
        r = nearest(x[0] * y[1] - q * y[0] * x[1], x[1] * y[1]);
        return r === null ? NaN : r;
    }

    // the greatest common divisor and the least common multiple of two whole numbers
    function divisor(a, b) {
        var x, y, t;
        if (!Number.isInteger(a) || !Number.isInteger(b)) return NaN;
        x = BigInt(Math.abs(a));
        y = BigInt(Math.abs(b));
        while (y) {
            t = x % y;
            x = y;
            y = t;
        }
        return x;
    }

    function gcd(a, b) {
        var g = divisor(a, b);
        return typeof g === 'bigint' ? Number(g) : g;
    }

    function lcm(a, b) {
        var g = divisor(a, b);
        if (typeof g !== 'bigint') return g;
        return g ? Number(BigInt(Math.abs(a)) / g * BigInt(Math.abs(b))) : 0;
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

    // the logarithm of a to base b: 8 logy 2 = 3. A power of the base gives its
    // whole exponent, as 243 logy 3 = 5, not 4.999999999999999
    function logBase(a, b) {
        var r, n;
        if (!(a > 0) || !(b > 0) || b === 1) return NaN;
        r = b === 10 ? Math.log10(a) : b === 2 ? Math.log2(a) : Math.log(a) / Math.log(b);
        n = Math.round(r);
        return Math.abs(r - n) < 1e-9 && Math.pow(b, n) === a ? n : tidy(r);
    }

    function binary(op, a, b) {
        switch (op) {
            case '+':
            case '–':
            case '×':
            case '÷': return arith(op, a, b);
            case 'yx': return tidy(Math.pow(a, b));
            case 'x√y': return nthRoot(a, b);
            case 'logy': return logBase(a, b);
            case 'EE': return timesTen(a, b);
            case 'nCr': return choose(a, b, false);
            case 'nPr': return choose(a, b, true);
            case 'mod': return mod(a, b);
            case 'gcd': return gcd(a, b);
            case 'lcm': return lcm(a, b);
        }
    }

    // fn: the function a tan-first key opened this level for, worked out on it when it closes
    function newLevel(fn) {
        var lvl = { stack: [], rep: null }; // rep: last operator and operand, for repeating '='
        if (fn) lvl.fn = fn;
        return lvl;
    }

    // keys that go before their number when functions come first: tan 45 ), not 45 tan.
    // x², x!, 1/x and % stay after it, as on other calculators
    function opens(key) {
        return !!UNARY[key] && (UNARY[key].t === 'fn' || UNARY[key].t === 'pow');
    }

    // a function key worked out on an operand, its value and node; the functions of
    // an angle remember the unit, for the history. Of an error it is an error, as
    // when = closes tan(ln(0 and sin of degrees would make 0 of it
    function applied(key, arg, deg) {
        var val = isFinite(arg.val) ? UNARY[key].f(arg.val, deg) : NaN, node = bounded(unaryNode(key, arg.node), val);
        if (ANGLE.test(key) && node.t === 'fn') node.deg = deg ? 1 : 0; // short, as DEL keeps many copies
        return { val: val, node: node };
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
        if (n.typed) return n.v;
        if (!marks) return short(n.v);
        marks.push(String(+n.v)); // whole, so editing does not round it
        return '' + (marks.length - 1) + '';
    }

    function isAtom(n) {
        return n.t === 'const' || n.t === 'fn' || n.t === 'group' || n.t === 'open' ||
            (n.t === 'num' && !/^-|e/.test(n.typed ? n.v : short(n.v)));
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

    // a root drawn with a bar over what is under it, which needs no brackets
    // then. The √ and the brackets of the line as text stay in it, hidden, so a
    // copy and a click in the line count the same characters
    function rooted(inner, brackets) {
        return '<span class="calc-root"><span class="calc-hide">√' + (brackets ? '(' : '') + '</span>' + inner +
            (brackets ? '<span class="calc-hide">)</span>' : '') + '</span>';
    }

    function radical(n) {
        var index = n.r ? show(n.r) : 'x',
            root = n.l.t === 'fn' && n.l.name === '√' || n.l.op === 'x√y', // a root of a root: ⁸⁶√(√(99)), not ⁸⁶√√(99)
            under = root ? '(' + show(n.l) + ')' : wrap(n.l);
        if (!plainText) {
            return '<sup>' + index + '</sup>' + rooted(show(n.l.t === 'group' ? n.l.arg : n.l),
                root || n.l.t === 'group' || !isAtom(n.l));
        }
        if (!n.r) return 'ˣ√' + under;
        return /^-?\d+$/.test(index) ? tags('<sup>' + index + '</sup>') + '√' + under :
            wrap(n.l) + '^(1/' + wrap(n.r) + ')';
    }

    // a logarithm to any base, its base below: log₂(8). As text, a whole base is
    // written in subscript digits; any other, or one still awaited, goes after
    // the number as the key is pressed: 8 logᵧ 2.5, so the text reads back in
    function logarithm(n) {
        var arg = n.l.t === 'group' ? n.l.arg : n.l, base;
        if (!plainText) return 'log<sub>' + (n.r ? show(n.r) : 'y') + '</sub>(' + show(arg) + ')';
        base = n.r && n.r.t === 'num' && (n.r.typed || !marks) ? text(n.r) : '';
        if (/^\d+$/.test(base)) {
            return 'log' + base.replace(/\d/g, function (d) { return SUB.charAt(d); }) + '(' + show(arg) + ')';
        }
        return wrap(n.l) + ' logᵧ' + (n.r ? ' ' + wrap(n.r) : '');
    }

    // a division drawn as a fraction; the parts need no brackets of their own.
    // An empty bottom is the part still to be entered
    function stack(top, bottom) {
        return '<span class="calc-fr"><span>' + top + '</span>' +
            (bottom ? '<span>' + bottom + '</span>' : '<span class="calc-fr-empty"></span>') + '</span>';
    }

    // how a function opened before its number starts: tan(, √(, e^(
    function opener(key) {
        var u = UNARY[key];
        if (u.t === 'pow') return u.base + '^';
        if (key === '√') return plainText ? '√' : '<span class="calc-sq">√</span>'; // drawn, as in the edited line
        return tags(NAME[key] || key);
    }

    function show(n) {
        var l, r;
        if (stacking && n.t === 'inv') return stack('1', show(n.arg));
        if (stacking && n.t === 'bin' && n.op === '÷') return stack(show(n.l), n.r ? show(n.r) : '');
        switch (n.t) {
            case 'num': return text(n);
            case 'const': return n.name;
            case 'neg': return '-' + (n.arg.t === 'post' ? show(n.arg) : wrap(n.arg));
            case 'fn':
                if (n.name === '√' && !plainText) return rooted(show(n.arg.t === 'group' ? n.arg.arg : n.arg), true);
                return tags(NAME[n.name] || n.name) + '(' + show(n.arg.t === 'group' ? n.arg.arg : n.arg) + ')';
            case 'post': return wrap(n.arg) + tags(SYMBOL[n.op]);
            case 'inv': return '1/' + wrap(n.arg);
            case 'pow': return n.base + '^' + wrap(n.arg);
            case 'group': return '(' + show(n.arg) + ')';
            case 'open': return (n.fn ? opener(n.fn) : '') + '(' + (n.arg ? show(n.arg) : ''); // bracket still open
        }
        // binary; n.r is missing while the second operand is still awaited
        if (n.op === 'x√y') return radical(n);
        if (n.op === 'logy') return logarithm(n);
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
        if (stacking && (n.t === 'inv' || (n.t === 'bin' && n.op === '÷'))) return 9; // a drawn fraction holds together
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

    // true for a token an operator can follow: a number, π, a closing bracket, x², 5!
    function operand(t) {
        return !!t && (t.t === 'num' || t.t === 'const' || t.t === 'sup' || (t.t === 'op' && /^[)!%]$/.test(t.v)));
    }

    // the pieces of an expression in text. table: the numbers that marks
    // stand for, when the text was printed for editing
    function tokens(s, table) {
        var out = [], m, c, prev, word;
        while (s) {
            c = s.charAt(0);
            prev = out[out.length - 1];
            if ((m = /^\s+/.exec(s))) {
                // skipped
            } else if (table && (m = MARK.exec(s))) {
                out.push({ t: 'num', v: table[m[1]], whole: true });
            } else if ((m = DMS.exec(s))) { // in degrees: sin, cos and tan of it are worked out in Deg
                out.push({ t: 'num', v: String((/[SW]/.test(m[4]) ? -1 : 1) * (+m[1] + (m[2] || 0) / 60 + (m[3] || 0) / 3600)),
                    whole: true, angle: true });
            } else if ((m = /^(\d+\.?\d*|\.\d+)/.exec(s))) {
                out.push({ t: 'num', v: m[0] });
            } else if (prev && (prev.t === 'num' || prev.v === ')') &&
                    (m = /^(E(?=\s*$|[+\-–−]?[\d.(a-zA-Z√∛π])|e(?=[+\-–−]?\d))/.exec(s))) {
                out.push({ t: 'op', v: 'EE', c: 'E' }); // 5E3, 1.5e-7, 2E(3!)
            } else if ((m = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/.exec(s))) {
                out.push({ t: 'sup', v: m[0].replace(/./g, function (ch) { return '0123456789-'.charAt(SUPER.indexOf(ch)); }) });
            } else if (c === 'ˣ') {
                out.push({ t: 'sup', v: 'x' }); // root still waiting for its index
                m = [c];
            } else if (c === '∛') {
                out.push({ t: 'sup', v: '3' }, { t: 'op', v: '√' });
                m = [c];
            } else if ((m = /^log([₀₁₂₃₄₅₆₇₈₉]+|ᵧ)/.exec(s))) {
                if (m[1] === '₂') out.push({ t: 'fn', v: 'log2' });
                else if (m[1] !== 'ᵧ') out.push({ t: 'fn', v: 'logy', b: m[1].replace(/./g, function (d) { return SUB.indexOf(d); }) });
                else if (operand(prev)) out.push({ t: 'op', v: 'logy', c: 'logᵧ' }); // 8 logᵧ 2
                else out.push({ t: 'fn', v: 'logy', b: null }); // logᵧ(8), its base still awaited
            } else if ((m = /^log(₂|2(?=\s*\()|10(?=\s*\())/i.exec(s))) {
                out.push({ t: 'fn', v: m[1] === '10' ? 'log' : 'log2' });
            } else if ((m = /^[a-zA-Z]+/.exec(s))) {
                word = m[0].toLowerCase();
                if (WORDS.hasOwnProperty(word)) out.push({ t: 'fn', v: WORDS[word] });
                else if (word === 'pi') out.push({ t: 'const', v: 'π' });
                else if (word === 'e') out.push({ t: 'const', v: 'e' });
                else if (word === 'x') out.push({ t: 'op', v: '×', c: '×' });
                else if (word === 'ncr' || word === 'npr') out.push({ t: 'op', v: word === 'ncr' ? 'nCr' : 'nPr' });
                else if (word === 'mod' || word === 'gcd' || word === 'lcm') out.push({ t: 'op', v: word, c: word });
                else return null;
            } else if (c === 'π') {
                out.push({ t: 'const', v: 'π' });
                m = [c];
            } else if ((m = /^\*\*/.exec(s))) {
                out.push({ t: 'op', v: '^' });
            } else if (OPS.hasOwnProperty(c)) {
                out.push({ t: 'op', v: OPS[c], c: c }); // c: as written, so editing shows it the same
                m = [c];
            } else {
                return null;
            }
            s = s.slice(m[0].length);
        }
        return out;
    }

    // true if a number in n was written in degrees: 30°, 12°30′
    function angled(n) {
        return !!n && (!!n.angle || angled(n.arg) || angled(n.l) || angled(n.r));
    }

    // true for a text that is one angle in degrees, minutes and seconds alone: 12°30′15″, -12°30′
    function angleAlone(s) {
        var t = tokens(separators(String(s).trim()));
        return !!t && (t.length === 1 ? !!t[0].angle : t.length === 2 && t[0].v === '-' && !!t[1].angle);
    }

    // false if the pasted text stops inside n
    function whole(n) {
        return !n ? false : n.t === 'group' ? !n.open : n.t === 'bin' ? whole(n.r) : n.arg ? whole(n.arg) : true;
    }

    // reads an expression in the usual notation, as text or as its tokens;
    // null if it is not one. It may stop early ("2 +", "2 × (3"), as a copied line can
    function parse(s) {
        var toks = typeof s === 'string' ? tokens(s) : s, i = 0, tree;

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

        // the bracket of function f the text leaves open, "sin(30": closed as '=' would close
        // it, and f marked, so typing it again tan-first leaves it open
        function shut(n, f) {
            if (n.t === 'group' && n.open && whole(n.arg)) {
                n.open = false;
                f.open = true;
            }
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
            var t = toks[i++], n, f;
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
            if (t.t === 'fn' && t.v === 'logy') { // log₂(8): the number, then its base
                n = is('(') ? primary() : postfix();
                if (n.t === 'group') n = n.arg;
                return { t: 'bin', op: 'logy', l: need(n), r: t.b === null ? null : { t: 'num', v: t.b } };
            }
            if (t.t === 'fn') {
                f = { t: 'fn', key: /^(sin|cos|tan)h?$/.test(t.v) && inverse() ? t.v + '-1' : t.v };
                f.arg = need(shut(is('(') ? primary() : postfix(), f));
                if (/^(sin|cos|tan)$/.test(f.key) && angled(f.arg)) f.deg = 1; // sin(30°) is 0.5 in Rad as well
                return f;
            }
            if (t.t === 'op' && t.v === '√') {
                f = { t: 'fn', key: '√' };
                f.arg = need(shut(postfix(), f));
                return f;
            }
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
            var n = postfix(), op, r, f;
            if (is('logy')) { // 8 logᵧ 2, as the key is pressed
                i++;
                return { t: 'bin', op: 'logy', l: need(n), r: end() ? null : unary() };
            }
            if (!is('^') && !is('EE')) return n;
            op = toks[i++].v === '^' ? 'yx' : 'EE';
            if (op === 'yx' && n.t === 'const' && n.v === 'e') {
                f = { t: 'fn', key: 'ex' };
                f.arg = need(shut(unary(), f));
                return f;
            }
            r = end() ? null : unary();
            if (op === 'yx' && r && r.t === 'group' && r.arg && r.arg.t === 'bin' && r.arg.op === '÷' && r.arg.r &&
                r.arg.l.t === 'num' && +r.arg.l.v === 1) { // 8^(1/3) is the root, so ³√-8 stays -2
                return { t: 'bin', op: 'x√y', l: need(n), r: r.arg.r };
            }
            return { t: 'bin', op: op, l: need(n), r: r };
        }

        function unary() {
            if (is('-')) {
                i++;
                return { t: 'neg', arg: need(unary()) };
            }
            if (is('+')) i++;
            return power();
        }

        // nCr, nPr, gcd and lcm hold tighter than × and ÷, looser than powers
        function combo() {
            var n = unary(), op;
            while (is('nCr') || is('nPr') || is('gcd') || is('lcm')) {
                op = toks[i++].v;
                n = { t: 'bin', op: op, l: need(n), r: end() ? null : unary() };
            }
            return n;
        }

        function product() {
            var n = combo(), op;
            for (;;) {
                if (is('×') || is('÷') || is('mod')) op = toks[i++].v;
                else if (!end() && (is('(') || is('√') || /^(fn|const|sup)$/.test(toks[i].t))) op = '×'; // 2π, 2(3 + 4)
                else return n;
                n = { t: 'bin', op: op, l: need(n), r: end() ? null : combo() };
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

    // ---------- history ---------- //

    // the units the functions of an angle in the expression were worked out in
    function units(n, found) {
        found = found || {};
        if (n) {
            if (n.deg !== undefined) found[n.deg ? 'Deg' : 'Rad'] = true;
            units(n.arg, found);
            units(n.l, found);
            units(n.r, found);
        }
        return found;
    }

    // the text of what show prints, without tags: superscript characters stand in for them
    function asPlain(print) {
        plainText = true;
        try {
            return print().replace(/<[^>]+>/g, '');
        } finally {
            plainText = false;
        }
    }

    // an expression node in the shape parse gives, so type can enter it again
    function typable(n) {
        switch (n.t) {
            case 'num': return { t: 'num', v: n.v, whole: !n.typed }; // a computed number is not typed
            case 'const': return { t: 'const', v: n.name };
            case 'fn': return { t: 'fn', key: n.name, arg: typable(n.arg), deg: n.deg };
            case 'post': return { t: 'post', key: n.op, arg: typable(n.arg), share: n.share };
            case 'inv': return { t: 'fn', key: '1/x', arg: typable(n.arg) };
            case 'pow': return { t: 'fn', key: n.base === 'e' ? 'ex' : n.base + 'x', arg: typable(n.arg) };
            case 'neg': return { t: 'neg', arg: typable(n.arg) };
            case 'group': return { t: 'group', arg: typable(n.arg), open: !!n.auto }; // '=' closes it again
        }
        return { t: 'bin', op: n.op, l: typable(n.l), r: n.r && typable(n.r) };
    }

    // ---------- editing ---------- //

    // While the cursor is inside the equation, keys write at the cursor as
    // the equation reads: sin writes sin(, x² writes ². Each piece the cursor
    // steps over holds the tokens parse reads (p): a digit, an operator, a
    // function with its bracket, or a computed number, which stays whole

    // how a token is shown
    function look(t) {
        switch (t.t) {
            case 'num': return t.whole ? short(t.v) : t.v;
            case 'const': return t.v;
            case 'sup': return '<sup>' + t.v + '</sup>';
            case 'fn': return t.v === 'logy' ? 'log<sub>' + (t.b === null ? 'y' : t.b) + '</sub>' : NAME[t.v] || t.v;
        }
        if (t.v === 'EE') return 'E';
        if (t.v === 'logy') return ' log<sub>y</sub> ';
        if (t.v === '√') return '<span class="calc-sq">√</span>'; // drawn, as the √ of the font reads as a V
        if (t.v === '-') return t.c === '-' ? '-' : ' – '; // a sign, or a subtraction
        if (t.v === '÷' && t.c === '/') return '/';
        return /^(\+|×|÷|nCr|nPr|mod|gcd|lcm)$/.test(t.v) ? ' ' + t.v + ' ' : t.v;
    }

    function html(piece) {
        return piece.p.map(look).join('');
    }

    // the shown text of a piece: the superscripts as characters
    function untag(s) {
        return s.replace(/<sub>(\d+|y)<\/sub>/g, function (m, d) {
            return d === 'y' ? 'ᵧ' : d.replace(/./g, function (c) { return SUB.charAt(c); });
        }).replace(/<sup>(-?\d+|x)<\/sup>/g, function (m, d) {
            return d === 'x' ? 'ˣ' : d.replace(/./g, function (c) { return SUPER.charAt('0123456789-'.indexOf(c)); });
        }).replace(/<[^>]+>/g, '');
    }

    // tokens as pieces: digits one by one, a function with its bracket as one
    function pieces(toks) {
        var out = [], i = 0, t, p, next;
        while (i < toks.length) {
            t = toks[i++];
            if (t.t === 'num' && !t.whole) {
                t.v.split('').forEach(function (c) {
                    out.push({ p: [{ t: 'num', v: c, d: 1 }] });
                });
                continue;
            }
            p = [t];
            next = toks[i];
            if (t.t === 'fn' && /^(sin|cos|tan)h?$/.test(t.v) && next && next.t === 'sup' && next.v === '-1') {
                p = [{ t: 'fn', v: t.v + '-1' }];
                next = toks[++i];
            }
            if ((t.t === 'fn' || (t.t === 'op' && t.v === '√')) && next && next.t === 'op' && next.v === '(') {
                p.push(next);
                i++;
            }
            out.push({ p: p });
        }
        return out;
    }

    // the pieces of an expression node
    function piecesOf(node) {
        var table = [], s;
        marks = table;
        try {
            s = asPlain(function () { return show(node); });
        } finally {
            marks = null;
        }
        return pieces(tokens(s, table) || []);
    }

    // the tokens parse reads; digits next to each other are one number
    function unpiece(list) {
        var out = [];
        list.forEach(function (piece) {
            piece.p.forEach(function (t) {
                var last = out[out.length - 1];
                if (t.d && last && last.d) last.v += t.v;
                else out.push(t.d ? { t: 'num', v: t.v, d: 1 } : t);
            });
        });
        return out;
    }

    // the piece a key writes at the cursor; null for a key that writes nothing
    function written(key, e) {
        var p;
        function op(v, c) {
            return { t: 'op', v: v, c: c || v };
        }
        if (/^[\d.]$/.test(key)) p = [{ t: 'num', v: key, d: 1 }];
        else if (key === '–' || key === '+/–') p = [op('-', key === '–' ? '–' : '-')];
        else if (/^([+×÷()%]|EE|nCr|nPr|mod|gcd|lcm)$/.test(key)) p = [op(key)];
        else if (key === 'yx') p = [op('^')];
        else if (key === 'x!') p = [op('!')];
        else if (key === 'x2' || key === 'x3') p = [{ t: 'sup', v: key.charAt(1) }];
        else if (key === '1/x') p = [{ t: 'sup', v: '-1' }];
        else if (key === 'π' || key === 'e') p = [{ t: 'const', v: key }];
        else if (key === 'Ans' || key === 'mr' || key === 'Rand') {
            p = [{ t: 'num', v: String(key === 'Ans' ? e.ans : key === 'mr' ? e.memory : Math.random()), whole: true }];
        } else if (key === 'ex') p = [{ t: 'const', v: 'e' }, op('^'), op('(')];
        else if (key === '2x' || key === '10x') p = [{ t: 'num', v: key.slice(0, -1) }, op('^'), op('(')];
        else if (key === 'logy') p = [op('logy', 'logᵧ')];
        else if (key === 'x√y') p = [op('^'), op('('), { t: 'num', v: '1' }, op('÷', '/')]; // y^(1/x), read as the root
        else if (key === '√') p = [op('√'), op('(')];
        else if (UNARY[key]) p = [{ t: 'fn', v: key }, op('(')];
        else return null;
        return { p: p };
    }

    // ---------- number format ---------- //

    // a computed number in Fix, Sci or Eng notation with f.places digits after
    // the point, rounded as the number reads (1.005 is 1.01); null for the
    // usual notation, and 0 for zero in Sci and Eng. Fix shows numbers from 1e16 in Sci, as the usual one does
    function format(x, f) {
        var places = Math.max(0, Math.min(9, (f && f.places) | 0)), o, s;
        if (!f || !/^(fix|sci|eng)$/.test(f.notation) || !isFinite(x)) return null;
        if (x === 0 && f.notation !== 'fix') return '0'; // no 0.000e+0; Fix keeps its places: 0.00
        o = { useGrouping: false, minimumFractionDigits: places, maximumFractionDigits: places };
        if (f.notation !== 'fix' || Math.abs(x) >= 1e16) o.notation = f.notation === 'eng' ? 'engineering' : 'scientific';
        s = new Intl.NumberFormat('en-US', o).format(x);
        return s.replace(/^-(?=[0.]*(E|$))/, '').replace(/E(-?)/, function (m, sign) { // no -0.00; 1.5e+3 as before
            return 'e' + (sign || '+');
        });
    }

    // commas between the thousands of each number in a line: 1,234,567.891
    function group(s) {
        return s.replace(/(?<![\d.])\d{4,}/g, function (d) {
            return d.replace(/\B(?=(\d{3})+$)/g, ',');
        });
    }

    // a number in degrees, minutes and seconds, the seconds to two places:
    // 36.86989764584 is 36°52′11.63″, and 59.999″ is the next minute. Null for
    // a number too large to show so
    function dms(x) {
        var cs, m;
        if (!isFinite(x) || Math.abs(x) >= 1e9) return null;
        cs = Math.round(Math.abs(x) * 360000); // in hundredths of a second
        m = Math.floor(cs % 360000 / 6000);
        return (x < 0 && cs ? '-' : '') + Math.floor(cs / 360000) + '°' + m + '′' + cs % 6000 / 100 + '″';
    }

    // a number as a fraction [top, bottom] with at most 10 digits in all, found
    // from its continued fraction; null for a whole number or a number that
    // no such fraction is (π, √2). Within rounding error: 1 ÷ 3 is 1/3
    function shownFraction(x) {
        var a = Math.abs(x), y = a, h = 1, h0 = 0, k = 0, k0 = 1, f, t, i;
        if (!isFinite(x) || Math.floor(x) === x) return null;
        for (i = 0; i < 64; i++) {
            f = Math.floor(y);
            t = f * h + h0;
            h0 = h;
            h = t;
            t = f * k + k0;
            k0 = k;
            k = t;
            if (String(h).length + String(k).length > 10) return null;
            if (Math.abs(h / k - a) <= a * 1e-15) return k > 1 ? [x < 0 ? -h : h, k] : null;
            if (y === f) return null;
            y = 1 / (y - f);
        }
        return null;
    }

    // ---------- statistics ---------- //

    // the numbers of a list as typed or pasted, a column of a spreadsheet as
    // well: apart by spaces, new lines, tabs, commas or semicolons. In a list
    // with semicolons a comma is the decimal mark (1,5; 2,5).
    // bad: the parts that are no numbers
    function numbers(text) {
        var s = String(text), semi = s.indexOf(';') > -1, values = [], bad = [];
        s.split(semi ? /[\s;]+/ : /[\s,]+/).forEach(function (part) {
            var t = part.replace(/^[−–]/, '-');
            if (!t) return;
            if (semi) t = t.replace(',', '.');
            if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) && isFinite(+t)) values.push(+t);
            else bad.push(part);
        });
        return { values: values, bad: bad };
    }

    // n, the sum, the sum of the squares, the mean, the standard deviation of
    // the list as the whole population (σ) and as a sample of one (s, NaN for
    // a single number), min, median and max. The sums and the mean are worked
    // out exactly, as + – × ÷ are: the mean of 0.1, 0.2 and 0.3 is 0.2
    function stats(text) {
        var read = numbers(text), xs = read.values, n = xs.length, r = { n: n, bad: read.bad },
            sum = 0, squares = 0, spread = 0, sorted, mid;
        if (!n) return r;
        xs.forEach(function (x) {
            sum = arith('+', sum, x);
            squares = arith('+', squares, arith('×', x, x));
        });
        r.sum = sum;
        r.squares = squares;
        r.mean = arith('÷', sum, n);
        xs.forEach(function (x) {
            var d = arith('–', x, r.mean);
            spread = arith('+', spread, arith('×', d, d));
        });
        r.sdp = tidy(Math.sqrt(arith('÷', spread, n)));
        r.sds = n > 1 ? tidy(Math.sqrt(arith('÷', spread, n - 1))) : NaN;
        sorted = xs.slice().sort(function (a, b) { return a - b; });
        mid = n >> 1;
        r.min = sorted[0];
        r.max = sorted[n - 1];
        r.median = n % 2 ? sorted[mid] : arith('÷', arith('+', sorted[mid - 1], sorted[mid]), 2);
        return r;
    }

    // ---------- engine ---------- //

    function Engine() {
        this.memory = 0;
        this.ans = 0; // the last result, for the Ans key
        this.past = []; // finished calculations, oldest first: { node, value, frac: 1 if done in fraction mode, dms: 1 in °′″ }
        this.fraction = false; // fraction mode is on: set by the display, kept with each calculation in the history
        this.dms = false; // results are shown in degrees, minutes and seconds: the same
        this.fnFirst = false; // function keys go before their number, tan 45, not 45 tan: set by the display
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
        this.edit = null; // while the cursor is inside the equation: { list: pieces, at: cursor }
        this.failedEdit = null; // the pieces of the equation that failed, to edit it
    };

    Engine.prototype.snapshot = function () {
        return JSON.stringify({
            levels: this.levels, value: this.value, entry: this.entry, node: this.node,
            done: this.done, error: this.error, failed: this.failed, edit: this.edit, failedEdit: this.failedEdit
        });
    };

    Engine.prototype.restore = function (snap) {
        var s = JSON.parse(snap);
        if (!s || !Array.isArray(s.levels) || !s.levels.length || typeof s.value !== 'string' ||
            !s.levels.every(function (lvl) { return lvl && Array.isArray(lvl.stack) && (!lvl.fn || opens(lvl.fn)); })) {
            throw new Error('bad calculator state');
        }
        this.levels = s.levels;
        this.value = s.value;
        this.entry = s.entry;
        this.node = s.node;
        this.done = s.done;
        this.error = s.error;
        this.failed = s.failed;
        this.edit = s.edit && Array.isArray(s.edit.list) && s.edit.list.length ? s.edit : null;
        if (this.edit) this.edit.at = Math.max(0, Math.min(this.edit.list.length, this.edit.at | 0));
        this.failedEdit = Array.isArray(s.failedEdit) ? s.failedEdit : null;
    };

    Engine.prototype.save = function () {
        return { state: this.snapshot(), history: this.history.slice(), past: this.past.slice(), ans: this.ans };
    };

    Engine.prototype.load = function (data) {
        this.ans = isFinite(data.ans) ? +data.ans : 0;
        this.past = [];
        (Array.isArray(data.past) ? data.past : []).forEach(function (p) {
            if (!p || typeof p.value !== 'string' || !isFinite(+p.value)) return;
            try {
                show(p.node); // an unreadable equation is left out
                typable(p.node);
            } catch (err) {
                return;
            }
            this.past.push(p);
        }, this);
        this.trimPast();
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

    // keeps the newest calculations, within MAX_PAST and MAX_PAST_CHARS
    Engine.prototype.trimPast = function () {
        var chars = 0, i;
        for (i = this.past.length - 1; i >= 0 && (chars += JSON.stringify(this.past[i]).length) <= MAX_PAST_CHARS; i--);
        this.past.splice(0, Math.max(i + 1, this.past.length - MAX_PAST));
    };

    // after '=': the result becomes Ans, and the calculation goes into the history
    Engine.prototype.keep = function () {
        var last = this.past[this.past.length - 1], entry;
        this.ans = +this.value;
        if (this.done.t === 'num') return; // "9 =" is not worth keeping
        entry = { node: this.done, value: this.value };
        if (this.fraction) entry.frac = 1; // shown as it was: fractions, or decimals
        if (this.dms) entry.dms = 1; // or degrees, minutes and seconds
        if (last && JSON.stringify(last) === JSON.stringify(entry)) return; // the same one again
        this.past.push(entry);
        this.trimPast();
    };

    // a calculation in the history, for showing: the equation as text with
    // <sup>/<sub> tags (stacked: its divisions drawn as fractions), as plain
    // text, the result, and the units its angles were in ('Deg', 'Rad',
    // 'Deg Rad' or '')
    Engine.prototype.pastLine = function (i, stacked) {
        var p = this.past[i], line;
        stacking = !!stacked;
        try {
            line = show(p.node) + ' =';
        } finally {
            stacking = false;
        }
        return {
            line: line,
            text: asPlain(function () { return show(p.node); }) + ' =',
            result: short(p.value),
            unit: Object.keys(units(p.node)).sort().join(' ')
        };
    };

    // enters a calculation from the history again, without its '=', so it can
    // be changed or finished. It replaces the one in progress; false if it cannot.
    // Each function of an angle is worked out in the unit it was before
    Engine.prototype.recall = function (i, deg) {
        var p = this.past[i], snap = this.snapshot(), hist = this.history.slice();
        if (!p) return false;
        this.reset();
        if (this.type(typable(p.node), deg) && !this.error) return true;
        this.restore(snap);
        this.history = hist;
        return false;
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
        if (/^(π|e|Rand|mr|Ans|C|paste)$/.test(key)) return entry !== 'fresh';
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
        pre.failedEdit = null;
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
        var line = this.equation(), snap, old, e = this.edit;
        if (e) { // while editing: the piece before the cursor
            if (!e.at) return false;
            e.list.splice(--e.at, 1);
            if (!e.list.length) this.reset();
            return true;
        }
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

    Engine.prototype.equals = function (deg) {
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
                if (d && lvl.fn) {
                    top = applied(lvl.fn, top, deg);
                    if (!isFinite(top.val)) top.val = NaN; // an error, as the key itself would give
                } else if (d) {
                    top = { val: top.val, node: { t: 'group', arg: top.node, auto: 1 } }; // closed by '='
                }
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

        // a function waiting for its number, as after tan: – starts a negative number; the
        // keys that would take the number shown before the function wait for one of its own
        if (lvl.fn && this.entry === 'fresh' && !st.length) {
            if (key === '–') key = '+/–';
            else if (RANK[key] !== undefined || key === '%' || (UNARY[key] && !(this.fnFirst && opens(key)))) return false;
        }

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
        } else if (UNARY[key] && !(this.fnFirst && opens(key))) {
            top = applied(key, this.part(), deg);
            this.value = String(top.val);
            this.entry = 'result';
            this.node = top.node;
            this.done = null;
        } else if (key === 'π' || key === 'e' || key === 'Rand' || key === 'mr' || key === 'Ans') {
            this.value = String(key === 'π' ? PI : key === 'e' ? Math.E : key === 'Rand' ? Math.random() :
                key === 'mr' ? this.memory : this.ans);
            this.entry = 'result';
            this.node = null; // a constant shows its digits, like any computed number
            this.done = null;
        } else if (key === '(' || UNARY[key]) { // a bracket, or a function before its number: tan(
            if (this.levels.length >= MAX_LEVELS) return false;
            if (!this.done && this.entry !== 'fresh') this.operator('×'); // 5 ( means 5 × (, 5 tan 5 × tan(
            if (isFinite(+this.value)) {
                this.levels.push(newLevel(key === '(' ? null : key));
                this.entry = 'fresh';
                this.node = null;
            }
            this.done = null;
        } else if (key === ')') {
            if (this.levels.length < 2 || (this.entry === 'fresh' && !st.length)) return false;
            arg = this.operand();
            top = st.length ? reduce(st, '=', arg.val, arg.node) : arg;
            top = lvl.fn ? applied(lvl.fn, top, deg) : { val: top.val, node: { t: 'group', arg: top.node } };
            this.levels.pop();
            this.value = String(top.val);
            this.entry = 'result';
            this.node = top.node;
        } else if (key === '=') {
            this.equals(deg);
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
        var line = this.equation(), node = this.done || this.tree(),
            list = this.edit ? this.edit.list : node ? piecesOf(node) : [];
        this.edit = null;
        this.failedEdit = list; // so the cursor can go into it and fix it
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
        if (key === 'AC' || (this.edit && key === 'C')) {
            this.reset();
            return true;
        }
        if (this.edit) { // keys write at the cursor; '=' and the memory work out the equation first
            if (key === '=' || key === 'm+' || key === 'm-') {
                if (!this.commit(deg)) {
                    if (key !== '=') return false;
                    this.fail(); // it cannot be read, or worked out
                    return true;
                }
            } else if (key !== 'mc') {
                return this.insert(key);
            }
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
        else if (key === '=') this.keep();
        this.track(snap, this.fnFirst && opens(key) ? '(' : key); // tan( is taken back as a bracket is
        return true;
    };

    // enters a parsed expression the way the keys would; false if a key is refused.
    // A function goes after its operand, as it does without tan-first, so it is
    // worked out the same; only one whose bracket is still open goes first
    Engine.prototype.type = function (tree, deg) {
        var first = this.fnFirst;
        this.fnFirst = false;
        try {
            return this.typeIn(tree, deg, first);
        } finally {
            this.fnFirst = first;
        }
    };

    Engine.prototype.typeIn = function (tree, deg, first) {
        var self = this, ok = true, halted = false, st = this.levels[this.levels.length - 1].stack, unit = null;

        // After a waiting power, root or EE the first pasted operand stays in
        // one piece, as the text reads: 2^ and 1E2 make 2^(1E2), not (2^1)E2
        if (st.length && RANK[st[st.length - 1].op] === 3) {
            for (unit = tree; unit.t === 'bin' && RANK[unit.op] < 3; unit = unit.l);
            if (unit.t !== 'bin') unit = null;
        }

        function key(k, unit) { // unit: Deg (1) or Rad (0) for this key, if it has its own
            if (!ok || halted) return;
            ok = self.press(k, unit === undefined ? deg : !!unit);
            halted = self.error; // an error ends the calculation
        }

        // a bracket is left open where the text stops inside it, unless keys follow it
        function bracketed(n, tail) {
            var open = tail && !whole(n);
            key('(');
            go(n, open);
            if (!open) key(')');
        }

        // tail: no key is pressed after this part, so a function's open bracket can stay open
        function go(n, tail) {
            var i;
            if (n === unit) {
                unit = null;
                return bracketed(n, tail);
            }
            switch (n.t) {
                case 'num':
                    if (n.whole || n.v.replace(/\D/g, '').length > 15) { // not typed, or more digits than the keys take: entered whole
                        if (ok && !halted) ok = self.put(+n.v);
                    } else { // typed: the same digits again, and a typed sign
                        for (i = n.v.charAt(0) === '-' ? 1 : 0; i < n.v.length; i++) key(n.v.charAt(i));
                        if (n.v.charAt(0) === '-') key('+/–');
                    }
                    break;
                case 'const':
                    key(n.v); // π or e
                    break;
                case 'group':
                    key('(');
                    if (n.arg) go(n.arg, tail && n.open);
                    if (!(tail && n.open)) key(')');
                    break;
                case 'neg':
                    if (n.arg.t === 'bin') bracketed(n.arg, false); else go(n.arg, false);
                    key('+/–');
                    break;
                case 'fn':
                    if (first && n.open && tail) { // tan(45, as tan-first typing leaves it: open again
                        self.fnFirst = true;
                        key(n.key);
                        self.fnFirst = false;
                        go(n.arg.arg, true);
                        break;
                    }
                // falls through
                case 'post': // the keys apply to the operand typed before them
                    // a hundredth in a function typed first, as 2 + log(1%), keeps its brackets
                    // when the function goes after it, or the % would read as a share of the 2
                    if (n.arg.t === 'bin' || n.arg.t === 'neg' || (n.t === 'fn' && n.arg.t === 'post' && n.arg.key === '%' &&
                        !n.arg.share)) bracketed(n.arg, false); else go(n.arg, false);
                    key(n.key, n.deg);
                    break;
                default: // binary; the engine sorts out the precedence itself
                    if (n.l.t === 'bin' && RANK[n.l.op] < RANK[n.op]) bracketed(n.l, false); else go(n.l, false);
                    key(n.op);
                    if (n.r && n.r.t === 'bin' && RANK[n.r.op] <= RANK[n.op]) bracketed(n.r, tail); else if (n.r) go(n.r, tail);
            }
        }

        go(tree, true);
        return ok;
    };

    // a number replaces the displayed one; an equation is entered in its place.
    // whole: only a number or an equation, not the number a text starts with
    Engine.prototype.paste = function (str, deg, whole) {
        var s = separators(String(str).trim()), n, tree, snap, hist, equals, add, e = this.edit;
        if (e) { // while editing it goes in at the cursor
            s = s.replace(/^=\s*/, '').replace(/=[^]*$/, '');
            add = s.length <= MAX_PASTE && tokens(s);
            if (!add || !add.length) return false;
            add = pieces(add);
            if (e.list.length + add.length > MAX_EDIT) return false;
            e.list.splice.apply(e.list, [e.at, 0].concat(add));
            e.at += add.length;
            return true;
        }
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
            if (whole) return false;
            n = parseFloat(s); // not an equation: as before, a text that starts with a number
        }
        return this.put(n);
    };

    // puts a number in the display, in place of the one shown
    Engine.prototype.put = function (n) {
        var snap;
        if (!isFinite(n)) return false;
        if (this.edit) return this.insertPiece({ p: [{ t: 'num', v: String(n), whole: true }] });
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
            if (d) node = this.levels[d].fn ? { t: 'open', fn: this.levels[d].fn, arg: node } : { t: 'open', arg: node };
        }
        return node;
    };

    // true while there is only a number, no expression yet
    Engine.prototype.plain = function () {
        var node = this.tree();
        return !node || node.t === 'num';
    };

    // the equation, as text with <sup>/<sub> tags; stacked: each division
    // drawn as a fraction, for fraction mode
    Engine.prototype.equation = function (stacked) {
        var node;
        if (this.edit) return this.edit.list.map(html).join('');
        if (this.error) return this.failed;
        stacking = !!stacked;
        try {
            if (this.done) return this.done.t === 'num' ? '' : show(this.done) + ' ='; // "9 =" says nothing
            node = this.tree();
            return node ? show(node) : '';
        } finally {
            stacking = false;
        }
    };

    Engine.stack = stack;

    // the equation as plain text, for the clipboard
    Engine.prototype.text = function () {
        return this.edit ? untag(this.equation()) : asPlain(this.equation.bind(this));
    };

    // ---------- the cursor ---------- //

    // puts the cursor at the end of what the display shows: the equation being
    // entered, the finished one after '=', or the one that failed. False if
    // there is nothing to change, as with a result alone
    Engine.prototype.startEdit = function () {
        var node, list;
        if (this.edit) return true;
        if (this.error) list = (this.failedEdit || []).slice();
        else list = (node = this.done || this.tree()) ? piecesOf(node) : [];
        if (!list.length || (list.length === 1 && list[0].p[0].whole)) return false;
        this.edit = { list: list, at: list.length };
        return true;
    };

    // enters the edited equation the way the keys would, in place of the
    // calculation; false, and still editing, if it cannot be read or worked out
    Engine.prototype.commit = function (deg) {
        var tree = parse(unpiece(this.edit.list)), snap = this.snapshot(), hist = this.history.slice();
        if (!tree) return false;
        this.reset();
        if (this.type(tree, deg) && !this.error) return true;
        this.restore(snap);
        this.history = hist;
        return false;
    };

    // moves the cursor. At the end the equation is worked out again and the
    // keys work as they always do; if it cannot be yet, the cursor stays
    Engine.prototype.cursor = function (at, deg) {
        var e = this.edit;
        if (!e) return false;
        e.at = Math.max(0, Math.min(e.list.length, at));
        if (e.at === e.list.length) this.commit(deg);
        return true;
    };

    // the arrow keys: 'left', 'right', 'home' or 'end'. After '=' or an error,
    // ◀ enters the equation again and ▶ puts the cursor at its start
    Engine.prototype.move = function (how, deg) {
        var e = this.edit, finished = !!(this.done || this.error);
        if (!e) {
            if (!finished && (how === 'right' || how === 'end')) return false; // the cursor is at the end already
            if (!this.startEdit()) return false;
            e = this.edit;
            if (how === 'home' || how === 'right') e.at = 0;
            else if (finished) this.commit(deg);
            else e.at--;
            return true;
        }
        return this.cursor(how === 'home' ? 0 : how === 'end' ? e.list.length : e.at + (how === 'left' ? -1 : 1), deg);
    };

    // a click in the shown equation, chars characters from its start: the
    // cursor goes to the nearest place between two pieces
    Engine.prototype.point = function (chars, deg) {
        var was = !!this.edit, e, i, sum = 0, best = 0, gap = Infinity;
        if (!this.startEdit()) return false;
        e = this.edit;
        for (i = 0; i <= e.list.length; i++) {
            if (Math.abs(sum - chars) < gap) {
                gap = Math.abs(sum - chars);
                best = i;
            }
            if (i < e.list.length) sum += untag(html(e.list[i])).length;
        }
        if (!was && best === e.list.length && !this.done && !this.error) {
            this.edit = null; // the end of the equation being entered: where it was
            return false;
        }
        return this.cursor(best, deg);
    };

    Engine.prototype.insert = function (key) {
        var piece = written(key, this);
        return !!piece && this.insertPiece(piece);
    };

    Engine.prototype.insertPiece = function (piece) {
        var e = this.edit;
        if (e.list.length >= MAX_EDIT) return false;
        e.list.splice(e.at++, 0, piece);
        return true;
    };

    // the equation while editing: the HTML of each piece, and the cursor
    // (before the piece at that index)
    Engine.prototype.editView = function () {
        return { parts: this.edit.list.map(html), at: this.edit.at };
    };

    Engine.stats = stats;
    Engine.format = format;
    Engine.group = group;
    Engine.fraction = shownFraction;
    Engine.dms = dms;
    Engine.angleAlone = angleAlone;

    root.CalcEngine = Engine;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Engine;
    }
})(typeof window !== 'undefined' ? window : this);
