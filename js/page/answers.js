// The instant answers on the pages: each sum, and what each feature turned on reads, an equation, a curve, a
// quantity to convert, a reaction, that the calculator can work out gets a small calculator icon after it, in its
// line. Over the icon its result shows, and a click opens the calculator with it. Pages only get this script once its
// option is turned on, on the options page; it is off at first. What is read is reader.js's, and each feature's, a
// file of its own (solve.js, graph.js, numbers.js, formulas.js, converter.js, statistics.js, chemistry.js, physics.js,
// biology.js), which background.js puts into the page before this script while it is turned on. The text of the page
// is read here, in the browser: only what is clicked goes to the calculator, and nothing leaves the computer. The
// calculator's engine comes into the page only when there is maths on it, and its solver when its tip shows; chem.js,
// physics.js and biology.js only when there is chemistry, physics or biology (background.js)
(function (root) {
    'use strict';

    const Reader = root.CalcPageReader || (typeof require === 'function' ? require('./reader.js') : null);

    // In Node, for the tests: every feature, and what is read of a text, as this script read it before them
    if (typeof module !== 'undefined' && module.exports) {
        ['./statistics.js', './converter.js', './numbers.js', './solve.js', './graph.js', './chemistry.js', './physics.js', './biology.js'].forEach((file) => require(file));
        const Formulas = require('./formulas.js');
        module.exports = { find: Reader.find, fromTex: Reader.fromTex, formal: Reader.formal, tidy: Reader.tidy, canon: Formulas.canon,
            lineOfHtml: Formulas.lineOfHtml, namedIndex: Formulas.namedIndex, findNamed: Formulas.findNamed, formulaOf: Formulas.formulaOf,
            selected: Reader.selected, without: Reader.without, siteOf: Reader.siteOf, offOn: Reader.offOn };
        return;
    }
    if (!Reader || typeof document === 'undefined' || !(document.documentElement instanceof HTMLElement) || !document.body) return;

    // this copy of the script is from before the extension was updated or reloaded: its
    // chrome.runtime.id is gone, and getting the icons' logo below would be blocked as unsafe, and noisy
    if (!chrome.runtime?.id) return;

    // ---------------- the icons on the page ---------------- //

    const id = 'scientific-calculator-page-maths';
    const TAG = 'scientific-calculator-maths'; // an icon, in the text after its sum
    const STOP = 'scientific-calculator-maths-stop'; // told to an older copy of this script: it takes its icons out
    const MAX = 400; // icons on a page at most
    const UNITS = ['Rad', 'Deg', 'Grad']; // as the calculator names them
    // what is not read: code, boxes to type in, and what is not text
    const SKIP = 'script, style, noscript, template, textarea, input, select, option, button, code, pre, kbd, samp, svg, math, canvas, iframe, object, video, audio, ' +
        '.katex, .mwe-math-element, mjx-container, [class^="MathJax"], [class*=" MathJax"]';
    // the formulas drawn by Wikipedia, KaTeX and MathJax, and MathML itself: each is read as one formula
    const FORMAL_BOX = '.katex, .mwe-math-element, mjx-container, [class^="MathJax"], [class*=" MathJax"], math';
    // of a date 03/04/2024: the month first on a page of the US, else the day
    const lang = document.documentElement.lang || navigator.language || '';
    const ORDER = /-US$/i.test(lang) || (/^en$/i.test(lang) && /-US$/i.test(navigator.language || '')) ? 'mdy' : 'dmy';
    // the elements within a line of text; any other starts a line of its own
    const INLINE = new Set(['A', 'ABBR', 'B', 'BDI', 'BDO', 'BIG', 'CITE', 'DATA', 'DEL', 'DFN', 'EM', 'FONT', 'I', 'INS', 'LABEL',
        'MARK', 'NOBR', 'Q', 'S', 'SMALL', 'SPAN', 'STRIKE', 'STRONG', 'SUB', 'SUP', 'TIME', 'TT', 'U', 'VAR']);
    // a text with no operator or address, and no number or x, has no sum, and is not read further
    const QUICK = /[-+−–×*·⋅÷/^=√⁰¹²³⁴⁵⁶⁷⁸⁹<>≤≥!%]|sin|cos|tan|log|ln|sqrt|exp|abs|mod|\d\.\d+\.\d+\.\d/i;

    // An older copy of this script (the extension was updated, or the features were chosen again) no longer
    // works: it takes its icons out of the text, which it puts back as it was, and this copy puts them in again
    document.dispatchEvent(new Event(STOP));
    document.getElementById(id)?.remove();

    // the layer of the tip, over the page
    const layer = document.createElement('div');
    const layerRoot = layer.attachShadow({ mode: 'closed' });
    const tipSheet = new CSSStyleSheet();
    const markSheet = new CSSStyleSheet();
    const tip = document.createElement('div');
    let marks = []; // in the order they went in: { host, button, block, c, value, answer, head, headText, tail, tailText }
    let unit = 0; // the calculator's unit of angles: 0 Rad, 1 Deg, 2 Grad
    let tipFor = null; // the icon whose result shows
    let fontAsked = false;

    layer.id = id;
    // placed in the page, not over the window, so the tip goes with the text as it scrolls
    layer.style.cssText = 'all: initial !important; position: absolute !important; left: 0 !important; top: 0 !important; ' +
        'width: 0 !important; height: 0 !important; z-index: 2147483646 !important; display: block !important;';

    // Style sheets made here are not stopped by the security rules of the page. An icon is a letter
    // of the line, as big as its text, within limits, and sits on it as a letter does
    markSheet.replaceSync(`
        button {
            all: initial;
            display: inline-block;
            box-sizing: border-box;
            font-size: inherit;
            width: clamp(12px, 0.95em, 18px);
            height: clamp(12px, 0.95em, 18px);
            margin: 0 0.12em 0 0.22em;
            vertical-align: -0.14em;
            cursor: pointer;
            opacity: 0.85;
            transition: opacity 0.15s, transform 0.15s ease-out;
            -webkit-user-select: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        img {
            display: block;
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.35));
            pointer-events: none;
        }

        button:hover,
        button.on {
            opacity: 1;
            transform: scale(1.15);
        }

        @media print {
            button {
                display: none;
            }
        }
    `);

    // the tip is the calculator's own, as over its keys
    tipSheet.replaceSync(`
        .tip {
            position: absolute;
            width: max-content; /* its layer has no width to fit in */
            max-width: 260px;
            box-sizing: border-box;
            padding: 8px 10px 9px;
            background: #1f333c;
            border: 1px solid #4d6b80;
            border-radius: 7px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
            color: #d3d9e2;
            font: 12px/1.4 'Scientific Calculator Play', 'Play', sans-serif;
            text-align: left;
            white-space: normal;
            pointer-events: none;
            -webkit-user-select: none;
            user-select: none;
            animation: tip-in 0.12s ease-out;
        }

        .tip[hidden] {
            display: none;
        }

        @keyframes tip-in {
            from {
                opacity: 0;
                transform: translateY(3px);
            }
        }

        /* the point toward the icon, as the calculator's tip has */
        .tip::before,
        .tip::after {
            content: '';
            position: absolute;
            left: var(--arrow, 50%);
            clip-path: polygon(0 0, 100% 0, 50% 100%);
        }

        .tip::before {
            top: 100%;
            width: 14px;
            height: 7px;
            margin-left: -7px;
            background: #4d6b80;
        }

        .tip::after {
            top: calc(100% - 1px);
            width: 13.172px;
            height: 6.586px;
            margin-left: -6.586px;
            background: #1f333c;
        }

        .tip.below::before,
        .tip.below::after {
            top: auto;
            clip-path: polygon(50% 0, 100% 100%, 0 100%);
        }

        .tip.below::before {
            bottom: 100%;
        }

        .tip.below::after {
            bottom: calc(100% - 1px);
        }

        /* its head: what it is, and at the right the feature it is of, as the options name them */
        .head {
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }

        .eq {
            flex: 1;
            min-width: 0;
            color: #acb4c1;
            overflow-wrap: anywhere;
        }

        .kind {
            flex: none;
            margin-top: 1px;
            padding: 0 5px;
            border-radius: 4px;
            background: #34505e;
            color: #d3d9e2;
            font-size: 10px;
            line-height: 15px;
        }

        .value {
            margin-top: 3px;
            color: #fff;
            font-size: 16px;
            line-height: 1.3;
            overflow-wrap: anywhere;
        }

        .plot {
            display: block;
            width: 236px;
            height: 118px;
            margin: 6px 0 2px;
            background: #172830;
            border-radius: 4px;
        }

        .plot .axis {
            fill: none;
            stroke: #4d6b80;
            stroke-width: 1;
        }

        .plot .curve {
            fill: none;
            stroke: #e7868f;
            stroke-width: 2;
            stroke-linejoin: round;
        }

        /* the icon of text selected: at its end, in its line, over the page */
        .pick {
            all: initial;
            position: absolute;
            width: 18px;
            height: 18px;
            cursor: pointer;
            transition: opacity 0.15s, transform 0.15s ease-out;
            -webkit-tap-highlight-color: transparent;
        }

        .pick img {
            display: block;
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
            pointer-events: none;
        }

        .pick:hover,
        .pick.on {
            opacity: 1;
            transform: scale(1.15);
        }

        .pick[hidden] {
            display: none;
        }

        .rows {
            display: grid;
            grid-template-columns: auto auto;
            gap: 2px 10px;
            margin-top: 5px;
        }

        .rows span:nth-child(odd) {
            color: #acb4c1;
        }

        .rows span:nth-child(even) {
            color: #fff;
            font-size: 13px;
            overflow-wrap: anywhere;
        }

        .note {
            margin-top: 3px;
            color: #acb4c1;
            font-size: 11px;
        }

        .more {
            margin-top: 5px;
            padding-top: 4px;
            border-top: 1px solid #34505e;
            color: #acb4c1;
            font-size: 11px;
        }

        @media print {
            .tip {
                display: none;
            }
        }
    `);
    layerRoot.adoptedStyleSheets = [tipSheet];
    tip.className = 'tip';
    tip.hidden = true;
    layerRoot.appendChild(tip);

    const alive = () => layer.isConnected && !!chrome.runtime?.id;

    // The extension's files the page shows, the logo of the icons and the font of the tips, as data: URLs from
    // background.js: a page may refuse to load them from the extension itself, as YouTube does ("Unsafe attempt to
    // load URL chrome-extension://…"), and their fetch too. '' if they cannot be had
    const pageFile = (file) => new Promise((done) => {
        try {
            chrome.runtime.sendMessage({ command: 'page-file', file: file }, (url) => done(!chrome.runtime.lastError && url || ''));
        } catch (e) {
            done(''); // the extension was updated or turned off
        }
    });

    // the logo, asked once for all the icons
    const logoUrl = pageFile('imgs/icon128.png');
    const setLogo = (img) => logoUrl.then((url) => { if (url) img.src = url; });

    // the width of the window without its scroll bar; of the body in an old page, in quirks mode
    const roomAcross = () => (document.compatMode === 'BackCompat' ? document.body : document.documentElement).clientWidth;

    // ---------------- reading the page ---------------- //

    // the line an element is in: the element that holds it, as a paragraph
    function blockOf(el) {
        while (INLINE.has(el.tagName) && el.parentElement) el = el.parentElement;
        return el;
    }

    // A line of the page as one text, its sum split by no tag: 3<sup>2</sup> + 4<sup>2</sup> is read
    // 3² + 4². segs: where each part of the text is in the page, those of a text node; subs: where the
    // digits of a <sub> are, H<sub>2</sub>O read H₂O, of a formula and of no sum; ups: where the letter
    // of a <sup> after an X is, and which, X<sup>A</sup> of a cross of the X, of no sum; not a footnote's, tt<sup>a</sup>
    function newRun(block) {
        return { block: block, text: '', segs: [], subs: [], ups: [], sup: null, wrap: false };
    }

    function addText(run, node) {
        const parent = node.parentElement;
        const script = parent.closest('sup, sub');
        const sup = script && run.block.contains(script) ? script : null;
        const data = node.data;

        if (run.sup && run.sup !== sup) { // out of a power
            if (run.wrap) run.text += ')';
            run.sup = null;
        }
        if (!sup) {
            run.segs.push({ at: run.text.length, node: node, off: 0, len: data.length });
            run.text += data;
            return;
        }
        if (sup.tagName === 'SUB') { // x₁, log₂: not of a sum; the digits of H₂O kept, for its formula
            if (!/^\d+$/.test(sup.textContent.trim())) {
                run.text += '\u0001';
                return;
            }
            for (let k = 0; k < data.length; k++) {
                if (!/\d/.test(data[k])) continue;
                run.subs.push(run.text.length);
                run.segs.push({ at: run.text.length, node: node, off: k, len: 1 });
                run.text += Reader.sub(data[k]);
            }
            return;
        }
        if (!run.sup) { // into a power: 2, –1 as ², ⁻¹; x + 1 in brackets; [1], a footnote, is not one
            const all = sup.textContent.trim();
            run.sup = sup;
            run.wrap = !/^[-−–]?\d+$/.test(all);
            if (run.wrap && !/^[\dx+\-−–().\s]+$/.test(all)) {
                const at = data.indexOf(all);
                if (/^[A-Za-z]$/.test(all) && at > -1 && /X$/.test(run.text)) { // a letter alone after an X, of an allele: kept for the biology
                    run.ups.push([run.text.length, all]);
                    run.segs.push({ at: run.text.length, node: node, off: at, len: 1 });
                }
                run.text += '\u0001';
                run.wrap = false;
                return;
            }
            if (run.wrap) run.text += '^(';
        } else if (!run.wrap && !/^[-−–]?\d+$/.test(sup.textContent.trim())) {
            return; // a footnote, its other parts
        }
        for (let k = 0; k < data.length; k++) {
            const ch = run.wrap ? data[k] : Reader.SUPER_OF[data[k]];
            if (!ch) continue; // the spaces of a power
            run.segs.push({ at: run.text.length, node: node, off: k, len: 1 });
            run.text += ch;
        }
    }

    // the place in the page of a character of the run, or just after it with end; null for one the run
    // added, as the ^( of a power
    function point(run, at, end) {
        for (const g of run.segs) {
            if (at >= g.at && at < g.at + g.len) return [g.node, g.off + at - g.at + (end ? 1 : 0)];
        }
        return null;
    }

    function rangeOf(run, from, to) {
        let a = null, b = null;
        for (let k = from; k < to && !a; k++) a = point(run, k, false);
        for (let k = to - 1; k >= from && !b; k--) b = point(run, k, true);
        if (!a || !b) return null;
        const range = document.createRange();
        range.setStart(a[0], a[1]);
        range.setEnd(b[0], b[1]);
        return range;
    }

    function readRun(run, found) {
        if (run.sup && run.wrap) run.text += ')';
        // a number, or x: sin(x) = cos(x); and what the features read with it, each in its turn (reader.js). The
        // digits of a <sub> are of no sum, as before they were read, but of the chemistry's H₂O
        const chars = run.subs.length ? run.text.split('') : null;
        if (chars) run.subs.forEach((at) => { chars[at] = '\u0001'; });
        const text = chars ? chars.join('') : run.text;
        const sums = /[\dπx]/.test(text) && QUICK.test(text) ? Reader.find(text) : [];
        // the letters of its <sup> in it, XᴬXᵃ of a cross; each one character, where the line has a mark for it
        let lettered;
        if (run.ups.length) {
            const all = run.text.split('');
            run.ups.forEach(([at, letter]) => { all[at] = letter; });
            lettered = all.join('');
        }
        Reader.found(text, ORDER, run.text, sums, lettered).forEach((c) => {
            const range = rangeOf(run, c.from, c.to);
            if (range) found.push({ range: range, block: run.block, c: c });
        });
    }

    // A formula drawn as maths: what it is, by its MathML, else its TeX; null if it is none of ours
    function readFormula(math, tex) {
        for (const line of [math && Reader.fromMathML(math), tex && Reader.fromTex(tex)]) {
            const c = line && Reader.marked(line);
            if (c) return c;
        }
        return null;
    }

    // The formulas drawn in an element: Wikipedia's, its MathML hidden for screen readers with its TeX; KaTeX's,
    // its MathML with its TeX; MathJax 3's, its MathML for screen readers; MathJax 2's, its TeX in a script
    // after it; and MathML on its own. The icon goes after the drawing, or at its end in a line of its own
    function collectFormal(top, found) {
        const all = (selector) => (top.matches(selector) ? [top] : []).concat([...top.querySelectorAll(selector)]);
        const done = new Set();
        // the TeX: kept by KaTeX and Wikipedia in an annotation, by MathJax 4 on the math itself
        const tex = (math) => math?.getAttribute('data-latex') || math?.querySelector('annotation[encoding="application/x-tex"]')?.textContent;

        all('.mwe-math-element, .katex, mjx-container').forEach((box) => {
            if (box.parentElement?.closest('.mwe-math-element, .katex, mjx-container')) return;
            const math = box.querySelector('math');
            if (math) done.add(math);
            const c = readFormula(math, tex(math));
            if (!c) return;
            const at = box.matches('.mwe-math-element') ? { el: box } : { el: box.querySelector(':scope > .katex-html') || box, append: true };
            found.push({ anchor: at, block: blockOf(box.parentElement || box), c: c });
        });
        all('script[type^="math/tex"]').forEach((script) => {
            const shown = script.previousElementSibling;
            if (!shown || !/MathJax/.test(shown.className)) return; // not drawn yet
            const c = readFormula(null, script.textContent);
            if (c) found.push({ anchor: { el: shown, append: true }, block: blockOf(shown.parentElement || shown), c: c });
        });
        all('math').forEach((math) => {
            if (done.has(math) || math.parentElement?.closest(FORMAL_BOX)) return;
            const c = readFormula(math, tex(math));
            if (c) found.push({ anchor: { el: math }, block: blockOf(math.parentElement || math), c: c });
        });
    }

    // the sums in an element and all in it, line by line
    function collect(top, found) {
        if (top.isContentEditable || top.closest('code, pre, textarea, [contenteditable=""], [contenteditable="true"]')) return;
        collectFormal(top, found);
        if (top.closest(SKIP)) return;
        // an icon of an older copy, not yet taken out, is not text of the line
        const walker = document.createTreeWalker(top, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.nodeType === 1 && (n.localName === TAG || n.matches(SKIP) || n.isContentEditable) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
        });
        const blocks = new Map(); // of each element, its line
        let run = null;

        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (n.nodeType === 1) {
                if (!INLINE.has(n.tagName) && run) { // a line of its own, or a <br>, ends the line
                    readRun(run, found);
                    run = null;
                }
                continue;
            }
            const parent = n.parentElement;
            if (!parent) continue;
            if (!blocks.has(parent)) blocks.set(parent, blockOf(parent));
            const block = blocks.get(parent);
            if (run && run.block !== block) {
                readRun(run, found);
                run = null;
            }
            if (!run) run = newRun(block);
            addText(run, n);
        }
        if (run) readRun(run, found);
    }

    // ---------------- the calculator ---------------- //

    // The engine, and with 'maths' the solver, put into this page by background.js the first time they
    // are needed; with 'chem', 'phys' or 'bio', chem.js, physics.js or biology.js alone, by their names in the
    // page. Each asked once
    const LIBS = { chem: 'CalcChem', phys: 'CalcPhysics', bio: 'CalcBiology' };
    const loading = {};
    function load(what) {
        const has = () => !!window[LIBS[what] || (what === 'maths' ? 'CalcMaths' : 'CalcEngine')];
        if (has()) return Promise.resolve(true);
        if (!loading[what]) {
            loading[what] = new Promise((done) => {
                try {
                    chrome.runtime.sendMessage({ command: 'page-maths-engine', maths: what === 'maths', lib: LIBS[what] ? what : '' }, () => {
                        void chrome.runtime.lastError;
                        done(has());
                    });
                } catch (e) {
                    done(false); // the extension was updated or turned off
                }
            }).then((ok) => {
                if (!ok) delete loading[what];
                return ok;
            });
        }
        return loading[what];
    }

    // the calculator's own, as they are in this page, for the features to work out with
    const lib = () => ({ engine: window.CalcEngine, maths: window.CalcMaths, units: window.CalcUnits, chem: window.CalcChem, phys: window.CalcPhysics, bio: window.CalcBiology });

    // What a found thing needs put in the page first, as its feature says: the engine, 'engine', of a sum as well;
    // chem.js for the chemistry, 'chem', physics.js and biology.js for theirs, 'phys' and 'bio'; or nothing, null,
    // for a formula or a constant only told of. And what its tip
    // needs, 'maths' unless its feature says
    const needs = (c) => {
        const f = Reader.featureOf(c);
        return f && 'needs' in f ? f.needs : 'engine';
    };
    const uses = (f) => ('uses' in f ? f.uses : 'maths');

    // a sum worked out as the calculator would, in its unit of angles; null if it gives an error
    const workOut = (text) => Reader.workOut(text, unit, window.CalcEngine);

    // What is found is one the calculator works out: a sum to a number; else what its feature says, as an
    // equation the solver reads, or a reaction chem.js balances
    function checked(c, value) {
        if (c.kind === 'sum') return value !== null;
        const f = Reader.featureOf(c);
        try {
            return !!f && (!f.check || f.check(c, unit, lib()));
        } catch (e) {
            return false;
        }
    }

    const { shown, pretty } = Reader;
    // each feature by its name on the options page, for the head of its tips
    const FEATURE_NAMES = { formulas: 'Formulas', converter: 'Converter', graph: 'Graph', numbers: 'Numbers', solve: 'Solve', chemistry: 'Chemistry',
        physics: 'Physics', biology: 'Biology', statistics: 'Statistics' };

    // What the tip says: { title, lines, svg, rows, note, more }. A sum is worked out already; the rest by its
    // feature the first time the tip shows, once what it needs is in the page, as the solver
    function answer(mark) {
        const c = mark.c;
        if (c.kind === 'sum') {
            const f = c.frac && window.CalcEngine.fraction(mark.value); // 5/6, as the calculator's a/b shows it
            return Promise.resolve({ lines: f ? ['= ' + (f[0] < 0 ? '–' : '') + Math.abs(f[0]) + '/' + f[1], '≈ ' + shown(mark.value)] : ['= ' + shown(mark.value)] });
        }
        const f = Reader.featureOf(c);
        if (!f) return Promise.resolve(null);
        const wants = uses(f);
        return (wants === null ? Promise.resolve(true) : load(wants)).then((ok) => {
            try {
                return ok ? f.tip(c, unit, lib()) : null;
            } catch (e) {
                return null;
            }
        });
    }

    // ---------------- the icons ---------------- //

    // A sum found, worked out: its icon goes into the text, just after it
    function add(f) {
        const c = f.c, range = f.range;
        if (marks.length >= MAX) return;
        if (range ? !range.endContainer.isConnected || range.endContainer.nodeType !== 3 || range.collapsed : !f.anchor.el.isConnected) return;
        const value = c.kind === 'sum' ? workOut(c.left) : null;
        // an address is read whole already, and a formula or a constant only told of
        if (!checked(c, value)) return;

        const host = document.createElement(TAG);
        const root = host.attachShadow({ mode: 'closed' });
        const button = document.createElement('button');
        const logo = document.createElement('img');
        const mark = { host: host, button: button, block: f.block, c: c, value: value, answer: null, head: null, headText: '', tail: null, tailText: '' };

        // the styles of the page do not reach it: it has the size of the text round it, and nothing more.
        // nowrap: the line does not break between the sum and its icon
        host.style.cssText = 'all: initial !important; display: inline !important; font-size: inherit !important; line-height: inherit !important; ' +
            'white-space: nowrap !important;';
        root.adoptedStyleSheets = [markSheet];
        button.type = 'button';
        button.tabIndex = -1; // not one more stop for Tab on every sum of the page
        button.setAttribute('aria-label', 'Open in Scientific Calculator');
        setLogo(logo);
        logo.alt = '';
        logo.draggable = false;
        button.appendChild(logo);
        // and a word joiner either side, for the browsers that break there all the same
        root.append('\u2060', button, '\u2060');
        button.addEventListener('pointerenter', () => showTip(mark));
        button.addEventListener('pointerleave', () => hideTip(mark));
        button.addEventListener('click', (event) => {
            event.preventDefault(); // nor does a link round it open
            event.stopPropagation(); // the page does not take the click as its own
            openCalculator(mark);
        });
        if (range) {
            put(mark, range.endContainer, range.endOffset);
        } else if (f.anchor.append) {
            f.anchor.el.appendChild(host);
        } else {
            f.anchor.el.after(host);
        }
        marks.push(mark);
    }

    // The icon in the text at the end of its sum. Where the sum ends its text, as 2 + 3</b>, it goes after
    // the elements that end with it: out of a power, a link. Else the text is split there: the page's
    // text node keeps the sum, and the rest is a text node of its own after the icon
    function put(mark, node, offset) {
        if (offset < node.data.length) {
            mark.head = node;
            mark.tail = node.splitText(offset);
            mark.headText = node.data;
            mark.tailText = mark.tail.data;
            mark.tail.before(mark.host);
            return;
        }
        let after = node;
        while (!after.nextSibling && after.parentElement !== mark.block && INLINE.has(after.parentElement.tagName)) after = after.parentElement;
        after.after(mark.host);
    }

    // The icon out of the text, and the text one again where it was split. Unless the page changed it
    // meanwhile: a page that wrote its text node again, or took it out, has no use for the rest
    function remove(mark) {
        if (tipFor === mark) hideTip(mark);
        mark.host.remove();
        if (!mark.tail) return;
        const head = mark.head, tail = mark.tail;
        if (head.isConnected && head.data === mark.headText && head.nextSibling === tail && tail.data === mark.tailText) {
            head.appendData(tail.data);
            tail.remove();
        } else if (!head.isConnected || head.data !== mark.headText) {
            tail.remove();
        }
    }

    // the icons in these elements, or no longer in the page, taken out: the last first, so a text
    // split twice is put together in the order it was split
    function clear(tops) {
        const gone = marks.filter((mark) => !mark.block.isConnected || !mark.host.isConnected || tops.some((el) => el.contains(mark.block)));
        if (!gone.length) return;
        gone.reverse().forEach(remove);
        marks = marks.filter((mark) => !gone.includes(mark));
    }

    // the font of the calculator, for its tip: put in the page the first time a tip shows
    function loadFont() {
        if (fontAsked) return;
        fontAsked = true;
        pageFile('fonts/Play-Regular.ttf')
            .then((url) => {
                if (!url) return;
                const font = new FontFace('Scientific Calculator Play', 'url(' + url + ')');
                document.fonts.add(font);
                return font.load();
            })
            .catch(() => { }); // the tip has the page's sans-serif
    }

    function showTip(mark) {
        tipFor = mark;
        mark.button.classList.add('on');
        loadFont();
        (mark.answer || (mark.answer = answer(mark))).then((said) => {
            if (tipFor !== mark || !said) return;
            const c = mark.c;
            const head = document.createElement('div');
            const eq = document.createElement('div');
            const kind = document.createElement('div');
            const more = document.createElement('div');

            tip.textContent = '';
            head.className = 'head';
            eq.className = 'eq';
            eq.textContent = said.title || pretty(c.shown || (c.kind === 'sum' ? c.left : c.text), c.frac);
            kind.className = 'kind';
            kind.textContent = c.kind === 'sum' ? 'Sum' : FEATURE_NAMES[(Reader.featureOf(c) || {}).name] || '';
            head.appendChild(eq);
            if (kind.textContent) head.appendChild(kind);
            tip.appendChild(head);
            (said.lines || []).forEach((line) => {
                const value = tip.appendChild(document.createElement('div'));
                value.className = 'value';
                value.textContent = line;
            });
            if (said.svg) tip.appendChild(said.svg);
            if (said.rows) { // a name and its value on each line, as the tiles of a card
                const rows = tip.appendChild(document.createElement('div'));
                rows.className = 'rows';
                said.rows.forEach(([name, value]) => {
                    rows.appendChild(document.createElement('span')).textContent = name;
                    rows.appendChild(document.createElement('span')).textContent = value;
                });
            }
            if (said.note) {
                const note = tip.appendChild(document.createElement('div'));
                note.className = 'note';
                note.textContent = said.note;
            }
            more.className = 'more';
            // an equation of t is solved as one of x; n of a sum of terms is its own
            const solvedFor = c.v && (c.kind === 'equation' || c.kind === 'inequality');
            more.textContent = (c.trig ? 'In ' + UNITS[unit] + '. ' : '') + (c.frac && (said.lines || []).length > 1 ? 'Opens with a/b on, in fractions. ' : '') +
                (solvedFor ? 'Solved for ' + c.v + '; the solver writes it with x. ' : '') + (said.more || 'Click to open it in the calculator.');
            tip.appendChild(more);
            tip.hidden = false;
            placeTip(mark);
        });
    }

    function hideTip(mark) {
        if (tipFor !== mark) return;
        tipFor = null;
        mark.button.classList.remove('on');
        tip.hidden = true;
    }

    // over the icon, or under it with no room above; within the window
    function placeTip(mark) {
        const icon = mark.button.getBoundingClientRect();
        const width = tip.offsetWidth, height = tip.offsetHeight;
        const middle = icon.left + icon.width / 2;
        const left = Math.max(4, Math.min(roomAcross() - width - 4, middle - width / 2));
        const below = icon.top - height - 9 < 0;
        const top = below ? icon.bottom + 9 : icon.top - height - 9;

        tip.classList.toggle('below', below);
        tip.style.left = left + window.scrollX + 'px';
        tip.style.top = top + window.scrollY + 'px';
        tip.style.setProperty('--arrow', Math.max(10, Math.min(width - 10, middle - left)) + 'px');
    }

    // The calculator opens with it: a sum worked out in the display, an equation in its card of the
    // solver, an IP network in its card of the numbers. background.js keeps it for the calculator, and
    // opens Detached Mode
    // What has a card of a panel opens in it, its panel and card with its boxes; a formula or a constant by its
    // name. Equations together have their card once they are worked out, as their tip does
    function openCalculator(mark) {
        const c = mark.c;
        hideTip(mark);
        if (mark === picked) hidePick();
        const ready = c.kind === 'system' && !c.fields.a1 && !c.fields.e1 ? mark.answer || (mark.answer = answer(mark)) : Promise.resolve();
        ready.then(() => {
            try {
                chrome.runtime.sendMessage(c.panel ? { command: 'open-page-maths', text: c.text || '', kind: 'card', fields: Object.assign({ panel: c.panel, card: c.card || '' }, c.fields) } :
                    { command: 'open-page-maths', text: c.kind === 'sum' ? c.left : c.text, kind: c.kind,
                        fields: c.kind === 'sum' ? { frac: c.frac ? '1' : '0' } : c.fields || {} });
            } catch (e) {
                stop(); // the extension was updated or turned off after this page was opened
            }
        });
    }


    // ---------------- text selected ---------------- //

    // Text selected that the calculator reads: an icon at its end, over the page, with the same tip and
    // click as the icons in the text. It goes as the selection does
    const pick = document.createElement('button');
    const pickLogo = document.createElement('img');
    let picked = null; // its mark: { button, c, value, answer }
    let picking = 0;

    pick.type = 'button';
    pick.className = 'pick';
    pick.hidden = true;
    pick.tabIndex = -1;
    pick.setAttribute('aria-label', 'Open the selection in Scientific Calculator');
    setLogo(pickLogo);
    pickLogo.alt = '';
    pickLogo.draggable = false;
    pick.appendChild(pickLogo);
    layerRoot.appendChild(pick);
    pick.addEventListener('pointerenter', () => picked && showTip(picked));
    pick.addEventListener('pointerleave', () => picked && hideTip(picked));
    pick.addEventListener('mousedown', (event) => event.preventDefault()); // the selection stays
    pick.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (picked) openCalculator(picked);
    });

    function hidePick() {
        if (picked) hideTip(picked);
        picked = null;
        pick.hidden = true;
    }

    // What the selection is, worked out as the icons' are; the engine, or chem.js, physics.js or biology.js, is put in
    // first if it is needed
    function whatIs(text) {
        const c = Reader.selected(text, ORDER);
        if (!c) return Promise.resolve(null);
        const wants = needs(c);
        return (wants === null ? Promise.resolve(true) : load(wants)).then((ok) => {
            if (!ok) return null;
            const value = c.kind === 'sum' ? workOut(c.left) : null;
            return checked(c, value) ? { c: c, value: value } : null;
        });
    }

    // The middle of the letters selected, up and down, in the window: measured in their own font, how far
    // they go above their baseline and below it, the baseline as far below the top of their box as the font
    // reaches up. Without a measure, the middle of their box
    let measure = null;
    function middleOf(text, el, r, em) {
        try {
            const style = getComputedStyle(el || document.body);
            measure = measure || document.createElement('canvas').getContext('2d');
            measure.font = style.font || [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');
            const m = measure.measureText(text.trim().split('\n').pop());
            const up = m.fontBoundingBoxAscent, down = m.fontBoundingBoxDescent;
            if (!(up > 0) || !(m.actualBoundingBoxAscent > 0)) return r.top + r.height / 2;
            const baseline = r.top + up * r.height / (up + down || r.height); // the box as the font fills it
            return baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
        } catch (e) {
            return r.top + r.height / 2;
        }
    }

    function readSelection() {
        const sel = window.getSelection();
        const text = sel && !sel.isCollapsed && sel.rangeCount ? sel.toString() : '';
        if (!text.trim() || text.length > 20000) return hidePick(); // a list of numbers may be long, as a column of a table
        const range = sel.getRangeAt(0);
        const box = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        if (!box || box.isContentEditable || box.closest('input, textarea')) return hidePick();
        const ask = ++picking;
        whatIs(text).then((found) => {
            if (ask !== picking || !alive()) return;
            if (!found) return hidePick();
            const rects = range.getClientRects(), r = rects[rects.length - 1] || range.getBoundingClientRect();
            if (!r || (!r.width && !r.height)) return hidePick();
            if (picked) hideTip(picked);
            picked = { button: pick, c: found.c, value: found.value, answer: null };
            const end = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
            const em = parseFloat(getComputedStyle(end || document.body).fontSize) || r.height / 1.2;
            const size = Math.round(Math.max(16, Math.min(26, em * 1.15))); // a little bigger than the letters
            pick.style.width = pick.style.height = size + 'px';
            pick.style.left = Math.min(r.right + 2, roomAcross() - size - 2) + window.scrollX + 'px';
            pick.style.top = middleOf(text, end, r, em) - size / 2 + window.scrollY + 'px';
            pick.hidden = false;
        });
    }

    // once the selection is made: the button let go, or the keys that select
    const onPicked = (event) => {
        if (event.composedPath().includes(layer)) return;
        setTimeout(readSelection, 10);
    };
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (picked && (!sel || sel.isCollapsed)) hidePick();
    });

    // Calculate "…" of the menu of a right click (background.js): the selection opens in the calculator as
    // its icon would; what is none of ours is put in the display as it is, as Paste would
    function openSelected(text) {
        whatIs(text).then((found) => {
            const c = found ? found.c : { kind: 'sum', left: String(text).trim(), text: String(text).trim() };
            openCalculator({ c: c, button: pick });
        });
    }

    // ---------------- following the page ---------------- //

    // the lines whose text changed, read again together a moment later
    const changed = new Set();
    let timer = 0;

    function readAgain(el) {
        changed.add(el);
        if (!timer) timer = setTimeout(readChanged, 300);
    }

    function readChanged() {
        timer = 0;
        if (!alive()) return stop();
        const all = [...changed].filter((el) => el.isConnected);
        const tops = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
        const found = [];

        changed.clear();
        quietly(() => clear(tops));
        tops.forEach((el) => collect(el, found));
        const wants = [...new Set(found.map((f) => needs(f.c)).filter((w) => w !== null))];
        if (wants.length) {
            Promise.all(wants.map(load)).then((oks) => {
                if (alive()) quietly(() => found.forEach((f) => (needs(f.c) === null || oks[wants.indexOf(needs(f.c))]) && add(f)));
            });
        } else if (found.length) {
            quietly(() => found.forEach(add)); // formulas and constants alone need no engine
        }
    }

    // whole lines, as a paragraph or a box put in or taken out, and the spaces between them
    const wholeLines = (nodes) => [...nodes].every((n) => (n.nodeType === 1 ? !INLINE.has(n.tagName) && n.localName !== TAG : !n.data.trim()));

    // A change of the page. Its icons in the lines it changed come out at once, so the page finds its
    // text as it left it, and the lines are read again. Lines put in between others, as a page adds
    // them, are read alone, and those taken out lose their icons, the others keeping theirs
    function heard(list) {
        const lines = new Set(), added = new Set();
        let removed = false;
        list.forEach((m) => {
            const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
            const box = target && target.closest(FORMAL_BOX); // drawn again, as by KaTeX: its line
            const el = box ? box.parentElement || box : target;
            if (!el || !el.isConnected) return;
            if (!box && m.type === 'childList' && !INLINE.has(el.tagName) && wholeLines(m.addedNodes) && wholeLines(m.removedNodes)) {
                m.addedNodes.forEach((n) => n.nodeType === 1 && added.add(n));
                removed = removed || m.removedNodes.length > 0;
                return;
            }
            lines.add(blockOf(el));
        });
        if (lines.size || removed) quietly(() => clear([...lines]));
        lines.forEach(readAgain);
        added.forEach(readAgain);
    }

    const observer = new MutationObserver(heard);

    // what this script changes in the page is not heard as a change of the page; what the page
    // changed before it still is
    function quietly(change) {
        const before = observer.takeRecords();
        change();
        observer.takeRecords();
        if (before.length) heard(before);
    }

    // Taken out, the text as it was: when the option or the website is turned off, or a newer copy
    // comes. It starts again when the website is turned on, unless it is no longer wanted at all
    let retired = false;

    function start() {
        if (retired || layer.isConnected || !chrome.runtime?.id) return;
        document.documentElement.appendChild(layer);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        window.addEventListener('resize', onScroll);
        document.addEventListener('mouseup', onPicked);
        document.addEventListener('keyup', onPicked);
        readAgain(document.body);
    }

    function stop() {
        hidePick();
        quietly(() => clear([document.documentElement]));
        observer.disconnect();
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
        document.removeEventListener('mouseup', onPicked);
        document.removeEventListener('keyup', onPicked);
        clearTimeout(timer);
        layer.remove();
    }

    function onScroll() {
        if (tipFor) hideTip(tipFor);
    }


    // The calculator's unit, as popup.js keeps it: a sum of an angle is worked out again in another
    const readUnit = (value) => {
        unit = value === 1 || value === 2 ? value : 0;
    };

    // for good: the option was turned off, or a newer copy of this script came
    const retire = () => {
        retired = true;
        if (layer.isConnected) stop();
    };
    document.addEventListener(STOP, retire);

    chrome.storage.local.get(['angleUnit', 'pageMathsOff'], (items) => {
        readUnit(items?.angleUnit);
        if (!Reader.offOn(items?.pageMathsOff, location.hostname)) start();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || retired || !chrome.runtime?.id) return;
        if (changes.angleUnit) readUnit(changes.angleUnit.newValue);
        // this website turned off or on: at once, without a reload
        if (changes.pageMathsOff) {
            if (Reader.offOn(changes.pageMathsOff.newValue, location.hostname)) return layer.isConnected && stop();
            if (!layer.isConnected) return start();
        }
        if (changes.angleUnit && alive()) readAgain(document.body);
    });

    // the option was turned off: the icons go right away, the text as it was. Calculate "…" of the
    // menu still reads the selection on a website the icons are turned off on
    chrome.runtime.onMessage.addListener((message, sender, answerIt) => {
        if (message?.command === 'remove-page-maths') retire();
        if (message?.command === 'page-maths-selection' && !retired && chrome.runtime?.id && typeof message.text === 'string') {
            openSelected(message.text);
            answerIt(true); // background.js opens the calculator itself without this page
        }
    });
})(typeof window !== 'undefined' ? window : this);
