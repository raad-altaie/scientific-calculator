// The converter of the instant answers, of units and of dates: a quantity to convert, 5 km in miles; a time between
// dates, from 3 March 2024 to 1 June 2026, and a date some days on, 90 days after 1 May 2026. Selected as well: a
// quantity, a date, and a Unix time. units.js, the units of quantities, comes into the page before it. Put into the
// pages while it is turned on (background.js)
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    const Units = root.CalcUnits || (typeof require === 'function' ? require('../units.js') : null);
    const { grouped, SUPER_OF } = Reader;

    // a number as a text writes it: 12, 1,234.5, –3, .5; and its value
    const NUM = '[-−–]?(?:\\d{1,3}(?:,\\d{3})+(?!\\d)|\\d+)(?:\\.\\d+)?|[-−–]?\\.\\d+';
    const valueOf = (text) => +String(text).replace(/[,\s$€£¥]/g, '').replace(/[−–]/, '-');
    const NOT_BEFORE = '(?<![\\p{L}\\p{N}_.,])';
    const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

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

    // ---------------- in the text ---------------- //

    // the conversions and dates of a text; each reader only where the text has what it needs
    function find(s, order) {
        if (!/\d/.test(s)) return [];
        return [].concat(/\s(?:in|to|into|as)\s|how\s+many/i.test(s) ? findUnits(s) : [], /\d{4}|today/i.test(s) ? findDates(s, order) : []);
    }

    // Text selected that is one of these alone: a Unix time; a date, a time on; a quantity. Null for none
    function picked(text, order) {
        const t = String(text).trim().replace(/\s+/g, ' ');
        if (!t || t.length > 300) return null;
        const whole = (c) => Object.assign(c, { from: 0, to: t.length, text: c.text || t });
        let m;
        if (/^\d{10}$|^\d{13}$/.test(t)) {
            const ms = t.length === 13 ? +t : +t * 1000;
            if (ms >= Date.UTC(2001, 8, 9) && ms < Date.UTC(2100, 0, 1)) return whole({ kind: 'unix', panel: 'dates', card: 'unix', fields: { convert: '0', ts: t } });
        }
        const date = readDate(t.replace(/^(?:mon|tues|wednes|thurs|fri|satur|sun)day,?\s+/i, ''), order);
        if (date) return whole({ kind: 'date', panel: 'dates', card: 'span', fields: { a: date, b: '' } }); // to today
        if ((m = /^in\s+(\d{1,5})\s+(days?|weeks?|months?|years?)$/i.exec(t)) || (m = /^(\d{1,5})\s+(days?|weeks?|months?|years?)\s+(?:from\s+(?:now|today)|later|on)$/i.exec(t))) {
            return whole({ kind: 'later', panel: 'dates', card: 'add', fields: Object.assign({ d: '' }, moved(+m[1], m[2], false)) });
        }
        if (Units && (m = new RegExp('^' + quantityPattern() + '$', 'u').exec(t))) {
            const unit = unitOf(m[2]);
            if (unit) return whole(quantity(m[1], unit, 0, t.length));
        }
        return null;
    }

    // ---------------- the tips ---------------- //

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

    // What the tip of each says, by the calculator's units and maths
    function tip(c, unit, lib) {
        const f = c.fields;
        switch (c.kind) {
            case 'unit': {
                const U = lib.units, group = U.units[c.unit.g], from = group.list[c.unit.u], sym = (u) => u.s.replace(/<sup>(\d)<\/sup>/g, (m, d) => SUPER_OF[d]);
                const say = (u, i) => [sym(u) + ' (' + u.t + ')', grouped(U.convert(c.unit.g, c.unit.u, i, c.value), 7)];
                const others = group.list.map((u, i) => [u, i]).filter(([u, i]) => i !== c.unit.u && (!c.target || i !== c.target.u));
                return {
                    title: grouped(c.value) + ' ' + sym(from),
                    lines: c.target ? ['= ' + grouped(U.convert(c.unit.g, c.unit.u, c.target.u, c.value), 9) + ' ' + sym(group.list[c.target.u])] : [],
                    rows: others.slice(0, c.target ? 4 : 8).map(([u, i]) => say(u, i)),
                    more: 'Click to open it in the converter, in ' + group.c.toLowerCase() + '.'
                };
            }
            case 'unix': {
                const ms = f.ts.length === 13 ? +f.ts : +f.ts * 1000, at = new Date(ms);
                return {
                    title: 'Unix time ' + f.ts,
                    rows: [['UTC', at.toISOString().replace('T', ' ').replace(/(\.000)?Z$/, '')], ['Here', at.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })]],
                    note: f.ts.length === 13 ? 'Of 13 digits: milliseconds.' : 'Seconds from 1 January 1970, in UTC.', more: 'Click to open it in Unix time.'
                };
            }
        }
        return dateTip(c, lib.maths);
    }

    const CalcPageConverter = {
        name: 'converter', kinds: ['unit', 'span', 'later', 'date', 'unix'],
        find: find, tier: 1, picked: picked, tip: tip, readDate: readDate
    };
    Reader.add(CalcPageConverter);
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPageConverter;
})(typeof window !== 'undefined' ? window : this);
