// The graph of the instant answers: a function of x in the text, y = x² – 4x + 3 or f(x) = sin(x), and the slope
// of one, d/dx (x³ – 2x), which the solver reads (solve.js); its tip draws it small, and a click draws it in the
// graph. Put into the pages while it is turned on (background.js)
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);
    const { read, shown, pretty, readable } = Reader;

    // y = …, f(x) = …: a function of x to draw, its head and what follows it
    const HEAD = /(?:y|[fgh]\s*\(\s*x\s*\))\s*=\s*/y;
    function readCurve(s, i, formal) {
        HEAD.lastIndex = i;
        const head = HEAD.exec(s);
        const c = head && read(s, i + head[0].length, formal, true);
        if (!c) return null;
        const name = head[0].replace(/\s+/g, '').replace(/=$/, '');
        return Object.assign(c, { from: i, shown: name + ' = ' + c.text });
    }

    // A function of x drawn small, as the graph would at first: x from –10 to 10, y as far as most of it goes, the
    // axes where they are in view; and where it crosses the y axis
    function tip(c, unit, lib) {
        const g = lib.engine.graph(c.fields.f, false, {});
        const W = 236, H = 118, n = 236, xs = [], ys = [];
        const more = 'Click to draw it in the graph.';
        for (let k = 0; k <= n; k++) {
            const x = -10 + 20 * k / n, y = g.at(x, unit);
            xs.push(x);
            ys.push(isFinite(y) ? y : NaN);
        }
        const sorted = ys.filter(isFinite).sort((a, b) => a - b);
        if (!sorted.length) return { title: c.shown || c.text, lines: ['No value from x = –10 to 10'], more: more };
        let lo = sorted[Math.floor(sorted.length * 0.05)], hi = sorted[Math.ceil(sorted.length * 0.95) - 1];
        if (lo > 0 && lo < (hi - lo)) lo = 0; // the x axis in view, when it is near
        if (hi < 0 && -hi < (hi - lo)) hi = 0;
        if (hi - lo < 1e-9) {
            lo -= 1;
            hi += 1;
        }
        const pad = (hi - lo) * 0.08;
        lo -= pad;
        hi += pad;
        const px = (x) => (x + 10) / 20 * W, py = (y) => H - (y - lo) / (hi - lo) * H;
        const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
        const line = (d, cls) => {
            const p = svg.appendChild(document.createElementNS(svgNS, 'path'));
            p.setAttribute('d', d);
            p.setAttribute('class', cls);
        };
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('class', 'plot');
        line('M0 ' + py(0) + 'H' + W + 'M' + px(0) + ' 0V' + H, 'axis');
        let d = '', on = false;
        ys.forEach((y, k) => {
            // no line through where it has no value, nor down a jump out of view, as tan x has
            const out = !isFinite(y) || y < lo - (hi - lo) * 2 || y > hi + (hi - lo) * 2;
            if (out) {
                on = false;
                return;
            }
            d += (on ? 'L' : 'M') + px(xs[k]).toFixed(1) + ' ' + Math.max(-H, Math.min(2 * H, py(y))).toFixed(1);
            on = true;
        });
        line(d, 'curve');
        const at0 = g.at(0, unit);
        return {
            title: pretty(c.shown || c.text), svg: svg,
            rows: [['x', '–10 to 10'], ['y', shown(+lo.toPrecision(3)) + ' to ' + shown(+hi.toPrecision(3))]].concat(isFinite(at0) ? [['At x = 0', shown(at0)]] : []),
            more: more
        };
    }

    const CalcPageGraph = {
        name: 'graph', kinds: ['graph'], at: readCurve, uses: 'engine',
        check: (c, unit, lib) => readable(c.fields.f + '=0', lib.engine), tip: tip
    };
    Reader.add(CalcPageGraph);
    if (typeof module !== 'undefined' && module.exports) module.exports = CalcPageGraph;
})(typeof window !== 'undefined' ? window : this);
