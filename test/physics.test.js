// Run with: node test/physics.test.js
// The physics of physics.js: values written with prefixes, motion at a steady acceleration, projectiles,
// the resistor colour code both ways, networks in series and parallel, the values of E12 and E24, a transistor's
// bias, the series of hydrogen's lines, tunnelling, Compton's shift, binding energy, moments of inertia and standing waves
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

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exitCode = failures ? 1 : 0;
