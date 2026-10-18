// Run with: node test/page-answers.test.js
// What of a page's text the icons go after: each sum, equation and inequality of x the calculator
// works out, and not the numbers of dates, times, scores, phones and versions
'use strict';

var PageMaths = require('../js/page/answers.js'),
    Engine = require('../js/engine.js'),
    Maths = require('../js/maths.js'),
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
    return PageMaths.find(text).map(function (m) { return text.slice(m.from, m.to) + ' | ' + m.kind + ' | ' + m.text; });
}

// as page/answers.js works a sum out: the calculator's engine, in Deg
function workOut(text) {
    var e = new Engine();
    if (!e.paste(text, 1, true) || e.error) return null;
    e.press('=', 1);
    return e.error ? null : +e.value;
}

// each is found whole, as the part of the text given, the kind and the calculator's text
[
    ['2 + 3', '2 + 3 | sum | 2 + 3'],
    ['It costs 12 × 7 + 3 in all.', '12 × 7 + 3 | sum | 12 × 7 + 3'],
    ['So 2 + 2 = 4, as we know.', '2 + 2 = 4 | sum | 2 + 2 = 4'],
    ['What is 6 × 7 = ?', '6 × 7 = | sum | 6 × 7 ='],
    ['2^10 bytes', '2^10 | sum | 2^10'],
    ['3² + 4² = 5²', '3² + 4² = 5² | sum | 3² + 4² = 5²'],
    ['√16 is 4', '√16 | sum | √16'],
    ['sqrt(2) and sin(30°)', 'sqrt(2) | sum | sqrt(2)', 'sin(30°) | sum | sin(30°)'],
    ['log 100 + 1', 'log 100 + 1 | sum | log 100 + 1'],
    ['(3 + 4) × 5', '(3 + 4) × 5 | sum | (3 + 4) × 5'],
    ['2(3 + 4)', '2(3 + 4) | sum | 2(3 + 4)'],
    ['2π × 5', '2π × 5 | sum | 2π × 5'],
    ['1,000 + 2,500 = 3,500', '1,000 + 2,500 = 3,500 | sum | 1000 + 2500 = 3500'],
    ['$5 + $3 shipping', '$5 + $3 | sum | 5 + 3'],
    ['15% of 80', '15% of 80 | sum | 15% × 80'],
    ['10 mod 3', '10 mod 3 | sum | 10 mod 3'],
    ['10 − 3', '10 − 3 | sum | 10 - 3'],
    ['10 - 3 = 7', '10 - 3 = 7 | sum | 10 - 3 = 7'],
    ['3 x 4 = 12', '3 x 4 = 12 | sum | 3 × 4 = 12'],
    ['10 / 4', '10 / 4 | sum | 10 / 4'],
    ['1/2 + 1/3', '1/2 + 1/3 | sum | 1/2 + 1/3'],
    ['6.02e23 × 2', '6.02e23 × 2 | sum | 6.02e23 × 2'],
    ['2 × −3', '2 × −3 | sum | 2 × -3'],
    ['(2 + 3', '2 + 3 | sum | 2 + 3'],
    ['1 + 2 +', '1 + 2 | sum | 1 + 2'],
    ['Solve 2x + 3 = 7 for x.', '2x + 3 = 7 | equation | 2x + 3 = 7'],
    ['x² − 5x + 6 = 0', 'x² − 5x + 6 = 0 | equation | x² - 5x + 6 = 0'],
    ['x^3 = 2x + 1', 'x^3 = 2x + 1 | equation | x^3 = 2x + 1'],
    ['x^2 - 4 > 0', 'x^2 - 4 > 0 | inequality | x^2 - 4 > 0'],
    ['2x + 1 <= 5', '2x + 1 <= 5 | inequality | 2x + 1 ≤ 5'],
    ['sin(x) = 0.5', 'sin(x) = 0.5 | equation | sin(x) = 0.5'],
    ['sin(x) = cos(x)', 'sin(x) = cos(x) | equation | sin(x) = cos(x)'],
    ['−2 < 3x + 1 < 7', '−2 < 3x + 1 < 7 | inequality | -2 < 3x + 1 < 7'],
    ['0 ≤ x^2 − 1 ≤ 8', '0 ≤ x^2 − 1 ≤ 8 | inequality | 0 ≤ x^2 - 1 ≤ 8'],
    ['a = 2 + 3', '2 + 3 | sum | 2 + 3'],
    ['The parabola y = x² − 4x + 3 opens up.', 'y = x² − 4x + 3 | graph | x² - 4x + 3'],
    ['f(x) = sin(x)/x', 'f(x) = sin(x)/x | graph | sin(x)/x'],
    ['g(x)=2^x', 'g(x)=2^x | graph | 2^x'],
    ['Our LAN is 192.168.0.1/24.', '192.168.0.1/24 | subnet | 192.168.0.1/24'],
    ['host 192.168.1.10 255.255.255.0 here', '192.168.1.10 255.255.255.0 | subnet | 192.168.1.10 255.255.255.0'],
    ['10.0.0.0/8, 172.16.0.0/12', '10.0.0.0/8 | subnet | 10.0.0.0/8', '172.16.0.0/12 | subnet | 172.16.0.0/12'],
    ['v6: 2001:db8::/32 and fe80::1/64', '2001:db8::/32 | subnet | 2001:db8::/32', 'fe80::1/64 | subnet | fe80::1/64'],
    ['2001:0db8:85a3:0000:0000:8a2e:0370:7334/64', '2001:0db8:85a3:0000:0000:8a2e:0370:7334/64 | subnet | 2001:0db8:85a3:0000:0000:8a2e:0370:7334/64']
].forEach(function (c) {
    var got = found(c[0]);
    check(got.join(' / ') === c.slice(1).join(' / '), 'found: ' + c[0], got.join(' / '));
});

