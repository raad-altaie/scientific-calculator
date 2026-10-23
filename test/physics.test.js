// Run with: node test/physics.test.js
// The physics of physics.js: values written with prefixes, motion at a steady acceleration, projectiles,
// the resistor colour code both ways, networks in series and parallel, the values of E12 and E24, a transistor's
// bias, the series of hydrogen's lines, tunnelling, Compton's shift, binding energy, moments of inertia and standing waves;
// impedance, diodes, rectifiers, orbits, an ideal gas's processes and the friction of a pipe; masses over a pulley,
// rockets, the LM317, cooling, and light through a slit and a round hole; a Wheatstone bridge, the gauge of a wire,
// Stokes' law, the dew point, the lensmaker's equation and the redshift of light; the standard atmosphere and the speed of sound;
// SMD codes, filters and decibels
'use strict';

var P = require('../js/physics.js'),
    failures = 0,
    checks = 0,
    N = NaN;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

function near(a, b, tol) {
    return Math.abs(a - b) <= (tol || 1e-9) * Math.max(1, Math.abs(b));
}

// values as a part's are written
[['4.7k', 4700], ['4k7', 4700], ['100n', 1e-7], ['2.2µ', 2.2e-6], ['2.2u', 2.2e-6], ['470R', 470], ['2R2', 2.2], ['1M', 1e6], ['3.3 kΩ', 3300],
    ['10 uF', 1e-5], ['1e3', 1000], ['0.5', 0.5], ['-3', -3]].forEach(function (c) {
    check(P.readValue(c[0]) === c[1], 'readValue: ' + c[0], P.readValue(c[0]));
});
check(isNaN(P.readValue('abc')) && isNaN(P.readValue('')) && isNaN(P.readValue('k')) && P.readValue('4,7k', true) === 4700, 'readValue: none of no number; a decimal comma');
check(P.si(4700, 'Ω') === '4.7 kΩ' && P.si(1e-7, 'F') === '100 nF' && P.si(0.5, 'Ω') === '500 mΩ' && P.si(999.96, 'Ω') === '1 kΩ' && P.si(0, 'V') === '0 V' &&
    P.si(-0.0025, 'A') === '−2.5 mA', 'si: a prefix to 4 digits');

// steady acceleration, of each two unknown
(function () {
    var one = function (k) { var r = P.suvat(k); return r.list && r.list.length === 1 ? r.list[0] : r; };
    check(JSON.stringify(one({ s: N, u: 0, v: N, a: 9.8, t: 2 })) === '{"s":19.6,"u":0,"v":19.6,"a":9.8,"t":2}', 'suvat: s and v');
    check(JSON.stringify(one({ s: 100, u: 0, v: 20, a: N, t: N })) === '{"s":100,"u":0,"v":20,"a":2,"t":10}', 'suvat: a and t');
    check(JSON.stringify(one({ s: 100, u: N, v: N, a: 2, t: 5 })) === '{"s":100,"u":15,"v":25,"a":2,"t":5}', 'suvat: u and v');
    check(JSON.stringify(one({ s: N, u: 10, v: 30, a: 4, t: N })) === '{"s":100,"u":10,"v":30,"a":4,"t":5}', 'suvat: s and t');
    check(JSON.stringify(one({ s: N, u: 10, v: 30, a: N, t: 5 })) === '{"s":100,"u":10,"v":30,"a":4,"t":5}', 'suvat: s and a');
    check(JSON.stringify(one({ s: N, u: N, v: 30, a: 4, t: 5 })) === '{"s":100,"u":10,"v":30,"a":4,"t":5}', 'suvat: s and u');
    check(JSON.stringify(one({ s: 100, u: N, v: 30, a: N, t: 5 })) === '{"s":100,"u":10,"v":30,"a":4,"t":5}', 'suvat: u and a');
    check(JSON.stringify(one({ s: 100, u: 10, v: N, a: N, t: 5 })) === '{"s":100,"u":10,"v":30,"a":4,"t":5}', 'suvat: v and a');
    var two = P.suvat({ s: 10, u: 20, v: N, a: -9.8, t: N }).list;
    check(two.length === 2 && near(two[0].v, Math.sqrt(204)) && near(two[1].v, -Math.sqrt(204)) && two[0].t < two[1].t, 'suvat: v and t, going up and coming back', JSON.stringify(two));
    check(P.suvat({ s: 30, u: 20, v: N, a: -9.8, t: N }).list.length === 0, 'suvat: none of a height it never reaches');
    two = P.suvat({ s: 50, u: N, v: 30, a: 4, t: N }).list;
    check(two.length === 2 && near(two[0].u, Math.sqrt(500)) && near(two[1].u, -Math.sqrt(500)), 'suvat: u and t, either way');
    check(JSON.stringify(one({ s: 20, u: 4, v: N, a: 0, t: N })) === '{"s":20,"u":4,"v":4,"a":0,"t":5}', 'suvat: of no acceleration');
    check(P.suvat({ s: 1, u: N, v: N, a: N, t: 2 }).error === 'few' && P.suvat({ s: 1, u: 2, v: 3, a: 4, t: N }).error === 'many' &&
        P.suvat({ s: 1, u: 2, v: N, a: N, t: -1 }).error === 'time', 'suvat: three of the five, a time of 0 or more');
})();

