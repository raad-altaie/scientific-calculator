// The physics of the Physics panel worked out: motion at a steady acceleration from any three of s, u, v, a and t,
// a projectile's flight, the colour code of a resistor both ways, networks of resistors, capacitors or coils in
// series and in parallel, 100 + 220 || 330, the values parts are made in, E12 and E24, a transistor's bias, the
// series of hydrogen's lines, tunnelling through a barrier and Compton's shift; with values written with the prefixes
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
        lineSeries: lineSeries, tunnel: tunnel, compton: compton, binding: binding, INERTIA: INERTIA, standing: standing
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcPhysics;
    }
})(typeof window !== 'undefined' ? window : this);
