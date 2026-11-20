// The panel of biology: genetics, DNA, proteins, the lab, cells and ecology, each a card with its drawing, over the
// keys or in a window of its own. biology.js is the biology itself; this is how the calculator shows it. Made by
// main.js as it starts, CalcBioPanel(app, shared): app is what the panel takes from the rest of the calculator, its
// words, the drawings every panel draws with and the like, those that change read as they are now; shared is
// filled with what the calculator takes from the panel, before the panel starts
(function (global) {
    'use strict';

    global.CalcBioPanel = function (app, shared) {
        var bioButton = app.bioButton, bioPanel = app.bioPanel, countDrawing = app.countDrawing, densityOf = app.densityOf,
            drawnTile = app.drawnTile, engine = app.engine, escaped = app.escaped, fix = app.fix, graphDrawing = app.graphDrawing,
            labelBars = app.labelBars, local = app.local, physNone = app.physNone, physRows = app.physRows, shortNum = app.shortNum,
            stackDrawing = app.stackDrawing, svgArrow = app.svgArrow, svgOf = app.svgOf, svgText = app.svgText, toolPanel = app.toolPanel,
            toolPanels = app.toolPanels, tr = app.tr;

        // what the calculator takes from the panel
        Object.defineProperties(shared, Object.getOwnPropertyDescriptors({
            get bio() { return bio; },
            get BIO_TOOLS() { return BIO_TOOLS; },
            showBio: showBio
        }));

            // ---------------- biology ---------------- //

            // The Biology panel (biology.js), on tabs of genetics, DNA, proteins, the lab, cells and ecology: a card for each tool, as
            // the physics has. A sequence is pasted as it comes, FASTA too; a genotype is typed as it is written, AaBb. Most cards
            // draw what they work out
            var R_BAR = 0.0831446, // L·bar/(K·mol), of water potential
                // GFP's gene, as the examples' sequence: its protein of 239 amino acids, cut once by NheI, HindIII, BamHI and more
                GFP = 'ATGGCTAGCAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGGTGATGTTAATGGGCACAAATTTTCTGTCAGTGGAGAGGGTGAAGGTGATGCTACATACGGAAAGCTTACCCTTAAATTTATTTGCACTACTGGAAAACTACCTGTTCC' +
                    'ATGGCCAACACTTGTCACTACTTTCTCTTATGGTGTTCAATGCTTTTCCCGTTATCCGGATCACATGAAACGGCATGACTTTTTCAAGAGTGCCATGCCCGAAGGTTATGTACAGGAACGCACTATATCTTTCAAAGATGACGGGAACTACAAGACGCGTGCTGAAGTCAAG' +
                    'TTTGAAGGTGATACCCTTGTTAATCGTATCGAGTTAAAAGGTATTGATTTTAAAGAAGATGGAAACATTCTCGGACACAAACTCGAGTACAACTATAACTCACACAATGTATACATCACGGCAGACAAACAAAAGAATGGAATCAAAGCTAACTTCAAAATTCGCCACAACATT' +
                    'GAAGATGGATCCGTTCAACTAGCAGACCATTATCAACAAAATACTCCAATTGGCGATGGCCCTGTCCTTTTACCAGACAACCATTACCTGTCGACACAATCTGCCCTTTCGAAAGATCCCAACGAAAAGCGTGACCACATGGTCCTTCTTGAGTTTGTAACTGCTGCTGGGATTA' +
                    'CACATGGCATGGATGAGCTCTACAAATAA',
                UBIQUITIN = 'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG',
                // the colours of the bases, and of the kinds of amino acid, nonpolar, aromatic, polar, basic and acidic, and of a stop
                BASE_COLOURS = { A: '#5b9a54', T: '#c0484f', U: '#c0484f', G: '#d9a43b', C: '#3f78b4', other: '#9aa7a0' },
                KIND_TINTS = ['#f2e2b8', '#e1d6ef', '#d3e5da', '#cfdcf0', '#f3d3d7'], STOP_TINT = '#c3cbc6',
                // the phenotypes of a cross, each its own
                LIGHT_TINTS = ['#d3e5da', '#f2e2b8', '#cfdcf0', '#f3d3d7', '#e1d6ef', '#cfe8ec', '#f2dccb', '#e2e8c8'],
                GENE_ERRORS = {
                    empty: 'Type both parents\' genotypes.', odd: 'Two letters to a gene, as Aa or AaBb.', pair: 'A gene\'s two letters are one letter, as Aa, not Ab.',
                    twice: 'Each gene once.', genes: 'Both parents of the same genes.', many: 'Up to 6 genes.'
                },
                // the ions of the Nernst card, and their charge; a stain's or a solute's particles in water
                IONS = [['K⁺', 1, 5, 140], ['Na⁺', 1, 145, 12], ['Cl⁻', -1, 110, 10], ['Ca²⁺', 2, 2.5, 0.0001]],
                SOLUTES = [['NaCl', 2], ['Glucose', 1], ['Sucrose', 1], ['KCl', 2], ['CaCl₂', 3], ['Other', NaN]],
                bioSeed = 1, // of the drift's random numbers, new as Again is pressed
                // the alignments' examples: GFP's start with three bases changed and two codons gone, and yeast's ubiquitin, three amino acids from ours
                GFP_VARIANT = GFP.slice(0, 29) + 'C' + GFP.slice(30, 74) + 'A' + GFP.slice(75, 96) + GFP.slice(102, 119) + 'A' + GFP.slice(120, 150),
                UBIQUITIN_YEAST = 'MQIFVKTLTGKTITLEVESSDTIDNVKSKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG',
                ABO = ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'], RH = ['DD', 'Dd', 'dd'],
                // plates and flasks: name, wells, each one's area, cm², and its medium, mL
                PLATES = [['6-well', 6, 9.5, 2], ['12-well', 12, 3.8, 1], ['24-well', 24, 1.9, 0.5], ['48-well', 48, 0.95, 0.3], ['96-well', 96, 0.32, 0.1], ['T25 flask', 1, 25, 5],
                    ['T75 flask', 1, 75, 15], ['10 cm dish', 1, 55, 10]],
                ACTIVITY = [1.2, 1.375, 1.55, 1.725, 1.9],
                GUIDE_FLAGS = { lowgc: 'GC below 40%', highgc: 'GC above 80%', tttt: 'TTTT ends a U6 transcript', run: 'a run of 5 of a base', seed: 'its seed is elsewhere in it' },
                // the trees' examples: distances of the apes' mitochondria, about, and five sequences aligned
                TREE_DIST = 'Human 0 0.095 0.113 0.183 0.212\nChimp 0.095 0 0.118 0.186 0.215\nGorilla 0.113 0.118 0 0.187 0.212\nOrangutan 0.183 0.186 0.187 0 0.222\nGibbon 0.212 0.215 0.212 0.222 0',
                TREE_SEQS = 'Alpha ACGTTAGCCTAGGCATCGATCGGATACGTTAGCAATCGGA\nBeta ACGTTAGCCTAGGCATCGTTCGGATACGTTAGCAATCGGA\nGamma ACGATAGCCTAGGCTTCGATCGGATACGTCAGCAATCGGA\n' +
                    'Delta ACGATAGCATAGGCTTCGATCGCATACGTCAGCATTCGGA\nEpsilon TCGATAGCATAGACTTCGATCGCATACATCAGCATTCGTA',
                BIO_TOOLS = {
                    genetics: [
                        { id: 'punnett', t: 'Punnett square', f: ['Aa × Aa', '9 : 3 : 3 : 1'], d: 'The offspring of two parents, of one gene or up to six: each genotype typed as it is written, Aa or AaBbCc, ' +
                            'a capital for the dominant allele. Their gametes, the square drawn and coloured by phenotype, and the ratios of the phenotypes and genotypes, drawn. ' +
                            'Incomplete: a capital and a small letter show between the two, as red and white snapdragons give pink.',
                            fields: [{ k: 'p1', l: 'Parent 1', ph: 'AaBb', text: true }, { k: 'p2', l: 'Parent 2', ph: 'AaBb', text: true }, { k: 'dom', l: 'Dominance', choice: ['Complete', 'Incomplete'] }],
                            cols: 2, run: runPunnett, example: function (raw) { return { p1: 'AaBb', p2: 'AaBb', dom: raw.dom || '0' }; } },
                        { id: 'xlinked', t: 'Sex-linked cross', f: 'X<sup>A</sup>X<sup>a</sup> × X<sup>a</sup>Y', d: 'A gene on the X chromosome, as of colour blindness or haemophilia: the mother\'s two alleles, ' +
                            'as XAXa, and the father\'s one, as XaY; the square drawn, and the chances of each phenotype among the daughters, among the sons and of all the children.',
                            fields: [{ k: 'm', l: 'Mother', ph: 'XAXa', text: true }, { k: 'f', l: 'Father', ph: 'XaY', text: true }], cols: 2, run: runXCross, example: { m: 'XAXa', f: 'XaY' } },
                        { id: 'hardy', t: 'Hardy–Weinberg', f: ['p + q = 1', 'p<sup>2</sup> + 2pq + q<sup>2</sup> = 1'], d: 'A gene of two alleles in a population mating at random: of p, the frequency of the dominant allele; ' +
                            'of the counts of the three genotypes, with a χ² test of whether they are at equilibrium; or of how many show the recessive trait, as 1/2500, ' +
                            'how many are carriers. Its three curves drawn, p², 2pq and q².',
                            fields: function (raw) {
                                var by = +raw.by || 0;
                                return [{ k: 'by', l: 'Of', choice: ['p', 'Counts', 'Recessive'] }].concat(by === 1 ? [{ k: 'AA', l: 'AA', ph: '490' }, { k: 'Aa', l: 'Aa', ph: '420' }, { k: 'aa', l: 'aa', ph: '90' }] :
                                    by === 2 ? [{ k: 'q2', l: 'q<sup>2</sup>', ph: '1/2500', name: 'q²' }, { k: 'N', l: 'People', ph: 'optional', name: 'People' }] :
                                        [{ k: 'p', l: 'p', ph: '0.7' }, { k: 'N', l: 'People', ph: 'optional', name: 'People' }]);
                            }, cols: 3, run: runHardy,
                            example: function (raw) { return Object.assign({ by: raw.by || '0' }, [{ p: '0.7', N: '1000' }, { AA: '490', Aa: '420', aa: '90' }, { q2: '1/2500', N: '100000' }][+raw.by || 0]); } },
                        { id: 'chicross', t: 'χ² of a cross', f: 'χ<sup>2</sup> = Σ(o – e)<sup>2</sup> ÷ e', d: 'Whether the counts of offspring fit the ratio a cross predicts, as 9:3:3:1 or 3:1, by χ²: its value, ' +
                            'the degrees of freedom, P and the critical value at the level α; the counts drawn beside those expected, and where χ² falls. No ratio, each the same.',
                            fields: [{ k: 'o', l: 'Observed', ph: '315 108 101 32', text: true, cls: 'calc-sv-wide' }, { k: 'r', l: 'Ratio', ph: '9:3:3:1', text: true }, { k: 'a', l: 'α', ph: '0.05', def: 0.05, name: 'α' }],
                            cols: 2, spaces: ['o'], run: runChiCross, example: { o: '315 108 101 32', r: '9:3:3:1' } },
                        { id: 'linkage', t: 'Gene mapping', f: ['RF = recombinants ÷ total', '1% = 1 cM'], d: 'How far apart genes are on a chromosome, from a test cross. Of two genes, the counts of the two parental ' +
                            'classes and the two recombinant: the recombination frequency and the map distance. Of three, the eight classes with their counts, a line each, ABC 390 or + b + 27: ' +
                            'the gene in the middle, found by the rarest two, the double crossovers; each distance, the coincidence and the interference. The chromosome drawn.',
                            fields: function (raw) {
                                return [{ k: 'n', l: 'Genes', choice: ['Two', 'Three'] }].concat(raw.n === '1' ? [{ k: 'c', l: 'Classes', ph: 'ABC 390&#10;abc 374&#10;ABc 27&#10;…', area: true }] :
                                    [{ k: 'p1', l: 'Parental 1', ph: '420' }, { k: 'p2', l: 'Parental 2', ph: '410' }, { k: 'r1', l: 'Recombinant 1', ph: '85' }, { k: 'r2', l: 'Recombinant 2', ph: '85' }]);
                            }, cols: 2, run: runLinkage,
                            example: function (raw) { return raw.n === '1' ? { n: '1', c: 'ABC 390\nabc 374\nABc 27\nabC 30\nAbc 81\naBC 85\nAbC 5\naBc 8' } : { n: '0', p1: '420', p2: '410', r1: '85', r2: '85' }; } },
                        { id: 'children', t: 'Chances of offspring', f: 'P = <sub>n</sub>C<sub>k</sub> p<sup>k</sup>(1 – p)<sup>n – k</sup>', d: 'Of n children, each with the chance p of a trait, as ¼ of two carriers: ' +
                            'the chance that exactly k have it, at least k and at most k, and that none or all do; the chance of each count drawn.',
                            fields: [{ k: 'p', l: 'p', ph: '1/4' }, { k: 'n', l: 'n', ph: '4' }, { k: 'k', l: 'k', ph: '1' }], cols: 3, run: runChildren, example: { p: '1/4', n: '4', k: '1' } },
                        { id: 'heritability', t: 'Heritability', f: ['h<sup>2</sup> = V<sub>A</sub> ÷ V<sub>P</sub>', 'R = h<sup>2</sup>S'], d: 'The breeder\'s equation: of h², or of the additive variance V<sub>A</sub> and all of it, ' +
                            'V<sub>P</sub>, and the means of the population and of the parents chosen, the selection differential S and the response R, how far the next generation\'s mean moves; ' +
                            'the population, those chosen and their offspring drawn.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['h²', 'Variances'] }].concat(raw.by === '1' ? [{ k: 'va', l: 'V<sub>A</sub>', ph: '20', name: 'VA' }, { k: 'vp', l: 'V<sub>P</sub>', ph: '50', name: 'VP' }] :
                                    [{ k: 'h', l: 'h<sup>2</sup>', ph: '0.4', name: 'h²' }, { k: 'vp', l: 'V<sub>P</sub>', ph: 'optional', name: 'VP' }], [{ k: 'm', l: 'Mean', ph: '100' }, { k: 'ms', l: 'Chosen', ph: '120' }]);
                            }, cols: 2, run: runHeritability,
                            example: function (raw) { return Object.assign({ by: raw.by || '0', m: '100', ms: '120' }, raw.by === '1' ? { va: '20', vp: '50' } : { h: '0.4', vp: '50' }); } },
                        { id: 'epistasis', t: 'Epistasis', f: ['9 : 3 : 4', '12 : 3 : 1', '9 : 7'], d: 'Two genes, one hiding or changing what the other shows, in a cross of AaBb × AaBb: the ratio of its kind, ' +
                            'its Punnett square coloured by phenotype, and an example. With the counts of the offspring, a χ² test of the ratio, and of every kind the one that fits best.',
                            fields: [{ k: 'kind', l: 'Kind', choice: CalcBiology.epistasis.map(function (e) { return e[0] + ', ' + e[1].join(':'); }) },
                                { k: 'o', l: 'Counts', ph: 'optional, 89 28 43', text: true, cls: 'calc-sv-wide', aria: 'Counts' }], cols: 1, spaces: ['o'], run: runEpistasis },
                        { id: 'counsel', t: 'Genetic risk', f: ['2/3 a carrier', 'Bayes'], d: 'The chance someone carries a gene, and that their child has it, as genetic counselling works it out, ' +
                            'the family drawn. Recessive: a brother or sister of one with it, 2/3 a carrier, a parent of one, or someone of no family with it, by how common it is, as 1/2500, and their partner ' +
                            'by the same. Of the X: a woman, her chance at first, ½ of a carrier\'s daughter, and her sons free of it, by Bayes. Dominant: a child of one with it, free of it yet, by its penetrance.',
                            fields: function (raw) {
                                var of = +raw.of || 0;
                                return [{ k: 'of', l: 'Gene', choice: ['Recessive', 'Of the X', 'Dominant'] }].concat(of === 1 ? [{ k: 'prior', l: 'Chance at first', ph: '1/2', def: 0.5, name: 'Chance at first' },
                                    { k: 'sons', l: 'Sons free of it', ph: '0', def: 0, name: 'Sons free of it' }] : of === 2 ? [{ k: 'pen', l: 'Penetrance, %', ph: '100', def: 100, name: 'Penetrance' }] :
                                    [{ k: 'who', l: 'They are', choice: ['A sibling of one with it', 'A parent of one with it', 'Of no family with it'] }, { k: 'q2', l: 'Has it, of all', ph: '1/2500', name: 'Has it' }]);
                            }, cols: 2, run: runCounsel,
                            example: function (raw) { return Object.assign({ of: raw.of || '0' }, [{ who: raw.who || '0', q2: '1/2500' }, { prior: '1/2', sons: '2' }, { pen: '80' }][+raw.of || 0]); } },
                        { id: 'blood', t: 'Blood groups', f: ['I<sup>A</sup>, I<sup>B</sup>, i', 'Rh: D, d'], d: 'The ABO and Rh blood groups of two parents\' children, of each parent\'s genotypes: the children\'s groups ' +
                            'and the chance of each, drawn, with the square of ABO; and the red cells each group can take.',
                            fields: [{ k: 'a', l: 'Parent 1, ABO', choice: ['AA, A', 'AO, A', 'BB, B', 'BO, B', 'AB, AB', 'OO, O'] }, { k: 'b', l: 'Parent 2, ABO', choice: ['AA, A', 'AO, A', 'BB, B', 'BO, B', 'AB, AB', 'OO, O'] },
                                { k: 'ra', l: 'Parent 1, Rh', choice: ['DD, +', 'Dd, +', 'dd, −'] }, { k: 'rb', l: 'Parent 2, Rh', choice: ['DD, +', 'Dd, +', 'dd, −'] }], cols: 2, run: runBlood }
                    ],
                    dna: [
                        { id: 'sequence', t: 'DNA and RNA', f: ['5′ → 3′', 'GC %'], d: 'A sequence of DNA or RNA, pasted as it comes, FASTA too: its length, the count of each base, drawn, its GC content along it, ' +
                            'drawn, its mass single and double stranded, and its complement, reverse complement and RNA, or DNA, to copy.',
                            fields: [{ k: 's', l: 'Sequence', ph: '5′ ATGGCTAGCAAAGGAG… 3′', area: true }], cols: 1, run: runSequence, example: { s: GFP } },
                        { id: 'translate', t: 'Translate', f: ['DNA → RNA → protein', 'ORFs'], d: 'DNA or RNA made into protein by the standard code, in the frame chosen, of the other strand as −1 to −3: ' +
                            'the protein in one letter and in three, and the open reading frames, ATG to a stop, of so many amino acids or more, in all six frames, drawn, the longest first.',
                            fields: [{ k: 's', l: 'Sequence', ph: 'ATGGCTAGCAAAGGAG…', area: true }, { k: 'f', l: 'Frame', choice: ['+1', '+2', '+3', '−1', '−2', '−3'] },
                                { k: 'min', l: 'ORFs of, aa', ph: '25', def: 25, name: 'ORFs of' }], cols: 2, run: runTranslate, example: function (raw) { return { s: GFP, f: raw.f || '0' }; } },
                        { id: 'code', t: 'Genetic code', f: ['AUG → Met', '64 codons'], d: 'The codon wheel of the standard code, read from the middle out. Click a codon or an amino acid on it, or type ' +
                            'a codon, as AUG or ATG, or an amino acid, as Leu, L or leucine: what it codes, or every codon of it.',
                            fields: [{ k: 'x', l: 'Codon or amino acid', ph: 'AUG, Leu', text: true, cls: 'calc-sv-wide' }], cols: 1, run: runCode },
                        { id: 'primer', t: 'Primer T<sub>m</sub>', f: ['T<sub>m</sub>', '2(A + T) + 4(G + C)'], d: 'The melting temperature of a primer, or of two, forward and reverse, by nearest neighbours as Primer3 ' +
                            'works it out, of SantaLucia\'s values, with the salt and the primer\'s concentration; by Wallace\'s rule and by the count of its bases too; its GC and ΔG, ' +
                            'and what may make it work badly: too few G or C at its 3′ end, a long run of one base, its 3′ end pairing with itself. Their melting drawn. ' +
                            'An annealing temperature some 5 °C below the lower T<sub>m</sub> is a start.',
                            fields: [{ k: 'a', l: 'Forward', ph: '5′ AGCGGATAACAATTTCACACAGGA', text: true, cls: 'calc-sv-wide' }, { k: 'b', l: 'Reverse', ph: 'optional', text: true, cls: 'calc-sv-wide' },
                                { k: 'na', l: 'Na<sup>+</sup>, mM', ph: '50', def: 50, name: 'Na⁺' }, { k: 'c', l: 'Primer, nM', ph: '250', def: 250, name: 'Primer' },
                                { k: 'mg', l: 'Mg<sup>2+</sup>, mM', ph: '0', def: 0, name: 'Mg²⁺' }], cols: 3, run: runPrimer, example: { a: 'AGCGGATAACAATTTCACACAGGA', b: 'GTAAAACGACGGCCAGT' } },
                        { id: 'a260', t: 'DNA and RNA by A<sub>260</sub>', f: ['c = A<sub>260</sub> × 50 µg/mL', 'A<sub>260</sub> ÷ A<sub>280</sub>'], d: 'The concentration of DNA or RNA from its absorbance at 260 nm, ' +
                            'of dsDNA 50 µg/mL each 1, ssDNA 33 and RNA 40, times what it was diluted by; its purity by A<sub>260</sub>/A<sub>280</sub>, about 1.8 of pure DNA and 2 of RNA, lower of protein ' +
                            'or phenol, and by A<sub>260</sub>/A<sub>230</sub>, 2 to 2.2, lower of salts or guanidine, drawn; with a volume, how much there is.',
                            fields: [{ k: 'kind', l: 'Of', choice: ['dsDNA', 'ssDNA', 'RNA'] }, { k: 'a', l: 'A<sub>260</sub>', ph: '0.5', name: 'A260' }, { k: 'dil', l: 'Diluted', ph: '1', def: 1, name: 'Diluted' },
                                { k: 'a280', l: 'A<sub>280</sub>', ph: 'optional', name: 'A280' }, { k: 'a230', l: 'A<sub>230</sub>', ph: 'optional', name: 'A230' }, { k: 'v', l: 'Volume, µL', ph: 'optional', name: 'Volume' }],
                            cols: 2, run: runA260, example: function (raw) { return { kind: raw.kind || '0', a: '0.75', dil: '10', a280: '0.4', a230: '0.36', v: '50' }; } },
                        { id: 'moles', t: 'Mass, moles and copies', f: ['MW = 617.96 × bp + 36.04', 'copies = mol × N<sub>A</sub>'], d: 'Of so many base pairs or bases of DNA or RNA, its mass a mole, as NEB works it out; ' +
                            'of a mass in ng, how many pmol and copies, or of pmol, the ng; with a volume, its concentration in nM and copies a µL.',
                            fields: function (raw) {
                                return [{ k: 'kind', l: 'Of', choice: ['dsDNA', 'ssDNA', 'RNA'] }, { k: 'L', l: 'Length', ph: 'bp or nt, 3000', name: 'Length' }, { k: 'by', l: 'Given', choice: ['ng', 'pmol'] },
                                    raw.by === '1' ? { k: 'x', l: 'pmol', ph: '0.05', name: 'pmol' } : { k: 'x', l: 'ng', ph: '100', name: 'ng' }, { k: 'v', l: 'Volume, µL', ph: 'optional', name: 'Volume' }];
                            }, cols: 2, run: runBioMoles,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0', by: raw.by || '0', L: '3000', v: '10' }, raw.by === '1' ? { x: '0.05' } : { x: '100' }); } },
                        { id: 'ligation', t: 'Ligation', f: 'ng<sub>insert</sub> = ng<sub>vector</sub> × bp<sub>insert</sub> ÷ bp<sub>vector</sub> × ratio', d: 'How much insert to add to a vector for a molar ratio ' +
                            'of insert to vector, 3 : 1 unless typed, and the pmol of each; the plasmid they make drawn.',
                            fields: [{ k: 'vl', l: 'Vector, bp', ph: '3000', name: 'Vector bp' }, { k: 'vn', l: 'Vector, ng', ph: '50', name: 'Vector ng' }, { k: 'il', l: 'Insert, bp', ph: '1000', name: 'Insert bp' },
                                { k: 'r', l: 'Ratio', ph: '3', def: 3, name: 'Ratio' }], cols: 2, run: runLigation, example: { vl: '3000', vn: '50', il: '720' } },
                        { id: 'digest', t: 'Restriction digest', f: ['G^AATTC', 'fragments'], d: tr('Where enzymes cut a sequence, linear or a circle, as a plasmid is, and the fragments they leave, run on a gel beside a ladder, drawn, with a map of the sites. Enzymes typed apart by commas, EcoRI, BamHI; none typed, which of {enzymes} common ones cut it once, twice or not at all.', { enzymes: CalcBiology.enzymes.length }),
                            fields: [{ k: 's', l: 'Sequence', ph: 'GAATTC…', area: true }, { k: 'e', l: 'Enzymes', ph: 'EcoRI, BamHI', text: true, cls: 'calc-sv-wide' }, { k: 'top', l: 'It is', choice: ['Linear', 'Circular'] }],
                            cols: 1, spaces: ['e'], run: runDigest, example: function (raw) { return { s: GFP, e: 'NheI, HindIII, BamHI', top: raw.top || '0' }; } },
                        { id: 'pcr', t: 'PCR amplification', f: 'N = N<sub>0</sub>(1 + E)<sup>n</sup>', d: 'The copies after n cycles of PCR from N₀ at first, at an efficiency E, 100% doubling each cycle; ' +
                            'with the product\'s length, its mass. The copies drawn, cycle by cycle, on a scale of logarithms.',
                            fields: [{ k: 'N', l: 'N<sub>0</sub>', ph: '1000', name: 'N₀' }, { k: 'E', l: 'E, %', ph: '100', def: 100, name: 'E' }, { k: 'n', l: 'Cycles', ph: '30', def: 30, name: 'Cycles' },
                                { k: 'L', l: 'Length, bp', ph: 'optional', name: 'Length' }], cols: 2, drawnLast: true, run: runPcr, example: { N: '1000', E: '95', n: '30', L: '500' } },
                        { id: 'align', t: 'Alignment', f: ['Needleman–Wunsch', 'Smith–Waterman'], d: 'Two sequences of DNA or protein aligned: the whole of each, a gap at either end free, as EMBOSS\'s needle, ' +
                            'or the best part of each, as its water; a gap opened costs 10 and each more 0.5, of BLOSUM62 for a protein, and of DNA 5 the same, −4 not. Their identity, similarity, gaps ' +
                            'and score, the alignment to copy, and a dot plot drawn, a diagonal for each run alike, the alignment\'s path red.',
                            fields: [{ k: 'a', l: 'Sequence 1', ph: 'ATGGCTAGCAAAGG…', area: true }, { k: 'b', l: 'Sequence 2', ph: 'ATGGCTAGCAAAGG…', area: true },
                                { k: 'kind', l: 'Of', choice: ['DNA', 'Protein'] }, { k: 'how', l: 'Align', choice: ['Global', 'Local'] }, { k: 'open', l: 'Gap open', ph: '10', def: 10, name: 'Gap open' },
                                { k: 'ext', l: 'Gap extend', ph: '0.5', def: 0.5, name: 'Gap extend' }], cols: 2, run: runAlign,
                            example: function (raw) { return Object.assign({ kind: raw.kind || '0', how: raw.how || '0' }, raw.kind === '1' ? { a: UBIQUITIN, b: UBIQUITIN_YEAST } : { a: GFP.slice(0, 150), b: GFP_VARIANT }); } },
                        { id: 'crispr', t: 'CRISPR guides', f: ['5′–N<sub>20</sub>–NGG–3′', 'cut 3 bp from the PAM'], d: 'The guide RNAs of a sequence for SpCas9, its PAM NGG after the guide, SaCas9, NNGRRT, ' +
                            'or Cas12a, TTTV before it: on both strands, the best first, each one\'s place, where it cuts and its GC. Best of GC from 40 to 80%, no TTTT, which ends a transcript of U6, ' +
                            'no run of 5 of a base, and its seed, the 12 bases by the PAM, nowhere else in the sequence. With a base, those cutting nearest it first. Drawn along it.',
                            fields: [{ k: 's', l: 'Sequence', ph: 'ATGGCTAGCAAAGG…', area: true }, { k: 'nuc', l: 'Nuclease', choice: CalcBiology.nucleases.map(function (q) { return q[0] + ', ' + q[1]; }) },
                                { k: 'near', l: 'Near base', ph: 'optional', name: 'Near base' }], cols: 2, run: runCrispr, example: function (raw) { return { s: GFP, nuc: raw.nuc || '0', near: '196' }; } },
                        { id: 'motif', t: 'Motif search', f: ['R = A or G, Y = C or T', 'N = any'], d: 'Where a motif is in a sequence, on both strands, of IUPAC\'s codes for more than one base, as TATAWAW, ' +
                            'a TATA box, or GGNCC: each place, drawn along it. With no motif, the codes.',
                            fields: [{ k: 's', l: 'Sequence', ph: 'ATGGCTAGCAAAGG…', area: true }, { k: 'm', l: 'Motif', ph: 'GGNCC', text: true, cls: 'calc-sv-wide' }], cols: 1, run: runMotif,
                            example: { s: GFP, m: 'GAYGG' } },
                        { id: 'mutagenesis', t: 'Mutagenesis and Gibson', f: ['T<sub>m</sub> = 81.5 + 0.41%GC − 675/N − %mismatch', 'overlap 20–40 bp'], d: 'Primers to change bases by site-directed mutagenesis, ' +
                            'as QuikChange: the sequence and the change, as T196A, or 196 ACC for more bases: the pair, the change in the middle, grown to a T<sub>m</sub> of 78 °C, 25 to 45 bases, ending in G or C. ' +
                            'Or primers to join two fragments by Gibson assembly: the end of the first, the start of the second and the overlap: each primer, its tail in small letters, and their T<sub>m</sub>. Drawn.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'For', choice: ['A mutation', 'Gibson'] }].concat(raw.by === '1' ? [{ k: 'a', l: 'End of fragment 1', ph: '…GTTGAATTAGATGG', area: true },
                                    { k: 'b', l: 'Start of fragment 2', ph: 'GGTGATGTTAATGG…', area: true }, { k: 'ov', l: 'Overlap, bp', ph: '30', def: 30, name: 'Overlap' }, { k: 'tm', l: 'T<sub>m</sub>, °C', ph: '60', def: 60, name: 'Tm' }] :
                                    [{ k: 's', l: 'Sequence', ph: 'ATGGCTAGCAAAGG…', area: true }, { k: 'mut', l: 'Change', ph: 'T196A', text: true, aria: 'Change' }]);
                            }, cols: 2, run: runMutagenesis,
                            example: function (raw) { return raw.by === '1' ? { by: '1', a: GFP.slice(0, 330), b: GFP.slice(330) } : { by: '0', s: GFP, mut: 'T196A' }; } },
                        { id: 'genome', t: 'Genomes and copies', f: ['g = bp × 618 g/mol ÷ N<sub>A</sub>', 'copies = ng ÷ g'], d: 'The genomes of the organisms most studied, each one\'s size, genes and chromosomes, ' +
                            'drawn on a scale of logarithms; and of so many ng of its DNA, how many copies of the genome, as for qPCR or a library, or the ng of so many copies.',
                            fields: function (raw) {
                                return [{ k: 'g', l: 'Genome', choice: CalcBiology.genomes.map(function (q) { return q[0]; }).concat('Other') }].concat(raw.g === String(CalcBiology.genomes.length) ?
                                    [{ k: 'L', l: 'Length, bp', ph: '5e6', name: 'Length' }] : [], [{ k: 'ng', l: 'DNA, ng', ph: 'optional', name: 'DNA' }, { k: 'n', l: 'Copies wanted', ph: 'optional', name: 'Copies' }]);
                            }, cols: 2, run: runGenome }
                    ],
                    protein: [
                        { id: 'protein', t: 'Protein', f: ['MW', 'pI', 'ε<sub>280</sub>'], d: 'A protein of one letter to each amino acid, pasted as it comes, FASTA too: its length, mass, isoelectric point by ' +
                            'EMBOSS\'s pKa, its charge at pH 7, drawn against the pH, its extinction at 280 nm with its cysteines free and paired, the absorbance of 1 mg/mL, its GRAVY and aliphatic index; ' +
                            'its hydropathy along it drawn, by Kyte and Doolittle, a window of 9: above 1.6 for some 19, a part that may cross a membrane.',
                            fields: [{ k: 's', l: 'Sequence', ph: 'MQIFVKTLTGKTITLEV…', area: true }], cols: 1, run: runProtein, example: { s: UBIQUITIN } },
                        { id: 'amino', t: 'Amino acids', f: ['NH<sub>2</sub>–CHR–COOH', 'pI'], d: 'The twenty amino acids, drawn by kind: click one, or type its name, three letters or one, for its mass, kind, pKa, ' +
                            'pI, hydropathy, codons and whether people must eat it; its titration curve drawn, the pH as OH⁻ is added.',
                            fields: [{ k: 'x', l: 'Amino acid', ph: 'His, H or histidine', text: true, cls: 'calc-sv-wide' }], cols: 1, run: runAmino },
                        { id: 'proteinconc', t: 'Protein concentration', f: ['A = εcl', 'standard curve'], d: 'A protein\'s concentration from its absorbance at 280 nm, of its extinction and mass, or as 1 mg/mL each 1 ' +
                            'without them; or by a standard curve, as of Bradford or BCA: the standards, a concentration and its absorbance on each line, and the absorbances of the unknowns: ' +
                            'the line fitted and drawn, and each unknown\'s concentration, times its dilution.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'By', choice: ['A₂₈₀', 'Standard curve'] }].concat(raw.by === '1' ?
                                    [{ k: 'pts', l: 'Standards', ph: '0 0.05&#10;0.25 0.21&#10;0.5 0.37&#10;1 0.69', area: true }, { k: 'u', l: 'Unknowns', ph: '0.3 0.45', text: true, cls: 'calc-sv-wide' },
                                        { k: 'dil', l: 'Diluted', ph: '1', def: 1, name: 'Diluted' }] :
                                    [{ k: 'a', l: 'A<sub>280</sub>', ph: '0.8', name: 'A280' }, { k: 'eps', l: 'ε, M⁻¹cm⁻¹', ph: 'optional', name: 'ε' }, { k: 'mw', l: 'MW, Da', ph: 'optional', name: 'MW' },
                                        { k: 'l', l: 'Path, cm', ph: '1', def: 1, name: 'Path' }, { k: 'dil', l: 'Diluted', ph: '1', def: 1, name: 'Diluted' }]);
                            }, cols: 2, spaces: ['u'], run: runProteinConc,
                            example: function (raw) {
                                return raw.by === '1' ? { by: '1', pts: '0 0.05\n0.25 0.21\n0.5 0.37\n1 0.69\n1.5 0.98', u: '0.3 0.45', dil: '5' } : { by: '0', a: '0.62', eps: '43824', mw: '66463' };
                            } },
                        { id: 'kinetics', t: 'Enzyme kinetics', f: ['v = V<sub>max</sub>[S] ÷ (K<sub>m</sub> + [S])', '1/v = (K<sub>m</sub>/V<sub>max</sub>)(1/[S]) + 1/V<sub>max</sub>'],
                            d: 'Michaelis and Menten: of V<sub>max</sub> and K<sub>m</sub>, the rate at a [S], and with an inhibitor, competitive, uncompetitive or noncompetitive, of its concentration and K<sub>i</sub>, ' +
                                'the K<sub>m</sub> and V<sub>max</sub> it leaves; or V<sub>max</sub> and K<sub>m</sub> fitted to points, [S] and v on each line. With [E], k<sub>cat</sub>. ' +
                                'The curve drawn, and the Lineweaver–Burk plot.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['V<sub>max</sub> and K<sub>m</sub>', 'Points'] }].concat(raw.by === '1' ?
                                    [{ k: 'pts', l: 'Points', ph: '[S] v&#10;1 1.8&#10;2 3&#10;5 5', area: true }] :
                                    [{ k: 'vmax', l: 'V<sub>max</sub>', ph: '10', name: 'Vmax' }, { k: 'km', l: 'K<sub>m</sub>', ph: '2', name: 'Km' }, { k: 's', l: '[S]', ph: 'optional', name: '[S]' }],
                                [{ k: 'inh', l: 'Inhibitor', choice: ['None', 'Competitive', 'Uncompetitive', 'Noncompetitive'] }],
                                raw.inh && raw.inh !== '0' ? [{ k: 'i', l: '[I]', ph: '1', name: '[I]' }, { k: 'ki', l: 'K<sub>i</sub>', ph: '0.5', name: 'Ki' }] : [],
                                [{ k: 'e', l: '[E]', ph: 'optional', name: '[E]' }]);
                            }, cols: 3, run: runKinetics,
                            example: function (raw) {
                                return Object.assign({ by: raw.by || '0', inh: raw.inh || '0' }, raw.by === '1' ? { pts: '0.5 1.1\n1 1.8\n2 3\n5 5\n10 6.6\n20 7.9' } : { vmax: '10', km: '2', s: '4' },
                                    raw.inh && raw.inh !== '0' ? { i: '1', ki: '0.5' } : {});
                            } },
                        { id: 'hill', t: 'Binding and Hill', f: ['θ = [L]<sup>n</sup> ÷ (K<sup>n</sup> + [L]<sup>n</sup>)'], d: 'How much of a protein has its ligand bound at [L], by Hill\'s equation, of K, ' +
                            'the [L] half bound, and n, its cooperativity: 1 none, as myoglobin, above 1 as haemoglobin, some 2.8, K 26 mmHg of O₂. The [L] for 10%, 50% and 90%, and the curve drawn, ' +
                            'beside that of n = 1.',
                            fields: [{ k: 'K', l: 'K', ph: '26', name: 'K' }, { k: 'n', l: 'n', ph: '1', def: 1 }, { k: 'L', l: '[L]', ph: 'optional', name: '[L]' }], cols: 3, run: runHill,
                            example: { K: '26', n: '2.8', L: '40' } },
                        { id: 'dose', t: 'Dose–response, IC<sub>50</sub>', f: ['y = bottom + (top − bottom) ÷ (1 + 10<sup>(log EC<sub>50</sub> − log x)h</sup>)'], d: 'A dose and its response fitted by the ' +
                            'four-parameter logistic, Prism\'s variable slope: a concentration and its response on each line, repeats too. The bottom, the top, the IC₅₀ of a response that falls or the EC₅₀ ' +
                            'of one that rises, the Hill slope, R², and the concentrations of 10% and 90% of the effect; or the ends held at 0 and 100, of responses in %. The curve drawn on a scale of logarithms.',
                            fields: [{ k: 'pts', l: 'Points', ph: 'x y&#10;0.1 98&#10;1 88&#10;10 41', area: true }, { k: 'ends', l: 'Ends', choice: ['Free', 'Held at 0 and 100'] }], cols: 2, run: runDose,
                            example: function (raw) { return { pts: '0.1 98\n0.3 95\n1 88\n3 69\n10 41\n30 17\n100 6\n300 3', ends: raw.ends || '0' }; } },
                        { id: 'purify', t: 'Purification table', f: ['specific activity = U ÷ mg', 'fold = SA ÷ SA<sub>1</sub>'], d: 'The steps of a protein\'s purification, each on a line: its name, ' +
                            'the protein in it in mg and its activity in units. Each step\'s specific activity, yield and fold purification, drawn.',
                            fields: [{ k: 'steps', l: 'Steps', ph: 'Crude 2000 4000&#10;Ion exchange 80 2800', area: true }], cols: 1, run: runPurify,
                            example: { steps: 'Crude extract 2000 4000\nAmmonium sulfate 600 3600\nIon exchange 80 2800\nGel filtration 12 2000\nAffinity 2.5 1600' } }
                    ],
                    lab: [
                        { id: 'dilute', t: 'Dilution', f: 'C<sub>1</sub>V<sub>1</sub> = C<sub>2</sub>V<sub>2</sub>', d: 'Type three of the stock\'s concentration C₁, the volume of it V₁, the concentration wanted C₂ and the volume ' +
                            'V₂, any units as long as each pair is the same, and the fourth is worked out, with how much to add to it and the dilution; the tubes drawn.',
                            fields: [{ k: 'c1', l: 'C<sub>1</sub>', ph: '10', name: 'C₁' }, { k: 'v1', l: 'V<sub>1</sub>', ph: 'empty', name: 'V₁' }, { k: 'c2', l: 'C<sub>2</sub>', ph: '1', name: 'C₂' },
                                { k: 'v2', l: 'V<sub>2</sub>', ph: '50', name: 'V₂' }], cols: 2, run: runDilute, example: { c1: '10', c2: '1', v2: '50' } },
                        { id: 'serial', t: 'Serial dilution', f: 'C<sub>n</sub> = C<sub>0</sub> ÷ f<sup>n</sup>', d: 'A stock diluted step by step, so many times by a factor: each tube\'s concentration, ' +
                            'and of a volume in each, how much to move on and how much diluent to put in each first. The tubes drawn, paler each step.',
                            fields: [{ k: 'c', l: 'C<sub>0</sub>', ph: '1000000', name: 'C₀' }, { k: 'f', l: 'Factor', ph: '10', def: 10, name: 'Factor' }, { k: 'n', l: 'Steps', ph: '6', def: 6, name: 'Steps' },
                                { k: 'v', l: 'Volume', ph: '1000', def: 1000, name: 'Volume' }], cols: 2, run: runSerial, example: { c: '1e6', f: '10', n: '6', v: '1000' } },
                        { id: 'solution', t: 'Making a solution', f: ['g = M × L × g/mol', 'C<sub>1</sub>V<sub>1</sub> = C<sub>2</sub>V<sub>2</sub>'], d: 'What to weigh for a solution of a molarity, of its mass a mole or of its formula, ' +
                            'as NaCl or Tris, C4H11NO3; or of a percent, weight in volume; or how much of a stock, as 10X, for 1X.',
                            fields: function (raw) {
                                var by = +raw.by || 0;
                                return [{ k: 'by', l: 'Of', choice: ['Molarity', '% w/v', 'X stock'] }].concat(by === 1 ? [{ k: 'pc', l: '%', ph: '0.9', name: '%' }, { k: 'v', l: 'Volume, mL', ph: '500', name: 'Volume' }] :
                                    by === 2 ? [{ k: 'x', l: 'Stock, X', ph: '10', name: 'Stock' }, { k: 'w', l: 'Wanted, X', ph: '1', def: 1, name: 'Wanted' }, { k: 'v', l: 'Volume, mL', ph: '500', name: 'Volume' }] :
                                        [{ k: 'm', l: 'Molarity, M', ph: '0.5', name: 'Molarity' }, { k: 'v', l: 'Volume, mL', ph: '500', name: 'Volume' }, { k: 'mw', l: 'g/mol or formula', ph: 'NaCl', text: true, aria: 'Molar mass' }]);
                            }, cols: 2, run: runSolution,
                            example: function (raw) { return Object.assign({ by: raw.by || '0' }, [{ m: '0.5', v: '500', mw: 'NaCl' }, { pc: '0.9', v: '500' }, { x: '10', v: '500' }][+raw.by || 0]); } },
                        { id: 'cells', t: 'Cell count', f: 'cells/mL = mean × dilution × 10<sup>4</sup>', d: 'A count of cells on a haemocytometer: the count of each large square, the dilution, 2 of trypan blue at 1:1, ' +
                            'and the dead in the same squares: the cells a mL, live, and how many are alive; with the volume, all of them, and with the cells wanted, as to seed a plate, ' +
                            'how much to take. The squares drawn.',
                            fields: [{ k: 'c', l: 'Counts', ph: '52 47 55 49', text: true, cls: 'calc-sv-wide' }, { k: 'dil', l: 'Dilution', ph: '2', def: 2, name: 'Dilution' }, { k: 'dead', l: 'Dead', ph: 'optional', name: 'Dead' },
                                { k: 'v', l: 'Volume, mL', ph: 'optional', name: 'Volume' }, { k: 'want', l: 'Wanted', ph: 'optional', name: 'Wanted' }], cols: 2, spaces: ['c'], run: runCells,
                            example: { c: '52 47 55 49', dil: '2', dead: '12', v: '10', want: '200000' } },
                        { id: 'growth', t: 'Growth and doubling', f: ['N = N<sub>0</sub> × 2<sup>t/t<sub>d</sub></sup>', 'g = t ÷ n'], d: 'Cells or bacteria growing: of two counts and the time between, the generations, ' +
                            'the doubling time and the rate; of the doubling time, how many after a time; or of an OD<sub>600</sub>, the cells a mL, some 8 × 10⁸ for each 1 of E. coli. Their growth drawn.',
                            fields: function (raw) {
                                var by = +raw.by || 0;
                                return [{ k: 'by', l: 'Of', choice: ['Two counts', 'Doubling time', 'OD₆₀₀'] }].concat(by === 2 ?
                                    [{ k: 'od', l: 'OD<sub>600</sub>', ph: '0.5', name: 'OD600' }, { k: 'dil', l: 'Diluted', ph: '1', def: 1, name: 'Diluted' }, { k: 'per', l: 'Cells/mL each 1', ph: '8e8', def: 8e8, name: 'Cells/mL each 1' }] :
                                    by === 1 ? [{ k: 'N0', l: 'N<sub>0</sub>', ph: '1000', name: 'N₀' }, { k: 'td', l: 't<sub>d</sub>', ph: '20', name: 'td' }, { k: 't', l: 't', ph: '120' }] :
                                        [{ k: 'N0', l: 'N<sub>0</sub>', ph: '1000', name: 'N₀' }, { k: 'N', l: 'N', ph: '64000' }, { k: 't', l: 't', ph: '120' }]);
                            }, cols: 3, drawnLast: true, run: runGrowth,
                            example: function (raw) { return Object.assign({ by: raw.by || '0' }, [{ N0: '1000', N: '64000', t: '120' }, { N0: '1000', td: '20', t: '120' }, { od: '0.6', dil: '1' }][+raw.by || 0]); } },
                        { id: 'cfu', t: 'Colonies, CFU/mL', f: 'CFU/mL = colonies ÷ (dilution × mL plated)', d: 'The bacteria a mL of a culture, from the colonies on a plate, its dilution, as 1e-6 or 10⁶, and the ' +
                            'volume spread; 30 to 300 colonies count best. The plate drawn.',
                            fields: [{ k: 'n', l: 'Colonies', ph: '156', name: 'Colonies' }, { k: 'd', l: 'Dilution', ph: '1e-6', name: 'Dilution' }, { k: 'v', l: 'Plated, mL', ph: '0.1', def: 0.1, name: 'Plated' }],
                            cols: 3, run: runCfu, example: { n: '156', d: '1e-6', v: '0.1' } },
                        { id: 'rcf', t: 'Centrifuge, RPM and g', f: 'RCF = 1.118 × 10<sup>−5</sup> r × RPM<sup>2</sup>', d: 'The force of a centrifuge in g of its speed in revolutions a minute, or the speed for a force, ' +
                            'of the radius of its rotor, from its middle to the tube\'s bottom, in cm. The rotor drawn.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['RPM', 'g'] }, { k: 'r', l: 'r, cm', ph: '10', name: 'r' }, raw.by === '1' ? { k: 'x', l: 'g', ph: '12000', name: 'g' } : { k: 'x', l: 'RPM', ph: '13000', name: 'RPM' }];
                            }, cols: 2, run: runRcf, example: function (raw) { return { by: raw.by || '0', r: '8.4', x: raw.by === '1' ? '16000' : '13000' }; } },
                        { id: 'pcrmix', t: 'PCR master mix', f: 'C<sub>1</sub>V<sub>1</sub> = C<sub>2</sub>V<sub>2</sub>', d: 'What goes in each reaction and in a mix for so many, with some extra for pipetting: the buffer, ' +
                            'the dNTPs, each primer, the polymerase, the template and water to the volume. A reaction drawn, part by part.',
                            fields: [{ k: 'n', l: 'Reactions', ph: '10', name: 'Reactions' }, { k: 'v', l: 'Each, µL', ph: '25', def: 25, name: 'Each' }, { k: 'x', l: 'Extra, %', ph: '10', def: 10, name: 'Extra' },
                                { k: 'buf', l: 'Buffer, X', ph: '10', def: 10, name: 'Buffer' }, { k: 'dntp', l: 'dNTPs, mM', ph: '10', def: 10, name: 'dNTPs' }, { k: 'dfin', l: 'dNTPs in, µM', ph: '200', def: 200, name: 'dNTPs in' },
                                { k: 'pr', l: 'Primers, µM', ph: '10', def: 10, name: 'Primers' }, { k: 'pfin', l: 'Primers in, µM', ph: '0.5', def: 0.5, name: 'Primers in' },
                                { k: 'pol', l: 'Polymerase, µL', ph: '0.25', def: 0.25, name: 'Polymerase' }, { k: 'tmp', l: 'Template, µL', ph: '1', def: 1, name: 'Template' }],
                            cols: 2, run: runPcrMix, example: { n: '10' } },
                        { id: 'qpcr', t: 'qPCR, ΔΔCt', f: ['ΔΔCt = ΔCt<sub>treated</sub> – ΔCt<sub>control</sub>', 'fold = 2<sup>−ΔΔCt</sup>'], d: 'The change in a gene\'s expression by Livak\'s method, of the Ct of the gene ' +
                            'and of a reference gene, as GAPDH, in the control and the treated; with each one\'s efficiency, by Pfaffl\'s as well. The fold change drawn.',
                            fields: [{ k: 'tc', l: 'Gene, control', ph: '25.1', name: 'Gene, control' }, { k: 'rc', l: 'Reference, control', ph: '18.2', name: 'Reference, control' },
                                { k: 'tt', l: 'Gene, treated', ph: '22.8', name: 'Gene, treated' }, { k: 'rt', l: 'Reference, treated', ph: '18.4', name: 'Reference, treated' },
                                { k: 'et', l: 'E of gene, %', ph: 'optional', name: 'E of gene' }, { k: 'er', l: 'E of reference, %', ph: 'optional', name: 'E of reference' }],
                            cols: 2, run: runQpcr, example: { tc: '25.1', rc: '18.2', tt: '22.8', rt: '18.4' } },
                        { id: 'stdcurve', t: 'qPCR standard curve', f: ['Ct = m log<sub>10</sub>Q + b', 'E = 10<sup>−1/m</sup> – 1'], d: 'The standards, a quantity and its Ct on each line: the line fitted, its slope, R² and ' +
                            'the efficiency, 90 to 110% good, −3.32 a slope of 100%; and of the Ct of unknowns, their quantities. Drawn.',
                            fields: [{ k: 'pts', l: 'Standards', ph: '1000000 15.1&#10;100000 18.5&#10;10000 21.9', area: true }, { k: 'u', l: 'Unknowns, Ct', ph: '20.3 24', text: true, cls: 'calc-sv-wide' }],
                            cols: 1, spaces: ['u'], run: runStdCurve, example: { pts: '1000000 15.1\n100000 18.5\n10000 21.9\n1000 25.2\n100 28.6', u: '20.3 24' } },
                        { id: 'errorbars', t: 'Mean ± 2 SE', f: ['SE = s ÷ √n', 'x̄ ± 2SE'], d: 'The groups of an experiment, each on a line, its name first if it has one: Light: 12 15 11 14. Each one\'s mean, ' +
                            'standard deviation, standard error and the mean ± 2 SE, about 95% sure; drawn with their error bars. Bars that do not overlap suggest a real difference.',
                            fields: [{ k: 'g', l: 'Groups', ph: 'Light: 12 15 11 14&#10;Dark: 7 9 8 6', area: true }], cols: 1, run: runErrorBars, example: { g: 'Light: 12 15 11 14 13\nShade: 9 11 8 10 12\nDark: 5 7 6 4 6' } },
                        { id: 'chromatography', t: 'Chromatography, R<sub>f</sub>', f: 'R<sub>f</sub> = pigment ÷ solvent', d: 'How far each spot went over how far the solvent went, as the pigments of a leaf on paper: ' +
                            'their R<sub>f</sub>, each drawn on the strip. In petroleum ether and acetone carotene goes furthest, then xanthophyll, chlorophyll a and b.',
                            fields: [{ k: 's', l: 'Solvent, cm', ph: '10', name: 'Solvent' }, { k: 'd', l: 'Spots, cm', ph: '9.5 7 5.2 3.8', text: true, cls: 'calc-sv-wide' }], cols: 1, spaces: ['d'],
                            run: runChromatography, example: { s: '10', d: '9.5 7 5.2 3.8' } },
                        { id: 'microscope', t: 'Microscope', f: ['M = image ÷ actual', 'FOV = FN ÷ objective'], d: 'Of two of the size of an image, the real size and the magnification, the third, as of a drawing or a ' +
                            'photograph and its scale bar; or of the eyepiece, the objective and the field number of the eyepiece, the magnification, the field of view, how many cells fit across it, ' +
                            'drawn, and with the NA, the smallest detail seen, by Abbe.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Magnification', 'Field of view'] }].concat(raw.by === '1' ?
                                    [{ k: 'eye', l: 'Eyepiece', ph: '10', def: 10, name: 'Eyepiece' }, { k: 'obj', l: 'Objective', ph: '40', name: 'Objective' }, { k: 'fn', l: 'FN, mm', ph: '18', def: 18, name: 'FN' },
                                        { k: 'cell', l: 'Cell, µm', ph: 'optional', name: 'Cell' }, { k: 'na', l: 'NA', ph: 'optional', name: 'NA' }] :
                                    [{ k: 'img', l: 'Image', ph: 'mm, 25', name: 'Image' }, { k: 'real', l: 'Actual', ph: 'µm, 50', name: 'Actual' }, { k: 'M', l: 'M', ph: 'empty', name: 'M' }]);
                            }, cols: 3, run: runMicroscope,
                            example: function (raw) { return raw.by === '1' ? { by: '1', obj: '40', cell: '20', na: '0.65' } : { by: '0', img: '25', real: '50' }; } },
                        { id: 'gelsize', t: 'Size from a gel', f: 'log size = m × distance + b', d: 'The size of a band from how far it ran: of DNA in bp, or of a protein in kDa on SDS-PAGE. The ladder, a size ' +
                            'and how far it ran on each line, and the unknowns\' distances: log size fitted to the distance, each unknown\'s size, and the gel and the line drawn.',
                            fields: [{ k: 'kind', l: 'Of', choice: ['DNA, bp', 'Protein, kDa'] }, { k: 'pts', l: 'Ladder', ph: '10000 8&#10;3000 21&#10;1000 35&#10;500 44', area: true },
                                { k: 'u', l: 'Unknowns, distance', ph: '25 39', text: true, cls: 'calc-sv-wide', aria: 'Unknowns' }], cols: 1, spaces: ['u'], run: runGelSize,
                            example: function (raw) {
                                return raw.kind === '1' ? { kind: '1', pts: '250 5\n130 12\n100 16\n70 22\n55 27\n35 37\n25 45\n15 55', u: '20 33' } : { kind: '0', pts: '10000 8\n6000 13\n3000 21\n1500 30\n1000 35\n500 44', u: '25 39' };
                            } },
                        { id: 'transform', t: 'Transformation efficiency', f: 'transformants/µg = colonies ÷ µg plated', d: 'How well cells took up DNA: the colonies on a plate, the ng of DNA added, ' +
                            'the volume after recovery and the volume spread: the transformants a µg, some 10⁶ to 10⁹ of good competent cells, drawn among them; and the plate.',
                            fields: [{ k: 'n', l: 'Colonies', ph: '150', name: 'Colonies' }, { k: 'ng', l: 'DNA, ng', ph: '0.01', name: 'DNA' }, { k: 'v', l: 'Recovery, µL', ph: '1000', def: 1000, name: 'Recovery' },
                                { k: 'p', l: 'Plated, µL', ph: '100', def: 100, name: 'Plated' }, { k: 'dil', l: 'Diluted', ph: '1', def: 1, name: 'Diluted' }], cols: 2, run: runTransform, example: { n: '150', ng: '0.01' } },
                        { id: 'seeding', t: 'Seeding plates', f: 'cells = density × area', d: 'Cells for each well of a plate, or a flask: of the cells wanted a cm² and the cells a mL of the suspension, ' +
                            'how much of it in each, the medium to add, and how much in all for so many, with some extra. The plate drawn.',
                            fields: [{ k: 'plate', l: 'Plate', choice: PLATES.map(function (q) { return q[0]; }) }, { k: 'd', l: 'Cells/cm²', ph: '20000', name: 'Cells/cm²' }, { k: 'c', l: 'Suspension, cells/mL', ph: '1e6', name: 'Suspension' },
                                { k: 'w', l: 'Wells', ph: 'all', name: 'Wells' }, { k: 'x', l: 'Extra, %', ph: '10', def: 10, name: 'Extra' }], cols: 2, run: runSeeding,
                            example: function (raw) { return { plate: raw.plate || '0', d: '20000', c: '1e6' }; } },
                        { id: 'moi', t: 'MOI and infection', f: ['virus = cells × MOI ÷ titre', 'P(0) = e<sup>−MOI</sup>'], d: 'Of the cells, the multiplicity of infection wanted and the virus\'s titre, PFU or TU ' +
                            'a mL: the virus for each well and for all; and by Poisson the part of the cells infected by none, by one or by more, drawn.',
                            fields: [{ k: 'cells', l: 'Cells', ph: '2e5', name: 'Cells' }, { k: 'moi', l: 'MOI', ph: '1', name: 'MOI' }, { k: 't', l: 'Titre, /mL', ph: '1e8', name: 'Titre' }, { k: 'w', l: 'Wells', ph: '1', def: 1, name: 'Wells' }],
                            cols: 2, run: runMoi, example: { cells: '2e5', moi: '1', t: '1e8', w: '6' } },
                        { id: 'isotope', t: 'Radioisotopes', f: 'A = A<sub>0</sub>(½)<sup>t/t½</sup>', d: 'What is left of a radioisotope of the lab or the clinic, ³²P, ³⁵S, ¹²⁵I and more, or of a half-life typed: ' +
                            'its activity after a time since its reference date, the part left, and of the activity wanted, how much to take; what it gives off and how to shield it. Its decay drawn.',
                            fields: function (raw) {
                                return [{ k: 'iso', l: 'Isotope', choice: CalcBiology.isotopes.map(function (q) { return q[0]; }).concat('Other') }].concat(raw.iso === String(CalcBiology.isotopes.length) ?
                                    [{ k: 'half', l: 'Half-life', ph: '14.3', name: 'Half-life' }] : [], [{ k: 'unit', l: 'Time in', choice: ['Days', 'Hours'] }, { k: 'A', l: 'Activity at first', ph: '250', name: 'Activity' },
                                    { k: 't', l: 'Time since', ph: '10', name: 'Time' }, { k: 'want', l: 'Wanted', ph: 'optional', name: 'Wanted' }, { k: 'v', l: 'In, µL', ph: 'optional', name: 'In' }]);
                            }, cols: 2, drawnLast: true, run: runIsotope,
                            example: function (raw) { return Object.assign({ iso: raw.iso || '2', unit: raw.unit || '0', A: '250', t: '10', want: '50', v: '25' }, raw.iso === String(CalcBiology.isotopes.length) ? { half: '14.3' } : {}); } },
                        { id: 'buffer', t: 'Buffers', f: 'pH = pK<sub>a</sub> + log([A<sup>−</sup>] ÷ [HA])', d: 'A buffer by Henderson and Hasselbalch, of Tris, HEPES, phosphate and more: its pKa at 25 °C, ' +
                            'moved for the temperature, the pH wanted, its concentration and volume: the ratio of its base to its acid, what to weigh and the NaOH or HCl to bring it to the pH, or of two salts ' +
                            'the mass of each. It buffers best within 1 of its pKa. Its forms drawn against the pH.',
                            fields: [{ k: 'buf', l: 'Buffer', choice: CalcBiology.buffers.map(function (q) { return q[0]; }) }, { k: 'pH', l: 'pH', ph: '7.5', name: 'pH' }, { k: 'c', l: 'mM', ph: '50', name: 'mM' },
                                { k: 'v', l: 'Volume, mL', ph: '500', name: 'Volume' }, { k: 'T', l: 'T, °C', ph: '25', def: 25, name: 'T' }], cols: 2, run: runBioBuffer,
                            example: function (raw) { return { buf: raw.buf || '8', pH: raw.buf ? String(+CalcBiology.buffers[+raw.buf][1].toFixed(1)) : '7.5', c: '50', v: '500' }; } }
                    ],
                    cells: [
                        { id: 'water', t: 'Water potential', f: ['Ψ = Ψ<sub>P</sub> + Ψ<sub>S</sub>', 'Ψ<sub>S</sub> = −iCRT'], d: 'The water potential of a solution or a cell, in bars and MPa: Ψ<sub>S</sub> of its solute, ' +
                            'i the particles each makes, 1 of sucrose, 2 of NaCl, C its molarity, at T, and Ψ<sub>P</sub> its pressure, 0 in an open beaker; with the Ψ outside, which way water moves, drawn.',
                            fields: [{ k: 'i', l: 'i', ph: '1', def: 1 }, { k: 'C', l: 'C, M', ph: '0.3', name: 'C' }, { k: 'T', l: 'T, °C', ph: '22', def: 22, name: 'T' }, { k: 'P', l: 'Ψ<sub>P</sub>, bar', ph: '0', def: 0, name: 'ΨP' },
                                { k: 'out', l: 'Outside Ψ, bar', ph: 'optional', name: 'Outside Ψ' }], cols: 2, run: runWater, example: { i: '1', C: '0.3', T: '22', P: '0', out: '-2' } },
                        { id: 'tonicity', t: 'Osmolarity and tonicity', f: 'osmolarity = iC', d: 'A solution\'s osmolarity, of a solute\'s molarity and the particles each makes, and whether it is hypotonic, ' +
                            'isotonic or hypertonic to a cell, some 300 mOsm/L, as blood\'s: which way water goes, and a red blood cell in it, drawn.',
                            fields: function (raw) {
                                return [{ k: 'sol', l: 'Solute', choice: SOLUTES.map(function (s) { return s[0]; }) }, { k: 'C', l: 'C, mM', ph: '154', name: 'C' }].concat(raw.sol === '5' ? [{ k: 'i', l: 'i', ph: '1', def: 1 }] : [],
                                    [{ k: 'cell', l: 'Cell, mOsm/L', ph: '300', def: 300, name: 'Cell' }]);
                            }, cols: 2, run: runTonicity, example: function (raw) { return Object.assign({ sol: raw.sol || '0', C: '154' }, raw.sol === '5' ? { i: '1' } : {}); } },
                        { id: 'sav', t: 'Surface area to volume', f: ['SA:V', '6/s of a cube'], d: 'A cube, a sphere or a cylinder, as a cell: its surface, its volume and their ratio, the reason cells stay small; ' +
                            'the shape drawn, and its SA:V as it grows.',
                            fields: function (raw) {
                                var shape = +raw.shape || 0;
                                return [{ k: 'shape', l: 'Shape', choice: ['Cube', 'Sphere', 'Cylinder'] }].concat(shape === 2 ? [{ k: 'r', l: 'r', ph: '1' }, { k: 'h', l: 'h', ph: '4' }] :
                                    [shape === 1 ? { k: 'r', l: 'r', ph: '1' } : { k: 'r', l: 'Side', ph: '2', name: 'Side' }]);
                            }, cols: 2, run: runSav, example: function (raw) { return Object.assign({ shape: raw.shape || '0', r: raw.shape === '0' || !raw.shape ? '2' : '1' }, raw.shape === '2' ? { h: '4' } : {}); } },
                        { id: 'q10', t: 'Q<sub>10</sub>', f: 'Q<sub>10</sub> = (R<sub>2</sub>/R<sub>1</sub>)<sup>10/(T<sub>2</sub> – T<sub>1</sub>)</sup>', d: 'How much faster a rate goes 10 °C warmer: of two rates and their ' +
                            'temperatures, Q₁₀, some 2 to 3 of a reaction of enzymes; or of Q₁₀, the rate at another temperature. Drawn.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Two rates', 'Q₁₀'] }, { k: 'r1', l: 'R<sub>1</sub>', ph: '12', name: 'R₁' }, { k: 't1', l: 'T<sub>1</sub>', ph: '20', name: 'T₁' },
                                    raw.by === '1' ? { k: 'q', l: 'Q<sub>10</sub>', ph: '2', name: 'Q₁₀' } : { k: 'r2', l: 'R<sub>2</sub>', ph: '30', name: 'R₂' }, { k: 't2', l: 'T<sub>2</sub>', ph: '30', name: 'T₂' }];
                            }, cols: 2, run: runQ10, example: function (raw) { return raw.by === '1' ? { by: '1', r1: '12', t1: '20', q: '2', t2: '37' } : { by: '0', r1: '12', t1: '20', r2: '30', t2: '30' }; } },
                        { id: 'fick', t: 'Diffusion', f: ['J = DAΔC ÷ d', 't = x<sup>2</sup> ÷ 2D'], d: 'Fick\'s law: the rate a substance crosses a membrane or a layer, of its diffusion coefficient D, in m²/s, ' +
                            'O₂ in water 2e-9, glucose 6.7e-10, the area A, m², the difference of concentration ΔC, mol/m³, and the thickness d, m; drawn. Or how long it takes to spread a distance x, ' +
                            'the reason diffusion serves only small distances, drawn.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['A rate', 'A time'] }, { k: 'D', l: 'D, m²/s', ph: '2e-9', name: 'D' }].concat(raw.by === '1' ? [{ k: 'x', l: 'x, m', ph: '1e-5', name: 'x' }] :
                                    [{ k: 'A', l: 'A, m²', ph: '1e-6', name: 'A' }, { k: 'dC', l: 'ΔC, mol/m³', ph: '0.1', name: 'ΔC' }, { k: 'd', l: 'd, m', ph: '1e-6', name: 'd' }]);
                            }, cols: 2, run: runFick, example: function (raw) { return raw.by === '1' ? { by: '1', D: '2e-9', x: '1e-4' } : { by: '0', D: '2e-9', A: '1e-6', dC: '0.1', d: '1e-6' }; } },
                        { id: 'membrane', t: 'Membrane potential', f: ['E = (RT/zF) ln([out]/[in])', 'GHK'], d: 'The equilibrium potential of an ion by Nernst, of its concentrations outside and in, mM; or the resting ' +
                            'potential by Goldman, Hodgkin and Katz, of the permeabilities and concentrations of K⁺, Na⁺ and Cl⁻. At 37 °C unless typed. Each drawn on a scale of mV.',
                            fields: function (raw) {
                                var by = +raw.by || 0, ion = IONS[+raw.ion] || IONS[0];
                                if (by === 1) {
                                    return [{ k: 'by', l: 'By', choice: ['Nernst', 'Goldman'] }, { k: 'pk', l: 'P<sub>K</sub>', ph: '1', def: 1, name: 'PK' }, { k: 'pna', l: 'P<sub>Na</sub>', ph: '0.05', def: 0.05, name: 'PNa' },
                                        { k: 'pcl', l: 'P<sub>Cl</sub>', ph: '0.45', def: 0.45, name: 'PCl' }, { k: 'ko', l: 'K⁺ out', ph: '5', def: 5 }, { k: 'nao', l: 'Na⁺ out', ph: '145', def: 145 }, { k: 'clo', l: 'Cl⁻ out', ph: '110', def: 110 },
                                        { k: 'ki', l: 'K⁺ in', ph: '140', def: 140 }, { k: 'nai', l: 'Na⁺ in', ph: '12', def: 12 }, { k: 'cli', l: 'Cl⁻ in', ph: '10', def: 10 }, { k: 'T', l: 'T, °C', ph: '37', def: 37, name: 'T' }];
                                }
                                return [{ k: 'by', l: 'By', choice: ['Nernst', 'Goldman'] }, { k: 'ion', l: 'Ion', choice: IONS.map(function (q) { return q[0]; }).concat('Other') }].concat(raw.ion === '4' ? [{ k: 'z', l: 'z', ph: '1' }] : [],
                                    [{ k: 'o', l: 'Out, mM', ph: String(ion[2]), name: 'Out' }, { k: 'ins', l: 'In, mM', ph: String(ion[3]), name: 'In' }, { k: 'T', l: 'T, °C', ph: '37', def: 37, name: 'T' }]);
                            }, cols: 3, run: runMembrane,
                            example: function (raw) { return raw.by === '1' ? { by: '1', pk: '1', pna: '0.05', pcl: '0.45', ko: '5', nao: '145', clo: '110', ki: '140', nai: '12', cli: '10', T: '37' } : Object.assign({ by: '0', ion: raw.ion || '0' }, raw.ion === '4' ? { z: '1', o: '5', ins: '140' } : { o: String((IONS[+raw.ion] || IONS[0])[2]), ins: String((IONS[+raw.ion] || IONS[0])[3]) }); } },
                        { id: 'gibbs', t: 'Free energy', f: ['ΔG = ΔG°′ + RT ln Q', 'K = e<sup>−ΔG°′/RT</sup>'], d: 'Whether a reaction goes on its own: of its ΔG°′, kJ/mol, and Q, its products over its reactants, ' +
                            'the ΔG, below 0 going forward; and its K at equilibrium. ATP to ADP is −30.5. Drawn against Q.',
                            fields: [{ k: 'g', l: 'ΔG°′, kJ/mol', ph: '-30.5', name: 'ΔG°′' }, { k: 'q', l: 'Q', ph: '1', def: 1, name: 'Q' }, { k: 'T', l: 'T, °C', ph: '37', def: 37, name: 'T' }],
                            cols: 3, run: runGibbs, example: { g: '-30.5', q: '0.001' } },
                        { id: 'heart', t: 'Heart and blood pressure', f: ['CO = HR × SV', 'MAP = DBP + (SBP – DBP)/3'], d: 'Of the heart rate and stroke volume, the cardiac output; of the blood pressures, systolic over ' +
                            'diastolic, the mean arterial pressure and the pulse pressure; and of both, the resistance of the vessels. The pressure drawn, beat by beat.',
                            fields: [{ k: 'hr', l: 'HR, bpm', ph: '70', name: 'HR' }, { k: 'sv', l: 'SV, mL', ph: '70', name: 'SV' }, { k: 'sbp', l: 'SBP, mmHg', ph: '120', name: 'SBP' }, { k: 'dbp', l: 'DBP, mmHg', ph: '80', name: 'DBP' }],
                            cols: 2, run: runHeart, example: { hr: '70', sv: '70', sbp: '120', dbp: '80' } },
                        { id: 'respiration', t: 'Respiration', f: ['C<sub>6</sub>H<sub>12</sub>O<sub>6</sub> + 6O<sub>2</sub> → 6CO<sub>2</sub> + 6H<sub>2</sub>O', 'RQ = CO<sub>2</sub> ÷ O<sub>2</sub>'],
                            d: 'Of glucose, in g, what aerobic respiration takes and makes: the O₂, CO₂ and water, and some 30 to 32 ATP each, drawn by where it is made. Or the respiratory quotient, ' +
                                'of the CO₂ made and the O₂ taken, and what it burns, 1 of carbohydrate, 0.8 of protein and 0.7 of fat, drawn.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Glucose', 'RQ'] }].concat(raw.by === '1' ? [{ k: 'co2', l: 'CO<sub>2</sub>', ph: '200', name: 'CO₂' }, { k: 'o2', l: 'O<sub>2</sub>', ph: '250', name: 'O₂' }] :
                                    [{ k: 'g', l: 'Glucose, g', ph: '180', name: 'Glucose' }]);
                            }, cols: 2, run: runRespiration, example: function (raw) { return raw.by === '1' ? { by: '1', co2: '200', o2: '250' } : { by: '0', g: '180' }; } }
                    ],
                    health: [
                        { id: 'diagnostic', t: 'Diagnostic tests', f: ['sensitivity = TP ÷ (TP + FN)', 'PPV = TP ÷ (TP + FP)'], d: 'How good a test is: of its true and false positives and negatives, ' +
                            'or of its sensitivity, its specificity and how common the illness is. Its sensitivity, specificity, predictive values, likelihood ratios and accuracy, with 95% intervals ' +
                            'of counts; a thousand people drawn by what the test says of them.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Counts', 'Rates'] }].concat(raw.by === '1' ? [{ k: 'se', l: 'Sensitivity, %', ph: '90', name: 'Sensitivity' },
                                    { k: 'sp', l: 'Specificity, %', ph: '95', name: 'Specificity' }, { k: 'pr', l: 'Prevalence, %', ph: '1', name: 'Prevalence' }] :
                                    [{ k: 'tp', l: 'True +', ph: '90', name: 'True +' }, { k: 'fp', l: 'False +', ph: '45', name: 'False +' }, { k: 'fn', l: 'False −', ph: '10', name: 'False −' },
                                        { k: 'tn', l: 'True −', ph: '855', name: 'True −' }]);
                            }, cols: 2, run: runDiagnostic, example: function (raw) { return raw.by === '1' ? { by: '1', se: '90', sp: '95', pr: '1' } : { by: '0', tp: '90', fp: '45', fn: '10', tn: '855' }; } },
                        { id: 'odds', t: 'Risk and odds', f: ['RR = (a ÷ (a + b)) ÷ (c ÷ (c + d))', 'OR = ad ÷ bc'], d: 'A study\'s 2 × 2 table, those exposed or treated and those not, with the outcome and ' +
                            'without: the risk of each, the relative risk and the odds ratio with their 95% intervals, the difference of the risks, and the number needed to treat, or to harm. Drawn.',
                            fields: [{ k: 'a', l: 'Exposed, with it', ph: '15', name: 'a' }, { k: 'b', l: 'Exposed, without', ph: '85', name: 'b' }, { k: 'c', l: 'Not, with it', ph: '30', name: 'c' },
                                { k: 'd', l: 'Not, without', ph: '70', name: 'd' }], cols: 2, run: runOdds, example: { a: '15', b: '85', c: '30', d: '70' } },
                        { id: 'epidemic', t: 'Epidemic, SIR', f: ['R<sub>0</sub> = β ÷ γ', 'herd immunity = 1 − 1/R<sub>0</sub>'], d: 'An epidemic of those who can catch it, S, the infectious, I, and the ' +
                            'recovered, R: of the people, those ill at first, R₀, the days ill and a part vaccinated, its peak, when, and how many catch it in all; and the part to vaccinate for herd immunity. ' +
                            'Drawn day by day.',
                            fields: [{ k: 'N', l: 'People', ph: '100000', name: 'People' }, { k: 'I', l: 'Ill at first', ph: '10', def: 1, name: 'Ill at first' }, { k: 'R0', l: 'R<sub>0</sub>', ph: '2.5', name: 'R₀' },
                                { k: 'D', l: 'Days ill', ph: '7', name: 'Days ill' }, { k: 'v', l: 'Vaccinated, %', ph: '0', def: 0, name: 'Vaccinated' }, { k: 'days', l: 'Days', ph: '180', def: 180, name: 'Days' }],
                            cols: 2, run: runEpidemic, example: { N: '100000', I: '10', R0: '2.5', D: '7' } },
                        { id: 'oxygen', t: 'Oxygen and haemoglobin', f: ['P<sub>50</sub> = 26.8 mmHg', 'O<sub>2</sub> = 1.34 Hb S + 0.003 PO<sub>2</sub>'], d: 'How much of haemoglobin carries O₂ at a PO₂, by ' +
                            'Severinghaus\'s curve, moved by the Bohr effect: a lower pH, more CO₂ or warmer to the right, giving O₂ up; fetal haemoglobin to the left, and myoglobin a hyperbola, far to the left. ' +
                            'Its P₅₀, the saturation, what it gives up from the lungs, 100 mmHg, to the tissues, 40, and with Hb the O₂ in the blood. Drawn beside the usual curve.',
                            fields: [{ k: 'of', l: 'Of', choice: ['Adult Hb', 'Fetal Hb', 'Myoglobin'] }, { k: 'po2', l: 'PO<sub>2</sub>, mmHg', ph: '100', name: 'PO₂' }, { k: 'pH', l: 'pH', ph: '7.4', def: 7.4, name: 'pH' },
                                { k: 'co2', l: 'PCO<sub>2</sub>, mmHg', ph: '40', def: 40, name: 'PCO₂' }, { k: 'T', l: 'T, °C', ph: '37', def: 37, name: 'T' }, { k: 'hb', l: 'Hb, g/dL', ph: 'optional', name: 'Hb' }],
                            cols: 2, run: runOxygen, example: function (raw) { return { of: raw.of || '0', po2: '60', pH: '7.2', co2: '50', T: '38', hb: '15' }; } },
                        { id: 'action', t: 'Action potential', f: 'C dV/dt = I − g<sub>Na</sub>m<sup>3</sup>h(V − E<sub>Na</sub>) − g<sub>K</sub>n<sup>4</sup>(V − E<sub>K</sub>) − g<sub>L</sub>(V − E<sub>L</sub>)',
                            d: 'Hodgkin and Huxley\'s squid axon: a current, µA/cm², for so long; whether it fires, its peak and how many times, at a temperature, 6.3 °C as theirs. Its voltage drawn, and its gates, ' +
                                'm opening Na⁺\'s channels and h closing them, n opening K⁺\'s.',
                            fields: [{ k: 'I', l: 'Current, µA/cm²', ph: '10', name: 'Current' }, { k: 'dur', l: 'For, ms', ph: '1', def: 1, name: 'For' }, { k: 't', l: 'Over, ms', ph: '30', def: 30, name: 'Over' },
                                { k: 'T', l: 'T, °C', ph: '6.3', def: 6.3, name: 'T' }], cols: 2, run: runAction, example: { I: '10' } },
                        { id: 'kidney', t: 'Kidneys', f: ['eGFR, CKD-EPI 2021', 'C = UV ÷ P'], d: 'The filtration of the kidneys: eGFR by CKD-EPI of 2021, without race, of creatinine, age and sex, and its stage; ' +
                            'with the weight, Cockcroft and Gault\'s creatinine clearance, used for doses. Or a clearance, of the urine\'s concentration, its flow and the plasma\'s; or the plasma\'s osmolality. ' +
                            'For learning, not to diagnose.',
                            fields: function (raw) {
                                var by = +raw.by || 0;
                                return [{ k: 'by', l: 'Of', choice: ['eGFR', 'Clearance', 'Osmolality'] }].concat(by === 1 ? [{ k: 'U', l: 'Urine, U', ph: '120', name: 'U' }, { k: 'V', l: 'Flow, mL/min', ph: '1', name: 'Flow' },
                                    { k: 'P', l: 'Plasma, P', ph: '1', name: 'P' }] : by === 2 ? [{ k: 'na', l: 'Na<sup>+</sup>, mmol/L', ph: '140', name: 'Na⁺' }, { k: 'glu', l: 'Glucose, mmol/L', ph: '5', name: 'Glucose' },
                                    { k: 'urea', l: 'Urea, mmol/L', ph: '5', name: 'Urea' }, { k: 'meas', l: 'Measured, mOsm/kg', ph: 'optional', name: 'Measured' }] :
                                    [{ k: 'scr', l: 'Creatinine', ph: '0.9', name: 'Creatinine' }, { k: 'unit', l: 'In', choice: ['mg/dL', 'µmol/L'] }, { k: 'age', l: 'Age', ph: '50', name: 'Age' },
                                        { k: 'sex', l: 'Sex', choice: ['Female', 'Male'] }, { k: 'w', l: 'Weight, kg', ph: 'optional', name: 'Weight' }]);
                            }, cols: 2, run: runKidney,
                            example: function (raw) {
                                return Object.assign({ by: raw.by || '0' }, [{ scr: raw.unit === '1' ? '80' : '0.9', unit: raw.unit || '0', age: '50', sex: raw.sex || '0', w: '70' }, { U: '120', V: '1', P: '1' },
                                    { na: '140', glu: '5', urea: '5', meas: '300' }][+raw.by || 0]);
                            } },
                        { id: 'body', t: 'BMI and energy', f: ['BMI = kg ÷ m<sup>2</sup>', 'BMR, Mifflin–St Jeor'], d: 'Of the height, weight, age and sex of an adult: the body mass index and its class, drawn, ' +
                            'the weights of a BMI of 18.5 to 25 at the height, the body\'s surface by Mosteller, the basal metabolic rate by Mifflin and St Jeor, and the energy a day at an activity.',
                            fields: [{ k: 'h', l: 'Height, cm', ph: '175', name: 'Height' }, { k: 'w', l: 'Weight, kg', ph: '70', name: 'Weight' }, { k: 'age', l: 'Age', ph: '30', name: 'Age' },
                                { k: 'sex', l: 'Sex', choice: ['Female', 'Male'] }, { k: 'act', l: 'Activity', choice: ['Sitting', 'Light', 'Moderate', 'Active', 'Very active'] }], cols: 2, run: runBody,
                            example: function (raw) { return { h: '175', w: '70', age: '30', sex: raw.sex || '1', act: raw.act || '2' }; } },
                        { id: 'drug', t: 'Drug levels', f: ['C = C<sub>0</sub>e<sup>−kt</sup>', 'k = ln 2 ÷ t<sub>½</sub>'], d: 'A drug given every so many hours, by IV bolus or by mouth: of the dose, its volume of distribution, ' +
                            'its half-life and, by mouth, the part absorbed and how fast, k<sub>a</sub>: its level over the doses, drawn, its peak and trough once steady, the clearance, the time to steady, ' +
                            'some 4 to 5 half-lives, and a loading dose to reach it at once. For learning, not to dose.',
                            fields: function (raw) {
                                return [{ k: 'route', l: 'Given', choice: ['IV bolus', 'By mouth'] }, { k: 'dose', l: 'Dose, mg', ph: '500', name: 'Dose' }, { k: 'V', l: 'V<sub>d</sub>, L', ph: '40', name: 'Vd' },
                                    { k: 'half', l: 't<sub>½</sub>, h', ph: '6', name: 't½' }, { k: 'tau', l: 'Every, h', ph: '8', name: 'Every' }, { k: 'n', l: 'Doses', ph: '6', def: 6, name: 'Doses' }]
                                    .concat(raw.route === '1' ? [{ k: 'F', l: 'F, absorbed', ph: '1', def: 1, name: 'F' }, { k: 'ka', l: 'k<sub>a</sub>, /h', ph: '1', def: 1, name: 'ka' }] : []);
                            }, cols: 2, drawnLast: true, run: runDrug,
                            example: function (raw) { return Object.assign({ route: raw.route || '0', dose: '500', V: '40', half: '6', tau: '8' }, raw.route === '1' ? { F: '0.8', ka: '1.2' } : {}); } }
                    ],
                    ecology: [
                        { id: 'popgrowth', t: 'Population growth', f: ['dN/dt = rN', 'dN/dt = rN(K – N)/K'], d: 'A population growing exponentially, at the rate r, or logistically, slowing to its carrying capacity K: ' +
                            'its size at t, how fast it grows then, the doubling time, and of the logistic, when it grows fastest, at K/2. Its curve drawn.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Growth', choice: ['Exponential', 'Logistic'] }, { k: 'N0', l: 'N<sub>0</sub>', ph: '50', name: 'N₀' }, { k: 'r', l: 'r', ph: '0.3' }, { k: 't', l: 't', ph: '20' }]
                                    .concat(raw.by === '1' ? [{ k: 'K', l: 'K', ph: '1000' }] : []);
                            }, cols: 2, drawnLast: true, run: runPopGrowth, example: function (raw) { return Object.assign({ by: raw.by || '0', N0: '50', r: '0.3', t: '20' }, raw.by === '1' ? { K: '1000' } : {}); } },
                        { id: 'predator', t: 'Predator and prey', f: ['dN/dt = aN – bNP', 'dP/dt = dNP – cP'], d: 'Lotka and Volterra: prey N, which grow at a and are eaten at b, and predators P, which die at c and ' +
                            'grow at d of what they eat: their cycles drawn over a time, and drawn against each other, round their balance, N = c/d and P = a/b.',
                            fields: [{ k: 'N', l: 'Prey', ph: '40', name: 'Prey' }, { k: 'P', l: 'Predators', ph: '9', name: 'Predators' }, { k: 'a', l: 'a', ph: '0.1' }, { k: 'b', l: 'b', ph: '0.02' },
                                { k: 'c', l: 'c', ph: '0.4' }, { k: 'd', l: 'd', ph: '0.02' }, { k: 't', l: 't', ph: '200', def: 200 }], cols: 2, run: runPredator,
                            example: { N: '40', P: '9', a: '0.1', b: '0.02', c: '0.4', d: '0.02', t: '200' } },
                        { id: 'recapture', t: 'Mark and recapture', f: 'N = MC ÷ R', d: 'The size of a population by Lincoln and Petersen: M marked and let go, then C caught, R of them marked; and by Chapman, ' +
                            'less biased of a few, with its 95% interval. The second catch drawn.',
                            fields: [{ k: 'M', l: 'Marked, M', ph: '50', name: 'M' }, { k: 'C', l: 'Caught, C', ph: '60', name: 'C' }, { k: 'R', l: 'Recaptured, R', ph: '12', name: 'R' }], cols: 3, run: runRecapture,
                            example: { M: '50', C: '60', R: '12' } },
                        { id: 'diversity', t: 'Diversity indices', f: ['D = Σn(n – 1) ÷ N(N – 1)', 'H = −Σp ln p'], d: 'The diversity of a community, of the count of each species: the richness, Simpson\'s index, ' +
                            'its 1 – D and 1/D, Shannon\'s H and its evenness; the species drawn, the commonest first.',
                            fields: [{ k: 'c', l: 'Counts', ph: '25 18 12 6 3', text: true, cls: 'calc-sv-wide' }], cols: 1, spaces: ['c'], run: runDiversity, example: { c: '25 18 12 6 3 1' } },
                        { id: 'lifetable', t: 'Life table', f: ['l<sub>x</sub> = n<sub>x</sub> ÷ n<sub>0</sub>', 'e<sub>x</sub> = T<sub>x</sub> ÷ n<sub>x</sub>'], d: 'How many of a cohort are alive at the start of each age: ' +
                            'the part surviving, those dying, the chance of dying in each and how long each has left to live; the survivorship curve drawn on a scale of logarithms, ' +
                            'as type I, II or III.',
                            fields: [{ k: 'n', l: 'Alive, nₓ', ph: '1000 850 700 400 100 0', text: true, cls: 'calc-sv-wide', name: 'Alive' }], cols: 1, spaces: ['n'], run: runLifeTable,
                            example: { n: '1000 950 900 850 750 500 150 0' } },
                        { id: 'pyramid', t: 'Energy pyramid', f: '10% to the next level', d: 'The energy at each trophic level, from the producers up, so much passing on each step, some 10%. Drawn.',
                            fields: [{ k: 'E', l: 'Producers', ph: '100000', name: 'Producers' }, { k: 'pc', l: 'Passed on, %', ph: '10', def: 10, name: 'Passed on' }, { k: 'n', l: 'Levels', ph: '4', def: 4, name: 'Levels' }],
                            cols: 3, run: runPyramid, example: { E: '100000' } },
                        { id: 'productivity', t: 'Primary productivity', f: ['GPP = NPP + R', 'mg C = 0.375 × mg O<sub>2</sub>'], d: 'By light and dark bottles: the dissolved oxygen at first, in the light and in the dark, ' +
                            'mg/L, after so many hours: the net and gross primary productivity and the respiration, as O₂ and as carbon, drawn.',
                            fields: [{ k: 'i', l: 'At first', ph: '8.2', name: 'At first' }, { k: 'l', l: 'Light', ph: '9.6', name: 'Light' }, { k: 'd', l: 'Dark', ph: '7.1', name: 'Dark' }, { k: 'h', l: 'Hours', ph: '24', def: 24, name: 'Hours' }],
                            cols: 2, run: runProductivity, example: { i: '8.2', l: '9.6', d: '7.1' } },
                        { id: 'selection', t: 'Natural selection', f: 'p′ = (p<sup>2</sup>w<sub>AA</sub> + pqw<sub>Aa</sub>) ÷ w̄', d: 'A gene under selection, mating at random: p of A at first and the fitness of AA, Aa and aa: ' +
                            'p and q after so many generations, drawn, and the mean fitness.',
                            fields: [{ k: 'p', l: 'p', ph: '0.1' }, { k: 'gens', l: 'Generations', ph: '50', def: 50, name: 'Generations' }, { k: 'w1', l: 'w<sub>AA</sub>', ph: '1', def: 1, name: 'wAA' },
                                { k: 'w2', l: 'w<sub>Aa</sub>', ph: '1', def: 1, name: 'wAa' }, { k: 'w3', l: 'w<sub>aa</sub>', ph: '0.8', name: 'waa' }], cols: 2, run: runSelection, example: { p: '0.1', gens: '50', w3: '0.8' } },
                        { id: 'drift', t: 'Genetic drift', f: 'H<sub>t</sub> = H<sub>0</sub>(1 – 1/2N)<sup>t</sup>', d: 'Chance alone: populations of N each, p of an allele at first, drawn generation by generation ' +
                            'as Wright and Fisher have it, how many fix or lose it, and the heterozygosity left. Again for another run.',
                            fields: [{ k: 'N', l: 'N', ph: '20' }, { k: 'p', l: 'p', ph: '0.5', def: 0.5 }, { k: 'gens', l: 'Generations', ph: '100', def: 100, name: 'Generations' }, { k: 'pops', l: 'Populations', ph: '8', def: 8, name: 'Populations' }],
                            cols: 2, again: true, run: runDrift, example: { N: '20', p: '0.5' } },
                        { id: 'leslie', t: 'Leslie matrix', f: ['n<sub>t+1</sub> = Ln<sub>t</sub>', 'λ'], d: 'A population by its ages: the births to each of each age, the part of each surviving to the next, ' +
                            'and the numbers of each at first: λ, how much it grows each step, the ages it settles to, R₀, each one\'s offspring in its life, and its numbers step by step, drawn by age.',
                            fields: [{ k: 'f', l: 'Births, of each age', ph: '0 1.5 2 0.5', text: true, cls: 'calc-sv-wide', aria: 'Births' }, { k: 's', l: 'Surviving to the next', ph: '0.5 0.8 0.6', text: true, cls: 'calc-sv-wide', aria: 'Surviving' },
                                { k: 'n', l: 'At first', ph: '100 50 30 10', text: true, cls: 'calc-sv-wide', aria: 'At first' }, { k: 'y', l: 'Steps', ph: '12', def: 12, name: 'Steps' }], cols: 1, spaces: ['f', 's', 'n'], run: runLeslie,
                            example: { f: '0 1.5 2 0.5', s: '0.5 0.8 0.6', n: '100 50 30 10' } },
                        { id: 'competition', t: 'Competition', f: 'dN<sub>1</sub>/dt = r<sub>1</sub>N<sub>1</sub>(K<sub>1</sub> − N<sub>1</sub> − α<sub>12</sub>N<sub>2</sub>) ÷ K<sub>1</sub>', d: 'Two species competing for ' +
                            'the same, by Lotka and Volterra: each one\'s numbers, r and K, and how much each takes of the other\'s room, α: which wins, or whether both live on, and at what; their numbers ' +
                            'over time, drawn, and against each other, with each one\'s isocline, where it stops growing.',
                            fields: [{ k: 'n1', l: 'N<sub>1</sub>', ph: '10', name: 'N₁' }, { k: 'n2', l: 'N<sub>2</sub>', ph: '10', name: 'N₂' }, { k: 'r1', l: 'r<sub>1</sub>', ph: '0.5', name: 'r₁' },
                                { k: 'r2', l: 'r<sub>2</sub>', ph: '0.4', name: 'r₂' }, { k: 'k1', l: 'K<sub>1</sub>', ph: '100', name: 'K₁' }, { k: 'k2', l: 'K<sub>2</sub>', ph: '80', name: 'K₂' },
                                { k: 'a12', l: 'α<sub>12</sub>', ph: '0.5', name: 'α₁₂' }, { k: 'a21', l: 'α<sub>21</sub>', ph: '0.6', name: 'α₂₁' }, { k: 't', l: 't', ph: '60', def: 60 }], cols: 2, run: runCompetition,
                            example: { n1: '10', n2: '10', r1: '0.5', r2: '0.4', k1: '100', k2: '80', a12: '0.5', a21: '0.6' } },
                        { id: 'species', t: 'Species, area and rarefaction', f: ['S = cA<sup>z</sup>', 'E(S<sub>n</sub>)'], d: 'Of areas and the species in each, a pair on each line: the species–area curve, ' +
                            'S = cA<sup>z</sup>, fitted, its z and c, and the species of another area. Or of the count of each species in a sample: the species expected in a smaller sample, by rarefaction, ' +
                            'drawn, and by Chao1 the species there likely are, those not seen too.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['Areas', 'Counts'] }].concat(raw.by === '1' ? [{ k: 'c', l: 'Counts', ph: '45 30 22 12 8 5 3 2 1 1', text: true, cls: 'calc-sv-wide', aria: 'Counts' },
                                    { k: 'n', l: 'Sample of', ph: 'optional', name: 'Sample of' }] : [{ k: 'pts', l: 'Areas', ph: 'A S&#10;1 5&#10;10 11&#10;100 24', area: true }, { k: 'A', l: 'Area', ph: 'optional', name: 'Area' }]);
                            }, cols: 2, spaces: ['c'], run: runSpecies,
                            example: function (raw) { return raw.by === '1' ? { by: '1', c: '45 30 22 12 8 5 3 2 2 1 1 1', n: '50' } : { by: '0', pts: '1 5\n10 11\n100 24\n1000 52\n10000 110', A: '5000' }; } },
                        { id: 'tree', t: 'Distance tree', f: ['UPGMA', 'Neighbour joining'], d: 'A tree of how alike taxa are: of a matrix of distances, a taxon to a line, its name and its distances; ' +
                            'or of aligned sequences, a name and its sequence on each line, all of one length, by their Jukes–Cantor distances; by UPGMA, as of a steady molecular clock, or by neighbour joining. ' +
                            'The tree drawn, and in Newick to copy.',
                            fields: [{ k: 'by', l: 'Of', choice: ['Distances', 'Sequences'] }, { k: 'how', l: 'By', choice: ['UPGMA', 'Neighbour joining'] },
                                { k: 'd', l: 'Taxa', ph: 'Human 0 0.095 0.113&#10;Chimp 0.095 0 0.118&#10;…', area: true }], cols: 2, run: runTree,
                            example: function (raw) { return { by: raw.by || '0', how: raw.how || '0', d: raw.by === '1' ? TREE_SEQS : TREE_DIST }; } },
                        { id: 'clock', t: 'Molecular clock', f: ['d = −¾ ln(1 − 4p/3)', 'T = d ÷ 2r'], d: 'How long ago two lineages split: of the part of the sites that differ, p, or of two aligned sequences, ' +
                            'the substitutions a site by Jukes and Cantor, sites changing more than once, and by Kimura, of transitions and transversions; with a rate of substitutions a site a year, ' +
                            'some 10⁻⁹ of mammals\' DNA, the time since they split; or of that time, the rate. p and d drawn.',
                            fields: function (raw) {
                                return [{ k: 'by', l: 'Of', choice: ['p', 'Two sequences'] }].concat(raw.by === '1' ? [{ k: 'a', l: 'Sequence 1', ph: 'ACGTTAGCCTAGG…', area: true }, { k: 'b', l: 'Sequence 2', ph: 'ACGATAGCATAGG…', area: true }] :
                                    [{ k: 'p', l: 'p', ph: '0.1' }], [{ k: 'r', l: 'Rate, /site/year', ph: '1e-9', name: 'Rate' }, { k: 'T', l: 'Or the time, years', ph: 'optional', name: 'Time' }]);
                            }, cols: 2, run: runClock,
                            example: function (raw) { return raw.by === '1' ? { by: '1', a: TREE_SEQS.split('\n')[0].split(' ')[1], b: TREE_SEQS.split('\n')[3].split(' ')[1], r: '1e-9' } : { by: '0', p: '0.1', r: '1e-9' }; } }
                    ]
                };

            // ----- the drawings of the biology ----- //

            // where a value is on a scale from lo to hi, its good part from good[0] to good[1] darker, marks [[value, name]] under it
            function gaugeDrawing(label, v, lo, hi, good, marks) {
                var W = 300, x = function (t) { return 10 + (W - 20) * (Math.max(lo, Math.min(hi, t)) - lo) / (hi - lo); }, at = x(v), body;
                body = '<rect class="calc-sv-under" x="10" y="10" width="' + (W - 20) + '" height="14"/>' +
                    (good ? '<rect class="calc-sv-bar" x="' + fix(x(good[0])) + '" y="10" width="' + fix(x(good[1]) - x(good[0])) + '" height="14"/>' : '');
                (marks || []).forEach(function (m) { body += svgText(x(m[0]), 42, m[1], m[0] <= lo ? 'start' : m[0] >= hi ? 'end' : 'middle'); });
                return svgOf('', W, 48, label, body + '<path class="calc-sv-ground" d="M10 10h' + (W - 20) + 'v14H10Z"/><path class="calc-sv-head calc-sv-head-red" d="M' + fix(at) +
                    ' 24l-5 7h10Z"/><path class="calc-sv-curve" d="M' + fix(at) + ' 7V24"/>');
            }

            // The Punnett square of a cross: the gametes of one parent down its side and of the other along its top, each meeting's
            // genotype in its square, coloured by its phenotype, the colours named under it. Of up to 8 gametes each
            function punnettDrawing(r) {
                var g1 = r.gametes[0], g2 = r.gametes[1], head = 34, size = Math.min(44, (300 - 8 - head) / Math.max(g2.length, 2)), x0 = (300 - head - g2.length * size) / 2,
                    kinds = r.phenotypes.map(function (p) { return p[0]; }), font = size < 30 ? 7.5 : size < 40 ? 9.5 : 12, body = '', H;
                if (g1.length > 8 || g2.length > 8) return '';
                g2.forEach(function (g, j) { body += svgText(x0 + head + (j + 0.5) * size, head - 10, g[0], 'middle', 'calc-sv-small calc-sv-bold'); });
                g1.forEach(function (g, i) { body += svgText(x0 + head - 8, head + (i + 0.5) * size + 3.5, g[0], 'end', 'calc-sv-small calc-sv-bold'); });
                r.grid.forEach(function (row, i) {
                    row.forEach(function (c, j) {
                        var x = x0 + head + j * size, y = head + i * size;
                        body += '<rect class="calc-bio-sq" x="' + fix(x) + '" y="' + fix(y) + '" width="' + fix(size) + '" height="' + fix(size) + '" fill="' + LIGHT_TINTS[kinds.indexOf(c[1]) % 8] + '"/>' +
                            '<text x="' + fix(x + size / 2) + '" y="' + fix(y + size / 2 + font * 0.35) + '" text-anchor="middle" style="font-size: ' + font + 'px">' + c[0] + '</text>';
                    });
                });
                H = head + g1.length * size + 6;
                if (kinds.length <= 8) { // the key of the colours, four to a line
                    kinds.forEach(function (k, i) {
                        var x = 14 + (i % 4) * 72, y = H + 4 + Math.floor(i / 4) * 16;
                        body += '<rect class="calc-bio-sq" x="' + x + '" y="' + y + '" width="10" height="10" fill="' + LIGHT_TINTS[i % 8] + '"/>' + svgText(x + 14, y + 9, k);
                    });
                    H += 8 + Math.ceil(kinds.length / 4) * 16;
                }
                return svgOf('', 300, H, 'The Punnett square, coloured by phenotype', body);
            }

            // alleles of the X, each written X with it raised, and the Y: ['A', 'a'] is XᴬXᵃ, ['a', 'Y'] Xᵃ Y
            function xText(list) {
                var s = '', up = false;
                list.forEach(function (a) {
                    if (a === 'Y') {
                        s += up ? '<tspan dy="5">Y</tspan>' : 'Y';
                        up = false;
                        return;
                    }
                    s += (up ? '<tspan dy="5">X</tspan>' : 'X') + '<tspan dy="-5" style="font-size: 8px">' + a + '</tspan>';
                    up = true;
                });
                return s;
            }

            // the square of a cross of the X: the mother's X down its side, the father's X and Y along its top; daughters and sons coloured
            // by phenotype, a carrier between
            function xDrawing(r) {
                var head = 40, size = 58, x0 = (300 - head - 2 * size) / 2, body = '', tint = function (pair) {
                    var a = pair[0], b = pair[1], big = function (c) { return c === c.toUpperCase() && c !== 'Y'; };
                    return b === 'Y' ? (big(a) ? LIGHT_TINTS[0] : LIGHT_TINTS[3]) : big(a) && big(b) ? LIGHT_TINTS[0] : big(a) || big(b) ? LIGHT_TINTS[1] : LIGHT_TINTS[3];
                };
                [[r.father], ['Y']].forEach(function (g, j) { body += '<text x="' + fix(x0 + head + (j + 0.5) * size) + '" y="' + (head - 12) + '" text-anchor="middle" class="calc-sv-bold">' + xText(g) + '</text>'; });
                r.mother.forEach(function (m, i) {
                    body += '<text x="' + fix(x0 + head - 8) + '" y="' + fix(head + (i + 0.5) * size + 4) + '" text-anchor="end" class="calc-sv-bold">' + xText([m]) + '</text>';
                    [[m, r.father], [m, 'Y']].forEach(function (pair, j) {
                        var x = x0 + head + j * size, y = head + i * size;
                        body += '<rect class="calc-bio-sq" x="' + fix(x) + '" y="' + y + '" width="' + size + '" height="' + size + '" fill="' + tint(pair) + '"/>' +
                            '<text x="' + fix(x + size / 2) + '" y="' + fix(y + size / 2 + 2) + '" text-anchor="middle">' + xText(pair) + '</text>' +
                            svgText(x + size / 2, y + size - 8, j ? 'son' : 'daughter', 'middle');
                    });
                });
                return svgOf('', 300, head + 2 * size + 6, 'The square of the cross, daughters and sons', body);
            }

            // A chromosome, its genes at their places, named above, and the distance between each two under it: loci [[name, cM]] in order
            function chromosomeDrawing(loci) {
                var a = 30, b = 270, last = loci[loci.length - 1][1] || 1, x = function (cm) { return a + (b - a) * cm / last; }, body;
                body = '<rect class="calc-bio-chrom" x="' + (a - 14) + '" y="30" width="' + (b - a + 28) + '" height="12" rx="6"/>';
                loci.forEach(function (l, i) {
                    var at = x(l[1]);
                    body += '<path class="calc-sv-curve" d="M' + fix(at) + ' 26V46"/>' + svgText(at, 20, '<tspan font-style="italic">' + escaped(l[0]) + '</tspan>', 'middle', 'calc-sv-small calc-sv-bold');
                    if (i) {
                        var from = x(loci[i - 1][1]);
                        body += '<path class="calc-sv-guide" d="M' + fix(from) + ' 54H' + fix(at) + '"/><path class="calc-sv-ground" d="M' + fix(from) + ' 50V58M' + fix(at) + ' 50V58"/>' +
                            svgText((from + at) / 2, 68, shortNum(l[1] - loci[i - 1][1]) + ' cM', 'middle');
                    }
                });
                return svgOf('', 300, 74, 'The genes on the chromosome, the distances between them', body);
            }

            // an agarose gel: a ladder in the first lane, sizes beside it, then each lane's bands [[bp, brightness 0 to 1]], each as far down as
            // its size on a scale of logarithms: lanes [[name, bands]]
            function gelDrawing(lanes) {
                var all = [], W = 300, H = 172, gx = 46, gw = W - gx - 8, T = 22, B = H - 6, top, ladder, lo, hi, body, w, y, last = -99;
                lanes.forEach(function (l) { l[1].forEach(function (b) { all.push(b[0]); }); });
                if (!all.length) return '';
                top = Math.max.apply(null, all);
                ladder = top <= 1500 ? [1500, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100] : [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 750, 500, 250];
                hi = Math.max(ladder[0], top) * 1.15;
                lo = ladder[ladder.length - 1] * 0.6; // smaller fragments run to the bottom
                y = function (bp) { return T + 12 + (B - T - 18) * (Math.log(hi) - Math.log(Math.max(bp, lo))) / (Math.log(hi) - Math.log(lo)); };
                lanes = [['Ladder', ladder.map(function (bp) { return [bp, bp === 1000 || (bp === 500 && top <= 1500) ? 1 : 0.55]; })]].concat(lanes);
                w = gw / lanes.length;
                body = '<rect class="calc-sv-screen" x="' + gx + '" y="' + T + '" width="' + gw + '" height="' + (B - T) + '" rx="3"/>';
                lanes.forEach(function (l, i) {
                    var cx = gx + w * (i + 0.5), bw = Math.min(40, w * 0.62);
                    body += '<rect class="calc-bio-well" x="' + fix(cx - bw / 2) + '" y="' + (T + 4) + '" width="' + fix(bw) + '" height="4"/>' + svgText(cx, T - 6, l[0], 'middle');
                    l[1].forEach(function (b) {
                        body += '<rect class="calc-bio-band" x="' + fix(cx - bw / 2) + '" y="' + fix(y(b[0]) - 1.5) + '" width="' + fix(bw) + '" height="3" rx="1" opacity="' +
                            (0.3 + 0.7 * b[1]).toFixed(2) + '"><title>' + b[0] + ' bp</title></rect>';
                    });
                });
                ladder.forEach(function (bp) { // named where there is room
                    if (y(bp) - last < 10) return;
                    last = y(bp);
                    body += svgText(gx - 4, last + 3.5, shortNum(bp), 'end');
                });
                return svgOf('', W, H, 'The gel, a ladder beside the fragments', body);
            }

            // where the enzymes cut, along a line or round a circle, each named, on either side in turn
            function siteDrawing(L, cuts, circular) {
                var body = '';
                if (circular) {
                    body += '<circle class="calc-bio-ring" cx="150" cy="68" r="44"/>' + svgText(150, 72, shortNum(L) + ' bp', 'middle', 'calc-sv-small calc-sv-bold');
                    cuts.forEach(function (c) {
                        var a = 2 * Math.PI * c.at / L, s = Math.sin(a), k = Math.cos(a);
                        body += '<path class="calc-sv-curve" d="M' + fix(150 + 38 * s) + ' ' + fix(68 - 38 * k) + 'L' + fix(150 + 50 * s) + ' ' + fix(68 - 50 * k) + '"/>' +
                            svgText(150 + 56 * s, 68 - 56 * k + 3.5, c.name + ' ' + c.at, s > 0.15 ? 'start' : s < -0.15 ? 'end' : 'middle');
                    });
                    return svgOf('', 300, 136, 'Where the enzymes cut, round the circle', body);
                }
                var a = 14, b = 286, x = function (p) { return a + (b - a) * p / L; };
                body += '<path class="calc-sv-ground" d="M' + a + ' 40H' + b + '"/>' + svgText(a, 72, '1', 'start') + svgText(b, 72, shortNum(L), 'end');
                cuts.forEach(function (c, i) {
                    var up = i % 2 === 0;
                    body += '<path class="calc-sv-curve" d="M' + fix(x(c.at)) + ' 33V47"/>' + svgText(Math.max(a + 20, Math.min(b - 20, x(c.at))), up ? 26 : 60, c.name + ' ' + c.at, 'middle');
                });
                return svgOf('', 300, 78, 'Where the enzymes cut, along it', body);
            }

            // The standard code as a wheel, read from its middle out: the first base, the second and the third, then the amino acid,
            // each codon coloured by its amino acid's kind, a stop grey. A codon or an amino acid clicked types itself in the box k; the
            // codons of lit, a list, ringed red
            function codonWheel(k, lit) {
                var cx = 150, cy = 150, r = [0, 30, 58, 88, 142], ord = 'UCAG', body = '', top = '', step = Math.PI / 32, i, j, c;
                function at(rad, a) { return fix(cx + rad * Math.sin(a)) + ' ' + fix(cy - rad * Math.cos(a)); }
                function sector(r0, r1, a0, a1) {
                    var big = a1 - a0 > Math.PI ? 1 : 0;
                    return (r0 ? 'M' + at(r0, a0) + 'L' : 'M' + cx + ' ' + cy + 'L') + at(r1, a0) + 'A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + at(r1, a1) +
                        (r0 ? 'L' + at(r0, a1) + 'A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + at(r0, a0) : '') + 'Z';
                }
                function word(rad, a, s, size, turn, bold) { // a word at a place on the wheel, along its radius where turned, never upside down
                    var deg = a * 180 / Math.PI, x = cx + rad * Math.sin(a), y = cy - rad * Math.cos(a);
                    deg = deg <= 180 ? deg - 90 : deg + 90;
                    return '<text x="' + fix(x) + '" y="' + fix(y) + '" text-anchor="middle" dominant-baseline="central" style="font-size: ' + size + 'px' + (bold ? '; font-weight: bold' : '') + '"' +
                        (turn ? ' transform="rotate(' + fix(deg) + ' ' + fix(x) + ' ' + fix(y) + ')"' : '') + '>' + s + '</text>';
                }
                for (i = 0; i < 4; i++) {
                    body += '<path class="calc-bio-ring" d="' + sector(0, r[1], i * Math.PI / 2, (i + 1) * Math.PI / 2) + '"/>' + word(16, (i + 0.5) * Math.PI / 2, ord.charAt(i), 13, false, true);
                    for (j = 0; j < 4; j++) {
                        c = 4 * i + j;
                        body += '<path class="calc-bio-ring" d="' + sector(r[1], r[2], c * Math.PI / 8, (c + 1) * Math.PI / 8) + '"/>' + word(44, (c + 0.5) * Math.PI / 8, ord.charAt(j), 10, false, true);
                    }
                }
                for (i = 0; i < 16; i++) { // each block of four codons: its third bases, and its amino acids, one arc for a run of the same
                    var run = null;
                    for (j = 0; j <= 4; j++) {
                        var codon = j < 4 ? ord.charAt(i >> 2) + ord.charAt(i & 3) + ord.charAt(j) : '', aa = j < 4 ? CalcBiology.codon(codon) : '', n = 4 * i + j, kind, cell;
                        if (j < 4) {
                            kind = aa === '*' ? STOP_TINT : KIND_TINTS[CalcBiology.byOne[aa].kind];
                            cell = '<path class="calc-bio-cell' + (lit.indexOf(codon) > -1 ? ' calc-bio-lit' : '') + '" d="' + sector(r[2], r[3], n * step, (n + 1) * step) + '" fill="' + kind +
                                '" data-fill="' + k + '" data-v="' + codon + '"><title>' + codon + ': ' + (aa === '*' ? 'stop' : CalcBiology.byOne[aa].name) + '</title></path>' + word(73, (n + 0.5) * step, ord.charAt(j), 7.5);
                            if (lit.indexOf(codon) > -1) top += cell; else body += cell;
                        }
                        if (run && (j === 4 || aa !== run.aa)) {
                            var name = run.aa === '*' ? 'Stop' : CalcBiology.byOne[run.aa].three;
                            body += '<g class="calc-bio-cell" data-fill="' + k + '" data-v="' + name + '"><title>' + (run.aa === '*' ? 'Stop' : CalcBiology.byOne[run.aa].name) + '</title><path d="' +
                                sector(r[3], r[4], run.from * step, n * step) + '" fill="' + (run.aa === '*' ? STOP_TINT : KIND_TINTS[CalcBiology.byOne[run.aa].kind]) + '"/>' +
                                word(116, (run.from + n) / 2 * step, name, 9, true) + '</g>';
                            run = null;
                        }
                        if (j < 4 && !run) run = { aa: aa, from: n };
                    }
                }
                return svgOf('calc-bio-wheel', 300, 300, 'The codon wheel', body + top);
            }

            // the twenty amino acids as tiles, ten to a row, coloured by kind, the kinds named under them; one clicked types its name in
            // the box k, the one chosen ringed red
            function aminoGrid(k, chosen) {
                var size = 28, x0 = (300 - 10 * size) / 2, body = '', top = '';
                CalcBiology.aminoAcids.forEach(function (a, i) {
                    var x = x0 + (i % 10) * size, y = 4 + Math.floor(i / 10) * (size + 6), tile = '<g class="calc-bio-cell" data-fill="' + k + '" data-v="' + a.three + '"><title>' + a.name + '</title>' +
                        '<rect x="' + fix(x + 1) + '" y="' + y + '" width="' + (size - 2) + '" height="' + (size + 4) + '" rx="3" fill="' + KIND_TINTS[a.kind] + '"' + (a === chosen ? ' class="calc-bio-lit"' : '') + '/>' +
                        '<text x="' + fix(x + size / 2) + '" y="' + (y + 15) + '" text-anchor="middle" style="font-size: 13px; font-weight: bold">' + a.one + '</text>' +
                        '<text x="' + fix(x + size / 2) + '" y="' + (y + 27) + '" text-anchor="middle" style="font-size: 8px">' + a.three + '</text></g>';
                    if (a === chosen) top += tile; else body += tile;
                });
                CalcBiology.kinds.forEach(function (name, i) {
                    body += '<rect class="calc-bio-sq" x="' + (6 + i * 60) + '" y="78" width="10" height="10" fill="' + KIND_TINTS[i] + '"/>' + svgText(20 + i * 60, 87, name);
                });
                return svgOf('', 300, 94, 'The amino acids, by kind', body + top);
            }

            // a circle of DNA, its parts as arcs round it, each as long as its share, named outside, the lit one red; its length in the middle
            function plasmidDrawing(label, parts) {
                var cx = 150, cy = 64, rad = 44, total = 0, a = 0, body = '';
                parts.forEach(function (p) { total += p[1]; });
                if (!(total > 0)) return '';
                parts.forEach(function (p) {
                    var a1 = a + 2 * Math.PI * p[1] / total, mid = (a + a1) / 2, gap = 0.04, pt = function (t) { return fix(cx + rad * Math.sin(t)) + ' ' + fix(cy - rad * Math.cos(t)); };
                    body += '<path class="' + (p[2] ? 'calc-sv-curve' : 'calc-sv-seg') + ' calc-bio-arc" d="M' + pt(a + gap) + 'A' + rad + ' ' + rad + ' 0 ' + (a1 - a > Math.PI ? 1 : 0) + ' 1 ' + pt(a1 - gap) + '"/>' +
                        svgText(cx + (rad + 14) * Math.sin(mid), cy - (rad + 14) * Math.cos(mid) + 3.5, p[0], Math.sin(mid) > 0.2 ? 'start' : Math.sin(mid) < -0.2 ? 'end' : 'middle');
                    a = a1;
                });
                return svgOf('', 300, 128, label, body + svgText(cx, cy - 1, shortNum(total), 'middle', 'calc-sv-small calc-sv-bold') + svgText(cx, cy + 11, 'bp', 'middle'));
            }

            // the colour of a liquid, the stronger the darker
            function liquid(s) {
                return 'rgba(176, 65, 77, ' + (0.08 + 0.8 * Math.max(0, Math.min(1, s))).toFixed(2) + ')';
            }

            // Tubes side by side, each filled with its parts from the bottom up, [[height 0 to 1, strength 0 to 1]], named above and under:
            // tubes [{ top, under, parts }]; where moves, an arrow from each to the next, as a serial dilution goes
            function tubesDrawing(label, tubes, moves) {
                var W = 300, n = tubes.length, slot = Math.min(64, (W - 16) / n), tw = Math.min(24, slot * 0.5), x0 = (W - slot * n) / 2, T = 22, B = 104, body = '';
                tubes.forEach(function (t, i) {
                    var cx = x0 + slot * (i + 0.5), x = cx - tw / 2, r = tw / 2, id = 'calc-plot-' + (++app.plotIds), from = 0,
                        d = 'M' + fix(x) + ' ' + T + 'V' + fix(B - r) + 'A' + fix(r) + ' ' + fix(r) + ' 0 0 0 ' + fix(x + tw) + ' ' + fix(B - r) + 'V' + T;
                    body += '<clipPath id="' + id + '"><path d="' + d + 'Z"/></clipPath><g clip-path="url(#' + id + ')">';
                    t.parts.forEach(function (p) {
                        var y1 = B - (B - T) * from, y0 = B - (B - T) * (from + p[0]);
                        body += '<rect x="' + fix(x) + '" y="' + fix(y0) + '" width="' + fix(tw) + '" height="' + fix(y1 - y0 + 0.4) + '" fill="' + liquid(p[1]) + '"/>';
                        from += p[0];
                    });
                    body += '</g><path class="calc-bio-tube" d="' + d + '"/>';
                    if (t.top) body += svgText(cx, T - 6, t.top, 'middle');
                    if (t.under) body += svgText(cx, B + 13, t.under, 'middle');
                    if (moves && i < n - 1) body += svgArrow(cx + tw / 2 + 3, T + 10, cx + slot - tw / 2 - 3, T + 10, 'calc-sv-seg calc-sv-thin');
                });
                return svgOf('', W, B + 18, label, body);
            }

            // a haemocytometer's nine large squares, the corners counted first, then the middle, each with its count
            function hemoDrawing(counts) {
                var s = 36, x0 = 150 - 1.5 * s, y0 = 6, order = [0, 2, 6, 8, 4, 1, 3, 5, 7], body = '', i;
                for (i = 1; i < 5; i++) body += '<path class="calc-sv-axis" d="M' + fix(x0 + s + i * s / 5) + ' ' + (y0 + s) + 'v' + s + 'M' + fix(x0 + s) + ' ' + fix(y0 + s + i * s / 5) + 'h' + s + '"/>';
                for (i = 0; i < 9; i++) {
                    var k = order.indexOf(i), x = x0 + (i % 3) * s, y = y0 + Math.floor(i / 3) * s, counted = k < counts.length;
                    body = (counted ? '<rect class="calc-sv-under" x="' + fix(x) + '" y="' + y + '" width="' + s + '" height="' + s + '"/>' : '') + body +
                        '<rect class="calc-bio-sq calc-bio-empty" x="' + fix(x) + '" y="' + y + '" width="' + s + '" height="' + s + '"/>';
                    if (counted) body += svgText(x + s / 2, y + s / 2 + 4, shortNum(counts[k]), 'middle', 'calc-sv-small calc-sv-bold');
                }
                return svgOf('', 300, 3 * s + 12, 'The squares counted, each with its count', body);
            }

            // a plate with its colonies, up to 600 drawn, at random but the same for the same count
            function petriDrawing(n) {
                var cx = 150, cy = 62, R = 54, rnd = CalcBiology.seeded(Math.round(n) * 7919 + 1), body = '<circle class="calc-bio-agar" cx="' + cx + '" cy="' + cy + '" r="' + R + '"/>', k, a, d;
                for (k = 0; k < Math.min(n, 600); k++) {
                    a = 2 * Math.PI * rnd();
                    d = (R - 5) * Math.sqrt(rnd());
                    body += '<circle class="calc-bio-colony" cx="' + fix(cx + d * Math.cos(a)) + '" cy="' + fix(cy + d * Math.sin(a)) + '" r="' + fix(1.3 + 1.8 * rnd()) + '"/>';
                }
                return svgOf('', 300, 124, 'The plate and its colonies', body + (n > 300 ? svgText(cx + R + 8, cy + 4, 'Too many to count', 'start', 'calc-sv-small calc-sv-red') : ''));
            }

            // a rotor from above, a tube in it at the radius r, turning
            function rotorDrawing(r) {
                var cx = 150, cy = 62, a = -Math.PI / 5, s = Math.sin(a), k = Math.cos(a), body;
                body = '<circle class="calc-bio-ring" cx="' + cx + '" cy="' + cy + '" r="52"/><circle class="calc-sv-mid" cx="' + cx + '" cy="' + cy + '" r="3"/>' +
                    '<path class="calc-bio-tube calc-bio-tube-in" d="M' + fix(cx + 20 * s - 5 * k) + ' ' + fix(cy - 20 * k - 5 * s) + 'L' + fix(cx + 42 * s - 5 * k) + ' ' + fix(cy - 42 * k - 5 * s) +
                    'A5 5 0 0 0 ' + fix(cx + 42 * s + 5 * k) + ' ' + fix(cy - 42 * k + 5 * s) + 'L' + fix(cx + 20 * s + 5 * k) + ' ' + fix(cy - 20 * k + 5 * s) + 'Z"/>' +
                    '<path class="calc-sv-guide" d="M' + cx + ' ' + cy + 'L' + fix(cx + 47 * s) + ' ' + fix(cy - 47 * k) + '"/>' + svgText(cx + 30 * s - 10, cy - 30 * k + 4, 'r = ' + shortNum(r) + ' cm', 'end') +
                    '<path class="calc-sv-seg calc-sv-thin" d="M' + fix(cx + 60) + ' ' + cy + 'A60 60 0 0 1 ' + fix(cx + 60 * Math.cos(0.9)) + ' ' + fix(cy + 60 * Math.sin(0.9)) + '"/>' +
                    svgArrow(cx + 60 * Math.cos(0.8), cy + 60 * Math.sin(0.8), cx + 60 * Math.cos(1), cy + 60 * Math.sin(1), 'calc-sv-seg calc-sv-thin');
                return svgOf('', 300, 126, 'The rotor, and its radius to the tube\'s bottom', body);
            }

            // the means of groups as bars, each with its error bar, ± so much, named under it: groups [[name, mean, ±]]
            function errorDrawing(groups) {
                var W = 300, L = 36, R = 292, T = 10, B = 106, hi = 0, lo = 0, slot, body = '', y;
                groups.forEach(function (g) {
                    hi = Math.max(hi, g[1] + g[2]);
                    lo = Math.min(lo, g[1] - g[2]);
                });
                if (!(hi > lo) || !isFinite(hi - lo)) return '';
                hi += (hi - lo) * 0.08;
                y = function (v) { return B - (B - T) * (v - lo) / (hi - lo); };
                slot = (R - L) / groups.length;
                groups.forEach(function (g, i) {
                    var cx = L + slot * (i + 0.5), w = Math.min(34, slot * 0.5), a = y(g[1] - g[2]), b = y(g[1] + g[2]);
                    body += '<rect class="calc-sv-bar" x="' + fix(cx - w / 2) + '" y="' + fix(Math.min(y(g[1]), y(0))) + '" width="' + fix(w) + '" height="' + fix(Math.abs(y(0) - y(g[1]))) + '"/>' +
                        '<path class="calc-bio-whisker" d="M' + fix(cx) + ' ' + fix(a) + 'V' + fix(b) + 'M' + fix(cx - 6) + ' ' + fix(a) + 'h12M' + fix(cx - 6) + ' ' + fix(b) + 'h12"/>' +
                        svgText(cx, B + 13, escaped(g[0]), 'middle');
                });
                body += '<path class="calc-sv-ground" d="M' + L + ' ' + fix(y(0)) + 'H' + R + 'M' + L + ' ' + T + 'V' + B + '"/>' + svgText(L - 4, y(0) + 3.5, '0', 'end') + svgText(L - 4, T + 7, shortNum(hi), 'end');
                return svgOf('', W, 122, 'The means, with their error bars of ± 2 SE', body);
            }

            // a strip of paper, its spots where they went, each in a pigment's colour, between where it started and the solvent's front
            function stripDrawing(front, spots) {
                var o = 112, f = 14, x = 150, y = function (d) { return o - (o - f) * d / front; }, body;
                body = '<rect class="calc-bio-paper" x="' + (x - 16) + '" y="6" width="32" height="114"/>' + '<path class="calc-sv-guide" d="M' + (x - 22) + ' ' + o + 'h44M' + (x - 22) + ' ' + f + 'h44"/>' +
                    svgText(x - 26, o + 3.5, 'Start', 'end') + svgText(x - 26, f + 3.5, 'Solvent', 'end');
                spots.forEach(function (d) {
                    var rf = d / front, col = rf > 0.85 ? '#e39a2d' : rf > 0.6 ? '#e3cf4a' : rf > 0.45 ? '#3f8f5b' : '#8fb04a';
                    body += '<ellipse cx="' + x + '" cy="' + fix(y(d)) + '" rx="10" ry="4" fill="' + col + '"/>' + svgText(x + 24, y(d) + 3.5, 'R<tspan class="calc-sv-sub" dy="2">f</tspan><tspan dy="-2"> ' + shortNum(rf) + '</tspan>', 'start');
                });
                return svgOf('', 300, 124, 'The strip, each spot where it went', body);
            }

            // a field of view, round, of a width in µm: cells of a size across its middle, and a scale bar
            function fieldDrawing(fov, cell) {
                var cx = 150, cy = 62, R = 54, body = '<circle class="calc-bio-field" cx="' + cx + '" cy="' + cy + '" r="' + R + '"/>', n, d, i, bar, px;
                if (cell > 0 && cell <= fov) {
                    d = 2 * R * cell / fov;
                    n = Math.min(40, Math.floor(fov / cell));
                    for (i = 0; i < n; i++) body += '<circle class="calc-bio-cellc" cx="' + fix(cx - R + d * (i + 0.5) + (2 * R - n * d) / 2) + '" cy="' + cy + '" r="' + fix(Math.max(0.6, d / 2 - 0.3)) + '"/>';
                }
                bar = Math.pow(10, Math.floor(Math.log10(fov / 4)));
                bar *= fov / 4 / bar >= 5 ? 5 : fov / 4 / bar >= 2 ? 2 : 1;
                px = 2 * R * bar / fov;
                body += '<path class="calc-sv-curve" d="M' + fix(cx + R + 14) + ' ' + (cy + 30) + 'h' + fix(px) + '"/>' + svgText(cx + R + 14 + px / 2, cy + 44, shortNum(bar) + ' µm', 'middle');
                return svgOf('', 300, 124, 'The field of view, the cells across it, and a scale bar', body);
            }

            // a cell in a solution, its water potential and the solution's, and the water going in or out, as the arrows show
            function waterDrawing(inside, outside) {
                var body = '<rect class="calc-bio-sol" x="40" y="6" width="220" height="104" rx="4"/><rect class="calc-bio-cellr" x="100" y="32" width="100" height="52" rx="18"/>' +
                    svgText(150, 56, 'Cell', 'middle', 'calc-sv-small calc-sv-bold') + svgText(150, 70, 'Ψ ' + shortNum(inside), 'middle') + svgText(150, 22, tr('Outside, Ψ {outside}', { outside: shortNum(outside) }), 'middle'),
                    into = outside > inside, i;
                if (outside !== inside) {
                    for (i = 0; i < 2; i++) {
                        body += into ? svgArrow(60, 40 + 36 * i, 94, 40 + 36 * i, 'calc-sv-seg calc-sv-thin') + svgArrow(240, 40 + 36 * i, 206, 40 + 36 * i, 'calc-sv-seg calc-sv-thin') :
                            svgArrow(94, 40 + 36 * i, 60, 40 + 36 * i, 'calc-sv-seg calc-sv-thin') + svgArrow(206, 40 + 36 * i, 240, 40 + 36 * i, 'calc-sv-seg calc-sv-thin');
                    }
                    body += svgText(150, 102, (into ? tr('Water goes in') : tr('Water goes out')), 'middle', 'calc-sv-small calc-sv-red');
                }
                return svgOf('', 300, 116, 'The cell, the solution, and which way water goes', body);
            }

            // a red blood cell in a solution: 0 hypotonic, swollen; 1 isotonic, a disc; 2 hypertonic, shrunken and crenated; the water's way
            function rbcDrawing(kind) {
                var cx = 150, cy = 56, body = '', d = '', i, t, rad;
                if (kind === 0) body = '<circle class="calc-bio-rbc" cx="' + cx + '" cy="' + cy + '" r="34"/>';
                else if (kind === 1) body = '<ellipse class="calc-bio-rbc" cx="' + cx + '" cy="' + cy + '" rx="36" ry="26"/><ellipse class="calc-bio-dimple" cx="' + cx + '" cy="' + cy + '" rx="17" ry="11"/>';
                else {
                    for (i = 0; i <= 120; i++) {
                        t = 2 * Math.PI * i / 120;
                        rad = 23 + 3.2 * Math.max(0, Math.cos(10 * t));
                        d += (i ? 'L' : 'M') + fix(cx + rad * 1.15 * Math.cos(t)) + ' ' + fix(cy + rad * Math.sin(t));
                    }
                    body = '<path class="calc-bio-rbc" d="' + d + 'Z"/>';
                }
                if (kind !== 1) {
                    [[-1, 0], [1, 0]].forEach(function (s) {
                        body += kind === 0 ? svgArrow(cx + s[0] * 82, cy, cx + s[0] * 46, cy, 'calc-sv-seg calc-sv-thin') : svgArrow(cx + s[0] * 40, cy, cx + s[0] * 76, cy, 'calc-sv-seg calc-sv-thin');
                    });
                }
                return svgOf('', 300, 112, 'A red blood cell in it', body + svgText(cx, 106, ['Swells, and may burst', 'Stays as it is', 'Shrinks'][kind], 'middle', 'calc-sv-small calc-sv-bold'));
            }

            // a cube, a sphere or a cylinder, drawn in perspective, with its size named
            function cellShapeDrawing(shape, a, h) {
                var body, cx = 150, cy = 60;
                if (shape === 0) {
                    body = '<path class="calc-sv-fill" d="M120 44h50v50h-50Z"/><path class="calc-sv-fill" d="M120 44l18-16h50l-18 16Z"/><path class="calc-sv-fill" d="M170 44l18-16v50l-18 16Z"/>' +
                        svgText(145, 108, shortNum(a), 'middle');
                } else if (shape === 1) {
                    body = '<circle class="calc-sv-fill" cx="' + cx + '" cy="' + cy + '" r="40"/><ellipse class="calc-sv-guide" cx="' + cx + '" cy="' + cy + '" rx="40" ry="11"/>' +
                        '<path class="calc-sv-seg" d="M' + cx + ' ' + cy + 'h40"/>' + svgText(cx + 20, cy - 5, 'r ' + shortNum(a), 'middle');
                } else {
                    body = '<path class="calc-sv-fill" d="M120 26V92A30 9 0 0 0 180 92V26"/><ellipse class="calc-sv-fill" cx="150" cy="26" rx="30" ry="9"/>' +
                        svgText(188, 62, 'h ' + shortNum(h), 'start') + svgText(150, 30, 'r ' + shortNum(a), 'middle');
                }
                return svgOf('', 300, 114, 'The shape', body);
            }

            // a scale of mV, its potentials marked, each named where there is room, above or below it, the nearer first; the lit one red
            function potentialDrawing(list) {
                var lo = -120, hi = 80, W = 300, x, body = '', v, ends = [-1e9, -1e9, -1e9, -1e9], rows = [[24, 36, 20], [44, 54, 66], [24, 36, 8], [44, 54, 78]];
                list.forEach(function (p) {
                    lo = Math.min(lo, Math.floor(p[1] / 20) * 20 - 20);
                    hi = Math.max(hi, Math.ceil(p[1] / 20) * 20 + 20);
                });
                x = function (t) { return 14 + (W - 28) * (t - lo) / (hi - lo); };
                body += '<path class="calc-sv-ground" d="M14 40H' + (W - 14) + '"/>';
                for (v = lo; v <= hi; v += 20) body += '<path class="calc-sv-ground" d="M' + fix(x(v)) + ' 37V43"/>' + (v % 40 === 0 ? svgText(x(v), 96, String(v).replace('-', '−'), 'middle') : '');
                list.slice().sort(function (a, b) { return a[1] - b[1]; }).forEach(function (p) {
                    var text = p[0] + ' ' + shortNum(p[1]), w = text.length * 5.6, at = x(p[1]), k = 0, r;
                    while (k < 3 && ends[k] > at - w / 2 - 4) k++;
                    ends[k] = at + w / 2;
                    r = rows[k];
                    body += '<path class="' + (p[2] ? 'calc-sv-curve' : 'calc-sv-seg calc-sv-thin') + '" d="M' + fix(at) + ' ' + r[0] + 'V' + r[1] + '"/>' +
                        svgText(Math.max(w / 2, Math.min(W - w / 2, at)), r[2], text, 'middle', p[2] ? 'calc-sv-small calc-sv-red' : '');
                });
                return svgOf('', W, 104, 'The potentials, in mV', body + svgText(W - 14, 96, 'mV', 'end'));
            }

            // levels of a food chain, each as wide as the logarithm of its energy, the producers at the bottom
            function pyramidDrawing(levels) {
                var n = levels.length, rowH = Math.min(24, 120 / n), lo = Math.log10(levels[n - 1][1]), hi = Math.log10(levels[0][1]), body = '';
                levels.forEach(function (l, i) {
                    var w = 60 + 220 * (hi > lo ? (Math.log10(l[1]) - lo) / (hi - lo) : 1), y = 6 + (n - 1 - i) * rowH;
                    body += '<rect class="calc-bio-sq" x="' + fix(150 - w / 2) + '" y="' + fix(y) + '" width="' + fix(w) + '" height="' + fix(rowH - 2) + '" fill="' + LIGHT_TINTS[i % 8] + '"/>' +
                        svgText(150, y + rowH / 2 + 2.5, l[0] + ', ' + shortNum(l[1]), 'middle');
                });
                return svgOf('', 300, 10 + n * rowH, 'The pyramid of energy, each level as wide as its energy\'s logarithm', body);
            }

            // a sample's dots, its marked ones red
            function catchDrawing(c, r) {
                var n = Math.min(c, 400), cols = Math.max(1, Math.ceil(Math.sqrt(n * 3))), rows = Math.ceil(n / cols), s = Math.min(12, 280 / cols, 100 / rows), body = '', i;
                for (i = 0; i < n; i++) {
                    body += '<circle class="' + (i < Math.round(r * n / c) ? 'calc-sv-dot' : 'calc-sv-mid') + '" cx="' + fix(150 - cols * s / 2 + s * (i % cols + 0.5)) + '" cy="' + fix(6 + s * (Math.floor(i / cols) + 0.5)) +
                        '" r="' + fix(s * 0.36) + '"/>';
                }
                return svgOf('', 300, rows * s + 12, 'The second catch, the marked red', body);
            }

            // A family as a pedigree: a man a square, a woman a circle, a child not yet known a diamond; one with it filled, a carrier with a
            // dot, and what is asked of one under it, red. people [{ x, g: its generation, 0 at the top, sex: 'm', 'f' or '', ill, carrier, ask,
            // name }], couples [[i, j]] joined, kids [[a couple, [its children]]], each hung from a line over them
            function pedigreeDrawing(people, couples, kids) {
                var s = 16, gy = function (g) { return 16 + g * 52; }, body = '', gens = 0, g;
                couples.forEach(function (c) {
                    var a = people[c[0]], b = people[c[1]];
                    body += '<path class="calc-bio-line" d="M' + fix(Math.min(a.x, b.x) + s / 2) + ' ' + gy(a.g) + 'H' + fix(Math.max(a.x, b.x) - s / 2) + '"/>';
                });
                kids.forEach(function (k) {
                    var c = couples[k[0]], mid = (people[c[0]].x + people[c[1]].x) / 2, at = people[c[0]].g, xs = k[1].map(function (i) { return people[i].x; }), top = gy(at) + 26;
                    body += '<path class="calc-bio-line" d="M' + fix(mid) + ' ' + gy(at) + 'V' + top + 'M' + fix(Math.min.apply(null, xs.concat(mid))) + ' ' + top + 'H' + fix(Math.max.apply(null, xs.concat(mid))) + '"/>';
                    xs.forEach(function (x) { body += '<path class="calc-bio-line" d="M' + fix(x) + ' ' + top + 'V' + (gy(at + 1) - s / 2) + '"/>'; });
                });
                people.forEach(function (p) {
                    var y = gy(p.g), cls = 'calc-bio-person' + (p.ill ? ' calc-bio-ill' : ''), h = s / 2 + 1;
                    gens = Math.max(gens, p.g);
                    body += p.sex === 'm' ? '<rect class="' + cls + '" x="' + fix(p.x - s / 2) + '" y="' + (y - s / 2) + '" width="' + s + '" height="' + s + '"/>' :
                        p.sex === 'f' ? '<circle class="' + cls + '" cx="' + fix(p.x) + '" cy="' + y + '" r="' + s / 2 + '"/>' :
                        '<path class="' + cls + '" d="M' + fix(p.x) + ' ' + (y - h) + 'l' + h + ' ' + h + 'l-' + h + ' ' + h + 'l-' + h + ' -' + h + 'Z"/>';
                    if (p.carrier) body += '<circle class="calc-sv-mid" cx="' + fix(p.x) + '" cy="' + y + '" r="2.8"/>';
                    if (p.ask || p.name) body += svgText(p.x, y + s / 2 + 12, p.ask || p.name, 'middle', p.ask ? 'calc-sv-small calc-sv-red' : '');
                });
                for (g = 0; g <= gens; g++) body += svgText(10, gy(g) + 4, ['I', 'II', 'III'][g], 'start', 'calc-sv-small calc-sv-bold');
                return svgOf('', 300, gy(gens) + s / 2 + 18, 'The family, those with it filled, carriers dotted', body);
            }

            // A dot plot of two sequences: a dot where a word of k letters of the first is in the second, so a run alike is a diagonal; the
            // alignment's path over it, red
            function dotPlotDrawing(a, b, al, k) {
                var sc = Math.min(250 / a.length, 170 / b.length), w = a.length * sc, h = b.length * sc, x0 = (300 - w) / 2 + 6, y0 = 16, words = {}, seen = {}, body = '', count = 0,
                    i, j, c, list, key, pts = [], ia, ib, step;
                for (j = 0; j + k <= b.length; j++) (words[b.substr(j, k)] = words[b.substr(j, k)] || []).push(j);
                for (i = 0; i + k <= a.length && count < 8000; i++) {
                    list = words[a.substr(i, k)] || [];
                    for (c = 0; c < list.length && count < 8000; c++) {
                        key = Math.floor(i * sc) + ',' + Math.floor(list[c] * sc);
                        if (seen[key]) continue;
                        seen[key] = 1;
                        count++;
                        body += '<rect class="calc-sv-mid" x="' + fix(x0 + i * sc) + '" y="' + fix(y0 + list[c] * sc) + '" width="' + fix(Math.max(1, sc)) + '" height="' + fix(Math.max(1, sc)) + '"/>';
                    }
                }
                if (al) {
                    ia = al.from[0] - 1;
                    ib = al.from[1] - 1;
                    step = Math.max(1, Math.ceil(al.length / 300));
                    pts.push([ia, ib]);
                    for (c = 0; c < al.length; c++) {
                        if (al.a.charAt(c) !== '-') ia++;
                        if (al.b.charAt(c) !== '-') ib++;
                        if (c % step === step - 1 || c === al.length - 1) pts.push([ia, ib]);
                    }
                    body += '<path class="calc-sv-curve calc-bio-path" d="M' + pts.map(function (p) { return fix(x0 + p[0] * sc) + ' ' + fix(y0 + p[1] * sc); }).join('L') + '"/>';
                }
                return svgOf('', 300, y0 + h + 8, 'The dot plot, the alignment red', '<rect class="calc-bio-frame" x="' + fix(x0) + '" y="' + y0 + '" width="' + fix(w) + '" height="' + fix(h) + '"/>' + body +
                    svgText(x0, y0 - 5, tr('Sequence 1, {a}', { a: a.length }), 'start') + '<text class="calc-sv-small" transform="translate(' + fix(x0 - 5) + ' ' + y0 + ') rotate(-90)" text-anchor="end">Sequence 2, ' + b.length + '</text>');
            }

            // Marks along a sequence, of either strand: the top strand's above the line, the other's under it, each in the first lane free
            // of those before it; the first lit of them red. marks [{ from, to, strand, cut }]; at, a base marked by a dashed line
            function strandDrawing(label, L, marks, lit, at) {
                var a = 16, b = 286, x = function (p) { return a + (b - a) * (p - 1) / Math.max(1, L - 1); }, mid = 56, ends = [[], []], body = '', top = '';
                if (at) body += '<path class="calc-sv-guide" d="M' + fix(x(at)) + ' 14V' + (mid * 2 - 14) + '"/>' + svgText(x(at), 10, tr('base {at}', { at: at }), 'middle');
                body += '<path class="calc-sv-ground" d="M' + a + ' ' + mid + 'H' + b + '"/>' + svgText(a - 4, mid - 6, '+', 'end', 'calc-sv-small calc-sv-bold') + svgText(a - 4, mid + 12, '−', 'end', 'calc-sv-small calc-sv-bold');
                marks.slice(0, 400).map(function (m, i) { return { m: m, lit: i < lit }; }).sort(function (p, q) { return p.m.from - q.m.from; }).forEach(function (o) { // in lanes along it, the lit over the rest
                    var m = o.m, up = m.strand > 0, side = ends[up ? 0 : 1], x1 = x(m.from), x2 = Math.max(x(m.to), x1 + 3), lane = 0, y, mark;
                    while (lane < 8 && side[lane] !== undefined && side[lane] > x1 - 1) lane++;
                    if (lane >= 8) return;
                    side[lane] = x2;
                    y = up ? mid - 6 - lane * 4.5 : mid + 6 + lane * 4.5;
                    mark = '<path class="' + (o.lit ? 'calc-sv-curve' : 'calc-sv-seg calc-sv-thin') + ' calc-bio-mark" d="M' + fix(x1) + ' ' + fix(y) + 'H' + fix(x2) + '"/>' +
                        (m.cut ? '<path class="calc-bio-line" d="M' + fix(x(m.cut + 0.5)) + ' ' + fix(y - 2) + 'v4"/>' : '') +
                        (marks.length <= 8 ? svgText((x1 + x2) / 2, up ? y - 5 : y + 11, String(m.from), 'middle') : ''); // few: each one's place
                    if (o.lit) top += mark;
                    else body += mark;
                });
                return svgOf('', 300, mid * 2 + 4, label, body + top + svgText(a, mid * 2, '1', 'start') + svgText(b, mid * 2, shortNum(L), 'end'));
            }

            // A mutagenic primer pair on the template: its two strands, the forward primer over them and the reverse under, each an arrow 5′ to
            // 3′, the bases changed red
            function mutationDrawing(mu, pos, k) {
                var len = mu.forward.length, s0 = mu.from - 6, s1 = mu.from + len + 6, x = function (p) { return 24 + 252 * (p - s0) / (s1 - s0); }, body;
                body = '<path class="calc-bio-line" d="M24 40H276M24 47H276"/>' + svgText(20, 43, '5′', 'end') + svgText(280, 43, '3′', 'start') + svgText(20, 51, '3′', 'end') + svgText(280, 51, '5′', 'start') +
                    svgArrow(x(mu.from), 28, x(mu.from + len), 28, 'calc-sv-seg') + svgArrow(x(mu.from + len), 60, x(mu.from), 60, 'calc-sv-seg');
                [28, 60].forEach(function (y) { body += '<rect class="calc-sv-bar-lit" x="' + fix(x(pos)) + '" y="' + (y - 5) + '" width="' + fix(Math.max(3, x(pos + k) - x(pos))) + '" height="10"/>'; });
                return svgOf('', 300, 86, 'The primers on the template, the change red', body + svgText(150, 16, tr('Forward, {len} bases', { len: len }), 'middle') + svgText(150, 80, 'Reverse', 'middle'));
            }

            // Two fragments joined by Gibson assembly: the end of the first and the start of the second, the overlap shaded, each primer an
            // arrow, its tail of the other fragment red
            function gibsonDrawing(g) {
                var c = 150, u = 2.2, ovA = g.forward.length - g.prime[0].length, k1 = g.prime[0].length, k2 = g.prime[1].length, ovB = g.overlap.length - ovA, body;
                body = '<rect class="calc-sv-under" x="' + fix(c - ovA * u) + '" y="20" width="' + fix(g.overlap.length * u) + '" height="56"/>' +
                    '<rect class="calc-bio-sq" x="10" y="41" width="' + (c - 10) + '" height="14" fill="' + LIGHT_TINTS[2] + '"/><rect class="calc-bio-sq" x="' + c + '" y="41" width="' + (290 - c) + '" height="14" fill="' + LIGHT_TINTS[0] + '"/>' +
                    svgText(14, 51.5, 'Fragment 1', 'start') + svgText(286, 51.5, 'Fragment 2', 'end') +
                    svgArrow(c - ovA * u, 30, c + k1 * u, 30, 'calc-sv-seg') + '<path class="calc-sv-curve" d="M' + fix(c - ovA * u) + ' 30H' + c + '"/>' +
                    svgArrow(c + ovB * u, 66, c - k2 * u, 66, 'calc-sv-seg') + '<path class="calc-sv-curve" d="M' + c + ' 66H' + fix(c + ovB * u) + '"/>';
                return svgOf('', 300, 96, 'The two fragments, the primers and the overlap', body + svgText(c + k1 * u + 4, 33, 'Forward', 'start') + svgText(c - k2 * u - 4, 69, 'Reverse', 'end') +
                    svgText(c, 90, tr('Overlap, {overlap} bp', { overlap: g.overlap.length }), 'middle'));
            }

            // bars across on a scale of logarithms, each named at its left, the lit red: items [[name, value, lit]]; tick(e) names 10^e
            function logBars(label, items, tick) {
                var a = 92, b = 288, rowH = 11, lo = Infinity, hi = -Infinity, body = '', H, e, x, every;
                items.forEach(function (it) { lo = Math.min(lo, Math.log10(it[1])); hi = Math.max(hi, Math.log10(it[1])); });
                lo = Math.floor(lo);
                hi = Math.max(lo + 1, Math.ceil(hi));
                x = function (v) { return a + (b - a) * (Math.log10(v) - lo) / (hi - lo); };
                H = 4 + items.length * rowH;
                every = Math.ceil((hi - lo + 1) / 6);
                for (e = lo; e <= hi; e++) body += '<path class="calc-sv-axis" d="M' + fix(x(Math.pow(10, e))) + ' 2V' + H + '"/>' + ((e - lo) % every ? '' : svgText(x(Math.pow(10, e)), H + 10, tick(e), 'middle'));
                items.forEach(function (it, i) {
                    var y = 4 + i * rowH;
                    body += svgText(a - 4, y + 8, escaped(it[0]), 'end', it[2] ? 'calc-sv-small calc-sv-red' : '') + '<rect class="' + (it[2] ? 'calc-sv-bar-lit' : 'calc-sv-bar') + '" x="' + a + '" y="' + (y + 1.5) +
                        '" width="' + fix(Math.max(1, x(it[1]) - a)) + '" height="' + (rowH - 3) + '"/>';
                });
                return svgOf('', 300, H + 14, label, body);
            }

            // A gel as it was measured: the ladder's bands where they ran, their sizes beside them, and the sample's, their sizes found red.
            // ladder [[size, distance]], found [[distance, size]]; of a protein, SDS-PAGE's stained bands on a pale gel
            function measuredGel(ladder, found, protein, unit) {
                var T = 22, B = 170, gx = 76, gw = 148, far = 0, y, body, last = -99, lanes = [gx + gw * 0.3, gx + gw * 0.7], bw = 40;
                ladder.concat(found.map(function (f) { return [f[1], f[0]]; })).forEach(function (p) { far = Math.max(far, p[1]); });
                y = function (d) { return T + 10 + (B - T - 16) * d / (far || 1); };
                body = '<rect class="' + (protein ? 'calc-bio-page' : 'calc-sv-screen') + '" x="' + gx + '" y="' + T + '" width="' + gw + '" height="' + (B - T) + '" rx="3"/>';
                lanes.forEach(function (cx, i) { body += '<rect class="calc-bio-well" x="' + fix(cx - bw / 2) + '" y="' + (T + 3) + '" width="' + bw + '" height="4"/>' + svgText(cx, T - 6, i ? 'Sample' : 'Ladder', 'middle'); });
                ladder.slice().sort(function (p, q) { return p[1] - q[1]; }).forEach(function (p) {
                    body += '<rect class="' + (protein ? 'calc-bio-pband' : 'calc-bio-band') + '" x="' + fix(lanes[0] - bw / 2) + '" y="' + fix(y(p[1]) - 1.5) + '" width="' + bw + '" height="3" rx="1"/>';
                    if (y(p[1]) - last < 10) return;
                    last = y(p[1]);
                    body += svgText(gx - 4, last + 3.5, shortNum(p[0]), 'end');
                });
                last = -99;
                found.slice().sort(function (p, q) { return p[0] - q[0]; }).forEach(function (f) {
                    body += '<rect class="' + (protein ? 'calc-bio-pband' : 'calc-bio-band') + '" x="' + fix(lanes[1] - bw / 2) + '" y="' + fix(y(f[0]) - 1.5) + '" width="' + bw + '" height="3" rx="1"/>';
                    if (y(f[0]) - last < 10) return;
                    last = y(f[0]);
                    body += svgText(gx + gw + 4, last + 3.5, shortNum(f[1]) + ' ' + unit, 'start', 'calc-sv-small calc-sv-red');
                });
                return svgOf('', 300, B + 6, 'The gel, the ladder beside the sample, each band\'s size', body);
            }

            // a plate's wells, those used filled with medium, its rows lettered; a flask or a dish, filled
            function plateDrawing(plate, used) {
                var dims = { 6: [2, 3], 12: [3, 4], 24: [4, 6], 48: [6, 8], 96: [8, 12] }[plate[1]], W = 220, H = 146, x0 = 40, y0 = 6, body, cell, r, i, j, gx, gy;
                if (!dims) {
                    return svgOf('', 300, 120, 'It, filled', plate[0].indexOf('dish') > -1 ? '<circle class="calc-bio-hole" cx="150" cy="60" r="54"/><circle class="calc-bio-medium" cx="150" cy="60" r="49"/>' :
                        '<rect class="calc-bio-hole" x="54" y="22" width="166" height="80" rx="8"/><rect class="calc-bio-medium" x="58" y="56" width="158" height="42" rx="5"/>' +
                        '<path class="calc-bio-hole" d="M220 46l26-10v18l-26 0Z"/><rect class="calc-bio-ill" x="244" y="33" width="10" height="24" rx="2"/>');
                }
                cell = Math.min((W - 20) / dims[1], (H - 18) / dims[0]);
                r = cell * 0.4;
                gx = x0 + (W - cell * dims[1]) / 2 + 6;
                gy = y0 + (H - cell * dims[0]) / 2 + 4;
                body = '<rect class="calc-bio-hole" x="' + x0 + '" y="' + y0 + '" width="' + W + '" height="' + H + '" rx="8"/>';
                for (i = 0; i < dims[0]; i++) {
                    body += svgText(gx - 7, gy + (i + 0.5) * cell + 3, 'ABCDEFGH'.charAt(i), 'end');
                    for (j = 0; j < dims[1]; j++) {
                        body += '<circle class="' + (i * dims[1] + j < used ? 'calc-bio-medium' : 'calc-bio-well-e') + '" cx="' + fix(gx + (j + 0.5) * cell) + '" cy="' + fix(gy + (i + 0.5) * cell) + '" r="' + fix(r) + '"/>';
                    }
                }
                return svgOf('', 300, H + 12, 'The plate, the wells used filled', body);
            }

            // a thousand people, each a square: those with the illness the test finds, those it misses, those it wrongly flags and those it clears
            function peopleDrawing(counts) {
                var cols = 50, s = 5.6, x0 = (300 - cols * s) / 2, colours = ['#b0414d', '#f0b3b9', '#3f78b4', '#cfe0d6'], names = ['Ill, found', 'Ill, missed', 'Well, flagged', 'Well, cleared'],
                    k = 0, body = '', rows = Math.ceil(counts.reduce(function (s2, c) { return s2 + c; }, 0) / cols);
                counts.forEach(function (c, t) {
                    for (var i = 0; i < c; i++, k++) {
                        body += '<rect x="' + fix(x0 + (k % cols) * s) + '" y="' + fix(4 + Math.floor(k / cols) * s) + '" width="' + fix(s - 0.9) + '" height="' + fix(s - 0.9) + '" fill="' + colours[t] + '"/>';
                    }
                });
                names.forEach(function (n, t) {
                    var x = 14 + (t % 2) * 146, y = 10 + rows * s + Math.floor(t / 2) * 15;
                    body += '<rect class="calc-bio-sq" x="' + x + '" y="' + y + '" width="10" height="10" fill="' + colours[t] + '"/>' + svgText(x + 14, y + 9, n + ', ' + counts[t]);
                });
                return svgOf('', 300, 40 + rows * s, 'A thousand tested, by what the test says', body);
            }

            // estimates with their 95% intervals on a scale of logarithms, a dashed line at 1, of no difference: items [[name, value, from, to]]
            function ciDrawing(items) {
                var lo = 1, hi = 1, a = 40, b = 236, body, x, H = 18 + items.length * 24;
                items.forEach(function (it) {
                    [it[1], it[2], it[3]].forEach(function (v) { if (v > 0 && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
                });
                lo /= 1.4;
                hi *= 1.4;
                x = function (v) { return a + (b - a) * (Math.log(Math.max(lo, Math.min(hi, v))) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)); };
                body = '<path class="calc-sv-guide" d="M' + fix(x(1)) + ' 4V' + (H - 14) + '"/>' + svgText(x(1), H - 3, '1', 'middle');
                items.forEach(function (it, i) {
                    var y = 16 + i * 24;
                    body += svgText(a - 6, y + 4, it[0], 'end', 'calc-sv-small calc-sv-bold') + svgText(b + 8, y + 4, shortNum(it[1]), 'start');
                    if (isFinite(it[2]) && isFinite(it[3]) && it[2] > 0) {
                        body += '<path class="calc-bio-whisker" d="M' + fix(x(it[2])) + ' ' + y + 'H' + fix(x(it[3])) + 'M' + fix(x(it[2])) + ' ' + (y - 4) + 'v8M' + fix(x(it[3])) + ' ' + (y - 4) + 'v8"/>';
                    }
                    if (it[1] > 0 && isFinite(it[1])) body += '<circle class="calc-sv-dot" cx="' + fix(x(it[1])) + '" cy="' + y + '" r="3.5"/>';
                });
                return svgOf('', 300, H, 'Each with its 95% interval, on a scale of logarithms', body);
            }

            // a population's numbers step by step, each step a bar of its ages stacked, the youngest at the bottom, and a key of the ages
            function ageStackDrawing(path) {
                var L = 10, R = 290, T = 8, B = 100, top = 0, slot = (R - L) / path.length, w = Math.min(18, slot * 0.72), every = Math.ceil(path.length / 12), k = path[0].length, body = '', a, kx, ky;
                path.forEach(function (v) { top = Math.max(top, v.reduce(function (s, x) { return s + x; }, 0)); });
                if (!(top > 0)) return '';
                path.forEach(function (v, t) {
                    var y = B, cx = L + slot * (t + 0.5);
                    v.forEach(function (x, age) {
                        var h = (B - T) * x / top;
                        body += '<rect x="' + fix(cx - w / 2) + '" y="' + fix(y - h) + '" width="' + fix(w) + '" height="' + fix(Math.max(0, h)) + '" fill="' + LIGHT_TINTS[age % 8] + '"/>';
                        y -= h;
                    });
                    if (t % every === 0) body += svgText(cx, B + 11, String(t), 'middle');
                });
                for (a = 0; a < Math.min(k, 8); a++) {
                    kx = L + (a % 4) * 72;
                    ky = B + 18 + Math.floor(a / 4) * 15;
                    body += '<rect class="calc-bio-sq" x="' + kx + '" y="' + ky + '" width="10" height="10" fill="' + LIGHT_TINTS[a] + '"/>' + svgText(kx + 14, ky + 9, tr('Age {a}', { a: a }));
                }
                return svgOf('', 300, B + 24 + Math.ceil(Math.min(k, 8) / 4) * 15, 'Its numbers each step, by age', body + '<path class="calc-sv-ground" d="M' + L + ' ' + B + 'H' + R + '"/>');
            }

            // A tree, its root at the left and its tips at the right, each branch as long as its length, the taxa named; a scale bar under it
            function treeDrawing(t) {
                var leaves = [], deep = 0, a = 14, b = 206, rowH = 17, body = '', sc, bar, H;
                (function walk(node, x) {
                    node.at = x;
                    deep = Math.max(deep, x);
                    if (!node.kids.length) {
                        node.y = 12 + leaves.length * rowH;
                        leaves.push(node);
                        return;
                    }
                    node.kids.forEach(function (k) { walk(k[0], x + k[1]); });
                    node.y = (node.kids[0][0].y + node.kids[node.kids.length - 1][0].y) / 2;
                })(t, 0);
                sc = (b - a) / (deep || 1);
                (function draw(node) {
                    if (!node.kids.length) {
                        body += svgText(a + node.at * sc + 5, node.y + 3.5, escaped(node.name), 'start', 'calc-sv-small calc-sv-bold');
                        return;
                    }
                    body += '<path class="calc-bio-line" d="M' + fix(a + node.at * sc) + ' ' + fix(node.kids[0][0].y) + 'V' + fix(node.kids[node.kids.length - 1][0].y) + '"/>';
                    node.kids.forEach(function (k) {
                        body += '<path class="calc-bio-line" d="M' + fix(a + node.at * sc) + ' ' + fix(k[0].y) + 'H' + fix(a + k[0].at * sc) + '"/>';
                        if (leaves.length <= 10 && k[1] * sc > 36) body += svgText(a + (node.at + k[1] / 2) * sc, k[0].y - 3, shortNum(k[1]), 'middle');
                        draw(k[0]);
                    });
                })(t);
                H = 12 + leaves.length * rowH;
                bar = Math.pow(10, Math.floor(Math.log10(deep / 4 || 1)));
                bar *= deep / 4 / bar >= 5 ? 5 : deep / 4 / bar >= 2 ? 2 : 1;
                body += '<path class="calc-bio-line" d="M' + a + ' ' + (H + 2) + 'h' + fix(bar * sc) + 'M' + a + ' ' + (H - 1) + 'v6M' + fix(a + bar * sc) + ' ' + (H - 1) + 'v6"/>' + svgText(a + bar * sc + 5, H + 5.5, shortNum(bar), 'start');
                return svgOf('', 300, H + 12, 'The tree', body);
            }

            // ----- the cards of the biology worked out ----- //

            // the numbers of a list typed, apart by spaces, commas or lines: { values, bad }
            function bioList(text) {
                return CalcEngine.numbers(text || '', engine.comma);
            }

            // lines of two numbers each, as 0.5 0.12: [[x, y]], or null where a line is not two numbers
            function bioPairs(text) {
                var out = [], ok = true;
                String(text || '').split(/[\r\n]+/).forEach(function (line) {
                    var v;
                    if (!line.trim()) return;
                    v = CalcEngine.numbers(line, engine.comma);
                    if (v.bad.length || v.values.length !== 2) ok = false;
                    else out.push(v.values);
                });
                return ok ? out : null;
            }

            // a result of a card that is wrong: each with no value, its note in red, and the boxes to mark
            function bioWarn(labels, note, bad) {
                return Object.assign(physNone(labels), { warn: true, note: note, bad: bad || [] });
            }

            // a sequence among the results, of letters of one width, cut at 3000 of them, all of it copied
            function seqRow(l, s) {
                return { l: l, wide: true, wrap: true, text: '<span class="calc-bio-seq">' + (s.length > 3000 ? s.slice(0, 3000) + '…' : s) + '</span>', copy: s };
            }

            // a text among the results, as wide as the card
            function textRow(l, text) {
                return { l: l, wide: true, wrap: true, text: text };
            }

            // y of a list of points [x, y] at x, a straight line between each two
            function alongPoints(pts, x) {
                var i = 0;
                if (!pts.length) return NaN;
                if (x <= pts[0][0]) return pts[0][1];
                while (i < pts.length - 1 && pts[i + 1][0] < x) i++;
                if (i >= pts.length - 1) return pts[pts.length - 1][1];
                return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
            }

            // the line of least squares of points [{ x, y }]: { m, b }, null where every x is the same
            function bioFit(points) {
                var n = points.length, mx = 0, my = 0, sxx = 0, sxy = 0;
                points.forEach(function (p) { mx += p.x / n; my += p.y / n; });
                points.forEach(function (p) {
                    sxx += (p.x - mx) * (p.x - mx);
                    sxy += (p.x - mx) * (p.y - my);
                });
                return sxx > 0 ? { m: sxy / sxx, b: my - sxy / sxx * mx } : null;
            }

            // the R² of a line y = mx + b to points [{ x, y }]
            function rSquared(points, line) {
                var mean = 0, res = 0, tot = 0;
                points.forEach(function (p) { mean += p.y / points.length; });
                points.forEach(function (p) {
                    res += Math.pow(p.y - (line.m * p.x + line.b), 2);
                    tot += Math.pow(p.y - mean, 2);
                });
                return tot ? 1 - res / tot : NaN;
            }

            // a value as a percent, as a drawing writes it
            function pcText(v) {
                return shortNum(v) + '%';
            }

            function runPunnett(n, raw) {
                var none = ['Phenotypes', 'Genotypes'], r, rows, ratio, total;
                if (!raw.p1 && !raw.p2) return physNone(none);
                r = CalcBiology.cross(raw.p1, raw.p2, raw.dom === '1');
                if (r.error === 'empty') return Object.assign(physNone(none), { note: GENE_ERRORS.empty });
                if (r.error) return bioWarn(none, GENE_ERRORS[r.error], r.which !== undefined ? [r.which ? 'p2' : 'p1'] : ['p1', 'p2']);
                total = r.total;
                ratio = function (list) { return CalcBiology.ratio(list.map(function (p) { return p[1]; })).join(' : '); };
                rows = [textRow(tr('Phenotypes, {phenotypes}', { phenotypes: ratio(r.phenotypes) }), r.phenotypes.map(function (p) { return p[0]; }).join(' : ')),
                    textRow('Genotypes' + (r.genotypes.length <= 27 ? ', ' + ratio(r.genotypes) : ''), r.genotypes.length <= 27 ? r.genotypes.map(function (p) { return p[0]; }).join(' : ') : tr('{genotypes} kinds', { genotypes: r.genotypes.length }))];
                rows = rows.concat(physRows(r.phenotypes.slice(0, 8).map(function (p) { return [p[0] + ', %', 100 * p[1] / total]; })),
                    [textRow('Gametes', r.gametes[0].map(function (g) { return g[0]; }).join(', ') + ' × ' + r.gametes[1].map(function (g) { return g[0]; }).join(', '))],
                    drawnTile(punnettDrawing(r), 'The square'),
                    r.phenotypes.length <= 12 ? drawnTile(labelBars('Each phenotype, % of the offspring', r.phenotypes.map(function (p) { return [p[0], 100 * p[1] / total]; }), pcText), 'Phenotypes') : []);
                return { rows: rows, cols: 2, note: r.gametes[0].length > 8 || r.gametes[1].length > 8 ? 'The square is drawn of up to 3 genes.' : '' };
            }

            function runXCross(n, raw) {
                var none = ['Sons showing it, %', 'Daughters showing it, %'], r, sum = function (list, kind) {
                    return list.reduce(function (s, g) { return s + (g[1] === kind ? g[2] : 0); }, 0);
                }, dRec, sRec;
                if (!raw.m && !raw.f) return physNone(none);
                if (!raw.m || !raw.f) return Object.assign(physNone(none), { note: 'Both parents.' });
                r = CalcBiology.xCross(raw.m, raw.f);
                if (r.error) {
                    return bioWarn(none, r.error === 'mother' ? 'The mother has two X: XAXa, XAXA or XaXa.' : 'The father has one X, of the same gene, and the Y: XAY or XaY.', [r.error === 'mother' ? 'm' : 'f']);
                }
                dRec = sum(r.daughters, 'recessive');
                sRec = sum(r.sons, 'recessive');
                return { rows: physRows([['Sons showing it, %', 50 * sRec], ['Sons free of it, %', 50 * (2 - sRec)], ['Daughters showing it, %', 50 * dRec],
                    ['Daughters carriers, %', 50 * sum(r.daughters, 'dominant, a carrier')], ['Daughters free of it, %', 50 * sum(r.daughters, 'dominant')], ['Of all the children, %', 25 * (dRec + sRec)]])
                    .concat(drawnTile(xDrawing(r), 'The square')), cols: 2, note: 'It: the trait of the small letter, recessive, as colour blindness; a son has his mother\'s X alone.' };
            }

            function runHardy(n, raw) {
                var by = +raw.by || 0, none = ['p', 'q'], p, N = NaN, rows, obs, exp, chi = 0, P, f, q, drawn = [];
                if (by === 1) {
                    if (!raw.AA && !raw.Aa && !raw.aa) return physNone(none);
                    obs = [n.AA, n.Aa, n.aa];
                    if (!obs.every(function (x) { return x >= 0; }) || !(obs[0] + obs[1] + obs[2] > 0)) return bioWarn(none, 'Three counts of 0 or more.');
                    N = obs[0] + obs[1] + obs[2];
                    p = (2 * obs[0] + obs[1]) / (2 * N);
                } else if (by === 2) {
                    if (!raw.q2) return physNone(none);
                    if (!(n.q2 >= 0 && n.q2 <= 1)) return bioWarn(none, 'q² is a part of 1: 1/2500, or 0.0004.');
                    p = 1 - Math.sqrt(n.q2);
                    if (raw.N) N = n.N;
                } else {
                    if (!raw.p) return physNone(none);
                    if (!(n.p >= 0 && n.p <= 1)) return bioWarn(none, 'p is from 0 to 1.');
                    p = n.p;
                    if (raw.N) N = n.N;
                }
                q = 1 - p;
                f = [p * p, 2 * p * q, q * q];
                rows = physRows([['p', p], ['q', q], ['AA, p²', f[0]], ['Aa, 2pq', f[1]], ['aa, q²', f[2]]].concat(by === 2 && f[1] ? [['Carriers, 1 in', 1 / f[1]]] : []));
                if (isFinite(N) && N > 0) {
                    exp = f.map(function (x) { return x * N; });
                    rows = rows.concat(physRows([['AA expected', exp[0]], ['Aa expected', exp[1]], ['aa expected', exp[2]]]));
                }
                drawn = drawnTile(graphDrawing('p², 2pq and q² against p', 0, 1, { fs: [function (x) { return x * x; }, function (x) { return 2 * x * (1 - x); }, function (x) { return (1 - x) * (1 - x); }],
                    y: [0, 1.05], marks: [[p, 'p']], dots: [[p, f[0]], [p, f[1]], [p, f[2]]], names: ['p', 'frequency'] }), 'p² red, 2pq blue, q² dashed');
                if (by === 1) {
                    exp.forEach(function (e, i) { if (e > 0) chi += Math.pow(obs[i] - e, 2) / e; });
                    P = CalcMaths.chiDist(chi, 1).hi;
                    rows = rows.concat(physRows([['χ², 1 df', chi], ['P', P]]), [textRow('At α = ' + local('0.05'), P < 0.05 ? 'Not at equilibrium' : 'At equilibrium: what differs may be chance')]);
                    drawn = drawn.concat(drawnTile(labelBars('Counts seen, those expected outlined', [['AA', obs[0], false, exp[0]], ['Aa', obs[1], false, exp[1]], ['aa', obs[2], false, exp[2]]]), 'Seen and expected'));
                }
                return { rows: drawn.concat(rows), cols: 3, note: by === 1 ? 'One degree of freedom: three classes, less one, less p worked out of them.' : '' };
            }

            function runChiCross(n, raw) {
                var none = ['χ²', 'P'], o = bioList(raw.o), ratio, r, crit, f, x1;
                if (!raw.o) return physNone(none);
                if (o.bad.length) return bioWarn(none, tr('{bad} is not a count.', { bad: escaped(o.bad[0]) }), ['o']);
                ratio = raw.r ? CalcEngine.numbers(raw.r.replace(/:/g, ' '), engine.comma) : { values: [], bad: [] };
                if (ratio.bad.length) return bioWarn(none, 'A ratio as 9:3:3:1.', ['r']);
                if (o.values.length < 2) return Object.assign(physNone(none), { note: 'Two counts or more.' });
                if (ratio.values.length && ratio.values.length !== o.values.length) {
                    return bioWarn(none, tr('As many parts to the ratio as counts: {values} counts, {values2} parts.', { values: o.values.length, values2: ratio.values.length }), ['r']);
                }
                if (!(n.a > 0 && n.a < 1)) return bioWarn(none, 'α is between 0 and 1, as 0.05.');
                r = CalcMaths.chiFit(o.values, ratio.values);
                if (!r) return bioWarn(none, 'Counts of 0 or more, some above 0, and each part of the ratio above 0.');
                crit = CalcMaths.chiInverse(1 - n.a, r.df);
                f = densityOf(function (x) { return x <= 0 ? 0 : CalcMaths.chiDist(x, r.df).lo; }, 1);
                x1 = Math.max(r.stat * 1.25, crit * 1.6, r.df + 4 * Math.sqrt(2 * r.df));
                return {
                    rows: drawnTile(labelBars('The counts seen, those expected outlined', o.values.map(function (x, i) { return [String(i + 1), x, false, r.expected[i]]; })), 'Seen and expected')
                        .concat(drawnTile(graphDrawing(tr('χ² of {df} df, beyond the critical value shaded', { df: r.df }), 0, x1, { fs: [f], fill: [f, null, crit, x1], dots: [[Math.min(r.stat, x1), f(Math.min(r.stat, x1))]],
                            marks: [[crit, 'critical']] }), 'Where χ² falls'),
                        physRows([['χ²', r.stat], ['df', r.df], ['P', r.p], ['Critical', crit]]), [textRow('At α = ' + local(String(n.a)), r.stat > crit ? 'Reject: they do not fit the ratio' :
                            'They fit the ratio: what differs may be chance')],
                        [{ l: 'Each class', head: ['Class', 'Seen', 'Expected', '(o – e)²/e'], m: o.values.map(function (x, i) { return [i + 1, x, r.expected[i], r.parts[i]]; }) }]),
                    cols: 2, note: r.small ? tr('{small} of the classes expect fewer than 5: χ² may be off.', { small: r.small }) : ''
                };
            }

            function runLinkage(n, raw) {
                var none = ['RF, %', 'Distance, cM'], r, total, rf, rows;
                if (raw.n === '1') {
                    if (!raw.c) return physNone(none);
                    r = CalcBiology.threePoint(raw.c);
                    if (r.error) {
                        return bioWarn(none, {
                            lines: 'Eight lines, a class and its count on each: ABC 390.', classes: 'Each class of three alleles, as ABC or + b +, and each once.',
                            alleles: 'Two alleles at each place, as A and a, or + and b.', parental: 'The commonest two classes are opposites, the parentals, and so are the rarest two, the double crossovers.'
                        }[r.error], ['c']);
                    }
                    var names = r.order.map(function (j) { return r.names[j]; });
                    return {
                        rows: drawnTile(chromosomeDrawing([[names[0], 0], [names[1], r.d[0]], [names[2], r.d[0] + r.d[1]]]), 'The map').concat([textRow('Order', tr('{v}, {names} in the middle', { v: names.join(' – '), names: names[1] }))],
                            physRows([[names[0] + ' to ' + names[1] + ', cM', r.d[0]], [names[1] + ' to ' + names[2] + ', cM', r.d[1]], [names[0] + ' to ' + names[2] + ', cM', r.d[0] + r.d[1]],
                                ['Coincidence', r.coc], ['Interference', r.interference], ['Total', r.total]]),
                            [textRow('Parental', r.parental.join(', ')), textRow('Double crossovers', r.double.join(', '))]),
                        cols: 2, note: tr('The outer distance is the sum of the two: counted straight from the classes it is {v} cM, the double crossovers missed.', { v: local(String(+r.d[2].toFixed(2))) })
                    };
                }
                if (!raw.p1 && !raw.p2 && !raw.r1 && !raw.r2) return physNone(none);
                if (![n.p1, n.p2, n.r1, n.r2].every(function (x) { return x >= 0; })) return bioWarn(none, 'Four counts of 0 or more.');
                total = n.p1 + n.p2 + n.r1 + n.r2;
                if (!(total > 0)) return bioWarn(none, 'Some offspring.');
                rf = (n.r1 + n.r2) / total;
                rows = physRows([['RF, %', 100 * rf], ['Distance, cM', 100 * rf]].concat(rf < 0.5 ? [['By Haldane, cM', -50 * Math.log(1 - 2 * rf)], ['By Kosambi, cM', 25 * Math.log((1 + 2 * rf) / (1 - 2 * rf))]] : []));
                return { rows: (rf < 0.5 ? drawnTile(chromosomeDrawing([['Gene 1', 0], ['Gene 2', 100 * rf]]), 'The map') : []).concat(rows), cols: 2,
                    note: rf >= 0.5 ? 'Half or more recombined: not linked, or so far apart they assort independently.' : 'Haldane and Kosambi count the crossovers a large distance hides.' };
            }

            function runChildren(n, raw) {
                var none = ['Exactly k', 'At least k'], k, c;
                if (!raw.p && !raw.n) return physNone(none);
                if (!(n.p >= 0 && n.p <= 1 && n.n >= 1 && n.n % 1 === 0 && n.n <= 1000) || (raw.k && !(n.k >= 0 && n.k % 1 === 0 && n.k <= n.n))) {
                    return bioWarn(none, 'p from 0 to 1, n a whole number from 1 to 1000, and k from 0 to n.');
                }
                k = raw.k ? n.k : 0;
                c = CalcMaths.binomial(n.n, n.p, k);
                return { rows: (n.n <= 200 ? drawnTile(countDrawing('The chance of each count, k red', 0, n.n, function (j) { return CalcMaths.binomial(n.n, n.p, j).eq; }, k), 'Each count') : [])
                    .concat(physRows([['Exactly k', c.eq], ['At least k', c.ge], ['At most k', c.le], ['None', Math.pow(1 - n.p, n.n)], ['All', Math.pow(n.p, n.n)], ['Expected', n.n * n.p]])),
                    cols: 2, note: raw.k ? '' : 'With k, how many of them have it.' };
            }

            function runHeritability(n, raw) {
                var none = ['h²', 'R'], h2 = raw.by === '1' ? (n.vp > 0 ? n.va / n.vp : NaN) : n.h, S, R, sd, normal = function (m) { return function (x) { return CalcMaths.normalDensity(x, m, sd); }; };
                if (!raw.m && !raw.ms) return physNone(none);
                if (!(h2 >= 0 && h2 <= 1) || !isFinite(n.m + n.ms) || (raw.vp && !(n.vp > 0))) return bioWarn(none, 'h² from 0 to 1, of V_A no more than V_P, above 0, and both means.');
                S = n.ms - n.m;
                R = h2 * S;
                sd = n.vp > 0 ? Math.sqrt(n.vp) : Math.max(Math.abs(S), 1e-9);
                return { rows: drawnTile(graphDrawing('The population red, its offspring blue, and the parents\' mean', Math.min(n.m, n.m + R) - 4 * sd, Math.max(n.ms, n.m + R) + 4 * sd,
                    { fs: [normal(n.m), normal(n.m + R)], marks: [[n.m, 'mean'], [n.ms, 'chosen']] }), 'Before and after').concat(physRows([['h²', h2], ['S', S], ['R', R], ['Next mean', n.m + R]])),
                    cols: 2, note: 'R = h²S: of what the parents differ by, only the part handed down by genes, h², shows in their offspring.' };
            }

            // the GC content of a sequence along it, in windows of a 30th of it, 10 bases at least
            function gcDrawing(s) {
                var L = s.length, w = Math.max(10, Math.round(L / 30)), pre = [0], i;
                if (L < 40) return '';
                for (i = 0; i < L; i++) pre.push(pre[i] + (/[GC]/.test(s.charAt(i)) ? 1 : 0));
                return graphDrawing(tr('Its GC content along it, a window of {w} bases', { w: w }), 1, L, {
                    fs: [function (x) {
                        var a = Math.max(0, Math.min(L - w, Math.round(x) - Math.floor(w / 2)));
                        return 100 * (pre[a + w] - pre[a]) / w;
                    }], y: [0, 100], lines: [[1, 100 * pre[L] / L, L, 100 * pre[L] / L]], names: ['base', 'GC %']
                });
            }

            function runSequence(n, raw) {
                var none = ['Length', 'GC, %'], r = CalcBiology.readSeq(raw.s), s = r.seq, c, rows, rc, comp, t = r.rna ? 'U' : 'T', as = function (x) { return r.rna ? x.replace(/T/g, 'U') : x; };
                if (!s) return physNone(none);
                if (r.bad.length) return bioWarn(none, tr('Not a base: {bad}. A, C, G, T or U, and the codes of IUPAC, as N.', { bad: escaped(r.bad.slice(0, 5).join(', ')) }), ['s']);
                c = CalcBiology.composition(s);
                rc = as(CalcBiology.reverseComplement(s));
                comp = as(CalcBiology.complement(s));
                rows = physRows([[r.rna ? 'Length, nt' : 'Length, bp', s.length], ['GC, %', 100 * c.gc], ['A', c.A], [t, r.rna ? c.U : c.T], ['G', c.G], ['C', c.C]].concat(c.other ? [['Other', c.other]] : [],
                    r.rna ? [['Mass, g/mol', CalcBiology.rnaMass(s)]] : [['Mass single, g/mol', CalcBiology.oligoMass(s)], ['Mass double, g/mol', CalcBiology.oligoMass(s) + CalcBiology.oligoMass(rc)]]));
                rows = rows.concat([seqRow('Reverse complement, 5′ → 3′', rc), seqRow('Complement, 3′ → 5′', comp), seqRow(r.rna ? 'As DNA' : 'As RNA', r.rna ? s.replace(/U/g, 'T') : s.replace(/T/g, 'U'))]);
                return { rows: drawnTile(stackDrawing('Its bases', ['A', t, 'G', 'C'].map(function (b) { return [b + ' ' + pcText(100 * c[b] / s.length), c[b], BASE_COLOURS[b]]; })
                    .concat([['Other', c.other, BASE_COLOURS.other]])), 'Its bases').concat(drawnTile(gcDrawing(s), 'GC along it'), rows), cols: 2 };
            }

            // the six frames of a sequence as lanes, +1 to −3, each open reading frame a bar in its own, the longest red
            function orfDrawing(L, list) {
                var a = 26, b = 292, lane = 13, top = 6, body = '', x = function (p) { return a + (b - a) * (p - 1) / Math.max(1, L - 1); };
                ['+1', '+2', '+3', '−1', '−2', '−3'].forEach(function (name, i) {
                    body += svgText(a - 6, top + i * lane + lane / 2 + 3.5, name, 'end') + '<path class="calc-sv-axis" d="M' + a + ' ' + fix(top + i * lane + lane / 2) + 'H' + b + '"/>';
                });
                list.slice(0, 80).forEach(function (o, k) {
                    var i = o.frame > 0 ? o.frame - 1 : 2 - o.frame;
                    body += '<rect class="' + (k ? 'calc-sv-bar' : 'calc-sv-bar-lit') + '" x="' + fix(x(o.from)) + '" y="' + (top + i * lane + 2) + '" width="' + fix(Math.max(1.5, x(o.to) - x(o.from))) +
                        '" height="' + (lane - 4) + '" rx="2"><title>' + o.aa + ' aa, ' + o.from + ' to ' + o.to + '</title></rect>';
                });
                return svgOf('', 300, top + 6 * lane + 16, 'Its open reading frames, in each of the six frames', body + svgText(a, top + 6 * lane + 12, '1', 'start') + svgText(b, top + 6 * lane + 12, shortNum(L), 'end'));
            }

            // a protein written in three letters each, Met-Ala-Ser, a stop as Stop
            function threeLetters(p) {
                return p.split('').map(function (a) { return a === '*' ? 'Stop' : CalcBiology.byOne[a] ? CalcBiology.byOne[a].three : 'Xaa'; }).join('-');
            }

            function runTranslate(n, raw) {
                var none = ['Amino acids'], r = CalcBiology.readSeq(raw.s), s = CalcBiology.dna(r.seq), f = +raw.f || 0, prot, list, rows, best, kda;
                if (!s) return physNone(none);
                if (r.bad.length) return bioWarn(none, tr('Not a base: {bad}. A, C, G, T or U, and the codes of IUPAC, as N.', { bad: escaped(r.bad.slice(0, 5).join(', ')) }), ['s']);
                if (s.length < 3) return Object.assign(physNone(none), { note: 'Three bases or more.' });
                if (!(n.min >= 1)) return bioWarn(none, 'ORFs of 1 amino acid or more.');
                prot = CalcBiology.translate(s, f % 3, f > 2);
                list = CalcBiology.orfs(s, n.min);
                best = list[0];
                rows = physRows([['Amino acids', prot.length], ['Stops', (prot.match(/\*/g) || []).length], ['ORFs', list.length]]);
                rows = rows.concat([seqRow(tr('Protein, frame {v}', { v: ['+1', '+2', '+3', '−1', '−2', '−3'][f] }), prot),
                    { l: 'In three letters', wide: true, wrap: true, copy: threeLetters(prot), // the first 60 and …; in Advanced mode or popped out all of it (style.css)
                        text: threeLetters(prot.slice(0, 60)) + (prot.length > 60 ? '<span class="calc-bio-rest">-' + threeLetters(prot.slice(60)) + '</span><span class="calc-bio-cut">…</span>' : '') }]);
                if (best) {
                    kda = /X/.test(best.protein) ? NaN : CalcBiology.protein(best.protein).mass / 1000;
                    rows = rows.concat(physRows([['Longest ORF, aa', best.aa], ['Its frame', best.frame], ['From', best.from], ['To', best.to], ['Its mass, kDa', kda]]), [seqRow('Its protein', best.protein)]);
                }
                return { rows: drawnTile(orfDrawing(s.length, list), 'The ORFs').concat(rows), cols: 3,
                    note: best ? '' : tr('No ORF of {n} amino acids or more, ATG to a stop.', { n: local(String(n.min)) }) };
            }

            function runCode(n, raw) {
                var t = (raw.x || '').trim(), up = t.toUpperCase().replace(/T/g, 'U'), rows = [], lit = [], a, aa;
                if (/^[ACGU]{3}$/.test(up)) {
                    aa = CalcBiology.codon(up);
                    lit = [up];
                    a = CalcBiology.byOne[aa];
                    rows = [textRow('Codon', up + (up !== t.toUpperCase() ? tr(', {t} in DNA', { t: t.toUpperCase() }) : tr(', {v} in DNA', { v: up.replace(/U/g, 'T') }))),
                        textRow('It codes', aa === '*' ? 'Stop: the protein ends' : a.name + ', ' + a.three + ', ' + a.one + (up === 'AUG' ? '; the start of most proteins' : '')),
                        textRow('All its codons', CalcBiology.codonsOf(aa).join(' '))];
                } else if (/^(stop|\*|end|ter)$/i.test(t)) {
                    lit = CalcBiology.codonsOf('*');
                    rows = [textRow('Stop codons', tr('{v}: amber, ochre and opal', { v: lit.join(' ') }))];
                } else if (t) {
                    a = CalcBiology.amino(t);
                    if (!a) return { rows: [], pick: { t: 'Code', rows: [{ l: 'The code', text: codonWheel('x', []) }] }, warn: true, bad: ['x'], note: 'A codon, as AUG, or an amino acid, as Leu, L or leucine.' };
                    lit = CalcBiology.codonsOf(a.one);
                    rows = [textRow('Amino acid', a.name + ', ' + a.three + ', ' + a.one + ', ' + CalcBiology.kinds[a.kind].toLowerCase()), textRow(lit.length + (lit.length > 1 ? ' codons' : ' codon'), lit.join(' '))];
                }
                if (!t) return { rows: [], pick: { t: 'Code', rows: [{ l: 'The code', text: codonWheel('x', []) }] }, note: 'Click a codon or an amino acid on the wheel, or type one.' }; // the wheel to pick from
                return { rows: drawnTile(codonWheel('x', lit), 'The code').concat(rows), cols: 1 };
            }

            function runPrimer(n, raw) {
                var none = ['T<sub>m</sub>, °C', 'GC, %'], prim = [], rows = [], notes = [], bad = [], curves = [], marks = [], lo = Infinity, hi = -Infinity, low;
                ['a', 'b'].forEach(function (k, i) {
                    var r;
                    if (!raw[k]) return;
                    r = CalcBiology.readSeq(raw[k]);
                    if (r.bad.length || !r.seq || /[^ACGTU]/.test(r.seq)) return bad.push(k);
                    prim.push({ name: i ? 'Reverse' : 'Forward', s: CalcBiology.dna(r.seq), m: CalcBiology.meltingPoint(r.seq, n.na, n.c, n.mg), q: CalcBiology.primerChecks(r.seq) });
                });
                if (bad.length) return bioWarn(none, 'A primer of A, C, G and T, written 5′ to 3′.', bad);
                if (!prim.length) return physNone(none);
                if (!(n.na >= 0 && n.mg >= 0 && n.na + n.mg > 0 && n.c > 0)) return bioWarn(none, 'Na⁺ and Mg²⁺ of 0 or more, not both 0, and the primer above 0.');
                prim.forEach(function (p) {
                    var pre = prim.length > 1 ? p.name + ', ' : '', who = prim.length > 1 ? p.name + ': ' : '', tm = p.m.nn, dH = p.m.dH;
                    rows = rows.concat(physRows([[pre + 'T<sub>m</sub>, °C', tm], [pre + 'length', p.s.length], [pre + 'GC, %', 100 * p.m.gc], [tr('{pre}Wallace, °C', { pre: pre }), p.m.wallace],
                        [tr('{pre}with salt, °C', { pre: pre }), p.m.salt], [tr('{pre}ΔG, kcal/mol', { pre: pre }), p.m.dG]]));
                    if (p.s.length < 18 || p.s.length > 30) notes.push(tr('{who} bases; 18 to 30 work best.', { who: who + p.s.length }));
                    if (p.m.gc < 0.4 || p.m.gc > 0.6) notes.push(tr('{who}GC outside 40 to 60%.', { who: who }));
                    if (p.q.clamp > 3) notes.push(tr('{who}more than 3 G or C in its last 5 bases: it may prime where it should not.', { who: who }));
                    if (p.q.clamp === 0) notes.push(tr('{who}no G or C in its last 5 bases.', { who: who }));
                    if (p.q.run >= 4) notes.push(who + 'a run of ' + p.q.run + ' of one base.');
                    if (p.q.dimer >= 4) notes.push(tr('{who}its last {dimer} bases pair with itself, as a primer dimer.', { who: who, dimer: p.q.dimer }));
                    if (isFinite(tm) && isFinite(dH)) {
                        curves.push(function (T) { return 1 / (1 + Math.exp(dH / 1.987e-3 * (1 / (T + 273.15) - 1 / (tm + 273.15)))); });
                        marks.push([tm, p.name.charAt(0)]);
                        lo = Math.min(lo, tm);
                        hi = Math.max(hi, tm);
                    }
                });
                low = Math.min.apply(null, prim.map(function (p) { return p.m.nn; }));
                rows = rows.concat(physRows((prim.length > 1 ? [['ΔT<sub>m</sub>, °C', Math.abs(prim[0].m.nn - prim[1].m.nn)]] : []).concat([['Annealing, about, °C', low - 5]])));
                if (prim.length > 1 && Math.abs(prim[0].m.nn - prim[1].m.nn) > 5) notes.unshift('Their T_m are more than 5 °C apart.');
                return { rows: (curves.length ? drawnTile(graphDrawing('Paired as it warms, each T_m marked', lo - 25, hi + 25, { fs: curves, y: [0, 1.25], marks: marks, names: ['°C', 'paired'] }), 'Melting') : [])
                    .concat(rows), cols: prim.length > 1 ? 2 : 3, note: notes.join(' '), warn: false };
            }

            function runA260(n, raw) {
                var kind = +raw.kind || 0, none = ['ng/µL'], c, r1, r2, notes = [], drawn = [];
                if (!raw.a) return physNone(none);
                if (!(n.a >= 0 && n.dil > 0) || (raw.a280 && !(n.a280 > 0)) || (raw.a230 && !(n.a230 > 0))) return bioWarn(none, 'Absorbances of 0 or more, the others above 0, and the dilution above 0.');
                c = n.a * [50, 33, 40][kind] * n.dil;
                if (raw.a280) {
                    r1 = n.a / n.a280;
                    drawn = drawn.concat(drawnTile(gaugeDrawing('A260/A280, the pure range darker', r1, 1.2, 2.4, kind === 2 ? [1.9, 2.1] : [1.75, 1.95],
                        [[1.2, shortNum(1.2)], [1.6, shortNum(1.6)], [1.8, 'DNA ' + shortNum(1.8)], [2, 'RNA ' + shortNum(2)], [2.4, shortNum(2.4)]]), 'A260/A280'));
                    if (r1 < (kind === 2 ? 1.9 : 1.7)) notes.push('A260/A280 low: protein or phenol may be in it.');
                }
                if (raw.a230) {
                    r2 = n.a / n.a230;
                    drawn = drawn.concat(drawnTile(gaugeDrawing('A260/A230, the pure range darker', r2, 1, 2.6, [2, 2.2], [[1, shortNum(1)], [1.5, shortNum(1.5)], [2.1, shortNum(2.1)], [2.6, shortNum(2.6)]]), 'A260/A230'));
                    if (r2 < 1.8) notes.push('A260/A230 low: salts, guanidine or carbohydrate may be in it.');
                }
                if (n.a < 0.1 || n.a > 1) notes.push('A260 is surest from 0.1 to 1.');
                return { rows: drawn.concat(physRows([['ng/µL', c], ['µg/mL', c]].concat(raw.a280 ? [['A260/A280', r1]] : [], raw.a230 ? [['A260/A230', r2]] : [], raw.v ? [['In all, µg', c * n.v / 1000]] : []))),
                    cols: 2, note: notes.join(' ') };
            }

            function runBioMoles(n, raw) {
                var kind = +raw.kind || 0, none = ['g/mol', 'Copies'], mw, ng, pmol, copies, rows;
                if (!raw.L) return physNone(none);
                if (!(n.L >= 1) || (raw.x && !(n.x >= 0)) || (raw.v && !(n.v > 0))) return bioWarn(none, 'A length of 1 or more, an amount of 0 or more, and a volume above 0.');
                mw = CalcBiology.lengthMass(kind, n.L);
                rows = [['g/mol', mw]];
                if (raw.x) {
                    pmol = raw.by === '1' ? n.x : n.x * 1000 / mw;
                    ng = raw.by === '1' ? n.x * mw / 1000 : n.x;
                    copies = pmol * 1e-12 * CalcChem.avogadro;
                    rows.push(raw.by === '1' ? ['ng', ng] : ['pmol', pmol], ['Copies', copies]);
                    if (raw.v) rows.push(['nM', 1000 * pmol / n.v], ['ng/µL', ng / n.v], ['Copies/µL', copies / n.v]);
                }
                return { rows: physRows(rows), cols: 2, note: raw.x ? '' : 'With an amount, its moles and copies.' };
            }

            function runLigation(n, raw) {
                var none = ['Insert, ng'], ins;
                if (!raw.vl && !raw.vn && !raw.il) return physNone(none);
                if (!(n.vl > 0 && n.vn > 0 && n.il > 0 && n.r > 0)) return bioWarn(none, 'Lengths, the vector\'s mass and the ratio above 0.');
                ins = n.vn * n.il / n.vl * n.r;
                return { rows: drawnTile(plasmidDrawing('The plasmid, its insert red', [[tr('Vector, {vl} bp', { vl: shortNum(n.vl) }), n.vl], [tr('Insert, {il} bp', { il: shortNum(n.il) }), n.il, true]]), 'The plasmid')
                    .concat(physRows([['Insert, ng', ins], ['Vector, pmol', n.vn * 1000 / CalcBiology.lengthMass(0, n.vl)], ['Insert, pmol', ins * 1000 / CalcBiology.lengthMass(0, n.il)],
                        ['DNA in all, ng', n.vn + ins], ['Plasmid, bp', n.vl + n.il]])), cols: 2, note: 'Some 50 to 100 ng of vector in 10 to 20 µL; 1:1 to 10:1 to try, 3:1 most.' };
            }

            function runDigest(n, raw) {
                var none = ['Fragments'], r = CalcBiology.readSeq(raw.s), s = CalcBiology.dna(r.seq), circ = raw.top === '1', enz = [], unknown = [], d, sizes = {}, most = 0, bands, by;
                if (!s) return physNone(none);
                if (r.bad.length) return bioWarn(none, tr('Not a base: {bad}.', { bad: escaped(r.bad.slice(0, 5).join(', ')) }), ['s']);
                (raw.e || '').split(/[\s,;+]+/).filter(Boolean).forEach(function (t) {
                    var e = CalcBiology.enzyme(t);
                    if (!e) unknown.push(t);
                    else if (enz.indexOf(e) < 0) enz.push(e);
                });
                if (unknown.length) {
                    return bioWarn(none, tr('Not one of these: {unknown}. {enzymes}.', { unknown: escaped(unknown[0]), enzymes: CalcBiology.enzymes.map(function (e) { return e[0]; }).join(', ') }), ['e']);
                }
                if (!enz.length) { // which cut it, and how often
                    d = CalcBiology.digest(s, CalcBiology.enzymes, circ);
                    by = function (k) { return CalcBiology.enzymes.filter(function (e) { return k < 2 ? d.sites[e[0]] === k : d.sites[e[0]] >= 2; }).map(function (e) { return e[0]; }).join(', ') || 'None'; };
                    return { rows: drawnTile(siteDrawing(s.length, d.cuts.filter(function (c) { return d.sites[c.name] === 1; }), circ), 'Those that cut once')
                        .concat([textRow('Cut once', by(1)), textRow('Twice or more', by(2)), textRow('Not at all', by(0))]), cols: 1, note: 'Type the enzymes to digest it with.' };
                }
                d = CalcBiology.digest(s, enz, circ);
                d.fragments.forEach(function (f) { sizes[f] = (sizes[f] || 0) + 1; });
                Object.keys(sizes).forEach(function (f) { most = Math.max(most, f * sizes[f]); });
                bands = Object.keys(sizes).map(function (f) { return [+f, f * sizes[f] / most]; }); // brighter of more DNA
                return {
                    rows: drawnTile(gelDrawing((circ ? [] : [['Uncut', [[s.length, 1]]]]).concat([['Cut', bands]])), 'The gel').concat(d.cuts.length ? drawnTile(siteDrawing(s.length, d.cuts, circ), 'The sites') : [],
                        physRows([['Fragments', d.fragments.length], ['Cuts', d.cuts.length]]),
                        [{ l: 'Sizes, bp', wide: true, wrap: true, text: d.fragments.slice().sort(function (a, b) { return b - a; }).join(', '), copy: d.fragments.join(', ') },
                            textRow('Sites', enz.map(function (e) {
                                var at = d.cuts.filter(function (c) { return c.name === e[0]; }).map(function (c) { return c.at; });
                                return e[0] + (at.length ? ' at ' + at.join(', ') : ' none');
                            }).join('; '))]),
                    cols: 2, note: circ && !d.cuts.length ? 'Not cut: the circle stays whole.' : circ ? 'Uncut, a plasmid runs as several bands, supercoiled faster than linear: it is not drawn.' : ''
                };
            }

            function runPcr(n, raw) {
                var none = ['Copies'], e = n.E / 100, copies;
                if (!raw.N) return physNone(none);
                if (!(n.N > 0 && e > 0 && e <= 1 && n.n >= 0 && n.n <= 100 && n.n % 1 === 0)) return bioWarn(none, 'N₀ above 0, E from 0 to 100%, and whole cycles up to 100.');
                copies = n.N * Math.pow(1 + e, n.n);
                return { rows: drawnTile(graphDrawing('Its copies, cycle by cycle, on a scale of logarithms', 0, Math.max(1, n.n), { fs: [function (c) { return Math.log10(n.N) + c * Math.log10(1 + e); }],
                    dots: [[n.n, Math.log10(copies)]], names: ['cycle', 'log₁₀ copies'] }), 'Its copies').concat(physRows([['Copies', copies], ['Times more', copies / n.N], ['log₁₀ copies', Math.log10(copies)]]
                    .concat(raw.L && n.L > 0 ? [['Mass, ng', copies / CalcChem.avogadro * CalcBiology.lengthMass(0, n.L) * 1e9]] : []))), cols: 2,
                    note: copies > 1e12 ? 'In a tube it slows to a plateau, the primers and dNTPs used up, near 10¹² copies.' : '' };
            }

            function runProtein(n, raw) {
                var none = ['Mass, Da', 'pI'], r = CalcBiology.readProtein(raw.s), s = r.seq, p, rows, h, most, drawn = [];
                if (!s) return physNone(none);
                if (r.bad.length) return bioWarn(none, tr('Not an amino acid: {bad}. One letter each, as MKV…', { bad: escaped(r.bad.slice(0, 5).join(', ')) }), ['s']);
                p = CalcBiology.protein(s);
                most = Object.keys(p.counts).filter(function (a) { return p.counts[a]; }).sort(function (a, b) { return p.counts[b] - p.counts[a]; }).slice(0, 6);
                rows = physRows([['Length, aa', p.length], ['Mass, Da', p.mass], ['Mass, kDa', p.mass / 1000], ['pI', p.pI], ['Charge at pH 7', p.charge], ['ε<sub>280</sub>, free', p.eps[0]],
                    ['ε<sub>280</sub>, paired', p.eps[1]], ['A<sub>280</sub> of 1 mg/mL', p.abs[0]], ['GRAVY', p.gravy], ['Aliphatic index', p.aliphatic]])
                    .concat([textRow('Most of it', most.map(function (a) { return a + ' ' + p.counts[a] + ', ' + pcText(100 * p.counts[a] / p.length); }).join('; '))]);
                if (s.length >= 12) {
                    h = CalcBiology.hydropathy(s, 9);
                    drawn = drawnTile(graphDrawing('Its hydropathy along it, a window of 9, the line at 1.6', h[0][0], h[h.length - 1][0], { fs: [function (x) { return alongPoints(h, x); }],
                        lines: [[h[0][0], 1.6, h[h.length - 1][0], 1.6]], y: [Math.min(-2, Math.min.apply(null, h.map(function (q) { return q[1]; }))) - 0.3,
                            Math.max(1.6, Math.max.apply(null, h.map(function (q) { return q[1]; }))) + 0.5], names: ['residue', 'hydropathy'] }), 'Hydropathy');
                }
                drawn = drawn.concat(drawnTile(graphDrawing('Its charge against the pH, the pI marked', 0, 14, { fs: [function (x) { return CalcBiology.chargeAt(p.counts, x); }], dots: [[p.pI, 0]],
                    marks: [[p.pI, 'pI']], names: ['pH', 'charge'] }), 'Charge'));
                return { rows: drawn.concat(rows), cols: 2, note: p.eps[0] ? '' : 'No W or Y: it hardly absorbs at 280 nm; measure it another way, as by Bradford.' };
            }

            function runAmino(n, raw) {
                var a = raw.x ? CalcBiology.amino(raw.x) : null, groups, pks;
                var grid = { t: 'Amino acids', rows: [{ l: 'The amino acids', text: aminoGrid('x', null) }] }; // to pick from, till one is found
                if (raw.x && !a) return { rows: [], pick: grid, warn: true, bad: ['x'], note: 'Not an amino acid: its name, as histidine, three letters, His, or one, H.' };
                if (!a) return { rows: [], pick: grid, note: 'Click one, or type its name.' };
                pks = a.pk.filter(function (k) { return k !== null; }).sort(function (x, y) { return x - y; });
                groups = pks.length;
                return {
                    rows: drawnTile(aminoGrid('x', a), 'The amino acids').concat(drawnTile(graphDrawing('Its titration: the pH as OH⁻ is added, each pKa and the pI', 0, groups, {
                        fs: [function (x) { return CalcBiology.titrationPH(a, x); }], y: [0, 14], marks: pks.map(function (k, i) { return [i + 0.5, 'pK' + '₁₂₃'.charAt(i)]; }),
                        dots: [[CalcBiology.equivalents(a, a.pi), a.pi]], names: ['OH⁻, equivalents', 'pH'] }), 'Titration'),
                    [textRow(a.name, a.three + ', ' + a.one + '; ' + CalcBiology.kinds[a.kind].toLowerCase() + (a.essential ? '; essential: people must eat it' : '; people make it'))],
                    physRows([['Mass, g/mol', a.mass], ['In a protein, g/mol', a.mass - 18.01528], ['pKa, COOH', a.pk[0]], ['pKa, NH₃⁺', a.pk[1]]].concat(a.pk[2] !== null ? [['pKa, side chain', a.pk[2]]] : [],
                        [['pI', a.pi], ['Hydropathy', a.kd]])), [textRow('Codons', CalcBiology.codonsOf(a.one).join(' '))]), cols: 2
                };
            }

            function runProteinConc(n, raw) {
                var none = ['mg/mL'], pts, xy, line, u, conc, rows, x1, slope, mg, M, notes = [];
                if (raw.by === '1') {
                    if (!raw.pts) return physNone(['Slope', 'R²']);
                    pts = bioPairs(raw.pts);
                    if (!pts) return bioWarn(['Slope', 'R²'], 'A concentration and its absorbance on each line: 0.5 0.37.', ['pts']);
                    if (pts.length < 2) return Object.assign(physNone(['Slope', 'R²']), { note: 'Two standards or more.' });
                    xy = pts.map(function (p) { return { x: p[0], y: p[1] }; });
                    line = bioFit(xy);
                    if (!line || !line.m) return bioWarn(['Slope', 'R²'], 'Standards of different concentrations, their absorbance rising.');
                    u = bioList(raw.u);
                    if (u.bad.length) return bioWarn(['Slope', 'R²'], tr('{bad} is not an absorbance.', { bad: escaped(u.bad[0]) }), ['u']);
                    if (!(n.dil > 0)) return bioWarn(['Slope', 'R²'], 'The dilution is above 0.');
                    conc = u.values.slice(0, 12).map(function (a) { return (a - line.b) / line.m; });
                    x1 = Math.max.apply(null, pts.map(function (p) { return p[0]; }).concat(conc)) * 1.1;
                    if (conc.some(function (c) { return c > Math.max.apply(null, pts.map(function (p) { return p[0]; })) || c < Math.min.apply(null, pts.map(function (p) { return p[0]; })); })) {
                        notes.push('An unknown beyond the standards: dilute it, or add a standard.');
                    }
                    rows = physRows([['Slope', line.m], ['Intercept', line.b], ['R²', rSquared(xy, line)]].concat(conc.map(function (c, i) { return ['Unknown ' + (i + 1), c * n.dil]; })));
                    return { rows: drawnTile(graphDrawing('The standards and their line, the unknowns red', Math.min(0, Math.min.apply(null, conc.concat([0]))), x1 || 1, {
                        fs: [function (x) { return line.m * x + line.b; }], pts: pts, dots: conc.map(function (c, i) { return [c, u.values[i]]; }), names: ['conc', 'A'] }), 'The curve').concat(rows),
                        cols: 2, note: notes.concat(raw.u ? (n.dil !== 1 ? [tr('Times the dilution, {dil}.', { dil: local(String(n.dil)) })] : []) : ['With the unknowns\' absorbances, their concentrations.']).join(' ') };
                }
                if (!raw.a) return physNone(none);
                if (!(n.a >= 0 && n.l > 0 && n.dil > 0) || (raw.eps && !(n.eps > 0)) || (raw.mw && !(n.mw > 0))) return bioWarn(none, 'A of 0 or more, and ε, MW, the path and the dilution above 0.');
                if (raw.eps) {
                    M = n.a / (n.eps * n.l) * n.dil;
                    mg = raw.mw ? M * n.mw : NaN;
                } else {
                    mg = n.a / n.l * n.dil;
                    M = raw.mw ? mg / n.mw : NaN;
                }
                slope = isFinite(mg) && mg ? n.a / (mg / n.dil) : NaN;
                rows = physRows([['mg/mL', mg], ['µM', M * 1e6]]);
                return { rows: (isFinite(slope) ? drawnTile(graphDrawing('A against its concentration, by Beer and Lambert', 0, mg / n.dil * 1.6 || 1, { fs: [function (x) { return slope * x; }],
                    dots: [[mg / n.dil, n.a]], names: ['mg/mL', 'A'] }), 'Beer–Lambert') : []).concat(rows), cols: 2,
                    note: raw.eps ? (raw.mw ? '' : 'With the MW, in mg/mL too.') : 'As 1 mg/mL each 1: rough, as proteins absorb some 0.5 to 2 for each mg/mL. Type ε and the MW for its own.' };
            }

            function runKinetics(n, raw) {
                var fit = raw.by === '1', inh = +raw.inh || 0, none = ['V<sub>max</sub>', 'K<sub>m</sub>'], pts = [], f, vmax, km, k = 1, kmI, vI, rows, x1, v, vi, inv, s0, drawn;
                if (fit) {
                    if (!raw.pts) return physNone(none);
                    pts = bioPairs(raw.pts);
                    if (!pts) return bioWarn(none, 'A [S] and its rate v on each line: 2 3.', ['pts']);
                    f = CalcBiology.michaelis(pts);
                    if (!f) return bioWarn(none, 'Three points or more, of [S] above 0, rising and levelling off.');
                    vmax = f.vmax;
                    km = f.km;
                } else {
                    if (!raw.vmax && !raw.km) return physNone(none);
                    if (!(n.vmax > 0 && n.km > 0) || (raw.s && !(n.s >= 0))) return bioWarn(none, 'V_max and K_m above 0, and [S] of 0 or more.');
                    vmax = n.vmax;
                    km = n.km;
                }
                if (inh) {
                    if (raw.i && !(n.i >= 0 && n.ki > 0)) return bioWarn(none, '[I] of 0 or more, and K_i above 0.');
                    if (raw.i) k = 1 + n.i / n.ki;
                }
                kmI = inh === 1 ? km * k : inh === 2 ? km / k : km;
                vI = inh >= 2 ? vmax / k : vmax;
                rows = [['V<sub>max</sub>', vmax], ['K<sub>m</sub>', km]].concat(fit ? [['R²', f.r2]] : [], inh ? [['K<sub>m</sub> with it', kmI], ['V<sub>max</sub> with it', vI]] : []);
                if (!fit && raw.s) {
                    v = vmax * n.s / (km + n.s);
                    rows.push(['v at [S]', v], ['Of V<sub>max</sub>, %', 100 * v / vmax]);
                    if (inh) {
                        vi = vI * n.s / (kmI + n.s);
                        rows.push(['v with it', vi], ['Slowed, %', v ? 100 * (1 - vi / v) : NaN]);
                    }
                }
                if (raw.e && n.e > 0) rows.push(['k<sub>cat</sub>', vmax / n.e], ['k<sub>cat</sub>/K<sub>m</sub>', vmax / n.e / km]);
                x1 = Math.max(6 * Math.max(km, kmI), n.s * 1.5 || 0, Math.max.apply(null, pts.map(function (p) { return p[0]; }).concat([0])) * 1.1);
                drawn = drawnTile(graphDrawing('v against [S]' + (inh ? ', with the inhibitor blue' : ''), 0, x1, {
                    fs: [function (s) { return vmax * s / (km + s); }].concat(inh ? [function (s) { return vI * s / (kmI + s); }] : []),
                    dots: fit ? pts : !raw.s ? [] : [[n.s, v]], marks: [[km, 'Km']], y: [0, vmax * 1.1], names: ['[S]', 'v'] }), 'Michaelis–Menten');
                inv = pts.filter(function (p) { return p[0] > 0 && p[1] > 0; }).map(function (p) { return [1 / p[0], 1 / p[1]]; });
                s0 = 1.3 / Math.min(km, kmI);
                drawn = drawn.concat(drawnTile(graphDrawing('Lineweaver–Burk: 1/v against 1/[S]', -s0, Math.max(s0, Math.max.apply(null, inv.map(function (p) { return p[0]; }).concat([0])) * 1.1),
                    { fs: [function (x) { return km / vmax * x + 1 / vmax; }].concat(inh ? [function (x) { return kmI / vI * x + 1 / vI; }] : []), dots: inv, names: ['1/[S]', '1/v'] }), 'Lineweaver–Burk'));
                return { rows: drawn.concat(physRows(rows)), cols: 2, note: inh ? ['', 'Competitive: K_m up, V_max as it was; more substrate wins.', 'Uncompetitive: both down, the lines parallel.',
                    'Noncompetitive: V_max down, K_m as it was.'][inh] : '' };
            }

            function runHill(n, raw) {
                var none = ['θ'], theta = function (m) { return function (L) { return L <= 0 ? 0 : 1 / (1 + Math.pow(n.K / L, m)); }; }, at = function (p) { return n.K * Math.pow(p / (1 - p), 1 / n.n); }, rows;
                if (!raw.K) return physNone(none);
                if (!(n.K > 0 && n.n > 0) || (raw.L && !(n.L >= 0))) return bioWarn(none, 'K and n above 0, and [L] of 0 or more.');
                rows = (raw.L ? [['θ', theta(n.n)(n.L)], ['Bound, %', 100 * theta(n.n)(n.L)]] : []).concat([['[L] of 10%', at(0.1)], ['[L] of 50%', n.K], ['[L] of 90%', at(0.9)], ['90% ÷ 10%', Math.pow(81, 1 / n.n)]]);
                return { rows: drawnTile(graphDrawing(tr('Bound against [L]{v}', { v: (n.n !== 1 ? tr(', n = 1 blue') : '') }), 0, Math.max(4 * n.K, raw.L ? n.L * 1.3 : 0), { fs: [theta(n.n)].concat(n.n !== 1 ? [theta(1)] : []),
                    y: [0, 1.05], marks: [[n.K, 'K']], dots: raw.L ? [[n.L, theta(n.n)(n.L)]] : [], names: ['[L]', 'θ'] }), 'Binding').concat(physRows(rows)), cols: 2,
                    note: n.n > 1 ? 'Above 1, cooperative: one bound helps the next, an S of a curve.' : n.n < 1 ? 'Below 1: one bound hinders the next.' : '' };
            }

            function runDilute(n, raw) {
                var keys = ['c1', 'v1', 'c2', 'v2'], names = ['C₁', 'V₁', 'C₂', 'V₂'], known = keys.filter(function (k) { return raw[k]; }), c1 = n.c1, v1 = n.v1, c2 = n.c2, v2 = n.v2;
                if (known.length < 3) return Object.assign(physNone(names), { cols: 2, note: known.length ? 'Type three of the four.' : '' });
                if (known.length > 3) return Object.assign(bioWarn(names, 'Three of the four only: leave the one to find empty.'), { cols: 2 });
                if (!raw.c1) c1 = c2 * v2 / v1;
                else if (!raw.v1) v1 = c2 * v2 / c1;
                else if (!raw.c2) c2 = c1 * v1 / v2;
                else v2 = c1 * v1 / c2;
                if (![c1, v1, c2, v2].every(function (x) { return x > 0 && isFinite(x); })) return Object.assign(bioWarn(names, 'Each above 0.'), { cols: 2 });
                if (c2 > c1 * (1 + 1e-12)) return Object.assign(bioWarn(names, 'C₂ above C₁: that is not a dilution.'), { cols: 2 });
                return { rows: drawnTile(tubesDrawing('The stock, the diluent on it, and mixed', [{ top: 'Stock', under: shortNum(c1), parts: [[0.8, 1]] },
                    { top: 'V₁ + diluent', under: shortNum(v1) + ' + ' + shortNum(v2 - v1), parts: [[0.8 * v1 / v2, 1], [0.8 * (1 - v1 / v2), 0]] },
                    { top: 'Mixed', under: shortNum(c2), parts: [[0.8, c2 / c1]] }]), 'The tubes').concat(physRows([['C₁', c1], ['V₁', v1], ['C₂', c2], ['V₂', v2], ['Diluent', v2 - v1], ['Diluted, times', c1 / c2]])),
                    cols: 2, note: 'Take V₁ of the stock and add the diluent to it, to V₂.' };
            }

            function runSerial(n, raw) {
                var none = ['Last'], tubes = [], m = [], i, shown;
                if (!raw.c) return physNone(none);
                if (!(n.c > 0 && n.f > 1 && n.n >= 1 && n.n <= 20 && n.n % 1 === 0 && n.v > 0)) return bioWarn(none, 'C₀ and the volume above 0, a factor above 1, and 1 to 20 steps.');
                shown = Math.min(n.n, 7);
                for (i = 0; i <= n.n; i++) {
                    if (i) m.push([i, n.c / Math.pow(n.f, i), Math.pow(n.f, i)]);
                    if (i <= shown) tubes.push({ top: i ? '1/' + shortNum(Math.pow(n.f, i)) : 'Stock', under: shortNum(n.c / Math.pow(n.f, i)), parts: [[0.75, 1 - i / (shown + 1)]] });
                }
                return { rows: drawnTile(tubesDrawing('Each tube, paler each step', tubes, true), 'The tubes').concat(physRows([['Move on, each', n.v / n.f], ['Diluent in each', n.v - n.v / n.f],
                    ['Last', n.c / Math.pow(n.f, n.n)], ['Diluted, times', Math.pow(n.f, n.n)]]), [{ l: 'Each tube', head: ['Tube', 'Concentration', 'Diluted'], m: m }]),
                    cols: 2, note: tr('Put the diluent in each tube first; move the volume on from each, mixed, to the next.{v}', { v: (n.n > shown ? tr(' The first {v} drawn.', { v: shown }) : '') }) };
            }

            // a balance with a weighing boat on it, its display reading g
            function balanceDrawing(g) {
                return svgOf('', 300, 104, 'The balance', '<path class="calc-sv-fill" d="M100 98h100l-10-28h-80Z"/><path class="calc-sv-seg" d="M150 62V70"/>' +
                    '<ellipse class="calc-sv-fill" cx="150" cy="62" rx="44" ry="6"/><path class="calc-bio-powder" d="M134 60q16-18 32 0Z"/>' +
                    '<rect class="calc-sv-screen" x="118" y="76" width="64" height="16" rx="2"/><text class="calc-bio-lcd" x="176" y="88" text-anchor="end">' + shortNum(g) + ' g</text>');
            }

            function runSolution(n, raw) {
                var by = +raw.by || 0, none = ['Weigh, g'], mw, m, g, stock;
                if (by === 2) {
                    if (!raw.x && !raw.v) return physNone(['Stock, mL']);
                    if (!(n.x > 0 && n.w > 0 && n.w <= n.x && n.v > 0)) return bioWarn(['Stock, mL'], 'The stock above what is wanted, both above 0, and a volume above 0.');
                    stock = n.v * n.w / n.x;
                    return { rows: drawnTile(tubesDrawing('The stock, and the water on it', [{ top: shortNum(n.x) + 'X', under: shortNum(stock) + ' mL', parts: [[0.8, 1]] },
                        { top: shortNum(n.w) + 'X', under: shortNum(n.v) + ' mL', parts: [[0.8 * n.w / n.x, 1], [0.8 * (1 - n.w / n.x), 0]] }]), 'The tubes')
                        .concat(physRows([['Stock, mL', stock], ['Water, mL', n.v - stock]])), cols: 2 };
                }
                if (by === 1) {
                    if (!raw.pc && !raw.v) return physNone(none);
                    if (!(n.pc >= 0 && n.v > 0)) return bioWarn(none, 'A percent of 0 or more and a volume above 0.');
                    g = n.pc * n.v / 100;
                    return { rows: drawnTile(balanceDrawing(g), 'Weigh').concat(physRows([['Weigh, g', g], ['g/L', g * 1000 / n.v]])), cols: 2, note: 'Dissolve it, then make it up to the volume.' };
                }
                if (!raw.m && !raw.v && !raw.mw) return physNone(none);
                mw = raw.mw ? CalcMaths.number(raw.mw, engine.comma, app.deg) : NaN;
                if (raw.mw && isNaN(mw)) {
                    m = CalcChem.molarMass(raw.mw);
                    mw = m.error ? NaN : m.mass;
                }
                if (raw.mw && !(mw > 0)) return bioWarn(none, 'A molar mass in g/mol, or a formula, as NaCl or C4H11NO3.', ['mw']);
                if (!raw.mw) return Object.assign(physNone(none), { note: 'Its molar mass, or its formula.' });
                if (!(n.m >= 0 && n.v > 0)) return bioWarn(none, 'A molarity of 0 or more and a volume above 0.');
                g = n.m * n.v / 1000 * mw;
                return { rows: drawnTile(balanceDrawing(g), 'Weigh').concat(physRows([['Weigh, g', g], ['g/mol', mw], ['mol', n.m * n.v / 1000], ['g/L', n.m * mw]])), cols: 2,
                    note: 'Dissolve it in less, then make it up to the volume.' };
            }

            function runCells(n, raw) {
                var none = ['Live cells/mL'], c = bioList(raw.c), mean, per, dead, rows;
                if (!raw.c) return physNone(none);
                if (c.bad.length) return bioWarn(none, tr('{bad} is not a count.', { bad: escaped(c.bad[0]) }), ['c']);
                if (!c.values.length) return physNone(none);
                if (c.values.length > 9) return bioWarn(none, 'Up to 9 squares.', ['c']);
                if (!(n.dil > 0) || c.values.some(function (x) { return x < 0; }) || (raw.dead && !(n.dead >= 0))) return bioWarn(none, 'Counts of 0 or more, and the dilution above 0.');
                mean = c.values.reduce(function (s, x) { return s + x; }, 0) / c.values.length;
                per = mean * n.dil * 1e4;
                rows = [['Live cells/mL', per], ['Each square', mean]];
                if (raw.dead) {
                    dead = n.dead / c.values.length * n.dil * 1e4;
                    rows.push(['Dead cells/mL', dead], ['Alive, %', per + dead ? 100 * per / (per + dead) : NaN]);
                }
                if (raw.v && n.v > 0) rows.push(['In all, live', per * n.v]);
                if (raw.want && n.want > 0 && per > 0) rows.push(['Take, µL', 1000 * n.want / per]);
                return { rows: drawnTile(hemoDrawing(c.values), 'The squares').concat(physRows(rows)), cols: 2, note: mean < 10 ? 'Few in each square: count more of them, or dilute it less.' : '' };
            }

            function runGrowth(n, raw) {
                var by = +raw.by || 0, none = ['Doubling time'], N0 = n.N0, td, t = n.t, N, gens, cells, marks = [], k;
                if (by === 2) {
                    if (!raw.od) return physNone(['Cells/mL']);
                    if (!(n.od >= 0 && n.dil > 0 && n.per > 0)) return bioWarn(['Cells/mL'], 'An OD of 0 or more, and the dilution and cells for each 1 above 0.');
                    cells = n.od * n.dil * n.per;
                    return { rows: drawnTile(gaugeDrawing('Where it is in its growth, as of E. coli', n.od * n.dil, 0, 3, [0.4, 0.8], [[0, '0'], [0.15, 'Lag'], [0.6, 'Mid-log'], [2, 'Stationary'], [3, '3']]),
                        'Its phase').concat(physRows([['Cells/mL', cells], ['OD₆₀₀ undiluted', n.od * n.dil]])), cols: 2, note: 'Most sure of an OD from 0.1 to 1: dilute a denser culture.' };
                }
                if (!raw.N0 && !raw.t) return physNone(none);
                if (by === 1) {
                    if (!(N0 > 0 && n.td > 0 && t >= 0)) return bioWarn(none, 'N₀ and the doubling time above 0, and t of 0 or more.');
                    td = n.td;
                    N = N0 * Math.pow(2, t / td);
                } else {
                    if (!(N0 > 0 && n.N > N0 && t > 0)) return bioWarn(none, 'N₀ above 0, N above N₀, and t above 0.');
                    N = n.N;
                    td = t * Math.LN2 / Math.log(N / N0);
                }
                gens = t / td;
                for (k = 1; k * td <= t * 1.1 && k <= 12; k++) marks.push([k * td, k < 4 ? k + '×' : '']);
                return { rows: drawnTile(graphDrawing('Its growth, each doubling marked', 0, Math.max(t, td) * 1.1, { fs: [function (x) { return N0 * Math.pow(2, x / td); }], marks: marks, dots: [[t, N]], names: ['t', 'N'] }),
                    'Its growth').concat(physRows([['Doubling time', td], ['Generations', gens], ['N at t', N], ['Rate k, per unit of t', Math.LN2 / td], ['Doublings an hour, of t in min', 60 / td]])),
                    cols: 2, note: 'Each time in the same unit, as minutes.' };
            }

            function runCfu(n, raw) {
                var none = ['CFU/mL'], factor, cfu;
                if (!raw.n || !raw.d) return physNone(none);
                if (!(n.n >= 0 && n.d > 0 && n.v > 0)) return bioWarn(none, 'Colonies of 0 or more, a dilution and the volume plated above 0.');
                factor = n.d <= 1 ? n.d : 1 / n.d;
                cfu = n.n / (factor * n.v);
                return { rows: drawnTile(petriDrawing(n.n), 'The plate').concat(physRows([['CFU/mL', cfu], ['log₁₀ CFU/mL', cfu ? Math.log10(cfu) : NaN], ['Diluted, times', 1 / factor]])), cols: 2,
                    note: n.n < 30 ? 'Fewer than 30: too few to trust; plate a lower dilution.' : n.n > 300 ? 'More than 300: too many to count well; plate a higher dilution.' : '' };
            }

            function runRcf(n, raw) {
                var none = ['g', 'RPM'], rpm, g;
                if (!raw.r && !raw.x) return physNone(none);
                if (!(n.r > 0 && n.x > 0)) return bioWarn(none, (raw.by === '1' ? tr('r and the force above 0.') : tr('r and the speed above 0.')));
                rpm = raw.by === '1' ? Math.sqrt(n.x / (1.118e-5 * n.r)) : n.x;
                g = 1.118e-5 * n.r * rpm * rpm;
                return { rows: drawnTile(rotorDrawing(n.r), 'The rotor').concat(physRows([['g', g], ['RPM', rpm], ['ω, rad/s', rpm * Math.PI / 30], ['The tube goes, m/s', rpm * Math.PI / 30 * n.r / 100]])),
                    cols: 2, note: 'r from the middle of the rotor to the bottom of the tube, as its maker gives it.' };
            }

            function runPcrMix(n, raw) {
                var none = ['Water, each'], k, parts, rows = [], water;
                if (!raw.n) return physNone(none);
                if (!(n.n >= 1 && n.v > 0 && n.x >= 0 && n.buf > 1 && n.dntp > 0 && n.dfin >= 0 && n.pr > 0 && n.pfin >= 0 && n.pol >= 0 && n.tmp >= 0)) {
                    return bioWarn(none, 'One reaction or more, each part\'s stock above 0, and the buffer above 1X.');
                }
                k = n.n * (1 + n.x / 100);
                parts = [['Buffer', n.v / n.buf, '#f2e2b8'], ['dNTPs', n.v * n.dfin / (n.dntp * 1000), '#e1d6ef'], ['Forward primer', n.v * n.pfin / n.pr, '#cfdcf0'],
                    ['Reverse primer', n.v * n.pfin / n.pr, '#cfdcf0'], ['Polymerase', n.pol, '#f3d3d7']];
                water = n.v - n.tmp - parts.reduce(function (s, p) { return s + p[1]; }, 0);
                if (water < 0) return bioWarn(none, tr('The parts add to more than the volume: {v} µL.', { v: shortNum(n.v - water) }));
                parts.unshift(['Water', water, '#cfe8ec']);
                parts.forEach(function (p) { rows.push([tr('{p}, each', { p: p[0] }), p[1]], [tr('{p}, mix', { p: p[0] }), p[1] * k]); });
                rows.push(['Template, each', n.tmp], ['Mix in each tube', n.v - n.tmp], ['Mix made for', k]);
                return { rows: drawnTile(stackDrawing('A reaction, part by part', parts.concat([['Template', n.tmp, '#d3e5da']]).map(function (p) { return [p[0].replace(' primer', '') + ' ' + shortNum(p[1]), p[1], p[2]]; })),
                    'A reaction').concat(physRows(rows)), cols: 2, note: 'All in µL. The template goes in each tube, not in the mix; the polymerase last, on ice.' };
            }

            function runQpcr(n, raw) {
                var none = ['Fold change'], dc, dt, dd, fold, pf, rows;
                if (!raw.tc && !raw.rc && !raw.tt && !raw.rt) return physNone(none);
                if (!(raw.tc && raw.rc && raw.tt && raw.rt)) return Object.assign(physNone(none), { note: 'All four Ct.' });
                if (![n.tc, n.rc, n.tt, n.rt].every(isFinite) || (raw.et && !(n.et > 0)) || (raw.er && !(n.er > 0))) return bioWarn(none, 'Four Ct, and efficiencies above 0.');
                dc = n.tc - n.rc;
                dt = n.tt - n.rt;
                dd = dt - dc;
                fold = Math.pow(2, -dd);
                rows = [['ΔCt, control', dc], ['ΔCt, treated', dt], ['ΔΔCt', dd], ['Fold change', fold], ['log₂ fold', -dd]];
                if (raw.et && raw.er) {
                    pf = Math.pow(1 + n.et / 100, n.tc - n.tt) / Math.pow(1 + n.er / 100, n.rc - n.rt);
                    rows.push(['By Pfaffl', pf]);
                }
                return { rows: drawnTile(labelBars('The fold change, the control 1', [['Control', 1], ['Treated', fold, true]].concat(pf ? [['By Pfaffl', pf, true]] : [])), 'Fold change')
                    .concat(physRows(rows), [textRow('The gene', fold >= 1 ? tr('Up {fold} times', { fold: shortNum(fold) }) : tr('Down {v} times', { v: shortNum(1 / fold) }))]), cols: 2,
                    note: raw.et && raw.er ? '' : 'Livak\'s 2^−ΔΔCt takes both genes as doubling each cycle: with their efficiencies, Pfaffl\'s too.' };
            }

            function runStdCurve(n, raw) {
                var none = ['Slope', 'Efficiency, %'], pts = bioPairs(raw.pts), xy, line, u, q, eff, r2, notes = [], xs;
                if (!raw.pts) return physNone(none);
                if (!pts) return bioWarn(none, 'A quantity and its Ct on each line: 100000 18.5.', ['pts']);
                if (pts.length < 2) return Object.assign(physNone(none), { note: 'Two standards or more.' });
                if (!pts.every(function (p) { return p[0] > 0; })) return bioWarn(none, 'Quantities above 0.', ['pts']);
                xy = pts.map(function (p) { return { x: Math.log10(p[0]), y: p[1] }; });
                line = bioFit(xy);
                if (!line || !line.m) return bioWarn(none, 'Standards of different quantities.');
                u = bioList(raw.u);
                if (u.bad.length) return bioWarn(none, tr('{bad} is not a Ct.', { bad: escaped(u.bad[0]) }), ['u']);
                q = u.values.slice(0, 12).map(function (ct) { return Math.pow(10, (ct - line.b) / line.m); });
                eff = 100 * (Math.pow(10, -1 / line.m) - 1);
                r2 = rSquared(xy, line);
                if (!(eff >= 90 && eff <= 110)) notes.push('An efficiency outside 90 to 110%: check the dilutions and the primers.');
                if (r2 < 0.98) notes.push('R² below 0.98: a standard may be off.');
                xs = xy.map(function (p) { return p.x; }).concat(q.map(Math.log10));
                return { rows: drawnTile(graphDrawing('The standards and their line, the unknowns red', Math.min.apply(null, xs) - 0.5, Math.max.apply(null, xs) + 0.5, { fs: [function (x) { return line.m * x + line.b; }],
                    pts: xy.map(function (p) { return [p.x, p.y]; }), dots: q.map(function (v, i) { return [Math.log10(v), u.values[i]]; }), names: ['log₁₀ quantity', 'Ct'] }), 'The curve')
                    .concat(physRows([['Slope', line.m], ['Intercept', line.b], ['R²', r2], ['Efficiency, %', eff]].concat(q.map(function (v, i) { return ['Unknown ' + (i + 1), v]; })))), cols: 2, note: notes.join(' ') };
            }

            function runErrorBars(n, raw) {
                var none = ['Mean', '± 2 SE'], groups = [], bad = '', rows = [], notes = [], i, j;
                String(raw.g || '').split(/[\r\n]+/).forEach(function (line, k) {
                    var m = /^\s*([^:\d−\-+.,][^:]*?)\s*:\s*(.*)$/.exec(line), list;
                    if (!line.trim()) return;
                    list = bioList(m ? m[2] : line);
                    if (list.bad.length && !bad) bad = list.bad[0];
                    groups.push({ name: m ? m[1] : tr('Group {k}', { k: (k + 1) }), x: list.values });
                });
                if (!groups.length) return physNone(none);
                if (bad) return bioWarn(none, tr('{bad} is not a number. A group to a line, its name first if it has one: Light: 12 15 11.', { bad: escaped(bad) }), ['g']);
                if (groups.length > 8) return bioWarn(none, 'Up to 8 groups.', ['g']);
                if (groups.some(function (g) { return g.x.length < 2; })) return bioWarn(none, 'Two numbers or more in each group.', ['g']);
                groups.forEach(function (g) {
                    var k = g.x.length, mean = g.x.reduce(function (s, x) { return s + x; }, 0) / k, sd = Math.sqrt(g.x.reduce(function (s, x) { return s + (x - mean) * (x - mean); }, 0) / (k - 1));
                    g.mean = mean;
                    g.half = 2 * sd / Math.sqrt(k);
                    rows.push({ l: tr('{name}, mean', { name: escaped(g.name) }), v: CalcMaths.round(mean) }, { l: '± 2 SE', v: CalcMaths.round(g.half) }, { l: 'SD', v: CalcMaths.round(sd) }, { l: 'n', v: k });
                });
                for (i = 0; i < groups.length; i++) {
                    for (j = i + 1; j < groups.length; j++) {
                        if (groups[i].mean + groups[i].half < groups[j].mean - groups[j].half || groups[j].mean + groups[j].half < groups[i].mean - groups[i].half) {
                            notes.push(tr('{groups} and {groups2}', { groups: escaped(groups[i].name), groups2: escaped(groups[j].name) }));
                        }
                    }
                }
                return { rows: drawnTile(errorDrawing(groups.map(function (g) { return [g.name, g.mean, g.half]; })), 'The means').concat(rows), cols: 4,
                    note: notes.length ? tr('Not overlapping, likely a real difference: {v}.', { v: notes.join('; ') }) : groups.length > 1 ? 'Every pair overlaps: no difference shown.' : '' };
            }

            function runChromatography(n, raw) {
                var none = ['R<sub>f</sub>'], d = bioList(raw.d), names = ['carotene', 'xanthophyll', 'chlorophyll a', 'chlorophyll b'];
                if (!raw.s && !raw.d) return physNone(none);
                if (d.bad.length) return bioWarn(none, tr('{bad} is not a distance.', { bad: escaped(d.bad[0]) }), ['d']);
                if (!(n.s > 0) || !d.values.length || d.values.some(function (x) { return !(x >= 0 && x <= n.s); })) return bioWarn(none, 'The solvent\'s distance above 0, and each spot from 0 to it.');
                return { rows: drawnTile(stripDrawing(n.s, d.values.slice(0, 10)), 'The strip').concat(physRows(d.values.slice(0, 10).map(function (x, i) { return ['Spot ' + (i + 1) + ', R<sub>f</sub>', x / n.s]; })),
                    [textRow('Likely, in petroleum ether and acetone', d.values.slice(0, 10).map(function (x, i) {
                        var rf = x / n.s;
                        return (i + 1) + ' ' + names[rf > 0.85 ? 0 : rf > 0.6 ? 1 : rf > 0.45 ? 2 : 3];
                    }).join(', '))]), cols: 2 };
            }

            function runMicroscope(n, raw) {
                var none = ['M'], M, img, real, fov;
                if (raw.by === '1') {
                    if (!raw.obj) return physNone(['Field, µm']);
                    if (!(n.eye > 0 && n.obj > 0 && n.fn > 0) || (raw.cell && !(n.cell > 0)) || (raw.na && !(n.na > 0 && n.na < 1.6))) return bioWarn(['Field, µm'], 'Each above 0, and an NA up to 1.5.');
                    fov = 1000 * n.fn / n.obj;
                    return { rows: drawnTile(fieldDrawing(fov, raw.cell ? n.cell : 0), 'The field').concat(physRows([['Magnification', n.eye * n.obj], ['Field, mm', fov / 1000], ['Field, µm', fov]]
                        .concat(raw.cell ? [['Cells across', fov / n.cell]] : [], raw.na ? [['Smallest seen, µm', 0.61 * 0.55 / n.na]] : []))), cols: 2,
                        note: raw.na ? 'The smallest by Abbe, in green light, 550 nm.' : '' };
                }
                var known = ['img', 'real', 'M'].filter(function (k) { return raw[k]; });
                if (known.length < 2) return Object.assign(physNone(none), { note: known.length ? 'Two of the three.' : '' });
                if (known.length > 2) return bioWarn(none, 'Two of the three only: leave the one to find empty.');
                img = n.img;
                real = n.real;
                M = n.M;
                if (!raw.M) M = img * 1000 / real;
                else if (!raw.img) img = M * real / 1000;
                else real = img * 1000 / M;
                if (![img, real, M].every(function (x) { return x > 0 && isFinite(x); })) return bioWarn(none, 'Each above 0.');
                return { rows: physRows([['M', M], ['Image, mm', img], ['Actual, µm', real], ['A scale bar of 10 µm, mm', M * 0.01]]), cols: 2,
                    note: 'The image in mm, the actual in µm: 1 mm is 1000 µm.' };
            }

            function runWater(n, raw) {
                var none = ['Ψ<sub>S</sub>, bar', 'Ψ, bar'], s, psi;
                if (!raw.C) return physNone(none);
                if (!(n.i > 0 && n.C >= 0 && n.T > -273.15 && isFinite(n.P))) return bioWarn(none, 'i above 0, C of 0 or more, and a temperature.');
                s = -n.i * n.C * R_BAR * (n.T + 273.15);
                psi = n.P + s;
                return { rows: (raw.out && isFinite(n.out) ? drawnTile(waterDrawing(psi, n.out), 'Which way') : []).concat(physRows([['Ψ<sub>S</sub>, bar', s], ['Ψ, bar', psi], ['Ψ<sub>S</sub>, MPa', s / 10], ['Ψ, MPa', psi / 10]]),
                    raw.out ? [textRow('Water', n.out > psi ? 'Goes in: from the higher Ψ outside to the lower in' : n.out < psi ? 'Goes out: from the higher Ψ in to the lower outside' : 'Goes neither way: at equilibrium')] : []),
                    cols: 2, note: 'R is 0.0831 L·bar/(mol·K); water moves from the higher Ψ to the lower.' };
            }

            function runTonicity(n, raw) {
                var sol = SOLUTES[+raw.sol || 0], i = isNaN(sol[1]) ? n.i : sol[1], none = ['mOsm/L'], osm, kind;
                if (!raw.C) return physNone(none);
                if (!(n.C >= 0 && i > 0 && n.cell > 0)) return bioWarn(none, 'C of 0 or more, i and the cell\'s above 0.');
                osm = i * n.C;
                kind = osm < n.cell * 0.97 ? 0 : osm > n.cell * 1.03 ? 2 : 1;
                return { rows: drawnTile(rbcDrawing(kind), 'A red blood cell').concat(physRows([['mOsm/L', osm], ['i', i]]), [textRow('It is', ['Hypotonic: water goes into the cell', 'Isotonic: water goes neither way',
                    'Hypertonic: water leaves the cell'][kind])]), cols: 2, note: 'Saline of 0.9%, 154 mM of NaCl, is isotonic; of a solute that crosses the membrane, as urea, less so than it seems.' };
            }

            function runSav(n, raw) {
                var shape = +raw.shape || 0, none = ['SA:V'], a = n.r, sa, v, ratio;
                if (!raw.r) return physNone(none);
                if (!(a > 0) || (shape === 2 && !(n.h > 0))) return bioWarn(none, 'Sizes above 0.');
                sa = shape === 0 ? 6 * a * a : shape === 1 ? 4 * Math.PI * a * a : 2 * Math.PI * a * (a + n.h);
                v = shape === 0 ? a * a * a : shape === 1 ? 4 / 3 * Math.PI * a * a * a : Math.PI * a * a * n.h;
                ratio = sa / v;
                return { rows: drawnTile(cellShapeDrawing(shape, a, n.h), 'The shape').concat(drawnTile(graphDrawing('SA:V as it grows, its shape kept', 0.25 * a, 3 * a, { fs: [function (x) { return ratio * a / x; }],
                    dots: [[a, ratio]], y: [0, ratio * 4.2], names: [shape === 0 ? 'side' : 'r', 'SA:V'] }), 'As it grows'), physRows([['SA', sa], ['V', v], ['SA:V', ratio]])), cols: 3,
                    note: 'Twice as big, half the SA:V: a bigger cell has less surface for each of its volume to take in and give out through.' };
            }

            function runQ10(n, raw) {
                var none = ['Q<sub>10</sub>'], q, r2, lo, hi;
                if (!raw.r1 && !raw.t1) return physNone(none);
                if (raw.by === '1') {
                    if (!(n.r1 > 0 && n.q > 0 && isFinite(n.t1 + n.t2))) return bioWarn(none, 'R₁ and Q₁₀ above 0, and both temperatures.');
                    q = n.q;
                    r2 = n.r1 * Math.pow(q, (n.t2 - n.t1) / 10);
                } else {
                    if (!(n.r1 > 0 && n.r2 > 0 && isFinite(n.t1 + n.t2) && n.t1 !== n.t2)) return bioWarn(none, 'Both rates above 0, at two temperatures.');
                    r2 = n.r2;
                    q = Math.pow(r2 / n.r1, 10 / (n.t2 - n.t1));
                }
                lo = Math.min(n.t1, n.t2) - 5;
                hi = Math.max(n.t1, n.t2) + 5;
                return { rows: drawnTile(graphDrawing('The rate against the temperature', lo, hi, { fs: [function (T) { return n.r1 * Math.pow(q, (T - n.t1) / 10); }], dots: [[n.t1, n.r1], [n.t2, r2]],
                    names: ['°C', 'rate'] }), 'The rate').concat(physRows([['Q<sub>10</sub>', q], ['R<sub>2</sub>', r2], ['R₂ ÷ R₁', r2 / n.r1]])), cols: 3,
                    note: q < 1 ? 'Below 1: it slows as it warms, as an enzyme past its best does.' : '' };
            }

            function runFick(n, raw) {
                var none = raw.by === '1' ? ['t, s'] : ['J, mol/s'], t, J;
                if (!raw.D) return physNone(none);
                if (raw.by === '1') {
                    if (!(n.D > 0 && n.x > 0)) return bioWarn(none, 'D and x above 0.');
                    t = n.x * n.x / (2 * n.D);
                    return { rows: drawnTile(graphDrawing('The time to spread, as the square of the distance', 0, 2 * n.x, { fs: [function (x) { return x * x / (2 * n.D); }], dots: [[n.x, t]], names: ['x, m', 't, s'] }),
                        'Its time').concat(physRows([['t, s', t], ['t, min', t / 60], ['t, h', t / 3600], ['t, days', t / 86400]])), cols: 2, note: 'In one direction; twice the distance takes four times as long.' };
                }
                if (!(n.D > 0 && n.A > 0 && isFinite(n.dC) && n.d > 0)) return bioWarn(none, 'D, A and d above 0, and ΔC.');
                J = n.D * n.A * n.dC / n.d;
                return { rows: drawnTile(graphDrawing('The concentration across the membrane, shaded', 0, 3, { fs: [function (x) { return x < 1 ? n.dC : x > 2 ? 0 : n.dC * (2 - x); }], bands: [[1, 2]],
                    names: ['across', 'C'] }), 'The gradient').concat(physRows([['J, mol/s', J], ['Flux, mol/(m²·s)', J / n.A], ['J, mol/h', J * 3600]])), cols: 2,
                    note: 'Faster of a larger area and difference, slower of a thicker membrane.' };
            }

            function runMembrane(n, raw) {
                var none = ['E, mV'], ion, z, E, ek, ena, ecl, vm, T = n.T;
                if (raw.by === '1') {
                    if (!['pk', 'pna', 'pcl', 'ko', 'nao', 'clo', 'ki', 'nai', 'cli'].some(function (k) { return raw[k]; })) return physNone(['V<sub>m</sub>, mV']);
                    if (![n.pk, n.pna, n.pcl].every(function (p) { return p >= 0; }) || ![n.ko, n.nao, n.clo, n.ki, n.nai, n.cli].every(function (c) { return c > 0; }) || !(T > -273.15)) {
                        return bioWarn(['V<sub>m</sub>, mV'], 'Permeabilities of 0 or more, not all 0, and concentrations above 0.');
                    }
                    if (!(n.pk + n.pna + n.pcl > 0)) return bioWarn(['V<sub>m</sub>, mV'], 'A permeability above 0.');
                    vm = CalcBiology.goldman([n.pk, n.pna, n.pcl], [n.ko, n.nao, n.clo], [n.ki, n.nai, n.cli], T);
                    ek = CalcBiology.nernst(1, n.ko, n.ki, T);
                    ena = CalcBiology.nernst(1, n.nao, n.nai, T);
                    ecl = CalcBiology.nernst(-1, n.clo, n.cli, T);
                    return { rows: drawnTile(potentialDrawing([['K⁺', ek], ['Na⁺', ena], ['Cl⁻', ecl], ['Vm', vm, true]]), 'On a scale of mV').concat(physRows([['V<sub>m</sub>, mV', vm], ['E<sub>K</sub>, mV', ek],
                        ['E<sub>Na</sub>, mV', ena], ['E<sub>Cl</sub>, mV', ecl]])), cols: 2, note: 'Nearest the potential of the ion it lets through most, K⁺ at rest.' };
                }
                ion = IONS[+raw.ion];
                z = ion ? ion[1] : n.z;
                if (!raw.o && !raw.ins) return physNone(none);
                if (!(n.o > 0 && n.ins > 0 && z && isFinite(z) && T > -273.15)) return bioWarn(none, 'Both concentrations above 0, and a charge.');
                E = CalcBiology.nernst(z, n.o, n.ins, T);
                return { rows: drawnTile(potentialDrawing([[ion ? ion[0] : 'E', E, true], ['Rest', -70]]), 'On a scale of mV').concat(physRows([['E, mV', E], ['Out ÷ in', n.o / n.ins]])), cols: 2,
                    note: 'Where the ion is at balance: its pull down its gradient met by the voltage.' };
            }

            function runGibbs(n, raw) {
                var none = ['ΔG, kJ/mol'], RT, dG, K, lk, lq, span, c;
                if (!raw.g) return physNone(none);
                if (!(n.q > 0 && n.T > -273.15 && isFinite(n.g))) return bioWarn(none, 'ΔG°′, Q above 0 and a temperature.');
                RT = 8.314462618e-3 * (n.T + 273.15);
                dG = n.g + RT * Math.log(n.q);
                K = Math.exp(-n.g / RT);
                lk = -n.g / (RT * Math.LN10);
                lq = Math.log10(n.q);
                c = (lk + lq) / 2;
                span = Math.max(Math.abs(lk - lq) / 2 + 3, 5);
                return { rows: drawnTile(graphDrawing('ΔG against Q, shaded where it goes forward', c - span, c + span, { fs: [function (x) { return n.g + RT * Math.LN10 * x; }], bands: [[c - span, lk]],
                    dots: [[lq, dG]], marks: [[lk, 'K']], names: ['log₁₀ Q', 'ΔG'] }), 'Against Q').concat(physRows([['ΔG, kJ/mol', dG], ['ΔG, kcal/mol', dG / 4.184], ['K', K]]),
                    [textRow('It goes', dG < 0 ? 'Forward, on its own' : dG > 0 ? 'Backward; forward only coupled to another, as to ATP' : 'Neither way: at equilibrium')]), cols: 3 };
            }

            function runHeart(n, raw) {
                var none = ['CO, L/min', 'MAP, mmHg'], co = n.hr * n.sv / 1000, map = n.dbp + (n.sbp - n.dbp) / 3, rows = [], beat;
                if (!raw.hr && !raw.sv && !raw.sbp && !raw.dbp) return physNone(none);
                if ((raw.hr && !(n.hr > 0)) || (raw.sv && !(n.sv > 0)) || (raw.sbp && raw.dbp && !(n.sbp > n.dbp && n.dbp > 0))) return bioWarn(none, 'Each above 0, the systolic above the diastolic.');
                if (raw.hr && raw.sv) rows.push(['CO, L/min', co]);
                if (raw.sbp && raw.dbp) rows.push(['MAP, mmHg', map], ['Pulse pressure', n.sbp - n.dbp]);
                if (raw.hr && raw.sv && raw.sbp && raw.dbp) rows.push(['Resistance, mmHg·min/L', map / co]);
                if (raw.hr) rows.push(['A beat, s', 60 / n.hr]);
                beat = 60 / (n.hr || 70);
                return { rows: (raw.sbp && raw.dbp ? drawnTile(graphDrawing('The pressure, beat by beat, the mean blue', 0, 3 * beat, { fs: [function (t) {
                    var f = (t % beat) / beat, A = n.sbp - n.dbp, e = Math.exp(-3);
                    if (f < 0.12) return n.dbp + A * Math.sin(Math.PI / 2 * f / 0.12);
                    if (f < 0.32) return n.sbp - 0.45 * A * (f - 0.12) / 0.2;
                    return n.dbp + 0.55 * A * (Math.exp(-3 * (f - 0.32) / 0.68) - e) / (1 - e) + 0.06 * A * Math.exp(-Math.pow((f - 0.38) / 0.03, 2));
                }], lines: [[0, map, 3 * beat, map]], y: [n.dbp - 0.15 * (n.sbp - n.dbp), n.sbp + 0.15 * (n.sbp - n.dbp)], names: ['s', 'mmHg'] }), 'The pressure') : []).concat(physRows(rows)), cols: 2,
                    note: raw.hr && raw.sv ? '' : 'With the heart rate and stroke volume, the cardiac output.' };
            }

            function runRespiration(n, raw) {
                var mol, rq;
                if (raw.by === '1') {
                    if (!raw.co2 && !raw.o2) return physNone(['RQ']);
                    if (!(n.co2 >= 0 && n.o2 > 0)) return bioWarn(['RQ'], 'CO₂ of 0 or more, and O₂ above 0.');
                    rq = n.co2 / n.o2;
                    return { rows: drawnTile(gaugeDrawing('Where its RQ is, among what it burns', rq, 0.6, 1.1, null, [[0.6, shortNum(0.6)], [0.7, 'Fat'], [0.8, 'Protein'], [1, 'Carbohydrate'], [1.1, shortNum(1.1)]]),
                        'What it burns').concat(physRows([['RQ', rq]]), [textRow('Burning mostly', rq > 0.95 ? 'Carbohydrate' : rq > 0.85 ? 'A mix, carbohydrate and fat' : rq > 0.75 ? 'Protein, or fat and carbohydrate' : 'Fat')]),
                        cols: 2, note: rq > 1 ? 'Above 1: making fat, or breathing hard.' : '' };
                }
                if (!raw.g) return physNone(['ATP, mol']);
                if (!(n.g >= 0)) return bioWarn(['ATP, mol'], 'A mass of 0 or more.');
                mol = n.g / 180.156;
                return { rows: drawnTile(labelBars('The ATP of each glucose, where it is made', [['Glycolysis', 2], ['Krebs cycle', 2], ['Electron transport', 27, true]], function (v) { return v === 27 ? '26–28' : shortNum(v); }),
                    'Its ATP').concat(physRows([['Glucose, mol', mol], ['O₂, g', 6 * mol * 31.998], ['CO₂, g', 6 * mol * 44.009], ['Water, g', 6 * mol * 18.015], ['ATP, mol', 30 * mol], ['to, mol', 32 * mol],
                        ['Energy, kJ', 2870 * mol], ['Energy, kcal', 2870 * mol / 4.184]])), cols: 2, note: 'Some 30 to 32 ATP each, of the 2870 kJ a mole about a third kept.' };
            }

            function runPopGrowth(n, raw) {
                var logistic = raw.by === '1', none = ['N at t'], N, Nt, rate, tf, x1;
                if (!raw.N0 && !raw.r) return physNone(none);
                if (!(n.N0 > 0 && isFinite(n.r) && n.t >= 0) || (logistic && !(n.K > 0))) return bioWarn(none, tr('N₀ above 0, a rate r, t of 0 or more{v}', { v: (logistic ? tr(', and K above 0.') : '.') }));
                N = logistic ? function (t) { return n.K / (1 + (n.K - n.N0) / n.N0 * Math.exp(-n.r * t)); } : function (t) { return n.N0 * Math.exp(n.r * t); };
                Nt = N(n.t);
                if (!isFinite(Nt)) return bioWarn(none, 'Too many to show.');
                rate = logistic ? n.r * Nt * (n.K - Nt) / n.K : n.r * Nt;
                tf = logistic && n.N0 < n.K && n.r > 0 ? Math.log((n.K - n.N0) / n.N0) / n.r : NaN;
                x1 = Math.max(n.t * 1.2, isFinite(tf) ? tf * 2.2 : 0) || 1;
                return { rows: drawnTile(graphDrawing(logistic ? 'Its growth, K dashed in blue' : 'Its growth', 0, x1, { fs: [N], lines: logistic ? [[0, n.K, x1, n.K]] : [], dots: [[n.t, Nt]],
                    marks: isFinite(tf) ? [[tf, 'K/2']] : [], names: ['t', 'N'] }), 'Its growth').concat(physRows([['N at t', Nt], ['dN/dt at t', rate]].concat(n.r > 0 && !logistic ? [['Doubling time', Math.LN2 / n.r]] : [],
                    isFinite(tf) ? [['Fastest at t', tf], ['Fastest dN/dt', n.r * n.K / 4]] : []))), cols: 2 };
            }

            function runPredator(n, raw) {
                var none = ['Prey', 'Predators'], steps = 400, run, h, at, ns, ps;
                if (!raw.N && !raw.P) return physNone(none);
                if (![n.N, n.P, n.a, n.b, n.c, n.d].every(function (x) { return x > 0; }) || !(n.t > 0 && n.t <= 1e5)) return bioWarn(none, 'Each above 0.');
                run = CalcBiology.predators(n.N, n.P, n.a, n.b, n.c, n.d, n.t, steps);
                h = n.t / steps;
                at = function (k) { return function (t) { var i = Math.min(steps - 1, Math.floor(t / h)), f = t / h - i; return run[i][k] + (run[i + 1][k] - run[i][k]) * f; }; };
                ns = run.map(function (r) { return r[1]; });
                ps = run.map(function (r) { return r[2]; });
                return { rows: drawnTile(graphDrawing('Prey red and predators blue, over time', 0, n.t, { fs: [at(1), at(2)], names: ['t', 'N, P'] }), 'Over time')
                    .concat(drawnTile(graphDrawing('Predators against prey, round their balance', Math.min.apply(null, ns) * 0.9, Math.max.apply(null, ns) * 1.1 || 1, { paths: [run.map(function (r) { return [r[1], r[2]]; })],
                        dots: [[n.c / n.d, n.a / n.b]], names: ['prey', 'predators'] }), 'Against each other'),
                    physRows([['Prey at t', run[steps][1]], ['Predators at t', run[steps][2]], ['Prey at balance', n.c / n.d], ['Predators at balance', n.a / n.b], ['A cycle, about', 2 * Math.PI / Math.sqrt(n.a * n.c)],
                        ['Most prey', Math.max.apply(null, ns)], ['Fewest prey', Math.min.apply(null, ns)], ['Most predators', Math.max.apply(null, ps)]])), cols: 2,
                    note: 'The predators\' peaks come a quarter of a cycle after the prey\'s.' };
            }

            function runRecapture(n, raw) {
                var none = ['N'], lp, ch, v;
                if (!raw.M && !raw.C && !raw.R) return physNone(none);
                if (!(n.M > 0 && n.C > 0 && n.R >= 0 && n.R <= n.C && n.R <= n.M)) return bioWarn(none, 'M and C above 0, and R of 0 or more, no more than either.');
                lp = n.R ? n.M * n.C / n.R : NaN;
                ch = (n.M + 1) * (n.C + 1) / (n.R + 1) - 1;
                v = (n.M + 1) * (n.C + 1) * (n.M - n.R) * (n.C - n.R) / ((n.R + 1) * (n.R + 1) * (n.R + 2));
                return { rows: drawnTile(catchDrawing(n.C, n.R), 'The second catch').concat(physRows([['N, Lincoln–Petersen', lp], ['N, Chapman', ch], ['95% from', Math.max(n.M + n.C - n.R, ch - 1.96 * Math.sqrt(v))],
                    ['95% to', ch + 1.96 * Math.sqrt(v)], ['Marked in the catch, %', 100 * n.R / n.C]])), cols: 2,
                    note: n.R < 7 ? 'Fewer than 7 recaptured: rough, and it may be biased.' : 'It takes a closed population, the marks kept, and every animal as likely caught.' };
            }

            function runDiversity(n, raw) {
                var none = ['Simpson\'s D', 'Shannon\'s H'], c = bioList(raw.c), d, sorted;
                if (!raw.c) return physNone(none);
                if (c.bad.length) return bioWarn(none, tr('{bad} is not a count.', { bad: escaped(c.bad[0]) }), ['c']);
                if (c.values.some(function (x) { return x < 0; }) || !c.values.some(function (x) { return x > 0; })) return bioWarn(none, 'Counts of 0 or more, some above 0.');
                d = CalcBiology.diversity(c.values);
                sorted = c.values.filter(function (x) { return x > 0; }).sort(function (a, b) { return b - a; });
                return { rows: drawnTile(labelBars('Each species, % of all, the commonest first', sorted.slice(0, 16).map(function (x, i) { return [String(i + 1), 100 * x / d.N]; }), pcText), 'The species')
                    .concat(physRows([['Species', d.S], ['Individuals', d.N], ['Simpson\'s D', d.simpson], ['1 – D', 1 - d.simpson], ['1/D', 1 / d.simpson], ['Shannon\'s H', d.shannon], ['Evenness', d.even], ['Σp²', d.lambda]])),
                    cols: 2, note: 'D, the chance two taken at random are of one species: the lower, the more diverse; H the higher.' };
            }

            function runLifeTable(n, raw) {
                var none = ['e<sub>0</sub>'], c = bioList(raw.n), nx = c.values, rows, pts, half, kind;
                if (!raw.n) return physNone(none);
                if (c.bad.length) return bioWarn(none, tr('{bad} is not a count.', { bad: escaped(c.bad[0]) }), ['n']);
                if (nx.length < 2) return Object.assign(physNone(none), { note: 'Two ages or more.' });
                if (nx.length > 60 || !(nx[0] > 0) || nx.some(function (x, i) { return x < 0 || (i && x > nx[i - 1]); })) return bioWarn(none, 'Up to 60 ages, the first above 0, none more than the one before.', ['n']);
                rows = CalcBiology.lifeTable(nx);
                pts = rows.filter(function (r) { return r[2] > 0; }).map(function (r) { return [r[0], Math.log10(r[2])]; });
                half = alongPoints(rows.map(function (r) { return [r[0], r[2]]; }), (nx.length - 1) / 2);
                kind = half > 0.6 ? 'I: most live long, as people' : alongPoints(rows.map(function (r) { return [r[0], r[2]]; }), (nx.length - 1) / 4) < 0.2 ? 'III: most die young, as fish and trees' : 'II: a steady chance of dying, as birds';
                return { rows: drawnTile(graphDrawing('Survivorship, lₓ on a scale of logarithms', 0, nx.length - 1, { fs: [function (x) { return x > pts[pts.length - 1][0] ? NaN : alongPoints(pts, x); }], pts: pts, names: ['age', 'log₁₀ lₓ'] }), 'Survivorship')
                    .concat(physRows([['e<sub>0</sub>', rows[0][7]], ['Ages', nx.length]]), [textRow('Like type', kind), { l: 'Each age', head: ['x', 'nₓ', 'lₓ', 'dₓ', 'qₓ', 'eₓ'],
                        m: rows.filter(function (r) { return r[1] > 0; }).map(function (r) { return [r[0], r[1], r[2], r[3], r[4], r[7]]; }) }]), cols: 2, note: 'Each age in the same unit, as years: eₓ, the years left, of the middle of each.' };
            }

            function runPyramid(n, raw) {
                var none = ['Top'], names = ['Producers', 'Primary', 'Secondary', 'Tertiary', 'Quaternary', '5th', '6th', '7th'], levels = [], i;
                if (!raw.E) return physNone(none);
                if (!(n.E > 0 && n.pc > 0 && n.pc <= 100 && n.n >= 2 && n.n <= 8 && n.n % 1 === 0)) return bioWarn(none, 'Energy above 0, a percent up to 100, and 2 to 8 levels.');
                for (i = 0; i < n.n; i++) levels.push([names[i], n.E * Math.pow(n.pc / 100, i)]);
                return { rows: drawnTile(pyramidDrawing(levels), 'The pyramid').concat(physRows(levels.map(function (l) { return [l[0], l[1]]; }).concat([['To the top, %', 100 * Math.pow(n.pc / 100, n.n - 1)]]))),
                    cols: 2, note: 'In the units of the producers\', as kJ/m²/year. The rest goes as heat, in respiration, and in what is not eaten.' };
            }

            function runProductivity(n, raw) {
                var none = ['GPP', 'NPP'], gpp, npp, r;
                if (!raw.i && !raw.l && !raw.d) return physNone(none);
                if (!(n.i >= 0 && n.l >= 0 && n.d >= 0 && n.h > 0)) return bioWarn(none, 'Oxygen of 0 or more, and hours above 0.');
                gpp = n.l - n.d;
                npp = n.l - n.i;
                r = n.i - n.d;
                return { rows: drawnTile(labelBars('Gross, net and respiration, mg O₂/L', [['GPP', gpp, true], ['NPP', npp], ['Respiration', r]]), 'Productivity')
                    .concat(physRows([['GPP', gpp], ['NPP', npp], ['Respiration', r], ['GPP an hour', gpp / n.h], ['NPP an hour', npp / n.h], ['GPP, mg C/L', 0.375 * gpp]])), cols: 2,
                    note: n.d > n.i ? 'The dark bottle gained oxygen: check the readings.' : 'mg O₂/L; GPP = NPP + respiration.' };
            }

            function runSelection(n, raw) {
                var none = ['p after', 'q after'], path, pts, w, last, mean;
                if (!raw.p && !raw.w3) return physNone(none);
                if (!(n.p >= 0 && n.p <= 1 && n.gens >= 1 && n.gens <= 10000 && n.gens % 1 === 0 && n.w1 >= 0 && n.w2 >= 0 && n.w3 >= 0)) return bioWarn(none, 'p from 0 to 1, 1 to 10000 generations, fitnesses of 0 or more.');
                w = [n.w1, n.w2, n.w3];
                path = CalcBiology.selection(n.p, w, n.gens);
                last = path[n.gens];
                mean = function (p) { return p * p * w[0] + 2 * p * (1 - p) * w[1] + (1 - p) * (1 - p) * w[2]; };
                pts = path.map(function (p, i) { return [i, p]; });
                return { rows: drawnTile(graphDrawing('p red and q blue, generation by generation', 0, n.gens, { fs: [function (g) { return alongPoints(pts, g); },
                    function (g) { return 1 - alongPoints(pts, g); }], y: [0, 1.05], names: ['generation', 'frequency'] }), 'Over the generations')
                    .concat(physRows([['p after', last], ['q after', 1 - last], ['Δp at first', path[1] - path[0]], ['Mean fitness at first', mean(n.p)], ['Mean fitness after', mean(last)]])), cols: 2 };
            }

            function runDrift(n, raw) {
                var none = ['Fixed', 'Lost'], paths, ends;
                if (app.svAgain) bioSeed = (bioSeed * 48271 + 11) % 2147483647;
                if (!raw.N) return physNone(none);
                if (!(n.N >= 1 && n.N <= 10000 && n.N % 1 === 0 && n.p >= 0 && n.p <= 1 && n.gens >= 1 && n.gens <= 1000 && n.gens % 1 === 0 && n.pops >= 1 && n.pops <= 20 && n.pops % 1 === 0)) {
                    return bioWarn(none, 'N 1 to 10000, p from 0 to 1, 1 to 1000 generations and 1 to 20 populations, each whole.');
                }
                paths = CalcBiology.drift(n.N, n.p, n.gens, n.pops, bioSeed);
                ends = paths.map(function (p) { return p[n.gens]; });
                return { rows: drawnTile(graphDrawing('Each population\'s p, generation by generation', 0, n.gens, { paths: paths.map(function (p) { return p.map(function (x, g) { return [g, x]; }); }), y: [-0.03, 1.03],
                    names: ['generation', 'p'] }), 'Each population').concat(physRows([['Fixed', ends.filter(function (x) { return x === 1; }).length], ['Lost', ends.filter(function (x) { return x === 0; }).length],
                    ['Mean p', ends.reduce(function (s, x) { return s + x; }, 0) / ends.length], ['Heterozygosity left, %', 100 * Math.pow(1 - 1 / (2 * n.N), n.gens)]])), cols: 2,
                    note: 'The smaller N, the faster chance fixes or loses an allele.' };
            }

            function runEpistasis(n, raw) {
                var e = CalcBiology.epistasis[+raw.kind || 0], r = CalcBiology.cross('AaBb', 'AaBb'), o = bioList(raw.o), rows, drawn, fit, best = null, crit;
                r.grid = r.grid.map(function (row) { return row.map(function (c) { return [c[0], e[3][e[2][CalcBiology.classOf(c[0])]]]; }); });
                r.phenotypes = e[3].map(function (name, i) { return [name, e[1][i]]; });
                rows = [textRow('Ratio', e[1].join(' : ') + ', ' + e[3].join(' : ')), textRow('As in', e[4])];
                drawn = drawnTile(punnettDrawing(r), 'The square');
                if (!raw.o) return { rows: drawn.concat(drawnTile(labelBars('Each phenotype, of 16', r.phenotypes), 'Phenotypes'), rows, physRows(r.phenotypes.map(function (p) { return [p[0] + ', %', 100 * p[1] / 16]; }))), cols: 2 };
                if (o.bad.length) return { rows: drawn.concat(rows), cols: 2, warn: true, bad: ['o'], note: tr('{bad} is not a count.', { bad: escaped(o.bad[0]) }) };
                if (!o.values.every(function (x) { return x >= 0; }) || !o.values.some(function (x) { return x > 0; })) return { rows: drawn.concat(rows), cols: 2, warn: true, bad: ['o'], note: 'Counts of 0 or more, some above 0.' };
                CalcBiology.epistasis.forEach(function (x, i) {
                    var f = x[1].length === o.values.length ? CalcMaths.chiFit(o.values, x[1]) : null;
                    if (f && (!best || f.stat < best.f.stat)) best = { i: i, f: f };
                });
                fit = e[1].length === o.values.length ? CalcMaths.chiFit(o.values, e[1]) : null;
                if (!fit) {
                    return { rows: drawn.concat(rows), cols: 2, warn: true, bad: ['o'], note: tr('As many counts as its ratio has parts, {e}.{v}', { e: e[1].length, v: (best ? tr(' Of {values}, {epistasis}, {epistasis2}, fits best.', { values: o.values.length, epistasis: CalcBiology.epistasis[best.i][0].toLowerCase(), epistasis2: CalcBiology.epistasis[best.i][1].join(':') }) : '') }) };
                }
                crit = CalcMaths.chiInverse(0.95, fit.df);
                return {
                    rows: drawn.concat(drawnTile(labelBars('The counts seen, those expected outlined', o.values.map(function (x, i) { return [e[3][i], x, false, fit.expected[i]]; })), 'Seen and expected'), rows,
                        physRows([['χ²', fit.stat], ['df', fit.df], ['P', fit.p]]), [textRow('At α = ' + local('0.05'), fit.stat > crit ? 'Reject: they do not fit ' + e[1].join(':') : tr('They fit {e}: what differs may be chance', { e: e[1].join(':') })),
                            textRow('Fits best', CalcBiology.epistasis[best.i][0] + ', ' + CalcBiology.epistasis[best.i][1].join(':') + ', χ² ' + shortNum(best.f.stat))]),
                    cols: 2, note: fit.small ? tr('{small} of the classes expect fewer than 5: χ² may be off.', { small: fit.small }) : ''
                };
            }

            function runCounsel(n, raw) {
                var of = +raw.of || 0, who = +raw.who || 0, none = ['Carrier, %', 'Child has it, %'], post, pen, people, kids, i, q, pq, me, mate, child, rows, note;
                if (of === 1) {
                    if (!raw.prior && !raw.sons) return physNone(none);
                    if (!(n.prior >= 0 && n.prior <= 1 && n.sons >= 0 && n.sons <= 20 && n.sons % 1 === 0)) return bioWarn(none, 'A chance from 0 to 1, and 0 to 20 sons, whole.');
                    post = n.prior * Math.pow(0.5, n.sons) / (n.prior * Math.pow(0.5, n.sons) + 1 - n.prior);
                    people = [{ x: 110, g: 0, sex: 'f', carrier: n.prior >= 0.5 }, { x: 170, g: 0, sex: 'm' }, { x: 90, g: 1, sex: 'm', ill: true }, { x: 150, g: 1, sex: 'f', ask: pcText(100 * post) }, { x: 210, g: 1, sex: 'm' }];
                    kids = [];
                    for (i = 0; i <= Math.min(n.sons, 4); i++) {
                        kids.push(people.length);
                        people.push(i < Math.min(n.sons, 4) ? { x: 0, g: 2, sex: 'm', name: i === 3 && n.sons > 4 ? '+' + (n.sons - 3) : '' } : { x: 0, g: 2, sex: '', ask: '?' });
                    }
                    kids.forEach(function (k, j) { people[k].x = 180 + (j - (kids.length - 1) / 2) * 34; });
                    return { rows: drawnTile(pedigreeDrawing(people, [[0, 1], [3, 4]], [[0, [2, 3]], [1, kids]]), 'The family').concat(physRows([['Carrier, %', 100 * post], ['At first, %', 100 * n.prior],
                        ['Child has it, %', 25 * post], ['A son has it, %', 50 * post], ['A daughter carries it, %', 50 * post]])), cols: 2,
                        note: n.sons ? tr('Each son free of it makes it less likely she carries it: by Bayes, {prior} × ½^{sons} over that and the {v} she does not.', { prior: shortNum(n.prior), sons: n.sons, v: shortNum(1 - n.prior) }) :
                            'Her sons free of it, if she has any, lower the chance she carries it.' };
                }
                if (of === 2) {
                    if (!raw.pen) return physNone(none);
                    pen = n.pen / 100;
                    if (!(pen >= 0 && pen <= 1)) return bioWarn(none, 'A penetrance from 0 to 100%.');
                    post = 0.5 * (1 - pen) / (0.5 * (1 - pen) + 0.5);
                    people = [{ x: 120, g: 0, sex: 'm', ill: true }, { x: 180, g: 0, sex: 'f' }, { x: 150, g: 1, sex: 'f', ask: pcText(100 * post) }, { x: 210, g: 1, sex: 'm' }, { x: 180, g: 2, sex: '', ask: '?' }];
                    return { rows: drawnTile(pedigreeDrawing(people, [[0, 1], [2, 3]], [[0, [2]], [1, [4]]]), 'The family').concat(physRows([['Carrier, %', 100 * post], ['Child has it, %', 50 * post * pen],
                        ['Child has the gene, %', 50 * post]])), cols: 2,
                        note: pen === 1 ? 'Fully penetrant: free of it, she does not carry it.' : 'Some who carry it never show it, so free of it she may still carry it, and hand it on.' };
                }
                if (raw.q2 && !(n.q2 > 0 && n.q2 < 1)) return bioWarn(none, 'How common it is, a part of 1: 1/2500.', ['q2']);
                q = raw.q2 ? Math.sqrt(n.q2) : NaN;
                pq = 2 * q * (1 - q);
                if (!raw.q2) return who === 2 ? Object.assign(physNone(none), { note: 'How common it is, as 1/2500.' }) : physNone(none);
                me = who === 0 ? 2 / 3 : who === 1 ? 1 : pq;
                mate = who === 1 ? 1 : pq;
                child = me * mate / 4;
                if (who === 0) {
                    people = [{ x: 110, g: 0, sex: 'm', carrier: true }, { x: 170, g: 0, sex: 'f', carrier: true }, { x: 100, g: 1, sex: 'm', ill: true }, { x: 150, g: 1, sex: 'f', ask: '2/3' },
                        { x: 210, g: 1, sex: 'm', ask: raw.q2 ? pcText(100 * pq) : '' }, { x: 180, g: 2, sex: '', ask: '?' }];
                    kids = [[0, [2, 3]], [1, [5]]];
                    note = 'Free of it, a sibling of one with it is a carrier 2 times in 3: of AA, Aa and aA, the three left of the four.';
                } else if (who === 1) {
                    people = [{ x: 120, g: 0, sex: 'f', carrier: true }, { x: 180, g: 0, sex: 'm', carrier: true }, { x: 120, g: 1, sex: 'm', ill: true }, { x: 180, g: 1, sex: '', ask: '?' }];
                    kids = [[0, [2, 3]]];
                    note = 'Both parents of a child with it carry it: each child has it 1 time in 4.';
                } else {
                    people = [{ x: 120, g: 0, sex: 'f', ask: pcText(100 * pq) }, { x: 180, g: 0, sex: 'm', ask: pcText(100 * pq) }, { x: 150, g: 1, sex: '', ask: '?' }];
                    kids = [[0, [2]]];
                    note = 'Of no family with it, each a carrier as often as 2pq, by Hardy and Weinberg.';
                }
                rows = [['Carrier, %', 100 * me]].concat(isFinite(mate) ? [['Partner a carrier, %', 100 * mate], ['Child has it, %', 100 * child], ['Child carries it, %', 50 * (me + mate - me * mate)]] : []);
                return { rows: drawnTile(pedigreeDrawing(people, kids.length > 1 ? [[0, 1], [3, 4]] : [[0, 1]], kids), 'The family').concat(physRows(rows)), cols: 2,
                    note: note + (isFinite(mate) ? '' : ' With how common it is, the partner\'s chance and the child\'s.') };
            }

            // the red cells a blood group can take: of its ABO, its own and O's, AB anyone's; Rh⁺ either, Rh⁻ only Rh⁻
            function donors(group) {
                var out = [];
                ({ O: ['O'], A: ['A', 'O'], B: ['B', 'O'], AB: ['AB', 'A', 'B', 'O'] })[group.slice(0, -1)].forEach(function (x) {
                    (group.slice(-1) === '+' ? ['+', '−'] : ['−']).forEach(function (s) { out.push(x + s); });
                });
                return out.join(' ');
            }

            function runBlood(n, raw) {
                var a = ABO[+raw.a || 0], b = ABO[+raw.b || 0], r = CalcBiology.bloodCross(a, b, RH[+raw.ra || 0], RH[+raw.rb || 0]), group = function (x) {
                    return /A/.test(x) && /B/.test(x) ? 'AB' : /A/.test(x) ? 'A' : /B/.test(x) ? 'B' : 'O';
                }, sq = { gametes: [a.split('').map(function (x) { return [x, 1]; }), b.split('').map(function (x) { return [x, 1]; })], phenotypes: r.abo };
                sq.grid = sq.gametes[0].map(function (x) { return sq.gametes[1].map(function (y) { var g = [x[0], y[0]].sort().join(''); return [g, group(g)]; }); });
                return { rows: drawnTile(punnettDrawing(sq), 'ABO').concat(drawnTile(labelBars('Each group, % of the children', r.both.map(function (g) { return [g[0], 100 * g[1]]; }), pcText), 'Groups'),
                    physRows(r.both.map(function (g) { return [g[0] + ', %', 100 * g[1]]; })), [textRow('Red cells each can take', r.both.map(function (g) { return g[0] + ': ' + donors(g[0]); }).join('; '))]),
                    cols: 2, note: 'A and B codominant, both shown in AB, and O recessive to them; Rh⁺, of D, dominant.' };
            }

            // an alignment in blocks of 30, each of three lines: the first sequence, how alike, the second, each line's first place before it
            function alignText(al) {
                var out = [], i = al.from[0], j = al.from[1], k, a, b, pad = function (x) { return ('     ' + x).slice(-5); };
                for (k = 0; k < al.length; k += 30) {
                    a = al.a.substr(k, 30);
                    b = al.b.substr(k, 30);
                    out.push(pad(i) + ' ' + a, '      ' + al.mid.substr(k, 30), pad(j) + ' ' + b, '');
                    i += a.replace(/-/g, '').length;
                    j += b.replace(/-/g, '').length;
                }
                return out.join('\n').replace(/\n+$/, '');
            }

            function runAlign(n, raw) {
                var prot = raw.kind === '1', none = ['Identity, %', 'Score'], ra, rb, A, B, al, k, text;
                if (!raw.a && !raw.b) return physNone(none);
                if (!raw.a || !raw.b) return Object.assign(physNone(none), { note: 'Both sequences.' });
                ra = prot ? CalcBiology.readProtein(raw.a) : CalcBiology.readSeq(raw.a);
                rb = prot ? CalcBiology.readProtein(raw.b) : CalcBiology.readSeq(raw.b);
                if (ra.bad.length || rb.bad.length) {
                    return bioWarn(none, (prot ? tr('Not an amino acid: {v}{v2}', { v: escaped((ra.bad.length ? ra.bad : rb.bad).slice(0, 5).join(', ')), v2: (prot ? tr('. One letter each; or of DNA, choose DNA.') : tr('. Of a protein, choose Protein.')) }) : tr('Not a base: {v}{v2}', { v: escaped((ra.bad.length ? ra.bad : rb.bad).slice(0, 5).join(', ')), v2: (prot ? tr('. One letter each; or of DNA, choose DNA.') : tr('. Of a protein, choose Protein.')) })),
                        [ra.bad.length ? 'a' : 'b']);
                }
                A = prot ? ra.seq : CalcBiology.dna(ra.seq);
                B = prot ? rb.seq : CalcBiology.dna(rb.seq);
                if (!A || !B) return physNone(none);
                if (A.length * B.length > 4e6) return bioWarn(none, 'Too long to align here: some 2000 each at most.');
                if (!(n.open >= 0 && n.ext >= 0)) return bioWarn(none, 'Gap costs of 0 or more.');
                al = CalcBiology.align(A, B, { protein: prot, local: raw.how === '1', open: n.open, extend: n.ext });
                k = prot ? 3 : Math.min(A.length, B.length) < 150 ? 6 : 10;
                if (!al) return { rows: drawnTile(dotPlotDrawing(A, B, null, k), 'Dot plot').concat(physNone(none).rows), cols: 3, note: 'Nothing alike enough to align.' };
                text = alignText(al);
                return {
                    rows: drawnTile(dotPlotDrawing(A, B, al, k), 'Dot plot').concat(physRows([['Identity, %', 100 * al.same / al.length]].concat(prot ? [['Similarity, %', 100 * al.alike / al.length]] : [],
                        [['Gaps, %', 100 * al.gaps / al.length], ['Score', al.score], ['Length', al.length]], raw.how === '1' ? [['1, from', al.from[0]], ['1, to', al.to[0]], ['2, from', al.from[1]], ['2, to', al.to[1]]] : [])),
                        [{ l: 'The alignment', wide: true, text: '<span class="calc-bio-seq calc-bio-aln">' + escaped(text) + '</span>', copy: text }]),
                    cols: 3, note: (prot ? tr('Identity of all its length, gaps too, as EMBOSS counts it: | the same, : alike, . not; a dot plot\'s word {k} letters.', { k: k }) : tr('Identity of all its length, gaps too, as EMBOSS counts it: | the same, . not; a dot plot\'s word {k} letters.', { k: k }))
                };
            }

            function runCrispr(n, raw) {
                var none = ['Guides'], r = CalcBiology.readSeq(raw.s), s = CalcBiology.dna(r.seq), nuc = CalcBiology.nucleases[+raw.nuc || 0], near = NaN, list;
                if (!s) return physNone(none);
                if (r.bad.length) return bioWarn(none, tr('Not a base: {bad}. A, C, G, T or U, and the codes of IUPAC, as N.', { bad: escaped(r.bad.slice(0, 5).join(', ')) }), ['s']);
                if (raw.near) {
                    if (!(n.near >= 1 && n.near <= s.length && n.near % 1 === 0)) return bioWarn(none, 'A base from 1 to ' + s.length + '.', ['near']);
                    near = n.near;
                }
                list = CalcBiology.guides(s, +raw.nuc || 0);
                if (!list.length) return Object.assign(physNone(none), { note: tr('No PAM, {nuc}, on either strand with room for a guide.', { nuc: nuc[1] }) });
                if (isFinite(near)) list.sort(function (a, b) { return Math.abs(a.cut - near) - Math.abs(b.cut - near) || a.flags.length - b.flags.length; });
                return {
                    rows: drawnTile(strandDrawing('Its guides along it, the first 5 red, each cut marked', s.length, list, 5, isFinite(near) ? near : 0), 'Its guides')
                        .concat(physRows([['Guides', list.length], ['On the + strand', list.filter(function (g) { return g.strand > 0; }).length], ['On the − strand', list.filter(function (g) { return g.strand < 0; }).length],
                            ['With no flag', list.filter(function (g) { return !g.flags.length; }).length]]), list.slice(0, 5).map(function (g, i) {
                            return { l: tr('{i}, strand {v}, cut after {cut}, GC {v2}{v3}', { i: (i + 1), v: (g.strand > 0 ? '+' : '−'), cut: g.cut, v2: pcText(100 * g.gc), v3: (g.flags.length ? '; ' + g.flags.map(function (f) { return GUIDE_FLAGS[f]; }).join(', ') : '') }),
                                wide: true, wrap: true, text: '<span class="calc-bio-seq">' + (nuc[3] ? g.guide + ' <b>' + g.pam + '</b>' : '<b>' + g.pam + '</b> ' + g.guide) + '</span>', copy: g.guide };
                        }), [{ l: 'Each guide', head: ['#', 'From', 'Strand', 'Cut after', 'GC, %', 'Flags'], m: list.slice(0, 60).map(function (g, i) { return [i + 1, g.from, g.strand, g.cut, 100 * g.gc, g.flags.length]; }) }]),
                    cols: 2, note: (nuc[3] ? tr('Each guide 5′ to 3′, its PAM in bold after it. Its seed is sought in this sequence alone: check the whole genome, as by BLAST, before ordering it.') : tr('Each guide 5′ to 3′, its PAM in bold before it. Its seed is sought in this sequence alone: check the whole genome, as by BLAST, before ordering it.'))
                };
            }

            function runMotif(n, raw) {
                var none = ['Found'], r = CalcBiology.readSeq(raw.s), s = CalcBiology.dna(r.seq), m = String(raw.m || '').replace(/\s+/g, '').toUpperCase().replace(/U/g, 'T'), hits, chance,
                    MEANING = { R: 'purine', Y: 'pyrimidine', S: 'strong', W: 'weak', K: 'keto', M: 'amino', B: 'not A', D: 'not C', H: 'not G', V: 'not T', N: 'any' };
                if (!m) {
                    return { rows: [], pick: { t: 'Codes', cols: 3, rows: Object.keys(CalcBiology.iupac).filter(function (c) { return MEANING[c]; }).map(function (c) { return { l: c + ', ' + MEANING[c], text: CalcBiology.iupac[c].split('').join(' '), small: true }; }) },
                        note: s ? 'Type a motif, of A, C, G, T and these codes.' : 'IUPAC\'s codes, each of more than one base.' };
                }
                if (/[^ACGTRYSWKMBDHVN]/.test(m)) return bioWarn(none, 'A motif of A, C, G, T and IUPAC\'s codes, as R or N.', ['m']);
                if (!s) return Object.assign(physNone(none), { note: 'The sequence to search.' });
                if (r.bad.length) return bioWarn(none, tr('Not a base: {bad}.', { bad: escaped(r.bad.slice(0, 5).join(', ')) }), ['s']);
                hits = CalcBiology.motif(s, m);
                chance = m.split('').reduce(function (p, c) { return p * CalcBiology.iupac[c].length / 4; }, 1) * Math.max(0, s.length - m.length + 1) * (CalcBiology.reverseComplement(m) === m ? 1 : 2);
                return {
                    rows: drawnTile(strandDrawing('Where it is, on either strand', s.length, hits.map(function (h) { return { from: h.at, to: h.at + m.length - 1, strand: h.strand }; }), 0, 0), 'Along it')
                        .concat(physRows([['Found', hits.length], ['On the + strand', hits.filter(function (h) { return h.strand > 0; }).length], ['On the − strand', hits.filter(function (h) { return h.strand < 0; }).length],
                            ['By chance, about', chance]]), hits.length ? [textRow('At, its first base', hits.slice(0, 80).map(function (h) { return h.at + (h.strand > 0 ? '+' : '−'); }).join(', ') + (hits.length > 80 ? '…' : ''))] : []),
                    cols: 2, note: tr('{v}On the − strand, at the base its reverse complement starts on the + strand.', { v: (CalcBiology.reverseComplement(m) === m ? tr('It reads the same on both strands: each place once. ') : '') })
                };
            }

            // a primer among the results, its first so many bases in small letters, as a tail or a change is written
            function primerRow(l, seq, from, k) {
                return { l: l, wide: true, wrap: true, text: '<span class="calc-bio-seq">' + seq.slice(0, from) + seq.substr(from, k).toLowerCase() + seq.slice(from + k) + '</span>', copy: seq };
            }

            function runMutagenesis(n, raw) {
                var none = ['T<sub>m</sub>, °C', 'Length'], r, s, m, old, pos, nw, mu, c, end, before, after, changes = [], A, B, g, ovA, i;
                if (raw.by === '1') {
                    if (!raw.a && !raw.b) return physNone(none);
                    A = CalcBiology.readSeq(raw.a);
                    B = CalcBiology.readSeq(raw.b);
                    if (A.bad.length || B.bad.length) return bioWarn(none, tr('Not a base: {v}.', { v: escaped((A.bad.length ? A.bad : B.bad).slice(0, 5).join(', ')) }), [A.bad.length ? 'a' : 'b']);
                    if (!A.seq || !B.seq) return Object.assign(physNone(none), { note: 'Both fragments\' ends.' });
                    if (!(n.ov >= 10 && n.ov <= 80 && n.ov % 1 === 0 && n.tm >= 40 && n.tm <= 80)) return bioWarn(none, 'An overlap of 10 to 80 bases, and a T_m from 40 to 80 °C.');
                    g = CalcBiology.gibson(A.seq, B.seq, n.ov, n.tm);
                    if (!g) return bioWarn(none, 'Each fragment\'s end of 18 bases or more, and half the overlap.');
                    ovA = g.forward.length - g.prime[0].length;
                    return { rows: drawnTile(gibsonDrawing(g), 'The join').concat([primerRow('Forward, of fragment 2', g.forward, 0, ovA), primerRow('Reverse, of fragment 1', g.reverse, 0, g.overlap.length - ovA)],
                        physRows([['Forward, bases', g.forward.length], ['Forward T<sub>m</sub>, °C', g.tms[0]], ['Reverse, bases', g.reverse.length], ['Reverse T<sub>m</sub>, °C', g.tms[1]], ['Overlap T<sub>m</sub>, °C', g.tms[2]]]),
                        [seqRow('Overlap', g.overlap)]), cols: 2,
                        note: (g.tms[2] < 48 ? tr('Each 5′ to 3′, its tail in small letters, which makes the overlap; the overlap\'s T_m is below 48 °C: make it longer.{v}', { v: (g.tms[0] < n.tm || g.tms[1] < n.tm ? tr(' A T_m not reached within 40 bases.') : '') }) : tr('Each 5′ to 3′, its tail in small letters, which makes the overlap; an overlap\'s T_m of 48 °C or more is good.{v}', { v: (g.tms[0] < n.tm || g.tms[1] < n.tm ? tr(' A T_m not reached within 40 bases.') : '') })) };
                }
                r = CalcBiology.readSeq(raw.s);
                s = CalcBiology.dna(r.seq);
                if (!s && !raw.mut) return physNone(none);
                if (r.bad.length) return bioWarn(none, tr('Not a base: {bad}.', { bad: escaped(r.bad.slice(0, 5).join(', ')) }), ['s']);
                if (!s) return Object.assign(physNone(none), { note: 'The sequence to change.' });
                if (!raw.mut) return Object.assign(physNone(none), { note: 'The change, as T196A: the base, its place and the new.' });
                m = /^\s*([ACGTU]*)\s*(\d+)\s*(?:>|→|to)?\s*([ACGTU]+)\s*$/i.exec(raw.mut);
                if (!m) return bioWarn(none, 'A change as T196A: the base, its place and the new; or 196 ACC.', ['mut']);
                old = m[1].toUpperCase().replace(/U/g, 'T');
                pos = +m[2];
                nw = m[3].toUpperCase().replace(/U/g, 'T');
                if (old && old.length !== nw.length) return bioWarn(none, tr('As many new bases as old: {old}.', { old: old.length }), ['mut']);
                if (pos < 1 || pos + nw.length - 1 > s.length) return bioWarn(none, tr('Its place within the sequence, 1 to {s}.', { s: s.length }), ['mut']);
                if (old && s.substr(pos - 1, old.length) !== old) return bioWarn(none, tr('At {pos} it is {pos2}, not {old}.', { pos: pos, pos2: s.substr(pos - 1, old.length), old: old }), ['mut']);
                if (s.substr(pos - 1, nw.length) === nw) return bioWarn(none, tr('It is {nw} already.', { nw: nw }), ['mut']);
                mu = CalcBiology.mutagenesis(s, pos, nw);
                c = Math.floor((pos - 1) / 3);
                end = Math.ceil((pos - 1 + nw.length) / 3) * 3;
                if (end <= s.length) {
                    before = CalcBiology.translate(s.slice(c * 3, end), 0);
                    after = CalcBiology.translate(s.slice(c * 3, pos - 1) + nw + s.slice(pos - 1 + nw.length, end), 0);
                    for (i = 0; i < before.length; i++) if (before.charAt(i) !== after.charAt(i)) changes.push(threeLetters(before.charAt(i)) + (c + i + 1) + threeLetters(after.charAt(i)));
                }
                return {
                    rows: drawnTile(mutationDrawing(mu, pos, nw.length), 'The primers').concat([primerRow('Forward, 5′ → 3′', mu.forward, pos - mu.from, nw.length),
                        primerRow('Reverse, 5′ → 3′', mu.reverse, mu.forward.length - (pos - mu.from) - nw.length, nw.length)],
                        physRows([['T<sub>m</sub>, °C', mu.tm], ['Length', mu.forward.length], ['GC, %', 100 * mu.gc], ['Mismatched', mu.mismatched]]),
                        end <= s.length ? [textRow('If it codes from base 1', changes.length ? changes.join(', ') : 'Silent: the same amino acid')] : []),
                    cols: 2, note: tr('{v}The bases changed in small letters; the two primers are each other\'s reverse complement.', { v: (mu.sure ? '' : tr('Its T_m is {tm} °C at 45 bases, short of 78: try a polymerase that works with less. ', { tm: shortNum(mu.tm) })) })
                };
            }

            function runGenome(n, raw) {
                var list = CalcBiology.genomes, gi = +raw.g || 0, other = gi === list.length, G = other ? ['Other', n.L, NaN, NaN] : list[gi], L = G[1], none = ['One copy, pg'], one;
                if (other && !raw.L) return physNone(none);
                if (!(L >= 1) || (raw.ng && !(n.ng >= 0)) || (raw.n && !(n.n >= 0))) return bioWarn(none, 'A length of 1 or more, and amounts of 0 or more.');
                one = CalcBiology.lengthMass(G[4] === 2 ? 2 : 0, L) / CalcChem.avogadro;
                return {
                    rows: drawnTile(logBars('Genome sizes, bp, on a scale of logarithms', list.map(function (q, i) { return [q[0], q[1], i === gi]; }).concat(other ? [['Other', L, true]] : []), function (e) {
                        return ['1', '10', '100', '1 k', '10 k', '100 k', '1 M', '10 M', '100 M', '1 G', '10 G', '100 G'][e] || '1e' + e;
                    }), 'Sizes').concat(physRows([[G[4] === 2 ? 'Length, nt' : 'Length, bp', L]].concat(isFinite(G[2]) ? [['Genes', G[2]], ['Chromosomes, n', G[3]], ['Genes a Mb', G[2] / L * 1e6]] : [],
                        [['One copy, pg', one * 1e12], ['Copies in 1 ng', 1e-9 / one]], raw.ng ? [['Copies in the ng', n.ng * 1e-9 / one]] : [], raw.n ? [['ng for the copies', n.n * one * 1e9]] : []))),
                    cols: 2, note: G[4] === 2 ? 'Of RNA, single-stranded.' : other ? 'Of double-stranded DNA.' : 'Its haploid genome; a diploid cell has two copies.'
                };
            }

            function runDose(n, raw) {
                var none = ['IC<sub>50</sub>'], pts = bioPairs(raw.pts), held = raw.ends === '1', fit, used, name, p, x10, x90, lo, hi, notes = [];
                if (!raw.pts) return physNone(none);
                if (!pts) return bioWarn(none, 'A concentration and its response on each line: 10 41.', ['pts']);
                fit = CalcBiology.doseFit(pts, held ? [0, 100] : null);
                if (!fit) return bioWarn(none, tr('{v} points or more, at 2 or more concentrations above 0.', { v: (held ? 3 : 5) }));
                used = pts.filter(function (q) { return q[0] > 0; });
                name = fit.hill < 0 ? 'IC' : 'EC';
                p = [fit.bottom, fit.top, fit.logc, fit.hill];
                x10 = fit.logc - Math.log10(9) / Math.abs(fit.hill);
                x90 = fit.logc + Math.log10(9) / Math.abs(fit.hill);
                lo = Math.min.apply(null, used.map(function (q) { return Math.log10(q[0]); }));
                hi = Math.max.apply(null, used.map(function (q) { return Math.log10(q[0]); }));
                if (used.length < pts.length) notes.push('A concentration of 0 left out: it has no logarithm.');
                if (fit.logc < lo || fit.logc > hi) notes.push(tr('The {name}₅₀ is beyond the concentrations tested: test wider.', { name: name }));
                if (fit.r2 < 0.9) notes.push('R² below 0.9: a poor fit.');
                return {
                    rows: drawnTile(graphDrawing(tr('The response against log₁₀ of the concentration, the {name}₅₀ marked', { name: name }), Math.min(lo, fit.logc) - 0.6, Math.max(hi, fit.logc) + 0.6, {
                        fs: [function (x) { return CalcBiology.logistic4(p, Math.pow(10, x)); }], pts: used.map(function (q) { return [Math.log10(q[0]), q[1]]; }), marks: [[fit.logc, name + '₅₀']],
                        dots: [[fit.logc, (fit.top + fit.bottom) / 2]], names: ['log₁₀ x', 'response'] }), 'The curve').concat(physRows([[name + '<sub>50</sub>', fit.ec50], [tr('log {name}<sub>50</sub>', { name: name }), fit.logc],
                        ['Hill slope', fit.hill], ['Top', fit.top], ['Bottom', fit.bottom], ['R²', fit.r2], [name + '<sub>10</sub>', Math.pow(10, x10)], [name + '<sub>90</sub>', Math.pow(10, x90)], ['Points', fit.n]])),
                    cols: 2, note: notes.join(' ') || (name === 'IC' ? 'A response that falls: its IC₅₀, where half the effect is. The Hill slope below 0 as it falls.' : 'A response that rises: its EC₅₀, where half the effect is.')
                };
            }

            function runPurify(n, raw) {
                var none = ['Fold', 'Yield, %'], steps = [], bad = '', first, last;
                String(raw.steps || '').split(/[\r\n]+/).forEach(function (line) {
                    var t = line.trim().split(/\s+/), a, b;
                    if (!line.trim()) return;
                    a = t.length >= 2 ? bioList(t[t.length - 2]) : { bad: [1], values: [] };
                    b = t.length >= 2 ? bioList(t[t.length - 1]) : { bad: [1], values: [] };
                    if (a.bad.length || b.bad.length || a.values.length !== 1 || b.values.length !== 1) {
                        bad = bad || line.trim();
                        return;
                    }
                    steps.push({ name: t.slice(0, -2).join(' ') || tr('Step {steps}', { steps: (steps.length + 1) }), mg: a.values[0], u: b.values[0] });
                });
                if (!steps.length && !bad) return physNone(none);
                if (bad) return bioWarn(none, 'A step to a line, its protein in mg and its activity in units: Ion exchange 80 2800. Not ' + escaped(bad.slice(0, 30)) + '.', ['steps']);
                if (steps.length > 12) return bioWarn(none, 'Up to 12 steps.', ['steps']);
                if (!steps.every(function (s) { return s.mg > 0 && s.u >= 0; }) || !(steps[0].u > 0)) return bioWarn(none, 'Protein above 0, and activity of 0 or more, the first above 0.', ['steps']);
                first = steps[0];
                steps.forEach(function (s) {
                    s.sa = s.u / s.mg;
                    s.yield = 100 * s.u / first.u;
                    s.fold = s.sa / (first.u / first.mg);
                });
                last = steps[steps.length - 1];
                return {
                    rows: drawnTile(labelBars('Yield at each step, %', steps.map(function (s, i) { return [String(i + 1), s.yield, i === steps.length - 1]; }), pcText), 'Yield')
                        .concat(drawnTile(labelBars('Fold purification at each step', steps.map(function (s, i) { return [String(i + 1), s.fold, i === steps.length - 1]; }), function (v) { return shortNum(v) + '×'; }), 'Fold'),
                            physRows([['Fold', last.fold], ['Yield, %', last.yield], ['U/mg at the end', last.sa], ['U/mg at first', first.sa]]), [textRow('Steps', steps.map(function (s, i) { return (i + 1) + ' ' + escaped(s.name); }).join('; ')),
                                { l: 'Each step', head: ['Step', 'mg', 'U', 'U/mg', 'Yield, %', 'Fold'], m: steps.map(function (s, i) { return [i + 1, s.mg, s.u, s.sa, s.yield, s.fold]; }) }]),
                    cols: 2, note: 'Each step should raise the U/mg, its purity; the yield falls as some is lost at each.'
                };
            }

            function runGelSize(n, raw) {
                var protein = raw.kind === '1', unit = protein ? 'kDa' : 'bp', none = [tr('Band 1, {unit}', { unit: unit })], pts = bioPairs(raw.pts), xy, line, u, found, r2, ds, notes = [];
                if (!raw.pts) return physNone(none);
                if (!pts) return bioWarn(none, 'A size and how far it ran on each line: 1000 35.', ['pts']);
                if (pts.length < 2) return Object.assign(physNone(none), { note: 'Two bands of the ladder or more.' });
                if (!pts.every(function (p) { return p[0] > 0 && p[1] >= 0; })) return bioWarn(none, 'Sizes above 0, and distances of 0 or more.', ['pts']);
                xy = pts.map(function (p) { return { x: p[1], y: Math.log10(p[0]) }; });
                line = bioFit(xy);
                if (!line || !(line.m < 0)) return bioWarn(none, 'The larger a band, the less far it runs: check the ladder.', ['pts']);
                u = bioList(raw.u);
                if (u.bad.length) return bioWarn(none, tr('{bad} is not a distance.', { bad: escaped(u.bad[0]) }), ['u']);
                found = u.values.slice(0, 12).map(function (d) { return [d, Math.pow(10, line.m * d + line.b)]; });
                r2 = rSquared(xy, line);
                ds = pts.map(function (p) { return p[1]; });
                if (found.some(function (f) { return f[0] < Math.min.apply(null, ds) || f[0] > Math.max.apply(null, ds); })) notes.push('A band beyond the ladder: its size is a guess.');
                if (r2 < 0.98) notes.push('R² below 0.98: a gel is straightest in its middle; fit the ladder\'s bands near the unknowns.');
                ds = ds.concat(found.map(function (f) { return f[0]; }));
                return {
                    rows: drawnTile(measuredGel(pts, found, protein, unit), 'The gel').concat(drawnTile(graphDrawing('log₁₀ of the size against the distance, the unknowns red', Math.min.apply(null, ds) - 2, Math.max.apply(null, ds) + 2, {
                        fs: [function (x) { return line.m * x + line.b; }], pts: xy.map(function (p) { return [p.x, p.y]; }), dots: found.map(function (f) { return [f[0], Math.log10(f[1])]; }), names: ['distance', tr('log₁₀ {unit}', { unit: unit })] }), 'The line'),
                        physRows(found.map(function (f, i) { return ['Band ' + (i + 1) + ', ' + unit, f[1]]; }).concat([['Slope', line.m], ['R²', r2]]))),
                    cols: 2, note: notes.join(' ') || (raw.u ? '' : 'With the unknowns\' distances, their sizes.')
                };
            }

            function runTransform(n, raw) {
                var none = ['Transformants/µg'], ug, eff;
                if (!raw.n && !raw.ng) return physNone(none);
                if (!(n.n >= 0 && n.ng > 0 && n.v > 0 && n.p > 0 && n.p <= n.v && n.dil >= 1)) return bioWarn(none, 'Colonies of 0 or more, DNA above 0, the volume plated no more than all of it, and a dilution of 1 or more.');
                ug = n.ng / 1000 * n.p / n.v / n.dil;
                eff = n.n / ug;
                return { rows: drawnTile(petriDrawing(n.n), 'The plate').concat(drawnTile(gaugeDrawing('Its log₁₀, among competent cells, good ones darker', eff > 0 ? Math.log10(eff) : 3, 3, 11, [6, 9],
                    [[3, '10³'], [5, '10⁵'], [7, '10⁷'], [9, '10⁹'], [11, '10¹¹']]), 'Among cells'), physRows([['Transformants/µg', eff], ['log₁₀', eff > 0 ? Math.log10(eff) : NaN], ['DNA plated, ng', ug * 1000],
                    ['Transformants in all', n.n * n.v / n.p * n.dil]])), cols: 2,
                    note: eff < 1e6 ? 'Below 10⁶: enough to clone a plasmid, too few for a library.' : eff >= 1e9 ? '10⁹ or more, as electrocompetent cells give.' : 'Good chemically competent cells give some 10⁶ to 10⁸.' };
            }

            function runSeeding(n, raw) {
                var plate = PLATES[+raw.plate || 0], none = ['Suspension in each, µL'], wells, each, vol, med, all;
                if (!raw.d && !raw.c) return physNone(none);
                if (!(n.d > 0 && n.c > 0 && n.x >= 0) || (raw.w && !(n.w >= 1 && n.w % 1 === 0))) return bioWarn(none, 'Cells above 0, whole wells, and extra of 0 or more.');
                wells = raw.w ? n.w : plate[1];
                each = n.d * plate[2];
                vol = each / n.c;
                med = plate[3] - vol;
                all = wells * (1 + n.x / 100);
                if (vol > plate[3]) return bioWarn(none, 'More suspension than each holds, ' + shortNum(plate[3]) + ' mL: concentrate the cells.');
                return { rows: drawnTile(plateDrawing(plate, wells), 'The plate').concat(physRows([['Cells in each', each], ['Suspension in each, µL', vol * 1000], ['Medium in each, µL', med * 1000], ['Each holds, mL', plate[3]],
                    ['Each one\'s area, cm²', plate[2]], ['Cells in all', each * all], ['Suspension in all, mL', vol * all], ['Medium in all, mL', med * all]])), cols: 2,
                    note: tr('Mix the suspension and the medium for all, {x}% more, and put {plate} mL in each.{v}', { x: shortNum(n.x), plate: shortNum(plate[3]), v: (wells > plate[1] ? tr(' Of {wells} plates.', { wells: Math.ceil(wells / plate[1]) }) : '') }) };
            }

            function runMoi(n, raw) {
                var none = ['Virus each, µL'], v, p0, p1, pois;
                if (!raw.cells && !raw.moi && !raw.t) return physNone(none);
                if (!(n.cells > 0 && n.moi >= 0 && n.moi <= 100 && n.t > 0 && n.w >= 1 && n.w % 1 === 0)) return bioWarn(none, 'Cells and the titre above 0, an MOI from 0 to 100, and whole wells.');
                v = n.cells * n.moi / n.t;
                p0 = Math.exp(-n.moi);
                p1 = n.moi * p0;
                pois = function (k) { return n.moi ? Math.exp(k * Math.log(n.moi) - n.moi - CalcBiology.lnGamma(k + 1)) : k ? 0 : 1; };
                return { rows: drawnTile(countDrawing('The cells by how many virions each gets, by Poisson', 0, Math.min(150, Math.max(6, Math.ceil(n.moi + 4 * Math.sqrt(n.moi) + 1))), pois, Math.round(n.moi)), 'Each cell')
                    .concat(drawnTile(graphDrawing('Infected, %, against the MOI', 0, Math.max(5, 2 * n.moi), { fs: [function (m) { return 100 * (1 - Math.exp(-m)); }], dots: [[n.moi, 100 * (1 - p0)]], y: [0, 105], names: ['MOI', '%'] }), 'Infected'),
                        physRows([['Virus each, µL', v * 1000], ['Virus in all, µL', v * 1000 * n.w], ['Virions each', n.cells * n.moi], ['Infected, %', 100 * (1 - p0)], ['Free of it, %', 100 * p0], ['By one, %', 100 * p1],
                            ['By two or more, %', 100 * (1 - p0 - p1)]])), cols: 2, note: 'An MOI of 1 infects some 63%; for nearly every cell, 3 to 5. The titre as PFU, or TU, a mL.' };
            }

            function runIsotope(n, raw) {
                var list = CalcBiology.isotopes, i = +raw.iso || 0, iso = list[i], hours = raw.unit === '1', none = ['Activity now'], half, left, A, rows, x1;
                if (!raw.A && !raw.t) return physNone(none);
                half = iso ? (hours ? iso[1] * 24 : iso[1]) : n.half;
                if (!(half > 0 && n.A >= 0 && n.t >= 0) || (raw.want && !(n.want >= 0)) || (raw.v && !(n.v > 0))) return bioWarn(none, 'A half-life above 0, and an activity and a time of 0 or more.');
                left = Math.pow(0.5, n.t / half);
                A = n.A * left;
                rows = [['Activity now', A], ['Left, %', 100 * left], ['Half-lives gone', n.t / half], [(hours ? tr('Half-life, h') : tr('Half-life, days')), half], ['λ, a ' + (hours ? 'hour' : 'day'), Math.LN2 / half]];
                if (raw.v) rows.push(['Now, a µL', A / n.v]);
                if (raw.want) rows.push(raw.v ? ['Take, µL', A ? n.want * n.v / A : NaN] : ['Take, of it', A ? n.want / A : NaN]);
                x1 = Math.min(Math.max(n.t * 1.4, 2 * half), Math.max(n.t * 1.2, 5 * half));
                return { rows: drawnTile(graphDrawing('Its activity, each half-life marked', 0, x1, { fs: [function (t) { return n.A * Math.pow(0.5, t / half); }], dots: [[n.t, A]],
                    marks: [1, 2, 3, 4].filter(function (k) { return k * half <= x1; }).map(function (k) { return [k * half, k + ' t½']; }), y: [0, n.A * 1.2 || 1], names: [hours ? 'h' : 'days', 'activity'] }), 'Its decay')
                    .concat(physRows(rows), iso ? [textRow('Gives off', iso[2]), textRow('Shield', iso[3])] : []), cols: 2,
                    note: tr('Each activity in one unit, as µCi or MBq.{v}', { v: (raw.want && A < n.want ? tr(' Less is left than you want.') : '') }) };
            }

            function runBioBuffer(n, raw) {
                var B = CalcBiology.buffers[+raw.buf || 0], none = ['Base : acid'], pKa, ratio, fb, mol, rows, notes = [];
                if (!raw.pH && !raw.c && !raw.v) return physNone(none);
                if (!(n.pH >= 0 && n.pH <= 14 && n.T > -10 && n.T < 100) || (raw.c && !(n.c > 0)) || (raw.v && !(n.v > 0))) return bioWarn(none, 'A pH from 0 to 14, a temperature, and a concentration and a volume above 0.');
                pKa = B[1] + B[2] * (n.T - 25);
                ratio = Math.pow(10, n.pH - pKa);
                fb = ratio / (1 + ratio);
                rows = [['pKa at T', pKa], ['Base : acid', ratio], ['As the base, %', 100 * fb], ['As the acid, %', 100 * (1 - fb)]];
                if (raw.c && raw.v) {
                    mol = n.c / 1000 * n.v / 1000;
                    if (B[3] === 2) rows.push([B[6] + ', g', (1 - fb) * mol * B[4]], [B[7] + ', g', fb * mol * B[5]]);
                    else rows.push([B[3] ? 'Weigh its base, g' : 'Weigh its acid, g', mol * B[4]], [B[3] ? 'HCl, mmol' : 'NaOH, mmol', 1000 * mol * (B[3] ? 1 - fb : fb)], [B[3] ? 'Of 1 M HCl, mL' : 'Of 1 M NaOH, mL', 1000 * mol * (B[3] ? 1 - fb : fb)]);
                }
                if (Math.abs(n.pH - pKa) > 1) notes.push(tr('Beyond its pKa ± 1 it buffers poorly: choose one of a pKa nearer {pH}.', { pH: shortNum(n.pH) }));
                if (Math.abs(B[2]) > 0.02 && n.T === 25) notes.push(tr('Its pKa falls {v} each °C warmer: type the temperature it is used at.', { v: shortNum(-B[2]) }));
                notes.push(B[3] === 2 ? 'Dissolve both, then check the pH with a meter.' : 'Dissolve it in some 80% of the volume, bring it to the pH with a meter, then make it up.');
                return { rows: drawnTile(graphDrawing('Its base red and its acid blue against the pH, pKa ± 1 shaded', Math.max(0, pKa - 3), Math.min(14, pKa + 3), {
                    fs: [function (x) { return 100 / (1 + Math.pow(10, pKa - x)); }, function (x) { return 100 - 100 / (1 + Math.pow(10, pKa - x)); }], bands: [[pKa - 1, pKa + 1]], dots: [[n.pH, 100 * fb]],
                    marks: [[pKa, 'pKa']], y: [0, 118], names: ['pH', '%'] }), 'Its forms').concat(physRows(rows)), cols: 2, note: notes.join(' ') };
            }

            // the 95% interval of a part, k of m, by Wilson's score
            function wilson(k, m) {
                var z = 1.959964, p = k / m, d = 1 + z * z / m, c = (p + z * z / (2 * m)) / d, h = z * Math.sqrt(p * (1 - p) / m + z * z / (4 * m * m)) / d;
                return m > 0 ? [Math.max(0, c - h), Math.min(1, c + h)] : [NaN, NaN];
            }

            // counts made a thousand in all, each rounded so that they still are
            function thousand(c) {
                var sum = c.reduce(function (s, x) { return s + x; }, 0), parts = c.map(function (x) { return 1000 * x / sum; }), out = parts.map(Math.floor), left = 1000 - out.reduce(function (s, x) { return s + x; }, 0);
                parts.map(function (x, i) { return [x - Math.floor(x), i]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, left).forEach(function (q) { out[q[1]]++; });
                return out;
            }

            function runDiagnostic(n, raw) {
                var rates = raw.by === '1', none = ['Sensitivity, %', 'Specificity, %'], tp, fp, fn, tn, se, sp, ppv, npv, N, ci = '', part = false;
                if (rates) {
                    if (!raw.se && !raw.sp && !raw.pr) return physNone(none);
                    if (!(n.se >= 0 && n.se <= 100 && n.sp >= 0 && n.sp <= 100 && n.pr > 0 && n.pr < 100)) return bioWarn(none, 'Each a percent from 0 to 100, the prevalence between.');
                    se = n.se / 100;
                    sp = n.sp / 100;
                    tp = n.pr / 100 * se;
                    fn = n.pr / 100 * (1 - se);
                    fp = (1 - n.pr / 100) * (1 - sp);
                    tn = (1 - n.pr / 100) * sp;
                } else {
                    if (!raw.tp && !raw.fp && !raw.fn && !raw.tn) return physNone(none);
                    tp = raw.tp ? n.tp : 0; // those left empty as 0: two of the counts give sensitivity, specificity or PPV alone
                    fp = raw.fp ? n.fp : 0;
                    fn = raw.fn ? n.fn : 0;
                    tn = raw.tn ? n.tn : 0;
                    if (![tp, fp, fn, tn].every(function (x) { return x >= 0; })) return bioWarn(none, 'Counts of 0 or more.');
                    if (!(tp + fn + fp + tn > 0)) return bioWarn(none, 'Some tested.');
                    part = !(tp + fn > 0 && fp + tn > 0);
                    se = tp + fn ? tp / (tp + fn) : NaN;
                    sp = tn + fp ? tn / (tn + fp) : NaN;
                    ci = [['Sensitivity', wilson(tp, tp + fn)], ['Specificity', wilson(tn, tn + fp)], ['PPV', wilson(tp, tp + fp)], ['NPV', wilson(tn, tn + fn)]].filter(function (c) { return isFinite(c[1][0]); })
                        .map(function (c) { return c[0] + ' ' + shortNum(100 * c[1][0]) + '–' + shortNum(100 * c[1][1]) + '%'; }).join('; ');
                }
                N = tp + fp + fn + tn;
                ppv = tp + fp ? tp / (tp + fp) : NaN;
                npv = tn + fn ? tn / (tn + fn) : NaN;
                return { rows: (part ? [] : drawnTile(peopleDrawing(thousand([tp, fn, fp, tn])), 'A thousand tested')).concat(physRows([['Sensitivity, %', 100 * se], ['Specificity, %', 100 * sp], ['PPV, %', 100 * ppv], ['NPV, %', 100 * npv],
                    ['LR+', se / (1 - sp)], ['LR−', (1 - se) / sp], ['Accuracy, %', part ? NaN : 100 * (tp + tn) / N], ['Prevalence, %', part ? NaN : 100 * (tp + fn) / N]]), ci ? [textRow('95% intervals', ci)] : []), cols: 2,
                    note: part ? 'Some with the illness and some without, all four counts, for the rest.' : isFinite(ppv) ? tr('Of those it flags, {v} have it: the rarer the illness, the more of its positives are false.', { v: pcText(100 * ppv) }) : '' };
            }

            function runOdds(n, raw) {
                var none = ['RR', 'OR'], a = n.a, b = n.b, c = n.c, d = n.d, z = 1.959964, h, r1, r0, rr, or, s1, s2, rrH, orH, diff, rrCI, orCI;
                if (!raw.a && !raw.b && !raw.c && !raw.d) return physNone(none);
                if (![a, b, c, d].every(function (x) { return x >= 0; }) || !(a + b > 0 && c + d > 0)) return bioWarn(none, 'Four counts of 0 or more, some in each group.');
                r1 = a / (a + b);
                r0 = c / (c + d);
                rr = r1 / r0;
                or = a * d / (b * c);
                h = a && b && c && d ? 0 : 0.5; // Haldane's half of a count of 0, for the intervals
                s1 = Math.sqrt(1 / (a + h) - 1 / (a + b + 2 * h) + 1 / (c + h) - 1 / (c + d + 2 * h));
                s2 = Math.sqrt(1 / (a + h) + 1 / (b + h) + 1 / (c + h) + 1 / (d + h));
                rrH = ((a + h) / (a + b + 2 * h)) / ((c + h) / (c + d + 2 * h));
                orH = (a + h) * (d + h) / ((b + h) * (c + h));
                rrCI = [rrH * Math.exp(-z * s1), rrH * Math.exp(z * s1)];
                orCI = [orH * Math.exp(-z * s2), orH * Math.exp(z * s2)];
                diff = r1 - r0;
                return { rows: drawnTile(labelBars('The risk of each, %', [['Exposed', 100 * r1, true], ['Not', 100 * r0]], pcText), 'Risks').concat(drawnTile(ciDrawing([['RR', rr, rrCI[0], rrCI[1]], ['OR', or, orCI[0], orCI[1]]]), 'Intervals'),
                    physRows([['Risk, exposed, %', 100 * r1], ['Risk, not, %', 100 * r0], ['RR', rr], ['RR, 95% from', rrCI[0]], ['RR, to', rrCI[1]], ['OR', or], ['OR, 95% from', orCI[0]], ['OR, to', orCI[1]],
                        ['Difference, %', 100 * diff], [diff < 0 ? 'NNT' : 'NNH', diff ? 1 / Math.abs(diff) : NaN]]), [textRow('At 5%', rrCI[0] > 1 || rrCI[1] < 1 ? 'A real difference: its interval leaves out 1' : 'No difference shown: its interval takes in 1')]),
                    cols: 2, note: (h ? 'A count of 0: ½ added to each for the intervals. ' : '') + 'NNT: how many to treat for one fewer with it; of a harm, NNH. The OR is near the RR only of a rare outcome.' };
            }

            function runEpidemic(n, raw) {
                var none = ['Peak ill'], r, s0, herd, grow, line = function (k) {
                    var pts = r.path.map(function (p) { return [p[0], p[k]]; });
                    return function (t) { return alongPoints(pts, t); };
                };
                if (!raw.N && !raw.R0) return physNone(none);
                if (!(n.N >= 10 && n.N <= 1e10 && n.I > 0 && n.I < n.N && n.R0 > 0 && n.R0 <= 50 && n.D > 0 && n.v >= 0 && n.v <= 100 && n.days >= 1 && n.days <= 5000)) {
                    return bioWarn(none, '10 people or more, some ill at first, fewer than all, R₀ up to 50, the days ill above 0, a part vaccinated from 0 to 100%, and 1 to 5000 days.');
                }
                r = CalcBiology.sir(n.N, n.I, n.R0, n.D, n.v / 100, n.days, 400);
                s0 = (n.N - n.I) * (1 - n.v / 100) / n.N;
                herd = n.R0 > 1 ? 1 - 1 / n.R0 : 0;
                grow = (n.R0 * s0 - 1) / n.D;
                return { rows: drawnTile(graphDrawing('The ill red, those who can catch it blue, the recovered dashed', 0, n.days, { fs: [line(2), line(1), line(3)], marks: r.peak > n.I ? [[r.at, 'peak']] : [],
                    y: [0, n.N * 1.18], names: ['day', 'people'] }), 'Day by day').concat(physRows([['Peak ill', r.peak], ['Its day', r.at], ['Catch it in all', r.total], ['Of all, %', 100 * r.total / n.N],
                    ['Herd immunity, %', 100 * herd], ['R at first', n.R0 * s0], ['β, a day', n.R0 / n.D], ['γ, a day', 1 / n.D]].concat(grow > 0 ? [['Doubling at first, days', Math.LN2 / grow]] : []))), cols: 2,
                    note: n.R0 * s0 <= 1 ? (n.v / 100 >= herd && n.v ? 'Vaccinated past herd immunity: each passes it to fewer than one, and it dies out.' : 'R at first is 1 or less: it dies out.') :
                        'Catch it in all, by the final size equation, however long it lasts.' };
            }

            function runOxygen(n, raw) {
                var of = +raw.of || 0, myo = of === 2, none = ['SO<sub>2</sub>, %'], P50, sat, S, rows;
                if (!raw.po2) return Object.assign(physNone(none), { note: 'With a PO₂, its saturation.' });
                if (!(n.po2 >= 0 && n.po2 <= 800 && n.pH > 6.5 && n.pH < 8 && n.co2 > 0 && n.T > 20 && n.T < 45) || (raw.hb && !(n.hb > 0))) {
                    return bioWarn(none, 'A PO₂ from 0 to 800, a pH from 6.5 to 8, PCO₂ above 0, a temperature from 20 to 45 °C, and Hb above 0.');
                }
                P50 = myo ? 2.8 : CalcBiology.p50(n.pH, n.T, n.co2, of ? 19 : 26.8);
                sat = function (p) { return 100 * CalcBiology.saturation(p, P50, myo); };
                S = sat(n.po2);
                rows = [['SO<sub>2</sub>, %', S], ['P<sub>50</sub>, mmHg', P50], ['At 100 mmHg, %', sat(100)], ['At 40 mmHg, %', sat(40)], ['Given up, 100 to 40, %', sat(100) - sat(40)]];
                if (raw.hb) rows.push(['O<sub>2</sub>, mL/dL', 1.34 * n.hb * S / 100 + 0.003 * n.po2]);
                return { rows: drawnTile(graphDrawing('Its curve red, the usual adult\'s blue', 0, Math.max(120, n.po2 * 1.1), { fs: [sat, function (p) { return 100 * CalcBiology.saturation(p, 26.8); }],
                    dots: [[n.po2, S]], marks: [[P50, 'P₅₀']], y: [0, 105], names: ['PO₂, mmHg', 'SO₂ %'] }), 'Its curve').concat(physRows(rows)), cols: 2,
                    note: myo ? 'Myoglobin holds O₂ tight, giving it up only where little is left, as in working muscle.' : P50 > 27.3 ? 'Moved right: it gives O₂ up more readily, as in working muscle.' :
                        P50 < 26.3 ? tr('Moved left: it holds O₂ tighter{v}', { v: (of === 1 ? tr(', so a fetus takes it from its mother\'s blood.') : '.') }) : 'At the usual P₅₀, 26.8 mmHg.' };
            }

            function runAction(n, raw) {
                var none = ['Spikes'], hh, spikes = 0, peak = -Infinity, times = [], i, at = function (k) {
                    var pts = hh.map(function (q) { return [q[0], q[k]]; });
                    return function (t) { return alongPoints(pts, t); };
                };
                if (!raw.I) return physNone(none);
                if (!(Math.abs(n.I) <= 500 && n.dur > 0 && n.t >= 5 && n.t <= 200 && n.dur <= n.t && n.T >= -5 && n.T <= 40)) return bioWarn(none, 'A current up to ±500 µA/cm², for a time within 5 to 200 ms, at −5 to 40 °C.');
                hh = CalcBiology.hodgkinHuxley(n.I, 2, n.dur, n.t, n.T);
                for (i = 1; i < hh.length; i++) {
                    if (hh[i - 1][1] < 0 && hh[i][1] >= 0) {
                        spikes++;
                        times.push(hh[i][0]);
                    }
                    peak = Math.max(peak, hh[i][1]);
                }
                return { rows: drawnTile(graphDrawing('Its voltage, the current on shaded', 0, n.t, { fs: [at(1)], bands: [[2, 2 + n.dur]], y: [-90, 60], names: ['ms', 'mV'] }), 'Its voltage')
                    .concat(drawnTile(graphDrawing('Its gates: m red, h blue, n dashed', 0, n.t, { fs: [at(2), at(3), at(4)], bands: [[2, 2 + n.dur]], y: [0, 1.05], names: ['ms', 'open'] }), 'Its gates'),
                        [textRow('It', spikes ? 'Fires' + (spikes > 1 ? tr(', {spikes} times', { spikes: spikes }) : '') : 'Does not fire: below its threshold')],
                        physRows([['Spikes', spikes], ['Peak, mV', peak], ['At rest, mV', -65]].concat(spikes > 1 ? [['Rate, Hz', 1000 * (spikes - 1) / (times[spikes - 1] - times[0])]] : []))), cols: 2,
                    note: spikes ? 'Na⁺ rushes in as m opens, then h shuts its channels and n lets K⁺ out, below rest for a while.' : 'Too little to reach some −55 mV: more current, or for longer.' };
            }

            function runKidney(n, raw) {
                var by = +raw.by || 0, female = raw.sex !== '1', none, scr, eg, C, osm;
                if (by === 1) {
                    none = ['Clearance, mL/min'];
                    if (!raw.U && !raw.V && !raw.P) return physNone(none);
                    if (!(n.U >= 0 && n.V > 0 && n.P > 0)) return bioWarn(none, 'U of 0 or more, and the flow and P above 0.');
                    C = n.U * n.V / n.P;
                    return { rows: drawnTile(gaugeDrawing('Where it is, the usual GFR darker', C, 0, 200, [90, 140], [[0, '0'], [60, '60'], [90, '90'], [140, '140'], [200, '200']]), 'Its clearance')
                        .concat(physRows([['Clearance, mL/min', C], ['L a day', C * 1.44], ['U ÷ P', n.U / n.P]])), cols: 2,
                        note: 'U and P in one unit. Of inulin, filtered and neither taken back nor added, the GFR; of creatinine a little more, as some is secreted.' };
                }
                if (by === 2) {
                    none = ['Osmolality, mOsm/kg'];
                    if (!raw.na && !raw.glu && !raw.urea) return physNone(none);
                    if (!(n.na > 0 && n.glu >= 0 && n.urea >= 0) || (raw.meas && !(n.meas > 0))) return bioWarn(none, 'Na⁺ above 0, glucose and urea of 0 or more.');
                    osm = 2 * n.na + n.glu + n.urea;
                    return { rows: drawnTile(gaugeDrawing('Where it is, the usual darker', osm, 240, 340, [275, 295], [[240, '240'], [275, '275'], [295, '295'], [340, '340']]), 'Its osmolality')
                        .concat(physRows([['Osmolality, mOsm/kg', osm]].concat(raw.meas ? [['Gap', n.meas - osm]] : []))), cols: 2,
                        note: tr('In mmol/L; of mg/dL, 2Na + glucose ÷ 18 + BUN ÷ 2.8.{v}', { v: (raw.meas && n.meas - osm > 10 ? tr(' A gap above 10: something more in it, as ethanol or methanol.') : '') }) };
                }
                none = ['eGFR'];
                if (!raw.scr && !raw.age) return physNone(none);
                scr = raw.unit === '1' ? n.scr / 88.42 : n.scr;
                if (!(scr > 0 && n.age >= 18 && n.age <= 120) || (raw.w && !(n.w > 0))) return bioWarn(none, 'Creatinine above 0, an adult\'s age, 18 or more, and a weight above 0.');
                eg = CalcBiology.egfr(scr, n.age, female);
                return { rows: drawnTile(gaugeDrawing('Its stage, the usual darker', eg, 0, 120, [90, 120], [[0, '0'], [15, '15'], [30, '30'], [45, '45'], [60, '60'], [90, '90'], [120, '120']]), 'Its stage')
                    .concat(physRows([['eGFR', eg], ['Creatinine, mg/dL', scr], ['Creatinine, µmol/L', scr * 88.42]].concat(raw.w ? [['Cockcroft–Gault, mL/min', (140 - n.age) * n.w / (72 * scr) * (female ? 0.85 : 1)]] : [])),
                        [textRow('Stage', eg >= 90 ? 'G1, normal or high' : eg >= 60 ? 'G2, mildly decreased' : eg >= 45 ? 'G3a, mildly to moderately decreased' : eg >= 30 ? 'G3b, moderately to severely decreased' :
                            eg >= 15 ? 'G4, severely decreased' : 'G5, kidney failure')]), cols: 2,
                    note: 'eGFR in mL/min/1.73 m²; below 60 for 3 months or more is chronic kidney disease. For learning, not to diagnose.' };
            }

            function runBody(n, raw) {
                var none = ['BMI'], m, bmi, bmr, rows;
                if (!raw.h && !raw.w) return physNone(none);
                if (!(n.h >= 50 && n.h <= 250 && n.w >= 10 && n.w <= 400) || (raw.age && !(n.age >= 18 && n.age <= 120))) return bioWarn(none, 'A height of 50 to 250 cm, a weight of 10 to 400 kg, and an adult\'s age.');
                m = n.h / 100;
                bmi = n.w / (m * m);
                rows = [['BMI', bmi], ['Healthy from, kg', 18.5 * m * m], ['Healthy to, kg', 25 * m * m], ['Surface, m²', Math.sqrt(n.h * n.w / 3600)]];
                if (raw.age) {
                    bmr = 10 * n.w + 6.25 * n.h - 5 * n.age + (raw.sex === '1' ? 5 : -161);
                    rows.push(['BMR, kcal/day', bmr], ['A day, kcal', bmr * ACTIVITY[+raw.act || 0]], ['A day, kJ', bmr * ACTIVITY[+raw.act || 0] * 4.184]);
                }
                return { rows: drawnTile(gaugeDrawing('Its BMI, the healthy darker', bmi, 15, 40, [18.5, 25], [[15, '15'], [18.5, shortNum(18.5)], [25, '25'], [30, '30'], [35, '35'], [40, '40']]), 'Its class')
                    .concat(physRows(rows), [textRow('Class', bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : bmi < 35 ? 'Obese, class I' : bmi < 40 ? 'Obese, class II' : 'Obese, class III')]), cols: 2,
                    note: tr('BMI does not tell muscle from fat, and its classes differ for children.{v}', { v: (raw.age ? '' : tr(' With the age, the energy a day.')) }) };
            }

            function runDrug(n, raw) {
                var oral = raw.route === '1', none = ['Peak once steady, mg/L'], F = oral ? n.F : 1, k, R, level, first = 0, top = 0, low = Infinity, i, N, end;
                if (!raw.dose && !raw.V && !raw.half && !raw.tau) return physNone(none);
                if (!(n.dose > 0 && n.V > 0 && n.half > 0 && n.tau > 0 && n.n >= 1 && n.n <= 100 && n.n % 1 === 0) || (oral && !(F > 0 && F <= 1 && n.ka > 0))) return bioWarn(none, 'Each above 0, 1 to 100 doses, and F up to 1.');
                k = Math.LN2 / n.half;
                R = 1 / (1 - Math.exp(-k * n.tau));
                level = function (t, doses) { return CalcBiology.drugLevel(n.dose, n.V, n.half, n.tau, doses, t, oral, F, n.ka); };
                N = Math.min(2000, Math.ceil(10 * n.half / n.tau) + 10);
                for (i = 0; i <= 200; i++) {
                    first = Math.max(first, level(n.tau * i / 200, 1));
                    if (oral) {
                        top = Math.max(top, level((N - 1 + i / 200) * n.tau, N));
                        low = Math.min(low, level((N - 1 + i / 200) * n.tau, N));
                    }
                }
                if (!oral) {
                    top = n.dose / n.V * R;
                    low = top * Math.exp(-k * n.tau);
                }
                end = n.n * n.tau;
                return { rows: drawnTile(graphDrawing('Its level, mg/L, over the doses, the mean once steady blue', 0, end, { fs: [function (t) { return level(t, n.n); }], lines: [[0, F * n.dose / (k * n.V * n.tau), end, F * n.dose / (k * n.V * n.tau)]],
                    y: [0, Math.max(top, first) * 1.2], names: ['h', 'mg/L'] }), 'Its level').concat(physRows([['k, /h', k], ['Clearance, L/h', k * n.V], ['Peak after one, mg/L', first], ['Peak once steady, mg/L', top], ['Trough once steady, mg/L', low],
                    ['Mean once steady, mg/L', F * n.dose / (k * n.V * n.tau)], ['Builds up, times', R], ['90% steady, h', n.half * Math.log2(10)], ['Loading dose, mg', n.dose * R]])), cols: 2,
                    note: 'Steady after some 4 to 5 half-lives, however often it is given; a loading dose gets there at once. For learning, not to dose.' };
            }

            function runLeslie(n, raw) {
                var none = ['λ'], f = bioList(raw.f), s = bioList(raw.s), n0, k, L, last, sum = function (v) { return v.reduce(function (t, x) { return t + x; }, 0); };
                if (!raw.f && !raw.s) return physNone(none);
                if (f.bad.length || s.bad.length) return bioWarn(none, tr('{v} is not a number.', { v: escaped((f.bad.length ? f.bad : s.bad)[0]) }), [f.bad.length ? 'f' : 's']);
                k = f.values.length;
                if (k < 2 || k > 12) return bioWarn(none, '2 to 12 ages, a birth rate for each.', ['f']);
                if (s.values.length !== k - 1) return bioWarn(none, 'A survival from each age to the next, ' + (k - 1) + ', one fewer than the ages.', ['s']);
                if (!f.values.every(function (x) { return x >= 0; }) || !s.values.every(function (x) { return x >= 0 && x <= 1; })) return bioWarn(none, 'Births of 0 or more, and survival from 0 to 1.');
                n0 = raw.n ? bioList(raw.n) : { values: f.values.map(function () { return 100; }), bad: [] };
                if (n0.bad.length || n0.values.length !== k || !n0.values.every(function (x) { return x >= 0; })) return bioWarn(none, tr('As many numbers at first as ages, {k}, each 0 or more.', { k: k }), ['n']);
                if (!(n.y >= 1 && n.y <= 60 && n.y % 1 === 0)) return bioWarn(none, '1 to 60 steps.');
                L = CalcBiology.leslie(f.values, s.values, n0.values, n.y);
                last = L.path[n.y];
                return { rows: drawnTile(ageStackDrawing(L.path), 'Step by step').concat(drawnTile(labelBars('The ages it settles to, %', L.stable.map(function (p, i) { return ['Age ' + i, 100 * p]; }), pcText), 'Stable ages'),
                    [textRow('It', L.lambda > 1.0001 ? 'Grows' : L.lambda < 0.9999 ? 'Shrinks' : 'Holds steady')], physRows([['λ', L.lambda], ['Grows each step, %', 100 * (L.lambda - 1)], ['r, ln λ', Math.log(L.lambda)], ['R₀', L.R0],
                        ['At first', sum(n0.values)], ['At the end', sum(last)]]), [{ l: 'Each age', head: ['Age', 'Stable, %', 'At the end'], m: L.stable.map(function (p, i) { return [i, 100 * p, last[i]]; }) }]), cols: 2,
                    note: 'λ above 1, and R₀, it grows; below, it shrinks. The births of an age: its young that live to be counted, a step later.' };
            }

            function runCompetition(n, raw) {
                var none = ['N₁ at t', 'N₂ at t'], path, end, x1, y1, big, last, line = function (k) {
                    var pts = path.map(function (p) { return [p[0], p[k]]; });
                    return function (t) { return alongPoints(pts, t); };
                };
                if (!raw.n1 && !raw.k1) return physNone(none);
                if (!([n.n1, n.n2, n.a12, n.a21].every(function (x) { return x >= 0; }) && [n.r1, n.r2, n.k1, n.k2].every(function (x) { return x > 0; }) && n.t > 0 && n.t <= 1e5)) {
                    return bioWarn(none, 'Numbers and α of 0 or more, and r, K and t above 0.');
                }
                path = CalcBiology.competition(n.n1, n.n2, n.r1, n.r2, n.k1, n.k2, n.a12, n.a21, n.t, 300);
                end = CalcBiology.competitionEnd(n.k1, n.k2, n.a12, n.a21);
                last = path[300];
                big = 3 * Math.max(n.k1, n.k2, n.n1, n.n2);
                x1 = Math.min(big, Math.max(n.k1, n.a21 > 0 ? n.k2 / n.a21 : 0, n.n1, Math.max.apply(null, path.map(function (p) { return p[1]; })))) * 1.1;
                y1 = Math.min(big, Math.max(n.k2, n.a12 > 0 ? n.k1 / n.a12 : 0, n.n2, Math.max.apply(null, path.map(function (p) { return p[2]; })))) * 1.1;
                return {
                    rows: drawnTile(graphDrawing('Species 1 red and species 2 blue, over time', 0, n.t, { fs: [line(1), line(2)], names: ['t', 'N'] }), 'Over time')
                        .concat(drawnTile(graphDrawing('N₂ against N₁: the isoclines of 1 red and of 2 blue, its path thin', 0, x1, {
                            fs: [function (x) { return n.a12 > 0 ? (n.k1 - x) / n.a12 : NaN; }, function (x) { return n.k2 - n.a21 * x; }], lines: n.a12 > 0 ? [] : [[n.k1, 0, n.k1, y1]],
                            paths: [path.map(function (p) { return [p[1], p[2]]; })], dots: end.kind === 0 ? [[end.n1, end.n2]] : [[last[1], last[2]]], y: [0, y1], names: ['N₁', 'N₂'] }), 'Against each other'),
                            [textRow('It ends', end.kind === 1 ? 'Species 1 wins, at its K' : end.kind === 2 ? 'Species 2 wins, at its K' : end.kind === 0 ? 'Both live on, each held by itself more than by the other' :
                                'Whichever gets ahead wins: their balance is unstable')], physRows([['N₁ at t', last[1]], ['N₂ at t', last[2]]].concat(end.kind <= 0 && end.n1 >= 0 && end.n2 >= 0 ? [['N₁ at balance', end.n1], ['N₂ at balance', end.n2]] : []))),
                    cols: 2, note: 'α₁₂: how much each of species 2 counts against species 1\'s K, as one of its own would.'
                };
            }

            function runSpecies(n, raw) {
                var none, pts, xy, line, z, c, r2, cnt, N, S, chao, E, xs;
                if (raw.by === '1') {
                    none = ['Chao1'];
                    if (!raw.c) return physNone(none);
                    cnt = bioList(raw.c);
                    if (cnt.bad.length) return bioWarn(none, tr('{bad} is not a count.', { bad: escaped(cnt.bad[0]) }), ['c']);
                    if (!cnt.values.length || cnt.values.some(function (x) { return x < 0 || x % 1; })) return bioWarn(none, 'Whole counts of 0 or more.', ['c']);
                    N = cnt.values.reduce(function (s, x) { return s + x; }, 0);
                    if (!(N > 0)) return bioWarn(none, 'Some counted.', ['c']);
                    if (raw.n && !(n.n >= 1 && n.n <= N && n.n % 1 === 0)) return bioWarn(none, 'A sample from 1 to ' + N + ', whole.', ['n']);
                    S = cnt.values.filter(function (x) { return x > 0; }).length;
                    chao = CalcBiology.chao1(cnt.values);
                    E = raw.n ? CalcBiology.rarefy(cnt.values, n.n) : NaN;
                    return { rows: drawnTile(graphDrawing('Species expected in a sample of so many, Chao1 the line', 0, N, { fs: [function (m) { return m < 1 ? 0 : CalcBiology.rarefy(cnt.values, Math.round(m)); }],
                        lines: [[0, chao, N, chao]], dots: raw.n ? [[n.n, E]] : [], y: [0, Math.max(chao, S) * 1.12], names: ['sample', 'species'] }), 'Rarefaction')
                        .concat(physRows([['Chao1', chao], ['Species seen', S], ['Individuals', N], ['Seen once', cnt.values.filter(function (x) { return x === 1; }).length],
                            ['Seen twice', cnt.values.filter(function (x) { return x === 2; }).length]].concat(raw.n ? [['Expected in the sample', E]] : []))), cols: 2,
                        note: 'Rarefaction compares samples of different sizes at one size; Chao1 adds the species the rare ones suggest are unseen.' };
                }
                none = ['z', 'c'];
                if (!raw.pts) return physNone(none);
                pts = bioPairs(raw.pts);
                if (!pts) return bioWarn(none, 'An area and its species on each line: 100 24.', ['pts']);
                if (pts.length < 2) return Object.assign(physNone(none), { note: 'Two areas or more.' });
                if (!pts.every(function (p) { return p[0] > 0 && p[1] > 0; })) return bioWarn(none, 'Areas and species above 0.', ['pts']);
                xy = pts.map(function (p) { return { x: Math.log10(p[0]), y: Math.log10(p[1]) }; });
                line = bioFit(xy);
                if (!line) return bioWarn(none, 'Areas of different sizes.', ['pts']);
                if (raw.A && !(n.A > 0)) return bioWarn(none, 'An area above 0.', ['A']);
                z = line.m;
                c = Math.pow(10, line.b);
                r2 = rSquared(xy, line);
                xs = xy.map(function (p) { return p.x; }).concat(raw.A ? [Math.log10(n.A)] : []);
                return { rows: drawnTile(graphDrawing('log₁₀ species against log₁₀ area, a straight line', Math.min.apply(null, xs) - 0.3, Math.max.apply(null, xs) + 0.3, { fs: [function (x) { return line.m * x + line.b; }],
                    pts: xy.map(function (p) { return [p.x, p.y]; }), dots: raw.A ? [[Math.log10(n.A), z * Math.log10(n.A) + line.b]] : [], names: ['log₁₀ A', 'log₁₀ S'] }), 'On logarithms')
                    .concat(drawnTile(graphDrawing('Species against area', 0, Math.max.apply(null, pts.map(function (p) { return p[0]; }).concat(raw.A ? [n.A] : [])) * 1.05, { fs: [function (a) { return c * Math.pow(a, z); }],
                        pts: pts, dots: raw.A ? [[n.A, c * Math.pow(n.A, z)]] : [], names: ['A', 'S'] }), 'The curve'),
                        physRows([['z', z], ['c', c], ['R²', r2]].concat(raw.A ? [['Species of the area', c * Math.pow(n.A, z)]] : []))), cols: 2,
                    note: 'z some 0.15 to 0.35 of a mainland\'s areas, more of islands; ten times the area, some twice the species.' };
            }

            // a matrix of distances as typed, a taxon to a line, its name and its distances to all, or to those before it: { names, D, note } or { error }
            function taxaOfDistances(text) {
                var lines = String(text).split(/[\r\n]+/).map(function (l) { return l.trim(); }).filter(Boolean), N = lines.length, names = [], got = [], M, D, i, j, a, b, odd = false;
                for (i = 0; i < N; i++) {
                    var tok = lines[i].split(/[\s;]+/).filter(Boolean), row = null;
                    [N, i + 1, i].some(function (k) {
                        var nums;
                        if (k > tok.length) return false;
                        nums = tok.slice(tok.length - k).map(function (x) { var v = bioList(x); return v.bad.length || v.values.length !== 1 ? NaN : v.values[0]; });
                        if (!nums.every(isFinite)) return false;
                        row = { name: tok.slice(0, tok.length - k).join(' ').replace(/:$/, '') || tr('Taxon {i}', { i: (i + 1) }), d: nums, full: k === N };
                        return true;
                    });
                    if (!row) return { error: tr('Line {i}: a name and its distances, to all {n} or to those before it.', { i: (i + 1), n: N }) };
                    names.push(row.name);
                    got.push(row);
                }
                M = names.map(function () { return names.map(function () { return NaN; }); });
                got.forEach(function (r, k) { r.d.forEach(function (v, j2) { if (r.full || j2 < k) M[k][j2] = v; }); });
                D = names.map(function () { return names.map(function () { return 0; }); });
                for (i = 0; i < N; i++) {
                    for (j = 0; j < N; j++) {
                        if (i === j) continue;
                        a = M[i][j];
                        b = M[j][i];
                        if (!isNaN(a) && !isNaN(b) && Math.abs(a - b) > 1e-9) odd = true;
                        D[i][j] = isNaN(a) ? b : isNaN(b) ? a : (a + b) / 2;
                        if (!(D[i][j] >= 0)) return { error: 'A distance of 0 or more between ' + escaped(names[i]) + ' and ' + escaped(names[j]) + '.' };
                    }
                }
                return { names: names, D: D, note: odd ? 'Not the same both ways: the mean of each two.' : '' };
            }

            // aligned sequences as typed, a name and its sequence on each line, or FASTA: { names, D: their Jukes–Cantor distances } or { error }
            function taxaOfSequences(text) {
                var lines = String(text).split(/[\r\n]+/).map(function (l) { return l.trim(); }).filter(Boolean), names = [], seqs = [], D, d, i, j;
                if (lines.length && lines[0].charAt(0) === '>') {
                    lines.forEach(function (l) {
                        if (l.charAt(0) === '>') {
                            names.push(l.slice(1).trim() || tr('Seq {names}', { names: (names.length + 1) }));
                            seqs.push('');
                        } else seqs[seqs.length - 1] += l.replace(/\s+/g, '');
                    });
                } else {
                    lines.forEach(function (l, k) {
                        var tok = l.split(/\s+/);
                        seqs.push(tok.pop());
                        names.push(tok.join(' ').replace(/:$/, '') || tr('Seq {k}', { k: (k + 1) }));
                    });
                }
                seqs = seqs.map(function (s) { return s.toUpperCase().replace(/U/g, 'T'); });
                for (i = 0; i < seqs.length; i++) {
                    if (!seqs[i] || /[^ACGTRYSWKMBDHVN.?\-]/.test(seqs[i])) return { error: tr('{names}: not a sequence of bases, its gaps as -.', { names: escaped(names[i]) }) };
                    if (seqs[i].length !== seqs[0].length) return { error: tr('Aligned sequences are all of one length: {names} is {seqs}, not {seqs2}.', { names: escaped(names[i]), seqs: seqs[i].length, seqs2: seqs[0].length }) };
                }
                D = names.map(function () { return names.map(function () { return 0; }); });
                for (i = 0; i < seqs.length; i++) {
                    for (j = i + 1; j < seqs.length; j++) {
                        d = CalcBiology.distance(seqs[i], seqs[j]);
                        if (!d.sites) return { error: tr('{names} and {names2} have no bases in common to compare: only gaps or N where both are read.', { names: escaped(names[i]), names2: escaped(names[j]) }) };
                        D[i][j] = D[j][i] = d.jc;
                        if (!isFinite(D[i][j])) return { error: tr('{names} and {names2} are too unlike to measure: as unlike as chance makes them.', { names: escaped(names[i]), names2: escaped(names[j]) }) };
                    }
                }
                return { names: names, D: D };
            }

            function runTree(n, raw) {
                var none = ['Taxa'], nj = raw.how === '1', got, t, nw;
                if (!raw.d) return physNone(none);
                got = raw.by === '1' ? taxaOfSequences(raw.d) : taxaOfDistances(raw.d);
                if (got.error) return bioWarn(none, got.error, ['d']);
                if (got.names.length < 3) return Object.assign(physNone(none), { note: 'Three taxa or more.' });
                if (got.names.length > 30) return bioWarn(none, 'Up to 30 taxa.', ['d']);
                t = CalcBiology.tree(got.names, got.D, nj);
                nw = CalcBiology.newick(t);
                return {
                    rows: drawnTile(treeDrawing(t), 'The tree').concat([{ l: 'Newick', wide: true, wrap: true, text: '<span class="calc-bio-seq">' + escaped(nw) + '</span>', copy: nw }], physRows([['Taxa', got.names.length]]),
                        got.names.length <= 8 ? [textRow('Each', got.names.map(function (x, i) { return (i + 1) + ' ' + escaped(x); }).join(', ')),
                            { l: 'Distances', head: ['#'].concat(got.names.map(function (x, i) { return String(i + 1); })), m: got.D.map(function (row, i) { return [i + 1].concat(row); }) }] : []),
                    cols: 2, note: (nj ? 'Neighbour joining gives no root: drawn from the middle of its last branch.' : 'UPGMA takes a steady clock: each tip as far from the root.') + (got.note ? ' ' + got.note : '')
                };
            }

            function runClock(n, raw) {
                var none = ['d, Jukes–Cantor'], p, d, ds = null, A, B, rows, clean = function (s) {
                    return String(s || '').split(/\r?\n/).filter(function (l) { return !/^\s*>/.test(l); }).join('').replace(/[\s\d]+/g, '').toUpperCase().replace(/U/g, 'T');
                };
                if (raw.by === '1') {
                    if (!raw.a && !raw.b) return physNone(none);
                    if (!raw.a || !raw.b) return Object.assign(physNone(none), { note: 'Both sequences.' });
                    A = clean(raw.a);
                    B = clean(raw.b);
                    if (/[^ACGTRYSWKMBDHVN.?\-]/.test(A + B)) return bioWarn(none, 'Sequences of bases, their gaps as -.', [/[^ACGTRYSWKMBDHVN.?\-]/.test(A) ? 'a' : 'b']);
                    if (A.length !== B.length) return bioWarn(none, tr('Aligned, of one length: {a} and {b}. Align them first, as in the DNA tab.', { a: A.length, b: B.length }));
                    ds = CalcBiology.distance(A, B);
                    if (!ds.sites) return bioWarn(none, 'No sites of A, C, G or T in both to compare.');
                    p = ds.p;
                    d = ds.jc;
                } else {
                    if (!raw.p) return physNone(none);
                    if (!(n.p >= 0 && n.p < 0.75)) return bioWarn(none, 'p from 0 to below 0.75: at ¾ the sites are as unlike as chance makes them.');
                    p = n.p;
                    d = CalcBiology.jukesCantor(p);
                }
                if (!isFinite(d)) return bioWarn(none, 'Too unlike, p of ¾ or more: as unlike as chance makes them.');
                if ((raw.r && !(n.r > 0)) || (raw.T && !(n.T > 0))) return bioWarn(none, 'A rate and a time above 0.');
                rows = [['p', p], ['d, Jukes–Cantor', d]].concat(ds ? [['d, Kimura', ds.k2p], ['Transitions', ds.transitions], ['Transversions', ds.transversions], ['Sites', ds.sites]] : [],
                    raw.r ? [['Time, years', d / (2 * n.r)], ['Million years', d / (2 * n.r) / 1e6]] : raw.T ? [['Rate, /site/year', d / (2 * n.T)]] : []);
                return { rows: drawnTile(graphDrawing('d against p: Jukes and Cantor red, p itself blue', 0, 0.74, { fs: [CalcBiology.jukesCantor, function (x) { return x; }], dots: [[p, d]], y: [0, Math.max(1.6, d * 1.2)],
                    names: ['p', 'd'] }), 'd and p').concat(physRows(rows)), cols: 2,
                    note: tr('T = d ÷ 2r, as both lineages change from the split.{v}', { v: (raw.r || raw.T ? '' : tr(' With a rate, the time; or with the time, the rate.')) }) };
            }

            var bio = toolPanel(bioPanel, bioButton, BIO_TOOLS, 'bio', 'bio');
            toolPanels.push(bio);

            function showBio(open) {
                bio.show(open);
            }

    };
})(typeof window !== 'undefined' ? window : this);