// projectiles
(function () {
    var p = P.projectile(20, Math.PI / 4, 0, 9.80665), q = P.projectile(10, 0, 20, 9.81);
    check(near(p.time, 2.884192996, 1e-8) && near(p.range, 40.78864852, 1e-8) && near(p.top, 10.19716213, 1e-8) && near(p.speed, 20) && near(p.angle, Math.PI / 4, 1e-9) &&
        near(p.at(p.range / 2), p.top, 1e-9), 'projectile: from the ground at 45°');
    check(near(q.time, Math.sqrt(40 / 9.81)) && near(q.range, 10 * Math.sqrt(40 / 9.81)) && q.top === 20 && q.rise === 0, 'projectile: thrown level from a height');
    check(P.projectile(10, 0, 0, 9.8) === null && P.projectile(-1, 0.5, 0, 9.8) === null && P.projectile(10, 0.5, -1, 9.8) === null && P.projectile(10, 0.5, 0, 0) === null,
        'projectile: none that never flies, or of a speed, height or g below 0');
})();

// the colour code: yellow violet red gold is 4.7 kΩ ± 5%
(function () {
    var r = P.fromBands([4, 7, 2, 10]);
    check(r.ohms === 4700 && r.tol === 5 && r.min === 4465 && r.max === 4935 && r.temp === null, 'fromBands: 4 bands', JSON.stringify(r));
    check(P.fromBands([1, 0, 0, 2, 1]).ohms === 10000 && P.fromBands([1, 0, 0, 2, 1]).tol === 1 && P.fromBands([2, 2, 0, 1, 1, 1]).temp === 100 &&
        P.fromBands([4, 7, 11, 12]).ohms === 0.47 && P.fromBands([4, 7, 11, 12]).tol === 20, 'fromBands: 5 and 6 bands, silver, none');
    check(P.toBands(4700, 4, 10).bands.join() === '4,7,2,10' && P.toBands(0.47, 4, 10).bands.join() === '4,7,11,10' && P.toBands(1234, 5, 1).ohms === 1230 &&
        P.toBands(999.6, 4, 10).bands.join() === '1,0,2,10' && P.toBands(0.01, 4, 10) === null && P.toBands(1e12, 4, 10) === null, 'toBands: rounded to its digits; none it cannot say');
    [[4, 7, 2, 10], [1, 0, 3, 6], [2, 2, 1, 1], [9, 9, 9, 11]].forEach(function (b) {
        check(P.toBands(P.fromBands(b).ohms, 4, b[3]).bands.join() === b.join(), 'toBands: back to the colours of ' + b.join());
    });
    check(P.bandKinds(4).join() === 'digit,digit,mult,tol' && P.bandKinds(6).join() === 'digit,digit,digit,mult,tol,temp', 'bandKinds');
})();

// networks: || goes first, capacitors the other way
(function () {
    check(P.network('100 + 220 || 330', 'R').value === 232 && P.network('100 + 220 || 330', 'R').parts === 3, 'network: || before +');
    check(near(P.network('(1k + 2k2) || 4k7', 'R').value, 3200 * 4700 / 7900) && near(P.network('100 || 100 || 100', 'R').value, 100 / 3), 'network: brackets, three in parallel');
    check(P.network('10u + 10u', 'C').value === 5e-6 && P.network('10u || 10u', 'C').value === 2e-5 && P.network('1m + 2m', 'L').value === 3e-3, 'network: capacitors and coils');
    check(P.network('1k//1k', 'R').value === 500 && P.network('100 | 100', 'R').value === 50, 'network: // and | for ||');
    check(P.network('100 +', 'R').error === 'value' && P.network('(100', 'R').error === 'bracket' && P.network('0 + 1', 'R').error === 'value' && P.network('abc', 'R').error === 'value',
        'network: what is none');
})();

// the values parts are made in: the nearest, at or above, at or below, across a decade
(function () {
    check(P.standard(147, 12, 0) === 150 && P.standard(147, 12, 1) === 150 && P.standard(147, 12, -1) === 120, 'standard: 147 of E12');
    check(P.standard(9.6, 12, 0) === 10 && P.standard(150, 12, 1) === 150 && P.standard(150, 12, -1) === 150, 'standard: into the next decade, and a value of the series itself');
    check(P.standard(4650, 24, 0) === 4700 && P.standard(4650, 24, -1) === 4300 && P.standard(0.0347, 12, 1) === 0.039 && P.standard(1e6, 12, 0) === 1e6, 'standard: E24, small and large');
    check(isNaN(P.standard(0, 12, 0)) && isNaN(P.standard(-5, 12, 0)) && isNaN(P.standard(NaN, 12, 0)), 'standard: none of no value above 0');
})();

