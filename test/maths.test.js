// Run with: node test/maths.test.js
// The maths of the Solve panel: equations, polynomials, typed as well, and their exact forms;
// linear systems and two curves; turning points; integrals, slopes,
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

// exact forms: of the roots of an equation, as near as a number goes, and of a polynomial's, checked in whole numbers
function exact(text, from, to) {
    var r = M.solve(text, false, 0, from, to, true);
    return r.exact.map(String).join(' ');
}
[
    ['x^2 = 2', '-√2 √2', 'roots of a whole number'],
    ['x^2 - x - 1', '(1 - √5)/2 (1 + √5)/2', 'the golden ratio'],
    ['3x = 1', '1/3', 'a fraction'],
    ['e^x = 2', 'ln 2', 'a logarithm'],
    ['x^3 = 2x + 1', 'null (1 - √5)/2 (1 + √5)/2', 'none for a whole number'],
    ['cos(x) = x', 'null', 'none where it has none'],
    ['(x - sqrt(2))^2', '√2', 'a root it only touches, to 9 digits']
].forEach(function (c) {
    check(exact(c[0]) === c[1], 'exact: ' + c[0] + ': ' + c[2], exact(c[0]));
});
check(exact('sin(x) = 0.5', -4, 4) === '-7π/6 π/6 5π/6', 'exact: parts of π, in radians', exact('sin(x) = 0.5', -4, 4));
check(M.solve('x^2 = 2', false, 0).exact === undefined, 'exact: only where asked for');
[
    [[1, 0, -2, 1], '(-1 - √5)/2 (-1 + √5)/2 1'],
    [[1, 2, 3], '-1 + i√2 -1 - i√2'],
    [[2, -3, -2, 0], '-1/2 0 2'],
    [[4, 0, -3], '-√3/2 √3/2'],
    [[1 / 3, -1, 0.5], '(3 - √3)/2 (3 + √3)/2'],
    [[1, 0, 1], 'i -i'],
    [[1, -3, 3, -1], '1 1 1'],
    [[1, 0, 0, -2], 'null null null'],
    [[1, 0, -10, 0, 1], 'null null null null']
].forEach(function (c) {
    var got = M.exactRoots(c[0], M.poly(c[0])).map(String).join(' ');
    check(got === c[1], 'exactRoots: ' + c[0].join(', ') + ' has ' + c[1], got);
});
check(M.exactRoots([Math.PI, 1], M.poly([Math.PI, 1])) === null, 'exactRoots: none of a coefficient not a fraction');

// polynomials typed, multiplied out
[
    ['(x-1)(x+2)^2 - 3x/2', '1,3,-1.5,-4'],
    ['1, 0, -2, 1', '1,0,-2,1'],
    ['x^3 = 2x+1', '1,0,-2,-1'],
    ['x^2 - x^2 + x', '1,0'],
    ['sin(x)+x', 'polynomial'],
    ['1/x', 'polynomial'],
    ['a x^2', 'letters'],
    ['(x+1)^40', 'power']
].forEach(function (c) {
    var r = M.polynomial(c[0], false, 0), got = r.error || r.c.join();
    check(got === c[1], 'polynomial: ' + c[0] + ' is ' + c[1], got);
});

