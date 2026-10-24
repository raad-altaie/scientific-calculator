// Run with: node test/page-biology.test.js
// The biology of a page's text the icons go after (page/biology.js): sequences of DNA and RNA, primers, crosses of
// genes and of the X; what biology.js makes sure of, what is selected, FASTA and proteins too, and what their tips say.
// And what looks like biology and is not: words, sizes, capitals, runs of one base
'use strict';

var BioPage = require('../js/page/biology.js'),
    PageMaths = require('../js/page/answers.js'),
    Biology = require('../js/biology.js'),
    failures = 0,
    checks = 0;

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

// what is found in a text and made sure of by biology.js: its text, kind and boxes
function found(text, lettered) {
    return BioPage.find(text, lettered).filter(function (c) { return BioPage.check(c, Biology); }).map(function (c) {
        return c.text + ' | ' + c.kind + ' | ' + JSON.stringify(c.fields);
    });
}

var GFP = 'ATGGCTAGCAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGGTGATGTTAATGGGCACAAATTTTCTGTCAGTGGAGAGG';

// each is found whole, of its kind, with the boxes of its card
[
    ['The primer 5′-AGCGGATAACAATTTCACACAGGA-3′ anneals.', '5′-AGCGGATAACAATTTCACACAGGA-3′ | oligo | {"a":"AGCGGATAACAATTTCACACAGGA"}'],
    ['M13 forward: GTAAAACGACGGCCAGT', 'GTAAAACGACGGCCAGT | oligo | {"a":"GTAAAACGACGGCCAGT"}'],
    ['GenBank writes it in tens: atggctagca aaggagaaga acttttcact', 'atggctagca aaggagaaga acttttcact | oligo | {"a":"ATGGCTAGCAAAGGAGAAGAACTTTTCACT"}'],
    ['Its start: ' + GFP + '.', GFP + ' | sequence | {"s":"' + GFP + '"}'],
    ['mRNA: AUGGCCAUUGUAAUGGGCCGCUGAAAGGGUGCCCGAUAG', 'AUGGCCAUUGUAAUGGGCCGCUGAAAGGGUGCCCGAUAG | sequence | {"s":"AUGGCCAUUGUAAUGGGCCGCUGAAAGGGUGCCCGAUAG"}'],
    ['A dihybrid cross: AaBb × AaBb gives 9:3:3:1.', 'AaBb × AaBb | cross | {"p1":"AaBb","p2":"AaBb","dom":"0"}'],
    ['A test cross, Tt x tt', 'Tt x tt | cross | {"p1":"Tt","p2":"tt","dom":"0"}'],
    ['True-breeding parents: AA × aa', 'AA × aa | cross | {"p1":"AA","p2":"aa","dom":"0"}'],
    ['Colour blindness: XAXa × XaY', 'XAXa × XaY | xcross | {"m":"XAXa","f":"XaY"}'],
    ['Raised: XᴬXᵃ × XᵃY', 'XᴬXᵃ × XᵃY | xcross | {"m":"XAXa","f":"XaY"}'],
    ['The father first: XaY × XAXa', 'XaY × XAXa | xcross | {"m":"XAXa","f":"XaY"}'],
    ['Typed: X^H X^h × X^h Y', 'X^H X^h × X^h Y | xcross | {"m":"XHXh","f":"XhY"}'],
    ['A capital X between: XAXa X XaY', 'XAXa X XaY | xcross | {"m":"XAXa","f":"XaY"}']
].forEach(function (c) {
    var got = found(c[0]);
    check(got.length === 1 && got[0] === c[1], 'found: ' + c[0], got.join(' || '));
});

// the letters of a <sup>, as answers.js reads them: the line with a mark for each, and lettered with them in it
(function () {
    var got = found('X\u0001X\u0001 × X\u0001Y', 'XHXh × XhY');
    check(got.length === 1 && got[0] === 'XHXh × XhY | xcross | {"m":"XHXh","f":"XhY"}', 'found: X<sup>H</sup>X<sup>h</sup> × X<sup>h</sup>Y', got.join(' || '));
})();

// what looks like biology and is not: genes that do not pair, sizes, capitals, short runs, one base, N alone, words
[
    'AA x BB, a 2 x 4 board, XX x YY, AA x AA, Ab × Ab, go x go, in mm x mm',
    'ACCTGGTTGGCCAA is 14 bases; GATTACA',
    'GGGGGGGGGGGGGGGGGGGG, NNNNNNNNNNNNNNNNNNNNNN, ATATATATATATATATATAT',
    'ACGTUACGTUACGTUACGTU: both T and U',
    'Mixed case: AcGtAcGtAcGtAcGtAcGt',
    'WHAT A CATCHY HEADLINE, a cat, attaccata'
].forEach(function (text) {
    var got = found(text);
    check(!got.length, 'none: ' + text, got.join(' || '));
});

