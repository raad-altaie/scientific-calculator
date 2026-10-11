// Run with: node test/engine.test.js
'use strict';

var Engine = require('../js/engine.js'),
    failures = 0,
    checks = 0,
    drawn = Engine.prototype.equation;

// A root is drawn with a bar over what is under it, its √ and brackets kept
// hidden in the line. The checks below compare the line as it reads, √(99);
// the drawing itself has checks of its own
function unroot(s) {
    return s.replace(/<span class="calc-(root|hide)">/g, '').replace(/<\/span>/g, '');
}

Engine.prototype.equation = function (stacked) {
    var s = drawn.call(this, stacked);
    return stacked ? s : unroot(s);
};

var drawnPast = Engine.prototype.pastLine;
Engine.prototype.pastLine = function (i, stacked) {
    var p = drawnPast.call(this, i, stacked);
    if (!stacked) p.line = unroot(p.line);
    return p;
};

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
    ['3 10x', '1000', '10^3'],
    ['3 +/– 10x', '0.001', '10^(-3)'],
    ['0 . 5 10x', Math.sqrt(10), '10^0.5'],
    ['1 0 0 0 log 10x', '1000', '10^log(1000)'],
    ['4 0 0 10x', 'Error', '10^400'],

    // the logarithm to any base: the number, then the base
    ['8 logy 2 =', '3', 'log<sub>2</sub>(8) ='],
    ['2 4 3 logy 3 =', '5', 'log<sub>3</sub>(243) ='],
    ['1 0 0 0 logy 1 0 =', '3', 'log<sub>10</sub>(1000) ='],
    ['0 . 1 2 5 logy 2 =', '-3', 'log<sub>2</sub>(0.125) ='],
    ['8 logy 2 . 5 =', Math.log(8) / Math.log(2.5), 'log<sub>2.5</sub>(8) ='],
    ['8 logy', '8', 'log<sub>y</sub>(8)'],
    ['8 logy 2', '2', 'log<sub>2</sub>(8)'],
    ['2 + 8 logy 2 × 2 =', '8', '2 + log<sub>2</sub>(8) × 2 ='],
    ['( 2 + 6 ) logy 2 =', '3', 'log<sub>2</sub>(2 + 6) ='],
    ['8 logy ( 1 + 1 ) =', '3', 'log<sub>(1 + 1)</sub>(8) ='],
    ['2 yx 3 logy 2 =', '3', 'log<sub>2</sub>(2^3) ='],
    ['8 logy 1 =', 'Error', 'log<sub>1</sub>(8) ='],
    ['8 logy 0 =', 'Error', 'log<sub>0</sub>(8) ='],
    ['8 logy 2 +/– =', 'Error', 'log<sub>-2</sub>(8) ='],
    ['8 +/– logy 2 =', 'Error', 'log<sub>2</sub>(-8) ='],
    ['0 logy 2 =', 'Error', 'log<sub>2</sub>(0) ='],

    // constants
    ['2 × π', String(Math.PI), '2 × 3.14159265359'],
    ['2 × π =', 2 * Math.PI, '2 × 3.14159265359 ='],
    ['π', String(Math.PI), '3.14159265359'],
    ['π 5', '5', '5'],
    ['e', String(Math.E), '2.718281828459'],
    ['2 × e =', 2 * Math.E, '2 × 2.718281828459 ='],
    ['e ln', '1', 'ln(2.718281828459)'],
    ['e 5', '5', '5'],

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
    check(!e.paste('42abc', false, true) && state(e) === '44 | 2 + 42 =', 'whole: not the number a text starts with', state(e));
    check(e.paste('6*7', false, true) && (e.press('='), e.value === '42'), 'whole: an equation still goes in', state(e));
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
            ['3 10x + 1', '10^3 + 1'],
            ['8 logy 2 + 1', 'log₂(8) + 1'],
            ['( 2 + 6 ) logy 1 6', 'log₁₆(2 + 6)'],
            ['8 logy 2 . 5', '8 logᵧ 2.5'],
            ['8 logy ( 1 + 1 )', '8 logᵧ (1 + 1)'],
            ['8 logy', '8 logᵧ'],
            ['8 x2 logy 2 . 5', '(8²) logᵧ 2.5'],
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
            ['log₁₆(256)=', '2', 'log<sub>16</sub>(256) ='],
            ['log₁₀(1000)=', '3', 'log<sub>10</sub>(1000) ='],
            ['log₃(2+7)=', '2', 'log<sub>3</sub>(2 + 7) ='],
            ['1 + log₅(25) × 2=', '5', '1 + log<sub>5</sub>(25) × 2 ='],
            ['log₁₆(256', '16', 'log<sub>16</sub>(256)'],
            ['8 logᵧ 2=', '3', 'log<sub>2</sub>(8) ='],
            ['8 logᵧ 2.5=', Math.log(8) / Math.log(2.5), 'log<sub>2.5</sub>(8) ='],
            ['(8²) logᵧ 2.5=', Math.log(64) / Math.log(2.5), 'log<sub>2.5</sub>(8<sup>2</sup>) ='],
            ['8 logᵧ', '8', 'log<sub>y</sub>(8)'],
            ['logᵧ(8)', '8', 'log<sub>y</sub>(8)'],
            ['log₁(8)=', 'Error', 'log<sub>1</sub>(8) ='],
            ['10^3=', '1000', '10^3 ='],
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
            'x2 x3 x! 1/x ex 2x 10x logy sin cos tan sin-1 √ ln log log2 sinh tan-1 % %').split(' '),
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
        pool = ('0 1 2 3 4 5 6 7 8 9 1 2 3 . +/– + – × ÷ + – × ÷ yx x√y logy EE ( ( ) ) ) = C π e ' +
            'x2 x3 x! 1/x ex 2x 10x sin cos tan √ ln log sinh tan-1 % %').split(' '),
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
            case 'pow': return n.base === 'e' ? Math.exp(ev(n.arg)) : Math.pow(+n.base, ev(n.arg));
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
            case 'logy': return Math.log(ev(n.l)) / Math.log(ev(n.r));
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

