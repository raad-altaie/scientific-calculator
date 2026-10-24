// The numbers of the instant answers, as their panel works them out: an IP network, 192.168.0.1/24; a matrix marked
// as maths, and its determinant; a choice, 52 choose 5; a complex number, (3 + 4i)(1 − 2i); a function of logic,
// F = AB + A'C or Σm(1, 3, 5), made as small as it can be. Selected as well: a whole number, a decimal, the codes of a
// computer, 0xFF, a UUID and Base64, and logic of + alone, AB + BC. Put into the pages while it is turned on
// (background.js)
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    const { tidy, shown, grouped, workOut, SUPER_OF } = Reader;

    // ---------------- IP networks ---------------- //

    // An IP network: an IPv4 address with its prefix, 192.168.0.1/24, or its mask, 192.168.0.1 255.255.255.0;
    // or an IPv6 address with its prefix, 2001:db8::/32. Not an address alone: it has no network to work out
    const IPV4 = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2})(?!\d)|[ \t]+(255\.\d{1,3}\.\d{1,3}\.\d{1,3}))/y;
    const IPV6 = /([0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7})\/(\d{1,3})(?!\d)/iy;

    // a mask: its 1s all on the left, 255.255.240.0
    function isMask(text) {
        const parts = text.split('.').map(Number);
        if (parts.some((part) => part > 255)) return false;
        const zeros = ~parts.reduce((all, part) => all * 256 + part, 0) >>> 0;
        return ((zeros + 1) & zeros) === 0;
    }

    // up to eight groups of up to four hexadecimal digits, :: once for a run of 0s
    function isIpv6(text) {
        const halves = text.split('::');
        const groups = halves.map((half) => (half ? half.split(':') : []));
        const count = groups.reduce((n, g) => n + g.length, 0);
        return halves.length <= 2 && groups.every((g) => g.every((group) => /^[0-9a-f]{1,4}$/i.test(group))) &&
            (halves.length === 2 ? count < 8 : count === 8);
    }

    function readAddress(s, i) {
        let m, to;
        IPV4.lastIndex = i;
        if ((m = IPV4.exec(s))) {
            if (m.slice(1, 5).some((part) => +part > 255) || +m[5] > 32 || (m[6] && !isMask(m[6]))) return null;
        } else {
            IPV6.lastIndex = i;
            if (!(m = IPV6.exec(s)) || +m[2] > 128 || !isIpv6(m[1])) return null;
        }
        to = i + m[0].length;
        if (Reader.AFTER.test(s.slice(to, to + 2))) return null; // 10.0.0.1/24.5
        const text = m[0].replace(/\s+/g, ' ');
        return { from: i, to: to, text: text, left: text, kind: 'subnet', trig: false };
    }

    // ---------------- matrices ---------------- //

    // A matrix of up to 10×10, each of its rows as long, read as the Matrix card of the numbers takes it:
    // its size, 2×3, and a box for each number, a11 to a23. det: its determinant is asked for
    function matrixOf(body, det, length) {
        const rows = body.split(Reader.ROW).map((r) => r.split(Reader.CELL).map((cell) => tidy(cell)));
        const cols = rows[0].length;
        if (rows.length > 10 || cols > 10 || rows.length * cols < 2 || rows.some((r) => r.length !== cols || r.some((cell) => !cell))) return null;
        const fields = { size: rows.length + '×' + cols };
        rows.forEach((r, i) => r.forEach((cell, j) => {
            fields['a' + (i + 1) + (j + 1)] = cell;
        }));
        return { from: 0, to: length, kind: 'matrix', det: det, rows: rows, fields: fields, trig: false,
            text: '[' + rows.map((r) => r.join(' ')).join('; ') + ']', left: '' };
    }

    // ---------------- choices and complex numbers ---------------- //

    // 52 choose 5, 52 nCr 5, nCr(52, 5), and of order, nPr: as Exactly takes them, C(52, 5) and P(52, 5)
    const CHOICE = /(?<![\p{L}\p{N}_.,])(?:(\d{1,4})\s*(choose|nCr|nPr)\s*(\d{1,4})|(nCr|nPr|binom|C|P)\s*\(\s*(\d{1,4})\s*[,;]\s*(\d{1,4})\s*\)(?=\s*=)|(?:nCr|nPr|binom)\s*\(\s*(\d{1,4})\s*[,;]\s*(\d{1,4})\s*\))(?![\p{L}\p{N}_])/gu;

    function findChoices(s) {
        const out = [];
        let m;
        CHOICE.lastIndex = 0;
        while ((m = CHOICE.exec(s))) {
            const n = m[1] || m[5] || m[7], k = m[3] || m[6] || m[8], how = m[2] || m[4] || (/nPr/.test(m[0]) ? 'nPr' : 'nCr');
            const order = /^(nPr|P)$/.test(how);
            if (+k > +n) continue;
            const e = (order ? 'P(' : 'C(') + n + ', ' + k + ')';
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'exact', panel: 'numbers', card: 'exact', text: e, fields: { e: e } });
        }
        return out;
    }

    // (3 + 4i)(1 − 2i), 2 + 3i, |3 + 4i|: numbers and i, a number before it at least once, and an operator
    const COMPLEX = /(?<![\p{L}\p{N}_.,^])[-−–(|]?\s*[\d.(|](?:[\d.\s+\-−–×*·⋅/^()|]|i(?!\p{L}))*/gu;

    function complexText(t) {
        let e = t.replace(/[−–]/g, '-').replace(/[·⋅*]/g, '×').replace(/\s+/g, ' ').trim();
        while (/[-+×/^( ]$/.test(e)) e = e.slice(0, -1).trim();
        let bars = 0;
        e = e.replace(/\|/g, () => (++bars % 2 ? 'abs(' : ')'));
        const open = (e.match(/\(/g) || []).length, close = (e.match(/\)/g) || []).length;
        if (bars % 2 || open !== close || /i[\d(]|ii/.test(e)) return null;
        return /\d\s*i(?![A-Za-z])/.test(e) && /[-+×/^]|\)\s*\(|abs\(/.test(e.replace(/^-/, '')) ? e : null;
    }

    function findComplex(s) {
        const out = [];
        let m;
        COMPLEX.lastIndex = 0;
        while ((m = COMPLEX.exec(s))) {
            let text = m[0];
            const stop = /\.(?!\d)/.exec(text); // the end of a sentence, not a decimal point: read on after it
            if (stop) {
                text = text.slice(0, stop.index);
                COMPLEX.lastIndex = m.index + stop.index + 1;
            }
            const trail = /[-−–+×*·⋅/^(\s]+$/.exec(text);
            if (trail) text = text.slice(0, trail.index);
            const to = m.index + text.length;
            if (/^[\p{L}\p{N}_]/u.test(s.slice(to, to + 1)) || !/i/.test(text)) continue;
            const z = complexText(text);
            if (z) out.push({ from: m.index, to: to, kind: 'complex', panel: 'numbers', card: 'complex', text: text.trim(), fields: { z: z } });
        }
        return out;
    }

    // ---------------- logic ---------------- //

    // A function of logic as a page writes it: of its minterms or maxterms, Σm(1, 3, 5) + d(7) or ΠM(0, 2), F(A, B, C) =
    // before it as well; or of variables, capitals, with ' for NOT, F = AB + A'C, with AND OR NOT XOR NAND NOR XNOR in
    // capitals, A AND NOT B, or ⊕ ∧ ∨ ¬. Not of + alone, AB + BC, as often algebra: that selected. Each as the Truth
    // table card takes it, Σm and ΠM written so
    const ROWS = '\\(\\s*\\d{1,3}(?:\\s*,\\s*\\d{1,3})*\\s*\\)';
    const NAMED = '([A-Z]\\d?)\\s*(\\(\\s*[A-Za-z]\\d?(?:\\s*,\\s*[A-Za-z]\\d?)*\\s*\\))?\\s*=\\s*';
    const TERMS = new RegExp('(?<![\\p{L}\\p{N}_])(?:' + NAMED + ')?(?:([Σ∑]\\s*m?)\\s*(' + ROWS + ')(?:\\s*\\+\\s*d\\s*(' + ROWS + '))?|' +
        '([Π∏]\\s*M?)\\s*(' + ROWS + ')(?:\\s*[·⋅*]?\\s*[dD]\\s*(' + ROWS + '))?)(?![\\p{L}\\p{N}_])', 'gu');
    const LOGIC_ATOM = '(?:NOT\\s+|[¬!~]\\s*)*(?:[A-Z]\\d?|\\([A-Z\\d\\s+·⋅*⊕∧∨&|\'’′¬!~]{1,80}\\))[\'’′]*'; // in brackets, logic alone
    const LOGIC_OP = '(?:\\s*[+·⋅*⊕∧∨&|]\\s*|\\s+(?:AND|OR|XOR|NAND|NOR|XNOR)\\s+)';
    const LOGIC_TERM = LOGIC_ATOM + '(?:' + LOGIC_ATOM + ')*';
    const LOGIC = new RegExp('(?<![\\p{L}\\p{N}_\'’])(?:' + NAMED + ')?(' + LOGIC_TERM + '(?:' + LOGIC_OP + LOGIC_TERM + ')*)(?![\\p{L}\\p{N}_\'’(])', 'gu');
    const WORDS = /\b(?:AND|OR|NOT|XOR|NAND|NOR|XNOR)\b/g;
    // what only logic has: a NOT after a variable or bracket, A' or (A + B)', a word in capitals, or a sign of logic
    const OF_LOGIC = /[A-Z\d)]['’′](?![a-z])|\b(?:AND|OR|NOT|XOR|NAND|NOR|XNOR)\b|[⊕∧∨¬]/;

    const logicOf = (from, to, text, e) => ({ from: from, to: to, kind: 'logic', panel: 'numbers', card: 'logic', text: text, fields: { e: e.replace(/[’′]/g, '\'').replace(/\s+/g, ' ') } });

    // alone: selected, of + and products as well, AB + BC
    function findLogic(s, alone) {
        const out = [];
        let m;
        TERMS.lastIndex = 0;
        while ((m = TERMS.exec(s))) {
            const name = m[1] ? m[1] + (m[2] ? m[2].replace(/\s+/g, '').replace(/,/g, ', ') : '') + ' = ' : '';
            out.push(logicOf(m.index, m.index + m[0].length, m[0], name + (m[3] ? 'Σm' + m[4] + (m[5] ? ' + d' + m[5] : '') : 'ΠM' + m[7] + (m[8] ? ' · D' + m[8] : ''))));
        }
        LOGIC.lastIndex = 0;
        while ((m = LOGIC.exec(s))) {
            // two variables or more, of an operator or named, F = AB'; no word in capitals, HTML
            const body = m[3], bare = body.replace(WORDS, ' '), vars = new Set(bare.match(/[A-Z]\d?/g) || []);
            if (vars.size < 2 || vars.size > 8 || /[A-Z]{4}/.test(bare) || !(m[1] || new RegExp(LOGIC_OP).test(body))) continue;
            // of words, each a variable alone: USA AND UK, TCP AND UDP, I AND YOU are words
            if (bare !== body && /[A-Z]{2}/.test(bare)) continue;
            if (!OF_LOGIC.test(body) && !m[2] && !(alone && /[A-Z]\d?['’′]*[A-Z(]/.test(body) && /[+·⋅]/.test(body))) continue;
            // of AND and OR alone, unnamed, three variables or more: R AND D, Q AND A are words
            if (!m[1] && !OF_LOGIC.test(body.replace(WORDS, (w) => (/^(?:AND|OR)$/.test(w) ? ' ' : w))) && vars.size < 3 && !alone) continue;
            out.push(logicOf(m.index, m.index + m[0].length, m[0], m[0]));
        }
        return Reader.firstLongest(out);
    }

    // ---------------- in the text ---------------- //

    // the choices, complex numbers and logic of a text; each reader only where the text has what it needs. raw: the
    // line with the digits of its <sub>, of the same length
    function find(s, order, raw) {
        const t = raw === undefined ? s : raw;
        const logic = /[Σ∑Π∏]|['’′⊕∧∨¬]|[A-Z] (?:AND|OR|XOR|NAND|NOR|XNOR) /.test(t) ? findLogic(t, false) : [];
        if (!/\d/.test(s)) return logic;
        return Reader.without([].concat(/choose|nCr|nPr|binom|\(/.test(s) ? findChoices(s) : [], /\di/.test(s) ? findComplex(s) : []), logic);
    }

    // A line marked as maths: a matrix alone, A = [1 2; 3 4] as well, its determinant, |A| or det A, and equations
    // together in an array of a line each; a choice, \binom{52}{5}, with its value after it if it is given; a complex
    // number or a choice, the whole line, or with its answer after it
    function formal(t) {
        const { MAT, ROW, CELL, BIG } = Reader;
        const mat = new RegExp('^(?:[A-Z]\\s*=\\s*)?(det\\s*|abs\\(\\s*)?\\(?\\s*' + MAT + '([^' + MAT + ']+)' + MAT + '\\s*\\)?\\s*\\)?$').exec(t);
        if (mat && mat[2].includes('=')) return Reader.formal(mat[2].split(ROW).map((r) => r.split(CELL).join(' ')).join(', '));
        if (mat) return matrixOf(mat[2], !!mat[1], t.length);
        if (t.includes(MAT) || t.length > 300 || t.includes(BIG) || t.includes('_')) return null;
        const choice = /^\(?\s*([CP])\(\s*(\d{1,4})\s*,\s*(\d{1,4})\s*\)\s*\)?(?:\s*=\s*[\d,\s]+)?$/.exec(t); // in its brackets, as MathML draws it
        if (choice && +choice[3] <= +choice[2]) {
            const e = choice[1] + '(' + choice[2] + ', ' + choice[3] + ')';
            return { from: 0, to: t.length, kind: 'exact', panel: 'numbers', card: 'exact', fields: { e: e }, text: e, left: '', trig: false };
        }
        const pick = find(t).filter((c) => !c.from && /^\s*(?:=\s*[-\d.,\s]*)?$/.test(t.slice(c.to)))[0];
        return pick ? Object.assign(pick, { from: 0, to: t.length, left: '', trig: false }) : null;
    }

    // ---------------- selected ---------------- //

    const UUID = /^(?:urn:uuid:)?\{?([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})\}?$/i;

    // Text selected that is one of these alone: a code of a computer, 0xFF, a UUID, Base64; a function of logic; a
    // whole number, a decimal. Null for none
    function picked(text) {
        const t = String(text).trim().replace(/\s+/g, ' ');
        if (!t || t.length > 300) return null;
        const whole = (c) => Object.assign(c, { from: 0, to: t.length, text: c.text || t });
        let m;
        if ((m = /^(0x[0-9a-f]+|0b[01]+|0o[0-7]+)$/i.exec(t.replace(/[_']/g, '')))) {
            const v = BigInt(m[1].toLowerCase());
            const bits = [8, 16, 32, 64, 128].findIndex((b) => v < BigInt(2) ** BigInt(b));
            if (bits > -1) return whole({ kind: 'bits', panel: 'numbers', card: 'bits', value: v, fields: { e: m[1], bits: String(Math.max(2, bits)) } });
        }
        if ((m = UUID.exec(t))) return whole({ kind: 'uuid', panel: 'numbers', card: 'uuid', fields: { u: m[1] } });
        if (isBase64(t)) return whole({ kind: 'base64', panel: 'numbers', card: 'base64', fields: { b: t, enc: '2' } });
        const logic = findLogic(t, true).filter((c) => !c.from && c.to === t.length)[0];
        if (logic) return logic;
        if ((m = /^[$€£¥]?\s?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)$/.exec(t.replace(/^[-−–]/, '')))) {
            const sign = /^[-−–]/.test(t) ? '-' : '', n = sign + m[1].replace(/,/g, '');
            if (/^-?\d{1,20}$/.test(n)) return whole({ kind: 'whole', panel: 'numbers', card: 'factors', fields: { n: n } });
            if (/\./.test(n)) return whole({ kind: 'decimal', panel: 'numbers', card: 'fraction', fields: { x: n } });
        }
        return null;
    }

    // Base64, and that of web addresses: of its letters alone, whole groups of four with = at the end, and not
    // a word or a number: letters and digits both, or upper and lower case and long. Of text, read as text
    function isBase64(t) {
        if (t.length < 8 || t.length > 300 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(t)) return false;
        const plain = t.replace(/=+$/, '');
        if (/[+/]/.test(plain) && /[-_]/.test(plain)) return false;
        if ((plain.length % 4 === 1) || (/=/.test(t) && t.length % 4)) return false;
        if (!(/\d/.test(plain) && /[A-Za-z]/.test(plain)) && !(/[a-z]/.test(plain) && /[A-Z]/.test(plain) && plain.length >= 12)) return false;
        if (/^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/.test(plain)) return false; // CamelCase, a name
        const bytes = base64Bytes(plain);
        if (!bytes) return false;
        try {
            const text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
            return /^[\p{L}\p{N}\p{P}\p{S}\p{Zs}\n\r\t]+$/u.test(text) && !/[\u0000-\u0008]/.test(text);
        } catch (e) {
            return false;
        }
    }

    function base64Bytes(t) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const s = t.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = [];
        let bits = 0, value = 0;
        for (const ch of s) {
            const k = letters.indexOf(ch);
            if (k < 0) return null;
            value = (value << 6) | k;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                bytes.push((value >> bits) & 255);
            }
        }
        return bytes;
    }

    // ---------------- the tips ---------------- //

    // a matrix of numbers, kept as values; a function of logic the Truth table reads, once maths.js is in the page, as
    // for a tip; the rest is read whole by its reader
    function check(c, unit, lib) {
        if (c.kind === 'logic') return !lib.maths || !lib.maths.logic(c.fields.e).error;
        if (c.kind !== 'matrix') return true;
        c.values = c.rows.map((r) => r.map((cell) => workOut(cell, unit, lib.engine)));
        return c.values.every((r) => r.every((v) => v !== null));
    }

    // A matrix's determinant, rank and inverse, as the Matrix card has them; the inverse of up to 3×3, that fits
    function matrixTip(c, M) {
        const a = c.values, square = a.length === a[0].length;
        const det = square ? M.det(a) : NaN, inv = square ? M.inverse(a) : null;
        const rows = [['Size', a.length + '×' + a[0].length], ['Rank', String(M.rank(a))]];
        if (square && !c.det) rows.splice(1, 0, ['det', shown(det)]);
        const short = (v) => shown(+v.toPrecision(6)); // the inverse to 6 digits, to fit; the card has them all
        if (square && a.length <= 3) rows.push(['Inverse', inv ? '[' + inv.map((r) => r.map(short).join(' ')).join('; ') + ']' : 'none: det is 0']);
        return {
            title: (c.det ? 'det ' : '') + '[' + c.rows.map((r) => r.map((cell) => cell.replace(/-/g, '–')).join(' ')).join('; ') + ']',
            lines: c.det ? [square ? '= ' + shown(det) : 'Not square: no determinant'] : [],
            rows: rows, note: square ? '' : 'Not square: no determinant nor inverse.',
            more: 'Click to open it in Matrix, with its transpose and powers.'
        };
    }

    // 2⁹⁶: a count of addresses of IPv6, a power of 2, as a number while it is a short one
    function power(count) {
        const bits = count.toString(2).length - 1;
        return count <= BigInt(1e12) ? String(count) : '2' + String(bits).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    }

    // An IP network as the calculator's IP subnet shows it, its main tiles: of IPv4 its network, broadcast,
    // mask, hosts and kind; of IPv6, which has no broadcast nor mask, its network, last address and size
    function network(c, M) {
        const r = M.subnet(c.text);
        if (!r || r.error) return null;
        if (r.v6) {
            const ip = M.ipv6Text;
            return {
                title: c.text,
                rows: [['Network', ip(r.network) + '/' + r.prefix], ['Last address', ip(r.last)], ['Addresses', power(r.all)],
                    ['/64 networks', r.subnets === null ? '–' : power(r.subnets)], ['Kind', r.kind]]
            };
        }
        const ip = M.ipText;
        return {
            title: c.text,
            rows: [['Network', ip(r.network) + '/' + r.prefix], ['Broadcast', ip(r.broadcast)], ['Mask', ip(r.mask)],
                ['Hosts', r.hosts.toLocaleString('en-US') + (r.hosts > 1 ? ': ' + ip(r.first) + ' – ' + ip(r.last) : '')], ['Kind', r.kind]]
        };
    }

    // What the tip of each says, worked out by the calculator's maths
    function tip(c, unit, lib) {
        const f = c.fields, M = lib.maths;
        switch (c.kind) {
            case 'matrix':
                return matrixTip(c, M);
            case 'subnet':
                return network(c, M);
            case 'whole': {
                const r = M.factorize(f.n, false, 0, 64), n = BigInt(f.n);
                const factors = r.error ? '–' : (r.n < 0 ? '–1 × ' : '') + r.factors.map((pe) => pe[0] + (pe[1] > 1 ? [...String(pe[1])].map((d) => SUPER_OF[d]).join('') : '')).join(' × ');
                const size = n < 0 ? -n : n;
                return {
                    title: f.n.replace('-', '–'),
                    rows: [['Prime factors', factors || '–'], ['Prime', r.prime ? 'Yes' : 'No'], ['Hexadecimal', (n < 0 ? '–' : '') + '0x' + size.toString(16).toUpperCase()],
                        ['Binary', (n < 0 ? '–' : '') + size.toString(2).replace(/(?=(?:[01]{4})+$)(?!^)/g, ' ')]].concat(r.error ? [] : [['Divisors', String(r.count)]]),
                    more: 'Click to open it in Prime factors.'
                };
            }
            case 'decimal': {
                const r = M.fractionOf(f.x, false, 0), x = +f.x;
                const frac = r && !r.error && r.top !== undefined ? (r.top < 0 ? '–' : '') + (r.top < 0 ? -r.top : r.top) + (r.bottom === BigInt(1) ? '' : '/' + r.bottom) : '–';
                return {
                    title: f.x.replace('-', '–'),
                    rows: [['Fraction', frac], ['Rounded', grouped(Math.round(x * 100) / 100)], ['Whole part', grouped(Math.trunc(x))], ['Percent', grouped(x * 100) + '%']],
                    more: 'Click to open it in Fraction and decimal.'
                };
            }
            case 'bits': {
                const v = c.value;
                return {
                    title: f.e,
                    rows: [['Decimal', v.toLocaleString('en-US')], ['Hexadecimal', '0x' + v.toString(16).toUpperCase()], ['Octal', '0o' + v.toString(8)],
                        ['Binary', v.toString(2).replace(/(?=(?:[01]{4})+$)(?!^)/g, ' ')]],
                    more: 'Click to open it in Bases.'
                };
            }
            case 'uuid': {
                const r = M.readUuid(f.u);
                if (!r) return null;
                const rows = [['Version', r.nil ? 'Nil' : r.max ? 'Max' : r.version === null ? 'None' : String(r.version)], ['Variant', r.variant || '–']];
                if (r.time !== null) rows.push(['Made, in UTC', new Date(Math.floor(r.time)).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')]);
                return { title: r.text, rows: rows, more: 'Click to open it in UUID.' };
            }
            case 'base64': {
                const bytes = base64Bytes(f.b.replace(/=+$/, ''));
                const text = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
                return { title: 'Base64', lines: [text.length > 120 ? text.slice(0, 120) + '…' : text], rows: [['Bytes', String(bytes.length)]],
                    more: 'Click to open it in Base32, 58, 64 and 85.' };
            }
            case 'exact': {
                const r = M.exact(f.e, false);
                if (!r || r.error) return null;
                const top = String(r.top), digits = top.replace('-', '').length;
                return { title: f.e, lines: ['= ' + (digits > 40 ? top.slice(0, 30) + '… (' + digits + ' digits)' : BigInt(top).toLocaleString('en-US'))],
                    more: 'Click to open it in Exactly, every digit.' };
            }
            case 'logic': {
                // made as small as it can be, as the Truth table card makes it: its sum of products, its product of sums
                // and the rows that are 1
                const g = M.logic(f.e);
                if (g.error) return null;
                const r = M.minimize(g), list = (s, rows) => s + '(' + rows.join(', ') + ')', k = g.vars.length;
                const rows = [['Variables', g.vars.join(', ')], ['Product of sums', r.pos],
                    ['Minterms', r.ones.length > 12 ? r.ones.length + ' of ' + (1 << k) + ' rows' : list('Σm', r.ones) + (r.either.length ? ' + ' + list('d', r.either) : '')]];
                return { title: c.text.replace(/\s+/g, ' ').trim(), lines: [g.name + ' = ' + r.sop], rows: rows,
                    note: 'As small as it can be, as a sum of products.', more: 'Click to open it in Truth table' + (k >= 2 && k <= 4 ? ', with its Karnaugh map.' : '.') };
            }
            case 'complex': {
                const z = M.complex(f.z, false, unit);
                if (!z || !isFinite(z.re) || !isFinite(z.im)) return null;
                const p = M.polar(z, unit), im = Math.abs(z.im);
                const text = !z.im ? grouped(z.re) : (z.re ? grouped(z.re) + (z.im < 0 ? ' – ' : ' + ') : z.im < 0 ? '–' : '') + (im === 1 ? '' : grouped(im)) + 'i';
                return { title: c.text.replace(/-/g, '–'), lines: ['= ' + text], rows: [['|z|', grouped(p.r)], ['Angle', grouped(p.theta) + (unit === 1 ? '°' : '')]],
                    more: 'Click to open it in Complex number.' };
            }
        }
        return null;
    }

    const CalcPageNumbers = {
        name: 'numbers', kinds: ['subnet', 'matrix', 'exact', 'complex', 'logic', 'bits', 'uuid', 'base64', 'whole', 'decimal'],
        find: find, tier: 1, at: readAddress, formal: formal, picked: picked, check: check, tip: tip, isBase64: isBase64
    };
    Reader.add(CalcPageNumbers);
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPageNumbers;
})(typeof window !== 'undefined' ? window : this);
