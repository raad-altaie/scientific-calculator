// The maths of the Solve panel: equations and inequalities solved for x, the roots of a
// polynomial, typed or of its coefficients, and their exact forms, (1 + √5)/2; linear equations,
// and two equations of x and y, which may be curves; where a function turns; integrals, slopes,
// sums and products, on to ∞ as well, limits, Taylor series, areas between curves, lengths of
// them and differential equations; and the normal, Student's t, χ², F, binomial, Poisson,
// geometric, hypergeometric, exponential and uniform distributions, and confidence intervals.
// And of the Numbers panel: complex numbers, and polynomials of complex coefficients; whole
// numbers in bits and their bases, numbers in any base, text as its codes, and numbers as a
// computer keeps them, by IEEE 754; matrices, their eigenvalues, linear equations of them,
// their rows reduced, powers, LU and QR, and vectors; and whole numbers: their prime factors,
// divisors, greatest common divisor and least common multiple, modular arithmetic and the
// Chinese remainder theorem, numbers worked out exactly, primes, fractions and their decimals,
// and numbers rounded. And of the converter's dates: the time from one date to another, and a
// date moved on by years, months and days. Functions are read as the graph reads them, by the engine.
// It works on its own in Node as well, for the tests
(function (root) {
    'use strict';

    var Engine = root.CalcEngine || require('./engine.js'),
        PI = Math.PI,
        SEARCH = 1e8, // an equation's roots are looked for between -SEARCH and SEARCH, unless given ends
        FAR = 1e15, // and where an inequality changes, past them to -FAR and FAR
        ROOTS_MAX = 12, // more roots than these: the ones nearest 0
        POWER_MAX = 30, // a polynomial typed of a higher power is not solved
        TERMS_MAX = 1e6, // a sum or a product of more terms is not worked out
        TAYLOR_MAX = 12, // a Taylor series is found to this power at most
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
    // section. { roots: ascending, more: there were more than these, the ones nearest 0, and with
    // exact, exact: each root's exact form, as exactOf has it, or null } or { error: 'equation' }
    // where it is not one, 'letters' where it has letters besides x
    function solve(text, comma, deg, from, to, exact) {
        var sides = String(text).split('='), left, right, xs = [], fs = [], found = [], n = 6000, k, u, a, b, r, ends, more;
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
                found.push({ x: xs[k], raw: xs[k], near: true });
            } else if (k && isFinite(a) && a !== 0 && (a < 0) !== (b < 0)) {
                r = halve(f, xs[k - 1], xs[k], a);
                if (r !== null && Math.abs(f(r)) <= Math.min(Math.abs(a), Math.abs(b))) found.push({ x: polish(r, 1e-12), raw: r, near: true });
            } else if (k && k < n && isFinite(a) && isFinite(fs[k + 1]) && Math.abs(b) < Math.abs(a) && Math.abs(b) <= Math.abs(fs[k + 1]) &&
                (a < 0) === (b < 0) && (b < 0) === (fs[k + 1] < 0)) {
                r = lowest(function (x) { return -Math.abs(f(x)); }, xs[k - 1], xs[k + 1]); // touching 0: where it comes nearest
                if (zero(r) || Math.abs(f(r)) <= 1e-9 * Math.max(1, size(r)) && Math.abs(f(r)) < 1e-6 * Math.abs(b)) found.push({ x: polish(r, 1e-9), raw: r, near: false });
            }
        }
        // r as short as it goes, to tol: a root found by halving is as near as a number goes, so
        // to 12 digits, not moved onto another root a little way off; one touching 0 only as near
        // as the golden section comes, to 9
        function polish(r, tol) {
            var best = Math.abs(f(r));
            return tidy(r, tol * Math.max(1, Math.abs(r)), function (q) {
                var v = Math.abs(f(q));
                return v <= best || v <= 1e-14 * Math.max(1, size(q));
            });
        }
        found.sort(function (p, q) { return p.x - q.x; });
        found = found.filter(function (p, i) { // one root once, not twice from the two sides of a sample
            return !i || Math.abs(p.x - found[i - 1].x) > 1e-11 * Math.max(1, Math.abs(p.x));
        });
        more = found.length > ROOTS_MAX;
        if (more) found = found.slice().sort(function (p, q) { return Math.abs(p.x) - Math.abs(q.x) || p.x - q.x; }).slice(0, ROOTS_MAX).sort(function (p, q) { return p.x - q.x; });
        return {
            roots: found.map(function (p) { return p.x + 0; }),
            exact: exact ? found.map(function (p) { // a root found by halving is as near as a number goes; one touching 0, to 9 digits
                return exactOf(p.raw, p.near ? 5e-13 : 1e-8, !p.near, deg, function (v) { return zero(v) || Math.abs(f(v)) <= Math.abs(f(p.raw)); });
            }) : undefined,
            more: more
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
    // samples. From and to keep it between them, else it is looked for as solve looks, and on
    // to ±FAR, past which it is taken to go on as it does there.
    // { parts: [{ from, to, fromIn, toIn }] ascending, ends: where it changes, ascending, more:
    // there were more ends than these, the ones nearest 0, within: FAR where it was looked for only
    // so far } or { error: 'inequality' | 'letters' }
    function inequality(text, comma, deg, from, to) {
        var s = String(text), ops = s.match(/<=|>=|=<|=>|[<>≤≥]/g), sides, curves, parts = [], ends = [], more,
            bounded = isFinite(from) && isFinite(to) && from < to, n = 2000, xs = [], far, farSolves = 4, states = [], marks, k, u, r, p, lo, hi, out = [], cur;
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
        // at 1, not where they are equal all along, as floor(x) = 2; between a and b, or as solve
        // looks; how many there were …
        function roots(a, b) {
            var before = ends.length;
            parts.forEach(function (part, j) {
                var found = solve(part.text, comma, deg, a, b);
                (found.roots || []).forEach(function (x) {
                    var h = 1e-8 * Math.max(1, Math.abs(x)), at = holds(x, j);
                    if (holds(x - h) !== at || holds(x + h) !== at) ends.push({ x: x, root: j });
                });
            });
            return ends.length - before;
        }
        roots(bounded ? from : NaN, bounded ? to : NaN);
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
        }
        if (!bounded) { // on past ±SEARCH, 8 to each power of 10, as 2e9 for x < 2e9
            for (k = 1, far = []; Math.pow(10, k / 8) * SEARCH <= FAR; k++) far.push(Math.pow(10, k / 8) * SEARCH);
            xs = far.map(function (x) { return -x; }).reverse().concat(xs, far);
        }
        for (k = 0; k < xs.length; k++) {
            states.push(holds(xs[k]));
            if (k && states[k] !== states[k - 1] && (states[k] === true || states[k - 1] === true)) { // not from no value to false, as sqrt(x) < -1 at 0
                // past where solve looked, its roots there; only for the first few, as sin(x) > 0 changes
                // between every two samples out there, and halving finds the rest at once
                if (!bounded && Math.abs(xs[k - 1] + xs[k]) > 2 * SEARCH && farSolves-- > 0 && roots(xs[k - 1], xs[k])) continue;
                lo = xs[k - 1];
                hi = xs[k];
                for (r = 0; r < 200; r++) {
                    p = (lo + hi) / 2;
                    if (p <= lo || p >= hi) break;
                    if (holds(p) === states[k - 1]) lo = p;
                    else hi = p;
                }
                p = snap(hi);
                if (ends.some(function (e) { return Math.abs(p - e.x) <= 1e-11 * Math.max(1, Math.abs(p)); })) continue; // a root of solve's, as it has it, to 12 digits
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
        return { parts: out, ends: ends.map(function (e) { return e.x + 0; }), more: more, within: bounded ? undefined : FAR };
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

    // ---------- two equations of x and y ---------- //

    // An equation of x and y, or of one of them: x^2 + y^2 = 25, y = 2x + 1, or one side alone,
    // which is 0. As the graph reads it, at(x, y, deg) the left side less the right; null where it
    // is not one
    function equationXY(text, comma) {
        var sides = String(text).split('='), r;
        if (sides.length > 2 || !sides[0].trim() || (sides.length === 2 && !sides[1].trim()) || /[<>≤≥{}]/.test(text)) return null;
        r = Engine.relation('(' + sides[0] + ') - (' + (sides.length === 2 ? sides[1] : '0') + ') = 0', comma, {});
        return r && !r.parts ? r : null;
    }

    // Two equations of x and y solved together, not only lines: x^2 + y^2 = 25 and x + y = 7, where
    // a circle and a line cross. Newton's steps, damped as Levenberg and Marquardt's are, from starts
    // over the plane, most near 0 and the nearest first, for a fifth of a second at most; each point
    // once, as short as it can be while both hold as well. { points: [{ x, y, exact: [x's, y's
    // exact form or null] }] by x, then y, more: there were more than these, the ones nearest 0,
    // many: they hold together along a curve, not at points } or { error: 'equation' | 'letters',
    // which: the equation, 0 or 1 }
    function system2(texts, comma, deg, exact) {
        var eqs = texts.map(function (t) { return equationXY(t, comma); }), steps = [0, 0.5, 1, 2, 3.5, 6, 10, 20, 50, 200, 1000],
            starts = [], found = [], flat = 0, start = Date.now(), i, j, p, more;
        for (i = 0; i < 2; i++) {
            if (!eqs[i]) return { error: 'equation', which: i };
            if (eqs[i].letters.length) return { error: 'letters', which: i };
        }
        function F(x, y) {
            return [eqs[0].at(x, y, deg), eqs[1].at(x, y, deg)];
        }
        // its slopes at x, y: [[∂f/∂x, ∂f/∂y], [∂g/∂x, ∂g/∂y]], by the middle difference
        function jacobian(x, y) {
            var h = 1e-7 * Math.max(1, Math.abs(x)), k = 1e-7 * Math.max(1, Math.abs(y)), a = F(x + h, y), b = F(x - h, y), c = F(x, y + k), d = F(x, y - k);
            return [[(a[0] - b[0]) / (2 * h), (c[0] - d[0]) / (2 * k)], [(a[1] - b[1]) / (2 * h), (c[1] - d[1]) / (2 * k)]];
        }
        // how near 0 each must be there: to 9 digits of how fast it changes, as far out as x and y are
        function holds(x, y, f, J) {
            var far = Math.max(1, Math.abs(x), Math.abs(y));
            return Math.abs(f[0]) <= 1e-9 * Math.max(1, (Math.abs(J[0][0]) + Math.abs(J[0][1])) * far) &&
                Math.abs(f[1]) <= 1e-9 * Math.max(1, (Math.abs(J[1][0]) + Math.abs(J[1][1])) * far);
        }
        function walk(x, y) {
            var f = F(x, y), e = f[0] * f[0] + f[1] * f[1], lambda = 1e-3, J, a, b, c, g0, g1, det, dx, dy, t, te, n, tries, moved;
            if (!isFinite(e)) return null;
            for (n = 0; n < 100 && e > 0; n++) {
                J = jacobian(x, y);
                if (!J[0].concat(J[1]).every(isFinite)) return null;
                a = J[0][0] * J[0][0] + J[1][0] * J[1][0]; // JᵀJ and Jᵀf
                b = J[0][0] * J[0][1] + J[1][0] * J[1][1];
                c = J[0][1] * J[0][1] + J[1][1] * J[1][1];
                g0 = J[0][0] * f[0] + J[1][0] * f[1];
                g1 = J[0][1] * f[0] + J[1][1] * f[1];
                for (tries = 0, moved = false; tries < 30 && !moved; tries++) {
                    det = (a * (1 + lambda) + 1e-300) * (c * (1 + lambda) + 1e-300) - b * b;
                    dx = -((c * (1 + lambda)) * g0 - b * g1) / det;
                    dy = -((a * (1 + lambda)) * g1 - b * g0) / det;
                    if (!isFinite(dx) || !isFinite(dy)) return null;
                    t = F(x + dx, y + dy);
                    te = t[0] * t[0] + t[1] * t[1];
                    if (te < e) {
                        moved = true;
                        x += dx;
                        y += dy;
                        f = t;
                        e = te;
                        lambda = Math.max(lambda / 4, 1e-12);
                    } else {
                        lambda *= 5;
                    }
                }
                if (!moved || Math.abs(dx) + Math.abs(dy) <= 1e-15 * Math.max(1, Math.abs(x) + Math.abs(y))) break;
            }
            J = jacobian(x, y);
            if (!(Math.abs(x) <= SEARCH && Math.abs(y) <= SEARCH) || !holds(x, y, f, J)) return null;
            det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
            return { x: x, y: y, e: e, flat: Math.abs(det) <= 1e-6 * (J[0][0] * J[0][0] + J[0][1] * J[0][1] + J[1][0] * J[1][0] + J[1][1] * J[1][1]) }; // they touch there
        }
        steps = steps.slice(1).map(function (s) { return -s; }).reverse().concat(steps);
        for (i = 0; i < steps.length; i++) {
            for (j = 0; j < steps.length; j++) starts.push([steps[i] + 0.137, steps[j] - 0.071]); // not on a line of symmetry
        }
        starts.sort(function (p, q) { return Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1]); });
        for (i = 0; i < starts.length && (i < 25 || Date.now() - start < 200); i++) {
            p = walk(starts[i][0], starts[i][1]);
            if (!p) continue;
            j = found.findIndex(function (q) { // where the curves touch, a point is only as near as 6 digits, or 3
                return Math.abs(p.x - q.x) + Math.abs(p.y - q.y) <= (p.flat || q.flat ? 1e-3 : 1e-6) * Math.max(1, Math.abs(p.x) + Math.abs(p.y));
            });
            if (j < 0) {
                found.push(p);
                if (p.flat) flat++;
            } else if (p.e < found[j].e) {
                found[j] = p;
            }
        }
        if (found.length > 2 * ROOTS_MAX && flat > found.length / 2) return { points: [], many: true, more: false };
        more = found.length > ROOTS_MAX;
        if (more) found = found.sort(function (p, q) { return Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y); }).slice(0, ROOTS_MAX);
        found = found.map(function (p) { // x and y as short as they can be while both hold as well: together, then each
            var tol = (p.flat ? 1e-6 : 1e-10), best = Math.max(Math.abs(F(p.x, p.y)[0]), Math.abs(F(p.x, p.y)[1])), J = jacobian(p.x, p.y),
                tx = tol * Math.max(1, Math.abs(p.x)), ty = tol * Math.max(1, Math.abs(p.y)), x, y, k;
            function good(x, y) {
                var f = F(x, y);
                return Math.max(Math.abs(f[0]), Math.abs(f[1])) <= best || holds(x, y, f, J) && Math.max(Math.abs(f[0]), Math.abs(f[1])) <= 1e-13 * Math.max(1, Math.abs(x) + Math.abs(y));
            }
            function cut(v, t, digits) { // 0 as well, not 7e-9
                return Math.abs(v) <= t ? 0 : +v.toPrecision(digits);
            }
            for (k = 1; k <= 16 && x === undefined; k++) {
                if (Math.abs(cut(p.x, tx, k) - p.x) <= tx && Math.abs(cut(p.y, ty, k) - p.y) <= ty && good(cut(p.x, tx, k), cut(p.y, ty, k))) {
                    x = cut(p.x, tx, k);
                    y = cut(p.y, ty, k);
                }
            }
            if (x === undefined) {
                x = Math.abs(p.x) <= tx && good(0, p.y) ? 0 : tidy(p.x, tx, function (q) { return good(q, p.y); });
                y = Math.abs(p.y) <= ty && good(x, 0) ? 0 : tidy(p.y, ty, function (q) { return good(x, q); });
            }
            return {
                x: round(x),
                y: round(y),
                exact: exact ? [x, y].map(function (v, k) {
                    return exactOf(v, p.flat ? 1e-6 : 1e-12, p.flat, deg, function (w) {
                        var at = k ? F(x, w) : F(w, y);
                        return holds(k ? x : w, k ? w : y, at, J);
                    });
                }) : undefined
            };
        });
        found.sort(function (p, q) { return p.x - q.x || p.y - q.y; });
        return { points: found, more: more, many: false };
    }

    // ---------- turning points ---------- //

    // Where a function of x turns: highest or lowest near by, as x^3 - 3x at -1 and 1. From
    // samples, as solve takes them, each found by the golden section, then where its slope is 0,
    // by halving, where it has one there; not where it only jumps, as 1/x at 0, nor along a flat
    // stretch. Between from and to, the highest and lowest of all as well, the ends among them.
    // { points: [{ x, y, max }] by x, more: there were more than these, the ones nearest 0, top
    // and bottom: { x, y } between from and to only } or { error: 'function' | 'letters' }
    function extrema(text, comma, deg, from, to) {
        var c = String(text).trim() && Engine.graph(text, comma, {}), ends = isFinite(from) && isFinite(to) && from < to, n = 6000,
            xs = [], fs = [], found = [], k, u, more, all, top, bottom;
        if (!c) return { error: 'function' };
        if (c.letters.length) return { error: 'letters' };
        function f(x) {
            return c.at(x, deg);
        }
        function slope(x) { // by four values about x, as near 0 as they tell, where the engine's slope is 0 already
            var h = 1e-3 * Math.max(1, Math.abs(x));
            return (f(x - 2 * h) - 8 * f(x - h) + 8 * f(x + h) - f(x + 2 * h)) / (12 * h);
        }
        for (k = 0; k <= n; k++) {
            u = Math.asinh(SEARCH) * (2 * k / n - 1);
            xs.push(ends ? from + (to - from) * k / n : k === n / 2 ? 0 : Math.sinh(u));
            fs.push(f(xs[k]));
        }
        for (k = 1; k < n; k++) {
            if (!isFinite(fs[k - 1]) || !isFinite(fs[k]) || !isFinite(fs[k + 1])) continue;
            if (fs[k] >= fs[k - 1] && fs[k] >= fs[k + 1] && (fs[k] > fs[k - 1] || fs[k] > fs[k + 1])) turn(xs[k - 1], xs[k + 1], 1);
            if (fs[k] <= fs[k - 1] && fs[k] <= fs[k + 1] && (fs[k] < fs[k - 1] || fs[k] < fs[k + 1])) turn(xs[k - 1], xs[k + 1], -1);
        }
        // the turn between a and b, highest (way 1) or lowest (-1): kept where it is one
        function turn(a, b, way) {
            var g = function (x) { return way * f(x); }, r = lowest(g, a, b), h = 1e-6 * Math.max(1, Math.abs(r)), d = 1e-3 * Math.max(1, Math.abs(r)),
                s0 = slope(r - h), s1 = slope(r + h), y, near, q, bend, digits;
            if (way * s0 > 0 && way * s1 < 0) { // where the slope is 0, as near as a number goes
                q = halve(slope, r - h, r + h, s0);
                if (q !== null) r = q;
            }
            y = f(r);
            near = [r - h, r + h, r - d, r + d].map(f);
            if (!isFinite(y) || !near.every(isFinite)) return;
            if (near.some(function (v) { return way * v > way * y; })) return;
            if (near.slice(0, 2).some(function (v) { return Math.abs(v - y) > 1e-2 * Math.max(1, Math.abs(y)); })) return; // a jump, as 1/x at 0
            if (near[2] === y || near[3] === y) return; // flat to one side, as floor(x) or e^-x where it is too small to tell
            // x to as many digits as its values tell, from 10 down to 4: fewer where they are large
            // beside how much it bends, as x^2 - 6x + 1e6, whose slope is only as near as they are
            bend = Math.abs(near[2] - 2 * y + near[3]) / (d * d);
            digits = Math.max(4, Math.min(10, Math.floor(Math.log10(Math.max(1, Math.abs(r)) * bend * 1e-3 / (1e-15 * Math.max(1, Math.abs(y))))) - 1));
            found.push({ x: +tidy(r, 1e-10 * Math.max(1, Math.abs(r)), function () { return true; }).toPrecision(isNaN(digits) ? 10 : digits) + 0, y: round(y), max: way > 0 });
        }
        found.sort(function (p, q) { return p.x - q.x; });
        found = found.filter(function (p, i) { return !i || Math.abs(p.x - found[i - 1].x) > 1e-7 * Math.max(1, Math.abs(p.x)) || p.max !== found[i - 1].max; });
        more = found.length > ROOTS_MAX;
        if (ends) {
            all = found.concat([from, to].filter(function (x) { return isFinite(f(x)); }).map(function (x) { return { x: x, y: round(f(x)) }; }));
            all.forEach(function (p) {
                if (!top || p.y > top.y) top = { x: p.x, y: p.y };
                if (!bottom || p.y < bottom.y) bottom = { x: p.x, y: p.y };
            });
        }
        if (more) found = found.slice().sort(function (p, q) { return Math.abs(p.x) - Math.abs(q.x) || p.x - q.x; }).slice(0, ROOTS_MAX).sort(function (p, q) { return p.x - q.x; });
        return { points: found, more: more, top: top, bottom: bottom };
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

    // ---------- polynomials typed ---------- //

    // the sum, or with minus the difference, and the product of two polynomials, the lowest power first
    function padd(a, b, minus) {
        var out = [], k;
        for (k = 0; k < Math.max(a.length, b.length); k++) out.push((a[k] || 0) + (minus ? -(b[k] || 0) : b[k] || 0));
        return out;
    }

    function pmul(a, b) {
        var out = [], j, k;
        for (k = 0; k < a.length + b.length - 1; k++) out.push(0);
        for (j = 0; j < a.length; j++) {
            for (k = 0; k < b.length; k++) out[j + k] += a[j] * b[k];
        }
        return out;
    }

    // A polynomial of x typed, as x^5 - 3x + 1, (x - 1)(x + 2)^2 or x^3 = 2x + 1, multiplied out;
    // or its coefficients, the highest power first: 1, 0, -2, 1 (1; 0; -2; 1 with the comma).
    // { c: its coefficients, the highest power first, each to 12 digits } or { error: 'polynomial'
    // | 'letters' | 'power' }: not one, as 1/x or sin(x); letters besides x; a power above POWER_MAX
    function polynomial(text, comma, deg) {
        var s = String(text).trim(), parts = s.split(comma ? /\s*;\s*|\s+/ : /\s*[,;]\s*|\s+/), sides, trees, nums, big = false, letters = false, c, top;
        if (!s) return { error: 'polynomial' };
        if (parts.length > 1 && !/x/i.test(s)) {
            nums = parts.map(function (p) { return number(p, comma, deg); });
            if (nums.every(isFinite)) {
                while (nums.length > 1 && nums[0] === 0) nums.shift();
                return nums.length - 1 > POWER_MAX ? { error: 'power' } : { c: nums };
            }
        }
        sides = s.split('=');
        if (sides.length > 2 || sides.some(function (side) { return !side.trim(); })) return { error: 'polynomial' };
        trees = sides.map(function (side) { return Engine.tree(side, comma); });
        if (!trees.every(Boolean)) return { error: 'polynomial' };
        function hasX(n) { // each part looked at, for its letters
            var a, b, r;
            if (!n) return false;
            if (n.t === 'const' && n.p) letters = true;
            a = hasX(n.arg);
            b = hasX(n.l);
            r = hasX(n.r);
            return n.t === 'const' && n.v === 'x' || a || b || r;
        }
        // the coefficients of a part, the lowest power first; null where it is not a polynomial
        function expand(n) {
            var a, b, out, k;
            if (!hasX(n)) {
                a = cvalue(n, deg);
                return isFinite(a[0]) && !a[1] ? [a[0]] : null;
            }
            switch (n.t) {
                case 'const': return [0, 1];
                case 'group': return expand(n.arg);
                case 'neg':
                    a = expand(n.arg);
                    return a && a.map(function (v) { return -v; });
                case 'fn':
                case 'post':
                    a = expand(n.arg);
                    if (!a) return null;
                    if (n.key === 'x2') return pmul(a, a);
                    if (n.key === 'x3') return pmul(pmul(a, a), a);
                    return n.key === '%' ? a.map(function (v) { return v / 100; }) : null;
                case 'bin':
                    a = expand(n.l);
                    b = expand(n.r);
                    if (!a || !b) return null;
                    if (n.op === '+' || n.op === '–') return padd(a, b, n.op === '–');
                    if (n.op === '×') return a.length + b.length - 2 > POWER_MAX ? (big = true) && null : pmul(a, b);
                    if (n.op === '÷') return b.length === 1 && b[0] ? a.map(function (v) { return v / b[0]; }) : null;
                    if (n.op === 'yx' && b.length === 1 && b[0] >= 0 && b[0] === Math.floor(b[0])) {
                        if ((a.length - 1) * b[0] > POWER_MAX) return (big = true) && null;
                        for (out = [1], k = 0; k < b[0]; k++) out = pmul(out, a);
                        return out;
                    }
            }
            return null;
        }
        trees.forEach(hasX);
        if (letters) return { error: 'letters' };
        c = trees.map(expand);
        if (big) return { error: 'power' };
        if (!c.every(Boolean)) return { error: 'polynomial' };
        c = c.length === 2 ? padd(c[0], c[1], true) : c[0];
        top = Math.max.apply(null, c.map(Math.abs));
        c = c.map(function (v) { return Math.abs(v) <= 1e-14 * top ? 0 : round(v); }).reverse(); // x^2 - x^2 is no power of 2
        while (c.length > 1 && c[0] === 0) c.shift();
        return c.length - 1 > POWER_MAX ? { error: 'power' } : { c: c };
    }

    // ---------- exact forms ---------- //

    function gcd(a, b) {
        var t;
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) {
            t = a % b;
            a = b;
            b = t;
        }
        return a;
    }

    // x as a fraction [p, q], q at most max and within tol of x: the first of its continued
    // fraction that is, as 1/3 for 0.333333333333; null where none is
    function ratio(x, max, tol) {
        var a = Math.abs(x), y = a, h = 1, h0 = 0, k = 0, k0 = 1, f, t, i;
        if (!isFinite(x)) return null;
        for (i = 0; i < 40; i++) {
            f = Math.floor(y);
            t = f * h + h0;
            h0 = h;
            h = t;
            t = f * k + k0;
            k0 = k;
            k = t;
            if (k > max || h > 1e15) return null;
            if (Math.abs(h / k - a) <= tol) return [x < 0 ? -h : h, k];
            if (y === f) return null;
            y = 1 / (y - f);
        }
        return null;
    }

    // a whole number n as k²m, m with no square in it: [k, m]. Its prime factors up to its cube
    // root tried; what is left has at most two others, so is a square or has none
    function surd(n) {
        var k = 1, m = 1, top = Math.cbrt(n) + 1, d, e, r;
        for (d = 2; d <= top && n > 1; d++) {
            for (e = 0; n % d === 0; e++) n /= d;
            k *= Math.pow(d, e >> 1);
            if (e & 1) m *= d;
        }
        r = Math.round(Math.sqrt(n));
        if (n > 1 && r * r === n) k *= r;
        else m *= n;
        return [k, m];
    }

    // the texts of exact forms, the minus a hyphen: 1/3, 5π/6, ln 2, and (a + k√m)/d, with k i √m
    // for k√m where imag: –1 + √2, (1 – √5)/2, √6/3, (–1 + i√3)/2
    function fracText(p, q) {
        return q === 1 ? String(p) : p + '/' + q;
    }

    function piText(p, q, of) {
        if (of === '/π') return p + '/' + (q === 1 ? '' : q) + 'π'; // 2/π
        return (p === 1 ? '' : p === -1 ? '-' : p) + (of || 'π') + (q === 1 ? '' : '/' + q);
    }

    function lnText(p, q) {
        return p === 1 ? '-ln ' + q : q === 1 ? 'ln ' + p : 'ln(' + p + '/' + q + ')';
    }

    function surdText(a, k, m, d, imag) {
        var term = (Math.abs(k) === 1 && (m > 1 || imag) ? '' : String(Math.abs(k))) + (imag ? 'i' : '') + (m > 1 ? '√' + m : ''),
            top = a ? a + (k < 0 ? ' - ' : ' + ') + term : (k < 0 ? '-' : '') + term;
        return d === 1 ? top : a ? '(' + top + ')/' + d : top + '/' + d;
    }

    var SQUARE_FREE = []; // 2, 3, 5, 6, 7, 10 … to 99, the m of (a + b√m)/c looked for
    (function () {
        for (var m = 2; m < 100; m++) if (surd(m)[0] === 1) SQUARE_FREE.push(m);
    })();

    // x in an exact form, where within tol of it, as part of x, ok(the value of the form) telling
    // as well: a fraction, 1/3; a part of π, 5π/6, while angles are in radians (deg 0); the root
    // of a fraction, √2, √6/3; (a + b√m)/c, (1 + √5)/2, each of a, b and c up to 12, a to 1000;
    // the logarithm of a fraction, ln 2; or, while in radians, a part of π², e or √π: π²/6, e,
    // √π/2. Rough, for an x as near as 9 digits, only the first three, of fractions to 100, and
    // with rough 'constants' the last as well, for an integral, as near as 10. A text, or null
    // for a whole number or none of these
    function exactOf(x, tol, rough, deg, ok) {
        var t = tol * Math.max(1, Math.abs(x)), r, s, j, a, b, c, k, m, sign, v;
        if (!isFinite(x) || x === Math.round(x)) return null;
        r = ratio(x, rough ? 100 : 1000, t);
        if (r && ok(r[0] / r[1])) return fracText(r[0], r[1]);
        if (!deg) {
            r = ratio(x / PI, 24, t / PI);
            if (r && ok(r[0] * PI / r[1])) return piText(r[0], r[1]);
        }
        r = ratio(x * x, rough ? 100 : 10000, 2.5 * t * Math.abs(x)); // √(p/q) = √(pq)/q
        if (r && r[0] > 0 && r[0] <= 10000) {
            s = surd(r[0] * r[1]);
            j = gcd(s[0], r[1]);
            v = (x < 0 ? -1 : 1) * Math.sqrt(r[0] / r[1]);
            if (s[1] > 1 && ok(v)) return surdText(0, (x < 0 ? -1 : 1) * s[0] / j, s[1], r[1] / j, false);
        }
        if (rough) return rough === 'constants' ? constant() : null;
        for (c = 1; c <= 12; c++) {
            for (j = 0; j < SQUARE_FREE.length; j++) {
                m = Math.sqrt(SQUARE_FREE[j]);
                for (b = 1; b <= 12; b++) {
                    for (sign = -1; sign <= 1; sign += 2) {
                        a = c * x - sign * b * m;
                        k = Math.round(a);
                        if (k && Math.abs(k) <= 1000 && Math.abs(a - k) <= c * t && gcd(gcd(k, b), c) === 1 && ok((k + sign * b * m) / c)) {
                            return surdText(k, sign * b, SQUARE_FREE[j], c, false);
                        }
                    }
                }
            }
        }
        if (Math.abs(x) >= 1e-3 && Math.abs(x) <= 30) {
            r = ratio(Math.exp(x), 1000, t * Math.exp(x));
            if (r && r[0] > 0 && r[0] <= 1000 && ok(Math.log(r[0] / r[1]))) return lnText(r[0], r[1]);
        }
        return constant();
        function constant() {
            for (j = 0; j < CONSTANTS.length && !deg; j++) {
                r = ratio(x / CONSTANTS[j][0], 100, t / CONSTANTS[j][0]);
                if (r && ok(r[0] * CONSTANTS[j][0] / r[1])) return piText(r[0], r[1], CONSTANTS[j][1]);
            }
            return null;
        }
    }

    var CONSTANTS = [[PI * PI, 'π²'], [Math.pow(PI, 4), 'π⁴'], [1 / PI, '/π'], [Math.E, 'e'], [Math.E * Math.E, 'e²'], [Math.sqrt(PI), '√π']]; // as sums and integrals come to them

    // P, whole numbers the highest power first, divided by D, where it goes into it: the
    // quotient, whole numbers as well where D has no common factor; null where it does not
    function divides(P, D) {
        var r = P.slice(), q = [], j, k, f;
        for (k = 0; k + D.length <= r.length; k++) {
            if (r[k] % D[0]) return null;
            f = r[k] / D[0];
            q.push(f);
            for (j = 0; j < D.length; j++) r[k + j] -= f * D[j];
        }
        for (k = Math.max(0, r.length - D.length + 1); k < r.length; k++) if (r[k]) return null;
        return q;
    }

    // whole numbers with no common factor, the first above 0
    function primitive(D) {
        var g = D.reduce(function (g, a) { return gcdBig(g, a); }, BIG.zero);
        if (D[0] < BIG.zero) g = -g;
        return g ? D.map(function (a) { return a / g; }) : D;
    }

    // the roots of a x² + b x + c, whole numbers, in exact form: [{ text, re, im }] for the two;
    // null where they are too large to tell
    function quadratic(D) {
        var a = Number(D[0]), b = Number(D[1]), disc = D[1] * D[1] - BIG.two * BIG.two * D[0] * D[2], d = Math.abs(Number(disc)), s, top, den, k, g, imag;
        if (!Number.isSafeInteger(d) || !Number.isSafeInteger(2 * a) || !Number.isSafeInteger(b)) return null;
        s = surd(d);
        imag = disc < BIG.zero;
        if (s[1] === 1 && !imag) {
            return [1, -1].map(function (sign) {
                var p = -b + sign * s[0], q = 2 * a, g = gcd(p, q) * (q < 0 ? -1 : 1);
                return { text: fracText(p / g, q / g), re: p / q, im: 0 };
            });
        }
        top = -b;
        den = 2 * a;
        k = s[0];
        g = gcd(gcd(top, k), den) * (den < 0 ? -1 : 1);
        top /= g;
        den /= g;
        k = Math.abs(k / g);
        return [1, -1].map(function (sign) {
            var part = sign * k * Math.sqrt(s[1]) / den;
            return { text: surdText(top, sign * k, s[1], den, imag), re: top / den + (imag ? 0 : part), im: imag ? part : 0 };
        });
    }

    // The roots of a polynomial in exact form, where its coefficients c, the highest power first,
    // are fractions: each root of poly's, roots, that is a fraction, 1/3, as checked with whole
    // numbers; and each two that are the roots of a quadratic factor of whole numbers, (1 ± √5)/2
    // or –1 ± i√2. A text for each root, in their order, or null for one that is not; null where
    // a coefficient is not a fraction
    function exactRoots(c, roots) {
        var fr = c.map(function (x) { return ratio(x, 1e6, 1e-15 * Math.abs(x)); }), L = BIG.one, P, out = roots.map(function () { return null; }), left = [], i, j;
        if (!fr.every(Boolean)) return null;
        fr.forEach(function (f) {
            var d = BigInt(f[1]);
            L = L / gcdBig(L, d) * d;
        });
        P = fr.map(function (f) { return BigInt(f[0]) * (L / BigInt(f[1])); });
        while (P.length && !P[0]) P.shift();
        if (P.length < 2) return null;
        P = primitive(P);
        roots.forEach(function (z, i) {
            var Q = null, r;
            [1e-11, 1e-5].forEach(function (tol) { // as near as a root goes, then as near as one found twice over
                if (Q || z.im) return;
                r = ratio(z.re, 1e6, tol * Math.max(1, Math.abs(z.re)));
                Q = r && divides(P, [BigInt(r[1]), BigInt(-r[0])]);
            });
            if (Q) {
                P = Q;
                out[i] = fracText(r[0], r[1]);
            } else {
                left.push(i);
            }
        });
        function pair(i, j) {
            var a = [roots[i].re, roots[i].im], b = [roots[j].re, roots[j].im], s = add(a, b), p = cmul(a, b), S, R, D, Q, two;
            if (Math.abs(s[1]) > 1e-9 * Math.max(1, cabs(s)) || Math.abs(p[1]) > 1e-9 * Math.max(1, cabs(p))) return false;
            S = ratio(s[0], 1e6, 1e-9 * Math.max(1, Math.abs(s[0])));
            R = ratio(p[0], 1e6, 1e-9 * Math.max(1, Math.abs(p[0])));
            if (!S || !R) return false;
            D = primitive([BigInt(S[1]) * BigInt(R[1]), -BigInt(S[0]) * BigInt(R[1]), BigInt(R[0]) * BigInt(S[1])]); // x² – s x + p
            Q = divides(P, D);
            two = Q && quadratic(D);
            if (!two) return false;
            P = Q;
            if (cabs(sub(a, [two[0].re, two[0].im])) > cabs(sub(a, [two[1].re, two[1].im]))) two.reverse();
            out[i] = two[0].text;
            out[j] = two[1].text;
            return true;
        }
        for (i = 0; i < left.length; i++) {
            for (j = i + 1; j < left.length && out[left[i]] === null; j++) {
                if (out[left[j]] === null) pair(left[i], left[j]);
            }
        }
        return out;
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
    // from to to, which may be ∞: of n, k, i or j, or of x if it has none of them: n^2, 1/k!.
    // { value, exact: on to ∞, its exact form or null } or { error: 'function' | 'letters' |
    // 'ends' | 'many' }: not a function; letters of its own; ends that are not whole numbers in
    // order; more than a million terms
    function series(text, comma, deg, from, to, product) {
        var vars = {}, c = String(text).trim() && Engine.graph(text, comma, vars), key, total = product ? 1 : 0, fix = 0, k, v, y, t, out;
        if (!c) return { error: 'function' };
        if (c.letters.length > 1 || (c.letters.length === 1 && !/^[nkij]$/.test(c.letters[0]))) return { error: 'letters' };
        key = c.letters[0];
        if (key && isNaN(c.at(NaN, deg)) && !isNaN(c.at(0, deg))) return { error: 'letters' }; // x as well as n
        if (!isFinite(from) || !(isFinite(to) || to === Infinity) || from !== Math.floor(from) || (isFinite(to) && to !== Math.floor(to)) || from > to) return { error: 'ends' };
        function term(k) {
            if (key) vars[key] = k;
            return key ? c.at(0, deg) : c.at(k, deg);
        }
        if (to === Infinity) {
            out = { value: product ? endlessProduct(term, from) : endlessSum(term, from) };
            // as near as its digits: a sum's 12, any exact form; a product's 10, only fractions and constants, 2/π
            out.exact = isFinite(out.value) ? exactOf(out.value, product ? 6e-10 : 1e-11, product ? 'constants' : false, 0, function () { return true; }) : null;
            return out;
        }
        if (to - from + 1 > TERMS_MAX) return { error: 'many' };
        for (k = from; k <= to; k++) {
            v = term(k);
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

    // The sum of term(n) for each whole n from a on without end: Infinity or -Infinity where it
    // grows without end, NaN where it has no value or does not settle. Summed while the terms
    // matter; else by Wynn's ε of its partial sums, which settles for one whose terms change
    // sign or shrink by a part each time, as (-1)^n/n or 1/2^n; else by Euler and Maclaurin's
    // sum of what is left, its integral and the ends of it, as 1/n^2, where the terms are of a
    // smooth function of n, the integral of x from N on as of s, x = N e^s, so a slow one, as
    // 1/n^1.5, is smooth to ∞; else by Richardson's extrapolation of the partial sums of 250,
    // 500 … 8000 terms, which settles where they come to it by powers of 1/N, as the logarithms
    // of 1 – 1/n^2 do. Each to one digit fewer than two ways of it agree to
    function endlessSum(term, a) {
        var sums = [], terms = [], s = 0, fix = 0, k, v, signs = 0, big = 0, far, settled, at1, at2, edge;
        function add(k) { // Kahan's sum, as for a finite one
            var v = term(a + k), y, t;
            terms.push(v);
            y = v - fix;
            t = s + y;
            fix = t - s - y;
            s = t;
            sums.push(s);
            return v;
        }
        for (k = 0; k < 2000; k++) {
            v = add(k);
            if (!isFinite(v)) return NaN;
            big = Math.max(big, Math.abs(v));
            if (k && (v < 0) !== (terms[k - 1] < 0) && v && terms[k - 1]) signs++;
            if (k >= 20 && terms.slice(-10).every(function (u) { return Math.abs(u) <= 1e-17 * Math.abs(s); })) return round(s); // the rest no longer counts
        }
        // terms that do not come to 0: it grows, or goes back and forth, without end
        far = [1e4, 1e6, 1e9].map(function (n) { return term(a + n); });
        if (!far.every(isFinite) || Math.abs(far[2]) > 1e-9 * Math.max(big, 1e-300) && Math.abs(far[2]) >= 0.5 * Math.abs(far[0])) {
            if (far.every(isFinite) && terms.slice(-100).every(function (u) { return u > 0; }) && far.every(function (u) { return u > 0; })) return Infinity;
            if (far.every(isFinite) && terms.slice(-100).every(function (u) { return u < 0; }) && far.every(function (u) { return u < 0; })) return -Infinity;
            return NaN;
        }
        settled = wynn(sums.slice(0, 60));
        if (settled !== null) return settled;
        if (signs > 100) {
            settled = wynn(sums.slice(1000, 1060));
            if (settled !== null) return settled;
        }
        function maclaurin(n) { // the first n terms summed, and what is left as Euler and Maclaurin have it
            var h = 0.01 * n, f = function (x) { return term(x); },
                tail = integral({ at: function (u) { // none past 1e100 where a term is too small to be one, as 1/n^1.5 at 1e250
                    var x = (a + n) * Math.exp(u), y = isFinite(x) ? f(x) : 0;
                    return y === 0 || isNaN(y) && x > 1e100 ? 0 : y * x;
                } }, 0, Infinity, 0),
                d1 = (f(a + n - 2 * h) - 8 * f(a + n - h) + 8 * f(a + n + h) - f(a + n + 2 * h)) / (12 * h),
                d3 = (f(a + n + 2 * h) - 2 * f(a + n + h) + 2 * f(a + n - h) - f(a + n - 2 * h)) / (2 * h * h * h);
            if (Math.abs(edge) > 1e-13 * Math.abs(tail)) return NaN; // what is left past 1e300 still counts, as of 1/(n ln(n)^2)
            return sums[n - 1] + tail + terms[n] / 2 - d1 / 12 + d3 / 720;
        }
        edge = term(1e300);
        edge = isNaN(edge) ? 0 : edge * 1e300; // how much of the integral is still to come where numbers end
        at1 = a + 1000 > 0 ? maclaurin(1000) : NaN;
        at2 = a + 1000 > 0 ? maclaurin(1998) : NaN;
        if (isFinite(at1) && isFinite(at2) && Math.abs(at1 - at2) <= 1e-9 * Math.max(1, Math.abs(at2))) return digits(at2, at1);
        settled = richardson();
        if (settled !== null) return settled;
        // what is left grows without end where n times a term does not come to 0: 1/n
        return terms.slice(-100).every(function (u) { return u > 0; }) && Math.abs(far[2]) * 1e9 >= 0.5 * Math.abs(far[0]) * 1e4 ? Infinity : NaN;
        function richardson() {
            var R = [], j, m, n, est = [];
            for (j = 0, n = 250; n <= 8000; j++, n *= 2) {
                while (sums.length < n) if (!isFinite(add(sums.length))) return null;
                R.push([sums[n - 1]]);
                for (m = 1; m <= j; m++) R[j][m] = R[j][m - 1] + (R[j][m - 1] - R[j - 1][m - 1]) / (Math.pow(2, m) - 1);
                est.push(R[j][j]);
            }
            j = est.length - 1;
            return Math.abs(est[j] - est[j - 1]) <= 1e-10 * Math.max(1, Math.abs(est[j])) ? digits(est[j], est[j - 1]) : null;
        }
        function digits(v, other) { // one fewer than two ways agree to, from 8 to 12
            return +v.toPrecision(Math.max(8, Math.min(12, Math.floor(-Math.log10(Math.max(1e-16, Math.abs(v - other) / Math.max(1, Math.abs(v))))) - 1))) + 0;
        }
    }

    // Wynn's ε of a list of partial sums: the value two of its estimates agree on to 12 digits,
    // the last of them, or null
    function wynn(list) {
        var e = [list.slice()], prev = [], k, j, d, row, best = null, gap = Infinity, est = [];
        for (k = 0; k < list.length; k++) prev.push(0);
        e.unshift(prev);
        for (k = 1; k < list.length; k++) {
            row = [];
            for (j = 0; j + k < list.length; j++) {
                d = e[k][j + 1] - e[k][j];
                row.push(e[k - 1][j + 1] + 1 / d); // ∞ where two are alike, which the next column takes back
            }
            e.push(row);
            if (k % 2 === 0 && row.length) est.push(row[row.length - 1]); // the even columns are estimates
        }
        for (k = 1; k < est.length; k++) {
            if (!isFinite(est[k]) || !isFinite(est[k - 1])) continue;
            d = Math.abs(est[k] - est[k - 1]);
            if (d < gap) {
                gap = d;
                best = est[k];
            }
        }
        return best !== null && gap <= 1e-12 * Math.max(1, Math.abs(best)) ? round(best) : null;
    }

    // The product of term(n) for each whole n from a on without end: 0 where a term is 0; else of
    // terms above 0 by the sum of their logarithms; else as its partial products settle, by
    // Wynn's ε, or NaN
    function endlessProduct(term, a) {
        var p = 1, list = [], k, v, logs = true, s;
        for (k = 0; k < 200; k++) {
            v = term(a + k);
            if (v === 0) return 0;
            if (!isFinite(v)) return NaN;
            if (!(v > 0)) logs = false;
            p *= v;
            list.push(p);
        }
        if (logs && [1e4, 1e6, 1e9].every(function (n) { return term(a + n) > 0; })) {
            s = endlessSum(function (n) { return Math.log(term(n)); }, a);
            return s === -Infinity ? 0 : isFinite(s) ? +Math.exp(s).toPrecision(10) + 0 : s === Infinity ? Infinity : NaN; // the exponential of a sum to 12 digits, to 10
        }
        s = wynn(list.slice(-60));
        return s === null ? NaN : s;
    }

    // ---------- Taylor series, areas and lengths ---------- //

    // A function of x typed, as the graph reads it, y = or f(x) = before it as well: its tree, to
    // be worked out at a complex x, and how the graph reads it; or { error: 'function' | 'letters' }
    function treeOf(text, comma) {
        var s = String(text).trim().replace(/^(y|f\s*\(\s*x\s*\))\s*=\s*/i, ''), c = s && Engine.graph(s, comma, {}), t = s && Engine.tree(s, comma);
        if (!c || !t) return { error: 'function' };
        return c.letters.length ? { error: 'letters' } : { tree: t, c: c };
    }

    // The Taylor series of a function about a, to the power order: its coefficients, f⁽ᵏ⁾(a)/k!,
    // the lowest power first. Each from its values on a circle about a in the complex numbers,
    // Cauchy's integral, as the fast Fourier transform has it: on the largest circle, from 8 down,
    // that tells the same as one half as large, so a coefficient keeps its digits and the circle
    // does not reach where it has no value, as 1/(1 – x) at 1. To 10 digits, or a fraction of a
    // small top where it is one, 1/6. { coefs } or { error: 'function' | 'letters' | 'none': no series about a,
    // as sqrt(x) at 0 or abs(x), which has no complex sense }
    function taylor(text, comma, deg, a, order) {
        var f = treeOf(text, comma), r, at = [], k, ok, want, near, out, y, slope;
        if (f.error) return f;
        if (!isFinite(a) || !(order >= 0 && order <= TAYLOR_MAX && order === Math.floor(order))) return { coefs: null };
        function coefs(r, n) { // and how near each is, from how large its values are
            var values = [], c = [], big = 0, k, j, re, im, th;
            for (j = 0; j < n; j++) {
                th = 2 * PI * j / n;
                values.push(cvalue(f.tree, deg, [a + r * Math.cos(th), r * Math.sin(th)]));
                if (!isFinite(values[j][0]) || !isFinite(values[j][1])) return null;
                big = Math.max(big, cabs(values[j]));
            }
            for (k = 0; k <= order; k++) {
                re = 0;
                im = 0;
                for (j = 0; j < n; j++) {
                    th = -2 * PI * j * k / n;
                    re += values[j][0] * Math.cos(th) - values[j][1] * Math.sin(th);
                    im += values[j][0] * Math.sin(th) + values[j][1] * Math.cos(th);
                }
                c.push({ v: re / (n * Math.pow(r, k)), im: im / (n * Math.pow(r, k)), err: 1e-14 * big / Math.pow(r, k) });
            }
            return c;
        }
        for (r = 8, want = 2 * order + 32; r >= 1e-4; r /= 2) at.push({ r: r, c: coefs(r, Math.max(128, 2 * want)) });
        // a circle about a pole as well tells the same as one half as large, but not the value at
        // a, nor its slope, as the graph has them: 1/(1 – x) at 0 is 0 on a circle of 2 or more
        y = f.c.at(a, deg);
        slope = Engine.slope(f.c, a, deg);
        for (k = 0; k < at.length - 1 && !ok; k++) {
            if (!at[k].c || !at[k + 1].c) continue;
            near = at[k].c.every(function (c, i) {
                var d = at[k + 1].c[i], tol = 1e-10 * Math.max(Math.abs(c.v), 1e-300) + 100 * (c.err + d.err);
                c.off = Math.abs(c.v - d.v); // how near it is, at most
                return c.off <= tol && Math.abs(c.im) <= tol;
            });
            if (near && Math.abs(at[k].c[0].v - y) <= 1e-8 * Math.max(1, Math.abs(y)) &&
                    (!isFinite(slope) || !at[k].c[1] || Math.abs(at[k].c[1].v - slope) <= 1e-6 * Math.max(1, Math.abs(slope)))) ok = at[k];
        }
        if (!ok) return { error: 'none' };
        out = ok.c.map(function (c) {
            var tol = Math.max(10 * c.off, 1e-14 * Math.abs(c.v)), q;
            if (Math.abs(c.v) <= 100 * c.err && Math.abs(c.v) <= 100 * c.off + 1e-300) return 0;
            // a fraction of a small top where it is one as far as its digits tell, to 11 at least: 1/5040, not e/5040
            q = tol <= 1e-11 * Math.abs(c.v) ? ratio(c.v, 1e7, tol) : null;
            return q && Math.abs(q[0]) <= 100 ? q[0] / q[1] : +c.v.toPrecision(10);
        });
        return { coefs: out };
    }

    // Between two functions f and g from a to b: { net: ∫(f – g), area: ∫|f – g|, each from the
    // places between where they cross, crossings: those places } or { error: 'function' |
    // 'letters', which: 0 for f, 1 for g }
    function between(texts, comma, deg, a, b) {
        var fs = texts.map(function (t) { return treeOf(t, comma); }), d, cuts, net = 0, area = 0, k, v, i;
        for (i = 0; i < 2; i++) if (fs[i].error) return { error: fs[i].error, which: i };
        if (!isFinite(a) || !isFinite(b)) return { net: NaN, area: NaN, crossings: [] };
        d = { at: function (x, deg) { return fs[0].c.at(x, deg) - fs[1].c.at(x, deg); } };
        cuts = (solve('(' + texts[0].replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=/i, '') + ') - (' + texts[1].replace(/^\s*(y|g\s*\(\s*x\s*\))\s*=/i, '') + ')',
            comma, deg, Math.min(a, b), Math.max(a, b)).roots || []).filter(function (x) { return x > Math.min(a, b) && x < Math.max(a, b); });
        [Math.min(a, b)].concat(cuts).forEach(function (x, k, list) {
            var to = k < list.length - 1 ? list[k + 1] : Math.max(a, b);
            v = integral(d, x, to, deg);
            net += v;
            area += Math.abs(v);
        });
        k = a <= b ? 1 : -1;
        return { net: round(k * net), area: round(area), crossings: cuts };
    }

    // The length of the curve of a function from a to b: ∫√(1 + f′(x)²) dx, its slopes as the
    // engine has them; NaN where it has none on the way, as at a corner
    function arcLength(text, comma, deg, a, b) {
        var f = treeOf(text, comma);
        if (f.error) return f;
        return { length: isFinite(a) && isFinite(b) ? Math.abs(integral({ at: function (x) { var m = Engine.slope(f.c, x, deg); return Math.sqrt(1 + m * m); } }, a, b, deg)) : NaN };
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
    // agree to 11 digits, up to a quarter of a million steps or a fifth of a second, as it is
    // worked out at each key; else to the digits the last two agree to, 4 at least, as of a
    // function that jumps. { y, slope: y′ there } or { error: 'function' | 'letters' }; y NaN
    // where it has no value on the way or does not settle
    function ode(text, comma, deg, x0, y0, x1) {
        var s = String(text).trim().replace(/^(y\s*['′’]|dy\s*\/\s*dx)\s*=\s*/i, ''), c, n, y, last = NaN, before = NaN, digits, f, start = Date.now();
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
        for (n = 16; n <= 262144 && 2 * (Date.now() - start) < 200; n *= 2) { // the next as long as all before it
            y = walk(n);
            if (isNaN(y)) return { y: NaN, slope: NaN };
            if (Math.abs(y - last) <= 1e-11 * Math.max(1, Math.abs(y))) {
                y += (y - last) / 15; // the error of the fourth order, a sixteenth for twice the steps
                return { y: +y.toPrecision(10) + 0, slope: +f(x1, y).toPrecision(10) + 0 };
            }
            before = last;
            last = y;
        }
        digits = Math.floor(Math.log10(Math.max(1, Math.abs(y)) / Math.abs(y - before)));
        if (!(digits >= 4)) return { y: NaN, slope: NaN };
        digits = Math.min(10, digits);
        return { y: +y.toPrecision(digits) + 0, slope: +f(x1, y).toPrecision(digits) + 0 };
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

    // The regularized incomplete beta function I_x(a, b), by its continued fraction from the
    // nearer end, Lentz's way: { lo: I_x(a, b), hi: 1 – it }, the smaller of them worked out, so it
    // keeps its digits
    function betaInc(x, a, b) {
        var front;
        if (!(a > 0) || !(b > 0) || isNaN(x)) return { lo: NaN, hi: NaN };
        if (x <= 0) return { lo: 0, hi: 1 };
        if (x >= 1) return { lo: 1, hi: 0 };
        front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
        if (x < (a + 1) / (a + b + 2)) {
            x = front * fraction(x, a, b) / a;
            return { lo: x, hi: 1 - x };
        }
        x = front * fraction(1 - x, b, a) / b;
        return { lo: 1 - x, hi: x };
        function fraction(x, a, b) {
            var c = 1, d = 1 - (a + b) * x / (a + 1), h, m, n, del;
            d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d);
            h = d;
            for (m = 1; m <= 500; m++) {
                n = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
                d = 1 + n * d;
                c = 1 + n / c;
                d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d);
                h *= d * (Math.abs(c) < 1e-300 ? 1e-300 : c);
                n = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
                d = 1 + n * d;
                c = 1 + n / c;
                d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d);
                del = d * (Math.abs(c) < 1e-300 ? 1e-300 : c);
                h *= del;
                if (Math.abs(del - 1) < 1e-16) break;
            }
            return h;
        }
    }

    // The regularized incomplete gamma functions: { lo: P(a, x), hi: Q(a, x) }, by the series
    // below a + 1, else the continued fraction, the smaller of them worked out
    function gammaInc(a, x) {
        var front, sum, del, n, b, c, d, h, an, i;
        if (!(a > 0) || isNaN(x)) return { lo: NaN, hi: NaN };
        if (x <= 0) return { lo: 0, hi: 1 };
        if (x === Infinity) return { lo: 1, hi: 0 };
        front = Math.exp(-x + a * Math.log(x) - lnGamma(a));
        if (x < a + 1) {
            for (sum = del = 1 / a, n = a; Math.abs(del) > 1e-17 * Math.abs(sum); ) {
                n++;
                del *= x / n;
                sum += del;
            }
            return { lo: sum * front, hi: 1 - sum * front };
        }
        b = x + 1 - a;
        c = 1e300;
        d = 1 / b;
        h = d;
        for (i = 1; i <= 500; i++) {
            an = -i * (i - a);
            b += 2;
            d = an * d + b;
            d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d);
            c = b + an / c;
            if (Math.abs(c) < 1e-300) c = 1e-300;
            h *= d * c;
            if (Math.abs(d * c - 1) < 1e-16) break;
        }
        return { lo: 1 - front * h, hi: front * h };
    }

    // The chances of Student's t of nu degrees of freedom: { lo: P(T ≤ t), hi: P(T ≥ t), two:
    // P(|T| ≥ |t|) }
    function tDist(t, nu) {
        var i, tail;
        if (!(nu > 0) || isNaN(t)) return { lo: NaN, hi: NaN, two: NaN };
        if (!isFinite(t)) return t > 0 ? { lo: 1, hi: 0, two: 0 } : { lo: 0, hi: 1, two: 0 };
        // P(|T| ≥ |t|), as I of ν/(ν + t²), or near 0, where that is 1 to as many digits, 1 less I of t²/(ν + t²)
        i = t * t < nu ? betaInc(t * t / (nu + t * t), 0.5, nu / 2).hi : betaInc(nu / (nu + t * t), nu / 2, 0.5).lo;
        i = { lo: i };
        tail = i.lo / 2;
        return { lo: round(t >= 0 ? 1 - tail : tail), hi: round(t >= 0 ? tail : 1 - tail), two: round(Math.min(1, i.lo)) };
    }

    // of χ² of k degrees of freedom: { lo: P(X ≤ x), hi: P(X ≥ x) }
    function chiDist(x, k) {
        var g = k > 0 ? gammaInc(k / 2, x / 2) : { lo: NaN, hi: NaN };
        return { lo: round(g.lo), hi: round(g.hi) };
    }

    // of F of d1 and d2 degrees of freedom: { lo: P(X ≤ x), hi: P(X ≥ x) }
    function fDist(x, d1, d2) {
        var i;
        if (!(d1 > 0) || !(d2 > 0) || isNaN(x)) return { lo: NaN, hi: NaN };
        if (x <= 0) return { lo: 0, hi: 1 };
        i = x === Infinity ? { lo: 1, hi: 0 } : betaInc(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2);
        return { lo: round(i.lo), hi: round(i.hi) };
    }

    // The x that a value of dist is below with the chance p: halving, from the tail of the side
    // p is on so a small chance keeps its digits; from 0 where it has no values below 0. To 10
    // digits; NaN where p is not between 0 and 1
    function quantile(dist, p, positive) {
        var lo = positive ? 0 : -1, hi = 1, m, k;
        function below(x) { // P(X ≤ x) < p, from the nearer tail
            var d = dist(x);
            return p <= 0.5 ? d.lo < p : d.hi > 1 - p;
        }
        if (!(p > 0 && p < 1) || isNaN(dist(1).lo)) return NaN;
        while (below(hi) && hi < 1e300) hi *= 2;
        while (!positive && !below(lo) && lo > -1e300) lo *= 2;
        for (k = 0; k < 2000; k++) {
            m = lo / 2 + hi / 2;
            if (m <= lo || m >= hi) break;
            if (below(m)) lo = m;
            else hi = m;
        }
        return !positive && Math.abs(hi) < 1e-9 ? 0 : +hi.toPrecision(10) + 0; // the middle of t, 0 as far as its chances, to 12 digits, tell
    }

    // the chances of the first success on try k, each with the chance p: { eq, le, ge }
    function geometric(p, k) {
        var miss;
        if (!(p > 0 && p <= 1) || !isFinite(k)) return { eq: NaN, le: NaN, ge: NaN };
        k = Math.floor(k);
        if (k < 1) return { eq: 0, le: 0, ge: 1 };
        miss = function (n) { return p === 1 ? (n ? 0 : 1) : Math.exp(n * Math.log1p(-p)); }; // (1 – p)^n
        return { eq: round(miss(k - 1) * p), le: round(-(p === 1 ? -1 : Math.expm1(k * Math.log1p(-p)))), ge: round(miss(k - 1)) };
    }

    // ln of n choose k
    function lnChoose(n, k) {
        return lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
    }

    // the chances of k of n drawn, without putting back, from N of which K count: { eq, le, ge }
    function hypergeometric(N, K, n, k) {
        var low, top;
        if (![N, K, n].every(isWhole) || N < 1 || K < 0 || K > N || n < 0 || n > N || !isFinite(k) || Math.min(n, K) > TERMS_MAX) return { eq: NaN, le: NaN, ge: NaN };
        low = Math.max(0, n - (N - K));
        top = Math.min(n, K);
        return counts(function (j) {
            return j < low || j > top || j !== Math.floor(j) ? 0 : Math.exp(lnChoose(K, j) + lnChoose(N - K, n - j) - lnChoose(N, n));
        }, k, top, n * K / N);
    }

    // the chances of an exponential value of rate lambda below and above x, and its density there:
    // { lo, hi, density }
    function exponential(lambda, x) {
        if (!(lambda > 0) || !isFinite(lambda) || isNaN(x)) return { lo: NaN, hi: NaN, density: NaN };
        if (x <= 0) return { lo: 0, hi: 1, density: x < 0 ? 0 : lambda };
        return { lo: round(-Math.expm1(-lambda * x)), hi: round(Math.exp(-lambda * x)), density: round(lambda * Math.exp(-lambda * x)) };
    }

    // of a value spread evenly from a to b: { lo, hi, density }
    function uniform(a, b, x) {
        var lo;
        if (!(a < b) || !isFinite(a) || !isFinite(b) || isNaN(x)) return { lo: NaN, hi: NaN, density: NaN };
        lo = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return { lo: round(lo), hi: round(1 - lo), density: x >= a && x <= b ? round(1 / (b - a)) : 0 };
    }

    // The interval that holds the mean with the chance level, from a sample of n of mean m and
    // standard deviation s, by Student's t of n – 1: { from, to, margin, t }
    function meanInterval(m, s, n, level) {
        var t, margin;
        if (!isFinite(m) || !(s >= 0) || !isWhole(n) || n < 2 || !(level > 0 && level < 1)) return { from: NaN, to: NaN, margin: NaN, t: NaN };
        t = quantile(function (x) { return tDist(x, n - 1); }, 1 - (1 - level) / 2);
        margin = t * s / Math.sqrt(n);
        return { from: round(m - margin), to: round(m + margin), margin: round(margin), t: t };
    }

    // The interval that holds a chance with the chance level, from x of n: about x/n, by the
    // normal distribution (Wald's), and Wilson's, which keeps between 0 and 1 and holds as it
    // says better for a small n. { p, from, to, margin, z, wilson: [from, to] }
    function proportionInterval(x, n, level) {
        var p, z, margin, mid, half;
        if (!isWhole(x) || !isWhole(n) || n < 1 || x < 0 || x > n || !(level > 0 && level < 1)) return { p: NaN, from: NaN, to: NaN, margin: NaN, z: NaN, wilson: [NaN, NaN] };
        p = x / n;
        z = normalInverse(1 - (1 - level) / 2, 0, 1);
        margin = z * Math.sqrt(p * (1 - p) / n);
        mid = (p + z * z / (2 * n)) / (1 + z * z / n);
        half = z / (1 + z * z / n) * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
        return { p: round(p), from: round(p - margin), to: round(p + margin), margin: round(margin), z: z, wilson: [round(mid - half), round(mid + half)] };
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
    // that of exactly j, from 0 up to top, and mean its mean. The tail away from the mean is
    // summed from k, the other is 1 less it, so a small one keeps its digits. The chances only
    // get smaller away from the most likely count, which is next to the mean, so the sum stops
    // where they are too small to tell: a few thousand terms where n or k is a billion
    function counts(chance, k, top, mean) {
        var le, ge, eq;
        if (isNaN(chance(0)) || !isFinite(k)) return { eq: NaN, le: NaN, ge: NaN };
        k = Math.floor(k);
        if (k < 0) return { eq: 0, le: 0, ge: 1 };
        if (k > top) return { eq: 0, le: 1, ge: 0 };
        eq = chance(k);
        if (k <= mean) {
            le = tail(-1);
            ge = 1 - le + eq;
        } else {
            ge = tail(1);
            le = 1 - ge + eq;
        }
        return { eq: round(eq), le: round(Math.min(1, Math.max(0, le))), ge: round(Math.min(1, Math.max(0, ge))) };

        function tail(step) {
            var sum = 0, last = Infinity, j, c;
            for (j = k; j >= 0 && j <= top; j += step) {
                c = chance(j);
                sum += c;
                if (c < last && c <= 1e-20 * sum) break;
                last = c;
            }
            return sum;
        }
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

    // The value of a complex expression, as the engine reads it, i its imaginary unit: [re, im];
    // of x as well where x, a complex number, is given. Functions of an angle take it in the unit
    // deg, as the calculator does, and their inverses give one; what has no complex sense here,
    // as 5! of a complex number, is none (NaN)
    function cvalue(n, deg, x) {
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
                if (n.v === 'x' && x) return x;
                return n.v === 'π' ? [PI, 0] : n.v === 'e' ? [Math.E, 0] : [NaN, NaN];
            case 'group': return cvalue(n.arg, deg, x);
            case 'neg':
                a = cvalue(n.arg, deg, x);
                return [0 - a[0], 0 - a[1]]; // not -0, whose angle is the other way: ln(-1) is iπ
            case 'fn':
            case 'post':
                a = cvalue(n.arg, deg, x);
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
                a = cvalue(n.l, deg, x);
                b = cvalue(n.r, deg, x);
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
                toks.push({ n: BigInt(m[0]), decimal: true });
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
            if (t.op === '-' && toks[i] && toks[i].decimal) { // -128 is a number of 8 bits, not 128 turned negative
                v = -toks[i++].n;
                if (v < -(BigInt(1) << BigInt(bits - 1))) wrapped = true;
                return BigInt.asIntN(bits, v);
            }
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
            // a number in decimal is one, 200 too big for 8 bits; one in hex, binary or octal is its
            // bits, 0xFF in 8 bits -1 and not too big
            if (t.n >> BigInt(t.decimal ? bits - 1 : bits)) wrapped = true;
            return BigInt.asIntN(bits, t.n);
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
            ulp: !isFinite(x) ? NaN : isFinite(next) ? next - Math.abs(x) : Math.pow(2, 971) // the largest's next is ∞: the gap of its own exponent
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

    // The eigenvalues of a square matrix of any size, by the QR algorithm, as EISPACK and JAMA
    // have it: the matrix brought to Hessenberg form by Householder's reflections, zeros below the
    // diagonal under its first, then Francis's double steps until it comes apart into blocks of one
    // and two, a real eigenvalue each, or a pair a ± bi. [{ re, im }], or null where it does not settle
    function qrValues(a) {
        var size = a.length, h = a.map(function (r) { return r.slice(); }), ort = [], d = [], e = [], eps = Math.pow(2, -52),
            exshift = 0, norm = 0, iter = 0, steps = 0, n = size - 1, i, j, k, l, m, f, g, hh, scale, p = 0, q = 0, r = 0, s = 0, z = 0, w, x, y, notlast;
        for (m = 1; m < size - 1; m++) { // to Hessenberg form
            scale = 0;
            for (i = m; i < size; i++) scale += Math.abs(h[i][m - 1]);
            if (!scale) continue;
            hh = 0;
            for (i = size - 1; i >= m; i--) {
                ort[i] = h[i][m - 1] / scale;
                hh += ort[i] * ort[i];
            }
            g = ort[m] > 0 ? -Math.sqrt(hh) : Math.sqrt(hh);
            hh -= ort[m] * g;
            ort[m] -= g;
            for (j = m; j < size; j++) {
                for (f = 0, i = size - 1; i >= m; i--) f += ort[i] * h[i][j];
                for (f /= hh, i = m; i < size; i++) h[i][j] -= f * ort[i];
            }
            for (i = 0; i < size; i++) {
                for (f = 0, j = size - 1; j >= m; j--) f += ort[j] * h[i][j];
                for (f /= hh, j = m; j < size; j++) h[i][j] -= f * ort[j];
            }
            h[m][m - 1] = scale * g;
        }
        for (i = 0; i < size; i++) {
            for (j = Math.max(i - 1, 0); j < size; j++) norm += Math.abs(h[i][j]);
        }
        while (n >= 0) {
            if (++steps > 3000) return null;
            for (l = n; l > 0; l--) { // a small number below the diagonal: the matrix comes apart there
                s = Math.abs(h[l - 1][l - 1]) + Math.abs(h[l][l]) || norm;
                if (Math.abs(h[l][l - 1]) < eps * s) break;
            }
            if (l === n) { // one eigenvalue found
                d[n] = h[n][n] + exshift;
                e[n] = 0;
                n--;
                iter = 0;
            } else if (l === n - 1) { // two of them
                w = h[n][n - 1] * h[n - 1][n];
                p = (h[n - 1][n - 1] - h[n][n]) / 2;
                q = p * p + w;
                z = Math.sqrt(Math.abs(q));
                x = h[n][n] + exshift;
                if (q >= 0) { // real
                    z = p >= 0 ? p + z : p - z;
                    d[n - 1] = x + z;
                    d[n] = z ? x - w / z : x + z;
                    e[n - 1] = e[n] = 0;
                } else { // a ± bi
                    d[n - 1] = d[n] = x + p;
                    e[n - 1] = z;
                    e[n] = -z;
                }
                n -= 2;
                iter = 0;
            } else { // a double step, shifted by the eigenvalues of the block of two at the end
                x = h[n][n];
                y = h[n - 1][n - 1];
                w = h[n][n - 1] * h[n - 1][n];
                if (iter === 10) { // Wilkinson's shift, where it is slow to settle
                    exshift += x;
                    for (i = 0; i <= n; i++) h[i][i] -= x;
                    s = Math.abs(h[n][n - 1]) + Math.abs(h[n - 1][n - 2]);
                    x = y = 0.75 * s;
                    w = -0.4375 * s * s;
                }
                if (iter === 30) { // and MATLAB's
                    s = (y - x) / 2;
                    s = s * s + w;
                    if (s > 0) {
                        s = Math.sqrt(s);
                        if (y < x) s = -s;
                        s = x - w / ((y - x) / 2 + s);
                        for (i = 0; i <= n; i++) h[i][i] -= s;
                        exshift += s;
                        x = y = w = 0.964;
                    }
                }
                iter++;
                for (m = n - 2; m >= l; m--) { // two small numbers in a row below the diagonal: the step starts there
                    z = h[m][m];
                    r = x - z;
                    s = y - z;
                    p = (r * s - w) / h[m + 1][m] + h[m][m + 1];
                    q = h[m + 1][m + 1] - z - r - s;
                    r = h[m + 2][m + 1];
                    s = Math.abs(p) + Math.abs(q) + Math.abs(r);
                    p /= s;
                    q /= s;
                    r /= s;
                    if (m === l || Math.abs(h[m][m - 1]) * (Math.abs(q) + Math.abs(r)) <
                        eps * (Math.abs(p) * (Math.abs(h[m - 1][m - 1]) + Math.abs(z) + Math.abs(h[m + 1][m + 1])))) break;
                }
                for (i = m + 2; i <= n; i++) {
                    h[i][i - 2] = 0;
                    if (i > m + 2) h[i][i - 3] = 0;
                }
                for (k = m; k <= n - 1; k++) {
                    notlast = k !== n - 1;
                    if (k !== m) {
                        p = h[k][k - 1];
                        q = h[k + 1][k - 1];
                        r = notlast ? h[k + 2][k - 1] : 0;
                        x = Math.abs(p) + Math.abs(q) + Math.abs(r);
                        if (!x) continue;
                        p /= x;
                        q /= x;
                        r /= x;
                    }
                    s = Math.sqrt(p * p + q * q + r * r);
                    if (p < 0) s = -s;
                    if (!s) continue;
                    if (k !== m) h[k][k - 1] = -s * x;
                    else if (l !== m) h[k][k - 1] = -h[k][k - 1];
                    p += s;
                    x = p / s;
                    y = q / s;
                    z = r / s;
                    q /= p;
                    r /= p;
                    for (j = k; j < size; j++) {
                        p = h[k][j] + q * h[k + 1][j];
                        if (notlast) {
                            p += r * h[k + 2][j];
                            h[k + 2][j] -= p * z;
                        }
                        h[k][j] -= p * x;
                        h[k + 1][j] -= p * y;
                    }
                    for (i = 0; i <= Math.min(n, k + 3); i++) {
                        p = x * h[i][k] + y * h[i][k + 1];
                        if (notlast) {
                            p += z * h[i][k + 2];
                            h[i][k + 2] -= p * r;
                        }
                        h[i][k] -= p;
                        h[i][k + 1] -= p * q;
                    }
                }
            }
        }
        // to 12 digits, a part as small as the rounding of the largest of them 0, as poly has them
        // in order: the real ones from the lowest, then each pair a ± bi
        scale = Math.max.apply(null, d.map(function (re, i) { return Math.hypot(re, e[i]); })) || 1;
        return d.map(function (re, i) {
            return { re: round(Math.abs(re) <= 1e-14 * scale ? 0 : re), im: round(Math.abs(e[i]) <= 1e-10 * scale ? 0 : e[i]) };
        }).sort(function (p, q) {
            return (!!p.im - !!q.im) || p.re - q.re || Math.abs(p.im) - Math.abs(q.im) || q.im - p.im;
        });
    }

    // How far a square matrix's answers can be from right, κ = |A| |A⁻¹|, the largest sum along a
    // row of each: an error in the last digit of a number of A can be κ times as large in its
    // inverse, and in what is worked out of it. Of about 16 digits, some log₁₀ κ are lost.
    // Infinity where it has no inverse; NaN where it is not square
    function condition(a) {
        var inv = inverse(a);
        function size(m) { return Math.max.apply(null, m.map(function (r) { return r.reduce(function (s, x) { return s + Math.abs(x); }, 0); })); }
        if (!a.length || a.some(function (r) { return r.length !== a.length; })) return NaN;
        return inv ? size(a) * size(inv) : Infinity;
    }

    // The eigenvalues of a square matrix, real or a ± bi: up to 4×4 the roots of its characteristic
    // polynomial, as poly gives them; of a larger one by the QR algorithm, which keeps its digits
    // where the roots of a polynomial of a high power would not. And for each real one its
    // eigenvectors, as the matrix less it times I takes to 0: each with a 1 where it is free, made
    // whole where a small whole number times it is, [-1, 2] not [-0.5, 1]. { poly, values: [{ re, im }],
    // vectors: [{ value, v }] }; null if not square
    function eigen(a) {
        var n = a.length, c, values, vectors = [], big;
        if (!n || a.some(function (r) { return r.length !== n; }) || !a.every(function (r) { return r.every(isFinite); })) return null;
        c = characteristic(a);
        values = (n <= 4 ? poly(c) : qrValues(a)) || [];
        values.forEach(function (z, i) {
            var m, r, tol;
            if (z.im || (i && !values[i - 1].im && values[i - 1].re === z.re)) return; // each real one once
            m = a.map(function (row, i) { return row.map(function (x, j) { return x - (i === j ? z.re : 0); }); });
            for (tol = 1e-10; tol <= 1e-5; tol *= 100) { // λ is only so near: a little more of 0 till it has a way to 0
                r = reduce(m, n, tol);
                if (r.rank < n) break;
            }
            kernel(r, n).forEach(function (v) { vectors.push({ value: z.re, v: v }); });
        });
        // of a larger one, a coefficient as small as the rounding of the power of A it comes of is 0
        big = Math.max(1, Math.max.apply(null, a.map(function (r) { return r.reduce(function (s, x) { return s + Math.abs(x); }, 0); })));
        return { poly: c.map(function (x, k) { return n > 4 && Math.abs(x) <= 1e-13 * Math.pow(big, k) ? 0 : round(x) + 0; }), values: values, vectors: vectors };
    }

    // Linear equations A x = b of any size, a matrix and a column, with [A | b] reduced, rref:
    // { x } where they have one answer; { many: true, p, basis }, x = p + t₁v₁ + …, each v of
    // the basis, where they have more; { none: true, least } where they have none, least the
    // nearest by least squares, unless inner, of least squares itself
    function system(a, b, inner) {
        var rows = a.length, cols = a[0].length, r, i, big, m, p = [];
        if (!a.every(function (row) { return row.every(isFinite); }) || !b.every(isFinite)) return null;
        r = reduce(a.map(function (row, i) { return row.concat([b[i]]); }), cols);
        m = clean(r.m, [a, b.map(function (x) { return [x]; })]);
        big = Math.max.apply(null, b.map(Math.abs)); // left over of b, as small as b is: none where it is 0 throughout
        for (i = r.rank; i < rows; i++) if (Math.abs(r.m[i][cols]) > 1e-9 * big) return { none: true, rref: m, least: inner ? null : leastSquares(a, b) };
        if (r.rank < cols) {
            for (i = 0; i < cols; i++) p.push(0);
            r.where.forEach(function (col, row) { p[col] = r.m[row][cols]; }); // each free unknown 0
            return { many: true, rref: m, p: clean([p], [a, [b]])[0], basis: kernel(r, cols) };
        }
        return { x: clean(r.m.slice(0, cols).map(function (row) { return [row[cols]]; }), [a, [b]]).map(function (row) { return row[0]; }), rref: m };
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

    // Miller and Rabin's test, on the first thirteen primes, which tells for certain below 3.3 × 10²⁴
    function isPrime(n) {
        var d = n - BIG.one, s = 0, bases = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41], i, j, a, x;
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

    // ---------- more of matrices ---------- //

    // v made whole where a small whole number times it is, [-1, 2] not [-0.5, 1], each to 12 digits
    function wholeVector(v) {
        var big = Math.max.apply(null, v.map(Math.abs)), k;
        v = v.map(function (x) { return Math.abs(x) <= 1e-9 * big ? 0 : x; });
        for (k = 1; k <= 12; k++) {
            if (v.every(function (x) { return Math.abs(k * x - Math.round(k * x)) <= 1e-8 * Math.max(1, Math.abs(k * x)); })) {
                return v.map(function (x) { return Math.round(k * x) + 0; });
            }
        }
        return v.map(function (x) { return round(x) + 0; });
    }

    // The vectors a matrix takes to 0, from its rows reduced, r as reduce gives it, of n columns:
    // one for each column without a first 1 of a row, with a 1 there, made whole
    function kernel(r, n) {
        var out = [], free, v, j;
        for (free = 0; free < n; free++) {
            if (r.where.indexOf(free) > -1) continue;
            v = [];
            for (j = 0; j < n; j++) v[j] = j === free ? 1 : 0;
            r.where.forEach(function (col, row) { v[col] = -r.m[row][free]; });
            out.push(wholeVector(v));
        }
        return out;
    }

    // A matrix's rows reduced as far as they go, its reduced row echelon form: { m, rank, pivots:
    // the column of each row's first 1, kernel: a basis of the vectors it takes to 0 }
    function rref(a) {
        var r = reduce(a, a[0].length);
        return { m: clean(r.m, [a]), rank: r.rank, pivots: r.where, kernel: kernel(r, a[0].length) };
    }

    // The x that makes A x as near b as it can be, by least squares, AᵀA x = Aᵀb: { x, residual:
    // the length of A x – b, many: other x are as near }
    function leastSquares(a, b) {
        var at = transpose(a), r = system(times(at, a, true), times(at, b.map(function (x) { return [x]; }), true).map(function (row) { return row[0]; }), true), x, d; // inner: no least squares of its own
        if (!r) return null;
        x = r.x || r.p;
        d = a.map(function (row, i) { return row.reduce(function (s, v, j) { return s + v * x[j]; }, 0) - b[i]; });
        return { x: x, residual: round(Math.sqrt(d.reduce(function (s, v) { return s + v * v; }, 0))), many: !!r.many };
    }

    // a square matrix to the power n, a whole number up to 1000 either way, by squaring; of n
    // below 0, of its inverse; null where it is not square or has no inverse
    function matrixPower(a, n) {
        var size = a.length, out, base, k;
        if (!size || a.some(function (r) { return r.length !== size; }) || !isWhole(n) || Math.abs(n) > 1000) return null;
        base = n < 0 ? inverse(a) : a;
        if (!base) return null;
        out = a.map(function (r, i) { return r.map(function (x, j) { return i === j ? 1 : 0; }); });
        for (k = Math.abs(n); k > 0; k = Math.floor(k / 2)) {
            if (k % 2) out = times(out, base, true);
            if (k > 1) base = times(base, base, true);
        }
        return clean(out, [out]);
    }

    // P A = L U of a square matrix, by elimination with the largest first: { p, l, u }, null
    // where it is not square
    function lu(a) {
        var n = a.length, u = a.map(function (r) { return r.slice(); }), l = [], p = [], i, j, k, q, f, big;
        if (!n || a.some(function (r) { return r.length !== n; })) return null;
        for (i = 0; i < n; i++) {
            l.push(a.map(function () { return 0; }));
            p.push(i);
        }
        big = Math.max.apply(null, a.map(function (r) { return Math.max.apply(null, r.map(Math.abs)); })) || 1;
        for (j = 0; j < n; j++) {
            q = j;
            for (i = j + 1; i < n; i++) if (Math.abs(u[i][j]) > Math.abs(u[q][j])) q = i;
            if (q !== j) {
                [u, l, p].forEach(function (m) { var t = m[j]; m[j] = m[q]; m[q] = t; });
            }
            l[j][j] = 1;
            if (Math.abs(u[j][j]) <= 1e-13 * big) continue; // nothing below to take away
            for (i = j + 1; i < n; i++) {
                f = u[i][j] / u[j][j];
                l[i][j] = f;
                for (k = j; k < n; k++) u[i][k] -= f * u[j][k];
            }
        }
        return {
            p: p.map(function (c) { return a.map(function (x, j) { return j === c ? 1 : 0; }); }),
            l: clean(l, [l]),
            u: clean(u, [a])
        };
    }

    // A = Q R, Q's columns of length 1 and at right angles, R above its diagonal, which is 0 or
    // more: by Householder's reflections. { q, r }
    function qr(a) {
        var m = a.length, n = a[0].length, r = a.map(function (row) { return row.slice(); }), q = [], i, j, k, norm, alpha, v, vv, dot;
        for (i = 0; i < m; i++) q.push(a.map(function (x, j) { return i === j ? 1 : 0; }));
        for (k = 0; k < Math.min(m - 1, n); k++) {
            for (norm = 0, i = k; i < m; i++) norm += r[i][k] * r[i][k];
            norm = Math.sqrt(norm);
            if (!norm) continue;
            alpha = r[k][k] > 0 ? -norm : norm;
            v = [];
            for (i = 0; i < m; i++) v.push(i < k ? 0 : i === k ? r[k][k] - alpha : r[i][k]);
            vv = v.reduce(function (s, x) { return s + x * x; }, 0);
            if (!vv) continue;
            for (j = 0; j < n; j++) {
                for (dot = 0, i = k; i < m; i++) dot += v[i] * r[i][j];
                for (i = k; i < m; i++) r[i][j] -= 2 * dot / vv * v[i];
            }
            for (i = 0; i < m; i++) {
                for (dot = 0, j = k; j < m; j++) dot += q[i][j] * v[j];
                for (j = k; j < m; j++) q[i][j] -= 2 * dot / vv * v[j];
            }
        }
        for (k = 0; k < Math.min(m, n); k++) {
            if (r[k][k] < 0) { // a diagonal of 0 or more: the row of R and the column of Q the other way
                for (j = 0; j < n; j++) r[k][j] = -r[k][j];
                for (i = 0; i < m; i++) q[i][k] = -q[i][k];
            }
        }
        return { q: clean(q, [q]), r: clean(r, [a]) };
    }

    // Numbers typed as a vector: 1, 2, 3, or with spaces or ; between them, as with a decimal
    // comma; each may be worked out, sqrt(2). An array of 2 to 4 of them, or null
    function vectorOf(text, comma, deg) {
        var parts = String(text).trim().split(comma ? /\s*;\s*|\s+/ : /\s*[,;]\s*|\s+/).filter(Boolean), v;
        if (parts.length < 2 || parts.length > 4) return null;
        v = parts.map(function (p) { return number(p, comma, deg); });
        return v.every(isFinite) ? v : null;
    }

    // A matrix pasted: a block of a spreadsheet, its rows on lines and a tab between its numbers;
    // lines of numbers with spaces, or commas, between them; or a matrix in brackets, [1 2; 3 4]
    // with a ; between its rows, or [[1, 2], [3, 4]] with each row in brackets of its own. With
    // a decimal comma a comma is of a number, so a ; or a space goes between numbers, in the
    // brackets of each row as well: [[1,5; 2]; [3; 4]]. Each may be worked out, sqrt(2); an empty
    // cell of a spreadsheet is '', and a row shorter than the others is filled out with ''.
    // { cells: the text of each, values: their numbers, 0 for '' }, or null for one number alone
    // or anything that is not a matrix
    function matrixText(text, comma, deg) {
        var s = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim(), between = comma ? /\s*;\s*|\s+/ : /\s*[,;]\s*|\s+/,
            inner, cells, width, values;
        if (!s || s.length > 20000) return null;
        if (/^[\[{]/.test(s) && /[\]}]$/.test(s)) {
            inner = s.slice(1, -1).trim();
            cells = /^[\[{]/.test(inner) && /[\]}]$/.test(inner) ? inner.slice(1, -1).split(/[\]}]\s*[,;]?\s*[\[{]/).map(function (r) { // [[1, 2], [3, 4]]
                return r.trim().split(between);
            }) : inner.split(/\s*[;\n]\s*/).map(function (r) { // [1 2; 3 4]: a ; or a new line between its rows
                return r.trim().split(comma ? /\s+/ : /\s*,\s*|\s+/);
            });
        } else {
            cells = s.split('\n').filter(function (r) { return r.trim(); }).map(function (r) {
                var c;
                if (!/\t/.test(s)) return r.trim().split(between);
                c = r.split('\t').map(function (x) { return x.trim(); }); // a spreadsheet's: what is between tabs, an empty cell as well, but none after the last number
                while (c.length > 1 && !c[c.length - 1]) c.pop();
                return c;
            });
        }
        if (cells.length > 1000 || cells.some(function (r) { return r.some(function (c) { return /[\[\]{}]/.test(c); }); })) return null;
        width = Math.max.apply(null, cells.map(function (r) { return r.length; }));
        if (cells.length * width < 2) return null;
        cells.forEach(function (r) {
            while (r.length < width) r.push('');
        });
        values = cells.map(function (r) { return r.map(function (c) { return c ? number(c, comma, deg) : 0; }); });
        return values.every(function (r) { return r.every(isFinite); }) ? { cells: cells, values: values } : null;
    }

    // Of two vectors of one size: { dot, cross: of two of 3 a vector, of 2 its one number, of 4
    // none, lengths: [|u|, |v|], angle between them in the unit deg, projection of u on v, unit:
    // u of length 1 }
    function vectors(u, v, deg) {
        var dot = u.reduce(function (s, x, i) { return s + x * v[i]; }, 0), lu = Math.hypot.apply(null, u), lv = Math.hypot.apply(null, v), cross = null, cos;
        if (u.length === 3) cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]].map(function (x) { return round(x) + 0; });
        if (u.length === 2) cross = round(u[0] * v[1] - u[1] * v[0]) + 0;
        cos = lu && lv ? Math.max(-1, Math.min(1, dot / (lu * lv))) : NaN;
        return {
            dot: round(dot) + 0, cross: cross, lengths: [round(lu), round(lv)],
            angle: round(Math.acos(cos) / [1, PI / 180, PI / 200][deg || 0]),
            projection: lv ? v.map(function (x) { return round(x * dot / (lv * lv)) + 0; }) : null,
            unit: lu ? u.map(function (x) { return round(x / lu) + 0; }) : null
        };
    }

    // ---------- polynomials of complex coefficients ---------- //

    // The roots of a polynomial of complex coefficients [re, im], the highest power first, by
    // Aberth's steps for all at once and Newton's for each, as poly: [{ re, im }] by their real
    // parts, then imaginary; null where it has no power of x or a coefficient is not a number
    function cpoly(coefs) {
        var c = coefs.slice(), zeros = [], n, roots = [], big, i, k, j, step, h, q, s, w, out;
        if (!c.every(function (z) { return isFinite(z[0]) && isFinite(z[1]); })) return null;
        while (c.length && !c[0][0] && !c[0][1]) c.shift();
        if (c.length < 2) return null;
        while (c.length > 1 && !c[c.length - 1][0] && !c[c.length - 1][1]) {
            c.pop();
            zeros.push({ re: 0, im: 0 });
        }
        n = c.length - 1;
        function at(z) { // the value and slope at z
            var p = c[0], d = [0, 0], k;
            for (k = 1; k <= n; k++) {
                d = add(cmul(d, z), p);
                p = add(cmul(p, z), c[k]);
            }
            return { p: p, d: d };
        }
        if (n >= 1) {
            big = 1 + Math.max.apply(null, c.slice(1).map(function (z) { return cabs(cdiv(z, c[0])); }));
            for (k = 0; k < n; k++) roots.push([big * Math.cos(2 * PI * k / n + 0.4), big * Math.sin(2 * PI * k / n + 0.4)]);
            for (i = 0; i < 800; i++) {
                step = 0;
                for (k = 0; k < n; k++) {
                    h = at(roots[k]);
                    if (!h.p[0] && !h.p[1]) continue;
                    q = cdiv(h.p, h.d);
                    for (s = [0, 0], j = 0; j < n; j++) if (j !== k) s = add(s, cdiv([1, 0], sub(roots[k], roots[j])));
                    q = cdiv(q, sub([1, 0], cmul(q, s)));
                    if (!isFinite(q[0]) || !isFinite(q[1])) continue;
                    roots[k] = sub(roots[k], q);
                    step = Math.max(step, cabs(q) / Math.max(1, cabs(roots[k])));
                }
                if (step < 1e-16) break;
            }
        }
        out = roots.map(function (z) {
            for (w = z, k = 0; k < 3; k++) { // Newton's steps, each kept only if it is nearer
                h = at(w);
                if (!(cabs(h.d) > 0)) break;
                q = sub(w, cdiv(h.p, h.d));
                if (isFinite(q[0]) && isFinite(q[1]) && cabs(at(q).p) <= cabs(h.p)) w = q;
            }
            return tidyComplex(w);
        }).concat(zeros);
        return out.sort(function (p, q) { return p.re - q.re || p.im - q.im; });
    }

    // A polynomial of x typed with complex coefficients, x^2 + (1 + i)x + 2i, multiplied out, or
    // its coefficients from the highest power: 1, 1 + i, 2i (with ; between them with the comma).
    // { c: [[re, im]], the highest power first } or { error: 'polynomial' | 'letters' | 'power' }
    function cpolynomial(text, comma, deg) {
        var s = String(text).trim(), parts, sides, trees, big = false, letters = false, c, top;
        if (!s) return { error: 'polynomial' };
        parts = s.split(comma ? /\s*;\s*/ : /\s*[,;]\s*/);
        if (parts.length > 1 && !/x/i.test(s)) {
            c = parts.map(function (p) { return complex(p, comma, deg); });
            if (!c.every(function (z) { return z && isFinite(z.re) && isFinite(z.im); })) return { error: 'polynomial' };
            c = c.map(function (z) { return [z.re, z.im]; });
            while (c.length > 1 && !c[0][0] && !c[0][1]) c.shift();
            return c.length - 1 > POWER_MAX ? { error: 'power' } : { c: c };
        }
        function cadd(a, b, minus) {
            var out = [], k;
            for (k = 0; k < Math.max(a.length, b.length); k++) out.push((minus ? sub : add)(a[k] || [0, 0], b[k] || [0, 0]));
            return out;
        }
        function cmulp(a, b) {
            var out = [], j, k;
            for (k = 0; k < a.length + b.length - 1; k++) out.push([0, 0]);
            for (j = 0; j < a.length; j++) for (k = 0; k < b.length; k++) out[j + k] = add(out[j + k], cmul(a[j], b[k]));
            return out;
        }
        function hasX(n) {
            var a, b, r;
            if (!n) return false;
            if (n.t === 'const' && n.p && n.v !== 'i') letters = true;
            a = hasX(n.arg);
            b = hasX(n.l);
            r = hasX(n.r);
            return n.t === 'const' && n.v === 'x' || a || b || r;
        }
        function expand(n) { // the coefficients, the lowest power first, as polynomial's, of complex numbers
            var a, b, out, k;
            if (!hasX(n)) {
                a = cvalue(n, deg);
                return isFinite(a[0]) && isFinite(a[1]) ? [a] : null;
            }
            switch (n.t) {
                case 'const': return [[0, 0], [1, 0]];
                case 'group': return expand(n.arg);
                case 'neg':
                    a = expand(n.arg);
                    return a && a.map(function (z) { return [0 - z[0], 0 - z[1]]; });
                case 'fn':
                case 'post':
                    a = expand(n.arg);
                    if (!a) return null;
                    if (n.key === 'x2') return cmulp(a, a);
                    return n.key === 'x3' ? cmulp(cmulp(a, a), a) : null;
                case 'bin':
                    a = expand(n.l);
                    b = expand(n.r);
                    if (!a || !b) return null;
                    if (n.op === '+' || n.op === '–') return cadd(a, b, n.op === '–');
                    if (n.op === '×') return a.length + b.length - 2 > POWER_MAX ? (big = true) && null : cmulp(a, b);
                    if (n.op === '÷') return b.length === 1 && (b[0][0] || b[0][1]) ? a.map(function (z) { return cdiv(z, b[0]); }) : null;
                    if (n.op === 'yx' && b.length === 1 && !b[0][1] && b[0][0] >= 0 && b[0][0] === Math.floor(b[0][0])) {
                        if ((a.length - 1) * b[0][0] > POWER_MAX) return (big = true) && null;
                        for (out = [[1, 0]], k = 0; k < b[0][0]; k++) out = cmulp(out, a);
                        return out;
                    }
            }
            return null;
        }
        sides = s.split('=');
        if (sides.length > 2 || sides.some(function (side) { return !side.trim(); })) return { error: 'polynomial' };
        trees = sides.map(function (side) { return Engine.tree(side, comma); });
        if (!trees.every(Boolean)) return { error: 'polynomial' };
        trees.forEach(hasX);
        if (letters) return { error: 'letters' };
        c = trees.map(expand);
        if (big) return { error: 'power' };
        if (!c.every(Boolean)) return { error: 'polynomial' };
        c = c.length === 2 ? cadd(c[0], c[1], true) : c[0];
        top = Math.max.apply(null, c.map(cabs));
        c = c.map(function (z) { return [Math.abs(z[0]) <= 1e-14 * top ? 0 : round(z[0]), Math.abs(z[1]) <= 1e-14 * top ? 0 : round(z[1])]; }).reverse();
        while (c.length > 1 && !c[0][0] && !c[0][1]) c.shift();
        return c.length - 1 > POWER_MAX ? { error: 'power' } : { c: c };
    }

    // ---------- any base ---------- //

    var DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

    // A number written in a base from 2 to 36, with a point and its digits after it, a part that
    // comes again and again in brackets as well: FF.8 in 16, 0.(3) in 10. As a fraction [top,
    // bottom] of BigInts, the bottom above 0; null where it is not one
    function fromBase(text, base) {
        var s = String(text).trim().toLowerCase().replace(/[\s_]/g, '').replace(/^[−–]/, '-'), neg = s.charAt(0) === '-', m, b = BigInt(base),
            top, bottom, rep, g;
        function read(digits) { // the digits as a whole number, null where one is not of the base
            var v = BIG.zero, i, d;
            for (i = 0; i < digits.length; i++) {
                d = DIGITS.indexOf(digits.charAt(i));
                if (d < 0 || d >= base) return null;
                v = v * b + BigInt(d);
            }
            return v;
        }
        if (!(base >= 2 && base <= 36 && base === Math.floor(base))) return null;
        if (neg || s.charAt(0) === '+') s = s.slice(1);
        m = /^([0-9a-z]*)(?:[.,]([0-9a-z]*)(?:\(([0-9a-z]+)\))?)?$/.exec(s);
        if (!m || !(m[1] || m[2] || m[3])) return null;
        top = read((m[1] || '') + (m[2] || ''));
        if (top === null) return null;
        bottom = b ** BigInt((m[2] || '').length);
        if (m[3]) { // and rep / ((b^len – 1) b^frac)
            rep = read(m[3]);
            if (rep === null) return null;
            top = top * (b ** BigInt(m[3].length) - BIG.one) + rep;
            bottom *= b ** BigInt(m[3].length) - BIG.one;
        }
        g = gcdBig(top, bottom) || BIG.one;
        return [(neg ? -top : top) / g, bottom / g];
    }

    // A fraction written in a base from 2 to 36: its whole part, a point and the digits after it,
    // the part that comes again and again in brackets, 0.0(0011) for 0.1 in 2; … after max digits
    // where it goes on further without coming round
    function toBase(top, bottom, base, max) {
        var b = BigInt(base), neg = top < BIG.zero, whole, rest, digits = '', seen = new Map(), k, d, at;
        if (neg) top = -top;
        whole = (top / bottom).toString(base);
        rest = top % bottom;
        for (k = 0; rest && k < (max || 64); k++) {
            if (seen.has(rest)) {
                at = seen.get(rest);
                digits = digits.slice(0, at) + '(' + digits.slice(at) + ')';
                rest = BIG.zero;
                break;
            }
            seen.set(rest, k);
            rest *= b;
            d = rest / bottom;
            digits += DIGITS.charAt(Number(d));
            rest %= bottom;
        }
        if (rest) digits += '…';
        return ((neg && (top || digits) ? '-' : '') + whole + (digits ? '.' + digits : '')).toUpperCase();
    }

    // ---------- text and its codes ---------- //

    // The codes of a text: { points: its code points, utf8: its bytes in UTF-8, utf16: its units }
    function textCodes(text) {
        var s = String(text), points = [], units = [], i;
        for (i = 0; i < s.length; i++) units.push(s.charCodeAt(i));
        Array.from(s).forEach(function (ch) { points.push(ch.codePointAt(0)); });
        return { points: points, utf8: Array.from(new TextEncoder().encode(s)), utf16: units };
    }

    // A text from its codes typed: U+00E9 or é for code points, 0xC3 0xA9 for bytes of
    // UTF-8, 0b11000011 in binary as well, or 233 in decimal for code points; apart by spaces or
    // commas. The text, or null where they are not one
    function fromCodes(text) {
        var parts = String(text).trim().split(/[\s,;]+/).filter(Boolean), bytes = [], points = [], i, p, v, out = '';
        if (!parts.length) return null;
        for (i = 0; i < parts.length; i++) {
            p = parts[i];
            if (/^(u\+|\\u)[0-9a-f]{1,6}$/i.test(p)) {
                if (bytes.length) return null;
                points.push(parseInt(p.slice(2), 16));
            } else if (/^0x[0-9a-f]{1,2}$/i.test(p) || /^0b[01]{1,8}$/i.test(p)) {
                if (points.length) return null;
                bytes.push(parseInt(p.slice(2), /^0x/i.test(p) ? 16 : 2));
            } else if (/^\d+$/.test(p)) {
                if (bytes.length) return null;
                points.push(+p);
            } else {
                return null;
            }
        }
        if (bytes.length) {
            try {
                return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
            } catch (e) {
                return null;
            }
        }
        for (i = 0; i < points.length; i++) {
            v = points[i];
            if (v > 0x10FFFF || (v >= 0xD800 && v <= 0xDFFF)) return null;
            out += String.fromCodePoint(v);
        }
        return out;
    }

    // ---------- modular arithmetic ---------- //

    // a whole number typed, as a BigInt, of up to 1000 digits; one worked out as whole does
    function wholeLong(text, comma, deg) {
        var s = String(text).trim().replace(/^[−–]/, '-').replace(/^\+/, '');
        if (/^-?\d+$/.test(s)) return s.replace(/^-?0*/, '').length <= 1000 ? BigInt(s) : null;
        return whole(s, comma, deg);
    }

    // x modulo m, from 0 up to m
    function modOf(x, m) {
        x %= m;
        return x < BIG.zero ? x + m : x;
    }

    // the inverse of a modulo m, by Euclid's steps both ways, or null where they have a factor in common
    function modInverse(a, m) {
        var r0 = modOf(a, m), r1 = m, s0 = BIG.one, s1 = BIG.zero, q, t;
        while (r1) {
            q = r0 / r1;
            t = r0 - q * r1;
            r0 = r1;
            r1 = t;
            t = s0 - q * s1;
            s0 = s1;
            s1 = t;
        }
        return r0 === BIG.one ? modOf(s0, m) : m === BIG.one ? BIG.zero : null;
    }

    // Of whole numbers a, b and m typed: { mod: a mod m, power: aᵇ mod m, of b below 0 by the
    // inverse, inverse: a⁻¹ mod m, solve: { x, step, count } of a x ≡ b (mod m), x + k·step for
    // each k below count, or null where it has none } or { error: 'whole', at: 'a' | 'b' | 'm' }
    // | { error: 'modulus' } for an m that is not above 0
    function modular(texts, comma, deg) {
        var v = texts.map(function (t) { return wholeLong(t, comma, deg); }), a = v[0], b = v[1], m = v[2], inv, g, step, x, power;
        for (g = 0; g < 3; g++) if (v[g] === null) return { error: 'whole', at: 'abm'.charAt(g) };
        if (m <= BIG.zero) return { error: 'modulus' };
        inv = modInverse(a, m);
        power = b < BIG.zero ? (inv === null ? null : powMod(inv, -b, m)) : m === BIG.one ? BIG.zero : powMod(modOf(a, m), b, m);
        g = gcdBig(a, m); // 1 or more, as m is
        if (modOf(b, g)) {
            x = null;
        } else {
            step = m / g;
            x = { x: modOf(b / g * modInverse(a / g, step), step), step: step, count: g };
        }
        return { mod: modOf(a, m), power: power, inverse: inv, solve: x };
    }

    // The x of x ≡ r (mod m) for each of a list typed, 2 mod 3, 3 mod 5, 2 mod 7, by the Chinese
    // remainder theorem, the moduli with a factor in common as well: { x, m: x is one of x + k·m },
    // { none: true } where they cannot all hold, or { error: 'list', at } with the part that is not one
    function chinese(text, comma, deg) {
        var parts = String(text).split(comma ? /\s*;\s*/ : /\s*[,;]\s*/).filter(function (s) { return s.trim(); }), x = BIG.zero, m = BIG.one, i, p, r, n, g, t;
        if (!parts.length) return { error: 'list', at: '' };
        for (i = 0; i < parts.length; i++) {
            p = /^\s*(?:x\s*[≡=]\s*)?(\S+)\s*(?:\(\s*mod\s+(\S+?)\s*\)|mod\s+(\S+))\s*$/i.exec(parts[i]);
            r = p && wholeLong(p[1], comma, deg);
            n = p && wholeLong(p[2] || p[3], comma, deg);
            if (!p || r === null || n === null || n <= BIG.zero) return { error: 'list', at: parts[i].trim() };
            g = gcdBig(m, n);
            if (modOf(r - x, g)) return { none: true };
            t = modOf((r - x) / g * (modInverse(m / g, n / g) || BIG.zero), n / g);
            x = modOf(x + m * t, m / g * n);
            m = m / g * n;
        }
        return { x: x, m: m };
    }

    // ---------- exact whole numbers and fractions ---------- //

    var EXACT_DIGITS = 20000; // a number found exactly of more digits is not worked out

    // A calculation worked out exactly, of whole numbers and fractions as BigInts: + – × ÷, ^,
    // n!, nCr and nPr, or C(n, k), P(n, k) and fib(n): 100!, 2^200, 50 nCr 25, fib(300), 1/3 + 1/6.
    // { top, bottom } in lowest terms, the bottom above 0, or { error: 'expression' | 'large' |
    // 'zero' | 'whole' }: not one; past EXACT_DIGITS; a division by 0; a factorial, a power or a
    // choice of what is not a whole number of the size it can be
    function exact(text, comma) {
        var s = String(text).replace(/×|\*/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-'), at = 0, error = null, v;
        function fail(e) {
            if (!error) error = e;
            return null;
        }
        function frac(t, b) {
            var g;
            if (t === null || b === null) return null;
            if (!b) return fail('zero');
            if (b < BIG.zero) {
                t = -t;
                b = -b;
            }
            g = gcdBig(t, b) || BIG.one;
            t /= g;
            b /= g;
            if (t.toString().length > EXACT_DIGITS + 1 || b.toString().length > EXACT_DIGITS) return fail('large');
            return [t, b];
        }
        function log10(v) { // of a whole number above 0, from its first 15 digits and how many there are
            var d = v.toString();
            return v ? d.length - 15 + Math.log10(Number(d.slice(0, 15)) * Math.pow(10, 15 - Math.min(15, d.length))) : 0;
        }
        function intOf(x, max) { // a whole number of x, at most max, or null
            return x && x[1] === BIG.one && x[0] >= BIG.zero && x[0] <= BigInt(max) ? x[0] : fail('whole');
        }
        function space() {
            while (at < s.length && /\s/.test(s.charAt(at))) at++;
        }
        function is(word) {
            space();
            if (s.substr(at, word.length).toLowerCase() === word.toLowerCase()) {
                at += word.length;
                return true;
            }
            return false;
        }
        function factorial(n, from) { // from + 1 up to n, multiplied in halves, so the products are of a size
            if (n - from <= BigInt(8)) {
                for (var p = BIG.one, k = from + BIG.one; k <= n; k++) p *= k;
                return p;
            }
            var mid = (n + from) / BIG.two;
            return factorial(mid, from) * factorial(n, mid);
        }
        function fib(n) { // by doubling: F(2k) = F(k)(2F(k+1) – F(k)), F(2k+1) = F(k)² + F(k+1)²
            var bits = n.toString(2), a = BIG.zero, b = BIG.one, i, c, d;
            for (i = 0; i < bits.length; i++) {
                c = a * (BIG.two * b - a);
                d = a * a + b * b;
                a = c;
                b = d;
                if (bits.charAt(i) === '1') {
                    c = a + b;
                    a = b;
                    b = c;
                }
            }
            return a;
        }
        function choose(n, k, perm) {
            if (n === null || k === null) return null;
            if (k > n) return [BIG.zero, BIG.one];
            if (!perm && k > n - k) k = n - k;
            var p = factorial(n, n - k);
            return frac(perm ? p : p / factorial(k, BIG.zero), BIG.one);
        }
        function primary() {
            var m, x, y, name;
            space();
            m = (comma ? /^(\d+)(?:,(\d+))?/ : /^(\d+)(?:\.(\d+))?/).exec(s.slice(at)); // with the decimal mark in use, not the , of C(5, 2)
            if (m) {
                at += m[0].length;
                return frac(BigInt(m[1] + (m[2] || '')), BigInt(10) ** BigInt((m[2] || '').length));
            }
            m = /^(fib|nCr|nPr|C|P|F)\s*\(/i.exec(s.slice(at));
            if (m) {
                name = m[1].toLowerCase();
                at += m[0].length;
                x = expr();
                if (name === 'fib' || name === 'f') {
                    if (!is(')')) return fail('expression');
                    x = intOf(x, 100000);
                    return x === null ? null : frac(fib(x), BIG.one);
                }
                if (!is(comma ? ';' : ',')) return fail('expression');
                y = expr();
                if (!is(')')) return fail('expression');
                return choose(intOf(x, 5000), intOf(y, 5000), name === 'npr' || name === 'p');
            }
            if (is('(')) {
                x = expr();
                return is(')') ? x : fail('expression');
            }
            return fail('expression');
        }
        function postfix() {
            var x = primary(), n;
            while (x && is('!')) {
                n = intOf(x, 5000);
                x = n === null ? null : frac(factorial(n, BIG.zero), BIG.one);
            }
            return x;
        }
        function power() {
            var x = postfix(), e, t, b;
            if (x && is('^')) {
                e = unary();
                if (!e) return null;
                if (e[1] !== BIG.one) return fail('whole');
                if (!x[0] && e[0] < BIG.zero) return fail('zero');
                // the digits of the larger part, as its logarithm, times the power: past the most, not worked out, 2^99999999 as well
                if (Math.max(log10(x[0] < BIG.zero ? -x[0] : x[0]), log10(x[1])) * Math.abs(Number(e[0])) > EXACT_DIGITS) return fail('large');
                t = e[0] < BIG.zero ? x[1] : x[0];
                b = e[0] < BIG.zero ? x[0] : x[1];
                e = e[0] < BIG.zero ? -e[0] : e[0];
                return frac(t ** e, b ** e);
            }
            return x;
        }
        function unary() {
            var x;
            if (is('-')) {
                x = unary();
                return x && [-x[0], x[1]];
            }
            if (is('+')) return unary();
            return power();
        }
        function combo() {
            var x = unary(), y, perm;
            for (;;) {
                if (is('nCr')) perm = false;
                else if (is('nPr')) perm = true;
                else return x;
                y = unary();
                if (!x || !y) return null;
                x = choose(intOf(x, 5000), intOf(y, 5000), perm);
            }
        }
        function term() {
            var x = combo(), y, op;
            for (;;) {
                space();
                op = s.charAt(at);
                if (op !== '*' && op !== '/') return x;
                at++;
                y = combo();
                if (!x || !y) return null;
                x = op === '*' ? frac(x[0] * y[0], x[1] * y[1]) : frac(x[0] * y[1], x[1] * y[0]);
            }
        }
        function expr() {
            var x = term(), y, op;
            for (;;) {
                space();
                op = s.charAt(at);
                if (op !== '+' && op !== '-') return x;
                at++;
                y = term();
                if (!x || !y) return null;
                x = frac(x[0] * y[1] + (op === '+' ? y[0] : -y[0]) * x[1], x[1] * y[1]);
            }
        }
        if (!s.trim()) return { error: 'expression' };
        v = expr();
        space();
        if (v && at < s.length) v = fail('expression');
        return v ? { top: v[0], bottom: v[1] } : { error: error || 'expression' };
    }

    // A number of a fraction of BigInts, to 12 digits: as a Number where it is one, 9.33262154439e157
    // for 100!; past what a Number keeps, a text of its digits and power of 10, 4.02387260077e2567
    function about(top, bottom) {
        var t = top < BIG.zero ? -top : top, k, q, d, e;
        if (!t) return 0;
        k = 14 - (t.toString().length - bottom.toString().length);
        q = k >= 0 ? t * BigInt(10) ** BigInt(k) / bottom : t / (bottom * BigInt(10) ** BigInt(-k));
        d = q.toString();
        e = d.length - 1 - k;
        if (Math.abs(e) < 300) return round((top < BIG.zero ? -1 : 1) * +(d.charAt(0) + '.' + d.slice(1) + 'e' + e));
        return (top < BIG.zero ? '-' : '') + d.charAt(0) + '.' + d.slice(1, 12).replace(/0+$/, '').replace(/^$/, '0') + 'e' + e;
    }

    // ---------- primes ---------- //

    var SIEVE_MAX = 1e7, sieved = null; // the primes up to this are sieved once, as they are asked for

    // a byte for each number up to SIEVE_MAX, 1 for a prime, by Eratosthenes' sieve
    function sieve() {
        var s, i, j;
        if (sieved) return sieved;
        s = new Uint8Array(SIEVE_MAX + 1).fill(1);
        s[0] = s[1] = 0;
        for (i = 2; i * i <= SIEVE_MAX; i++) {
            if (s[i]) for (j = i * i; j <= SIEVE_MAX; j += i) s[j] = 0;
        }
        return (sieved = s);
    }

    // Of a whole number typed: { n, prime, previous: the prime below it, or null, next: above it,
    // count: π(n), how many primes there are up to it, nth: the n-th prime, each where n is up to
    // SIEVE_MAX, or null } or { error: 'whole' }
    function primesNear(text, comma, deg) {
        var n = wholeLong(text, comma, deg), p, q, s, count = null, nth = null, i, c, N;
        if (n === null || n.toString().replace('-', '').length > 24) return { error: 'whole' };
        for (p = n - BIG.one; p >= BIG.two && !isPrime(p); p--);
        for (q = n < BIG.two ? BIG.two : n + BIG.one; !isPrime(q); q++);
        if (n >= BIG.zero && n <= BigInt(SIEVE_MAX)) {
            s = sieve();
            N = Number(n);
            count = 0;
            for (i = 2, c = 0; i <= SIEVE_MAX && (i <= N || (nth === null && N >= 1)); i++) {
                if (s[i] && ++c === N) nth = i;
                if (i === N) count = c;
            }
        }
        return { n: n, prime: isPrime(n), previous: p >= BIG.two ? p : null, next: q, count: count, nth: nth };
    }

    // The primes from a to b, both in, b up to 1e14 and as many as 10⁷ apart: by the sieve, or
    // by one of the stretch, from the primes up to √b. { count, list: up to max of them, more }
    // or { error: 'whole' | 'far' }
    function primesBetween(texts, comma, deg, max) {
        var v = texts.map(function (t) { return wholeLong(t, comma, deg); }), a, b, s, list = [], count = 0, mark, i, j, p, root;
        if (v[0] === null || v[1] === null) return { error: 'whole' };
        a = Number(v[0] < v[1] ? v[0] : v[1]);
        b = Number(v[0] < v[1] ? v[1] : v[0]);
        a = Math.max(a, 2);
        if (b > 1e14 || b - a > SIEVE_MAX) return { error: 'far' };
        if (b < 2) return { count: 0, list: [], more: false };
        if (b <= SIEVE_MAX) {
            s = sieve();
            for (i = a; i <= b; i++) {
                if (s[i] && ++count <= max) list.push(i);
            }
        } else {
            mark = new Uint8Array(b - a + 1).fill(1);
            s = sieve();
            root = Math.floor(Math.sqrt(b));
            for (p = 2; p <= root; p++) {
                if (!s[p]) continue;
                for (j = Math.max(p * p, Math.ceil(a / p) * p); j <= b; j += p) mark[j - a] = 0;
            }
            for (i = 0; i < mark.length; i++) {
                if (mark[i] && ++count <= max) list.push(a + i);
            }
        }
        return { count: count, list: list, more: count > max };
    }

    // ---------- decimals and fractions ---------- //

    // A number typed as a fraction, 22/7, a decimal, 0.125, one whose last digits come again and
    // again in brackets, 0.1(42857), or a calculation, pi: { top, bottom } exactly of the first
    // three, { value } of a calculation, or { error: 'number' }
    function fractionOf(text, comma, deg) {
        var s = String(text).trim().replace(/[−–]/g, '-').replace(/\s+/g, ''), m, a, b, g, v;
        m = /^(-?\d+)\/(-?\d+)$/.exec(s);
        if (m) {
            a = BigInt(m[1]);
            b = BigInt(m[2]);
            if (!b) return { error: 'number' };
            g = gcdBig(a, b);
            if (b < BIG.zero) {
                a = -a;
                b = -b;
            }
            return { top: a / g, bottom: b / g };
        }
        if (comma ? /^-?\d*(,\d*)?(\(\d+\))?$/.test(s) && /\d/.test(s) : /^-?\d*(\.\d*)?(\(\d+\))?$/.test(s) && /\d/.test(s)) {
            v = fromBase(s.replace(',', '.'), 10);
            if (v) return { top: v[0], bottom: v[1] };
        }
        v = number(s, comma, deg);
        return isFinite(v) ? { value: v } : { error: 'number' };
    }

    // the continued fraction of top/bottom, [a0; a1, a2 …], by Euclid's steps, up to max terms
    function continued(top, bottom, max) {
        var out = [], q;
        while (bottom && out.length < max) {
            q = top / bottom;
            if (top < BIG.zero && q * bottom !== top) q -= BIG.one; // the whole part below it, for a number below 0
            out.push(q);
            q = top - q * bottom;
            top = bottom;
            bottom = q;
        }
        return out;
    }

    // the continued fraction of a number, as far as its digits tell: up to where a convergent is it
    function continuedOf(x, max) {
        var out = [], y = x, h = 1, h0 = 0, k = 0, k0 = 1, f, t, i;
        for (i = 0; i < max && isFinite(y); i++) {
            f = Math.floor(y);
            out.push(f);
            t = f * h + h0;
            h0 = h;
            h = t;
            t = f * k + k0;
            k0 = k;
            k = t;
            if (Math.abs(h / k - x) <= 1e-15 * Math.abs(x) || y === f) break;
            y = 1 / (y - f);
        }
        return out;
    }

    // ---------- money ---------- //

    // The rates of money are per period: i of 0.005 is 0.5% a month. (1 + i)^n, and the n
    // payments of 1, one at the end of each period, each brought back to the start, (1 – (1 + i)^–n)/i:
    // n of them at a rate of 0, and written so a rate near 0 keeps its digits
    function grown(i, n) {
        return Math.exp(n * Math.log1p(i));
    }

    function annuity(i, n) {
        return Math.abs(i) < 1e-14 ? n : -Math.expm1(-n * Math.log1p(i)) / i;
    }

    // A root of f between a and b, where f has a sign at a and the other at b: by Newton's steps,
    // the slope found by a step either way, and where a step would leave what is left between them,
    // or there is no slope, by halving it instead, which always gets there
    function safeRoot(f, a, b) {
        var fa = f(a), fb = f(b), x = (a + b) / 2, fx, h, d, next, k;
        if (fa === 0) return a;
        if (fb === 0) return b;
        for (k = 0; k < 300; k++) {
            fx = f(x);
            if (fx === 0) return x;
            if ((fx < 0) === (fa < 0)) {
                a = x;
                fa = fx;
            } else {
                b = x;
            }
            h = 1e-7 * Math.max(1e-7, Math.abs(x));
            d = (f(x + h) - f(x - h)) / (2 * h);
            next = x - fx / d;
            if (!(next > a && next < b)) next = a / 2 + b / 2; // halving, where Newton's step goes wrong
            if (Math.abs(next - x) <= 1e-15 * Math.max(1, Math.abs(x)) || next <= a || next >= b) return next;
            x = next;
        }
        return x;
    }

    // Every rate of money where f, of the rate per period, is 0, looked for from –99.99% to
    // 1000000% a period: f's sign at a step of each, then each change of it found by safeRoot.
    // f is of the logarithm of 1 + the rate, so the steps are as fine near –100% as near 0
    function rateRoots(f, steps) {
        var lo = Math.log(1e-4), hi = Math.log(1e4), du = (hi - lo) / steps, out = [], k, u, v, last, at;
        function g(u) { return f(Math.expm1(u)); }
        for (k = 0; k <= steps; k++) {
            u = lo + k * du;
            v = g(u);
            if (v === 0) out.push(Math.expm1(u));
            else if (k && isFinite(v) && isFinite(last) && last && (v < 0) !== (last < 0)) out.push(Math.expm1(safeRoot(g, at, u)));
            last = v;
            at = u;
        }
        return out;
    }

    // Money over time, as a BA II Plus or an HP 12C works it out: n payments of pmt, one each
    // period, at the end of it or with start at its start, at the rate iy, a percentage a year,
    // of py payments a year, which bring pv at the start to fv at the end. Money received is above
    // 0 and money paid below: a loan of 200000 is pv of 200000 with pmt below 0. Of n, iy, pv, pmt
    // and fv, the one that is NaN is worked out, the one empty. { find: its name, value, paid: all
    // the money paid, net: all of it received less paid, which is the interest earned, below 0 the
    // interest paid } or { error: 'one' where not one is NaN, 'py', 'rate' for a rate per period
    // not above –100%, 'n' for an n not above 0, 'none' where nothing makes them balance, as of
    // money received and none paid, and 'large' for a value too large to show }
    function tvm(t) {
        var keys = ['n', 'iy', 'pv', 'pmt', 'fv'], find = keys.filter(function (k) { return isNaN(t[k]); }),
            n = t.n, pv = t.pv, pmt = t.pmt, fv = t.fv, b = t.start ? 1 : 0, i, k, ratio, roots, v, out;
        if (find.length !== 1 || !keys.every(function (k) { return isNaN(t[k]) || isFinite(t[k]); })) return { error: 'one' };
        find = find[0];
        if (!(t.py > 0) || !isFinite(t.py)) return { error: 'py' };
        i = t.iy / 100 / t.py;
        if (find !== 'iy' && !(i > -1)) return { error: 'rate' };
        if (find !== 'n' && !(n > 0)) return { error: 'n' };
        // what is left over of all the money brought to the start, at a rate i a period: 0 where they balance
        function left(i) {
            return pv + pmt * (1 + i * b) * annuity(i, n) + fv / grown(i, n);
        }
        if (find === 'pv') v = -pmt * (1 + i * b) * annuity(i, n) - fv / grown(i, n);
        if (find === 'fv') v = -(pv + pmt * (1 + i * b) * annuity(i, n)) * grown(i, n);
        if (find === 'pmt') v = -(pv + fv / grown(i, n)) / ((1 + i * b) * annuity(i, n));
        if (find === 'n') {
            if (Math.abs(i) < 1e-14) {
                v = -(pv + fv) / pmt;
            } else {
                k = pmt * (1 + i * b) / i; // all the payments brought to the start, of an n without end
                ratio = (k - fv) / (pv + k);
                v = ratio > 0 ? Math.log(ratio) / Math.log1p(i) : NaN;
            }
            if (!(v > 0) || !isFinite(v)) return { error: 'none' };
            n = v;
        }
        if (find === 'iy') {
            roots = rateRoots(left, 4000);
            if (!roots.length) return { error: 'none' };
            i = roots.sort(function (p, q) { return Math.abs(p - 0.1 / t.py) - Math.abs(q - 0.1 / t.py); })[0]; // the one nearest 10% a year
            v = i * 100 * t.py;
        }
        if (!isFinite(v)) return { error: v === v ? 'large' : 'none' };
        out = { find: find, value: round(v) };
        out[find] = v;
        n = find === 'n' ? v : n;
        pv = find === 'pv' ? v : pv;
        pmt = find === 'pmt' ? v : pmt;
        fv = find === 'fv' ? v : fv;
        out.paid = round(-Math.min(0, pv) - Math.min(0, pmt) * n - Math.min(0, fv));
        out.net = round(pv + pmt * n + fv);
        if (!isFinite(out.paid) || !isFinite(out.net)) return { error: 'large' };
        return out;
    }

    // the cash flows of a list, from the one at the start, brought to the start at the rate r a period;
    // of the largest power of 1 + r taken out of all of them where it is below 1, so none is too large
    function flowsAt(flows, r) {
        var u = Math.log1p(r), shift = u < 0 ? (flows.length - 1) * u : 0, sum = 0, t;
        for (t = 0; t < flows.length; t++) sum += flows[t] * Math.exp(shift - t * u);
        return sum;
    }

    // The net present value of cash flows, one a period from the first at the start, at the
    // rate a percentage a period; NaN for a rate not above –100%
    function npv(rate, flows) {
        var r = rate / 100, big = 0, sum;
        if (!(r > -1) || !isFinite(r) || !flows.length) return NaN;
        sum = flows.reduce(function (s, c, t) {
            c /= grown(r, t);
            big = Math.max(big, Math.abs(c));
            return s + c;
        }, 0);
        return Math.abs(sum) <= 1e-12 * big ? 0 : round(sum); // as small as the rounding of the flows it sums: 0
    }

    // The internal rate of return of cash flows: the rate, a percentage a period, at which their
    // net present value is 0, the one nearest 10% where there are more. A cash flow that changes
    // sign more than once may have more than one, and one that never does has none.
    // { irr, others: the other rates found, changes: how many times the flows change sign }
    function irr(flows) {
        var changes = 0, last = 0, roots;
        flows.forEach(function (c) {
            if (c && last && (c < 0) !== (last < 0)) changes++;
            if (c) last = c;
        });
        if (!changes) return { irr: NaN, others: [], changes: 0 };
        roots = rateRoots(function (r) { return flowsAt(flows, r); }, 1200).map(function (r) { return round(r * 100); })
            .sort(function (p, q) { return Math.abs(p - 10) - Math.abs(q - 10); });
        return { irr: roots.length ? roots[0] : NaN, others: roots.slice(1).sort(function (p, q) { return p - q; }), changes: changes };
    }

    // How many periods the cash flows take to pay back what goes out first: where all of them so
    // far come to 0, within the period it is in as though its flow came evenly through it. NaN
    // where they never do, or nothing is paid out first
    function payback(flows) {
        var sum = 0, before, t;
        for (t = 0; t < flows.length; t++) {
            before = sum;
            sum += flows[t];
            if (before < 0 && sum >= 0) return round(t - 1 + -before / flows[t]);
        }
        return NaN;
    }

    // A loan paid back by n equal payments at the end of each period, at the rate a percentage a
    // year, of py payments a year for years: { payment, interest: all of it, n, byPayment: [number,
    // interest, principal, balance after it] for each of the first max, byYear: the same of
    // each year, more: there were more payments than max, or more years } or { error: 'loan' for one
    // not above 0, 'years', 'py', 'rate' for a rate per period not above –100%, 'whole' where years
    // times py is not a whole number of payments, 'long' for more than 100000 of them }
    function amortize(loan, rate, years, py, max) {
        var i = rate / 100 / py, n = years * py, balance = loan, interest = 0, byPayment = [], byYear = [], year = null,
            payment, k, owed, part;
        if (!(loan > 0) || !isFinite(loan)) return { error: 'loan' };
        if (!(years > 0) || !isFinite(years)) return { error: 'years' };
        if (!(py > 0) || !isFinite(py)) return { error: 'py' };
        if (!(i > -1) || !isFinite(i)) return { error: 'rate' };
        if (Math.abs(n - Math.round(n)) > 1e-9 * n || Math.round(n) < 1) return { error: 'whole' };
        n = Math.round(n);
        if (n > 100000) return { error: 'long' };
        payment = loan / annuity(i, n);
        for (k = 1; k <= n; k++) {
            owed = balance * i;
            part = k === n ? balance : payment - owed; // the last takes what is left, so it comes to 0
            balance = k === n ? 0 : balance - part;
            interest += owed;
            if (byPayment.length < max) byPayment.push([k, round(owed), round(part), Math.abs(balance) <= 1e-9 * loan ? 0 : round(balance)]);
            if (!year || year[0] !== Math.ceil(k / py - 1e-9)) {
                if (byYear.length >= max) continue;
                year = [Math.ceil(k / py - 1e-9), 0, 0, 0];
                byYear.push(year);
            }
            year[1] += owed;
            year[2] += part;
            year[3] = Math.abs(balance) <= 1e-9 * loan ? 0 : balance;
        }
        byYear = byYear.map(function (y) { return y.map(round); });
        return { payment: round(payment), interest: round(interest), n: n, byPayment: byPayment, byYear: byYear, more: n > max || byYear.length < Math.ceil(n / py - 1e-9) };
    }

    // The effective rate a year, its APY, of a nominal one, its APR, both percentages, of m periods a
    // year, and back: (1 + APR/m)^m – 1, and of m of ∞ e^APR – 1. NaN for a rate per period not
    // above –100%, or an m not above 0
    function effectiveRate(apr, m) {
        var r = apr / 100;
        if (!(m > 0) || !isFinite(r)) return NaN;
        if (m === Infinity) return round(Math.expm1(r) * 100);
        return r / m > -1 ? round(Math.expm1(m * Math.log1p(r / m)) * 100) : NaN;
    }

    function nominalRate(apy, m) {
        var r = apy / 100;
        if (!(m > 0) || !(r > -1) || !isFinite(r)) return NaN;
        return round((m === Infinity ? Math.log1p(r) : m * Math.expm1(Math.log1p(r) / m)) * 100);
    }

    // The change from a to b: { change: b – a, percent: of a, which of a cost and a price is the
    // markup, margin: the change as a percentage of b, ratio: b ÷ a }, NaN where it divides by 0
    function percentChange(a, b) {
        if (!isFinite(a) || !isFinite(b)) return { change: NaN, percent: NaN, margin: NaN, ratio: NaN };
        return { change: round(b - a), percent: a ? round((b - a) / Math.abs(a) * 100) : NaN, margin: b ? round((b - a) / Math.abs(b) * 100) : NaN, ratio: a ? round(b / a) : NaN };
    }

    // An amount of money at inflation of rate, a percentage a year, for years: { then: what it
    // costs after them, now: what it was worth before them, factor: how many times prices grow,
    // lost: the percentage of what money buys lost } or { error: 'rate' for one not above –100% }
    function inflation(amount, rate, years) {
        var r = rate / 100, f;
        if (!(r > -1) || !isFinite(r)) return { error: 'rate' };
        f = Math.exp(years * Math.log1p(r));
        return { then: round(amount * f), now: round(amount / f), factor: round(f), lost: round(-Math.expm1(-years * Math.log1p(r)) * 100) };
    }

    // Where sales cover the fixed costs and the profit wanted, of a price and a cost of each one:
    // { units, sales: what they come to, margin: what each one leaves, percent: of the price } or
    // { error: 'margin' where each one leaves nothing, so none are enough }
    function breakEven(fixed, price, cost, profit) {
        var m = price - cost, units;
        if (!(m > 0)) return { error: 'margin' };
        units = (fixed + profit) / m;
        return { units: round(units), sales: round(units * price), margin: round(m), percent: price ? round(m / price * 100) : NaN };
    }

    // Money saved at the rate, a percentage a year, of interest m times a year, ∞ for all the time,
    // for years, with add put in each period, at its end or with start at its start: { balance,
    // added: all of it put in, start as well, interest, apy, byYear: [year, put in, interest,
    // balance at its end] for each of the first max years, more } or { error: 'money' for an amount
    // below 0, 'years', 'm', 'rate' for a rate a period not above –100%, 'whole' where years times
    // m is not a whole number of periods, 'add' for adding with interest all the time, 'long' for
    // more than 100000 periods }
    function savings(start, rate, years, m, add, begin, max) {
        var r = rate / 100, byYear = [], balance = start, added = start, interest = 0, year = null, n, i, k, owed, y, b;
        if (!(start >= 0) || !(add >= 0) || !isFinite(start) || !isFinite(add)) return { error: 'money' };
        if (!(years > 0) || !isFinite(years)) return { error: 'years' };
        if (!(m > 0)) return { error: 'm' };
        if (m === Infinity) {
            if (add) return { error: 'add' };
            if (!(r > -1) || !isFinite(r)) return { error: 'rate' };
            for (k = 1; k < years + 1 - 1e-9 && byYear.length < max; k++) {
                y = Math.min(k, years);
                b = start * Math.exp(r * y);
                byYear.push([k, 0, round(b - balance), round(b)]);
                balance = b;
            }
            balance = start * Math.exp(r * years);
            return { balance: round(balance), added: round(start), interest: round(balance - start), apy: round(Math.expm1(r) * 100), byYear: byYear,
                more: byYear.length < Math.ceil(years - 1e-9) };
        }
        i = r / m;
        n = years * m;
        if (!(i > -1) || !isFinite(i)) return { error: 'rate' };
        if (Math.abs(n - Math.round(n)) > 1e-9 * n || Math.round(n) < 1) return { error: 'whole' };
        n = Math.round(n);
        if (n > 100000) return { error: 'long' };
        for (k = 1; k <= n; k++) {
            if (!year || year[0] !== Math.ceil(k / m - 1e-9)) {
                year = byYear.length < max ? [Math.ceil(k / m - 1e-9), 0, 0, 0] : [Math.ceil(k / m - 1e-9), 0, 0, 0, true];
                if (!year[4]) byYear.push(year);
            }
            if (begin) balance += add;
            owed = balance * i;
            balance += owed;
            if (!begin) balance += add;
            added += add;
            interest += owed;
            year[1] += add;
            year[2] += owed;
            year[3] = balance;
        }
        return { balance: round(balance), added: round(added), interest: round(interest), apy: round(Math.expm1(m * Math.log1p(i)) * 100),
            byYear: byYear.map(function (y) { return y.map(round); }), more: byYear.length < Math.ceil(n / m - 1e-9) };
    }

    // What an asset of a cost loses each year of its life, a whole number of years, down to what it
    // is worth at the end, salvage: by the straight line, the same each year, or with declining by
    // the double declining balance, twice the straight line's rate of what is left each year, never
    // below salvage, and the straight line over the years left once that loses more, as Excel's
    // VDB does. { first: of the first year, rate: a percentage a year, byYear: [year,
    // depreciation, all of it so far, book value] } or { error: 'cost' for one not above 0,
    // 'salvage' for one below 0 or above the cost, 'life' for one not a whole number from 1 to 1000 }
    function depreciation(cost, salvage, life, declining) {
        var book = cost, total = 0, byYear = [], k, d, straight;
        if (!(cost > 0) || !isFinite(cost)) return { error: 'cost' };
        if (!(salvage >= 0) || !(salvage <= cost)) return { error: 'salvage' };
        if (!isWhole(life) || life < 1 || life > 1000) return { error: 'life' };
        for (k = 1; k <= life; k++) {
            straight = (book - salvage) / (life - k + 1);
            d = declining ? Math.max(Math.min(book * 2 / life, book - salvage), straight) : straight;
            book = k === life ? salvage : book - d;
            total += d;
            byYear.push([k, round(d), round(total), round(book)]);
        }
        return { first: byYear[0][1], rate: round((declining ? 200 : 100) / life), byYear: byYear };
    }

    // A bond of a face value, paying coupon, a percentage of it a year, freq times a year, years
    // from its end; years need not be whole periods, as the first coupon is then nearer than a
    // period, by the part of one left: priced as on that part, the coupon earned so far its
    // accrued interest. Of price, its clean price, without the accrued interest, and yld, a
    // percentage a year of freq periods, as a BA II Plus gives them, the one that is NaN is worked
    // out. { price, yld, accrued, dirty: the price with it, current: the coupon a year as a
    // percentage of the price, duration: Macaulay's, in years, modified: of the yield a year }
    // or { error: 'one', 'face' for one not above 0, 'coupon' for one below 0, 'years' for none,
    // 'freq' for one not from 1 to 12, 'yield' for a yield a period not above –100%, 'price' for
    // one not above 0, 'long' for more than 100000 coupons }
    function bond(face, coupon, years, freq, price, yld) {
        var c, n, w, cnt, accrued, y, lo, hi, k, find = isNaN(price) ? 'price' : isNaN(yld) ? 'yld' : '', dirty, dur;
        if (!find || (find === 'price' && isNaN(yld)) || !isFinite(find === 'price' ? yld : price)) return { error: 'one' };
        if (!(face > 0) || !isFinite(face)) return { error: 'face' };
        if (!(coupon >= 0) || !isFinite(coupon)) return { error: 'coupon' };
        if (!(years > 0) || !isFinite(years)) return { error: 'years' };
        if (!isWhole(freq) || freq < 1 || freq > 12) return { error: 'freq' };
        c = face * coupon / 100 / freq;
        n = years * freq;
        cnt = Math.abs(n - Math.round(n)) <= 1e-9 * n ? Math.round(n) : Math.ceil(n);
        if (cnt > 100000) return { error: 'long' };
        w = n - (cnt - 1); // of a period, to the first coupon
        if (Math.abs(w - 1) < 1e-9) w = 1;
        accrued = c * (1 - w);
        // the price with the accrued interest, and its weighted times of payment, at y a period
        function value(y, timed) {
            var u = Math.log1p(y), sum = 0, t = 0, k, at, v;
            for (k = 0; k < cnt; k++) {
                at = k + w;
                v = (c + (k === cnt - 1 ? face : 0)) * Math.exp(-at * u);
                sum += v;
                t += v * at;
            }
            return timed ? t : sum;
        }
        if (find === 'price') {
            y = yld / 100 / freq;
            if (!(y > -1)) return { error: 'yield' };
        } else {
            if (!(price > 0)) return { error: 'price' };
            dirty = price + accrued;
            if (value(-0.9999) < dirty) return { error: 'price' }; // more than every payment comes to: a yield below –100%
            lo = -0.9999;
            hi = 1;
            while (value(hi) > dirty && hi < 1e6) hi *= 2;
            for (k = 0; k < 200 && hi - lo > 1e-15 * Math.max(1, Math.abs(hi)); k++) { // the price falls as the yield grows: halving finds it
                y = (lo + hi) / 2;
                if (value(y) > dirty) lo = y;
                else hi = y;
            }
            y = (lo + hi) / 2;
        }
        dirty = value(y);
        dur = value(y, true) / dirty / freq;
        return { price: round(dirty - accrued), yld: round(y * freq * 100), accrued: round(accrued), dirty: round(dirty),
            current: round(coupon * face / (dirty - accrued)), duration: round(dur), modified: round(dur / (1 + y)) };
    }

    // ---------- dates ---------- //

    // A date is its day: the days from 1 January 1970, as the calendar of today goes back
    // and on, from the year 1 to 9999. 1 January 1970 was a Thursday

    // the day of a year, month and day; NaN for a date there is not, 30 February
    function dayFrom(y, m, d) {
        var era, yoe, doy;
        if (!isWhole(y) || !isWhole(m) || !isWhole(d) || y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > monthDays(y, m)) return NaN;
        y -= m <= 2 ? 1 : 0;
        era = Math.floor(y / 400);
        yoe = y - era * 400;
        doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
        return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
    }

    // the year, month and day of a day
    function dateOf(day) {
        var z = day + 719468, era = Math.floor(z / 146097), doe = z - era * 146097,
            yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365),
            doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153),
            m = mp < 10 ? mp + 3 : mp - 9;
        return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m: m, d: doy - Math.floor((153 * mp + 2) / 5) + 1 };
    }

    function monthDays(y, m) {
        return m === 2 ? (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28) : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
    }

    // The day of a date as it is typed: in numbers, the year first, 2026-10-14 or 2026. 10. 14., or last,
    // 14/10/2026, 14.10.2026, the day first unless order is 'mdy', as in the US, 10/14/2026; or in words,
    // 14 Oct 2026, Oct 14, 2026 or Wednesday, 14 October 2026, a month by its English name or the start of
    // it, Sept as well. A year of two digits is not read, 14/10/26. NaN for what is not a date there is
    function readDate(text, order) {
        var t = String(text).trim().toLowerCase().replace(/,/g, ' '), m,
            names = 'january february march april may june july august september october november december'.split(' '), parts, month = 0, nums = [];
        if (/^[\d\s./-]+$/.test(t) && (m = t.match(/\d+/g)).length === 3) {
            if (m[0].length > 2) return dayFrom(+m[0], +m[1], +m[2]);
            if (m[2].length < 3) return NaN;
            return order === 'mdy' ? dayFrom(+m[2], +m[0], +m[1]) : dayFrom(+m[2], +m[1], +m[0]);
        }
        parts = t.split(/[\s.]+/).filter(Boolean);
        if (parts.some(function (p) {
            var i = p.length < 3 ? -1 : p === 'sept' ? 8 : names.findIndex(function (n) { return n.indexOf(p) === 0; });
            if (/^\d+$/.test(p)) return nums.push(p) > 2;
            if (i > -1 && /^[a-z]+$/.test(p) && !month) return !(month = i + 1);
            return !/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*$/.test(p); // a weekday is left out
        }) || !month || nums.length !== 2) return NaN;
        // the year is the one of 3 digits or more, first or last; one of 2 is no year
        if (nums[0].length > 2) return dayFrom(+nums[0], month, +nums[1]);
        return nums[1].length > 2 ? dayFrom(+nums[1], month, +nums[0]) : NaN;
    }

    // 0 for Monday to 6 for Sunday
    function weekday(day) {
        return ((day + 3) % 7 + 7) % 7;
    }

    // months on from a day, to the same day of the month, or to its last day where the month is shorter:
    // a month from 31 January is 28 or 29 February. NaN before the year 1 or after 9999
    function addMonths(day, n) {
        var c = dateOf(day), total = c.y * 12 + c.m - 1 + n, y = Math.floor(total / 12), m = total - y * 12 + 1;
        return y < 1 || y > 9999 ? NaN : dayFrom(y, m, Math.min(c.d, monthDays(y, m)));
    }

    // a day on by whole years, months and days, each below 0 to go back: the years and months first
    function addDate(day, years, months, days) {
        var to;
        if (!isWhole(years) || !isWhole(months) || !isWhole(days)) return NaN;
        to = addMonths(day, years * 12 + months) + days;
        return to >= dayFrom(1, 1, 1) && to <= dayFrom(9999, 12, 31) ? to : NaN;
    }

    // From one day to another: the days, below 0 back; and, of the two in order, the whole months
    // from the first, then the days left, so that adding them gives the second again; the weeks
    // and days; and the weekdays, Monday to Friday, both days counted
    function datesBetween(a, b) {
        var from = Math.min(a, b), to = Math.max(a, b), ca = dateOf(from), cb = dateOf(to),
            months = (cb.y - ca.y) * 12 + cb.m - ca.m, n = to - from + 1, full = Math.floor(n / 7), w = weekday(from), work = full * 5, i;
        if (addMonths(from, months) > to) months--;
        for (i = 0; i < n % 7; i++) if ((w + i) % 7 < 5) work++;
        return {
            days: b - a,
            years: Math.floor(months / 12), months: months % 12, rest: to - addMonths(from, months),
            weeks: Math.floor((to - from) / 7), weekDays: (to - from) % 7,
            workdays: work
        };
    }

    // the day of the year, 1 to 366, and the week of the year by ISO 8601: weeks start on Monday,
    // the first being the one with the year's first Thursday
    function dayOfYear(day) {
        return day - dayFrom(dateOf(day).y, 1, 1) + 1;
    }

    function isoWeek(day) {
        var thursday = day - weekday(day) + 3, y = dateOf(thursday).y;
        return { week: Math.floor((thursday - dayFrom(y, 1, 1)) / 7) + 1, year: y };
    }

    var CalcMaths = {
        number: number,
        fn: fn,
        solve: solve,
        inequality: inequality,
        poly: poly,
        linear: linear,
        system2: system2,
        extrema: extrema,
        polynomial: polynomial,
        exactRoots: exactRoots,
        exactOf: exactOf,
        taylor: taylor,
        between: between,
        arcLength: arcLength,
        tDist: tDist,
        chiDist: chiDist,
        fDist: fDist,
        tInverse: function (p, nu) { return quantile(function (t) { return tDist(t, nu); }, p); },
        chiInverse: function (p, k) { return quantile(function (x) { return chiDist(x, k); }, p, true); },
        fInverse: function (p, d1, d2) { return quantile(function (x) { return fDist(x, d1, d2); }, p, true); },
        geometric: geometric,
        hypergeometric: hypergeometric,
        exponential: exponential,
        uniform: uniform,
        meanInterval: meanInterval,
        proportionInterval: proportionInterval,
        integral: integral,
        slopes: slopes,
        series: series,
        limit: limit,
        ode: ode,
        normalBetween: normalBetween,
        normalDensity: normalDensity,
        normalInverse: normalInverse,
        binomial: function (n, p, k) {
            return counts(function (j) { return binomial(n, p, j); }, k, isWhole(n) && n >= 0 ? n : NaN, n * p);
        },
        poisson: function (lambda, k) {
            return counts(function (j) { return poisson(lambda, j); }, k, Infinity, lambda);
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
        condition: condition,
        system: system,
        factorize: factorize,
        divisorsOf: divisorsOf,
        isPrime: isPrime,
        roundTo: roundTo,
        significant: significant,
        rref: rref,
        matrixPower: matrixPower,
        lu: lu,
        qr: qr,
        vectorOf: vectorOf,
        matrixText: matrixText,
        vectors: vectors,
        cpoly: cpoly,
        cpolynomial: cpolynomial,
        fromBase: fromBase,
        toBase: toBase,
        textCodes: textCodes,
        fromCodes: fromCodes,
        modular: modular,
        chinese: chinese,
        exact: exact,
        about: about,
        primesNear: primesNear,
        primesBetween: primesBetween,
        fractionOf: fractionOf,
        continued: continued,
        continuedOf: continuedOf,
        tvm: tvm,
        npv: npv,
        irr: irr,
        payback: payback,
        amortize: amortize,
        effectiveRate: effectiveRate,
        nominalRate: nominalRate,
        percentChange: percentChange,
        inflation: inflation,
        breakEven: breakEven,
        savings: savings,
        depreciation: depreciation,
        bond: bond,
        dayFrom: dayFrom,
        dateOf: dateOf,
        readDate: readDate,
        weekday: weekday,
        addDate: addDate,
        datesBetween: datesBetween,
        dayOfYear: dayOfYear,
        isoWeek: isoWeek
    };

    root.CalcMaths = CalcMaths;
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcMaths;
})(typeof window !== 'undefined' ? window : this);
