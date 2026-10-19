// What of a page's text is chemistry, as the Chemistry panel works it out (chem.js): a reaction, 2H2 + O2 → 2H2O,
// balanced; a formula, H2SO4 or CuSO4·5H2O, its molar mass and name; a composition, 40% C, 6.7% H and 53.3% O, its
// empirical formula; a compound by its name, sodium chloride or sulfuric acid, its formula; and an element named with
// its symbol, iron (Fe). Selected as well, any of them alone, and an element by its name or its symbol. Each is
// { from, to, kind, text, panel: 'chem', card, fields }, as the other features have them: where it is in the text, the card of the
// panel that opens with it and what goes in its boxes. The text is read here without chem.js, which is large; check
// makes sure of each with it, once background.js has put it in the page, and tipOf says what its tip shows. Put into the
// pages while the chemistry of the instant answers is turned on. Read here, in the browser; it works in Node as well,
// for the tests
(function (root) {
    'use strict';

    // the elements by their symbols and their names, in the order of the table
    const SYMBOLS = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo ' +
        'Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn ' +
        'Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' ');
    const NAMES = ('hydrogen helium lithium beryllium boron carbon nitrogen oxygen fluorine neon sodium magnesium aluminium silicon ' +
        'phosphorus sulfur chlorine argon potassium calcium scandium titanium vanadium chromium manganese iron cobalt nickel copper zinc ' +
        'gallium germanium arsenic selenium bromine krypton rubidium strontium yttrium zirconium niobium molybdenum technetium ruthenium ' +
        'rhodium palladium silver cadmium indium tin antimony tellurium iodine xenon caesium barium lanthanum cerium praseodymium ' +
        'neodymium promethium samarium europium gadolinium terbium dysprosium holmium erbium thulium ytterbium lutetium hafnium tantalum ' +
        'tungsten rhenium osmium iridium platinum gold mercury thallium lead bismuth polonium astatine radon francium radium actinium ' +
        'thorium protactinium uranium neptunium plutonium americium curium berkelium californium einsteinium fermium mendelevium ' +
        'nobelium lawrencium rutherfordium dubnium seaborgium bohrium hassium meitnerium darmstadtium roentgenium copernicium nihonium ' +
        'flerovium moscovium livermorium tennessine oganesson').split(' ');
    const SYMBOL = new Set(SYMBOLS);
    const BY_NAME = new Map(NAMES.map((name, i) => [name, SYMBOLS[i]]).concat([['aluminum', 'Al'], ['cesium', 'Cs'], ['sulphur', 'S']]));
    const ALL_NAMES = [...BY_NAME.keys()].sort((a, b) => b.length - a.length).join('|');
    // a name as a text writes it, iron or Iron
    const NAME = '(?:' + [...BY_NAME.keys()].sort((a, b) => b.length - a.length).map((n) => '[' + n[0] + n[0].toUpperCase() + ']' + n.slice(1)).join('|') + ')';

    const SUBS = '₀₁₂₃₄₅₆₇₈₉', SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

    // ---------------- formulas ---------------- //

    // A formula as a page writes it: its numbers small, H₂O, from a <sub> too, or not, H2O; brackets, Ca(OH)2 and
    // K4[Fe(CN)6]; the water of a hydrate, CuSO4·5H2O; and a charge, ^2+, ²⁺, or ^(2+) as answers.js reads a <sup>
    const N = '[\\d₀-₉]*';
    const PART = '[A-Z][a-z]?' + N;
    const BODY = '(?:' + PART + '|[(\\[](?:' + PART + '|\\((?:' + PART + ')+\\)' + N + ')+[)\\]]' + N + ')+';
    const HYDRATE = '(?:\\s?[·•∙⋅]\\s?\\d*' + BODY + ')?';
    const CHARGE = '(?:\\^\\(?\\d*[+\\-−–]\\d*\\)?|[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻])';
    // not in a word, a number, an address or a code, H2O.com, COVID-19
    const NOT_BEFORE = '(?<![\\p{L}\\p{N}_\\-−–/.@#&$\'’^])';
    const NOT_AFTER = '(?![\\p{L}\\p{N}_]|[-−–]\\d|[.,:/][\\p{L}\\p{N}])';
    const COMPOUND = new RegExp(NOT_BEFORE + BODY + HYDRATE + CHARGE + '?' + NOT_AFTER, 'gu');

    // codes and names that read as formulas: a console, a web standard, a cell line, a pathway of organic chemistry
    const NOT_FORMULAS = new Set(['PS2', 'PS3', 'PS4', 'PS5', 'W3C', 'Y2K', 'B2B', 'B2C', 'C2B', 'C2C', 'C3PO', 'NaN', 'HeLa', 'CoP', 'CoC', 'PoC',
        'SN1', 'SN2', 'BaSIC']);
    // of capitals and one number at the end, as so many codes are, PS5, SN2: these alone
    const CAPS_FORMULAS = new Set(['CO2', 'SO2', 'SO3', 'NO2', 'NH3', 'CH4', 'PH3', 'SF6', 'BF3', 'NF3', 'PF3', 'PF5', 'SF4', 'CF4', 'CO', 'NO', 'HF', 'HI', 'HCN']);

    // a formula as chem.js reads it: its numbers as digits, its charge after ^, a dot of a hydrate ·, and − as -
    function plainFormula(t) {
        return String(t).replace(/[₀-₉]/g, (d) => SUBS.indexOf(d))
            .replace(/\^\((\d*[+\-−–]\d*)\)/, '^$1')
            .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])/, (m, d, sign) => '^' + [...d].map((x) => SUPS.indexOf(x)).join('') + (sign === '⁺' ? '+' : '-'))
            .replace(/[−–]/g, '-').replace(/\s*[·•∙⋅]\s*/g, '·').replace(/\s+/g, '');
    }

    // its symbols, each an element; null if one is not
    function symbolsOf(t) {
        const list = String(t).replace(/\((?:aq|s|l|g)\)$/, '').match(/[A-Z][a-z]?/g) || [];
        return list.every((s) => SYMBOL.has(s)) ? list : null;
    }

    // A formula of a page: of two elements or more, and a number in it, a symbol of two letters, NaCl, or brackets;
    // not a code. alone, selected: of any element, as KOH and O2; the card says what it is
    function formulaLooks(raw, alone) {
        const f = plainFormula(raw), bare = f.replace(/\^.*$|[+-]+$/, '');
        const symbols = symbolsOf(bare);
        if (!symbols || f.length > 60 || NOT_FORMULAS.has(bare)) return false;
        if (/(?:[A-Za-z)\]])1(?!\d)/.test(bare)) return false; // H1N1: a count of 1 is not written
        if (alone) return !/^[A-Z]+$/.test(bare) || CAPS_FORMULAS.has(bare) || symbols.length > 1;
        const kinds = new Set(symbols).size;
        if (kinds < 2) return false;
        if (/^[A-Z]+\d?$/.test(bare) && f === bare) return CAPS_FORMULAS.has(bare); // KOH, CNN, PS5, SN2: words and codes as often; SO4^2- an ion
        return /\d|[a-z]|[(\[]/.test(bare) || f !== bare;
    }

    function findCompounds(s, alone) {
        const out = [];
        let m;
        COMPOUND.lastIndex = 0;
        while ((m = COMPOUND.exec(s))) {
            if (!formulaLooks(m[0], alone)) continue;
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'compound', panel: 'chem', card: 'molar', text: m[0], fields: { f: plainFormula(m[0]) } });
        }
        return out;
    }

    // ---------------- reactions ---------------- //

    // A formula of a reaction, its number before it, 2H2O, and its state after it, (aq); or an electron, e⁻. A charge
    // with no ^ as well, Na+ + Cl−, before a + or the arrow
    const BARE = '(?:\\d?[+\\-−](?=\\s+(?:[+=→⟶⇌⇄↔]|<?[=\\-]+>)|\\s*$))';
    const SPECIES = '(?:\\d+\\s?)?(?:e[-−⁻]|' + BODY + HYDRATE + '(?:' + CHARGE + '|' + BARE + ')?)(?:\\s?\\((?:aq|s|l|g)\\))?';
    const ARROW = '(?:→|⟶|⇌|⇄|↔|<=+>|<-+>|=+>|-+>|=)';
    const SIDE = SPECIES + '(?:\\s*\\+\\s*' + SPECIES + ')*';
    const REACTION = new RegExp(NOT_BEFORE + '(' + SIDE + ')\\s*(' + ARROW + ')\\s*(' + SIDE + ')' + NOT_AFTER, 'gu');
    // + between formulas has spaces round it, or none, H2+O2; Na+ + Cl− has its charges
    const PLUS = /\s+\+\s+|(?<=[A-Za-z0-9₀-₉)\]])\+(?=[A-Z0-9(\[])/;

    // its formulas, as chem.js reads them, with the numbers before them; null if one is not of elements
    function speciesOf(side) {
        const list = side.trim().split(PLUS).map((t) => t.trim());
        return list.every((t) => /^\d*\s?e[-−⁻]$/.test(t) || symbolsOf(plainFormula(t).replace(/^\d+/, '').replace(/\^.*$|[+-]+$/, ''))) ? list : null;
    }

    // Two sides with an arrow between, or =: not letters alone, as C → D of a song, nor of = alone, K = C + 273
    function findReactions(s) {
        const out = [];
        let m;
        REACTION.lastIndex = 0;
        while ((m = REACTION.exec(s))) {
            const left = speciesOf(m[1]), right = speciesOf(m[3]);
            if (!left || !right) continue;
            const all = left.concat(right), numbered = all.some((t) => /[\d₀-₉]/.test(t));
            if (m[2] === '=' && !numbered) continue;
            if (all.length < 3 && all.every((t) => /^[A-Z][a-z]?$/.test(t))) continue;
            const eq = left.map(plainFormula).join(' + ') + ' → ' + right.map(plainFormula).join(' + ');
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'reaction', panel: 'chem', card: 'balance', text: m[0], fields: { eq: eq } });
        }
        return out;
    }

    // ---------------- compositions ---------------- //

    // 40% C, 6.7% H and 53.3% O; C 40%, H 6.7%; 40% carbon, carbon: 40%. Two elements or more, together near 100%
    const ITEM = new RegExp('(?<![\\p{L}\\p{N}.,])(?:(\\d{1,3}(?:\\.\\d+)?)\\s?%\\s*(?:of\\s+)?(' + NAME + '|[A-Z][a-z]?)|(' + NAME + '|[A-Z][a-z]?)\\s*[:=]?\\s*(\\d{1,3}(?:\\.\\d+)?)\\s?%)(?![\\p{L}\\p{N}])', 'gu');
    const BETWEEN = /^\s*(?:[,;]\s*(?:and\s+)?|and\s+)$/;

    function findCompositions(s) {
        const out = [], items = [];
        let m;
        ITEM.lastIndex = 0;
        while ((m = ITEM.exec(s))) {
            const word = m[2] || m[3], s1 = SYMBOL.has(word) ? word : BY_NAME.get(word.toLowerCase());
            if (s1) items.push({ from: m.index, to: m.index + m[0].length, s: s1, v: +(m[1] || m[4]) });
        }
        for (let i = 0; i < items.length;) {
            let j = i;
            while (j + 1 < items.length && BETWEEN.test(s.slice(items[j].to, items[j + 1].from))) j++;
            const group = items.slice(i, j + 1), total = group.reduce((t, it) => t + it.v, 0);
            if (group.length >= 2 && new Set(group.map((it) => it.s)).size === group.length && total >= 95 && total <= 105) {
                out.push({ from: group[0].from, to: group[group.length - 1].to, kind: 'composition', panel: 'chem', card: 'empirical', text: s.slice(group[0].from, group[group.length - 1].to),
                    fields: { c: group.map((it) => it.s + ' ' + it.v).join(', ') } });
            }
            i = j + 1;
        }
        return out;
    }

    // ---------------- names ---------------- //

    // The name of a compound: its cation, an element or ammonium, a metal's charge in Roman numerals, then its anion,
    // sodium chloride, iron(III) oxide, ammonium nitrate; two nonmetals with Greek prefixes, dinitrogen tetroxide; and
    // the acids. Water, ammonia and the other names that are words as well only selected
    const ANIONS = 'hydroxide|oxide|peroxide|chloride|bromide|iodide|fluoride|sulfide|sulphide|disulfide|nitride|phosphide|carbide|hydride|boride|' +
        'silicide|arsenide|selenide|telluride|cyanide|nitrate|nitrite|sulfate|sulphate|bisulfate|sulfite|sulphite|carbonate|bicarbonate|phosphate|' +
        'acetate|ethanoate|permanganate|chromate|dichromate|hypochlorite|chlorite|chlorate|perchlorate|thiocyanate|oxalate|thiosulfate|silicate|borate';
    const PREFIX = '(?:mono?|di|tri|tetra?|penta?|hexa?|hepta?|octa?|nona?|deca?)';
    const ACIDS = 'hydrochloric|hydrobromic|hydroiodic|hydrofluoric|hydrocyanic|sulfuric|sulfurous|nitric|nitrous|phosphoric|carbonic|acetic|ethanoic|' +
        'formic|methanoic|perchloric|chloric|chlorous|hypochlorous|oxalic|chromic|permanganic|boric|silicic|thiosulfuric';
    const COMMON = new Set(['water', 'ammonia', 'methane', 'ethane', 'propane', 'butane', 'octane', 'ethene', 'ethylene', 'ethyne', 'acetylene', 'benzene',
        'methanol', 'ethanol', 'glucose', 'sucrose', 'ozone', 'hydrazine', 'phosphine', 'silane', 'magnetite', 'pyrite', 'hydrogen peroxide']);
    const COMPOUND_NAME = new RegExp('(?<![\\p{L}\\p{N}])(?:(?:' + PREFIX + '?(?:' + ALL_NAMES + ')|ammonium)(?:\\s?\\((?:[ivx]+|[1-8]\\+?)\\))?\\s+(?:(?:di)?hydrogen\\s+)?' +
        PREFIX + '?(?:' + ANIONS + ')(?:\\s+' + PREFIX + '?-?hydrate)?|(?:' + ACIDS + ')\\s+acid)(?![\\p{L}\\p{N}])', 'giu');

    function findNames(s) {
        const out = [];
        let m;
        COMPOUND_NAME.lastIndex = 0;
        while ((m = COMPOUND_NAME.exec(s))) {
            const name = m[0].replace(/\s+/g, ' ');
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'chemname', panel: 'chem', card: 'names', text: m[0], fields: { f: name } });
        }
        return out;
    }

    // ---------------- elements ---------------- //

    // An element named with its symbol, iron (Fe) or Fe (iron); or as an element, the element carbon, element Fe
    const PAIR = new RegExp('(?<![\\p{L}\\p{N}])(?:(' + NAME + ')\\s*\\(\\s*([A-Z][a-z]?)\\s*\\)|([A-Z][a-z]?)\\s*\\(\\s*(' + NAME + ')\\s*\\))', 'gu');
    const AN_ELEMENT = new RegExp('(?<![\\p{L}\\p{N}])[Ee]lement\\s+(' + NAME + '|[A-Z][a-z])(?![\\p{L}\\p{N}])', 'gu');

    function element(s, from, to, text) {
        return { from: from, to: to, kind: 'element', panel: 'chem', card: 'element', text: text, fields: { s: s } };
    }

    function findElements(s) {
        const out = [];
        let m;
        PAIR.lastIndex = 0;
        while ((m = PAIR.exec(s))) {
            const name = (m[1] || m[4]).toLowerCase(), symbol = m[2] || m[3];
            if (BY_NAME.get(name) === symbol) out.push(element(symbol, m.index, m.index + m[0].length, m[0]));
        }
        AN_ELEMENT.lastIndex = 0;
        while ((m = AN_ELEMENT.exec(s))) {
            const symbol = SYMBOL.has(m[1]) ? m[1] : BY_NAME.get(m[1].toLowerCase());
            if (symbol) out.push(element(symbol, m.index, m.index + m[0].length, m[0]));
        }
        return out;
    }

    // ---------------- in the text ---------------- //

    // All of these in a text, the first and longest of two that overlap: a reaction before its formulas. Each
    // reader only where the text has what it needs
    function find(s) {
        const all = [].concat(/[→⟶⇌⇄↔=>]/.test(s) ? findReactions(s) : [], /[A-Z][a-z]?(?:[\d₀-₉(\[]|[A-Z])/.test(s) ? findCompounds(s, false) : [],
            s.includes('%') ? findCompositions(s) : [], /(?:ide|ate|ite|acid)\b/i.test(s) ? findNames(s) : [], /\(|element/i.test(s) ? findElements(s) : []);
        all.sort((a, b) => a.from - b.from || b.to - a.to);
        const kept = [];
        all.forEach((c) => {
            if (!kept.some((o) => o.from < c.to && c.from < o.to)) kept.push(c);
        });
        return kept;
    }

    // Text selected that is one of these alone, or an element by its symbol or name, Fe, iron, or a compound by a name
    // of its own, water. Null for none
    function picked(text) {
        const t = String(text).replace(/\s+/g, ' ').trim(), low = t.toLowerCase();
        if (!t || t.length > 200) return null;
        if (SYMBOL.has(t) || BY_NAME.has(low)) return element(SYMBOL.has(t) ? t : BY_NAME.get(low), 0, t.length, t);
        if (COMMON.has(low)) return { from: 0, to: t.length, kind: 'chemname', panel: 'chem', card: 'names', text: t, fields: { f: t } };
        const whole = (list) => list.filter((c) => !c.from && c.to === t.length)[0] || null;
        return whole(/[→⟶⇌⇄↔=>]/.test(t) ? findReactions(t) : []) || whole(findCompounds(t, true)) || whole(findCompositions(t)) ||
            whole(findNames(t)) || whole(findElements(t));
    }

    // ---------------- worked out by chem.js ---------------- //

    // Each found is made sure of with chem.js, Chem: a reaction it balances; a formula it reads and names, of the
    // usual charges of its metal, or one of carbon and hydrogen, a hydrate or one with brackets; a composition and a
    // name it reads. Not of an element with no stable isotope, as PoS is no polonium sulfide
    function check(c, Chem) {
        if (!Chem) return false;
        try {
            const f = c.fields;
            switch (c.kind) {
                case 'reaction':
                    return !Chem.balance(f.eq).error;
                case 'compound': {
                    const m = Chem.molarMass(f.f);
                    if (m.error || m.electron || Object.keys(m.atoms).some((s) => Chem.bySymbol[s].unstable)) return false;
                    const n = Chem.names(f.f), cation = n.salt && n.salt.cation;
                    // of capitals alone, selected: a salt or an acid, KOH, HCN; CNN is no carbon dinitride
                    if (/^[A-Z]+$/.test(f.f) && !CAPS_FORMULAS.has(f.f) && (n.error || !/^(Ionic|Acid|Common name)$/.test(n.kind))) return false;
                    if (!n.error) {
                        if (!cation || cation.poly || cation.base === 'H') return true;
                        return (' ' + Chem.bySymbol[cation.base].ox.replace(/−/g, '-') + ' ').includes(' +' + cation.charge + ' '); // HoF: no holmium(I)
                    }
                    const raw = f.f.replace(/\^.*$/, '');
                    return (m.atoms.C && m.atoms.H && /\d/.test(raw)) || (/[(\[]/.test(raw) && /\d/.test(raw)) || /·/.test(raw);
                }
                case 'composition': {
                    const e = Chem.empirical(f.c, false);
                    return !e.error && e.parts.length >= 2;
                }
                case 'chemname': {
                    const n = Chem.names(f.f);
                    return !n.error && n.from === 'name';
                }
                case 'element':
                    return !!Chem.bySymbol[f.s];
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    // a number for a tip: up to 12 digits, – for minus
    const shown = (v, digits) => (+v.toPrecision(digits || 12)).toLocaleString('en-US', { maximumFractionDigits: 12 }).replace('-', '–');
    const grams = (v) => (+v.toFixed(3)).toLocaleString('en-US', { maximumFractionDigits: 3 });
    // a reaction as written, each formula with its numbers small
    const written = (eq, Chem) => eq.split(' → ').map((side) => side.split(' + ').map((t) => {
        const m = /^(\d*)(.*)$/.exec(t);
        return m[1] + Chem.plain(m[2]);
    }).join(' + ')).join(' → ');

    // What the tip of each says: { title, lines, rows, note, more }, as answers.js shows them. Chem: chem.js
    function tipOf(c, Chem) {
        const f = c.fields;
        switch (c.kind) {
            case 'reaction': {
                const b = Chem.balance(f.eq);
                if (b.error) return null;
                const asWritten = b.left.concat(b.right).every((x, i) => {
                    const t = f.eq.split(/ → | \+ /)[i], k = /^\d+/.exec(t);
                    return (k ? +k[0] : 1) === x.k;
                });
                const rows = b.kind ? [['Kind', b.kind]] : [];
                if (b.redox) {
                    b.redox.oxidized.forEach((o) => rows.push(['Oxidized', o.s + ' ' + o.from + ' → ' + o.to]));
                    b.redox.reduced.forEach((o) => rows.push(['Reduced', o.s + ' ' + o.from + ' → ' + o.to]));
                }
                return { title: written(f.eq, Chem), lines: [b.text], rows: rows,
                    note: asWritten ? 'Balanced as it is written.' : b.many ? 'It balances more than one way; this is the simplest.' : '',
                    more: 'Click to open it in Balance an equation.' };
            }
            case 'compound': {
                const m = Chem.molarMass(f.f), n = Chem.names(f.f), ox = Chem.oxidation(f.f), sol = Chem.solubility(f.f), rows = [];
                // its oxidation numbers, unless one is a fraction, an average, as of the carbon of caffeine
                const oxShown = !ox.error && ox.rows.length <= 6 && !ox.average.length;
                if (m.error) return null;
                if (!n.error) rows.push(['Name', n.name + (n.acid ? '; in water, ' + n.acid.toLowerCase() : '')]);
                if (!n.error && n.kind !== 'Common name') rows.push(['Kind', n.kind]);
                if (oxShown) rows.push(['Oxidation numbers', ox.rows.map((r) => r.s + ' ' + r.text + (r.in ? ' in ' + r.in : '')).join(', ')]);
                if (!sol.error) rows.push(['In water', sol.word]);
                if (m.parts.length > 1 && m.parts.length <= 6) rows.push(['By mass', m.parts.map((p) => p.s + ' ' + shown(p.percent, 3) + '%').join(', ')]);
                return { title: Chem.plain(f.f), lines: [grams(m.mass) + ' g/mol'], rows: rows,
                    note: m.unstable ? 'Of an element with no stable isotope: its mass number.' : oxShown && ox.guessed ? 'Its oxidation numbers are one way they add up.' : '',
                    more: 'Click to open it in Molar mass.' };
            }
            case 'composition': {
                const e = Chem.empirical(f.c, false);
                if (e.error) return null;
                return { title: f.c.split(', ').map((p) => p + '%').join(', '), lines: [e.plain],
                    rows: [['Molar mass', grams(e.M) + ' g/mol'], ['Moles, to the least', e.parts.map((p, i) => p.s + ' ' + shown(e.ratio[i], 3)).join(' : ')]],
                    note: 'The simplest formula; with its molar mass, the card gives the molecular formula.', more: 'Click to open it in Empirical formula.' };
            }
            case 'chemname': {
                const n = Chem.names(f.f);
                if (n.error) return null;
                const m = Chem.molarMass(n.formula), rows = [['Molar mass', grams(m.mass) + ' g/mol'], ['Kind', n.kind]];
                if (n.acid) rows.push(['In water', n.acid]);
                return { title: n.name, lines: [Chem.plain(n.formula)], rows: rows, more: 'Click to open it in Names and formulas.' };
            }
            case 'element': {
                const e = Chem.bySymbol[f.s];
                if (!e) return null;
                return {
                    title: e.name + ' (' + e.s + ')',
                    lines: [(e.unstable ? '[' + e.mass + ']' : grams(e.mass)) + ' g/mol'],
                    rows: [['Atomic number', String(e.z)], ['Group, period', (e.group || '–') + ', ' + e.period], ['Configuration', e.config],
                        ['Electronegativity', e.en === null ? '–' : String(e.en)], ['Oxidation states', e.ox || '–']],
                    note: e.unstable ? 'No stable isotope: the mass number of its longest-lived.' : '',
                    more: 'Click to open it in the periodic table.'
                };
            }
        }
        return null;
    }

    const CalcChemPage = { find: find, picked: picked, check: check, tipOf: tipOf, plainFormula: plainFormula };
    root.CalcChemPage = CalcChemPage;

    // A feature of the instant answers (reader.js): read before all else, in the line with the digits of its <sub>,
    // so 2H2 + O2 → 2H2O is no sum; selected, after the maths, as a sum is no formula. chem.js comes into the page
    // before its icons go in
    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    Reader.add({
        name: 'chemistry', kinds: ['compound', 'reaction', 'composition', 'chemname', 'element'], needs: 'chem', uses: 'chem',
        find: (s, order, raw) => find(raw), tier: 0, pickedLast: picked,
        check: (c, unit, lib) => check(c, lib.chem), tip: (c, unit, lib) => tipOf(c, lib.chem)
    });
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcChemPage;
})(typeof window !== 'undefined' ? window : this);
