// Run with: node test/biology.test.js
// The biology of biology.js: sequences read, turned about and translated, open reading frames, masses, melting points
// by nearest neighbours, digests, proteins and the amino acids; crosses of genes and of the X, a cross of three genes
// mapped; drift, selection, predators and prey, diversity and life tables; Michaelis and Menten, Nernst and Goldman
'use strict';

var B = require('../js/biology.js'),
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
    return Math.abs(a - b) <= (tol || 1e-9) * Math.max(1, Math.abs(b));
}

// GFP's gene, which the examples use: its protein of 239 amino acids
var GFP = 'ATGGCTAGCAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGGTGATGTTAATGGGCACAAATTTTCTGTCAGTGGAGAGGGTGAAGGTGATGCTACATACGGAAAGCTTACCCTTAAATTTATTTGCACTACTGGAAAACTACCTGTTCC' +
    'ATGGCCAACACTTGTCACTACTTTCTCTTATGGTGTTCAATGCTTTTCCCGTTATCCGGATCACATGAAACGGCATGACTTTTTCAAGAGTGCCATGCCCGAAGGTTATGTACAGGAACGCACTATATCTTTCAAAGATGACGGGAACTACAAGACGCGTGCTGAAGTCAAG' +
    'TTTGAAGGTGATACCCTTGTTAATCGTATCGAGTTAAAAGGTATTGATTTTAAAGAAGATGGAAACATTCTCGGACACAAACTCGAGTACAACTATAACTCACACAATGTATACATCACGGCAGACAAACAAAAGAATGGAATCAAAGCTAACTTCAAAATTCGCCACAACATT' +
    'GAAGATGGATCCGTTCAACTAGCAGACCATTATCAACAAAATACTCCAATTGGCGATGGCCCTGTCCTTTTACCAGACAACCATTACCTGTCGACACAATCTGCCCTTTCGAAAGATCCCAACGAAAAGCGTGACCACATGGTCCTTCTTGAGTTTGTAACTGCTGCTGGGATTA' +
    'CACATGGCATGGATGAGCTCTACAAATAA';

// sequences as they are pasted: FASTA, numbers and spaces left out
var r = B.readSeq('>my gene\n1 atgc cgta\n9 ggu');
check(r.seq === 'ATGCCGTAGGU' && !r.rna && !r.bad.length, 'readSeq: FASTA, numbers and spaces', JSON.stringify(r));
check(B.readSeq('AUGGCU').rna, 'readSeq: RNA of U and no T');
check(B.readSeq('ATGXZ').bad.join() === 'X,Z', 'readSeq: the letters of no base', B.readSeq('ATGXZ').bad.join());
check(B.reverseComplement('ATGCCGTA') === 'TACGGCAT', 'reverse complement');
check(B.complement('ATGC') === 'TACG', 'complement');
check(near(B.composition('GGCCAT').gc, 4 / 6), 'GC content');

// the code
check(B.codon('AUG') === 'M' && B.codon('ATG') === 'M' && B.codon('UAA') === '*' && B.codon('UGG') === 'W' && B.codon('NNN') === 'X', 'codons');
check(B.codonsOf('*').join() === 'UAA,UAG,UGA', 'the stops', B.codonsOf('*').join());
check(B.codonsOf('L').length === 6 && B.codonsOf('M').length === 1, 'six codons of Leu, one of Met');
check(B.translate(GFP, 0) === 'MASKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKRHDFFKSAMPEGYVQERTISFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYITADKQKNGIKANFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK*',
    'GFP translated', B.translate(GFP, 0));
check(B.translate(B.reverseComplement('ATGAAATAG'), 0, true) === 'MK*', 'translated from the other strand');
var orfs = B.orfs(GFP, 25);
check(orfs[0].aa === 239 && orfs[0].frame === 1 && orfs[0].from === 1 && orfs[0].to === 720, 'the longest ORF of GFP', JSON.stringify(orfs[0]));
orfs = B.orfs(B.reverseComplement('CCATGAAATTTGGGTAACC'), 2);
check(orfs.length === 1 && orfs[0].frame < 0 && orfs[0].protein === 'MKFG', 'an ORF on the other strand', JSON.stringify(orfs));

