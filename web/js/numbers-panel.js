// The cards of the Numbers panel: matrices, complex numbers, whole numbers in bits and their bases, and whole
// numbers' factors and numbers rounded, a tab each. maths.js and engine.js work them out; this is how the calculator
// shows them. Made by main.js as it starts, CalcNumbersPanel(app, shared): app is what the cards take from the rest
// of the calculator, those values that change read as they are now; shared is filled with what the calculator
// takes from them, before they start
(function (global) {
    'use strict';

    global.CalcNumbersPanel = function (app, shared) {
        var complexText = app.complexText, drawnTile = app.drawnTile, engine = app.engine, escaped = app.escaped, fix = app.fix,
            graphPart = app.graphPart, listTyped = app.listTyped, local = app.local, planeFit = app.planeFit, planeLabel = app.planeLabel,
            rootName = app.rootName, svgArrow = app.svgArrow, svgOf = app.svgOf, svgText = app.svgText, tr = app.tr, trn = app.trn;

        // what the calculator takes from the cards
        Object.defineProperties(shared, Object.getOwnPropertyDescriptors({
            get NUMBER_TOOLS() { return NUMBER_TOOLS; }
        }));

            // ---------------- numbers ---------------- //

            // Matrices, complex numbers, whole numbers in bits and their bases, and whole numbers'
            // factors and numbers rounded, a tab each, with cards as the solver has. A matrix has a box
            // for each number, as many as its size says
            var NUMBER_TOOLS = {
                matrix: [
                    { id: 'matrix', waits: true, t: 'A matrix', f: ['det A', 'A<sup>–1</sup>', 'A<sup>T</sup>', 'A<sup>n</sup>'], d: 'Its determinant, rank, inverse, transpose and its power n, a whole number, below 0 of its inverse. Type its size, 3×3 or 2 3, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                        fields: function (raw) {
                            return [{ k: 'size', l: 'Size', ph: '2×2', text: true, shape: true }, { k: 'power', l: 'n', ph: '2', def: 2 }].concat(cells('a', 'A', raw.size));
                        }, cols: 2, run: runMatrix,
                        example: { size: '3×3', power: '2', a11: '4', a12: '7', a13: '2', a21: '3', a22: '6', a23: '1', a31: '2', a32: '5', a33: '3' } },
                    { id: 'rref', waits: true, t: 'Row reduce', f: ['rref A', 'null space'], d: 'Its rows reduced as far as they go, its reduced row echelon form, its rank and the columns of its first 1s, and its null space: a basis of the vectors it takes to 0. Type its size, 3×3 or 2 3, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                        fields: function (raw) { return [{ k: 'size', l: 'Size', ph: '3×3', text: true, shape: true }].concat(cells('a', 'A', raw.size || '3')); }, run: runRref,
                        example: { size: '3×3', a11: '1', a12: '2', a13: '3', a21: '4', a22: '5', a23: '6', a31: '7', a32: '8', a33: '9' } },
                    { id: 'matrices', waits: true, t: 'Two matrices', f: ['A + B', 'A × B'], d: 'The sum, difference and products of two matrices, where their sizes allow. Type each size, 3×3 or 2 3, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                        fields: function (raw) {
                            return [{ k: 'sizeA', l: 'Size of A', ph: '2×2', text: true, shape: true }, { k: 'sizeB', l: 'Size of B', ph: '2×2', text: true, shape: true }]
                                .concat(cells('a', 'A', raw.sizeA, 'sizeA'), cells('b', 'B', raw.sizeB, 'sizeB'));
                        }, cols: 2, run: runMatrices,
                        example: { sizeA: '2×3', sizeB: '3×2', a11: '1', a12: '2', a13: '3', a21: '4', a22: '5', a23: '6', b11: '7', b12: '8', b21: '9', b22: '10', b31: '11', b32: '12' } },
                    { id: 'eigen', waits: true, t: 'Eigenvalues', f: 'A<b>v</b> = λ<b>v</b>', d: 'The eigenvalues of a square matrix, real or a ± bi, its characteristic polynomial and trace, and the eigenvectors of each real eigenvalue: the v that A only stretches, by λ. Type its size, 3×3 or 3, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                        fields: function (raw) { return [{ k: 'size', l: 'Size', ph: '2×2', text: true, shape: true }].concat(cells('a', 'A', raw.size)); }, run: runEigen,
                        example: { size: '3×3', a11: '2', a12: '-1', a13: '0', a21: '-1', a22: '2', a23: '-1', a31: '0', a32: '-1', a33: '2' } },
                    { id: 'axb', waits: true, t: 'A x = b', f: 'A<b>x</b> = <b>b</b>', d: 'The unknowns of linear equations, up to ten of them: a row of A for each equation and what it equals in b. As many equations as rows, as many unknowns as columns. Where they have many answers, all of them, x = p + t v; where they have none, the nearest, by least squares. Type the size of A, 3×3 or 3 2, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                        fields: function (raw) {
                            var size = sizeOf(raw.size) || [2, 2], out = [{ k: 'size', l: 'Size of A', ph: '2×2', text: true, shape: true }, { head: 'A | b', cols: size[1] + 1 }], i, j;
                            for (i = 1; i <= size[0]; i++) {
                                for (j = 1; j <= size[1]; j++) out.push({ k: 'a' + i + j, ph: '0', def: 0, aria: 'A row ' + i + ' column ' + j, cell: { g: 'ab', s: 'size', i: i, j: j, n: size } });
                                out.push({ k: 'b' + i + '1', ph: '0', def: 0, aria: tr('b row {i}', { i: i }), cls: 'calc-sv-rhs', cell: { g: 'ab', s: 'size', i: i, j: j, n: size } });
                            }
                            return out;
                        }, run: runAxb,
                        example: { size: '3×3', a11: '1', a12: '1', a13: '1', a21: '0', a22: '2', a23: '5', a31: '2', a32: '5', a33: '-1', b11: '6', b21: '-4', b31: '27' } },
                    { id: 'lu', waits: true, t: 'LU and QR', f: ['P A = L U', 'A = Q R'], d: 'A matrix as products: P A = L U, L below its diagonal with 1s on it and U above it, P the rows changed round; and A = Q R, the columns of Q of length 1 and at right angles, R above its diagonal. Type its size, 3×3 or 3 2, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                        fields: function (raw) { return [{ k: 'size', l: 'Size', ph: '2×2', text: true, shape: true }].concat(cells('a', 'A', raw.size)); }, run: runLu,
                        example: { size: '3×3', a11: '2', a12: '1', a13: '1', a21: '4', a22: '-6', a23: '0', a31: '-2', a32: '7', a33: '2' } },
                    { id: 'vectors', t: 'Vectors', f: ['<b>u</b> · <b>v</b>', '<b>u</b> × <b>v</b>'], d: 'Of two vectors of 2, 3 or 4 numbers, typed 1, 2, 3: their dot product, cross product, lengths and the angle between them, the projection of u on v, and u of length 1.',
                        fields: [{ k: 'u', l: 'u', ph: '1, 2, 3', fn: true }, { k: 'v', l: 'v', ph: '4, 5, 6', fn: true }], run: runVectors, example: function () { return { u: listTyped(['1', '2', '3']), v: listTyped(['4', '5', '6']) }; } }
                ],
                complex: [
                    { id: 'complex', t: 'Complex number', f: ['a + b<i>i</i>', 'r∠θ'], d: 'Work out a complex number: (2 + 3i)(1 – i), sqrt(-4), e^(iπ), or 2∠30 in polar form. Its real and imaginary parts, its length, angle and conjugate, and it as r e^(iθ).',
                        fields: [{ k: 'z', l: 'z', ph: '(2 + 3i)(1 - i)', fn: true }], run: runComplex, example: { z: '(2 + 3i)(1 - i)' } },
                    { id: 'croots', t: 'Roots of a complex number', f: 'z<sup>1/n</sup>', d: 'The n n-th roots of a complex number: the cube roots of 1, the fourth roots of -16.',
                        fields: [{ k: 'z', l: 'z', ph: '-16', fn: true }, { k: 'n', l: 'n', ph: '4', def: 4 }], run: runRoots, example: { z: '-16', n: '4' } },
                    { id: 'cpoly', t: 'Polynomial roots', f: 'x<sup>2</sup> + (1 + <i>i</i>)x + 2<i>i</i>', d: 'Every root of a polynomial of complex coefficients, of any power up to 30: typed, x^2 + (1 + i)x + 2i, or its coefficients from the highest power, 1, 1 + i, 2i.',
                        fields: [{ k: 'p', l: 'p(x)', ph: 'x^2 + (1 + i)x + 2i', fn: true }], run: runCpoly, example: { p: 'x^2 + (1 + i)x + 2i' } },
                    { id: 'impedance', t: 'AC impedance', f: 'Z = R + <i>i</i>(ωL – 1/ωC)', d: 'The impedance of a resistor, a coil and a capacitor at a frequency, in series or side by side: Z as a + bi, its size and phase, the reactance of the coil and of the capacitor, and the frequency where they cancel. Leave out any of R, L and C; a value may have a prefix, 4.7k, 10m, 100µ or 1e-6.',
                        fields: [{ k: 'r', l: 'R, Ω', ph: '100', text: true }, { k: 'l', l: 'L, H', ph: '0.1', text: true }, { k: 'c', l: 'C, F', ph: '10µ', text: true },
                            { k: 'f', l: 'f, Hz', ph: '50', text: true }, { k: 'circuit', l: 'Circuit', choice: ['Series', 'Parallel'] }], cols: 2, run: runImpedance,
                        example: { r: '100', l: '0.1', c: '10µ', f: '50' } }
                ],
                computer: [
                    { id: 'bits', t: 'Bases', f: '0xFF AND 0b1010', d: 'Whole numbers as a computer keeps them, in 8, 16, 32, 64 or 128 bits: decimal, 0x hexadecimal, 0b binary or 0o octal, with + – × ÷ mod AND OR XOR NOT NAND NOR XNOR, &lt;&lt; &gt;&gt; and ROL ROR, which turn the bits round. Each result in every base, and its bytes big-endian and little-endian, and swapped.',
                        fields: [{ k: 'e', l: 'Number', ph: '0xFF AND 0b1010', fn: true }, { k: 'bits', l: 'Bits', choice: ['8', '16', '32', '64', '128'], at: 2 }], run: runBits, example: { e: '0xFF AND 0b1010' } },
                    { id: 'bitview', waits: true, t: 'Bits', f: 'b<sub>7</sub> … b<sub>1</sub> b<sub>0</sub>', d: 'The bits of a whole number, each turned over with a click; how many are 1, the 0s before and after them, and the highest and lowest bit that is 1. Empty, it is 0, to click a number together.',
                        fields: [{ k: 'e', l: 'Number', ph: '0', fn: true }, { k: 'bits', l: 'Bits', choice: ['8', '16', '32', '64', '128'], at: 2 }], run: runBitView, example: { e: '32182' } }, // 0111 1101 1011 0110: eleven 1s, and 0s before and after them
                    { id: 'logic', t: 'Truth table', f: ['AB + C\'', 'Σm(1, 3, 5)'], d: 'A function of logic of up to 8 variables: A AND NOT B, AB + C\', two side by side ANDed and \' for NOT, (A + B)(A\' + C), ' +
                        'A XOR B, !a | b & c, NAND, NOR and XNOR; or of its rows, Σm(1, 3, 5) + d(7), d those that may be either, or ΠM(0, 2). F(A, B, C) = before it gives the variables their order. ' +
                        'Its truth table, its minterms and maxterms, and it made as small as it can be, by Quine and McCluskey, as a sum of products and as a product of sums; ' +
                        'of 2 to 4 variables its Karnaugh map drawn, each product ringed.',
                        fields: [{ k: 'e', l: 'Expression', ph: 'AB + A\'C + BC', fn: true }], run: runLogic, example: { e: 'AB + A\'C + BC' } },
                    { id: 'gray', t: 'Gray code', f: '5 = 0111 in Gray', d: 'A whole number in Gray code, each next one only a bit apart, as an encoder\'s disc is marked so it never reads a step wrong; ' +
                        'or the number of a Gray code, typed as 0b0111. Drawn, the codes about it, the bit that changes to each marked.',
                        fields: function (raw) { // its box named for what goes in it, of the way chosen
                            var back = raw.way === '1';
                            return [{ k: 'way', l: 'Find', choice: ['Its Gray code', 'Its number'] }, { k: 'e', l: back ? 'Gray code' : 'Number', ph: back ? '0b0111' : '5', fn: true },
                                { k: 'bits', l: 'Bits', choice: ['8', '16', '32', '64'] }];
                        }, run: runGray,
                        example: function (raw) { return { way: raw.way || '0', e: raw.way === '1' ? '0b0111' : '5' }; } },
                    { id: 'float', t: 'IEEE 754', f: '0.1 = 0x3FB999999999999A', d: 'A number as a computer keeps it: a double of 64 bits and a float of 32, in hexadecimal; its sign, exponent and fraction; the number it is, to its last digit, and the gap to the next. Or the bits, 0x3FB999999999999A, for the number.',
                        fields: [{ k: 'x', l: 'Number', ph: '0.1', fn: true }], run: runFloat, example: { x: '0.1' } },
                    { id: 'anybase', t: 'Any base', f: 'FF.8<sub>16</sub> = 11111111.1<sub>2</sub>', d: 'A number in any base from 2 to 36 written in another, the digits after its point as well: 0.1 in base 10 is 0.0(0011) in base 2, the part in brackets coming again and again. A part in brackets may be typed too.',
                        fields: [{ k: 'x', l: 'Number', ph: '0.1', fn: true }, { k: 'from', l: 'From base', ph: '10', def: 10 }, { k: 'to', l: 'To base', ph: '2', def: 2 }], cols: 2, run: runAnyBase, example: { x: '0.1', from: '10', to: '2' } },
                    { id: 'codes', t: 'Text and codes', f: 'é = U+00E9 = C3 A9', d: 'The codes of a text: its code points, its bytes in UTF-8 and its units of UTF-16. Or a text from its codes: U+00E9, 0xC3 0xA9 for the bytes of UTF-8, or 233.',
                        fields: [{ k: 't', l: 'Text', ph: 'Hé', fn: true }, { k: 'c', l: 'Codes', ph: 'U+0048 U+00E9', fn: true }], spaces: ['t'], run: runCodes, example: { t: 'Hé' } },
                    { id: 'subnet', t: 'IP subnet', f: ['192.168.1.0/24', '2001:db8::/32'], d: 'The network of an IPv4 address with its prefix, 192.168.1.10/24, or its mask, 192.168.1.10 255.255.255.0: its network and broadcast addresses, its mask, the first and last host and how many hosts it has. Or of an IPv6 address, 2001:db8::1/48: its network, the address in full and written short, its first and last address, how many addresses and /64 networks, its kind and its name for reverse DNS.',
                        fields: [{ k: 'ip', l: 'Address', ph: '192.168.1.10/24 or 2001:db8::1/48', fn: true }], run: runSubnet, drawnLast: true, example: { ip: '192.168.1.10/24' } },
                    { id: 'uuid', t: 'UUID', f: ['Version 4', 'Version 7'], d: 'Make: five new UUIDs, of RFC 9562: of version 4, all random, or of version 7, the time now and then random, so they sort as ' +
                        'they were made; a click on a version, the one chosen too, for five more; Copy copies one. Read: one typed, with hyphens or none, in braces or after urn:uuid: if you like: ' +
                        'its version and variant, the time it was made, of versions 1, 6 and 7, and it in hexadecimal, Base64 and as a whole number.',
                        fields: function (raw) {
                            return [{ k: 'do', l: 'UUIDs', choice: ['Make', 'Read'] }].concat(raw.do === '1' ? [{ k: 'u', l: 'UUID', ph: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', fn: true }] :
                                [{ k: 'ver', l: 'Version', choice: ['Version 4', 'Version 7'], renew: true }]);
                        }, run: function (n, raw) { return raw.do === '1' ? runUuidRead(n, raw) : runUuid(n, raw); },
                        example: function (raw) { return raw.do === '1' ? { do: '1', u: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6' } : null; } }, // Make has its UUIDs as it opens
                    { id: 'base64', t: 'Base32, 58, 64 and 85', f: 'Hé = SMOp', d: 'A text\'s bytes of UTF-8 written in letters: Base32, of A–Z and 2–7, as the secrets of two-step sign-in are; Base58, as Bitcoin addresses are, no 0, O, I or l; Base64, and that of web addresses and file names, with - and _ and no =; or Base85, Ascii85 as in PDF. Or the text, and the bytes, of what is so written.',
                        fields: [{ k: 't', l: 'Text', ph: 'Hé', fn: true }, { k: 'b', l: 'Encoded', ph: 'SMOp', fn: true }, { k: 'enc', l: 'In', choice: ['Base32', 'Base58', 'Base64', 'Base85'], at: 2 }],
                        spaces: ['t'], run: runBase64, example: { t: 'Hé' } },
                    { id: 'hash', t: 'Hashes', f: 'abc = ba7816bf…', d: 'The hashes of a text\'s bytes of UTF-8, as a download\'s checksum is given: MD5, SHA-1, SHA-256 and SHA-512 in hexadecimal, SHA-256 in Base64 as the integrity of a script on a web page has it, and CRC-32, as zip and PNG have it. A hash pasted to check is matched against them. MD5 and SHA-1 are broken: for checking a file alone, never for passwords.',
                        fields: [{ k: 't', l: 'Text', ph: 'abc', fn: true }, { k: 'h', l: 'Check', ph: 'ba7816bf…', fn: true }], spaces: ['t'], run: runHash, example: { t: 'abc' } }
                ],
                whole: [
                    { id: 'factors', t: 'Prime factors', f: '360 = 2<sup>3</sup> × 3<sup>2</sup> × 5', d: 'A whole number of up to 20 digits in its prime factors, whether it is prime, and its divisors: how many, their sum, each of them, and how many numbers up to it have none of its factors.',
                        fields: [{ k: 'n', l: 'n', ph: '360', fn: true }], run: runFactors, example: { n: '360' } },
                    { id: 'gcd', t: 'GCD and LCM', f: 'gcd(12, 18, 30)', d: 'The greatest common divisor and least common multiple of two whole numbers or more, typed with commas or spaces between them.',
                        fields: [{ k: 'list', l: 'Numbers', ph: '12, 18, 30', fn: true }], run: runGcd, example: function () { return { list: listTyped(['12', '18', '30']) }; } },
                    { id: 'modular', t: 'Modular arithmetic', f: ['a<sup>b</sup> mod m', 'a<sup>–1</sup>', 'a x ≡ b'], d: 'Of whole numbers a, b and m, of up to 200 digits: a mod m, a to the power b mod m, the inverse of a mod m, and every x of a x ≡ b (mod m).',
                        fields: [{ k: 'a', l: 'a', ph: '3', fn: true }, { k: 'b', l: 'b', ph: '4', fn: true }, { k: 'm', l: 'm', ph: '7', fn: true }], run: runModular, example: { a: '3', b: '4', m: '7' } },
                    { id: 'crt', t: 'Chinese remainder', f: ['x ≡ 2 (mod 3)', 'x ≡ 3 (mod 5)'], d: 'The x of x ≡ r (mod m) for each of a list, typed 2 mod 3, 3 mod 5, 2 mod 7, the moduli with a factor in common as well: x and the modulus all of them make.',
                        fields: [{ k: 'list', l: 'Remainders', ph: '2 mod 3, 3 mod 5, 2 mod 7', fn: true }], run: runChinese, example: function () { return { list: listTyped(['2 mod 3', '3 mod 5', '2 mod 7']) }; } },
                    { id: 'exact', t: 'Exactly', f: ['100!', '2<sup>200</sup>', '50 nCr 25'], d: 'A calculation of whole numbers and fractions worked out exactly, to every digit, up to 20000: + – × ÷, ^, n!, nCr and nPr, or C(n, k), P(n, k) and fib(n). A fraction stays one, 1/3 + 1/6 is 1/2.',
                        fields: [{ k: 'e', l: 'Number', ph: '100!', fn: true }], run: runExact, example: { e: '100!' } },
                    { id: 'primes', t: 'Primes', f: ['p<sub>n</sub>', 'π(n)', 'next and previous'], d: 'Whether a whole number of up to 24 digits is prime, the primes before and after it, and up to 10 million how many primes there are up to it, π(n), and the n-th prime.',
                        fields: [{ k: 'n', l: 'n', ph: '100', fn: true }], run: runPrimes, example: { n: '100' } },
                    { id: 'between', t: 'Primes between', f: 'the primes from a to b', d: 'The primes from a to b, both in: how many and each of them, b up to 10¹⁴ and the two up to 10 million apart.',
                        fields: [{ k: 'a', l: 'From', ph: '1', fn: true }, { k: 'b', l: 'To', ph: '100', fn: true }], run: runBetween2, example: { a: '1', b: '100' } },
                    { id: 'fraction', t: 'Fraction and decimal', f: '0.1(6) = 1/6', d: 'A fraction, 22/7, a decimal, 0.125, or one whose last digits come again and again in brackets, 0.1(6): as a fraction, a mixed number, a decimal with the part that comes again in brackets, and a continued fraction. A calculation, pi, as near as its digits tell.',
                        fields: [{ k: 'x', l: 'Number', ph: '0.1(6)', fn: true }], run: runFraction, example: { x: '0.1(6)' } },
                    { id: 'round', t: 'Round', f: ['⌊x⌋', '⌈x⌉', 'x to d places'], d: 'A number rounded to d decimal places, half away from 0, down, up and toward 0; its fraction part, and the number to d significant figures. Places below 0 round to tens, hundreds …',
                        fields: [{ k: 'x', l: 'x', ph: '3.14159' }, { k: 'd', l: 'Places', ph: '0', def: 0 }], cols: 2, run: runRound, example: { x: '3.14159', d: '2' } }
                ]
            };

            // the rows and columns of a size typed: 3×3, 2 3, 2x3, 2,3, or 3 for a square; [2, 2] while
            // empty; null for a size that is not one, of more than 10 or fewer than 1
            function sizeOf(text) {
                var m = /^\s*([1-9]|10)\s*(?:[x×*,\s]\s*([1-9]|10))?\s*$/i.exec(text || '');
                if (!String(text || '').trim()) return [2, 2];
                return m ? [+m[1], +(m[2] || m[1])] : null;
            }

            // a box for each number of a matrix of the size typed, its letter and a row and column to
            // each, a11, a12 …, under the head of its name. Each knows where it is, for a matrix pasted
            // in it: cell, the letter, the box of the size (key, or size), its row and column, and the size
            function cells(letter, name, size, key) {
                var s = sizeOf(size) || [2, 2], out = [{ head: name, cols: s[1] }], i, j;
                for (i = 1; i <= s[0]; i++) {
                    for (j = 1; j <= s[1]; j++) {
                        out.push({ k: letter + i + j, ph: '0', def: 0, aria: tr('{name} row {i} column {j}', { name: name, i: i, j: j }), cell: { g: letter, s: key || 'size', i: i, j: j, n: s } });
                    }
                }
                return out;
            }

            // the matrix of the boxes of a letter, as big as its size
            function matrixOf(n, letter, size) {
                var s = sizeOf(size) || [2, 2], m = [], i, j;
                for (i = 1; i <= s[0]; i++) {
                    m.push([]);
                    for (j = 1; j <= s[1]; j++) m[i - 1].push(n[letter + i + j]);
                }
                return m;
            }

            function runComplex(n, raw) {
                var z = raw.z ? CalcMaths.complex(raw.z, engine.comma, app.deg) : null, p, none = [{ l: 'a + b<i>i</i>', v: NaN, wide: true }];
                if (!raw.z) return { rows: none };
                if (!z) return { rows: none, bad: ['z'], warn: true, note: 'Not a complex number yet: 2 + 3i, with i; 2∠30 for a length and an angle.' };
                if (!isFinite(z.re) || !isFinite(z.im)) return { rows: none, warn: true, note: 'No value, as of 1/0.' };
                p = CalcMaths.polar(z, app.deg);
                return {
                    rows: [{ l: 'a + b<i>i</i>', text: complexText(z), wide: true }, { l: 'Real part', v: z.re }, { l: 'Imaginary part', v: z.im },
                        { l: 'Length |z|', v: p.r }, { l: 'Angle', v: p.theta }, { l: 'Polar', text: local(String(p.r)) + ' ∠ ' + local(String(p.theta)) + (app.deg === 1 ? '°' : ''), wide: true },
                        { l: 'Exponential', text: exponentialText(p), wide: true },
                        { l: 'Conjugate', text: complexText({ re: z.re, im: CalcMaths.round(0 - z.im) }) },
                        planeTile([z, { re: z.re, im: -z.im }], 0, 'z and its conjugate')],
                    note: tr('Angles in {v}, the unit in use.', { v: [tr('radians'), tr('degrees'), tr('gradians')][app.deg] })
                };
            }

            // a complex number of its length and angle as r e^(iθ), the angle in the unit in use: 2e^(i·30°), 2e^(–i·0.5)
            function exponentialText(p) {
                if (!p.r) return '0';
                if (!p.theta) return local(String(p.r)); // a positive real: e^(i·0) is 1
                return (p.r === 1 ? '' : local(String(p.r))) + '<i>e</i><sup>' + (p.theta < 0 ? '–' : '') + '<i>i</i>' +
                    '·' + local(String(Math.abs(p.theta))) + (app.deg === 1 ? '°' : '') + '</sup>';
            }

            // A value of a box of R, L, C or f, of a prefix of SI as well: 4.7k or 4.7K, 10m, 100µ or 100u, 1e-6, 2.2 nF;
            // null for an empty box, NaN for one that is not a value
            function siValue(text, unit) {
                var m = new RegExp('^([-+]?(?:\\d+(?:[.,]\\d*)?|[.,]\\d+)(?:e[-+]?\\d+)?)\\s*([pnuµμmkKMG]?)\\s*(?:' + unit + ')?$', 'i').exec(String(text || '').trim()), v;
                if (!String(text || '').trim()) return null;
                if (!m || (m[2] && !/^[pnuµμmkKMG]$/.test(m[2]))) return NaN;
                if (!engine.comma && m[1].indexOf(',') > -1) { // the comma is a thousands mark here: 4,700 is 4700, and 4,7 is no value
                    if (!/^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d*)?(?:e[-+]?\d+)?$/i.test(m[1])) return NaN;
                    m[1] = m[1].replace(/,/g, '');
                }
                v = parseFloat(m[1].replace(',', '.'));
                return m[2] ? CalcMaths.round(v * { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 }[m[2]]) : v;
            }

            // The impedance of R, L and C at a frequency, in series or side by side: Z, its size and phase,
            // what is in the way of each, and the frequency where the coil and capacitor cancel. Its phase
            // above 0 is of a coil, the current behind the voltage; below 0, of a capacitor, ahead of it
            function runImpedance(n, raw) {
                var v = { r: siValue(raw.r, 'Ω|ohms?'), l: siValue(raw.l, 'h'), c: siValue(raw.c, 'f'), f: raw.f ? siValue(raw.f, 'hz') : 50 },
                    bad = Object.keys(v).filter(function (k) { return v[k] !== null && isNaN(v[k]); }), none = [{ l: 'Z', v: NaN, wide: true }], r, p,
                    letter = function (k) { return k === 'r' ? 'R' : k === 'l' ? 'L' : k === 'c' ? 'C' : 'f'; };
                if (bad.length) return { rows: none, bad: bad, warn: true, note: bad.length > 1 ? tr('{bad} and {last} are not values: 100, 4.7k, 10m, 100µ or 1e-6.', { bad: bad.slice(0, -1).map(letter).join(tr(', ')), last: letter(bad[bad.length - 1]) }) :
                    tr('{bad} is not a value: 100, 4.7k, 10m, 100µ or 1e-6.', { bad: letter(bad[0]) }) };
                r = CalcMaths.impedance(v.r, v.l, v.c, v.f, raw.circuit === '1');
                if (r.error === 'none') return { rows: none };
                if (r.error) return { rows: none, warn: true, note: v.c === 0 ? 'C is above 0: a capacitor of 0 F is none.' : 'R, L, C and f are 0 or above.' };
                if (!isFinite(r.z.re) || !isFinite(r.z.im)) return { rows: none, warn: true, note: 'No current goes through: Z is infinite, as of a capacitor in series at 0 Hz, or of L and C side by side at resonance.' };
                p = CalcMaths.polar(r.z, app.deg);
                return {
                    rows: [{ l: 'Z', text: complexText(r.z), wide: true }, { l: '|Z|, Ω', v: p.r }, { l: 'Phase φ', v: p.theta }, { l: 'Resistance, Ω', v: r.z.re },
                        { l: 'Reactance, Ω', v: r.z.im }, { l: 'X<sub>L</sub> = ωL', v: isFinite(r.xl) ? r.xl : NaN }, { l: 'X<sub>C</sub> = 1/ωC', v: isFinite(r.xc) ? r.xc : NaN },
                        { l: 'Resonance f<sub>0</sub>, Hz', v: r.resonance, wide: true },
                        planeTile([r.z], 0, 'Z on the plane')],
                    note: (!r.z.im ? tr('In phase: as a resistor alone. Angles in {v}.{v2}', { v: [tr('radians'), tr('degrees'), tr('gradians')][app.deg], v2: (raw.f ? '' : tr(' f is 50 Hz while it is empty.')) }) : r.z.im > 0 ? tr('Of a coil: the current is behind the voltage by φ. Angles in {v}.{v2}', { v: [tr('radians'), tr('degrees'), tr('gradians')][app.deg], v2: (raw.f ? '' : tr(' f is 50 Hz while it is empty.')) }) : tr('Of a capacitor: the current is ahead of the voltage by |φ|. Angles in {v}.{v2}', { v: [tr('radians'), tr('degrees'), tr('gradians')][app.deg], v2: (raw.f ? '' : tr(' f is 50 Hz while it is empty.')) }))
                };
            }

            function runRoots(n, raw) {
                var z = raw.z ? CalcMaths.complex(raw.z, engine.comma, app.deg) : null, roots = z && CalcMaths.croots(z, n.n);
                if (raw.z && !z) return { rows: [{ l: 'Roots', v: NaN, wide: true }], bad: ['z'], warn: true, note: 'Not a complex number yet: -16, 1 + i, with i.' };
                if (!roots) return { rows: [{ l: 'Roots', v: NaN, wide: true }], warn: isFinite(n.n), note: isFinite(n.n) && z ? 'n is a whole number from 1 to 24.' : '' };
                return { rows: roots.map(function (r, i) { return { l: 'z<sub>' + (i + 1) + '</sub>', text: complexText(r), wide: true }; })
                    .concat([planeTile(roots, Math.hypot(roots[0].re, roots[0].im))]) };
            }

            function runBits(n, raw) {
                var bits = n.bits, r = raw.e ? CalcMaths.bitwise(raw.e, bits) : null, big, bytes, none = [{ l: 'Decimal', v: NaN }];
                if (raw.e && r && r.error) {
                    return { rows: none, bad: r.error === 'expression' ? ['e'] : [], warn: true, note: {
                        expression: 'Whole numbers, 255, 0xFF, 0b1010 or 0o17, with + – × ÷ mod AND OR XOR NOT NAND NOR XNOR << >> ROL ROR.',
                        zero: 'Division by 0.',
                        bits: 'Bits are 8, 16, 32, 64 or 128.'
                    }[r.error] };
                }
                if (!r) return { rows: none };
                big = BigInt.asUintN(bits, r.value);
                bytes = CalcMaths.bytesOf(r.value, bits).map(function (b) { return CalcMaths.hexOfBytes([b]).toUpperCase(); });
                return {
                    rows: [
                        Math.abs(Number(r.value)) <= Number.MAX_SAFE_INTEGER ? { l: 'Decimal', v: Number(r.value) } : { l: 'Decimal', text: String(r.value), wide: bits === 128 },
                        big <= BigInt(Number.MAX_SAFE_INTEGER) ? { l: 'Unsigned', v: Number(big) } : { l: 'Unsigned', text: String(big), wide: bits === 128 },
                        { l: 'Hexadecimal', text: CalcMaths.inBase(r.value, bits, 16), wide: bits === 128 }, { l: 'Octal', text: CalcMaths.inBase(r.value, bits, 8), wide: bits >= 64, wrap: bits === 128 },
                        // of 64 bits and more, 32 to a line
                        { l: 'Binary', text: CalcMaths.inBase(r.value, bits, 2).replace(/((?:[01]{4} ){7}[01]{4}) /g, '$1<br>'), wide: true, bits: true }
                    ].concat(bits === 8 ? [] : [
                        { l: 'Big-endian', text: bytes.join(' '), wide: bits >= 64, wrap: true }, { l: 'Little-endian', text: bytes.slice().reverse().join(' '), wide: bits >= 64, wrap: true },
                        { l: 'Bytes swapped', text: '0x' + CalcMaths.inBase(CalcMaths.byteSwap(r.value, bits), bits, 16).padStart(bits / 4, '0'), wide: bits >= 64 }
                    ]),
                    note: r.wrapped ? 'Out of ' + bits + ' bits: kept to them, as a computer does.' : ''
                };
            }

            // The bits of a whole number to turn over with a click, a row of up to 16 for each, and how
            // many are 1 and where. A bit turned over writes the number again as it was typed, 0x for 0x,
            // or in hexadecimal for a calculation; empty, in binary up to 16 bits
            function runBitView(n, raw) {
                var bits = n.bits, r = raw.e ? CalcMaths.bitwise(raw.e, bits) : [8, 16, 32, 64, 128].indexOf(bits) > -1 ? { value: BigInt(0) } : { error: 'bits' },
                    c, none = [{ l: 'Bits', v: NaN, wide: true }];
                if (r.error) {
                    return { rows: none, bad: r.error === 'expression' ? ['e'] : [], warn: true, note: {
                        expression: 'A whole number, 255, 0xFF, 0b1010 or 0o17, or a calculation of them.',
                        zero: 'Division by 0.',
                        bits: 'Bits are 8, 16, 32, 64 or 128.'
                    }[r.error] };
                }
                c = CalcMaths.bitCount(r.value, bits);
                return {
                    rows: [{ l: 'Bits', flip: { v: r.value, n: bits, k: 'e', set: function (b) {
                        var v = CalcMaths.flipBit(r.value, bits, b), u = BigInt.asUintN(bits, v), m = /^\s*-?(0x|0b|0o)?[0-9a-f]+\s*$/i.exec(raw.e || ''),
                            how = m ? (m[1] || '').toLowerCase() : raw.e ? '0x' : bits <= 16 ? '0b' : '0x';
                        return how === '0x' ? '0x' + u.toString(16).toUpperCase() : how === '0b' ? '0b' + u.toString(2) : how === '0o' ? '0o' + u.toString(8) : String(v);
                    } }, wide: true },
                        Math.abs(Number(r.value)) <= Number.MAX_SAFE_INTEGER ? { l: 'Decimal', v: Number(r.value) } : { l: 'Decimal', text: String(r.value), wide: bits === 128 },
                        { l: 'Hexadecimal', text: CalcMaths.inBase(r.value, bits, 16), wide: bits === 128 },
                        { l: 'Ones', v: c.ones }, { l: 'Leading zeros', v: c.leading }, { l: 'Trailing zeros', v: c.trailing },
                        { l: 'Highest 1', v: c.high < 0 ? NaN : c.high }, { l: 'Lowest 1', v: c.low < 0 ? NaN : c.low }],
                    note: r.wrapped ? 'Out of ' + bits + ' bits: kept to them, as a computer does.' : 'Click a bit to turn it over.'
                };
            }

            // A function of logic: its products and sums made as small as they can be, its minterms and maxterms, its Karnaugh map
            // of 2 to 4 variables, and its truth table, X where it may be either
            function runLogic(n, raw) {
                var f = raw.e ? CalcMaths.logic(raw.e) : null, r, k, terms, none = [{ l: 'Sum of products', v: NaN, wide: true }, { l: 'Product of sums', v: NaN, wide: true }];
                if (!f) return { rows: none };
                if (f.error) {
                    return { rows: none, bad: ['e'], warn: true, note: {
                        expression: tr('{v}: variables as A, b or x1, with AND OR NOT XOR NAND NOR XNOR, + · \' and brackets; or Σm(1, 3) + d(7).', { v: (f.at < raw.e.length ? tr('Not one at "{at}"', { at: raw.e.slice(f.at, f.at + 8) }) : tr('It ends too soon')) }),
                        many: 'Up to 8 variables.', vars: 'F(A, B, C) = names each of its variables once, all that are in it.', range: 'A row\'s number beyond its variables: of 3, they are 0 to 7.'
                    }[f.error] };
                }
                r = CalcMaths.minimize(f);
                k = f.vars.length;
                terms = function (s, list) { return s + '(' + list.join(', ') + ')'; };
                return {
                    rows: drawnTile(karnaughDrawing(f, r.sopTerms), 'Karnaugh map').concat([
                        { l: 'Sum of products', text: f.name + ' = ' + r.sop, copy: r.sop, wide: true, wrap: true },
                        { l: 'Product of sums', text: f.name + ' = ' + r.pos, copy: r.pos, wide: true, wrap: true },
                        { l: 'Minterms', text: terms('Σm', r.ones) + (r.either.length ? ' + ' + terms('d', r.either) : ''), wide: true, wrap: true },
                        { l: 'Maxterms', text: terms('ΠM', r.zeros) + (r.either.length ? ' · ' + terms('D', r.either) : ''), wide: true, wrap: true },
                        { l: 'Truth table', m: f.out.map(function (o, row) {
                            return f.vars.map(function (v, j) { return (row >> (k - 1 - j)) & 1; }).concat(o === null ? 'X' : o);
                        }), head: f.vars.concat(f.name) }
                    ]),
                    note: (r.either.length ? 'X: either, as suits the products. ' : '') + (k > 4 ? 'A Karnaugh map is drawn of 2 to 4 variables.' : k > 1 ? 'Each product ringed on its map.' : '')
                };
            }

            // A Karnaugh map of 2 to 4 variables, the first ones down its side and the rest across, each in Gray code's order so
            // that cells side by side, and at the ends, are a variable apart; each product of terms ringed in a colour of its own,
            // in two or four pieces where it goes round the edges
            function karnaughDrawing(f, terms) {
                var k = f.vars.length, down = k >> 1, across = k - down, rows = 1 << down, cols = 1 << across, cell = 30, W = 300, gx, gy, i,
                    order = function (bits) { return bits === 1 ? [0, 1] : [0, 1, 3, 2]; }, rs, cs, body = '',
                    colours = ['#b0414d', '#2f6fd0', '#2e9e4f', '#e08a24', '#8e44ad', '#c9a227', '#1a9a9a', '#c4458f'];
                if (k < 2 || k > 4) return '';
                rs = order(down);
                cs = order(across);
                gx = (W - cols * cell) / 2 + 14;
                gy = 30;
                function code(v, bits) { return v.toString(2).padStart(bits, '0'); }
                body += svgText(gx - 8, gy - 8, f.vars.slice(0, down).join('') + ' \\ ' + f.vars.slice(down).join(''), 'end', 'calc-sv-bold');
                cs.forEach(function (c, j) { body += svgText(gx + (j + 0.5) * cell, gy - 8, code(c, across), 'middle'); });
                rs.forEach(function (rw, a) {
                    body += svgText(gx - 8, gy + (a + 0.5) * cell + 4, code(rw, down), 'end');
                    cs.forEach(function (c, b) {
                        var o = f.out[(rw << across) | c], x = gx + b * cell, y = gy + a * cell;
                        if (o === 1) body += '<rect class="calc-sv-under" x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '"/>';
                        body += svgText(x + cell / 2, y + cell / 2 + 4.5, o === null ? 'X' : String(o), 'middle', o === 1 ? 'calc-sv-bold' : 'calc-sv-small');
                    });
                });
                for (i = 0; i <= rows; i++) body += '<path class="calc-sv-axis" d="M' + gx + ' ' + (gy + i * cell) + 'H' + (gx + cols * cell) + '"/>';
                for (i = 0; i <= cols; i++) body += '<path class="calc-sv-axis" d="M' + (gx + i * cell) + ' ' + gy + 'V' + (gy + rows * cell) + '"/>';
                // the places along a side a product is on, in runs side by side: round the end, two
                function runs(on, n) {
                    var out = [];
                    if (on.every(Boolean)) return [[0, n - 1]];
                    on.forEach(function (x, j) {
                        if (!x) return;
                        if (out.length && out[out.length - 1][1] === j - 1) out[out.length - 1][1] = j;
                        else out.push([j, j]);
                    });
                    return out;
                }
                terms.forEach(function (t, g) {
                    var inset = 3 + (g % 3) * 2.5, colour = colours[g % colours.length], rm = (t[1] >> across) & (rows - 1), cm = t[1] & (cols - 1),
                        onRow = rs.map(function (rw) { return (rw & ~rm) === ((t[0] >> across) & (rows - 1)); }),
                        onCol = cs.map(function (c) { return (c & ~cm) === (t[0] & (cols - 1)); });
                    runs(onRow, rows).forEach(function (a) {
                        runs(onCol, cols).forEach(function (b) {
                            body += '<rect x="' + fix(gx + b[0] * cell + inset) + '" y="' + fix(gy + a[0] * cell + inset) + '" width="' + fix((b[1] - b[0] + 1) * cell - 2 * inset) +
                                '" height="' + fix((a[1] - a[0] + 1) * cell - 2 * inset) + '" rx="9" fill="none" stroke="' + colour + '" stroke-width="2"/>';
                        });
                    });
                });
                return svgOf('', W, gy + rows * cell + 6, 'Its Karnaugh map', body);
            }

            // A whole number in Gray code, or a Gray code's number: each in binary, decimal and hexadecimal, and the codes
            // about it drawn
            function runGray(n, raw) {
                var bits = n.bits, back = raw.way === '1', r = raw.e ? CalcMaths.bitwise(raw.e, bits) : null, none = [{ l: back ? 'Number' : 'Gray code', v: NaN, wide: true }],
                    one = BigInt(1), u, g, num, binary, fits;
                if (r && r.error) {
                    return { rows: none, bad: r.error === 'expression' ? ['e'] : [], warn: true, note: {
                        expression: 'A whole number, 5, 0xFF or 0b0111, or a calculation of them.',
                        zero: 'Division by 0.',
                        bits: 'Bits are 8, 16, 32 or 64.'
                    }[r.error] };
                }
                if (!r) return { rows: none };
                u = BigInt.asUintN(bits, r.value);
                fits = /^\s*\d+\s*$/.test(raw.e) && BigInt(raw.e) >> BigInt(bits) === BigInt(0); // a plain number below 2^bits is in range here, whose numbers have no sign
                num = back ? CalcMaths.fromGray(u, bits) : u;
                g = back ? u : CalcMaths.gray(u, bits);
                binary = function (v) { return CalcMaths.inBase(v, bits, 2).replace(/((?:[01]{4} ){7}[01]{4}) /g, '$1<br>'); }; // of 64 bits, 32 to a line
                return {
                    rows: drawnTile(grayDrawing(num, bits), 'The codes about it').concat([
                        { l: 'Gray code', text: binary(g), wide: true, bits: true }, { l: 'Number in binary', text: binary(num), wide: true, bits: true },
                        wholeTile('Number', num), wholeTile('Gray code as a number', g), { l: 'Gray in hexadecimal', text: CalcMaths.inBase(g, bits, 16) },
                        { l: 'Bit to change next', v: CalcMaths.bitCount(g ^ CalcMaths.gray(num + one, bits), bits).low } // of the last, the highest, round to 0
                    ]),
                    cols: 2, note: r.wrapped && !fits ? 'Out of ' + bits + ' bits: kept to them, as a computer does.' : 'A Gray code is the number XOR itself moved a bit right.'
                };
            }

            // the Gray codes of the numbers about one, a row each, its own in bold, the bit that changed from the row above ringed red;
            // of the lowest bits they need, from 4 to 16, each with its digit
            function grayDrawing(num, bits) {
                var two = BigInt(2), top = (BigInt(1) << BigInt(bits)) - BigInt(1), from = num < two ? BigInt(0) : num > top - two ? top - BigInt(4) : num - two,
                    list = [], i, w, cell, x0, body = '', last = null;
                for (i = 0; i < 5; i++) list.push(from + BigInt(i));
                w = Math.max(4, Math.min(16, list[4].toString(2).length));
                cell = Math.min(26, Math.floor(220 / w));
                x0 = (300 - w * cell) / 2 + 24;
                body += svgText(x0 - 14, 12, 'n', 'end') + svgText(x0 + w * cell / 2, 12, tr('Gray code{v}', { v: (w < bits ? tr(', its last {w} bits', { w: w }) : '') }), 'middle');
                list.forEach(function (v, row) {
                    var gv = CalcMaths.gray(v, bits), s = BigInt.asUintN(w, gv).toString(2).padStart(w, '0'), y = 20 + row * 21, changed = last === null ? -1 : CalcMaths.bitCount(gv ^ last, bits).low;
                    body += svgText(x0 - 14, y + 13.5, String(v), 'end', v === num ? 'calc-sv-bold' : 'calc-sv-small');
                    s.split('').forEach(function (c, j) {
                        var x = x0 + j * cell;
                        body += '<rect class="' + (c === '1' ? 'calc-sv-bar' : 'calc-sv-under') + '" x="' + (x + 1) + '" y="' + y + '" width="' + (cell - 2) + '" height="18" rx="2"/>';
                        if (cell >= 12) body += svgText(x + cell / 2, y + 13, c, 'middle', 'calc-sv-small');
                        if (w - 1 - j === changed) body += '<rect class="calc-sv-curve" x="' + (x + 0.5) + '" y="' + (y - 0.5) + '" width="' + (cell - 1) + '" height="19" rx="2"/>';
                    });
                    last = gv;
                });
                return svgOf('', 300, 20 + 5 * 21 + 2, 'The Gray codes about it', body);
            }

            // bits as boxes, 32 to a row, each in the colour of its part, a key of the parts under them: parts [[name, how many, colour]];
            // gap, a little room after every so many bits, as the bytes of an address
            function bitsDrawing(label, bits, parts, gap) {
                var W = 300, L = 8, cell = gap ? 8.3 : 8.875, rows = Math.ceil(bits.length / 32), body = '', colour = [], i, x, y, H;
                parts.forEach(function (p) { for (i = 0; i < p[1]; i++) colour.push(p[2]); });
                for (i = 0; i < bits.length; i++) {
                    x = L + (i % 32) * cell + (gap ? Math.floor((i % 32) / gap) * 4 : 0);
                    y = 8 + Math.floor(i / 32) * 20;
                    body += '<rect class="calc-bio-sq" x="' + fix(x) + '" y="' + y + '" width="' + fix(cell) + '" height="16" fill="' + colour[i] + '"/>' +
                        svgText(x + cell / 2, y + 11.5, bits[i], 'middle', 'calc-sv-small calc-sv-sub' + (bits[i] === '1' ? ' calc-sv-bold' : ''));
                }
                H = 8 + rows * 20 + 6;
                parts.forEach(function (p, k) {
                    var kx = L + k * 98;
                    body += '<rect class="calc-bio-sq" x="' + kx + '" y="' + H + '" width="10" height="10" fill="' + p[2] + '"/>' + svgText(kx + 14, H + 9, p[0]);
                });
                return svgOf('', W, H + 16, label, body);
            }

            // a number as a double and a float, their bits, and what each is to its last digit
            function runFloat(n, raw) {
                var r = raw.x ? CalcMaths.float(raw.x, engine.comma, app.deg) : null, none = [{ l: 'Double, 64 bits', v: NaN }, { l: 'Float, 32 bits', v: NaN }], e;
                if (!r) return { rows: none };
                if (r.error) return { rows: none, bad: ['x'], warn: true, note: 'A number, 0.1, pi or 1e-7, inf or nan; or its bits, 0x3FB999999999999A for a double, 0x3DCCCCCD for a float.' };
                e = r.bits.split(' ');
                return {
                    rows: drawnTile(bitsDrawing('Its ' + (e.join('').length) + ' bits: the sign, the exponent and the fraction', e.join(''), [['Sign', 1, '#f0b3b3'], [tr('Exponent, {e}', { e: e[1].length }), e[1].length, '#bcd0e6'],
                        [tr('Fraction, {e}', { e: e[2].length }), e[2].length, '#d3e5da']]), 'Its bits').concat([{ l: 'Number', v: r.x, wide: true }, { l: 'Double, 64 bits', text: '0x' + r.hex64, wide: true },
                        { l: 'Kept as a double', text: local(r.exact), wide: true, wrap: true },
                        { l: 'Sign', text: r.sign < 0 ? '–' : '+' }, { l: 'Exponent', v: r.exponent }, { l: 'Kind', text: r.kind },
                        { l: 'Sign · exponent · fraction', text: r.bits, wide: true, wrap: true, bits: true },
                        { l: 'Gap to the next', v: r.ulp, wide: true },
                        { l: 'As a float', v: r.float, wide: true }, { l: 'Float, 32 bits', text: '0x' + r.hex32, wide: true },
                        { l: 'Kept as a float', text: local(r.exact32), wide: true, wrap: true }]),
                    note: r.of === 32 ? 'The bits of a float, 32 of them: 16 hexadecimal digits are a double.' : r.kind === 'Subnormal' ? 'Subnormal: smaller than a double keeps to all its digits.' : ''
                };
            }

            // a whole number found, which may be too large to be put in: then read, on a tile of the width
            function wholeTile(l, b) {
                return b === null ? { l: l, v: NaN } : b <= BigInt(Number.MAX_SAFE_INTEGER) && b >= BigInt(-Number.MAX_SAFE_INTEGER) ? { l: l, v: Number(b) } :
                    { l: l, text: String(b), wide: true };
            }

            // a factor tree: the number down a stem, its smallest prime split off to the left at each step, each prime ringed;
            // of up to 10 primes in all, of a number not itself prime
            function factorTree(n, factors) {
                var primes = [], rest = n < 0 ? -n : n, W = 300, sx = 190, px = 120, step = 30, body = '', y, i;
                factors.forEach(function (pe) { for (i = 0; i < pe[1]; i++) primes.push(pe[0]); });
                if (primes.length < 2 || primes.length > 10) return '';
                function ring(x, y, t) {
                    return '<rect x="' + fix(x - 4 - 3.2 * t.length) + '" y="' + fix(y - 11) + '" width="' + fix(8 + 6.4 * t.length) + '" height="15" rx="7.5" fill="none" stroke="#b0414d" stroke-width="1.4"/>';
                }
                body += svgText(sx, 16, String(rest), 'middle', 'calc-sv-small calc-sv-bold');
                for (i = 0; i < primes.length - 1; i++) {
                    y = 16 + (i + 1) * step;
                    body += '<path class="calc-sv-seg calc-sv-thin" d="M' + sx + ' ' + (y - step + 5) + 'L' + px + ' ' + (y - 11) + 'M' + sx + ' ' + (y - step + 5) + 'V' + (y - 11) + '"/>';
                    rest = rest / primes[i];
                    body += ring(px, y, String(primes[i])) + svgText(px, y, String(primes[i]), 'middle', 'calc-sv-small calc-sv-red') +
                        (i === primes.length - 2 ? ring(sx, y, String(rest)) : '') + svgText(sx, y, String(rest), 'middle', i === primes.length - 2 ? 'calc-sv-small calc-sv-red' : 'calc-sv-small');
                }
                return svgOf('', W, 16 + primes.length * step - 12, 'Its factor tree, each prime ringed', body);
            }

            function runFactors(n, raw) {
                var r = raw.n ? CalcMaths.factorize(raw.n, engine.comma, app.deg, 64) : null, none = [{ l: 'Prime factors', v: NaN, wide: true }], f;
                if (!r) return { rows: none };
                if (r.error) return { rows: none, bad: ['n'], warn: true, note: 'A whole number of up to 20 digits: 360, 2^10, 10!.' };
                f = r.factors.map(function (pe) { return pe[0] + (pe[1] > 1 ? '<sup>' + pe[1] + '</sup>' : ''); }).join(' × ');
                return {
                    rows: drawnTile(r.prime ? '' : factorTree(r.n, r.factors), 'Its factor tree').concat([{ l: 'Prime factors', text: f ? (r.n < 0 ? '–1 × ' : '') + f : '–', wide: true }, { l: 'Prime', text: r.prime ? 'Yes' : 'No' },
                        { l: 'Divisors', v: r.count }, wholeTile('Sum of divisors', r.sum), wholeTile('Totient φ(n)', r.totient),
                        { l: 'Each divisor', text: r.divisors ? r.divisors.join(', ') : '–', wide: true, wrap: true }]),
                    note: r.n === BigInt(0) ? 'Every whole number divides 0.' : r.n === BigInt(1) || r.n === BigInt(-1) ? 'No prime factors.' :
                        !r.divisors ? 'Too many divisors to list.' : r.n < 0 ? 'Of its size: the factors of a number below 0 are those of its size, times –1.' : ''
                };
            }

            function runGcd(n, raw) {
                var r = raw.list ? CalcMaths.divisorsOf(raw.list, engine.comma, app.deg) : null, none = [{ l: 'GCD', v: NaN }, { l: 'LCM', v: NaN }];
                if (!r) return { rows: none };
                if (r.error) return { rows: none, bad: ['list'], warn: true, note: (engine.comma ? tr('{v} a whole number: 12, 18, 30, with ; or spaces between them.', { v: (r.at ? tr('{at} is not', { at: r.at }) : tr('Not')) }) : tr('{v} a whole number: 12, 18, 30, with commas or spaces between them.', { v: (r.at ? tr('{at} is not', { at: r.at }) : tr('Not')) })) };
                return {
                    rows: [wholeTile('GCD', r.gcd), wholeTile('LCM', r.lcm), { l: 'Coprime', text: r.n > 1 ? (r.gcd === BigInt(1) ? 'Yes' : 'No') : '–' }],
                    note: r.n < 2 ? 'Of two numbers or more.' : r.gcd === BigInt(1) ? 'They have no factor in common.' : ''
                };
            }

            // x between the two numbers of d places either side of it, halfway between them dashed, and the one it rounds to red
            function roundDrawing(x, d, lo, hi, to) {
                var W = 300, H = 50, y = 24, step = Math.pow(10, -d), a, b, px, body;
                if (![x, lo, hi, to].every(isFinite)) return '';
                if (lo === hi) { // a number of d places already
                    lo = CalcMaths.round(x - step);
                    hi = CalcMaths.round(x + step);
                }
                a = lo - (hi - lo) * 0.18;
                b = hi + (hi - lo) * 0.18;
                px = function (v) { return 10 + (W - 20) * (v - a) / (b - a); };
                body = '<path class="calc-sv-ground" d="M10 ' + y + 'H' + (W - 10) + '"/><path class="calc-sv-guide" d="M' + fix(px((lo + hi) / 2)) + ' ' + (y - 9) + 'V' + (y + 9) + '"/>';
                [lo, hi].forEach(function (v) {
                    body += '<path class="' + (v === to ? 'calc-sv-curve' : 'calc-sv-seg') + '" d="M' + fix(px(v)) + ' ' + (y - 7) + 'V' + (y + 7) + '"/>' +
                        svgText(px(v), y + 20, local(String(v)), 'middle', v === to ? 'calc-sv-small calc-sv-red' : '');
                });
                if (to !== lo && to !== hi) body += svgText(px(to), y + 20, local(String(to)), 'middle', 'calc-sv-small calc-sv-red');
                return svgOf('', W, H, 'Where x is between them, and what it rounds to', body + '<circle class="calc-sv-dot" cx="' + fix(px(x)) + '" cy="' + y + '" r="3.5"/>' +
                    svgText(px(x), y - 10, local(String(x)), 'middle'));
            }

            // two vectors as arrows from 0, at one scale both ways; of 3 numbers, z drawn slanting back
            function vectorsDrawing(u, v) {
                var flat = function (w) { return w.length === 3 ? [w[0] - 0.45 * w[2], w[1] - 0.3 * w[2]] : w; }, p, f, body = '';
                if (u.length > 3) return '';
                p = [[0, 0], flat(u), flat(v)];
                f = planeFit(p.map(function (q) { return q[0]; }), p.map(function (q) { return q[1]; }), 300, 130);
                if (f.x(0) > 0 && f.x(0) < 300) body += '<path class="calc-sv-axis" d="M' + f.x(0) + ' 0V130"/>';
                if (f.y(0) > 0 && f.y(0) < 130) body += '<path class="calc-sv-axis" d="M0 ' + f.y(0) + 'H300"/>';
                if (u.length === 3) body += '<path class="calc-sv-axis calc-sv-dash" d="M' + f.x(0) + ' ' + f.y(0) + 'L' + f.x(-0.45 * 1e3) + ' ' + f.y(-0.3 * 1e3) + '"/>'; // z, back
                body += svgArrow(f.x(0), f.y(0), f.x(p[1][0]), f.y(p[1][1]), 'calc-sv-curve') + svgArrow(f.x(0), f.y(0), f.x(p[2][0]), f.y(p[2][1]), 'calc-sv-seg');
                body += planeLabel(f, f.x(p[1][0]), f.y(p[1][1]), '<tspan font-weight="bold">u</tspan>', f.x(0), f.y(0), 9) +
                    planeLabel(f, f.x(p[2][0]), f.y(p[2][1]), '<tspan font-weight="bold">v</tspan>', f.x(0), f.y(0), 9);
                return svgOf('', 300, 130, 'The two vectors', body);
            }

            function runRound(n) {
                var x = n.x, d = n.d, ok = isFinite(x) && isFinite(d), bad = ok && (d !== Math.floor(d) || Math.abs(d) > 15);
                function to(how) { return ok && !bad ? CalcMaths.roundTo(x, d, how) : NaN; }
                return {
                    rows: [{ l: 'Rounded', v: to('round') }, { l: 'Down ⌊x⌋', v: to('floor') }, { l: 'Up ⌈x⌉', v: to('ceil') }, { l: 'Toward 0', v: to('trunc') },
                        { l: 'Fraction part', v: ok ? CalcMaths.round(x - CalcMaths.roundTo(x, 0, 'trunc')) : NaN },
                        { l: tr('To {v} figures', { v: (ok && d >= 1 && !bad ? d : 'd') }), v: ok && d >= 1 && !bad ? CalcMaths.significant(x, d) : NaN }].concat(ok && !bad ? drawnTile(roundDrawing(x, d, to('floor'), to('ceil'), to('round'))) : []),
                    note: bad ? 'Places are a whole number from –15 to 15.' : '', warn: bad
                };
            }

            // What is said of a square matrix whose answers are only so near, κ of its condition being
            // large: of about 16 digits, some log₁₀ κ are lost, and fewer than its 10 shown are right. '' where they are
            // of: 'rank', of a row reduced, its rank; 'eigen', of eigenvalues, those near 0; else of all worked out of it.
            // Each its own whole sentence, as each language says it, not the English of one changed
            function trustNote(a, of) {
                var k = a.every(function (r) { return r.every(isFinite); }) ? CalcMaths.condition(a) : NaN, right, said;
                if (!(k >= 1e6) || k === Infinity) return '';
                right = Math.max(0, Math.floor(16 - Math.log10(k)));
                said = { k: local(k.toPrecision(2).replace(/e\+?/, 'e')), v: (right ? trn(right, 'only about {n} digit', 'only about {n} digits') : tr('none of the digits')) };
                return of === 'rank' ? tr('Badly conditioned, κ ≈ {k}: {v} can be trusted: its rank may be less.', said) :
                    of === 'eigen' ? tr('Badly conditioned, κ ≈ {k}: {v} of its eigenvalues near 0, and of their eigenvectors, can be trusted.', said) :
                        tr('Badly conditioned, κ ≈ {k}: {v} of what is worked out of it can be trusted.', said);
            }

            // a note, and another after it, either of which may be '': each translated already, as the two together are not
            function notes(a, b) {
                return a && b ? a + ' ' + b : a || b;
            }

            function runMatrix(n, raw) {
                var a = matrixOf(n, 'a', raw.size), square = a.length === a[0].length, inv = square ? CalcMaths.inverse(a) : null,
                    bad = sizeOf(raw.size) ? [] : ['size'], power = n.power, whole = isFinite(power) && power === Math.floor(power) && Math.abs(power) <= 1000,
                    trust = inv && !bad.length ? trustNote(a) : '';
                return {
                    rows: [{ l: 'det A', v: square ? CalcMaths.det(a) : NaN }, { l: 'Rank', v: CalcMaths.rank(a) },
                        { l: 'A<sup>–1</sup>', m: inv }, { l: 'A<sup>T</sup>', m: CalcMaths.transpose(a) },
                        { l: 'A<sup>' + (whole ? local(String(power)).replace('-', '–') : 'n') + '</sup>', m: square && whole ? CalcMaths.matrixPower(a, power) : null }],
                    bad: bad, warn: !!bad.length || (square && !inv) || (isFinite(power) && !whole) || !!trust,
                    note: bad.length ? 'A size of rows and columns, each 1 to 10: 3×3, 2 3, or up to 10×10.' : !square ? 'Not square: no determinant, inverse or power.' :
                        isFinite(power) && !whole ? 'n is a whole number from –1000 to 1000.' : !inv ? tr('No inverse: its determinant is 0{v}', { v: (power < 0 ? tr(', so no power below 0.') : '.') }) : trust
                };
            }

            // a polynomial of λ, its coefficients the highest power first: λ² – 5λ + 6
            function polyText(c) {
                var n = c.length - 1;
                return c.map(function (a, k) {
                    var p = n - k, size = Math.abs(a);
                    if (!a) return '';
                    return (k ? (a < 0 ? ' – ' : ' + ') : a < 0 ? '–' : '') + (size === 1 && p ? '' : local(String(size))) + (p ? 'λ' + (p > 1 ? '<sup>' + p + '</sup>' : '') : '');
                }).join('');
            }

            function runEigen(n, raw) {
                var size = sizeOf(raw.size), a = matrixOf(n, 'a', raw.size), square = a.length === a[0].length, e = size && square ? CalcMaths.eigen(a) : null, rows, trust;
                if (!size) return { rows: [{ l: 'λ', v: NaN }], bad: ['size'], warn: true, note: 'A size of rows and columns, each 1 to 10: 3×3, 3, or up to 10×10.' };
                if (!square) return { rows: [{ l: 'λ', v: NaN }], warn: true, note: 'Not square: an eigenvalue is of a square matrix.' };
                if (!e) return { rows: [{ l: 'λ', v: NaN }] }; // a box that is not a number, marked
                rows = e.values.map(function (z, i) {
                    var l = 'λ<sub>' + (i + 1) + '</sub>';
                    return z.im ? { l: l, text: complexText(z) } : { l: l, v: z.re };
                });
                rows.push({ l: 'Trace', v: CalcMaths.round(a.reduce(function (s, r, i) { return s + r[i]; }, 0)) }, { l: 'det(λI – A)', text: polyText(e.poly), wide: true });
                if (e.values.length > 1) rows.push(planeTile(e.values, 0, 'Its eigenvalues on the plane'));
                e.vectors.forEach(function (v, i) {
                    rows.push({ l: 'v<sub>' + (i + 1) + '</sub> of λ = ' + local(String(v.value)), m: [v.v] });
                });
                trust = trustNote(a, 'eigen');
                return { rows: rows, warn: !!trust,
                    note: notes(e.values.some(function (z) { return z.im; }) ? tr('Its complex eigenvalues have eigenvectors of complex numbers, not shown here.') : '', trust) };
            }

            // The unknowns, or where there are many all of them, x = p + t₁v₁ + …, and where there are
            // none the nearest by least squares; and [A | b] with its rows reduced
            function runAxb(n, raw) {
                var size = sizeOf(raw.size), a = matrixOf(n, 'a', raw.size), b = matrixOf(n, 'b', (size || [2, 2])[0] + '×1').map(function (r) { return r[0]; }),
                    r = size ? CalcMaths.system(a, b) : null, rows = [], k, x = r && (r.x || r.p || r.least && r.least.x), name, trust;
                name = function (k) { return 'x<sub>' + (k + 1) + '</sub>'; };
                for (k = 0; k < a[0].length; k++) rows.push({ l: name(k), v: x ? x[k] : NaN });
                if (r && r.many) {
                    rows.push({ l: 'All of them', text: '<b>x</b> = <b>p</b>' + r.basis.map(function (v, i) { return ' + t<sub>' + (i + 1) + '</sub><b>v</b><sub>' + (i + 1) + '</sub>'; }).join(''), wide: true },
                        { l: '<b>p</b>', m: [r.p] });
                    r.basis.forEach(function (v, i) { rows.push({ l: '<b>v</b><sub>' + (i + 1) + '</sub>', m: [v] }); });
                }
                if (r && r.none && r.least) rows.push({ l: '|A<b>x</b> – <b>b</b>|', v: r.least.residual });
                if (r) rows.push({ l: '[A | <b>b</b>] reduced', m: r.rref });
                trust = r && r.x && a.length === a[0].length ? trustNote(a) : '';
                return {
                    rows: rows, bad: size ? [] : ['size'], warn: !size || !!trust,
                    note: !size ? 'A size of rows and columns, each 1 to 10: 3×3, 3 2, or up to 10×10.' : !r ? '' :
                        r.none ? tr('No answer: the equations cannot all hold. The x above is the nearest, by least squares{v}', { v: (r.least && r.least.many ? tr(', one of many as near.') : '.') }) :
                        r.many ? 'Many answers: x is p and any of the v, each times a number t; the x above is p, each t 0.' : trust
                };
            }

            function runRref(n, raw) {
                var size = sizeOf(raw.size || '3'), a = matrixOf(n, 'a', raw.size || '3'), r = size ? CalcMaths.rref(a) : null, rows, trust;
                if (!r) return { rows: [{ l: 'rref A', m: null }], bad: ['size'], warn: true, note: 'A size of rows and columns, each 1 to 10: 3×3, 2 3, or up to 10×10.' };
                rows = [{ l: 'rref A', m: r.m }, { l: 'Rank', v: r.rank }, { l: 'Nullity', v: r.kernel.length },
                    { l: 'Columns of its first 1s', text: r.pivots.length ? r.pivots.map(function (c) { return c + 1; }).join(', ') : 'none', wide: true }];
                r.kernel.forEach(function (v, i) { rows.push({ l: tr('Null space <b>v</b><sub>{i}</sub>', { i: (i + 1) }), m: [v] }); });
                trust = a.length === a[0].length && r.rank === a.length ? trustNote(a, 'rank') : '';
                return { rows: rows, warn: !!trust, note: notes(r.kernel.length ? tr('Its null space: each v, and each sum of them times numbers, A takes to 0.') : tr('Only 0 does it take to 0.'), trust) };
            }

            function runLu(n, raw) {
                var size = sizeOf(raw.size), a = matrixOf(n, 'a', raw.size), f = size ? CalcMaths.lu(a) : null, q = size ? CalcMaths.qr(a) : null;
                if (!size) return { rows: [{ l: 'L', m: null }], bad: ['size'], warn: true, note: 'A size of rows and columns, each 1 to 10: 3×3, 3 2, or up to 10×10.' };
                return {
                    rows: [{ l: 'P', m: f && f.p }, { l: 'L', m: f && f.l }, { l: 'U', m: f && f.u }, { l: 'Q', m: q.q }, { l: 'R', m: q.r }],
                    note: f ? 'P A = L U and A = Q R.' : 'Not square: no L U; A = Q R.'
                };
            }

            function runVectors(n, raw) {
                var u = raw.u ? CalcMaths.vectorOf(raw.u, engine.comma, app.deg) : null, v = raw.v ? CalcMaths.vectorOf(raw.v, engine.comma, app.deg) : null, r, bad = [],
                    none = [{ l: '<b>u</b> · <b>v</b>', v: NaN }, { l: '<b>u</b> × <b>v</b>', v: NaN }];
                if (raw.u && !u) bad.push('u');
                if (raw.v && !v) bad.push('v');
                if (bad.length) return { rows: none, bad: bad, warn: true, note: 'A vector is 2 to 4 numbers, 1, 2, 3, ' + (engine.comma ? 'with ; or spaces' : 'with commas or spaces') + ' between them.' };
                if (!u || !v) return { rows: none };
                if (u.length !== v.length) return { rows: none, warn: true, note: 'Two vectors of one size.' };
                r = CalcMaths.vectors(u, v, app.deg);
                return {
                    rows: [{ l: '<b>u</b> · <b>v</b>', v: r.dot }, r.cross === null ? { l: '<b>u</b> × <b>v</b>', v: NaN } : typeof r.cross === 'number' ? { l: '<b>u</b> × <b>v</b>', v: r.cross } : { l: '<b>u</b> × <b>v</b>', m: [r.cross] },
                        { l: '|<b>u</b>|', v: r.lengths[0] }, { l: '|<b>v</b>|', v: r.lengths[1] }, { l: 'Angle', v: r.angle },
                        { l: '<b>u</b> on <b>v</b>', m: r.projection && [r.projection] }, { l: '<b>u</b> of length 1', m: r.unit && [r.unit] }].concat(drawnTile(vectorsDrawing(u, v))),
                    note: tr('{v}The angle in {v2}, the unit in use.', { v: (u.length === 2 ? tr('Of two of 2, the cross product is the one number of it, out of the plane. ') : u.length === 4 ? tr('No cross product of 4. ') : ''), v2: [tr('radians'), tr('degrees'), tr('gradians')][app.deg] })
                };
            }

            // Complex numbers drawn on the plane, as a tile: a dot for each, the axes through 0, and a
            // circle about 0 of radius r where given; the second color for the second of two
            function planeTile(points, r, label) {
                var big = Math.max.apply(null, [r || 0].concat(points.map(function (z) { return Math.max(Math.abs(z.re), Math.abs(z.im)); }))) || 1,
                    svg = '<svg class="calc-sv-plane" viewBox="-1.3 -1.3 2.6 2.6" aria-hidden="true">' +
                        '<line x1="-1.3" y1="0" x2="1.3" y2="0"/><line x1="0" y1="-1.3" x2="0" y2="1.3"/>' +
                        (r ? '<circle cx="0" cy="0" r="' + r / big + '" class="calc-sv-ring"/>' : '') +
                        points.map(function (z, i) {
                            return '<circle cx="' + (z.re / big).toFixed(4) + '" cy="' + (-z.im / big).toFixed(4) + '" r="0.07" fill="' + graphPart.GRAPH_CURVES[points.length === 2 && i === 1 ? 1 : 0] + '"/>';
                        }).join('') + '</svg>';
                return { l: label || 'On the plane', text: svg, wide: true };
            }

            // a polynomial of complex coefficients written out, the highest power first
            function cpolyHtml(c) {
                var n = c.length - 1, out = '';
                c.forEach(function (z, k) {
                    var p = n - k, power = p ? 'x' + (p > 1 ? '<sup>' + p + '</sup>' : '') : '', text;
                    if (!z[0] && !z[1]) return;
                    if (!z[1] || !z[0]) { // one part: a sign of its own
                        text = !z[1] ? (Math.abs(z[0]) === 1 && p ? '' : local(String(Math.abs(z[0])))) : complexText({ re: 0, im: Math.abs(z[1]) });
                        out += (out ? ((z[1] || z[0]) < 0 ? ' – ' : ' + ') : (z[1] || z[0]) < 0 ? '–' : '') + text + power;
                    } else {
                        out += (out ? ' + ' : '') + '(' + complexText({ re: z[0], im: z[1] }) + ')' + power;
                    }
                });
                return out || '0';
            }

            function runCpoly(n, raw) {
                var none = [{ l: 'z', v: NaN }], r = raw.p ? CalcMaths.cpolynomial(raw.p, engine.comma, app.deg) : null, z, why;
                if (!r) return { rows: none };
                why = {
                    polynomial: (engine.comma ? tr('Not a polynomial of x yet: x^2 + (1 + i)x + 2i, or its coefficients from the highest power, 1; 1 + i; 2i.') : tr('Not a polynomial of x yet: x^2 + (1 + i)x + 2i, or its coefficients from the highest power, 1, 1 + i, 2i.')),
                    letters: tr('Only x and i have values here: write the other letters as numbers.'),
                    power: tr('Up to the power 30.')
                }[r.error];
                if (why) return { rows: none, bad: ['p'], warn: true, note: why };
                z = CalcMaths.cpoly(r.c);
                if (!z) return { rows: none, warn: true, note: 'No x left: its coefficients of x are all 0.' };
                return {
                    rows: [{ l: 'Multiplied out', text: cpolyHtml(r.c), wide: true, wrap: true }].concat(z.map(function (w, i) {
                        return w.im ? { l: rootName(i, z.length, 'z'), text: complexText(w) } : { l: rootName(i, z.length, 'z'), v: w.re };
                    }), [planeTile(z)])
                };
            }

            function runAnyBase(n, raw) {
                var none = [{ l: tr('In base {v}', { v: (isFinite(n.to) ? n.to : 'b') }), text: '–', wide: true }], from = n.from, to = n.to, f, out, about, ok = function (b) { return b >= 2 && b <= 36 && b === Math.floor(b); };
                if (!raw.x) return { rows: none };
                if (!ok(from) || !ok(to)) return { rows: none, warn: true, note: 'Bases are whole numbers from 2 to 36.' };
                f = CalcMaths.fromBase(raw.x, from);
                if (!f) return { rows: none, bad: ['x'], warn: true, note: tr('Not a number of base {from}: digits 0 to {top}, a point, and a part in brackets that comes again, 0.(3).', { from: from, top: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(from - 1) }) };
                out = CalcMaths.toBase(f[0], f[1], to, 64);
                about = CalcMaths.about(f[0], f[1]);
                return {
                    rows: [{ l: tr('In base {to}', { to: to }), text: out, wide: true, wrap: true },
                        { l: 'Decimal', v: typeof about === 'number' ? about : NaN },
                        { l: 'Fraction', text: f[1] === BigInt(1) ? '–' : String(f[0]).replace('-', '–') + '/' + f[1] }],
                    note: /…/.test(out) ? 'It goes on past 64 digits before it comes round.' : ''
                };
            }

            function runCodes(n, raw) {
                var text = raw.t ? raw.t : raw.c ? CalcMaths.fromCodes(raw.c) : null, c, hex = function (v, w) { return v.toString(16).toUpperCase().padStart(w, '0'); },
                    none = [{ l: 'Code points', text: '–', wide: true }];
                if (raw.c && !raw.t && text === null) return { rows: none, bad: ['c'], warn: true, note: 'Codes, apart by spaces: U+00E9 for code points, 0xC3 0xA9 for the bytes of UTF-8, or 233.' };
                if (text === null) return { rows: none };
                c = CalcMaths.textCodes(text);
                return {
                    rows: [{ l: 'Text', text: escaped(text) || '–', wide: true, wrap: true },
                        { l: 'Code points', text: c.points.map(function (v) { return 'U+' + hex(v, 4); }).join(' '), wide: true, wrap: true },
                        { l: 'Decimal', text: c.points.join(' '), wide: true, wrap: true },
                        { l: 'UTF-8', text: c.utf8.map(function (v) { return hex(v, 2); }).join(' '), wide: true, wrap: true },
                        { l: 'UTF-8 in binary', text: c.utf8.map(function (v) { return v.toString(2).padStart(8, '0'); }).join(' '), wide: true, wrap: true, bits: true },
                        { l: 'UTF-16', text: c.utf16.map(function (v) { return hex(v, 4); }).join(' '), wide: true, wrap: true },
                        { l: 'Characters', v: c.points.length }, { l: 'Bytes of UTF-8', v: c.utf8.length }],
                    note: raw.t && raw.c ? 'Of the text: the codes box is read while the text is empty.' : ''
                };
            }

            // A text in Base64, 32, 58 or 85, as its bytes of UTF-8 are; or the text of one, and its bytes, where they are not text
            var ENCODINGS = [ // in the order of their buttons, Base64 the one at first
                { name: 'Base32', to: CalcMaths.toBase32, from: CalcMaths.fromBase32, not: 'Not Base32: of A–Z and 2–7, eight letters for each five bytes, = filling the last eight.' },
                { name: 'Base58', to: CalcMaths.toBase58, from: CalcMaths.fromBase58, not: 'Not Base58: of 1–9, A–Z and a–z but 0, O, I and l.' },
                { name: 'Base64', to: CalcMaths.toBase64, from: CalcMaths.fromBase64, not: 'Not Base64: of A–Z, a–z, 0–9 and + and / or - and _, four letters for each three bytes, = filling the last four.' },
                { name: 'Base85', to: CalcMaths.toBase85, from: CalcMaths.fromBase85, not: 'Not Base85: of ! to u, five letters for each four bytes, z for four 0s, between <~ and ~> if you like.' }
            ];

            function runBase64(n, raw) {
                var how = ENCODINGS[+raw.enc] || ENCODINGS[2], none = [{ l: how.name, text: '–', wide: true }], bytes, text = null, hex, encoded;
                if (raw.t) {
                    bytes = Array.from(new TextEncoder().encode(raw.t));
                } else if (raw.b) {
                    bytes = how.from(raw.b);
                    if (!bytes) return { rows: none, bad: ['b'], warn: true, note: how.not };
                    try {
                        text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
                    } catch (e) { }
                } else {
                    return { rows: none };
                }
                hex = CalcMaths.hexOfBytes(bytes, ' ').toUpperCase();
                encoded = raw.t ? how.to(bytes) : '';
                return {
                    rows: raw.t ? [{ l: how.name, text: encoded || '–', wide: true, wrap: true }].concat(how.name === 'Base64' ? [{ l: 'For web addresses', text: CalcMaths.toBase64(bytes, true) || '–', wide: true, wrap: true }] : [],
                        [{ l: 'Bytes of UTF-8', text: hex || '–', wide: true, wrap: true }, { l: 'Bytes', v: bytes.length }, { l: tr('Letters of {name}', { name: how.name }), v: encoded.length }]) :
                        [{ l: 'Text', text: text === null ? '–' : escaped(text) || '–', wide: true, wrap: true }, { l: 'Bytes', text: hex || '–', wide: true, wrap: true }, { l: 'Bytes', v: bytes.length }],
                    note: raw.t && raw.b ? 'Of the text: the box of what is encoded is read while the text is empty.' : text === null && !raw.t ? 'Not text of UTF-8: its bytes alone.' : ''
                };
            }

            // The hashes of a text's bytes of UTF-8, each to copy; a hash typed in hexadecimal or Base64 matched against them
            function runHash(n, raw) {
                var none = [{ l: 'SHA-256', text: '–', wide: true }], bytes, rows, want, match;
                if (!raw.t) return { rows: none, note: raw.h ? 'Of a text: type it to check the hash against.' : '' };
                bytes = Array.from(new TextEncoder().encode(raw.t));
                rows = [['MD5', CalcMaths.md5(bytes)], ['SHA-1', CalcMaths.sha1(bytes)], ['SHA-256', CalcMaths.sha256(bytes)], ['SHA-512', CalcMaths.sha512(bytes)]].map(function (h) {
                    return { l: h[0], text: CalcMaths.hexOfBytes(h[1]), copy: CalcMaths.hexOfBytes(h[1]), wide: true, wrap: true, b: h[1] };
                });
                rows.push({ l: 'SHA-256 for integrity', text: 'sha256-' + CalcMaths.toBase64(rows[2].b), copy: 'sha256-' + CalcMaths.toBase64(rows[2].b), wide: true, wrap: true, b: rows[2].b });
                rows.push({ l: 'CRC-32', text: CalcMaths.crc32(bytes).toString(16).padStart(8, '0'), copy: CalcMaths.crc32(bytes).toString(16).padStart(8, '0'), wide: true });
                rows.push({ l: 'Bytes', v: bytes.length });
                if (raw.h) {
                    want = raw.h.trim().replace(/^sha\d+-/i, '');
                    match = rows.filter(function (r) {
                        return r.text && (/^[0-9a-f\s:]+$/i.test(want) ? want.replace(/[\s:]/g, '').toLowerCase() === r.text : r.b && CalcMaths.toBase64(r.b).replace(/=+$/, '') === want.replace(/=+$/, ''));
                    })[0];
                }
                rows.forEach(function (r) { delete r.b; });
                return {
                    rows: rows, bad: raw.h && !match ? ['h'] : undefined, warn: !!(raw.h && !match),
                    note: !raw.h ? 'MD5 and SHA-1 are broken: for checking a download alone, never for passwords.' : match ? tr('It matches the {l}.', { l: match.l }) : 'It matches none of them.'
                };
            }

            // Five new UUIDs of the version chosen, from the browser's strong random bytes, those of
            // version 7 in order; or one typed read: its version, variant, the time it was made and it in
            // other ways. Each to copy
            var UUID_VERSIONS = {
                1: '1, of the time and a node', 2: '2, DCE security', 3: '3, of a name, MD5', 4: '4, random', 5: '5, of a name, SHA-1',
                6: '6, of the time, in order', 7: '7, of Unix time', 8: '8, of its own kind'
            };

            // Five new UUIDs of the version chosen, made anew each time it runs: a click on a version, the one chosen too
            function runUuid(n, raw) {
                var ver = raw.ver === '1' ? 7 : 4, made = [], at = Date.now(), bytes, k;
                for (k = 0; k < 5; k++) {
                    bytes = new Uint8Array(16);
                    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
                    else bytes = bytes.map(function () { return Math.floor(Math.random() * 256); });
                    made.push(CalcMaths.makeUuid(ver, Array.from(bytes), at));
                }
                if (ver === 7) made.sort();
                return { rows: made.map(function (u, i) { return { l: 'UUID ' + (i + 1), text: u, copy: u, wide: true }; }),
                    note: ver === 7 ? 'The time now, to the millisecond, then 74 random bits.' : '122 random bits, and 6 of its version and variant.' };
            }

            // A UUID typed: its version and variant, the time it was made, and it in hexadecimal, Base64 and as a whole number
            function runUuidRead(n, raw) {
                var none = [{ l: 'UUID', text: '–', wide: true }], v, out = [], at, hex, b64, b64url, whole;
                if (!raw.u) return { rows: none };
                v = CalcMaths.readUuid(raw.u);
                if (!v) return { rows: none, bad: ['u'], warn: true, note: 'A UUID is 32 hexadecimal digits, 8-4-4-4-12 with hyphens, or none: f81d4fae-7dec-11d0-a765-00a0c91e6bf6.' };
                hex = '0x' + v.text.replace(/-/g, '').toUpperCase();
                out.push({ l: 'UUID', text: v.text, copy: v.text, wide: true });
                out.push({ l: 'Version', text: v.nil ? 'Nil, all 0' : v.max ? 'Max, all 1' : v.version === null ? 'None: not of RFC 9562' : UUID_VERSIONS[v.version] || tr('{version}, of none yet', { version: v.version }), wide: true });
                if (!v.nil && !v.max) out.push({ l: 'Variant', text: { NCS: 'NCS, of the 1980s', RFC: 'RFC 9562', Microsoft: 'Microsoft, of old', Future: 'Kept for the future' }[v.variant], wide: true });
                if (v.time !== null) {
                    at = new Date(Math.floor(v.time));
                    out.push({ l: 'Made, in UTC', text: at.toISOString().replace('T', ', ').replace('Z', ''), wide: true },
                        { l: 'Made, here', text: at.toLocaleString(app.DATE_LANG, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }), wide: true });
                }
                b64 = CalcMaths.toBase64(v.bytes);
                b64url = CalcMaths.toBase64(v.bytes, true);
                whole = BigInt(hex).toString();
                out.push({ l: 'Hexadecimal', text: hex, copy: hex, wide: true },
                    { l: 'Base64', text: b64, copy: b64, wide: true },
                    { l: 'For web addresses', text: b64url, copy: b64url, wide: true },
                    { l: 'As a whole number', text: whole, copy: whole, wide: true, wrap: true });
                return { rows: out, note: 'Its hexadecimal, pasted into Bits of 128, shows its bits.' };
            }

            // The network of an IPv4 address: its network and broadcast addresses, mask, hosts and kind
            function runSubnet(n, raw) {
                var none = [{ l: 'Network', text: '–', wide: true }], r = raw.ip ? CalcMaths.subnet(raw.ip) : null, ip = CalcMaths.ipText;
                if (!r) return { rows: none };
                if (r.error) return { rows: none, bad: ['ip'], warn: true, note: {
                    address: r.v6 ? 'An IPv6 address, up to eight groups of up to four hexadecimal digits with colons between them, :: for a run of 0s, and its prefix: 2001:db8::1/48.' :
                        'An IPv4 address, four numbers from 0 to 255 with dots between them, and its prefix or mask: 192.168.1.10/24, or 192.168.1.10 255.255.255.0; or an IPv6 address, 2001:db8::1/48.',
                    prefix: tr('The prefix is from /0 to /{v}: how many bits, from the left, are of the network.', { v: (r.v6 ? 128 : 32) }),
                    mask: 'Not a mask: its 1s are all on the left, 255.255.255.0, 255.255.240.0.'
                }[r.error] };
                if (r.v6) return runSubnet6(r);
                return {
                    rows: drawnTile(bitsDrawing(tr('The address, its first {prefix} bits the network', { prefix: r.prefix }), CalcMaths.inBase(BigInt(r.address), 32, 2).replace(/ /g, ''),
                        [[tr('Network, {prefix}', { prefix: r.prefix }), r.prefix, '#bcd0e6'], [tr('Host, {v}', { v: (32 - r.prefix) }), 32 - r.prefix, '#d3e5da']], 8), 'Its bits').concat([{ l: 'Network', text: ip(r.network) + '/' + r.prefix, wide: true }, { l: 'Broadcast', text: ip(r.broadcast), wide: true },
                        { l: 'Mask', text: ip(r.mask), wide: true }, { l: 'Wildcard', text: ip(r.wildcard), wide: true },
                        { l: 'First host', text: ip(r.first), wide: true }, { l: 'Last host', text: ip(r.last), wide: true },
                        { l: 'Hosts', v: r.hosts }, { l: 'Addresses', v: r.all }, { l: 'Kind', text: r.kind }, // the three on one line
                        { l: 'Address in binary', text: CalcMaths.inBase(BigInt(r.address), 32, 2).replace(/ /g, '').replace(/(\d{8})(?=\d)/g, '$1.'), wide: true, bits: true },
                        { l: 'Mask in binary', text: CalcMaths.inBase(BigInt(r.mask), 32, 2).replace(/ /g, '').replace(/(\d{8})(?=\d)/g, '$1.'), wide: true, bits: true }]),
                    note: !r.given ? 'Of the address alone, /32: add its prefix, /24, for its network.' : r.prefix === 31 ? 'A /31 links two hosts, both of them given out, by RFC 3021.' :
                        r.prefix === 32 ? 'A /32 is one address.' : 'Hosts are all its addresses but the first, the network, and the last, its broadcast.'
                };
            }

            // A count of addresses of IPv6, a power of 2: as a number while it is one exactly, else 2ⁿ and all its digits
            function powerTile(l, count) {
                var bits = count.toString(2).length - 1;
                return count <= BigInt(Number.MAX_SAFE_INTEGER) ? { l: l, v: Number(count) } : { l: l, text: '2<sup>' + bits + '</sup> = ' + count, wide: true, wrap: true };
            }

            // The network of an IPv6 address: no broadcast, mask or hosts kept from it, as IPv4 has; each of its
            // addresses may be given out. Its address in full and as it is written short, and its name for reverse DNS
            function runSubnet6(r) {
                var ip = CalcMaths.ipv6Text;
                return {
                    rows: [{ l: 'Network', text: ip(r.network) + '/' + r.prefix, wide: true }, { l: 'Address', text: ip(r.address), wide: true },
                        { l: 'In full', text: ip(r.address, true), wide: true, wrap: true },
                        { l: 'First address', text: ip(r.network), wide: true }, { l: 'Last address', text: ip(r.last), wide: true, wrap: true },
                        powerTile('Addresses', r.all), r.subnets === null ? { l: '/64 networks', text: '–' } : powerTile('/64 networks', r.subnets), { l: 'Kind', text: r.kind, wide: true },
                        { l: 'Reverse DNS', text: r.reverse, wide: true, wrap: true }],
                    note: !r.given ? 'Of the address alone, /128: add its prefix, /64, for its network.' : r.prefix > 64 ? 'Smaller than a /64, the size of a network of hosts that make their own addresses.' :
                        'IPv6 has no broadcast address: each address of the network may be given out.'
                };
            }

            function runModular(n, raw) {
                var none = [{ l: 'a mod m', v: NaN }], r, s;
                if (!raw.a || !raw.m) return { rows: none };
                r = CalcMaths.modular([raw.a, raw.b || '1', raw.m], engine.comma, app.deg);
                if (r.error) {
                    return { rows: none, bad: r.error === 'whole' ? [r.at] : ['m'], warn: true,
                        note: r.error === 'whole' ? tr('{at} is a whole number, of up to 200 digits.', { at: r.at }) : 'm is a whole number above 0.' };
                }
                s = r.solve;
                return {
                    rows: [wholeTile('a mod m', r.mod), raw.b ? wholeTile('a<sup>b</sup> mod m', r.power) : { l: 'a<sup>b</sup> mod m', v: NaN }, wholeTile('a<sup>–1</sup> mod m', r.inverse),
                        { l: 'a x ≡ b (mod m)', text: !raw.b ? '–' : s ? tr('x ≡ {x} (mod {step}){v}', { x: s.x, step: s.step, v: (s.count > BigInt(1) ? tr(', {count} of them below m', { count: s.count }) : '') }) : 'none', wide: true, wrap: true }],
                    note: r.inverse === null ? 'a and m have a factor in common: a has no inverse mod m' + (raw.b && r.power === null ? ', so no power below 0.' : '.') : ''
                };
            }

            function runChinese(n, raw) {
                var none = [{ l: 'x', v: NaN }], r = raw.list ? CalcMaths.chinese(raw.list, engine.comma, app.deg) : null;
                if (!r) return { rows: none };
                if (r.error) return { rows: none, bad: ['list'], warn: true, note: (engine.comma ? tr('{v} of the form 2 mod 3, with ; between them.', { v: (r.at ? tr('{at}: not', { at: r.at }) : tr('Not')) }) : tr('{v} of the form 2 mod 3, with commas between them.', { v: (r.at ? tr('{at}: not', { at: r.at }) : tr('Not')) })) };
                if (r.none) return { rows: none, warn: true, note: 'None: they cannot all hold, their moduli having a factor in common.' };
                return { rows: [wholeTile('x', r.x), wholeTile('Modulus', r.m), { l: 'All of them', text: tr('x ≡ {x} (mod {m})', { x: r.x, m: r.m }), wide: true, wrap: true }] };
            }

            function runExact(n, raw) {
                var none = [{ l: 'Exactly', text: '–', wide: true }], r = raw.e ? CalcMaths.exact(raw.e, engine.comma) : null, top, about, digits;
                if (!r) return { rows: none };
                if (r.error) {
                    return { rows: none, bad: r.error === 'expression' ? ['e'] : [], warn: true, note: {
                        expression: tr('Of whole numbers and fractions: + – × ÷, ^, n!, nCr, nPr, C(n{v} k), P(n{v} k), fib(n).', { v: (engine.comma ? ';' : ',') }),
                        large: 'More than 20000 digits.',
                        zero: 'Division by 0.',
                        whole: 'n! and a choice of whole numbers up to 5000, fib(n) of one, a power of a whole number.'
                    }[r.error] };
                }
                top = String(r.top).replace('-', '–');
                about = CalcMaths.about(r.top, r.bottom);
                digits = String(r.top).replace('-', '').length;
                return {
                    rows: [{ l: 'Exactly', text: r.bottom === BigInt(1) ? top : top + '/' + r.bottom, wide: true, wrap: true },
                        { l: r.bottom === BigInt(1) ? 'Digits' : 'Digits of the top', v: digits },
                        typeof about === 'number' ? { l: 'About', v: about } : { l: 'About', text: about.replace('-', '–').replace(/e(-?)(\d+)$/, function (m, s, e) { return ' × 10<sup>' + (s ? '–' : '') + e + '</sup>'; }) }]
                        .concat(r.bottom === BigInt(1) ? [] : [{ l: 'Decimal', text: CalcMaths.toBase(r.top, r.bottom, 10, 60).replace('-', '–'), wide: true, wrap: true }])
                };
            }

            function runPrimes(n, raw) {
                var none = [{ l: 'Prime', text: '–' }], r = raw.n ? CalcMaths.primesNear(raw.n, engine.comma, app.deg) : null;
                if (!r) return { rows: none };
                if (r.error) return { rows: none, bad: ['n'], warn: true, note: 'A whole number of up to 24 digits.' };
                return {
                    rows: [{ l: 'Prime', text: r.prime ? 'Yes' : 'No' }, wholeTile('Previous prime', r.previous), wholeTile('Next prime', r.next),
                        { l: 'π(n), primes up to n', v: r.count === null ? NaN : r.count }, { l: 'The n-th prime', v: r.nth === null ? NaN : r.nth }],
                    note: r.count === null ? 'π(n) and the n-th prime up to 10 million.' : r.nth === null && r.n > BigInt(0) ? 'The n-th prime while it is up to 10 million.' : ''
                };
            }

            function runBetween2(n, raw) {
                var none = [{ l: 'How many', v: NaN }], r = raw.a && raw.b ? CalcMaths.primesBetween([raw.a, raw.b], engine.comma, app.deg, 200) : null;
                if (!r) return { rows: none };
                if (r.error) return { rows: none, bad: r.error === 'whole' ? ['a', 'b'] : [], warn: true, note: r.error === 'whole' ? 'Whole numbers.' : 'To up to 10¹⁴, the two up to 10 million apart.' };
                return {
                    rows: [{ l: 'How many', v: r.count }, { l: 'The primes', text: r.list.length ? r.list.join(', ') + (r.more ? ' …' : '') : 'none', wide: true, wrap: true }],
                    note: r.more ? 'The first 200 of them.' : ''
                };
            }

            // a fraction as pies: a whole one for each whole, up to 5, and one cut in b slices with the rest of t shaded, of b up to 60;
            // of more, the part shaded alone
            function pieDrawing(whole, rest, b) {
                var W = 300, k = Math.min(Number(whole), 5), many = whole > BigInt(5), pies = k + (rest ? 1 : 0), R = pies > 4 ? 21 : 26, step, cy = 34, body = '', i, x, f = Number(rest) / Number(b), n = Number(b);
                if (!pies) return '';
                step = pies > 1 ? Math.min(2 * (R + 8), (W - 2 * R - 8) / (pies - 1)) : 0; // 5 or 6 smaller and closer, to stay on the canvas
                function at(x, t) { return fix(x + R * Math.sin(2 * Math.PI * t)) + ' ' + fix(cy - R * Math.cos(2 * Math.PI * t)); }
                for (i = 0; i < pies; i++) {
                    x = W / 2 - (pies - 1) * step / 2 + i * step;
                    if (i < k) body += '<circle cx="' + fix(x) + '" cy="' + cy + '" r="' + R + '" fill="#f0b3b3" stroke="#b0414d" stroke-width="1.2"/>';
                    else {
                        body += '<circle cx="' + fix(x) + '" cy="' + cy + '" r="' + R + '" fill="#d3e5da"/>' + (f > 0 && f < 1 ? '<path d="M' + fix(x) + ' ' + cy + 'L' + at(x, 0) + 'A' + R + ' ' + R + ' 0 ' + (f > 0.5 ? 1 : 0) + ' 1 ' +
                            at(x, f) + 'Z" fill="#f0b3b3"/>' : '');
                        if (n <= 60) for (var j = 0; j < n; j++) body += '<path class="calc-sv-seg calc-sv-thin" d="M' + fix(x) + ' ' + cy + 'L' + at(x, j / n) + '" stroke-width="' + (n > 24 ? 0.5 : 0.9) + '"/>';
                        body += '<circle cx="' + fix(x) + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="#b0414d" stroke-width="1.2"/>';
                    }
                }
                return svgOf('', W, 74, 'The fraction as pies, each whole one shaded', body + svgText(W / 2, 72, (many ? tr('{whole} whole, 5 drawn', { whole: whole }) : whole ? tr('{whole} whole', { whole: whole }) : '') +
                    (whole && rest ? ' and ' : '') + (rest ? rest + ' of ' + b : ''), 'middle'));
            }

            function runFraction(n, raw) {
                var none = [{ l: 'Fraction', text: '–' }], r = raw.x ? CalcMaths.fractionOf(raw.x, engine.comma, app.deg) : null, t, b, whole, rest, cf, f, sign;
                if (!r) return { rows: none };
                if (r.error) return { rows: none, bad: ['x'], warn: true, note: 'A fraction, 22/7, a decimal, 0.125, one with a part in brackets that comes again, 0.1(6), or a calculation.' };
                if (r.value !== undefined) {
                    f = CalcEngine.fraction(r.value);
                    cf = CalcMaths.continuedOf(r.value, 20);
                    return {
                        rows: [{ l: 'Fraction', text: f ? String(f[0]).replace('-', '–') + '/' + f[1] : '–' }, { l: 'Value', v: r.value },
                            { l: 'Continued fraction', text: '[' + cf[0] + (cf.length > 1 ? '; ' + cf.slice(1).join(', ') : '') + ']', wide: true, wrap: true }],
                        note: tr('Of a calculation: as near as its digits tell.{v}', { v: (f ? '' : tr(' Not a fraction of up to 10 digits.')) })
                    };
                }
                t = r.top;
                b = r.bottom;
                sign = t < BigInt(0) ? '–' : '';
                whole = (t < BigInt(0) ? -t : t) / b;
                rest = (t < BigInt(0) ? -t : t) % b;
                cf = CalcMaths.continued(t, b, 40);
                return {
                    rows: drawnTile(pieDrawing(whole, rest, b), 'As pies').concat([{ l: 'Fraction', text: sign + (t < BigInt(0) ? -t : t) + (b === BigInt(1) ? '' : '/' + b) },
                        { l: 'Mixed', text: b === BigInt(1) || !whole ? '–' : sign + whole + ' ' + rest + '/' + b },
                        { l: 'Value', v: CalcMaths.about(t, b) },
                        { l: 'Decimal', text: local(CalcMaths.toBase(t, b, 10, 100)).replace('-', '–'), wide: true, wrap: true },
                        { l: 'Continued fraction', text: '[' + cf[0] + (cf.length > 1 ? '; ' + cf.slice(1).join(', ') : '') + ']', wide: true, wrap: true }])
                };
            }

            function runMatrices(n, raw) {
                var a = matrixOf(n, 'a', raw.sizeA), b = matrixOf(n, 'b', raw.sizeB), bad = [];
                if (!sizeOf(raw.sizeA)) bad.push('sizeA');
                if (!sizeOf(raw.sizeB)) bad.push('sizeB');
                return {
                    rows: [{ l: 'A + B', m: CalcMaths.plus(a, b) }, { l: 'A – B', m: CalcMaths.plus(a, b, true) },
                        { l: 'A × B', m: CalcMaths.times(a, b) }, { l: 'B × A', m: CalcMaths.times(b, a) }],
                    bad: bad, warn: !!bad.length,
                    note: bad.length ? 'A size of rows and columns, each 1 to 10: 3×3, 2 3, or up to 10×10.' :
                        'A sum needs one size; a product A × B as many columns of A as rows of B.'
                };
            }

    };
})(typeof window !== 'undefined' ? window : this);
