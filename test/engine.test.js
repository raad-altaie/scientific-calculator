// Run with: node test/engine.test.js
'use strict';

var Engine = require('../js/engine.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail ? '\n      ' + detail : ''));
    }
}

function same(actual, expected) {
    if (typeof expected === 'number') {
        return Math.abs(+actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));
    }
    return actual === expected;
}

function state(e) {
    return (e.error ? 'Error' : e.value) + ' | ' + e.equation();
}

// presses space separated keys
function run(e, keys, deg) {
    keys.split(' ').forEach(function (key) {
        e.press(key, deg);
    });
}

// [keys, display value ('Error' for an error), equation line, degrees?]
var cases = [
    // numbers
    ['1 2', '12', '12'],
    ['1 . . 5', '1.5', '1.5'],
    ['1 2 .', '12.', '12.'],
    ['0 0 7', '7', '7'],
    ['1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6', '123456789012345', '123456789012345'],
    ['1 2 . +', '12', '12 +'],
    ['0 . 5 0 +', '0.5', '0.50 +'],

    // operators and precedence
    ['2 + 3', '3', '2 + 3'],
    ['2 + 3 =', '5', '2 + 3 ='],
    ['2 + 3 × 4', '4', '2 + 3 × 4'],
    ['2 + 3 × 4 =', '14', '2 + 3 × 4 ='],
    ['2 + 3 × 4 +', '14', '2 + 3 × 4 +'],
    ['2 × 3 +', '6', '2 × 3 +'],
    ['2 × 3 + 4 =', '10', '2 × 3 + 4 ='],
    ['2 – 3 – 4 =', '-5', '2 – 3 – 4 ='],
    ['8 ÷ 4 ÷ 2 =', '1', '8 ÷ 4 ÷ 2 ='],
    ['2 × 3 yx 2 + 1 =', '19', '2 × 3^2 + 1 ='],
    ['+ 3 =', '3', '0 + 3 ='],

    // operator typed twice replaces the first
    ['2 + ×', '2', '2 ×'],
    ['2 + × 3 =', '6', '2 × 3 ='],
    ['2 + 3 + × 4 =', '20', '(2 + 3) × 4 ='],
    ['2 + 3 × + 4 =', '9', '2 + 3 + 4 ='],
    ['2 + 3 × +', '5', '2 + 3 +'],
    ['2 – 3 × – 4 =', '-5', '2 – 3 – 4 ='],
    ['2 × 3 + × 4 =', '24', '2 × 3 × 4 ='],
    ['2 + 3 × yx 2 =', '11', '2 + 3^2 ='],

    // powers, roots, EE
    ['2 yx 3 =', '8', '2^3 ='],
    ['2 yx', '2', '2^'],
    ['2 yx 3 yx 2 =', '64', '(2^3)^2 ='],
    ['2 +/– yx 2 =', '4', '(-2)^2 ='],
    ['2 yx 2 +/– =', '0.25', '2^(-2) ='],
    ['8 x√y', '8', '<sup>x</sup>√8'],
    ['8 x√y 3 =', '2', '<sup>3</sup>√8 ='],
    ['5 EE', '5', '5E'],
    ['5 EE 3 =', '5000', '5E3 ='],
    ['5 EE 3 +/– =', 0.005, '5E-3 ='],
    ['5 EE 3 yx 2 =', '25000000', '(5E3)^2 ='],

    // percent
    ['5 0 %', '0.5', '50%'],
    ['2 0 0 + 1 0 %', '20', '200 + 10%'],
    ['2 0 0 + 1 0 % =', '220', '200 + 10% ='],
    ['2 0 0 – 1 0 % =', '180', '200 – 10% ='],
    // after × or ÷ a percent is a hundredth, not a share of the other number
    ['5 0 0 × 8 %', '0.08', '500 × 8%'],
    ['5 0 0 × 8 % =', '40', '500 × 8% ='],
    ['2 0 0 ÷ 5 0 % =', '400', '200 ÷ 50% ='],
    ['2 0 0 + 5 0 × 1 0 % =', '205', '200 + 50 × 10% ='],
    ['1 0 % x2', 0.01, '(10%)<sup>2</sup>'],
    // the share keeps its value when more follows, and the line then shows that value
    ['2 0 0 + 1 0 % × 3 =', '260', '200 + 20 × 3 ='],
    ['2 0 0 + 1 0 % yx 2 =', '600', '200 + 20^2 ='],
    ['2 0 0 + 1 0 % x2 =', '600', '200 + 20<sup>2</sup> ='],
    ['2 0 0 + 5 0 % √ =', '210', '200 + √(100) ='],
    ['2 0 0 + 1 0 % +/– =', '180', '200 + -10% ='],
    ['2 0 0 + 1 0 % +/– × 2 =', '160', '200 + -20 × 2 ='],
    ['2 0 0 + 1 0 % × + 1 =', '221', '200 + 20 + 1 ='],
    ['2 0 0 + 1 0 % % =', '240', '200 + 20% ='],
    ['5 0 0 × 8 % × 2 =', '80', '500 × 8% × 2 ='],
    ['2 0 0 + 1 0 % = =', '240', '220 + 20 ='],
    ['1 6 +/– x√y . 5 =', '256', '<sup>0.5</sup>√(-16) ='],
    ['2 +/– x√y . 2 =', '-32', '<sup>0.2</sup>√(-2) ='],
    ['2 +/– x√y . 3 =', 'Error', '<sup>0.3</sup>√(-2) ='],

    // 1/x next to × or ÷ keeps its brackets, so the line reads as it was computed
    ['8 ÷ 2 1/x =', '16', '8 ÷ (1/2) ='],
    ['8 × 2 1/x =', '4', '8 × (1/2) ='],
    ['8 + 2 1/x =', '8.5', '8 + 1/2 ='],
    ['2 1/x × 8 =', '4', '1/2 × 8 ='],

    // functions apply to the shown value
    ['3 0 sin', 0.5, 'sin(30)', true],
    ['3 0 sin ln', Math.log(0.5), 'ln(sin(30))', true],
    ['9 0 cos', 0, 'cos(90)', true],
    ['π sin', '0', 'sin(3.14159265359)'],
    ['0 . 5 sin-1', 30, 'sin<sup>-1</sup>(0.5)', true],
    ['1 tan-1', Math.PI / 4, 'tan<sup>-1</sup>(1)'],
    ['1 sinh-1', Math.asinh(1), 'sinh<sup>-1</sup>(1)'],
    ['8 log2', '3', 'log<sub>2</sub>(8)'],
    ['1 0 0 0 log', '3', 'log(1000)'],
    ['9 √', '3', '√(9)'],
    ['( 2 + 3 ) sin', Math.sin(5), 'sin(2 + 3)'],
    ['2 × 3 + sin', Math.sin(6), '2 × 3 + sin(6)'],
    ['2 + 9 √ =', '5', '2 + √(9) ='],
    ['3 0 sin 5', '5', '5'],
    ['2 + 3 0 sin 5', '5', '2 + 5'],

    // x2, x3, x!, 1/x, e^x, 2^x
    ['5 x2', '25', '5<sup>2</sup>'],
    ['5 x2 x2', '625', '(5<sup>2</sup>)<sup>2</sup>'],
    ['2 x3', '8', '2<sup>3</sup>'],
    ['( 2 + 3 ) x2', '25', '(2 + 3)<sup>2</sup>'],
    ['5 +/– x2', '25', '(-5)<sup>2</sup>'],
    ['5 x!', '120', '5!'],
    ['0 x!', '1', '0!'],
    ['2 . 5 x!', 15 * Math.sqrt(Math.PI) / 8, '2.5!'],
    ['3 +/– x!', 'Error', '(-3)!'],
    ['4 1/x', '0.25', '1/4'],
    ['( 2 + 3 ) 1/x', '0.2', '1/(2 + 3)'],
    ['5 x! 1/x', 1 / 120, '1/(5!)'],
    ['2 ex', Math.exp(2), 'e^2'],
    ['3 2x', '8', '2^3'],
    ['1 +/– ex', Math.exp(-1), 'e^(-1)'],

    // constants
    ['2 × π', String(Math.PI), '2 × 3.14159265359'],
    ['2 × π =', 2 * Math.PI, '2 × 3.14159265359 ='],
    ['π', String(Math.PI), '3.14159265359'],
    ['π 5', '5', '5'],

    // sign
    ['5 +/–', '-5', '-5'],
    ['5 +/– +/–', '5', '5'],
    ['+/– 5', '-5', '-5'],
    ['5 × +/– 3', '-3', '5 × -3'],
    ['5 × +/– 3 =', '-15', '5 × -3 ='],
    ['5 × +/–', '-0', '5 × -0'],
    ['5 × +/– +/–', '0', '5 × 0'],
    ['3 0 sin +/–', -0.5, '-sin(30)', true],
    ['3 0 sin +/– +/–', 0.5, 'sin(30)', true],
    ['( 2 + 3 ) +/–', '-5', '-(2 + 3)'],
    ['π +/–', String(-Math.PI), '-3.14159265359'],
    ['5 x! +/–', '-120', '-5!'],
    ['( +/– 5 )', '-5', '(-5)'],
    ['2 + 3 = +/–', '-5', '-5'],
    ['2 + 3 = +/– + 1 =', '-4', '-5 + 1 ='],

    // brackets
    ['(', '0', '('],
    ['2 × (', '2', '2 × ('],
    ['2 × ( 3 + 4', '4', '2 × (3 + 4'],
    ['2 × ( 3 + 4 )', '7', '2 × (3 + 4)'],
    ['2 × ( 3 + 4 ) =', '14', '2 × (3 + 4) ='],
    ['2 × ( 3 + 4 =', '14', '2 × (3 + 4) ='],
    ['( ( 1 + 2 ) × 3 ) + 4 =', '13', '((1 + 2) × 3) + 4 ='],
    ['2 × ( 3 + ( 4 × ( 5 – 1 =', '38', '2 × (3 + (4 × (5 – 1))) ='],
    ['2 yx ( 1 + 2', '2', '2^(1 + 2'],
    ['2 yx ( 1 + 2 ) =', '8', '2^(1 + 2) ='],
    ['8 x√y ( 1 + 2 ) =', '2', '<sup>(1 + 2)</sup>√8 ='],
    ['( 5 )', '5', '(5)'],
    ['( 2 + )', '4', '(2 + 2)'],

    // a bracket after a value multiplies
    ['5 (', '5', '5 × ('],
    ['5 ( 2 + 1 ) =', '15', '5 × (2 + 1) ='],
    ['( 2 + 3 ) ( 4 + 5 ) =', '45', '(2 + 3) × (4 + 5) ='],
    ['π ( 2 )', '2', '3.14159265359 × (2)'],
    ['2 + 3 ( 4 ) =', '14', '2 + 3 × (4) ='],

    // equals
    // a number alone with = is not an equation: the line stays empty
    ['7 =', '7', ''],
    ['7 = =', '7', ''],
    ['7 +/– =', '-7', ''],
    ['1 2 . 5 =', '12.5', ''],
    ['=', '0', ''],
    ['π =', String(Math.PI), ''],
    ['9 √ =', '3', '√(9) ='],
    ['2 + =', '4', '2 + 2 ='],
    ['2 + 3 = =', '8', '5 + 3 ='],
    ['2 + 3 = = =', '11', '8 + 3 ='],
    ['2 × ( 3 + 4 = =', '98', '14 × 7 ='],
    ['2 + 3 = 7 =', '7', ''],
    ['2 + 3 = 7 = =', '10', '7 + 3 ='],
    ['2 yx 3 = =', '512', '8^3 ='],
    ['5 EE 2 = =', '50000', '500E2 ='],
    ['2 + 3 = + 4', '4', '5 + 4'],
    ['2 + 3 = × 4 =', '20', '5 × 4 ='],
    ['2 + 3 = sin', Math.sin(5), 'sin(5)'],
    ['2 + 3 = sin =', Math.sin(5), 'sin(5) ='],
    ['2 + 3 = 7', '7', '7'],
    ['2 + 3 = ( 4', '4', '(4'],
    ['1 ÷ 3 = + 1', '1', '0.3333333333333 + 1'],
    ['2 yx 6 0 = + 1', '1', '1.152921504607e+18 + 1'],
    ['2 yx 4 0 = + 1', '1', '1099511627776 + 1'],
    ['1 0 0 0 0 0 0 0 0 0 0 0 × 1 = + 1', '1', '100000000000 + 1'],
    ['1 2 3 4 5 6 7 8 9 0 1 2 . 5 × 1 = + 1', '1', '123456789012.5 + 1'],
    ['1 ÷ 3 0 0 0 0 0 0 0 = + 1', '1', '3.333333333333e-8 + 1'],
    ['2 ÷ 3 = +/– + 1', '1', '-0.6666666666667 + 1'],
    ['1 . 1 + 2 . 2 = × 1', '1', '3.3 × 1'],

    // C clears the current number, AC everything
    ['5 + 3 C', '0', '5 +'],
    ['5 + 3 C 4 =', '9', '5 + 4 ='],
    ['5 + 3 C =', '5', '5 + 0 ='],
    ['5 + 3 0 sin C', '0', '5 +'],
    ['2 + 3 = C', '0', ''],
    ['5 + ( 3 AC', '0', ''],
    ['5 + ( 3 AC 2 + 1 =', '3', '2 + 1 ='],

    // errors reset the calculation and keep the failed line
    ['5 ÷ 0 =', 'Error', '5 ÷ 0 ='],
    ['5 ÷ 0 +', 'Error', '5 ÷ 0 +'],
    ['0 1/x', 'Error', '1/0'],
    ['4 +/– √', 'Error', '√(-4)'],
    ['2 sin-1', 'Error', 'sin<sup>-1</sup>(2)'],
    ['2 × ( 1 ÷ 0 )', 'Error', '2 × (1 ÷ 0)'],
    ['1 EE 9 9 9 =', 'Error', '1E999 ='],
    ['9 x√y 0 =', 'Error', '<sup>0</sup>√9 ='],
    ['5 ÷ 0 = 2 + 1 =', '3', '2 + 1 ='],
    ['0 1/x + 4 =', '4', '0 + 4 =']
];