// masses: of an oligo, of RNA, and by length as NEB has them
check(near(B.oligoMass('ATGC'), 1173.84, 1e-6), 'oligo mass', B.oligoMass('ATGC'));
check(near(B.lengthMass(0, 1000), 617996.04, 1e-9) && near(B.lengthMass(1, 100), 30915.02, 1e-9) && near(B.lengthMass(2, 100), 32165.02, 1e-9), 'masses by length');

// melting: M13's primers, by Wallace's rule and by nearest neighbours
var tm = B.meltingPoint('AGCGGATAACAATTTCACACAGGA', 50, 250, 0);
check(tm.wallace === 68 && near(tm.dH, -184.4, 1e-6), 'Wallace and ΔH of a primer', JSON.stringify(tm));
check(tm.nn > 54 && tm.nn < 60, 'its T_m by nearest neighbours', tm.nn);
check(B.meltingPoint('AGCGGATAACAATTTCACACAGGA', 50, 250, 2).nn > tm.nn, 'Mg²⁺ raises it');
check(B.meltingPoint('AGCGGATAACAATTTCACACAGGA', 50, 1000, 0).nn > tm.nn, 'and more primer');
check(isNaN(B.meltingPoint('AGCNGATAAC', 50, 250, 0).nn), 'none by nearest neighbours of a base not known');
check(B.meltingPoint('GAATTC', 50, 250, 0).self, 'a primer that pairs with itself whole');
var q = B.primerChecks('ACGTTTTTGCATGC');
check(q.run === 5 && q.clamp === 3 && q.dimer === 6, 'a primer\'s faults', JSON.stringify(q));

// digests
var d = B.digest('GAATTCAAAAGGATCCAAAAGAATTC', [B.enzyme('ecori'), B.enzyme('BamHI')], false);
check(d.fragments.join() === '1,10,10,5' && d.sites.EcoRI === 2 && d.sites.BamHI === 1, 'a linear digest', JSON.stringify(d));
check(B.digest('GAATTCAAAAGGATCCAAAAAAAA', [B.enzyme('EcoRI'), B.enzyme('BamHI')], true).fragments.join() === '10,14', 'a circle cut twice');
check(B.digest('AAAAAAAAAA', [B.enzyme('EcoRI')], true).fragments.join() === '10', 'a circle not cut');
check(B.digest('ATTCAAAAAAGA', [B.enzyme('EcoRI')], true).sites.EcoRI === 1, 'a site across the circle\'s join');
d = B.digest(GFP, B.enzymes, false);
check(['NheI', 'HindIII', 'BamHI', 'XhoI', 'NcoI', 'SalI', 'SacI', 'MluI'].every(function (e) { return d.sites[e] === 1; }) && d.sites.EcoRI === 0, 'GFP\'s single cutters');
check(B.enzyme('NotAnEnzyme') === null, 'an enzyme not known');

// proteins
var p = B.protein('MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG');
check(p.length === 76 && near(p.mass, 8564.8, 2e-4), 'ubiquitin\'s mass', p.mass);
check(p.eps[0] === 1490 && p.eps[1] === 1490, 'its extinction, one Tyr', p.eps.join());
check(p.pI > 6 && p.pI < 8, 'its pI', p.pI);
check(near(B.chargeAt(p.counts, p.pI), 0, 1e-6), 'no charge at the pI');
check(near(B.protein('WWC').eps[1], 11000, 1e-12) && B.protein('WWCC').eps[1] === 11125, 'cystines add to ε');
check(B.readProtein('>x\nmkv*').seq === 'MKV' && B.readProtein('MKB').bad.join() === 'B', 'readProtein');
check(B.hydropathy('IIIIIIIII', 9)[0][1] === 4.5 && B.hydropathy('IIIIIIIIII', 9).length === 2, 'hydropathy windows');
check(B.amino('his').one === 'H' && B.amino('H').three === 'His' && B.amino('Histidine').kind === 3 && B.amino('glutamic acid').one === 'E' && !B.amino('Xyz'), 'amino acids by name');
check(B.aminoAcids.length === 20 && B.aminoAcids.filter(function (a) { return a.essential; }).length === 9, 'twenty, nine essential');
var gly = B.amino('Gly');
check(near(B.titrationPH(gly, 0.5), 2.34, 1e-6) && near(B.titrationPH(gly, 1), 5.97, 1e-6) && near(B.titrationPH(gly, 1.5), 9.6, 1e-6), 'glycine\'s titration');