// a transistor biased by a divider: active, saturated and off
(function () {
    var r = P.bias(12, 47e3, 10e3, 2.2e3, 470, 100), vth = 12 * 10 / 57, rth = 47e3 * 10e3 / 57e3, ib = (vth - 0.7) / (rth + 101 * 470);
    check(r.region === 'active' && near(r.ib, ib) && near(r.ic, 100 * ib) && near(r.ve, 101 * ib * 470) && near(r.vc, 12 - 100 * ib * 2200) && near(r.vce, r.vc - r.ve), 'bias: active', JSON.stringify(r));
    r = P.bias(12, 10e3, 10e3, 10e3, 100, 100);
    check(r.region === 'saturated' && near(r.vce, 0.2) && near(6 - r.ib * 5000 - 0.7 - r.ve, 0, 1e-9), 'bias: saturated, VCE at 0.2 and the base loop met', JSON.stringify(r));
    r = P.bias(12, 100e3, 5e3, 2.2e3, 470, 100);
    check(r.region === 'off' && r.ic === 0 && r.vce === 12, 'bias: off, VB below 0.7', JSON.stringify(r));
    check(P.bias(12, 0, 10e3, 1e3, 0, 100) === null && P.bias(12, 47e3, 10e3, 1e3, 0, 0) === null, 'bias: none of a part not above 0');
})();

check(P.lineSeries(1) === 'Lyman' && P.lineSeries(2) === 'Balmer' && P.lineSeries(6) === 'Humphreys' && P.lineSeries(7) === '', 'lineSeries');

// tunnelling: below the barrier as the wide barrier's rough rule, at it, and above it, where it can go through in full
(function () {
    var me = 9.1093837139e-31, hbar = 6.62607015e-34 / (2 * Math.PI), ev = 1.602176634e-19, r = P.tunnel(me, 1, 5, 5e-10), k = Math.sqrt(2 * me * 4 * ev) / hbar, w;
    check(near(r.kappa, k, 1e-9) && near(r.rough, Math.exp(-2 * k * 5e-10), 1e-9) && near(r.t, 1 / (1 + 25 * Math.pow(Math.sinh(k * 5e-10), 2) / 16), 1e-9), 'tunnel: below the barrier', JSON.stringify(r));
    check(near(r.t, 16 * 1 * 4 / 25 * r.rough, 0.01), 'tunnel: a wide barrier as 16E(V – E)/V² e^(–2κL)', r.t);
    check(r.t > 0 && P.tunnel(me, 1, 5, 1e-9).t < r.t && P.tunnel(me, 2, 5, 5e-10).t > r.t, 'tunnel: less through a wider barrier, more of more energy');
    check(near(P.tunnel(me, 5, 5, 5e-10).t, 1 / (1 + me * 25e-20 * 5 * ev / (2 * hbar * hbar)), 1e-9), 'tunnel: at the barrier\'s height');
    w = Math.PI * hbar / Math.sqrt(2 * me * 1 * ev); // above it by 1 eV, a whole half wave across: all through
    check(near(P.tunnel(me, 6, 5, w).t, 1, 1e-9) && P.tunnel(me, 6, 5, w / 2).t < 1 && P.tunnel(me, 1, 0, 1e-9).t === 1, 'tunnel: above it, all through at a resonance, and no barrier');
    check(P.tunnel(me, 0, 5, 1e-9) === null && P.tunnel(0, 1, 5, 1e-9) === null && P.tunnel(me, 1, 1e6, 1).t === 0, 'tunnel: none of no energy or mass; 0 of a barrier too wide to work out');
})();

// Compton's shift: none straight on, the Compton wavelength at a right angle, twice it straight back
check(P.compton(71e-12, 0) === 71e-12 && near(P.compton(71e-12, Math.PI / 2), 71e-12 + 2.42631023538e-12, 1e-12) && near(P.compton(71e-12, Math.PI), 71e-12 + 2 * 2.42631023538e-12, 1e-12) &&
    isNaN(P.compton(0, 1)), 'compton');

// binding energy: helium-4 some 28.3 MeV, iron-56 near the most of each nucleon, and none of a nucleus not made
(function () {
    var he = P.binding(2, 4, 4.00260325413), fe = P.binding(26, 56, 55.93493633);
    check(near(he.mev, 28.2957, 1e-4) && near(he.each, 7.0739, 1e-4) && near(he.defect, 0.0303771, 1e-4), 'binding: helium-4', JSON.stringify(he));
    check(near(fe.each, 8.7903, 1e-4) && fe.each > he.each, 'binding: iron-56, 8.79 MeV a nucleon', JSON.stringify(fe));
    check(P.binding(1, 1, 1.00782503223).mev === 0 && P.binding(0, 4, 4) === null && P.binding(3, 2, 2) === null && P.binding(2, 4.5, 4) === null, 'binding: hydrogen-1 0, and none of no nucleus');
})();