// ---------- a root is drawn with a bar over what is under it ---------- //

[
    ['9 9 √', '<span class="calc-root"><span class="calc-hide">√(</span>99<span class="calc-hide">)</span></span>'],
    ['( 2 + 3 ) √', '<span class="calc-root"><span class="calc-hide">√(</span>2 + 3<span class="calc-hide">)</span></span>'],
    ['8 x√y 3', '<sup>3</sup><span class="calc-root"><span class="calc-hide">√</span>8</span>'],
    ['9 9 √ x√y 8 6', '<sup>86</sup><span class="calc-root"><span class="calc-hide">√(</span>' +
        '<span class="calc-root"><span class="calc-hide">√(</span>99<span class="calc-hide">)</span></span>' +
        '<span class="calc-hide">)</span></span>']
].forEach(function (c) {
    var e = new Engine();
    run(e, c[0]);
    check(drawn.call(e) === c[1], c[0] + '  drawn with its bar', drawn.call(e));
});

// ---------- a root of a root keeps its brackets ---------- //

[
    ['9 9 √ x√y 8 6 =', Math.pow(99, 1 / 172), '<sup>86</sup>√(√(99)) =', '⁸⁶√(√(99)) ='],
    ['6 4 x√y 3 x√y 2 =', 2, '<sup>2</sup>√(<sup>3</sup>√64) =', '²√(³√64) ='],
    ['8 x√y', 8, '<sup>x</sup>√8', 'ˣ√8']
].forEach(function (c) {
    var e = new Engine(), b = new Engine();
    run(e, c[0]);
    check(same(e.value, c[1]) && e.equation() === c[2] && e.text() === c[3], c[0] + '  line',
        e.value + ' | ' + e.equation() + ' | ' + e.text());
    check(b.paste(e.text()) && same(b.value, +e.value), c[0] + '  pastes back', b.value);
});

// ---------- nCr, nPr and abs ---------- //

[
    ['1 0 nCr 3 =', '120', '10 nCr 3 ='],
    ['5 nPr 2 =', '20', '5 nPr 2 ='],
    ['5 nCr 0 =', '1', '5 nCr 0 ='],
    ['5 nCr 5 =', '1', '5 nCr 5 ='],
    ['2 × 5 nCr 2 =', '20', '2 × 5 nCr 2 ='],
    ['5 nCr 2 yx 2 =', '5', '5 nCr 2^2 ='],
    ['5 nCr 2 × 2 =', '20', '5 nCr 2 × 2 ='],
    ['5 2 nCr 5 =', '2598960', '52 nCr 5 ='],
    ['1 0 0 0 nCr 5 0 0 =', 2.702882409454366e299, '1000 nCr 500 ='],
    ['3 nCr 5 =', 'Error', '3 nCr 5 ='],
    ['2 . 5 nCr 1 =', 'Error', '2.5 nCr 1 ='],
    ['5 nCr 1 +/– =', 'Error', '5 nCr -1 ='],
    ['2 0 0 0 nCr 1 0 0 0 =', 'Error', '2000 nCr 1000 ='],
    ['1 7 1 nPr 1 7 1 =', 'Error', '171 nPr 171 ='],
    ['1 7 0 nPr 1 7 0 =', 7.257415615307994e306, '170 nPr 170 ='],
    ['3 +/– abs =', '3', 'abs(-3) ='],
    ['( 2 – 5 ) abs × 2 =', '6', 'abs(2 – 5) × 2 =']
].forEach(function (c) {
    var e = new Engine();
    run(e, c[0]);
    check(c[1] === 'Error' ? e.error : !e.error && same(e.value, c[1]), c[0] + '  value',
        'expected ' + c[1] + ', got ' + (e.error ? 'Error' : e.value));
    check(e.equation() === c[2], c[0] + '  line', 'expected "' + c[2] + '", got "' + e.equation() + '"');
});

(function () {
    var e = new Engine();
    check(e.paste('10 nCr 3 + abs(-2) =') && e.value === '122', 'paste nCr and abs', state(e));
    check(e.paste('8^(1/3)=') && e.value === '2' && e.equation() === '<sup>3</sup>√8 =', 'a power of 1/n is pasted as the root', state(e));
    check(e.paste('(-8)^(1/3)=') && e.value === '-2', 'odd roots of negative numbers stay real', state(e));
})();

// ---------- mod, gcd and lcm ---------- //