// crosses
var c = B.cross('AaBb', 'AaBb');
check(B.ratio(c.phenotypes.map(function (x) { return x[1]; })).join(':') === '9:3:3:1' && c.phenotypes[0][0] === 'A_B_' && c.phenotypes[3][0] === 'aabb', 'a dihybrid cross', JSON.stringify(c.phenotypes));
check(c.genotypes.length === 9 && c.total === 16 && c.grid.length === 4 && c.grid[0][0][0] === 'AABB', 'its genotypes and square');
check(B.ratio(B.cross('Aa', 'Aa', true).phenotypes.map(function (x) { return x[1]; })).join(':') === '1:2:1', 'incomplete dominance');
check(B.cross('AaBb', 'aabb').gametes[1].length === 1 && B.ratio(B.cross('AaBb', 'aabb').phenotypes.map(function (x) { return x[1]; })).join(':') === '1:1:1:1', 'a test cross');
check(B.cross('BbAa', 'AaBb').phenotypes.length === 4, 'genes in another order');
check(B.cross('AaBbCc', 'AaBbCc').phenotypes[0][1] / B.cross('AaBbCc', 'AaBbCc').total === 27 / 64, 'a trihybrid cross');
check(B.cross('Ab', 'Aa').error === 'pair' && B.cross('Aab', 'Aa').error === 'odd' && B.cross('AaAa', 'Aa').error === 'twice' && B.cross('Aa', 'Bb').error === 'genes', 'genotypes that are wrong');
var x = B.xCross('XAXa', 'XaY');
check(x.daughters.map(function (g) { return g[0] + ' ' + g[1]; }).join() === 'Aa dominant, a carrier,aa recessive' && x.sons.map(function (g) { return g[1]; }).join() === 'dominant,recessive', 'a cross of the X', JSON.stringify(x));
check(B.xCross('Aa', 'A').father === 'A' && B.xCross('XAY', 'XaY').error === 'mother' && B.xCross('XAXa', 'XbY').error === 'father', 'the X\'s alleles written short, and wrong');
var t = B.threePoint('ABC 390\nabc 374\nABc 27\nabC 30\nAbc 81\naBC 85\nAbC 5\naBc 8');
check(t.order[1] === 1 && near(t.d[0], 17.9) && near(t.d[1], 7) && near(t.coc, 13 / (0.179 * 0.07 * 1000), 1e-6), 'a cross of three genes mapped', JSON.stringify(t));
t = B.threePoint('+ cv ct 580\nv + + 592\nv cv + 45\n+ + ct 40\nv cv ct 89\n+ + + 94\nv + ct 3\n+ cv + 5');
check(t.names[t.order[1]] === 'ct' && near(t.d[0], 100 * 191 / 1448) && near(t.d[1], 100 * 93 / 1448) && t.total === 1448, 'with + for the wild type, ct in the middle', JSON.stringify(t));
check(B.threePoint('ABC 1').error === 'lines' && B.threePoint('ABC 390\nabc 374\nABc 27\nabC 30\nAbc 81\naBC 85\nAbC 5\nAbC 8').error === 'classes', 'a cross of three that is wrong');

// populations
var a = B.drift(20, 0.5, 50, 4, 7), b = B.drift(20, 0.5, 50, 4, 7);
check(a.length === 4 && a[0].length === 51 && JSON.stringify(a) === JSON.stringify(b), 'drift, the same of a seed');
check(JSON.stringify(B.drift(20, 0.5, 50, 4, 8)) !== JSON.stringify(a), 'and other of another');
check(a.every(function (path) { return path.every(function (v) { return v >= 0 && v <= 1; }); }), 'p stays from 0 to 1');
check(B.drift(5000, 0.3, 3, 1, 1)[0].every(function (v) { return Math.abs(v - 0.3) < 0.05; }), 'drift of a large population by the normal curve');
var s = B.selection(0.1, [1, 1, 0.8], 50);
check(s.length === 51 && s[50] > 0.1 && s.every(function (v, i) { return !i || v >= s[i - 1]; }), 'selection against aa raises p');
check(B.selection(0.3, [1, 1, 1], 10)[10] === 0.3, 'no selection, no change');
var lv = B.predators(40, 9, 0.1, 0.02, 0.4, 0.02, 200, 400);
check(lv.length === 401 && lv.every(function (row) { return row[1] > 0 && row[2] > 0; }), 'predators and prey stay above 0');
var still = B.predators(20, 5, 0.1, 0.02, 0.4, 0.02, 50, 100);
check(near(still[100][1], 20, 1e-6) && near(still[100][2], 5, 1e-6), 'at their balance they stay');
var dv = B.diversity([10, 10, 10, 10]);
check(dv.S === 4 && near(dv.lambda, 0.25) && near(dv.shannon, Math.log(4)) && near(dv.even, 1) && near(dv.simpson, 360 / 1560), 'diversity', JSON.stringify(dv));
var lt = B.lifeTable([1000, 800, 600, 200, 0]);
check(lt[0].join() === '0,1000,1,200,0.2,900,2100,2.1' && lt[4][4] === 1 || lt[4][1] === 0, 'a life table', JSON.stringify(lt));