// moments of inertia, as a fraction of mr²; standing waves of a string, an open pipe and a closed one
check(P.INERTIA[0] === 1 / 12 && P.INERTIA[2] === 0.5 && P.INERTIA[3] === 1 && P.INERTIA[4] === 0.4, 'INERTIA');
(function () {
    var s = P.standing(0, 0.65, 286, 1), o = P.standing(1, 1, 343, 2), c = P.standing(2, 1, 340, 2);
    check(near(s.f, 220) && near(s.l, 1.3) && s.h === 1 && s.nodes === 2 && s.antinodes === 1, 'standing: a string, its first', JSON.stringify(s));
    check(near(o.f, 343) && near(o.l, 1) && o.h === 2 && o.nodes === 2 && o.antinodes === 3, 'standing: an open pipe, its second', JSON.stringify(o));
    check(near(c.f, 255) && near(c.l, 4 / 3) && c.h === 3 && c.nodes === 2 && c.antinodes === 2, 'standing: a closed pipe, its second the third harmonic', JSON.stringify(c));
    check(P.standing(0, 0, 1, 1) === null && P.standing(1, 1, 343, 1.5) === null && P.standing(2, 1, 343, 0) === null, 'standing: none of no length or a mode not whole');
})();

// impedance: 100 Ω, 10 mH and 1 µF at 1 kHz, in series capacitive and in parallel inductive; LC alone at resonance
(function () {
    var s = P.impedance(false, 100, 0.01, 1e-6, 1000), p = P.impedance(true, 100, 0.01, 1e-6, 1000), f0 = 1 / (2 * Math.PI * 1e-4);
    check(near(s.xl, 20 * Math.PI) && near(s.xc, 500 / Math.PI) && near(s.z, Math.hypot(100, 20 * Math.PI - 500 / Math.PI)) && s.phase < 0 && near(s.f0, f0) && near(s.q, 1) && near(s.bw, f0),
        'impedance: in series', JSON.stringify(s));
    check(near(p.z, 1 / Math.hypot(0.01, 1e-6 * 2000 * Math.PI - 1 / (20 * Math.PI))) && p.phase > 0 && near(p.q, 1), 'impedance: in parallel', JSON.stringify(p));
    check(P.impedance(false, 0, 0.01, 1e-6, f0).z < 1e-9 && P.impedance(true, 0, 0.01, 1e-6, f0).z > 1e9 && isNaN(P.impedance(false, 0, 0.01, 1e-6, f0).q),
        'impedance: LC at resonance, a short in series, open in parallel, no Q without R');
    check(P.impedance(false, 1000, 0, 0, 50).z === 1000 && P.impedance(false, 1000, 0, 0, 50).phase === 0 && isNaN(P.impedance(false, 1000, 0, 0, 50).f0) &&
        P.impedance(false, 0, 0, 0, 50) === null && P.impedance(false, 100, 0, 0, 0) === null && P.impedance(false, -1, 0, 0, 50) === null, 'impedance: a resistor alone; none of nothing, no f or a part below 0');
})();

// a diode: 10 mA of Is 1e-14 at 25 °C some 0.71 V, and back; reversed, -Is
(function () {
    var vt = 1.380649e-23 * 298.15 / 1.602176634e-19, d = P.diode(NaN, 0.01, 1e-14, 1, 25), back = P.diode(d.v, NaN, 1e-14, 1, 25);
    check(near(d.vt, vt) && near(d.v, vt * Math.log1p(1e12), 1e-12) && near(d.rd, vt / (0.01 + 1e-14)) && near(back.i, 0.01, 1e-9), 'diode: of a current and of its voltage', JSON.stringify(d));
    check(near(P.diode(-5, NaN, 1e-14, 1, 25).i, -1e-14) && P.diode(NaN, -1, 1e-14, 1, 25) === null && P.diode(0.7, NaN, 0, 1, 25) === null && P.diode(50, NaN, 1e-14, 1, 25) === null,
        'diode: reversed it leaks Is; none of a current below -Is, no Is, or one too big');
})();

// a rectifier: 12 V RMS through a bridge, 2200 µF, 0.5 A; through one diode, twice the ripple; not smoothed, its average
(function () {
    var b = P.rectifier(12, 50, 2200e-6, 0.5, 0.7, false), h = P.rectifier(12, 50, 2200e-6, 0.5, 0.7, true), raw = P.rectifier(12, 50, NaN, 0, 0, false);
    check(near(b.peak, 12 * Math.SQRT2 - 1.4) && near(b.ripple, 0.5 / (100 * 2200e-6)) && near(b.least, b.peak - b.ripple) && near(b.dc, b.peak - b.ripple / 2) &&
        near(b.piv, 12 * Math.SQRT2 - 0.7) && b.fr === 100 && !b.big, 'rectifier: a bridge', JSON.stringify(b));
    check(near(h.peak, 12 * Math.SQRT2 - 0.7) && near(h.ripple, 2 * b.ripple) && near(h.piv, 24 * Math.SQRT2 - 0.7) && h.fr === 50, 'rectifier: one diode', JSON.stringify(h));
    check(near(raw.dc, 24 * Math.SQRT2 / Math.PI) && raw.least === 0 && P.rectifier(12, 50, 10e-6, 1, 0.7, false).big && P.rectifier(0.5, 50, NaN, 0, 0.7, false) === null,
        'rectifier: not smoothed; a ripple too big; none below the diodes\' drop');
})();