// two curves: where both hold
function points(a, b) {
    var r = M.system2([a, b], false, 0, true);
    return r.error ? r.error + ' ' + r.which : r.many ? 'many' : r.points.map(function (p) { return p.x + ',' + p.y; }).join(' ') + (r.more ? ' …' : '');
}
[
    ['x^2 + y^2 = 25', 'x + y = 7', '3,4 4,3', 'a circle and a line'],
    ['2x + 3y = 7', 'x - y = 1', '2,1', 'two lines'],
    ['x^2 + y^2 = 1', 'y = 1', '0,1', 'a line that touches'],
    ['y = x^2', 'y = 2x - 1', '1,1', 'a parabola its tangent touches'],
    ['x^2 + y^2 = 1', 'y = 3', '', 'none'],
    ['x + y = 1', '2x + 2y = 2', 'many', 'one line twice'],
    ['x y = 2', 'x + y = 3', '1,2 2,1', 'a hyperbola'],
    ['y = sin(x)', 'y = x/10', '-8.42320393236,-0.842320393236 -7.0681743581,-0.70681743581 -2.85234189445,-0.285234189445 0,0 ' +
        '2.85234189445,0.285234189445 7.0681743581,0.70681743581 8.42320393236,0.842320393236', 'a wave'],
    ['x^2 +', 'x + y = 1', 'equation 0', 'not an equation'],
    ['x + y = 1', 'a x = 1', 'letters 1', 'a letter of its own']
].forEach(function (c) {
    check(points(c[0], c[1]) === c[2], 'system2: ' + c[0] + ' and ' + c[1] + ': ' + c[3], points(c[0], c[1]));
});
check(JSON.stringify(M.system2(['y = x^2', 'x + y = 1'], false, 0, true).points.map(function (p) { return p.exact; })) ===
    '[["(-1 - √5)/2","(3 + √5)/2"],["(-1 + √5)/2","(3 - √5)/2"]]', 'system2: exact forms of each');

// turning points
function turns(text, from, to) {
    var r = M.extrema(text, false, 0, from, to);
    return r.error || r.points.map(function (p) { return (p.max ? 'max ' : 'min ') + p.x + ',' + p.y; }).join(' ') +
        (r.top ? ' | top ' + r.top.x + ',' + r.top.y + ' bottom ' + r.bottom.x + ',' + r.bottom.y : '') + (r.more ? ' …' : '');
}
[
    ['x^3 - 3x', 'max -1,2 min 1,-2', 'a cubic'],
    ['x e^(-x)', 'max 1,0.367879441171', 'not where it is too small to tell'],
    ['abs(x - 1)', 'min 1,0', 'a corner'],
    ['x^4', 'min 0,0', 'flat at the bottom'],
    ['x^3', '', 'none where it only flattens'],
    ['1/x', '', 'none where it jumps'],
    ['x/(x^2+1)', 'min -1,-0.5 max 1,0.5', 'a fraction'],
    ['x^2 - 6x + 1e6', 'min 3,999991', 'large beside how it bends'],
    ['y = x^2 - 4x', 'min 2,-4', 'written y = …'],
    ['a x^2', 'letters', 'a letter of its own'],
    ['x^2 +', 'function', 'not a function']
].forEach(function (c) {
    check(turns(c[0]) === c[1], 'extrema: ' + c[0] + ': ' + c[2], turns(c[0]));
});
check(turns('x^3 - 3x', -3, 3) === 'max -1,2 min 1,-2 | top 3,18 bottom -3,-18', 'extrema: the highest and lowest between ends, the ends among them', turns('x^3 - 3x', -3, 3));
check(turns('floor(x)', -3, 3) === ' | top 3,3 bottom -3,-3', 'extrema: none along a step', turns('floor(x)', -3, 3));
check(/^(min|max) /.test(turns('sin(x)')) && / …$/.test(turns('sin(x)')), 'extrema: of very many, the twelve nearest 0', turns('sin(x)'));

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

// Student's t, χ² and F: chances, p-values and the values of a chance, as tables have them
check(JSON.stringify(M.tDist(2.228, 10)) === '{"lo":0.974994114091,"hi":0.0250058859086,"two":0.0500117718171}' &&
    M.tDist(-1, 5).lo === 0.181608733825 && M.tDist(0, 3).two === 1 && M.tDist(40, 3).hi === 0.0000171903403946 && isNaN(M.tDist(1, 0).lo),
    't: the chances of t, a small tail keeping its digits; ν above 0');
check(M.tInverse(0.975, 10) === 2.228138852 && M.tInverse(0.995, 1) === 63.65674116 && M.tInverse(0.05, 20) === -1.724718243 &&
    M.tInverse(0.5, 7) === 0 && isNaN(M.tInverse(1.5, 5)), 't: the t of a chance');
