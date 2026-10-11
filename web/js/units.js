// The units of the converter panel.
// A group: c its name, list its units. A unit: s its symbol (HTML), t its name, f how
// many of the group's first unit one of it is; or, for a scale that does not start at 0,
// to and from: the group's first unit from a value in it, and back. Exact where the
// unit is defined exactly (the inch is 2.54 cm, the pound 0.45359237 kg); US measures
// of volume are the US ones
(function (root) {
    'use strict';

    var units = [
        {
            c: 'Length', list: [
                { s: 'm', t: 'meters', f: 1 },
                { s: 'mm', t: 'millimeters', f: 0.001 },
                { s: 'cm', t: 'centimeters', f: 0.01 },
                { s: 'km', t: 'kilometers', f: 1000 },
                { s: 'in', t: 'inches', f: 0.0254 },
                { s: 'ft', t: 'feet', f: 0.3048 },
                { s: 'yd', t: 'yards', f: 0.9144 },
                { s: 'mi', t: 'miles', f: 1609.344 },
                { s: 'nmi', t: 'nautical miles', f: 1852 }
            ]
        },
        {
            c: 'Area', list: [
                { s: 'm<sup>2</sup>', t: 'square meters', f: 1 },
                { s: 'cm<sup>2</sup>', t: 'square centimeters', f: 1e-4 },
                { s: 'km<sup>2</sup>', t: 'square kilometers', f: 1e6 },
                { s: 'ha', t: 'hectares', f: 1e4 },
                { s: 'in<sup>2</sup>', t: 'square inches', f: 0.00064516 },
                { s: 'ft<sup>2</sup>', t: 'square feet', f: 0.09290304 },
                { s: 'yd<sup>2</sup>', t: 'square yards', f: 0.83612736 },
                { s: 'ac', t: 'acres', f: 4046.8564224 },
                { s: 'mi<sup>2</sup>', t: 'square miles', f: 2589988.110336 }
            ]
        },
        {
            c: 'Volume', list: [
                { s: 'L', t: 'liters', f: 1 },
                { s: 'mL', t: 'milliliters', f: 0.001 },
                { s: 'm<sup>3</sup>', t: 'cubic meters', f: 1000 },
                { s: 'tsp', t: 'teaspoons (US)', f: 0.00492892159375 },
                { s: 'tbsp', t: 'tablespoons (US)', f: 0.01478676478125 },
                { s: 'fl oz', t: 'fluid ounces (US)', f: 0.0295735295625 },
                { s: 'cup', t: 'cups (US)', f: 0.2365882365 },
                { s: 'pt', t: 'pints (US)', f: 0.473176473 },
                { s: 'qt', t: 'quarts (US)', f: 0.946352946 },
                { s: 'gal', t: 'gallons (US)', f: 3.785411784 },
                { s: 'gal', t: 'gallons (UK)', f: 4.54609 },
                { s: 'in<sup>3</sup>', t: 'cubic inches', f: 0.016387064 },
                { s: 'ft<sup>3</sup>', t: 'cubic feet', f: 28.316846592 }
            ]
        },
        {
            c: 'Mass', list: [
                { s: 'kg', t: 'kilograms', f: 1 },
                { s: 'mg', t: 'milligrams', f: 1e-6 },
                { s: 'g', t: 'grams', f: 0.001 },
                { s: 't', t: 'tonnes', f: 1000 },
                { s: 'oz', t: 'ounces', f: 0.028349523125 },
                { s: 'lb', t: 'pounds', f: 0.45359237 },
                { s: 'st', t: 'stones', f: 6.35029318 },
                { s: 'ton', t: 'short tons (US)', f: 907.18474 }
            ]
        },
        {
            c: 'Temperature', list: [
                { s: '°C', t: 'Celsius', f: 1 },
                {
                    s: '°F', t: 'Fahrenheit',
                    to: function (x) { return (x - 32) * 5 / 9; },
                    from: function (x) { return x * 9 / 5 + 32; }
                },
                {
                    s: 'K', t: 'kelvin',
                    to: function (x) { return x - 273.15; },
                    from: function (x) { return x + 273.15; }
                }
            ]
        },
        {
            c: 'Speed', list: [
                { s: 'km/h', t: 'kilometers per hour', f: 1 },
                { s: 'm/s', t: 'meters per second', f: 3.6 },
                { s: 'mph', t: 'miles per hour', f: 1.609344 },
                { s: 'kn', t: 'knots', f: 1.852 },
                { s: 'ft/s', t: 'feet per second', f: 1.09728 }
            ]
        },
        {
            c: 'Time', list: [
                { s: 's', t: 'seconds', f: 1 },
                { s: 'ms', t: 'milliseconds', f: 0.001 },
                { s: 'min', t: 'minutes', f: 60 },
                { s: 'h', t: 'hours', f: 3600 },
                { s: 'd', t: 'days', f: 86400 },
                { s: 'wk', t: 'weeks', f: 604800 },
                { s: 'yr', t: 'years (365.25 days)', f: 31557600 }
            ]
        },
        {
            c: 'Data', list: [
                { s: 'B', t: 'bytes', f: 1 },
                { s: 'bit', t: 'bits', f: 0.125 },
                { s: 'kB', t: 'kilobytes', f: 1e3 },
                { s: 'MB', t: 'megabytes', f: 1e6 },
                { s: 'GB', t: 'gigabytes', f: 1e9 },
                { s: 'TB', t: 'terabytes', f: 1e12 },
                { s: 'KiB', t: 'kibibytes', f: 1024 },
                { s: 'MiB', t: 'mebibytes', f: 1048576 },
                { s: 'GiB', t: 'gibibytes', f: 1073741824 },
                { s: 'TiB', t: 'tebibytes', f: 1099511627776 }
            ]
        },
        {
            c: 'Pressure', list: [
                { s: 'Pa', t: 'pascals', f: 1 },
                { s: 'kPa', t: 'kilopascals', f: 1000 },
                { s: 'bar', t: 'bars', f: 1e5 },
                { s: 'atm', t: 'atmospheres', f: 101325 },
                { s: 'psi', t: 'pounds per square inch', f: 6894.757293168361 },
                { s: 'mmHg', t: 'millimeters of mercury', f: 133.322387415 },
                { s: 'inHg', t: 'inches of mercury', f: 3386.388640341 }
            ]
        },
        {
            c: 'Energy', list: [
                { s: 'J', t: 'joules', f: 1 },
                { s: 'kJ', t: 'kilojoules', f: 1000 },
                { s: 'cal', t: 'calories', f: 4.184 },
                { s: 'kcal', t: 'kilocalories (food Calories)', f: 4184 },
                { s: 'Wh', t: 'watt-hours', f: 3600 },
                { s: 'kWh', t: 'kilowatt-hours', f: 3.6e6 },
                { s: 'BTU', t: 'British thermal units', f: 1055.05585262 },
                { s: 'eV', t: 'electronvolts', f: 1.602176634e-19 }
            ]
        },
        {
            c: 'Power', list: [
                { s: 'W', t: 'watts', f: 1 },
                { s: 'kW', t: 'kilowatts', f: 1000 },
                { s: 'hp', t: 'horsepower', f: 745.6998715822702 },
                { s: 'PS', t: 'metric horsepower', f: 735.49875 },
                { s: 'BTU/h', t: 'BTU per hour', f: 0.29307107017222 }
            ]
        },
        {
            c: 'Angle', list: [
                { s: '°', t: 'degrees', f: 1 },
                { s: 'rad', t: 'radians', f: 180 / Math.PI },
                { s: 'grad', t: 'gradians', f: 0.9 },
                { s: '′', t: 'arcminutes', f: 1 / 60 },
                { s: '″', t: 'arcseconds', f: 1 / 3600 },
                { s: 'turn', t: 'turns', f: 360 }
            ]
        },
        {
            // more fuel per distance is fewer distance per fuel: these go one over the other
            c: 'Fuel economy', list: [
                { s: 'km/L', t: 'kilometers per liter', f: 1 },
                {
                    s: 'L/100 km', t: 'liters per 100 km',
                    to: function (x) { return 100 / x; },
                    from: function (x) { return 100 / x; }
                },
                { s: 'mpg', t: 'miles per gallon (US)', f: 1.609344 / 3.785411784 },
                { s: 'mpg', t: 'miles per gallon (UK)', f: 1.609344 / 4.54609 }
            ]
        }
    ];

    // a value in unit a of group g, in unit b; NaN when it has none, as 0 L/100 km in km/L
    function convert(g, a, b, x) {
        var from = units[g].list[a], to = units[g].list[b],
            y = from.to ? from.to(x) : x * from.f;
        y = to.from ? to.from(y) : y / to.f;
        return isFinite(y) ? y : NaN;
    }

    root.CalcUnits = { units: units, convert: convert };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcUnits;
    }
})(typeof window !== 'undefined' ? window : this);