// orbits: the ISS some 92.4 minutes, geostationary 42164 km, and an ellipse from 200 km to geostationary's height
(function () {
    var gm = 6.6743e-11 * 5.972e24, iss = P.orbit(gm, 6.771e6, 6.771e6), gto = P.orbit(gm, 6.571e6, 42.157e6);
    check(near(iss.t / 60, 92.4155, 1e-5) && iss.e === 0 && near(iss.vp, Math.sqrt(gm / 6.771e6)) && near(P.orbitSize(gm, 86164.0905) / 1000, 42164, 1e-4), 'orbit: circular', JSON.stringify(iss));
    check(near(gto.a, (6.571e6 + 42.157e6) / 2) && near(gto.e, (42.157e6 - 6.571e6) / (42.157e6 + 6.571e6)) && near(gto.vp * 6.571e6, gto.va * 42.157e6, 1e-9) &&
        JSON.stringify(P.orbit(gm, 42.157e6, 6.571e6)) === JSON.stringify(gto), 'orbit: an ellipse, its angular momentum the same at each end, either way round', JSON.stringify(gto));
    check(P.orbit(gm, 0, 1) === null && P.orbit(0, 1, 1) === null && isNaN(P.orbitSize(gm, 0)), 'orbit: none at the middle, or of no mass');
})();

// an ideal gas: a litre at 1 atm and 300 K doubled in volume, isothermal and isobaric; warmed to 600 K; halved adiabatically
(function () {
    var R = 8.314462618, n = 101.325 / (R * 300), t = P.gasProcess(0, 1.4, 101325, 0.001, 300, 0.002), b = P.gasProcess(1, 1.4, 101325, 0.001, 300, 0.002),
        c = P.gasProcess(2, 1.4, 101325, 0.001, 300, 600), a = P.gasProcess(3, 1.4, 101325, 0.001, 300, 0.0005);
    check(near(t.n, n) && near(t.p, 50662.5) && t.t === 300 && near(t.w, 101.325 * Math.LN2) && t.du === 0 && near(t.q, t.w), 'gasProcess: isothermal', JSON.stringify(t));
    check(near(b.t, 600) && b.p === 101325 && near(b.w, 101.325) && near(b.q, n * 3.5 * R * 300) && near(b.du, n * 2.5 * R * 300), 'gasProcess: isobaric, Q = nCpΔT', JSON.stringify(b));
    check(near(c.p, 202650) && c.v === 0.001 && c.w === 0 && near(c.q, c.du) && near(c.du, n * 2.5 * R * 300), 'gasProcess: isochoric', JSON.stringify(c));
    check(near(a.p, 101325 * Math.pow(2, 1.4)) && near(a.t, 300 * Math.pow(2, 0.4)) && a.q === 0 && near(a.du, -a.w) && near(a.du, n * 2.5 * R * (a.t - 300)), 'gasProcess: adiabatic', JSON.stringify(a));
    check(P.gasProcess(0, 1.4, 0, 0.001, 300, 0.002) === null && P.gasProcess(3, 1, 101325, 0.001, 300, 0.002) === null, 'gasProcess: none of no pressure, or γ of 1');
})();

// the friction factor: 64/Re laminar; smooth pipes by Colebrook, 0.0180 at Re 10⁵, 0.0116 at 10⁶; rough, more
check(P.friction(1000, 0.01) === 0.064 && near(P.friction(1e5, 0), 0.01799, 1e-3) && near(P.friction(1e6, 0), 0.01165, 1e-3) && P.friction(1e6, 1e-4) > P.friction(1e6, 0) &&
    near(P.friction(1e6, 1e-3), 0.0199, 2e-3) && isNaN(P.friction(0, 0)) && isNaN(P.friction(1e5, -1)), 'friction', [P.friction(1e5, 0), P.friction(1e6, 0), P.friction(1e6, 1e-3)].join(' '));

// masses over a pulley: 3 and 2 kg hanging; 2 hanging, 3 on a table of μ 0.2; held by friction; pulled back down a slope;
// a pulley of 2 kg, the tension each side not the same
(function () {
    var g = 9.8, h = P.atwood(3, 2, Math.PI / 2, 0, 0, g), t = P.atwood(2, 3, 0, 0.2, 0, g), held = P.atwood(1, 3, 0, 0.5, 0, g),
        back = P.atwood(1, 5, Math.PI / 6, 0, 0, g), heavy = P.atwood(3, 2, Math.PI / 2, 0, 2, g);
    check(near(h.a, 1.96) && near(h.t1, 23.52) && h.t2 === h.t1 && h.moves, 'atwood: both hanging', JSON.stringify(h));
    check(near(t.a, 1.4 * g / 5) && near(t.t1, 2 * (g - t.a)) && near(t.friction, 0.6 * g), 'atwood: on a table', JSON.stringify(t));
    check(held.a === 0 && !held.moves && near(held.friction, g) && near(held.t1, g), 'atwood: held by friction, only as much as it takes', JSON.stringify(held));
    check(near(back.a, -0.25 * g) && near(back.t1, 1.25 * g), 'atwood: the one on the slope pulls the other up', JSON.stringify(back));
    check(near(heavy.a, g / 6) && near(heavy.t1, 2.5 * g) && near(heavy.t2, 2 * g + 2 * g / 6), 'atwood: a pulley of mass', JSON.stringify(heavy));
    check(P.atwood(0, 1, 0, 0, 0, g) === null && P.atwood(1, 1, 2, 0, 0, g) === null && P.atwood(1, 1, 0, -1, 0, g) === null, 'atwood: none of no mass, past upright, or μ below 0');
})();

