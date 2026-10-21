// Run with: node test/physics.test.js
// The physics of physics.js: values written with prefixes, motion at a steady acceleration, projectiles,
// the resistor colour code both ways, and networks in series and parallel
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

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exitCode = failures ? 1 : 0;
