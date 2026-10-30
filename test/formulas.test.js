// Run with: node test/formulas.test.js
// Each formula's example goes into the calculator as the f(x) panel puts it in,
// and must give the result its tip promises
'use strict';

var Engine = require('../js/engine.js'),
    Formulas = require('../js/formulas.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail ? '\n      ' + detail : ''));
    }
}

function close(actual, expected) {
    return Math.abs(actual - expected) <= 1e-6 * Math.max(1, Math.abs(expected)) ||
        Math.abs(actual - expected) <= 1e-6 * Math.abs(expected); // tiny numbers: relative only
}

Formulas.formulas.forEach(function (group) {
    group.list.forEach(function (f) {
        var keys = f.v.map(function (v) { return v[0]; }),
            used = (f.x.match(/\{\w+\}/g) || []).map(function (k) { return k.slice(1, -1); }),
            s = Formulas.fill(f, f.ex[0], !!f.deg),
            e = new Engine();

        check(keys.every(function (k) { return used.indexOf(k) > -1; }) &&
            used.every(function (k) { return keys.indexOf(k) > -1; }), f.t + ': letters', keys + ' / ' + used);
        check(f.ex[0].length === keys.length, f.t + ': example has a value for each letter');
        check(Formulas.fill(f, f.ex[0].slice(1)) === null, f.t + ': a missing value gives nothing');
        e.fnFirst = true;
        check(e.paste(s, !!f.deg), f.t + ': pasted', s);
        e.press('=', !!f.deg);
        check(!e.error && close(+e.value, f.ex[1]), f.t + ': ' + s, 'gave ' + e.value + ', not ' + f.ex[1]);
        if (f.rad) { // the same in radians, the angle turned by hand
            e = new Engine();
            e.paste(Formulas.fill(f, f.ex[0].map(function (x, i) {
                return f.rad.indexOf(keys[i]) > -1 ? x * Math.PI / 180 : x;
            }), false), false);
            e.press('=', false);
            check(close(+e.value, f.ex[1]), f.t + ': in radians', 'gave ' + e.value);
            e = new Engine(); // and in gradians, the angle turned by hand: 90° is 100 grad
            e.paste(Formulas.fill(f, f.ex[0].map(function (x, i) {
                return f.rad.indexOf(keys[i]) > -1 ? x * 10 / 9 : x;
            }), 2), 2);
            e.press('=', 2);
            check(close(+e.value, f.ex[1]), f.t + ': in gradians', 'gave ' + e.value);
        }
    });
});

// values with no answer give an Error, which the panel tells of before it puts them in
[[0, [2, 1, 4]], [0, [1, 2, 1]]].forEach(function (c, n) {
    var f = Formulas.formulas[0].list[c[0]], e = new Engine();
    e.paste(Formulas.fill(f, c[1]), false);
    if (!e.error) e.press('=', false);
    check(n ? !e.error && +e.value === -1 : e.error, f.t + ' ' + c[1] + (n ? ': one root, -1' : ': no real roots, an Error'));
});
Formulas.formulas.forEach(function (group) {
    group.list.forEach(function (f) {
        check(!f.no || typeof f.no === 'string', f.t + ': says why there is no answer');
    });
});

// the rules name letters of their formula, and say what is wrong with the values
Formulas.formulas.forEach(function (group) {
    group.list.forEach(function (f) {
        ['zero', 'pos', 'neg'].forEach(function (r) {
            (f[r] || []).forEach(function (rule) {
                var key = [].concat(rule)[0];
                check(f.v.some(function (v) { return v[0] === key; }), f.t + ': ' + r + ' ' + key + ' is one of its letters');
            });
        });
    });
});
(function () {
    function find(t) {
        return [].concat.apply([], Formulas.formulas.map(function (g) { return g.list; })).filter(function (f) { return f.t === t; })[0];
    }
    [['Speed', ['3', '0'], 't</i> (time) cannot be 0.'],
        ['Pendulum period', ['-1'], 'cannot be below 0.'],
        ['Quadratic formula (+)', ['0', '1', '2'], 'cannot be 0.'],
        ['Quadratic formula (+)', ['2', '1', '4'], 'No real roots'],
        ['Loan payment', ['1000', '0', '5'], 'At 0%'],
        ['Loan payment', ['1000', '5', '0'], 'y</i> (years) cannot be 0.'],
        ['Area of a circle', ['1e200'], 'too large to show'],
        ['Logarithm to any base', ['8', '1'], 'b cannot be 1']
    ].forEach(function (c) {
        var said = Formulas.why(find(c[0]), c[1]);
        check(said.indexOf(c[2]) > -1, c[0] + ' ' + c[1] + ': says ' + c[2], said);
    });
})();