// enzymes and membranes
var m = B.michaelis([[1, 10 / 3], [2, 5], [5, 50 / 7], [10, 25 / 3], [20, 100 / 11]]);
check(near(m.vmax, 10, 1e-6) && near(m.km, 2, 1e-6) && near(m.r2, 1, 1e-9), 'Michaelis and Menten fitted', JSON.stringify(m));
check(B.michaelis([[1, 1], [2, 2]]) === null, 'too few points to fit');
check(near(B.nernst(1, 5, 140, 37), -89.06, 1e-3) && near(B.nernst(1, 145, 12, 37), 66.56, 1e-3) && near(B.nernst(-1, 110, 10, 37), -64.08, 1e-3), 'Nernst', B.nernst(1, 5, 140, 37));
check(B.goldman([1, 0.05, 0.45], [5, 145, 110], [140, 15, 10], 37) < -60 && B.goldman([1, 0.05, 0.45], [5, 145, 110], [140, 15, 10], 37) > -75, 'Goldman, near −70 mV');
check(near(B.goldman([1, 0, 0], [5, 145, 110], [140, 15, 10], 37), B.nernst(1, 5, 140, 37), 1e-9), 'of K⁺ alone, Nernst\'s');

// alignment: BLOSUM62 the same both ways, the textbook's local alignment, and a gap in the middle of a global one
check(B.blosum.every(function (row, i) { return row.length === 20 && row.every(function (v, j) { return v === B.blosum[j][i]; }); }) && B.blosum[17][17] === 11 && B.blosum[4][4] === 9, 'BLOSUM62, symmetric');
var al = B.align('HEAGAWGHEE', 'PAWHEAE', { protein: true, local: true, open: 10, extend: 0.5 });
check(al.a === 'AWGHE' && al.b === 'AW-HE' && al.score === 18 && al.from.join() === '5,2' && al.to.join() === '9,5', 'a local alignment', JSON.stringify(al));
al = B.align('ACGTACGTTTGCA', 'ACGTACGTGCA', { open: 10, extend: 0.5 });
check(al.a === 'ACGTACGTTTGCA' && al.b.replace(/-/g, '') === 'ACGTACGTGCA' && al.gaps === 2 && al.same === 11 && al.score === 55 - 10.5, 'a global one, a gap of 2', JSON.stringify(al));
al = B.align('TTTTACGTACGT', 'ACGTACGT', { open: 10, extend: 0.5 });
check(al.score === 40 && al.b === '----ACGTACGT', 'its end gaps free', JSON.stringify(al));

