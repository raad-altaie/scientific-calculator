// The solver of the instant answers, as its panel works them out: an equation or an inequality of x, which the maths
// of the text reads (reader.js); a derivative, a Taylor series and a differential equation in the text, and an
// integral, a sum or a product of terms and a limit marked as maths; a loan, a rate compounded, a change of a price,
// and two or three equations together, 2x + y = 5, x − y = 1. Put into the pages while it is turned on (background.js)
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    const { read, tidy, shown, grouped, pretty, exactText, sub, readable, bound } = Reader;

    // the kinds a card of the solver works out, by the card
    const CARD = { integral: 'integral', series: 'sum', product: 'product', limit: 'limit', derivative: 'derivative', taylor: 'taylor', ode: 'ode' };

    // ---------------- calculus ---------------- //

    // A derivative, d/dx (x³ – 2x) or the derivative of sin(x): a curve, its slope, to draw; at a point,
    // d/dx x³ at x = 2, its value there, in its card. A Taylor or Maclaurin series of a function, about a
    // point, to an order. A differential equation, y′ = x + y with y(0) = 1, and where it starts
    const D_HEAD = /(?:the\s+)?(?:derivative\s+of\s+|d\s*\/\s*dx\s*)/iy;
    const T_HEAD = /(taylor|maclaurin)\s+(?:series|expansion|polynomial)\s+(?:of|for)\s+(?:f\s*\(\s*x\s*\)\s*=\s*)?/iy;
    const POINT = '(-?\\d+(?:\\.\\d+)?|-?π|-?pi)(?![\\p{L}\\p{N}])';
    const D_AT = new RegExp('\\s*,?\\s*(?:at|when|for|where)\\s+x\\s*=\\s*' + POINT, 'iuy');
    const T_ABOUT = new RegExp('\\s*,?\\s*(?:about|at|around|near|cent(?:er|re)d\\s+at)\\s+(?:x\\s*=\\s*)?' + POINT, 'iuy');
    const T_ORDER = /\s*,?\s*(?:(?:up\s+)?to\s+(?:order|degree|power)\s+|(?:of\s+)?(?:order|degree)\s+)(\d{1,2})(?![\p{L}\p{N}])/iuy;
    const ODE = /(?:y\s*['′’]|dy\s*\/\s*dx)\s*=\s*((?:[-+−–(\dxy.\s×*·⋅/^²³)]|sin|cos|tan|exp|ln|log|sqrt|e(?![a-z]))+?)\s*(?:,|;|\bwith\b|\band\b|\bgiven\b|\bwhere\b|\bif\b)\s*(?:(?:with|and|given|where)\s+)?y\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)\s*=\s*(-?\d+(?:\.\d+)?)(?![\p{L}\p{N}])/iuy;

    const atPoint = (re, s, i) => {
        re.lastIndex = i;
        return re.exec(s);
    };

    function readCalculus(s, i) {
        let m;
        if ((m = atPoint(D_HEAD, s, i))) {
            const c = read(s, i + m[0].length, true, true);
            if (!c) return null;
            const f = tidy(c.text), at = atPoint(D_AT, s, c.to);
            if (at) {
                const x = at[1].replace(/pi/i, 'π');
                return { from: i, to: c.to + at[0].length, kind: 'derivative', trig: c.trig, fields: { f: f, x: x }, text: 'd/dx ' + f + ' at x = ' + x, left: '' };
            }
            // its slope, a curve of graph.js
            const slope = tidy('d/dx(' + f + ')');
            return { from: i, to: c.to, kind: 'graph', trig: c.trig, fields: { f: slope }, text: slope, shown: slope.replace('d/dx', 'd/dx '), left: '' };
        }
        if ((m = atPoint(T_HEAD, s, i))) {
            const c = read(s, i + m[0].length, true, true);
            if (!c) return null;
            let to = c.to, a = '0', n = '7', k;
            if ((k = atPoint(T_ABOUT, s, to))) {
                a = k[1].replace(/pi/i, 'π');
                to += k[0].length;
            }
            if ((k = atPoint(T_ORDER, s, to)) && +k[1] <= 12) {
                n = k[1];
                to += k[0].length;
            }
            const f = tidy(c.text);
            return { from: i, to: to, kind: 'taylor', trig: c.trig, fields: { f: f, a: a, n: n }, text: 'Taylor series of ' + f + ' about ' + a, left: '' };
        }
        if ((m = atPoint(ODE, s, i))) {
            const f = tidy(m[1].replace(/[−–]/g, '-').replace(/[·⋅*]/g, '×').replace(/²/g, '^2').replace(/³/g, '^3'));
            if (!/[xy]/.test(f) || (f.match(/\(/g) || []).length !== (f.match(/\)/g) || []).length) return null;
            const x0 = m[2], y0 = m[3];
            return { from: i, to: i + m[0].length, kind: 'ode', trig: /sin|cos|tan/.test(f), fields: { f: f, x0: x0, y0: y0, x: String(+x0 + 1) },
                text: 'y′ = ' + f + ', y(' + x0 + ') = ' + y0, left: '' };
        }
        return null;
    }

    // ∫, Σ, Π or lim, with their ends and what follows them: the cards of the solver that work them out
    function bigOf(op, below, above, body) {
        const inf = (v) => tidy(v).replace(/∞/g, 'inf'); // as the solver's boxes take it
        const ends = (v) => v.replace(/inf/g, '∞');
        if (op === '∫') { // ∫₀¹ x² dx
            const m = /^(.*?)\s*×?\s*d\s*×?\s*x$/.exec(body);
            if (!m || !m[1].trim() || !below || !above) return null;
            const f = tidy(m[1]), a = inf(below), b = inf(above);
            return { kind: 'integral', fields: { f: f, a: a, b: b }, text: '∫ ' + f + ' dx from ' + ends(a) + ' to ' + ends(b) };
        }
        if (op === 'lim') { // lim x→0 sin(x)/x
            const m = /^x\s*→\s*(.+)$/.exec(below);
            if (!m || above || !body) return null;
            const f = tidy(body), a = inf(m[1]);
            return { kind: 'limit', fields: { f: f, a: a }, text: 'lim x → ' + ends(a) + ' of ' + f };
        }
        const m = /^([nkij])\s*=\s*(.+)$/.exec(below); // Σ k² for k = 1 to 10, of n, k, i or j
        if (!m || !above || !body) return null;
        const f = tidy(body), a = tidy(m[2]), b = inf(above);
        return { kind: op === '∑' ? 'series' : 'product', v: m[1], fields: { f: f, a: a, b: b },
            text: (op === '∑' ? 'Σ ' : 'Π ') + f + ', ' + m[1] + ' from ' + a + ' to ' + ends(b) };
    }

    // ---------------- money ---------------- //

    // a number as a text writes it: 12, 1,234.5, –3, .5; and its value
    const NUM = '[-−–]?(?:\\d{1,3}(?:,\\d{3})+(?!\\d)|\\d+)(?:\\.\\d+)?|[-−–]?\\.\\d+';
    const valueOf = (text) => +String(text).replace(/[,\s$€£¥]/g, '').replace(/[−–]/, '-');
    const NOT_AFTER = '(?![\\p{L}\\p{N}_]|[.,]\\d)';
    const money = (v) => (v < 0 ? '–' : '') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const AMOUNT = '([$€£¥]\\s?)?(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d+)?\\s?(k|thousand|m|mn|million)?(?![\\p{L}\\p{N}])';
    const amountOf = (sign, whole, part, times) => {
        const v = +(whole.replace(/,/g, '') + (part || ''));
        return v * (!times ? 1 : /^k|^thousand/i.test(times) ? 1e3 : 1e6);
    };
    const RATE = '(\\d{1,2}(?:\\.\\d+)?)\\s?(?:%|percent|per\\s?cent)';
    const PERIODS = { daily: 365, weekly: 52, monthly: 12, quarterly: 4, 'semi-annually': 2, semiannually: 2, 'twice a year': 2, 'half-yearly': 2, annually: 1, yearly: 1, continuously: Infinity };

    // A loan or a mortgage, of an amount, at a rate a year, for years, in one sentence: its payment each month.
    // A rate compounded, 6% compounded monthly: the rate it is in a year. A change of an amount, rose from
    // $120 to $150, or from $120 to $150: by how much
    function findMoney(s) {
        const out = [];
        let m;
        const LOAN = /\b(loan|mortgage|car loan|home loan)s?\b/gi;
        while ((m = LOAN.exec(s))) {
            // its sentence, as far as 90 characters either way
            let a = m.index, b = m.index + m[0].length;
            const left = s.slice(Math.max(0, a - 90), a), right = s.slice(b, b + 120);
            const start = a - left.length + Math.max(left.lastIndexOf('. '), left.lastIndexOf('? '), left.lastIndexOf('! ')) + 1;
            const end = b + (/[.?!](\s|$)/.exec(right)?.index ?? right.length);
            const part = s.slice(start, end);
            const amount = new RegExp('(?<![\\p{L}\\p{N}.,])' + AMOUNT, 'giu'), rate = new RegExp('(?<![\\p{L}\\p{N}.,])' + RATE, 'giu');
            const years = /(?<![\p{L}\p{N}.,])(\d{1,2})(?:\s?-?\s?|\s)(?:years?|yrs?|yr)\b/giu;
            let x, cash = null, r = null, n = null;
            while ((x = amount.exec(part))) {
                const v = amountOf(x[1], x[2], x[3], x[4]);
                if ((x[1] || x[4] || v >= 1000) && !/^\s?(?:%|percent|years?|yrs?|-year|months?)/i.test(part.slice(x.index + x[0].length))) {
                    cash = { v: v, from: x.index, to: x.index + x[0].length };
                    break;
                }
            }
            if ((x = rate.exec(part))) r = { v: +x[1], from: x.index, to: x.index + x[0].length };
            if ((x = years.exec(part))) n = { v: +x[1], from: x.index, to: x.index + x[0].length };
            if (!cash || !r || !n || !(n.v > 0 && n.v <= 50)) continue;
            const from = start + Math.min(cash.from, r.from, n.from, a - start), to = start + Math.max(cash.to, r.to, n.to, b - start);
            out.push({ from: from, to: to, kind: 'loan', panel: 'solve', card: 'schedule', text: s.slice(from, to),
                fields: { loan: String(cash.v), rate: String(r.v), years: String(n.v), py: '12' } });
            LOAN.lastIndex = Math.max(LOAN.lastIndex, end);
        }

        const COMPOUND = new RegExp('(?<![\\p{L}\\p{N}.,])' + RATE + '[^.%\\d]{0,40}?\\bcompounded\\s+(daily|weekly|monthly|quarterly|semi-?annually|twice a year|half-yearly|annually|yearly|continuously)\\b', 'giu');
        while ((m = COMPOUND.exec(s))) {
            const periods = PERIODS[m[2].toLowerCase().replace('semi annually', 'semiannually')];
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'rates', panel: 'solve', card: 'rates', text: m[0],
                fields: { apr: m[1], m: periods === Infinity ? 'inf' : String(periods) } });
        }

        // from $120 to $150; with a word of change before it, from 120 to 150 and from 3% to 5% as well
        const CHANGE = new RegExp('(?:\\b(rose|rise[sn]?|risen|increased?|increases|grew|grow[sn]?|went up|goes up|go up|climbed|jumped|fell|fall[sn]?|fallen|dropped|drops?|declined?|went down|goes down|decreased?|decreases|cut|raised?|changed?|changes|moved?|up|down)\\b[^.\\d$€£¥]{0,30}?)?' +
            '\\bfrom\\s+([$€£¥]\\s?)?(' + NUM + ')\\s?(%|percent)?\\s+to\\s+([$€£¥]\\s?)?(' + NUM + ')\\s?(%|percent)?' + NOT_AFTER, 'giu');
        while ((m = CHANGE.exec(s))) {
            const cash = m[2] && m[5], words = !!m[1];
            if (!cash && !words) continue;
            if (!!m[4] !== !!m[7]) continue; // from 5% to 10 people
            const a = valueOf(m[3]), b = valueOf(m[6]);
            if (!isFinite(a) || !isFinite(b) || a === b) continue;
            const from = m.index + (m[1] ? 0 : m[0].indexOf('from'));
            out.push({ from: from, to: m.index + m[0].length, kind: 'change', panel: 'solve', card: 'change', text: s.slice(from, m.index + m[0].length),
                fields: { a: String(a), b: String(b) }, points: !!m[4] });
        }
        return out;
    }

    // ---------------- equations together ---------------- //

    // An equation of x, y and z: numbers, the letters alone, and + – × ÷ ^ and brackets; on a side each, with =
    const SIDE = '[-−–+(]?\\s*(?:\\d[\\d.]*|\\.\\d|[xyz])[\\dxyz.()+\\-−–×*·⋅/^²³ ]*';
    const EQUATION = new RegExp('(?<![\\p{L}\\p{N}_.^])' + SIDE + '=\\s*' + SIDE, 'gu');
    const BETWEEN = /^\s*(?:,|;|,?\s*and|&)\s*$/i;

    // its text for the calculator, its sides trimmed: 2x + y = 5
    function cleanEquation(t) {
        let e = t.replace(/[−–]/g, '-').replace(/[·⋅*]/g, '×').replace(/²/g, '^2').replace(/³/g, '^3').replace(/\s+/g, ' ').trim();
        while (/[-+×/^( ]$/.test(e)) e = e.slice(0, -1).trim();
        const open = (e.match(/\(/g) || []).length, close = (e.match(/\)/g) || []).length;
        return open === close && /^[^=]+=[^=]+$/.test(e) && /[xyz]/.test(e) ? e : null;
    }

    // Two or three equations in a line, 2x + y = 5, x − y = 1, or with and between: of x and y, or x, y and z
    function findSystems(s) {
        const out = [], eqs = [];
        let m;
        EQUATION.lastIndex = 0;
        while ((m = EQUATION.exec(s))) {
            let text = m[0];
            const stop = /\.(?!\d)/.exec(text); // the end of a sentence, not a decimal point: read on after it
            if (stop) {
                text = text.slice(0, stop.index);
                EQUATION.lastIndex = m.index + stop.index + 1;
            }
            const trail = /[-−–+×*·⋅/^(\s]+$/.exec(text);
            if (trail) text = text.slice(0, trail.index);
            const to = m.index + text.length;
            if (/^[\p{L}\p{N}_]/u.test(s.slice(to, to + 1))) continue;
            const e = cleanEquation(text);
            if (e) eqs.push({ from: m.index, to: to, e: e });
        }
        for (let i = 0; i < eqs.length;) {
            let j = i;
            while (j + 1 < eqs.length && j - i < 2 && BETWEEN.test(s.slice(eqs[j].to, eqs[j + 1].from))) j++;
            const group = eqs.slice(i, j + 1);
            const letters = new Set(group.map((q) => q.e.match(/[xyz]/g).join('')).join(''));
            const two = group.length === 2 && letters.size === 2 && letters.has('x') && letters.has('y');
            const three = group.length === 3 && letters.size === 3;
            // x = 5, y = 3: the answer already; y = 5, y = x: a letter named, nothing to solve
            const solved = group.every((q) => /^[xyz] = (?:-?[\d.]+|[xyz])$/.test(q.e));
            if ((two || three) && !solved) {
                out.push({ from: group[0].from, to: group[group.length - 1].to, kind: 'system', panel: 'solve', card: two ? 'system2' : 'system3',
                    text: group.map((q) => q.e).join(', '), eqs: group.map((q) => q.e), fields: {} });
            }
            i = j + 1;
        }
        return out;
    }

    // The boxes of the card of equations together: their numbers a, b, c and d, of each linear one, read as
    // the left side less the right at x, y and z of 0 and 1, and checked elsewhere; else, of two of x and y,
    // the card of two curves. evaluate: a calculation to a number, or null
    function systemCard(c, evaluate) {
        const n = c.eqs.length, names = ['x', 'y', 'z'].slice(0, n);
        const at = (e, values) => {
            const [l, r] = e.split('=').map((side) => side.replace(/(?<![A-Za-z])([xyz])(?![A-Za-z])/g, (k) => '(' + (values[k] || 0) + ')'));
            const v = evaluate('(' + l + ')-(' + r + ')');
            return v === null || !isFinite(v) ? NaN : v;
        };
        const rows = c.eqs.map((e) => {
            const f0 = at(e, {});
            const coefs = names.map((k) => at(e, { [k]: 1 }) - f0);
            const linear = [{ x: 2, y: -3, z: 5 }, { x: -1.5, y: 0.5, z: 7 }].every((p) => {
                const want = f0 + names.reduce((sum, k, i) => sum + coefs[i] * p[k], 0);
                return Math.abs(at(e, p) - want) <= 1e-9 * Math.max(1, Math.abs(want));
            });
            return linear && isFinite(f0) && coefs.every(isFinite) ? coefs.concat([-f0]) : null;
        });
        if (rows.every(Boolean)) {
            const fields = {};
            rows.forEach((r, i) => r.forEach((v, j) => {
                fields['abcd'.charAt(j) + (i + 1)] = String(+v.toPrecision(12));
            }));
            return { card: n === 2 ? 'system2' : 'system3', fields: fields, rows: rows };
        }
        return n === 2 ? { card: 'curves', fields: { e1: c.eqs[0], e2: c.eqs[1] } } : null;
    }

    // ---------------- in the text ---------------- //

    // the loans, rates, changes and equations together of a text; each reader only where the text has what it needs
    function find(s) {
        if (!/\d/.test(s)) return [];
        return [].concat(/loan|mortgage|compounded|from/i.test(s) ? findMoney(s) : [], s.includes('=') ? findSystems(s) : []);
    }

    // A line marked as maths: ∫, Σ, Π or lim with what follows them; or equations together, of cases, the whole
    // line, or with its answer after it
    function formal(t) {
        const { MAT, BIG, SEP, END } = Reader;
        if (t.includes(MAT) || t.length > 300) return null;
        const big = new RegExp('^' + BIG + '(∫|∑|∏|lim)' + SEP + '([^' + SEP + ']*)' + SEP + '([^' + END + ']*)' + END + '(.*)$').exec(t);
        if (big) {
            const c = bigOf(big[1], big[2].trim(), big[3].trim(), big[4].trim());
            if (!c || /[\u0001-\u0004]/.test(Object.values(c.fields).join(''))) return null;
            return Object.assign(c, { from: 0, to: t.length, left: c.text, trig: /sin|cos|tan/.test(c.fields.f) });
        }
        if (t.includes(BIG) || t.includes('_')) return null;
        const pick = find(t).filter((c) => c.kind === 'system' && !c.from && /^\s*(?:=\s*[-\d.,\s]*)?$/.test(t.slice(c.to)))[0];
        return pick ? Object.assign(pick, { from: 0, to: t.length, left: '', trig: false }) : null;
    }

    // ---------------- worked out ---------------- //

    // ∫, Σ, Π and lim: a function the solver reads, of x, or of its n, k, i or j, and ends that are numbers or ∞
    function calculable(c, unit, E) {
        try {
            const g = E.graph(c.fields.f, false, {});
            if (!g || g.letters.some((letter) => letter !== c.v)) return false;
            return (c.kind === 'limit' ? [c.fields.a] : [c.fields.a, c.fields.b]).every((end) => !isNaN(bound(end, unit, E)));
        } catch (e) {
            return false;
        }
    }

    // What is found is one the solver works out: an equation it reads; a derivative or a series of a function it
    // reads, at a point; ∫, Σ, Π and lim. What the text has whole, a loan or a differential equation, its tip works out
    function check(c, unit, lib) {
        const E = lib.engine;
        if (c.panel || c.kind === 'ode') return true;
        if (c.kind === 'derivative' || c.kind === 'taylor') return readable(c.fields.f + '=0', E) && !isNaN(bound(c.kind === 'taylor' ? c.fields.a : c.fields.x, unit, E));
        if (CARD[c.kind]) return calculable(c, unit, E);
        return readable(c.text, E);
    }

    // A Taylor series written out, x – x³/6 + x⁵/120 + …, of (x – a) about a; a coefficient a fraction where it is one
    function seriesText(coefs, a, E) {
        const v = a === '0' ? 'x' : '(x ' + (a[0] === '-' ? '+ ' + a.slice(1) : '– ' + a) + ')';
        const terms = [];
        coefs.forEach((k, n) => {
            if (Math.abs(k) < 1e-12) return;
            const f = E.fraction(Math.abs(k)), [p, q] = f && f[1] <= 1e6 ? f : [shown(Math.abs(k)), 1];
            const power = n === 0 ? '' : n === 1 ? v : v + [...String(n)].map((d) => Reader.SUPER_OF[d]).join('');
            // 1, x, 2x³, x³/6, 3x²/4
            const body = n === 0 ? p + (q === 1 ? '' : '/' + q) : (String(p) === '1' ? '' : p) + power + (q === 1 ? '' : '/' + q);
            terms.push([k < 0, body]);
        });
        if (!terms.length) return '0';
        return terms.map(([minus, body], i) => (i ? (minus ? ' – ' : ' + ') : minus ? '–' : '') + body).join('') + ' + …';
    }

    // ∫ f(x) dx, Σ and Π of f(n), lim f(x), as the cards of the solver work them out: the value, and its exact
    // form where it has one; of a limit that differs from below and above, both
    function calculus(c, unit, lib) {
        const f = c.fields, M = lib.maths, E = lib.engine, exact = (v) => M.exactOf(v, 1e-9, 'constants', 0, () => true);
        const end = (text) => bound(text, unit, E);
        if (c.kind === 'derivative') { // its value, slope and the slope of that at x, as the card has them
            const curve = M.fn(f.f, false), x = end(f.x);
            if (!curve) return null;
            const slopes = M.slopes(curve, x, unit), at = 'x = ' + f.x.replace('-', '–');
            return { title: 'd/dx ' + pretty(f.f) + ' at ' + at, lines: ['f′ = ' + shown(slopes[0])], rows: [['f', shown(curve.at(x, unit, true))], ['f″', shown(slopes[1])]],
                more: 'Click to open it in Derivative, with its tangent.' };
        }
        if (c.kind === 'taylor') {
            const r = M.taylor(f.f, false, unit, end(f.a), +f.n);
            if (r.error || !r.coefs) return null;
            return { title: 'Taylor series of ' + pretty(f.f) + (f.a === '0' ? '' : ' about ' + f.a.replace('-', '–')), lines: [seriesText(r.coefs, f.a, E)],
                note: 'To the power ' + f.n + '.', more: 'Click to open it in Taylor series, with each coefficient.' };
        }
        if (c.kind === 'ode') {
            const r = M.ode(f.f, false, unit, +f.x0, +f.y0, +f.x);
            if (r.error) return null;
            return { title: 'y′ = ' + pretty(f.f) + ', y(' + f.x0 + ') = ' + f.y0, lines: [isNaN(r.y) ? 'No value on the way' : 'y(' + f.x + ') ≈ ' + shown(r.y)],
                rows: isNaN(r.y) ? [] : [['y′(' + f.x + ')', shown(r.slope)]], note: 'By the steps of Runge and Kutta.', more: 'Click to open it in Differential equation, to choose x.' };
        }
        const said = (v, form) => (!isFinite(v) && !Number.isNaN(v) ? '= ' + shown(v) : isNaN(v) ? 'No value' :
            '= ' + (form && exactText(form) !== shown(v) ? exactText(form) + ' ≈ ' : '') + shown(v));
        if (c.kind === 'series' || c.kind === 'product') {
            const r = M.series(f.f, false, unit, end(f.a), end(f.b), c.kind === 'product');
            return r.error ? null : { lines: [said(r.value, r.exact)] };
        }
        const curve = M.fn(f.f, false);
        if (!curve) return null;
        if (c.kind === 'integral') {
            const v = M.integral(curve, end(f.a), end(f.b), unit);
            return { lines: [said(v, isFinite(v) ? exact(v) : null)], note: isNaN(v) ? 'It has no value on the way, or does not settle.' : '' };
        }
        const r = M.limit(curve, end(f.a), unit);
        if (!isNaN(r.value)) return { lines: [said(r.value)] };
        return { lines: ['From below ' + (isNaN(r.left) ? 'none' : shown(r.left)), 'From above ' + (isNaN(r.right) ? 'none' : shown(r.right))],
            note: 'The two sides differ: it has no limit there.' };
    }

    // x = 2, or x₁ = 2 and x₂ = 3, each with its exact form if it has one: (1 + √5)/2 ≈ 1.618…
    function roots(r, v) {
        const x = v || 'x';
        if (!r || r.error) return null;
        if (!r.roots.length) return { lines: ['No root found'] };
        const many = r.roots.length > 6;
        const lines = r.roots.slice(0, 6).map((root, i) => {
            const exact = r.exact && r.exact[i] && exactText(r.exact[i]);
            return x + (r.roots.length > 1 ? sub(i + 1) : '') + ' = ' + (exact && exact !== shown(root) ? exact + ' ≈ ' : '') + shown(root);
        });
        return {
            lines: lines,
            note: r.more ? 'The ' + r.roots.length + ' roots nearest 0 of many: the calculator shows them all.' :
                many ? 'And ' + (r.roots.length - 6) + ' more: the calculator shows them all.' : ''
        };
    }

    // where an inequality holds: x < –2 or x > 2
    function holds(r, v) {
        const x = v || 'x';
        if (!r || r.error) return null;
        if (!r.parts.length) return { lines: ['It holds for no ' + x] };
        return {
            lines: r.parts.map((p) => {
                if (p.from === p.to) return x + ' = ' + shown(p.from);
                if (p.from === -Infinity && p.to === Infinity) return 'Every ' + x;
                if (p.from === -Infinity) return x + ' ' + (p.toIn ? '≤' : '<') + ' ' + shown(p.to);
                if (p.to === Infinity) return x + ' ' + (p.fromIn ? '≥' : '>') + ' ' + shown(p.from);
                return shown(p.from) + ' ' + (p.fromIn ? '≤' : '<') + ' ' + x + ' ' + (p.toIn ? '≤' : '<') + ' ' + shown(p.to);
            }).map((line, i) => (i ? 'or ' : '') + line)
        };
    }

    // What the tip of each says. Of equations together, their card is found here
    function tip(c, unit, lib) {
        const f = c.fields, M = lib.maths;
        switch (c.kind) {
            case 'equation':
                return roots(M.solve(c.text, false, unit, NaN, NaN, true), c.v);
            case 'inequality':
                return holds(M.inequality(c.text, false, unit, NaN, NaN), c.v);
            case 'loan': {
                const r = M.amortize(+f.loan, +f.rate, +f.years, 12, 1);
                if (r.error) return null;
                return {
                    title: grouped(+f.loan) + ' at ' + f.rate + '% for ' + f.years + ' years',
                    lines: [money(r.payment) + ' a month'],
                    rows: [['Payments', String(r.n)], ['Total interest', money(r.interest)], ['Total paid', money(+f.loan + r.interest)]],
                    note: 'Each at the end of its month.', more: 'Click to open it in the loan calculator, with its table.'
                };
            }
            case 'rates': {
                const m = f.m === 'inf' ? Infinity : +f.m, apy = M.effectiveRate(+f.apr, m);
                return { title: f.apr + '% compounded ' + (m === Infinity ? 'continuously' : m + ' times a year'), lines: ['= ' + grouped(+apy.toPrecision(8)) + '% a year (APY)'],
                    more: 'Click to open it in Interest rates.' };
            }
            case 'change': {
                const r = M.percentChange(+f.a, +f.b), sign = (v) => (v > 0 ? '+' : '') + grouped(v);
                return {
                    title: grouped(+f.a) + ' → ' + grouped(+f.b),
                    lines: [sign(+(r.percent.toPrecision(10))) + '%'],
                    rows: [[c.points ? 'Points' : 'Change', sign(r.change)], ['To ÷ From', grouped(r.ratio)]],
                    more: 'Click to open it in Percentage change.'
                };
            }
            case 'system': {
                const card = systemCard(c, (text) => Reader.workOut(text, unit, lib.engine));
                if (!card) return null;
                c.card = card.card;
                c.fields = card.fields;
                const say = (name, v) => name + ' = ' + grouped(v);
                let lines;
                if (card.rows) {
                    const r = M.linear(card.rows);
                    lines = !r ? ['–'] : r.none ? ['No answer: they cannot all hold'] : r.many ? ['Many answers'] : r.x.map((v, i) => say('xyz'[i], v));
                } else {
                    const r = M.system2([c.eqs[0], c.eqs[1]], false, unit, true);
                    lines = r.error ? ['–'] : r.many ? ['Many answers, along a curve'] : !r.points.length ? ['No point found where both hold'] :
                        r.points.slice(0, 4).map((p) => '(' + grouped(p.x) + ', ' + grouped(p.y) + ')');
                }
                return { title: c.eqs.join(',  ').replace(/-/g, '–'), lines: lines,
                    more: 'Click to open it in ' + { system2: 'Two equations', system3: 'Three equations', curves: 'Two curves' }[card.card] + '.' };
            }
        }
        return CARD[c.kind] ? calculus(c, unit, lib) : null;
    }

    const CalcPageSolve = {
        name: 'solve',
        kinds: ['equation', 'inequality', 'integral', 'series', 'product', 'limit', 'derivative', 'taylor', 'ode', 'loan', 'rates', 'change', 'system'],
        find: find, tier: 1, at: readCalculus, formal: formal, check: check, tip: tip, systemCard: systemCard
    };
    Reader.add(CalcPageSolve);
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPageSolve;
})(typeof window !== 'undefined' ? window : this);