cases.forEach(function (c) {
    var e = new Engine();
    run(e, c[0], c[3]);
    check(c[1] === 'Error' ? e.error : !e.error && same(e.value, c[1]), c[0] + '  value',
        'expected ' + c[1] + ', got ' + (e.error ? 'Error' : e.value));
    check(e.equation() === c[2], c[0] + '  line', 'expected "' + c[2] + '", got "' + e.equation() + '"');
});

// ---------- a number alone is not an expression ---------- //

(function () {
    var e = new Engine();
    check(e.plain(), 'plain at the start');
    run(e, '1 2 .');
    check(e.plain(), 'plain while typing a number');
    e.press('+/–');
    check(e.plain(), 'plain with a sign');
    e.press('+');
    check(!e.plain(), 'not plain with an operator');
    run(e, 'AC 9 √');
    check(!e.plain(), 'not plain with a function');
    run(e, 'AC (');
    check(!e.plain(), 'not plain with an open bracket');
    run(e, 'AC 7 m+ AC mr');
    check(e.plain(), 'plain after mr');
})();

// ---------- rejected keys ---------- //

(function () {
    var e = new Engine();
    check(!e.press(')'), ') with nothing open is ignored');
    e.press('(');
    check(!e.press(')'), ') with nothing inside is ignored');
    check(e.levels.length === 2 && state(e) === '0 | (', 'an ignored key changes nothing', state(e));
    check(!e.press('2nd') && !e.press('Deg'), 'non calculation keys are ignored');
    run(e, 'AC 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5');
    check(!e.press('6'), 'a 16th digit is ignored');
    check(e.press('.') && !e.press('.'), 'a second point is ignored');
    run(e, 'AC 5 ÷ 0 =');
    check(!e.press('Deg') && e.error, 'an ignored key keeps the error');
})();

// ---------- DEL ---------- //