// none of these is a sum
[
    '2024-10-18', '10/18/2026', '3/4', '24/7', '10:30 - 11:30', 'pages 10-20', '10 – 20 people', 'Score: 3 - 1',
    '555-123-4567', '+1 (555) 123-4567', 'COVID-19', 'v1.2.3 + 1', '192.168.1.1', '1920 x 1080', '1920x1080', '1920×1080', 'a 2×2 matrix',
    'Top 10!', '50%', '100 m²', '42', '-5', 'x = 5', 'x = −2', 'y = 5', 'y = x', 'y = mx + b', '2x + 1', 'E = mc²',
    'a² + b² = c²', '2a + 3b = 7', '5kg + 3kg', '9am - 5pm', 'Windows 10 + Office', 'A+ and 4+ stars', 'i = i + 1',
    '300.1.1.1/24', '1.2.3.4/33', '10.0.0.1 255.0.255.0', '1.2.3.4/24.5', '2001:db8::1:2:3:4:5:6:7/64', '2001:db8::/129', 'a::b::c/64',
    'if (a != 2) b == 3', '3 < 5', '1 = 1', '1 < 2 < 3', 'x = x', 'Rated 4.5/5', '© 2020–2024', 'x + 1 = '
].forEach(function (text) {
    var got = found(text);
    check(!got.length, 'not maths: ' + text, got.join(' / '));
});

// round 5 + 3: round is a word there, its 5 + 3 still a sum
check(found('round 5 + 3 tables').join() === '' || found('round 5 + 3 tables').join() === '5 + 3 | sum | 5 + 3',
    'round without its bracket is a word', found('round 5 + 3 tables').join());

// several in one text, each where it is
(function () {
    var text = 'First 1 + 1 = 2, then 2 × 3 = 6, and 2x = 8.', got = PageMaths.find(text);
    check(got.length === 3 && got.map(function (m) { return m.kind; }).join() === 'sum,sum,equation' &&
        text.slice(got[2].from, got[2].to) === '2x = 8', 'several in one text', JSON.stringify(got));
})();

// what is found, the calculator works out: the sums as the icon's tip says
[['12 × 7 + 3', 87], ['2 + 2 = 5', 4], ['3² + 4² = 5²', 25], ['sin(30°)', 0.5], ['15% of 80', 12], ['3 x 4 = 12', 12],
    ['1,000 + 2,500', 3500], ['$5 + $3', 8], ['2^10', 1024], ['10 mod 3', 1], ['2 × −3', -6], ['6 × 7 = ?', 42]].forEach(function (c) {
    var m = PageMaths.find(c[0])[0], v = m && workOut(m.left);
    check(m && Math.abs(v - c[1]) < 1e-9, 'worked out: ' + c[0] + ' is ' + c[1], m ? m.left + ' → ' + v : 'not found');
});

