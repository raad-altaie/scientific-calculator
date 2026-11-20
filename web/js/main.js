(function (window) {
    'use strict';
    // the words of the calculator in the language in use (lang.js): tr('Clear'), tr('{n} of {all}', { n: 3, all: 10 }),
    // trn(n, '{n} day', '{n} days'). The words of the page translated first, before anything here reads them
    var tr = CalcLang.t, trn = CalcLang.n, trc = CalcLang.c;
    CalcLang.dom(document.body);
    let root = document.getElementById('calculator'), // the calculator: the page can hold more than it, as the website does
        Calc = root.querySelector('.calc-main'),
        display = Calc.querySelector('.calc-display span'),
        logline = Calc.querySelector('.calc-log'),
        notification = Calc.querySelector(".notification"),
        noticeTimer, // fades the notification out
        mem = Calc.querySelector('.calc-mem'), // 'M' while the memory holds a number
        radDeg = Calc.querySelector('.calc-rad'), // the unit: its text, then a full turn in it, 2π, 360° or 400g
        fullTurn = radDeg.querySelector('.sign'),
        hold = Calc.querySelector('.calc-hold'),
        sto = Calc.querySelector('.calc-sto'), // STO→ while the next letter, A to J, is to take the result
        fmtMark = Calc.querySelector('.calc-fmt'), // FIX 2, SCI 3 or ENG while that notation is on; no number for Auto places
        fracMark = Calc.querySelector('.calc-frac'), // FRAC while fraction mode is on, DMS while °′″ is
        secondKeySet, // the keys the 2nd key changes, found by their names below
        // the arrow of a line of the menu that opens another: Store in Var, Insert Var
        MORE = '<svg class="calc-menu-more" viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" ' +
            'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 1.5L7 5l-3.5 3.5" /></svg>',
        fmt = { notation: 'norm', places: 'auto', group: false }, // set on the options page; group: true for 1,234.5, 'space', 'dot' 1.234,5, 'spacecomma'
        fracMode = false, // a/b: divisions drawn as fractions, and results shown as fractions when they are one
        dmsMode = false, // °′″, the 2nd of a/b: results shown in degrees, minutes and seconds
        slid = false, // the pointer moved along a long line, to slide it or select in it, so it was not a click
        hiddenCopy = Calc.querySelector('textarea'),
        menu = root.querySelector('.calc-menu-box'), // the menu of a right click
        tip = root.querySelector('.calc-tip'), // what the key under the pointer does
        tipKey = null, // that key
        tipTimer = 0, // till it shows, 0 while none is coming
        tipEmpty = false, // that key has no tip: the pointer moving on it does not start the wait again
        tipGone = 0, // when the last tip went, so the next one comes at once
        tipLeave = 0, // the pointer gone from the key of a tip that scrolls: a moment to get on to the tip
        tipNext = null, // where it went, for the tip after that moment
        pressedAt = null, // where a press put the tips away: none again till the pointer moves from there
        scrolledAt = null, // where a scroll put the tips away: none again till the pointer moves from there
        copying = null, // text a history button is copying, in place of the main line
        past = root.querySelector('.calc-past:not(.calc-stats):not(.calc-fx):not(.calc-conv):not(.calc-graph):not(.calc-solve):not(.calc-numbers):not(.calc-chem):not(.calc-phys):not(.calc-bio):not(.calc-find-panel)'), // the history, over the keys
        findPanel = root.querySelector('.calc-find-panel'), // the search, over the keys
        findCalc = root.querySelector('.calc-find-btn'), // and its button, beside the history
        pastList = past.querySelector('.calc-past-list'),
        pastButton = root.querySelector('.calc-hist'),
        pastExport = past.querySelector('.calc-past-export'), // the history copied or saved: a menu of how
        pastClear = past.querySelector('.calc-past-clear'), // of the tab shown: the history, or the letters
        pastTabs = past.querySelector('.calc-past-tabs'), // History, and the letters A to J
        pastTab = 'history', // the tab shown: the history, or the variables; the last one used, History on each new page
        varList = past.querySelector('.calc-past-vars'), // a card for each letter, on the Variables tab
        pastShown = {}, // the history as the list shows it, so it is only built again after a change
        mac = /Mac|iPhone|iPad/.test(navigator.userAgent), // its keys: ⌘ and ⌥ Option for Ctrl and Alt; by the user agent, as Chrome made to be Windows on a Mac still gives MacIntel for its platform
        stats = root.querySelector('.calc-stats'), // statistics of a list of numbers, over the keys
        statsButton = root.querySelector('.calc-stat-btn'),
        statsInput = stats.querySelector('textarea'),
        statsGrid = stats.querySelector('.calc-stats-grid'),
        statsNote = stats.querySelector('.calc-stats-note'),
        statsBy = stats.querySelector('.calc-stats-by'), // what is between the numbers of the list
        BY = [ // its choices: the name the engine takes, as shown with its sign, and in the note
            ['auto', 'Auto'], ['line', 'New line', 'new lines'], ['tab', 'Tab', 'tabs'], ['space', 'Space', 'spaces'],
            ['comma', 'Comma <b>,</b>', 'commas'], ['semi', 'Semicolon <b>;</b>', 'semicolons'], ['pipe', 'Pipe <b>|</b>', 'pipes'],
            ['colon', 'Colon <b>:</b>', 'colons']
        ],
        statsNow = { n: 0 }, // what the list gives
        statsTab = 'list', // the tab shown: a list of numbers, pairs of them, or the tests
        statsTexts = { list: '', pairs: '', tests: '' }, // what is typed in each; the tests keep theirs in their cards
        statsChart = stats.querySelector('.calc-stats-chart'),
        statsFitPick = stats.querySelector('.calc-stats-fitpick'), // the curve fitted to the pairs
        statsFitLabel = stats.querySelector('.calc-stats-fitlabel'),
        statsEq = stats.querySelector('.calc-stats-eq'), // and its equation
        // its kinds, as CalcEngine.fit names them, and their names; the numbers of each, the tiles of the line's place
        STATS_FITS = [['lin', 'Linear'], ['quad', 'Quadratic'], ['cubic', 'Cubic'], ['exp', 'Exponential'], ['pow', 'Power'],
            ['log', 'Logarithmic'], ['logistic', 'Logistic']],
        statsFit = 'lin',
        STATS = { // the results of each tab in the order shown: the name the engine gives each, and its label
            list: [
                ['n', 'n'], ['sum', 'Σx'], ['squares', 'Σx<sup>2</sup>'],
                ['mean', '<span class="calc-x-bar">x</span>'], ['sdp', 'σ'], ['sds', 's'],
                ['min', 'min'], ['median', 'median'], ['max', 'max'],
                ['q1', 'Q<sub>1</sub>'], ['q3', 'Q<sub>3</sub>'], ['iqr', 'IQR'],
                ['range', 'range'], ['mode', 'mode'], ['vars', 's<sup>2</sup>']
            ],
            pairs: [
                ['n', 'n'], ['xmean', '<span class="calc-x-bar">x</span>'], ['ymean', '<span class="calc-x-bar">y</span>'],
                ['sx', 's<sub>x</sub>'], ['sy', 's<sub>y</sub>'], ['r', 'r'],
                ['b', 'slope b'], ['a', 'intercept a'], ['r2', 'r<sup>2</sup>'],
                ['sdpx', 'σ<sub>x</sub>'], ['sdpy', 'σ<sub>y</sub>'], ['cov', 'cov'],
                ['sumx', 'Σx'], ['sumy', 'Σy'], ['sumxy', 'Σxy'],
                ['sumx2', 'Σx<sup>2</sup>'], ['sumy2', 'Σy<sup>2</sup>'], ['rho', 'Spearman ρ']
            ]
        },
        fx = root.querySelector('.calc-fx'), // formulas and constants, over the keys
        fxButton = root.querySelector('.calc-fx-btn'),
        fxSearch = fx.querySelector('.calc-fx-search'),
        fxList = fx.querySelector('.calc-fx-list'),
        fxTab = 'formulas', // the list shown: formulas or constants; Formulas at first, then the last one used
        fxItems = {}, // the entries of each list, with the text a search looks in
        conv = root.querySelector('.calc-conv'), // the converter of units, over the keys
        convButton = root.querySelector('.calc-conv-btn'),
        convSearch = conv.querySelector('.calc-conv-search'), // above the units' cards
        convUnits = conv.querySelector('.calc-conv-units'), // the cards of the units, a group of them each
        convDates = conv.querySelector('.calc-conv-datelist'), // the cards of the dates
        convTab = 'units', // the tab of the converter: units, or dates
        graph = root.querySelector('.calc-graph'), // the graph of a function of x, over the keys
        graphButton = root.querySelector('.calc-graph-btn'),
        solvePanel = root.querySelector('.calc-solve'), // equations solved, calculus and probability, over the keys
        solveButton = root.querySelector('.calc-solve-btn'),
        numbersPanel = root.querySelector('.calc-numbers'), // matrices, complex numbers and bases, over the keys
        numbersButton = root.querySelector('.calc-numbers-btn'),
        physPanel = root.querySelector('.calc-phys'), // electronics, motion, forces, waves, matter and modern physics, over the keys
        physButton = root.querySelector('.calc-phys-btn'),
        bioPanel = root.querySelector('.calc-bio'), // genetics, DNA, proteins, the lab, cells and ecology, over the keys
        bioButton = root.querySelector('.calc-bio-btn'),
        graphRows = (function (first) { // a box for each curve, twenty-five: the + shows the next one, its × takes it away
            var rows = [first], row;
            while (rows.length < 25) {
                row = first.cloneNode(true);
                row.querySelector('input').placeholder = 'another curve';
                row.querySelector('input').setAttribute('aria-label', tr('y = , curve {n}', { n: rows.length + 1 }));
                first.parentNode.appendChild(row);
                rows.push(row);
            }
            return rows;
        })(graph.querySelector('.calc-graph-fn')),
        graphInputs = graphRows.map(function (row) { return row.querySelector('input'); }),
        graphUsed = false, // the graph pressed last, not the calculator: Ctrl+Z its undo
        tools = Calc.querySelector('.calc-tools'), // the buttons at the top left of the display
        pressedKey,
        sliding, // long line being slid: its element and where the slide started
        picked = null, // the piece of the line above a result its click was on, for a second click to select its number
        picking, // long line whose text is being selected: its element, and where the selection started
        holdTimer, // runs while a long line is pressed, until it is held long enough to slide instead, or select
        secondActive = false, // 2nd key active?
        engine = new CalcEngine(), // the calculation and its equation line
        deg = 0, // the unit of angles: 0 Rad, 1 Deg, 2 Grad, as the engine takes it
        UNITS = ['Rad', 'Deg', 'Grad'], // their names, in the order the Deg key goes through them
        resBuffer = '0',
        keyBoard = {},
        secondLayer = [
            [
                'sin', 'cos', 'tan', 'ln', 'sinh', 'cosh', 'tanh', 'e<sup>x</sup>', '%', '<i>n</i>C<i>r</i>', '<i>n</i>P<i>r</i>',
                'log', 'π', 'y<sup>x</sup>', 'abs', 'x!', 'Rand', '<span class="calc-cbrt"><span class="calc-sq">∛</span></span>'
            ],
            [
                'sin<sup>-1</sup>', 'cos<sup>-1</sup>', 'tan<sup>-1</sup>', 'log<sub>2</sub>',
                'sinh<sup>-1</sup>', 'cosh<sup>-1</sup>', 'tanh<sup>-1</sup>', '2<sup>x</sup>', 'mod', 'gcd', 'lcm',
                '10<sup>x</sup>', 'e', 'log<sub>y</sub>', 'floor', 'ceil', 'round',
                '<sup>x</sup><em class="calc-key-sign">√</em><span class="calc-root">y</span>'
            ]
        ];

    // ---------- INIT... ---------- //

    // collect all keys...
    for (var k = 2; k--;) {
        for (var l = Calc.children[k + 1], m = l.children, n = m.length; n--;) {
            keyBoard[l.children[n].textContent.replace(/\s*/g, '')] = l.children[n];
        }
    }
    keyBoard['C'] = keyBoard['AC'];
    keyBoard[','] = keyBoard['.'];
    keyBoard['Rad'] = keyBoard['Grad'] = keyBoard['Deg'];
    secondKeySet = secondLayer[0].map(function (label) {
        return keyBoard[label.replace(/<[^>]*>/g, '')];
    });
    for (var n = secondKeySet.length; n--;) {
        keyBoard[secondLayer[1][n].replace(/<[^>]*>/g, '')] = secondKeySet[n];
    }

    // ---------------- the page around the calculator ---------------- //

    // The page does what the calculator cannot: it opens the options, and reads the
    // clipboard for Paste. It is asked with an event on the calculator, which popup.js
    // answers in the extension and app.js on the website. False if the page does it in
    // its own way, in place of the calculator
    function ask(what, detail) {
        return root.dispatchEvent(new CustomEvent('calc-' + what, { bubbles: true, cancelable: true, detail: detail }));
    }

    // Popped out, every tool grows with the window, by one measure for all of it: the rail, the head, the cards, the
    // table, the graph's words and the numbers on its plot. As the room is 1400px wide and 880px high, to 1.3 times;
    // never smaller. The room the window, or popped out, as far as the calculator goes: on the website half of it while
    // the options are beside it. Set first as the window is resized, for what is measured or drawn again then to have
    // it, and again as the calculator's size changes; kept in popZoom for the script, which reads it as often as a drag moves
    var popZoom = 1;

    function popScale() {
        var room = root.matches('.calc-big, .calc-panel-big') ? root.getBoundingClientRect().right : window.innerWidth,
            z = Math.max(1, Math.min(1.3, room / 1400, window.innerHeight / 880));
        if (z === popZoom && document.documentElement.style.getPropertyValue('--calc-pop')) return;
        popZoom = z;
        document.documentElement.style.setProperty('--calc-pop', popZoom.toFixed(3));
    }

    popScale();
    window.addEventListener('resize', popScale, false);
    if (window.ResizeObserver) new ResizeObserver(popScale).observe(root); // popped out or in, the options shown or hidden

    // A row that scrolls sideways, faded at the side, or the sides, it has more at: calc-more-l and calc-more-r, as it
    // is scrolled or its size changes. The wheel of a mouse scrolls it sideways as well, till the end it is turned
    // towards, where the page scrolls as it would; in lines or pages in Firefox, as the graph reads them. Gives back
    // what marks it again
    function fadeEdges(el) {
        function mark() {
            var end = el.scrollWidth - el.clientWidth;
            el.classList.toggle('calc-more-l', end > 1 && el.scrollLeft > 1);
            el.classList.toggle('calc-more-r', end > 1 && el.scrollLeft < end - 1);
        }
        el.addEventListener('scroll', mark, { passive: true });
        el.addEventListener('wheel', function (e) {
            var end = el.scrollWidth - el.clientWidth,
                dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? el.clientWidth : 1);
            if (end < 2 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
            if ((dy < 0 && el.scrollLeft <= 0) || (dy > 0 && el.scrollLeft >= end - 1)) return;
            e.preventDefault();
            el.scrollLeft += dy;
        }, { passive: false });
        if (window.ResizeObserver) new ResizeObserver(mark).observe(el);
        return mark;
    }

    // A press in the calculator takes the keyboard back from the rest of the page: the keys
    // leave the focus where it is, so a box or a button there would go on taking what is typed
    root.addEventListener('pointerdown', function () {
        var el = document.activeElement;
        if (el && el !== document.body && !root.contains(el)) el.blur();
    }, true);

    // typing in a box or on a button of the rest of the page is not typing on the keys;
    // nor is any typing while the page has put the calculator out of use, under its options
    function elsewhere(el) {
        return !!root.closest('[inert]') || (!root.contains(el) && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName));
    }

    // The page may draw the calculator bigger or smaller than it is, to fit its room.
    // What the browser measures on the screen is then that much bigger than the sizes set here
    function scale() {
        return root.getBoundingClientRect().width / root.offsetWidth || 1;
    }

    // its text wider than its room: scrollWidth, a whole number, misses an overflow of less than a pixel, which still shows …
    // Not of one not laid out, in a panel still hidden: it has no room to measure
    function tooWide(el) {
        var range = document.createRange(), style = getComputedStyle(el);
        if (!el.clientWidth) return false;
        range.selectNodeContents(el);
        return range.getBoundingClientRect().width / scale() > el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    }

    // No room left empty at the end of a row of results, nor a number squeezed: the tiles in rows of as many as fit, up to the
    // grid's columns, each row's tiles sharing its width alike: of three to a row, the last two half and half, one alone the
    // whole width; a number too long for its tile on a row of fewer, or alone, before it is made smaller. A wide one, as a
    // matrix, a row of its own as ever. Its columns as set (grid.base) are the most a row has; its numbers back to their size
    function fillRows(grid) {
        var tiles, cols, width, gap, rows = [], row = [], most = 1;
        if (!grid) return;
        if (grid.base === undefined) grid.base = grid.style.gridTemplateColumns;
        grid.style.gridTemplateColumns = grid.base;
        [].forEach.call(grid.children, function (t) {
            t.style.gridColumn = '';
            [].forEach.call(t.querySelectorAll(':scope > :is(.calc-sv-value, .calc-stats-value)'), function (v) { v.style.fontSize = ''; });
        });
        grid.fitW = grid.clientWidth;
        if (!grid.offsetWidth) return; // in a panel still hidden: laid out once it is seen
        tiles = [].filter.call(grid.children, function (t) { return t.offsetParent; });
        cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
        if (cols < 2) return;
        gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
        width = function (k) { return (grid.clientWidth - (k - 1) * gap) / k; };
        function close() {
            if (row.length) rows.push(row);
            row = [];
        }
        tiles.forEach(function (t) {
            var v = t.querySelector(':scope > :is(.calc-sv-value, .calc-stats-value)'), range, style, next;
            if (getComputedStyle(t).gridColumnEnd === '-1') return close(); // a row of its own
            t.need = 0;
            if (v && v.clientWidth) { // the tile's width less its value's room, and the value's text
                range = document.createRange();
                range.selectNodeContents(v);
                style = getComputedStyle(v);
                t.need = t.offsetWidth - (v.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) + range.getBoundingClientRect().width / scale();
            }
            next = row.concat(t);
            if (next.length > cols || next.some(function (x) { return x.need > width(next.length) + 0.5; })) {
                close();
                row = [t];
            } else row = next;
        });
        close();
        if (rows.every(function (r) { return r.length === cols; })) return; // every row full as it is
        rows.forEach(function (r) { // the fewest columns each row's tiles share alike in
            most = most * r.length / CalcMaths.gcd(most, r.length);
        });
        grid.style.gridTemplateColumns = 'repeat(' + most + ', minmax(0, 1fr))';
        rows.forEach(function (r) {
            r.forEach(function (t) { t.style.gridColumn = 'span ' + most / r.length; });
        });
    }

    // a place on the screen, a box or a point of the pointer, as the calculator counts it:
    // in its own pixels, from inside its border, where left and top count from
    function inside(box) {
        var frame = root.getBoundingClientRect(), k = scale(),
            x0 = frame.left + root.clientLeft * k, y0 = frame.top + root.clientTop * k;
        return {
            left: (box.left - x0) / k, top: (box.top - y0) / k, right: (box.right - x0) / k, bottom: (box.bottom - y0) / k,
            width: box.width / k, height: box.height / k
        };
    }

    // ---------------- event listeners keys ---------------- //

    // typing in a box of a panel, the list of the statistics, the search, a letter
    // of a formula or a list of units, is typing there, not on the keys. A key sent to
    // the page itself, not to an element of it, is not in a box
    function field(el) {
        if (!el || !el.classList) return false;
        return el === statsInput || el.tagName === 'INPUT' || el.classList.contains('calc-conv-pick') || el.classList.contains('calc-sv-area') ||
            el.classList.contains('calc-sv-opt');
    }

    document.addEventListener('keypress', function (e) {
        if (!elsewhere(e.target) && !field(e.target)) onKeyPress(latinKey(e));
    }, false);

    // where a key of another script goes, by its place: a digit as ٧, a sign as ،, a letter on a sign's place,
    // Russian's ю, is the digit or sign a US keyboard has there, unshifted and shifted. The keys of the
    // number block too
    var PLACE = { Minus: '-_', Equal: '=+', Slash: '/?', Period: '.>', Comma: ',<', Quote: '\'"', Backslash: '\\|', Semicolon: ';:',
        NumpadAdd: '++', NumpadSubtract: '--', NumpadMultiply: '**', NumpadDivide: '//', NumpadDecimal: '..' };

    // a character of a script other than Latin's: Arabic's ش, its marks as ِ and its لأ, Russian's ф; not Turkish's ı or ğ
    function script(k) {
        return !!k && (k.length === 1 || /^[^\x00-\x7f]+$/.test(k)) && k.charCodeAt(0) >= 0x250;
    }

    // Whether the layout has no Latin letters, as its letters typed without Shift tell. On such a layout a
    // letter key is the Latin letter of its place whatever it types with Shift: Arabic's types ] on D, [ on F,
    // so Shift+D and Shift+F would not put in D and F
    var noLatin = false;
    function learnLayout(e) {
        var k = e.key;
        if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || !/^Key[A-Z]$/.test(e.code) || !k || k.length !== 1 || !/\p{L}/u.test(k)) return;
        noLatin = script(k);
    }

    // The key typed, as the character of its place on a US keyboard, '' for a key that types what it says.
    // A letter of a layout with no Latin ones, Russian's ф, Greek's α, is the Latin letter of the key's place,
    // in its case: s is sin, Shift+A puts in A, on any layout; and a digit or a sign of such a layout is the
    // one of its place, so the keys are the same on every layout
    function placeChar(e) {
        var k = e.key, m, sign;
        if (/^Key[A-Z]$/.test(e.code) && (script(k) || (noLatin && !e.altKey && !e.ctrlKey && !e.metaKey && !!k && k.length === 1))) {
            // in its case; a script with no case, Arabic's ش, Hebrew's ש, has Shift for it
            return (k.toLowerCase() === k.toUpperCase() ? e.shiftKey : k !== k.toLowerCase()) ?
                e.code.charAt(3) : e.code.charAt(3).toLowerCase();
        }
        if (!k || k.length !== 1 || k.charCodeAt(0) < 0x250) return ''; // a Latin layout keeps what it types
        if ((m = /^(Digit|Numpad)(\d)$/.exec(e.code))) return m[1] === 'Digit' && e.shiftKey ? ')!@#$%^&*('.charAt(+m[2]) : m[2];
        sign = PLACE[e.code];
        return sign ? sign.charAt(e.shiftKey ? 1 : 0) : '';
    }

    // the key typed, as its char code
    function latinKey(e) {
        var c = placeChar(e);
        return c ? c.charCodeAt(0) : e.which;
    }

    // a box that takes a number or a letter A to J: what is typed in it is the key of its place as well, so a
    // box of a panel can be typed in on any layout, ٥ or ش
    function numberBox(el) {
        return el.tagName === 'INPUT' && (!!el.dataset.num || graphPart.graphEnds.indexOf(el) > -1 || el === graphPart.graphFrom ||
            el === graphPart.graphBy || !!el.closest('.calc-fx-var, .calc-var, .calc-graph-pair, .calc-graph-slider, .calc-graph-pop-end'));
    }

    document.addEventListener('keydown', function (e) {
        var k;
        learnLayout(e);
        if (elsewhere(e.target)) return;
        if (field(e.target)) {
            if (!e.ctrlKey && !e.metaKey && !e.altKey && (k = placeChar(e)) && numberBox(e.target)) { // ٥ types 5, ش types A
                typeInto(e.target, k);
                e.preventDefault();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && graph.contains(e.target) && graphKeyUndo(e)) return; // in a box of the graph, its undo, not the box's
            if (e.which === 27 && !menu.hidden) { // Esc closes the menu first
                showMenu(false);
                e.preventDefault();
            } else if (e.which === 27 && graphPart.graphWindow.contains(e.target)) { // and the view's boxes, back to the plot
                showWindow(false);
                e.preventDefault();
            } else if (e.which === 27 && graphPart.graphPop.contains(e.target)) { // and the ends of an area, its popup staying
                e.target.blur();
                e.preventDefault();
            } else if (e.which === 27 && graphUnpin()) { // Esc closes the point clicked on the graph first, and the like
                e.preventDefault();
            } else if (e.which === 27 && graph.contains(e.target) && graphBig(false)) { // then makes the big graph small
                e.preventDefault();
            } else if (e.which === 27 && chemPart.chemPanel.contains(e.target) && chemBig(false)) { // and the big periodic table
                e.preventDefault();
            } else if (e.which === 27 && chemPart.chemAlone) { // its own window closes
                closeChem();
                e.preventDefault();
            } else if (e.which === 27 && bigPanel && bigPanel.contains(e.target)) { // and any panel popped out pops in, or its window closes
                panelIn();
                e.preventDefault();
            } else if (e.which === 27) { // Esc closes the panel, as the history
                closePanels(graph);
                closeGraph();
                e.preventDefault();
            }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && graph.classList.contains('calc-open') && (graphUsed || graphPart.graphAlone) && graphKeyUndo(e)) return; // the graph's, while it was used last
        if ((e.ctrlKey || e.metaKey) && (e.which === 90 || (noLatin && e.code === 'KeyZ'))) { // Ctrl+Z undoes, Ctrl+Shift+Z redoes
            undo(e.shiftKey);
            e.preventDefault();
            return;
        }
        // Alt+A to J (Option on a Mac) stores the result in the letter, as > then the letter does. By
        // the key itself: the character Option types with it, å, ∫, is not taken as typed
        if (e.altKey && !e.ctrlKey && !e.metaKey && (k = altLetter(e.code))) {
            hold.textContent = '';
            storeIn(k);
            e.preventDefault();
            return;
        }
        if (onKeyDown(e.which, e.shiftKey)) {
            if (e.which < 37 || e.which > 40) graphUsed = false; // typed into the calculator, not a point traced
            e.preventDefault();
        }
    }, false);

    // what was pressed last, the graph or the calculator, for Ctrl+Z to undo
    document.addEventListener('pointerdown', function (e) {
        graphUsed = graph.contains(e.target);
    }, true);

    // Ctrl+Z (⌘Z) undoes a change of the graph, Ctrl+Shift+Z or Ctrl+Y redoes it; true if it was one of them
    function graphKeyUndo(e) {
        var z = e.which === 90 || (noLatin && e.code === 'KeyZ'), y = e.which === 89 || (noLatin && e.code === 'KeyY');
        if (e.altKey || !z && !(y && !e.shiftKey)) return false;
        undoGraph(y || e.shiftKey);
        e.preventDefault();
        return true;
    }

    // the letter A to J of a key under Alt, as the keyboard's layout names it: AZERTY's A is where
    // QWERTY has Q. Where the browser cannot tell, or the layout has no Latin letters, as Russian's ф,
    // the letter of the key's place
    var layout = null;
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(function (map) {
        layout = map;
        if (script(map.get('KeyA'))) noLatin = true; // known before a letter is typed
    }, function () { });
    function altLetter(code) {
        var c = /^Key[A-Z]$/.test(code) && layout && !noLatin && layout.get(code);
        if (!/^[a-z]$/i.test(c)) c = /^Key[A-Z]$/.test(code) ? code.charAt(3) : '';
        c = c.toUpperCase();
        return /^[A-J]$/.test(c) ? c : null;
    }

    document.addEventListener('keyup', function (e) {
        if (!elsewhere(e.target) && !field(e.target)) onKeyUp();
    }, false);

    document.body.addEventListener('paste', function (e) {
        if (elsewhere(e.target) || field(e.target)) return; // the box takes it
        doPaste(e.clipboardData.getData("Text"));
        e.preventDefault();
    }, false);

    function onKeyPress(key) {
        var holdKey = hold.textContent,
            // Shift+A to J are the letters: what they had went to a key beside them, cos⁻¹ to V, EE to W, floor to Y
            // by ceil's U and round's O, gcd to Q
            keyMatch = (',|.|-|–|/|÷|*|×|#|+/–|x|x!|W|EE|e|ex| |2nd|r|x√y|R|√|p|π|^|yx|\'|yx|"|yx|m|mr|v|mc|b|m+|n|m-|a|Ans|' +
                's|sin|c|cos|t|tan|S|sin-1|V|cos-1|T|tan-1|d|Deg|°|Deg|l|ln|L|log|\\|1/x|X|2x|N|nCr|P|nPr|f|a/b|M|mod|Q|gcd|K|lcm|' +
                'Y|floor|U|ceil|O|round|o|MODE').split('|'),
            keyMatchHold = ('sin|sinh|cos|cosh|tan|tanh|m-|Rand|sin-1|sinh-1|cos-1|cosh-1|tan-1|tanh-1|' +
                '1|1/x|2|x2|3|x3|x√y|√|√|∛|ln|log2|ex|2x|log|10x|π|e|yx|logy|a/b|°′″').split('|');

        // > is STO→, and a letter, Shift+A to J, is put in, or after STO→ takes the result; Alt+A does both at once
        if (key === 62) return arm(!sto.textContent);
        if (/^[A-J]$/.test(String.fromCharCode(key))) {
            hold.textContent = '';
            return sto.textContent ? storeIn(String.fromCharCode(key)) : putLetter(String.fromCharCode(key));
        }
        // Enter while a template is open or the line is edited: to the next empty box, or out of
        // the boxes so the line shows what will be worked out; from there, = works it out
        if (key === 13 && (engine.edit || engine.opened()) && engine.enter(deg)) {
            refresh();
            saveState();
            return;
        }
        // Enter after a result leaves it: one press too many must not repeat the last operation,
        // as = does on purpose, 100 × 1.05 = = =
        if (key === 13 && (engine.done || engine.error) && !engine.edit) return; // nor clear an error, which stays to be fixed
        if (key === 13) key = 61;
        key = key === 124 ? 'abs' : String.fromCharCode(key); // | is the separator of the list above
        for (var n = 0, m = keyMatch.length; n < m; n = n + 2)
            if (key === keyMatch[n]) {
                key = key.replace(key, keyMatch[n + 1]);
                break
            }
        if (holdKey) {
            for (var n = 0, m = keyMatchHold.length; n < m; n = n + 2)
                if (key === keyMatchHold[n]) {
                    key = key.replace(key, keyMatchHold[n + 1]);
                    break
                }
            hold.textContent = '';
        }
        if (key === 'h' && !holdKey) {
            hold.textContent = 'hold';
            arm(false); // one mark at a time in its place
        }
        if (!keyBoard[key]) return;
        if ((key.match(/-1$|log2$|2x$|^(mod|gcd|lcm|10x|e|logy|floor|ceil|round|x√y)$/) && !secondActive) ||
            (key.match(/h$|n$|cos$|ex$|^(%|nCr|nPr|log|π|yx|abs|x!|Rand|∛)$/) && secondActive)) {
            keyDown(false, keyBoard['2nd']);
            doKey('2nd', true);
        }
        keyDown(false, keyBoard[key]);
        doKey(key, true);
    }

    function onKeyDown(key, shiftKey) { // true if the key was handled here
        if (key === 27 && sto.textContent) { // Esc lets STO→ go first
            arm(false);
            return true;
        }
        if (key === 27 && !menu.hidden) { // Esc closes the menu
            showMenu(false);
            return true;
        }
        if (key === 27 && bigPanel) { // a panel popped out pops in first; its own window closes
            panelIn();
            return true;
        }
        if (key === 27 && stats.classList.contains('calc-open')) { // Esc closes the statistics
            showStats(false);
            return true;
        }
        if (key === 27 && fx.classList.contains('calc-open')) { // and the formulas
            showFx(false);
            return true;
        }
        if (key === 27 && conv.classList.contains('calc-open')) { // and the converter
            showConv(false);
            return true;
        }
        if (key === 27 && toolPanels.some(function (p) { return p.open() && (p.show(false), true); })) return true; // and the solver and the numbers
        if (key === 27 && chemPart.chemPanel.classList.contains('calc-open')) { // and the chemistry, after its big table
            if (!chemBig(false)) closeChem();
            return true;
        }
        if (key === 27 && graph.classList.contains('calc-open')) { // and the graph, after the point clicked on it and its big view
            if (!graphUnpin() && !graphBig(false)) closeGraph();
            return true;
        }
        if (key === 27 && past.classList.contains('calc-open')) { // Esc closes the history
            showPast(false);
            return true;
        }
        if (key >= 37 && key <= 40 && graphTrace(key, shiftKey)) return true; // or the point clicked on the graph
        if (key === 9 && engine.edit) { // Tab while the line is edited: from box to box
            if (engine.tab(shiftKey)) {
                refresh();
                saveState();
            }
            return true;
        }
        // a result stays a result: the arrows, Home and End do not open the equation it came from, which
        // the history or a double click on the line above it does. An error's line is still there to fix
        if (key >= 35 && key <= 39 && key !== 38 && engine.done && !engine.edit && !engine.error) return true;
        if (key === 37 || key === 39) { // the arrow keys move the cursor
            if (engine.move(key === 37 ? 'left' : 'right', deg)) {
                refresh();
                saveState();
            }
            return true;
        }
        if (key === 35 || key === 36) { // End, Home
            if (engine.move(key === 36 ? 'home' : 'end', deg)) {
                refresh();
                saveState();
            }
            return true;
        }
        if (key === 46 || (key === 8 && shiftKey)) {
            keyDown(false, keyBoard['AC']);
            doKey(keyBoard['AC'].textContent.replace(/\s*/g, ''), true);
        } else if (key === 8) {
            keyDown(false, keyBoard['DEL']);
            doKey('DEL', true);
            return true;
        }
        return false;
    }

    function onKeyUp() {
        keyUp();
        saveState();
    }

    function doPaste(text) {
        var span = selectedSpan(); // what is selected of the equation is replaced
        if (!(span ? engine.pasteOver(text, deg, span[0], span[1]) : engine.paste(text, deg))) return;
        unselect();
        if (!engine.edit && CalcEngine.angleAlone(text) && !dmsMode) toggleDms(); // 12°30′15″ shows as written
        keyBoard['AC'].children[0].firstChild.data = 'C';
        refresh();
        notify('Paste');
        saveState();
        if (engine.to) lettersChanged(); // 5 + 3 → A stored it in A
    }

    // what copy takes: the main line, an equation as plain text, with the decimal mark in use
    function copyText() {
        if (engine.edit) return local(engine.text());
        return local(engine.error || engine.done || engine.plain() ? resBuffer.replace(/\s/g, '') : engine.text());
    }

    // in the rest of the page, beside the calculator: its text is copied as the browser does, and has its menu
    function beside(el) {
        return !root.contains(el) && !el.contains(root);
    }

    // what copy takes: the text a history button or the menu gives, a part of
    // the display selected with the mouse, or else the main line
    document.body.addEventListener('copy', function (e) {
        if (beside(e.target)) return; // what is selected in the rest of the page
        if (field(e.target) && copying === null) return; // what is selected in the box
        e.clipboardData.setData('text/plain', copying !== null ? copying : selectedText() || copyText());
        e.preventDefault(); // the text above is copied, not the page's selection as it is drawn
        notify('Copy');
    }, false);

    // Ctrl+X takes what Ctrl+C does, and takes it out
    document.body.addEventListener('cut', function (e) {
        if (beside(e.target) || field(e.target) || empty()) return; // what is selected there, or in the box; nothing to take
        e.clipboardData.setData('text/plain', selectedText() || copyText());
        e.preventDefault();
        cutOut(selectedSpan());
    }, false);

    // what was cut is taken out: the selected part of the equation, or else all the display has
    function cutOut(span) {
        if (!(span && engine.cut(span[0], span[1], deg))) engine.press('AC', deg);
        if (empty()) keyBoard['AC'].children[0].firstChild.data = 'AC';
        unselect();
        refresh();
        saveState();
        notify('Cut');
    }

    // nothing was entered: the display has its 0
    function empty() {
        return !engine.edit && !engine.error && !engine.done && engine.entry === 'fresh' && engine.plain();
    }

    // the part of the display that is selected, as text: raised numbers as ²,
    // a drawn fraction as 3/4; '' if none is
    function selectedText() {
        var sel = window.getSelection(), range, box, where, index, inner, span;
        if (!sel.rangeCount || sel.isCollapsed) return '';
        range = sel.getRangeAt(0);
        where = range.commonAncestorContainer;
        if (!display.contains(where)) return '';
        // the pieces of the equation selected, as the engine writes them, which paste reads back;
        // what is drawn alone leaves out what is not written, as the sign of a root
        if ((span = selectedSpan()) && (inner = engine.textOf(span[0], span[1]))) return local(inner);
        box = document.createElement('div');
        // from one part of a fraction to the other: the parts are cloned without the fraction they are of
        if (where.nodeType === 1 && where.classList.contains('calc-fr')) {
            span = where.cloneNode(false);
            span.appendChild(range.cloneContents());
            box.appendChild(span);
        } else {
            box.appendChild(range.cloneContents());
        }
        [].slice.call(box.querySelectorAll('.calc-fr, .calc-root')).reverse().forEach(function (el) { // the innermost first
            var span;
            if (el.classList.contains('calc-fr')) {
                return el.replaceWith([].slice.call(el.children).map(function (part) {
                    var t = part.textContent.trim();
                    return /[ +–×÷/]/.test(t) ? '(' + t + ')' : t;
                }).join('/'));
            }
            // a root's sign is drawn, not written: √ before it, a number of more than one in brackets;
            // with a root of more than digits, ˣ√y as the engine writes it, y^(1/x)
            span = document.createElement('span');
            index = el.previousElementSibling && el.previousElementSibling.tagName === 'SUP' && el.previousElementSibling;
            inner = /[ +–×÷/]/.test(el.textContent.trim()) ? '(' + el.innerHTML + ')' : el.innerHTML;
            if (index && !/^\d*$/.test(index.textContent.trim())) {
                span.innerHTML = inner + '^(1/(' + index.innerHTML + '))';
                index.remove();
            } else {
                span.innerHTML = '√' + inner;
            }
            el.replaceWith(span);
        });
        return plain(box);
    }

    // a number as the format in use writes its decimal mark: for what is copied, and a box of a panel
    function local(s) {
        return CalcEngine.decimal(String(s), fmt.group);
    }

    // a list as an example types it: 1, 2, 3; with the decimal comma, 1; 2; 3
    function listTyped(list) {
        return list.join(engine.comma ? '; ' : ', ');
    }

    // what the display puts between the thousands, which is not of the equation: a dot is, while the decimal mark is a comma
    function grouping() {
        return fmt.group === 'dot' ? /\./g : fmt.group === 'spacecomma' ? /\u2009/g : /[,\u2009]/g;
    }

    // what a number box holds, with a point as its decimal mark
    function boxValue(input) {
        return input.value.replace(',', '.');
    }

    // the part of the equation in the display that is selected, which a paste or
    // a key goes in place of: [from, to] in characters from its start, [] for all
    // of it. Null if none is, or the display has a result, which they replace anyway
    function selectedSpan() {
        var sel = window.getSelection(), all = document.createRange(), range, from, to, box;

        function chars(node, offset) { // of the equation before this place of the page
            var part = all.cloneRange(), where = all.comparePoint(node, offset);
            if (where < 0) return 0;
            if (!where) part.setEnd(node, offset);
            return part.toString().replace(engine.edit ? '' : grouping(), '').length; // not what is between the thousands
        }

        if (!sel.rangeCount || sel.isCollapsed) return null;
        if (!engine.edit && (engine.error || engine.done || (engine.plain() && engine.entry !== 'typing'))) return null;
        range = sel.getRangeAt(0);
        all.selectNodeContents(display);
        from = chars(range.startContainer, range.startOffset);
        to = chars(range.endContainer, range.endOffset);
        if (!from && to && to === chars(all.endContainer, all.endOffset)) return []; // all of it, before the pieces of a box are asked
        if ((box = boxSpan(range))) return box;
        if (from >= to) return null;
        // a drawn fraction is not written as the equation is typed: only all of it can be told
        return engine.edit || !display.querySelector('.calc-fr') ? [from, to] : null;
    }

    // all of a row of the equation selected: of a box, by its key, or of the line itself ('')
    function selectRow(key) {
        var pieces = [].filter.call(display.querySelectorAll('[data-e]'), function (p) { return p.getAttribute('data-e').split('|')[0] === key; }),
            first = pieces.length && texts(pieces[0])[0], last = pieces.length && texts(pieces[pieces.length - 1]).pop(),
            range = document.createRange(), sel = window.getSelection();
        if (!first || !last) return;
        range.setStart(first, 0);
        range.setEnd(last, last.length);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function texts(el) {
        var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), out = [], node;
        while ((node = walk.nextNode())) if (node.data.length) out.push(node);
        return out;
    }

    // a selection of the equation by its pieces: from and to, each the row of a box and a place in it,
    // as the engine takes them. Inside one box, its pieces; across boxes, the whole templates they
    // are in, in the row both are in: from the root of ³√8 to the 8 is all of ³√8. Null if either end
    // is not on a piece
    function boxSpan(range) {
        var a = pieceAt(range.startContainer, range.startOffset, false), b = pieceAt(range.endContainer, range.endOffset, true),
            pa, pb, n;
        if (!a || !b) return null;
        pa = a.r ? a.r.split('/') : [];
        pb = b.r ? b.r.split('/') : [];
        for (n = 0; n < pa.length && n < pb.length && pa[n] === pb[n]; n++);
        if (n < pa.length) a = { r: pa.slice(0, n).join('/'), i: +pa[n].split(':')[0] };
        if (n < pb.length) b = { r: pb.slice(0, n).join('/'), i: +pb[n].split(':')[0] + 1 };
        return a.i < b.i ? [a, b] : null;
    }

    // the place in its row of a place of the page: before the piece it is in, or after it if at
    // its end; end: the place a selection ends, after the piece unless at its start
    function pieceAt(node, offset, end) {
        var el = node.nodeType === 3 ? node.parentNode : node, key, at;
        el = el && el.closest && el.closest('[data-e]');
        if (!el || !display.contains(el)) return null;
        key = el.getAttribute('data-e').split('|');
        at = +key[1];
        if (node.nodeType === 3 ? (end ? offset > 0 : offset >= node.length) : end) at++;
        return { r: key[0], i: at };
    }

    // once a key or a paste has changed the display nothing of it is selected, as in
    // a box; a selection from outside it, as of Ctrl+A, would take in what comes next
    function unselect() {
        var sel = window.getSelection();
        if (sel.rangeCount && !sel.isCollapsed && sel.getRangeAt(0).intersectsNode(display)) sel.removeAllRanges();
    }

    // a formula's drawn fractions as a ÷ b, a part with spaces in brackets, and its roots as √(…)
    function fractionsAsText(html) {
        var box = document.createElement('div');
        box.innerHTML = html;
        [].slice.call(box.querySelectorAll('.calc-fr, .calc-root')).reverse().forEach(function (el) { // the innermost first
            var span = document.createElement('span');
            span.innerHTML = el.classList.contains('calc-root') ? '√(' + el.innerHTML + ')' :
                [].slice.call(el.children).map(function (part) {
                    return /\s/.test(part.textContent) ? '(' + part.innerHTML + ')' : part.innerHTML;
                }).join(' ÷ ');
            el.replaceWith(span);
        });
        return box.innerHTML;
    }

    // what is drawn, HTML or an element, as text: raised and lowered numbers and letters as ² and ₂,
    // rⁿᵗ; what has no such character as ^(t/T) and _b, as a raised part would read on as the line
    var RAISED = ['0123456789-−–+=()abcdefghijklmnoprstuvwxyzABDEGHIJKLMNOPRTUVW',
            '⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁻⁻⁺⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ'],
        LOWERED = ['0123456789-−–+=()aehijklmnoprstuvxy', '₀₁₂₃₄₅₆₇₈₉₋₋₋₊₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵧ'];

    function plain(what) {
        var box = what;
        if (typeof what === 'string') {
            box = document.createElement('div');
            box.innerHTML = what;
        }
        [].slice.call(box.querySelectorAll('sup, sub')).reverse().forEach(function (s) { // the innermost first
            var map = s.tagName === 'SUP' ? RAISED : LOWERED, t = s.textContent.trim(), mark = s.tagName === 'SUP' ? '^' : '_';
            if ([].every.call(t, function (c) { return map[0].indexOf(c) > -1; })) {
                s.replaceWith([].map.call(t, function (c) { return map[1].charAt(map[0].indexOf(c)); }).join(''));
            } else {
                s.replaceWith(mark + (/^\w$/.test(t) ? t : '(' + t + ')'));
            }
        });
        return box.textContent.trim();
    }

    // the browser only runs a copy asked for by a script while something is
    // selected, so the hidden box is selected for a moment; the copy listener
    // above supplies the text: the given one, else the main line's. The box is read only,
    // so a touch screen brings up no keyboard for it, and iOS selects it by its range
    function copy(text) {
        copying = text === undefined ? null : text;
        hiddenCopy.value = copying !== null ? copying : copyText();
        hiddenCopy.select();
        hiddenCopy.setSelectionRange(0, hiddenCopy.value.length);
        try {
            document.execCommand('copy');
        } finally {
            copying = null;
            hiddenCopy.blur(); // typing must not land in the box
        }
    }

    // ---------------- tips ---------------- //

    // While the pointer rests on a key above the digits, a tip says what it
    // does, with an example and its keyboard shortcut. A key 2nd has turned
    // has the tip of its second function; with 2nd off, a tip names the
    // function 2nd gives the key. The marks in the display, the history and
    // the ? beside the name have tips as well. On a touch screen a finger held still shows the tip at once,
    // where there is no menu to open (the hold of the menu, below)
    tip.parentNode.addEventListener('mouseover', function (e) {
        if (!scrolledAt) onKey(e.target, true);
    }, false);

    // the pointer on target: the tip of its key, after a second of rest; quick, at once from a tip just gone
    // a letter A to J of the equation, in the display or on the line above a result, which has the tip of what it holds
    function letterIn(target) {
        var piece = target.closest('[data-e]');
        return piece && (display.contains(piece) || logline.contains(piece)) && /^[A-J]$/.test(piece.textContent.trim()) ? piece : null;
    }

    function onKey(target, quick) {
        if (chemPart.chemSliding) return; // no tip comes while a knob of the periodic table's slider is dragged
        if (tip.contains(target) || !tip.hidden && tip.classList.contains('calc-tip-scrolls') && tipKey && tipKey.contains(target)) {
            clearTimeout(tipLeave); // on a tip that scrolls, to read on, or back on its key
            tipLeave = 0;
            return;
        }
        // gone from the key of a tip that scrolls: a moment to get on to it over the gap, then the tip of where it went
        if (!tip.hidden && tip.classList.contains('calc-tip-scrolls')) {
            tipNext = target;
            if (!tipLeave) tipLeave = setTimeout(function () {
                hideTip();
                tipKey = null;
                onKey(tipNext, true);
            }, 300);
            return;
        }
        var key = target.closest('.calc-left > *, .calc-right > .del-ac, .calc-rad, .calc-mem, .calc-frac, .calc-fmt, .calc-hold, ' +
            '.calc-stat-btn, .calc-fx-btn, .calc-fx-row, .calc-gx-row, .calc-conv-btn, .calc-solve-btn, .calc-numbers-btn, .calc-chem-btn, .calc-phys-btn, .calc-bio-btn, .calc-chem-size, .calc-panel-size, .calc-pt-mode, .calc-search-clear, .calc-pt-unit, .calc-pt-temp-v, .calc-sv-row, ' +
            '.calc-graph-btn, .calc-graph-size, .calc-graph-add, .calc-graph-undo, .calc-graph-redo, .calc-graph-del, .calc-graph-diff, .calc-graph-points, .calc-graph-zoom > span, .calc-graph-window [data-look], .calc-graph-window [data-arrows], .calc-graph-reset, .calc-graph-pop-end, .calc-graph-pop-row, .calc-graph-play, ' +
            '.calc-graph-fn > .calc-graph-swatch, .calc-graph-fn > .calc-graph-style, ' +
            '.calc-sto, .calc-var-btn, .calc-fx-phys, input, textarea, ' +
            '.calc-stats-chart, .calc-hist, .calc-find-btn, .calc-past-export, .calc-past-clear, .calc-past-close, .calc-past-btn, .calc-past-del, .calc-past-unit, .calc-help, .calc-open-big, ' +
            '.calc-solve .calc-solve-tab, .calc-chem .calc-solve-tab, .calc-stats .calc-solve-tab, .calc-phys .calc-solve-tab, .calc-bio .calc-solve-tab, .calc-stats-fitpick, .calc-chem [data-pt], .calc-sv-opt, .calc-sv-copy, .calc-f-copy, .calc-sv-example, .calc-sv-reset, .calc-sv-boxes .calc-sv-sym, .calc-sv-band') || letterIn(target);
        if (key === tipKey) return;
        hideTip();
        tipKey = key;
        tipEmpty = false;
        if (key) tipTimer = setTimeout(showTip, quick && Date.now() - tipGone < 400 ? 0 : 1000); // after a second of rest; from key to key at once
    }

    // A tip put away by a press, a key or a scroll comes again as the pointer moves on what has one, not
    // only once it has gone out and come back in, as mouseover alone has it; after a press, once the
    // pointer has moved from where it was pressed, so the tip does not come back under a click
    document.addEventListener('mousedown', function (e) {
        pressedAt = [e.clientX, e.clientY];
    }, true);

    tip.parentNode.addEventListener('mousemove', function (e) {
        if (pressedAt && Math.abs(e.clientX - pressedAt[0]) + Math.abs(e.clientY - pressedAt[1]) <= 6) return;
        if (scrolledAt && Math.abs(e.clientX - scrolledAt[0]) + Math.abs(e.clientY - scrolledAt[1]) <= 6) return;
        pressedAt = null;
        scrolledAt = null;
        if (tip.hidden && !tipTimer && !tipEmpty) {
            tipKey = null;
            onKey(e.target, false);
        }
        if (peek.hidden && !peekTimer && !peekStill) peekAt(e.target);
    }, false);

    // A scroll anywhere puts the tips away at once, and none comes again till the pointer moves: what the
    // scroll brings under a still pointer would otherwise have its tip at once, as from key to key
    document.addEventListener('wheel', function (e) {
        if ((tip.contains(e.target) || peek.contains(e.target)) && e.target.closest('.calc-tip-body')) return; // a tip too long, scrolled to read on
        scrolledAt = [e.clientX, e.clientY];
        hideTip();
        hidePeek();
        tipKey = null;
        tipGone = peekGone = 0; // the next tip after its usual rest
    }, { capture: true, passive: true });

    tip.parentNode.addEventListener('mouseleave', function () {
        hideTip();
        tipKey = null;
    }, false);

    // a press, a key or the menu puts it away; not a press on it, as on its scroll bar
    ['mousedown', 'keydown', 'contextmenu'].forEach(function (type) {
        document.addEventListener(type, function (e) {
            if (!tip.contains(e.target)) hideTip();
        }, true);
    });

    // a text with Arabic in it read from the right, its maths left to right inside it (lang.js)
    var ltrRuns = CalcLang.ltrRuns;

    // and so the names and results of the cards, the formulas, the elements and the statistics, and the notes of the
    // statistics and the graph, each time one is drawn, as it is drawn, before it is measured: 20 °C, ± 2 SE
    // and 9 : 3 : 3 : 1 as they are, not C° 20, SE 2 ± and 1 : 3 : 3 : 9. Those in what was drawn, all at once
    var RTL_PARTS = '.calc-sv-name, .calc-sv-label, .calc-sv-value, .calc-fx-name, .calc-pt-count, .calc-stats-label, .calc-stats-note, .calc-graph-note';

    function rtlDraw(el) {
        if (!CalcLang.rtl) return;
        ltrRuns((el.matches(RTL_PARTS) ? [el] : []).concat([].slice.call(el.querySelectorAll(RTL_PARTS))));
    }

    // A tip above its key, or below it where there is no room above; too long for the room on either
    // side, it goes where there is more, and what is under its name scrolls (.calc-tip-body), no higher
    // than the CSS lets it be as well. One that scrolls takes the pointer, to scroll it
    function placeTip(box, at, gap) {
        var calc = tip.parentNode, body = box.querySelector('.calc-tip-body'),
            above = at.top - gap - 4, below = calc.clientHeight - at.bottom - gap - 4, under, left;
        if (CalcLang.rtl) ltrRuns(box);
        box.style.removeProperty('--room');
        under = box.offsetHeight > above && (box.offsetHeight <= below || below > above);
        if (body && box.offsetHeight > (under ? below : above)) {
            box.style.setProperty('--room', Math.max(40, (under ? below : above) - (box.offsetHeight - body.offsetHeight)) + 'px');
        }
        box.classList.toggle('calc-tip-scrolls', !!body && body.scrollHeight > body.clientHeight + 2); // more than a sub or sup under or over its line
        left = Math.max(6, Math.min(calc.clientWidth - box.offsetWidth - 6, at.left + at.width / 2 - box.offsetWidth / 2));
        box.style.left = left + 'px';
        box.style.top = (under ? at.bottom + gap : at.top - box.offsetHeight - gap) + 'px';
        box.style.setProperty('--arrow', at.left + at.width / 2 - left - box.clientLeft + 'px'); // from inside its border
        box.classList.toggle('calc-tip-below', under);
    }

    function showTip() {
        tipTimer = 0;
        if (!document.contains(tipKey)) { // drawn again under the pointer, as the element above the table is: the next move finds what is there now
            tipKey = null;
            return;
        }
        var name = tipKey.textContent.replace(/\s*/g, ''), info = tipFor(tipKey, name),
            cam = tipKey.closest('.calc-graph-export') && tipKey.querySelector('svg'), // the camera has no box: from the camera itself
            at = inside((cam || tipKey).getBoundingClientRect()),
            // a card of a list: its arrow on it, not in the gap above it; a box a little over it
            gap = cam ? 6 : tipKey.matches('input, textarea') ? 9 : tipKey.matches('.calc-sv-row, .calc-fx-row, .calc-gx-row') ? 6 : 10;

        if (!info) {
            tipEmpty = true;
            return;
        }
        tip.innerHTML = '<div class="calc-tip-head"><b>' + tr(info.t) + '</b>' +
            (secondKey(name) ? '<span class="calc-tip-2nd">2nd</span>' : '') +
            (info.k ? '<kbd>' + info.k + '</kbd>' : '') + '</div><div class="calc-tip-body"><div>' + tr(info.d) + '</div>' +
            (info.second && !secondActive ? '<div class="calc-tip-more">' + tr('With 2nd: {f}', { f: info.second }) + '</div>' : '') + '</div>';
        tip.hidden = false;
        placeTip(tip, at, gap); // above the key, in the middle of it
    }

    function hideTip() {
        clearTimeout(tipTimer);
        tipTimer = 0;
        clearTimeout(tipLeave);
        tipLeave = 0;
        if (!tip.hidden) tipGone = Date.now();
        tip.hidden = true;
    }

    // Resting on a result of the solver, the numbers, the converter, the statistics or a constant shows it in a tip, as a
    // key's: its name, what it is where a tip says so, and the result in full, a long one that its tile
    // cuts short as well; with Insert, where it is a number, and Copy. The tip stays while the pointer is
    // on the result or on the tip, to click its buttons. Not on a touch screen, where a touch puts it in
    var peek = document.createElement('div'),
        peekTile = null, // the result it is of, or is to be of
        peekTimer = 0, // till it shows, 0 while none is coming
        peekHide = 0, // till it goes, after the pointer has left
        peekGone = 0, // when the last one went, so the next one comes at once
        peekStill = null, // where Copy was pressed: no tip till the pointer moves from there, though the result under it changed
        peekPut = false; // Insert of a tip or a menu: only then does a click on a result put it in

    // a result put in by Insert of its tip or menu, as a click on it did once
    function putFrom(tile) {
        peekPut = true;
        try { tile.click(); } finally { peekPut = false; }
    }

    // a click on a result puts it in only from Insert; on a touch screen, with no tip, a touch still does
    function mayPut() {
        return peekPut || touchScreen();
    }

    peek.className = 'calc-tip calc-peek';
    peek.hidden = true;
    tip.parentNode.appendChild(peek);

    // what the tip of a result shows: { t: its name, shown: t in the language in use already, d: what it is, html: the value, text: as it is copied,
    // put: it goes in }. One that says what it is, as a result of the statistics, has its tip with no value
    // as well, only that; null for any other with no value, – as well, a matrix as a whole, each of whose numbers
    // has its own, and bits
    function peekOf(el) {
        var value, info, shown, row = el.row;
        if (el.classList.contains('calc-sv-cell')) return cellPeek(el);
        // a constant: what it is, and its value, with its unit, as its row has it and as Copy of its menu does
        if (el.classList.contains('calc-fx-row')) {
            info = fxItems.constants[+el.parentNode.dataset.i].item;
            return { t: info.t, d: info.d, html: constantValue(info), text: local(info.v), put: true };
        }
        if (el.classList.contains('calc-stats-tile')) {
            value = statsNow[el.dataset.k];
            info = CalcTips[(statsTab === 'pairs' ? 'pairs ' : 'stats ') + el.dataset.k];
            if (!statsNow.n || !isFinite(value)) return { t: info.t, d: info.d };
            return { t: info.t, d: info.d, html: statsValue(value).html, text: local(statsValue(value).text), put: true };
        }
        if (el.hasAttribute('data-fact')) return chemFactPeek(el);
        value = el.querySelector('.calc-sv-value');
        if (!row || row.m !== undefined || row.flip || (row.text === undefined && !isFinite(row.v)) || !value || /^–?$/.test(value.textContent.trim())) return null;
        if (value.querySelector('svg')) return null; // a drawing: nothing to copy or put in
        shown = value.cloneNode(true); // as the tile shows it: not what is hidden in it, as the … of a protein in full, popped out
        info = shown.querySelectorAll('*'); // the same elements in the same order, kept as they were while some go
        Array.prototype.forEach.call(value.querySelectorAll('*'), function (x, i) {
            if (getComputedStyle(x).display === 'none') info[i].remove();
        });
        return { t: row.l, html: shown.innerHTML, // its name in English, as tr() takes it, not as its label shows it
            text: row.text !== undefined ? (row.copy !== undefined ? row.copy : shown.textContent) : row.say || local(statsValue(row.v).text), put: row.text === undefined }; // say: as a value of the converter is written; copy: all of it, as its Copy
    }

    // a number of a matrix or a table: under the name of its matrix, or of its column, the whole of it, as
    // Insert puts it in; v: the number, for Store of its menu. None for a text in it, as X of a truth table
    function cellPeek(cell) {
        var tile = cell.closest('.calc-sv-tile'), row = tile && tile.row, b = +cell.dataset.b, x, shown;
        x = row && row.m && row.m[+cell.dataset.a] && row.m[+cell.dataset.a][b];
        if (typeof x !== 'number' || !isFinite(x)) return null;
        shown = row.places !== undefined && !(row.head && !b) ? placesValue(x, row.places) : statsValue(x);
        return { t: row.head ? row.head[b] : row.l, html: shown.html, text: local(shown.text), put: true, v: x };
    }

    function showPeek() {
        peekTimer = 0;
        var info = peekTile && document.contains(peekTile) && peekOf(peekTile);
        if (!info) return;
        hideTip();
        // what is under its name scrolls, too long; its buttons stay in sight under it
        peek.innerHTML = '<div class="calc-tip-head"><b>' + (info.shown ? info.t : tr(info.t)) + '</b></div><div class="calc-tip-body">' + (info.d ? '<div>' + tr(info.d) + '</div>' : '') +
            (info.html === undefined ? '</div>' : '<div class="calc-peek-value">' + info.html + '</div></div><div class="calc-peek-acts">' +
                (info.put ? '<span class="calc-peek-act" data-act="insert">' + tr('Insert') + insertIcon() + '</span>' : '') +
                '<span class="calc-peek-act" data-act="copy">' + tr('Copy') + '</span></div>');
        peek.text = info.text;
        peek.hidden = false;
        placeTip(peek, inside(peekTile.getBoundingClientRect()), 8); // above the result, in the middle of it, as a key's tip
    }

    function hidePeek() {
        clearTimeout(peekTimer);
        peekTimer = 0;
        clearTimeout(peekHide);
        if (!peek.hidden) peekGone = Date.now();
        peek.hidden = true;
        peekTile = null;
    }

    // the pointer gone from the result and the tip: it goes a moment later, unless the pointer comes back
    function leavePeek() {
        clearTimeout(peekTimer);
        peekTimer = 0;
        clearTimeout(peekHide);
        if (peek.hidden) peekTile = null;
        else peekHide = setTimeout(hidePeek, 300);
    }

    // A tip shown stays while the pointer goes over another result on its way to the buttons: that one's
    // tip comes only if the pointer rests on it a moment, and not if the pointer goes on to the tip
    tip.parentNode.addEventListener('mouseover', function (e) {
        if (!peekStill && !scrolledAt) peekAt(e.target);
    }, false);

    // the pointer on target: its result's tip, or the tip shown kept, or let go
    function peekAt(target) {
        var el = target.closest('.calc-sv-cell, .calc-sv-tile, .calc-stats-tile, .calc-fx-row'); // a number of a matrix its own
        // its result drawn again under it, as a value set in a box with no key: its tip goes at once, its value gone with it
        if (!peek.hidden && peekTile && !document.contains(peekTile)) hidePeek();
        if (target.closest('.calc-pt-unit, .calc-past-btn')) el = null; // its unit, and Insert and Copy of a constant, have the tip of a key
        if (el && el.classList.contains('calc-fx-row') && (fxTab !== 'constants' || !fx.contains(el))) el = null; // a formula and a letter have the tip of a key
        if (peek.contains(target) || (el && el === peekTile)) {
            clearTimeout(peekHide);
            if (!peek.hidden) { // not on to another one
                clearTimeout(peekTimer);
                peekTimer = 0;
            }
            return;
        }
        if (!el || touchScreen()) return leavePeek();
        clearTimeout(peekTimer);
        if (!peek.hidden) {
            peekTimer = setTimeout(function () {
                hidePeek();
                peekTile = el;
                showPeek();
            }, 350);
            return;
        }
        peekTile = el;
        peekTimer = setTimeout(showPeek, Date.now() - peekGone < 400 ? 0 : 600); // from result to result at once
    }

    tip.parentNode.addEventListener('mouseleave', leavePeek, false);

    // after Copy, the pointer moved on: the tip of what it is on now
    tip.parentNode.addEventListener('mousemove', function (e) {
        if (!peekStill || Math.abs(e.clientX - peekStill[0]) + Math.abs(e.clientY - peekStill[1]) <= 6) return;
        peekStill = null;
        peekAt(e.target);
    }, false);

    // a press elsewhere, a key, or a list scrolled puts it away
    document.addEventListener('mousedown', function (e) {
        if (!peek.contains(e.target)) hidePeek();
    }, true);
    document.addEventListener('keydown', hidePeek, true);
    document.addEventListener('scroll', function (e) {
        if (!peek.contains(e.target)) hidePeek(); // not its own words scrolled
    }, true);

    peek.addEventListener('mousedown', function (e) {
        e.preventDefault(); // the focus stays where it is
    }, false);

    // Insert puts the result in; Copy, and the tip goes
    peek.addEventListener('click', function (e) {
        var act = e.target.closest('[data-act]'), tile = peekTile;
        if (!act) return;
        hidePeek();
        if (!tile || !document.contains(tile)) return; // its result drawn again since: not the value it shows any more
        if (act.dataset.act === 'copy') {
            copy(peek.text);
            peekStill = [e.clientX, e.clientY];
            return;
        }
        putFrom(tile);
    }, false);

    // the memory and the number format say what they hold now
    function tipFor(el, name) {
        var places = fmt.places === 'auto' ? tr('as many digits as each one needs') :
            trn(fmt.places, '{n} decimal place', '{n} decimal places'), info, value;
        if (el.classList.contains('calc-search-clear')) return CalcTips[el.closest('.calc-pt-find') ? 'chem search clear' : 'search clear']; // the table's empties with Esc as well
        if (el.hasAttribute('data-e')) { // a letter of the equation: what it holds now
            value = el.textContent.trim();
            return { t: tr('Variable {value}', { value: value }), d: value + ' = ' + letterValue(value), k: tr('Shift+{value}', { value: value }) };
        }
        if (/^(INPUT|TEXTAREA)$/.test(el.tagName) && (info = lettersTip(el))) return info; // a box with letters in it; any other has the tip of its own below
        if (el.classList.contains('calc-help')) return CalcTips['help'];
        if (el.classList.contains('calc-sv-band')) return CalcTips['light kind ' + el.dataset.kind]; // a kind of light on its chart: what it is used for
        if (el.classList.contains('calc-open-big')) return CalcTips[el.dataset.tip || 'open big']; // the website's its own (app.js)
        if (findPanel.contains(el)) return CalcTips[el.classList.contains('calc-panel-size') ? 'search big' : 'search close'];
        if (el.classList.contains('calc-panel-size')) return CalcTips[bigPanel ? 'panel small' : 'panel big'];
        if (el === radDeg) return CalcTips['unit ' + radDeg.firstChild.data];
        if (el === fxButton) return CalcTips[fx.classList.contains('calc-open') ? 'formulas close' : 'formulas'];
        if (fx.contains(el)) return fxTip(el);
        if (el === convButton) return CalcTips[conv.classList.contains('calc-open') ? 'converter close' : 'converter'];
        if (conv.contains(el)) return convTip(el);
        if (el === statsButton) return CalcTips[stats.classList.contains('calc-open') ? 'stats close' : 'stats'];
        if (el === statsChart) return CalcTips[statsTab === 'pairs' ? 'pairs chart' : 'stats chart'];
        if (stats.contains(el)) {
            if (el.classList.contains('calc-solve-tab')) return CalcTips['stats tab ' + el.dataset.tab] || null;
            if (el === statsFitPick) return CalcTips['stats fit'];
            if (stats.querySelector('.calc-stats-tests').contains(el)) return statTests.tip(el);
            return CalcTips[el.classList.contains('calc-past-clear') ? 'stats clear' : 'stats close'];
        }
        if (el === solveButton) return CalcTips[solvePanel.classList.contains('calc-open') ? 'solve close' : 'solve'];
        if (solvePanel.contains(el)) return solver.tip(el);
        if (el === numbersButton) return CalcTips[numbersPanel.classList.contains('calc-open') ? 'numbers close' : 'numbers'];
        if (numbersPanel.contains(el)) return numbers.tip(el);
        if (el === physButton) return CalcTips[physPanel.classList.contains('calc-open') ? 'phys close' : 'phys'];
        if (physPanel.contains(el)) return physPart.phys.tip(el);
        if (el === bioButton) return CalcTips[bioPanel.classList.contains('calc-open') ? 'bio close' : 'bio'];
        if (bioPanel.contains(el)) return bioPart.bio.tip(el);
        if (el === chemPart.chemButton) return CalcTips[chemPart.chemPanel.classList.contains('calc-open') ? 'chem close' : 'chem'];
        if (chemPart.chemPanel.contains(el)) return chemTip(el);
        if (el === graphButton) return CalcTips[graph.classList.contains('calc-open') ? 'graph close' : 'graph'];
        if (graph.contains(el)) {
            if (el.classList.contains('calc-gx-row')) return exampleTip(el);
            if (el.classList.contains('calc-past-clear')) return CalcTips['graph clear'];
            if (el.classList.contains('calc-past-close')) {
                info = CalcTips['graph close'];
                return root.classList.contains('calc-big') && !graphPart.graphAlone ? { t: info.t, d: info.d, k: '' } : info; // Esc makes it small first
            }
            if (el === graphPart.graphSize) return CalcTips[root.classList.contains('calc-big') ? 'graph small' : 'graph big'];
            if (el === graphPart.graphAdd) return CalcTips['graph add'];
            if (undoKind(el)) { // graph.js
                info = CalcTips['graph ' + undoKind(el)];
                return { t: info.t, d: info.d, k: mac ? info.k.replace('Ctrl+Shift+', '⇧⌘').replace('Ctrl+', '⌘') : info.k };
            }
            if (el.classList.contains('calc-graph-del')) return CalcTips['graph remove'];
            if (el.classList.contains('calc-graph-diff')) {
                value = graphRows.indexOf(el.parentNode);
                if (graphRows[value].classList.contains('calc-graph-data')) return CalcTips['graph fit ' + (nextFit(graphPart.graphDiff[value]) || 'off')];
                return CalcTips['graph slope ' + (graphPart.graphDiff[value] ? 'off' : 'on')];
            }
            if (el.classList.contains('calc-graph-points')) {
                return CalcTips[graphPart.graphCellsRow === graphRows.indexOf(el.parentNode) ? 'graph points off' : 'graph points'];
            }
            if (el.classList.contains('calc-graph-pop-end')) return CalcTips['graph end ' + el.dataset.end];
            if (el.classList.contains('calc-graph-pop-row')) return CalcTips['graph put ' + (seqOf(graphPart.graphPinned) ? 'term ' : '') + el.dataset.put];
            if (el.classList.contains('calc-graph-play')) return CalcTips[graphPart.graphPlay[el.parentNode.dataset.k] ? 'graph pause' : 'graph play'];
            if (el.classList.contains('calc-graph-style')) return CalcTips['graph style'];
            if (el.classList.contains('calc-graph-swatch')) {
                value = graphRows.indexOf(el.parentNode);
                return graphInputs[value].value.trim() ? CalcTips[graphPart.graphOff[value] ? 'graph show' : 'graph hide'] : null;
            }
            if (el.dataset.look) return CalcTips['graph look ' + el.dataset.look];
            if (el.dataset.arrows) return CalcTips['graph look arrows ' + el.dataset.arrows];
            if (el === graphPart.graphReset) return CalcTips['graph reset'];
            return CalcTips['graph ' + el.dataset.zoom];
        }
        if (el === pastButton) return CalcTips[past.classList.contains('calc-open') ? 'history close' : 'history'];
        if (varList.contains(el)) return letterTip(el);
        if (el === findCalc) {
            if (findPanel.classList.contains('calc-open')) return CalcTips['search close'];
            return { t: CalcTips['search'].t, d: CalcTips['search'].d, k: mac ? '⌘K' : CalcTips['search'].k };
        }
        if (el === pastExport) return CalcTips['history export'];
        if (el.classList.contains('calc-past-clear')) return CalcTips[pastTab === 'vars' ? 'letters clear' : 'history clear'];
        if (el.classList.contains('calc-past-close')) return CalcTips['history close'];
        if (el.classList.contains('calc-past-del')) return CalcTips['history delete'];
        if (el.classList.contains('calc-past-unit')) return CalcTips['history unit ' + (UNITS.indexOf(name) > -1 ? name : 'mixed')];
        if (el.classList.contains('calc-past-btn')) {
            return CalcTips['history ' + el.dataset.act + (el.closest('.calc-past-eq') ? ' equation' : ' result')];
        }
        if (el === fracMark) return CalcTips[dmsMode ? 'DMS' : 'FRAC'];
        if (el === hold) return CalcTips['hold'];
        if (el === sto) return CalcTips['STO'];
        if (el === mem) {
            return {
                t: 'Memory',
                d: tr('The memory holds {v}. Click to put it into the equation, as mr does. mc empties it.', { v: local(+(+engine.memory).toPrecision(13)) }),
                k: 'm'
            };
        }
        if (el === fmtMark) {
            return {
                t: 'Number format',
                d: tr('{v} MODE goes on to the next; click here to change it on the options page.', { v: (fmt.notation === 'fix' ? (fmt.places === 'auto' ? tr('Results are shown as usual, with {places}.', { places: places }) :
                    tr('Results are rounded to {places}.', { places: places })) :
                    (fmt.notation === 'sci' ? tr('Results are shown in scientific notation, 1.23e+4, with {places}.', { places: places }) : tr('Results are shown in engineering notation, powers of ten in steps of three, 12.3e+3, with {places}.', { places: places }))) }),
                k: ''
            };
        }
        return CalcTips[name];
    }

    // true for the name of a function on the 2nd layer: sin-1, log2, 2x …
    function secondKey(name) {
        return secondLayer[1].some(function (label) {
            return label.replace(/<[^>]*>/g, '') === name;
        });
    }

    // ---------------- the menu of a right click ---------------- //

    // What it holds depends on where it opens. On the display: Cut, Copy, Paste, and Reset
    // (everything but the history, what is typed in the panels as well). In a box of a panel: Cut, Copy,
    // Paste and Select all, as the browser's menu has. On a value of a panel, a unit of
    // the converter, a result of the statistics, a constant, a line of the history:
    // Copy and Insert; elsewhere in a panel, the menu of its box. On the keys there is none
    menu.addEventListener('click', function (e) {
        var item = e.target.closest('[data-i]');
        if (!item || item.classList.contains('calc-off') || item.classList.contains('calc-menu-part')) return;
        showMenu(false);
        menu.items[+item.dataset.i][1]();
    }, false);

    // a press in the menu leaves the focus and what is selected as they are, for what is chosen; but
    // in a box of its own, as the hex of a color, it is typed in
    menu.addEventListener('mousedown', function (e) {
        if (!e.target.closest('input')) e.preventDefault();
    }, false);

    document.addEventListener('contextmenu', function (e) {
        var items, at;
        if (!root.contains(e.target)) return; // the rest of the page has the menu of the browser
        at = menu.at = inside({ left: e.clientX, top: e.clientY }); // where Store in Var opens the letters
        at.alignRight = CalcLang.rtl; // right to left, at the left of the pointer, its lines from the right
        items = menuItems(e.target); // taken now, while what is selected is still selected
        menu.had = !!items; // for a hold, which opened it: let go, it presses nothing
        e.preventDefault(); // in the calculator the menu of the browser is never shown
        if (!items) return;
        if (!items.some(function (item) { return item && item.clip; })) return openMenu(items, at, null);
        clipboardHas(function (has) { // Paste is left out while the clipboard is known to be empty
            openMenu(has ? items : items.filter(function (item) { return !item || !item.clip; }), at, null);
        });
    }, false);

    // A touch screen has no right click: a finger held still opens the menu of where it is, as the right click would.
    // Not in a box, where the browser's own menu of the text is. On a display too long for the screen a hold is how
    // its text is picked (startPick), so there the menu opens as the finger is let go, if it did not move; so too on
    // the graph's plot and the periodic table's slider, where holding still may be the start of a pinch or a drag.
    // Android's browser opens the menu at a hold itself, sooner: that one is held back, the hold's own opening it as
    // ever; after it, the browser's is not shown again, nor its own after the hold's, sent as the finger is let go
    // (Windows); nor Chrome's of a tap on text selected, as the third of three taps. The iPhone's selection of the
    // text held is not made, as it would be drawn over the menu. A menu opened, letting go presses nothing under the
    // finger. With no menu there, as on the keys, the tip of what is held comes instead, and stays when the finger is
    // let go, pressing nothing, until the next touch anywhere but on the tip, which may scroll
    (function () {
        var HOLD = 1500, timer = null, press = null, opened = false, heldAt = 0, tappedAt = 0, letGo = null;

        function stop() {
            clearTimeout(timer);
            timer = null;
        }

        function open() {
            var t = press.target;
            stop();
            press.done = true;
            heldAt = Date.now();
            menu.had = false; // what it was held on drawn again meanwhile, no menu reached: not one before's
            t.dispatchEvent(new MouseEvent('contextmenu', {
                bubbles: true, cancelable: true, view: window, button: 2, clientX: press.x, clientY: press.y
            }));
            opened = menu.had || holdTip(t); // on the keys there is none: their tip; with no tip either, let go, the key is pressed as ever
        }

        // the tip of what is held, at once, not after the second of rest of a pointer; true if there is one
        function holdTip(t) {
            if (tip.contains(t)) return false;
            hideTip();
            tipKey = null;
            onKey(t, false);
            if (!tipTimer) return false;
            clearTimeout(tipTimer);
            showTip();
            return !tip.hidden;
        }

        root.addEventListener('pointerdown', function (e) {
            stop();
            press = null;
            if (e.pointerType === 'touch' && !tip.contains(e.target)) hideTip(); // a tip a hold showed, till the next touch
            if (!e.isPrimary) return; // a second finger: a pinch, not a hold
            if (e.pointerType !== 'touch' || e.target.closest('textarea, input, select, [contenteditable]')) return;
            press = { target: e.target, x: e.clientX, y: e.clientY, at: Date.now(), done: false,
                onRelease: display.contains(e.target) && display.scrollWidth > display.clientWidth || !!e.target.closest('.calc-graph-plot, .calc-pt-range-knob') };
            if (!press.onRelease) timer = setTimeout(open, HOLD);
        }, false);

        // moved: a slide, a scroll or a drag, not a hold
        root.addEventListener('pointermove', function (e) {
            if (press && e.isPrimary && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) {
                stop();
                press = null;
            }
        }, false);

        root.addEventListener('pointerup', function (e) {
            if (!press || !e.isPrimary) return;
            if (press.onRelease && !press.done && Date.now() - press.at >= HOLD && !String(window.getSelection())) open();
            if (!press.done && Date.now() - press.at < HOLD) tappedAt = Date.now();
            stop();
            press = null;
            clearTimeout(letGo); // what the browser sends of the press comes at once, if at all: after that, nothing is held back
            if (opened) letGo = setTimeout(function () { opened = false; }, 400);
        }, false);

        root.addEventListener('pointercancel', function () {
            stop();
            press = null;
        }, false);

        // the browser's own, of Android: before the hold's, held back for it; after it, not shown again
        window.addEventListener('contextmenu', function (e) {
            if (!e.isTrusted) return;
            if (!press) { // let go already: the browser's of the hold, as the finger is let go; or of a tap on text selected, Chrome's
                if (Date.now() - heldAt < 1000 || Date.now() - tappedAt < 400) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
                return;
            }
            if (press.done || Date.now() - press.at < HOLD) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return;
            }
            stop();
            press.done = true;
        }, true);

        // the iPhone's selection of the word held, drawn over the menu: not made while a hold may open it
        document.addEventListener('selectstart', function (e) {
            if (press && !press.onRelease) e.preventDefault();
        }, true);

        // the press the finger makes as it is let go, after the menu opened; until the next press, anywhere
        window.addEventListener('pointerdown', function () {
            opened = false;
        }, true);
        ['mousedown', 'mouseup', 'click'].forEach(function (type) {
            window.addEventListener(type, function (e) {
                if (!opened || menu.contains(e.target) || type === 'click' && !e.detail) return; // a click of Enter or of a script is not of the finger
                if (type === 'click') opened = false;
                e.preventDefault();
                e.stopImmediatePropagation();
            }, true);
        });
    })();

    // whether the clipboard holds text, for Paste of the menu. The page reads it only where the
    // browser allows that already, and asks for nothing; where it cannot tell, it may hold some
    function clipboardHas(done) {
        var answered = false, timer;
        function answer(text) {
            if (answered) return;
            answered = true;
            clearTimeout(timer);
            done(typeof text !== 'string' || !!text.trim());
        }
        if (ask('clipboard', { text: answer })) return answer(null); // no page that reads it
        timer = setTimeout(answer, 300, null); // nor one that answers soon
    }

    // The menu of these items, at the place at of the calculator, within it, or with at.alignRight its
    // right edge there; by: the button it opened from, whose press shuts it again, or null. An item
    // null is a line between them, left out at either end and where two meet, its items left out
    function openMenu(items, at, by, kind) {
        items = items.filter(function (item, i) {
            return item || (i && items[i - 1]);
        });
        if (items.length && !items[items.length - 1]) items.pop();
        if (items.length && !items[0]) items.shift();
        menu.items = items;
        menu.by = by;
        menu.at = at;
        menu.className = 'calc-menu-box' + (kind ? ' ' + kind : '');
        menu.innerHTML = items.map(function (item, i) {
            if (!item) return '<hr>';
            // a part of its own, as the colors of a curve, with nothing to do on a click: item[3] sets it up. Each
            // in the language in use already, as it is shown: tr('Copy'), its tick or its value with it
            return '<div data-i="' + i + '"' + (item[2] === false ? ' class="calc-off"' : !item[1] ? ' class="calc-menu-part"' : '') + '>' + item[0] + '</div>';
        }).join('');
        items.forEach(function (item, i) {
            if (item && item[3]) item[3](menu.querySelector('[data-i="' + i + '"]'));
        });
        menu.style.left = menu.style.top = '0'; // measured where it has all the room, not where it was last: there it may wrap
        showMenu(true);
        fitMenu();
    }

    // the menu where it opened, within the calculator: again as it grows
    function fitMenu() {
        var calc = menu.parentNode, at = menu.at;
        menu.style.left = Math.max(4, Math.min(at.alignRight ? at.left - menu.offsetWidth : at.left, calc.clientWidth - menu.offsetWidth - 4)) + 'px';
        menu.style.top = Math.max(4, Math.min(at.top, calc.clientHeight - menu.offsetHeight - 4)) + 'px';
    }

    document.addEventListener('mousedown', function (e) {
        // a selection stays for Copy, and a box of a panel keeps the focus
        if (e.button === 2 && e.target.closest('.calc-display, .calc-past') && !e.target.closest('textarea, input')) e.preventDefault();
        if (!menu.hidden && !menu.contains(e.target)) {
            if (menu.by) menu.by.shut = menu.by.contains(e.target); // its button pressed: it stays shut, and does not open again
            showMenu(false);
        }
    }, true);

    window.addEventListener('blur', function () {
        showMenu(false);
    }, false);

    function showMenu(open) {
        if (!open && menu.contains(document.activeElement)) document.activeElement.blur();
        menu.hidden = !open;
    }

    // the lines of the menu for where it opens: [name, what it does, false while it cannot be done];
    // nothing where there is no menu
    function menuItems(el) {
        var box = el.closest('textarea, input'), panel = el.closest('.calc-past'), text, span, row, part, k, paste;

        // the display has only what can be done: Cut and Copy with something in it, Store in Var with
        // a value, Paste with something in the clipboard
        if (el.closest('.calc-display')) {
            text = selectedText(); // taken now, as it is selected
            span = selectedSpan();
            paste = [tr('Paste'), function () { askPaste(null); }];
            paste.clip = true;
            return [
                !empty() && [tr('Cut'), function () { copy(text || copyText()); cutOut(span); }],
                !empty() && [tr('Copy'), function () { copy(text || copyText()); }],
                paste,
                null,
                insertItem(),
                !empty() && !engine.error && storeItem(storeIn),
                null,
                [tr('Reset all'), resetAll]
            ].filter(function (item) { return item !== false; });
        }
        if (!panel) return null; // the keys
        if (box) return boxItems(box);

        // a result of a card with a value, or a number of a matrix, as its tip has it: of the converter, with its unit as well
        if ((row = el.closest('.calc-sv-cell') || el.closest('.calc-sv-tile')) && (part = peekOf(row)) && part.put) {
            k = part.v !== undefined ? part.v : row.row ? row.row.v : +row.dataset.v; // an element's fact has no row, its v from its peek
            return [
                [tr('Copy'), function () { copy(part.text); }],
                row.row && row.row.unit && [tr('Copy with unit'), function () { copy(part.text + (row.row.dms ? '' : ' ' + row.row.unit)); }],
                [tr('Insert'), function () { putFrom(row); }],
                null,
                storeItem(function (letter) { setLetter(letter, k); })
            ].filter(function (item) { return item !== undefined; });
        }
        if (panel === stats && (row = el.closest('.calc-stats-tile')) && statsNow.n && isFinite(statsNow[row.dataset.k])) {
            text = local(statsValue(statsNow[row.dataset.k]).text);
            k = statsNow[row.dataset.k];
            return [
                [tr('Copy'), function () { copy(text); }],
                [tr('Insert'), function () { putFrom(row); }],
                null,
                storeItem(function (letter) { setLetter(letter, k); })
            ];
        }
        if (panel === past && (row = el.closest('.calc-var'))) {
            k = row.dataset.k;
            return [
                [tr('Insert'), function () { putLetter(k); }],
                [tr('Copy'), function () { copy(letterText(k)); }],
                [tr('Store result'), function () { storeIn(k); }, !engine.error],
                [tr('Clear'), function () { setLetter(k, 0); }, !!engine.vars[k]]
            ];
        }
        if (panel === fx && (row = el.closest('.calc-fx-item'))) {
            k = fxItems[fxTab][+row.dataset.i].item;
            if (fxTab === 'constants') {
                return [
                    [tr('Copy'), function () { copy(local(k.v)); }],
                    [tr('Copy with unit'), function () { copy(local(k.v) + ' ' + plain(k.u)); }, !!k.u],
                    [tr('Insert'), function () { putConstant(k); }],
                    null,
                    storeItem(function (letter) { setLetter(letter, k.v); })
                ];
            }
            return [
                [tr('Copy'), function () { copy(formulaText(k.f)); }],
                row.classList.contains('calc-on') ? [tr('Insert'), function () { insertFormula(row); }] :
                    [tr('Open'), function () { openFormula(row); }]
            ];
        }
        if (panel === past) {
            row = el.closest('.calc-past-row');
            if (!row) return [[tr(pastTab === 'vars' ? 'Clear variables' : 'Clear history'), function () { pastClear.click(); }, !pastClear.classList.contains('calc-off')]];
            // on the equation, the equation; anywhere else on the line, its result
            part = el.closest('.calc-past-eq') || row.querySelector('.calc-past-res');
            k = engine.past[+row.dataset.i];
            return ['copy', 'insert'].map(function (act) {
                return [act === 'copy' ? tr('Copy') : tr('Insert'), function () { part.querySelector('[data-act="' + act + '"]').click(); }];
            }).concat([null, storeItem(function (letter) { setLetter(letter, +k.value); }), null,
                [tr('Delete'), function () { row.querySelector('.calc-past-del').click(); }]]);
        }
        if (panel === graph && (row = el.closest('.calc-graph-cell')) && isFinite(k = graphPart.graphValues[row.dataset.r][row.dataset.c])) {
            text = local(+row.dataset.c ? statsValue(k).text : String(k));
            return [
                [tr('Copy'), function () { copy(text); }],
                [tr('Insert'), function () { row.click(); }],
                null,
                storeItem(function (letter) { setLetter(letter, k); })
            ];
        }
        if (panel === graph && el.closest('.calc-graph-fn > .calc-graph-swatch')) return styleItems(graphRows.indexOf(el.closest('.calc-graph-fn')));
        if (panel === graph && el.closest('.calc-graph-plot') && !el.closest('.calc-graph-pop')) {
            return exportItems();
        }
        if (panel === graph && (row = el.closest('.calc-graph-pop-row')) && graphPart.graphPinned) {
            k = graphPart.graphPinned[row.dataset.put];
            return [
                [tr('Copy'), function () { copy(local(graphPart.graphPinned.spot ? k : statsValue(k).text)); }],
                [tr('Insert'), function () { row.click(); }],
                null,
                storeItem(function (letter) { setLetter(letter, +k); }, isFinite(+k))
            ];
        }
        box = panel === stats ? statsInput : panel === fx ? fxSearch : panel === graph ? graphInputs[0] : // of the converter, the first box of the card open
            panel === conv ? conv.querySelector('.calc-sv-list:not([hidden]) .calc-sv-item.calc-on input') || (convSearch.parentNode.hidden ? null : convSearch) : null;
        return box ? boxItems(box) : null;
    }

    // Cut and Copy take what is selected in the box, and Paste goes in its place
    function boxItems(box) {
        var some = box.selectionStart !== box.selectionEnd;
        return [
            [tr('Cut'), function () { box.focus(); document.execCommand('cut'); }, some],
            [tr('Copy'), function () { box.focus(); document.execCommand('copy'); }, some],
            [tr('Paste'), function () { askPaste(box); }],
            [tr('Select all'), function () { box.focus(); box.select(); }, !!box.value]
        ];
    }

    // Paste of the menu: the page around the calculator reads the clipboard, as the browser
    // may ask once to allow that, and gives the text back: for the box, or the equation
    function askPaste(box) {
        if (box) box.focus();
        ask('paste', {
            text: function (text) {
                if (!box) doPaste(text);
                else if (box.offsetParent) typeInto(box, text); // its panel is still open
            },
            refused: function () { // the browser did not allow reading the clipboard
                notify('Use Ctrl+V');
            }
        });
    }

    // text put into a box as if typed, over what is selected there; a box of one line takes it as one line
    function typeInto(box, text) {
        if (box.tagName === 'INPUT') text = text.replace(/\s*[\r\n]+\s*/g, ' ').trim();
        if (!text) return;
        box.focus();
        if (!document.execCommand('insertText', false, text)) {
            box.setRangeText(text, box.selectionStart, box.selectionEnd, 'end');
            box.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function resetAll() {
        if (secondActive) {
            keyDown(false, keyBoard['2nd']);
            doKey('2nd', true);
        }
        setUnit(0);
        if (fracMode) toggleFraction();
        if (dmsMode) toggleDms();
        engine.memory = 0;
        engine.reset(); // the equation too; the history and its letters stay
        hold.textContent = '';
        arm(false);
        keyBoard['AC'].children[0].firstChild.data = 'AC';
        // what is typed in the panels, and each on its first tab with no card open: the list of the
        // statistics, the search and a formula open, the value to convert and the dates, the graph
        // and its examples, and the boxes of the solver and the numbers
        statsInput.value = '';
        statsTexts = { list: '', pairs: '', tests: '' };
        statsTab = 'list';
        setStatsFit('lin');
        statsTiles();
        setStatsBy(0);
        statTests.clear();
        renderStats();
        fxSearch.value = '';
        fxTab = 'formulas';
        store('fxTab', fxTab);
        renderFx();
        convSearch.value = '';
        unitCards.clear();
        dates.clear();
        convTab = 'units';
        convTabs();
        saveConv();
        clearGraph();
        graphPart.graphSearch.value = '';
        showGraphTab('graph');
        toolPanels.forEach(function (p) { p.clear(); });
        clearChem();
        refresh();
        saveState();
    }

    // the unit at the bottom of the display switches Deg and Rad, as its key does
    // The marks in the display can be clicked: the unit switches Deg and Rad,
    // FRAC and DMS turn their mode off and M recalls the memory, as their keys do;
    // FIX opens the options, where the number format is set; hold is let go
    [[radDeg, 'Deg'], [fracMark, 'a/b'], [mem, 'mr']].forEach(function (mark) {
        mark[0].addEventListener('click', function () {
            var key = mark[0] === fracMark && dmsMode ? '°′″' : mark[1];
            keyDown(false, keyBoard[key]);
            doKey(key);
            saveState();
        }, false);
    });

    fmtMark.addEventListener('click', function () {
        ask('options');
    }, false);

    hold.addEventListener('click', function () {
        hold.textContent = '';
    }, false);

    // ---------------- the letters A to J ---------------- //

    // A value is kept in each of A to J, as on a TI or a Casio: STO→, the > key, then a letter
    // works the line out and keeps its result there, 5 + 3 → A. Shift+A to J put the letter in
    // the equation, where it stays a letter, A × 2, and is worked out with what it holds. The
    // Variables tab of the history lists them, and a value of a panel is stored by its menu
    function arm(on) {
        sto.textContent = on ? 'STO→' : '';
        if (on) hold.textContent = '';
    }

    sto.addEventListener('click', function () {
        arm(false);
    }, false);

    // the line worked out into a letter; an error shows as = would give it
    function storeIn(k) {
        arm(false);
        if (engine.store(k, deg)) notify('→ ' + k);
        unselect();
        refresh();
        saveState();
        lettersChanged();
    }

    // a letter at the cursor, or in place of what is selected, as π is; after STO→ it takes the
    // result instead, chosen with the mouse as with Shift+A
    function putLetter(k) {
        var span = selectedSpan();
        if (sto.textContent) return storeIn(k);
        if (!(span ? engine.pressOver('#' + k, deg, span[0], span[1]) : engine.press('#' + k, deg))) return;
        unselect();
        keyBoard['AC'].children[0].firstChild.data = 'C';
        refresh();
        saveState();
    }

    // a number of a panel kept in a letter
    function setLetter(k, n) {
        if (!engine.setLetter(k, n)) return;
        notify('→ ' + k);
        saveState();
        lettersChanged();
    }

    // what the letters hold changed: their list shows it, and a graph with a letter is drawn again
    function lettersChanged() {
        if (past.classList.contains('calc-open') && pastTab === 'vars') renderPastTab();
        if (graphInputs.some(function (box, i) { return i < graphPart.graphCount && /[A-J]/.test(box.value); })) readGraph();
        if (conv.classList.contains('calc-open') && convTab === 'units') unitCards.run(); // a value of A, converted again
    }

    // Store in Var: a menu of the letters, each with what it holds, in place of the menu it was chosen in
    function storeItem(store, can) {
        var at = menu.at;
        return [tr('Store in Var') + MORE, function () { lettersMenu(store, at); }, can !== false];
    }

    // Insert Var: the same menu of the letters, the one chosen put in at the cursor, as Shift+A does
    function insertItem() {
        var at = menu.at;
        return [tr('Insert Var') + MORE, function () { lettersMenu(putLetter, at); }];
    }

    function lettersMenu(pick, at) {
        openMenu(CalcEngine.LETTERS.split('').map(function (k) {
            return [k + '<span class="calc-menu-val">' + letterValue(k) + '</span>', function () { pick(k); }];
        }), at, null, 'calc-menu-letters');
    }

    // the tip of a box that uses letters, of a formula, of Solve or of the graph: what each holds now,
    // A = 200000; none for a box without one, nor where A to F are digits, as in the Numbers panel
    function lettersTip(box) {
        var used = fx.contains(box) || solvePanel.contains(box) || physPanel.contains(box) || graph.contains(box) || convUnits.contains(box) ||
            ((numbersPanel.contains(box) || bioPanel.contains(box)) && box.dataset.num) ? // Biology's others, as a sequence, are of bases, not variables
            CalcEngine.lettersOf(box.value) : [];
        if (!used.length) return null;
        return {
            t: used.length > 1 ? 'Variables' : tr('Variable {used}', { used: used[0] }),
            d: used.map(function (k) { return k + ' = ' + letterValue(k); }).join('<br>'),
            k: ''
        };
    }

    // what a letter holds, as the display would show it, cut short for the menu
    function letterValue(k) {
        return local(+(+engine.vars[k]).toPrecision(10));
    }

    // and all of it, for its box of the Variables tab and Copy: 0.3, not 0.30000000000000004
    function letterText(k) {
        return local(String(+(+engine.vars[k]).toPrecision(15)));
    }

    // shows a short notice in the display, then fades it out
    function notify(text) {
        var op = 1; // initial opacity

        clearInterval(noticeTimer);
        notification.innerHTML = tr(text);
        notification.style.display = 'unset';
        noticeTimer = setInterval(function () {
            if (op <= 0.1) {
                clearInterval(noticeTimer);
                notification.style.display = 'none';
            }
            notification.style.opacity = op;
            op -= op * 0.1;
        }, 50);
    }

    // ---------------- history ---------------- //

    pastButton.addEventListener('click', function () {
        showPast(!past.classList.contains('calc-open'));
    }, false);

    // any press outside the history closes it; the button toggles it itself.
    // The menu is over the panel it was opened in, and the tip of a result over its panel
    document.addEventListener('pointerdown', function (e) {
        if (menu.contains(e.target) || peek.contains(e.target) || !root.contains(e.target)) return; // not a press in the rest of the page
        if (past.classList.contains('calc-open') && !past.contains(e.target) && !pastButton.contains(e.target)) {
            showPast(false);
        }
        if (findPanel.classList.contains('calc-open') && !findPanel.contains(e.target) && !findCalc.contains(e.target)) {
            closeFindPanel();
        }
        if (stats.classList.contains('calc-open') && !stats.contains(e.target) && !statsButton.contains(e.target)) {
            showStats(false);
        }
        if (fx.classList.contains('calc-open') && !fx.contains(e.target) && !fxButton.contains(e.target)) {
            showFx(false);
        }
        if (conv.classList.contains('calc-open') && !conv.contains(e.target) && !convButton.contains(e.target)) {
            showConv(false);
        }
        if (graph.classList.contains('calc-open') && !graph.contains(e.target) && !graphButton.contains(e.target)) {
            showGraph(false);
        }
        if (solvePanel.classList.contains('calc-open') && !solvePanel.contains(e.target) && !solveButton.contains(e.target)) {
            showSolve(false);
        }
        if (numbersPanel.classList.contains('calc-open') && !numbersPanel.contains(e.target) && !numbersButton.contains(e.target)) {
            showNumbers(false);
        }
        if (physPanel.classList.contains('calc-open') && !physPanel.contains(e.target) && !physButton.contains(e.target)) {
            showPhys(false);
        }
        if (bioPanel.classList.contains('calc-open') && !bioPanel.contains(e.target) && !bioButton.contains(e.target)) {
            showBio(false);
        }
        if (chemPart.chemPanel.classList.contains('calc-open') && !chemPart.chemPanel.contains(e.target) && !chemPart.chemButton.contains(e.target)) {
            showChem(false);
        }
    }, true);

    past.querySelector('.calc-past-close').addEventListener('click', function () {
        showPast(false);
    }, false);

    // Clear: of the history, or on its Variables tab every letter back to 0
    pastClear.addEventListener('click', function () {
        if (pastTab === 'vars') return clearLetters();
        engine.past = [];
        renderPastTab(); // the history stays open, empty, its Clear off
        refresh();
        saveState();
    }, false);

    // Export: a menu below its button, as the right click's, of the whole history, oldest first:
    // copied as text, a line of each, 1 + 2 = 3; saved as a CSV file, an equation and its result
    // on each line, for a spreadsheet; or saved as a text file of the lines copied
    pastExport.addEventListener('click', function () {
        var at = inside(pastExport.getBoundingClientRect());
        if (pastExport.shut || !engine.past.length) {
            pastExport.shut = false;
            return;
        }
        openMenu([
            [tr('Copy as text'), function () { copy(pastText()); }],
            [tr('Save as CSV'), function () { saveText(pastCsv(), 'text/csv', 'csv'); }],
            [tr('Save as text'), function () { saveText(pastText(), 'text/plain', 'txt'); }]
        ], { left: at.right, top: at.bottom + 4, alignRight: true }, pastExport);
    }, false);

    // each calculation of the history, the oldest first: [its equation, its result], as their copy buttons copy them
    function pastPairs() {
        return engine.past.map(function (entry, i) {
            return [local(engine.pastLine(i).text.replace(/ =$/, '')), local(shownResult(entry, '').text)];
        });
    }

    function pastText() {
        return pastPairs().map(function (p) { return p[0] + ' = ' + p[1]; }).join('\n') + '\n';
    }

    // The history as CSV, as RFC 4180 has it: a line of each calculation, apart by commas, or
    // semicolons where the decimal mark is a comma, and a cell with one of them, a quote or a new
    // line in quotes, its quotes twice. The result as a number, all of its digits, which a
    // spreadsheet reads as one. A cell a spreadsheet would read as a formula, of =, +, @, a tab or
    // a return first, or a – not before a digit, has a ' first, so it is read as text: –2 stays a
    // number. A mark first for Excel, which then reads it as UTF-8, its × and √ as they are
    function pastCsv() {
        var mark = engine.comma ? ';' : ',';
        function cell(s) {
            if (/^[=+@\t\r]/.test(s) || /^-(?!\d)/.test(s)) s = "'" + s;
            return s.indexOf(mark) > -1 || /["\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }
        return '\ufeff' + [['expression', 'result']].concat(pastPairs().map(function (p, i) {
            return [p[0], local(engine.past[i].value)];
        })).map(function (row) { return row.map(cell).join(mark); }).join('\r\n') + '\r\n';
    }

    // a text saved as a file of the history, calculator-history-2026-10-15.csv, of today
    function saveText(text, type, ext) {
        var now = new Date(), day = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(function (n) { return n < 10 ? '0' + n : n; }).join('-');
        saveBlob(new Blob([text], { type: type + ';charset=utf-8' }), 'calculator-history-' + day + '.' + ext);
    }

    // the x on a row takes the calculation out of the history, equation and result
    pastList.addEventListener('click', function (e) {
        var del = e.target.closest('.calc-past-del'), i = del && +del.parentNode.dataset.i;

        if (!del || !engine.past[i]) return;
        engine.past.splice(i, 1);
        renderPastTab(); // open even when the last is gone, as Clear leaves it
        refresh();
        saveState();
    }, false);

    // the buttons on a line: insert enters the equation again, to change or
    // finish, or puts the result in as a number, like Ans; copy copies it
    pastList.addEventListener('click', function (e) {
        var button = e.target.closest('.calc-past-btn'),
            part = button && button.parentNode.parentNode,
            i = part && +part.parentNode.dataset.i,
            whole = part && part.classList.contains('calc-past-eq');

        if (!button || !engine.past[i]) return;
        if (button.dataset.act === 'insert') {
            usePast(i, whole);
        } else {
            copy(local(whole ? engine.pastLine(i).text.replace(/ =$/, '') : shownResult(engine.past[i], '').text));
        }
    }, false);

    // one panel at a time: every one closed but the one opening
    function closePanels(but) {
        [[past, showPast], [findPanel, closeFindPanel], [stats, showStats], [fx, showFx], [conv, showConv], [graph, showGraph], [solvePanel, showSolve], [numbersPanel, showNumbers], [physPanel, showPhys], [bioPanel, showBio], [chemPart.chemPanel, showChem]]
            .forEach(function (p) { if (p[0] !== but) p[1](false); });
    }

    // it opens on the tab used last; History on each new page, even with nothing in it yet
    function showPast(open) {
        if (open) {
            closePanels(past);
            placePanel(past);
            renderPastTab();
        } else if (past.contains(document.activeElement)) {
            document.activeElement.blur(); // the keys are the calculator's again
        }
        past.classList.toggle('calc-open', open);
        pastButton.classList.toggle('calc-on', open);
        if (open) pastList.scrollTop = 0;
    }

    // the tab shown: the history, with its export; or the letters. Clear is of the tab shown
    function renderPastTab() {
        var vars = pastTab === 'vars';
        [].forEach.call(pastTabs.children, function (tab) {
            tab.classList.toggle('calc-on', tab.dataset.tab === pastTab);
        });
        pastExport.hidden = vars;
        clearShown();
        pastList.hidden = vars;
        varList.hidden = !vars;
        if (vars) showLetters(); else renderPast();
    }

    // Clear, off with nothing to clear: no history, or no letter holding a value
    function clearShown() {
        var off = pastTab === 'vars' ? !lettersHeld() : !engine.past.length;
        pastClear.classList.toggle('calc-off', off);
        pastClear.setAttribute('aria-disabled', String(off));
    }

    pastTabs.addEventListener('click', function (e) {
        var tab = e.target.closest('.calc-past-tab');
        if (!tab) return;
        pastTab = tab.dataset.tab;
        store('pastTab', pastTab);
        renderPastTab();
    }, false);

    // a letter is put in, or takes the result by its STO
    varList.addEventListener('click', function (e) {
        var letter = e.target.closest('.calc-var'), act = e.target.closest('.calc-var-btn');
        if (!letter) return;
        if (act && act.dataset.act === 'store') storeIn(letter.dataset.k);
        else if (!e.target.closest('input')) {
            putLetter(letter.dataset.k);
            showPast(false);
        }
    }, false);

    // a letter's value: digits; kept once it is left, or Enter
    varList.addEventListener('input', function (e) {
        onlyNumber(e.target, false, true);
    }, false);

    // a letter's value typed in its box, kept as it is left; a box made empty is 0, and what is no
    // number shows what the letter holds again
    varList.addEventListener('change', function (e) {
        var letter = e.target.closest('.calc-var'), text = letter && boxValue(e.target).trim();
        if (!letter) return;
        if (!engine.setLetter(letter.dataset.k, text === '' ? 0 : +text)) e.target.value = letterText(letter.dataset.k);
        else setLetter(letter.dataset.k, engine.vars[letter.dataset.k]);
    }, false);

    varList.addEventListener('keydown', function (e) {
        if (e.which !== 13 || !e.target.closest('.calc-var')) return;
        e.preventDefault();
        e.target.blur();
    }, false);

    // a panel over the keys: just below the display, 1px wider on each side
    function placePanel(panel) {
        var shown = inside(display.parentNode.getBoundingClientRect());
        panel.style.top = shown.bottom + 7 + 'px';
        panel.style.left = shown.left - 1 + 'px';
        panel.style.width = shown.width + 2 + 'px';
    }

    // A touch screen: a phone or tablet, which cannot hover or is pointed with a finger, an
    // iPad that calls itself a Mac, or the last press a finger. Tesla's browser says it can
    // hover, and its touches may come as a mouse, so it is known by its name
    var lastTouch = false;
    document.addEventListener('pointerdown', function (e) { lastTouch = e.pointerType === 'touch'; markTouch(); }, true);

    // the same as a class of the calculator, so the CSS gives a result a hand and a press just where a click puts it in
    function markTouch() {
        root.classList.toggle('calc-touch', touchScreen());
    }
    markTouch();
    try { window.matchMedia('(hover: none), (pointer: coarse)').addEventListener('change', markTouch); } catch (e) {} // a mouse plugged in, or out

    // A finger's taps counted as a mouse's clicks: two quick taps in one spot a double click, three a triple,
    // as a touch screen may count none of them in a click's detail, nor send a dblclick
    var taps = { n: 0, t: 0, x: 0, y: 0 };
    document.addEventListener('pointerdown', function (e) {
        var again = e.pointerType === 'touch' && e.timeStamp - taps.t < 450 && Math.hypot(e.clientX - taps.x, e.clientY - taps.y) < 30;
        taps = { n: e.pointerType !== 'touch' ? 0 : again ? taps.n + 1 : 1, t: e.timeStamp, x: e.clientX, y: e.clientY };
    }, true);
    function clicks(e) {
        return e.detail && lastTouch ? Math.max(e.detail, taps.n) : e.detail;
    }

    // a double click on el, or a double tap
    function onDouble(el, fn) {
        var at = -1e9;
        function once(e) {
            if (e.timeStamp - at < 500) return; // the browser's dblclick after the second tap's click
            at = e.timeStamp;
            fn(e);
        }
        el.addEventListener('dblclick', once, false);
        el.addEventListener('click', function (e) {
            if (lastTouch && clicks(e) === 2) once(e);
        }, false);
    }
    function touchScreen() {
        return lastTouch || window.matchMedia('(hover: none), (pointer: coarse)').matches ||
            (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)) || /\bTesla\//.test(navigator.userAgent);
    }

    // A box of a panel gets the focus, to type in. A touch screen brings its keyboard
    // up over the panel at that, so there the box is left until it is touched, unless
    // a box of the same panel is being typed in, the keyboard up already, as Enter goes on
    function focusBox(box) {
        var at = document.activeElement;
        if (touchScreen() && !(/^(INPUT|TEXTAREA)$/.test(at.tagName) && [stats, fx, conv, graph, solvePanel, numbersPanel, physPanel, bioPanel, chemPart.chemPanel].some(function (p) {
            return p.contains(at) && p.contains(box);
        }))) return false;
        box.focus();
        return true;
    }

    // ---------------- statistics ---------------- //

    // A list of numbers, typed or pasted, and what it gives: n, the sums, the
    // mean, the standard deviations and variance, min, the quartiles, median, max,
    // the ranges and the mode, worked out as it is typed, with a histogram and a box
    // plot of them. Or, on the Pairs tab, x and y on each line: their means, sums and
    // deviations, and the curve of best fit of the kind chosen, drawn through them. A click
    // on a result puts it into the calculation, as Ans does. Each tab keeps what is typed in
    // it. The Tests tab has a card for each test of a hypothesis, as the solver has

    // the numbers of the curve fitted to the pairs, in place of the line's slope, intercept and r²: a, b, c and d of its equation
    function fitTiles(kind) {
        var n = { quad: 3, cubic: 4, logistic: 3 }[kind] || 2;
        return 'abcd'.slice(0, n).split('').map(function (c) { return ['f' + c, c]; }).concat([['fr2', 'r<sup>2</sup>']]);
    }

    // the tiles of the tab, the one shown on it
    function statsTiles() {
        var list = STATS[statsTab] || [], at;
        [].forEach.call(stats.querySelectorAll('.calc-solve-tab'), function (t) {
            t.classList.toggle('calc-on', t.dataset.tab === statsTab);
        });
        stats.classList.toggle('calc-stats-pairs', statsTab === 'pairs');
        stats.classList.toggle('calc-stats-testing', statsTab === 'tests');
        statsInput.placeholder = tr(statsTab === 'pairs' ? 'Type or paste pairs, x and y on each line:\n1 2\n2 4.1\n3 5.9' :
            'Type or paste numbers: 4 8 15 16 23 42');
        if (statsTab === 'pairs' && statsFit !== 'lin') { // the line's three, in their place, for the curve's numbers
            at = list.map(function (s) { return s[0]; }).indexOf('b');
            list = list.slice(0, at).concat(fitTiles(statsFit), list.slice(at + 3));
        }
        statsGrid.innerHTML = list.map(function (s) {
            return '<div class="calc-stats-tile" data-k="' + s[0] + '"><span class="calc-stats-label">' + tr(s[1]) +
                '</span><span class="calc-stats-value"></span></div>';
        }).join('');
        rtlDraw(statsGrid);
    }

    statsTiles();

    // the tab shown: the box of the list or the pairs keeps what was typed in each
    function setStatsTab(tab) {
        if (statsTab !== 'tests') statsTexts[statsTab] = statsInput.value;
        statsTab = tab;
        if (tab !== 'tests') statsInput.value = statsTexts[tab];
        statsTiles();
        renderStats();
    }

    stats.querySelector('.calc-solve-tabs').addEventListener('click', function (e) {
        var t = e.target.closest('.calc-solve-tab');
        if (!t || t.dataset.tab === statsTab) return;
        setStatsTab(t.dataset.tab);
        statsChart.parentNode.scrollTop = 0;
        saveState();
        if (statsTab === 'tests') statTests.focus();
        else if (focusBox(statsInput)) statsInput.setSelectionRange(statsInput.value.length, statsInput.value.length);
    }, false);

    // the kind of curve fitted to the pairs
    function setStatsFit(kind) {
        statsFit = STATS_FITS.some(function (f) { return f[0] === kind; }) ? kind : 'lin';
        setPicker(statsFitPick, STATS_FITS.map(function (f) { return f[1]; }), STATS_FITS.map(function (f) { return f[0]; }).indexOf(statsFit));
    }

    picker(statsFitPick, function (i) {
        setStatsFit(STATS_FITS[i][0]);
        statsTiles();
        renderStats();
        saveState();
    });
    statsFitPick.box = statsInput;
    setStatsFit('lin');

    statsButton.addEventListener('click', function () {
        showStats(!stats.classList.contains('calc-open'));
    }, false);

    stats.querySelector('.calc-past-close').addEventListener('click', function () {
        showStats(false);
    }, false);

    stats.querySelector('.calc-past-clear').addEventListener('click', function () {
        statsInput.value = statsTexts[statsTab] = '';
        renderStats();
        saveState();
        focusBox(statsInput);
    }, false);

    statsInput.addEventListener('input', function () {
        statsTexts[statsTab] = statsInput.value;
        renderStats();
        saveState();
    }, false);

    // Auto finds what is between the numbers by itself; a choice has only that between them,
    // so a number written 1 234,5 or 1,234.5 stays one
    function setStatsBy(i) {
        setPicker(statsBy, BY.map(function (by) { return by[1]; }), i);
    }

    picker(statsBy, function (i) {
        setStatsBy(i);
        renderStats();
        saveState();
    });
    statsBy.box = statsInput; // the list has the focus again after a choice
    setStatsBy(0);

    statsGrid.addEventListener('click', function (e) {
        var tile = e.target.closest('.calc-stats-tile'), value = tile && statsNow[tile.dataset.k];
        if (!tile || !mayPut() || !statsNow.n || !isFinite(value) || !engine.put(value)) return;
        keyBoard['AC'].children[0].firstChild.data = 'C';
        showStats(false);
        refresh();
        saveState();
    }, false);

    function showStats(open) {
        if (!open && bigShut(stats)) return;
        if (open) {
            closePanels(stats);
            placePanel(stats);
        }
        stats.classList.toggle('calc-open', open);
        statsButton.classList.toggle('calc-on', open);
        if (open) {
            renderStats(); // shown, so a long value can be made smaller to fit
            if (statsTab === 'tests') statTests.focus();
            else if (focusBox(statsInput)) statsInput.setSelectionRange(statsInput.value.length, statsInput.value.length);
        } else if (stats.contains(document.activeElement)) {
            document.activeElement.blur(); // the keys are the calculator's again
        }
    }

    // the tiles of statistics laid out, each row of them full (fillRows); a number still too long then made smaller, as on the display
    function fitStats() {
        fillRows(statsGrid);
        [].forEach.call(statsGrid.children, function (tile) {
            var shown = tile.lastChild, size = 17;
            while (size > 11 && tooWide(shown)) shown.style.fontSize = --size + 'px';
        });
    }

    // popped out or in, or the window narrower: laid out again for their new width
    if (window.ResizeObserver) new ResizeObserver(function () {
        if (statsGrid.offsetWidth && statsGrid.clientWidth !== statsGrid.fitW) fitStats();
    }).observe(statsGrid);

    // the results as the display shows numbers: in the number format, and as
    // fractions in fraction mode; the chart of them, and a note of how many there are.
    // Of the pairs, the curve chosen fitted to them, its numbers and its equation
    function renderStats() {
        var pairs = statsTab === 'pairs', s, fit;
        statsFitPlace();
        if (statsTab === 'tests') return statTests.render();
        chartW = statsChartWidth();
        s = statsNow = CalcEngine[pairs ? 'pairs' : 'stats'](statsInput.value, engine.comma, BY[statsBy.at][0]);
        if (pairs && s.n) {
            s.rho = CalcMaths.spearman(s.xs, s.ys);
            fit = statsFit === 'lin' ? null : CalcEngine.fit(s.xs.map(function (x, i) { return { x: x, y: s.ys[i] }; }), statsFit);
            if (fit) {
                fit.k.forEach(function (v, i) { s['f' + 'abcd'.charAt(i)] = v; });
                s.fr2 = fit.r2;
            }
            s.fit = fit;
        }
        if (pairs) {
            statsEq.textContent = !s.n ? '' : statsFit === 'lin' ? (isFinite(s.b) ? 'y = ' + shortNumber(s.a) + (s.b < 0 ? ' − ' : ' + ') + shortNumber(Math.abs(s.b)) + 'x' : 'Needs two x or more') :
                fit ? fitEquation(fit) : tr('Needs {needs}', { needs: STATS_FIT_NEEDS[statsFit] });
            statsEq.classList.toggle('calc-stats-warn', !!s.n && (statsFit === 'lin' ? !isFinite(s.b) : !fit));
        }
        [].forEach.call(statsGrid.children, function (tile) {
            var value = s[tile.dataset.k], known = s.n > 0 && isFinite(value);
            tile.classList.toggle('calc-none', !known);
            tile.lastChild.innerHTML = known ? statsValue(value).html : '–';
        });
        fitStats();
        statsChart.innerHTML = !s.n ? '' : pairs ? scatterChart(s) : histogramChart(s);
        if (pairs) {
            statsNote.textContent = !s.n && !s.bad.length ? (statsBy.at > 1 ? tr('Only {by} are between x and y; a pair on each line.', { by: tr(BY[statsBy.at][2]) }) :
                (engine.comma ? tr('x and y on each line, apart by a space, semicolon or tab.') : tr('x and y on each line, apart by a space, comma or tab.'))) :
                trn(s.n, '{n} pair', '{n} pairs') +
                (s.bad.length ? tr(' · left out: {bad}{v}', { bad: s.bad.slice(0, 3).join(', '), v: (s.bad.length > 3 ? ' …' : '') }) : '');
            rtlDraw(statsNote);
            return;
        }
        statsNote.textContent = !s.n && !s.bad.length ? (statsBy.at ? tr('Only {by}{v} are between two numbers.', { by: tr(BY[statsBy.at][2]), v: (statsBy.at > 1 ? tr(' and new lines') : '') }) :
            (engine.comma ? tr('Apart by spaces, semicolons or new lines; a column from a spreadsheet works too.') : tr('Apart by spaces, commas or new lines; a column from a spreadsheet works too.'))) :
            trn(s.n, '{n} number', '{n} numbers') +
            (s.bad.length ? tr(' · left out: {bad}{v}', { bad: s.bad.slice(0, 3).join(', '), v: (s.bad.length > 3 ? ' …' : '') }) : '');
        rtlDraw(statsNote);
    }

    // a number to 6 digits, with the decimal mark in use and − for its minus: for the note and the charts
    function shortNumber(v) {
        return local(String(+(+v).toPrecision(6))).replace('-', '−');
    }

    // what each curve needs of the pairs, said when they do not have it
    var STATS_FIT_NEEDS = { quad: 'three x or more', cubic: 'four x or more', exp: 'every y above 0', pow: 'every x and y above 0',
        log: 'every x above 0', logistic: 'four x or more, and every y above 0' };

    // the equation of a curve fitted, its numbers to 6 digits: y = 1.2x² − 3x + 0.5, y = 2 · 1.5ˣ
    function fitEquation(f) {
        var k = f.k.map(shortNumber), sum = function (terms) { // a + b, each of its number and power, 0 left out, − for a minus
            return terms.filter(function (t, i) { return +f.k[i] || terms.length === 1; }).map(function (t, i) {
                var minus = t[0].charAt(0) === '−', n = minus ? t[0].slice(1) : t[0];
                return (i ? (minus ? ' − ' : ' + ') : minus ? '−' : '') + (n === '1' && t[1] ? '' : n) + t[1];
            }).join('') || '0';
        };
        return 'y = ' + {
            quad: function () { return sum([[k[0], 'x²'], [k[1], 'x'], [k[2], '']]); },
            cubic: function () { return sum([[k[0], 'x³'], [k[1], 'x²'], [k[2], 'x'], [k[3], '']]); },
            exp: function () { return k[0] + ' · ' + k[1] + 'ˣ'; },
            pow: function () { return k[0] + ' · x^' + k[1]; },
            log: function () { return k[0] + (f.k[1] < 0 ? ' − ' + k[1].slice(1) : ' + ' + k[1]) + ' ln x'; },
            logistic: function () { return k[2] + ' / (1 + ' + k[0] + ' · e^(' + (f.k[1] < 0 ? k[1].slice(1) : '−' + k[1]) + 'x))'; }
        }[f.kind]();
    }

    var CHART_W = 340, CHART_H = 120,
        chartW = CHART_W; // drawn as wide as this: popped out on a wide page, wider, not scaled up

    // Popped out on a wide page the chart is drawn wider, as its room is, its text and dots 1.6 times their size and no
    // more; to 20 at a time, not drawn again each pixel the window is dragged
    function statsChartWidth() {
        return bigSide(stats) ? Math.max(CHART_W, Math.round((statsChart.parentNode.clientWidth - 26) / 1.6 / 20) * 20) : CHART_W;
    }

    // Popped out on a wide page, the curve fitted is chosen in the head, before the separator, and its equation is on the
    // line of how many pairs there are; else both under that line, as they were
    function statsFitPlace() {
        var up = bigSide(stats), at = up ? statsBy.previousElementSibling : statsEq;
        if ((statsFitPick.parentNode === statsEq.parentNode) !== up) return;
        at.parentNode.insertBefore(statsFitLabel, at);
        at.parentNode.insertBefore(statsFitPick, at);
    }

    // the window resized, the statistics popped out: drawn again where the chart's width or the place of Fit changes
    function statsResized() {
        if ((statsFitPick.parentNode === statsEq.parentNode) === bigSide(stats) || statsTab !== 'tests' && statsChartWidth() !== chartW) renderStats();
    }

    // a line of text in a chart: at x, y, anchored at its start, middle or end
    function chartText(x, y, text, anchor) {
        return '<text x="' + x.toFixed(1) + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '">' + text + '</text>';
    }

    // The numbers of the list as a histogram, of up to 12 bars of the same width from min to max,
    // and under it their box plot on the same scale: the box from Q1 to Q3, the median across
    // it, and the whiskers out to min and max
    function histogramChart(s) {
        var lo = s.min, hi = s.max, k, w, counts = [], most, html = '', i, lMin, lMax, lMid, xm, x = function (v) { return 10 + (v - lo) / (hi - lo) * (chartW - 20); };
        if (lo === hi) {
            lo -= 0.5;
            hi += 0.5;
        }
        k = Math.min(12, Math.ceil(Math.log2(s.n)) + 1);
        w = (hi - lo) / k;
        for (i = 0; i < k; i++) counts.push(0);
        s.values.forEach(function (v) {
            counts[Math.min(k - 1, Math.floor((v - lo) / w))]++;
        });
        most = Math.max.apply(null, counts);
        counts.forEach(function (c, i) {
            var h = c / most * 64;
            if (c) html += '<rect class="calc-stats-bar" x="' + (x(lo + i * w) + 1).toFixed(1) + '" y="' + (70 - h).toFixed(1) + '" width="' +
                Math.max(1, x(lo + w) - x(lo) - 2).toFixed(1) + '" height="' + h.toFixed(1) + '"/>';
        });
        html += '<line class="calc-stats-axis" x1="10" y1="70.5" x2="' + (chartW - 10) + '" y2="70.5"/>';
        if (isFinite(s.q1)) {
            html += '<line class="calc-stats-whisker" x1="' + x(s.min).toFixed(1) + '" y1="87" x2="' + x(s.q1).toFixed(1) + '" y2="87"/>' +
                '<line class="calc-stats-whisker" x1="' + x(s.q3).toFixed(1) + '" y1="87" x2="' + x(s.max).toFixed(1) + '" y2="87"/>' +
                '<line class="calc-stats-whisker" x1="' + x(s.min).toFixed(1) + '" y1="82" x2="' + x(s.min).toFixed(1) + '" y2="92"/>' +
                '<line class="calc-stats-whisker" x1="' + x(s.max).toFixed(1) + '" y1="82" x2="' + x(s.max).toFixed(1) + '" y2="92"/>' +
                '<rect class="calc-stats-box" x="' + x(s.q1).toFixed(1) + '" y="79" width="' + Math.max(1, x(s.q3) - x(s.q1)).toFixed(1) + '" height="16"/>' +
                '<line class="calc-stats-mid" x1="' + x(s.median).toFixed(1) + '" y1="79" x2="' + x(s.median).toFixed(1) + '" y2="95"/>';
        } else {
            html += '<circle class="calc-stats-dot" cx="' + x(s.median).toFixed(1) + '" cy="87" r="3"/>';
        }
        // the median's label only where it clears those of min and max, a digit about 6 wide at 10px
        lMin = shortNumber(s.min);
        lMax = shortNumber(s.max);
        lMid = shortNumber(s.median);
        xm = x(s.median);
        return '<svg viewBox="0 0 ' + chartW + ' ' + CHART_H + '" role="img" aria-label="' + tr('Histogram and box plot') + '">' + html +
            chartText(10, 112, lMin, 'start') + (s.n > 1 && s.min !== s.max && xm - lMid.length * 3 > 14 + lMin.length * 6 &&
                xm + lMid.length * 3 < chartW - 14 - lMax.length * 6 ? chartText(xm, 112, lMid) : '') +
            chartText(chartW - 10, 112, lMax, 'end') + '</svg>';
    }

    // The pairs as dots, x across and y up, and their line of best fit through them
    function scatterChart(s) {
        var x0 = Math.min.apply(null, s.xs), x1 = Math.max.apply(null, s.xs), y0 = Math.min.apply(null, s.ys), y1 = Math.max.apply(null, s.ys),
            px, py, html = '', pad;
        if (x0 === x1) {
            x0 -= 0.5;
            x1 += 0.5;
        }
        if (y0 === y1) {
            y0 -= 0.5;
            y1 += 0.5;
        }
        pad = (y1 - y0) * 0.08;
        y0 -= pad;
        y1 += pad;
        px = function (v) { return 34 + (v - x0) / (x1 - x0) * (chartW - 46); };
        py = function (v) { return 98 - (v - y0) / (y1 - y0) * 90; };
        html += '<line class="calc-stats-axis" x1="30" y1="102.5" x2="' + (chartW - 8) + '" y2="102.5"/><line class="calc-stats-axis" x1="30.5" y1="6" x2="30.5" y2="102.5"/>';
        if (s.fit) { // a curve: a line through it at 120 places across, broken where it has no value
            html += '<path class="calc-stats-fit" fill="none" d="' + Array.from({ length: 121 }, function (u, i) {
                var x = x0 + (x1 - x0) * i / 120, y = s.fit.at(x);
                return isFinite(y) ? px(x).toFixed(1) + ' ' + Math.max(-1000, Math.min(1000, py(y))).toFixed(1) : '';
            }).reduce(function (d, p, i, all) { return p ? d + (i && all[i - 1] ? ' L' : ' M') + p : d; }, '') + '"/>';
        } else if (isFinite(s.b) && statsFit === 'lin') {
            html += '<line class="calc-stats-fit" x1="' + px(x0).toFixed(1) + '" y1="' + py(s.a + s.b * x0).toFixed(1) + '" x2="' + px(x1).toFixed(1) +
                '" y2="' + py(s.a + s.b * x1).toFixed(1) + '"/>';
        }
        s.xs.forEach(function (x, i) {
            html += '<circle class="calc-stats-dot" cx="' + px(x).toFixed(1) + '" cy="' + py(s.ys[i]).toFixed(1) + '" r="3"/>';
        });
        return '<svg viewBox="0 0 ' + chartW + ' ' + CHART_H + '" role="img" aria-label="' + tr('Scatter plot and line of best fit') + '">' +
            '<clipPath id="calc-stats-clip"><rect x="31" y="0" width="' + (chartW - 39) + '" height="102"/></clipPath><g clip-path="url(#calc-stats-clip)">' + html + '</g>' +
            chartText(34, 115, shortNumber(Math.min.apply(null, s.xs)), 'start') + chartText(chartW - 12, 115, shortNumber(Math.max.apply(null, s.xs)), 'end') +
            chartText(27, 12, shortNumber(Math.max.apply(null, s.ys)), 'end') + chartText(27, 99, shortNumber(Math.min.apply(null, s.ys)), 'end') + '</svg>';
    }

    function statsValue(value) {
        return shownResult({ value: String(value), frac: fracMode, dms: dmsMode }, String(+(+value).toPrecision(13)));
    }

    // A number to so many decimal places, as money to the cent: 1199.10, all of them shown. Fix
    // of places of its own, Sci and Eng write it their way; never as a fraction or in °′″, which
    // money is not. What is put in or copied of it is the whole number
    function placesValue(value, places) {
        var x = +(+value).toFixed(places) + 0, s = CalcEngine.format(x, fmt.notation === 'sci' || fmt.notation === 'eng' || (fmt.notation === 'fix' && fmt.places !== 'auto') ?
            fmt : { notation: 'fix', places: places });
        if (!isFinite(x)) return { html: '–', text: '' }; // too large: none
        return { html: fmt.group ? CalcEngine.group(s, fmt.group) : s, text: s };
    }

    // ---------------- graph ---------------- //

    // The graph and its table are js/graph.js: given what they take from the calculator, the values that
    // change read as they are now, and filling graphPart with what the calculator takes from them
    var graphPart = {};
    CalcGraph({
        ask: ask,
        boxNumber: boxNumber,
        closePanels: closePanels,
        copy: copy,
        get deg() { return deg; },
        get dmsMode() { return dmsMode; },
        engine: engine,
        escaped: escaped,
        fitMenu: fitMenu,
        focusBox: focusBox,
        get fracMode() { return fracMode; },
        goTo: goTo,
        graph: graph,
        graphButton: graphButton,
        graphInputs: graphInputs,
        graphRows: graphRows,
        hideTip: hideTip,
        get home() { return home; },
        insertIcon: insertIcon,
        inside: inside,
        keyBoard: keyBoard,
        local: local,
        menu: menu,
        notify: notify,
        onDouble: onDouble,
        onlyNumber: onlyNumber,
        openMenu: openMenu,
        placePanel: placePanel,
        popIn: popIn,
        get popZoom() { return popZoom; },
        refresh: refresh,
        root: root,
        rtlDraw: rtlDraw,
        saveState: saveState,
        scale: scale,
        setUnit: setUnit,
        showMenu: showMenu,
        shownResult: shownResult,
        statsValue: statsValue,
        store: store,
        tr: tr,
        trc: trc,
        trn: trn,
        UNITS: UNITS
    }, graphPart);

    // the graph's functions the calculator calls: as they are when called
    function closeGraph() { return graphPart.closeGraph.apply(this, arguments); }
    function exampleText() { return graphPart.exampleText.apply(this, arguments); }
    function exampleTip() { return graphPart.exampleTip.apply(this, arguments); }
    function exportItems() { return graphPart.exportItems.apply(this, arguments); }
    function graphBig() { return graphPart.graphBig.apply(this, arguments); }
    function graphRender() { return graphPart.graphRender.apply(this, arguments); }
    function graphTrace() { return graphPart.graphTrace.apply(this, arguments); }
    function graphUnpin() { return graphPart.graphUnpin.apply(this, arguments); }
    function loadGraph() { return graphPart.loadGraph.apply(this, arguments); }
    function nextFit() { return graphPart.nextFit.apply(this, arguments); }
    function putExample() { return graphPart.putExample.apply(this, arguments); }
    function readGraph() { return graphPart.readGraph.apply(this, arguments); }
    function saveBlob() { return graphPart.saveBlob.apply(this, arguments); }
    function seqOf() { return graphPart.seqOf.apply(this, arguments); }
    function showGraph() { return graphPart.showGraph.apply(this, arguments); }
    function showGraphTab() { return graphPart.showGraphTab.apply(this, arguments); }
    function showLink() { return graphPart.showLink.apply(this, arguments); }
    function showWindow() { return graphPart.showWindow.apply(this, arguments); }
    function stopSliders() { return graphPart.stopSliders.apply(this, arguments); }
    function storeGraph() { return graphPart.storeGraph.apply(this, arguments); }
    function styleItems() { return graphPart.styleItems.apply(this, arguments); }
    function takeLink() { return graphPart.takeLink.apply(this, arguments); }
    function undoGraph() { return graphPart.undoGraph.apply(this, arguments); }
    function undoKind() { return graphPart.undoKind.apply(this, arguments); }
    function undoStart() { return graphPart.undoStart.apply(this, arguments); }
function clearGraph() { return graphPart.clearGraph.apply(this, arguments); }

    // ---------------- formulas and constants ---------------- //

    // Two lists to search: formulas, whose letters are filled in to put the
    // equation into the calculator, where it can still be changed before =;
    // and constants, put in as a number, as Ans is. Each tip says what it is
    ['formulas', 'constants'].forEach(function (tab) {
        fxItems[tab] = [];
        CalcFormulas[tab].forEach(function (group) {
            group.list.forEach(function (item) {
                var words = [group.c, item.t, item.d].concat(tab === 'formulas' ? [item.f].concat(item.v.map(function (v) {
                    return v[1] + ' ' + v[2];
                })) : [item.s, item.u]);
                if (CalcLang.code !== 'en') words = words.concat(tr(group.c), tr(item.t), tr(item.d)); // found in the language in use as well
                fxItems[tab].push({ c: group.c, item: item, words: words.join(' ').replace(/<[^>]*>/g, '').toLowerCase() });
            });
        });
    });

    fxButton.addEventListener('click', function () {
        showFx(!fx.classList.contains('calc-open'));
    }, false);

    fx.querySelector('.calc-past-close').addEventListener('click', function () {
        showFx(false);
    }, false);

    fx.querySelector('.calc-fx-tabs').addEventListener('click', function (e) {
        var tab = e.target.closest('.calc-fx-tab');
        if (!tab) return;
        fxTab = tab.dataset.tab;
        store('fxTab', fxTab);
        fxSearch.value = ''; // a search is for one list
        renderFx();
        focusBox(fxSearch);
    }, false);

    fxSearch.addEventListener('input', renderFx, false);

    // a formula opens its letters, or closes them; a constant is put in by its Insert, or that of its tip or menu
    fxList.addEventListener('click', function (e) {
        var row = e.target.closest('.calc-fx-row'), item = row && row.parentNode, button = e.target.closest('.calc-fx-btns .calc-past-btn'), k;
        if (e.target.closest('.calc-f-copy')) return copyFormula(e.target.closest('.calc-f-copy')); // it stays open
        if (button && item && fxTab === 'constants') { // its own Insert and Copy, as the history's: Copy its value, as Copy of its menu
            k = fxItems.constants[+item.dataset.i].item;
            if (button.dataset.act === 'insert') putConstant(k);
            else copy(local(k.v));
            return;
        }
        if (!item) {
            if (e.target.closest('.calc-sv-reset')) resetFormula(e.target.closest('.calc-fx-form'));
            if (e.target.closest('.calc-fx-insert')) insertFormula(e.target.closest('.calc-fx-item'));
            if (e.target.closest('.calc-fx-phys')) formulaInPhysics(e.target.closest('.calc-fx-item'), e.target.closest('.calc-fx-bio') ? 'bio' : e.target.closest('.calc-fx-fin') ? 'solve' : 'phys');
            return;
        }
        if (fxTab === 'constants') { if (mayPut()) putConstant(fxItems.constants[+item.dataset.i].item); }
        else if (!(item.classList.contains('calc-on') && bigSide(fx))) openFormula(item.classList.contains('calc-on') ? null : item); // beside the list it stays open
    }, false);

    // a number box keeps only what a number is made of: digits, one point, a minus first, and the
    // variables A to J, 2A, a small letter typed as its capital; bare: the digits alone, as a variable's
    // own value. marks: the °′″ of an angle. The point is a comma while that is the decimal mark, whichever is typed.
    // An E after a digit is a power of ten, 1E-3, its sign kept, and only digits after that
    function onlyNumber(input, marks, bare) {
        var letters = !bare, v = input.value, at = input.selectionStart, clean = '', point = false, exp = false, mark = engine.comma ? ',' : '.', n, c;
        for (n = 0; n < v.length; n++) {
            c = v.charAt(n);
            if (/[٠-٩۰-۹]/.test(c)) c = String(c.charCodeAt(0) - (c.charCodeAt(0) >= 0x6F0 ? 0x6F0 : 0x660)); // ٥ is 5
            else if (c === '٫') c = '.';
            if (engine.comma && c === '.') c = ',';
            if (letters && /[a-j]/.test(c)) c = c.toUpperCase();
            if (bare && c === 'e') c = 'E';
            if (exp ? /\d/.test(c) : /\d/.test(c) || (marks && /[°′″]/.test(c)) || (letters && /[A-J]/.test(c)) || (c === '-' && !clean) ||
                (c === mark && !point && (point = true)) || (bare && c === 'E' && /[\d.,]$/.test(clean) && clean.indexOf('E') < 0 && (point = true)) ||
                (/[-+]/.test(c) && /[\d.,]E$/.test(clean) && (exp = true))) clean += c;
            else if (n < at) at--;
        }
        if (clean !== v) {
            input.value = clean;
            input.setSelectionRange(at, at);
        }
    }

    // a box of a matrix's size keeps only what a size is made of: digits, and x, ×, *, a comma
    // or a space between them
    function onlySize(input) {
        var v = input.value, at = input.selectionStart, not = /[^\dx×*, ]/gi, clean = v.replace(not, '');
        if (clean === v) return;
        at -= v.slice(0, at).length - v.slice(0, at).replace(not, '').length;
        input.value = clean;
        input.setSelectionRange(at, at);
    }

    // what a number box holds: its number, or one worked out of A to J, 2A; NaN while empty or not one
    function boxNumber(input) {
        var text = boxValue(input).trim();
        if (!text) return NaN;
        return /[A-J]/.test(text) ? CalcMaths.number(text, false, deg) : +text;
    }

    fxList.addEventListener('input', function (e) {
        onlyNumber(e.target, false); // a formula's letter may be one of A to J: a = A
        var note = e.target.closest('.calc-fx-form').querySelector('.calc-fx-note');
        e.target.classList.remove('calc-bad');
        fxNote(note, null); // a value changed: the usual note again
        fxResetShown(e.target.closest('.calc-fx-form'));
    }, false);

    // A formula's note: an error (html) at the top, over the boxes, as every card has it; null, its usual note, under
    // them beside Insert
    function fxNote(note, html) {
        var form = note.closest('.calc-fx-form');
        note.classList.toggle('calc-fx-warn', html !== null);
        note.innerHTML = html === null ? note.dataset.usual : tr(html);
        if (CalcLang.rtl) ltrRuns(note); // its maths left to right in the Arabic
        if (html === null) form.querySelector('.calc-fx-actions').insertBefore(note, form.querySelector('.calc-fx-btns'));
        else form.insertBefore(note, form.querySelector('.calc-fx-fields'));
    }

    // Reset of a formula, once something is in its boxes
    function fxResetShown(form) {
        form.querySelector('.calc-sv-reset').hidden = ![].some.call(form.querySelectorAll('.calc-fx-fields input'), function (input) { return input.value.trim(); });
    }

    // every box of a formula emptied, its note as it was, the first box to type in
    function resetFormula(form) {
        var note = form.querySelector('.calc-fx-note');
        [].forEach.call(form.querySelectorAll('.calc-fx-fields input'), function (input) {
            input.value = '';
            input.classList.remove('calc-bad');
        });
        fxNote(note, null);
        fxResetShown(form);
        focusBox(form.querySelector('.calc-fx-fields input'));
    }

    // Enter in the search takes the first one found; in a letter it goes on
    // to the next empty one, and puts the formula in once all are filled
    fx.addEventListener('keydown', function (e) {
        var item = e.target.closest('.calc-fx-item'), inputs, empty;
        if (e.which !== 13) return;
        e.preventDefault();
        if (e.target === fxSearch) {
            item = fxList.querySelector('.calc-fx-item');
            if (item && fxTab === 'constants') putConstant(fxItems.constants[+item.dataset.i].item);
            else if (item) openFormula(item);
            return;
        }
        if (!item) return;
        inputs = [].slice.call(item.querySelectorAll('input'));
        empty = inputs.filter(function (input) {
            return !input.value.trim();
        });
        if (!empty.length || !e.target.value.trim()) return insertFormula(item);
        (empty.filter(function (input) {
            return inputs.indexOf(input) > inputs.indexOf(e.target);
        })[0] || empty[0]).focus();
    }, false);

    // the formula open last: popped out, beside the list, it opens again
    var fxOpen = -1;

    function showFx(open) {
        if (!open && bigShut(fx)) return;
        if (open) {
            closePanels(fx);
            placePanel(fx);
            renderFx();
        }
        fx.classList.toggle('calc-open', open);
        fxButton.classList.toggle('calc-on', open);
        if (open) {
            if (focusBox(fxSearch)) fxSearch.select(); // typing replaces the last search
        } else if (fx.contains(document.activeElement)) {
            document.activeElement.blur(); // the keys are the calculator's again
        }
    }

    // the icon before the name of a formula or a constant: its own, else that of its card in Physics, Biology or Finance
    function fxIcon(it) {
        var link = it.p ? ['phys', it.p[0]] : it.b ? ['bio', it.b[0]] : it.fin ? ['solve', it.fin[0]] : null;
        return CalcIcons.card(fxTab, it.t) || (link ? CalcIcons.card(link[0], link[1]) : '');
    }

    // the list of the tab, the entries the search finds, under the name of their group
    function renderFx() {
        var words = fxSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean), group = null, html = '';

        [].forEach.call(fx.querySelectorAll('.calc-fx-tab'), function (tab) {
            tab.classList.toggle('calc-on', tab.dataset.tab === fxTab);
        });
        fxList.classList.remove('calc-side');
        fxSearch.placeholder = tr(fxTab === 'formulas' ? 'Search formulas' : 'Search constants');
        fxItems[fxTab].forEach(function (entry, i) {
            var it = entry.item;
            if (!words.every(function (w) { return entry.words.indexOf(w) > -1; })) return;
            if (entry.c !== group) html += '<div class="calc-fx-cat">' + tr(entry.c) + '</div>';
            group = entry.c;
            // a constant is written as a formula is: its symbol = its value, a root drawn
            html += '<div class="calc-fx-item" data-i="' + i + '"><div class="calc-fx-row">' +
                '<span class="calc-fx-col"><span class="calc-fx-name">' + fxIcon(it) + tr(it.t) + '</span>' +
                '<span class="calc-fx-f calc-fx-eq' + (fxTab === 'constants' ? ' calc-fx-val' : '') + '"><span>' +
                (fxTab === 'constants' ? '<span class="calc-fx-sym">' +
                    it.s.replace(/√(\w+)/, '<span class="calc-root">$1</span>') + '</span> = ' + constantValue(it) : it.f) +
                '</span>' + (fxTab === 'formulas' ? copyButton() : '') + // a formula has Copy after it, while it is open
                '</span></span>' +
                // a constant has Insert and Copy at its right, as a line of the history has them, while the pointer is over it
                (fxTab === 'constants' ? '<span class="calc-past-btns calc-fx-btns">' + pastButtonsHtml() + '</span>' : '') +
                // a formula has the arrow that says whether it is open
                (fxTab === 'formulas' ? collapseButton() : '') +
                '</div></div>';
        });
        fxList.innerHTML = html || '<div class="calc-fx-none">' + tr('Nothing found') + '</div>';
        rtlDraw(fxList);
        fxList.scrollTop = 0;
        fxList.classList.toggle('calc-side', fxTab === 'formulas' && bigSide(fx));
        if (fxTab === 'formulas' && bigSide(fx)) { // beside the list, one is always open: the one open last, if found, else the first
            openFormula(fxList.querySelector('.calc-fx-item[data-i="' + fxOpen + '"]') || fxList.querySelector('.calc-fx-item'), true);
        }
        hideTip();
    }

    // The Variables tab of the history: a card for each letter, its value in a box to type over, then STO, which keeps
    // the result of the line in it, and insert; a click on the card puts the letter in as well.
    // Built once; after that only the values change, not a box being typed in
    function showLetters() {
        var typing = varList.contains(document.activeElement) ? document.activeElement : null;
        if (!varList.querySelector('.calc-var')) {
            varList.innerHTML = '<div class="calc-var-head"><span>' +
                tr('{key} + Letter stores var', { key: '<kbd>' + (mac ? '⌥ Option' : 'Alt') + '</kbd>' }) + '<span class="calc-var-sep"></span>' +
                tr('{key} + Letter inserts var', { key: '<kbd>⇧ Shift</kbd>' }) + '</span></div>' +
                CalcEngine.LETTERS.split('').map(function (k) {
                    return '<div class="calc-fx-item calc-var" data-k="' + k + '"><div class="calc-fx-row calc-var-row">' +
                        '<span class="calc-var-k">' + k + '</span>' +
                        '<input type="text" inputmode="decimal" spellcheck="false" autocomplete="off" maxlength="24" aria-label="' + k + '">' +
                        '<span class="calc-var-btn" data-act="store">STO</span>' +
                        '<span class="calc-var-btn" data-act="insert">' + insertIcon(true) + '</span></div></div>';
                }).join('');
            varList.scrollTop = 0;
            hideTip();
        }
        [].forEach.call(varList.querySelectorAll('.calc-var'), function (card) {
            var input = card.querySelector('input'), v = engine.vars[card.dataset.k];
            if (input !== typing) input.value = letterText(card.dataset.k);
            card.classList.toggle('calc-var-set', v !== 0);
        });
    }

    // a letter holds a value other than 0
    function lettersHeld() {
        return CalcEngine.LETTERS.split('').some(function (k) { return !!engine.vars[k]; });
    }

    // Clear on the Variables tab: every letter back to 0
    function clearLetters() {
        engine.letters(true);
        saveState();
        lettersChanged();
    }

    // the tip of a letter's card and its buttons: what it holds, and the keys for it
    function letterTip(el) {
        var k = el.closest('.calc-var').dataset.k;
        if (el.dataset.act === 'store') {
            return { t: tr('Store in {k}', { k: k }), d: tr('Works out the line in the display, as = does, and keeps its result in {k}: 5 + 3 → {k}. After a result, that result.', { k: k }), k: tr('Alt+{k}', { k: k }) };
        }
        if (el.dataset.act === 'insert') return { t: tr('Insert {k}', { k: k }), d: tr('Puts {k} in the equation: 2{k} is 2 × {k}.', { k: k }), k: tr('Shift+{k}', { k: k }) };
        return {
            t: tr('Variable {k}', { k: k }), k: tr('Shift+{k}', { k: k }),
            d: tr('{k} holds {k2}. Click to put {k} in the equation, where it stays {k} and is worked out with what it holds then. Type in the box to change it.', { k: k, k2: letterValue(k) })
        };
    }

    // 6.6743 × 10⁻¹¹ m³/(kg·s²); a value of a usual size written out, and a whole
    // number up to a trillion too: 299,792,458. Shown to 12 digits; it is put in whole
    function constantValue(k) {
        var a = Math.abs(k.v), parts = (+k.v.toPrecision(12)).toExponential().split('e'),
            shown = a >= (k.v % 1 ? 1e6 : 1e12) || a < 1e-3 ? local(parts[0]) + ' × 10<sup>' + +parts[1] + '</sup>' : CalcEngine.group(String(+k.v.toPrecision(12)), fmt.group);
        return shown.replace(/-/g, '−') + (k.u ? '<span class="calc-fx-unit">' + k.u + '</span>' : '');
    }

    // A function of a web page drawn alone: the graph cleared first, as Clear does, its sliders stopped,
    // and the function in the first box, the view as at first
    function drawPageCurve(f) {
        stopSliders();
        clearGraph();
        if (graphPart.graphTab === 'examples') showGraphTab('graph');
        graphInputs[0].value = f;
        showGraph(true);
        saveState();
    }

    // The formulas panel on one formula or constant, by its name, found by a search for it: a formula
    // open with a box for each of its letters, a constant to put in
    function showFxItem(tab, name) {
        var i = fxItems[tab].map(function (entry) { return entry.item.t; }).indexOf(name), item;
        if (i < 0) return;
        fxTab = tab;
        store('fxTab', fxTab);
        fxSearch.value = name.toLowerCase();
        showFx(true);
        item = fxList.querySelector('.calc-fx-item[data-i="' + i + '"]');
        if (!item) return;
        if (tab === 'formulas') openFormula(item);
        item.scrollIntoView({ block: 'nearest' });
    }

    // A box for each letter of the formula, and Insert. A result in the display
    // is put in the first one, to start from; a formula with angles says their unit.
    // quiet: opened by itself, beside the list, its first box not to type in yet
    function openFormula(item, quiet) {
        var open = fxList.querySelector('.calc-fx-item.calc-on'), f, form, first;

        if (open) {
            open.classList.remove('calc-on');
            open.removeChild(open.querySelector('.calc-fx-form'));
        }
        fxOpen = item ? +item.dataset.i : -1;
        if (!item) return;
        hideTip();
        f = fxItems.formulas[+item.dataset.i].item;
        form = item.appendChild(document.createElement('div'));
        form.className = 'calc-fx-form';
        form.innerHTML = '<div class="calc-sv-side-head"><span class="calc-sv-side-name">' + fxIcon(f) + tr(f.t) + '</span>' + item.querySelector('.calc-fx-f').outerHTML + // beside the list, at its top
            '<p class="calc-sv-side-d">' + tr(f.d) + '</p></div>' +
            '<div class="calc-sv-top"><span class="calc-sv-reset" role="button" hidden>' + tr('Reset') + RESET_ICON + '</span></div>' + // as the cards of the other panels have
            '<div class="calc-fx-fields">' + f.v.map(function (v) {
            return '<label class="calc-fx-var"><span class="calc-fx-sym">' + v[1] + '</span>' +
                // a keyboard with letters, for A to J as well as numbers
                '<input type="text" autocapitalize="characters" spellcheck="false" autocomplete="off" maxlength="40" placeholder="' +
                tr(v[2]) + '"></label>';
        }).join('') + '</div><div class="calc-fx-actions"><span class="calc-fx-note">' +
            (f.deg ? tr(['Angles in radians, the unit in use', 'Angles in degrees, the unit in use', 'Angles in gradians, the unit in use'][deg]) : '') +
            '</span><span class="calc-fx-btns">' + (f.p && !physButton.hidden ? '<span class="calc-fx-phys" role="button">' + tr('In Physics') + '</span>' : '') + (f.b && !bioButton.hidden ? '<span class="calc-fx-phys calc-fx-bio" role="button">' + tr('In Biology') + '</span>' : '') + // its card of the Physics panel, beside Insert
            (f.fin && !solveButton.hidden ? '<span class="calc-fx-phys calc-fx-fin" role="button">' + tr('In Finance') + '</span>' : '') + // of money, its card of the solver's Finance tab
            '<span class="calc-fx-insert">' + tr('Insert') + insertIcon() + '</span></span></div>';
        item.classList.add('calc-on');
        form.querySelector('.calc-fx-note').dataset.usual = form.querySelector('.calc-fx-note').innerHTML;
        first = form.querySelector('input');
        if (!engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
            first.value = local(+(+engine.value).toPrecision(13));
        }
        fxResetShown(form);
        if (!quiet && focusBox(first)) first.select();
        item.firstChild.scrollIntoView({ block: 'nearest' }); // its row: beside the list, the card itself is not in it
    }

    // the note of a formula naming the letters of the boxes marked: empty, or, typed, not a number
    function badNote(note, inputs, typed) {
        var names = inputs.filter(function (input) { return input.classList.contains('calc-bad'); }).map(function (input) {
            return input.parentNode.querySelector('.calc-fx-sym').innerHTML;
        });
        if (!names.length) return;
        fxNote(note, names.length > 2 ? names.length + (typed ? ' boxes are not numbers.' : ' boxes are empty.') :
            names.join(' and ') + (names.length > 1 ? (typed ? ' are not numbers.' : ' are empty.') : (typed ? ' is not a number.' : ' is empty.')));
    }

    // The formula with its letters filled in goes into the display as an
    // equation; into one being typed or edited it goes in brackets, as one part.
    // It is worked out first on its own: values with no answer (the root of a
    // negative number, a division by 0) stay in the boxes, and the note says why
    function insertFormula(item) {
        var f = fxItems.formulas[+item.dataset.i].item,
            inputs = [].slice.call(item.querySelectorAll('input')),
            note = item.querySelector('.calc-fx-note'),
            s = CalcFormulas.fill(f, inputs.map(boxValue), deg),
            trial = new CalcEngine(), read;

        inputs.forEach(function (input) {
            input.classList.toggle('calc-bad', !input.value.trim());
        });
        if (s !== null && trial.paste(s, deg) && (trial.error || (trial.press('=', deg), trial.error))) {
            fxNote(note, CalcFormulas.why(f, inputs.map(boxValue)));
            return;
        }
        if (s !== null && (engine.edit || !(engine.done || engine.error || engine.plain()))) s = '(' + s + ')';
        engine.comma = false; // the formula is written with points, whatever the decimal mark shown: 1.234 is not 1234
        read = s === null || engine.paste(s, deg);
        engine.comma = CalcEngine.comma(fmt.group);
        if (!read) {
            inputs.forEach(function (input) { // the calculator could not read it: the boxes that are not a plain number
                input.classList.toggle('calc-bad', !/^\s*-?(\d+\.?\d*|\.\d+)\s*$/.test(boxValue(input)));
            });
            s = null;
        }
        if (s === null) {
            badNote(note, inputs, !read);
            focusBox(item.querySelector('.calc-bad') || inputs[0]);
            return;
        }
        keyBoard['AC'].children[0].firstChild.data = 'C';
        showFx(false);
        refresh();
        saveState();
    }

    // A formula's card of the Physics panel opened, or of the Biology panel's (go 'bio'), or of the solver's Finance tab (go
    // 'solve'), with what its boxes have: there any of its letters is worked out from the others. Two letters of a network go in as one, 100 || 220
    function formulaInPhysics(item, go) {
        var f = fxItems.formulas[+item.dataset.i].item, link = go === 'bio' ? f.b : go === 'solve' ? f.fin : f.p, inputs = [].slice.call(item.querySelectorAll('input')), kept = {}, joined = [];
        f.v.forEach(function (v, i) {
            var box = link[1][v[0]], value = boxValue(inputs[i]).trim();
            if (box === '+' || box === '||') {
                if (value) joined.push(value);
                kept.n = joined.join(' ' + box + ' ');
            } else if (box && value) {
                kept[box] = value;
            }
        });
        Object.assign(kept, link[2] || {});
        physPut(link[0], kept, go);
    }

    // The Physics panel, or go's, on a card, with these in its boxes: over the keys from the calculator; popped out, it pops
    // out in place of what is, as the rail goes to it; in the extension's windows, the window goes there and takes the card
    // from the storage as it opens (takeFound), as the search does
    function physPut(id, kept, go) {
        var hit = { go: go || 'phys', kind: 'put', id: id, kept: kept }, from = bigShown(), panel = { phys: physPart.phys, bio: bioPart.bio, solve: solver }[hit.go];
        if (!from || from === hit.go) return panel.put(id, kept);
        if (graphPart.graphAlone || chemPart.chemAlone || panelAlone || homeAlone) {
            store('found', { hit: hit, at: Date.now() });
            return goTo(hit.go);
        }
        goTo(hit.go);
        findOpen(hit);
    }

    function putConstant(k) {
        if (!engine.put(k.v)) return;
        keyBoard['AC'].children[0].firstChild.data = 'C';
        showFx(false);
        refresh();
        saveState();
    }

    // the tip of a formula, open or not: what it gives, its letters and an example; a constant has the tip of a result (peekOf),
    // its Insert and Copy the tips of keys
    function fxTip(el) {
        var item = el.parentNode, it;
        if (el.classList.contains('calc-past-close')) return CalcTips['formulas close'];
        if (el.classList.contains('calc-fx-phys')) return CalcTips[el.classList.contains('calc-fx-bio') ? 'formula biology' : el.classList.contains('calc-fx-fin') ? 'formula finance' : 'formula physics'];
        if (el.classList.contains('calc-sv-reset')) return CalcTips['card reset'];
        if (el.classList.contains('calc-f-copy')) return CalcTips['formula copy'];
        if (el.classList.contains('calc-past-btn')) return CalcTips['constant ' + el.dataset.act]; // Insert and Copy of a constant, as the history's
        if (!el.classList.contains('calc-fx-row')) return null;
        it = fxItems[fxTab][+item.dataset.i].item;
        if (fxTab === 'constants') return null;
        return {
            t: it.t,
            d: tr(it.d) + '<div class="calc-tip-more">' + it.v.map(function (v) {
                return '<i>' + v[1] + '</i> ' + tr(v[2]);
            }).join(tr(', ')) + '<br>' + tr('For example {values} gives {r}.', { values: it.v.map(function (v, i) {
                return '<i>' + v[1] + '</i> = ' + it.ex[0][i] + (it.deg && /angle/.test(v[2]) ? '°' : '');
            }).join(tr(', ')), r: +it.ex[1].toPrecision(10) }) + '</div>',
            k: ''
        };
    }

    // ---------------- helpers of the cards ---------------- //

    // What the cards of every panel are made with: their formulas as badges and copied, angles in the unit in use and
    // the word of it, a tile with a drawing, a number written short, a complex number, and a text made safe as HTML

    // The subtitle of a card in light rounded badges: one of a few things each in its own, in
    // place of commas between them, pills(['A + B', 'A × B']); one alone in one, as each card draws it
    // Copy of a formula: a button after it, in its badge on a card, to copy it as text; shown while its card or formula is open
    var PILL_COPY = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" /></svg>',
        PILL_COPIED = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M3 8.5l3 3 7-7" /></svg>';

    // a formula as text, to copy: its fractions as a ÷ b, its powers as ² or ^(…)
    function formulaText(html) {
        return plain(fractionsAsText(html));
    }

    function copyButton() {
        return '<span class="calc-f-copy" role="button" aria-label="' + tr('Copy') + '">' + PILL_COPY + PILL_COPIED + '</span>'; // both in one place, the tick shown once copied
    }

    // text copied by a button: a tick for a moment, for it is done, in place of its icon or word, of its size, so nothing moves
    function copied(button, text) {
        copy(text);
        button.classList.add('calc-done');
        clearTimeout(button.done);
        button.done = setTimeout(function () { button.classList.remove('calc-done'); }, 1000);
    }

    // the formula before the button copied as text, as Copy of the formulas' menu does
    function copyFormula(button) {
        copied(button, formulaText(button.previousElementSibling.innerHTML));
    }

    function pills(items, copies) {
        return [].concat(items).map(function (x) {
            return '<span class="calc-sv-pill"><span>' + x + '</span>' + (copies ? copyButton() : '') + '</span>';
        }).join('');
    }

    // an angle typed in the unit in use, in radians, and back; the unit's name
    function toRadians(v) {
        return deg === 1 ? v * Math.PI / 180 : deg === 2 ? v * Math.PI / 200 : v;
    }

    function fromRadians(v) {
        return CalcMaths.round(deg === 1 ? v * 180 / Math.PI : deg === 2 ? v * 200 / Math.PI : v);
    }

    // an angle of so many degrees as an example types it, in the unit in use: 45, 50 or pi/4
    function angleTyped(d) {
        return deg === 1 ? String(d) : deg === 2 ? String(+(d * 10 / 9).toFixed(4)) : { 30: 'pi/6', 45: 'pi/4', 60: 'pi/3', 90: 'pi/2' }[d] || String(+(d * Math.PI / 180).toFixed(6));
    }

    function unitWord() {
        return deg === 1 ? 'degrees' : deg === 2 ? 'gradians' : 'radians';
    }

    // Points of the plane drawn in a box of W × H, x to the right and y up at one scale, all of them in it
    function planeFit(xs, ys, W, H) {
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), pad = 18,
            k = Math.min((W - 2 * pad) / (x1 - x0 || 1e-9), (H - 2 * pad) / (y1 - y0 || 1e-9)), ox, oy;
        if (!isFinite(k) || k > 1e9) k = 1;
        ox = W / 2 - (x0 + x1) / 2 * k;
        oy = H / 2 + (y0 + y1) / 2 * k;
        return { x: function (v) { return +(ox + v * k).toFixed(1); }, y: function (v) { return +(oy - v * k).toFixed(1); }, k: k, W: W, H: H };
    }

    function planeLabel(f, px, py, text, cx, cy, out) {
        var dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy), x, y, anchor;
        if (!d) { dx = 0; dy = -1; d = 1; }
        x = px + dx / d * (out || 10);
        y = py + dy / d * (out || 10) + 4;
        anchor = dx / d > 0.4 ? 'start' : dx / d < -0.4 ? 'end' : 'middle'; // the text going on away from the point
        if (anchor === 'middle' && x < 40) anchor = 'start';
        if (anchor === 'middle' && x > f.W - 40) anchor = 'end';
        return '<text x="' + x.toFixed(1) + '" y="' + Math.min(f.H - 3, Math.max(11, y)).toFixed(1) + '" text-anchor="' + anchor + '">' + text + '</text>';
    }

    // x₁, x₂ …, or x alone; of another letter, y₁ …
    function rootName(i, n, letter) {
        return (letter || 'x') + (n > 1 ? '<sub>' + (i + 1) + '</sub>' : '');
    }

    // -1 + 2i, 2i, -1, as a number is shown
    function complexText(z) {
        var im = Math.abs(z.im) === 1 ? '' : local(String(Math.abs(z.im)));
        if (!z.im) return local(String(z.re));
        return (z.re ? local(String(z.re)) + (z.im < 0 ? ' – ' : ' + ') : z.im < 0 ? '–' : '') + im + '<i>i</i>';
    }

    // a drawing as a result, the whole width of the card; none while there is none
    function drawnTile(svg, label) {
        return svg ? [{ l: label || 'Drawn', wide: true, text: svg }] : [];
    }

    // x to dp places, or to sig digits, but never to 0 for what is not 0, nor its whole part cut
    function shortValue(x, dp, sig) {
        var v = +x, places = dp, r;
        if (!isFinite(v) || !v) return v;
        if (sig) places = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(v))));
        r = +v.toFixed(Math.min(places, 20));
        return r || +v.toPrecision(2);
    }

    // a text as HTML: its own &, <, > and " not tags, in a tag's text or in an attribute alike
    function escaped(text) {
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---------------- solve ---------------- //

    // The cards of the solver, geometry and money are js/solve-panel.js: given what they take from the calculator, the
    // values that change read as they are now, and filling solvePart with what the calculator takes from them
    var solvePart = {};
    CalcSolvePanel({
        angleTyped: angleTyped,
        complexText: complexText,
        countDrawing: countDrawing,
        get deg() { return deg; },
        densityOf: densityOf,
        drawnTile: drawnTile,
        engine: engine,
        fix: fix,
        fromRadians: fromRadians,
        graphDrawing: graphDrawing,
        local: local,
        placesValue: placesValue,
        planeFit: planeFit,
        planeLabel: planeLabel,
        rangeAround: rangeAround,
        rootName: rootName,
        shortNumber: shortNumber,
        sidesOf: sidesOf,
        statsValue: statsValue,
        toRadians: toRadians,
        tr: tr,
        trn: trn,
        unitWord: unitWord
    }, solvePart);

    // ---------------- numbers ---------------- //

    // The cards of the Numbers panel are js/numbers-panel.js: given what they take from the calculator, the values that
    // change read as they are now, and filling numPart with what the calculator takes from them
    var numPart = {};
    CalcNumbersPanel({
        complexText: complexText,
        get DATE_LANG() { return DATE_LANG; },
        get deg() { return deg; },
        drawnTile: drawnTile,
        engine: engine,
        escaped: escaped,
        fix: fix,
        graphPart: graphPart,
        listTyped: listTyped,
        local: local,
        planeFit: planeFit,
        planeLabel: planeLabel,
        rootName: rootName,
        svgArrow: svgArrow,
        svgOf: svgOf,
        svgText: svgText,
        tr: tr,
        trn: trn
    }, numPart);

    // ---------------- dates ---------------- //

    // The converter's dates: the time from one date to another, and a date moved on by years,
    // months and days, with cards as the solver has. An empty date is today
    var DATE_TOOLS = {
        dates: [
            { id: 'span', waits: true, t: 'Time between dates', f: 'years, months, weeks and days', d: 'The time from one date to another: in years, months and days; then the whole years, months and weeks of it, its days, its weekdays, Monday to Friday, both dates in, and its hours, each below 0 where the second date is before the first. An empty date is today.',
                fields: [{ k: 'a', l: 'From', date: true }, { k: 'b', l: 'To', date: true }], run: runSpan, example: { a: '2000-01-01' } },
            { id: 'add', fills: true, t: 'Add or subtract time', f: 'date ± years, months, days', d: 'A date some years, months and days on, below 0 to go back: the date and its weekday, its day of the year and its week. The years and months go first; a month from 31 January is the last day of February. An empty date is today.',
                fields: [{ k: 'd', l: 'Date', date: true }, { k: 'y', l: 'Years', ph: '0', def: 0, cls: 'calc-sv-dated' },
                    { k: 'm', l: 'Months', ph: '0', def: 0, cls: 'calc-sv-dated' }, { k: 'days', l: 'Days', ph: '0', def: 0, cls: 'calc-sv-dated' }],
                cols: 3, run: runAdd },
            { id: 'zones', t: 'Time zones', f: '15:00 London = 23:00 Tokyo', d: 'A time in one place, and the same time in another: the time is now at first, to type over, and empty again is now. ' +
                'Summer time is as each place has it today.',
                fields: [{ k: 'time', l: 'Time', ph: 'Now', text: true, now: zoneNow }, { k: 'from', l: 'From', pick: zoneChoices, at: 'Here', wide: true },
                    { k: 'to', l: 'To', pick: zoneChoices, at: 'London', wide: true }], run: runZones },
            { id: 'unix', t: 'Unix time', f: '1700000000 ↔ 14 Nov 2023 22:13:20', d: 'One way or the other. Unix → Date: the date and time of a Unix timestamp, the seconds from 1 January 1970 in UTC, or of 13 digits its milliseconds, in UTC, here, and in ISO 8601. Date → Unix: the timestamp of a date and time, in UTC or the time here; an empty date is today, an empty time midnight.',
                // the boxes of the way chosen only: a timestamp, or a date, a time and its zone
                fields: function (raw) {
                    var way = [{ k: 'convert', l: 'Convert', choice: ['Unix → Date', 'Date → Unix'] }];
                    return raw.convert === '1' ? way.concat([{ k: 'd', l: 'Date', date: true }, { k: 'time', l: 'Time', ph: '00:00:00', text: true },
                        { k: 'zone', l: 'Time in', choice: ['UTC', 'Time here'] }]) : way.concat([{ k: 'ts', l: 'Unix time', ph: '1700000000' }]);
                }, run: runUnix, example: function (raw) { return raw.convert === '1' ? { convert: '1', d: '2023-11-14', time: '22:13:20' } : { ts: '1700000000' }; } }
        ]
    };

    // the places of the lists, the browser's own first, then the cities most asked for, A to Z: [name, zone]; a
    // place is kept by its name, as several cities share a zone. The browser's other zones join them
    var ZONE_CHOICES = [
        ['Here', 'here'], ['UTC', 'UTC'], ['Abu Dhabi', 'Asia/Dubai'], ['Accra', 'Africa/Accra'], ['Addis Ababa', 'Africa/Addis_Ababa'],
        ['Adelaide', 'Australia/Adelaide'], ['Algiers', 'Africa/Algiers'], ['Almaty', 'Asia/Almaty'], ['Amman', 'Asia/Amman'], ['Amsterdam', 'Europe/Amsterdam'],
        ['Anchorage', 'America/Anchorage'], ['Ankara', 'Europe/Istanbul'], ['Athens', 'Europe/Athens'], ['Atlanta', 'America/New_York'],
        ['Auckland', 'Pacific/Auckland'], ['Baghdad', 'Asia/Baghdad'], ['Baku', 'Asia/Baku'], ['Bangkok', 'Asia/Bangkok'], ['Barcelona', 'Europe/Madrid'],
        ['Beijing', 'Asia/Shanghai'], ['Beirut', 'Asia/Beirut'], ['Belgrade', 'Europe/Belgrade'], ['Bengaluru', 'Asia/Kolkata'], ['Berlin', 'Europe/Berlin'],
        ['Bogotá', 'America/Bogota'], ['Boston', 'America/New_York'], ['Brisbane', 'Australia/Brisbane'], ['Brussels', 'Europe/Brussels'],
        ['Bucharest', 'Europe/Bucharest'], ['Budapest', 'Europe/Budapest'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'], ['Cairo', 'Africa/Cairo'],
        ['Calgary', 'America/Edmonton'], ['Cape Town', 'Africa/Johannesburg'], ['Caracas', 'America/Caracas'], ['Casablanca', 'Africa/Casablanca'],
        ['Chicago', 'America/Chicago'], ['Copenhagen', 'Europe/Copenhagen'], ['Dallas', 'America/Chicago'], ['Damascus', 'Asia/Damascus'],
        ['Dar es Salaam', 'Africa/Dar_es_Salaam'], ['Delhi', 'Asia/Kolkata'], ['Denver', 'America/Denver'], ['Dhaka', 'Asia/Dhaka'], ['Doha', 'Asia/Qatar'],
        ['Dubai', 'Asia/Dubai'], ['Dublin', 'Europe/Dublin'], ['Edinburgh', 'Europe/London'], ['Frankfurt', 'Europe/Berlin'], ['Geneva', 'Europe/Zurich'],
        ['Halifax', 'America/Halifax'], ['Hanoi', 'Asia/Ho_Chi_Minh'], ['Havana', 'America/Havana'], ['Helsinki', 'Europe/Helsinki'],
        ['Ho Chi Minh City', 'Asia/Ho_Chi_Minh'], ['Hong Kong', 'Asia/Hong_Kong'], ['Honolulu', 'Pacific/Honolulu'], ['Houston', 'America/Chicago'],
        ['Islamabad', 'Asia/Karachi'], ['Istanbul', 'Europe/Istanbul'], ['Jakarta', 'Asia/Jakarta'], ['Jeddah', 'Asia/Riyadh'], ['Jerusalem', 'Asia/Jerusalem'],
        ['Johannesburg', 'Africa/Johannesburg'], ['Kabul', 'Asia/Kabul'], ['Karachi', 'Asia/Karachi'], ['Kathmandu', 'Asia/Kathmandu'], ['Khartoum', 'Africa/Khartoum'],
        ['Kolkata', 'Asia/Kolkata'], ['Kuala Lumpur', 'Asia/Kuala_Lumpur'], ['Kuwait City', 'Asia/Kuwait'], ['Kyiv', 'Europe/Kiev'], ['Lagos', 'Africa/Lagos'],
        ['Lahore', 'Asia/Karachi'], ['Las Vegas', 'America/Los_Angeles'], ['Lima', 'America/Lima'], ['Lisbon', 'Europe/Lisbon'], ['London', 'Europe/London'],
        ['Los Angeles', 'America/Los_Angeles'], ['Madrid', 'Europe/Madrid'], ['Manchester', 'Europe/London'], ['Manila', 'Asia/Manila'], ['Mecca', 'Asia/Riyadh'],
        ['Melbourne', 'Australia/Melbourne'], ['Mexico City', 'America/Mexico_City'], ['Miami', 'America/New_York'], ['Milan', 'Europe/Rome'], ['Minsk', 'Europe/Minsk'],
        ['Montevideo', 'America/Montevideo'], ['Montreal', 'America/Toronto'], ['Moscow', 'Europe/Moscow'], ['Mumbai', 'Asia/Kolkata'], ['Munich', 'Europe/Berlin'],
        ['Muscat', 'Asia/Muscat'], ['Nairobi', 'Africa/Nairobi'], ['New York', 'America/New_York'], ['Oslo', 'Europe/Oslo'], ['Ottawa', 'America/Toronto'],
        ['Paris', 'Europe/Paris'], ['Perth', 'Australia/Perth'], ['Philadelphia', 'America/New_York'], ['Phoenix', 'America/Phoenix'], ['Prague', 'Europe/Prague'],
        ['Reykjavik', 'Atlantic/Reykjavik'], ['Rio de Janeiro', 'America/Sao_Paulo'], ['Riyadh', 'Asia/Riyadh'], ['Rome', 'Europe/Rome'],
        ['San Francisco', 'America/Los_Angeles'], ['Santiago', 'America/Santiago'], ['São Paulo', 'America/Sao_Paulo'], ['Seattle', 'America/Los_Angeles'],
        ['Seoul', 'Asia/Seoul'], ['Shanghai', 'Asia/Shanghai'], ['Singapore', 'Asia/Singapore'], ['St Petersburg', 'Europe/Moscow'], ['Stockholm', 'Europe/Stockholm'],
        ['Sydney', 'Australia/Sydney'], ['Taipei', 'Asia/Taipei'], ['Tashkent', 'Asia/Tashkent'], ['Tehran', 'Asia/Tehran'], ['Tel Aviv', 'Asia/Jerusalem'],
        ['Tokyo', 'Asia/Tokyo'], ['Toronto', 'America/Toronto'], ['Tunis', 'Africa/Tunis'], ['Vancouver', 'America/Vancouver'], ['Vienna', 'Europe/Vienna'],
        ['Warsaw', 'Europe/Warsaw'], ['Washington DC', 'America/New_York'], ['Wellington', 'Pacific/Auckland'], ['Yangon', 'Asia/Yangon'], ['Zurich', 'Europe/Zurich']];

    // a place of the list as the time zones take it: here, UTC, or a zone of the browser's with its city's name
    function zoneOf(name) {
        var place = zonePlaces().filter(function (c) { return c[0] === name; })[0];
        if (!place || place[1] === 'here') return CalcMaths.timeZone('');
        return place[1] === 'UTC' ? { fixed: 0, name: 'UTC' } : { id: place[1], name: place[0] };
    }

    // a place's name as its tile and the list show it: UTC, as a time zone, in the language in use; any other, its city, as tr() takes it
    function zoneName(zone) {
        return zone.fixed === 0 && zone.name === 'UTC' ? trc('time zone', 'UTC') : zone.name;
    }

    // The cities most asked for and every other zone of the browser's, by its city, Kinshasa of Africa/Kinshasa, as one
    // list A to Z after here and UTC; a zone already in it, or of a city in it under an old name, as Kiev, is left out. Made once
    var zonePlaceList = null;
    function zonePlaces() {
        var names = {}, all = ZONE_CHOICES.slice(2), fold = function (t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
        if (zonePlaceList) return zonePlaceList;
        all.forEach(function (c) { names[c[0]] = names[c[1]] = true; });
        ['Kiev', 'Katmandu', 'Calcutta', 'Saigon', 'Rangoon', 'Godthab', 'Ulan Bator', 'Asmera', 'Faeroe', 'Thimbu', 'Dacca', 'Kuwait'].forEach(function (n) { names[n] = true; });
        try {
            Intl.supportedValuesOf('timeZone').forEach(function (id) {
                var name = id.split('/').pop().replace(/_/g, ' ');
                if (id.indexOf('/') < 0 || /^Etc\//.test(id) || names[name] || names[id]) return;
                names[name] = true;
                all.push([name, id]);
            });
        } catch (e) {} // a browser without the list: the cities alone
        all.sort(function (a, b) { return fold(a[0]) < fold(b[0]) ? -1 : fold(a[0]) > fold(b[0]) ? 1 : 0; });
        zonePlaceList = ZONE_CHOICES.slice(0, 2).concat(all);
        return zonePlaceList;
    }

    // the list, each place with its offset now; here, with its city
    function zoneChoices() {
        var ms = Date.now();
        return zonePlaces().filter(function (c) {
            return isFinite(CalcMaths.zoneOffset(zoneOf(c[0]), ms)); // not a zone the browser does not have
        }).map(function (c) {
            var z = zoneOf(c[0]);
            return [c[0], (z.here ? tr('Here, {v}', { v: tr((z.id || '').split('/').pop().replace(/_/g, ' ')) }) : c[1] === 'UTC' ? zoneName(z) : tr(c[0])) +
                ' <span class="calc-conv-of">(' + CalcMaths.offsetText(CalcMaths.zoneOffset(z, ms)) + ')</span>'];
        });
    }

    // the time shown while none is typed: now, in the first place, 14:05
    function zoneNow(raw) {
        var ms = Date.now(), at = new Date(ms + CalcMaths.zoneOffset(zoneOf(raw.from), ms) * 60000);
        return String(at.getUTCHours()).padStart(2, '0') + ':' + String(at.getUTCMinutes()).padStart(2, '0');
    }

    // A time today in one place, or now, and the same moment in another: its date and time there, its offset
    // from UTC, and how far it is ahead of the first or behind it
    function runZones(n, raw) {
        var from = zoneOf(raw.from), to = zoneOf(raw.to || 'London'), now = Date.now(), t, off, ms;
        t = raw.time ? CalcMaths.readTime(raw.time) : NaN;
        if (raw.time && isNaN(t)) {
            return { rows: [{ l: zoneName(to), text: '–', wide: true }], bad: ['time'], warn: true, note: 'A time, 14:30 or 2:30 pm.' };
        }
        if (!raw.time) {
            ms = Math.floor(now / 60000) * 60000; // the minute shown in the box
        } else {
            off = CalcMaths.zoneOffset(from, now);
            ms = CalcMaths.zoneMoment(from, Math.floor((now + off * 60000) / 86400000), t); // today, in the first place
        }
        off = CalcMaths.zoneOffset(from, ms);
        return { rows: (from.here ? [] : [zoneRow(from, ms, off, null)]).concat(zoneRow(to, ms, CalcMaths.zoneOffset(to, ms), off)) }; // here: the other place alone
    }

    // a place's tile: its time, big, its offset beside it, and of another place how far ahead of the first it is, then its date under it
    function zoneRow(zone, ms, off, first) {
        var at = new Date(ms + off * 60000), gap = first === null ? 0 : off - first, hm = zoneGap(Math.abs(gap)),
            clock = at.toLocaleString(DATE_LANG, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }),
            day = at.toLocaleString(DATE_LANG, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
        return { l: zone.here ? (zone.id || '').split('/').pop().replace(/_/g, ' ') : zoneName(zone), wide: true, copy: day + ', ' + clock + ' ' + CalcMaths.offsetText(off), // here, by its city
            text: '<span class="calc-sv-clock">' + clock + '<span class="calc-sv-off">' + CalcMaths.offsetText(off) +
                (first === null ? '' : ' (' + (!gap ? tr('the same time') : (gap > 0 ? tr('{gap} ahead', { gap: hm }) : tr('{gap} behind', { gap: hm }))) + ')') + '</span></span><span class="calc-sv-day">' + day + '</span>' };
    }

    // how far apart two places are, of minutes: 6h, 5h 30min, 45min
    function zoneGap(a) {
        var h = Math.floor(a / 60) ? trn(Math.floor(a / 60), '{n}h', '{n}h') : '', m = a % 60 ? trn(a % 60, '{n}min', '{n}min') : '';
        return h && m ? tr('{h} {m}', { h: h, m: m }) : h || m;
    }

    // The date and time of a Unix timestamp, or the timestamp of a date and time: the timestamp in
    // seconds and milliseconds, the time in UTC, here and in ISO 8601. One of 13 digits or more is
    // of milliseconds; leap seconds are left out, as Unix time leaves them
    function runUnix(n, raw) {
        var ms, secs, day, at, t, bad = [], none = [{ l: 'Unix time', v: NaN }, { l: 'UTC', text: '–', wide: true }], two = function (v) { return String(v).padStart(2, '0'); }, milli;
        if (raw.convert !== '1') { // Unix → Date
            if (!raw.ts) return { rows: none };
            if (!isFinite(n.ts)) return { rows: none, bad: ['ts'], warn: true, note: 'Seconds from 1 January 1970, 1700000000, or milliseconds, 1700000000000.' };
            milli = /^-?\d{13,}/.test(raw.ts);
            ms = milli ? n.ts : n.ts * 1000;
        } else {
            day = dayOfBox(raw.d);
            t = raw.time ? CalcMaths.readTime(raw.time) : 0;
            if (isNaN(day)) bad.push('d');
            if (isNaN(t)) bad.push('time');
            if (bad.length) return { rows: none, bad: bad, warn: true, note: bad[0] === 'd' ? 'A date, as ' + dateNumbers(today()) + ' or 14 Oct 2026, from the year 1 to 9999.' : 'A time, 14:30, 14:30:15 or 2:30 pm.' };
            ms = day * 86400000 + t * 1000;
            if (raw.zone === '1') ms += new Date(ms + new Date(ms).getTimezoneOffset() * 60000).getTimezoneOffset() * 60000; // the time here, its offset of that day
        }
        ms = Math.round(ms); // first, so that the day, the time and the seconds all come from the same millisecond
        day = Math.floor(ms / 86400000);
        if (!(day >= CAL_FIRST && day <= CAL_LAST)) return { rows: none, warn: true, note: 'Before the year 1 or after 9999.' };
        at = ms - day * 86400000;
        secs = (ms < 0 ? '-' : '') + Math.floor(Math.abs(ms) / 1000) + local(Math.abs(ms) % 1000 ? '.' + String(Math.abs(ms) % 1000).padStart(3, '0').replace(/0+$/, '') : ''); // from its whole milliseconds, every digit
        return {
            // to the last millisecond: more digits than a tile of a number shows, so as they are
            rows: [{ l: 'Unix time', text: secs, wide: true }, { l: 'Milliseconds', text: String(Math.round(ms)), wide: true },
                { l: 'UTC', text: dateText(day) + ', ' + two(Math.floor(at / 3600000)) + ':' + two(Math.floor(at / 60000) % 60) + ':' + two(Math.floor(at / 1000) % 60) + (at % 1000 ? '.' + String(at % 1000).padStart(3, '0') : ''), wide: true },
                { l: 'Time here', text: new Date(ms).toLocaleString(DATE_LANG, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }), wide: true },
                { l: 'ISO 8601', text: new Date(ms).toISOString().replace('.000Z', 'Z').replace(/^\+0*(?=\d{4}-)/, ''), wide: true }],
            note: milli ? 'Of 13 digits: milliseconds.' : raw.convert !== '1' ? 'Seconds from 1 January 1970, in UTC.' : (raw.zone === '1' ? tr('The date and time in the time here.') : tr('The date and time in UTC.'))
        };
    }

    // the day of today, here
    function today() {
        var t = new Date();
        return CalcMaths.dayFrom(t.getFullYear(), t.getMonth() + 1, t.getDate());
    }

    // A date is written in numbers as the browser's region writes it: 14/10/2026 in the UK and France,
    // 14.10.2026 in Germany, 10/14/2026 in the US, 2026-10-14 in Sweden; and read so as it is typed.
    // Its words are in the language in use (lang.js); in English, in the order of the US or the UK. The weeks of the
    // calendar start on the region's first day: Monday, or Sunday in the US
    var DATE_LANG = CalcLang.locale !== 'en' ? CalcLang.locale : /^en\b/i.test(navigator.language || '') ? navigator.language : 'en-GB',
        DATE_NUMBERS = (function () {
            var how = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC', numberingSystem: 'latn', calendar: 'gregory' };
            try {
                return new Intl.DateTimeFormat(navigator.language || 'en-GB', how);
            } catch (e) {
                return new Intl.DateTimeFormat('en-GB', how);
            }
        })(),
        DATE_ORDER = DATE_NUMBERS.formatToParts(new Date(Date.UTC(2000, 11, 31))).filter(function (p) {
            return /^(day|month|year)$/.test(p.type);
        }).map(function (p) { return p.type.charAt(0); }).join(''), // dmy, mdy or ymd
        WEEK_START = (function () { // 0 Sunday, 1 Monday, 6 Saturday
            var locale, week;
            try {
                locale = new Intl.Locale(navigator.language || 'en-GB');
                week = locale.getWeekInfo ? locale.getWeekInfo() : locale.weekInfo;
                if (week && week.firstDay) return week.firstDay % 7;
            } catch (e) { }
            return DATE_ORDER === 'mdy' ? 0 : 1;
        })();

    // a day in words: Wednesday, 14 October 2026. Of the options of toLocaleDateString: { month: 'long', year: 'numeric' } for October 2026
    function dateText(day, how) {
        var c = CalcMaths.dateOf(day), t = new Date(0);
        t.setUTCFullYear(c.y, c.m - 1, c.d);
        return t.toLocaleDateString(DATE_LANG, Object.assign(how || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, { timeZone: 'UTC' }));
    }

    // a day in numbers, as the region writes it: 14/10/2026; the year of four digits always, so it is read again as it is
    function dateNumbers(day) {
        var c = CalcMaths.dateOf(day), t = new Date(0);
        t.setUTCFullYear(c.y, c.m - 1, c.d);
        return DATE_NUMBERS.formatToParts(t).map(function (p) {
            return p.type === 'year' ? p.value.padStart(4, '0') : p.value;
        }).join('').replace(/[\u200e\u200f]/g, '');
    }

    // 3 weeks, 1 day: each that is not 0, grouped as the display groups; 0 days for none
    function timeText(parts) {
        var text = parts.filter(function (p) { return p[0]; }).map(function (p) {
            var v = { n: CalcEngine.group(String(p[0]), fmt.group) };
            return p[1] === 'year' ? trn(p[0], '{n} year', '{n} years', v) : p[1] === 'month' ? trn(p[0], '{n} month', '{n} months', v) : trn(p[0], '{n} day', '{n} days', v);
        }).join(', ');
        return text || tr('0 days');
    }

    // the date of a box, today while it is empty or says so
    function dayOfBox(text) {
        return !text || /^today$/i.test(text) ? today() : CalcMaths.readDate(text, DATE_ORDER);
    }

    // ---------------- calendar ---------------- //

    // A calendar for a box of a date, drawn as the calculator draws, as the lists of the converter
    // are: under the box, or over it where the panel has no room below. « and » go a year back and on,
    // ‹ and › a month; a click on a day, or Enter, writes it in the box. While it is open the arrows go
    // a day and a week, Page Up and Page Down a month, and Esc closes it. A click in the box opens it,
    // as its button and the arrow down do
    var calendar = document.createElement('div'),
        calBox = null, // the box it is open for
        calLit = 0, // the day lit, whose month is shown
        CAL_FIRST = CalcMaths.dayFrom(1, 1, 1), CAL_LAST = CalcMaths.dayFrom(9999, 12, 31),
        CALENDAR_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">' +
            '<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/></svg>',
        // an arrow going round: of a choice that makes anew, as a UUID's version
        AGAIN_ICON = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M20 4v6h-6"/><path d="M19.5 15a8 8 0 1 1-1.9-8.3L20 10"/></svg>',
        RESET_ICON = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>'; // an arrow curling back

    calendar.className = 'calc-cal';
    calendar.hidden = true;
    calendar.setAttribute('role', 'dialog');
    calendar.setAttribute('aria-label', 'Calendar');

    function openCalendar(box) {
        var day = dayOfBox(box.value.trim());
        calBox = box;
        calLit = isNaN(day) ? today() : day;
        box.closest('.calc-past').appendChild(calendar);
        calendar.hidden = false;
        box.parentNode.classList.add('calc-on');
        hideTip();
        drawCalendar();
        placeCalendar();
    }

    function closeCalendar() {
        if (!calBox) return;
        calendar.hidden = true;
        calBox.parentNode.classList.remove('calc-on');
        calBox = null;
    }

    // the month of the day lit, its weeks from Monday, or Sunday; the day in the box and today marked
    function drawCalendar() {
        var c = CalcMaths.dateOf(calLit), first = CalcMaths.dayFrom(c.y, c.m, 1), start = first - (CalcMaths.weekday(first) + 8 - WEEK_START) % 7,
            chosen = dayOfBox(calBox.value.trim()), now = today(), html = '', i, d,
            names = tr('Su Mo Tu We Th Fr Sa').split(' '); // from Sunday, as short as the language writes them over a calendar
        for (i = 0; i < 7; i++) html += '<span class="calc-cal-wk">' + names[(CalcMaths.weekday(start + i) + 1) % 7] + '</span>';
        for (i = 0; i < 42; i++) {
            d = start + i;
            html += d < CAL_FIRST || d > CAL_LAST ? '<span></span>' : '<span class="calc-cal-day' + (CalcMaths.dateOf(d).m !== c.m ? ' calc-cal-out' : '') +
                (d === now ? ' calc-cal-now' : '') + (d === chosen ? ' calc-on' : '') + (d === calLit ? ' calc-lit' : '') + '" data-d="' + d + '">' + CalcMaths.dateOf(d).d + '</span>';
        }
        calendar.innerHTML = '<div class="calc-cal-head"><span class="calc-cal-go" data-go="-12" title="' + tr('A year back') + '">«</span>' +
            '<span class="calc-cal-go" data-go="-1" title="' + tr('A month back') + '">‹</span><span class="calc-cal-title">' + dateText(calLit, { month: 'long', year: 'numeric' }) + '</span>' +
            '<span class="calc-cal-go" data-go="1" title="' + tr('A month on') + '">›</span><span class="calc-cal-go" data-go="12" title="' + tr('A year on') + '">»</span></div>' +
            '<div class="calc-cal-grid">' + html + '</div><div class="calc-cal-foot"><span class="calc-cal-today">' + tr('Today') + '</span></div>';
    }

    // under the box, at its right; over it where there is no room below, and inside the panel always
    function placeCalendar() {
        var panel = calendar.parentNode, p = panel.getBoundingClientRect(), b = calBox.parentNode.getBoundingClientRect(),
            k = p.width / panel.offsetWidth || 1, h = calendar.offsetHeight, top = (b.bottom - p.top) / k + 4;
        if (top + h > panel.clientHeight - 4) top = Math.max((b.top - p.top) / k - h - 4, panel.clientHeight - 4 - h);
        calendar.style.top = Math.max(4, top) + 'px';
        calendar.style.left = (CalcLang.rtl ? // under its button: at the left of the box, right to left
            Math.max(6, Math.min((b.left - p.left) / k, panel.clientWidth - 6 - calendar.offsetWidth)) :
            Math.max(6, (b.right - p.left) / k - calendar.offsetWidth)) + 'px';
    }

    // the day lit moved on by days, or by months, below 0 back; never past the year 1 or 9999
    function moveCalendar(days, months) {
        var d = months ? CalcMaths.addDate(calLit, 0, months, 0) : calLit + days;
        if (!isNaN(d) && d >= CAL_FIRST && d <= CAL_LAST) calLit = d;
        drawCalendar();
    }

    // the day written in the box, as if typed, and the box has the focus again
    function chooseDay(day) {
        var box = calBox;
        closeCalendar();
        box.value = dateNumbers(day);
        box.dispatchEvent(new Event('input', { bubbles: true }));
        focusBox(box);
    }

    calendar.addEventListener('mousedown', function (e) {
        e.preventDefault(); // the box keeps the focus
    }, false);

    calendar.addEventListener('click', function (e) {
        var go = e.target.closest('[data-go]'), day = e.target.closest('[data-d]');
        if (go) moveCalendar(0, +go.dataset.go);
        else if (day) chooseDay(+day.dataset.d);
        else if (e.target.closest('.calc-cal-today')) chooseDay(today());
    }, false);

    // a press anywhere but on it and its box closes it
    document.addEventListener('mousedown', function (e) {
        if (calBox && !calendar.contains(e.target) && !calBox.parentNode.contains(e.target)) closeCalendar();
    }, true);

    // A box of a date: the calendar from a click in it, its button, or the arrow down; its keys while
    // it is open. A date typed in it shows its month
    function dateBoxOf(box) {
        box.addEventListener('click', function () {
            if (calBox !== box) openCalendar(box);
        }, false);

        box.parentNode.querySelector('.calc-sv-cal').addEventListener('click', function (e) {
            e.preventDefault();
            if (calBox === box) closeCalendar();
            else openCalendar(box);
            focusBox(box);
        }, false);

        box.addEventListener('input', function () {
            var day = dayOfBox(box.value.trim());
            if (calBox !== box) return;
            if (!isNaN(day)) calLit = day;
            drawCalendar();
        }, false);

        box.addEventListener('keydown', function (e) {
            var k = e.which, moves = { 37: -1, 39: 1, 38: -7, 40: 7 };
            if (calBox !== box) {
                if (k !== 40) return;
                openCalendar(box);
            } else if (moves[k]) {
                moveCalendar(moves[k]);
            } else if (k === 33 || k === 34) { // Page Up and Down: a month, with Shift a year
                moveCalendar(0, (k === 33 ? -1 : 1) * (e.shiftKey ? 12 : 1));
            } else if (k === 13) {
                chooseDay(calLit);
            } else if (k === 27) {
                closeCalendar();
            } else {
                if (k === 9) closeCalendar(); // Tab goes on to the next box
                return;
            }
            e.preventDefault();
            e.stopPropagation(); // not on to the next box, and the panel stays open
        }, false);

        box.addEventListener('blur', function () {
            setTimeout(function () {
                if (calBox === box && document.activeElement !== box) closeCalendar();
            }, 0);
        }, false);
    }

    // The time between two dates: the whole of it first, in years, months and days, as the calculator
    // of Windows has it; then a tile for each unit, the whole ones of it in that unit, to put in. All
    // below 0 where the second date is before the first
    var SPAN_UNITS = [
        ['Years', function (r) { return r.years; }],
        ['Months', function (r) { return r.years * 12 + r.months; }],
        ['Weeks', function (r) { return r.weeks; }],
        ['Days', function (r) { return Math.abs(r.days); }],
        ['Weekdays', function (r) { return r.workdays; }],
        ['Hours', function (r) { return Math.abs(r.days) * 24; }]
    ];

    function runSpan(n, raw) {
        var a = dayOfBox(raw.a), b = dayOfBox(raw.b), bad = [], r, back;
        if (isNaN(a)) bad.push('a');
        if (isNaN(b)) bad.push('b');
        r = bad.length ? null : CalcMaths.datesBetween(a, b);
        back = !!r && r.days < 0;
        return {
            rows: [r ? { l: 'Years, months and days', text: timeText([[r.years, 'year'], [r.months, 'month'], [r.rest, 'day']]), wide: true } :
                { l: 'Years, months and days', v: NaN, wide: true }].concat(SPAN_UNITS.map(function (u) {
                var v = r ? u[1](r) : NaN;
                return { l: u[0], v: back && v ? -v : v };
            })),
            bad: bad, warn: !!bad.length,
            note: bad.length ? 'A date, as ' + dateNumbers(today()) + ' or 14 Oct 2026, from the year 1 to 9999.' :
                back ? 'The second date is before the first: the numbers are below 0.' : 'Weekdays are Monday to Friday, both dates in.'
        };
    }

    function runAdd(n, raw) {
        var from = dayOfBox(raw.d), bad = [], to, week;
        if (isNaN(from)) bad.push('d');
        ['y', 'm', 'days'].forEach(function (k) {
            if (!Number.isInteger(n[k])) bad.push(k);
        });
        to = bad.length ? NaN : CalcMaths.addDate(from, n.y, n.m, n.days);
        week = isNaN(to) ? null : CalcMaths.isoWeek(to);
        return {
            rows: [isNaN(to) ? { l: 'Date', v: NaN } : { l: 'Date', text: dateNumbers(to) }, isNaN(to) ? { l: 'Weekday', v: NaN } : { l: 'Weekday', text: dateText(to, { weekday: 'long' }) },
                { l: 'Days on', v: to - from }, { l: 'Day of the year', v: isNaN(to) ? NaN : CalcMaths.dayOfYear(to) },
                { l: 'Week', v: week ? week.week : NaN }],
            bad: bad, warn: !!bad.length || isNaN(to),
            note: bad.indexOf('d') > -1 ? 'A date, as ' + dateNumbers(today()) + ' or 14 Oct 2026, from the year 1 to 9999.' : bad.length ? 'Whole years, months and days, below 0 to go back.' :
                isNaN(to) ? 'Before the year 1 or after 9999.' : 'Below 0 goes back. The week is by ISO 8601, from Monday.'
        };
    }

    // ---------------- panels of tools ---------------- //

    // Cards of tools on tabs, as the solver, the numbers and the converter's dates have: a card
    // for each, which opens its boxes; what it gives worked out as they are typed, in tiles that
    // put a value into the calculation with a click, a number of a matrix as well. A tab of one
    // tool has it open. key: where its tab, its tool open and what is typed in each are kept for
    // the next time; plain: its boxes of a number keep only a number, as the formulas' do, where
    // the solver's take a calculation, pi/4. now: { open(), whether its cards are shown,
    // done(), after a value is put in }
    // { render(), load(saved), clear(), keep(), tab(), setTab(tab), focus(), tip(el) }
    // Again pressed: a card that picks at random picks anew, and keeps what it picked otherwise (the worksheet)
    var svAgain = false;

    function toolCards(list, tools, key, plain, now) {
        var tab = Object.keys(tools)[0], openId = '', values = {}, rows = [], pasted = '',
            formulas = key !== 'convUnits' && key !== 'dates'; // its badges formulas, to copy: the converter's are examples

        // the boxes of a tool, as what is typed in it says: a matrix has as many as its size
        function fieldsOf(tool, raw) {
            return typeof tool.fields === 'function' ? tool.fields(raw) : tool.fields;
        }

        // a result that is a drawing: a shape, a graph, a resistor, the plane
        function drawnRow(r) {
            return typeof r.text === 'string' && r.text.lastIndexOf('<svg', 0) === 0;
        }

        // what is typed in each box of the tool open, trimmed
        function rawOf(tool) {
            var kept = values[tool.id] || {}, raw = {};
            // a box of text keeps its spaces, which are of the text
            Object.keys(kept).forEach(function (k) {
                raw[k] = typeof kept[k] !== 'string' ? '' : (tool.spaces || []).indexOf(k) > -1 ? kept[k] : kept[k].trim();
            });
            return raw;
        }

        // the badges of a card wider than its room, as of a tool of three formulas in a narrow window: smaller, to 10px, till they
        // fit, then cut with … as before; the rest as they are. Of the card's room, not of the row, which is only as wide as its badges
        function crowded(row, pad) {
            var first = row.firstElementChild, last = row.lastElementChild, room = row.parentNode.getBoundingClientRect().width;
            if (!room || !last) return false;
            return last.getBoundingClientRect().right - first.getBoundingClientRect().left + pad > room + 0.5;
        }

        // a badge that fits in its share of the room is kept whole: only the long ones are cut. Measured, and what to set given back
        function share(row, pad) {
            var room = row.parentNode.getBoundingClientRect().width / row.children.length - pad, // less the 5px each side of a badge
                whole = [].map.call(row.children, function (pill) { return pill.getBoundingClientRect().width <= room; });
            return function () {
                [].forEach.call(row.children, function (pill, i) {
                    pill.style.flexShrink = whole[i] ? 0 : '';
                });
            };
        }

        // Each step set for every row, then every row measured: the page laid out once a step, not once a row and a step
        function fitPills() {
            var rows = [].filter.call(list.querySelectorAll('.calc-sv-eq > span'), function (row) {
                    return !row.closest('[hidden]'); // not shown: fitted as it is shown again
                }), pad = 10 * scale(), size = 15, tight;
            rows.forEach(function (row) {
                row.style.fontSize = '';
                row.classList.add('calc-sv-fit'); // each badge as wide as all of it, to measure; then cut with … if need be
            });
            for (tight = rows.filter(function (row) { return crowded(row, pad); }); size > 10 && tight.length; tight = tight.filter(function (row) { return crowded(row, pad); })) {
                size--;
                tight.forEach(function (row) { row.style.fontSize = size + 'px'; });
            }
            rows.map(function (row) { return share(row, pad); }).forEach(function (set) { set(); });
            rows.forEach(function (row) { row.classList.remove('calc-sv-fit'); });
        }

        // fitted again as the list's room changes, and once it is shown: hidden, it had none to measure
        if (window.ResizeObserver) new ResizeObserver(fitPills).observe(list);

        // the icon before a card's name, of what it works with, where it has one
        function toolIcon(tool) {
            return CalcIcons.card(key, tool.id);
        }

        // the cards of the tab, the one open with its boxes
        function render() {
            var open;
            list.innerHTML = tools[tab].map(function (tool, i) {
                if (tool.id === openId) open = i;
                return '<div class="calc-sv-item" data-i="' + i + '"><div class="calc-sv-row"><span class="calc-sv-col">' +
                    '<span class="calc-sv-name">' + toolIcon(tool) + tr(tool.t) + '</span><span class="calc-sv-f calc-sv-eq calc-sv-val"><span>' +
                    pills(tool.f, formulas) + '</span></span></span>' + collapseButton() + '</div></div>'; // each in a badge, one alone as well
            }).join('');
            rtlDraw(list);
            list.scrollTop = 0;
            list.classList.toggle('calc-side', !!(now.side && now.side())); // beside the list, the card open
            if (open === undefined && (tools[tab].length === 1 || (now.side && now.side()))) open = 0; // beside the list, a card is always open
            if (open !== undefined) openTool(list.children[open], true); // its badges fitted as it opens
            else fitPills();
            hideTip();
        }

        // A card opened: a box for each of its numbers and functions, as they were typed last, and
        // its results; the one open before closes. null closes it
        function openTool(item, quiet) {
            var open = list.querySelector('.calc-sv-item.calc-on'), tool, form, box;
            if (open) {
                open.classList.remove('calc-on');
                open.removeChild(open.querySelector('.calc-sv-form'));
            }
            openId = '';
            if (!item) {
                fitPills(); // its badges without their Copy again
                return keep();
            }
            hideTip();
            tool = tools[tab][+item.dataset.i];
            openId = tool.id;
            form = item.appendChild(document.createElement('div'));
            form.className = 'calc-sv-form';
            form.innerHTML = (now.side && now.side() ? '<div class="calc-sv-side-head"><span class="calc-sv-side-name">' + toolIcon(tool) + tr(tool.t) + '</span><span class="calc-sv-f calc-sv-val">' + pills(tool.f, formulas) +
                '</span><p class="calc-sv-side-d">' + tr(tool.d) + '</p></div>' : '') + // beside the list, its name, formula and what it does at its top
                '<div class="calc-sv-top"><span class="calc-sv-reset" role="button" hidden>' + tr('Reset') + RESET_ICON + '</span></div>' +
                '<div class="calc-sv-boxes"></div><div class="calc-sv-note"></div>' + (tool.again ? '<span class="calc-sv-again">' + tr('Again') + '</span>' : '') +
                (tool.example ? '<span class="calc-sv-again calc-sv-example" role="button">' + tr('Example') + '</span>' : '') +
                '<div class="calc-sv-results">' + tr('Results') + '</div><div class="calc-sv-grid"></div><div class="calc-sv-pickfrom" hidden></div>';
            item.classList.add('calc-on');
            fitPills(); // its badges with their Copy, cut to fit if need be
            if (tool.fills) fillEmpty(tool);
            boxes(tool, item);
            run();
            keep();
            box = form.querySelector('input');
            if (!quiet && box && focusBox(box)) box.select(); // the colour code has none, its ways all buttons
            item.scrollIntoView({ block: 'nearest' });
        }

        // the way of a choice kept, a number of its ways, else the one it has at first
        function chosen(f, kept) {
            var i = +kept;
            return kept !== '' && kept !== undefined && i === Math.floor(i) && i >= 0 && i < f.choice.length ? i : f.at || 0;
        }

        // The boxes of a tool, in columns, a head before each group of them, filled as they were typed.
        // A date has a button for its calendar, and is today while nothing is typed
        function boxes(tool, item) {
            closeCalendar();
            var kept = values[tool.id] || {}, cols = tool.cols || 1, html = '<div class="calc-sv-fields" style="--cols: ' + cols + '">';
            fieldsOf(tool, rawOf(tool)).map(shownField).forEach(function (f) {
                if (f.pick) { // a list to choose from, drawn as the converter's
                    html += '<div class="calc-sv-var' + (f.wide ? ' calc-sv-wide' : '') + '"><span class="calc-sv-sym">' + f.l + '</span><div class="calc-conv-pick calc-sv-pick" tabindex="0" role="combobox" ' +
                        'aria-haspopup="listbox" aria-expanded="false" aria-label="' + f.l + '" data-k="' + f.k + '"><span class="calc-conv-chosen"></span>' +
                        '<div class="calc-conv-menu" role="listbox" hidden></div></div></div>';
                    return;
                }
                if (f.choice) { // one of a few ways, a switch, as the options' tabs are, wrapped when long: its way at first (at), or the first,
                    // while none is chosen; of a choice that makes anew (renew), an arrow going round on each, as a click on it, the one chosen too, makes more
                    html += '<div class="calc-sv-var calc-sv-wide"><span class="calc-sv-sym">' + f.l + '</span><span class="calc-sv-choice calc-sv-toggle" role="radiogroup" aria-label="' +
                        f.l + '" data-k="' + f.k + '">' + f.choice.map(function (c, i) {
                            return '<span class="calc-sv-opt' + (chosen(f, kept[f.k]) === i ? ' calc-on' : '') + '" role="radio" tabindex="0" data-c="' + i + '">' + tr(c) + (f.renew ? AGAIN_ICON : '') + '</span>';
                        }).join('') + '</span></div>';
                    return;
                }
                if (f.area) { // numbers of a list, on lines of their own as well, as a column of a spreadsheet is pasted
                    html += '<label class="calc-sv-var calc-sv-wide calc-sv-areas"><span class="calc-sv-sym">' + f.l + '</span><textarea class="calc-sv-area" rows="3" spellcheck="false" ' +
                        'autocomplete="off" maxlength="20000" placeholder="' + tr(f.ph || '') + '" data-k="' + f.k + '" aria-label="' + f.l + '"></textarea></label>';
                    return;
                }
                if (f.head) { // a matrix: of more than 5 columns, smaller boxes, so up to 11 fit across the card
                    html += '</div><div class="calc-sv-head">' + f.head + '</div><div class="calc-sv-fields calc-sv-cells-in' + (f.cols > 5 ? ' calc-sv-many' : '') +
                        '" style="--cols: ' + f.cols + '">';
                    return;
                }
                html += '<label class="calc-sv-var' + (f.fn ? ' calc-sv-wide' : '') + (f.date ? ' calc-sv-wide calc-sv-dated' : '') + (f.cls ? ' ' + f.cls : '') + '">' + (f.l ? '<span class="calc-sv-sym">' + f.l + '</span>' : '') +
                    (f.date ? '<span class="calc-sv-date">' : '') +
                    '<input type="text"' + ((f.fn || f.text || f.date) && !f.num ? '' : ' data-num="1"') + ' spellcheck="false" autocomplete="off" maxlength="' + (f.fn ? 200 : 40) +
                    '" placeholder="' + (f.date ? tr('Today') : tr(f.ph || '')) + '" data-k="' + f.k + '" aria-label="' + (f.aria || (f.fn ? tr(tool.t) : f.l.replace(/<[^>]*>/g, ''))) + '">' +
                    (f.date ? '<span class="calc-sv-cal" title="' + tr('Calendar') + '">' + CALENDAR_ICON + '</span></span>' : '') + '</label>';
            });
            item.querySelector('.calc-sv-boxes').innerHTML = html + '</div>';
            [].forEach.call(item.querySelectorAll('.calc-sv-boxes input, .calc-sv-boxes textarea'), function (input) {
                input.value = typeof kept[input.dataset.k] === 'string' ? kept[input.dataset.k] : '';
                if (input.parentNode.classList.contains('calc-sv-date')) dateBoxOf(input);
            });
            nowBoxes(tool, item);
            [].forEach.call(item.querySelectorAll('.calc-sv-pick'), function (el) {
                var f = fieldsOf(tool, rawOf(tool)).filter(function (g) { return g.k === el.dataset.k; })[0];
                picker(el, function (i) {
                    values[tool.id] = values[tool.id] || {};
                    values[tool.id][f.k] = el.ids[i];
                    pickOf(el, f, el.ids[i]);
                    nowBoxes(tool, item);
                    run();
                    keep();
                });
                el.box = el; // chosen, the list keeps the focus
                pickOf(el, f, (values[tool.id] || {})[f.k]);
            });
            nameRoom(tool, item);
        }

        // The names of a card's first column as wide as the widest of any of its ways: switched to other boxes, the switch keeps its width.
        // A name in em, as the panel popped out is larger
        function nameRoom(tool, item) {
            var grid = item.querySelector('.calc-sv-boxes > .calc-sv-fields:not(.calc-sv-cells-in)'), cols = tool.cols || 1, names = {}, seen = {}, ways = [rawOf(tool)], queued = {}, done = 0, w, probe, most = 0;
            if (!grid || typeof tool.fields !== 'function') return;
            // each way, of every choice with each of the others, as a choice may bring another; up to 500 of them. Each way
            // queued once: of the colour code's bands, thousands, each with its swatches, as the panel opens
            queued[JSON.stringify(ways[0])] = true;
            for (w = 0; w < ways.length && done < 500; w++) {
                var raw = ways[w], col = 0, fields = fieldsOf(tool, raw), at = fields.filter(function (g) { return g.choice; }).map(function (g) { return g.k + '=' + (raw[g.k] || 0); }).join();
                if (seen[at]) continue;
                seen[at] = true;
                done++;
                fields.every(function (g) { // laid out as the grid lays them: a wide one on a line of its own
                    var whole = g.choice || g.area || g.fn || g.date || g.pick && g.wide || /calc-sv-wide/.test(g.cls || '');
                    if (g.head) return false;
                    if (whole) col = 0;
                    if (g.l && !col) names[g.l] = true;
                    col = whole ? 0 : (col + 1) % cols;
                    return true;
                });
                fields.forEach(function (f) {
                    (f.choice || []).forEach(function (c, i) {
                        var r = Object.assign({}, raw), key;
                        r[f.k] = String(i);
                        key = JSON.stringify(r);
                        if (queued[key]) return;
                        queued[key] = true;
                        ways.push(r);
                    });
                });
            }
            probe = document.createElement('span');
            probe.className = 'calc-sv-sym';
            probe.style.cssText = 'position: absolute; visibility: hidden; white-space: nowrap; width: max-content; min-width: 0';
            grid.appendChild(probe);
            Object.keys(names).forEach(function (l) {
                probe.innerHTML = tr(l);
                most = Math.max(most, probe.offsetWidth + 1); // a pixel over, as offsetWidth is rounded
            });
            most /= parseFloat(getComputedStyle(probe).fontSize) || 1;
            grid.removeChild(probe);
            [].forEach.call(grid.querySelectorAll(':scope > .calc-sv-var > .calc-sv-toggle'), function (t) {
                t.previousElementSibling.style.boxSizing = 'border-box';
                t.previousElementSibling.style.minWidth = most ? most + 'em' : '';
            });
        }

        // a list's places, the one kept chosen, else the one it has at first
        function pickOf(el, f, kept) {
            var list = f.pick(), at = list.map(function (c) { return c[0]; }).indexOf(kept);
            if (at < 0) at = Math.max(0, list.map(function (c) { return c[0]; }).indexOf(f.at));
            el.ids = list.map(function (c) { return c[0]; });
            setPicker(el, list.map(function (c) { return tr(c[1]); }), at);
        }

        // a box of now, while nothing is typed in it, shows it, to type over
        function nowBoxes(tool, item) {
            var raw = rawOf(tool);
            fieldsOf(tool, raw).forEach(function (f) {
                var input = f.now && !raw[f.k] && item.querySelector('.calc-sv-boxes input[data-k="' + f.k + '"]');
                if (input) input.value = f.now(raw);
            });
        }

        // The results of a card laid out, each row of them full (fillRows); then a number still too long made smaller,
        // as on the display, a little: to 13px, a matrix's to 12, of more than 5 columns kept at 10px; a table all one
        // size, as small as its longest number of each column needs
        function fitTiles(item) {
            var grid = item.querySelector('.calc-sv-grid'); // the results', not what to pick from, which fillRows lays out alone
            fillRows(grid);
            [].forEach.call(grid.querySelectorAll('.calc-sv-cell'), function (cell) { cell.style.fontSize = ''; });
            [].forEach.call(grid.querySelectorAll(':scope > .calc-sv-tile > .calc-sv-value, .calc-sv-tile:not(.calc-sv-table) .calc-sv-cell'), function (shown) {
                var value = !shown.classList.contains('calc-sv-cell'), size = value ? 17 : shown.parentNode.classList.contains('calc-sv-many') ? 10 : 15;
                while (size > (value ? 13 : 12) && tooWide(shown)) shown.style.fontSize = --size + 'px';
            });
            [].forEach.call(grid.querySelectorAll('.calc-sv-table .calc-sv-cells'), function (table) {
                var cells = [].slice.call(table.querySelectorAll('.calc-sv-cell')), longest = {}, size = 12;
                cells.forEach(function (cell) {
                    var b = cell.dataset.b;
                    if (!longest[b] || cell.textContent.length > longest[b].textContent.length) longest[b] = cell;
                });
                longest = Object.keys(longest).map(function (b) { return longest[b]; });
                while (size > 11 && longest.some(tooWide)) {
                    size--;
                    longest.forEach(function (cell) { cell.style.fontSize = size + 'px'; });
                }
                if (size < 12) cells.forEach(function (cell) { cell.style.fontSize = size + 'px'; });
            });
        }

        // popped out or in, or the window narrower: a card's results laid out again for their new width
        var widths = window.ResizeObserver && new ResizeObserver(function (seen) {
            seen.forEach(function (e) {
                var grid = e.target, item = grid.closest('.calc-sv-item');
                if (!grid.offsetWidth || grid.clientWidth === grid.fitW) return;
                if (grid.parentNode.classList.contains('calc-sv-pickfrom')) fillRows(grid);
                else if (item) fitTiles(item);
            });
        });

        function watchWidth(item) {
            if (widths) [].forEach.call(item.querySelectorAll('.calc-sv-grid'), function (grid) { widths.observe(grid); }); // once each: observed again, nothing new
        }

        // What the open tool gives from its boxes now: each number read, or its default while
        // empty, a box that is not one marked and named in the note; then its tiles, and its note
        function run() {
            var item = list.querySelector('.calc-sv-item.calc-on'), tool, raw, n = {}, out, inputs, fields, bad = [], mine, note, boxes, grid;
            if (!item) return;
            tool = tools[tab][+item.dataset.i];
            raw = rawOf(tool);
            fields = fieldsOf(tool, raw);
            inputs = [].slice.call(item.querySelectorAll('.calc-sv-boxes input, .calc-sv-boxes textarea'));
            fields.forEach(function (f) {
                var text = raw[f.k] || '', v, box = inputs.filter(function (b) { return b.dataset.k === f.k; })[0];
                if (f.head) return;
                raw[f.k] = text;
                if (f.choice) { // the way chosen; of numbers, as 8 | 16 | 32 | 64, its number too
                    raw[f.k] = String(chosen(f, text));
                    n[f.k] = +f.choice[raw[f.k]];
                    return;
                }
                if (f.fn || f.text || f.date || f.area || f.pick) return;
                v = text ? CalcMaths.number(text, engine.comma, deg, f.inf) : f.def !== undefined ? f.def : NaN;
                if (box) box.classList.toggle('calc-bad', !!text && isNaN(v));
                if (box && text && isNaN(v)) bad.push(tr(f.name || f.aria || (f.l || '').replace(/<[^>]*>/g, ''))); // name: for a label that does not read in a note
                n[f.k] = v;
            });
            out = tool.run(n, raw);
            mine = function (f) { return !f.head && !f.choice && !f.pick && raw[f.k] && !(tool.fills && raw[f.k] === fillText(f)); }; // typed, not chosen nor filled in
            item.querySelector('.calc-sv-reset').hidden = !fields.some(mine); // Reset once something is typed
            if (item.querySelector('.calc-sv-example')) { // Example while the boxes are empty: it would type over what is in them; of a way with none, not
                item.querySelector('.calc-sv-example').hidden = fields.some(mine) || (typeof tool.example === 'function' && !tool.example(raw));
            }
            if (out.warn && !(out.bad || []).length && !fields.some(function (f) { return !f.head && !f.choice && !f.shape && raw[f.k]; })) {
                out.warn = false; // nothing typed yet, only the boxes' defaults, as a matrix of 0s: no error until something is
                out.note = '';
            }
            if (bad.length) { // what is wrong first: the box, or boxes, that are not numbers
                out.note = bad.length > 2 ? tr('{n} boxes are not numbers.', { n: bad.length }) :
                    bad.length === 2 ? tr('{a} and {b} are not numbers.', { a: bad[0], b: bad[1] }) : tr('{a} is not a number.', { a: bad[0] });
                out.warn = true;
            }
            inputs.forEach(function (box) {
                if (fields.some(function (f) { return f.k === box.dataset.k && (f.fn || f.text || f.date || f.area); })) box.classList.toggle('calc-bad', (out.bad || []).indexOf(box.dataset.k) > -1);
            });
            // a drawing first, above the numbers it draws, of every card; last, below its numbers, of a card whose drawing is only
            // its curve over time or a length, as of Radioactive decay, and of the IP subnet, Spring, Pendulum and spring (drawnLast),
            // and of every card of finance and of the solver, all its tabs
            out.rows = tool.drawnLast || key === 'solve' ? out.rows.filter(function (r) { return !drawnRow(r); }).concat(out.rows.filter(drawnRow)) :
                out.rows.filter(drawnRow).concat(out.rows.filter(function (r) { return !drawnRow(r); }));
            // nothing typed or picked in its boxes yet: no results that have no value, only what it shows of itself, as a
            // worksheet of the ways chosen
            if (tool.waits && !fields.some(mine)) out.rows = out.rows.filter(function (r) { return r.flip; }); // what its empty boxes stand for is no result; bits to click are kept, as a box is
            if (!fields.some(mine)) out.rows = out.rows.filter(function (r) {
                return r.flip || (r.text !== undefined ? !/^–?$/.test(String(r.text).replace(/<[^>]*>/g, '').trim()) || /<svg/.test(r.text) : !!r.m || r.html !== undefined || isFinite(r.v));
            });
            rows = out.rows;
            item.querySelector('.calc-sv-results').hidden = !out.rows.length;
            if (tool.again) { // Again only once there is a result to draw again: not of empty boxes, nor of boxes that are wrong
                item.querySelector('.calc-sv-again:not(.calc-sv-example)').hidden = !out.rows.some(function (r) {
                    return r.flip || r.text !== undefined || !!r.m || r.html !== undefined || isFinite(r.v);
                });
            }
            grid = item.querySelector('.calc-sv-grid');
            grid.base = out.cols ? 'repeat(' + out.cols + ', 1fr)' : ''; // two, for an x and a y side by side
            grid.innerHTML = out.rows.map(tile).join('');
            [].forEach.call(item.querySelectorAll('.calc-sv-tile'), function (el) {
                el.row = out.rows[+el.dataset.r]; // for its tip
            });
            rtlDraw(grid);
            fitTiles(item);
            // what to pick from, as the ions or the solubility table, in a section of its own under the results: its own
            // heading, a click on one typing it in the box (data-fill); no row of the results, so no tip of one, nor put in
            item.querySelector('.calc-sv-pickfrom').hidden = !out.pick;
            if (widths && item.querySelector('.calc-sv-pickfrom .calc-sv-grid')) widths.unobserve(item.querySelector('.calc-sv-pickfrom .calc-sv-grid')); // made anew
            item.querySelector('.calc-sv-pickfrom').innerHTML = !out.pick ? '' : '<div class="calc-sv-results">' + tr(out.pick.t) + '</div><div class="calc-sv-grid"' +
                (out.pick.cols ? ' style="grid-template-columns: repeat(' + out.pick.cols + ', 1fr)"' : '') + '>' + out.pick.rows.map(function (r) {
                    return '<div class="calc-sv-tile' + (r.small ? '' : ' calc-sv-wide') + (drawnRow(r) ? ' calc-sv-drawn' : '') + '"><span class="calc-sv-label">' + tr(r.l) + '</span><span class="calc-sv-value">' + shownText(r) + '</span></div>';
                }).join('') + '</div>';
            rtlDraw(item.querySelector('.calc-sv-pickfrom'));
            fillRows(item.querySelector('.calc-sv-pickfrom .calc-sv-grid'));
            watchWidth(item);
            note = item.querySelector('.calc-sv-note');
            note.textContent = pasted || tr(out.note) || '';
            if (CalcLang.rtl) ltrRuns(note); // its maths left to right in the Arabic: x^5 - 3x + 1, not 1 + 3x - x^5
            note.classList.toggle('calc-sv-warn', !!(pasted || out.warn));
            boxes = item.querySelector('.calc-sv-boxes');
            boxes.parentNode.insertBefore(note, pasted || out.warn ? boxes : boxes.nextSibling); // an error at the top, over the boxes; a note under them
            pasted = ''; // what a matrix pasted that did not fit says, until a box is typed in
        }

        // A result: a number to put in, a text to read, as a complex number, or a matrix, each of
        // its numbers to put in; – while it has none
        function tile(r, i) {
            var known = r.text === undefined && (r.m ? !!r.m : isFinite(r.v)), shown, bits, b, many;
            if (r.flip) { // a row of up to 16 bits for each, the highest first, each to turn over
                bits = BigInt.asUintN(r.flip.n, r.flip.v).toString(2).padStart(r.flip.n, '0');
                shown = '<span class="calc-sv-bitgrid">';
                for (b = r.flip.n - 1; b >= 0; b--) {
                    if (b % 16 === 15 || b === r.flip.n - 1) shown += (b < r.flip.n - 1 ? '</span>' : '') + '<span class="calc-sv-bitrow"><span class="calc-sv-bitat">' + b + '</span>';
                    shown += '<span class="calc-sv-bit' + (bits.charAt(r.flip.n - 1 - b) === '1' ? ' calc-on' : '') + (b % 4 === 3 && b % 16 !== 15 && b !== r.flip.n - 1 ? ' calc-sv-nib' : '') +
                        '" data-b="' + b + '" title="' + tr('Bit {b}', { b: b }) + '">' + bits.charAt(r.flip.n - 1 - b) + '</span>';
                }
                shown += '</span></span>';
                return '<div class="calc-sv-tile calc-sv-wide calc-sv-flip" data-r="' + i + '"><span class="calc-sv-label">' + tr(r.l) + '</span>' + shown + '</div>';
            }
            if (r.m !== undefined) { // of more than 5 columns, smaller, to fit the tile; a table under its heads, scrolling down
                many = r.m && r.m[0].length > 5;
                shown = r.m ? '<span class="calc-sv-cells' + (many ? ' calc-sv-many' : '') + '" style="--cols: ' + r.m[0].length + '">' + (r.head || []).map(function (h) {
                    return '<span class="calc-sv-th">' + tr(h) + '</span>';
                }).join('') + r.m.map(function (row, a) {
                    return row.map(function (x, b) { // to 10 digits, so a row of them fits, of more than 5 columns to as many characters as its cell has room for; or to its places, as money to the cent, but a table's first column, its years; its tip has it whole, and its Insert puts it in so. On a touch screen, with no tip, the whole number of a cell cut short in its title, where a pointer shows it
                        return '<span class="calc-sv-cell" data-a="' + a + '" data-b="' + b + '"' + (many && touchScreen() && typeof x === 'number' ? ' title="' + local(String(x)) + '"' : '') + '>' +
                            (typeof x === 'string' ? x : (r.places !== undefined && !(r.head && !b) ? placesValue(x, r.places) : statsValue(many ? fitted(x, r.m[0].length > 8 ? 5 : 7) : +x.toPrecision(10))).html) + // a text, as X of a truth table
                            '</span>';
                    }).join('');
                }).join('') + '</span>' : '<span class="calc-sv-value">–</span>';
            } else {
                shown = '<span class="calc-sv-value">' + (r.text !== undefined ? shownText(r) : !known ? '–' : r.html !== undefined ? r.html : // html: shown its own way, as a value of the converter
                    (r.places !== undefined ? placesValue(r.v, r.places) : statsValue(r.dp !== undefined ? shortValue(r.v, r.dp, 0) : r.sig ? shortValue(r.v, 0, r.sig) : r.v)).html) + '</span>'; // dp: to so many places, sig: digits, as a ratio; never 0 for what is not, nor a whole part cut
            }
            return '<div class="calc-sv-tile' + (r.m !== undefined || r.wide ? ' calc-sv-wide' : '') + (r.m ? ' calc-sv-matrix' : r.copy ? ' calc-sv-copies' : '') + (r.bits ? ' calc-sv-bits' : '') + (r.wrap ? ' calc-sv-wrap' : '') +
                (drawnRow(r) ? ' calc-sv-drawn' : '') +
                (r.head ? ' calc-sv-table' : '') + (known && !r.m ? '' : ' calc-none') + '" data-r="' + i + '"><span class="calc-sv-label">' + tr(r.l) +
                (r.m ? r.head ? '<span class="calc-sv-copy" role="button">' + tr('Copy table') + '</span>' : '</span><span class="calc-sv-copy calc-sv-copy-m" role="button">' + tr('Copy') :
                    r.copy ? '</span><span class="calc-sv-copy calc-sv-copy-m calc-sv-copy-t" role="button">' + tr('Copy') : '') + '</span>' + shown + '</div>';
        }

        // A box as it is shown, in the language in use: its name, what it stands for in a note and its heading, not the
        // example in it, of maths; a copy, as the tool's own is read in English
        function shownField(f) {
            var g = Object.assign({}, f);
            ['l', 'name', 'aria', 'head'].forEach(function (k) {
                if (typeof g[k] === 'string') g[k] = tr(g[k]);
            });
            return g;
        }

        // the text of a result in the language in use where it is words, as Yes, Not prime or Active: it amplifies; a number,
        // maths or a drawing as it is
        function shownText(r) {
            return typeof r.text === 'string' && /^[A-Z][a-z]+(?:[ ,:]|$)/.test(r.text) && !/<svg/.test(r.text) ? tr(r.text) : r.text;
        }

        // x to as many digits as fit in room characters, as few as one: 0.093, not 0.0928 cut off
        function fitted(x, room) {
            var d = 10;
            while (d > 1 && String(+x.toPrecision(d)).length > room) d--;
            return +x.toPrecision(d);
        }

        // the tab, the tool open and what is typed in each, for the next time
        function keep() {
            store(key, { tab: tab, open: openId, v: values });
        }

        // nothing typed in any tool, the first tab, and no card open
        function clear() {
            values = {};
            tab = Object.keys(tools)[0];
            openId = '';
            if (now.open()) render();
            keep();
        }

        // the tab a tool is on, by its id; undefined with no such tool
        function tabOf(id) {
            return Object.keys(tools).filter(function (k) {
                return tools[k].some(function (tool) { return tool.id === id; });
            })[0];
        }

        function load(saved) {
            if (!saved || typeof saved !== 'object') return;
            if (tools.hasOwnProperty(saved.tab)) tab = saved.tab;
            if (typeof saved.open === 'string') openId = saved.open;
            if (saved.v && typeof saved.v === 'object') values = saved.v;
        }

        // a card opens its boxes, or closes them; Again draws more random numbers and UUIDs; Example types its example; a tile, or a
        // number of a matrix, is put in
        list.addEventListener('click', function (e) {
            var row = e.target.closest('.calc-sv-row'), t = e.target.closest('.calc-sv-tile'), cell = e.target.closest('.calc-sv-cell'), bit = e.target.closest('.calc-sv-bit'), r, v;
            if (e.target.closest('.calc-f-copy')) return copyFormula(e.target.closest('.calc-f-copy')); // the card stays open
            if (row && now.side && now.side() && row.parentNode.classList.contains('calc-on')) return; // beside the list it stays open
            if (row) return openTool(row.parentNode.classList.contains('calc-on') ? null : row.parentNode);
            if (e.target.closest('.calc-sv-example')) return example(e.target.closest('.calc-sv-item'));
            if (e.target.closest('.calc-sv-reset')) return reset(e.target.closest('.calc-sv-item'));
            if (e.target.closest('[data-fill]')) return fillFrom(e.target.closest('[data-fill]'));
            if (e.target.closest('.calc-sv-again')) {
                svAgain = true;
                run();
                svAgain = false;
                return;
            }
            if (e.target.closest('.calc-sv-opt')) return choose(e.target.closest('.calc-sv-opt'));
            r = t && rows[+t.dataset.r];
            if (e.target.closest('.calc-sv-copy') && r && (r.m || r.copy)) return copied(e.target.closest('.calc-sv-copy'), r.m ? tableText(r) : r.copy);
            if (bit && r && r.flip) return flip(t, r.flip, +bit.dataset.b);
            if (r && !mayPut()) return; // a result goes in by Insert of its tip, a number of a matrix by its own
            v = !r ? NaN : r.m ? (cell ? r.m[+cell.dataset.a][+cell.dataset.b] : NaN) : r.text === undefined ? r.v : NaN;
            if (!isFinite(v) || !engine.put(v)) return;
            keyBoard['AC'].children[0].firstChild.data = 'C';
            now.done();
            refresh();
            saveState();
        }, false);

        // fills: what a card's empty boxes stand for typed in them as it opens, so what it gives is of what is in its
        // boxes, never of a box that only looks empty: today in a date, a box's default, a number its placeholder is
        function fillEmpty(tool) {
            var kept = values[tool.id] = values[tool.id] || {};
            fieldsOf(tool, rawOf(tool)).forEach(function (f) {
                var text = fillText(f);
                if (text !== null && !(typeof kept[f.k] === 'string' && kept[f.k] !== '')) kept[f.k] = text;
            });
        }

        // what fills a box of a card of fills, or null; a box that has it still is not typed in, for Example and Reset
        function fillText(f) {
            var d = new Date(), pad = function (x) { return (x < 10 ? '0' : '') + x; };
            if (f.head || f.choice || f.pick) return null;
            return f.date ? d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) : f.def !== undefined ? local(String(f.def)) :
                f.num && /^-?\d+(\.\d+)?$/.test(f.ph || '') ? local(f.ph) : null;
        }

        // every box of a card emptied, at the top of it: its ways chosen and its lists stay as they are
        function reset(item) {
            var tool = tools[tab][+item.dataset.i], kept = values[tool.id] || {};
            fieldsOf(tool, rawOf(tool)).forEach(function (f) {
                if (!f.head && !f.choice && !f.pick) delete kept[f.k];
            });
            Object.keys(kept).forEach(function (k) {
                if (k.charAt(0) === '@') delete kept[k]; // what was typed in the other ways of the card
            });
            if (tool.fills) fillEmpty(tool); // back to what it opened with
            boxes(tool, item);
            run();
            keep();
            item.querySelector('.calc-sv-boxes input, .calc-sv-boxes textarea') && focusBox(item.querySelector('.calc-sv-boxes input, .calc-sv-boxes textarea'));
        }

        // a part of a drawing clicked, as a codon of the wheel: what it stands for typed in its box, data-fill, and the results. Of
        // several boxes, their keys and values each split by a space, as a choice and its box together; of one, its value whole, spaces
        // and all, as Hydrogen carbonate. Numbers (data-num) with the decimal mark in use; a way chosen as choose() chooses it, what
        // was typed in the way it leaves kept for that way
        function fillFrom(el) {
            var item = el.closest('.calc-sv-item'), tool = tools[tab][+item.dataset.i], keys = el.dataset.fill.split(' '),
                v = keys.length > 1 ? el.dataset.v.split(' ') : [el.dataset.v], kept;
            kept = values[tool.id] = values[tool.id] || {};
            keys.forEach(function (k, i) {
                if (fieldsOf(tool, rawOf(tool)).some(function (g) { return g.k === k && g.choice; })) switchWay(tool, k, v[i]);
                kept[k] = el.hasAttribute('data-num') ? local(v[i]) : v[i];
            });
            boxes(tool, item);
            run();
            keep();
        }

        // a card's example in its boxes, in place of what was typed, with the decimal mark in use
        function example(item) {
            var tool = tools[tab][+item.dataset.i];
            var ex = typeof tool.example === 'function' ? tool.example(rawOf(tool)) : tool.example; // of a card of ways, the way chosen's
            values[tool.id] = {};
            Object.keys(ex).forEach(function (k) { values[tool.id][k] = local(ex[k]); });
            if (tool.fills) fillEmpty(tool); // a box the example leaves empty as it opens
            boxes(tool, item);
            run();
            keep();
        }

        // a choice k of a card set to its way c, of boxes of each way of their own: what was typed in the way it leaves kept for
        // that way, and what was typed in c's back. The choice itself is set by whoever calls it
        function switchWay(tool, k, c) {
            var kept = values[tool.id] = values[tool.id] || {}, f, was, now;
            if (typeof tool.fields !== 'function') return;
            f = fieldsOf(tool, rawOf(tool));
            was = chosen(f.filter(function (g) { return g.k === k; })[0], kept[k]);
            now = rawOf(tool);
            now[k] = c;
            now = fieldsOf(tool, now).map(function (g) { return g.k + ':' + g.l; }).join();
            if (String(was) === c || now === f.map(function (g) { return g.k + ':' + g.l; }).join()) return; // the same boxes, as a matrix's
            kept['@' + k + was] = {};
            f.forEach(function (g) {
                if (g.k === k || g.head || kept[g.k] === undefined) return;
                kept['@' + k + was][g.k] = kept[g.k];
                delete kept[g.k];
            });
            Object.keys(kept['@' + k + c] || {}).forEach(function (g) { kept[g] = kept['@' + k + c][g]; });
        }

        // one of the ways of a choice chosen: kept as a box's text is, and the results
        function choose(opt) {
            var item = opt.closest('.calc-sv-item'), tool = tools[tab][+item.dataset.i], k = opt.parentNode.dataset.k, again, kept;
            switchWay(tool, k, opt.dataset.c);
            kept = values[tool.id];
            kept[k] = opt.dataset.c;
            [].forEach.call(opt.parentNode.children, function (o) { o.classList.toggle('calc-on', o === opt); });
            if (typeof tool.fields === 'function') { // boxes of the way chosen, as Unix time has: drawn again, the button keeping the focus
                boxes(tool, item);
                again = item.querySelector('.calc-sv-choice[data-k="' + k + '"] .calc-sv-opt[data-c="' + opt.dataset.c + '"]');
                if (again && !item.contains(document.activeElement)) again.focus();
            }
            run();
            keep();
        }

        // A table of results as a spreadsheet takes it pasted: its heads, then a line of each row,
        // a tab between each number, all its digits, with the decimal mark in use. A matrix the
        // same, without heads, which a matrix's box takes pasted as well
        function tableText(r) {
            return (r.head ? [r.head.join('\t')] : []).concat(r.m.map(function (row) {
                return row.map(function (x) { return local(String(x)); }).join('\t');
            })).join('\n') + '\n';
        }

        // a bit turned over: its number written in its box again, and the results
        function flip(t, f, b) {
            var item = t.closest('.calc-sv-item'), tool = tools[tab][+item.dataset.i], text = f.set(b), box = item.querySelector('.calc-sv-boxes input[data-k="' + f.k + '"]');
            values[tool.id] = values[tool.id] || {};
            values[tool.id][f.k] = text;
            if (box) box.value = text;
            run();
            keep();
        }

        // a box typed in: the results again; a size typed, the boxes of its matrix first, the
        // box typed in keeping the focus
        list.addEventListener('input', function (e) {
            var item = e.target.closest('.calc-sv-item'), tool = item && tools[tab][+item.dataset.i], k = e.target.dataset.k, at, input, field;
            if (!tool || (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) return;
            field = fieldsOf(tool, rawOf(tool)).filter(function (f) { return f.k === k; })[0] || {};
            if (plain && field.shape) onlySize(e.target);
            else if (field.num) onlyNumber(e.target, true); // a number, a letter, or degrees, minutes and seconds, read by the tool
            else if (plain && !field.fn && !field.text && !field.date) onlyNumber(e.target);
            values[tool.id] = values[tool.id] || {};
            values[tool.id][k] = e.target.value;
            if (field.shape) {
                at = e.target.selectionStart;
                boxes(tool, item);
                input = item.querySelector('.calc-sv-boxes input[data-k="' + k + '"]');
                input.focus();
                input.setSelectionRange(at, at);
            }
            run();
            keep();
        }, false);

        // A matrix pasted in a box of one, of more than one number: a block of a spreadsheet, lines
        // of numbers or [1 2; 3 4]. It fills the boxes from that one, right and down, the matrix
        // made bigger where it needs to be, up to 10×10; of A | b its last column is b, and in b
        // only a column goes. A number of the plain kind a box keeps goes in as it is, another as
        // its value. One number alone, or what is not a matrix, is pasted in the box as ever
        list.addEventListener('paste', function (e) {
            var item = e.target.closest('.calc-sv-item'), tool = item && tools[tab][+item.dataset.i], k = e.target.dataset.k, field, got, c, rows, cols, ab, kept, input,
                plainNumber = engine.comma ? /^-?\d*,?\d*$/ : /^-?\d*\.?\d*$/;
            if (!tool || e.target.tagName !== 'INPUT') return;
            field = fieldsOf(tool, rawOf(tool)).filter(function (f) { return f.k === k; })[0];
            got = field && field.cell && CalcMaths.matrixText(e.clipboardData.getData('text'), engine.comma, deg);
            if (!got) return;
            e.preventDefault();
            c = field.cell;
            ab = c.g === 'ab' ? 1 : 0; // of A | b, one column more than A has
            rows = Math.max(c.n[0], c.i - 1 + got.cells.length);
            cols = Math.max(c.n[1] + ab, c.j - 1 + got.cells[0].length) - ab;
            if (ab && c.j > c.n[1] && got.cells[0].length > 1) {
                pasted = 'b is one column: paste a column of numbers in it, or all of A | b in its first box.';
            } else if (rows > 10 || cols > 10) {
                pasted = got.cells.length > 10 || got.cells[0].length > 10 + ab ? 'A matrix of up to 10×10: this one is ' + got.cells.length + '×' + got.cells[0].length + '.' :
                    tr('Up to 10×10: from row {i}, column {j} this one of {cells}×{cells2} does not fit.', { i: c.i, j: c.j, cells: got.cells.length, cells2: got.cells[0].length });
            } else {
                kept = values[tool.id] = values[tool.id] || {};
                got.cells.forEach(function (row, a) {
                    row.forEach(function (text, b) {
                        var i = c.i + a, j = c.j + b;
                        kept[ab ? (j > cols ? 'b' + i + '1' : 'a' + i + j) : c.g + i + j] = plainNumber.test(text) ? text : local(String(got.values[a][b]));
                    });
                });
                if (rows !== c.n[0] || cols !== c.n[1]) kept[c.s] = rows + '×' + cols;
                boxes(tool, item);
            }
            input = item.querySelector('.calc-sv-boxes input[data-k="' + k + '"]');
            if (input) input.focus();
            run();
            keep();
        }, false);

        list.addEventListener('scroll', closeCalendar, false); // the calendar would be left where its box was

        // Enter goes on to the next box; in a box of lines it is a new line. Enter or Space chooses a way of a choice
        list.addEventListener('keydown', function (e) {
            var inputs, at;
            if ((e.which === 13 || e.which === 32) && e.target.classList.contains('calc-sv-opt')) {
                e.preventDefault();
                return choose(e.target);
            }
            if (e.which !== 13 || e.target.tagName !== 'INPUT') return;
            e.preventDefault();
            inputs = [].slice.call(e.target.closest('.calc-sv-form').querySelectorAll('input'));
            at = inputs.indexOf(e.target);
            if (at < inputs.length - 1) inputs[at + 1].focus();
        }, false);

        return {
            render: render,
            load: load,
            clear: clear,
            keep: keep,
            fit: fitPills, // the badges fitted again, once something else has put others in
            tab: function () { return tab; },
            setTab: function (t) {
                tab = t;
                render();
                keep();
            },
            // a tool's card, on its tab, to open with these in its boxes, as { eq: 'x^2 = 4' }: it opens as the panel renders.
            // False with no such tool
            put: function (id, kept) {
                var t;
                if (!tabOf(id)) return false;
                values[id] = {};
                for (t in kept) values[id][t] = String(kept[t]);
                tab = tabOf(id);
                openId = id;
                keep();
                return true;
            },
            // a tool's card, on its tab, to open with what was typed in it kept, as the search finds it. False with no such tool
            go: function (id) {
                if (!tabOf(id)) return false;
                tab = tabOf(id);
                openId = id;
                keep();
                return true;
            },
            // the first box of the card open, to type in. False with none open
            focus: function () {
                var box = list.querySelector('.calc-sv-item.calc-on input');
                if (box && focusBox(box)) box.select();
                return !!box;
            },
            // a box of a tool, by its id, the card open's without one, as typed in it, to show as the panel renders.
            // False with no card open
            fill: function (k, text, id) {
                id = id || openId;
                if (!id) return false;
                values[id] = values[id] || {};
                values[id][k] = text;
                keep();
                return true;
            },
            run: run, // the results of the card open again
            // the tip of a card, open or not: what it gives, and what a click does; beside the list the one open stays
            // open, so only what it gives. Of a way of a choice, of Copy table, of Copy and of Example, what they do
            tip: function (el) {
                var tool, open, key, field;
                if (el.classList.contains('calc-sv-opt')) return CalcTips['choice ' + el.parentNode.dataset.k + ' ' + el.dataset.c] || null;
                if (el.classList.contains('calc-sv-example')) return CalcTips['card example'];
                if (el.classList.contains('calc-sv-reset')) return CalcTips['card reset'];
                if (el.classList.contains('calc-f-copy')) return CalcTips['formula copy'];
                if (el.classList.contains('calc-sv-copy')) return CalcTips[el.classList.contains('calc-sv-copy-t') ? 'text copy' : el.classList.contains('calc-sv-copy-m') ? 'matrix copy' : 'table copy'];
                if (el.closest('.calc-sv-boxes') && el.closest('.calc-sv-item')) { // a box, or its name: what goes in it, where its field says
                    key = el.dataset.k || (el.parentNode.querySelector('[data-k]') || { dataset: {} }).dataset.k;
                    tool = tools[tab][+el.closest('.calc-sv-item').dataset.i];
                    field = fieldsOf(tool, rawOf(tool)).filter(function (g) { return g.k === key && g.tip; })[0];
                    return field ? { t: (field.aria || field.l).replace(/<[^>]*>/g, ''), d: field.tip, k: '' } : null;
                }
                if (!el.classList.contains('calc-sv-row')) return null;
                tool = tools[tab][+el.parentNode.dataset.i];
                open = el.parentNode.classList.contains('calc-on');
                return { t: tool.t, d: tr(tool.d) + (open && now.side && now.side() ? '' : open ? tr(' Click to close it.') : tr(' Click to open it.')), k: '' };
            }
        };
    }

    // A panel of cards on tabs, over the keys, as the solver and the numbers are: its button opens it.
    // tip: the name of the tip of its button and its close
    // { show(open), load(saved), clear(), tip(el), open() }
    function toolPanel(panel, button, tools, key, tip, plain) {
        var cards = toolCards(panel.querySelector('.calc-sv-list'), tools, key, plain, {
            open: function () { return panel.classList.contains('calc-open'); },
            done: function () { show(false); },
            side: function () { return bigSide(panel); }
        });

        function tabs() {
            [].forEach.call(panel.querySelectorAll('.calc-solve-tab'), function (t) {
                t.classList.toggle('calc-on', t.dataset.tab === cards.tab());
            });
        }

        function show(open) {
            if (!open && bigShut(panel)) return;
            if (open) {
                closePanels(panel);
                placePanel(panel);
                tabs();
                cards.render();
            }
            panel.classList.toggle('calc-open', open);
            button.classList.toggle('calc-on', open);
            if (open) {
                cards.focus();
            } else if (panel.contains(document.activeElement)) {
                document.activeElement.blur(); // the keys are the calculator's again
            }
        }

        button.addEventListener('click', function () {
            show(!panel.classList.contains('calc-open'));
        }, false);

        panel.querySelector('.calc-past-close').addEventListener('click', function () {
            show(false);
        }, false);

        panel.querySelector('.calc-solve-tabs').addEventListener('click', function (e) {
            var t = e.target.closest('.calc-solve-tab');
            if (!t) return;
            cards.setTab(t.dataset.tab);
            tabs();
        }, false);

        return {
            show: show,
            load: cards.load,
            render: function () {
                tabs();
                cards.render();
            },
            // the panel opens on a tool's card, with these in its boxes, and what they give
            put: function (id, kept) {
                if (!cards.put(id, kept)) return;
                if (!panel.classList.contains('calc-open')) return show(true);
                tabs();
                cards.render();
                cards.focus();
            },
            // the panel on a tool's card, open with what was typed in it, as the search finds it; or on a tab
            go: function (id) {
                if (!cards.go(id)) return;
                if (!panel.classList.contains('calc-open')) return show(true);
                tabs();
                cards.render();
                cards.focus();
            },
            setTab: function (t) {
                cards.setTab(t);
                tabs();
            },
            clear: function () {
                cards.clear();
                tabs();
            },
            open: function () { return panel.classList.contains('calc-open'); },
            tip: function (el) {
                if (el.classList.contains('calc-solve-tab')) return CalcTips[tip + ' tab ' + el.dataset.tab] || null;
                return el.classList.contains('calc-past-close') ? CalcTips[tip + ' close'] : cards.tip(el);
            }
        };
    }

    var solver = toolPanel(solvePanel, solveButton, solvePart.SOLVE_TOOLS, 'solve', 'solve'),
        numbers = toolPanel(numbersPanel, numbersButton, numPart.NUMBER_TOOLS, 'numbers', 'numbers', true),
        toolPanels = [solver, numbers];

    function showSolve(open) {
        solver.show(open);
    }

    function showNumbers(open) {
        numbers.show(open);
    }

    // ---------------- tests of hypotheses ---------------- //

    // The statistics' Tests tab: a card for each test, as a TI-84's STAT TESTS has them, of numbers typed or pasted
    // in a box, a column of a spreadsheet as well, or of a sample's mean, deviation and size. Each gives its statistic,
    // its p-value and whether that is below the significance α, so H₀ is rejected; and the interval of what it tests
    var HA = { k: 'ha', l: 'H<sub>a</sub>', choice: ['≠', '<', '>'] }, // where the alternative is: two tails, below, above
        ALPHA = { k: 'alpha', l: 'α', ph: '0.05', def: 0.05, name: 'α' },
        DATA_OR = { k: 'input', l: 'From', choice: ['Data', 'Summary'] },
        TEST_TOOLS = {
            tests: [
                { id: 'ttest', t: 't-test', f: 't = (x̄ – μ<sub>0</sub>) ÷ (s/√n)', d: 'Whether the mean of a sample differs from μ₀, by Student\'s t: of its numbers, or of its mean x̄, standard deviation s and size n. ' +
                    'Its interval is where the mean is, with the chance of the level.',
                    fields: function (raw) {
                        return [DATA_OR].concat(raw.input === '1' ? [{ k: 'm', l: 'x̄', ph: '5.4' }, { k: 's', l: 's', ph: '0.43' }, { k: 'n', l: 'n', ph: '6' }] :
                            [{ k: 'x', l: 'Data', ph: '5.1 4.9 5.6 5.8 6 5.2', area: true }]).concat([{ k: 'mu', l: 'μ<sub>0</sub>', ph: '0', def: 0, name: 'μ₀' }, ALPHA, solvePart.LEVEL, HA]);
                    }, cols: 3, run: runTTest, example: { x: '5.1 4.9 5.6 5.8 6 5.2', mu: '5' } },
                { id: 'ttest2', t: 'Two-sample t-test', f: 't = (x̄<sub>1</sub> – x̄<sub>2</sub>) ÷ SE', d: 'Whether the means of two samples differ, by Welch\'s t, or by t pooled where their spreads are taken as the same: ' +
                    'of their numbers, or of the mean, standard deviation and size of each. Its interval is of the difference of the means.',
                    fields: function (raw) {
                        return [DATA_OR].concat(raw.input === '1' ? [{ k: 'm1', l: 'x̄<sub>1</sub>', ph: '20', name: 'x̄₁' }, { k: 's1', l: 's<sub>1</sub>', ph: '4', name: 's₁' },
                            { k: 'n1', l: 'n<sub>1</sub>', ph: '10', name: 'n₁' }, { k: 'm2', l: 'x̄<sub>2</sub>', ph: '16', name: 'x̄₂' }, { k: 's2', l: 's<sub>2</sub>', ph: '6', name: 's₂' },
                            { k: 'n2', l: 'n<sub>2</sub>', ph: '12', name: 'n₂' }] :
                            [{ k: 'x1', l: 'Sample 1', ph: '20 22 19 24 25', area: true }, { k: 'x2', l: 'Sample 2', ph: '16 18 15 21 14', area: true }])
                            .concat([ALPHA, solvePart.LEVEL, { k: 'pool', l: 'Spread', choice: ['Welch', 'Pooled'] }, HA]);
                    }, cols: 3, run: runTTest2, example: { x1: '20 22 19 24 25 21', x2: '16 18 15 21 14 19' } },
                { id: 'paired', t: 'Paired t-test', f: 't = (d̄ – μ<sub>d</sub>) ÷ (s<sub>d</sub>/√n)', d: 'Whether two measures of the same things differ, before and after: a pair on each line, as two columns of a spreadsheet; ' +
                    'the t of their differences, the second less the first, against μd, 0 at first.',
                    fields: [{ k: 'xy', l: 'Pairs', ph: 'before after, a pair on each line:\n72 70\n80 76\n65 66', area: true }, { k: 'mu', l: 'μ<sub>d</sub>', ph: '0', def: 0, name: 'μd' },
                        ALPHA, solvePart.LEVEL, HA], cols: 3, run: runPaired, example: { xy: '72 70\n80 76\n65 66\n90 84\n77 73\n68 67' } },
                { id: 'ztest', t: 'z-test', f: 'z = (x̄ – μ<sub>0</sub>) ÷ (σ/√n)', d: 'Whether the mean of a sample differs from μ₀, where the standard deviation σ of all is known: of its numbers, or of its mean x̄ and size n.',
                    fields: function (raw) {
                        return [DATA_OR].concat(raw.input === '1' ? [{ k: 'm', l: 'x̄', ph: '105' }, { k: 'n', l: 'n', ph: '36' }] :
                            [{ k: 'x', l: 'Data', ph: '102 110 98 107', area: true }]).concat([{ k: 'sigma', l: 'σ', ph: '15' }, { k: 'mu', l: 'μ<sub>0</sub>', ph: '0', def: 0, name: 'μ₀' }, ALPHA, solvePart.LEVEL, HA]);
                    }, cols: 3, run: runZTest, example: { input: '1', m: '105', n: '36', sigma: '15', mu: '100' } },
                { id: 'prop', t: 'Proportion z-test', f: 'z = (p̂ – p<sub>0</sub>) ÷ √(p<sub>0</sub>(1 – p<sub>0</sub>)/n)', d: 'Whether a proportion, x of n, differs from the chance p₀, by the normal distribution. Its interval is of the proportion.',
                    fields: [{ k: 'x', l: 'x', ph: '60' }, { k: 'n', l: 'n', ph: '100' }, { k: 'p0', l: 'p<sub>0</sub>', ph: '0.5', def: 0.5, name: 'p₀' }, ALPHA, solvePart.LEVEL, HA],
                    cols: 3, run: runProp, example: { x: '60', n: '100', p0: '0.5' } },
                { id: 'prop2', t: 'Two-proportion z-test', f: 'z = (p̂<sub>1</sub> – p̂<sub>2</sub>) ÷ SE', d: 'Whether two proportions, x₁ of n₁ and x₂ of n₂, differ, by their pooled proportion. Its interval is of their difference.',
                    fields: [{ k: 'x1', l: 'x<sub>1</sub>', ph: '45', name: 'x₁' }, { k: 'n1', l: 'n<sub>1</sub>', ph: '100', name: 'n₁' }, { k: 'x2', l: 'x<sub>2</sub>', ph: '30', name: 'x₂' },
                        { k: 'n2', l: 'n<sub>2</sub>', ph: '100', name: 'n₂' }, ALPHA, solvePart.LEVEL, HA], cols: 2, run: runProp2, example: { x1: '45', n1: '100', x2: '30', n2: '100' } },
                { id: 'gof', t: 'χ² goodness of fit', f: 'χ<sup>2</sup> = Σ (O – E)<sup>2</sup> ÷ E', d: 'Whether counts fit what was expected: the counts of each kind, and what was expected of each, as counts or as a ratio, 9:3:3:1 as Mendel\'s peas; ' +
                    'none expected is each the same.',
                    fields: [{ k: 'o', l: 'Observed', ph: '315 108 101 32', area: true }, { k: 'e', l: 'Expected', ph: 'the same of each, or 9:3:3:1', area: true }, ALPHA],
                    cols: 1, run: runGof, example: { o: '315 108 101 32', e: '9 3 3 1' } },
                { id: 'indep', t: 'χ² test of independence', f: 'χ<sup>2</sup> = Σ (O – E)<sup>2</sup> ÷ E', d: 'Whether the rows and the columns of a table of counts are independent: a row on each line, as a block of a spreadsheet is pasted. ' +
                    'Each count expected is its row\'s times its column\'s, over all.',
                    fields: [{ k: 't', l: 'Table', ph: 'a row on each line:\n10 20\n30 40', area: true }, ALPHA], cols: 1, run: runIndep, example: { t: '20 15 25\n30 35 15' } },
                { id: 'anova', t: 'ANOVA', f: 'F = MS<sub>between</sub> ÷ MS<sub>within</sub>', d: 'One-way analysis of variance: whether the means of three groups or more, or two, differ. A group on each line, its numbers apart by spaces.',
                    fields: [{ k: 'g', l: 'Groups', ph: 'a group on each line:\n6 8 4 5\n8 12 9 11\n13 9 11 8', area: true }, ALPHA], cols: 1, run: runAnova,
                    example: { g: '6 8 4 5 3 4\n8 12 9 11 6 8\n13 9 11 8 7 12' } },
                { id: 'corr', t: 'Correlation test', f: ['t = r √(n – 2) ÷ √(1 – r<sup>2</sup>)', 'ρ'], d: 'Whether pairs are correlated, by the t of the slope of their line, as LinRegTTest: x and y on each line. ' +
                    'With Spearman\'s ρ, of their ranks, for pairs that go up or down together but not in a line.',
                    fields: [{ k: 'xy', l: 'Pairs', ph: 'x and y on each line:\n1 2.1\n2 3.9\n3 6.2', area: true }, ALPHA, HA], cols: 2, run: runCorr,
                    example: { xy: '1 2.1\n2 3.9\n3 6.2\n4 7.8\n5 10.1\n6 12.2' } }
            ]
        };

    // the numbers of a box of a test, in the order typed, and what is no number in it
    function testList(text) {
        return CalcEngine.numbers(text || '', engine.comma, 'auto');
    }

    // a sample's mean, standard deviation and size
    function sampleOf(xs) {
        var n = xs.length, m = xs.reduce(function (s, x) { return s + x; }, 0) / n;
        return { m: m, s: n > 1 ? Math.sqrt(xs.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (n - 1)) : NaN, n: n };
    }

    // the decision at α: reject H₀ where the p-value is below it
    function decision(p, alpha) {
        if (!isFinite(p) || !(alpha > 0 && alpha < 1)) return [];
        return [{ l: 'At α = ' + local(String(alpha)), text: p < alpha ? 'Reject H<sub>0</sub>' : 'Do not reject H<sub>0</sub>', wide: true }];
    }

    // what a test gives: its statistic and p-value, the decision, then more, and its interval
    function testRows(name, r, n, more) {
        if (!r) return [{ l: name, v: NaN }, { l: 'p', v: NaN }];
        return [{ l: name, v: r.stat }, { l: 'p', v: r.p }].concat(decision(r.p, n.alpha), more || [],
            isFinite(r.from) ? [{ l: tr('{level}% interval from', { level: local(String(CalcMaths.round(n.level * 100))) }), v: r.from }, { l: 'to', v: r.to }] : []);
    }

    // the note of a test: of α, or what its numbers must be; and what a list left out
    function testNote(r, n, why, left) {
        if (!(n.alpha > 0 && n.alpha < 1)) return { note: 'α is a chance between 0 and 1, as 0.05.', warn: true };
        if (!(n.level > 0 && n.level < 1) && n.level !== undefined) return { note: 'The level is a chance between 0 and 1, as 0.95.', warn: true };
        if (!r) return { note: why, warn: true };
        return { note: (left && left.length ? tr('Left out: {left}{v}. ', { left: left.slice(0, 3).join(', '), v: (left.length > 3 ? ' …' : '') }) : '') +
            (r.p < n.alpha ? tr('p < α: significant at {alpha}.', { alpha: local(String(n.alpha)) }) : tr('p ≥ α: not significant at {alpha}.', { alpha: local(String(n.alpha)) })), warn: !!(left && left.length) };
    }

    // a list's numbers as a sample, or the mean, deviation and size typed: { m, s, n, bad, left }
    function sampleIn(raw, n, k, sum) {
        var read;
        if (raw.input === '1') return { m: n[sum[0]], s: sum[1] ? n[sum[1]] : NaN, n: n[sum[2]] };
        read = testList(raw[k]);
        return read.values.length ? Object.assign(sampleOf(read.values), { left: read.bad }) : { m: NaN, s: NaN, n: NaN, empty: true, left: read.bad };
    }

    function runTTest(n, raw) {
        var a = sampleIn(raw, n, 'x', ['m', 's', 'n']), r = CalcMaths.tTest(a.m, a.s, a.n, n.mu, +raw.ha, n.level),
            out = { rows: testRows('t', r, n, r ? [{ l: 'df', v: r.df }, { l: 'x̄', v: CalcMaths.round(a.m) }, { l: 's', v: CalcMaths.round(a.s) }, { l: 'n', v: a.n }, { l: 'SE', v: r.se }]
                .concat(drawnTile(testDrawing('t', r, +raw.ha, r.df))) : []), cols: 2 };
        if (a.empty) return out;
        return Object.assign(out, testNote(r, n, 'A sample of 2 numbers or more, s above 0.', a.left));
    }

    function runTTest2(n, raw) {
        var a = sampleIn(raw, n, 'x1', ['m1', 's1', 'n1']), b = sampleIn(raw, n, 'x2', ['m2', 's2', 'n2']),
            r = CalcMaths.tTest2(a.m, a.s, a.n, b.m, b.s, b.n, raw.pool === '1', +raw.ha, n.level),
            out = { rows: testRows('t', r, n, r ? [{ l: 'df', v: r.df }, { l: 'x̄<sub>1</sub> – x̄<sub>2</sub>', v: CalcMaths.round(a.m - b.m) }, { l: 'SE', v: r.se }]
                .concat(raw.pool === '1' ? [{ l: 's<sub>p</sub>', v: r.sp }] : [], drawnTile(testDrawing('t', r, +raw.ha, r.df))) : []), cols: 2 };
        if (a.empty || b.empty) return out;
        return Object.assign(out, testNote(r, n, 'Two samples of 2 numbers or more, that do not both have every number the same.', (a.left || []).concat(b.left || [])));
    }

    function runPaired(n, raw) {
        var p = CalcEngine.pairs(raw.xy || '', engine.comma, 'auto'), d = p.xs.map(function (x, i) { return p.ys[i] - x; }), a = d.length ? sampleOf(d) : null,
            r = a && CalcMaths.tTest(a.m, a.s, a.n, n.mu, +raw.ha, n.level),
            out = { rows: testRows('t', r, n, r ? [{ l: 'df', v: r.df }, { l: 'd̄', v: CalcMaths.round(a.m) }, { l: 's<sub>d</sub>', v: CalcMaths.round(a.s) }, { l: 'n', v: a.n }]
                .concat(drawnTile(testDrawing('t', r, +raw.ha, r.df))) : []), cols: 2 };
        if (!p.n && !p.bad.length) return out;
        return Object.assign(out, testNote(r, n, 'Two pairs or more, x and y on each line, whose differences are not all the same.', p.bad));
    }

    function runZTest(n, raw) {
        var a = sampleIn(raw, n, 'x', ['m', '', 'n']), r = CalcMaths.zTest(a.m, n.sigma, a.n, n.mu, +raw.ha, n.level),
            out = { rows: testRows('z', r, n, r ? [{ l: 'x̄', v: CalcMaths.round(a.m) }, { l: 'n', v: a.n }, { l: 'SE', v: r.se }].concat(drawnTile(testDrawing('z', r, +raw.ha))) : []), cols: 2 };
        if (a.empty && !raw.sigma) return out;
        return Object.assign(out, testNote(r, n, 'σ above 0, and a sample: n of 1 or more.', a.left));
    }

    function runProp(n, raw) {
        var r = CalcMaths.propTest(n.x, n.n, n.p0, +raw.ha, n.level),
            out = { rows: testRows('z', r, n, r ? [{ l: 'p̂', v: r.phat }, { l: 'SE', v: r.se }].concat(drawnTile(testDrawing('z', r, +raw.ha))) : []), cols: 2 };
        if (!raw.x && !raw.n) return out;
        return Object.assign(out, testNote(r, n, 'x and n are whole numbers, x no more than n, and p₀ a chance between 0 and 1.'));
    }

    function runProp2(n, raw) {
        var r = CalcMaths.propTest2(n.x1, n.n1, n.x2, n.n2, +raw.ha, n.level),
            out = { rows: testRows('z', r, n, r ? [{ l: 'p̂<sub>1</sub>', v: r.p1 }, { l: 'p̂<sub>2</sub>', v: r.p2 }, { l: 'Pooled p̂', v: r.pooled }, { l: 'SE', v: r.se }]
                .concat(drawnTile(testDrawing('z', r, +raw.ha))) : []), cols: 2 };
        if (!raw.x1 && !raw.n1 && !raw.x2 && !raw.n2) return out;
        return Object.assign(out, testNote(r, n, 'Each x and n whole numbers, x no more than its n; not all of both, or none.'));
    }

    function runGof(n, raw) {
        var o = testList(raw.o), e = testList(raw.e), r, rows, note;
        r = CalcMaths.chiFit(o.values, e.values);
        rows = testRows('χ<sup>2</sup>', r, n, r ? [{ l: 'df', v: r.df }].concat(drawnTile(testDrawing('chi', r, 2, r.df))) : []);
        if (r) rows.push({ l: 'Each kind', head: ['Kind', 'Observed', 'Expected', '(O – E)² ÷ E'], m: o.values.map(function (v, i) { return [i + 1, v, r.expected[i], r.parts[i]]; }) }); // four columns, a table's, the first its number
        if (!o.values.length && !o.bad.length) return { rows: rows, cols: 2 };
        note = testNote(r, n, e.values.length && e.values.length !== o.values.length ? tr('As many expected as observed: {values}.', { values: o.values.length }) :
            'Two counts or more, 0 or more each, and each expected above 0.', o.bad.concat(e.bad));
        if (r && r.small && !note.warn) note.note += ' ' + trn(r.small, '{n} kind expects fewer than 5: χ² is rough.', '{n} kinds expect fewer than 5: χ² is rough.');
        return Object.assign({ rows: rows, cols: 2 }, note);
    }

    function runIndep(n, raw) {
        var lines = (raw.t || '').split(/\r\n|\r|\n/).filter(function (l) { return l.trim(); }), bad = [], table, r, rows, note;
        table = lines.map(function (l) {
            var read = testList(l);
            bad = bad.concat(read.bad);
            return read.values;
        });
        r = CalcMaths.chiTable(table);
        rows = testRows('χ<sup>2</sup>', r, n, r ? [{ l: 'df', v: r.df }, { l: 'Cramér\'s V', v: r.v }].concat(drawnTile(testDrawing('chi', r, 2, r.df))) : []);
        if (r) rows.push({ l: 'Expected', m: r.expected });
        if (!lines.length) return { rows: rows, cols: 2 };
        note = testNote(r, n, 'Two rows or more, a row on each line, each of as many counts, two or more, 0 or more each; no row or column all 0.', bad);
        if (r && r.small && !note.warn) note.note += ' ' + trn(r.small, '{n} count expected is below 5: χ² is rough.', '{n} counts expected are below 5: χ² is rough.');
        return Object.assign({ rows: rows, cols: 2 }, note);
    }

    function runAnova(n, raw) {
        var lines = (raw.g || '').split(/\r\n|\r|\n/).filter(function (l) { return l.trim(); }), bad = [], groups, r;
        groups = lines.map(function (l) {
            var read = testList(l);
            bad = bad.concat(read.bad);
            return read.values;
        });
        r = CalcMaths.anova(groups);
        if (!lines.length) return { rows: testRows('F', r, n), cols: 2 };
        return Object.assign({ rows: testRows('F', r, n, r ? [{ l: 'df between', v: r.df1 }, { l: 'df within', v: r.df2 }, { l: 'SS between', v: r.ssb }, { l: 'SS within', v: r.ssw },
            { l: 'MS between', v: r.msb }, { l: 'MS within', v: r.msw }, { l: 'Grand mean', v: r.mean }].concat(groups.map(function (g, i) {
                return { l: tr('Mean {i}', { i: (i + 1) }), v: CalcMaths.round(sampleOf(g).m) };
            }), drawnTile(testDrawing('F', r, 2, r.df1, r.df2))) : []), cols: 2 }, testNote(r, n, 'Two groups or more, a group on each line, with more numbers in all than groups.', bad));
    }

    function runCorr(n, raw) {
        var p = CalcEngine.pairs(raw.xy || '', engine.comma, 'auto'), r = p.n ? CalcMaths.corrTest(p.xs, p.ys, +raw.ha) : null,
            out = { rows: testRows('t', r, n, r ? [{ l: 'df', v: r.df }, { l: 'r', v: r.r }, { l: 'r<sup>2</sup>', v: CalcMaths.round(r.r * r.r) }, { l: 'Slope b', v: r.b },
                { l: 'Intercept a', v: r.a }, { l: 'SE of b', v: r.se }, { l: 'Spearman ρ', v: r.rho }, { l: 'p of ρ', v: r.prho }].concat(drawnTile(scatterDrawing(p.xs, p.ys, r.a, r.b))) : []), cols: 2 };
        if (!p.n && !p.bad.length) return out;
        return Object.assign(out, testNote(r, n, 'Three pairs or more, x and y on each line, each of x and y not all the same.', p.bad));
    }

    // Where a test's statistic is on its distribution, of its degrees of freedom, and its p-value shaded: the tail below it, or above,
    // as Hₐ is < or >, or both tails as far out of Hₐ ≠; χ² and F above it
    function testDrawing(kind, r, ha, df1, df2) {
        var s = r.stat, name = { z: 'z', t: 't', chi: 'χ²', F: 'F' }[kind], f, x0, x1, w;
        if (!isFinite(s)) return '';
        f = kind === 'z' ? function (x) { return CalcMaths.normalDensity(x, 0, 1); } : densityOf(kind === 't' ? function (x) { return CalcMaths.tDist(x, df1).lo; } :
            kind === 'chi' ? function (x) { return x <= 0 ? 0 : CalcMaths.chiDist(x, df1).lo; } : function (x) { return x <= 0 ? 0 : CalcMaths.fDist(x, df1, df2).lo; }, kind === 'chi' ? Math.max(1, df1) : 1);
        if (kind === 'z' || kind === 't') {
            w = Math.max(4, Math.abs(s) * 1.15);
            x0 = -w;
            x1 = w;
        } else {
            x0 = 0;
            x1 = Math.max(s * 1.3, kind === 'chi' ? df1 + 4 * Math.sqrt(2 * df1) : Math.min(CalcMaths.fInverse(0.99, df1, df2), 10) || 5);
        }
        return graphDrawing(tr('Its {name} on its distribution, the p-value shaded', { name: name }), x0, x1, { fs: [f], marks: [[s, name]],
            fills: ha === 1 ? [[f, null, x0, s]] : ha === 2 ? [[f, null, s, x1]] : [[f, null, x0, -Math.abs(s)], [f, null, Math.abs(s), x1]] });
    }

    // the pairs, and the line of least squares through them, y = a + b x
    function scatterDrawing(xs, ys, a, b) {
        var x = rangeAround(xs);
        return graphDrawing('The pairs, and their line', x[0], x[1], { fs: [function (t) { return a + b * t; }], pts: xs.map(function (v, i) { return [v, ys[i]]; }) });
    }

    var statTests = toolCards(stats.querySelector('.calc-stats-tests'), TEST_TOOLS, 'statTests', false, {
        open: function () { return stats.classList.contains('calc-open') && statsTab === 'tests'; },
        done: function () { showStats(false); },
        side: function () { return bigSide(stats); }
    });

    // ---------------- drawings of the cards ---------------- //

    // What the cards of every panel draw with: a number written short for SVG, the SVG itself and its text and
    // arrows, a curve or a graph of values, and the rows of a card; used by physics, biology, chemistry, the solver
    // and the rest alike

    // a row of each label and number, rounded as results are
    function physRows(list) {
        return list.map(function (r) { return { l: r[0], v: CalcMaths.round(r[1]) }; });
    }

    // a card's results while it has too few of its boxes: each with no value yet
    function physNone(labels) {
        return { rows: labels.map(function (l) { return { l: l, v: NaN }; }) };
    }

    var plotIds = 0; // each drawing's own ids, of its gradients

    function fix(v) {
        return (+v).toFixed(1);
    }

    function svgOf(cls, W, H, label, body) {
        return '<svg class="calc-sv-shape calc-sv-plot' + (cls ? ' ' + cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + tr(label) + '">' + body + '</svg>';
    }

    // a text of a drawing, its words translated; raw, as they are already, or a number
    function svgText(x, y, s, anchor, cls, raw) {
        return '<text class="' + (cls || 'calc-sv-small') + '" x="' + fix(x) + '" y="' + fix(y) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + (raw ? s : tr(s)) + '</text>';
    }

    // a line from one point to another, an arrowhead at its end
    function svgArrow(x1, y1, x2, y2, cls, dash) {
        var a = Math.atan2(y2 - y1, x2 - x1), s = 6, w = 3.2;
        if (Math.hypot(x2 - x1, y2 - y1) < 1) return '';
        return '<path class="' + (cls || 'calc-sv-seg') + (dash ? ' calc-sv-dash' : '') + '" d="M' + fix(x1) + ' ' + fix(y1) + 'L' + fix(x2 - s * 0.7 * Math.cos(a)) + ' ' + fix(y2 - s * 0.7 * Math.sin(a)) + '"/>' +
            '<path class="calc-sv-head' + (cls === 'calc-sv-curve' ? ' calc-sv-head-red' : cls === 'calc-sv-lit' ? ' calc-sv-head-lit' : '') + '" d="M' + fix(x2) + ' ' + fix(y2) + 'L' + fix(x2 - s * Math.cos(a) + w * Math.sin(a)) + ' ' + fix(y2 - s * Math.sin(a) - w * Math.cos(a)) +
            'L' + fix(x2 - s * Math.cos(a) - w * Math.sin(a)) + ' ' + fix(y2 - s * Math.sin(a) + w * Math.cos(a)) + 'Z"/>';
    }

    // the colour of light of a wavelength in nm where it is seen, '' where it is not; its brightness falling at each end
    function nmColour(nm) {
        var r = 0, g = 0, b = 0, k;
        if (!(nm >= 380 && nm <= 750)) return '';
        if (nm < 440) { r = (440 - nm) / 60; b = 1; }
        else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
        else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
        else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
        else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
        else r = 1;
        k = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (750 - nm) / 50 : 1;
        return 'rgb(' + [r, g, b].map(function (c) { return Math.round(255 * Math.pow(c * k, 0.8)); }).join(',') + ')';
    }

    // a gradient of the colours seen, from 380 nm at its left to 750 at its right
    function rainbow(id) {
        var stops = '', nm;
        for (nm = 380; nm <= 750; nm += 15) stops += '<stop offset="' + ((nm - 380) / 370).toFixed(3) + '" stop-color="' + nmColour(nm) + '"/>';
        return '<defs><linearGradient id="' + id + '">' + stops + '</linearGradient></defs>';
    }

    // A graph of y = f(x), x from 0 to x1, y from lo to hi: its axes, the curve, o.under its area to 0 shaded, o.marks dashed
    // lines down at each [x, name], o.at a dot on it at an x, o.point a dot at [x, y], o.band [x0, x1] the colours seen behind it,
    // o.pts the curve's points instead, o.names [of x, of y]
    function curveDrawing(label, x1, lo, hi, f, o) {
        var W = 300, H = 110, L = 16, R = W - 8, T = 10, B = H - 16, d = '', pts = o.pts, body = '', zero, id,
            px = function (v) { return L + (R - L) * v / x1; },
            py = function (v) { return B - (B - T) * (Math.max(lo, Math.min(hi * 1.04, v)) - lo) / (hi - lo); };
        if (!(x1 > 0 && hi > lo) || !isFinite(x1 + hi + lo)) return '';
        if (!pts) {
            pts = [];
            for (var i = 0; i <= 120; i++) pts.push([x1 * i / 120, f(x1 * i / 120)]);
        }
        pts.forEach(function (p, i) { d += (i ? 'L' : 'M') + fix(px(p[0])) + ' ' + fix(py(p[1])); });
        zero = py(Math.max(lo, Math.min(hi, 0)));
        if (o.band) {
            id = 'calc-plot-' + (++plotIds);
            body += rainbow(id) + '<rect x="' + fix(px(o.band[0])) + '" y="' + T + '" width="' + fix(px(o.band[1]) - px(o.band[0])) + '" height="' + (B - T) + '" fill="url(#' + id + ')" opacity="0.45"/>';
        }
        if (o.under) body += '<path class="calc-sv-under" d="' + d + 'L' + fix(px(pts[pts.length - 1][0])) + ' ' + fix(zero) + 'L' + fix(px(pts[0][0])) + ' ' + fix(zero) + 'Z"/>';
        (o.marks || []).forEach(function (m) {
            if (m[0] > x1) return;
            body += '<path class="calc-sv-guide" d="M' + fix(px(m[0])) + ' ' + T + 'V' + B + '"/>' + svgText(px(m[0]), B + 11, m[1], 'middle');
        });
        body += '<path class="calc-sv-ground" d="M' + L + ' ' + T + 'V' + B + 'M' + L + ' ' + fix(zero) + 'H' + R + '"/><path class="calc-sv-curve" d="' + d + '"/>';
        if (o.at !== undefined && o.at >= 0 && o.at <= x1) body += '<circle class="calc-sv-dot" cx="' + fix(px(o.at)) + '" cy="' + fix(py(f(o.at))) + '" r="3"/>';
        if (o.point) body += '<circle class="calc-sv-dot" cx="' + fix(px(o.point[0])) + '" cy="' + fix(py(o.point[1])) + '" r="3.5"/>';
        if (o.names) body += svgText(R, B + 11, o.names[0], 'end') + svgText(L + 4, T + 2, o.names[1]);
        return svgOf('', W, H, label, body);
    }

    // A graph of the plane, x from x0 to x1, as the solver's cards, the chances and the money draw theirs:
    // o.fs the curves of y = f(x), the first red, the next blue, the third blue and dashed
    // o.y [lo, hi], else as high and low as the curves go, the first o.fit of them only, between o.yfrom [a, b] only, a spike or an asymptote left out
    // o.fill [f, g, a, b] the area between f and g, or the x axis, from a to b shaded, o.fills more of them; o.bands [[from, to]] of x shaded all the way up
    // o.bars [[x, y, lit]], a lit one red; o.dots [[x, y]], o.open [[x, y]] hollow, as a limit is where it has no value; o.pts [[x, y]] blue, smaller
    // o.marks [[x, name]] dashed lines up, named under the axis; o.lines [[x1, y1, x2, y2]] and o.paths [[[x, y] …]], blue
    // o.rels [g(x, y)] curves where g is 0, of o.y; o.names [of x, of y]. The axes where 0 is in it, else the x axis along the bottom
    function graphDrawing(label, x0, x1, o) {
        var W = 300, H = 120, L = 10, R = W - 10, T = 8, B = H - 16, N = 240, ys = [], more = [], lo, hi, s, i, body = '', id = 'calc-plot-' + (++plotIds), ax, ay, curves;
        if (!(x1 > x0) || !isFinite(x0) || !isFinite(x1)) return '';
        function px(x) { return L + (R - L) * (x - x0) / (x1 - x0); }
        function py(y) { return Math.max(T - 2 * (B - T), Math.min(B + 2 * (B - T), B - (B - T) * (y - lo) / (hi - lo))); }
        function line(pts) { // broken where it has no value, or jumps from one end of the graph to the other
            var d = '', last = null;
            pts.forEach(function (p) {
                if (!isFinite(p[1])) { last = null; return; }
                d += (last === null || Math.abs(p[1] - last) > 2 * (hi - lo) ? 'M' : 'L') + fix(px(p[0])) + ' ' + fix(py(p[1]));
                last = p[1];
            });
            return d;
        }
        curves = (o.fs || []).map(function (f, k) {
            var pts = [], x, y;
            for (i = 0; i <= N; i++) {
                x = x0 + (x1 - x0) * i / N;
                y = f(x);
                pts.push([x, y]);
                if (isFinite(y) && !(k >= o.fit) && !(o.yfrom && (x < o.yfrom[0] || x > o.yfrom[1]))) ys.push(y);
            }
            return pts;
        });
        (o.paths || []).forEach(function (p) { p.forEach(function (q) { if (isFinite(q[1])) ys.push(q[1]); }); });
        (o.dots || []).concat(o.open || [], o.pts || []).forEach(function (p) { if (isFinite(p[1])) more.push(p[1]); });
        (o.bars || []).forEach(function (b) { if (isFinite(b[1])) more.push(b[1], 0); });
        if ((o.fills || []).concat(o.fill ? [o.fill] : []).some(function (f) { return !f[1]; })) more.push(0);
        if (o.y) {
            lo = o.y[0];
            hi = o.y[1];
        } else {
            if (ys.length) {
                s = ys.slice().sort(function (a, b) { return a - b; });
                lo = s[0];
                hi = s[s.length - 1];
                var p5 = s[Math.floor(s.length * 0.05)], p95 = s[Math.ceil(s.length * 0.95) - 1];
                if (p95 > p5 && hi - lo > 8 * (p95 - p5)) { // a spike: the curve as most of it goes
                    lo = Math.max(lo, p5 - 0.5 * (p95 - p5));
                    hi = Math.min(hi, p95 + 0.5 * (p95 - p5));
                }
            }
            more.forEach(function (y) {
                lo = lo === undefined ? y : Math.min(lo, y);
                hi = hi === undefined ? y : Math.max(hi, y);
            });
            if (lo === undefined) return '';
            if (lo > 0 && lo < 0.4 * (hi - lo)) lo = 0; // the x axis in, where it is near
            if (hi < 0 && -hi < 0.4 * (hi - lo)) hi = 0;
            if (!(hi - lo > 1e-9 * Math.max(1, Math.abs(hi)))) {
                s = Math.max(1, Math.abs(hi)) * 0.5;
                lo -= s;
                hi += s;
            }
            s = (hi - lo) * 0.08;
            lo -= s;
            hi += s;
        }
        if (!(hi > lo) || !isFinite(hi - lo)) return '';
        ay = lo <= 0 && hi >= 0 ? py(0) : B;
        ax = x0 <= 0 && x1 >= 0 ? px(0) : null;
        body += '<defs><clipPath id="' + id + '"><rect x="0" y="' + T + '" width="' + W + '" height="' + (B - T) + '"/></clipPath></defs><g clip-path="url(#' + id + ')">';
        (o.bands || []).forEach(function (b) {
            var a = px(Math.max(x0, b[0])), z = px(Math.min(x1, b[1]));
            if (z >= a && b[1] >= x0 && b[0] <= x1) body += '<rect class="calc-sv-under" x="' + fix(a - (z - a < 1.5 ? 0.75 : 0)) + '" y="' + T + '" width="' + fix(Math.max(z - a, 1.5)) + '" height="' + (B - T) + '"/>';
        });
        (o.fills || []).concat(o.fill ? [o.fill] : []).forEach(function (fill) {
            var a = Math.max(x0, Math.min(fill[2], fill[3])), b = Math.min(x1, Math.max(fill[2], fill[3])), top = [], under = [], j, t;
            for (j = 0; j <= 120 && b > a; j++) {
                t = a + (b - a) * j / 120;
                top.push([t, fill[0](t)]);
                under.unshift([t, fill[1] ? fill[1](t) : 0]);
            }
            if (top.length && top.concat(under).every(function (p) { return isFinite(p[1]); })) {
                body += '<path class="calc-sv-under" d="M' + top.concat(under).map(function (p) { return fix(px(p[0])) + ' ' + fix(py(p[1])); }).join('L') + 'Z"/>';
            }
        });
        if (o.bars) {
            s = Math.max(1, Math.min(16, (R - L) / Math.max(1, (x1 - x0)) * 0.72)); // as wide as a step of x leaves room
            o.bars.forEach(function (b) {
                if (!isFinite(b[1])) return;
                body += '<rect class="' + (b[2] ? 'calc-sv-bar-lit' : 'calc-sv-bar') + '" x="' + fix(px(b[0]) - s / 2) + '" y="' + fix(Math.min(py(b[1]), ay)) + '" width="' + fix(s) +
                    '" height="' + fix(Math.max(0.6, Math.abs(ay - py(b[1])))) + '"/>';
            });
        }
        body += '<path class="calc-sv-ground" d="M' + L + ' ' + fix(ay) + 'H' + R + (ax !== null ? 'M' + fix(ax) + ' ' + T + 'V' + B : '') + '"/>';
        (o.marks || []).forEach(function (m) {
            if (m[0] >= x0 && m[0] <= x1) body += '<path class="calc-sv-guide" d="M' + fix(px(m[0])) + ' ' + T + 'V' + B + '"/>';
        });
        (o.rels || []).forEach(function (g, k) {
            body += '<path class="' + ['calc-sv-curve', 'calc-sv-seg'][k % 2] + '" d="' + contour(g, x0, x1, lo, hi, px, py) + '"/>';
        });
        curves.forEach(function (pts, k) {
            body += '<path class="' + ['calc-sv-curve', 'calc-sv-seg calc-sv-thin', 'calc-sv-seg calc-sv-thin calc-sv-dash'][Math.min(k, 2)] + '" d="' + line(pts) + '"/>';
        });
        (o.paths || []).forEach(function (p) { body += '<path class="calc-sv-seg calc-sv-thin" d="' + line(p) + '"/>'; });
        (o.lines || []).forEach(function (l) {
            body += '<path class="calc-sv-seg calc-sv-thin" d="M' + fix(px(l[0])) + ' ' + fix(py(l[1])) + 'L' + fix(px(l[2])) + ' ' + fix(py(l[3])) + '"/>';
        });
        (o.pts || []).forEach(function (p) {
            if (isFinite(p[1])) body += '<circle class="calc-sv-mid" cx="' + fix(px(p[0])) + '" cy="' + fix(py(p[1])) + '" r="2.5"/>';
        });
        (o.dots || []).forEach(function (p) {
            if (isFinite(p[1])) body += '<circle class="calc-sv-dot" cx="' + fix(px(p[0])) + '" cy="' + fix(py(p[1])) + '" r="3"/>';
        });
        (o.open || []).forEach(function (p) {
            if (isFinite(p[1])) body += '<circle class="calc-sv-hole" cx="' + fix(px(p[0])) + '" cy="' + fix(py(p[1])) + '" r="3.2"/>';
        });
        body += '</g>';
        (o.marks || []).forEach(function (m) {
            if (m[0] >= x0 && m[0] <= x1 && m[1]) body += svgText(Math.max(L + 8, Math.min(R - 8, px(m[0]))), B + 11, m[1], 'middle');
        });
        if (o.names) body += svgText(R, Math.min(B - 4, ay - 4), o.names[0], 'end') + svgText((ax !== null ? ax : L) + 4, T + 9, o.names[1]);
        return svgOf('', W, H, label, body);
    }

    // where g(x, y) is 0, as lines from cell to cell of a grid, the corners of each where it changes sign: a circle, a line
    function contour(g, x0, x1, y0, y1, px, py) {
        var nx = 90, ny = 45, v = [], d = '', i, j, x, y;
        for (j = 0; j <= ny; j++) {
            v.push([]);
            for (i = 0; i <= nx; i++) v[j].push(g(x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny));
        }
        function at(i, j, a, b, k) { // where it is 0 along an edge, between corners of the values a and b
            var t = a / (a - b);
            return k ? [x0 + (x1 - x0) * (i + t) / nx, y0 + (y1 - y0) * j / ny] : [x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * (j + t) / ny];
        }
        for (j = 0; j < ny; j++) {
            for (i = 0; i < nx; i++) {
                var a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], e = v[j + 1][i], cut = [];
                if (![a, b, c, e].every(isFinite)) continue;
                if ((a < 0) !== (b < 0)) cut.push(at(i, j, a, b, 1));
                if ((b < 0) !== (c < 0)) cut.push(at(i + 1, j, b, c, 0));
                if ((e < 0) !== (c < 0)) cut.push(at(i, j + 1, e, c, 1));
                if ((a < 0) !== (e < 0)) cut.push(at(i, j, a, e, 0));
                for (x = 0; x + 1 < cut.length; x += 2) {
                    y = [cut[x], cut[x + 1]];
                    d += 'M' + fix(px(y[0][0])) + ' ' + fix(py(y[0][1])) + 'L' + fix(px(y[1][0])) + ' ' + fix(py(y[1][1]));
                }
            }
        }
        return d;
    }

    // x from and to, to draw some points of it: as From and To were typed, else round them, a little way past each end
    function rangeAround(xs, from, to) {
        var lo, hi, pad;
        if (isFinite(from) && isFinite(to) && from < to) return [from, to];
        xs = xs.filter(isFinite);
        if (!xs.length) return [-5, 5];
        lo = Math.min.apply(null, xs);
        hi = Math.max.apply(null, xs);
        pad = hi > lo ? (hi - lo) * 0.35 : Math.max(1, Math.abs(lo) * 0.25);
        return [lo - pad, hi + pad];
    }

    // y = f(x) of a function typed, or each side of an equation or inequality, as the graph has them; null where one is not
    function sidesOf(text, cut) {
        var sides = String(text || '').split(cut).map(function (s) { return s.trim() && CalcEngine.graph(s, engine.comma, {}); });
        if (!sides.length || !sides.every(function (c) { return c && !c.letters.length; })) return null;
        return sides.map(function (c) { return function (x) { return c.at(x, deg); }; });
    }

    // the density of a distribution, from its chance below x, P(X ≤ x), as it climbs
    function densityOf(below, scale) {
        return function (x) {
            var h = 1e-4 * scale;
            return Math.max(0, (below(x + h) - below(x - h)) / (2 * h));
        };
    }

    // the bars of the chances of a count, k lit, from first to last
    function countDrawing(label, first, last, p, k) {
        var bars = [], j;
        if (!isFinite(first) || !isFinite(last) || last - first > 200) return '';
        for (j = first; j <= last; j++) bars.push([j, p(j), j === k]);
        return graphDrawing(label, first - 0.7, last + 0.7, { bars: bars });
    }

    // a number short enough to write on a drawing: 3 digits, 1.2e8 of a large or small one, with the decimal mark in use
    function shortNum(x) {
        var a = Math.abs(x);
        if (!isFinite(x)) return '–';
        return (a && (a >= 1e5 || a < 1e-3) ? local(x.toExponential(1).replace('e+', 'e')) : local(String(+x.toPrecision(3)))).replace('-', '−');
    }

    // Bars of values, each named under it: items [[name, value, lit]], a lit one red; with a second value, [name, value, lit,
    // other], that one beside it outlined, as the counts expected beside those seen. fmt writes each value above its bar
    function labelBars(label, items, fmt) {
        var W = 300, H = 128, L = 8, R = W - 8, T = 14, B = H - 22, slot, w, top = 0, body = '', two;
        items = items.filter(function (it) { return isFinite(it[1]); });
        if (!items.length) return '';
        two = items.some(function (it) { return it[3] !== undefined; });
        items.forEach(function (it) { top = Math.max(top, it[1], two && isFinite(it[3]) ? it[3] : 0); });
        if (!(top > 0) || !isFinite(top)) return '';
        slot = (R - L) / items.length;
        w = Math.min(two ? 22 : 40, slot * (two ? 0.38 : 0.6));
        items.forEach(function (it, i) {
            var cx = L + slot * (i + 0.5), h = (B - T) * Math.max(0, it[1]) / top, h2 = two ? (B - T) * Math.max(0, it[3] || 0) / top : 0;
            body += '<rect class="' + (it[2] ? 'calc-sv-bar-lit' : 'calc-sv-bar') + '" x="' + fix(two ? cx - w - 1 : cx - w / 2) + '" y="' + fix(B - h) + '" width="' + fix(w) +
                '" height="' + fix(Math.max(0.6, h)) + '"/>';
            if (two) body += '<rect class="calc-bio-expect" x="' + fix(cx + 1) + '" y="' + fix(B - h2) + '" width="' + fix(w) + '" height="' + fix(Math.max(0.6, h2)) + '"/>';
            if (slot >= 22) body += svgText(cx, B - Math.max(h, h2) - 3, (fmt || shortNum)(it[1]), 'middle');
            if (slot >= 16) body += svgText(cx, B + 12, it[0], 'middle');
        });
        return svgOf('', W, H, label, body + '<path class="calc-sv-ground" d="M' + L + ' ' + B + 'H' + R + '"/>');
    }

    // a bar of parts, each in its colour and as long as its share, and a key of them under it, three to a line: parts [[name, value, colour]]
    function stackDrawing(label, parts) {
        var W = 300, L = 8, R = W - 8, total = 0, x = L, body = '';
        parts = parts.filter(function (p) { return p[1] > 0; });
        parts.forEach(function (p) { total += p[1]; });
        if (!(total > 0)) return '';
        parts.forEach(function (p, i) {
            var w = (R - L) * p[1] / total, kx = L + (i % 3) * 98, ky = 38 + Math.floor(i / 3) * 16;
            body += '<rect x="' + fix(x) + '" y="8" width="' + fix(w) + '" height="18" fill="' + p[2] + '"><title>' + p[0] + '</title></rect>' +
                '<rect class="calc-bio-sq" x="' + kx + '" y="' + ky + '" width="10" height="10" fill="' + p[2] + '"/>' + svgText(kx + 14, ky + 9, p[0]);
            x += w;
        });
        return svgOf('', W, 40 + Math.ceil(parts.length / 3) * 16, label, body + '<path class="calc-sv-ground" d="M' + L + ' 8h' + (R - L) + 'v18H' + L + 'Z"/>');
    }

    // ---------------- physics ---------------- //

    // The cards of physics are js/phys-panel.js: given what they take from the calculator, the values that change
    // read as they are now, and filling physPart with what the calculator takes from them
    var physPart = {};
    CalcPhysPanel({
        angleTyped: angleTyped,
        get bigPanel() { return bigPanel; },
        curveDrawing: curveDrawing,
        get deg() { return deg; },
        drawnTile: drawnTile,
        engine: engine,
        fix: fix,
        fromRadians: fromRadians,
        graphDrawing: graphDrawing,
        local: local,
        nmColour: nmColour,
        physButton: physButton,
        physNone: physNone,
        physPanel: physPanel,
        physRows: physRows,
        get plotIds() { return plotIds; }, set plotIds(v) { plotIds = v; },
        rainbow: rainbow,
        shortNum: shortNum,
        stackDrawing: stackDrawing,
        statsValue: statsValue,
        svgArrow: svgArrow,
        svgOf: svgOf,
        svgText: svgText,
        toolPanel: toolPanel,
        toolPanels: toolPanels,
        toRadians: toRadians,
        tr: tr,
        trc: trc,
        unitWord: unitWord
    }, physPart);

    // the panel's functions the calculator calls: as they are when called
    function showPhys() { return physPart.showPhys.apply(this, arguments); }

    // ---------------- biology ---------------- //

    // The cards of biology are js/bio-panel.js: given what they take from the calculator, the values that change
    // read as they are now, and filling bioPart with what the calculator takes from them
    var bioPart = {};
    CalcBioPanel({
        bioButton: bioButton,
        bioPanel: bioPanel,
        countDrawing: countDrawing,
        get deg() { return deg; },
        densityOf: densityOf,
        drawnTile: drawnTile,
        engine: engine,
        escaped: escaped,
        fix: fix,
        graphDrawing: graphDrawing,
        labelBars: labelBars,
        local: local,
        physNone: physNone,
        physRows: physRows,
        get plotIds() { return plotIds; }, set plotIds(v) { plotIds = v; },
        shortNum: shortNum,
        stackDrawing: stackDrawing,
        get svAgain() { return svAgain; },
        svgArrow: svgArrow,
        svgOf: svgOf,
        svgText: svgText,
        toolPanel: toolPanel,
        toolPanels: toolPanels,
        tr: tr
    }, bioPart);

    // the panel's functions the calculator calls: as they are when called
    function showBio() { return bioPart.showBio.apply(this, arguments); }

    // ---------------- chemistry ---------------- //

    // The periodic table and the cards of chemistry are js/chem-panel.js: given what they take from the calculator, the
    // values that change read as they are now, and filling chemPart with what the calculator takes from them
    var chemPart = {};
    CalcChemPanel({
        ask: ask,
        bigSide: bigSide,
        bio: bioPart.bio,
        bioButton: bioButton,
        closePanels: closePanels,
        convButton: convButton,
        convFocus: convFocus,
        convSearch: convSearch,
        get convTab() { return convTab; }, set convTab(v) { convTab = v; },
        convTabs: convTabs,
        curveDrawing: curveDrawing,
        get dates() { return dates; },
        get deg() { return deg; },
        drawnTile: drawnTile,
        drawPageCurve: drawPageCurve,
        engine: engine,
        escaped: escaped,
        fadeEdges: fadeEdges,
        fix: fix,
        get fmt() { return fmt; },
        focusBox: focusBox,
        get fracMode() { return fracMode; },
        fxButton: fxButton,
        graphButton: graphButton,
        graphDrawing: graphDrawing,
        hideTip: hideTip,
        keyBoard: keyBoard,
        labelBars: labelBars,
        listTyped: listTyped,
        local: local,
        mayPut: mayPut,
        nmColour: nmColour,
        numbers: numbers,
        numbersButton: numbersButton,
        phys: physPart.phys,
        physButton: physButton,
        placePanel: placePanel,
        get plotIds() { return plotIds; }, set plotIds(v) { plotIds = v; },
        popIn: popIn,
        rainbow: rainbow,
        refresh: refresh,
        root: root,
        rtlDraw: rtlDraw,
        saveConv: saveConv,
        saveState: saveState,
        scale: scale,
        setStatsTab: setStatsTab,
        shortNum: shortNum,
        showConv: showConv,
        showFxItem: showFxItem,
        showMenu: showMenu,
        showStats: showStats,
        solveButton: solveButton,
        solver: solver,
        statsButton: statsButton,
        statsInput: statsInput,
        get statsTab() { return statsTab; },
        get statsTexts() { return statsTexts; },
        statsValue: statsValue,
        store: store,
        get svAgain() { return svAgain; },
        svgArrow: svgArrow,
        svgOf: svgOf,
        svgText: svgText,
        get tipKey() { return tipKey; }, set tipKey(v) { tipKey = v; },
        toggleFraction: toggleFraction,
        toolCards: toolCards,
        touchScreen: touchScreen,
        tr: tr,
        trc: trc,
        trn: trn,
        get UNIT_TOOLS() { return UNIT_TOOLS; },
        get unitCards() { return unitCards; },
        unselect: unselect
    }, chemPart);

    // the panel's functions the calculator calls: as they are when called
    function chemFactPeek() { return chemPart.chemFactPeek.apply(this, arguments); }
    function chemGoTo() { return chemPart.chemGoTo.apply(this, arguments); }
    function chemTip() { return chemPart.chemTip.apply(this, arguments); }
    function clearChem() { return chemPart.clearChem.apply(this, arguments); }
    function closeChem() { return chemPart.closeChem.apply(this, arguments); }
    function loadChem() { return chemPart.loadChem.apply(this, arguments); }
    function renderChem() { return chemPart.renderChem.apply(this, arguments); }
    function saveChem() { return chemPart.saveChem.apply(this, arguments); }
    function showChem() { return chemPart.showChem.apply(this, arguments); }
function chemBig() { return chemPart.chemBig.apply(this, arguments); }
    // ---------------- converter ---------------- //

    // Two tabs of cards, as the solver has: Units, a card for each group of units, which has a value in one of them in
    // all the others, worked out as it is typed; and Dates. A click on a value puts it into the calculation, as Ans does.
    // The value can be a letter A to J, and an angle in degrees, minutes and seconds: 36°52′. A search above the units
    // finds a group by its name, or by the name or symbol of one of its units, which its card then starts from
    var UNIT_TOOLS = {
        units: CalcUnits.units.map(function (g, gi) {
            var names = g.list.map(function (u) { return u.t; });
            return {
                id: 'units-' + g.c.toLowerCase().replace(/[^a-z]+/g, '-'),
                t: g.c,
                f: g.list.slice(0, 3).map(function (u) { return u.s; }),
                d: tr('A value in one of its {units} in all the others: {names}{more}. An empty value is 1.', { units: trn(names.length, '{n} unit', '{n} units'),
                    names: names.slice(0, 4).map(function (t) { return tr(t); }).join(tr(', ')), more: names.length > 4 ? tr(' and more') : '' }),
                fills: true,
                fields: [
                    { k: 'v', l: 'Value', ph: '1', text: true, num: true },
                    { k: 'u', l: 'From', at: g.list[0].t, pick: function () {
                        return g.list.map(function (u) { return [u.t, tr(u.t) + ' <span class="calc-conv-of">(' + u.s + ')</span>']; });
                    } }
                ],
                cols: 2,
                run: function (n, raw) { return convert(gi, raw); }
            };
        })
    };

    // The value typed, worked out, in each unit of the group but its own, as the display has it to 12 digits; put in or
    // copied, to 15: 2.54 cm, not 2.5399999999999996. An equation, as A, worked out as the calculator would
    function convert(gi, raw) {
        var group = CalcUnits.units[gi], text = raw.v.replace(',', '.') || '1', x, trial,
            from = Math.max(0, group.list.map(function (u) { return u.t; }).indexOf(raw.u));
        if (/^-?(\d+\.?\d*|\.\d+)$/.test(text)) {
            x = +text;
        } else {
            trial = new CalcEngine();
            x = trial.paste(text, deg, true) && !trial.error && (trial.press('=', deg), !trial.error) ? +trial.value : NaN;
            // 36°52′ is in degrees: for another angle, as 180° for radians, it is turned into that one
            if (group.c === 'Angle' && CalcEngine.angleAlone(text)) x = CalcUnits.convert(gi, 0, from, x);
        }
        return {
            rows: group.list.map(function (u, i) {
                var v = isFinite(x) ? CalcUnits.convert(gi, from, i, x) : NaN, dms = u.dms && isFinite(v) && local(CalcEngine.dms(v) || ''), name = tr(u.t);
                return i === from ? null : {
                    l: name.charAt(0).toUpperCase() + name.slice(1) + ' (' + u.s + ')', v: isFinite(v) ? +v.toPrecision(15) : NaN,
                    html: isFinite(v) ? dms || convValue(v) : undefined, say: isFinite(v) ? dms || local(+v.toPrecision(15)) : '',
                    unit: plain(u.s), dms: !!u.dms
                };
            }).filter(Boolean),
            cols: 2, // two across, so a value of 12 digits fits
            bad: isFinite(x) ? [] : ['v'], warn: !isFinite(x),
            note: isFinite(x) ? 'Click a value to put it into the equation.' : 'Not a number the calculator can read.'
        };
    }

    // 12 digits, grouped as the display does, and very large or small ones as
    // powers of 10: 1.609344 × 10³ is shown 1,609.344, 1 nm 1 × 10⁻⁹ m
    function convValue(v) {
        var a = Math.abs(v), parts = (+v.toPrecision(12)).toExponential().split('e');
        return (a && (a >= 1e15 || a < 1e-6) ? local(parts[0]) + ' × 10<sup>' + +parts[1] + '</sup>' :
            CalcEngine.group(String(+v.toPrecision(12)), fmt.group)).replace(/-/g, '−');
    }

    var unitCards = toolCards(convUnits, UNIT_TOOLS, 'convUnits', false, {
        open: function () { return conv.classList.contains('calc-open') && convTab === 'units'; },
        done: function () { showConv(false); },
        side: function () { return bigSide(conv); }
    });

    var dates = toolCards(convDates, DATE_TOOLS, 'dates', true, {
        open: function () { return conv.classList.contains('calc-open') && convTab === 'dates'; },
        done: function () { showConv(false); },
        side: function () { return bigSide(conv); }
    });

    conv.querySelector('.calc-solve-tabs').addEventListener('click', function (e) {
        var t = e.target.closest('.calc-solve-tab');
        if (!t || t.dataset.tab === convTab) return;
        convTab = t.dataset.tab;
        convTabs();
        convFocus();
        saveConv();
    }, false);

    // the tab shown, and its cards
    function convTabs() {
        [].forEach.call(conv.querySelectorAll('.calc-solve-tab'), function (t) {
            t.classList.toggle('calc-on', t.dataset.tab === convTab);
        });
        conv.classList.toggle('calc-conv-dates', convTab === 'dates');
        convUnits.hidden = convSearch.parentNode.hidden = convTab === 'dates'; // the search in its box, with its ×
        convDates.hidden = convTab !== 'dates';
        closeCalendar();
        if (convTab === 'dates') return dates.render();
        unitCards.render();
        convFilter();
    }

    // the first box of the card open; of the units with none open, the search
    function convFocus() {
        if (convTab === 'dates') dates.focus();
        else if (!unitCards.focus()) focusBox(convSearch);
    }

    // The cards of the groups the search finds: with what is typed in their name, or else in a unit's name or symbol,
    // whose names their badges show then; beside the list, the one open stays, its row hidden. With none, it says so
    var convHits = {}; // the unit found in a card, by its id, which a click starts it from

    function convFilter() {
        var q = convSearch.value.trim().toLowerCase(), side = bigSide(conv);
        function lower(t) { return t.replace(/<[^>]*>/g, '').toLowerCase(); }
        convHits = {};
        [].forEach.call(convUnits.querySelectorAll('.calc-sv-item'), function (item) {
            var g = CalcUnits.units[+item.dataset.i], tool = UNIT_TOOLS.units[+item.dataset.i], row = item.querySelector('.calc-sv-row'),
                named = g.c.toLowerCase().indexOf(q) > -1,
                hit = q && !named ? g.list.filter(function (u) { return lower(u.t).indexOf(q) > -1 || lower(u.s).indexOf(q) > -1; }) : [];
            if (hit.length) convHits[tool.id] = hit[0].t;
            row.querySelector('.calc-sv-eq > span').innerHTML = pills(hit.length ? hit.slice(0, 2).map(function (u) { return u.t; }) : tool.f);
            row.hidden = !named && !hit.length;
            row.classList.remove('calc-lit');
            item.hidden = row.hidden && !(side && item.classList.contains('calc-on'));
        });
        convUnits.dataset.none = tr('No group or unit found.'); // the words of its ::before (style.css)
        convUnits.classList.toggle('calc-none-found', !convShown().length);
        if (q && convShown().length) convShown()[0].classList.add('calc-lit');
        unitCards.fit(); // the names of the units found, in their badges
    }

    // the rows the search shows
    function convShown() {
        return [].slice.call(convUnits.querySelectorAll('.calc-sv-row:not([hidden])'));
    }

    convSearch.addEventListener('input', convFilter, false);

    // Enter opens the card lit, the first at first, and the arrows go along them
    convSearch.addEventListener('keydown', function (e) {
        var rows = convShown(), at = rows.indexOf(convUnits.querySelector('.calc-sv-row.calc-lit'));
        if (!rows.length) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            at = rows[Math.max(0, at)];
            if (!at.parentNode.classList.contains('calc-on')) at.click();
            else if (convHits[UNIT_TOOLS.units[+at.parentNode.dataset.i].id]) at.dispatchEvent(new MouseEvent('click', { bubbles: true })); // its unit, the card staying open
            unitCards.focus();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (at > -1) rows[at].classList.remove('calc-lit');
            at = (Math.max(0, at) + (e.key === 'ArrowDown' ? 1 : rows.length - 1) + (at < 0 && e.key === 'ArrowDown' ? -1 : 0)) % rows.length;
            rows[at].classList.add('calc-lit');
            rows[at].scrollIntoView({ block: 'nearest' });
        }
    }, false);

    // a card found by a unit starts from it: before the card opens, or again if it is open
    convUnits.addEventListener('click', function (e) {
        var row = e.target.closest('.calc-sv-row'), item = row && row.parentNode, id = item && UNIT_TOOLS.units[+item.dataset.i].id;
        if (!id || !convHits[id]) return;
        unitCards.fill('u', convHits[id], id);
        if (!item.classList.contains('calc-on')) return;
        e.stopPropagation();
        convTabs();
    }, true);

    convButton.addEventListener('click', function () {
        showConv(!conv.classList.contains('calc-open'));
    }, false);

    conv.querySelector('.calc-past-close').addEventListener('click', function () {
        showConv(false);
    }, false);

    // A result in the display is the value of the card of the units open, as in the formulas
    function showConv(open) {
        if (!open && bigShut(conv)) return;
        if (!open) closeCalendar();
        if (open) {
            closePanels(conv);
            placePanel(conv);
            if (convTab === 'units' && !engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
                unitCards.fill('v', local(+(+engine.value).toPrecision(13)));
            }
        }
        conv.classList.toggle('calc-open', open);
        convButton.classList.toggle('calc-on', open);
        if (open) {
            convTabs();
            convFocus();
        } else if (conv.contains(document.activeElement)) {
            document.activeElement.blur(); // the keys are the calculator's again
        }
    }

    // A list to choose from, drawn as the calculator draws: a click or Enter, Space or
    // an arrow key opens it; the arrows go along it, Enter or a click chooses, Esc
    // closes it and leaves the panel open. pick gets the place of what was chosen
    function picker(el, pick) {
        var menu = el.querySelector('.calc-conv-menu');

        el.addEventListener('click', function (e) {
            var item = e.target.closest('.calc-conv-item');
            if (item) choosePicker(el, +item.dataset.i);
            else if (!menu.contains(e.target)) showPicker(el, menu.hidden);
        }, false);

        menu.addEventListener('mousemove', function (e) {
            var item = e.target.closest('.calc-conv-item');
            if (item) lightPicker(el, +item.dataset.i);
        }, false);

        el.addEventListener('keydown', function (e) {
            var k = e.which, n = el.choices.length, at = menu.hidden ? el.at : el.lit;
            if (k === 27 && !menu.hidden) {
                showPicker(el, false);
                e.stopPropagation(); // the panel stays open
            } else if (k === 9) {
                return showPicker(el, false); // Tab goes on to the next box
            } else if (k === 38 || k === 40) { // up and down
                if (menu.hidden) showPicker(el, true);
                else lightPicker(el, Math.min(n - 1, Math.max(0, at + (k === 40 ? 1 : -1))), true);
            } else if (k === 13 || k === 32) {
                if (menu.hidden) showPicker(el, true);
                else choosePicker(el, el.lit);
            } else if (k === 36 || k === 35) { // Home and End
                if (!menu.hidden) lightPicker(el, k === 36 ? 0 : n - 1, true);
            } else if (e.key && /^\p{L}$/u.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { // a letter: the next choice of it, the list opened
                at = startsWith(el.choices, e.key, at);
                if (at < 0) return;
                if (menu.hidden) showPicker(el, true);
                lightPicker(el, at, true);
            } else {
                return;
            }
            e.preventDefault();
        }, false);

        // a press anywhere else closes it; a list of a card, gone with its card, listens no more
        document.addEventListener('mousedown', function press(e) {
            if (!el.isConnected) return document.removeEventListener('mousedown', press, true);
            if (!menu.hidden && !el.contains(e.target)) showPicker(el, false);
        }, true);

        el.pick = pick;
    }

    // the first choice after from that starts with a letter, round to the start again; -1 of none
    function startsWith(choices, letter, from) {
        var i, at, text;
        letter = letter.toLowerCase();
        for (i = 1; i <= choices.length; i++) {
            at = (from + i) % choices.length;
            text = choices[at].replace(/<[^>]*>/g, '').trim().toLowerCase();
            if (text.charAt(0) === letter) return at;
        }
        return -1;
    }

    // its choices, as HTML, and the one chosen
    function setPicker(el, choices, at) {
        choices = choices.map(function (c) { return tr(c); }); // in the language in use
        el.choices = choices;
        el.at = at;
        el.querySelector('.calc-conv-chosen').innerHTML = choices[at];
    }

    function showPicker(el, open) {
        var menu = el.querySelector('.calc-conv-menu'), form;
        if (open) {
            [].forEach.call(root.querySelectorAll('.calc-conv-pick.calc-on'), function (other) { // one list at a time
                if (other !== el) showPicker(other, false);
            });
            hideTip();
            menu.innerHTML = el.choices.map(function (c, i) {
                return '<div class="calc-conv-item' + (i === el.at ? ' calc-on' : '') + '" role="option" data-i="' + i + '">' + c + '</div>';
            }).join('');
        }
        form = el.closest('.calc-sv-form');
        if (form) form.classList.toggle('calc-menu-open', open && form.scrollHeight <= form.clientHeight + 1); // beside the list as well, while it has no need to scroll
        if (el.closest('.calc-sv-item')) el.closest('.calc-sv-item').classList.toggle('calc-menu-open', open); // its card lets it out
        menu.hidden = !open;
        el.classList.toggle('calc-on', open);
        el.setAttribute('aria-expanded', open);
        if (open) {
            placeMenu(el, menu);
            lightPicker(el, el.at, true);
        }
    }

    // An open list in the room it has: under its box, or over it where there is more room there, as at the foot of
    // the cards; no taller than that room, so none of it is cut off by what scrolls round it
    function placeMenu(el, menu) {
        var room = menuRoom(el, 'overflowY'), at = el.getBoundingClientRect(), edge, below, above, k = scale();
        menu.classList.remove('calc-up');
        menu.style.maxHeight = '';
        sideMenu(el, menu);
        edge = room ? room.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
        below = (Math.min(edge.bottom, window.innerHeight) - at.bottom) / k - 8; // the screen's pixels as the calculator's, scaled or not
        above = (at.top - Math.max(edge.top, 0)) / k - 8;
        if (menu.offsetHeight <= below) return;
        if (above > below) menu.classList.add('calc-up');
        menu.style.maxHeight = Math.max(60, Math.min(parseFloat(getComputedStyle(menu).maxHeight) || 250, Math.max(above, below))) + 'px'; // no taller than it would be
    }

    // a list wider than the room at the right of its box, as in the popped-in panel, moved back in from the side it
    // would go past, so nothing scrolls sideways for it; no wider than the room, though narrower than its box then.
    // What the screen measures in its own pixels, as the calculator's: scaled, on the website, they differ
    function sideMenu(el, menu) {
        var room = menuRoom(el, 'overflowX'), edge, at, shift = 0, k = scale(), wide;
        menu.style.transform = '';
        menu.style.maxWidth = '';
        menu.style.minWidth = '';
        edge = room ? room.getBoundingClientRect() : { left: 0, right: document.documentElement.clientWidth };
        edge = { left: Math.max(edge.left, 0) + 8 * k, right: Math.min(edge.right, document.documentElement.clientWidth) - 8 * k };
        wide = (edge.right - edge.left) / k;
        if (wide < menu.offsetWidth) {
            menu.style.maxWidth = menu.style.minWidth = Math.max(60, wide) + 'px'; // min-width too, which is its box's
        }
        at = menu.getBoundingClientRect();
        if (at.right > edge.right) shift = edge.right - at.right;
        if (at.left + shift < edge.left) shift = edge.left - at.left;
        if (shift) menu.style.transform = 'translateX(' + Math.round(shift / k) + 'px)';
    }

    // What a list is kept inside, as the calendar is inside its panel: the first thing round it that cuts off what is
    // past its edges, the card if it scrolls, else the list of cards, else the panel; null, the window. Of a card open
    // beside the list in a panel popped out, Advanced mode, not that list, which it is out of, drawn in the panel
    function menuRoom(el, axis) {
        var room = el.parentNode, beside = el.closest('.calc-side > * :is(.calc-sv-form, .calc-fx-form)');
        while (room && room !== document.body && (!/(auto|scroll|hidden)/.test(getComputedStyle(room)[axis]) || (beside && room.classList.contains('calc-side')))) room = room.parentNode;
        return room && room !== document.body ? room : null;
    }

    // the choice the arrow keys or the pointer are on; scroll: kept in sight
    function lightPicker(el, i, scroll) {
        var items = el.querySelectorAll('.calc-conv-item');
        el.lit = i;
        [].forEach.call(items, function (item, k) {
            item.classList.toggle('calc-lit', k === i);
        });
        if (scroll && items[i]) items[i].scrollIntoView({ block: 'nearest' });
    }

    // then the value has the focus, to type in; or the box the list is of
    function choosePicker(el, i) {
        showPicker(el, false);
        if (i !== el.at) el.pick(i);
        focusBox(el.box || el);
    }

    // the tab shown, kept; the cards keep what is typed in each
    function saveConv() {
        store('conv', { t: convTab });
    }

    // The converter as it was left: its tab. Kept before the units were cards, its group, the unit of each group
    // and the value: in the card of the group, open
    function loadConv(s) {
        var g = s ? CalcUnits.units.map(function (group) { return group.c; }).indexOf(s.g) : -1;
        convTab = s && s.t === 'dates' ? 'dates' : 'units';
        if (g > -1 && !stored('convUnits')) {
            unitCards.put(UNIT_TOOLS.units[g].id, { v: typeof s.v === 'string' ? s.v : '', u: s.u && typeof s.u[s.g] === 'string' ? s.u[s.g] : '' });
        }
    }

    // the tip of close, and of what the dates have; a value has the tip of a result (peekOf)
    function convTip(el) {
        if (el.classList.contains('calc-past-close')) return CalcTips['converter close'];
        if (convUnits.contains(el)) return unitCards.tip(el);
        if (convDates.contains(el)) return dates.tip(el);
        return null;
    }

    // what an administrator turned off, which the options cannot turn on: the extension keeps it (policy.js), the website has none
    function policyOff(key) {
        var policy = stored('policy');
        return !!policy && policy[key] === false;
    }

    // the statistics, the formulas, the converter, the graph, the solver and the numbers have their button while they are
    // turned on in the options, and not turned off by an administrator. The graph's own window closes with the graph
    function setPanels(statsOn, fxOn, convOn, graphOn, solveOn, numbersOn, chemOn, physOn, bioOn) {
        statsOn = statsOn && !policyOff('statistics');
        fxOn = fxOn && !policyOff('formulas');
        convOn = convOn && !policyOff('converter');
        graphOn = graphOn && !policyOff('graph');
        solveOn = solveOn && !policyOff('solve');
        numbersOn = numbersOn && !policyOff('numbers');
        chemOn = chemOn && !policyOff('chemistry');
        physOn = physOn && !policyOff('physics');
        bioOn = bioOn && !policyOff('biology');
        if (!graphOn && graphPart.graphAlone) ask('graph-close');
        if (!chemOn && chemPart.chemAlone) ask('chem-close');
        if (panelAlone && !{ stats: statsOn, fx: fxOn, conv: convOn, solve: solveOn, numbers: numbersOn, phys: physOn, bio: bioOn }[panelAlone]) ask('panel-close');
        statsButton.hidden = !statsOn;
        fxButton.hidden = !fxOn;
        convButton.hidden = !convOn;
        graphButton.hidden = !graphOn;
        solveButton.hidden = !solveOn;
        numbersButton.hidden = !numbersOn;
        chemPart.chemButton.hidden = !chemOn;
        physButton.hidden = !physOn;
        bioButton.hidden = !bioOn;
        findOff = !(statsOn || fxOn || convOn || graphOn || solveOn || numbersOn || chemOn || physOn || bioOn); // no tool on, nothing to search
        findCalc.hidden = findOff;
        if (findButton) findButton.hidden = findOff;
        if (findOff && findShowing()) showFind(false);
        if (!statsOn) showStats(false);
        if (!fxOn) showFx(false);
        if (!convOn) showConv(false);
        if (!graphOn) showGraph(false);
        if (!solveOn) showSolve(false);
        if (!numbersOn) showNumbers(false);
        if (!chemOn) showChem(false);
        if (!physOn) showPhys(false);
        if (!bioOn) showBio(false);
    }

    // the panels as the options and the administrator have them now
    function readPanels() {
        setPanels(stored('statsOn') !== false, stored('fxOn') !== false, stored('convOn') !== false, stored('graphOn') !== false,
            stored('solveOn') !== false, stored('numbersOn') !== false, stored('chemOn') !== false, stored('physOn') !== false, stored('bioOn') !== false);
    }

    // the page tells of a change of the administrator's, which it heard first: it is not a storage event here
    root.addEventListener('calc-policy', readPanels, false);

    // newest first
    function renderPast() {
        var n = engine.past.length, i, p, row, eq, line, res, unit, del, held;

        pastShown = { list: engine.past, n: n, last: engine.past[n - 1], mode: shownMode() };
        pastList.textContent = '';
        for (i = n; i--;) {
            p = engine.pastLine(i, !!engine.past[i].frac); // shown as it was done: fractions, or decimals
            row = document.createElement('div');
            row.className = 'calc-past-row';
            row.dataset.i = i;
            eq = row.appendChild(document.createElement('div'));
            eq.className = 'calc-past-eq';
            pastButtons(eq, 'equation');
            line = eq.appendChild(document.createElement('span')); // keeps its order in the right to left box
            line.innerHTML = fmt.group ? CalcEngine.group(p.line, fmt.group) : p.line; // made by the engine, like the equation in the display
            if (p.unit) { // its angles are worked out in this unit again
                unit = line.insertBefore(document.createElement('span'), line.firstChild);
                unit.className = 'calc-past-unit';
                unit.textContent = p.unit;
            }
            if (p.letters) { // what its letters held then: A = 8
                held = row.appendChild(document.createElement('div'));
                held.className = 'calc-past-letters';
                // with a comma for the decimal mark, a semicolon between them: A = 2,5; B = 3
                held.textContent = engine.comma ? local(p.letters.replace(/, (?=[A-J] =)/g, '; ')) : p.letters;
            }
            res = row.appendChild(document.createElement('div'));
            res.className = 'calc-past-res';
            res.innerHTML = shownResult(engine.past[i], p.result).html;
            pastButtons(res, 'result');
            del = row.appendChild(document.createElement('span'));
            del.className = 'calc-past-del';
            del.innerHTML = '<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" ' +
                'stroke-width="2" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>';
            pastList.appendChild(row);
        }
        if (!n) pastList.innerHTML = '<div class="calc-fx-none">' + tr('No calculations yet') + '</div>'; // the letters are on the other tab
    }

    // A result in the history: as a fraction if it was done in fraction mode,
    // in degrees, minutes and seconds if in °′″, as each calculation keeps its
    // unit; else in the number format of the options, with separators if they are on.
    // text: what its copy button takes, as Ctrl+C would from the display
    function shownResult(entry, usual) {
        var value = entry.value, x = +value, f = entry.frac && CalcEngine.fraction(x), parts,
            s = entry.dms && CalcEngine.dms(x);
        if (s) return { html: fmt.group ? CalcEngine.group(s, fmt.group) : s, text: s };
        if (f) {
            parts = [String(Math.abs(f[0])), String(f[1])].map(function (part) {
                return fmt.group ? CalcEngine.group(part, fmt.group) : part;
            });
            return { html: (f[0] < 0 ? '-' : '') + CalcEngine.stack(parts[0], parts[1]), text: f[0] + '/' + f[1] };
        }
        s = CalcEngine.format(x, fmt) || usual;
        return { html: fmt.group ? CalcEngine.group(s, fmt.group) : s, text: value };
    }

    // the number format the history is shown in, to know when to show it again
    function shownMode() {
        return JSON.stringify(fmt);
    }

    // the arrow of a card that opens, on its header: down while it is closed, turned up while it is open
    function collapseButton() {
        return '<span class="calc-item-collapse" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" ' +
            'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4" /></svg></span>';
    }

    // The arrow of insert: up into the display. Drawn from the right, as the lines of the history have it;
    // the style mirrors it where it is wanted from the left, as on the Insert of a formula. fromLeft: drawn
    // from the left already, for what the style does not mirror, the cards of the Variables
    function insertIcon(fromLeft) {
        return '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round">' + (fromLeft ?
                '<path d="M3 13h5a2 2 0 0 0 2-2V3" /><path d="M7 6l3-3 3 3" />' :
                '<path d="M13 13h-5a2 2 0 0 1-2-2V3" /><path d="M9 6l-3-3-3 3" />') + '</svg>';
    }

    // insert and copy, on the left of a line; shown while the pointer is over it
    function pastButtons(part, what) {
        var box = part.appendChild(document.createElement('span'));
        box.className = 'calc-past-btns';
        box.innerHTML = pastButtonsHtml();
    }

    // the two of them, as a constant's row has them too
    function pastButtonsHtml() {
        return '<span class="calc-past-btn" data-act="insert">' + insertIcon() + '</span>' +
            '<span class="calc-past-btn" data-act="copy">' +
            '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" ' +
            'stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />' +
            '<path d="M10.5 3.5v-1a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1" /></svg>' +
            '</span>';
    }

    function usePast(i, whole) {
        var unit, ok;

        if (!engine.past[i]) return;
        unit = engine.pastLine(i).unit;
        ok = whole ? engine.recall(i, deg) : engine.put(+engine.past[i].value);
        if (!ok) return;
        if (whole && UNITS.indexOf(unit) > -1) setUnit(UNITS.indexOf(unit)); // shows its unit
        if (whole && !!engine.past[i].frac !== fracMode) toggleFraction(); // and its fractions, or decimals
        if (whole && !!engine.past[i].dms !== dmsMode) toggleDms(); // or degrees, minutes and seconds
        keyBoard['AC'].children[0].firstChild.data = 'C';
        showPast(false);
        refresh();
        saveState();
    }

    // ---------------- event listeners mouse --------------- //

    Calc.onmousedown = function (e) {
        var line = display.contains(e.target) ? display : logline.contains(e.target) ? logline : null;
        if (e.button === 2) return false; // a right click opens the menu, it presses no key
        // text can be selected; in a longer line this file does that itself, to slide it as well. Not the line above a result
        if (line) return line === display && line.scrollWidth <= line.clientWidth;
        keyDown(e);
        if (!pressedKey) return false;
        document.addEventListener('mouseout', keyUp, false);
        document.addEventListener('mouseover', keyDown, false);
        return false;
    }

    document.addEventListener('mouseup', function (e) {
        var event = e || window.event,
            target = getTargetKey(event.target),
            keyText = target.textContent.replace(/\s*/g, ''),
            key = keyBoard[keyText];

        document.removeEventListener('mouseout', keyUp, false);
        document.removeEventListener('mouseover', keyDown, false);
        if (!pressedKey) {
            return false;
        }
        if (key) {
            doKey(keyText);
            saveState();
        }
    }, false);

    // In a long equation a slide of the pointer selects its text, as in a line that
    // fits, and held still for a moment first it slides the line, to see the rest
    // of it. A finger does the other way round: it slides, and after a hold it selects.
    // The line above a result is not selected: it slides at once, and a double click opens it in the display
    // which dots, if any, are at x of a line: the box of them is solid out to the
    // edge of the line, and a click on it goes to that end
    function edgeAt(el, x) {
        var box = el.getBoundingClientRect(), side, st, w;

        for (side = 0; side < 2; side++) {
            if (!el.classList.contains(side ? 'calc-more-right' : 'calc-more-left')) continue;
            st = getComputedStyle(el, side ? '::after' : '::before');
            w = (parseFloat(st.width) + parseFloat(st.paddingLeft) + parseFloat(st.paddingRight)) * scale();
            if (side ? x > box.right - w : x < box.left + w) return side ? 'right' : 'left';
        }
        return '';
    }

    // slides a line to its start or its end
    function goEdge(el, side) {
        var from = el.scrollLeft, to = side === 'left' ? 0 : el.scrollWidth, t0 = null;

        function step(t) {
            var k;
            if (t0 === null) t0 = t;
            k = Math.min(1, (t - t0) / 200);
            slide(el, from + (to - from) * (1 - Math.pow(1 - k, 3)));
            if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    [display, logline].forEach(function (el) {
        el.addEventListener('pointerdown', function (e) {
            slid = false;
            endHold();
            if (edgeAt(el, e.clientX)) return; // a click on the dots, not a slide or a selection
            if (el.scrollWidth <= el.clientWidth || e.button) return; // a right click keeps what is selected, for the menu
            if (el === logline) return startSlide(el, e.clientX);
            window.getSelection().removeAllRanges(); // as a press in a line that fits does
            if (e.pointerType === 'touch') startSlide(el, e.clientX);
            else startPick(el, e.clientX);
            holdTimer = setTimeout(function () { // held long enough: the other one
                if (slid) return;
                if (sliding) startPick(el, sliding.x);
                else if (picking) startSlide(el, picking.x);
            }, 400);
        }, false);

        // a click in the equation puts the cursor there; on the line above a
        // result it puts the cursor into that finished equation
        el.addEventListener('pointermove', function (e) { // the dots under the pointer light up
            var side = edgeAt(el, e.clientX);
            el.classList.toggle('calc-edge-left', side === 'left');
            el.classList.toggle('calc-edge-right', side === 'right');
        }, false);

        el.addEventListener('pointerleave', function () {
            el.classList.remove('calc-edge-left', 'calc-edge-right');
        }, false);

        el.addEventListener('click', function (e) {
            var edge = edgeAt(el, e.clientX), n = clicks(e), spot, rect, placed;

            if (edge) { // the dots slide the line, and open nothing
                e.stopPropagation();
                return goEdge(el, edge);
            }
            // a drag that selected in one box ends in a click on that box: the selection stays
            if (el === display && n < 2 && !window.getSelection().isCollapsed) return;
            if (el === display && engine.edit && !slid && (spot = e.target.closest('[data-e],[data-r]'))) { // the cursor where it is clicked
                if (spot.hasAttribute('data-e')) {
                    rect = spot.getBoundingClientRect();
                    placed = engine.place(spot.getAttribute('data-e'), e.clientX > rect.left + rect.width / 2);
                } else {
                    placed = engine.place(spot.getAttribute('data-r'));
                }
                if (placed) {
                    refresh();
                    saveState();
                }
                // the second click of two: the number under it selected, or all of a box when on its frame;
                // the third of three: all of the box it is in, or of the line
                if (n >= 3 || (n === 2 && !spot.hasAttribute('data-e'))) {
                    selectRow(spot.hasAttribute('data-e') ? spot.getAttribute('data-e').split('|')[0] : spot.getAttribute('data-r'));
                } else if (n === 2) {
                    pickValue(el, e.clientX, e.clientY);
                }
                return;
            }
            // the second click of two: the first one put the cursor in, and wrote the line again
            if (n === 2 && !slid && el === display) return pickValue(el, e.clientX, e.clientY);
            if (slid || (el === display && !window.getSelection().isCollapsed)) return; // a slide or a selection, not a click
            if (el === logline) { // the equation above a result: a double click opens it, the cursor where it is clicked
                if (engine.edit || !(engine.done || engine.error)) return; // empty: a click on the screen
                e.stopPropagation(); // the screen's click would open it, the cursor at the end
                if (n !== 2) return; // one click leaves the result as it is
            }
            if (el === display && !engine.edit && (engine.done || engine.error)) return; // a result: nothing to put a cursor in
            spot = !engine.edit && e.target.closest('[data-e],[data-r]'); // drawn as the editor draws it: the cursor goes where it is clicked
            picked = spot && spot.getAttribute('data-e');
            if (spot && engine.startEdit()) {
                rect = spot.getBoundingClientRect();
                engine.place(spot.getAttribute(spot.hasAttribute('data-e') ? 'data-e' : 'data-r'), e.clientX > rect.left + rect.width / 2);
                unselect();
                refresh();
                saveState();
                spot = el === logline && picked && display.querySelector('[data-e="' + picked + '"]');
                if (spot) { // opened by a double click: the number it was on selected, in the line now edited
                    rect = spot.getBoundingClientRect();
                    pickValue(display, rect.left + rect.width / 2, rect.top + rect.height / 2);
                }
                return;
            }
            if (engine.point(textAt(el, e.clientX).n, deg)) {
                unselect(); // of the result, as the equation takes its place
                refresh();
                saveState();
            }
        }, false);
    });

    // a click anywhere on the screen but the equation, the line above it as well: the line to
    // edit, the cursor at its end. After a result, only a double click on its equation above it does that.
    // Not on what has a click of its own there: the buttons, the unit, the modes
    function editLine() {
        if (engine.edit ? !engine.move('end') : !engine.startEdit()) return;
        unselect();
        refresh();
        saveState();
    }

    display.parentNode.addEventListener('click', function (e) {
        var path = e.composedPath(); // as clicked: the equation may be drawn again since, its pieces gone from the page
        if (e.button || slid || !window.getSelection().isCollapsed || path.indexOf(display) > -1 ||
            (!engine.edit && (engine.done || engine.error) && path.indexOf(logline) < 0) || // a result stays: its equation above it is clicked to edit it
            e.target.closest('.calc-tools, .calc-rad, .calc-frac, .calc-fmt, .calc-mem, .notification, .calc-past')) return;
        editLine();
    }, false);

    // A double click selects the value under it, the whole number between its
    // operators, with the cursor in it or not, as it selects a word in a text;
    // or the operator or function it is on. A result alone is selected whole
    function pickValue(el, x, y) {
        var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), range = document.createRange(),
            chars = [], at = -1, gap = Infinity, node, i, r, d, a, b;

        function kind(c) { // a space, a part of a number, or of an operator or a function
            return /\s/.test(c.ch) ? 0 : /[\d.,]/.test(c.ch) ? 1 : 2;
        }

        function same(c, k) { // side by side: not a power above a number, or the other half of a fraction
            return kind(c) === kind(k) && Math.abs(c.r.top - k.r.top) < 1 && Math.abs(c.r.height - k.r.height) < 1;
        }

        if (el === display && !engine.edit && (engine.error || engine.done || engine.plain())) {
            return window.getSelection().selectAllChildren(el);
        }
        while ((node = walk.nextNode())) {
            for (i = 0; i < node.length; i++) {
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                r = range.getBoundingClientRect();
                if (!r.width) continue;
                chars.push({ node: node, i: i, ch: node.data.charAt(i), r: r });
                // the one the pointer is on, or else the nearest
                d = Math.max(r.left - x, x - r.right, 0) + Math.max(r.top - y, y - r.bottom, 0);
                if (d < gap) {
                    gap = d;
                    at = chars.length - 1;
                }
            }
        }
        if (at < 0 || !kind(chars[at])) return window.getSelection().removeAllRanges(); // a space: nothing to select
        for (a = at; a && same(chars[a - 1], chars[at]); a--);
        for (b = at; b < chars.length - 1 && same(chars[b + 1], chars[at]); b++);
        window.getSelection().setBaseAndExtent(chars[a].node, chars[a].i, chars[b].node, chars[b].i + 1);
    }

    // where x is in the text of a line: the text node and the offset in it, and
    // n, how many characters of the line are left of it
    function textAt(el, x) {
        var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), range = document.createRange(),
            n = 0, node, last = null, i, r;
        while ((node = walk.nextNode())) {
            for (i = 0; i < node.length; i++) {
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                r = range.getBoundingClientRect();
                if (r.width && x < r.left + r.width / 2) return { node: node, offset: i, n: n };
                n++;
            }
            last = node;
        }
        return { node: last || el, offset: last ? last.length : 0, n: n };
    }

    // from here the pointer slides the line
    function startSlide(el, x) {
        endPick();
        sliding = { el: el, x: x, left: el.scrollLeft };
        el.classList.toggle('calc-grab', !!holdTimer); // after a hold: the hand shows it
    }

    // from here the pointer selects, starting where it is
    function startPick(el, x) {
        var at = textAt(el, x);
        if (sliding) slide(el, sliding.left);
        sliding = null;
        picking = { el: el, node: at.node, offset: at.offset, x: x, edge: 0 };
        picking.timer = setInterval(function () { // at an edge the line moves along under the pointer
            if (!picking.edge) return;
            slide(picking.el, picking.el.scrollLeft + picking.edge * 8);
            pickTo(picking.x);
        }, 30);
        pickTo(x);
    }

    // selects from where the line was pressed to x
    function pickTo(x) {
        var box = picking.el.getBoundingClientRect(), at = textAt(picking.el, Math.max(box.left, Math.min(box.right, x)));
        if (!picking.el.contains(picking.node)) return endPick(); // the line was written again meanwhile
        picking.x = x;
        picking.edge = x < box.left + 16 * scale() ? -1 : x > box.right - 16 * scale() ? 1 : 0;
        window.getSelection().setBaseAndExtent(picking.node, picking.offset, at.node, at.offset);
    }

    function endPick() {
        if (!picking) return;
        clearInterval(picking.timer);
        picking = null;
    }

    // the pointer let go of the line
    function endHold() {
        clearTimeout(holdTimer);
        holdTimer = null;
        endPick();
        if (sliding) sliding.el.classList.remove('calc-grab');
        sliding = null;
    }

    document.addEventListener('pointermove', function (e) {
        var held = picking || sliding;
        if (!held) return;
        if (Math.abs(e.clientX - held.x) > 3) slid = true;
        if (picking) pickTo(e.clientX);
        else slide(sliding.el, sliding.left - (e.clientX - sliding.x) / scale());
    }, false);

    ['pointerup', 'pointercancel'].forEach(function (type) {
        document.addEventListener(type, endHold, false);
    });

    // ------------------- event related functions ------------------ //

    function keyDown(e, obj) { // works for mouse and key

        var event = e || window.event,
            target = obj || getTargetKey(event.target),
            keyText = target.textContent.replace(/\s*/g, ''),
            key = keyBoard[keyText];

        if (key) {
            keyUp(); // recover key in case of a javaScript Error
            pressedKey = key;
            key.className = key.className + ' calc-press';
        }
        return false;
    }

    function getTargetKey(elm) {
        while (elm !== Calc && elm.parentNode && elm.parentNode.style &&
            !/calc-(?:left|right)/.test(elm.parentNode.className)) {
            elm = elm.parentNode;
        }
        return elm;
    }

    function keyUp() {
        if (pressedKey && pressedKey !== secondActive) {
            pressedKey.className = pressedKey.className.replace(' calc-press', '');
            pressedKey = null;
        }
    }

    // ---------------- pop out ---------------- //

    // Every panel but the history pops out as the graph and the periodic table do: as big as the page on the website,
    // and in a window of its own in the extension, whose popup cannot grow, popup.html?panel=solve. Beside a list of
    // cards, the card open is in the middle; and all of it grows with the room
    var bigPanel = null, // the panel popped out
        panelAlone = '', // in the extension, the panel of this window
        BIG_PANELS = [
            { key: 'stats', panel: stats, show: showStats, render: renderStats },
            { key: 'fx', panel: fx, show: showFx, render: renderFx },
            { key: 'conv', panel: conv, show: showConv, render: convTabs },
            { key: 'solve', panel: solvePanel, show: showSolve, render: solver.render },
            { key: 'numbers', panel: numbersPanel, show: showNumbers, render: numbers.render },
            { key: 'phys', panel: physPanel, show: showPhys, render: physPart.phys.render },
            { key: 'bio', panel: bioPanel, show: showBio, render: bioPart.bio.render }
        ];

    // a panel, by itself or its name
    function bigOf(panel) {
        return BIG_PANELS.filter(function (p) { return p.panel === panel || p.key === panel; })[0];
    }

    // popped out wide: its list of cards at the left, the card open beside it. By the calculator's own width, as the
    // CSS (@container calculator): on the website, half of the page while the options are beside it
    function bigSide(panel) {
        return panel.classList.contains('calc-big-on') && root.clientWidth >= 760;
    }

    // A panel popped out, or in. The page may do it its own way: the extension opens it in a window of its own. True if it changed.
    // Popped in to close (shut), it is not drawn again: it is as it opens. Popped out closed, it opens popped out, drawn once
    function panelBig(panel, on, shut) {
        var p = bigOf(panel), opening = on && !panel.classList.contains('calc-open');
        if (!p || on === (bigPanel === panel) || (panelAlone && !on)) return false;
        hideTip();
        showMenu(false);
        if (on) {
            saveState();
            if (!ask('panel-big', { big: true, panel: p.key })) return p.show(false), false; // in its own window, and not here as well
            if (opening) closePanels(panel); // another popped out goes in first
        }
        bigPanel = on ? panel : null;
        root.classList.toggle('calc-panel-big', on);
        panel.classList.toggle('calc-big-on', on);
        if (!on) ask('panel-big', { big: false, panel: p.key });
        if (opening) p.show(true);
        else if (!shut) p.render();
        return true;
    }

    // Esc, and close in the panel's own window: popped out, it pops in; its own window closes
    function panelIn() {
        if (panelAlone) ask('panel-close'); else panelBig(bigPanel, false);
    }

    // A panel closing, as a value is put in: in its own window it stays, and the calculator comes up with the value;
    // popped out, it pops in first. True if it stays
    function bigShut(panel) {
        if (panelAlone && bigPanel === panel) return ask('panel-put'), true;
        panelBig(panel, false, true);
        return false;
    }

    // popped out, the tabs of a head too many for its room scroll sideways, faded at the side there are more
    [].forEach.call(root.querySelectorAll('.calc-past-head > .calc-solve-tabs, .calc-past-head > .calc-fx-tabs'), fadeEdges);

    // as narrow as a phone, the cards open in place again; wider, beside the list
    window.addEventListener('resize', function () {
        var list = bigPanel && bigPanel.querySelector('.calc-sv-list:not([hidden]), .calc-fx-list');
        if (!bigPanel) return;
        if (list && list.classList.contains('calc-side') !== bigSide(bigPanel)) bigOf(bigPanel).render();
        else if (bigPanel === stats) statsResized();
    }, false);

    // Beside the list, the line between it and the card, as the big graph's: dragged, the list is wider or narrower,
    // from SIDE_MIN to what leaves the card SIDE_CARD_MIN, and never past SIDE_MAX of the page; the same for every
    // panel, and kept. A double click puts it back as at first. In the panel's zoom (popScale), as the list is
    var SIDE_MIN = 300, // the list's rows, their badges at 10px, still read
        SIDE_CARD_MIN = 420,
        SIDE_MAX = 0.5;

    function sideWidth(w) {
        if (w) root.style.setProperty('--calc-side-w', w + 'px'); else root.style.removeProperty('--calc-side-w');
    }

    (function (w) {
        sideWidth(typeof w === 'number' && w >= SIDE_MIN && w < 10000 ? Math.round(w) : 0);
    })(stored('cardSide'));

    BIG_PANELS.map(function (p) { return p.panel; }).concat(chemPart.chemPanel).forEach(function (panel) {
        var split = panel.appendChild(document.createElement('div')), from = null;
        split.className = 'calc-side-split';
        split.addEventListener('pointerdown', function (e) {
            var list = panel.querySelector('.calc-side:not([hidden]), .calc-conv-pane'); // of the tab shown: the converter's other list keeps its class, hidden
            if (e.button || !list) return;
            e.preventDefault();
            split.setPointerCapture(e.pointerId);
            split.classList.add('calc-on');
            from = { x: e.clientX, w: list.offsetWidth };
        }, false);
        split.addEventListener('pointermove', function (e) {
            var room = panel.clientWidth / popZoom,
                rtl = CalcLang.rtl; // the list at the right (style.css)
            if (!from || !split.hasPointerCapture(e.pointerId)) return;
            sideWidth(Math.round(Math.max(SIDE_MIN, Math.min(room - 36 - SIDE_CARD_MIN, room * SIDE_MAX, from.w + (e.clientX - from.x) * (rtl ? -1 : 1) / popZoom))));
        }, false);
        split.addEventListener('lostpointercapture', function () {
            from = null;
            split.classList.remove('calc-on');
            store('cardSide', parseFloat(root.style.getPropertyValue('--calc-side-w')) || 0);
        }, false);
        onDouble(split, function () {
            sideWidth(0);
            store('cardSide', 0);
        }, false);
    });

    BIG_PANELS.forEach(function (p) {
        p.panel.querySelector('.calc-panel-size').addEventListener('click', function () {
            if (panelAlone === p.key) return popIn(p.key);
            panelBig(p.panel, bigPanel !== p.panel);
        }, false);
        // in its own window, close closes the window: before the panel's own close
        p.panel.querySelector('.calc-past-close').addEventListener('click', function (e) {
            if (panelAlone !== p.key) return;
            e.stopImmediatePropagation();
            ask('panel-close');
        }, true);
    });

    // the extension's window of a panel: only the panel, popped out
    root.addEventListener('calc-panel', function (e) {
        var p = bigOf((e.detail || {}).panel);
        if (!p) return;
        p.show(true);
        panelBig(p.panel, true);
        panelAlone = p.key;
        root.classList.add('calc-panel-alone');
    }, false);

    // Pop in, in a window of its own in the extension: the calculator comes up, opened if it is closed, with
    // this open in it as it is here, and this window closes. What to open is kept for it, with when (takePopIn)
    function popIn(key) {
        hideTip();
        saveState();
        if (key === 'chem') saveChem();
        store('popIn', { panel: key, at: Date.now() });
        ask('pop-in', { panel: key });
    }

    // The calculator, opened or come up for a pop in: the panel open, popped in. Not in a window of its own.
    // Taken away only once this calculator has stayed a moment: the popup popped out from may be open still,
    // behind that window, and hear it first, then be put out by the popup the extension opens, which needs it
    // too. One older than 10 seconds is of a calculator that never came
    function takePopIn() {
        var p = stored('popIn'), big;
        if (!p || graphPart.graphAlone || chemPart.chemAlone || panelAlone || homeAlone) return;
        if (Date.now() - p.at < 10000) {
            if (p.panel === 'graph') showGraph(true);
            else if (p.panel === 'chem') showChem(true, true);
            else if ((big = bigOf(p.panel))) big.show(true);
        }
        setTimeout(function () {
            try {
                if ((stored('popIn') || {}).at === p.at) localStorage.removeItem('popIn');
            } catch (e) { }
        }, Date.now() - p.at < 10000 ? 1500 : 0);
    }

    // Popped out, the bar above the head, and above the calculator in a tool's own window: the calculator, and each
    // tool turned on, by the icon of its button at the top left of the display and its name; the one shown marked,
    // and at the bottom the options and the guide. It is beside the calculator, not in it, which the page may scale
    var goBar = root.parentNode.querySelector('.calc-go'), goOpt = goBar.querySelector('.calc-go-opt'),
        home = false, // the calculator on its Calculator tab beside the rail: homeAlone, or the website in Advanced mode
        homeAlone = false, // in the extension, a tool's own window on its Calculator tab
        GO = [['fx', fxButton, 'Formulas'], ['conv', convButton, 'Converter'], ['graph', graphButton, 'Graph'],
            ['numbers', numbersButton, 'Numbers'], ['solve', solveButton, 'Solve'], ['chem', chemPart.chemButton, 'Chemistry'],
            ['phys', physButton, 'Physics'], ['bio', bioButton, 'Biology'], ['stats', statsButton, 'Statistics']];

    // The names under the icons of the rail: a short one where a language's own is too long for its room, as
    // Calculatrice, Calcul; the full name its title still. Where a language has none, its full name
    var RAIL = {
        Calculator: trc('rail', 'Calculator'), Search: trc('rail', 'Search'), Formulas: trc('rail', 'Formulas'),
        Converter: trc('rail', 'Converter'), Graph: trc('rail', 'Graph'), Numbers: trc('rail', 'Numbers'),
        Solve: trc('rail', 'Solve'), Chemistry: trc('rail', 'Chemistry'), Physics: trc('rail', 'Physics'),
        Biology: trc('rail', 'Biology'), Statistics: trc('rail', 'Statistics'), Options: trc('rail', 'Options'),
        Guide: trc('rail', 'Guide')
    };

    function railName(text) {
        return RAIL[text] && RAIL[text] !== text ? RAIL[text] : tr(text);
    }

    GO.forEach(function (g) {
        var item = document.createElement('span'), name = document.createElement('span');
        item.className = 'calc-go-item';
        item.dataset.go = g[0];
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', tr(g[2]));
        item.title = tr(g[2]); // its name, on a narrow page where the rail has its icon alone
        item.tabIndex = 0;
        name.textContent = railName(g[2]);
        item.appendChild(g[1].querySelector('svg').cloneNode(true));
        item.appendChild(name);
        goBar.insertBefore(item, goOpt);
    });
    [['[data-go="calc"]', 'Calculator'], ['.calc-go-find', 'Search'], ['[data-tab="options"]', 'Options'],
        ['[data-tab="guide"]', 'Guide']].forEach(function (g) {
        var name = goBar.querySelector(g[0] + ' > span');
        if (name) name.textContent = railName(g[1]);
    });

    // a name too long for the rail, as الرسم البياني, made a little smaller till it fits, not cut short; as small as
    // 7px, and cut short with … past that (style.css). Again as the rail is shown or changes size
    function fitRail() {
        goBar.querySelectorAll('.calc-go-item > span').forEach(function (name) {
            var size;
            name.style.fontSize = '';
            if (!name.clientWidth || name.scrollWidth <= name.clientWidth) return;
            size = parseFloat(getComputedStyle(name).fontSize) * name.clientWidth / name.scrollWidth;
            name.style.fontSize = Math.max(7, Math.floor(size * 4) / 4) + 'px';
        });
    }
    if (window.ResizeObserver) new ResizeObserver(fitRail).observe(goBar);

    // what is popped out: the graph, the periodic table, another panel, or nothing; or the calculator, on its
    // Calculator tab beside the rail
    function bigShown() {
        if (root.classList.contains('calc-big')) return 'graph';
        if (root.classList.contains('calc-chem-big')) return 'chem';
        if (bigPanel) return bigOf(bigPanel).key;
        return home ? 'calc' : '';
    }

    // the tools as their buttons are, turned on or off, and the one shown marked, scrolled into view on a short
    // page: as anything pops out or in
    function goMark() {
        var shown = bigShown(), on;
        GO.forEach(function (g) {
            goBar.querySelector('[data-go="' + g[0] + '"]').hidden = g[1].hidden;
        });
        [].forEach.call(goBar.children, function (item) {
            item.classList.toggle('calc-on', item.dataset.go === shown);
            if (item.dataset.go === shown) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
        });
        if ((on = goBar.querySelector('.calc-on'))) {
            goBar.scrollTop = Math.min(Math.max(goBar.scrollTop, on.offsetTop + on.offsetHeight + 8 - goBar.clientHeight), on.offsetTop - 8);
            // or sideways, the bar across the top on a phone
            goBar.scrollLeft = Math.min(Math.max(goBar.scrollLeft, on.offsetLeft + on.offsetWidth + 8 - goBar.clientWidth), on.offsetLeft - 8);
        }
    }

    new MutationObserver(goMark).observe(root, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(goMark).observe(tools, { attributes: true, subtree: true, attributeFilter: ['hidden'] });

    // Gone to from the bar: what is popped out goes in and closes, and the tool pops out in its place, or the
    // calculator shows. In a tool's own window in the extension, the window goes there, the calculator as well
    function goTo(key) {
        var from = bigShown();
        if (!from || key === from) return;
        hideTip();
        saveState();
        if (from === 'chem') saveChem();
        if (graphPart.graphAlone || chemPart.chemAlone || panelAlone || homeAlone) return ask('go', { to: key });
        if (from === 'graph') showGraph(false);
        else if (from === 'chem') showChem(false);
        else if (from !== 'calc') bigOf(from).show(false);
        if (key === 'graph') graphBig(true);
        else if (key === 'chem') chemBig(true);
        else if (key !== 'calc') panelBig(bigOf(key).panel, true);
    }

    // the options, or the guide: the page the ? opens, on that tab; on the website beside what is popped out, or over
    // it on a small screen, as beside the calculator
    function goOptions(tab) {
        hideTip();
        saveState();
        goBar.dispatchEvent(new CustomEvent('calc-options', { bubbles: true, detail: { over: true, tab: tab } }));
    }

    function goItem(item) {
        if (item === findButton) showFind(!findShowing());
        else if (item.dataset.tab) goOptions(item.dataset.tab);
        else goTo(item.dataset.go);
    }

    goBar.addEventListener('click', function (e) {
        var item = e.target.closest('.calc-go-item');
        if (item) goItem(item);
    }, false);

    // Enter or the space bar on one goes there, and is not typed on the keys
    goBar.addEventListener('keydown', function (e) {
        var item = e.target.closest('.calc-go-item');
        if (!item || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        e.stopPropagation();
        goItem(item);
    }, false);

    // The extension's window of a tool, on its Calculator tab: the calculator, with the bar above it. A tool's button
    // at the top left of the display goes to the tool, popped out in this window, as the bar does; the history opens
    // over the keys still
    // in the extension's popup and detached window, the button beside the ?: the calculator in a big window of its
    // own, with the rail of the tools, on its Calculator tab
    root.querySelector('.calc-open-big').addEventListener('click', function () {
        hideTip();
        saveState();
        ask('open-big');
    }, false);

    // The website in Advanced mode, as the extension's Advanced mode opens it, { page: true, on }: the same, in the
    // page itself, without a window of its own; a tool goes out of it, popped out on the page, as from the bar.
    // Standard chosen there, what is popped out goes in and closes, and the calculator shows
    root.addEventListener('calc-home', function (e) {
        var d = e.detail || {};
        if (home && d.on === false && d.page) goTo('calc');
        home = d.on !== false;
        homeAlone = home && !d.page;
        root.classList.toggle('calc-home', home);
        goMark();
        if (graphPart.linkWaits) showLink(); // a graph of a link, popped out now (takeLink)
    }, false);

    // there, pop in and close at the top right, as every tool's: pop in brings the calculator back where it was
    // popped out from, the popup or the detached window, and this window closes; close closes it. On the website,
    // pop in shows the calculator as in Standard mode (app.js)
    (function (acts) {
        function press(button) {
            hideTip();
            saveState();
            ask(button.classList.contains('calc-home-in') ? 'pop-in' : 'home-close');
        }
        acts.addEventListener('click', function (e) {
            var button = e.target.closest('.calc-home-acts > span');
            if (button && home) press(button);
        }, false);
        acts.addEventListener('keydown', function (e) {
            var button = e.target.closest('.calc-home-acts > span');
            if (!button || !home || (e.key !== 'Enter' && e.key !== ' ')) return;
            e.preventDefault();
            e.stopPropagation();
            press(button);
        }, false);
    })(root.parentNode.querySelector('.calc-home-acts'));

    tools.addEventListener('click', function (e) {
        var g = bigShown() === 'calc' && GO.filter(function (g) { return g[1].contains(e.target); })[0];
        if (!g) return;
        e.stopImmediatePropagation();
        goTo(g[0]);
    }, true);

    // ---------------- search ---------------- //

    // Search, under the calculator on the rail and beside the history in the calculator, and Ctrl+K (⌘K on a Mac): one box over all of it that
    // finds the tools and their tabs, every card, formula, constant and example of the graph, the elements and the groups of
    // units, by their names and what they are: their tips, and a card's boxes and choices too. The best first: a name that is what is typed, then one that starts with it,
    // then one with a word that does; the arrows go along them and Enter or a click goes there, the tool popped out in place
    // of what is, the card open. In the extension a tool has a window of its own: what was found is kept for it ('found'),
    // and it opens that as the window goes there. From the calculator, not popped out, it is a panel over the keys as
    // the history is, its box and list moved into it, and what is found opens in its panel there
    var findOff = false, // every tool turned off, so no search
        findBox = root.parentNode.querySelector('.calc-find'),
        findButton = goBar.querySelector('.calc-go-find'),
        findWide = findBox.querySelector('.calc-find-box'),
        findPh = findBox.querySelector('.calc-find-input').placeholder, // in full, beside the rail
        findBar = findBox.querySelector('.calc-find-bar'),
        findFrom = '', // what was popped out as it opened, bigShown(): it closes as that pops in or out
        findInput = findBox.querySelector('.calc-find-input'),
        findKey = findBox.querySelector('.calc-find-bar kbd'),
        findClear = findBox.querySelector('.calc-find-clear'), // an x at the end while there is text, in place of Esc
        findList = findBox.querySelector('.calc-find-list'),
        findAll = [], // everything there is to find, made as the search opens: the decimal mark and the tools on may have changed
        findShown = [], // what the list shows, the best first
        findAt = 0, // the one lit, which Enter goes to
        FIND_PANELS = { fx: fx, conv: conv, graph: graph, numbers: numbersPanel, solve: solvePanel, chem: chemPart.chemPanel, phys: physPanel, bio: bioPanel, stats: stats },
        FIND_SHOW = { fx: showFx, conv: showConv, graph: showGraph, numbers: showNumbers, solve: showSolve, chem: showChem, phys: showPhys, bio: showBio, stats: showStats };

    // The other names an element is known by in the language in use, so Search finds it by them as well: its symbol
    // and the names, Zn زنك, apart by ; where there are several elements. The English has only the names themselves
    var chemAlso = null;
    function chemAlsoCalled(sym) {
        if (!chemAlso) {
            chemAlso = {};
            tr('Zn Zinc').split(';').forEach(function (part) {
                var words = part.trim().split(/\s+/);
                if (words.length > 1) chemAlso[words[0]] = words.slice(1).join(' ');
            });
        }
        return chemAlso[sym] || '';
    }

    function findIndex() {
        var all = [], names = {};
        GO.forEach(function (g) { names[g[0]] = tr(g[2]); });

        // a tab's name as its panel shows it: the periodic table's in full
        function tabName(go, tab) {
            var t = FIND_PANELS[go].querySelector('.calc-past-head [data-tab="' + tab + '"]');
            return t ? (t.querySelector('.calc-tab-long') || t).textContent.trim() : '';
        }

        // its name in the language in use, without its tags, lowercase, to rank by; and every word it is found by, in that
        // language and in English
        function add(entry, words) {
            var english = entry.t;
            entry.t = tr(entry.t);
            entry.name = entry.t.replace(/<[^>]*>/g, '').toLowerCase();
            entry.words = [entry.name, english, entry.w].concat(words, CalcLang.code === 'en' ? [] : words.map(tr)).join(' ').replace(/<[^>]*>/g, ' ').toLowerCase();
            all.push(entry);
        }

        // the words of a tip, its name and what it says
        function tipWords(tip) {
            return tip ? [tip.t, tip.d] : [];
        }

        // A card's words besides its name and what it does, which is its tip: its boxes' names and what they hold, its
        // choices, and the tip of each choice. Of a card whose boxes go with what is chosen, the boxes it starts with
        function fieldWords(tool) {
            var fields;
            try {
                fields = typeof tool.fields === 'function' ? tool.fields({}) : tool.fields;
            } catch (e) {
                return [];
            }
            return (fields || []).reduce(function (words, f) {
                words.push(f.l || '', f.ph || '', f.aria || '', f.name || '');
                (f.choice || []).forEach(function (c, i) {
                    words.push(typeof c === 'string' ? c : '');
                    words = words.concat(tipWords(CalcTips['choice ' + f.k + ' ' + i]));
                });
                return words;
            }, []);
        }

        GO.forEach(function (g) {
            add({ go: g[0], kind: 'tool', t: g[2], s: '', w: '' }, []);
            [].forEach.call(FIND_PANELS[g[0]].querySelectorAll('.calc-past-head [data-tab]'), function (el) {
                add({ go: g[0], kind: 'tab', tab: el.dataset.tab, t: tabName(g[0], el.dataset.tab), s: '', w: names[g[0]] }, tipWords(CalcTips[g[0] + ' tab ' + el.dataset.tab]));
            });
        });
        [['solve', solvePart.SOLVE_TOOLS], ['numbers', numPart.NUMBER_TOOLS], ['phys', physPart.PHYS_TOOLS], ['bio', bioPart.BIO_TOOLS], ['chem', chemPart.CHEM_TOOLS], ['conv', DATE_TOOLS], ['stats', TEST_TOOLS]].forEach(function (p) {
            Object.keys(p[1]).forEach(function (tab) {
                p[1][tab].forEach(function (tool) {
                    var f = [].concat(tool.f || []);
                    add({ go: p[0], kind: 'card', id: tool.id, t: tool.t, s: f.join('<i class="calc-find-gap">·</i>'), w: names[p[0]] + ' · ' + tabName(p[0], tab) }, [tool.d].concat(f, fieldWords(tool)));
                });
            });
        });
        fxItems.formulas.forEach(function (entry) {
            add({ go: 'fx', kind: 'formula', id: entry.item.t, t: entry.item.t, s: entry.item.f, w: tr('Formulas') + ' · ' + tr(entry.c) }, [entry.words]);
        });
        fxItems.constants.forEach(function (entry) {
            add({ go: 'fx', kind: 'constant', id: entry.item.t, t: entry.item.t, s: entry.item.s + ' = ' + constantValue(entry.item), w: tr('Constants') + ' · ' + tr(entry.c) }, [entry.words]);
        });
        graphPart.graphExItems.forEach(function (entry, i) {
            add({ go: 'graph', kind: 'example', id: i, t: entry.ex.t, s: entry.ex.f.map(function (text) { return escaped(exampleText(text)); }).join('<i class="calc-find-gap">·</i>'),
                w: tr('Graph') + ' · ' + tr(entry.c) }, [entry.words]);
        });
        CalcChem.elements.forEach(function (e) {
            add({ go: 'chem', kind: 'element', id: e.z, sym: e.s.toLowerCase(), t: e.name, s: e.z + ' · ' + e.s, w: tr('Periodic table') }, [e.s, chemAlsoCalled(e.s)]);
        });
        CalcUnits.units.forEach(function (group, i) {
            add({ go: 'conv', kind: 'units', id: i, units: group.list.map(function (u) { return u.s.toLowerCase(); }).concat(group.list.map(function (u) { return u.t.toLowerCase(); })), t: group.c, s: group.list.slice(0, 6).map(function (u) { return u.s; }).join(', ') + (group.list.length > 6 ? ', …' : ''), w: 'Converter · Units' },
                group.list.map(function (u) { return u.s + ' ' + u.t; }));
        });
        return all;
    }

    // how near what is typed an entry is, 0 the nearest; -1 not found. An element by its symbol or number, and a group of
    // units by one of its units, kg or meters, are as near as their names
    function findRank(entry, q, words) {
        if (!words.every(function (w) { return entry.words.indexOf(w) > -1; })) return -1;
        if (entry.name === q || (entry.kind === 'element' && (entry.sym === q || String(entry.id) === q)) || (entry.units && entry.units.indexOf(q) > -1)) return 0;
        if (entry.name.lastIndexOf(q, 0) === 0) return 1;
        if (entry.name.indexOf(' ' + q) > -1 || entry.name.indexOf('(' + q) > -1) return 2;
        if (entry.name.indexOf(q) > -1) return 3;
        if (words.every(function (w) { return entry.name.indexOf(w) > -1; })) return 4;
        return 5;
    }

    // the entries found, the best first and up to 60, of the tools turned on; while nothing is typed, the tools to go to.
    // Each with the icon of its tool, as its button has it
    function renderFind() {
        var q = findInput.value.trim().toLowerCase().replace(/\s+/g, ' '), words = q.split(' ').filter(Boolean),
            on = GO.filter(function (g) { return !g[1].hidden; }).map(function (g) { return g[0]; }), icons = {};
        GO.forEach(function (g) { icons[g[0]] = g[1].querySelector('svg').outerHTML; });
        findKey.hidden = !!findInput.value;
        findClear.hidden = !findInput.value;
        findShown = findAll.filter(function (entry) { return on.indexOf(entry.go) > -1 && (q || entry.kind === 'tool'); }).map(function (entry, i) {
            return { entry: entry, rank: q ? findRank(entry, q, words) : 0, i: i };
        }).filter(function (r) { return r.rank > -1; }).sort(function (a, b) {
            return a.rank - b.rank || a.i - b.i;
        }).slice(0, 60).map(function (r) { return r.entry; });
        findList.innerHTML = (q ? '' : '<div class="calc-find-head">' + tr('Go to') + '</div>') + findShown.map(function (entry, i) {
            return '<div class="calc-find-item" role="option" id="calc-find-' + i + '" data-i="' + i + '"><span class="calc-find-icon" aria-hidden="true">' + icons[entry.go] + '</span>' +
                '<span class="calc-find-text"><span class="calc-find-top"><span class="calc-find-name">' + entry.t + '</span>' +
                (entry.w ? '<span class="calc-find-where">' + entry.w + '</span>' : '') + '</span>' + (entry.s ? '<span class="calc-find-sub">' + entry.s + '</span>' : '') + '</span></div>';
        }).join('') || '<div class="calc-find-none">' + tr('Nothing found') + '</div>';
        findList.scrollTop = 0;
        findLight(0);
    }

    // the one Enter goes to, lit and scrolled into view
    function findLight(i) {
        var item;
        findAt = 0;
        if (!findShown.length) return findInput.removeAttribute('aria-activedescendant');
        findAt = (i + findShown.length) % findShown.length;
        [].forEach.call(findList.querySelectorAll('.calc-find-item'), function (el) {
            el.classList.toggle('calc-on', +el.dataset.i === findAt);
            el.setAttribute('aria-selected', String(+el.dataset.i === findAt));
        });
        item = findList.querySelector('.calc-find-item.calc-on');
        findInput.setAttribute('aria-activedescendant', item.id);
        item.scrollIntoView({ block: 'nearest' });
    }

    function findShowing() {
        return !findBox.hidden || findPanel.classList.contains('calc-open');
    }

    // Opened over what is popped out, the page closing the options over it, if they are open; or from the calculator,
    // a panel over the keys, the others closed. q: what to search for at first
    function showFind(open, q) {
        var small = open && !bigShown();
        if (open && findOff) return;
        hideTip();
        if (open) {
            findFrom = bigShown();
            if (small) {
                closePanels(findPanel);
                placePanel(findPanel);
            } else {
                ask('find');
            }
            (small ? findPanel : findWide).appendChild(findBar);
            (small ? findPanel : findWide).appendChild(findList);
            findInput.placeholder = small ? tr('Search cards, formulas, units…') : findPh; // the panel's narrow
        } else if (findBox.contains(document.activeElement) || findPanel.contains(document.activeElement)) {
            document.activeElement.blur(); // the keys are the calculator's again
        }
        findBox.hidden = !open || small;
        findPanel.classList.toggle('calc-open', small);
        findButton.classList.toggle('calc-find-on', open && !small);
        findCalc.classList.toggle('calc-on', small);
        if (open) {
            findAll = findIndex();
            findInput.value = q || '';
            renderFind();
            findInput.focus();
        }
    }

    // the panel closed, as another opens or a press is outside it
    function closeFindPanel() {
        if (findPanel.classList.contains('calc-open')) showFind(false);
    }

    // There: the tool popped out in place of what is, as the rail goes to it, then what was found opened in it. In the
    // extension's windows, the window goes there and takes what was found from the storage as it opens (takeFound).
    // From the calculator, nothing popped out, its panel over the keys, as its button opens it
    function findGo(entry) {
        var hit = { go: entry.go, kind: entry.kind, tab: entry.tab, id: entry.id }, from = bigShown();
        showFind(false);
        if (!from) {
            if (!FIND_PANELS[hit.go].classList.contains('calc-open')) FIND_SHOW[hit.go](true);
            return findOpen(hit);
        }
        if (hit.go === from) return findOpen(hit);
        if (graphPart.graphAlone || chemPart.chemAlone || panelAlone || homeAlone) {
            store('found', { hit: hit, at: Date.now() });
            return goTo(hit.go);
        }
        goTo(hit.go);
        findOpen(hit);
    }

    // what was found opened in its tool, shown: a card open on its tab, its boxes as they were left; a formula open, a
    // constant to put in; an example drawn; an element chosen on the table; a group of units; or the tab alone
    function findOpen(hit) {
        var p, tab;
        if (hit.kind === 'tool') return;
        if (hit.go === 'solve' || hit.go === 'numbers' || hit.go === 'phys' || hit.go === 'bio') {
            p = { solve: solver, numbers: numbers, phys: physPart.phys, bio: bioPart.bio }[hit.go];
            if (hit.kind === 'put') p.put(hit.id, hit.kept); // a formula's card, with what was typed in the formula
            else if (hit.kind === 'card') p.go(hit.id); else p.setTab(hit.tab);
        } else if (hit.go === 'stats') {
            if (hit.kind === 'card') statTests.go(hit.id);
            tab = hit.kind === 'card' ? 'tests' : hit.tab;
            if (statsTab !== tab) setStatsTab(tab); else renderStats();
            saveState();
            if (statsTab === 'tests') statTests.focus();
            else if (focusBox(statsInput)) statsInput.setSelectionRange(statsInput.value.length, statsInput.value.length);
        } else if (hit.go === 'chem') {
            chemGoTo(hit); // chem-panel.js
        } else if (hit.go === 'conv') {
            if (hit.kind === 'card') dates.go(hit.id);
            if (hit.kind === 'units') {
                unitCards.go(UNIT_TOOLS.units[hit.id].id);
                convSearch.value = ''; // its card in sight
            }
            convTab = hit.kind === 'card' ? 'dates' : hit.kind === 'units' ? 'units' : hit.tab;
            convTabs();
            saveConv();
            convFocus();
        } else if (hit.go === 'fx') {
            if (hit.kind === 'tab') {
                fxTab = hit.tab;
                store('fxTab', fxTab);
                fxSearch.value = '';
                renderFx();
                focusBox(fxSearch);
            } else {
                showFxItem(hit.kind === 'formula' ? 'formulas' : 'constants', hit.id);
            }
        } else if (hit.go === 'graph') {
            if (hit.kind === 'example' && graphPart.graphExItems[hit.id]) putExample(graphPart.graphExItems[hit.id].ex);
            else if (hit.kind === 'tab') showGraphTab(hit.tab);
        }
    }

    // A window of the extension gone to from the search of another: what was found, if it is of the tool here. Taken
    // once; one older than 10 seconds is of a window that never came
    function takeFound() {
        var f = stored('found');
        if (!f || !f.hit || Date.now() - f.at > 10000 || f.hit.go !== bigShown()) return;
        try {
            localStorage.removeItem('found');
        } catch (e) { }
        findOpen(f.hit);
    }

    // the page has said this is a tool's own window (popup.js): after the tool's own handlers have popped it out
    ['calc-graph', 'calc-chem', 'calc-panel'].forEach(function (name) {
        root.addEventListener(name, takeFound, false);
    });

    findCalc.addEventListener('click', function () {
        showFind(!findShowing());
    }, false);

    findPanel.querySelector('.calc-past-close').addEventListener('click', function () {
        showFind(false);
    }, false);

    // Pop out: the calculator in the big window, beside the rail, on its Calculator tab, the search open there with
    // what was typed; on the website, Advanced in the page. Kept for it as 'findOpen', as 'found' is
    findPanel.querySelector('.calc-panel-size').addEventListener('click', function () {
        var q = findInput.value;
        showFind(false);
        store('findOpen', { q: q, at: Date.now() });
        saveState();
        ask('open-big');
    }, false);

    // the calculator on its Calculator tab, beside the rail, as the search popped out: open, once, with what was typed
    function takeFindOpen() {
        var f = stored('findOpen');
        if (!f || Date.now() - f.at > 10000 || bigShown() !== 'calc') return;
        try {
            localStorage.removeItem('findOpen');
        } catch (e) { }
        showFind(true, typeof f.q === 'string' ? f.q : '');
    }

    root.addEventListener('calc-home', takeFindOpen, false);

    findInput.addEventListener('input', renderFind, false);

    // the x empties the box, and the focus stays in it
    findClear.addEventListener('mousedown', function (e) {
        e.preventDefault();
    }, false);

    findClear.addEventListener('click', function (e) {
        e.preventDefault();
        findInput.value = '';
        renderFind();
        findInput.focus();
    }, false);

    // the arrows go along the list, Enter goes to the one lit, Esc closes it
    findInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') findLight(findAt + (e.key === 'ArrowDown' ? 1 : -1));
        else if (e.key === 'Enter' && findShown[findAt]) findGo(findShown[findAt]);
        else if (e.key === 'Escape') showFind(false);
        else return;
        e.preventDefault();
        e.stopPropagation();
    }, false);

    // a click on one goes there; one outside the box closes it; the pointer lights the one it is on
    findList.addEventListener('click', function (e) {
        var item = e.target.closest('.calc-find-item');
        if (item) findGo(findShown[+item.dataset.i]);
    }, false);

    findBox.addEventListener('click', function (e) {
        if (!e.target.closest('.calc-find-box')) showFind(false);
    }, false);

    findList.addEventListener('mousemove', function (e) {
        var item = e.target.closest('.calc-find-item');
        if (item && +item.dataset.i !== findAt) findLight(+item.dataset.i);
    }, false);

    // Ctrl+K, ⌘K on a Mac, opens it or closes it; before the keys of the calculator take it
    document.addEventListener('keydown', function (e) {
        if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.code !== 'KeyK') return;
        e.preventDefault();
        e.stopPropagation();
        showFind(!findShowing());
    }, true);

    // what is popped out goes in, or the calculator pops out: the search closes, as what it opens in has gone
    new MutationObserver(function () {
        if (findShowing() && bigShown() !== findFrom) showFind(false);
    }).observe(root, { attributes: true, attributeFilter: ['class'] });

    // what a panel's own window saved, or the calculator's while it is open: the same here
    function panelSaved(key) {
        var s;
        if (key === 'solve' || key === 'numbers' || key === 'phys' || key === 'bio') {
            (s = { solve: solver, numbers: numbers, phys: physPart.phys, bio: bioPart.bio }[key]).load(stored(key));
            if (s.open()) s.render();
        } else if (key === 'dates' || key === 'conv' || key === 'convUnits') {
            if (key === 'dates') dates.load(stored('dates')); else if (key === 'convUnits') unitCards.load(stored('convUnits')); else loadConv(stored('conv'));
            if (conv.classList.contains('calc-open')) convTabs();
        } else if (key === 'fxTab') {
            if (/^(formulas|constants)$/.test(stored('fxTab'))) fxTab = stored('fxTab');
            if (fx.classList.contains('calc-open')) renderFx();
        } else if (key === 'pastTab') {
            if (/^(history|vars)$/.test(stored('pastTab'))) pastTab = stored('pastTab');
            if (past.classList.contains('calc-open')) renderPastTab();
        } else {
            s = stored(key);
            if (key === 'stat' && typeof s === 'string') statsTexts.list = s;
            if (key === 'statPairs' && typeof s === 'string') statsTexts.pairs = s;
            if (key === 'statTab') statsTab = /^(pairs|tests)$/.test(s) ? s : 'list';
            if (key === 'statBy') setStatsBy(Math.max(0, BY.map(function (by) { return by[0]; }).indexOf(s)));
            if (key === 'statFit') setStatsFit(s);
            if (key === 'statTests') statTests.load(s);
            if (document.activeElement !== statsInput && statsTab !== 'tests') statsInput.value = statsTexts[statsTab];
            statsTiles();
            if (stats.classList.contains('calc-open')) renderStats();
        }
    }

    // ---------------- saved state ---------------- //

    // a damaged value reads as missing, and a full or blocked storage must not break the calculator
    function stored(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    }

    // what this page saved last of each key: the website hears its own saves as changes too
    var ownSaves = {};

    function store(key, value) {
        try {
            ownSaves[key] = JSON.stringify(value);
            localStorage.setItem(key, ownSaves[key]);
        } catch (e) { }
    }

    // The format is not saved here: the options page keeps it, and saving it could undo a change made there.
    // The graph's own window saves only the graph and the calculation, the two it changes: the rest it
    // has from when it opened, and the calculator may have changed it since
    function saveState() {
        if (!chemPart.chemAlone && !panelAlone) {
            storeGraph(); // graph.js
        }
        store('calc', engine.save());
        if (!graphPart.graphAlone && !chemPart.chemAlone && (!panelAlone || panelAlone === 'stats')) {
            store('stat', statsTexts.list);
            store('statPairs', statsTexts.pairs);
            store('statTab', statsTab);
            store('statBy', BY[statsBy.at][0]);
            store('statFit', statsFit);
        }
        if (graphPart.graphAlone || chemPart.chemAlone || panelAlone) return;
        store('secondActive', secondActive);
        store('deg', deg === 2 ? 'grad' : deg === 1); // true or false for Deg and Rad, as before Grad came
        store('fraction', fracMode);
        store('dms', dmsMode);
        store('memory', engine.memory);
    }

    // back as it was left, after the popup is closed or the page reloaded
    function loadState() {
        var s = {};

        // all read first: the keys pressed below must not save over what is still to be read
        ['secondActive', 'deg', 'stat', 'statPairs', 'statTab', 'statBy', 'statFit', 'statTests', 'statsOn', 'fxOn', 'fxTab', 'convOn', 'conv', 'convUnits', 'dates', 'graphOn', 'graph', 'solveOn', 'solve', 'numbersOn', 'numbers', 'physOn', 'phys', 'bioOn', 'bio', 'chemOn', 'chem', 'chemView', 'fraction', 'dms', 'format', 'memory', 'calc'].forEach(function (key) {
            s[key] = stored(key);
        });
        if (s.secondActive) {
            keyDown(false, keyBoard['2nd']);
            doKey('2nd', true);
        }
        setUnit(s.deg === true ? 1 : s.deg === 'grad' ? 2 : 0);
        if (typeof s.stat === 'string') statsTexts.list = s.stat;
        if (typeof s.statPairs === 'string') statsTexts.pairs = s.statPairs;
        if (/^(pairs|tests)$/.test(s.statTab)) statsTab = s.statTab;
        if (statsTab !== 'tests') statsInput.value = statsTexts[statsTab];
        setStatsFit(s.statFit);
        statsTiles();
        statTests.load(s.statTests);
        setStatsBy(Math.max(0, BY.map(function (by) { return by[0]; }).indexOf(s.statBy)));
        // all on, until changed in the options
        setPanels(s.statsOn !== false, s.fxOn !== false, s.convOn !== false, s.graphOn !== false, s.solveOn !== false, s.numbersOn !== false, s.chemOn !== false, s.physOn !== false, s.bioOn !== false);
        loadGraph(s.graph);
        solver.load(s.solve);
        numbers.load(s.numbers);
        physPart.phys.load(s.phys);
        bioPart.bio.load(s.bio);
        chemPart.chemCards.load(s.chem);
        loadChem(s.chemView);
        if (/^(formulas|constants)$/.test(s.fxTab)) fxTab = s.fxTab;
        unitCards.load(Object.assign({}, s.convUnits, { open: '' })); // what was typed in them kept, but every card closed
        loadConv(s.conv);
        dates.load(Object.assign({}, s.dates, { open: '' }));
        fracMode = engine.fraction = !!s.fraction;
        dmsMode = engine.dms = !fracMode && !!s.dms; // not both
        setFormat(s.format);
        engine.memory = +s.memory || 0;
        try {
            if (s.calc) engine.load(s.calc);
        } catch (e) {
            engine.reset();
        }
        if (engine.entry === 'typing') keyBoard['AC'].children[0].firstChild.data = 'C';
        refresh();
    }

    // The number format or the panels were changed on the options page, or by an administrator.
    // The graph, the calculation, the angle unit and the chemistry follow another page of the calculator: the
    // graph's and the table's own windows and the popup or the detached window show the same ones. Not what this page saved
    window.addEventListener('storage', function (e) {
        if (e.key === 'popIn') return takePopIn(); // the detached window, open as a panel's own window pops in
        if (e.key === 'found') return takeFound(); // this window, open already, gone to from the search of another
        if (e.key === 'findOpen') return takeFindOpen(); // and on its Calculator tab, from the search popped out
        if (e.key === 'lang') { // another language chosen on the options page: drawn again in it, the options left open
            const over = document.querySelector('.options-over');
            try {
                if (over && !over.hidden) sessionStorage.setItem('optionsOpen', document.querySelector('.calc-opt-on')?.dataset.tab || 'options');
            } catch (err) { }
            return location.reload();
        }
        if (e.newValue !== null && e.newValue === ownSaves[e.key]) return;
        if (e.key === 'graph') {
            ownSaves.graph = e.newValue;
            loadGraph(stored('graph'));
            readGraph();
            undoStart(); // changed in another window: not undone here (graph.js)
            return;
        }
        if (e.key === 'calc') {
            ownSaves.calc = e.newValue;
            try {
                engine.load(stored('calc'));
            } catch (err) { }
            keyBoard['AC'].children[0].firstChild.data = empty() ? 'AC' : 'C';
            lettersChanged(); // as the other page stored them
            return refresh();
        }
        if (e.key === 'chemView' || e.key === 'chem') { // the table's own window and the calculator show the same
            ownSaves[e.key] = e.newValue;
            if (e.key === 'chem') chemPart.chemCards.load(stored('chem'));
            else loadChem(stored('chemView'));
            if (chemPart.chemAlone || chemPart.chemPanel.classList.contains('calc-open')) renderChem();
            return;
        }
        if (/^(solve|numbers|phys|bio|dates|conv|convUnits|fxTab|pastTab|stat|statPairs|statTab|statBy|statFit|statTests)$/.test(e.key)) { // a panel's own window and the calculator show the same
            ownSaves[e.key] = e.newValue;
            return panelSaved(e.key);
        }
        if (e.key === 'deg') {
            ownSaves.deg = e.newValue;
            return setUnit(stored('deg') === true ? 1 : stored('deg') === 'grad' ? 2 : 0);
        }
        if (/^(statsOn|fxOn|convOn|graphOn|solveOn|numbersOn|chemOn|physOn|bioOn|policy)$/.test(e.key)) return readPanels();
        if (e.key === 'format') setFormat(stored('format'));
        else return;
        refresh();
    });

    function render(val, inp) {
        var hasComma = val.match(/\./),
            x = +val,
            frac = fracMode && !inp && CalcEngine.fraction(x), // a typed number shows as typed
            angle = dmsMode && !inp && CalcEngine.dms(x), // in degrees, minutes and seconds
            drawn, // the fraction as HTML
            tmp,
            valAbs = Math.abs(+val);

        if (val.match(/NaN|Inf|Error/)) {
            tmp = 'Error';
        } else {
            resBuffer = val;
            if (!inp) { // a computed number shows 13 significant digits, like the equation
                val = String(+(+val).toPrecision(13));
            }
            if (valAbs >= 1e+16) {
                val = (+val).toExponential(13) + '';
            }
            tmp = (val + '').split('.');
            if (tmp[1]) {
                tmp[2] = tmp[1].split('e');
                if (tmp[2][1]) {
                    tmp[1] = tmp[2][0];
                }
                if (!inp) {
                    tmp[1] = (((+('1.' + tmp[1])).toPrecision(14)) + '');
                    if (tmp[1] >= 2) {
                        tmp[0] = (+tmp[0] + ((+val >= 0) ? 1 : -1)) + '';
                    }
                    tmp[1] = tmp[1].substr(2).replace(/0+$/, '');
                }
            }
            tmp = tmp[0] + ((tmp[1] || hasComma) ? '.' + tmp[1] : '').
                replace('.undefined', '').
                replace(inp ? '' : /\.$/, '') + (tmp[2] && tmp[2][1] ? 'e' + tmp[2][1] : '');
            if (frac) { // drawn as a fraction, and copied as 3/4
                resBuffer = frac[0] + '/' + frac[1];
                tmp = [String(Math.abs(frac[0])), String(frac[1])].map(function (part) {
                    return fmt.group ? CalcEngine.group(part, fmt.group) : part;
                });
                drawn = (frac[0] < 0 ? '-' : '') + CalcEngine.stack(tmp[0], tmp[1]);
            } else if (angle) { // and copied so
                resBuffer = tmp = angle;
            } else if (!inp) {
                tmp = CalcEngine.format(x, fmt) || tmp;
            }
            if (fmt.group && !frac) tmp = CalcEngine.group(tmp, fmt.group);
        }
        if (drawn) display.innerHTML = drawn;
        else display.textContent = tmp;
        fit();
    }

    // the font only gets smaller once the line reaches the edge of the screen,
    // or is taller than it (roots inside roots); at the smallest size a longer
    // line slides instead. focus: the cursor, kept in view; else the end of a
    // long equation is
    function fit(focus) {
        var size = 34, screen = display.parentNode, style = getComputedStyle(screen),
            room = screen.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom), left, at;

        display.classList.remove('calc-more-left', 'calc-more-right');
        sized(size);
        while (size > 18 && (display.scrollWidth > display.clientWidth || display.offsetHeight > room)) {
            sized(--size);
        }
        if (focus) { // while it is in view, clear of the dots, the line stays: a click must not move it under the pointer
            left = display.scrollLeft;
            // where it is in the line as shown, measured on the screen: inside a root or a power its
            // offsetLeft is of that, not of the line
            at = focus.getBoundingClientRect().left - display.getBoundingClientRect().left - display.clientLeft;
            if (at < (left > 1 ? 24 : 2) || at + focus.offsetWidth > display.clientWidth - (left < display.scrollWidth - display.clientWidth - 1 ? 24 : 2)) {
                left += at - display.clientWidth / 2;
            }
        }
        slide(display, focus ? left : display.scrollWidth);
    }

    // the font of the display, and its line as tall as the font asks, in whole
    // pixels: the shade of selected text is as tall as the line
    function sized(size) {
        display.style.fontSize = size + 'px';
        display.style.setProperty('--calc-line', 2 * Math.round(size * 23 / 34) + 'px');
    }

    // the number format from the options page: Norm, Fix, Sci or Eng, the
    // digits after the point or Auto, and what is between the thousands, with the decimal mark
    function setFormat(f) {
        f = f || {};
        fmt = {
            notation: /^(fix|sci|eng)$/.test(f.notation) ? f.notation : 'norm',
            places: Number.isInteger(f.places) ? Math.max(0, Math.min(9, f.places)) : 'auto', // Auto, as the options page starts
            group: /^(space|dot|spacecomma)$/.test(f.group) ? f.group : !!f.group
        };
        engine.comma = CalcEngine.comma(fmt.group); // what is pasted is read with the decimal mark shown
        keyBoard['.'].children[0].firstChild.data = engine.comma ? ',' : '.';
        fmtMark.textContent = fmt.notation === 'norm' ? '' : fmt.notation.toUpperCase() + (fmt.places === 'auto' ? '' : ' ' + fmt.places);
    }

    // MODE goes through the notations of results: Normal, Fix, Sci, Eng and
    // Normal again, with the places set on the options page, which follows it
    function nextFormat() {
        var order = ['norm', 'fix', 'sci', 'eng'];
        setFormat({ notation: order[(order.indexOf(fmt.notation) + 1) % order.length], places: fmt.places, group: fmt.group });
        store('format', fmt);
        refresh();
    }

    // a/b turns fraction mode on and off: each division is drawn as a fraction
    // while it is typed, and a result is shown as a fraction when it is one.
    // A number with no such fraction (π, √2) stays a decimal
    function toggleFraction() {
        fracMode = !fracMode;
        engine.setFraction(fracMode); // the line being edited takes the look of the mode
        if (fracMode) dmsMode = engine.dms = false; // one or the other
        refresh();
    }

    // the unit of angles: the Deg key is pressed until it is u
    function setUnit(u) {
        for (var n = 3; deg !== u && n--;) doKey('Deg', true); // three units: at most two presses
    }

    // °′″ turns its mode on and off: a result is shown in degrees, minutes and
    // seconds, 36°52′11.63″, while the number stays as it is. A number too large
    // for it stays a decimal. Not with fraction mode
    function toggleDms() {
        dmsMode = engine.dms = !dmsMode;
        if (dmsMode && fracMode) engine.setFraction(fracMode = false);
        refresh();
    }

    // scrolls a line that is too long; dots mark the side(s) where more is hidden
    function slide(el, left) {
        var max;

        el.classList.remove('calc-more-left', 'calc-more-right'); // the dots must not count as content
        max = el.scrollWidth - el.clientWidth;
        el.scrollLeft = left;
        el.style.setProperty('--slid', el.scrollLeft + 'px');
        el.classList.toggle('calc-slide', max > 1);
        el.classList.toggle('calc-more-left', el.scrollLeft > 1);
        el.classList.toggle('calc-more-right', el.scrollLeft < max - 1);
    }

    // the dots follow the line however it moves: the browser can scroll it on
    // its own (a font that loads late, the width changing), and the box of the
    // dots, set once, would be left where the line was, and show a cut digit
    [display, logline].forEach(function (el) {
        el.addEventListener('scroll', function () {
            el.style.setProperty('--slid', el.scrollLeft + 'px');
        });
    });

    function doKey(text, alt) {
        var key = keyBoard[text]; // text = key.textContent.replace(/\s*/g, '');

        if (text === ',') text = '.'; // the point key while the decimal mark is a comma

        if (text === '2nd') {
            secondActive = secondActive ? null : true;
            key.className = secondActive ? 'calc-press calc-second' : 'trigo-keys'; // !!!
            for (var n = secondKeySet.length; n--;) {
                secondKeySet[n].children[0].innerHTML = secondLayer[secondActive ? 1 : 0][n];
            }
        } else if (text.match(/^[\d|\.|π|e]$/) || text === 'Ans') {
            keyBoard['AC'].children[0].firstChild.data = 'C';
        } else if (text === 'C') {
            key.children[0].firstChild.data = 'AC';
        } else if (/^(Deg|Rad|Grad)$/.test(text)) { // Rad, Deg, Grad and Rad again; the key names the next one
            deg = (deg + 1) % 3;
            radDeg.firstChild.data = UNITS[deg];
            key.children[0].firstChild.data = UNITS[(deg + 1) % 3];
            fullTurn.innerHTML = ['2<span class="sign-pi">π</span>', '360°', '400g'][deg];
            if (graphPart.unitChanged) graphPart.unitChanged(deg); // graph.js keeps its own, read at every point it draws; not there yet as the page starts
            ask('unit', { deg: deg }); // the extension works out the sums of the pages in it
        } else if (text.match(/^mr$/) && engine.memory) {
            keyBoard['AC'].children[0].firstChild.data = 'C';
        }

        evalKey(text);

        if (!alt) {
            keyUp();
        }
    }

    function evalKey(key) {
        var span = selectedSpan(), ok; // a key writes in place of what is selected of the equation, and DEL takes it out

        if (sto.textContent) arm(false); // a key that is no letter lets STO→ go, and does what it does
        if (key === '2nd') return; // only the keys change: the display is not drawn again, and what is selected in it stays
        if (key === 'a/b') return toggleFraction();
        if (key === '°′″') return toggleDms();
        if (key === 'MODE') return nextFormat();
        if (key === 'DEL') {
            // takes back the last key of this calculation, or the piece before the cursor
            ok = (span && engine.cut(span[0], span[1], deg)) || engine.del();
        } else {
            ok = span ? engine.pressOver(key, deg, span[0], span[1]) : engine.press(key, deg);
        }
        if (ok) unselect();
        if (key.match(/^C|AC/)) {
            hold.textContent = '';
        }
        if (key.match(/^m[+-]$/)) { // shows what was done to the memory
            notify(key === 'm+' ? 'M+' : 'M–');
        }
        refresh();
    }

    // shows the engine's state: the equation in the display while it is typed,
    // then the result with the finished equation on the small line above
    // Ctrl+Z: the line as it was before each change, a key, DEL, a paste, an edit or a mode, to go
    // back to, and forward again. A move of the cursor alone is no change: it is kept with the line
    var undos = [], redos = [], lineNow = null;

    function lineState() {
        var snap = engine.snapshot(), s = JSON.parse(snap);
        if (s.edit) s.edit = s.edit.list; // the same line with the cursor elsewhere
        return { snap: snap, f: fracMode, d: dmsMode, same: JSON.stringify([s, fracMode, dmsMode]) };
    }

    function remember() {
        var now = lineState();
        if (lineNow && lineNow.same !== now.same) {
            undos.push(lineNow);
            if (undos.length > 200) undos.shift();
            redos = [];
        }
        lineNow = now;
    }

    function undo(redo) {
        var to = (redo ? redos : undos).pop();
        if (!to) return;
        (redo ? undos : redos).push(lineState());
        try {
            engine.restore(to.snap);
        } catch (e) {
            return;
        }
        engine.history = []; // DEL starts again from here
        fracMode = engine.fraction = to.f;
        dmsMode = engine.dms = to.d;
        lineNow = to;
        keyBoard['AC'].children[0].firstChild.data = empty() ? 'AC' : 'C';
        refresh();
        saveState();
    }

    function refresh() {
        var eq = engine.equation(fracMode), view;

        remember();

        graphRender(); // a curve of sin x follows the unit, and the plot's and the table's numbers the format

        if (fmt.group && !engine.edit) eq = CalcEngine.group(eq, fmt.group);
        if (engine.edit) { // the equation with the cursor in it
            view = engine.editView();
            resBuffer = engine.value;
            display.innerHTML = CalcEngine.decimal(view.html, fmt.group);
            fit(display.querySelector('.calc-cursor, .calc-fr-empty.calc-focus')); // the cursor, or the empty box it is in
            eq = '';
        } else if (engine.error) {
            render('Error');
            resBuffer = '0';
        } else if (engine.done || engine.plain()) { // a number alone keeps the usual formatting
            // a typed number shows as typed, and so does the 0 of a calculator waiting for a number:
            // Fix, Sci and Eng are for results. A result that is 0 is formatted
            render(engine.value, engine.entry === 'typing' || (engine.entry === 'fresh' && !engine.done && engine.value === '0'));
        } else {
            resBuffer = engine.value;
            display.innerHTML = eq;
            fit();
        }
        logline.innerHTML = !engine.edit && (engine.error || engine.done) ? eq : '';
        mem.textContent = engine.memory ? 'M' : '';
        fracMark.textContent = fracMode ? 'FRAC' : dmsMode ? 'DMS' : '';
        logline.classList.toggle('calc-log-low', !fracMode); // no fractions in it: lower, nearer the result
        keyBoard['a/b'].classList.toggle('calc-lit', fracMode); // a red dot on the key of the mode that is on
        keyBoard['°′″'].classList.toggle('calc-lit', dmsMode);
        pastExport.classList.toggle('calc-off', !engine.past.length); // and its export, which has nothing to export before
        pastExport.setAttribute('aria-disabled', String(!engine.past.length));
        clearShown();
        slide(logline, logline.scrollWidth); // its end in view
        if (stats.classList.contains('calc-open')) renderStats(); // the number format or fraction mode may have changed
        if (past.classList.contains('calc-open') && (pastShown.list !== engine.past || pastShown.mode !== shownMode() ||
            pastShown.n !== engine.past.length || pastShown.last !== engine.past[engine.past.length - 1])) {
            renderPast();
        }
    }

    loadState();
    takeLink();
    undoStart(); // what undo goes back to, at most (graph.js)
    setTimeout(takePopIn, 0); // once the page has said whether this is a window of its own

    // the lines are measured with the font they are shown in: once it has loaded
    // they are measured again, or their end could be left out of view
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

})(window);

// the ? opens the options: the page around the calculator does that
document.querySelectorAll('#calculator .calc-help').forEach(function (el) {
    el.addEventListener('click', function () {
        el.dispatchEvent(new CustomEvent('calc-options', { bubbles: true }));
    });
});