[
    ['1 7 mod 5 =', '2', '17 mod 5 ='],
    ['7 +/– mod 3 =', '2', '-7 mod 3 ='],
    ['7 mod 3 +/– =', '-2', '7 mod -3 ='],
    ['7 . 5 mod 2 =', '1.5', '7.5 mod 2 ='],
    ['. 3 mod . 1 =', '0', '0.3 mod 0.1 ='],
    ['7 + 1 0 mod 3 =', '8', '7 + 10 mod 3 ='],
    ['2 × 7 mod 4 =', '2', '2 × 7 mod 4 ='],
    ['5 mod 0 =', 'Error', '5 mod 0 ='],
    ['1 2 gcd 1 8 =', '6', '12 gcd 18 ='],
    ['1 2 +/– gcd 1 8 =', '6', '-12 gcd 18 ='],
    ['0 gcd 5 =', '5', '0 gcd 5 ='],
    ['4 lcm 6 =', '12', '4 lcm 6 ='],
    ['0 lcm 6 =', '0', '0 lcm 6 ='],
    ['2 × 1 2 gcd 1 8 =', '12', '2 × 12 gcd 18 ='],
    ['1 . 5 gcd 3 =', 'Error', '1.5 gcd 3 ='],
    ['4 lcm 1 . 5 =', 'Error', '4 lcm 1.5 =']
].forEach(function (c) {
    var e = new Engine();
    run(e, c[0]);
    check(c[1] === 'Error' ? e.error : !e.error && same(e.value, c[1]), c[0] + '  value',
        'expected ' + c[1] + ', got ' + (e.error ? 'Error' : e.value));
    check(e.equation() === c[2], c[0] + '  line', 'expected "' + c[2] + '", got "' + e.equation() + '"');
});

(function () {
    var e = new Engine();
    check(e.paste('10 mod 4 + 12 gcd 18 * 2 =') && e.value === '14', 'paste mod and gcd', state(e));
    check(e.paste('4 lcm 6 =') && e.value === '12', 'paste lcm', state(e));
})();

// ---------- statistics ---------- //

(function () {
    var s = Engine.stats('2 4 4 4 5 5 7 9');
    check(s.n === 8 && s.sum === 40 && s.squares === 232 && s.mean === 5 && s.sdp === 2 && same(s.sds, Math.sqrt(32 / 7)) &&
        s.min === 2 && s.max === 9 && s.median === 4.5, 'the textbook list: mean 5, σ 2', JSON.stringify(s));
    s = Engine.stats('0.1, 0.2, 0.3');
    check(s.n === 3 && s.sum === 0.6 && s.mean === 0.2 && s.median === 0.2, 'sums are exact: 0.1 + 0.2 + 0.3 is 0.6', JSON.stringify(s));
    s = Engine.stats('12\n7\n\t3\r\n-4');
    check(s.n === 4 && s.sum === 18 && s.min === -4 && s.median === 5, 'a column of a spreadsheet', JSON.stringify(s));
    s = Engine.stats('1,5; 2,5; 3,5');
    check(s.n === 3 && s.mean === 2.5, 'with semicolons, a comma is the decimal mark', JSON.stringify(s));
    s = Engine.stats('3 abc 5 1e2 x');
    check(s.n === 3 && s.sum === 108 && s.bad.join(' ') === 'abc x', 'what is no number is left out, and named', JSON.stringify(s));
    s = Engine.stats('42');
    check(s.n === 1 && s.sdp === 0 && isNaN(s.sds) && s.median === 42, 'one number: no sample deviation', JSON.stringify(s));
    s = Engine.stats('  ');
    check(s.n === 0 && s.mean === undefined, 'an empty list', JSON.stringify(s));
    s = Engine.stats('1 2 3 4');
    check(s.median === 2.5 && same(s.sds, 1.2909944487358056) && same(s.sdp, 1.118033988749895), 'an even list', JSON.stringify(s));
})();

// ---------- the cursor ---------- //