// and solves the equations, and says where the inequalities hold
(function () {
    var m = PageMaths.find('x² − 5x + 6 = 0')[0], r = Maths.solve(m.text, false, 1, NaN, NaN, true);
    check(r.roots.join() === '2,3', 'solved: x² − 5x + 6 = 0', JSON.stringify(r));
    m = PageMaths.find('Solve 2x + 3 = 7')[0];
    check(Maths.solve(m.text, false, 1, NaN, NaN, true).roots.join() === '2', 'solved: 2x + 3 = 7');
    m = PageMaths.find('x^2 - 4 > 0')[0];
    r = Maths.inequality(m.text, false, 1, NaN, NaN);
    check(r.parts.length === 2 && r.parts[0].to === -2 && r.parts[1].from === 2, 'held: x^2 - 4 > 0', JSON.stringify(r));
    m = PageMaths.find('−2 < 3x + 1 < 7')[0];
    r = Maths.inequality(m.text, false, 1, NaN, NaN);
    check(r.parts.length === 1 && r.parts[0].from === -1 && r.parts[0].to === 2, 'held: −2 < 3x + 1 < 7, as a whole', JSON.stringify(r));
    m = PageMaths.find('sin(x) = cos(x)')[0];
    check(Maths.solve(m.text, false, 1, NaN, NaN, true).roots.indexOf(45) > -1, 'solved: sin(x) = cos(x) at 45° among others');
    m = PageMaths.find('2x + 1 <= 5')[0];
    r = Maths.inequality(m.text, false, 1, NaN, NaN);
    check(r.parts.length === 1 && r.parts[0].to === 2 && r.parts[0].toIn, 'held: 2x + 1 ≤ 5', JSON.stringify(r));
})();

// and the networks, as the calculator's IP subnet works them out
(function () {
    var r = Maths.subnet(PageMaths.find('Our LAN is 192.168.0.1/24.')[0].text);
    check(Maths.ipText(r.network) === '192.168.0.0' && Maths.ipText(r.broadcast) === '192.168.0.255' && r.hosts === 254 && r.kind === 'Private',
        'subnet: 192.168.0.1/24', JSON.stringify(r));
    r = Maths.subnet(PageMaths.find('host 192.168.1.10 255.255.255.0 here')[0].text);
    check(r.prefix === 24 && Maths.ipText(r.network) === '192.168.1.0', 'subnet: with a mask', JSON.stringify(r));
    r = Maths.subnet(PageMaths.find('2001:db8::/32')[0].text);
    check(r.v6 && r.prefix === 32 && !r.error, 'subnet: IPv6', JSON.stringify(r, function (k, v) { return typeof v === 'bigint' ? String(v) : v; }));
})();