// a rocket of exhaust 3000 m/s from 1000 kg to 300 in 2 minutes
(function () {
    var r = P.rocket(3000, 1000, 300, 120, 9.80665);
    check(near(r.dv, 3000 * Math.log(10 / 3)) && near(r.ratio, 10 / 3) && r.fuel === 700 && near(r.thrust, 17500) && near(r.a0, 17.5) && near(r.a1, 17500 / 300) &&
        near(r.up, r.dv - 9.80665 * 120), 'rocket', JSON.stringify(r));
    check(isNaN(P.rocket(3000, 1000, 300).thrust) && P.rocket(3000, 1000, 300).dv === r.dv && P.rocket(3000, 200, 300) === null && P.rocket(0, 1000, 300) === null,
        'rocket: with no time, no thrust; none of more mass at the end, or no exhaust');
})();

// an LM317: 240 Ω and 720 Ω give 5 V and the 50 µA through R2; back the other way
check(near(P.lm317(240, 720), 5.036) && near(P.lm317(240, P.lm317R2(12, 240)), 12) && P.lm317(240, 0) === 1.25 && isNaN(P.lm317R2(1, 240)) && isNaN(P.lm317(0, 100)),
    'lm317', P.lm317(240, 720) + ' ' + P.lm317R2(12, 240));

// cooling: from 90 °C in air at 20, 70 after 5 minutes; the time back again; none to below the air; warming too
(function () {
    var k = P.coolingRate(90, 20, 5, 70);
    check(near(k, Math.log(7 / 5) / 5) && near(P.cooling(90, 20, k, 5), 70) && near(P.coolingTime(90, 20, k, 70), 5) && P.coolingTime(90, 20, k, 90) === 0,
        'cooling: of a reading, and back', k);
    check(isNaN(P.coolingTime(90, 20, k, 15)) && isNaN(P.coolingTime(90, 20, k, 95)) && isNaN(P.coolingRate(90, 20, 5, 10)) && isNaN(P.coolingRate(90, 20, 0, 70)) &&
        near(P.coolingRate(5, 20, 10, 10), Math.log(1.5) / 10), 'cooling: none past the air, or of no time; warming too');
})();

// light through a slit and a round hole: J1(1), its first 0 at 3.8317; the slit dark at π
check(near(P.besselJ1(1), 0.4400505857) && Math.abs(P.besselJ1(3.8317059702)) < 1e-9 && near(P.besselJ1(-1), -0.4400505857) && P.airy(0) === 1 &&
    Math.abs(P.airy(3.8317059702)) < 1e-12 && near(P.airy(5.1356), 0.0175, 1e-2) && P.slit(0) === 1 && P.slit(Math.PI) < 1e-30 && near(P.slit(Math.PI / 2), 4 / (Math.PI * Math.PI)),
    'besselJ1, airy and slit', [P.besselJ1(1), P.airy(5.1356)].join(' '));

// a Wheatstone bridge: balanced at R2 R3 / R1, no voltage out; off balance, its voltage and its resistance between its middles
check(P.bridgeRx(1000, 470, 2200) === 1034 && P.bridge(10, 1000, 470, 2200, 1034).out === 0 && near(P.bridge(10, 1000, 1000, 1000, 1100).out, 10 * (0.5 - 1100 / 2100)) &&
    near(P.bridge(10, 1000, 1000, 1000, 1000).r, 1000) && isNaN(P.bridgeRx(0, 470, 2200)) && P.bridge(10, 0, 0, 1000, 1000) === null && P.bridge(10, -1, 470, 2200, 1000) === null,
    'bridge', JSON.stringify(P.bridge(10, 1000, 1000, 1000, 1100)));

// American Wire Gauge, of its table: 12 is 2.053 mm, 0 8.251, 4/0 11.684, 40 0.0799; the nearest gauge back
check(near(P.awg('12'), 2.053, 1e-3) && near(P.awg('0'), 8.251, 1e-3) && P.awg('4/0') === P.awg('0000') && near(P.awg('4/0'), 11.684, 1e-4) && P.awg('2/0') === P.awg('00') &&
    near(P.awg('40'), 0.0799, 1e-3) && isNaN(P.awg('41')) && isNaN(P.awg('5/0')) && isNaN(P.awg('1.5')) && P.awgOf(2.05) === '12' && P.awgOf(11.7) === '4/0' && P.awgOf(9.3) === '2/0' &&
    P.awgOf(20) === '' && P.awgOf(0) === '', 'awg', [P.awg('12'), P.awg('0'), P.awg('40')].join(' '));

