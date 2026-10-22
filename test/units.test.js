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
    ['Fuel economy', 'miles per gallon (UK)', 'miles per gallon (US)', 1, 0.83267418, 1e-8],
    ['Length', 'astronomical units', 'kilometers', 1, 149597870.7],
    ['Length', 'light-years', 'astronomical units', 1, 63241.077, 1e-8],
    ['Length', 'parsecs', 'light-years', 1, 3.26156378, 1e-8],
    ['Length', 'micrometers', 'angstroms', 1, 10000],
    ['Mass', 'carats', 'grams', 5, 1],
    ['Time', 'microseconds', 'nanoseconds', 1, 1000],
    ['Pressure', 'atmospheres', 'torr', 1, 760],
    ['Energy', 'megajoules', 'kilowatt-hours', 3.6, 1],
    ['Force', 'pounds-force', 'newtons', 1, 4.4482216152605],
    ['Force', 'kilograms-force', 'newtons', 1, 9.80665],
    ['Force', 'newtons', 'dynes', 1, 100000],
    ['Torque', 'pound-feet', 'newton meters', 1, 1.3558179483314],
    ['Torque', 'pound-feet', 'pound-inches', 1, 12],
    ['Density', 'grams per cubic centimeter', 'kilograms per cubic meter', 1, 1000],
    ['Density', 'pounds per cubic foot', 'kilograms per cubic meter', 1, 16.01846337396, 1e-11],
    ['Frequency', 'revolutions per minute', 'hertz', 60, 1],
    ['Frequency', 'hertz', 'radians per second', 1, 2 * Math.PI],
    ['Acceleration', 'standard gravity', 'feet per second squared', 1, 32.17404855643, 1e-11],
    ['Flow rate', 'cubic meters per hour', 'liters per minute', 6, 100],
    ['Flow rate', 'gallons per minute (US)', 'liters per minute', 1, 3.785411784],
    ['Electric current', 'amperes', 'milliamperes', 1.5, 1500],
    ['Voltage', 'kilovolts', 'volts', 11, 11000],
    ['Electric charge', 'ampere-hours', 'coulombs', 1, 3600],
    ['Electric charge', 'coulombs', 'elementary charges', 1, 6.241509074e18, 1e-9],
    ['Resistance', 'kiloohms', 'ohms', 4.7, 4700],
    ['Capacitance', 'microfarads', 'nanofarads', 2.2, 2200],
    ['Capacitance', 'picofarads', 'farads', 100, 1e-10],
    ['Inductance', 'millihenries', 'microhenries', 10, 10000],
    ['Magnetic field', 'gauss', 'microteslas', 0.5, 50],
    ['Magnetic field', 'teslas', 'gauss', 1, 10000],
    ['Momentum', 'gram centimeters per second', 'kilogram meters per second', 1e5, 1],
    ['Momentum', 'pound feet per second', 'newton seconds', 1, 0.138254954376],
    ['Radioactivity', 'curies', 'gigabecquerels', 1, 37],
    ['Radioactivity', 'microcuries', 'kilobecquerels', 1, 37],
    ['Absorbed dose', 'rads', 'grays', 100, 1],
    ['Equivalent dose', 'rems', 'millisieverts', 1, 10],
    ['Molarity', 'millimolar', 'nanomolar', 1, 1e6],
    ['Mass concentration', 'nanograms per microliter', 'micrograms per milliliter', 1, 1],
    ['Mass concentration', 'percent, weight in volume', 'grams per liter', 0.9, 9],
    ['Mass concentration', 'milligrams per deciliter', 'milligrams per liter', 1, 10],
    ['Amount of substance', 'picomoles', 'molecules', 1, 6.02214076e11],
    ['Molecular mass', 'kilodaltons', 'grams per mole', 66.5, 66500],
    ['Sequence length', 'kilobases', 'codons', 3, 1000],
    ['Enzyme activity', 'katals', 'units', 1, 6e7],
    ['Enzyme activity', 'units', 'nanokatals', 1, 1e3 / 60],
    ['Count per volume', 'per microliter', 'per milliliter', 5, 5000]
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