// motifs, guides and primers
check(B.motif('GAATTCAAGAATTC', 'GAATTC').map(function (h) { return h.at; }).join() === '1,9', 'a palindrome found once at each place');
check(B.motif('AAACCCGGG', 'CCC').map(function (h) { return h.at + ':' + h.strand; }).join() === '4:1,7:-1', 'a motif on either strand');
check(B.motif('AGGTCA', 'RGGTYA').length === 1, 'IUPAC\'s codes');
var gd = B.guides('AAAAAAAAAAAAAAAAAAAAAAAAACGTACGTACGTACGTACGTAGGAAAAA', 0), top = gd.filter(function (g) { return g.strand === 1 && g.pam === 'AGG'; })[0];
check(top && top.guide === 'AAAACGTACGTACGTACGTACGT'.slice(-20) && top.cut === top.from - 1 + 17, 'a Cas9 guide before NGG, cut 3 bases from it', JSON.stringify(top));
gd = B.guides(B.reverseComplement('AAAAAAAAAAAAAAAAAAAAAAAAACGTACGTACGTACGTACGTAGGAAAAA'), 0).filter(function (g) { return g.pam === 'AGG'; })[0];
check(gd && gd.strand === -1 && gd.to - gd.from === 19 && gd.cut === 52 - top.cut, 'and on the other strand', JSON.stringify(gd));
var mu = B.mutagenesis('ATGGCTAGCAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGGTGATGTTAATGGGC', 30, 'G');
check(mu.sure && mu.tm >= 78 && mu.forward.length >= 25 && mu.forward.length <= 45 && mu.mismatched === 1 && mu.reverse === B.reverseComplement(mu.forward) && mu.forward.charAt(30 - mu.from) === 'G', 'a mutagenic primer', JSON.stringify(mu));
check(near(B.quikTm('GGAGAAGAACTTTTCACGGGAGTTGTCCCAATTC', 1), 81.5 + 41 * 16 / 34 - 675 / 34 - 100 / 34, 1e-9), 'QuikChange\'s T_m');
var gb = B.gibson('ATGGCTAGCAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGG', 'GGTGATGTTAATGGGCACAAATTTTCTGTCAGTGGAGAGGGTGAAGGTG', 30, 60);
check(gb.overlap.length === 30 && gb.forward.indexOf(gb.overlap) === 0 && B.reverseComplement(gb.reverse).slice(-30) === gb.overlap && gb.tms[0] >= 60 && gb.tms[1] >= 60, 'Gibson primers', JSON.stringify(gb));

// a dose and its response
var p4 = [0, 100, Math.log10(2.5), -1.2], dr = B.doseFit([0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100].map(function (c) { return [c, B.logistic4(p4, c)]; }));
check(near(dr.ec50, 2.5, 1e-6) && near(dr.hill, -1.2, 1e-6) && near(dr.bottom, 0, 1e-6) && near(dr.top, 100, 1e-6), 'the four-parameter logistic fitted', JSON.stringify(dr));
dr = B.doseFit([[1e-9, 2], [1e-8, 8], [1e-7, 30], [1e-6, 72], [1e-5, 95], [1e-4, 99]], [0, 100]);
check(dr.ec50 > 1e-7 && dr.ec50 < 1e-6 && dr.hill > 0, 'a rising one, its ends held', JSON.stringify(dr));
check(B.doseFit([[1, 1], [2, 2]]) === null, 'too few to fit');
check(B.solve([[2, 1], [1, 3]], [3, 5]).map(function (x) { return +x.toFixed(9); }).join() === '0.8,1.4', 'equations solved');

// evolution: Jukes and Cantor, Kimura, and the trees of Wikipedia's examples
check(near(B.jukesCantor(0.1), 0.107325632731, 1e-9) && isNaN(B.jukesCantor(0.8)), 'Jukes and Cantor');
var ds = B.distance('ACGTACGTAC', 'ACGTATGCAC');
check(ds.sites === 10 && ds.transitions === 2 && ds.transversions === 0 && near(ds.p, 0.2), 'transitions and transversions', JSON.stringify(ds));
check(B.newick(B.tree(['a', 'b', 'c', 'd', 'e'], [[0, 5, 9, 9, 8], [5, 0, 10, 10, 9], [9, 10, 0, 8, 7], [9, 10, 8, 0, 3], [8, 9, 7, 3, 0]], true)) === '((c:4,(a:2,b:3):3):1,(d:2,e:1):1);', 'neighbour joining');
check(B.newick(B.tree(['a', 'b', 'c', 'd', 'e'], [[0, 17, 21, 31, 23], [17, 0, 30, 34, 21], [21, 30, 0, 28, 39], [31, 34, 28, 0, 43], [23, 21, 39, 43, 0]])) === '((e:11,(a:8.5,b:8.5):2.5):5.5,(c:14,d:14):2.5);', 'UPGMA');