// Stokes' law: a steel ball of 1 mm in glycerine falls 1 cm/s, Re far below 1; lighter than the fluid, it rises
(function () {
    var s = P.stokes(1e-3, 7800, 1260, 1.41, 9.80665);
    check(near(s.v, 2 * 6540 * 9.80665e-6 / 12.69) && s.re < 0.02 && near(s.tau, 2 * 7800e-6 / 12.69) && P.stokes(1e-3, 500, 1000, 1e-3, 9.81).v < 0 && P.stokes(0, 7800, 1260, 1.41, 9.81) === null,
        'stokes', JSON.stringify(s));
})();

// the dew point: air at 25 °C and 60% is full at 16.7 °C, and back; full air at its own temperature; none of a humidity of 0 or past 100
check(near(P.dewPoint(25, 60), 16.6977, 1e-4) && near(P.humidity(25, P.dewPoint(25, 60)), 60) && near(P.dewPoint(10, 100), 10) && near(P.vapour(25), 31.62, 1e-3) &&
    isNaN(P.dewPoint(25, 0)) && isNaN(P.dewPoint(25, 101)) && isNaN(P.humidity(20, 25)) && P.humidity(20, 20) === 100, 'dew point', P.dewPoint(25, 60));

// the lensmaker's equation: glass bulging both ways, of 0.2 m, is 0.2 m; one face flat, the same of half the radius; in water, weaker; faces alike, no power
check(near(P.lensmaker(1.5, 0.2, -0.2, 1), 0.2) && near(P.lensmaker(1.5, Infinity, -0.1, 1), 0.2) && near(P.lensmaker(1.5, 0.2, -0.2, 1.333), 0.1 / (1.5 / 1.333 - 1)) &&
    near(P.lensmaker(1.5, -0.2, 0.2, 1), -0.2) && P.lensmaker(1.5, 0.1, 0.1, 1) === Infinity && isNaN(P.lensmaker(1.5, 0, 0.1, 1)), 'lensmaker', P.lensmaker(1.5, 0.2, -0.2, 1.333));

// light of a source going away at 0.6 c is twice as long; coming at 0.6 c, half; none at c
check(near(P.redshift(0.6), 2) && near(P.redshift(-0.6), 0.5) && P.redshift(0) === 1 && isNaN(P.redshift(1)) && isNaN(P.redshift(-1.2)), 'redshift', P.redshift(0.6));

// the standard atmosphere, as its tables have it: 11 km 22 632 Pa and 216.65 K, 20 km 5 475 Pa, 32 km 868 Pa, 84.852 km 0.3734 Pa;
// back from a pressure to its height; and air 10 K warmer thinner at a height
(function () {
    var a = function (h) { return P.atmosphere(h, 288.15, 101325); };
    check(a(0).p === 101325 && near(a(0).rho, 1.225, 1e-3) && near(a(11000).p, 22632, 1e-4) && near(a(11000).t, 216.65) && near(a(20000).p, 5474.9, 1e-4) &&
        near(a(32000).p, 868.02, 1e-3) && near(a(84852).p, 0.3734, 1e-3) && near(a(-430).p, 106598, 1e-4) && a(90000) === null && a(-6000) === null &&
        P.atmosphere(1000, 0, 101325) === null, 'atmosphere: the standard\'s layers', JSON.stringify(a(11000)));
    check(near(P.altitude(a(8849).p, 288.15, 101325), 8849, 1e-6) && near(P.altitude(a(40000).p, 288.15, 101325), 40000, 1e-6) && P.altitude(101325, 288.15, 101325) === 0 &&
        isNaN(P.altitude(1e6, 288.15, 101325)) && isNaN(P.altitude(0.01, 288.15, 101325)) && isNaN(P.altitude(0, 288.15, 101325)), 'altitude: back from the pressure');
    check(P.atmosphere(3000, 298.15, 101325).p > a(3000).p && near(P.atmosphere(3000, 298.15, 101325).t, a(3000).t + 10), 'atmosphere: in warmer air the pressure falls more slowly');
})();

// sound: 343 m/s in air at 20 °C, 1007 in helium at 20 °C; none of γ 1
check(near(P.sound(1.4, 28.965, 293.15), 343.233, 1e-5) && near(P.sound(5 / 3, 4.0026, 293.15), 1007.4, 1e-3) && isNaN(P.sound(1, 28, 300)) && isNaN(P.sound(1.4, 28, 0)),
    'sound', P.sound(5 / 3, 4.0026, 293.15));

// SMD codes both ways: of 3 and 4 digits, R for the point, EIA-96 and its letters; E96 as 10^(i/96) rounded
check(P.E96.length === 96 && P.E96.every(function (v, i) { return v === Math.round(100 * Math.pow(10, i / 96)); }), 'E96: 96 values, each 10^(i/96)');
[['473', 47000, '3 digits'], ['4702', 47000, '4 digits'], ['4R7', 4.7, 'R for the point'], ['R47', 0.47, 'R for the point'], ['10R0', 10, 'R for the point'],
    ['R010', 0.01, 'R for the point'], ['01C', 10000, 'EIA-96'], ['68X', 49.9, 'EIA-96'], ['01S', 10, 'EIA-96'], ['96F', 9.76e7, 'EIA-96'], ['000', 0, 'Jumper'],
    [' 1r0 ', 1, 'R for the point'], ['100', 10, '3 digits']].forEach(function (c) {
    var r = P.fromSmd(c[0]);
    check(r && r.ohms === c[1] && r.kind === c[2], 'fromSmd: ' + c[0], JSON.stringify(r));
});
check(P.fromSmd('47R').ohms === 47 && P.fromSmd('47R').also.ohms === 3.01 && P.fromSmd('97A') === null && P.fromSmd('12') === null && P.fromSmd('4K7') === null && P.fromSmd('') === null,
    'fromSmd: 47R either way, and what is no code');
