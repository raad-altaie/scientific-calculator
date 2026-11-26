// The panel of chemistry: the periodic table, its elements' cards, and the cards of the chemistry worked out, over
// the keys or in a window of its own. chem.js is the chemistry itself; this is how the calculator shows it. Made by
// main.js as it starts, CalcChemPanel(app, shared): app is what the panel takes from the rest of the calculator,
// its words, its drawings and the like, those that change read as they are now; shared is filled with what the
// calculator takes from the panel, before the panel starts, as it calls back while it does
(function (global) {
    'use strict';

    global.CalcChemPanel = function (app, shared) {
        var ask = app.ask, bigSide = app.bigSide, bio = app.bio, bioButton = app.bioButton, closePanels = app.closePanels,
            convButton = app.convButton, convFocus = app.convFocus, convSearch = app.convSearch, convTabs = app.convTabs,
            curveDrawing = app.curveDrawing, drawPageCurve = app.drawPageCurve, drawnTile = app.drawnTile, engine = app.engine,
            escaped = app.escaped, fadeEdges = app.fadeEdges, fix = app.fix, focusBox = app.focusBox, fxButton = app.fxButton,
            graphButton = app.graphButton, graphDrawing = app.graphDrawing, hideTip = app.hideTip, keyBoard = app.keyBoard,
            labelBars = app.labelBars, listTyped = app.listTyped, local = app.local, mayPut = app.mayPut, nmColour = app.nmColour,
            numbers = app.numbers, numbersButton = app.numbersButton, phys = app.phys, physButton = app.physButton,
            placePanel = app.placePanel, popIn = app.popIn, rainbow = app.rainbow, refresh = app.refresh, root = app.root,
            rtlDraw = app.rtlDraw, saveConv = app.saveConv, saveState = app.saveState, scale = app.scale, setStatsTab = app.setStatsTab,
            shortNum = app.shortNum, showConv = app.showConv, showFxItem = app.showFxItem, showMenu = app.showMenu,
            showStats = app.showStats, solveButton = app.solveButton, solver = app.solver, statsButton = app.statsButton,
            statsInput = app.statsInput, statsValue = app.statsValue, store = app.store, svgArrow = app.svgArrow, svgOf = app.svgOf,
            svgText = app.svgText, toggleFraction = app.toggleFraction, toolCards = app.toolCards, touchScreen = app.touchScreen,
            tr = app.tr, trc = app.trc, trn = app.trn, unselect = app.unselect;

        // what the calculator takes from the panel
        Object.defineProperties(shared, Object.getOwnPropertyDescriptors({
            get CHEM_TOOLS() { return CHEM_TOOLS; },
            get chemAlone() { return chemAlone; },
            chemBig: chemBig,
            get chemButton() { return chemButton; },
            get chemCards() { return chemCards; },
            chemFactPeek: chemFactPeek,
            chemGoTo: chemGoTo,
            get chemPanel() { return chemPanel; },
            get chemSliding() { return chemSliding; },
            chemTip: chemTip,
            clearChem: clearChem,
            closeChem: closeChem,
            loadChem: loadChem,
            renderChem: renderChem,
            saveChem: saveChem,
            showChem: showChem
        }));

            // ---------------- chemistry ---------------- //

            // The periodic table, and the chemistry worked out with it (chem.js), on tabs: a card for each tool, as the
            // solver has. A formula is typed as it is written, CuSO4·5H2O, Ca(OH)2, Fe^3+; an equation with = or →
            var CHEM_PH = ['[H<sup>+</sup>]', '[OH<sup>–</sup>]', 'pH', 'pOH'],
                GAS_R = [0.082057366080960, 8.314462618, 62.363598221529, 0.08314462618], // L·unit/(mol·K): atm, kPa, mmHg, bar
                GAS_PU = ['atm', 'kPa', 'mmHg', 'bar'], GAS_P = [1, 101.325, 760, 1.01325], // the units of a pressure, and how many of each an atm is
                // of each solvent of the freezing and boiling point, its formula on its button: Kf and Kb in °C·kg/mol, the points
                // it freezes and boils at, °C, and its name
                SOLVENTS = [[1.86, 0.512, 0, 100, 'Water'], [5.12, 2.53, 5.5, 80.1, 'Benzene'], [20.0, 2.79, 6.6, 80.7, 'Cyclohexane']],
                CHEM_TOOLS = {
                    mass: [
                        { id: 'molar', t: 'Molar mass', f: ['M', '% by mass'], d: 'The molar mass of a formula, in g/mol, and how much of it each element is: CuSO4·5H2O, Ca(OH)2, (NH4)2SO4, K4[Fe(CN)6]. An ion\'s charge after ^, Fe^3+.',
                            fields: [{ k: 'f', l: 'Formula', ph: 'CuSO4·5H2O', fn: true }], run: runMolar, example: { f: 'Ca(OH)2' } },
                        { id: 'moles', t: 'Grams and moles', f: ['n = m ÷ M', 'N = n N<sub>A</sub>'], d: 'Mass, moles and particles of a substance: type one, and the others are worked out from its molar mass and the Avogadro constant.',
                            fields: [{ k: 'f', l: 'Formula', ph: 'H2O', fn: true }, { k: 'm', l: 'Mass, g', ph: 'or' }, { k: 'n', l: 'Moles', ph: 'or' }, { k: 'p', l: 'Particles', ph: 'or' }], cols: 3,
                            run: runMoles, example: { f: 'H2O', m: '36' } },
                        { id: 'empirical', t: 'Empirical formula', f: ['CH<sub>2</sub>O', 'C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>'], d: 'The simplest formula of a composition, the percent or grams of each element: C 40, H 6.71, O 53.29. With its molar mass, the molecular formula as well.',
                            fields: [{ k: 'c', l: 'Composition', ph: 'C 40, H 6.71, O 53.29', fn: true }, { k: 'M', l: 'Molar mass', ph: 'optional' }], run: runEmpirical,
                            example: function () { return { c: listTyped(['C 40', 'H 6.71', 'O 53.29']), M: '180.16' }; } }
                    ],
                    reactions: [
                        { id: 'balance', t: 'Balance an equation', f: 'Fe + O<sub>2</sub> → Fe<sub>2</sub>O<sub>3</sub>', d: 'The smallest whole numbers in front of each formula, so each element and the charge are the same on both sides; and what kind of reaction it is. ' +
                            'Write = or → between the sides, + between the formulas; ions with their charge, Fe^3+, and e- for an electron.',
                            fields: [{ k: 'eq', l: 'Equation', ph: 'Fe + O2 = Fe2O3', fn: true }], run: runBalance, example: { eq: 'C3H8 + O2 = CO2 + H2O' } },
                        { id: 'stoich', t: 'Amounts and limiting reactant', f: ['g ⇄ mol', 'limiting', '% yield'], d: 'From the amount of one formula, all the others of the reaction. Of two reactants or more, the one that runs out first and what is left of the others; ' +
                            'of a product as well, its percent yield. Amounts in g, or with kg, mg or mol after them: Fe 10, O2 5 g.',
                            fields: [{ k: 'eq', l: 'Equation', ph: 'Fe + O2 = Fe2O3', fn: true }, { k: 'a', l: 'Amounts', ph: 'Fe 10 g, O2 5 g', fn: true }], run: runStoich,
                            example: function () { return { eq: 'N2 + H2 = NH3', a: listTyped(['N2 28 g', 'H2 10 g', 'NH3 25 g']) }; } },
                        { id: 'worksheet', t: 'Worksheet', f: ['Practice', 'Answer key'], d: 'Equations to balance, or to name the kind of reaction of, at three levels, with the answers under them to check by. ' +
                            'Again for new ones; Copy for the questions or the answers, to print.',
                            fields: [{ k: 'ex', l: 'Exercise', choice: ['Balance', 'Kind', 'Both'] }, { k: 'lv', l: 'Level', choice: ['Easy', 'Medium', 'Hard'] },
                                { k: 'n', l: 'Questions', choice: ['5', '10', '20'], at: 1 }], again: true, run: runWorksheet },
                        { id: 'heat', t: 'Heat', f: 'q = mcΔT', d: 'The heat that warms or cools a mass, as in a calorimeter: leave one of q, m, c and ΔT empty and it is worked out. c of water is 4.184 J/(g·°C).',
                            fields: [{ k: 'q', l: 'q, J', ph: 'or' }, { k: 'm', l: 'm, g', ph: 'or' }, { k: 'c', l: 'c, J/(g·°C)', ph: 'or' }, { k: 't', l: 'ΔT, °C', ph: 'or' }], cols: 2,
                            run: runHeat, example: { m: '100', c: '4.184', t: '25' } },
                        { id: 'decay', t: 'Half-life', f: 'N = N<sub>0</sub>(½)<sup>t ÷ t½</sup>', d: 'What is left of a radioactive substance, or of a first-order reaction, after a time: leave one of N₀, N, t and t½ empty. The same unit of time for t and t½.',
                            fields: [{ k: 'n0', l: 'N<sub>0</sub>', name: 'N₀', ph: 'or' }, { k: 'n', l: 'N', ph: 'or' }, { k: 't', l: 't', ph: 'or' }, { k: 'h', l: 't½', ph: 'or' }], cols: 2,
                            drawnLast: true, run: runDecay, example: { n0: '100', t: '10', h: '5.27' } }
                    ],
                    solutions: [
                        { id: 'molarity', t: 'Molarity', f: 'c = n ÷ V', d: 'The concentration of a solution, in mol/L: leave one of mass, volume and molarity empty. Without a formula, type moles in place of the mass.',
                            fields: [{ k: 'f', l: 'Formula', ph: 'NaCl', fn: true }, { k: 'm', l: 'Mass, g', ph: 'or' }, { k: 'n', l: 'Moles', ph: 'or' }, { k: 'v', l: 'Volume, L', ph: 'or' }, { k: 'c', l: 'mol/L', ph: 'or' }], cols: 2,
                            run: runMolarity, example: { f: 'NaCl', m: '5.844', v: '0.25' } },
                        { id: 'dilution', t: 'Dilution', f: 'C<sub>1</sub>V<sub>1</sub> = C<sub>2</sub>V<sub>2</sub>', d: 'A solution made weaker with water: leave one of the four empty and it is worked out. The same units on both sides.',
                            fields: [{ k: 'c1', l: 'C<sub>1</sub>', name: 'C₁', ph: 'or' }, { k: 'v1', l: 'V<sub>1</sub>', name: 'V₁', ph: 'or' }, { k: 'c2', l: 'C<sub>2</sub>', name: 'C₂', ph: 'or' }, { k: 'v2', l: 'V<sub>2</sub>', name: 'V₂', ph: 'or' }], cols: 2,
                            run: runDilution, example: { c1: '2', v1: '50', c2: '0.5' } },
                        { id: 'colligative', t: 'Freezing and boiling point', f: 'ΔT = i K m', d: 'How far a solute lowers the freezing point of a solvent and raises its boiling point: from the molality, ' +
                            'or the grams of solute, its formula and the kg of solvent; or back from ΔT<sub>f</sub> or ΔT<sub>b</sub>, with the grams and kg, to the solute\'s molar mass. i is the particles of each formula unit, from the formula, NaCl 2.',
                            fields: function (raw) {
                                return [{ k: 's', l: 'Solvent', choice: ['H<sub>2</sub>O', 'C<sub>6</sub>H<sub>6</sub>', 'C<sub>6</sub>H<sub>12</sub>', 'Other'] }].concat(raw.s === '3' ? [{ k: 'kf', l: 'K<sub>f</sub>', name: 'Kf', ph: '1.86' }, { k: 'kb', l: 'K<sub>b</sub>', name: 'Kb', ph: '0.512' }] : [],
                                    [{ k: 'f', l: 'Solute', ph: 'NaCl, optional', fn: true }, { k: 'g', l: 'Solute, g', ph: 'or' }, { k: 'kg', l: 'Solvent, kg', ph: '0.5' },
                                        { k: 'm', l: 'm, mol/kg', name: 'm', ph: 'or' }, { k: 'i', l: 'i', ph: 'auto' }, { k: 'tf', l: 'ΔT<sub>f</sub>, °C', name: 'ΔTf', ph: 'or' }, { k: 'tb', l: 'ΔT<sub>b</sub>, °C', name: 'ΔTb', ph: 'or' }]);
                            }, cols: 2, run: runColligative, example: { f: 'NaCl', g: '10', kg: '0.5' } },
                        { id: 'ph', t: 'pH', f: CHEM_PH, d: 'pH, pOH, [H⁺] and [OH⁻] from any one of them, in water at 25 °C, where pH + pOH = 14.',
                            fields: [{ k: 'x', l: 'Value', ph: '0.001' }, { k: 'of', l: 'Of', choice: CHEM_PH }], run: runPh, example: { x: '0.001' } },
                        { id: 'weak', t: 'Weak acid or base', f: ['K<sub>a</sub>', 'K<sub>b</sub>'], d: 'The pH of a weak acid or base from its K<sub>a</sub> or K<sub>b</sub> and its concentration, by the quadratic, not the ½ log approximation; and how much of it ionizes.',
                            fields: [{ k: 'k', l: 'K', ph: '1.8e-5' }, { k: 'c', l: 'mol/L', ph: '0.1' }, { k: 'is', l: 'It is', choice: ['An acid, K<sub>a</sub>', 'A base, K<sub>b</sub>'] }], cols: 2,
                            run: runWeak, example: { k: '1.8e-5', c: '0.1' } },
                        { id: 'buffer', t: 'Buffer', f: 'pH = pK<sub>a</sub> + log([A<sup>–</sup>] ÷ [HA])', d: 'The pH of a buffer, by Henderson–Hasselbalch: its acid HA and its base A⁻. pK<sub>a</sub>, or K<sub>a</sub>, which it takes too.',
                            fields: [{ k: 'pka', l: 'pK<sub>a</sub>', name: 'pKa', ph: '4.76' }, { k: 'a', l: '[A<sup>–</sup>]', name: '[A⁻]', ph: '0.1' }, { k: 'ha', l: '[HA]', ph: '0.1' }], cols: 3,
                            run: runBuffer, example: { pka: '4.76', a: '0.15', ha: '0.1' } },
                        { id: 'soluble', t: 'Solubility', f: ['PbI<sub>2</sub>', 'BaSO<sub>4</sub>'], d: 'Whether a salt dissolves in water, by the usual table at 25 °C, and the rule: ' +
                            'the nitrates, acetates, halides, sulfates, carbonates, phosphates, hydroxides and sulfides of 20 common cations, Li⁺ to Pb²⁺.',
                            fields: [{ k: 'f', l: 'Salt', ph: 'PbI2', fn: true }], run: runSoluble }
                    ],
                    ions: [
                        { id: 'ion', t: 'Ions', f: ['NH<sub>4</sub><sup>+</sup>', 'SO<sub>4</sub><sup>2−</sup>', 'Fe<sup>3+</sup>'], d: 'A common ion by its formula or its name, sulfate, ferric, bicarbonate: its charge and molar mass, ' +
                            'its colour in water and the colour it gives a flame. Empty, all of them.',
                            fields: [{ k: 'f', l: 'Ion', ph: 'SO4^2- or sulfate', fn: true }], run: runIon },
                        { id: 'names', t: 'Names and formulas', f: ['Fe<sub>2</sub>O<sub>3</sub>', 'iron(III) oxide'], d: 'The name of a formula, or the formula of a name: salts, a metal of more than one charge ' +
                            'with it in Roman numerals; acids; two nonmetals with Greek prefixes, dinitrogen tetroxide; hydrates, ions, the elements and common names, water, ammonia.',
                            fields: [{ k: 'f', l: 'Formula or name', ph: 'CuSO4·5H2O or sodium carbonate', fn: true }], run: runNames, example: { f: 'Fe2(SO4)3' } },
                        { id: 'oxidation', t: 'Oxidation numbers', f: ['KMnO<sub>4</sub>', 'Mn +7'], d: 'The oxidation number of each element of a formula or an ion, by the rules: an element alone 0; F −1; ' +
                            'groups 1 and 2 +1 and +2; H +1, −1 with metals; O −2, −1 in a peroxide; and the rest so they add up to the charge.',
                            fields: [{ k: 'f', l: 'Formula', ph: 'K2Cr2O7 or SO4^2-', fn: true }], run: runOxidation, example: { f: 'K2Cr2O7' } }
                    ],
                    gases: [
                        { id: 'gas', t: 'Ideal gas', f: 'PV = nRT', d: 'A gas as the ideal gas law has it: leave one of P, V, n and T empty and it is worked out. V in litres; with a formula, the mass and density as well.',
                            fields: [{ k: 'p', l: 'P', ph: 'or' }, { k: 'v', l: 'V, L', ph: 'or' }, { k: 'n', l: 'n, mol', ph: 'or' }, { k: 't', l: 'T', ph: 'or' },
                                { k: 'pu', l: 'P in', choice: ['atm', 'kPa', 'mmHg', 'bar'] }, { k: 'tu', l: 'T in', choice: ['K', '°C'] }, { k: 'f', l: 'Formula', ph: 'optional', fn: true }], cols: 2,
                            run: runGas, example: { p: '1', n: '1', t: '273.15' } },
                        { id: 'gases', t: 'Combined gas law', f: 'P<sub>1</sub>V<sub>1</sub>/T<sub>1</sub> = P<sub>2</sub>V<sub>2</sub>/T<sub>2</sub>', d: 'A gas whose pressure, volume or temperature changes: leave one of the six empty. Boyle\'s, Charles\'s and Gay-Lussac\'s laws are each of it, the others the same.',
                            fields: [{ k: 'p1', l: 'P<sub>1</sub>', name: 'P₁', ph: 'or' }, { k: 'v1', l: 'V<sub>1</sub>', name: 'V₁', ph: 'or' }, { k: 't1', l: 'T<sub>1</sub>', name: 'T₁', ph: 'or' },
                                { k: 'p2', l: 'P<sub>2</sub>', name: 'P₂', ph: 'or' }, { k: 'v2', l: 'V<sub>2</sub>', name: 'V₂', ph: 'or' }, { k: 't2', l: 'T<sub>2</sub>', name: 'T₂', ph: 'or' },
                                { k: 'tu', l: 'T in', choice: ['K', '°C'] }], cols: 3,
                            run: runGases, example: { p1: '1', v1: '2', t1: '300', p2: '2', t2: '600' } },
                        { id: 'dalton', t: 'Partial pressures', f: ['P = P<sub>1</sub> + P<sub>2</sub> + …', 'P<sub>i</sub> = x<sub>i</sub>P'], d: 'A mixture of gases, by Dalton\'s law: each gas and how much of it, ' +
                            'N2 0.78, O2 0.21, Ar 0.01, in moles, grams, fractions or percent, or its own pressure. With the total P, or V and T, the pressure of each; ' +
                            'of the pressures of each, the total, and with a total typed, the rest of it.',
                            fields: [{ k: 'g', l: 'Gases', ph: 'N2 0.78, O2 0.21, Ar 0.01', fn: true }, { k: 'is', l: 'Each is', choice: ['Moles', 'Grams', 'Fraction or %', 'Its pressure'] },
                                { k: 'p', l: 'P, total', name: 'P', ph: 'or' }, { k: 'v', l: 'V, L', ph: 'optional' }, { k: 't', l: 'T', ph: 'optional' },
                                { k: 'pu', l: 'P in', choice: GAS_PU }, { k: 'tu', l: 'T in', choice: ['K', '°C'] }], cols: 2,
                            run: runDalton, example: function () { return { g: listTyped(['N2 0.78', 'O2 0.21', 'Ar 0.01']), is: '2', p: '1' }; } },
                        { id: 'wet', t: 'Gas over water', f: ['P<sub>gas</sub> = P − P<sub>water</sub>', 'PV = nRT'], d: 'A gas collected over water, as of a reaction in a lab: the vapour of the water ' +
                            'at its temperature taken from the pressure measured, for the dry gas\'s. With its volume, its moles and its volume dry at STP; with its formula, its mass as well.',
                            fields: [{ k: 'p', l: 'P', ph: '755' }, { k: 't', l: 'T', ph: '298.15' }, { k: 'v', l: 'V, L', ph: 'optional' }, { k: 'f', l: 'Gas', ph: 'H2, optional', fn: true },
                                { k: 'pu', l: 'P in', choice: GAS_PU }, { k: 'tu', l: 'T in', choice: ['K', '°C'] }], cols: 2,
                            run: runWet, example: { p: '755', pu: '2', t: '25', tu: '1', v: '0.25', f: 'H2' } },
                        { id: 'gasvol', t: 'Gas volumes', f: ['V = nRT ÷ P', '22.4 L/mol at STP'], d: 'The amounts of a reaction, as Amounts and limiting reactant has them, the gases in litres ' +
                            'at T and P, or at STP while those are empty. An amount in g, mol, or L of a gas: C3H8 10 L. The gases are those marked (g), else the common ones; water is one from 100 °C.',
                            fields: [{ k: 'eq', l: 'Equation', ph: 'C3H8 + O2 = CO2 + H2O', fn: true }, { k: 'a', l: 'Amounts', ph: 'C3H8 10 L', fn: true }, { k: 'p', l: 'P', ph: 'STP' },
                                { k: 't', l: 'T', ph: 'STP' }, { k: 'pu', l: 'P in', choice: GAS_PU }, { k: 'tu', l: 'T in', choice: ['K', '°C'] }], cols: 2,
                            run: runGasVolumes, example: { eq: 'C3H8 + O2 = CO2 + H2O', a: 'C3H8 10 L' } },
                        { id: 'effusion', t: 'Effusion', f: ['r<sub>1</sub> ÷ r<sub>2</sub> = √(M<sub>2</sub> ÷ M<sub>1</sub>)', 't ∝ √M'], d: 'Two gases through a pinhole, by Graham\'s law: ' +
                            'the lighter is the faster. Each by its formula or its molar mass; leave one of the two gases and the ratio, of their rates or times, empty. Of a molar mass worked out, the gases it could be.',
                            fields: [{ k: 'a', l: 'Gas 1', ph: 'H2 or g/mol', fn: true }, { k: 'b', l: 'Gas 2', ph: 'O2 or g/mol', fn: true }, { k: 'r', l: 'Ratio', name: 'The ratio', ph: 'or' },
                                { k: 'of', l: 'Ratio of', choice: ['Rates, r<sub>1</sub> ÷ r<sub>2</sub>', 'Times, t<sub>1</sub> ÷ t<sub>2</sub>'] }],
                            run: runEffusion, example: { a: 'H2', b: 'O2' } },
                        { id: 'air', t: 'Air with height', f: ['P = P<sub>0</sub>(1 − Lh ÷ T<sub>0</sub>)<sup>gM/RL</sup>'], d: 'The air at a height, by the standard atmosphere to 85 km: its pressure, ' +
                            'temperature and density, its oxygen, and where water boils there; or the height of a pressure. Leave one of the height and P empty. Sea level is 15 °C and 1 atm unless typed.',
                            fields: [{ k: 'h', l: 'Height', ph: 'or' }, { k: 'p', l: 'P', ph: 'or' }, { k: 't0', l: 'Sea level, °C', name: 'Sea level T', ph: '15' }, { k: 'p0', l: 'Sea level P', ph: 'standard' },
                                { k: 'hu', l: 'Height in', choice: ['m', 'km', 'ft'] }, { k: 'pu', l: 'P in', choice: GAS_PU }], cols: 2,
                            drawnLast: true, run: runAir, example: { h: '8849' } },
                        { id: 'sound', t: 'Speed of sound', f: ['v = √(γRT ÷ M)', 'Mach = u ÷ v'], d: 'How fast sound goes in a gas at a temperature: air, or a gas by its formula, He, CO2, ' +
                            'its γ known, worked out from its atoms or typed. With a speed, its Mach number.',
                            fields: [{ k: 'g', l: 'Gas', ph: 'air, He, CO2', fn: true }, { k: 't', l: 'T', ph: '293.15' }, { k: 'gamma', l: 'γ', name: 'γ', ph: 'auto' },
                                { k: 'u', l: 'Speed, m/s', name: 'Speed', ph: 'optional' }, { k: 'tu', l: 'T in', choice: ['K', '°C'] }], cols: 2,
                            drawnLast: true, run: runSound, example: { g: 'air', t: '20', tu: '1' } }
                    ]
                };

            // a formula in a box: what is wrong with it, to say in the note
            function formulaWhy(r, box) {
                return r.error === 'element' ? tr('{symbol} is no element: symbols start with a capital, Co for cobalt, CO for carbon monoxide.', { symbol: r.symbol }) :
                    r.error === 'brackets' ? 'A bracket is not closed, or closed by another kind.' :
                        r.error === 'empty' ? '' : tr('{box} is not a formula yet: CuSO4·5H2O, Ca(OH)2, Fe^3+.', { box: (box || 'The formula') });
            }

            // the parts of a whole, [name, how much, its words] each, side by side in one bar, each named where it has room
            function shareDrawing(label, parts) {
                var W = 300, all = parts.reduce(function (t, p) { return t + p[1]; }, 0), x = 10, body = '', COLOURS = ['#8eab9b', '#e3b18f', '#9fb6d6', '#e0cb85', '#d29fae', '#b5a8d8'];
                if (!(all > 0) || !isFinite(all)) return '';
                parts.forEach(function (p, i) {
                    var w = (W - 20) * p[1] / all;
                    body += '<rect x="' + fix(x) + '" y="8" width="' + fix(w) + '" height="26" fill="' + COLOURS[i % COLOURS.length] + '" stroke="#fff" stroke-width="1"/>';
                    if (w > 16) body += svgText(x + w / 2, 25, p[0], 'middle', 'calc-sv-small calc-sv-bold');
                    if (w > 30) body += svgText(x + w / 2, 47, p[2], 'middle');
                    x += w;
                });
                return svgOf('', W, 54, label, body);
            }

            // what is left as time goes, from N₀ to half at t½ and on past t, the time asked of
            function halfDrawing(n0, t, h) {
                var end = Math.max(t * 1.25, h * 3);
                if (!(n0 > 0 && h > 0 && t >= 0) || !isFinite(end)) return '';
                return curveDrawing('What is left, as time goes', end, 0, n0, function (x) { return n0 * Math.pow(0.5, x / h); }, { under: true, at: t, marks: [[h, 't½']] });
            }

            // the pH scale, 0 to 14, in the colours of universal indicator, and where a pH is on it
            function phDrawing(ph) {
                var W = 300, id = 'calc-plot-' + (++app.plotIds), at = 10 + (W - 20) * Math.max(0, Math.min(14, ph)) / 14, k, body = '',
                    STOPS = [[0, '#d7302b'], [3, '#ee8a2b'], [5, '#f3d43a'], [7, '#5bb05a'], [9, '#2f8fd0'], [11, '#4656b0'], [14, '#7a3592']];
                body += '<defs><linearGradient id="' + id + '">' + STOPS.map(function (q) { return '<stop offset="' + (q[0] / 14).toFixed(3) + '" stop-color="' + q[1] + '"/>'; }).join('') +
                    '</linearGradient></defs><rect x="10" y="10" width="' + (W - 20) + '" height="14" rx="3" fill="url(#' + id + ')"/>';
                for (k = 0; k <= 14; k += 7) body += svgText(10 + (W - 20) * k / 14, 43, String(k), k ? k === 14 ? 'end' : 'middle' : 'start');
                body += svgText(10 + (W - 20) * 3.5 / 14, 43, 'Acidic', 'middle') + svgText(10 + (W - 20) * 10.5 / 14, 43, 'Basic', 'middle');
                return svgOf('', W, 48, 'Where it is on the pH scale', body + '<path class="calc-sv-head calc-sv-head-red" d="M' + fix(at) + ' 24l-5 7h10Z"/><path class="calc-sv-curve" d="M' + fix(at) + ' 7V24"/>');
            }

            function runMolar(n, raw) {
                var r, none = [{ l: 'g/mol', v: NaN }];
                if (!raw.f) return { rows: none };
                r = CalcChem.molarMass(raw.f);
                if (r.error) return { rows: none, bad: ['f'], warn: r.error !== 'empty', note: formulaWhy(r) };
                return {
                    rows: [{ l: 'g/mol', v: CalcMaths.round(r.mass) }, { l: 'Atoms', v: r.parts.reduce(function (s, p) { return s + p.n; }, 0) },
                        { l: 'Formula', text: CalcChem.html(raw.f), copy: CalcChem.plain(raw.f) }].concat(r.parts.map(function (p) {
                        return { l: '% ' + p.s + (p.n > 1 ? ' × ' + p.n : ''), v: +p.percent.toFixed(3) };
                    }), drawnTile(shareDrawing('Its mass, element by element', r.parts.map(function (p) { return [p.s, p.percent, local(String(+p.percent.toFixed(1))) + '%']; })))),
                    note: (r.electron ? 'An electron\'s mass is left out, as tables of molar mass do. ' : '') + (r.unstable ? 'An element with no stable isotope has the mass number of its longest-lived one.' : '')
                };
            }

            // the molar mass of a box's formula, or the note of why there is none
            function massOf(raw, k) {
                var r = raw[k] ? CalcChem.molarMass(raw[k]) : { error: 'empty' };
                return r.error ? { why: formulaWhy(r), bad: r.error !== 'empty' } : { M: r.mass };
            }

            function runMoles(n, raw) {
                var M = massOf(raw, 'f'), given = ['m', 'n', 'p'].filter(function (k) { return raw[k]; }), mol;
                if (M.why !== undefined) return { rows: [{ l: 'g/mol', v: NaN }], bad: M.bad ? ['f'] : [], warn: M.bad, note: M.why || 'Type a formula, then a mass, moles or particles.' };
                if (given.length > 1) return { rows: [{ l: 'g/mol', v: CalcMaths.round(M.M) }], warn: true, note: 'Type one of mass, moles and particles: the others are worked out.' };
                mol = given[0] === 'm' ? n.m / M.M : given[0] === 'n' ? n.n : given[0] === 'p' ? n.p / CalcChem.avogadro : NaN;
                return { rows: [{ l: 'g/mol', v: CalcMaths.round(M.M) }, { l: 'Mass, g', v: mol * M.M }, { l: 'Moles', v: mol }, { l: 'Particles', v: mol * CalcChem.avogadro }],
                    note: given.length ? '' : 'Type a mass, moles or particles.' };
            }

            function runEmpirical(n, raw) {
                var r, none = [{ l: 'Empirical', v: NaN }];
                if (!raw.c) return { rows: none };
                r = CalcChem.empirical(raw.c, engine.comma, raw.M ? n.M : 0);
                if (r.error) {
                    return { rows: none, bad: ['c'], warn: true, note: r.error === 'element' ? tr('{at} is no element.', { at: r.at }) : r.error === 'zero' ? tr('{at} needs an amount above 0.', { at: r.at }) :
                        'Each element and its percent or grams: C 40' + (engine.comma ? '; ' : ', ') + 'H 6.71' + (engine.comma ? '; ' : ', ') + 'O 53.29.' };
                }
                return {
                    rows: [{ l: 'Empirical', text: r.html, copy: r.plain }, { l: 'Its g/mol', v: CalcMaths.round(r.M) }].concat(drawnTile(shareDrawing('Its atoms, element by element',
                        r.parts.map(function (p) { return [p.s, p.n, String(p.n)]; }))))
                        .concat(r.molecular ? [{ l: 'Molecular', text: r.molecularHtml, copy: r.molecularPlain }, { l: 'Its g/mol', v: CalcMaths.round(r.M * r.n) }, { l: 'Times', v: r.n }] : []),
                    note: r.off ? 'The molar mass is not a whole number of times the empirical formula\'s: the nearest is taken.' : tr('Moles of each, divided by the least: {parts}.', { parts: r.parts.map(function (p, i) { return p.s + ' ' + local(String(+r.ratio[i].toFixed(2))); }).join(', ') })
                };
            }

            // what is wrong with an equation, for the note
            function equationWhy(r) {
                return r.error === 'arrow' ? 'Write = or → between its two sides.' : r.error === 'arrows' ? 'One = or → only, between its two sides.' :
                    r.error === 'side' ? 'A formula on each side.' : r.error === 'formula' ? (formulaWhy(r.why, r.formula) || tr('{formula} is not a formula.', { formula: r.formula })) :
                        r.error === 'one side' ? tr('{element} is on one side only: it cannot be balanced.', { element: r.element }) :
                            r.error === 'many' ? 'It balances in more than one way: it is two reactions or more. Write each of them.' :
                                'It cannot be balanced as written: a formula may be on the wrong side, or one is missing.';
            }

            function runBalance(n, raw) {
                var r, none = [{ l: 'Balanced', v: NaN, wide: true }], rows, mass = function (side) {
                    return side.reduce(function (s, x) { return s + x.k * CalcChem.molarMass(x.t).mass; }, 0);
                };
                if (!raw.eq) return { rows: none };
                r = CalcChem.balance(raw.eq);
                if (r.error) return { rows: none, bad: ['eq'], warn: true, note: equationWhy(r) };
                rows = [{ l: 'Balanced', text: r.html, copy: r.text, wide: true }];
                if (r.kind) rows.push({ l: 'Kind', text: r.kind, wide: true });
                if (r.redox) { // each element whose oxidation number goes up, then down: Cl −1 → 0
                    [['oxidized', 'Oxidized'], ['reduced', 'Reduced']].forEach(function (way) {
                        if (r.redox[way[0]].length) rows.push({ l: way[1], text: r.redox[way[0]].map(function (x) { return x.s + ' ' + x.from + ' → ' + x.to; }).join(', '), wide: true });
                    });
                }
                return { rows: rows.concat(r.left.concat(r.right).map(function (x) { return { l: CalcChem.html(x.t), v: x.k }; }),
                    [{ l: 'Reactants, g', v: CalcMaths.round(mass(r.left)) }, { l: 'Products, g', v: CalcMaths.round(mass(r.right)) }]),
                    note: r.many ? 'It balances in more than one way: this is one, the sum of the others.' : 'The numbers of each formula, then the mass of each side, which are the same.' };
            }

            // a reaction's results for the rows: the limiting reactant and the % yield
            function yieldRows(r, rows) {
                if (r.limiting) rows.push({ l: 'Limiting reactant', text: CalcChem.html(r.limiting), wide: true });
                if (r.percent !== undefined) rows.push({ l: tr('% yield of {yieldOf}', { yieldOf: CalcChem.html(r.yieldOf) }), v: +r.percent.toFixed(2), wide: true });
            }

            // a row for each formula, its amount in the unit unitOf(x) gives ({ unit, per }: per mole) and in moles, and what is left of it
            function amountRows(r, rows, unitOf) {
                r.rows.forEach(function (x) {
                    var u = unitOf(x), name = CalcChem.html(x.t);
                    rows.push({ l: name + ', ' + u.unit, v: CalcMaths.round(x.mol * u.per) }, { l: tr('{name}, mol', { name: name }), v: CalcMaths.round(x.mol) });
                    if (x.left > 1e-12 * x.given) rows.push({ l: tr('{name} left, {unit}', { name: name, unit: u.unit }), v: CalcMaths.round(x.left * u.per), wide: true });
                });
            }

            function runStoich(n, raw) {
                var b, read, r, none = [{ l: 'Balanced', v: NaN, wide: true }], rows;
                if (!raw.eq) return { rows: none };
                b = CalcChem.balance(raw.eq);
                if (b.error) return { rows: none, bad: ['eq'], warn: true, note: equationWhy(b) };
                rows = [{ l: 'Balanced', text: b.html, copy: b.text, wide: true }];
                if (!raw.a) return { rows: rows, note: tr('Type the amount of a formula, or of each reactant: {left} 10 g.', { left: CalcChem.plain(b.left[0].t) }) };
                read = CalcChem.readAmounts(raw.a, engine.comma);
                if (read.error) return { rows: rows, bad: ['a'], warn: true, note: tr('{error} is not a formula and an amount: Fe 10 g, or O2 0.5 mol.', { error: read.error }) };
                r = CalcChem.amounts(raw.eq, read.list);
                if (r.error === 'not in') return { rows: rows, bad: ['a'], warn: true, note: tr('{t} is not in the equation.', { t: r.t }) };
                if (r.error) return { rows: rows, note: 'Type the amount of a formula, or of each reactant.' };
                yieldRows(r, rows);
                if (r.rows.some(function (x) { return x.given > 0; })) rows = drawnTile(labelBars('Each in g, what it takes or makes beside what was typed, the limiting red', r.rows.map(function (x) {
                    return [CalcChem.plain(x.t), x.g, x.t === r.limiting, x.given > 0 ? x.given * x.M : 0];
                })), 'Used and made').concat(rows);
                amountRows(r, rows, function (x) { return { unit: 'g', per: x.M }; });
                return { rows: rows, cols: 2, note: r.limiting ? tr('What it takes and makes, until {limiting} runs out.', { limiting: CalcChem.plain(r.limiting) }) : r.percent !== undefined ? 'What the reaction gives, against what was got.' : '' };
            }

            // the one box of a few that is empty, to work out; a note if not one alone is. names: what each is called
            function oneEmpty(raw, keys, names) {
                var empty = keys.filter(function (k) { return !raw[k]; });
                if (empty.length === 1) return { k: empty[0] };
                return { note: (empty.length ? tr('Leave only one of {names} and {last} empty, the one to work out.', { names: names.slice(0, -1).join(tr(', ')), last: names[names.length - 1] }) :
                    tr('Leave one of {names} and {last} empty, the one to work out.', { names: names.slice(0, -1).join(tr(', ')), last: names[names.length - 1] })), warn: !empty.length };
            }

            function runHeat(n, raw) {
                var e = oneEmpty(raw, ['q', 'm', 'c', 't'], ['q', 'm', 'c', 'ΔT']), v;
                if (!e.k) return { rows: [{ l: 'q, J', v: NaN }], warn: e.warn, note: e.note };
                v = { q: n.m * n.c * n.t, m: n.q / (n.c * n.t), c: n.q / (n.m * n.t), t: n.q / (n.m * n.c) }[e.k];
                return { rows: [{ l: { q: 'q, J', m: 'm, g', c: 'c, J/(g·°C)', t: 'ΔT, °C' }[e.k], v: v }].concat(e.k === 'q' ? [{ l: 'q, kJ', v: v / 1000 }] : []),
                    warn: !isFinite(v), note: !isFinite(v) ? 'None: a box it is divided by is 0.' : e.k === 'q' ? (v < 0 ? 'Below 0: heat given out.' : 'Heat taken in.') : '' };
            }

            function runDecay(n, raw) {
                var e = oneEmpty(raw, ['n0', 'n', 't', 'h'], ['N₀', 'N', 't', 't½']), v, k, bad;
                if (!e.k) return { rows: [{ l: 'N', v: NaN }], warn: e.warn, note: e.note };
                v = { n: n.n0 * Math.pow(0.5, n.t / n.h), n0: n.n / Math.pow(0.5, n.t / n.h), t: n.h * Math.log(n.n0 / n.n) / Math.LN2, h: n.t * Math.LN2 / Math.log(n.n0 / n.n) }[e.k];
                k = Math.LN2 / (e.k === 'h' ? v : n.h);
                bad = !isFinite(v) || ((e.k === 't' || e.k === 'h') && v < 0); // N above N₀ would take a negative time
                return { rows: [{ l: { n: 'N', n0: 'N₀', t: 't', h: 't½' }[e.k], v: v }, { l: 'Decay constant λ', v: k }, { l: '% left', v: CalcMaths.round(100 * (e.k === 'n' ? v / n.n0 : e.k === 'n0' ? n.n / v : n.n / n.n0)) }]
                        .concat(bad ? [] : drawnTile(halfDrawing(e.k === 'n0' ? v : n.n0, e.k === 't' ? v : n.t, e.k === 'h' ? v : n.h))),
                    warn: bad, note: bad ? 'None: N is less than N₀, both above 0, and t½ above 0.' : '' };
            }

            function runMolarity(n, raw) {
                var M = raw.f ? massOf(raw, 'f') : {}, hasMass = !!raw.m, mol, e, v;
                if (M.why) return { rows: [{ l: 'mol/L', v: NaN }], bad: M.bad ? ['f'] : [], warn: true, note: M.why };
                if (raw.m && raw.n) return { rows: [{ l: 'mol/L', v: NaN }], warn: true, note: 'Type the mass or the moles, not both.' };
                if (raw.m && !M.M) return { rows: [{ l: 'mol/L', v: NaN }], warn: true, note: 'A formula to turn the mass into moles, or the moles in place of the mass.' };
                e = oneEmpty({ a: raw.m || raw.n, v: raw.v, c: raw.c }, ['a', 'v', 'c'], [M.M ? 'mass' : 'moles', 'volume', 'molarity']);
                if (!e.k) return { rows: [{ l: 'mol/L', v: NaN }], warn: e.warn, note: e.note };
                mol = hasMass ? n.m / M.M : n.n;
                if (e.k === 'c') v = mol / n.v;
                else if (e.k === 'v') v = mol / n.c;
                else mol = v = n.c * n.v;
                var rows = [{ l: e.k === 'c' ? 'mol/L' : e.k === 'v' ? 'Volume, L' : 'Moles', v: v }];
                if (e.k === 'v') rows.push({ l: 'Volume, mL', v: v * 1000 });
                if (e.k !== 'a') rows.push({ l: 'Moles', v: mol });
                if (M.M) rows.push({ l: 'Mass, g', v: mol * M.M }, { l: 'g/L', v: (e.k === 'c' ? v : n.c) * M.M });
                return { rows: rows, warn: !isFinite(v), note: !isFinite(v) ? 'None: a box it is divided by is 0.' : '' };
            }

            function runDilution(n, raw) {
                var e = oneEmpty(raw, ['c1', 'v1', 'c2', 'v2'], ['C₁', 'V₁', 'C₂', 'V₂']), v;
                if (!e.k) return { rows: [{ l: 'C₂', v: NaN }], warn: e.warn, note: e.note };
                v = { c1: n.c2 * n.v2 / n.v1, v1: n.c2 * n.v2 / n.c1, c2: n.c1 * n.v1 / n.v2, v2: n.c1 * n.v1 / n.c2 }[e.k];
                return { rows: [{ l: { c1: 'C₁', v1: 'V₁', c2: 'C₂', v2: 'V₂' }[e.k], v: v }].concat(e.k === 'v2' ? [{ l: 'Water to add', v: v - n.v1 }] : e.k === 'v1' ? [{ l: 'Water to add', v: n.v2 - v }] : []),
                    warn: !isFinite(v), note: !isFinite(v) ? 'None: a box it is divided by is 0.' : '' };
            }

            // pH, pOH, [H⁺] and [OH⁻] of water at 25 °C, and what kind of solution it is
            function phRows(ph) {
                var rows = [{ l: 'pH', v: CalcMaths.round(ph) }, { l: 'pOH', v: CalcMaths.round(14 - ph) }, { l: '[H<sup>+</sup>]', v: Math.pow(10, -ph) }, { l: '[OH<sup>–</sup>]', v: Math.pow(10, ph - 14) }]
                    .concat(isFinite(ph) ? drawnTile(phDrawing(ph)) : []);
                return { rows: rows, cols: 2, note: !isFinite(ph) ? '' : Math.abs(ph - 7) < 1e-9 ? 'Neutral.' : ph < 7 ? 'Acidic: below 7.' : 'Basic: above 7.' };
            }

            function runPh(n, raw) {
                var of = +raw.of, ph;
                if (!raw.x) return phRows(NaN);
                if (of < 2 && !(n.x > 0)) return { rows: phRows(NaN).rows, cols: 2, bad: [], warn: true, note: 'A concentration above 0.' };
                ph = of === 0 ? -Math.log10(n.x) : of === 1 ? 14 + Math.log10(n.x) : of === 2 ? n.x : 14 - n.x;
                return phRows(ph);
            }

            function runWeak(n, raw) {
                var x, out, acid = raw.is !== '1';
                if (!raw.k || !raw.c) return { rows: phRows(NaN).rows, cols: 2, note: 'Type K and the concentration.' };
                if (!(n.k > 0) || !(n.c > 0)) return { rows: phRows(NaN).rows, cols: 2, warn: true, note: 'K and the concentration above 0.' };
                x = (-n.k + Math.sqrt(n.k * n.k + 4 * n.k * n.c)) / 2; // of x² ÷ (c − x) = K
                out = phRows(acid ? -Math.log10(x) : 14 + Math.log10(x));
                out.rows.push({ l: '% ionized', v: CalcMaths.round(100 * x / n.c) }, { l: acid ? 'pK<sub>a</sub>' : 'pK<sub>b</sub>', v: CalcMaths.round(-Math.log10(n.k)) });
                return out;
            }

            function runBuffer(n, raw) {
                var pka = raw.pka && n.pka > 0 && n.pka < 1e-1 && /e|E|^0[.,]/.test(raw.pka) ? -Math.log10(n.pka) : n.pka, ph; // Ka typed in place of pKa
                if (!raw.pka || !raw.a || !raw.ha) return { rows: phRows(NaN).rows.slice(0, 2), cols: 2 };
                if (!(n.a > 0) || !(n.ha > 0)) return { rows: phRows(NaN).rows.slice(0, 2), cols: 2, warn: true, note: '[A⁻] and [HA] above 0.' };
                ph = pka + Math.log10(n.a / n.ha);
                return { rows: phRows(ph).rows.concat([{ l: '[A<sup>–</sup>] ÷ [HA]', v: n.a / n.ha }, { l: 'pK<sub>a</sub>', v: CalcMaths.round(pka) }]), cols: 2,
                    note: (pka !== n.pka ? 'K' + 'a was typed: its pKa is taken. ' : '') + (Math.abs(ph - pka) > 1 ? 'More than 1 from pKa: a weak buffer.' : 'Within 1 of pKa: a good buffer.') };
            }

            // The freezing point lowered and the boiling point raised, ΔT = i K m: the molality from one of the molality, the
            // grams of a formula in the kg of solvent, ΔTf and ΔTb; and from a ΔT, with the grams and kg, the solute's molar mass
            // the freezing point and the boiling point, each on a scale of its own about it: the solvent's alone and with the
            // solute in it, an arrow from one to the other
            function pointsMovedDrawing(fp, tf, bp, tb) {
                var W = 300, H = 74, body = '';
                function scale(x0, x1, at, by, name, down) {
                    var span = Math.max(2.5 * by, 1), lo = down ? at - span * 0.85 : at - span * 0.15, hi = lo + span, px = function (t) { return x0 + (x1 - x0) * (t - lo) / (hi - lo); },
                        to = down ? at - by : at + by;
                    return '<path class="calc-sv-ground" d="M' + x0 + ' 40H' + x1 + '"/>' + svgText((x0 + x1) / 2, 12, name, 'middle', 'calc-sv-small calc-sv-bold') +
                        '<path class="calc-sv-seg calc-sv-thin" d="M' + fix(px(at)) + ' 33V47"/><path class="calc-sv-curve" d="M' + fix(px(to)) + ' 31V49"/>' +
                        (Math.abs(px(to) - px(at)) > 8 ? svgArrow(px(at), 26, px(to), 26, 'calc-sv-curve') : '') +
                        svgText(px(at), 62, local(String(+at.toFixed(2))), 'middle') + svgText(px(to), 72, local(String(+to.toFixed(2))).replace('-', '−'), 'middle', 'calc-sv-small calc-sv-red');
                }
                body = scale(12, 142, fp, tf, 'Freezes, °C', true) + scale(158, 288, bp, tb, 'Boils, °C', false);
                return svgOf('', W, H + 4, 'Each point of the solvent alone, and with it in, red', body);
            }

            function runColligative(n, raw) {
                var other = raw.s === '3', sv = other ? [n.kf, n.kb, NaN, NaN] : SOLVENTS[+raw.s || 0], none = [{ l: 'mol/kg', v: NaN }],
                    M = raw.f ? massOf(raw, 'f') : {}, made = raw.f && !M.why ? CalcChem.particles(raw.f) : { i: 1 }, i = raw.i ? n.i : made.i,
                    fromMass = !!(raw.g && raw.kg && M.M), given = [raw.m, raw.tf, raw.tb].filter(Boolean).length + (fromMass ? 1 : 0), m, tf, tb, rows;
                if (M.why) return { rows: none, bad: M.bad ? ['f'] : [], warn: true, note: M.why };
                if (other && (!raw.kf || !raw.kb)) return { rows: none, note: 'Type the Kf and Kb of the solvent, in °C·kg/mol.' };
                if (!given) return { rows: none, note: 'Type the molality; or the grams of solute, its formula and the kg of solvent; or ΔTf or ΔTb.' };
                if (given > 1) return { rows: none, warn: true, note: 'Type one of the molality, the grams of solute, ΔTf and ΔTb: the others are worked out.' };
                if (!(i > 0)) return { rows: none, warn: true, note: 'i above 0.' };
                m = raw.m ? n.m : fromMass ? n.g / M.M / n.kg : raw.tf ? n.tf / (i * sv[0]) : n.tb / (i * sv[1]);
                tf = i * sv[0] * m;
                tb = i * sv[1] * m;
                rows = [{ l: 'mol/kg', v: m }, { l: 'i', v: i }, { l: 'ΔT<sub>f</sub>, °C', v: tf }, { l: 'ΔT<sub>b</sub>, °C', v: tb }];
                if (!other) rows.push({ l: 'Freezes at, °C', v: CalcMaths.round(sv[2] - tf) }, { l: 'Boils at, °C', v: CalcMaths.round(sv[3] + tb) });
                if (!other && isFinite(m) && m > 0) rows = drawnTile(pointsMovedDrawing(sv[2], tf, sv[3], tb), 'The points moved').concat(rows);
                if (!fromMass && raw.kg && M.M) rows.push({ l: 'Solute, g', v: m * n.kg * M.M });
                if (!fromMass && raw.kg && raw.g && !raw.f) rows.push({ l: 'Solute, g/mol', v: n.g / (m * n.kg) }); // its molar mass, from how far the point moved
                return { rows: rows, cols: 2, warn: !isFinite(m),
                    note: !isFinite(m) ? 'None: a box it is divided by is 0.' : raw.f && !raw.i && made.i > 1 ? tr('i = {i}: {f} gives {i} ions, ideally; the real i is a little less.', { i: made.i, f: CalcChem.plain(raw.f) }) :
                        tr('{v}Kf {sv}, Kb {sv2} °C·kg/mol.', { v: (other ? '' : sv[4] + ': '), sv: local(String(sv[0])), sv2: local(String(sv[1])) }) };
            }

            // The table of solubility, each cell its letter in its colour, the salt typed outlined; its key under it. A cell
            // clicked types its salt's formula in the box (data-fill), each worked out once, by its name
            var solFormulas = null;
            function solubleTable(ci, ai) {
                var t = CalcChem.solubilityTable();
                solFormulas = solFormulas || t.cations.map(function (c) {
                    return t.anions.map(function (a) { var r = CalcChem.names(c.name + ' ' + a.name); return r && !r.error ? r.formula : ''; });
                });
                return '<span class="calc-sol" style="--cols: ' + (t.anions.length + 1) + '"><span></span>' + t.anions.map(function (a) {
                    return '<span class="calc-sol-head" title="' + a.name + '">' + a.ion.replace('CH₃COO', 'CH₃<br>COO') + '</span>'; // on two lines, to fit the popup
                }).join('') + t.cations.map(function (c, i) {
                    return '<span class="calc-sol-head calc-sol-side" title="' + c.name + '">' + c.ion + '</span>' + t.letters[i].split('').map(function (x, j) {
                        return '<span class="calc-sol-' + (x === 's' ? 'little' : x) + (i === ci && j === ai ? ' calc-on' : '') + '"' + (solFormulas[i][j] ? ' data-fill="f" data-v="' + solFormulas[i][j] + '"' : '') +
                            ' title="' + c.name + ' ' + t.anions[j].name + ': ' + t.words[x] + '">' + x + '</span>';
                    }).join('');
                }).join('') + '</span><span class="calc-sol-key">' + ['S', 's', 'I', 'R'].map(function (x) {
                    return '<span><i class="calc-sol-' + (x === 's' ? 'little' : x) + '">' + x + '</i>' + t.words[x] + '</span>';
                }).join('') + '</span>';
            }

            function runSoluble(n, raw) {
                var table = function () { return { t: 'Table', rows: [{ l: 'Solubility in water at 25 °C', text: solubleTable(-1, -1) }] }; }, r, M; // shown till a salt is found
                if (!raw.f) return { rows: [], pick: table(), note: 'Pick a salt in the table, its cation down the side, its anion across the top, or type it.' };
                r = CalcChem.solubility(raw.f);
                if (r.error === 'unknown') return { rows: [], pick: table(), warn: true, note: 'Not in the table: a salt of Li⁺, Na⁺, K⁺, NH₄⁺, Mg²⁺, Ca²⁺, Sr²⁺, Ba²⁺, Al³⁺, Cr³⁺, Mn²⁺, Fe²⁺, Fe³⁺, Co²⁺, Ni²⁺, Cu²⁺, Zn²⁺, Ag⁺, Hg²⁺ or Pb²⁺ ' +
                    'with nitrate, acetate, Cl⁻, Br⁻, I⁻, sulfate, carbonate, phosphate, hydroxide or sulfide.' };
                if (r.error) return { rows: [], pick: table(), bad: ['f'], warn: r.error !== 'empty', note: formulaWhy(r) };
                M = CalcChem.molarMass(r.formula);
                return {
                    rows: [{ l: 'In water', text: r.word }, { l: 'Name', text: r.name }, { l: 'Formula', text: CalcChem.html(r.formula), copy: CalcChem.plain(r.formula) },
                        { l: 'Ions', text: (r.nc > 1 ? r.nc + ' ' : '') + r.cation + ' + ' + (r.na > 1 ? r.na + ' ' : '') + r.anion }, { l: 'g/mol', v: CalcMaths.round(M.mass) }],
                    note: r.rule + (r.hydrate ? ' The water of the hydrate is left out.' : '')
                };
            }

            // The equations of the worksheet, at each level: each balances, and has its kind, the redox ones Redox
            var WORKSHEET = [
                ['H2 + O2 = H2O', 'N2 + H2 = NH3', 'Na + Cl2 = NaCl', 'Mg + O2 = MgO', 'H2O2 = H2O + O2', 'Zn + HCl = ZnCl2 + H2', 'Ca + H2O = Ca(OH)2 + H2',
                    'KClO3 = KCl + O2', 'CH4 + O2 = CO2 + H2O', 'HgO = Hg + O2', 'Li + O2 = Li2O', 'Cu + O2 = CuO', 'NaOH + HCl = NaCl + H2O', 'CaCO3 = CaO + CO2',
                    'Mg + HCl = MgCl2 + H2', 'K + H2O = KOH + H2', 'AgNO3 + NaCl = AgCl + NaNO3', 'H2 + Cl2 = HCl', 'SO2 + O2 = SO3', 'Fe + S = FeS'],
                ['Al + O2 = Al2O3', 'Fe + O2 = Fe2O3', 'C3H8 + O2 = CO2 + H2O', 'Fe2O3 + CO = Fe + CO2', 'Al + HCl = AlCl3 + H2', 'NaOH + H2SO4 = Na2SO4 + H2O',
                    'Ca(OH)2 + HCl = CaCl2 + H2O', 'Pb(NO3)2 + KI = PbI2 + KNO3', 'AgNO3 + CaCl2 = AgCl + Ca(NO3)2', 'Fe + Cl2 = FeCl3', 'NH3 + O2 = NO + H2O',
                    'C2H6 + O2 = CO2 + H2O', 'Na + H2O = NaOH + H2', 'N2O5 = NO2 + O2', 'Al + CuSO4 = Al2(SO4)3 + Cu', 'BaCl2 + Na2SO4 = BaSO4 + NaCl', 'P4 + O2 = P2O5',
                    'Zn + AgNO3 = Zn(NO3)2 + Ag', 'Mg + N2 = Mg3N2', 'Fe2O3 + H2 = Fe + H2O'],
                ['C6H12O6 + O2 = CO2 + H2O', 'C8H18 + O2 = CO2 + H2O', 'KMnO4 + HCl = KCl + MnCl2 + Cl2 + H2O', 'Cu + HNO3 = Cu(NO3)2 + NO + H2O',
                    'Al2(SO4)3 + Ca(OH)2 = Al(OH)3 + CaSO4', 'FeS2 + O2 = Fe2O3 + SO2', 'C2H5OH + O2 = CO2 + H2O', 'Ca3(PO4)2 + SiO2 + C = CaSiO3 + P4 + CO',
                    'C4H10 + O2 = CO2 + H2O', 'NH3 + CuO = Cu + N2 + H2O', 'Fe3O4 + Al = Al2O3 + Fe', 'Ca3(PO4)2 + H2SO4 = CaSO4 + H3PO4', 'Al + Fe2O3 = Al2O3 + Fe',
                    'C5H12 + O2 = CO2 + H2O', 'K2Cr2O7 + HCl = KCl + CrCl3 + Cl2 + H2O', 'NaHCO3 = Na2CO3 + CO2 + H2O', 'Al4C3 + H2O = Al(OH)3 + CH4',
                    'Cu + H2SO4 = CuSO4 + SO2 + H2O', 'PCl5 + H2O = H3PO4 + HCl', 'Fe2(SO4)3 + KOH = K2SO4 + Fe(OH)3']
            ], worksheetKept = { key: '', picked: [] };

            // as it is to be balanced: each formula, + between them and → between the sides
            function unbalanced(eq, html) {
                return eq.split(' = ').map(function (side) {
                    return side.split(' + ').map(function (f) { return html ? CalcChem.html(f) : CalcChem.plain(f); }).join(' + ');
                }).join(' → ');
            }

            // Questions picked at random from the level, kept until Again or the choices change; the kind of reaction
            // asked only of those that have one. The questions, then the answers, each to copy as text
            function runWorksheet(n, raw) {
                var ex = +raw.ex || 0, level = +raw.lv || 0, count = n.n || 10, key = ex + ',' + level + ',' + count, pool, list, q, a;
                if (app.svAgain || worksheetKept.key !== key) {
                    pool = WORKSHEET[level].map(function (eq) { return { eq: eq, r: CalcChem.balance(eq) }; }).filter(function (x) { return !x.r.error && (ex !== 1 || x.r.kind); });
                    for (var i = pool.length - 1; i > 0; i--) { // shuffled
                        var j = Math.floor(Math.random() * (i + 1)), t = pool[i];
                        pool[i] = pool[j];
                        pool[j] = t;
                    }
                    worksheetKept = { key: key, picked: pool.slice(0, count) };
                }
                list = worksheetKept.picked;
                q = list.map(function (x) { return ex === 1 ? [x.r.html, x.r.text] : [unbalanced(x.eq, true), unbalanced(x.eq, false)]; });
                a = list.map(function (x) {
                    var kind = x.r.kind || 'Redox';
                    return ex === 0 ? [x.r.html, x.r.text] : ex === 1 ? [kind, kind] : [x.r.html + ' <i>' + kind + '</i>', x.r.text + '   (' + kind + ')'];
                });
                var ol = function (items, i) {
                    return '<ol class="calc-ws">' + items.map(function (x) { return '<li>' + x[i] + '</li>'; }).join('') + '</ol>';
                }, plainList = function (items) {
                    return items.map(function (x, k) { return (k + 1) + '. ' + x[1]; }).join('\n');
                };
                return {
                    rows: [{ l: ['Balance each', 'Name the kind of each reaction', 'Balance each, and name its kind'][ex], text: ol(q, 0), copy: plainList(q), wide: true },
                        { l: 'Answer key', text: ol(a, 0), copy: plainList(a), wide: true }],
                    note: list.length < count ? tr('Only {list} at this level have a kind to name.', { list: list.length }) : 'Again for new questions.'
                };
            }

            // An ion's charge as chemists write it: 2−, +
            function chargeText(c) {
                return (Math.abs(c) > 1 ? Math.abs(c) : '') + (c > 0 ? '+' : '−');
            }

            // the ions, cations then anions, each its formula and name; one clicked types its name in the box (data-fill)
            function ionList() {
                var group = function (cat) {
                    return '<span class="calc-ion-list">' + CalcChem.ions.filter(function (i) { return cat ? i.charge > 0 : i.charge < 0; }).map(function (i) {
                        return '<span title="' + i.kind + '" data-fill="f" data-v="' + i.name + '"><b>' + CalcChem.html(i.formula) + '</b>' + i.name + '</span>';
                    }).join('') + '</span>';
                };
                return { t: 'Ions', rows: [{ l: 'Cations', text: group(true) }, { l: 'Anions', text: group(false) }] };
            }

            function runIon(n, raw) {
                var r, M;
                if (!raw.f) return { rows: [], pick: ionList(), note: 'Pick an ion, or type it by its formula or its name.' };
                r = CalcChem.findIon(raw.f);
                if (r.error === 'unknown') return { rows: [], pick: ionList(), warn: true, note: tr('{f} is not one of the common ions below.', { f: raw.f }) };
                if (r.error) return { rows: [], pick: ionList(), bad: ['f'], warn: true, note: formulaWhy(r) };
                M = CalcChem.molarMass(r.formula);
                return {
                    rows: [{ l: 'Name', text: r.name + (r.also.length ? ' <i>(' + r.also.join(', ') + ')</i>' : '') }, { l: 'Formula', text: CalcChem.html(r.formula), copy: CalcChem.plain(r.formula) },
                        { l: 'Charge', text: chargeText(r.charge) }, { l: 'Kind', text: r.kind }, { l: 'g/mol', v: CalcMaths.round(M.mass) },
                        { l: 'In water', text: r.water }].concat(r.charge > 0 ? [{ l: 'Flame test', text: r.flame || 'No colour of its own' }] : []),
                    cols: 2,
                    note: 'The electrons it gained or lost are left out of its mass, as tables of molar mass do.'
                };
            }

            // a formula's name, or a name's formula; of a salt its ions, of an acid its name in water
            function runNames(n, raw) {
                var r, none = [{ l: 'Name', v: NaN, wide: true }], rows, s;
                if (!raw.f) return { rows: none, note: 'Type a formula for its name, Fe2(SO4)3, or a name for its formula, iron(III) sulfate.' };
                r = CalcChem.names(raw.f);
                if (r.error === 'numeral') {
                    return { rows: none, bad: ['f'], warn: true, note: tr('{name} has more than one charge: write it in Roman numerals, {ox}.', { name: r.element.name, ox: r.element.ox.split(' ').filter(function (x) { return x.charAt(0) === '+'; }).map(function (x) { return r.element.name.toLowerCase() + '(' + ['', 'I', tr('II'), tr('III'), tr('IV'), 'V', tr('VI'), tr('VII'), tr('VIII')][+x.slice(1)] + ')'; }).join(' or ') }) };
                }
                if (r.error === 'unknown') return { rows: none, warn: true, note: 'Not one it names: salts, acids, ions, two nonmetals, the elements and some common compounds are.' };
                if (r.error) return { rows: none, bad: ['f'], warn: r.error !== 'empty', note: formulaWhy(r) };
                rows = [{ l: 'Name', text: r.name + (r.also.length ? ' <i>(' + r.also.join(', ') + ')</i>' : ''), copy: r.name, wide: true },
                    { l: 'Formula', text: CalcChem.html(r.formula), copy: CalcChem.plain(r.formula) }, { l: 'Kind', text: r.kind }];
                if (r.acid) rows.push({ l: 'In water', text: r.acid });
                if ((s = r.salt)) rows.push({ l: 'Ions', text: (s.cation.n > 1 ? s.cation.n + ' ' : '') + CalcChem.plain(s.cation.ion) + ' + ' + (s.anion.n > 1 ? s.anion.n + ' ' : '') + CalcChem.plain(s.anion.ion) });
                rows.push({ l: 'g/mol', v: CalcMaths.round(CalcChem.molarMass(r.formula).mass) });
                return {
                    rows: rows, cols: 2,
                    note: r.kind === 'Ionic' ? tr('The cation, then the anion{v}', { v: (/\([IVX]+\)/.test(s.cation.name) ? tr('; a metal of more than one charge has its charge in Roman numerals, as the anions balance it.') : '.') }) :
                        r.kind === 'Acid' ? (r.acid ? 'As a compound, hydrogen and the anion; in water -ide becomes hydro-…-ic acid.' : 'In water, -ate becomes -ic acid and -ite -ous acid.') :
                            r.kind === 'Molecular' ? 'Two nonmetals: a Greek prefix for how many atoms of each, mono- left off the first.' : r.kind === 'Common name' ? 'Known by a name of its own.' : ''
                };
            }

            // the oxidation number of each element of a formula or an ion, of a salt of two ions sharing one each apart
            function runOxidation(n, raw) {
                var r, none = [{ l: 'Oxidation numbers', v: NaN, wide: true }], twice;
                if (!raw.f) return { rows: none, note: 'Type a formula or an ion: K2Cr2O7, SO4^2-.' };
                r = CalcChem.oxidation(raw.f);
                if (r.error === 'electron') return { rows: none, bad: ['f'], warn: true, note: 'An electron has no oxidation number: type a formula or an ion.' };
                if (r.error === 'none') return { rows: none, warn: true, note: 'No oxidation numbers fit it, by the rules and the usual states of its elements.' };
                if (r.error) return { rows: none, bad: ['f'], warn: r.error !== 'empty', note: formulaWhy(r) };
                twice = r.rows.filter(function (x, i) { return r.rows.some(function (y, j) { return j < i && y.s === x.s; }); }).map(function (x) { return x.s; });
                return {
                    rows: r.rows.map(function (x) { return { l: x.s + (x.in ? ' in ' + x.in : ''), text: x.text }; }), cols: 2,
                    note: r.parts ? tr('Each ion on its own, as {twice} is in both.', { twice: twice[0] }) :
                        r.average.length ? tr('{v}: an average, as its atoms are not all in one state; Fe3O4 is FeO·Fe2O3.', { v: r.average.join(' and ') }) :
                            r.guessed ? 'The rules leave more than one element: each is put in one of its usual states, so they add up to the charge.' :
                                tr('By the rules; the sum is the charge, {v}.', { v: (CalcChem.parse(raw.f).charge ? chargeText(CalcChem.parse(raw.f).charge) : '0') })
                };
            }

            function runGas(n, raw) {
                var e = oneEmpty(raw, ['p', 'v', 'n', 't'], ['P', 'V', 'n', 'T']), R = GAS_R[+raw.pu || 0], c = raw.tu === '1' ? 273.15 : 0, T = n.t + c, v, M, rows, mol;
                if (!e.k) return { rows: [{ l: 'P', v: NaN }], warn: e.warn, note: e.note };
                v = { p: n.n * R * T / n.v, v: n.n * R * T / n.p, n: n.p * n.v / (R * T), t: n.p * n.v / (n.n * R) - c }[e.k];
                rows = [{ l: { p: 'P, ' + ['atm', 'kPa', 'mmHg', 'bar'][+raw.pu || 0], v: 'V, L', n: 'n, mol', t: 'T, ' + (c ? '°C' : 'K') }[e.k], v: v }];
                if (e.k === 't') rows.push(c ? { l: 'T, K', v: v + c } : { l: 'T, °C', v: v - 273.15 });
                if (raw.f) {
                    M = massOf(raw, 'f');
                    if (M.why) return { rows: rows, bad: M.bad ? ['f'] : [], warn: true, note: M.why };
                    mol = e.k === 'n' ? v : n.n;
                    rows.push({ l: 'Mass, g', v: mol * M.M }, { l: 'Density, g/L', v: mol * M.M / (e.k === 'v' ? v : n.v) });
                }
                return { rows: rows, cols: 2, warn: !isFinite(v) || (e.k !== 't' && T <= 0), note: !isFinite(v) ? 'None: a box it is divided by is 0.' : e.k !== 't' && T <= 0 ? 'T is above absolute zero, 0 K or –273.15 °C.' : 'R = ' + local(String(R)) + ' L·' + ['atm', 'kPa', 'mmHg', 'bar'][+raw.pu || 0] + '/(mol·K).' };
            }

            function runGases(n, raw) {
                var keys = ['p1', 'v1', 't1', 'p2', 'v2', 't2'], e = oneEmpty(raw, keys, ['P₁', 'V₁', 'T₁', 'P₂', 'V₂', 'T₂']), c = raw.tu === '1' ? 273.15 : 0, t1 = n.t1 + c, t2 = n.t2 + c, v, all, top;
                if (!e.k) return { rows: [{ l: 'V₂', v: NaN }], warn: e.warn, note: e.note };
                v = {
                    p1: n.p2 * n.v2 * t1 / (t2 * n.v1), v1: n.p2 * n.v2 * t1 / (t2 * n.p1), t1: n.p1 * n.v1 * t2 / (n.p2 * n.v2) - c,
                    p2: n.p1 * n.v1 * t2 / (t1 * n.v2), v2: n.p1 * n.v1 * t2 / (t1 * n.p2), t2: n.p2 * n.v2 * t1 / (n.p1 * n.v1) - c
                }[e.k];
                all = { p1: n.p1, v1: n.v1, p2: n.p2, v2: n.v2 };
                all[e.k] = v;
                top = Math.max(all.v1, all.v2);
                return { rows: (['p1', 'v1', 'p2', 'v2'].every(function (k) { return all[k] > 0; }) && isFinite(v) ? drawnTile(graphDrawing('P against V, each on its isotherm, the first red', 0, 1.6 * top, {
                    fs: [function (x) { return all.p1 * all.v1 / x; }].concat(Math.abs(all.p2 * all.v2 / (all.p1 * all.v1) - 1) > 1e-9 ? [function (x) { return all.p2 * all.v2 / x; }] : []),
                    y: [0, 1.6 * Math.max(all.p1, all.p2)], lines: [[all.v1, all.p1, all.v2, all.p2]], dots: [[all.v1, all.p1]], pts: [[all.v2, all.p2]],
                    marks: Math.abs(all.v1 - all.v2) > 0.12 * top ? [[all.v1, '1'], [all.v2, '2']] : [], names: ['V', 'P'] }), 'P and V') : [])
                    .concat([{ l: { p1: 'P₁', v1: 'V₁', t1: 'T₁', p2: 'P₂', v2: 'V₂', t2: 'T₂' }[e.k], v: v }]), warn: !isFinite(v),
                    note: !isFinite(v) ? 'None: a box it is divided by is 0.' : (c ? tr('The same units of P and of V on both sides; T in °C, worked out in kelvin.') : tr('The same units of P and of V on both sides; T in kelvin.')) };
            }

            // a gas as a box has it: its formula as chemists write it, else the text, for a tile or, plain, for a drawing
            function gasName(t, plain) {
                return /^air$/i.test(t) ? 'Air' : CalcChem.parse(t).error ? escaped(t) : plain ? CalcChem.plain(t) : CalcChem.html(t);
            }

            // a number to write in a note or on a drawing, to 4 digits, with the decimal mark in use
            function gasNum(v) {
                return local(String(+(+v).toPrecision(4)));
            }

            // Dalton's law: each gas's moles, grams, fraction or pressure; the total pressure typed, or of n, V and T
            function runDalton(n, raw) {
                var kind = +raw.is || 0, u = +raw.pu || 0, unit = GAS_PU[u], R = GAS_R[u], T = n.t + (raw.tu === '1' ? 273.15 : 0), none = [{ l: 'P, ' + unit, v: NaN }],
                    read, list, sum = 0, P, mol = NaN, rest, rows, M, i;
                if (!raw.g) return { rows: none };
                read = CalcChem.readGases(raw.g, engine.comma);
                if (read.error !== undefined) {
                    return { rows: none, bad: read.error ? ['g'] : [], warn: !!read.error, note: (read.error ? tr('{error} is not a gas and a number: ', { error: read.error }) : 'Each gas and a number: ') + local(listTyped(['N2 0.78', 'O2 0.21'])) + '.' };
                }
                list = read.list.map(function (g) { return { t: g.t, v: g.v }; });
                for (i = 0; kind === 1 && i < list.length; i++) { // grams, as moles
                    M = CalcChem.gasOf(list[i].t); // air too
                    if (M.error) return { rows: none, bad: ['g'], warn: true, note: formulaWhy(M, list[i].t) || tr('{list} is not a formula.', { list: list[i].t }) };
                    list[i].v /= M.M;
                }
                list.forEach(function (g) { sum += g.v; });
                if (!(sum > 0)) return { rows: none, bad: ['g'], warn: true, note: 'An amount above 0 of a gas at least.' };
                if (raw.v && raw.t && !(n.v > 0 && T > 0)) return { rows: none, warn: true, note: 'V above 0, and T above absolute zero.' };
                if (kind === 3) { // the pressure of each: the total their sum, or what is typed, the rest of it another gas's
                    P = sum;
                    if (raw.p) {
                        rest = n.p - sum;
                        if (rest < -1e-9 * sum) return { rows: none, warn: true, note: tr('P is less than the pressures of the gases add up to, {sum} {unit}.', { sum: gasNum(sum), unit: unit }) };
                        if (rest > 1e-9 * sum) list.push({ v: rest, rest: true });
                        P = n.p;
                    }
                    if (raw.v && raw.t) mol = P * n.v / (R * T);
                } else {
                    P = raw.p ? n.p : kind < 2 && raw.v && raw.t ? sum * R * T / n.v : NaN;
                    if (kind < 2) mol = sum;
                    else if (raw.p && raw.v && raw.t) mol = n.p * n.v / (R * T);
                }
                list.forEach(function (g) { g.x = g.v / (kind === 3 ? P : sum); });
                rows = [{ l: 'P, ' + unit, v: CalcMaths.round(P) }, { l: 'n, mol', v: CalcMaths.round(mol) }];
                list.forEach(function (g) {
                    var name = g.rest ? 'The rest' : gasName(g.t);
                    rows.push({ l: name + ', ' + unit, v: CalcMaths.round(g.x * P) }, { l: 'x of ' + name, v: CalcMaths.round(g.x) });
                });
                return {
                    rows: drawnTile(shareDrawing('Each gas\'s share of the pressure', list.map(function (g) {
                        return [g.rest ? 'Rest' : gasName(g.t, true), g.x, gasNum(100 * g.x) + '%'];
                    })), 'Each gas\'s share').concat(rows), cols: 2,
                    note: isFinite(P) ? 'Each gas pushes as it would alone: its pressure is its mole fraction x of the total.' : 'Type P, or V and T, for the pressure of each.'
                };
            }

            // a gas collected over water: the vapour of the water at T, by Antoine's equation, taken from P
            function runWet(n, raw) {
                var u = +raw.pu || 0, unit = GAS_PU[u], T = n.t + (raw.tu === '1' ? 273.15 : 0), none = [{ l: tr('Dry gas, {unit}', { unit: unit }), v: NaN }, { l: tr('Water, {unit}', { unit: unit }), v: NaN }],
                    pw, pg, M = {}, mol, rows;
                if (!raw.p || !raw.t) return { rows: none, note: raw.p || raw.t ? 'Type P and T.' : '' };
                pw = CalcChem.waterVapour(T - 273.15) / 760 * GAS_P[u];
                if (!isFinite(pw)) return { rows: none, warn: true, note: 'T from 0 °C to 100 °C, where water is liquid.' };
                pg = n.p - pw;
                if (!(pg > 0)) return { rows: none, warn: true, note: tr('P is above the vapour of the water at this T, {pw} {unit}.', { pw: gasNum(pw), unit: unit }) };
                if (raw.f) {
                    M = massOf(raw, 'f');
                    if (M.why) return { rows: none, bad: M.bad ? ['f'] : [], warn: true, note: M.why };
                }
                rows = [{ l: tr('Dry gas, {unit}', { unit: unit }), v: CalcMaths.round(pg) }, { l: tr('Water, {unit}', { unit: unit }), v: CalcMaths.round(pw) }, { l: 'Dry gas, %', v: CalcMaths.round(100 * pg / n.p) }];
                if (raw.v) {
                    mol = pg / GAS_P[u] * n.v / (GAS_R[0] * T);
                    rows.push({ l: 'n, mol', v: CalcMaths.round(mol) }, { l: 'Dry at STP, L', v: CalcMaths.round(mol * GAS_R[0] * 273.15) });
                    if (M.M) rows.push({ l: 'Mass, g', v: CalcMaths.round(mol * M.M) });
                }
                return {
                    rows: drawnTile(graphDrawing('The vapour of water as it warms, at T the dot', 0, Math.min(100, Math.max(40, (T - 273.15) * 1.6)), {
                        fs: [function (x) { return CalcChem.waterVapour(x) / 760 * GAS_P[u]; }], dots: [[T - 273.15, pw]], names: ['°C', 'P<tspan class="calc-sv-sub" dy="2">water</tspan>'] }),
                        tr('Water\'s vapour, {unit}', { unit: unit })).concat(rows), cols: 2,
                    note: tr('The vapour of water at {t} °C, by Antoine\'s equation{v}', { t: gasNum(T - 273.15), v: (raw.v ? '.' : tr('; with V, the moles of the gas{v}', { v: (raw.f ? tr(' and its mass.') : '.') })) })
                };
            }

            // a reaction's amounts, its gases in litres at T and P, else at STP
            function runGasVolumes(n, raw) {
                var u = +raw.pu || 0, P = raw.p ? n.p / GAS_P[u] : 1, T = raw.t ? n.t + (raw.tu === '1' ? 273.15 : 0) : 273.15, Vm = GAS_R[0] * T / P,
                    none = [{ l: 'Balanced', v: NaN, wide: true }], b, read, r, rows, bars = [], bad = null;
                if (!raw.eq) return { rows: none };
                b = CalcChem.balance(raw.eq);
                if (b.error) return { rows: none, bad: ['eq'], warn: true, note: equationWhy(b) };
                rows = [{ l: 'Balanced', text: b.html, copy: b.text, wide: true }];
                if (!(P > 0 && T > 0)) return { rows: rows, warn: true, note: 'P above 0, and T above absolute zero.' };
                if (!raw.a) return { rows: rows, note: tr('Type the amount of a formula, in g, mol or L: {left} 10 g.', { left: CalcChem.plain(b.left[0].t) }) };
                read = CalcChem.readAmounts(raw.a, engine.comma, true);
                if (read.error) return { rows: rows, bad: ['a'], warn: true, note: tr('{error} is not a formula and an amount: C3H8 10 L, or O2 0.5 mol.', { error: read.error }) };
                read.list.forEach(function (x) { // litres of a gas, as moles
                    if (x.unit !== 'l' && x.unit !== 'ml') return;
                    if (!CalcChem.isGas(x.t, T - 273.15)) bad = bad || x.t;
                    x.v = (x.unit === 'ml' ? x.v / 1000 : x.v) / Vm;
                    x.unit = 'mol';
                });
                if (bad) return { rows: rows, bad: ['a'], warn: true, note: tr('{bad} is not a gas here: its amount in g or mol, or (g) after it.', { bad: CalcChem.plain(bad) }) };
                r = CalcChem.amounts(raw.eq, read.list);
                if (r.error === 'not in') return { rows: rows, bad: ['a'], warn: true, note: tr('{t} is not in the equation.', { t: r.t }) };
                if (r.error) return { rows: rows, note: 'Type the amount of a formula, or of each reactant.' };
                yieldRows(r, rows);
                rows.push({ l: 'A mole of gas, L', v: CalcMaths.round(Vm), wide: true });
                amountRows(r, rows, function (x) {
                    var gas = CalcChem.isGas(x.t, T - 273.15);
                    if (gas) bars.push([CalcChem.plain(x.t), x.mol * Vm, x.t === r.limiting]);
                    return gas ? { unit: 'L', per: Vm } : { unit: 'g', per: x.M };
                });
                return {
                    rows: drawnTile(labelBars(tr('The litres of each gas{v}', { v: (r.limiting ? tr(', the limiting one red') : '') }), bars), 'Litres of each gas').concat(rows), cols: 2,
                    note: tr('{v}: the gases in litres, the rest in grams.', { v: (raw.p || raw.t ? tr('At {t} °C and {p} atm', { t: gasNum(T - 273.15), p: gasNum(P) }) : tr('At STP, 0 °C and 1 atm')) })
                };
            }

            // a box of a gas, its formula or its molar mass: { M, html, plain } or { why, bad }
            function gasBox(raw, k, name) {
                var s = raw[k], r;
                if (/^\d*[.,]?\d+(?:e[+-]?\d+)?$/i.test(s)) {
                    r = +s.replace(',', '.');
                    return r > 0 ? { M: r, html: name, plain: name } : { why: tr('{name}: a molar mass above 0.', { name: name }), bad: true };
                }
                r = CalcChem.molarMass(s);
                return r.error ? { why: formulaWhy(r, name) || tr('{name} is not a formula.', { name: name }), bad: true } : { M: r.mass, html: CalcChem.html(s), plain: CalcChem.plain(s) };
            }

            // Graham's law: two gases and the ratio of their rates, or of their times, from any two
            function runEffusion(n, raw) {
                var e = oneEmpty(raw, ['a', 'b', 'r'], ['gas 1', 'gas 2', 'the ratio']), a = {}, b = {}, ratio, M1, M2, v1, v2, slow, rows, near, none = [{ l: 'r<sub>1</sub> ÷ r<sub>2</sub>', v: NaN }];
                if (!e.k) return { rows: none, warn: e.warn, note: e.note };
                if (raw.a) a = gasBox(raw, 'a', 'Gas 1');
                if (raw.b) b = gasBox(raw, 'b', 'Gas 2');
                if (a.why || b.why) return { rows: none, bad: [a.why ? 'a' : '', b.why ? 'b' : ''].filter(Boolean), warn: true, note: a.why || b.why };
                if (e.k !== 'r' && !(n.r > 0)) return { rows: none, warn: true, note: 'A ratio above 0.' };
                ratio = e.k === 'r' ? Math.sqrt(b.M / a.M) : raw.of === '1' ? 1 / n.r : n.r; // of the rates, r₁ ÷ r₂
                M1 = e.k === 'a' ? b.M / (ratio * ratio) : a.M;
                M2 = e.k === 'b' ? a.M * ratio * ratio : b.M;
                rows = [{ l: 'r<sub>1</sub> ÷ r<sub>2</sub>', v: CalcMaths.round(ratio) }, { l: 't<sub>1</sub> ÷ t<sub>2</sub>', v: CalcMaths.round(1 / ratio) },
                    { l: 'M<sub>1</sub>, g/mol', v: CalcMaths.round(M1) }, { l: 'M<sub>2</sub>, g/mol', v: CalcMaths.round(M2) }];
                if (e.k !== 'r') {
                    near = CalcChem.gasesNear(e.k === 'a' ? M1 : M2, 0.03).slice(0, 3);
                    rows.push({ l: tr('Gas {v} could be', { v: (e.k === 'a' ? 1 : 2) }), text: near.length ? near.map(function (g) { return gasName(g.t) + ' ' + gasNum(g.M); }).join(', ') : 'None of the common gases', wide: true });
                }
                v1 = 1 / Math.sqrt(M1);
                v2 = 1 / Math.sqrt(M2);
                slow = Math.min(v1, v2);
                return {
                    rows: drawnTile(labelBars('How fast each gets through, the slower 1, the faster red', [[a.plain || 'Gas 1', v1 / slow, v1 > v2], [b.plain || 'Gas 2', v2 / slow, v2 > v1]],
                        function (x) { return shortNum(x) + '×'; }), 'How fast each goes').concat(rows), cols: 2,
                    note: 'The lighter gas is the faster: its rate goes as 1 ÷ √M, and its time as √M.'
                };
            }

            // the standard atmosphere: the air at a height, or the height of a pressure
            function runAir(n, raw) {
                var u = +raw.pu || 0, unit = GAS_PU[u], hu = +raw.hu || 0, per = [1, 1000, 0.3048][hu], hName = ['m', 'km', 'ft'][hu], toPa = 101325 / GAS_P[u],
                    t0 = (raw.t0 ? n.t0 : 15) + 273.15, p0 = raw.p0 ? n.p0 * toPa : 101325, e = oneEmpty(raw, ['h', 'p'], ['the height', 'P']),
                    none = [{ l: 'P, ' + unit, v: NaN }, { l: tr('Height, {hName}', { hName: hName }), v: NaN }], h, a, rows, x0, x1, pAt;
                if (!e.k) return { rows: none, warn: e.warn, note: e.note };
                if (!(t0 > 0 && p0 > 0)) return { rows: none, warn: true, note: 'Sea level above absolute zero, and its P above 0.' };
                h = e.k === 'h' ? CalcPhysics.altitude(n.p * toPa, t0, p0) : n.h * per;
                a = isFinite(h) ? CalcPhysics.atmosphere(h, t0, p0) : null;
                if (!a) return { rows: none, warn: true, note: e.k === 'h' ? 'No height from −5 km to 84.85 km has that P.' : 'A height from −5 km to 84.85 km.' };
                if (e.k === 'h') a.p = n.p * toPa; // as typed, not as the height found to the mm gives it
                rows = [{ l: 'P, ' + unit, v: CalcMaths.round(a.p / toPa) }, { l: tr('Height, {hName}', { hName: hName }), v: CalcMaths.round(h / per) }];
                if (e.k === 'h') rows.reverse();
                rows.push({ l: 'T, °C', v: CalcMaths.round(a.t - 273.15) }, { l: 'Density, kg/m³', v: CalcMaths.round(a.rho) }, { l: '% of sea level', v: CalcMaths.round(100 * a.p / p0) },
                    { l: 'O<sub>2</sub>, ' + unit, v: CalcMaths.round(0.2095 * a.p / toPa) }, { l: 'Water boils, °C', v: CalcMaths.round(CalcChem.waterBoils(a.p / 101325 * 760)), wide: true });
                pAt = function (x) { var q = CalcPhysics.atmosphere(x * per, t0, p0); return q ? q.p / toPa : NaN; };
                x0 = Math.max(-5000, Math.min(0, h * 1.3)) / per;
                x1 = Math.min(84852, Math.max(h * 1.5, 11000)) / per;
                return {
                    rows: drawnTile(graphDrawing('Its pressure with height', x0, x1, { fs: [pAt], dots: [[h / per, a.p / toPa]], y: [0, pAt(x0) * 1.2], names: [hName, 'P'] }),
                        'P against height').concat(rows), cols: 2,
                    note: (raw.t0 || raw.p0 ? tr('By the standard atmosphere, ISA, from sea level as typed; the weather moves it a few percent.') : tr('By the standard atmosphere, ISA, from 15 °C and 1 atm at sea level; the weather moves it a few percent.'))
                };
            }

            // the speed of sound in a gas at T, and the Mach number of a speed
            function runSound(n, raw) {
                var c = raw.tu === '1' ? 273.15 : 0, T = n.t + c, none = [{ l: 'v, m/s', v: NaN }], g, gamma, v, rows;
                if (!raw.t) return { rows: none, note: raw.g || raw.gamma || raw.u ? 'Type T.' : '' };
                g = CalcChem.gasOf(raw.g || 'air');
                if (g.error) return { rows: none, bad: ['g'], warn: true, note: g.error === 'element' ? formulaWhy(g) : 'Air, or a gas by its formula: He, CO2.' };
                gamma = raw.gamma ? n.gamma : g.gamma;
                if (!(T > 0)) return { rows: none, warn: true, note: 'T is above absolute zero, 0 K or –273.15 °C.' };
                if (!(gamma > 1)) return { rows: none, warn: true, note: 'γ above 1: 5/3 of a gas of single atoms, 7/5 of two.' };
                v = CalcPhysics.sound(gamma, g.M, T);
                rows = [{ l: 'v, m/s', v: v }].concat(raw.u ? [{ l: 'Mach', v: CalcMaths.round(n.u / v) }] : [], [{ l: 'v, km/h', v: CalcMaths.round(v * 3.6) },
                    { l: 'v, ft/s', v: CalcMaths.round(v / 0.3048) }, { l: '1 km takes, s', v: CalcMaths.round(1000 / v) }, { l: 'γ', v: CalcMaths.round(gamma) }, { l: 'M, g/mol', v: CalcMaths.round(g.M) }]);
                return {
                    rows: drawnTile(graphDrawing('Its speed with temperature', T * 0.4 - c, T * 1.6 - c, { fs: [function (x) { return CalcPhysics.sound(gamma, g.M, x + c); }], dots: [[n.t, v]],
                        names: ['T', 'v'] }), 'v against T').concat(rows), cols: 2,
                    note: g.guessed && !raw.gamma ? tr('γ of {g} is not known here: {gamma}, from its atoms. Type γ for a better one.', { g: gasName(raw.g, true), gamma: gasNum(gamma) }) :
                        raw.u && n.u >= v ? 'Mach 1 or more: as fast as sound or faster.' : 'Of an ideal gas: faster as it is hotter, slower as it is heavier.'
                };
            }

            // The panel: the periodic table on its first tab, the tools on the others. The table is coloured
            // by the kind of element, its state, its block or its electronegativity; a click on an element
            // shows all that is known of it, each number of it to put in. Popped out, it is as big as the page,
            // or in a window of its own in the extension
            var chemPanel = root.querySelector('.calc-chem'),
                chemButton = root.querySelector('.calc-chem-btn'),
                chemTable = chemPanel.querySelector('.calc-pt'),
                chemGrid = chemPanel.querySelector('.calc-pt-grid'),
                chemSearch = chemPanel.querySelector('.calc-pt-search'),
                chemModes = chemPanel.querySelector('.calc-pt-modes'),
                chemLegend = chemPanel.querySelector('.calc-pt-legend'),
                chemInfo = chemPanel.querySelector('.calc-pt-info'),
                chemSize = chemPanel.querySelector('.calc-chem-size'),
                chemList = chemPanel.querySelector('.calc-sv-list'),
                chemTab = 'table', // the tab shown: the table, or one of the tools'
                chemBy = 'cat', // what the colours of the table show: cat, state, block, or a number of CHEM_HEAT
                chemByBig = null, // the colour chosen popped out, kept and saved still while popped in shows Kind, the colours having no buttons there
                chemAt = 26, // the element chosen, by its number: iron each time the panel opens
                chemShut = false, // popped out on a wide page, its card at the right closed: the table the whole width
                chemSpec = 'abs', // the element's spectrum as drawn: abs, dark lines across the rainbow, or em, bright ones on black
                chemHot = '', // a colour of the legend clicked: only its elements bright
                chemAlone = false, // in a window of its own, in the extension
                CHEM_BY = { cat: 'Kind', state: 'State', block: 'Block', en: 'EN', ie: 'IE', mp: 'Melts', density: 'Density',
                    bp: 'Boils', radius: 'Atomic radius', affinity: 'Electron affinity', mass: 'Mass', year: 'Discovered' },
                // the numbers the table can be coloured by, from pale yellow at the least to red at the most: density
                // by its square root, for the metals not to be all red together
                // Each its own colours, [hue, saturation, lightness] from its least to its most, all light enough for
                // the dark letters: electronegativity blue to red, ionization energy green to purple, the melting
                // point cold blue to hot red, density pale sand to brown
                CHEM_HEAT = {
                    en: { of: function (e) { return chemKnown(e, 'en'); }, lo: 0.7, hi: 4, label: 'Pauling', ends: [0.7, 3.98], fixed: 2,
                        colours: [[212, 70, 76], [168, 48, 68], [50, 78, 70], [14, 70, 63]] },
                    ie: { of: function (e) { return chemKnown(e, 'ie'); }, lo: 375, hi: 2373, unit: 'e', ends: [375.7, 2372.3],
                        colours: [[130, 45, 76], [185, 50, 70], [225, 58, 75], [275, 45, 71]] },
                    mp: { of: function (e) { return chemKnown(e, 'mp'); }, lo: -260, hi: 3550, unit: 't', ends: [-259.16, 3550],
                        colours: [[205, 75, 74], [50, 85, 78], [26, 85, 66], [2, 72, 60]] },
                    density: { of: function (e) { return chemKnown(e, 'density') === null ? null : Math.sqrt(e.density); }, back: function (v) { return v * v; }, lo: 0, hi: 4.76, unit: 'd', ends: [0, 22.59],
                        colours: [[45, 45, 86], [35, 40, 72], [25, 35, 60]] },
                    // popped out only, in the table's own pastels: the boiling point as the melting point, cold to hot; the
                    // radius aqua to lavender, small to big; the affinity pale yellow to green; the mass peach to coral,
                    // light to heavy; the year found sand to violet, ancient to new, those known since ancient times at its start
                    bp: { of: function (e) { return chemKnown(e, 'bp'); }, lo: -270, hi: 5930, unit: 't', ends: [-268.93, 5930],
                        colours: [[205, 75, 74], [50, 85, 78], [26, 85, 66], [2, 72, 60]] },
                    radius: { of: function (e) { return chemKnown(e, 'radius'); }, lo: 120, hi: 348, label: 'pm', ends: [120, 348], fixed: 0,
                        colours: [[165, 59, 78], [217, 88, 83], [253, 75, 84]] },
                    affinity: { of: function (e) { return chemKnown(e, 'affinity'); }, lo: 0, hi: 349, unit: 'e', ends: [7.6, 349],
                        colours: [[50, 90, 84], [86, 58, 76], [142, 44, 69]] },
                    mass: { of: function (e) { return e.mass; }, lo: 1, hi: 294, label: 'g/mol', ends: [1.008, 294],
                        colours: [[35, 93, 89], [31, 94, 73], [5, 81, 73]] },
                    year: { of: function (e) { return e.year === null ? null : Math.max(e.year, 1600); }, lo: 1600, hi: 2010, ends: [1600, 2010], fixed: 0,
                        show: function (v) { return v <= 1600 ? tr('Ancient') : String(Math.round(v)); },
                        colours: [[42, 69, 80], [165, 59, 78], [285, 69, 83]] }
                },
                // the units the numbers of an element are shown in, each changed with a click on it: of temperature,
                // of energy and of density. Each is [its name, from the stored unit, its places]
                CHEM_UNITS = {
                    t: { C: ['°C', function (v) { return v; }, 2], F: ['°F', function (v) { return v * 9 / 5 + 32; }, 2], K: ['K', function (v) { return v + 273.15; }, 2] },
                    e: { kJ: ['kJ/mol', function (v) { return v; }, 1], eV: ['eV', function (v) { return v / 96.485; }, 3] },
                    d: { g: ['g/cm³', function (v) { return v; }, 8], kg: ['kg/m³', function (v) { return v * 1000; }, 5], lb: ['lb/ft³', function (v) { return v * 62.42796; }, 4] },
                    // the atomic mass in full, or to 3 places
                    m: { full: ['g/mol', function (v) { return v; }, 6], d3: ['g/mol, 3 places', function (v) { return v; }, 3] }
                },
                chemUnit = { t: 'C', e: 'kJ', d: 'g', m: 'full' },
                // the tiles of an element's details, by their labels: the tip of each, 'chem fact …' of tips.js
                CHEM_FACTS = { 'Atomic number': 'z', 'Atomic mass': 'mass', 'Electronegativity': 'en', 'Ionization energy': 'ie', 'Melting point': 'mp', 'Boiling point': 'bp',
                    'Density': 'density', 'Group': 'group', 'Period': 'period', 'Protons': 'protons', 'Electrons': 'electrons', 'Neutrons': 'neutrons',
                    'Electron configuration': 'config', 'Shells': 'shells', 'Block': 'block', 'Outer-shell electrons': 'outer', 'Unpaired electrons': 'unpaired',
                    'Atomic radius': 'radius', 'Electron affinity': 'affinity', 'Common ions': 'ions', 'Oxidation states': 'ox', 'State at 20 °C': 'state',
                    'Specific heat': 'heat', 'Discovered': 'year', 'Isotopes': 'isotopes', 'Name': 'story', 'History': 'story', 'Uses': 'uses',
                    'Covalent radius': 'covalent', 'Heat of fusion': 'fusion', 'Heat of vaporization': 'vaporization', 'Thermal conductivity': 'conductivity',
                    'Electrical resistivity': 'resistivity', 'Mohs hardness': 'mohs', 'CAS number': 'cas', 'Magnetism': 'magnetic', 'Crystal structure': 'crystal',
                    'Abundance in the crust': 'abundance', 'Appearance': 'appearance' },
                chemTemp = 20, // the temperature the table shows the states at, °C: its slider in the State colours
                chemSliding = false, // a knob of the slider dragged: no tips meanwhile
                chemCut = {}, // of each number of CHEM_HEAT, its slider: [from, to] on its scale, the elements outside dimmed, null an open end; none, all bright
                CHEM_STATES = [['solid', 'Solid'], ['liquid', 'Liquid'], ['gas', 'Gas'], ['unknown', 'Unknown']],
                CHEM_BLOCKS = [['s', 's-block'], ['p', 'p-block'], ['d', 'd-block'], ['f', 'f-block']],
                chemCards = toolCards(chemList, CHEM_TOOLS, 'chem', false, {
                    open: function () { return chemPanel.classList.contains('calc-open') && chemTab !== 'table'; },
                    done: chemDone,
                    // big on a wide page, the tools are a list at the left and the one chosen opens beside it (style.css)
                    side: function () { return bigSide(chemPanel); }
                });

            // the class of an element's colour, as the table is coloured now
            // a value of an element as it is measured: null where it is only predicted, which the colours of the table leave out
            function chemKnown(e, k) {
                return e.predicted[k] ? null : e[k];
            }

            function chemClass(e) {
                return chemBy === 'cat' ? 'calc-pt-' + e.cat : chemBy === 'state' ? 'calc-pt-' + (chemStateOf(e) || 'unknown') : chemBy === 'block' ? 'calc-pt-' + e.block + 'b' :
                    CHEM_HEAT[chemBy].of(e) === null ? 'calc-pt-unknown' : '';
            }

            // Solid, liquid or gas at the temperature of the slider, at 1 atm, from its melting and boiling points. With
            // no melting point it goes from solid straight to gas, as arsenic does, but helium, which is liquid down to 0 K
            function chemStateOf(e) {
                if (e.mp === null && e.bp === null || e.state === null) return e.state; // the heaviest not known, their points only predicted
                if (e.bp === null && e.predicted.mp) return e.state; // only a melting point predicted, nothing of where it boils: as it is known
                if (e.bp !== null && chemTemp >= e.bp) return 'gas';
                if (e.mp === null) return e.z === 2 ? 'liquid' : 'solid';
                return chemTemp < e.mp ? 'solid' : 'liquid';
            }

            // the slider's place, 0 to 1000, and its temperature: kelvin as its square, 0 to 6000 K, for the room
            // from 0 K to the boiling of the gases to be as wide as from there to tungsten's 5555 °C
            function chemTempAt(p) {
                return Math.round(6000 * p * p / 1e6 - 273.15);
            }

            function chemTempPlace(t) {
                return Math.round(Math.sqrt((t + 273.15) * 1e6 / 6000));
            }

            function chemTempText() {
                return local(String(chemIn('t', chemTemp))).replace('-', '−') + ' ' + chemUnitName('t');
            }

            // The slider of a number has two ends, the elements between them bright: each end's place 0 to 1000 along
            // the scale, and back; at the end of the scale an end is open, null, for no element to be left out there
            function chemCutPlaces() {
                var h = CHEM_HEAT[chemBy], c = chemCut[chemBy] || [null, null];
                return c.map(function (v, i) { return v === null ? i * 1000 : Math.round(1000 * (v - h.lo) / (h.hi - h.lo)); });
            }

            function chemCutAt(p, i) {
                var h = CHEM_HEAT[chemBy];
                return p <= 0 && !i || p >= 1000 && i ? null : h.lo + (h.hi - h.lo) * p / 1000;
            }

            // an end of the slider, in the unit chosen: an open one at the least or the most of any element
            function chemCutEnd(i) {
                var h = CHEM_HEAT[chemBy], c = chemCut[chemBy], v = c && c[i] !== null ? (h.back ? h.back(c[i]) : c[i]) : h.ends[i];
                v = Math.max(h.ends[0], Math.min(h.ends[1], v)); // no further than the least and the most of any element
                if (h.show) return h.show(v);
                v = h.unit ? chemIn(h.unit, v) : v;
                return local(h.fixed !== undefined ? v.toFixed(h.fixed) : String(+v.toPrecision(3))).replace('-', '−') + (chemHeatUnit(h) ? ' ' + chemHeatUnit(h) : '');
            }

            // the unit of a number's scale: the one chosen for its kind, or its own
            function chemHeatUnit(h) {
                return h.unit ? chemUnitName(h.unit) : h.label ? tr(h.label) : '';
            }

            // an element dimmed by the slider: outside its ends, or its number not known
            function chemCutOut(e) {
                var c = CHEM_HEAT[chemBy] && chemCut[chemBy], v;
                if (!c) return false;
                v = CHEM_HEAT[chemBy].of(e);
                return v === null || (c[0] !== null && v < c[0]) || (c[1] !== null && v > c[1]);
            }

            // The slider under the key: a knob for the temperature of the states; for a number, its scale of
            // colours with a knob at each end, the number of each end beside it, the colours outside them shaded.
            // Not the browser's, which has one knob only, and is not where it is drawn when the page is zoomed
            function chemSliderHtml() {
                var places = chemSliderPlaces(), heat = chemBy !== 'state', names = heat ? [tr('From'), tr('To')] : [tr('Temperature')];
                // the first number before the line, against it: of the temperature its only one. Each as wide as the
                // longest it can say, three figures and a sign with the unit, for the line not to move and no more room
                var unit = heat ? chemHeatUnit(CHEM_HEAT[chemBy]) : chemUnitName('t'),
                    width = 'width: ' + (0.6 * Math.max(heat ? chemCutEnd(0).length : 0, heat ? chemCutEnd(1).length : 0, 6 + unit.length)).toFixed(1) + 'em';
                // the temperature's line in the colours of the states, solid to liquid to gas as it warms (style.css), shaded above it
                return '<span class="calc-pt-temp' + (heat ? ' calc-pt-heat" style="--calc-heat: ' + chemGradient(CHEM_HEAT[chemBy]) + '; ' : '" style="') + '--calc-label: ' + width.slice(7) + '">' +
                    '<span class="calc-pt-temp-v calc-pt-from" role="button"></span>' +
                    '<span class="calc-pt-range"><span class="calc-pt-range-out"></span>' + (heat ? '<span class="calc-pt-range-out"></span>' : '') +
                    places.map(function (p, i) {
                        return '<span class="calc-pt-range-knob" data-i="' + i + '" role="slider" tabindex="0" aria-label="' + names[i] + '" aria-valuemin="0" aria-valuemax="1000"></span>';
                    }).join('') + '</span>' + (heat ? '<span class="calc-pt-temp-v" role="button"></span>' : '') + '</span>';
            }

            function chemSliderPlaces() {
                return chemBy === 'state' ? [chemTempPlace(chemTemp)] : chemCutPlaces();
            }

            // the knobs where they are, the numbers they are at, and the scale shaded outside them
            function chemSliderDraw(places) {
                var knobs = chemLegend.querySelectorAll('.calc-pt-range-knob'), texts = chemLegend.querySelectorAll('.calc-pt-temp-v'),
                    out = chemLegend.querySelectorAll('.calc-pt-range-out');
                if (!knobs.length) return;
                [].forEach.call(texts, function (t, i) { t.textContent = chemBy === 'state' ? chemTempText() : chemCutEnd(i); });
                [].forEach.call(knobs, function (k, i) {
                    k.style.left = places[i] / 10 + '%';
                    k.setAttribute('aria-valuenow', places[i]);
                    k.setAttribute('aria-valuetext', texts[texts.length > 1 ? i : 0].textContent);
                });
                if (out.length > 1) {
                    out[0].style.cssText = 'left: 0; width: ' + places[0] / 10 + '%';
                    out[1].style.cssText = 'left: ' + places[1] / 10 + '%; right: 0';
                } else out[0].style.cssText = 'left: ' + places[0] / 10 + '%; right: 0';
            }

            // a knob moved to a place: the other knob not passed, the table as it says
            // With both knobs at one place, the one that moves is the one on the side it goes to, for neither to be stuck
            // against the other at an end. The knob moved, to go on with
            function chemSliderSet(i, p) {
                var places = chemSliderPlaces(), knobs;
                p = Math.round(Math.max(0, Math.min(1000, p)));
                if (places.length > 1 && places[0] === places[1] && p !== places[0]) {
                    if (i !== (p < places[0] ? 0 : 1)) {
                        i = p < places[0] ? 0 : 1;
                        knobs = chemLegend.querySelectorAll('.calc-pt-range-knob');
                        if (knobs[i]) knobs[i].focus({ preventScroll: true });
                    }
                }
                if (places.length > 1) p = i ? Math.max(p, places[0]) : Math.min(p, places[1]);
                places[i] = p;
                if (chemBy === 'state') chemTempTo(chemTempAt(p));
                else {
                    chemCut[chemBy] = places.map(chemCutAt);
                    if (chemCut[chemBy][0] === null && chemCut[chemBy][1] === null) delete chemCut[chemBy];
                    chemDim();
                }
                chemSliderDraw(places);
                return i;
            }

            // a number of an element in the unit chosen for it: t, e or d; null as it is, not known
            function chemIn(kind, v) {
                var u = CHEM_UNITS[kind][chemUnit[kind]], f = Math.pow(10, u[2]);
                return v === null || v === undefined ? null : Math.round(u[1](v) * f) / f;
            }

            function chemUnitName(kind) {
                return tr(CHEM_UNITS[kind][chemUnit[kind]][0]);
            }

            // coloured by a number: from pale yellow at its least to red at its most
            function chemHeat(e) {
                var h = CHEM_HEAT[chemBy], v = h && h.of(e);
                if (!h || v === null) return '';
                return 'background: ' + chemColour(h, Math.max(0, Math.min(1, (v - h.lo) / (h.hi - h.lo)))) + '; ';
            }

            // the colour a part t, 0 to 1, along a number's colours: between the two it falls between
            function chemColour(h, t) {
                var c = h.colours, at = t * (c.length - 1), i = Math.min(c.length - 2, Math.floor(at)), f = at - i;
                return 'hsl(' + [0, 1, 2].map(function (k) { return Math.round(c[i][k] + (c[i + 1][k] - c[i][k]) * f) + (k ? '%' : ''); }).join(', ') + ')';
            }

            // the slider's scale: the same colours, from end to end
            function chemGradient(h) {
                return 'linear-gradient(90deg, ' + h.colours.map(function (c, i) { return chemColour(h, i / (h.colours.length - 1)); }).join(', ') + ')';
            }

            // The spectrum of an element of CalcChem.spectrum, 380 to 750 nm, as a tile as wide as all of them: absorbed, its lines dark
            // across the rainbow; given off, each bright in its colour on black; the stronger a line, the wider. Of one with no line
            // there, the strip faint and empty, and why in words: astatine's strongest ultraviolet, of 100 on none measured
            function chemSpectrum(e) {
                var lines = CalcChem.spectrum(e.s) || [], W = 300, L = 8, R = W - 8, T = 6, B = 28, id = 'calc-plot-' + (++app.plotIds), abs = chemSpec === 'abs', body,
                    px = function (nm) { return L + (R - L) * (nm - 380) / 370; },
                    none = !lines.length && (lines.unseen ? tr('None in visible light') : tr('None measured')),
                    said = !none ? (lines.ion ? tr('Of its ion, {s}⁺: ', { s: e.s }) : '') + lines.map(function (l) { return local(l.nm.toFixed(2)); }).join(', ') + ' nm' :
                        lines.unseen ? tr('None in visible light: its strongest are ultraviolet, {unseen} nm', { unseen: lines.unseen.map(function (nm) { return local(String(nm)); }).join(' and ') }) :
                        tr('None measured: NIST has no lines of it, as too few of its atoms have ever been made to see their light');
                body = (abs ? rainbow(id) : '') + '<rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '" fill="' + (abs ? 'url(#' + id + ')' : '#07090c') + '"' + (none ? ' opacity="0.3"' : '') + '/>';
                if (none) body += svgText(W / 2, (T + B) / 2 + 3.5, none, 'middle', 'calc-sv-small calc-sv-bold');
                lines.forEach(function (l) {
                    var w = [0, 0.9, 1.3, 1.8][l.k];
                    body += '<rect x="' + fix(px(l.nm) - w / 2) + '" y="' + T + '" width="' + w + '" height="' + (B - T) + '" fill="' + (abs ? '#000' : nmColour(l.nm)) + '" opacity="' + [0, 0.6, 0.85, 1][l.k] + '"/>';
                });
                [400, 500, 600, 700].forEach(function (nm) {
                    body += '<path class="calc-sv-ground" d="M' + fix(px(nm)) + ' ' + B + 'v3"/>' + svgText(px(nm), B + 12, nm, 'middle');
                });
                return '<div class="calc-sv-tile calc-sv-wide calc-pt-spec" style="--i: 0" data-fact="spectrum" data-lines="' + said + '">' +
                    '<span class="calc-sv-label">' + tr('Spectrum') + ' <i class="calc-pt-unit" role="button">' + tr(abs ? 'absorption' : 'emission') + '</i></span><span class="calc-sv-value">' +
                    svgOf('', W, B + 14, tr(abs ? '{name}\'s absorption spectrum: {lines}' : '{name}\'s emission spectrum: {lines}', { name: tr(e.name), lines: said }),
                        body + '<path class="calc-sv-ground" d="M' + L + ' ' + T + 'h' + (R - L) + 'v' + (B - T) + 'H' + L + 'Z"/>') + '</span></div>';
            }

            // The atom drawn flat, as Bohr drew it: the nucleus with its protons and neutrons, and a ring for
            // each shell, its electrons spaced round it
            function chemAtom(e) {
                var size = 150, mid = size / 2, rings = e.shells.length, gap = (mid - 20) / Math.max(rings, 1), svg, n = Math.round(e.mass) - e.z;
                svg = '<svg class="calc-pt-atom" data-pt="atom" data-full="' + tr('{z} protons, {n} neutrons; electrons {list}', { z: e.z, n: n, list: e.shells.join(', ') }) + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' +
                    tr('{name}: {z} protons, {n} neutrons, electrons in shells of {list}', { name: tr(e.name), z: e.z, n: n, list: e.shells.join(', ') }) + '">';
                e.shells.forEach(function (count, i) { // each shell with its electrons, which come in one after the other from the middle, then go round
                    var r = 18 + gap * (i + 0.75), j, a;
                    svg += '<g class="calc-pt-shell" style="--i: ' + i + '"><circle class="calc-pt-ring" cx="' + mid + '" cy="' + mid + '" r="' + r.toFixed(1) + '"/><g class="calc-pt-spin">';
                    for (j = 0; j < count; j++) {
                        a = 2 * Math.PI * j / count - Math.PI / 2 + i * 0.4;
                        svg += '<circle class="calc-pt-e" cx="' + (mid + r * Math.cos(a)).toFixed(1) + '" cy="' + (mid + r * Math.sin(a)).toFixed(1) + '" r="2.3"/>';
                    }
                    svg += '</g></g>';
                });
                return svg + '<g class="calc-pt-core"><circle class="calc-pt-nucleus" cx="' + mid + '" cy="' + mid + '" r="14"/><text x="' + mid + '" y="' + (mid - 1.5) + '">' + e.z + 'p</text><text x="' + mid + '" y="' + (mid + 7) + '">' + n + 'n</text></g></svg>';
            }

            // The cells of the elements whose words alone would not draw them as they are: of each its real shape, its edges
            // over the first, a; its angle; of the hexagonal ones, c over a. Of a crystal of molecules, a ball for each molecule;
            // of one with many atoms to each point of its lattice, only the lattice, grey, and what is at each point. From
            // each element's own article on Wikipedia, and Donohue's The Structures of the Elements
            var CRYSTAL_OF = {
                H: { hcp: 1.633, mol: 'H₂' }, N: { hcp: 1.633, mol: 'N₂' }, O: { a15: true, mol: 'O₂' }, F: { a15: true, mol: 'F₂' },
                Zn: { hcp: 1.856 }, Cd: { hcp: 1.886 },
                Se: { hex: 1.135, each: '3 atoms at each, along spiral chains' }, Te: { hex: 1.330, each: '3 atoms at each, along spiral chains' },
                In: { bct: 1.521 }, Pa: { bct: 0.825 }, 'Sn White (β)': { sn: 0.546 },
                Hg: { rhombo: 70.53 }, As: { rhombo: 54.1, inside: 0.546 }, Sb: { rhombo: 57.1, inside: 0.533 }, Bi: { rhombo: 57.23, inside: 0.532 },
                B: { rhombo: 65.2, each: '105 atoms at each' }, Sm: { rhombo: 23.3, each: '3 atoms at each' },
                Cl: { box: [1, 0.718, 1.324], base: true, each: '2 Cl₂ molecules at each' }, Br: { box: [1, 0.672, 1.307], base: true, each: '2 Br₂ molecules at each' },
                I: { box: [1, 0.656, 1.366], base: true, each: '2 I₂ molecules at each' }, Ga: { box: [1, 1.695, 1.001], base: true, each: '4 atoms at each' },
                U: { box: [1, 2.056, 1.736], base: true, each: '2 atoms at each' }, Np: { box: [1, 0.709, 0.733], each: '8 atoms at each' },
                S: { box: [1, 1.230, 2.341], face: true, each: '4 S₈ rings at each' }, Pu: { box: [1, 0.780, 1.773], beta: 101.79, each: '16 atoms at each' },
                Mn: { bcc: true, each: '29 atoms at each' }, P: { bcc: true, each: 'P₄ molecules at each' }
            };

            var CRYSTAL_CORNERS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]],
                CRYSTAL_FACES = [[0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5], [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]],
                CRYSTAL_PARTS = { 8: '⅛', 6: '⅙', 4: '¼', 3: '⅓', 2: '½' };

            // A cell of three edges, v, as vectors: its six faces, and its atoms, each [x, y, z, its colour, its share of it,
            // at a corner], from their fractions of the edges and their colours: an atom on a face half in it, on an edge a
            // quarter, at a corner an eighth. With bond, those inside bonded to those as near as it
            function crystalBox(v, atoms, r, bond) {
                function at(f) { return [0, 1, 2].map(function (i) { return f[0] * v[0][i] + f[1] * v[1][i] + f[2] * v[2][i]; }); }
                var faces = [], bonds = [];
                [0, 1, 2].forEach(function (k) {
                    [0, 1].forEach(function (side) {
                        faces.push([[0, 0], [1, 0], [1, 1], [0, 1]].map(function (q) {
                            var f = [];
                            f[k] = side; f[(k + 1) % 3] = q[0]; f[(k + 2) % 3] = q[1];
                            return at(f);
                        }));
                    });
                });
                if (bond) atoms.forEach(function (f) { // those inside the box, none of their fractions 0 or 1
                    if (!f.slice(0, 3).every(function (x) { return x > 0 && x < 1; })) return;
                    atoms.forEach(function (g) {
                        if (g !== f && Math.hypot(f[0] - g[0], f[1] - g[1], f[2] - g[2]) < bond) bonds.push([at(f), at(g)]);
                    });
                });
                return { faces: faces, bonds: bonds, r: r, atoms: atoms.map(function (f) {
                    var ends = f.slice(0, 3).filter(function (x) { return x === 0 || x === 1; }).length;
                    return at(f).concat(f[3], Math.pow(0.5, ends), ends === 3);
                }) };
            }

            // A hexagonal prism of three cells, as books draw it, c high: its layers each at a height, A at the corners and in the
            // middle of the hexagon, B and C each three in the hollows between, one way or the other. An atom at a corner of the
            // prism a sixth in it, on an upright edge a third, in the middle of its top or bottom a half
            function crystalPrism(c, layers, r) {
                var atoms = [], faces, ends;
                function ring(z, from, rad, n) {
                    var out = [], k, a;
                    for (k = 0; k < n; k++) {
                        a = (from + k * 360 / n) * Math.PI / 180;
                        out.push([rad * Math.cos(a), rad * Math.sin(a), z]);
                    }
                    return out;
                }
                layers.forEach(function (l) {
                    var z = l[1] * c, end = l[1] === 0 || l[1] === 1;
                    if (l[0] === 'A') {
                        ring(z, 0, 1, 6).forEach(function (p) { atoms.push(p.concat(0, end ? 1 / 6 : 1 / 3, end)); });
                        atoms.push([0, 0, z, 0, end ? 0.5 : 1, false]);
                    } else {
                        ring(z, l[0] === 'B' ? 30 : 90, 1 / Math.sqrt(3), 3).forEach(function (p) { atoms.push(p.concat(1, 1, false)); });
                    }
                });
                ends = [ring(0, 0, 1, 6), ring(c, 0, 1, 6)];
                faces = ends.concat(ends[0].map(function (p, i) { var q = ends[0][(i + 1) % 6]; return [p, q, [q[0], q[1], c], [p[0], p[1], c]]; }));
                return { atoms: atoms, faces: faces, r: r, tilt: 34, cells: 3 };
            }

            // graphite: two of its sheets of hexagons, the second moved by one bond, so half its atoms are over the first's
            function crystalGraphite() {
                var atoms = [], bonds = [], ups = [];
                [[0, 0, 0], [1, 0, 1.6]].forEach(function (s) {
                    var h = [], k, a;
                    for (k = 0; k < 6; k++) {
                        a = k * Math.PI / 3;
                        h.push([s[0] + Math.cos(a), s[1] + Math.sin(a), s[2]]);
                    }
                    h.forEach(function (p, i) { atoms.push(p.concat(0, 0)); bonds.push([p, h[(i + 1) % 6]]); });
                });
                atoms.slice(6).forEach(function (p) {
                    atoms.slice(0, 6).forEach(function (q) { if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) < 1e-6) ups.push([q, p]); });
                });
                return { atoms: atoms, bonds: bonds, guides: ups, r: 0.17, note: 'Sheets of hexagons; dashed, atom over atom', label: 'two of its sheets' };
            }

            // A line from each atom not at a corner of the cell to those nearest it, as books draw them: of the orange ones, so
            // the one in the middle of a cube to its 8 corners, one in the middle of a face to that face's 4, one between two
            // layers to the 3 above and the 3 below; with same, of its own colour, as the molecules of oxygen in pairs; with
            // any, of all, as white tin's 4 bonds; with layers, the blue ones of a hexagonal prism to both, so its layers
            // between are triangles, as books draw them; with a15, of oxygen's cube, the blue ones to their partners in their
            // chains and to the orange ones nearest, the 2 corners of their face and the one in the middle. Each line once
            function crystalLinks(c, rule) {
                var seen = {};
                c.links = [];
                c.atoms.forEach(function (a) {
                    if (a[5]) return;
                    (rule === 'layers' ? (a[3] === 1 ? ['', 'same'] : ['']) : rule === 'a15' ? (a[3] === 1 ? ['', 'same'] : []) : [rule]).forEach(function (r) {
                        var near = c.atoms.filter(function (b) { return b !== a && (r === 'any' || b[3] === (r === 'same' ? a[3] : 0)); }), d;
                        function apart(b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
                        if (!near.length) return;
                        d = Math.min.apply(null, near.map(apart));
                        near.forEach(function (b) {
                            var k = [a, b].map(function (p) { return p.slice(0, 3).map(function (x) { return x.toFixed(3); }).join(','); }).sort().join(' ');
                            if (apart(b) < d * 1.03 && !seen[k]) {
                                seen[k] = true;
                                c.links.push([a.slice(0, 3), b.slice(0, 3)]);
                            }
                        });
                    });
                });
            }

            // What a form drawn is: of its element's own, or of the lattice its words name; what is counted in it, atoms,
            // molecules or the points of its lattice, grey, with what is at each
            function crystalOf(e, words, name) {
                var w = words.toLowerCase(), o = CRYSTAL_OF[e.s + ' ' + name] || CRYSTAL_OF[e.s] || {}, cube = [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
                    corners = CRYSTAL_CORNERS.map(function (p) { return p.concat(0); }), centre = [[0.5, 0.5, 0.5, 1]],
                    faces = CRYSTAL_FACES.map(function (p) { return p.concat(1); }), c, a, psi, v, b;
                if (/graphite/i.test(name)) return crystalGraphite();
                if (/double hexagonal/.test(w)) c = crystalPrism(3.22, [['A', 0], ['B', 0.25], ['A', 0.5], ['C', 0.75], ['A', 1]], 0.17);
                else if (o.hcp || /hexagonal close/.test(w)) c = crystalPrism(o.hcp || 1.633, [['A', 0], ['B', 0.5], ['A', 1]], 0.17);
                else if (o.hex || /hexagonal/.test(w)) c = crystalPrism(o.hex || 1, [['A', 0], ['A', 1]], 0.17);
                else if (o.a15) c = crystalBox(cube, [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1], [0.5, 0.5, 0.5]].map(function (p) { return p.concat(0); })
                    .concat([[0.25, 0, 0.5], [0.75, 0, 0.5], [0.25, 1, 0.5], [0.75, 1, 0.5], [0.5, 0.25, 0], [0.5, 0.75, 0], [0.5, 0.25, 1], [0.5, 0.75, 1],
                        [0, 0.5, 0.25], [0, 0.5, 0.75], [1, 0.5, 0.25], [1, 0.5, 0.75]].map(function (p) { return p.concat(1); })), 0.08);
                else if (o.sn) c = crystalBox([[1, 0, 0], [0, 1, 0], [0, 0, o.sn]], corners.concat(centre, [[0, 0.5, 0.25, 1], [1, 0.5, 0.25, 1], [0.5, 0, 0.75, 1], [0.5, 1, 0.75, 1]]),
                    0.11);
                else if (/diamond/.test(w)) c = crystalBox(cube, corners.concat(faces, [[0.25, 0.25, 0.25, 1], [0.75, 0.75, 0.25, 1], [0.75, 0.25, 0.75, 1], [0.25, 0.75, 0.75, 1]]),
                    0.1, 0.45);
                else if (o.bct || /tetragonal/.test(w)) c = crystalBox([[1, 0, 0], [0, 1, 0], [0, 0, o.bct || 1.5]], corners.concat(centre), 0.14);
                else if (o.rhombo || /rhombohedral/.test(w)) {
                    // its three edges one length, each at the angle to the others, about the axis they turn round, upright
                    a = (o.rhombo || 60) * Math.PI / 180;
                    psi = Math.acos(Math.sqrt((2 * Math.cos(a) + 1) / 3));
                    v = [0, 1, 2].map(function (k) { var t = k * 2 * Math.PI / 3; return [Math.sin(psi) * Math.cos(t), Math.sin(psi) * Math.sin(t), Math.cos(psi)]; });
                    c = crystalBox(v, corners.concat(o.inside ? [[o.inside, o.inside, o.inside, 1]] : []), 0.15);
                } else if (o.box || /orthorhombic|monoclinic/.test(w)) {
                    b = o.box || [1.25, 0.8, 1];
                    a = (o.beta || (/monoclinic/.test(w) ? 110 : 90)) * Math.PI / 180;
                    c = crystalBox([[b[0], 0, 0], [0, b[1], 0], [b[2] * Math.cos(a), 0, b[2] * Math.sin(a)]],
                        corners.concat(o.face ? faces : o.base || /base-centred/.test(w) ? [[0.5, 0.5, 0, 1], [0.5, 0.5, 1, 1]] : []), 0.13);
                } else if (o.bcc || /body-centred cubic/.test(w)) c = crystalBox(cube, corners.concat(centre), 0.15);
                else if (/face-centred cubic/.test(w)) c = crystalBox(cube, corners.concat(faces), 0.13);
                else if (/cubic/.test(w)) c = crystalBox(cube, corners, 0.16);
                if (!c) return null;
                if (!c.bonds || !c.bonds.length) crystalLinks(c, o.a15 ? 'a15' : o.sn ? 'any' : c.tilt ? 'layers' : ''); // diamond's bonds are lines enough
                // of arsenic, antimony and bismuth, the inside atom's 3 bonds are to the corners above it, in its own buckled
                // layer; the 3 nearest after them, below, are of the next layer, farther, held weakly: their lines fainter, marked far
                if (o.inside) crystalFar(c, c.atoms.filter(function (p) { return p[3] === 1; })[0]);
                if (o.each) c.atoms.forEach(function (p) { p[3] = 2; }); // only its lattice: each point grey
                // what is counted, and in how many cells of the prism; of a lattice only, what is at each point
                c.noun = function (n) {
                    return (o.each ? trn(n, 'point', 'points') : o.mol ? trn(n, '{mol} molecule', '{mol} molecules', { mol: o.mol }) : trn(n, 'atom', 'atoms')) +
                        (c.cells ? tr(' in {cells} cells', { cells: c.cells }) : '') + (o.each ? ', ' + o.each : '');
                };
                return c;
            }

            // A line, marked far, from atom a to each of the orange ones nearest it of those it has none to yet
            function crystalFar(c, a) {
                var linked = c.links.map(function (l) { return l[0].join() === a.slice(0, 3).join() ? l[1].join() : l[1].join() === a.slice(0, 3).join() ? l[0].join() : ''; }),
                    rest = c.atoms.filter(function (b) { return b[3] === 0 && linked.indexOf(b.slice(0, 3).join()) < 0; }), d;
                function apart(b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
                if (!rest.length) return;
                d = Math.min.apply(null, rest.map(apart));
                rest.forEach(function (b) { if (apart(b) < d * 1.03) c.links.push([a.slice(0, 3), b.slice(0, 3), true]); });
            }

            // its atoms counted as books count them, each by its share of the cell: 8 × ⅛ + 1 = 2 atoms
            function crystalCount(c) {
                var by = {}, n = 0;
                c.atoms.forEach(function (p) {
                    by[p[4]] = (by[p[4]] || 0) + 1;
                    n += p[4];
                });
                n = Math.round(n);
                return Object.keys(by).sort(function (x, y) { return x - y; }).map(function (s) {
                    return +s === 1 ? String(by[s]) : by[s] + ' × ' + CRYSTAL_PARTS[Math.round(1 / s)];
                }).join(' + ') + ' = ' + n + ' ' + c.noun(n);
            }

            // One drawn, turned a little and seen from a little above: the edges of the cell, those behind it dashed, the lines
            // from its atoms to those nearest, dotted, those on a face behind fainter, its bonds,
            // and its atoms, the nearer over the farther and brighter, each a ball lit from the top left: at the corners orange, in the middle or between blue, the points of a lattice grey
            function crystalSvg(c, label) {
                var turn = 28 * Math.PI / 180, tilt = (c.tilt || 20) * Math.PI / 180, pad = 3, ids = [++app.plotIds, ++app.plotIds, ++app.plotIds],
                    away = [Math.sin(turn) * Math.cos(tilt), Math.cos(turn) * Math.cos(tilt), -Math.sin(tilt)], pts, x0, x1, y0, y1, s, W, H, body, mid, edges = {}, behind = [], d0, d1;
                function view(p) {
                    var u = p[0] * Math.cos(turn) - p[1] * Math.sin(turn), v = p[0] * Math.sin(turn) + p[1] * Math.cos(turn);
                    return { x: u, y: -(p[2] * Math.cos(tilt) + v * Math.sin(tilt)), d: v * Math.cos(tilt) - p[2] * Math.sin(tilt) };
                }
                function line(seg, cls) {
                    var a = view(seg[0]), b = view(seg[1]);
                    return '<path class="' + cls + '" d="M' + fix(pad + s * (a.x - x0)) + ' ' + fix(pad + s * (a.y - y0)) + 'L' + fix(pad + s * (b.x - x0)) + ' ' + fix(pad + s * (b.y - y0)) + '"/>';
                }
                pts = c.atoms.map(view);
                x0 = Math.min.apply(null, pts.map(function (p) { return p.x; })) - c.r; x1 = Math.max.apply(null, pts.map(function (p) { return p.x; })) + c.r;
                y0 = Math.min.apply(null, pts.map(function (p) { return p.y; })) - c.r; y1 = Math.max.apply(null, pts.map(function (p) { return p.y; })) + c.r;
                s = Math.min(124 / (x1 - x0), 124 / (y1 - y0), 50); // the cubes as big as each other, a tall one no taller than the room
                W = Math.round(s * (x1 - x0) + 2 * pad);
                H = Math.round(s * (y1 - y0) + 2 * pad);
                // each edge of the faces once, behind if each face it is of faces away
                if (c.faces) {
                    mid = [0, 1, 2].map(function (i) { return c.faces.reduce(function (t, f) { return t + f.reduce(function (u, p) { return u + p[i]; }, 0) / f.length; }, 0) / c.faces.length; });
                    c.faces.forEach(function (f) {
                        var a = f[1].map(function (x, i) { return x - f[0][i]; }), b = f[2].map(function (x, i) { return x - f[0][i]; }),
                            n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
                            out = f.reduce(function (t, p) { return t + p.reduce(function (u, x, i) { return u + (x - mid[i]) * n[i]; }, 0); }, 0) > 0 ? 1 : -1,
                            back = out * (n[0] * away[0] + n[1] * away[1] + n[2] * away[2]) > 0;
                        if (back) behind.push({ n: n, p: f[0] });
                        f.forEach(function (p, i) {
                            var q = f[(i + 1) % f.length], k = [p, q].map(function (r) { return r.map(function (x) { return x.toFixed(3); }).join(','); }).sort().join(' ');
                            edges[k] = edges[k] || { seg: [p, q], back: true };
                            edges[k].back = edges[k].back && back;
                        });
                    });
                }
                body = '<defs>' + ['#fde3d7 #e0805d', '#e0f2fe #4f9bd0', '#f1f3f5 #8d99a3'].map(function (g, i) {
                    g = g.split(' ');
                    return '<radialGradient id="calc-plot-' + ids[i] + '" cx="0.35" cy="0.32" r="0.75"><stop offset="0" stop-color="' + g[0] + '"/><stop offset="1" stop-color="' + g[1] + '"/></radialGradient>';
                }).join('') + '</defs>';
                body += Object.keys(edges).map(function (k) { return line(edges[k].seg, 'calc-pt-edge' + (edges[k].back ? ' calc-pt-behind' : '')); }).join('') +
                    (c.guides || []).map(function (seg) { return line(seg, 'calc-pt-edge calc-pt-behind'); }).join('') +
                    (c.links || []).map(function (seg) {
                        var back = behind.some(function (f) { // on the plane of a face behind
                            return seg.slice(0, 2).every(function (q) { return Math.abs(q.reduce(function (t, x, i) { return t + (x - f.p[i]) * f.n[i]; }, 0)) < 1e-9; });
                        });
                        return line(seg, 'calc-pt-link' + (seg[2] ? ' calc-pt-far' : '') + (back ? ' calc-pt-behind' : ''));
                    }).join('') +
                    (c.bonds || []).map(function (seg) { return line(seg, 'calc-pt-bond'); }).join('');
                d0 = Math.min.apply(null, pts.map(function (p) { return p.d; }));
                d1 = Math.max.apply(null, pts.map(function (p) { return p.d; }));
                body += pts.map(function (p, i) { return { p: p, k: c.atoms[i][3] }; }).sort(function (a, b) { return b.p.d - a.p.d; }).map(function (a) {
                    var far = d1 > d0 ? (a.p.d - d0) / (d1 - d0) : 0;
                    return '<circle class="calc-pt-ball" cx="' + fix(pad + s * (a.p.x - x0)) + '" cy="' + fix(pad + s * (a.p.y - y0)) + '" r="' + fix(s * c.r) + '" fill="url(#calc-plot-' + ids[a.k] + ')" opacity="' + (1 - 0.35 * far).toFixed(2) + '"/>';
                }).join('');
                return '<svg class="calc-pt-cell" style="--w: ' + W + '; --h: ' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + tr(label) + '">' + body + '</svg>';
            }

            // Under its crystal structure, its unit cell drawn and its atoms counted; of one with two forms, each, named
            function chemCrystal(e) {
                var parts = (e.crystal || '').split(/;\s*/), cells = parts.map(function (part) {
                    // its name with a capital, but α-Fe as it is: a Greek letter's capital is another letter
                    var m = part.match(/^([^:]+):\s*(.+)$/), name = m ? (/^[a-z]/.test(m[1]) ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : m[1]) : '', words = m ? m[2] : part,
                        c = crystalOf(e, words, name);
                    return c && '<span class="calc-pt-form">' + crystalSvg(c, tr(e.name) + (name ? ', ' + name : '') + ': ' + words.toLowerCase() + (c.label ? ', ' + c.label : c.cells ? tr(', a hexagonal prism of {cells} unit cells', { cells: c.cells }) : ' unit cell')) +
                        (parts.length > 1 ? '<b>' + name + '</b>' : '') + '<span class="calc-pt-count">' + (c.note || crystalCount(c)) + '</span></span>';
                }).filter(Boolean);
                return cells.length ? '<span class="calc-pt-cells">' + cells.join('') + '</span>' : '';
            }

            // the mass as tables write it: of one with no stable isotope, in brackets
            function chemMass(e) {
                return e.unstable ? '[' + e.mass + ']' : local(String(chemIn('m', e.mass)));
            }

            // and on a big tile, with its tip: the mass in full, whatever its places
            function chemMassHtml(e) {
                return '<span class="calc-pt-mass" data-pt="mass" data-full="' + (e.unstable ? '[' + e.mass + ']' : tr('{mass} g/mol', { mass: local(String(e.mass)) })) + '">' + chemMass(e) + '</span>';
            }

            // The tip of a part of an element, its data-pt: what it is, its value in full above, as its tile may cut it
            // short; its kind, what the elements of the family are like
            function chemPartTip(el) {
                var k = el.dataset.pt, info = CalcTips[k === 'kind' ? 'chem kind ' + el.dataset.kind : 'chem fact ' + k],
                    v = el.hasAttribute('data-full') ? el.dataset.full : el.textContent.trim();
                if (!info) return null;
                return { t: info.t, d: (v && k !== 'kind' ? '<div class="calc-tip-value">' + v + '</div>' : '') + tr(info.d) }; // translated before its value is put above it
            }

            // The tip of a tile of the details, as a result's: what it is, and its value in full with its unit, to copy, a
            // number to put in as well; one in words, whole on its tile already, only what it is
            function chemFactPeek(el) {
                var info = CalcTips['chem fact ' + el.dataset.fact], label = el.querySelector('.calc-sv-label'), value = el.querySelector('.calc-sv-value'),
                    // the crystal structure's drawing left out: its words alone
                    drawn = value.querySelector('.calc-pt-cells'), unit = label.querySelector('i:not(.calc-pt-guess)'), name = label.cloneNode(true),
                    shown = [].filter.call(value.childNodes, function (n) { return n !== drawn; }).map(function (n) { return n.textContent; }).join('').trim(), u;
                if (!info) return null;
                // its name as its label shows it, translated already, without its unit: the whole of it, not its first text, which in
                // Arabic is only the words before its maths (lang.js)
                [].forEach.call(name.querySelectorAll('i'), function (i) { i.remove(); });
                name = name.textContent.trim();
                if (el.dataset.lines) return { t: name, shown: true, d: '<div class="calc-tip-value">' + el.dataset.lines + '</div>' + tr(info.d) }; // the spectrum: its lines
                if (el.classList.contains('calc-pt-text') || /^–?$/.test(shown)) return { t: name, shown: true, d: info.d };
                // not a name in place of a unit; the mass in full, whatever its places
                u = unit && el.dataset.fact !== 'shells' && [tr('mass number'), tr('Pauling')].indexOf(unit.textContent) < 0 ? ' ' + (unit.dataset.unit === 'm' ? tr('g/mol') : unit.textContent) : '';
                return { t: name, shown: true, d: info.d, html: (drawn ? shown : value.innerHTML) + u, text: el.hasAttribute('data-v') ? local(statsValue(+el.dataset.v).text) : shown, put: el.hasAttribute('data-v'), v: el.hasAttribute('data-v') ? +el.dataset.v : undefined };
            }

            function chemGroupOf(e) {
                return chemBy === 'cat' ? e.cat : chemBy === 'state' ? chemStateOf(e) || 'unknown' : chemBy === 'block' ? e.block : '';
            }

            function renderChemTable() {
                // popped in, by kind alone; not saved, as the table's own window, open as well, would have Kind from it and lose its colour
                if (chemBy !== 'cat' && !chemAlone && !root.classList.contains('calc-chem-big')) {
                    chemByBig = chemBy;
                    chemBy = 'cat';
                }
                chemGrid.innerHTML = '<div class="calc-pt-gap" aria-live="polite"></div>' +
                    '<div class="calc-pt-el calc-pt-series calc-pt-' + (chemBy === 'cat' ? 'lanthanide' : chemBy === 'block' ? 'fb' : 'solid') + '" style="grid-area: 6 / 3" data-from="57" role="button" aria-label="' + tr('Lanthanides, 57 to 71') + '"><b><span>La–</span><span>Lu</span></b><span class="calc-pt-mass">57–71</span></div>' +
                    '<div class="calc-pt-el calc-pt-series calc-pt-' + (chemBy === 'cat' ? 'actinide' : chemBy === 'block' ? 'fb' : 'solid') + '" style="grid-area: 7 / 3" data-from="89" role="button" aria-label="' + tr('Actinides, 89 to 103') + '"><b><span>Ac–</span><span>Lr</span></b><span class="calc-pt-mass">89–103</span></div>' +
                    CalcChem.elements.map(function (e) {
                        return '<div class="calc-pt-el ' + chemClass(e) + '" data-z="' + e.z + '" style="' + chemHeat(e) + 'grid-area: ' + e.row + ' / ' + e.col + '"' +
                            ' role="button" aria-label="' + tr(e.name) + ', ' + e.z + '"><span class="calc-pt-z">' + e.z + '</span><b>' + e.s + '</b><span class="calc-pt-name">' + tr(e.name) +
                            '</span><span class="calc-pt-mass">' + chemMass(e) + '</span></div>';
                    }).join('');
                [].forEach.call(chemModes.children, function (m) {
                    m.classList.toggle('calc-on', m.dataset.by === chemBy);
                    m.setAttribute('aria-checked', m.dataset.by === chemBy);
                });
                chemModeSeen();
                chemLegend.innerHTML = CHEM_HEAT[chemBy] ? chemSliderHtml() + '<span class="calc-pt-key calc-pt-unknown"><i></i>' + tr('Not known') + '</span>' :
                    (chemBy === 'cat' ? CalcChem.categories : chemBy === 'state' ? CHEM_STATES : CHEM_BLOCKS).map(function (c) {
                        return '<span class="calc-pt-key calc-pt-' + (chemBy === 'block' ? c[0] + 'b' : c[0]) + (chemHot === c[0] ? ' calc-on' : '') + '" data-g="' + c[0] + '" role="button"><i></i>' + (chemBy === 'state' ? chemStateName(c[0]) : tr(c[1])) + '</span>';
                    }).join('') + (chemBy === 'state' ? '<span class="calc-pt-break"></span>' + chemSliderHtml() : '');
                if (chemBy === 'state' || CHEM_HEAT[chemBy]) chemSliderDraw(chemSliderPlaces());
                chemDim();
                chemShow(chemAt, true);
                chemTableFit(); // its key on more lines, or fewer
            }

            // an element of the search, of the legend clicked, or both: the others dimmed
            function chemMatches(e, q) {
                q = q.toLowerCase();
                return !q || e.s.toLowerCase() === q || String(e.z) === q || e.name.toLowerCase().indexOf(q) > -1 || tr(e.name).toLowerCase().indexOf(q) > -1 || (q.length < 3 && e.s.toLowerCase().indexOf(q) === 0);
            }

            // An element faint: not of what is searched, not of the colour lit, or cut out by the slider
            function chemDimmed(e, q) {
                return !chemMatches(e, q) || (!!chemHot && chemGroupOf(e) !== chemHot) || chemCutOut(e);
            }

            // the big tile above the table as faint as its element in the table
            function chemDimBig() {
                var big = chemGrid.querySelector('.calc-pt-gap .calc-pt-big');
                if (big) big.classList.toggle('calc-pt-dim', chemDimmed(CalcChem.elements[big.dataset.show - 1], chemSearch.value.trim()));
            }

            function chemDim() {
                var q = chemSearch.value.trim();
                [].forEach.call(chemGrid.querySelectorAll('.calc-pt-el[data-z]'), function (t) {
                    t.classList.toggle('calc-pt-dim', chemDimmed(CalcChem.elements[t.dataset.z - 1], q));
                });
                chemDimBig();
                [].forEach.call(chemGrid.querySelectorAll('.calc-pt-series'), function (t, i) { // bright while one of its row is
                    // and always dimmed in the states and the colours of a number, as their elements have no one of them
                    t.classList.toggle('calc-pt-dim', !!CHEM_HEAT[chemBy] || chemBy === 'state' || (!!(q || chemHot) && !chemGrid.querySelector('.calc-pt-el[data-z]:not(.calc-pt-dim)[style*="grid-area: ' + (9 + i) + ' /"]')));
                });
            }

            // The electrons alone in their orbitals, by Hund's rule: of each subshell of the configuration not full,
            // as many as it has up to one for each orbital, then fewer as they pair; the core in [ ] is full
            function chemUnpaired(config) {
                var n = 0;
                config.replace(/\[[^\]]*\]/, '').replace(/\d([spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, function (m, l, sup) {
                    var orbitals = 2 * 'spdf'.indexOf(l) + 1,
                        k = +sup.replace(/./g, function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c); });
                    n += k <= orbitals ? k : 2 * orbitals - k;
                    return m;
                });
                return n;
            }

            // The element in the space above the transition metals: the one pointed at, or the one chosen. With
            // all, the tiles of what is known of it under the table too, each number to put in
            function chemShow(z, all) {
                var e = CalcChem.elements[z - 1], gap = chemGrid.querySelector('.calc-pt-gap'), cat = tr(CalcChem.categories.filter(function (c) { return c[0] === e.cat; })[0][1]), tiles, cell, crystal;
                // each part with data-pt, the tip of what it is (chemPartTip), its value in full under it
                gap.innerHTML = '<div class="calc-pt-big calc-pt-el ' + chemClass(e) + '" data-show="' + e.z + '" style="' + chemHeat(e) + '" role="button" aria-label="' + tr('All of {name}', { name: tr(e.name) }) + '"><span class="calc-pt-z" data-pt="z">' + e.z + '</span>' +
                    // popped out, the tile has room for more, as on a printed table: the electronegativity and the oxidation
                    // states at the top right, the name under the symbol, the configuration at the foot
                    '<span class="calc-pt-more calc-pt-en" data-pt="en">' + (e.en === null ? '' : (e.predicted.en ? '≈' : '') + local(String(e.en))) + '</span>' +
                    '<span class="calc-pt-more calc-pt-ox" data-pt="ox" data-full="' + (e.ox || '').split(' ').join(', ') + '">' + (e.ox || '').split(' ').join('<br>') + '</span>' +
                    '<b data-pt="symbol">' + e.s + '</b><span class="calc-pt-more calc-pt-full" data-pt="name">' + tr(e.name) + '</span>' + chemMassHtml(e) +
                    '<span class="calc-pt-more calc-pt-conf" data-pt="config">' + e.config + '</span></div>' +
                    '<div class="calc-pt-about"><span class="calc-pt-title" data-pt="name">' + tr(e.name) + '</span><span data-pt="kind" data-kind="' + e.cat + '">' + cat + '</span>' + chemLine(e) +
                    // and beside it, what the tile has no room for, a label over each value
                    '<dl class="calc-pt-facts">' + [
                        // each label and unit in the language in use, as it is shown
                        [tr('Mass'), e.unstable ? e.mass : chemIn('m', e.mass), e.unstable ? tr('mass number') : tr('g/mol'), 'mass'], [tr('Group'), e.group, '', 'group'], [tr('Period'), e.period, '', 'period'],
                        [tr('Block'), e.block, '', 'block'], [tr('Melts'), chemIn('t', e.mp), chemUnitName('t'), 'mp'], [tr('Boils'), chemIn('t', e.bp), chemUnitName('t'), 'bp'],
                        [tr('Density'), chemIn('d', e.density), chemUnitName('d'), 'density'], [tr('Ionization'), chemIn('e', e.ie), chemUnitName('e'), 'ie'],
                        [tr('State'), e.state ? chemStateName(e.state) : null, '', 'state'], [tr('Radius'), e.radius, 'pm', 'radius'],
                        [tr('Affinity'), chemIn('e', e.affinity), chemUnitName('e'), 'affinity'], [tr('Ions'), e.ions, '', 'ions']
                    ].map(function (f) {
                        var v = f[1] === null || f[1] === undefined ? '–' : (e.predicted[f[3]] ? '≈' : '') + (typeof f[1] === 'number' ? local(String(f[1])) : f[1]);
                        return '<div data-pt="' + f[3] + '" data-full="' + (v === '–' ? '' : v + (f[2] && !(f[3] === 'mass' && e.unstable) ? ' ' + f[2] : '')) + '"><dt>' + f[0] + (f[2] ? ' <i>' + f[2] + '</i>' : '') + '</dt><dd>' + v + '</dd></div>';
                    }).join('') + '</dl></div>';
                chemDimBig();
                if (!all) return;
                chemAt = z;
                [].forEach.call(chemGrid.querySelectorAll('.calc-pt-el.calc-on'), function (t) { t.classList.remove('calc-on'); });
                if (chemGrid.querySelector('.calc-pt-el[data-z="' + z + '"]')) chemGrid.querySelector('.calc-pt-el[data-z="' + z + '"]').classList.add('calc-on');
                // its shells above its configuration; its state at 20 °C the last of the small tiles under them, and its crystal,
                // drawn or not, right under that, the same place for every element. Each unit in the language in use already, as it is shown
                cell = chemCrystal(e);
                crystal = ['Crystal structure', e.crystal && tr(e.crystal), '', true, '', false, false, cell];
                tiles = [
                    ['Atomic number', e.z], e.unstable ? ['Atomic mass', e.mass, tr('mass number')] : ['Atomic mass', chemIn('m', e.mass), chemUnitName('m'), false, 'm'], ['Electronegativity', e.en, tr('Pauling')],
                    ['Ionization energy', chemIn('e', e.ie), chemUnitName('e'), false, 'e'], ['Melting point', chemIn('t', e.mp), chemUnitName('t'), false, 't'],
                    ['Boiling point', chemIn('t', e.bp), chemUnitName('t'), false, 't'],
                    ['Density', chemIn('d', e.density), (e.state === 'gas' ? tr('{unit} at 0 °C', { unit: chemUnitName('d') }) : chemUnitName('d')), false, 'd'], ['Group', e.group], ['Period', e.period],
                    ['Protons', e.z], ['Electrons', e.z], ['Neutrons', Math.round(e.mass) - e.z],
                    ['Shells', e.shells.join(', '), 'KLMNOPQ'.slice(0, e.shells.length).split('').join(' '), true], ['Electron configuration', e.config, '', true], ['Block', e.block],
                    ['Outer-shell electrons', e.shells[e.shells.length - 1]], ['Unpaired electrons', chemUnpaired(e.config)],
                    // the small tiles in threes, so each row is full before a wide one
                    ['Atomic radius', e.radius, 'pm'], ['Covalent radius', e.covalent, 'pm'], ['Electron affinity', chemIn('e', e.affinity), chemUnitName('e'), false, 'e'],
                    ['Specific heat', e.heat, 'J/(g·K)'], ['Mohs hardness', e.mohs], ['State at 20 °C', e.state ? chemStateName(e.state) : tr('Not known')], crystal,
                    ['Common ions', e.ions || '–', '', true], ['Oxidation states', e.ox || '–', '', true],
                    ['Heat of fusion', e.fusion, 'kJ/mol'], ['Heat of vaporization', e.vaporization, 'kJ/mol'], ['Thermal conductivity', e.conductivity, 'W/(m·K)'],
                    ['Electrical resistivity', e.resistivity, tr('Ω·m at 20 °C'), false, '', false, true], ['Abundance in the crust', e.abundance, typeof e.abundance === 'number' ? 'mg/kg' : '', false, '', false, true], ['CAS number', e.cas],
                    ['Magnetism', e.magnetic && tr(e.magnetic), '', true], ['Appearance', e.appearance && tr(e.appearance), '', true],
                    // in words, each on its own line: when and by whom it was found (where, as the Middle East, where that is a place), its isotopes, its name, its uses
                    ['Discovered', (e.year === 0 ? tr('In ancient times') : e.year) + (e.foundBy === 'Middle East' ? tr(', in the Middle East') : e.foundBy === 'Asia Minor' ? tr(', in Asia Minor') : e.foundBy ? tr(', by {foundBy}', { foundBy: tr(e.foundBy) }) : '') + (e.isolatedBy ? tr('; isolated by {isolatedBy}', { isolatedBy: tr(e.isolatedBy) }) : ''), '', true, '', true],
                    ['Isotopes', chemIsotopes(e.isotopes) || '–', '', true, '', true],
                    [/^The name/.test(e.story || '') ? 'Name' : 'History', e.story ? tr(e.story) : '–', '', true, '', true], ['Uses', e.uses ? tr(e.uses) : '–', '', true, '', true]
                ].filter(Boolean);
                chemInfo.classList.toggle('calc-pt-new', String(z) !== chemInfo.dataset.z); // its details come in with a move, once for each element
                chemInfo.dataset.z = z;
                chemInfo.innerHTML = '<span class="calc-pt-hide" role="button" aria-label="' + tr('Close the card') + '"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg></span><div class="calc-pt-head"><div class="calc-pt-big calc-pt-el ' + chemClass(e) + '" style="' + chemHeat(e) + '"><span class="calc-pt-z" data-pt="z">' + e.z + '</span><b data-pt="symbol">' + e.s +
                    '</b>' + chemMassHtml(e) + '</div><div class="calc-pt-about"><span class="calc-pt-title" data-pt="name">' + tr(e.name) + '</span><span data-pt="kind" data-kind="' + e.cat + '">' + cat +
                    '</span><span data-pt="shells" data-full="' + e.shells.join(', ') + '">' + tr('Shells {list}', { list: '<span>' + e.shells.join(', ') + '</span>' }) + '</span></div></div><div class="calc-pt-body">' + chemAtom(e) + '<div class="calc-sv-grid calc-pt-tiles">' + chemSpectrum(e) + tiles.map(function (t, i) {
                    var num = typeof t[1] === 'number' && !(t[0] === 'Found'), known = t[1] !== null && t[1] !== undefined, guess = known && e.predicted[CHEM_FACTS[t[0]]];
                    return '<div class="calc-sv-tile' + (num && known ? '' : ' calc-none') + (t[3] ? ' calc-sv-wide' : '') + (t[5] ? ' calc-pt-text' : '') + (known && !num && !t[3] && String(t[1]).length > 9 ? ' calc-pt-wrap' : '') +
                        '" style="--i: ' + i + '" data-fact="' + CHEM_FACTS[t[0]] + '"' + (num && known ? ' data-v="' + t[1] + '"' : '') + (t[0] === 'State at 20 °C' ? ' data-state="' + (e.state || 'unknown') + '"' : '') + '><span class="calc-sv-label">' + tr(t[0]) +
                        (t[2] ? ' <i' + (t[4] ? ' class="calc-pt-unit" data-unit="' + t[4] + '" role="button"' : '') + '>' + t[2] + '</i>' : '') + (guess ? ' <i class="calc-pt-guess">' + tr('predicted') + '</i>' : '') + '</span><span class="calc-sv-value">' + (!known ? '–' : num ? (t[6] ? chemSci(t[1]) : statsValue(t[1]).html) : t[1]) +
                        (t[7] || '') + '</span></div>';
                }).join('') + '</div></div>';
                rtlDraw(chemInfo);
                chemRows();
            }

            // No room left empty at the end of a row: in each run of small tiles between wide ones that does not fill its last row
            // (three to a row in the popup, two popped out), its last tile made wider, over the rest of that row. The tiles kept
            // in the same order for every element, each in the same place whatever its value. Done again as the columns change
            function chemRows() {
                var grid = chemInfo.querySelector('.calc-pt-tiles'), cols, tiles, run = [];
                if (!grid || !grid.offsetWidth) return;
                cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
                if (+grid.dataset.cols === cols) return; // as they are: moved again, the tiles would rise in again
                grid.dataset.cols = cols;
                tiles = [].slice.call(grid.children).sort(function (a, b) { return a.style.getPropertyValue('--i') - b.style.getPropertyValue('--i'); });
                tiles.forEach(function (t) { // as they were first
                    t.style.gridColumn = '';
                    grid.appendChild(t);
                });
                function settle() {
                    var left = run.length % cols;
                    if (left) run[run.length - 1].style.gridColumn = 'span ' + (cols - left + 1);
                    run = [];
                }
                tiles.forEach(function (t) {
                    if (t.classList.contains('calc-sv-wide')) settle(); else run.push(t);
                });
                settle();
            }

            // popped out or in, or the window narrower: its columns change with the card's width
            if (window.ResizeObserver) new ResizeObserver(chemRows).observe(chemInfo);

            // Under the name above the table, what is most useful of it as the table is coloured: the number it is coloured by, to
            // read as the pointer goes over the table; coloured by kind, block or state, its state at 20 °C and where that ends,
            // where it melts, or boils
            function chemLine(e) {
                var by = chemBy, h = CHEM_HEAT[by], v, text, state, NAMES = { en: 'Electronegativity', ie: 'Ionization energy', mp: 'Melts at', bp: 'Boils at',
                    density: 'Density', radius: 'Atomic radius', affinity: 'Electron affinity', mass: 'Mass', year: 'Discovered' };
                if (h) {
                    v = by === 'year' ? (e.year === 0 ? tr('in ancient times') : e.year) : by === 'mass' ? (e.unstable ? tr('{mass} (mass number)', { mass: e.mass }) : tr('{v} g/mol', { v: local(String(chemIn('m', e.mass))) })) :
                        e[by] === null ? tr('not known') : (e.predicted[by] ? '≈' : '') + local(String(h.unit ? chemIn(h.unit, e[by]) : e[by])).replace('-', '−') + ' ' + (h.unit ? chemUnitName(h.unit) : h.label);
                    text = tr(NAMES[by]) + ' ' + v;
                } else {
                    state = chemBy === 'state' ? chemStateOf(e) : e.state; // coloured by state, at the temperature of its slider
                    by = state === 'solid' && e.mp !== null ? 'mp' : 'bp';
                    text = !state ? tr('State not known') : chemStateName(state) +
                        (chemBy === 'state' && chemTemp !== 20 ? ' ' + tr('at {t}', { t: chemTempText() }) : '') + (e[by] === null ? '' : ' · ' + (by === 'mp' ? tr('melts at {t}', { t: chemTempOf(e, by) }) : tr('boils at {t}', { t: chemTempOf(e, by) })));
                    by = 'state';
                }
                return '<span class="calc-pt-line" data-pt="' + by + '">' + text + '</span>';
            }

            // where it melts or boils, in the unit in use, ≈ where only predicted; its own run, 1538 °C as it is in a language
            // written right to left
            function chemTempOf(e, by) {
                return '<span>' + (e.predicted[by] ? '≈' : '') + local(String(chemIn('t', e[by]))).replace('-', '−') + ' ' + chemUnitName('t') + '</span>';
            }

            // an element's isotopes in words, as chem.js has them: '2 stable: ¹H, ²H'; 'None stable; longest-lived ⁹⁷Tc,
            // half-life 4.21×10⁶ years', or no half-life known; 'None stable; found in nature as ²⁰⁹Bi'
            function chemIsotopes(text) {
                var m, also;
                if (!text) return text;
                // '5 stable: ⁴⁰Ca, …; in nature also radioactive ⁴⁸Ca': the stable ones, then the radioactive found in nature
                if ((also = /^(.*); in nature also radioactive (.*)$/.exec(text))) {
                    return trn(also[2].split(', ').length, '{stable}; in nature also radioactive {list}', '{stable}; in nature also radioactive {list}',
                        { stable: chemIsotopes(also[1]), list: also[2] });
                }
                if ((m = /^(\d+) stable: (.*)$/.exec(text))) return trn(+m[1], '{n} stable: {list}', '{n} stable: {list}', { list: m[2] });
                if ((m = /^None stable; longest-lived (\S+), half-life (\S+) (\S+)$/.exec(text))) {
                    return tr('None stable; longest-lived {isotope}, half-life {time}', { isotope: m[1], time: { years: tr('{t} years', { t: m[2] }), days: tr('{t} days', { t: m[2] }),
                        hours: tr('{t} hours', { t: m[2] }), minutes: tr('{t} minutes', { t: m[2] }), s: tr('{t} s', { t: m[2] }), ms: tr('{t} ms', { t: m[2] }),
                        'μs': tr('{t} μs', { t: m[2] }) }[m[3]] || m[2] + ' ' + m[3] });
                }
                if ((m = /^None stable; longest-lived (\S+)$/.exec(text))) return tr('None stable; longest-lived {isotope}', { isotope: m[1] });
                if ((m = /^None stable; found in nature as (.*)$/.exec(text))) return tr('None stable; found in nature as {isotope}', { isotope: m[1] });
                return text;
            }

            // a state of matter by its name: Solid not as a solid of geometry, nor a line
            function chemStateName(s) {
                return { solid: trc('state', 'Solid'), liquid: trc('state', 'Liquid'), gas: trc('state', 'Gas'), unknown: trc('state', 'Unknown') }[s];
            }

            // a number very big or very small as a × 10ⁿ, as the converter writes it: a resistivity, an abundance
            function chemSci(v) {
                var parts = (+v).toExponential().split('e'), a = Math.abs(v);
                return a && (a >= 1e6 || a < 1e-3) ? local(String(+(+parts[0]).toPrecision(4))) + ' × 10<sup>' + +parts[1] + '</sup>' : local(String(+(+v).toPrecision(6)));
            }

            function chemTabs() {
                [].forEach.call(chemPanel.querySelectorAll('.calc-solve-tab'), function (t) {
                    t.classList.toggle('calc-on', t.dataset.tab === chemTab);
                });
                chemTable.hidden = chemTab !== 'table';
                chemList.hidden = chemTab === 'table';
                chemPanel.classList.toggle('calc-chem-cards', chemTab !== 'table');
            }

            // Big, the table and the tools grow as every panel popped out does (popScale), in the CSS
            function chemFit() {
                chemTableFit();
            }

            // Popped out, the table no wider than lets all of it be seen, on a page wide and not as high: its tiles
            // square, narrower by twice what it is cut by; and again, as the search and the key over it may then take
            // another line. Not narrower than its tiles can be read
            function chemTableFit() {
                chemTable.style.removeProperty('--calc-pt-w');
                if (!root.classList.contains('calc-chem-big') || chemTable.hidden) return;
                for (var i = 0; i < 4; i++) {
                    var t = chemTable.getBoundingClientRect(), k = t.height / chemTable.offsetHeight || 1, // zoomed (popScale)
                        g = chemGrid.getBoundingClientRect(), w = g.width / k,
                        cut = (g.bottom - t.top) / k + chemTable.scrollTop - chemTable.clientHeight + 6;
                    if (cut < 1 || w <= 560) break;
                    chemTable.style.setProperty('--calc-pt-w', Math.max(560, Math.floor(w - 2 * cut)) + 'px');
                }
            }

            window.addEventListener('resize', function () {
                chemFit();
                if (chemTab !== 'table' && chemList.classList.contains('calc-side') !== bigSide(chemPanel)) chemCards.render(); // in place again, or beside
            }, false);

            // shut: another tab clicked, and the card open on the one left closes
            function renderChem(shut) {
                chemTabs();
                chemFit();
                if (chemTab === 'table') renderChemTable();
                else if (chemCards.tab() !== chemTab) chemCards.setTab(chemTab, shut === true);
                else chemCards.render();
            }

            // Reset all: the table as at first, coloured by kind with iron chosen and nothing searched, and
            // nothing typed in any card
            function clearChem() {
                chemCards.clear();
                chemSearch.value = '';
                chemTab = 'table';
                chemBy = 'cat';
                chemByBig = null;
                chemAt = 26;
                chemSpec = 'abs';
                chemTemp = 20;
                chemCut = {};
                chemHot = '';
                if (chemAlone || chemPanel.classList.contains('calc-open')) renderChem();
                saveChem();
            }

            function saveChem() {
                store('chemView', { tab: chemTab, by: chemByBig || chemBy, at: chemAt, units: chemUnit, temp: chemTemp, cut: chemCut, shut: chemShut, spec: chemSpec });
            }

            // what the search of the calculator found here, shown (main.js): a card open, an element chosen with its card open
            // and not dimmed by a search of the table, or a tab. by: what the colours show, as the address of the table has
            // it (routes.js); popped in, by kind, and that one again as it pops out
            function chemGoTo(hit) {
                if (hit.by && CHEM_BY.hasOwnProperty(hit.by)) {
                    chemBy = hit.by;
                    chemByBig = null;
                    chemHot = '';
                }
                if (hit.kind === 'card') chemCards.go(hit.id);
                if (hit.kind === 'element') {
                    chemAt = hit.id;
                    chemSearch.value = '';
                    chemCard(true);
                }
                chemTab = hit.kind === 'card' ? chemCards.tab() : hit.kind === 'element' ? 'table' : hit.tab;
                renderChem();
                saveChem();
                if (chemTab !== 'table') chemCards.focus();
            }

            // the card of the element chosen, at the right popped out, closed or open again
            function chemCard(open) {
                chemShut = !open;
                chemTable.classList.toggle('calc-pt-shut', chemShut);
                chemTableFit(); // the table the whole width, or beside the card
            }

            function loadChem(saved) {
                if (!saved || typeof saved !== 'object') return;
                if (saved.tab === 'table' || CHEM_TOOLS.hasOwnProperty(saved.tab)) chemTab = saved.tab;
                if (CHEM_BY.hasOwnProperty(saved.by)) {
                    chemBy = saved.by;
                    chemByBig = null;
                }
                if (saved.at >= 1 && saved.at <= 118 && saved.at === Math.floor(saved.at)) chemAt = saved.at;
                chemCard(saved.shut !== true);
                if (saved.spec === 'abs' || saved.spec === 'em') chemSpec = saved.spec;
                if (typeof saved.temp === 'number' && saved.temp >= -273 && saved.temp <= 5727) chemTemp = Math.round(saved.temp);
                if (saved.cut && typeof saved.cut === 'object') {
                    Object.keys(CHEM_HEAT).forEach(function (k) {
                        var c = saved.cut[k], ok = function (v) { return v === null || (typeof v === 'number' && v >= CHEM_HEAT[k].lo && v <= CHEM_HEAT[k].hi); };
                        if (Array.isArray(c) && c.length === 2 && ok(c[0]) && ok(c[1]) && (c[0] === null || c[1] === null || c[0] <= c[1])) chemCut[k] = c;
                    });
                }
                if (saved.units && typeof saved.units === 'object') {
                    Object.keys(CHEM_UNITS).forEach(function (k) {
                        if (CHEM_UNITS[k].hasOwnProperty(saved.units[k])) chemUnit[k] = saved.units[k];
                    });
                }
            }

            function showChem(open, keep) {
                if (!open && chemAlone) return; // its own window stays, even as a value is put in
                if (!open) chemBig(false);
                if (open) {
                    closePanels(chemPanel);
                    placePanel(chemPanel);
                    if (!chemPanel.classList.contains('calc-open') && !chemAlone && !keep) chemAt = 26; // the table opens on iron; its own window, or popped in from it, on the element chosen there
                }
                chemPanel.classList.toggle('calc-open', open);
                chemButton.classList.toggle('calc-on', open);
                if (open) {
                    renderChem();
                    if (chemTab !== 'table') chemCards.focus();
                } else if (chemPanel.contains(document.activeElement)) {
                    document.activeElement.blur(); // the keys are the calculator's again
                }
            }

            // closed by its button or Esc; its own window is closed then
            function closeChem() {
                if (chemAlone) ask('chem-close'); else showChem(false);
            }

            // a value put in: the calculator again, or brought up by the extension from the table's own window
            function chemDone() {
                if (chemAlone) ask('chem-put'); else showChem(false);
            }

            // The table as big as the page, as the graph is: on the website all of its window; the extension, whose
            // popup cannot grow, opens it in a window of its own. True if it changed
            function chemBig(on) {
                if (on === root.classList.contains('calc-chem-big') || (chemAlone && !on)) return false;
                hideTip();
                showMenu(false);
                if (on) {
                    saveState();
                    saveChem();
                    if (!ask('chem-big', { big: true })) return showChem(false), false; // in its own window, and not here as well
                    if (!chemPanel.classList.contains('calc-open')) showChem(true);
                }
                root.classList.toggle('calc-chem-big', on);
                root.classList.toggle('calc-panel-big', on); // as every panel popped out
                chemPanel.classList.toggle('calc-big-on', on);
                if (on && chemByBig) { // popped out again: its colour of before
                    chemBy = chemByBig;
                    chemByBig = null;
                    renderChemTable();
                }
                if (!on) ask('chem-big', { big: false });
                if (!on && chemBy !== 'cat') renderChemTable(); // the colours have no buttons popped in: Kind again
                chemFit();
                if (chemTab !== 'table') chemCards.render(); // big, a tool open beside the list
                return true;
            }

            chemButton.addEventListener('click', function () {
                showChem(!chemPanel.classList.contains('calc-open'));
            }, false);

            chemPanel.querySelector('.calc-past-close').addEventListener('click', closeChem, false);

            chemSize.addEventListener('click', function () {
                if (chemAlone) return popIn('chem');
                chemBig(!root.classList.contains('calc-chem-big'));
            }, false);

            chemPanel.querySelector('.calc-solve-tabs').addEventListener('click', function (e) {
                var t = e.target.closest('.calc-solve-tab');
                if (!t) return;
                chemTab = t.dataset.tab;
                renderChem(true);
                saveChem();
            }, false);

            // the page asks for it: big and alone in the table's own window
            root.addEventListener('calc-chem', function (e) {
                var d = e.detail || {};
                if (d.alone) {
                    chemAlone = true;
                    root.classList.add('calc-chem-alone');
                    // on the tab and the element chosen when it was popped out, which chemBig saved for it, as every panel's window
                }
                chemBig(!!d.big);
            }, false);

            // the colours on one line that scrolls, on a phone: the one chosen scrolled into sight, clear of the fades
            fadeEdges(chemModes);

            function chemModeSeen() {
                var on = chemModes.querySelector('.calc-on');
                if (!on || chemModes.scrollWidth - chemModes.clientWidth < 2) return;
                chemModes.scrollLeft = Math.min(Math.max(chemModes.scrollLeft, on.offsetLeft + on.offsetWidth + 28 - chemModes.clientWidth), on.offsetLeft - 28);
            }

            chemModes.addEventListener('click', function (e) {
                var m = e.target.closest('[data-by]');
                if (!m || m.dataset.by === chemBy) return;
                chemBy = m.dataset.by;
                chemByBig = null;
                chemHot = '';
                renderChemTable();
                saveChem();
            }, false);

            // the temperature slid: the states at it, each tile coloured again; its number clicked, 20 °C again
            function chemTempTo(t) {
                var big = chemGrid.querySelector('.calc-pt-gap .calc-pt-big'), shown = big ? +big.dataset.show : chemAt;
                chemTemp = t;
                chemLegend.querySelector('.calc-pt-temp-v').textContent = chemTempText();
                [].forEach.call(chemGrid.querySelectorAll('.calc-pt-el[data-z]'), function (el) {
                    var e = CalcChem.elements[el.dataset.z - 1];
                    el.classList.remove('calc-pt-solid', 'calc-pt-liquid', 'calc-pt-gas', 'calc-pt-unknown');
                    el.classList.add(chemClass(e));
                });
                chemDim();
                // the big tiles of the element shown above and of the one chosen below, their colour only
                [[chemGrid.querySelector('.calc-pt-gap .calc-pt-big'), shown], [chemInfo.querySelector('.calc-pt-big'), chemAt]].forEach(function (b) {
                    if (b[0]) b[0].className = 'calc-pt-big calc-pt-el ' + chemClass(CalcChem.elements[b[1] - 1]);
                });
                if (chemGrid.querySelector('.calc-pt-gap .calc-pt-line')) chemGrid.querySelector('.calc-pt-gap .calc-pt-line').outerHTML = chemLine(CalcChem.elements[shown - 1]); // its state at it
            }

            // A knob dragged, or the line pressed: the knob nearest, or the one on the side pressed, comes there
            chemLegend.addEventListener('pointerdown', function (e) {
                var line = e.target.closest('.calc-pt-range'), places, at, i, move, done;
                if (!line || e.button > 0) return;
                e.preventDefault();
                places = chemSliderPlaces();
                at = function (ev) {
                    var r = line.getBoundingClientRect();
                    return 1000 * (ev.clientX - r.left) / r.width;
                };
                i = e.target.dataset.i !== undefined ? +e.target.dataset.i : places.length < 2 ? 0 :
                    Math.abs(at(e) - places[0]) < Math.abs(at(e) - places[1]) || (places[0] === places[1] && at(e) < places[0]) ? 0 : 1;
                line.querySelectorAll('.calc-pt-range-knob')[i].focus({ preventScroll: true });
                chemSliding = true;
                hideTip();
                app.tipKey = null;
                i = chemSliderSet(i, at(e));
                // followed over the whole window, the pointer off the line as well, until it is let go
                move = function (ev) { if (ev.pointerId === e.pointerId) i = chemSliderSet(i, at(ev)); };
                done = function (ev) {
                    if (ev.pointerId !== e.pointerId) return;
                    window.removeEventListener('pointermove', move, false);
                    window.removeEventListener('pointerup', done, false);
                    window.removeEventListener('pointercancel', done, false);
                    chemSliding = false;
                    saveChem();
                };
                window.addEventListener('pointermove', move, false);
                window.addEventListener('pointerup', done, false);
                window.addEventListener('pointercancel', done, false);
            }, false);

            // a knob with the keys: the arrows a step, with Shift or Page Up and Down ten, Home and End to the ends
            chemLegend.addEventListener('keydown', function (e) {
                var knob = e.target.closest('.calc-pt-range-knob'), i, p, step;
                if (!knob) return;
                i = +knob.dataset.i;
                p = chemSliderPlaces()[i];
                step = e.shiftKey ? 50 : 5;
                p = { ArrowLeft: p - step, ArrowDown: p - step, ArrowRight: p + step, ArrowUp: p + step, PageDown: p - 50, PageUp: p + 50, Home: 0, End: 1000 }[e.key];
                if (p === undefined) return;
                e.preventDefault();
                e.stopPropagation(); // not on the keys of the calculator
                chemSliderSet(i, p);
                saveChem();
            }, false);

            chemLegend.addEventListener('click', function (e) {
                var k = e.target.closest('[data-g]');
                // the number of a slider clicked: 20 °C again, or all the elements
                if (e.target.closest('.calc-pt-temp-v')) {
                    if (chemBy === 'state') chemTempTo(20);
                    else {
                        delete chemCut[chemBy];
                        chemDim();
                    }
                    chemSliderDraw(chemSliderPlaces());
                    saveChem();
                    return;
                }
                if (!k) return;
                chemHot = chemHot === k.dataset.g ? '' : k.dataset.g;
                [].forEach.call(chemLegend.children, function (c) { c.classList.toggle('calc-on', c.dataset.g === chemHot); });
                chemDim();
            }, false);

            // Pointed at: in the space above. Off every element, in the table's gaps, on the tile above or out of
            // the table, the one chosen again; drawn only when it changes, as the tile under the mouse is redrawn
            function chemPoint(z) {
                var big = chemGrid.querySelector('.calc-pt-gap .calc-pt-big');
                if (z && (!big || +big.dataset.show !== z)) chemShow(z);
            }

            chemGrid.addEventListener('pointerover', function (e) {
                var t = e.target.closest('.calc-pt-el[data-z]');
                if (e.pointerType !== 'touch') chemPoint(t ? +t.dataset.z : chemAt);
            }, false);

            chemGrid.addEventListener('pointerleave', function () {
                chemPoint(chemAt);
            }, false);

            // The details of the element chosen, below the table, scrolled up to: smoothly, in the table's own
            // scroll alone, as the page around the calculator must not move
            function chemToInfo() {
                var by = (chemInfo.getBoundingClientRect().top - chemTable.getBoundingClientRect().top) / scale();
                chemTable.scrollTo({ top: chemTable.scrollTop + by - 4, behavior: 'smooth' });
            }

            // An element clicked is chosen; clicked again, or its big tile above the table, its details below are
            // scrolled to. On a touch screen, with nothing to point at, at once
            chemGrid.addEventListener('click', function (e) {
                var t = e.target.closest('.calc-pt-el[data-z]'), s = e.target.closest('.calc-pt-series'), big = e.target.closest('[data-show]'), again = false;
                if (s) { // La–Lu and Ac–Lr go to their row
                    chemShow(+s.dataset.from, true);
                } else if (big) {
                    if (+big.dataset.show !== chemAt) chemShow(+big.dataset.show, true);
                    again = true;
                } else if (t) {
                    again = +t.dataset.z === chemAt;
                    if (!again) chemShow(+t.dataset.z, true);
                } else {
                    return;
                }
                if (chemShut) chemCard(true); // its card open again
                if (again || touchScreen()) chemToInfo();
                saveChem();
            }, false);

            // the arrow keys go from element to element, as they are placed: across a gap to the next one
            chemGrid.addEventListener('keydown', function (e) {
                var e0 = CalcChem.elements[chemAt - 1], dr = { 38: -1, 40: 1 }[e.which] || 0, dc = { 37: -1, 39: 1 }[e.which] || 0, best = null;
                if (!dr && !dc) return;
                e.preventDefault();
                CalcChem.elements.forEach(function (x) {
                    var r = x.row - e0.row, c = x.col - e0.col, d;
                    if (dc && (r || c * dc <= 0)) return;
                    if (dr && r * dr <= 0) return;
                    d = dc ? Math.abs(c) : Math.abs(r) * 100 + Math.abs(c);
                    if (!best || d < best.d) best = { d: d, z: x.z };
                });
                if (best) {
                    chemShow(best.z, true);
                    saveChem();
                }
            }, false);

            chemSearch.addEventListener('input', function () {
                var q = chemSearch.value.trim().toLowerCase(), exact = CalcChem.elements.filter(function (e) {
                    return q && (e.s.toLowerCase() === q || String(e.z) === q || e.name.toLowerCase() === q || tr(e.name).toLowerCase() === q);
                })[0];
                chemDim();
                if (exact) {
                    chemShow(exact.z, true);
                    saveChem();
                }
            }, false);

            // the × of every search, of the formulas, the units, the graph's examples and the periodic table: the same, all of
            // the list shown again, or every element bright, as the box is emptied as if by hand. CSS shows it while something
            // is typed; its icon from here, the same in each
            var CLEAR_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>';
            [].forEach.call(root.querySelectorAll('.calc-search-clear'), function (x) { x.innerHTML = CLEAR_ICON; });
            root.addEventListener('click', function (e) {
                var x = e.target.closest('.calc-search-clear'), box = x && x.parentNode.querySelector('input');
                if (!box) return;
                box.value = '';
                box.dispatchEvent(new Event('input', { bubbles: true }));
                focusBox(box);
            }, false);

            // Enter chooses the first element found; Esc empties it first, then closes as ever
            chemSearch.addEventListener('keydown', function (e) {
                var q = chemSearch.value.trim(), first;
                if (e.which === 27 && chemSearch.value) {
                    e.preventDefault();
                    e.stopPropagation();
                    chemSearch.value = '';
                    chemDim();
                    return;
                }
                if (e.which !== 13) return;
                e.preventDefault();
                first = CalcChem.elements.filter(function (x) { return q && chemMatches(x, q); })[0];
                if (first) {
                    chemShow(first.z, true);
                    saveChem();
                }
            }, false);

            // a number of the element chosen is put in by Insert of its tip or menu
            chemInfo.addEventListener('click', function (e) {
                var u = e.target.closest('[data-unit]'), t = e.target.closest('.calc-sv-tile[data-v]'), units;
                if (e.target.closest('.calc-pt-hide')) { // closed: the table the whole width
                    hideTip();
                    chemCard(false);
                    saveChem();
                    return;
                }
                // popped in, its head, the tile and the name, and its atom scroll the card up to the top of the table
                if (e.target.closest('.calc-pt-head, .calc-pt-atom') && !root.classList.contains('calc-chem-big')) {
                    chemToInfo();
                    return;
                }
                // its spectrum, the other way: absorbed or given off
                if (e.target.closest('.calc-pt-spec')) {
                    hideTip();
                    chemSpec = chemSpec === 'abs' ? 'em' : 'abs';
                    chemShow(chemAt, true);
                    saveChem();
                    return;
                }
                // its unit, the next one: for every number of its kind, in the table and under it
                if (u) {
                    units = Object.keys(CHEM_UNITS[u.dataset.unit]);
                    chemUnit[u.dataset.unit] = units[(units.indexOf(chemUnit[u.dataset.unit]) + 1) % units.length];
                    renderChemTable();
                    saveChem();
                    return;
                }
                if (!t || !mayPut() || !engine.put(+t.dataset.v)) return;
                keyBoard['AC'].children[0].firstChild.data = 'C';
                refresh();
                saveState();
                chemDone();
            }, false);

            // the tips of the panel: its tabs, its pop out and close, and the cards
            function chemTip(el) {
                if (el === chemSize) return CalcTips[root.classList.contains('calc-chem-big') ? 'chem small' : 'chem big'];
                if (el.classList.contains('calc-past-close')) return CalcTips['chem close'];
                if (el.classList.contains('calc-solve-tab')) return CalcTips['chem tab ' + el.dataset.tab] || null;
                if (el.classList.contains('calc-pt-mode')) return CalcTips['chem by ' + el.dataset.by] || null;
                if (el.classList.contains('calc-pt-unit')) return CalcTips['chem unit'];
                if (el.classList.contains('calc-pt-hide')) return CalcTips['chem card close'];
                if (el.closest('.calc-pt-temp')) return CalcTips[chemBy === 'state' ? 'chem temp' : 'chem cut'];
                if (el.hasAttribute('data-pt')) return chemPartTip(el);
                return chemCards.tip(el);
            }

            // What else of a web page a card works out (the features of the instant answers in the extension, page/solve.js
            // and the others), in its panel: a card of the solver, of the numbers or of the dates with its boxes filled; a
            // quantity in the converter, its group, unit and value; a list of numbers in the statistics; of the chemistry
            // (page/chemistry.js), a card of the Chemistry panel, or the table at an element; of the physics and the biology
            // (page/physics.js and page/biology.js), a card of their panels. Its numbers are written with points: with the comma as the
            // decimal mark, a box of a number has a comma, and ; between, as a composition's and the gases of a mixture have. A
            // formula, a reaction, a sequence and a cross are as they are
            function pageCard(panel, card, fields) {
                var kept = {}, words = { u: 1, t: 1, b: 1, enc: 1, bits: 1, convert: 1, ts: 1, d: 1, g: 1, to: 1 }, // names and codes, as they are
                    el = panel === 'chem' && card === 'element' ? CalcChem.bySymbol[fields.s] : null;
                Object.keys(fields).forEach(function (k) {
                    var v = String(fields[k]);
                    if (k === 'panel' || k === 'card') return;
                    kept[k] = engine.comma && (panel === 'chem' ? k === 'c' || k === 'g' : !words[k] && panel !== 'dates' && panel !== 'bio') ? v.replace(/,/g, ';').replace(/\./g, ',') : v;
                });
                if (panel === 'solve' || panel === 'numbers') {
                    if (!(panel === 'solve' ? solveButton : numbersButton).hidden) (panel === 'solve' ? solver : numbers).put(card, kept);
                } else if (panel === 'dates') {
                    if (convButton.hidden || !app.dates.put(card, kept)) return;
                    app.convTab = 'dates';
                    showConv(true);
                    saveConv();
                } else if (panel === 'units') {
                    var g = CalcUnits.units.map(function (group) { return group.c; }).indexOf(kept.g);
                    if (convButton.hidden || g < 0) return;
                    app.convTab = 'units';
                    convSearch.value = '';
                    showConv(true); // which puts in a result of the display: the page's value, after it
                    app.unitCards.put(app.UNIT_TOOLS.units[g].id, { v: kept.v, u: kept.u });
                    convTabs();
                    convFocus();
                    saveConv();
                } else if (panel === 'stats') {
                    if (statsButton.hidden) return;
                    if (app.statsTab !== 'list') setStatsTab('list');
                    statsInput.value = app.statsTexts.list = String(fields.list || '').replace(/\./g, engine.comma ? ',' : '.');
                    showStats(true);
                    saveState();
                } else if (panel === 'chem') {
                    if (chemButton.hidden || (card === 'element' ? !el : !chemCards.put(card, kept))) return;
                    chemTab = el ? 'table' : chemCards.tab();
                    showChem(true);
                    if (el) { // its card open, at the right popped out
                        chemCard(true);
                        chemAt = el.z;
                        renderChemTable();
                    }
                    saveChem();
                } else if (panel === 'phys' || panel === 'bio') {
                    if (!(panel === 'phys' ? physButton : bioButton).hidden) (panel === 'phys' ? phys : bio).put(card, kept);
                }
            }

            // A sum or an equation of a web page, its icon clicked (page/answers.js in the extension): a sum is
            // worked out in the display, from the start; an equation or an inequality of x opens in its card
            // of the solver, as an integral, a sum or a product of terms and a limit in theirs, with their ends;
            // an IP network in its card of the numbers; a formula and a constant in the formulas panel, while
            // they are on. It is written with points, whatever the decimal mark shown
            root.addEventListener('calc-equation', function (e) {
                var d = e.detail || {}, text = String(d.text || ''), fields = d.fields || {}, read,
                    cards = { integral: 'integral', series: 'sum', product: 'product', limit: 'limit', derivative: 'derivative', taylor: 'taylor', ode: 'ode' };
                if (d.kind === 'card') {
                    pageCard(String(fields.panel || ''), String(fields.card || ''), fields);
                    return;
                }
                if (!text) return;
                if (d.kind === 'equation' || d.kind === 'inequality') {
                    if (!solveButton.hidden) solver.put(d.kind, { eq: text });
                    return;
                }
                if (cards[d.kind]) {
                    if (!solveButton.hidden) solver.put(cards[d.kind], fields);
                    return;
                }
                if (d.kind === 'subnet' || d.kind === 'matrix') { // a matrix: its size and numbers, as Matrix takes them
                    if (!numbersButton.hidden) numbers.put(d.kind, d.kind === 'subnet' ? { ip: text } : fields);
                    return;
                }
                if (d.kind === 'graph') {
                    if (!graphButton.hidden && fields.f) drawPageCurve(String(fields.f));
                    return;
                }
                if (d.kind === 'formula' || d.kind === 'constant') {
                    if (!fxButton.hidden) showFxItem(d.kind === 'formula' ? 'formulas' : 'constants', String(fields.name || ''));
                    return;
                }
                closePanels();
                unselect();
                if (engine.edit) engine.reset(); // not into the equation being edited, at its cursor
                // a/b as the tip had it: on for a sum written in fractions, its result one; off for one of decimals
                if (fields.frac === '1' ? !app.fracMode : fields.frac === '0' && app.fracMode) toggleFraction();
                engine.comma = false;
                read = engine.paste(text + ' =', app.deg);
                engine.comma = CalcEngine.comma(app.fmt.group);
                if (!read) return;
                keyBoard['AC'].children[0].firstChild.data = 'C';
                refresh();
                saveState();
            }, false);


    };
})(typeof window !== 'undefined' ? window : this);
