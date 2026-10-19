// The formulas and constants of the instant answers. A formula of the f(x) panel, E = mc² or written ρ = \frac{m}{V}:
// its letters have no values, so it is not worked out; its icon tells what it is, and opens it in the panel, its
// letters in boxes. And a constant, by its name in the text: speed of light, Planck's constant. ../formulas.js has
// them, and comes into the page before it. Put into the pages while it is turned on (background.js)
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    const Data = root.CalcFormulas || (typeof require === 'function' ? require('../formulas.js') : null);
    const { tidy, SUPER_OF } = Reader;

    // a formula as the panel writes it, its fractions (calc-fr), roots (calc-root), powers and indices,
    // as a line: E = mc<sup>2</sup> is E = mc^(2)
    function lineOfHtml(html) {
        const tokens = String(html).match(/<[^>]+>|[^<]+/g) || [];
        let k = 0;
        const parts = (close) => {
            const out = [];
            while (k < tokens.length) {
                const t = tokens[k++];
                if (t === close) return out;
                if (t[0] !== '<') {
                    out.push({ text: t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') });
                    continue;
                }
                const m = /^<(span|sup|sub)(?:\s+class="([^"]*)")?>$/.exec(t);
                if (m) out.push({ tag: m[1], cls: m[2] || '', kids: parts('</' + m[1] + '>') });
            }
            return out;
        };
        const line = (list) => list.map((p) => {
            if (p.text !== undefined) return p.text;
            const spans = p.kids.filter((q) => q.tag);
            if (p.cls === 'calc-fr' && spans.length === 2) return '((' + line(spans[0].kids) + ')/(' + line(spans[1].kids) + '))';
            if (p.cls === 'calc-root') return '√(' + line(p.kids) + ')';
            if (p.tag === 'sup') return '^(' + line(p.kids) + ')';
            if (p.tag === 'sub') return '_(' + line(p.kids) + ')';
            return line(p.kids);
        }).join('');
        return line(parts());
    }

    // A formula reduced to one way of writing it, so a page's and the panel's meet: no spaces, no ×
    // between letters, ² as ^2, ½ as 1/2, brackets round a letter or a number alone gone
    function canon(line) {
        let t = String(line)
            .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^(' + [...m].map((ch) => (ch === '⁻' ? '-' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch))).join('') + ')')
            .replace(/½/g, '(1/2)').replace(/⅓/g, '(1/3)').replace(/¼/g, '(1/4)')
            .replace(/[−–]/g, '-').replace(/[×·⋅*]/g, ' ');
        let was;
        do {
            was = t;
            t = tidy(t).replace(/\((\d+)\/(\d+)\)/g, '$1/$2').replace(/_\(([^()]+)\)/g, '_$1');
        } while (t !== was);
        return t.replace(/\s+/g, '');
    }

    // other ways the formulas are written
    const FORMULA_ALIASES = {
        'Ideal gas law': ['PV = nRT'], 'Pythagorean theorem': ['a² + b² = c²'], 'Kinetic energy': ['KE = ½mv²', 'K = ½mv²'],
        "Ohm's law": ['V = RI', 'U = RI'], 'Speed': ['v = d/t', 's = d/t'], 'Density': ['ρ = m/V'], 'Pressure': ['P = F/A', 'p = F/A'],
        'Wave speed': ['v = λf', 'c = fλ', 'c = λf'], 'Photon energy': ['E = hν'], 'Potential energy': ['PE = mgh', 'U = mgh'],
        'Weight': ['F = mg'], 'Power': ['P = W/t'], 'Electric power': ['P = IV'], 'Charge': ['Q = I t'],
        'Area of a circle': ['A = πr²'], 'Circumference of a circle': ['C = 2πr', 'C = πd']
    };
    // and the constants, by their other names; some are words of their own, not taken
    const CONSTANT_ALIASES = {
        'Planck constant': ["Planck's constant"], 'Reduced Planck constant': ["reduced Planck's constant", 'Dirac constant'],
        'Avogadro constant': ["Avogadro's number", "Avogadro's constant", 'Avogadro number'], 'Boltzmann constant': ["Boltzmann's constant"],
        'Gravitational constant': ['Newtonian constant of gravitation', 'constant of gravitation'], 'Speed of light': ['speed of light in vacuum'],
        'Electron mass': ['mass of the electron', 'mass of an electron'], 'Proton mass': ['mass of the proton', 'mass of a proton'],
        'Neutron mass': ['mass of the neutron', 'mass of a neutron'], 'Standard gravity': ['acceleration due to gravity', 'standard acceleration of gravity'],
        "Wien's constant": ["Wien's displacement constant"], 'Coulomb constant': ["Coulomb's constant"], 'Faraday constant': ["Faraday's constant"],
        'Rydberg constant': ["Rydberg's constant"], 'Vacuum permittivity': ['permittivity of free space'], 'Vacuum permeability': ['permeability of free space']
    };
    const NOT_CONSTANTS = new Set(['Pi', 'Bar', '0 °C in kelvin', 'Day on Mars', 'Square root of 2', 'Square root of 3', 'Natural log of 2', 'Natural log of 10']);
    const nameKey = (name) => name.toLowerCase().replace(/[’`]/g, "'").replace(/[\s\-–]+/g, ' ');
    const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

    // A formula of letters, as the text writes it: E = mc² as E=mc^2 or E = m·c², with spaces or none
    function plainPattern(key) {
        let re = '', last = '';
        for (let k = 0; k < key.length; k++) {
            const ch = key[k];
            const power = ch === '^' && /^\^(-?\d+|[a-zA-Z]+)/.exec(key.slice(k));
            if (power) {
                const sup = [...power[1]].map((c) => SUPER_OF[c] || '').join('');
                re += '(?:\\s*\\^\\s*\\(?' + escape(power[1]) + '\\)?' + (sup.length === power[1].length ? '|' + sup : '') + ')';
                k += power[0].length - 1;
                last = 'x';
                continue;
            }
            const half = /^(1\/2|1\/3|1\/4)/.exec(key.slice(k));
            if (half && !last) {
                re += '(?:' + { '1/2': '½', '1/3': '⅓', '1/4': '¼' }[half[1]] + '|' + half[1][0] + '\\s*/\\s*' + half[1][2] + ')';
                k += 2;
                last = 'x';
                continue;
            }
            if ('=+-/'.includes(ch)) {
                re += '\\s*' + (ch === '-' ? '[-−–]' : escape(ch)) + '\\s*';
                last = '';
                continue;
            }
            if (last) re += '\\s*[×·⋅*]?\\s*';
            re += escape(ch);
            last = ch;
        }
        return new RegExp('(?<![\\p{L}\\p{N}_^])' + re + '(?![\\p{L}\\p{N}_⁰¹²³⁴⁵⁶⁷⁸⁹^])', 'gu');
    }

    // What the text is searched for: each formula by its one way of writing it, those of letters alone by
    // a pattern as well, and the names of the constants, the longest first: reduced Planck before Planck
    function namedIndex(data) {
        const formulas = new Map(), simple = [], names = new Map();
        data.formulas.forEach((group) => group.list.forEach((item) => {
            [lineOfHtml(item.f)].concat(FORMULA_ALIASES[item.t] || []).forEach((line) => {
                const key = canon(line);
                if (!formulas.has(key)) formulas.set(key, item);
                if (/^[\p{L}\d=+\-^π/]+$/u.test(key) && key.length >= 4 && /^[^=]+=[^=]+$/.test(key) && !simple.some((p) => p.key === key)) {
                    simple.push({ key: key, re: plainPattern(key), item: item });
                }
            });
        }));
        data.constants.forEach((group) => group.list.forEach((item) => {
            if (NOT_CONSTANTS.has(item.t)) return;
            [item.t].concat(CONSTANT_ALIASES[item.t] || []).forEach((name) => names.set(nameKey(name), item));
        }));
        const words = [...names.keys()].sort((a, b) => b.length - a.length)
            .map((name) => escape(name).replace(/'/g, "['’]").replace(/ /g, '[\\s\\-–]+'));
        return { formulas: formulas, simple: simple, names: names, constants: new RegExp('(?<![\\p{L}\\p{N}])(' + words.join('|') + ')(?![\\p{L}\\p{N}])', 'giu') };
    }

    // The formulas and constants of a text: [{ from, to, kind 'formula' or 'constant', name, text, fields }]; of
    // two that overlap, the first and longest. fields: the name the panel opens it by
    function findNamed(s, index) {
        const out = [];
        let m;
        if (!index) return out;
        if (s.includes('=')) {
            index.simple.forEach((p) => {
                p.re.lastIndex = 0;
                while ((m = p.re.exec(s))) out.push({ from: m.index, to: m.index + m[0].length, kind: 'formula', name: p.item.t, text: m[0], fields: { name: p.item.t } });
            });
        }
        index.constants.lastIndex = 0;
        while ((m = index.constants.exec(s))) {
            const item = index.names.get(nameKey(m[1]));
            if (item) out.push({ from: m.index, to: m.index + m[0].length, kind: 'constant', name: item.t, text: m[0], fields: { name: item.t } });
        }
        out.sort((a, b) => a.from - b.from || b.to - a.to);
        return out.filter((n, k) => !out.slice(0, k).some((o) => o.from < n.to && n.from < o.to));
    }

    // a formula marked as maths, TeX or MathML, that is one of the panel's
    function formulaOf(line, index) {
        const t = String(line).replace(/\s+/g, ' ').trim();
        const item = index && !t.includes(Reader.BAD) && !t.includes(Reader.BIG) && index.formulas.get(canon(t));
        return item ? { from: 0, to: t.length, kind: 'formula', name: item.t, text: tidy(t), left: tidy(t), trig: false, fields: { name: item.t } } : null;
    }

    // of the formulas of ../formulas.js, made the first time it is asked for
    let index = null;
    const indexed = () => index || (index = Data ? namedIndex(Data) : null);

    // ---------------- the tips ---------------- //

    // the formulas' and the constants' own markup as text: m<sub>e</sub> as mₑ, s<sup>2</sup> as s², a fraction as a/b
    const SUB_OF = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ',
        h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ', i: 'ᵢ', r: 'ᵣ', '+': '₊', '-': '₋', '−': '₋' };
    function plain(html) {
        const each = (text, map) => [...text].map((ch) => map[ch] || ch).join('');
        return lineOfHtml(html).replace(/\^\(([^()]*)\)/g, (m, t) => ([...t].every((ch) => SUPER_OF[ch]) ? each(t, SUPER_OF) : '^' + t))
            .replace(/_\(([^()]*)\)/g, (m, t) => each(t, SUB_OF)).replace(/\(\(([^()]+)\)\/\(([^()]+)\)\)/g, (m, a, b) =>
                (/^\w+$/.test(a) ? a : '(' + a + ')') + '/' + (/^\w+$/.test(b) ? b : '(' + b + ')'));
    }

    const itemOf = (list, name) => {
        for (const group of list) for (const item of group.list) if (item.t === name) return item;
        return null;
    };
    const each10 = (n) => [...String(n)].map((ch) => SUPER_OF[ch]).join('');

    // A formula's name, as it is written, what it gives, and its letters. A constant's symbol = its value and unit,
    // 6.674 × 10⁻¹¹ m³/(kg·s²), and what it is
    function tip(c) {
        if (c.kind === 'formula') {
            const f = itemOf(Data.formulas, c.name);
            return f && { title: f.t, lines: [plain(f.f)], note: plain(f.d), rows: f.v.map((v) => [plain(v[1]), v[2]]),
                more: 'Click to open it in the formulas, its letters to fill in.' };
        }
        const k = itemOf(Data.constants, c.name);
        if (!k) return null;
        const parts = (+k.v.toPrecision(12)).toExponential().split('e'), a = Math.abs(k.v);
        const value = a >= (k.v % 1 ? 1e6 : 1e12) || a < 1e-3 ? parts[0] + ' × 10' + each10(+parts[1]) : String(+k.v.toPrecision(12));
        return { title: k.t, lines: [plain(k.s) + ' = ' + value.replace(/-/g, '−') + (k.u ? ' ' + plain(k.u) : '')], note: plain(k.d),
            more: 'Click to open it in the constants.' };
    }

    // what needs no engine: a formula or a constant is only told of
    const CalcPageFormulas = {
        name: 'formulas', kinds: ['formula', 'constant'], needs: null, uses: null,
        find: (s) => findNamed(s, indexed()), tier: 3, formalLast: (line) => formulaOf(line, indexed()), tip: tip,
        lineOfHtml: lineOfHtml, canon: canon, namedIndex: namedIndex, findNamed: findNamed, formulaOf: formulaOf
    };
    Reader.add(CalcPageFormulas);
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPageFormulas;
})(typeof window !== 'undefined' ? window : this);
