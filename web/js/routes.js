// The addresses of the calculator: one for each tool, each of its tabs, each card, each element of the periodic table
// and each group of units, as physics/motion/projectile. The website has a page at each, made by scripts/pages.js, and
// goes there with the History API (web/js/app.js); in the extension they follow the # of a window, popup.html?panel=phys#/physics/motion
// (popup.js). main.js goes to the one asked for and tells the page which one is shown (calc-goto, calc-route).
// The words are English in every language, as an address is the same for everyone
(function (root) {
    'use strict';

    // Each tool by its key in main.js (GO), its word in the address and its name; its tabs the same, the first the one it
    // opens on. A word other than the tab's own where that reads better in an address: solve/equations, not solve/solve
    var TOOLS = [
        { go: 'fx', path: 'formulas', t: 'Formulas', tabs: [['formulas', 'formulas', 'Formulas'], ['constants', 'constants', 'Constants']] },
        { go: 'conv', path: 'converter', t: 'Converter', tabs: [['units', 'units', 'Units'], ['dates', 'dates', 'Dates']] },
        { go: 'graph', path: 'graph', t: 'Graph', tabs: [['graph', 'graph', 'Graph'], ['table', 'table', 'Table'], ['examples', 'examples', 'Examples']] },
        { go: 'numbers', path: 'numbers', t: 'Numbers', tabs: [['matrix', 'matrix', 'Matrix'], ['complex', 'complex', 'Complex'], ['whole', 'integer', 'Integer'], ['computer', 'computer', 'Computer']] },
        { go: 'solve', path: 'solve', t: 'Solve', tabs: [['solve', 'equations', 'Solve'], ['calculus', 'calculus', 'Calculus'], ['geometry', 'geometry', 'Geometry'], ['chance', 'probability', 'Probability'], ['finance', 'finance', 'Finance']] },
        { go: 'chem', path: 'chemistry', t: 'Chemistry', tabs: [['table', 'periodic-table', 'Periodic table'], ['mass', 'mass', 'Mass'], ['reactions', 'reactions', 'Reactions'], ['solutions', 'solutions', 'Solutions'], ['ions', 'ions', 'Ions'], ['gases', 'gases', 'Gases']] },
        { go: 'phys', path: 'physics', t: 'Physics', tabs: [['circuits', 'electronics', 'Electronics'], ['motion', 'motion', 'Motion'], ['forces', 'forces', 'Forces'], ['waves', 'waves', 'Waves'], ['matter', 'matter', 'Matter'], ['modern', 'modern', 'Modern']] },
        { go: 'bio', path: 'biology', t: 'Biology', tabs: [['genetics', 'genetics', 'Genetics'], ['dna', 'dna', 'DNA'], ['protein', 'protein', 'Protein'], ['lab', 'lab', 'Lab'], ['cells', 'cells', 'Cells'], ['health', 'health', 'Health'], ['ecology', 'ecology', 'Ecology']] },
        { go: 'stats', path: 'statistics', t: 'Statistics', tabs: [['list', 'list', 'List'], ['pairs', 'pairs', 'Pairs'], ['tests', 'tests', 'Tests']] }
    ];

    // the periodic table opens on iron: the element of the table's own address, and of the tool's
    var ELEMENT_FIRST = 26;

    // What the colours of the periodic table show, its filter, in the order of its buttons (chem-panel.js CHEM_BY): its key,
    // its word in the address and its name, kind first, which the table has at first and the elements' own pages:
    // chemistry/periodic-table/kind/iron, chemistry/periodic-table/electronegativity/gold
    var TABLE_BY = [['cat', 'kind', 'Kind'], ['en', 'electronegativity', 'Electronegativity'], ['block', 'block', 'Block'],
        ['ie', 'ionization-energy', 'Ionization energy'], ['affinity', 'electron-affinity', 'Electron affinity'], ['radius', 'atomic-radius', 'Atomic radius'],
        ['state', 'state', 'State'], ['mp', 'melting-point', 'Melting point'], ['bp', 'boiling-point', 'Boiling point'], ['density', 'density', 'Density'],
        ['mass', 'atomic-mass', 'Atomic mass'], ['year', 'discovered', 'Discovered']];

    // letters of other alphabets in a name, as words
    var GREEK = { 'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'Δ': 'delta', 'ε': 'epsilon', 'θ': 'theta', 'λ': 'lambda', 'μ': 'mu', 'µ': 'mu',
        'π': 'pi', 'ρ': 'rho', 'σ': 'sigma', 'Σ': 'sigma', 'τ': 'tau', 'φ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega', 'Ω': 'ohm' };

    // A name as a word of an address: lowercase letters and digits, a - between words. Its tags go without a space, as
    // T<sub>m</sub> is Tm; χ² is chi-squared, ΔΔCt delta-delta-ct, Hardy–Weinberg hardy-weinberg
    function slug(text) {
        return String(text).replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').replace(/χ²/g, ' chi squared ')
            .replace(/[\u0370-\u03ffµ]/g, function (c) { return ' ' + (GREEK[c] || '') + ' '; })
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '').replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    // Every address there is. cards: of each tool by its key, of each tab by its key, its cards, each { id, t } and its
    // name t in English: { phys: { motion: [{ id: 'projectile', t: 'Projectile' }] } }; the converter's groups of units
    // as the cards of its units tab. elements: [{ z, name }]. Each address { path, go, kind: tool, tab, card, by or element,
    // tab, id, by: the table's filter, t: its name, up: the address it is in, page: false where the website has no page
    // of its own, as an element by a filter other than kind }, by path in byPath; each tool by its key in tools. A tool's
    // own address opens it on its first tab. An element's address without a filter, as before there were, is another
    // name of its address by kind (to). Each card's and element's address by what it is, in byKey (key), for pathOf
    function build(cards, elements) {
        var list = [], byPath = {}, byKey = {}, tools = {};
        function add(r) {
            if (byPath[r.path]) return; // two cards of a tab of the same name: the first has the address
            byPath[r.path] = r;
            list.push(r);
            if ((r.kind === 'card' || (r.kind === 'element' && r.by)) && !byKey[key(r)]) byKey[key(r)] = r;
        }
        TOOLS.forEach(function (tool) {
            tools[tool.go] = tool;
            add({ path: tool.path, go: tool.go, kind: 'tool', tab: tool.tabs[0][0], t: tool.t, up: '' });
            tool.tabs.forEach(function (tab) {
                var at = tool.path + '/' + tab[1], of = (cards[tool.go] || {})[tab[0]] || [];
                add({ path: at, go: tool.go, kind: 'tab', tab: tab[0], t: tab[2], up: tool.path });
                of.forEach(function (card) {
                    var word = slug(card.t);
                    if (word) add({ path: at + '/' + word, go: tool.go, kind: 'card', tab: tab[0], id: card.id, t: card.t, up: at });
                });
                if (tool.go === 'chem' && tab[0] === 'table') {
                    TABLE_BY.forEach(function (by) {
                        add({ path: at + '/' + by[1], go: 'chem', kind: 'by', tab: 'table', by: by[0], t: by[2], up: at });
                        (elements || []).forEach(function (e) {
                            add({ path: at + '/' + by[1] + '/' + slug(e.name), go: 'chem', kind: 'element', tab: 'table', by: by[0], id: e.z, t: e.name, up: at + '/' + by[1], page: by === TABLE_BY[0] });
                        });
                    });
                    (elements || []).forEach(function (e) {
                        add({ path: at + '/' + slug(e.name), go: 'chem', kind: 'element', tab: 'table', id: e.z, t: e.name, to: at + '/' + TABLE_BY[0][1] + '/' + slug(e.name), page: false });
                    });
                }
            });
        });
        return { list: list, byPath: byPath, byKey: byKey, tools: tools };
    }

    // what a card or an element by a filter is, as byKey has it: card/phys/motion/projectile, element/en/79
    function key(r) {
        return r.kind === 'card' ? 'card/' + r.go + '/' + r.tab + '/' + r.id : 'element/' + r.by + '/' + r.id;
    }

    // An address as it is typed or linked: its words lowercase, no / at either end, nor a .html
    function clean(path) {
        var p = String(path || '');
        try {
            p = decodeURIComponent(p);
        } catch (e) { }
        return p.replace(/[?#].*$/, '').replace(/\.html$/i, '').replace(/^\/+|\/+$/g, '').toLowerCase();
    }

    // What an address shows: the address itself, or the nearest it is in, as a card renamed since; null for none of a
    // tool. exact: whether it is the one asked for
    function find(table, path) {
        var p = clean(path), r = null, words = p.split('/'), n, tab;
        if (!p) return { route: null, exact: true };
        for (n = words.length; n && !r; n--) r = table.byPath[words.slice(0, n).join('/')] || null;
        // a tab by its key where its word is another, chemistry/table: what its own address shows, which the page has in its place
        if (r && r.kind === 'tool' && words.length > 1) {
            tab = table.tools[r.go].tabs.filter(function (t) { return t[0] === words[1] && t[1] !== words[1]; })[0];
            if (tab) return { route: find(table, r.path + '/' + tab[1] + (words.length > 2 ? '/' + words.slice(2).join('/') : '')).route, exact: false };
        }
        if (r && r.to) return { route: table.byPath[r.to], exact: false };
        return { route: r, exact: !!r && r.path === p };
    }

    // The address of what is shown, as it is: the tool, its tab, and the card open on it; or on the periodic table, its
    // filter and the element chosen. state: { go, tab, card, by, element }. '' for the calculator itself
    function pathOf(table, state) {
        var tool = state && table.tools[state.go], tab, at, by, r;
        if (!tool) return '';
        tab = tool.tabs.filter(function (t) { return t[0] === state.tab; })[0] || tool.tabs[0];
        at = tool.path + '/' + tab[1];
        if (tool.go === 'chem' && tab[0] === 'table') {
            by = TABLE_BY.filter(function (b) { return b[0] === state.by; })[0] || TABLE_BY[0];
            r = table.byKey[key({ kind: 'element', by: by[0], id: state.element })];
            return r ? r.path : at + '/' + by[1];
        }
        r = state.card && table.byKey[key({ kind: 'card', go: tool.go, tab: tab[0], id: state.card })];
        return r ? r.path : at;
    }

    root.CalcRoutes = { TOOLS: TOOLS, ELEMENT_FIRST: ELEMENT_FIRST, TABLE_BY: TABLE_BY, slug: slug, build: build, clean: clean, find: find, pathOf: pathOf };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcRoutes;
    }
})(typeof window !== 'undefined' ? window : this);