check(M.chiDist(100, 10).hi === 5.44970198292e-17 && M.chiInverse(0.95, 1) === 3.841458821 && M.chiInverse(0.95, 10) === 18.30703805 &&
    M.chiInverse(0.01, 2) === 0.02010067171, 'chi: its chances and the x of a chance');
check(M.fInverse(0.95, 5, 10) === 3.32583453 && Math.abs(M.fDist(3.32583453, 5, 10).hi - 0.05) < 1e-10 && M.fDist(-1, 5, 10).lo === 0,
    'F: the x of a chance, and back');

// geometric, hypergeometric, exponential and uniform
check(JSON.stringify(M.geometric(0.2, 3)) === '{"eq":0.128,"le":0.488,"ge":0.64}' && JSON.stringify(M.geometric(1, 1)) === '{"eq":1,"le":1,"ge":1}' &&
    isNaN(M.geometric(0, 2).eq), 'geometric: the first success on try 3; p above 0');
check(M.hypergeometric(50, 5, 10, 1).eq === 0.431337197229 && isNaN(M.hypergeometric(50, 60, 10, 1).eq), 'hypergeometric: 1 of 10 drawn; K no more than N');
check(JSON.stringify(M.exponential(0.5, 2)) === '{"lo":0.632120558829,"hi":0.367879441171,"density":0.183939720586}' &&
    JSON.stringify(M.uniform(0, 4, 1)) === '{"lo":0.25,"hi":0.75,"density":0.25}' && isNaN(M.uniform(1, 1, 0).lo), 'exponential and uniform');

// confidence intervals
check(JSON.stringify(M.meanInterval(50, 10, 25, 0.95)) === '{"from":45.872202876,"to":54.127797124,"margin":4.127797124,"t":2.063898562}' &&
    isNaN(M.meanInterval(50, 10, 1, 0.95).from), 'meanInterval: by t of 24 degrees; n of 2 at least');
check(JSON.stringify(M.proportionInterval(40, 100, 0.95).wilson) === '[0.309401286432,0.497997413209]' && M.proportionInterval(40, 100, 0.95).from === 0.303981766473 &&
    isNaN(M.proportionInterval(5, 4, 0.95).p), 'proportionInterval: Wald and Wilson; x no more than n');

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

// inequalities: where they hold, as intervals, [ and ] where an end is in
function holds(text, from, to) {
    var r = M.inequality(text, false, 0, from, to);
    return r.error || r.parts.map(function (p) { return (p.fromIn ? '[' : '(') + p.from + ' ' + p.to + (p.toIn ? ']' : ')'); }).join(' ') + (r.more ? ' …' : '');
}
[
    ['x^2 - 4 > 0', '(-Infinity -2) (2 Infinity)', 'outside its roots'],
    ['x^2 <= 4', '[-2 2]', 'between them, both in'],
    ['2x + 1 > x - 3', '(-4 Infinity)', 'a line'],
    ['1/x > 0', '(0 Infinity)', 'not at the jump'],
    ['1/x <= 2', '(-Infinity 0) [0.5 Infinity)', 'either side of the jump'],
    ['sqrt(x) < 3', '[0 9)', 'from where it has values'],
    ['ln(x) < 1', '(0 2.718281828459)', 'ln to e'],
    ['(x - 1)^2 > 0', '(-Infinity 1) (1 Infinity)', 'but where it touches 0'],
    ['x^2 <= 0', '[0 0]', 'at one point'],
    ['x^2 < 0', '', 'nowhere'],
    ['x^2 + 1 > 0', '(-Infinity Infinity)', 'everywhere'],
    ['1 < x^2 < 4', '(-2 -1) (1 2)', 'two the same way'],
    ['x^3 - x >= 0', '[-1 0] [1 Infinity)', 'a cubic'],
    ['abs(x - 3) < 1', '(2 4)', 'about 3'],
    ['floor(x) >= 2', '[2 Infinity)', 'from a jump at a number, in'],
    ['sqrt(2 - x^2) > 0', '(-1.414213562373 1.414213562373)', 'not at the edge where it is 0'],
    ['tan(x) > 1', '(0.78539816339745 1.570796326795)', 'not at the jump at π/2', 0, 3],
    ['sin(x) > 0', '(0 3.1415926535898) (6.28318530717958 9.42477796076938)', 'between its own ends', 0, 10],
    ['x^2 > 1e-20', '(-Infinity -1e-10) (1e-10 Infinity)', 'two ends nearer than 1e-9, not one'],
    ['x < 2e9', '(-Infinity 2000000000)', 'an end past where solve looks'],
    ['x >= -3e12', '[-3000000000000 Infinity)', 'and one below it, in'],
    ['x < 2e16', '(-Infinity Infinity)', 'past where it is looked for, as it is there'],
    ['sqrt(x) < -1', '', 'nowhere, from no value to false no end']
].forEach(function (c) {
    check(holds(c[0], c[3], c[4]) === c[1], 'inequality: ' + c[0] + ': ' + c[2], holds(c[0], c[3], c[4]));
});
check(M.inequality('sqrt(x) < -1', false, 0).ends.length === 0 && M.inequality('x < 2e16', false, 0).within === 1e15 &&
    M.inequality('x > 1', false, 0, 0, 5).within === undefined, 'inequality: no ends where it never holds; how far it was looked for, but between From and To');
