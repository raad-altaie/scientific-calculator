// What the keys above the digits do, for the tips shown while the pointer is
// over one. Keyed by a key's name as main.js reads it from its label, so a
// key turned by 2nd has the tip of its second function.
// t: name, d: what it does (HTML), first: the same while function keys go before their number,
// k: keyboard shortcut, second: the function 2nd gives it
(function (root) {
    'use strict';

    root.CalcTips = {
        '2nd': {
            t: '2nd',
            d: 'Switches sin, cos, tan, sinh, cosh, tanh, ln, e<sup>x</sup>, log, π and y<sup>x</sup> to their ' +
                'second functions: sin<sup>-1</sup> …, log<sub>2</sub>, 2<sup>x</sup>, 10<sup>x</sup>, e and ' +
                'log<sub>y</sub>. Click again to switch back.',
            k: 'Space'
        },
        'Deg': {
            t: 'Degrees',
            d: 'Works angles out in degrees: 30 sin = 0.5. The display shows the unit in use at its bottom left; ' +
                'click it there to switch as well.',
            first: 'Works angles out in degrees: sin 30 = 0.5. The display shows the unit in use at its bottom left; ' +
                'click it there to switch as well.',
            k: 'd'
        },
        'Rad': {
            t: 'Radians',
            d: 'Works angles out in radians: ( π ÷ 6 ) sin = 0.5. The display shows the unit in use at its bottom ' +
                'left; click it there to switch as well.',
            first: 'Works angles out in radians: sin π ÷ 6 = 0.5. The display shows the unit in use at its bottom ' +
                'left; click it there to switch as well.',
            k: 'd'
        },
        'Grad': {
            t: 'Gradians',
            d: 'Works angles out in gradians, 400 to a full turn: 100 sin = 1. The display shows the unit in use at ' +
                'its bottom left; click it there to switch as well.',
            first: 'Works angles out in gradians, 400 to a full turn: sin 100 = 1. The display shows the unit in use ' +
                'at its bottom left; click it there to switch as well.',
            k: 'd'
        },
        // the unit at the bottom left of the display
        'unit Rad': {
            t: 'Radians',
            d: 'Angles are in radians: a full turn is 2π (6.283…), so ( π ÷ 2 ) sin = 1. Click to switch to ' +
                'degrees, where a full turn is 360°.',
            first: 'Angles are in radians: a full turn is 2π (6.283…), so sin π ÷ 2 = 1. Click to switch to ' +
                'degrees, where a full turn is 360°.',
            k: 'd'
        },
        'unit Deg': {
            t: 'Degrees',
            d: 'Angles are in degrees: a full turn is 360°, so 90 sin = 1. Click to switch to gradians, where a ' +
                'full turn is 400.',
            first: 'Angles are in degrees: a full turn is 360°, so sin 90 = 1. Click to switch to gradians, where a ' +
                'full turn is 400.',
            k: 'd'
        },
        'unit Grad': {
            t: 'Gradians',
            d: 'Angles are in gradians: a full turn is 400, a right angle 100, so 100 sin = 1. Click to switch to ' +
                'radians, where a full turn is 2π.',
            first: 'Angles are in gradians: a full turn is 400, a right angle 100, so sin 100 = 1. Click to switch to ' +
                'radians, where a full turn is 2π.',
            k: 'd'
        },
        // the other marks in the display
        'FRAC': {
            t: 'Fraction mode is on',
            d: 'Each ÷ is drawn as a fraction and results are shown as fractions. Click to turn it off, as the ' +
                'a/b key does.',
            k: 'f'
        },
        'DMS': {
            t: 'Degrees, minutes and seconds are on',
            d: 'Results are shown as 36°52′11.63″. Click to turn it off, as the °′″ key does.',
            k: 'h, f'
        },
        'hold': {
            t: 'Hold',
            d: 'The next key gives its other function: s gives sinh, 2 gives x<sup>2</sup>, l gives ' +
                'log<sub>2</sub>. Click to let it go.',
            k: 'h'
        },
        // DEL and AC: they work by keys, not by characters
        'DEL': {
            t: 'Take back',
            d: 'Takes back the last key you pressed, a digit, operator, bracket or function, up to 50 keys. ' +
                'With the cursor in the equation, it removes what is before the cursor.',
            k: 'Backspace'
        },
        'C': {
            t: 'Clear the number',
            d: 'Clears only the number you are typing, to type it again; the rest of the equation stays. Then ' +
                'the key turns into AC.',
            k: 'Delete'
        },
        'AC': {
            t: 'All clear',
            d: 'Clears the whole calculation, to start again. Ans, the memory and the history stay.',
            k: 'Delete'
        },

        // the formulas and constants
        'formulas': {
            t: 'Formulas and constants',
            d: 'Well-known formulas: fill in their letters to put the equation into the display, where you can ' +
                'still change it before =. And constants of math and science, to put in as a number. Search to find one.',
            k: ''
        },
        'formulas close': {
            t: 'Close the formulas',
            d: 'The search stays for the next time.',
            k: 'Esc'
        },

        // the converter
        'converter': {
            t: 'Converter',
            d: 'Length, area, volume, mass, temperature, speed, time, data, pressure, energy, power, angles and ' +
                'fuel economy. The result shown is the value to start from; click a converted value to put it in.',
            k: ''
        },
        'converter close': {
            t: 'Close the converter',
            d: 'The value and units stay for the next time.',
            k: 'Esc'
        },

        // the statistics
        'stats': {
            t: 'Statistics',
            d: 'Type or paste a list of numbers, a column from a spreadsheet as well, for its mean, standard ' +
                'deviation, sum, median and more.',
            k: ''
        },
        'stats close': {
            t: 'Close the statistics',
            d: 'The list stays for the next time.',
            k: 'Esc'
        },
        'stats clear': {
            t: 'Clear the list',
            d: 'Removes all the numbers, to start a new list.',
            k: ''
        },
        'stats n': {
            t: 'Count, n',
            d: 'How many numbers the list has.'
        },
        'stats sum': {
            t: 'Sum, Σx',
            d: 'All the numbers added up.'
        },
        'stats squares': {
            t: 'Sum of squares, Σx<sup>2</sup>',
            d: 'Each number squared, then added up.'
        },
        'stats mean': {
            t: 'Mean, <span class="calc-x-bar">x</span>',
            d: 'The average: the sum divided by n.'
        },
        'stats sdp': {
            t: 'Standard deviation, σ',
            d: 'How far the numbers spread from the mean, when the list is the whole population: divided by n.'
        },
        'stats sds': {
            t: 'Sample standard deviation, s',
            d: 'How far the numbers spread from the mean, when the list is a sample of a larger group: divided ' +
                'by n − 1. It needs two numbers at least.'
        },
        'stats min': {
            t: 'Minimum',
            d: 'The smallest number of the list.'
        },
        'stats median': {
            t: 'Median',
            d: 'The middle number once the list is in order; with an even count, the mean of the middle two.'
        },
        'stats max': {
            t: 'Maximum',
            d: 'The largest number of the list.'
        },

        // the history
        'history': {
            t: 'History',
            d: 'The calculations you finished with =, newest first. Point at a line for its buttons: insert ' +
                'and copy; the x at the corner of a calculation deletes it.',
            k: ''
        },
        'history close': {
            t: 'Close the history',
            d: 'A click anywhere outside it closes it as well.',
            k: 'Esc'
        },
        'history clear': {
            t: 'Clear the history',
            d: 'Removes all the calculations in it. Ans and the memory stay.',
            k: ''
        },
        'history delete': {
            t: 'Delete this calculation',
            d: 'Removes the equation and its result from the history. Ans and the memory stay.',
            k: ''
        },
        'history insert equation': {
            t: 'Insert the equation',
            d: 'Enters it again without its =, to change it or finish it. It takes the place of what you are ' +
                'entering, in the unit and the fraction mode it was done in.',
            k: ''
        },
        'history insert result': {
            t: 'Insert the result',
            d: 'Puts the number into the equation you are entering, as Ans does, with all its digits.',
            k: ''
        },
        'history copy equation': {
            t: 'Copy the equation',
            d: 'As text, such as 1 ÷ 2 + 1 ÷ 3. Ctrl+V pastes it back, worked out the same.',
            k: ''
        },
        'history copy result': {
            t: 'Copy the result',
            d: 'As the line shows it: 0.75, or 3/4 for a calculation done in fraction mode.',
            k: ''
        },
        'history unit Deg': {
            t: 'Done in degrees',
            d: 'Its angles were worked out in degrees, and are again when you insert it, whatever the unit then.',
            k: ''
        },
        'history unit Rad': {
            t: 'Done in radians',
            d: 'Its angles were worked out in radians, and are again when you insert it, whatever the unit then.',
            k: ''
        },
        'history unit Grad': {
            t: 'Done in gradians',
            d: 'Its angles were worked out in gradians, and are again when you insert it, whatever the unit then.',
            k: ''
        },
        'history unit mixed': {
            t: 'Done in more than one unit',
            d: 'Its angles were worked out in different units, as it shows; each is again when you insert it.',
            k: ''
        },
        'MODE': {
            t: 'Number format',
            d: 'Goes on to the next way of showing results: Normal, Fix (1500.00), Sci (1.50e+3), Eng (1.50e+3 in ' +
                'steps of three) and Normal again. The display shows FIX 2, SCI 2 or ENG 2; the decimal places are ' +
                'set on the options page.',
            k: 'o'
        },
        'a/b': {
            t: 'Fraction mode',
            d: 'Draws each ÷ as a fraction while you type, and shows results as fractions: ' +
                '1 ÷ 2 + 1 ÷ 3 = 5/6. FRAC in the display shows it is on. Click again for decimals.',
            k: 'f'
        },
        '°′″': {
            t: 'Degrees, minutes, seconds',
            d: 'Shows results as degrees, minutes and seconds: 0.6 sin<sup>-1</sup> = 36°52′11.63″ in Deg. ' +
                'DMS in the display shows it is on. Click again for decimals. Hours work too: 2.75 is 2°45′0″, ' +
                '2 h 45 min. To enter an angle so, paste it: 12°30′15″ shows as written.',
            first: 'Shows results as degrees, minutes and seconds: sin<sup>-1</sup> 0.6 = 36°52′11.63″ in Deg. ' +
                'DMS in the display shows it is on. Click again for decimals. Hours work too: 2.75 is 2°45′0″, ' +
                '2 h 45 min. To enter an angle so, paste it: 12°30′15″ shows as written.',
            k: 'h, f'
        },
        '(': {
            t: 'Open bracket',
            d: 'A number before it is multiplied: 5\u00a0(\u00a02\u00a0+\u00a03\u00a0) is 5\u00a0×\u00a0(2\u00a0+\u00a03). Brackets still open close at =.',
            k: '('
        },
        ')': {
            t: 'Close bracket',
            d: 'Closes the last open bracket: (\u00a02\u00a0+\u00a03\u00a0)\u00a0×\u00a04\u00a0=\u00a020.',
            k: ')'
        },
        'x2': {
            t: 'Square',
            d: 'Enter the number first: 5 x<sup>2</sup> = 25.',
            k: 'h, 2'
        },
        'x3': {
            t: 'Cube',
            d: 'Enter the number first: 2 x<sup>3</sup> = 8.',
            k: 'h, 3'
        },
        'yx': {
            t: 'Power',
            d: 'Between two numbers: 2 y<sup>x</sup> 10 = 1024.',
            k: '^',
            second: 'log<sub>y</sub>'
        },
        'logy': {
            t: 'Logarithm, any base',
            d: 'The number first, then the base: 8 log<sub>y</sub> 2 = 3, as 2<sup>3</sup> = 8. ' +
                'The base is a positive number other than 1.',
            k: 'h, ^'
        },
        '1/x': {
            t: 'Reciprocal',
            d: 'One divided by the number: 4 1/x = 0.25.',
            k: '\\'
        },
        '√': {
            t: 'Square root',
            d: 'Enter the number first: 16 √ = 4.',
            first: 'Then the number: √ 16 = 4. Its bracket closes at ) or =.',
            k: 'Shift+R'
        },
        'x√y': {
            t: 'Root',
            d: 'The number first, then the root: 81 <sup>x</sup>√y 4 = 3, the 4th root of 81. ' +
                'Odd roots of negative numbers work: -8 <sup>x</sup>√y 3 = -2.',
            k: 'r'
        },
        'EE': {
            t: 'Exponent',
            d: 'Times ten to the power of the next number: 5 EE 3 = 5000, 5 × 10<sup>3</sup>.',
            k: 'Shift+E'
        },
        'sin': {
            t: 'Sine',
            d: 'Enter the angle first: 30 sin = 0.5 in Deg.',
            first: 'Then the angle: sin 30 = 0.5 in Deg. Its bracket closes at ) or =.',
            k: 's',
            second: 'sin<sup>-1</sup>'
        },
        'cos': {
            t: 'Cosine',
            d: 'Enter the angle first: 60 cos = 0.5 in Deg.',
            first: 'Then the angle: cos 60 = 0.5 in Deg. Its bracket closes at ) or =.',
            k: 'c',
            second: 'cos<sup>-1</sup>'
        },
        'tan': {
            t: 'Tangent',
            d: 'Enter the angle first: 45 tan = 1 in Deg.',
            first: 'Then the angle: tan 45 = 1 in Deg. Its bracket closes at ) or =.',
            k: 't',
            second: 'tan<sup>-1</sup>'
        },
        'sinh': {
            t: 'Hyperbolic sine',
            d: '1 sinh = 1.175201193644.',
            first: 'sinh 1 = 1.175201193644.',
            k: 'h, s',
            second: 'sinh<sup>-1</sup>'
        },
        'cosh': {
            t: 'Hyperbolic cosine',
            d: '1 cosh = 1.543080634815.',
            first: 'cosh 1 = 1.543080634815.',
            k: 'h, c',
            second: 'cosh<sup>-1</sup>'
        },
        'tanh': {
            t: 'Hyperbolic tangent',
            d: '1 tanh = 0.7615941559558.',
            first: 'tanh 1 = 0.7615941559558.',
            k: 'h, t',
            second: 'tanh<sup>-1</sup>'
        },
        'sin-1': {
            t: 'Inverse sine',
            d: 'The angle with this sine: 0.5 sin<sup>-1</sup> = 30 in Deg.',
            first: 'The angle with this sine: sin<sup>-1</sup> 0.5 = 30 in Deg.',
            k: 'Shift+S'
        },
        'cos-1': {
            t: 'Inverse cosine',
            d: 'The angle with this cosine: 0.5 cos<sup>-1</sup> = 60 in Deg.',
            first: 'The angle with this cosine: cos<sup>-1</sup> 0.5 = 60 in Deg.',
            k: 'Shift+C'
        },
        'tan-1': {
            t: 'Inverse tangent',
            d: 'The angle with this tangent: 1 tan<sup>-1</sup> = 45 in Deg.',
            first: 'The angle with this tangent: tan<sup>-1</sup> 1 = 45 in Deg.',
            k: 'Shift+T'
        },
        'sinh-1': {
            t: 'Inverse hyperbolic sine',
            d: '1 sinh<sup>-1</sup> = 0.8813735870195.',
            first: 'sinh<sup>-1</sup> 1 = 0.8813735870195.',
            k: 'h, Shift+S'
        },
        'cosh-1': {
            t: 'Inverse hyperbolic cosine',
            d: 'For numbers from 1 up: 2 cosh<sup>-1</sup> = 1.316957896925.',
            first: 'For numbers from 1 up: cosh<sup>-1</sup> 2 = 1.316957896925.',
            k: 'h, Shift+C'
        },
        'tanh-1': {
            t: 'Inverse hyperbolic tangent',
            d: 'For numbers between -1 and 1: 0.5 tanh<sup>-1</sup> = 0.5493061443341.',
            first: 'For numbers between -1 and 1: tanh<sup>-1</sup> 0.5 = 0.5493061443341.',
            k: 'h, Shift+T'
        },
        'π': {
            t: 'Pi',
            d: '3.14159265359…, the half turn in radians: 2 × π.',
            k: 'p',
            second: 'e'
        },
        'e': {
            t: 'Euler\'s number',
            d: '2.718281828459…, the base of the natural logarithm: e ln = 1.',
            first: '2.718281828459…, the base of the natural logarithm: ln e = 1.',
            k: 'h, p'
        },
        'log': {
            t: 'Logarithm, base 10',
            d: 'The power of 10 that gives the number: 1000 log = 3.',
            first: 'The power of 10 that gives the number: log 1000 = 3.',
            k: 'Shift+L',
            second: '10<sup>x</sup>'
        },
        'ln': {
            t: 'Natural logarithm',
            d: 'The logarithm to base e: 1 ln = 0, e ln = 1.',
            first: 'The logarithm to base e: ln 1 = 0, ln e = 1.',
            k: 'l',
            second: 'log<sub>2</sub>'
        },
        'log2': {
            t: 'Logarithm, base 2',
            d: 'The power of 2 that gives the number: 8 log<sub>2</sub> = 3.',
            first: 'The power of 2 that gives the number: log<sub>2</sub> 8 = 3.',
            k: 'h, l'
        },
        'ex': {
            t: 'e to the power',
            d: 'e (2.718281828459…) to the power of the number: 1 e<sup>x</sup> = 2.718281828459.',
            first: 'e (2.718281828459…) to the power of the number: e<sup>x</sup> 1 = 2.718281828459.',
            k: 'e',
            second: '2<sup>x</sup>'
        },
        '2x': {
            t: '2 to the power',
            d: '2 to the power of the number: 10 2<sup>x</sup> = 1024.',
            first: '2 to the power of the number: 2<sup>x</sup> 10 = 1024.',
            k: 'Shift+X'
        },
        '10x': {
            t: '10 to the power',
            d: '10 to the power of the number: 3 10<sup>x</sup> = 1000. It undoes log: 1000 log 10<sup>x</sup> = 1000.',
            first: '10 to the power of the number: 10<sup>x</sup> 3 = 1000. It undoes log.',
            k: 'h, Shift+L'
        },
        'abs': {
            t: 'Absolute value',
            d: 'The number without its sign: 3 +/– abs = 3.',
            first: 'The number without its sign: abs – 3 = 3.',
            k: '|'
        },
        'x!': {
            t: 'Factorial',
            d: '5 x! = 120, 1 × 2 × 3 × 4 × 5. Decimals work as well: 2.5 x! = 3.323350970448.',
            k: 'x'
        },
        'nCr': {
            t: 'Combinations',
            d: 'The ways to choose r of n things: 10 nCr 3 = 120.',
            k: 'Shift+N',
            second: 'gcd'
        },
        'nPr': {
            t: 'Permutations',
            d: 'The ways to arrange r of n things in order: 5 nPr 2 = 20.',
            k: 'Shift+P',
            second: 'lcm'
        },
        'gcd': {
            t: 'Greatest common divisor',
            d: 'The largest whole number that divides both: 12 gcd 18 = 6. Whole numbers only.',
            k: 'Shift+G'
        },
        'lcm': {
            t: 'Least common multiple',
            d: 'The smallest number both divide: 4 lcm 6 = 12. Whole numbers only.',
            k: 'Shift+K'
        },
        'mod': {
            t: 'Remainder (modulo)',
            d: 'What is left after dividing: 17 mod 5 = 2. It takes the sign of the second number, ' +
                'so -7 mod 3 = 2; decimals work too: 7.5 mod 2 = 1.5.',
            k: 'Shift+M'
        },
        '%': {
            t: 'Percent',
            d: 'On its own it divides by 100: 8 % = 0.08. After + or –, it is a share of the number before: ' +
                '500 + 8 % = 540.',
            k: '%',
            second: 'mod'
        },
        'Rand': {
            t: 'Random number',
            d: 'A new random number between 0 and 1 each time.',
            k: 'h, n'
        },
        'Ans': {
            t: 'Last answer',
            d: 'The last result, to use in a new equation: 5 × Ans. It stays after C and AC.',
            k: 'a'
        },
        'mc': {
            t: 'Memory clear',
            d: 'Empties the memory; the M in the display goes.',
            k: 'v'
        },
        'm+': {
            t: 'Memory add',
            d: 'Adds the number in the display to the memory. The display shows M while it holds a number.',
            k: 'b'
        },
        'm-': {
            t: 'Memory subtract',
            d: 'Subtracts the number in the display from the memory.',
            k: 'n'
        },
        'mr': {
            t: 'Memory recall',
            d: 'Puts the number in the memory into the equation.',
            k: 'm'
        }
    };
})(window);
