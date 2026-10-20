// Run with: node test/page-chemistry.test.js
// The chemistry of a page's text the icons go after (page/chemistry.js): reactions, formulas, compositions, the
// names of compounds and elements; what chem.js makes sure of, what is selected, and what their tips say. And the
// codes, words and letters that look like chemistry and are not
'use strict';

var ChemPage = require('../js/page/chemistry.js'),
    PageMaths = require('../js/page/answers.js'),
    Chem = require('../js/chem.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

// what is found in a text and made sure of by chem.js: its text, kind and boxes
function found(text) {
    return ChemPage.find(text).filter(function (c) { return ChemPage.check(c, Chem); }).map(function (c) {
        return c.text + ' | ' + c.kind + ' | ' + JSON.stringify(c.fields);
    });
}

// each is found whole, of its kind, with the boxes of its card
[
    ['Water: 2H2 + O2 → 2H2O', '2H2 + O2 → 2H2O | reaction | {"eq":"2H2 + O2 → 2H2O"}'],
    ['Rust: Fe + O2 → Fe2O3 in damp air.', 'Fe + O2 → Fe2O3 | reaction | {"eq":"Fe + O2 → Fe2O3"}'],
    ['C3H8 + O2 = CO2 + H2O', 'C3H8 + O2 = CO2 + H2O | reaction | {"eq":"C3H8 + O2 → CO2 + H2O"}'],
    ['CH4 + 2O2 -> CO2 + 2H2O', 'CH4 + 2O2 -> CO2 + 2H2O | reaction | {"eq":"CH4 + 2O2 → CO2 + 2H2O"}'],
    ['N2 + 3H2 ⇌ 2NH3', 'N2 + 3H2 ⇌ 2NH3 | reaction | {"eq":"N2 + 3H2 → 2NH3"}'],
    ['2H₂ + O₂ → 2H₂O', '2H₂ + O₂ → 2H₂O | reaction | {"eq":"2H2 + O2 → 2H2O"}'],
    ['Ag^(+)(aq) + Cl^(−)(aq) → AgCl(s)', 'Ag^(+)(aq) + Cl^(−)(aq) → AgCl(s) | reaction | {"eq":"Ag^+(aq) + Cl^-(aq) → AgCl(s)"}'],
    ['Na+ + Cl- → NaCl', 'Na+ + Cl- → NaCl | reaction | {"eq":"Na+ + Cl- → NaCl"}'],
    ['Ag⁺ + Cl⁻ → AgCl', 'Ag⁺ + Cl⁻ → AgCl | reaction | {"eq":"Ag^+ + Cl^- → AgCl"}'],
    ['Fe^3+ + e- → Fe^2+', 'Fe^3+ + e- → Fe^2+ | reaction | {"eq":"Fe^3+ + e- → Fe^2+"}'],
    ['Battery acid is H2SO4.', 'H2SO4 | compound | {"f":"H2SO4"}'],
    ['Blue CuSO4·5H2O', 'CuSO4·5H2O | compound | {"f":"CuSO4·5H2O"}'],
    ['Breathe out CO₂', 'CO₂ | compound | {"f":"CO2"}'],
    ['The ion SO₄^(2−)', 'SO₄^(2−) | compound | {"f":"SO4^2-"}'],
    ['Typed: MnO4^-', 'MnO4^- | compound | {"f":"MnO4^-"}'],
    ['Superscripts: NH₄⁺', 'NH₄⁺ | compound | {"f":"NH4^+"}'],
    ['A complex: K4[Fe(CN)6]', 'K4[Fe(CN)6] | compound | {"f":"K4[Fe(CN)6]"}'],
    ['Caffeine, C8H10N4O2', 'C8H10N4O2 | compound | {"f":"C8H10N4O2"}'],
    ['Glucose is 40% C, 6.7% H and 53.3% O by mass.', '40% C, 6.7% H and 53.3% O | composition | {"c":"C 40, H 6.7, O 53.3"}'],
    ['carbon 40%, hydrogen 6.7%, oxygen 53.3%', 'carbon 40%, hydrogen 6.7%, oxygen 53.3% | composition | {"c":"C 40, H 6.7, O 53.3"}'],
    ['With colons: C: 85.6%, H: 14.4%', 'C: 85.6%, H: 14.4% | composition | {"c":"C 85.6, H 14.4"}'],
    ['A pinch of sodium chloride', 'sodium chloride | chemname | {"f":"sodium chloride"}'],
    ['Rust is iron(III) oxide.', 'iron(III) oxide | chemname | {"f":"iron(III) oxide"}'],
    ['Blue copper(II) sulfate pentahydrate', 'copper(II) sulfate pentahydrate | chemname | {"f":"copper(II) sulfate pentahydrate"}'],
    ['A brown gas: dinitrogen tetroxide', 'dinitrogen tetroxide | chemname | {"f":"dinitrogen tetroxide"}'],
    ['For cakes: sodium hydrogen carbonate', 'sodium hydrogen carbonate | chemname | {"f":"sodium hydrogen carbonate"}'],
    ['Hydrochloric acid in the stomach', 'Hydrochloric acid | chemname | {"f":"Hydrochloric acid"}'],
    ['Iron (Fe) rusts.', 'Iron (Fe) | element | {"s":"Fe"}'],
    ['Na (sodium) reacts with water.', 'Na (sodium) | element | {"s":"Na"}'],
    ['The element carbon', 'element carbon | element | {"s":"C"}'],
    ['Gold is element Au.', 'element Au | element | {"s":"Au"}']
].forEach(function (c) {
    var got = found(c[0]);
    check(got.length === 1 && got[0] === c[1], 'found: ' + c[0], got.join(' || '));
});

// as many as there are
[
    ['Table salt, NaCl, and baking soda, NaHCO3', 2], ['Ca(OH)2, (NH4)2SO4 and K4[Fe(CN)6]', 3], ['Silver chloride does not dissolve: AgCl', 2],
    ['Carbon monoxide and carbon dioxide', 2], ['Copper (Cu) and zinc (Zn) make brass.', 2], ['Burn it: CH4 + 2O2 → CO2 + 2H2O, with CH4 a gas', 2]
].forEach(function (c) {
    var got = found(c[0]);
    check(got.length === c[1], 'found ' + c[1] + ': ' + c[0], got.join(' || '));
});

// what looks like chemistry and is not: codes, capitals, an element alone, letters and arrows, words, and what
// chem.js cannot read or name
[
    'a PS5, the W3C, Y2K, H1N1, an SN2 reaction, HeLa cells, NaN, a PoS terminal, the CoP26',
    'the CNN, the BBC, the NHS, KOH alone, COVID-19, PV and ICU',
    'vitamin B12, an N95 mask, a V8 engine, O2 alone, F1',
    'Home → About, the chords C → G, S → N, A + B → C',
    'K = C + 273, PV = nRT, E = mc², V = IR, pH = 7, x = 5, Ka = 1.8',
    'He is here, In 2024, As we know, No way, the US and UK, a CO2e figure, H2O.com, version 1.2.3',
    'citric acid, the climate, we create, a website, copper sulfate, 40% of people and 60% of cats',
    'Ohm (Ω), Pi (π), Sir Lancelot (Sl), the element of surprise, element I',
    'Not balanced at all: Fe → O2'
].forEach(function (text) {
    var got = found(text);
    check(!got.length, 'none: ' + text, got.join(' || '));
});

// a formula of a page: its numbers small, its charge after ^, as chem.js reads it
[['H₂O', 'H2O'], ['SO₄^(2−)', 'SO4^2-'], ['NH₄⁺', 'NH4^+'], ['SO₄²⁻', 'SO4^2-'], ['CuSO4 · 5H2O', 'CuSO4·5H2O'], ['Fe^(3+)', 'Fe^3+']].forEach(function (c) {
    check(ChemPage.plainFormula(c[0]) === c[1], 'plain: ' + c[0], ChemPage.plainFormula(c[0]));
});

// selected alone: an element by its symbol or name, a compound by a name of its own, a formula of capitals
[
    ['Fe', 'element', '{"s":"Fe"}'], ['iron', 'element', '{"s":"Fe"}'], ['Sulphur', 'element', '{"s":"S"}'], ['water', 'chemname', '{"f":"water"}'],
    ['H2O', 'compound', '{"f":"H2O"}'], ['KOH', 'compound', '{"f":"KOH"}'], ['O2', 'compound', '{"f":"O2"}'], ['CO', 'compound', '{"f":"CO"}'],
    ['sodium chloride', 'chemname', '{"f":"sodium chloride"}'], ['2H2 + O2 → 2H2O', 'reaction', '{"eq":"2H2 + O2 → 2H2O"}'],
    ['C 40%, H 6.7%, O 53.3%', 'composition', '{"c":"C 40, H 6.7, O 53.3"}'], ['hello world', null], ['PS5', null], ['E = mc²', null]
].forEach(function (c) {
    var got = ChemPage.picked(c[0]);
    check((got ? got.kind : null) === c[1] && (!got || (JSON.stringify(got.fields) === c[2] && ChemPage.check(got, Chem))),
        'picked: ' + c[0], got && got.kind + ' ' + JSON.stringify(got.fields));
});
check(!ChemPage.check(ChemPage.picked('CNN'), Chem), 'picked: CNN is no carbon dinitride');

// selected on a page: the maths first, then the chemistry
(function () {
    [['Fe', 'element'], ['H2SO4', 'compound'], ['2H2 + O2 → 2H2O', 'reaction'], ['sodium chloride', 'chemname'], ['Add H2SO4 slowly', 'compound'],
        ['12 × 7 + 3', 'sum'], ['E = mc²', 'formula'], ['speed of light', 'constant'], ['hello world', null]].forEach(function (c) {
        var got = PageMaths.selected(c[0], 'mdy');
        check((got ? got.kind : null) === c[1], 'selected: ' + c[0], got && got.kind);
    });
})();

// the tips, worked out by chem.js
(function () {
    var tip = function (text) { return ChemPage.tipOf(ChemPage.find(text)[0], Chem); };
    var row = function (t, name) { return (t.rows.filter(function (r) { return r[0] === name; })[0] || [])[1]; };
    var t = tip('Fe + O2 → Fe2O3');
    check(t.title === 'Fe + O₂ → Fe₂O₃' && t.lines[0] === '4Fe + 3O₂ → 2Fe₂O₃' && row(t, 'Kind') === 'Synthesis' && row(t, 'Oxidized') === 'Fe 0 → +3' &&
        row(t, 'Reduced') === 'O 0 → −2' && !t.note, 'tip: Fe + O2 → Fe2O3 balanced, its redox', JSON.stringify(t));
    t = tip('2H2 + O2 → 2H2O');
    check(t.note === 'Balanced as it is written.', 'tip: 2H2 + O2 → 2H2O balanced as written', JSON.stringify(t));
    t = tip('H2SO4');
    check(t.title === 'H₂SO₄' && t.lines[0] === '98.072 g/mol' && row(t, 'Name') === 'Sulfuric acid' && row(t, 'Oxidation numbers') === 'H +1, S +6, O −2',
        'tip: H2SO4', JSON.stringify(t));
    t = tip('AgCl');
    check(row(t, 'In water') === 'Insoluble' && row(t, 'Name') === 'Silver chloride', 'tip: AgCl does not dissolve', JSON.stringify(t));
    t = tip('Caffeine, C8H10N4O2');
    check(!row(t, 'Oxidation numbers') && row(t, 'By mass') === 'C 49.5%, H 5.19%, N 28.9%, O 16.5%', 'tip: caffeine, no average oxidation numbers', JSON.stringify(t));
    t = tip('40% C, 6.7% H and 53.3% O');
    check(t.lines[0] === 'CH₂O' && row(t, 'Moles, to the least') === 'C 1 : H 2 : O 1', 'tip: composition of glucose', JSON.stringify(t));
    t = tip('sodium chloride');
    check(t.title === 'Sodium chloride' && t.lines[0] === 'NaCl' && row(t, 'Molar mass') === '58.44 g/mol', 'tip: sodium chloride', JSON.stringify(t));
    t = tip('iron (Fe)');
    check(t.title === 'Iron (Fe)' && t.lines[0] === '55.845 g/mol' && row(t, 'Atomic number') === '26', 'tip: iron', JSON.stringify(t));
    t = tip('element Tc');
    check(t.lines[0] === '[98] g/mol' && /No stable isotope/.test(t.note), 'tip: technetium, of no stable isotope', JSON.stringify(t));
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