// maths marked as maths: TeX, as KaTeX, MathJax and Wikipedia keep it, read whole
(function () {
    var Formulas = require('../js/formulas.js'), index = PageMaths.namedIndex(Formulas);
    function tex(source) {
        var line = PageMaths.fromTex(source), c = PageMaths.formal(line) || PageMaths.formulaOf(line, index);
        return c ? c.kind + ': ' + (c.kind === 'formula' || c.kind === 'constant' ? c.name : c.text) + (c.fields && c.kind !== 'formula' ? ' ' + JSON.stringify(c.fields) : '') : '(none)';
    }
    [
        ['\\frac{1}{2} + \\frac{1}{3}', 'sum: (1/2) + (1/3)'],
        ['\\sqrt{144} + 2^{3}', 'sum: √144 + 2^3'],
        ['\\sqrt[3]{27} \\cdot 2', 'sum: (27^(1/3)) × 2'],
        ['\\left|-5\\right| + |3|', 'sum: abs(-5) + abs(3)'],
        ['1{,}000 \\times 3', 'sum: 1000 × 3'],
        ['\\ln(e^3)', 'sum: ln(e^3)'],
        ['\\cos(\\pi) + \\sin\\left(\\frac{\\pi}{2}\\right)', 'sum: cos(π) + sin(π/2)'],
        ['x^2 - 5x + 6 = 0', 'equation: x^2 - 5x + 6 = 0'],
        ['-2 < 3x + 1 < 7', 'inequality: -2 < 3x + 1 < 7'],
        ['\\int_0^1 x^2 \\, dx', 'integral: ∫ x^2 dx from 0 to 1 {"f":"x^2","a":"0","b":"1"}'],
        ['\\int_{0}^{\\pi} \\sin x \\,\\mathrm{d}x', 'integral: ∫ sin(x) dx from 0 to π {"f":"sin(x)","a":"0","b":"π"}'],
        ['\\sum_{k=1}^{10} k^2', 'series: Σ k^2, k from 1 to 10 {"f":"k^2","a":"1","b":"10"}'],
        ['\\sum_{n=1}^{\\infty} \\frac{1}{n^2}', 'series: Σ (1/n^2), n from 1 to ∞ {"f":"(1/n^2)","a":"1","b":"inf"}'],
        ['\\prod_{n=2}^{\\infty} \\left(1 - \\frac{1}{n^2}\\right)', 'product: Π (1 - (1/n^2)), n from 2 to ∞ {"f":"(1 - (1/n^2))","a":"2","b":"inf"}'],
        ['\\lim_{x \\to 0} \\frac{\\sin x}{x}', 'limit: lim x → 0 of ((sin(x))/x) {"f":"((sin(x))/x)","a":"0"}'],
        ['E = mc^2', 'formula: Mass–energy'],
        ['\\rho = \\frac{m}{V}', 'formula: Density'],
        ['PV = nRT', 'formula: Ideal gas law'],
        ['F = \\frac{G m_1 m_2}{r^2}', 'formula: Universal gravitation'],
        ['V = \\frac{4}{3}\\pi r^3', 'formula: Volume of a sphere'],
        ['T = 2\\pi\\sqrt{\\frac{L}{g}}', 'formula: Pendulum period'],
        ['x = \\frac{-b + \\sqrt{b^2 - 4ac}}{2a}', 'formula: Quadratic formula (+)'],
        ['a^2 + b^2 = c^2', 'formula: Pythagorean theorem'],
        ['x_1 + x_2', '(none)'],
        ['x \\pm 1', '(none)'],
        ['\\frac{d}{dx} x^3', 'graph: d/dx(x^3) {"f":"d/dx(x^3)"}'],
        ['2\\pi r', '(none)'],
        ['e^{i\\pi} + 1 = 0', '(none)'],
        ['{t^2} + 3t - 10 = 4 + 8t', 'equation: x^2 + 3x - 10 = 4 + 8x'],
        ['6z - {z^2} \\ge {z^2} + 3', 'inequality: 6x - x^2 ≥ x^2 + 3'],
        ['t =  - 3', '(none)'],
        ['y = x^2 - 4x + 3', 'graph: x^2 - 4x + 3 {"f":"x^2 - 4x + 3"}'],
        ['\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}', 'matrix: [1 2; 3 4] {"size":"2×2","a11":"1","a12":"2","a21":"3","a22":"4"}'],
        ['\\left[ \\begin{array}{cc} 1 & 0 \\\\ 0 & 1 \\end{array} \\right]', 'matrix: [1 0; 0 1] {"size":"2×2","a11":"1","a12":"0","a21":"0","a22":"1"}'],
        ['\\begin{cases} x + y = 2 \\\\ x - y = 0 \\end{cases}', 'system: x + y = 2, x - y = 0 {}'],
        ['a + b = 5', '(none)']
    ].forEach(function (c) {
        var got = tex(c[0]);
        check(got === c[1], 'TeX: ' + c[0], got);
    });

    // the solver's cards work them out as the tips say
    var c = PageMaths.formal(PageMaths.fromTex('\\int_0^1 x^2 \\, dx'));
    check(Math.abs(Maths.integral(Maths.fn(c.fields.f, false), 0, 1, 0) - 1 / 3) < 1e-9, 'TeX: ∫₀¹ x² dx is 1/3');
    c = PageMaths.formal(PageMaths.fromTex('\\sum_{n=1}^{\\infty} \\frac{1}{n^2}'));
    check(Math.abs(Maths.series(c.fields.f, false, 0, 1, Infinity).value - Math.PI * Math.PI / 6) < 1e-6, 'TeX: Σ 1/n² is π²/6');
    c = PageMaths.formal(PageMaths.fromTex('\\lim_{x \\to 0} \\frac{\\sin x}{x}'));
    check(Math.abs(Maths.limit(Maths.fn(c.fields.f, false), 0, 0).value - 1) < 1e-9, 'TeX: lim sin(x)/x at 0 is 1');

    // formulas and constants in the text, by how they are written and by their names
    var text = 'Einstein wrote E = mc² in 1905; Newton had F = ma, and Ohm V = IR. The ideal gas law PV = nRT holds. ' +
        'The speed of light, Planck\'s constant, the reduced Planck constant, Avogadro\'s number, a² + b² = c² and KE = ½mv². ' +
        'Not: e = mc, F = mass, Raspberry Pi, a bar, E=mc²x.';
    var got = PageMaths.findNamed(text, index).map(function (m) { return m.text + ' → ' + m.name; });
    check(got.join(' | ') === 'E = mc² → Mass–energy | F = ma → Newton\'s second law | V = IR → Ohm\'s law | PV = nRT → Ideal gas law | ' +
        'speed of light → Speed of light | Planck\'s constant → Planck constant | reduced Planck constant → Reduced Planck constant | ' +
        'Avogadro\'s number → Avogadro constant | a² + b² = c² → Pythagorean theorem | KE = ½mv² → Kinetic energy', 'formulas and constants in text', got.join(' | '));
})();

