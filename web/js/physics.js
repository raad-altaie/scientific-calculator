// The physics of the Physics panel worked out: motion at a steady acceleration from any three of s, u, v, a and t,
// a projectile's flight, masses over a pulley, a rocket's Δv, the colour code of a resistor both ways, networks of
// resistors, capacitors or coils in series and in parallel, 100 + 220 || 330, the values parts are made in, E12 and E24,
// a transistor's bias, the impedance of R, L and C, a diode, a rectifier's ripple, an LM317's resistors, a Wheatstone
// bridge, the gauge of a wire, orbits, an ideal gas's processes, the friction of a pipe, Stokes's law, Newton's cooling,
// the dew point, light through a slit and a round hole, the lensmaker's equation, the redshift of light, the series of
// hydrogen's lines, tunnelling through a barrier and Compton's shift; with values written with the prefixes
// of SI, 4.7k, 100n, 2M2. No page is needed, so it runs in the tests too
(function (root) {
    'use strict';

    var G0 = 9.80665, // standard gravity, m/s²
        PREFIX = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12 },
        SHOWN = [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];

    function round(x) {
        return isFinite(x) ? +x.toPrecision(12) + 0 : x;
    }

    // ---------- values ---------- //

    // A value as it is written of a part: 4.7k, 4k7 (the k for the point, as on a resistor), 100n, 2.2µ, 470R, 1M, 3.3 kΩ,
    // 10 uF; 1e3 as well. The unit after it is left out. NaN where it is none. comma: the decimal mark is a comma
    function readValue(text, comma) {
        var t = String(text).trim().replace(/[−–]/g, '-').replace(/\s+/g, ''), m;
        if (comma) t = t.replace(',', '.');
        t = t.replace(/(Ω|ohms?|F|H|V|A|W|Hz)$/i, function (unit, u, at) { return at ? '' : unit; }); // the unit, not a number alone
        if ((m = /^(-?\d+)([pnuµμmkKMGTR])(\d+)$/.exec(t))) return round(+(m[1] + '.' + m[3]) * (m[2] === 'R' ? 1 : PREFIX[m[2]])); // 4k7, 2R2
        if ((m = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)([pnuµμmkKMGTR]?)$/i.exec(t)) && !/^[pnuµμmkKMGTR]$/.test(t)) {
            return m[2] === 'R' || m[2] === 'r' || !m[2] ? +m[1] : PREFIX[m[2]] === undefined ? NaN : round(+m[1] * PREFIX[m[2]]);
        }
        return NaN;
    }

    // A value with its prefix and unit, to 4 digits: 4.7 kΩ, 100 nF, 1.5 MΩ, 0.5 Ω
    function si(x, unit) {
        var a = Math.abs(x), p = SHOWN.filter(function (s) { return a >= s[0] * 0.99995; })[0] || SHOWN[SHOWN.length - 1];
        if (!isFinite(x)) return '–';
        if (!x) return '0 ' + unit;
        return String(+(x / p[0]).toPrecision(4)).replace('-', '−') + ' ' + p[1] + unit;
    }

    // ---------- motion ---------- //

    // Motion at a steady acceleration, of any three of s, u, v, a and t, NaN where not known: s the way gone, u the speed
    // at first, v at last, a the acceleration and t the time. { list: [{ s, u, v, a, t }], one or two, or none } or
    // { error: 'few' | 'many' | 'time' }. Two where a speed is found from its square, each way it can go; only those
    // of a time of 0 or more
    function suvat(k) {
        var known = ['s', 'u', 'v', 'a', 't'].filter(function (q) { return isFinite(k[q]); }), s = k.s, u = k.u, v = k.v, a = k.a, t = k.t, out = [], d;
        if (known.length !== 3) return { error: known.length < 3 ? 'few' : 'many' };
        if (isFinite(t) && t < 0) return { error: 'time' };
        function put(x) {
            if (['s', 'u', 'v', 'a', 't'].every(function (q) { return isFinite(x[q]); }) && x.t >= -1e-12) out.push(x);
        }
        switch (['s', 'u', 'v', 'a', 't'].filter(function (q) { return known.indexOf(q) < 0; }).join('')) {
            case 'sv': put({ s: u * t + a * t * t / 2, u: u, v: u + a * t, a: a, t: t }); break;
            case 'sa': put({ s: (u + v) * t / 2, u: u, v: v, a: t ? (v - u) / t : NaN, t: t }); break;
            case 'st': put({ s: a ? (v * v - u * u) / (2 * a) : NaN, u: u, v: v, a: a, t: a ? (v - u) / a : NaN }); break;
            case 'su': put({ s: v * t - a * t * t / 2, u: v - a * t, v: v, a: a, t: t }); break;
            case 'uv': put({ s: s, u: t ? s / t - a * t / 2 : NaN, v: t ? s / t + a * t / 2 : NaN, a: a, t: t }); break;
            case 'ua': put({ s: s, u: t ? 2 * s / t - v : NaN, v: v, a: t ? 2 * (v * t - s) / (t * t) : NaN, t: t }); break;
            case 'va': put({ s: s, u: u, v: t ? 2 * s / t - u : NaN, a: t ? 2 * (s - u * t) / (t * t) : NaN, t: t }); break;
            case 'at': put({ s: s, u: u, v: v, a: s ? (v * v - u * u) / (2 * s) : NaN, t: u + v ? 2 * s / (u + v) : NaN }); break;
            case 'vt': // v² = u² + 2as: v either way, or of no acceleration s/u
                if (!a) {
                    put({ s: s, u: u, v: u, a: 0, t: u ? s / u : NaN });
                    break;
                }
                d = u * u + 2 * a * s;
                if (d < 0) break;
                [Math.sqrt(d), -Math.sqrt(d)].forEach(function (w, i) { if (!i || d) put({ s: s, u: u, v: w, a: a, t: (w - u) / a }); });
                break;
            case 'ut': // u² = v² – 2as
                if (!a) {
                    put({ s: s, u: v, v: v, a: 0, t: v ? s / v : NaN });
                    break;
                }
                d = v * v - 2 * a * s;
                if (d < 0) break;
                [Math.sqrt(d), -Math.sqrt(d)].forEach(function (w, i) { if (!i || d) put({ s: s, u: w, v: v, a: a, t: (v - w) / a }); });
                break;
        }
        return { list: out.map(function (x) { return { s: round(x.s), u: round(x.u), v: round(x.v), a: round(x.a), t: round(Math.max(0, x.t)) }; }) };
    }

    // A projectile thrown at the speed v0 at the angle a, in radians, above the ground, from the height h, under the
    // gravity g, no air: { time, range, top: the highest, rise: the time to it, speed and angle as it lands, at(x): its
    // height at x }, null where it cannot be thrown so
    function projectile(v0, a, h, g) {
        var vx = v0 * Math.cos(a), vy = v0 * Math.sin(a), time, end;
        if (!(v0 >= 0) || !(g > 0) || !isFinite(a) || !(h >= 0) || Math.abs(a) > Math.PI / 2 + 1e-12) return null;
        time = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
        if (!(time > 0)) return null;
        end = vy - g * time;
        return {
            time: round(time), range: round(vx * time), top: round(h + (vy > 0 ? vy * vy / (2 * g) : 0)), rise: round(Math.max(0, vy / g)),
            speed: round(Math.hypot(vx, end)), angle: round(Math.atan2(-end, vx)), vx: round(vx), vy: round(vy),
            at: function (x) { var t = vx ? x / vx : 0; return h + vy * t - g * t * t / 2; }
        };
    }

    // Two masses on a string over a pulley: m1 hanging, m2 on a slope at theta, radians, of friction mu, at π/2 hanging too,
    // at 0 on a table; the pulley a disc of mass mp, 0 of none. { a: above 0 as m1 falls, t1: the tension on m1's side,
    // t2: on m2's, friction, moves } or null
    function atwood(m1, m2, theta, mu, mp, g) {
        var drive, most, a = 0, friction;
        if (!(m1 > 0 && m2 > 0 && theta >= 0 && theta <= Math.PI / 2 + 1e-12 && mu >= 0 && mp >= 0 && g > 0)) return null;
        drive = (m1 - m2 * Math.sin(theta)) * g;
        most = mu * m2 * g * (theta < Math.PI / 2 ? Math.cos(theta) : 0);
        if (Math.abs(drive) > most * (1 + 1e-12)) {
            a = (drive - (drive > 0 ? most : -most)) / (m1 + m2 + mp / 2);
            friction = most;
        } else friction = Math.abs(drive); // held: friction only as much as it takes
        return { a: round(a), t1: round(m1 * (g - a)), t2: round(m1 * (g - a) - mp * a / 2), friction: round(friction), moves: a !== 0 };
    }

    // Tsiolkovsky's rocket equation: a rocket of exhaust speed ve from the mass m0, full, to mf, its fuel burnt, in t seconds if
    // t is above 0, under g. { dv, ratio: m0/mf, fuel, flow: kg/s, thrust, a0, a1: its acceleration at first and at last, of
    // the thrust alone, up: dv less what g takes of it going straight up } or null
    function rocket(ve, m0, mf, t, g) {
        var flow, thrust;
        if (!(ve > 0 && mf > 0 && m0 >= mf && isFinite(m0))) return null;
        flow = t > 0 ? (m0 - mf) / t : NaN;
        thrust = ve * flow;
        return { dv: round(ve * Math.log(m0 / mf)), ratio: round(m0 / mf), fuel: round(m0 - mf), flow: round(flow), thrust: round(thrust),
            a0: round(thrust / m0), a1: round(thrust / mf), up: round(ve * Math.log(m0 / mf) - (g > 0 ? g : G0) * t) };
    }

    // ---------- resistors ---------- //

    // The colours of a resistor's bands, with what each is: its digit, multiplier, tolerance % and temperature
    // coefficient ppm/K, null where it has none, and its colour to draw
    var COLOURS = [
        ['Black', 0, 1, null, 250, '#1d1d1d'], ['Brown', 1, 10, 1, 100, '#7a4a21'], ['Red', 2, 100, 2, 50, '#d0312d'],
        ['Orange', 3, 1e3, null, 15, '#f08a24'], ['Yellow', 4, 1e4, null, 25, '#f4d03f'], ['Green', 5, 1e5, 0.5, 20, '#2e9e4f'],
        ['Blue', 6, 1e6, 0.25, 10, '#2f6fd0'], ['Violet', 7, 1e7, 0.1, 5, '#8e44ad'], ['Grey', 8, 1e8, 0.05, 1, '#8c8c8c'],
        ['White', 9, 1e9, null, null, '#f7f7f7'], ['Gold', null, 0.1, 5, null, '#c9a227'], ['Silver', null, 0.01, 10, null, '#c0c0c0'],
        ['None', null, null, 20, null, null]
    ];

    // the colours a band may be: of its digits, its multiplier, its tolerance and its coefficient, by their place in COLOURS
    var BAND_COLOURS = {
        digit: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        mult: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        tol: [1, 2, 5, 6, 7, 8, 10, 11, 12],
        temp: [0, 1, 2, 3, 4, 5, 6, 7, 8]
    };

    // the kinds of the bands of a resistor of 4, 5 or 6 of them
    function bandKinds(n) {
        return n === 4 ? ['digit', 'digit', 'mult', 'tol'] : n === 5 ? ['digit', 'digit', 'digit', 'mult', 'tol'] : ['digit', 'digit', 'digit', 'mult', 'tol', 'temp'];
    }

    // A resistor of its bands' colours, each by its place in COLOURS: { ohms, tol, temp, min, max }
    function fromBands(bands) {
        var kinds = bandKinds(bands.length), digits = '', mult = 1, tol = 20, temp = null;
        bands.forEach(function (c, i) {
            var col = COLOURS[c];
            if (kinds[i] === 'digit') digits += col[1];
            if (kinds[i] === 'mult') mult = col[2];
            if (kinds[i] === 'tol') tol = col[3];
            if (kinds[i] === 'temp') temp = col[4];
        });
        var ohms = round(+digits * mult);
        return { ohms: ohms, tol: tol, temp: temp, min: round(ohms * (1 - tol / 100)), max: round(ohms * (1 + tol / 100)) };
    }

    // The colours of a resistor of so many ohms, of n bands, 4 or 5, its tolerance the band tol (by its place in COLOURS):
    // { bands, ohms: as the bands say it, rounded to their digits } or null for one they cannot say, below 0.1 Ω or above
    function toBands(ohms, n, tol) {
        var places = n === 4 ? 2 : 3, e, digits, bands;
        if (!(ohms > 0)) return null;
        e = Math.floor(Math.log10(ohms)) - places + 1;
        digits = Math.round(ohms / Math.pow(10, e));
        if (digits >= Math.pow(10, places)) { // rounded up to one more digit: 99.96 to 100
            digits /= 10;
            e++;
        }
        if (e < -2 || e > 9) return null;
        bands = String(digits).split('').map(Number);
        bands.push(e === -1 ? 10 : e === -2 ? 11 : e);
        bands.push(tol);
        return { bands: bands, ohms: round(digits * Math.pow(10, e)) };
    }

    // ---------- networks ---------- //

    // The value of parts in series and in parallel: 100 + 220 || 330, (1k + 2k2) || 4k7. + is in series, || (or //) in
    // parallel, and goes first, as × goes before +. kind: R and L add in series, C in parallel. { value } or { error, at }
    function network(text, kind, comma) {
        var t = String(text).replace(/\/\//g, '||').replace(/∥/g, '||'), at = 0, parts = 0, out;
        function space() { while (/\s/.test(t.charAt(at))) at++; }
        function series(a, b) { return kind === 'C' ? 1 / (1 / a + 1 / b) : a + b; }
        function parallel(a, b) { return kind === 'C' ? a + b : 1 / (1 / a + 1 / b); }
        function sum() {
            var v = product();
            for (space(); t.charAt(at) === '+'; space()) {
                at++;
                v = series(v, product());
            }
            return v;
        }
        function product() {
            var v = atom();
            for (space(); t.substr(at, 2) === '||' || t.charAt(at) === '|'; space()) {
                at += t.substr(at, 2) === '||' ? 2 : 1;
                v = parallel(v, atom());
            }
            return v;
        }
        function atom() {
            var m, v;
            space();
            if (t.charAt(at) === '(') {
                at++;
                v = sum();
                space();
                if (t.charAt(at) !== ')') throw { error: 'bracket', at: at };
                at++;
                return v;
            }
            m = /^[0-9.,]+(?:e[-+]?\d+)?[pnuµμmkKMGTR]?\d*\s*(?:Ω|ohms?|F|H)?/i.exec(t.slice(at));
            v = m ? readValue(m[0], comma) : NaN;
            if (!(v > 0)) throw { error: 'value', at: at };
            at += m[0].length;
            parts++;
            return v;
        }
        try {
            out = sum();
            space();
            if (at < t.length) throw { error: 'value', at: at };
        } catch (e) {
            return e.error ? e : { error: 'value', at: at };
        }
        return { value: round(out), parts: parts };
    }

    // ---------- electronics ---------- //

    // the values parts are made in, of each decade: E12 and E24
    var SERIES = {
        12: [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82],
        24: [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91]
    };

    // The value of the series n, 12 or 24, nearest x: way 1 the nearest at or above it, -1 at or below, 0 either.
    // 147 is 150 of E12, 147 at or below 120; NaN of no value above 0
    function standard(x, n, way) {
        var list = SERIES[n] || SERIES[12], e, near = [], best;
        if (!(x > 0) || !isFinite(x)) return NaN;
        e = Math.floor(Math.log10(x)) - 1;
        [-1, 0, 1].forEach(function (d) { // of the decade below and above too: 9.6 is 10, of the next
            list.forEach(function (v) { near.push(round(v * Math.pow(10, e + d))); });
        });
        if (way > 0) near = near.filter(function (v) { return v >= x * (1 - 1e-9); });
        if (way < 0) near = near.filter(function (v) { return v <= x * (1 + 1e-9); });
        near.forEach(function (v) { // nearest by ratio, as the series is spaced
            if (best === undefined || Math.abs(Math.log(v / x)) < Math.abs(Math.log(best / x))) best = v;
        });
        return best;
    }

    // A transistor biased by a divider: R1 from Vcc to the base, R2 from it to 0, Rc to the collector and Re from the
    // emitter, of gain beta, Vbe its base's drop, 0.7, and Vsat what is left across it switched on, 0.2. The base
    // current loads the divider. { vb, ve, vc, vce, ib, ic, region: 'active' | 'saturated' | 'off' } or null
    function bias(vcc, r1, r2, rc, re, beta, vbe, vsat) {
        var vth, rth, ib, ic, ie, ve, vc, sat, a, b, c, d, e2;
        vbe = isFinite(vbe) ? vbe : 0.7;
        vsat = isFinite(vsat) ? vsat : 0.2;
        if (!(vcc > 0 && r1 > 0 && r2 > 0 && rc >= 0 && re >= 0 && beta > 0)) return null;
        vth = vcc * r2 / (r1 + r2);
        rth = r1 * r2 / (r1 + r2);
        if (vth <= vbe) return { vb: round(vth), ve: 0, vc: round(vcc), vce: round(vcc), ib: 0, ic: 0, region: 'off' };
        ib = (vth - vbe) / (rth + (beta + 1) * re);
        ic = beta * ib;
        ie = ib + ic;
        ve = ie * re;
        vc = vcc - ic * rc;
        if (vc - ve < vsat) { // saturated: the collector as low as it goes, β no longer what sets Ic
            sat = true;
            // Ve = (Ib + Ic)Re, Vc = Vcc – IcRc, Vc – Ve = Vsat, Ib = (Vth – Vbe – Ve)/Rth: solved for Ic and Ib
            a = rc + re; // a·Ic + b·Ib = c, b·Ic + d·Ib = e2
            b = re;
            c = vcc - vsat;
            d = rth + re;
            e2 = vth - vbe;
            ic = (c * d - b * e2) / (a * d - b * b);
            ib = (e2 - b * ic) / d;
            if (ib < 0) {
                ib = 0;
                ic = c / a;
            }
            ve = (ib + ic) * re;
            vc = vcc - ic * rc;
        }
        return { vb: round(ve + vbe), ve: round(ve), vc: round(vc), vce: round(vc - ve), ib: round(ib), ic: round(ic), region: sat ? 'saturated' : 'active' };
    }

    // A resistor, a coil and a capacitor, r ohms, l henries and c farads, in series or in parallel, at f hertz; a part of 0
    // is not there. { xl, xc: their reactances, NaN of a part not there; z; phase: of the voltage ahead of the current,
    // radians, above 0 as a coil's; f0, q, bw: where it resonates, how sharply and how wide, NaN without L and C, or of
    // q and bw without R } or null
    function impedance(parallel, r, l, c, f) {
        var w = 2 * Math.PI * f, xl = l > 0 ? w * l : NaN, xc = c > 0 ? 1 / (w * c) : NaN, z, phase, g, b, f0 = NaN, q = NaN;
        if (!(f > 0) || !(r >= 0 && l >= 0 && c >= 0) || !(r > 0 || l > 0 || c > 0)) return null;
        if (parallel) { // of the admittance: each part's conductance and susceptance added
            g = r > 0 ? 1 / r : 0;
            b = (c > 0 ? 1 / xc : 0) - (l > 0 ? 1 / xl : 0);
            z = 1 / Math.hypot(g, b);
            phase = Math.atan2(-b, g);
        } else {
            b = (l > 0 ? xl : 0) - (c > 0 ? xc : 0);
            z = Math.hypot(r, b);
            phase = Math.atan2(b, r);
        }
        if (l > 0 && c > 0) {
            f0 = 1 / (2 * Math.PI * Math.sqrt(l * c));
            if (r > 0) q = parallel ? r * Math.sqrt(c / l) : Math.sqrt(l / c) / r;
        }
        return { xl: round(xl), xc: round(xc), z: round(z), phase: round(phase), f0: round(f0), q: round(q), bw: round(f0 / q) };
    }

    // A diode by Shockley's equation, I = Is(e^(V/nVt) – 1), at tc °C: of the voltage v across it, or else of the current
    // i through it. { v, i, vt: its thermal voltage, rd: its resistance to a small change } or null
    function diode(v, i, is, n, tc) {
        var vt = 1.380649e-23 * (tc + 273.15) / 1.602176634e-19, nvt = n * vt;
        if (!(is > 0 && n > 0 && tc > -273.15)) return null;
        if (isFinite(v)) i = is * Math.expm1(v / nvt);
        else if (i > -is) v = nvt * Math.log1p(i / is);
        else return null;
        if (!isFinite(i) || !isFinite(v)) return null;
        return { v: round(v), i: round(i), vt: round(vt), rd: round(nvt / (i + is)) };
    }

    // A transformer's vrms at f hertz through a bridge, or through one diode, half, each dropping vd, smoothed by c farads
    // into a load of i amperes: { peak, ripple: peak to peak, least, dc: its average, piv: the most each diode stands
    // reversed, fr: the ripple's frequency, big: the ripple too big to be worked out so }; of no c, as it comes, not smoothed.
    // null of none
    function rectifier(vrms, f, c, i, vd, half) {
        var top = vrms * Math.SQRT2, peak = top - (half ? 1 : 2) * vd, fr = half ? f : 2 * f, ripple;
        if (!(vrms > 0 && f > 0 && vd >= 0 && i >= 0 && !(c < 0)) || !(peak > 0)) return null;
        if (!(c > 0)) return { peak: round(peak), ripple: round(peak), least: 0, dc: round(peak * (half ? 1 : 2) / Math.PI), piv: round(half ? top : top - vd), fr: fr, big: false };
        ripple = i / (fr * c); // the capacitor falling at i/c till the next peak, a whole cycle of the ripple
        return { peak: round(peak), ripple: round(Math.min(peak, ripple)), least: round(Math.max(0, peak - ripple)), dc: round(Math.max(peak / 2, peak - ripple / 2)),
            piv: round(half ? 2 * top - vd : top - vd), fr: fr, big: ripple > peak / 2 };
    }

    // An LM317 regulator: 1.25 V between its OUT and ADJ, across R1, and 50 µA out of ADJ through R2 as well
    var LM317_REF = 1.25, LM317_ADJ = 50e-6;

    // its output of R1 and R2, NaN of none
    function lm317(r1, r2) {
        return r1 > 0 && r2 >= 0 ? round(LM317_REF * (1 + r2 / r1) + LM317_ADJ * r2) : NaN;
    }

    // the R2 that gives vout with R1, NaN of none
    function lm317R2(vout, r1) {
        return r1 > 0 && vout >= LM317_REF ? round((vout - LM317_REF) / (LM317_REF / r1 + LM317_ADJ)) : NaN;
    }

    // A Wheatstone bridge, R1 over R2 on its left, R3 over Rx on its right, v across its top and bottom: { out, the voltage
    // of the left middle less the right's, r, the bridge's resistance between them } or null. Balanced, out is 0
    function bridge(v, r1, r2, r3, rx) {
        if (!(r1 >= 0 && r2 >= 0 && r3 >= 0 && rx >= 0 && r1 + r2 > 0 && r3 + rx > 0 && isFinite(v))) return null;
        return { out: round(v * (r2 / (r1 + r2) - rx / (r3 + rx))), r: round(r1 * r2 / (r1 + r2) + r3 * rx / (r3 + rx)) };
    }

    // the Rx that balances it, R2 R3 / R1; NaN of none
    function bridgeRx(r1, r2, r3) {
        return r1 > 0 && r2 >= 0 && r3 >= 0 ? round(r2 * r3 / r1) : NaN;
    }

    // The diameter, mm, of a wire of American Wire Gauge n, 0.127 × 92^((36 – n)/39): typed 12, 0, 00 or 2/0 for –1,
    // down to 0000 or 4/0; NaN of none, past 40 or 4/0
    function awg(text) {
        var s = String(text).trim(), n = /^0{2,4}$/.test(s) ? 1 - s.length : /^[1-4]\/0$/.test(s) ? 1 - +s.charAt(0) : /^\d+$/.test(s) ? +s : NaN;
        return n >= -3 && n <= 40 ? round(0.127 * Math.pow(92, (36 - n) / 39)) : NaN;
    }

    // the gauge nearest a diameter in mm, as it is written: 12, 0, 2/0 …; '' outside 4/0 to 40
    function awgOf(d) {
        var n = Math.round(36 - 39 * Math.log(d / 0.127) / Math.log(92));
        return d > 0 && n >= -3 && n <= 40 ? n < 0 ? 1 - n + '/0' : String(n) : '';
    }

    // ---------- orbits ---------- //

    // An orbit round a body of gm, G times its mass, its nearest rp and farthest ra from the body's middle, m: { a: half its
    // longest width, e, t: its period, by Kepler's third law, vp, va: its speed nearest and farthest, by vis-viva } or null
    function orbit(gm, rp, ra) {
        var lo = Math.min(rp, ra), hi = Math.max(rp, ra), a = (lo + hi) / 2;
        if (!(gm > 0 && lo > 0 && isFinite(hi))) return null;
        return { a: round(a), e: round((hi - lo) / (hi + lo)), t: round(2 * Math.PI * Math.sqrt(a * a * a / gm)),
            vp: round(Math.sqrt(gm * (2 / lo - 1 / a))), va: round(Math.sqrt(gm * (2 / hi - 1 / a))) };
    }

    // Kepler's third law the other way: the size a of an orbit round a body of gm that takes t seconds
    function orbitSize(gm, t) {
        return gm > 0 && t > 0 ? round(Math.cbrt(gm * t * t / (4 * Math.PI * Math.PI))) : NaN;
    }

    // ---------- gases and fluids ---------- //

    var R_GAS = 8.314462618;

    // An ideal gas from p1, v1 and t1, Pa, m³ and K, by a process: 0 isothermal, to the volume x; 1 isobaric, to the volume
    // x; 2 isochoric, to the temperature x; 3 adiabatic, to the volume x. gamma: Cp/Cv. { p, v, t: after; n: moles; w: the
    // work the gas does; q: the heat put in; du: the change in its energy } or null
    function gasProcess(kind, gamma, p1, v1, t1, x) {
        var n = p1 * v1 / (R_GAS * t1), cv = R_GAS / (gamma - 1), p, v, t, w, du, q;
        if (!(p1 > 0 && v1 > 0 && t1 > 0 && x > 0 && gamma > 1)) return null;
        if (kind === 2) {
            v = v1;
            t = x;
            p = p1 * t / t1;
            w = 0;
        } else {
            v = x;
            t = kind === 0 ? t1 : kind === 1 ? t1 * v / v1 : t1 * Math.pow(v1 / v, gamma - 1);
            p = kind === 1 ? p1 : kind === 0 ? p1 * v1 / v : p1 * Math.pow(v1 / v, gamma);
            w = kind === 0 ? n * R_GAS * t1 * Math.log(v / v1) : kind === 1 ? p1 * (v - v1) : (p1 * v1 - p * v) / (gamma - 1);
        }
        du = kind === 3 ? -w : n * cv * (t - t1);
        q = kind === 3 ? 0 : du + w;
        return { p: round(p), v: round(v), t: round(t), n: round(n), w: round(w), q: round(q), du: round(du) };
    }

    // The Darcy friction factor of a flow of Reynolds number re in a pipe of relative roughness k, ε/d: 64/Re where it is
    // laminar, below 2300, else by Colebrook's equation, from Swamee and Jain's rough one, worked till it settles. NaN of none
    function friction(re, k) {
        var x, last, i;
        if (!(re > 0 && k >= 0)) return NaN;
        if (re < 2300) return round(64 / re);
        x = -2 * Math.log10(k / 3.7 + 5.74 / Math.pow(re, 0.9)); // 1/√f
        for (i = 0; i < 100 && x !== last; i++) {
            last = x;
            x = -2 * Math.log10(k / 3.7 + 2.51 * x / re);
        }
        return round(1 / (x * x));
    }

    // A ball of radius r and density rs falling through a fluid of density rf and viscosity mu, slowly, by Stokes's law:
    // { v, its last speed, below 0 rising; re, its Reynolds number, of its width; tau, the time to come to 63% of v } or null
    function stokes(r, rs, rf, mu, g) {
        var v;
        if (!(r > 0 && rs > 0 && rf >= 0 && mu > 0 && g > 0)) return null;
        v = 2 * (rs - rf) * g * r * r / (9 * mu);
        return { v: round(v), re: round(rf * Math.abs(v) * 2 * r / mu), tau: round(2 * rs * r * r / (9 * mu)) };
    }

    // ---------- heat ---------- //

    // Newton's law of cooling: from t0 in air at ta, k a minute, its temperature after t minutes
    function cooling(t0, ta, k, t) {
        return round(ta + (t0 - ta) * Math.exp(-k * t));
    }

    // the minutes it takes to come to temp; NaN where it never does, temp not between t0 and ta
    function coolingTime(t0, ta, k, temp) {
        var part = (temp - ta) / (t0 - ta);
        return k > 0 && part > 0 && part <= 1 ? round(-Math.log(part) / k) : NaN;
    }

    // k of a reading, temp1 after t1 minutes; NaN where none fits, temp1 not between t0 and ta
    function coolingRate(t0, ta, t1, temp1) {
        var part = (temp1 - ta) / (t0 - ta);
        return t1 > 0 && part > 0 && part < 1 ? round(-Math.log(part) / t1) : NaN;
    }

    // the air's water by Magnus's formula, of Alduchov and Eskridge: from –45 °C to 60 °C within some 0.4%
    var MAGNUS_B = 17.625, MAGNUS_C = 243.04;

    // the pressure of water vapour that fills air at t °C, hPa
    function vapour(t) {
        return round(6.1094 * Math.exp(MAGNUS_B * t / (MAGNUS_C + t)));
    }

    // the dew point, °C, of air at t °C and rh % humidity; NaN of none
    function dewPoint(t, rh) {
        var y = Math.log(rh / 100) + MAGNUS_B * t / (MAGNUS_C + t);
        return rh > 0 && rh <= 100 && t > -MAGNUS_C ? round(MAGNUS_C * y / (MAGNUS_B - y)) : NaN;
    }

    // the humidity, %, of air at t °C of dew point td; NaN of none, td above t
    function humidity(t, td) {
        return td <= t && td > -MAGNUS_C && t > -MAGNUS_C ? round(100 * Math.exp(MAGNUS_B * td / (MAGNUS_C + td) - MAGNUS_B * t / (MAGNUS_C + t))) : NaN;
    }

    // ---------- light ---------- //

    // the Bessel function J1(x), of its integral (1/π)∫ cos(τ – x sin τ) dτ from 0 to π, by Simpson's rule
    function besselJ1(x) {
        var n = 400, h = Math.PI / n, s = 0, i;
        for (i = 0; i <= n; i++) s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * Math.cos(i * h - x * Math.sin(i * h));
        return s * h / 3 / Math.PI;
    }

    // the light through a round hole at x = πD sin θ / λ from its middle, a part of that at the middle: Airy's pattern
    function airy(x) {
        var j;
        if (Math.abs(x) < 1e-8) return 1;
        j = 2 * besselJ1(x) / x;
        return j * j;
    }

    // the light through a slit at x = πa sin θ / λ from its middle, a part of that at the middle
    function slit(x) {
        return Math.abs(x) < 1e-8 ? 1 : Math.pow(Math.sin(x) / x, 2);
    }

    // The focal length of a thin lens of index n in a medium of index nm, by the lensmaker's equation: r1 and r2 the
    // radii of its faces, the first the light meets, above 0 where its centre is past the face; Infinity of a flat one.
    // Infinity where it has no power, NaN of none
    function lensmaker(n, r1, r2, nm) {
        var p = (n / nm - 1) * (1 / r1 - 1 / r2);
        if (!(n > 0 && nm > 0 && r1 && r2)) return NaN;
        return p ? round(1 / p) : Infinity;
    }

    // light of a source going away at beta, a part of c, below 0 coming: its wavelength after, a part of before, by
    // relativity; NaN of none
    function redshift(beta) {
        return Math.abs(beta) < 1 ? round(Math.sqrt((1 + beta) / (1 - beta))) : NaN;
    }

    // ---------- modern ---------- //

    // the name of the series of the lines of hydrogen that end on the level n
    function lineSeries(n) {
        return ['Lyman', 'Balmer', 'Paschen', 'Brackett', 'Pfund', 'Humphreys'][n - 1] || '';
    }

    var HBAR = 6.62607015e-34 / (2 * Math.PI), EV = 1.602176634e-19;

    // The chance a particle of mass m, kg, and energy e, eV, goes through a barrier of height v, eV, and width w, m,
    // worked out in full, below the barrier, at it and above it: { t, kappa: how fast the wave dies inside it, 1/m,
    // rough: e^(–2κw), the rough one of a wide barrier }, or null
    function tunnel(m, e, v, w) {
        var E = e * EV, V = v * EV, k, s;
        if (!(m > 0 && e > 0 && v >= 0 && w >= 0)) return null;
        if (Math.abs(E - V) < 1e-12 * V) return { t: round(1 / (1 + m * w * w * V / (2 * HBAR * HBAR))), kappa: 0, rough: NaN };
        if (E < V) {
            k = Math.sqrt(2 * m * (V - E)) / HBAR;
            s = Math.sinh(k * w);
            return { t: round(isFinite(s) ? 1 / (1 + V * V * s * s / (4 * E * (V - E))) : 0), kappa: round(k), rough: round(Math.exp(-2 * k * w)) };
        }
        k = Math.sqrt(2 * m * (E - V)) / HBAR;
        s = Math.sin(k * w);
        return { t: round(1 / (1 + V * V * s * s / (4 * E * (E - V)))), kappa: 0, rough: NaN };
    }

    // A photon of wavelength l, m, scattered off an electron at the angle a, radians: its wavelength after, m, by
    // Compton's shift (h/mc)(1 – cos a)
    function compton(l, a) {
        return l > 0 && isFinite(a) ? round(l + 2.42631023538e-12 * (1 - Math.cos(a))) : NaN;
    }

    // The binding energy of a nucleus of Z protons and A nucleons, of the mass of its atom in u, electrons and all:
    // { defect, u; mev; each, MeV a nucleon }, or null. Of hydrogen-1's atom and the neutron, so the electrons cancel
    function binding(z, a, mass) {
        var defect;
        if (!(z >= 1 && a >= z && z % 1 === 0 && a % 1 === 0 && mass > 0)) return null;
        defect = z * 1.00782503223 + (a - z) * 1.00866491606 - mass;
        return { defect: round(defect), mev: round(defect * 931.49410372), each: round(defect * 931.49410372 / a) };
    }

    // ---------- rotation and waves ---------- //

    // the moment of inertia of a shape, a fraction of mr² (of a rod, of its length): a rod about its middle and its end,
    // a disc or solid cylinder, a ring or hoop, a solid ball and a hollow one
    var INERTIA = [1 / 12, 1 / 3, 1 / 2, 1, 2 / 5, 2 / 3];

    // The n-th mode of a standing wave of length l and speed v: of a string or an open pipe nv/2l, of a pipe closed at one end
    // only the odd ones, (2n – 1)v/4l. { f, l: its wavelength, h: which harmonic it is, nodes, antinodes } or null
    function standing(kind, l, v, n) {
        var h, closed = kind === 2;
        if (!(l > 0 && v > 0 && n >= 1 && n % 1 === 0)) return null;
        h = closed ? 2 * n - 1 : n;
        return { f: round(h * v / (closed ? 4 * l : 2 * l)), l: round((closed ? 4 : 2) * l / h), h: h,
            nodes: kind === 0 ? n + 1 : n, antinodes: kind === 1 ? n + 1 : n };
    }

    root.CalcPhysics = {
        g: G0, readValue: readValue, si: si, suvat: suvat, projectile: projectile, COLOURS: COLOURS, BAND_COLOURS: BAND_COLOURS,
        bandKinds: bandKinds, fromBands: fromBands, toBands: toBands, network: network, SERIES: SERIES, standard: standard, bias: bias,
        impedance: impedance, diode: diode, rectifier: rectifier, orbit: orbit, orbitSize: orbitSize, gasProcess: gasProcess, friction: friction,
        atwood: atwood, rocket: rocket, lm317: lm317, lm317R2: lm317R2, cooling: cooling, coolingTime: coolingTime, coolingRate: coolingRate,
        besselJ1: besselJ1, airy: airy, slit: slit, lineSeries: lineSeries, tunnel: tunnel, compton: compton, binding: binding, INERTIA: INERTIA, standing: standing,
        bridge: bridge, bridgeRx: bridgeRx, awg: awg, awgOf: awgOf, stokes: stokes, vapour: vapour, dewPoint: dewPoint, humidity: humidity, lensmaker: lensmaker, redshift: redshift
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcPhysics;
    }
})(typeof window !== 'undefined' ? window : this);