// [keys, the states DEL walks back through; after the last one DEL does nothing]
var dels = [
    // digits, then operators, down to nothing
    ['1 1 + 2 2', ['2 | 11 + 2', '11 | 11 +', '11 | 11', '1 | 1', '0 | ']],
    ['1 . 5', ['1. | 1.', '1 | 1', '0 | ']],
    ['0 0 5', ['0 | 0', '0 | ']],
    ['+/– 5', ['-0 | -0', '0 | ']],
    ['5 +/– +', ['-5 | -5', '5 | 5', '0 | ']],
    ['2 × 3 + 4', ['6 | 2 × 3 +', '3 | 2 × 3', '2 | 2 ×', '2 | 2', '0 | ']],
    ['1 EE 5', ['1 | 1E', '1 | 1', '0 | ']],
    ['9 x√y 2', ['9 | <sup>x</sup>√9', '9 | 9', '0 | ']],

    // functions and brackets
    ['3 0 sin', ['30 | 30', '3 | 3', '0 | ']],
    ['5 0 %', ['50 | 50', '5 | 5', '0 | ']],
    ['2 × ( 3 + 4 )', ['4 | 2 × (3 + 4', '3 | 2 × (3 +', '3 | 2 × (3', '2 | 2 × (', '2 | 2 ×', '2 | 2', '0 | ']],
    ['5 ( 2', ['5 | 5 × (', '5 | 5', '0 | ']],

    // an operator typed again leaves nothing of the old one
    ['2 + ×', ['2 | 2', '0 | ']],
    ['2 × 3 + ×', ['3 | 2 × 3', '2 | 2 ×', '2 | 2', '0 | ']],

    // a replaced or cleared operand does not come back
    ['5 + 3 C', ['5 | 5', '0 | ']],
    ['2 + 3 0 sin C', ['2 | 2', '0 | ']],
    ['2 + 3 0 sin 7', ['2 | 2 +', '2 | 2', '0 | ']],
    ['2 × ( 3 + 4 ) 9', ['2 | 2 ×', '2 | 2', '0 | ']],
    ['2 + 3 π', ['2 | 2 +', '2 | 2', '0 | ']],
    ['5 ( 2 ) π', ['5 | 5 ×', '5 | 5', '0 | ']],
    ['5 ( 2 ) 3', ['5 | 5 ×', '5 | 5', '0 | ']],
    ['1 + 5 ( 2 ) π', ['5 | 1 + 5 ×', '5 | 1 + 5', '1 | 1 +', '1 | 1', '0 | ']],
    ['2 × ( 5 ( 2 ) π', ['5 | 2 × (5 ×', '5 | 2 × (5', '2 | 2 × (', '2 | 2 ×', '2 | 2', '0 | ']],
    ['7 m+ 8', ['0 | ']],

    // never back into a finished calculation
    ['2 + 3 =', []],
    ['2 + 3 = =', []],
    ['2 + 3 = 7', ['0 | ']],
    ['2 + 3 = 7 8', ['7 | 7', '0 | ']],
    ['2 + 3 = + 4', ['5 | 5 +', '5 | 5']],
    ['2 + 3 = sin', ['5 | 5']],
    ['2 + 3 = (', ['0 | ']],
    ['2 + 3 = C', []],
    ['2 + 3 = AC', []],
    ['5 ÷ 0 =', []],
    ['5 ÷ 0 = 8 +', ['8 | 8', '0 | ']]
];

dels.forEach(function (c) {
    var e = new Engine(), i, before;
    run(e, c[0]);
    for (i = 0; i < c[1].length; i++) {
        if (!e.del() || state(e) !== c[1][i]) break;
    }
    check(i === c[1].length, c[0] + '  DEL', 'step ' + (i + 1) + ': expected "' + c[1][i] + '", got "' + state(e) + '"');
    before = state(e);
    check(!e.del() && state(e) === before, c[0] + '  DEL stops', state(e));
});

(function () {
    var e = new Engine(), i;
    run(e, '1 2 3');
    e.del();
    e.press('4');
    check(state(e) === '124 | 124', 'typing continues after DEL', state(e));
    run(e, 'AC 2 + 3');
    e.del();
    e.del();
    run(e, '× 4 =');
    check(state(e) === '8 | 2 × 4 =', 'the calculation continues after DEL', state(e));
    run(e, 'AC 5 ÷ 0 =');
    check(!e.del() && e.error, 'DEL keeps the error', state(e));
    e.press('AC');
    for (i = 0; i < 80; i++) e.press(i % 2 ? 'sin' : 'cos');
    check(e.history.length === 50, 'what DEL can take back is capped', String(e.history.length));
    run(e, 'AC 1 2 3');
    e.history = [];
    check(e.del() && state(e) === '12 | 12', 'DEL removes a digit even with nothing remembered', state(e));
    e.del();
    check(e.del() && state(e) === '0 | ' && !e.del(), 'and stops at 0', state(e));
})();

// ---------- very long calculations stay small ---------- //

(function () {
    var e = new Engine(), i, saved;
    for (i = 0; i < 500; i++) run(e, '1 2 +');
    saved = JSON.stringify(e.save()).length;
    check(e.value === '6000', '500 additions in a row give the right sum', e.value);
    check(saved < 150000, 'their saved state stays small', saved + ' chars');
    check(e.equation().length < 400 && / \+ 12 \+$/.test(e.equation()), 'the line continues from a subtotal', e.equation().slice(-30));
    run(e, '1 2 =');
    check(e.value === '6012', 'and the calculation continues', e.value);
    e.press('AC');
    e.press('5');
    for (i = 0; i < 5000; i++) e.press('cos');
    check(Math.abs(e.value - 0.7390851332) < 1e-9 && e.equation().length < 800, '5000 nested functions', e.equation().length + ' chars');
    e.press('AC');
    for (i = 0; i < 5000; i++) e.press('(');
    check(e.levels.length === 30 && e.equation().length === 29, 'open brackets are limited', String(e.levels.length));
    e.press('AC');
    e.press('5');
    for (i = 0; i < 5000; i++) e.press('%');
    check(!e.error && e.equation().length < 400, '5000 percents', e.equation().length + ' chars');
})();

// ---------- memory ---------- //

(function () {
    var e = new Engine();
    run(e, '7 m+ AC 2 × mr =');
    check(state(e) === '14 | 2 × 7 =', 'mr recalls the memory', state(e));
    run(e, 'AC 2 + 3 m+');
    check(e.memory === 10 && state(e) === '3 | 2 + 3', 'm+ leaves the calculation alone', state(e));
    e.press('4');
    check(state(e) === '4 | 2 + 4', 'a digit after m+ starts a new number', state(e));
    run(e, 'AC 4 m- mr');
    check(e.memory === 6 && e.value === '6', 'm- subtracts', state(e));
    run(e, 'mc mr');
    check(e.memory === 0 && e.value === '0', 'mc clears the memory', state(e));
    run(e, 'AC 5 +/– m+ AC 2 – mr =');
    check(state(e) === '7 | 2 – -5 =', 'negative memory', state(e));
})();

// ---------- Rand and paste ---------- //

(function () {
    var e = new Engine();
    run(e, '2 + Rand');
    check(+e.value >= 0 && +e.value < 1 && /^2 \+ 0\.\d+$/.test(e.equation()), 'Rand', state(e));
    run(e, 'AC 2 +');
    check(e.paste('42abc') && state(e) === '42 | 2 + 42', 'paste', state(e));
    e.press('=');
    check(state(e) === '44 | 2 + 42 =', 'paste is used as the operand', state(e));
    check(!e.paste('abc') && state(e) === '44 | 2 + 42 =', 'non numeric paste is ignored', state(e));
    run(e, 'AC 2 + 3');
    e.paste('9');
    check(e.del() && state(e) === '2 | 2 +', 'DEL removes a pasted number', state(e));
})();

// ---------- save and load ---------- //

