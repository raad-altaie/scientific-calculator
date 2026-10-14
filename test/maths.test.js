// Run with: node test/maths.test.js
// The maths of the Solve panel: equations, polynomials and linear systems; integrals, slopes,
// sums and products; the normal, binomial and Poisson distributions
'use strict';

var M = require('../js/maths.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

function near(a, b, tol) {
    return Math.abs(a - b) <= (tol || 1e-12) * Math.max(1, Math.abs(b));
}

function roots(text, from, to) {
    var r = M.solve(text, false, 0, from, to);
    return r.error || r.roots.join(' ') + (r.more ? ' …' : '');
}

function polyText(c) {
    return (M.poly(c) || []).map(function (z) { return z.im ? z.re + (z.im < 0 ? '-' : '+') + Math.abs(z.im) + 'i' : String(z.re); }).join(' ');
}

// numbers typed, which may be worked out
check(M.number('pi/4') === Math.PI / 4 && M.number('2^10') === 1024 && M.number('sin(30)', false, 1) === 0.5 &&
    M.number('1,5', true) === 1.5, 'number: worked out, in the unit of angles, with the comma');
check(isNaN(M.number('x')) && isNaN(M.number('')) && isNaN(M.number('a')) && isNaN(M.number('inf')) &&
    M.number('-inf', false, 0, true) === -Infinity && M.number('∞', false, 0, true) === Infinity, 'number: none with x, a letter or empty; ∞ where allowed');

// equations
[
    ['x^3 = 2x + 1', '-1 -0.6180339887499 1.6180339887499', 'a cubic, its three roots'],
    ['2x + 3 = 7', '2', 'a line'],
    ['x^2 - 2', '-1.414213562373095 1.414213562373095', 'one side alone is 0'],
    ['(x - 1)^2', '1', 'a root it only touches'],
    ['abs(x) = 2', '-2 2', 'a corner between'],
    ['x = cos(x)', '0.73908513321516', 'the fixed point of cos'],
    ['e^x = 3', '1.0986122886681', 'ln 3'],
    ['x^2 + 1', '', 'none'],
    ['1/x', '', 'none where it only jumps']
].forEach(function (c) {
    check(roots(c[0]) === c[1], 'solve: ' + c[0] + ': ' + c[2], roots(c[0]));
});
check(roots('sin(x)', 0, 10) === '0 3.1415926535898 6.28318530717958 9.42477796076938', 'solve: between ends of its own', roots('sin(x)', 0, 10));
check(/^(-?\d+\.\d+ ){11}-?\d+\.\d+ …$/.test(roots('sin(x) = 0.5')) && roots('sin(x) = 0.5').indexOf('0.5235987755983') > 0,
    'solve: of very many roots, the twelve nearest 0', roots('sin(x) = 0.5'));
check(roots('a x = 1') === 'letters' && roots('x^2 = 4 = 2') === 'equation' && roots('x <') === 'equation' && roots('= 2') === 'equation',
    'solve: letters of its own, and what is not an equation');

// polynomials
[
    [[1, 0, -4], '-2 2'],
    [[1, 2, 5], '-1+2i -1-2i'],
    [[1, -3, 3, -1], '1 1 1'],
    [[1, -6, 11, -6], '1 2 3'],
    [[1, 0, 0, -8], '2 -1+1.73205080757i -1-1.73205080757i'],
    [[1, 0, 0, 0, -16], '-2 2 0+2i 0-2i'],
    [[1, -10, 35, -50, 24], '1 2 3 4'],
    [[1, 0, -4, 0], '-2 0 2'],
    [[1, 0, 0, 0, 0], '0 0 0 0'],
    [[0, 1, -3], '3'],
    [[0.001, 1, 1], '-998.998997995 -1.00100200501']
].forEach(function (c) {
    check(polyText(c[0]) === c[1], 'poly: ' + c[0].join(', ') + ' has ' + c[1], polyText(c[0]));
});
check(M.poly([0, 0, 5]) === null && M.poly([1, NaN]) === null, 'poly: none without x, or with a coefficient not a number');

// linear systems
check(JSON.stringify(M.linear([[1, 1, 3], [1, -1, 1]])) === '{"x":[2,1]}' &&
    JSON.stringify(M.linear([[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]])) === '{"x":[2,3,-1]}', 'linear: two and three equations');
check(M.linear([[1, 1, 3], [2, 2, 6]]).many && M.linear([[1, 1, 3], [1, 1, 4]]).none && M.linear([[1, 2, 3, 6], [2, 4, 6, 12], [1, 0, 1, 2]]).many &&
    M.linear([[0, 0, 1], [0, 0, 2]]).none, 'linear: many answers, or none');

// calculus
check(M.integral(M.fn('x^2'), 0, 3, 0) === 9 && M.integral(M.fn('x^2'), 3, 0, 0) === -9 && M.integral(M.fn('sin(x)'), 0, Math.PI, 0) === 2,
    'integral: x² from 0 to 3, the other way, sin x over a half turn');
check(M.integral(M.fn('e^(-x)'), 0, Infinity, 0) === 1 && near(M.integral(M.fn('e^(-x^2)'), -Infinity, Infinity, 0), Math.sqrt(Math.PI), 1e-9) &&
    M.integral(M.fn('1/x^2'), 1, Infinity, 0) === 1 && isNaN(M.integral(M.fn('1/x'), -1, 1, 0)), 'integral: to ∞, both ways, and none across 1/x at 0');
check(M.slopes(M.fn('x^3'), 2, 0).join() === '12,12' && M.slopes(M.fn('sin(x)'), 0, 0).join() === '1,0' && isNaN(M.slopes(M.fn('abs(x)'), 0, 0)[0]),
    'slopes: of x³ at 2, of sin at 0; none at a corner');
check(M.fn('a x') === null && M.fn('x <') === null && M.fn('y = x^2').at(3) === 9, 'fn: a function of x only');
check(M.series('n^2', false, 0, 1, 10).value === 385 && M.series('1/k!', false, 0, 0, 20).value === 2.71828182846 &&
    M.series('x', false, 0, 1, 100).value === 5050 && M.series('n', false, 0, 1, 5, true).value === 120 &&
    near(M.series('1/n^2', false, 0, 1, 1e6).value, Math.PI * Math.PI / 6 - 1e-6, 1e-9), 'series: sums of n², 1/k!, x; 5!; 1/n² to a million');
check(M.series('n x', false, 0, 1, 5).error === 'letters' && M.series('a n', false, 0, 1, 5).error === 'letters' &&
    M.series('n', false, 0, 1.5, 5).error === 'ends' && M.series('n', false, 0, 5, 1).error === 'ends' &&
    M.series('n', false, 0, 1, 2e6).error === 'many' && M.series('x +', false, 0, 1, 2).error === 'function', 'series: what it cannot sum');

// probability
check(M.normalBetween(-1, 1, 0, 1) === 0.682689492137 && M.normalBetween(-Infinity, 1.96, 0, 1) === 0.975002104852 &&
    M.normalBetween(90, 110, 100, 15) === 0.495014924906, 'normal: within 1σ, below 1.96, of IQ 90 to 110');
check(M.normalBetween(5, Infinity, 0, 1) === 2.86651571879e-7 && M.normalBetween(-Infinity, -8, 0, 1) === 6.22096057427e-16 &&
    isNaN(M.normalBetween(0, 1, 0, 0)), 'normal: small tails keep their digits; σ must be above 0');
check(M.normalDensity(0, 0, 1) === 0.398942280401 && M.normalInverse(0.975, 0, 1) === 1.95996398454 && M.normalInverse(0.5, 100, 15) === 100 &&
    M.normalInverse(1e-10, 0, 1) === -6.3613409024 && isNaN(M.normalInverse(1, 0, 1)), 'normal: the density, and the x of a chance');
check(JSON.stringify(M.binomial(10, 0.5, 5)) === '{"eq":0.24609375,"le":0.623046875,"ge":0.623046875}' &&
    JSON.stringify(M.binomial(10, 0.5, 3)) === '{"eq":0.1171875,"le":0.171875,"ge":0.9453125}' &&
    M.binomial(1000, 0.3, 280).le === 0.0885795226059 && M.binomial(10, 0.5, 11).le === 1 && isNaN(M.binomial(10, 1.5, 3).eq),
    'binomial: of 10 coins, of a thousand, past n, a chance above 1');
check(JSON.stringify(M.poisson(3, 2)) === '{"eq":0.224041807655,"le":0.423190081127,"ge":0.800851726529}' &&
    M.poisson(100, 120).ge === 0.0282303939648 && isNaN(M.poisson(-1, 2).eq), 'poisson: of 3, of 100; a mean below 0');
check(M.randomWhole(1, 6, function () { return 0; }) === 1 && M.randomWhole(1, 6, function () { return 0.9999; }) === 6 && isNaN(M.randomWhole(1.5, 6)),
    'randomWhole: from 1 to 6, both in; whole ends only');

// complex numbers
function z(text, deg) {
    var c = M.complex(text, false, deg || 0);
    return c ? c.re + (c.im < 0 ? '-' : '+') + Math.abs(c.im) + 'i' : 'none';
}
[
    ['(2+3i)(1-i)', '5+1i'], ['sqrt(-4)', '0+2i'], ['e^(i pi)', '-1+0i'], ['i^2', '-1+0i'], ['1/i', '0-1i'], ['(1+i)^8', '16+0i'],
    ['ln(-1)', '0+3.14159265359i'], ['abs(3+4i)', '5+0i'], ['sqrt(i)', '0.707106781187+0.707106781187i'], ['i^i', '0.207879576351+0i'],
    ['(-8)^(1/3)', '-2+0i'], ['acos(2)', '0+1.31695789692i'], ['5 nCr 2', '10+0i']
].forEach(function (c) {
    check(z(c[0]) === c[1], 'complex: ' + c[0] + ' is ' + c[1], z(c[0]));
});
check(z('2∠30', 1) === '1.73205080757+1i' && z('sin(30)', 1) === '0.5+0i' && z('acos(2)', 1) === '0+75.4561292902i',
    'complex: polar 2∠30°, and angles in degrees');
check(z('x + 1') === 'none' && z('a i') === 'none' && z('2 +') === 'none' && isNaN(M.complex('1/0').re), 'complex: none with x or a letter but i, or unfinished; 1/0 has no value');
check(JSON.stringify(M.polar({ re: 0, im: 1 }, 1)) === '{"r":1,"theta":90}' && M.polar({ re: -1, im: 0 }, 0).theta === 3.14159265359, 'polar: length and angle');
check(JSON.stringify(M.croots({ re: 1, im: 0 }, 3)) === '[{"re":1,"im":0},{"re":-0.5,"im":0.866025403784},{"re":-0.5,"im":-0.866025403784}]' &&
    M.croots({ re: 1, im: 0 }, 0) === null, 'croots: the cube roots of 1');

// whole numbers in bits
function bits(text, n) {
    var r = M.bitwise(text, n || 32);
    return r.error || String(r.value) + (r.wrapped ? ' wrapped' : '');
}
[
    ['0xFF AND 0b1010', '10'], ['-1', '-1'], ['~0', '-1'], ['1 << 4', '16'], ['0x7FFFFFFF + 1', '-2147483648 wrapped'], ['10 / 3', '3'],
    ['-7 mod 3', '2'], ['5 XOR 3', '6'], ['5 nand 3', '-2'], ['(1 + 2) × 3', '9'], ['0o17 | 0b10000', '31'], ['10 / 0', 'zero'], ['2 3', 'expression'],
    ['0xg', 'expression'], ['', 'expression']
].forEach(function (c) {
    check(bits(c[0]) === c[1], 'bitwise: ' + c[0] + ' is ' + c[1], bits(c[0]));
});
check(bits('200', 8) === '-56 wrapped' && bits('1', 12) === 'bits' && M.inBase(BigInt(-1), 8, 16) === 'FF' && M.inBase(BigInt(10), 8, 2) === '0000 1010' &&
    M.inBase(BigInt(-1), 16, 8) === '177777', 'bitwise: 8 bits signed; the bases of the bits');

// matrices
check(M.det([[1, 2], [3, 4]]) === -2 && M.det([[1, 2], [2, 4]]) === 0 && M.det([[2, 0, 1], [1, 3, 2], [1, 1, 2]]) === 6 && isNaN(M.det([[1, 2]])),
    'det: 2×2, one with no inverse, 3×3; none of a matrix not square');
check(JSON.stringify(M.inverse([[1, 2], [3, 4]])) === '[[-2,1],[1.5,-0.5]]' && M.inverse([[1, 2], [2, 4]]) === null &&
    M.rank([[1, 2], [2, 4]]) === 1 && M.rank([[1, 0], [0, 1]]) === 2, 'inverse and rank');
check(JSON.stringify(M.transpose([[1, 2, 3], [4, 5, 6]])) === '[[1,4],[2,5],[3,6]]' && JSON.stringify(M.plus([[1, 2]], [[3, 4]])) === '[[4,6]]' &&
    JSON.stringify(M.plus([[1, 2]], [[3, 4]], true)) === '[[-2,-2]]' && M.plus([[1]], [[1, 2]]) === null &&
    JSON.stringify(M.times([[1, 2], [3, 4]], [[0, 1], [1, 0]])) === '[[2,1],[4,3]]' && JSON.stringify(M.times([[1, 2, 3]], [[1], [2], [3]])) === '[[14]]' &&
    M.times([[1, 2]], [[1, 2]]) === null, 'transpose, sum, difference and product, of sizes that go together only');

// whole numbers: prime factors, divisors, gcd and lcm; numbers rounded
function factors(text) {
    var r = M.factorize(text, false, 0, 64);
    return r.error || r.factors.map(function (pe) { return pe[0] + (pe[1] > 1 ? '^' + pe[1] : ''); }).join(' ') + (r.prime ? ' prime' : '');
}
[
    ['360', '2^3 3^2 5'], ['-84', '2^2 3 7'], ['97', '97 prime'], ['2^10', '2^10'], ['10!', '2^8 3^4 5^2 7'], ['1', ''], ['0', ''],
    ['600851475143', '71 839 1471 6857'], ['18446744073709551617', '274177 67280421310721'], ['99999999999999999989', '99999999999999999989 prime'],
    ['1000000016000000063', '1000000007 1000000009'], ['9007199254740993', '3 107 28059810762433'], ['1.5', 'whole'], ['x', 'whole'],
    ['999999999999999999999', 'whole']
].forEach(function (c) {
    check(factors(c[0]) === c[1], 'factorize: ' + c[0] + ' is ' + c[1], factors(c[0]));
});
(function () {
    var r = M.factorize('360', false, 0, 64), z = M.factorize('0', false, 0, 64), many = M.factorize('10!', false, 0, 64);
    check(r.count === 24 && String(r.sum) === '1170' && String(r.totient) === '96' && r.divisors.length === 24 && String(r.divisors[23]) === '360' &&
        z.count === Infinity && z.divisors === null && many.count === 270 && many.divisors === null, 'factorize: divisors, their sum, the totient; none of 0; too many to list');
    r = M.divisorsOf('12, 18, 30', false, 0);
    check(String(r.gcd) === '6' && String(r.lcm) === '180' && r.n === 3, 'divisorsOf: 12, 18, 30');
    r = M.divisorsOf('12;18 0', true, 0);
    check(String(r.gcd) === '6' && String(r.lcm) === '0' && M.divisorsOf('12, 1.5', false, 0).at === '1.5', 'divisorsOf: with a decimal comma; of 0; one not whole');
    check(M.isPrime(BigInt(2)) && !M.isPrime(BigInt(1)) && !M.isPrime(BigInt('3825123056546413051')) && M.isPrime(BigInt('2305843009213693951')),
        'isPrime: 2, 1, a strong pseudoprime to the first nine primes, 2^61 – 1');
})();
[
    [1.005, 2, 'round', 1.01], [2.5, 0, 'round', 3], [-2.5, 0, 'round', -3], [-0.4, 0, 'round', 0], [1234, -2, 'round', 1200], [1250, -2, 'round', 1300],
    [-1.21, 1, 'floor', -1.3], [-1.21, 1, 'ceil', -1.2], [1.29, 1, 'trunc', 1.2], [1e-20, 3, 'ceil', 0.001], [0.1 + 0.2, 2, 'floor', 0.3], [123.456, 5, 'round', 123.456]
].forEach(function (c) {
    check(Object.is(M.roundTo(c[0], c[1], c[2]), c[3]), 'roundTo: ' + c[0] + ' to ' + c[1] + ' places, ' + c[2] + ', is ' + c[3], M.roundTo(c[0], c[1], c[2]));
});
check(M.significant(0.012345, 3) === 0.0123 && M.significant(98765, 2) === 99000 && M.significant(9.995, 3) === 10 && M.significant(-0.000123456, 2) === -0.00012 &&
    M.significant(0, 3) === 0 && isNaN(M.significant(1, 0)), 'significant figures');
check(JSON.stringify(M.complex('floor(2.7 - 1.2i)', false, 0)) === '{"re":2,"im":-2}' && JSON.stringify(M.complex('round(e^(i pi))', false, 0)) === '{"re":-1,"im":0}',
    'complex: floor and round of each part');

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exitCode = failures ? 1 : 0;
