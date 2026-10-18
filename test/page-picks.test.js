// Run with: node test/page-picks.test.js
// What else of a page's text the icons go after (page/picks.js), and what is selected: quantities to convert,
// dates, money, equations together, choices and complex numbers; numbers, lists and the codes of a computer.
// And the derivatives, series and differential equations that page/answers.js reads; and what their tips say
'use strict';

var Picks = require('../js/page/picks.js'),
    PageMaths = require('../js/page/answers.js'),
    Engine = require('../js/engine.js'),
    Maths = require('../js/maths.js'),
    Units = require('../js/units.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

function found(text) {
    return Picks.find(text, 'mdy').map(function (c) { return text.slice(c.from, c.to) + ' | ' + c.kind + ' | ' + JSON.stringify(c.fields); });
}

function tip(c) {
    return Picks.tipOf(c, Maths, Engine, Units, 1);
}

// each found whole, the part of the text, its kind and its boxes
[
    ['Convert 5 km in miles.', '5 km in miles | unit | {"panel":"units","g":"Length","u":"kilometers","v":"5","to":"miles"}'],
    ['Set it to 72 °F to °C first', '72 °F to °C | unit | {"panel":"units","g":"Temperature","u":"Fahrenheit","v":"72","to":"Celsius"}'],
    ['2 TB in GB', '2 TB in GB | unit | {"panel":"units","g":"Data","u":"terabytes","v":"2","to":"gigabytes"}'],
    ['How many cups in 2 liters?', 'How many cups in 2 liters | unit | {"panel":"units","g":"Volume","u":"liters","v":"2","to":"cups (US)"}'],
    ['100 pounds in kilograms', '100 pounds in kilograms | unit | {"panel":"units","g":"Mass","u":"pounds","v":"100","to":"kilograms"}'],
    ['It ran from March 3, 2024 to June 1, 2026.', 'from March 3, 2024 to June 1, 2026 | span | {"a":"2024-03-03","b":"2026-06-01"}'],
    ['between 2024-01-01 and 2024-12-31', 'between 2024-01-01 and 2024-12-31 | span | {"a":"2024-01-01","b":"2024-12-31"}'],
    ['1 May 2026 – 4 July 2026', '1 May 2026 – 4 July 2026 | span | {"a":"2026-05-01","b":"2026-07-04"}'],
    ['from today to 25 December 2026', 'from today to 25 December 2026 | span | {"a":"","b":"2026-12-25"}'],
    ['90 days after 1 May 2026', '90 days after 1 May 2026 | later | {"d":"2026-05-01","y":"0","m":"0","days":"90"}'],
    ['3 weeks before March 1, 2027', '3 weeks before March 1, 2027 | later | {"d":"2027-03-01","y":"0","m":"0","days":"-21"}'],
    ['2026-01-31 plus 1 month', '2026-01-31 plus 1 month | later | {"d":"2026-01-31","y":"0","m":"1","days":"0"}'],
    ['A $250,000 mortgage at 6.5% for 30 years.', '$250,000 mortgage at 6.5% for 30 years | loan | {"loan":"250000","rate":"6.5","years":"30","py":"12"}'],
    ['a 5-year car loan of $20k at 4%', '5-year car loan of $20k at 4% | loan | {"loan":"20000","rate":"4","years":"5","py":"12"}'],
    ['Prices rose from $120 to $150.', 'rose from $120 to $150 | change | {"a":"120","b":"150"}'],
    ['from €80 to €60', 'from €80 to €60 | change | {"a":"80","b":"60"}'],
    ['Rates increased from 3% to 5%', 'increased from 3% to 5% | change | {"a":"3","b":"5"}'],
    ['5% compounded monthly', '5% compounded monthly | rates | {"apr":"5","m":"12"}'],
    ['4.5% APR, compounded daily', '4.5% APR, compounded daily | rates | {"apr":"4.5","m":"365"}'],
    ['Solve 2x + y = 5, x − y = 1 now.', '2x + y = 5, x − y = 1 | system | {}'],
    ['x + y + z = 6, 2x − y + z = 3, x + 2y − z = 2.', 'x + y + z = 6, 2x − y + z = 3, x + 2y − z = 2 | system | {}'],
    ['x² + y² = 25 and x + y = 7', 'x² + y² = 25 and x + y = 7 | system | {}'],
    ['There are 52 choose 5 hands.', '52 choose 5 | exact | {"e":"C(52, 5)"}'],
    ['10 nPr 3', '10 nPr 3 | exact | {"e":"P(10, 3)"}'],
    ['nCr(10, 3)', 'nCr(10, 3) | exact | {"e":"C(10, 3)"}'],
    ['C(52, 5) = 2,598,960', 'C(52, 5) | exact | {"e":"C(52, 5)"}'],
    ['Work out (3 + 4i)(1 − 2i).', '(3 + 4i)(1 − 2i) | complex | {"z":"(3 + 4i)(1 - 2i)"}'],
    ['|3 + 4i| is its length', '|3 + 4i| | complex | {"z":"abs(3 + 4i)"}'],
    ['2 + 3i', '2 + 3i | complex | {"z":"2 + 3i"}']
].forEach(function (c) {
    var got = found(c[0]);
    check(got.join(' || ') === c.slice(1).join(' || '), 'found: ' + c[0], got.join(' || '));
});

// and these not: sizes, times, ranges of numbers, solved ones, coordinates, roman numerals, words
[
    'I am 5 ft tall and 2 m wide in the room.', 'He is 6 ft 2 in', 'Meeting from 9:00 to 17:00', 'From 9 to 5 every day.',
    'Windows 10 to 11', 'Version 2.0 to 3.0', 'from 1990 to 2000 the price rose', 'on 3/4/2024 and 5/6/2024', 'In 3 years.',
    'x = 5, y = 3', 'y = 5, y = x', 'a = 1, b = 2', 'Point C(3, 4) on the line', 'Chapter 3 (i) 2 + 3 = 5', 'The ratio i/2', 'Use 1.5x to 2x zoom',
    'covid-19', 'score 3-1', 'Call 555-1234', '5 km', 'a loan to a friend', 'The 30 years war at 5%', '13/13/2024 to 1/1/2025'
].forEach(function (text) {
    var got = found(text);
    check(!got.length, 'not found: ' + text, got.join(' || '));
});

// 03/04/2024: as the page's region writes a date; 13/04 is of one way alone
(function () {
    check(Picks.readDate('03/04/2024', 'mdy') === '2024-03-04', 'date: 03/04/2024 of the US');
    check(Picks.readDate('03/04/2024', 'dmy') === '2024-04-03', 'date: 03/04/2024 elsewhere');
    check(Picks.readDate('13/04/2024', 'mdy') === '2024-04-13', 'date: 13/04/2024, the day first all the same');
    check(Picks.readDate('Feb 30, 2024', 'mdy') === null, 'date: no 30 February');
    check(Picks.readDate('29 Feb 2024', 'mdy') === '2024-02-29', 'date: 29 February of a leap year');
    check(Picks.readDate('3rd of March, 2024', 'mdy') === '2024-03-03', 'date: 3rd of March, 2024');
})();

// selected: what each is alone
[
    ['4 8 15 16 23 42', 'list', '{"list":"4 8 15 16 23 42"}'],
    ['1, 2, 3, 4', 'list', '{"list":"1 2 3 4"}'],
    ['Price\n$1,200.50\n$300\n$45.10', 'list', '{"list":"1200.5 300 45.1"}'],
    ['12%\t15%\t9%', 'list', '{"list":"12 15 9"}'],
    ['0xFF', 'bits', '{"e":"0xFF","bits":"2"}'],
    ['0b1010', 'bits', '{"e":"0b1010","bits":"2"}'],
    ['0x1FFFFFFFFF', 'bits', '{"e":"0x1FFFFFFFFF","bits":"3"}'],
    ['f81d4fae-7dec-11d0-a765-00a0c91e6bf6', 'uuid', '{"u":"f81d4fae-7dec-11d0-a765-00a0c91e6bf6"}'],
    ['{F81D4FAE-7DEC-11D0-A765-00A0C91E6BF6}', 'uuid', '{"u":"F81D4FAE-7DEC-11D0-A765-00A0C91E6BF6"}'],
    ['1700000000', 'unix', '{"convert":"0","ts":"1700000000"}'],
    ['1700000000000', 'unix', '{"convert":"0","ts":"1700000000000"}'],
    ['SGVsbG8gd29ybGQ=', 'base64', '{"b":"SGVsbG8gd29ybGQ=","enc":"2"}'],
    ['March 3, 2024', 'date', '{"a":"2024-03-03","b":""}'],
    ['Sunday, 3 March 2024', 'date', '{"a":"2024-03-03","b":""}'],
    ['in 90 days', 'later', '{"d":"","y":"0","m":"0","days":"90"}'],
    ['5 km', 'unit', '{"panel":"units","g":"Length","u":"kilometers","v":"5"}'],
    ['72°F', 'unit', '{"panel":"units","g":"Temperature","u":"Fahrenheit","v":"72"}'],
    ['360', 'whole', '{"n":"360"}'],
    ['1,234,567', 'whole', '{"n":"1234567"}'],
    ['-12', 'whole', '{"n":"-12"}'],
    ['0.375', 'decimal', '{"x":"0.375"}'],
    ['$19.99', 'decimal', '{"x":"19.99"}'],
    ['Hello world', null], ['Password1', null], ['NoSuchThing', null], ['1234567890123456789012', null], ['2 + 3', null]
].forEach(function (c) {
    var got = Picks.picked(c[0], 'mdy');
    check((got ? got.kind : null) === c[1] && (!got || JSON.stringify(got.fields) === c[2]), 'picked: ' + JSON.stringify(c[0]), got && got.kind + ' ' + JSON.stringify(got.fields));
});

// selected on a page: these first, then a sum, then the one thing in it
(function () {
    [['4 8 15 16', 'list'], ['2 + 3', 'sum'], ['5 km in miles', 'unit'], ['52 choose 5 ways', 'exact'], ['0xFF', 'bits'],
        ['2 + 3 and 52 choose 5', null], ['d/dx x^3 at x = 2', 'derivative']].forEach(function (c) {
        var got = PageMaths.selected(c[0], null, 'mdy');
        check((got ? got.kind : null) === c[1], 'selected: ' + c[0], got && got.kind);
    });
})();

// the tips, worked out by the calculator's maths
(function () {
    var one = function (text) { return Picks.find(text, 'mdy')[0]; };
    var t = tip(one('5 km in miles'));
    check(t.lines[0] === '= 3.10685596 mi', 'tip: 5 km in miles', JSON.stringify(t));
    t = tip(one('72 °F to °C'));
    check(t.lines[0] === '= 22.2222222 °C', 'tip: 72 °F to °C', JSON.stringify(t));
    t = tip(one('from March 3, 2024 to June 1, 2026'));
    check(t.lines[0] === '2 years, 2 months, 29 days' && t.rows[0][1] === '820', 'tip: from March 3, 2024 to June 1, 2026', JSON.stringify(t));
    t = tip(one('90 days after 1 May 2026'));
    check(t.lines[0] === 'Thursday 30 July 2026', 'tip: 90 days after 1 May 2026', JSON.stringify(t));
    t = tip(one('2026-01-31 plus 1 month'));
    check(t.lines[0] === 'Saturday 28 February 2026', 'tip: a month from 31 January', JSON.stringify(t));
    t = tip(one('A $250,000 mortgage at 6.5% for 30 years'));
    check(t.lines[0] === '1,580.17 a month' && t.rows[1][1] === '318,861.22', 'tip: a mortgage', JSON.stringify(t));
    t = tip(one('rose from $120 to $150'));
    check(t.lines[0] === '+25%' && t.rows[0][1] === '+30', 'tip: a change', JSON.stringify(t));
    t = tip(one('5% compounded monthly'));
    check(t.lines[0] === '= 5.1161898% a year (APY)', 'tip: a rate compounded', JSON.stringify(t));
    t = tip(one('52 choose 5'));
    check(t.lines[0] === '= 2,598,960', 'tip: 52 choose 5', JSON.stringify(t));
    t = tip(one('(3 + 4i)(1 − 2i)'));
    check(t.lines[0] === '= 11 – 2i', 'tip: (3 + 4i)(1 − 2i)', JSON.stringify(t));
    t = tip(one('|3 + 4i|'));
    check(t.lines[0] === '= 5', 'tip: |3 + 4i|', JSON.stringify(t));

    // equations together: their card and boxes are found as their tip is
    var c = one('2x + y = 5, x − y = 1');
    t = tip(c);
    check(t.lines.join(', ') === 'x = 2, y = 1' && c.card === 'system2' && JSON.stringify(c.fields) === '{"a1":"2","b1":"1","c1":"5","a2":"1","b2":"-1","c2":"1"}',
        'tip: two equations', JSON.stringify(t) + ' ' + c.card + ' ' + JSON.stringify(c.fields));
    c = one('x + y + z = 6, 2x − y + z = 3, x + 2y − z = 2');
    t = tip(c);
    check(t.lines.join(', ') === 'x = 1, y = 2, z = 3' && c.card === 'system3', 'tip: three equations', JSON.stringify(t) + ' ' + c.card);
    c = one('x² + y² = 25 and x + y = 7');
    t = tip(c);
    check(t.lines.join(', ') === '(3, 4), (4, 3)' && c.card === 'curves' && c.fields.e1 === 'x^2 + y^2 = 25', 'tip: two curves', JSON.stringify(t) + ' ' + c.card);
    c = one('x + y = 1, 2x + 2y = 2');
    t = tip(c);
    check(t.lines[0] === 'Many answers', 'tip: two equations of one line', JSON.stringify(t));

    var p = function (text) { return tip(Picks.picked(text, 'mdy')); };
    t = p('4 8 15 16 23 42');
    check(t.rows[0][1] === '108' && t.rows[1][1] === '18' && t.rows[2][1] === '15.5', 'tip: a list', JSON.stringify(t));
    t = p('360');
    check(t.rows[0][1] === '2³ × 3² × 5' && t.rows[2][1] === '0x168', 'tip: 360', JSON.stringify(t));
    t = p('97');
    check(t.rows[1][1] === 'Yes', 'tip: 97 is prime', JSON.stringify(t));
    t = p('0.375');
    check(t.rows[0][1] === '3/8', 'tip: 0.375', JSON.stringify(t));
    t = p('0xFF');
    check(t.rows[0][1] === '255' && t.rows[3][1] === '1111 1111', 'tip: 0xFF', JSON.stringify(t));
    t = p('f81d4fae-7dec-11d0-a765-00a0c91e6bf6');
    check(t.rows[0][1] === '1' && /^1997-02-03/.test(t.rows[2][1]), 'tip: a UUID of version 1', JSON.stringify(t));
    t = p('1700000000');
    check(t.rows[0][1] === '2023-11-14 22:13:20', 'tip: a Unix time', JSON.stringify(t));
    t = p('SGVsbG8gd29ybGQ=');
    check(t.lines[0] === 'Hello world', 'tip: Base64', JSON.stringify(t));
    t = p('5 km');
    check(t.rows.length === 8 && t.rows[6][1] === '3.106856', 'tip: 5 km', JSON.stringify(t));
})();

// derivatives, series and differential equations, of page/answers.js, in text and in TeX
(function () {
    var text = function (s) {
        return PageMaths.find(s).map(function (c) { return s.slice(c.from, c.to) + ' | ' + c.kind + ' | ' + JSON.stringify(c.fields); }).join(' || ');
    };
    var tex = function (s) {
        var c = PageMaths.formal(PageMaths.fromTex(s));
        return c ? c.kind + ' ' + JSON.stringify(c.fields) : '(none)';
    };
    [
        ['d/dx (x^3 - 2x)', 'd/dx (x^3 - 2x) | graph | {"f":"d/dx(x^3 - 2x)"}'],
        ['the derivative of sin(x) at x = pi', 'the derivative of sin(x) at x = pi | derivative | {"f":"sin(x)","x":"π"}'],
        ['d/dx x^3 at x = 2', 'd/dx x^3 at x = 2 | derivative | {"f":"x^3","x":"2"}'],
        ['Taylor series of sin(x) about 0 to order 5', 'Taylor series of sin(x) about 0 to order 5 | taylor | {"f":"sin(x)","a":"0","n":"5"}'],
        ['the Maclaurin series of e^x', 'Maclaurin series of e^x | taylor | {"f":"e^x","a":"0","n":"7"}'],
        ["y' = x + y, y(0) = 1", 'y\' = x + y, y(0) = 1 | ode | {"f":"x + y","x0":"0","y0":"1","x":"1"}'],
        ['dy/dx = x*y with y(0) = 1', 'dy/dx = x*y with y(0) = 1 | ode | {"f":"x×y","x0":"0","y0":"1","x":"1"}'],
        ['x = pi', '']
    ].forEach(function (c) {
        check(text(c[0]) === c[1], 'calculus: ' + c[0], text(c[0]));
    });
    [
        ['\\binom{52}{5}', 'exact {"e":"C(52, 5)"}'],
        ['\\binom{52}{5} = 2598960', 'exact {"e":"C(52, 5)"}'],
        ['\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}', 'system {}'],
        ['\\left\\{ \\begin{array}{l} x + y = 3 \\\\ x - y = 1 \\end{array} \\right.', 'system {}'],
        ['(3+4i)(1-2i)', 'complex {"z":"(3+4i)(1-2i)"}'],
        ['\\frac{d}{dx}\\left(x^3\\right) \\text{ at } x = 2', 'derivative {"f":"x^3","x":"2"}'],
        ['\\frac{dy}{dx} = x + y,\\quad y(0) = 1', 'ode {"f":"x + y","x0":"0","y0":"1","x":"1"}'],
        ["y^{\\prime} = x y, y(0)=1", 'ode {"f":"x y","x0":"0","y0":"1","x":"1"}'],
        ['10!', 'sum undefined'],
        ['\\begin{cases} x & x > 0 \\\\ -x & x \\le 0 \\end{cases}', '(none)']
    ].forEach(function (c) {
        check(tex(c[0]) === c[1], 'TeX: ' + c[0], tex(c[0]));
    });
    var y = Maths.ode('x + y', false, 1, 0, 1, 1).y;
    check(Math.abs(y - (2 * Math.E - 2)) < 1e-6, 'ode: y\' = x + y from y(0) = 1 is 2e – 2 at 1', y);
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