(function () {
    var e;

    function ed(e) { // the line with | at the cursor
        var v;
        if (!e.edit) return 'not editing: ' + state(e);
        v = e.editView();
        return v.parts.slice(0, v.at).join('') + '|' + v.parts.slice(v.at).join('');
    }

    // into the equation being entered, change a digit, back to the end
    e = new Engine();
    run(e, '1 2 + 3 4 × 5');
    check(e.move('left') && ed(e) === '12 + 34 × |5', '◀ puts the cursor before the last piece', ed(e));
    [1, 2, 3, 4, 5].forEach(function () { e.move('left'); });
    check(ed(e) === '1|2 + 34 × 5', '◀ steps over digits, operators', ed(e));
    check(e.del() && ed(e) === '|2 + 34 × 5', 'DEL removes the piece before the cursor', ed(e));
    check(!e.del() && ed(e) === '|2 + 34 × 5', 'DEL at the start does nothing', ed(e));
    e.press('7');
    check(ed(e) === '7|2 + 34 × 5', 'a digit is written at the cursor', ed(e));
    check(e.move('end') && !e.edit && state(e) === '5 | 72 + 34 × 5', 'at the end the equation is entered again', state(e));
    e.press('=');
    check(state(e) === '242 | 72 + 34 × 5 =', '... and finished as before', state(e));
    e.press('–');
    check(state(e) === '242 | 242 –', 'keys after it work as before', state(e));

    // after '=': ◀ enters it again, ▶ goes to its start
    e = new Engine();
    run(e, '1 ÷ 3 × 3 =');
    check(e.move('left') && !e.edit && state(e) === '3 | 1 ÷ 3 × 3', '◀ after = enters the equation again', state(e));
    e = new Engine();
    run(e, '1 ÷ 3 × 3 =');
    check(e.move('right') && ed(e) === '|1 ÷ 3 × 3', '▶ after = puts the cursor at the start', ed(e));
    run(e, '2 ×');
    e.press('=');
    check(state(e) === '2 | 2 × 1 ÷ 3 × 3 =', '= while editing finishes it', state(e));

    // functions write as the equation reads, and close at the end
    e = new Engine();
    run(e, '2 + 3 0');
    e.move('left');
    e.move('left');
    e.press('sin');
    check(ed(e) === '2 + sin(|30', 'sin writes sin(', ed(e));
    e.press('=', true);
    check(state(e) === '2.5 | 2 + sin(30) =', 'an open function closes with =', state(e));
    e = new Engine();
    run(e, '2 + 3');
    e.move('left');
    e.move('left');
    e.press('x2');
    check(ed(e) === '2<sup>2</sup>| + 3', 'x² writes ² at the cursor', ed(e));
    e.press('=');
    check(state(e) === '7 | 2<sup>2</sup> + 3 =', '... and is worked out', state(e));
    e = new Engine();
    run(e, '2 + 3');
    e.move('left');
    e.move('right');
    e.press('x2');
    check(state(e) === '9 | 2 + 3<sup>2</sup>', 'back at the end, x² works on the last number as before', state(e));
    e = new Engine();
    run(e, '8 + 1');
    e.move('left');
    e.move('left');
    ['x√y', '3', ')'].forEach(function (k) { e.press(k); });
    e.press('=');
    check(state(e) === '3 | <sup>3</sup>√8 + 1 =', 'x√y writes the root', state(e));
    e = new Engine();
    run(e, '1 0 + 3');
    e.move('left');
    e.del();
    e.press('nCr');
    e.press('=');
    check(state(e) === '120 | 10 nCr 3 =', 'nCr written at the cursor', state(e));

    // computed numbers keep all their digits through an edit
    e = new Engine();
    run(e, 'π × 2');
    e.move('home');
    e.press('1');
    e.press('+');
    e.press('=');
    check(same(e.value, 1 + 2 * Math.PI) && e.value === String(1 + Math.PI * 2), 'π is not rounded by an edit', state(e));

    // a line that cannot be read stays in the editor, and = shows Error
    e = new Engine();
    run(e, '2 + 3');
    e.move('left');
    e.press('×');
    e.move('end');
    check(ed(e) === '2 +  × 3|', 'a line that cannot be read keeps the cursor', ed(e));
    e.press('=');
    check(e.error && e.equation() === '2 +  × 3', '= on it is an Error', e.equation());
    check(e.move('left') && ed(e) === '2 +  × 3|', 'the line of the Error can be edited', ed(e));
    e.move('left');
    e.del();
    e.press('=');
    check(state(e) === '5 | 2 + 3 =', 'and fixed', state(e));

    // an Error from = is edited the same way
    e = new Engine();
    run(e, '1 ÷ 0 =');
    e.move('left');
    e.del();
    e.press('4');
    e.press('=');
    check(state(e) === '0.25 | 1 ÷ 4 =', 'an Error of = is fixed', state(e));

    // a click: characters from the start of the shown line
    e = new Engine();
    run(e, '1 2 + 3 4');
    check(e.point(1) && ed(e) === '1|2 + 34', 'a click puts the cursor between pieces', ed(e));
    e = new Engine();
    run(e, '1 2 + 3 4');
    check(!e.point(7) && !e.edit, 'a click at the end leaves the line as it is', state(e));
    e = new Engine();
    run(e, '1 2 + 3 4 =');
    check(e.point(4) && ed(e) === '12 + |34', 'a click on the line above a result', ed(e));
    e = new Engine();
    run(e, 'π');
    check(!e.point(0) && !e.edit, 'a result alone has nothing to edit', state(e));

    // the rest: AC, paste, the history, saving
    e = new Engine();
    run(e, '2 + 3');
    e.move('left');
    e.press('C');
    check(!e.edit && state(e) === '0 | ', 'C while editing clears all', state(e));
    e = new Engine();
    run(e, '2 + 3');
    e.move('left');
    check(e.paste('4×') && ed(e) === '2 + 4 × |3', 'paste goes in at the cursor', ed(e));
    e.ans = 7;
    e.press('Ans');
    check(ed(e) === '2 + 4 × 7|3', 'Ans is written as a number', ed(e));
    check(e.put(1.5) && ed(e) === '2 + 4 × 71.5|3', 'a result from the history too', ed(e));
    check(e.text() === '2 + 4 × 71.53', 'copy while editing gives the line', e.text());
    var saved = JSON.parse(JSON.stringify(e.save())), f = new Engine();
    f.load(saved);
    check(f.edit && ed(f) === ed(e), 'the cursor is kept when the calculator closes', f.edit && ed(f));
    f.move('end'); // 71.5 then 3 cannot be read: the cursor stays
    check(ed(f) === '2 + 4 × 71.53|', 'a number next to a pasted one cannot be read', ed(f));
    while (f.del());
    check(!f.edit && state(f) === '0 | ', 'DEL down to nothing leaves the editor', state(f));
})();

// ---------- number format and fractions ---------- //

