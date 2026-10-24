// Run with: node test/page-physics.test.js
// The physics of a page's text the icons go after (page/physics.js): resistors, capacitors and coils in series and
// parallel, a resistor's colour code, an SMD resistor's code and a level in dBm or dBV; what physics.js makes sure of, what is selected, and
// what their tips say. And what looks like physics and is not: logic, mixed parts, a flag's colours, a gain in dB,
// the names of parts and the sizes of their cases
'use strict';

var PhysPage = require('../js/page/physics.js'),
    PageMaths = require('../js/page/answers.js'),
    Physics = require('../js/physics.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

// what is found in a text and made sure of by physics.js: its text, kind and boxes
function found(text) {
    return PhysPage.find(text).filter(function (c) { return PhysPage.check(c, Physics); }).map(function (c) {
        return c.text + ' | ' + c.kind + ' | ' + JSON.stringify(c.fields);
    });
}

// each is found whole, of its kind, with the boxes of its card
[
    ['Two in parallel: 4.7 kΩ ∥ 10 kΩ.', '4.7 kΩ ∥ 10 kΩ | network | {"part":"0","n":"4.7k || 10k"}'],
    ['The network 100 + 220 || 330 here', '100 + 220 || 330 | network | {"part":"0","n":"100 + 220 || 330"}'],
    ['Brackets: (1k + 2k2) || 4k7', '(1k + 2k2) || 4k7 | network | {"part":"0","n":"(1k + 2k2) || 4k7"}'],
    ['In brackets of the sentence (see 1k || 2k)', '1k || 2k | network | {"part":"0","n":"1k || 2k"}'],
    ['Capacitors: 10 µF || 22 µF', '10 µF || 22 µF | network | {"part":"1","n":"10µ || 22µ"}'],
    ['Coils: 10 mH ‖ 10 mH', '10 mH ‖ 10 mH | network | {"part":"2","n":"10m || 10m"}'],
    ['With ohms: 100 ohms || 100 ohms', '100 ohms || 100 ohms | network | {"part":"0","n":"100 || 100"}'],
    ['Use 100n || 100n caps', '100n || 100n | network | {"part":"1","n":"100n || 100n"}'],
    ['Two resistors in parallel, 100 || 100', '100 || 100 | network | {"part":"0","n":"100 || 100"}'],
    ['A resistor of brown, black, red and gold bands', 'brown, black, red and gold | bands | {"find":"0","n":"0","b40":"1","b41":"0","b42":"2","b43":"6"}'],
    ['Its colours: yellow-violet-red-gold', 'yellow-violet-red-gold | bands | {"find":"0","n":"0","b40":"4","b41":"7","b42":"2","b43":"6"}'],
    ['A resistor read from its other end: gold red violet yellow', 'gold red violet yellow | bands | {"find":"0","n":"0","b40":"4","b41":"7","b42":"2","b43":"6"}'],
    ['A 1% resistor: brown black black red brown', 'brown black black red brown | bands | {"find":"0","n":"1","b50":"1","b51":"0","b52":"0","b53":"2","b54":"0"}'],
    ['Of three bands, a resistor: red red brown', 'red red brown | bands | {"find":"0","n":"0","b40":"2","b41":"2","b42":"1","b43":"8"}'],
    ['The output is -30 dBm.', '-30 dBm | level | {"kind":"0","unit":"0","x":"-30","z":"50"}'],
    ['Line level, +4 dBu, is about 1.78 dBV', '1.78 dBV | level | {"kind":"0","unit":"3","x":"1.78","z":"50"}'],
    ['A weak signal of 20 dBµV', '20 dBµV | level | {"kind":"0","unit":"5","x":"20","z":"50"}'],
    ['A transmitter of 30 dBW', '30 dBW | level | {"kind":"0","unit":"1","x":"30","z":"50"}'],
    ['An SMD resistor marked 473 is 47 kΩ.', '473 | smd | {"find":"0","code":"473"}'],
    ['The resistor is marked 4R7.', '4R7 | smd | {"find":"0","code":"4R7"}'],
    ['A 0R22 shunt resistor', '0R22 | smd | {"find":"0","code":"0R22"}'],
    ['The resistor\'s code is 4702.', '4702 | smd | {"find":"0","code":"4702"}'],
    ['A resistor marked "R47"', 'R47 | smd | {"find":"0","code":"R47"}'],
    ['An 0805 resistor marked 102', '102 | smd | {"find":"0","code":"102"}']
].forEach(function (c) {
    var got = found(c[0]);
    check(got.length === 1 && got[0] === c[1], 'found: ' + c[0], got.join(' || '));
});

// as many as there are
[['Signal at -30 dBm, or 20 dBV, 60 dBµV', 3], ['Resistor bands brown black red gold, and 1k || 1k', 2], ['SMD resistor codes 103, 472 and 01C', 3],
    ['A 4R7 resistor and a 0R22 one', 2]].forEach(function (c) {
    var got = found(c[0]);
    check(got.length === c[1], 'found ' + c[1] + ': ' + c[0], got.join(' || '));
});

// what looks like physics and is not: logic, parts of two kinds, colours of other things, dB alone, words
[
    'logic: a || b, x || 0, true || false',
    'return 1 || 2',
    'a gain from 10-30 dBm, or 10–30 dBm',
    'mixed: 10 µF || 10 kΩ',
    'The flag is red, white and blue; red, orange, yellow, green, blue, violet',
    'black, white and grey; green and gold',
    'a 3 dB gain, 85 dB(A), 120 dB',
    'a dBm of power, dBV alone',
    '100 Hz || 200 Hz',
    'R1 and R2 are resistors of 10 kΩ; resistors R47 and R48 on the board',
    'A 1206 resistor of 100 Ω, made in 2023',
    'The capacitor marked 104, of 100 nF; a 4R7 of no part',
    'A resistor marked 000, a jumper'
].forEach(function (text) {
    var got = found(text);
    check(!got.length, 'none: ' + text, got.join(' || '));
});

// the network's sum is not a sum of its own: 100 + 220 || 330 is one network, not 100 + 220
(function () {
    var Reader = require('../js/page/reader.js'), s = 'The network 100 + 220 || 330 here', got = Reader.found(s, 'mdy', s, Reader.find(s));
    check(got.length === 1 && got[0].kind === 'network', 'before the sums: a network, not 100 + 220', got.map(function (c) { return c.kind + ' ' + c.text; }).join(' || '));
})();

// selected alone: any resistor's bands, a network, a level
[
    ['red red brown', 'bands'], ['brown black orange gold', 'bands'], ['blue grey black', 'bands'], ['4k7 || 10k', 'network'], ['-30 dBm', 'level'],
    ['4R7', 'smd'], ['R47', 'smd'], ['hello world', null], ['3 dB', null], ['red', null], ['473', null], ['R1', null], ['10A', null]
].forEach(function (c) {
    var got = PhysPage.picked(c[0]);
    check((got ? got.kind : null) === c[1] && (!got || PhysPage.check(got, Physics)), 'picked: ' + c[0], got && got.kind + ' ' + JSON.stringify(got.fields));
});

// selected on a page: the physics before the maths
(function () {
    [['4k7 || 10k', 'network'], ['brown black red gold', 'bands'], ['-30 dBm', 'level'], ['4R7', 'smd'], ['473', 'whole'], ['12 × 7 + 3', 'sum'], ['hello world', null]].forEach(function (c) {
        var got = PageMaths.selected(c[0], 'mdy');
        check((got ? got.kind : null) === c[1], 'selected: ' + c[0], got && got.kind);
    });
})();

// the tips, worked out by physics.js
(function () {
    var tip = function (text) { return PhysPage.tip(PhysPage.find(text)[0], Physics); };
    var row = function (t, name) { return (t.rows.filter(function (r) { return r[0] === name; })[0] || [])[1]; };
    var t = tip('4.7 kΩ ∥ 10 kΩ');
    check(t.title === '4.7 kΩ ∥ 10 kΩ' && t.lines[0] === '= 3.197 kΩ' && row(t, 'Of') === 'Resistors' && row(t, 'E12, nearest') === '3.3 kΩ', 'tip: 4.7 kΩ ∥ 10 kΩ', JSON.stringify(t));
    t = tip('The network 100 + 220 || 330');
    check(t.title === '100 + 220 ∥ 330' && t.lines[0] === '= 232 Ω' && row(t, 'Parts') === '3' && row(t, 'E24, nearest') === '240 Ω', 'tip: 100 + 220 || 330', JSON.stringify(t));
    t = tip('10 µF || 22 µF');
    check(t.lines[0] === '= 32 µF' && row(t, 'Of') === 'Capacitors' && !row(t, 'E12, nearest') && /Capacitors in parallel add up/.test(t.note), 'tip: capacitors add in parallel', JSON.stringify(t));
    t = tip('yellow violet red gold resistor');
    check(t.title === 'Yellow Violet Red Gold' && t.lines[0] === '4.7 kΩ ± 5%' && row(t, 'From') === '4.465 kΩ' && row(t, 'To') === '4.935 kΩ' && !t.note, 'tip: 4.7 kΩ', JSON.stringify(t));
    t = tip('resistor: gold red violet yellow');
    check(t.title === 'Yellow Violet Red Gold' && /other end/.test(t.note), 'tip: read from its other end', JSON.stringify(t));
    t = tip('resistor: red red brown');
    check(t.lines[0] === '220 Ω ± 20%' && /three bands/.test(t.note), 'tip: three bands, 20%', JSON.stringify(t));
    t = tip('resistor: brown black black red brown red');
    check(t.lines[0] === '10 kΩ ± 1%' && row(t, 'Coefficient') === '50 ppm/K', 'tip: six bands, its coefficient', JSON.stringify(t));
    t = tip('-30 dBm');
    check(t.title === '–30 dBm' && t.lines[0] === '1 µW' && row(t, 'dBW') === '–60' && row(t, 'Across 50 Ω') === '7.071 mV RMS', 'tip: –30 dBm', JSON.stringify(t));
    t = tip('resistor marked 473');
    check(t.title === '473' && t.lines[0] === '47 kΩ ± 5%' && row(t, 'Code of') === '3 digits' && /last digit is the power of 10/.test(t.note), 'tip: SMD 473', JSON.stringify(t));
    t = tip('resistor marked 01C');
    check(t.lines[0] === '10 kΩ ± 1%' && row(t, 'Code of') === 'EIA-96', 'tip: SMD 01C of EIA-96', JSON.stringify(t));
    t = tip('a 4R7 resistor');
    check(t.lines[0] === '4.7 Ω ± 5%' && /R is where the point is/.test(t.note), 'tip: SMD 4R7', JSON.stringify(t));
    t = tip('20 dBV');
    check(t.lines[0] === '10 V RMS' && row(t, 'dBµV') === '140' && row(t, 'Peak') === '14.14 V', 'tip: 20 dBV', JSON.stringify(t));
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
