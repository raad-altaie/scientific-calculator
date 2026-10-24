// The biology of the instant answers, as the Biology panel works it out (biology.js): a sequence of DNA or RNA, of 15
// bases or more, a primer of up to 40 with its melting point; a cross of two genotypes, AaBb × AaBb, its ratios; and a
// cross of the X, XᴬXᵃ × XᵃY, XAXa × XaY or with the letters in a <sup>, its sons and daughters. Selected as well, any of
// them alone, FASTA too, and a protein of one letter to each amino acid. Each is { from, to, kind, text, panel: 'bio',
// card, fields }, as the other features have them: where it is in the text, the card of the panel that opens with it and
// what goes in its boxes. The text is read here without biology.js; check makes sure of each with it, once background.js
// has put it in the page, and tip says what its tip shows. Put into the pages while the biology of the instant answers
// is turned on. Read here, in the browser; it works in Node as well, for the tests
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    const { grouped } = Reader;

    const percent = (x) => grouped(x, 3) + '%';
    // not in a word or a number, nor of a name, as BRCA1
    const NOT_BEFORE = '(?<![\\p{L}\\p{N}_\\-])';
    const NOT_AFTER = '(?![\\p{L}\\p{N}_])';

    // ---------------- sequences ---------------- //

    // A sequence of A, C, G and T, or U, of one case, N as well: in one piece, or in blocks of ten as GenBank writes it;
    // with its 5′ and 3′ ends, 5′-ATG…-3′, as well
    const BASES = (b) => '(?:' + b + '{10}\\s)+' + b + '{1,10}|' + b + '{15,}';
    const SEQUENCE = new RegExp(NOT_BEFORE + '(?:5[\'′’]\\s?[-–]?\\s?)?(' + BASES('[ACGTUN]') + '|' + BASES('[acgtun]') + ')(?:\\s?[-–]?\\s?3[\'′’])?' + NOT_AFTER, 'gu');

    // the bases of a sequence, in capitals; null where it is not one: of three bases or more, not of both T and U, and
    // few of them N
    function basesOf(text, least) {
        const s = text.replace(/\s+/g, '').toUpperCase();
        if (s.length < least || /T/.test(s) && /U/.test(s) || !/^[ACGTUN]+$/.test(s)) return null;
        if (new Set(s.replace(/N/g, '')).size < 3 || (s.match(/N/g) || []).length > s.length / 10) return null;
        return s;
    }

    // A primer, DNA of up to 40 bases, opens in Primer Tm; a longer one, or RNA, in DNA and RNA
    function sequence(s, from, to, text) {
        return s.length <= 40 && /^[ACGT]+$/.test(s) ?
            { from: from, to: to, kind: 'oligo', panel: 'bio', card: 'primer', text: text, fields: { a: s } } :
            { from: from, to: to, kind: 'sequence', panel: 'bio', card: 'sequence', text: text, fields: { s: s } };
    }

    function findSequences(s) {
        const out = [];
        let m;
        SEQUENCE.lastIndex = 0;
        while ((m = SEQUENCE.exec(s))) {
            const bases = basesOf(m[1], 15);
            if (bases) out.push(sequence(bases, m.index, m.index + m[0].length, m[0]));
        }
        return out;
    }

    // ---------------- crosses ---------------- //

    // A genotype, two letters to a gene, AaBb: its genes, each its letter once, or null
    function genesOf(t) {
        if (t.length % 2) return null;
        const genes = [];
        for (let i = 0; i < t.length; i += 2) {
            const a = t[i].toLowerCase();
            if (a !== t[i + 1].toLowerCase() || genes.includes(a)) return null;
            genes.push(a);
        }
        return genes;
    }

    // Two genotypes of the same genes, × between, or x with spaces round it: AaBb × AaBb, Tt x tt. Of a small letter and
    // a capital at least, so AA × BB, XX x YY, or mm x mm, a size, are not
    const CROSS = new RegExp(NOT_BEFORE + '([A-Za-z]{2,12})\\s*(?:×|\\s[xX]\\s)\\s*([A-Za-z]{2,12})' + NOT_AFTER, 'gu');

    function findCrosses(s) {
        const out = [];
        let m;
        CROSS.lastIndex = 0;
        while ((m = CROSS.exec(s))) {
            const a = genesOf(m[1]), b = genesOf(m[2]);
            if (!a || !b || a.length !== b.length || !a.every((g) => b.includes(g)) || !/[a-z]/.test(m[1] + m[2]) || !/[A-Z]/.test(m[1] + m[2])) continue;
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'cross', panel: 'bio', card: 'punnett', text: m[0], fields: { p1: m[1], p2: m[2], dom: '0' } });
        }
        return out;
    }

    // The letters raised as they are written in text, XᴬXᵃ: each one character, as the letter it raises
    const RAISED = 'ᴬAᴮBᴰDᴱEᴳGᴴHᴵIᴶJᴷKᴸLᴹMᴺNᴼOᴾPᴿRᵀTᵁUⱽVᵂWᵃaᵇbᶜcᵈdᵉeᶠfᵍgʰhⁱiʲjᵏkˡlᵐmⁿnᵒoᵖpʳrˢsᵗtᵘuᵛvʷwˣxʸyᶻz';
    const LOWERED = {}, RAISE = {};
    for (let i = 0; i < RAISED.length; i += 2) {
        LOWERED[RAISED[i]] = RAISED[i + 1];
        RAISE[RAISED[i + 1]] = RAISED[i];
    }
    const lowered = (s) => s.replace(/[ᴬ-ᶻⁱⁿʰʲʳʷʸˡˢˣⱽ]/g, (ch) => LOWERED[ch] || ch);

    // The X of a mother and of a father, either first: XAXa × XaY, X^A X^a, or raised, XᴬXᵃ
    const ALLELE = '\\^?([A-Za-z])';
    const MOTHER = 'X' + ALLELE + '\\s?X' + ALLELE, FATHER = 'X' + ALLELE + '\\s?Y';
    const SIGN = '\\s*(?:×|\\s[xX]\\s)\\s*';
    const X_CROSS = new RegExp(NOT_BEFORE + '(?:' + MOTHER + SIGN + FATHER + '|' + FATHER + SIGN + MOTHER + ')' + NOT_AFTER, 'gu');

    function findXCrosses(s) {
        const out = [];
        let m;
        X_CROSS.lastIndex = 0;
        while ((m = X_CROSS.exec(s))) {
            const [a, b, c] = m[1] ? [m[1], m[2], m[3]] : [m[5], m[6], m[4]];
            if (a.toLowerCase() !== b.toLowerCase() || a.toLowerCase() !== c.toLowerCase()) continue;
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'xcross', panel: 'bio', card: 'xlinked', text: m[0], fields: { m: 'X' + a + 'X' + b, f: 'X' + c + 'Y' } });
        }
        return out;
    }

    // ---------------- in the text ---------------- //

    // All of these in a text, the first and longest of two that overlap: a cross of the X before what else its letters
    // are. lettered: the text with the letters of its <sup> in it, as answers.js reads them, X<sup>A</sup> as XA. Each
    // reader only where the text has what it needs
    function find(s, lettered) {
        const line = lettered || s, t = lowered(line);
        return Reader.firstLongest([].concat(/X/.test(t) && /Y/.test(t) ? findXCrosses(t) : [], /×|\sx\s/i.test(t) ? findCrosses(t) : [],
            /[ACGTU]{10}|[acgtu]{10}/.test(t) ? findSequences(t) : [])).map((c) => Object.assign(c, { text: line.slice(c.from, c.to) }));
    }

    // A protein selected: of the letters of the twenty amino acids, in capitals, twenty or more; in blocks of ten as
    // UniProt writes it, not words, and not of bases alone
    function proteinOf(t) {
        const words = t.split(/\s+/).filter((w) => !/^\d+$/.test(w));
        if (words.some((w, i) => w.length < 10 && i < words.length - 1)) return null;
        const p = words.join('').replace(/\*$/, '');
        if (p.length < 20 || !/^[ACDEFGHIKLMNPQRSTVWY]+$/.test(p) || /^[ACGTUN]+$/.test(p) || new Set(p).size < 8) return null;
        return p;
    }

    // Text selected that is one of these alone, or a sequence of DNA or RNA of 10 bases or more, FASTA too, its numbers
    // left out, or a protein. A sequence of one case, in one piece or in blocks of ten, as the text has them; not words,
    // GATTACA GATTACA. Null for none
    function picked(text) {
        const t = String(text).replace(/\s+/g, ' ').trim();
        if (!t || t.length > 100000) return null;
        const whole = find(t).filter((c) => !c.from && c.to === t.length)[0];
        if (whole) return whole;
        // FASTA: its lines of > left out
        const body = String(text).split(/\r?\n/).filter((l) => !/^\s*[>;]/.test(l)).join(' ').replace(/\s+/g, ' ').trim();
        const words = body.replace(/\d+/g, ' ').split(/\s+/).filter(Boolean), plain = words.join('');
        const bases = !words.some((w, i) => w.length < 10 && i < words.length - 1) && (plain === plain.toUpperCase() || plain === plain.toLowerCase()) ?
            basesOf(plain, 10) : null;
        if (bases) return sequence(bases, 0, t.length, t);
        const protein = proteinOf(body);
        return protein ? { from: 0, to: t.length, kind: 'protein', panel: 'bio', card: 'protein', text: t, fields: { s: protein } } : null;
    }

    // ---------------- worked out by biology.js ---------------- //

    // Each found is made sure of with biology.js, B: bases and amino acids it reads, crosses it works out
    function check(c, B) {
        if (!B) return false;
        try {
            const f = c.fields;
            switch (c.kind) {
                case 'oligo':
                    return isFinite(B.meltingPoint(f.a, 50, 250, 0).nn);
                case 'sequence':
                    return !B.readSeq(f.s).bad.length;
                case 'protein':
                    return !B.readProtein(f.s).bad.length;
                case 'cross':
                    return !B.cross(f.p1, f.p2, false).error;
                case 'xcross':
                    return !B.xCross(f.m, f.f).error;
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    // a long sequence for a tip: its start and its end
    const cut = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);
    // the X of a cross, its letters raised where they can be: XᴬXᵃ
    const raised = (t) => t.replace(/(?<=X)([A-Za-z])/g, (m, a) => RAISE[a] || '^' + a);

    // What the tip of each says: { title, lines, rows, note, more }, as answers.js shows them, as its card works it out
    function tip(c, B) {
        const f = c.fields;
        switch (c.kind) {
            case 'oligo': {
                const m = B.meltingPoint(f.a, 50, 250, 0);
                return { title: '5′ ' + f.a + ' 3′', lines: ['Tₘ ' + grouped(m.nn, 3) + ' °C'],
                    rows: [['Length', f.a.length + ' bases'], ['GC', percent(100 * m.gc)], ['Wallace', grouped(m.wallace) + ' °C'], ['ΔG at 37 °C', grouped(m.dG, 3) + ' kcal/mol'],
                        ['Reverse complement', B.reverseComplement(f.a)]],
                    note: 'By nearest neighbours, as Primer3: 50 mM Na⁺, 250 nM of primer.', more: 'Click to open it in Primer Tm.' };
            }
            case 'sequence': {
                const r = B.readSeq(f.s), s = r.seq, n = B.composition(s), t = r.rna ? 'U' : 'T', orf = B.orfs(s, 25)[0];
                const rc = B.reverseComplement(s), as = r.rna ? rc.replace(/T/g, 'U') : rc;
                return { title: (r.rna ? 'RNA, ' : 'DNA, ') + grouped(s.length) + (r.rna ? ' nt' : ' bases'), lines: ['GC ' + percent(100 * n.gc)],
                    rows: [['Bases', ['A', 'C', 'G', t].map((b) => b + ' ' + grouped(n[b])).join(', ') + (n.other ? ', other ' + n.other : '')],
                        [r.rna ? 'Mass' : 'Mass, one strand', grouped(r.rna ? B.rnaMass(s) : B.oligoMass(s), 7) + ' g/mol'],
                        ['Longest ORF', orf ? orf.aa + ' aa, frame ' + (orf.frame > 0 ? '+' : '–') + Math.abs(orf.frame) : 'none of 25 aa'],
                        ['Reverse complement', cut(as, 24)]],
                    more: 'Click to open it in DNA and RNA.' };
            }
            case 'protein': {
                const p = B.protein(f.s);
                return { title: 'Protein, ' + p.length + ' aa', lines: [grouped(p.mass / 1000, 4) + ' kDa'],
                    rows: [['pI', grouped(p.pI, 3)], ['Charge at pH 7', grouped(p.charge, 3)], ['ε₂₈₀', grouped(p.eps[0]) + ' M⁻¹cm⁻¹'], ['GRAVY', grouped(p.gravy, 3)]],
                    note: 'pI by EMBOSS\'s pKa; ε₂₈₀ of its cysteines free.', more: 'Click to open it in Protein.' };
            }
            case 'cross': {
                const r = B.cross(f.p1, f.p2, false);
                if (r.error) return null;
                const ratio = (list) => B.ratio(list.map((p) => p[1])).join(' : ');
                const gametes = (list) => (list.length <= 4 ? list.map((g) => g[0]).join(', ') : list.length + ' kinds');
                const names = (list) => list.map((p) => p[0]).join(' : ');
                return { title: f.p1 + ' × ' + f.p2, lines: [r.phenotypes.length > 1 ? ratio(r.phenotypes) : 'All ' + r.phenotypes[0][0]],
                    rows: [['Phenotypes', names(r.phenotypes)],
                        ['Genotypes', r.genotypes.length <= 3 ? names(r.genotypes) + (r.genotypes.length > 1 ? ', ' + ratio(r.genotypes) : '') : r.genotypes.length + ' kinds'],
                        ['Gametes', gametes(r.gametes[0]) + ' × ' + gametes(r.gametes[1])]],
                    note: 'Of complete dominance, the capital dominant; the card has incomplete too.', more: 'Click to open it in Punnett square.' };
            }
            case 'xcross': {
                const r = B.xCross(f.m, f.f);
                if (r.error) return null;
                const of = (list, kind) => list.reduce((n, g) => n + (g[1] === kind ? g[2] : 0), 0);
                const sons = of(r.sons, 'recessive'), daughters = of(r.daughters, 'recessive');
                return { title: raised(f.m) + ' × ' + raised(f.f), lines: [percent(25 * (sons + daughters)) + ' of the children show it'],
                    rows: [['Sons showing it', percent(50 * sons)], ['Daughters showing it', percent(50 * daughters)], ['Daughters carriers', percent(50 * of(r.daughters, 'dominant, a carrier'))]],
                    note: 'It: the trait of the small letter, recessive, as colour blindness.', more: 'Click to open it in Sex-linked cross.' };
            }
        }
        return null;
    }

    const CalcBioPage = { find: find, picked: picked, check: check, tip: tip };
    root.CalcBioPage = CalcBioPage;

    // A feature of the instant answers (reader.js): read before the sums; selected, before the maths. biology.js comes
    // into the page before its icons go in
    Reader.add({
        name: 'biology', kinds: ['sequence', 'oligo', 'protein', 'cross', 'xcross'], needs: 'bio', uses: 'bio',
        find: (s, order, raw, lettered) => find(raw, lettered), tier: 1, picked: picked,
        check: (c, unit, lib) => check(c, lib.bio), tip: (c, unit, lib) => tip(c, lib.bio)
    });
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcBioPage;
})(typeof window !== 'undefined' ? window : this);
