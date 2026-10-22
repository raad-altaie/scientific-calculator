// The units of the converter panel.
// A group: c its name, list its units. A unit: s its symbol (HTML), t its name, f how
// many of the group's first unit one of it is; or, for a scale that does not start at 0,
// to and from: the group's first unit from a value in it, and back. Exact where the
// unit is defined exactly (the inch is 2.54 cm, the pound 0.45359237 kg); US measures
// of volume are the US ones. dms: shown in degrees, minutes and seconds
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
                { s: 'nmi', t: 'nautical miles', f: 1852 },
                { s: 'µm', t: 'micrometers', f: 1e-6 },
                { s: 'nm', t: 'nanometers', f: 1e-9 },
                { s: 'Å', t: 'angstroms', f: 1e-10 },
                { s: 'au', t: 'astronomical units', f: 149597870700 },
                { s: 'ly', t: 'light-years', f: 9460730472580800 },
                { s: 'pc', t: 'parsecs', f: 149597870700 * 648000 / Math.PI }
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
                { s: 'ton', t: 'short tons (US)', f: 907.18474 },
                { s: 'µg', t: 'micrograms', f: 1e-9 },
                { s: 'ct', t: 'carats', f: 0.0002 }
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
                { s: 'yr', t: 'years (365.25 days)', f: 31557600 },
                { s: 'µs', t: 'microseconds', f: 1e-6 },
                { s: 'ns', t: 'nanoseconds', f: 1e-9 }
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
                { s: 'inHg', t: 'inches of mercury', f: 3386.388640341 },
                { s: 'MPa', t: 'megapascals', f: 1e6 },
                { s: 'Torr', t: 'torr', f: 101325 / 760 }
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
                { s: 'eV', t: 'electronvolts', f: 1.602176634e-19 },
                { s: 'MJ', t: 'megajoules', f: 1e6 }
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
                { s: '°′″', t: 'degrees, minutes, seconds', f: 1, dms: true }, // shown 36°52′11.63″
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
        },
        {
            // the pound-force and the kilogram-force are the pound and the kilogram under standard gravity, 9.80665 m/s²
            c: 'Force', list: [
                { s: 'N', t: 'newtons', f: 1 },
                { s: 'kN', t: 'kilonewtons', f: 1000 },
                { s: 'mN', t: 'millinewtons', f: 0.001 },
                { s: 'dyn', t: 'dynes', f: 1e-5 },
                { s: 'kgf', t: 'kilograms-force', f: 9.80665 },
                { s: 'lbf', t: 'pounds-force', f: 0.45359237 * 9.80665 },
                { s: 'ozf', t: 'ounces-force', f: 0.028349523125 * 9.80665 }
            ]
        },
        {
            c: 'Torque', list: [
                { s: 'N·m', t: 'newton meters', f: 1 },
                { s: 'N·cm', t: 'newton centimeters', f: 0.01 },
                { s: 'kN·m', t: 'kilonewton meters', f: 1000 },
                { s: 'kgf·m', t: 'kilogram-force meters', f: 9.80665 },
                { s: 'lbf·ft', t: 'pound-feet', f: 0.45359237 * 9.80665 * 0.3048 },
                { s: 'lbf·in', t: 'pound-inches', f: 0.45359237 * 9.80665 * 0.0254 },
                { s: 'ozf·in', t: 'ounce-inches', f: 0.028349523125 * 9.80665 * 0.0254 }
            ]
        },
        {
            c: 'Density', list: [
                { s: 'kg/m<sup>3</sup>', t: 'kilograms per cubic meter', f: 1 },
                { s: 'g/cm<sup>3</sup>', t: 'grams per cubic centimeter', f: 1000 },
                { s: 'g/mL', t: 'grams per milliliter', f: 1000 },
                { s: 'g/L', t: 'grams per liter', f: 1 },
                { s: 'kg/L', t: 'kilograms per liter', f: 1000 },
                { s: 'lb/ft<sup>3</sup>', t: 'pounds per cubic foot', f: 0.45359237 / 0.028316846592 },
                { s: 'lb/in<sup>3</sup>', t: 'pounds per cubic inch', f: 0.45359237 / 0.000016387064 },
                { s: 'lb/gal', t: 'pounds per gallon (US)', f: 0.45359237 / 0.003785411784 }
            ]
        },
        {
            c: 'Frequency', list: [
                { s: 'Hz', t: 'hertz', f: 1 },
                { s: 'kHz', t: 'kilohertz', f: 1e3 },
                { s: 'MHz', t: 'megahertz', f: 1e6 },
                { s: 'GHz', t: 'gigahertz', f: 1e9 },
                { s: 'rpm', t: 'revolutions per minute', f: 1 / 60 },
                { s: 'rad/s', t: 'radians per second', f: 1 / (2 * Math.PI) }
            ]
        },
        {
            c: 'Acceleration', list: [
                { s: 'm/s<sup>2</sup>', t: 'meters per second squared', f: 1 },
                { s: 'cm/s<sup>2</sup>', t: 'centimeters per second squared', f: 0.01 },
                { s: 'ft/s<sup>2</sup>', t: 'feet per second squared', f: 0.3048 },
                { s: 'in/s<sup>2</sup>', t: 'inches per second squared', f: 0.0254 },
                { s: 'g₀', t: 'standard gravity', f: 9.80665 }
            ]
        },
        {
            c: 'Flow rate', list: [
                { s: 'L/s', t: 'liters per second', f: 1 },
                { s: 'L/min', t: 'liters per minute', f: 1 / 60 },
                { s: 'L/h', t: 'liters per hour', f: 1 / 3600 },
                { s: 'mL/min', t: 'milliliters per minute', f: 0.001 / 60 },
                { s: 'm<sup>3</sup>/s', t: 'cubic meters per second', f: 1000 },
                { s: 'm<sup>3</sup>/h', t: 'cubic meters per hour', f: 1000 / 3600 },
                { s: 'gal/min', t: 'gallons per minute (US)', f: 3.785411784 / 60 },
                { s: 'gal/h', t: 'gallons per hour (US)', f: 3.785411784 / 3600 },
                { s: 'ft<sup>3</sup>/min', t: 'cubic feet per minute', f: 28.316846592 / 60 },
                { s: 'ft<sup>3</sup>/s', t: 'cubic feet per second', f: 28.316846592 }
            ]
        },
        {
            c: 'Electric current', list: [
                { s: 'A', t: 'amperes', f: 1 },
                { s: 'mA', t: 'milliamperes', f: 0.001 },
                { s: 'µA', t: 'microamperes', f: 1e-6 },
                { s: 'kA', t: 'kiloamperes', f: 1000 }
            ]
        },
        {
            c: 'Voltage', list: [
                { s: 'V', t: 'volts', f: 1 },
                { s: 'mV', t: 'millivolts', f: 0.001 },
                { s: 'µV', t: 'microvolts', f: 1e-6 },
                { s: 'kV', t: 'kilovolts', f: 1000 },
                { s: 'MV', t: 'megavolts', f: 1e6 }
            ]
        },
        {
            // a battery's charge: mAh and Ah; e, the charge of one electron, exact since 2019
            c: 'Electric charge', list: [
                { s: 'C', t: 'coulombs', f: 1 },
                { s: 'mC', t: 'millicoulombs', f: 0.001 },
                { s: 'µC', t: 'microcoulombs', f: 1e-6 },
                { s: 'mAh', t: 'milliampere-hours', f: 3.6 },
                { s: 'Ah', t: 'ampere-hours', f: 3600 },
                { s: 'e', t: 'elementary charges', f: 1.602176634e-19 }
            ]
        },
        {
            c: 'Resistance', list: [
                { s: 'Ω', t: 'ohms', f: 1 },
                { s: 'mΩ', t: 'milliohms', f: 0.001 },
                { s: 'kΩ', t: 'kiloohms', f: 1e3 },
                { s: 'MΩ', t: 'megaohms', f: 1e6 },
                { s: 'GΩ', t: 'gigaohms', f: 1e9 }
            ]
        },
        {
            c: 'Capacitance', list: [
                { s: 'F', t: 'farads', f: 1 },
                { s: 'mF', t: 'millifarads', f: 0.001 },
                { s: 'µF', t: 'microfarads', f: 1e-6 },
                { s: 'nF', t: 'nanofarads', f: 1e-9 },
                { s: 'pF', t: 'picofarads', f: 1e-12 }
            ]
        },
        {
            c: 'Inductance', list: [
                { s: 'H', t: 'henries', f: 1 },
                { s: 'mH', t: 'millihenries', f: 0.001 },
                { s: 'µH', t: 'microhenries', f: 1e-6 },
                { s: 'nH', t: 'nanohenries', f: 1e-9 }
            ]
        },
        {
            // the gauss of the CGS units is 10⁻⁴ tesla; the Earth's field is about 50 µT, half a gauss
            c: 'Magnetic field', list: [
                { s: 'T', t: 'teslas', f: 1 },
                { s: 'mT', t: 'milliteslas', f: 0.001 },
                { s: 'µT', t: 'microteslas', f: 1e-6 },
                { s: 'nT', t: 'nanoteslas', f: 1e-9 },
                { s: 'G', t: 'gauss', f: 1e-4 },
                { s: 'mG', t: 'milligauss', f: 1e-7 }
            ]
        },
        {
            // a quantity of motion, mass times speed
            c: 'Momentum', list: [
                { s: 'kg·m/s', t: 'kilogram meters per second', f: 1 },
                { s: 'g·cm/s', t: 'gram centimeters per second', f: 1e-5 },
                { s: 'N·s', t: 'newton seconds', f: 1 },
                { s: 'lb·ft/s', t: 'pound feet per second', f: 0.45359237 * 0.3048 },
                { s: 'eV/c', t: 'electronvolts over c', f: 1.602176634e-19 / 299792458 }
            ]
        },
        {
            // of a source: the becquerel is one decay each second; the curie is a gram of radium-226's, about
            c: 'Radioactivity', list: [
                { s: 'Bq', t: 'becquerels', f: 1 },
                { s: 'kBq', t: 'kilobecquerels', f: 1e3 },
                { s: 'MBq', t: 'megabecquerels', f: 1e6 },
                { s: 'GBq', t: 'gigabecquerels', f: 1e9 },
                { s: 'Ci', t: 'curies', f: 3.7e10 },
                { s: 'mCi', t: 'millicuries', f: 3.7e7 },
                { s: 'µCi', t: 'microcuries', f: 3.7e4 }
            ]
        },
        {
            // the energy radiation leaves in a kilogram: the gray, 1 J/kg; the rad of the CGS units a hundredth of it
            c: 'Absorbed dose', list: [
                { s: 'Gy', t: 'grays', f: 1 },
                { s: 'mGy', t: 'milligrays', f: 1e-3 },
                { s: 'µGy', t: 'micrograys', f: 1e-6 },
                { s: 'rad', t: 'rads', f: 0.01 },
                { s: 'mrad', t: 'millirads', f: 1e-5 }
            ]
        },
        {
            // a dose weighed by the harm of its radiation: the sievert; the rem a hundredth of it
            c: 'Equivalent dose', list: [
                { s: 'Sv', t: 'sieverts', f: 1 },
                { s: 'mSv', t: 'millisieverts', f: 1e-3 },
                { s: 'µSv', t: 'microsieverts', f: 1e-6 },
                { s: 'rem', t: 'rems', f: 0.01 },
                { s: 'mrem', t: 'millirems', f: 1e-5 }
            ]
        },
        {
            // of the lab: moles in a liter
            c: 'Molarity', list: [
                { s: 'M', t: 'molar', f: 1 },
                { s: 'mM', t: 'millimolar', f: 1e-3 },
                { s: 'µM', t: 'micromolar', f: 1e-6 },
                { s: 'nM', t: 'nanomolar', f: 1e-9 },
                { s: 'pM', t: 'picomolar', f: 1e-12 },
                { s: 'fM', t: 'femtomolar', f: 1e-15 }
            ]
        },
        {
            // a mass in a volume, as of DNA or a protein; 1% w/v is 1 g in 100 mL
            c: 'Mass concentration', list: [
                { s: 'g/L', t: 'grams per liter', f: 1 },
                { s: 'mg/mL', t: 'milligrams per milliliter', f: 1 },
                { s: 'µg/mL', t: 'micrograms per milliliter', f: 1e-3 },
                { s: 'ng/µL', t: 'nanograms per microliter', f: 1e-3 },
                { s: 'ng/mL', t: 'nanograms per milliliter', f: 1e-6 },
                { s: 'pg/mL', t: 'picograms per milliliter', f: 1e-9 },
                { s: 'mg/L', t: 'milligrams per liter', f: 1e-3 },
                { s: 'mg/dL', t: 'milligrams per deciliter', f: 1e-2 },
                { s: 'g/dL', t: 'grams per deciliter', f: 10 },
                { s: '% w/v', t: 'percent, weight in volume', f: 10 }
            ]
        },
        {
            // moles, and the molecules they are: a mole is Avogadro's number of them
            c: 'Amount of substance', list: [
                { s: 'mol', t: 'moles', f: 1 },
                { s: 'mmol', t: 'millimoles', f: 1e-3 },
                { s: 'µmol', t: 'micromoles', f: 1e-6 },
                { s: 'nmol', t: 'nanomoles', f: 1e-9 },
                { s: 'pmol', t: 'picomoles', f: 1e-12 },
                { s: 'fmol', t: 'femtomoles', f: 1e-15 },
                { s: 'molecules', t: 'molecules', f: 1 / 6.02214076e23 }
            ]
        },
        {
            // the mass of a molecule: a dalton is a twelfth of a carbon-12 atom's, as a gram a mole is
            c: 'Molecular mass', list: [
                { s: 'Da', t: 'daltons', f: 1 },
                { s: 'kDa', t: 'kilodaltons', f: 1e3 },
                { s: 'MDa', t: 'megadaltons', f: 1e6 },
                { s: 'g/mol', t: 'grams per mole', f: 1 },
                { s: 'u', t: 'unified atomic mass units', f: 1 }
            ]
        },
        {
            // the length of DNA or RNA, and of a protein's gene: a codon is 3 bases
            c: 'Sequence length', list: [
                { s: 'bp', t: 'base pairs', f: 1 },
                { s: 'kb', t: 'kilobases', f: 1e3 },
                { s: 'Mb', t: 'megabases', f: 1e6 },
                { s: 'Gb', t: 'gigabases', f: 1e9 },
                { s: 'codons', t: 'codons', f: 3 }
            ]
        },
        {
            // how fast an enzyme works: a unit, U, turns over a µmol a minute; the katal a mole a second
            c: 'Enzyme activity', list: [
                { s: 'U', t: 'units', f: 1 },
                { s: 'mU', t: 'milliunits', f: 1e-3 },
                { s: 'kat', t: 'katals', f: 6e7 },
                { s: 'µkat', t: 'microkatals', f: 60 },
                { s: 'nkat', t: 'nanokatals', f: 0.06 }
            ]
        },
        {
            // cells, colonies (CFU) or copies in a volume
            c: 'Count per volume', list: [
                { s: '/mL', t: 'per milliliter', f: 1 },
                { s: '/µL', t: 'per microliter', f: 1e3 },
                { s: '/L', t: 'per liter', f: 1e-3 },
                { s: '/mm<sup>3</sup>', t: 'per cubic millimeter', f: 1e3 },
                { s: '/m<sup>3</sup>', t: 'per cubic meter', f: 1e-6 }
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
