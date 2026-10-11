// Run with: node test/units.test.js
// The units of the converter: known values in each group, the way back to where a
// value started, and values with no answer
'use strict';

var Units = require('../js/units.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

// a value in a unit of a group, both by name: 'Length', 'miles'
function convert(group, from, to, x) {
    var g = Units.units.map(function (u) { return u.c; }).indexOf(group),
        names = g < 0 ? [] : Units.units[g].list.map(function (u) { return u.t; }),
        a = names.indexOf(from), b = names.indexOf(to);
    if (a < 0 || b < 0) throw new Error('no such unit: ' + group + ' ' + from + ' ' + to);
    return Units.convert(g, a, b, x);
}

// every group: a first unit of 1, names that are not repeated, a way to convert each
Units.units.forEach(function (group) {
    var names = group.list.map(function (u) { return u.t; });
    check(group.list[0].f === 1 && !group.list[0].to, group.c + ': the first unit is the one the others are given in');
    check(names.every(function (n, i) { return names.indexOf(n) === i; }), group.c + ': each name once', names.join(', '));
    group.list.forEach(function (u) {
        check(u.f > 0 || (typeof u.to === 'function' && typeof u.from === 'function'), group.c + ' ' + u.t + ': a factor or to and from');
    });
});

// there and back gives the value it started with, from every unit to every other
Units.units.forEach(function (group, g) {
    group.list.forEach(function (a, i) {
        group.list.forEach(function (b, j) {
            [7.25, -3, 1e-5, 4.2e9].forEach(function (x) {
                var back = Units.convert(g, j, i, Units.convert(g, i, j, x));
                if (group.c === 'Fuel economy' && x < 0) return; // no fuel economy below 0
                // 1e-12: a scale that starts elsewhere, as °F, loses digits near 0
                check(Math.abs(back - x) <= Math.max(1e-9 * Math.abs(x), 1e-12),
                    group.c + ': ' + x + ' ' + a.t + ' to ' + b.t + ' and back', back);
            });
        });
    });
});

[
    ['Length', 'inches', 'centimeters', 1, 2.54],
    ['Length', 'miles', 'kilometers', 1, 1.609344],
    ['Length', 'feet', 'inches', 1, 12],
    ['Length', 'nautical miles', 'meters', 1, 1852],
    ['Length', 'yards', 'feet', 1, 3],
    ['Area', 'acres', 'square feet', 1, 43560],
    ['Area', 'square miles', 'acres', 1, 640],
    ['Area', 'hectares', 'square meters', 1, 10000],
    ['Volume', 'gallons (US)', 'cubic inches', 1, 231],
    ['Volume', 'gallons (US)', 'quarts (US)', 1, 4],
    ['Volume', 'cups (US)', 'fluid ounces (US)', 1, 8],
    ['Volume', 'tablespoons (US)', 'teaspoons (US)', 1, 3],
    ['Volume', 'gallons (UK)', 'liters', 1, 4.54609],
    ['Volume', 'cubic meters', 'liters', 1, 1000],
    ['Mass', 'pounds', 'ounces', 1, 16],
    ['Mass', 'stones', 'pounds', 1, 14],
    ['Mass', 'short tons (US)', 'pounds', 1, 2000],
    ['Mass', 'pounds', 'kilograms', 1, 0.45359237],
    ['Temperature', 'Celsius', 'Fahrenheit', 100, 212],
    ['Temperature', 'Fahrenheit', 'Celsius', -40, -40],
    ['Temperature', 'kelvin', 'Celsius', 0, -273.15],
    ['Temperature', 'Fahrenheit', 'kelvin', 32, 273.15],
    ['Speed', 'meters per second', 'kilometers per hour', 10, 36],
    ['Speed', 'miles per hour', 'feet per second', 15, 22],
    ['Speed', 'knots', 'kilometers per hour', 1, 1.852],
    ['Time', 'days', 'hours', 1, 24],
    ['Time', 'weeks', 'minutes', 1, 10080],
    ['Time', 'years (365.25 days)', 'days', 1, 365.25],
    ['Data', 'bytes', 'bits', 1, 8],
    ['Data', 'gibibytes', 'mebibytes', 1, 1024],
    ['Data', 'gigabytes', 'megabytes', 1, 1000],
    ['Data', 'tebibytes', 'gigabytes', 1, 1099.511627776],
    ['Pressure', 'atmospheres', 'kilopascals', 1, 101.325],
    ['Pressure', 'millimeters of mercury', 'pascals', 1, 133.322387415], // not the torr: 1 atm is 760 torr, 759.9999 mmHg
    ['Pressure', 'bars', 'pounds per square inch', 1, 14.503773773, 1e-10],
    ['Energy', 'kilocalories (food Calories)', 'kilojoules', 1, 4.184],
    ['Energy', 'kilowatt-hours', 'joules', 1, 3.6e6],
    ['Energy', 'electronvolts', 'joules', 1, 1.602176634e-19],
    ['Energy', 'British thermal units', 'joules', 1, 1055.05585262],
    ['Power', 'horsepower', 'watts', 1, 745.69987158227],
    ['Power', 'kilowatts', 'BTU per hour', 1, 3412.14163312794],
    ['Angle', 'turns', 'degrees', 1, 360],
    ['Angle', 'radians', 'degrees', Math.PI, 180],
    ['Angle', 'degrees', 'arcminutes', 1, 60],
    ['Angle', 'gradians', 'degrees', 100, 90],
    ['Fuel economy', 'liters per 100 km', 'kilometers per liter', 8, 12.5],
    ['Fuel economy', 'miles per gallon (US)', 'liters per 100 km', 30, 7.84049, 1e-6],
    ['Fuel economy', 'miles per gallon (UK)', 'miles per gallon (US)', 1, 0.83267418, 1e-8]
].forEach(function (c) {
    var got = convert(c[0], c[1], c[2], c[3]);
    // a value written to fewer digits is checked to them
    check(Math.abs(got - c[4]) <= (c[5] || 1e-12) * Math.abs(c[4]), c[0] + ': ' + c[3] + ' ' + c[1] + ' is ' + c[4] + ' ' + c[2], got);
});

// no answer: NaN, not Infinity
check(isNaN(convert('Fuel economy', 'liters per 100 km', 'kilometers per liter', 0)), 'Fuel economy: 0 L/100 km has no km/L');
check(isNaN(convert('Length', 'meters', 'feet', NaN)), 'NaN stays NaN');
check(convert('Fuel economy', 'kilometers per liter', 'miles per gallon (US)', 0) === 0, 'Fuel economy: 0 km/L is 0 mpg');

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exitCode = failures ? 1 : 0;