(function () {
    var a = new Engine(), b = new Engine();
    run(a, '2 × ( 3 + 4 0 sin');
    b.load(JSON.parse(JSON.stringify(a.save())));
    check(state(b) === state(a), 'a loaded engine shows the same state', state(b));
    run(a, ') + 1 =');
    run(b, ') + 1 =');
    check(state(b) === state(a), 'a loaded engine continues the same way', state(b));
    run(a, 'AC 2 × ( 3 + 4');
    b.load(JSON.parse(JSON.stringify(a.save())));
    b.del();
    b.del();
    check(state(b) === '3 | 2 × (3', 'a loaded engine keeps what DEL can take back', state(b));
    b.load({ state: a.snapshot() });
    check(state(b) === state(a) && b.del() && state(b) === '0 | 2 × (3 +', 'state saved without it still loads', state(b));
    b.load({ state: a.snapshot(), history: ['{}'] });
    check(b.del() && state(b) === '0 | 2 × (3 +', 'unreadable saved steps are skipped', state(b));
    try {
        b.load({ state: '{}', history: [] });
        check(false, 'bad saved state is refused');
    } catch (err) {
        check(true, 'bad saved state is refused');
    }
})();

// ---------- loads in a page ---------- //

(function () {
    var win = {};
    require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../js/engine.js', 'utf8'), { window: win });
    check(typeof win.CalcEngine === 'function', 'the engine registers itself on window');
})();

// ---------- copy and paste of equations ---------- //

(function () {
    // [keys, the text copy takes, degrees?]
    var copies = [
            ['2 × ( 3 + 4 0 sin', '2 × (3 + sin(40)'],
            ['5 x2 + 2 x3', '5² + 2³'],
            ['8 x√y 3 + 1', '³√8 + 1'],
            ['8 x√y', 'ˣ√8'],
            ['8 x√y ( 1 + 2 )', '8^(1/(1 + 2))'],
            ['0 . 5 sin-1', 'sin⁻¹(0.5)', true],
            ['8 log2 +', 'log₂(8) +'],
            ['5 EE 3 +/–', '5E-3'],
            ['2 yx 3 yx 2', '(2^3)^2'],
            ['2 +/– yx 2', '(-2)^2'],
            ['5 +/– x2', '(-5)²'],
            ['2 ex × 3 2x', 'e^2 × 2^3'],
            ['5 x! +/–', '-5!'],
            ['2 0 0 + 1 0 %', '200 + 10%'],
            ['( 2 + 3 ) ( 4 + 5 )', '(2 + 3) × (4 + 5)'],
            ['4 1/x + 1', '1/4 + 1'],
            ['1 ÷ 3 = + 1', '0.3333333333333 + 1'],
            ['2 yx 6 0 = + 1', '1.152921504607e+18 + 1'],
            ['3 0 sin ln', 'ln(sin(30))', true],
            ['2 yx ( 1 + 2', '2^(1 + 2'],
            ['5 × +/– 3', '5 × -3'],
            ['9 √ +/–', '-√(9)'],
            ['2 + 3 × 4 =', '2 + 3 × 4 =']
        ],
        // [pasted text, value ('Error' for an error), equation, degrees?]
        pastes = [
            ['2*(3+4)', '7', '2 × (3 + 4)'],
            ['2*(3+4)=', '14', '2 × (3 + 4) ='],
            ['=2+3*4', '4', '2 + 3 × 4'],
            ['2+3=5', '5', '2 + 3 ='],
            ['sqrt(16)+2^3=', '12', '√(16) + 2^3 ='],
            ['asin(0.5)', 30, 'sin<sup>-1</sup>(0.5)', true],
            ['sin^-1(0.5)', 30, 'sin<sup>-1</sup>(0.5)', true],
            ['sin^(-1)(0.5)', 30, 'sin<sup>-1</sup>(0.5)', true],
            ['sin⁻¹(0.5)', 30, 'sin<sup>-1</sup>(0.5)', true],
            ['2^3^2=', '512', '2^(3^2) ='],
            ['-2^2=', '-4', '-(2^2) ='],
            ['(-2)^2=', '4', '(-2)^2 ='],
            ['2π', String(Math.PI), '2 × 3.14159265359'],
            ['2*pi=', 2 * Math.PI, '2 × 3.14159265359 ='],
            ['e', String(Math.E), '2.718281828459'],
            ['2*e+1=', 2 * Math.E + 1, '2 × 2.718281828459 + 1 ='],
            ['e^2=', Math.exp(2), 'e^2 ='],
            ['2(3+4)=', '14', '2 × (3 + 4) ='],
            ['5!', '120', '5!'],
            ['10%', '0.1', '10%'],
            ['5²', '25', '5<sup>2</sup>'],
            ['5⁴=', '625', '5^4 ='],
            ['³√8=', '2', '<sup>3</sup>√8 ='],
            ['∛27=', '3', '<sup>3</sup>√27 ='],
            ['ˣ√8', '8', '<sup>x</sup>√8'],
            ['5E3=', '5000', '5E3 ='],
            ['1.5e-7 + 1', '1', '1.5E-7 + 1'],
            ['1,234.5 + 1', '1', '1234.5 + 1'],
            ['1.234,5 + 1', '1', '1234.5 + 1'],
            ['1,500 + 1=', '1501', '1500 + 1 ='],
            ['1,5 + 2,5=', '4', '1.5 + 2.5 ='],
            ['2,50 + 0,5=', '3', '2.50 + 0.5 ='],
            ['0,123 + 1=', '1.123', '0.123 + 1 ='],
            ['1.234.567 + 1=', '1234568', '1234567 + 1 ='],
            ['1,234,567.5 + 1=', '1234568.5', '1234567.5 + 1 ='],
            ['1.234 + 1=', '2.234', '1.234 + 1 ='],
            ['1,5', '1.5', '1.5'],
            ['2 x 3=', '6', '2 × 3 ='],
            ['2 − 3 – 4 — 5=', '-10', '2 – 3 – 4 – 5 ='],
            ['2·3÷4=', '1.5', '2 × 3 ÷ 4 ='],
            ['2**10=', '1024', '2^10 ='],
            ['e^2', Math.exp(2), 'e^2'],
            ['ln(e^3)=', 3, 'ln(e^3) ='],
            ['log10(1000)', '3', 'log(1000)'],
            ['log2(8)', '3', 'log<sub>2</sub>(8)'],
            ['log₂(8)', '3', 'log<sub>2</sub>(8)'],
            ['sin 30', 0.5, 'sin(30)', true],
            ['sin(30', 0.5, 'sin(30)', true],
            ['-(2+3)', '-5', '-(2 + 3)'],
            ['2--3=', '5', '2 – -3 ='],
            ['2^-2=', '0.25', '2^(-2) ='],
            ['1/4=', '0.25', '1 ÷ 4 ='],
            ['3 + ', '3', '3 +'],
            ['((2', '2', '((2'],
            ['5/0=', 'Error', '5 ÷ 0 ='],
            ['√(-4) + 2', 'Error', '√(-4)'],
            // numbers, and text that only starts with one, as before
            ['42', '42', '42'],
            ['-5', '-5', '-5'],
            ['1e21', '1e+21', '1e+21'],
            ['1E2', '100', '100'],
            ['3E+2', '300', '300'],
            ['1.5E-7', '1.5e-7', '1.5e-7'],
            // E right after a number is always "times ten to the power", e is Euler's number
            ['2E(3)=', '2000', '2E(3) ='],
            ['2Esin(0)=', '2', '2Esin(0) ='],
            ['2e', Math.E, '2 × 2.718281828459'],
            ['1,234', '1234', '1234'],
            ['42abc', '42', '42'],
            ['2 + abc', '2', '2'],
            // numbers with more digits than the keys take are still part of the equation
            ['1234567890123456 + 1', '1', '1234567890123456 + 1'],
            ['1234567890123456 + 1 =', '1234567890123457', '1234567890123456 + 1 ='],
            ['0.003333333333333 × 2 =', 0.006666666666666, '0.003333333333333 × 2 ='],
            ['3.14159265358979323846 * 2 =', 2 * Math.PI, '3.14159265359 × 2 =']
        ],
        e, i;

    copies.forEach(function (c) {
        var a = new Engine(), b = new Engine();
        run(a, c[0], c[2]);
        check(a.text() === c[1], c[0] + '  copy', 'expected "' + c[1] + '", got "' + a.text() + '"');
        check(b.paste(a.text(), c[2]), c[1] + '  pastes back');
        a.press('=', c[2]);
        b.press('=', c[2]);
        check(!a.error && !b.error && same(b.value, +a.value), c[1] + '  pastes back to the same result',
            a.value + ' became ' + b.value);
    });

    pastes.forEach(function (c) {
        var e = new Engine(), ok = e.paste(c[0], c[3]);
        check(ok && (c[1] === 'Error' ? e.error : !e.error && same(e.value, c[1])), 'paste ' + c[0] + '  value',
            'expected ' + c[1] + ', got ' + (ok ? e.error ? 'Error' : e.value : 'refused'));
        check(e.equation() === c[2], 'paste ' + c[0] + '  line', 'expected "' + c[2] + '", got "' + e.equation() + '"');
    });

    ['abc', '× 2', '', '   ', '()', '$5.00', new Array(40).join('(') + '2', new Array(5000).join('(')].forEach(function (text) {
        var e = new Engine(), before;
        run(e, '2 + 3');
        before = e.snapshot() + e.history.length;
        check(!e.paste(text) && e.snapshot() + e.history.length === before, 'paste ' + JSON.stringify(text.slice(0, 12)) + ' is refused');
    });

    e = new Engine();
    run(e, '2 + 3');
    e.paste('4*5');
    check(state(e) === '5 | 2 + 4 × 5', 'an equation replaces the number being typed', state(e));
    run(e, 'AC 2 +');
    e.paste('4*5');
    check(state(e) === '5 | 2 + 4 × 5', 'an equation continues after an operator', state(e));
    run(e, 'AC 2 + 3 =');
    e.paste('4*5');
    check(state(e) === '5 | 4 × 5', 'an equation starts again after a result', state(e));
    // after a waiting power, root or EE the pasted text stays in one piece
    [['2 yx', '1E2', '2^100 ='], ['2 yx', '1e2', '2^100 ='], ['2 yx', '1E2+5', '2^(1E2) + 5 ='],
        ['2 yx', '2^3', '2^(2^3) ='], ['2 yx', '3+1', '2^3 + 1 ='], ['5 EE', '2^3', '5E(2^3) ='],
        ['8 x√y', '3', '<sup>3</sup>√8 ='], ['2 yx', '(1+2', '2^(1 + 2) ='], ['5 ×', '2+3', '5 × 2 + 3 =']
    ].forEach(function (c) {
        var a = new Engine();
        run(a, c[0]);
        a.paste(c[1]);
        a.press('=');
        check(a.equation() === c[2], c[0] + ' then paste ' + c[1], 'expected "' + c[2] + '", got "' + a.equation() + '"');
    });
    e = new Engine();
    run(e, '2 yx');
    e.paste('1E2');
    run(e, '=');
    check(same(e.value, Math.pow(2, 100)), '2^ and 1E2 is 2^100 like 2^ and 1e2', e.value);
    run(e, 'AC 3 0 sin');
    e.paste('(1+2)');
    check(state(e) === '3 | (1 + 2)', 'an equation replaces a function result', state(e));
    run(e, 'AC 5 ÷ 0 =');
    e.paste('1+1');
    check(state(e) === '1 | 1 + 1', 'an equation after an error', state(e));
    run(e, 'AC');
    e.paste('2+34');
    check(e.del() && state(e) === '3 | 2 + 3', 'DEL edits a pasted equation', state(e));
    for (i = 0; i < 10 && e.del(); i++);
    check(state(e) === '0 | ', 'DEL takes a pasted equation back completely', state(e));
})();