check(roots('x^2 = 1e-20') === '-1e-10 1e-10', 'solve: two roots nearer than 1e-9', roots('x^2 = 1e-20'));
check(/ …$/.test(holds('sin(x) > 0')) && M.inequality('sin(x) > 0', false, 0).ends.length === 12, 'inequality: of very many ends, the twelve nearest 0');
check(holds('x^2 = 4') === 'inequality' && holds('x <') === 'inequality' && holds('1 < x > 2') === 'inequality' && holds('a x > 1') === 'letters',
    'inequality: an equation, half of one, two ways at once, a letter of its own');

// sums and products on to ∞, and their exact forms
function endless(text, from, product) {
    var r = M.series(text, false, 0, from, Infinity, product);
    return r.value + (r.exact ? ' ' + r.exact : '');
}
[
    ['1/n^2', 1, '1.64493406685 π²/6', 'Basel'],
    ['1/n^4', 1, '1.08232323371 π⁴/90', 'of the fourth powers'],
    ['(-1)^(n+1)/n', 1, '0.69314718056 ln 2', 'that changes sign'],
    ['(-1)^n/(2n+1)', 0, '0.785398163397 π/4', 'Leibniz'],
    ['1/n!', 0, '2.71828182846 e', 'e'],
    ['1/2^n', 0, '2', 'a geometric one'],
    ['1/(4n^2-1)', 1, '0.5 1/2', 'that telescopes'],
    ['1/n^3', 1, '1.20205690316', 'with no exact form'],
    ['1/n^1.5', 1, '2.61237534868', 'a slow one'],
    ['sin(n)/n^2', 1, '1.01395913236', 'that wavers'],
    ['1/n', 1, 'Infinity', 'that grows without end'],
    ['-1', 1, '-Infinity', 'down without end'],
    ['(-1)^n', 1, 'NaN', 'back and forth'],
    ['1/(n ln(n)^2)', 2, 'NaN', 'too slow to tell']
].forEach(function (c) {
    check(endless(c[0], c[1]) === c[2], 'series: to ∞, ' + c[0] + ': ' + c[3], endless(c[0], c[1]));
});
[
    ['1-1/n^2', 2, '0.5 1/2', 'to a half'],
    ['1-1/(4n^2)', 1, '0.6366197724 2/π', 'Wallis, to 10 digits'],
    ['n', 1, 'Infinity', 'that grows without end'],
    ['1/2', 1, '0', 'to 0']
].forEach(function (c) {
    check(endless(c[0], c[1], true) === c[2], 'series: a product to ∞, ' + c[0] + ': ' + c[3], endless(c[0], c[1], true));
});