// populations: Leslie, competition, rarefaction, an epidemic
var ls = B.leslie([0, 1.5, 2, 0.5], [0.5, 0.8, 0.6], [100, 50, 30, 10], 30);
check(near(ls.R0, 0.5 * 1.5 + 0.4 * 2 + 0.24 * 0.5) && near(ls.stable.reduce(function (s, x) { return s + x; }, 0), 1) && near(ls.path[30].reduce(function (s, x) { return s + x; }, 0) / ls.path[29].reduce(function (s, x) { return s + x; }, 0), ls.lambda, 1e-4), 'Leslie\'s λ, R₀ and stable ages', JSON.stringify(ls.stable));
check(B.competitionEnd(100, 80, 0.5, 0.6).kind === 0 && near(B.competitionEnd(100, 80, 0.5, 0.6).n1, 60 / 0.7) && B.competitionEnd(100, 80, 1.5, 0.6).kind === 2 && B.competitionEnd(100, 80, 0.5, 1.5).kind === 1 &&
    B.competitionEnd(100, 100, 1.5, 1.5).kind === -1, 'how competition ends');
var cp = B.competition(10, 10, 0.5, 0.4, 100, 80, 0.5, 0.6, 200, 100);
check(near(cp[100][1], 60 / 0.7, 1e-3) && near(cp[100][2], 20 / 0.7, 1e-3), 'and gets there');
check(near(B.lnGamma(5), Math.log(24), 1e-12) && B.rarefy([25, 18, 12, 6, 3, 1], 65) === 6 && near(B.rarefy([1, 1], 1), 1) && B.chao1([5, 1, 1, 2, 3, 1]) === 7.5, 'rarefaction and Chao1');
var ep = B.sir(10000, 10, 2.5, 7, 0, 300, 300);
check(near(ep.total / 10000, 0.8926, 1e-3) && ep.peak > 2000 && ep.peak < 2500, 'an epidemic, its final size', JSON.stringify([ep.total, ep.peak, ep.at]));
check(B.sir(10000, 10, 2.5, 7, 0.7, 300, 300).peak <= 10 + 1e-9, 'none past the herd\'s immunity, at 1 − 1/R₀');

// the body
var hh = B.hodgkinHuxley(10, 5, 1, 30, 6.3), top2 = Math.max.apply(null, hh.map(function (q) { return q[1]; }));
check(top2 > 30 && top2 < 50 && Math.max.apply(null, B.hodgkinHuxley(2, 5, 1, 30, 6.3).map(function (q) { return q[1]; })) < -55, 'an action potential above threshold, none below', top2);
check(near(B.p50(7.4, 37, 40), 26.8) && B.p50(7.2, 37, 40) > 26.8 && B.p50(7.4, 40, 40) > 26.8 && near(B.saturation(26.8, 26.8), 0.5, 1e-3) && B.saturation(100, 26.8) > 0.97 &&
    near(B.saturation(2.8, 2.8, true), 0.5), 'the Bohr shift and saturation');
check(near(B.egfr(0.7, 50, true), 142 * Math.pow(0.9938, 50) * 1.012) && near(B.egfr(1.8, 50, false), 142 * Math.pow(2, -1.2) * Math.pow(0.9938, 50)), 'eGFR by CKD-EPI 2021');
check(near(B.drugLevel(400, 40, 4, 1e9, 1, 4, false), 5) && near(B.drugLevel(400, 40, 4, 4, 2, 4, false), 15), 'a drug\'s level after doses');

// crosses of two genes, and blood groups
check(B.epistasis.every(function (e) {
    var counts = e[1].map(function () { return 0; });
    [9, 3, 3, 1].forEach(function (n, c) { counts[e[2][c]] += n; });
    return counts.join() === e[1].join() && e[3].length === e[1].length;
}), 'each ratio of epistasis made of 9:3:3:1');
check(B.classOf('AaBb') === 0 && B.classOf('Aabb') === 1 && B.classOf('aaBB') === 2 && B.classOf('aabb') === 3, 'the classes of two genes');
var bl = B.bloodCross('AO', 'BO', 'Dd', 'dd');
check(bl.abo.length === 4 && bl.abo.every(function (g) { return g[1] === 0.25; }) && bl.both.length === 8 && B.bloodCross('AB', 'OO', 'DD', 'dd').both.map(function (g) { return g[0]; }).sort().join() === 'A+,B+', 'blood groups');
check(B.isotopes.length > 8 && B.buffers.every(function (b) { return b[1] > 3 && b[1] < 11; }) && B.genomes[0][1] === 3.1e9, 'the tables');

console.log(checks + ' checks, ' + failures + ' failed');
if (failures) process.exitCode = 1;
