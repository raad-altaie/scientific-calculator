// The maths of the Solve panel: equations solved for x, the roots of a polynomial and of a
// system of linear equations; integrals, slopes, sums and products; and the normal, binomial
// and Poisson distributions. And of the Numbers panel: complex numbers, whole numbers in bits
// and their bases, and matrices; and whole numbers: their prime factors, divisors, greatest
// common divisor and least common multiple, and numbers rounded. Functions are read as the graph reads them, by the engine.
// It works on its own in Node as well, for the tests
(function (root) {
    'use strict';

    var Engine = root.CalcEngine || require('./engine.js'),
        PI = Math.PI,
        SEARCH = 1e8, // an equation's roots are looked for between -SEARCH and SEARCH, unless given ends
        ROOTS_MAX = 12, // more roots than these: the ones nearest 0
        TERMS_MAX = 1e6, // a sum or a product of more terms is not worked out
        LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
            -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

    // ---------- reading what is typed ---------- //

    // A number typed, which may be worked out: 2, -1.5, pi/4, sqrt(2), 2^10, sin(30) in the unit
    // of angles deg. ∞, inf or infinity, with a sign, where inf allows it. NaN for anything else,
    // an empty box or one with x in it as well
    function number(text, comma, deg, inf) {
        var s = String(text).trim(), c, v;
        if (inf && /^[-+−–]?\s*(∞|inf|infinity)$/i.test(s)) return /^[-−–]/.test(s) ? -Infinity : Infinity;
        c = s && Engine.graph(s, comma, {});
        if (!c || c.letters.length) return NaN;
        v = c.at(0, deg, true);
        return isNaN(c.at(NaN, deg)) && !isNaN(v) ? NaN : v; // none where x makes a difference: it has x
    }

    // A function of x typed, as the graph has it: x^2 - 3, sin(x), y = 1/x. Null if it is not
    // one, or has letters of its own besides x, which have no values here
    function fn(text, comma) {
        var c = String(text).trim() && Engine.graph(text, comma, {});
        return c && !c.letters.length ? c : null;
    }

    // x written as short as it can be while within tol of it and as good, good(q) telling:
    // 2, not 1.9999999999999998
    function tidy(x, tol, good) {
        var p, q;
        if (!isFinite(x) || x === 0) return x;
        for (p = 1; p <= 16; p++) {
            q = +x.toPrecision(p);
            if (Math.abs(q - x) <= tol && good(q)) return q;
        }
        return x;
    }

    // to 12 digits, as a result is shown, with -0 as 0: 0.1 + 0.2 is 0.3
    function round(x) {
        return isFinite(x) ? +x.toPrecision(12) + 0 : x;
    }

    // ---------- equations ---------- //

    // The roots of an equation of x: x^3 = 2x + 1, sin(x) = 0.5, or one side alone, which is 0.
    // From samples between from and to, or from -1e8 to 1e8 spread most near 0: where the
    // difference of the sides changes sign, found by halving, unless it only jumps there, as
    // 1/x does; and where it comes to 0 without crossing, as (x – 1)² does, by the golden
    // section. { roots: ascending, more: there were more than these, the ones nearest 0 } or
    // { error: 'equation' } where it is not one, 'letters' where it has letters besides x
    function solve(text, comma, deg, from, to) {
        var sides = String(text).split('='), left, right, xs = [], fs = [], found = [], n = 6000, k, u, a, b, r, ends;
        if (sides.length > 2 || !sides[0].trim() || (sides.length === 2 && !sides[1].trim())) return { error: 'equation' };
        left = Engine.graph(sides[0], comma, {});
        right = sides.length === 2 ? Engine.graph(sides[1], comma, {}) : Engine.graph('0', comma, {});
        if (!left || !right) return { error: 'equation' };
        if (left.letters.length || right.letters.length) return { error: 'letters' };
        function f(x) {
            return left.at(x, deg) - right.at(x, deg);
        }
        function size(x) { // how big the sides are there: the difference is 0 to as many digits
            return Math.abs(left.at(x, deg)) + Math.abs(right.at(x, deg));
        }
        function zero(x) {
            return Math.abs(f(x)) <= 1e-12 * Math.max(1, size(x));
        }
        ends = isFinite(from) && isFinite(to) && from < to;
        for (k = 0; k <= n; k++) {
            if (ends) {
                xs.push(from + (to - from) * k / n);
            } else {
                u = Math.asinh(SEARCH) * (2 * k / n - 1);
                xs.push(k === n / 2 ? 0 : Math.sinh(u));
            }
            fs.push(f(xs[k]));
        }
        for (k = 0; k <= n; k++) {
            a = fs[k - 1];
            b = fs[k];
            if (!isFinite(b)) continue;
            if (b === 0) {
                found.push(xs[k]);
            } else if (k && isFinite(a) && a !== 0 && (a < 0) !== (b < 0)) {
                r = halve(f, xs[k - 1], xs[k], a);
                if (r !== null && Math.abs(f(r)) <= Math.min(Math.abs(a), Math.abs(b))) found.push(polish(r));
            } else if (k && k < n && isFinite(a) && isFinite(fs[k + 1]) && Math.abs(b) < Math.abs(a) && Math.abs(b) <= Math.abs(fs[k + 1]) &&
                (a < 0) === (b < 0) && (b < 0) === (fs[k + 1] < 0)) {
                r = lowest(function (x) { return -Math.abs(f(x)); }, xs[k - 1], xs[k + 1]); // touching 0: where it comes nearest
                if (zero(r) || Math.abs(f(r)) <= 1e-9 * Math.max(1, size(r)) && Math.abs(f(r)) < 1e-6 * Math.abs(b)) found.push(polish(r));
            }
        }
        function polish(r) {
            var best = Math.abs(f(r));
            return tidy(r, 1e-9 * Math.max(1, Math.abs(r)), function (q) {
                var v = Math.abs(f(q));
                return v <= best || v <= 1e-14 * Math.max(1, size(q));
            });
        }
        found.sort(function (p, q) { return p - q; });
        found = found.filter(function (x, i) { // one root once, not twice from the two sides of a sample
            return !i || Math.abs(x - found[i - 1]) > 1e-9 * Math.max(1, Math.abs(x));
        }).map(function (x) { return x + 0; });
        if (found.length <= ROOTS_MAX) return { roots: found, more: false };
        return {
            roots: found.slice().sort(function (p, q) { return Math.abs(p) - Math.abs(q) || p - q; }).slice(0, ROOTS_MAX).sort(function (p, q) { return p - q; }),
            more: true
        };
    }

    // where f changes sign between a and b, fa being f(a), by halving; null where it has no value on the way
    function halve(f, a, b, fa) {
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
    function lowest(g, a, b) {
        var r = (Math.sqrt(5) - 1) / 2, c = b - r * (b - a), d = a + r * (b - a), gc = g(c), gd = g(d), i;
        for (i = 0; i < 200 && c < d; i++) {
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

    // ---------- inequalities ---------- //

    // An inequality of x solved: x^2 – 4 > 0, 1/x <= 2, sqrt(x) < 3, or two the same way,
    // 1 < x^2 < 4: where it holds, as intervals. Their ends are the roots of its sides equal,
    // as solve finds them, and where it starts or stops holding without one, at a jump, as 1/x
    // at 0, or at the edge of where it has values, as sqrt(x) at 0, found by halving between
    // samples. From and to keep it between them, else it is looked for as solve looks.
    // { parts: [{ from, to, fromIn, toIn }] ascending, ends: where it changes, ascending, more:
    // there were more ends than these, the ones nearest 0 } or { error: 'inequality' | 'letters' }
    function inequality(text, comma, deg, from, to) {
        var s = String(text), ops = s.match(/<=|>=|=<|=>|[<>≤≥]/g), sides, curves, parts = [], ends = [], more,
            bounded = isFinite(from) && isFinite(to) && from < to, n = 2000, xs = [], states = [], marks, k, u, r, p, lo, hi, out = [], cur;
        if (!ops || ops.length > 2 || /=/.test(s.replace(/<=|>=|=<|=>/g, ''))) return { error: 'inequality' };
        ops = ops.map(function (op) { return { '<=': '≤', '=<': '≤', '>=': '≥', '=>': '≥' }[op] || op; });
        if (ops.length === 2 && /[<≤]/.test(ops[0]) !== /[<≤]/.test(ops[1])) return { error: 'inequality' };
        sides = s.split(/<=|>=|=<|=>|[<>≤≥]/);
        if (sides.some(function (side) { return !side.trim(); })) return { error: 'inequality' };
        curves = sides.map(function (side) { return Engine.graph(side, comma, {}); });
        if (!curves.every(Boolean)) return { error: 'inequality' };
        if (curves.some(function (c) { return c.letters.length; })) return { error: 'letters' };
        for (k = 0; k < ops.length; k++) parts.push({ l: curves[k], r: curves[k + 1], op: ops[k], text: sides[k] + '=' + sides[k + 1] });

        // True where it holds at x, false where not, null where a side has no value. Its sides
        // are equal at a root of them, root the part's, or where they are to 12 digits; loose,
        // to 6, for an end that is only as near as a number goes
        function holds(x, root, loose) {
            var j, a, b, d;
            for (j = 0; j < parts.length; j++) {
                a = parts[j].l.at(x, deg);
                b = parts[j].r.at(x, deg);
                if (!isFinite(a) || !isFinite(b)) return null;
                d = j === root || Math.abs(a - b) <= (loose ? 1e-6 * Math.max(1, Math.abs(a) + Math.abs(b)) : 1e-12 * (Math.abs(a) + Math.abs(b))) ? 0 : a - b;
                if (!(parts[j].op === '<' ? d < 0 : parts[j].op === '>' ? d > 0 : parts[j].op === '≤' ? d <= 0 : d >= 0)) return false;
            }
            return true;
        }

        // the ends: the roots of each part's sides equal where it changes there, as (x – 1)² > 0
        // at 1, not where they are equal all along, as floor(x) = 2 …
        parts.forEach(function (part, j) {
            var found = solve(part.text, comma, deg, bounded ? from : NaN, bounded ? to : NaN);
            (found.roots || []).forEach(function (x) {
                var h = 1e-8 * Math.max(1, Math.abs(x)), at = holds(x, j);
                if (holds(x - h) !== at || holds(x + h) !== at) ends.push({ x: x, root: j });
            });
        });
        // … and where it changes between samples without one, as near as a number goes. An end
        // that is a number is in where it holds; one between two numbers, made shorter, where it
        // holds with the sides of a part equal to 6 digits there, as they are loosely: floor(x) ≥ 2
        // at 2 and sqrt(2 – x²) ≥ 0 at √2, not sqrt(2 – x²) > 0 there, nor tan(x) > 1 at π/2
        function equal(x) {
            return parts.some(function (part) {
                var a = part.l.at(x, deg), b = part.r.at(x, deg);
                return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a) + Math.abs(b));
            });
        }
        for (k = 0; k <= n; k++) {
            u = Math.asinh(SEARCH) * (2 * k / n - 1);
            xs.push(bounded ? from + (to - from) * k / n : k === n / 2 ? 0 : Math.sinh(u));
            states.push(holds(xs[k]));
            if (k && states[k] !== states[k - 1]) {
                lo = xs[k - 1];
                hi = xs[k];
                for (r = 0; r < 200; r++) {
                    p = (lo + hi) / 2;
                    if (p <= lo || p >= hi) break;
                    if (holds(p) === states[k - 1]) lo = p;
                    else hi = p;
                }
                p = snap(hi);
                if (ends.some(function (e) { return Math.abs(p - e.x) <= 1e-9 * Math.max(1, Math.abs(p)); })) continue; // a root of solve's, as it has it
                ends.push({ x: p, in: holds(p) === true && (p === lo || p === hi || holds(p, -1, true) === true && equal(p)) });
            }
        }
        ends.sort(function (a, b) { return a.x - b.x; });
        ends = ends.filter(function (e, i) { return !i || e.x !== ends[i - 1].x; });
        more = ends.length > ROOTS_MAX;
        if (more) ends = ends.slice().sort(function (a, b) { return Math.abs(a.x) - Math.abs(b.x) || a.x - b.x; }).slice(0, ROOTS_MAX).sort(function (a, b) { return a.x - b.x; });
        lo = bounded ? { x: from } : more ? ends[0] : { x: -Infinity };
        hi = bounded ? { x: to } : more ? ends[ends.length - 1] : { x: Infinity };

        // the pieces between the ends, each tried at a point inside it, and the ends themselves
        function inside(a, b) {
            return a === -Infinity ? (b === Infinity ? 0 : b - Math.max(1, Math.abs(b))) : b === Infinity ? a + Math.max(1, Math.abs(a)) : (a + b) / 2;
        }
        function isIn(e) {
            return isFinite(e.x) && (e.in !== undefined ? e.in : holds(e.x, e.root) === true);
        }
        function add(a, aIn, b, bIn) {
            if (cur && cur.to === a && (cur.toIn || aIn)) {
                cur.to = b;
                cur.toIn = bIn;
            } else {
                cur = { from: a, to: b, fromIn: aIn, toIn: bIn };
                out.push(cur);
            }
        }
        marks = [lo].concat(ends.filter(function (e) { return e.x > lo.x && e.x < hi.x; }), [hi]);
        for (k = 0; k < marks.length; k++) {
            if (isIn(marks[k])) add(marks[k].x, true, marks[k].x, true);
            if (k < marks.length - 1 && marks[k].x < marks[k + 1].x && holds(inside(marks[k].x, marks[k + 1].x))) {
                add(marks[k].x, isIn(marks[k]), marks[k + 1].x, isIn(marks[k + 1]));
            }
        }
        return { parts: out, ends: ends.map(function (e) { return e.x + 0; }), more: more };
    }

    // an end found by halving, which is as near as a number goes: as short as it can be to 12
    // digits, 0 not -6e-65
    function snap(x) {
        var d, q;
        for (d = 0; d <= 15; d++) {
            q = +x.toFixed(d);
            if (Math.abs(q - x) <= 1e-12 * Math.max(1, Math.abs(x))) return q + 0;
        }
        return +x.toPrecision(13);
    }

    // ---------- complex numbers, as [re, im] ---------- //

    function cmul(a, b) {
        return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
    }

    function cdiv(a, b) {
        var d = b[0] * b[0] + b[1] * b[1];
        return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
    }

    function cabs(a) {
        return Math.hypot(a[0], a[1]);
    }

    // the value of the polynomial of coefficients c, the highest power first, at z, and of its slope
    function horner(c, z) {
        var p = [c[0], 0], d = [0, 0], k;
        for (k = 1; k < c.length; k++) {
            d = [d[0] * z[0] - d[1] * z[1] + p[0], d[0] * z[1] + d[1] * z[0] + p[1]];
            p = [p[0] * z[0] - p[1] * z[1] + c[k], p[0] * z[1] + p[1] * z[0]];
        }
        return { p: p, d: d };
    }

    // The roots of a polynomial, its coefficients the highest power first: [1, 0, -4] for
    // x² – 4. Each { re, im }, the real ones first from the lowest, then each pair a ± bi. A
    // quadratic by its formula, written so it loses no digits; more by Aberth's steps for all
    // the roots at once, then Newton's for each. A coefficient of 0 first leaves its power out;
    // each 0 last is a root of 0. Null for no power of x, or a coefficient that is not a number
    function poly(coefs) {
        var c = coefs.slice(), n, roots, k, j, step, r, s, big, i, q, disc, out, zeros = [];
        if (!c.every(isFinite)) return null;
        while (c.length && c[0] === 0) c.shift();
        if (c.length < 2) return null;
        while (c.length > 1 && c[c.length - 1] === 0) {
            c.pop();
            zeros.push({ re: 0, im: 0 });
        }
        n = c.length - 1;
        if (n < 1) {
            roots = [];
        } else if (n === 1) {
            roots = [[-c[1] / c[0], 0]];
        } else if (n === 2) {
            disc = c[1] * c[1] - 4 * c[0] * c[2];
            if (disc >= 0) {
                q = -(c[1] + (c[1] < 0 ? -1 : 1) * Math.sqrt(disc)) / 2; // the larger root first, then c/q: no cancelling
                roots = q === 0 ? [[0, 0], [0, 0]] : [[q / c[0], 0], [c[2] / q, 0]];
            } else {
                roots = [[-c[1] / (2 * c[0]), Math.sqrt(-disc) / (2 * Math.abs(c[0]))], [-c[1] / (2 * c[0]), -Math.sqrt(-disc) / (2 * Math.abs(c[0]))]];
            }
        } else {
            big = 1 + Math.max.apply(null, c.slice(1).map(function (a) { return Math.abs(a / c[0]); }));
            roots = [];
            for (k = 0; k < n; k++) roots.push([big * Math.cos(2 * PI * k / n + 0.4), big * Math.sin(2 * PI * k / n + 0.4)]);
            for (i = 0; i < 800; i++) {
                step = 0;
                for (k = 0; k < n; k++) {
                    r = horner(c, roots[k]);
                    if (r.p[0] === 0 && r.p[1] === 0) continue;
                    q = cdiv(r.p, r.d);
                    s = [0, 0];
                    for (j = 0; j < n; j++) {
                        if (j !== k) s = [s[0] + cdiv([1, 0], [roots[k][0] - roots[j][0], roots[k][1] - roots[j][1]])[0],
                            s[1] + cdiv([1, 0], [roots[k][0] - roots[j][0], roots[k][1] - roots[j][1]])[1]];
                    }
                    q = cdiv(q, [1 - cmul(q, s)[0], -cmul(q, s)[1]]);
                    if (!isFinite(q[0]) || !isFinite(q[1])) continue;
                    roots[k] = [roots[k][0] - q[0], roots[k][1] - q[1]];
                    step = Math.max(step, cabs(q) / Math.max(1, cabs(roots[k])));
                }
                if (step < 1e-16) break;
            }
        }
        out = roots.map(function (z) {
            var scale = Math.max(1, cabs(z)), w = z, k, r;
            for (k = 0; k < 3; k++) { // Newton's steps, each kept only if it is nearer
                r = horner(c, w);
                if (!(cabs(r.d) > 0)) break;
                r = [w[0] - cdiv(r.p, r.d)[0], w[1] - cdiv(r.p, r.d)[1]];
                if (isFinite(r[0]) && isFinite(r[1]) && cabs(horner(c, r).p) <= cabs(horner(c, w).p)) w = r;
            }
            // real, as far as its digits tell: a root found twice or three times over is only so near
            if (Math.abs(w[1]) <= 1e-9 * scale || (Math.abs(w[1]) <= 1e-4 * scale &&
                    Math.abs(horner(c, [w[0], 0]).p[0]) <= Math.max(cabs(horner(c, w).p), 1e-14 * size(w[0])))) {
                w = [w[0], 0];
                r = Math.abs(horner(c, w).p[0]);
                w[0] = tidy(w[0], 1e-5 * scale, function (x) {
                    var v = Math.abs(horner(c, [x, 0]).p[0]);
                    return v <= r || v <= 1e-14 * size(x);
                });
            }
            return { re: round(w[0]), im: round(w[1]) };
        });
        function size(x) { // how big the terms are at x
            return c.reduce(function (s, a, k) { return s + Math.abs(a * Math.pow(x, n - k)); }, 0);
        }
        out = out.concat(zeros);
        out.sort(function (p, q) {
            return (!!p.im - !!q.im) || p.re - q.re || Math.abs(p.im) - Math.abs(q.im) || q.im - p.im;
        });
        return out;
    }

    // Linear equations, a row of the coefficients of each and what it equals: [[1, 1, 3],
    // [1, -1, 1]] for x + y = 3, x – y = 1. By elimination, the largest first.
    // { x: the values } where it has one answer, { none: true } where it has none, { many: true }
    // where it has more than one; null for a coefficient that is not a number
    function linear(rows) {
        var n = rows.length, a = rows.map(function (r) { return r.slice(); }), i, j, k, p, f, x = [], big, rank = 0, where = [];
        if (!rows.every(function (r) { return r.length === n + 1 && r.every(isFinite); })) return null;
        big = Math.max.apply(null, a.map(function (r) { return Math.max.apply(null, r.slice(0, n).map(Math.abs)); })) || 1;
        for (j = 0; j < n && rank < n; j++) {
            p = rank;
            for (i = rank + 1; i < n; i++) if (Math.abs(a[i][j]) > Math.abs(a[p][j])) p = i;
            if (Math.abs(a[p][j]) <= 1e-12 * big) continue; // no pivot in this column
            f = a[rank];
            a[rank] = a[p];
            a[p] = f;
            for (i = 0; i < n; i++) {
                if (i === rank) continue;
                f = a[i][j] / a[rank][j];
                for (k = j; k <= n; k++) a[i][k] -= f * a[rank][k];
            }
            where[rank] = j;
            rank++;
        }
        for (i = rank; i < n; i++) {
            if (Math.abs(a[i][n]) > 1e-9 * Math.max(1, Math.max.apply(null, rows.map(function (r) { return Math.abs(r[n]); })))) return { none: true };
        }
        if (rank < n) return { many: true };
        for (i = 0; i < n; i++) x[where[i]] = round(a[i][n] / a[i][where[i]]);
        return { x: x };
    }

    // ---------- calculus ---------- //

    // The integral of c from a to b, as the graph's area finds it: to 10 digits. An end may be
    // infinite: x = a + t / (1 – t) takes t from 0 to 1 to x from a to ∞. NaN where it has no
    // value on the way or does not settle
    function integral(c, a, b, deg) {
        if (isNaN(a) || isNaN(b)) return NaN;
        if (a === b) return 0;
        if (a > b) return -integral(c, b, a, deg);
        if (a === -Infinity && b === Infinity) return round(integral(c, -Infinity, 0, deg) + integral(c, 0, Infinity, deg));
        if (b === Infinity) return Engine.area(endless(c, a, 1), 0, 1, deg);
        if (a === -Infinity) return Engine.area(endless(c, b, -1), 0, 1, deg);
        return Engine.area(c, a, b, deg);
    }

    // c from from on to ∞ (way 1) or -∞ (way -1), as a curve of t from 0 to 1
    function endless(c, from, way) {
        return {
            at: function (t, deg) {
                var x = from + way * t / (1 - t), y;
                if (t >= 1 || !isFinite(x)) return 0;
                y = c.at(x, deg);
                return y === 0 ? 0 : y / ((1 - t) * (1 - t));
            }
        };
    }

    // the slope of c at x, and the slope of that: [f′(x), f″(x)], NaN where it has none
    function slopes(c, x, deg) {
        var first = Engine.slope(c, x, deg),
            second = Engine.slope({ at: function (v, deg) { return Engine.slope(c, v, deg); } }, x, deg);
        return [first, second];
    }

    // The sum, or with product the product, of a function typed for each whole number from
    // from to to: of n, k, i or j, or of x if it has none of them: n^2, 1/k!. { value } or
    // { error: 'function' | 'letters' | 'ends' | 'many' }: not a function; letters of its own;
    // ends that are not whole numbers in order; more than a million terms
    function series(text, comma, deg, from, to, product) {
        var vars = {}, c = String(text).trim() && Engine.graph(text, comma, vars), key, total = product ? 1 : 0, fix = 0, k, v, y, t;
        if (!c) return { error: 'function' };
        if (c.letters.length > 1 || (c.letters.length === 1 && !/^[nkij]$/.test(c.letters[0]))) return { error: 'letters' };
        key = c.letters[0];
        if (key && isNaN(c.at(NaN, deg)) && !isNaN(c.at(0, deg))) return { error: 'letters' }; // x as well as n
        if (!isFinite(from) || !isFinite(to) || from !== Math.floor(from) || to !== Math.floor(to) || from > to) return { error: 'ends' };
        if (to - from + 1 > TERMS_MAX) return { error: 'many' };
        for (k = from; k <= to; k++) {
            if (key) vars[key] = k;
            v = key ? c.at(0, deg) : c.at(k, deg);
            if (!isFinite(v)) return { value: NaN };
            if (product) {
                total *= v;
            } else { // Kahan's sum: the part each addition rounds off is kept, for the next
                y = v - fix;
                t = total + y;
                fix = t - total - y;
                total = t;
            }
        }
        return { value: round(total) };
    }

    // The limit of c as x comes to a: { left, right, value }, the value where the two agree, or
    // of the one side that has values, as ln x at 0. Of a of ±∞ only the side it comes from,
    // value as well. Each a number, ±Infinity where it grows without end, or NaN where it has
    // none, as sin(1/x) at 0
    function limit(c, a, deg) {
        var left, right, same, side = Math.max(1, Math.abs(a));
        if (isNaN(a)) return { left: NaN, right: NaN, value: NaN };
        if (!isFinite(a)) {
            left = approach(function (t) { return c.at((a > 0 ? 1 : -1) / t, deg); }, NaN);
            if (left === undefined) left = NaN;
            return a > 0 ? { left: left, right: NaN, value: left } : { left: NaN, right: left, value: left };
        }
        left = approach(function (t) { return c.at(a - t * side, deg); }, c.at(a, deg));
        right = approach(function (t) { return c.at(a + t * side, deg); }, c.at(a, deg));
        if (left === undefined || right === undefined) {
            return { left: left === undefined ? NaN : left, right: right === undefined ? NaN : right, value: left === undefined ? (right === undefined ? NaN : right) : left };
        }
        same = left === right || isFinite(left) && Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left));
        return { left: left, right: right, value: same ? left : NaN };
    }

    // What g(t) comes to as t comes down to 0, at comes being g(0) where it has one: its values
    // at t of 1/8 halved again and again, 36 times. The limit where they grow without end, each
    // step as much as the last or more, as 1/x or ln x at 0; else where Richardson's
    // extrapolation of them, or Aitken's, settles, two steps alike to 8 digits; else where they
    // come to one value, or to g(0) without a jump, as sqrt(x) does to 0. To as many digits as
    // it settles to, 12 at most; NaN where it does none of these, undefined where it has no
    // values at all. Values that stop where a number grows too large, as x/e^x by x of 1000,
    // are taken as far as they go
    function approach(g, at) {
        var v = [], t = 0.125, k, j, R = [], est = [], err, best, d, K = 36, tail, grow, scale = 0, stop;
        for (k = 0; k <= K; k++, t /= 2) {
            v.push(g(t));
            if (isFinite(v[k])) scale = Math.max(scale, Math.abs(v[k]));
        }
        if (v.every(isNaN)) return undefined;
        stop = v.findIndex(isNaN);
        if (stop >= 6 && v.slice(stop).every(function (y) { return !isFinite(y); })) {
            v = v.slice(0, stop);
            K = stop - 1;
        }
        tail = v.slice(Math.max(0, K - 12));
        if (!tail.every(function (y) { return !isNaN(y); })) return NaN;
        if (tail.every(function (y) { return y === Infinity; }) || tail.every(function (y) { return y === -Infinity; })) return tail[0];
        if (!tail.every(isFinite)) return NaN;
        // growing without end: the same sign, and each step away from 0 as long as the last, or longer
        grow = true;
        for (k = Math.max(2, K - 9); k <= K; k++) {
            if ((v[k] > 0) !== (v[K] > 0) || Math.abs(v[k]) <= Math.abs(v[k - 1]) ||
                Math.abs(v[k] - v[k - 1]) < 0.9 * Math.abs(v[k - 1] - v[k - 2])) grow = false;
        }
        if (grow) return v[K] > 0 ? Infinity : -Infinity;
        function settled(list) { // where two steps of a list are alike, the one whose step is least
            var at = -1, e = Infinity, k, d;
            for (k = 2; k < list.length; k++) {
                if (!isFinite(list[k]) || !isFinite(list[k - 1]) || !isFinite(list[k - 2])) continue;
                d = Math.max(Math.abs(list[k] - list[k - 1]), Math.abs(list[k - 1] - list[k - 2]));
                if (d < e) {
                    e = d;
                    at = k;
                }
            }
            return at > -1 && e <= 1e-8 * Math.max(1, Math.abs(list[at])) ? { v: list[at], e: e } : null;
        }
        // Richardson's: the error as a sum of powers of t, taken away a power at a time
        for (k = 0; k <= K; k++) {
            R[k] = [v[k]];
            for (j = 1; j <= Math.min(k, 6); j++) R[k][j] = R[k][j - 1] + (R[k][j - 1] - R[k - 1][j - 1]) / (Math.pow(2, j) - 1);
            est.push(R[k][Math.min(k, 6)]);
        }
        best = settled(est.slice(7));
        // Aitken's: steps that shrink by the same part each time, as t^½ does
        if (!best) {
            est = [];
            for (k = 2; k <= K; k++) {
                d = v[k] - 2 * v[k - 1] + v[k - 2];
                est.push(Math.abs(v[k] - v[k - 1]) < Math.abs(v[k - 1] - v[k - 2]) && d ? v[k] - (v[k] - v[k - 1]) * (v[k] - v[k - 1]) / d : NaN);
            }
            best = settled(est);
        }
        if (!best && Math.max.apply(null, tail.slice(-4)) - Math.min.apply(null, tail.slice(-4)) <= 1e-8 * Math.max(1, Math.abs(v[K]))) {
            best = { v: v[K], e: Math.max.apply(null, tail.slice(-4)) - Math.min.apply(null, tail.slice(-4)) };
        }
        if (!best && isFinite(at) && Math.abs(v[K] - at) < 1e-4 * Math.max(1, Math.abs(v[0] - at))) {
            for (k = Math.max(1, K - 9), j = true; k <= K; k++) if (!(Math.abs(v[k] - at) < Math.abs(v[k - 1] - at))) j = false;
            if (j) best = { v: at, e: 0 };
        }
        if (!best) return NaN;
        err = Math.max(best.e, 1e-13 * Math.abs(best.v));
        if (Math.abs(best.v) <= Math.max(err, 1e-12 * scale)) return 0;
        return +best.v.toPrecision(Math.max(1, Math.min(12, Math.floor(Math.log10(Math.abs(best.v) / err))))) + 0;
    }

    // y′ = f(x, y), a function of x and y typed, as x + y, or y' = x y, from y(x0) = y0 to x:
    // Runge and Kutta's way of the fourth order in 16 steps, then twice as many, until two
    // agree to 11 digits, up to a quarter of a million steps. { y, slope: y′ there } or
    // { error: 'function' | 'letters' }; y NaN where it has no value on the way or does not settle
    function ode(text, comma, deg, x0, y0, x1) {
        var s = String(text).trim().replace(/^(y\s*['′’]|dy\s*\/\s*dx)\s*=\s*/i, ''), c, n, y, last = NaN, f;
        // of x and y as an equation of them is read, its left side less 0; of x alone, or neither, as a function
        c = s && !/[=<>≤≥]/.test(s) && Engine.relation('(' + s + ') = 0', comma, {});
        if (c) {
            f = function (x, y) { return c.at(x, y, deg); };
        } else {
            c = s && !/[=<>≤≥]/.test(s) && Engine.graph(s, comma, {});
            f = c && function (x) { return c.at(x, deg); };
        }
        if (!c) return { error: 'function' };
        if (c.letters.length) return { error: 'letters' };
        if (![x0, y0, x1].every(isFinite)) return { y: NaN, slope: NaN };
        if (x0 === x1) return { y: y0, slope: round(f(x0, y0)) };
        function walk(n) {
            var h = (x1 - x0) / n, x = x0, y = y0, k, k1, k2, k3, k4;
            for (k = 0; k < n; k++) {
                k1 = f(x, y);
                k2 = f(x + h / 2, y + h * k1 / 2);
                k3 = f(x + h / 2, y + h * k2 / 2);
                k4 = f(x + h, y + h * k3);
                y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
                x = x0 + (k + 1) * h;
                if (!isFinite(y)) return NaN;
            }
            return y;
        }
        for (n = 16; n <= 262144; n *= 2) {
            y = walk(n);
            if (isNaN(y)) break;
            if (Math.abs(y - last) <= 1e-11 * Math.max(1, Math.abs(y))) {
                y += (y - last) / 15; // the error of the fourth order, a sixteenth for twice the steps
                return { y: +y.toPrecision(10) + 0, slope: +f(x1, y).toPrecision(10) + 0 };
            }
            last = y;
        }
        return { y: NaN, slope: NaN };
    }

    // ---------- probability ---------- //

    // ln Γ(x), by Lanczos's sum, for x above 0
    function lnGamma(x) {
        var s = LANCZOS[0], t, k;
        if (x < 0.5) return Math.log(PI / Math.abs(Math.sin(PI * x))) - lnGamma(1 - x);
        x -= 1;
        for (k = 1; k < 9; k++) s += LANCZOS[k] / (x + k);
        t = x + 7.5;
        return 0.5 * Math.log(2 * PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
    }

    // The chance that a standard normal value is above z, for z of 0 or more: the series of
    // the whole up to 3, else the continued fraction of the tail, so a small one keeps its digits
    function upper(z) {
        var d = Math.exp(-z * z / 2) / Math.sqrt(2 * PI), s, t, k, f, c, e, del;
        if (z <= 3) {
            for (s = t = z, k = 1; Math.abs(t) > 1e-17 * Math.abs(s); k++) {
                t *= z * z / (2 * k + 1);
                s += t;
            }
            return 0.5 - d * s;
        }
        // Lentz's way: z + 1/(z + 2/(z + 3/(z + …)))
        f = z;
        c = z;
        e = 0;
        for (k = 1; k < 500; k++) {
            e = z + k * e;
            e = e === 0 ? 1e-300 : 1 / e;
            c = z + k / c;
            if (c === 0) c = 1e-300;
            del = c * e;
            f *= del;
            if (Math.abs(del - 1) < 1e-16) break;
        }
        return d / f;
    }

    // the chance that a standard normal value is below z
    function below(z) {
        return z === -Infinity ? 0 : z === Infinity ? 1 : z >= 0 ? 1 - upper(z) : upper(-z);
    }

    // the chance that a normal value of mean mu and standard deviation sigma is between a and b;
    // both above the mean from the tail above, so a small chance keeps its digits
    function normalBetween(a, b, mu, sigma) {
        var za = (a - mu) / sigma, zb = (b - mu) / sigma;
        if (!(sigma > 0) || isNaN(za) || isNaN(zb)) return NaN;
        if (za > zb) return -normalBetween(b, a, mu, sigma);
        if (za >= 0) return round((za === Infinity ? 0 : upper(za)) - (zb === Infinity ? 0 : upper(zb)));
        return round(below(zb) - below(za));
    }

    // the density of the normal distribution at x
    function normalDensity(x, mu, sigma) {
        var z = (x - mu) / sigma;
        return sigma > 0 && isFinite(z) ? round(Math.exp(-z * z / 2) / (sigma * Math.sqrt(2 * PI))) : NaN;
    }

    // The x that a normal value is below with the chance p: Acklam's guess, then Halley's steps
    function normalInverse(p, mu, sigma) {
        var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239],
            b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
            c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
            d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416],
            q, r, z, e, u, k;
        if (!(p > 0 && p < 1) || !(sigma > 0) || !isFinite(mu)) return NaN;
        if (p < 0.02425) {
            q = Math.sqrt(-2 * Math.log(p));
            z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
        } else if (p > 1 - 0.02425) {
            q = Math.sqrt(-2 * Math.log(1 - p));
            z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
        } else {
            q = p - 0.5;
            r = q * q;
            z = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
                (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
        }
        for (k = 0; k < 3; k++) {
            e = z < 0 ? below(z) - p : (1 - p) - upper(z); // below(z) – p, from the tail nearer z
            u = e * Math.sqrt(2 * PI) * Math.exp(z * z / 2);
            z -= u / (1 + z * u / 2);
        }
        return round(mu + sigma * z);
    }

    // the chance of k of n, each with the chance p: of exactly k, by logarithms so n may be large
    function binomial(n, p, k) {
        if (!isWhole(n) || n < 0 || !(p >= 0 && p <= 1) || !isFinite(k)) return NaN;
        if (k !== Math.floor(k) || k < 0 || k > n) return 0;
        if (p === 0 || p === 1) return (p === 0 ? k === 0 : k === n) ? 1 : 0;
        return Math.exp(lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p));
    }

    // the chance of exactly k of a Poisson count of mean lambda
    function poisson(lambda, k) {
        if (!(lambda > 0) || !isFinite(lambda) || !isFinite(k)) return NaN;
        if (k !== Math.floor(k) || k < 0) return 0;
        return Math.exp(k * Math.log(lambda) - lambda - lnGamma(k + 1));
    }

    // The chances of a count k: { eq: exactly k, le: k or fewer, ge: k or more }, chance(j) being
    // that of exactly j, from 0 up to top. The smaller of k or fewer and k or more is summed, the
    // other is 1 less it, so a small one keeps its digits
    function counts(chance, k, top) {
        var le = 0, ge = 0, j, eq;
        if (isNaN(chance(0)) || !isFinite(k)) return { eq: NaN, le: NaN, ge: NaN };
        k = Math.floor(k);
        eq = chance(k);
        if (k < 0) return { eq: 0, le: 0, ge: 1 };
        if (k <= (isFinite(top) ? top / 2 : 0)) {
            for (j = 0; j <= k; j++) le += chance(j);
            ge = 1 - le + eq;
        } else if (isFinite(top)) {
            for (j = Math.min(k, top); j <= top; j++) ge += chance(j);
            if (k > top) ge = 0;
            le = 1 - ge + eq;
        } else {
            for (j = 0; j <= k; j++) le += chance(j);
            ge = 1 - le + eq;
        }
        return { eq: round(eq), le: round(Math.min(1, Math.max(0, le))), ge: round(Math.min(1, Math.max(0, ge))) };
    }

    function isWhole(n) {
        return isFinite(n) && n === Math.floor(n);
    }

    // a whole number from a to b, both in, as evenly as the browser's random numbers allow
    function randomWhole(a, b, random) {
        if (!isWhole(a) || !isWhole(b) || a > b || b - a > 1e15) return NaN;
        return a + Math.floor((random || Math.random)() * (b - a + 1));
    }

    // ---------- complex numbers ---------- //

    // a complex number of re and im, a tiny part beside a large one being 0: e^(iπ) is -1
    function tidyComplex(z) {
        var size = cabs(z), re = Math.abs(z[0]) <= 1e-14 * size ? 0 : z[0], im = Math.abs(z[1]) <= 1e-14 * size ? 0 : z[1];
        return { re: round(re), im: round(im) };
    }

    function cexp(z) {
        var r = Math.exp(z[0]);
        return z[1] ? [r * Math.cos(z[1]), r * Math.sin(z[1])] : [r, 0];
    }

    function clog(z) {
        return [Math.log(cabs(z)), Math.atan2(z[1], z[0])];
    }

    // z to the power w; a real power of a real number that has one stays real, (-8)^3 as well
    function cpow(z, w) {
        var n, out, k;
        if (!w[1] && !z[1] && (z[0] >= 0 || w[0] === Math.floor(w[0]))) return [Math.pow(z[0], w[0]), 0];
        if (!w[1] && w[0] === Math.floor(w[0]) && Math.abs(w[0]) <= 64) { // a whole power by products, exact as far as they go
            n = Math.abs(w[0]);
            for (out = [1, 0], k = 0; k < n; k++) out = cmul(out, z);
            return w[0] < 0 ? cdiv([1, 0], out) : out;
        }
        if (!z[0] && !z[1]) return w[0] > 0 ? [0, 0] : [NaN, NaN];
        return cexp(cmul(w, clog(z)));
    }

    function csqrt(z) {
        var r = cabs(z), a, b;
        if (!z[1]) return z[0] >= 0 ? [Math.sqrt(z[0]), 0] : [0, Math.sqrt(-z[0])];
        a = Math.sqrt((r + z[0]) / 2);
        b = Math.sqrt((r - z[0]) / 2);
        return [a, z[1] < 0 ? -b : b];
    }

    function csin(z) {
        return [Math.sin(z[0]) * Math.cosh(z[1]), Math.cos(z[0]) * Math.sinh(z[1])];
    }

    function ccos(z) {
        return [Math.cos(z[0]) * Math.cosh(z[1]), -Math.sin(z[0]) * Math.sinh(z[1])];
    }

    // the inverses by their logarithms: asin z = -i ln(iz + √(1 – z²)), and the like
    function casin(z) {
        var w = clog(add(cmul([0, 1], z), csqrt(sub([1, 0], cmul(z, z)))));
        return [w[1], -w[0]];
    }

    function cacos(z) {
        var a = casin(z);
        return [PI / 2 - a[0], -a[1]];
    }

    function catan(z) {
        var w = cdiv(add([1, 0], cmul([0, 1], z)), sub([1, 0], cmul([0, 1], z))); // (1 + iz) / (1 – iz)
        w = clog(w);
        return [w[1] / 2, -w[0] / 2];
    }

    function add(a, b) {
        return [a[0] + b[0], a[1] + b[1]];
    }

    function sub(a, b) {
        return [a[0] - b[0], a[1] - b[1]];
    }

    // Γ(x) of a real x, by Lanczos's sum, the reflection for x below 1/2
    function gammaOf(x) {
        if (x === Math.floor(x) && x <= 0) return NaN;
        if (x < 0.5) return PI / (Math.sin(PI * x) * gammaOf(1 - x));
        if (x === Math.floor(x) && x <= 171) {
            for (var f = 1, k = 2; k < x; k++) f *= k;
            return f;
        }
        return Math.exp(lnGamma(x));
    }

    // The value of a complex expression, as the engine reads it, i its imaginary unit: [re, im].
    // Functions of an angle take it in the unit deg, as the calculator does, and their inverses
    // give one; what has no complex sense here, as 5! of a complex number, is none (NaN)
    function cvalue(n, deg) {
        var a, b, toRad = [1, PI / 180, PI / 200][deg || 0], k;
        function real(f) { // a function of real numbers only
            return !a[1] ? [f(a[0]), 0] : [NaN, NaN];
        }
        function both(f) {
            return !a[1] && !b[1] ? [f(a[0], b[0]), 0] : [NaN, NaN];
        }
        switch (n.t) {
            case 'num': return [+n.v, 0];
            case 'const':
                if (n.v === 'i' && n.p) return [0, 1];
                return n.v === 'π' ? [PI, 0] : n.v === 'e' ? [Math.E, 0] : [NaN, NaN];
            case 'group': return cvalue(n.arg, deg);
            case 'neg':
                a = cvalue(n.arg, deg);
                return [0 - a[0], 0 - a[1]]; // not -0, whose angle is the other way: ln(-1) is iπ
            case 'fn':
            case 'post':
                a = cvalue(n.arg, deg);
                k = n.deg === undefined ? toRad : PI / 180; // sin(30°) in degrees whatever the unit
                switch (n.key) {
                    case '%': return [a[0] / 100, a[1] / 100];
                    case '1/x': return cdiv([1, 0], a);
                    case 'x2': return cmul(a, a);
                    case 'x3': return cmul(cmul(a, a), a);
                    case 'x!': return real(function (x) { return gammaOf(x + 1); });
                    case 'ex': return cexp(a);
                    case '2x': return cpow([2, 0], a);
                    case '10x': return cpow([10, 0], a);
                    case '√': return csqrt(a);
                    case 'ln': return clog(a);
                    case 'log': b = clog(a); return [b[0] / Math.LN10, b[1] / Math.LN10];
                    case 'log2': b = clog(a); return [b[0] / Math.LN2, b[1] / Math.LN2];
                    case 'sin': return csin([a[0] * k, a[1] * k]);
                    case 'cos': return ccos([a[0] * k, a[1] * k]);
                    case 'tan': return cdiv(csin([a[0] * k, a[1] * k]), ccos([a[0] * k, a[1] * k]));
                    case 'sin-1': b = casin(a); return [b[0] / toRad, b[1] / toRad];
                    case 'cos-1': b = cacos(a); return [b[0] / toRad, b[1] / toRad];
                    case 'tan-1': b = catan(a); return [b[0] / toRad, b[1] / toRad];
                    case 'sinh': return cmul([0, -1], csin(cmul([0, 1], a)));
                    case 'cosh': return ccos(cmul([0, 1], a));
                    case 'tanh': return cdiv(cmul([0, -1], csin(cmul([0, 1], a))), ccos(cmul([0, 1], a)));
                    case 'sinh-1': return clog(add(a, csqrt(add(cmul(a, a), [1, 0]))));
                    case 'cosh-1': return clog(add(a, cmul(csqrt(add(a, [1, 0])), csqrt(sub(a, [1, 0])))));
                    case 'tanh-1': b = clog(cdiv(add([1, 0], a), sub([1, 0], a))); return [b[0] / 2, b[1] / 2];
                    case 'abs': return [cabs(a), 0];
                    case 'round': case 'floor': case 'ceil': case 'trunc': // each part, as of the number it reads
                        b = tidyComplex(a);
                        return [toWhole(b.re, n.key), toWhole(b.im, n.key)];
                }
                return [NaN, NaN];
            case 'bin':
                a = cvalue(n.l, deg);
                b = cvalue(n.r, deg);
                switch (n.op) {
                    case '+': return add(a, b);
                    case '–': return sub(a, b);
                    case '×': return cmul(a, b);
                    case '÷': return cdiv(a, b);
                    case 'yx': return cpow(a, b);
                    case 'x√y': // the b-th root of a: of a negative number an odd root is real
                        if (!a[1] && !b[1] && a[0] < 0 && b[0] === Math.floor(b[0]) && b[0] % 2) return [-Math.pow(-a[0], 1 / b[0]), 0];
                        return cpow(a, cdiv([1, 0], b));
                    case 'logy': return cdiv(clog(a), clog(b));
                    case 'EE': return cmul(a, cpow([10, 0], b));
                    case 'mod': return both(function (x, y) { return x - y * Math.floor(x / y); });
                    case 'gcd': return both(function (x, y) { x = Math.abs(x); y = Math.abs(y); while (y) { var t = y; y = x % y; x = t; } return x; });
                    case 'lcm': return both(function (x, y) { var g = x, h = y; while (h) { var t = h; h = g % h; g = t; } return Math.abs(x * y / g); });
                    case 'nCr':
                    case 'nPr': return both(function (x, y) {
                        return n.op === 'nCr' ? gammaOf(x + 1) / (gammaOf(y + 1) * gammaOf(x - y + 1)) : gammaOf(x + 1) / gammaOf(x - y + 1);
                    });
                }
        }
        return [NaN, NaN];
    }

    // A complex number typed: (2 + 3i)(1 – i), sqrt(-4), e^(iπ), or in polar form, 2∠30 for a
    // length of 2 at an angle of 30 in the unit deg. { re, im }, or null where it is not one, as
    // with x or a letter but i
    function complex(text, comma, deg) {
        var s = String(text).replace(/(\d+\.?\d*|\.\d+)\s*∠\s*([-+−–]?\s*(?:\d+\.?\d*|\.\d+)°?)/g, '($1)(cos($2) + i sin($2))'),
            t = s.trim() && Engine.tree(s, comma), z, bad = false;
        (function letters(n) {
            if (!n) return;
            if (n.t === 'const' && (n.v === 'x' || (n.p && n.v !== 'i'))) bad = true;
            letters(n.arg);
            letters(n.l);
            letters(n.r);
        })(t);
        if (!t || bad) return null;
        z = cvalue(t, deg);
        return isFinite(z[0]) && isFinite(z[1]) ? tidyComplex(z) : { re: NaN, im: NaN };
    }

    // its length and angle, the angle in the unit deg, from -half a turn to half a turn
    function polar(z, deg) {
        return { r: round(Math.hypot(z.re, z.im)), theta: round(Math.atan2(z.im, z.re) / [1, PI / 180, PI / 200][deg || 0]) };
    }

    // the n n-th roots of z, from the angle nearest 0 round
    function croots(z, n) {
        var r, t, k, out = [];
        if (!(n >= 1 && n <= 24 && n === Math.floor(n)) || !isFinite(z.re) || !isFinite(z.im)) return null;
        r = Math.pow(Math.hypot(z.re, z.im), 1 / n);
        t = Math.atan2(z.im, z.re);
        for (k = 0; k < n; k++) out.push(tidyComplex([r * Math.cos((t + 2 * PI * k) / n), r * Math.sin((t + 2 * PI * k) / n)]));
        return out;
    }

    // ---------- bases ---------- //

    // A calculation of whole numbers in bits, signed as a computer keeps them: decimal, 0x1F,
    // 0b1010 or 0o17; + – × ÷ (whole), mod or %, AND & OR | XOR NOT ~, NAND, NOR, XNOR, << >>,
    // ROL and ROR, which turn the bits round, brackets. Each value kept to the bits, as the machine does. { value: a BigInt, wrapped:
    // it did not fit } or { error: 'expression' | 'zero' | 'bits' }
    function bitwise(text, bits) {
        var s = String(text).trim(), toks = [], m, i = 0, wrapped = false, out;
        if ([8, 16, 32, 64].indexOf(bits) < 0) return { error: 'bits' };
        while (s) {
            if ((m = /^\s+/.exec(s))) {
                // skipped
            } else if ((m = /^0x([0-9a-f]+)/i.exec(s))) {
                toks.push({ n: BigInt('0x' + m[1]) });
            } else if ((m = /^0b([01]+)/i.exec(s))) {
                toks.push({ n: BigInt('0b' + m[1]) });
            } else if ((m = /^0o([0-7]+)/i.exec(s))) {
                toks.push({ n: BigInt('0o' + m[1]) });
            } else if ((m = /^\d+/.exec(s))) {
                toks.push({ n: BigInt(m[0]) });
            } else if ((m = /^(nand|nor|xnor|and|xor|or|not|mod|shl|shr|rol|ror)(?![a-z])/i.exec(s))) {
                toks.push({ op: m[0].toLowerCase() });
            } else if ((m = /^(<<|>>|[-+−–*×/÷%&|~()])/.exec(s))) {
                toks.push({ op: { '−': '-', '–': '-', '×': '*', '÷': '/', '&': 'and', '|': 'or', '~': 'not', '%': 'mod', '<<': 'shl', '>>': 'shr' }[m[0]] || m[0] });
            } else {
                return { error: 'expression' };
            }
            s = s.slice(m[0].length);
        }
        function fit(v) {
            var w = BigInt.asIntN(bits, v);
            if (w !== v) wrapped = true;
            return w;
        }
        function is(op) {
            return toks[i] && toks[i].op === op;
        }
        function unary() {
            var t = toks[i++], v;
            if (!t) throw 'expression';
            if (t.op === '-') return fit(-unary());
            if (t.op === '+') return unary();
            if (t.op === 'not') return fit(~unary());
            if (t.op === '(') {
                v = or();
                if (!is(')')) throw 'expression';
                i++;
                return v;
            }
            if (t.n === undefined) throw 'expression';
            return fit(t.n);
        }
        function level(next, ops, f) {
            return function () {
                var v = next(), op;
                while (toks[i] && ops.indexOf(toks[i].op) > -1) {
                    op = toks[i++].op;
                    v = fit(f(op, v, next()));
                }
                return v;
            };
        }
        var product = level(unary, ['*', '/', 'mod'], function (op, a, b) {
            if (op !== '*' && b === BigInt(0)) throw 'zero';
            return op === '*' ? a * b : op === '/' ? a / b : ((a % b) + b) % b;
        });
        var sum = level(product, ['+', '-'], function (op, a, b) { return op === '+' ? a + b : a - b; });
        var shift = level(sum, ['shl', 'shr', 'rol', 'ror'], function (op, a, b) {
            var n = BigInt(bits), u = BigInt.asUintN(bits, a), k;
            if (op === 'rol' || op === 'ror') { // turned round: what goes out at one end comes in at the other
                k = ((op === 'rol' ? b : -b) % n + n) % n;
                return BigInt.asIntN(bits, (u << k) | (u >> (n - k)));
            }
            if (b < BigInt(0) || b >= n) return op === 'shl' || a >= BigInt(0) ? BigInt(0) : BigInt(-1);
            return op === 'shl' ? a << b : a >> b;
        });
        var and = level(shift, ['and', 'nand'], function (op, a, b) { return op === 'and' ? a & b : ~(a & b); });
        var xor = level(and, ['xor', 'xnor'], function (op, a, b) { return op === 'xor' ? a ^ b : ~(a ^ b); });
        var or = level(xor, ['or', 'nor'], function (op, a, b) { return op === 'or' ? a | b : ~(a | b); });
        if (!toks.length) return { error: 'expression' };
        try {
            out = or();
        } catch (e) {
            if (e === 'expression' || e === 'zero') return { error: e };
            throw e;
        }
        if (i < toks.length) return { error: 'expression' };
        return { value: out, wrapped: wrapped };
    }

    // a value of bits in a base, as the bits are: -1 in 8 bits is FF; binary all of them, in fours apart
    function inBase(v, bits, base) {
        var s = BigInt.asUintN(bits, v).toString(base).toUpperCase();
        return base !== 2 ? s : s.padStart(bits, '0').replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    // The bits of a value, as inBase keeps them: { ones, leading, trailing zeros, highest and
    // lowest bit set, -1 for none }
    function bitCount(v, bits) {
        var s = BigInt.asUintN(bits, v).toString(2).padStart(bits, '0'), ones = s.replace(/0/g, '').length;
        return {
            ones: ones, leading: ones ? s.indexOf('1') : bits, trailing: ones ? bits - 1 - s.lastIndexOf('1') : bits,
            high: ones ? bits - 1 - s.indexOf('1') : -1, low: ones ? bits - 1 - s.lastIndexOf('1') : -1
        };
    }

    // a value of the bits, b-th of them, 0 the lowest, turned over
    function flipBit(v, bits, b) {
        return BigInt.asIntN(bits, v ^ (BigInt(1) << BigInt(b)));
    }

    // ---------- floating point ---------- //

    // A number as the machine keeps it, by IEEE 754: in 64 bits, a double, as here, and in 32, a
    // float. A number typed, 0.1, pi, inf or nan, or the bits of one, 0x3FB999999999999A in 16
    // hexadecimal digits for a double, 0x3DCCCCCD in up to 8 for a float. { x: the double, of: 32
    // where the bits were a float's, hex64, hex32, bits: sign, exponent and fraction apart, sign,
    // exponent, kind, exact: the double to its last digit, exact32: the float's, float: it as a
    // number, ulp: the gap to the next double } or { error: 'number' }
    function float(text, comma, deg) {
        var s = String(text).trim(), hex = /^0x([0-9a-f]{1,16})$/i.exec(s.replace(/[\s_]/g, '')), dv = new DataView(new ArrayBuffer(8)), x, of = 64,
            all, e, f, kind, next;
        if (hex) {
            if (hex[1].length <= 8) {
                dv.setUint32(0, parseInt(hex[1], 16));
                x = dv.getFloat32(0);
                of = 32;
            } else {
                dv.setBigUint64(0, BigInt('0x' + hex[1]));
                x = dv.getFloat64(0);
            }
        } else if (/^[-+−–]?nan$/i.test(s)) {
            x = NaN;
        } else {
            x = number(s, comma, deg, true);
            if (isNaN(x)) return { error: 'number' };
        }
        dv.setFloat64(0, x);
        all = dv.getBigUint64(0);
        e = Number((all >> BigInt(52)) & BigInt(0x7FF));
        f = all & ((BigInt(1) << BigInt(52)) - BigInt(1));
        kind = e === 0x7FF ? (f ? 'NaN' : 'Infinity') : e ? 'Normal' : f ? 'Subnormal' : 'Zero';
        dv.setBigUint64(0, (all & ((BigInt(1) << BigInt(63)) - BigInt(1))) + BigInt(1)); // the next double away from 0
        next = dv.getFloat64(0);
        dv.setFloat32(0, x);
        return {
            x: x, of: of,
            hex64: all.toString(16).toUpperCase().padStart(16, '0'),
            hex32: dv.getUint32(0).toString(16).toUpperCase().padStart(8, '0'),
            bits: String(all >> BigInt(63)) + ' ' + e.toString(2).padStart(11, '0') + ' ' + f.toString(2).padStart(52, '0'),
            sign: all >> BigInt(63) ? -1 : 1,
            exponent: kind === 'Normal' ? e - 1023 : kind === 'Subnormal' || kind === 'Zero' ? -1022 : NaN,
            kind: kind,
            exact: exactly(x),
            exact32: exactly(Math.fround(x)),
            float: Math.fround(x),
            ulp: isFinite(x) ? next - Math.abs(x) : NaN
        };
    }

    // A double as it is, to its last digit, which it has: 0.1 is
    // 0.1000000000000000055511151231257827021181583404541015625. Up to 60 digits, then …; one
    // of more than 21 whole digits, or 0. and more than 20 0s, as 1.0000000000000000525…e+300
    function exactly(x) {
        var dv = new DataView(new ArrayBuffer(8)), all, e, m, digits, point, s, sig, power;
        if (!isFinite(x)) return isNaN(x) ? 'NaN' : x > 0 ? '∞' : '–∞';
        if (x === 0) return Object.is(x, -0) ? '–0' : '0';
        dv.setFloat64(0, x);
        all = dv.getBigUint64(0);
        e = Number((all >> BigInt(52)) & BigInt(0x7FF));
        m = all & ((BigInt(1) << BigInt(52)) - BigInt(1));
        if (e) m |= BigInt(1) << BigInt(52);
        e = (e || 1) - 1075; // x is m × 2^e, so m × 5^-e ÷ 10^-e where e is below 0
        digits = e >= 0 ? (m << BigInt(e)).toString() : (m * BigInt(5) ** BigInt(-e)).toString();
        point = e >= 0 ? digits.length : digits.length + e; // the digits before the point
        sig = digits.replace(/0+$/, '');
        power = point - 1;
        if (power > 20 || power < -21) {
            s = sig.charAt(0) + (sig.length > 1 ? '.' + sig.slice(1, 60) : '') + (sig.length > 60 ? '…' : '') + 'e' + (power > 0 ? '+' : '') + power;
        } else {
            s = point >= digits.length ? digits : (point > 0 ? digits.slice(0, point) + '.' + digits.slice(point) : '0.' + '0'.repeat(-point) + digits).replace(/\.?0+$/, '');
            if (sig.length > 60) s = s.slice(0, s.length - (sig.length - 60)) + '…';
        }
        return (x < 0 ? '–' : '') + s;
    }

    // ---------- matrices: arrays of rows ---------- //

    // the determinant of a square matrix, by elimination with the largest first
    function det(a) {
        var n = a.length, m = a.map(function (r) { return r.slice(); }), d = 1, i, j, k, p, f, big;
        if (!n || m.some(function (r) { return r.length !== n; })) return NaN;
        big = Math.max.apply(null, m.map(function (r) { return Math.max.apply(null, r.map(Math.abs)); })) || 1;
        for (j = 0; j < n; j++) {
            p = j;
            for (i = j + 1; i < n; i++) if (Math.abs(m[i][j]) > Math.abs(m[p][j])) p = i;
            if (Math.abs(m[p][j]) <= 1e-13 * big) return 0;
            if (p !== j) {
                f = m[j];
                m[j] = m[p];
                m[p] = f;
                d = -d;
            }
            d *= m[j][j];
            for (i = j + 1; i < n; i++) {
                f = m[i][j] / m[j][j];
                for (k = j; k < n; k++) m[i][k] -= f * m[j][k];
            }
        }
        return round(d);
    }

    // the inverse of a square matrix, by Gauss and Jordan; null where it has none
    function inverse(a) {
        var n = a.length, rows, r;
        if (!n || a.some(function (row) { return row.length !== n; })) return null;
        rows = a.map(function (row, i) { return row.concat(a.map(function (x, j) { return i === j ? 1 : 0; })); });
        r = reduce(rows, n);
        if (r.rank < n) return null;
        r = r.m.map(function (row) { return row.slice(n); });
        return clean(r, [r]);
    }

    // A matrix's rows reduced, as far as its first cols columns go, a number as small as tol of
    // the largest being 0, 1e-12 of it unless given: { m, rank, where: the column of each row's first 1 }
    function reduce(a, cols, tol) {
        var m = a.map(function (r) { return r.slice(); }), rows = m.length, rank = 0, where = [], i, j, k, p, f, big;
        big = Math.max.apply(null, m.map(function (r) { return Math.max.apply(null, r.slice(0, cols).map(Math.abs)); })) || 1;
        for (j = 0; j < cols && rank < rows; j++) {
            p = rank;
            for (i = rank + 1; i < rows; i++) if (Math.abs(m[i][j]) > Math.abs(m[p][j])) p = i;
            if (Math.abs(m[p][j]) <= (tol || 1e-12) * big) continue;
            f = m[rank];
            m[rank] = m[p];
            m[p] = f;
            f = m[rank][j];
            for (k = 0; k < m[rank].length; k++) m[rank][k] /= f;
            for (i = 0; i < rows; i++) {
                if (i === rank) continue;
                f = m[i][j];
                for (k = 0; k < m[i].length; k++) m[i][k] -= f * m[rank][k];
            }
            where.push(j);
            rank++;
        }
        return { m: m, rank: rank, where: where };
    }

    function rank(a) {
        return a.length ? reduce(a, a[0].length).rank : 0;
    }

    function transpose(a) {
        return a[0].map(function (x, j) { return a.map(function (row) { return row[j]; }); });
    }

    // the sum or difference of two matrices of one size, or null
    function plus(a, b, minus) {
        if (a.length !== b.length || a[0].length !== b[0].length) return null;
        return clean(a.map(function (row, i) { return row.map(function (x, j) { return minus ? x - b[i][j] : x + b[i][j]; }); }), [a, b]);
    }

    // the product of two matrices, the columns of a as many as the rows of b, or null; raw: not cleaned
    function times(a, b, raw) {
        var m;
        if (a[0].length !== b.length) return null;
        m = a.map(function (row) {
            return b[0].map(function (x, j) { return row.reduce(function (s, v, k) { return s + v * b[k][j]; }, 0); });
        });
        return raw ? m : clean(m, [a, b]);
    }

    // a matrix found, to 12 digits, a number as small as the rounding of the ones it came from
    // being 0: 2.8e-17 in an inverse is 0
    function clean(m, from) {
        var big = Math.max.apply(null, from.concat([m]).map(function (a) {
            return Math.max.apply(null, a.map(function (r) { return Math.max.apply(null, r.map(Math.abs)); }));
        }));
        return m.map(function (r) { return r.map(function (x) { return Math.abs(x) <= 1e-12 * big ? 0 : round(x); }); });
    }

    // The characteristic polynomial of a square matrix, det(λI – A), by Faddeev and LeVerrier:
    // its coefficients, the highest power first, which is 1
    function characteristic(a) {
        var n = a.length, m = a.map(function (r) { return r.map(function () { return 0; }); }), c = [1], k, am, i;
        for (k = 1; k <= n; k++) {
            m = m.map(function (r, i) { return r.map(function (x, j) { return x + (i === j ? c[k - 1] : 0); }); });
            am = times(a, m, true);
            for (i = 0, c[k] = 0; i < n; i++) c[k] -= am[i][i] / k;
            m = am;
        }
        return c;
    }

    // The eigenvalues of a square matrix, the roots of its characteristic polynomial, as poly
    // gives them, real or a ± bi; and for each real one its eigenvectors, as the matrix less it
    // times I takes to 0: each with a 1 where it is free, made whole where a small whole number
    // times it is, [-1, 2] not [-0.5, 1]. { poly, values: [{ re, im }], vectors: [{ value, v }] }; null if not square
    function eigen(a) {
        var n = a.length, c, values, vectors = [];
        if (!n || a.some(function (r) { return r.length !== n; }) || !a.every(function (r) { return r.every(isFinite); })) return null;
        c = characteristic(a);
        values = poly(c) || [];
        values.forEach(function (z, i) {
            var m, r, tol, free, big;
            if (z.im || (i && !values[i - 1].im && values[i - 1].re === z.re)) return; // each real one once
            m = a.map(function (row, i) { return row.map(function (x, j) { return x - (i === j ? z.re : 0); }); });
            for (tol = 1e-10; tol <= 1e-5; tol *= 100) { // λ is only so near: a little more of 0 till it has a way to 0
                r = reduce(m, n, tol);
                if (r.rank < n) break;
            }
            for (free = 0; free < n; free++) {
                if (r.where.indexOf(free) > -1) continue;
                var v = [], k, j;
                for (j = 0; j < n; j++) v[j] = j === free ? 1 : 0;
                r.where.forEach(function (col, row) { v[col] = -r.m[row][free]; });
                big = Math.max.apply(null, v.map(Math.abs));
                v = v.map(function (x) { return Math.abs(x) <= 1e-9 * big ? 0 : x; });
                for (k = 1; k <= 12; k++) {
                    if (v.every(function (x) { return Math.abs(k * x - Math.round(k * x)) <= 1e-8 * Math.max(1, Math.abs(k * x)); })) {
                        v = v.map(function (x) { return Math.round(k * x) + 0; });
                        break;
                    }
                }
                vectors.push({ value: z.re, v: v.map(function (x) { return round(x) + 0; }) });
            }
        });
        return { poly: c.map(function (x) { return round(x) + 0; }), values: values, vectors: vectors };
    }

    // Linear equations A x = b of any size, a matrix and a column: { x } where they have one
    // answer, { none: true } where they have none, { many: true } where they have more
    function system(a, b) {
        var rows = a.length, cols = a[0].length, r, i, big;
        if (!a.every(function (row) { return row.every(isFinite); }) || !b.every(isFinite)) return null;
        r = reduce(a.map(function (row, i) { return row.concat([b[i]]); }), cols);
        big = Math.max(1, Math.max.apply(null, b.map(Math.abs)));
        for (i = r.rank; i < rows; i++) if (Math.abs(r.m[i][cols]) > 1e-9 * big) return { none: true };
        if (r.rank < cols) return { many: true };
        return { x: clean(r.m.slice(0, cols).map(function (row) { return [row[cols]]; }), [a, [b]]).map(function (row) { return row[0]; }) };
    }

    // ---------- whole numbers ---------- //

    var DIGITS_MAX = 20, // a whole number of more digits is not factored
        SMALL = BigInt(100000), // factors below this are found by trying each
        BIG = { zero: BigInt(0), one: BigInt(1), two: BigInt(2) };

    // x to a whole number as the engine's round, floor, ceil and trunc have it, of the number it reads
    function toWhole(x, how) {
        x = isFinite(x) ? +x.toPrecision(15) : x;
        return (how === 'round' ? (x < 0 ? -Math.round(-x) : Math.round(x)) : Math[how](x)) + 0;
    }

    // A whole number typed, as a BigInt: 360, -84, 2^10, 10!; one of digits alone may have up to
    // 20 of them, one worked out as many as a number keeps exactly. Null for one that is not whole
    function whole(text, comma, deg) {
        var s = String(text).trim().replace(/^[−–]/, '-').replace(/^\+/, ''), v;
        if (/^-?\d+$/.test(s)) return s.replace(/^-?0*/, '').length <= DIGITS_MAX ? BigInt(s) : null;
        v = number(s, comma, deg);
        return Number.isSafeInteger(v) ? BigInt(v) : null;
    }

    function gcdBig(a, b) {
        var t;
        if (a < BIG.zero) a = -a;
        if (b < BIG.zero) b = -b;
        while (b) {
            t = a % b;
            a = b;
            b = t;
        }
        return a;
    }

    // b to the e-th power, modulo m
    function powMod(b, e, m) {
        var r = BIG.one;
        b %= m;
        while (e > BIG.zero) {
            if (e & BIG.one) r = r * b % m;
            b = b * b % m;
            e >>= BIG.one;
        }
        return r;
    }

    // Miller and Rabin's test, on the first twelve primes, which tells for certain below 3 × 10²⁴
    function isPrime(n) {
        var d = n - BIG.one, s = 0, bases = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37], i, j, a, x;
        if (n < BIG.two) return false;
        for (i = 0; i < bases.length; i++) {
            if (n % BigInt(bases[i]) === BIG.zero) return n === BigInt(bases[i]);
        }
        while (!(d & BIG.one)) {
            d >>= BIG.one;
            s++;
        }
        for (i = 0; i < bases.length; i++) {
            a = BigInt(bases[i]);
            x = powMod(a, d, n);
            if (x === BIG.one || x === n - BIG.one) continue;
            for (j = 1; j < s && x !== n - BIG.one; j++) x = x * x % n;
            if (x !== n - BIG.one) return false;
        }
        return true;
    }

    // A factor of n, which is not prime, by Pollard's rho in Brent's way: the differences of
    // a walk that comes round again, multiplied a hundred at a time before their gcd with n
    function rho(n) {
        var c, x, y, ys, q, g, r, k, i, step = function (v) { return (v * v + c) % n; };
        for (c = BIG.one; ; c++) {
            y = BIG.two;
            r = 1;
            q = BIG.one;
            g = BIG.one;
            do {
                x = y;
                for (i = 0; i < r; i++) y = step(y);
                for (k = 0; k < r && g === BIG.one; k += 100) {
                    ys = y;
                    for (i = 0; i < Math.min(100, r - k); i++) {
                        y = step(y);
                        q = q * (x > y ? x - y : y - x) % n;
                    }
                    g = gcdBig(q, n);
                }
                r *= 2;
            } while (g === BIG.one);
            if (g === n) { // a hundred at a time went past it: one at a time from the last start
                do {
                    ys = step(ys);
                    g = gcdBig(x > ys ? x - ys : ys - x, n);
                } while (g === BIG.one);
            }
            if (g !== n) return g;
        }
    }

    function compare(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
    }

    // The prime factors of a whole number above 1, with their powers, the smallest first:
    // [[2n, 3], [3n, 2], [5n, 1]] for 360
    function primeFactors(n) {
        var found = [], left = [], out = [], p, m, d;
        for (p = BIG.two; p < SMALL && p * p <= n; p += p === BIG.two ? BIG.one : BIG.two) {
            while (n % p === BIG.zero) {
                found.push(p);
                n /= p;
            }
        }
        if (n > BIG.one) left.push(n);
        while (left.length) {
            m = left.pop();
            if (isPrime(m)) {
                found.push(m);
            } else {
                d = rho(m);
                left.push(d, m / d);
            }
        }
        found.sort(compare).forEach(function (f) {
            if (out.length && out[out.length - 1][0] === f) out[out.length - 1][1]++;
            else out.push([f, 1]);
        });
        return out;
    }

    // A whole number typed, factored: { n, factors, prime, count, sum, totient, divisors }, its
    // divisors listed while there are up to max of them; { error: 'whole' } for one that is not
    // one, of up to 20 digits. Of 0 and 1 none, of a number below 0 those of its size
    function factorize(text, comma, deg, max) {
        var n = whole(text, comma, deg), size, f, count = 1, sum = BIG.one, totient = BIG.one, divisors = [BIG.one];
        if (n === null) return { error: 'whole' };
        size = n < BIG.zero ? -n : n;
        f = size > BIG.one ? primeFactors(size) : [];
        f.forEach(function (pe) {
            var p = pe[0], power = p ** BigInt(pe[1]), more = [];
            count *= pe[1] + 1;
            sum *= (power * p - BIG.one) / (p - BIG.one);
            totient *= power / p * (p - BIG.one);
            if (count <= max) {
                divisors.forEach(function (d) {
                    for (var k = 0, q = BIG.one; k <= pe[1]; k++, q *= p) more.push(d * q);
                });
                divisors = more;
            }
        });
        return {
            n: n, factors: f, prime: f.length === 1 && f[0][1] === 1,
            count: size ? count : Infinity, sum: size ? sum : null, totient: size ? totient : null,
            divisors: size && count <= max ? divisors.sort(compare) : null
        };
    }

    // The greatest common divisor and least common multiple of whole numbers typed apart: 12, 18,
    // 30, or with spaces or ; between them, as with a decimal comma. { gcd, lcm, n } as BigInts and
    // their count; { error: 'whole', at } with the one that is not one
    function divisorsOf(text, comma, deg) {
        var parts = String(text).split(comma ? /\s*;\s*|\s+/ : /\s*[,;]\s*|\s+/).filter(function (s) { return s; }),
            g = BIG.zero, l = BIG.one, i, n;
        if (!parts.length) return { error: 'whole', at: '' };
        for (i = 0; i < parts.length; i++) {
            n = whole(parts[i], comma, deg);
            if (n === null) return { error: 'whole', at: parts[i] };
            g = gcdBig(g, n);
            l = l && n ? l * (n < BIG.zero ? -n : n) / gcdBig(l, n) : BIG.zero;
        }
        return { gcd: g, lcm: l, n: parts.length };
    }

    // x to d places as it reads, 1.005 to 1.01; d below 0 to tens, hundreds …: 1234 to -2 places
    // is 1200. how: 'round', half away from 0, 'floor', 'ceil' or 'trunc'
    function roundTo(x, d, how) {
        var m = /^(-?)(\d+)(?:\.(\d+))?(?:e([-+]\d+))?$/.exec(String(x)), neg, all, exp, cut, keep, rest, up;
        if (!m || !isWhole(d) || Math.abs(d) > 100) return NaN;
        neg = m[1] === '-';
        all = BigInt(m[2] + (m[3] || ''));
        exp = (m[4] ? +m[4] : 0) - (m[3] || '').length; // x is ±all × 10^exp
        if (exp >= -d) return x;
        cut = BigInt(10) ** BigInt(-d - exp);
        keep = all / cut;
        rest = all % cut;
        up = !rest ? false : how === 'round' ? rest * BIG.two >= cut : how === 'floor' ? neg : how === 'ceil' ? !neg : false;
        return Number((neg ? '-' : '') + (up ? keep + BIG.one : keep) + 'e' + (-d)) + 0;
    }

    // x to s significant figures as it reads, half away from 0: 0.012345 to 3 is 0.0123
    function significant(x, s) {
        var m = /^-?(\d+)(?:\.(\d+))?(?:e([-+]\d+))?$/.exec(String(x)), digits;
        if (!m || !isWhole(s) || s < 1 || s > 100) return NaN;
        if (x === 0) return 0;
        digits = (m[1] + (m[2] || '')).replace(/^0+/, '');
        // the power of 10 of the first digit
        return roundTo(x, s - 1 - (digits.length - 1 + (m[3] ? +m[3] : 0) - (m[2] || '').length), 'round');
    }

    var CalcMaths = {
        number: number,
        fn: fn,
        solve: solve,
        inequality: inequality,
        poly: poly,
        linear: linear,
        integral: integral,
        slopes: slopes,
        series: series,
        limit: limit,
        ode: ode,
        normalBetween: normalBetween,
        normalDensity: normalDensity,
        normalInverse: normalInverse,
        binomial: function (n, p, k) {
            return counts(function (j) { return binomial(n, p, j); }, k, isWhole(n) && n >= 0 ? n : NaN);
        },
        poisson: function (lambda, k) {
            return counts(function (j) { return poisson(lambda, j); }, k, Infinity);
        },
        randomWhole: randomWhole,
        round: round,
        complex: complex,
        polar: polar,
        croots: croots,
        bitwise: bitwise,
        inBase: inBase,
        bitCount: bitCount,
        flipBit: flipBit,
        float: float,
        det: det,
        inverse: inverse,
        rank: rank,
        transpose: transpose,
        plus: plus,
        times: times,
        eigen: eigen,
        system: system,
        factorize: factorize,
        divisorsOf: divisorsOf,
        isPrime: isPrime,
        roundTo: roundTo,
        significant: significant
    };

    root.CalcMaths = CalcMaths;
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcMaths;
})(typeof window !== 'undefined' ? window : this);