// Taylor series
function series(text, a, n, deg) {
    var r = M.taylor(text, false, deg || 0, a, n);
    return r.error || r.coefs.join(' ');
}
[
    ['sin(x)', 0, 7, '0 1 0 -0.16666666666666666 0 0.008333333333333333 0 -0.0001984126984126984', 'sin x'],
    ['1/(1-x)', 0, 4, '1 1 1 1 1', 'not past its pole at 1'],
    ['ln(x)', 1, 4, '0 1 -0.5 0.3333333333333333 -0.25', 'ln x about 1'],
    ['1/x', 0.01, 3, '100 -10000 1000000 -100000000', 'near its pole'],
    ['e^x', 1, 2, '2.718281828 2.718281828 1.359140914', 'e^x about 1'],
    ['x^3', 2, 4, '8 12 6 1 0', 'a polynomial'],
    ['y = x^2 + 1', 0, 3, '1 0 1 0', 'written y = …'],
    ['sqrt(x)', 0, 3, 'none', 'none where it is not smooth'],
    ['abs(x)', 1, 3, 'none', 'none of no complex sense'],
    ['a x', 0, 3, 'letters', 'a letter of its own']
].forEach(function (c) {
    check(series(c[0], c[1], c[2]) === c[3], 'taylor: ' + c[4], series(c[0], c[1], c[2]));
});
check(series('cos(x)', 0, 2, 1) === '1 0 -0.0001523087099', 'taylor: in degrees', series('cos(x)', 0, 2, 1));
check(M.taylor('sin(x)', false, 0, 0, 13).coefs === null, 'taylor: up to the power 12');

// between two curves, and the length of one
check(JSON.stringify(M.between(['x^2', 'x'], false, 0, 0, 1)) === '{"net":-0.1666666667,"area":0.1666666667,"crossings":[]}' &&
    JSON.stringify(M.between(['sin(x)', '0'], false, 0, 0, 2 * Math.PI)) === '{"net":0,"area":4,"crossings":[3.141592653589793]}' &&
    JSON.stringify(M.between(['x^2', 'x+'], false, 0, 0, 1)) === '{"error":"function","which":1}', 'between: net and whole, across a crossing');
check(M.arcLength('x', false, 0, 0, 1).length === 1.414213562 && M.arcLength('x^2', false, 0, 0, 1).length === 1.478942858 &&
    isNaN(M.arcLength('sqrt(1-x^2)', false, 0, -1, 1).length), 'arcLength: a line, a parabola; none where it stands upright');
check(M.exactOf(1.772453851, 1e-9, 'constants', 0, function () { return true; }) === '√π' &&
    M.exactOf(1.234567891, 1e-9, 'constants', 0, function () { return true; }) === null, 'exactOf: an integral\'s, of fractions and constants only');

// limits
function lim(text, a, deg) {
    var r = M.limit(M.fn(text, false), a, deg || 0);
    return [r.left, r.right, r.value].join(' ');
}
[
    ['sin(x)/x', 0, '1 1 1'], ['(1 - cos(x))/x^2', 0, '0.5 0.5 0.5'], ['(x^2 - 1)/(x - 1)', 1, '2 2 2'], ['(e^x - 1)/x', 0, '1 1 1'],
    ['(sqrt(x + 4) - 2)/x', 0, '0.25 0.25 0.25'], ['x sin(1/x)', 0, '0 0 0'], ['x^2', 3, '9 9 9'],
    ['1/x', 0, '-Infinity Infinity NaN'], ['1/x^2', 0, 'Infinity Infinity Infinity'], ['floor(x)', 1, '0 1 NaN'], ['abs(x)/x', 0, '-1 1 NaN'],
    ['sin(1/x)', 0, 'NaN NaN NaN'], ['sqrt(x)', 0, 'NaN 0 0'], ['ln(x)', 0, 'NaN -Infinity -Infinity'], ['x^x', 0, 'NaN 1 1'],
    ['(1 + 1/x)^x', Infinity, '2.71828182846 NaN 2.71828182846'], ['(3x^2 + 1)/(x^2 - 2)', Infinity, '3 NaN 3'], ['x/e^x', Infinity, '0 NaN 0'],
    ['sqrt(x^2 + x) - x', Infinity, '0.5 NaN 0.5'], ['e^x', -Infinity, 'NaN 0 0'], ['sin(x)', Infinity, 'NaN NaN NaN']
].forEach(function (c) {
    check(lim(c[0], c[1]) === c[2], 'limit: ' + c[0] + ' at ' + c[1] + ' is ' + c[2], lim(c[0], c[1]));
});
check(near(+lim('sin(x)/x', 0, 1).split(' ')[2], Math.PI / 180, 1e-10), 'limit: sin(x)/x at 0 in degrees is π/180', lim('sin(x)/x', 0, 1));

