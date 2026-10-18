// What of a page the cards of the calculator work out, other than its sums, which answers.js reads. In the
// text: a quantity to convert, 5 km in miles; a time between dates, from 3 March 2024 to 1 June 2026, and a
// date some days on, 90 days after 1 May 2026; a loan, a change of a price and a rate compounded; a choice,
// 52 choose 5; a complex number, (3 + 4i)(1 − 2i); and two or three equations together, 2x + y = 5, x − y = 1.
// Selected as well: a number, a list of them, a quantity, a date, and the codes of a computer, 0xFF, a UUID,
// Base64 and a Unix time. Each is { from, to, kind, text, panel, card, fields }: where it is in the text, the
// panel and the card of the calculator that open with it, and what goes in its boxes. tipOf says what its tip
// shows, worked out by the calculator's own maths. Read here, in the browser; it works in Node as well, for the tests
(function (root) {
    'use strict';

    const Units = root.CalcUnits || (typeof require === 'function' ? require('../units.js') : null);

    // a number as a text writes it: 12, 1,234.5, –3, .5; and its value
    const NUM = '[-−–]?(?:\\d{1,3}(?:,\\d{3})+(?!\\d)|\\d+)(?:\\.\\d+)?|[-−–]?\\.\\d+';
    const valueOf = (text) => +String(text).replace(/[,\s$€£¥]/g, '').replace(/[−–]/, '-');
    const NOT_BEFORE = '(?<![\\p{L}\\p{N}_.,])';
    const NOT_AFTER = '(?![\\p{L}\\p{N}_]|[.,]\\d)';
    const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const SUPER_OF = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };

    // a number for a tip: up to 12 digits, – for minus, × 10ⁿ for a large or a small one
    function shown(v, digits) {
        if (!isFinite(v)) return v > 0 ? '∞' : v < 0 ? '–∞' : '–';
        const a = Math.abs(v), r = +v.toPrecision(digits || 12);
        if (a && (a >= 1e15 || a < 1e-6)) {
            const [m, e] = r.toExponential().split('e');
            return m.replace('-', '–') + ' × 10' + [...String(+e)].map((ch) => SUPER_OF[ch]).join('');
        }
        return r.toLocaleString('en-US', { maximumFractionDigits: 12 }).replace('-', '–');
    }
    const money = (v) => (v < 0 ? '–' : '') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ---------------- units ---------------- //

    // Each unit of the converter by the ways a text writes it: its symbol, km, m², °C; its name, kilometers,
    // and kilometer, kilometres. A name of two groups, gal and mpg of the US and the UK, is the first's
    const UNIT_EXTRA = {
        meters: ['metres', 'metre', 'meter'], millimeters: ['millimetres', 'millimetre', 'millimeter'], centimeters: ['centimetres', 'centimetre', 'centimeter'],
        kilometers: ['kilometres', 'kilometre', 'kilometer', 'kms'], inches: ['inch'], feet: ['foot'], yards: ['yard'], miles: ['mile'],
        'nautical miles': ['nautical mile'], 'square meters': ['square metres', 'square metre', 'square meter', 'sq m'], 'square feet': ['square foot', 'sq ft'],
        'square kilometers': ['square kilometres', 'square kilometre', 'square kilometer', 'sq km'], 'square miles': ['square mile', 'sq mi'],
        hectares: ['hectare'], acres: ['acre'], liters: ['litres', 'litre', 'liter', 'l'], milliliters: ['millilitres', 'millilitre', 'milliliter', 'ml'],
        'cubic meters': ['cubic metres', 'cubic metre', 'cubic meter'], 'teaspoons (US)': ['teaspoons', 'teaspoon'], 'tablespoons (US)': ['tablespoons', 'tablespoon', 'tbs'],
        'fluid ounces (US)': ['fluid ounces', 'fluid ounce'], 'cups (US)': ['cups'], 'pints (US)': ['pints', 'pint'], 'quarts (US)': ['quarts', 'quart'],
        'gallons (US)': ['gallons', 'gallon'], 'gallons (UK)': ['imperial gallons', 'imperial gallon'], 'cubic inches': ['cubic inch'], 'cubic feet': ['cubic foot'],
        kilograms: ['kilogram', 'kilos', 'kilo', 'kgs'], milligrams: ['milligram'], grams: ['gram', 'gr'], tonnes: ['tonne', 'metric tons', 'metric ton'],
        ounces: ['ounce'], pounds: ['pound', 'lbs'], stones: ['stone'], 'short tons (US)': ['short tons', 'short ton', 'tons', 'ton'],
        Celsius: ['°c', 'ºc', '℃', 'degrees celsius', 'degree celsius', 'deg c', 'centigrade'], Fahrenheit: ['°f', 'ºf', '℉', 'degrees fahrenheit', 'degree fahrenheit', 'deg f'],
        kelvin: ['kelvins'], 'kilometers per hour': ['kilometres per hour', 'kph', 'kmh', 'km/hr'], 'meters per second': ['metres per second'],
        'miles per hour': [], knots: ['knot'], 'feet per second': ['fps'], seconds: ['second', 'sec', 'secs'], milliseconds: ['millisecond'],
        minutes: ['minute', 'mins'], hours: ['hour', 'hr', 'hrs'], days: ['day'], weeks: ['week', 'weeks'], 'years (365.25 days)': ['years', 'year', 'yrs'],
        bytes: ['byte'], bits: [], kilobytes: ['kilobyte', 'KB'], megabytes: ['megabyte'], gigabytes: ['gigabyte'], terabytes: ['terabyte'],
        kibibytes: ['kibibyte'], mebibytes: ['mebibyte'], gibibytes: ['gibibyte'], tebibytes: ['tebibyte'], pascals: ['pascal'], kilopascals: ['kilopascal'],
        bars: [], atmospheres: ['atmosphere'], 'pounds per square inch': [], 'millimeters of mercury': ['millimetres of mercury'], 'inches of mercury': [],
        joules: ['joule'], kilojoules: ['kilojoule'], calories: ['calorie'], 'kilocalories (food Calories)': ['kilocalories', 'kilocalorie'],
        'watt-hours': ['watt hours', 'watt-hour', 'watt hour'], 'kilowatt-hours': ['kilowatt hours', 'kilowatt-hour', 'kilowatt hour'],
        'British thermal units': ['btus'], electronvolts: ['electronvolt', 'electron volts'], watts: ['watt'], kilowatts: ['kilowatt'],
        horsepower: [], 'metric horsepower': [], degrees: ['degree', 'deg'], radians: ['radian'], gradians: ['gradian', 'gon'], turns: ['turn'],
        'kilometers per liter': ['kilometres per litre', 'km/l', 'kmpl'], 'liters per 100 km': ['litres per 100 km', 'l/100km'], 'miles per gallon (US)': ['miles per gallon']
    };
    // symbols that are words or other things as often: not taken alone
    const UNIT_NOT = new Set(['°′″', '′', '″', 'turn', 'K', 'cup', 'st', 'd', 't', 'PS', 'B', 'gal']);
    let unitIndex = null;

    function units() {
        if (unitIndex || !Units) return unitIndex;
        const names = new Map(), symbols = new Map();
        Units.units.forEach((group, g) => group.list.forEach((unit, u) => {
            const symbol = unit.s.replace(/<sup>(\d)<\/sup>/g, (m, d) => SUPER_OF[d]);
            const at = { g: g, u: u };
            if (!UNIT_NOT.has(unit.s)) {
                [symbol, symbol.replace(/[²³]/g, (d) => '^' + '  ²³'.indexOf(d)), symbol.replace(/[²³]/g, (d) => '  ²³'.indexOf(d))].forEach((s) => {
                    if (!symbols.has(s)) symbols.set(s, at);
                });
            }
            [unit.t].concat(UNIT_EXTRA[unit.t] || []).forEach((name) => {
                const key = name.toLowerCase();
                if (/^[A-Z]+$/.test(name)) { // KB: a symbol, as it is written
                    if (!symbols.has(name)) symbols.set(name, at);
                } else if (!names.has(key)) {
                    names.set(key, at);
                }
            });
        }));
        symbols.set('gal', { g: 2, u: 9 }); // the US gallon, of the two
        const all = [...symbols.keys()].map((s) => [s, false]).concat([...names.keys()].map((n) => [n, true]))
            .sort((a, b) => b[0].length - a[0].length);
        // names in any case, symbols as they are: mm is not Mm, MB not mb
        const re = all.map(([s, name]) => (name ? escape(s).replace(/[a-z]/g, (ch) => '[' + ch + ch.toUpperCase() + ']') : escape(s)).replace(/ /g, '\\s+')).join('|');
        unitIndex = { names: names, symbols: symbols, re: '(?:' + re + ')(?![\\p{L}\\p{N}_])' };
        return unitIndex;
    }

    // the unit of a text, 'km' or 'Kilometres', as { g, u }, or null
    function unitOf(text) {
        const index = units(), t = text.replace(/\s+/g, ' ');
        return index.symbols.get(t) || index.names.get(t.toLowerCase()) || null;
    }

    // 5 km, 72 °F, 2.5 TB: its value and unit
    let quantityRe = null;
    function quantityPattern() {
        return quantityRe || (quantityRe = '(' + NUM + ')\\s?(' + units().re + ')');
    }

    function quantity(value, unit, from, to, target) {
        const fields = { panel: 'units', g: Units.units[unit.g].c, u: Units.units[unit.g].list[unit.u].t, v: String(valueOf(value)) };
        if (target) fields.to = Units.units[target.g].list[target.u].t;
        return { from: from, to: to, kind: 'unit', panel: 'units', fields: fields, text: '', unit: unit, target: target, value: valueOf(value) };
    }

    // In the text, a conversion asked for: 5 km in miles, 72 °F to °C, convert 2 TB to GB, how many cups in 2 liters
    function findUnits(s) {
        if (!Units) return [];
        const out = [], q = quantityPattern(), u = '(' + units().re + ')';
        const ways = [
            new RegExp(NOT_BEFORE + q + '\\s+(?:in|to|into|as|in terms of)\\s+' + u, 'gu'),
            new RegExp('\\bhow\\s+many\\s+' + u + '\\s+(?:are\\s+)?(?:in|is|are)\\s+' + q, 'giu')
        ];
        ways.forEach((re, way) => {
            let m;
            while ((m = re.exec(s))) {
                const [value, from, to] = way ? [m[2], m[3], m[1]] : [m[1], m[2], m[3]];
                const a = unitOf(from), b = unitOf(to);
                if (!a || !b || a.g !== b.g || a.u === b.u) continue;
                out.push(Object.assign(quantity(value, a, m.index, m.index + m[0].length, b), { text: m[0] }));
            }
        });
        return out;
    }

    // ---------------- dates ---------------- //

    const MONTHS = 'january february march april may june july august september october november december'.split(' ');
    const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
    const TH = '(?:st|nd|rd|th)?';
    // 2024-03-03, March 3, 2024, 3 March 2024, 3rd of March 2024, 03/04/2024; today
    const DATE = '(?:\\d{4}-\\d{1,2}-\\d{1,2}|' + MONTH + '\\s+\\d{1,2}' + TH + ',?\\s+\\d{4}|\\d{1,2}' + TH + '\\s+(?:of\\s+)?' + MONTH + ',?\\s+\\d{4}|' +
        '\\d{1,2}[/.]\\d{1,2}[/.]\\d{4}|today)';
    const monthOf = (word) => {
        const w = word.toLowerCase().replace('.', '');
        return w === 'sept' ? 9 : MONTHS.findIndex((name) => name.startsWith(w)) + 1;
    };
    const monthDays = (y, m) => (m === 2 ? (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28) : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]);

    // the date of a text DATE found, as 2024-03-03, '' for today; null where it is none. order: of 03/04/2024,
    // 'mdy' as in the US, else the day first; 13/04 and 04/13 are of one way alone
    function readDate(text, order) {
        const t = text.trim().toLowerCase();
        let y, m, d, k;
        if (t === 'today') return '';
        if ((k = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) [y, m, d] = [+k[1], +k[2], +k[3]];
        else if ((k = /^([a-z.]+)\s+(\d{1,2})[a-z]*,?\s+(\d{4})$/.exec(t))) [y, m, d] = [+k[3], monthOf(k[1]), +k[2]];
        else if ((k = /^(\d{1,2})[a-z]*\s+(?:of\s+)?([a-z.]+),?\s+(\d{4})$/.exec(t))) [y, m, d] = [+k[3], monthOf(k[2]), +k[1]];
        else if ((k = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(t))) {
            const mdy = +k[1] > 12 ? false : +k[2] > 12 ? true : order === 'mdy';
            [y, m, d] = mdy ? [+k[3], +k[1], +k[2]] : [+k[3], +k[2], +k[1]];
        } else return null;
        if (!(y >= 1 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= monthDays(y, m))) return null;
        return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    }

    const SPAN = new RegExp('(?<![\\p{L}\\p{N}])(?:(from|between)\\s+)?(' + DATE + ')\\s*(?:,\\s*)?(to|until|till|through|and|[–—]|\\s-\\s)\\s*(' + DATE + ')(?![\\p{L}\\p{N}])', 'giu');
    const LATER = new RegExp('(?<![\\p{L}\\p{N}.,])(\\d{1,5})\\s+(days?|weeks?|months?|years?)\\s+(from|after|before|since|on from|prior to)\\s+(' + DATE + ')(?![\\p{L}\\p{N}])', 'giu');
    const PLUS = new RegExp('(?<![\\p{L}\\p{N}])(' + DATE + ')\\s*(plus|minus|\\+|[-−–])\\s*(\\d{1,5})\\s+(days?|weeks?|months?|years?)(?![\\p{L}\\p{N}])', 'giu');

    // y, m and days of 3 weeks, 2 years
    function moved(n, what, back) {
        const fields = { y: '0', m: '0', days: '0' };
        const k = /^d/i.test(what) ? 'days' : /^w/i.test(what) ? 'w' : /^m/i.test(what) ? 'm' : 'y';
        const v = (back ? -1 : 1) * n;
        if (k === 'w') fields.days = String(v * 7);
        else fields[k] = String(v);
        return fields;
    }

    // In the text: from one date to another, and a date some days, weeks, months or years on or back
    function findDates(s, order) {
        const out = [];
        let m;
        SPAN.lastIndex = 0;
        while ((m = SPAN.exec(s))) {
            const a = readDate(m[2], order), b = readDate(m[4], order);
            if (a === null || b === null || (a === '' && b === '')) continue;
            if (/^and$/i.test(m[3]) && !/^between$/i.test(m[1] || '')) continue; // 3 May 2024 and 5 May 2024 are two dates
            if (!m[1] && /to|until|till|through/i.test(m[3]) === false && (a === '' || b === '')) continue;
            out.push({ from: m.index, to: m.index + m[0].length, kind: 'span', panel: 'dates', card: 'span', text: m[0], fields: { a: a, b: b } });
        }
        [LATER, PLUS].forEach((re, way) => {
            re.lastIndex = 0;
            while ((m = re.exec(s))) {
                const [n, what, how, date] = way ? [m[3], m[4], m[2], m[1]] : [m[1], m[2], m[3], m[4]];
                const d = readDate(date, order);
                if (d === null || !+n) continue;
                const back = /before|prior|minus|-|−|–/i.test(how), since = /since/i.test(how);
                if (since) continue; // 3 years since 2020: a time already, not a date to find
                out.push({ from: m.index, to: m.index + m[0].length, kind: 'later', panel: 'dates', card: 'add', text: m[0], fields: Object.assign({ d: d }, moved(+n, what, back)) });
            }
        });
        return out;
    }

    // ---------------- money ---------------- //

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
            let x, money = null, r = null, n = null;
            while ((x = amount.exec(part))) {
                const v = amountOf(x[1], x[2], x[3], x[4]);
                if ((x[1] || x[4] || v >= 1000) && !/^\s?(?:%|percent|years?|yrs?|-year|months?)/i.test(part.slice(x.index + x[0].length))) {
                    money = { v: v, from: x.index, to: x.index + x[0].length };
                    break;
                }
            }
            if ((x = rate.exec(part))) r = { v: +x[1], from: x.index, to: x.index + x[0].length };
            if ((x = years.exec(part))) n = { v: +x[1], from: x.index, to: x.index + x[0].length };
            if (!money || !r || !n || !(n.v > 0 && n.v <= 50)) continue;
            const from = start + Math.min(money.from, r.from, n.from, a - start), to = start + Math.max(money.to, r.to, n.to, b - start);
            out.push({ from: from, to: to, kind: 'loan', panel: 'solve', card: 'schedule', text: s.slice(from, to),
                fields: { loan: String(money.v), rate: String(r.v), years: String(n.v), py: '12' } });
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
            const money = m[2] && m[5], words = !!m[1];
            if (!money && !words) continue;
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

    // ---------------- in the text ---------------- //

    // All of these in a text, the first and longest of two that overlap
    // each reader only where the text has what it needs, as most lines of a page have none of them
    function find(s, order) {
        if (!/\d/.test(s)) return [];
        const all = [].concat(/\s(?:in|to|into|as)\s|how\s+many/i.test(s) ? findUnits(s) : [], /\d{4}|today/i.test(s) ? findDates(s, order) : [],
            /loan|mortgage|compounded|from/i.test(s) ? findMoney(s) : [], s.includes('=') ? findSystems(s) : [],
            /choose|nCr|nPr|binom|\(/.test(s) ? findChoices(s) : [], /\di/.test(s) ? findComplex(s) : []);
        all.sort((a, b) => a.from - b.from || b.to - a.to);
        const kept = [];
        all.forEach((c) => {
            if (!kept.some((o) => o.from < c.to && c.from < o.to)) kept.push(c);
        });
        return kept;
    }

    // ---------------- selected ---------------- //

    const UUID = /^(?:urn:uuid:)?\{?([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})\}?$/i;

    // Text selected that is one of these alone: a code of a computer; a list of numbers; a quantity, a date, a time
    // on; a whole number, a decimal. Null for none
    function picked(text, order) {
        const raw = String(text).trim(), t = raw.replace(/\s+/g, ' ');
        if (!t) return null;
        const whole = (c) => Object.assign(c, { from: 0, to: t.length, text: c.text || t });
        let m;
        const list = listOf(raw);
        if (list) return whole(list);
        if (t.length > 300) return null;
        if ((m = /^(0x[0-9a-f]+|0b[01]+|0o[0-7]+)$/i.exec(t.replace(/[_']/g, '')))) {
            const v = BigInt(m[1].toLowerCase());
            const bits = [8, 16, 32, 64, 128].findIndex((b) => v < BigInt(2) ** BigInt(b));
            if (bits > -1) return whole({ kind: 'bits', panel: 'numbers', card: 'bits', value: v, fields: { e: m[1], bits: String(Math.max(2, bits)) } });
        }
        if ((m = UUID.exec(t))) return whole({ kind: 'uuid', panel: 'numbers', card: 'uuid', fields: { u: m[1] } });
        if (/^\d{10}$|^\d{13}$/.test(t)) {
            const ms = t.length === 13 ? +t : +t * 1000;
            if (ms >= Date.UTC(2001, 8, 9) && ms < Date.UTC(2100, 0, 1)) return whole({ kind: 'unix', panel: 'dates', card: 'unix', fields: { convert: '0', ts: t } });
        }
        if (isBase64(t)) return whole({ kind: 'base64', panel: 'numbers', card: 'base64', fields: { b: t, enc: '2' } });
        const date = readDate(t.replace(/^(?:mon|tues|wednes|thurs|fri|satur|sun)day,?\s+/i, ''), order);
        if (date) return whole({ kind: 'date', panel: 'dates', card: 'span', fields: { a: date, b: '' } }); // to today
        if ((m = /^in\s+(\d{1,5})\s+(days?|weeks?|months?|years?)$/i.exec(t)) || (m = /^(\d{1,5})\s+(days?|weeks?|months?|years?)\s+(?:from\s+(?:now|today)|later|on)$/i.exec(t))) {
            return whole({ kind: 'later', panel: 'dates', card: 'add', fields: Object.assign({ d: '' }, moved(+m[1], m[2], false)) });
        }
        if (Units && (m = new RegExp('^' + quantityPattern() + '$', 'u').exec(t))) {
            const unit = unitOf(m[2]);
            if (unit) return whole(quantity(m[1], unit, 0, t.length));
        }
        if ((m = /^[$€£¥]?\s?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)$/.exec(t.replace(/^[-−–]/, '')))) {
            const sign = /^[-−–]/.test(t) ? '-' : '', n = sign + m[1].replace(/,/g, '');
            if (/^-?\d{1,20}$/.test(n)) return whole({ kind: 'whole', panel: 'numbers', card: 'factors', fields: { n: n } });
            if (/\./.test(n)) return whole({ kind: 'decimal', panel: 'numbers', card: 'fraction', fields: { x: n } });
        }
        return null; // what is in it, with the sums: answers.js
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

    // Numbers selected, three or more: a column of a table, a line of them with spaces or commas between,
    // $1,200.50 and 12% as well. A heading or two of a column is left out
    function listOf(text) {
        const t = String(text).trim();
        if (t.length > 20000) return null;
        const cell = /^[$€£¥]?\s?[-−–+]?[$€£¥]?\s?(?:\d{1,3}(?:,\d{3})+(?!\d)|\d+)(?:\.\d+)?%?$|^[-−–+]?\.\d+%?$/;
        const number = (p) => valueOf(p.replace(/%$/, ''));
        let parts;
        if (/[\n\t]/.test(t)) {
            parts = t.split(/[\n\t]+/).map((p) => p.trim()).filter(Boolean);
            const numbers = parts.filter((p) => cell.test(p));
            if (numbers.length < 3 || parts.length - numbers.length > 2 || !cell.test(parts[parts.length - 1])) return null;
            parts = numbers;
        } else if (/,\s/.test(t) || /;/.test(t)) {
            parts = t.split(/\s*[,;]\s+|\s*;\s*/).map((p) => p.trim());
        } else if (/^[\d.,\s$€£¥%+\-−–]+$/.test(t) && / /.test(t)) {
            parts = t.split(/\s+/);
        } else if (/^[\d.\s,-]+$/.test(t) && !/\d,\d{3}(?!\d)/.test(t)) {
            parts = t.split(/\s*,\s*/);
        } else {
            return null;
        }
        if (parts.length < 3 || parts.length > 5000 || !parts.every((p) => cell.test(p))) return null;
        const values = parts.map(number);
        if (!values.every(isFinite)) return null;
        return { kind: 'list', panel: 'stats', fields: { list: values.join(' ') }, values: values, text: values.length + ' numbers' };
    }

    // ---------------- the tips ---------------- //

    // What the tip of each says: { title, lines, rows, note, more }, as answers.js shows them. M, E and U: the
    // calculator's maths, engine and units; unit, of angles. Of equations together, their card is found here
    function tipOf(c, M, E, U, unit) {
        const f = c.fields;
        switch (c.kind) {
            case 'unit': {
                const group = U.units[c.unit.g], from = group.list[c.unit.u], sym = (u) => u.s.replace(/<sup>(\d)<\/sup>/g, (m, d) => SUPER_OF[d]);
                const say = (u, i) => [sym(u) + ' (' + u.t + ')', shown(U.convert(c.unit.g, c.unit.u, i, c.value), 7)];
                const others = group.list.map((u, i) => [u, i]).filter(([u, i]) => i !== c.unit.u && (!c.target || i !== c.target.u));
                return {
                    title: shown(c.value) + ' ' + sym(from),
                    lines: c.target ? ['= ' + shown(U.convert(c.unit.g, c.unit.u, c.target.u, c.value), 9) + ' ' + sym(group.list[c.target.u])] : [],
                    rows: others.slice(0, c.target ? 4 : 8).map(([u, i]) => say(u, i)),
                    more: 'Click to open it in the converter, in ' + group.c.toLowerCase() + '.'
                };
            }
            case 'list': {
                const s = E.stats(f.list, false, 0);
                return {
                    title: s.n + ' numbers',
                    rows: [['Sum', shown(s.sum)], ['Mean', shown(s.mean)], ['Median', shown(s.median)], ['σ of a sample', shown(s.sds)],
                        ['Smallest', shown(s.min)], ['Largest', shown(s.max)]],
                    more: 'Click to open them in the statistics.'
                };
            }
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
                    rows: [['Fraction', frac], ['Rounded', shown(Math.round(x * 100) / 100)], ['Whole part', shown(Math.trunc(x))], ['Percent', shown(x * 100) + '%']],
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
            case 'unix': {
                const ms = f.ts.length === 13 ? +f.ts : +f.ts * 1000, at = new Date(ms);
                return {
                    title: 'Unix time ' + f.ts,
                    rows: [['UTC', at.toISOString().replace('T', ' ').replace(/(\.000)?Z$/, '')], ['Here', at.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })]],
                    note: f.ts.length === 13 ? 'Of 13 digits: milliseconds.' : 'Seconds from 1 January 1970, in UTC.', more: 'Click to open it in Unix time.'
                };
            }
            case 'date':
            case 'span':
            case 'later':
                return dateTip(c, M);
            case 'loan': {
                const r = M.amortize(+f.loan, +f.rate, +f.years, 12, 1);
                if (r.error) return null;
                return {
                    title: shown(+f.loan) + ' at ' + f.rate + '% for ' + f.years + ' years',
                    lines: [money(r.payment) + ' a month'],
                    rows: [['Payments', String(r.n)], ['Total interest', money(r.interest)], ['Total paid', money(+f.loan + r.interest)]],
                    note: 'Each at the end of its month.', more: 'Click to open it in the loan calculator, with its table.'
                };
            }
            case 'rates': {
                const m = f.m === 'inf' ? Infinity : +f.m, apy = M.effectiveRate(+f.apr, m);
                return { title: f.apr + '% compounded ' + (m === Infinity ? 'continuously' : m + ' times a year'), lines: ['= ' + shown(+apy.toPrecision(8)) + '% a year (APY)'],
                    more: 'Click to open it in Interest rates.' };
            }
            case 'change': {
                const r = M.percentChange(+f.a, +f.b), sign = (v) => (v > 0 ? '+' : '') + shown(v);
                return {
                    title: shown(+f.a) + ' → ' + shown(+f.b),
                    lines: [sign(+(r.percent.toPrecision(10))) + '%'],
                    rows: [[c.points ? 'Points' : 'Change', sign(r.change)], ['To ÷ From', shown(r.ratio)]],
                    more: 'Click to open it in Percentage change.'
                };
            }
            case 'system': {
                const evaluate = (text) => {
                    try {
                        const e = new E();
                        if (!e.paste(text, unit, true) || e.error) return null;
                        e.press('=', unit);
                        return e.error ? null : +e.value;
                    } catch (err) {
                        return null;
                    }
                };
                const card = systemCard(c, evaluate);
                if (!card) return null;
                c.card = card.card;
                c.fields = card.fields;
                const say = (name, v) => name + ' = ' + shown(v);
                let lines;
                if (card.rows) {
                    const r = M.linear(card.rows);
                    lines = !r ? ['–'] : r.none ? ['No answer: they cannot all hold'] : r.many ? ['Many answers'] : r.x.map((v, i) => say('xyz'[i], v));
                } else {
                    const r = M.system2([c.eqs[0], c.eqs[1]], false, unit, true);
                    lines = r.error ? ['–'] : r.many ? ['Many answers, along a curve'] : !r.points.length ? ['No point found where both hold'] :
                        r.points.slice(0, 4).map((p) => '(' + shown(p.x) + ', ' + shown(p.y) + ')');
                }
                return { title: c.eqs.join(',  ').replace(/-/g, '–'), lines: lines,
                    more: 'Click to open it in ' + { system2: 'Two equations', system3: 'Three equations', curves: 'Two curves' }[card.card] + '.' };
            }
            case 'exact': {
                const r = M.exact(f.e, false);
                if (!r || r.error) return null;
                const top = String(r.top), digits = top.replace('-', '').length;
                return { title: f.e, lines: ['= ' + (digits > 40 ? top.slice(0, 30) + '… (' + digits + ' digits)' : BigInt(top).toLocaleString('en-US'))],
                    more: 'Click to open it in Exactly, every digit.' };
            }
            case 'complex': {
                const z = M.complex(f.z, false, unit);
                if (!z || !isFinite(z.re) || !isFinite(z.im)) return null;
                const p = M.polar(z, unit), im = Math.abs(z.im);
                const text = !z.im ? shown(z.re) : (z.re ? shown(z.re) + (z.im < 0 ? ' – ' : ' + ') : z.im < 0 ? '–' : '') + (im === 1 ? '' : shown(im)) + 'i';
                return { title: c.text.replace(/-/g, '–'), lines: ['= ' + text], rows: [['|z|', shown(p.r)], ['Angle', shown(p.theta) + (unit === 1 ? '°' : '')]],
                    more: 'Click to open it in Complex number.' };
            }
        }
        return null;
    }

    // Of dates: the time from one to another, the date some time on, a date alone and its time from today
    function dateTip(c, M) {
        const f = c.fields, now = new Date();
        const today = M.dayFrom(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const dayOf = (iso) => (iso ? M.dayFrom(+iso.slice(0, 4), +iso.slice(5, 7), +iso.slice(8, 10)) : today);
        const text = (day) => {
            const d = M.dateOf(day), t = new Date(0);
            t.setUTCFullYear(d.y, d.m - 1, d.d);
            return t.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        };
        const count = (n, what) => n.toLocaleString('en-US') + ' ' + what + (Math.abs(n) === 1 ? '' : 's');
        const parts = (r) => [[r.years, 'year'], [r.months, 'month'], [r.rest, 'day']].filter((p) => p[0]).map((p) => count(p[0], p[1])).join(', ') || '0 days';
        if (c.kind === 'later') {
            const from = dayOf(f.d), to = M.addDate(from, +f.y, +f.m, +f.days);
            if (isNaN(to)) return null;
            return { title: (f.d ? text(from) : 'Today') + ' ' + (+f.y + +f.m + +f.days < 0 ? '–' : '+') + ' ' + c.text.replace(/^.*?(\d+\s+\w+).*$/, '$1'),
                lines: [text(to)], rows: [['Days on', (to - from).toLocaleString('en-US')], ['Day of the year', String(M.dayOfYear(to))], ['Week', String(M.isoWeek(to).week)]],
                more: 'Click to open it in Add or subtract time.' };
        }
        const a = dayOf(f.a), b = dayOf(f.b);
        if (isNaN(a) || isNaN(b)) return null;
        const r = M.datesBetween(a, b), back = r.days < 0;
        if (c.kind === 'date') { // to today: ago, or to come
            return { title: text(a), rows: [[back ? 'To come' : r.days ? 'Ago' : 'Today', r.days ? parts(r) : '–'], ['Days', Math.abs(r.days).toLocaleString('en-US')],
                ['Day of the year', String(M.dayOfYear(a))], ['Week', String(M.isoWeek(a).week)]], more: 'Click to open it in Time between dates, to today.' };
        }
        return {
            title: (f.a ? text(a) : 'Today') + ' to ' + (f.b ? text(b) : 'today'), lines: [(back ? '–' : '') + parts(r)],
            rows: [['Days', Math.abs(r.days).toLocaleString('en-US')], ['Weeks', count(r.weeks, 'week') + (r.weekDays ? ', ' + count(r.weekDays, 'day') : '')],
                ['Weekdays', r.workdays.toLocaleString('en-US')]],
            note: back ? 'The second date is before the first.' : 'Weekdays are Monday to Friday, both dates in.', more: 'Click to open it in Time between dates.'
        };
    }

    const CalcPicks = { find: find, picked: picked, listOf: listOf, readDate: readDate, systemCard: systemCard, tipOf: tipOf, isBase64: isBase64 };
    root.CalcPicks = CalcPicks;
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPicks;
})(typeof window !== 'undefined' ? window : this);
