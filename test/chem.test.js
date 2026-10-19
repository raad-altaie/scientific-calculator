// Run with: node test/chem.test.js
// The elements and the chemistry of chem.js: molar masses, equations balanced, amounts and the
// limiting reactant, empirical formulas, oxidation numbers and redox, and names
'use strict';

var Chem = require('../js/chem.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

function near(a, b, tol) {
    return Math.abs(a - b) <= (tol || 1e-3);
}

// the table: every element once, each in a place of its own
check(Chem.elements.length === 118, '118 elements');
var places = {};
Chem.elements.forEach(function (e, i) {
    check(e.z === i + 1, e.s + ': its number');
    check(!places[e.row + ',' + e.col], e.s + ': a place of its own', places[e.row + ',' + e.col]);
    places[e.row + ',' + e.col] = e.s;
    check(e.shells.reduce(function (a, b) { return a + b; }, 0) === e.z, e.s + ': as many electrons as protons');
});
[['H', 1, 1, 'nonmetal'], ['Na', 1, 3, 'alkali'], ['Fe', 8, 4, 'transition'], ['Br', 17, 4, 'halogen'], ['Og', 18, 7, 'noble'], ['Lu', 3, 6, 'lanthanide']].forEach(function (c) {
    var e = Chem.bySymbol[c[0]];
    check(e.group === c[1] && e.period === c[2] && e.cat === c[3], c[0] + ': group ' + c[1] + ', period ' + c[2] + ', ' + c[3], [e.group, e.period, e.cat]);
});
[['O', '[He] 2s² 2p⁴'], ['Cr', '[Ar] 3d⁵ 4s¹'], ['Cu', '[Ar] 3d¹⁰ 4s¹'], ['Pd', '[Kr] 4d¹⁰'], ['Gd', '[Xe] 4f⁷ 5d¹ 6s²'], ['U', '[Rn] 5f³ 6d¹ 7s²']].forEach(function (c) {
    check(Chem.bySymbol[c[0]].config === c[1], c[0] + ': ' + c[1], Chem.bySymbol[c[0]].config);
});
check(Chem.bySymbol.Fe.shells.join() === '2,8,14,2', 'Fe: shells 2, 8, 14, 2');
check(Chem.bySymbol.Tc.unstable && Chem.bySymbol.Pu.unstable && !Chem.bySymbol.U.unstable && !Chem.bySymbol.Th.unstable && !Chem.bySymbol.Pb.unstable,
    'in brackets: Tc and Pu, with no standard weight; not U, Th or Pb');
check(Chem.bySymbol.Br.state === 'liquid' && Chem.bySymbol.N.state === 'gas' && Chem.bySymbol.Fe.state === 'solid', 'states at 20 °C');

// molar masses
[['H2O', 18.015], ['NaCl', 58.44], ['Ca(OH)2', 74.092], ['CuSO4·5H2O', 249.677], ['CuSO4*5H2O', 249.677], ['(NH4)2SO4', 132.134],
    ['K4[Fe(CN)6]', 368.345], ['C6H12O6', 180.156], ['Mg3(PO4)2', 262.855], ['H₂SO₄', 98.072], ['NaCl(aq)', 58.44]].forEach(function (c) {
    var r = Chem.molarMass(c[0]);
    check(!r.error && near(r.mass, c[1]), c[0] + ' = ' + c[1] + ' g/mol', r.error || r.mass);
});
check(near(Chem.molarMass('H2O').parts.filter(function (p) { return p.s === 'O'; })[0].percent, 88.81, 0.01), 'H2O is 88.81% oxygen');
[['Fe^3+', 3], ['Fe3+', 3], ['SO42-', -2], ['SO4^2-', -2], ['NH4+', 1], ['MnO4-', -1], ['[Fe(CN)6]3-', -3], ['Cl-', -1], ['e-', -1]].forEach(function (c) {
    check(Chem.parse(c[0]).charge === c[1], c[0] + ': charge ' + c[1], Chem.parse(c[0]).charge);
});
check(Chem.parse('NH4+').atoms.H === 4, 'NH4+ has four H');
check(Chem.parse('Xy').error === 'element' && Chem.parse('Ca(OH').error === 'brackets' && Chem.parse('').error === 'empty', 'what is not a formula');
check(Chem.plain('CuSO4·5H2O') === 'CuSO₄·5H₂O' && Chem.plain('SO42-') === 'SO₄²⁻', 'written with subscripts and charges', Chem.plain('SO42-'));

// equations balanced
[['Fe + O2 = Fe2O3', '4Fe + 3O₂ → 2Fe₂O₃', 'Synthesis'],
    ['C3H8 + O2 -> CO2 + H2O', 'C₃H₈ + 5O₂ → 3CO₂ + 4H₂O', 'Combustion'],
    ['KMnO4 + HCl = KCl + MnCl2 + H2O + Cl2', '2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 8H₂O + 5Cl₂'],
    ['Cu + HNO3 → Cu(NO3)2 + NO + H2O', '3Cu + 8HNO₃ → 3Cu(NO₃)₂ + 2NO + 4H₂O'],
    ['MnO4- + Fe2+ + H+ = Mn2+ + Fe3+ + H2O', 'MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O'],
    ['Cr2O7^2- + H+ + e- = Cr^3+ + H2O', 'Cr₂O₇²⁻ + 14H⁺ + 6e⁻ → 2Cr³⁺ + 7H₂O', 'Half-reaction'],
    ['CaCO3 = CaO + CO2', 'CaCO₃ → CaO + CO₂', 'Decomposition'],
    ['Zn + CuSO4 = ZnSO4 + Cu', 'Zn + CuSO₄ → ZnSO₄ + Cu', 'Single replacement'],
    ['NaOH + HCl = NaCl + H2O', 'NaOH + HCl → NaCl + H₂O', 'Double replacement, neutralization'],
    ['2H2 + O2 = 2H2O', '2H₂ + O₂ → 2H₂O']].forEach(function (c) {
    var r = Chem.balance(c[0]);
    check(r.text === c[1], c[0] + ' → ' + c[1], r.text || JSON.stringify(r));
    if (c[2]) check(r.kind === c[2], c[0] + ': ' + c[2], r.kind);
});
check(Chem.balance('Fe + O2').error === 'arrow', 'no arrow');
check(Chem.balance('H2 = O2').error === 'one side', 'an element on one side only');
check(Chem.balance('H2O = H2 + O3 + O2').many, 'more than one way');

// amounts and the limiting reactant
var a = Chem.amounts('Fe + O2 = Fe2O3', [{ t: 'Fe', v: 10, unit: 'g' }, { t: 'O2', v: 5, unit: 'g' }]);
check(a.limiting === 'Fe', 'of 10 g of Fe and 5 g of O2, Fe runs out');
check(near(a.rows[2].g, 14.297), 'and makes 14.297 g of Fe2O3', a.rows[2].g);
check(near(a.rows[1].left * a.rows[1].M, 0.703), 'leaving 0.703 g of O2', a.rows[1].left * a.rows[1].M);
a = Chem.amounts('N2 + H2 = NH3', [{ t: 'N2', v: 28, unit: 'g' }, { t: 'NH3', v: 25, unit: 'g' }]);
check(near(a.percent, 73.43, 0.01), 'a yield of 25 g of NH3 from 28 g of N2 is 73.43%', a.percent);
a = Chem.amounts('H2 + O2 = H2O', [{ t: 'H2', v: 2, unit: 'mol' }]);
check(near(a.rows[2].mol, 2) && near(a.rows[1].mol, 1), '2 mol of H2 takes 1 mol of O2 and makes 2 mol of H2O');
check(JSON.stringify(Chem.readAmounts('Fe 10 g, O2 5, H2 = 2 mol').list) === JSON.stringify([{ t: 'Fe', v: 10, unit: 'g' }, { t: 'O2', v: 5, unit: 'g' }, { t: 'H2', v: 2, unit: 'mol' }]),
    'amounts read, in g unless said');
check(Chem.readAmounts('Fe 1,5; O2 2', true).list[0].v === 1.5, 'with a decimal comma');

// empirical formulas
[['C 40, H 6.71, O 53.29', 180.16, 'CH2O', 'C6H12O6'], ['Fe 69.94, O 30.06', 0, 'Fe2O3'], ['N 30.4, O 69.6', 92, 'NO2', 'N2O4'],
    ['K 24.75, Mn 34.77, O 40.51', 0, 'KMnO4'], ['C 92.3%, H 7.7%', 78, 'CH', 'C6H6']].forEach(function (c) {
    var r = Chem.empirical(c[0], false, c[1]);
    check(r.formula === c[2] && (!c[3] || r.molecular === c[3]), c[0] + ': ' + c[2] + (c[3] ? ', ' + c[3] : ''), r.formula + ' ' + r.molecular);
});
check(Chem.empirical('C 40; H 6,71; O 53,29', true).formula === 'CH2O', 'with a decimal comma');
check(Chem.empirical('Xx 5').error === 'element', 'an element that is not');

// the radius, the electron affinity and the ions of an element
check(Chem.bySymbol.Na.radius === 227 && Chem.bySymbol.Cs.radius === 343 && Chem.bySymbol.Og.radius === null, 'radius: Na 227 pm, Cs 343, Og not known');
check(near(Chem.bySymbol.Cl.affinity, 349, 0.5) && Chem.bySymbol.Ne.affinity === null, 'affinity: Cl 349 kJ/mol, Ne none', Chem.bySymbol.Cl.affinity);
check(Chem.bySymbol.Fe.ions === 'Fe²⁺ Fe³⁺' && Chem.bySymbol.C.ions === null, 'ions: Fe²⁺ Fe³⁺, C none');

// solubility: the ions found by the atoms, in either order, and by the charges
[['PbI2', 'PbI2', 'I', 'Lead(II) iodide'], ['BaSO4', 'BaSO4', 'I', 'Barium sulfate'], ['Fe2(SO4)3', 'Fe2(SO4)3', 'S', 'Iron(III) sulfate'],
    ['FeSO4', 'FeSO4', 'S', 'Iron(II) sulfate'], ['CH3COONa', 'NaCH3COO', 'S', 'Sodium acetate'], ['(NH4)2SO4', '(NH4)2SO4', 'S', 'Ammonium sulfate'],
    ['Ca(OH)2', 'Ca(OH)2', 's', 'Calcium hydroxide'], ['Al2(CO3)3', 'Al2(CO3)3', 'R', 'Aluminium carbonate'], ['Mg3(PO4)2', 'Mg3(PO4)2', 'I', 'Magnesium phosphate']
].forEach(function (c) {
    var r = Chem.solubility(c[0]);
    check(r.formula === c[1] && r.letter === c[2] && r.name === c[3], c[0] + ': ' + c[3] + ', ' + c[2], JSON.stringify(r));
});
check(Chem.solubility('CuSO4·5H2O').formula === 'CuSO4' && Chem.solubility('CuSO4·5H2O').hydrate, 'a hydrate: its water left out');
check(Chem.solubility('Hg2Cl2').error === 'unknown' && Chem.solubility('Xx').error === 'element', 'not in the table; not a formula');
var table = Chem.solubilityTable();
check(table.cations.length === table.letters.length && table.letters.every(function (l) { return l.length === table.anions.length && /^[SsIR]+$/.test(l); }),
    'the solubility table: a letter of S, s, I or R for each cation and anion');
check(table.letters[table.cations.map(function (c) { return c.ion; }).indexOf('Pb²⁺')].charAt(table.anions.map(function (a) { return a.ion; }).indexOf('I⁻')) === 'I',
    'in it, lead iodide does not dissolve');

// ions: by formula, with or without a charge, or by a name of it
[['SO4^2-', 'Sulfate', -2], ['sulfate', 'Sulfate', -2], ['Fe3+', 'Iron(III)', 3], ['ferric', 'Iron(III)', 3], ['bicarbonate', 'Hydrogen carbonate', -1],
    ['NH4+', 'Ammonium', 1], ['MnO4', 'Permanganate', -1], ['Hg2^2+', 'Mercury(I)', 2]].forEach(function (c) {
    var r = Chem.findIon(c[0]);
    check(r.name === c[1] && r.charge === c[2], c[0] + ': ' + c[1] + ', ' + c[2], JSON.stringify(r));
});
check(Chem.findIon('Cu2+').water === 'Blue' && Chem.findIon('Na+').flame === 'Yellow-orange' && Chem.findIon('MnO4-').kind === 'Polyatomic anion', 'an ion\'s colour in water and in a flame');
check(Chem.findIon('xyz').error === 'unknown' && Chem.findIon('').error === 'empty', 'no ion of that name; nothing typed');
check(Chem.ions.every(function (i) { return i.charge !== 0; }), 'every ion has a charge');

// oxidation numbers: by the rules, a rule dropped where it does not add up, an average, a salt's ions apart
function ox(t) {
    var r = Chem.oxidation(t);
    return r.error ? r.error : r.rows.map(function (x) { return x.s + (x.in ? ' in ' + x.in : '') + ' ' + x.text; }).join(', ');
}
[['KMnO4', 'K +1, Mn +7, O −2'], ['Cr2O7^2-', 'Cr +6, O −2'], ['Fe2(SO4)3', 'Fe +3, S +6, O −2'], ['H2O2', 'H +1, O −1'], ['OF2', 'O +2, F −1'],
    ['NaClO', 'Na +1, Cl +1, O −2'], ['LiAlH4', 'Li +1, Al +3, H −1'], ['Fe3O4', 'Fe +8/3, O −2'], ['KO2', 'K +1, O −1/2'], ['ICl', 'I +1, Cl −1'],
    ['K4[Fe(CN)6]', 'K +1, Fe +2, C +2, N −3'], ['CuSO4·5H2O', 'Cu +2, S +6, O −2, H +1'], ['FeS2', 'Fe +2, S −1'], ['O3', 'O 0'], ['Fe^3+', 'Fe +3'],
    ['NH4NO3', 'N in NH₄⁺ −3, H in NH₄⁺ +1, N in NO₃⁻ +5, O in NO₃⁻ −2'], ['e-', 'electron'], ['Xy', 'element']
].forEach(function (c) {
    check(ox(c[0]) === c[1], 'oxidation numbers of ' + c[0] + ': ' + c[1], ox(c[0]));
});
check(Chem.oxidation('Fe3O4').average.join() === 'Fe' && Chem.oxidation('K4[Fe(CN)6]').guessed && !Chem.oxidation('KMnO4').guessed, 'an average; more than one left by the rules');

// redox: what is oxidized and what is reduced, and its kind where it had none
var redox = Chem.balance('KMnO4 + HCl = KCl + MnCl2 + H2O + Cl2');
check(redox.kind === 'Redox' && JSON.stringify(redox.redox) === JSON.stringify({ oxidized: [{ s: 'Cl', from: '−1', to: '0' }], reduced: [{ s: 'Mn', from: '+7', to: '+2' }] }),
    'KMnO4 and HCl: Cl oxidized, Mn reduced', JSON.stringify(redox));
redox = Chem.balance('Cl2 + NaOH = NaCl + NaClO3 + H2O');
check(redox.redox.oxidized[0].to === '+5' && redox.redox.reduced[0].to === '−1', 'Cl2 in NaOH: oxidized to +5 and reduced to −1 at once', JSON.stringify(redox.redox));
check(Chem.balance('Zn + CuSO4 = ZnSO4 + Cu').kind === 'Single replacement' && Chem.balance('Zn + CuSO4 = ZnSO4 + Cu').redox.oxidized[0].s === 'Zn', 'a kind kept, its redox too');
check(Chem.balance('NaOH + HCl = NaCl + H2O').redox === null && Chem.balance('AgNO3 + NaCl = AgCl + NaNO3').redox === null, 'no redox in a neutralization or a precipitation');

// names: of a formula, and the formula of a name
[['Fe2(SO4)3', 'Iron(III) sulfate'], ['CuSO4·5H2O', 'Copper(II) sulfate pentahydrate'], ['NaHCO3', 'Sodium hydrogen carbonate'], ['(NH4)2SO4', 'Ammonium sulfate'],
    ['Hg2Cl2', 'Mercury(I) chloride'], ['MnO2', 'Manganese(IV) oxide'], ['Na2O2', 'Sodium peroxide'], ['SnS2', 'Tin(IV) sulfide'], ['Al2O3', 'Aluminium oxide'],
    ['H2SO4', 'Sulfuric acid'], ['HNO2', 'Nitrous acid'], ['HCl', 'Hydrogen chloride'], ['CO', 'Carbon monoxide'], ['N2O4', 'Dinitrogen tetroxide'],
    ['P4O10', 'Tetraphosphorus decoxide'], ['NH3', 'Ammonia'], ['SO4^2-', 'Sulfate ion'], ['Fe^3+', 'Iron(III) ion'], ['Cl^-', 'Chloride ion'], ['O2', 'Oxygen']
].forEach(function (c) {
    var r = Chem.names(c[0]);
    check(r.name === c[1] && r.from === 'formula', c[0] + ' is ' + c[1], JSON.stringify(r));
});
check(Chem.names('HCl').acid === 'Hydrochloric acid' && Chem.names('H2S').acid === 'Hydrosulfuric acid', 'the acid of HCl and H2S in water');
[['iron(III) sulfate', 'Fe2(SO4)3'], ['Iron (II) oxide', 'FeO'], ['copper(II) sulfate pentahydrate', 'CuSO4·5H2O'], ['sodium hydrogen carbonate', 'NaHCO3'],
    ['ammonium sulfate', '(NH4)2SO4'], ['mercury(I) chloride', 'Hg2Cl2'], ['cupric oxide', 'CuO'], ['iron(3+) chloride', 'FeCl3'], ['aluminum oxide', 'Al2O3'],
    ['magnesium nitride', 'Mg3N2'], ['sulfuric acid', 'H2SO4'], ['hydrochloric acid', 'HCl'], ['phosphoric acid', 'H3PO4'], ['carbonic acid', 'H2CO3'],
    ['dinitrogen tetroxide', 'N2O4'], ['carbon monoxide', 'CO'], ['sulfur hexafluoride', 'SF6'], ['Water', 'H2O'], ['chlorine', 'Cl2'], ['sulfate', 'SO4^2-']
].forEach(function (c) {
    var r = Chem.names(c[0]);
    check(r.formula === c[1] && r.from === 'name', c[0] + ' is ' + c[1], JSON.stringify(r));
});
check(Chem.names('iron oxide').error === 'numeral' && Chem.names('iron oxide').element.s === 'Fe', 'iron oxide: which charge of iron');
check(Chem.names('no such thing').error === 'unknown' && Chem.names('C6H5OH').error === 'unknown' && Chem.names('Xx2O').error === 'element', 'not named; no such element');

// the particles in water, i
[['NaCl', 2], ['CaCl2', 3], ['Al2(SO4)3', 5], ['MgSO4·7H2O', 2], ['HCl', 2], ['H2SO4', 3], ['CH3COOH', 1], ['HF', 1], ['C6H12O6', 1]].forEach(function (c) {
    check(Chem.particles(c[0]).i === c[1], c[0] + ': i ' + c[1], Chem.particles(c[0]).i);
});

// what is known of each element in words: its specific heat, who found it, its isotopes
check(near(Chem.bySymbol.Fe.heat, 0.449) && near(Chem.bySymbol.H.heat, 14.304) && Chem.bySymbol.Og.heat === null, 'specific heat: Fe 0.449, H 14.304 J/(g·K), Og not known');
check(Chem.bySymbol.O.foundBy === 'Carl Wilhelm Scheele' && Chem.bySymbol.Na.isolatedBy === 'Humphry Davy', 'found by Scheele; sodium isolated by Davy');
check(Chem.bySymbol.Fe.isotopes === '4 stable: ⁵⁶Fe, ⁵⁴Fe, ⁵⁷Fe, ⁵⁸Fe' && /^None stable; longest-lived ⁹⁷Tc/.test(Chem.bySymbol.Tc.isotopes), 'isotopes: Fe stable, most abundant first; Tc its longest-lived');
check(Chem.elements.every(function (e) { return e.isotopes && e.story && e.foundBy; }), 'every element has its isotopes, its name or history, and its finder');

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