(function () {
    function codes(x) { var r = P.toSmd(x); return r ? ['three', 'four', 'eia'].map(function (k) { return r[k] ? r[k].code + '=' + r[k].ohms : '–'; }).join(' ') : 'null'; }
    [[4700, '472=4700 4701=4700 66B=4750'], [4.7, '4R7=4.7 4R70=4.7 66Y=4.75'], [0.47, 'R47=0.47 R470=0.47 66Z=0.475'], [10000, '103=10000 1002=10000 01C=10000'],
        [9.99, '100=10 9R99=9.99 01X=10'], [147, '151=150 1470=147 17A=147'], [0.047, '– – –'], [1e11, '– 1009=100000000000 –'], [0, 'null']].forEach(function (c) {
        check(codes(c[0]) === c[1], 'toSmd: ' + c[0], codes(c[0]));
    });
})();

// filters: 3 dB down at the cut-off, a quarter turn at the centre; of the second order its peak and band
(function () {
    var f = P.filter(0, 0, 10e3, 0, 100e-9), h;
    check(near(f.fc, 159.154943, 1e-8) && near(f.at(f.fc).db, -3.0103, 1e-4) && near(f.at(f.fc).phase, -Math.PI / 4) && near(f.at(100 * f.fc).db, -40, 1e-3), 'filter: RC low-pass');
    f = P.filter(1, 1, 100, 10e-3, 0);
    check(near(f.fc, 1591.549431, 1e-8) && near(f.at(f.fc).phase, Math.PI / 4) && near(f.at(f.fc / 100).db, -40, 1e-3), 'filter: RL high-pass');
    f = P.filter(2, 0, 10, 1e-3, 1e-6);
    check(near(f.f0, 5032.921210, 1e-8) && near(f.q, Math.sqrt(10), 1e-9) && near(f.at(f.fc).db, -3.0103, 1e-4) && f.peak && near(f.at(f.peak[0]).gain, f.peak[1]) && near(f.at(f.f0).phase, -Math.PI / 2),
        'filter: RLC low-pass, its peak', JSON.stringify(f));
    h = P.filter(2, 1, 100, 1e-3, 1e-6);
    check(h.peak === null && near(h.at(h.fc).db, -3.0103, 1e-4) && h.fc > h.f0, 'filter: RLC high-pass of Q below 0.707, no peak');
    f = P.filter(2, 2, 10, 1e-3, 1e-6);
    check(near(f.at(f.f0).db, 0, 1e-9) && near(f.at(f.lo).db, -3.0103, 1e-4) && near(f.at(f.hi).db, -3.0103, 1e-4) && near(f.bw, f.f0 / f.q), 'filter: RLC band-pass');
    f = P.filter(2, 3, 10, 1e-3, 1e-6);
    check(f.at(f.f0).gain < 1e-9 && near(f.at(f.lo).db, -3.0103, 1e-4), 'filter: RLC band-stop');
    check(P.filter(0, 2, 1, 0, 1) === null && P.filter(2, 0, 0, 1, 1) === null && P.filter(1, 0, 1, 0, 1) === null, 'filter: none of a value of 0, or a pass it has not');
})();

// decibels: 0 dBm is a milliwatt, 0.2236 V across 50 Ω; 1 V is 0 dBV and 120 dBµV
(function () {
    var r = P.level(0, 0, 50);
    check(r.w === 0.001 && r.dbw === -30 && near(r.v, 0.2236068, 1e-6) && near(r.dbuv, 106.9897, 1e-6), 'level: 0 dBm across 50 Ω', JSON.stringify(r));
    r = P.level(1, 6, 50);
    check(r.dbv === 0 && r.dbmv === 60 && r.dbuv === 120 && r.w === 0.02 && near(r.vpp, 2 * Math.SQRT2), 'level: 1 V RMS');
    r = P.level(0, 3, 600);
    check(near(r.dbm, 2.2185, 1e-4), 'level: 0 dBV across 600 Ω is +2.2 dBm', r.dbm);
    check(P.level(30, 0, 50).w === 1 && P.level(0, 2, 50) === null && P.level(-1, 6, 50) === null && P.level(0, 0, 0) === null && near(P.level(60, 5, 75).v, 1e-3), 'level: of W, and none of no power');
    check(near(P.ratio(3, 0).power, 1.99526, 1e-5) && near(P.ratio(2, 2).db, 6.0206, 1e-5) && near(P.ratio(100, 1).db, 20) && P.ratio(0, 1) === null && P.ratio(-20, 0).voltage === 0.1,
        'ratio: dB, power and voltage');
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exitCode = failures ? 1 : 0;