// text selected: the whole of it as maths, else the one thing in it
(function () {
    var index = PageMaths.namedIndex(require('../js/formulas.js'));
    [['12 × 7 + 3', 'sum'], ['the answer to 15% of 80 is twelve', 'sum'], ['192.168.0.1/24', 'subnet'], ['E = mc²', 'formula'],
        ['speed of light', 'constant'], ['\\frac{1}{2}+\\frac{1}{4}', 'sum'], ['3t + 2 = 11', 'equation'], ['y = x^2 - 1', 'graph'],
        ['hello world', null], ['2 + 3 and 4 + 5', null]].forEach(function (c) {
        var got = PageMaths.selected(c[0], index);
        check((got ? got.kind : null) === c[1], 'selected: ' + c[0], got && got.kind);
    });
})();

// written in fractions: its result is a fraction too, and the calculator opens in a/b
(function () {
    [['1/2 + 1/3', true, '5,6'], ['½ + ¼', true, '3,4'], ['3/4 − 5/8 + 1/16', true, '3,16'], ['(2/3) ÷ (4/9)', true, '3,2'],
        ['0.5 + 1/4', false], ['12 × 7 + 3', false], ['2 × 1½', true, 'null']].forEach(function (c) {
        var m = PageMaths.find(c[0])[0], v = m && workOut(m.left);
        check(m && !!m.frac === c[1] && (!c[1] || String(Engine.fraction(v)) === (c[2] === 'null' ? 'null' : c[2])),
            'fraction: ' + c[0], m && m.left + ' frac=' + m.frac + ' ' + v);
    });
    var c = PageMaths.formal(PageMaths.fromTex('\\frac{1}{2} + \\frac{1}{3}'));
    check(c && c.frac, 'fraction: \\frac{1}{2} + \\frac{1}{3} from TeX');
})();

// a long run that looks like a sum is not read again from each place in it: a page of them does not hang
(function () {
    [['1 + '.repeat(8000) + '1a', 'a sum of 32000 characters'], ['(('.repeat(4000) + '1 + 2', 'brackets never closed'],
        ['('.repeat(3000) + '1' + ')'.repeat(3000), 'brackets 3000 deep'], ['12-'.repeat(20000), 'numbers and dashes']].forEach(function (c) {
        var start = Date.now();
        PageMaths.find(c[0]);
        check(Date.now() - start < 1500, 'quick: ' + c[1], (Date.now() - start) + ' ms');
    });
})();

// the websites the icons are turned off on: by the name without www., and no other website with them
(function () {
    var off = ['example.com', 'en.wikipedia.org'];
    check(PageMaths.siteOf('WWW.Example.com') === 'example.com', 'site: www. and capitals left out', PageMaths.siteOf('WWW.Example.com'));
    check(PageMaths.offOn(off, 'www.example.com') && PageMaths.offOn(off, 'example.com'), 'site: www.example.com is example.com');
    check(PageMaths.offOn(off, 'en.wikipedia.org') && !PageMaths.offOn(off, 'de.wikipedia.org'), 'site: one language of Wikipedia, not the others');
    check(!PageMaths.offOn(off, 'notexample.com') && !PageMaths.offOn(off, 'mail.example.com'), 'site: not a website with a name like it');
    check(!PageMaths.offOn(undefined, 'example.com') && !PageMaths.offOn('example.com', 'example.com'), 'site: on with no list kept');
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
