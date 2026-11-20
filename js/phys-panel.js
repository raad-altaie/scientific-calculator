// The panel of physics: electronics, motion, forces, waves, matter and modern physics, each a card with its
// drawing, over the keys or in a window of its own. physics.js is the physics itself; this is how the calculator
// shows it. Made by main.js as it starts, CalcPhysPanel(app, shared): app is what the panel takes from the rest of
// the calculator, its words, the drawings every panel draws with and the like, those that change read as they are
// now; shared is filled with what the calculator takes from the panel, before the panel starts
(function (global) {
    'use strict';

    global.CalcPhysPanel = function (app, shared) {
        var angleTyped = app.angleTyped, curveDrawing = app.curveDrawing, drawnTile = app.drawnTile, engine = app.engine, fix = app.fix,
            fromRadians = app.fromRadians, graphDrawing = app.graphDrawing, local = app.local, nmColour = app.nmColour,
            physButton = app.physButton, physNone = app.physNone, physPanel = app.physPanel, physRows = app.physRows,
            rainbow = app.rainbow, shortNum = app.shortNum, stackDrawing = app.stackDrawing, statsValue = app.statsValue,
            svgArrow = app.svgArrow, svgOf = app.svgOf, svgText = app.svgText, toRadians = app.toRadians, toolPanel = app.toolPanel,
            toolPanels = app.toolPanels, tr = app.tr, trc = app.trc, unitWord = app.unitWord;

        // what the calculator takes from the panel
        Object.defineProperties(shared, Object.getOwnPropertyDescriptors({
            get phys() { return phys; },
            get PHYS_TOOLS() { return PHYS_TOOLS; },
            showPhys: showPhys
        }));

            // ---------------- physics ---------------- //

            // The Physics panel (physics.js), on tabs of electronics, motion, forces, waves, matter and modern: a card for each tool, as the
            // solver has. Numbers in SI units, m, kg, s, N, J, unless a card says; the boxes of a circuit take a part's
            // value as it is written, 4.7k or 100n. Angles in the unit in use
            var G_NEWTON = 6.6743e-11, LIGHT = 299792458, PLANCK = 6.62607015e-34, CHARGE = 1.602176634e-19, EPSILON0 = 8.8541878188e-12, COULOMB = 8.9875517862e9,
                // the masses of an electron, a proton and a neutron, kg; and the boxes of a card of one of them, or of a mass typed
                PARTICLES = [9.1093837139e-31, 1.67262192595e-27, 1.67492750056e-27],
                particleFields = function (raw) {
                    return [{ k: 'p', l: 'Of', choice: ['Electron', 'Proton', 'Neutron', 'Mass'] }].concat(raw.p === '3' ? [{ k: 'm', l: 'm', ph: 'kg' }] : []);
                },
                particleMass = function (n, raw) { return raw.p === '3' ? n.m : PARTICLES[+raw.p || 0]; },
                // μ₀ as 4π × 10⁻⁷, within a part in 10⁹ of what is measured, so a field comes out as it is worked by hand
                HBAR = PLANCK / (2 * Math.PI), MU0 = 4e-7 * Math.PI, BOLTZMANN = 1.380649e-23, MOLAR_GAS = 8.314462618,
                // the metals of wires: resistivity at 20 °C, Ω·m, and how much more each kelvin warmer; and of one typed
                METALS = [['Copper', 1.68e-8, 0.00404], ['Aluminium', 2.65e-8, 0.00429], ['Silver', 1.59e-8, 0.0038], ['Gold', 2.44e-8, 0.0034], ['Nichrome', 1.1e-6, 0.0004], ['Other', NaN, 0]],
                GRAVITY = { k: 'g', l: 'g', ph: '9.80665', def: CalcPhysics.g, name: 'g' },
                // a band's colours as buttons, a swatch of each with its name for its tip
                swatches = function (kind) {
                    return CalcPhysics.BAND_COLOURS[kind].map(function (c) {
                        var col = CalcPhysics.COLOURS[c];
                        return '<i class="calc-band' + (col[5] ? '' : ' calc-band-none') + '" style="--c: ' + (col[5] || 'transparent') + '" title="' + tr(col[0]) + '"></i>';
                    });
                },
                BAND_NAMES = { digit: ['1st digit', '2nd digit', '3rd digit'], mult: 'Multiplier', tol: 'Tolerance', temp: 'ppm/K' },
                PHYS_TOOLS = {
                    circuits: [
                        { id: 'colours', t: 'Resistor colour code', f: ['4.7 kΩ', 'Yellow Violet Red Gold'], d: 'The resistance of a resistor of 4, 5 or 6 bands of colour, its tolerance and coefficient; or the colours of a resistance, ' +
                            'as 4.7k or 470R. Read from the end its bands are nearer.',
                            fields: function (raw) {
                                var way = [{ k: 'find', l: 'Find', choice: ['The value', 'The colours'] }], n = [4, 5, 6][+raw.n || 0], kinds;
                                if (raw.find === '1') {
                                    return way.concat([{ k: 'ohms', l: 'Ω', ph: '4.7k', text: true, aria: 'Resistance' }, { k: 'n5', l: 'Bands', choice: ['4', '5'] },
                                        { k: 'tol', l: 'Tolerance', choice: swatches('tol'), at: 6 }]);
                                }
                                kinds = CalcPhysics.bandKinds(n);
                                return way.concat([{ k: 'n', l: 'Bands', choice: ['4', '5', '6'] }], kinds.map(function (kind, i) {
                                    var digit = kinds.slice(0, i).filter(function (k) { return k === 'digit'; }).length;
                                    return { k: 'b' + n + i, l: kind === 'digit' ? BAND_NAMES.digit[digit] : BAND_NAMES[kind], choice: swatches(kind),
                                        at: n === 4 ? [4, 7, 2, 6][i] : [4, 7, 0, 1, 0, 1][i] }; // 4.7 kΩ: of each count its own, as its bands are of other kinds
                                }));
                            }, cols: 1, run: runColours },
                        { id: 'smd', t: 'SMD resistor code', f: ['473 = 47 kΩ', '01C = 10 kΩ'], d: 'The resistance of a surface-mount resistor of the code on it: of 3 digits, 473 is 47 × 10³ Ω, ' +
                            'of 4, 4702 is 470 × 10², R for the point, 4R7 or R47, and of EIA-96, 01C, the 1st value of E96, 100, × 100; 000 is a jumper. Or the codes of a resistance, as 4.7k. Drawn.',
                            fields: function (raw) {
                                return [{ k: 'find', l: 'Find', choice: ['The value', 'The codes'] }, raw.find === '1' ? { k: 'ohms', l: 'Ω', ph: '4.7k', text: true, aria: 'Resistance' } :
                                    { k: 'code', l: 'Code', ph: '473', text: true, aria: 'Code' }];
                            }, cols: 1, run: runSmd, example: function (raw) { return raw.find === '1' ? { find: '1', ohms: '4.7k' } : { find: '0', code: '01C' }; } },
                        { id: 'network', t: 'Series and parallel', f: ['R<sub>1</sub> + R<sub>2</sub>', 'R<sub>1</sub> ∥ R<sub>2</sub>'], d: 'The value of resistors, capacitors or coils joined: + in series, || in parallel, which goes first, and brackets: ' +
                            '100 + 220 || 330, (1k + 2k2) || 4k7. Capacitors add in parallel.',
                            fields: [{ k: 'part', l: 'Of', choice: ['Resistors', 'Capacitors', 'Coils'] }, { k: 'n', l: 'Parts', ph: '100 + 220 || 330', text: true, cls: 'calc-sv-wide', aria: 'Parts' }],
                            cols: 1, spaces: ['n'], run: runNetwork, example: { n: '(1k + 2k2) || 4k7' } },
                        { id: 'ohm', t: 'Ohm\'s law and power', f: ['V = IR', 'P = VI'], d: 'Of a resistance, type two of the voltage V, the current I, the resistance R and the power P, and the other two are worked out.',
                            fields: [{ k: 'V', l: 'V', ph: 'volts', text: true }, { k: 'I', l: 'I', ph: 'amperes', text: true }, { k: 'R', l: 'R', ph: 'ohms', text: true }, { k: 'P', l: 'P', ph: 'watts', text: true }],
                            cols: 2, run: runOhm, example: { V: '12', R: '4.7k' } },
                        { id: 'wire', t: 'Wire resistance', f: 'R = ρL ÷ A', d: 'A wire of a metal, of length L and diameter d: its resistance at 20 °C, and warmed or cooled to T, of that; ' +
                            'with a current, the voltage it drops and the heat in it. Other: its resistivity ρ typed, in Ω·m.',
                            fields: function (raw) {
                                return [{ k: 'metal', l: 'Of', choice: METALS.map(function (m) { return m[0]; }) }].concat(raw.metal === '5' ? [{ k: 'rho', l: 'ρ', ph: 'Ω·m', text: true, aria: 'ρ' }] : [],
                                    [{ k: 'size', l: 'Size', choice: ['d, mm', 'AWG'] }, { k: 'L', l: 'L', ph: 'm', text: true },
                                        raw.size === '1' ? { k: 'd', l: 'AWG', ph: '12, 0 or 2/0', text: true, aria: 'AWG' } : { k: 'd', l: 'd, mm', ph: '1', text: true, aria: 'd' },
                                        { k: 'I', l: 'I', ph: 'A, optional', text: true }, { k: 'T', l: 'T', ph: '°C, optional' }]);
                            }, cols: 2, run: runWire,
                            example: function (raw) { return Object.assign({ metal: raw.metal || '0', size: raw.size || '0' }, raw.metal === '5' ? { rho: '4.9e-7' } : {}, { L: '10', d: raw.size === '1' ? '14' : '1', I: '5' }); } },
                        { id: 'divider', t: 'Voltage divider', f: ['V<sub>out</sub> = V<sub>in</sub> R<sub>2</sub> ÷ (R<sub>1</sub> + R<sub>2</sub>)', 'R<sub>th</sub> = R<sub>1</sub> ∥ R<sub>2</sub>'],
                            d: 'The voltage across R₂ of two resistors in series, and of a load across it as well; and as a source, by Thévenin, the resistance a load sees, R<sub>th</sub>, ' +
                                'in series with the voltage with none, and the most power a load can take, a load of R<sub>th</sub>.',
                            fields: [{ k: 'V', l: 'V<sub>in</sub>', ph: '9', text: true, aria: 'Vin' }, { k: 'R1', l: 'R<sub>1</sub>', ph: '10k', text: true, aria: 'R1' },
                                { k: 'R2', l: 'R<sub>2</sub>', ph: '4.7k', text: true, aria: 'R2' }, { k: 'RL', l: 'Load', ph: 'optional', text: true }], cols: 2, run: runDivider, example: { V: '9', R1: '10k', R2: '4.7k' } },
                        { id: 'bridge', t: 'Wheatstone bridge', f: ['R<sub>x</sub> = R<sub>2</sub>R<sub>3</sub> ÷ R<sub>1</sub>', 'V<sub>out</sub> = V<sub>left</sub> – V<sub>right</sub>'], d: 'Four resistors in a diamond, ' +
                            'R<sub>1</sub> over R<sub>2</sub> on its left and R<sub>3</sub> over R<sub>x</sub> on its right, a voltage V across it; drawn. R<sub>x</sub> empty, the one that balances it, ' +
                            'no voltage between its middles, as an unknown is measured; or of all four, the voltage between the middles, as of a strain gauge or a sensor, and the resistance there.',
                            fields: [{ k: 'R1', l: 'R<sub>1</sub>', ph: '1k', text: true, aria: 'R1' }, { k: 'R2', l: 'R<sub>2</sub>', ph: '470', text: true, aria: 'R2' },
                                { k: 'R3', l: 'R<sub>3</sub>', ph: '2.2k', text: true, aria: 'R3' }, { k: 'Rx', l: 'R<sub>x</sub>', ph: 'empty, to find', text: true, aria: 'Rx' }, { k: 'V', l: 'V', ph: 'optional', text: true }],
                            cols: 2, run: runBridge, example: { R1: '1k', R2: '470', R3: '2.2k', V: '10' } },
                        { id: 'led', t: 'LED resistor', f: 'R = (V<sub>s</sub> – nV<sub>f</sub>) ÷ I', d: 'The resistor in series with LEDs, and the one of E12 to buy, at or above it, with the current it gives and its power. ' +
                            'V<sub>f</sub> of red is about 2 V, yellow 2.1, green 2.2 to 3, blue and white 3.2; 20 mA unless typed.',
                            fields: [{ k: 'V', l: 'V<sub>s</sub>', ph: '5', text: true, aria: 'Vs' }, { k: 'Vf', l: 'V<sub>f</sub>', ph: '2', text: true, aria: 'Vf' },
                                { k: 'I', l: 'I', ph: '20m', text: true }, { k: 'n', l: 'LEDs', ph: '1', def: 1, name: 'LEDs' }], cols: 2, run: runLed, example: { V: '5', Vf: '2' } },
                        { id: 'capacitor', t: 'Capacitor', f: ['Q = CV', 'E = ½CV<sup>2</sup>'], d: 'Type two of the capacitance C, the voltage V, the charge Q and the energy E it holds, and the other two are worked out.',
                            fields: [{ k: 'C', l: 'C', ph: 'farads', text: true }, { k: 'V', l: 'V', ph: 'volts', text: true }, { k: 'Q', l: 'Q', ph: 'coulombs', text: true }, { k: 'E', l: 'E', ph: 'joules', text: true }],
                            cols: 2, run: runCapacitor, example: { C: '100µ', V: '12' } },
                        { id: 'rc', t: 'RC circuit', f: ['τ = RC', 'f<sub>c</sub> = 1 ÷ 2πRC'], d: 'A resistor and a capacitor: the time constant, the frequency where a filter of them cuts off, and at a time t how charged the capacitor is.',
                            fields: [{ k: 'R', l: 'R', ph: '10k', text: true }, { k: 'C', l: 'C', ph: '100n', text: true }, { k: 't', l: 't', ph: 's, optional', text: true }], cols: 3, drawnLast: true, run: runRc,
                            example: { R: '10k', C: '100n' } },
                        { id: 'rl', t: 'RL circuit', f: ['τ = L/R', 'f<sub>c</sub> = R ÷ 2πL'], d: 'A resistor and a coil: the time constant, the frequency where a filter of them cuts off, and at a time t how far the current has risen.',
                            fields: [{ k: 'R', l: 'R', ph: '100', text: true }, { k: 'L', l: 'L', ph: '10m', text: true }, { k: 't', l: 't', ph: 's, optional', text: true }], cols: 3, drawnLast: true, run: runRl,
                            example: { R: '100', L: '10m' } },
                        { id: 'filter', t: 'Filter', f: ['f<sub>c</sub> = 1 ÷ 2πRC', 'Q = √(L/C) ÷ R'], d: 'A filter of R and C, or of R and L, of the first order; or of R, L and C in series, of the second, ' +
                            'its output across C, L, R, or L and C: low-pass, high-pass, band-pass or band-stop. Where it is 3 dB down, its cut-off; its Q, its band and the peak it may have; ' +
                            'and at a frequency f its gain and phase. Its gain drawn against f, of a log scale.',
                            fields: function (raw) {
                                var of = +raw.kind || 0;
                                return [{ k: 'kind', l: 'Of', choice: ['RC', 'RL', 'RLC'] }, of === 2 ? { k: 'pass2', l: 'Pass', choice: ['Low', 'High', 'Band', 'Stop'] } : { k: 'pass', l: 'Pass', choice: ['Low', 'High'] },
                                    { k: 'R', l: 'R', ph: of === 0 ? '10k' : of === 1 ? '100' : '10', text: true }].concat(of ? [{ k: 'L', l: 'L', ph: of === 1 ? '10m' : '1m', text: true }] : [],
                                    of !== 1 ? [{ k: 'C', l: 'C', ph: of === 2 ? '1µ' : '100n', text: true }] : [], [{ k: 'f', l: 'f', ph: 'Hz, optional', text: true }]);
                            }, cols: 2, run: runFilter,
                            example: function (raw) {
                                return Object.assign({ kind: raw.kind || '0', pass: raw.pass || '0', pass2: raw.pass2 || '0' }, [{ R: '10k', C: '100n', f: '1k' }, { R: '100', L: '10m', f: '1k' }, { R: '10', L: '1m', C: '1µ', f: '4k' }][+raw.kind || 0]);
                            } },
                        { id: 'plates', t: 'Parallel plates', f: 'C = ε<sub>0</sub>ε<sub>r</sub>A ÷ d', d: 'A capacitor of two plates of area A a gap d apart, with ε<sub>r</sub> between them: air is 1, paper about 3, glass 5 to 10, water 80. ' +
                            'With a voltage, the field in the gap, the charge and the energy.',
                            fields: [{ k: 'A', l: 'A', ph: 'm²' }, { k: 'd', l: 'd', ph: 'm' }, { k: 'er', l: 'ε<sub>r</sub>', ph: '1', def: 1, name: 'εr' }, { k: 'V', l: 'V', ph: 'optional' }],
                            cols: 2, run: runPlates, example: { A: '0.01', d: '0.001', V: '100' } },
                        { id: 'ac', t: 'Transformer and AC', f: ['V<sub>s</sub>/V<sub>p</sub> = N<sub>s</sub>/N<sub>p</sub>', 'V<sub>rms</sub> = V<sub>peak</sub> ÷ √2', 'f = 1 ÷ 2π√(LC)'],
                            d: 'An ideal transformer, of its turns; the RMS, peak and peak to peak of a sine wave, one from another; or the frequency an LC circuit rings at.',
                            fields: function (raw) {
                                var of = +raw.kind || 0;
                                return [{ k: 'kind', l: 'Of', choice: ['Transformer', 'RMS and peak', 'LC'] }].concat(of === 1 ? [{ k: 'given', l: 'Given', choice: ['Peak', 'RMS', 'Peak to peak'] },
                                    { k: 'x', l: 'Value', ph: '325', text: true, aria: 'Value' }] : of === 2 ? [{ k: 'L', l: 'L', ph: '1m', text: true }, { k: 'C', l: 'C', ph: '1µ', text: true }] :
                                    [{ k: 'Np', l: 'N<sub>p</sub>', ph: '1000', text: true, aria: 'Np' }, { k: 'Ns', l: 'N<sub>s</sub>', ph: '50', text: true, aria: 'Ns' },
                                        { k: 'Vp', l: 'V<sub>p</sub>', ph: '230', text: true, aria: 'Vp' }, { k: 'Is', l: 'I<sub>s</sub>', ph: 'optional', text: true, aria: 'Is' }]);
                            }, cols: 2, run: runAc,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, [{ Np: '1000', Ns: '50', Vp: '230', Is: '2' }, { given: '1', x: '230' }, { L: '1m', C: '1µ' }][+raw.kind || 0]); } },
                        { id: 'threephase', t: 'Three-phase power', f: ['P = √3 V<sub>L</sub>I<sub>L</sub> cos φ', 'V<sub>L</sub> = √3 V<sub>phase</sub>'], d: 'Three phases, in star or in delta, ' +
                            'of the voltage between two lines, V<sub>L</sub>, the current in each line, I<sub>L</sub>, and the power factor, cos φ, 1 unless typed: the real power, the apparent and the reactive, ' +
                            'and the voltage, current and load of each phase; its three waves drawn, a third of a turn apart. Europe\'s is 400 V between lines and 230 to the neutral, ' +
                            'America\'s 208 and 120, or 480; a motor\'s cos φ is some 0.8 to 0.9.',
                            fields: [{ k: 'kind', l: 'In', choice: ['Star, Y', 'Delta, Δ'] }, { k: 'V', l: 'V<sub>L</sub>', ph: '400', text: true, aria: 'VL' }, { k: 'I', l: 'I<sub>L</sub>', ph: 'A, 16', text: true, aria: 'IL' },
                                { k: 'pf', l: 'cos φ', ph: '1', def: 1, name: 'cos φ' }, { k: 'f', l: 'f', ph: '50', def: 50 }],
                            cols: 2, run: runThreePhase, example: function (raw) { return { kind: raw.kind || '0', V: '400', I: '16', pf: '0.85' }; } },
                        { id: 'rlc', t: 'Impedance and resonance', f: ['Z = √(R<sup>2</sup> + (X<sub>L</sub> – X<sub>C</sub>)<sup>2</sup>)', 'f<sub>0</sub> = 1 ÷ 2π√(LC)'],
                            d: 'A resistor, a coil and a capacitor in series or in parallel, at a frequency f: the reactance of each, the impedance and its phase, ' +
                                'where it resonates, how sharply, Q, and how wide; with a voltage, the current and what each part has. Leave one empty for RC, RL or LC; f empty, at resonance.',
                            fields: [{ k: 'kind', l: 'In', choice: ['Series', 'Parallel'] }, { k: 'R', l: 'R', ph: '100', text: true }, { k: 'L', l: 'L', ph: '10m', text: true },
                                { k: 'C', l: 'C', ph: '1µ', text: true }, { k: 'f', l: 'f', ph: 'Hz, 1k', text: true }, { k: 'V', l: 'V', ph: 'RMS, optional', text: true }],
                            cols: 2, run: runRlc, example: function (raw) { return { kind: raw.kind || '0', R: '100', L: '10m', C: '1µ', f: '1k', V: '10' }; } },
                        { id: 'cost', t: 'Cost of electricity', f: 'kWh = P × hours ÷ 1000', d: 'What a device of P watts costs, on so many hours a day at a price for each kWh, in your money: a day, a month and a year.',
                            fields: [{ k: 'P', l: 'P', ph: 'watts', text: true }, { k: 'h', l: 'Hours', ph: '24', def: 24, name: 'Hours' }, { k: 'price', l: 'Per kWh', ph: '0.15', name: 'Per kWh' }],
                            cols: 3, run: runCost, example: { P: '2k', h: '1', price: '0.30' } },
                        { id: 'battery', t: 'Battery life', f: 'hours = mAh ÷ 1000I', d: 'How long a battery of a capacity in mAh lasts at a current, and of its voltage the energy it holds; ' +
                            'with a current to charge it, how long that takes, some 20% lost. A phone\'s is about 4000 mAh, an AA cell 2000 to 2500.',
                            fields: [{ k: 'C', l: 'mAh', ph: '2500', name: 'mAh' }, { k: 'I', l: 'I', ph: 'A, as 100m', text: true }, { k: 'V', l: 'V', ph: 'optional', text: true },
                                { k: 'Ic', l: 'Charge at', ph: 'A, optional', text: true }], cols: 2, run: runBattery, example: { C: '2500', I: '100m', V: '1.2', Ic: '500m' } },
                        { id: 'diode', t: 'Diode', f: 'I = I<sub>S</sub>(e<sup>V/nV<sub>T</sub></sup> – 1)', d: 'A diode by Shockley\'s equation: the current through it at a voltage across it, or the voltage ' +
                            'at a current, and its resistance to a small change there. I<sub>S</sub> of a small silicon diode is some 1e-14 A to a few nA, n from 1 to 2: ' +
                            'a 1N4148 is about 2.5n and 1.75. At 25 °C unless typed.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Voltage', 'Current'] }, raw.by === '1' ? { k: 'x', l: 'I', ph: 'A, 10m', text: true, aria: 'I' } : { k: 'x', l: 'V', ph: '0.65', text: true, aria: 'V' },
                                    { k: 'Is', l: 'I<sub>S</sub>', ph: '1e-14', text: true, aria: 'IS' }, { k: 'n', l: 'n', ph: '1', def: 1 }, { k: 'T', l: 'T, °C', ph: '25', def: 25, name: 'T' }];
                            }, cols: 2, run: runDiode, example: function (raw) { return Object.assign({ by: raw.by || '0', Is: '2.5n', n: '1.75' }, [{ x: '0.65' }, { x: '10m' }][+raw.by || 0]); } },
                        { id: 'rectifier', t: 'Rectifier and ripple', f: ['V<sub>peak</sub> = √2 V<sub>rms</sub> – V<sub>D</sub>', 'V<sub>r</sub> = I ÷ fC'], d: 'AC turned to DC: a transformer\'s RMS voltage ' +
                            'through a bridge of four diodes, or through one, smoothed by a capacitor C into a load drawing I: its peak, the ripple, the least and the average out, ' +
                            'and the voltage each diode must stand. Mains is 50 Hz, 60 in the Americas; a silicon diode drops about 0.7 V, a Schottky 0.3.',
                            fields: [{ k: 'kind', l: 'By', choice: ['A bridge', 'One diode'] }, { k: 'V', l: 'V<sub>rms</sub>', ph: '12', text: true, aria: 'Vrms' }, { k: 'f', l: 'f', ph: '50', def: 50 },
                                { k: 'C', l: 'C', ph: 'optional, 2200µ', text: true }, { k: 'I', l: 'I', ph: 'A, 500m', text: true }, { k: 'vd', l: 'V<sub>D</sub>', ph: '0.7', def: 0.7, name: 'VD' }],
                            cols: 2, run: runRectifier, example: function (raw) { return { kind: raw.kind || '0', V: '12', C: '2200µ', I: '500m' }; } },
                        { id: 'bjt', t: 'Transistor as a switch', f: 'R<sub>B</sub> = (V<sub>in</sub> – V<sub>BE</sub>) ÷ I<sub>B</sub>', d: 'An NPN transistor switching a load, as an LED or a relay, from a pin: the base current, ' +
                            'five times the least, I<sub>C</sub>/β, so it is surely on, and the base resistor, the one of E12 at or below it to buy, and the heat in the transistor.',
                            fields: [{ k: 'I', l: 'I<sub>C</sub>', ph: '100m', text: true, aria: 'IC' }, { k: 'beta', l: 'β', ph: '100', def: 100, name: 'β' }, { k: 'V', l: 'V<sub>in</sub>', ph: '5', text: true, aria: 'Vin' },
                                { k: 'vbe', l: 'V<sub>BE</sub>', ph: '0.7', def: 0.7, name: 'VBE' }, { k: 'vce', l: 'V<sub>CE(sat)</sub>', ph: '0.2', def: 0.2, name: 'VCE(sat)' }], cols: 2, run: runBjt,
                            example: { I: '100m', V: '5' } },
                        { id: 'bjtbias', t: 'Transistor bias', f: 'V<sub>B</sub> = V<sub>CC</sub> R<sub>2</sub> ÷ (R<sub>1</sub> + R<sub>2</sub>)', d: 'An NPN transistor biased by a divider: where it sits, its operating point, ' +
                            'and whether it is active, as an amplifier is, saturated or off. The base current loads the divider.',
                            fields: [{ k: 'V', l: 'V<sub>CC</sub>', ph: '12', text: true, aria: 'VCC' }, { k: 'R1', l: 'R<sub>1</sub>', ph: '47k', text: true, aria: 'R1' }, { k: 'R2', l: 'R<sub>2</sub>', ph: '10k', text: true, aria: 'R2' },
                                { k: 'Rc', l: 'R<sub>C</sub>', ph: '2.2k', text: true, aria: 'RC' }, { k: 'Re', l: 'R<sub>E</sub>', ph: '470', text: true, aria: 'RE' }, { k: 'beta', l: 'β', ph: '100', def: 100, name: 'β' }],
                            cols: 3, run: runBias, example: { V: '12', R1: '47k', R2: '10k', Rc: '2.2k', Re: '470' } },
                        { id: 'mosfet', t: 'MOSFET as a switch', f: 'P = I<sup>2</sup>R<sub>DS(on)</sub>', d: 'An N-channel MOSFET switching a load: the heat in it, the voltage it drops, and whether the gate is driven on fully, ' +
                            'well above the threshold V<sub>th</sub>. With its θ<sub>JA</sub>, from its datasheet, how much hotter than the air it runs.',
                            fields: [{ k: 'I', l: 'I', ph: '5', text: true }, { k: 'R', l: 'R<sub>DS(on)</sub>', ph: '20m', text: true, aria: 'RDS(on)' }, { k: 'Vg', l: 'V<sub>GS</sub>', ph: '5', text: true, aria: 'VGS' },
                                { k: 'Vth', l: 'V<sub>th</sub>', ph: '2', text: true, aria: 'Vth' }, { k: 'th', l: 'θ<sub>JA</sub>', ph: '°C/W, optional', name: 'θJA' }], cols: 2, run: runMosfet,
                            example: { I: '5', R: '20m', Vg: '5', Vth: '2', th: '62' } },
                        { id: 'zener', t: 'Zener regulator', f: 'R = (V<sub>in</sub> – V<sub>Z</sub>) ÷ (I<sub>L</sub> + I<sub>Z</sub>)', d: 'A Zener diode and a resistor holding a voltage: the resistor, the one of E12 at or below it, ' +
                            'and at the highest input with no load, the worst, the power in each. 5 mA through the Zener at least, unless typed.',
                            fields: [{ k: 'V', l: 'V<sub>in</sub>', ph: '12', text: true, aria: 'Vin' }, { k: 'Vmax', l: 'Highest', ph: 'optional', text: true }, { k: 'Vz', l: 'V<sub>Z</sub>', ph: '5.1', text: true, aria: 'VZ' },
                                { k: 'IL', l: 'I<sub>L</sub>', ph: '20m', text: true, aria: 'IL' }, { k: 'Iz', l: 'I<sub>Z</sub> least', ph: '5m', text: true, aria: 'IZ least' }], cols: 2, run: runZener,
                            example: { V: '12', Vmax: '14', Vz: '5.1', IL: '20m' } },
                        { id: 'lm317', t: 'LM317 regulator', f: ['V<sub>out</sub> = 1.25(1 + R<sub>2</sub> ÷ R<sub>1</sub>)', 'I = 1.25 ÷ R'], d: 'The LM317, a regulator set by two resistors: ' +
                            'R<sub>2</sub> for a voltage, R<sub>1</sub> 240 Ω unless typed, and the one of E12 and of E24 nearest it, with what each gives; or the voltage of R<sub>1</sub> and R<sub>2</sub>; ' +
                            'or as a steady current, through LEDs, the R that sets it. With V<sub>in</sub> and the load, the heat in it; V<sub>in</sub> some 3 V above V<sub>out</sub> at least. ' +
                            'The 50 µA out of its ADJ pin counted.',
                            fields: function (raw) {
                                var of = +raw.kind || 0;
                                return [{ k: 'kind', l: 'For', choice: ['A voltage', 'R₁ and R₂', 'A current'] }].concat(of === 2 ? [{ k: 'I', l: 'I', ph: 'A, 20m', text: true }] :
                                    [of === 1 ? { k: 'R2', l: 'R<sub>2</sub>', ph: '720', text: true, aria: 'R2' } : { k: 'V', l: 'V<sub>out</sub>', ph: '5', text: true, aria: 'Vout' },
                                        { k: 'R1', l: 'R<sub>1</sub>', ph: '240', text: true, aria: 'R1' }], [{ k: 'Vin', l: 'V<sub>in</sub>', ph: 'optional', text: true, aria: 'Vin' }],
                                of === 2 ? [] : [{ k: 'IL', l: 'I<sub>load</sub>', ph: 'A, optional', text: true, aria: 'I load' }]);
                            }, cols: 2, run: runLm317,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0', Vin: '12' }, [{ V: '5', IL: '500m' }, { R1: '240', R2: '720', IL: '500m' }, { I: '20m' }][+raw.kind || 0]); } },
                        { id: 'opamp', t: 'Op-amp gain', f: ['1 + R<sub>f</sub>/R<sub>in</sub>', '–R<sub>f</sub>/R<sub>in</sub>'], d: 'An op-amp amplifying, not inverting or inverting: its gain, in dB as well, and of an input, its output, ' +
                            'that cannot go past the supply.',
                            fields: [{ k: 'kind', l: 'It is', choice: ['Non-inverting', 'Inverting'] }, { k: 'Rf', l: 'R<sub>f</sub>', ph: '100k', text: true, aria: 'Rf' }, { k: 'Rin', l: 'R<sub>in</sub>', ph: '10k', text: true, aria: 'Rin' },
                                { k: 'V', l: 'V<sub>in</sub>', ph: 'optional', text: true, aria: 'Vin' }, { k: 'Vs', l: '±Supply', ph: 'optional', text: true, aria: 'Supply' }], cols: 2, run: runOpamp,
                            example: { Rf: '100k', Rin: '10k', V: '0.5', Vs: '12' } },
                        { id: 'timer', t: '555 timer', f: ['f = 1.44 ÷ (R<sub>1</sub> + 2R<sub>2</sub>)C', 't = 1.1RC'], d: 'A 555 timer astable, blinking on its own, of R<sub>1</sub>, R<sub>2</sub> and C: its frequency, its times high and low and its duty cycle; ' +
                            'or monostable, one pulse, of R and C: how long it lasts.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'It is', choice: ['Astable', 'Monostable'] }].concat(raw.kind === '1' ? [{ k: 'R1', l: 'R', ph: '100k', text: true, aria: 'R' }, { k: 'C', l: 'C', ph: '10µ', text: true }] :
                                    [{ k: 'R1', l: 'R<sub>1</sub>', ph: '1k', text: true, aria: 'R1' }, { k: 'R2', l: 'R<sub>2</sub>', ph: '10k', text: true, aria: 'R2' }, { k: 'C', l: 'C', ph: '10µ', text: true }]);
                            }, cols: 3, run: runTimer, example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, [{ R1: '1k', R2: '10k', C: '10µ' }, { R1: '100k', C: '10µ' }][+raw.kind || 0]); } },
                        { id: 'decibels', t: 'Decibels', f: ['dBm = 10 log(P ÷ 1 mW)', 'dBV = 20 log(V ÷ 1 V)'], d: 'A level in dBm, dBW, watts, dBV, dBmV, dBµV or volts RMS as each of the others, ' +
                            'across an impedance Z: 50 Ω in radio, 75 in video and TV, 600 in old audio; with its voltage peak and peak to peak, and the current. Drawn among the levels of signals. ' +
                            'Or a gain or a loss: in dB as a ratio of power and of voltage, or a ratio in dB.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Of', choice: ['A level', 'A gain'] }].concat(raw.kind === '1' ? [{ k: 'given', l: 'Given', choice: ['dB', 'Power ×', 'Voltage ×'] },
                                    { k: 'g', l: 'Value', ph: '3', text: true, aria: 'Value' }] :
                                    [{ k: 'unit', l: 'In', choice: CalcPhysics.LEVELS }, { k: 'x', l: 'Value', ph: '0', text: true, aria: 'Value' }, { k: 'z', l: 'Z', ph: '50', text: true }]);
                            }, cols: 2, run: runDecibels,
                            example: function (raw) {
                                return raw.kind === '1' ? { kind: '1', given: raw.given || '0', g: ['3', '2', '10'][+raw.given || 0] } :
                                    { kind: '0', unit: raw.unit || '0', x: ['1', '-30', '1m', '1', '1', '60', '1'][+raw.unit || 0], z: '50' };
                            } }
                    ],
                    motion: [
                        { id: 'suvat', t: 'Steady acceleration', f: ['v = u + at', 's = ut + ½at<sup>2</sup>', 'v<sup>2</sup> = u<sup>2</sup> + 2as'], d: 'Motion in a line at a steady acceleration: type any three of s, the way gone, u, the speed at first, v, ' +
                            'the speed at last, a, the acceleration, and t, the time, and the other two are worked out. A speed found from its square may be either way: both are given.',
                            fields: [{ k: 's', l: 's', ph: 'm' }, { k: 'u', l: 'u', ph: 'm/s' }, { k: 'v', l: 'v', ph: 'm/s' }, { k: 'a', l: 'a', ph: 'm/s²' }, { k: 't', l: 't', ph: 's' }],
                            cols: 3, run: runSuvat, example: { u: '0', a: '9.81', t: '3' } },
                        { id: 'projectile', t: 'Projectile', f: ['range', 'height', 'time'], d: 'Something thrown at a speed and an angle above the ground, from a height, with no air: how long it flies, how far, how high, and how fast ' +
                            'it lands; its path drawn. The angle in the unit in use.',
                            fields: [{ k: 'v', l: 'v<sub>0</sub>', ph: 'm/s', name: 'v₀' }, { k: 'a', l: 'θ', ph: '45', name: 'θ' }, { k: 'h', l: 'Height', ph: '0', def: 0 }, GRAVITY],
                            cols: 2, run: runProjectile, example: function () { return { v: '20', a: angleTyped(45), h: '0' }; } },
                        { id: 'relative', t: 'Relative velocity', f: 'v<sub>AB</sub> = v<sub>A</sub> – v<sub>B</sub>', d: 'Two things moving, each at a speed and a heading: how fast and which way one goes ' +
                            'as seen from the other, drawn. Or a boat crossing a river of width d at a speed v through the water, the current u: aimed straight across, how long it takes ' +
                            'and how far down it lands; and the heading upstream that takes it straight across. Headings from east, anticlockwise, in the unit in use.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Of', choice: ['Two things', 'A river'] }].concat(raw.kind === '1' ?
                                    [{ k: 'v', l: 'v', ph: 'm/s, the boat' }, { k: 'u', l: 'u', ph: 'm/s, the current' }, { k: 'd', l: 'd', ph: 'm, its width' }] :
                                    [{ k: 'va', l: 'v<sub>A</sub>', ph: 'm/s', name: 'vA' }, { k: 'a', l: 'θ<sub>A</sub>', ph: '0', def: 0, name: 'θA' },
                                        { k: 'vb', l: 'v<sub>B</sub>', ph: 'm/s', name: 'vB' }, { k: 'b', l: 'θ<sub>B</sub>', ph: '0', def: 0, name: 'θB' }]);
                            }, cols: 2, run: runRelative,
                            example: function (raw) { return raw.kind === '1' ? { kind: '1', v: '3', u: '1.5', d: '60' } : { kind: '0', va: '20', a: angleTyped(0), vb: '15', b: angleTyped(90) }; } },
                        { id: 'circular', t: 'Circular motion', f: ['a = v<sup>2</sup>/r', 'F = mv<sup>2</sup>/r'], d: 'Going round a circle of radius r at a steady speed, of its speed, period or revolutions a minute: the other two, ' +
                            'the angular speed and frequency, the acceleration to the middle, and of a mass the force that holds it.',
                            fields: function (raw) {
                                return [{ k: 'given', l: 'Of', choice: ['Speed', 'Period', 'rpm'] }, { k: 'r', l: 'r', ph: 'm' },
                                    [{ k: 'x', l: 'v', ph: 'm/s', name: 'v' }, { k: 'x', l: 'T', ph: 's', name: 'T' }, { k: 'x', l: 'rpm', ph: '60', name: 'rpm' }][+raw.given || 0], { k: 'm', l: 'm', ph: 'kg, optional' }];
                            }, cols: 3, run: runCircular, example: function (raw) { return Object.assign({ given: raw.given || '0' }, [{ r: '2', x: '5', m: '1' }, { r: '2', x: '3', m: '1' }, { r: '0.15', x: '33', m: '0.2' }][+raw.given || 0]); } },
                        { id: 'orbit', t: 'Orbits', f: ['T<sup>2</sup> = 4π<sup>2</sup>a<sup>3</sup> ÷ GM', 'v<sup>2</sup> = GM(2/r – 1/a)'], d: 'A satellite or a planet going round a body of mass M and radius R, ' +
                            'by Kepler\'s third law: of its height above the surface, of its period, or of its nearest and farthest heights, an ellipse: the size of its orbit, its period and ' +
                            'its speed, nearest and farthest by the vis-viva equation; drawn. The Earth unless typed, 5.972e24 kg and 6.371e6 m; the Sun is 1.989e30 kg and 6.957e8 m. ' +
                            'A geostationary orbit takes 86164 s.',
                            fields: function (raw) {
                                var of = +raw.given || 0;
                                return [{ k: 'given', l: 'Of', choice: ['Height', 'Period', 'Ellipse'] }, { k: 'M', l: 'M', ph: '5.972e24', def: 5.972e24 }, { k: 'R', l: 'R', ph: '6.371e6', def: 6.371e6 }]
                                    .concat(of === 1 ? [{ k: 'T', l: 'T', ph: 's' }] : of === 2 ? [{ k: 'h1', l: 'Nearest', ph: 'm, above' }, { k: 'h2', l: 'Farthest', ph: 'm, above' }] :
                                        [{ k: 'h', l: 'h', ph: 'm, above' }]);
                            }, cols: 2, run: runOrbit,
                            example: function (raw) { return Object.assign({ given: raw.given || '0' }, [{ h: '400e3' }, { T: '86164' }, { h1: '200e3', h2: '35786e3' }][+raw.given || 0]); } },
                        { id: 'rocket', t: 'Rocket equation', f: 'Δv = v<sub>e</sub> ln(m<sub>0</sub> ÷ m<sub>f</sub>)', d: 'Tsiolkovsky\'s: the speed a rocket gains burning its fuel, of its exhaust speed ' +
                            'v<sub>e</sub>, or its specific impulse I<sub>sp</sub>, and its mass full, m<sub>0</sub>, and empty, m<sub>f</sub>; its speed drawn as it burns. With the time it burns, ' +
                            'its thrust, its acceleration at first and at last, and the Δv left going straight up against g. A kerosene engine\'s I<sub>sp</sub> is some 300 s, ' +
                            'a hydrogen one\'s 450; to orbit takes some 9400 m/s.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Exhaust speed', 'I<sub>sp</sub>'] }, raw.by === '1' ? { k: 've', l: 'I<sub>sp</sub>', ph: 's, 300', name: 'Isp' } :
                                    { k: 've', l: 'v<sub>e</sub>', ph: 'm/s, 3000', name: 'vₑ' }, { k: 'm0', l: 'm<sub>0</sub>', ph: 'kg, full', name: 'm₀' }, { k: 'mf', l: 'm<sub>f</sub>', ph: 'kg, empty', name: 'mf' },
                                    { k: 't', l: 't', ph: 's, optional' }, GRAVITY];
                            }, cols: 2, run: runRocket, example: function (raw) { return { by: raw.by || '0', ve: raw.by === '1' ? '300' : '3000', m0: '1000', mf: '300', t: '120' }; } },
                        { id: 'oscillator', t: 'Pendulum and spring', f: ['T = 2π√(L/g)', 'T = 2π√(m/k)'], d: 'The period and frequency of a simple pendulum of length L, its swings small, or of a mass m on a spring of stiffness k.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Of', choice: ['Pendulum', 'Spring'] }].concat(raw.kind === '1' ? [{ k: 'm', l: 'm', ph: 'kg' }, { k: 'k', l: 'k', ph: 'N/m' }] :
                                    [{ k: 'L', l: 'L', ph: 'm' }, GRAVITY], [{ k: 'A', l: 'A', ph: 'm, optional' }]);
                            }, cols: 2, run: runOscillator, drawnLast: true, example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, [{ L: '1', A: '0.1' }, { m: '0.5', k: '20', A: '0.05' }][+raw.kind || 0]); } },
                        { id: 'rotation', t: 'Rotation', f: ['I = kmr<sup>2</sup>', 'E = ½Iω<sup>2</sup>', 'L = Iω'], d: 'A shape of mass m and radius r, of a rod its length, spinning: its moment of inertia, ' +
                            'its energy and angular momentum; and rolled from a height h down a slope, not slipping, its speed at the bottom, g 9.80665.',
                            fields: function (raw) {
                                var rod = (+raw.shape || 0) < 2;
                                return [{ k: 'shape', l: 'Shape', choice: ['Rod, middle', 'Rod, end', 'Disc', 'Ring', 'Ball', 'Hollow ball'] }, { k: 'm', l: 'm', ph: 'kg' },
                                    { k: 'r', l: rod ? 'L' : 'r', ph: 'm', name: rod ? 'L' : 'r' }, { k: 'by', l: 'Spin', choice: ['rpm', 'rad/s'] },
                                    raw.by === '1' ? { k: 'w', l: 'ω', ph: 'rad/s', name: 'ω' } : { k: 'w', l: 'rpm', ph: '60', name: 'rpm' }, { k: 'h', l: 'h', ph: 'm, optional' }];
                            }, cols: 2, run: runRotation, example: function (raw) { return { shape: raw.shape || '0', by: raw.by || '0', m: '2', r: '0.3', w: raw.by === '1' ? '10' : '120', h: '1' }; } },
                        { id: 'centre', t: 'Centre of mass', f: ['x̄ = Σmx ÷ Σm', 'I = Σmr<sup>2</sup>'], d: 'Up to four masses at points (x, y): where their centre of mass is, as of a seesaw ' +
                            'or a molecule, drawn; the mass in all, and their moment of inertia about the centre and about 0. x and y are 0 unless typed: leave y empty along a line.',
                            fields: [1, 2, 3, 4].reduce(function (list, i) {
                                var s = '₁₂₃₄'.charAt(i - 1);
                                return list.concat([{ k: 'm' + i, l: 'm<sub>' + i + '</sub>', ph: i > 2 ? 'optional' : 'kg', name: 'm' + s }, { k: 'x' + i, l: 'x<sub>' + i + '</sub>', ph: '0', def: 0, name: 'x' + s },
                                    { k: 'y' + i, l: 'y<sub>' + i + '</sub>', ph: '0', def: 0, name: 'y' + s }]);
                            }, []), cols: 3, run: runCentre, example: { m1: '2', x1: '0', y1: '0', m2: '3', x2: '4', y2: '0', m3: '1', x3: '2', y3: '3' } }
                    ],
                    forces: [
                        { id: 'newton', t: 'Force, mass and acceleration', f: 'F = ma', d: 'Newton\'s second law: type two of F, m and a and the third is worked out; and the weight of the mass.',
                            fields: [{ k: 'F', l: 'F', ph: 'N' }, { k: 'm', l: 'm', ph: 'kg' }, { k: 'a', l: 'a', ph: 'm/s²' }], cols: 3, run: runNewton, example: { m: '10', a: '2' } },
                        { id: 'incline', t: 'Inclined plane', f: ['mg sin θ', 'μ mg cos θ'], d: 'A mass on a slope of angle θ with friction μ: its weight, the normal force, the force along the slope, the friction and the acceleration, and whether it slides.',
                            fields: [{ k: 'm', l: 'm', ph: 'kg' }, { k: 'a', l: 'θ', ph: '30', name: 'θ' }, { k: 'mu', l: 'μ', ph: '0', def: 0, name: 'μ' }, GRAVITY], cols: 2, run: runIncline,
                            example: function () { return { m: '10', a: angleTyped(30), mu: '0.2' }; } },
                        { id: 'atwood', t: 'Masses over a pulley', f: ['a = (m<sub>1</sub> – m<sub>2</sub>)g ÷ (m<sub>1</sub> + m<sub>2</sub>)', 'T = m<sub>1</sub>(g – a)'], d: 'Two masses on a string ' +
                            'over a pulley, m<sub>1</sub> hanging and m<sub>2</sub> hanging too, as Atwood\'s machine, on a table, or on a slope of angle θ, with friction μ: their acceleration, ' +
                            'which way they go, the tension in the string, and whether friction holds them; drawn. With a distance d, how fast they go after it and how long it takes. ' +
                            'With the pulley\'s mass, a disc, it turns too.',
                            fields: function (raw) {
                                var of = +raw.kind || 0;
                                return [{ k: 'kind', l: 'Of', choice: ['Two hanging', 'A table', 'A slope'] }, { k: 'm1', l: 'm<sub>1</sub>', ph: 'kg, hanging', name: 'm₁' }, { k: 'm2', l: 'm<sub>2</sub>', ph: 'kg', name: 'm₂' }]
                                    .concat(of === 2 ? [{ k: 'a', l: 'θ', ph: angleTyped(30), name: 'θ' }] : [], of ? [{ k: 'mu', l: 'μ', ph: '0', def: 0, name: 'μ' }] : [],
                                        [{ k: 'mp', l: 'Pulley', ph: 'kg, 0', def: 0, name: 'Pulley' }, { k: 'd', l: 'd', ph: 'm, optional' }, GRAVITY]);
                            }, cols: 2, run: runAtwood,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0', m1: '3', m2: '2', d: '1' }, raw.kind === '2' ? { m2: '4', a: angleTyped(30), mu: '0.1' } : raw.kind === '1' ? { mu: '0.2' } : {}); } },
                        { id: 'collision', t: 'Collision', f: 'm<sub>1</sub>u<sub>1</sub> + m<sub>2</sub>u<sub>2</sub> = m<sub>1</sub>v<sub>1</sub> + m<sub>2</sub>v<sub>2</sub>', d: 'Two masses meeting head on, speeds below 0 the other way: elastic, as billiard balls, or sticking together. ' +
                            'Their speeds after, their momentum and the kinetic energy lost.',
                            fields: [{ k: 'm1', l: 'm<sub>1</sub>', ph: 'kg', name: 'm₁' }, { k: 'u1', l: 'u<sub>1</sub>', ph: 'm/s', name: 'u₁' }, { k: 'm2', l: 'm<sub>2</sub>', ph: 'kg', name: 'm₂' },
                                { k: 'u2', l: 'u<sub>2</sub>', ph: 'm/s', name: 'u₂' }, { k: 'stick', l: 'They', choice: ['Bounce, elastic', 'Stick together'] }], cols: 2, run: runCollision,
                            example: { m1: '2', u1: '3', m2: '1', u2: '-1' } },
                        { id: 'impulse', t: 'Impulse and momentum', f: ['J = FΔt = Δp', 'p = mv'], d: 'A mass whose speed changes from u to v, below 0 the other way: its momentum before and after, ' +
                            'the impulse that changed it, and in a time Δt the average force, as of a bat on a ball or a crumple zone.',
                            fields: [{ k: 'm', l: 'm', ph: 'kg' }, { k: 'u', l: 'u', ph: '0', def: 0 }, { k: 'v', l: 'v', ph: 'm/s' }, { k: 't', l: 'Δt', ph: 's, optional', name: 'Δt' }],
                            cols: 2, run: runImpulse, example: { m: '0.145', u: '-40', v: '50', t: '0.001' } },
                        { id: 'energy', t: 'Kinetic and potential energy', f: ['½mv<sup>2</sup>', 'mgh'], d: 'The kinetic energy of a mass at a speed, its potential energy at a height, and the speed it would have at the ground, falling with no air.',
                            fields: [{ k: 'm', l: 'm', ph: 'kg' }, { k: 'v', l: 'v', ph: 'm/s', def: 0 }, { k: 'h', l: 'h', ph: 'm', def: 0 }, GRAVITY], cols: 2, run: runEnergy, example: { m: '2', v: '3', h: '10' } },
                        { id: 'work', t: 'Work and power', f: ['W = Fd cos θ', 'P = W/t'], d: 'The work of a force along a way, at an angle θ to it, and the power of it done in a time.',
                            fields: [{ k: 'F', l: 'F', ph: 'N' }, { k: 'd', l: 'd', ph: 'm' }, { k: 'a', l: 'θ', ph: '0', def: 0, name: 'θ' }, { k: 't', l: 't', ph: 's, optional' }], cols: 2, run: runWork,
                            example: function () { return { F: '50', d: '10', a: angleTyped(30), t: '5' }; } },
                        { id: 'torque', t: 'Torque and levers', f: ['τ = Fr sin θ', 'F<sub>1</sub>d<sub>1</sub> = F<sub>2</sub>d<sub>2</sub>'], d: 'The turning of a force F pushing r from a pivot, at θ to the bar, ' +
                            'a right angle unless typed; or a lever balanced, of a load and its distance from the pivot: the effort at another distance, and how much it gives.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Of', choice: ['A force', 'A lever'] }].concat(raw.kind === '1' ?
                                    [{ k: 'W', l: 'Load', ph: 'N' }, { k: 'd1', l: 'd<sub>load</sub>', ph: 'm', name: 'd load' }, { k: 'd2', l: 'd<sub>effort</sub>', ph: 'm', name: 'd effort' }] :
                                    [{ k: 'F', l: 'F', ph: 'N' }, { k: 'r', l: 'r', ph: 'm' }, { k: 'a', l: 'θ', ph: angleTyped(90), name: 'θ' }]);
                            }, cols: 3, run: runTorque,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, [{ F: '50', r: '0.3', a: angleTyped(60) }, { W: '600', d1: '0.5', d2: '2' }][+raw.kind || 0]); } },
                        { id: 'gravity', t: 'Gravitation', f: ['F = G m<sub>1</sub>m<sub>2</sub>/r<sup>2</sup>', 'r<sub>s</sub> = 2Gm ÷ c<sup>2</sup>'], d: 'The pull between two masses r apart, by Newton\'s law; and of the first, as a planet, the gravity at r, the speed and period of a circular orbit, ' +
                            'the escape speed, and the radius it would be a black hole within, Schwarzschild\'s. The Earth is 5.972e24 kg, its radius 6.371e6 m; the Sun 1.989e30 kg.',
                            fields: [{ k: 'm1', l: 'm<sub>1</sub>', ph: '5.972e24', name: 'm₁' }, { k: 'm2', l: 'm<sub>2</sub>', ph: '1', def: 1, name: 'm₂' }, { k: 'r', l: 'r', ph: '6.371e6' }],
                            cols: 3, drawnLast: true, run: runGravity, example: { m1: '5.972e24', m2: '1', r: '6.371e6' } },
                        { id: 'spring', t: 'Spring', f: ['F = kx', 'E = ½kx<sup>2</sup>'], d: 'A spring of stiffness k stretched or squeezed by x, by Hooke\'s law: its force and the energy it holds; with a mass, its period.',
                            fields: [{ k: 'k', l: 'k', ph: 'N/m' }, { k: 'x', l: 'x', ph: 'm' }, { k: 'm', l: 'm', ph: 'kg, optional' }], cols: 3, run: runSpring, drawnLast: true, example: { k: '200', x: '0.05', m: '0.5' } },
                        { id: 'drag', t: 'Drag and terminal velocity', f: ['F = ½ρv<sup>2</sup>C<sub>d</sub>A', 'v<sub>t</sub> = √(2mg ÷ ρC<sub>d</sub>A)'], d: 'A mass falling through air: the speed it falls no faster than, ' +
                            'where drag is its weight, how long it takes to reach 95% of it and how far it falls till then; and the drag at a speed. C<sub>d</sub> of a ball is about 0.47, ' +
                            'a person falling 1, a car 0.3. Air is 1.225 kg/m³.',
                            fields: [{ k: 'm', l: 'm', ph: 'kg' }, { k: 'cd', l: 'C<sub>d</sub>', ph: '1', def: 1, name: 'Cd' }, { k: 'A', l: 'A', ph: 'm²' }, { k: 'rho', l: 'ρ', ph: '1.225', def: 1.225, name: 'ρ' },
                                { k: 'v', l: 'v', ph: 'optional' }, GRAVITY], cols: 2, drawnLast: true, run: runDrag, example: { m: '80', cd: '1', A: '0.7' } },
                        { id: 'coulomb', t: 'Coulomb\'s law', f: 'F = kq<sub>1</sub>q<sub>2</sub> ÷ r<sup>2</sup>', d: 'The force between two charges r apart, whether they pull or push, the field and the potential of the first at the second, ' +
                            'and the energy of the two. Charges as 2µ or 1.6e-19; k = 8.988 × 10⁹ N·m²/C².',
                            fields: [{ k: 'q1', l: 'q<sub>1</sub>', ph: '2µ', text: true, aria: 'q1' }, { k: 'q2', l: 'q<sub>2</sub>', ph: '-3µ', text: true, aria: 'q2' }, { k: 'r', l: 'r', ph: 'm' }],
                            cols: 3, drawnLast: true, run: runCoulomb, example: { q1: '2µ', q2: '-3µ', r: '0.05' } },
                        { id: 'magnetic', t: 'Magnetic force', f: ['F = qvB sin θ', 'F = BIL sin θ'], d: 'The force of a magnetic field B on a charge moving through it, with the circle it goes round, ' +
                            'its period and frequency, an electron\'s unless typed; or on a wire carrying a current. θ between them, a right angle unless typed.',
                            fields: function (raw) {
                                var wire = raw.kind === '1';
                                return [{ k: 'kind', l: 'On', choice: ['A charge', 'A wire'] }, { k: 'B', l: 'B', ph: 'teslas', text: true }].concat(wire ?
                                    [{ k: 'I', l: 'I', ph: 'amperes', text: true }, { k: 'L', l: 'L', ph: 'm', text: true }] :
                                    [{ k: 'v', l: 'v', ph: 'm/s', text: true }, { k: 'q', l: 'q', ph: '1.602e-19', text: true }, { k: 'm', l: 'm', ph: '9.109e-31', text: true }])
                                    .concat([{ k: 'a', l: 'θ', ph: angleTyped(90), name: 'θ' }]);
                            }, cols: 2, run: runMagnetic,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, [{ B: '0.01', v: '1e6' }, { B: '0.5', I: '3', L: '0.2' }][+raw.kind || 0]); } },
                        { id: 'field', t: 'Magnetic field', f: ['B = μ<sub>0</sub>I ÷ 2πr', 'B = μ<sub>0</sub>NI ÷ L'], d: 'The field of a current: at r from a long straight wire, and of a second wire there ' +
                            'carrying I₂, the force between them each metre; inside a solenoid of N turns along L, its core μ<sub>r</sub> times stronger; or at the middle of a loop of radius r ' +
                            'and N turns. The Earth\'s is about 50 µT.',
                            fields: function (raw) {
                                var of = +raw.kind || 0;
                                return [{ k: 'kind', l: 'Of', choice: ['A wire', 'A solenoid', 'A loop'] }, { k: 'I', l: 'I', ph: 'amperes', text: true }].concat(
                                    of === 1 ? [{ k: 'N', l: 'N', ph: '500' }, { k: 'L', l: 'L', ph: 'm', text: true }, { k: 'mu', l: 'μ<sub>r</sub>', ph: '1', def: 1, name: 'μr' }] :
                                        of === 2 ? [{ k: 'r', l: 'r', ph: 'm', text: true }, { k: 'N', l: 'N', ph: '1', def: 1 }] :
                                            [{ k: 'r', l: 'r', ph: 'm', text: true }, { k: 'I2', l: 'I<sub>2</sub>', ph: 'optional', text: true, aria: 'I2' }]);
                            }, cols: 2, drawnLast: true, run: runField,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, [{ I: '10', r: '0.05', I2: '5' }, { I: '2', N: '500', L: '0.25' }, { I: '3', r: '0.1', N: '20' }][+raw.kind || 0]); } },
                        { id: 'induction', t: 'Induction', f: ['ε = –N ΔΦ ÷ Δt', 'ε = BLv'], d: 'The voltage a changing field makes, by Faraday\'s law: in a coil of N turns and area A, its field ' +
                            'changing by ΔB in Δt; in a rod of length L moving at v across a field; or the peak of a generator, its coil turning at so many revolutions a minute. With a resistance, the current.',
                            fields: function (raw) {
                                var of = +raw.kind || 0;
                                return [{ k: 'kind', l: 'Of', choice: ['A coil', 'A moving rod', 'A generator'] }].concat(of === 1 ?
                                    [{ k: 'B', l: 'B', ph: 'teslas', text: true }, { k: 'L', l: 'L', ph: 'm', text: true }, { k: 'v', l: 'v', ph: 'm/s', text: true }] :
                                    [{ k: 'N', l: 'N', ph: '100', text: true }, { k: 'A', l: 'A', ph: 'm²', text: true },
                                        of === 2 ? { k: 'B', l: 'B', ph: 'teslas', text: true } : { k: 'dB', l: 'ΔB', ph: 'teslas', text: true, aria: 'ΔB' },
                                        of === 2 ? { k: 'rpm', l: 'rpm', ph: '3000', text: true } : { k: 't', l: 'Δt', ph: 's', text: true, aria: 'Δt' }],
                                [{ k: 'R', l: 'R', ph: 'Ω, optional', text: true }]);
                            }, cols: 2, run: runInduction,
                            example: function (raw) {
                                return Object.assign({ kind: raw.kind || '0' }, [{ N: '200', A: '0.01', dB: '0.5', t: '0.1', R: '10' }, { B: '0.5', L: '0.2', v: '3', R: '2' }, { N: '100', A: '0.02', B: '0.2', rpm: '3000' }][+raw.kind || 0]);
                            } }
                    ],
                    waves: [
                        { id: 'wave', t: 'Waves', f: 'v = fλ', d: 'Type two of the speed v, the frequency f and the wavelength λ, and the third is worked out; and the period, angular frequency and wave number.',
                            fields: [{ k: 'v', l: 'v', ph: 'm/s' }, { k: 'f', l: 'f', ph: 'Hz' }, { k: 'w', l: 'λ', ph: 'm', name: 'λ' }], cols: 3, run: runWave, example: { v: '343', f: '440' } },
                        { id: 'photon', t: 'Light and photons', f: ['E = hf', 'c = fλ'], d: 'Light of a wavelength, frequency or energy: the other two, and what light it is, of its colour where it is seen.',
                            fields: function (raw) {
                                return [{ k: 'light', l: 'Of', choice: ['Wavelength', 'Frequency', 'Energy'] },
                                    [{ k: 'x', l: 'λ, nm', ph: '550', name: 'λ' }, { k: 'x', l: 'f, Hz', ph: '5.45e14', name: 'f' }, { k: 'x', l: 'E, eV', ph: '2.25', name: 'E' }][+raw.light || 0]];
                            }, cols: 1, run: runPhoton, example: function (raw) { return Object.assign({ light: raw.light || '0' }, [{ x: '550' }, { x: '5.45e14' }, { x: '2.25' }][+raw.light || 0]); } },
                        { id: 'standing', t: 'Standing waves', f: ['f = nv ÷ 2L', 'f = (2n – 1)v ÷ 4L'], d: 'A string held at both ends, as a guitar\'s, of tension T and mass a metre μ; or a pipe open at both ends, ' +
                            'or closed at one, as a flute or a clarinet: the frequency of its n-th mode, its wavelength, and its nodes, drawn. Sound in air at 20 °C goes 343 m/s.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Of', choice: ['A string', 'An open pipe', 'A closed pipe'] }, { k: 'L', l: 'L', ph: 'm' }].concat(raw.kind === '1' || raw.kind === '2' ?
                                    [{ k: 'v', l: 'v', ph: '343', def: 343 }] : [{ k: 'T', l: 'T', ph: 'N' }, { k: 'mu', l: 'μ', ph: 'kg/m', name: 'μ' }], [{ k: 'n', l: 'n', ph: '1', def: 1 }]);
                            }, cols: 2, run: runStanding,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0', n: '2' }, raw.kind === '1' || raw.kind === '2' ? { L: '0.6' } : { L: '0.65', T: '70', mu: '0.0011' }); } },
                        { id: 'beats', t: 'Beats', f: ['f<sub>beat</sub> = |f<sub>1</sub> – f<sub>2</sub>|', 'f = (f<sub>1</sub> + f<sub>2</sub>) ÷ 2'], d: 'Two notes of frequencies near each other sounded together: ' +
                            'their loudness rising and falling, the beats, how many a second and how long between them, the note heard, between the two, and how far apart they are in cents; drawn. ' +
                            'As a string is tuned to another, the beats slow till there are none.',
                            fields: [{ k: 'f1', l: 'f<sub>1</sub>', ph: 'Hz, 440', name: 'f₁' }, { k: 'f2', l: 'f<sub>2</sub>', ph: 'Hz, 444', name: 'f₂' }], cols: 2, run: runBeats, example: { f1: '440', f2: '444' } },
                        { id: 'lens', t: 'Lenses and mirrors', f: '1/f = 1/d<sub>o</sub> + 1/d<sub>i</sub>', d: 'A thin lens or a mirror: type two of the focal length f, the distance to the object and to the image, and the third is worked out; ' +
                            'the magnification, and the image. f is above 0 for a converging lens or a concave mirror; an image distance below 0 is virtual.',
                            fields: [{ k: 'f', l: 'f', ph: '10' }, { k: 'o', l: 'd<sub>o</sub>', ph: '30', name: 'dₒ' }, { k: 'i', l: 'd<sub>i</sub>', ph: '', name: 'dᵢ' }, { k: 'h', l: 'Height', ph: 'optional' }],
                            cols: 2, run: runLens, example: { f: '10', o: '30' } },
                        { id: 'lensmaker', t: 'Lensmaker\'s equation', f: '1/f = (n – 1)(1/R<sub>1</sub> – 1/R<sub>2</sub>)', d: 'A thin lens of index n, of faces of radii R<sub>1</sub>, the one the light meets first, ' +
                            'and R<sub>2</sub>: its focal length, its power in dioptres, and whether it gathers light or spreads it; its shape drawn. A radius is above 0 where its centre is past its face, ' +
                            'so a lens bulging both ways has R<sub>1</sub> above 0 and R<sub>2</sub> below; empty, the face is flat. Glass is about 1.5; in water, n<sub>m</sub> is 1.333.',
                            fields: [{ k: 'n', l: 'n', ph: '1.5', def: 1.5 }, { k: 'r1', l: 'R<sub>1</sub>', ph: 'm, empty flat', name: 'R₁' }, { k: 'r2', l: 'R<sub>2</sub>', ph: 'm, empty flat', name: 'R₂' },
                                { k: 'nm', l: 'n<sub>m</sub>', ph: '1', def: 1, name: 'nm' }], cols: 2, run: runLensmaker, example: { n: '1.5', r1: '0.2', r2: '-0.3' } },
                        { id: 'snell', t: 'Refraction', f: 'n<sub>1</sub> sin θ<sub>1</sub> = n<sub>2</sub> sin θ<sub>2</sub>', d: 'Light going from one medium to another, by Snell\'s law: the angle it bends to, from the normal, the critical angle, ' +
                            'and whether it is all reflected. Air is 1.000293, water 1.333, glass about 1.5.',
                            fields: [{ k: 'n1', l: 'n<sub>1</sub>', ph: '1', def: 1, name: 'n₁' }, { k: 'a', l: 'θ<sub>1</sub>', ph: '30', name: 'θ₁' }, { k: 'n2', l: 'n<sub>2</sub>', ph: '1.5', def: 1.5, name: 'n₂' }],
                            cols: 3, run: runSnell, example: function () { return { n1: '1', a: angleTyped(30), n2: '1.5' }; } },
                        { id: 'interference', t: 'Interference', f: ['d sin θ = mλ', 'Δy = λL ÷ d'], d: 'Light through two slits a gap d apart, onto a screen L away: how far apart its bright fringes are, ' +
                            'by Young; or through a grating of so many lines a millimetre: the angle of each order, and how many there are. Drawn in its colour.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Through', choice: ['Two slits', 'A grating'] }, { k: 'w', l: 'λ, nm', ph: '550', name: 'λ' }].concat(raw.kind === '1' ?
                                    [{ k: 'N', l: 'Lines/mm', ph: '600', name: 'Lines/mm' }] : [{ k: 'd', l: 'd', ph: 'm, 0.25e-3' }, { k: 'L', l: 'L', ph: 'm' }], [{ k: 'm', l: 'Order', ph: '1', def: 1 }]);
                            }, cols: 2, run: runInterference,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, raw.kind === '1' ? { w: '550', N: '600', m: '1' } : { w: '633', d: '0.25e-3', L: '2', m: '1' }); } },
                        { id: 'slit', t: 'One slit and resolution', f: ['a sin θ = mλ', 'θ = 1.22λ ÷ D'], d: 'Light through one slit of width a: the angle of its m-th dark fringe, how wide ' +
                            'the bright middle is, and on a screen L away, in metres too. Or through a round hole of width D, as of a telescope, a camera or the eye: the smallest angle ' +
                            'between two points it tells apart, by Rayleigh, and at a distance, how far apart they must be. The eye\'s pupil is some 2 to 8 mm. The light drawn in its colour.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Through', choice: ['A slit', 'A round hole'] }, { k: 'w', l: 'λ, nm', ph: '550', name: 'λ' }].concat(raw.kind === '1' ?
                                    [{ k: 'D', l: 'D', ph: 'm, 5e-3' }, { k: 'L', l: 'Distance', ph: 'm, optional' }] : [{ k: 'a', l: 'a', ph: 'm, 0.1e-3' }, { k: 'L', l: 'L', ph: 'm, optional' }, { k: 'm', l: 'Order', ph: '1', def: 1 }]);
                            }, cols: 2, run: runSlit,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, raw.kind === '1' ? { w: '550', D: '5e-3', L: '100' } : { w: '633', a: '0.1e-3', L: '2', m: '1' }); } },
                        { id: 'polarise', t: 'Polarisation', f: ['I = I<sub>0</sub> cos<sup>2</sup> θ', 'tan θ<sub>B</sub> = n<sub>2</sub> ÷ n<sub>1</sub>'], d: 'Polarised light through a polariser at θ to it: ' +
                            'what goes through, by Malus\'s law, and of light not polarised, through one first; and of light off a surface from n₁ into n₂, the angle where what it reflects is all polarised, Brewster\'s.',
                            fields: [{ k: 'I', l: 'I<sub>0</sub>', ph: '1', def: 1, name: 'I₀' }, { k: 'a', l: 'θ', ph: '30', name: 'θ' }, { k: 'n1', l: 'n<sub>1</sub>', ph: '1', def: 1, name: 'n₁' },
                                { k: 'n2', l: 'n<sub>2</sub>', ph: '1.5', def: 1.5, name: 'n₂' }], cols: 2, run: runPolarise, example: function () { return { I: '100', a: angleTyped(60) }; } },
                        { id: 'doppler', t: 'Doppler effect', f: ['f′ = f (v + v<sub>o</sub>) ÷ (v – v<sub>s</sub>)', 'λ′ = λ√((1 + β) ÷ (1 – β))'], d: 'The frequency heard of a source moving and a listener moving: ' +
                            'speeds above 0 toward each other, below 0 apart. Sound in air at 20 °C goes 343 m/s. Or light, of a star or a galaxy going away at v, by relativity: its wavelength seen, ' +
                            'longer, redder, and its redshift z; below 0 coming nearer, bluer. Hydrogen\'s red line, Hα, is 656.3 nm.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Of', choice: ['Sound', 'Light'] }].concat(raw.kind === '1' ? [{ k: 'lw', l: 'λ, nm', ph: '656.3', name: 'λ' }, { k: 'lv', l: 'v', ph: 'km/s, away', name: 'v' }] :
                                    [{ k: 'f', l: 'f', ph: 'Hz' }, { k: 'v', l: 'v', ph: '343', def: 343 }, { k: 's', l: 'v<sub>s</sub>', ph: '0', def: 0, name: 'vₛ' }, { k: 'o', l: 'v<sub>o</sub>', ph: '0', def: 0, name: 'vₒ' }]);
                            }, cols: 2, run: runDoppler, example: function (raw) { return raw.kind === '1' ? { kind: '1', lw: '656.3', lv: '30000' } : { kind: '0', f: '440', s: '30' }; } },
                        { id: 'decibel', t: 'Sound level', f: 'L = 10 log(I ÷ I<sub>0</sub>)', d: 'Of a sound\'s intensity, its level in decibels, or the other way; I₀, the faintest heard, is 10⁻¹² W/m².',
                            fields: function (raw) {
                                return [{ k: 'sound', l: 'Of', choice: ['Intensity', 'Decibels'] }, raw.sound === '1' ? { k: 'x', l: 'L, dB', ph: '60', name: 'L' } : { k: 'x', l: 'I, W/m²', ph: '1e-6', name: 'I' }];
                            }, cols: 1, run: runDecibel, example: function (raw) { return Object.assign({ sound: raw.sound || '0' }, [{ x: '1e-6' }, { x: '60' }][+raw.sound || 0]); } }
                    ],
                    matter: [
                        { id: 'heatcap', t: 'Specific heat', f: 'Q = mcΔT', d: 'The heat to warm a mass by ΔT, or that it gives cooling: type three of the heat Q, the mass m, the specific heat c and ΔT, and the fourth is worked out. ' +
                            'Water is 4186 J/(kg·K), ice 2100, aluminium 900, iron 450, copper 385.',
                            fields: [{ k: 'Q', l: 'Q', ph: 'J' }, { k: 'm', l: 'm', ph: 'kg' }, { k: 'c', l: 'c', ph: 'J/(kg·K)' }, { k: 'dT', l: 'ΔT', ph: 'K or °C', name: 'ΔT' }],
                            cols: 2, run: runHeatCap, example: { m: '2', c: '4186', dT: '30' } },
                        { id: 'latent', t: 'Latent heat', f: 'Q = mL', d: 'The heat to melt or boil a mass, its temperature staying the same: type two of the heat Q, the mass m and the latent heat L, and the third is worked out. ' +
                            'Ice melts at 334 kJ/kg, 3.34e5; water boils at 2.26 MJ/kg, 2.26e6.',
                            fields: [{ k: 'Q', l: 'Q', ph: 'J' }, { k: 'm', l: 'm', ph: 'kg' }, { k: 'L', l: 'L', ph: 'J/kg' }], cols: 3, run: runLatent, example: { m: '0.5', L: '334000' } },
                        { id: 'mixing', t: 'Mixing', f: 'm<sub>1</sub>c<sub>1</sub>(T – T<sub>1</sub>) + m<sub>2</sub>c<sub>2</sub>(T – T<sub>2</sub>) = 0', d: 'Two things at two temperatures put together, as hot water into cold: the temperature they end at, ' +
                            'and the heat that goes from one to the other. c is water\'s, 4186, unless typed.',
                            fields: [{ k: 'm1', l: 'm<sub>1</sub>', ph: 'kg', name: 'm₁' }, { k: 'c1', l: 'c<sub>1</sub>', ph: '4186', def: 4186, name: 'c₁' }, { k: 'T1', l: 'T<sub>1</sub>', ph: '°C', name: 'T₁' },
                                { k: 'm2', l: 'm<sub>2</sub>', ph: 'kg', name: 'm₂' }, { k: 'c2', l: 'c<sub>2</sub>', ph: '4186', def: 4186, name: 'c₂' }, { k: 'T2', l: 'T<sub>2</sub>', ph: '°C', name: 'T₂' }],
                            cols: 3, run: runMixing, example: { m1: '0.2', T1: '90', m2: '0.3', T2: '20' } },
                        { id: 'expansion', t: 'Thermal expansion', f: ['ΔL = αL<sub>0</sub>ΔT', 'ΔV = βV<sub>0</sub>ΔT'], d: 'How much longer, or larger, a thing grows warmed by ΔT, smaller cooled. Steel is about 12e-6 per K, ' +
                            'aluminium 23e-6, glass 9e-6; of a solid, β is about 3α.',
                            fields: function (raw) {
                                var vol = raw.kind === '1';
                                return [{ k: 'kind', l: 'Of', choice: ['Length', 'Volume'] }, { k: 'x', l: vol ? 'V<sub>0</sub>' : 'L<sub>0</sub>', ph: vol ? 'm³' : 'm', name: vol ? 'V₀' : 'L₀' },
                                    { k: 'a', l: vol ? 'β' : 'α', ph: '1/K', name: vol ? 'β' : 'α' }, { k: 'dT', l: 'ΔT', ph: 'K or °C', name: 'ΔT' }];
                            }, cols: 3, run: runExpansion, example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, [{ x: '100', a: '12e-6', dT: '40' }, { x: '1', a: '2.1e-4', dT: '60' }][+raw.kind || 0]); } },
                        { id: 'conduction', t: 'Heat conduction', f: 'P = kAΔT ÷ d', d: 'The heat that flows each second through a wall or a pane of thickness d and area A, by Fourier\'s law, with ΔT across it. ' +
                            'k of copper is about 400 W/(m·K), glass 0.8, brick 0.7, wood 0.15, air 0.026.',
                            fields: [{ k: 'k', l: 'k', ph: 'W/(m·K)' }, { k: 'A', l: 'A', ph: 'm²' }, { k: 'dT', l: 'ΔT', ph: 'K or °C', name: 'ΔT' }, { k: 'd', l: 'd', ph: 'm' }, { k: 't', l: 't', ph: 's, optional' }],
                            cols: 2, run: runConduction, example: { k: '0.8', A: '2', dT: '20', d: '0.005' } },
                        { id: 'radiation', t: 'Radiation', f: ['P = εσAT<sup>4</sup>', 'λ<sub>max</sub> = b ÷ T'], d: 'The power a hot body shines, by the Stefan–Boltzmann law, and the wavelength it shines brightest at, by Wien\'s; ' +
                            'with the temperature around it, what it loses. Temperatures in kelvin: the Sun is 5772 K, a person 310.',
                            fields: [{ k: 'T', l: 'T', ph: 'K' }, { k: 'A', l: 'A', ph: '1', def: 1 }, { k: 'e', l: 'ε', ph: '1', def: 1, name: 'ε' }, { k: 'Ts', l: 'Around', ph: 'K, optional' }],
                            cols: 2, run: runRadiation, example: { T: '310', A: '1.8', e: '0.97', Ts: '293' } },
                        { id: 'cooling', t: 'Cooling', f: 'T = T<sub>a</sub> + (T<sub>0</sub> – T<sub>a</sub>)e<sup>–kt</sup>', d: 'Newton\'s law of cooling: a thing at T<sub>0</sub> in air at T<sub>a</sub>, ' +
                            'as a cup of tea, cooling, or warming, the faster the farther it is from the air. Of its k a minute, or of a reading, T<sub>1</sub> after t<sub>1</sub> minutes: ' +
                            'its temperature after t minutes, how long it takes to come to a temperature, and its curve. In °C, or any one unit.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['A reading', 'k'] }, { k: 'T0', l: 'T<sub>0</sub>', ph: '°C, at first', name: 'T₀' }, { k: 'Ta', l: 'T<sub>a</sub>', ph: '20', def: 20, name: 'Ta' }]
                                    .concat(raw.by === '1' ? [{ k: 'k', l: 'k', ph: 'a minute' }] : [{ k: 't1', l: 't<sub>1</sub>', ph: 'min', name: 't₁' }, { k: 'T1', l: 'T<sub>1</sub>', ph: '°C, then', name: 'T₁' }],
                                        [{ k: 't', l: 't', ph: 'min, optional' }, { k: 'T', l: 'To', ph: '°C, optional', name: 'To' }]);
                            }, cols: 2, drawnLast: true, run: runCooling,
                            example: function (raw) { return Object.assign({ by: raw.by || '0', T0: '90', Ta: '20', t: '30', T: '60' }, raw.by === '1' ? { k: '0.03' } : { t1: '5', T1: '80' }); } },
                        { id: 'dew', t: 'Dew point and humidity', f: ['T<sub>d</sub> = cγ ÷ (b – γ)', 'γ = ln(RH ÷ 100) + bT ÷ (c + T)'], d: 'Air at a temperature T and a relative humidity RH: ' +
                            'its dew point, where water comes out of it as it cools, as dew, mist or on a cold glass; or of its dew point, its humidity. The water in a cubic metre of it, and the pressure ' +
                            'of its vapour, drawn on the curve of the most air holds. By Magnus\'s formula, b 17.625 and c 243.04 °C, from –45 °C to 60 °C. In °C.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Humidity', 'Dew point'] }, { k: 'T', l: 'T', ph: '°C' },
                                    raw.by === '1' ? { k: 'Td', l: 'T<sub>d</sub>', ph: '°C', name: 'Td' } : { k: 'rh', l: 'RH', ph: '%', name: 'RH' }];
                            }, cols: 2, run: runDew, example: function (raw) { return raw.by === '1' ? { by: '1', T: '25', Td: '15' } : { by: '0', T: '25', rh: '60' }; } },
                        { id: 'molecules', t: 'Gas molecules', f: ['v<sub>rms</sub> = √(3RT ÷ M)', 'E = <sup>3</sup>⁄<sub>2</sub>kT'], d: 'The molecules of a gas of molar mass M at a temperature T, ' +
                            'by the kinetic theory: how fast they go, the root mean square, the mean and the most likely speed, drawn; and the energy of each. ' +
                            'M in g/mol: air is about 29, nitrogen 28, oxygen 32, helium 4. T in kelvin.',
                            fields: [{ k: 'M', l: 'M', ph: 'g/mol' }, { k: 'T', l: 'T', ph: 'K' }], cols: 2, run: runMolecules, example: { M: '28', T: '293' } },
                        { id: 'gasprocess', t: 'Gas processes', f: ['PV = nRT', 'PV<sup>γ</sup> = constant'], d: 'An ideal gas at P₁, V₁ and T₁ taken to a new volume at a steady temperature, isothermal, ' +
                            'at a steady pressure, isobaric, or with no heat in or out, adiabatic; or warmed at a steady volume, isochoric, to a new temperature: its pressure, volume ' +
                            'and temperature after, how many moles, the work it does, the heat put in and the change in its energy, its path drawn. Air is of two atoms a molecule, ' +
                            'γ 7/5; helium and argon of one, 5/3. T in kelvin.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'It is', choice: ['Isothermal', 'Isobaric', 'Isochoric', 'Adiabatic'] }, { k: 'gas', l: 'Molecule', choice: ['2 atoms', '1 atom', '3 or more'] },
                                    { k: 'P', l: 'P<sub>1</sub>', ph: '101325', def: 101325, name: 'P₁' }, { k: 'V', l: 'V<sub>1</sub>', ph: 'm³', name: 'V₁' }, { k: 'T', l: 'T<sub>1</sub>', ph: '293.15', def: 293.15, name: 'T₁' },
                                    raw.kind === '2' ? { k: 'T2', l: 'T<sub>2</sub>', ph: 'K', name: 'T₂' } : { k: 'V2', l: 'V<sub>2</sub>', ph: 'm³', name: 'V₂' }];
                            }, cols: 2, run: runGasProcess,
                            example: function (raw) {
                                return Object.assign({ kind: raw.kind || '0', gas: raw.gas || '0', P: '101325', V: '0.001', T: '300' }, raw.kind === '2' ? { T2: '600' } : { V2: raw.kind === '3' ? '0.0005' : '0.002' });
                            } },
                        { id: 'engine', t: 'Heat engines', f: ['η = 1 – T<sub>C</sub> ÷ T<sub>H</sub>', 'COP = T<sub>C</sub> ÷ (T<sub>H</sub> – T<sub>C</sub>)'], d: 'An engine between a hot T<sub>H</sub> and a cold ' +
                            'T<sub>C</sub>, in kelvin: the most of its heat it can turn to work, Carnot\'s; with the heat taken in and the work done, how well it does. ' +
                            'Or a fridge or a heat pump: the most heat it can move for each joule.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'It is', choice: ['An engine', 'A fridge or heat pump'] }, { k: 'Th', l: 'T<sub>H</sub>', ph: 'K', name: 'TH' }, { k: 'Tc', l: 'T<sub>C</sub>', ph: 'K', name: 'TC' }]
                                    .concat(raw.kind === '1' ? [{ k: 'W', l: 'W', ph: 'J, optional' }] : [{ k: 'Q', l: 'Q<sub>H</sub>', ph: 'J, optional', name: 'QH' }, { k: 'W', l: 'W', ph: 'J, optional' }]);
                            }, cols: 2, run: runEngine,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0' }, raw.kind === '1' ? { Th: '308', Tc: '268', W: '1000' } : { Th: '800', Tc: '300', Q: '1000', W: '400' }); } },
                        { id: 'stress', t: 'Stress and strain', f: ['σ = F ÷ A', 'E = σ ÷ ε'], d: 'A wire or bar of length L and cross-section A pulled by a force F: its stress, and of how much it stretches, ΔL, ' +
                            'or of its Young\'s modulus E, the other; its strain and the energy it holds. Steel is about 200 GPa, 200G; copper 120G, aluminium 70G, rubber 0.01G to 0.1G.',
                            fields: [{ k: 'F', l: 'F', ph: 'N' }, { k: 'A', l: 'A', ph: 'm²' }, { k: 'L', l: 'L', ph: 'm' }, { k: 'dL', l: 'ΔL', ph: 'm', name: 'ΔL' }, { k: 'E', l: 'E', ph: 'Pa, as 200G', text: true }],
                            cols: 2, run: runStress, example: { F: '1000', A: '1e-6', L: '2', E: '200G' } },
                        { id: 'density', t: 'Density', f: 'ρ = m ÷ V', d: 'Type two of the density ρ, the mass m and the volume V, and the third is worked out; and whether it floats on water. ' +
                            'Water is 1000 kg/m³, ice 917, aluminium 2700, iron 7870, gold 19300.',
                            fields: [{ k: 'rho', l: 'ρ', ph: 'kg/m³', name: 'ρ' }, { k: 'm', l: 'm', ph: 'kg' }, { k: 'V', l: 'V', ph: 'm³' }], cols: 3, run: runDensity, example: { m: '2.7', V: '0.001' } },
                        { id: 'pressure', t: 'Pressure', f: 'P = F ÷ A', d: 'Type two of the pressure P, the force F and the area A it pushes on, and the third is worked out; the pressure in other units too.',
                            fields: [{ k: 'P', l: 'P', ph: 'Pa' }, { k: 'F', l: 'F', ph: 'N' }, { k: 'A', l: 'A', ph: 'm²' }], cols: 3, run: runPressure, example: { F: '700', A: '0.05' } },
                        { id: 'depth', t: 'Pressure at a depth', f: 'P = P<sub>0</sub> + ρgh', d: 'The pressure at a depth h in a liquid: of the liquid alone, gauge, and with the air above, absolute; with an area, the force on it. ' +
                            'Water unless typed, 1000 kg/m³; sea water is 1025.',
                            fields: [{ k: 'h', l: 'h', ph: 'm' }, { k: 'rho', l: 'ρ', ph: '1000', def: 1000, name: 'ρ' }, { k: 'P0', l: 'P<sub>0</sub>', ph: '101325', def: 101325, name: 'P₀' },
                                { k: 'A', l: 'A', ph: 'm², optional' }, GRAVITY], cols: 2, drawnLast: true, run: runDepth, example: { h: '10' } },
                        { id: 'buoyancy', t: 'Buoyancy', f: 'F = ρ<sub>fluid</sub>Vg', d: 'A thing of mass m and volume V in a liquid, by Archimedes\' principle: the push up on it all under, whether it floats, ' +
                            'how much of it is under, and how heavy it seems under. Water unless typed.',
                            fields: [{ k: 'm', l: 'm', ph: 'kg' }, { k: 'V', l: 'V', ph: 'm³' }, { k: 'rho', l: 'ρ<sub>fluid</sub>', ph: '1000', def: 1000, name: 'ρ fluid' }, GRAVITY],
                            cols: 2, run: runBuoyancy, example: { m: '0.6', V: '0.001' } },
                        { id: 'flow', t: 'Flow in a pipe', f: ['A<sub>1</sub>v<sub>1</sub> = A<sub>2</sub>v<sub>2</sub>', 'P + ½ρv<sup>2</sup> + ρgh'], d: 'A liquid flowing from a pipe of one width into another, by continuity and Bernoulli\'s law, ' +
                            'with no friction: its speed in the second, the flow, and how much its pressure falls; with a rise in height, of that too. Water unless typed.',
                            fields: [{ k: 'v1', l: 'v<sub>1</sub>', ph: 'm/s', name: 'v₁' }, { k: 'd1', l: 'd<sub>1</sub>', ph: 'm, its width', name: 'd₁' }, { k: 'd2', l: 'd<sub>2</sub>', ph: 'm', name: 'd₂' },
                                { k: 'rho', l: 'ρ', ph: '1000', def: 1000, name: 'ρ' }, { k: 'h', l: 'Rise', ph: '0', def: 0, name: 'Rise' }, GRAVITY], cols: 3, run: runFlow,
                            example: { v1: '2', d1: '0.1', d2: '0.05' } },
                        { id: 'reynolds', t: 'Reynolds number', f: ['Re = ρvd ÷ μ', 'Δp = f (L/d) ½ρv<sup>2</sup>'], d: 'A fluid flowing at v in a pipe of width d: its Reynolds number, and whether ' +
                            'it flows smoothly in layers, laminar, or churns, turbulent, its speed across the pipe drawn; along a length L, the pressure it loses to friction, by Darcy and ' +
                            'Weisbach, f from Colebrook\'s equation of the pipe\'s roughness ε, and the power to pump it. Water at 20 °C unless typed, 998 kg/m³ and μ 1.002e-3 Pa·s; ' +
                            'air is 1.204 and 1.81e-5. Steel pipe is some 0.045 mm rough, plastic 0.0015.',
                            fields: [{ k: 'v', l: 'v', ph: 'm/s' }, { k: 'd', l: 'd', ph: 'm' }, { k: 'rho', l: 'ρ', ph: '998', def: 998, name: 'ρ' }, { k: 'mu', l: 'μ', ph: '1.002e-3', def: 1.002e-3, name: 'μ' },
                                { k: 'L', l: 'L', ph: 'm, optional' }, { k: 'e', l: 'ε, mm', ph: '0', def: 0, name: 'ε' }], cols: 2, run: runReynolds,
                            example: { v: '2', d: '0.05', L: '100', e: '0.045' } },
                        { id: 'stokes', t: 'Stokes\' law', f: ['F = 6πμrv', 'v = 2(ρ<sub>s</sub> – ρ<sub>f</sub>)gr<sup>2</sup> ÷ 9μ'], d: 'A small ball of radius r and density ρ<sub>s</sub> falling slowly ' +
                            'through a fluid, as a bead through honey, sand through water or a droplet of mist through air: the speed it falls no faster than, below 0 if it rises, the drag then, ' +
                            'and its Reynolds number, below about 1 for the law to hold; its forces drawn. Water at 20 °C unless typed, 998 kg/m³ and μ 1.002e-3 Pa·s; glycerine is 1260 and 1.41, ' +
                            'honey some 1420 and 10, air 1.204 and 1.81e-5. Steel is 7800, glass 2500.',
                            fields: [{ k: 'r', l: 'r', ph: 'm' }, { k: 'rs', l: 'ρ<sub>s</sub>', ph: 'kg/m³', name: 'ρs' }, { k: 'rf', l: 'ρ<sub>f</sub>', ph: '998', def: 998, name: 'ρf' },
                                { k: 'mu', l: 'μ', ph: '1.002e-3', def: 1.002e-3, name: 'μ' }, GRAVITY], cols: 2, run: runStokes, example: { r: '1e-3', rs: '7800', rf: '1260', mu: '1.41' } }
                    ],
                    modern: [
                        { id: 'massenergy', t: 'Mass and energy', f: 'E = mc<sup>2</sup>', d: 'The energy in a mass, by Einstein, or the mass of an energy: in joules, electronvolts, kilowatt-hours and tonnes of TNT.',
                            fields: function (raw) {
                                return [{ k: 'of', l: 'Of', choice: ['Mass', 'Energy'] }, raw.of === '1' ? { k: 'x', l: 'E, J', ph: '9e16', name: 'E' } : { k: 'x', l: 'm, kg', ph: '1', name: 'm' }];
                            }, cols: 1, run: runMassEnergy, example: function (raw) { return Object.assign({ of: raw.of || '0' }, [{ x: '0.001' }, { x: '4.184e15' }][+raw.of || 0]); } },
                        { id: 'binding', t: 'Binding energy', f: 'E = Δmc<sup>2</sup>', d: 'The energy holding a nucleus of Z protons and A nucleons together, of the mass of its atom in u: ' +
                            'its mass defect, and its binding energy, in all and of each nucleon, highest near iron, drawn. Helium-4 is 4.002602 u, iron-56 55.934936, uranium-235 235.043928.',
                            fields: [{ k: 'Z', l: 'Z', ph: '2' }, { k: 'A', l: 'A', ph: '4' }, { k: 'm', l: 'm, u', ph: '4.002602', name: 'm' }], cols: 3, run: runBinding,
                            example: { Z: '26', A: '56', m: '55.934936' } },
                        { id: 'qvalue', t: 'Q-value', f: 'Q = (m<sub>before</sub> – m<sub>after</sub>)c<sup>2</sup>', d: 'The energy a nuclear reaction or a decay gives off, or takes in, of the masses ' +
                            'of the atoms before and after, in u, + between them: above 0, it gives energy off. Of one atom decaying into two, how they share it, the lighter faster. ' +
                            'Uranium-238 is 238.050788 u, thorium-234 234.043601, helium-4 4.002602, hydrogen-2 2.014102, hydrogen-3 3.016049, the neutron 1.008665.',
                            fields: [{ k: 'a', l: 'Before', ph: 'u, 238.050788', text: true, cls: 'calc-sv-wide', aria: 'Before' }, { k: 'b', l: 'After', ph: 'u, 234.043601 + 4.002602', text: true, cls: 'calc-sv-wide', aria: 'After' }],
                            cols: 1, run: runQValue, example: { a: '238.050788', b: '234.043601 + 4.002602' } },
                        { id: 'photoelectric', t: 'Photoelectric effect', f: 'E<sub>k</sub> = hf – φ', d: 'Light on a metal of work function φ: whether it knocks electrons out, how fast they come, the voltage that stops them, ' +
                            'and the light it takes. φ of caesium is about 2.1 eV, sodium 2.3, zinc 4.3, copper 4.7.',
                            fields: function (raw) {
                                return [{ k: 'light', l: 'Of', choice: ['Wavelength', 'Frequency'] }, raw.light === '1' ? { k: 'x', l: 'f, Hz', ph: '1e15', name: 'f' } : { k: 'x', l: 'λ, nm', ph: '400', name: 'λ' },
                                    { k: 'phi', l: 'φ, eV', ph: '2.3', name: 'φ' }];
                            }, cols: 2, run: runPhotoelectric, example: function (raw) { return Object.assign({ light: raw.light || '0', phi: '2.3' }, [{ x: '400' }, { x: '1e15' }][+raw.light || 0]); } },
                        { id: 'debroglie', t: 'de Broglie wavelength', f: 'λ = h ÷ p', d: 'The wavelength of a particle, of its speed or of its kinetic energy in eV: of an electron, a proton, a neutron or a mass typed. ' +
                            'Near the speed of light, worked out by relativity.',
                            fields: function (raw) {
                                return particleFields(raw).concat([{ k: 'by', l: 'By', choice: ['Speed', 'Energy'] },
                                    raw.by === '1' ? { k: 'x', l: 'E<sub>k</sub>, eV', ph: '100', name: 'Ek' } : { k: 'x', l: 'v, m/s', ph: '1e6', name: 'v' }]);
                            }, cols: 2, run: runDeBroglie, example: function (raw) { return Object.assign({ p: raw.p || '0', by: raw.by || '0' }, raw.p === '3' ? { m: '0.145' } : {}, [{ x: raw.p === '3' ? '40' : '1e6' }, { x: '100' }][+raw.by || 0]); } },
                        { id: 'uncertainty', t: 'Uncertainty principle', f: ['Δx Δp ≥ ħ/2', 'ΔE Δt ≥ ħ/2'], d: 'Heisenberg\'s: of how well the place of a particle is known, how badly its momentum and speed can be, ' +
                            'and the energy it must have at least; or the other way; or of energy and time, as how long a state lasts and how wide its line is.',
                            fields: function (raw) {
                                var of = +raw.of || 0;
                                return [{ k: 'of', l: 'Given', choice: ['Δx', 'Δp', 'ΔE', 'Δt'] }].concat(of < 2 ? particleFields(raw) : [],
                                    [[{ k: 'x', l: 'Δx, m', ph: '1e-10', name: 'Δx' }, { k: 'x', l: 'Δp, kg·m/s', ph: '5e-25', name: 'Δp' }, { k: 'x', l: 'ΔE, eV', ph: '1e-6', name: 'ΔE' },
                                        { k: 'x', l: 'Δt, s', ph: '1e-8', name: 'Δt' }][of]]);
                            }, cols: 2, run: runUncertainty,
                            example: function (raw) { return Object.assign({ of: raw.of || '0', p: raw.p || '0' }, raw.p === '3' ? { m: '1e-26' } : {}, { x: ['1e-10', '5e-25', '1e-6', '1e-8'][+raw.of || 0] }); } },
                        { id: 'box', t: 'Particle in a box', f: 'E<sub>n</sub> = n<sup>2</sup>h<sup>2</sup> ÷ 8mL<sup>2</sup>', d: 'A particle held in a box of width L, its walls too high to leave: the energy of its level n, ' +
                            'the step to the next, and the light it gives falling to the level below. An electron in a box of 1 nm, as in a dye or a quantum dot.',
                            fields: function (raw) {
                                return particleFields(raw).concat([{ k: 'L', l: 'L', ph: 'm, 1e-9' }, { k: 'n', l: 'n', ph: '1', def: 1 }]);
                            }, cols: 2, run: runBox, example: function (raw) { return Object.assign({ p: raw.p || '0' }, raw.p === '3' ? { m: '1e-26' } : {}, { L: '1e-9', n: '2' }); } },
                        { id: 'compton', t: 'Compton scattering', f: 'Δλ = (h ÷ m<sub>e</sub>c)(1 – cos θ)', d: 'An X-ray or gamma photon bouncing off an electron at an angle θ: its wavelength and energy after, ' +
                            'and the energy the electron takes. The shift is the same whatever the light: it shows on X-rays, of short wavelengths.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Wavelength', 'Energy'] }, raw.by === '1' ? { k: 'x', l: 'E, keV', ph: '100', name: 'E' } : { k: 'x', l: 'λ, pm', ph: '71', name: 'λ' },
                                    { k: 'a', l: 'θ', ph: angleTyped(90), name: 'θ' }];
                            }, cols: 2, run: runCompton, example: function (raw) { return Object.assign({ by: raw.by || '0', a: angleTyped(90) }, [{ x: '71' }, { x: '100' }][+raw.by || 0]); } },
                        { id: 'tunnel', t: 'Quantum tunnelling', f: 'T ≈ e<sup>–2κL</sup>', d: 'The chance a particle goes through a barrier higher than its energy, as it never could by Newton: ' +
                            'of its energy E, the barrier\'s height V and width L, worked out in full. Above the barrier, the chance it is not reflected.',
                            fields: function (raw) {
                                return particleFields(raw).concat([{ k: 'E', l: 'E, eV', ph: '1', name: 'E' }, { k: 'V', l: 'V, eV', ph: '5', name: 'V' }, { k: 'L', l: 'L', ph: 'm, 5e-10' }]);
                            }, cols: 3, run: runTunnel, example: function (raw) { return Object.assign({ p: raw.p || '0' }, raw.p === '3' ? { m: '1e-27' } : {}, { E: '1', V: '5', L: '5e-10' }); } },
                        { id: 'relativity', t: 'Relativity', f: 'γ = 1 ÷ √(1 – v<sup>2</sup>/c<sup>2</sup>)', d: 'Moving at a speed, by Einstein\'s special relativity: how much slower its clocks go and how much shorter it is, ' +
                            'as seen standing still; and of a mass, its momentum and kinetic energy, against Newton\'s.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Speed', choice: ['m/s', 'Of c'] }, raw.by === '1' ? { k: 'x', l: 'v/c', ph: '0.8', name: 'v/c' } : { k: 'x', l: 'v, m/s', ph: '2.4e8', name: 'v' },
                                    { k: 'm', l: 'm', ph: 'kg, optional' }];
                            }, cols: 2, drawnLast: true, run: runRelativity, example: function (raw) { return Object.assign({ by: raw.by || '0', m: '1' }, [{ x: '2.4e8' }, { x: '0.8' }][+raw.by || 0]); } },
                        { id: 'hydrogen', t: 'Hydrogen and Bohr', f: ['1/λ = RZ<sup>2</sup>(1/n<sub>1</sub><sup>2</sup> – 1/n<sub>2</sub><sup>2</sup>)', 'r = a<sub>0</sub>n<sup>2</sup>/Z'], d: 'The light of hydrogen\'s electron falling from the level n₂ to n₁, by Rydberg: ' +
                            'its wavelength, frequency, energy, series and colour; and by Bohr\'s model the energy of each level, the size of its orbit and ' +
                            'the electron\'s speed. Of an ion of one electron, its Z: He⁺ is 2.',
                            fields: [{ k: 'n1', l: 'n<sub>1</sub>', ph: '2', name: 'n₁' }, { k: 'n2', l: 'n<sub>2</sub>', ph: '3', name: 'n₂' }, { k: 'Z', l: 'Z', ph: '1', def: 1 }],
                            cols: 3, run: runHydrogen, example: { n1: '2', n2: '3' } },
                        { id: 'decay', t: 'Radioactive decay', f: 'N = N<sub>0</sub> × ½<sup>t/T</sup>', d: 'What is left of an amount after a time t, of a half-life T, both in the unit chosen; the amount a mass, a count or an activity. ' +
                            'Of a count of atoms, its activity; and the time to fall to a percent.',
                            fields: [{ k: 'unit', l: 'In', choice: ['sec', 'min', 'hr', 'day', 'year'] }, { k: 'T', l: 'T', ph: '5730', name: 'T' }, { k: 'N', l: 'N<sub>0</sub>', ph: '100', name: 'N₀' },
                                { k: 't', l: 't', ph: '1000' }, { k: 'pc', l: 'To %', ph: 'optional', name: 'To %' }], cols: 2, run: runRadioactive, drawnLast: true, example: { unit: '4', T: '5730', N: '100', t: '10000', pc: '1' } }
                    ]
                };

            // ----- the drawings of the physics ----- //

            // where light of a wavelength in nm is among the kinds of it: in a little room, each kind as wide as the others, the colours seen
            // in theirs; popped out, as a chart of them is drawn as well, of more (spectrumChart). Each shown where it fits, by the CSS
            function spectrumDrawing(nm, of) {
                var W = 300, H = 46, kinds = [[1e-4, 'γ'], [0.01, tr('X-ray')], [10, tr('UV')], [380, tr('Visible')], [750, tr('IR')], [1e6, tr('Micro')], [1e9, tr('Radio')], [1e12]],
                    w = (W - 16) / 7, x, id = 'calc-plot-' + (++app.plotIds), body = rainbow(id);
                if (!(nm > 0)) return '';
                kinds.slice(0, 7).forEach(function (k, i) {
                    body += '<rect class="' + (i === 3 ? '' : 'calc-sv-under') + '" x="' + fix(8 + i * w) + '" y="8" width="' + fix(w) + '" height="16"' + (i === 3 ? ' fill="url(#' + id + ')"' : '') + '/>' +
                        '<text class="calc-sv-small" x="' + fix(8 + (i + 0.5) * w) + '" y="38" text-anchor="middle">' + k[1] + '</text>';
                });
                kinds.some(function (k, i) {
                    if (nm >= kinds[i + 1][0] && i < 6) return false;
                    // the colours seen as their gradient is drawn, even in nm, so a light sits on its own colour; the rest by their powers of ten
                    x = 8 + (i + Math.max(0, Math.min(1, i === 3 ? (nm - 380) / 370 : Math.log(nm / k[0]) / Math.log(kinds[i + 1][0] / k[0])))) * w;
                    return true;
                });
                return svgOf('calc-sv-spec-small', W, H, 'Where it is among the kinds of light', body + '<path class="calc-sv-ground" d="M8 8h' + fix(W - 16) + 'v16H8Z"/>' +
                    '<path class="calc-sv-head calc-sv-head-red" d="M' + fix(x) + ' 8l-4-6.5h8Z"/>' + spectrumMark(x, 7, 26)) + (app.bigPanel ? spectrumChart(nm, of) : '');
            }

            // where a light is, on a strip of the kinds of light or of the colours: a red line down from y0 to y1, a light rim under it, so it shows
            // on the colours, the red as well
            function spectrumMark(x, y0, y1) {
                var d = 'M' + fix(x) + ' ' + y0 + 'V' + y1;
                return '<path class="calc-sv-mark-rim" d="' + d + '"/><path class="calc-sv-curve calc-sv-mark" d="' + d + '"/>';
            }

            // the kinds of light as a chart of them is drawn: the wavelengths in m, 10⁻¹⁶ to 10⁹, spread evenly by their powers of ten, the
            // colours seen given 20 of its width so they show, and the infrared 20 more at its start, its numbers clear of the lines down from
            // them; the radio waves by their bands, FM, short waves, AM and the long, the infrared by near, mid and far, and the light that
            // ionizes, of 10 eV and more, marked along the foot. Above it the one scale of what was typed, of = 0 the wavelengths, 1 the
            // frequencies, 2 the energies; the colours seen drawn out under it, by their names, faint where it is not one of them. Its own a
            // red line, what was typed beside it, its kind red; an arrow at the end where it is beyond them. Beside the colours its wavelength,
            // frequency and energy, worked out as it is typed; of a card of the three (of), one clicked the one typed
            function spectrumChart(nm, of) {
                var W = 600, H = 210, L = 46, R = 556, D0 = -16, D1 = 9, V = 20, G = 20, va = Math.log10(380e-9), vb = Math.log10(750e-9), id = 'calc-plot-' + (++app.plotIds), body = rainbow(id),
                    k = (R - L - V - G) / (D1 - D0 - (vb - va)),
                    px = function (lg) { return lg < va ? L + k * (lg - D0) : lg <= vb ? L + k * (va - D0) + V * (Math.pow(10, lg) - 380e-9) / 370e-9 : L + k * (va - D0 - vb + lg) + V + G; },
                    ZL = 40, ZR = 420, zx = function (n) { return ZL + (ZR - ZL) * (n - 380) / 370; },
                    text = function (x, y, s, anchor, cls) { return svgText(x, y, s, anchor || 'middle', cls, true); },
                    // the name of a scale, in a box of its own, so it is not read as one of its numbers
                    unit = function (x, y, s, anchor) {
                        var w = s.length * 5.4 + 8, x0 = anchor === 'end' ? x - w : x;
                        return '<rect class="calc-sv-unit" x="' + fix(x0) + '" y="' + (y - 10) + '" width="' + fix(w) + '" height="13" rx="3"/>' + text(x0 + w / 2, y, s);
                    },
                    pow = function (n) { return '10<tspan class="calc-sv-sub" dy="-4">' + (n < 0 ? '−' + -n : n) + '</tspan>'; },
                    // each kind: where it ends, in m, its name, and whether its line is the whole height of the bar; each with a tip of what it
                    // is used for, as a key's (CalcTips 'light kind' and its number)
                    kinds = [[1e-11, tr('γ rays')], [1e-8, tr('X-rays')], [380e-9, tr('UV')], [750e-9, ''], [1e-3, tr('Infrared')], [1, tr('Microwave')],
                        [10, tr('FM'), 1], [100, tr('SW'), 1], [1e3, tr('AM')], [1e9, tr('Long radio waves')]],
                    // the infrared's three, as ISO 20473 has them: near to 3 µm, mid to 50, far to 1 mm
                    infrared = [[vb, -5.523, trc('infrared', 'Near')], [-5.523, -4.301, trc('infrared', 'Mid')], [-4.301, -3, trc('infrared', 'Far')]],
                    lg = Math.log10(nm * 1e-9), m = nm * 1e-9, x = px(Math.max(D0, Math.min(D1, lg))), xa = px(va), xb = px(vb), from = D0, names = '', n, z,
                    ev = Math.log10(PLANCK * LIGHT / CHARGE), // log of the wavelength in m of light of 1 eV
                    xi = px(ev - 1), // of 10 eV, the light that ionizes up to it
                    colours = [[380, tr('Violet')], [450, tr('Blue')], [485, tr('Cyan')], [500, tr('Green')], [565, tr('Yellow')], [590, tr('Orange')], [625, tr('Red')], [750]],
                    // a value in the unit of units that keeps it short, the smallest its own; a long one still as a power of ten
                    short = function (v, units) {
                        var u = units.filter(function (u) { return v >= u[0]; })[0] || units[units.length - 1], w = v / u[0], e = Math.floor(Math.log10(w)), a = +(w / Math.pow(10, e)).toPrecision(3);
                        return w >= 1e4 || w < 0.01 ? (a === 1 ? '' : local(a) + '×') + '10<tspan class="calc-sv-sub" dy="-4">' + (e < 0 ? '−' + -e : e) + '</tspan><tspan dy="4"> ' + u[1] + '</tspan>' : local(+w.toPrecision(3)) + ' ' + u[1];
                    },
                    // what was typed: its frequency, its energy, or its wavelength
                    // its wavelength, frequency and energy, each as it is shown, and as it is typed in its box, in nm, Hz and eV
                    three = [['λ', short(m, [[1e3, 'km'], [1, 'm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm'], [1e-12, 'pm'], [1e-15, 'fm']]), nm],
                        ['f', short(LIGHT / m, [[1e18, 'EHz'], [1e15, 'PHz'], [1e12, 'THz'], [1e9, 'GHz'], [1e6, 'MHz'], [1e3, 'kHz'], [1, 'Hz']]), LIGHT / m],
                        ['E', short(PLANCK * LIGHT / CHARGE / m, [[1e9, 'GeV'], [1e6, 'MeV'], [1e3, 'keV'], [1, 'eV'], [1e-3, 'meV'], [1e-6, 'µeV'], [1e-9, 'neV'], [1e-12, 'peV']]), PLANCK * LIGHT / CHARGE / m]],
                    tag = three[of || 0][1];
                body += '<g transform="translate(0 6)">';
                kinds.forEach(function (k, i) {
                    var to = Math.log10(k[0]), a = px(from), b = px(to), last = i === kinds.length - 1,
                        its = (i === 0 || m >= kinds[i - 1][0]) && (m < k[0] || last);
                    body += '<rect class="calc-sv-band' + (k[1] ? ' calc-sv-under"' : '" fill="url(#' + id + ')"') + ' data-kind="' + i + '" x="' + fix(a) + '" y="32" width="' + fix(b - a) + '" height="48"/>';
                    if (k[1]) names += text((a + b) / 2, i > 5 && i < 9 ? 52 : 60, k[1], 'middle', 'calc-sv-small calc-sv-halo' + (its ? ' calc-sv-red' : ''));
                    if (!last && k[1] && kinds[i + 1][1]) body += '<path class="calc-sv-ground" d="M' + fix(b) + ' 32V' + (k[2] ? 58 : 80) + '"/>';
                    from = to;
                });
                // the radio waves, under the bands of the radio named; the infrared's three along its foot, short lines up between them
                names += text((px(0) + px(3)) / 2, 72, tr('Radio waves'), 'middle', 'calc-sv-small calc-sv-halo' + (m >= 1 && m < 1e3 ? ' calc-sv-red' : ''));
                infrared.forEach(function (b, i) {
                    if (i) body += '<path class="calc-sv-ground" d="M' + fix(px(b[0])) + ' 71V80"/>';
                    names += text((px(b[0]) + px(b[1])) / 2, 77, b[2], 'middle', 'calc-sv-tick calc-sv-halo' + (lg >= b[0] && lg < b[1] ? ' calc-sv-red' : ''));
                });
                // the light that ionizes, of 10 eV and more: a red band along the foot, to 124 nm, named at its end
                body += '<rect class="calc-sv-ion" x="' + L + '" y="77" width="' + fix(xi - L) + '" height="3"/>';
                names += text(xi - 3, 74, tr('Ionizing'), 'end', 'calc-sv-tick calc-sv-halo');
                // above it, the one scale of what was typed: the frequencies, 10²⁴ Hz to 10⁰, each two powers of ten on; the energies, 1 GeV to
                // 1 neV, each a thousand times the next; or the wavelengths, 10⁻¹⁴ m to 10⁸. A number by the colours seen beside its mark, clear
                // of the lines down from them
                (of === 1 ? [24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 0].map(function (n) { return [Math.log10(LIGHT) - n, pow(n)]; }) :
                    of === 2 ? ['1 GeV', '1 MeV', '1 keV', '1 eV', '1 meV', '1 µeV', '1 neV'].map(function (e, i) { return [ev - 9 + 3 * i, e]; }) :
                        [-14, -12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8].map(function (n) { return [n, pow(n)]; })).forEach(function (t) {
                    var z = px(t[0]);
                    body += '<path class="calc-sv-ground" d="M' + fix(z) + ' 28V32"/>' +
                        (z > xb && z - xb < 16 ? text(xb + 6, 25, t[1], 'start') : z < xa && xa - z < 16 ? text(xa - 6, 25, t[1], 'end') : text(z, 25, t[1]));
                });
                body += unit(L - 6, 25, of === 1 ? 'f, Hz' : of === 2 ? 'E' : 'λ, m', 'end') + '<path class="calc-sv-ground" d="M' + L + ' 32H' + R + 'V80H' + L + 'Z"/>';
                // the colours seen, drawn out: dashed from their band down past the numbers, out on a gentle slope, and down to the ends of the
                // wider one; under it their wavelengths in nm, and their names. Faint, and said, where it is not one of them
                z = nm >= 380 && nm <= 750 ? zx(nm) : null;
                body += '<path class="calc-sv-link" d="M' + fix(xa) + ' 80V92L' + ZL + ' 124V130M' + fix(xb) + ' 80V92L' + ZR + ' 124V130"/>' +
                    '<rect x="' + ZL + '" y="130" width="' + (ZR - ZL) + '" height="22" fill="url(#' + id + ')"' + (z === null ? ' opacity="0.4"' : '') + '/><path class="calc-sv-ground" d="M' + ZL + ' 130H' + ZR + 'V152H' + ZL + 'Z"/>';
                for (n = 380; n <= 750; n += 10) body += '<path class="calc-sv-ground" d="M' + fix(zx(n)) + ' 152V' + (n % 50 ? 155 : 157) + '"/>' + (n % 50 || n > 700 ? '' : text(zx(n), 168, n));
                body += unit(ZR + 6, 168, 'λ, nm', 'start');
                colours.slice(0, 7).forEach(function (c, i) {
                    var a = zx(c[0]), b = zx(colours[i + 1][0]);
                    body += '<path class="calc-sv-ground" d="M' + fix(a) + ' 174V178H' + fix(b) + 'V174"/>' +
                        text((a + b) / 2, i % 2 ? 201 : 189, c[1], 'middle', 'calc-sv-small' + (z !== null && nm >= c[0] && nm < colours[i + 1][0] ? ' calc-sv-red' : ''));
                });
                body += text((ZL + ZR) / 2 + (z !== null && Math.abs(z - (ZL + ZR) / 2) < 40 ? (z < (ZL + ZR) / 2 ? 50 : -50) : 0), 122, z === null ? tr('Visible spectrum (not this light)') : tr('Visible spectrum'));
                // its own: a red line across the chart, under the names of the kinds, its wavelength beside it at the top, and across the colours
                // where it is one of them; beyond the chart, an arrow out at that end
                body += spectrumMark(x, 29, 83) + names + text(x > R - 90 ? x - 4 : x + 4, 41, tag, x > R - 90 ? 'end' : 'start', 'calc-sv-tick calc-sv-red calc-sv-halo');
                if (lg < D0) body += '<path class="calc-sv-head calc-sv-head-red" d="M' + (L - 10) + ' 56l7-4.5v9Z"/>';
                if (lg > D1) body += '<path class="calc-sv-head calc-sv-head-red" d="M' + (R + 10) + ' 56l-7-4.5v9Z"/>';
                if (z !== null) body += '<path class="calc-sv-head calc-sv-head-red" d="M' + fix(z) + ' 129l-4-6.5h8Z"/>' + spectrumMark(z, 128, 154);
                // beside the colours, its three, the one typed as the way chosen above is: one clicked is typed instead, in its own unit, the light the same
                body += text(482, 124, tr('This light'), 'start', 'calc-sv-hint');
                three.forEach(function (t, i) {
                    var y = 130 + i * 22, on = i === (of || 0), typed = String(+t[2].toPrecision(6)).replace('e+', 'e');
                    body += '<g class="calc-sv-three' + (on ? ' calc-sv-three-on' : '') + '"' + (of === undefined || on ? '' : ' data-fill="light x" data-v="' + i + ' ' + typed + '" data-num=""') + '>' +
                        (of === undefined || on ? '' : '<title>' + tr('Type it as this') + '</title>') +
                        '<rect x="480" y="' + y + '" width="112" height="18" rx="4"/>' + text(489, y + 13, t[0], 'start') + text(586, y + 13, t[1], 'end') + '</g>';
                });
                // above it all, a little apart from the numbers of its scale, which way they go: at the left, where its arrow points, and the right
                return svgOf('calc-sv-spec-wide', W, H, 'Where it is among the kinds of light', body + '</g>' + text(6, 13, tr('← Higher frequency, more energy'), 'start', 'calc-sv-hint') +
                    text(W - 6, 13, tr('Longer wavelength →'), 'end', 'calc-sv-hint'));
            }

            // the colours seen, from 380 nm to 750, light of nm0 moved to nm1: a mark at each, named, the second red
            function shiftDrawing(nm0, nm1) {
                var W = 300, id = 'calc-plot-' + (++app.plotIds), x = function (nm) { return 8 + (W - 16) * (nm - 380) / 370; }, a = x(nm0), b = x(nm1), up = b >= a;
                return svgOf('', W, 50, 'Its colour, and the one seen', rainbow(id) + '<rect x="8" y="8" width="' + (W - 16) + '" height="16" fill="url(#' + id + ')"/>' +
                    '<path class="calc-sv-ground" d="M8 8h' + (W - 16) + 'v16H8Z"/><path class="calc-sv-ground" d="M' + fix(a) + ' 4V28"/>' +
                    '<path class="calc-sv-head calc-sv-head-red" d="M' + fix(b) + ' 24l-5 7h10Z"/><path class="calc-sv-curve" d="M' + fix(b) + ' 6V24"/>' +
                    svgText(a + (up ? -3 : 3), 42, 'Its own', up ? 'end' : 'start') + svgText(b + (up ? 3 : -3), 42, 'Seen', up ? 'start' : 'end', 'calc-sv-small calc-sv-red'));
            }

            // a body going round a circle: its speed along it, and its acceleration in to the middle
            function orbitDrawing() {
                var cx = 150, cy = 62, r = 36, x = cx + r * Math.SQRT1_2, y = cy - r * Math.SQRT1_2;
                return svgOf('', 300, 108, 'Its speed along the circle, its acceleration in to the middle', '<circle class="calc-sv-guide" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
                    '<circle class="calc-sv-mid" cx="' + cx + '" cy="' + cy + '" r="2"/>' + svgArrow(x, y, x - 30, y - 30, 'calc-sv-seg') + svgArrow(x, y, cx + 8, cy - 8, 'calc-sv-curve') +
                    '<circle class="calc-sv-dot" cx="' + fix(x) + '" cy="' + fix(y) + '" r="4.5"/>' + svgText(x - 34, y - 22, 'v', 'end', 'calc-sv-small calc-sv-bold') +
                    svgText(cx + 20, cy, 'a', 'start', 'calc-sv-small calc-sv-red'));
            }

            // the waves of a moving source, m its speed as a part of the sound's: each sent out a moment apart, from where it was then,
            // close together ahead of it; the listener at the right
            function dopplerDrawing(m) {
                var cy = 50, sx = 150 + 22 * m, body = '', k, r;
                for (k = 1; k <= 5; k++) {
                    r = 9 * k;
                    body += '<circle class="calc-sv-guide" cx="' + fix(sx - m * r) + '" cy="' + cy + '" r="' + fix(r) + '"/>';
                }
                if (Math.abs(m) > 0.01) body += svgArrow(sx, cy, sx + (m > 0 ? 18 : -18), cy, 'calc-sv-curve');
                return svgOf('', 300, 112, 'The waves of the source as it moves, the listener at the right', body + '<circle class="calc-sv-dot" cx="' + fix(sx) + '" cy="' + cy + '" r="4"/>' +
                    '<circle class="calc-sv-mid" cx="282" cy="' + cy + '" r="4"/>' + svgText(282, cy + 18, 'Listener', 'end') + svgText(sx, 108, 'Source', 'middle'));
            }

            // where a level in dB is among sounds, from the faintest heard, green, to as loud as hurts, red
            function decibelDrawing(L) {
                var W = 300, id = 'calc-plot-' + (++app.plotIds), x = function (db) { return 10 + (W - 20) * db / 140; }, at = x(Math.max(0, Math.min(140, L))), body;
                body = '<defs><linearGradient id="' + id + '"><stop offset="0" stop-color="#5bb05a"/><stop offset="0.55" stop-color="#f3d43a"/><stop offset="1" stop-color="#d7302b"/></linearGradient></defs>' +
                    '<rect x="10" y="10" width="' + (W - 20) + '" height="14" rx="3" fill="url(#' + id + ')"/>';
                [[0, 'Faintest', 'start'], [40, 'Quiet'], [60, 'Talk'], [85, 'Traffic'], [110, 'Concert'], [140, 'Pain', 'end']].forEach(function (q) { body += svgText(x(q[0]), 43, q[1], q[2] || 'middle'); });
                return svgOf('', W, 48, 'Where it is among sounds', body + '<path class="calc-sv-head calc-sv-head-red" d="M' + fix(at) + ' 24l-5 7h10Z"/><path class="calc-sv-curve" d="M' + fix(at) + ' 7V24"/>');
            }

            function runSuvat(n, raw) {
                var r = CalcPhysics.suvat(n), x, names = [['s', 's, m'], ['u', 'u, m/s'], ['v', 'v, m/s'], ['a', 'a, m/s²'], ['t', 't, s']], rows, graph;
                if (r.error === 'few') return Object.assign(physNone(names.map(function (q) { return q[1]; })), { cols: 3, note: ['s', 'u', 'v', 'a', 't'].some(function (q) { return raw[q]; }) ? 'Type three of the five.' : '' });
                if (r.error) return Object.assign(physNone(names.map(function (q) { return q[1]; })), { cols: 3, warn: true, note: r.error === 'many' ? 'Three of the five only: leave two empty.' : 'The time is 0 or more.' });
                if (!r.list.length) return Object.assign(physNone(names.map(function (q) { return q[1]; })), { cols: 3, warn: true, note: 'No motion at a steady acceleration has these.' });
                x = r.list[0];
                rows = names.map(function (q) { return { l: q[1], v: x[q[0]] }; });
                if (r.list[1]) rows.push({ l: 'Or', wide: true, text: names.map(function (q) { return q[0] + ' ' + statsValue(r.list[1][q[0]]).html; }).join(', ') });
                graph = x.t > 0 && curveDrawing('Its speed against time', x.t, Math.min(0, x.u, x.v), Math.max(0, x.u, x.v) || 1, function (t) { return x.u + x.a * t; }, { under: true, names: ['t', 'v'] });
                if (graph) rows.push({ l: 'v against t, its area s', wide: true, text: graph });
                return { rows: rows, cols: 3, note: r.list[1] ? 'Two motions have these: going on, and coming back.' : 'In SI units, or any that agree.' };
            }

            // A projectile's path, from its start to where it lands, over its highest
            function pathDrawing(p, h) {
                var W = 300, H = 110, sx = Math.max(p.range, 1e-9), sy = Math.max(p.top, 1e-9), k = Math.min((W - 20) / sx, (H - 20) / sy), d = '', i, x, y,
                    px = function (v) { return 10 + v * k; }, py = function (v) { return H - 10 - v * k; };
                for (i = 0; i <= 60; i++) {
                    x = p.range * i / 60;
                    y = Math.max(0, p.at(x));
                    d += (i ? ' L' : 'M') + px(x).toFixed(1) + ' ' + py(y).toFixed(1);
                }
                return '<svg class="calc-sv-shape calc-sv-path" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + tr('Its path') + '"><path class="calc-sv-ground" d="M4 ' + py(0) + 'H' + (W - 4) + '"/>' +
                    (h ? '<path class="calc-sv-ground" d="M' + px(0) + ' ' + py(0) + 'V' + py(h).toFixed(1) + '"/>' : '') + '<path class="calc-sv-curve" d="' + d + '"/></svg>';
            }

            function runProjectile(n, raw) {
                var p = CalcPhysics.projectile(n.v, toRadians(n.a), n.h, n.g), none = ['Time', 'Range', 'Highest'];
                if (!raw.v && !raw.a) return physNone(none);
                if (!p) return Object.assign(physNone(none), { warn: true, note: 'A speed of 0 or more, an angle from straight down to straight up, a height of 0 or more and g above 0.' });
                return { rows: physRows([['Time, s', p.time], ['Range, m', p.range], ['Highest, m', p.top], ['To the top, s', p.rise], ['Lands at, m/s', p.speed], ['Lands at, angle', fromRadians(p.angle)],
                    ['Across, m/s', p.vx], ['Up at first, m/s', p.vy]]).concat([{ l: 'Path', wide: true, text: pathDrawing(p, n.h) }]), cols: 2, note: tr('No air. Angles in {unitWord}.', { unitWord: unitWord() }) };
            }

            function runCircular(n, raw) {
                var by = +raw.given || 0, v, T, w, none = ['v, m/s', 'T, s', 'a, m/s²'];
                if (!raw.r && !raw.x) return physNone(none);
                if (!(n.r > 0 && n.x > 0)) return Object.assign(physNone(none), { warn: true, note: tr('The radius and the {v} are above 0.', { v: [tr('speed'), tr('period'), tr('revolutions')][by] }) });
                v = by === 0 ? n.x : by === 1 ? 2 * Math.PI * n.r / n.x : 2 * Math.PI * n.r * n.x / 60;
                T = 2 * Math.PI * n.r / v;
                w = v / n.r;
                return { rows: physRows([['v, m/s', v], ['T, s', T], ['a, m/s²', v * v / n.r], ['ω, rad/s', w], ['f, Hz', 1 / T], ['rpm', 60 / T]]
                    .concat(raw.m && n.m > 0 ? [['F, N', n.m * v * v / n.r]] : [])).concat({ l: 'Its speed along, its pull in', wide: true, text: orbitDrawing() }), cols: 3 };
            }

            // two velocities from a point, A and B, B dashed, and A as B sees it, from the tip of B to the tip of A, red
            function velocitiesDrawing(a, b) {
                var W = 300, H = 120, xs = [0, a[0], b[0]], ys = [0, a[1], b[1]], x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs),
                    y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), k, o, A, B;
                if (!(Math.max(x1 - x0, y1 - y0) > 0)) return '';
                k = Math.min((W - 60) / (x1 - x0 || 1e-300), (H - 30) / (y1 - y0 || 1e-300));
                function at(p) { return [W / 2 + (p[0] - (x0 + x1) / 2) * k, H / 2 - (p[1] - (y0 + y1) / 2) * k]; }
                function name(from, to, s) { // past the tip, the way it points
                    var d = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
                    return svgText(to[0] + 9 * (to[0] - from[0]) / d, to[1] + 9 * (to[1] - from[1]) / d + 4, s, 'middle', 'calc-sv-small calc-sv-bold');
                }
                o = at([0, 0]);
                A = at(a);
                B = at(b);
                return svgOf('', W, H, 'A and B, and A as B sees it', svgArrow(o[0], o[1], A[0], A[1], 'calc-sv-seg') + svgArrow(o[0], o[1], B[0], B[1], 'calc-sv-seg', true) +
                    svgArrow(B[0], B[1], A[0], A[1], 'calc-sv-curve') + '<circle class="calc-sv-mid" cx="' + fix(o[0]) + '" cy="' + fix(o[1]) + '" r="2.5"/>' +
                    name(o, A, 'A') + name(o, B, 'B'));
            }

            // a river d wide, its current to the right, and a boat's path aimed straight across, landing drift down it
            function riverDrawing(d, drift) {
                var W = 300, H = 110, k = Math.min((H - 30) / d, (W - 80) / (drift || 1e-300)), top = H / 2 - d * k / 2, bottom = H / 2 + d * k / 2, x = 30;
                return svgOf('', W, H, 'Its path across the river, the current carrying it down', '<path class="calc-sv-ground" d="M8 ' + fix(top) + 'H' + (W - 8) + 'M8 ' + fix(bottom) + 'H' + (W - 8) + '"/>' +
                    '<path class="calc-sv-guide" d="M' + x + ' ' + fix(bottom) + 'V' + fix(top) + '"/>' + svgArrow(W - 62, bottom - 9, W - 26, bottom - 9, 'calc-sv-seg') +
                    svgText(W - 44, bottom - 15, 'Current', 'middle') + svgArrow(x, bottom, x + drift * k, top, 'calc-sv-curve') + '<circle class="calc-sv-dot" cx="' + x + '" cy="' + fix(bottom) + '" r="3"/>');
            }

            function runRelative(n, raw) {
                var ax, ay, bx, by, x, y, s, h, t, rows, none;
                if (raw.kind === '1') {
                    none = ['Time, s', 'Lands down, m'];
                    if (!raw.v && !raw.u && !raw.d) return physNone(none);
                    if (!(n.v > 0 && n.u >= 0 && n.d > 0)) return Object.assign(physNone(none), { warn: true, note: 'v and d above 0, and u of 0 or more.' });
                    t = n.d / n.v;
                    rows = [['Time, s', t], ['Lands down, m', n.u * t], ['Over the ground, m/s', Math.hypot(n.v, n.u)], ['Off straight, angle', fromRadians(Math.atan2(n.u, n.v))]];
                    if (n.v > n.u) rows.push(['Aim upstream, angle', fromRadians(Math.asin(n.u / n.v))], ['Straight across, s', n.d / Math.sqrt(n.v * n.v - n.u * n.u)]);
                    return { rows: physRows(rows).concat(drawnTile(riverDrawing(n.d, n.u * t), 'Its path, aimed straight across')), cols: 2,
                        note: (n.v > n.u ? tr('Aimed upstream by that angle from straight across, it goes straight over, more slowly. Angles in {unitWord}.', { unitWord: unitWord() }) : tr('The current is as fast as the boat or faster: it cannot go straight across. Angles in {unitWord}.', { unitWord: unitWord() })) };
                }
                none = ['Speed, m/s', 'Heading'];
                if (!raw.va && !raw.vb) return physNone(none);
                if (!(isFinite(n.va) && isFinite(n.vb) && isFinite(n.a) && isFinite(n.b))) return Object.assign(physNone(none), { warn: true, note: 'Both speeds, and their headings.' });
                ax = n.va * Math.cos(toRadians(n.a));
                ay = n.va * Math.sin(toRadians(n.a));
                bx = n.vb * Math.cos(toRadians(n.b));
                by = n.vb * Math.sin(toRadians(n.b));
                s = 1e-12 * (Math.abs(n.va) + Math.abs(n.vb)); // what is left of cos 90°, 0
                x = Math.abs(ax - bx) < s ? 0 : ax - bx;
                y = Math.abs(ay - by) < s ? 0 : ay - by;
                h = Math.atan2(y, x);
                if (h < 0) h += 2 * Math.PI;
                s = Math.hypot(x, y);
                return { rows: physRows([['A from B, m/s', s], ['Its heading', s ? fromRadians(h) : NaN], ['East, m/s', x], ['North, m/s', y], ['B from A, heading', s ? fromRadians((h + Math.PI) % (2 * Math.PI)) : NaN]])
                    .concat(drawnTile(velocitiesDrawing([ax, ay], [bx, by]), 'A, B, and A as B sees it')), cols: 2,
                    note: tr('B sees A go so; A sees B go as fast the other way. Angles in {unitWord}.', { unitWord: unitWord() }) };
            }

            // an orbit of half its width a and eccentricity e round a body of radius R at a focus, to scale, it at its nearest
            function ellipseDrawing(a, e, R) {
                var W = 300, H = 120, b = a * Math.sqrt(1 - e * e), k = Math.min((W - 40) / (2 * a), (H - 20) / (2 * b)), cx = W / 2, cy = H / 2;
                return svgOf('', W, H, 'Its orbit round the body, to scale, it at its nearest', '<ellipse class="calc-sv-seg calc-sv-thin" cx="' + cx + '" cy="' + cy + '" rx="' + fix(a * k) + '" ry="' + fix(b * k) + '"/>' +
                    '<circle class="calc-sv-fill" cx="' + fix(cx - a * e * k) + '" cy="' + cy + '" r="' + fix(Math.max(2.5, R * k)) + '"/>' +
                    '<circle class="calc-sv-dot" cx="' + fix(cx - a * k) + '" cy="' + cy + '" r="3.5"/>');
            }

            function runOrbit(n, raw) {
                var of = +raw.given || 0, gm = G_NEWTON * n.M, rp, ra, o, rows, low, none = ['a, m', 'T, s'];
                if (of === 0 ? !raw.h : of === 1 ? !raw.T : !raw.h1 && !raw.h2) return physNone(none);
                if (!(n.M > 0 && n.R >= 0)) return Object.assign(physNone(none), { warn: true, note: 'M above 0, and R of 0 or more.' });
                if (of === 1) rp = ra = CalcPhysics.orbitSize(gm, n.T);
                else if (of === 2) {
                    rp = n.R + n.h1;
                    ra = n.R + n.h2;
                } else rp = ra = n.R + n.h;
                o = CalcPhysics.orbit(gm, rp, ra);
                if (!o) return Object.assign(physNone(none), { warn: true, note: of === 1 ? 'T above 0.' : of === 2 ? 'Both heights, above the middle of the body.' : 'A height above the middle of the body.' });
                low = Math.min(rp, ra) < n.R;
                rows = [['a, m', o.a], ['T, s', o.t], ['T, h', o.t / 3600]].concat(o.e ? [['e', o.e], ['v nearest, m/s', o.vp], ['v farthest, m/s', o.va]] :
                    [['Height, m', o.a - n.R], ['v, m/s', o.vp], ['Escape there, m/s', o.vp * Math.SQRT2], ['g there, m/s²', gm / (o.a * o.a)]], [['Energy, J/kg', -gm / (2 * o.a)]]);
                return { rows: physRows(rows).concat(drawnTile(ellipseDrawing(o.a, o.e, n.R), 'Its orbit, to scale')), cols: 2, warn: low,
                    note: low ? 'Lower than the surface: it would hit the body.' : o.e ? 'Fastest nearest, slowest farthest, by Kepler\'s second law.' : 'T² grows as a³; G = 6.6743 × 10⁻¹¹ N·m²/kg².' };
            }

            function runRocket(n, raw) {
                var isp = raw.by === '1', ve = isp ? n.ve * CalcPhysics.g : n.ve, timed = !!raw.t, r, rows, weak, none = ['Δv, m/s', 'm<sub>0</sub> ÷ m<sub>f</sub>'];
                if (!raw.ve && !raw.m0 && !raw.mf) return physNone(none);
                r = CalcPhysics.rocket(ve, n.m0, n.mf, timed ? n.t : NaN, n.g);
                if (!r || timed && !(n.t > 0) || !(n.g > 0)) {
                    return Object.assign(physNone(none), { warn: true, note: (isp ? tr('Isp and both masses above 0, the full not below the empty{v}', { v: (timed ? tr(', and t and g above 0.') : '.') }) : tr('vₑ and both masses above 0, the full not below the empty{v}', { v: (timed ? tr(', and t and g above 0.') : '.') })) });
                }
                rows = [['Δv, m/s', r.dv], ['Δv, km/h', r.dv * 3.6], ['m<sub>0</sub> ÷ m<sub>f</sub>', r.ratio], ['Fuel, kg', r.fuel], ['Fuel, % of m<sub>0</sub>', 100 * r.fuel / n.m0],
                    isp ? ['v<sub>e</sub>, m/s', ve] : ['I<sub>sp</sub>, s', ve / CalcPhysics.g]];
                if (timed) rows.push(['Burns, kg/s', r.flow], ['Thrust, N', r.thrust], ['a at first, m/s²', r.a0], ['a at last, m/s²', r.a1], ['Δv going up, m/s', r.up]);
                weak = timed && r.thrust < n.m0 * n.g;
                return { rows: physRows(rows).concat(drawnTile(graphDrawing('Its speed as it burns its fuel', 0, r.fuel, { fs: [function (x) { return ve * Math.log(n.m0 / (n.m0 - x)); }], names: ['kg burnt', 'v'] }),
                    'Its speed as it burns its fuel')), cols: 2, warn: weak,
                    note: weak ? 'Its thrust is less than its weight: it cannot lift off straight up.' : (timed ? tr('Δv in space, with no air nor gravity; straight up, g takes g × t of it.') : tr('Δv in space, with no air nor gravity. With the time it burns, its thrust.')) };
            }

            // masses as dots as big as they are, named, and their centre of mass, red, a line to each
            function centreDrawing(pts, X, Y) {
                var W = 300, H = 120, xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; }), big = Math.max.apply(null, pts.map(function (p) { return p.m; })),
                    x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), k, c, body = '';
                if (!(Math.max(x1 - x0, y1 - y0) > 0)) return '';
                k = Math.min((W - 50) / (x1 - x0 || 1e-300), (H - 44) / (y1 - y0 || 1e-300));
                function at(x, y) { return [W / 2 + (x - (x0 + x1) / 2) * k, H / 2 + 4 - (y - (y0 + y1) / 2) * k]; }
                c = at(X, Y);
                pts.forEach(function (p) {
                    var q = at(p.x, p.y);
                    body += '<path class="calc-sv-guide" d="M' + fix(c[0]) + ' ' + fix(c[1]) + 'L' + fix(q[0]) + ' ' + fix(q[1]) + '"/>';
                });
                pts.forEach(function (p) {
                    var q = at(p.x, p.y), r = 3 + 6 * Math.sqrt(p.m / big);
                    body += '<circle class="calc-sv-mid" cx="' + fix(q[0]) + '" cy="' + fix(q[1]) + '" r="' + fix(r) + '"/>' + svgText(q[0], q[1] - r - 3, 'm' + '₁₂₃₄'.charAt(p.i - 1), 'middle');
                });
                return svgOf('', W, H, 'The masses, and their centre of mass', body + '<path class="calc-sv-curve" d="M' + fix(c[0] - 6) + ' ' + fix(c[1]) + 'h12M' + fix(c[0]) + ' ' + fix(c[1] - 6) + 'v12"/>' +
                    '<circle class="calc-sv-dot" cx="' + fix(c[0]) + '" cy="' + fix(c[1]) + '" r="2.5"/>');
            }

            function runCentre(n, raw) {
                var pts = [], M = 0, X = 0, Y = 0, Ic = 0, I0 = 0, i, none = ['x̄, m', 'ȳ, m', 'Σm, kg'];
                for (i = 1; i <= 4; i++) {
                    if (raw['m' + i] || raw['x' + i] || raw['y' + i]) pts.push({ m: n['m' + i], x: n['x' + i], y: n['y' + i], i: i });
                }
                if (!pts.length) return Object.assign(physNone(none), { cols: 3 });
                if (!pts.every(function (p) { return p.m > 0 && isFinite(p.x) && isFinite(p.y); })) return Object.assign(physNone(none), { cols: 3, warn: true, note: 'Each mass of a point typed, above 0.' });
                pts.forEach(function (p) {
                    M += p.m;
                    X += p.m * p.x;
                    Y += p.m * p.y;
                    I0 += p.m * (p.x * p.x + p.y * p.y);
                });
                X /= M;
                Y /= M;
                pts.forEach(function (p) { Ic += p.m * (Math.pow(p.x - X, 2) + Math.pow(p.y - Y, 2)); });
                return { rows: physRows([['x̄, m', X], ['ȳ, m', Y], ['Σm, kg', M], ['I about it, kg·m²', Ic], ['I about 0, kg·m²', I0], ['From 0, m', Math.hypot(X, Y)]])
                    .concat(drawnTile(centreDrawing(pts, X, Y), 'The masses, and their centre')), cols: 3,
                    note: pts.length < 2 ? 'One mass is its own centre: type another.' : 'I about an axis at right angles to the page; about 0 it is more by Σm r̄².' };
            }

            function runOscillator(n, raw) {
                var spring = raw.kind === '1', T, w, none = ['T, s', 'f, Hz'];
                if (spring ? !raw.m && !raw.k : !raw.L) return physNone(none);
                if (spring ? !(n.m > 0 && n.k > 0) : !(n.L > 0 && n.g > 0)) return Object.assign(physNone(none), { warn: true, note: spring ? 'm and k are above 0.' : 'L and g are above 0.' });
                T = 2 * Math.PI * Math.sqrt(spring ? n.m / n.k : n.L / n.g);
                w = 2 * Math.PI / T;
                return { rows: physRows([['T, s', T], ['f, Hz', 1 / T], ['ω, rad/s', w]].concat(raw.A && n.A > 0 ? [['Fastest, m/s', w * n.A], ['Most a, m/s²', w * w * n.A]]
                    .concat(spring ? [['Energy, J', n.k * n.A * n.A / 2]] : []) : [])).concat({ l: spring ? (raw.A && n.A > 0 ? tr('At the end of a swing; where it is, over two swings') : tr('The mass on its spring; where it is, over two swings')) : 'Where it is, over two swings', wide: true,
                        text: (spring ? springDrawing(raw.A && n.A > 0 ? 1 : 0, 'A', 'm') : '') + graphDrawing('Where it is as time goes', 0, 2 * T, {
                        fs: [function (t) { return (n.A > 0 ? n.A : 1) * Math.cos(w * t); }], marks: [[T, 'T'], [2 * T, '2T']] }) }), cols: 3, note: spring ? (raw.A ? 'Fastest through the middle, its acceleration most at the ends.' : 'With an amplitude A, its fastest too.') :
                    tr('For small swings, some 15° or less{v}', { v: (raw.A ? tr(', A along its arc.') : '.') }) };
            }

            // a mass on a slope at the angle t, an arrow down it if it slides
            function slopeDrawing(t, slides) {
                var W = 300, H = 104, x0 = 16, y0 = H - 8, len = Math.min(266 / Math.cos(t), 84 / Math.max(Math.sin(t), 1e-9)), c = Math.cos(t), s = Math.sin(t),
                    bx = x0 + 0.55 * len * c, by = y0 - 0.55 * len * s, deg = t * 180 / Math.PI, body;
                body = '<path class="calc-sv-fill" d="M' + x0 + ' ' + y0 + 'H' + fix(x0 + len * c) + 'V' + fix(y0 - len * s) + 'Z"/>' +
                    '<rect class="calc-sv-fill calc-sv-block" x="-10" y="-20" width="20" height="20" transform="translate(' + fix(bx) + ' ' + fix(by) + ') rotate(' + fix(-deg) + ')"/>' +
                    (t > 0.05 ? '<path class="calc-sv-guide" d="M' + (x0 + 30) + ' ' + y0 + 'A30 30 0 0 0 ' + fix(x0 + 30 * c) + ' ' + fix(y0 - 30 * s) + '"/>' + svgText(x0 + 40 * Math.cos(t / 2), y0 - 40 * Math.sin(t / 2) + 4, 'θ', 'middle') : '');
                bx -= 10 * s;
                by -= 10 * c;
                body += svgArrow(bx, by, bx, Math.min(by + 34, H - 2)) + (slides ? svgArrow(bx - 4 * s, by - 4 * c, bx - 4 * s - 40 * c, by - 4 * c + 40 * s, 'calc-sv-curve') : '');
                return svgOf('', W, H, 'The slope', body);
            }

            function runNewton(n, raw) {
                var known = ['F', 'm', 'a'].filter(function (k) { return raw[k] && isFinite(n[k]); }), F = n.F, m = n.m, a = n.a, none = ['F, N', 'm, kg', 'a, m/s²'];
                if (known.length < 2) return physNone(none);
                if (known.length > 2) return Object.assign(physNone(none), { warn: true, note: 'Two of the three only: leave one empty.' });
                if (!raw.F) F = m * a;
                else if (!raw.m) m = a ? F / a : NaN;
                else a = m ? F / m : NaN;
                if (!isFinite(F + m + a)) return Object.assign(physNone(none), { warn: true, note: 'Divided by 0: no answer.' });
                return { rows: physRows([['F, N', F], ['m, kg', m], ['a, m/s²', a], ['Weight, N', m * CalcPhysics.g]]), cols: 3 };
            }

            function runIncline(n, raw) {
                var t = toRadians(n.a), W, N, along, f, net, none = ['Along, N', 'Normal, N', 'a, m/s²'];
                if (!raw.m && !raw.a) return physNone(none);
                if (!(n.m > 0 && t >= 0 && t < Math.PI / 2 && n.mu >= 0 && n.g > 0)) return Object.assign(physNone(none), { warn: true, note: 'A mass above 0, θ from 0 to below straight up, μ of 0 or more.' });
                W = n.m * n.g;
                N = W * Math.cos(t);
                along = W * Math.sin(t);
                f = Math.min(along, n.mu * N); // friction holds it, up to μN
                net = along - f;
                return { rows: physRows([['Weight, N', W], ['Normal, N', N], ['Along, N', along], ['Friction, N', f], ['Net, N', net], ['a, m/s²', net / n.m]])
                    .concat([{ l: 'The slope', wide: true, text: slopeDrawing(t, net > 1e-12 * W) }]), cols: 3,
                    note: net > 1e-12 * W ? 'It slides down.' : 'Friction holds it: it does not slide, μ being at least tan θ.' };
            }

            // two masses on a string over a pulley: of 0 both hanging, else m2 on a slope at t, flat a table, m1 hanging past its top;
            // way 1 as m1 falls, -1 as it rises, 0 held, a red arrow by m1
            function atwoodDrawing(of, t, way) {
                var W = 300, H = 120, r = of ? 9 : 12, c = Math.cos(t), s = Math.sin(t), body, L, xc = 196, yc = 38, D, bx, by, qx, qy, hx, hy, deg = t * 180 / Math.PI;
                function block(x, y, name, side) { // a block of 20 hanging from x, its top at y, named at a side
                    return '<path class="calc-sv-seg calc-sv-thin" d="M' + fix(x) + ' ' + fix(qy) + 'V' + fix(y) + '"/><rect class="calc-sv-fill calc-sv-block" x="' + fix(x - 10) + '" y="' + fix(y) +
                        '" width="20" height="20"/>' + svgText(x + side * 15, y + 14, name, side < 0 ? 'end' : 'start');
                }
                if (of === 0) {
                    qx = 150;
                    qy = 26;
                    hx = qx - r;
                    hy = 74;
                    body = '<path class="calc-sv-ground" d="M118 6H182M150 6V' + qy + '"/><circle class="calc-sv-fill" cx="' + qx + '" cy="' + qy + '" r="' + r + '"/>' +
                        block(hx, hy, 'm₁', -1) + block(qx + r, 54, 'm₂', 1);
                } else {
                    L = Math.min(176 / Math.max(c, 1e-9), 74 / Math.max(s, 1e-9));
                    D = 0.5 * L;
                    body = s > 0.01 ? '<path class="calc-sv-fill" d="M' + fix(xc - L * c) + ' ' + fix(yc + L * s) + 'L' + xc + ' ' + yc + 'V' + fix(yc + L * s) + 'Z"/>' +
                        (t > 0.05 ? '<path class="calc-sv-guide" d="M' + fix(xc - L * c + 30) + ' ' + fix(yc + L * s) + 'A30 30 0 0 0 ' + fix(xc - L * c + 30 * c) + ' ' + fix(yc + L * s - 30 * s) + '"/>' +
                            svgText(xc - L * c + 40 * Math.cos(t / 2), yc + L * s - 40 * Math.sin(t / 2) + 4, 'θ', 'middle') : '') :
                        '<rect class="calc-sv-fill" x="' + fix(xc - L) + '" y="' + yc + '" width="' + fix(L) + '" height="8"/><path class="calc-sv-ground" d="M' + fix(xc - L + 10) + ' ' + (yc + 8) +
                            'V' + (H - 4) + 'M' + (xc - 10) + ' ' + (yc + 8) + 'V' + (H - 4) + '"/>';
                    bx = xc - D * c;
                    by = yc + D * s;
                    qx = xc - s + 6 * c; // the pulley past the corner, the string from the block's middle along the slope to its top
                    qy = yc - c - 6 * s;
                    hx = qx + r;
                    hy = qy + 42;
                    body += '<path class="calc-sv-ground" d="M' + xc + ' ' + yc + 'L' + fix(qx) + ' ' + fix(qy) + '"/>' +
                        '<path class="calc-sv-seg calc-sv-thin" d="M' + fix(bx - 10 * s) + ' ' + fix(by - 10 * c) + 'L' + fix(qx - r * s) + ' ' + fix(qy - r * c) + '"/>' +
                        '<rect class="calc-sv-fill calc-sv-block" x="-10" y="-20" width="20" height="20" transform="translate(' + fix(bx) + ' ' + fix(by) + ') rotate(' + fix(-deg) + ')"/>' +
                        svgText(bx - 30 * s, by - 30 * c + 4, 'm₂', 'middle') + '<circle class="calc-sv-fill" cx="' + fix(qx) + '" cy="' + fix(qy) + '" r="' + r + '"/>' + block(hx, hy, 'm₁', 1);
                }
                if (way) body += svgArrow(hx + (of ? 34 : -34), hy + (way > 0 ? 0 : 28), hx + (of ? 34 : -34), hy + (way > 0 ? 28 : 0), 'calc-sv-curve');
                return svgOf('', W, H, 'The masses and the pulley', body + '<circle class="calc-sv-mid" cx="' + fix(qx) + '" cy="' + fix(qy) + '" r="2"/>');
            }

            function runAtwood(n, raw) {
                var of = +raw.kind || 0, t = of === 0 ? Math.PI / 2 : of === 1 ? 0 : toRadians(n.a), r, a, rows, none = ['a, m/s²', 'T, N'], goes;
                if (!raw.m1 && !raw.m2) return physNone(none);
                r = CalcPhysics.atwood(n.m1, n.m2, t, of ? n.mu : 0, n.mp, n.g);
                if (!r) return Object.assign(physNone(none), { warn: true, note: tr('Both masses above 0{v}{v2}, the pulley 0 or more and g above 0.', { v: (of === 2 ? tr(', θ from 0 to a right angle') : ''), v2: (of ? tr(', μ of 0 or more') : '') }) });
                a = Math.abs(r.a);
                rows = [['a, m/s²', a]].concat(n.mp > 0 ? [['T by m₁, N', r.t1], ['T by m₂, N', r.t2]] : [['T, N', r.t1]], of ? [['Friction, N', r.friction]] : []);
                if (raw.d && n.d > 0 && r.moves) rows.push(['v after d, m/s', Math.sqrt(2 * a * n.d)], ['Time for d, s', Math.sqrt(2 * n.d / a)]);
                goes = !r.moves ? (of ? 'Held: friction holds them' : 'Balanced: they stay') : r.a > 0 ? (of === 0 ? tr('m₁ falls, m₂ rises') : of === 1 ? tr('m₁ falls, m₂ is pulled along') : tr('m₁ falls, m₂ is pulled up')) :
                    (of === 0 ? tr('m₂ falls, m₁ rises') : tr('m₂ slides down, m₁ rises'));
                return { rows: physRows(rows).concat([{ l: 'They', wide: true, text: goes }], drawnTile(atwoodDrawing(of, t, r.a > 0 ? 1 : r.a < 0 ? -1 : 0), 'The masses, and which way they go')), cols: 2,
                    note: (n.mp > 0 ? tr('{v}The string not stretching, of no mass; the pulley a disc, turning with it.{v2}', { v: (of && !r.moves ? tr('Friction holds them, as much as it takes, up to μ times the normal force. ') : ''), v2: (of === 2 ? tr(' Angles in {unitWord}.', { unitWord: unitWord() }) : '') }) : tr('{v}The string not stretching, of no mass, nor the pulley.{v2}', { v: (of && !r.moves ? tr('Friction holds them, as much as it takes, up to μ times the normal force. ') : ''), v2: (of === 2 ? tr(' Angles in {unitWord}.', { unitWord: unitWord() }) : '') })) };
            }

            // two masses before and after they meet, each as big as its mass, an arrow over each of its speed, to scale
            function collisionDrawing(m1, m2, u1, u2, v1, v2, stick) {
                var W = 300, H = 128, top = Math.max(Math.abs(u1), Math.abs(u2), Math.abs(v1), Math.abs(v2)) || 1, big = Math.max(m1, m2), body = '';
                function rad(m) { return 7 + 10 * Math.cbrt(m / big); }
                function ball(x, y, m, v, k) {
                    var r = rad(m), len = 56 * v / top, ay = y - r - 7;
                    return '<circle cx="' + fix(x) + '" cy="' + y + '" r="' + fix(r) + '" fill="' + ['#f0b3b3', '#bcd0e6'][k] + '" stroke="' + ['#b0414d', '#22476a'][k] + '" stroke-width="1.2"/>' +
                        svgText(x, y + 4, ['1', '2'][k], 'middle', 'calc-sv-small calc-sv-bold') +
                        (Math.abs(len) >= 2 ? svgArrow(x, ay, x + len, ay, ['calc-sv-curve', 'calc-sv-seg'][k]) + svgText(x + len + (len > 0 ? 4 : -4), ay + 3.5, shortNum(v), len > 0 ? 'start' : 'end') :
                            svgText(x, ay + 3, 'still', 'middle'));
                }
                body += svgText(8, 14, 'Before') + svgText(8, 76, 'After') + '<path class="calc-sv-ground" d="M8 ' + 58 + 'H' + (W - 8) + 'M8 ' + 120 + 'H' + (W - 8) + '"/>';
                body += ball(95, 58 - rad(m1), m1, u1, 0) + ball(205, 58 - rad(m2), m2, u2, 1);
                body += stick ? ball(150 - rad(m1), 120 - rad(m1), m1, v1, 0) + ball(150 + rad(m2), 120 - rad(m2), m2, v2, 1) :
                    ball(110, 120 - rad(m1), m1, v1, 0) + ball(190, 120 - rad(m2), m2, v2, 1);
                return svgOf('', W, H, 'The two before and after, their speeds in m/s', body);
            }

            function runCollision(n, raw) {
                var m1 = n.m1, m2 = n.m2, u1 = n.u1, u2 = n.u2, v1, v2, p = m1 * u1 + m2 * u2, ke0, ke1, none = ['v₁, m/s', 'v₂, m/s'];
                if (!raw.m1 && !raw.m2) return physNone(none);
                if (!(m1 > 0 && m2 > 0 && isFinite(u1 + u2))) return Object.assign(physNone(none), { warn: true, note: 'Both masses above 0, and both speeds.' });
                if (raw.stick === '1') v1 = v2 = p / (m1 + m2);
                else {
                    v1 = ((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2);
                    v2 = ((m2 - m1) * u2 + 2 * m1 * u1) / (m1 + m2);
                }
                ke0 = (m1 * u1 * u1 + m2 * u2 * u2) / 2;
                ke1 = (m1 * v1 * v1 + m2 * v2 * v2) / 2;
                return { rows: drawnTile(collisionDrawing(m1, m2, u1, u2, v1, v2, raw.stick === '1'), 'Before and after').concat(physRows([['v₁, m/s', v1], ['v₂, m/s', v2], ['Momentum, kg·m/s', p],
                    ['KE before, J', ke0], ['KE after, J', ke1], ['KE lost, J', Math.max(0, ke0 - ke1)]])), cols: 2,
                    note: raw.stick === '1' ? 'Stuck together, they go on as one.' : 'Elastic: no kinetic energy is lost.' };
            }

            function runEnergy(n, raw) {
                var none = ['KE, J', 'PE, J'];
                if (!raw.m) return physNone(none);
                if (!(n.m > 0 && n.g > 0)) return Object.assign(physNone(none), { warn: true, note: 'A mass above 0.' });
                return { rows: physRows([['KE, J', n.m * n.v * n.v / 2], ['PE, J', n.m * n.g * n.h], ['Total, J', n.m * n.v * n.v / 2 + n.m * n.g * n.h], ['Speed at h = 0, m/s', Math.sqrt(Math.max(0, n.v * n.v + 2 * n.g * n.h))]]), cols: 2 };
            }

            // a block pulled at θ along the ground, the force red, its part along the way dashed, and the way under it
            function workDrawing(a) {
                var W = 300, H = 110, x = 70, y = 70, len = 70, fx = len * Math.cos(a), fy = len * Math.sin(a), cx = x + 20, cy = y - 15;
                return svgOf('', W, H, 'The force at θ to the way, the part of it along the way dashed', '<path class="calc-sv-ground" d="M8 ' + y + 'H' + (W - 8) + '"/>' +
                    '<rect x="' + x + '" y="' + (y - 30) + '" width="40" height="30" fill="#d3bc8f" stroke="#8a7550" stroke-width="1.2"/>' +
                    (Math.abs(fx) > 2 ? svgArrow(cx, cy, cx + fx, cy, 'calc-sv-seg', true) : '') + svgArrow(cx, cy, cx + fx, cy - fy, 'calc-sv-curve') +
                    svgText(cx + fx + (fx >= 0 ? 5 : -5), cy - fy + 4, 'F', fx >= 0 ? 'start' : 'end', 'calc-sv-small calc-sv-red') +
                    (Math.abs(fx) > 2 ? svgText(cx + fx + (fx > 0 ? 6 : -6), cy + 4, 'F cos θ', fx > 0 ? 'start' : 'end') : '') +
                    (Math.abs(Math.sin(a)) > 0.05 && Math.abs(fx) > 8 ? '<path class="calc-sv-guide" d="M' + (cx + 34 * Math.sign(fx)) + ' ' + cy + 'A34 34 0 0 ' + (fy * fx > 0 ? 0 : 1) + ' ' +
                        fix(cx + 34 * Math.cos(a)) + ' ' + fix(cy - 34 * Math.sin(a)) + '"/>' + svgText(cx + 42 * Math.cos(a / 2) * Math.sign(fx || 1), cy - 40 * Math.sin(a / 2) + 3, 'θ', 'middle') : '') +
                    svgArrow(x, y + 18, x + 160, y + 18, 'calc-sv-seg') + svgText(x + 166, y + 22, 'd'));
            }

            function runWork(n, raw) {
                var W = n.F * n.d * Math.cos(toRadians(n.a)), none = ['W, J', 'P, W'];
                if (!raw.F && !raw.d) return physNone(none);
                if (!isFinite(W)) return Object.assign(physNone(none), { warn: true, note: 'Type the force and the way.' });
                return { rows: drawnTile(workDrawing(toRadians(n.a)), 'The force and the way').concat(physRows([['W, J', Math.abs(W) < 1e-12 * Math.abs(n.F * n.d) ? 0 : W]].concat(raw.t && n.t > 0 ? [['P, W', W / n.t]] : []))), cols: 2, note: raw.t ? '' : 'With a time, the power too.' };
            }

            function runGravity(n, raw) {
                var none = ['F, N', 'g, m/s²'];
                var rs = 2 * G_NEWTON * n.m1 / (LIGHT * LIGHT);
                if (!raw.m1 && !raw.r) return physNone(none);
                if (n.m1 > 0 && !raw.r) return { rows: physRows([['Schwarzschild r, m', rs]]), cols: 2, note: 'With r, the pull, the gravity and the orbits at r too.' };
                if (!(n.m1 > 0 && n.m2 > 0 && n.r > 0)) return Object.assign(physNone(none), { warn: true, note: 'The masses and r are above 0.' });
                return { rows: drawnTile(graphDrawing('The pull against r, falling as its square', 0, 3 * n.r, { fs: [function (x) { return G_NEWTON * n.m1 * n.m2 / (x * x); }],
                    y: [0, 4 * G_NEWTON * n.m1 * n.m2 / (n.r * n.r)], dots: [[n.r, G_NEWTON * n.m1 * n.m2 / (n.r * n.r)]], names: ['r, m', 'F, N'] }), 'F and r').concat(physRows([['F, N', G_NEWTON * n.m1 * n.m2 / (n.r * n.r)], ['g at r, m/s²', G_NEWTON * n.m1 / (n.r * n.r)], ['Orbit speed, m/s', Math.sqrt(G_NEWTON * n.m1 / n.r)],
                    ['Orbit period, s', 2 * Math.PI * Math.sqrt(Math.pow(n.r, 3) / (G_NEWTON * n.m1))], ['Escape speed, m/s', Math.sqrt(2 * G_NEWTON * n.m1 / n.r)], ['Schwarzschild r, m', rs]])), cols: 2,
                    warn: n.r <= rs, note: n.r <= rs ? 'r is inside its Schwarzschild radius: a black hole, that not even light leaves; Newton\'s law no longer holds.' :
                        'G = 6.6743 × 10⁻¹¹ N·m²/kg². Squeezed within its Schwarzschild radius, it would be a black hole.' };
            }

            function runSpring(n, raw) {
                var none = ['F, N', 'E, J'];
                if (!raw.k && !raw.x) return physNone(none);
                if (!(n.k > 0 && isFinite(n.x))) return Object.assign(physNone(none), { warn: true, note: 'k above 0, and x.' });
                var T = raw.m && n.m > 0 ? 2 * Math.PI * Math.sqrt(n.m / n.k) : NaN, w = 2 * Math.PI / T, f = function (x) { return n.k * x; };
                // the spring, its force against x, and let go, where it is over two swings: in one tile
                return { rows: drawnTile(springDrawing(Math.sign(n.x), 'x', raw.m && n.m > 0 ? 'm' : '') + (n.x ? graphDrawing('Its force against x, the area under it its energy', -1.4 * Math.abs(n.x), 1.4 * Math.abs(n.x), {
                        fs: [f], fill: [f, null, 0, n.x], dots: [[n.x, f(n.x)]], marks: [[n.x, 'x']], names: ['x, m', 'F, N'] }) : '') +
                    (isFinite(T) && n.x ? graphDrawing('Where it is as time goes, let go at x', 0, 2 * T, { fs: [function (t) { return n.x * Math.cos(w * t); }], marks: [[T, 'T'], [2 * T, '2T']] }) : ''),
                    !n.x ? 'At rest' : (n.x < 0 ? tr('Squeezed by x; F against x, its area E{v}', { v: (isFinite(T) ? tr('; let go, over two swings') : '') }) : tr('Stretched by x; F against x, its area E{v}', { v: (isFinite(T) ? tr('; let go, over two swings') : '') })))
                    .concat(physRows([['F, N', n.k * n.x], ['E, J', n.k * n.x * n.x / 2]].concat(isFinite(T) ? [['T, s', T]] : []))), cols: 3 };
            }

            // a mass on a spring from a wall, along the floor: moved from where it rests, dashed, by x, stretched (way 1) or squeezed (-1),
            // or at rest (0); the spring's pull or push on it red, back to where it rests. m its name in it, if any
            function springDrawing(way, x, m) {
                var W = 300, H = 98, wall = 18, y = 72, rest = 160, bx = rest + 50 * way, cy = y - 15, a = wall + 10, b = bx - 10, coil = 'M' + wall + ' ' + cy + 'H' + a, ground = 'M' + wall + ' 12V' + y + 'H' + (W - 8), i, body;
                for (i = 0; i < 20; i++) coil += 'L' + fix(a + (b - a) * (i + 0.5) / 20) + ' ' + (cy + (i % 2 ? 7 : -7));
                for (i = 16; i <= y - 6; i += 8) ground += 'M' + wall + ' ' + i + 'l-6 6';
                body = '<path class="calc-sv-ground" d="' + ground + '"/><path class="calc-sv-seg calc-sv-thin" d="' + coil + 'L' + b + ' ' + cy + 'H' + bx + '"/>' +
                    '<rect x="' + bx + '" y="' + (y - 30) + '" width="30" height="30" fill="#d3bc8f" stroke="#8a7550" stroke-width="1.2"/>' + (m ? svgText(bx + 15, cy + 4, m, 'middle') : '');
                if (way) {
                    body += '<path class="calc-sv-guide" d="M' + rest + ' 22V' + (y + 20) + 'M' + bx + ' ' + (y + 4) + 'V' + (y + 20) + '"/>' + svgText(rest, 16, 'At rest', 'middle') +
                        svgArrow(rest, y + 14, bx, y + 14, 'calc-sv-seg calc-sv-thin') + svgText(bx + 6 * way, y + 18, x, way > 0 ? 'start' : 'end') +
                        svgArrow(way > 0 ? bx + 28 : bx + 2, 32, way > 0 ? bx - 8 : bx + 38, 32, 'calc-sv-curve') +
                        svgText(way > 0 ? bx + 34 : bx - 4, 36, 'F', way > 0 ? 'start' : 'end', 'calc-sv-small calc-sv-red');
                }
                return svgOf('', W, H, 'The mass on its spring', body);
            }

            function runDrag(n, raw) {
                var k = n.rho * n.cd * n.A / 2, vt, t, none = ['v<sub>t</sub>, m/s', 'v<sub>t</sub>, km/h'];
                if (!raw.m && !raw.A) return physNone(none);
                if (!(n.m > 0 && n.cd > 0 && n.A > 0 && n.rho > 0 && n.g > 0)) return Object.assign(physNone(none), { warn: true, note: 'm, Cd, A, ρ and g above 0.' });
                vt = Math.sqrt(n.m * n.g / k);
                t = vt / n.g * Math.atanh(0.95); // v = vt tanh(gt/vt), from rest
                return { rows: physRows([['v<sub>t</sub>, m/s', vt], ['v<sub>t</sub>, km/h', vt * 3.6], ['To 95%, s', t], ['Fallen by then, m', vt * vt / n.g * Math.log(Math.cosh(n.g * t / vt))]]
                    .concat(raw.v && isFinite(n.v) ? [['Drag at v, N', k * n.v * n.v], ['Of its weight, %', 100 * k * n.v * n.v / (n.m * n.g)]] : [])).concat(drawnTile(graphDrawing('Its speed as it falls', 0, 2 * t, {
                        fs: [function (x) { return vt * Math.tanh(n.g * x / vt); }, function () { return vt; }], dots: [[t, 0.95 * vt]], marks: [[t, '95%']] }), 'v against t, to v<sub>t</sub>')), cols: 2,
                    note: 'Falling from rest, the drag growing as v².' };
            }

            function runCoulomb(n, raw) {
                var p = partValues(raw, ['q1', 'q2']), v = p.v, F, none = ['F, N'], rows;
                if (p.bad.length) return Object.assign(physNone(none), { bad: p.bad, warn: true, note: 'A charge, as 2µ, -3n or 1.6e-19.' });
                if (!raw.q1 && !raw.q2) return physNone(none);
                if (!(isFinite(v.q1) && isFinite(v.q2) && n.r > 0)) return Object.assign(physNone(none), { warn: true, note: 'Both charges, and r above 0.' });
                F = COULOMB * v.q1 * v.q2 / (n.r * n.r);
                rows = F ? drawnTile(graphDrawing((F < 0 ? tr('The pull against r, falling as its square') : tr('The push against r, falling as its square')), 0, 3 * n.r, { fs: [function (x) { return Math.abs(COULOMB * v.q1 * v.q2) / (x * x); }],
                    y: [0, 4 * Math.abs(F)], dots: [[n.r, Math.abs(F)]], names: ['r, m', 'F, N'] }), 'F and r') : [];
                rows = rows.concat(physRows([['F, N', Math.abs(F)]]));
                rows.push({ l: 'They', wide: true, text: F < 0 ? 'Pull together' : F > 0 ? 'Push apart' : 'Neither' });
                return { rows: rows.concat(physRows([['Field of q₁ at r, N/C', COULOMB * Math.abs(v.q1) / (n.r * n.r)], ['Potential of q₁ at r, V', COULOMB * v.q1 / n.r], ['Energy, J', COULOMB * v.q1 * v.q2 / n.r]])),
                    cols: 2, note: 'In a vacuum, or air.' };
            }

            // a charge going round in a field out of the page, its dots: at the top, its centre below, for a charge above 0, at
            // the bottom for one below; v along it, F to the centre
            function circlingDrawing(neg, r) {
                var W = 300, H = 130, cx = 150, cy = 65, R = 44, y = neg ? cy + R : cy - R, d = neg ? -1 : 1, body = '', i, j;
                for (i = 20; i < W; i += 26) for (j = 12; j < H; j += 24) body += '<circle class="calc-sv-mid calc-sv-faint" cx="' + i + '" cy="' + j + '" r="1.6"/>';
                body += '<circle class="calc-sv-curve calc-sv-dash" cx="' + cx + '" cy="' + cy + '" r="' + R + '"/><circle class="calc-sv-mid" cx="' + cx + '" cy="' + cy + '" r="2"/>' +
                    '<path class="calc-sv-guide" d="M' + cx + ' ' + cy + 'H' + (cx + R) + '"/>' + svgText(cx + R / 2, cy - 4, 'r', 'middle') +
                    svgArrow(cx, y, cx + 42, y, 'calc-sv-seg') + svgText(cx + 48, y + 4, 'v') +
                    svgArrow(cx, y, cx, y + d * 26, 'calc-sv-curve') + svgText(cx - 6, y + d * 18 + 3, 'F', 'end', 'calc-sv-small calc-sv-red') +
                    '<circle class="calc-sv-dot" cx="' + cx + '" cy="' + y + '" r="4.5"/>' + svgText(cx, y + 3, neg ? '−' : '+', 'middle', 'calc-sv-small calc-sv-sub') +
                    svgText(W - 8, H - 6, 'B out of the page', 'end') + svgText(8, H - 6, 'r ' + CalcPhysics.si(r, 'm'));
                return svgOf('', W, H, 'The circle it goes round, F to its centre', body);
            }

            function runMagnetic(n, raw) {
                var wire = raw.kind === '1', p = partValues(raw, ['B', 'I', 'L', 'v', 'q', 'm']), v = p.v, s = Math.sin(raw.a ? toRadians(n.a) : Math.PI / 2),
                    q = raw.q ? Math.abs(v.q) : CHARGE, m = raw.m ? v.m : PARTICLES[0], none = ['F, N'], T;
                if (p.bad.length) return Object.assign(physNone(none), { bad: p.bad, warn: true, note: 'A value, as 0.5, 10m or 1e6.' });
                if (!raw.B) return physNone(none);
                if (wire) {
                    if (!(v.B >= 0 && v.I >= 0 && v.L > 0)) return Object.assign(physNone(none), { warn: true, note: 'B and I of 0 or more, and L above 0.' });
                    return { rows: physRows([['F, N', v.B * v.I * v.L * Math.abs(s)]]), cols: 2, note: 'Across both the wire and the field: Fleming\'s left hand.' };
                }
                if (!(v.B > 0 && v.v >= 0 && q > 0 && m > 0)) return Object.assign(physNone(none), { warn: true, note: 'B, q and m above 0, and v of 0 or more.' });
                T = 2 * Math.PI * m / (q * v.B);
                return { rows: drawnTile(v.v > 0 && s ? circlingDrawing(raw.q ? v.q < 0 : true, m * v.v * Math.abs(s) / (q * v.B)) : '', 'Its circle').concat(physRows([['F, N', q * v.v * v.B * Math.abs(s)], ['Radius, m', m * v.v * Math.abs(s) / (q * v.B)], ['T, s', T], ['f, Hz', 1 / T]]
                    .concat(Math.abs(s) < 1 - 1e-12 ? [['Pitch, m', v.v * Math.sqrt(1 - s * s) * T]] : []))), cols: 2,
                    note: raw.q || raw.m ? 'Across both v and B.' : 'Of an electron; across both v and B.' };
            }

            function runRotation(n, raw) {
                var k = CalcPhysics.INERTIA[+raw.shape || 0], rod = (+raw.shape || 0) < 2, w = raw.by === '1' ? n.w : n.w * 2 * Math.PI / 60, I, rows, none = ['I, kg·m²', 'E, J'];
                if (!raw.m && !raw.r) return physNone(none);
                if (!(n.m > 0 && n.r > 0 && (!raw.w || isFinite(w)) && (!raw.h || n.h >= 0))) return Object.assign(physNone(none), { warn: true, note: 'm and ' + (rod ? 'L' : 'r') + ' above 0, and h of 0 or more.' });
                I = k * n.m * n.r * n.r;
                rows = [['I, kg·m²', I]];
                if (raw.w) rows.push(['ω, rad/s', w], ['rpm', w * 30 / Math.PI], ['E, J', I * w * w / 2], ['L, kg·m²/s', I * w]);
                if (raw.h && !rod) rows.push(['Rolls to, m/s', Math.sqrt(2 * CalcPhysics.g * n.h / (1 + k))], ['Slides to, m/s', Math.sqrt(2 * CalcPhysics.g * n.h)], ['Of its energy spinning, %', 100 * k / (1 + k)]);
                return { rows: physRows(rows), cols: 2,
                    note: rod ? tr('Of a rod, its length{v}', { v: (raw.h ? tr('; a rod does not roll.') : '.') }) : raw.h ? 'Rolling, some of its energy goes to its spin: it is slower than sliding with no friction.' : 'With a height, its speed rolled down a slope.' };
            }

            function runImpulse(n, raw) {
                var J = n.m * (n.v - n.u), rows, none = ['p after, kg·m/s', 'J, N·s'];
                if (!raw.m && !raw.v) return physNone(none);
                if (!(n.m > 0 && isFinite(n.u) && isFinite(n.v))) return Object.assign(physNone(none), { warn: true, note: 'A mass above 0, and both speeds.' });
                rows = [['p before, kg·m/s', n.m * n.u], ['p after, kg·m/s', n.m * n.v], ['J, N·s', J], ['KE gained, J', n.m * (n.v * n.v - n.u * n.u) / 2]];
                if (raw.t && n.t > 0) rows.push(['Average F, N', J / n.t], ['Of its weight, times', Math.abs(J / n.t) / (n.m * CalcPhysics.g)]);
                return { rows: physRows(rows), cols: 2, note: raw.t ? 'Averaged over the time: at its peak the force is more.' : 'With a time, the average force too.' };
            }

            // a lever, its pivot where it balances, the load at its left end and the effort at its right, each arrow as long as its force
            function leverDrawing(d1, d2, W1, W2) {
                var W = 300, H = 92, a = 20, b = 280, p = a + (b - a) * d1 / (d1 + d2), top = Math.max(W1, W2) || 1, y = 52;
                return svgOf('', W, H, 'The lever', '<rect class="calc-sv-fill" x="' + a + '" y="' + y + '" width="' + (b - a) + '" height="6" rx="2"/>' +
                    '<path class="calc-sv-fill" d="M' + fix(p) + ' ' + (y + 6) + 'l-9 16h18Z"/>' +
                    svgArrow(a + 4, y - 4 - Math.max(8, 36 * W1 / top), a + 4, y - 1) + svgArrow(b - 4, y - 4 - Math.max(8, 36 * W2 / top), b - 4, y - 1, 'calc-sv-curve') +
                    svgText(a + 12, 14, 'Load') + svgText(b - 12, 14, 'Effort', 'end') + svgText((a + p) / 2, y + 30, 'd<tspan class="calc-sv-sub" dy="2">load</tspan>', 'middle') +
                    svgText((p + b) / 2, y + 30, 'd<tspan class="calc-sv-sub" dy="2">effort</tspan>', 'middle'));
            }

            // a bar from its pivot, a force at its end at the angle t to it
            function torqueDrawing(t) {
                var W = 300, H = 110, px = 70, y = 62, ex = 200, c = Math.cos(t), s = Math.sin(t);
                return svgOf('', W, H, 'The force on the bar', '<rect class="calc-sv-fill" x="' + (px - 4) + '" y="' + (y - 4) + '" width="' + (ex - px + 8) + '" height="8" rx="4"/>' +
                    '<circle class="calc-sv-mid" cx="' + px + '" cy="' + y + '" r="4"/><path class="calc-sv-guide" d="M' + ex + ' ' + y + 'H' + (ex + 56) + '"/>' +
                    svgArrow(ex, y, ex + 46 * c, y - 46 * s, 'calc-sv-curve') +
                    (Math.abs(s) > 0.05 || c < 0 ? '<path class="calc-sv-guide" d="M' + (ex + 20) + ' ' + y + 'A20 20 0 0 ' + (s >= 0 ? 0 : 1) + ' ' + fix(ex + 20 * c) + ' ' + fix(y - 20 * s) + '"/>' : '') +
                    svgText(ex + 30 * Math.cos(t / 2), y - 30 * Math.sin(t / 2) + 4, 'θ', 'middle') + svgText((px + ex) / 2, y + 20, 'r', 'middle') + svgText(px, y + 20, 'Pivot', 'middle'));
            }

            function runTorque(n, raw) {
                var t = raw.a ? toRadians(n.a) : Math.PI / 2, E, tau, none = raw.kind === '1' ? ['Effort, N', 'Advantage'] : ['τ, N·m'];
                if (raw.kind === '1') {
                    if (!raw.W && !raw.d1 && !raw.d2) return physNone(none);
                    if (!(n.W >= 0 && n.d1 > 0 && n.d2 > 0)) return Object.assign(physNone(none), { warn: true, note: 'The load 0 or more, and both distances above 0.' });
                    E = n.W * n.d1 / n.d2;
                    return { rows: physRows([['Effort, N', E], ['Advantage', n.d1 ? n.d2 / n.d1 : NaN], ['Torque each way, N·m', n.W * n.d1], ['The pivot holds, N', n.W + E]])
                        .concat([{ l: 'The lever', wide: true, text: leverDrawing(n.d1, n.d2, n.W, E) }]), cols: 2,
                        note: tr('The pivot between them; the bar\'s own weight left out. The effort moves {d2} times as far as the load.', { d2: local(String(CalcMaths.round(n.d2 / n.d1))) }) };
                }
                if (!raw.F && !raw.r) return physNone(none);
                if (!(isFinite(n.F) && n.r >= 0 && isFinite(t))) return Object.assign(physNone(none), { warn: true, note: 'F, and r of 0 or more.' });
                tau = n.F * n.r * Math.sin(t);
                return { rows: physRows([['τ, N·m', tau], ['Across the bar, N', n.F * Math.sin(t)], ['Along the bar, N', n.F * Math.cos(t)], ['τ, lbf·ft', tau / 1.3558179483314004]])
                    .concat([{ l: 'The force', wide: true, text: torqueDrawing(t) }]), cols: 2,
                    note: tr('Only the force across the bar turns it{v}', { v: (tau ? (tau > 0 ? tr(', anticlockwise as drawn.') : tr(', clockwise as drawn.')) : '.') }) };
            }

            function runField(n, raw) {
                var of = +raw.kind || 0, p = partValues(raw, ['I', 'r', 'L', 'I2']), v = p.v, B, F, rows, none = ['B, T', 'B, µT'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 10, 5m or 2.5.' });
                if (!raw.I) return Object.assign(physNone(none), { cols: 2 });
                if (!(isFinite(v.I) && (of === 1 ? n.N > 0 && v.L > 0 && n.mu > 0 : v.r > 0 && (of === 0 || n.N > 0)))) {
                    return Object.assign(physNone(none), { cols: 2, warn: true, note: of === 1 ? 'I, and N, L and μr above 0.' : of === 2 ? 'I, and r and N above 0.' : 'I, and r above 0.' });
                }
                B = Math.abs(of === 1 ? MU0 * n.mu * n.N * v.I / v.L : of === 2 ? MU0 * n.N * v.I / (2 * v.r) : MU0 * v.I / (2 * Math.PI * v.r));
                rows = physRows([['B, T', B], ['B, µT', B * 1e6], ['B, gauss', B * 1e4], ['Of the Earth\'s, times', B / 5e-5]].concat(of === 1 ? [['Turns a metre', n.N / v.L]] : []));
                if (of === 0 && raw.I2 && isFinite(v.I2)) {
                    F = MU0 * v.I * v.I2 / (2 * Math.PI * v.r);
                    rows = rows.concat(physRows([['Force a metre, N', Math.abs(F)]]), [{ l: 'The wires', wide: true, text: F > 0 ? 'Pull together' : F < 0 ? 'Push apart' : 'Neither' }]);
                }
                if (of !== 1) rows = drawnTile(graphDrawing(of === 0 ? 'B against the distance from the wire' : 'B at the middle against the radius of the loop', 0, 3 * v.r, {
                    fs: [function (x) { return 1e6 * Math.abs(of === 2 ? MU0 * n.N * v.I / (2 * x) : MU0 * v.I / (2 * Math.PI * x)); }], y: [0, 5e6 * B], dots: [[v.r, 1e6 * B]], names: ['r, m', 'B, µT'] }),
                    'B and r').concat(rows);
                return { rows: rows, cols: 2, note: of === 0 ? 'Round the wire, by the right-hand grip rule; currents the same way pull together.' : of === 1 ? 'Inside, along its axis, of a solenoid long beside its width.' : 'At the middle, along its axis.' };
            }

            function runInduction(n, raw) {
                var of = +raw.kind || 0, p = partValues(raw, ['N', 'A', 'B', 'dB', 't', 'L', 'v', 'rpm', 'R']), v = p.v, emf, rows, none = of === 2 ? ['Peak ε, V', 'RMS, V'] : ['ε, V'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 200, 10m or 0.5.' });
                if (of === 1) {
                    if (!raw.B && !raw.L && !raw.v) return Object.assign(physNone(none), { cols: 2 });
                    if (!(isFinite(v.B) && v.L > 0 && isFinite(v.v))) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'B and v, and L above 0.' });
                    emf = Math.abs(v.B * v.L * v.v);
                    rows = [['ε, V', emf]];
                } else {
                    if (!raw.N && !raw.A && !raw[of === 2 ? 'B' : 'dB']) return Object.assign(physNone(none), { cols: 2 });
                    if (!(v.N > 0 && v.A > 0 && (of === 2 ? v.B > 0 && v.rpm > 0 : isFinite(v.dB) && v.t > 0))) {
                        return Object.assign(physNone(none), { cols: 2, warn: true, note: of === 2 ? 'N, A, B and rpm above 0.' : 'N, A and Δt above 0, and ΔB.' });
                    }
                    emf = of === 2 ? v.N * v.B * v.A * v.rpm * Math.PI / 30 : Math.abs(v.N * v.A * v.dB / v.t);
                    rows = of === 2 ? [['Peak ε, V', emf], ['RMS, V', emf / Math.SQRT2], ['f, Hz', v.rpm / 60]] : [['ε, V', emf], ['ΔΦ, Wb', v.A * v.dB], ['Of all its turns, Wb', v.N * v.A * v.dB]];
                }
                if (raw.R && v.R > 0) {
                    rows.push([of === 2 ? 'Peak I, A' : 'I, A', emf / v.R], [of === 2 ? 'Average P, W' : 'P, W', emf * emf / v.R / (of === 2 ? 2 : 1)]);
                    if (of === 0) rows.push(['Charge moved, C', Math.abs(v.N * v.A * v.dB) / v.R]);
                }
                return { rows: physRows(rows), cols: 2, note: of === 0 ? 'Against the change, by Lenz\'s law: its current\'s field opposes it.' : of === 1 ? 'Across both the rod and the field: Fleming\'s right hand.' :
                    'A sine wave, its peak when the coil is along the field.' };
            }

            // the values of the boxes of a circuit, as a part's value is written, 4.7k, or a calculation; and those that are not one
            function partValues(raw, keys) {
                var out = { v: {}, bad: [] };
                keys.forEach(function (k) {
                    var v = raw[k] ? CalcPhysics.readValue(raw[k], engine.comma) : NaN;
                    if (raw[k] && isNaN(v)) v = CalcMaths.number(raw[k], engine.comma, app.deg);
                    out.v[k] = v;
                    if (raw[k] && isNaN(v)) out.bad.push(k);
                });
                return out;
            }

            // A resistor drawn with its bands, as a real one is: a cap at each end, wider than the middle, the first band on
            // the left one and the last on the right one, apart from the rest, its gap 1.7 times the others'. The bands cut to its shape,
            // its edge over them
            var resistorClips = 0;
            function resistorDrawing(bands) {
                var W = 300, H = 60, n = bands.length, a = 70, b = 230, w = n === 4 ? 14 : n === 5 ? 12 : 11,
                    step = w + (b - a - 32 - n * w) / (n - 0.3), id = 'calc-resistor-' + (++resistorClips), html = '',
                    body = 'M' + a + ' 30C' + a + ' 16 ' + (a + 4) + ' 12 ' + (a + 14) + ' 12H' + (a + 22) + 'C' + (a + 30) + ' 12 ' + (a + 30) + ' 15 ' + (a + 38) + ' 15' +
                        'H' + (b - 38) + 'C' + (b - 30) + ' 15 ' + (b - 30) + ' 12 ' + (b - 22) + ' 12H' + (b - 14) + 'C' + (b - 4) + ' 12 ' + b + ' 16 ' + b + ' 30' +
                        'C' + b + ' 44 ' + (b - 4) + ' 48 ' + (b - 14) + ' 48H' + (b - 22) + 'C' + (b - 30) + ' 48 ' + (b - 30) + ' 45 ' + (b - 38) + ' 45' +
                        'H' + (a + 38) + 'C' + (a + 30) + ' 45 ' + (a + 30) + ' 48 ' + (a + 22) + ' 48H' + (a + 14) + 'C' + (a + 4) + ' 48 ' + a + ' 44 ' + a + ' 30Z';
                bands.forEach(function (c, i) {
                    var col = CalcPhysics.COLOURS[c][5], x = i === n - 1 ? b - 16 - w : a + 16 + i * step;
                    if (col) html += '<rect x="' + x.toFixed(1) + '" y="8" width="' + w + '" height="44" fill="' + col + '"/>';
                });
                return '<svg class="calc-sv-shape calc-sv-resistor" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + tr('The resistor') + '">' +
                    '<defs><clipPath id="' + id + '"><path d="' + body + '"/></clipPath></defs>' +
                    '<path class="calc-sv-lead" d="M10 30H' + a + 'M' + b + ' 30H' + (W - 10) + '"/><path class="calc-sv-body" d="' + body + '"/>' +
                    '<g clip-path="url(#' + id + ')">' + html + '</g><path class="calc-sv-edge" d="' + body + '"/></svg>';
            }

            function runColours(n, raw) {
                var count, kinds, bands, r, text, read, got;
                if (raw.find === '1') {
                    read = partValues(raw, ['ohms']);
                    if (!raw.ohms) return { rows: [{ l: 'Bands', v: NaN }] };
                    got = CalcPhysics.toBands(read.v.ohms, raw.n5 === '1' ? 5 : 4, CalcPhysics.BAND_COLOURS.tol[+raw.tol]);
                    if (!got) return { rows: [{ l: 'Bands', v: NaN }], bad: ['ohms'], warn: true, note: read.bad.length ? 'A resistance, as 4.7k, 4k7, 470R or 1M.' : 'From 0.1 Ω to 999 GΩ, as bands can say.' };
                    return { rows: [{ l: 'Drawn', wide: true, text: resistorDrawing(got.bands) },
                        { l: 'Bands', wide: true, wrap: true, text: got.bands.map(function (c) { return tr(CalcPhysics.COLOURS[c][0]); }).join(' · ') }, { l: 'As they say, Ω', v: got.ohms }],
                        note: got.ohms !== read.v.ohms ? (raw.n5 === '1' ? tr('Rounded to the three digits its bands have: {ohms}.', { ohms: CalcPhysics.si(got.ohms, 'Ω') }) : tr('Rounded to the two digits its bands have: {ohms}.', { ohms: CalcPhysics.si(got.ohms, 'Ω') })) : '' };
                }
                count = [4, 5, 6][+raw.n || 0];
                kinds = CalcPhysics.bandKinds(count);
                bands = kinds.map(function (kind, i) { return CalcPhysics.BAND_COLOURS[kind][+raw['b' + count + i]]; }); // each choice's way, its first while none is chosen
                r = CalcPhysics.fromBands(bands);
                text = CalcPhysics.si(r.ohms, 'Ω') + ' ± ' + r.tol + '%' + (r.temp !== null ? tr(', {temp} ppm/K', { temp: r.temp }) : '');
                return { rows: [{ l: 'Drawn', wide: true, text: resistorDrawing(bands) }, { l: 'Resistance', wide: true, text: text, copy: text }, { l: 'Ω', v: r.ohms }, { l: 'From, Ω', v: r.min }, { l: 'To, Ω', v: r.max }],
                    cols: 3, note: bands[0] === 0 ? 'A first band of black is not made: read it from the other end.' : '' };
            }

            // SMD resistors as they are seen from above, black between their ends of tin, each its code on it in white, its name under it
            function smdDrawing(chips) {
                var W = 300, n = chips.length, w = n === 1 ? 120 : 80, gap = (W - n * w) / (n + 1), named = chips.some(function (c) { return c[1]; }), body = '';
                chips.forEach(function (c, i) {
                    var x = gap + i * (w + gap), mid = x + w / 2, size = Math.min(20, 1.6 * (w - 34) / Math.max(3, c[0].length));
                    body += '<rect x="' + fix(x) + '" y="6" width="' + w + '" height="40" rx="3" style="fill: #b9bdc2; stroke: #8a8f95"/>' +
                        '<rect x="' + fix(x + 13) + '" y="6" width="' + (w - 26) + '" height="40" style="fill: #232323"/>' +
                        '<text x="' + fix(mid) + '" y="' + fix(26 + size * 0.36) + '" text-anchor="middle" style="fill: #f3f3f3; font-size: ' + fix(size) + 'px; letter-spacing: 1px">' + c[0] + '</text>' +
                        (c[1] ? svgText(mid, 62, c[1], 'middle') : '');
                });
                return svgOf('', W, named ? 68 : 52, 'The resistor', body);
            }

            // an SMD resistor's value of its code, or the codes of a value: of 3 digits, of 4 and of EIA-96, each rounded to what it can say
            function runSmd(n, raw) {
                var r, got, rows, none, code, text;
                if (raw.find === '1') {
                    none = physNone(['3 digits', '4 digits', 'EIA-96']);
                    if (!raw.ohms) return Object.assign(none, { cols: 3 });
                    r = partValues(raw, ['ohms']).v.ohms;
                    got = CalcPhysics.toSmd(r);
                    if (!got) return Object.assign(none, { cols: 3, bad: ['ohms'], warn: true, note: 'A resistance above 0, as 4.7k, 4k7 or 470R.' });
                    rows = [['3 digits', got.three, 'Of 3, Ω'], ['4 digits', got.four, 'Of 4, Ω'], ['EIA-96', got.eia, 'Of EIA-96, Ω']];
                    return { rows: drawnTile(smdDrawing(rows.filter(function (c) { return c[1]; }).map(function (c) { return [c[1].code, c[0]]; })), 'Its codes').concat(
                        rows.map(function (c) { return c[1] ? { l: c[0], text: c[1].code } : { l: c[0], v: NaN }; }), rows.map(function (c) { return { l: c[2], v: c[1] ? c[1].ohms : NaN }; })), cols: 3,
                        note: tr('3 digits are of parts of 5%, 4 and EIA-96 of 1%, E96{v}{v2}', { v: (rows.some(function (c) { return c[1] && c[1].ohms !== r; }) ? tr(': each rounded to what its code can say.') : '.'), v2: (!got.three ? tr(' Of 3 marks, from 0.1 Ω to 99 GΩ.') : '') }) };
                }
                none = physNone(['Resistance', 'Ω']);
                if (!raw.code) return Object.assign(none, { cols: 2 });
                got = CalcPhysics.fromSmd(raw.code);
                if (!got) return Object.assign(none, { cols: 2, bad: ['code'], warn: true, note: 'A code of 3 digits, 473, of 4, 4702, R for the point, 4R7, or of EIA-96, two digits and a letter, 01C.' });
                code = raw.code.toUpperCase().replace(/\s+/g, '');
                text = got.ohms ? CalcPhysics.si(got.ohms, 'Ω') + ' ± ' + got.tol + '%' : '0 Ω';
                return { rows: drawnTile(smdDrawing([[code, '']]), 'The resistor').concat([{ l: 'Resistance', text: text, copy: text, wide: true }, { l: 'Ω', v: got.ohms }, { l: 'Its code', text: got.kind }],
                    got.tol ? physRows([['From, Ω', got.ohms * (1 - got.tol / 100)], ['To, Ω', got.ohms * (1 + got.tol / 100)]]) : []), cols: 2,
                    note: !got.ohms ? 'A jumper: a link of no resistance, 50 mΩ at most.' : got.also ? tr('Of EIA-96 {code} would be {ohms}, but R for the point is far more usual.', { code: code, ohms: CalcPhysics.si(got.also.ohms, 'Ω') }) :
                        tr('Usually made to {tol}%{v}', { tol: got.tol, v: (got.tol === 1 ? tr(', of E96.') : '.') }) };
            }

            function runNetwork(n, raw) {
                var kind = ['R', 'C', 'L'][+raw.part || 0], unit = { R: 'Ω', C: 'F', L: 'H' }[kind], r;
                if (!raw.n) return { rows: [{ l: 'In all', v: NaN }] };
                r = CalcPhysics.network(raw.n, kind, engine.comma);
                if (r.error) return { rows: [{ l: 'In all', v: NaN }], bad: ['n'], warn: true, note: r.error === 'bracket' ? 'A bracket is not closed.' : tr('Values above 0, as 100, 4.7k or 4k7, with + and || between them; at "{at}".', { at: raw.n.slice(r.at, r.at + 8) }) };
                return { rows: [{ l: 'In all', wide: true, text: CalcPhysics.si(r.value, unit), copy: CalcPhysics.si(r.value, unit) }, { l: unit, v: r.value }, { l: 'Parts', v: r.parts }], cols: 2,
                    note: kind === 'C' ? 'Capacitors in parallel add up; in series, their reciprocals do.' : 'In series they add up; in parallel, their reciprocals do.' };
            }

            function runOhm(n, raw) {
                var p = partValues(raw, ['V', 'I', 'R', 'P']), v = p.v, known = ['V', 'I', 'R', 'P'].filter(function (k) { return raw[k] && isFinite(v[k]); }), V = v.V, I = v.I, R = v.R, P = v.P, none = ['V', 'I, A', 'R, Ω', 'P, W'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 12, 4.7k or 20m.' });
                if (known.length < 2) return Object.assign(physNone(none), { cols: 2 });
                if (known.length > 2) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Two of the four only: leave two empty.' });
                switch (known.join('')) {
                    case 'VI': R = V / I; P = V * I; break;
                    case 'VR': I = V / R; P = V * V / R; break;
                    case 'VP': I = P / V; R = V * V / P; break;
                    case 'IR': V = I * R; P = I * I * R; break;
                    case 'IP': V = P / I; R = P / (I * I); break;
                    case 'RP': I = Math.sqrt(P / R); V = Math.sqrt(P * R); break;
                }
                if (![V, I, R, P].every(isFinite)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Divided by 0, or a power and a resistance not of the same sign: no answer.' });
                return { rows: physRows([['V', V], ['I, A', I], ['R, Ω', R], ['P, W', P]]), cols: 2,
                    note: CalcPhysics.si(V, 'V') + ', ' + CalcPhysics.si(I, 'A') + ', ' + CalcPhysics.si(R, 'Ω') + ', ' + CalcPhysics.si(P, 'W') + '.' };
            }

            function runDivider(n, raw) {
                var p = partValues(raw, ['V', 'R1', 'R2', 'RL']), v = p.v, r2 = v.R2, out, th, bare, lo, hi, none = ['V out', 'I, A'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 9, 10k or 4k7.' });
                if (!raw.V && !raw.R1 && !raw.R2) return Object.assign(physNone(none), { cols: 2 });
                if (!(isFinite(v.V) && v.R1 > 0 && v.R2 > 0 && (!raw.RL || v.RL > 0))) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Vin, and resistances above 0.' });
                if (raw.RL) r2 = 1 / (1 / v.R2 + 1 / v.RL);
                out = v.V * r2 / (v.R1 + r2);
                th = v.R1 * v.R2 / (v.R1 + v.R2);
                bare = v.V * v.R2 / (v.R1 + v.R2);
                // the load from a hundredth of Rth to a hundred times, by its log, wider to take in a load typed
                lo = Math.log10(th) - 2;
                hi = Math.log10(th) + 2;
                if (raw.RL) {
                    lo = Math.min(lo, Math.log10(v.RL) - 0.5);
                    hi = Math.max(hi, Math.log10(v.RL) + 0.5);
                }
                return { rows: drawnTile(graphDrawing('V out against the load, by its log, the line without one', lo, hi, {
                    fs: [function (x) { var r = 1 / (1 / v.R2 + Math.pow(10, -x)); return v.V * r / (v.R1 + r); }, function () { return bare; }],
                    marks: [[Math.log10(th), tr('Rth {th}', { th: CalcPhysics.si(th, 'Ω') })]].concat(raw.RL && Math.abs(Math.log10(v.RL / th)) > 0.6 ? [[Math.log10(v.RL), 'load']] : []),
                    dots: raw.RL ? [[Math.log10(v.RL), out]] : [], y: bare > 0 ? [0, 1.3 * bare] : bare < 0 ? [1.3 * bare, 0] : undefined, names: ['load', 'V out'] }), 'With a load').concat(physRows([['V out', out], ['I, A', v.V / (v.R1 + r2)], ['Ratio', r2 / (v.R1 + r2)]].concat(raw.RL ? [['Without the load', bare]] : [],
                    [['R<sub>th</sub>, Ω', th], ['Most to a load, W', bare * bare / (4 * th)]]))), cols: 2,
                    note: CalcPhysics.si(out, 'V') + (raw.RL ? ', the load across R₂' : '') + '. To a load it is ' + CalcPhysics.si(bare, 'V') + ' behind ' + CalcPhysics.si(th, 'Ω') + ', R₁ ∥ R₂; ' +
                        'a load of ' + CalcPhysics.si(th, 'Ω') + ' takes the most.' };
            }

            function runBridge(n, raw) {
                var p = partValues(raw, ['R1', 'R2', 'R3', 'Rx', 'V']), v = p.v, find = !raw.Rx, V = raw.V ? v.V : NaN, rx, b, rows, none = find ? ['R<sub>x</sub>, Ω', 'R<sub>out</sub>, Ω'] : ['V<sub>out</sub>', 'R<sub>out</sub>, Ω'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 1k, 470 or 2k2.' });
                if (!raw.R1 && !raw.R2 && !raw.R3) return Object.assign(physNone(none), { cols: 2 });
                rx = find ? CalcPhysics.bridgeRx(v.R1, v.R2, v.R3) : v.Rx;
                b = CalcPhysics.bridge(isFinite(V) ? V : 1, v.R1, v.R2, v.R3, rx);
                if (!(v.R1 > 0) || !(rx >= 0) || !b || raw.V && !isFinite(V)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'R1 above 0, and R2, R3 and Rx 0 or more.' });
                rows = find ? [['R<sub>x</sub>, Ω', rx]] : [[isFinite(V) ? 'V<sub>out</sub>' : 'V<sub>out</sub> ÷ V', b.out], ['Balanced at R<sub>x</sub>, Ω', CalcPhysics.bridgeRx(v.R1, v.R2, v.R3)]];
                rows.push(['R<sub>out</sub>, Ω', b.r]);
                if (isFinite(V)) rows.push(['I from V, A', V * (1 / (v.R1 + v.R2) + 1 / (v.R3 + rx))], ['V at the middles', V * v.R2 / (v.R1 + v.R2)]);
                return { rows: physRows(rows).concat(drawnTile(bridgeDrawing([v.R1, v.R2, v.R3, rx], find), 'The bridge')), cols: 2,
                    note: find ? 'Balanced, R₁ ÷ R₂ = R₃ ÷ Rₓ: no voltage between its middles, whatever V is.' :
                        tr('Vout is the left middle less the right; R out is what a meter between them sees{v}', { v: (isFinite(V) ? '.' : tr('; with V, in volts.')) }) };
            }

            // A Wheatstone bridge, its values [R1, R2, R3, Rx]: R1 over R2 on the left, R3 over Rx on the right, a cell across its top
            // and bottom, a meter between its middles; Rx red where it is found
            function bridgeDrawing(r, found) {
                var T = [150, 12], L = [92, 60], R = [208, 60], B = [150, 108], body = '';
                function part(a, c, name, value, side, red) { // a resistor from a to c, named outside its side
                    var mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, deg = Math.atan2(c[1] - a[1], c[0] - a[0]) * 180 / Math.PI;
                    return '<path class="calc-sv-seg calc-sv-thin" d="M' + a[0] + ' ' + a[1] + 'L' + c[0] + ' ' + c[1] + '"/><rect class="calc-sv-fill calc-sv-block" x="-13" y="-5" width="26" height="10" ' +
                        'transform="translate(' + fix(mx) + ' ' + fix(my) + ') rotate(' + fix(deg) + ')"/>' + svgText(mx + side * 16, my + (my < 60 ? -4 : 12), name + ' ' + CalcPhysics.si(value, 'Ω'),
                        side < 0 ? 'end' : 'start', 'calc-sv-small' + (red ? ' calc-sv-red' : ''));
                }
                body += '<path class="calc-sv-seg calc-sv-thin" d="M150 12H30V57M30 63V108H150M' + L[0] + ' 60H141M159 60H' + R[0] + '"/>' +
                    '<path class="calc-sv-seg" d="M20 57H40M25 63H35"/>' + svgText(16, 64, 'V', 'end') +
                    part(T, L, 'R₁', r[0], -1) + part(L, B, 'R₂', r[1], -1) + part(T, R, 'R₃', r[2], 1) + part(R, B, 'Rₓ', r[3], 1, found) +
                    '<circle class="calc-sv-fill" cx="150" cy="60" r="9"/>' + svgText(150, 63.5, 'V', 'middle');
                [T, L, R, B].forEach(function (q) { body += '<circle class="calc-sv-mid" cx="' + q[0] + '" cy="' + q[1] + '" r="2.5"/>'; });
                return svgOf('', 300, 120, 'The bridge', body);
            }

            function runRc(n, raw) {
                var p = partValues(raw, ['R', 'C', 't']), v = p.v, tau, rows, none = ['τ, s', 'f, Hz'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 10k, 100n or 2.2µ.' });
                if (!raw.R && !raw.C) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.R > 0 && v.C > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'R and C are above 0.' });
                tau = v.R * v.C;
                rows = [['τ, s', tau], ['Cut-off f, Hz', 1 / (2 * Math.PI * tau)], ['To 99%, s', tau * Math.log(100)]];
                if (raw.t && v.t >= 0) rows.push(['Charged at t, %', 100 * -Math.expm1(-v.t / tau)], ['Left at t, %', 100 * Math.exp(-v.t / tau)]);
                return { rows: physRows(rows).concat([{ l: 'Charging', wide: true, text: riseDrawing(tau, raw.t && v.t >= 0 ? v.t : undefined, 'V') }]), cols: 2,
                    note: tr('τ = {tau}, cut-off at {v}.', { tau: CalcPhysics.si(tau, 's'), v: CalcPhysics.si(1 / (2 * Math.PI * tau), 'Hz') }) };
            }

            // rising to its last value, 63% of it in a time τ: over 5τ, a dot at t
            function riseDrawing(tau, t, name) {
                var x1 = Math.max(5 * tau, (t || 0) * 1.1);
                return curveDrawing('Rising over time', x1, 0, 1, function (x) { return -Math.expm1(-x / tau); }, { marks: [[tau, 'τ'], [2 * tau, '2τ'], [3 * tau, '3τ'], [4 * tau, '4τ'], [5 * tau, '5τ']]
                    .filter(function (m) { return m[0] < x1 * 0.97; }), at: t, names: ['', name] });
            }

            function runRl(n, raw) {
                var p = partValues(raw, ['R', 'L', 't']), v = p.v, tau, rows, none = ['τ, s', 'f, Hz'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 100, 10m or 4.7µ.' });
                if (!raw.R && !raw.L) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.R > 0 && v.L > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'R and L are above 0.' });
                tau = v.L / v.R;
                rows = [['τ, s', tau], ['Cut-off f, Hz', 1 / (2 * Math.PI * tau)], ['To 99%, s', tau * Math.log(100)]];
                if (raw.t && v.t >= 0) rows.push(['Current at t, %', 100 * -Math.expm1(-v.t / tau)], ['Left at t, %', 100 * Math.exp(-v.t / tau)]);
                return { rows: physRows(rows).concat([{ l: 'The current rising', wide: true, text: riseDrawing(tau, raw.t && v.t >= 0 ? v.t : undefined, 'I') }]), cols: 2,
                    note: tr('τ = {tau}, cut-off at {v}.', { tau: CalcPhysics.si(tau, 's'), v: CalcPhysics.si(1 / (2 * Math.PI * tau), 'Hz') }) };
            }

            // A filter's cut-off, Q and band, and its gain and phase at f; its gain drawn against f of a log scale, two decades either
            // side of its cut-off or centre, each decade marked
            function runFilter(n, raw) {
                var of = +raw.kind || 0, pass = of === 2 ? +raw.pass2 || 0 : +raw.pass || 0, band = of === 2 && pass > 1, parts = ['R'].concat(of ? ['L'] : [], of !== 1 ? ['C'] : []),
                    p = partValues(raw, parts.concat('f')), v = p.v, r, rows, at, lf, x0, x1, ys = [], lo, hi, gain, marks, k, none = [band ? 'f₀, Hz' : 'Cut-off f, Hz', 'Q'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 10k, 100n or 4.7µ.' });
                if (!parts.some(function (q) { return raw[q]; })) return Object.assign(physNone(none), { cols: 2 });
                r = CalcPhysics.filter(of, pass, v.R, v.L, v.C);
                if (!r || (raw.f && !(v.f > 0))) return Object.assign(physNone(none), { cols: 2, warn: true, note: tr('{parts} above 0.', { parts: parts.join(', ').replace(/, (\w)$/, ' and $1') + (raw.f ? tr(', and f,') : '') }) });
                rows = band ? [['f₀, Hz', r.f0], ['Q', r.q], ['Bandwidth, Hz', r.bw], ['From, Hz', r.lo], ['To, Hz', r.hi]] :
                    [['Cut-off f, Hz', r.fc]].concat(of === 2 ? [['f₀, Hz', r.f0], ['Q', r.q]] : [['τ, s', of ? v.L / v.R : v.R * v.C]], r.peak ? [['Peak at, Hz', r.peak[0]], ['Peak, dB', 20 * Math.log10(r.peak[1])]] : []);
                if (raw.f) {
                    at = r.at(v.f);
                    rows.push(['Gain at f', at.gain], ['At f, dB', at.db], ['Phase at f', fromRadians(at.phase)]);
                }
                lf = Math.log10(band ? r.f0 : r.fc);
                x0 = raw.f ? Math.min(lf - 2, Math.log10(v.f) - 0.3) : lf - 2;
                x1 = raw.f ? Math.max(lf + 2, Math.log10(v.f) + 0.3) : lf + 2;
                gain = function (x) { return Math.max(-80, r.at(Math.pow(10, x)).db); };
                for (k = 0; k <= 80; k++) ys.push(gain(x0 + (x1 - x0) * k / 80));
                lo = Math.max(-60, Math.min.apply(null, ys));
                hi = Math.max(0, Math.max.apply(null, ys));
                marks = [[lf, band ? 'f₀' : 'fc']];
                for (k = Math.ceil(x0); k <= Math.floor(x1); k++) if (Math.abs(k - lf) > 0.45) marks.push([k, CalcPhysics.si(Math.pow(10, k), 'Hz').replace(/\s/g, '')]);
                return { rows: physRows(rows).concat(drawnTile(graphDrawing('Its gain at each frequency', x0, x1, {
                    fs: [gain], y: [lo - 0.05 * (hi - lo), hi + 0.2 * (hi - lo)], marks: marks,
                    dots: raw.f ? [[Math.log10(v.f), gain(Math.log10(v.f))]] : [], names: ['f', 'dB'] }), 'Gain against f, in dB')), cols: 2,
                    note: (of < 2 ? 'Of the first order: 20 dB less each decade past its cut-off, where it is 3 dB down, half the power.' :
                        pass < 2 ? tr('Of the second order: 40 dB less each decade past it{v}', { v: (r.peak ? tr('; of Q above 0.707 it peaks first.') : '.') }) :
                            pass === 2 ? 'Its band between the two frequencies 3 dB down, 20 dB less each decade beyond.' : 'At f₀ nothing gets through; 3 dB down at the ends of its band.') +
                        (raw.f ? tr(' Phase in {unitWord}.', { unitWord: unitWord() }) : '') };
            }

            // where a level is among signals, in dBm: from as faint as a radio hears to a transmitter's kilowatt
            function levelDrawing(dbm) {
                var W = 300, id = 'calc-plot-' + (++app.plotIds), x = function (d) { return 10 + (W - 20) * (d + 120) / 180; }, at = x(Math.max(-120, Math.min(60, dbm))), body;
                body = '<defs><linearGradient id="' + id + '"><stop offset="0" stop-color="#5bb05a"/><stop offset="0.55" stop-color="#f3d43a"/><stop offset="1" stop-color="#d7302b"/></linearGradient></defs>' +
                    '<rect x="10" y="10" width="' + (W - 20) + '" height="14" rx="3" fill="url(#' + id + ')"/>';
                [[-120, '−120', 'start'], [-90, 'Weak'], [-50, 'Strong'], [0, '1 mW'], [30, '1 W'], [60, '1 kW', 'end']].forEach(function (q) { body += svgText(x(q[0]), 43, q[1], q[2] || 'middle'); });
                return svgOf('', W, 48, 'Where it is among signals', body + '<path class="calc-sv-head calc-sv-head-red" d="M' + fix(at) + ' 24l-5 7h10Z"/><path class="calc-sv-curve" d="M' + fix(at) + ' 7V24"/>');
            }

            // A level in each of its units across an impedance, drawn among signals; or a gain or loss in dB and as ratios,
            // drawn on the curves of each
            function runDecibels(n, raw) {
                var none, p, r, z;
                if (raw.kind === '1') {
                    none = physNone(['dB', 'Power ×', 'Voltage ×']);
                    p = partValues(raw, ['g']);
                    if (p.bad.length) return Object.assign(none, { cols: 3, bad: p.bad, warn: true, note: 'A number, as 3, -6 or 0.5.' });
                    if (!raw.g) return Object.assign(none, { cols: 3 });
                    r = CalcPhysics.ratio(p.v.g, +raw.given || 0);
                    if (!r) return Object.assign(none, { cols: 3, warn: true, note: 'A ratio above 0.' });
                    return { rows: physRows([['dB', r.db], ['Power ×', r.power], ['Voltage ×', r.voltage]]).concat(drawnTile(graphDrawing('dB of each ratio', 0, Math.max(2, r.power, r.voltage) * 1.15, {
                        fs: [function (x) { return 10 * Math.log10(x); }, function (x) { return 20 * Math.log10(x); }], y: [Math.min(r.db, 0) - 6, Math.max(r.db, 0) + 6],
                        dots: [[r.power, r.db], [r.voltage, r.db]], names: ['×', 'dB'] }), 'dB of power, red, and of voltage, blue')), cols: 3,
                        note: (r.db > 0 ? tr('A gain: 3 dB is about twice the power, 6 dB twice the voltage, 10 dB ten times the power.') : r.db < 0 ? tr('A loss: 3 dB is about twice the power, 6 dB twice the voltage, 10 dB ten times the power.') : tr('Neither: 3 dB is about twice the power, 6 dB twice the voltage, 10 dB ten times the power.')) };
                }
                none = physNone(['P, W', 'dBm']);
                p = partValues(raw, ['x', 'z']);
                z = raw.z ? p.v.z : 50;
                if (p.bad.length) return Object.assign(none, { cols: 2, bad: p.bad, warn: true, note: 'A value, as 0, -30, 1m or 2.5.' });
                if (!raw.x) return Object.assign(none, { cols: 2 });
                r = CalcPhysics.level(p.v.x, +raw.unit || 0, z);
                if (!r) return Object.assign(none, { cols: 2, warn: true, note: (raw.unit === '2' || raw.unit === '6' ? tr('P or V above 0, and Z above 0.') : tr('Z above 0.')) });
                return { rows: drawnTile(levelDrawing(r.dbm), 'Among signals, in dBm').concat(physRows([['P, W', r.w], ['dBm', r.dbm], ['dBW', r.dbw], ['V RMS', r.v], ['V peak', r.vpeak],
                    ['V peak to peak', r.vpp], ['dBV', r.dbv], ['dBmV', r.dbmv], ['dBµV', r.dbuv], ['I, A', r.i]])), cols: 2,
                    note: tr('Across {z}, V and I as RMS of a sine wave; dBm of a milliwatt, dBµV of a microvolt.', { z: CalcPhysics.si(z, 'Ω') }) };
            }

            function runWire(n, raw) {
                var gauge = raw.size === '1', metal = METALS[+raw.metal || 0], p = partValues(raw, gauge ? ['rho', 'L', 'I'] : ['rho', 'L', 'd', 'I']), v = p.v, rho = raw.metal === '5' ? v.rho : metal[1],
                    d = gauge ? CalcPhysics.awg(raw.d) : v.d, A, R, Rt, rows, none = ['R, Ω', 'A metre, Ω'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 10, 1.5 or 500m.' });
                if (!raw.L && !raw.d) return Object.assign(physNone(none), { cols: 2 });
                if (gauge && raw.d && isNaN(d)) return Object.assign(physNone(none), { cols: 2, bad: ['d'], warn: true, note: 'A gauge from 40 to 0, then 00 or 2/0 to 0000 or 4/0.' });
                if (!(rho > 0 && v.L > 0 && d > 0 && (!raw.T || n.T > -273.15))) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'ρ, L and d above 0, and T above –273.15 °C.' });
                A = Math.PI * d * d / 4e6;
                R = rho * v.L / A;
                Rt = raw.T ? R * (1 + metal[2] * (n.T - 20)) : R;
                rows = physRows([['R, Ω', R], ['A metre, Ω', rho / A], ['A, mm²', A * 1e6]].concat(gauge ? [['d, mm', d]] : []));
                if (!gauge && CalcPhysics.awgOf(d)) rows.push({ l: 'AWG, nearest', text: CalcPhysics.awgOf(d) });
                if (raw.T) rows = rows.concat(physRows([['R at T, Ω', Rt]]));
                if (raw.I && isFinite(v.I)) rows = rows.concat(physRows([['Drop, V', v.I * Rt], ['Heat, W', v.I * v.I * Rt], ['Heat a metre, W', v.I * v.I * Rt / v.L]]));
                return { rows: rows, cols: 2, note: (raw.metal === '5' ? (raw.T ? 'At T as at 20 °C: its change with temperature not known. ' : '') :
                    metal[0] + ', ρ ' + local(metal[1].toExponential()) + ' Ω·m. ') + 'A cable there and back, twice its length.' };
            }

            // the power a resistor is made for, twice what it takes or more: ⅛ W to 5 W
            function wattage(p) {
                var r = [[0.125, '⅛ W'], [0.25, '¼ W'], [0.5, '½ W'], [1, '1 W'], [2, '2 W'], [5, '5 W']].filter(function (w) { return w[0] >= 2 * p; })[0];
                return r ? r[1] : 'above 5 W';
            }

            function runLed(n, raw) {
                var p = partValues(raw, ['V', 'Vf', 'I']), v = p.v, I = raw.I ? v.I : 0.02, drop, R, buy, got, none = ['R, Ω', 'Buy, E12, Ω'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 5, 3.2 or 20m.' });
                if (!raw.V && !raw.Vf) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.V > 0 && v.Vf > 0 && I > 0 && n.n >= 1 && n.n % 1 === 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Vs, Vf and I above 0, and a whole number of LEDs.' });
                drop = v.V - n.n * v.Vf;
                if (!(drop > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: tr('Vs must be above the LEDs\' {n} V.', { n: local(String(CalcMaths.round(n.n * v.Vf))) }) });
                R = drop / I;
                buy = CalcPhysics.standard(R, 12, 1);
                got = drop / buy;
                return { rows: drawnTile(stackDrawing('V supplied, shared by the LEDs and the resistor', [[(n.n > 1 ? n.n + ' LEDs ' : 'LED ') + shortNum(n.n * v.Vf) + ' V', n.n * v.Vf, '#f0b3b3'],
                    ['R ' + shortNum(drop) + ' V', drop, '#e3cf9c']]), 'Vs shared').concat(physRows([['R, Ω', R], ['Buy, E12, Ω', buy], ['I with it, A', got], ['P in R, W', drop * got], ['P of each LED, W', v.Vf * got]])), cols: 2,
                    note: tr('{buy} gives {got}; a resistor of {drop} is enough.', { buy: CalcPhysics.si(buy, 'Ω'), got: CalcPhysics.si(got, 'A'), drop: wattage(drop * got) }) };
            }

            function runCapacitor(n, raw) {
                var p = partValues(raw, ['C', 'V', 'Q', 'E']), v = p.v, known = ['C', 'V', 'Q', 'E'].filter(function (k) { return raw[k] && isFinite(v[k]); }), C = v.C, V = v.V, Q = v.Q, E = v.E,
                    none = ['C, F', 'V', 'Q, C', 'E, J'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 100µ, 12 or 4.7n.' });
                if (known.length < 2) return Object.assign(physNone(none), { cols: 2 });
                if (known.length > 2) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Two of the four only: leave two empty.' });
                switch (known.join('')) {
                    case 'CV': Q = C * V; E = C * V * V / 2; break;
                    case 'CQ': V = Q / C; E = Q * Q / (2 * C); break;
                    case 'CE': V = Math.sqrt(2 * E / C); Q = C * V; break;
                    case 'VQ': C = Q / V; E = Q * V / 2; break;
                    case 'VE': C = 2 * E / (V * V); Q = 2 * E / V; break;
                    case 'QE': V = 2 * E / Q; C = Q * Q / (2 * E); break;
                }
                if (![C, V, Q, E].every(isFinite) || !(C > 0) || E < 0) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'C above 0 and E 0 or more, of the same sign as V and Q: no answer.' });
                return { rows: physRows([['C, F', C], ['V', V], ['Q, C', Q], ['E, J', E]]), cols: 2,
                    note: CalcPhysics.si(C, 'F') + ', ' + CalcPhysics.si(V, 'V') + ', ' + CalcPhysics.si(Q, 'C') + ', ' + CalcPhysics.si(E, 'J') + '.' };
            }

            function runPlates(n, raw) {
                var C = EPSILON0 * n.er * n.A / n.d, none = ['C, F'];
                if (!raw.A && !raw.d) return physNone(none);
                if (!(n.A > 0 && n.d > 0 && n.er >= 1)) return Object.assign(physNone(none), { warn: true, note: 'A and d above 0, and εr 1 or more.' });
                return { rows: physRows([['C, F', C]].concat(raw.V && isFinite(n.V) ? [['Q, C', C * n.V], ['Field, V/m', n.V / n.d], ['E, J', C * n.V * n.V / 2]] : [])), cols: 2,
                    note: 'C = ' + CalcPhysics.si(C, 'F') + (raw.V ? '.' : '; with a voltage, the field and the charge too.') };
            }

            function runAc(n, raw) {
                var of = +raw.kind || 0, p = partValues(raw, ['Np', 'Ns', 'Vp', 'Is', 'x', 'L', 'C']), v = p.v, peak, f, ratio, none;
                none = [['V<sub>s</sub>', 'I<sub>p</sub>, A'], ['Peak', 'RMS'], ['f, Hz', 'ω, rad/s']][of];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 230, 1m or 4.7µ.' });
                if (of === 1) {
                    if (!raw.x) return Object.assign(physNone(none), { cols: 2 });
                    if (!(v.x > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'It is above 0.' });
                    peak = [v.x, v.x * Math.SQRT2, v.x / 2][+raw.given || 0];
                    return { rows: physRows([['Peak', peak], ['RMS', peak / Math.SQRT2], ['Peak to peak', 2 * peak], ['Average, rectified', 2 * peak / Math.PI]]).concat(drawnTile(graphDrawing('A cycle, the RMS the line, the rectified average dashed', 0, 1, {
                        fs: [function (t) { return peak * Math.sin(2 * Math.PI * t); }, function () { return peak / Math.SQRT2; }, function () { return 2 * peak / Math.PI; }],
                        dots: [[0.25, peak]], names: ['t', 'V'] }), 'A cycle')), cols: 2,
                        note: 'Of a sine wave: mains of 230 V RMS peaks at 325 V.' };
                }
                if (of === 2) {
                    if (!raw.L && !raw.C) return Object.assign(physNone(none), { cols: 2 });
                    if (!(v.L > 0 && v.C > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'L and C are above 0.' });
                    f = 1 / (2 * Math.PI * Math.sqrt(v.L * v.C));
                    return { rows: physRows([['f, Hz', f], ['ω, rad/s', 2 * Math.PI * f], ['T, s', 1 / f], ['X<sub>L</sub> = X<sub>C</sub>, Ω', Math.sqrt(v.L / v.C)]]).concat(drawnTile(graphDrawing('XL rising, XC falling, meeting at f₀', 0, 3 * f, {
                        fs: [function (x) { return 2 * Math.PI * x * v.L; }, function (x) { return 1 / (2 * Math.PI * x * v.C); }], y: [0, 3 * Math.sqrt(v.L / v.C)],
                        marks: [[f, 'f₀']], dots: [[f, Math.sqrt(v.L / v.C)]], names: ['f', 'X, Ω'] }), 'X<sub>L</sub> and X<sub>C</sub>')), cols: 2,
                        note: tr('It rings at {f}.', { f: CalcPhysics.si(f, 'Hz') }) };
                }
                if (!raw.Np && !raw.Ns && !raw.Vp) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.Np > 0 && v.Ns > 0 && isFinite(v.Vp))) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Np and Ns above 0, and Vp.' });
                ratio = v.Ns / v.Np;
                return { rows: physRows([['V<sub>s</sub>', v.Vp * ratio], ['N<sub>p</sub> ÷ N<sub>s</sub>', v.Np / v.Ns]].concat(raw.Is && isFinite(v.Is) ? [['I<sub>p</sub>, A', v.Is * ratio], ['P, W', v.Vp * ratio * v.Is]] : [])),
                    cols: 2, note: (ratio > 1 ? tr('Step up; ideal, no power lost.') : ratio < 1 ? tr('Step down; ideal, no power lost.') : tr('One to one; ideal, no power lost.')) };
            }

            function runThreePhase(n, raw) {
                var p = partValues(raw, ['V', 'I']), v = p.v, star = raw.kind !== '1', S, P, Q, vph, iph, peak, rows, none = ['P, W', 'S, VA'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 400, 16 or 1.5k.' });
                if (!raw.V && !raw.I) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.V > 0 && v.I >= 0 && n.pf >= 0 && n.pf <= 1 && n.f > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'VL above 0, IL 0 or more, cos φ from 0 to 1 and f above 0.' });
                S = Math.sqrt(3) * v.V * v.I;
                P = S * n.pf;
                Q = S * Math.sqrt(1 - n.pf * n.pf);
                vph = star ? v.V / Math.sqrt(3) : v.V;
                iph = star ? v.I : v.I / Math.sqrt(3);
                peak = vph * Math.SQRT2;
                rows = physRows([['P, W', P], ['S, VA', S], ['Q, var', Q], ['P, kW', P / 1e3], ['V of a phase', vph], ['I of a phase, A', iph]].concat(v.I > 0 ? [['Z of a phase, Ω', vph / iph]] : []));
                rows.push({ l: 'φ', v: fromRadians(Math.acos(n.pf)) });
                return { rows: rows.concat(drawnTile(graphDrawing('The three phases, a third of a turn apart', 0, 2000 / n.f, { fs: [0, 1, 2].map(function (k) {
                    return function (t) { return peak * Math.sin(2 * Math.PI * (n.f * t / 1000 - k / 3)); };
                }), names: ['t, ms', 'V'] }), (star ? tr('Each phase\'s voltage, to the neutral') : tr('Each phase\'s voltage, between lines')))), cols: 2,
                    note: tr('Balanced, the phases alike: in star each has the line voltage ÷ √3 and the line current, in delta the line voltage and the line current ÷ √3. φ in {unitWord}.', { unitWord: unitWord() }) };
            }

            function runRlc(n, raw) {
                var parallel = raw.kind === '1', p = partValues(raw, ['R', 'L', 'C', 'f', 'V']), v = p.v, R = raw.R ? v.R : 0, L = raw.L ? v.L : 0, C = raw.C ? v.C : 0,
                    f = raw.f ? v.f : L > 0 && C > 0 ? 1 / (2 * Math.PI * Math.sqrt(L * C)) : NaN, z, rows, I, x1, top, note, none = ['Z, Ω', 'Phase'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 100, 10m or 1µ.' });
                if (!raw.R && !raw.L && !raw.C) return Object.assign(physNone(none), { cols: 2 });
                if (!raw.f && !(L > 0 && C > 0)) return Object.assign(physNone(none), { cols: 2, note: 'With f, the impedance there.' });
                z = CalcPhysics.impedance(parallel, R, L, C, f);
                if (!z) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'f above 0, and R, L and C of 0 or more, one of them above 0.' });
                rows = (L > 0 ? [['X<sub>L</sub>, Ω', z.xl]] : []).concat(C > 0 ? [['X<sub>C</sub>, Ω', z.xc]] : [], [['Z, Ω', z.z], ['Phase', fromRadians(z.phase)], ['Power factor', Math.cos(z.phase)]]);
                if (isFinite(z.f0)) rows.push(['f<sub>0</sub>, Hz', z.f0]);
                if (isFinite(z.q)) rows.push(['Q', z.q], ['Bandwidth, Hz', z.bw]);
                if (raw.V && isFinite(v.V)) {
                    I = v.V / z.z;
                    rows.push(['I, A', I], ['P, W', v.V * I * Math.cos(z.phase)]);
                    if (parallel) rows = rows.concat(R > 0 ? [['I<sub>R</sub>, A', v.V / R]] : [], L > 0 ? [['I<sub>L</sub>, A', v.V / z.xl]] : [], C > 0 ? [['I<sub>C</sub>, A', v.V / z.xc]] : []);
                    else rows = rows.concat(R > 0 ? [['V<sub>R</sub>', I * R]] : [], L > 0 ? [['V<sub>L</sub>', I * z.xl]] : [], C > 0 ? [['V<sub>C</sub>', I * z.xc]] : []);
                }
                note = !isFinite(z.z) ? 'At resonance an ideal LC in parallel takes no current: its Z has no end.' : !z.z ? 'At resonance an ideal LC in series is a short: its Z is 0.' :
                    z.phase > 1e-9 ? 'Inductive: the current lags the voltage.' : z.phase < -1e-9 ? 'Capacitive: the current leads the voltage.' :
                        tr('In phase, as a resistor alone{v}', { v: (isFinite(z.f0) ? tr(': at resonance.') : '.') });
                // |Z| from 0 to past f and f₀, as high as the parts' own impedances go twice over
                x1 = 2.5 * Math.max(f, isFinite(z.f0) ? z.f0 : 0);
                top = 2.2 * Math.max(isFinite(z.z) ? z.z : 0, R, L > 0 && C > 0 ? Math.sqrt(L / C) : 0);
                return { rows: physRows(rows).concat(drawnTile(graphDrawing('Its impedance at each frequency', 0, x1, {
                    fs: [function (x) { var r = CalcPhysics.impedance(parallel, R, L, C, x); return r ? r.z : NaN; }], y: [0, top],
                    marks: [[f, raw.f ? 'f' : 'f₀']].concat(raw.f && isFinite(z.f0) && Math.abs(z.f0 - f) > 0.06 * x1 ? [[z.f0, 'f₀']] : []),
                    dots: isFinite(z.z) ? [[f, z.z]] : [], names: ['f', '|Z|'] }), '|Z| against f')), cols: 2,
                    note: tr('{v} V and I as RMS; angles in {unitWord}.', { v: (raw.f ? '' : tr('At f₀. ')) + note, unitWord: unitWord() }) };
            }

            function runCost(n, raw) {
                var p = partValues(raw, ['P']), kwh = p.v.P * n.h / 1000, none = ['kWh a day', 'A year'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 60, 2k or 1.5k.' });
                if (!raw.P) return Object.assign(physNone(none), { cols: 2 });
                if (!(p.v.P > 0 && n.h >= 0 && n.h <= 24 && (!raw.price || n.price >= 0))) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'P above 0, from 0 to 24 hours a day, and a price of 0 or more.' });
                return { rows: physRows([['kWh a day', kwh], ['kWh a year', kwh * 365.25]].concat(raw.price ? [['A day', kwh * n.price], ['A month', kwh * n.price * 30.4375], ['A year', kwh * n.price * 365.25]] : [])),
                    cols: 2, note: raw.price ? 'In the money of the price; a month of 30.44 days.' : 'With a price for each kWh, the cost too.' };
            }

            function runBattery(n, raw) {
                var p = partValues(raw, ['I', 'V', 'Ic']), v = p.v, h, rows, none = ['Hours', 'Days'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 100m, 3.7 or 1.5.' });
                if (!raw.C && !raw.I) return Object.assign(physNone(none), { cols: 2 });
                if (!(n.C > 0 && v.I > 0 && (!raw.V || v.V > 0) && (!raw.Ic || v.Ic > 0))) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'The capacity, the current and the rest typed above 0.' });
                h = n.C / 1000 / v.I;
                rows = [['Hours', h], ['Days', h / 24], ['Charge, C', n.C * 3.6]];
                if (raw.V) rows.push(['Energy, Wh', n.C * v.V / 1000], ['Energy, J', n.C * v.V * 3.6], ['Power, W', v.V * v.I]);
                if (raw.Ic) rows.push(['To charge, h', n.C / 1000 / v.Ic * 1.2]);
                return { rows: physRows(rows).concat(drawnTile(graphDrawing('The hours it lasts at each current', 0, 3 * v.I, { fs: [function (x) { return n.C / 1000 / x; }], y: [0, 4 * h],
                    dots: [[v.I, h]], names: ['I, A', 'h'] }), 'Hours and current')), cols: 2, note: 'At a steady current, new; cold, old or drawn fast, it lasts less.' };
            }

            function runDiode(n, raw) {
                var cur = raw.by === '1', p = partValues(raw, ['x', 'Is']), v = p.v, is = raw.Is ? v.Is : 1e-14, d, nvt, x1, none = [cur ? 'V' : 'I, A', 'r<sub>d</sub>, Ω'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 0.65, 10m or 2.5n.' });
                if (!raw.x) return Object.assign(physNone(none), { cols: 2 });
                d = CalcPhysics.diode(cur ? NaN : v.x, cur ? v.x : NaN, is, n.n, n.T);
                if (!d) return Object.assign(physNone(none), { cols: 2, warn: true, note: (cur ? tr('IS and n above 0, T above –273.15 °C, and I above –IS.') : tr('IS and n above 0, T above –273.15 °C, and V not so high its current has no end.')) });
                nvt = n.n * d.vt;
                x1 = d.v * 1.15;
                return { rows: physRows([[cur ? 'V' : 'I, A', cur ? d.v : d.i], ['r<sub>d</sub>, Ω', d.rd], ['P, W', d.v * d.i], ['V<sub>T</sub>, V', d.vt], ['Each ×10 of I, V', nvt * Math.LN10]])
                    .concat(d.v > 0 ? drawnTile(curveDrawing('Its current at each voltage', x1, 0, is * Math.expm1(x1 / nvt), function (x) { return is * Math.expm1(x / nvt); },
                        { at: d.v, names: ['V', 'I'] }), 'I against V') : []), cols: 2,
                    note: d.v < 0 ? 'Reversed: only IS leaks back, till it breaks down.' : CalcPhysics.si(d.i, 'A') + ' at ' + CalcPhysics.si(d.v, 'V') + (raw.Is ? '.' : ', IS 1e-14 A.') };
            }

            // a rectifier's output over two cycles of the mains, smoothed by c into a load of i, red, over what comes through its diodes, blue
            function rectifierDrawing(vrms, f, vd, half, c, i, peak) {
                var top = vrms * Math.SQRT2, drop = half ? vd : 2 * vd, N = 480, dt = 2 / f / N, out = peak, pts = [], k, now;
                function through(t) {
                    var s = Math.sin(2 * Math.PI * f * t);
                    return Math.max(0, (half ? s : Math.abs(s)) * top - drop);
                }
                for (k = -N; k <= N; k++) { // two cycles to settle, then the two drawn
                    now = through(k * dt);
                    out = c > 0 ? Math.max(now, out - i / c * dt) : now;
                    if (k >= 0) pts.push(out);
                }
                return graphDrawing('What comes out, over two cycles', 0, 2 / f, { fs: [function (t) { return pts[Math.max(0, Math.min(N, Math.round(t / dt)))]; }].concat(c > 0 ? [through] : []),
                    names: ['t', 'V'] });
            }

            function runRectifier(n, raw) {
                var half = raw.kind === '1', p = partValues(raw, ['V', 'C', 'I']), v = p.v, i = raw.I ? v.I : 0, r, rows, note, none = ['Peak, V', 'Average, V'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 12, 2200µ or 500m.' });
                if (!raw.V) return Object.assign(physNone(none), { cols: 2 });
                r = CalcPhysics.rectifier(v.V, n.f, raw.C ? v.C : NaN, i, n.vd, half);
                if (!r) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Vrms, f and C above 0, I and VD of 0 or more, and Vrms above the diodes\' drop.' });
                rows = [['Peak, V', r.peak]].concat(raw.C ? [['Ripple, V p-p', r.ripple], ['Least, V', r.least], ['Average, V', r.dc]].concat(r.big ? [] : [['Ripple, %', 100 * r.ripple / r.dc]]) : [['Average, V', r.dc]],
                    [['Each diode stands, V', r.piv], ['Ripple f, Hz', r.fr]], i > 0 ? [['C for 10% ripple, F', i / (r.fr * 0.1 * r.peak)]] : []);
                note = !raw.C ? 'Not smoothed: with C, its ripple.' : r.big ? 'C is too small for this current: the ripple is past half the peak, and only rough.' :
                    !(i > 0) ? 'With no load, C stays at the peak; with I, its ripple.' : 'The ripple a little less than this: C falls a whole cycle in it.';
                return { rows: physRows(rows).concat(drawnTile(rectifierDrawing(v.V, n.f, n.vd, half, raw.C ? v.C : 0, i, r.peak), 'Out, over two cycles')), cols: 2, warn: r.big, note: note };
            }

            function runBjt(n, raw) {
                var p = partValues(raw, ['I', 'V']), v = p.v, least, ib, R, buy, got, none = ['R<sub>B</sub>, Ω', 'Buy, E12, Ω'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 100m, 5 or 3.3.' });
                if (!raw.I && !raw.V) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.I > 0 && n.beta > 0 && n.vbe >= 0 && n.vce >= 0 && v.V > n.vbe)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'IC and β above 0, and Vin above VBE.' });
                least = v.I / n.beta;
                ib = 5 * least;
                R = (v.V - n.vbe) / ib;
                buy = CalcPhysics.standard(R, 12, -1);
                got = (v.V - n.vbe) / buy;
                return { rows: physRows([['I<sub>B</sub> least, A', least], ['I<sub>B</sub>, A', ib], ['R<sub>B</sub>, Ω', R], ['Buy, E12, Ω', buy], ['I<sub>B</sub> with it, A', got], ['P in it, W', v.I * n.vce + got * n.vbe]]),
                    cols: 2, note: got > 0.02 ? 'More than most pins give, some 20 mA: a MOSFET, or a Darlington, instead.' : tr('{buy} to the base; the pin gives {got}.', { buy: CalcPhysics.si(buy, 'Ω'), got: CalcPhysics.si(got, 'A') }) };
            }

            function runBias(n, raw) {
                var p = partValues(raw, ['V', 'R1', 'R2', 'Rc', 'Re']), v = p.v, r, rows, top, none = ['V<sub>CE</sub>', 'I<sub>C</sub>, A'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 3, bad: p.bad, warn: true, note: 'A value, as 12, 47k or 2.2k.' });
                if (!raw.V && !raw.R1 && !raw.R2) return Object.assign(physNone(none), { cols: 3 });
                r = CalcPhysics.bias(v.V, v.R1, v.R2, raw.Rc ? v.Rc : 0, raw.Re ? v.Re : 0, n.beta);
                if (!r) return Object.assign(physNone(none), { cols: 3, warn: true, note: 'VCC, R1, R2 and β above 0; RC and RE 0 or more.' });
                rows = physRows([['V<sub>B</sub>', r.vb], ['V<sub>E</sub>', r.ve], ['V<sub>C</sub>', r.vc], ['V<sub>CE</sub>', r.vce], ['I<sub>B</sub>, A', r.ib], ['I<sub>C</sub>, A', r.ic]]);
                if (r.region === 'active' && raw.Re && v.Re > 0 && raw.Rc) rows = rows.concat(physRows([['Gain, about', -v.Rc / v.Re]]));
                rows.push({ l: 'It is', wide: true, text: { active: 'Active: it amplifies', saturated: 'Saturated: switched on fully', off: 'Off: V<sub>B</sub> below 0.7 V' }[r.region] });
                top = v.V / ((raw.Rc ? v.Rc : 0) + (raw.Re ? v.Re : 0)); // the most Ic, the transistor a short: none without Rc or Re
                if (isFinite(top)) {
                    rows = drawnTile(graphDrawing('Its load line, the operating point on it', 0, v.V, { fs: [function (x) { return (v.V - x) * top / v.V; }], y: [0, 1.15 * top],
                        marks: r.region === 'active' ? [[v.V / 2, '½VCC']] : [], dots: [[r.vce, r.ic]], names: ['VCE', 'IC'] }), 'The load line').concat(rows);
                }
                return { rows: rows, cols: 3, note: r.region === 'active' ? tr('For the widest swing, VCE near half of VCC, {v}.', { v: CalcPhysics.si(v.V / 2, 'V') }) : '' };
            }

            function runMosfet(n, raw) {
                var p = partValues(raw, ['I', 'R', 'Vg', 'Vth']), v = p.v, P = v.I * v.I * v.R, rows, none = ['P, W', 'Drop, V'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 5, 20m or 4.5.' });
                if (!raw.I && !raw.R) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.I > 0 && v.R > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'I and RDS(on) above 0.' });
                rows = physRows([['P, W', P], ['Drop, V', v.I * v.R]].concat(raw.th && n.th > 0 ? [['Hotter than the air, °C', P * n.th]] : []));
                if (raw.Vg && raw.Vth && isFinite(v.Vg) && v.Vth > 0) {
                    rows.push({ l: 'The gate', wide: true, text: v.Vg <= v.Vth ? 'Off: V<sub>GS</sub> is not above V<sub>th</sub>' : v.Vg < 2.5 * v.Vth ? 'Partly on: R<sub>DS</sub> is far above its rating' : 'On fully' });
                }
                rows = drawnTile(graphDrawing('The heat in it at each current', 0, 2 * v.I, { fs: [function (x) { return x * x * v.R; }], dots: [[v.I, P]], names: ['I, A', 'P, W'] }), 'Heat and current').concat(rows);
                return { rows: rows, cols: 2, note: 'RDS(on) as its datasheet gives it at your VGS: most at 10 V, logic-level ones at 4.5 V or less.' };
            }

            function runZener(n, raw) {
                var p = partValues(raw, ['V', 'Vmax', 'Vz', 'IL', 'Iz']), v = p.v, IL = raw.IL ? v.IL : 0, Iz = raw.Iz ? v.Iz : 0.005, hi = raw.Vmax ? v.Vmax : v.V, R, buy, Pz, most, none = ['R, Ω', 'Buy, E12, Ω'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 12, 5.1 or 20m.' });
                if (!raw.V && !raw.Vz) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.Vz > 0 && v.V > v.Vz && hi >= v.V && IL >= 0 && Iz > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Vin above VZ, the highest not below Vin, IL 0 or more and IZ above 0.' });
                R = (v.V - v.Vz) / (IL + Iz);
                buy = CalcPhysics.standard(R, 12, -1);
                Pz = v.Vz * (hi - v.Vz) / buy;
                most = (v.V - v.Vz) / buy; // the most current a load takes before the Zener lets go, at the lowest Vin
                return { rows: drawnTile(graphDrawing('V out against the load current' + (hi > v.V ? ', at the highest Vin thin' : ''), 0, Math.max(1.6 * most, 1.2 * IL), {
                    fs: [function (x) { return Math.min(v.Vz, v.V - x * buy); }].concat(hi > v.V ? [function (x) { return Math.min(v.Vz, hi - x * buy); }] : []), y: [0, 1.25 * v.Vz],
                    marks: [[most, 'most']], dots: [[IL, Math.min(v.Vz, v.V - IL * buy)]], names: ['IL, A', 'V out'] }), 'It holds till').concat(physRows([['R, Ω', R], ['Buy, E12, Ω', buy], ['P in the Zener, W', Pz], ['P in R, W', (hi - v.Vz) * (hi - v.Vz) / buy], ['I<sub>Z</sub> at the lowest, A', (v.V - v.Vz) / buy - IL]])),
                    cols: 2, note: (Pz * 2 <= 0.5 ? tr('The worst: at {hi} with no load. A Zener of ½ W is enough.', { hi: CalcPhysics.si(hi, 'V') }) : Pz * 2 <= 1.3 ? tr('The worst: at {hi} with no load. A Zener of 1.3 W is enough.', { hi: CalcPhysics.si(hi, 'V') }) : Pz * 2 <= 5 ? tr('The worst: at {hi} with no load. A Zener of 5 W is enough.', { hi: CalcPhysics.si(hi, 'V') }) : tr('The worst: at {hi} with no load. A Zener of more than 5 W is enough.', { hi: CalcPhysics.si(hi, 'V') })) };
            }

            function runLm317(n, raw) {
                var of = +raw.kind || 0, p = partValues(raw, ['V', 'R1', 'R2', 'I', 'Vin', 'IL']), v = p.v, r1 = raw.R1 ? v.R1 : 240, vin = raw.Vin ? v.Vin : NaN, IL = raw.IL ? v.IL : NaN,
                    rows, out, R, buy, got, heat, notes = [], none = of === 2 ? ['R, Ω', 'Buy, E12, Ω'] : of === 1 ? ['V<sub>out</sub>'] : ['R<sub>2</sub>, Ω', 'R<sub>2</sub> of E12, Ω'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 5, 240 or 500m.' });
                if (of === 2) { // a steady current: 1.25 V across R, the current through it and the load
                    if (!raw.I) return Object.assign(physNone(none), { cols: 2 });
                    if (!(v.I > 0 && v.I <= 1.5) || raw.Vin && !(vin > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'I above 0, up to 1.5 A, and Vin above 0.' });
                    R = 1.25 / v.I;
                    buy = CalcPhysics.standard(R, 12, 1);
                    got = 1.25 / buy;
                    rows = physRows([['R, Ω', R], ['Buy, E12, Ω', buy], ['I with it, A', got], ['P in R, W', 1.25 * got]].concat(raw.Vin ? [['Load up to, V', vin - 4.25]] : []));
                    return { rows: rows, cols: 2, warn: raw.Vin && vin <= 4.25,
                        note: raw.Vin && vin <= 4.25 ? 'Vin too low: 1.25 V across R and some 3 V across the LM317 leave nothing for the load.' : tr('{v}R from OUT to ADJ, the load from ADJ on{v2}', { v: (v.I < 0.01 ? tr('Below some 10 mA it may not hold steady. ') : ''), v2: (raw.Vin ? tr('; the load may drop up to {vin}.', { vin: CalcPhysics.si(vin - 4.25, 'V') }) : '.') }) };
                }
                if (of === 1) {
                    if (!raw.R2) return Object.assign(physNone(none), { cols: 2 });
                    if (!(r1 > 0 && v.R2 >= 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'R1 above 0, and R2 0 or more.' });
                    out = CalcPhysics.lm317(r1, v.R2);
                    rows = [['V<sub>out</sub>', out], ['I in R<sub>1</sub>, A', 1.25 / r1]];
                } else {
                    if (!raw.V) return Object.assign(physNone(none), { cols: 2 });
                    if (!(r1 > 0 && v.V >= 1.25 && v.V <= 37)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Vout from 1.25 V to 37 V, and R1 above 0.' });
                    out = v.V;
                    R = CalcPhysics.lm317R2(out, r1);
                    rows = [['R<sub>2</sub>, Ω', R]];
                    [12, 24].forEach(function (s) {
                        var b = CalcPhysics.standard(R, s, 0);
                        rows.push(['R<sub>2</sub> of E' + s + ', Ω', R ? b : 0], ['V<sub>out</sub> with it', R ? CalcPhysics.lm317(r1, b) : 1.25]);
                    });
                }
                if (raw.Vin && isFinite(vin)) {
                    rows.push(['V<sub>in</sub> – V<sub>out</sub>', vin - out]);
                    if (vin - out < 3) notes.push('Vin less than 3 V above Vout: it may not hold Vout.');
                    if (isFinite(IL) && IL >= 0) {
                        heat = (vin - out) * IL;
                        rows.push(['Heat in it, W', Math.max(0, heat)]);
                        notes.push(heat > 15 ? 'More heat than it can shed: some 15 W even on a big heatsink.' : heat > 1.5 ? 'It needs a heatsink: past some 1.5 W, a TO-220 alone gets too hot.' : 'No heatsink needed, below some 1.5 W.');
                    }
                }
                if (IL > 1.5) notes.push('More than the 1.5 A it gives.');
                return { rows: physRows(rows), cols: 2, warn: vin - out < 3 || IL > 1.5 || heat > 15,
                    note: notes.join(' ') || 'R1 from OUT to ADJ, R2 from ADJ to 0 V; with Vin and the load, the heat in it.' };
            }

            function runOpamp(n, raw) {
                var p = partValues(raw, ['Rf', 'Rin', 'V', 'Vs']), v = p.v, inv = raw.kind === '1', G, out, rows, none = ['Gain', 'Gain, dB'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A value, as 100k, 10k or 0.5.' });
                if (!raw.Rf && !raw.Rin) return Object.assign(physNone(none), { cols: 2 });
                if (!(v.Rf >= 0 && v.Rin > 0)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Rin above 0, and Rf 0 or more.' });
                G = inv ? -v.Rf / v.Rin : 1 + v.Rf / v.Rin;
                rows = [['Gain', G], ['Gain, dB', 20 * Math.log10(Math.abs(G))]];
                if (inv) rows.push(['Input resistance, Ω', v.Rin]);
                if (raw.V && isFinite(v.V)) {
                    out = G * v.V;
                    if (raw.Vs && v.Vs > 0) out = Math.max(-v.Vs, Math.min(v.Vs, out));
                    rows.push(['V<sub>out</sub>', out]);
                }
                rows = physRows(rows);
                if (G) {
                    rows.push({ l: 'In, and out', wide: true, text: graphDrawing('A wave in, and out', 0, 2, { fs: [function (t) {
                        var y = G * (isFinite(v.V) ? v.V : 1) * Math.sin(2 * Math.PI * t);
                        return v.Vs > 0 ? Math.max(-v.Vs, Math.min(v.Vs, y)) : y;
                    }, function (t) { return (isFinite(v.V) ? v.V : 1) * Math.sin(2 * Math.PI * t); }] }) });
                }
                return { rows: rows, cols: 2, note: out !== undefined && out !== G * v.V ? 'Clipped: it cannot go past the supply, nor in most op-amps quite reach it.' : inv ? 'Inverted: the output the other way.' : '' };
            }

            function runTimer(n, raw) {
                var mono = raw.kind === '1', p = partValues(raw, ['R1', 'R2', 'C']), v = p.v, hi, lo, none = mono ? ['t, s'] : ['f, Hz', 'Duty, %'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 3, bad: p.bad, warn: true, note: 'A value, as 10k, 100n or 10µ.' });
                if (!raw.R1 && !raw.C) return Object.assign(physNone(none), { cols: 3 });
                if (mono) {
                    if (!(v.R1 > 0 && v.C > 0)) return Object.assign(physNone(none), { cols: 3, warn: true, note: 'R and C are above 0.' });
                    hi = Math.log(3) * v.R1 * v.C;
                    return { rows: physRows([['t, s', hi]]).concat([{ l: 'Its output', wide: true, text: squareDrawing([[0, 0], [0.3, 0], [0.3, 1], [1.3, 1], [1.3, 0], [1.6, 0]], 1.6) }]), cols: 3,
                        note: 'A pulse of ' + CalcPhysics.si(hi, 's') + ', 1.1RC.' };
                }
                if (!(v.R1 > 0 && v.R2 > 0 && v.C > 0)) return Object.assign(physNone(none), { cols: 3, warn: true, note: 'R1, R2 and C are above 0.' });
                hi = Math.LN2 * (v.R1 + v.R2) * v.C;
                lo = Math.LN2 * v.R2 * v.C;
                return { rows: physRows([['f, Hz', 1 / (hi + lo)], ['Duty, %', 100 * hi / (hi + lo)], ['T, s', hi + lo], ['High, s', hi], ['Low, s', lo]])
                    .concat([{ l: 'Its output', wide: true, text: squareDrawing([0, 1, 2].reduce(function (pts, k) {
                        var a = k * (hi + lo);
                        return pts.concat([[a, 0], [a, 1], [a + hi, 1], [a + hi, 0]]);
                    }, []).concat([[3 * (hi + lo), 0]]), 3 * (hi + lo)) }]), cols: 3,
                    note: 'Above 50% always: with a diode across R₂, it can go below.' };
            }

            // a wave of highs and lows, of its corners
            function squareDrawing(pts, x1) {
                return curveDrawing('Its output over time', x1, -0.12, 1.2, null, { pts: pts, names: ['t', ''] });
            }

            function runWave(n, raw) {
                var known = ['v', 'f', 'w'].filter(function (k) { return raw[k] && isFinite(n[k]); }), v = n.v, f = n.f, w = n.w, none = ['v, m/s', 'f, Hz', 'λ, m'];
                if (known.length < 2) return physNone(none);
                if (known.length > 2) return Object.assign(physNone(none), { warn: true, note: 'Two of the three only: leave one empty.' });
                if (!raw.v) v = f * w;
                else if (!raw.f) f = v / w;
                else w = v / f;
                if (![v, f, w].every(function (x) { return x > 0 && isFinite(x); })) return Object.assign(physNone(none), { warn: true, note: 'Each is above 0.' });
                return { rows: physRows([['v, m/s', v], ['f, Hz', f], ['λ, m', w], ['T, s', 1 / f], ['ω, rad/s', 2 * Math.PI * f], ['k, rad/m', 2 * Math.PI / w]])
                    .concat(drawnTile(graphDrawing('The wave along its way', 0, 2 * w, { fs: [function (x) { return Math.sin(2 * Math.PI * x / w); }], y: [-1.35, 1.35], marks: [[w, 'λ'], [2 * w, '2λ']] }), 'Two wavelengths')), cols: 3 };
            }

            // A standing wave of a string, an open pipe or a closed one, its harmonic h: how far it moves along it, at its two
            // extremes, its nodes dots; a pipe's walls, the closed one's end at the left
            function standingDrawing(kind, h) {
                var W = 300, H = 84, a = 20, b = 280, y = 42, A = 24, d1 = '', d2 = '', body = '', i, u, s, nodes = [],
                    shape = function (u) { return kind === 0 ? Math.sin(h * Math.PI * u) : kind === 1 ? Math.cos(h * Math.PI * u) : Math.sin(h * Math.PI * u / 2); };
                for (i = 0; i <= 160; i++) {
                    u = i / 160;
                    s = shape(u);
                    d1 += (i ? 'L' : 'M') + fix(a + (b - a) * u) + ' ' + fix(y - A * s);
                    d2 += (i ? 'L' : 'M') + fix(a + (b - a) * u) + ' ' + fix(y + A * s);
                }
                for (i = 0; i <= 2 * h; i++) { // its zeros: a string's at each 1/h, an open pipe's between, a closed pipe's at each 2/h from its closed end
                    u = kind === 0 ? i / h : kind === 1 ? (i + 0.5) / h : 2 * i / h;
                    if (u <= 1 + 1e-9 && nodes.indexOf(u) < 0) nodes.push(u);
                }
                if (kind) body += '<path class="calc-sv-ground" d="M' + a + ' ' + (y - A - 6) + 'H' + b + 'M' + a + ' ' + (y + A + 6) + 'H' + b + (kind === 2 ? 'M' + a + ' ' + (y - A - 6) + 'V' + (y + A + 6) : '') + '"/>';
                body += '<path class="calc-sv-axis" d="M' + a + ' ' + y + 'H' + b + '"/><path class="calc-sv-curve calc-sv-faint" d="' + d2 + '"/><path class="calc-sv-curve" d="' + d1 + '"/>';
                nodes.forEach(function (u) { body += '<circle class="calc-sv-mid" cx="' + fix(a + (b - a) * u) + '" cy="' + y + '" r="3"/>'; });
                return svgOf('', W, H, 'Its shape', body);
            }

            function runStanding(n, raw) {
                var of = +raw.kind || 0, v = of === 0 ? Math.sqrt(n.T / n.mu) : n.v, r, rows, none = ['f, Hz', 'λ, m'];
                if (!raw.L) return physNone(none);
                r = CalcPhysics.standing(of, n.L, v, n.n);
                if (!r) return Object.assign(physNone(none), { warn: true, note: (of === 0 ? tr('L, T and μ above 0, and n a whole number, 1 or more.') : tr('L and v above 0, and n a whole number, 1 or more.')) });
                rows = physRows([['f, Hz', r.f], ['λ, m', r.l], ['Harmonic', r.h], ['The first, Hz', CalcPhysics.standing(of, n.L, v, 1).f], ['v, m/s', v], ['Nodes', r.nodes]]);
                rows.push({ l: 'Its shape', wide: true, text: standingDrawing(of, r.h) });
                return { rows: rows, cols: 2, note: (of === 2 ? 'Closed at one end, only the odd harmonics, 1, 3, 5 …' : 'Every harmonic, 1, 2, 3 …') +
                    (of ? '; drawn as the air moves, its nodes still. No end correction.' : '; its nodes still.') };
            }

            function runBeats(n, raw) {
                var fb = Math.abs(n.f1 - n.f2), fm = (n.f1 + n.f2) / 2, x1, cycles, wave = [], i, t, env, none = ['Beats a second', 'Heard, Hz'];
                if (!raw.f1 && !raw.f2) return physNone(none);
                if (!(n.f1 > 0 && n.f2 > 0)) return Object.assign(physNone(none), { warn: true, note: 'Both frequencies above 0.' });
                if (!fb) return { rows: physRows([['Beats a second', 0], ['Heard, Hz', fm]]), cols: 2, note: 'In tune: the same frequency, no beats.' };
                x1 = 2 / fb; // two beats
                cycles = fm * x1;
                env = function (t) { return 2 * Math.abs(Math.cos(Math.PI * fb * t)); };
                for (i = 0; cycles <= 120 && i <= 16 * Math.ceil(cycles); i++) { // 16 points a cycle, where they are few enough to be seen
                    t = x1 * i / (16 * Math.ceil(cycles));
                    wave.push([t, Math.sin(2 * Math.PI * n.f1 * t) + Math.sin(2 * Math.PI * n.f2 * t)]);
                }
                return { rows: physRows([['Beats a second', fb], ['Between beats, s', 1 / fb], ['Heard, Hz', fm], ['Apart, cents', 1200 * Math.log2(Math.max(n.f1, n.f2) / Math.min(n.f1, n.f2))]])
                    .concat(drawnTile(graphDrawing('The two together, loud and soft', 0, x1, { fs: [env, function (t) { return -env(t); }], fill: [env, function (t) { return -env(t); }, 0, x1], paths: wave.length ? [wave] : [],
                        marks: [[1 / fb, '1 beat'], [x1, '2']], names: ['t, s', ''] }), tr('Two beats{v}', { v: (wave.length ? '' : tr(', the wave too fast to draw')) }))), cols: 2,
                    note: fb > 15 ? 'Some 15 or more a second, beats are heard as a rough sound, then as two notes.' : 'Loud where their waves meet in step, soft where they cancel.' };
            }

            function runLens(n, raw) {
                var known = ['f', 'o', 'i'].filter(function (k) { return raw[k] && isFinite(n[k]); }), f = n.f, o = n.o, i = n.i, m, none = ['f', 'dₒ', 'dᵢ'], rows;
                if (known.length < 2) return physNone(none);
                if (known.length > 2) return Object.assign(physNone(none), { warn: true, note: 'Two of the three only: leave one empty.' });
                if (!raw.f) f = 1 / (1 / o + 1 / i);
                else if (!raw.o) o = 1 / (1 / f - 1 / i);
                else i = 1 / (1 / f - 1 / o);
                if (![f, o, i].every(isFinite)) return Object.assign(physNone(none), { warn: true, note: 'At the focal point: the image is at infinity.' });
                m = -i / o;
                rows = physRows([['f', f], ['dₒ', o], ['dᵢ', i], ['Magnification', m]].concat(raw.h && isFinite(n.h) ? [['Image height', m * n.h]] : []));
                rows.push({ l: 'The image', wide: true, text: (i > 0 ? 'Real' : 'Virtual') + ', ' + (m < 0 ? 'upside down' : 'upright') + ', ' + (Math.abs(m) > 1 ? 'larger' : Math.abs(m) < 1 ? 'smaller' : 'as large') });
                if (o > 0) rows.push({ l: 'Drawn as a lens', wide: true, text: lensDrawing(f, o, i, m) });
                return { rows: rows, cols: 2, note: 'Of a mirror, a real image is on the side of the object.' };
            }

            // A thin lens of focal length f, an object o before it and its image i after: a ray from the object's top along the axis,
            // bent through the focus, and one through the middle, straight; a virtual image where they seem to come from, dashed
            function lensDrawing(f, o, i, m) {
                var W = 300, H = 120, ax = H / 2, far = 4 * Math.max(o, Math.abs(f)), shown = Math.abs(i) <= far, left = Math.max(o, Math.abs(f), shown && i < 0 ? -i : 0) * 1.2,
                    right = Math.max(Math.abs(f), shown && i > 0 ? i : 0, o * 0.6) * 1.2, k = (W - 16) / (left + right), lx = 8 + left * k,
                    s = (ax - 12) / Math.max(1, shown ? Math.min(Math.abs(m), 4) : 1), body = '',
                    X = function (x) { return lx + x * k; }, Y = function (y) { return ax - y * s; },
                    at = function (p, q) { return p[1] + (q[1] - p[1]) * (right - p[0]) / (q[0] - p[0]); }; // the line through p and q, at the right edge
                body += '<path class="calc-sv-axis" d="M4 ' + ax + 'H' + (W - 4) + '"/>';
                body += f > 0 ? '<ellipse class="calc-sv-fill" cx="' + fix(lx) + '" cy="' + ax + '" rx="5" ry="' + (ax - 6) + '"/>' :
                    '<path class="calc-sv-fill" d="M' + fix(lx - 6) + ' 6Q' + fix(lx - 1) + ' ' + ax + ' ' + fix(lx - 6) + ' ' + (H - 6) + 'H' + fix(lx + 6) + 'Q' + fix(lx + 1) + ' ' + ax + ' ' + fix(lx + 6) + ' 6Z"/>';
                [-1, 1].forEach(function (side) {
                    body += '<circle class="calc-sv-mid" cx="' + fix(X(side * Math.abs(f))) + '" cy="' + ax + '" r="2.5"/>' + svgText(X(side * Math.abs(f)), ax + 13, 'F', 'middle');
                });
                // along the axis, then through the focus, or as from it; through the middle
                body += '<path class="calc-sv-curve calc-sv-thin" d="M' + fix(X(-o)) + ' ' + fix(Y(1)) + 'L' + fix(lx) + ' ' + fix(Y(1)) + 'L' + fix(X(right)) + ' ' + fix(Y(at([f, 0], [0, 1]))) + '"/>' +
                    '<path class="calc-sv-curve calc-sv-thin" d="M' + fix(X(-o)) + ' ' + fix(Y(1)) + 'L' + fix(X(right)) + ' ' + fix(Y(at([-o, 1], [0, 0]))) + '"/>';
                if (shown && i < 0) body += '<path class="calc-sv-guide" d="M' + fix(lx) + ' ' + fix(Y(1)) + 'L' + fix(X(i)) + ' ' + fix(Y(m)) + 'M' + fix(lx) + ' ' + ax + 'L' + fix(X(i)) + ' ' + fix(Y(m)) + '"/>';
                body += svgArrow(X(-o), ax, X(-o), Y(1));
                if (shown) body += svgArrow(X(i), ax, X(i), Y(m), 'calc-sv-seg', i < 0);
                return svgOf('', W, H, 'The rays through the lens', body);
            }

            function runLensmaker(n, raw) {
                var r1 = raw.r1 ? n.r1 : Infinity, r2 = raw.r2 ? n.r2 : Infinity, f, rows, none = ['f, m', 'Power, D'], flat1 = !isFinite(r1), flat2 = !isFinite(r2), shape;
                if (!raw.r1 && !raw.r2) return physNone(none);
                if (!(n.n > 0 && n.nm > 0 && r1 && r2 && !isNaN(r1) && !isNaN(r2))) return Object.assign(physNone(none), { warn: true, note: 'n and nm above 0, and each radius not 0, or empty for a flat face.' });
                f = CalcPhysics.lensmaker(n.n, r1, r2, n.nm);
                shape = flat1 || flat2 ? ((flat1 ? -r2 : r1) > 0 ? 'Plano-convex' : 'Plano-concave') : r1 > 0 && r2 < 0 ? 'Biconvex' : r1 < 0 && r2 > 0 ? 'Biconcave' : 'A meniscus';
                rows = isFinite(f) ? physRows([['f, m', f], ['f, mm', f * 1e3], ['Power, D', 1 / f]]) : [{ l: 'f', wide: true, text: 'None: it neither gathers light nor spreads it' }];
                rows.push({ l: 'It is', wide: true, text: shape + (isFinite(f) ? f > 0 ? ', converging: light meets at f past it' : ', diverging: light spreads, as from f before it' : '') });
                return { rows: rows.concat(drawnTile(lensmakerDrawing(r1, r2, f), 'Its shape, and light through it')), cols: 2,
                    note: (n.n < n.nm ? 'Its index below the medium\'s: it works the other way round. ' : '') + 'A thin lens: its thickness left out. Power in dioptres, 1 ÷ f in metres.' };
            }

            // A lens of faces of radii r1 and r2, Infinity flat, to the scale of its faces, as high as 80: its edge as thin as it may be;
            // three rays across it bent to F, of focal length f, or spread as from it, F only roughly to scale where it is far
            function lensmakerDrawing(r1, r2, f) {
                var cx = 150, cy = 56, a = 0.6 * Math.min(Math.abs(r1), Math.abs(r2)), k, t = 0, faces = [], left = [], right = [], i, y, body = '', F;
                if (!isFinite(a)) a = 1;
                k = 40 / a;
                function sag(r, y) { return isFinite(r) ? r - Math.sign(r) * Math.sqrt(r * r - y * y) : 0; }
                for (i = 0; i <= 40; i++) {
                    y = a * (i / 20 - 1);
                    faces.push(y);
                    t = Math.max(t, sag(r1, y) - sag(r2, y));
                }
                t += 0.08 * a; // the edge's least thickness
                faces.forEach(function (y) {
                    left.push(fix(cx + (sag(r1, y) - t / 2) * k) + ' ' + fix(cy - y * k));
                    right.unshift(fix(cx + (sag(r2, y) + t / 2) * k) + ' ' + fix(cy - y * k));
                });
                body += '<path class="calc-sv-axis" d="M4 ' + cy + 'H296"/><path class="calc-sv-fill" d="M' + left.concat(right).join('L') + 'Z"/>';
                F = isFinite(f) ? cx + Math.sign(f) * Math.max(36, Math.min(136, Math.abs(f) * k)) : null;
                [-0.6, 0, 0.6].forEach(function (u) {
                    var y0 = cy - u * 40, dx, dy, s;
                    if (F === null) return body += svgArrow(8, y0, 292, y0, 'calc-sv-curve calc-sv-thin');
                    dx = f > 0 ? F - cx : cx - F;
                    dy = f > 0 ? cy - y0 : y0 - cy;
                    s = (292 - cx) / dx;
                    body += '<path class="calc-sv-curve calc-sv-thin" d="M8 ' + fix(y0) + 'H' + cx + 'L' + fix(292) + ' ' + fix(y0 + dy * s) + '"/>';
                    if (f < 0 && u) body += '<path class="calc-sv-guide" d="M' + fix(F) + ' ' + cy + 'L' + cx + ' ' + fix(y0) + '"/>';
                });
                if (F !== null) body += '<circle class="calc-sv-mid" cx="' + fix(F) + '" cy="' + cy + '" r="2.5"/>' + svgText(F, cy + 14, 'F', 'middle');
                return svgOf('', 300, 112, 'Its shape, and light through it', body);
            }

            function runSnell(n, raw) {
                var t1 = toRadians(n.a), s = n.n1 * Math.sin(t1) / n.n2, none = ['θ₂'], rows;
                if (!raw.a) return physNone(none);
                if (!(n.n1 > 0 && n.n2 > 0 && t1 >= 0 && t1 <= Math.PI / 2)) return Object.assign(physNone(none), { warn: true, note: 'n₁ and n₂ above 0, and θ₁ from 0 to a right angle.' });
                rows = s > 1 ? [{ l: 'θ₂', wide: true, text: 'None: it is all reflected' }] : [{ l: 'θ₂', v: fromRadians(Math.asin(s)) }];
                if (n.n1 > n.n2) rows.push({ l: 'Critical angle', v: fromRadians(Math.asin(n.n2 / n.n1)) });
                rows = rows.concat(physRows([['Speed in 1, m/s', LIGHT / n.n1], ['Speed in 2, m/s', LIGHT / n.n2]]));
                rows.push({ l: 'The ray', wide: true, text: rayDrawing(t1, s > 1 ? NaN : Math.asin(s), n.n1, n.n2) });
                return { rows: rows, cols: 2, note: tr('{v}Angles from the normal, in {unitWord}.', { v: (s > 1 ? tr('Past the critical angle: total internal reflection. ') : ''), unitWord: unitWord() }) };
            }

            // Light meeting a surface at t1 from the normal: bent to t2, or NaN all reflected; each medium shaded of its index, the
            // denser darker, what it reflects faint unless it is all
            function rayDrawing(t1, t2, n1, n2) {
                var W = 300, H = 120, cx = 150, cy = 60, r = 54, shade = function (n) { return Math.max(0.08, Math.min(0.9, (n - 1) * 1.1 + 0.08)).toFixed(2); }, all = isNaN(t2);
                return svgOf('', W, H, 'The ray', '<rect class="calc-sv-under" x="0" y="0" width="' + W + '" height="' + cy + '" opacity="' + shade(n1) + '"/>' +
                    '<rect class="calc-sv-under" x="0" y="' + cy + '" width="' + W + '" height="' + cy + '" opacity="' + shade(n2) + '"/>' +
                    '<path class="calc-sv-ground" d="M0 ' + cy + 'H' + W + '"/><path class="calc-sv-guide" d="M' + cx + ' 4V' + (H - 4) + '"/>' +
                    svgArrow(cx - r * Math.sin(t1), cy - r * Math.cos(t1), cx, cy, 'calc-sv-curve') +
                    (all ? svgArrow(cx, cy, cx + r * Math.sin(t1), cy - r * Math.cos(t1), 'calc-sv-curve') :
                        '<path class="calc-sv-axis" d="M' + cx + ' ' + cy + 'L' + fix(cx + r * 0.7 * Math.sin(t1)) + ' ' + fix(cy - r * 0.7 * Math.cos(t1)) + '"/>' +
                        svgArrow(cx, cy, cx + r * Math.sin(t2), cy + r * Math.cos(t2), 'calc-sv-curve')) +
                    svgText(8, 16, 'n<tspan class="calc-sv-sub" dy="2">1</tspan>') + svgText(8, H - 8, 'n<tspan class="calc-sv-sub" dy="2">2</tspan>'));
            }

            // the light of a wavelength on a screen, bright where its waves meet in step: of two slits a gap d apart, L from it, some
            // seven fringes round the middle; of a grating, its spots at each order, across from straight left to straight right
            function fringesDrawing(nm, d, L) {
                var W = 300, H = 40, col = nmColour(nm) || '#eef3f0', id = 'calc-plot-' + (++app.plotIds), stops = '', body = '', lam = nm * 1e-9, top, i, u, x, last = -99;
                if (L) {
                    for (i = 0; i <= 140; i++) {
                        u = (i / 140 - 0.5) * 7; // in fringes from the middle
                        stops += '<stop offset="' + (i / 140).toFixed(3) + '" stop-color="' + col + '" stop-opacity="' + Math.pow(Math.cos(Math.PI * u), 2).toFixed(2) + '"/>';
                    }
                    return svgOf('', W, H, 'The fringes on the screen', '<defs><linearGradient id="' + id + '">' + stops + '</linearGradient></defs><rect class="calc-sv-screen" x="4" y="4" width="' + (W - 8) + '" height="' + (H - 8) +
                        '" rx="3"/><rect x="4" y="4" width="' + (W - 8) + '" height="' + (H - 8) + '" fill="url(#' + id + ')"/>');
                }
                top = Math.floor(d / lam + 1e-9);
                for (i = -top; i <= top; i++) {
                    x = W / 2 + (W / 2 - 10) * i * lam / d;
                    body += '<rect x="' + fix(x - 2) + '" y="6" width="4" height="' + (H - 8) + '" rx="2" fill="' + col + '"/>';
                    if (x - last > 14) {
                        body += svgText(x, H + 10, String(i), 'middle');
                        last = x;
                    }
                }
                return svgOf('', W, H + 14, 'The spots of its orders', '<rect class="calc-sv-screen" x="4" y="4" width="' + (W - 8) + '" height="' + (H - 4) + '" rx="3"/>' + body);
            }

            function runInterference(n, raw) {
                var grating = raw.kind === '1', lam = n.w * 1e-9, d = grating ? 1e-3 / n.N : n.d, s = n.m * lam / d, top, rows, none = grating ? ['θ of order m', 'Orders'] : ['Δy, m', 'θ of order m'];
                if (!raw.w) return physNone(none);
                if (!(n.w > 0 && d > 0 && isFinite(d) && n.m >= 0 && n.m % 1 === 0 && (grating || n.L > 0))) {
                    return Object.assign(physNone(none), { warn: true, note: (grating ? tr('λ and the lines above 0, and the order a whole number, 0 or more.') : tr('λ, d and L above 0, and the order a whole number, 0 or more.')) });
                }
                top = Math.floor(d / lam + 1e-9);
                rows = s <= 1 ? [{ l: 'θ of order m', v: fromRadians(Math.asin(s)) }] : [{ l: 'θ of order m', wide: true, text: 'None: past a right angle' }];
                if (grating) rows = rows.concat(physRows([['Orders each side', top], ['Spots in all', 2 * top + 1], ['d, m', d]]));
                else rows = rows.concat(physRows([['Δy, m', lam * n.L / d], ['Δy, mm', lam * n.L / d * 1e3]].concat(s < 1 ? [['y of order m, m', n.L * Math.tan(Math.asin(s))]] : [])));
                rows.push({ l: grating ? 'Its spots' : 'On the screen', wide: true, text: fringesDrawing(n.w, d, grating ? 0 : n.L) });
                return { rows: rows, cols: 2, note: (grating ? tr('Angles in {unitWord}; of each order the spots each side.{v}', { unitWord: unitWord(), v: (nmColour(n.w) ? '' : tr(' Light not seen: drawn white.')) }) : tr('Angles in {unitWord}; Δy as the angles are small, d far below L.{v}', { unitWord: unitWord(), v: (nmColour(n.w) ? '' : tr(' Light not seen: drawn white.')) })) };
            }

            // light of a wavelength on a screen, as bright at each place across it as f gives it, from 0 at its left to 1 at its right;
            // the faint parts brightened, to be seen
            function screenDrawing(nm, f, label) {
                var W = 300, H = 40, col = nmColour(nm) || '#eef3f0', id = 'calc-plot-' + (++app.plotIds), stops = '', i;
                for (i = 0; i <= 160; i++) stops += '<stop offset="' + (i / 160).toFixed(3) + '" stop-color="' + col + '" stop-opacity="' + Math.min(1, Math.sqrt(Math.max(0, f(i / 160)))).toFixed(2) + '"/>';
                return svgOf('', W, H, label, '<defs><linearGradient id="' + id + '">' + stops + '</linearGradient></defs><rect class="calc-sv-screen" x="4" y="4" width="' + (W - 8) + '" height="' + (H - 8) +
                    '" rx="3"/><rect x="4" y="4" width="' + (W - 8) + '" height="' + (H - 8) + '" fill="url(#' + id + ')"/>');
            }

            function runSlit(n, raw) {
                var hole = raw.kind === '1', lam = n.w * 1e-9, rows, s1, s, top, th, x1, k, marks = [], light, none = hole ? ['θ', 'θ, arcsec'] : ['θ of order m', 'Middle, angle'];
                if (!raw.w && !(hole ? raw.D : raw.a)) return physNone(none);
                if (hole) {
                    if (!(n.w > 0 && n.D > 0 && (!raw.L || n.L > 0))) return Object.assign(physNone(none), { warn: true, note: 'λ and D above 0, and the distance too.' });
                    s = 1.22 * lam / n.D;
                    if (s >= 1) return Object.assign(physNone(none), { warn: true, note: 'The hole is not wider than the light\'s wavelength: it tells nothing apart.' });
                    th = Math.asin(s);
                    light = function (x) { return CalcPhysics.airy(Math.PI * n.D * Math.sin(toRadians(x)) / lam); };
                    x1 = fromRadians(th);
                    rows = physRows([['θ', x1]].concat(app.deg ? [['θ, rad', th]] : [], [['θ, arcsec', th * 648000 / Math.PI], ['Airy disc, wide', 2 * x1]],
                        raw.L ? [['Apart at the distance, m', n.L * Math.tan(th)]] : []));
                    return { rows: rows.concat(drawnTile(graphDrawing('Two points just told apart, and the light of each', -2.5 * x1, 3.5 * x1, {
                        fs: [function (x) { return light(x) + light(x - x1); }, light, function (x) { return light(x - x1); }], y: [0, 1.15], marks: [[0, '0'], [x1, 'θ']], names: ['θ', 'I'] }), 'Two points, θ apart'),
                    drawnTile(screenDrawing(n.w, function (u) { return (light((u * 6 - 2.5) * x1) + light((u * 6 - 3.5) * x1)) / 1.1; }, 'The two points on the screen'), 'Seen')), cols: 2,
                        note: tr('By Rayleigh: one point\'s middle on the other\'s first dark ring, the light between them a quarter less. Angles in {unitWord}.{v}', { unitWord: unitWord(), v: (nmColour(n.w) ? '' : tr(' Light not seen: drawn white.')) }) };
                }
                if (!(n.w > 0 && n.a > 0 && n.m >= 1 && n.m % 1 === 0 && (!raw.L || n.L > 0))) {
                    return Object.assign(physNone(none), { warn: true, note: 'λ and a above 0, the order a whole number from 1, and L above 0.' });
                }
                s1 = lam / n.a;
                s = n.m * s1;
                top = Math.floor(n.a / lam + 1e-9);
                rows = [s <= 1 ? { l: 'θ of order m', v: fromRadians(Math.asin(s)) } : { l: 'θ of order m', wide: true, text: 'None: past a right angle' },
                    s1 < 1 ? { l: 'Middle, angle', v: fromRadians(2 * Math.asin(s1)) } : { l: 'Middle', wide: true, text: 'All of it: a not wider than λ' }].concat(physRows([['Dark each side', top]]));
                if (raw.L && s1 < 1) rows = rows.concat(physRows([['Middle, m', 2 * n.L * Math.tan(Math.asin(s1))], ['Middle, mm', 2e3 * n.L * Math.tan(Math.asin(s1))]].concat(s < 1 ? [['y of order m, m', n.L * Math.tan(Math.asin(s))]] : [])));
                light = function (x) { return CalcPhysics.slit(Math.PI * n.a * Math.sin(toRadians(x)) / lam); };
                x1 = fromRadians(Math.asin(Math.min(1, 3.5 * s1)));
                for (k = -3; k <= 3; k++) {
                    if (k && Math.abs(k) * s1 < 1) marks.push([fromRadians(Math.asin(k * s1)), String(k).replace('-', '−')]);
                }
                return { rows: rows.concat(drawnTile(graphDrawing('The light at each angle', -x1, x1, { fs: [light], y: [0, 1.1], marks: marks, names: ['θ', 'I'] }), 'Its light, dark at each order'),
                    drawnTile(screenDrawing(n.w, function (u) { return light((2 * u - 1) * x1); }, 'The light on the screen'), 'On the screen')), cols: 2,
                    note: tr('Dark where a sin θ = mλ; the middle twice as wide as the rest. Angles in {unitWord}.{v}', { unitWord: unitWord(), v: (nmColour(n.w) ? '' : tr(' Light not seen: drawn white.')) }) };
            }

            function runPolarise(n, raw) {
                var t = toRadians(n.a), c2 = Math.pow(Math.cos(t), 2), b = Math.atan(n.n2 / n.n1), none = ['I', 'Through, %'];
                if (!raw.a) return physNone(none);
                if (!(n.I >= 0 && isFinite(t) && n.n1 > 0 && n.n2 > 0)) return Object.assign(physNone(none), { warn: true, note: 'I₀ of 0 or more, θ, and n₁ and n₂ above 0.' });
                return { rows: physRows([['I', n.I * (c2 < 1e-15 ? 0 : c2)], ['Through, %', 100 * (c2 < 1e-15 ? 0 : c2)], ['Unpolarised, after both', n.I * (c2 < 1e-15 ? 0 : c2) / 2]])
                    .concat([{ l: 'Brewster\'s θ', v: fromRadians(b) }, { l: 'Refracted then at', v: fromRadians(Math.PI / 2 - b) }], drawnTile(curveDrawing('What goes through at each angle', fromRadians(Math.PI / 2), 0, 100, function (x) {
                        return 100 * Math.pow(Math.cos(toRadians(x)), 2);
                    }, { under: true, at: Math.abs(n.a) <= fromRadians(Math.PI / 2) ? Math.abs(n.a) : undefined, names: ['θ', '%'] }), 'Through, % against θ')), cols: 2,
                    note: tr('Angles in {unitWord}. At a right angle, crossed, none goes through.', { unitWord: unitWord() }) };
            }

            function runDoppler(n, raw) {
                var none = ['f′, Hz'], beta, k, nm;
                if (raw.kind === '1') { // light, by relativity
                    none = ['λ′, nm', 'z'];
                    if (!raw.lw && !raw.lv) return physNone(none);
                    beta = n.lv * 1e3 / LIGHT;
                    k = CalcPhysics.redshift(beta);
                    if (!(n.lw > 0 && isFinite(k))) return Object.assign(physNone(none), { warn: true, note: 'λ above 0, and v slower than light, 299792 km/s.' });
                    nm = n.lw * k;
                    return { rows: physRows([['λ′, nm', nm], ['z', k - 1], ['Δλ, nm', nm - n.lw], ['β, of c', beta], ['f′ ÷ f', 1 / k]]).concat([{ l: 'Seen', wide: true, text: lightKind(nm) }],
                        drawnTile(nmColour(n.lw) && nmColour(nm) ? shiftDrawing(n.lw, nm) : spectrumDrawing(nm), nmColour(n.lw) && nmColour(nm) ? 'From its colour to the one seen' : 'Where it is seen among the kinds of light')), cols: 2,
                        note: beta > 0 ? 'Going away: redshifted, longer.' : beta < 0 ? 'Coming nearer: blueshifted, shorter.' : 'Not moving: as it is.' };
                }
                if (!raw.f) return physNone(none);
                if (!(n.f > 0 && n.v > 0 && n.s < n.v && n.o > -n.v)) return Object.assign(physNone(none), { warn: true, note: 'f and v above 0, and each moving slower than the sound.' });
                return { rows: physRows([['f′, Hz', n.f * (n.v + n.o) / (n.v - n.s)], ['Change, Hz', n.f * (n.v + n.o) / (n.v - n.s) - n.f]]).concat({ l: 'Its waves, the listener at the right', wide: true, text: dopplerDrawing(n.s / n.v) }), cols: 2,
                    note: 'Speeds above 0 toward each other.' };
            }

            // the light of a wavelength in nm: its kind, and of what is seen its colour
            function lightKind(nm) {
                var seen = [[380, 'violet'], [450, 'blue'], [485, 'cyan'], [500, 'green'], [565, 'yellow'], [590, 'orange'], [625, 'red'], [750, '']];
                if (nm < 0.01) return tr('Gamma rays');
                if (nm < 10) return tr('X-rays');
                if (nm < 380) return tr('Ultraviolet');
                if (nm <= 750) return tr('Visible, {seen}', { seen: seen.filter(function (s, i) { return nm >= s[0] && nm < (seen[i + 1] || [Infinity])[0]; })[0][1] });
                if (nm < 1e6) return tr('Infrared');
                if (nm < 1e9) return tr('Microwaves: Wi-Fi, Bluetooth, 5G, GPS, ovens');
                return tr('Radio waves');
            }

            function runPhoton(n, raw) {
                var of = +raw.light || 0, x = n.x, nm, f, E;
                if (!raw.x) return physNone(['λ, nm', 'f, Hz', 'E, eV']);
                if (!(x > 0)) return Object.assign(physNone(['λ, nm', 'f, Hz', 'E, eV']), { warn: true, note: 'It is above 0.' });
                f = of === 0 ? LIGHT / (x * 1e-9) : of === 1 ? x : x * CHARGE / PLANCK;
                nm = LIGHT / f * 1e9;
                E = PLANCK * f;
                return { rows: physRows([['λ, nm', nm], ['f, Hz', f], ['E, eV', E / CHARGE], ['E, J', E], ['Momentum, kg·m/s', E / LIGHT]]).concat([{ l: 'Light', wide: true, text: lightKind(nm) },
                    { l: 'Among the kinds of light', wide: true, text: spectrumDrawing(nm, of) }]), cols: 2 };
            }

            function runDecibel(n, raw) {
                var db = raw.sound === '1', L, I;
                if (!raw.x) return physNone(['L, dB', 'I, W/m²']);
                if (db ? !isFinite(n.x) : !(n.x > 0)) return Object.assign(physNone(['L, dB', 'I, W/m²']), { warn: true, note: db ? 'A level in dB.' : 'The intensity is above 0.' });
                L = db ? n.x : 10 * Math.log10(n.x / 1e-12);
                I = db ? 1e-12 * Math.pow(10, n.x / 10) : n.x;
                return { rows: physRows([['L, dB', L], ['I, W/m²', I], ['Times I₀', I / 1e-12]]).concat({ l: 'Where it is among sounds', wide: true, text: decibelDrawing(L) }), cols: 3, note: '10 dB more is 10 times the intensity, heard as about twice as loud.' };
            }

            function runHeatCap(n, raw) {
                var known = ['Q', 'm', 'c', 'dT'].filter(function (k) { return raw[k] && isFinite(n[k]); }), Q = n.Q, m = n.m, c = n.c, dT = n.dT, none = ['Q, J', 'm, kg', 'c, J/(kg·K)', 'ΔT, K'];
                if (known.length < 3) return Object.assign(physNone(none), { cols: 2 });
                if (known.length > 3) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Three of the four only: leave one empty.' });
                if (!raw.Q) Q = m * c * dT;
                else if (!raw.m) m = c * dT ? Q / (c * dT) : NaN;
                else if (!raw.c) c = m * dT ? Q / (m * dT) : NaN;
                else dT = m * c ? Q / (m * c) : NaN;
                if (!isFinite(Q + m + c + dT)) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'Divided by 0: no answer.' });
                return { rows: physRows([['Q, J', Q], ['m, kg', m], ['c, J/(kg·K)', c], ['ΔT, K', dT], ['Q, kcal', Q / 4184], ['Q, kWh', Q / 3.6e6]]), cols: 2,
                    note: Q < 0 ? 'Below 0: the heat it gives cooling.' : 'A change of 1 K is a change of 1 °C.' };
            }

            function runLatent(n, raw) {
                var known = ['Q', 'm', 'L'].filter(function (k) { return raw[k] && isFinite(n[k]); }), Q = n.Q, m = n.m, L = n.L, none = ['Q, J', 'm, kg', 'L, J/kg'];
                if (known.length < 2) return physNone(none);
                if (known.length > 2) return Object.assign(physNone(none), { warn: true, note: 'Two of the three only: leave one empty.' });
                if (!raw.Q) Q = m * L;
                else if (!raw.m) m = L ? Q / L : NaN;
                else L = m ? Q / m : NaN;
                if (!isFinite(Q + m + L)) return Object.assign(physNone(none), { warn: true, note: 'Divided by 0: no answer.' });
                return { rows: drawnTile(Q ? graphDrawing('Its temperature as the heat goes in: flat while it melts or boils', -0.5 * Math.abs(Q), 1.5 * Math.abs(Q), {
                    fs: [function (x) { return x < 0 ? x / Math.abs(Q) : x > Math.abs(Q) ? (x - Math.abs(Q)) / Math.abs(Q) : 0; }], bands: [[0, Math.abs(Q)]], y: [-0.6, 0.6],
                    marks: [[Math.abs(Q), CalcPhysics.si(Math.abs(Q), 'J')]], names: ['Q', 'T'] }) : '', 'Changing state').concat(physRows([['Q, J', Q], ['m, kg', m], ['L, J/kg', L]])), cols: 3 };
            }

            function runMixing(n, raw) {
                var a = n.m1 * n.c1, b = n.m2 * n.c2, T, none = ['T, °C', 'Heat, J'];
                if (!raw.m1 && !raw.m2) return physNone(none);
                if (!(n.m1 > 0 && n.m2 > 0 && n.c1 > 0 && n.c2 > 0 && isFinite(n.T1) && isFinite(n.T2))) {
                    return Object.assign(physNone(none), { warn: true, note: 'Both masses and both c above 0, and both temperatures.' });
                }
                T = (a * n.T1 + b * n.T2) / (a + b);
                return { rows: drawnTile(graphDrawing('The two meeting at T, 1 red, as time goes', 0, 5, { fs: [function (t) { return T + (n.T1 - T) * Math.exp(-t); }, function (t) { return T + (n.T2 - T) * Math.exp(-t); }],
                    marks: [], dots: [[0, n.T1], [5, T]], pts: [[0, n.T2]], names: ['time', 'T'] }), 'Meeting').concat(physRows([['T, °C', T], ['Heat, J', Math.abs(a * (T - n.T1))], ['Change of 1, K', T - n.T1], ['Change of 2, K', T - n.T2]])), cols: 2,
                    note: 'No heat lost, and neither melts nor boils. In kelvin as well, both typed so.' };
            }

            function runExpansion(n, raw) {
                var vol = raw.kind === '1', d = n.a * n.x * n.dT, none = vol ? ['ΔV, m³', 'V, m³'] : ['ΔL, m', 'L, m'];
                if (!raw.x && !raw.a) return physNone(none);
                if (!(n.x > 0 && isFinite(n.a) && isFinite(n.dT))) return Object.assign(physNone(none), { warn: true, note: (vol ? tr('V₀ above 0, {v} and ΔT.', { v: (vol ? 'β' : 'α') }) : tr('L₀ above 0, {v} and ΔT.', { v: (vol ? 'β' : 'α') })) });
                return { rows: physRows([[none[0], d], [none[1], n.x + d], ['Change, %', 100 * n.a * n.dT]]), cols: 3,
                    note: vol ? 'Of a solid, β is about 3α; water is about 2.1e-4 near 20 °C.' : 'The same ΔT in kelvin or °C.' };
            }

            function runConduction(n, raw) {
                var P = n.k * n.A * n.dT / n.d, none = ['P, W', 'Per m², W/m²'];
                if (!raw.k && !raw.A && !raw.d) return physNone(none);
                if (!(n.k > 0 && n.A > 0 && n.d > 0 && isFinite(n.dT))) return Object.assign(physNone(none), { warn: true, note: 'k, A and d above 0, and ΔT.' });
                return { rows: physRows([['P, W', P], ['Per m², W/m²', P / n.A], ['Resistance, K/W', n.d / (n.k * n.A)], ['U, W/(m²·K)', n.k / n.d]]
                    .concat(raw.t && n.t > 0 ? [['Heat in t, J', P * n.t]] : [])), cols: 2, note: raw.t ? '' : 'With a time, the heat in it too.' };
            }

            function runRadiation(n, raw) {
                var SIGMA = 5.670374419e-8, WIEN = 2.897771955e-3, P, nm, rows, none = ['P, W', 'λ max, nm'];
                if (!raw.T) return physNone(none);
                if (!(n.T > 0 && n.A > 0 && n.e > 0 && n.e <= 1 && (!raw.Ts || n.Ts >= 0))) return Object.assign(physNone(none), { warn: true, note: 'T and A above 0, in kelvin; ε from above 0 to 1.' });
                P = n.e * SIGMA * n.A * Math.pow(n.T, 4);
                nm = WIEN / n.T * 1e9;
                rows = physRows([['P, W', P], ['Per m², W/m²', P / n.A], ['λ max, nm', nm]]
                    .concat(raw.Ts ? [['Taken in, W', n.e * SIGMA * n.A * Math.pow(n.Ts, 4)], ['Net lost, W', n.e * SIGMA * n.A * (Math.pow(n.T, 4) - Math.pow(n.Ts, 4))]] : []));
                rows.push({ l: 'Brightest in', wide: true, text: lightKind(nm) }, { l: 'How bright at each λ, nm', wide: true, text: planckDrawing(nm) });
                return { rows: rows, cols: 2, note: !raw.Ts ? 'With the temperature around it, what it loses.' : n.Ts > n.T ? 'Below 0: it takes in more than it gives, and warms.' : 'It gives more than it takes in, and cools.' };
            }

            function runCooling(n, raw) {
                var byK = raw.by === '1', k = byK ? n.k : CalcPhysics.coolingRate(n.T0, n.Ta, n.t1, n.T1), rows, when = NaN, end, dots = [], none = ['k, a minute', 'Half the gap, min'],
                    at = function (t) { return CalcPhysics.cooling(n.T0, n.Ta, k, t); };
                if (!raw.T0 && !(byK ? raw.k : raw.T1)) return physNone(none);
                if (!(isFinite(n.T0) && isFinite(n.Ta) && n.T0 !== n.Ta)) return Object.assign(physNone(none), { warn: true, note: 'T₀, and the air\'s Tₐ, not the same.' });
                if (!(k > 0)) return Object.assign(physNone(none), { warn: true, note: byK ? 'k above 0.' : 't₁ above 0, and T₁ between T₀ and Tₐ.' });
                rows = [['k, a minute', k], ['Half the gap, min', Math.LN2 / k]];
                if (!byK) dots.push([n.t1, n.T1]);
                if (raw.t && n.t >= 0) {
                    rows.push(['T after t', at(n.t)]);
                    dots.push([n.t, at(n.t)]);
                }
                if (raw.T && isFinite(n.T)) {
                    when = CalcPhysics.coolingTime(n.T0, n.Ta, k, n.T);
                    rows.push(['Time to it, min', when]);
                    if (isFinite(when)) dots.push([when, n.T]);
                }
                end = Math.max(Math.log(20) / k, raw.t && n.t > 0 ? n.t * 1.1 : 0, isFinite(when) ? when * 1.1 : 0);
                return { rows: physRows(rows).concat(drawnTile(graphDrawing('Its temperature as time goes, nearing the air\'s', 0, end, {
                    fs: [at, function () { return n.Ta; }], dots: dots, names: ['min', 'T'] }), 'Its temperature, nearing the air\'s')), cols: 2, warn: raw.T && isFinite(n.T) && !isFinite(when),
                    note: raw.T && isFinite(n.T) && !isFinite(when) ? 'It never comes to that: it only nears the air\'s temperature, from the side it starts.' :
                        tr('It nears the air\'s temperature without end, the gap to it halving each {v} minutes.', { v: +(Math.LN2 / k).toPrecision(3) }) };
            }

            function runDew(n, raw) {
                var byDew = raw.by === '1', rh = byDew ? CalcPhysics.humidity(n.T, n.Td) : n.rh, td = byDew ? n.Td : CalcPhysics.dewPoint(n.T, n.rh), es, e, lo, hi,
                    none = byDew ? ['RH, %', 'Water, g/m³'] : ['T<sub>d</sub>, °C', 'Water, g/m³'];
                if (!raw.T && !(byDew ? raw.Td : raw.rh)) return physNone(none);
                if (!(isFinite(n.T) && isFinite(td) && rh > 0 && rh <= 100)) return Object.assign(physNone(none), { warn: true, note: byDew ? 'T, and Td no higher than T.' : 'T, and RH above 0, up to 100.' });
                es = CalcPhysics.vapour(n.T);
                e = es * rh / 100;
                lo = Math.min(td, n.T) - 8;
                hi = Math.max(td, n.T) + 8;
                return { rows: physRows((byDew ? [['RH, %', rh]] : [['T<sub>d</sub>, °C', td]]).concat([['Water, g/m³', 216.7 * e / (n.T + 273.15)], ['T – T<sub>d</sub>, °C', n.T - td],
                    ['Vapour, hPa', e], ['Most it holds, hPa', es]])).concat(drawnTile(graphDrawing('The most vapour air holds, and this air', lo, hi, { fs: [CalcPhysics.vapour], dots: [[n.T, e], [td, e]],
                        lines: [[td, e, n.T, e]], marks: [[td, 'T<tspan class="calc-sv-sub" dy="2">d</tspan>']], names: ['°C', 'hPa'] }), 'Cooled, it is full at the curve, at T<sub>d</sub>')), cols: 2,
                    warn: n.T < -45 || n.T > 60,
                    note: (n.T < -45 || n.T > 60 ? 'Outside –45 °C to 60 °C, Magnus\'s formula is rough. ' : '') + (td < 0 ? 'Below 0 °C it is frost, not dew, a little above the dew point. ' : '') +
                        (rh >= 95 ? 'Near full: mist or fog.' : n.T - td <= 2.5 ? 'Within some 2.5 °C of the dew point: mist is likely.' : 'Cooled with the same water in it, it is full at the dew point.') };
            }

            // a body's light by Planck's law, of its brightest wavelength in nm: to five times it, the colours seen behind it
            function planckDrawing(peak) {
                var X = 4.965114231744276, top = Math.expm1(X); // hc/λkT at the brightest, Wien's
                return curveDrawing('How bright it is at each wavelength', 5 * peak, 0, 1, function (l) {
                    var x = l / peak;
                    return x < 0.03 ? 0 : top / (Math.pow(x, 5) * Math.expm1(X / x));
                }, { band: 5 * peak > 380 && peak < 3000 ? [380, Math.min(750, 5 * peak)] : null, marks: [[peak, 'λ max']], under: true, names: ['λ', ''] });
            }

            function runMolecules(n, raw) {
                var M = n.M / 1000, vp, rows, none = ['v<sub>rms</sub>, m/s', 'Mean, m/s'];
                if (!raw.M && !raw.T) return physNone(none);
                if (!(n.M > 0 && n.T > 0)) return Object.assign(physNone(none), { warn: true, note: 'M and T above 0, T in kelvin.' });
                vp = Math.sqrt(2 * MOLAR_GAS * n.T / M);
                rows = physRows([['v<sub>rms</sub>, m/s', vp * Math.sqrt(1.5)], ['Mean, m/s', vp * 2 / Math.sqrt(Math.PI)], ['Most likely, m/s', vp], ['E each, J', 1.5 * BOLTZMANN * n.T],
                    ['E each, eV', 1.5 * BOLTZMANN * n.T / CHARGE], ['E a mole, J', 1.5 * MOLAR_GAS * n.T], ['Mass each, kg', M / 6.02214076e23]]);
                rows.push({ l: 'How many at each speed, m/s', wide: true, text: curveDrawing('How many go at each speed', 3 * vp, 0, 1, function (v) { var x = v / vp; return x * x * Math.exp(1 - x * x); },
                    { under: true, marks: [[vp, 'v<tspan class="calc-sv-sub" dy="2">p</tspan>'], [vp * Math.sqrt(1.5), 'v<tspan class="calc-sv-sub" dy="2">rms</tspan>']], names: ['v', ''] }) });
                return { rows: rows, cols: 2, note: 'Of an ideal gas, by Maxwell and Boltzmann; sound in it goes some 0.7 of v rms.' };
            }

            function runGasProcess(n, raw) {
                var kind = +raw.kind || 0, gamma = [1.4, 5 / 3, 4 / 3][+raw.gas || 0], g, path, lo, hi, pad, none = ['P<sub>2</sub>, Pa', 'W, J'];
                if (!raw.V && !(kind === 2 ? raw.T2 : raw.V2)) return physNone(none);
                g = CalcPhysics.gasProcess(kind, gamma, n.P, n.V, n.T, kind === 2 ? n.T2 : n.V2);
                if (!g) return Object.assign(physNone(none), { warn: true, note: (kind === 2 ? tr('P₁, V₁, T₁ and T₂ above 0, T in kelvin.') : tr('P₁, V₁, T₁ and V₂ above 0, T in kelvin.')) });
                // its path on a PV diagram: a curve shaded under, its area the work; of a steady volume, a line straight up or down
                path = [function (x) { return n.P * n.V / x; }, function () { return n.P; }, null, function (x) { return n.P * Math.pow(n.V / x, gamma); }][kind];
                lo = Math.min(n.V, g.v);
                hi = Math.max(n.V, g.v);
                pad = (hi - lo) * 0.25 || n.V * 0.5;
                return { rows: physRows([['P<sub>2</sub>, Pa', g.p], ['V<sub>2</sub>, m³', g.v], ['T<sub>2</sub>, K', g.t], ['T<sub>2</sub>, °C', g.t - 273.15], ['n, mol', g.n], ['W, J', g.w], ['Q, J', g.q], ['ΔU, J', g.du]])
                    .concat(drawnTile(graphDrawing('Its path from P₁V₁ to P₂V₂, its area the work', lo - pad, hi + pad, kind === 2 ?
                        { lines: [[n.V, n.P, n.V, g.p]], dots: [[n.V, n.P], [g.v, g.p]], marks: [[n.V, 'V₁']], y: [0, Math.max(n.P, g.p) * 1.1], names: ['V', 'P'] } :
                        { fs: [function (x) { return x >= lo && x <= hi ? path(x) : NaN; }].concat(kind === 3 ? [function (x) { return n.P * n.V / x; }] : []), fit: 1, fill: [path, null, lo, hi],
                            dots: [[n.V, n.P], [g.v, g.p]], marks: [[n.V, 'V₁'], [g.v, 'V₂']], names: ['V', 'P'] }), tr('P against V{v}', { v: (kind === 3 ? tr(', and an isotherm') : '') }))), cols: 2,
                    note: tr('{v} W above 0: it pushes out.', { v: [tr('Its energy stays the same: the heat put in is the work it does.'), tr('The heat put in warms it and does work: Q = n Cp ΔT.'),
                        tr('It does no work: all the heat goes to its energy.'), tr('No heat in or out: the work it does comes from its energy, so it cools as it grows.')][kind] }) };
            }

            function runEngine(n, raw) {
                var fridge = raw.kind === '1', eta = 1 - n.Tc / n.Th, cop = n.Tc / (n.Th - n.Tc), rows, warn = false, note, none = fridge ? ['COP, cooling', 'COP, heating'] : ['Carnot η, %'];
                if (!raw.Th && !raw.Tc) return physNone(none);
                if (!(n.Tc > 0 && n.Th > n.Tc)) return Object.assign(physNone(none), { warn: true, note: 'Both in kelvin, above 0, and TH above TC.' });
                if (fridge) {
                    rows = [['COP, cooling', cop], ['COP, heating', cop + 1]];
                    if (raw.W && n.W > 0) rows.push(['Out of the cold, at most, J', n.W * cop], ['Into the warm, at most, J', n.W * (cop + 1)]);
                    note = 'At best: real ones manage some half of it. Each joule of work moves more than a joule of heat.';
                } else {
                    rows = [['Carnot η, %', 100 * eta]];
                    if (raw.Q && raw.W && n.Q > 0 && n.W >= 0) {
                        rows.push(['Its η, %', 100 * n.W / n.Q], ['Of Carnot\'s, %', 100 * n.W / n.Q / eta], ['Heat out, J', n.Q - n.W]);
                        warn = n.W / n.Q > eta + 1e-12;
                    } else if (raw.Q && n.Q > 0) rows.push(['Work at most, J', n.Q * eta], ['Heat out at least, J', n.Q * (1 - eta)]);
                    note = warn ? 'More than Carnot\'s: no engine between these can do it.' : 'No engine between them does better: a hotter TH or a colder TC does.';
                }
                return { rows: drawnTile(fridge ? stackDrawing('The heat into the warm, at best: the work and the heat from the cold', [['Work 1', 1, '#f0b3b3'], [tr('From the cold {cop}', { cop: shortNum(cop) }), cop, '#bcd0e6']]) :
                    raw.Q && raw.W && n.Q > 0 && n.W >= 0 && n.W <= n.Q ? stackDrawing(tr('The heat in: the work, and the heat out; at best the work {v}%', { v: shortNum(100 * eta) }), [[tr('Work {v}%', { v: shortNum(100 * n.W / n.Q) }), n.W, '#f0b3b3'],
                        [tr('Heat out {v}%', { v: shortNum(100 - 100 * n.W / n.Q) }), n.Q - n.W, '#bcd0e6']]) :
                    stackDrawing('The heat in, at best: the work, and the heat out', [[tr('Work {v}%', { v: shortNum(100 * eta) }), eta, '#f0b3b3'], [tr('Heat out {v}%', { v: shortNum(100 - 100 * eta) }), 1 - eta, '#bcd0e6']]),
                    'Where the heat goes').concat(physRows(rows)), cols: 2, warn: warn, note: note };
            }

            function runStress(n, raw) {
                var p = partValues(raw, ['E']), E = p.v.E, s = n.F / n.A, e, dL, rows, none = ['σ, Pa', 'ε'];
                if (p.bad.length) return Object.assign(physNone(none), { cols: 2, bad: p.bad, warn: true, note: 'A modulus, as 200G or 2e11.' });
                if (!raw.F && !raw.A) return Object.assign(physNone(none), { cols: 2 });
                if (!(isFinite(n.F) && n.A > 0 && n.L > 0 && (!raw.E || E > 0) && (!raw.dL || isFinite(n.dL)))) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'F, A and L above 0, and E above 0.' });
                if (raw.dL && raw.E) return Object.assign(physNone(none), { cols: 2, warn: true, note: 'ΔL or E only: leave one empty.' });
                rows = [['σ, Pa', s], ['σ, MPa', s / 1e6]];
                if (raw.dL || raw.E) {
                    e = raw.dL ? n.dL / n.L : s / E;
                    dL = e * n.L;
                    if (raw.dL) E = e ? s / e : NaN;
                    rows.push(['ε', e], ['Strain, %', 100 * e], raw.dL ? ['E, Pa', E] : ['ΔL, m', dL], ['Energy, J', n.F * dL / 2], ['k, N/m', E * n.A / n.L]);
                }
                rows = physRows(rows);
                if (e && isFinite(E)) rows = drawnTile(graphDrawing('σ against ε, the area under it the energy in each m³', Math.min(0, 1.5 * e), Math.max(0, 1.5 * e), { fs: [function (x) { return E * x / 1e6; }],
                    fill: [function (x) { return E * x / 1e6; }, null, 0, e], dots: [[e, s / 1e6]], names: ['ε', 'σ, MPa'] }), 'Stress and strain').concat(rows);
                return { rows: rows, cols: 2, note: raw.dL || raw.E ? 'Within its elastic limit, as Hooke\'s law holds.' : 'With ΔL or E, the strain and the other too.' };
            }

            // of three letters related as a = b ÷ c, the one left empty from the two typed: [a, b, c], or a note why none
            function ofThree(n, raw, keys) {
                var known = keys.filter(function (k) { return raw[k] && isFinite(n[k]); }), a = n[keys[0]], b = n[keys[1]], c = n[keys[2]];
                if (known.length < 2) return { few: true };
                if (known.length > 2) return { note: 'Two of the three only: leave one empty.' };
                if (!raw[keys[0]]) a = b / c;
                else if (!raw[keys[1]]) b = a * c;
                else c = b / a;
                return [a, b, c].every(function (x) { return x > 0 && isFinite(x); }) ? { v: [a, b, c] } : { note: 'Each is above 0.' };
            }

            function runDensity(n, raw) {
                var r = ofThree(n, raw, ['rho', 'm', 'V']), none = ['ρ, kg/m³', 'm, kg', 'V, m³'], rows;
                if (!r.v) return Object.assign(physNone(none), r.note ? { warn: true, note: r.note } : {});
                rows = physRows([['ρ, kg/m³', r.v[0]], ['m, kg', r.v[1]], ['V, m³', r.v[2]], ['Relative density', r.v[0] / 1000]]);
                rows.push({ l: 'On water', wide: true, text: r.v[0] < 1000 ? 'It floats' : r.v[0] > 1000 ? 'It sinks' : 'It stays where it is' });
                return { rows: rows, cols: 3 };
            }

            function runPressure(n, raw) {
                var r = ofThree(n, raw, ['P', 'F', 'A']), none = ['P, Pa', 'F, N', 'A, m²'];
                if (!r.v) return Object.assign(physNone(none), r.note ? { warn: true, note: r.note } : {});
                return { rows: physRows([['P, Pa', r.v[0]], ['F, N', r.v[1]], ['A, m²', r.v[2]], ['P, kPa', r.v[0] / 1000], ['P, atm', r.v[0] / 101325], ['P, psi', r.v[0] / 6894.757293168361]]), cols: 3 };
            }

            function runDepth(n, raw) {
                var gauge = n.rho * n.g * n.h, none = ['Gauge, Pa', 'Absolute, Pa'];
                if (!raw.h) return physNone(none);
                if (!(n.h >= 0 && n.rho > 0 && n.g > 0 && n.P0 >= 0)) return Object.assign(physNone(none), { warn: true, note: 'h and P₀ of 0 or more, ρ and g above 0.' });
                return { rows: drawnTile(n.h > 0 ? graphDrawing('The pressure going down, absolute red, gauge thin', 0, 2 * n.h, { fs: [function (x) { return (n.P0 + n.rho * n.g * x) / 1000; }, function (x) { return n.rho * n.g * x / 1000; }],
                    dots: [[n.h, (n.P0 + gauge) / 1000]], pts: [[n.h, gauge / 1000]], names: ['h, m', 'P, kPa'] }) : '', 'P and depth')
                    .concat(physRows([['Gauge, Pa', gauge], ['Absolute, Pa', n.P0 + gauge], ['Absolute, atm', (n.P0 + gauge) / 101325]].concat(raw.A && n.A > 0 ? [['Force on A, N', gauge * n.A]] : []))),
                    cols: 2, note: raw.A ? 'The force with air at P₀ behind it.' : 'Every 10 m of water is about 1 atm more.' };
            }

            // a block in a liquid: floating with so much of it under, on the bottom, or staying where it is; its weight down and
            // the push up, to scale
            function buoyancyDrawing(under, W0, up) {
                var W = 300, H = 124, s = 44, x = 128, surface = 40, floor = H - 8, y = under < 1 ? surface - s * (1 - under) : under > 1 ? floor - s : surface + (floor - surface - s) / 2,
                    top = Math.max(W0, up), push = under < 1 ? W0 : up, cx = x + s / 2, cy = y + s / 2;
                return svgOf('', W, H, 'It in the liquid, its weight and the push up', '<rect x="8" y="' + surface + '" width="' + (W - 16) + '" height="' + (floor - surface) + '" fill="#cfe8ec"/>' +
                    '<path class="calc-sv-ground" d="M8 ' + surface + 'H' + (W - 8) + 'M8 ' + floor + 'H' + (W - 8) + '"/>' +
                    '<rect x="' + x + '" y="' + fix(y) + '" width="' + s + '" height="' + s + '" fill="#d3bc8f" stroke="#8a7550" stroke-width="1.2"/>' +
                    svgArrow(cx - 8, cy, cx - 8, cy + 6 + 34 * W0 / top, 'calc-sv-curve') + svgArrow(cx + 8, cy, cx + 8, cy - 6 - 34 * push / top, 'calc-sv-seg') +
                    svgText(x - 6, cy + 4, 'Weight', 'end', 'calc-sv-small calc-sv-red') + svgText(x + s + 6, cy + 4, 'Push up') +
                    svgText(W - 10, surface - 6, under < 1 ? tr('Floats, {v}% under', { v: shortNum(100 * under) }) : under > 1 ? 'Sinks' : 'Stays where it is', 'end'));
            }

            function runBuoyancy(n, raw) {
                var rho, up, W, rows, none = ['Push up, N', 'Weight, N'];
                if (!raw.m && !raw.V) return physNone(none);
                if (!(n.m > 0 && n.V > 0 && n.rho > 0 && n.g > 0)) return Object.assign(physNone(none), { warn: true, note: 'm, V, ρ and g above 0.' });
                rho = n.m / n.V;
                up = n.rho * n.V * n.g;
                W = n.m * n.g;
                rows = physRows([['Its density, kg/m³', rho], ['Push up all under, N', up], ['Weight, N', W]]);
                rows.push({ l: 'It', wide: true, text: rho < n.rho ? 'Floats' : rho > n.rho ? 'Sinks' : 'Stays where it is' });
                return { rows: drawnTile(buoyancyDrawing(rho / n.rho, W, up), 'In the liquid').concat(rows, physRows(rho < n.rho ? [['Under, %', 100 * rho / n.rho], ['To push it under, N', up - W]] :
                    [['Seems under, N', W - up], ['Seems, kg', (W - up) / n.g]])), cols: 2 };
            }

            // a pipe of one width into another, the water in it, an arrow in each part as long as its speed
            function pipeDrawing(d1, d2, v1, v2, dP) {
                var W = 300, H = 118, cy = 50, big = Math.max(d1, d2), h1 = Math.max(8, 72 * d1 / big) / 2, h2 = Math.max(8, 72 * d2 / big) / 2, top = Math.max(v1, v2), edge;
                edge = 'M8 ' + fix(cy - h1) + 'H128L172 ' + fix(cy - h2) + 'H292M8 ' + fix(cy + h1) + 'H128L172 ' + fix(cy + h2) + 'H292';
                return svgOf('', W, H, 'The pipe, the water faster where it is narrower', '<path d="M8 ' + fix(cy - h1) + 'H128L172 ' + fix(cy - h2) + 'H292V' + fix(cy + h2) + 'H172L128 ' + fix(cy + h1) + 'H8Z" fill="#cfe8ec"/>' +
                    '<path class="calc-sv-seg" d="' + edge + '"/>' + svgArrow(68 - 45 * v1 / top, cy, 68 + 45 * v1 / top, cy, 'calc-sv-curve') + svgArrow(232 - 45 * v2 / top, cy, 232 + 45 * v2 / top, cy, 'calc-sv-curve') +
                    svgText(68, H - 18, 'v₁ ' + shortNum(v1) + ' m/s', 'middle') + svgText(232, H - 18, 'v₂ ' + shortNum(v2) + ' m/s', 'middle') +
                    svgText(150, H - 4, (dP < 0 ? 'Pressure rises ' : 'Pressure falls ') + CalcPhysics.si(Math.abs(dP), 'Pa'), 'middle'));
            }

            function runFlow(n, raw) {
                var a1, a2, v2, dP, none = ['v<sub>2</sub>, m/s', 'Flow, L/s'];
                if (!raw.v1 && !raw.d1 && !raw.d2) return physNone(none);
                if (!(n.v1 > 0 && n.d1 > 0 && n.d2 > 0 && n.rho > 0 && n.g > 0 && isFinite(n.h))) return Object.assign(physNone(none), { warn: true, note: 'v₁, d₁, d₂ and ρ above 0.' });
                a1 = Math.PI * n.d1 * n.d1 / 4;
                a2 = Math.PI * n.d2 * n.d2 / 4;
                v2 = n.v1 * a1 / a2;
                dP = n.rho * (v2 * v2 - n.v1 * n.v1) / 2 + n.rho * n.g * n.h;
                return { rows: drawnTile(pipeDrawing(n.d1, n.d2, n.v1, v2, dP), 'The pipe').concat(physRows([['v<sub>2</sub>, m/s', v2], ['Flow, L/s', n.v1 * a1 * 1000], ['Flow, m³/s', n.v1 * a1], ['Pressure falls, Pa', dP], ['Pressure falls, kPa', dP / 1000]])), cols: 3,
                    note: dP < 0 ? 'Below 0: the pressure rises, the pipe wider.' : 'Narrower, faster, and the pressure lower.' };
            }

            function runReynolds(n, raw) {
                var re = n.rho * n.v * n.d / n.mu, laminar = re < 2300, f, q, dp, rows, none = ['Re', 'f'];
                if (!raw.v && !raw.d) return physNone(none);
                if (!(n.v > 0 && n.d > 0 && n.rho > 0 && n.mu > 0 && n.e >= 0)) return Object.assign(physNone(none), { warn: true, note: 'v, d, ρ and μ above 0, and ε of 0 or more.' });
                f = CalcPhysics.friction(re, n.e / 1000 / n.d);
                q = n.v * Math.PI * n.d * n.d / 4;
                rows = physRows([['Re', re], ['f', f]]).concat([{ l: 'It flows', wide: true, text: laminar ? 'Laminar' : re < 4000 ? 'Transitional' : 'Turbulent' }], physRows([['Flow, L/s', q * 1000]]));
                if (raw.L && n.L > 0) {
                    dp = f * n.L / n.d * n.rho * n.v * n.v / 2;
                    rows = rows.concat(physRows([['Δp, Pa', dp], ['Δp, kPa', dp / 1000], ['Head lost, m', dp / (n.rho * CalcPhysics.g)], ['To pump, W', dp * q]]));
                }
                // laminar, a parabola twice the mean speed in the middle; turbulent, flat across, by the seventh-power law
                return { rows: rows.concat(drawnTile(graphDrawing('Its speed across the pipe, from wall to wall', -1, 1, {
                    fs: [function (x) { return laminar ? 2 * n.v * (1 - x * x) : n.v * 60 / 49 * Math.pow(Math.max(0, 1 - Math.abs(x)), 1 / 7); }, function () { return n.v; }],
                    y: [0, (laminar ? 2 : 60 / 49) * n.v * 1.1], names: ['', 'v'] }), 'Its speed across the pipe, the mean blue')), cols: 2,
                    note: (laminar ? 'Laminar below 2300: f = 64/Re, whatever the roughness.' : re < 4000 ? 'From 2300 to 4000 it may go either way: f as if turbulent.' :
                        'Turbulent above 4000: f by Colebrook.') + (raw.L ? '' : ' With L, the pressure it loses.') };
            }

            function runStokes(n, raw) {
                var s = CalcPhysics.stokes(n.r, n.rs, n.rf, n.mu, n.g), V = 4 / 3 * Math.PI * Math.pow(n.r, 3), W, B, none = ['v, m/s', 'Re'];
                if (!raw.r && !raw.rs) return physNone(none);
                if (!s) return Object.assign(physNone(none), { warn: true, note: 'r, ρs, μ and g above 0, and ρf 0 or more.' });
                W = n.rs * V * n.g;
                B = n.rf * V * n.g;
                return { rows: physRows([['v, m/s', s.v], ['v, mm/s', s.v * 1e3], ['Re', s.re], ['Weight, N', W], ['Buoyancy, N', B], ['Drag at v, N', Math.abs(W - B)], ['To 63%, s', s.tau]])
                    .concat(drawnTile(stokesDrawing(W, B), 'Its forces at its last speed')), cols: 2, warn: s.re > 1,
                    note: s.re > 1 ? 'Re above 1: too fast for Stokes\' law, its drag more than 6πμrv, so it goes slower than this.' :
                        tr('{v}Slow and smooth, Re below 1: the drag 6πμrv. At its last speed, drag and buoyancy hold its weight.', { v: (s.v < 0 ? tr('Lighter than the fluid: it rises. ') : '') }) };
            }

            // A ball in a fluid, its weight down from its bottom, red, and the buoyancy and drag on it, of their sizes, the largest 40
            // long, each named by its tip; the drag down where it rises
            function stokesDrawing(W, B) {
                var cx = 150, cy = 56, k = 40 / Math.max(W, B), D = W - B, dy = D > 0 ? -11 : 11, tip = cy + dy - D * k;
                return svgOf('', 300, 112, 'Its weight, the buoyancy and the drag', '<rect class="calc-sv-under" x="0" y="0" width="300" height="112"/>' +
                    '<circle class="calc-sv-mid" cx="' + cx + '" cy="' + cy + '" r="14"/>' + svgArrow(cx, cy + 14, cx, cy + 14 + W * k, 'calc-sv-curve') +
                    svgArrow(cx - 8, cy - 11, cx - 8, cy - 11 - B * k) + svgArrow(cx + 8, cy + dy, cx + 8, tip) +
                    svgText(cx - 6, cy + 14 + W * k, 'Weight', 'end', 'calc-sv-small calc-sv-red') + svgText(cx - 14, cy - 3 - B * k, 'Buoyancy', 'end') +
                    svgText(cx + 14, tip + (D > 0 ? 8 : 0), 'Drag', 'start'));
            }

            function runMassEnergy(n, raw) {
                var m, E, none = ['m, kg', 'E, J'];
                if (!raw.x) return physNone(none);
                if (!(n.x > 0)) return Object.assign(physNone(none), { warn: true, note: 'It is above 0.' });
                m = raw.of === '1' ? n.x / (LIGHT * LIGHT) : n.x;
                E = m * LIGHT * LIGHT;
                return { rows: physRows([['m, kg', m], ['E, J', E], ['E, eV', E / CHARGE], ['E, kWh', E / 3.6e6], ['TNT, tonnes', E / 4.184e9]]), cols: 2, note: 'A gram is some 21 kilotonnes of TNT.' };
            }

            // The binding energy of each nucleon of the stable nuclei, rough, by the liquid drop: of A, its Z where it is most stable, in MeV
            function dropEnergy(a) {
                var z = a / (2 + 0.0155 * Math.pow(a, 2 / 3));
                return a < 2 ? 0 : Math.max(0, (15.75 * a - 17.8 * Math.pow(a, 2 / 3) - 0.711 * z * (z - 1) / Math.cbrt(a) - 23.7 * Math.pow(a - 2 * z, 2) / a) / a);
            }

            function runBinding(n, raw) {
                var r = CalcPhysics.binding(n.Z, n.A, n.m), el = typeof CalcChem !== 'undefined' && CalcChem.elements[n.Z - 1], rows, graph, none = ['E, MeV', 'Each nucleon, MeV'];
                if (!raw.Z && !raw.A && !raw.m) return physNone(none);
                if (!r) return Object.assign(physNone(none), { warn: true, note: 'Whole numbers, Z 1 or more and A not below it, and a mass above 0.' });
                rows = (el ? [{ l: 'The nucleus', wide: true, text: el.name + '-' + n.A }] : []).concat(physRows([['E, MeV', r.mev], ['Each nucleon, MeV', r.each], ['Δm, u', r.defect], ['Δm, kg', r.defect * 1.66053906892e-27],
                    ['E, J', r.mev * 1e6 * CHARGE], ['Neutrons', n.A - n.Z]]));
                graph = curveDrawing('Binding energy of each nucleon', 250, 0, 9.6, dropEnergy, { marks: [[56, 'Fe'], [235, 'U']], names: ['', 'MeV'], point: n.A <= 250 && r.each > 0 ? [n.A, r.each] : null });
                rows.push({ l: 'Each nucleon, by A', wide: true, text: graph });
                return { rows: rows, cols: 2, note: r.mev < 0 ? 'Below 0: it would fly apart.' : 'Iron and nickel the most tightly bound: fusing lighter nuclei, or splitting heavier, gives energy. Drawn rough, by the liquid drop.' };
            }

            // the masses typed with + between them, 234.043601 + 4.002602, each a number or a calculation, 2 × 1.008665: each, or
            // null where one is not above 0. 1e+3 and a bracket's + stay in their part
            function massesOf(text) {
                var bits = String(text).split('+'), parts = [], s = '', i;
                for (i = 0; i < bits.length; i++) {
                    s += (i && s ? '+' : '') + bits[i];
                    if (i < bits.length - 1 && (/\de\s*$/i.test(s) || s.split('(').length > s.split(')').length)) continue;
                    parts.push(CalcMaths.number(s.trim(), engine.comma, app.deg));
                    s = '';
                }
                return parts.every(function (m) { return m > 0; }) ? parts : null;
            }

            function runQValue(n, raw) {
                var a = raw.a ? massesOf(raw.a) : null, b = raw.b ? massesOf(raw.b) : null, sum = function (l) { return l.reduce(function (s, m) { return s + m; }, 0); },
                    dm, Q, rows, two, none = ['Q, MeV', 'Δm, u'];
                if (raw.a && !a || raw.b && !b) return Object.assign(physNone(none), { cols: 2, bad: [raw.a && !a ? 'a' : '', raw.b && !b ? 'b' : ''].filter(Boolean), warn: true, note: 'Masses above 0, in u, + between them.' });
                if (!a || !b) return Object.assign(physNone(none), { cols: 2 });
                dm = Math.round((sum(a) - sum(b)) * 1e10) / 1e10; // to 10⁻¹⁰ u, past the digits masses are known to, so 238.050788 – 238.046203 is 0.004585
                Q = dm * 931.49410372;
                two = a.length === 1 && b.length === 2 && Q > 0; // a decay into two, from rest: their momenta alike, the lighter faster
                rows = physRows([['Q, MeV', Q], ['Δm, u', dm], ['Q, J', Q * 1e6 * CHARGE]]).concat([{ l: 'It', wide: true, text: Q > 0 ? 'Gives energy off, exothermic' : Q < 0 ? 'Takes energy in, endothermic' : 'Neither gives energy nor takes it' }]);
                if (two) rows = rows.concat(physRows([['The first, MeV', Q * b[1] / (b[0] + b[1])], ['The second, MeV', Q * b[0] / (b[0] + b[1])]]), drawnTile(decayDrawing(b, Q), 'Flying apart, at their speeds'));
                return { rows: rows, cols: 2, warn: a.length === 1 && Q < 0,
                    note: a.length === 1 && Q < 0 ? 'Below 0: it cannot decay so on its own.' : tr('Of the atoms\' masses, the electrons cancel; of β⁺ decay, add two electrons\' mass after, 0.001097 u.{v}', { v: (two ? tr(' Shared as momentum is kept.') : '') }) };
            }

            // a nucleus decayed into two of the masses m, flying apart from where it was, each at a speed of 1 over its mass, the faster's
            // arrow 100 long; each as big as the cube root of its mass, its share of Q under its arrow
            function decayDrawing(m, Q) {
                var r = m.map(function (x) { return Math.min(22, 4 + 3 * Math.cbrt(x)); }), L = m.map(function (x) { return 100 * Math.min(m[0], m[1]) / x; }), cy = 46,
                    x = [150 - r[0] - 2, 150 + r[1] + 2], e = [Q * m[1] / (m[0] + m[1]), Q * m[0] / (m[0] + m[1])], body = '<circle class="calc-sv-guide" cx="150" cy="' + cy + '" r="' + fix(Math.max(r[0], r[1]) + 4) + '"/>';
                [0, 1].forEach(function (i) {
                    var side = i ? 1 : -1, edge = x[i] + side * r[i];
                    body += '<circle class="calc-sv-fill" cx="' + fix(x[i]) + '" cy="' + cy + '" r="' + fix(r[i]) + '"/>' + svgArrow(edge + side * 3, cy, edge + side * (3 + Math.max(L[i], 4)), cy, 'calc-sv-curve') +
                        svgText(edge + side * (3 + Math.max(L[i], 4) / 2), cy + 36, local(String(+e[i].toPrecision(3))) + ' MeV', 'middle');
                });
                return svgOf('', 300, 90, 'The two flying apart, at their speeds', body);
            }

            function runPhotoelectric(n, raw) {
                var f, E, k, rows, none = ['E<sub>k</sub>, eV', 'Stopping, V'];
                if (!raw.x || !raw.phi) return physNone(none);
                if (!(n.x > 0 && n.phi > 0)) return Object.assign(physNone(none), { warn: true, note: 'The light and φ above 0.' });
                f = raw.light === '1' ? n.x : LIGHT / (n.x * 1e-9);
                E = PLANCK * f / CHARGE;
                k = E - n.phi;
                rows = physRows([['Photon, eV', E], ['E<sub>k</sub>, eV', Math.max(0, k)], ['Stopping, V', Math.max(0, k)], ['Threshold f, Hz', n.phi * CHARGE / PLANCK], ['Threshold λ, nm', PLANCK * LIGHT / (n.phi * CHARGE) * 1e9]]
                    .concat(k > 0 ? [['Electron speed, m/s', Math.sqrt(2 * k * CHARGE / PARTICLES[0])]] : []));
                rows.push({ l: 'Electrons', wide: true, text: k > 0 ? 'Knocked out' : 'None: a photon has less energy than φ' });
                rows = rows.concat(drawnTile(graphDrawing('Their energy at each frequency', 0, Math.max(f, 2 * n.phi * CHARGE / PLANCK) * 1.25, { fs: [function (x) { return Math.max(0, PLANCK * x / CHARGE - n.phi); }],
                    dots: [[f, Math.max(0, k)]], marks: [[n.phi * CHARGE / PLANCK, 'f₀']], names: ['f', 'E<tspan baseline-shift="sub" font-size="7">k</tspan>'] }), 'E<sub>k</sub> against f, from f₀'));
                return { rows: rows, cols: 2, note: k > 0 ? 'Brighter light, more electrons, but none faster.' : 'Brighter light does not help: a shorter wavelength does.' };
            }

            function runDeBroglie(n, raw) {
                var m = particleMass(n, raw), mc2, g, p, k, v, none = ['λ, m', 'p, kg·m/s'];
                if (!raw.x) return physNone(none);
                if (!(m > 0 && n.x > 0 && (raw.by === '1' || n.x < LIGHT))) return Object.assign(physNone(none), { warn: true, note: raw.by === '1' ? 'A mass and an energy above 0.' : 'A mass above 0, and a speed above 0 and below light\'s.' });
                mc2 = m * LIGHT * LIGHT;
                if (raw.by === '1') {
                    k = n.x * CHARGE;
                    p = Math.sqrt(k * k + 2 * k * mc2) / LIGHT;
                    g = 1 + k / mc2;
                    v = p / (g * m);
                } else {
                    v = n.x;
                    g = 1 / Math.sqrt(1 - v * v / (LIGHT * LIGHT));
                    p = g * m * v;
                    k = (g - 1) * mc2;
                }
                return { rows: physRows([['λ, m', PLANCK / p], ['λ, nm', PLANCK / p * 1e9], ['p, kg·m/s', p], ['v, m/s', v], ['E<sub>k</sub>, eV', k / CHARGE], ['γ', g]]), cols: 2,
                    note: g > 1.01 ? 'Near the speed of light: worked out by relativity.' : 'Slow enough for Newton: γ is about 1.' };
            }

            function runUncertainty(n, raw) {
                var of = +raw.of || 0, m = particleMass(n, raw), dp, dE, none = [['Δp, kg·m/s', 'Δv, m/s'], ['Δx, m', 'Δv, m/s'], ['Δt, s'], ['ΔE, eV']][of];
                if (!raw.x) return physNone(none);
                if (!(n.x > 0 && (of > 1 || m > 0))) return Object.assign(physNone(none), { warn: true, note: of > 1 ? 'It is above 0.' : 'It and the mass are above 0.' });
                if (of < 2) {
                    dp = of === 0 ? HBAR / (2 * n.x) : n.x;
                    return { rows: physRows([[of === 0 ? 'Δp, kg·m/s' : 'Δx, m', of === 0 ? dp : HBAR / (2 * n.x)], ['Δv, m/s', dp / m], ['Least energy, eV', dp * dp / (2 * m) / CHARGE]]), cols: 2,
                        note: 'The least each can be: Δx Δp ≥ ħ/2. Its energy at least, about, of momentum so uncertain.' };
                }
                dE = of === 2 ? n.x * CHARGE : HBAR / (2 * n.x);
                return { rows: physRows(of === 2 ? [['Δt, s', HBAR / (2 * dE)]] : [['ΔE, eV', dE / CHARGE], ['ΔE, J', dE], ['Line width, Hz', dE / PLANCK]]), cols: 2,
                    note: of === 2 ? 'A state so uncertain in energy lasts about this long, at most.' : 'A state lasting Δt is uncertain in energy by this at least: its line is so wide.' };
            }

            function runBox(n, raw) {
                var m = particleMass(n, raw), e1, en, down, rows, none = ['E<sub>n</sub>, eV', 'E<sub>1</sub>, eV'];
                if (!raw.L) return physNone(none);
                if (!(m > 0 && n.L > 0 && n.n >= 1 && n.n % 1 === 0)) return Object.assign(physNone(none), { warn: true, note: 'The mass and L above 0, and n a whole number, 1 or more.' });
                e1 = PLANCK * PLANCK / (8 * m * n.L * n.L);
                en = n.n * n.n * e1;
                rows = physRows([['E<sub>n</sub>, eV', en / CHARGE], ['E<sub>1</sub>, eV', e1 / CHARGE], ['E<sub>n</sub>, J', en], ['Up to n + 1, eV', (2 * n.n + 1) * e1 / CHARGE]]);
                if (n.n > 1) {
                    down = PLANCK * LIGHT / ((2 * n.n - 1) * e1) * 1e9;
                    rows = rows.concat(physRows([['Down to n – 1, λ nm', down]]), [{ l: 'Light', wide: true, text: lightKind(down) }]);
                }
                if (n.n <= 30) rows.push({ l: 'Its levels, and its wave at n', wide: true, text: boxDrawing(n.n) });
                return { rows: rows, cols: 2, note: n.n > 1 ? 'The levels grow as n²: wider apart going up.' : 'Its lowest: it is never still, never of energy 0.' };
            }

            // A box's levels, as n², to the one above n, and the wave of the level n on its line
            function boxDrawing(n) {
                var W = 300, H = 130, a = 80, b = 220, bottom = H - 8, top = 14, K = Math.max(n + 1, 3), body = '', d = '', i, u,
                    y = function (k) { return bottom - (bottom - top) * k * k / (K * K); }, amp = Math.min(18, 0.45 * (y(n) - y(n + 1)), n > 1 ? 0.45 * (y(n - 1) - y(n)) : 18);
                body += '<path class="calc-sv-seg" d="M' + a + ' ' + (top - 8) + 'V' + bottom + 'H' + b + 'V' + (top - 8) + '"/>';
                for (i = 1; i <= K; i++) {
                    if (K > 12 && i !== n && i !== K && i % Math.ceil(K / 8)) continue;
                    body += '<path class="' + (i === n ? 'calc-sv-ground' : 'calc-sv-guide') + '" d="M' + a + ' ' + fix(y(i)) + 'H' + b + '"/>' + svgText(b + 8, y(i) + 4, 'n = ' + i);
                }
                for (i = 0; i <= 120; i++) {
                    u = i / 120;
                    d += (i ? 'L' : 'M') + fix(a + (b - a) * u) + ' ' + fix(y(n) - amp * Math.sin(n * Math.PI * u));
                }
                return svgOf('', W, H, 'Its levels, and its wave at n', body + '<path class="calc-sv-curve" d="' + d + '"/>');
            }

            // A wave meeting a barrier of height V, its energy E: through it dying away, below its top, or going on, above it,
            // and past it of the height its chance gives. Drawn as it goes, not to scale
            function barrierDrawing(E, V, t) {
                var W = 300, H = 100, base = H - 6, k = (H - 30) / Math.max(E, V, 1e-12), A = 9, ey = Math.min(base - E * k, base - A - 2), a = 125, b = 175, lam = 26, out = Math.sqrt(t), d = '', x, u, in2;
                for (x = 6; x <= W - 6; x += 1.5) {
                    if (x < a) u = A * Math.cos(2 * Math.PI * (x - a) / lam);
                    else if (x > b) u = A * out * Math.cos(2 * Math.PI * (x - b) / lam);
                    else {
                        in2 = (x - a) / (b - a);
                        u = A * Math.pow(Math.max(out, 0.02), in2) * (E < V ? 1 : Math.cos(2 * Math.PI * (x - a) / (lam * Math.sqrt(E / Math.max(E - V, 1e-12)))));
                    }
                    d += (d ? 'L' : 'M') + fix(x) + ' ' + fix(ey - u);
                }
                return svgOf('', W, H, 'The wave and the barrier', '<rect class="calc-sv-fill" x="' + a + '" y="' + fix(base - V * k) + '" width="' + (b - a) + '" height="' + fix(V * k) + '"/>' +
                    '<path class="calc-sv-ground" d="M4 ' + base + 'H' + (W - 4) + '"/><path class="calc-sv-guide" d="M4 ' + fix(ey) + 'H' + (W - 4) + '"/>' + svgText(8, ey - A - 4, 'E') +
                    svgText((a + b) / 2, base - V * k - 5, 'V', 'middle') + '<path class="calc-sv-curve" d="' + d + '"/>');
            }

            // a photon coming in, scattered off an electron at θ, its wave longer after, and the electron sent off at φ the other side
            function comptonDrawing(t, l0, l1, e0) {
                var W = 300, H = 136, ex = 150, ey = 72, w0 = 9, w1 = Math.min(30, w0 * l1 / l0), phi = t > 1e-9 ? Math.atan(1 / ((1 + e0 / 510.999) * Math.tan(t / 2))) : 0, body;
                function wave(x0, y0, a, len, w) { // along a from x0, y0, len long, of wavelength w
                    var d = '', i, c = Math.cos(a), s = Math.sin(a);
                    for (i = 0; i <= len; i += 1) d += (i ? 'L' : 'M') + fix(x0 + c * i - s * 4 * Math.sin(2 * Math.PI * i / w)) + ' ' + fix(y0 + s * i + c * 4 * Math.sin(2 * Math.PI * i / w));
                    return '<path class="calc-sv-curve calc-sv-thin" d="' + d + '"/>';
                }
                body = '<path class="calc-sv-guide" d="M' + ex + ' ' + ey + 'H' + (W - 20) + '"/>' + wave(14, ey, 0, ex - 20, w0) + svgText(40, ey - 10, 'λ', 'middle', 'calc-sv-small calc-sv-red') +
                    wave(ex + 6 * Math.cos(-t), ey + 6 * Math.sin(-t), -t, 50, w1) + svgText(ex + 64 * Math.cos(-t) + 8 * Math.sin(t), ey + 64 * Math.sin(-t) + 4, 'λ′', Math.cos(t) < -0.3 ? 'end' : 'middle', 'calc-sv-small calc-sv-red') +
                    (t > 1e-9 ? '<path class="calc-sv-guide" d="M' + (ex + 26) + ' ' + ey + 'A26 26 0 ' + (t > Math.PI ? 1 : 0) + ' 0 ' + fix(ex + 26 * Math.cos(t)) + ' ' + fix(ey - 26 * Math.sin(t)) + '"/>' +
                        svgText(ex + 34 * Math.cos(t / 2), ey - 34 * Math.sin(t / 2) + 4, 'θ', 'middle') + svgArrow(ex, ey, ex + 50 * Math.cos(phi), ey + 50 * Math.sin(phi), 'calc-sv-seg') +
                        svgText(ex + 58 * Math.cos(phi), ey + 58 * Math.sin(phi) + 4, 'e⁻', 'start') : '') +
                    '<circle class="calc-sv-mid" cx="' + ex + '" cy="' + ey + '" r="3.5"/>';
                return svgOf('', W, H, 'The photon in, scattered at θ, its wave longer, and the electron sent off', body);
            }

            function runCompton(n, raw) {
                var l0 = raw.by === '1' ? PLANCK * LIGHT / (n.x * 1e3 * CHARGE) : n.x * 1e-12, t = raw.a ? toRadians(n.a) : Math.PI / 2, l1, e0, e1, none = ['λ′, pm', 'E′, keV'];
                if (!raw.x) return physNone(none);
                if (!(n.x > 0 && isFinite(t))) return Object.assign(physNone(none), { warn: true, note: 'It is above 0.' });
                l1 = CalcPhysics.compton(l0, t);
                e0 = PLANCK * LIGHT / l0 / CHARGE / 1e3;
                e1 = PLANCK * LIGHT / l1 / CHARGE / 1e3;
                return { rows: drawnTile(comptonDrawing(t, l0, l1, e0), 'Scattered').concat(physRows([['λ′, pm', l1 * 1e12], ['Δλ, pm', (l1 - l0) * 1e12], ['E, keV', e0], ['E′, keV', e1], ['To the electron, keV', e0 - e1], ['Lost, %', 100 * (e0 - e1) / e0]])), cols: 2,
                    note: 'At most, straight back, Δλ is 2h/mₑc, 4.85 pm.' };
            }

            function runTunnel(n, raw) {
                var m = particleMass(n, raw), r, rows, none = ['T, %', 'T'];
                if (!raw.E || !raw.V || !raw.L) return physNone(none);
                r = CalcPhysics.tunnel(m, n.E, n.V, n.L);
                if (!r) return Object.assign(physNone(none), { warn: true, note: 'The mass and E above 0, V and L 0 or more.' });
                rows = [['T, %', 100 * r.t], ['T', r.t], ['Reflected, %', 100 * (1 - r.t)]];
                if (r.kappa) rows.push(['κ, 1/m', r.kappa], ['Dies within, m', 1 / r.kappa], ['e<sup>–2κL</sup>, rough', r.rough]);
                return { rows: physRows(rows).concat([{ l: 'The wave, not to scale', wide: true, text: barrierDrawing(n.E, n.V, r.t) }]), cols: 3,
                    note: n.E < n.V ? 'Below the barrier: by Newton it could never cross.' : 'Over the barrier, yet some of it is reflected.' };
            }

            function runRelativity(n, raw) {
                var b = raw.by === '1' ? n.x : n.x / LIGHT, g, v, rows, none = ['γ', 'v/c'];
                if (!raw.x) return physNone(none);
                if (!(b >= 0 && b < 1)) return Object.assign(physNone(none), { warn: true, note: 'A speed of 0 or more, below light\'s.' });
                g = 1 / Math.sqrt(1 - b * b);
                v = b * LIGHT;
                rows = [['γ', g], ['v/c', b], ['v, m/s', v], ['1 s of its is, s', g], ['1 m of it is, m', 1 / g]];
                if (raw.m && n.m > 0) rows.push(['p, kg·m/s', g * n.m * v], ['p by Newton', n.m * v], ['E<sub>k</sub>, J', (g - 1) * n.m * LIGHT * LIGHT], ['E<sub>k</sub> by Newton', n.m * v * v / 2]);
                return { rows: physRows(rows).concat(drawnTile(curveDrawing('γ as it goes faster', 1, 0, Math.min(Math.max(2 * g, 4), 30), function (x) { return 1 / Math.sqrt(1 - x * x); },
                    { at: b, names: ['v/c', 'γ'] }), 'γ against v/c')), cols: 2, note: 'As seen by one standing still: its clocks slower, it shorter along the way it goes.' };
            }

            function runHydrogen(n, raw) {
                // Rydberg's constant of hydrogen, its nucleus not still, and of heavier ones the constant itself
                var R = n.Z === 1 ? 10967758.34 : 10973731.568157, inv, nm, f, rows, none = ['λ, nm', 'E, eV'];
                if (!raw.n1 && !raw.n2) return physNone(none);
                if (!(n.n1 >= 1 && n.n2 > n.n1 && n.n1 % 1 === 0 && n.n2 % 1 === 0 && n.Z >= 1 && n.Z % 1 === 0)) return Object.assign(physNone(none), { warn: true, note: 'Whole numbers: n₁ 1 or more, n₂ above it, Z 1 or more.' });
                inv = R * n.Z * n.Z * (1 / (n.n1 * n.n1) - 1 / (n.n2 * n.n2));
                nm = 1e9 / inv;
                f = LIGHT * inv;
                // and by Bohr, the levels, the size of each orbit, a₀n²/Z, and the electron's speed in it, αcZ/n
                rows = physRows([['λ, nm', nm], ['E, eV', PLANCK * f / CHARGE], ['f, Hz', f], ['Level n₁, eV', -PLANCK * LIGHT * R * n.Z * n.Z / (n.n1 * n.n1) / CHARGE],
                    ['Level n₂, eV', -PLANCK * LIGHT * R * n.Z * n.Z / (n.n2 * n.n2) / CHARGE], ['Orbit n₁, m', 5.29177210544e-11 * n.n1 * n.n1 / n.Z], ['Orbit n₂, m', 5.29177210544e-11 * n.n2 * n.n2 / n.Z],
                    ['Speed in n₁, m/s', 7.2973525643e-3 * LIGHT * n.Z / n.n1]]);
                if (n.Z === 1 && CalcPhysics.lineSeries(n.n1)) rows.push({ l: 'Series', wide: true, text: CalcPhysics.lineSeries(n.n1) });
                rows.push({ l: 'Light', wide: true, text: lightKind(nm) });
                if (n.n2 <= 40) rows.push({ l: 'Its levels, the fall', wide: true, text: levelsDrawing(n.n1, n.n2, nmColour(nm)) });
                return { rows: rows, cols: 2, note: 'Wavelengths in a vacuum; in air some 0.03% shorter.' };
            }

            // The levels of hydrogen, at –1/n² of the lowest, to above n₂, and the electron falling from n₂ to n₁, in its light's colour
            function levelsDrawing(n1, n2, col) {
                var W = 300, H = 130, top = 12, bottom = H - 8, a = 60, b = 250, last = 999, body = '', i, y = function (k) { return top + (bottom - top) / (k * k); }, K = Math.max(n2 + 1, 6);
                body += '<path class="calc-sv-guide" d="M' + a + ' ' + top + 'H' + b + '"/>' + svgText(a - 8, top + 4, '∞', 'end');
                for (i = 1; i <= K; i++) {
                    body += '<path class="' + (i === n1 || i === n2 ? 'calc-sv-ground' : 'calc-sv-axis') + '" d="M' + a + ' ' + fix(y(i)) + 'H' + b + '"/>';
                    if (last - y(i) > 10 && y(i) - top > 9 || i === n1) { // not crowding the one below, nor ∞
                        body += svgText(a - 8, y(i) + 4, 'n = ' + i, 'end');
                        last = y(i);
                    }
                }
                return svgOf('', W, H, 'Its levels, and the fall', body + '<g' + (col ? ' style="color: ' + col + '"' : '') + '>' +
                    svgArrow(a + (b - a) * 0.55, y(n2), a + (b - a) * 0.55, y(n1), col ? 'calc-sv-lit' : 'calc-sv-curve') + '</g>');
            }

            function runRadioactive(n, raw) {
                var unit = +raw.unit || 0, sec = [1, 60, 3600, 86400, 31557600][unit], name = ['sec', 'min', 'hr', 'day', 'year'][unit], lambda = Math.LN2 / n.T, rows, x1, none = ['Left', 'Left, %'];
                if (!raw.T) return physNone(none);
                if (!(n.T > 0 && (!raw.N || n.N > 0) && (!raw.t || n.t >= 0) && (!raw.pc || (n.pc > 0 && n.pc < 100)))) {
                    return Object.assign(physNone(none), { warn: true, note: 'T and N₀ above 0, t of 0 or more, and a percent between 0 and 100.' });
                }
                rows = [];
                if (raw.t) rows.push(['Left, %', 100 * Math.pow(0.5, n.t / n.T)], ['Decayed, %', 100 * -Math.expm1(-lambda * n.t)]);
                if (raw.t && raw.N) rows.unshift(['Left', n.N * Math.pow(0.5, n.t / n.T)]);
                rows.push([tr('λ, per {name}', { name: name }), lambda], [tr('Mean life, {name}', { name: name }), 1 / lambda]);
                if (raw.pc) rows.push(['To ' + local(String(n.pc)) + '%, ' + name, n.T * Math.log2(100 / n.pc)]);
                if (raw.N) rows.push(['Of N₀ atoms, Bq', lambda / sec * n.N], ['Of N₀ atoms, Ci', lambda / sec * n.N / 3.7e10]);
                x1 = Math.max(4.4 * n.T, raw.t ? n.t * 1.1 : 0);
                rows = physRows(rows).concat([{ l: 'What is left, by half-lives', wide: true, text: curveDrawing('What is left over time', x1, 0, 1, function (t) { return Math.pow(0.5, t / n.T); },
                    { under: true, at: raw.t ? n.t : undefined, marks: [[n.T, 'T'], [2 * n.T, '2T'], [3 * n.T, '3T'], [4 * n.T, '4T']].filter(function (m) { return m[0] < x1 * 0.97; }) }) }]);
                return { rows: rows, cols: 2, note: raw.N ? 'The activity where N₀ counts atoms.' : 'With N₀, what is left of it.' };
            }

            var phys = toolPanel(physPanel, physButton, PHYS_TOOLS, 'phys', 'phys');
            toolPanels.push(phys);

            function showPhys(open) {
                phys.show(open);
            }

    };
})(typeof window !== 'undefined' ? window : this);
