// Run with: node test/engine.test.js
'use strict';

var Real = require('../js/engine.js'),
    // the keys as the engine takes them when a line is typed into it (a paste, the history, an
    // edit worked out): functions after their number, sin of 30 as 3 0 sin, and no templates.
    // The keys pressed on the calculator, with their templates, have checks of their own below
    Engine = function () {
        var e = new Real();
        e.fnFirst = false;
        e.typing = true;
        return e;
    },
    failures = 0,
    checks = 0,
    drawn = Real.prototype.equation;

Object.keys(Real).forEach(function (k) { Engine[k] = Real[k]; });
Engine.prototype = Real.prototype;

// The line is drawn as the editor draws it: each piece in a span a click finds, a root
// with a bar over what is under it. The checks below compare the line as it reads;
// the drawing itself has checks of its own
function unroot(s) {
    return s.replace(/<span class="calc-root">/g, '√').replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '').replace(/ +$/, '');
}

// the drawn line by its shape: √[…] a root with its bar over what is under it,
// [top / bottom] a fraction, □ an empty box, | the cursor; the click spans left out
function shape(h) {
    var out = '', stack = [], re = /<span([^>]*)>|<\/span>|<[^>]+>|[^<]+/g, m, a, top;
    while ((m = re.exec(h))) {
        top = stack[stack.length - 1];
        if (m[0] === '</span>') {
            out += stack.pop().end;
        } else if (m[1] !== undefined) {
            a = m[1];
            if (/calc-root/.test(a)) {
                out += '√[';
                stack.push({ end: ']' });
            } else if (/calc-fr-empty/.test(a)) {
                out += (top && top.fr && top.n++ ? ' / ' : '') + '□';
                stack.push({ end: '' });
            } else if (/class="calc-fr"/.test(a)) {
                out += '[';
                stack.push({ end: ']', fr: true, n: 0 });
            } else {
                if (/calc-cursor/.test(a)) out += '|';
                else if (!a && top && top.fr && top.n++) out += ' / ';
                stack.push({ end: '' });
            }
        } else {
            out += m[0];
        }
    }
    return out.replace(/ +$/, '');
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
    ['2 × 3 yx 2 + 1 =', '19', '2 × 3<sup>2</sup> + 1 ='],
    ['+ 3 =', '3', '0 + 3 ='],

    // operator typed twice replaces the first
    ['2 + ×', '2', '2 ×'],
    ['2 + × 3 =', '6', '2 × 3 ='],
    ['2 + 3 + × 4 =', '20', '(2 + 3) × 4 ='],
    ['2 + 3 × + 4 =', '9', '2 + 3 + 4 ='],
    ['2 + 3 × +', '5', '2 + 3 +'],
    ['2 – 3 × – 4 =', '-5', '2 – 3 – 4 ='],
    ['2 × 3 + × 4 =', '24', '2 × 3 × 4 ='],
    ['2 + 3 × yx 2 =', '11', '2 + 3<sup>2</sup> ='],

    // powers, roots, EE
    ['2 yx 3 =', '8', '2<sup>3</sup> ='],
    ['2 yx', '2', '2<sup></sup>'],
    ['2 yx 3 yx 2 =', '64', '(2<sup>3</sup>)<sup>2</sup> ='],
    ['2 +/– yx 2 =', '4', '(-2)<sup>2</sup> ='],
    ['2 yx 2 +/– =', '0.25', '2<sup>-2</sup> ='],
    ['8 x√y', '8', '<sup></sup>√8'],
    ['8 x√y 3 =', '2', '<sup>3</sup>√8 ='],
    ['5 EE', '5', '5E'],
    ['5 EE 3 =', '5000', '5E3 ='],
    ['5 EE 3 +/– =', 0.005, '5E-3 ='],
    ['5 EE 3 yx 2 =', '25000000', '(5E3)<sup>2</sup> ='],

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
    ['2 0 0 + 1 0 % yx 2 =', '600', '200 + 20<sup>2</sup> ='],
    ['2 0 0 + 1 0 % x2 =', '600', '200 + 20<sup>2</sup> ='],
    ['2 0 0 + 5 0 % √ =', '210', '200 + √100 ='],
    ['2 0 0 + 1 0 % +/– =', '180', '200 + -10% ='],
    ['2 0 0 + 1 0 % +/– × 2 =', '160', '200 + -20 × 2 ='],
    ['2 0 0 + 1 0 % × + 1 =', '221', '200 + 20 + 1 ='],
    ['2 0 0 + 1 0 % % =', '240', '200 + 20% ='],
    ['5 0 0 × 8 % × 2 =', '80', '500 × 8% × 2 ='],
    ['2 0 0 + 1 0 % = =', '240', '220 + 20 ='],
    ['1 6 +/– x√y . 5 =', '256', '<sup>0.5</sup>√-16 ='],
    ['2 +/– x√y . 2 =', '-32', '<sup>0.2</sup>√-2 ='],
    ['2 +/– x√y . 3 =', 'Error', '<sup>0.3</sup>√-2 ='],

    // 1/x next to × or ÷ keeps its brackets, so the line reads as it was computed
    ['8 ÷ 2 1/x =', '16', '8 ÷ (1/2) ='],
    ['8 × 2 1/x =', '4', '8 × (1/2) ='],
    ['8 + 2 1/x =', '8.5', '8 + 1/2 ='],
    ['2 1/x × 8 =', '4', '1/2 × 8 ='],

    // functions apply to the shown value
    ['3 0 sin', 0.5, 'sin(30)', true],
    ['3 0 sin ln', Math.log(0.5), 'ln(sin(30))', true],
    ['9 0 cos', 0, 'cos(90)', true],
    ['π sin', '0', 'sin(π)'],
    ['0 . 5 sin-1', 30, 'sin<sup>-1</sup>(0.5)', true],
    ['1 tan-1', Math.PI / 4, 'tan<sup>-1</sup>(1)'],
    ['1 sinh-1', Math.asinh(1), 'sinh<sup>-1</sup>(1)'],
    ['8 log2', '3', 'log<sub>2</sub>(8)'],
    // in gradians, 400 to a full turn, the same exact values as in degrees
    ['1 0 0 sin', '1', 'sin(100)', 2],
    ['2 0 0 cos', '-1', 'cos(200)', 2],
    ['3 0 0 sin', '-1', 'sin(300)', 2],
    ['4 0 0 cos', '1', 'cos(400)', 2],
    ['5 0 tan', '1', 'tan(50)', 2],
    ['1 0 0 tan', 'Error', 'tan(100)', 2],
    ['5 0 sin', Math.SQRT1_2, 'sin(50)', 2],
    ['4 5 0 sin', Math.SQRT1_2, 'sin(450)', 2],
    ['1 0 0 +/– sin', '-1', 'sin(-100)', 2],
    ['1 0 sin', Math.sin(Math.PI / 20), 'sin(10)', 2],
    ['1 sin-1', '100', 'sin<sup>-1</sup>(1)', 2],
    ['0 cos-1', '100', 'cos<sup>-1</sup>(0)', 2],
    ['1 tan-1', '50', 'tan<sup>-1</sup>(1)', 2],
    ['0 . 5 sin-1', 100 / 3, 'sin<sup>-1</sup>(0.5)', 2],
    ['1 0 0 sinh', Math.sinh(100), 'sinh(100)', 2],
    ['1 0 0 0 log', '3', 'log(1000)'],
    ['9 √', '3', '√9'],
    ['( 2 + 3 ) sin', Math.sin(5), 'sin(2 + 3)'],
    ['2 × 3 + sin', Math.sin(6), '2 × 3 + sin(6)'],
    ['2 + 9 √ =', '5', '2 + √9 ='],
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
    ['2 ex', Math.exp(2), 'e<sup>2</sup>'],
    ['3 2x', '8', '2<sup>3</sup>'],
    ['1 +/– ex', Math.exp(-1), 'e<sup>-1</sup>'],
    ['3 10x', '1000', '10<sup>3</sup>'],
    ['3 +/– 10x', '0.001', '10<sup>-3</sup>'],
    ['0 . 5 10x', Math.sqrt(10), '10<sup>0.5</sup>'],
    ['1 0 0 0 log 10x', '1000', '10<sup>log(1000)</sup>'],
    ['4 0 0 10x', 'Error', '10<sup>400</sup>'],

    // the logarithm to any base: the number, then the base
    ['8 logy 2 =', '3', 'log<sub>2</sub>(8) ='],
    ['2 4 3 logy 3 =', '5', 'log<sub>3</sub>(243) ='],
    ['1 0 0 0 logy 1 0 =', '3', 'log<sub>10</sub>(1000) ='],
    ['0 . 1 2 5 logy 2 =', '-3', 'log<sub>2</sub>(0.125) ='],
    ['8 logy 2 . 5 =', Math.log(8) / Math.log(2.5), 'log<sub>2.5</sub>(8) ='],
    ['8 logy', '8', 'log<sub></sub>(8)'],
    ['8 logy 2', '2', 'log<sub>2</sub>(8)'],
    ['2 + 8 logy 2 × 2 =', '8', '2 + log<sub>2</sub>(8) × 2 ='],
    ['( 2 + 6 ) logy 2 =', '3', 'log<sub>2</sub>(2 + 6) ='],
    ['8 logy ( 1 + 1 ) =', '3', 'log<sub>1 + 1</sub>(8) ='],
    ['2 yx 3 logy 2 =', '3', 'log<sub>2</sub>(2<sup>3</sup>) ='],
    ['8 logy 1 =', 'Error', 'log<sub>1</sub>(8) ='],
    ['8 logy 0 =', 'Error', 'log<sub>0</sub>(8) ='],
    ['8 logy 2 +/– =', 'Error', 'log<sub>-2</sub>(8) ='],
    ['8 +/– logy 2 =', 'Error', 'log<sub>2</sub>(-8) ='],
    ['0 logy 2 =', 'Error', 'log<sub>2</sub>(0) ='],

    // constants
    ['2 × π', String(Math.PI), '2 × π'],
    ['2 × π =', 2 * Math.PI, '2 × π ='],
    ['π', String(Math.PI), 'π'],
    ['π 5', '5', '5'],
    ['e', String(Math.E), 'e'],
    ['2 × e =', 2 * Math.E, '2 × e ='],
    ['e ln', '1', 'ln(e)'],
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
    ['π +/–', String(-Math.PI), '-π'],
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
    ['2 yx ( 1 + 2', '2', '2<sup>1 + 2</sup>'],
    ['2 yx ( 1 + 2 ) =', '8', '2<sup>1 + 2</sup> ='],
    ['8 x√y ( 1 + 2 ) =', '2', '<sup>1 + 2</sup>√8 ='],
    ['( 5 )', '5', '(5)'],
    ['( 2 + )', '4', '(2 + 2)'],

    // a bracket after a value multiplies
    ['5 (', '5', '5 × ('],
    ['5 ( 2 + 1 ) =', '15', '5 × (2 + 1) ='],
    ['( 2 + 3 ) ( 4 + 5 ) =', '45', '(2 + 3) × (4 + 5) ='],
    ['π ( 2 )', '2', 'π × (2)'],
    ['2 + 3 ( 4 ) =', '14', '2 + 3 × (4) ='],

    // equals
    // a number alone with = is not an equation: the line stays empty
    ['7 =', '7', ''],
    ['7 = =', '7', ''],
    ['7 +/– =', '-7', ''],
    ['1 2 . 5 =', '12.5', ''],
    ['=', '0', ''],
    ['π =', String(Math.PI), 'π ='], // a constant alone keeps its line, as π stays π
    ['9 √ =', '3', '√9 ='],
    ['2 + =', '4', '2 + 2 ='],
    ['2 + 3 = =', '8', '5 + 3 ='],
    ['2 + 3 = = =', '11', '8 + 3 ='],
    ['2 × ( 3 + 4 = =', '98', '14 × 7 ='],
    ['2 + 3 = 7 =', '7', ''],
    ['2 + 3 = 7 = =', '10', '7 + 3 ='],
    ['2 yx 3 = =', '512', '8<sup>3</sup> ='],
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
    ['4 +/– √', 'Error', '√-4'],
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
    ['9 x√y 2', ['9 | <sup></sup>√9', '9 | 9', '0 | ']],

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

// ---------- round, floor, ceil and trunc ---------- //

(function () {
    var e = new Engine();
    [
        ['2 . 5 round =', '3'], ['2 . 5 +/– round =', '-3'], ['2 . 4 round =', '2'], ['0 . 5 +/– round =', '-1'], ['2 . 7 floor =', '2'], ['2 . 7 +/– floor =', '-3'],
        ['2 . 1 ceil =', '3'], ['2 . 1 +/– ceil =', '-2'], ['0 . 5 +/– ceil =', '0'], ['3 . 7 trunc =', '3'], ['3 . 7 +/– trunc =', '-3'], ['0 . 7 ÷ 0 . 1 = floor =', '7']
    ].forEach(function (c) {
        run(e, 'AC ' + c[0]);
        check(e.value === c[1], c[0] + ' ' + c[1], state(e));
    });
    check(e.paste('floor(7.5) + ceil(0.2) + round(-1.5) + trunc(-2.9)', 0, true) && (run(e, '='), e.value === '4'), 'pasted: floor, ceil, round and trunc', state(e));
    check(Engine.graph('floor(x)', false, {}).at(-1.5) === -2 && Engine.graph('ceiling(x)', false, {}).at(1.2) === 2, 'graphed: floor(x), ceiling(x)');
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
    check(!e.paste('5$3', false, true) && state(e) === '44 | 2 + 42 =', 'whole: a currency between two numbers does not join them', state(e));
    ['5 3', '12 50', '1 2000', '0 200', '1234 567', '1 200 3'].forEach(function (text) {
        check(!e.paste(text, false, true) && state(e) === '44 | 2 + 42 =', 'whole: ' + text + ' is not one number', state(e));
    });
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
            ['sqrt(16)+2^3=', '12', '√16 + 2<sup>3</sup> ='],
            ['asin(0.5)', 30, 'sin<sup>-1</sup>(0.5)', true],
            ['sin^-1(0.5)', 30, 'sin<sup>-1</sup>(0.5)', true],
            ['sin^(-1)(0.5)', 30, 'sin<sup>-1</sup>(0.5)', true],
            ['sin⁻¹(0.5)', 30, 'sin<sup>-1</sup>(0.5)', true],
            ['2^3^2=', '512', '2<sup>3<sup>2</sup></sup> ='],
            ['-2^2=', '-4', '-(2<sup>2</sup>) ='],
            ['(-2)^2=', '4', '(-2)<sup>2</sup> ='],
            ['2π', String(Math.PI), '2 × π'],
            ['2*pi=', 2 * Math.PI, '2 × π ='],
            ['e', String(Math.E), 'e'],
            ['2*e+1=', 2 * Math.E + 1, '2 × e + 1 ='],
            ['e^2=', Math.exp(2), 'e<sup>2</sup> ='],
            ['2(3+4)=', '14', '2 × (3 + 4) ='],
            ['5!', '120', '5!'],
            ['10%', '0.1', '10%'],
            ['5²', '25', '5<sup>2</sup>'],
            ['5⁴=', '625', '5<sup>4</sup> ='],
            ['³√8=', '2', '<sup>3</sup>√8 ='],
            ['∛27=', '3', '<sup>3</sup>√27 ='],
            ['ˣ√8', '8', '<sup></sup>√8'],
            ['5E3=', '5000', '5E3 ='],
            ['1.5e-7 + 1', '1', '1.5E-7 + 1'],
            ['1,234.5 + 1', '1', '1234.5 + 1'],
            ['1.234,5 + 1', '1', '1234.5 + 1'],
            ['1 234,5 + 1', '1', '1234.5 + 1'],
            ['1 200', '1200', '1200'],
            ['12 500 000', '12500000', '12500000'],
            ['1\u00A0200,50', '1200.5', '1200.5'],
            ['1\u202F200.50 + 3 000=', '4200.5', '1200.50 + 3000 ='],
            ['1 200,50 €', '1200.5', '1200.5'],
            ['$1,200', '1200', '1200'],
            ['€1.200,50', '1200.5', '1200.5'],
            ['-¥1000', '-1000', '-1000'],
            ['$1,200.50 + $300=', '1500.5', '1200.50 + 300 ='],
            ['45.99 € * 2=', '91.98', '45.99 × 2 ='],
            ['US$ 5 + 5 USD=', '10', '5 + 5 ='],
            ['10 MOD 3=', '1', '10 mod 3 ='],
            ['SIN(30)', 0.5, 'sin(30)', true],
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
            ['2**10=', '1024', '2<sup>10</sup> ='],
            ['e^2', Math.exp(2), 'e<sup>2</sup>'],
            ['ln(e^3)=', 3, 'ln(e<sup>3</sup>) ='],
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
            ['8 logᵧ', '8', 'log<sub></sub>(8)'],
            ['logᵧ(8)', '8', 'log<sub></sub>(8)'],
            ['log₁(8)=', 'Error', 'log<sub>1</sub>(8) ='],
            ['10^3=', '1000', '10<sup>3</sup> ='],
            // degrees, minutes and seconds: a number in degrees; sin, cos and tan of it are worked out in Deg
            ['12°30′15″', 12.504166666666666, '12.50416666667', true],
            ['12°30\'15"', 12.504166666666666, '12.50416666667', true],
            ['12° 30\' 15\'\'', 12.504166666666666, '12.50416666667', true],
            ['12°30′', '12.5', '12.5', true],
            ['45°', '45', '45', true],
            ['-12°30′', '-12.5', '-12.5', true],
            ['51°30′26″N', 51.50722222222222, '51.50722222222', true],
            ['0°7′39″W', -0.1275, '-0.1275', true],
            ['33°52′S', -(33 + 52 / 60), '-33.86666666667', true],
            ['sin(30°)=', '0.5', 'sin(30) =', true],
            ['sin(30°)=', '0.5', 'sin(30) ='],
            ['cos(2×30°)=', '0.5', 'cos(2 × 30) ='],
            ['tan(45°)+sin(30)=', 1 + Math.sin(30), 'tan(45) + sin(30) ='],
            ['30°', '30', '30'],
            ['12°30′15″', 12.504166666666666, '12.50416666667'],
            ['2×45°=', '90', '2 × 45 =', true],
            ['12°30′ + 1=', '13.5', '12.5 + 1 =', true],
            ['sin 30', 0.5, 'sin(30)', true],
            ['sin(30', 0.5, 'sin(30)', true],
            ['-(2+3)', '-5', '-(2 + 3)'],
            ['2--3=', '5', '2 – -3 ='],
            ['2^-2=', '0.25', '2<sup>-2</sup> ='],
            ['1/4=', '0.25', '1 ÷ 4 ='],
            ['3 + ', '3', '3 +'],
            ['((2', '2', '((2'],
            ['5/0=', 'Error', '5 ÷ 0 ='],
            ['√(-4) + 2', 'Error', '√-4'],
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
            ['2e', Math.E, '2 × e'],
            ['1,234', '1234', '1234'],
            ['42abc', '42', '42'],
            ['2 + abc', '2', '2'],
            // numbers with more digits than the keys take are still part of the equation
            ['1234567890123456 + 1', '1', '1234567890123456 + 1'],
            ['1234567890123456 + 1 =', '1234567890123457', '1234567890123456 + 1 ='],
            ['0.003333333333333 × 2 =', 0.006666666666666, '0.003333333333333 × 2 ='],
            ['3.14159265358979323846 * 2 =', 2 * Math.PI, '3.14159265359 × 2 =']
        ],
        e, i, before;

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

    ['abc', '× 2', '', '   ', '()', '$', 'USD', '$abc', new Array(40).join('(') + '2', new Array(5000).join('(')].forEach(function (text) {
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
    [['2 yx', '1E2', '2<sup>100</sup> ='], ['2 yx', '1e2', '2<sup>100</sup> ='], ['2 yx', '1E2+5', '2<sup>1E2</sup> + 5 ='],
        ['2 yx', '2^3', '2<sup>2<sup>3</sup></sup> ='], ['2 yx', '3+1', '2<sup>3</sup> + 1 ='], ['5 EE', '2^3', '5E(2<sup>3</sup>) ='],
        ['8 x√y', '3', '<sup>3</sup>√8 ='], ['2 yx', '(1+2', '2<sup>1 + 2</sup> ='], ['5 ×', '2+3', '5 × 2 + 3 =']
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

    // a paste over what is selected in the shown equation goes in its place
    run(e, 'AC 1 2 3');
    e.point(1);
    check(e.pasteOver('7') && state(e) === '7 | 7' && !e.edit, 'a paste over all of an equation with the cursor in it replaces it', state(e));
    run(e, 'AC 2 + 3');
    check(e.pasteOver('7') && state(e) === '7 | 7', 'and over all of an equation being entered, not only its last number', state(e));
    run(e, 'AC 2 + 3');
    check(e.pasteOver('4*5=') && state(e) === '20 | 4 × 5 =', 'over all of it an equation is pasted as into a cleared display', state(e));
    run(e, 'AC 1 2 + 3 4');
    check(e.pasteOver('5', false, 0, 2) && e.text() === '5 + 34' && e.edit && e.edit.at === 1,
        'over the first number: the cursor is after what was pasted', e.text());
    run(e, '=');
    check(state(e) === '39 | 5 + 34 =', 'and = works it out', state(e));
    run(e, 'AC 1 2 + 3 4');
    check(e.pasteOver('5', false, 5, 7) && e.text() === '12 + 5' && e.edit.at === 4, 'over the last number: the cursor after it', e.text());
    before = e.snapshot() + e.history.length;
    check(!e.pasteOver('abc', false, 0, 2) && !e.pasteOver('abc') && e.snapshot() + e.history.length === before,
        'text that is no equation is refused, and what was selected stays');
    check(e.pasteOver('9', false, 3, 3) && e.text() === '12 + 59', 'nothing of it selected: pasted as without a selection, at the cursor', e.text());

    // and so does a key: a part is written over, as in a box of text
    run(e, 'AC 1 2 3 4 5');
    check(e.pressOver('9', false, 1, 4) && e.text() === '195' && e.edit && e.edit.at === 2, 'a digit over the 234 of 12345 leaves 195', e.text());
    run(e, 'AC 1 2 + 3 4');
    check(e.pressOver('×', false, 2, 5) && e.text() === '12 × 34', 'an operator over another one', e.text());
    run(e, '=');
    check(state(e) === '408 | 12 × 34 =', 'which = works out', state(e));
    run(e, 'AC 1 2 + 3 4');
    check(e.pressOver('5', false, 5, 7) && e.text() === '12 + 5', 'a digit over the last number', e.text());
    run(e, '6');
    check(e.text() === '12 + 56', 'and the next digit follows it', e.text());
    before = e.snapshot() + e.history.length;
    check(!e.pressOver('2nd', false, 0, 2) && !e.pressOver('Deg', false, 0, 2) && e.snapshot() + e.history.length === before,
        'a key that writes nothing leaves what is selected');

    // all of it selected, as with a result: a number starts again, an operator or a function goes on
    run(e, 'AC 1 2 3');
    check(e.pressOver('5') && state(e) === '5 | 5', 'a digit over all of a typed number starts a new one', state(e));
    run(e, 'AC 1 2 + 3 4');
    check(e.pressOver('π') && same(e.value, Math.PI) && !/12/.test(e.equation()), 'π over all of an equation replaces it', state(e));
    run(e, 'AC 1 2 + 3 4');
    check(e.pressOver('×') && state(e) === '34 | 12 + 34 ×', 'an operator goes on from it', state(e));
    run(e, 'AC 9');
    check(e.pressOver('√') && state(e) === '3 | √9', 'a function is of the number, not of nothing', state(e));
    run(e, 'AC 1 2 + 3 4');
    e.point(1);
    check(e.pressOver('+') && e.text() === '12 + 34 +' && e.edit.at === 6, 'with the cursor in it, from its end', e.text());
    run(e, 'AC 1 2 + 3 4');
    check(e.pressOver('=') && state(e) === '46 | 12 + 34 =', '= works it out as it is', state(e));

    // DEL takes out what is selected
    run(e, 'AC 1 2 + 3 4');
    check(e.cut(5, 7) && e.text() === '12 +', 'DEL over the last number', e.text());
    run(e, 'AC 1 2 + 3 4');
    check(e.cut(0, 2) && e.text().trim() === '+ 34' && e.edit.at === 0, 'over the first: the cursor is where it was', e.text());
    run(e, 'AC 1 2 + 3 4');
    check(e.cut() && state(e) === '0 | ', 'over all of it: the display is cleared', state(e));
    run(e, '1 2 + 3 4');
    check(!e.cut(3, 3) && state(e) === '34 | 12 + 34', 'nothing of it selected: nothing to take', state(e));
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
        deg = Math.floor(rnd() * 3); // Rad, Deg or Grad
        keys = [];
        for (i = 5 + Math.floor(rnd() * 40); i--;) keys.push(pool[Math.floor(rnd() * pool.length)]);
        keys.push('=');
        keys.forEach(function (key) { e.press(key, rnd() < 0.2 ? (deg + 1) % 3 : deg); }); // the unit changes now and then
        for (j = 0; j < e.past.length; j++) {
            p = e.past[j];
            f = new Engine();
            f.load(JSON.parse(JSON.stringify(e.save())));
            before = f.pastLine(j);
            if (!f.recall(j, Math.floor(rnd() * 3))) { // in any unit: each angle comes back in its own
                check(false, 'fuzz recall  ' + keys.join(' '), 'line ' + j + ' ' + before.text + ' was refused');
                continue;
            }
            f.press('=', Math.floor(rnd() * 3));
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
            case 'const': return n.name === 'e' ? Math.E : Math.PI; // π and e, each kept as itself
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

// ---------- degrees, minutes and seconds ---------- //

[
    [36.86989764584, '36°52′11.63″'],
    [45, '45°0′0″'],
    [0, '0°0′0″'],
    [12.504166666666666, '12°30′15″'],
    [-12.504166666666666, '-12°30′15″'],
    [2.75, '2°45′0″'],
    [59.99999999, '60°0′0″'], // 59.99996″ is the next minute, the next degree
    [10.0166666, '10°1′0″'], // 59.99976″ rounds up
    [10.016663, '10°0′59.99″'],
    [-0.000001, '0°0′0″'], // no -0°0′0″
    [1234.5, '1234°30′0″'],
    [999999999.5, '999999999°30′0″'],
    [1e9, null],
    [NaN, null],
    [Infinity, null]
].forEach(function (c) {
    check(Engine.dms(c[0]) === c[1], c[0] + ' in degrees, minutes and seconds', Engine.dms(c[0]));
});

(function () {
    var e = new Engine(), f = new Engine();
    e.dms = true;
    run(e, '0 . 6 sin-1 =', true);
    e.dms = false;
    run(e, '2 + 3 =');
    check(e.past[0].dms === 1 && !e.past[1].dms, 'a calculation keeps °′″ in the history', JSON.stringify(e.past));
    f.load(JSON.parse(JSON.stringify(e.save())));
    check(f.past[0].dms === 1, 'and so after a reload');
    check(Engine.dms(+e.past[0].value) === '36°52′11.63″', 'its result as the history shows it', Engine.dms(+e.past[0].value));
    e = new Engine();
    run(e, '1 +');
    e.startEdit();
    check(e.paste('30°', false) && e.move('end', false) && (e.press('=', false), e.value === '31'),
        'pasted at the cursor, 30° is 30', state(e));
    e = new Engine();
    check(e.paste('sin(30°)=', false) && e.value === '0.5' && e.pastLine(0).unit === 'Deg',
        'sin(30°) in Rad is kept in the history as done in Deg', e.value + ' ' + e.pastLine(0).unit);
    check(e.recall(0, false) && (e.press('=', false), e.value === '0.5'), 'and comes back so', state(e));
    [['12°30′15″', true], ['-12°30′', true], [' 51°30′26″N ', true], ['30°', true], ['30° + 1', false], ['sin(30°)', false],
        ['12.5', false], ['--12°', false], ['', false]].forEach(function (c) {
        check(Engine.angleAlone(c[0]) === c[1], JSON.stringify(c[0]) + (c[1] ? ' is' : ' is not') + ' an angle alone');
    });
})();

// ---------- gradians in the history ---------- //

(function () {
    var e = new Engine(), f = new Engine();
    run(e, '1 0 0 sin =', 2);
    run(e, '9 0 sin =', 1);
    run(e, '1 0 0 sin + 9 0 cos =', 2);
    check(e.pastLine(0).unit === 'Grad' && e.pastLine(1).unit === 'Deg', 'the history marks gradians',
        e.pastLine(0).unit + ' ' + e.pastLine(1).unit);
    f.load(JSON.parse(JSON.stringify(e.save())));
    check(f.recall(0, false) && (f.press('=', false), f.value === '1'), 'sin(100) done in Grad comes back in Grad', state(f));
    check(f.recall(2, 1) && (f.press('=', 1), same(f.value, 1 + Math.cos(Math.PI * 90 / 200))),
        'a line done in Grad, recalled in Deg, is in Grad', state(f));
    e = new Engine();
    e.press('1', 2);
    e.press('0', 2);
    e.press('0', 2);
    e.press('sin', 2);
    e.press('+', 2);
    e.press('3', 1);
    e.press('0', 1);
    e.press('sin', 1);
    e.press('=', 1);
    check(e.value === '1.5' && e.pastLine(0).unit === 'Deg Grad', 'one line in two units', state(e) + ' ' + e.pastLine(0).unit);
})();

// ---------- a root is drawn with a bar over what is under it ---------- //

[
    ['9 9 √', '√[99]'],
    ['( 2 + 3 ) √', '√[2 + 3]'],
    ['8 x√y 3', '<sup>3</sup>√[8]'],
    ['9 9 √ x√y 8 6', '<sup>86</sup>√[√[99]]']
].forEach(function (c) {
    var e = new Engine();
    run(e, c[0]);
    check(shape(drawn.call(e)) === c[1], c[0] + '  drawn with its bar', shape(drawn.call(e)));
});

// ---------- a root of a root: drawn one under the other's bar, its text in brackets ---------- //

[
    ['9 9 √ x√y 8 6 =', Math.pow(99, 1 / 172), '<sup>86</sup>√[√[99]] =', '⁸⁶√(√(99)) ='],
    ['6 4 x√y 3 x√y 2 =', 2, '<sup>2</sup>√[<sup>3</sup>√[64]] =', '²√(³√64) ='],
    ['8 x√y', 8, '<sup>□</sup>√[8]', 'ˣ√8']
].forEach(function (c) {
    var e = new Engine(), b = new Engine();
    run(e, c[0]);
    check(same(e.value, c[1]) && shape(drawn.call(e)) === c[2] && e.text() === c[3], c[0] + '  line',
        e.value + ' | ' + shape(drawn.call(e)) + ' | ' + e.text());
    check(b.paste(e.text()) && same(b.value, +e.value), c[0] + '  pastes back', b.value);
});

// ---------- nCr, nPr and abs ---------- //

[
    ['1 0 nCr 3 =', '120', '10 nCr 3 ='],
    ['5 nPr 2 =', '20', '5 nPr 2 ='],
    ['5 nCr 0 =', '1', '5 nCr 0 ='],
    ['5 nCr 5 =', '1', '5 nCr 5 ='],
    ['2 × 5 nCr 2 =', '20', '2 × 5 nCr 2 ='],
    ['5 nCr 2 yx 2 =', '5', '5 nCr 2<sup>2</sup> ='],
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

    // the quartiles, as a TI-84 finds them, the median in neither half; the ranges, the mode and s²
    s = Engine.stats('2 4 4 4 5 5 7 9');
    check(s.q1 === 4 && s.q3 === 6 && s.iqr === 2 && s.range === 7 && s.mode === 4 && same(s.vars, 32 / 7) && s.values.join(' ') === '2 4 4 4 5 5 7 9',
        'the textbook list: Q1 4, Q3 6, mode 4, s² 32/7', JSON.stringify(s));
    s = Engine.stats('7 1 3 5 2 6 4');
    check(s.q1 === 2 && s.median === 4 && s.q3 === 6 && s.iqr === 4 && isNaN(s.mode), 'an odd list: the median left out of the halves; no number twice, no mode', JSON.stringify(s));
    s = Engine.stats('0.1 0.2 0.3 0.4');
    check(s.q1 === 0.15 && s.q3 === 0.35 && s.iqr === 0.2 && s.range === 0.3 && same(s.vars, 1 / 60), 'the quartiles and ranges exact: 0.35 – 0.15 is 0.2', JSON.stringify(s));
    check(isNaN(Engine.stats('1 1 2 2').mode) && Engine.stats('1 1 2 2 2').mode === 2, 'two that come most often: no mode');
    s = Engine.stats('42');
    check(isNaN(s.q1) && isNaN(s.q3) && isNaN(s.iqr) && s.range === 0 && isNaN(s.vars) && isNaN(s.mode), 'one number: no quartiles, no s²', JSON.stringify(s));
})();

// pairs: x and y on each line, and the line of best fit through them
(function () {
    var p = Engine.pairs('1 2\n2 4.1\n3 5.9\n4 8.2\n5 9.9');
    check(p.n === 5 && p.sumx === 15 && p.sumy === 30.1 && p.sumx2 === 55 && p.sumy2 === 220.87 && p.sumxy === 110.2 && p.xmean === 3 && p.ymean === 6.02 &&
        p.b === 1.99 && p.a === 0.05 && p.cov === 4.975 && same(p.sx, Math.sqrt(2.5)) && same(p.sdpx, Math.sqrt(2)) && same(p.r, 19.9 / Math.sqrt(10 * 39.668)) &&
        same(p.r2, p.r * p.r), 'five pairs: y = 0.05 + 1.99x, exact', JSON.stringify(p));
    p = Engine.pairs('1\t2\n2\t4\r\nfoo\n3 3 3\n\n');
    check(p.n === 2 && p.bad.join('|') === 'foo|3 3 3' && p.b === 2 && p.a === 0 && p.r === 1 && p.xs.join() === '1,2' && p.ys.join() === '2,4',
        'two columns of a spreadsheet; a line not of two numbers left out', JSON.stringify(p));
    p = Engine.pairs('1,5; 2,5\n2,5; 3');
    check(p.n === 2 && p.xs.join(' ') === '1.5 2.5' && p.ys.join(' ') === '2.5 3', 'with semicolons, a comma is the decimal mark', JSON.stringify(p));
    p = Engine.pairs('1 234,5 6\n2 7', true, 'space');
    check(p.n === 1 && p.bad[0] === '1 234,5 6', 'apart by spaces only, 1 234,5 is two numbers', JSON.stringify(p));
    p = Engine.pairs('1 234,5\t6\n2\t7', true, 'tab');
    check(p.n === 2 && p.xs[0] === 1234.5, 'apart by tabs, 1 234,5 is one', JSON.stringify(p));
    p = Engine.pairs('2 5\n2 7');
    check(isNaN(p.b) && isNaN(p.a) && isNaN(p.r) && p.cov === 0, 'every x the same: no line', JSON.stringify(p));
    p = Engine.pairs('1 5\n2 5\n3 5');
    check(p.b === 0 && p.a === 5 && isNaN(p.r), 'every y the same: a flat line, no r', JSON.stringify(p));
    p = Engine.pairs('3 4');
    check(p.n === 1 && isNaN(p.sx) && isNaN(p.b) && p.sdpx === 0, 'one pair: no line', JSON.stringify(p));
    check(Engine.pairs('  \n ').n === 0, 'no pairs');
})();

// ---------- the cursor and the templates ---------- //

// The keys as they are pressed on the calculator: a function, a root, a power and a key of
// two numbers pressed first come as templates, boxes to fill, and the line is edited as a tree
(function () {
    var e, f, saved;

    function flat(h) { // the drawn line as text: | the cursor, □ an empty box, (a)/(b) a fraction
        return h.replace(/<span class="calc-cursor"><\/span>/g, '|').replace(/<span class="calc-fr-empty[^"]*"[^>]*><\/span>/g, '□')
            .replace(/<span class="calc-root">/g, '√').replace(/<span class="calc-fr"><span>/g, '(').replace(/<\/span><span>/g, ')/(')
            .replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '').replace(/ +$/, '');
    }

    function ed(e) { // the line with | at the cursor
        return e.edit ? flat(e.editView().html) : 'not editing: ' + st(e);
    }

    function st(e) {
        return (e.error ? 'Error' : e.value) + ' | ' + flat(e.equation());
    }

    function keys(e, list) { // ENT: Enter
        list.split(' ').forEach(function (k) {
            if (k === 'ENT') e.enter(true);
            else e.press(k, true);
        });
    }

    // into the equation being entered, change a digit, back to the end
    e = new Real();
    keys(e, '1 2 + 3 4 × 5');
    check(e.move('left') && ed(e) === '12 + 34 × |5', '◀ puts the cursor before the last piece', ed(e));
    [1, 2, 3, 4, 5].forEach(function () { e.move('left'); });
    check(ed(e) === '1|2 + 34 × 5', '◀ steps over digits, operators', ed(e));
    check(e.del() && ed(e) === '|2 + 34 × 5', 'DEL removes the piece before the cursor', ed(e));
    check(!e.del() && ed(e) === '|2 + 34 × 5', 'DEL at the start does nothing', ed(e));
    e.press('7');
    check(ed(e) === '7|2 + 34 × 5', 'a digit is written at the cursor', ed(e));
    check(e.move('end') && ed(e) === '72 + 34 × 5|', 'End goes to the end of the line', ed(e));
    e.press('=');
    check(st(e) === '242 | 72 + 34 × 5 =', '= works it out', st(e));
    e.press('–');
    check(st(e) === '242 | 242 –', 'keys after it work as before', st(e));

    // after '=': ◀ edits it from its end, ▶ from its start
    e = new Real();
    keys(e, '1 ÷ 3 × 3 =');
    check(e.move('left') && ed(e) === '1 ÷ 3 × 3|', '◀ after = edits the equation from its end', ed(e));
    e = new Real();
    keys(e, '1 ÷ 3 × 3 =');
    check(e.move('right') && ed(e) === '|1 ÷ 3 × 3', '▶ after = puts the cursor at its start', ed(e));
    keys(e, '2 ×');
    e.press('=');
    check(st(e) === '2 | 2 × 1 ÷ 3 × 3 =', '= while editing finishes it', st(e));

    // a template written in the line: the cursor in its box
    e = new Real();
    keys(e, '2 + 3');
    e.move('home');
    e.move('right');
    e.press('x2');
    check(ed(e) === '2<sup>2</sup>| + 3', 'x² raises the number before the cursor', ed(e));
    e.press('=');
    check(st(e) === '7 | 2<sup>2</sup> + 3 =', '... and is worked out', st(e));
    e = new Real();
    keys(e, '1 0 + 3');
    e.move('left');
    e.del();
    e.press('nCr');
    e.press('=');
    check(st(e) === '120 | 10 nCr 3 =', 'nCr written at the cursor', st(e));
    e = new Real();
    keys(e, '3 ( 2');
    e.press('sin');
    check(ed(e) === '3 × (2 × sin(□)', 'a function after a number is times it', ed(e));

    // computed numbers keep all their digits through an edit, and π stays π
    e = new Real();
    keys(e, 'π × 2');
    e.move('home');
    e.press('1');
    e.press('+');
    e.press('=');
    check(e.value === String(1 + Math.PI * 2) && st(e) === e.value + ' | 1 + π × 2 =', 'π is not rounded by an edit', st(e));

    // a line that cannot be read stays to be edited, and = shows Error
    e = new Real();
    keys(e, '2 + 3');
    e.move('left');
    e.press('×');
    e.move('end');
    check(ed(e) === '2 +  × 3|', 'a line that cannot be read keeps the cursor', ed(e));
    e.press('=');
    check(e.error && flat(e.equation()) === '2 +  × 3', '= on it is an Error', e.equation());
    check(e.move('left') && ed(e) === '2 +  × 3|', 'the line of the Error can be edited', ed(e));
    e.move('left');
    e.move('left');
    e.del();
    e.press('=');
    check(st(e) === '6 | 2 × 3 =', 'and fixed', st(e));
    e = new Real();
    keys(e, '1 ÷ 0 =');
    check(st(e) === 'Error | 1 ÷ 0 =', '1 ÷ 0 is an Error', st(e));
    e.move('left');
    e.del();
    e.press('4');
    e.press('=');
    check(st(e) === '0.25 | 1 ÷ 4 =', 'an Error of = is fixed', st(e));

    // a click: characters from the start of the shown line
    e = new Real();
    keys(e, '1 2 + 3 4');
    check(e.point(1) && ed(e) === '1|2 + 34', 'a click puts the cursor between pieces', ed(e));
    e = new Real();
    keys(e, '1 2 + 3 4');
    check(!e.point(7) && !e.edit, 'a click at the end leaves the line as it is', st(e));
    e = new Real();
    keys(e, '1 2 + 3 4 =');
    check(e.point(4) && ed(e) === '12 + |34', 'a click on the line above a result', ed(e));
    e = new Real();
    e.put(5);
    check(!e.point(0) && !e.edit, 'a number put in alone has nothing to edit', st(e));

    // C, paste, Ans, saving
    e = new Real();
    keys(e, '2 + 3');
    e.move('left');
    e.press('C');
    check(!e.edit && st(e) === '0 | ', 'C while editing clears all', st(e));
    e = new Real();
    keys(e, '2 + 3');
    e.move('left');
    check(e.paste('4×') && ed(e) === '2 + 4 × |3', 'paste goes in at the cursor', ed(e));
    e.ans = 7;
    e.press('Ans');
    check(ed(e) === '2 + 4 × 7|3', 'Ans is written as a number', ed(e));
    check(e.put(1.5) && ed(e) === '2 + 4 × 71.5|3', 'a result from the history too', ed(e));
    check(e.text() === '2 + 4 × 7 × 1.5 × 3', 'numbers put in whole are times each other and the next', e.text());
    saved = JSON.parse(JSON.stringify(e.save()));
    f = new Real();
    f.load(saved);
    check(f.edit && ed(f) === ed(e), 'the cursor is kept when the calculator closes', f.edit && ed(f));
    f.press('=');
    check(st(f) === '128 | 2 + 4 × 7 × 1.5 × 3 =', 'and is worked out so', st(f));
    e = new Real();
    keys(e, '2 + 3');
    e.move('left');
    while (e.del());
    check(ed(e) === '|3', 'DEL down to the start of the line', ed(e));

    // templates: pressed first, a function, a root, a key of two numbers come as boxes
    e = new Real();
    e.press('sin');
    check(ed(e) === 'sin(□)', 'sin pressed first is sin and its box', ed(e));
    keys(e, '3 0');
    check(ed(e) === 'sin(30|)', 'the number goes in the box', ed(e));
    check(e.enter(true) && ed(e) === 'sin(30)|', 'Enter closes it: sin(30)', ed(e));
    check(!e.enter(true), 'Enter at the end of the line is left to =');
    e.press('=', true);
    check(st(e) === '0.5 | sin(30) =', '= works it out', st(e));
    e = new Real();
    keys(e, 'sin 3 0 ENT + 1 =');
    check(st(e) === '1.5 | sin(30) + 1 =', 'closed, the line goes on after it', st(e));
    e = new Real();
    keys(e, 'sin 3 0 ) + 1 =');
    check(st(e) === '1.5 | sin(30) + 1 =', ') closes it too', st(e));
    e = new Real();
    e.press('x√y');
    check(ed(e) === '<sup>□</sup>√□', 'x√y pressed first: the root first, then what is under it', ed(e));
    e.press('3');
    check(e.enter(true) && ed(e) === '<sup>3</sup>√□', 'Enter goes on to the next box', ed(e));
    keys(e, '8 =');
    check(st(e) === '2 | <sup>3</sup>√8 =', '³√8', st(e));
    e = new Real();
    keys(e, 'x√y 3 ENT 8 ENT 2 =');
    check(st(e) === '4 | <sup>3</sup>√8 × 2 =', 'a number after a template is times it', st(e));
    e = new Real();
    e.press('nCr');
    check(ed(e) === '□ nCr □', 'nCr pressed first: two boxes', ed(e));
    e.press('5');
    check(e.tab() && ed(e) === '5 nCr □', 'Tab goes to the next box', ed(e));
    e.press('2');
    check(e.tab(true) && ed(e) === '5| nCr 2', 'Shift+Tab back', ed(e));
    e.press('=');
    check(st(e) === '10 | 5 nCr 2 =', '5 nCr 2', st(e));
    e = new Real();
    e.press('1/x');
    check(ed(e) === '1/□', '1/x pressed first: 1 over a box', ed(e));
    keys(e, '4 =');
    check(st(e) === '0.25 | 1 ÷ 4 =', '1 ÷ 4', st(e));
    e = new Real();
    e.press('x!');
    check(ed(e) === '□!', 'x! pressed first: a box and !', ed(e));
    keys(e, '5 =');
    check(st(e) === '120 | 5! =', '5!', st(e));
    e = new Real();
    keys(e, '5 x!');
    check(st(e) === '120 | 5!', 'x! after a number as before', st(e));

    // DEL as the line typed out would lose it
    e = new Real();
    keys(e, 'x√y 3 ENT 8 =');
    e.move('left');
    check(ed(e) === '<sup>3</sup>√8|', 'the cursor after a template', ed(e));
    check(e.del() && ed(e) === '<sup>3</sup>√□', 'DEL takes the last of its last box', ed(e));
    e = new Real();
    keys(e, '5 nCr 2 =');
    e.move('left');
    e.move('left');
    check(e.del() && ed(e) === '5|2', 'DEL before the second number takes nCr', ed(e));

    // fractions: a/b draws a division as one, and edits it as one
    e = new Real();
    e.fraction = true;
    keys(e, '1 2 ÷ 3 4');
    e.move('left');
    check(ed(e) === '(12)/(34|', 'a fraction is edited as drawn', ed(e));
    e.del();
    e.del();
    check(ed(e) === '(12)/(□', 'DEL empties its bottom', ed(e));
    check(e.del() && ed(e) === '12|', 'and then takes its bar, as ÷ is taken', ed(e));
    e = new Real();
    keys(e, '1 + 2 ÷ 3 × 4');
    e.move('left');
    e.setFraction(true);
    check(ed(e) === '1 + (2)/(3 × |4', 'a/b while editing: the divisions as fractions, the cursor kept', ed(e));
    e.setFraction(false);
    check(ed(e) === '1 + 2 ÷ 3 × |4', 'and back', ed(e));
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
        [999999, 'eng', 2, '1.00e+6'],
        [1500, 'sci', 'auto', '1.5e+3'],
        [123456, 'eng', 'auto', '123.456e+3'],
        [1 / 3, 'sci', 'auto', '3.333333333333e-1'],
        [-0.000123, 'eng', 'auto', '-123e-6'],
        [0, 'sci', 'auto', '0'],
        [12.5, 'fix', 'auto', null]
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
        check(Engine.group(c[0], true) === c[1], 'group ' + c[0] + ' with commas', Engine.group(c[0], true));
        check(Engine.group(c[0], 'space') === c[1].replace(/,/g, '\u2009'), 'group ' + c[0] + ' with spaces', Engine.group(c[0], 'space'));
    });
    (function () { // what is shown with spaces pastes back as the same number
        var e = new Engine();
        check(e.paste(Engine.group('1234567.891', 'space')) && e.value === '1234567.891', 'a number grouped with spaces pastes back', e.value);
    })();
    // a comma as the decimal mark: dots, or thin spaces, between the thousands, and the mark alone
    [
        ['1234567.891', '1.234.567,891', '1234567,891'],
        ['-1234', '-1.234', '-1234'],
        ['999', '999', '999'],
        ['0.12345', '0,12345', '0,12345'],
        ['1.234567e+20', '1,234567e+20', '1,234567e+20'],
        ['12345 + 6789 × 0.5', '12.345 + 6.789 × 0,5', '12345 + 6789 × 0,5'],
        ['12.', '12,', '12,'],
        ['36°52′11.63″', '36°52′11,63″', '36°52′11,63″'],
        ['2<sup>10</sup> + 1500.25', '2<sup>10</sup> + 1.500,25', '2<sup>10</sup> + 1500,25']
    ].forEach(function (c) {
        var spaced = c[1].replace(/\./g, '\u2009');
        check(Engine.group(c[0], 'dot') === c[1], 'group ' + c[0] + ' with dots', Engine.group(c[0], 'dot'));
        check(Engine.group(c[0], 'spacecomma') === spaced, 'group ' + c[0] + ' with spaces and a comma', Engine.group(c[0], 'spacecomma'));
        check(Engine.decimal(c[0], 'dot') === c[2] && Engine.decimal(c[0], 'spacecomma') === c[2], 'the decimal comma alone in ' + c[0],
            Engine.decimal(c[0], 'dot'));
        check(Engine.decimal(c[0], true) === c[0] && Engine.decimal(c[0], 'space') === c[0] && Engine.decimal(c[0], false) === c[0],
            'and the point kept in ' + c[0]);
    });
    check(Engine.decimal('.', 'dot') === ',' && Engine.decimal('.', 'space') === '.', 'the point key alone, in an equation with the cursor in it');
    check(Engine.comma('dot') && Engine.comma('spacecomma') && !Engine.comma('space') && !Engine.comma(true) && !Engine.comma(false),
        'which formats have a decimal comma');
    // what is pasted is read with the decimal mark in use: 1.234 and 1,234 are each two numbers
    [
        // [pasted, its value with a point as the mark, with a comma]
        ['1.234', '1.234', '1234'],
        ['1,234', '1234', '1.234'],
        ['12.345.678', '12345678', '12345678'],
        ['1,234,567', '1234567', '1234567'],
        ['1.234,5', '1234.5', '1234.5'],
        ['1,234.5', '1234.5', '1234.5'],
        ['3.14', '3.14', '3.14'],
        ['0.5', '0.5', '0.5'],
        ['1,5', '1.5', '1.5'],
        ['1.5e3', '1500', '1500'],
        ['2.500 + 1.250 =', '3.75', '3750'],
        ['12.345,67 €', '12345.67', '12345.67']
    ].forEach(function (c) {
        [false, true].forEach(function (comma) {
            var e = new Engine();
            e.comma = comma;
            check(e.paste(c[0], false, true) && e.value === c[comma ? 2 : 1], 'paste ' + c[0] + (comma ? ' with a decimal comma' : ' with a decimal point'),
                e.value);
        });
    });
    ['dot', 'spacecomma'].forEach(function (how) { // what is shown or copied so pastes back as the same number
        ['1234567.891', '1234', '1.234', '0.5', '1234.5'].forEach(function (n) {
            [Engine.group(n, how), Engine.decimal(n, how)].forEach(function (text) {
                var e = new Engine();
                e.comma = true;
                check(e.paste(text) && e.value === n, how + ': ' + text + ' pastes back as ' + n, e.value);
            });
        });
    });
    (function () { // a list of the statistics: the comma is the decimal mark, so it is not between two numbers
        var s = Engine.stats('1,5 2,5; 1.234,5\n3', true), usual = Engine.stats('1,5 2,5');
        check(s.n === 4 && s.sum === 1241.5 && !s.bad.length, 'a list with decimal commas', JSON.stringify(s));
        check(usual.n === 4 && usual.sum === 13, 'and with a decimal point a comma is between two numbers, as before', JSON.stringify(usual));
    })();
    // what is between the numbers of a list: found by itself, or the one chosen, and then only that
    [
        // [list, decimal comma, between, how many, sum, left out]
        ['1\u2009234.5 10', false, undefined, 2, 1244.5],
        ['1\u00A0234,5 10', true, 'auto', 2, 1244.5],
        ['1\u202F234\u202F567 1', false, 'auto', 2, 1234568],
        ['1 234.5 10', false, 'auto', 3, 245.5], // a space typed is between two numbers
        ['1,234.5 10', false, 'auto', 3, 245.5],
        ['1 234,5\n1.234,5\n-3', true, 'line', 3, 2466],
        ['1,234.5\n1 234.5\n€ 10\n$1,200', false, 'line', 4, 3679],
        ['4\t8\r\n15', false, 'line', 3, 27], // a row and a column of a spreadsheet
        ['1,234.5 10 1.5', false, 'space', 3, 1246],
        ['1.234,5 10', true, 'space', 2, 1244.5],
        ['1,234.5; 1 000; 2', false, 'semi', 3, 2236.5],
        ['1,5;2,5', true, 'semi', 2, 4],
        ['1 234.5, 10, 2.5', false, 'comma', 3, 1247],
        ['1.234, 10', true, 'comma', 2, 1244],
        ['1 234,5\t10\n2', true, 'tab', 3, 1246.5],
        ['1,234.5 | 10 | $2', false, 'pipe', 3, 1246.5],
        ['1,5:2,5: 1 000', true, 'colon', 3, 1004],
        ['abc\n12\n1 2', false, 'line', 1, 12, 'abc|1 2']
    ].forEach(function (c) {
        var s = Engine.stats(c[0], c[1], c[2]);
        check(s.n === c[3] && s.sum === c[4] && s.bad.join('|') === (c[5] || ''),
            'a list ' + JSON.stringify(c[0]) + ' apart by ' + (c[2] || 'auto') + (c[1] ? ', decimal comma' : ''), JSON.stringify(s));
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
    var e = new Engine();
    run(e, '1 ÷ 2 + 1 ÷');
    check(shape(e.equation(true)) === '[1 / 2] + [1 / □]', 'a division waits for its bottom part', shape(e.equation(true)));
    run(e, '3 =');
    check(shape(e.equation(true)) === '[1 / 2] + [1 / 3] =', 'the finished line', shape(e.equation(true)));
    check(e.equation() === '1 ÷ 2 + 1 ÷ 3 =' && e.text() === '1 ÷ 2 + 1 ÷ 3 =', 'the line without fraction mode, and copied',
        e.equation());
    e = new Engine();
    run(e, '2 + 3 ÷ ( 4 – 1 ) × 5 1/x =');
    check(shape(e.equation(true)) === '2 + [3 / 4 – 1] × [1 / 5] =', 'parts need no brackets of their own',
        shape(e.equation(true)));
    e = new Engine();
    run(e, '8 ÷ ( 1 ÷ 2 ) =');
    check(shape(e.equation(true)) === '[8 / [1 / 2]] =', 'a fraction over a fraction', shape(e.equation(true)));
    e = new Engine();
    run(e, '( 1 ÷ 2 ) x2 =');
    check(shape(e.equation(true)) === '([1 / 2])<sup>2</sup> =', 'a raised fraction keeps its brackets', shape(e.equation(true)));
})();

// ---------- function keys before their number: tan 45 ---------- //

// As the keys are pressed on the calculator: a function pressed first is its template,
// the number typed into its box; Enter or ) closes it, = works it out
(function () {
    function first(keys, deg) {
        var e = new Real();
        if (keys) run(e, keys, deg);
        return e;
    }

    function sq(s) { // the line as drawn, by its shape
        return shape(s);
    }

    // [keys, display value ('Error' for an error; null while a box is still being filled), equation line, degrees?]
    [
        // the function's box, closed by ) or worked out by =
        ['tan', null, 'tan(□)', true],
        ['tan 4 5', null, 'tan(45)', true],
        ['tan 4 5 )', null, 'tan(45)', true],
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
        ['√ √ 1 6 =', '2', '√[√[16]] ='],
        // a number before the function multiplies it, as before a bracket
        ['2 tan 4 5 =', '2', '2 × tan(45) =', true],
        ['2 + 3 tan 4 5 =', '5', '2 + 3 × tan(45) =', true],
        ['( 2 ) sin 3 0 =', '1', '(2) × sin(30) =', true],
        ['π sin', null, 'π × sin(□)'],
        // after = it starts a new calculation, and an operator goes on from the result
        ['2 + 3 = tan 4 5 =', '1', 'tan(45) =', true],
        ['2 + 3 = tan', null, 'tan(□)', true],
        ['2 + 3 = + 1 =', '6', '5 + 1 ='],
        // – after the function starts a negative number; keys that take a number wait for one
        ['tan – 4 5 =', '-1', 'tan(-45) =', true],
        ['tan +/– 4 5 =', '-1', 'tan(-45) =', true],
        ['tan +', null, 'tan( + )', true],
        ['tan ×', null, 'tan( × )', true],
        ['tan =', null, 'tan(□)', true],
        ['tan )', null, 'tan(□)', true],
        ['tan %', null, 'tan(□%)', true],
        ['tan x2', null, 'tan(□<sup>2</sup>)', true],
        ['tan x!', null, 'tan(□!)', true],
        // 1/x with no number of its own yet goes first, as the functions do: 1/(4
        ['tan 1/x', null, 'tan(1/□)', true],
        ['1/x 4', null, '1/4', true],
        ['1/x 4 =', '0.25', '1 ÷ 4 =', true],
        ['1/x 4 + 1 =', '0.2', '1 ÷ (4 + 1) =', true],
        ['2 + 1/x 4 =', '2.25', '2 + 1 ÷ 4 =', true],
        ['5 × 1/x 2 =', '2.5', '5 × 1 ÷ 2 =', true],
        ['4 1/x', '0.25', '1/4', true], // after its number it stays after it
        ['5 + tan ÷', null, '5 + tan( ÷ )'],
        ['tan 4 5 C', '0', '', true],
        ['tan 4 5 C =', '0', '', true],
        ['tan 4 5 C 6 0 =', '60', '', true],
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
        ['log2 8', null, 'log<sub>2</sub>(8)'],
        ['√ 9 =', '3', '√[9] ='],
        ['√ 9', null, '√[9]'],
        ['√ 1 6 ) + 1 =', '5', '√[16] + 1 ='],
        ['ex 0 =', '1', 'e<sup>0</sup> ='],
        ['ex 1 + 1', null, 'e<sup>1 + 1</sup>'],
        ['ex 1 + 1 =', String(Math.exp(2)), 'e<sup>1 + 1</sup> ='],
        ['2x 1 0 =', '1024', '2<sup>10</sup> ='],
        ['2x 1 0', null, '2<sup>10</sup>'],
        ['10x 3 =', '1000', '10<sup>3</sup> ='],
        ['10x 3', null, '10<sup>3</sup>'],
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
        ['8 x√y 3 =', '1.147202690439877', '<sup>8</sup>√[3] ='],
        ['2 yx tan 4 5 =', '2', '2<sup>tan(45)</sup> =', true],
        ['tan 4 EE 1 =', String(Math.tan(40)), 'tan(4E1) ='],
        // errors are found when the bracket closes
        ['tan 9 0 =', 'Error', 'tan(90)', true],
        ['tan 9 0 )', null, 'tan(90)', true],
        ['ln 0 =', 'Error', 'ln(0)'],
        ['√ 4 +/– =', 'Error', '√-4'], // the line of an Error is kept as the checks read lines: √(-4)
        ['tan 9 0 = tan 4 5 =', '1', 'tan(45) =', true],
        ['tan 4 5 AC', '0', ''],
    ].forEach(function (c) {
        var e = first(c[0], !!c[3]), value = e.error ? 'Error' : e.value;
        check(c[1] === null ? !!e.edit : same(value, isNaN(+c[1]) ? c[1] : +c[1]) || value === c[1], 'tan-first  ' + c[0] + '  value', value);
        check(sq(drawn.call(e)) === c[2], 'tan-first  ' + c[0] + '  line', sq(drawn.call(e)));
    });

    var e, f, g, snap;

    // the unit is the one in use when the line is worked out
    e = first('sin 3 0', false);
    e.press(')', true);
    e.press('=', true);
    check(e.value === '0.5' && e.past[0].node.deg === 1, 'the unit in use when it is worked out counts, and is kept with the history',
        JSON.stringify(e.past[0]));

    // an open root is drawn with its box, and copied with its bracket
    check(sq(drawn.call(first('√ 9'))) === '√[9]', 'an open √ is drawn', sq(drawn.call(first('√ 9'))));
    check(first('√ 9').text() === '√(9)', 'and copied as text', first('√ 9').text());
    check(first('2 + sin-1 0 . 5').text() === '2 + sin⁻¹(0.5)', 'an open function is copied with its bracket',
        first('2 + sin-1 0 . 5').text());

    // DEL as the line typed out would lose it: the 5, the 4, then tan itself
    e = first('2 + tan 4 5 )', true);
    var walk = [];
    while (e.del()) walk.push(sq(drawn.call(e)));
    check(walk.join(' / ') === '2 + tan(4) / 2 + tan(□) / 2 + / 2 / ', 'DEL walks back through tan(45), to nothing', walk.join(' / '));

    // as many as there are brackets: functions in functions stop there, and are worked out
    e = first('');
    for (var k = 0; k < 40; k++) e.press('sin', false);
    check(e.edit.path.length === 29, 'at most 30 open brackets, functions included', e.edit.path.length);
    run(e, '0 =', false);
    check(e.value === '0' && !e.error, 'and they are all worked out at =', state(e));

    // the cursor goes through a function's box, and the keys at the end go after it
    e = first('2 + tan 4 5', true);
    check(e.move('left', true) && sq(e.editView().html) === '2 + tan(4|5)', 'the cursor goes into an open function', sq(e.editView().html));
    check(e.move('right', true) && sq(e.editView().html) === '2 + tan(45|)', 'and back to its end, still in it', sq(e.editView().html));
    run(e, '+ 1 5 =', true);
    check(same(e.value, 2 + Math.sqrt(3)) && sq(drawn.call(e)) === '2 + tan(45 + 15) =', 'so the keys after it go inside', state(e));
    e = first('2 + sin cos 0', false);
    e.move('home', false);
    e.move('end', false);
    check(!e.press(')', false), 'at the end of the line, a ) with nothing to close is refused');
    run(e, '+ 1 =', false);
    check(same(e.value, 3 + Math.sin(1)) && sq(drawn.call(e)) === '2 + sin(cos(0)) + 1 =', 'the keys go on after the functions', state(e));
    e = first('1 + 2', false);
    e.move('left', false);
    run(e, 'sin', false);
    check(sq(e.editView().html) === '1 + sin(|2)', 'sin before a number takes it in its box', sq(e.editView().html));
    run(e, '=', false);
    check(same(e.value, 1 + Math.sin(2)), 'and = works it out', state(e));

    // paste: an open function stays open, as the keys would leave it
    e = first('');
    e.paste('sin(30', true);
    check(e.edit && sq(e.editView().html) === 'sin(30|)', 'pasted sin(30 stays open, the cursor in it', e.edit && sq(e.editView().html));
    run(e, '+ 6 0 =', true);
    check(e.value === '1', 'and the keys after it go inside', state(e));
    e = first('');
    e.paste('2×cos(60', true);
    check(e.edit && sq(e.editView().html) === '2 × cos(60|)', 'after an operator too', e.edit && sq(e.editView().html));
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
    check(e.value === '0.5' && sq(drawn.call(e)) === 'sin(30)', 'a closed one is worked out', state(e));
    e = first('tan', true);
    e.paste('45', true);
    run(e, '=', true);
    check(e.value === '1', 'a number pasted after tan goes in its box', state(e));
    e = first('tan', true);
    e.paste('40+5', true);
    run(e, '=', true);
    check(e.value === '1' && sq(drawn.call(e)) === 'tan(40 + 5) =', 'an equation as well', state(e));
    e = new Engine();
    e.paste('sin(30', true);
    check(e.value === '0.5' && e.equation() === 'sin(30)', 'typed in, a pasted sin(30 is closed', state(e));
    e = new Engine();
    e.paste('√(9', false);
    check(e.value === '3', 'and √(9 is read too', state(e));

    // the history: a calculation comes back the same
    e = first('2 + sin 3 0 ) × ln 1 =', true);
    f = first();
    f.load(JSON.parse(JSON.stringify(e.save())));
    check(f.recall(0, false) && f.press('=', false) && f.value === e.value && drawn.call(f) === drawn.call(e),
        'recalled', state(f));

    // saved and loaded with a function still open: the cursor in its box
    e = first('2 + tan 4', true);
    f = first();
    f.load(JSON.parse(JSON.stringify(e.save())));
    check(f.edit && sq(f.editView().html) === '2 + tan(4|)', 'an open function is saved', f.edit && sq(f.editView().html));
    run(f, '5 =', true);
    check(f.value === '3', 'and closes after loading', state(f));
    e = first('2 + tan 4', true);
    e.press('5', true);
    e.press('C', true); // the line edited goes, and with it its boxes
    e = new Engine();
    run(e, '2 + tan 4 5', true);
    snap = JSON.parse(e.snapshot());
    snap.levels.push({ stack: [], fn: 'alert' });
    g = new Engine();
    try {
        g.restore(JSON.stringify(snap));
        check(false, 'a saved state with an unknown function is refused');
    } catch (err) {
        check(true, 'a saved state with an unknown function is refused');
    }
    snap.levels[snap.levels.length - 1].fn = 'nCr';
    try {
        g.restore(JSON.stringify(snap));
        check(false, 'and with a key that does not open a bracket');
    } catch (err) {
        check(true, 'and with a key that does not open a bracket');
    }

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

        // a line whose shortened numbers, as e to 13 digits, cannot give its result again: one
        // more in their last digit changes it, as tan of 10^41 degrees
        function steep(line, deg, value) {
            var g = new Engine();
            g.paste(line.replace(/(\d\.\d{11})(\d)/g, function (m, a, d) { return a + (d === '9' ? 8 : +d + 1); }), deg);
            g.press('=', deg);
            return !same(g.value, +value);
        }

        for (n = 0; n < 4000 && failures < 20; n++) {
            e = first('');
            deg = Math.floor(rnd() * 3); // Rad, Deg or Grad
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
                if (!(same(f.value, +e.value) || (f.error && !isFinite(+e.value)) || steep(line, deg, f.value))) {
                    check(false, 'fuzz tan-first read  ' + keys.join(' '), line + ' = ' + e.value + ', read back as ' + state(f));
                }
            }
            for (i = 0; i < e.past.length; i++) {
                p = e.past[i];
                f = new Engine();
                f.load(JSON.parse(JSON.stringify(e.save())));
                f.fnFirst = rnd() < 0.5;
                line = f.pastLine(i).line;
                if (!f.recall(i, Math.floor(rnd() * 3))) {
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
        // fewer lines finish than there are sequences: = on a line with a box still empty goes to that box
        check(read > 250, 'fuzz tan-first read back ' + read + ' finished lines');
        check(recalled > 400, 'fuzz tan-first recalled ' + recalled + ' calculations');
    })();
})();

// ---------- graphs: a function of x, as it would be pasted ---------- //

(function () {
    function at(text, x, deg, comma) {
        var g = Engine.graph(text, comma);
        return g ? g.at(x, deg || 0, true) : null;
    }

    [
        ['x^2 - 3', 2, 1], ['x²', -3, 9], ['2x + 1', 3, 7], ['(x + 1)(x - 1)', 3, 8], ['x(x + 1)', 2, 6],
        ['xsinx', Math.PI / 2, Math.PI / 2], ['sin x', 0, 0], ['2sin(x)', Math.PI / 6, 1], ['1/x', 4, 0.25],
        ['sqrt(x)', 9, 3], ['√x', 16, 4], ['exp(x)', 0, 1], ['e^x', 1, Math.E], ['ex', 2, 2 * Math.E], ['pi x', 1, Math.PI],
        ['X^3', 2, 8], ['abs(x)', -4, 4], ['x!', 4, 24], ['log₂(x)', 8, 3], ['x mod 3', 7, 1], ['ln(x)', 1, 0],
        ['y = 3x', 2, 6], ['Y=x', 5, 5], ['f(x) = x + 1', 1, 2], ['5', 100, 5], ['0.1x + 0.2', 1, 0.3]
    ].forEach(function (c) {
        var y = at(c[0], c[1]);
        check(y !== null && Math.abs(y - c[2]) <= 1e-12 * Math.max(1, Math.abs(c[2])), 'graph ' + c[0] + ' at ' + c[1] + ' is ' + c[2], y);
    });

    check(at('2,5x', 2, 0, true) === 5, 'graph: a comma is the decimal mark when it is in use', at('2,5x', 2, 0, true));
    check(at('sin(x)', 30, 1) === 0.5 && at('sin(x)', 100, 2) === 1, 'graph: sin x follows Deg and Grad');
    check(at('sin(30°) + x', 0, 0) === 0.5, 'graph: an angle in degrees stays in degrees');
    check(!isFinite(at('1/x', 0)) && !isFinite(at('sqrt(x)', -1)), 'graph: no value where there is none');
    check(Engine.graph('sin(x)').angles && !Engine.graph('sinh(x)').angles && !Engine.graph('x^2').angles,
        'graph: a function of an angle is known, sinh is not one');
    check(Engine.graph('x^2').at(0.5, 0, false) === 0.25, 'graph: the quick values of the curve');
    ['', 'x +', 'x2', '2 × ()', 'y =', 'sin', '(x', 'x + y', 'a +'].forEach(function (s) {
        check(s === '(x' ? !!Engine.graph(s) : Engine.graph(s) === null,
            'graph ' + JSON.stringify(s) + (s === '(x' ? ' leaves its bracket open, as a paste can' : ' is not a function'));
    });
    // letters of their own: numbers that sliders set, 1 until they are set; e is e, x is x, y is not one
    (function () {
        var vars = {}, g = Engine.graph('a x^2 + b', false, vars), h = Engine.graph('2πr + Ak sin(x)', false, vars);
        check(g && g.letters.join() === 'a,b' && g.at(3, 0, true) === 10, 'graph: a and b are 1 until set', g && g.at(3, 0, true));
        vars.a = 2;
        vars.b = -1;
        check(g.at(3, 0, true) === 17 && g.at(3, 0, false) === 17, 'graph: a x² + b with a = 2, b = -1 at 3 is 17');
        check(h && h.letters.join() === 'r,a,k', 'graph: letters run together, A is a; π and sin are not letters of their own',
            h && h.letters.join());
        check(Engine.graph('e^x + x').letters.length === 0 && Engine.graph('abs(x)').letters.length === 0 &&
            Engine.graph('sin(x)').letters.length === 0, 'graph: e, x and the names of functions are not letters of their own');
        check(Engine.graph('hello').letters.join() === 'h,l,o', 'graph: hello is h × e × l × l × o');
    })();

    // the points marked on the curves: the kinds of each, its x and y, as text to compare
    function marks(fns, deg, view) {
        return Engine.keyPoints(fns.map(function (f) { return Engine.graph(f); }), view || { x0: -10, x1: 10, y0: -10, y1: 10 }, deg || 0)
            .map(function (p) {
                return p.t.join(',') + ' ' + +p.x.toPrecision(12) + ' ' + +p.y.toPrecision(12) + (p.j !== undefined ? ' ' + p.i + '×' + p.j : '');
            }).join(' | ');
    }

    [
        [['x^2 - 3'], 'root -1.73205080757 0 | min,yint 0 -3 | root 1.73205080757 0', 'roots, the low and the y axis of x² – 3'],
        [['x^2'], 'root,yint 0 0', 'the low of x² at 0 is its root'],
        [['x^3 - 2x'], 'root -1.41421356237 0 | max -0.8164966 1.0886621079 | root,infl,yint 0 0 | min 0.8164966 -1.0886621079 | ' +
            'root 1.41421356237 0', 'a cubic: its high and low between the roots'],
        [['x^2 - 4'], 'root -2 0 | min,yint 0 -4 | root 2 0', 'whole roots are whole, not 1.9999999999999998'],
        [['1/x'], '', '1/x has no root where it jumps, nor a high or low'],
        [['5'], 'yint 0 5', 'a level line meets the y axis only'],
        [['0'], 'yint 0 0', 'nor is y = 0 a root everywhere'],
        [['x^2', 'x + 2'], 'root -2 0 | cross -1 1 0×1 | root,yint 0 0 | yint 0 2 | cross 2 4 0×1', 'x² and x + 2 cross at -1 and 2'],
        [['sin(50x)'], 'yint 0 0', 'too many roots and highs to tell apart: none marked']
    ].forEach(function (c) {
        var got = marks(c[0]);
        check(got === c[1], 'graph marks: ' + c[2], got);
    });
    check(!/root (?!-?[369]\.42|-?6\.28|-?3\.14|0 )/.test(marks(['tan(x)'])) && !/max|min/.test(marks(['tan(x)'])),
        'graph marks: tan x has its roots, and nothing where it jumps', marks(['tan(x)']));
    check(marks(['sin(x)'], 1, { x0: -360, x1: 360, y0: -5, y1: 5 }) ===
        'root -360 0 | max -270 1 | root,infl -180 0 | min -90 -1 | root,infl,yint 0 0 | max 90 1 | root,infl 180 0 | min 270 -1 | root 360 0',
        'graph marks: sin x in degrees, its highs at 90, not 89.99999997', marks(['sin(x)'], 1, { x0: -360, x1: 360, y0: -5, y1: 5 }));
    check(marks(['x^2 - 3'], 0, { x0: 2, x1: 5, y0: -10, y1: 10 }) === '', 'graph marks: only those in the view');

    // the slope of a curve at x: as short as it is good, 0 at a high or low, none at a corner or a break
    [
        ['x^2', 1, 0, 2, 'x² at 1'],
        ['x^2 - 3', 0, 0, 0, 'x² – 3 at its low'],
        ['x^3 - 2x', 2, 0, 10, 'a cubic'],
        ['1/x', 2, 0, -0.25, '1/x at 2'],
        ['sin(x)', 0, 0, 1, 'sin x at 0 in radians'],
        ['sin(x)', 0, 1, 0.01745329252, 'and in degrees: the slope is for each degree'],
        ['sin(x)', 90, 1, 0, 'its high at 90°'],
        ['e^x', 20, 0, 485165195.4, 'e^x, large'],
        ['x^2', 1e-9, 0, 2e-9, 'small, but not 0'],
        ['sin(100x)', 0.01, 0, 54.0302306, 'a steep wave, to the digits it is good to'],
        ['ln(x)', 0.0001, 0, 10000, 'by the edge of where ln x has values'],
        ['abs(x)', 0.00005, 0, 1, 'by the corner of |x|'],
        ['sin(x)', 1e6, 0, 0.936752128, 'a wave far out'],
        ['abs(x)', 0, 0, NaN, 'none at the corner of |x|'],
        ['0.000000001abs(x)', 0, 0, NaN, 'nor at a corner of small values'],
        ['1/x', 0, 0, NaN, 'none where there is no value'],
        ['tan(x)', 90, 1, NaN, 'none where tan jumps'],
        ['x^(1/3)', 0, 0, NaN, 'none where the tangent is upright']
    ].forEach(function (c) {
        var got = Engine.slope(Engine.graph(c[0]), c[1], c[2]);
        check(Object.is(got, c[3]) || got === c[3], 'graph slope: ' + c[4], got);
    });

    // d/dx before a function: its slope, a curve of its own
    (function () {
        var vars = {}, g = Engine.graph('d/dx(x^2)'), h = Engine.graph('y = d/dx a sin(x)', false, vars);
        check(g && g.at(3, 0) === 6 && g.at(-1.5, 0, true) === -3 && g.letters.length === 0, 'graph: d/dx(x^2) is 2x', g && g.at(3, 0));
        check(Engine.graph('d/dx sin(x)').at(90, 1) === 0 && Engine.graph('d / dx sin(x)').angles, 'graph: d/dx sin x, in degrees, its slope 0 at 90°');
        vars.a = 3;
        check(h && h.letters.join() === 'a' && h.at(0, 0) === 3, 'graph: the letters of what d/dx is of have sliders', h && h.at(0, 0));
        check(!isFinite(Engine.graph('d/dx abs(x)').at(0, 0)), 'graph: d/dx |x| has no value at the corner');
        check(Engine.graph('d/dx (x+1)(x-1)').at(2, 0) === 4 && Engine.graph('d/dx(x^2').at(2, 0) === 4,
            'graph: d/dx of a product of brackets, and of a bracket left open');
        ['d/dx', 'd/dx()', '2 d/dx(x^2)', 'd/dx(x^2) + 1', 'd/dx(x^2) - x', 'x d/dx x'].forEach(function (s) {
            check(Engine.graph(s) === null, 'graph ' + JSON.stringify(s) + ' is not a function: d/dx goes first, before all of it');
        });
    })();

    // an equation of x and y: the left side less the right
    (function () {
        var vars = {}, c = Engine.relation('x^2 + y^2 = r^2', false, vars);
        check(c && c.at(3, 4, 0) === 24 && c.letters.join() === 'r', 'relation: x² + y² = r², r at 1 until set', c && c.at(3, 4, 0));
        vars.r = 5;
        check(c.at(3, 4, 0) === 0 && c.at(0, 0, 0) === -25, 'relation: on the circle of r = 5, and inside it');
        check(Engine.relation('x = 3').at(3, 7, 0) === 0 && Engine.relation('x = 3').at(1, 0, 0) === -2, 'relation: x = 3, an upright line');
        check(Engine.relation('xy = 1').at(2, 0.5, 0) === 0 && Engine.relation('sin(x) = y').angles, 'relation: x y, and angles');
        check(Engine.relation('2,5x = y', true).at(2, 5, 0) === 0, 'relation: a comma is the decimal mark when it is in use');
        ['x^2 + y^2', '3 = 4', 'y = x = 2', '= x', 'x =', 'd/dx(x^2) = y', 'x^2 + = y'].forEach(function (s) {
            check(Engine.relation(s) === null, 'relation ' + JSON.stringify(s) + ' is not an equation of x and y');
        });
        check(Engine.graph('x^2 + y^2 = 25') === null && !!Engine.graph('y = 2x'), 'graph: an equation is not a function of x, y = 2x is');
    })();

    // an inequality: the left side less the right, and which way it is true
    (function () {
        var r = Engine.relation('y < x^2');
        check(r && r.op === '<' && r.at(1, 0, 0) === -1 && r.at(0, 1, 0) === 1, 'relation: y < x², below the curve less than 0');
        check(Engine.relation('x^2 + y^2 <= 9').op === '≤' && Engine.relation('x>=2').op === '≥' && Engine.relation('x ≤ y').op === '≤' &&
            Engine.relation('y > 2x - 1').op === '>' && Engine.relation('y => x').op === '≥', 'relation: <=, >=, ≤, ≥, > and =>');
        check(Engine.relation('1 < x > 3') === null && Engine.relation('x < y = 2') === null && Engine.relation('y <') === null &&
            Engine.relation('3 < 4') === null, 'relation: one comparison, of x or y, with two sides');
        check(Engine.relation('x = 3').op === '=' && Engine.graph('y < x^2') === null, 'relation: = for an equation; an inequality is not a function');
    })();

    // two inequalities the same way, both holding; a curve of a parameter, polar or parametric;
    // points and the line nearest them; the area of a region; where two equations cross
    (function () {
        var two = Engine.relation('1 < x <= 3'), polar = Engine.plane('r = 2sin(3θ)'), circle = Engine.plane('(cos t, sin t)'),
            view = { x0: -10, x1: 10, y0: -10, y1: 10 }, marks;
        function inside(r, side) {
            return function (x, y) { return Engine.within(r, x, y, 0, side); };
        }
        check(two.op === 'and' && two.parts[1].op === '≤' && Engine.holds(two, 2, 0, 0) && Engine.holds(two, 3, 5, 0) &&
            !Engine.holds(two, 0.5, 0, 0) && !Engine.holds(two, 4, 0, 0), 'relation: 1 < x ≤ 3, both of them');
        check(Engine.relation('1 < x > 0') === null && Engine.relation('1 < x = 2') === null && Engine.relation('1 < x < y < 3') === null,
            'relation: two the same way only, and no more');
        check(polar.kind === 'polar' && Math.abs(polar.at(Math.PI / 6, 0)[0] - Math.sqrt(3)) < 1e-12 && polar.range(1)[1] === 360 &&
            Engine.plane('r = theta {0, 6π}').range(0)[1] === 6 * Math.PI, 'plane: r = 2sin(3θ), once round in the unit, or as typed');
        check(circle.kind === 'param' && circle.at(Math.PI / 2, 0)[1] === 1 && Engine.plane('(t; t^2)', true).at(2, 0)[1] === 4 &&
            Engine.plane('(3, 4)') === null && Engine.plane('(x, t)') === null && Engine.plane('(a t, t)').letters.join() === 'a',
            'plane: (cos t, sin t), a ; with the comma, not a point, not of x, and its letters');
        check(JSON.stringify(Engine.points('(1, 2), (2, 4.1) (3,5.9)')) === '[{"x":1,"y":2},{"x":2,"y":4.1},{"x":3,"y":5.9}]' &&
            Engine.points('(1,5; -2)', true)[0].y === -2 && Engine.points('(1, 2) + x') === null && Engine.points('x^2') === null,
            'points: a list of (x, y)');
        check(JSON.stringify(Engine.fitLine(Engine.points('(1,2),(2,4.1),(3,5.9)'))) === '{"m":1.95,"b":0.1,"r2":0.9980314961}' &&
            Engine.fitLine(Engine.points('(1, 2), (1, 3)')) === null, 'fitLine: y = 1.95x + 0.1, r² 0.998; none for one x');
        check(Engine.regionArea(inside(Engine.relation('x^2 + y^2 = 25'), -1), -5, 5, -30, 30, 0) === 78.53981634 &&
            Engine.regionArea(inside(Engine.relation('x^2 < y < 4')), -2, 2, -30, 30, 0) === 10.66666667 &&
            isNaN(Engine.regionArea(inside(Engine.relation('y < x^2')), -1, 1, -30, 30, 0)), 'regionArea: inside a circle, 25π; x² < y < 4, 32/3; y < x² has none');
        marks = Engine.keyPoints([null, null], view, 0, [Engine.relation('x^2 + y^2 = 25'), Engine.relation('y = x + 1')]).filter(function (p) {
            return p.t[0] === 'cross';
        }).map(function (p) { return p.x + ' ' + p.y; });
        check(marks.join('; ') === '-4 -3; 3 4', 'keyPoints: two equations cross', marks.join('; '));
        marks = Engine.keyPoints([null, Engine.graph('x')], view, 0, [], [circle, null]).filter(function (p) { return p.u !== undefined; });
        check(marks.length === 6 && marks.every(function (p) { return Math.abs(p.x * p.x + p.y * p.y - 1) < 1e-9; }),
            'keyPoints: a curve of t meets the axes, and crosses y = x', marks.length);
    })();

    // sequences: of the terms before, or of n alone, their first terms and the range of n in braces, as a polar curve's range is
    (function () {
        function terms(text, comma, vars) {
            var s = Engine.sequence(text, comma, vars || {}, {}), r = s && s.terms(0);
            return s ? r.from + ': ' + r.list.slice(0, 6).map(function (y) { return +y.toPrecision(12); }).join(' ') + ' … ' + r.list.length +
                (r.stop ? ' stop ' + r.stop.why + ' ' + r.stop.n : '') : 'none';
        }
        var growth = Engine.sequence('a(n) = a(n − 1) × 1.05 {a(1) = 100}', false, {}, {});
        check(growth.kind === 'seq' && growth.name === 'a' && growth.range(0).join() === '1,50' && growth.at(3, 0).join() === '3,110.25' &&
            isNaN(growth.at(2.5, 0)[1]) && isNaN(growth.at(51, 0)[1]) && isNaN(growth.at(0, 0)[1]), 'sequence: a(n) = a(n − 1) × 1.05, from a(1) = 100, 50 terms at whole n');
        check(terms('a(n) = a(n-1) + a(n-2) {a(1) = 1, a(2) = 1}') === '1: 1 1 2 3 5 8 … 50' && terms('a(n) = 2n + 1') === '1: 3 5 7 9 11 13 … 50' &&
            terms('b(n) = 1.5b(n-1) - 0.5b(n-2) {b(0) = 0, b(1) = 1}') === '0: 0 1 1.5 1.75 1.875 1.9375 … 50', 'sequence: Fibonacci; of n alone; from n = 0');
        check(terms('a(n) = 2n + 1 {0, 9}') === '0: 1 3 5 7 9 11 … 10' && terms('a(n) = a(n-1)*2 {a(1) = 1} {1, 20}') === '1: 1 2 4 8 16 32 … 20' &&
            terms('a(n) = a(n-1)*2 {a(1) = 1, 5, 8}') === '5: 16 32 64 128 … 4' && terms('a(n) = n {1, 20000}') === '1: 1 2 3 4 5 6 … 10000 stop many 10001',
            'sequence: its range in braces, alone or with the first terms; from past the first, its terms worked out from there; up to 10000 terms');
        check(terms('a(n) = a(n-1) + a(n-2) {a(1) = 1}') === '1: 1 … 1 stop before 2' && Engine.sequence('a(n) = a(n-1) + a(n-2) {a(1) = 1}', false, {}, {}).terms(0).stop.need === 0 &&
            terms('a(n) = 2^n {1, 2000}') === '1: 2 4 8 16 32 64 … 1023 stop large 1024' && terms('a(n) = sqrt(a(n-1) - 3) {a(1) = 4}') === '1: 4 1 … 2 stop none 3' &&
            terms('a(n) = sqrt(n - 3)') === '1: NaN NaN 0 1 1.41421356237 1.73205080757 … 50', 'sequence: a term before the first, too large, or of none, stops it; of n alone, one of none is a gap');
        check(terms('a(n) = a(n-1) + b {a(1) = c}', false, { b: 2, c: 5 }) === '1: 5 7 9 11 13 15 … 50' && Engine.sequence('a(n) = a(n-1) + b {a(1) = c}', false, {}, {}).letters.sort().join() === 'b,c' &&
            terms('a(n) = a(n-1) + a {a(1) = 1}', false, { a: 3 }) === '1: 1 4 7 10 13 16 … 50', 'sequence: sliders, in its terms and its first ones; its own letter alone is a slider');
        check(terms('a(n) = a(n-1)*1,05 {a(1) = 100; 1; 3}', true) === '1: 100 105 110.25 … 3' && terms('y(n) = y(n-1) + 1 {y(1) = 0}') === '1: 0 1 2 3 4 5 … 50' &&
            terms('a(n) = sin(n) {1, 2}') === '1: 0.841470984808 0.909297426826 … 2', 'sequence: the comma as the decimal mark; y and sin(n) as they are');
        check(['a(n) = b(n-1) + 1 {a(1) = 1}', 'a(n) = a(n) + 1', 'x(n) = n', 'e(n) = n', 'i(n) = n', 'A(n) = n', 'a(n) = a(n-1) + x {a(1) = 1}', 'a(n) = 2n {5, 1}',
            'a(n) = 2n {1.5, 3}', 'a(n) = 2n {a(1) = 1} {a(2) = 2} {1, 5}', 'a(n) = n {b(1) = 2}', 'a(x) = 2x', 'a(n) = '].every(function (t) { return terms(t) === 'none'; }),
            'sequence: none of another sequence\'s terms, of itself, named x, e, i or a capital, of x, or of ends that are not');
        check(Engine.sequence('a(n) = f(n) + 1', false, {}, { f: Engine.graph('f(x) = x^2') }).at(3, 0)[1] === 10 && Engine.graph('a(n) = 2n') === null &&
            Engine.plane('a(n) = 2n') === null && Engine.keyPoints([], { x0: -5, x1: 5, y0: -5, y1: 5 }, 0, [], [growth]).length === 0,
            'sequence: of a function named; neither a function of x nor a curve of t; no marks of its own');
    })();

    // slope fields: dy/dx = f(x, y) or y′ =, the starts of their solutions in braces; their solutions by Runge and Kutta
    (function () {
        function field(text, comma, vars) {
            return Engine.slopeField(text, comma || false, vars || {}, {});
        }
        function near(a, b, tol) {
            return Math.abs(a - b) <= (tol || 1e-12) * Math.max(1, Math.abs(b));
        }
        function solved(text, x0, y0, from, to, h, dy, big) {
            return Engine.solveField(field(text), x0, y0, from, to, 0, h, dy, big);
        }
        var f = field('dy/dx = x - y {y(0) = 1, y(1) = -2}'), r, err;
        check(f && f.kind === 'field' && f.at(1, 3, 0) === -2 && JSON.stringify(f.starts(0)) === '[[0,1],[1,-2]]' && f.text === 'dy/dx = x - y' &&
            f.given.join('|') === 'y(0) = 1|y(1) = -2', 'slope field: dy/dx = x – y, its slope at each place and its starts', f && JSON.stringify(f.starts(0)));
        f = field('dy/dx = x - y {0 < x < 3} {y(0) = 1}');
        check(f && f.at(1, 2, 0) === -1 && isNaN(f.at(4, 2, 0)) && !f.letters.length && f.text === 'dy/dx = x - y {0 < x < 3}' && f.given.join('|') === 'y(0) = 1',
            'slope field: inequalities in braces kept apart from its starts, none where they do not hold', f && f.letters.join());
        f = field('dy/dx = 2 {y > 0}');
        check(f && f.at(0, 1, 0) === 2 && isNaN(f.at(0, -1, 0)) && !f.letters.length, 'slope field: an inequality of y, y no slider', f && f.letters.join());
        check(!!field('dy/dx = x - y {' + Array(30).fill('y(1.25) = -0.375').join(', ') + '}'), 'slope field: thirty starts, longer than an equation may be');
        check(field("y' = x*y").at(2, 3, 0) === 6 && field('y′ = x*y').at(2, 3, 0) === 6 && field('dy / dx = 2').at(5, 5, 0) === 2 && field('dy/dx = x^2').at(3, 9, 0) === 9 &&
            field('dy/dx = y').at(3, 4, 0) === 4, "slope field: y' and y′ as well; of x alone, y alone or neither");
        check(field('dy/dx = a y {y(0) = b}', false, { a: 2, b: 5 }).at(1, 3, 0) === 6 && field('dy/dx = a y {y(0) = b}').letters.sort().join() === 'a,b' &&
            field('dy/dx = a y {y(0) = b}', false, { a: 2, b: 5 }).starts(0)[0][1] === 5, 'slope field: of sliders, its starts as well');
        check(JSON.stringify(field('dy/dx = x - y {y(0) = 1; y(0) = 2,5}', true).starts(0)) === '[[0,1],[0,2.5]]' && near(field('dy/dx = sin(x) {y(pi) = 1/2}').starts(0)[0][0], Math.PI) &&
            field('dy/dx = sin(x)').angles, 'slope field: with the decimal comma, ; between its starts; each worked out; of angles');
        check(field('dy/dx = {x < 0: -1, x >= 0: 1} {y(0) = 1}').at(-1, 0, 0) === -1 && field('dy/dx = {x < 0: -1, x >= 0: 1}').at(1, 0, 0) === 1, 'slope field: of a function in pieces');
        check(['dy/dx', 'dy/dx =', 'dy/dx = x = y', 'dy/dx = x < y', 'dy/dx = x {y(x) = 1}', 'dy/dx = x {y(0) = y}', 'dy/dx = x {y(0) = }', 'y = x - y', 'dy/dt = x'].every(function (t) {
            return field(t) === null;
        }), 'slope field: none of dy/dx alone, of an equation after it, or of starts not numbers');
        check(Engine.relation('dy/dx = x - y', false, {}, {}) !== null && !!field('dy/dx = x - y'), 'slope field: read where an equation of d, x and y would be, so it is read first');
        check(Engine.keyPoints([], { x0: -5, x1: 5, y0: -5, y1: 5 }, 0, [], [f]).length === 0, 'slope field: no marks of its own');

        r = solved('dy/dx = y', 0, 1, -1, 1, 0.001);
        check(near(r.pts[r.pts.length - 1][1], Math.E, 1e-12) && near(r.pts[0][1], 1 / Math.E, 1e-12) && r.pts[0][0] === -1 && !r.back && !r.ahead,
            'slope field: y′ = y from y(0) = 1 is e at 1 and 1/e at -1', r.pts[r.pts.length - 1][1]);
        r = solved('dy/dx = x - y', 0, 1, -3, 3, 0.01);
        err = Math.max.apply(null, r.pts.map(function (q) { return Math.abs(q[1] - (q[0] - 1 + 2 * Math.exp(-q[0]))); }));
        check(err < 1e-7 && r.pts.some(function (q) { return q[0] === 0 && q[1] === 1; }), 'slope field: y′ = x – y is x – 1 + 2e^(–x), its start on it', err);
        r = solved('dy/dx = -x/y', 0, 3, -5, 5, 0.05, 0.2);
        check(r.back.why === 'steep' && r.ahead.why === 'steep' && Math.abs(r.ahead.x - 3) < 0.05 && Math.abs(r.back.x + 3) < 0.05,
            'slope field: -x/y, a circle, stops each way where it goes straight down', JSON.stringify([r.back, r.ahead]));
        r = solved('dy/dx = y^2', 0, 1, -1, 2, 0.01, 0.04, 1e6);
        check(r.ahead && Math.abs(r.ahead.x - 1) < 0.02 && r.ahead.y > 50 && !r.back, 'slope field: y′ = y² from 1 goes up to no end at x = 1', JSON.stringify(r.ahead));
        r = solved('dy/dx = sqrt(x)', 1, 0, -1, 2, 0.01);
        check(r.back && r.back.why === 'none' && Math.abs(r.back.x) < 0.011 && !r.ahead, 'slope field: √x stops at 0, of no slope below it', JSON.stringify(r.back));
        r = solved('dy/dx = sqrt(x)', -1, 0, -2, 2, 0.01);
        check(!r.pts.length && r.back.why === 'none' && r.ahead.why === 'none', 'slope field: one that starts where it has no slope is none');
    })();

    // functions of other boxes by name, kept to where inequalities hold, in pieces; fits of more kinds; inflections
    (function () {
        var f = Engine.graph('f(x) = x^3 - 3x'), defs = { f: f, g: null }, kept, pieces, fit, bends;
        check(Engine.named('f(x) = x^3') === 'f' && Engine.named(' G ( x ) = 1') === 'g' && Engine.named('y = 2') === null &&
            Engine.named('x(x) = 1') === null && Engine.named('e(x) = 1') === null, 'named: the name of f(x) = …');
        check(Engine.graph('f(2x) + 1', false, {}, defs).at(1, 0) === 3 && Engine.graph("f'(x)", false, {}, defs).at(2, 0) === 9 &&
            Engine.graph("f''(x)", false, {}, defs).at(1, 0) === 6 && Engine.graph('f″(x)', false, {}, defs).at(2, 0) === 12,
            "graph: f(2x) + 1, f′(x) and f″(x) of f(x) = x³ – 3x");
        check(Engine.graph('f(x) + g(x)', false, {}, defs) === null && Engine.graph('f x', false, {}, defs).letters.join() === 'f' &&
            Engine.graph('f(x)', false, {}).letters.join() === 'f', 'graph: a name not made yet is none; f without a bracket, or not a name, is a slider');
        check(Engine.graph('a f(x)', false, {}, { f: Engine.graph('f(x) = b x') }).letters.join() === 'a,b' &&
            Engine.relation('y < f(x)', false, {}, defs).at(1, 0, 0) === 2 && Engine.plane('(f(t), t)', false, {}, defs).at(2, 0)[0] === 2,
            'graph: the letters of a function named are of what uses it; equations and curves of t use them too');
        kept = Engine.graph('x^2 {0 < x < 3}');
        check(isNaN(kept.at(-1, 0)) && kept.at(1, 0) === 1 && kept.at(3, 0) === 9 && isNaN(kept.at(4, 0)) &&
            isNaN(Engine.graph('sin(x) {y > 0}').at(-1, 0)) && Engine.graph('y = x {x > a}{x < 5}').letters.join() === 'a' &&
            Engine.graph('x {x = 1}') === null && Engine.graph('x {2}') === null, 'graph: x² {0 < x < 3}, {y > 0} of its value; inequalities only');
        pieces = Engine.graph('y = {x < 0: -x, 0 <= x < 2: x^2}');
        check(Engine.graph('{x < 0: -x, x^2}').at(-2, 0) === 2 && Engine.graph('{x < 0: -x, x^2}').at(3, 0) === 9 &&
            pieces.at(1, 0) === 1 && isNaN(pieces.at(5, 0)) && Engine.graph('{x > 1}').at(2, 0) === 1 &&
            Engine.graph('{x < 0; -x; x^2}', true) === null && Engine.graph('{x < 0: -x; x^2}', true).at(3, 0) === 9 &&
            Engine.graph('{x < 0: -x, x^2, 3}') === null && Engine.graph('{x = 0: 1, 2}') === null,
            'graph: in pieces, the first that holds, the last alone, or none; ; with the comma');
        pieces = Engine.graph('{x < -1: -x, 2}');
        check(pieces.piece(-2, 0) === 0 && pieces.piece(0, 0) === 1 && Engine.keyPoints([pieces], { x0: -5, x1: 5, y0: -5, y1: 5 }, 0).every(function (p) {
            return p.t[0] === 'yint';
        }), 'graph: which piece; no low where the pieces meet');
        kept = Engine.relation('x^2 + y^2 = 25 {y > 0}');
        check(kept.at(3, 4, 0) === 0 && isNaN(kept.at(3, -4, 0)) && Engine.relation('1 < x < 3 {y > 0}').parts.length === 2 &&
            isNaN(Engine.relation('1 < x < 3 {y > 0}').parts[0].at(2, -1, 0)), 'relation: kept to where its braces hold');
        fit = Engine.points('(1, 1), (2, 4), (3, 9), (4, 16)');
        check(Engine.fit(fit, 'quad').k.join() === '1,0,0' && Engine.fit(fit, 'quad').r2 === 1 &&
            Engine.fit(Engine.points('(0, 1), (1, 2), (2, 4)'), 'exp').k.join() === '1,2' &&
            Engine.fit(Engine.points('(1, 3), (2, 12), (3, 27)'), 'pow').k.join() === '3,2' &&
            Engine.fit(Engine.points('(1, 2), (2.718281828459045, 5)'), 'log').k.join() === '2,3' &&
            Engine.fit(Engine.points('(1,2),(2,4.1),(3,5.9)'), 'lin').k.join() === '1.95,0.1',
            'fit: y = x², 2ˣ, 3x², 2 + 3 ln x and a line');
        check(Engine.fit(Engine.points('(1, -1), (2, 4)'), 'exp') === null && Engine.fit(Engine.points('(0, 1), (2, 4)'), 'log') === null &&
            Engine.fit(Engine.points('(1, 1), (2, 4)'), 'quad') === null && Engine.fit(fit, 'quad').at(5) === 25,
            'fit: none for a y below 0 of exp, an x of 0 of log, two x of a quadratic');
        bends = function (s) {
            return Engine.keyPoints([Engine.graph(s)], { x0: -5, x1: 5, y0: -20, y1: 20 }, 0).filter(function (p) {
                return p.t.indexOf('infl') > -1;
            }).map(function (p) { return p.x + ' ' + p.y; }).join('; ');
        };
        check(bends('x^3 - 6x^2 + 4') === '2 -12' && bends('x^4 - 6x^2') === '-1 -5; 1 -5' && bends('x e^(-x)').indexOf('2 ') === 0 &&
            bends('x^2') === '' && bends('2x + 1') === '' && bends('1/x') === '' && bends('abs(x)') === '' && bends('d/dx(x^3)') === '',
            'keyPoints: where it bends the other way; none of a line, x², a jump, a corner or a slope found by steps');
    })();

    // the place on an equation nearest a point, as pixels of 0.05 see it, and its slope there
    (function () {
        var circle = Engine.relation('x^2 + y^2 = 25'), line = Engine.relation('x = 3'), p;
        p = Engine.onRelation(circle, 3.02, 4.03, 0.05, 0.05, 0);
        check(p && p.x === 3 && p.y === 4, 'onRelation: near (3, 4) on the circle of 5', JSON.stringify(p));
        p = Engine.onRelation(line, 3.1, 1.234, 0.05, 0.05, 0);
        check(p && p.x === 3 && p.y === 1.23, 'onRelation: on x = 3, its y to what a pixel tells', JSON.stringify(p));
        p = Engine.onRelation(circle, 0.002, -5.1, 0.05, 0.05, 0);
        check(p && p.x === 0 && p.y === -5, 'onRelation: the bottom of the circle', JSON.stringify(p));
        check(Engine.relationSlope(circle, 3, 4, 0) === -0.75 && Engine.relationSlope(line, 3, 2, 0) === Infinity &&
            Engine.relationSlope(circle, 0, 5, 0) === 0, 'relationSlope: -3/4 at (3, 4), straight up on x = 3, flat at the top');
    })();

    // the marks of an equation: where it meets the axes, and where it crosses a curve
    (function () {
        var view = { x0: -10, x1: 10, y0: -10, y1: 10 }, marks = Engine.keyPoints([null, Engine.graph('x + 1')],
            view, 0, [Engine.relation('x^2 + y^2 = 25'), null]), text = marks.map(function (p) {
                return p.t.join() + ' ' + +p.x.toPrecision(10) + ' ' + +p.y.toPrecision(10);
            }).sort().join('; ');
        check(text === 'cross -4 -3; cross 3 4; root -1 0; xint -5 0; xint 5 0; yint 0 -5; yint 0 1; yint 0 5', 'keyPoints: a circle meets the axes, and crosses y = x + 1', text);
        check(Engine.keyPoints([null], view, 0, [Engine.relation('x y = 4')]).length === 0, 'keyPoints: x y = 4 meets neither axis');
    })();

    // the area under a curve, its integral from a to b
    [
        ['x^2', 0, 3, 0, 9, 'x² from 0 to 3'],
        ['x^2', 3, 0, 0, -9, 'the other way, less'],
        ['sin(x)', 0, Math.PI, 0, 2, 'sin x over half a turn'],
        ['sin(x)', -Math.PI, Math.PI, 0, 0, 'a whole turn, 0, as much below as above'],
        ['sin(x)', 0, 180, 1, 114.591559, 'in degrees, x in degrees'],
        ['x^2-3', -Math.sqrt(3), Math.sqrt(3), 0, -6.92820323, 'below the axis it counts down'],
        ['sqrt(x)', 0, 4, 0, 5.333333333, 'from the edge of where it has values'],
        ['e^x', 0, 1, 0, 1.718281828, 'e^x, to 10 digits'],
        ['abs(x)', -1, 1, 0, 1, 'a corner'],
        ['abs(x-0.3)', -1, 1, 0, 1.09, 'a corner between the pieces'],
        ['sin(50x)', 0, 10, 0, 0.03767698547, 'a quick wave'],
        ['1/x', 1, Math.E, 0, 1, '1/x to e'],
        ['x', 2, 2, 0, 0, 'none wide'],
        ['1/x', -1, 1, 0, NaN, 'none across where there is no value'],
        ['sin(1/x)', 0.0001, 1, 0, NaN, 'none where it does not settle']
    ].forEach(function (c) {
        var got = Engine.area(Engine.graph(c[0]), c[1], c[2], c[3]);
        check(Object.is(got, c[4]) || got === c[4], 'graph area: ' + c[5], got);
    });

    (function (e) {
        e.paste('2x3 =', 0);
        check(e.value === '6', 'x is still × in a pasted equation', e.value);
    })(new Engine());
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