// differential equations
function ode(text, x0, y0, x) {
    var r = M.ode(text, false, 0, x0, y0, x);
    return r.error || r.y + ' ' + r.slope;
}
[
    ['y', 0, 1, 1, '2.718281828 2.718281828', 'y′ = y is e^x'],
    ["y' = x + y", 0, 1, 1, '3.436563657 4.436563657', 'y′ = x + y, typed with y′ ='],
    ['dy/dx = -2x y', 0, 1, 2, '0.01831563889 -0.07326255555', 'y′ = –2xy is e^(-x²), typed with dy/dx ='],
    ['cos(x)', 0, 0, Math.PI / 2, '1 0', 'of x alone, an integral'],
    ['x', 0, 0, -2, '2 -2', 'back from x0'],
    ['y^2', 0, 1, 0.5, '2 4', 'y′ = y² to x = 1/2'],
    ['y^2', 0, 1, 2, 'NaN NaN', 'y′ = y² grows without end at x = 1'],
    ['a y', 0, 1, 1, 'letters', 'a letter of its own'],
    ['x +', 0, 1, 1, 'function', 'not a function']
].forEach(function (c) {
    check(ode(c[0], c[1], c[2], c[3]) === c[4], 'ode: ' + c[5], ode(c[0], c[1], c[2], c[3]));
});

(function () { // of a function that jumps: to the digits it settles to, as many as there is time for, in time
    var t = Date.now(), r = M.ode('sin(x)^2 + floor(10x)', false, 0, 0, 0, 3), exact = 43.5 + 1.5 - Math.sin(6) / 4;
    check(near(r.y, exact, 1e-3) && Date.now() - t < 1000, 'ode: of a function that jumps, near enough and in time', r.y + ' in ' + (Date.now() - t) + ' ms');
})();

// eigenvalues and vectors, and A x = b
function eig(a) {
    var e = M.eigen(a);
    return e.values.map(function (z) { return z.im ? z.re + (z.im < 0 ? '-' : '+') + Math.abs(z.im) + 'i' : z.re; }).join(' ') + ' | ' +
        e.vectors.map(function (v) { return v.value + ':' + v.v.join(','); }).join(' ');
}
[
    [[[2, 1], [1, 2]], '1 3 | 1:-1,1 3:1,1', 'symmetric'],
    [[[4, 1], [2, 3]], '2 5 | 2:-1,2 5:1,1', 'its vectors whole'],
    [[[1, 0], [0, 1]], '1 1 | 1:1,0 1:0,1', 'I: one value twice, two vectors'],
    [[[1, 1], [0, 1]], '1 1 | 1:1,0', 'a shear: one value twice, one vector'],
    [[[0, -1], [1, 0]], '0+1i 0-1i | ', 'a turn: ±i'],
    [[[2, 0, 0], [0, 3, 4], [0, 4, 9]], '1 2 11 | 1:0,-2,1 2:1,0,0 11:0,1,2', 'three by three'],
    [[[1, 2, 3, 4], [0, 2, 5, 6], [0, 0, 3, 7], [0, 0, 0, 4]], '1 2 3 4 | 1:1,0,0,0 2:2,1,0,0 3:13,10,2,0 4:44,41,14,2', 'four by four, upper triangular'],
    [[[5]], '5 | 5:1', 'one by one']
].forEach(function (c) {
    check(eig(c[0]) === c[1], 'eigen: ' + c[2], eig(c[0]));
});
check(M.eigen([[1, 2, 3], [4, 5, 6], [7, 8, 9]]).poly.join(' ') === '1 -15 -18 0' && M.eigen([[1, 2, 3]]) === null, 'eigen: the characteristic polynomial; none of a matrix not square');
check(JSON.stringify(M.system([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3])) === '{"x":[2,3,-1]}' &&
    JSON.stringify(M.system([[1, 0], [0, 1], [1, 1]], [1, 2, 3])) === '{"x":[1,2]}' && M.system([[1, 0], [0, 1], [1, 1]], [1, 2, 4]).none &&
    M.system([[1, 1], [2, 2]], [3, 6]).many && M.system([[1, 1, 1]], [3]).many && M.system([[1, 1], [1, 1]], [1e-10, 0]).none &&
    M.system([[1, 1], [3, 3]], [0.1, 0.3]).many, 'system: none where what is left over is small, as b is; three of three; three of two that hold, or not; many answers');

