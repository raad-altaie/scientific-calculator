// The maths of the Solve panel: equations solved for x, the roots of a polynomial and of a
// system of linear equations; integrals, slopes, sums and products; and the normal, binomial
// and Poisson distributions. And of the Numbers panel: complex numbers, whole numbers in bits
// and their bases, and matrices. Functions are read as the graph reads them, by the engine.
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
    // brackets. Each value kept to the bits, as the machine does. { value: a BigInt, wrapped:
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
            } else if ((m = /^(nand|nor|xnor|and|xor|or|not|mod|shl|shr)(?![a-z])/i.exec(s))) {
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
        var shift = level(sum, ['shl', 'shr'], function (op, a, b) {
            if (b < BigInt(0) || b >= BigInt(bits)) return op === 'shl' || a >= BigInt(0) ? BigInt(0) : BigInt(-1);
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

    // a matrix's rows reduced, as far as its first cols columns go: { m, rank }
    function reduce(a, cols) {
        var m = a.map(function (r) { return r.slice(); }), rows = m.length, rank = 0, i, j, k, p, f, big;
        big = Math.max.apply(null, m.map(function (r) { return Math.max.apply(null, r.slice(0, cols).map(Math.abs)); })) || 1;
        for (j = 0; j < cols && rank < rows; j++) {
            p = rank;
            for (i = rank + 1; i < rows; i++) if (Math.abs(m[i][j]) > Math.abs(m[p][j])) p = i;
            if (Math.abs(m[p][j]) <= 1e-12 * big) continue;
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
            rank++;
        }
        return { m: m, rank: rank };
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

    // the product of two matrices, the columns of a as many as the rows of b, or null
    function times(a, b) {
        if (a[0].length !== b.length) return null;
        return clean(a.map(function (row) {
            return b[0].map(function (x, j) { return row.reduce(function (s, v, k) { return s + v * b[k][j]; }, 0); });
        }), [a, b]);
    }

    // a matrix found, to 12 digits, a number as small as the rounding of the ones it came from
    // being 0: 2.8e-17 in an inverse is 0
    function clean(m, from) {
        var big = Math.max.apply(null, from.concat([m]).map(function (a) {
            return Math.max.apply(null, a.map(function (r) { return Math.max.apply(null, r.map(Math.abs)); }));
        }));
        return m.map(function (r) { return r.map(function (x) { return Math.abs(x) <= 1e-12 * big ? 0 : round(x); }); });
    }

    var CalcMaths = {
        number: number,
        fn: fn,
        solve: solve,
        poly: poly,
        linear: linear,
        integral: integral,
        slopes: slopes,
        series: series,
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
        det: det,
        inverse: inverse,
        rank: rank,
        transpose: transpose,
        plus: plus,
        times: times
    };

    root.CalcMaths = CalcMaths;
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcMaths;
})(typeof window !== 'undefined' ? window : this);
