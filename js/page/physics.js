// The physics of the instant answers, as the Physics panel works it out (physics.js): resistors, capacitors or coils in
// series and in parallel, 100 + 220 || 330 or 4.7 kΩ ∥ 10 kΩ, the value of them all; a resistor's colour code, brown
// black red gold, its resistance, and the code on an SMD resistor, marked 473 or 4R7; and a level in dBm, dBW, dBV, dBmV
// or dBµV, –30 dBm, in watts and volts. Selected as
// well, any of them alone. Each is { from, to, kind, text, panel: 'phys', card, fields }, as the other features have
// them: where it is in the text, the card of the panel that opens with it and what goes in its boxes. The text is read
// here without physics.js; check makes sure of each with it, once background.js has put it in the page, and tip says
// what its tip shows. Put into the pages while the physics of the instant answers is turned on. Read here, in the
// browser; it works in Node as well, for the tests
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    const { grouped } = Reader;

    // a value with its prefix and unit, as the cards show it, – for minus as the tips have it
    const si = (P, x, unit) => P.si(x, unit).replace('−', '–');

    // ---------------- series and parallel ---------------- //

    // A part's value as it is written: 100, 4.7k, 4k7, 470R, 2R2, 1M; with its unit, 4.7 kΩ, 100 nF, 10 mH, 100 ohms.
    // Not of a word after it, 100 Hz
    const UNIT = '(?:Ω|ohms?|F|H)';
    const VALUE = '\\d+(?:\\.\\d+)?(?:[pnuµμmkKMGR]\\d+|\\s?[pnuµμmkKMG]?' + UNIT + '|[pnuµμmkKMGR])?(?![\\p{L}\\p{N}])';
    const TERM = '(?:\\(\\s*)*' + VALUE + '(?:\\s*\\))*';
    const OP = '\\s*(?:\\+|\\|\\||∥|‖)\\s*';
    const NETWORK = new RegExp('(?<![\\p{L}\\p{N}_.,/|+])' + TERM + '(?:' + OP + TERM + ')+', 'gu');
    const PARALLEL = /\|\||∥|‖/;
    // the kinds of part, as the card has them: resistors, capacitors and coils, by their units
    const PARTS = ['Resistors', 'Capacitors', 'Coils'];
    // what says a line is of parts, so its bare numbers, 100 + 220 || 330, are; else 1 || 2 is of logic
    const OF_PARTS = /resist|capacit|induct|Ω|\bohms?\b|\bnetwork|\bin (?:series|parallel)\b/i;

    // its brackets: those round it that are not of it left out, as (see 1k || 2k); null where they do not pair
    function bracketed(text) {
        let t = text, depth = 0;
        while (/^\(/.test(t) && (t.match(/\(/g) || []).length > (t.match(/\)/g) || []).length) t = t.slice(1).trimStart();
        while (/\)$/.test(t) && (t.match(/\)/g) || []).length > (t.match(/\(/g) || []).length) t = t.slice(0, -1).trimEnd();
        for (const ch of t) {
            depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
            if (depth < 0) return null;
        }
        return depth ? null : t;
    }

    // sure: in a line of parts, or selected, where bare numbers are resistors
    function findNetworks(s, sure) {
        const out = [];
        let m;
        NETWORK.lastIndex = 0;
        while ((m = NETWORK.exec(s))) {
            const t = bracketed(m[0]);
            if (!t || !PARALLEL.test(t)) continue;
            // of one kind of part, by its units; of none, by their prefixes, 4k7 and 2R2 resistors, 100n and 10p
            // capacitors; of neither, resistors where the line is of parts
            const units = new Set((t.match(new RegExp('(?<=[\\d\\spnuµμmkKMG])' + UNIT + '(?![\\p{L}\\p{N}])', 'gu')) || []).map((u) => /^[Ωo]/.test(u) ? 0 : u === 'F' ? 1 : 2));
            if (!units.size) {
                const prefixes = t.match(new RegExp('(?<=\\d)[pnuµμkKMGR](?![\\p{L}])', 'gu')) || [];
                prefixes.forEach((x) => units.add(/[pnuµμ]/.test(x) ? 1 : 0));
                if (!units.size && !/(?<=\d)m/.test(t) && !sure) continue;
            }
            if (units.size > 1) continue;
            const part = units.size ? [...units][0] : 0;
            // the parts as the card's box takes them: 4.7 kΩ as 4.7k, || between, + with spaces
            const n = t.replace(new RegExp('(\\d)\\s+(?=[pnuµμmkKMG]?' + UNIT + '(?![\\p{L}\\p{N}]))', 'gu'), '$1')
                .replace(new RegExp(UNIT + '(?![\\p{L}\\p{N}])', 'gu'), '').replace(/\s*(?:\|\||∥|‖)\s*/g, ' || ').replace(/\s*\+\s*/g, ' + ')
                .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/µ|μ/g, 'µ');
            const from = m.index + m[0].indexOf(t);
            out.push({ from: from, to: from + t.length, kind: 'network', panel: 'phys', card: 'network', text: t, fields: { part: String(part), n: n } });
        }
        return out;
    }

    // ---------------- the colour code ---------------- //

    // the colours of the bands, by their place in physics.js's COLOURS
    const COLOURS = { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, purple: 7, grey: 8, gray: 8, white: 9, gold: 10, silver: 11 };
    const NONE = 12; // no band, of tolerance: a resistor of three bands
    // the colours each kind of band may be, as physics.js's BAND_COLOURS: to read which end is first, here without it;
    // the boxes of the card are of physics.js's own, in check
    const MAY = { digit: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], mult: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], tol: [1, 2, 5, 6, 7, 8, 10, 11, 12], temp: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
    const KINDS = { 3: ['digit', 'digit', 'mult'], 4: ['digit', 'digit', 'mult', 'tol'], 5: ['digit', 'digit', 'digit', 'mult', 'tol'], 6: ['digit', 'digit', 'digit', 'mult', 'tol', 'temp'] };
    const WORD = '(?:black|brown|red|orange|yellow|green|blue|violet|purple|gr[ae]y|white|gold|silver)';
    const BANDS = new RegExp('(?<![\\p{L}\\p{N}])' + WORD + '(?:(?:\\s*[-–—,/·•]\\s*|\\s+)(?:and\\s+)?' + WORD + '){2,5}(?![\\p{L}\\p{N}])', 'giu');
    const ANY_COLOUR = new RegExp(WORD, 'i');
    // what says a line is of resistors: a list of colours alone is as often of a flag or a rainbow
    const RESISTOR = /resist|\bbands?\b|colou?r[- ]?cod|Ω|\bohms?\b/i;

    // bands that read as a resistor's: each of a colour its kind may be, its first not black, as none is made
    const readable = (list) => list[0] !== 0 && list.every((b, i) => MAY[KINDS[list.length][i]].includes(b));

    function bandsOf(text, sure) {
        const list = text.toLowerCase().match(new RegExp(WORD, 'g')).map((w) => COLOURS[w]);
        // as written, or from its other end, the end its bands are nearer
        const back = !readable(list) && readable(list.slice().reverse());
        const bands = back ? list.slice().reverse() : list;
        if (!readable(bands)) return null;
        // in a line of no resistor, only four bands that end as most do, in gold or silver
        if (!sure && !(bands.length === 4 && bands[3] >= 10)) return null;
        const all = bands.length === 3 ? bands.concat(NONE) : bands;
        return { bands: all, back: back, fields: { find: '0', n: String(all.length - 4) } };
    }

    function findBands(s, sure) {
        const out = [];
        let m;
        BANDS.lastIndex = 0;
        while ((m = BANDS.exec(s))) {
            const r = bandsOf(m[0], sure);
            if (r) out.push({ from: m.index, to: m.index + m[0].length, kind: 'bands', panel: 'phys', card: 'colours', text: m[0], bands: r.bands, back: r.back, fields: r.fields });
        }
        return out;
    }

    // ---------------- decibels ---------------- //

    // A level, –30 dBm, 20 dBV: its unit by its place in physics.js's LEVELS. Not dB alone, of sound or a gain, nor the end
    // of a range, 10–30 dBm
    const LEVEL = /(?<![\p{L}\p{N}_.,]|\p{N}\s?[-−–—~]\s?)([-−–+]?)(\d+(?:\.\d+)?)\s?(dBmV|dB[µμu]V|dBm|dBW|dBV)(?![\p{L}\p{N}])/gu;
    const LEVELS = { dBm: 0, dBW: 1, dBV: 3, dBmV: 4, 'dBµV': 5 };

    function findLevels(s) {
        const out = [];
        let m;
        LEVEL.lastIndex = 0;
        while ((m = LEVEL.exec(s))) {
            const unit = LEVELS[m[3].replace(/[μu]/, 'µ')], x = (/[-−–]/.test(m[1]) ? '-' : '') + m[2];
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'level', panel: 'phys', card: 'decibels', text: m[0],
                fields: { kind: '0', unit: String(unit), x: x, z: '50' } });
        }
        return out;
    }

    // ---------------- SMD codes ---------------- //

    // The code on an SMD resistor: of 3 digits, 473, of 4, 4702, R for the point, 4R7 or R47, and EIA-96's, 01C. In a line
    // of a resistor, after a word that says it is marked, marked 473, code 01C, and those after it, 473 and 102; 4R7 with no
    // word, as no number is written so. Not R1 and R2 alone, the names of a circuit's parts, nor 0805, a size of their case
    const SMD = /(?<![\p{L}\p{N}_.,])(\d{3,4}|\d{2}[A-FHRSXYZ]|\d*R\d+|\d+R)(?![\p{L}\p{N}_]|[.,]\d)/gu;
    const MARKED = /(?:\bmarked|\bcodes?|\blabell?ed|\bprinted|\breads|\bsays|\bstamped)(?:\s+(?:with|as|of|is|on it|on))*\s*[:"“'‘]?\s*$/i;
    const AFTER_ONE = /^["”'’]?(?:\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+|\s*\/\s*)["“'‘]?$/;
    const OF_RESISTORS = /resist|Ω|\bohms?\b/i;
    const CASES = new Set(['0201', '0402', '0603', '0805', '1008', '1206', '1210', '1812', '2010', '2220', '2512']);

    function findSmd(s, alone) {
        const out = [];
        let m, last = null;
        SMD.lastIndex = 0;
        while ((m = SMD.exec(s))) {
            const code = m[1], to = m.index + code.length;
            const marked = alone || MARKED.test(s.slice(Math.max(0, m.index - 30), m.index)) || (last !== null && AFTER_ONE.test(s.slice(last, m.index)));
            // 4R7 alone; else marked, and not a size of a case nor a jumper, 000
            if (!(/^\d+R\d+$/.test(code) || marked) || code.length < 3 || CASES.has(code) || /^0+$/.test(code)) continue;
            out.push({ from: m.index, to: to, kind: 'smd', panel: 'phys', card: 'smd', text: code, fields: { find: '0', code: code } });
            last = to;
        }
        return out;
    }

    // ---------------- in the text ---------------- //

    // All of these in a text, the first and longest of two that overlap. Each reader only where the text has what it needs
    function find(s) {
        return Reader.firstLongest([].concat(PARALLEL.test(s) ? findNetworks(s, OF_PARTS.test(s)) : [], ANY_COLOUR.test(s) ? findBands(s, RESISTOR.test(s)) : [],
            /dB/.test(s) ? findLevels(s) : [], /\d/.test(s) && OF_RESISTORS.test(s) ? findSmd(s, false) : []));
    }

    // Text selected that is one of these alone, the colours of any resistor; an SMD code of R for the point, 4R7 or
    // R47, as 473 is a number and 10A a current. Null for none
    function picked(text) {
        const t = String(text).replace(/\s+/g, ' ').trim();
        if (!t || t.length > 200) return null;
        return [].concat(findNetworks(t, true), findBands(t, true), findLevels(t), /R/.test(t) ? findSmd(t, true) : []).filter((c) => !c.from && c.to === t.length)[0] || null;
    }

    // ---------------- worked out by physics.js ---------------- //

    // Each found is made sure of with physics.js, P: parts all above 0, bands of a resistor, a level of some power
    function check(c, P) {
        if (!P) return false;
        try {
            const f = c.fields;
            switch (c.kind) {
                case 'network': {
                    const r = P.network(f.n, ['R', 'C', 'L'][+f.part], false);
                    return !r.error && r.value > 0 && isFinite(r.value);
                }
                case 'bands': {
                    // each band by its place in the colours of its kind, b43 of the 4th band of 4, as the card has them
                    const n = c.bands.length, kinds = P.bandKinds(n);
                    if (!c.bands.every((b, i) => P.BAND_COLOURS[kinds[i]].includes(b))) return false;
                    c.bands.forEach((b, i) => {
                        f['b' + n + i] = String(P.BAND_COLOURS[kinds[i]].indexOf(b));
                    });
                    return P.fromBands(c.bands).ohms > 0;
                }
                case 'level':
                    return !!P.level(+f.x, +f.unit, +f.z);
                case 'smd': {
                    const r = P.fromSmd(f.code);
                    return !!r && r.ohms > 0;
                }
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    // What the tip of each says: { title, lines, rows, note, more }, as answers.js shows them, as its card works it out
    function tip(c, P) {
        const f = c.fields;
        switch (c.kind) {
            case 'network': {
                const kind = ['R', 'C', 'L'][+f.part], unit = { R: 'Ω', C: 'F', L: 'H' }[kind], r = P.network(f.n, kind, false);
                if (r.error) return null;
                const rows = [['Of', PARTS[+f.part]], ['Parts', String(r.parts)]];
                if (kind === 'R') rows.push(['E12, nearest', si(P, P.standard(r.value, 12, 0), 'Ω')], ['E24, nearest', si(P, P.standard(r.value, 24, 0), 'Ω')]);
                return { title: c.text.replace(/\s*(?:\|\||‖)\s*/g, ' ∥ '), lines: ['= ' + si(P, r.value, unit)], rows: rows,
                    note: kind === 'C' ? 'Capacitors in parallel add up; in series, their reciprocals do.' : 'In series they add up; in parallel, their reciprocals do.',
                    more: 'Click to open it in Series and parallel.' };
            }
            case 'bands': {
                const r = P.fromBands(c.bands), rows = [['From', si(P, r.min, 'Ω')], ['To', si(P, r.max, 'Ω')]];
                if (r.temp !== null) rows.push(['Coefficient', r.temp + ' ppm/K']);
                return { title: c.bands.filter((b) => b !== NONE).map((b) => P.COLOURS[b][0]).join(' '), lines: [si(P, r.ohms, 'Ω') + ' ± ' + r.tol + '%'], rows: rows,
                    note: c.back ? 'Read from its other end, the end its bands are nearer.' : c.bands[3] === NONE ? 'Of three bands: no band of tolerance, 20%.' : '',
                    more: 'Click to open it in Resistor colour code.' };
            }
            case 'level': {
                const r = P.level(+f.x, +f.unit, +f.z), power = +f.unit < 3;
                if (!r) return null;
                const db = (v) => grouped(Math.round(v * 100) / 100);
                const rows = power ? [['dBm', db(r.dbm)], ['dBW', db(r.dbw)], ['Across 50 Ω', si(P, r.v, 'V') + ' RMS'], ['dBV, across 50 Ω', db(r.dbv)]] :
                    [['dBV', db(r.dbv)], ['dBmV', db(r.dbmv)], ['dBµV', db(r.dbuv)], ['Peak', si(P, r.vpeak, 'V')], ['Across 50 Ω', si(P, r.w, 'W') + ', ' + db(r.dbm) + ' dBm']];
                return { title: c.text.replace(/^[-−]/, '–').replace(/dB[μu]V/, 'dBµV'), lines: [power ? si(P, r.w, 'W') : si(P, r.v, 'V') + ' RMS'], rows: rows,
                    note: power ? 'dBm of a milliwatt, dBW of a watt.' : 'dBV of a volt, dBµV of a microvolt; RMS of a sine wave.', more: 'Click to open it in Decibels.' };
            }
            case 'smd': {
                const r = P.fromSmd(f.code);
                if (!r) return null;
                const rows = [['Code of', r.kind], ['Ω', grouped(r.ohms)]];
                if (r.also) rows.push(['Read as EIA-96', si(P, r.also.ohms, 'Ω') + ' ± 1%']);
                return { title: f.code.toUpperCase(), lines: [si(P, r.ohms, 'Ω') + (r.tol ? ' ± ' + r.tol + '%' : '')], rows: rows,
                    note: { 'EIA-96': 'Its number is a value of E96, 01 for 100; its letter the power of 10.', 'R for the point': 'R is where the point is.' }[r.kind] ||
                        'Its last digit is the power of 10 the rest is multiplied by.', more: 'Click to open it in SMD resistor code.' };
            }
        }
        return null;
    }

    const CalcPhysPage = { find: find, picked: picked, check: check, tip: tip };
    root.CalcPhysPage = CalcPhysPage;

    // A feature of the instant answers (reader.js): read before the sums, so 100 + 220 || 330 is not 100 + 220 alone;
    // selected, before the maths. physics.js comes into the page before its icons go in
    Reader.add({
        name: 'physics', kinds: ['network', 'bands', 'level', 'smd'], needs: 'phys', uses: 'phys', find: (s) => find(s), tier: 1, picked: picked,
        check: (c, unit, lib) => check(c, lib.phys), tip: (c, unit, lib) => tip(c, lib.phys)
    });
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPhysPage;
})(typeof window !== 'undefined' ? window : this);