// ---------- accuracy ---------- //

(function () {
    var ROOT_PI = Math.sqrt(Math.PI),
        // [keys, the exact value ('Error' for an error), degrees?]
        exact = [
            // whole degrees
            ['1 8 0 sin', '0', true],
            ['3 6 0 sin', '0', true],
            ['9 0 cos', '0', true],
            ['2 7 0 cos', '0', true],
            ['1 8 0 tan', '0', true],
            ['3 0 sin', '0.5', true],
            ['1 5 0 sin', '0.5', true],
            ['2 1 0 sin', '-0.5', true],
            ['3 0 +/– sin', '-0.5', true],
            ['7 2 0 0 3 0 sin', '0.5', true],
            ['6 0 cos', '0.5', true],
            ['1 2 0 cos', '-0.5', true],
            ['4 5 tan', '1', true],
            ['1 3 5 tan', '-1', true],
            ['9 0 sin', '1', true],
            ['2 7 0 sin', '-1', true],
            ['1 8 0 cos', '-1', true],
            ['9 0 tan', 'Error', true],
            ['2 7 0 tan', 'Error', true],
            ['3 0 sin × 2 – 1 =', '0', true],
            ['6 0 cos × 2 =', '1', true],
            // inverse functions in degrees
            ['0 . 5 sin-1', '30', true],
            ['0 . 5 cos-1', '60', true],
            ['1 tan-1', '45', true],
            ['3 √ tan-1', '60', true],
            ['1 sin-1', '90', true],
            ['0 cos-1', '90', true],
            ['1 +/– cos-1', '180', true],
            ['2 √ 1/x sin-1', '45', true],
            // radians that are whole degrees
            ['π sin', '0'],
            ['π cos', '-1'],
            ['π tan', '0'],
            ['π ÷ 2 = sin', '1'],
            ['π ÷ 2 = cos', '0'],
            ['π ÷ 2 = tan', 'Error'],
            ['π ÷ 6 = sin', '0.5'],
            ['π ÷ 3 = cos', '0.5'],
            ['π ÷ 4 = tan', '1'],
            ['π × 2 = sin', '0'],
            ['π × 2 = cos', '1'],
            ['π × 1 0 0 = sin', '0'],
            // other radians are left to the usual functions
            ['0 sin', '0'],
            ['0 cos', '1'],
            ['1 sin', String(Math.sin(1))],
            ['1 0 cos', String(Math.cos(10))],
            ['3 . 1 4 tan', String(Math.tan(3.14))],
            // roots
            ['8 +/– x√y 3 =', '-2'],
            ['2 7 +/– x√y 3 =', '-3'],
            ['3 2 +/– x√y 5 =', '-2'],
            ['8 +/– x√y 3 +/– =', '-0.5'],
            ['8 x√y 3 +/– =', '0.5'],
            ['6 4 x√y 3 =', '4'],
            ['1 2 5 x√y 3 =', '5'],
            ['1 0 0 0 x√y 3 =', '10'],
            ['1 0 2 4 x√y 1 0 =', '2'],
            ['0 . 0 0 0 0 1 x√y 5 =', '0.1'],
            ['2 x√y 2 =', String(Math.SQRT2)],
            ['1 6 +/– x√y 4 =', 'Error'],
            ['8 +/– x√y 2 =', 'Error'],
            ['8 +/– x√y 1 . 5 =', 'Error'],
            // powers
            ['1 . 1 x2', '1.21'],
            ['1 . 1 x3', '1.331'],
            ['1 . 1 yx 2 =', '1.21'],
            ['2 √ x2', '2'],
            ['2 yx 0 . 5 yx 2 =', '2'],
            ['2 yx 0 . 5 =', String(Math.SQRT2)],
            ['2 yx 1 0 0 =', String(Math.pow(2, 100))],
            // powers of ten
            ['1 . 1 EE 2 =', '110'],
            ['5 EE 3 +/– =', '0.005'],
            ['7 EE 5 +/– =', '0.00007'],
            ['1 . 5 EE 7 +/– =', '1.5e-7'],
            // factorials of whole numbers stay exact products
            ['5 x!', '120'],
            ['2 0 x!', '2432902008176640000'],
            ['1 7 1 x!', 'Error'],
            ['1 +/– x!', 'Error'],
            ['1 7 1 . 5 x!', 'Error']
        ],
        // [keys, value to 14 digits]
        close = [
            ['0 . 5 x!', ROOT_PI / 2],
            ['1 . 5 x!', 3 * ROOT_PI / 4],
            ['2 . 5 x!', 15 * ROOT_PI / 8],
            ['4 . 5 x!', 945 * ROOT_PI / 32],
            ['0 . 5 +/– x!', ROOT_PI],
            ['1 . 5 +/– x!', -2 * ROOT_PI],
            ['1 7 0 x!', 7.257415615307994e306],
            // 3! plus its slope there, 3! × (1 + 1/2 + 1/3 − 0.5772…), times the step
            ['3 . 0 0 0 0 0 0 0 0 1 x!', 6 + 6 * (1 + 1 / 2 + 1 / 3 - 0.5772156649015329) * 1e-9],
            ['1 0 0 sin', Math.sin(100)],
            ['1 0 ln', Math.LN10]
        ],
        // 60 decimal places of whole-number arithmetic, as a reference
        S = 10n ** 60n,
        PI_S = 3141592653589793238462643383279502884197169399375105820974944n,
        ROOT_PI_S = 1772453850905516027298167483341145182797549456122387128213807n,
        seed = 2024,
        worst = { sin: 0, cos: 0, tan: 0, half: 0 },
        e, i, k, x, r, t;

    function rnd() {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    }

    function sinS(r) { // sine of radians × 10^60
        var term, sum, j, r2, neg = false;
        r %= 2n * PI_S;
        if (r < 0n) r += 2n * PI_S;
        if (r > PI_S) {
            r -= PI_S;
            neg = true;
        }
        if (r > PI_S / 2n) r = PI_S - r;
        term = sum = r;
        r2 = r * r / S;
        for (j = 1n; term !== 0n; j++) {
            term = -term * r2 / S / (2n * j * (2n * j + 1n));
            sum += term;
        }
        return neg ? -sum : sum;
    }

    function toNumber(v) { // scaled whole number → nearest double
        var s = (v < 0n ? -v : v).toString().padStart(61, '0');
        return (v < 0n ? -1 : 1) * Number(s.slice(0, -60) + '.' + s.slice(-60));
    }

    function lastDigits(got, want) { // the difference, in units of the last digit of a double
        return want === 0 ? (got === 0 ? 0 : Infinity) :
            Math.abs(got - want) / Math.pow(2, Math.floor(Math.log2(Math.abs(want))) - 52);
    }

    function fact(n) {
        var f = 1n, j;
        for (j = 2n; j <= n; j++) f *= j;
        return f;
    }

    function key(name, x, deg) { // the value a function key gives for x
        var e = new Engine();
        e.paste(String(x));
        e.press(name, deg);
        return e.error ? NaN : +e.value;
    }

    exact.forEach(function (c) {
        var e = new Engine();
        run(e, c[0], c[2]);
        check(c[1] === 'Error' ? e.error : !e.error && e.value === c[1], c[0] + (c[2] ? '  (Deg)' : '') + '  is exactly ' + c[1],
            'got ' + (e.error ? 'Error' : e.value));
    });

    close.forEach(function (c) {
        var e = new Engine();
        run(e, c[0]);
        check(!e.error && Math.abs(e.value - c[1]) <= 1e-14 * Math.abs(c[1]), c[0] + '  to 14 digits',
            'expected ' + c[1] + ', got ' + (e.error ? 'Error' : e.value));
    });

    // sin, cos and tan of random degrees against the 60-digit reference
    for (i = 0; i < 3000; i++) {
        x = i < 600 ? Math.round((rnd() - 0.5) * 4000) : Math.round((rnd() - 0.5) * (i % 4 ? 720 : 2e6) * 1048576) / 1048576;
        r = BigInt(Math.round(x * 1048576)) * S / 1048576n * PI_S / S / 180n;
        worst.sin = Math.max(worst.sin, lastDigits(key('sin', x, true), toNumber(sinS(r))));
        worst.cos = Math.max(worst.cos, lastDigits(key('cos', x, true), toNumber(sinS(r + PI_S / 2n))));
        t = sinS(r + PI_S / 2n);
        if (t !== 0n && sinS(r) * 1000n / t < 1000000n && sinS(r) * 1000n / t > -1000000n) {
            worst.tan = Math.max(worst.tan, lastDigits(key('tan', x, true), Number(sinS(r) * 10n ** 30n / t) / 1e30));
        }
    }
    check(worst.sin <= 2.5, 'sin of degrees is right to the last digits of a double', 'off by ' + worst.sin);
    check(worst.cos <= 2.5, 'cos of degrees is right to the last digits of a double', 'off by ' + worst.cos);
    check(worst.tan <= 3.5, 'tan of degrees is right to the last digits of a double', 'off by ' + worst.tan);

    // sin² + cos² is 1 at every whole degree
    for (i = 0, x = 0; i <= 360; i++) {
        x = Math.max(x, Math.abs(Math.pow(key('sin', i, true), 2) + Math.pow(key('cos', i, true), 2) - 1));
    }
    check(x <= 2.3e-16, 'sin² + cos² is 1 at every whole degree', 'off by ' + x);

    // (k + ½)! = (2k + 2)! √π / (4^(k+1) (k + 1)!), exactly
    for (k = 0; k <= 169; k++) {
        r = toNumber(fact(2n * BigInt(k) + 2n) * ROOT_PI_S / (4n ** (BigInt(k) + 1n) * fact(BigInt(k) + 1n)));
        worst.half = Math.max(worst.half, lastDigits(key('x!', k + 0.5), r));
    }
    check(worst.half <= 16, 'factorials of halves up to 169.5! are right to 15 digits', 'off by ' + worst.half);

    // a result that only looks like a short decimal is left alone
    e = new Engine();
    run(e, '1 ÷ 3 = x2');
    check(e.value === String(Math.pow(1 / 3, 2)), 'results that are not short decimals keep every digit', e.value);
    run(e, 'AC 2 yx 0 . 5 =');
    check(e.value === String(Math.SQRT2), 'roots that are not short decimals keep every digit', e.value);
})();