(function () {
    [
        [1234567.891, 'fix', 2, '1234567.89'],
        [1.005, 'fix', 2, '1.01'],
        [2.5, 'fix', 0, '3'],
        [-0.001, 'fix', 2, '0.00'],
        [1e20, 'fix', 2, '1.00e+20'],
        [123456, 'sci', 3, '1.235e+5'],
        [0.000123456, 'sci', 2, '1.23e-4'],
        [0, 'sci', 2, '0'],
        [0, 'eng', 3, '0'],
        [0, 'fix', 2, '0.00'],
        [-0, 'fix', 2, '0.00'],
        [0.0004, 'sci', 0, '4e-4'],
        [123456, 'eng', 2, '123.46e+3'],
        [0.000123, 'eng', 3, '123.000e-6'],
        [999999, 'eng', 2, '1.00e+6']
    ].forEach(function (c) {
        var got = Engine.format(c[0], { notation: c[1], places: c[2] });
        check(got === c[3], 'format ' + c[0] + ' ' + c[1] + ' ' + c[2], 'expected ' + c[3] + ', got ' + got);
    });
    check(Engine.format(12.5, { notation: 'norm', places: 2 }) === null, 'the usual notation is left as it is');
    [
        ['1234567.891', '1,234,567.891'],
        ['-1234', '-1,234'],
        ['999', '999'],
        ['0.12345', '0.12345'],
        ['1.234567e+20', '1.234567e+20'],
        ['12345 + 6789 × 0.5', '12,345 + 6,789 × 0.5']
    ].forEach(function (c) {
        check(Engine.group(c[0]) === c[1], 'group ' + c[0], Engine.group(c[0]));
    });
    [
        [0.75, '3/4'], [1 / 3, '1/3'], [-7 / 4, '-7/4'], [0.1 + 0.2, '3/10'], [2 / 3 + 1 / 6, '5/6'],
        [Math.PI, null], [Math.SQRT2, null], [5, null], [0.123, '123/1000'], [1 / 7, '1/7'],
        [0.1234567, null], [Infinity, null]
    ].forEach(function (c) {
        var f = Engine.fraction(c[0]);
        check((f ? f[0] + '/' + f[1] : null) === c[1], 'fraction of ' + c[0], f && f.join('/'));
    });

    // the history keeps whether a calculation was done in fraction mode
    var h = new Engine();
    h.fraction = true;
    run(h, '1 ÷ 2 =');
    h.fraction = false;
    run(h, '1 ÷ 4 =');
    run(h, '1 ÷ 4 =');
    h.fraction = true;
    run(h, '1 ÷ 4 =');
    check(h.past.map(function (p) { return p.value + (p.frac ? ' frac' : ''); }).join(', ') === '0.5 frac, 0.25, 0.25 frac',
        'each calculation keeps its mode; the same one again in the other mode is kept as well',
        h.past.map(function (p) { return p.value + (p.frac ? ' frac' : ''); }).join(', '));
    var h2 = new Engine();
    h2.load(JSON.parse(JSON.stringify(h.save())));
    check(h2.past.length === 3 && h2.past[0].frac === 1 && !h2.past[1].frac, 'and keeps it when the calculator closes');

    // fraction mode: each division drawn as a fraction while it is typed
    var e = new Engine(), fr = function (a, b) {
        return '<span class="calc-fr"><span>' + a + '</span>' +
            (b ? '<span>' + b + '</span>' : '<span class="calc-fr-empty"></span>') + '</span>';
    };
    run(e, '1 ÷ 2 + 1 ÷');
    check(e.equation(true) === fr('1', '2') + ' + ' + fr('1'), 'a division waits for its bottom part', e.equation(true));
    run(e, '3 =');
    check(e.equation(true) === fr('1', '2') + ' + ' + fr('1', '3') + ' =', 'the finished line', e.equation(true));
    check(e.equation() === '1 ÷ 2 + 1 ÷ 3 =' && e.text() === '1 ÷ 2 + 1 ÷ 3 =', 'the line without fraction mode, and copied',
        e.equation());
    e = new Engine();
    run(e, '2 + 3 ÷ ( 4 – 1 ) × 5 1/x =');
    check(e.equation(true) === '2 + ' + fr('3', '(4 – 1)') + ' × ' + fr('1', '5') + ' =', 'parts need no brackets of their own',
        e.equation(true));
})();

// ---------- function keys before their number: tan 45 ---------- //

