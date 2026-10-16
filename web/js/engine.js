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
        KEY_MAX = 25, // roots, highs and lows of a curve, or crossings of two, marked on a graph; more cannot be told apart
        ANGLE = /^(sin|cos|tan)(-1)?$/, // functions whose result depends on Deg or Rad
        LETTERS = 'ABCDEFGHIJ', // the letters a value is stored in, as A to J of a TI or a Casio
        VAR = /^[A-J]$/,
        VARKEY = /^#[A-J]$/, // the key of a letter: #C puts in C, as the key C clears
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
            'ln': 'ln', 'log': 'log', 'sqrt': '√', 'exp': 'ex', 'abs': 'abs',
            'round': 'round', 'floor': 'floor', 'ceil': 'ceil', 'ceiling': 'ceil', 'trunc': 'trunc'
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
        // the names a graph's text is read with, the longest first, so sinhx is sinh x and exp is not e × …
        NAMES = new RegExp('^(' + Object.keys(WORDS).concat(['pi', 'e', 'x', 'ncr', 'npr', 'mod', 'gcd', 'lcm']).sort(function (a, b) {
            return b.length - a.length;
        }).join('|') + ')', 'i'),
        ZERO = BigInt(0), ONE = BigInt(1), TEN = BigInt(10), // whole numbers of any size, for exact arithmetic
        BAD = {}, // thrown when pasted text is not an expression
        stored = {}, // the value of each letter, A to J: one set for the calculator, the graph and the solver
        marks = null, // printing for editing: computed numbers are put here whole, a mark stands in for each
        MARK = /^\uE000(\d+)\uE001/,
        HEAD = /^(y|[a-df-wz]\s*\(\s*x\s*\))\s*=\s*/i, // before a function of x: y =, f(x) =
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
            'abs': { t: 'fn', f: function (x) { return Math.abs(x); } },
            // to a whole number: the nearest, half away from 0 as on paper; the one below, above, or toward 0.
            // Of the number as it reads, so floor(0.7 ÷ 0.1) is 7 however the machine keeps it
            'round': { t: 'fn', f: function (x) { return x < 0 ? 0 - Math.round(-tidy(x)) : Math.round(tidy(x)) + 0; } },
            'floor': { t: 'fn', f: function (x) { return Math.floor(tidy(x)) + 0; } },
            'ceil': { t: 'fn', f: function (x) { return Math.ceil(tidy(x)) + 0; } },
            'trunc': { t: 'fn', f: function (x) { return Math.trunc(tidy(x)) + 0; } }
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

    // The unit of an angle, deg: Rad (0 or false), Deg (1 or true) or Grad (2),
    // 400 to a full turn. Gradians are worked out as degrees, so sin 100 is 1.
    // Radians that are a whole number of degrees within rounding (π ÷ 6, 2 × π)
    // are computed as those degrees, so they give the same exact results
    function trig(x, deg, inDegrees, inRadians) {
        var d = deg ? x : x * 180 / PI, n = Math.round(d);
        if (deg === 2) return inDegrees(x % 400 * 9 / 10);
        if (deg) return inDegrees(x);
        return Math.abs(d) <= 1e6 && Math.abs(d - n) <= 1e-15 * Math.max(1, Math.abs(d)) ? inDegrees(n) : inRadians(x);
    }

    function fromRad(x, deg) {
        return deg === 2 ? tidy(x * 200 / PI) : deg ? tidy(x * 180 / PI) : x;
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

    // 1/x, x², x³ and x! with no number of their own yet go first as well: 1/x 4 is 1/(4,
    // x² 4 is 4², rather than work on the 0 shown
    function leads(key, entry) {
        return opens(key) || (/^(1\/x|x[23!]|%)$/.test(key) && entry === 'fresh');
    }

    // a percent of an operand. After + or – it is a share of the number before, top:
    // 200 + 10% adds 20. Anywhere else it is a hundredth: 500 × 8% is 500 × 0.08
    function percent(arg, top) {
        var cur = arith('÷', arg.val, 100),
            val = top && RANK[top.op] === 1 ? arith('÷', arith('×', top.val, arg.val), 100) : cur,
            node = bounded({ t: 'post', op: '%', arg: arg.node }, val);
        if (node.t === 'post' && val !== cur) node.share = true; // not a hundredth
        return { val: val, node: node };
    }

    // a function that went before its number worked out as its bracket closes; outer is the
    // stack the bracket is in, for a % that is a share of the number before it
    function closed(lvl, arg, deg, outer) {
        return lvl.fn === '%' ? percent(arg, outer[outer.length - 1]) : applied(lvl.fn, arg, deg);
    }

    // a function key worked out on an operand, its value and node; the functions of
    // an angle remember the unit, for the history. Of an error it is an error, as
    // when = closes tan(ln(0 and sin of degrees would make 0 of it
    function applied(key, arg, deg) {
        var val = isFinite(arg.val) ? UNARY[key].f(arg.val, deg) : NaN, node = bounded(unaryNode(key, arg.node), val);
        if (ANGLE.test(key) && node.t === 'fn') node.deg = deg === 2 ? 2 : deg ? 1 : 0; // short, as DEL keeps many copies
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

    // superscript characters stand in for the tags: the line is printed as text
    function tags(s) {
        return s.replace(/<sub>2<\/sub>/g, '₂').replace(/<sup>(-?\d+)<\/sup>/g, function (m, d) {
            return d.replace(/./g, function (c) { return SUPER.charAt('0123456789-'.indexOf(c)); });
        });
    }

    function radical(n) {
        var index = n.r ? show(n.r) : 'x',
            root = n.l.t === 'fn' && n.l.name === '√' || n.l.op === 'x√y', // a root of a root: ⁸⁶√(√(99)), not ⁸⁶√√(99)
            under = root ? '(' + show(n.l) + ')' : wrap(n.l);
        if (!n.r) return 'ˣ√' + under;
        return /^-?\d+$/.test(index) ? tags('<sup>' + index + '</sup>') + '√' + under :
            wrap(n.l) + '^(1/' + (n.r.t === 'group' ? show(n.r) : wrap(n.r)) + ')';
    }

    // a logarithm to any base, its base below: log₂(8). As text, a whole base is
    // written in subscript digits; any other, or one still awaited, goes after
    // the number as the key is pressed: 8 logᵧ 2.5, so the text reads back in
    function logarithm(n) {
        var arg = n.l.t === 'group' ? n.l.arg : n.l, base;
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
        if (key === '1/x') return '1/';
        return tags(NAME[key] || key);
    }

    // a calculation as text, as it would be typed or pasted: tan(45), ³√8, 2^10, log₂(8). The
    // editor reads it as its tree and draws it; the clipboard takes it as it is
    function show(n) {
        var l, r;
        switch (n.t) {
            case 'num': return text(n);
            case 'const': return n.name;
            case 'neg': return '-' + (n.arg.t === 'post' ? show(n.arg) : wrap(n.arg));
            case 'fn':
                return tags(NAME[n.name] || n.name) + '(' + show(n.arg.t === 'group' ? n.arg.arg : n.arg) + ')';
            case 'post': return wrap(n.arg) + tags(SYMBOL[n.op]);
            case 'inv': return '1/' + wrap(n.arg);
            case 'pow': return n.base + '^' + wrap(n.arg);
            case 'group': return '(' + show(n.arg) + ')';
            case 'open': // bracket still open
                if (n.fn && (n.fn === '%' || UNARY[n.fn].t === 'post')) { // (4 + 1)², or ( while empty
                    return '(' + (n.arg ? show(n.arg) + ')' + tags(SYMBOL[n.fn]) : '');
                }
                return (n.fn ? opener(n.fn) : '') + '(' + (n.arg ? show(n.arg) : '');
        }
        // binary; n.r is missing while the second operand is still awaited
        if (n.op === 'x√y') return radical(n);
        if (n.op === 'logy') return logarithm(n);
        if (n.op === 'yx') return wrap(n.l) + '^' + (n.r ? wrap(n.r) : '');
        if (n.op === 'EE') return wrap(n.l) + 'ᴇ' + (n.r ? (n.r.t === 'num' ? text(n.r) : wrap(n.r)) : '');
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

    // numbers written with separators: 1,234.5, 1.234,5 and 1 234,5 are all 1234.5.
    // A lone comma is a decimal mark (1,5) unless it splits groups of three (1,234);
    // a space, a thin or a no-break one as well, only splits groups of three (1 234, not 5 3).
    // comma: the decimal mark in use is a comma, so 1.234 is 1234 and 1,234 is 1.234
    function separators(s, comma) {
        s = s.replace(/(^|[^\d.,])([1-9]\d{0,2}(?:[ \u00A0\u2009\u202F]\d{3})+)(?!\d)/g, function (all, before, n) {
            return before + n.replace(/\D/g, '');
        });
        return s.replace(/\d[\d.,]*\d/g, function (n) {
            var c = n.lastIndexOf(','), d = n.lastIndexOf('.');
            if (c < 0) return (comma ? /^[1-9]\d{0,2}(\.\d{3})+$/ : /^[1-9]\d{0,2}(\.\d{3}){2,}$/).test(n) ? n.replace(/\./g, '') : n;
            if (d < 0) return (comma ? /^[1-9]\d{0,2}(,\d{3}){2,}$/ : /^[1-9]\d{0,2}(,\d{3})+$/).test(n) ? n.replace(/,/g, '') : n.replace(',', '.');
            return c > d ? n.replace(/\./g, '').replace(/,/g, '.') : n.replace(/,/g, '');
        });
    }

    // money is read as its number: $1,200, 45.99 €, US$ 5 and 5 USD. A currency is its
    // sign, with the capitals before it, or three capitals that name no function
    function money(s) {
        return s.replace(/[A-Z]{0,3}\p{Sc}/gu, ' ').replace(/(^|[^a-zA-Z])([A-Z]{3})(?![a-zA-Z])/g, function (all, before, code) {
            return WORDS.hasOwnProperty(code.toLowerCase()) || /^(MOD|GCD|LCM|NCR|NPR)$/.test(code) ? all : before + ' ';
        });
    }

    // true for a token an operator can follow: a number, π, a closing bracket, x², 5!
    function operand(t) {
        return !!t && (t.t === 'num' || t.t === 'const' || t.t === 'sup' || (t.t === 'op' && /^[)!%]$/.test(t.v)));
    }

    // A letter of A to J at the start of the text, the value stored in it; null where its letters
    // are a word: ABS, Cos, Exp, or a word of no letters stored, Ans. In a graph a letter is one at a
    // time, AX is A × x; one that names a function of another box is that function: F(2), as f(2).
    // E is one too: 2E is 2 × E, and only 2E3 is 2 × 10³
    function letterAt(s, variable, defs) {
        var word = /^[a-zA-Z]+/.exec(s), name;
        if (!word || !VAR.test(s.charAt(0))) return null;
        if (variable) {
            name = NAMES.exec(s);
            if (name && name[0].length > 1) return null;
            if (defs && /^.\s*['′’″]*\s*\(/.test(s) && defs.hasOwnProperty(s.charAt(0).toLowerCase())) return null;
        } else if (!/^[A-J]+$/.test(word[0]) || (word[0].length > 1 && (name = NAMES.exec(word[0])) && name[0].length === word[0].length)) {
            return null; // GCD is gcd, not G × C × D
        }
        return [s.charAt(0)];
    }

    // the letters A to J a text of a box uses, as the box reads it, in the order they come: Ax^2 + B
    // is A, B; Abs and Ans are words. Each side of an equation, and each part between braces, on its own
    function lettersOf(text) {
        var out = [];
        String(text).split(/[=<>≤≥,;:{}\[\]|]/).forEach(function (part) {
            (tokens(part.trim(), null, 1) || []).forEach(function (t) {
                if (t.t === 'const' && VAR.test(t.v) && out.indexOf(t.v) < 0) out.push(t.v);
            });
        });
        return out;
    }

    // the pieces of an expression in text. table: the numbers that marks
    // stand for, when the text was printed for editing. variable: x is the
    // variable of a graph, not ×, and letters may run together: 2xsinx; any
    // other letter but e and y is a number of its own, set by a slider: a in ax² + b. defs: the
    // functions of other boxes by their names, f of f(x) = x^2: f(2x) and its slope f′(x) are of
    // it, and a name whose function is not made yet (null) makes the text none for now
    function tokens(s, table, variable, defs) {
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
                    (m = /^(ᴇ(?=\s*$|[+\-–−]?[\d.(a-zA-Z√∛π])|E(?=[+\-–−]?[\d.])|e(?=[+\-–−]?\d))/.exec(s))) {
                out.push({ t: 'op', v: 'EE', c: 'ᴇ' }); // 5E3, 1.5e-7, 2ᴇ(3!); 2E alone is 2 × E
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
            } else if ((m = letterAt(s, variable, defs))) { // A to J, each its stored value: 2A, AB is A × B
                out.push({ t: 'const', v: m[0] });
            } else if ((m = (variable ? NAMES : /^[a-zA-Z]+/).exec(s))) {
                word = m[0].toLowerCase();
                if (WORDS.hasOwnProperty(word)) out.push({ t: 'fn', v: WORDS[word] });
                else if (word === 'pi') out.push({ t: 'const', v: 'π' });
                else if (word === 'e') out.push({ t: 'const', v: 'e' });
                else if (word === 'x') out.push(variable ? { t: 'const', v: 'x' } : { t: 'op', v: '×', c: '×' });
                else if (word === 'ncr' || word === 'npr') out.push({ t: 'op', v: word === 'ncr' ? 'nCr' : 'nPr' });
                else if (word === 'mod' || word === 'gcd' || word === 'lcm') out.push({ t: 'op', v: word, c: word });
                else return null;
            } else if (variable && defs && (m = /^([a-df-wzA-DF-WZ])\s*(['′’″]*)\s*(?=\()/.exec(s)) &&
                    defs.hasOwnProperty(m[1].toLowerCase())) {
                word = defs[m[1].toLowerCase()];
                if (!word) return null;
                out.push({ t: 'fn', v: 'call', of: derived(word, m[2].replace(/″/g, "''").length) });
            } else if (variable === 2 && (m = /^[yY]/.exec(s))) { // the other variable, of an equation
                out.push({ t: 'const', v: 'y' });
            } else if (variable && (m = /^[a-df-wzA-DF-WZ]/.exec(s))) {
                out.push({ t: 'const', v: m[0].toLowerCase(), p: true });
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
            if (t.t === 'fn' && t.v === 'call') { // f(2x): what f of another box is there
                f = { t: 'call', c: t.of };
                f.arg = need(shut(primary(), f));
                return f;
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
                else if (!end() && (is('(') || is('√') || /^(fn|const|sup)$/.test(toks[i].t) || numberAfter())) op = '×'; // 2π, 2(3 + 4), π2, (3)4
                else return n;
                n = { t: 'bin', op: op, l: need(n), r: end() ? null : combo() };
            }
        }

        // a number straight after π, e, a letter, a ), a ! or % or a raised number, as π2, A2, (3)4, 5!6 or 4²3,
        // is times it; not after a number, 12 50, nor after x, as x2 may mean x²
        function numberAfter() {
            var p = toks[i - 1];
            return toks[i].t === 'num' && (p.t === 'const' && /^(π|e|[A-J])$/.test(p.v) || p.t === 'sup' ||
                (p.t === 'op' && /^[)!%]$/.test(p.v)));
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

    // ---------- graphs ---------- //

    // false if anything of the expression is missing: "x +", "2 × ()"
    function complete(n) {
        if (!n) return false;
        if (n.t === 'bin') return complete(n.l) && complete(n.r);
        return n.t === 'group' || n.arg !== undefined ? complete(n.arg) : true;
    }

    // true if the expression has a function of an angle, whose graph depends on Deg or Rad
    function angular(n) {
        return !!n && ((n.t === 'fn' && ANGLE.test(n.key)) || (n.t === 'call' && !!n.c.angles) || angular(n.arg) || angular(n.l) || angular(n.r));
    }

    // true if the expression has a slope found by steps, whose values are only so near: d/dx, f′(x)
    function rough(n) {
        return !!n && ((n.t === 'call' && !!n.c.rough) || rough(n.arg) || rough(n.l) || rough(n.r));
    }

    // The value of an expression read by parse, at x, angles in unit deg, its letters of
    // their own in vars, 1 for one not set. A graph needs hundreds of them at a time, so
    // + – × ÷ are the machine's own, unless exact: worked out as the display does, for the
    // value a point of the graph shows
    function valueAt(n, x, deg, exact, vars, y) {
        var a, b;
        switch (n.t) {
            case 'num': return +n.v;
            case 'const':
                if (n.p) return vars && typeof vars[n.v] === 'number' ? vars[n.v] : 1;
                if (VAR.test(n.v)) return stored[n.v];
                return n.v === 'x' ? x : n.v === 'y' ? y : n.v === 'π' ? PI : Math.E;
            case 'group': return valueAt(n.arg, x, deg, exact, vars, y);
            case 'call':
                a = valueAt(n.arg, x, deg, exact, vars, y);
                return isFinite(a) ? n.c.at(a, deg, exact) : NaN;
            case 'neg': return -valueAt(n.arg, x, deg, exact, vars, y);
            case 'fn':
            case 'post':
                a = valueAt(n.arg, x, deg, exact, vars, y);
                if (!isFinite(a)) return NaN;
                if (n.key === '%') return a / 100;
                if (!exact && n.key === 'x2') return a * a;
                if (!exact && n.key === 'x3') return a * a * a;
                return UNARY[n.key].f(a, n.deg === undefined ? deg : n.deg);
            default:
                a = valueAt(n.l, x, deg, exact, vars, y);
                b = valueAt(n.r, x, deg, exact, vars, y);
                if (!isFinite(a) || !isFinite(b)) return NaN;
                if (exact) return binary(n.op, a, b);
                switch (n.op) {
                    case '+': return a + b;
                    case '–': return a - b;
                    case '×': return a * b;
                    case '÷': return a / b;
                    case 'yx': return Math.pow(a, b);
                }
                return binary(n.op, a, b);
        }
    }

    // A function of x to draw, written as it would be pasted: x^2 – 3, 2sin(x), y = 1/x, a x² + b.
    // Null if the text is not one. at(x, deg, exact) is its value; angles: it has a
    // function of an angle; letters: its letters of their own, in the order they come,
    // which vars holds the values of, as their sliders set them. comma: the decimal mark in use is a comma.
    // d/dx before a function is its slope: d/dx(x^2) is 2x; anywhere else it is not a function,
    // where it would be d ÷ d × x. Named, g(x) = x^2 + 1, it is g, which defs gives other boxes.
    // Inequalities in braces after it keep it to where they hold, x^2 {0 < x < 3}, {y > 0} of its
    // value, and in braces with a colon it is in pieces, {x < 0: -x, x^2}: the first whose
    // inequality holds, the last without one where none does; piece(x, deg) is which. rough: its values are found by steps
    function graph(text, comma, vars, defs) {
        var s = String(text).trim().replace(HEAD, ''), cut = conditions(s, comma, vars, defs), c;
        if (!cut) return null;
        c = /^\{[^{}]*\}$/.test(cut.s) ? cases(cut.s.slice(1, -1), comma, vars, defs) :
            curveOf(separators(cut.s, comma), vars, defs);
        if (!c || !cut.when.length) return c;
        return {
            at: function (x, deg, exact) {
                var y = c.at(x, deg, exact);
                return cut.when.every(function (r) { return holds(r, x, y, deg); }) ? y : NaN;
            },
            angles: c.angles || cut.when.some(function (r) { return r.angles; }),
            letters: joined([c].concat(cut.when)),
            rough: c.rough,
            piece: c.piece
        };
    }

    // An expression read as the graph reads it, its letters each a number of its own: what
    // parse gives, for others to work out in their own way, as with complex numbers; null if
    // the text is not one, or stops before its end
    function tree(text, comma) {
        var s = separators(String(text).trim(), comma), toks = s.length <= MAX_PASTE && tokens(s, null, true), t = toks && parse(toks);
        return t && complete(t) ? t : null;
    }

    // the name of the function a box makes, g of g(x) = x^2 + 1, or null
    function named(text) {
        var m = /^\s*([a-df-wz])\s*\(\s*x\s*\)\s*=/i.exec(String(text));
        return m ? m[1].toLowerCase() : null;
    }

    // the letters of things that relation, graph or plane give, each once, in the order they come
    function joined(list) {
        var out = [];
        list.forEach(function (c) {
            c.letters.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
        });
        return out;
    }

    // The inequalities in braces at the end of s, as relation reads them: x^2 {0 < x < 3},
    // {x > 0}{y < 4}. { s: what is before them, when: the inequalities }; null if one is not an
    // inequality. Braces with a colon are pieces, not that
    function conditions(s, comma, vars, defs) {
        var when = [], m, r;
        while ((m = /\{([^{}:]*)\}\s*$/.exec(s)) && m.index > 0) {
            r = relation(m[1], comma, vars, defs);
            if (!r || r.op === '=') return null;
            when.unshift(r);
            s = s.slice(0, m.index).trim();
        }
        return { s: s, when: when };
    }

    // the parts of s between its marks that are not in brackets: a comma or ;, only ; with the comma in use
    function apart(s, comma) {
        var out = [], depth = 0, from = 0, k, c;
        for (k = 0; k < s.length; k++) {
            c = s.charAt(k);
            if (c === '(') depth++;
            if (c === ')') depth--;
            if (!depth && (c === ';' || (c === ',' && !comma))) {
                out.push(s.slice(from, k));
                from = k + 1;
            }
        }
        out.push(s.slice(from));
        return out;
    }

    // A function in pieces, x < 0: -x, x^2 as written in its braces: each an inequality, a colon
    // and its function, the last maybe a function alone; an inequality alone is 1 where it holds.
    // Its value is of the first piece whose inequality holds at x, else of the last alone, else none
    function cases(s, comma, vars, defs) {
        var parts = apart(s, comma), list = [], all = [];
        parts.forEach(function (part, k) {
            var colon = part.indexOf(':'), when = colon < 0 ? null : relation(part.slice(0, colon), comma, vars, defs),
                then = colon < 0 ? part : part.slice(colon + 1), c;
            if (list === null) return;
            if (colon < 0 && /[<>≤≥]/.test(part)) {
                when = relation(part, comma, vars, defs);
                then = '1';
            }
            c = then.trim() && curveOf(separators(then.trim(), comma), vars, defs);
            if (!c || (colon > -1 && (!when || when.op === '=')) || (colon < 0 && !when && k < parts.length - 1) || (when && when.op === '=')) {
                list = null;
                return;
            }
            list.push({ when: when, c: c });
            all.push(c);
            if (when) all.push(when);
        });
        if (!list || !list.length) return null;
        function piece(x, deg) {
            var k;
            for (k = 0; k < list.length; k++) if (!list[k].when || holds(list[k].when, x, NaN, deg)) return k;
            return -1;
        }
        return {
            at: function (x, deg, exact) {
                var k = piece(x, deg);
                return k < 0 ? NaN : list[k].c.at(x, deg, exact);
            },
            piece: piece,
            angles: all.some(function (c) { return c.angles; }),
            letters: joined(all),
            rough: all.some(function (c) { return c.rough; })
        };
    }

    // the slope of a curve as a curve of its own; d times over, for f″
    function derived(c, d) {
        if (!d) return c;
        return derived({
            at: function (x, deg) { return slope(c, x, deg); },
            angles: c.angles,
            letters: c.letters,
            rough: true
        }, d - 1);
    }

    // true unless s starts with a bracket that a sum goes on from: (x^2) + 1, not (x + 1)(x – 1)
    function allOf(s) {
        var depth = 0, k;
        if (s.charAt(0) !== '(') return true;
        for (k = 0; k < s.length; k++) {
            if (s.charAt(k) === '(') depth++;
            if (s.charAt(k) === ')' && !--depth) return !/^\s*[+\-–−]/.test(s.slice(k + 1));
        }
        return true; // left open, as a paste can
    }

    function curveOf(s, vars, defs) {
        var d = /^d\s*\/\s*dx\s*/.exec(s), of = d && curveOf(s.slice(d[0].length), vars, defs),
            toks = !d && !/d\s*\/\s*dx/.test(s) && s.length <= MAX_PASTE && tokens(s, null, true, defs), tree = toks && parse(toks), letters = [];
        if (d) {
            if (!allOf(s.slice(d[0].length))) return null; // d/dx(x^2) + 1 is not the slope of all of it
            return of && derived(of, 1);
        }
        if (!tree || !complete(tree)) return null;
        toks.forEach(function (t) {
            if (t.p && letters.indexOf(t.v) < 0) letters.push(t.v);
            if (t.of) t.of.letters.forEach(function (k) { if (letters.indexOf(k) < 0) letters.push(k); });
        });
        return {
            at: function (x, deg, exact) { return valueAt(tree, x, deg, exact, vars); },
            angles: angular(tree),
            letters: letters,
            rough: rough(tree)
        };
    }

    // An equation of x and y to draw, as x^2 + y^2 = 25, x = 3 or x = y^2: where its two sides are
    // equal; or an inequality, y < x^2, x^2 + y^2 <= 9, where it is true. Null if the text is not
    // one, as y = 2x is a function of x instead, which graph gives. at(x, y, deg) is the left side
    // less the right; op is =, <, >, ≤ or ≥ (<= and >= as typed); angles and letters as of graph.
    // Two inequalities the same way, 1 < x < 3 or 0 < x^2 + y^2 <= 9, are both: parts holds each,
    // the first less the middle and the middle less the last, and op is 'and'. Inequalities in
    // braces after it keep it to where they hold, x^2 + y^2 = 25 {y > 0}: none (NaN) elsewhere
    function relation(text, comma, vars, defs) {
        var cut = conditions(String(text).trim(), comma, vars, defs), r;
        if (!cut || !cut.when.length) return cut && relationOf(cut.s, comma, vars, defs);
        r = relationOf(cut.s, comma, vars, defs);
        if (!r) return null;
        (r.parts || [r]).forEach(function (part) {
            var at = part.at;
            part.at = function (x, y, deg) {
                return cut.when.every(function (w) { return holds(w, x, y, deg); }) ? at(x, y, deg) : NaN;
            };
        });
        r.angles = r.angles || cut.when.some(function (w) { return w.angles; });
        r.letters = joined([r].concat(cut.when));
        return r;
    }

    function relationOf(text, comma, vars, defs) {
        var s = separators(String(text).trim(), comma), ops = s.match(/<=|>=|=<|=>|[<>≤≥=]/g), sides,
            letters = [], trees, xy = false, names;
        if (!ops || ops.length > 2 || s.length > MAX_PASTE || /d\s*\/\s*dx/.test(s)) return null;
        names = ops.map(function (op) { return { '<=': '≤', '=<': '≤', '>=': '≥', '=>': '≥' }[op] || op; });
        if (ops.length === 2 && !(/[<≤]/.test(names[0]) && /[<≤]/.test(names[1]) || /[>≥]/.test(names[0]) && /[>≥]/.test(names[1]))) return null;
        sides = s.split(/<=|>=|=<|=>|[<>≤≥=]/);
        trees = sides.map(function (side) {
            var toks = side.trim() && tokens(side, null, 2, defs), tree = toks && parse(toks);
            if (!tree || !complete(tree)) return null;
            toks.forEach(function (t) {
                if (t.p && letters.indexOf(t.v) < 0) letters.push(t.v);
                if (t.of) t.of.letters.forEach(function (k) { if (letters.indexOf(k) < 0) letters.push(k); });
                if (t.t === 'const' && (t.v === 'x' || t.v === 'y')) xy = true;
            });
            return tree;
        });
        if (!trees.every(Boolean) || !xy) return null;
        function less(a, b) {
            return function (x, y, deg) { return valueAt(trees[a], x, deg, false, vars, y) - valueAt(trees[b], x, deg, false, vars, y); };
        }
        if (ops.length === 2) {
            return {
                parts: [{ at: less(0, 1), op: names[0] }, { at: less(1, 2), op: names[1] }],
                op: 'and',
                angles: trees.some(angular),
                letters: letters
            };
        }
        return {
            at: less(0, 1),
            op: names[0],
            angles: angular(trees[0]) || angular(trees[1]),
            letters: letters
        };
    }

    // How far into an inequality x, y is, more than 0 inside it and less outside: the difference
    // of its sides, the way that it holds; the least of its parts', for both of two. Of an
    // equation, how far it is on the side where its difference is of the sign side. NaN where
    // it has no value
    function within(rel, x, y, deg, side) {
        var parts = rel.parts || [rel], least = Infinity, k, v;
        for (k = 0; k < parts.length; k++) {
            v = parts[k].at(x, y, deg) * (parts[k].op === '=' ? side || 1 : /[<≤]/.test(parts[k].op) ? -1 : 1);
            if (isNaN(v)) return NaN;
            if (v < least) least = v;
        }
        return least;
    }

    // true where x, y is in an inequality, on its line too for ≤ and ≥, or a hair off it
    function holds(rel, x, y, deg) {
        var parts = rel.parts || [rel];
        return parts.every(function (p) {
            var v = p.at(x, y, deg) * (/[<≤]/.test(p.op) ? -1 : 1);
            return v > 0 || (v >= -1e-9 && p.op !== '<' && p.op !== '>') || Math.abs(v) <= 1e-12;
        });
    }

    // A curve of its own parameter: polar, r = 2sin(3θ), its r at each angle θ (typed θ, theta or
    // t), or parametric, (cos t, sin t), x and y at each t; t and θ go once round, 0 to 2π in the
    // unit of angles, unless {from, to} follows: r = θ {0, 6π}. Null if the text is not one, as
    // (3, 4) is a point instead. at(t, deg) is [x, y]; range(deg) is [from, to]; kind is polar
    // or param; letters and angles as of graph. In the comma's place a ; with the comma in use
    function plane(text, comma, vars, defs) {
        var s = String(text).trim().replace(/θ|theta/gi, 't'), mark = comma ? ';' : /[,;]/, ends = /\{([^{}]*)\}\s*$/.exec(s),
            letters = [], polar = /^r\s*(\(\s*t\s*\))?\s*=/i.exec(s), parts, trees, found = false, range, full = [2 * PI, 360, 400];
        if (s.length > MAX_PASTE) return null;
        if (ends) {
            range = split(ends[1]).map(function (part) {
                var toks = tokens(separators(part, comma), null, false), tree = toks && parse(toks);
                return tree && complete(tree) ? valueAt(tree, 0, 0) : NaN;
            });
            if (range.length !== 2 || !range.every(isFinite) || range[0] >= range[1]) return null;
            s = s.slice(0, ends.index).trim();
        }
        if (polar) parts = [s.slice(polar[0].length)];
        else if (/^\(.*\)$/.test(s) && whole(s)) parts = split(s.slice(1, -1));
        if (!parts || parts.length !== (polar ? 1 : 2)) return null;
        trees = parts.map(function (part) {
            var toks = part.trim() && tokens(separators(part, comma), null, true, defs), tree;
            if (!toks || toks.some(function (t) { return t.t === 'const' && t.v === 'x' && !t.p; })) return null;
            toks = toks.map(function (t) {
                if (t.t !== 'const' || t.v !== 't' || !t.p) return t;
                found = true;
                return { t: 'const', v: 'x' }; // the parameter, as x is of a function
            });
            tree = parse(toks);
            if (!tree || !complete(tree)) return null;
            toks.forEach(function (t) {
                if (t.p && letters.indexOf(t.v) < 0) letters.push(t.v);
                if (t.of) t.of.letters.forEach(function (k) { if (letters.indexOf(k) < 0) letters.push(k); });
            });
            return tree;
        });
        if (!trees.every(Boolean) || !found) return null;
        return {
            kind: polar ? 'polar' : 'param',
            at: function (t, deg) {
                var r;
                if (!polar) return [valueAt(trees[0], t, deg, false, vars), valueAt(trees[1], t, deg, false, vars)];
                r = valueAt(trees[0], t, deg, false, vars);
                t *= 2 * PI / full[deg || 0];
                return [r * Math.cos(t), r * Math.sin(t)];
            },
            range: function (deg) { return range || [0, full[deg || 0]]; },
            angles: trees.some(angular),
            letters: letters
        };

        // the parts of s between its marks that are not in brackets
        function split(s) {
            var out = [], depth = 0, from = 0, k, c;
            for (k = 0; k < s.length; k++) {
                c = s.charAt(k);
                if (c === '(') depth++;
                if (c === ')') depth--;
                if (!depth && (typeof mark === 'string' ? c === mark : mark.test(c))) {
                    out.push(s.slice(from, k));
                    from = k + 1;
                }
            }
            out.push(s.slice(from));
            return out;
        }
        // true if the bracket that s starts with closes at its end
        function whole(s) {
            var depth = 0, k;
            for (k = 0; k < s.length; k++) {
                if (s.charAt(k) === '(') depth++;
                if (s.charAt(k) === ')' && !--depth) return k === s.length - 1;
            }
            return false;
        }
    }

    // A sequence: a(n) = a(n – 1) × 1.05, each term of the ones before it, with its first ones in
    // braces after it, {a(1) = 100}, as a polar curve has its range; a(n) = a(n – 1) + a(n – 2)
    // {a(1) = 1, a(2) = 1}; or a(n) = 2n + 1, of n alone. Its name is a lowercase letter, any but x,
    // e and i: a letter followed by (n), (n – 1) and on to (n – 9) is a sequence's, while the same
    // letter alone is a slider's, as a in a(n) = a(n – 1) + a. n goes from the first term given, or
    // 1, for 50 terms, or as two numbers in the braces say, {1, 100}, up to 10000 of them; the first
    // terms given may be of sliders. Null if the text is not one, as of another sequence's terms.
    // kind: 'seq'; name; at(n, deg) is [n, a(n)], none but at a whole n it has; range(deg) is
    // [from, to]; terms(deg) is { from, list: the terms from n = from, NaN where one has no value,
    // stop: where they stop and why, { n, why: 'large' too large a term, 'none' one of no value that
    // the next are of, 'before' one of a term before the first given, need, or 'many' more than
    // 10000 }, or null }; letters and angles as of graph
    function sequence(text, comma, vars, defs) {
        var s = String(text).trim(), head = /^([a-df-hj-wyz])\s*\(\s*n\s*\)\s*=\s*/.exec(s),
            name, groups = [], m, starts = {}, ends = [], letters = [], toks = [], back = 0, from, to, first, tree, kept = null, ok = true;
        if (!head || s.length > MAX_PASTE) return null;
        name = head[1];
        s = s.slice(head[0].length);
        while ((m = /\{([^{}]*)\}\s*$/.exec(s)) && groups.length < 2) {
            groups.unshift(m[1]);
            s = s.slice(0, m.index).trim();
        }
        if (/[{}]/.test(s)) return null;
        // each part of the braces: a first term, a(1) = 100, or an end of n
        groups.forEach(function (g) {
            apart(g, comma).forEach(function (part) {
                var t = /^\s*([a-z])\s*\(\s*(-?\d+)\s*\)\s*=(.*)$/.exec(part), tree;
                if (t) {
                    tree = t[1] === name && !starts.hasOwnProperty(t[2]) && readOf(t[3]);
                    if (!tree) ok = false;
                    else starts[+t[2]] = tree;
                } else {
                    tree = readOf(part, true);
                    if (!tree) ok = false;
                    else ends.push(valueAt(tree, 0, 0));
                }
            });
        });
        if (!ok || (ends.length !== 0 && ends.length !== 2)) return null;
        if (ends.length && !(ends.every(function (e) { return e === Math.floor(e) && Math.abs(e) <= 1e9; }) && ends[0] <= ends[1])) return null;
        // the terms: a(n – k) stands in for each of those before, a letter's own name for the rest of it
        m = /([a-zA-Z]+)\s*\(\s*n\s*(?:([-−–])\s*(\d+)\s*)?\)/g;
        first = 0;
        s.replace(m, function (all, word, minus, k, at) {
            if (!ok || word.length > 1 || (defs && defs.hasOwnProperty(word.toLowerCase()) && word !== name)) return all; // sin(n), or a function named
            if (word !== name || !minus || +k < 1 || +k > 9) {
                ok = false; // another sequence's, or its own term n, of itself
                return all;
            }
            ok = piece(s.slice(first, at));
            toks.push({ t: 'const', v: '#' + k, p: true }); // a letter of its own, which the slider's never is
            back = Math.max(back, +k);
            first = at + all.length;
            return all;
        });
        if (!ok || !piece(s.slice(first))) return null;
        tree = parse(toks);
        if (!tree || !complete(tree)) return null;
        first = Object.keys(starts).map(Number).sort(function (a, b) { return a - b; });
        from = ends.length ? ends[0] : first.length ? first[0] : 1;
        to = ends.length ? ends[1] : from + 49;
        return {
            kind: 'seq',
            name: name,
            at: function (n, deg) {
                var r = terms(deg), y = n === Math.floor(n) && n >= r.from ? r.list[n - r.from] : undefined;
                return y === undefined ? [NaN, NaN] : [n, y];
            },
            range: function () { return [from, to]; },
            terms: terms,
            angles: angular(tree) || first.some(function (k) { return angular(starts[k]); }),
            letters: letters
        };

        // the terms as the sliders are now, kept while they and the unit stay
        function terms(deg) {
            var key = [deg].concat(letters.map(function (k) { return vars && vars[k]; })).join(), scope = Object.create(vars || {}),
                values = {}, list = [], stop = null, low = back ? Math.min(from, first.length ? first[0] : from) : from, n, k, y, top;
            if (kept && kept.key === key) return kept.r;
            top = Math.min(to, low + 99999, from + 9999);
            for (n = low; n <= top && !stop; n++) {
                if (starts.hasOwnProperty(n)) {
                    y = valueAt(starts[n], 0, deg, false, vars);
                } else {
                    for (k = 1; k <= back; k++) {
                        if (values[n - k] === undefined) { // not given, nor found
                            if (back) stop = { n: n, why: 'before', need: n - k };
                            break;
                        }
                        scope['#' + k] = values[n - k];
                    }
                    y = stop ? NaN : valueAt(tree, n, deg, false, scope);
                }
                if (stop) break;
                if (Math.abs(y) === Infinity) stop = { n: n, why: 'large' };
                else if (isNaN(y) && back) stop = { n: n, why: 'none' };
                else values[n] = y;
                if (!stop && n >= from) list.push(y);
            }
            if (!stop && top < to) stop = { n: top + 1, why: 'many' };
            kept = { key: key, r: { from: from, list: list, stop: stop } };
            return kept.r;
        }

        // the tokens of a part of the text between the terms before: n is the variable, as x is of a function
        function piece(part) {
            var t = part.trim() ? tokens(separators(part, comma), null, true, defs) : [];
            if (!t || t.some(function (q) { return q.t === 'const' && (q.v === 'x' || q.v === 'y'); })) return false;
            t.forEach(function (q) {
                if (q.p && q.v !== 'n' && letters.indexOf(q.v) < 0) letters.push(q.v);
                if (q.of) q.of.letters.forEach(function (k) { if (letters.indexOf(k) < 0) letters.push(k); });
                toks.push(q.p && q.v === 'n' ? { t: 'const', v: 'x' } : q);
            });
            return true;
        }

        // a first term, of numbers and sliders, or with plain an end of n, of numbers alone
        function readOf(part, plain) {
            var t = part.trim() && tokens(separators(part.trim(), comma), null, !plain, plain ? null : defs), tree = t && parse(t);
            if (!tree || !complete(tree) || t.some(function (q) { return q.t === 'const' && (q.v === 'x' || q.v === 'n'); })) return null;
            t.forEach(function (q) { if (q.p && letters.indexOf(q.v) < 0) letters.push(q.v); });
            return tree;
        }
    }

    // A slope field: dy/dx = x – y, or y′ = x – y, its slope at each place a function of x and y,
    // with the places its solutions start in braces after it, {y(0) = 1, y(0) = -2}, as a
    // sequence has its first terms; each of them may be worked out, and be of sliders. Null if
    // the text is not one: dy/dx alone, or an equation after it. kind: 'field'; at(x, y, deg) is
    // the slope there; starts(deg) is [[x0, y0], …] as the sliders are now; text, what is
    // before the braces, and given, the text of each start; letters and angles as of graph
    function slopeField(text, comma, vars, defs) {
        var s = String(text).trim(), head = /^(?:d\s*y\s*\/\s*d\s*x|y\s*['′’])\s*=\s*/.exec(s), m, parts = [], starts = [], letters = [], body, cut, c, f, ok = true;
        if (!head || s.length > MAX_PASTE * 4) return null; // room for its starts; what is before them is held to MAX_PASTE as any equation is
        body = s.slice(head[0].length);
        m = /\{([^{}]*)\}\s*$/.exec(body);
        if (m && apart(m[1], comma).every(function (part) { return /^\s*y\s*\(/.test(part); })) { // the starts; braces of another kind are of the function, its pieces
            parts = apart(m[1], comma);
            body = body.slice(0, m.index).trim();
        }
        if (!body || /[=<>≤≥]/.test(body.replace(/\{[^{}]*\}/g, ''))) return null; // of the pieces of a function in braces, their conditions
        // the inequalities in braces at its end, x - y {0 < x < 3}, of x and y both, kept apart: the
        // slope has no value where one does not hold
        cut = conditions(body, comma, vars, defs);
        if (!cut || !cut.s) return null;
        // of x and y as an equation of them is read, its side less 0; of x alone, or neither, as a function
        c = relation('(' + cut.s + ') = 0', comma, vars, defs);
        if (c && !c.parts) {
            f = c.at;
        } else {
            c = graph(cut.s, comma, vars, defs);
            f = c && function (x, y, deg) { return c.at(x, deg); };
        }
        if (!c) return null;
        if (cut.when.length) {
            f = (function (at) {
                return function (x, y, deg) {
                    return cut.when.every(function (w) { return holds(w, x, y, deg); }) ? at(x, y, deg) : NaN;
                };
            })(f);
        }
        joined([c].concat(cut.when)).forEach(function (k) { if (letters.indexOf(k) < 0) letters.push(k); });
        parts.forEach(function (part) {
            var t = /^\s*y\s*\(([^=]*)\)\s*=(.*)$/.exec(part), a = t && fixed(t[1]), b = t && fixed(t[2]);
            if (!a || !b) ok = false;
            else starts.push([a, b]);
        });
        if (!ok) return null;
        return {
            kind: 'field',
            at: f,
            starts: function (deg) {
                return starts.map(function (q) { return [q[0].at(0, deg), q[1].at(0, deg)]; });
            },
            text: s.slice(0, head[0].length) + body,
            given: parts.map(function (part) { return part.trim(); }),
            angles: c.angles || cut.when.some(function (w) { return w.angles; }) || starts.some(function (q) { return q[0].angles || q[1].angles; }),
            letters: letters
        };

        // a number of a start, which may be worked out and be of sliders, but not of x or y
        function fixed(part) {
            var g = part.trim() && !/\by\b/.test(part) && graph(part, comma, vars, defs);
            if (!g || isNaN(g.at(0, 0)) !== isNaN(g.at(NaN, 0))) return null;
            g.letters.forEach(function (k) { if (letters.indexOf(k) < 0) letters.push(k); });
            return g;
        }
    }

    // A solution of a slope field through (x0, y0), from x0 on to the right as far as to and to
    // the left as far as from: by Runge and Kutta's way of the fourth order, in steps of h, each
    // halved, down to a 1024th of h, until neither its slope, nor how its slope changes across
    // it, moves y more than dy in it, so that it follows a curve that turns up steeply and stops
    // where it goes straight up, not jumping across. { pts: [[x, y], …] by x, back and ahead: where
    // it stops each way and why, { x, y, why: 'none' of a slope of no value, 'large' of y past big,
    // 'steep' of one steeper than its smallest step can follow, 'many' of more than 100000 steps },
    // or null where it goes as far as it was to go }
    function solveField(field, x0, y0, from, to, deg, h, dy, big) {
        var back = walk(-1, from), ahead = walk(1, to);
        return { pts: back.pts.reverse().concat(isFinite(field.at(x0, y0, deg)) ? [[x0, y0]] : [], ahead.pts), back: back.stop, ahead: ahead.stop };

        function walk(dir, end) {
            var x = x0, y = y0, pts = [], stop = null, n = 0, step, k1, k2, k3, k4, next, ok;
            if (!isFinite(x0) || !isFinite(y0)) return { pts: pts, stop: { x: x0, y: y0, why: 'none' } };
            while ((end - x) * dir > 1e-9 * h && !stop) {
                k1 = field.at(x, y, deg);
                if (!isFinite(k1)) {
                    stop = { x: x, y: y, why: isNaN(k1) ? 'none' : 'steep' };
                    break;
                }
                for (step = dir * Math.min(h, Math.abs(end - x)); ; step /= 2) {
                    k2 = field.at(x + step / 2, y + step * k1 / 2, deg);
                    k3 = field.at(x + step / 2, y + step * k2 / 2, deg);
                    k4 = field.at(x + step, y + step * k3, deg);
                    next = y + step * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
                    ok = isFinite(next) && (!dy || (Math.abs(step) * Math.max(Math.abs(k1), Math.abs(k4), Math.abs(k2 - k1), Math.abs(k3 - k1), Math.abs(k4 - k1)) <= dy &&
                        Math.abs(next - y) <= dy));
                    if (ok || Math.abs(step) <= h / 1024) break;
                }
                if (!ok) stop = { x: x, y: y, why: isNaN(next) ? 'none' : !isFinite(next) ? 'large' : 'steep' };
                else if (Math.abs(next) > (big || 1e12)) stop = { x: x, y: y, why: 'large' };
                else if (++n > 100000) stop = { x: x, y: y, why: 'many' };
                else {
                    x += step;
                    y = next;
                    pts.push([x, y]);
                }
            }
            return { pts: pts, stop: stop };
        }
    }

    // Points to plot, as a list: (1, 2), (2, 4.1), (3, 5.9), or with the comma in use (1,5; 2).
    // [{ x, y }], or null if the text is not one
    function points(text, comma) {
        var s = String(text).trim().replace(/[−–]/g, '-'), out = [], rest,
            num = '\\s*([-+]?(?:\\d+' + (comma ? ',' : '\\.') + '?\\d*|' + (comma ? ',' : '\\.') + '\\d+)(?:[eE][-+]?\\d+)?)\\s*',
            pair = new RegExp('\\(' + num + (comma ? ';' : '[,;]') + num + '\\)', 'g');
        if (s.length > MAX_PASTE * 20) return null;
        rest = s.replace(pair, function (all, x, y) {
            out.push({ x: +x.replace(',', '.'), y: +y.replace(',', '.') });
            return ' ';
        });
        return out.length && /^[\s,;]*$/.test(rest) ? out : null;
    }

    // The straight line nearest points, by least squares: y = m x + b, and r², how much of how
    // the y differ it tells, 1 for points on it. Null for fewer than two x. raw: m and b not rounded
    function fitLine(points, raw) {
        var n = points.length, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0, m, b, top, all;
        points.forEach(function (p) {
            sx += p.x;
            sy += p.y;
        });
        sx /= n;
        sy /= n;
        points.forEach(function (p) {
            sxx += (p.x - sx) * (p.x - sx);
            sxy += (p.x - sx) * (p.y - sy);
            syy += (p.y - sy) * (p.y - sy);
        });
        if (n < 2 || !(sxx > 0)) return null;
        m = sxy / sxx;
        b = sy - m * sx;
        top = syy - m * sxy; // what is left off the line
        all = syy;
        return {
            m: raw ? m : +m.toPrecision(10),
            b: raw ? b : Math.abs(b) <= 1e-12 * Math.max(Math.abs(sy), 1) ? 0 : +b.toPrecision(10),
            r2: all > 0 ? +Math.max(0, Math.min(1, 1 - top / all)).toPrecision(10) : 1
        };
    }

    // The curve of a kind nearest points, by least squares: lin, y = m x + b; quad, y = a x² + b x + c;
    // exp, y = a·bˣ; pow, y = a·xᵇ; log, y = a + b ln x. The last three are the straight line of
    // ln y or ln x, as calculators fit them, with that line's r². { kind, k: its numbers in that
    // order, r2, at(x) }. Null where the points cannot have one: too few x, or a y or an x not
    // above 0 where its logarithm is taken
    function fit(points, kind) {
        var line, k, logX = kind === 'pow' || kind === 'log', logY = kind === 'exp' || kind === 'pow', at;
        if (kind === 'quad') return fitQuad(points);
        if (points.some(function (p) { return (logX && !(p.x > 0)) || (logY && !(p.y > 0)); })) return null;
        if (kind === 'lin') line = fitLine(points);
        else line = fitLine(points.map(function (p) { return { x: logX ? Math.log(p.x) : p.x, y: logY ? Math.log(p.y) : p.y }; }), true);
        if (!line) return null;
        k = kind === 'exp' ? [Math.exp(line.b), Math.exp(line.m)] : kind === 'pow' ? [Math.exp(line.b), line.m] :
            kind === 'log' ? [line.b, line.m] : [line.m, line.b];
        k = k.map(function (n) { return +n.toPrecision(10); });
        at = {
            lin: function (x) { return k[0] * x + k[1]; },
            exp: function (x) { return k[0] * Math.pow(k[1], x); },
            pow: function (x) { return k[0] * Math.pow(x, k[1]); },
            log: function (x) { return k[0] + k[1] * Math.log(x); }
        }[kind];
        return at ? { kind: kind, k: k, r2: line.r2, at: at } : null;
    }

    // y = a x² + b x + c nearest points: the sums of x from their middle, so they stay small,
    // solved by elimination; a number as small as the values' rounding is 0. Null for fewer than three x
    function fitQuad(points) {
        var n = points.length, mx = 0, my = 0, s = [0, 0, 0, 0, 0], t = [0, 0, 0], big = 0, top = 0, all = 0, xs = [], m, q, k;
        points.forEach(function (p) {
            mx += p.x / n;
            my += p.y / n;
            if (xs.indexOf(p.x) < 0) xs.push(p.x);
        });
        if (xs.length < 3) return null;
        points.forEach(function (p) {
            var u = p.x - mx;
            for (k = 0; k <= 4; k++) s[k] += Math.pow(u, k);
            for (k = 0; k <= 2; k++) t[k] += Math.pow(u, k) * p.y;
            big = Math.max(big, Math.abs(p.y));
        });
        m = solve([[s[4], s[3], s[2]], [s[3], s[2], s[1]], [s[2], s[1], s[0]]], [t[2], t[1], t[0]]);
        if (!m) return null;
        q = [m[0], m[1] - 2 * m[0] * mx, m[0] * mx * mx - m[1] * mx + m[2]]; // in x, not x less its middle
        xs = Math.max.apply(null, xs.map(Math.abs));
        q = q.map(function (c, k) { return Math.abs(c) * Math.pow(Math.max(xs, 1), 2 - k) <= 1e-12 * Math.max(big, 1e-300) ? 0 : +c.toPrecision(10); });
        points.forEach(function (p) {
            top += Math.pow(p.y - ((q[0] * p.x + q[1]) * p.x + q[2]), 2);
            all += (p.y - my) * (p.y - my);
        });
        return {
            kind: 'quad',
            k: q,
            r2: all > 0 ? +Math.max(0, Math.min(1, 1 - top / all)).toPrecision(10) : 1,
            at: function (x) { return (q[0] * x + q[1]) * x + q[2]; }
        };
    }

    // a times x is b, for a square a, by elimination with the largest first; null if it has no one answer
    function solve(a, b) {
        var n = b.length, i, j, k, p, f, x = [];
        a = a.map(function (row, i) { return row.concat([b[i]]); });
        for (i = 0; i < n; i++) {
            p = i;
            for (j = i + 1; j < n; j++) if (Math.abs(a[j][i]) > Math.abs(a[p][i])) p = j;
            if (!(Math.abs(a[p][i]) > 1e-300)) return null;
            f = a[i];
            a[i] = a[p];
            a[p] = f;
            for (j = i + 1; j < n; j++) {
                f = a[j][i] / a[i][i];
                for (k = i; k <= n; k++) a[j][k] -= f * a[i][k];
            }
        }
        for (i = n - 1; i >= 0; i--) {
            f = a[i][n];
            for (k = i + 1; k < n; k++) f -= a[i][k] * x[k];
            x[i] = f / a[i][i];
        }
        return x.every(isFinite) ? x : null;
    }

    // ---------- the points of a graph worth marking ---------- //

    // Where the lines of two equations cross within the view, a and b their differences: in each
    // square of a grid where both change sign, Newton's steps for both at once from its middle,
    // kept if they end close by. Each is { x, y }, once
    function crossings(a, b, view, deg) {
        var n = 80, dx = (view.x1 - view.x0) / n, dy = (view.y1 - view.y0) / n, fa = [], fb = [], out = [], i, j;
        function f(x, y) {
            return [a.at(x, y, deg), b.at(x, y, deg)];
        }
        function changes(g, i, j) {
            var k = [g[j][i], g[j][i + 1], g[j + 1][i], g[j + 1][i + 1]];
            return k.every(isFinite) && Math.min.apply(null, k) <= 0 && Math.max.apply(null, k) >= 0;
        }
        for (j = 0; j <= n; j++) {
            fa.push([]);
            fb.push([]);
            for (i = 0; i <= n; i++) {
                fa[j].push(a.at(view.x0 + i * dx, view.y0 + j * dy, deg));
                fb[j].push(b.at(view.x0 + i * dx, view.y0 + j * dy, deg));
            }
        }
        for (j = 0; j < n; j++) {
            for (i = 0; i < n; i++) {
                if (changes(fa, i, j) && changes(fb, i, j)) newton(view.x0 + (i + 0.5) * dx, view.y0 + (j + 0.5) * dy);
            }
        }
        return out;

        function newton(x, y) {
            var x0 = x, y0 = y, hx = dx * 1e-5, hy = dy * 1e-5, k, v, ax, ay, bx, by, d, sx, sy;
            for (k = 0; k < 40; k++) {
                v = f(x, y);
                ax = (a.at(x + hx, y, deg) - a.at(x - hx, y, deg)) / (2 * hx);
                ay = (a.at(x, y + hy, deg) - a.at(x, y - hy, deg)) / (2 * hy);
                bx = (b.at(x + hx, y, deg) - b.at(x - hx, y, deg)) / (2 * hx);
                by = (b.at(x, y + hy, deg) - b.at(x, y - hy, deg)) / (2 * hy);
                d = ax * by - ay * bx;
                if (!isFinite(d) || !d || !isFinite(v[0]) || !isFinite(v[1])) return;
                sx = (v[0] * by - v[1] * ay) / d;
                sy = (v[1] * ax - v[0] * bx) / d;
                x -= sx;
                y -= sy;
                if (Math.abs(sx) <= dx * 1e-13 && Math.abs(sy) <= dy * 1e-13) break;
            }
            if (Math.abs(x - x0) > 1.5 * dx || Math.abs(y - y0) > 1.5 * dy) return; // gone to another
            v = f(x, y);
            if (!(Math.abs(v[0]) <= 1e-7 * (1 + Math.abs(a.at(x + dx, y, deg))) && Math.abs(v[1]) <= 1e-7 * (1 + Math.abs(b.at(x + dx, y, deg))))) return;
            x = +x.toPrecision(12);
            y = +y.toPrecision(12);
            if (out.some(function (p) { return Math.abs(p.x - x) < dx / 2 && Math.abs(p.y - y) < dy / 2; })) return;
            out.push({ x: x, y: y });
        }
    }

    // where f crosses 0 between a and b, f(a) being fa: halved until a and b are
    // neighbouring numbers. Null where f has no value on the way, as 1/x at 0
    function bisect(f, a, b, fa) {
        var m, fm, i;
        for (i = 0; i < 200; i++) {
            m = (a + b) / 2;
            if (m <= a || m >= b) break;
            fm = f(m);
            if (!isFinite(fm)) return null;
            if (fm === 0) return m;
            if ((fm < 0) === (fa < 0)) {
                a = m;
                fa = fm;
            } else {
                b = m;
            }
        }
        return Math.abs(f(a)) <= Math.abs(f(b)) ? a : b;
    }

    // where g is highest between a and b, by the golden section
    function peak(g, a, b) {
        var r = (Math.sqrt(5) - 1) / 2, c = b - r * (b - a), d = a + r * (b - a), gc = g(c), gd = g(d), i;
        for (i = 0; i < 120 && c < d; i++) {
            if (gc >= gd) {
                b = d;
                d = c;
                gd = gc;
                c = b - r * (b - a);
                gc = g(c);
            } else {
                a = c;
                c = d;
                gc = gd;
                d = a + r * (b - a);
                gd = g(d);
            }
        }
        return (a + b) / 2;
    }

    // x found to within tol, written as short as it can be while it is as good:
    // 2, not 1.9999999999999998; 90, not 89.99999997
    function snap(x, tol, good) {
        var q, r;
        for (q = Math.pow(10, Math.ceil(Math.log10(tol)) + 1); q >= tol * 1e-7; q /= 10) {
            r = +(Math.round(x / q) * q).toPrecision(15);
            if (Math.abs(r - x) <= tol && good(r)) return r;
        }
        return x;
    }

    // where h is 0, from its samples s at xs: a sample of 0 between others, or a change
    // of sign that halving finds a 0 in. Where h only jumps from one sign to the other,
    // as tan x does at 90°, the halving ends where it is larger, not smaller: no 0 there.
    // None when there are more than KEY_MAX places to look
    function zeros(h, xs, s, tol) {
        var out = [], last = s.length - 1, at = [], k, r, hr;
        for (k = 0; k <= last && at.length <= KEY_MAX; k++) {
            if (s[k] === 0 ? (!k || s[k - 1] !== 0) && (k === last || s[k + 1] !== 0) : k && s[k - 1] * s[k] < 0) at.push(k);
        }
        if (at.length > KEY_MAX) return out;
        at.forEach(function (k) {
            if (s[k] === 0) return out.push(xs[k]); // not on a line of 0s, as y = 0 is
            r = bisect(h, xs[k - 1], xs[k], s[k - 1]);
            hr = r === null ? NaN : Math.abs(h(r));
            if (hr <= Math.min(Math.abs(s[k - 1]), Math.abs(s[k]))) {
                out.push(snap(r, tol, function (q) { return Math.abs(h(q)) <= hr; }));
            }
        });
        return out;
    }

    // The points of the curves worth marking within the view x0 to x1, y0 to y1: where each
    // is 0 (root), its lowest and highest points (min, max), where it bends the other way (infl), where it meets the y axis (yint),
    // and where two of them cross (cross). Each is { t: what it is, one or more of those,
    // x, y, i: the curve, j: the other curve of a crossing }. curves: what graph gives, or
    // null; deg: the unit of angles. A kind with more than KEY_MAX points is left out.
    // rels: the equations of x and y that relation gives, by their boxes, or null: where they
    // meet the x axis (xint) and the y axis (yint), where they cross a curve or each other
    // (cross), each of two inequalities where the other holds, with k the one. planes: the
    // curves of a parameter that plane gives: where they meet the axes and cross a curve or an
    // equation, u being the parameter there
    function keyPoints(curves, view, deg, rels, planes) {
        var n = 400, dx = (view.x1 - view.x0) / n, jump = (view.y1 - view.y0) / 2, xs = [], ys = [], found = [], k;

        for (k = 0; k <= n; k++) xs.push(view.x0 + k * dx);
        curves.forEach(function (c, i) {
            ys[i] = c && xs.map(function (x) { return c.at(x, deg); });
        });

        function add(list, make) {
            list.forEach(function (x) { found.push(make(x)); });
        }

        curves.forEach(function (c, i) {
            var y = ys[i], highs = [], lows = [], a, b, d, pc = c && c.piece && xs.map(function (x) { return c.piece(x, deg); });
            if (!c) return;
            if (pc) y = y.map(function (v, k) { return k && pc[k] !== pc[k - 1] ? NaN : v; }); // no top or bend across where its pieces meet

            function f(x) {
                return c.at(x, deg);
            }

            add(zeros(f, xs, y, dx * 1e-6), function (x) { return { t: ['root'], x: x, y: 0, i: i }; });

            // three samples, the middle one higher or lower than both its neighbours, with no jump
            // between them: the golden section finds the top, or the bottom, between the outer two
            for (k = 1; k < n; k++) {
                a = y[k - 1];
                b = y[k];
                d = y[k + 1];
                if (!isFinite(a) || !isFinite(b) || !isFinite(d) || Math.abs(b - a) > jump || Math.abs(d - b) > jump) continue;
                if (b > a && b >= d) highs.push(xs[k]);
                else if (b < a && b <= d) lows.push(xs[k]);
            }
            [[highs, 1, 'max'], [lows, -1, 'min']].forEach(function (kind) {
                var sign = kind[1];
                if (kind[0].length > KEY_MAX) return;
                function g(x) {
                    var v = f(x);
                    return isFinite(v) ? sign * v : -Infinity;
                }
                add(kind[0].map(function (x) {
                    var top = peak(g, x - dx, x + dx), best = g(top);
                    return snap(top, dx * 1e-4, function (q) { return g(q) >= best - 1e-15 * Math.max(1, Math.abs(best)); });
                }), function (x) {
                    var v = c.at(x, deg, true);
                    return { t: [v === 0 ? 'root' : kind[2]], x: x, y: v, i: i }; // a lowest point at 0, as x² has, is a root
                });
            });

            // two samples a few apart whose bends, their second differences, go opposite ways, with
            // no jump between: halving finds where the bend is 0, with the step of the samples and
            // then more finely. Not of a slope found by steps, whose bends its rounding makes
            if (!c.rough) {
                bends(y).forEach(function (h) {
                    var r = bisect(function (x) { return bend(x, dx); }, xs[h[0]], xs[h[1]], h[2]), lo, hi;
                    if (r === null || !(Math.abs(bend(r, dx)) <= h[3])) return;
                    lo = fine(r - dx);
                    hi = fine(r + dx);
                    if (lo * hi < 0) r = bisect(fine, r - dx, r + dx, lo) || r;
                    hi = Math.abs(fine(r));
                    r = snap(r, dx * 1e-6, function (q) { // as small, or as small as its rounding tells: 2, not 1.999999999987
                        return Math.abs(fine(q)) <= Math.max(hi, 2e-14 * (Math.abs(f(q - dx / 2)) + Math.abs(f(q)) + Math.abs(f(q + dx / 2))));
                    });
                    found.push({ t: ['infl'], x: r, y: c.at(r, deg, true), i: i });
                });
            }
            function bend(x, s) {
                return f(x - s) - 2 * f(x) + f(x + s);
            }
            // the bend with a quarter of the step, and the part of it that the step makes taken away
            function fine(x) {
                return 16 * bend(x, dx / 4) - bend(x, dx / 2);
            }

            if (view.x0 <= 0 && view.x1 >= 0) found.push({ t: ['yint'], x: 0, y: c.at(0, deg, true), i: i });
        });

        // the places where the samples y bend the other way: [one before, one after, its bend, the
        // smaller of their bends]. A bend as small as the values' rounding is none, as of a line
        function bends(y) {
            var out = [], last = -1, b = [], k, p, q, r;
            for (k = 1; k < n; k++) {
                p = y[k - 1];
                q = y[k];
                r = y[k + 1];
                if (!isFinite(p) || !isFinite(q) || !isFinite(r) || Math.abs(q - p) > jump || Math.abs(r - q) > jump) {
                    last = -1;
                    continue;
                }
                b[k] = p - 2 * q + r;
                if (Math.abs(b[k]) <= 1e-11 * (Math.abs(p) + Math.abs(q) + Math.abs(r))) continue;
                if (last > 0 && k - last <= 4 && b[last] * b[k] < 0) out.push([last, k, b[last], Math.min(Math.abs(b[last]), Math.abs(b[k]))]);
                last = k;
            }
            return out.length > KEY_MAX ? [] : out;
        }

        curves.forEach(function (c, i) {
            curves.forEach(function (e, j) {
                if (!c || !e || j <= i) return;
                add(zeros(function (x) { return c.at(x, deg) - e.at(x, deg); }, xs, xs.map(function (x, k) {
                    return ys[i][k] - ys[j][k];
                }), dx * 1e-6), function (x) { return { t: ['cross'], x: x, y: c.at(x, deg, true), i: i, j: j }; });
            });
        });

        // each line of an equation, or of an inequality of two, and where the others of it hold
        function lines(r) {
            return r ? (r.parts || [r]).map(function (part, k) {
                return { at: part.at, k: k, ok: !r.parts ? function () { return true; } : function (x, y) {
                    return r.parts.every(function (q, l) { return l === k || holds(q, x, y, deg); });
                } };
            }) : [];
        }
        function mark(t, x, y, i, k, j) {
            var p = { t: [t], x: x, y: y, i: i };
            if (k) p.k = k;
            if (j !== undefined) p.j = j;
            return p;
        }

        (rels || []).forEach(function (r, i) {
            var ys = [], dy = (view.y1 - view.y0) / n;
            for (k = 0; k <= n; k++) ys.push(view.y0 + k * dy);
            lines(r).forEach(function (line) {
                var flat = function (x) { return line.at(x, 0, deg); }, up = function (y) { return line.at(0, y, deg); };
                zeros(flat, xs, xs.map(flat), dx * 1e-6).forEach(function (x) {
                    if (line.ok(x, 0)) found.push(mark('xint', x, 0, i, line.k));
                });
                if (view.x0 <= 0 && view.x1 >= 0) {
                    zeros(up, ys, ys.map(up), dy * 1e-6).forEach(function (y) {
                        if (line.ok(0, y)) found.push(mark('yint', 0, y, i, line.k));
                    });
                }
                curves.forEach(function (c, j) {
                    var on;
                    if (!c || j === i) return;
                    on = function (x) { return line.at(x, c.at(x, deg), deg); };
                    zeros(on, xs, xs.map(on), dx * 1e-6).forEach(function (x) {
                        var y = c.at(x, deg, true);
                        if (line.ok(x, y)) found.push(mark('cross', x, y, Math.min(i, j), 0, Math.max(i, j)));
                    });
                });
            });
        });

        // where two equations cross, or the two lines of an inequality of two: in each square of a
        // grid of 80 across where both change sign, Newton's steps for both at once
        (rels || []).forEach(function (r, i) {
            (rels || []).forEach(function (e, j) {
                if (!r || !e || j < i) return;
                lines(r).forEach(function (a) {
                    lines(e).forEach(function (b) {
                        if (j === i && b.k <= a.k) return;
                        crossings(a, b, view, deg).forEach(function (p) {
                            if (a.ok(p.x, p.y) && b.ok(p.x, p.y)) found.push(mark('cross', p.x, p.y, i, 0, j));
                        });
                    });
                });
            });
        });

        (planes || []).forEach(function (c, i) {
            var ends, m = 800, us = [], at = [], du, k2;
            if (!c || c.kind === 'seq' || c.kind === 'field') return; // a sequence is its dots, marks enough of themselves; a slope field has no marks
            ends = c.range(deg);
            du = (ends[1] - ends[0]) / m;
            for (k2 = 0; k2 <= m; k2++) {
                us.push(ends[0] + k2 * du);
                at.push(c.at(us[k2], deg));
            }
            function along(h, s, t) {
                zeros(h, us, s, du * 1e-6).forEach(function (u) {
                    var p = c.at(u, deg), q = { t: [t], x: +p[0].toPrecision(12), y: +p[1].toPrecision(12), i: i, u: u };
                    if (t === 'xint') q.y = 0;
                    if (t === 'yint') q.x = 0;
                    found.push(q);
                });
            }
            along(function (u) { return c.at(u, deg)[1]; }, at.map(function (p) { return p[1]; }), 'xint');
            along(function (u) { return c.at(u, deg)[0]; }, at.map(function (p) { return p[0]; }), 'yint');
            curves.forEach(function (f, j) {
                var h = function (u) { var p = c.at(u, deg); return p[1] - f.at(p[0], deg); };
                if (!f || j === i) return;
                zeros(h, us, us.map(h), du * 1e-6).forEach(function (u) {
                    var p = c.at(u, deg);
                    found.push({ t: ['cross'], x: p[0], y: f.at(p[0], deg, true), i: i, j: j, u: u });
                });
            });
            (rels || []).forEach(function (r, j) {
                lines(r).forEach(function (line) {
                    var h = function (u) { var p = c.at(u, deg); return line.at(p[0], p[1], deg); };
                    if (j === i) return;
                    zeros(h, us, us.map(h), du * 1e-6).forEach(function (u) {
                        var p = c.at(u, deg);
                        if (line.ok(p[0], p[1])) found.push({ t: ['cross'], x: p[0], y: p[1], i: i, j: j, u: u });
                    });
                });
            });
        });

        // in the view, and one point for each place: the minimum of x² – 3 is where it meets the y axis
        found = found.filter(function (p) {
            return isFinite(p.y) && p.y >= view.y0 && p.y <= view.y1 && p.x >= view.x0 && p.x <= view.x1;
        }).sort(function (p, q) { return p.x - q.x; });
        return found.filter(function (p, at) {
            var same = found.slice(0, at).filter(function (q) {
                return q.i === p.i && Math.abs(q.x - p.x) < dx / 2 && Math.abs(q.y - p.y) <= 1e-9 * Math.max(1, Math.abs(p.y));
            })[0];
            if (same && same.t.indexOf(p.t[0]) < 0) same.t.push(p.t[0]);
            if (same && /^(root|yint|cross)$/.test(p.t[0]) && same.t.every(function (t) { return /^(min|max|infl)$/.test(t) || t === p.t[0]; })) {
                same.x = p.x; // found by halving, nearer than a top or a bend
                same.y = p.y;
            }
            return !same;
        });
    }

    // The place on an equation of x and y nearest x, y, seen with pixels ux wide and uy high:
    // Newton's steps down the slope of the difference of its sides, in pixels, then x rounded
    // to what a pixel tells apart where the curve goes more across than up, else y, or by
    // round(value, pixel) if given, and the other found again by halving, as short as it is as
    // good: (3, 4) on x² + y² = 25, not (2.9996, 4.0003). Null where it is not on the curve, as
    // where its sides only jump past each other, x = 1/y across y = 0
    function onRelation(rel, x, y, ux, uy, deg, round) {
        var a = x / ux, b = y / uy, h = 1e-3, k, f, gx, gy, n2, step, lo, hi, q, r, fr;
        function g(a, b) {
            return rel.at(a * ux, b * uy, deg);
        }
        for (k = 0; k < 40; k++) {
            f = g(a, b);
            gx = (g(a + h, b) - g(a - h, b)) / (2 * h);
            gy = (g(a, b + h) - g(a, b - h)) / (2 * h);
            n2 = gx * gx + gy * gy;
            if (!isFinite(f) || !isFinite(n2) || !n2) return null;
            if (f === 0) break;
            step = f / n2;
            a -= step * gx;
            b -= step * gy;
            if (Math.abs(step) * Math.sqrt(n2) < 1e-9) break;
        }
        f = g(a, b);
        lo = g(a - gx / Math.sqrt(n2), b - gy / Math.sqrt(n2));
        hi = g(a + gx / Math.sqrt(n2), b + gy / Math.sqrt(n2));
        if (!(lo * hi <= 0 && Math.abs(f) <= 1e-6 * (Math.abs(lo) + Math.abs(hi)))) return null;
        round = round || function (n, u) {
            q = Math.pow(10, Math.floor(Math.log10(u)));
            return +(Math.round(n / q) * q).toPrecision(12);
        };
        if (Math.abs(gy) >= Math.abs(gx)) { // across: x rounded, y found
            x = round(a * ux, ux);
            r = settle(function (t) { return rel.at(x, t, deg); }, b * uy, 4 * uy);
            return r === null ? { x: a * ux, y: b * uy } : { x: x, y: r };
        }
        y = round(b * uy, uy);
        r = settle(function (t) { return rel.at(t, y, deg); }, a * ux, 4 * ux);
        return r === null ? { x: a * ux, y: b * uy } : { x: r, y: y };

        // where f is 0 within d of t, by halving, as short as it is as good; null if it is not
        function settle(f, t, d) {
            var fa = f(t - d), fb = f(t + d), z;
            if (!(fa * fb <= 0)) return null;
            if (fa === 0) return t - d;
            z = bisect(f, t - d, t + d, fa);
            if (z === null) return null;
            fr = Math.abs(f(z));
            return snap(z, d * 1e-6, function (s) { return Math.abs(f(s)) <= fr; });
        }
    }

    // The slope of an equation of x and y at a place on it, dy/dx: its sides' difference changes
    // by x as much as by y the other way. Infinity where it goes straight up, as x = 3 does;
    // none where it has no slope to tell
    function relationSlope(rel, x, y, deg) {
        var hx = 1e-5 * Math.max(1, Math.abs(x)), hy = 1e-5 * Math.max(1, Math.abs(y)), fx, fy, m;
        function f(a, b) {
            return rel.at(a, b, deg);
        }
        fx = (f(x - 2 * hx, y) - 8 * f(x - hx, y) + 8 * f(x + hx, y) - f(x + 2 * hx, y)) / (12 * hx);
        fy = (f(x, y - 2 * hy) - 8 * f(x, y - hy) + 8 * f(x, y + hy) - f(x, y + 2 * hy)) / (12 * hy);
        if (!isFinite(fx) || !isFinite(fy) || (!fx && !fy)) return NaN;
        if (Math.abs(fy) <= 1e-9 * Math.abs(fx)) return Infinity;
        m = -fx / fy;
        return Math.abs(m) <= 1e-9 ? 0 : +m.toPrecision(10);
    }

    // The slope of a curve at x, dy/dx in the unit of x: from four values about it, and again
    // from four as close, which is as good as the two agree, to 10 digits at most; 0 where it
    // is 0 as far as they tell. Where the values are too far apart for that, as by the edge of
    // where the curve has values, ln x at 0.0001, or on a quick wave far out, sin x at 10^6,
    // it looks again a hundred and ten thousand times as close. None (NaN) where the curve has
    // no value at x; at a corner, as |x| at 0, where the slopes either side of x differ as much
    // however close they are, when on a smooth curve they come together; and where the two do
    // not agree to 3 digits, as at the upright tangent of x^(1/3) at 0
    function slope(c, x, deg) {
        var y = c.at(x, deg), h, m;
        if (!isFinite(y)) return NaN;
        for (h = 1e-4 * Math.max(1, Math.abs(x)); h >= 1e-8 * Math.max(1, Math.abs(x)); h /= 100) {
            m = slopeBy(c, x, deg, y, h);
            if (m !== undefined) return m;
        }
        return NaN;
    }

    // the slope as the values within 2h of x tell it; undefined where they cannot
    function slopeBy(c, x, deg, y, h) {
        var size, gap, near, m, n, digits;
        function f(d) {
            return c.at(x + d, deg);
        }
        function at(h) {
            return (f(-2 * h) - 8 * f(-h) + 8 * f(h) - f(2 * h)) / (12 * h);
        }
        size = Math.max(Math.abs(y), Math.abs(f(h)), Math.abs(f(-h)));
        gap = Math.abs(f(h) - 2 * y + f(-h)) / h;
        near = Math.abs(f(h / 10) - 2 * y + f(-h / 10)) / (h / 10);
        m = at(h);
        n = at(h / 2);
        if (!isFinite(gap) || !isFinite(near) || !isFinite(m) || !isFinite(n)) return undefined;
        if (gap > 1e-6 * size && near > gap / 2) return undefined; // a corner, or too far to tell
        if (Math.abs(n) <= 1e-10 * Math.abs(y) / h) return 0;
        digits = Math.floor(-Math.log10(Math.abs(m - n) / Math.abs(n)));
        return digits < 3 ? undefined : +n.toPrecision(Math.min(10, digits));
    }

    // The area under a curve from a to b, its integral: above the x axis it counts up, below
    // it down. Gauss and Kronrod's 15 values on each of 16 pieces, a piece halved again until
    // its two sums agree to 11 digits of the whole, or it is too small to halve; to 10 digits,
    // and 0 where it is 0 as far as that tells. None (NaN) where the curve has no value on the
    // way, as 1/x across 0, or where it does not settle in 20000 values, as sin(1/x) by 0
    var KRONROD = [0.991455371120812639, 0.949107912342758525, 0.864864423359769073, 0.741531185599394440,
            0.586087235467691130, 0.405845151377397167, 0.207784955007898468, 0],
        KRONROD_WEIGHT = [0.022935322010529225, 0.063092092629978553, 0.104790010322250184, 0.140653259715525919,
            0.169004726639267903, 0.190350578064785410, 0.204432940075298892, 0.209482141084727828],
        GAUSS_WEIGHT = [0, 0.129484966168869693, 0, 0.279705391489276668, 0, 0.381830050505118945, 0, 0.417959183673469388];

    function area(c, a, b, deg) {
        var left = 20000, n = 16, d = (b - a) / n, size = 0, sum = 0, k;
        function f(x) {
            return c.at(x, deg);
        }
        // the sum of Kronrod and how far Gauss's is from it, from a to b; NaN where a value is none
        function piece(a, b) {
            var m = (a + b) / 2, h = (b - a) / 2, kr = 0, ga = 0, k, y;
            left -= 15;
            for (k = 0; k < 8; k++) {
                y = k < 7 ? f(m - h * KRONROD[k]) + f(m + h * KRONROD[k]) : f(m);
                kr += KRONROD_WEIGHT[k] * y;
                ga += GAUSS_WEIGHT[k] * y;
            }
            return { s: kr * h, off: Math.abs(kr - ga) * h };
        }
        function more(a, b, tol, deep) {
            var p = piece(a, b), m = (a + b) / 2;
            if (!isFinite(p.s) || left < 0) return NaN;
            if (p.off <= tol || !deep || m <= a || m >= b) return p.s;
            return more(a, m, tol / 2, deep - 1) + more(m, b, tol / 2, deep - 1);
        }
        if (!(isFinite(a) && isFinite(b))) return NaN;
        if (a === b) return 0;
        for (k = 0; k <= 4 * n; k++) size += Math.abs(f(a + k * d / 4)) / (4 * n + 1); // how big the values are, for the digits
        if (!isFinite(size)) return NaN;
        size *= Math.abs(b - a);
        for (k = 0; k < n; k++) sum += more(a + k * d, k === n - 1 ? b : a + (k + 1) * d, 1e-11 * size / n, 30);
        if (!isFinite(sum)) return NaN;
        return Math.abs(sum) <= 1e-10 * size ? 0 : +sum.toPrecision(10);
    }

    // Where a region is in y at x, between lo and hi, in is how far into it a place is (within):
    // [from, to] for each run of it, from samples, and from the top of in between two of them
    // where it comes near, so a thin end of it is not missed; its ends found by halving. A run
    // that goes past lo or hi is to -Infinity or Infinity
    function spans(into, x, lo, hi) {
        var n = 100, dy = (hi - lo) / n, at = [], out = [], k, y, top, start = null;
        function g(y) {
            var v = into(x, y);
            return isNaN(v) ? -Infinity : v;
        }
        for (k = 0; k <= n; k++) {
            y = lo + k * dy;
            at.push({ y: y, v: g(y) });
        }
        // a high of in that is still out, between two lower: the top of in there, which may be in
        at = at.reduce(function (list, p, k) {
            var a = at[k - 1], b = at[k + 1], m;
            if (a && b && p.v <= 0 && p.v >= a.v && p.v >= b.v && isFinite(p.v)) {
                top = peak(g, a.y, b.y);
                m = g(top);
                if (m > 0) {
                    list.push(top < p.y ? { y: top, v: m } : p);
                    list.push(top < p.y ? p : { y: top, v: m });
                    return list;
                }
            }
            list.push(p);
            return list;
        }, []);
        at.forEach(function (p, k) {
            var q = at[k - 1], e;
            if (!k) {
                if (p.v > 0) start = -Infinity;
                return;
            }
            if ((p.v > 0) === (q.v > 0)) return;
            e = edge(q, p);
            if (p.v > 0) start = e;
            else {
                out.push([start, e]);
                start = null;
            }
        });
        if (start !== null) out.push([start, Infinity]);
        return out;

        // where in turns between two places, one in and one out
        function edge(p, q) {
            var a = p.y, b = q.y, inA = p.v > 0, m, i;
            if (isFinite(p.v) && isFinite(q.v)) {
                m = bisect(g, a, b, p.v);
                if (m !== null) return m;
            }
            for (i = 0; i < 80; i++) {
                m = (a + b) / 2;
                if (m <= a || m >= b) break;
                if ((g(m) > 0) === inA) a = m; else b = m;
            }
            return (a + b) / 2;
        }
    }

    // The area of a region from x = a to b: the lengths of its runs in y at each x, between lo and
    // hi, as spans finds them, added up by area. None (NaN) where it goes on past lo or hi
    function regionArea(into, a, b, lo, hi, deg) {
        return area({
            at: function (x) {
                return spans(into, x, lo, hi).reduce(function (sum, s) { return sum + (s[1] - s[0]); }, 0);
            }
        }, a, b, deg);
    }

    // ---------- history ---------- //

    // the units the functions of an angle in the expression were worked out in
    function units(n, found) {
        found = found || {};
        if (n) {
            if (n.deg !== undefined) found[n.deg === 2 ? 'Grad' : n.deg ? 'Deg' : 'Rad'] = true;
            units(n.arg, found);
            units(n.l, found);
            units(n.r, found);
        }
        return found;
    }

    // the text of what show prints, without tags: superscript characters stand in for them
    function asPlain(print) {
        return print().replace(/<[^>]+>/g, '');
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
        if (t.v === 'EE') return 'ᴇ';
        if (t.v === 'logy') return ' log<sub>y</sub> ';
        if (t.v === '√') return '<span class="calc-sq">√</span>'; // drawn, as the √ of the font reads as a V
        if (t.v === '-') return t.c === '-' ? '-' : ' – '; // a sign, or a subtraction
        if (t.v === '÷' && t.c === '/') return '/';
        return /^(\+|×|÷|nCr|nPr|mod|gcd|lcm)$/.test(t.v) ? ' ' + t.v + ' ' : t.v;
    }

    // a plain piece as it is shown; a template as it is drawn
    function html(piece) {
        return piece.s ? drawPiece(piece, [], 0, null) : piece.p.map(look).join('');
    }

    // the shown text of a piece: the superscripts as characters
    function untag(s) {
        return s.replace(/<sub>(\d+|y)<\/sub>/g, function (m, d) {
            return d === 'y' ? 'ᵧ' : d.replace(/./g, function (c) { return SUB.charAt(c); });
        }).replace(/<sup>(-?\d+|x)<\/sup>/g, function (m, d) {
            return d === 'x' ? 'ˣ' : d.replace(/./g, function (c) { return SUPER.charAt('0123456789-'.indexOf(c)); });
        }).replace(/<[^>]+>/g, '');
    }

    // ---------- the line as a tree, while it is edited ---------- //

    // A row is a list of pieces. A plain piece holds the tokens parse reads (p): a digit, an
    // operator, a computed number. A template holds its boxes (b), each a row of its own:
    //   s 'fn'    k sin, ln, abs and the like: b [its number]
    //   s 'root'  k '√': b [under it]; k 'x√y': b [the root, under it]
    //   s 'pow'   b [the power] of what is before it
    //   s 'logb'  b [base, number]
    //   s 'tpl'   k nCr, nPr, mod, gcd, lcm or EE, pressed with no number before: b [left, right]
    //   s 'box'   b [a number still to be entered], as of x² or 1/x pressed first
    //   s 'frac'  b [top, bottom]: a division in fraction mode, drawn one over the other
    // The cursor is at e.at in the row e.path leads to: the template and box of each row on the way
    var TEMPLATE_OPS = /^(nCr|nPr|mod|gcd|lcm|EE)$/, CARET = '<span class="calc-cursor"></span>',
        INFIX_KEYS = /^([+×÷–]|mod|nCr|nPr|gcd|lcm|EE)$/, // the keys of an operator between two numbers
        INFIX_PIECES = /^([+×÷-]|mod|nCr|nPr|gcd|lcm|EE)$/; // and what they write

    function tok(v, c) {
        return { t: 'op', v: v, c: c || v };
    }

    function digitPieces(s) {
        return s.split('').map(function (c) { return { p: [{ t: 'num', v: c, d: 1 }] }; });
    }

    function digitPiece(p) {
        return !p.s && p.p.length === 1 && !!p.p[0].d;
    }

    function opPiece(p, re) {
        return !p.s && p.p.length === 1 && p.p[0].t === 'op' && re.test(p.p[0].v);
    }

    // the number of pieces in a row, those in its templates as well
    function rowSize(row) {
        return row.reduce(function (n, p) { return n + 1 + (p.s ? p.b.reduce(function (m, r) { return m + rowSize(r); }, 0) : 0); }, 0);
    }

    function rowIn(list, path) {
        var row = list, i;
        for (i = 0; i < path.length; i++) row = row[path[i].i].b[path[i].k];
        return row;
    }

    function pathKey(path) {
        return path.map(function (s) { return s.i + ':' + s.k; }).join('/');
    }

    // a path from its key, if it leads to a box of the list
    function pathOf(list, key) {
        var path = [], row = list, ok = true;
        if (key) {
            key.split('/').forEach(function (part) {
                var m = /^(\d+):(\d+)$/.exec(part), p = m && row[+m[1]];
                if (!ok || !p || !p.s || !p.b[+m[2]]) {
                    ok = false;
                    return;
                }
                path.push({ i: +m[1], k: +m[2] });
                row = p.b[+m[2]];
            });
        }
        return ok ? path : null;
    }

    // true if the cursor's path goes through the box at path
    function goesThrough(cur, path) {
        var a = pathKey(cur), b = pathKey(path);
        return a === b || (b !== '' && a.indexOf(b + '/') === 0) || (b === '' && a !== '');
    }

    // the digits of a row that is a whole number and nothing else, typed or computed, else null
    function digitsOf(row) {
        var d = '';
        if (row.length === 1 && !row[0].s && row[0].p.length === 1 && row[0].p[0].t === 'num') d = row[0].p[0].v;
        else if (!row.every(function (p) { return digitPiece(p) && (d += p.p[0].v); })) return null;
        return /^\d+$/.test(d) ? d : null;
    }

    function bracketed(row) {
        return [tok('(')].concat(unpiece(row), [tok(')')]);
    }

    // a box in a function's own brackets: sin(30), and sin(30) again for one with its brackets typed
    function enclosed(row) {
        return row.length > 1 && bare(row) !== row ? unpiece(row) : bracketed(row);
    }

    // a row that holds one number alone, which needs no brackets: 25, π, sin(30), ³√8
    function atomic(row) {
        var p = row[0];
        if (!row.length) return false;
        if (row.every(digitPiece)) return true;
        if (row.length !== 1) return false;
        return p.s ? !/^(pow|tpl|box|frac)$/.test(p.s) : p.p.length === 1 && (p.p[0].t === 'const' || p.p[0].t === 'num');
    }

    // a box as it is written next to an operator or under a root: in brackets if more than a
    // number, and not in brackets already
    function grouped(row) {
        return atomic(row) || (row.length > 1 && bare(row) !== row) ? unpiece(row) : bracketed(row);
    }

    // the tokens parse reads; digits next to each other are one number, and a template
    // is written as its text: sin(30), ³√(8), (8)^(1/(2.5)), ^(3), log₂(8), (5) nCr (2)
    function unpiece(list) {
        var out = [];
        list.forEach(function (piece, n) {
            var b = piece.b, d, toks, next = list[n + 1], prev = list[n - 1],
                raised = !!next && (next.s === 'pow' || opPiece(next, /^[!%]$/));
            if (!piece.s) toks = piece.p;
            else if (piece.s === 'frac') { // ¾ after ÷ or nCr, or under a power, is one number: 6 ÷ (3/4), 5 nCr (2/3), (3/4)²
                toks = grouped(b[0]).concat([tok('÷', '/')], grouped(b[1]));
                if ((prev && opPiece(prev, /^(÷|mod|nCr|nPr|gcd|lcm|EE)$/)) || raised) toks = [tok('(')].concat(toks, [tok(')')]);
            }
            else if (piece.s === 'fn') toks = [{ t: 'fn', v: piece.k }].concat(enclosed(b[0]));
            else if (piece.s === 'root' && piece.k === '√') toks = [tok('√')].concat(enclosed(b[0]));
            else if (piece.s === 'root') {
                toks = (d = digitsOf(b[0])) !== null ? [{ t: 'sup', v: d }, tok('√')].concat(grouped(b[1])) :
                    grouped(b[1]).concat([tok('^'), tok('('), { t: 'num', v: '1' }, tok('÷', '/')], grouped(b[0]), [tok(')')]);
            } else if (piece.s === 'pow') { // a power of (1 ÷ 2) as typed: ^((1 ÷ 2)), as ^(1/2) reads as the root
                toks = grouped(b[0]);
                if (toks.length > 3 && toks[0].v === '(' && toks[1].t === 'num' && toks[1].v === '1' && toks[2].v === '÷') toks = bracketed([{ p: toks }]);
                toks = [tok('^')].concat(toks);
            }
            else if (piece.s === 'logb') {
                toks = (d = digitsOf(b[0])) !== null ? [{ t: 'fn', v: 'logy', b: d }].concat(enclosed(b[1])) :
                    enclosed(b[1]).concat([tok('logy', 'logᵧ')], enclosed(b[0]));
            } else if (piece.s === 'tpl') toks = grouped(b[0]).concat([piece.k === 'EE' ? tok('EE', 'ᴇ') : tok(piece.k)], grouped(b[1]));
            else toks = grouped(b[0]);
            // a power, ! or % after 5 nCr 2, a root or a logarithm is of all of it, as it is drawn: (5 nCr 2)²
            if (raised && /^(tpl|root|logb)$/.test(piece.s) && piece.k !== '√') toks = [tok('(')].concat(toks, [tok(')')]);
            // and a template that starts with a number after a number is times it: 1 ¾ is not 13/4
            if (piece.s && toks[0] && /^(num|const)$/.test(toks[0].t) && operand(out[out.length - 1])) toks = [tok('×')].concat(toks);
            // a number straight after a template is times it, ³√3 8 as 2π is: not one number with its last digits
            // and so is one after a number put in whole, Ans 5
            if ((piece.s ? piece.s !== 'box' : piece.p.length === 1 && piece.p[0].t === 'num' && !piece.p[0].d) &&
                next && !next.s && next.p.length === 1 && /^(num|const)$/.test(next.p[0].t)) toks = toks.concat([tok('×')]);
            toks.forEach(function (t) {
                var last = out[out.length - 1];
                if (t.d && last && last.d) last.v += t.v;
                else out.push(t.d ? { t: 'num', v: t.v, d: 1 } : t);
            });
        });
        return out;
    }

    // the text of tokens, as it would be pasted
    function tokText(toks) {
        return untag(toks.map(look).join('')).replace(/\s+/g, ' ').trim();
    }

    // tokens as a row: digits one by one, a function, a root, a power and a logarithm as
    // templates with their boxes. One whose bracket is not closed yet is marked open
    // a part of a fraction: the brackets round all of it go, as the line draws it
    function bare(row) {
        var depth = 0, k;
        if (row.length < 2 || !opPiece(row[0], /^\($/) || !opPiece(row[row.length - 1], /^\)$/)) return row;
        for (k = 0; k < row.length - 1; k++) {
            if (opPiece(row[k], /^\($/)) depth++;
            else if (opPiece(row[k], /^\)$/) && !--depth) return row;
        }
        return row.slice(1, -1);
    }

    function structure(toks, fractions) {
        var i = 0;

        function atom() { // a number or a constant alone, as under ³√8 or in 2^3
            var t = toks[i];
            if (!t || (t.t !== 'num' && t.t !== 'const')) return [];
            i++;
            return t.t === 'num' && !t.whole ? digitPieces(t.v) : [{ p: [t] }];
        }

        function supRow(v) {
            return v === 'x' ? [] : v.split('').map(function (c) {
                return c === '-' ? { p: [tok('-', '-')] } : { p: [{ t: 'num', v: c, d: 1 }] };
            });
        }

        // true if the ^ before i is followed by (1 ÷ x), all of the group: the text of a root
        // whose root is no whole number, as parse reads it back
        function rootGroup() {
            var k, depth = 0, u;
            if (!(toks[i] && toks[i].t === 'op' && toks[i].v === '(' && toks[i + 1] && toks[i + 1].t === 'num' &&
                toks[i + 1].v === '1' && toks[i + 2] && toks[i + 2].t === 'op' && toks[i + 2].v === '÷')) return false;
            for (k = i + 3; k < toks.length; k++) {
                u = toks[k];
                if (u.t !== 'op') continue;
                if (u.v === '(') depth++;
                else if (u.v === ')' && !depth--) return k > i + 3;
                else if (!depth && (/^(\+|×|÷)$/.test(u.v) || u.v === '-' && u.c !== '-')) return false;
            }
            return false;
        }

        function boxed(made) { // a template whose box runs to the ) that closes it
            var r = row(true);
            made.b.push(r.row);
            if (!r.closed) made.open = true;
            return made;
        }

        // the operand a power or a base takes after its sign: a number, or a function, a root or
        // a group whole, as in 10^log(1000)
        function operand() {
            var t = toks[i];
            if (!t) return [];
            if (t.t === 'num' || t.t === 'const') return atom();
            if (t.t === 'fn' || t.t === 'sup' || (t.t === 'op' && /^[√(]$/.test(t.v))) return bare(row(false, true).row);
            return [];
        }

        // close: the row ends at its ) as a box does; one: it ends after one operand
        function row(close, one) {
            var out = [], depth = 0, t, next, last, key, inner, fracs = [];

            function endFracs(d) { // what came after a ÷ is the bottom of its fraction, up to an operator or a bracket
                var f;
                while (fracs.length && fracs[fracs.length - 1].depth >= d) {
                    f = fracs.pop();
                    f.p.b[1] = bare(out.splice(f.start));
                }
            }

            while (i < toks.length) {
                t = toks[i++];
                next = toks[i];
                if (t.t === 'op' && t.v === ')') endFracs(depth); // the bracket a fraction is in ends it
                else if (t.t === 'op' && (/^(\+|×|÷)$/.test(t.v) || (t.v === '-' && t.c !== '-'))) endFracs(depth); // not nCr: it holds tighter
                if (t.t === 'op' && t.v === ')' && !depth && close) return { row: out, closed: true };
                if (fractions && t.t === 'op' && t.v === '÷') { // a division, drawn as a fraction
                    inner = { s: 'frac', b: [bare(out.splice(fracStart(out, out.length))), []] };
                    out.push(inner);
                    fracs.push({ p: inner, start: out.length, depth: depth });
                    continue;
                }
                if (t.t === 'num' && !t.whole) {
                    out.push.apply(out, digitPieces(t.v));
                } else if (t.t === 'fn' && t.v !== 'logy') {
                    key = t.v;
                    if (/^(sin|cos|tan)h?$/.test(key) && next && next.t === 'sup' && next.v === '-1') {
                        key += '-1';
                        next = toks[++i];
                    }
                    if (next && next.t === 'op' && next.v === '(') {
                        i++;
                        out.push(boxed({ s: 'fn', k: key, b: [] }));
                    } else {
                        out.push({ s: 'fn', k: key, b: [atom()] });
                    }
                } else if (t.t === 'fn') { // logᵧ, its base as written: log₅(8)
                    inner = { s: 'logb', b: [t.b ? digitPieces(String(t.b)) : []] };
                    if (next && next.t === 'op' && next.v === '(') {
                        i++;
                        out.push(boxed(inner));
                    } else {
                        inner.b.push(atom());
                        out.push(inner);
                    }
                } else if (t.t === 'op' && t.v === '√') {
                    last = out[out.length - 1];
                    inner = last && !last.s && last.p.length === 1 && last.p[0].t === 'sup' ? // ³√: the root before it
                        { s: 'root', k: 'x√y', b: [supRow(out.pop().p[0].v)] } : { s: 'root', k: '√', b: [] };
                    if (next && next.t === 'op' && next.v === '(') {
                        i++;
                        out.push(boxed(inner));
                    } else {
                        inner.b.push(atom());
                        out.push(inner);
                    }
                } else if (t.t === 'sup' && !(next && next.t === 'op' && next.v === '√')) {
                    out.push({ s: 'pow', b: [supRow(t.v)] }); // x², as a power to edit
                } else if (t.t === 'op' && t.v === '^') {
                    if (rootGroup()) { // 6^(1/58.35) is the root its text stands for, ⁵⁸·³⁵√6
                        i += 3;
                        inner = { s: 'root', k: 'x√y', b: [bare(row(true).row), bare(out.splice(operandStart(out, out.length)))] };
                        out.push(inner);
                    } else if (next && next.t === 'op' && next.v === '(') {
                        i++;
                        out.push(boxed({ s: 'pow', b: [] }));
                    } else {
                        out.push({ s: 'pow', b: [operand()], open: !next });
                    }
                } else if (t.t === 'op' && t.v === 'logy') { // 8 logᵧ 2.5: log₂.₅(8), its number before it
                    inner = { s: 'logb', b: [[], bare(out.splice(operandStart(out, out.length)))] };
                    if (next && next.t === 'op' && next.v === '(') {
                        i++;
                        inner.b[0] = row(true).row;
                    } else {
                        inner.b[0] = operand();
                    }
                    out.push(inner);
                } else {
                    if (t.t === 'op' && t.v === '(') depth++;
                    if (t.t === 'op' && t.v === ')') depth--;
                    // a fraction alone in brackets, (1/5), needs none drawn: but after ÷, or raised, they say which part
                    if (fractions && t.t === 'op' && t.v === ')' && out.length > 1 && out[out.length - 1].s === 'frac' &&
                        opPiece(out[out.length - 2], /^\($/) && !(out.length > 2 && opPiece(out[out.length - 3], /^÷$/)) &&
                        !(next && (next.t === 'sup' || (next.t === 'op' && /^[!%^]$/.test(next.v))))) {
                        out.splice(out.length - 2, 1);
                    } else {
                        out.push({ p: [t] });
                    }
                }
                // one operand taken: done, unless a root's ³ waits for its √
                if (one && !depth && out.length && !(t.t === 'sup' && toks[i] && toks[i].t === 'op' && toks[i].v === '√')) break;
            }
            endFracs(0);
            return { row: out, closed: false };
        }

        return row(false).row;
    }

    // the pieces of an expression node
    function piecesOf(node, fractions) {
        var table = [], s;
        marks = table;
        try {
            s = asPlain(function () { return show(node); });
        } finally {
            marks = null;
        }
        return structure(tokens(s, table) || [], fractions);
    }

    // the cursor at the end of what is still open in a row, as in tan(45 or ³√(8; the marks go
    function openCursor(e) {
        var row = e.list, p;
        e.path = [];
        while (row.length && (p = row[row.length - 1]).s && p.open) {
            e.path.push({ i: row.length - 1, k: p.b.length - 1 });
            row = p.b[p.b.length - 1];
        }
        e.at = row.length;
        (function clean(r) {
            r.forEach(function (q) {
                if (q.s) {
                    delete q.open;
                    q.b.forEach(clean);
                }
            });
        })(e.list);
    }

    // a saved edit with a path that still leads somewhere, and its place in that row
    function fixEdit(e) {
        var path = Array.isArray(e.path) ? pathOf(e.list, pathKey(e.path.filter(function (s) { return s && s.i >= 0; }))) : [];
        e.path = path || [];
        e.at = Math.max(0, Math.min(rowIn(e.list, e.path).length, e.at | 0));
    }

    // the cursor one place on: into a template's first box, on to its next box, out after it
    function stepRight(e) {
        var row = rowIn(e.list, e.path), p = row[e.at], up;
        if (e.at < row.length) {
            if (p.s) {
                e.path.push({ i: e.at, k: 0 });
                e.at = 0;
            } else {
                e.at++;
            }
            return true;
        }
        if (!e.path.length) return false;
        up = e.path.pop();
        p = rowIn(e.list, e.path)[up.i];
        if (up.k + 1 < p.b.length) {
            e.path.push({ i: up.i, k: up.k + 1 });
            e.at = 0;
        } else {
            e.at = up.i + 1;
        }
        return true;
    }

    // and back: into a template's last box, from the end
    function stepLeft(e) {
        var row = rowIn(e.list, e.path), p = row[e.at - 1], up;
        if (e.at > 0) {
            if (p.s) {
                e.path.push({ i: e.at - 1, k: p.b.length - 1 });
                e.at = p.b[p.b.length - 1].length;
            } else {
                e.at--;
            }
            return true;
        }
        if (!e.path.length) return false;
        up = e.path.pop();
        p = rowIn(e.list, e.path)[up.i];
        if (up.k > 0) {
            e.path.push({ i: up.i, k: up.k - 1 });
            e.at = p.b[up.k - 1].length;
        } else {
            e.at = up.i;
        }
        return true;
    }

    // where the number before the place at in a row starts: 25, π, sin(30), (2 + 3), with its
    // powers and marks, 4², 5!. at if there is none
    function operandStart(row, at) {
        var i = at, p, depth;
        while (i > 0 && (row[i - 1].s === 'pow' || opPiece(row[i - 1], /^[!%]$/))) i--;
        p = row[i - 1];
        if (!p) return at;
        if (digitPiece(p)) {
            while (i > 0 && digitPiece(row[i - 1])) i--;
            return i;
        }
        if (p.s) return i - 1;
        if (p.p.length === 1 && (p.p[0].t === 'const' || p.p[0].t === 'num')) return i - 1;
        if (opPiece(p, /^\)$/)) {
            for (depth = 0, i--; i >= 0; i--) {
                if (opPiece(row[i], /^\)$/)) depth++;
                else if (opPiece(row[i], /^\($/) && !--depth) return i;
            }
        }
        return at;
    }

    // where the number after the place j of a row ends: 4, -4, π, sin(30), (2 + 3), with its
    // powers and marks
    function operandEnd(row, j) {
        var p, depth;
        if (row[j] && opPiece(row[j], /^-$/) && !infixAt(row, j)) j++; // a sign, not the – of 5 – 3
        p = row[j];
        if (!p) return j;
        if (digitPiece(p)) {
            while (row[j] && digitPiece(row[j])) j++;
        } else if (opPiece(p, /^\($/)) {
            for (depth = 0; j < row.length; j++) {
                if (opPiece(row[j], /^\($/)) depth++;
                else if (opPiece(row[j], /^\)$/) && !--depth) {
                    j++;
                    break;
                }
            }
        } else if (p.s || (p.p.length === 1 && (p.p[0].t === 'const' || p.p[0].t === 'num'))) {
            j++;
        } else {
            return j;
        }
        while (row[j] && (row[j].s === 'pow' || opPiece(row[j], /^[!%]$/))) j++;
        return j;
    }

    // the operators that hold tighter than ÷, so a fraction takes their numbers whole: 5 nCr 2 ÷ 3
    // is (5 nCr 2) over 3, 3 ÷ 5 nCr 2 is 3 over (5 nCr 2)
    var TIGHT = /^(nCr|nPr|mod|gcd|lcm|EE|logy)$/;

    function fracStart(row, at) {
        var s = operandStart(row, at), t;
        while (s > 0 && opPiece(row[s - 1], TIGHT) && (t = operandStart(row, s - 1)) < s - 1) s = t;
        return s;
    }

    function fracEnd(row, j) {
        var e = operandEnd(row, j), f;
        while (row[e] && opPiece(row[e], TIGHT) && (f = operandEnd(row, e + 1)) > e + 1) e = f;
        return e;
    }

    // each division of a row and its boxes a fraction, the number before it on top and the one
    // after it below, as it reads: 2 ÷ 3 × 4 is ⅔ × 4. A ÷ the cursor was next to leaves it
    // by the part of the fraction it was at
    function toFracs(row) {
        var i, s, e, f, at;
        row.forEach(function (p) {
            if (p.s) p.b = p.b.map(toFracs);
        });
        for (i = 0; i < row.length; i++) {
            if (!opPiece(row[i], /^÷$/)) continue;
            s = fracStart(row, i);
            e = fracEnd(row, i + 1);
            f = { s: 'frac', b: [bare(row.slice(s, i)), bare(row.slice(i + 1, e))] };
            at = row[i].cur;
            if (at === 'before') {
                if (f.b[0].length) f.b[0][f.b[0].length - 1].cur = 'after';
                else f.curBox = 0;
            } else if (at === 'after') {
                if (f.b[1].length) f.b[1][0].cur = 'before';
                else f.curBox = 1;
            }
            f.b = f.b.map(toFracs); // a division in a part of it, as 6 ÷ (3 ÷ 4)
            row.splice(s, e - s, f);
            i = s;
        }
        return row;
    }

    // a row with a + or a – of its own, which a division before or after it would split: 5 + 1
    function summed(row) {
        var depth = 0;
        return row.some(function (p) {
            if (opPiece(p, /^\($/)) depth++;
            else if (opPiece(p, /^\)$/)) depth--;
            return !depth && opPiece(p, /^(\+|-)$/) && !(p.p[0].v === '-' && p.p[0].c === '-');
        });
    }

    // and back: each fraction a division, in brackets where the line needs them: (5 + 1) ÷ 2,
    // 6 ÷ (3 ÷ 4), (3 ÷ 4)²
    function fromFracs(row) {
        var out = [];
        row.forEach(function (p, n) {
            var next = row[n + 1], prev = out[out.length - 1], all, made, div;
            if (p.s) p.b = p.b.map(fromFracs);
            if (p.s !== 'frac') return out.push(p);
            all = (prev && opPiece(prev, /^÷$/)) || (next && (next.s === 'pow' || opPiece(next, /^[!%]$/)));
            div = { p: [tok('÷')] };
            made = [].concat(all ? [{ p: [tok('(')] }] : [], // the top in brackets only for a + or a –, the bottom for any operator
                summed(p.b[0]) ? [{ p: [tok('(')] }].concat(p.b[0], [{ p: [tok(')')] }]) : p.b[0], [div],
                compound(p.b[1]) ? [{ p: [tok('(')] }].concat(p.b[1], [{ p: [tok(')')] }]) : p.b[1],
                all ? [{ p: [tok(')')] }] : []);
            if (p.curBox === 0) div.cur = 'before';
            if (p.curBox === 1) div.cur = 'after';
            if (p.cur === 'before') made[0].cur = 'before';
            if (p.cur === 'after') made[made.length - 1].cur = 'after';
            out.push.apply(out, made);
        });
        return out;
    }

    // the first empty box of the line, from the left, or null
    function firstEmpty(list) {
        var found = null;
        (function look(row, path) {
            row.forEach(function (p, i) {
                if (found || !p.s) return;
                p.b.forEach(function (box, k) {
                    if (found) return;
                    if (!box.length) found = path.concat([{ i: i, k: k }]);
                    else look(box, path.concat([{ i: i, k: k }]));
                });
            });
        })(list, []);
        return found;
    }

    // a row holding more than one number, as 5 + 1, which brackets keep together next to another
    function compound(row) {
        var depth = 0;
        return row.some(function (p) {
            if (opPiece(p, /^\($/)) depth++;
            else if (opPiece(p, /^\)$/)) depth--;
            return !depth && !p.s && p.p.length === 1 && p.p[0].t === 'op' && /^(\+|-|×|÷|nCr|nPr|mod|gcd|lcm|EE|logy)$/.test(p.p[0].v) &&
                !(p.p[0].v === '-' && p.p[0].c === '-');
        });
    }

    // a calculation drawn as the editor draws it, the same templates whether it is edited or not
    function drawnNode(node, stacked) {
        return drawRow(piecesOf(node, stacked), [], null);
    }

    // the line as it is edited: each piece in a span a click finds (data-e: its row and place),
    // each box in one (data-r: its row). The box with the cursor is framed, dark; one it is in,
    // lighter; an empty one dotted. A function has its brackets around its box: tan(□), tan(3 + 6)
    function drawRow(row, path, e) {
        var here = !!e && pathKey(e.path) === pathKey(path), out = '', i;
        for (i = 0; i <= row.length; i++) {
            if (here && e.at === i) out += CARET;
            if (i < row.length) out += drawPiece(row[i], path, i, e);
        }
        return out;
    }

    function drawBox(p, path, i, k, e) {
        var sub = path.concat([{ i: i, k: k }]), key = pathKey(sub), here = !!e && pathKey(e.path) === key,
            inside = !!e && goesThrough(e.path, sub);
        if (!p.b[k].length) return '<span class="calc-fr-empty calc-box' + (here ? ' calc-focus' : '') + '" data-r="' + key + '"></span>';
        return '<span' + (inside ? ' class="calc-frame' + (here ? ' calc-focus' : '') + '"' : '') + ' data-r="' + key + '">' +
            drawRow(p.b[k], sub, e) + '</span>';
    }

    function drawPiece(p, path, i, e) {
        var body;
        function box(k) {
            return drawBox(p, path, i, k, e);
        }
        function open(k) { // in it, or empty: its box alone
            return !!e && goesThrough(e.path, path.concat([{ i: i, k: k }])) || !p.b[k].length;
        }
        function paren(k) { // a function's number, in its brackets: sin(□), sin(30)
            return '(' + box(k) + ')';
        }
        function kept(k) { // a number next to an operator: in brackets if it is more than one
            return !open(k) && compound(p.b[k]) ? '(' + box(k) + ')' : box(k);
        }
        if (!p.s) body = p.p.map(look).join('');
        else if (p.s === 'fn') body = (NAME[p.k] || p.k) + paren(0);
        else if (p.s === 'root') body = (p.k === 'x√y' ? '<sup>' + box(0) + '</sup>' : '') + '<span class="calc-root">' + box(p.b.length - 1) + '</span>';
        else if (p.s === 'pow') body = '<sup>' + box(0) + '</sup>';
        else if (p.s === 'logb') body = 'log<sub>' + box(0) + '</sub>' + paren(1);
        else if (p.s === 'tpl') body = kept(0) + (p.k === 'EE' ? 'ᴇ' : ' ' + p.k + ' ') + kept(1);
        else if (p.s === 'frac') body = '<span class="calc-fr"><span>' + box(0) + '</span><span>' + box(1) + '</span></span>';
        else body = kept(0);
        return '<span data-e="' + pathKey(path) + '|' + i + '">' + body + '</span>';
    }

    // the piece a key writes at the cursor; null for a key that writes nothing. The keys of a
    // template, sin, √, x², 1/x, eˣ, are made by insert before it
    function written(key, e) {
        var p;
        function op(v, c) {
            return { t: 'op', v: v, c: c || v };
        }
        if (/^[\d.]$/.test(key)) p = [{ t: 'num', v: key, d: 1 }];
        else if (key === '–' || key === '+/–') p = [op('-', key === '–' ? '–' : '-')];
        else if (/^([+×÷()%]|EE|nCr|nPr|mod|gcd|lcm)$/.test(key)) p = [op(key)];
        else if (key === 'x!') p = [op('!')];
        else if (key === 'π' || key === 'e') p = [{ t: 'const', v: key }];
        else if (VARKEY.test(key)) p = [{ t: 'const', v: key.charAt(1) }];
        else if (key === 'Ans' || key === 'mr' || key === 'Rand') {
            p = [{ t: 'num', v: String(key === 'Ans' ? e.ans : key === 'mr' ? e.memory : Math.random()), whole: true }];
        } else return null;
        return { p: p };
    }

    // ---------- number format ---------- //

    // a computed number in Fix, Sci or Eng notation with f.places digits after
    // the point, rounded as the number reads (1.005 is 1.01); null for the
    // usual notation, and 0 for zero in Sci and Eng. Fix shows numbers from 1e16 in Sci, as the usual one does.
    // Places 'auto' gives as many digits as the number needs, up to 13 as the usual notation: Fix is then the usual one
    function format(x, f) {
        var auto = f && f.places === 'auto', places = Math.max(0, Math.min(9, (f && f.places) | 0)), o, s;
        if (!f || !/^(fix|sci|eng)$/.test(f.notation) || !isFinite(x) || auto && f.notation === 'fix') return null;
        if (x === 0 && f.notation !== 'fix') return '0'; // no 0.000e+0; Fix keeps its places: 0.00
        o = auto ? { useGrouping: false, maximumSignificantDigits: 13 } :
            { useGrouping: false, minimumFractionDigits: places, maximumFractionDigits: places };
        if (f.notation !== 'fix' || Math.abs(x) >= 1e16) o.notation = f.notation === 'eng' ? 'engineering' : 'scientific';
        s = new Intl.NumberFormat('en-US', o).format(x);
        return s.replace(/^-(?=[0.]*(E|$))/, '').replace(/E(-?)/, function (m, sign) { // no -0.00; 1.5e+3 as before
            return 'e' + (sign || '+');
        });
    }

    // true for a way to write numbers whose decimal mark is a comma: 'dot', 1.234,5, and 'spacecomma', 1 234,5
    function comma(how) {
        return how === 'dot' || how === 'spacecomma';
    }

    // each number in a line with sep between its thousands, none for '', and point as its decimal mark
    function numerals(s, sep, point) {
        return s.replace(/(?<![\d.])(\d+)(\.\d*)?/g, function (all, whole, rest) {
            return (sep && whole.length > 3 ? whole.replace(/\B(?=(\d{3})+$)/g, sep) : whole) + (rest ? point + rest.slice(1) : '');
        });
    }

    // commas between the thousands of each number in a line: 1,234,567.891; with
    // how 'space', thin spaces: 1 234 567.891. With 'dot' and 'spacecomma' the
    // decimal mark is a comma: 1.234.567,891 and 1 234 567,891
    function group(s, how) {
        var sep = how === 'dot' ? '.' : how === 'space' || how === 'spacecomma' ? '\u2009' : ',', point = comma(how) ? ',' : '.';
        // a number of the drawn line is a digit to a piece: each third one from its decimal mark has
        // the mark of the thousands before it, in the piece itself, so a click still finds the pieces
        s = s.replace(/(?:<span data-e="[^"]*">[\d.]<\/span>)+/g, function (run) {
            var parts = run.match(/<span data-e="[^"]*">[\d.]<\/span>/g),
                chars = parts.map(function (p) { return p.charAt(p.length - 8); }),
                whole = chars.indexOf('.') < 0 ? chars.length : chars.indexOf('.');
            return parts.map(function (p, k) {
                var c = chars[k] === '.' ? point : (k && k < whole && !((whole - k) % 3) ? sep : '') + chars[k];
                return p.slice(0, p.length - 8) + c + '</span>';
            }).join('');
        });
        return numerals(s, sep, point);
    }

    // the decimal mark alone, as how writes it: where the thousands are not apart,
    // in an equation with the cursor in it, a key of it at a time, and in what is copied
    function decimal(s, how) {
        if (!comma(how)) return s;
        if (s === '.') return ',';
        return numerals(s.replace(/(<span data-e="[^"]*">)\.(<\/span>)/g, '$1,$2'), '', ','); // the point of a drawn line is a piece of its own
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
    // with semicolons a comma is the decimal mark (1,5; 2,5), and so it is
    // wherever it is the one in use (comma): 1.234,5 is then one number. A thin or
    // a no-break space before three digits is of the number, as a page or the display writes 1 234.
    // by: what alone is between two numbers, with new lines and tabs, in place of all that:
    // 'line', 'tab', 'space', 'comma', 'semi', 'pipe' or 'colon'. Each part is then read as a pasted number is, so
    // 1 234,5, 1,234.5 and $1,200 are one number each.
    // bad: the parts that are no numbers
    function numbers(text, comma, by) {
        var s = String(text), semi = comma || s.indexOf(';') > -1, values = [], bad = [],
            only = { line: /[\t\r\n]+/, tab: /[\t\r\n]+/, space: /[ \t\r\n]+/, comma: /[,\t\r\n]+/, semi: /[;\t\r\n]+/,
                pipe: /[|\t\r\n]+/, colon: /[:\t\r\n]+/ }[by];
        if (!only) s = s.replace(/(\d)[\u00A0\u2009\u202F](?=\d{3}(?!\d))/g, '$1');
        s.split(only || (semi ? /[\s;]+/ : /[\s,]+/)).forEach(function (part) {
            var t = part.trim().replace(/^[−–]/, '-');
            if (!t) return;
            if (only) t = separators(money(t).trim(), comma).replace(/^-\s+/, '-');
            else if (comma) t = separators(t, true);
            else if (semi) t = t.replace(',', '.');
            if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) && isFinite(+t)) values.push(+t);
            else bad.push(part.trim());
        });
        return { values: values, bad: bad };
    }

    // the median of numbers in order; NaN of none
    function medianOf(sorted) {
        var n = sorted.length, mid = n >> 1;
        return !n ? NaN : n % 2 ? sorted[mid] : arith('÷', arith('+', sorted[mid - 1], sorted[mid]), 2);
    }

    // the number that comes most often, of numbers in order; NaN where none comes twice, or
    // where two or more come most often
    function modeOf(sorted) {
        var best = NaN, most = 1, tie = false, run = 1, i;
        for (i = 1; i <= sorted.length; i++) {
            if (i < sorted.length && sorted[i] === sorted[i - 1]) {
                run++;
                continue;
            }
            if (run > most) {
                most = run;
                best = sorted[i - 1];
                tie = false;
            } else if (run === most && most > 1) {
                tie = true;
            }
            run = 1;
        }
        return tie ? NaN : best;
    }

    // n, the sum, the sum of the squares, the mean, the standard deviation of
    // the list as the whole population (σ) and as a sample of one (s, NaN for
    // a single number) and the variance of a sample, s²; min, the quartiles,
    // the median, max, the range, the interquartile range and the mode. The
    // quartiles are as a TI-84 and most school books find them: the medians of the
    // half below the median and the half above it, the median itself in neither.
    // values: the numbers in order. The sums and the mean are worked
    // out exactly, as + – × ÷ are: the mean of 0.1, 0.2 and 0.3 is 0.2
    function stats(text, comma, by) {
        var read = numbers(text, comma, by), xs = read.values, n = xs.length, r = { n: n, bad: read.bad },
            sum = 0, squares = 0, spread = 0, sorted;
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
        r.vars = n > 1 ? tidy(arith('÷', spread, n - 1)) : NaN;
        sorted = xs.slice().sort(function (a, b) { return a - b; });
        r.values = sorted;
        r.min = sorted[0];
        r.max = sorted[n - 1];
        r.median = medianOf(sorted);
        r.q1 = medianOf(sorted.slice(0, n >> 1));
        r.q3 = medianOf(sorted.slice(n - (n >> 1)));
        r.iqr = n > 1 ? arith('–', r.q3, r.q1) : NaN;
        r.range = arith('–', r.max, r.min);
        r.mode = modeOf(sorted);
        return r;
    }

    // Pairs of numbers, x and y on each line, as two columns of a spreadsheet are pasted:
    // n; the sums of x, y, x², y² and xy; the means; the standard deviations of each, as a
    // sample (sx, sy) and as the whole population (σx, σy); the covariance of a sample; and the
    // line of best fit by least squares, y = a + bx, with its correlation r and r². by: what
    // is between x and y, as for a list, new lines being between the pairs whatever it is.
    // xs and ys: the pairs read. bad: the lines that are no pair
    function pairs(text, comma, by) {
        var xs = [], ys = [], bad = [], r = { n: 0, bad: bad, xs: xs, ys: ys }, n, dxx = 0, dyy = 0, dxy = 0;
        String(text).split(/\r\n|\r|\n/).forEach(function (line) {
            var read;
            if (!line.trim()) return;
            read = numbers(line, comma, by === 'line' ? 'auto' : by);
            if (read.values.length === 2 && !read.bad.length) {
                xs.push(read.values[0]);
                ys.push(read.values[1]);
            } else {
                bad.push(line.trim());
            }
        });
        n = r.n = xs.length;
        if (!n) return r;
        r.sumx = r.sumy = r.sumx2 = r.sumy2 = r.sumxy = 0;
        xs.forEach(function (x, i) {
            var y = ys[i];
            r.sumx = arith('+', r.sumx, x);
            r.sumy = arith('+', r.sumy, y);
            r.sumx2 = arith('+', r.sumx2, arith('×', x, x));
            r.sumy2 = arith('+', r.sumy2, arith('×', y, y));
            r.sumxy = arith('+', r.sumxy, arith('×', x, y));
        });
        r.xmean = arith('÷', r.sumx, n);
        r.ymean = arith('÷', r.sumy, n);
        xs.forEach(function (x, i) {
            var dx = arith('–', x, r.xmean), dy = arith('–', ys[i], r.ymean);
            dxx = arith('+', dxx, arith('×', dx, dx));
            dyy = arith('+', dyy, arith('×', dy, dy));
            dxy = arith('+', dxy, arith('×', dx, dy));
        });
        r.sdpx = tidy(Math.sqrt(arith('÷', dxx, n)));
        r.sdpy = tidy(Math.sqrt(arith('÷', dyy, n)));
        r.sx = n > 1 ? tidy(Math.sqrt(arith('÷', dxx, n - 1))) : NaN;
        r.sy = n > 1 ? tidy(Math.sqrt(arith('÷', dyy, n - 1))) : NaN;
        r.cov = n > 1 ? tidy(arith('÷', dxy, n - 1)) : NaN;
        r.b = dxx ? tidy(arith('÷', dxy, dxx)) : NaN; // no line where every x is the same
        r.a = isFinite(r.b) ? tidy(arith('–', r.ymean, arith('×', r.b, r.xmean))) : NaN;
        r.r = dxx && dyy ? tidy(Math.max(-1, Math.min(1, dxy / Math.sqrt(dxx * dyy)))) : NaN;
        r.r2 = tidy(r.r * r.r);
        return r;
    }

    // ---------- engine ---------- //

    LETTERS.split('').forEach(function (k) { stored[k] = 0; }); // each 0 until a value is stored, as on a TI or a Casio

    // the letters of A to J an expression has, in the order they come: A + 2B is A, B
    function lettersIn(n, out) {
        out = out || [];
        if (!n || typeof n !== 'object') return out;
        if (n.t === 'const' && VAR.test(n.name) && out.indexOf(n.name) < 0) out.push(n.name);
        lettersIn(n.arg, out);
        lettersIn(n.l, out);
        lettersIn(n.r, out);
        return out;
    }

    // what each letter of an expression holds now, for the history: { A: 5, B: 2 }; null for none
    function lettersNow(n) {
        var used = lettersIn(n);
        return used.length ? used.reduce(function (o, k) { o[k] = stored[k]; return o; }, {}) : null;
    }

    function Engine() {
        this.vars = stored; // the letters A to J, by name
        this.memory = 0;
        this.ans = 0; // the last result, for the Ans key
        this.past = []; // finished calculations, oldest first: { node, value, frac: 1 if done in fraction mode, dms: 1 in °′″ }
        this.fraction = false; // fraction mode is on: set by the display, kept with each calculation in the history
        this.dms = false; // results are shown in degrees, minutes and seconds: the same
        this.fnFirst = true; // function keys go before their number, tan 45; off only while pasted text is typed in
        this.comma = false; // the decimal mark shown is a comma, so a pasted 1.234 is 1234: the same
        this.reset();
    }

    Engine.prototype.reset = function () {
        this.levels = [newLevel()]; // one per open bracket
        this.value = '0'; // what the display shows
        this.entry = 'fresh'; // fresh: waiting for an operand, typing: number being typed, result: computed value
        this.node = null; // expression of the value, null for a plain number
        this.done = null; // finished expression after '='
        this.to = ''; // the letter its result was stored in, 5 + 3 → A: shown in place of its =
        this.error = false;
        this.failed = ''; // equation that produced the error
        this.history = []; // earlier states of the calculation in progress, for DEL
        this.edit = null; // while the cursor is inside the equation: { list: pieces, at: cursor }
        this.failedEdit = null; // the pieces of the equation that failed, to edit it
    };

    Engine.prototype.snapshot = function () {
        return JSON.stringify({
            levels: this.levels, value: this.value, entry: this.entry, node: this.node,
            done: this.done, to: this.to, error: this.error, failed: this.failed, edit: this.edit, failedEdit: this.failedEdit
        });
    };

    Engine.prototype.restore = function (snap) {
        var s = JSON.parse(snap);
        if (!s || !Array.isArray(s.levels) || !s.levels.length || typeof s.value !== 'string' ||
            !s.levels.every(function (lvl) { return lvl && Array.isArray(lvl.stack) && (!lvl.fn || leads(lvl.fn, 'fresh')); })) {
            throw new Error('bad calculator state');
        }
        this.levels = s.levels;
        this.value = s.value;
        this.entry = s.entry;
        this.node = s.node;
        this.done = s.done;
        this.to = s.done && typeof s.to === 'string' && VAR.test(s.to) ? s.to : '';
        this.error = s.error;
        this.failed = s.failed;
        this.edit = s.edit && Array.isArray(s.edit.list) && s.edit.list.length ? s.edit : null;
        if (this.edit) fixEdit(this.edit);
        this.failedEdit = Array.isArray(s.failedEdit) ? s.failedEdit : null;
    };

    Engine.prototype.save = function () {
        return { state: this.snapshot(), history: this.history.slice(), past: this.past.slice(), ans: this.ans, vars: this.letters() };
    };

    Engine.prototype.load = function (data) {
        this.ans = isFinite(data.ans) ? +data.ans : 0;
        if (data.vars && typeof data.vars === 'object') {
            LETTERS.split('').forEach(function (k) { stored[k] = isFinite(data.vars[k]) ? +data.vars[k] : 0; });
        }
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
        entry = this.pastEntry();
        if (last && JSON.stringify(last) === JSON.stringify(entry)) return; // the same one again
        this.past.push(entry);
        this.trimPast();
    };

    // the finished calculation as the history keeps it, with the values its letters had
    Engine.prototype.pastEntry = function () {
        var entry = { node: this.done, value: this.value }, vars = lettersNow(this.done);
        if (this.fraction) entry.frac = 1; // shown as it was: fractions, or decimals
        if (this.dms) entry.dms = 1; // or degrees, minutes and seconds
        if (vars) entry.vars = vars;
        return entry;
    };

    // STO→: the line worked out as = does, its result kept in the letter, as 5 + 3 → A of a TI;
    // a result shown is kept as it is. The history's line of it says → A in place of its =.
    // False if nothing was stored: the line cannot be worked out, or a box is still empty
    Engine.prototype.store = function (letter, deg) {
        var last, entry;
        if (!VAR.test(letter) || this.error) return false;
        if (!this.done) {
            this.press('=', deg);
            if (this.error || !this.done) return false;
        }
        last = this.past[this.past.length - 1];
        entry = this.pastEntry(); // the letters as they were before
        entry.to = letter;
        if (last && JSON.stringify(last.node) === JSON.stringify(entry.node) && last.value === entry.value) {
            // the letters it was worked out with, not as they are now: A + 1 → A, then → B, is of the A before
            if (last.vars) entry.vars = last.vars;
            else delete entry.vars;
            if (!last.to) this.past.pop(); // the line just worked out, now with its letter
        }
        last = this.past[this.past.length - 1];
        if (!(last && JSON.stringify(last) === JSON.stringify(entry))) this.past.push(entry);
        this.trimPast();
        stored[letter] = +this.value;
        this.ans = +this.value;
        this.to = letter;
        return true;
    };

    // a number put in a letter, as typed in the list of them; false if it is no number
    Engine.prototype.setLetter = function (letter, n) {
        if (!VAR.test(letter) || n === '' || n === null || !isFinite(n)) return false;
        stored[letter] = +n;
        return true;
    };

    // the values of A to J, { A: 0, B: 5 … }; clear: all back to 0
    Engine.prototype.letters = function (clear) {
        if (clear) LETTERS.split('').forEach(function (k) { stored[k] = 0; });
        return LETTERS.split('').reduce(function (o, k) { o[k] = stored[k]; return o; }, {});
    };

    // a calculation in the history, for showing: the equation as text with
    // <sup>/<sub> tags (stacked: its divisions drawn as fractions), as plain
    // text, the result, and the units its angles were in ('Deg', 'Grad', 'Rad',
    // 'Deg Rad' … or '')
    Engine.prototype.pastLine = function (i, stacked) {
        var p = this.past[i];
        return {
            line: drawnNode(p.node, stacked) + (p.to ? ' → ' + p.to : ' ='),
            text: asPlain(function () { return show(p.node); }) + (p.to ? ' → ' + p.to : ' ='),
            result: short(p.value),
            // what its letters held as it was worked out: A = 5, B = 2
            letters: p.vars ? Object.keys(p.vars).map(function (k) { return k + ' = ' + short(String(p.vars[k])); }).join(', ') : '',
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

    // true for π, e or a letter, as entered, or with its sign: -A
    function symbol(n) {
        return !!n && (n.t === 'const' || (n.t === 'neg' && !!n.arg && n.arg.t === 'const'));
    }

    // true if the key starts a new operand in place of the displayed one
    function drops(key, entry, done, node) {
        if (/^[\d.]$/.test(key)) return entry === 'result' && !(symbol(node) && !done); // after π or a letter it is times it
        if (VARKEY.test(key) || key === 'π' || key === 'e') return !!done; // after a number it is times it
        if (/^(Rand|mr|Ans|C|paste)$/.test(key)) return entry !== 'fresh';
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
        dropped = drops(key, pre.entry, pre.done, pre.node);
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
        if (e) return this.delEdit();
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

    // Enter while the line is edited, or a function is open in it: everything closes at once,
    // so the line shows what will be worked out, tan(45). Another Enter, or =, works it out
    Engine.prototype.enter = function (deg) {
        var snap = this.snapshot();
        if (this.edit) return this.enterEdit();
        if (!this.opened()) return false;
        while (this.levels.length > 1) {
            if (!this.apply(')', deg)) return this.restore(snap), false;
        }
        if (!isFinite(+this.value)) this.fail();
        this.track(snap, '(');
        return true;
    };

    // true while a function or template is open anywhere in the line, a bracket inside it or
    // not: Enter closes one at a time, and works the line out only once none is
    Engine.prototype.opened = function () {
        return !this.edit && !this.done && !this.error && this.levels.some(function (l) { return !!l.fn; });
    };

    Engine.prototype.equals = function (deg) {
        var lvl = this.levels[0], top, d;
        if (this.done && lvl.rep && lvl.rep.val !== null) { // repeating '='
            top = {
                val: binary(lvl.rep.op, +this.value, lvl.rep.val),
                node: { t: 'bin', op: lvl.rep.op, l: num(this.value), r: num(lvl.rep.val) }
            };
            if (top.val === +this.value) return false; // it changes nothing, 0 × 0 again: not done, nor kept again
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
                    top = closed(lvl, top, deg, this.levels[d - 1].stack);
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
        var lvl = this.levels[this.levels.length - 1], st = lvl.stack, cur, arg, top,
            first = this.fnFirst && leads(key, this.entry);

        this.error = false;
        this.failed = '';

        // a function waiting for its number, as after tan: – starts a negative number; the
        // keys that would take the number shown before the function wait for one of its own
        if (lvl.fn && this.entry === 'fresh' && !st.length) {
            if (key === '–') key = '+/–';
            else if (RANK[key] !== undefined || ((key === '%' || UNARY[key]) && !first)) return false;
        }

        // × or ÷ with no number before it takes the last result: × 2 after 5 = is 5 × 2. With
        // none yet it waits for a number rather than take the 0 shown; + and – still take it,
        // as 0 + 4, – starting a negative number. % waits for its number as x² does
        if (this.entry === 'fresh' && !st.length && RANK[key] && key !== '+' && key !== '–') {
            if (!this.past.length) return false;
            this.value = String(this.ans);
            this.entry = 'result';
            this.node = null;
        }
        if (key === '%' && this.entry === 'fresh' && !first) return false;

        if (/^[\d.]$/.test(key)) {
            // a digit after π, e or a letter is times it, π2 and A9 as 2π and 9A are; after = it starts anew
            if (this.entry === 'result' && !this.done && symbol(this.node)) {
                this.operator('×');
                if (!isFinite(+this.value)) return true; // what it worked out, 0 ÷ 0 ×, is an error
            }
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
        } else if (key === '%' && !first) {
            top = percent(this.part(), st[st.length - 1]);
            this.value = String(top.val);
            this.entry = 'result';
            this.node = top.node;
            this.done = null;
        } else if (UNARY[key] && !first) {
            top = applied(key, this.part(), deg);
            this.value = String(top.val);
            this.entry = 'result';
            this.node = top.node;
            this.done = null;
        } else if (key === 'π' || key === 'e' || key === 'Rand' || key === 'mr' || key === 'Ans' || VARKEY.test(key)) {
            // π, e or a letter after a number is times it, as on a TI: 2π, 2A, AB is A × B. After
            // +/– with no number yet it takes the sign instead: -A, -π
            cur = this.entry === 'typing' && this.value === '-0';
            if ((VARKEY.test(key) || key === 'π' || key === 'e') && !this.done && this.entry !== 'fresh' && !cur) {
                this.operator('×');
                if (!isFinite(+this.value)) return true; // what it worked out, 0 ÷ 0 ×, is an error
            }
            this.value = String(key === 'π' ? PI : key === 'e' ? Math.E : key === 'Rand' ? Math.random() :
                key === 'mr' ? this.memory : key === 'Ans' ? this.ans : stored[key.charAt(1)]);
            this.entry = 'result';
            // π, e and the letters stay as they are written; a random number, the memory and Ans show their digits
            this.node = key === 'π' || key === 'e' ? { t: 'const', name: key } : VARKEY.test(key) ? { t: 'const', name: key.charAt(1) } : null;
            if (cur) {
                this.value = String(-this.value);
                if (this.node) this.node = { t: 'neg', arg: this.node };
            }
            this.done = null;
        } else if (key === '(' || key === '%' || UNARY[key]) { // a bracket, or a function before its number: tan(
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
            top = lvl.fn ? closed(lvl, top, deg, this.levels[this.levels.length - 2].stack) :
                { val: top.val, node: { t: 'group', arg: top.node } };
            this.levels.pop();
            this.value = String(top.val);
            this.entry = 'result';
            this.node = top.node;
        } else if (key === '=') {
            if (this.equals(deg) === false) return false;
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
        var line = this.equation(this.fraction), node = this.done || this.tree(), // drawn as its pieces are kept, a click finding them
            list = this.edit ? this.edit.list : node ? piecesOf(node, this.fraction) : [];
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
        var snap, first, hist;
        this.to = ''; // a result stored says so only till the next key
        if (key === 'AC' || (this.edit && key === 'C')) {
            this.reset();
            return true;
        }
        // a key that makes a template, sin□, ˣ√□, □^□, starts the line as a tree to edit; the line
        // as it was again if the key is refused there, as one too deep
        if (!this.edit && !this.typing && this.fnFirst && structural(key, this.entry)) {
            snap = this.snapshot();
            hist = this.history.slice();
            this.liveEdit(key);
            if (this.insert(key)) return true;
            this.restore(snap);
            this.history = hist;
            return false;
        }
        if (this.edit) { // keys write at the cursor; '=' and the memory work out the equation first
            if (key === '=' && firstEmpty(this.edit.list)) { // a box still empty: there first
                this.edit.path = firstEmpty(this.edit.list);
                this.edit.at = 0;
                return true;
            }
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
        first = this.fnFirst && leads(key, this.entry);
        if (!this.apply(key, deg)) {
            this.restore(snap);
            return false;
        }
        if (!isFinite(+this.value)) this.fail();
        else if (key === '=' && this.done) this.keep(); // the result, in the history
        this.track(snap, first ? '(' : key); // tan( is taken back as a bracket is
        return true;
    };

    // enters a parsed expression the way the keys would; false if a key is refused.
    // A function goes after its operand, as it does without tan-first, so it is
    // worked out the same; only one whose bracket is still open goes first
    Engine.prototype.type = function (tree, deg) {
        var first = this.fnFirst, typing = this.typing;
        this.fnFirst = false;
        this.typing = true; // its keys go on as keys, never into a tree to edit
        try {
            return this.typeIn(tree, deg, first);
        } finally {
            this.fnFirst = first;
            this.typing = typing;
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

        function key(k, unit) { // unit: Grad (2), Deg (1) or Rad (0) for this key, if it has its own
            if (!ok || halted) return;
            ok = self.press(k, unit === undefined ? deg : unit === 2 ? 2 : !!unit);
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
                    key(VAR.test(n.v) ? '#' + n.v : n.v); // π, e or a letter
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
        var s = separators(money(String(str)).trim(), this.comma), n, tree, snap, hist, equals, add, row, tail = 0, e = this.edit,
            to = /\s*→\s*([A-J])\s*$/.exec(s); // 5 + 3 → A, as the history copies it: stored in A again
        if (to) s = s.slice(0, to.index);
        if (e) { // while editing it goes in at the cursor
            s = s.replace(/^=\s*/, '').replace(/=[^]*$/, '');
            add = s.length <= MAX_PASTE && tokens(s);
            if (!add || !add.length) return false;
            add = structure(add);
            row = rowIn(e.list, e.path);
            if (e.at && runsInto(row[e.at - 1], add[0])) add.unshift({ p: [tok('×')] }); // 3 after 2! is 2! × 3, as typed
            if (row[e.at] && runsInto(add[add.length - 1], row[e.at])) {
                add.push({ p: [tok('×')] });
                tail = 1;
            }
            if (rowSize(e.list) + rowSize(add) > MAX_EDIT) return false;
            Array.prototype.splice.apply(row, [e.at, 0].concat(add));
            e.at += add.length - tail;
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
                    if (to && !this.error) this.store(to[1], deg);
                    else if (equals && !this.error) this.press('=', deg);
                    // an unfinished function, tan(45: in the editor, the cursor in its box
                    else if (!this.error && this.levels.some(function (l) { return !!l.fn; })) this.startEdit();
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
            if (d) node = this.levels[d].fn ? { t: 'open', fn: this.levels[d].fn, arg: node } :
                { t: 'open', arg: node };
        }
        return node;
    };

    // true while there is only a number, no expression yet: π or e alone shows its value too,
    // while a letter alone shows as the letter, B, whatever it holds: 0 would look as if none went in
    Engine.prototype.plain = function () {
        var node = this.tree();
        return !node || node.t === 'num' || (node.t === 'const' && !/^[A-J]$/.test(node.name));
    };

    // the equation, drawn as the editor draws it; stacked: each division drawn as a fraction,
    // for fraction mode. After a key of two numbers, the box of the number it waits for: 5 nCr □
    Engine.prototype.equation = function (stacked) {
        var node, list;
        if (this.edit) return drawRow(this.edit.list, [], null);
        if (this.error) return this.failed;
        if (this.done && this.to) return drawnNode(this.done, stacked) + ' → ' + this.to; // 8 → A says where it went
        if (this.done) return this.done.t === 'num' ? '' : drawnNode(this.done, stacked) + ' ='; // "9 =" says nothing
        if (!(node = this.tree())) return '';
        list = piecesOf(node, stacked);
        return drawRow(list, [], null) + (list.length && opPiece(list[list.length - 1], /^(nCr|nPr|mod|gcd|lcm|EE)$/) ?
            '<span class="calc-fr-empty calc-focus calc-next"></span>' : '');
    };

    Engine.stack = stack;

    // the equation as plain text, for the clipboard
    Engine.prototype.text = function () {
        if (this.edit) return tokText(unpiece(this.edit.list));
        // a line that failed is kept drawn: its pieces give it as text, ²√(-16), not 2√(-16)
        if (this.error && this.failedEdit && this.failedEdit.length) {
            return tokText(unpiece(this.failedEdit)) + (/ =$/.test(this.failed) ? ' =' : '');
        }
        if (this.done) return this.done.t === 'num' && !this.to ? '' : asPlain(function () { return show(this.done); }.bind(this)) + (this.to ? ' → ' + this.to : ' =');
        return this.tree() ? asPlain(function () { return show(this.tree()); }.bind(this)) : '';
    };

    // ---------- the cursor ---------- //

    // puts the cursor at the end of what the display shows: the equation being
    // entered, the finished one after '=', or the one that failed; inside what is
    // still open of it, as tan(45. False if there is nothing to change, as with a result alone
    Engine.prototype.startEdit = function () {
        var node, list;
        if (this.edit) return true;
        if (this.error) list = JSON.parse(JSON.stringify(this.failedEdit || []));
        else list = (node = this.done || this.tree()) ? piecesOf(node, this.fraction) : [];
        if (!list.length || (list.length === 1 && !list[0].s && list[0].p[0].whole)) return false;
        this.edit = { list: list, path: [], at: list.length };
        openCursor(this.edit);
        return true;
    };

    // a key that makes a template: a function, a root, a power, a logarithm; a key of two
    // numbers, or x², x!, % and 1/x, with no number before it. ÷ is not one: typed straight on,
    // 1 + 2 ÷ 3 × 4 is worked out as it reads, and drawn with its fraction in fraction mode;
    // only in the line being edited does it make one, its bottom a box of its own
    function structural(key, entry) {
        return opens(key) || /^(x√y|yx|logy)$/.test(key) ||
            (entry === 'fresh' && (TEMPLATE_OPS.test(key) || /^(x[23!]|%|1\/x)$/.test(key)));
    }

    // the line as it is entered so far, as a tree to edit, for a key that makes a template.
    // After a result a new line starts; x√y, yˣ and logᵧ take the result as their number
    Engine.prototype.liveEdit = function (key) {
        var node, list = [];
        if (!this.error) {
            if (this.done) {
                if (/^(x√y|yx|logy)$/.test(key)) list = [{ p: [{ t: 'num', v: this.value, whole: true }] }];
            } else if ((node = this.tree())) {
                list = piecesOf(node, this.fraction);
            }
        }
        this.reset();
        this.edit = { list: list, path: [], at: list.length };
        openCursor(this.edit);
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

    // the cursor to a place of the line, outside any template
    Engine.prototype.cursor = function (at) {
        var e = this.edit;
        if (!e) return false;
        e.path = [];
        e.at = Math.max(0, Math.min(e.list.length, at));
        return true;
    };

    // the arrow keys: 'left', 'right', 'home' or 'end'. Into a template's boxes and out of
    // them, through the whole line. ◀ from the end of the line goes into it
    Engine.prototype.move = function (how) {
        var e = this.edit;
        if (!e) {
            if (!this.done && !this.error && (how === 'right' || how === 'end')) return false; // the cursor is at the end already
            if (!this.startEdit()) return false;
            e = this.edit;
            if (how === 'home' || how === 'right') return this.cursor(0);
            if (!this.done && !this.error) stepLeft(e);
            return true;
        }
        if (how === 'home' || how === 'end') return this.cursor(how === 'home' ? 0 : e.list.length);
        return how === 'left' ? stepLeft(e) : stepRight(e);
    };

    // Tab: to the start of the next box, back: to the end of the one before; past the last,
    // out of them, to the end of the line
    Engine.prototype.tab = function (back) {
        var e = this.edit, from, n;
        if (!e) return false;
        from = pathKey(e.path) + '|' + e.at;
        for (n = 0; n < 4 * MAX_EDIT && (back ? stepLeft(e) : stepRight(e));) {
            n++;
            if (e.path.length && e.at === (back ? rowIn(e.list, e.path).length : 0) && pathKey(e.path) + '|' + e.at !== from) return true;
        }
        this.cursor(back ? 0 : e.list.length);
        return pathKey(e.path) + '|' + e.at !== from;
    };

    // a click on a piece (its row and place: 'row|i', the cursor after it if after) or on
    // a box (its row: the cursor at its end)
    Engine.prototype.place = function (spec, after) {
        var e = this.edit, parts = String(spec).split('|'), path, row;
        if (!e || !(path = pathOf(e.list, parts[0]))) return false;
        row = rowIn(e.list, path);
        e.path = path;
        e.at = parts.length > 1 ? Math.max(0, Math.min(row.length, (+parts[1] | 0) + (after ? 1 : 0))) : row.length;
        return true;
    };

    // the place between two pieces nearest to chars characters from the start of the equation
    function placeAt(list, chars) {
        var i, sum = 0, best = 0, gap = Infinity;
        for (i = 0; i <= list.length; i++) {
            if (Math.abs(sum - chars) < gap) {
                gap = Math.abs(sum - chars);
                best = i;
            }
            if (i < list.length) sum += untag(html(list[i])).length;
        }
        return best;
    }

    // a click in the shown equation, chars characters from its start: the
    // cursor goes to the nearest place between two pieces
    Engine.prototype.point = function (chars, deg) {
        var was = !!this.edit, e, best;
        if (!this.startEdit()) return false;
        e = this.edit;
        best = placeAt(e.list, chars);
        if (!was && best === e.list.length && !this.done && !this.error) {
            this.edit = null; // the end of the equation being entered: where it was
            return false;
        }
        return this.cursor(best);
    };

    // takes what is selected out of the shown equation, from and to characters from
    // its start, or each { r: the key of a box's row, i: a place in it }, and leaves the cursor in its place. Neither given: all of it, and
    // the display is cleared. False if there is nothing of an equation to take
    function take(e, from, to) {
        var was = e.edit, list, i, j, path, row;
        if (!e.startEdit()) return false; // a result alone: the keys and a paste replace it as it is
        if (from && typeof from === 'object') { // in a box: its row, and the places in it
            path = pathOf(e.edit.list, from.r);
            row = path && rowIn(e.edit.list, path);
            if (!row || from.i >= Math.min(to.i, row.length)) {
                e.edit = was;
                return false;
            }
            row.splice(from.i, Math.min(to.i, row.length) - from.i);
            e.edit.path = path;
            e.edit.at = from.i;
            if (!e.edit.list.length) e.reset(); // all of it: the display cleared
            return true;
        }
        e.edit.path = []; // a selection is of the line, its templates whole
        list = e.edit.list;
        i = from === undefined ? 0 : placeAt(list, from);
        j = to === undefined ? list.length : placeAt(list, to);
        if (i >= j) {
            e.edit = was;
            return false;
        }
        if (!i && j === list.length) {
            e.reset();
        } else {
            list.splice(i, j - i);
            e.edit.at = i;
        }
        return true;
    }

    // what is selected in the shown equation is replaced, as in a box of text: by
    // what write, a paste or a key, puts in, and with none it is only taken out.
    // At the end of the equation the keys work again as they always do.
    // False, and nothing changes, if write refuses
    function over(e, from, to, deg, write) {
        var snap = e.snapshot(), hist = e.history.slice();
        if (!take(e, from, to)) return write ? write() : false;
        if (write && !write()) {
            e.restore(snap);
            e.history = hist;
            return false;
        }
        return true;
    }

    // pasted text in place of what is selected; all of it: pasted as into a cleared display
    Engine.prototype.pasteOver = function (str, deg, from, to) {
        var self = this;
        return over(this, from, to, deg, function () { return self.paste(str, deg); });
    };

    // a key pressed while a part of the equation is selected writes in its place.
    // With all of it selected, as with a result: a key that starts a number does
    // so in its place, and an operator or a function goes on from the equation
    Engine.prototype.pressOver = function (key, deg, from, to) {
        var self = this;
        if (/^(AC|C|=|m[c+-])$/.test(key)) return this.press(key, deg); // these write nothing
        if (from === undefined && !/^([\d.π(]|e|Ans|mr|Rand|#[A-J])$/.test(key)) {
            if (this.edit) this.cursor(this.edit.list.length);
            return this.press(key, deg);
        }
        return over(this, from, to, deg, function () { return self.press(key, deg); });
    };

    // DEL takes out what is selected; false if nothing of the equation is
    Engine.prototype.cut = function (from, to, deg) {
        return over(this, from, to, deg);
    };

    // a key at the cursor. A function, a root, a power or a logarithm comes as its template,
    // the cursor in its first empty box; x√y, yˣ, logᵧ and 1/x take the number before them
    // into it, 3 x√y is ³√□; a key of two numbers, x², x!, % and 1/x with none before come
    // with a box for it. After a number a function means times it: 5 sin is 5 × sin□
    Engine.prototype.insert = function (key) {
        var e = this.edit, row = rowIn(e.list, e.path), at = e.at, s = operandStart(row, at), has = s < at,
            add = [], enter = null, take = false, after = 0, made, prev, tail = 0;

        function inside() { // a function's box takes the number after the cursor: sin before 2 is sin(2)
            var end = operandEnd(row, at);
            after = end - at;
            return row.slice(at, end);
        }

        function times() {
            if (has) add.push({ p: [tok('×')] });
            has = false;
        }

        // ) in a box with no ( of its own before the cursor closes the box: a function's, as
        // its bracket; a fraction's, a power's or a root's, the ) then going on after it
        if (key === ')' && e.path.length && !unclosed(row, at)) {
            made = e.path.pop();
            row = rowIn(e.list, e.path);
            e.at = made.i + 1;
            if (row[made.i].s === 'fn' || row[made.i].k === '√' || (row[made.i].s === 'logb' && made.k === 1)) return true;
            if (this.insert(')')) return true;
            e.path.push(made); // nothing for it to close after the box either: the cursor stays in it
            e.at = at;
            return false;
        }
        if (key === ')' && (!unclosed(row, at) || startOf(row, at) || infixAt(row, at - 1))) return false; // nothing for it to close, or nothing in it
        if (key === '.' && pointIn(row, at)) return false; // a number has one point, as typed straight on

        if (UNARY[key] && UNARY[key].t === 'fn' && key !== '√') {
            times();
            add.push({ s: 'fn', k: key, b: [inside()] });
            enter = [add.length - 1, 0];
        } else if (key === '√') {
            times();
            add.push({ s: 'root', k: '√', b: [inside()] });
            enter = [add.length - 1, 0];
        } else if (key === 'x√y') {
            add.push({ s: 'root', k: 'x√y', b: [has ? row.slice(s, at) : [], []] });
            take = has;
            enter = [0, has ? 1 : 0];
        } else if (key === 'logy') {
            add.push({ s: 'logb', b: [[], has ? row.slice(s, at) : []] });
            take = has;
            enter = [0, 0];
        } else if (key === 'yx') {
            if (!has) add.push({ s: 'box', b: [[]] });
            add.push({ s: 'pow', b: [[]] });
            enter = [0, 0];
        } else if (key === 'ex' || key === '2x' || key === '10x') {
            times();
            add = add.concat(key === 'ex' ? [{ p: [{ t: 'const', v: 'e' }] }] : digitPieces(key.slice(0, -1)));
            add.push({ s: 'pow', b: [[]] });
            enter = [add.length - 1, 0];
        } else if (key === '+/–' && has) { // the sign of the number before the cursor: -4 for 4, 4 again for -4
            if (s > 0 && opPiece(row[s - 1], /^-$/) && row[s - 1].p[0].c === '-') {
                row.splice(s - 1, 1);
                e.at--;
            } else {
                if (rowSize(e.list) >= MAX_EDIT) return false;
                row.splice(s, 0, { p: [tok('-', '-')] });
                e.at++;
            }
            return true;
        } else if (key === '+/–' && at && opPiece(row[at - 1], /^-$/) && !infixAt(row, at - 1)) { // after a sign it takes it back, as the key does
            row.splice(at - 1, 1);
            e.at--;
            return true;
        } else if (TEMPLATE_OPS.test(key) && !has) {
            add.push({ s: 'tpl', k: key, b: [[], []] });
            enter = [0, 0];
        } else if (key === 'x2' || key === 'x3') {
            if (!has) {
                add.push({ s: 'box', b: [[]] });
                enter = [0, 0];
            }
            add.push({ s: 'pow', b: [digitPieces(key.charAt(1))] });
        } else if ((key === 'x!' || key === '%') && !has) {
            add.push({ s: 'box', b: [[]] }, { p: [tok(key === 'x!' ? '!' : '%')] });
            enter = [0, 0];
        } else if (key === '1/x' && this.fraction) { // 1 over it
            add.push({ s: 'frac', b: [digitPieces('1'), has ? bare(row.slice(s, at)) : []] });
            take = has;
            if (!has) enter = [0, 1];
        } else if (key === '÷' && this.fraction) { // the number before it on top, the cursor below
            add.push({ s: 'frac', b: [has ? bare(row.slice(s, at)) : [], []] });
            take = has;
            enter = [0, has ? 1 : 0];
        } else if (key === '1/x') {
            add = digitPieces('1').concat([{ p: [tok('÷', '/')] }, { s: 'box', b: [has ? row.slice(s, at) : []] }]);
            take = has;
            if (!has) enter = [2, 0];
            if (opPiece(row[(has ? s : at) - 1] || { p: [] }, /^(÷|mod|nCr|nPr|gcd|lcm|EE)$/)) { // 8 ÷ (1/2), not (8 ÷ 1)/2
                add = [{ p: [tok('(')] }].concat(add, [{ p: [tok(')')] }]);
                if (enter) enter[0]++;
            }
        } else {
            // the guards of the keys: an operator typed again takes the old one's place, taken out
            // only once the key is taken; × ÷ + with nothing before them to work on are refused,
            // while – is then a sign, as it is after × ÷ ᴇ mod: 2 × –3, 5ᴇ–3
            if (INFIX_KEYS.test(key)) {
                if (infixAt(row, at - 1)) {
                    if (key !== '–' || opPiece(row[at - 1], /^[+-]$/)) {
                        s = at - 1;
                        take = true;
                    }
                } else if (at && opPiece(row[at - 1], /^-$/)) {
                    return false; // after a sign, as × after the – of 5 × –
                } else if (startOf(row, at)) {
                    if (key !== '–') return false;
                } else if (infixAt(row, at)) {
                    after = 1; // the one after the cursor, in its place
                }
            }
            made = written(key, this);
            if (!made) return false;
            if (key === '.' && !(at && digitPiece(row[at - 1]))) add = digitPieces('0'); // .9 is 0.9, as the keys show it
            add.push(made);
        }
        // a number that would run into the one beside it, Ans after 2 as 23, 5 after 2! as 2!5, has
        // × between them; so has the 1 of 1/x after the 2 of 2A, which it does not take
        prev = row[(take ? s : at) - 1];
        if (add.length && prev && (runsInto(prev, add[0]) || (take && digitPiece(prev) && digitPiece(add[0])))) {
            add.unshift({ p: [tok('×')] });
            if (enter) enter[0]++;
        }
        if (add.length && row[at + after] && runsInto(add[add.length - 1], row[at + after])) {
            add.push({ p: [tok('×')] });
            tail = 1; // the cursor before it, after what was put in
        }
        if (rowSize(e.list) + rowSize(add) - (take ? rowSize(row.slice(s, at)) : 0) - rowSize(row.slice(at, at + after)) > MAX_EDIT) return false;
        if (e.path.length >= MAX_LEVELS - 1 && add.some(function (p) { return p.s; })) return false; // as deep as brackets go
        if (take) {
            row.splice(s, at - s);
            at = s;
        }
        Array.prototype.splice.apply(row, [at, after].concat(add));
        if (enter) {
            e.path.push({ i: at + enter[0], k: enter[1] });
            e.at = 0;
        } else {
            e.at = at + add.length - tail;
        }
        return true;
    };

    // true if the piece at k of a row is an operator between two numbers: + – × ÷ mod nCr nPr gcd
    // lcm ᴇ. Not a sign, the – with nothing, a ( or an operator before it, as in 5 × –3
    function infixAt(row, k) {
        return k >= 0 && !!row[k] && opPiece(row[k], INFIX_PIECES) && !(opPiece(row[k], /^-$/) && (startOf(row, k) || infixAt(row, k - 1)));
    }

    // true if the piece b, a number, would run into the piece a before it: digits into Ans, which
    // is one number, or a number after 5!, 5%, a power or a box, which is not read as times it
    function runsInto(a, b) {
        if (!digitPiece(b) && !wholePiece(b)) return false;
        return wholePiece(a) || (digitPiece(a) && wholePiece(b)) || opPiece(a, /^[!%]$/) || /^(pow|box|tpl)$/.test(a.s);
    }

    // a number put in whole: Ans, the memory, a random number
    function wholePiece(p) {
        return !p.s && p.p.length === 1 && p.p[0].t === 'num' && !p.p[0].d;
    }

    // true at the start of a row, or just after a (: no number before it
    function startOf(row, at) {
        return !at || opPiece(row[at - 1], /^\($/);
    }

    // true if a ( before at in the row is still open
    function unclosed(row, at) {
        var depth = 0, k;
        for (k = 0; k < at; k++) {
            if (opPiece(row[k], /^\($/)) depth++;
            else if (opPiece(row[k], /^\)$/) && depth) depth--;
        }
        return depth > 0;
    }

    // true if the number the cursor is in, its digits before it and after it, has a point
    function pointIn(row, at) {
        var i = at, j = at;
        while (i > 0 && digitPiece(row[i - 1])) i--;
        while (j < row.length && digitPiece(row[j])) j++;
        return row.slice(i, j).some(function (p) { return p.p[0].v === '.'; });
    }

    // a piece at the cursor, as a result from the history: × between it and a number it would run into
    Engine.prototype.insertPiece = function (piece) {
        var e = this.edit, row = rowIn(e.list, e.path), add = [piece], tail = 0;
        if (e.at && runsInto(row[e.at - 1], piece)) add.unshift({ p: [tok('×')] });
        if (row[e.at] && runsInto(piece, row[e.at])) {
            add.push({ p: [tok('×')] });
            tail = 1;
        }
        if (rowSize(e.list) + add.length > MAX_EDIT) return false;
        Array.prototype.splice.apply(row, [e.at, 0].concat(add));
        e.at += add.length - tail;
        return true;
    };

    // DEL while editing: the piece before the cursor, as the line typed out would lose it. Of a
    // template before it, the last of its last box; an empty one goes whole
    Engine.prototype.delEdit = function () {
        var e = this.edit, row = rowIn(e.list, e.path), p, up, parent;
        function empty(q) {
            return !!q.s && q.b.every(function (r) { return !r.length; });
        }
        if (e.at > 0) {
            p = row[e.at - 1];
            if (p.s && !empty(p)) { // as typed out: the last of it goes, 8 of ³√8, 4 of 12/34
                stepLeft(e);
                return this.delEdit();
            }
            row.splice(--e.at, 1);
        } else if (e.path.length) {
            // at the start of a box, as the same line typed out: what comes before it goes. That
            // is the template itself (the bar of 12/34, the nCr of 5 nCr 2, the sin( of sin(30)),
            // what is in its boxes staying in its place, unless the box is the first operand of
            // a fraction, nCr or root, with the template's own sign after it: what is before
            // the template goes then
            up = e.path[e.path.length - 1];
            parent = rowIn(e.list, e.path.slice(0, -1));
            p = parent[up.i];
            e.path.pop();
            if (row.length && !up.k && (p.s === 'frac' || p.s === 'tpl' || p.k === 'x√y')) {
                e.at = up.i;
                return e.at > 0 ? this.delEdit() : true;
            }
            parent.splice.apply(parent, [up.i, 1].concat([].concat.apply([], p.b)));
            e.at = up.i + p.b.slice(0, up.k).reduce(function (n, r) { return n + r.length; }, 0);
        } else {
            return false;
        }
        if (!e.list.length) this.reset();
        return true;
    };

    // Enter while editing: to the first empty box; with none, out of the boxes to the end
    // of the line, which then shows what will be worked out. False there: = works it out
    Engine.prototype.enterEdit = function () {
        var e = this.edit, empty = firstEmpty(e.list);
        if (empty) {
            e.path = empty;
            e.at = 0;
            return true;
        }
        if (!e.path.length) return false;
        return this.cursor(e.list.length);
    };

    // fraction mode turned on or off: the line being edited has its divisions as fractions, or
    // its fractions as divisions, as the line is drawn in that mode. The cursor stays by the
    // piece it was next to, or in the box it was in
    Engine.prototype.setFraction = function (on) {
        var e = this.edit, row, found = null;
        this.fraction = !!on;
        if (!e) return;
        row = rowIn(e.list, e.path);
        if (e.at > 0) row[e.at - 1].cur = 'after';
        else if (row.length) row[0].cur = 'before';
        else if (e.path.length) rowIn(e.list, e.path.slice(0, -1))[e.path[e.path.length - 1].i].curBox = e.path[e.path.length - 1].k;
        e.list = on ? toFracs(e.list) : fromFracs(e.list);
        (function look(r, path) {
            r.forEach(function (p, i) {
                if (!found && p.cur) found = { path: path, at: p.cur === 'after' ? i + 1 : i };
                if (!found && p.curBox !== undefined && p.b && p.b[p.curBox]) found = { path: path.concat([{ i: i, k: p.curBox }]), at: 0 };
                delete p.cur;
                delete p.curBox;
                if (p.s) {
                    p.b.forEach(function (box, k) {
                        look(box, path.concat([{ i: i, k: k }]));
                    });
                }
            });
        })(e.list, []);
        e.path = found ? found.path : [];
        e.at = found ? found.at : e.list.length;
    };

    // the equation while editing, the cursor in it
    Engine.prototype.editView = function () {
        return { html: drawRow(this.edit.list, [], this.edit) };
    };

    Engine.stats = stats;
    Engine.pairs = pairs;
    Engine.format = format;
    Engine.group = group;
    Engine.decimal = decimal;
    Engine.comma = comma;
    Engine.fraction = shownFraction;
    Engine.LETTERS = LETTERS;
    Engine.lettersOf = lettersOf;
    Engine.dms = dms;
    Engine.angleAlone = angleAlone;
    Engine.graph = graph;
    Engine.keyPoints = keyPoints;
    Engine.slope = slope;
    Engine.area = area;
    Engine.relation = relation;
    Engine.within = within;
    Engine.holds = holds;
    Engine.plane = plane;
    Engine.sequence = sequence;
    Engine.slopeField = slopeField;
    Engine.solveField = solveField;
    Engine.numbers = numbers;
    Engine.points = points;
    Engine.fitLine = fitLine;
    Engine.fit = fit;
    Engine.named = named;
    Engine.tree = tree;
    Engine.spans = spans;
    Engine.regionArea = regionArea;
    Engine.onRelation = onRelation;
    Engine.relationSlope = relationSlope;

    root.CalcEngine = Engine;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Engine;
    }
})(typeof window !== 'undefined' ? window : this);