// ---------- exact + – × ÷ ---------- //

(function () {
    // [keys, the exact value]
    var exact = [
            ['0 . 1 + 0 . 2 =', '0.3'],
            ['0 . 1 + 0 . 2 – 0 . 3 =', '0'],
            ['0 . 3 – 0 . 1 =', '0.2'],
            ['1 . 1 – 1 =', '0.1'],
            ['1 . 1 – 1 = × 1 0 – 1 =', '0'],
            ['0 . 7 + 0 . 1 =', '0.8'],
            ['4 . 3 5 × 1 0 0 =', '435'],
            ['0 . 3 ÷ 0 . 1 =', '3'],
            ['1 . 1 × 1 . 1 =', '1.21'],
            ['0 . 1 × 3 =', '0.3'],
            ['0 . 1 +/– × 0 . 2 =', '-0.02'],
            ['1 . 0 0 0 0 0 0 0 0 0 0 0 0 0 1 – 1 =', '1e-14'],
            ['1 . 0 0 0 0 0 0 0 0 0 1 – 1 =', '1e-10'],
            ['1 9 . 9 9 × 1 5 =', '299.85'],
            ['0 . 1 + 0 . 1 + 0 . 1 + 0 . 1 + 0 . 1 + 0 . 1 + 0 . 1 + 0 . 1 + 0 . 1 + 0 . 1 =', '1'],
            ['3 × 1 . 1 =', '3.3'],
            ['1 . 1 5 × 1 0 0 =', '115'],
            ['0 . 1 x2', '0.01'],
            ['0 . 1 x3', '0.001'],
            ['0 . 3 1/x', String(1 / 0.3)],
            ['0 . 2 5 1/x', '4'],
            // percentages
            ['7 0 + 7 %', '4.9'],
            ['7 0 + 7 % =', '74.9'],
            ['1 9 . 9 9 + 1 5 % =', '22.9885'],
            ['1 5 0 – 1 4 % =', '129'],
            ['7 %', '0.07'],
            // results that are not short decimals are what they always were
            ['1 ÷ 3 =', String(1 / 3)],
            ['1 ÷ 3 × 3 =', '1'],
            ['2 ÷ 3 + 1 ÷ 3 =', '1'],
            ['1 ÷ 7 × 7 =', '1'],
            ['2 √ × 2 √ =', String(Math.SQRT2 * Math.SQRT2)],
            ['π × 2 =', String(Math.PI * 2)],
            ['1 0 ÷ 4 =', '2.5'],
            // whole numbers, large and small values
            ['1 2 3 4 5 6 7 8 9 × 9 8 7 6 5 4 3 2 1 =', String(123456789 * 987654321)],
            ['9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 + 1 =', '1000000000000000'],
            ['1 EE 3 0 0 × 1 0 =', '1e+301'],
            ['1 EE 2 0 0 × 1 EE 2 0 0 =', 'Error'],
            ['1 EE 2 0 0 +/– × 1 EE 2 0 0 +/– =', '0'],
            ['5 ÷ 0 =', 'Error'],
            ['0 ÷ 0 =', 'Error'],
            ['0 ÷ 7 =', '0'],
            ['5 – 5 =', '0']
        ],
        IEEE = {
            '+': function (a, b) { return a + b; }, '–': function (a, b) { return a - b; },
            '×': function (a, b) { return a * b; }, '÷': function (a, b) { return a / b; }
        },
        seed = 4242,
        differs = 0,
        wrong = 0,
        compared = 0,
        e, i, a, b, ka, kb, k, A, B;

    function rnd() {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    }

    function result(a, op, b) { // what the calculator gives for a op b
        var e = new Engine();
        e.put(a);
        e.press(op);
        e.put(b);
        e.press('=');
        return e.error ? NaN : +e.value;
    }

    function longNumber() { // a random number that does not print as a short decimal
        var x;
        do {
            x = (rnd() < 0.5 ? -1 : 1) * (1 + rnd() + rnd() / 2147483648) * Math.pow(2, Math.floor((rnd() - 0.5) * (i % 5 ? 60 : 1200)));
        } while (String(x).replace(/e.*$/, '').replace(/\D/g, '').replace(/^0+|0+$/g, '').length <= 15);
        return x;
    }

    function decimal(I, k) { // the whole number I with k decimals, as text
        var s = (I < 0n ? -I : I).toString().padStart(k + 1, '0');
        return (I < 0n ? '-' : '') + s.slice(0, s.length - k) + (k ? '.' + s.slice(-k) : '');
    }

    exact.forEach(function (c) {
        var e = new Engine();
        run(e, c[0]);
        check(c[1] === 'Error' ? e.error : !e.error && e.value === c[1], c[0] + '  is exactly ' + c[1],
            'got ' + (e.error ? 'Error' : e.value));
    });

    // numbers that are not short decimals: the same answer as the machine's own arithmetic, to the last bit
    for (i = 0; i < 20000; i++) {
        a = longNumber();
        b = i % 7 ? longNumber() : a * (1 + (rnd() - 0.5) * 1e-10); // every seventh pair nearly cancels
        if (String(b).replace(/e.*$/, '').replace(/\D/g, '').replace(/^0+|0+$/g, '').length <= 15) continue;
        ['+', '–', '×', '÷'].forEach(function (op) {
            var want = IEEE[op](a, b), got;
            if (!isFinite(want) || Math.abs(want) < 1e-290) return;
            got = result(a, op, b);
            compared++;
            if (got !== want && differs++ < 3) check(false, a + ' ' + op + ' ' + b, 'the machine gives ' + want + ', the calculator ' + got);
        });
    }
    check(compared > 50000 && !differs, 'long numbers: ' + compared + ' operations give what they always gave', differs + ' differ');

    // short decimals: the true answer, worked out here with whole numbers
    for (i = 0, compared = 0; i < 20000; i++) {
        ka = Math.floor(rnd() * 7);
        kb = Math.floor(rnd() * 7);
        k = Math.max(ka, kb);
        A = BigInt(Math.floor((rnd() - 0.5) * Math.pow(10, 1 + Math.floor(rnd() * 9))));
        B = BigInt(Math.floor((rnd() - 0.5) * Math.pow(10, 1 + Math.floor(rnd() * 9))));
        a = Number(decimal(A, ka));
        b = Number(decimal(B, kb));
        [
            ['+', decimal(A * 10n ** BigInt(k - ka) + B * 10n ** BigInt(k - kb), k)],
            ['–', decimal(A * 10n ** BigInt(k - ka) - B * 10n ** BigInt(k - kb), k)],
            ['×', decimal(A * B, ka + kb)]
        ].forEach(function (c) {
            var got = result(a, c[0], b);
            compared++;
            if (got !== Number(c[1]) && wrong++ < 3) check(false, a + ' ' + c[0] + ' ' + b, 'is ' + c[1] + ', the calculator gives ' + got);
        });
    }
    check(compared > 50000 && !wrong, 'short decimals: ' + compared + ' operations give the true decimal answer', wrong + ' wrong');

    // memory adds exactly too
    e = new Engine();
    run(e, '0 . 1 m+ AC 0 . 2 m+ AC 0 . 3 m-');
    check(e.memory === 0, 'memory: 0.1 + 0.2 – 0.3 is 0', String(e.memory));
})();