// selected alone: a sequence of 10 bases or more, FASTA too; a protein in capitals; a cross
[
    ['>seq1\nATGCATGCAA\nGGCCTTAA', 'oligo', '{"a":"ATGCATGCAAGGCCTTAA"}'], ['atgcatgcaa', 'oligo', '{"a":"ATGCATGCAA"}'],
    ['1 atggctagca aaggagaaga acttttcact ggagttgtcc caattcttgt', 'sequence', '{"s":"ATGGCTAGCAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGT"}'],
    ['MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG', 'protein', null],
    ['MQIFVKTLTG KTITLEVEPS DTIENVKAKI', 'protein', '{"s":"MQIFVKTLTGKTITLEVEPSDTIENVKAKI"}'], ['Aa × aa', 'cross', '{"p1":"Aa","p2":"aa","dom":"0"}'],
    ['THIS IS A HEADLINE THAT SHOUTS', null], ['GATTACA GATTACA', null], ['Gattaca Gattaca Gattaca', null], ['ACGT', null], ['hello world', null]
].forEach(function (c) {
    var got = BioPage.picked(c[0]);
    check((got ? got.kind : null) === c[1] && (!got || ((c[2] === null || JSON.stringify(got.fields) === c[2]) && BioPage.check(got, Biology))),
        'picked: ' + c[0].slice(0, 40), got && got.kind + ' ' + JSON.stringify(got.fields));
});

// selected on a page: the biology before the maths, a sum still a sum
(function () {
    [['AaBb × AaBb', 'cross'], ['GTAAAACGACGGCCAGT', 'oligo'], ['XAXa × XaY', 'xcross'], ['12 × 7 + 3', 'sum'], ['2 × 3', 'sum'], ['hello world', null]].forEach(function (c) {
        var got = PageMaths.selected(c[0], 'mdy');
        check((got ? got.kind : null) === c[1], 'selected: ' + c[0], got && got.kind);
    });
})();

// the tips, worked out by biology.js
(function () {
    var tip = function (text) { var c = BioPage.find(text)[0] || BioPage.picked(text); return BioPage.tip(c, Biology); };
    var row = function (t, name) { return (t.rows.filter(function (r) { return r[0] === name; })[0] || [])[1]; };
    var t = tip('AGCGGATAACAATTTCACACAGGA');
    check(t.title === '5′ AGCGGATAACAATTTCACACAGGA 3′' && /^Tₘ \d+(\.\d)? °C$/.test(t.lines[0]) && row(t, 'Length') === '24 bases' && row(t, 'GC') === '41.7%' &&
        row(t, 'Wallace') === '68 °C' && row(t, 'Reverse complement') === 'TCCTGTGTGAAATTGTTATCCGCT', 'tip: a primer', JSON.stringify(t));
    t = tip(GFP);
    check(t.title === 'DNA, 100 bases' && /^GC \d/.test(t.lines[0]) && /^A \d+, C \d+, G \d+, T \d+$/.test(row(t, 'Bases')) && /g\/mol$/.test(row(t, 'Mass, one strand')), 'tip: DNA', JSON.stringify(t));
    t = tip('AUGGCCAUUGUAAUGGGCCGCUGAAAGGGUGCCCGAUAG');
    check(t.title === 'RNA, 39 nt' && /, U \d+$/.test(row(t, 'Bases')) && !/T/.test(row(t, 'Reverse complement')), 'tip: RNA, its complement of U', JSON.stringify(t));
    t = tip('AaBb × AaBb');
    check(t.lines[0] === '9 : 3 : 3 : 1' && row(t, 'Phenotypes') === 'A_B_ : A_bb : aaB_ : aabb' && row(t, 'Genotypes') === '9 kinds' &&
        row(t, 'Gametes') === 'AB, Ab, aB, ab × AB, Ab, aB, ab', 'tip: a dihybrid cross', JSON.stringify(t));
    t = tip('Aa × Aa');
    check(t.lines[0] === '3 : 1' && row(t, 'Genotypes') === 'AA : Aa : aa, 1 : 2 : 1', 'tip: a monohybrid cross', JSON.stringify(t));
    t = tip('AA × aa');
    check(t.lines[0] === 'All A_', 'tip: all of one phenotype', JSON.stringify(t));
    t = tip('XAXa × XaY');
    check(t.title === 'XᴬXᵃ × XᵃY' && t.lines[0] === '50% of the children show it' && row(t, 'Sons showing it') === '50%' && row(t, 'Daughters carriers') === '50%', 'tip: a cross of the X', JSON.stringify(t));
    t = tip('XAXa × XAY');
    check(t.lines[0] === '25% of the children show it' && row(t, 'Daughters showing it') === '0%', 'tip: a carrier and a father free of it', JSON.stringify(t));
    t = tip('MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG');
    check(t.title === 'Protein, 76 aa' && t.lines[0] === '8.565 kDa' && row(t, 'ε₂₈₀') === '1,490 M⁻¹cm⁻¹', 'tip: ubiquitin', JSON.stringify(t));
})();

console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