// bits: turned round, counted and turned over
check(String(M.bitwise('1 rol 1', 32).value) === '2' && String(M.bitwise('0x80000000 rol 1', 32).value) === '1' &&
    String(M.bitwise('1 ror 1', 32).value) === '-2147483648' && String(M.bitwise('0xF0 ror 4', 8).value) === '15' && String(M.bitwise('0x0F rol 12', 8).value) === '-16',
    'bitwise: ROL and ROR, by more than the bits as well');
check(JSON.stringify(M.bitCount(BigInt(0xB0), 8)) === '{"ones":3,"leading":0,"trailing":4,"high":7,"low":4}' &&
    JSON.stringify(M.bitCount(BigInt(0), 16)) === '{"ones":0,"leading":16,"trailing":16,"high":-1,"low":-1}' &&
    String(M.flipBit(BigInt(0), 8, 7)) === '-128' && String(M.flipBit(BigInt(-1), 8, 0)) === '-2', 'bitCount and flipBit');

// floating point
(function () {
    var r = M.float('0.1', false, 0), f = M.float('0x3DCCCCCD', false, 0);
    check(r.hex64 === '3FB999999999999A' && r.hex32 === '3DCCCCCD' && r.exponent === -4 && r.kind === 'Normal' && r.sign === 1 &&
        r.exact === '0.1000000000000000055511151231257827021181583404541015625' && r.exact32 === '0.100000001490116119384765625' &&
        r.ulp === Math.pow(2, -56) && r.bits === '0 01111111011 1001100110011001100110011001100110011001100110011010', 'float: 0.1 as a double and a float');
    check(f.of === 32 && f.x === Math.fround(0.1) && M.float('0x3FB999999999999A', false, 0).x === 0.1, 'float: from the bits of a float and of a double');
    check(M.float('-2.5', false, 0).hex64 === 'C004000000000000' && M.float('-2.5', false, 0).exact === '–2.5' && M.float('2^53', false, 0).ulp === 2 &&
        M.float('2^53', false, 0).exact === '9007199254740992', 'float: below 0, and a whole number');
    check(M.float('5e-324', false, 0).kind === 'Subnormal' && M.float('5e-324', false, 0).exact === '4.94065645841246544176568792868221372365059802614324764425585…e-324' &&
        /^1\.00000000000000005250476025520442024870446858110815915491585…e\+300$/.test(M.float('1e300', false, 0).exact) && M.float('1e300', false, 0).exact32 === '∞',
        'float: the smallest, and a large one, as e-324 and e+300', M.float('5e-324', false, 0).exact);
    check(M.float('inf', false, 0).kind === 'Infinity' && M.float('nan', false, 0).kind === 'NaN' && M.float('0', false, 0).kind === 'Zero' &&
        M.float('-0', false, 0).exact === '–0' && M.float('abc', false, 0).error === 'number', 'float: ∞, NaN, 0 and -0; what is not a number');
    check(M.float('1.7976931348623157e308', false, 0).ulp === Math.pow(2, 971) && M.float('-1.7976931348623157e308', false, 0).ulp === Math.pow(2, 971),
        'float: the gap by the largest, not ∞', M.float('1.7976931348623157e308', false, 0).ulp);
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exitCode = failures ? 1 : 0;