// Awkward values in every formula, in Deg and Rad: each goes into the calculator,
// and when it has no answer there is a note to say why
(function () {
    var VALS = ['0', '1', '-1', '0.5', '-2.5', '1e-7', '1e6', '90', '180', '-30', '1/3', '2e1', '1,5', '-100', '1e200'],
        seed = 3, tried = 0, none = 0;
    function rnd() {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    }
    Formulas.formulas.forEach(function (group) {
        group.list.forEach(function (f) {
            for (var i = 0; i < 300; i++) {
                var vals = f.v.map(function () { return VALS[Math.floor(rnd() * VALS.length)]; }),
                    deg = rnd() < 0.5, e = new Engine(), s = Formulas.fill(f, vals, deg);
                e.fnFirst = rnd() < 0.5;
                tried++;
                if (!e.paste(s, deg)) {
                    check(false, f.t + ' ' + vals.join(' | ') + ': goes in', s);
                    continue;
                }
                if (!e.error) e.press('=', deg);
                if (e.error) {
                    none++;
                    check(/\w/.test(Formulas.why(f, vals)), f.t + ' ' + vals.join(' | ') + ': a note says why');
                }
            }
        });
    });
    check(tried > 30000 && none > 1000, 'awkward values: ' + tried + ' tried, ' + none + ' with no answer');
})();

// the values the panel takes: negative, with an exponent, an equation, a comma
(function () {
    var f = Formulas.formulas[1].list[0]; // area of a circle, pi*{r}^2
    [['-2', 4 * Math.PI], ['2e1', 400 * Math.PI], ['1/2', Math.PI / 4], ['1,5', 2.25 * Math.PI]].forEach(function (c) {
        var e = new Engine(), s = Formulas.fill(f, [c[0]]);
        e.paste(s, false);
        e.press('=', false);
        check(close(+e.value, c[1]), 'circle, r = ' + c[0], s + ' gave ' + e.value);
    });
})();

// a formula's card of the Physics panel: its boxes of the formula's own letters, and every formula named in it found
(function () {
    var linked = 0;
    Formulas.formulas.forEach(function (group) {
        group.list.forEach(function (f) {
            var letters = f.v.map(function (v) { return v[0]; });
            if (!f.p) return;
            linked++;
            check(typeof f.p[0] === 'string' && Object.keys(f.p[1]).length && Object.keys(f.p[1]).every(function (k) { return letters.indexOf(k) > -1; }),
                f.t + ': In Physics of its own letters', JSON.stringify(f.p));
        });
    });
    check(linked === 55, 'In Physics: every formula named in it found', linked);
})();

// and of the Biology panel, the same
(function () {
    var linked = 0;
    Formulas.formulas.forEach(function (group) {
        group.list.forEach(function (f) {
            var letters = f.v.map(function (v) { return v[0]; });
            if (!f.b) return;
            linked++;
            check(typeof f.b[0] === 'string' && Object.keys(f.b[1]).length && Object.keys(f.b[1]).every(function (k) { return letters.indexOf(k) > -1; }),
                f.t + ': In Biology of its own letters', JSON.stringify(f.b));
        });
    });
    check(linked === 31, 'In Biology: every formula named in it found', linked);
})();

// and of the solver's Finance tab, the same
(function () {
    var linked = 0;
    Formulas.formulas.forEach(function (group) {
        group.list.forEach(function (f) {
            var letters = f.v.map(function (v) { return v[0]; });
            if (!f.fin) return;
            linked++;
            check(typeof f.fin[0] === 'string' && Object.keys(f.fin[1]).length && Object.keys(f.fin[1]).every(function (k) { return letters.indexOf(k) > -1; }),
                f.t + ': In Finance of its own letters', JSON.stringify(f.fin));
        });
    });
    check(linked === 5, 'In Finance: every formula named in it found', linked);
})();

Formulas.constants.forEach(function (group) {
    group.list.forEach(function (k) {
        check(isFinite(k.v) && typeof k.v === 'number', k.t + ': a number');
        check(new Engine().put(k.v), k.t + ': put in');
    });
});

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
