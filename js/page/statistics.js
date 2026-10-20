// The statistics of the instant answers: numbers selected, three or more, as a column of a table, their sum, mean,
// median and spread, which open in the statistics. Put into the pages while it is turned on (background.js)
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    const { grouped } = Reader;

    const valueOf = (text) => +String(text).replace(/[,\s$€£¥]/g, '').replace(/[−–]/, '-');

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

    // a list, the whole of what is selected
    function picked(text) {
        const list = listOf(text);
        return list && Object.assign(list, { from: 0, to: String(text).trim().replace(/\s+/g, ' ').length });
    }

    // its sum, mean, median and spread, by the calculator's engine
    function tip(c, unit, lib) {
        const s = lib.engine.stats(c.fields.list, false, 0);
        return {
            title: s.n + ' numbers',
            rows: [['Sum', grouped(s.sum)], ['Mean', grouped(s.mean)], ['Median', grouped(s.median)], ['σ of a sample', grouped(s.sds)],
                ['Smallest', grouped(s.min)], ['Largest', grouped(s.max)]],
            more: 'Click to open them in the statistics.'
        };
    }

    const CalcPageStatistics = { name: 'statistics', kinds: ['list'], picked: picked, uses: 'engine', tip: tip, listOf: listOf };
    Reader.add(CalcPageStatistics);
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPageStatistics;
})(typeof window !== 'undefined' ? window : this);