// ---------- Ans ---------- //

(function () {
    var e = new Engine();
    check(e.press('Ans') && state(e) === '0 | 0', 'Ans is 0 before any result', state(e));
    run(e, 'AC 2 + 3 = 5 × Ans =');
    check(state(e) === '25 | 5 × 5 =', 'Ans in the middle of an equation', state(e));
    run(e, 'Ans + 1 =');
    check(state(e) === '26 | 25 + 1 =', 'Ans after a result starts a new equation', state(e));
    run(e, 'AC 7 Ans');
    check(state(e) === '26 | 26', 'Ans replaces a typed number', state(e));
    run(e, 'AC 1 ÷ 3 = AC Ans × 3 =');
    check(state(e) === '1 | 0.3333333333333 × 3 =', 'Ans keeps every digit and survives AC', state(e));
    run(e, '9 =');
    check(e.ans === 9, 'a number alone with = is Ans', String(e.ans));
    run(e, '5 ÷ 0 = AC Ans');
    check(e.value === '9', 'an error leaves Ans alone', state(e));
    run(e, 'AC 2 + Ans');
    check(e.del() && state(e) === '2 | 2 +', 'DEL takes Ans back', state(e));
})();

// ---------- history ---------- //

(function () {
    var e = new Engine(), f = new Engine(), i, j, line;
    run(e, '2 + 3 = 9 = 4 x2 = × 4 = =');
    check(e.past.length === 4, 'each = goes into the history, "9 =" does not', String(e.past.length));
    line = e.pastLine(1);
    check(line.line === '4<sup>2</sup> =' && line.text === '4² =' && line.result === '16', 'a history line', JSON.stringify(line));
    check(e.pastLine(3).line === '64 × 4 =' && e.pastLine(3).result === '256', 'a repeated = is a line of its own', e.pastLine(3).line);
    run(f, '3 0 sin =', true);
    check(f.pastLine(0).unit === 'Deg' && e.pastLine(0).unit === '', 'the unit is shown for angles only', JSON.stringify(f.past[0]));
    run(f, '2 + 3 = 2 + 3 =');
    check(f.past.length === 2, 'the same calculation twice in a row is kept once', String(f.past.length));

    // reused
    run(e, '7 ×');
    check(e.recall(0) && state(e) === '3 | 2 + 3', 'a calculation is entered again, without =', state(e));
    check(e.del() && state(e) === '2 | 2 +', 'and DEL takes back its keys', state(e));
    run(e, '4 =');
    check(state(e) === '6 | 2 + 4 =', 'and it can be changed', state(e));
    check(f.recall(0, false) && f.press('=', false) && f.value === '0.5', 'an angle is entered in its own unit', state(f));
    f.press('AC');
    run(f, '3 0 sin', true);
    run(f, '+ 3 0 sin =', false); // in Deg, then in Rad
    check(f.pastLine(f.past.length - 1).unit === 'Deg Rad' && f.recall(f.past.length - 1, true) && f.press('=') &&
        f.value === String(0.5 + Math.sin(30)), 'each angle keeps its own unit', state(f));
    run(f, 'AC 2 . 5 0 +/– + 1 =');
    check(f.recall(f.past.length - 1) && state(f) === '1 | -2.50 + 1', 'a typed negative number keeps its digits', state(f));
    check(f.del() && f.del() && state(f) === '-2.50 | -2.50', 'and DEL takes back its keys', state(f));
    check(!e.recall(99) && state(e) === '6 | 2 + 4 =', 'a missing line changes nothing', state(e));
    run(f, 'AC 2 × ( 3 + 4 =');
    check(f.recall(f.past.length - 1) && state(f) === '4 | 2 × (3 + 4', 'a bracket closed by = comes back open', state(f));
    run(f, 'AC 1 ÷ ( 5 ÷ 0 =');
    check(f.value === '0' && f.recall(f.past.length - 1) && f.press('=') && f.value === '0',
        'and so does one that would be an error if closed', state(f));

    // kept small
    for (i = 0; i < 80; i++) run(e, 'AC 1 + ' + String(i).split('').join(' ') + ' =');
    check(e.past.length === 50 && e.pastLine(49).line === '1 + 79 =', 'the history keeps the newest 50', String(e.past.length));
    e = new Engine();
    for (i = 0; i < 60; i++) {
        e.press('AC');
        e.press(String(i % 9 + 1));
        for (j = 0; j < 59; j++) e.press(j % 2 ? 'sin' : 'cos');
        e.press('=');
    }
    check(JSON.stringify(e.past).length <= 100000 && e.past.length > 5, 'long calculations are capped by size',
        JSON.stringify(e.past).length + ' chars, ' + e.past.length + ' lines');

    // saved
    e = new Engine();
    run(e, '2 + 3 = 4 × 5 = 2 +');
    f = new Engine();
    f.load(JSON.parse(JSON.stringify(e.save())));
    check(f.past.length === 2 && f.ans === 20 && state(f) === state(e), 'history and Ans are saved', state(f));
    f.load({ state: e.snapshot(), past: [null, { value: '5' }, { node: { t: 'bin', op: '+' }, value: '5' },
        { node: { t: 'num', v: '1' }, value: 'x' }, e.past[0]], ans: 'x' });
    check(f.past.length === 1 && f.ans === 0, 'unreadable saved lines are left out', f.past.length + ' ' + f.ans);
    f.load({ state: e.snapshot() });
    check(f.past.length === 0 && f.ans === 0, 'state saved without them still loads');
})();

