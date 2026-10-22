// The biology of the Biology panel worked out: DNA and RNA read as they are pasted, FASTA too, turned about, made into
// RNA and protein in any of six frames, their open reading frames, masses and melting points by nearest neighbours; the
// digest of a sequence by the enzymes most used; a protein's mass, pI, extinction and hydropathy; the amino acids;
// crosses of any number of genes and of the X, and a cross of three genes mapped; the growth of populations, predators
// and their prey, drift and selection; diversity and life tables; and the fitting of Michaelis and Menten.
// No page is needed, so it runs in the tests too
(function (root) {
    'use strict';

    var GAS = 8.314462618, // J/(mol·K)
        FARADAY = 96485.33212; // C/mol

    function round(x) {
        return isFinite(x) ? +x.toPrecision(12) + 0 : x;
    }

    // ---------- sequences ---------- //

    // each base's partner, the codes of IUPAC for more than one as well
    var PAIR = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A', N: 'N', R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K', B: 'V', V: 'B', D: 'H', H: 'D' };

    // A sequence as it is typed or pasted: the lines of FASTA's > and ; left out, and numbers, spaces, gaps and
    // line breaks, in capitals. { seq, rna: of U and no T, bad: the letters that are of no base, each once }
    function readSeq(text) {
        var s = String(text || '').split(/\r?\n/).filter(function (l) { return !/^\s*[>;]/.test(l); }).join('').replace(/[\s\d*.\-\/]+/g, '').toUpperCase(),
            bad = [];
        s.replace(/[^ACGTUNRYSWKMBDHV]/g, function (c) {
            if (bad.indexOf(c) < 0) bad.push(c);
            return '';
        });
        return { seq: s, rna: /U/.test(s) && !/T/.test(s), bad: bad };
    }

    // a sequence as DNA, its U as T
    function dna(seq) {
        return seq.replace(/U/g, 'T');
    }

    function complement(seq) {
        return seq.split('').map(function (c) { return PAIR[c] || 'N'; }).join('');
    }

    function reverseComplement(seq) {
        return complement(seq).split('').reverse().join('');
    }

    // the count of each base, and the part of G and C of those known
    function composition(seq) {
        var n = { A: 0, C: 0, G: 0, T: 0, U: 0, other: 0 };
        seq.split('').forEach(function (c) {
            if (n[c] !== undefined && c !== 'other') n[c]++;
            else n.other++;
        });
        n.gc = seq.length - n.other ? (n.G + n.C) / (seq.length - n.other) : NaN;
        return n;
    }

    // the standard genetic code, of the bases in the order T, C, A, G at each place
    var CODE = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        ORDER = 'TCAG';

    // the amino acid of a codon of DNA or RNA, * a stop; X of one not known
    function codon(c) {
        var i = ORDER.indexOf(c.charAt(0) === 'U' ? 'T' : c.charAt(0)), j = ORDER.indexOf(c.charAt(1) === 'U' ? 'T' : c.charAt(1)), k = ORDER.indexOf(c.charAt(2) === 'U' ? 'T' : c.charAt(2));
        return c.length === 3 && i > -1 && j > -1 && k > -1 ? CODE.charAt(16 * i + 4 * j + k) : 'X';
    }

    // every codon of an amino acid, one letter, in RNA
    function codonsOf(aa) {
        var list = [], i;
        for (i = 0; i < 64; i++) {
            if (CODE.charAt(i) === aa) list.push((ORDER.charAt(i >> 4) + ORDER.charAt((i >> 2) & 3) + ORDER.charAt(i & 3)).replace(/T/g, 'U'));
        }
        return list;
    }

    // the protein of DNA in a frame, 0, 1 or 2 from its start, of its other strand where back
    function translate(seq, frame, back) {
        var s = back ? reverseComplement(dna(seq)) : dna(seq), out = '', i;
        for (i = frame || 0; i + 3 <= s.length; i += 3) out += codon(s.substr(i, 3));
        return out;
    }

    // The open reading frames of DNA, from ATG to a stop, of min amino acids or more, in all six frames, the longest
    // first: { frame: 1 to 3, or –1 to –3, from, to: on the strand typed, 1 for its first base, the stop in, aa }
    function orfs(seq, min) {
        var s = dna(seq), L = s.length, list = [];
        [false, true].forEach(function (back) {
            var t = back ? reverseComplement(s) : s;
            [0, 1, 2].forEach(function (f) {
                var start = -1, i, a;
                for (i = f; i + 3 <= L; i += 3) {
                    a = codon(t.substr(i, 3));
                    if (start < 0 && t.substr(i, 3) === 'ATG') start = i;
                    else if (start > -1 && a === '*') {
                        if ((i - start) / 3 >= (min || 1)) {
                            list.push({ frame: back ? -(f + 1) : f + 1, aa: (i - start) / 3, protein: translate(t.substring(start, i), 0),
                                from: back ? L - (i + 3) + 1 : start + 1, to: back ? L - start : i + 3 });
                        }
                        start = -1;
                    }
                }
            });
        });
        return list.sort(function (a, b) { return b.aa - a.aa || a.from - b.from; });
    }

    // ---------- masses and melting ---------- //

    // The mass of an oligo of DNA, single, its 5' end with no phosphate, g/mol; of RNA, its 5' end a triphosphate, as made
    // by a polymerase. Of a base not known, the mean of the four
    function oligoMass(seq) {
        var n = composition(dna(seq));
        return round(n.A * 313.21 + n.T * 304.2 + n.C * 289.18 + n.G * 329.21 + n.other * 308.95 - 61.96);
    }

    function rnaMass(seq) {
        var n = composition(seq.replace(/T/g, 'U'));
        return round(n.A * 329.21 + n.U * 306.17 + n.C * 305.18 + n.G * 345.21 + n.other * 321.44 + 159);
    }

    // the mass of so many bases or base pairs, g/mol, as NEB has it: 0 dsDNA, 1 ssDNA, 2 RNA
    function lengthMass(kind, n) {
        return round([617.96 * n + 36.04, 308.97 * n + 18.02, 321.47 * n + 18.02][kind]);
    }

    // SantaLucia's nearest neighbours of 1998, kcal/mol and cal/(K·mol), of each two bases on the strand read 5' to 3'
    var NN = {
        AA: [-7.9, -22.2], TT: [-7.9, -22.2], AT: [-7.2, -20.4], TA: [-7.2, -21.3], CA: [-8.5, -22.7], TG: [-8.5, -22.7], GT: [-8.4, -22.4], AC: [-8.4, -22.4],
        CT: [-7.8, -21.0], AG: [-7.8, -21.0], GA: [-8.2, -22.2], TC: [-8.2, -22.2], CG: [-10.6, -27.2], GC: [-9.8, -24.4], GG: [-8.0, -19.9], CC: [-8.0, -19.9]
    };

    // The melting point of a primer, °C, its strand in excess of its target: by Wallace's rule, 2 of A or T and 4 of G
    // or C, which is of short ones; by the base count with salt; and by nearest neighbours, as Primer3, at na mM of Na⁺
    // and K⁺, mg mM of Mg²⁺ (von Ahsen's 120√Mg), conc nM of the primer: { wallace, salt, nn, dH: kcal/mol, dS: cal/(K·mol),
    // dG: at 37 °C, kcal/mol, gc }, NaN of what a base not known leaves out
    function meltingPoint(seq, na, conc, mg) {
        var s = dna(seq), N = s.length, n = composition(s), dH = 0, dS = 0, i, step, naEq, self, sure = !n.other && N > 1;
        naEq = ((na > 0 ? na : 0) + 120 * Math.sqrt(mg > 0 ? mg : 0)) / 1000;
        if (sure) {
            for (i = 0; i + 1 < N; i++) {
                step = NN[s.substr(i, 2)];
                dH += step[0];
                dS += step[1];
            }
            [s.charAt(0), s.charAt(N - 1)].forEach(function (c) { // its ends: G or C, else A or T
                dH += /[GC]/.test(c) ? 0.1 : 2.3;
                dS += /[GC]/.test(c) ? -2.8 : 4.1;
            });
            self = s === reverseComplement(s);
            if (self) dS -= 1.4;
            dS += 0.368 * (N - 1) * Math.log(naEq);
        }
        return {
            wallace: round(2 * (n.A + n.T) + 4 * (n.G + n.C)),
            basic: N > 13 ? round(64.9 + 41 * (n.G + n.C - 16.4) / N) : NaN,
            salt: naEq > 0 && N ? round(81.5 + 16.6 * Math.log10(naEq) + 41 * n.gc - 675 / N) : NaN,
            nn: sure && naEq > 0 && conc > 0 ? round(dH * 1000 / (dS + GAS / 4.184 * Math.log(conc * 1e-9 / (self ? 1 : 4))) - 273.15) : NaN,
            dH: sure ? round(dH) : NaN, dS: sure ? round(dS) : NaN, dG: sure ? round(dH - 310.15 * dS / 1000) : NaN, gc: n.gc, self: !!self
        };
    }

    // What makes a primer work badly: the G and C of its last 5 bases, its longest run of one base, and the most of
    // its 3' end that pairs with itself somewhere, as two of it pair into a dimer
    function primerChecks(seq) {
        var s = dna(seq), clamp = (s.slice(-5).match(/[GC]/g) || []).length, run = 0, i, k, dimer = 0;
        for (i = 0, k = 0; i < s.length; i++) {
            k = i && s.charAt(i) === s.charAt(i - 1) ? k + 1 : 1;
            run = Math.max(run, k);
        }
        for (k = Math.min(s.length, 12); k >= 3 && !dimer; k--) {
            if (s.indexOf(reverseComplement(s.slice(-k))) > -1) dimer = k;
        }
        return { clamp: clamp, run: run, dimer: dimer };
    }

    // ---------- restriction enzymes ---------- //

    // Enzymes and their sites, each read the same on both strands, and where they cut the top strand: after so many of its bases
    var ENZYMES = [
        ['EcoRI', 'GAATTC', 1], ['BamHI', 'GGATCC', 1], ['HindIII', 'AAGCTT', 1], ['XhoI', 'CTCGAG', 1], ['XbaI', 'TCTAGA', 1], ['SpeI', 'ACTAGT', 1],
        ['NcoI', 'CCATGG', 1], ['NdeI', 'CATATG', 2], ['SalI', 'GTCGAC', 1], ['PstI', 'CTGCAG', 5], ['SacI', 'GAGCTC', 5], ['KpnI', 'GGTACC', 5],
        ['SmaI', 'CCCGGG', 3], ['EcoRV', 'GATATC', 3], ['NotI', 'GCGGCCGC', 2], ['BglII', 'AGATCT', 1], ['NheI', 'GCTAGC', 1], ['ApaI', 'GGGCCC', 5],
        ['ClaI', 'ATCGAT', 2], ['MluI', 'ACGCGT', 1], ['SphI', 'GCATGC', 5], ['AgeI', 'ACCGGT', 1], ['AvrII', 'CCTAGG', 1], ['NsiI', 'ATGCAT', 5],
        ['ScaI', 'AGTACT', 3], ['PvuII', 'CAGCTG', 3], ['HpaI', 'GTTAAC', 3], ['SacII', 'CCGCGG', 4], ['HaeIII', 'GGCC', 2], ['AluI', 'AGCT', 2]
    ];

    // an enzyme by its name, as typed, any case
    function enzyme(name) {
        var t = String(name).trim().toLowerCase();
        return ENZYMES.filter(function (e) { return e[0].toLowerCase() === t; })[0] || null;
    }

    // The digest of DNA by enzymes, linear or a circle: { cuts: [{ name, at: the base after which it cuts, 1 for the first }],
    // fragments: their lengths, in the order they come, sites: of each enzyme how many }
    function digest(seq, enzymes, circular) {
        var s = dna(seq), L = s.length, look = circular ? s + s.slice(0, 7) : s, cuts = [], sites = {}, at, fragments = [];
        enzymes.forEach(function (e) {
            var i = look.indexOf(e[1]);
            sites[e[0]] = 0;
            while (i > -1 && i < L) {
                sites[e[0]]++;
                cuts.push({ name: e[0], at: (i + e[2]) % L || L });
                i = look.indexOf(e[1], i + 1);
            }
        });
        cuts.sort(function (a, b) { return a.at - b.at; });
        at = cuts.map(function (c) { return c.at; }).filter(function (x, i, all) { return !i || x !== all[i - 1]; });
        if (!at.length) fragments = [L];
        else if (circular) {
            at.forEach(function (x, i) { fragments.push(i ? x - at[i - 1] : x + L - at[at.length - 1]); });
            fragments.push(fragments.shift()); // from the first cut on
        } else {
            at.forEach(function (x, i) { fragments.push(x - (i ? at[i - 1] : 0)); });
            fragments.push(L - at[at.length - 1]);
            fragments = fragments.filter(function (f) { return f > 0; });
        }
        return { cuts: cuts, fragments: fragments, sites: sites, length: L };
    }

    // ---------- proteins ---------- //

    // The twenty amino acids: one letter, three, name, kind (0 nonpolar, 1 aromatic, 2 polar, 3 basic, 4 acidic), mass of
    // the free acid g/mol, the pKa of its COOH, of its NH₃⁺ and of its side chain (null of none), its pI, Kyte and Doolittle's
    // hydropathy, and whether people must eat it
    var AMINO = [
        ['G', 'Gly', 'Glycine', 0, 75.07, 2.34, 9.60, null, 5.97, -0.4, false], ['A', 'Ala', 'Alanine', 0, 89.09, 2.34, 9.69, null, 6.01, 1.8, false],
        ['P', 'Pro', 'Proline', 0, 115.13, 1.99, 10.96, null, 6.48, -1.6, false], ['V', 'Val', 'Valine', 0, 117.15, 2.32, 9.62, null, 5.97, 4.2, true],
        ['L', 'Leu', 'Leucine', 0, 131.17, 2.36, 9.60, null, 5.98, 3.8, true], ['I', 'Ile', 'Isoleucine', 0, 131.17, 2.36, 9.68, null, 6.02, 4.5, true],
        ['M', 'Met', 'Methionine', 0, 149.21, 2.28, 9.21, null, 5.74, 1.9, true], ['F', 'Phe', 'Phenylalanine', 1, 165.19, 1.83, 9.13, null, 5.48, 2.8, true],
        ['Y', 'Tyr', 'Tyrosine', 1, 181.19, 2.20, 9.11, 10.07, 5.66, -1.3, false], ['W', 'Trp', 'Tryptophan', 1, 204.23, 2.38, 9.39, null, 5.89, -0.9, true],
        ['S', 'Ser', 'Serine', 2, 105.09, 2.21, 9.15, null, 5.68, -0.8, false], ['T', 'Thr', 'Threonine', 2, 119.12, 2.11, 9.62, null, 5.87, -0.7, true],
        ['C', 'Cys', 'Cysteine', 2, 121.16, 1.96, 10.28, 8.18, 5.07, 2.5, false], ['N', 'Asn', 'Asparagine', 2, 132.12, 2.02, 8.80, null, 5.41, -3.5, false],
        ['Q', 'Gln', 'Glutamine', 2, 146.15, 2.17, 9.13, null, 5.65, -3.5, false], ['K', 'Lys', 'Lysine', 3, 146.19, 2.18, 8.95, 10.53, 9.74, -3.9, true],
        ['H', 'His', 'Histidine', 3, 155.16, 1.82, 9.17, 6.00, 7.59, -3.2, true], ['R', 'Arg', 'Arginine', 3, 174.20, 2.17, 9.04, 12.48, 10.76, -4.5, false],
        ['D', 'Asp', 'Aspartate', 4, 133.10, 1.88, 9.60, 3.65, 2.77, -3.5, false], ['E', 'Glu', 'Glutamate', 4, 147.13, 2.19, 9.67, 4.25, 3.22, -3.5, false]
    ].map(function (a) {
        return { one: a[0], three: a[1], name: a[2], kind: a[3], mass: a[4], pk: [a[5], a[6], a[7]], pi: a[8], kd: a[9], essential: a[10] };
    });
    var KINDS = ['Nonpolar', 'Aromatic', 'Polar', 'Basic, +', 'Acidic, –'],
        BY_ONE = {}, WATER = 18.01528;
    AMINO.forEach(function (a) { BY_ONE[a.one] = a; });

    // an amino acid by its letter, its three letters or its name, any case; null of none
    function amino(text) {
        var t = String(text || '').trim().toLowerCase();
        if (!t) return null;
        return AMINO.filter(function (a) {
            return a.one.toLowerCase() === t || a.three.toLowerCase() === t || a.name.toLowerCase() === t ||
                (t === 'aspartic acid' && a.one === 'D') || (t === 'glutamic acid' && a.one === 'E');
        })[0] || null;
    }

    // A protein as typed or pasted, of one letter each: FASTA's > lines, numbers and spaces left out, and a * at its end.
    // { seq, bad: the letters of no amino acid, each once }
    function readProtein(text) {
        var s = String(text || '').split(/\r?\n/).filter(function (l) { return !/^\s*[>;]/.test(l); }).join('').replace(/[\s\d.\-]+/g, '').replace(/\*+$/, '').toUpperCase(), bad = [];
        s.replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, function (c) {
            if (bad.indexOf(c) < 0) bad.push(c);
            return '';
        });
        return { seq: s, bad: bad };
    }

    // EMBOSS's pKa of a protein's charged groups: its two ends, and the side chains
    var PK = { nTerm: 8.6, cTerm: 3.6, K: 10.8, R: 12.5, H: 6.5, D: 3.9, E: 4.1, C: 8.5, Y: 10.1 };

    // the charge of a protein of these counts of each amino acid at a pH
    function chargeAt(n, pH) {
        var plus = 1 / (1 + Math.pow(10, pH - PK.nTerm)), minus = 1 / (1 + Math.pow(10, PK.cTerm - pH));
        ['K', 'R', 'H'].forEach(function (a) { plus += (n[a] || 0) / (1 + Math.pow(10, pH - PK[a])); });
        ['D', 'E', 'C', 'Y'].forEach(function (a) { minus += (n[a] || 0) / (1 + Math.pow(10, PK[a] - pH)); });
        return plus - minus;
    }

    // Of a protein: { length, mass: g/mol, pI, charge at pH 7, eps: its extinction at 280 nm of its cysteines free and paired,
    // M⁻¹cm⁻¹, abs: the absorbance of 1 mg/mL, of each, gravy: its mean hydropathy, aliphatic: its aliphatic index, counts }
    function protein(seq) {
        var n = {}, mass = WATER, gravy = 0, lo = 0, hi = 14, mid, i, epsFree, epsPaired, L = seq.length;
        AMINO.forEach(function (a) { n[a.one] = 0; });
        seq.split('').forEach(function (c) {
            n[c]++;
            mass += BY_ONE[c].mass - WATER;
            gravy += BY_ONE[c].kd;
        });
        for (i = 0; i < 60; i++) {
            mid = (lo + hi) / 2;
            if (chargeAt(n, mid) > 0) lo = mid;
            else hi = mid;
        }
        epsFree = n.W * 5500 + n.Y * 1490;
        epsPaired = epsFree + Math.floor(n.C / 2) * 125;
        return {
            length: L, mass: round(mass), pI: round((lo + hi) / 2), charge: round(chargeAt(n, 7)), counts: n,
            eps: [epsFree, epsPaired], abs: [round(epsFree / mass), round(epsPaired / mass)], gravy: round(L ? gravy / L : NaN),
            aliphatic: round(L ? 100 * (n.A + 2.9 * n.V + 3.9 * (n.I + n.L)) / L : NaN)
        };
    }

    // its hydropathy along it, the mean of a window of so many about each amino acid: [[the middle, 1 for the first, mean]]
    function hydropathy(seq, w) {
        var out = [], i, j, sum;
        w = Math.min(w, seq.length);
        for (i = 0; i + w <= seq.length; i++) {
            for (sum = 0, j = i; j < i + w; j++) sum += BY_ONE[seq.charAt(j)].kd;
            out.push([i + (w + 1) / 2, round(sum / w)]);
        }
        return out;
    }

    // An amino acid's titration from all its groups with their proton: the equivalents of OH⁻ added at a pH, and the pH at
    // so many equivalents, from 0 to as many groups as it has
    function equivalents(a, pH) {
        return a.pk.reduce(function (s, pk) { return pk === null ? s : s + 1 / (1 + Math.pow(10, pk - pH)); }, 0);
    }

    function titrationPH(a, eq) {
        var lo = -2, hi = 16, mid, i;
        for (i = 0; i < 50; i++) {
            mid = (lo + hi) / 2;
            if (equivalents(a, mid) < eq) lo = mid;
            else hi = mid;
        }
        return (lo + hi) / 2;
    }

    // ---------- genetics ---------- //

    // The genes of a genotype as typed, AaBb, Aa Bb or AABbcc: { genes: [[allele, allele], …], by letter } or { error }:
    // 'empty', 'odd', a letter alone; 'pair', two letters of one gene that are not the same letter; 'twice', one gene twice
    function genotype(text) {
        var s = String(text || '').replace(/[\s,;×]*$/, '').replace(/\s+/g, ''), genes = [], seen = {}, i, a, b;
        if (s.length % 2 && /x$/.test(s)) s = s.slice(0, -1); // a cross's x after it, unless it is a gene's letter
        if (!s) return { error: 'empty' };
        if (!/^[A-Za-z]+$/.test(s) || s.length % 2) return { error: 'odd' };
        for (i = 0; i < s.length; i += 2) {
            a = s.charAt(i);
            b = s.charAt(i + 1);
            if (a.toLowerCase() !== b.toLowerCase()) return { error: 'pair' };
            if (seen[a.toLowerCase()]) return { error: 'twice' };
            seen[a.toLowerCase()] = 1;
            genes.push(a <= b ? [a, b] : [b, a]); // the capital, dominant, first
        }
        return { genes: genes };
    }

    // the gametes of genes, each with how many of the 2ⁿ ways make it: [[alleles, count]], in order
    function gametes(genes) {
        var out = [''];
        genes.forEach(function (g) {
            var next = [];
            out.forEach(function (s) { next.push(s + g[0], s + g[1]); });
            out = next;
        });
        return out.reduce(function (list, s) {
            var at = list.filter(function (e) { return e[0] === s; })[0];
            if (at) at[1]++;
            else list.push([s, 1]);
            return list;
        }, []);
    }

    // a gene's two alleles as they are written, the capital first, and their rank: 0 of two capitals, 1 of one, 2 of none
    function pairOf(a, b) {
        return a <= b ? a + b : b + a;
    }

    function rankOf(pair) {
        return (pair.charAt(0) === pair.charAt(0).toLowerCase() ? 1 : 0) + (pair.charAt(1) === pair.charAt(1).toLowerCase() ? 1 : 0);
    }

    // A cross of two genotypes of the same genes, each gene's alleles sorted apart: { gametes: [of the first, of the second],
    // grid: [genotype, phenotype] of each of their meetings, genotypes and phenotypes: [[name, count]], the commonest kind first,
    // total } or { error: as genotype's, or 'genes', of other genes }. incomplete: one capital is between, not dominant
    function cross(t1, t2, incomplete) {
        var a = genotype(t1), b = genotype(t2), letters, ga, gb, grid, genos = {}, phenos = {}, total = 0;
        if (a.error || b.error) return { error: a.error || b.error, which: a.error ? 0 : 1 };
        letters = a.genes.map(function (g) { return g[0].toLowerCase(); });
        if (b.genes.length !== a.genes.length || !b.genes.every(function (g) { return letters.indexOf(g[0].toLowerCase()) > -1; })) return { error: 'genes' };
        b.genes.sort(function (x, y) { return letters.indexOf(x[0].toLowerCase()) - letters.indexOf(y[0].toLowerCase()); });
        if (a.genes.length > 6) return { error: 'many' };
        ga = gametes(a.genes);
        gb = gametes(b.genes);
        grid = ga.map(function (x) {
            return gb.map(function (y) {
                var pairs = x[0].split('').map(function (c, i) { return pairOf(c, y[0].charAt(i)); }), g = pairs.join(''), p, ways = x[1] * y[1];
                p = pairs.map(function (q) {
                    var r = rankOf(q);
                    return incomplete ? q : r < 2 ? q.charAt(0).toUpperCase() + '_' : q;
                }).join('');
                genos[g] = (genos[g] || 0) + ways;
                phenos[p] = (phenos[p] || 0) + ways;
                total += ways;
                return [g, p];
            });
        });
        function order(list) { // the most dominant first, gene by gene
            return Object.keys(list).map(function (k) { return [k, list[k]]; }).sort(function (x, y) {
                var i, rx, ry;
                for (i = 0; i < x[0].length; i += 2) {
                    rx = /_/.test(x[0].substr(i, 2)) ? 0 : rankOf(x[0].substr(i, 2));
                    ry = /_/.test(y[0].substr(i, 2)) ? 0 : rankOf(y[0].substr(i, 2));
                    if (rx !== ry) return rx - ry;
                }
                return 0;
            });
        }
        return { gametes: [ga, gb], grid: grid, genotypes: order(genos), phenotypes: order(phenos), total: total };
    }

    // counts as their simplest ratio, 9 : 3 : 3 : 1
    function ratio(counts) {
        var gcd = function (x, y) { return y ? gcd(y, x % y) : x; }, d = counts.reduce(gcd, 0) || 1;
        return counts.map(function (c) { return c / d; });
    }

    // A cross of a gene of the X: the mother's two alleles, XᴬXᵃ typed XAXa or Aa, and the father's one, XAY or A.
    // { mother, father: their alleles, grid: [[daughter, son] of each of her X], daughters, sons: [[genotype, phenotype, count]] }
    // or { error: 'mother' | 'father' }
    function xCross(mother, father) {
        var m = String(mother || '').replace(/[\s^]+/g, ''), f = String(father || '').replace(/[\s^]+/g, ''), mm, ff, d = {}, s = {};
        mm = /^X([A-Za-z])X([A-Za-z])$/.exec(m) || /^([A-WZa-z])([A-WZa-z])$/.exec(m);
        ff = /^X([A-Za-z])Y?$/.exec(f) || /^([A-WZa-z])Y?$/.exec(f);
        if (!mm || mm[1].toLowerCase() !== mm[2].toLowerCase()) return { error: 'mother' };
        if (!ff || ff[1].toLowerCase() !== mm[1].toLowerCase()) return { error: 'father' };
        [mm[1], mm[2]].forEach(function (x) {
            var g = pairOf(x, ff[1]);
            d[g] = (d[g] || 0) + 1;
            s[x] = (s[x] || 0) + 1;
        });
        function list(o, two) {
            return Object.keys(o).sort().map(function (k) {
                var dominant = k.charAt(0) === k.charAt(0).toUpperCase();
                return [k, two ? (dominant ? (k.charAt(1) === k.charAt(1).toUpperCase() ? 'dominant' : 'dominant, a carrier') : 'recessive') : dominant ? 'dominant' : 'recessive', o[k]];
            });
        }
        return { mother: [mm[1], mm[2]], father: ff[1], daughters: list(d, true), sons: list(s, false) };
    }

    // A test cross of three genes: lines of a class and its count, ABC 390, a b c 374 or + b + 27, 8 classes. Its gene in
    // the middle, by the rarest two, the crossed twice; the distances between, cM; the coincidence and the interference.
    // { order: the genes' places, left to right, names, d: [left to middle, middle to right, outer by the classes], coc,
    // interference, parental, double: the classes, total } or { error: 'lines' | 'classes' | 'alleles' | 'parental' }
    function threePoint(text) {
        var lines = String(text || '').split(/[\r\n;]+/).map(function (l) { return l.trim(); }).filter(Boolean), classes = [], seen = {}, alleles = [[], [], []],
            total = 0, P, D, mid, other, names, rf, ends, d1, d2, expected, i;
        if (lines.length !== 8) return { error: 'lines' };
        for (i = 0; i < 8; i++) {
            var m = /^(.*?)[\s:=,]*(\d+)$/.exec(lines[i]), g;
            if (!m) return { error: 'lines' };
            g = m[1].trim().split(/[\s\/,]+/).filter(Boolean); // v cv ct, or ABC, a letter each
            if (g.length === 1) g = g[0].split('');
            if (g.length !== 3 || seen[g.join(' ')]) return { error: 'classes' };
            seen[g.join(' ')] = 1;
            classes.push({ g: g, n: +m[2] });
            total += +m[2];
            g.forEach(function (c, j) { if (alleles[j].indexOf(c) < 0) alleles[j].push(c); });
        }
        if (alleles.some(function (a) { return a.length !== 2; }) || !(total > 0)) return { error: 'alleles' };
        classes.sort(function (a, b) { return b.n - a.n; });
        P = classes[0].g;
        D = classes[7].g;
        function differ(x, y) { return x.filter(function (c, j) { return c !== y[j]; }).length; }
        if (differ(P, classes[1].g) !== 3 || differ(D, classes[6].g) !== 3) return { error: 'parental' };
        // the middle gene: the one place where a double crossover differs from the parental it is nearest
        other = differ(D, P) === 1 ? P : classes[1].g;
        mid = [0, 1, 2].filter(function (j) { return D[j] !== other[j]; })[0];
        rf = function (x, y) { // of the classes, the part recombined between the genes at x and at y
            return classes.reduce(function (s, c) { return s + ((c.g[x] === P[x]) !== (c.g[y] === P[y]) ? c.n : 0); }, 0) / total;
        };
        names = alleles.map(function (a, j) {
            var mutant = a.filter(function (c) { return c !== '+'; });
            return mutant.length === 1 ? mutant[0] : (a.filter(function (c) { return c === c.toLowerCase(); })[0] || 'gene ' + (j + 1));
        });
        ends = [0, 1, 2].filter(function (j) { return j !== mid; });
        d1 = rf(ends[0], mid);
        d2 = rf(mid, ends[1]);
        expected = d1 * d2 * total;
        return {
            order: [ends[0], mid, ends[1]], names: names, d: [round(100 * d1), round(100 * d2), round(100 * rf(ends[0], ends[1]))],
            coc: round(expected ? (classes[6].n + classes[7].n) / expected : NaN), interference: round(expected ? 1 - (classes[6].n + classes[7].n) / expected : NaN),
            parental: [classes[0].g.join(' '), classes[1].g.join(' ')], double: [classes[6].g.join(' '), classes[7].g.join(' ')], total: total
        };
    }

    // ---------- populations ---------- //

    // a stream of random numbers from 0 to 1 of a seed, the same each time for the same seed: mulberry32
    function seeded(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // a count of n tries of the chance p, drawn: one by one up to 1000, and of more by the normal curve near it
    function binomialDraw(n, p, rnd) {
        var k = 0, i, u, v;
        if (n <= 1000) {
            for (i = 0; i < n; i++) if (rnd() < p) k++;
            return k;
        }
        u = Math.max(1e-12, rnd());
        v = rnd();
        k = Math.round(n * p + Math.sqrt(n * p * (1 - p)) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
        return Math.max(0, Math.min(n, k));
    }

    // Drift, by Wright and Fisher: pops populations of n each, 2n alleles, its p at first p0, for gens generations, of the
    // seed. [[p at each generation] of each]
    function drift(n, p0, gens, pops, seed) {
        var rnd = seeded(seed), out = [], k, g, p, path;
        for (k = 0; k < pops; k++) {
            path = [p0];
            for (p = p0, g = 0; g < gens; g++) {
                p = binomialDraw(2 * n, p, rnd) / (2 * n);
                path.push(p);
            }
            out.push(path);
        }
        return out;
    }

    // Selection on a gene: p of A at first, the fitness of AA, Aa and aa, mating at random: p at each of gens generations
    function selection(p0, w, gens) {
        var out = [p0], p = p0, q, mean, g;
        for (g = 0; g < gens; g++) {
            q = 1 - p;
            mean = p * p * w[0] + 2 * p * q * w[1] + q * q * w[2];
            p = mean > 0 ? (p * p * w[0] + p * q * w[1]) / mean : p;
            out.push(round(p));
        }
        return out;
    }

    // Lotka and Volterra: prey n0 and predators p0, dN/dt = aN – bNP, dP/dt = dNP – cP, from 0 to t by Runge and Kutta:
    // [[t, N, P]] at steps points, with the fewest and the most of each
    function predators(n0, p0, a, b, c, d, t, steps) {
        var f = function (n, p) { return [a * n - b * n * p, d * n * p - c * p]; }, h = t / steps, out = [[0, n0, p0]], n = n0, p = p0, i, k1, k2, k3, k4, sub, j, hs;
        for (i = 1; i <= steps; i++) {
            for (j = 0, sub = 8, hs = h / sub; j < sub; j++) { // smaller steps, drawn at each step
                k1 = f(n, p);
                k2 = f(n + hs / 2 * k1[0], p + hs / 2 * k1[1]);
                k3 = f(n + hs / 2 * k2[0], p + hs / 2 * k2[1]);
                k4 = f(n + hs * k3[0], p + hs * k3[1]);
                n += hs / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
                p += hs / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
                n = Math.max(0, n);
                p = Math.max(0, p);
            }
            out.push([h * i, n, p]);
        }
        return out;
    }

    // The diversity of counts of each species: { N, S: the species, simpson: Σn(n – 1) ÷ N(N – 1), lambda: Σp², shannon:
    // –Σp ln p, even: Pielou's, H ÷ ln S }
    function diversity(counts) {
        var c = counts.filter(function (x) { return x > 0; }), N = c.reduce(function (s, x) { return s + x; }, 0), S = c.length, simpson = 0, lambda = 0, h = 0;
        c.forEach(function (x) {
            var p = x / N;
            simpson += x * (x - 1);
            lambda += p * p;
            h -= p * Math.log(p);
        });
        return { N: N, S: S, simpson: round(N > 1 ? simpson / (N * (N - 1)) : NaN), lambda: round(lambda), shannon: round(h), even: round(S > 1 ? h / Math.log(S) : NaN) };
    }

    // A life table of how many are alive at the start of each age, the first the cohort: [[x, n, l, d, q, L, T, e]], l of
    // the first, d dying in it, q the chance of it, L the mean alive in it, T the years left of all, e of each
    function lifeTable(nx) {
        var rows = nx.map(function (n, x) {
            var next = x + 1 < nx.length ? nx[x + 1] : 0;
            return [x, n, n / nx[0], n - next, n ? (n - next) / n : NaN, (n + next) / 2];
        }), T = 0, i;
        for (i = rows.length - 1; i >= 0; i--) {
            T += rows[i][5];
            rows[i].push(T, rows[i][1] ? T / rows[i][1] : NaN);
        }
        return rows.map(function (r) { return r.map(round); });
    }

    // ---------- enzymes and cells ---------- //

    // Vmax and Km of Michaelis and Menten fitted to points [[S, v]] by least squares, from Hanes's line: { vmax, km, r2 } or null
    function michaelis(points) {
        var pts = points.filter(function (p) { return p[0] > 0 && isFinite(p[1]); }), n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0, m, c, vmax, km, i, j, mean = 0, ssr = 0, sst = 0;
        if (n < 3) return null;
        pts.forEach(function (p) { // Hanes: S/v = S/Vmax + Km/Vmax
            var y = p[0] / p[1];
            sx += p[0]; sy += y; sxx += p[0] * p[0]; sxy += p[0] * y;
        });
        m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
        c = (sy - m * sx) / n;
        vmax = 1 / m;
        km = c * vmax;
        if (!(vmax > 0 && km > 0)) {
            vmax = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
            km = pts.map(function (p) { return p[0]; }).sort(function (x, y) { return x - y; })[Math.floor(n / 2)]; // the middle [S]
        }
        for (i = 0; i < 100; i++) { // Gauss and Newton
            var a = 0, b = 0, d = 0, e = 0, f = 0, det, dv, dk;
            for (j = 0; j < n; j++) {
                var s = pts[j][0], den = km + s, r = pts[j][1] - vmax * s / den, gv = s / den, gk = -vmax * s / (den * den);
                a += gv * gv; b += gv * gk; d += gk * gk; e += gv * r; f += gk * r;
            }
            det = a * d - b * b;
            if (!det) break;
            dv = (d * e - b * f) / det;
            dk = (a * f - b * e) / det;
            vmax += dv;
            km = Math.max(km + dk, 1e-12 * Math.abs(km) + 1e-300);
            if (Math.abs(dv) < 1e-12 * Math.abs(vmax) && Math.abs(dk) < 1e-12 * Math.abs(km)) break;
        }
        pts.forEach(function (p) { mean += p[1] / n; });
        pts.forEach(function (p) {
            ssr += Math.pow(p[1] - vmax * p[0] / (km + p[0]), 2);
            sst += Math.pow(p[1] - mean, 2);
        });
        return isFinite(vmax + km) ? { vmax: round(vmax), km: round(km), r2: round(sst ? 1 - ssr / sst : NaN) } : null;
    }

    // Nernst's potential of an ion of charge z, its concentrations out and in, at t °C, mV
    function nernst(z, out, inside, t) {
        return round(1000 * GAS * (t + 273.15) / (z * FARADAY) * Math.log(out / inside));
    }

    // the resting potential by Goldman, Hodgkin and Katz, of K⁺, Na⁺ and Cl⁻: p their permeabilities, o and i their
    // concentrations out and in, at t °C, mV
    function goldman(p, o, i, t) {
        return round(1000 * GAS * (t + 273.15) / FARADAY * Math.log((p[0] * o[0] + p[1] * o[1] + p[2] * i[2]) / (p[0] * i[0] + p[1] * i[1] + p[2] * o[2])));
    }

    // ---------- alignment ---------- //

    // BLOSUM62, of the amino acids in this order
    var BLOSUM_ORDER = 'ARNDCQEGHILKMFPSTWYV',
        BLOSUM62 = [
            [4, -1, -2, -2, 0, -1, -1, 0, -2, -1, -1, -1, -1, -2, -1, 1, 0, -3, -2, 0],
            [-1, 5, 0, -2, -3, 1, 0, -2, 0, -3, -2, 2, -1, -3, -2, -1, -1, -3, -2, -3],
            [-2, 0, 6, 1, -3, 0, 0, 0, 1, -3, -3, 0, -2, -3, -2, 1, 0, -4, -2, -3],
            [-2, -2, 1, 6, -3, 0, 2, -1, -1, -3, -4, -1, -3, -3, -1, 0, -1, -4, -3, -3],
            [0, -3, -3, -3, 9, -3, -4, -3, -3, -1, -1, -3, -1, -2, -3, -1, -1, -2, -2, -1],
            [-1, 1, 0, 0, -3, 5, 2, -2, 0, -3, -2, 1, 0, -3, -1, 0, -1, -2, -1, -2],
            [-1, 0, 0, 2, -4, 2, 5, -2, 0, -3, -3, 1, -2, -3, -1, 0, -1, -3, -2, -2],
            [0, -2, 0, -1, -3, -2, -2, 6, -2, -4, -4, -2, -3, -3, -2, 0, -2, -2, -3, -3],
            [-2, 0, 1, -1, -3, 0, 0, -2, 8, -3, -3, -1, -2, -1, -2, -1, -2, -2, 2, -3],
            [-1, -3, -3, -3, -1, -3, -3, -4, -3, 4, 2, -3, 1, 0, -3, -2, -1, -3, -1, 3],
            [-1, -2, -3, -4, -1, -2, -3, -4, -3, 2, 4, -2, 2, 0, -3, -2, -1, -2, -1, 1],
            [-1, 2, 0, -1, -3, 1, 1, -2, -1, -3, -2, 5, -1, -3, -1, 0, -1, -3, -2, -2],
            [-1, -1, -2, -3, -1, 0, -2, -3, -2, 1, 2, -1, 5, 0, -2, -1, -1, -1, -1, 1],
            [-2, -3, -3, -3, -2, -3, -3, -3, -1, 0, 0, -3, 0, 6, -4, -2, -2, 1, 3, -1],
            [-1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4, 7, -1, -1, -4, -3, -2],
            [1, -1, 1, 0, -1, 0, 0, 0, -1, -2, -2, 0, -1, -2, -1, 4, 1, -3, -2, -2],
            [0, -1, 0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1, 1, 5, -2, -2, 0],
            [-3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1, 1, -4, -3, -2, 11, 2, -3],
            [-2, -2, -2, -3, -2, -1, -2, -3, 2, -1, -1, -2, -1, 3, -3, -2, -2, 2, 7, -1],
            [0, -3, -3, -3, -1, -2, -2, -3, -3, 3, 1, -2, 1, -1, -2, -2, 0, -3, -1, 4]
        ];

    // the score of two letters: of proteins by BLOSUM62, of DNA 5 the same and −4 not, as EMBOSS's EDNAFULL; N or X a little below 0
    function scorer(protein) {
        if (protein) {
            return function (a, b) {
                var i = BLOSUM_ORDER.indexOf(a), j = BLOSUM_ORDER.indexOf(b);
                return i < 0 || j < 0 ? -1 : BLOSUM62[i][j];
            };
        }
        return function (a, b) { return a === 'N' || b === 'N' ? -2 : a === b ? 5 : -4; };
    }

    // Two sequences aligned by Gotoh's gaps, a gap opened costing o.open and each more o.extend: o.local by Smith and
    // Waterman, the best part of each; else by Needleman and Wunsch, the whole of each, a gap at either end free, as
    // EMBOSS's needle scores it. { a, b: aligned, a gap '-', mid: | the same, : alike (a protein's above 0), . not, score,
    // length, same, alike, gaps, from: [of a, of b], to: the parts aligned, 1 for the first }
    function align(a, b, o) {
        var n = a.length, m = b.length, W = m + 1, NEG = -1e15, score = scorer(o.protein), open = o.open, ext = o.extend, local = !!o.local,
            trace = new Uint8Array((n + 1) * W), M0 = new Float64Array(W), X0 = new Float64Array(W), Y0 = new Float64Array(W),
            M1 = new Float64Array(W), X1 = new Float64Array(W), Y1 = new Float64Array(W), best = NEG, bi = 0, bj = 0, bs = 0, i, j, k, t, v, src, s, swap,
            ra = [], rb = [], mid = '', same = 0, alike = 0, gaps = 0, out;
        for (j = 0; j <= m; j++) {
            M0[j] = j || local ? NEG : 0;
            X0[j] = NEG;
            Y0[j] = local || !j ? NEG : 0; // a gap before a: free
        }
        for (i = 1; i <= n; i++) {
            M1[0] = NEG;
            Y1[0] = NEG;
            X1[0] = local ? NEG : 0;
            for (j = 1; j <= m; j++) {
                v = M0[j - 1]; // a letter of each
                src = 0;
                if (X0[j - 1] > v) { v = X0[j - 1]; src = 1; }
                if (Y0[j - 1] > v) { v = Y0[j - 1]; src = 2; }
                if (local && v < 0) { v = 0; src = 3; }
                M1[j] = v + score(a.charAt(i - 1), b.charAt(j - 1));
                t = src;
                v = M0[j] - open; // a's letter against a gap
                src = 0;
                if (X0[j] - ext > v) { v = X0[j] - ext; src = 1; }
                if (Y0[j] - open > v) { v = Y0[j] - open; src = 2; }
                X1[j] = v;
                t |= src << 2;
                v = M1[j - 1] - open; // b's letter against a gap
                src = 0;
                if (X1[j - 1] - open > v) { v = X1[j - 1] - open; src = 1; }
                if (Y1[j - 1] - ext > v) { v = Y1[j - 1] - ext; src = 2; }
                Y1[j] = v;
                t |= src << 4;
                trace[i * W + j] = t;
                if (local) {
                    if (M1[j] > best) { best = M1[j]; bi = i; bj = j; bs = 0; }
                } else if (i === n || j === m) { // the ends: what is left of the other after them, a free gap
                    if (M1[j] > best) { best = M1[j]; bi = i; bj = j; bs = 0; }
                    if (X1[j] > best) { best = X1[j]; bi = i; bj = j; bs = 1; }
                    if (Y1[j] > best) { best = Y1[j]; bi = i; bj = j; bs = 2; }
                }
            }
            swap = M0; M0 = M1; M1 = swap;
            swap = X0; X0 = X1; X1 = swap;
            swap = Y0; Y0 = Y1; Y1 = swap;
        }
        if (local && best <= 0) return null;
        i = bi;
        j = bj;
        s = bs;
        if (!local) {
            for (k = m; k > j; k--) { ra.push('-'); rb.push(b.charAt(k - 1)); }
            for (k = n; k > i; k--) { ra.push(a.charAt(k - 1)); rb.push('-'); }
        }
        while (i > 0 && j > 0) {
            t = trace[i * W + j];
            if (s === 0) {
                ra.push(a.charAt(i - 1));
                rb.push(b.charAt(j - 1));
                src = t & 3;
                i--;
                j--;
                if (src === 3) break;
                s = src;
            } else if (s === 1) {
                ra.push(a.charAt(i - 1));
                rb.push('-');
                s = (t >> 2) & 3;
                i--;
            } else {
                ra.push('-');
                rb.push(b.charAt(j - 1));
                s = (t >> 4) & 3;
                j--;
            }
        }
        if (!local) {
            while (i > 0) { ra.push(a.charAt(i - 1)); rb.push('-'); i--; }
            while (j > 0) { ra.push('-'); rb.push(b.charAt(j - 1)); j--; }
        }
        out = { a: ra.reverse().join(''), b: rb.reverse().join(''), score: round(best) };
        for (k = 0; k < out.a.length; k++) {
            var x = out.a.charAt(k), y = out.b.charAt(k);
            if (x === '-' || y === '-') { gaps++; mid += ' '; }
            else if (x === y) { same++; alike++; mid += '|'; }
            else if (o.protein && score(x, y) > 0) { alike++; mid += ':'; }
            else mid += '.';
        }
        out.mid = mid;
        out.length = out.a.length;
        out.same = same;
        out.alike = alike;
        out.gaps = gaps;
        out.from = local ? [i + 1, j + 1] : [1, 1];
        out.to = local ? [bi, bj] : [n, m];
        return out;
    }

    // ---------- CRISPR, motifs and primers ---------- //

    // the bases each of IUPAC's codes stands for
    var IUPAC = { A: 'A', C: 'C', G: 'G', T: 'T', U: 'T', R: 'AG', Y: 'CT', S: 'CG', W: 'AT', K: 'GT', M: 'AC', B: 'CGT', D: 'AGT', H: 'ACT', V: 'ACG', N: 'ACGT' };

    // a pattern of IUPAC's codes as a regular expression's source, [AG] for R
    function patternOf(code) {
        return code.split('').map(function (c) {
            var s = IUPAC[c] || '';
            return s.length > 1 ? '[' + s + ']' : s;
        }).join('');
    }

    // Where a pattern of IUPAC's codes is in a sequence, on either strand, each overlapping the next where it does:
    // [{ at: its first base on the strand typed, 1 for the first, strand: 1 or −1, match }], in order along it
    function motif(seq, pattern) {
        var s = dna(seq), p = dna(pattern), rc = reverseComplement(p), hits = [];
        function scan(q, strand) {
            var re = new RegExp('(?=(' + patternOf(q) + '))', 'g'), m;
            while ((m = re.exec(s))) {
                hits.push({ at: m.index + 1, strand: strand, match: m[1] });
                re.lastIndex = m.index + 1;
            }
        }
        if (!p) return hits;
        scan(p, 1);
        if (rc !== p) scan(rc, -1); // a palindrome, as GAATTC, once
        return hits.sort(function (x, y) { return x.at - y.at || y.strand - x.strand; });
    }

    // Cas nucleases: name, PAM, guide's length, its PAM 3′ of the guide as Cas9's, or 5′ as Cas12a's, and how many of the
    // guide's bases from its 5′ end are before the cut
    var NUCLEASES = [['SpCas9', 'NGG', 20, true, 17], ['SaCas9', 'NNGRRT', 21, true, 18], ['Cas12a', 'TTTV', 23, false, 18]];

    // The guides of a nuclease in a sequence, on both strands: [{ strand, guide, pam, from, to: its place on the strand typed,
    // cut: the bases of it before the cut, gc, others: the guides in it of the same seed, the 12 bases next to the PAM,
    // flags: 'lowgc' below 40%, 'highgc' above 80%, 'tttt' that ends a U6 transcript, 'run' of 5 of a base, 'seed' }],
    // the fewest flags first, then the GC nearest 55%
    function guides(seq, kind) {
        var s = dna(seq), L = s.length, nuc = NUCLEASES[kind] || NUCLEASES[0], len = nuc[2], pl = nuc[1].length, pam = new RegExp('^' + patternOf(nuc[1]) + '$'),
            out = [], seeds = {};
        [false, true].forEach(function (back) {
            var t = back ? reverseComplement(s) : s, i, g, p, cut, from;
            for (i = 0; i + len + pl <= L; i++) {
                if (nuc[3]) {
                    g = t.substr(i, len);
                    p = t.substr(i + len, pl);
                    from = i;
                } else {
                    p = t.substr(i, pl);
                    g = t.substr(i + pl, len);
                    from = i + pl;
                }
                cut = from + nuc[4];
                if (!pam.test(p) || /[^ACGT]/.test(g)) continue;
                out.push({ strand: back ? -1 : 1, guide: g, pam: p, from: back ? L - from - len + 1 : from + 1, to: back ? L - from : from + len, cut: back ? L - cut : cut,
                    seed: nuc[3] ? g.slice(-12) : g.slice(0, 12) });
            }
        });
        out.forEach(function (o) { seeds[o.seed] = (seeds[o.seed] || 0) + 1; });
        out.forEach(function (o) {
            o.gc = (o.guide.match(/[GC]/g) || []).length / len;
            o.others = seeds[o.seed] - 1;
            o.flags = [];
            if (o.gc < 0.4) o.flags.push('lowgc');
            if (o.gc > 0.8) o.flags.push('highgc');
            if (/TTTT/.test(o.guide)) o.flags.push('tttt');
            if (/A{5}|C{5}|G{5}|T{5}/.test(o.guide)) o.flags.push('run');
            if (o.others) o.flags.push('seed');
        });
        return out.sort(function (a, b) { return a.flags.length - b.flags.length || Math.abs(a.gc - 0.55) - Math.abs(b.gc - 0.55) || a.from - b.from; });
    }

    // QuikChange's melting point of a mutagenic primer: 81.5 + 0.41 %GC − 675/N − % mismatched
    function quikTm(primer, mismatched) {
        var n = primer.length;
        return round(81.5 + 41 * (primer.match(/[GC]/g) || []).length / n - 675 / n - 100 * mismatched / n);
    }

    // The primers of a point mutation by QuikChange: the bases from pos, 1 for the first, made into bases; the mutagenic
    // primer grown on both sides of them till its T_m is 78 °C or more, of 25 to 45 bases, then a base or two more to end in
    // G or C where there is room. { forward, reverse, from, tm, gc, mismatched, sure: its T_m reached } or null
    function mutagenesis(seq, pos, bases) {
        var s = dna(seq), b = dna(bases), k = b.length, mut, p, i, grow;
        if (!(pos >= 1) || pos - 1 + k > s.length || !k) return null;
        mut = s.slice(0, pos - 1) + b + s.slice(pos - 1 + k);
        function make(left, right) {
            var from = Math.max(0, pos - 1 - left), to = Math.min(s.length, pos - 1 + k + right), primer = mut.slice(from, to), mis = 0, j;
            for (j = from; j < to; j++) if (mut.charAt(j) !== s.charAt(j)) mis++;
            return { seq: primer, from: from + 1, to: to, mis: mis, tm: quikTm(primer, mis), left: left, right: right };
        }
        p = make(10, 10);
        for (i = 0; i < 40 && (p.tm < 78 || p.seq.length < 25) && p.seq.length < 45; i++) {
            grow = i % 2 ? make(p.left, p.right + 1) : make(p.left + 1, p.right);
            if (grow.seq.length === p.seq.length) grow = i % 2 ? make(p.left + 1, p.right) : make(p.left, p.right + 1); // that end reached: the other
            if (grow.seq.length === p.seq.length) break; // the sequence's ends reached
            p = grow;
        }
        for (i = 0; i < 2 && p.seq.length < 45 && !/[GC]/.test(p.seq.charAt(0)); i++) { // to end in G or C
            grow = make(p.left + 1, p.right);
            if (grow.from === p.from) break;
            p = grow;
        }
        for (i = 0; i < 2 && p.seq.length < 45 && !/[GC]/.test(p.seq.charAt(p.seq.length - 1)); i++) {
            grow = make(p.left, p.right + 1);
            if (grow.to === p.to) break;
            p = grow;
        }
        return { forward: p.seq, reverse: reverseComplement(p.seq), from: p.from, tm: p.tm, gc: (p.seq.match(/[GC]/g) || []).length / p.seq.length, mismatched: p.mis, sure: p.tm >= 78 };
    }

    // The primers that join two fragments by Gibson assembly: the end of a and the start of b, overlapping by so many bases,
    // half from each; the part of each primer that primes grown from 18 bases till its T_m by nearest neighbours, 50 mM Na⁺
    // and 250 nM, is tm. { forward: b's, with a's end on it, reverse: a's, with b's start, overlap, tms: [forward, reverse,
    // overlap] } or null of fragments too short
    function gibson(a, b, overlap, tm) {
        var A = dna(a), B = dna(b), ovA = Math.floor(overlap / 2), ovB = overlap - ovA, k1 = 18, k2 = 18, t1, t2;
        if (A.length < Math.max(ovA, 18) || B.length < Math.max(ovB, 18)) return null;
        function tmOf(x) { return meltingPoint(x, 50, 250, 0).nn; }
        while ((t1 = tmOf(B.slice(0, k1))) < tm && k1 < Math.min(40, B.length)) k1++;
        while ((t2 = tmOf(A.slice(-k2))) < tm && k2 < Math.min(40, A.length)) k2++;
        k1 = Math.max(k1, ovB);
        k2 = Math.max(k2, ovA);
        t1 = tmOf(B.slice(0, k1));
        t2 = tmOf(A.slice(-k2));
        return {
            forward: A.slice(A.length - ovA) + B.slice(0, k1), reverse: reverseComplement(A.slice(-k2) + B.slice(0, ovB)), overlap: A.slice(A.length - ovA) + B.slice(0, ovB),
            prime: [B.slice(0, k1), A.slice(-k2)], tms: [round(t1), round(t2), round(tmOf(A.slice(A.length - ovA) + B.slice(0, ovB)))]
        };
    }

    // ---------- curves fitted ---------- //

    // a small system of equations solved by Gauss's elimination, the largest pivot first: x of Ax = b, or null
    function solve(A, b) {
        var n = b.length, M = A.map(function (row, i) { return row.concat(b[i]); }), i, j, k, p, f, x = [];
        for (i = 0; i < n; i++) {
            for (p = i, j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
            if (!M[p][i]) return null;
            f = M[i]; M[i] = M[p]; M[p] = f;
            for (j = i + 1; j < n; j++) {
                f = M[j][i] / M[i][i];
                for (k = i; k <= n; k++) M[j][k] -= f * M[i][k];
            }
        }
        for (i = n - 1; i >= 0; i--) {
            for (f = M[i][n], k = i + 1; k < n; k++) f -= M[i][k] * x[k];
            x[i] = f / M[i][i];
        }
        return x;
    }

    // y of the four-parameter logistic at a concentration: bottom + (top − bottom) ÷ (1 + 10^((log EC50 − log x) × hill))
    function logistic4(p, x) {
        return p[0] + (p[1] - p[0]) / (1 + Math.pow(10, (p[2] - Math.log10(x)) * p[3]));
    }

    // A dose and its response fitted by the four-parameter logistic, by Levenberg and Marquardt: points [[concentration
    // above 0, response]]; fixed [bottom, top] held, as 0 and 100 of responses in %. { bottom, top, logc, ec50, hill: below
    // 0 of a response that falls, r2, n } or null. The hill's sign: rising +, falling −
    function doseFit(points, fixed) {
        var pts = points.filter(function (q) { return q[0] > 0 && isFinite(q[1]); }), n = pts.length, ys = pts.map(function (q) { return q[1]; }), xs = pts.map(function (q) { return Math.log10(q[0]); }),
            lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys), mx = 0, my = 0, sxy = 0, p, free, lambda = 1e-3, sse, i, it, mean = 0, sst = 0, mid, near = Infinity;
        free = fixed ? [2, 3] : [0, 1, 2, 3];
        if (n < free.length + 1 || Math.max.apply(null, xs) === Math.min.apply(null, xs)) return null;
        xs.forEach(function (x, j) { mx += x / n; my += ys[j] / n; });
        xs.forEach(function (x, j) { sxy += (x - mx) * (ys[j] - my); });
        p = fixed ? [fixed[0], fixed[1], mx, sxy < 0 ? -1 : 1] : [lo, hi, mx, sxy < 0 ? -1 : 1];
        mid = (p[0] + p[1]) / 2;
        xs.forEach(function (x, j) { if (Math.abs(ys[j] - mid) < near) { near = Math.abs(ys[j] - mid); p[2] = x; } });
        function sum(q) {
            return pts.reduce(function (s, d) { var r = d[1] - logistic4(q, d[0]); return s + r * r; }, 0);
        }
        sse = sum(p);
        for (it = 0; it < 300; it++) {
            var JtJ = free.map(function () { return free.map(function () { return 0; }); }), Jtr = free.map(function () { return 0; }), step, trial, s2;
            pts.forEach(function (d) {
                var lx = Math.log10(d[0]), u = Math.pow(10, (p[2] - lx) * p[3]), D = 1 + u, g = [1 - 1 / D, 1 / D, -(p[1] - p[0]) / (D * D) * u * Math.LN10 * p[3],
                    -(p[1] - p[0]) / (D * D) * u * Math.LN10 * (p[2] - lx)], r = d[1] - logistic4(p, d[0]);
                free.forEach(function (a, ia) {
                    Jtr[ia] += g[a] * r;
                    free.forEach(function (b, ib) { JtJ[ia][ib] += g[a] * g[b]; });
                });
            });
            step = solve(JtJ.map(function (row, ia) { return row.map(function (v, ib) { return ia === ib ? v * (1 + lambda) + 1e-12 : v; }); }), Jtr);
            if (!step || !step.every(isFinite)) break;
            trial = p.slice();
            free.forEach(function (a, ia) { trial[a] += step[ia]; });
            s2 = sum(trial);
            if (isFinite(s2) && s2 <= sse) {
                var done = sse - s2 < 1e-14 * Math.max(1, sse);
                p = trial;
                sse = s2;
                lambda = Math.max(lambda / 10, 1e-12);
                if (done && it > 5) break;
            } else lambda *= 10;
            if (lambda > 1e12) break;
        }
        if (!p.every(isFinite)) return null;
        if (p[1] < p[0] && !fixed) p = [p[1], p[0], p[2], -p[3]]; // the same curve, top the higher
        ys.forEach(function (y) { mean += y / n; });
        ys.forEach(function (y) { sst += (y - mean) * (y - mean); });
        return { bottom: round(p[0]), top: round(p[1]), logc: round(p[2]), ec50: round(Math.pow(10, p[2])), hill: round(p[3]), r2: round(sst ? 1 - sse / sst : NaN), n: n };
    }

    // ---------- evolution ---------- //

    // Of two aligned sequences of DNA, their gaps and N left out: { sites, p: the part that differ, transitions, transversions,
    // jc: Jukes and Cantor's distance, k2p: Kimura's of two parameters }, NaN where they differ too much
    function distance(a, b) {
        var s = dna(a), t = dna(b), sites = 0, ts = 0, tv = 0, i, x, y, P, Q, p;
        for (i = 0; i < Math.min(s.length, t.length); i++) {
            x = s.charAt(i);
            y = t.charAt(i);
            if (!/[ACGT]/.test(x) || !/[ACGT]/.test(y)) continue;
            sites++;
            if (x !== y) {
                if (/[AG]/.test(x) === /[AG]/.test(y)) ts++;
                else tv++;
            }
        }
        P = sites ? ts / sites : NaN;
        Q = sites ? tv / sites : NaN;
        p = P + Q;
        return { sites: sites, p: round(p), transitions: ts, transversions: tv, jc: jukesCantor(p), k2p: round(-0.5 * Math.log((1 - 2 * P - Q) * Math.sqrt(1 - 2 * Q))) };
    }

    // Jukes and Cantor's substitutions a site of p, the part of the sites that differ; NaN of 3/4 or more
    function jukesCantor(p) {
        return p < 0.75 ? round(-0.75 * Math.log(1 - 4 / 3 * p)) : NaN;
    }

    // A tree of a matrix of distances between named taxa, by UPGMA, or by neighbour joining, nj: { name, kids: [[node,
    // length]] }; nj's, unrooted, rooted at the middle of its last branch. Lengths below 0 made 0
    function tree(names, D, nj) {
        var nodes = names.map(function (n) { return { name: n, kids: [], size: 1, height: 0 }; }), d = D.map(function (r) { return r.slice(); }), i, j, k, a, b, best, n, r, li, lj, u, row;
        while (nodes.length > 2) {
            n = nodes.length;
            r = d.map(function (row) { return row.reduce(function (s, x) { return s + x; }, 0); });
            best = Infinity;
            for (i = 0; i < n; i++) {
                for (j = i + 1; j < n; j++) {
                    var q = nj ? (n - 2) * d[i][j] - r[i] - r[j] : d[i][j];
                    if (q < best - 1e-12) { best = q; a = i; b = j; }
                }
            }
            if (nj) {
                li = d[a][b] / 2 + (r[a] - r[b]) / (2 * (n - 2));
                lj = d[a][b] - li;
            } else {
                li = d[a][b] / 2 - nodes[a].height;
                lj = d[a][b] / 2 - nodes[b].height;
            }
            u = { kids: [[nodes[a], Math.max(0, round(li))], [nodes[b], Math.max(0, round(lj))]], size: nodes[a].size + nodes[b].size, height: d[a][b] / 2 };
            row = [];
            for (k = 0; k < n; k++) {
                if (k === a || k === b) continue;
                row.push(nj ? (d[a][k] + d[b][k] - d[a][b]) / 2 : (d[a][k] * nodes[a].size + d[b][k] * nodes[b].size) / (nodes[a].size + nodes[b].size));
            }
            d = d.filter(function (x, k2) { return k2 !== a && k2 !== b; }).map(function (rw, k2) {
                return rw.filter(function (x, k3) { return k3 !== a && k3 !== b; }).concat(row[k2]);
            });
            d.push(row.concat(0));
            nodes = nodes.filter(function (x, k2) { return k2 !== a && k2 !== b; }).concat(u);
        }
        if (nodes.length === 1) return nodes[0];
        li = nj ? d[0][1] / 2 : d[0][1] / 2 - nodes[0].height;
        lj = nj ? d[0][1] / 2 : d[0][1] / 2 - nodes[1].height;
        return { kids: [[nodes[0], Math.max(0, round(li))], [nodes[1], Math.max(0, round(lj))]] };
    }

    // a tree in Newick's way of writing it, (A:0.1,B:0.2):0.05;
    function newick(t) {
        function write(node) {
            return node.kids.length ? '(' + node.kids.map(function (k) { return write(k[0]) + ':' + k[1]; }).join(',') + ')' : String(node.name).replace(/[\s(),:;]+/g, '_');
        }
        return write(t) + ';';
    }

    // ---------- populations ---------- //

    // The dominant eigenvalue λ of a Leslie matrix, its births f of each age and survival s from each age to the next, by
    // the power method; with the stable ages, each a part of all, and R₀, the offspring of each in its life.
    // Of n0, the numbers of each age at first, its years: [[of each age] each year]
    function leslie(f, s, n0, years) {
        var k = f.length, v = f.map(function () { return 1; }), lambda = NaN, i, j, next, sum, path = [n0.slice()], l = 1, R0 = 0;
        function step(x) {
            var y = [f.reduce(function (t, fi, a) { return t + fi * x[a]; }, 0)];
            for (j = 1; j < k; j++) y.push(s[j - 1] * x[j - 1]);
            return y;
        }
        for (i = 0; i < 2000; i++) { // of A + I, whose λ + 1 is the only one of its size even where A's ages come round in turn
            next = step(v);
            sum = next.reduce(function (t, x) { return t + x; }, 0);
            if (!(sum > 0)) { lambda = 0; break; }
            lambda = sum / v.reduce(function (t, x) { return t + x; }, 0);
            next = next.map(function (x, a) { return x + v[a]; });
            sum = next.reduce(function (t, x) { return t + x; }, 0);
            v = next.map(function (x) { return x / sum; });
        }
        for (i = 0; i < k; i++) {
            R0 += l * f[i];
            l *= i < k - 1 ? s[i] : 0;
        }
        for (i = 0; i < years; i++) path.push(step(path[i]));
        return { lambda: round(lambda), stable: v.map(round), R0: round(R0), path: path };
    }

    // Two species competing, by Lotka and Volterra: dN₁/dt = r₁N₁(K₁ − N₁ − α₁₂N₂)/K₁, and of N₂ the same, from 0 to t by
    // Runge and Kutta: [[t, N₁, N₂]] at steps points
    function competition(n1, n2, r1, r2, k1, k2, a12, a21, t, steps) {
        var f = function (x, y) { return [r1 * x * (k1 - x - a12 * y) / k1, r2 * y * (k2 - y - a21 * x) / k2]; }, h = t / steps, out = [[0, n1, n2]], x = n1, y = n2, i, j, hs, q1, q2, q3, q4;
        for (i = 1; i <= steps; i++) {
            for (j = 0, hs = h / 8; j < 8; j++) {
                q1 = f(x, y);
                q2 = f(x + hs / 2 * q1[0], y + hs / 2 * q1[1]);
                q3 = f(x + hs / 2 * q2[0], y + hs / 2 * q2[1]);
                q4 = f(x + hs * q3[0], y + hs * q3[1]);
                x = Math.max(0, x + hs / 6 * (q1[0] + 2 * q2[0] + 2 * q3[0] + q4[0]));
                y = Math.max(0, y + hs / 6 * (q1[1] + 2 * q2[1] + 2 * q3[1] + q4[1]));
            }
            out.push([h * i, x, y]);
        }
        return out;
    }

    // how two competing species end, by their isoclines: 1 the first wins, 2 the second, 0 both live on, at { n1, n2 },
    // −1 whichever is ahead wins
    function competitionEnd(k1, k2, a12, a21) {
        var one = k1 > k2 * a12, two = k2 > k1 * a21; // each, where the other is at its K, still grows
        if (one && !two) return { kind: 1 };
        if (two && !one) return { kind: 2 };
        if (one && two) return { kind: 0, n1: round((k1 - a12 * k2) / (1 - a12 * a21)), n2: round((k2 - a21 * k1) / (1 - a12 * a21)) };
        return { kind: -1, n1: round((k1 - a12 * k2) / (1 - a12 * a21)), n2: round((k2 - a21 * k1) / (1 - a12 * a21)) };
    }

    // the logarithm of the gamma function, by Lanczos
    function lnGamma(x) {
        var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5], y = x, t = x + 5.5, s = 1.000000000190015, j;
        t -= (x + 0.5) * Math.log(t);
        for (j = 0; j < 6; j++) s += c[j] / ++y;
        return -t + Math.log(2.5066282746310005 * s / x);
    }

    // the species expected in a sample of m of a community of these counts, by Hurlbert's rarefaction
    function rarefy(counts, m) {
        var c = counts.filter(function (x) { return x > 0; }), N = c.reduce(function (s, x) { return s + x; }, 0), lnC = function (a, b) { return lnGamma(a + 1) - lnGamma(b + 1) - lnGamma(a - b + 1); };
        if (m >= N) return c.length;
        return round(c.reduce(function (s, x) { return s + (N - x < m ? 1 : 1 - Math.exp(lnC(N - x, m) - lnC(N, m))); }, 0));
    }

    // Chao's estimate of the species there are, those seen and the unseen the singletons and doubletons suggest, bias corrected
    function chao1(counts) {
        var c = counts.filter(function (x) { return x > 0; }), f1 = c.filter(function (x) { return x === 1; }).length, f2 = c.filter(function (x) { return x === 2; }).length;
        return round(c.length + f1 * (f1 - 1) / (2 * (f2 + 1)));
    }

    // An epidemic of S, I and R, people catching it, ill and recovered, of N, I₀ ill at first, R₀ and D days ill, a part v
    // vaccinated, by Runge and Kutta: { path: [[day, S, I, R]], peak, at: its day, total: those who catch it in all, of the
    // final size equation }
    function sir(N, I0, R0, D, v, days, steps) {
        var beta = R0 / D, gamma = 1 / D, S = (N - I0) * (1 - v), I = I0, R = (N - I0) * v, h = days / steps, path = [[0, S, I, R]], peak = I, at = 0, i, j, hs, s0, rv, x;
        function f(s, q) { return [-beta * s * q / N, beta * s * q / N - gamma * q]; }
        for (i = 1; i <= steps; i++) {
            for (j = 0, hs = h / 10; j < 10; j++) {
                var k1 = f(S, I), k2 = f(S + hs / 2 * k1[0], I + hs / 2 * k1[1]), k3 = f(S + hs / 2 * k2[0], I + hs / 2 * k2[1]), k4 = f(S + hs * k3[0], I + hs * k3[1]);
                S = Math.max(0, S + hs / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]));
                I = Math.max(0, I + hs / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]));
                R = N - S - I;
            }
            path.push([h * i, S, I, R]);
            if (I > peak) { peak = I; at = h * i; }
        }
        s0 = (N - I0) * (1 - v) / N;
        rv = (N - I0) * v / N;
        for (x = 0, i = 0; i < 500; i++) x = s0 * Math.exp(-R0 * (1 - x - rv)); // S at the end, a part of N
        return { path: path, peak: round(peak), at: round(at), total: round(N * (1 - x - rv)) };
    }

    // ---------- the body ---------- //

    // Hodgkin and Huxley's squid axon, at rest at −65 mV: a current of amp µA/cm² from start for dur ms, over t ms, at temp °C.
    // [[t, V, m, h, n]] each 0.05 ms, by Runge and Kutta
    function hodgkinHuxley(amp, start, dur, t, temp) {
        var phi = Math.pow(3, ((isFinite(temp) ? temp : 6.3) - 6.3) / 10), dt = 0.01, out = [], i, s, every = 5;
        function ex(x, y) { return Math.abs(x) < 1e-7 ? y : x / (1 - Math.exp(-x / y)); } // x/(1 − e^(−x/y)), of its limit at 0
        function rates(V) {
            return [0.01 * ex(V + 55, 10), 0.125 * Math.exp(-(V + 65) / 80), 0.1 * ex(V + 40, 10), 4 * Math.exp(-(V + 65) / 18), 0.07 * Math.exp(-(V + 65) / 20), 1 / (1 + Math.exp(-(V + 35) / 10))];
        }
        function f(q, time) {
            var V = q[0], m = q[1], h = q[2], n = q[3], a = rates(V), I = time >= start && time < start + dur ? amp : 0;
            return [I - 120 * m * m * m * h * (V - 50) - 36 * n * n * n * n * (V + 77) - 0.3 * (V + 54.387),
                phi * (a[2] * (1 - m) - a[3] * m), phi * (a[4] * (1 - h) - a[5] * h), phi * (a[0] * (1 - n) - a[1] * n)];
        }
        var a0 = rates(-65);
        s = [-65, a0[2] / (a0[2] + a0[3]), a0[4] / (a0[4] + a0[5]), a0[0] / (a0[0] + a0[1])];
        for (i = 0; i * dt <= t + 1e-9; i++) {
            var time = i * dt, k1, k2, k3, k4, add = function (x, k, c) { return x.map(function (v, j) { return v + c * k[j]; }); };
            if (i % every === 0) out.push([round(time), s[0], s[1], s[2], s[3]]);
            k1 = f(s, time);
            k2 = f(add(s, k1, dt / 2), time + dt / 2);
            k3 = f(add(s, k2, dt / 2), time + dt / 2);
            k4 = f(add(s, k3, dt), time + dt);
            s = s.map(function (v, j) { return v + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]); });
        }
        return out;
    }

    // The P50 of haemoglobin, mmHg, moved from its 26.8 at pH 7.4, 37 °C and 40 mmHg of CO₂: the Bohr effect, −0.48 of log P50
    // each unit of pH, 0.024 each °C, and 0.06 each tenfold of CO₂; base its own P50
    function p50(pH, T, pco2, base) {
        return round((base || 26.8) * Math.pow(10, 0.48 * (7.4 - pH) + 0.024 * (T - 37) + 0.06 * Math.log10(pco2 / 40)));
    }

    // The part of haemoglobin with O₂ at a PO₂, mmHg, by Severinghaus's curve moved to a P50; of myoglobin, one site, a hyperbola
    function saturation(po2, P50, myoglobin) {
        var x;
        if (!(po2 > 0)) return 0;
        if (myoglobin) return po2 / (po2 + P50);
        x = po2 * 26.86 / P50;
        return 1 / (23400 / (x * x * x + 150 * x) + 1);
    }

    // The filtration of the kidneys by CKD-EPI of 2021, without race, mL/min/1.73 m²: of creatinine in mg/dL, the age in years
    function egfr(scr, age, female) {
        var k = female ? 0.7 : 0.9, a = female ? -0.241 : -0.302;
        return round(142 * Math.pow(Math.min(scr / k, 1), a) * Math.pow(Math.max(scr / k, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1));
    }

    // A drug's concentration at t, h, of doses taken every tau h, n of them: of IV boluses, dose ÷ V each, falling at k = ln 2 ÷ t½;
    // of a drug taken by mouth, F of it, absorbed at ka, by Bateman
    function drugLevel(dose, V, half, tau, n, t, oral, F, ka) {
        var k = Math.LN2 / half, c = 0, j, s;
        for (j = 0; j < n && j * tau <= t + 1e-9; j++) {
            s = t - j * tau;
            c += oral ? (Math.abs(ka - k) < 1e-9 ? F * dose / V * k * s * Math.exp(-k * s) : F * dose * ka / (V * (ka - k)) * (Math.exp(-k * s) - Math.exp(-ka * s))) : dose / V * Math.exp(-k * s);
        }
        return c;
    }

    // ---------- crosses of more than one gene ---------- //

    // Two genes' interactions in a cross of AaBb × AaBb: name, its ratio, which phenotype each class A_B_, A_bb, aaB_, aabb
    // shows, their names, and an example
    var EPISTASIS = [
        ['None', [9, 3, 3, 1], [0, 1, 2, 3], ['A_B_', 'A_bb', 'aaB_', 'aabb'], 'Pea seeds, round and yellow'],
        ['Recessive epistasis', [9, 3, 4], [0, 1, 2, 2], ['Black', 'Brown', 'Yellow'], 'A Labrador\'s coat: ee yellow whatever B'],
        ['Dominant epistasis', [12, 3, 1], [0, 0, 1, 2], ['White', 'Yellow', 'Green'], 'Summer squash: W_ white whatever Y'],
        ['Complementary genes', [9, 7], [0, 1, 1, 1], ['Purple', 'White'], 'Sweet pea flowers: both genes needed'],
        ['Duplicate genes', [15, 1], [0, 0, 0, 1], ['Triangular', 'Ovoid'], 'Shepherd\'s purse: either gene does'],
        ['Dominant suppression', [13, 3], [0, 1, 0, 0], ['White', 'Coloured'], 'Chicken feathers: a dominant inhibitor whitens them'],
        ['Additive genes', [9, 6, 1], [0, 1, 1, 2], ['Disc', 'Sphere', 'Long'], 'Summer squash\'s shape']
    ];

    // The class of a genotype of two genes, as AaBb: 0 A_B_, 1 A_bb, 2 aaB_, 3 aabb
    function classOf(g) {
        return (/[A-Z]/.test(g.substr(0, 2)) ? 0 : 2) + (/[A-Z]/.test(g.substr(2, 2)) ? 0 : 1);
    }

    // The blood groups of the children of two parents: ABO genotypes as AO or AB, Rh as Dd. { abo, rh, both: [[group, part]] }
    function bloodCross(abo1, abo2, rh1, rh2) {
        var abo = {}, rh = {}, both = {}, rank = function (g) { // A, B, AB, O, each + before −
            return 2 * ['A', 'B', 'AB', 'O'].indexOf(g.replace(/[+−]$/, '')) + (/−$/.test(g) ? 1 : 0);
        }, list = function (o) {
            return Object.keys(o).map(function (k) { return [k, round(o[k])]; }).sort(function (a, b) { return b[1] - a[1] || rank(a[0]) - rank(b[0]); });
        };
        abo1.split('').forEach(function (x) {
            abo2.split('').forEach(function (y) {
                var g = /A/.test(x + y) && /B/.test(x + y) ? 'AB' : /A/.test(x + y) ? 'A' : /B/.test(x + y) ? 'B' : 'O';
                abo[g] = (abo[g] || 0) + 0.25;
            });
        });
        rh1.split('').forEach(function (x) {
            rh2.split('').forEach(function (y) {
                var g = /D/.test(x + y) ? '+' : '−';
                rh[g] = (rh[g] || 0) + 0.25;
            });
        });
        Object.keys(abo).forEach(function (a) { Object.keys(rh).forEach(function (r) { both[a + r] = abo[a] * rh[r]; }); });
        return { abo: list(abo), rh: list(rh), both: list(both) };
    }

    // ---------- reference ---------- //

    // Isotopes of the lab and the clinic: name, half-life in days, what it gives off, and how to shield it
    var ISOTOPES = [
        ['³H', 12.32 * 365.25, 'β⁻, 18.6 keV at most', 'Too weak to pass the skin: no shield; check by swabs'],
        ['¹⁴C', 5700 * 365.25, 'β⁻, 156 keV', 'Acrylic or glass is enough'],
        ['³²P', 14.268, 'β⁻, 1.71 MeV', '1 cm of acrylic, then lead; never lead alone'],
        ['³³P', 25.35, 'β⁻, 249 keV', 'Acrylic of a few mm'],
        ['³⁵S', 87.37, 'β⁻, 167 keV', 'Acrylic; it can be volatile'],
        ['⁴⁵Ca', 162.61, 'β⁻, 257 keV', 'Acrylic'],
        ['⁵¹Cr', 27.704, 'γ, 320 keV', 'Lead'],
        ['¹²⁵I', 59.388, 'γ and X-rays, 35 keV', 'Thin lead; it gathers in the thyroid'],
        ['¹³¹I', 8.0252, 'β⁻ and γ, 364 keV', 'Lead; it gathers in the thyroid'],
        ['⁹⁹ᵐTc', 6.0067 / 24, 'γ, 140 keV', 'Lead'],
        ['¹⁸F', 109.77 / 1440, 'β⁺, 511 keV γ', 'Lead or tungsten']
    ];

    // Buffers: name, pKa at 25 °C, its change each °C, how it is made: 0 its acid weighed, NaOH added; 1 its base, HCl added;
    // 2 two salts mixed; the g/mol of what is weighed, or of the acid salt and the base salt, and their names
    var BUFFERS = [
        ['Acetate', 4.76, 0.0002, 2, 60.05, 82.03, 'Acetic acid', 'Sodium acetate'],
        ['MES', 6.10, -0.011, 0, 195.24],
        ['Bis-Tris', 6.46, -0.017, 1, 209.24],
        ['PIPES', 6.76, -0.0085, 0, 302.37],
        ['Imidazole', 6.95, -0.020, 1, 68.08],
        ['MOPS', 7.20, -0.015, 0, 209.26],
        ['Phosphate', 7.20, -0.0028, 2, 119.98, 141.96, 'NaH₂PO₄', 'Na₂HPO₄'],
        ['TES', 7.40, -0.020, 0, 229.25],
        ['HEPES', 7.48, -0.014, 0, 238.30],
        ['Tricine', 8.05, -0.021, 0, 179.17],
        ['Tris', 8.06, -0.028, 1, 121.14],
        ['Bicine', 8.26, -0.018, 0, 163.17],
        ['Borate', 9.24, -0.008, 0, 61.83],
        ['CHES', 9.30, -0.018, 0, 207.29],
        ['Glycine', 9.78, -0.025, 0, 75.07],
        ['Carbonate', 10.33, -0.009, 2, 84.01, 105.99, 'NaHCO₃', 'Na₂CO₃'],
        ['CAPS', 10.40, -0.018, 0, 221.32]
    ];

    // Genomes: name, its length in bp, or nt of RNA, its genes coding for proteins, its chromosomes, haploid, and 2 of RNA
    var GENOMES = [
        ['Human', 3.1e9, 20000, 23], ['Mouse', 2.7e9, 22000, 20], ['Rat', 2.65e9, 22000, 21], ['Zebrafish', 1.37e9, 26000, 25], ['Chicken', 1.05e9, 17000, 39],
        ['Fruit fly', 1.437e8, 13900, 4], ['C. elegans', 1.003e8, 20000, 6], ['Arabidopsis', 1.35e8, 27600, 5], ['Rice', 3.8e8, 35000, 12], ['Maize', 2.3e9, 39000, 10],
        ['Bread wheat', 1.6e10, 107000, 21], ['Budding yeast', 1.21e7, 6000, 16], ['Fission yeast', 1.26e7, 5100, 3], ['E. coli K-12', 4641652, 4300, 1], ['B. subtilis', 4215606, 4200, 1],
        ['M. genitalium', 580076, 480, 1], ['Phage λ', 48502, 66, 1], ['SARS-CoV-2', 29903, 11, 1, 2], ['HIV-1', 9719, 9, 1, 2], ['pUC19', 2686, 2, 1]
    ];

    root.CalcBiology = {
        gas: GAS, faraday: FARADAY,
        readSeq: readSeq, dna: dna, complement: complement, reverseComplement: reverseComplement, composition: composition,
        codon: codon, codonsOf: codonsOf, translate: translate, orfs: orfs, code: CODE, order: ORDER,
        oligoMass: oligoMass, rnaMass: rnaMass, lengthMass: lengthMass, meltingPoint: meltingPoint, primerChecks: primerChecks,
        enzymes: ENZYMES, enzyme: enzyme, digest: digest,
        amino: amino, aminoAcids: AMINO, kinds: KINDS, byOne: BY_ONE, readProtein: readProtein, protein: protein, chargeAt: chargeAt,
        hydropathy: hydropathy, equivalents: equivalents, titrationPH: titrationPH,
        genotype: genotype, gametes: gametes, cross: cross, ratio: ratio, xCross: xCross, threePoint: threePoint,
        seeded: seeded, drift: drift, selection: selection, predators: predators, diversity: diversity, lifeTable: lifeTable,
        michaelis: michaelis, nernst: nernst, goldman: goldman,
        blosum: BLOSUM62, blosumOrder: BLOSUM_ORDER, align: align, iupac: IUPAC, motif: motif, nucleases: NUCLEASES, guides: guides,
        quikTm: quikTm, mutagenesis: mutagenesis, gibson: gibson, solve: solve, logistic4: logistic4, doseFit: doseFit,
        distance: distance, jukesCantor: jukesCantor, tree: tree, newick: newick, leslie: leslie, competition: competition, competitionEnd: competitionEnd,
        lnGamma: lnGamma, rarefy: rarefy, chao1: chao1, sir: sir, hodgkinHuxley: hodgkinHuxley, p50: p50, saturation: saturation, egfr: egfr, drugLevel: drugLevel,
        epistasis: EPISTASIS, classOf: classOf, bloodCross: bloodCross, isotopes: ISOTOPES, buffers: BUFFERS, genomes: GENOMES
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.CalcBiology;
})(typeof window !== 'undefined' ? window : this);