(function () {
    function first(keys, deg) {
        var e = new Engine();
        e.fnFirst = true;
        if (keys) run(e, keys, deg);
        return e;
    }

    function sq(s) { // the drawn √ of an open root, as it reads
        return s.replace(/<span class="calc-sq">√(<\/span>)?/g, '√'); // the checks strip each </span>
    }

    // [keys, display value ('Error' for an error), equation line, degrees?]
    [
        // the function opens a bracket that ) or = closes
        ['tan', '0', 'tan(', true],
        ['tan 4 5', '45', 'tan(45', true],
        ['tan 4 5 )', '1', 'tan(45)', true],
        ['tan 4 5 =', '1', 'tan(45) =', true],
        ['tan 4 5 ) =', '1', 'tan(45) =', true],
        ['sin 3 0 + 6 0 ) =', '1', 'sin(30 + 60) =', true],
        ['sin 3 0 ) + 6 0 =', '60.5', 'sin(30) + 60 =', true],
        ['2 + tan 4 5 ) × 3 =', '5', '2 + tan(45) × 3 =', true],
        ['2 × sin 3 0 =', '1', '2 × sin(30) =', true],
        // nested, and closed all at once by =
        ['sin cos 0 =', String(Math.sin(1)), 'sin(cos(0)) =', false],
        ['sin cos 0 ) ) =', String(Math.sin(1)), 'sin(cos(0)) =', false],
        ['sin ( 3 0 ) =', '0.5', 'sin(30) =', true],
        ['( sin 3 0 ) =', '0.5', '(sin(30)) =', true],
        ['√ √ 1 6 =', '2', '√(√(16)) ='],
        // a number before the function multiplies it, as before a bracket
        ['2 tan 4 5 =', '2', '2 × tan(45) =', true],
        ['2 + 3 tan 4 5 =', '5', '2 + 3 × tan(45) =', true],
        ['( 2 ) sin 3 0 =', '1', '(2) × sin(30) =', true],
        ['π sin', String(Math.PI), '3.14159265359 × sin('],
        // after = it starts a new calculation, and an operator goes on from the result
        ['2 + 3 = tan 4 5 =', '1', 'tan(45) =', true],
        ['2 + 3 = tan', '5', 'tan(', true],
        ['2 + 3 = + 1 =', '6', '5 + 1 ='],
        // – after the function starts a negative number; keys that take a number wait for one
        ['tan – 4 5 =', '-1', 'tan(-45) =', true],
        ['tan +/– 4 5 =', '-1', 'tan(-45) =', true],
        ['tan +', '0', 'tan(', true],
        ['tan ×', '0', 'tan(', true],
        ['tan =', '0', 'tan(', true],
        ['tan )', '0', 'tan(', true],
        ['tan %', '0', 'tan(', true],
        ['tan x2', '0', 'tan(', true],
        ['tan x!', '0', 'tan(', true],
        ['tan 1/x', '0', 'tan(', true],
        ['5 + tan ÷', '5', '5 + tan('],
        ['tan 4 5 C', '0', 'tan(', true],
        ['tan 4 5 C =', '0', 'tan(', true],
        ['tan 4 5 C 6 0 =', String(Math.sqrt(3)), 'tan(60) =', true],
        // every function that opens a bracket
        ['cos 6 0 =', '0.5', 'cos(60) =', true],
        ['sin-1 0 . 5 =', '30', 'sin<sup>-1</sup>(0.5) =', true],
        ['cos-1 0 . 5 =', '60', 'cos<sup>-1</sup>(0.5) =', true],
        ['tan-1 1 =', '45', 'tan<sup>-1</sup>(1) =', true],
        ['sinh 0 =', '0', 'sinh(0) ='],
        ['cosh 0 =', '1', 'cosh(0) ='],
        ['tanh 0 =', '0', 'tanh(0) ='],
        ['sinh-1 0 =', '0', 'sinh<sup>-1</sup>(0) ='],
        ['cosh-1 1 =', '0', 'cosh<sup>-1</sup>(1) ='],
        ['tanh-1 0 =', '0', 'tanh<sup>-1</sup>(0) ='],
        ['ln 1 =', '0', 'ln(1) ='],
        ['log 1 0 0 0 =', '3', 'log(1000) ='],
        ['log2 8 =', '3', 'log<sub>2</sub>(8) ='],
        ['log2 8', '8', 'log<sub>2</sub>(8'],
        ['√ 9 =', '3', '√(9) ='],
        ['√ 9', '9', '√(9'],
        ['√ 1 6 ) + 1 =', '5', '√(16) + 1 ='],
        ['ex 0 =', '1', 'e^0 ='],
        ['ex 1 + 1', '1', 'e^(1 + 1'],
        ['ex 1 + 1 =', String(Math.exp(2)), 'e^(1 + 1) ='],
        ['2x 1 0 =', '1024', '2^10 ='],
        ['2x 1 0', '10', '2^(10'],
        ['10x 3 =', '1000', '10^3 ='],
        ['10x 3', '3', '10^(3'],
        ['8 logy 2 =', '3', 'log<sub>2</sub>(8) ='],
        ['log 8 ) logy 2 =', Math.log2(Math.log10(8)), 'log<sub>2</sub>(log(8)) ='],
        ['abs – 3 =', '3', 'abs(-3) ='],
        // the keys after their number stay there
        ['5 x2 =', '25', '5<sup>2</sup> ='],
        ['2 x3 =', '8', '2<sup>3</sup> ='],
        ['5 x! =', '120', '5! ='],
        ['4 1/x =', '0.25', '1/4 ='],
        ['5 0 0 + 8 % =', '540', '500 + 8% ='],
        ['tan 4 5 x2 =', '1', 'tan(45<sup>2</sup>) =', true],
        ['8 x√y 3 =', '2', '<sup>3</sup>√8 ='],
        ['2 yx tan 4 5 =', '2', '2^tan(45) =', true],
        ['tan 4 EE 1 =', String(Math.tan(40)), 'tan(4E1) ='],
        // errors are found when the bracket closes
        ['tan 9 0 =', 'Error', 'tan(90) =', true],
        ['tan 9 0 )', 'Error', 'tan(90)', true],
        ['ln 0 =', 'Error', 'ln(0) ='],
        ['√ 4 +/– =', 'Error', '√(-4) ='],
        ['tan 9 0 = tan 4 5 =', '1', 'tan(45) =', true],
        ['tan 4 5 AC', '0', '']
    ].forEach(function (c) {
        var e = first(c[0], !!c[3]), value = e.error ? 'Error' : e.value;
        check(same(value, isNaN(+c[1]) ? c[1] : +c[1]) || value === c[1], 'tan-first  ' + c[0] + '  value', value);
        check(sq(e.equation()) === c[2], 'tan-first  ' + c[0] + '  line', sq(e.equation()));
    });

    var e, f, g, snap;

    // the unit is the one in use when the bracket closes
    e = first('sin 3 0', false);
    e.press(')', true);
    check(e.value === '0.5', 'the unit in use when the bracket closes counts', e.value);
    e = first('sin 3 0', false);
    e.press('=', true);
    check(e.value === '0.5' && e.past[0].node.deg === 1, 'and is kept with the history', JSON.stringify(e.past[0]));

    // the open root is drawn as the edited line draws it
    check(drawn.call(first('√ 9')) === '<span class="calc-sq">√</span>(9', 'an open √ is drawn', drawn.call(first('√ 9')));
    check(first('√ 9').text() === '√(9', 'and copied as text', first('√ 9').text());
    check(first('2 + sin-1 0 . 5').text() === '2 + sin⁻¹(0.5', 'an open function is copied with its bracket',
        first('2 + sin-1 0 . 5').text());

    // DEL takes the function back as it takes back a bracket
    e = first('2 + tan 4 5 )', true);
    var walk = [];
    while (e.del()) walk.push(sq(e.equation()));
    check(walk.join(' / ') === '2 + tan(45 / 2 + tan(4 / 2 + tan( / 2 + / 2 / ', 'DEL walks back through tan(',
        walk.join(' / '));

    // too many open brackets: the function waits like a bracket would
    e = first('');
    for (var k = 0; k < 40; k++) e.press('sin', false);
    check(e.levels.length === 30, 'at most 30 open brackets, functions included', e.levels.length);
    run(e, '0 =', false);
    check(e.value === '0' && !e.error, 'and they all close at =', e.value);

    // the cursor: an open function stays open when the cursor goes back to the end
    e = first('2 + tan 4 5', true);
    e.move('left', true);
    check(!!e.edit && sq(e.equation()) === '2 + tan(45', 'the cursor goes into an open function', sq(e.equation()));
    e.move('right', true);
    check(!e.edit && sq(e.equation()) === '2 + tan(45', 'and back at the end it is still open', sq(e.equation()));
    run(e, '+ 1 5 =', true);
    check(same(e.value, 2 + Math.sqrt(3)) && e.equation() === '2 + tan(45 + 15) =', 'so the keys after it go inside',
        state(e));
    e = first('2 + sin cos 0', false);
    e.move('home', false);
    e.move('end', false);
    run(e, ') + 1 =', false);
    check(sq(e.equation()) === '2 + sin(cos(0) + 1) =', 'nested open functions stay open', sq(e.equation()));
    e = first('√ 9', false);
    e.move('left', false);
    e.move('right', false);
    run(e, '+ 7 =', false);
    check(e.value === '4', 'an open root as well', state(e));
    e = first('ex 1', false);
    e.move('left', false);
    e.move('right', false);
    run(e, '+ 1 =', false);
    check(same(e.value, Math.exp(2)), 'and an open e^', state(e));
    e = first('1 + 2', false);
    e.move('left', false);
    run(e, 'sin', false);
    check(sq(e.equation()) === '1 + sin(2', 'in the middle of an equation sin writes sin( as before', sq(e.equation()));
    run(e, '=', false);
    check(same(e.value, 1 + Math.sin(2)), 'and = works it out', state(e));

    // paste: an open function stays open, as the keys would leave it
    e = first('');
    e.paste('sin(30', true);
    check(e.equation() === 'sin(30', 'pasted sin(30 stays open', e.equation());
    run(e, '+ 6 0 =', true);
    check(e.value === '1', 'and the keys after it go inside', state(e));
    e = first('');
    e.paste('2×cos(60', true);
    check(e.equation() === '2 × cos(60', 'after an operator too', e.equation());
    e = first('');
    e.paste('-cos(60', true);
    run(e, '=', true);
    check(e.value === '-0.5', 'a sign before an open function stays outside it', state(e));
    e = first('');
    e.paste('sin cos(0', false);
    run(e, '=', false);
    check(same(e.value, Math.sin(1)), 'a function before an open one is worked out on it', state(e));
    e = first('');
    e.paste('sin(30)', true);
    check(e.value === '0.5' && e.equation() === 'sin(30)', 'a closed one is worked out', state(e));
    e = first('tan', true);
    e.paste('45', true);
    run(e, '=', true);
    check(e.value === '1', 'a number pasted after tan goes in its bracket', state(e));
    e = first('tan', true);
    e.paste('40+5', true);
    run(e, '=', true);
    check(e.value === '1' && e.equation() === 'tan(40 + 5) =', 'an equation as well', state(e));
    e = new Engine();
    e.paste('sin(30', true);
    check(e.value === '0.5' && e.equation() === 'sin(30)', 'without tan-first a pasted sin(30 is closed as before',
        state(e));
    e = new Engine();
    e.paste('√(9', false);
    check(e.value === '3', 'and √(9 is read too', state(e));

    // the history: a calculation comes back the same, in either order
    e = first('2 + sin 3 0 ) × ln 1 =', true);
    f = new Engine();
    f.load(JSON.parse(JSON.stringify(e.save())));
    f.fnFirst = true;
    check(f.recall(0, false) && f.press('=', false) && f.value === e.value && f.equation() === e.equation(),
        'recalled tan-first', state(f));
    f.fnFirst = false;
    check(f.recall(0, false) && f.press('=', false) && f.value === e.value && f.equation() === e.equation(),
        'and recalled without it', state(f));

    // saved and loaded with a function still open
    e = first('2 + tan 4', true);
    f = new Engine();
    f.load(JSON.parse(JSON.stringify(e.save())));
    check(sq(f.equation()) === '2 + tan(4', 'an open function is saved', sq(f.equation()));
    run(f, '5 =', true);
    check(f.value === '3', 'and closes after loading', state(f));
    snap = JSON.parse(e.snapshot());
    snap.levels[1].fn = 'alert';
    g = new Engine();
    try {
        g.restore(JSON.stringify(snap));
        check(false, 'a saved state with an unknown function is refused');
    } catch (err) {
        check(true, 'a saved state with an unknown function is refused');
    }
    snap.levels[1].fn = '1/x';
    try {
        g.restore(JSON.stringify(snap));
        check(false, 'and with a function that does not open a bracket');
    } catch (err) {
        check(true, 'and with a function that does not open a bracket');
    }

    // changing the order in the middle of a calculation
    e = first('2 + tan 4 5', true);
    e.fnFirst = false;
    run(e, 'x2 ) =', true);
    check(e.equation() === '2 + tan(45<sup>2</sup>) =', 'an open function still closes after the order changes', state(e));
    e = first('tan', true);
    e.fnFirst = false;
    check(!e.press('sin', true), 'a function after its number cannot take the number not typed yet');
    e = new Engine();
    run(e, '3 0 sin', true);
    e.fnFirst = true;
    run(e, '+ sin 3 0 =', true);
    check(e.value === '1' && e.equation() === 'sin(30) + sin(30) =', 'both orders in one calculation', state(e));

    // Ans and memory go into the bracket
    e = first('2 + 3 = tan Ans + 4 0 =', true);
    check(e.value === '1', 'Ans in the bracket', state(e));
    e = first('4 5 m+ AC tan mr =', true);
    check(e.value === '1', 'the memory in the bracket', state(e));

    // a hundredth in a function typed first comes back from the history as a hundredth
    e = first('2 + log 1 % =');
    f = first();
    f.load(JSON.parse(JSON.stringify(e.save())));
    check(e.value === '0' && f.recall(0, false) && (f.press('=', false), f.value === '0') &&
        f.equation() === '2 + log(1%) =', '2 + log(1%) recalled', state(f));

    // fuzz: keys in any order never break the calculator, a finished line reads back to its
    // result, a calculation from the history comes back the same, and a saved state loads the same
    (function () {
        var pool = ('0 1 2 3 4 5 6 7 8 9 1 2 3 . +/– + – × ÷ + – × ÷ yx x√y logy EE ( ( ) ) ) ) = C π e Ans mr m+ ' +
                'x2 x3 x! 1/x ex 2x 10x sin cos tan sin-1 √ ln log log2 sinh tan-1 abs % % DEL ◀ ▶').split(' '),
            seed = 4242,
            read = 0,
            recalled = 0,
            n, i, keys, e, f, deg, line, p;

        function rnd() {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed / 2147483648;
        }

        for (n = 0; n < 4000 && failures < 20; n++) {
            e = first('');
            deg = rnd() < 0.5;
            keys = [];
            for (i = 3 + Math.floor(rnd() * 30); i--;) keys.push(pool[Math.floor(rnd() * pool.length)]);
            if (rnd() < 0.7) keys.push('=');
            try {
                keys.forEach(function (key) {
                    if (key === 'DEL') e.del();
                    else if (key === '◀' || key === '▶') e.move(key === '◀' ? 'left' : 'right', deg);
                    else e.press(key, deg);
                    f = new Engine(); // every state saves and loads as it is
                    f.restore(e.snapshot());
                    if (f.equation() !== e.equation()) throw new Error('loads as ' + f.equation() + ', not ' + e.equation());
                });
                e.text();
            } catch (err) {
                check(false, 'fuzz tan-first  ' + keys.join(' '), err.stack);
                continue;
            }
            if (e.done && e.done.t !== 'num' && !e.error && !e.edit) { // the finished line, pasted without tan-first, gives the result
                read++;
                line = e.text().replace(/=$/, '');
                f = new Engine();
                f.paste(line, deg);
                f.press('=', deg);
                if (!(same(f.value, +e.value) || (f.error && !isFinite(+e.value)))) {
                    check(false, 'fuzz tan-first read  ' + keys.join(' '), line + ' = ' + e.value + ', read back as ' + state(f));
                }
            }
            for (i = 0; i < e.past.length; i++) {
                p = e.past[i];
                f = new Engine();
                f.load(JSON.parse(JSON.stringify(e.save())));
                f.fnFirst = rnd() < 0.5;
                line = f.pastLine(i).line;
                if (!f.recall(i, rnd() < 0.5)) {
                    check(false, 'fuzz tan-first recall  ' + keys.join(' '), line + ' was refused');
                    continue;
                }
                f.press('=', deg);
                recalled++;
                if (f.value !== p.value || f.equation() !== line) {
                    check(false, 'fuzz tan-first recall  ' + keys.join(' '), line + ' ' + p.value + ' came back as ' + state(f));
                }
            }
        }
        check(read > 500, 'fuzz tan-first read back ' + read + ' finished lines');
        check(recalled > 500, 'fuzz tan-first recalled ' + recalled + ' calculations');
    })();
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