// ---------- fuzz: a calculation from the history comes back the same ---------- //

(function () {
    var pool = ('0 1 2 3 4 5 6 7 8 9 1 2 3 . +/– + – × ÷ + – × ÷ yx x√y EE ( ( ) ) ) = = C π e Rand Ans mr m+ ' +
            'x2 x3 x! 1/x ex 2x sin cos tan sin-1 √ ln log log2 sinh tan-1 % %').split(' '),
        seed = 777,
        compared = 0,
        e, f, keys, i, n, j, deg, p, before;

    function rnd() {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    }

    for (n = 0; n < 3000; n++) {
        e = new Engine();
        deg = rnd() < 0.5;
        keys = [];
        for (i = 5 + Math.floor(rnd() * 40); i--;) keys.push(pool[Math.floor(rnd() * pool.length)]);
        keys.push('=');
        keys.forEach(function (key) { e.press(key, rnd() < 0.2 ? !deg : deg); }); // the unit changes now and then
        for (j = 0; j < e.past.length; j++) {
            p = e.past[j];
            f = new Engine();
            f.load(JSON.parse(JSON.stringify(e.save())));
            before = f.pastLine(j);
            if (!f.recall(j, rnd() < 0.5)) { // in either unit: each angle comes back in its own
                check(false, 'fuzz recall  ' + keys.join(' '), 'line ' + j + ' ' + before.text + ' was refused');
                continue;
            }
            f.press('=', rnd() < 0.5);
            compared++;
            if (f.value !== p.value || f.equation() !== before.line) {
                check(false, 'fuzz recall  ' + keys.join(' '),
                    before.line + ' ' + p.value + ' came back as ' + f.equation() + ' ' + f.value);
                if (failures > 20) return;
            }
        }
    }
    check(compared > 1000, 'fuzz recall compared ' + compared + ' calculations');
})();

// ---------- fuzz: the finished expression must evaluate to the result ---------- //

(function () {
    var F = {
            'sin': Math.sin, 'cos': Math.cos, 'tan': Math.tan, '√': Math.sqrt, 'ln': Math.log,
            'log': Math.log10, 'sinh': Math.sinh, 'tan-1': Math.atan
        },
        pool = ('0 1 2 3 4 5 6 7 8 9 1 2 3 . +/– + – × ÷ + – × ÷ yx x√y EE ( ( ) ) ) = C π ' +
            'x2 x3 x! 1/x ex 2x sin cos tan √ ln log sinh tan-1 % %').split(' '),
        seed = 12345,
        compared = 0,
        e, keys, i, n, got, want;

    function rnd() { // small deterministic generator
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    }

    function ev(n) {
        var x;
        if (n.t === 'fn' && /^(sin|tan)$/.test(n.name) && Math.abs(ev(n.arg)) === Math.PI) return 0;
        switch (n.t) {
            case 'num': return +n.v;
            case 'const': return Math.PI;
            case 'neg': return -ev(n.arg);
            case 'group': return ev(n.arg);
            case 'fn': return F[n.name](ev(n.arg));
            case 'inv': return 1 / ev(n.arg);
            case 'pow': return n.base === 'e' ? Math.exp(ev(n.arg)) : Math.pow(2, ev(n.arg));
            case 'post':
                x = ev(n.arg);
                if (n.op === 'x2') return x * x;
                if (n.op === 'x3') return x * x * x;
                if (n.op === '%') return x / 100;
                if (Math.floor(x) !== x) return stirling(x + 1);
                for (var f = 1; x > 1; x--) f *= x;
                return f;
        }
        // a + b% and a – b% take b% of a; anywhere else b% is b ÷ 100
        if ((n.op === '+' || n.op === '–') && (n.r.op === '%' || (n.r.t === 'neg' && n.r.arg.op === '%'))) {
            x = ev(n.l);
            return n.op === '+' ? x + x * ev(n.r) : x - x * ev(n.r);
        }
        switch (n.op) {
            case '+': return ev(n.l) + ev(n.r);
            case '–': return ev(n.l) - ev(n.r);
            case '×': return ev(n.l) * ev(n.r);
            case '÷': return ev(n.l) / ev(n.r);
            case 'yx': return Math.pow(ev(n.l), ev(n.r));
            case 'x√y':
                x = ev(n.l);
                if (!ev(n.r)) return NaN;
                return x < 0 && Math.abs(ev(n.r) % 2) === 1 ? -Math.pow(-x, 1 / ev(n.r)) : Math.pow(x, 1 / ev(n.r));
            case 'EE': x = ev(n.l); return x && x * Math.pow(10, ev(n.r)); // 0E400 is 0
        }
    }

    // gamma by another method than the engine's: Stirling's series, after
    // moving the argument up where the series is accurate
    function stirling(z) {
        var p = 1, zz, ln;
        if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * stirling(1 - z));
        while (z < 40) {
            p *= z;
            z += 1;
        }
        zz = z * z;
        ln = (z - 0.5) * Math.log(z) - z + 0.5 * Math.log(2 * Math.PI) +
            1 / (12 * z) - 1 / (360 * z * zz) + 1 / (1260 * z * zz * zz) - 1 / (1680 * z * zz * zz * zz);
        return Math.exp(ln) / p;
    }

    for (n = 0; n < 5000; n++) {
        e = new Engine();
        keys = [];
        for (i = 3 + Math.floor(rnd() * 25); i--;) keys.push(pool[Math.floor(rnd() * pool.length)]);
        keys.push('=');
        keys.forEach(function (key) { e.press(key, false); });
        if (e.error) continue;
        compared++;
        got = +e.value;
        want = ev(e.done);
        if (!(Math.abs(got - want) <= 1e-9 * Math.max(1, Math.abs(got)))) {
            check(false, 'fuzz  ' + keys.join(' '), e.equation() + ' gives ' + want + ', engine says ' + got);
            if (failures > 20) break;
        }
    }
    check(compared > 1000, 'fuzz compared ' + compared + ' sequences');
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
