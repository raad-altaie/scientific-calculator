(function (window) {
    'use strict';
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
        pressedAt = null, // where a press put the tips away: none again till the pointer moves from there
        scrolledAt = null, // where a scroll put the tips away: none again till the pointer moves from there
        copying = null, // text a history button is copying, in place of the main line
        past = root.querySelector('.calc-past:not(.calc-stats):not(.calc-fx):not(.calc-conv):not(.calc-graph):not(.calc-solve):not(.calc-numbers):not(.calc-chem)'), // the history, over the keys
        pastList = past.querySelector('.calc-past-list'),
        pastButton = root.querySelector('.calc-hist'),
        pastExport = past.querySelector('.calc-past-export'), // the history copied or saved: a menu of how
        pastShown = {}, // the history as the list shows it, so it is only built again after a change
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
        statsTab = 'list', // the tab shown: a list of numbers, or pairs of them
        statsTexts = { list: '', pairs: '' }, // what is typed in each
        statsChart = stats.querySelector('.calc-stats-chart'),
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
                ['sumx2', 'Σx<sup>2</sup>'], ['sumy2', 'Σy<sup>2</sup>']
            ]
        },
        fx = root.querySelector('.calc-fx'), // formulas and constants, over the keys
        fxButton = root.querySelector('.calc-fx-btn'),
        fxSearch = fx.querySelector('.calc-fx-search'),
        fxList = fx.querySelector('.calc-fx-list'),
        fxTab = 'vars', // the list shown: vars, formulas or constants; Variables at first, then the last one used
        fxItems = {}, // the entries of each list, with the text a search looks in
        conv = root.querySelector('.calc-conv'), // the converter of units, over the keys
        convButton = root.querySelector('.calc-conv-btn'),
        convGroup = conv.querySelector('.calc-conv-group'),
        convUnit = conv.querySelector('.calc-conv-unit'),
        convInput = conv.querySelector('.calc-conv-value'),
        convNote = conv.querySelector('.calc-conv-note'),
        convList = conv.querySelector('.calc-conv-list'),
        convAt = { g: 0, u: {} }, // the group shown, and the unit chosen in each group, by its name
        convTab = 'units', // the tab of the converter: units, or dates
        convNow = [], // the value in each unit of the group, as the list shows them
        graph = root.querySelector('.calc-graph'), // the graph of a function of x, over the keys
        graphButton = root.querySelector('.calc-graph-btn'),
        solvePanel = root.querySelector('.calc-solve'), // equations solved, calculus and probability, over the keys
        solveButton = root.querySelector('.calc-solve-btn'),
        numbersPanel = root.querySelector('.calc-numbers'), // matrices, complex numbers and bases, over the keys
        numbersButton = root.querySelector('.calc-numbers-btn'),
        graphRows = (function (first) { // a box for each curve, seven: the + shows the next one, its × takes it away
            var rows = [first], row;
            while (rows.length < 7) {
                row = first.cloneNode(true);
                row.querySelector('input').placeholder = 'another curve';
                row.querySelector('input').setAttribute('aria-label', 'y = , curve ' + (rows.length + 1));
                first.parentNode.appendChild(row);
                rows.push(row);
            }
            return rows;
        })(graph.querySelector('.calc-graph-fn')),
        graphFnList = graph.querySelector('.calc-graph-fns'),
        graphAdd = graph.querySelector('.calc-graph-add'),
        graphSliders = graph.querySelector('.calc-graph-sliders'),
        graphInputs = graphRows.map(function (row) { return row.querySelector('input'); }),
        graphNote = graph.querySelector('.calc-graph-note'),
        graphPlot = graph.querySelector('.calc-graph-plot'),
        graphCanvas = graphPlot.querySelector('canvas'),
        graphTable = graph.querySelector('.calc-graph-table'), // the table of the curves' values, in place of the plot
        graphFrom = graphTable.querySelector('.calc-graph-from'), // its first x, and the step to the next: empty, from the view
        graphBy = graphTable.querySelector('.calc-graph-by'),
        graphList = graphTable.querySelector('.calc-graph-list'),
        graphTab = 'graph', // the tab shown: the graph, or the table
        graphWidth = 0, // the plot's width when it was last drawn, for the view while the table hides it
        graphValues = [], // the rows of the table as shown: x, then y of each curve shown
        graphLines = 0, // how many rows the table has: more come as it is scrolled to its end
        graphFns = [], // the function each box holds, as the engine reads it; null if it holds none
        graphView = null, // what the plot shows: x and y at its middle, and the units of x and y in a pixel; null for the start
        graphMarks = [], // the points of the curves in the view worth marking: roots, highs and lows, crossings
        graphAt = null, // the point under the pointer: { i: its curve, x, y, t: what it is if it is a mark, spot: true off the curves }
        graphEdge = null, // with ∫ pressed, where an area would start from the pointer: { x, i, j: its curves }
        graphStep = null, // the way the arrow keys last moved a point along an equation: { p: the point, x, y in pixels, dir }
        graphPinned = null, // the point clicked, which has the popup
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
                'log', 'π', 'y<sup>x</sup>', 'abs', 'x!', 'Rand'
            ],
            [
                'sin<sup>-1</sup>', 'cos<sup>-1</sup>', 'tan<sup>-1</sup>', 'log<sub>2</sub>',
                'sinh<sup>-1</sup>', 'cosh<sup>-1</sup>', 'tanh<sup>-1</sup>', '2<sup>x</sup>', 'mod', 'gcd', 'lcm',
                '10<sup>x</sup>', 'e', 'log<sub>y</sub>', 'floor', 'ceil', 'round'
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
        return keyBoard[label.replace(/<\/*\w+>/g, '')];
    });
    for (var n = secondKeySet.length; n--;) {
        keyBoard[secondLayer[1][n].replace(/<\/*\w+>/g, '')] = secondKeySet[n];
    }



    // ---------------- the page around the calculator ---------------- //

    // The page does what the calculator cannot: it opens the options, and reads the
    // clipboard for Paste. It is asked with an event on the calculator, which popup.js
    // answers in the extension and app.js on the website. False if the page does it in
    // its own way, in place of the calculator
    function ask(what, detail) {
        return root.dispatchEvent(new CustomEvent('calc-' + what, { bubbles: true, cancelable: true, detail: detail }));
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
    // of a formula or a list of units, is typing there, not on the keys
    function field(el) {
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
        return el.tagName === 'INPUT' && (!!el.dataset.num || el === convInput || graphEnds.indexOf(el) > -1 || el === graphFrom ||
            el === graphBy || !!el.closest('.calc-fx-var, .calc-var, .calc-graph-pair, .calc-graph-slider, .calc-graph-pop-end'));
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
            if (e.which === 27 && !menu.hidden) { // Esc closes the menu first
                showMenu(false);
                e.preventDefault();
            } else if (e.which === 27 && graphWindow.contains(e.target)) { // and the view's boxes, back to the plot
                showWindow(false);
                e.preventDefault();
            } else if (e.which === 27 && graphPop.contains(e.target)) { // and the ends of an area, its popup staying
                e.target.blur();
                e.preventDefault();
            } else if (e.which === 27 && graphUnpin()) { // Esc closes the point clicked on the graph first, and the like
                e.preventDefault();
            } else if (e.which === 27 && graph.contains(e.target) && graphBig(false)) { // then makes the big graph small
                e.preventDefault();
            } else if (e.which === 27 && chemPanel.contains(e.target) && chemBig(false)) { // and the big periodic table
                e.preventDefault();
            } else if (e.which === 27 && chemAlone) { // its own window closes
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
        if (onKeyDown(e.which, e.shiftKey)) e.preventDefault();
    }, false);

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
            keyMatchHold = ('sin|sinh|cos|cosh|tan|tanh|m-|Rand|Deg|Rand|sin-1|sinh-1|cos-1|cosh-1|tan-1|tanh-1|' +
                '1|1/x|2|x2|3|x3|x√y|√|ln|log2|ex|2x|log|10x|π|e|yx|logy|a/b|°′″').split('|');

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
                if (key == keyMatchHold[n]) {
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
        if ((key.match(/-1$|log2$|2x$|^(mod|gcd|lcm|10x|e|logy|floor|ceil|round)$/) && !secondActive) ||
            (key.match(/h$|n$|cos$|ex$|^(%|nCr|nPr|log|π|yx|abs|x!|Rand)$/) && secondActive)) {
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
        if (key === 27 && chemPanel.classList.contains('calc-open')) { // and the chemistry, after its big table
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
        box.appendChild(range.cloneContents());
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
    // the ? beside the name have tips as well
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
        if (chemSliding) return; // no tip comes while a knob of the periodic table's slider is dragged
        var key = target.closest('.calc-left > *, .calc-right > .del-ac, .calc-rad, .calc-mem, .calc-frac, .calc-fmt, .calc-hold, ' +
            '.calc-stat-btn, .calc-fx-btn, .calc-fx-row, .calc-gx-row, .calc-conv-btn, .calc-solve-btn, .calc-numbers-btn, .calc-chem-btn, .calc-chem-size, .calc-panel-size, .calc-pt-mode, .calc-pt-clear, .calc-pt-unit, .calc-pt-temp-v, .calc-sv-row, ' +
            '.calc-graph-btn, .calc-graph-size, .calc-graph-add, .calc-graph-del, .calc-graph-diff, .calc-graph-points, .calc-graph-zoom > span, .calc-graph-pop-end, .calc-graph-pop-row, .calc-graph-play, ' +
            '.calc-graph-fn > .calc-graph-swatch, ' +
            '.calc-sto, .calc-var-btn, .calc-var-clear, input, textarea, ' +
            '.calc-stats-chart, .calc-hist, .calc-past-export, .calc-past-clear, .calc-past-close, .calc-past-btn, .calc-past-del, .calc-past-unit, .calc-help, ' +
            '.calc-solve .calc-solve-tab, .calc-chem .calc-solve-tab, .calc-chem [data-pt], .calc-sv-opt, .calc-sv-copy, .calc-sv-example') || letterIn(target);
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

    // a press, a key or the menu puts it away
    ['mousedown', 'keydown', 'contextmenu'].forEach(function (type) {
        document.addEventListener(type, hideTip, true);
    });

    function showTip() {
        tipTimer = 0;
        if (!document.contains(tipKey)) { // drawn again under the pointer, as the element above the table is: the next move finds what is there now
            tipKey = null;
            return;
        }
        var name = tipKey.textContent.replace(/\s*/g, ''), info = tipFor(tipKey, name), calc = tip.parentNode,
            cam = tipKey.closest('.calc-graph-export') && tipKey.querySelector('svg'), // the camera has no box: from the camera itself
            at = inside((cam || tipKey).getBoundingClientRect()), left, top, below,
            // a card of a list: its arrow on it, not in the gap above it; a box a little over it
            gap = cam ? 6 : tipKey.matches('input, textarea') ? 9 : tipKey.matches('.calc-sv-row, .calc-fx-row, .calc-gx-row') ? 6 : 10;

        if (!info) {
            tipEmpty = true;
            return;
        }
        tip.innerHTML = '<div class="calc-tip-head"><b>' + info.t + '</b>' +
            (secondKey(name) ? '<span class="calc-tip-2nd">2nd</span>' : '') +
            (info.k ? '<kbd>' + info.k + '</kbd>' : '') + '</div><div>' + info.d + '</div>' +
            (info.second && !secondActive ? '<div class="calc-tip-more">With 2nd: ' + info.second + '</div>' : '');
        tip.hidden = false;
        // above the key, in the middle of it; below it where there is no room above
        left = at.left + at.width / 2 - tip.offsetWidth / 2;
        left = Math.max(6, Math.min(calc.clientWidth - tip.offsetWidth - 6, left));
        top = at.top - tip.offsetHeight - gap;
        below = top < 4;
        if (below) top = at.bottom + gap;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
        tip.style.setProperty('--arrow', at.left + at.width / 2 - left - tip.clientLeft + 'px'); // from inside its border
        tip.classList.toggle('calc-tip-below', below);
    }

    function hideTip() {
        clearTimeout(tipTimer);
        tipTimer = 0;
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
        peekStill = null; // where Copy was pressed: no tip till the pointer moves from there, though the result under it changed

    peek.className = 'calc-tip calc-peek';
    peek.hidden = true;
    tip.parentNode.appendChild(peek);

    // what the tip of a result shows: { t: its name, d: what it is, html: the value, text: as it is copied,
    // put: it goes in }. One that says what it is, as a result of the statistics, has its tip with no value
    // as well, only that; null for any other with no value, – as well, a matrix, whose numbers go in one at
    // a time, and bits
    function peekOf(el) {
        var value, info, row = el.row, unit;
        // a constant: what it is, and its value, with its unit, as its row has it and as Copy of its menu does
        if (el.classList.contains('calc-fx-row')) {
            info = fxItems.constants[+el.parentNode.dataset.i].item;
            return { t: info.t, d: info.d, html: constantValue(info), text: local(info.v), put: true };
        }
        // a unit of the converter: its name, and its value as the display has it and as Copy of its menu does
        if (el.classList.contains('calc-conv-row')) {
            unit = CalcUnits.units[convAt.g].list[+el.dataset.i];
            value = convNow[+el.dataset.i];
            info = unit.t.charAt(0).toUpperCase() + unit.t.slice(1);
            if (!isFinite(value)) return { t: info, d: 'No value in it for the one typed.' };
            return { t: info, html: el.querySelector('.calc-conv-num').innerHTML,
                text: unit.dms && local(CalcEngine.dms(value)) || local(+value.toPrecision(15)), put: true };
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
        return { t: el.querySelector('.calc-sv-label').innerHTML, html: value.innerHTML,
            text: row.text !== undefined ? value.textContent : local(statsValue(row.v).text), put: row.text === undefined };
    }

    function showPeek() {
        peekTimer = 0;
        var info = peekTile && document.contains(peekTile) && peekOf(peekTile), calc = tip.parentNode, at, left, top, below;
        if (!info) return;
        hideTip();
        peek.innerHTML = '<div class="calc-tip-head"><b>' + info.t + '</b></div>' + (info.d ? '<div>' + info.d + '</div>' : '') +
            (info.html === undefined ? '' : '<div class="calc-peek-value">' + info.html + '</div><div class="calc-peek-acts">' +
                (info.put ? '<span class="calc-peek-act" data-act="insert">Insert' + insertIcon() + '</span>' : '') +
                '<span class="calc-peek-act" data-act="copy">Copy</span></div>');
        peek.text = info.text;
        peek.hidden = false;
        // above the result, in the middle of it; below it where there is no room above, as a key's tip
        at = inside(peekTile.getBoundingClientRect());
        left = Math.max(6, Math.min(calc.clientWidth - peek.offsetWidth - 6, at.left + at.width / 2 - peek.offsetWidth / 2));
        top = at.top - peek.offsetHeight - 8;
        below = top < 4;
        if (below) top = at.bottom + 8;
        peek.style.left = left + 'px';
        peek.style.top = top + 'px';
        peek.style.setProperty('--arrow', at.left + at.width / 2 - left - peek.clientLeft + 'px');
        peek.classList.toggle('calc-tip-below', below);
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
        var el = target.closest('.calc-sv-tile, .calc-stats-tile, .calc-conv-row, .calc-fx-row');
        if (target.closest('.calc-pt-unit')) el = null; // its unit has the tip of a key
        if (el && el.classList.contains('calc-fx-row') && fxTab !== 'constants') el = null; // a formula has the tip of a key
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
    document.addEventListener('scroll', hidePeek, true);

    peek.addEventListener('mousedown', function (e) {
        e.preventDefault(); // the focus stays where it is
    }, false);

    // Insert as a click on the result does; Copy, and the tip goes
    peek.addEventListener('click', function (e) {
        var act = e.target.closest('[data-act]'), tile = peekTile;
        if (!act) return;
        hidePeek();
        if (act.dataset.act === 'copy') {
            copy(peek.text);
            peekStill = [e.clientX, e.clientY];
            return;
        }
        tile.click();
    }, false);

    // the memory and the number format say what they hold now
    function tipFor(el, name) {
        var places = fmt.places === 'auto' ? 'as many digits as each one needs' :
            fmt.places + (fmt.places === 1 ? ' decimal place' : ' decimal places'), info, value;
        if (el.hasAttribute('data-e')) { // a letter of the equation: what it holds now
            value = el.textContent.trim();
            return { t: 'Variable ' + value, d: value + ' = ' + letterValue(value), k: 'Shift+' + value };
        }
        if (/^(INPUT|TEXTAREA)$/.test(el.tagName) && (info = lettersTip(el))) return info; // a box with letters in it; any other has the tip of its own below
        if (el.classList.contains('calc-help')) return CalcTips['help'];
        if (el.classList.contains('calc-panel-size')) return CalcTips[bigPanel ? 'panel small' : 'panel big'];
        if (el === radDeg) return CalcTips['unit ' + radDeg.firstChild.data];
        if (el === fxButton) return CalcTips[fx.classList.contains('calc-open') ? 'formulas close' : 'formulas'];
        if (fx.contains(el)) return fxTip(el);
        if (el === convButton) return CalcTips[conv.classList.contains('calc-open') ? 'converter close' : 'converter'];
        if (conv.contains(el)) return convTip(el);
        if (el === statsButton) return CalcTips[stats.classList.contains('calc-open') ? 'stats close' : 'stats'];
        if (el === statsChart) return CalcTips[statsTab === 'pairs' ? 'pairs chart' : 'stats chart'];
        if (stats.contains(el)) return CalcTips[el.classList.contains('calc-past-clear') ? 'stats clear' : 'stats close'];
        if (el === solveButton) return CalcTips[solvePanel.classList.contains('calc-open') ? 'solve close' : 'solve'];
        if (solvePanel.contains(el)) return solver.tip(el);
        if (el === numbersButton) return CalcTips[numbersPanel.classList.contains('calc-open') ? 'numbers close' : 'numbers'];
        if (numbersPanel.contains(el)) return numbers.tip(el);
        if (el === chemButton) return CalcTips[chemPanel.classList.contains('calc-open') ? 'chem close' : 'chem'];
        if (chemPanel.contains(el)) return chemTip(el);
        if (el === graphButton) return CalcTips[graph.classList.contains('calc-open') ? 'graph close' : 'graph'];
        if (graph.contains(el)) {
            if (el.classList.contains('calc-gx-row')) return exampleTip(el);
            if (el.classList.contains('calc-past-clear')) return CalcTips['graph clear'];
            if (el.classList.contains('calc-past-close')) {
                info = CalcTips['graph close'];
                return root.classList.contains('calc-big') && !graphAlone ? { t: info.t, d: info.d, k: '' } : info; // Esc makes it small first
            }
            if (el === graphSize) return CalcTips[root.classList.contains('calc-big') ? 'graph small' : 'graph big'];
            if (el === graphAdd) return CalcTips['graph add'];
            if (el.classList.contains('calc-graph-del')) return CalcTips['graph remove'];
            if (el.classList.contains('calc-graph-diff')) {
                value = graphRows.indexOf(el.parentNode);
                if (graphRows[value].classList.contains('calc-graph-data')) return CalcTips['graph fit ' + (nextFit(graphDiff[value]) || 'off')];
                return CalcTips['graph slope ' + (graphDiff[value] ? 'off' : 'on')];
            }
            if (el.classList.contains('calc-graph-points')) {
                return CalcTips[graphCellsRow === graphRows.indexOf(el.parentNode) ? 'graph points off' : 'graph points'];
            }
            if (el.classList.contains('calc-graph-pop-end')) return CalcTips['graph end ' + el.dataset.end];
            if (el.classList.contains('calc-graph-pop-row')) return CalcTips['graph put ' + (seqOf(graphPinned) ? 'term ' : '') + el.dataset.put];
            if (el.classList.contains('calc-graph-play')) return CalcTips[graphPlay[el.parentNode.dataset.k] ? 'graph pause' : 'graph play'];
            if (el.classList.contains('calc-graph-swatch')) {
                value = graphRows.indexOf(el.parentNode);
                return graphInputs[value].value.trim() ? CalcTips[graphOff[value] ? 'graph show' : 'graph hide'] : null;
            }
            return CalcTips['graph ' + el.dataset.zoom];
        }
        if (el === pastButton) return CalcTips[past.classList.contains('calc-open') ? 'history close' : 'history'];
        if (el === pastExport) return CalcTips['history export'];
        if (el.classList.contains('calc-past-clear')) return CalcTips['history clear'];
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
                d: 'The memory holds ' + local(+(+engine.memory).toPrecision(13)) +
                    '. Click to put it into the equation, as mr does. mc empties it.',
                k: 'm'
            };
        }
        if (el === fmtMark) {
            return {
                t: 'Number format',
                d: (fmt.notation === 'fix' ? (fmt.places === 'auto' ? 'Results are shown as usual, with ' + places + '.' :
                    'Results are rounded to ' + places + '.') :
                    'Results are shown in ' + (fmt.notation === 'sci' ? 'scientific notation, 1.23e+4,' :
                        'engineering notation, powers of ten in steps of three, 12.3e+3,') + ' with ' + places + '.') +
                    ' MODE goes on to the next; click here to change it on the options page.',
                k: ''
            };
        }
        return CalcTips[name];
    }

    // true for the name of a function on the 2nd layer: sin-1, log2, 2x …
    function secondKey(name) {
        return secondLayer[1].some(function (label) {
            return label.replace(/<\/*\w+>/g, '') === name;
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
        if (!item || item.classList.contains('calc-off')) return;
        showMenu(false);
        menu.items[+item.dataset.i][1]();
    }, false);

    // a press in the menu leaves the focus and what is selected as they are, for what is chosen
    menu.addEventListener('mousedown', function (e) {
        e.preventDefault();
    }, false);

    document.addEventListener('contextmenu', function (e) {
        var items, at;
        if (!root.contains(e.target)) return; // the rest of the page has the menu of the browser
        at = menu.at = inside({ left: e.clientX, top: e.clientY }); // where Store in Var opens the letters
        items = menuItems(e.target); // taken now, while what is selected is still selected
        e.preventDefault(); // in the calculator the menu of the browser is never shown
        if (!items) return;
        if (!items.some(function (item) { return item && item.clip; })) return openMenu(items, at, null);
        clipboardHas(function (has) { // Paste is left out while the clipboard is known to be empty
            openMenu(has ? items : items.filter(function (item) { return !item || !item.clip; }), at, null);
        });
    }, false);

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
        var calc = menu.parentNode;
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
            return '<div data-i="' + i + '"' + (item[2] === false ? ' class="calc-off"' : '') + '>' + item[0] + '</div>';
        }).join('');
        menu.style.left = menu.style.top = '0'; // measured where it has all the room, not where it was last: there it may wrap
        showMenu(true);
        menu.style.left = Math.max(4, Math.min(at.alignRight ? at.left - menu.offsetWidth : at.left, calc.clientWidth - menu.offsetWidth - 4)) + 'px';
        menu.style.top = Math.min(at.top, calc.clientHeight - menu.offsetHeight - 4) + 'px';
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
        menu.hidden = !open;
    }

    // the lines of the menu for where it opens: [name, what it does, false while it cannot be done];
    // nothing where there is no menu
    function menuItems(el) {
        var box = el.closest('textarea, input'), panel = el.closest('.calc-past'), text, span, row, part, i, unit, k, paste;

        // the display has only what can be done: Cut and Copy with something in it, Store in Var with
        // a value, Paste with something in the clipboard
        if (el.closest('.calc-display')) {
            text = selectedText(); // taken now, as it is selected
            span = selectedSpan();
            paste = ['Paste', function () { askPaste(null); }];
            paste.clip = true;
            return [
                !empty() && ['Cut', function () { copy(text || copyText()); cutOut(span); }],
                !empty() && ['Copy', function () { copy(text || copyText()); }],
                paste,
                null,
                insertItem(),
                !empty() && !engine.error && storeItem(storeIn),
                null,
                ['Reset all', resetAll]
            ].filter(function (item) { return item !== false; });
        }
        if (!panel) return null; // the keys
        if (box) return boxItems(box);

        if (panel === conv && (row = el.closest('.calc-conv-row')) && isFinite(convNow[i = +row.dataset.i])) {
            unit = CalcUnits.units[convAt.g].list[i];
            text = unit.dms && local(CalcEngine.dms(convNow[i])); // degrees, minutes and seconds have their signs
            return [
                ['Copy', function () { copy(text || local(+convNow[i].toPrecision(15))); }],
                ['Copy with unit', function () { copy(text || local(+convNow[i].toPrecision(15)) + ' ' + plain(unit.s)); }],
                ['Insert', function () { row.click(); }],
                null,
                storeItem(function (k) { setLetter(k, +convNow[i].toPrecision(15)); })
            ];
        }
        if (panel === stats && (row = el.closest('.calc-stats-tile')) && statsNow.n && isFinite(statsNow[row.dataset.k])) {
            text = local(statsValue(statsNow[row.dataset.k]).text);
            k = statsNow[row.dataset.k];
            return [
                ['Copy', function () { copy(text); }],
                ['Insert', function () { row.click(); }],
                null,
                storeItem(function (letter) { setLetter(letter, k); })
            ];
        }
        if (panel === fx && (row = el.closest('.calc-var'))) {
            k = row.dataset.k;
            return [
                ['Insert', function () { putLetter(k); }],
                ['Copy', function () { copy(letterText(k)); }],
                ['Store result', function () { storeIn(k); }, !engine.error],
                ['Clear', function () { setLetter(k, 0); }, !!engine.vars[k]]
            ];
        }
        if (panel === fx && (row = el.closest('.calc-fx-item'))) {
            k = fxItems[fxTab][+row.dataset.i].item;
            if (fxTab === 'constants') {
                return [
                    ['Copy', function () { copy(local(k.v)); }],
                    ['Copy with unit', function () { copy(local(k.v) + ' ' + plain(k.u)); }, !!k.u],
                    ['Insert', function () { putConstant(k); }],
                    null,
                    storeItem(function (letter) { setLetter(letter, k.v); })
                ];
            }
            return [
                ['Copy', function () { copy(plain(fractionsAsText(k.f))); }],
                row.classList.contains('calc-on') ? ['Insert', function () { insertFormula(row); }] :
                    ['Open', function () { openFormula(row); }]
            ];
        }
        if (panel === past) {
            row = el.closest('.calc-past-row');
            if (!row) return [['Clear history', function () { past.querySelector('.calc-past-clear').click(); }]];
            // on the equation, the equation; anywhere else on the line, its result
            part = el.closest('.calc-past-eq') || row.querySelector('.calc-past-res');
            k = engine.past[+row.dataset.i];
            return ['copy', 'insert'].map(function (act) {
                return [act === 'copy' ? 'Copy' : 'Insert', function () { part.querySelector('[data-act="' + act + '"]').click(); }];
            }).concat([null, storeItem(function (letter) { setLetter(letter, +k.value); }), null,
                ['Delete', function () { row.querySelector('.calc-past-del').click(); }]]);
        }
        if (panel === graph && (row = el.closest('.calc-graph-cell')) && isFinite(k = graphValues[row.dataset.r][row.dataset.c])) {
            text = local(+row.dataset.c ? statsValue(k).text : String(k));
            return [
                ['Copy', function () { copy(text); }],
                ['Insert', function () { row.click(); }],
                null,
                storeItem(function (letter) { setLetter(letter, k); })
            ];
        }
        if (panel === graph && el.closest('.calc-graph-plot') && !el.closest('.calc-graph-pop')) {
            return [
                ['Copy picture', copyGraph],
                ['Save picture', saveGraph]
            ];
        }
        if (panel === graph && (row = el.closest('.calc-graph-pop-row')) && graphPinned) {
            k = graphPinned[row.dataset.put];
            return [
                ['Copy', function () { copy(local(graphPinned.spot ? k : statsValue(k).text)); }],
                ['Insert', function () { row.click(); }],
                null,
                storeItem(function (letter) { setLetter(letter, +k); }, isFinite(+k))
            ];
        }
        return boxItems(panel === stats ? statsInput : panel === fx ? fxSearch : panel === graph ? graphInputs[0] : convInput);
    }

    // Cut and Copy take what is selected in the box, and Paste goes in its place
    function boxItems(box) {
        var some = box.selectionStart !== box.selectionEnd;
        return [
            ['Cut', function () { box.focus(); document.execCommand('cut'); }, some],
            ['Copy', function () { box.focus(); document.execCommand('copy'); }, some],
            ['Paste', function () { askPaste(box); }],
            ['Select all', function () { box.focus(); box.select(); }, !!box.value]
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
        engine.letters(true); // A to J back to 0, as the memory
        engine.reset(); // the equation too; the history stays
        hold.textContent = '';
        arm(false);
        keyBoard['AC'].children[0].firstChild.data = 'AC';
        // what is typed in the panels, and each on its first tab with no card open: the list of the
        // statistics, the search and a formula open, the value to convert and the dates, the graph
        // and its examples, and the boxes of the solver and the numbers
        statsInput.value = '';
        statsTexts = { list: '', pairs: '' };
        statsTab = 'list';
        statsTiles();
        setStatsBy(0);
        renderStats();
        fxSearch.value = '';
        fxTab = 'vars';
        store('fxTab', fxTab);
        renderFx();
        convInput.value = '1';
        dates.clear();
        convTab = 'units';
        convTabs();
        saveConv();
        clearGraph();
        lettersChanged();
        graphSearch.value = '';
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
    // Variables tab of the formulas lists them, and a value of a panel is stored by its menu
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
        if (fx.classList.contains('calc-open') && fxTab === 'vars') showLetters();
        if (graphInputs.some(function (box, i) { return i < graphCount && /[A-J]/.test(box.value); })) readGraph();
        if (/[A-J]/.test(convInput.value)) renderConv(); // a value of A, converted again
    }

    // Store in Var: a menu of the letters, each with what it holds, in place of the menu it was chosen in
    function storeItem(store, can) {
        var at = menu.at;
        return ['Store in Var' + MORE, function () { lettersMenu(store, at); }, can !== false];
    }

    // Insert Var: the same menu of the letters, the one chosen put in at the cursor, as Shift+A does
    function insertItem() {
        var at = menu.at;
        return ['Insert Var' + MORE, function () { lettersMenu(putLetter, at); }];
    }

    function lettersMenu(pick, at) {
        openMenu(CalcEngine.LETTERS.split('').map(function (k) {
            return [k + '<span class="calc-menu-val">' + letterValue(k) + '</span>', function () { pick(k); }];
        }), at, null, 'calc-menu-letters');
    }

    // the tip of a box that uses letters, of a formula, of Solve or of the graph: what each holds now,
    // A = 200000; none for a box without one, nor where A to F are digits, as in the Numbers panel
    function lettersTip(box) {
        var used = (fx.contains(box) && !box.closest('.calc-var')) || solvePanel.contains(box) || graph.contains(box) || box === convInput ||
            (numbersPanel.contains(box) && box.dataset.num) ?
            CalcEngine.lettersOf(box.value) : [];
        if (!used.length) return null;
        return {
            t: used.length > 1 ? 'Variables' : 'Variable ' + used[0],
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
        notification.innerHTML = text;
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
        if (chemPanel.classList.contains('calc-open') && !chemPanel.contains(e.target) && !chemButton.contains(e.target)) {
            showChem(false);
        }
    }, true);

    past.querySelector('.calc-past-close').addEventListener('click', function () {
        showPast(false);
    }, false);

    past.querySelector('.calc-past-clear').addEventListener('click', function () {
        engine.past = [];
        showPast(false);
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
            ['Copy as text', function () { copy(pastText()); }],
            ['Save as CSV', function () { saveText(pastCsv(), 'text/csv', 'csv'); }],
            ['Save as text', function () { saveText(pastText(), 'text/plain', 'txt'); }]
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
        if (engine.past.length) renderPast(); else showPast(false);
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
        [[past, showPast], [stats, showStats], [fx, showFx], [conv, showConv], [graph, showGraph], [solvePanel, showSolve], [numbersPanel, showNumbers], [chemPanel, showChem]]
            .forEach(function (p) { if (p[0] !== but) p[1](false); });
    }

    function showPast(open) {
        if (open) {
            closePanels(past);
            placePanel(past);
            renderPast();
        }
        past.classList.toggle('calc-open', open);
        pastButton.classList.toggle('calc-on', open);
        if (open) pastList.scrollTop = 0;
    }

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
    document.addEventListener('pointerdown', function (e) { lastTouch = e.pointerType === 'touch'; }, true);
    function touchScreen() {
        return lastTouch || window.matchMedia('(hover: none), (pointer: coarse)').matches ||
            (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)) || /\bTesla\//.test(navigator.userAgent);
    }

    // A box of a panel gets the focus, to type in. A touch screen brings its keyboard
    // up over the panel at that, so there the box is left until it is touched, unless
    // a box of the same panel is being typed in, the keyboard up already, as Enter goes on
    function focusBox(box) {
        var at = document.activeElement;
        if (touchScreen() && !(/^(INPUT|TEXTAREA)$/.test(at.tagName) && [stats, fx, conv, graph, solvePanel, numbersPanel, chemPanel].some(function (p) {
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
    // deviations, and the line of best fit, drawn through them. A click on a result
    // puts it into the calculation, as Ans does. Each tab keeps what is typed in it

    // the tiles of the tab, the one shown on it
    function statsTiles() {
        [].forEach.call(stats.querySelectorAll('.calc-solve-tab'), function (t) {
            t.classList.toggle('calc-on', t.dataset.tab === statsTab);
        });
        stats.classList.toggle('calc-stats-pairs', statsTab === 'pairs');
        statsInput.placeholder = statsTab === 'pairs' ? 'Type or paste pairs, x and y on each line:\n1 2\n2 4.1\n3 5.9' :
            'Type or paste numbers: 4 8 15 16 23 42';
        statsGrid.innerHTML = STATS[statsTab].map(function (s) {
            return '<div class="calc-stats-tile" data-k="' + s[0] + '"><span class="calc-stats-label">' + s[1] +
                '</span><span class="calc-stats-value"></span></div>';
        }).join('');
    }

    statsTiles();

    stats.querySelector('.calc-solve-tabs').addEventListener('click', function (e) {
        var t = e.target.closest('.calc-solve-tab');
        if (!t || t.dataset.tab === statsTab) return;
        statsTexts[statsTab] = statsInput.value;
        statsTab = t.dataset.tab;
        statsInput.value = statsTexts[statsTab];
        statsTiles();
        renderStats();
        statsChart.parentNode.scrollTop = 0;
        saveState();
        if (focusBox(statsInput)) statsInput.setSelectionRange(statsInput.value.length, statsInput.value.length);
    }, false);

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
        if (!tile || !statsNow.n || !isFinite(value) || !engine.put(value)) return;
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
            if (focusBox(statsInput)) statsInput.setSelectionRange(statsInput.value.length, statsInput.value.length);
        } else if (document.activeElement === statsInput) {
            statsInput.blur(); // the keys are the calculator's again
        }
    }

    // the results as the display shows numbers: in the number format, and as
    // fractions in fraction mode; the chart of them, and a note of how many there are
    function renderStats() {
        var pairs = statsTab === 'pairs', s = statsNow = CalcEngine[pairs ? 'pairs' : 'stats'](statsInput.value, engine.comma, BY[statsBy.at][0]);
        [].forEach.call(statsGrid.children, function (tile) {
            var value = s[tile.dataset.k], known = s.n > 0 && isFinite(value), shown = tile.lastChild, size = 17;
            tile.classList.toggle('calc-none', !known);
            shown.innerHTML = known ? statsValue(value).html : '–';
            shown.style.fontSize = '';
            while (size > 11 && tooWide(shown)) { // a long one gets smaller, as on the display
                shown.style.fontSize = --size + 'px';
            }
        });
        statsChart.innerHTML = !s.n ? '' : pairs ? scatterChart(s) : histogramChart(s);
        if (pairs) {
            statsNote.textContent = !s.n && !s.bad.length ? (statsBy.at > 1 ? 'Only ' + BY[statsBy.at][2] + ' are between x and y; a pair on each line.' :
                'x and y on each line, apart by a space, ' + (engine.comma ? 'semicolon' : 'comma') + ' or tab.') :
                s.n + (s.n === 1 ? ' pair' : ' pairs') + (isFinite(s.b) ? ' · y = ' + shortNumber(s.a) + (s.b < 0 ? ' − ' : ' + ') + shortNumber(Math.abs(s.b)) + 'x' : '') +
                (s.bad.length ? ' · left out: ' + s.bad.slice(0, 3).join(', ') + (s.bad.length > 3 ? ' …' : '') : '');
            return;
        }
        statsNote.textContent = !s.n && !s.bad.length ? (statsBy.at ? 'Only ' + BY[statsBy.at][2] + (statsBy.at > 1 ? ' and new lines' : '') + ' are between two numbers.' :
            'Apart by spaces, ' + (engine.comma ? 'semicolons' : 'commas') + ' or new lines; a column from a spreadsheet works too.') :
            s.n + (s.n === 1 ? ' number' : ' numbers') +
            (s.bad.length ? ' · left out: ' + s.bad.slice(0, 3).join(', ') + (s.bad.length > 3 ? ' …' : '') : '');
    }

    // a number to 6 digits, with the decimal mark in use and − for its minus: for the note and the charts
    function shortNumber(v) {
        return local(String(+(+v).toPrecision(6))).replace('-', '−');
    }

    var CHART_W = 340, CHART_H = 120;

    // a line of text in a chart: at x, y, anchored at its start, middle or end
    function chartText(x, y, text, anchor) {
        return '<text x="' + x.toFixed(1) + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '">' + text + '</text>';
    }

    // The numbers of the list as a histogram, of up to 12 bars of the same width from min to max,
    // and under it their box plot on the same scale: the box from Q1 to Q3, the median across
    // it, and the whiskers out to min and max
    function histogramChart(s) {
        var lo = s.min, hi = s.max, k, w, counts = [], most, html = '', i, lMin, lMax, lMid, xm, x = function (v) { return 10 + (v - lo) / (hi - lo) * (CHART_W - 20); };
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
        html += '<line class="calc-stats-axis" x1="10" y1="70.5" x2="' + (CHART_W - 10) + '" y2="70.5"/>';
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
        return '<svg viewBox="0 0 ' + CHART_W + ' ' + CHART_H + '" role="img" aria-label="Histogram and box plot">' + html +
            chartText(10, 112, lMin, 'start') + (s.n > 1 && s.min !== s.max && xm - lMid.length * 3 > 14 + lMin.length * 6 &&
                xm + lMid.length * 3 < CHART_W - 14 - lMax.length * 6 ? chartText(xm, 112, lMid) : '') +
            chartText(CHART_W - 10, 112, lMax, 'end') + '</svg>';
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
        px = function (v) { return 34 + (v - x0) / (x1 - x0) * (CHART_W - 46); };
        py = function (v) { return 98 - (v - y0) / (y1 - y0) * 90; };
        html += '<line class="calc-stats-axis" x1="30" y1="102.5" x2="' + (CHART_W - 8) + '" y2="102.5"/><line class="calc-stats-axis" x1="30.5" y1="6" x2="30.5" y2="102.5"/>';
        if (isFinite(s.b)) {
            html += '<line class="calc-stats-fit" x1="' + px(x0).toFixed(1) + '" y1="' + py(s.a + s.b * x0).toFixed(1) + '" x2="' + px(x1).toFixed(1) +
                '" y2="' + py(s.a + s.b * x1).toFixed(1) + '"/>';
        }
        s.xs.forEach(function (x, i) {
            html += '<circle class="calc-stats-dot" cx="' + px(x).toFixed(1) + '" cy="' + py(s.ys[i]).toFixed(1) + '" r="3"/>';
        });
        return '<svg viewBox="0 0 ' + CHART_W + ' ' + CHART_H + '" role="img" aria-label="Scatter plot and line of best fit">' +
            '<clipPath id="calc-stats-clip"><rect x="31" y="0" width="' + (CHART_W - 39) + '" height="102"/></clipPath><g clip-path="url(#calc-stats-clip)">' + html + '</g>' +
            chartText(34, 115, shortNumber(Math.min.apply(null, s.xs)), 'start') + chartText(CHART_W - 12, 115, shortNumber(Math.max.apply(null, s.xs)), 'end') +
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

    // Up to seven functions of x, typed as they would be pasted: x^2 – 3, 2sin(x), 1/x.
    // Their curves are drawn over a grid, in the unit of angles in use, each in its color;
    // a drag moves the view, and the wheel, a pinch or the buttons zoom it. The roots,
    // highs and lows of each, where it meets the y axis and where two cross are marked
    // with dots. The point under the pointer shows its x and y, on the nearest curve or
    // dot; a click keeps it there, with the tangent of the curve, and its x, y or slope can
    // be put into the calculation, as Ans is
    var GRAPH_WIDTH = 20, // the x the plot starts with: -10 to 10, or a full turn either way in degrees
        GRAPH_INK = { grid: 'rgba(51, 68, 59, 0.16)', axis: '#33443b', text: '#33443b', paper: '#b6d1c2' },
        // the colors of the curves, all dark enough for the green: navy, red, green, purple, orange, teal and plum
        GRAPH_CURVES = ['#22476a', '#b0414d', '#3d8b4f', '#6d3fa6', '#c2621a', '#127a85', '#8c2f6b'],
        graphCount = 1, // the boxes shown
        graphHue = [0, 1, 2, 3, 4, 5, 6], // the color of each box, which stays with its curve as one above is removed
        graphVars = {}, // the value of each letter of the functions but x, as its slider sets it: a and b in a x² + b
        graphRange = {}, // the ends of each slider, [from, to]
        graphLetters = [], // the letters that have a slider now
        graphSliding, // the sliders wait until the typing stops: sin is not s, i and n while it is typed
        GRAPH_PLAY = 4000, // a slider played goes from one end to the other in this many ms
        graphPlay = {}, // the sliders playing: the way each goes, 1 up or -1 down
        graphFrame = 0, // the frame asked for while one plays
        graphLast = 0, // the time of the frame before
        GRAPH_NAMES = { root: 'Root', xint: 'x-intercept', min: 'Min', max: 'Max', infl: 'Inflection point', yint: 'y-intercept', cross: 'Crossing', data: 'Data point' },
        // the best fits of points, one after the other on their button: a line, a parabola, aˣ, a power and ln x
        GRAPH_FITS = ['lin', 'quad', 'exp', 'pow', 'log'],
        GRAPH_FIT_NAMES = { lin: 'linear', quad: 'quadratic', exp: 'exponential', pow: 'power', log: 'logarithmic' },
        // what each needs of the points, said when they do not have it
        GRAPH_FIT_NEEDS = { lin: 'two x or more', quad: 'three x or more', exp: 'every y above 0', pow: 'every x and y above 0', log: 'every x above 0' },
        // the rows of the popup: of a point, x, y and the slope; of an area, where it starts and ends, and how much
        GRAPH_ROWS = { u: '<i>t</i>', x: '<i>x</i>', y: '<i>y</i>', m: 'Slope', a: 'From <i>x</i>', b: 'To <i>x</i>', s: 'Area' },
        graphTouch = {}, // the pointers pressed on the plot, where each is now
        graphStart = null, // where they were when the last one went down or up, and the view then
        graphMoved = false, // the press became a drag or a pinch, so it is not a click
        graphSaving, // saves the view once the wheel stops
        graphSliding = 0, // the next frame of the view sliding under an area dragged to the side, or 0
        graphClickLast = null, // the point or area clicked, and its popup put away, before the last click
        graphClickWas = null, // and before the click before it, the first of two
        GRAPH_SLIDE_EDGE = 28, // an area dragged this many pixels from the left or right slides the view that way
        GRAPH_SLIDE_SPEED = 300, // at the side or past it, this many pixels a second; slower farther in
        graphOff = [false, false, false, false, false, false, false], // the curves hidden by a click on their dot: kept, not drawn
        graphDiff = [false, false, false, false, false, false, false], // the curves whose slope is drawn too, by their y′; of points, the kind of their fit
        graphTwice = '', // a name two boxes give their functions, f of f(x) = …: the second is none
        graphCells = graph.querySelector('.calc-graph-cells'), // the points of a box as a table of x and y, to type in
        graphCellsRow = -1, // the box that table is of
        graphExamples = graph.querySelector('.calc-graph-examples'), // the Examples tab: a search, and examples to draw by group
        graphSearch = graphExamples.querySelector('.calc-graph-search'),
        graphExList = graphExamples.querySelector('.calc-graph-ex-list'),
        graphExItems = [], // each example with its group, and the words it is found by
        graphRels = [], // the boxes with an equation or an inequality of x and y in place of a function of x, x² + y² = 25
        graphPlanes = [], // the boxes with a curve of a parameter, polar, r = 2sin(3θ), or parametric, (cos t, sin t)
        graphData = [], // the boxes with points, (1, 2), (2, 4.1): their { x, y }; the function of such a box is its best fit, if on
        graphVersion = 0, // goes up as the boxes are read again, so the marks found are found again
        graphMarksKept = null, // the marks found, while the view, the unit, the letters and the boxes stay
        graphSharp = 0, // pixels of the canvas to each of the plot at least: 2 while a picture is made
        graphPop = graphPlot.querySelector('.calc-graph-pop'), // the point clicked: its x and y, each to insert
        GRAPH_POP_WAIT = 3500, // the popup opened with the mouse goes this many ms after the mouse is off it
        graphHiding, // that wait
        graphPopFrom = null, // where the mouse was as it opened the popup: the wait starts once it is moved off there
        GRAPH_POP_STILL = 8, // this many pixels of the plot
        graphPopShut = false, // the popup put away, the point clicked and its tangent still drawn
        GRAPH_TRACE = 2, // ← and → move the point clicked this many pixels along its curve, ten times as far with Shift
        FIELD_STARTS = 20, // solutions of a slope field a click adds, the first going past them
        graphTracing = -1, // the curve traced last: of the two at a crossing, the one to go on along
        graphWindow = graphPlot.querySelector('.calc-graph-window'), // the view typed: x from and to, y from and to
        graphEnds = [].slice.call(graphWindow.querySelectorAll('input')),
        graphWindowButton = graphPlot.querySelector('[data-zoom="window"]'),
        graphShading = false, // the ∫ button pressed: a drag along a curve shades its area, and does not move the view
        graphAreaButton = graphPlot.querySelector('[data-zoom="area"]'),
        graphSize = graph.querySelector('.calc-graph-size'), // the graph as big as the page, and back
        graphSplit = graph.querySelector('.calc-graph-split'), // big, the line between its two columns, to drag
        graphSide = 0, // the width that line gives the left column; 0: as style.css has it
        graphSplitFrom = null, // where it was taken: the pointer's x, and the column's width then
        GRAPH_SIDE_MIN = 270, // the left column is never narrower: its tabs, + and Clear fit
        GRAPH_PLOT_MIN = 320, // nor so wide that the plot is narrower than this
        GRAPH_SIDE_MAX = 0.7, // nor wider than this much of the room the plot leaves
        graphAlone = false; // the page is the graph's own window, in the extension: only the graph, always big

    // A click on the dot of a curve hides it, and shows it again: it stays typed, but is not
    // drawn, marked or in the table. Its y′ draws its slope as well, and its × removes it
    graphRows.forEach(function (row, i) {
        var dot = row.querySelector('.calc-graph-swatch');
        row.querySelector('.calc-graph-diff').addEventListener('click', function (e) {
            e.preventDefault(); // not the label's focus of the box
            if (!graphInputs[i].value.trim()) return;
            graphDiff[i] = row.classList.contains('calc-graph-data') ? nextFit(graphDiff[i]) : !graphDiff[i];
            hideTip();
            readGraph();
            saveState();
        }, false);
        row.querySelector('.calc-graph-del').addEventListener('click', function (e) {
            e.preventDefault(); // not the label's focus of the box
            removeCurve(i);
        }, false);
        row.querySelector('.calc-graph-points').addEventListener('click', function (e) {
            e.preventDefault(); // not the label's focus of the box
            showCells(graphCellsRow === i ? -1 : i);
            hideTip();
        }, false);
        dot.addEventListener('click', function (e) {
            e.preventDefault(); // not the label's focus of the box
            if (!graphInputs[i].value.trim()) return;
            graphOff[i] = !graphOff[i];
            hideTip();
            readGraph();
            saveState();
        }, false);
    });

    // the fit after this one on its button, from none to a line and on to none again
    function nextFit(kind) {
        var at = kind === true ? 0 : GRAPH_FITS.indexOf(kind);
        return kind === false ? GRAPH_FITS[0] : GRAPH_FITS[at + 1] || false;
    }

    // the kind of fit a box of points has on, or none
    function fitKind(i) {
        return graphDiff[i] === true ? 'lin' : graphDiff[i] || '';
    }

    // The points of a box as a table: a row of x and y for each, and an empty one below to add
    // another, the box written again as they are typed, (1, 2), (2, 4.1), with the pairs of
    // numbers only. Shown under the boxes, which may scroll, with the color of its box; i of -1 puts it away
    function showCells(i) {
        var pts = i > -1 && CalcEngine.points(graphInputs[i].value.trim(), engine.comma) || [];
        graphCellsRow = i;
        graphRows.forEach(function (row, k) { row.querySelector('.calc-graph-points').classList.toggle('calc-on', k === i); });
        graphCells.hidden = i < 0;
        if (i < 0) return;
        graphRows[i].scrollIntoView({ block: 'nearest' });
        graphCells.style.setProperty('--c', curveColor(i));
        graphCells.innerHTML = '<div class="calc-graph-cells-head"><i>x</i><i>y</i></div>';
        pts.forEach(function (p) { addCell(local(String(p.x)), local(String(p.y))); });
        addCell('', '');
        focusBox(graphCells.querySelector('input'));
    }

    // a row of the table, with its x and y
    function addCell(x, y) {
        var row = document.createElement('div'), box = ' type="text" spellcheck="false" autocomplete="off" maxlength="20"';
        row.className = 'calc-graph-pair';
        row.innerHTML = '<input' + box + ' data-c="x" aria-label="x"><input' + box + ' data-c="y" aria-label="y">';
        row.children[0].value = x;
        row.children[1].value = y;
        graphCells.appendChild(row);
        return row;
    }

    // a number typed in the table: the box is written again with the rows of two numbers, and
    // the last row typed in has an empty one after it
    graphCells.addEventListener('input', function (e) {
        var rows = [].slice.call(graphCells.querySelectorAll('.calc-graph-pair')), box = graphInputs[graphCellsRow];
        if (e.target.tagName !== 'INPUT' || !box) return;
        onlyNumber(e.target);
        box.value = rows.map(function (row) {
            var x = boxNumber(row.children[0]), y = boxNumber(row.children[1]);
            if (!row.children[0].value.trim() || !row.children[1].value.trim() || !isFinite(x) || !isFinite(y)) return '';
            return '(' + local(String(x)) + (engine.comma ? '; ' : ', ') + local(String(y)) + ')';
        }).filter(Boolean).join(engine.comma ? '; ' : ', ');
        if (rows[rows.length - 1].children[0].value || rows[rows.length - 1].children[1].value) addCell('', '');
        readGraph(true);
        saveState();
    }, false);

    // Enter goes down to the row below, Shift+Enter up; Esc puts the table away
    graphCells.addEventListener('keydown', function (e) {
        var cell = e.target, row = cell.parentNode, to;
        if (cell.tagName !== 'INPUT') return;
        if (e.which === 27) {
            e.preventDefault();
            e.stopPropagation();
            to = graphInputs[graphCellsRow];
            showCells(-1);
            if (to) to.focus();
        } else if (e.which === 13) {
            e.preventDefault();
            to = e.shiftKey ? row.previousElementSibling : row.nextElementSibling;
            if (to && to.classList.contains('calc-graph-pair')) to.children[cell.dataset.c === 'x' ? 0 : 1].focus();
        }
    }, false);

    graphButton.addEventListener('click', function () {
        showGraph(!graph.classList.contains('calc-open'));
    }, false);

    // the color of the curve of box i
    function curveColor(i) {
        return GRAPH_CURVES[graphHue[i]];
    }

    // The boxes after the shown ones hold the colors not in use, first to last: the next box
    // gets the first of them
    function freeHues() {
        graphHue = graphHue.slice(0, graphCount).concat(graphHue.slice(graphCount).sort(function (a, b) { return a - b; }));
    }

    // a box for another curve, at the end, to type in
    graphAdd.addEventListener('click', function () {
        addCurve();
    }, false);

    function addCurve() {
        var box = graphInputs[graphCount];
        if (graphCount >= graphRows.length) return;
        if (graphTab === 'examples') showGraphTab('graph');
        box.value = '';
        graphCount++;
        freeHues();
        readGraph();
        saveState();
        focusBox(box);
        graphRows[graphCount - 1].scrollIntoView({ block: 'nearest' });
    }

    // a curve taken away: the ones below move up, with what is typed, hidden and their colors
    function removeCurve(i) {
        var j, hue = graphHue[i], focused = graphInputs.indexOf(document.activeElement);
        if (graphCount < 2) return;
        for (j = i; j < graphCount - 1; j++) graphInputs[j].value = graphInputs[j + 1].value;
        graphInputs[graphCount - 1].value = '';
        graphOff.splice(i, 1);
        graphOff.push(false);
        graphDiff.splice(i, 1);
        graphDiff.push(false);
        showCells(-1);
        graphHue.splice(i, 1);
        graphHue.splice(graphCount - 1, 0, hue);
        graphCount--;
        freeHues();
        hideTip();
        readGraph();
        saveState();
        if (focused > -1) graphInputs[Math.min(focused, graphCount - 1)].focus(); // the box in its place
    }

    graph.querySelector('.calc-past-close').addEventListener('click', closeGraph, false);

    // closed by its button or Esc; the graph's own window is closed then
    function closeGraph() {
        if (graphAlone) ask('graph-close'); else showGraph(false);
    }

    // pop out and pop in
    graphSize.addEventListener('click', function () {
        graphBig(!root.classList.contains('calc-big'));
    }, false);

    // The graph as big as the page: the calculator fills it and shows only the graph, with
    // more of the curves: on the website all of its window. The page may do it its own way:
    // the extension, whose popup cannot grow, opens the graph in a window of its own. True if it changed
    function graphBig(on) {
        if (on === root.classList.contains('calc-big') || (graphAlone && !on)) return false;
        hideTip();
        showMenu(false);
        if (on) {
            saveState(); // all of it, for the window that opens with it
            if (!ask('big', { big: true })) return showGraph(false), false; // in its own window, and not here as well
            if (!graph.classList.contains('calc-open')) showGraph(true);
        }
        root.classList.toggle('calc-big', on);
        if (!on) ask('big', { big: false });
        graphRender();
        return true;
    }

    // Big on a wide page, the line between the two columns: dragged, the left one is wider or
    // narrower, from GRAPH_SIDE_MIN to GRAPH_SIDE_MAX of what leaves the plot GRAPH_PLOT_MIN; a double click
    // puts it back as it was at first
    function setSide(w) {
        graphSide = w;
        if (w) graph.style.setProperty('--calc-graph-side', w + 'px'); else graph.style.removeProperty('--calc-graph-side');
    }

    graphSplit.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        e.preventDefault();
        graphSplit.setPointerCapture(e.pointerId);
        graphSplit.classList.add('calc-on');
        graphSplitFrom = { x: e.clientX, w: parseFloat(getComputedStyle(graph).gridTemplateColumns) };
    }, false);

    graphSplit.addEventListener('pointermove', function (e) {
        var cs = getComputedStyle(graph),
            room = (graph.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - GRAPH_PLOT_MIN) * GRAPH_SIDE_MAX;
        if (!graphSplitFrom || !graphSplit.hasPointerCapture(e.pointerId)) return;
        setSide(Math.round(Math.max(GRAPH_SIDE_MIN, Math.min(room, graphSplitFrom.w + e.clientX - graphSplitFrom.x))));
        drawGraph();
    }, false);

    graphSplit.addEventListener('lostpointercapture', function () {
        graphSplitFrom = null;
        graphSplit.classList.remove('calc-on');
        saveState();
    }, false);

    graphSplit.addEventListener('dblclick', function () {
        setSide(0);
        drawGraph();
        saveState();
    }, false);

    // the page asks for it: big and alone in the graph's own window
    root.addEventListener('calc-graph', function (e) {
        var d = e.detail || {};
        if (d.alone) {
            graphAlone = true;
            root.classList.add('calc-alone');
        }
        graphBig(!!d.big);
    }, false);

    // Clear starts again: no curves, and the view as at first
    graph.querySelector('.calc-past-clear').addEventListener('click', function () {
        clearGraph();
        saveState();
        focusBox(graphInputs[0]);
    }, false);

    function clearGraph() {
        graphInputs.forEach(function (box) { box.value = ''; });
        graphFrom.value = graphBy.value = '';
        graphCount = 1;
        graphHue = [0, 1, 2, 3, 4, 5, 6];
        graphOff = graphOff.map(function () { return false; });
        graphDiff = graphDiff.map(function () { return false; });
        showCells(-1);
        forgetLetters();
        graphView = null;
        graphLines = 0;
        readGraph();
    }

    graphInputs.forEach(function (box, i) {
        box.addEventListener('input', function () {
            readGraph(true);
            if (graphCellsRow === i) showCells(i), box.focus();
            saveState();
        }, false);
        // Enter goes on to the box of the next curve; after the last one, to a new box
        box.addEventListener('keydown', function (e) {
            if (e.which !== 13) return;
            e.preventDefault();
            if (i + 1 < graphCount) graphInputs[i + 1].focus();
            else if (box.value.trim()) addCurve();
        }, false);
        box.addEventListener('focus', drawGraph, false); // a busy graph shows the dots of this curve
    });

    function showGraph(open) {
        var box;
        if (!open && graphAlone) return; // its own window stays, even as a value is put in
        if (!open) graphBig(false); // a value put in from the big graph: the calculator again
        if (!open && stopSliders()) saveState(); // the sliders played stop where they are
        if (!open) areaOn(false);
        if (!open) showWindow(false);
        if (open) {
            closePanels(graph);
            placePanel(graph);
        }
        graph.classList.toggle('calc-open', open);
        graphButton.classList.toggle('calc-on', open);
        if (open) {
            readGraph();
            box = graphInputs[0];
            if (focusBox(box)) box.setSelectionRange(box.value.length, box.value.length);
        } else if (graphInputs.indexOf(document.activeElement) > -1) {
            document.activeElement.blur(); // the keys are the calculator's again
        }
    }

    // The functions and the view saved last time; one function, as the graph first kept it. The
    // boxes are as many as were saved with their colors; three without them, as the graph had,
    // up to the last one filled
    function loadGraph(saved) {
        var v = saved && saved.view, f = saved && (typeof saved.f === 'string' ? [saved.f] : saved.f),
            c = saved && saved.c, n = graphRows.length;
        if (Array.isArray(f)) {
            f = f.slice(0, n);
            graphInputs.forEach(function (box, i) { box.value = typeof f[i] === 'string' ? f[i] : ''; });
        }
        graphCount = 1;
        graphInputs.forEach(function (box, i) { if (box.value.trim()) graphCount = i + 1; });
        graphHue = [0, 1, 2, 3, 4, 5, 6];
        if (Array.isArray(c) && c.length >= graphCount && c.length <= n && c.every(function (h, i) {
            return h === Math.floor(h) && h >= 0 && h < n && c.indexOf(h) === i;
        })) {
            graphCount = c.length;
            graphHue = c.concat(graphHue.filter(function (h) { return c.indexOf(h) < 0; }));
        }
        graphView = v && [v.x, v.y, v.ux, v.uy].every(isFinite) && v.ux > 0 && v.uy > 0 ? { x: v.x, y: v.y, ux: v.ux, uy: v.uy } : null;
        setSide(saved && typeof saved.side === 'number' && saved.side >= GRAPH_SIDE_MIN && saved.side < 10000 ? Math.round(saved.side) : 0);
        graphOff = graphOff.map(function (off, i) { return !!(saved && Array.isArray(saved.off) && saved.off[i] === true); });
        graphDiff = graphDiff.map(function (on, i) {
            var d = saved && Array.isArray(saved.d) ? saved.d[i] : false;
            return d === true || GRAPH_FITS.indexOf(d) > -1 ? d : false;
        });
        showCells(-1);
        graphFrom.value = saved && typeof saved.from === 'string' ? saved.from : '';
        graphBy.value = saved && typeof saved.by === 'string' ? saved.by : '';
        // the sliders: { a: [its value, from, to] }
        forgetLetters();
        if (saved && saved.p && typeof saved.p === 'object') {
            Object.keys(saved.p).forEach(function (k) {
                var q = saved.p[k];
                if (/^[a-df-wz]$/.test(k) && Array.isArray(q) && q.length === 3 && q.every(function (n) {
                    return typeof n === 'number' && isFinite(n);
                }) && q[1] < q[2]) {
                    graphVars[k] = q[0];
                    graphRange[k] = [q[1], q[2]];
                }
            });
        }
        showGraphTab(saved && saved.tab);
    }

    // no values of letters: the functions read them from this same object, so it is emptied, not replaced
    function forgetLetters() {
        Object.keys(graphVars).forEach(function (k) { delete graphVars[k]; });
        graphRange = {};
    }

    // The functions are read again: a box that is not one yet is marked. A hidden curve has
    // none. The point kept on the old curves goes. Each letter but x has a slider, at 1 from
    // -10 to 10 at first; while a function is typed, the sliders wait until the typing stops.
    // A function named, f(x) = x^2, is made before the boxes that use it, f(x) + 1, f′(x),
    // wherever they are: each time round, the boxes that can be read now; what is left at the
    // end uses a name not made, or one made of itself. A name given twice is of the first box
    function readGraph(typing) {
        var letters = [], texts = graphInputs.map(function (box, i) { return i < graphCount ? box.value.trim() : ''; }),
            names = texts.map(CalcEngine.named), defs = {}, read = [], left = [], more = true;
        graphRels = [];
        graphPlanes = [];
        graphData = [];
        graphTwice = '';
        graphVersion++;
        names.forEach(function (k, i) {
            if (!k) return;
            if (defs.hasOwnProperty(k)) {
                graphTwice = k;
                names[i] = false;
            } else {
                defs[k] = null;
            }
        });
        texts.forEach(function (text, i) { if (text && names[i] !== false) left.push(i); });
        while (more) {
            more = false;
            left = left.filter(function (i) {
                var r = readBox(texts[i], defs);
                if (!r) return true;
                read[i] = r;
                if (names[i] && r.fn) defs[names[i]] = r.fn;
                more = true;
                return false;
            });
        }
        graphFns = graphInputs.map(function (box, i) {
            var text = texts[i], r = read[i] || {}, fn = r.fn || null, rel = r.rel || null, plane = r.plane || null,
                data = r.data || null, fit, row = graphRows[i];
            (fn || rel || plane || { letters: [] }).letters.forEach(function (k) {
                if (letters.indexOf(k) < 0) letters.push(k);
            });
            graphRels[i] = graphOff[i] ? null : rel;
            graphPlanes[i] = graphOff[i] ? null : plane;
            graphData[i] = graphOff[i] ? null : data;
            if (!text || rel || plane) graphDiff[i] = false; // an equation has no slope of its own to draw
            if (!data && graphDiff[i]) graphDiff[i] = true; // the fit of points is the slope of a function typed in their place
            if (!text) graphOff[i] = false; // what is typed next is shown, without its slope
            fit = data && graphDiff[i] && CalcEngine.fit(data, fitKind(i)); // the y′ of points is their best fit
            row.hidden = i >= graphCount;
            row.classList.toggle('calc-bad', !!text && !fn && !rel && !plane && !data);
            row.classList.toggle('calc-graph-rel', !!(rel || plane));
            row.classList.toggle('calc-graph-data', !!data);
            row.classList.toggle('calc-graph-named', !!CalcEngine.named(text));
            row.classList.toggle('calc-graph-off', graphOff[i]);
            row.querySelector('.calc-graph-diff').classList.toggle('calc-on', !!graphDiff[i]);
            row.querySelector('.calc-graph-diff').classList.toggle('calc-bad', !!(data && graphDiff[i] && !fit));
            row.querySelector('.calc-graph-diff').textContent = data ? (graphDiff[i] ? fitKind(i) : 'fit') : 'y′';
            row.classList.toggle('calc-graph-empty', !text);
            row.querySelector('.calc-graph-swatch').style.setProperty('--c', curveColor(i));
            return graphOff[i] ? null : data ? fit && fitCurve(fit) : fn;
        });
        if (graphCellsRow > -1 && (graphCellsRow >= graphCount || !(graphData[graphCellsRow] || !texts[graphCellsRow] ||
            CalcEngine.points(texts[graphCellsRow], engine.comma)))) showCells(-1); // its box is not of points now
        graphFnList.classList.toggle('calc-graph-single', graphCount < 2);
        graphFnList.classList.toggle('calc-graph-many', graphCount > 3);
        graphAdd.hidden = graphCount >= graphRows.length;
        letters.forEach(function (k) {
            if (typeof graphVars[k] !== 'number') graphVars[k] = 1;
            if (!graphRange[k]) graphRange[k] = [-10, 10];
        });
        clearTimeout(graphSliding);
        if (typing && letters.join() !== graphLetters.join()) {
            graphSliding = setTimeout(function () {
                showSliders(letters);
                graphRender(); // the plot has less room, or more
                saveState();
            }, 700);
        } else {
            showSliders(letters);
        }
        graphAt = graphPinned = null;
        graphRender();
    }

    // A slider for each letter: ▶ to play it, its value, to type as well, then where it goes
    // from, the slider and where it goes to. A value typed beyond the ends takes the end there
    function showSliders(letters) {
        if (letters.join() !== graphLetters.join()) {
            graphLetters = letters;
            Object.keys(graphPlay).forEach(function (k) {
                if (letters.indexOf(k) < 0) delete graphPlay[k]; // its slider goes, as it played
            });
            graphSliders.innerHTML = letters.map(function (k) {
                var box = ' type="text" spellcheck="false" autocomplete="off" maxlength="16"';
                return '<div class="calc-graph-slider" data-k="' + k + '">' +
                    '<span class="calc-graph-play" role="button" aria-label="Play ' + k + '"><svg viewBox="0 0 16 16" width="11" height="11">' +
                    '<path class="calc-graph-go" d="M4.5 2.8v10.4L13 8z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />' +
                    '<path class="calc-graph-stop" d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg></span>' +
                    '<label class="calc-graph-val"><i>' + k + '</i><span>=</span><input' + box + ' aria-label="' + k + ' ="></label>' +
                    '<input class="calc-graph-end"' + box + ' data-end="0" aria-label="' + k + ' from">' +
                    '<input class="calc-graph-range" type="range" aria-label="' + k + '">' +
                    '<input class="calc-graph-end"' + box + ' data-end="1" aria-label="' + k + ' to">' +
                    '</div>';
            }).join('');
            graphSliders.hidden = !letters.length;
            graphSliders.classList.toggle('calc-graph-many', letters.length > 2);
        }
        [].forEach.call(graphSliders.children, setSlider);
    }

    // A slider as its letter is now: playing or not, its value, its ends and a step that suits
    // them, 0.1 from -10 to 10. Not a box being typed in, nor one marked as it cannot be
    function setSlider(row) {
        var k = row.dataset.k, r = graphRange[k], step = sliderStep(r), range = row.querySelector('.calc-graph-range'),
            val = row.querySelector('.calc-graph-val input');
        playButton(row);
        range.max = r[1];
        range.min = r[0];
        range.step = step;
        range.value = graphVars[k];
        if (document.activeElement !== val) {
            val.value = sliderText(graphVars[k], step);
            val.parentNode.classList.remove('calc-bad');
        }
        [].forEach.call(row.querySelectorAll('.calc-graph-end'), function (end) {
            if (document.activeElement === end) return;
            end.value = local(String(r[end.dataset.end]));
            end.classList.remove('calc-bad');
        });
    }

    // its button: play, or pause while it plays
    function playButton(row) {
        var k = row.dataset.k, play = row.querySelector('.calc-graph-play');
        play.classList.toggle('calc-on', !!graphPlay[k]);
        play.setAttribute('aria-label', (graphPlay[k] ? 'Pause ' : 'Play ') + k);
    }

    // a hundredth of the slider, or less, as a power of ten
    function sliderStep(r) {
        return Math.pow(10, Math.floor(Math.log10((r[1] - r[0]) / 100)));
    }

    // a value of a slider, to its step: 1.5, not 1.5000000000000002
    function sliderText(v, step) {
        return local(String(+v.toFixed(Math.max(0, Math.min(12, -Math.round(Math.log10(step)))))));
    }

    // a slider dragged, a value or an end typed: the curves follow. It stops playing, there
    graphSliders.addEventListener('input', function (e) {
        var el = e.target, row = el.closest('.calc-graph-slider'), k = row && row.dataset.k, r = k && graphRange[k], n, ok;
        if (!row) return;
        delete graphPlay[k];
        playButton(row);
        if (el.classList.contains('calc-graph-range')) {
            graphVars[k] = +(+el.value).toPrecision(12);
            setSlider(row);
        } else {
            onlyNumber(el);
            n = boxNumber(el);
            if (/^-?[.,]?$/.test(el.value)) { // empty, or a number only begun: -, -. — waited for, not marked
                (el.classList.contains('calc-graph-end') ? el : el.parentNode).classList.remove('calc-bad');
                return;
            }
            ok = isFinite(n);
            if (el.classList.contains('calc-graph-end')) {
                ok = ok && (el.dataset.end === '0' ? n < r[1] : n > r[0]);
                el.classList.toggle('calc-bad', !ok);
                if (!ok) return;
                r[el.dataset.end] = n;
                graphVars[k] = Math.min(r[1], Math.max(r[0], graphVars[k])); // within the ends
            } else {
                el.parentNode.classList.toggle('calc-bad', !ok);
                if (!ok) return;
                graphVars[k] = n;
                r[0] = Math.min(r[0], n);
                r[1] = Math.max(r[1], n);
            }
            setSlider(row);
            saveState();
        }
        graphAt = null; // its points have moved; an area stays, with its curve
        if (graphPinned && !graphPinned.area) graphPinned = null;
        graphRender();
    }, false);

    // ▶ plays a slider, and pauses it
    graphSliders.addEventListener('click', function (e) {
        var play = e.target.closest('.calc-graph-play'), k = play && play.parentNode.dataset.k;
        if (!play) return;
        playSlider(k, !graphPlay[k]);
        if (graphPlay[k]) return;
        graphRender();
        saveState();
    }, false);

    // Played, a slider's value goes to one end and back, over and over, and the curves with
    // it, until it is paused, moved or typed in, or the graph closes; at the top end it starts
    // down. Paused, it stops at a value of its step, as dragging would
    function playSlider(k, on) {
        var row = graphSliders.querySelector('[data-k="' + k + '"]'), step;
        if (on === !!graphPlay[k]) return;
        if (on) {
            graphPlay[k] = graphVars[k] >= graphRange[k][1] ? -1 : 1;
            if (!graphFrame) {
                graphLast = 0;
                graphFrame = requestAnimationFrame(playFrame);
            }
        } else {
            delete graphPlay[k];
            step = sliderStep(graphRange[k]);
            graphVars[k] = +(Math.round(graphVars[k] / step) * step).toPrecision(12);
        }
        if (row) setSlider(row);
    }

    // Each slider played a step on, as far as the time since the frame before. A mark moves
    // with its curve, so the one pointed at or clicked goes
    function playFrame(time) {
        var gone = graphLast ? Math.min(100, time - graphLast) : 0;
        graphFrame = 0;
        graphLast = time;
        Object.keys(graphPlay).forEach(function (k) {
            var r = graphRange[k], v;
            v = graphVars[k] + graphPlay[k] * (r[1] - r[0]) * gone / GRAPH_PLAY;
            if (v >= r[1]) graphPlay[k] = -1;
            if (v <= r[0]) graphPlay[k] = 1;
            graphVars[k] = Math.min(r[1], Math.max(r[0], v));
        });
        if (!Object.keys(graphPlay).length) return;
        [].forEach.call(graphSliders.children, setSlider);
        if (graphAt && graphAt.t) graphAt = null;
        if (graphPinned && graphPinned.t) graphPinned = null;
        graphRender();
        graphFrame = requestAnimationFrame(playFrame);
    }

    // every slider stops; true if one played
    function stopSliders() {
        var some = Object.keys(graphPlay);
        some.forEach(function (k) { playSlider(k, false); });
        return some.length > 0;
    }

    // The sliders stop for a value to be taken: as the pointer comes onto the popup, which
    // moves with its point while they play, and as a value of the table is pressed, so it is
    // the one pressed that a click takes, and not drawn again under the pointer before the click
    [[graphPop, 'pointerenter'], [graphList, 'pointerdown']].forEach(function (on) {
        on[0].addEventListener(on[1], function () {
            if (!stopSliders()) return;
            if (graphTab !== 'table') drawGraph(); // with its marks again; the table is not drawn again under the pointer
            saveState();
        }, false);
    });

    // let go of: kept
    graphSliders.addEventListener('change', function (e) {
        if (e.target.classList.contains('calc-graph-range')) saveState();
    }, false);

    // a box left as it cannot be shows what the slider has again
    graphSliders.addEventListener('focusout', function (e) {
        var row = e.target.closest('.calc-graph-slider');
        if (row) setTimeout(function () { if (row.parentNode) setSlider(row); }, 0);
    }, false);

    // the tab shown, drawn as it is now; the examples stay as they are, and the plot beside
    // them, big, is drawn too: hidden, it is not
    function graphRender() {
        if (graphTab === 'table') renderTable(); else drawGraph();
    }

    // What a box is: a function of x, an equation or an inequality, a curve of a parameter or
    // points, as { fn }, { rel }, { plane } or { data }; null if none. A sequence, a(n) = 2n + 1,
    // is a plane too, of its kind seq: it has its range and its extra boxes as a polar curve has;
    // and a slope field, dy/dx = x – y, of its kind field, read before an equation would take it
    // as one of d, y and x. defs: the functions named
    function readBox(text, defs) {
        var r = CalcEngine.slopeField(text, engine.comma, graphVars, defs) || CalcEngine.sequence(text, engine.comma, graphVars, defs);
        if (r) return { plane: r };
        r = CalcEngine.graph(text, engine.comma, graphVars, defs);
        if (r) return { fn: r };
        if ((r = CalcEngine.relation(text, engine.comma, graphVars, defs))) return { rel: r };
        if ((r = CalcEngine.plane(text, engine.comma, graphVars, defs))) return { plane: r };
        return (r = CalcEngine.points(text, engine.comma)) ? { data: r } : null;
    }

    // the best fit of points as a curve, with fit: its kind, numbers and r²
    function fitCurve(fit) {
        return { at: fit.at, angles: false, letters: [], fit: fit };
    }

    // y = 1.95x + 0.1, r² = 0.998, as the picture names a best fit; a number of 0 leaves its part out
    function fitText(f) {
        var k = f.k, terms = {
            lin: [[k[0], 'x'], [k[1], '']],
            quad: [[k[0], 'x²'], [k[1], 'x'], [k[2], '']],
            exp: [[k[0], ' · ' + local(String(k[1])) + 'ˣ']],
            pow: [[k[0], 'x^' + local(String(k[1]))]],
            log: [[k[0], ''], [k[1], ' ln x']]
        }[f.kind].filter(function (t, i, all) { return t[0] || (i === all.length - 1 && all.every(function (u) { return !u[0]; })); });
        return 'y = ' + terms.map(function (t, i) {
            return (t[0] < 0 ? (i ? ' – ' : '–') : i ? ' + ' : '') + local(String(Math.abs(t[0]))) + t[1];
        }).join('') + ',  r² = ' + local(String(+f.r2.toPrecision(4)));
    }

    // the line of an equation that a point is on: the equation, or of an inequality of two, its part k
    function relPart(p) {
        var r = graphRels[p.i];
        return r && (r.parts ? r.parts[p.k || 0] : r);
    }

    // how far into a region a place is, as the engine has it: of an inequality where it holds,
    // of an equation on the side of it where its difference has the sign side
    function regionInto(rel, side) {
        return function (x, y) { return CalcEngine.within(rel, x, y, deg, side); };
    }

    // true if a curve has a function of an angle, so its x follows Deg or Rad
    function graphAngles() {
        return graphFns.concat(graphRels).some(function (fn) { return fn && fn.angles; });
    }

    // What the plot shows. Until it is moved or zoomed it is the start: x from -10 to 10 with
    // y as much each pixel, or for a function of an angle in degrees, x a turn either way
    function viewNow() {
        var u = GRAPH_WIDTH / plotWidth();
        if (graphView) return graphView;
        return { x: 0, y: 0, ux: graphAngles() && deg ? u * (deg === 2 ? 40 : 36) : u, uy: u };
    }

    // the plot's width, as it was last drawn while the table hides it
    function plotWidth() {
        return graphPlot.clientWidth || graphWidth || 340;
    }

    // the x and y of a place on the plot, in its pixels, and back
    function graphX(v, px) {
        return v.x + (px - graphPlot.clientWidth / 2) * v.ux;
    }

    function graphY(v, py) {
        return v.y - (py - graphPlot.clientHeight / 2) * v.uy;
    }

    function plotX(v, x) {
        return graphPlot.clientWidth / 2 + (x - v.x) / v.ux;
    }

    function plotY(v, y) {
        return graphPlot.clientHeight / 2 - (y - v.y) / v.uy;
    }

    // the space between lines of the grid: 1, 2 or 5 times a power of ten, some 50 pixels
    // or more. Degrees go by 15, 30, 45, 90 and 180, as angles are drawn
    function gridStep(u, degrees) {
        var want = u * 50, p = Math.pow(10, Math.floor(Math.log10(want))), m = want / p;
        if (degrees && want > 10 && want <= 180) return [15, 30, 45, 90, 180].filter(function (d) { return d >= want; })[0];
        return p * (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10);
    }

    // a number of the grid, as short as its step lets it be: 0.5, 20, 1e+8, with the decimal mark in use
    function gridLabel(n, step) {
        var a = Math.abs(n);
        if (a < step / 2) return '0';
        if (a >= 1e6 || a < 1e-4) return local(n.toExponential(2).replace(/\.?0+e/, 'e'));
        return local(String(+n.toFixed(Math.max(0, 1 - Math.floor(Math.log10(step))))));
    }

    // an x of the pointer, rounded to what a pixel tells apart: 1.53, not 1.5327869
    function graphRound(x, u) {
        var q = Math.pow(10, Math.floor(Math.log10(u)));
        return +(Math.round(x / q) * q).toPrecision(12);
    }

    // x or y of a place pointed at or clicked, a pixel being u: a round number within 3 pixels,
    // the roundest, of 1, 2 or 5 times a power of ten no closer than 10 pixels apart: 2 and not
    // 2.04; else as graphRound has it
    function graphNice(x, u) {
        var s = gridStep(u, false), r, m;
        while (s >= 10 * u * (1 - 1e-9)) {
            r = Math.round(x / s) * s;
            if (Math.abs(r - x) <= 3 * u) return +r.toPrecision(12);
            m = Math.round(s / Math.pow(10, Math.floor(Math.log10(s)) ));
            s = m === 5 ? s * 0.4 : s / 2;
        }
        return graphRound(x, u);
    }

    function drawGraph() {
        var w = graphPlot.clientWidth, h = graphPlot.clientHeight, r = Math.max(graphSharp, (window.devicePixelRatio || 1) * scale()),
            ctx = graphCanvas.getContext('2d'), v, key;
        if (!graph.classList.contains('calc-open') || !w || !h) return;
        graphWidth = w;
        v = viewNow();
        if (graphCanvas.width !== Math.round(w * r) || graphCanvas.height !== Math.round(h * r)) {
            graphCanvas.width = Math.round(w * r); // as sharp as the screen, however the page scales the calculator
            graphCanvas.height = Math.round(h * r);
        }
        ctx.setTransform(r, 0, 0, r, 0, 0);
        ctx.clearRect(0, 0, w, h);
        drawGrid(ctx, v, w, h);
        if (graphPinned && graphPinned.area) graphShade(ctx, v, w, h, graphPinned);
        graphFns.forEach(function (fn, i) {
            if (fn) drawCurve(ctx, v, w, h, fn, curveColor(i));
            if (fn && graphDiff[i] && !graphData[i]) drawCurve(ctx, v, w, h, slopeCurve(fn), curveColor(i), true);
            if (graphRels[i]) drawRelation(ctx, v, w, h, graphRels[i], curveColor(i));
            if (graphPlanes[i]) ({ seq: drawSequence, field: drawField }[graphPlanes[i].kind] || drawPlane)(ctx, v, w, h, graphPlanes[i], curveColor(i));
        });
        graphTangent(ctx, v, w + h, graphPinned);
        key = [graphVersion, v.x, v.y, v.ux, v.uy, w, h, deg, JSON.stringify(graphVars)].join();
        if (Object.keys(graphPlay).length) { // while sliders play the marks wait, found again as they stop: finding them each frame is too slow
            graphMarks = dataMarks();
        } else {
            if (!graphMarksKept || graphMarksKept.key !== key) {
                graphMarksKept = { key: key, marks: CalcEngine.keyPoints(graphFns, { x0: graphX(v, 0), x1: graphX(v, w), y0: graphY(v, h), y1: graphY(v, 0) },
                    deg, graphRels, graphPlanes) };
            }
            graphMarks = graphBusy(graphMarksKept.marks).concat(dataMarks());
        }
        graphMarks.forEach(function (p) {
            if (p.data) graphDot(ctx, v, p, 3.5, curveColor(p.i), curveColor(p.i)); // a point typed: full
            else graphDot(ctx, v, p, 3.5, GRAPH_INK.paper, curveColor(p.i));
        });
        if (graphShading && graphEdge) graphEdgeLine(ctx, v, h, graphEdge);
        [graphAt, graphPinned].forEach(function (p, at) {
            if (!p || p.area || (at && p === graphAt)) return;
            if (!p.t && !p.spot && p.sol !== undefined && graphPlanes[p.i]) p.y = solutionAt(graphPlanes[p.i], p.sol, p.x); // on its solution as the letters are now
            else if (!p.t && !p.spot && p.u !== undefined && graphPlanes[p.i]) onPlane(p);
            else if (!p.t && !p.spot && graphFns[p.i]) p.y = graphFns[p.i].at(p.x, deg, true); // on the curve as the unit is now
            else if (!p.t && !p.spot && graphRels[p.i]) onEquation(v, p);
            if (!isFinite(p.y) || Math.abs(plotY(v, p.y)) > 1e6) return;
            if (p.spot) {
                if (p === graphPinned) graphCross(ctx, v, p); // the pointer is cross enough until a click
            } else graphDot(ctx, v, p, 4.5, curveColor(p.i), GRAPH_INK.paper);
        });
        graphShown();
        placePop(v);
        fillWindow(v, w, h);
    }

    // the points typed in the boxes, as marks to point at and click
    function dataMarks() {
        var out = [];
        graphData.forEach(function (list, i) {
            (list || []).forEach(function (q) { out.push({ t: ['data'], x: q.x, y: q.y, i: i, data: true }); });
        });
        return out;
    }

    // a point on a curve of a parameter, at its parameter as the letters are now
    function onPlane(p) {
        var q = graphPlanes[p.i].at(p.u, deg);
        p.x = q[0];
        p.y = q[1];
    }

    // a point on an equation, on it again as the letters and the view are now: where it was if
    // it is not
    function onEquation(v, p) {
        var q = CalcEngine.onRelation(relPart(p), p.x, p.y, v.ux, v.uy, deg);
        if (q) {
            p.x = q.x;
            p.y = q.y;
        }
    }

    // The slope of the point clicked on a curve, for its popup, and its tangent, dashed in
    // the curve's color across the plot, as long as the plot is wide and high (far); on an
    // equation, upright where it goes straight up, with no slope in the popup. None for a
    // place off the curves, where two cross, or where the curve has no slope
    function graphTangent(ctx, v, far, p) {
        var one = p && !p.spot && !p.area && !p.data && p.j === undefined, plane = one && p.u !== undefined && graphPlanes[p.i],
            field = one && p.sol !== undefined && graphPlanes[p.i], fn = one && !plane && !field && graphFns[p.i], rel = one && !fn && !plane && !field && relPart(p), x, y, k;
        if (!p) return;
        p.m = NaN;
        if ((!fn && !rel && !plane && !field) || (plane && plane.kind === 'seq')) return; // a sequence is of dots, with no slope
        if (fn && !p.t) p.y = fn.at(p.x, deg, true); // on the curve as the unit and the letters are now
        p.m = field ? field.at(p.x, p.y, deg) : fn ? CalcEngine.slope(fn, p.x, deg) : rel ? CalcEngine.relationSlope(rel, p.x, p.y, deg) : planeSlope(plane, p.u); // of a solution, its field's slope there
        if (isNaN(p.m) || !isFinite(p.y)) return;
        x = plotX(v, p.x);
        y = plotY(v, p.y);
        k = isFinite(p.m) ? -p.m * v.ux / v.uy : 0; // its slope in pixels, down the plot
        if (!isFinite(p.m)) { // straight up
            ctx.beginPath();
            ctx.moveTo(x, y - far);
            ctx.lineTo(x, y + far);
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = curveColor(p.i);
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }
        far /= Math.sqrt(1 + k * k);
        ctx.beginPath();
        ctx.moveTo(x - far, y - k * far);
        ctx.lineTo(x + far, y + k * far);
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = curveColor(p.i);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // the slope of a curve of a parameter at u, dy/dx: how y goes with it over how x goes;
    // Infinity where x stands still, none where both do
    function planeSlope(c, u) {
        var span = c.range(deg), h = 1e-6 * Math.max(1, Math.abs(span[1] - span[0])), a = c.at(u - h, deg), b = c.at(u + h, deg),
            dx = b[0] - a[0], dy = b[1] - a[1], m;
        if (!isFinite(dx) || !isFinite(dy) || (!dx && !dy)) return NaN;
        if (Math.abs(dx) <= 1e-9 * Math.abs(dy)) return Infinity;
        m = dy / dx;
        return Math.abs(m) <= 1e-9 ? 0 : +m.toPrecision(8);
    }

    // A curve of a parameter, from places evenly along it as the parameter goes from its start
    // to its end, 2000, or one each quarter of a radian of it up to 50000, so no turn is lost
    // between two: r = θ/2 to 7720π goes round 3860 times. Between two that are far apart on
    // the plot where it may be seen, more, halved until they are 3 pixels apart: zoomed in, it
    // is a curve and not lines too long to draw. It breaks where it has no value and where it
    // jumps across most of the plot however near the places, as (t, tan t) does. The places
    // along it are kept while the unit and its letters stay; those on the plot while the view does too
    function drawPlane(ctx, v, w, h, c, color) {
        var at = [deg].concat(c.letters.map(function (k) { return graphVars[k]; })).join(),
            key = [v.x, v.y, v.ux, v.uy, w, h, at].join(), pts, on = false;
        if (!c.along || c.along.key !== at) {
            (function () {
                var ends = c.range(deg), turn = [2 * Math.PI, 360, 400][deg] / (2 * Math.PI),
                    n = Math.min(50000, Math.max(2000, Math.ceil((ends[1] - ends[0]) / turn / 0.25))), us = [], qs = [], k;
                for (k = 0; k <= n; k++) {
                    us.push(ends[0] + (ends[1] - ends[0]) * k / n);
                    qs.push(c.at(us[k], deg));
                }
                c.along = { key: at, us: us, qs: qs };
            })();
        }
        if (!c.kept || c.kept.key !== key) {
            pts = [];
            (function () {
                var more = 20000, k, a, b;
                function place(u, q) {
                    q = q || c.at(u, deg);
                    return { u: u, px: plotX(v, q[0]), py: plotY(v, q[1]) };
                }
                // the places between a and b, in order, after a and before b
                function between(a, b, depth) {
                    var d = Math.abs(b.px - a.px) + Math.abs(b.py - a.py), m;
                    if (!(d > 3) || !isFinite(d) || depth > 48 || more <= 0) return;
                    if (Math.max(a.px, b.px) < -d || Math.min(a.px, b.px) > w + d || Math.max(a.py, b.py) < -d || Math.min(a.py, b.py) > h + d) return; // not in the view
                    m = place((a.u + b.u) / 2);
                    more--;
                    between(a, m, depth + 1);
                    pts.push(m);
                    between(m, b, depth + 1);
                }
                for (k = 0; k < c.along.us.length; k++) {
                    b = place(c.along.us[k], c.along.qs[k]);
                    if (k) between(a, b, 0);
                    pts.push(b);
                    a = b;
                }
            })();
            c.kept = { key: key, pts: pts };
        }
        ctx.beginPath();
        c.kept.pts.forEach(function (p, k) {
            var q = c.kept.pts[k - 1], ok = isFinite(p.px) && isFinite(p.py) && Math.abs(p.px) < 1e6 && Math.abs(p.py) < 1e6;
            if (ok && on && Math.abs(p.px - q.px) + Math.abs(p.py - q.py) < (w + h) / 2) ctx.lineTo(p.px, p.py);
            else if (ok) ctx.moveTo(p.px, p.py);
            on = ok;
        });
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    // A sequence, a dot in its color at each of its terms in the view, at each whole n: smaller
    // where they are close together, so they stay apart
    function drawSequence(ctx, v, w, h, c, color) {
        var r = c.terms(deg), size = Math.min(3, Math.max(1.2, 0.35 / v.ux)), n, px, py,
            last = Math.min(r.from + r.list.length - 1, Math.floor(graphX(v, w + 4)));
        ctx.beginPath();
        for (n = Math.max(r.from, Math.ceil(graphX(v, -4))); n <= last; n++) {
            py = plotY(v, r.list[n - r.from]);
            if (!(py > -4 && py < h + 4)) continue; // out of the view, or of no value
            px = plotX(v, n);
            ctx.moveTo(px + size, py);
            ctx.arc(px, py, size, 0, 2 * Math.PI);
        }
        ctx.fillStyle = color;
        ctx.fill();
    }

    // the next term of a sequence from the point p on it, step on that way, past those of no
    // value, as far as its last; null where there is none
    function traceSequence(p, i, dir, step) {
        var r = graphPlanes[i].terms(deg), last = r.from + r.list.length - 1, n = Math.max(r.from, Math.min(last, p.u + dir * step));
        while (n >= r.from && n <= last && n !== p.u && isNaN(r.list[n - r.from])) n += dir;
        if (n < r.from || n > last || n === p.u) return null;
        return { i: i, u: n, x: n, y: r.list[n - r.from] };
    }

    // What stops a sequence drawn, said, of the first one stopped: '' where none is. bad: of one
    // whose term is of one before its first, which it cannot be; else of one too large to draw
    // on, or of no value, or of more than 10000 terms
    function sequenceNote(bad) {
        var out = '';
        graphPlanes.some(function (c) {
            var s = c && c.kind === 'seq' && c.terms(deg).stop, a = c && c.name;
            if (!s || (s.why === 'before') !== bad) return false;
            out = s.why === 'before' ? a + '(' + s.n + ') is of ' + a + '(' + s.need + '), before its first term: give that one too, {' + a + '(' + s.need + ') = …}.' :
                s.why === 'large' ? a + '(' + s.n + ') is too large to draw: the sequence stops there.' :
                    s.why === 'none' ? a + '(' + s.n + ') has no value, so the terms after it have none: the sequence stops there.' :
                        'The first 10000 terms of ' + a + ': n up to ' + (s.n - 1) + '.';
            return true;
        });
        return out;
    }

    // A slope field: a short line across each place of a grid, 22 pixels apart, at the slope
    // there, fainter in its color, none where it has no slope and upright where it goes straight
    // up; the places at the middles of the grid's squares, so that none is on an axis, and fixed
    // to the plane as it moves. Then the solution through each start given, in its color, a dot
    // where it starts
    function drawField(ctx, v, w, h, c, color) {
        var gap = 22, half = gap * 0.31, sx = gap * v.ux, sy = gap * v.uy, i, j, x, y, px, py, m, k, dx, dy, shown = 0;
        ctx.beginPath();
        for (i = Math.floor(graphX(v, 0) / sx); (i + 0.5) * sx <= graphX(v, w); i++) {
            for (j = Math.floor(graphY(v, h) / sy); (j + 0.5) * sy <= graphY(v, 0); j++) {
                x = (i + 0.5) * sx;
                y = (j + 0.5) * sy;
                m = c.at(x, y, deg);
                if (isNaN(m)) continue;
                shown++;
                px = plotX(v, x);
                py = plotY(v, y);
                k = -m * v.ux / v.uy; // its slope in pixels, down the plot
                dx = isFinite(k) ? half / Math.sqrt(1 + k * k) : 0;
                dy = isFinite(k) ? k * dx : half;
                ctx.moveTo(px - dx, py - dy);
                ctx.lineTo(px + dx, py + dy);
            }
        }
        c.none = !shown; // of no slope anywhere in the view, for the note
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
        fieldSolutions(c, v, w, h).forEach(function (s) {
            var on = false;
            ctx.beginPath();
            s.pts.forEach(function (q) {
                var a = plotX(v, q[0]), b = plotY(v, q[1]), ok = Math.abs(b) < 1e5;
                if (ok && on) ctx.lineTo(a, b); else if (ok) ctx.moveTo(a, b);
                on = ok;
            });
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.strokeStyle = color;
            ctx.stroke();
            if (isFinite(s.y0) && Math.abs(plotY(v, s.y0)) < 1e5) {
                ctx.beginPath();
                ctx.arc(plotX(v, s.x0), plotY(v, s.y0), 3, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
            }
        });
    }

    // The solutions of a slope field through its starts, across the view and 40 pixels past it
    // each way, a step a pixel and y to move no more than 4 pixels in one, as far as y stays
    // within 20 heights of the view: kept while the view, the unit and the sliders stay
    function fieldSolutions(c, v, w, h) {
        var key = [v.x, v.y, v.ux, v.uy, w, h, deg].concat(c.letters.map(function (k) { return graphVars[k]; })).join(),
            top = graphY(v, 0), bottom = graphY(v, h), big = Math.max(Math.abs(top), Math.abs(bottom)) + 20 * (top - bottom);
        if (c.kept && c.kept.key === key) return c.kept.sols;
        c.kept = { key: key, sols: c.starts(deg).map(function (q) {
            var r = q.every(isFinite) ? CalcEngine.solveField(c, q[0], q[1], graphX(v, -40), graphX(v, w + 40), deg, v.ux, 4 * v.uy, big) :
                { pts: [], back: null, ahead: null };
            r.x0 = q[0];
            r.y0 = q[1];
            return r;
        }) };
        return c.kept.sols;
    }

    // y at x of the solution k of the slope field c, between the two steps about x; NaN out of it
    function solutionY(c, k, x) {
        var pts = c.kept && c.kept.sols[k] ? c.kept.sols[k].pts : [], lo = 0, hi = pts.length - 1, mid, t;
        if (!pts.length || x < pts[0][0] || x > pts[hi][0]) return NaN;
        while (hi - lo > 1) {
            mid = (lo + hi) >> 1;
            if (pts[mid][0] <= x) lo = mid; else hi = mid;
        }
        t = pts[hi][0] === pts[lo][0] ? 0 : (x - pts[lo][0]) / (pts[hi][0] - pts[lo][0]);
        return pts[lo][1] + t * (pts[hi][1] - pts[lo][1]);
    }

    // y at x of the solution k of the slope field c, to all the digits shown: from its start in 4096
    // steps of Runge and Kutta, as far as it is drawn; NaN out of it
    function solutionAt(c, k, x) {
        var s = c.kept && c.kept.sols[k], r;
        if (!s || !isFinite(solutionY(c, k, x))) return NaN;
        if (x === s.x0) return s.y0;
        r = CalcEngine.solveField(c, s.x0, s.y0, Math.min(x, s.x0), Math.max(x, s.x0), deg, Math.abs(x - s.x0) / 4096);
        return r.back || r.ahead ? NaN : r.pts[x < s.x0 ? 0 : r.pts.length - 1][1];
    }

    // where a solution starts, as the point is written: (0, 1), or (0; 1) with the decimal comma
    function startText(s) {
        return '(' + local(String(+s.x0.toPrecision(6))) + (engine.comma ? '; ' : ', ') + local(String(+s.y0.toPrecision(6))) + ')';
    }

    // What stops a solution of a slope field in the view, said, of the first one stopped; else
    // of a slope field of no slope anywhere in the view; else, with a slope field, what a click
    // does; '' where there is none. One gone far out of the view, up or down, stops unsaid
    function fieldNote() {
        var v = viewNow(), from = graphX(v, 0), to = graphX(v, graphWidth || graphPlot.clientWidth), top = graphY(v, 0), bottom = graphY(v, graphPlot.clientHeight), out = '',
            fields = graphPlanes.filter(function (c) { return c && c.kind === 'field'; });
        fields.some(function (c) {
            if (c.none) {
                out = 'The slope has no value anywhere in the view.';
                return true;
            }
            return (c.kept ? c.kept.sols : []).some(function (s) {
                var stop = [s.back, s.ahead].filter(function (q) { return q && q.x >= from && q.x <= to && q.y >= bottom && q.y <= top; })[0];
                if (!stop) return false;
                out = 'The solution through ' + startText(s) + ' stops at x = ' + local(String(graphNice(stop.x, v.ux))) + ': ' + {
                    none: 'its slope has no value there.',
                    large: 'it grows too large to draw.',
                    steep: 'it goes straight up or down there.',
                    many: 'it takes too many steps.'
                }[stop.why];
                return true;
            });
        });
        return out || (fields.length ? 'Point for values; click off the curves for a solution there.' : '');
    }

    // A click off the curves with a slope field shown: the solution through the place clicked,
    // its start written in the braces of the field's box, the last of them shown, so it is kept
    // with the box and taken out as any text is. The point on it clicked, or null with no field.
    // Up to FIELD_STARTS of them: past that the first one goes, so the box stays short enough to read
    function addStart(p) {
        var i = graphPlanes.length - 1, c, sep = engine.comma ? '; ' : ', ', given;
        while (i >= 0 && !(graphPlanes[i] && graphPlanes[i].kind === 'field')) i--;
        if (i < 0) return null;
        c = graphPlanes[i];
        given = c.given.concat('y(' + local(String(p.x)) + ') = ' + local(String(p.y))).slice(-FIELD_STARTS);
        graphInputs[i].value = c.text + ' {' + given.join(sep) + '}';
        readGraph();
        saveState();
        return { i: i, sol: given.length - 1, x: p.x, y: p.y };
    }

    // The area of a curve from a to b, shaded in its color down to the x axis, or to the curve
    // below it (j), and its value, as the letters are now: the integral of the curve, or of the
    // one less the other; the popup is in the middle of what is in the view. Where a curve has
    // no value it is not shaded, and the area is none
    function graphShade(ctx, v, w, h, p) {
        if (p.rel) return shadeRegion(ctx, v, w, h, p);
        var fn = graphFns[p.i], low = p.j !== undefined ? graphFns[p.j] : null, x0 = Math.max(0, plotX(v, p.a)),
            x1 = Math.min(w, plotX(v, p.b)), at = [x0], run = [], k, x;
        function edge(y) {
            return Math.max(-h, Math.min(2 * h, plotY(v, y)));
        }
        function bottom(x) {
            return p.j === undefined ? 0 : low ? low.at(x, deg) : NaN;
        }
        // the shading of the values in a row, along the curve and back along what is below it
        function fill() {
            if (run.length) {
                ctx.moveTo(run[0].px, run[0].top);
                run.forEach(function (q) { ctx.lineTo(q.px, q.top); });
                run.reverse().forEach(function (q) { ctx.lineTo(q.px, q.low); });
                ctx.closePath();
            }
            run = [];
        }
        p.s = fn && (p.j === undefined || low) ? CalcEngine.area(p.j === undefined ? fn : {
            at: function (x, deg) { return fn.at(x, deg) - low.at(x, deg); }
        }, p.a, p.b, deg) : NaN;
        x = graphX(v, (x0 + x1) / 2);
        p.x = x;
        p.y = fn && isFinite(fn.at(x, deg) + bottom(x)) ? (fn.at(x, deg) + bottom(x)) / 2 : 0;
        if (!fn || x1 <= x0) return;
        for (k = Math.ceil(x0 * 2); k <= x1 * 2; k++) at.push(k / 2);
        at.push(x1);
        ctx.beginPath();
        at.forEach(function (px) {
            var x = graphX(v, px), y = fn.at(x, deg), y0 = bottom(x);
            if (isFinite(y) && isFinite(y0)) run.push({ px: px, top: edge(y), low: edge(y0) });
            else fill();
        });
        fill();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = curveColor(p.i);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // The area of a region from a to b: of an inequality where it holds, or inside an equation on
    // the side the drag began, shaded in its color a column of pixels at a time, and its value,
    // found once the drag ends: none where it goes on past five views high (lo to hi). The
    // columns are kept while the view and its letters stay, and the value while its ends stay
    function shadeRegion(ctx, v, w, h, p) {
        var rel = graphRels[p.i], into = rel && regionInto(rel, p.side), x0 = Math.max(0, plotX(v, p.a)), x1 = Math.min(w, plotX(v, p.b)),
            letters = rel ? rel.letters.map(function (k) { return graphVars[k]; }).join() : '', key, px, mid;
        p.x = graphX(v, (x0 + x1) / 2);
        p.y = (graphY(v, 0) + graphY(v, h)) / 2;
        if (!rel) {
            p.s = NaN;
            return;
        }
        key = [p.a, p.b, p.side, p.lo, p.hi, deg, letters].join();
        if (!(graphStart && graphShading) && p.sKey !== key) { // not while it is dragged
            p.s = CalcEngine.regionArea(into, p.a, p.b, p.lo, p.hi, deg);
            p.sKey = key;
        }
        if (p.sKey !== key) p.s = NaN;
        if (x1 <= x0) return;
        key = [v.x, v.y, v.ux, v.uy, w, h, x0, x1, key].join();
        if (!p.cols || p.cols.key !== key) {
            p.cols = { key: key, at: [] };
            for (px = Math.floor(x0); px < Math.ceil(x1); px++) p.cols.at.push({ px: px, s: CalcEngine.spans(into, graphX(v, px + 0.5), p.lo, p.hi) });
        }
        ctx.beginPath();
        p.cols.at.forEach(function (col) {
            col.s.forEach(function (s) {
                var top = Math.max(-1, plotY(v, s[1])), bottom = Math.min(h + 1, plotY(v, s[0]));
                if (bottom > top) ctx.rect(col.px, top, 1, bottom - top);
            });
        });
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = curveColor(p.i);
        ctx.fill();
        ctx.globalAlpha = 1;
        mid = p.cols.at[Math.floor(p.cols.at.length / 2)];
        mid = mid && mid.s.filter(function (s) { return s[1] > graphY(v, h) && s[0] < graphY(v, 0); })[0];
        if (mid) p.y = (Math.max(mid[0], graphY(v, h)) + Math.min(mid[1], graphY(v, 0))) / 2;
    }

    // The region a place is in, for its area: inside an inequality where it holds, or inside an
    // equation, x² + y² = 25, the smallest in y there that ends both ways; else between the curve
    // just above it and the one just below at its x; else, over or under every curve, the nearest
    // one down or up to the x axis; else an inequality that goes on without end, whose area is
    // none. Null where no curve has a value there
    function areaRegion(at) {
        var v = viewNow(), x = graphX(v, at.x), y = graphY(v, at.y), above = null, below = null, near = null, open = null, inner = null,
            tall = graphPlot.clientHeight * v.uy, lo = graphY(v, graphPlot.clientHeight) - 2 * tall, hi = graphY(v, 0) + 2 * tall;
        graphRels.forEach(function (rel, i) {
            var side = rel && rel.op === '=' ? (rel.at(x, y, deg) < 0 ? -1 : 1) : 0, s;
            if (!rel || !(CalcEngine.within(rel, x, y, deg, side) > 0)) return;
            s = CalcEngine.spans(regionInto(rel, side), x, lo, hi).filter(function (q) { return q[0] <= y && y <= q[1]; })[0];
            if (!s) return;
            if (!isFinite(s[1] - s[0])) {
                if (rel.op !== '=' && !open) open = { i: i, rel: true, side: side, lo: lo, hi: hi };
                return;
            }
            if (!inner || s[1] - s[0] < inner.len) inner = { i: i, rel: true, side: side, lo: lo, hi: hi, len: s[1] - s[0] };
        });
        if (inner) return inner;
        graphFns.forEach(function (fn, i) {
            var fy = fn ? fn.at(x, deg) : NaN, d = Math.abs(plotY(v, fy) - at.y);
            if (!isFinite(fy)) return;
            if (fy >= y && (!above || fy < above.y)) above = { i: i, y: fy };
            if (fy < y && (!below || fy > below.y)) below = { i: i, y: fy };
            if (!near || d < near.d) near = { i: i, d: d };
        });
        if (above && below) return { i: above.i, j: below.i };
        return near ? { i: near.i } : open;
    }

    // an end of an area, at px of the plot: the x of a dot within reach of a curve of it, a
    // root or a crossing, else of a line of the grid within reach, else the x there to a round
    // step some 5 pixels wide, 1, 2 or 5 times a power of ten: 2 and not 2.04
    function areaEnd(v, r, px) {
        var best = null, x = graphX(v, px), grid = gridStep(v.ux, graphAngles() && deg === 1), fine = gridStep(v.ux / 10, false);
        function of(i) {
            return i !== undefined && (i === r.i || i === r.j);
        }
        graphMarks.forEach(function (p) {
            var d = Math.abs(plotX(v, p.x) - px);
            if ((of(p.i) || of(p.j)) && d <= 8 && (!best || d < best.d)) best = { d: d, x: p.x };
        });
        if (best) return best.x;
        if (Math.abs(plotX(v, Math.round(x / grid) * grid) - px) <= 6) return +(Math.round(x / grid) * grid).toPrecision(12);
        return +(Math.round(x / fine) * fine).toPrecision(12);
    }

    // the drag with ∫ pressed: the area of the region where it began, from there to the pointer;
    // begun where no curve has a value, from the first place on the way that has one. Its popup
    // waits for the drag to end. False until there is such a place
    function graphAreaTo(s, at) {
        var v = viewNow(), a, b;
        at = { x: Math.max(0, Math.min(graphPlot.clientWidth, at.x)), y: at.y }; // past the side, the area ends at it
        if (!s.r) {
            s.from = s.p[0];
            s.r = areaRegion(s.from);
            if (!s.r) {
                s.from = at;
                s.r = areaRegion(at);
            }
            s.i = s.r ? s.r.i : -1;
            if (s.r) s.a = areaEnd(v, s.r, s.from.x); // its x, kept, as the wheel may zoom on the way
        }
        if (s.i < 0) return false;
        a = s.a;
        b = areaEnd(v, s.r, at.x);
        graphPinned = { area: true, i: s.r.i, j: s.r.j, a: Math.min(a, b), b: Math.max(a, b) };
        if (s.r.rel) {
            graphPinned.rel = true;
            graphPinned.side = s.r.side;
            graphPinned.lo = s.r.lo;
            graphPinned.hi = s.r.hi;
        }
        graphAt = graphEdge = null;
        popShut();
        drawGraph();
        return true;
    }

    // The point clicked on a curve, traced by the arrow keys: ← and → move it along the curve,
    // stopping at a dot on the way, a root or a crossing; ↑ and ↓ take it to the curve above or
    // below at its x. The view moves to keep it in, and its popup shows. False where there is
    // no such point, for the keys to do what they do in the calculator
    function graphTrace(key, shift) {
        var p = graphPinned, v = viewNow(), w = graphPlot.clientWidth, h = graphPlot.clientHeight,
            dir = key === 39 || key === 38 ? 1 : -1, i, x, next = null, px, py, dx = 0, dy = 0;
        if (!p || p.spot || p.area || !graph.classList.contains('calc-open') || !graphPlot.offsetWidth) return false;
        i = p.j !== undefined && p.j === graphTracing ? p.j : p.i;
        if (!graphFns[i] && !graphRels[i] && !graphPlanes[i] && !graphData[i]) return false;
        if (p.data && (key === 37 || key === 39)) {
            next = graphMarks.filter(function (m) { return m.data && m.i === p.i && (m.x - p.x) * dir > 0; }).sort(function (a, b) {
                return (a.x - b.x) * dir;
            })[0];
            if (!next) return true;
        } else if (graphPlanes[i] && p.u !== undefined && (key === 37 || key === 39)) {
            next = graphPlanes[i].kind === 'seq' ? traceSequence(p, i, dir, shift ? 10 : 1) : tracePlane(v, p, i, dir, GRAPH_TRACE * (shift ? 10 : 1));
            if (!next) return true;
        } else if (graphPlanes[i] && p.sol !== undefined && (key === 37 || key === 39)) { // along a solution of a slope field, as along a curve
            x = graphRound(p.x + dir * GRAPH_TRACE * (shift ? 10 : 1) * v.ux, v.ux);
            next = { i: i, sol: p.sol, x: x, y: solutionAt(graphPlanes[i], p.sol, x) };
            if (!isFinite(next.y)) return true;
        } else if (graphRels[i] && (key === 37 || key === 39)) {
            next = traceEquation(v, p, i, dir, GRAPH_TRACE * (shift ? 10 : 1));
            if (!next) return true;
        } else if (!graphFns[i] && (key === 37 || key === 39)) {
            return true;
        } else
        if (key === 38 || key === 40) {
            graphFns.forEach(function (fn, k) {
                var y = fn && k !== i ? fn.at(p.x, deg, true) : NaN;
                if (isFinite(y) && (y - p.y) * dir > 0 && (!next || Math.abs(y - p.y) < Math.abs(next.y - p.y))) next = { i: k, x: p.x, y: y };
            });
            if (!next) return true;
        } else {
            x = graphRound(p.x + dir * GRAPH_TRACE * (shift ? 10 : 1) * v.ux, v.ux);
            graphMarks.forEach(function (m) {
                if ((m.i === i || m.j === i) && (m.x - p.x) * dir > v.ux / 2 && (m.x - x) * dir <= 0 && // not the one it is on, found again
                    (!next || Math.abs(m.x - p.x) < Math.abs(next.x - p.x))) next = m;
            });
            if (!next) next = { i: i, x: x, y: graphFns[i].at(x, deg, true) };
        }
        if (graphStep && graphStep.p !== next) graphStep = null;
        graphTracing = next.i === i || next.j === i ? i : next.i;
        graphPinned = graphAt = next;
        graphPopShut = false;
        popLater(false);
        px = plotX(v, next.x);
        py = plotY(v, next.y);
        if (px < 20 || px > w - 20) dx = px < 20 ? px - 20 : px - (w - 20);
        if (isFinite(py) && (py < 20 || py > h - 20)) dy = py < 20 ? py - 20 : py - (h - 20);
        if (dx || dy) {
            graphView = { x: v.x + dx * v.ux, y: v.y - dy * v.uy, ux: v.ux, uy: v.uy };
            clearTimeout(graphSaving);
            graphSaving = setTimeout(saveState, 300);
        }
        drawGraph();
        return true;
    }

    // The point after p along equation i, s pixels on, or the dot before that: → the way that
    // goes right, or up where it goes straight up, and on from there the way the last press
    // went, round a circle and not back at its side; ← back. Null where it has no more
    function traceEquation(v, p, i, dir, s) {
        var rel = relPart(p), a = plotX(v, p.x), b = plotY(v, p.y), last = graphStep && graphStep.p === p ? graphStep : null,
            fx = rel.at(graphX(v, a + 0.5), p.y, deg) - rel.at(graphX(v, a - 0.5), p.y, deg),
            fy = rel.at(p.x, graphY(v, b + 0.5), deg) - rel.at(p.x, graphY(v, b - 0.5), deg),
            n = Math.hypot(fx, fy), t, near = null, q, d;
        if (!isFinite(n) || !n) return null;
        t = { x: fy / n, y: -fx / n }; // along it, in pixels down the plot
        if (last ? (t.x * last.x + t.y * last.y) * last.dir * dir < 0 : Math.abs(t.x) > 1e-3 ? t.x * dir < 0 : t.y * dir > 0) {
            t.x = -t.x;
            t.y = -t.y;
        }
        graphMarks.forEach(function (m) {
            var dx = plotX(v, m.x) - a, dy = plotY(v, m.y) - b, on = dx * t.x + dy * t.y;
            if ((m.i === i || m.j === i) && on > 0.5 && on <= s + 0.5 && Math.abs(dx * t.y - dy * t.x) < 3 && (!near || on < near.on)) near = { on: on, m: m };
        });
        q = near ? near.m : CalcEngine.onRelation(rel, graphX(v, a + t.x * s), graphY(v, b + t.y * s), v.ux, v.uy, deg);
        if (!q) return null;
        if (!near && graphRels[i].parts && !CalcEngine.holds(graphRels[i], q.x, q.y, deg)) return null; // past a corner
        if (!near) q = { i: i, x: q.x, y: q.y, k: p.k };
        d = Math.hypot(plotX(v, q.x) - a, plotY(v, q.y) - b);
        if (d > 3 * s + 3) return null; // found on another part of it, not the next place along
        graphStep = { p: q, x: d ? (plotX(v, q.x) - a) / d : t.x, y: d ? (plotY(v, q.y) - b) / d : t.y, dir: dir };
        return q;
    }

    // The point after p along curve i of a parameter, s pixels on, or the dot before that: →
    // the way the parameter grows, ← back, as far as its ends
    function tracePlane(v, p, i, dir, s) {
        var c = graphPlanes[i], ends = c.range(deg), h = (ends[1] - ends[0]) * 1e-5, a = c.at(p.u - h, deg), b = c.at(p.u + h, deg),
            speed = Math.hypot(plotX(v, b[0]) - plotX(v, a[0]), plotY(v, b[1]) - plotY(v, a[1])) / (2 * h),
            u = p.u + dir * (speed > 0 && isFinite(speed) ? s / speed : (ends[1] - ends[0]) / 2000), near = null, q;
        u = Math.max(ends[0], Math.min(ends[1], u));
        if (u === p.u) return null;
        graphMarks.forEach(function (m) {
            if ((m.i === i || m.j === i) && m.u !== undefined && (m.u - p.u) * dir > 1e-12 && (m.u - u) * dir <= 0 &&
                (!near || Math.abs(m.u - p.u) < Math.abs(near.u - p.u))) near = m;
        });
        if (near) return near;
        q = c.at(u, deg);
        return { i: i, u: u, x: q[0], y: q[1] };
    }

    // a place on the area shaded, or by its edge
    function onArea(v, p, at) {
        if (p.rel) return graphX(v, at.x) >= p.a && graphX(v, at.x) <= p.b && !!graphRels[p.i] &&
            CalcEngine.within(graphRels[p.i], graphX(v, at.x), graphY(v, at.y), deg, p.side) > 0;
        var x = graphX(v, at.x), fn = graphFns[p.i], low = p.j === undefined ? null : graphFns[p.j],
            top = plotY(v, fn ? fn.at(x, deg) : NaN), bottom = plotY(v, p.j === undefined ? 0 : low ? low.at(x, deg) : NaN);
        return x >= p.a && x <= p.b && at.y >= Math.min(top, bottom) - 4 && at.y <= Math.max(top, bottom) + 4;
    }

    // The ∫ button, pressed or let go: pressed, the next drag along a curve shades its area
    function areaOn(on) {
        graphShading = on;
        graphEdge = null;
        graphAreaButton.classList.toggle('calc-on', on);
        graphPlot.classList.toggle('calc-graph-shading', on);
        if (graph.classList.contains('calc-open')) graphShown();
    }

    // where an area would start from the pointer, with ∫ pressed: an upright line at its x, and
    // a dot on its curve there, or on both it would be between
    function graphEdgeLine(ctx, v, h, e) {
        var x = Math.round(plotX(v, e.x)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.lineWidth = 1;
        ctx.strokeStyle = curveColor(e.i);
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        [e.i, e.j].forEach(function (i) {
            var y = i !== undefined && graphFns[i] ? graphFns[i].at(e.x, deg) : NaN;
            if (isFinite(y) && Math.abs(plotY(v, y)) < 1e6) graphDot(ctx, v, { x: e.x, y: y }, 4.5, curveColor(i), GRAPH_INK.paper);
        });
    }

    // a place away from the curves, clicked: a cross
    function graphCross(ctx, v, p) {
        var x = Math.round(plotX(v, p.x)) + 0.5, y = Math.round(plotY(v, p.y)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = GRAPH_INK.axis;
        ctx.stroke();
    }

    // Too many dots cannot be read: then only those of one curve are shown, and its crossings.
    // The curve is the one pointed at, else the one whose box is being typed in, else the first
    function graphBusy(marks) {
        var box = graphInputs.indexOf(document.activeElement),
            one = graphAt && !graphAt.spot ? graphAt.i : graphPinned && !graphPinned.spot ? graphPinned.i : box > -1 ? box : 0;
        if (marks.length <= 24) return marks;
        return marks.filter(function (p) { return p.i === one || p.j === one; });
    }

    // a point of a curve: a hollow dot for a mark, a full one for the point shown
    function graphDot(ctx, v, p, size, fill, ring) {
        ctx.beginPath();
        ctx.arc(plotX(v, p.x), plotY(v, p.y), size, 0, 2 * Math.PI);
        ctx.fillStyle = fill;
        ctx.strokeStyle = ring;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
    }

    // the lines of the grid, the axes, and the numbers along them; an axis out of
    // the view leaves its numbers at the nearest edge
    function drawGrid(ctx, v, w, h) {
        var sx = gridStep(v.ux, graphAngles() && deg === 1), sy = gridStep(v.uy, false),
            ax = Math.max(1, Math.min(w - 1, Math.round(plotX(v, 0)))) + 0.5, // where the axes are drawn, on whole pixels
            ay = Math.max(1, Math.min(h - 1, Math.round(plotY(v, 0)))) + 0.5,
            labelY = Math.min(h - 4, ay + 13), onLeft = ax > w - 40, k, p, text;

        ctx.lineWidth = 1;
        ctx.strokeStyle = GRAPH_INK.grid;
        ctx.beginPath();
        for (k = Math.ceil(graphX(v, 0) / sx); k * sx <= graphX(v, w); k++) {
            p = Math.round(plotX(v, k * sx)) + 0.5;
            ctx.moveTo(p, 0);
            ctx.lineTo(p, h);
        }
        for (k = Math.ceil(graphY(v, h) / sy); k * sy <= graphY(v, 0); k++) {
            p = Math.round(plotY(v, k * sy)) + 0.5;
            ctx.moveTo(0, p);
            ctx.lineTo(w, p);
        }
        ctx.stroke();

        ctx.strokeStyle = GRAPH_INK.axis;
        ctx.beginPath();
        if (plotY(v, 0) >= 0 && plotY(v, 0) <= h) {
            ctx.moveTo(0, ay);
            ctx.lineTo(w, ay);
        }
        if (plotX(v, 0) >= 0 && plotX(v, 0) <= w) {
            ctx.moveTo(ax, 0);
            ctx.lineTo(ax, h);
        }
        ctx.stroke();

        ctx.font = '10px Play, sans-serif';
        ctx.fillStyle = GRAPH_INK.text;
        ctx.strokeStyle = GRAPH_INK.paper; // a rim of the paper, so a number reads over a line
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        for (k = Math.ceil(graphX(v, 0) / sx); k * sx <= graphX(v, w); k++) {
            p = plotX(v, k * sx);
            if (!k || p < 10 || p > w - 10) continue;
            text = gridLabel(k * sx, sx);
            ctx.strokeText(text, p, labelY);
            ctx.fillText(text, p, labelY);
        }
        ctx.textAlign = onLeft ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        for (k = Math.ceil(graphY(v, h) / sy); k * sy <= graphY(v, 0); k++) {
            p = plotY(v, k * sy);
            if (!k || p < 8 || p > h - 8) continue;
            text = gridLabel(k * sy, sy);
            ctx.strokeText(text, onLeft ? ax - 4 : ax + 4, p);
            ctx.fillText(text, onLeft ? ax - 4 : ax + 4, p);
        }
    }

    // An equation of x and y, drawn where its two sides are equal: their difference is found at
    // the corners of square cells 3 pixels wide, and each cell where it changes sign is crossed
    // by a line between the places on its edges where it is 0, as near as the corners tell.
    // Not where it only jumps from one sign to the other, as x y = 1 does across x = 0: there
    // the middle of the cell is farther from 0 than its corners. An inequality, y < x², is
    // shaded where it is true, a cell at a time, or the part of a cell on its side of the line;
    // its line is dashed where the line itself is not in it, for < and >. Of two, 1 < x < 3,
    // where both are, each line drawn where the other holds. The values are kept while the
    // view, the unit and the letters stay, as the pointer moving draws it again
    function drawRelation(ctx, v, w, h, rel, color) {
        var c = 3, nx = Math.ceil(w / c), ny = Math.ceil(h / c), parts = rel.parts || [rel], grids, i, j, run,
            key = [v.x, v.y, v.ux, v.uy, w, h, deg].concat(rel.letters.map(function (k) { return graphVars[k]; })).join();
        function corners(g, i, j) {
            return [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]];
        }
        function strict(part) {
            return part.op === '<' || part.op === '>';
        }
        function inside(part, k) {
            return k * (part.op === '<' || part.op === '≤' ? -1 : 1) > 0 || (k === 0 && !strict(part));
        }
        if (rel.kept && rel.kept.key === key) {
            grids = rel.kept.grids;
        } else {
            grids = parts.map(function (part) {
                var grid = [];
                for (j = 0; j <= ny; j++) {
                    grid.push([]);
                    for (i = 0; i <= nx; i++) grid[j].push(part.at(graphX(v, i * c), graphY(v, j * c), deg));
                }
                return grid;
            });
            rel.kept = { key: key, grids: grids };
        }
        if (rel.op !== '=') {
            ctx.beginPath();
            for (j = 0; j < ny; j++) {
                run = -1; // the first of the cells in a row wholly in it, drawn as one
                for (i = 0; i <= nx; i++) {
                    if (i < nx && parts.every(function (part, k) { return corners(grids[k], i, j).every(function (n) { return inside(part, n); }); })) {
                        if (run < 0) run = i;
                        continue;
                    }
                    if (run >= 0) ctx.rect(run * c, j * c, (i - run) * c, c);
                    run = -1;
                    if (i < nx) piece(i * c, j * c, i, j);
                }
            }
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = color;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        parts.forEach(function (part, k) {
            var lines = [];
            for (j = 0; j < ny; j++) {
                for (i = 0; i < nx; i++) cell(i * c, j * c, corners(grids[k], i, j), part, lines);
            }
            if (parts.length > 1) { // where the other holds
                lines = lines.filter(function (l) {
                    var x = graphX(v, (l[0][0] + l[1][0]) / 2), y = graphY(v, (l[0][1] + l[1][1]) / 2);
                    return parts.every(function (other, m) { return m === k || inside(other, other.at(x, y, deg)); });
                });
            }
            ctx.beginPath();
            (strict(part) ? chains(lines) : lines).forEach(function (line) {
                ctx.moveTo(line[0][0], line[0][1]);
                line.slice(1).forEach(function (p) { ctx.lineTo(p[0], p[1]); });
            });
            ctx.lineWidth = 2;
            ctx.lineCap = strict(part) ? 'butt' : 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = color;
            ctx.setLineDash(strict(part) ? [6, 4] : []);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineCap = 'butt';
        });

        // where edge e of a cell from px, py crosses 0, its corners k: found from its left or top
        // end, so the cell beside it finds the same place
        function edge(px, py, k, e) {
            var corner = [[0, 0], [c, 0], [c, c], [0, c]], p = corner[e], q = corner[(e + 1) % 4], a = k[e], b = k[(e + 1) % 4], t;
            if (e > 1) {
                p = q;
                q = corner[e];
                a = b;
                b = k[e];
            }
            t = isFinite(a) && isFinite(b) ? a / (a - b) : 0.5; // half way to where it has no value
            return [px + p[0] + (q[0] - p[0]) * t, py + p[1] + (q[1] - p[1]) * t];
        }

        // the part of cell i, j from px, py that is in it: the square cut by each line in turn, a
        // corner kept where it is in, and a place put where an edge crosses out, its values there
        // as they go along the edge
        function piece(px, py, i, j) {
            var corner = [[0, 0], [c, 0], [c, c], [0, c]], poly = corner.map(function (q, e) {
                return { x: px + q[0], y: py + q[1], v: parts.map(function (part, k) { return corners(grids[k], i, j)[e]; }) };
            });
            parts.forEach(function (part, k) {
                var out = [];
                poly.forEach(function (a, e) {
                    var b = poly[(e + 1) % poly.length], inA = inside(part, a.v[k]), t;
                    if (inA) out.push(a);
                    if (inA !== inside(part, b.v[k])) {
                        t = isFinite(a.v[k]) && isFinite(b.v[k]) ? a.v[k] / (a.v[k] - b.v[k]) : 0.5;
                        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, v: a.v.map(function (n, m) { return n + (b.v[m] - n) * t; }) });
                    }
                });
                poly = out;
            });
            if (poly.length < 3) return;
            ctx.moveTo(poly[0].x, poly[0].y);
            poly.slice(1).forEach(function (q) { ctx.lineTo(q.x, q.y); });
            ctx.closePath();
        }

        // the line of part across a cell from px, py: its corners top left, top right, bottom right and bottom left
        function cell(px, py, k, part, lines) {
            var at = [], e, mid;
            if (!k.every(isFinite)) return;
            for (e = 0; e < 4; e++) {
                if ((k[e] > 0) !== (k[(e + 1) % 4] > 0)) at.push(edge(px, py, k, e));
            }
            if (at.length < 2) return;
            mid = part.at(graphX(v, px + c / 2), graphY(v, py + c / 2), deg);
            if (!(Math.abs(mid) <= 2 * Math.max.apply(null, k.map(Math.abs)))) return; // a jump, not a 0
            lines.push([at[0], at[1]]);
            if (at.length === 4) lines.push([at[2], at[3]]);
        }
    }

    // the pieces of a line joined end to end where they meet, so its dashes run on along it
    function chains(pieces) {
        var ends = {}, used = [], out = [];
        function key(p) {
            return Math.round(p[0] * 64) + ',' + Math.round(p[1] * 64);
        }
        pieces.forEach(function (s, n) {
            s.forEach(function (p) { (ends[key(p)] = ends[key(p)] || []).push(n); });
        });
        pieces.forEach(function (s, n) {
            var line;
            if (used[n]) return;
            used[n] = true;
            line = [s[0], s[1]];
            [true, false].forEach(function (last) { // on from its end, then back from its start
                var end, next, far;
                for (;;) {
                    end = last ? line[line.length - 1] : line[0];
                    next = (ends[key(end)] || []).filter(function (m) { return !used[m]; })[0];
                    if (next === undefined) break;
                    used[next] = true;
                    far = key(pieces[next][0]) === key(end) ? pieces[next][1] : pieces[next][0];
                    if (last) line.push(far); else line.unshift(far);
                }
            });
            out.push(line);
        });
        return out;
    }

    // the slope of a curve as a curve of its own, dy/dx at each x: none where it has none,
    // at a corner or a break
    function slopeCurve(fn) {
        return { at: function (x, deg) { return CalcEngine.slope(fn, x, deg); } };
    }

    // A curve, from two values of each pixel across, dashed for the slope of one. It breaks
    // where there is no value, and where it leaves by one edge and comes back by the other,
    // as tan x does at 90°, unless the value between the two is between them too: a steep line
    function drawCurve(ctx, v, w, h, fn, color, dashed) {
        var n = Math.ceil(w * 2), i, x, y, py, last = null, mid, k;
        ctx.beginPath();
        for (i = 0; i <= n; i++) {
            x = graphX(v, i / 2);
            y = fn.at(x, deg);
            if (!isFinite(y)) {
                last = null;
                continue;
            }
            py = plotY(v, y);
            if (last && ((last.py < 0 && py > h) || (last.py > h && py < 0))) {
                mid = fn.at((last.x + x) / 2, deg);
                if (!(mid >= Math.min(last.y, y) && mid <= Math.max(last.y, y))) last = null;
            }
            k = fn.piece ? fn.piece(x, deg) : 0;
            if (last && k !== last.k) last = null; // a function in pieces is not joined where they meet
            if (last) ctx.lineTo(i / 2, Math.max(-h, Math.min(2 * h, py)));
            else ctx.moveTo(i / 2, Math.max(-h, Math.min(2 * h, py)));
            last = { x: x, y: y, py: py, k: k };
        }
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.setLineDash(dashed ? [7, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // The point at a place of the plot: a mark within reach of it, the nearest; else the
    // curve within reach above or below it, the nearest, at its x; else the place itself,
    // its x and y rounded to what a pixel tells apart (spot)
    function graphPoint(at, reach) {
        var v = viewNow(), x = graphNice(graphX(v, at.x), v.ux), best = null;
        graphMarks.forEach(function (p) {
            var d = Math.hypot(plotX(v, p.x) - at.x, plotY(v, p.y) - at.y);
            if (d <= reach && (!best || d < best.d)) best = { d: d, p: p };
        });
        if (best) return best.p;
        graphFns.forEach(function (fn, i) {
            var y = fn ? fn.at(x, deg, true) : NaN, d = Math.abs(plotY(v, y) - at.y);
            if (isFinite(y) && d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, x: x, y: y } };
        });
        graphRels.forEach(function (rel, i) { // an equation: the place on it nearest; of an inequality of two, on either line where the other holds
            (rel ? rel.parts || [rel] : []).forEach(function (part, k) {
                var q = CalcEngine.onRelation(part, graphX(v, at.x), graphY(v, at.y), v.ux, v.uy, deg, graphNice),
                    d = q && (!rel.parts || CalcEngine.holds(rel, q.x, q.y, deg)) ? Math.hypot(plotX(v, q.x) - at.x, plotY(v, q.y) - at.y) : Infinity;
                if (d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, x: q.x, y: q.y } };
                if (best && best.d === d && k) best.p.k = k;
            });
        });
        graphPlanes.forEach(function (c, i) { // a curve of a parameter: the nearest of its places drawn, then nearer between them
            var pts = c && c.kept && c.kept.pts, near = null, lo, hi, k, m1, m2, q, d, r;
            function off(u) {
                var q = c.at(u, deg);
                return Math.hypot(plotX(v, q[0]) - at.x, plotY(v, q[1]) - at.y);
            }
            if (c && c.kind === 'field') { // a slope field: its solution within reach above or below, at its x
                (c.kept ? c.kept.sols : []).forEach(function (s, k) {
                    var y = solutionY(c, k, x), d = Math.abs(plotY(v, y) - at.y);
                    if (isFinite(y) && d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, sol: k, x: x, y: y, near: true } };
                });
                if (best && best.p.near) { // the one found, to all its digits
                    delete best.p.near;
                    best.p.y = solutionAt(c, best.p.sol, x);
                }
                return;
            }
            if (c && c.kind === 'seq') { // a sequence: the nearest of its terms by the pointer
                r = c.terms(deg);
                hi = Math.min(r.from + r.list.length - 1, graphX(v, at.x + reach * 1.2));
                for (k = Math.max(r.from, Math.ceil(graphX(v, at.x - reach * 1.2))); k <= hi; k++) {
                    d = Math.hypot(plotX(v, k) - at.x, plotY(v, r.list[k - r.from]) - at.y);
                    if (d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, u: k, x: k, y: r.list[k - r.from] } };
                }
                return;
            }
            if (!pts) return;
            pts.forEach(function (q, k) {
                var d = Math.hypot(q.px - at.x, q.py - at.y);
                if (d < (near ? near.d : Infinity)) near = { d: d, k: k };
            });
            if (!near || near.d > reach * 2) return;
            lo = pts[Math.max(0, near.k - 1)].u;
            hi = pts[Math.min(pts.length - 1, near.k + 1)].u;
            for (k = 0; k < 50; k++) {
                m1 = lo + (hi - lo) / 3;
                m2 = hi - (hi - lo) / 3;
                if (off(m1) <= off(m2)) hi = m2; else lo = m1;
            }
            q = c.at((lo + hi) / 2, deg);
            d = off((lo + hi) / 2);
            if (d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, u: (lo + hi) / 2, x: q[0], y: q[1] } };
        });
        return best ? best.p : { x: x, y: graphNice(graphY(v, at.y), v.uy), spot: true };
    }

    // the sequence a point is a term of, or null
    function seqOf(p) {
        var c = p && !p.spot && !p.area && p.u !== undefined && graphPlanes[p.i];
        return c && c.kind === 'seq' ? c : null;
    }

    // what a point is, and its x and y, as the line above the plot and the popup show them
    function graphName(p) {
        var fit = !p.spot && !p.area && !p.t && graphData[p.i] && graphFns[p.i] && graphFns[p.i].fit;
        if (fit) return 'Best fit, r² = ' + local(String(+fit.r2.toPrecision(4)));
        if (seqOf(p)) return 'Term';
        if (!p.spot && !p.area && p.sol !== undefined && graphPlanes[p.i]) {
            return graphPlanes[p.i].kept && graphPlanes[p.i].kept.sols[p.sol] ? 'Solution through ' + startText(graphPlanes[p.i].kept.sols[p.sol]) : 'Solution';
        }
        return p.spot ? 'Point' : p.area ? (p.rel ? 'Area of the region' : p.j === undefined ? 'Area under the curve' : 'Area between the curves') :
            p.t ? p.t.map(function (t) { return GRAPH_NAMES[t]; }).join(', ') : 'On the curve';
    }

    // to 13 digits, as the display shows a result: 1.732050807569. What is inserted is the whole number
    function graphValue(p, k) {
        var n = String(+p[k].toPrecision(13));
        return p.spot || k === 'x' || k === 'a' || k === 'b' ? shownResult({ value: n }, n).html : statsValue(p[k]).html;
    }

    // an end of an area as its box shows it, to 13 digits, which can be typed over
    function endValue(p, k) {
        return local(String(+p[k].toPrecision(13)));
    }

    // a dot of the curve's color, or of both curves that cross
    function graphSwatch(i) {
        return '<b class="calc-graph-swatch" style="background:' + curveColor(i) + '"></b>';
    }

    // the colors of a point's curves: one, two where they cross, none for a place off them
    function graphSwatches(p) {
        return p.spot ? '' : graphSwatch(p.i) + (p.j !== undefined ? graphSwatch(p.j) : '');
    }

    // the line above the plot: the point under the pointer, what it is and its x and y; else what to do
    function graphShown() {
        var unit = graphAngles() ? UNITS[deg] : '', p = graphAt, kind, seq = seqOf(p);
        if (graphTwice) {
            graphNote.textContent = graphTwice + '(x) is named twice: give each function its own letter.';
        } else if (graphRows.some(function (row) { return row.classList.contains('calc-bad'); })) {
            graphNote.textContent = 'Not a function of x yet: write x^2 for x², 2x for 2 × x.';
        } else if (sequenceNote(true)) {
            graphNote.textContent = sequenceNote(true);
        } else if (graphRows.some(function (row, i) { return graphData[i] && graphDiff[i] && !graphFns[i]; })) {
            kind = fitKind(graphRows.findIndex(function (row, i) { return graphData[i] && graphDiff[i] && !graphFns[i]; }));
            graphNote.textContent = 'No ' + GRAPH_FIT_NAMES[kind] + ' fit: it needs ' + GRAPH_FIT_NEEDS[kind] + '.';
        } else if (!graphFns.concat(graphRels, graphPlanes, graphData).some(Boolean) && graphOff.some(Boolean)) {
            graphNote.textContent = 'Every curve is hidden: click its dot to show it.';
        } else if (graphTab === 'table') {
            graphNote.textContent = !tableCurves().length ? 'Type a function of x for its values.' :
                graphTable.querySelector('.calc-bad') ? 'Start and step are numbers, the step above 0.' :
                    'Click a value to put it in the equation.' + (unit ? ' · ' + unit : '');
        } else if (graphShading && graphFns.concat(graphRels).some(Boolean) && graphStart && graphPinned && graphPinned.area) {
            graphNote.innerHTML = graphSwatches(graphPinned) + '<span>From <i>x</i> = ' + graphValue(graphPinned, 'a') + '</span>' +
                '<span>to <i>x</i> = ' + graphValue(graphPinned, 'b') + '</span>';
        } else if (graphShading && graphEdge) {
            graphNote.innerHTML = graphSwatches(graphEdge) + '<span>From <i>x</i> = ' + graphValue(graphEdge, 'x') + '</span>' +
                '<span>Drag to where it ends</span>';
        } else if (graphShading && graphFns.concat(graphRels).some(Boolean)) {
            graphNote.textContent = 'Drag along a curve for the area under it, between two for the area between, in a region for its area.';
        } else if (p) { // of a term of a sequence, its n and a(n)
            graphNote.innerHTML = graphSwatches(p) + '<em>' + graphName(p) + '</em>' +
                '<span>' + (seq ? '<i>n</i>' : '<i>x</i>') + ' = ' + graphValue(p, 'x') + '</span>' +
                '<span>' + (seq ? '<i>' + seq.name + '</i>(<i>n</i>)' : '<i>y</i>') + ' = ' + (isFinite(p.y) ? graphValue(p, 'y') : 'none') + '</span>';
        } else if (!graphInputs.some(function (box) { return box.value.trim(); })) {
            graphNote.textContent = 'Type a function of x. Drag to move, scroll or pinch to zoom.';
        } else if (sequenceNote(false)) {
            graphNote.textContent = sequenceNote(false);
        } else if (fieldNote()) {
            graphNote.textContent = fieldNote();
        } else {
            graphNote.textContent = 'Point at the graph for values; click to insert.' + (unit ? ' · ' + unit : '');
        }
    }

    // The popup of the point clicked, over it, or under it where there is no room above;
    // its x and y, and the slope of its curve there, each go into the calculation with a
    // click. It goes with the point as the view moves, and hides while the point is out of the view,
    // unless an end of its area is being typed: then it stays at the edge, and that box is kept
    function placePop(v) {
        var p = graphPinned, w = graphPlot.clientWidth, h = graphPlot.clientHeight, typing = graphPop.contains(document.activeElement),
            px, py, html, left, top, below, rows, seq;
        px = p && plotX(v, p.x);
        py = p && plotY(v, p.y);
        if (p && p.area && typing) {
            px = Math.max(0, Math.min(w, px));
            py = isFinite(py) ? Math.max(0, Math.min(h, py)) : h / 2;
        }
        if (!p || graphPopShut || !isFinite(py) || px < 0 || px > w || py < 0 || py > h) {
            graphPop.hidden = true;
            return;
        }
        seq = seqOf(p);
        html = '<div class="calc-graph-pop-head">' + graphSwatches(p) + '<b>' + graphName(p) + '</b></div>' +
            (p.area ? ['a', 'b', 's'] : seq ? ['u', 'y'] : p.u !== undefined ? ['u', 'x', 'y', 'm'] : ['x', 'y', 'm']).map(function (k) {
                if (k === 'm' && !isFinite(p.m)) return '';
                if (k === 's' && !isFinite(p.s)) return '<div class="calc-graph-pop-none">Area = none</div>';
                return '<div class="calc-graph-pop-row" data-put="' + k + '"><span>' + (seq ? (k === 'u' ? '<i>n</i>' : '<i>' + seq.name + '</i>(<i>n</i>)') :
                    k === 'u' && graphPlanes[p.i] && graphPlanes[p.i].kind === 'polar' ? 'θ' : GRAPH_ROWS[k]) + ' = ' +
                    (k === 'a' || k === 'b' ? '<input class="calc-graph-pop-end" data-end="' + k + '" value="' + endValue(p, k) +
                        '" aria-label="' + (k === 'a' ? 'From x' : 'To x') + '">' : graphValue(p, k)) + '</span>' + insertIcon() + '</div>';
            }).join('');
        if (p.area && typing) { // all but the row of the box typed in
            rows = document.createElement('div');
            rows.innerHTML = html;
            [].slice.call(rows.children).forEach(function (row, n) {
                var now = graphPop.children[n];
                if (!now.contains(document.activeElement) && now.outerHTML !== row.outerHTML) graphPop.replaceChild(row.cloneNode(true), now);
            });
        } else if (graphPop.innerHTML !== html) {
            graphPop.innerHTML = html;
        }
        graphPop.hidden = false;
        left = Math.max(4, Math.min(w - graphPop.offsetWidth - 4, px - graphPop.offsetWidth / 2));
        top = py - graphPop.offsetHeight - 10;
        below = top < 4;
        if (below) top = py + 10;
        graphPop.style.left = left + 'px';
        graphPop.style.top = top + 'px';
        graphPop.style.setProperty('--arrow', px - left - graphPop.clientLeft + 'px');
        graphPop.classList.toggle('calc-graph-pop-below', below);
    }

    // What Esc does on the graph before it closes: the view's boxes close, the area button is
    // let go, else the point clicked goes, and its popup; false if there was none of them
    function graphUnpin() {
        popLater(false);
        if (!graph.classList.contains('calc-open') || !graphPlot.offsetWidth) return false;
        if (!graphWindow.hidden) {
            showWindow(false);
            return true;
        }
        if (graphShading) {
            areaOn(false);
            return true;
        }
        if (!graphPinned) return false;
        graphPinned = null;
        drawGraph();
        return true;
    }

    // A popup opened with the mouse goes a while after the mouse is off it, so the graph can be
    // seen again; back on it in time, it stays. Not while the menu of a right click on it is open.
    // One opened by a touch stays, as no pointer rests on it
    function popLater(on) {
        if (on) graphPopFrom = null;
        clearTimeout(graphHiding);
        if (!on) return;
        graphHiding = setTimeout(function () {
            if (!menu.hidden || graphPop.contains(document.activeElement)) popLater(true); else popShut();
        }, GRAPH_POP_WAIT);
    }

    // The popup goes, after that wait or at once on a zoom, by the wheel, a pinch or the buttons;
    // the point and its tangent stay, and a click on the point brings the popup back
    function popShut() {
        popLater(false);
        graphPopShut = true;
        graphPop.hidden = true;
    }

    // A click, or the drag of an area, opens the popup with the mouse at at: it stays while the
    // mouse stays there, and its wait starts once the mouse is moved off, or off the plot
    function popWhenMoved(at) {
        popLater(false);
        graphPopFrom = at || null;
    }

    graphPop.addEventListener('pointerenter', function () {
        popLater(false);
        graphPopFrom = null;
    }, false);

    graphPop.addEventListener('pointerleave', function (e) {
        popLater(e.pointerType === 'mouse' && !!graphPinned);
    }, false);

    // An end of an area typed, as its x is hard to drag to: the area from there, as it is typed,
    // where the other end is past it. One that is not is marked; Enter or Esc goes back to the
    // plot, and the box shows the end as it is again
    graphPop.addEventListener('input', function (e) {
        var box = e.target, p = graphPinned, n, a, b;
        if (!box.classList.contains('calc-graph-pop-end') || !p || !p.area) return;
        onlyNumber(box);
        n = boxNumber(box);
        a = box.dataset.end === 'a' ? n : p.a;
        b = box.dataset.end === 'b' ? n : p.b;
        box.classList.toggle('calc-bad', !(isFinite(n) && a < b));
        if (!(isFinite(n) && a < b)) return;
        p.a = a;
        p.b = b;
        drawGraph();
    }, false);

    graphPop.addEventListener('keydown', function (e) {
        if (e.which !== 13 || !e.target.classList.contains('calc-graph-pop-end')) return;
        e.preventDefault();
        e.target.blur();
    }, false);

    graphPop.addEventListener('focusout', function () {
        setTimeout(drawGraph, 0);
    }, false);

    // x or y of the point clicked goes into the calculation, as a result of the statistics does
    graphPop.addEventListener('click', function (e) {
        var row = e.target.closest('.calc-graph-pop-row'), n = row && graphPinned && graphPinned[row.dataset.put];
        if (e.target.classList.contains('calc-graph-pop-end')) return; // typed in, not put in
        if (!row || !isFinite(n) || !engine.put(n)) return;
        keyBoard['AC'].children[0].firstChild.data = 'C';
        showGraph(false);
        refresh();
        saveState();
        if (graphAlone) ask('graph-put'); // the calculator comes up with it
    }, false);

    // where a pointer is on the plot, in its pixels
    function onPlot(e) {
        var box = graphPlot.getBoundingClientRect(), k = scale();
        return { x: (e.clientX - box.left) / k - graphPlot.clientLeft, y: (e.clientY - box.top) / k - graphPlot.clientTop };
    }

    // the view with the point at p0 of the plot moved to p1, and the scale times k
    function graphMove(start, p0, p1, k) {
        var x = graphX(start, p0.x), y = graphY(start, p0.y), ux = start.ux * k, uy = start.uy * k;
        if (!(ux > 1e-12 && uy > 1e-12 && ux < 1e12 && uy < 1e12)) return; // no closer or farther than numbers stay sharp
        graphView = {
            x: x - (p1.x - graphPlot.clientWidth / 2) * ux,
            y: y + (p1.y - graphPlot.clientHeight / 2) * uy,
            ux: ux,
            uy: uy
        };
        drawGraph();
    }

    // An area dragged near the left or right of the plot, or past it, slides the view that way
    // for as long as it is held there, faster nearer the side, and the area grows with it: its
    // start stays at its x, its end at the side. It stops as the pointer comes away or lets go
    function areaSlide() {
        var last = 0;
        function step(t) {
            var s = graphStart, p = graphPointers(), w = graphPlot.clientWidth, v, d;
            graphSliding = 0;
            if (!graphShading || !graphMoved || !s || !(s.i >= 0) || p.length !== 1) return;
            d = p[0].x < GRAPH_SLIDE_EDGE ? p[0].x - GRAPH_SLIDE_EDGE : p[0].x > w - GRAPH_SLIDE_EDGE ? p[0].x - w + GRAPH_SLIDE_EDGE : 0;
            if (!d) return;
            if (last) {
                v = viewNow();
                d = Math.max(-1, Math.min(1, d / GRAPH_SLIDE_EDGE)) * GRAPH_SLIDE_SPEED * Math.min(t - last, 50) / 1000; // after a slow frame, no leap
                graphView = { x: v.x + d * v.ux, y: v.y, ux: v.ux, uy: v.uy };
                graphAreaTo(s, p[0]);
            }
            last = t;
            graphSliding = requestAnimationFrame(step);
        }
        if (!graphSliding) graphSliding = requestAnimationFrame(step);
    }

    // the pointers down now: one moves the view, two pinch it
    function graphPointers() {
        return Object.keys(graphTouch).map(function (id) { return graphTouch[id]; });
    }

    // a pointer went down or up: what follows moves from here
    function graphBegin() {
        var p = graphPointers();
        graphStart = p.length ? { view: viewNow(), p: p.map(function (q) { return { x: q.x, y: q.y }; }) } : null;
    }

    graphCanvas.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        graphCanvas.setPointerCapture(e.pointerId);
        if (!graphPointers().length) graphMoved = false;
        graphTouch[e.pointerId] = onPlot(e);
        graphBegin();
    }, false);

    graphCanvas.addEventListener('pointermove', function (e) {
        var at = onPlot(e), s = graphStart, p, d0, d1;
        if (!graphTouch[e.pointerId]) { // the mouse over the plot: the point under it
            if (graphPopFrom && Math.hypot(at.x - graphPopFrom.x, at.y - graphPopFrom.y) > GRAPH_POP_STILL) popLater(!graphPop.hidden);
            if (e.pointerType === 'mouse' && graphShading) { // where an area would start, as a drag from here takes it
                p = areaRegion(at);
                graphAt = null;
                graphEdge = p && { x: areaEnd(viewNow(), p, at.x), i: p.i, j: p.j };
                drawGraph();
            } else if (e.pointerType === 'mouse') {
                graphAt = graphPoint(at, 10);
                drawGraph();
            }
            return;
        }
        graphTouch[e.pointerId] = at;
        p = graphPointers();
        if (!s) return;
        if (p.length === 1) {
            if (!graphMoved && Math.abs(at.x - s.p[0].x) + Math.abs(at.y - s.p[0].y) < 4) return; // a click shakes a little
            graphMoved = true;
            if (graphShading && s.p.length === 1) { // with ∫ pressed, the view only as the area reaches a side
                graphAreaTo(s, at);
                areaSlide();
            } else {
                graphMove(s.view, s.p[0], at, 1);
            }
        } else if (p.length === 2 && s.p.length === 2) {
            graphMoved = true;
            popShut();
            d0 = Math.hypot(s.p[0].x - s.p[1].x, s.p[0].y - s.p[1].y);
            d1 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
            if (d0 > 10 && d1 > 10) {
                graphMove(s.view, { x: (s.p[0].x + s.p[1].x) / 2, y: (s.p[0].y + s.p[1].y) / 2 },
                    { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }, d0 / d1);
            }
        }
    }, false);

    // A click opens the popup of the point there; a finger reaches a dot or a curve from
    // farther. A click on the point that has it open takes the point away; one on the point
    // whose popup went brings it back; an area shaded is the same. The drag that shades an
    // area opens its popup as it ends; the ∫ button stays pressed, for another, until it is
    // pressed again or Esc lets it go
    function graphUp(e) {
        var at = graphTouch[e.pointerId], v = viewNow(), p = graphPinned, mouse = e.pointerType === 'mouse', s = graphStart;
        if (!at) return;
        delete graphTouch[e.pointerId];
        if (graphMoved && graphShading && s && s.i >= 0 && !graphPointers().length) {
            graphEdge = null;
            graphPopShut = false;
            popWhenMoved(mouse && at);
            drawGraph();
        } else if (e.type === 'pointerup' && !graphMoved && !graphPointers().length) {
            // a double click puts back what was before its first click, however long the system lets it take
            graphClickWas = graphClickLast;
            graphClickLast = { pinned: p, shut: graphPopShut };
            if (p && (p.area ? onArea(v, p, at) : Math.hypot(plotX(v, p.x) - at.x, plotY(v, p.y) - at.y) <= (mouse ? 8 : 16))) {
                if (graphPopShut) graphPopShut = false; else graphPinned = null;
            } else {
                graphPinned = graphPoint(at, mouse ? 10 : 18);
                if (graphPinned.spot && !graphShading) graphPinned = addStart(graphPinned) || graphPinned; // off the curves, with a slope field: its solution through there
                graphPopShut = false;
                if (mouse) graphAt = graphPinned;
            }
            popWhenMoved(mouse && !!graphPinned && at); // the mouse is on the point, off the popup
            drawGraph();
        }
        graphBegin();
        if (graphMoved && !graphPointers().length) saveState();
    }

    graphCanvas.addEventListener('pointerup', graphUp, false);
    graphCanvas.addEventListener('pointercancel', graphUp, false);

    // a double click lets ∫ go, the area or point as it was before its first click
    graphCanvas.addEventListener('dblclick', function () {
        if (!graphShading) return;
        areaOn(false);
        if (graphClickWas) {
            graphPinned = graphClickWas.pinned;
            graphPopShut = graphClickWas.shut;
        }
        drawGraph();
        saveState();
    }, false);

    // the pointer leaves: the line above says what to do again; the popup stays
    graphCanvas.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse' || graphTouch[e.pointerId]) return;
        if (graphPopFrom) popLater(!graphPop.hidden);
        graphAt = graphEdge = null;
        drawGraph();
    }, false);

    // the wheel zooms about the pointer, and what is there drifts toward the middle as it
    // does, so what is around it comes into view: a little each turn, and the same however
    // the turns are cut up, as each leaves k^-0.5 of its way there to go, k^0.5 zooming out
    graphCanvas.addEventListener('wheel', function (e) {
        var at = onPlot(e), dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1),
            k = Math.pow(1.002, Math.max(-300, Math.min(300, dy))), f = Math.pow(k, k > 1 ? -0.5 : 0.5),
            w = graphPlot.clientWidth / 2, h = graphPlot.clientHeight / 2;
        e.preventDefault();
        popShut();
        graphMove(viewNow(), at, { x: w + (at.x - w) * f, y: h + (at.y - h) * f }, k);
        if (graphStart && !graphShading) graphBegin(); // a drag goes on from the view zoomed, not back to the one it began with
        clearTimeout(graphSaving);
        graphSaving = setTimeout(saveState, 300);
    }, { passive: false });

    // the buttons: twice as close, twice as far, about the middle; the start again; the view
    // typed; ∫ for an area; and the picture, in the corner below. A button of the view lets ∫ go
    graphPlot.addEventListener('click', function (e) {
        var b = e.target.closest('[data-zoom]'), mid = { x: graphPlot.clientWidth / 2, y: graphPlot.clientHeight / 2 };
        if (!b) return;
        if (b.dataset.zoom === 'save') {
            saveGraph();
            return;
        }
        if (b.dataset.zoom === 'area') {
            areaOn(!graphShading);
            return;
        }
        if (graphShading) areaOn(false);
        if (b.dataset.zoom === 'window') {
            showWindow(graphWindow.hidden);
            return;
        }
        popShut();
        if (b.dataset.zoom === 'home') {
            graphView = null;
            drawGraph();
        } else {
            graphMove(viewNow(), mid, mid, b.dataset.zoom === 'in' ? 0.5 : 2);
        }
        saveState();
    }, false);

    // The view typed: where x goes from and to across the plot, and y up it. Its boxes show the
    // view as it is, each to what a pixel tells apart, and set it as they are typed in, once
    // both ends of x or y are numbers, the first below the second; a pair that is not is
    // marked. Enter or Esc goes back to the plot
    function showWindow(open) {
        graphWindow.hidden = !open;
        graphWindowButton.classList.toggle('calc-on', open);
        if (!open) {
            if (graphWindow.contains(document.activeElement)) document.activeElement.blur();
            return;
        }
        graphEnds.forEach(function (box) { box.parentNode.classList.remove('calc-bad'); });
        drawGraph();
        if (focusBox(graphEnds[0])) graphEnds[0].select();
    }

    // the boxes as the view is, unless one is being typed in
    function fillWindow(v, w, h) {
        if (graphWindow.hidden || graphWindow.contains(document.activeElement)) return;
        [graphX(v, 0), graphX(v, w), graphY(v, h), graphY(v, 0)].forEach(function (n, k) {
            graphEnds[k].value = local(String(graphRound(n, k < 2 ? v.ux : v.uy)));
        });
        graphEnds.forEach(function (box) { box.parentNode.classList.remove('calc-bad'); });
    }

    graphEnds.forEach(function (box) {
        box.addEventListener('input', function () {
            var w = graphPlot.clientWidth, h = graphPlot.clientHeight, v = viewNow(), n, x, y;
            onlyNumber(box);
            n = graphEnds.map(boxNumber);
            x = n[0] < n[1] && (n[1] - n[0]) / w > 1e-12 && (n[1] - n[0]) / w < 1e12;
            y = n[2] < n[3] && (n[3] - n[2]) / h > 1e-12 && (n[3] - n[2]) / h < 1e12;
            graphEnds[0].parentNode.classList.toggle('calc-bad', !x);
            graphEnds[2].parentNode.classList.toggle('calc-bad', !y);
            if (!x && !y) return;
            graphView = {
                x: x ? (n[0] + n[1]) / 2 : v.x,
                y: y ? (n[2] + n[3]) / 2 : v.y,
                ux: x ? (n[1] - n[0]) / w : v.ux,
                uy: y ? (n[3] - n[2]) / h : v.uy
            };
            drawGraph();
            clearTimeout(graphSaving);
            graphSaving = setTimeout(saveState, 300);
        }, false);
        box.addEventListener('keydown', function (e) {
            if (e.which !== 13) return;
            e.preventDefault();
            showWindow(false);
        }, false);
    });

    // the boxes left: as the view is again, a pair that was not one too
    graphWindow.addEventListener('focusout', function (e) {
        if (!graphWindow.contains(e.relatedTarget)) setTimeout(drawGraph, 0);
    }, false);

    // a window that changes its size can draw the calculator at another scale
    window.addEventListener('resize', drawGraph, false);

    // The graph as a picture, for notes or homework: the plot on its paper, twice as sharp at
    // least, without the point pointed at, and in its top left the function of each curve shown,
    // and an area shaded, from where to where and how much
    function graphPicture() {
        var at = graphAt, pinned = graphPinned, pic = document.createElement('canvas'), ctx = pic.getContext('2d'), r, lines, wide;
        graphAt = null;
        graphPinned = pinned && pinned.area ? pinned : null;
        graphSharp = 2;
        drawGraph();
        r = graphCanvas.width / graphPlot.clientWidth;
        pic.width = graphCanvas.width;
        pic.height = graphCanvas.height;
        ctx.fillStyle = GRAPH_INK.paper;
        ctx.fillRect(0, 0, pic.width, pic.height);
        ctx.drawImage(graphCanvas, 0, 0);
        graphAt = at;
        graphPinned = pinned;
        graphSharp = 0;
        drawGraph();

        lines = [];
        graphFns.forEach(function (fn, i) {
            if (graphData[i] && !graphOff[i]) {
                lines.push({ i: i, text: graphData[i].length === 1 ? '1 point' : graphData[i].length + ' points' });
                if (fn) lines.push({ i: i, text: 'Best fit ' + fitText(fn.fit) });
                return;
            }
            if (fn) lines.push({ i: i, text: CalcEngine.named(graphInputs[i].value) ? graphInputs[i].value.trim() :
                'y = ' + graphInputs[i].value.trim().replace(/^y\s*=\s*/i, '') });
            if (graphRels[i] || graphPlanes[i]) lines.push({ i: i, text: graphInputs[i].value.trim() });
            if (fn && graphDiff[i]) lines.push({ i: i, text: 'y′ of ' + graphInputs[i].value.trim(), dashed: true });
        });
        if (!lines.length) return pic;
        if (pinned && pinned.area) {
            lines.push({
                i: pinned.i,
                text: 'Area from ' + local(String(pinned.a)) + ' to ' + local(String(pinned.b)) + ' = ' +
                    (isFinite(pinned.s) ? statsValue(pinned.s).text : 'none')
            });
        }
        if (graphLetters.length) { // and the values of its letters, without a color
            lines.push({
                text: graphLetters.map(function (k) { return k + ' = ' + sliderText(graphVars[k], sliderStep(graphRange[k])); }).join(',  ')
            });
        }
        // a light box over the plot, lifted off it a little, so it reads apart from the curves
        ctx.setTransform(r, 0, 0, r, 0, 0);
        ctx.font = '13px Play, sans-serif';
        wide = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l.text).width + (l.i === undefined ? 17 : 42); }));
        ctx.beginPath();
        ctx.roundRect(8, 8, wide + 2, lines.length * 20 + 12, 6);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = 6 * r;
        ctx.shadowOffsetY = r;
        ctx.fillStyle = 'rgba(236, 244, 239, 0.95)';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(51, 68, 59, 0.3)';
        ctx.stroke();
        ctx.textBaseline = 'middle';
        lines.forEach(function (l, k) {
            var y = 8 + 6 + 10 + k * 20;
            ctx.fillStyle = GRAPH_INK.text;
            if (l.i === undefined) {
                ctx.fillText(l.text, 17, y);
                return;
            }
            ctx.beginPath();
            ctx.moveTo(17, y);
            ctx.lineTo(35, y);
            ctx.lineWidth = 3;
            ctx.lineCap = l.dashed ? 'butt' : 'round';
            ctx.strokeStyle = curveColor(l.i);
            ctx.setLineDash(l.dashed ? [5, 3] : []);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillText(l.text, 42, y);
        });
        return pic;
    }

    // saved as a file, graph.png
    function saveGraph() {
        graphPicture().toBlob(function (blob) { saveBlob(blob, 'graph.png'); }, 'image/png');
    }

    // A file saved, as the browser saves what a link to it downloads, with no permission of its
    // own: the picture of the graph, the history
    function saveBlob(blob, name) {
        var a = document.createElement('a'), url = URL.createObjectURL(blob);
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    }

    // copied, to paste into a document or a message
    function copyGraph() {
        var png = new Promise(function (done) { graphPicture().toBlob(done, 'image/png'); });
        try {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).catch(saveGraph);
        } catch (e) {
            saveGraph(); // no copying of pictures here: the file
        }
    }

    // ---------- the table of the graph ---------- //

    // The values of the curves in rows: x from a start, by a step, and y of each curve, in
    // its color. An empty box goes by the view of the graph: from its left edge, by a step
    // that gives some 20 rows across it, 15, 30 or 45 in degrees. A click on a value puts
    // it into the calculation; scrolled to its end, the table goes on
    graph.querySelector('.calc-graph-tabs').addEventListener('click', function (e) {
        var tab = e.target.closest('.calc-graph-tab');
        if (!tab) return;
        showGraphTab(tab.dataset.tab);
        if (graphTab === 'examples' && focusBox(graphSearch)) graphSearch.select(); // typing replaces the last search
        saveState();
    }, false);

    // the plot, the table, or the examples in place of the boxes, the sliders and the plot;
    // big on a wide page, the plot stays beside the examples (style.css)
    function showGraphTab(tab) {
        graphTab = tab === 'table' || tab === 'examples' ? tab : 'graph';
        [].forEach.call(graph.querySelectorAll('.calc-graph-tab'), function (t) {
            t.classList.toggle('calc-on', t.dataset.tab === graphTab);
        });
        graph.classList.toggle('calc-graph-browse', graphTab === 'examples');
        graphExamples.hidden = graphTab !== 'examples';
        if (graphTab === 'examples') renderExamples();
        graphPlot.hidden = graphTab === 'table';
        graphTable.hidden = graphTab !== 'table';
        graphAt = null;
        graphLines = 0; // the table from its start again
        graphList.scrollTop = 0;
        graphRender();
    }

    [graphFrom, graphBy].forEach(function (box) {
        box.addEventListener('input', function () {
            onlyNumber(box);
            graphLines = 0;
            graphList.scrollTop = 0;
            renderTable();
            saveState();
        }, false);
    });

    // the first x and the step: as the boxes hold them, else from the view. A box that
    // holds no number, or a step that is not above 0, is marked, and goes by the view. Of
    // sequences alone, n from the first of them, by 1
    function tableSteps() {
        var v = viewNow(), w = plotWidth(), want = w * v.ux / 20, p = Math.pow(10, Math.floor(Math.log10(want))), m = want / p,
            by = graphAngles() && deg === 1 && want > 3 && want <= 180 ?
                [5, 10, 15, 30, 45, 90, 180].filter(function (d) { return d >= want; })[0] :
                p * (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10),
            seqs = tableSeqs(), from, typed;
        by = seqs ? 1 : +by.toPrecision(12);
        graphBy.placeholder = local(String(by));
        typed = boxNumber(graphBy);
        graphBy.parentNode.classList.toggle('calc-bad', !!graphBy.value && !(typed > 0 && isFinite(typed)));
        if (graphBy.value && typed > 0 && isFinite(typed)) by = typed;
        from = seqs ? Math.min.apply(null, seqs.map(function (i) { return graphPlanes[i].range(deg)[0]; })) :
            +(Math.ceil((v.x - w / 2 * v.ux) / by) * by).toPrecision(12);
        graphFrom.placeholder = local(String(from));
        typed = boxNumber(graphFrom);
        graphFrom.parentNode.classList.toggle('calc-bad', !!graphFrom.value && !isFinite(typed));
        if (graphFrom.value && isFinite(typed)) from = typed;
        return { from: from, by: by };
    }

    // A value of the table, rounded to as many digits as its column has room for, up to 13:
    // -0.7071068, not -0.70710678… cut off. A fraction, or degrees, minutes and seconds, in
    // those modes. What is put in or copied is the whole number
    function tableValue(n, room) {
        var d = 13, r;
        do {
            r = String(+n.toPrecision(d));
        } while (r.length > room && --d > 2);
        return (fracMode && CalcEngine.fraction(n)) || (dmsMode && CalcEngine.dms(n)) ? statsValue(n).html : shownResult({ value: r }, r).html;
    }

    // how many characters a column of values has room for, measured in the font of the table
    function tableRoom() {
        var cell = graphList.querySelector('.calc-graph-names > span:nth-child(2)'), ctx = graphCanvas.getContext('2d'), wide;
        if (!cell) return 13;
        ctx.font = '13px Play, sans-serif';
        wide = ctx.measureText('-0.123456789').width / 12;
        return Math.max(4, Math.floor((cell.clientWidth - 16) / wide)); // its padding, and 2px to spare
    }

    // the rows from..to of the table, as HTML; their values go into graphValues
    function tableRows(s, shown, from, to) {
        var html = '', room = tableRoom(), k, x, row;
        for (k = from; k < to; k++) {
            x = +(s.from + k * s.by).toPrecision(12); // 0.3, not 0.30000000000000004
            row = [x].concat(shown.map(function (i) { return graphFns[i] ? graphFns[i].at(x, deg, true) : graphPlanes[i].at(x, deg)[1]; }));
            graphValues[k] = row;
            html += '<div class="calc-graph-line">' + row.map(function (n, c) {
                var text = !isFinite(n) ? '–' : c ? tableValue(n, room) : graphValue({ x: n }, 'x');
                return '<span class="calc-graph-cell' + (isFinite(n) ? '' : ' calc-none') + '" data-r="' + k + '" data-c="' + c + '">' +
                    text + '</span>';
            }).join('') + '</div>';
        }
        return html;
    }

    // the curves shown in the table, by their number: the functions, and the sequences, each a(n) at a whole x it has
    function tableCurves() {
        return graphFns.map(function (fn, i) { return fn || (graphPlanes[i] && graphPlanes[i].kind === 'seq') ? i : -1; }).filter(function (i) { return i > -1; });
    }

    // the curves of the table where they are all sequences, its x being their n; else null
    function tableSeqs() {
        var shown = tableCurves();
        return shown.length && shown.every(function (i) { return !graphFns[i]; }) ? shown : null;
    }

    function renderTable() {
        var shown = tableCurves(), s;
        if (!graph.classList.contains('calc-open') || graphTab !== 'table') return;
        s = tableSteps();
        graphLines = Math.max(graphLines, 60);
        graphValues = [];
        graphList.style.setProperty('--cols', shown.length + 1);
        graphList.innerHTML = '<div class="calc-graph-line calc-graph-names"><span><i>' + (tableSeqs() ? 'n' : 'x') + '</i></span>' + shown.map(function (i) {
            return '<span>' + graphSwatch(i) + (graphFns[i] ? '<i>y</i>' : '<i>' + graphPlanes[i].name + '</i>(<i>n</i>)') + '</span>';
        }).join('') + '</div>'; // first, so the room of a column can be measured
        if (shown.length) graphList.insertAdjacentHTML('beforeend', tableRows(s, shown, 0, graphLines));
        graphShown();
    }

    // near the end, 60 more rows, up to 2000
    graphList.addEventListener('scroll', function () {
        var shown = tableCurves();
        hideTip();
        if (!shown.length || graphLines >= 2000 || graphList.scrollTop + graphList.clientHeight < graphList.scrollHeight - 60) return;
        graphList.insertAdjacentHTML('beforeend', tableRows(tableSteps(), shown, graphLines, graphLines + 60));
        graphLines += 60;
    }, false);

    // a value goes into the calculation, as one of the statistics does
    graphList.addEventListener('click', function (e) {
        var cell = e.target.closest('.calc-graph-cell'), n = cell && graphValues[cell.dataset.r][cell.dataset.c];
        if (!cell || !isFinite(n) || !engine.put(n)) return;
        keyBoard['AC'].children[0].firstChild.data = 'C';
        showGraph(false);
        refresh();
        saveState();
        if (graphAlone) ask('graph-put');
    }, false);

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

    // a formula opens its letters, or closes them; a constant is put in; a letter is put in, or
    // takes the result by its STO
    fxList.addEventListener('click', function (e) {
        var row = e.target.closest('.calc-fx-row'), item = row && row.parentNode, letter = e.target.closest('.calc-var'),
            act = e.target.closest('.calc-var-btn');
        if (e.target.closest('.calc-var-clear')) {
            engine.letters(true);
            notify('Cleared');
            saveState();
            return lettersChanged();
        }
        if (letter) {
            if (act && act.dataset.act === 'store') storeIn(letter.dataset.k);
            else if (!e.target.closest('input')) {
                putLetter(letter.dataset.k);
                showFx(false);
            }
            return;
        }
        if (!item) {
            if (e.target.closest('.calc-fx-insert')) insertFormula(e.target.closest('.calc-fx-item'));
            return;
        }
        if (fxTab === 'constants') putConstant(fxItems.constants[+item.dataset.i].item);
        else if (!(item.classList.contains('calc-on') && bigSide(fx))) openFormula(item.classList.contains('calc-on') ? null : item); // beside the list it stays open
    }, false);

    // a number box keeps only what a number is made of: digits, one point, a minus first, and the
    // variables A to J, 2A, a small letter typed as its capital; bare: the digits alone, as a variable's
    // own value. marks: the °′″ of an angle. The point is a comma while that is the decimal mark, whichever is typed
    function onlyNumber(input, marks, bare) {
        var letters = !bare, v = input.value, at = input.selectionStart, clean = '', point = false, mark = engine.comma ? ',' : '.', n, c;
        for (n = 0; n < v.length; n++) {
            c = v.charAt(n);
            if (/[٠-٩۰-۹]/.test(c)) c = String(c.charCodeAt(0) - (c.charCodeAt(0) >= 0x6F0 ? 0x6F0 : 0x660)); // ٥ is 5
            else if (c === '٫') c = '.';
            if (engine.comma && c === '.') c = ',';
            if (letters && /[a-j]/.test(c)) c = c.toUpperCase();
            if (/\d/.test(c) || (marks && /[°′″]/.test(c)) || (letters && /[A-J]/.test(c)) || (c === '-' && !clean) ||
                (c === mark && !point && (point = true))) clean += c;
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
        onlyNumber(e.target, false, !!e.target.closest('.calc-var')); // a formula's letter may be one of A to J: a = A; a variable's value, digits
        if (e.target.closest('.calc-var')) return; // a letter's value: kept once it is left, or Enter
        var note = e.target.closest('.calc-fx-form').querySelector('.calc-fx-note');
        e.target.classList.remove('calc-bad');
        note.classList.remove('calc-fx-warn'); // a value changed: the usual note again
        note.innerHTML = note.dataset.usual;
    }, false);

    // a letter's value typed in its box, kept as it is left; a box made empty is 0, and what is no
    // number shows what the letter holds again
    fxList.addEventListener('change', function (e) {
        var letter = e.target.closest('.calc-var'), text = letter && boxValue(e.target).trim();
        if (!letter) return;
        if (!engine.setLetter(letter.dataset.k, text === '' ? 0 : +text)) e.target.value = letterText(letter.dataset.k);
        else setLetter(letter.dataset.k, engine.vars[letter.dataset.k]);
    }, false);

    // Enter in the search takes the first one found; in a letter it goes on
    // to the next empty one, and puts the formula in once all are filled; in the box of A to J it keeps the value
    fx.addEventListener('keydown', function (e) {
        var item = e.target.closest('.calc-fx-item'), inputs, empty;
        if (e.which !== 13) return;
        e.preventDefault();
        if (e.target.closest('.calc-var')) return e.target.blur();
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

    // the list of the tab, the entries the search finds, under the name of their group
    function renderFx() {
        var words = fxSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean), group = null, html = '';

        [].forEach.call(fx.querySelectorAll('.calc-fx-tab'), function (tab) {
            tab.classList.toggle('calc-on', tab.dataset.tab === fxTab);
        });
        fxSearch.hidden = fxTab === 'vars'; // ten letters, nothing to search
        fxList.classList.remove('calc-side');
        if (fxTab === 'vars') return showLetters();
        fxSearch.placeholder = fxTab === 'formulas' ? 'Search formulas' : 'Search constants';
        fxItems[fxTab].forEach(function (entry, i) {
            var it = entry.item;
            if (!words.every(function (w) { return entry.words.indexOf(w) > -1; })) return;
            if (entry.c !== group) html += '<div class="calc-fx-cat">' + entry.c + '</div>';
            group = entry.c;
            // a constant is written as a formula is: its symbol = its value, a root drawn
            html += '<div class="calc-fx-item" data-i="' + i + '"><div class="calc-fx-row">' +
                '<span class="calc-fx-col"><span class="calc-fx-name">' + it.t + '</span>' +
                '<span class="calc-fx-f calc-fx-eq' + (fxTab === 'constants' ? ' calc-fx-val' : '') + '"><span>' +
                (fxTab === 'constants' ? '<span class="calc-fx-sym">' +
                    it.s.replace(/√(\w+)/, '<span class="calc-root">$1</span>') + '</span> = ' + constantValue(it) : it.f) +
                '</span>' +
                // a constant has insert at the right of its value, while the pointer is over it
                (fxTab === 'constants' ? '<span class="calc-fx-put">' + insertIcon() + '</span>' : '') +
                '</span></span>' +
                // a formula has the arrow that says whether it is open
                (fxTab === 'formulas' ? collapseButton() : '') +
                '</div></div>';
        });
        fxList.innerHTML = html || '<div class="calc-fx-none">Nothing found</div>';
        fxList.scrollTop = 0;
        fxList.style.setProperty('--rows', fxList.children.length + 1); // beside the list, its first row the room of the search
        fxList.classList.toggle('calc-side', fxTab === 'formulas' && bigSide(fx));
        if (fxTab === 'formulas' && bigSide(fx)) { // beside the list, one is always open: the one open last, if found, else the first
            openFormula(fxList.querySelector('.calc-fx-item[data-i="' + fxOpen + '"]') || fxList.querySelector('.calc-fx-item'), true);
        }
        hideTip();
    }

    // The Variables tab: a card for each letter, its value in a box to type over, then STO, which keeps
    // the result of the line in it, and insert; a click on the card puts the letter in as well.
    // Built once while the tab is shown; after that only the values change, not a box being typed in
    function showLetters() {
        var typing = fxList.contains(document.activeElement) ? document.activeElement : null;
        if (!fxList.querySelector('.calc-var')) {
            fxList.innerHTML = '<div class="calc-var-head"><span><kbd>Shift</kbd>+<kbd>A</kbd> puts A in, <kbd>Alt</kbd>+<kbd>A</kbd> stores in it</span>' +
                '<span class="calc-var-clear">Clear all</span></div>' +
                CalcEngine.LETTERS.split('').map(function (k) {
                    return '<div class="calc-fx-item calc-var" data-k="' + k + '"><div class="calc-fx-row calc-var-row">' +
                        '<span class="calc-var-k">' + k + '</span>' +
                        '<input type="text" inputmode="decimal" spellcheck="false" autocomplete="off" maxlength="24" aria-label="' + k + '">' +
                        '<span class="calc-var-btn" data-act="store">STO</span>' +
                        '<span class="calc-var-btn" data-act="insert">' + insertIcon(true) + '</span></div></div>';
                }).join('');
            fxList.scrollTop = 0;
            hideTip();
        }
        [].forEach.call(fxList.querySelectorAll('.calc-var'), function (card) {
            var input = card.querySelector('input'), v = engine.vars[card.dataset.k];
            if (input !== typing) input.value = letterText(card.dataset.k);
            card.classList.toggle('calc-var-set', v !== 0);
        });
        fxList.querySelector('.calc-var-clear').classList.toggle('calc-off', CalcEngine.LETTERS.split('').every(function (k) {
            return !engine.vars[k];
        }));
    }

    // the tip of a letter's card and its buttons: what it holds, and the keys for it
    function letterTip(el) {
        var k = el.closest('.calc-var').dataset.k;
        if (el.dataset.act === 'store') {
            return { t: 'Store in ' + k, d: 'Works out the line in the display, as = does, and keeps its result in ' + k + ': 5 + 3 → ' + k + '. After a result, that result.', k: 'Alt+' + k };
        }
        if (el.dataset.act === 'insert') return { t: 'Insert ' + k, d: 'Puts ' + k + ' in the equation: 2' + k + ' is 2 × ' + k + '.', k: 'Shift+' + k };
        return {
            t: 'Variable ' + k, k: 'Shift+' + k,
            d: k + ' holds ' + letterValue(k) + '. Click to put ' + k + ' in the equation, where it stays ' + k + ' and is worked out with what it holds then. Type in the box to change it.'
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
        if (graphTab === 'examples') showGraphTab('graph');
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
        form.innerHTML = '<div class="calc-sv-side-head"><span class="calc-sv-side-name">' + f.t + '</span>' + item.querySelector('.calc-fx-f').outerHTML + // beside the list, at its top
            '<p class="calc-sv-side-d">' + f.d + '</p></div>' +
            '<div class="calc-fx-fields">' + f.v.map(function (v) {
            return '<label class="calc-fx-var"><span class="calc-fx-sym">' + v[1] + '</span>' +
                // a keyboard with letters, for A to J as well as numbers
                '<input type="text" autocapitalize="characters" spellcheck="false" autocomplete="off" maxlength="40" placeholder="' +
                v[2] + '"></label>';
        }).join('') + '</div><div class="calc-fx-actions"><span class="calc-fx-note">' +
            (f.deg ? 'Angles in ' + ['radians', 'degrees', 'gradians'][deg] + ', the unit in use' : '') +
            '</span><span class="calc-fx-insert">Insert' + insertIcon() + '</span></div>';
        item.classList.add('calc-on');
        form.querySelector('.calc-fx-note').dataset.usual = form.querySelector('.calc-fx-note').innerHTML;
        first = form.querySelector('input');
        if (!engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
            first.value = local(+(+engine.value).toPrecision(13));
        }
        if (!quiet && focusBox(first)) first.select();
        item.firstChild.scrollIntoView({ block: 'nearest' }); // its row: beside the list, the card itself is not in it
    }

    // the note of a formula naming the letters of the boxes marked: empty, or, typed, not a number
    function badNote(note, inputs, typed) {
        var names = inputs.filter(function (input) { return input.classList.contains('calc-bad'); }).map(function (input) {
            return input.parentNode.querySelector('.calc-fx-sym').innerHTML;
        });
        if (!names.length) return;
        note.classList.add('calc-fx-warn');
        note.innerHTML = names.length > 2 ? names.length + (typed ? ' boxes are not numbers.' : ' boxes are empty.') :
            names.join(' and ') + (names.length > 1 ? (typed ? ' are not numbers.' : ' are empty.') : (typed ? ' is not a number.' : ' is empty.'));
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
            note.classList.add('calc-fx-warn');
            note.innerHTML = CalcFormulas.why(f, inputs.map(boxValue));
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

    function putConstant(k) {
        if (!engine.put(k.v)) return;
        keyBoard['AC'].children[0].firstChild.data = 'C';
        showFx(false);
        refresh();
        saveState();
    }

    // the tip of a formula, open or not: what it gives, its letters and an example; a constant has the tip of a result (peekOf)
    function fxTip(el) {
        var item = el.parentNode, it;
        if (el.classList.contains('calc-past-close')) return CalcTips['formulas close'];
        if (el.classList.contains('calc-var-clear')) return CalcTips['letters clear'];
        if (el.closest('.calc-var')) return letterTip(el);
        if (!el.classList.contains('calc-fx-row')) return null;
        it = fxItems[fxTab][+item.dataset.i].item;
        if (fxTab === 'constants') return null;
        if (item.classList.contains('calc-on') && bigSide(fx)) return null; // beside the list, what it does is at the top of its card
        return {
            t: it.t,
            d: it.d + '<div class="calc-tip-more">' + it.v.map(function (v) {
                return '<i>' + v[1] + '</i> ' + v[2];
            }).join(', ') + '<br>For example ' + it.v.map(function (v, i) {
                return '<i>' + v[1] + '</i> = ' + it.ex[0][i] + (it.deg && /angle/.test(v[2]) ? '°' : '');
            }).join(', ') + ' gives ' + +it.ex[1].toPrecision(10) + '.</div>',
            k: ''
        };
    }

    // ---------------- solve ---------------- //

    // The subtitle of a card in light rounded badges: one of a few things each in its own, in
    // place of commas between them, pills(['A + B', 'A × B']); one alone in one, as each card draws it
    function pills(items) {
        return [].concat(items).map(function (x) { return '<span class="calc-sv-pill"><span>' + x + '</span></span>'; }).join('');
    }

    // Equations solved for x, calculus and probability, a tab each: a card for each tool, as the
    // formulas have, which opens its boxes. What it gives is worked out as they are typed, in
    // tiles that put a value into the calculation with a click, as the statistics do. A box of
    // a number takes what the calculator reads, pi/4 or sqrt(2), in the unit of angles in use,
    // and an empty one its default, which it shows; a box of a function what the graph reads.
    // Each tool: t its name, f how it is written, d what it gives; fields its boxes, each of a
    // key k, a label l, a placeholder ph, and fn for a function, text for words read as they
    // are, def for the number of an empty one, inf where ∞ is a number, area for a box of lines,
    // a list, choice for ways to choose one of, each a button, which it has as '0', '1' …; cols the
    // columns of the boxes; example, what its Example button types in its boxes, by key; run(numbers, typed) its results: { rows: [{ l, v: a number, text, m: a
    // matrix, head: the heads of its columns, a table with Copy table, places: its number or numbers
    // shown to these decimal places, money to the cent, put in and copied whole, wide }], note, warn, bad: the keys of the boxes that are not what they
    // should be, cols: the columns of the tiles, where not three }
    var MEAN = { k: 'mu', l: 'μ', ph: '0', def: 0 }, // the boxes of a normal distribution
        SPREAD = { k: 'sigma', l: 'σ', ph: '1', def: 1 },
        PROBABILITY = { k: 'p', l: 'p', ph: '0.95', def: 0.95 }, // a chance to find the value of
        LEVEL = { k: 'level', l: 'Level', ph: '0.95', def: 0.95 }, // of a confidence interval
        SOLVE_TOOLS = {
        solve: [
            { id: 'equation', t: 'Equation', f: 'x<sup>3</sup> = 2x + 1', d: 'Every x where its two sides are equal, or where one side alone is 0; from and to where to look, if you like.',
                fields: [{ k: 'eq', ph: 'x^3 = 2x + 1', fn: true }, { k: 'from', l: 'From', ph: 'optional' }, { k: 'to', l: 'To', ph: 'optional' }], cols: 2,
                run: runEquation },
            { id: 'inequality', t: 'Inequality', f: 'x<sup>2</sup> – 4 &gt; 0', d: 'Every x where it holds, as x &lt; –2 or x &gt; 2 and in intervals: with &lt;, &gt;, &lt;= or &gt;=, or two the same way, 1 &lt; x^2 &lt; 4. From and to where to look, if you like.',
                fields: [{ k: 'eq', ph: 'x^2 - 4 > 0', fn: true }, { k: 'from', l: 'From', ph: 'optional' }, { k: 'to', l: 'To', ph: 'optional' }], cols: 2,
                run: runInequality },
            { id: 'extrema', t: 'Turning points', f: 'max and min of f(x)', d: 'Where a function is highest or lowest near by, x^3 – 3x at –1 and 1: each x and its value. With From and To, its highest and lowest between them as well, the ends among them.',
                fields: [{ k: 'f', ph: 'x^3 - 3x', fn: true }, { k: 'from', l: 'From', ph: 'optional' }, { k: 'to', l: 'To', ph: 'optional' }], cols: 2,
                run: runExtrema },
            { id: 'quadratic', t: 'Quadratic', f: 'ax<sup>2</sup> + bx + c = 0', d: 'Its two roots, real or a ± bi, the discriminant b² – 4ac and the vertex of its parabola.',
                fields: coefficients('abc'), cols: 3, run: function (n) { return runPoly([n.a, n.b, n.c]); } },
            { id: 'cubic', t: 'Cubic', f: 'ax<sup>3</sup> + bx<sup>2</sup> + cx + d = 0', d: 'Its three roots, real or a ± bi.',
                fields: coefficients('abcd'), cols: 4, run: function (n) { return runPoly([n.a, n.b, n.c, n.d]); } },
            { id: 'quartic', t: 'Quartic', f: 'ax<sup>4</sup> + bx<sup>3</sup> + cx<sup>2</sup> + dx + e = 0', d: 'Its four roots, real or a ± bi.',
                fields: coefficients('abcde'), cols: 5, run: function (n) { return runPoly([n.a, n.b, n.c, n.d, n.e]); } },
            { id: 'polynomial', t: 'Polynomial', f: 'a<sub>n</sub>x<sup>n</sup> + … + a<sub>0</sub> = 0', d: 'Every root of a polynomial of any power up to 30, real or a ± bi, and it multiplied out: typed, x^5 – 3x + 1 or (x – 1)(x + 2)^2, or its coefficients from the highest power, 1, 0, -2, 1.',
                fields: [{ k: 'p', ph: 'x^5 - 3x + 1', fn: true }], run: runPolynomial },
            { id: 'system2', t: 'Two equations', f: 'a<sub>1</sub>x + b<sub>1</sub>y = c<sub>1</sub>', d: 'x and y of two linear equations: a₁x + b₁y = c₁ and a₂x + b₂y = c₂.',
                fields: system(2), cols: 3, run: function (n) { return runSystem(n, 2); } },
            { id: 'system3', t: 'Three equations', f: 'a<sub>1</sub>x + b<sub>1</sub>y + c<sub>1</sub>z = d<sub>1</sub>', d: 'x, y and z of three linear equations, each a row: a, b, c and what it equals, d.',
                fields: system(3), cols: 4, run: function (n) { return runSystem(n, 3); } },
            { id: 'curves', t: 'Two curves', f: ['x<sup>2</sup> + y<sup>2</sup> = 25', 'x + y = 7'], d: 'Every x and y where two equations of them hold together, not only lines: where the circle x^2 + y^2 = 25 and the line x + y = 7 cross, or y = x^2 and x + y = 1.',
                fields: [{ k: 'e1', ph: 'x^2 + y^2 = 25', fn: true, aria: 'First equation' }, { k: 'e2', ph: 'x + y = 7', fn: true, aria: 'Second equation' }], run: runCurves }
        ],
        calculus: [
            { id: 'integral', t: 'Integral', f: '∫<sub>a</sub><sup>b</sup> f(x) dx', d: 'The integral of a function from a to b, the area under it, its exact form where it has one, √π or 1/3, and the average value of the function there; an end may be ∞, typed inf.',
                fields: [{ k: 'f', ph: 'x^2', fn: true }, { k: 'a', l: 'From', ph: '0', def: 0, inf: true }, { k: 'b', l: 'To', ph: '1', def: 1, inf: true }], cols: 2,
                run: runIntegral },
            { id: 'derivative', t: 'Derivative', f: ['f′(x)', 'f″(x)'], d: 'The value of a function at x, its slope there and the slope of that, and the line that touches it there.',
                fields: [{ k: 'f', ph: 'x^3', fn: true }, { k: 'x', l: 'x', ph: '2' }], cols: 1, run: runDerivative },
            { id: 'sum', t: 'Sum', f: 'Σ f(n)', d: 'The sum of a function of n, k, i or j, or of x, for each whole number from a to b. b may be ∞, typed inf: 1/n^2 from 1 on is π²/6.',
                fields: [{ k: 'f', ph: 'n^2', fn: true }, { k: 'a', l: 'From', ph: '1', def: 1 }, { k: 'b', l: 'To', ph: '10', def: 10, inf: true }], cols: 2,
                run: function (n, raw) { return runSeries(n, raw, false); } },
            { id: 'product', t: 'Product', f: 'Π f(n)', d: 'The product of a function of n, k, i or j, or of x, for each whole number from a to b. b may be ∞, typed inf: 1 – 1/n^2 from 2 on is 1/2.',
                fields: [{ k: 'f', ph: 'n', fn: true }, { k: 'a', l: 'From', ph: '1', def: 1 }, { k: 'b', l: 'To', ph: '5', def: 5, inf: true }], cols: 2,
                run: function (n, raw) { return runSeries(n, raw, true); } },
            { id: 'limit', t: 'Limit', f: 'lim<sub>x→a</sub> f(x)', d: 'What a function comes to as x comes to a, from below, from above and both, or ∞ where it grows without end: sin(x)/x as x comes to 0. a may be ∞, typed inf.',
                fields: [{ k: 'f', ph: 'sin(x)/x', fn: true }, { k: 'a', l: 'x →', ph: '0', def: 0, inf: true, name: 'The point x goes to' }], cols: 1, run: runLimit },
            { id: 'taylor', t: 'Taylor series', f: 'f(a) + f′(a)(x – a) + …', d: 'A function as a polynomial about a, to the power you give, up to 12: sin x is x – x³/6 + x⁵/120 – …, and each coefficient, f⁽ᵏ⁾(a)/k!.',
                fields: [{ k: 'f', ph: 'sin(x)', fn: true }, { k: 'a', l: 'a', ph: '0', def: 0 }, { k: 'n', l: 'Power', ph: '7', def: 7 }], cols: 2, run: runTaylor },
            { id: 'between', t: 'Area between', f: '∫<sub>a</sub><sup>b</sup> |f(x) – g(x)| dx', d: 'The area between two curves from a to b, the parts where g is above as well, the integral of f – g, and where they cross on the way.',
                fields: [{ k: 'f', ph: 'x', fn: true, aria: 'f(x)' }, { k: 'g', ph: 'x^2', fn: true, aria: 'g(x)' }, { k: 'a', l: 'From', ph: '0', def: 0 }, { k: 'b', l: 'To', ph: '1', def: 1 }], cols: 2,
                run: runBetween },
            { id: 'arc', t: 'Arc length', f: '∫<sub>a</sub><sup>b</sup> √(1 + f′(x)²) dx', d: 'How long the curve of a function is from a to b, as a string laid along it.',
                fields: [{ k: 'f', ph: 'x^2', fn: true }, { k: 'a', l: 'From', ph: '0', def: 0 }, { k: 'b', l: 'To', ph: '1', def: 1 }], cols: 2, run: runArc },
            { id: 'ode', t: 'Differential equation', f: 'y′ = f(x, y)', d: 'y at x, where its slope y′ is a function of x and y and it starts at y₀ at x₀: y′ = x + y with y(0) = 1, by the steps of Runge and Kutta.',
                fields: [{ k: 'f', l: 'y′ =', ph: 'x + y', fn: true }, { k: 'x0', l: 'x<sub>0</sub>', ph: '0', def: 0 }, { k: 'y0', l: 'y<sub>0</sub>', ph: '1', def: 1 }, { k: 'x', l: 'x', ph: '1', def: 1 }],
                cols: 3, run: runOde }
        ],
        chance: [
            { id: 'normal', t: 'Normal probability', f: 'P(a ≤ X ≤ b)', d: 'The chance that a normal value of mean μ and standard deviation σ is between a and b; an empty end goes on without end.',
                fields: [{ k: 'a', l: 'From', ph: '−∞', def: -Infinity, inf: true }, { k: 'b', l: 'To', ph: '∞', def: Infinity, inf: true }, MEAN, SPREAD], cols: 2,
                run: function (n) {
                    var p = CalcMaths.normalBetween(n.a, n.b, n.mu, n.sigma);
                    return { rows: [{ l: 'P(a ≤ X ≤ b)', v: p }, { l: 'Outside', v: CalcMaths.round(1 - p) }], note: sigmaNote(n) };
                } },
            { id: 'density', t: 'Normal density', f: 'f(x)', d: 'The height of the normal curve of mean μ and standard deviation σ at x.',
                fields: [{ k: 'x', l: 'x', ph: '0' }, MEAN, SPREAD], cols: 1,
                run: function (n) { return { rows: [{ l: 'f(x)', v: CalcMaths.normalDensity(n.x, n.mu, n.sigma) }], note: sigmaNote(n) }; } },
            { id: 'inverse', t: 'Inverse normal', f: 'P(X ≤ x) = p', d: 'The x that a normal value is below with the chance p, above with it, and the middle part that holds p.',
                fields: [{ k: 'p', l: 'p', ph: '0.95' }, MEAN, SPREAD], cols: 1,
                run: function (n) {
                    var mid = (1 - n.p) / 2;
                    return {
                        rows: [{ l: 'P(X ≤ x)', v: CalcMaths.normalInverse(n.p, n.mu, n.sigma) }, { l: 'P(X ≥ x)', v: CalcMaths.normalInverse(1 - n.p, n.mu, n.sigma) },
                            { l: 'Middle from', v: CalcMaths.normalInverse(mid, n.mu, n.sigma) }, { l: 'Middle to', v: CalcMaths.normalInverse(1 - mid, n.mu, n.sigma) }],
                        note: !isNaN(n.p) && !(n.p > 0 && n.p < 1) ? 'p is a chance between 0 and 1.' : sigmaNote(n), warn: !isNaN(n.p) && !(n.p > 0 && n.p < 1)
                    };
                } },
            { id: 'student', t: 'Student\'s t', f: 'P(T ≤ t), ν degrees', d: 'The chances of Student\'s t of ν degrees of freedom below and above t, and of a t as far from 0 either way, the two-sided p; and the t it is below with the chance p, and the ±t it is between with it.',
                fields: [{ k: 't', l: 't', ph: '2' }, { k: 'nu', l: 'ν', ph: '10', def: 10 }, PROBABILITY], cols: 3, run: runStudent },
            { id: 'chi', t: 'Chi-squared', f: 'P(χ² ≤ x), k degrees', d: 'The chances of χ² of k degrees of freedom below and above x, the x it is below with the chance p, its mean and σ.',
                fields: [{ k: 'x', l: 'x', ph: '3.84' }, { k: 'k', l: 'k', ph: '1', def: 1 }, PROBABILITY], cols: 3, run: runChi },
            { id: 'fisher', t: 'F', f: 'P(F ≤ x), d₁ and d₂', d: 'The chances of F of d₁ and d₂ degrees of freedom below and above x, and the x it is below with the chance p.',
                fields: [{ k: 'x', l: 'x', ph: '3.33' }, { k: 'd1', l: 'd<sub>1</sub>', ph: '5', def: 5 }, { k: 'd2', l: 'd<sub>2</sub>', ph: '10', def: 10 }, PROBABILITY], cols: 4, run: runF },
            { id: 'binomial', t: 'Binomial', f: 'P(X = k), n tries', d: 'The chance of k of n tries, each with the chance p: exactly k, k or fewer and k or more.',
                fields: [{ k: 'n', l: 'n', ph: '10' }, { k: 'p', l: 'p', ph: '0.5' }, { k: 'k', l: 'k', ph: '5' }], cols: 3,
                run: function (n) {
                    var c = CalcMaths.binomial(n.n, n.p, n.k), bad = !isNaN(n.n) && !isNaN(n.p) && isNaN(c.eq) && !isNaN(n.k);
                    return { rows: chances(c, n.n * n.p, Math.sqrt(n.n * n.p * (1 - n.p)), !isNaN(c.eq)), note: bad ? 'n is a whole number, p a chance between 0 and 1.' : '', warn: bad };
                } },
            { id: 'poisson', t: 'Poisson', f: 'P(X = k), mean λ', d: 'The chance of a count of k, of events that come at random at a mean of λ: exactly k, k or fewer and k or more.',
                fields: [{ k: 'lambda', l: 'λ', ph: '3' }, { k: 'k', l: 'k', ph: '2' }], cols: 2,
                run: function (n) {
                    var c = CalcMaths.poisson(n.lambda, n.k), bad = !isNaN(n.lambda) && !(n.lambda > 0);
                    return { rows: chances(c, n.lambda, Math.sqrt(n.lambda), !isNaN(c.eq)), note: bad ? 'λ is above 0.' : '', warn: bad };
                } },
            { id: 'geometric', t: 'Geometric', f: 'P(X = k), first success', d: 'The chance that the first success is on try k, each with the chance p: exactly then, by then and not before.',
                fields: [{ k: 'p', l: 'p', ph: '0.2' }, { k: 'k', l: 'k', ph: '3' }], cols: 2,
                run: function (n) {
                    var c = CalcMaths.geometric(n.p, n.k), bad = !isNaN(n.p) && !(n.p > 0 && n.p <= 1);
                    return { rows: chances(c, 1 / n.p, Math.sqrt(1 - n.p) / n.p, !isNaN(c.eq)), note: bad ? 'p is a chance above 0, up to 1.' : '', warn: bad };
                } },
            { id: 'hypergeometric', t: 'Hypergeometric', f: 'P(X = k), drawn without putting back', d: 'The chance of k of n drawn, without putting back, from N of which K count, as cards from a pack: exactly k, k or fewer and k or more.',
                fields: [{ k: 'N', l: 'N', ph: '52' }, { k: 'K', l: 'K', ph: '13' }, { k: 'n', l: 'n', ph: '5' }, { k: 'k', l: 'k', ph: '2' }], cols: 4,
                run: function (n) {
                    var c = CalcMaths.hypergeometric(n.N, n.K, n.n, n.k), known = !isNaN(c.eq), bad = [n.N, n.K, n.n, n.k].every(isFinite) && !known;
                    return { rows: chances(c, n.n * n.K / n.N, Math.sqrt(n.n * n.K / n.N * (n.N - n.K) / n.N * (n.N - n.n) / (n.N - 1)), known),
                        note: bad ? 'Whole numbers, K and n no more than N.' : '', warn: bad };
                } },
            { id: 'exponential', t: 'Exponential', f: 'P(X ≤ x), rate λ', d: 'The chance that the wait for an event that comes at random at a rate of λ is shorter than x, or longer, and its density there.',
                fields: [{ k: 'lambda', l: 'λ', ph: '0.5' }, { k: 'x', l: 'x', ph: '2' }], cols: 2,
                run: function (n) {
                    var c = CalcMaths.exponential(n.lambda, n.x), bad = !isNaN(n.lambda) && !(n.lambda > 0);
                    return { rows: spread(c, 1 / n.lambda, 1 / n.lambda, !bad && isFinite(n.lambda)), note: bad ? 'λ is above 0.' : '', warn: bad };
                } },
            { id: 'uniform', t: 'Uniform', f: 'P(X ≤ x), from a to b', d: 'The chance that a value spread evenly from a to b is below x, or above, and its density there.',
                fields: [{ k: 'a', l: 'From', ph: '0', def: 0 }, { k: 'b', l: 'To', ph: '1', def: 1 }, { k: 'x', l: 'x', ph: '0.25' }], cols: 3,
                run: function (n) {
                    var c = CalcMaths.uniform(n.a, n.b, n.x), bad = isFinite(n.a) && isFinite(n.b) && !(n.a < n.b);
                    return { rows: spread(c, (n.a + n.b) / 2, (n.b - n.a) / Math.sqrt(12), !bad && isFinite(n.a) && isFinite(n.b)), note: bad ? 'From is less than To.' : '', warn: bad };
                } },
            { id: 'meanci', t: 'Confidence interval of a mean', f: 'x̄ ± t s/√n', d: 'Where the mean is, with the chance you give, from a sample of n of mean x̄ and standard deviation s, by Student\'s t.',
                fields: [{ k: 'mean', l: 'x̄', ph: '50' }, { k: 's', l: 's', ph: '10' }, { k: 'n', l: 'n', ph: '25' }, LEVEL], cols: 4,
                run: function (n) {
                    var r = CalcMaths.meanInterval(n.mean, n.s, n.n, n.level), bad = [n.mean, n.s, n.n].every(isFinite) && isNaN(r.from);
                    return { rows: [{ l: 'From', v: r.from }, { l: 'To', v: r.to }, { l: '±', v: r.margin }, { l: 't', v: r.t }],
                        note: bad ? 'n is a whole number of 2 or more, s 0 or more, the level a chance between 0 and 1.' : '', warn: bad };
                } },
            { id: 'propci', t: 'Confidence interval of a proportion', f: 'p̂ ± z √(p̂(1 – p̂)/n)', d: 'Where a chance is, with the chance you give, from x of n: about x/n by the normal distribution, and by Wilson\'s way, which stays between 0 and 1 and is nearer for a small n.',
                fields: [{ k: 'x', l: 'x', ph: '40' }, { k: 'n', l: 'n', ph: '100' }, LEVEL], cols: 3,
                run: function (n) {
                    var r = CalcMaths.proportionInterval(n.x, n.n, n.level), bad = [n.x, n.n].every(isFinite) && isNaN(r.p);
                    return { rows: [{ l: 'p̂', v: r.p }, { l: 'From', v: r.from }, { l: 'To', v: r.to }, { l: '±', v: r.margin }, { l: 'Wilson from', v: r.wilson[0] }, { l: 'Wilson to', v: r.wilson[1] }],
                        note: bad ? 'x and n are whole numbers, x no more than n; the level a chance between 0 and 1.' : '', warn: bad };
                } },
            { id: 'random', t: 'Random whole numbers', f: 'from a to b', d: 'Five whole numbers at random, each from a to b, both in, as dice give them. Again for five more.',
                fields: [{ k: 'a', l: 'From', ph: '1', def: 1 }, { k: 'b', l: 'To', ph: '6', def: 6 }], cols: 2, again: true,
                run: function (n) {
                    var rows = [], k;
                    for (k = 0; k < 5; k++) rows.push({ l: 'Number ' + (k + 1), v: CalcMaths.randomWhole(n.a, n.b, chance) });
                    return { rows: rows, note: isNaN(rows[0].v) && isFinite(n.a) && isFinite(n.b) ? 'Whole numbers, From the smaller.' : '', warn: isNaN(rows[0].v) };
                } }
        ],
        finance: [
            { id: 'schedule', t: 'Loan calculator', f: ['Interest', 'Principal', 'Balance'], d: 'A loan paid back in equal payments at the end of each period: the payment, all the interest, and a table ' +
                'of each year, or of each payment, of the interest paid, the principal paid and what is left of the loan. Copy table copies it for a spreadsheet.',
                fields: [{ k: 'loan', l: 'Loan', ph: '' }, { k: 'rate', l: 'Rate %', ph: '' }, { k: 'years', l: 'Years', ph: '' }, { k: 'py', l: 'A year', ph: '12', def: 12, aria: 'Payments a year' },
                    { k: 'by', l: 'Table', choice: ['By year', 'By payment'] }], cols: 2, run: runSchedule },
            { id: 'savings', t: 'Savings growth', f: 'P(1 + r/m)<sup>mt</sup>', d: 'Money saved at a rate a year, of interest m times a year, for years, with an amount added each period if you like, at its end or its start: ' +
                'what it grows to, all that was put in, the interest, and a table of each year. m may be ∞, typed inf, for interest all the time, with nothing added. Copy table copies it for a spreadsheet.',
                fields: [{ k: 'start', l: 'Start', ph: '' }, { k: 'rate', l: 'Rate %', ph: '' }, { k: 'years', l: 'Years', ph: '' }, { k: 'm', l: 'A year', ph: '12', def: 12, inf: true, aria: 'Periods a year' },
                    { k: 'add', l: 'Add', ph: '0', def: 0, aria: 'Added each period' }, { k: 'due', l: 'Added', choice: ['At the end', 'At the start'] }], cols: 2, run: runSavings },
            { id: 'rates', t: 'Interest rates', f: 'APR ↔ APY', d: 'A nominal rate a year, its APR, as the effective one, its APY, of interest m times a year, and back: type one, ' +
                'and the other is worked out. m may be ∞, typed inf, for interest all the time.',
                fields: [{ k: 'apr', l: 'APR %', ph: '' }, { k: 'apy', l: 'APY %', ph: '' }, { k: 'm', l: 'm', ph: '12', def: 12, inf: true, aria: 'Periods a year' }], cols: 3, run: runRates },
            { id: 'breakeven', t: 'Break-even', f: 'Fixed ÷ (Price – Cost)', d: 'How many must be sold to cover the fixed costs, and a profit if you like, at a price and a cost of each one: ' +
                'the units, what they sell for, and what each one leaves.',
                fields: [{ k: 'fixed', l: 'Fixed costs', ph: '' }, { k: 'price', l: 'Price', ph: '' }, { k: 'cost', l: 'Cost each', ph: '' }, { k: 'profit', l: 'Profit', ph: '0', def: 0 }], cols: 2,
                run: runBreakEven },
            { id: 'inflation', t: 'Inflation', f: 'A(1 + r)<sup>t</sup>', d: 'An amount at inflation of a rate a year for years: what it costs then, what it was worth in money of today, ' +
                'how many times prices grow, and how much of what money buys is lost.',
                fields: [{ k: 'amount', l: 'Amount', ph: '' }, { k: 'rate', l: 'Rate %', ph: '' }, { k: 'years', l: 'Years', ph: '' }], cols: 3, run: runInflation },
            { id: 'depreciation', t: 'Depreciation', f: ['Straight line', 'Declining balance'], d: 'What an asset loses each year of its life, down to what it is worth at the end, its salvage value: the same each year by the straight line, ' +
                'or twice the straight line\'s rate of what is left by the double declining balance, then the straight line once that loses more. A table of each year; Copy table copies it for a spreadsheet.',
                fields: [{ k: 'cost', l: 'Cost', ph: '' }, { k: 'salvage', l: 'Salvage', ph: '0', def: 0 }, { k: 'life', l: 'Years', ph: '' },
                    { k: 'way', l: 'Way', choice: ['Straight line', 'Declining balance'] }], cols: 3, run: runDepreciation },
            { id: 'tvm', t: 'Time value of money', f: ['N', 'I/Y', 'PV', 'PMT', 'FV'], d: 'Money over time, as a BA II Plus or an HP 12C works it out: leave one of N, I/Y, PV, PMT and FV empty, and it is worked out. ' +
                'N payments of PMT, at I/Y, a percentage a year, of P/Y payments a year, bring PV at the start to FV at the end; each payment at the end of its period, or at its start. ' +
                'Money received is above 0 and money paid below 0: a loan of 200000 is PV = 200000, its PMT below 0. With all the money paid, and the interest.',
                fields: [{ k: 'n', l: 'N', ph: '' }, { k: 'iy', l: 'I/Y %', ph: '' }, { k: 'pv', l: 'PV', ph: '' }, { k: 'pmt', l: 'PMT', ph: '' },
                    { k: 'fv', l: 'FV', ph: '' }, { k: 'py', l: 'P/Y', ph: '12', def: 12 },
                    { k: 'due', l: 'Payments', choice: ['At the end', 'At the start'] }], cols: 2, run: runTvm },
            { id: 'npv', t: 'NPV and IRR', f: 'Σ CF<sub>t</sub> / (1 + r)<sup>t</sup>', d: 'Of cash flows, one a period, the first at the start and usually below 0, as it is paid out: their net present value at the rate r, ' +
                'a percentage a period; their internal rate of return, the rate of an NPV of 0; and how many periods they take to pay back what went out. ' +
                'Type the flows one to a line, or apart as the statistics list is: -1000, 300, 400, 500.',
                fields: [{ k: 'r', l: 'Rate %', ph: '10', def: 10 }, { k: 'cf', l: 'Cash flows', ph: '-1000&#10;300&#10;400&#10;500', area: true }], run: runNpv },
            { id: 'bond', t: 'Bond price and yield', f: 'Σ C / (1 + y)<sup>t</sup> + F / (1 + y)<sup>n</sup>', d: 'A bond of a face value paying its coupon, a percentage of it a year, in parts a number of times a year, for years: ' +
                'leave one of Price and Yield empty, and it is worked out, the yield a year as a BA II Plus gives it. Years that are not whole coupons bring the next coupon nearer: ' +
                'the price is then without the interest earned since the last one, the accrued interest, and the dirty price with it. With the current yield and the duration.',
                fields: [{ k: 'face', l: 'Face', ph: '100', def: 100 }, { k: 'coupon', l: 'Coupon %', ph: '' }, { k: 'years', l: 'Years', ph: '' }, { k: 'freq', l: 'A year', ph: '2', def: 2, aria: 'Coupons a year' },
                    { k: 'price', l: 'Price', ph: '' }, { k: 'yld', l: 'Yield %', ph: '' }], cols: 2, run: runBond },
            { id: 'change', t: 'Percentage change', f: '(b – a) ÷ a', d: 'The change from one number to another, and as a percentage of the first; of a cost and its price, the first is the markup and the margin ' +
                'the profit as a percentage of the price.',
                fields: [{ k: 'a', l: 'From', ph: '' }, { k: 'b', l: 'To', ph: '' }], cols: 2, run: runChange }
        ]
    };

    // a box for each coefficient, a of 1 and the others of 0 while they are empty
    function coefficients(letters) {
        return letters.split('').map(function (k, i) { return { k: k, l: k, ph: i ? '0' : '1', def: i ? 0 : 1 }; });
    }

    // a row of boxes for each equation: its coefficients and what it equals, each to be typed
    function system(n) {
        var out = [], i, j;
        for (i = 1; i <= n; i++) {
            for (j = 0; j <= n; j++) out.push({ k: 'abcd'.charAt(j) + i, l: 'abcd'.charAt(j) + '<sub>' + i + '</sub>', ph: '' });
        }
        return out;
    }

    // a random number from 0 to 1, from the browser's strong ones where it has them
    function chance() {
        var a = new Uint32Array(2);
        if (!window.crypto || !window.crypto.getRandomValues) return Math.random();
        window.crypto.getRandomValues(a);
        return (a[0] * 2097152 + (a[1] >>> 11)) / 9007199254740992; // 53 bits
    }

    function sigmaNote(n) {
        return !isNaN(n.sigma) && !(n.sigma > 0) ? 'σ is above 0.' : '';
    }

    // the chances of a count, its mean and standard deviation
    function chances(c, mean, sd, known) {
        return [{ l: 'P(X = k)', v: c.eq }, { l: 'P(X ≤ k)', v: c.le }, { l: 'P(X ≥ k)', v: c.ge },
            { l: 'Mean', v: known ? CalcMaths.round(mean) : NaN }, { l: 'σ', v: known ? CalcMaths.round(sd) : NaN }];
    }

    // x₁, x₂ …, or x alone; of another letter, y₁ …
    function rootName(i, n, letter) {
        return (letter || 'x') + (n > 1 ? '<sub>' + (i + 1) + '</sub>' : '');
    }

    // an exact form as it is shown: (1 – √5)/2, –1 + i√2
    function exactHtml(e) {
        return e.replace(/-/g, '–').replace(/√/g, '<span class="calc-sq">√</span>').replace(/i/g, '<i>i</i>');
    }

    // The exact forms of the roots that have one beyond a whole number, [name, form] each, as a
    // tile: x₁ = (1 – √5)/2, x₂ = (1 + √5)/2; none where none has
    function exactTile(forms) {
        var parts = forms.filter(function (f) { return f[1] && /[\/√πe]|ln/.test(f[1]); });
        return parts.length ? [{ l: 'Exact', text: parts.map(function (f) { return f[0] + ' = ' + exactHtml(f[1]); }).join(engine.comma ? '; ' : ', '), wide: true, wrap: true }] : [];
    }

    // -1 + 2i, 2i, -1, as a number is shown
    function complexText(z) {
        var im = Math.abs(z.im) === 1 ? '' : local(String(Math.abs(z.im)));
        if (!z.im) return local(String(z.re));
        return (z.re ? local(String(z.re)) + (z.im < 0 ? ' – ' : ' + ') : z.im < 0 ? '–' : '') + im + '<i>i</i>';
    }

    // What an equation or an inequality of x gives, find solve or inequality, between From and
    // To where both are typed: { r, ends: they were }, or { out: the tiles while there is none,
    // with why, example where it is not one }
    function lookFor(n, raw, find, none, example) {
        var ends = isFinite(n.from) && isFinite(n.to), r;
        if (!raw.eq) return { out: { rows: none } };
        if (ends && n.from >= n.to) return { out: { rows: none, note: 'From is less than To.', warn: true } };
        r = find(raw.eq, engine.comma, deg, ends ? n.from : NaN, ends ? n.to : NaN);
        if (r.error) {
            return { out: { rows: none, bad: ['eq'], warn: true, note: r.error === 'letters' ? 'Only x has a value here: write the other letters as numbers.' : example } };
        }
        return { r: r, ends: ends };
    }

    function runEquation(n, raw) {
        var none = [{ l: 'x', v: NaN }], found = lookFor(n, raw, function (text, comma, deg, from, to) { return CalcMaths.solve(text, comma, deg, from, to, true); }, none,
                'Not an equation of x yet: x^2 = 2x + 3, or one side alone, which is 0.'),
            r = found.r, ends = found.ends;
        if (found.out) return found.out;
        if (!r.roots.length) return { rows: none, note: ends ? 'No root between ' + local(String(n.from)) + ' and ' + local(String(n.to)) + '.' : 'No root found.' };
        return {
            rows: r.roots.map(function (x, i) { return { l: rootName(i, r.roots.length), v: x }; })
                .concat(exactTile(r.exact.map(function (e, i) { return [rootName(i, r.roots.length), e]; }))),
            note: r.more ? 'Of its many roots, the ' + r.roots.length + ' nearest 0: give From and To for others.' : ''
        };
    }

    // a number of an answer, as it is shown, ∞ as well
    function shown(x) {
        return x === Infinity ? '∞' : x === -Infinity ? '–∞' : local(String(x));
    }

    // Where an inequality holds: x < –2 or x > 2, and as intervals, (–∞, –2) ∪ (2, ∞); its ends to put in
    function runInequality(n, raw) {
        var none = [{ l: 'x', v: NaN, wide: true }], found = lookFor(n, raw, CalcMaths.inequality, none, 'Not an inequality of x yet: x^2 - 4 > 0, with <, >, <= or >=.'),
            r = found.r, ends = found.ends, words, sets, gap = engine.comma ? '; ' : ', ', all, far;
        if (found.out) return found.out;
        all = r.parts.length === 1 && r.parts[0].from === -Infinity && r.parts[0].to === Infinity;
        far = local(String(r.within).replace(/^1(0+)$/, function (m, z) { return '1e' + z.length; })); // 1e15
        far = r.within && (!r.parts.length || all) ? ' Looked for from –' + far + ' to ' + far + ': give From and To to look farther.' : '';
        words = r.parts.map(function (p) {
            if (p.from === p.to) return 'x = ' + shown(p.from);
            if (p.from === -Infinity && p.to === Infinity) return 'every x';
            if (p.from === -Infinity) return 'x ' + (p.toIn ? '≤' : '&lt;') + ' ' + shown(p.to);
            if (p.to === Infinity) return 'x ' + (p.fromIn ? '≥' : '&gt;') + ' ' + shown(p.from);
            return shown(p.from) + ' ' + (p.fromIn ? '≤' : '&lt;') + ' x ' + (p.toIn ? '≤' : '&lt;') + ' ' + shown(p.to);
        });
        sets = r.parts.map(function (p) {
            return p.from === p.to ? '{' + shown(p.from) + '}' : (p.fromIn ? '[' : '(') + shown(p.from) + gap + shown(p.to) + (p.toIn ? ']' : ')');
        });
        return {
            rows: [{ l: 'x', text: words.length ? words.join(' or ') : 'none', wide: true, wrap: true },
                { l: 'Intervals', text: sets.length ? sets.join(' ∪ ') : '∅', wide: true, wrap: true }]
                .concat(r.ends.map(function (x, i) { return { l: 'End ' + (i + 1), v: x }; })),
            note: !r.parts.length ? 'It holds for no x' + (ends ? ' between ' + shown(n.from) + ' and ' + shown(n.to) : '') + '.' + far :
                r.more ? 'Of its many ends, the ' + r.ends.length + ' nearest 0: give From and To for others.' : far.trim()
        };
    }

    // a value of a limit, ∞ as well
    function limitTile(l, v) {
        return isFinite(v) || isNaN(v) ? { l: l, v: v } : { l: l, text: shown(v) };
    }

    function runLimit(n, raw) {
        var f = toolFunction(raw), r = f.c && !isNaN(n.a) ? CalcMaths.limit(f.c, n.a, deg) : { left: NaN, right: NaN, value: NaN }, endless = !isFinite(n.a) && !isNaN(n.a);
        return {
            rows: [limitTile('Limit', r.value)].concat(endless ? [] : [limitTile('From below', r.left), limitTile('From above', r.right)]),
            bad: f.bad, warn: !!f.note,
            note: f.note || (!f.c || isNaN(n.a) || !isNaN(r.value) ? '' : !isNaN(r.left) && !isNaN(r.right) ? 'No limit: it comes to one value from below and another from above.' :
                'No limit: it does not settle' + (endless ? '.' : ', or has no values, by a.'))
        };
    }

    function runOde(n, raw) {
        var r = raw.f ? CalcMaths.ode(raw.f, engine.comma, deg, n.x0, n.y0, n.x) : { y: NaN, slope: NaN },
            why = { 'function': 'Not a function of x and y yet: x + y, x y, y^2.', letters: 'Only x and y have values here: write the other letters as numbers.' }[r.error];
        return {
            rows: [{ l: 'y(x)', v: r.error ? NaN : r.y }, { l: 'y′(x)', v: r.error ? NaN : r.slope }],
            bad: why ? ['f'] : [], warn: !!why || (raw.f && !r.error && isNaN(r.y) && [n.x0, n.y0, n.x].every(isFinite)),
            note: why || (raw.f && !r.error && isNaN(r.y) && [n.x0, n.y0, n.x].every(isFinite) ? 'No value: y grows without end, or has none, on the way.' : '')
        };
    }

    function runPoly(c) {
        var z = CalcMaths.poly(c), size = c.length - 1, rows, k;
        if (!z) {
            rows = [];
            for (k = 0; k < size; k++) rows.push({ l: rootName(k, size), v: NaN });
            return { rows: rows, note: c.every(isFinite) ? 'No x left: its coefficients of x are all 0.' : '', warn: c.every(isFinite) };
        }
        rows = z.map(function (r, i) { return r.im ? { l: rootName(i, z.length), text: complexText(r) } : { l: rootName(i, z.length), v: r.re }; });
        rows = rows.concat(exactTile((CalcMaths.exactRoots(c, z) || []).map(function (e, i) { return [rootName(i, z.length), e]; })));
        if (size === 2 && c[0]) {
            rows.push({ l: 'Discriminant', v: CalcMaths.round(c[1] * c[1] - 4 * c[0] * c[2]) },
                { l: 'Vertex x', v: CalcMaths.round(-c[1] / (2 * c[0])) }, { l: 'Vertex y', v: CalcMaths.round(c[2] - c[1] * c[1] / (4 * c[0])) });
        }
        return { rows: rows, note: z.length < size ? 'With a of 0, it is of a lower power.' : '' };
    }

    // a polynomial written out from its coefficients, the highest power first: x³ – 2x + 1
    function polyHtml(c) {
        var n = c.length - 1, out = '';
        c.forEach(function (a, k) {
            var p = n - k, size = Math.abs(a);
            if (!a) return;
            out += (out ? (a < 0 ? ' – ' : ' + ') : a < 0 ? '–' : '') + (size === 1 && p ? '' : local(String(size))) + (p ? 'x' + (p > 1 ? '<sup>' + p + '</sup>' : '') : '');
        });
        return out || '0';
    }

    function runPolynomial(n, raw) {
        var none = [{ l: 'x', v: NaN }], r = raw.p ? CalcMaths.polynomial(raw.p, engine.comma, deg) : null, out, why;
        if (!r) return { rows: none };
        why = {
            polynomial: 'Not a polynomial of x yet: x^5 - 3x + 1, (x - 1)(x + 2)^2, or its coefficients from the highest power, 1, 0, -2, 1.',
            letters: 'Only x has a value here: write the other letters as numbers.',
            power: 'Up to the power 30.'
        }[r.error];
        if (why) return { rows: none, bad: ['p'], warn: true, note: why };
        if (r.c.length < 2) return { rows: none, note: 'No x left: its coefficients of x are all 0.', warn: true };
        out = runPoly(r.c);
        out.rows.unshift({ l: 'Multiplied out', text: polyHtml(r.c), wide: true, wrap: true });
        return out;
    }

    // where two curves meet: an x and a y for each point, side by side
    function runCurves(n, raw) {
        var none = [{ l: 'x', v: NaN }, { l: 'y', v: NaN }], r, rows = [], forms = [];
        if (!raw.e1 || !raw.e2) return { rows: none, cols: 2 };
        r = CalcMaths.system2([raw.e1, raw.e2], engine.comma, deg, true);
        if (r.error) {
            return { rows: none, cols: 2, bad: [['e1', 'e2'][r.which]], warn: true,
                note: r.error === 'letters' ? 'Only x and y have values here: write the other letters as numbers.' : 'Not an equation of x and y yet: x^2 + y^2 = 25, y = 2x + 1.' };
        }
        if (r.many) return { rows: none, cols: 2, note: 'Many answers: the two hold together all along a curve, as one line written twice.' };
        r.points.forEach(function (p, i) {
            var x = rootName(i, r.points.length), y = rootName(i, r.points.length, 'y');
            rows.push({ l: x, v: p.x }, { l: y, v: p.y });
            forms.push([x, p.exact[0]], [y, p.exact[1]]);
        });
        return {
            rows: rows.length ? rows.concat(exactTile(forms)) : none, cols: 2,
            note: !rows.length ? 'No point found where both hold.' : r.more ? 'Of its many points, the ' + r.points.length + ' nearest 0.' : ''
        };
    }

    // the turning points, an x and its value side by side; between From and To the highest and lowest as well
    function runExtrema(n, raw) {
        var none = [{ l: 'x', v: NaN }, { l: 'y', v: NaN }], ends = isFinite(n.from) && isFinite(n.to), r, rows = [];
        if (!raw.f) return { rows: none, cols: 2 };
        if (ends && n.from >= n.to) return { rows: none, cols: 2, note: 'From is less than To.', warn: true };
        r = CalcMaths.extrema(raw.f, engine.comma, deg, ends ? n.from : NaN, ends ? n.to : NaN);
        if (r.error) {
            return { rows: none, cols: 2, bad: ['f'], warn: true,
                note: r.error === 'letters' ? 'Only x has a value here: write the other letters as numbers.' : 'Not a function of x yet: x^3 - 3x, x e^(-x).' };
        }
        r.points.forEach(function (p) {
            rows.push({ l: (p.max ? 'Max' : 'Min') + ' x', v: p.x }, { l: (p.max ? 'Max' : 'Min') + ' y', v: p.y });
        });
        if (r.top) rows.push({ l: 'Highest x', v: r.top.x }, { l: 'Highest y', v: r.top.y }, { l: 'Lowest x', v: r.bottom.x }, { l: 'Lowest y', v: r.bottom.y });
        return {
            rows: rows.length ? rows : none, cols: 2,
            note: !r.points.length ? 'No turning point ' + (ends ? 'between ' + shown(n.from) + ' and ' + shown(n.to) : 'found') + '.' :
                r.more ? 'Of its many turning points, the ' + r.points.length + ' nearest 0: give From and To for others.' : ''
        };
    }

    function runSystem(n, size) {
        var rows = [], r, k, names = ['x', 'y', 'z'], known = true, i, j;
        for (i = 1; i <= size; i++) {
            rows.push([]);
            for (j = 0; j <= size; j++) {
                rows[i - 1].push(n['abcd'.charAt(j) + i]);
                known = known && isFinite(n['abcd'.charAt(j) + i]);
            }
        }
        r = known ? CalcMaths.linear(rows) : null;
        rows = [];
        for (k = 0; k < size; k++) rows.push({ l: names[k], v: r && r.x ? r.x[k] : NaN });
        return { rows: rows, note: !r ? '' : r.none ? 'No answer: the equations cannot all hold.' : r.many ? 'Many answers: the equations do not each say something new.' : '' };
    }

    // the function of a box, marked where it is not one
    function toolFunction(raw) {
        var c = raw.f ? CalcMaths.fn(raw.f, engine.comma) : null;
        return { c: c, bad: raw.f && !c ? ['f'] : [], note: raw.f && !c ? 'Not a function of x yet: write x^2 for x², 2x for 2 × x; no letters but x.' : '' };
    }

    // An integral, with its exact form, as near as its 10 digits, and the average value of the
    // function between ends that are numbers
    function runIntegral(n, raw) {
        var f = toolFunction(raw), v = f.c ? CalcMaths.integral(f.c, n.a, n.b, deg) : NaN, ends = isFinite(n.a) && isFinite(n.b) && n.a !== n.b;
        return { rows: [{ l: '∫', v: v }, { l: 'Average', v: ends ? CalcMaths.round(v / (n.b - n.a)) : NaN }]
                .concat(exactTile([['∫', CalcMaths.exactOf(v, 1e-9, 'constants', 0, function () { return true; })]])),
            bad: f.bad, warn: !!f.note || (f.c && isNaN(v) && !isNaN(n.a) && !isNaN(n.b)),
            note: f.note || (f.c && isNaN(v) && !isNaN(n.a) && !isNaN(n.b) ? 'No value: the function has none on the way, or it does not settle.' : '') };
    }

    // y = m x + b, a line as it is shown, its numbers to 10 digits
    function lineText(m, b) {
        var num = function (v) { return local(String(+Math.abs(v).toPrecision(10))); };
        m = +m.toPrecision(10) + 0;
        b = +b.toPrecision(10) + 0;
        if (!m) return 'y = ' + (b < 0 ? '–' : '') + num(b);
        return 'y = ' + (m < 0 ? '–' : '') + (Math.abs(m) === 1 ? '' : num(m)) + 'x' + (b ? (b < 0 ? ' – ' : ' + ') + num(b) : '');
    }

    function runDerivative(n, raw) {
        var f = toolFunction(raw), s = f.c && isFinite(n.x) ? CalcMaths.slopes(f.c, n.x, deg) : [NaN, NaN], y = f.c && isFinite(n.x) ? f.c.at(n.x, deg, true) : NaN;
        return { rows: [{ l: 'f(x)', v: y }, { l: 'f′(x)', v: s[0] }, { l: 'f″(x)', v: s[1] },
                { l: 'Tangent', text: isFinite(y) && isFinite(s[0]) ? lineText(s[0], y - s[0] * n.x) : '–', wide: true }],
            bad: f.bad, note: f.note, warn: !!f.note };
    }

    // a Taylor series written out: x – x³/6 + x⁵/120, of (x – a) about a, each coefficient a
    // fraction where it is one
    function seriesHtml(coefs, a) {
        var base = a ? '(x ' + (a > 0 ? '– ' : '+ ') + local(String(Math.abs(a))) + ')' : 'x', out = '';
        coefs.forEach(function (c, k) {
            var f = CalcEngine.fraction(c), top = f ? Math.abs(f[0]) : Math.abs(c), power = k ? base + (k > 1 ? '<sup>' + k + '</sup>' : '') : '';
            if (!c) return;
            out += (out ? (c < 0 ? ' – ' : ' + ') : c < 0 ? '–' : '') + (top === 1 && k ? '' : local(String(top))) + power + (f ? '/' + f[1] : '');
        });
        return out || '0';
    }

    function runTaylor(n, raw) {
        var none = [{ l: 'Series', text: '–', wide: true }], r, why, rows;
        if (!raw.f) return { rows: none };
        r = CalcMaths.taylor(raw.f, engine.comma, deg, n.a, n.n);
        why = {
            'function': 'Not a function of x yet: sin(x), e^x, 1/(1 - x).',
            letters: 'Only x has a value here: write the other letters as numbers.',
            none: 'No series about a: it is not smooth there, as sqrt(x) at 0, or has no complex values, as abs(x) or floor(x).'
        }[r.error];
        if (why) return { rows: none, bad: r.error === 'none' ? [] : ['f'], warn: true, note: why };
        if (!r.coefs) return { rows: none, note: isFinite(n.a) ? 'The power is a whole number from 0 to 12.' : '', warn: isFinite(n.a) };
        rows = [{ l: 'Series', text: seriesHtml(r.coefs, n.a), wide: true, wrap: true }];
        r.coefs.forEach(function (c, k) { rows.push({ l: 'c<sub>' + k + '</sub>', v: c }); });
        return { rows: rows };
    }

    function runBetween(n, raw) {
        var none = [{ l: 'Area', v: NaN }, { l: '∫(f – g)', v: NaN }], r;
        if (!raw.f || !raw.g) return { rows: none };
        r = CalcMaths.between([raw.f, raw.g], engine.comma, deg, n.a, n.b);
        if (r.error) {
            return { rows: none, bad: [['f', 'g'][r.which]], warn: true,
                note: r.error === 'letters' ? 'Only x has a value here: write the other letters as numbers.' : 'Not a function of x yet: x^2, sin(x).' };
        }
        return {
            rows: [{ l: 'Area', v: r.area }, { l: '∫(f – g)', v: r.net }].concat(r.crossings.map(function (x, i) { return { l: 'Crossing ' + (i + 1), v: x }; })),
            warn: isNaN(r.area) && isFinite(n.a) && isFinite(n.b),
            note: isNaN(r.area) && isFinite(n.a) && isFinite(n.b) ? 'No value: a function has none on the way, or it does not settle.' : ''
        };
    }

    function runArc(n, raw) {
        var r = raw.f ? CalcMaths.arcLength(raw.f, engine.comma, deg, n.a, n.b) : { length: NaN }, why = {
            'function': 'Not a function of x yet: x^2, sin(x).',
            letters: 'Only x has a value here: write the other letters as numbers.'
        }[r.error];
        if (why) return { rows: [{ l: 'Length', v: NaN }], bad: ['f'], warn: true, note: why };
        return { rows: [{ l: 'Length', v: r.length }], warn: raw.f && isNaN(r.length) && isFinite(n.a) && isFinite(n.b),
            note: raw.f && isNaN(r.length) && isFinite(n.a) && isFinite(n.b) ? 'No value: it stands upright, or has a corner or no value, on the way.' : '' };
    }

    // the chances of a value below and above x, its density there, mean and standard deviation
    function spread(c, mean, sd, known) {
        return [{ l: 'P(X ≤ x)', v: c.lo }, { l: 'P(X ≥ x)', v: c.hi }, { l: 'f(x)', v: c.density },
            { l: 'Mean', v: known ? CalcMaths.round(mean) : NaN }, { l: 'σ', v: known ? CalcMaths.round(sd) : NaN }];
    }

    // what is wrong with degrees of freedom and a chance p, or ''
    function freedomNote(dfs, p) {
        if (dfs.some(function (d) { return !isNaN(d) && !(d > 0); })) return 'Degrees of freedom are above 0.';
        return !isNaN(p) && !(p > 0 && p < 1) ? 'p is a chance between 0 and 1.' : '';
    }

    function runStudent(n) {
        var c = CalcMaths.tDist(n.t, n.nu), why = freedomNote([n.nu], n.p);
        return { rows: [{ l: 'P(T ≤ t)', v: c.lo }, { l: 'P(T ≥ t)', v: c.hi }, { l: 'P(|T| ≥ |t|)', v: c.two },
            { l: 't for p', v: CalcMaths.tInverse(n.p, n.nu) }, { l: '±t for p', v: CalcMaths.tInverse(1 - (1 - n.p) / 2, n.nu) }], note: why, warn: !!why };
    }

    function runChi(n) {
        var c = CalcMaths.chiDist(n.x, n.k), why = freedomNote([n.k], n.p), known = n.k > 0;
        return { rows: [{ l: 'P(X ≤ x)', v: c.lo }, { l: 'P(X ≥ x)', v: c.hi }, { l: 'x for p', v: CalcMaths.chiInverse(n.p, n.k) },
            { l: 'Mean', v: known ? n.k : NaN }, { l: 'σ', v: known ? CalcMaths.round(Math.sqrt(2 * n.k)) : NaN }], note: why, warn: !!why };
    }

    function runF(n) {
        var c = CalcMaths.fDist(n.x, n.d1, n.d2), why = freedomNote([n.d1, n.d2], n.p);
        return { rows: [{ l: 'P(X ≤ x)', v: c.lo }, { l: 'P(X ≥ x)', v: c.hi }, { l: 'x for p', v: CalcMaths.fInverse(n.p, n.d1, n.d2) }], note: why, warn: !!why };
    }

    // A sum or a product, on to ∞ as well, with its exact form, π²/6, and what it does where it
    // has no value
    function runSeries(n, raw, product) {
        var r = raw.f ? CalcMaths.series(raw.f, engine.comma, deg, n.a, n.b, product) : { value: NaN }, name = product ? 'Π' : 'Σ', why = {
            'function': 'Not a function yet: write n^2 for n², 1/k! for 1 ÷ k!.',
            letters: 'Of one letter: n, k, i or j, or x.',
            ends: 'From and To are whole numbers, From the smaller; To may be inf.',
            many: 'Up to a million terms, or To inf.'
        }[r.error], endless = n.b === Infinity && raw.f && !r.error;
        if (endless && !isFinite(r.value)) {
            why = isNaN(r.value) ? 'No value: it does not settle, as its terms go on back and forth or shrink too slowly to tell.' : 'It grows without end.';
        }
        return { rows: [limitTile(name, r.error ? NaN : r.value)].concat(exactTile([[name, r.exact]])),
            bad: r.error === 'function' || r.error === 'letters' ? ['f'] : [], note: why || '', warn: !!why && !(endless && Math.abs(r.value) === Infinity) };
    }

    // ---------------- money ---------------- //

    var SIGNS = 'Money received is above 0, money paid below 0: a loan of 200000 is PV = 200000, its PMT below 0.';

    // Time value of money: the one of N, I/Y, PV, PMT and FV left empty, its tile first, then all
    // the money paid and the interest, paid or earned; or what is wrong, said
    function runTvm(n, raw) {
        var keys = ['n', 'iy', 'pv', 'pmt', 'fv'], names = { n: 'N', iy: 'I/Y %', pv: 'PV', pmt: 'PMT', fv: 'FV' },
            empty = keys.filter(function (k) { return !raw[k]; }), none = [{ l: empty.length === 1 ? names[empty[0]] : 'N, I/Y, PV, PMT or FV', v: NaN, wide: empty.length !== 1 }], r, why, part;
        if (keys.some(function (k) { return raw[k] && isNaN(n[k]); }) || (raw.py && isNaN(n.py))) return { rows: none }; // its box is marked
        if (empty.length !== 1) {
            return { rows: none, warn: !empty.length,
                note: (empty.length ? 'Leave only one of N, I/Y, PV, PMT and FV empty, the one to work out. ' : 'Leave one of N, I/Y, PV, PMT and FV empty, the one to work out. ') + SIGNS };
        }
        r = CalcMaths.tvm({ n: n.n, iy: n.iy, pv: n.pv, pmt: n.pmt, fv: n.fv, py: n.py, start: raw.due === '1' });
        why = {
            py: 'P/Y, the payments a year, is above 0.',
            rate: 'The rate a period, I/Y ÷ P/Y, is above –100%.',
            n: 'N, the payments, is above 0.',
            none: 'No ' + names[empty[0]] + ' makes the money balance: ' + (empty[0] === 'n' ? 'the payments never bring PV to FV at this rate. ' : 'money received and money paid need opposite signs. ') + SIGNS,
            large: 'Too large a number to show.'
        }[r.error];
        if (why) return { rows: none, warn: true, note: why };
        part = (empty[0] === 'n' ? r.n : n.n) % 1;
        return {
            rows: [{ l: names[r.find], v: r.value, places: /^(pv|pmt|fv)$/.test(r.find) ? 2 : undefined }, { l: 'Total paid', v: r.paid, places: 2 },
                { l: r.net < 0 ? 'Interest paid' : r.net > 0 ? 'Interest earned' : 'Interest', v: CalcMaths.round(Math.abs(r.net)), places: 2 }],
            note: SIGNS + (part > 1e-9 && part < 1 - 1e-9 ? ' N is not a whole number of payments: a last, smaller one makes up the part.' : '')
        };
    }

    // NPV at the rate, IRR and the payback of cash flows typed as a list is
    function runNpv(n, raw) {
        var read = raw.cf ? CalcEngine.numbers(raw.cf, engine.comma, 'auto') : { values: [], bad: [] }, flows = read.values,
            none = [{ l: 'NPV', v: NaN }, { l: 'IRR %', v: NaN }, { l: 'Payback', v: NaN }], r, back, notes = [];
        if (read.bad.length) return { rows: none, bad: ['cf'], warn: true, note: read.bad[0] + ' is not a number: type the cash flows one to a line, or apart by spaces or ' + (engine.comma ? 'semicolons.' : 'commas.') };
        if (flows.length < 2) return { rows: none, note: raw.cf ? 'Two cash flows or more: the first at the start, then one a period.' : '' };
        if (flows.length > 1000) return { rows: none, bad: ['cf'], warn: true, note: 'Up to 1000 cash flows.' };
        r = CalcMaths.irr(flows);
        back = CalcMaths.payback(flows);
        if (isFinite(n.r) && !(n.r > -100)) notes.push('The rate is above –100%.');
        if (!r.changes) notes.push('No IRR: the flows never change sign, so no rate makes their NPV 0.');
        else if (isNaN(r.irr)) notes.push('No IRR found from –99.99% to 1000000%.');
        else if (r.changes > 1) notes.push('The flows change sign ' + r.changes + ' times, so there may be more than one IRR' + (r.others.length ? ': this one is the nearest 10%, and ' +
            r.others.map(function (x) { return local(String(x)) + '%'; }).join(', ') + (r.others.length > 1 ? ' are others.' : ' is another.') : '; this one is the nearest 10%.'));
        if (isNaN(back) && flows[0] < 0) notes.push('They never pay back what went out.');
        return {
            rows: [{ l: 'NPV', v: CalcMaths.npv(n.r, flows), places: 2 }, { l: 'IRR %', v: r.irr }, { l: 'Payback', v: back }],
            warn: !!notes.length && (!(n.r > -100) || !r.changes), note: notes.join(' ')
        };
    }

    var SCHEDULE_ROWS = 600; // a table of more payments shows the first of them

    // a loan's payment, its interest and a table of its years or of its payments
    function runSchedule(n, raw) {
        var none = [{ l: 'Payment', v: NaN }, { l: 'Total interest', v: NaN }, { l: 'Total paid', v: NaN }], by = raw.by === '1', r, why;
        if (!raw.loan || !raw.rate || !raw.years || [n.loan, n.rate, n.years, n.py].some(isNaN)) {
            return { rows: none, warn: raw.loan && n.loan <= 0, note: raw.loan && n.loan <= 0 ? 'The loan is above 0.' : '' };
        }
        r = CalcMaths.amortize(n.loan, n.rate, n.years, n.py, SCHEDULE_ROWS);
        why = {
            loan: 'The loan is above 0.',
            years: 'Years are above 0.',
            py: 'Payments a year are above 0.',
            rate: 'The rate a period, the rate a year ÷ payments a year, is above –100%.',
            whole: 'Years × payments a year is a whole number of payments.',
            long: 'Up to 100000 payments.'
        }[r.error];
        if (why) return { rows: none, warn: true, note: why };
        return {
            rows: [{ l: 'Payment', v: r.payment, places: 2 }, { l: 'Total interest', v: r.interest, places: 2 }, { l: 'Total paid', v: CalcMaths.round(n.loan + r.interest), places: 2 },
                { l: by ? 'Each payment' : 'Each year', m: by ? r.byPayment : r.byYear, head: [by ? 'No.' : 'Year', 'Interest', 'Principal', 'Balance'], places: 2 }],
            note: (r.n === 1 ? '1 payment' : r.n + ' payments') + ', each at the end of its period.' +
                (r.more ? ' The table has the first ' + SCHEDULE_ROWS + (by ? ' payments: By year has them all.' : ' years.') : '')
        };
    }

    // money saved: what it grows to, all put in, the interest and a table of its years
    function runSavings(n, raw) {
        var none = [{ l: 'Balance', v: NaN }, { l: 'Put in', v: NaN }, { l: 'Interest', v: NaN }], r, why;
        if (!raw.start || !raw.rate || !raw.years || [n.start, n.rate, n.years, n.m, n.add].some(isNaN)) return { rows: none };
        r = CalcMaths.savings(n.start, n.rate, n.years, n.m, n.add, raw.due === '1', SCHEDULE_ROWS);
        why = {
            money: 'Start and Add are 0 or more.',
            years: 'Years are above 0.',
            m: 'm, the periods a year, is above 0.',
            add: 'Nothing is added with interest all the time: m is a number for that.',
            rate: 'The rate a period, the rate a year ÷ m, is above –100%.',
            whole: 'Years × m is a whole number of periods.',
            long: 'Up to 100000 periods.'
        }[r.error];
        if (why) return { rows: none, warn: true, note: why };
        return {
            rows: [{ l: 'Balance', v: r.balance, places: 2 }, { l: 'Put in', v: r.added, places: 2 }, { l: 'Interest', v: r.interest, places: 2 }, { l: 'APY %', v: r.apy },
                { l: 'Each year', m: r.byYear, head: ['Year', 'Put in', 'Interest', 'Balance'], places: 2 }],
            note: (n.m === Infinity ? 'Interest all the time.' : 'Interest ' + local(String(n.m)) + ' times a year' + (n.add ? ', ' + local(String(n.add)) + ' added at the ' + (raw.due === '1' ? 'start' : 'end') + ' of each period.' : '.')) +
                (r.more ? ' The table has the first ' + SCHEDULE_ROWS + ' years.' : '')
        };
    }

    // a bond's price of its yield, or its yield of its price, with what more it has
    function runBond(n, raw) {
        var none = [{ l: raw.price && !raw.yld ? 'Yield %' : 'Price', v: NaN }], r, why;
        if (raw.price && raw.yld) return { rows: none, warn: true, note: 'Leave one of Price and Yield empty, the one to work out.' };
        if (!raw.coupon || !raw.years || (!raw.price && !raw.yld) || [n.face, n.coupon, n.years, n.freq].some(isNaN) || (raw.price && isNaN(n.price)) || (raw.yld && isNaN(n.yld))) {
            return { rows: none };
        }
        r = CalcMaths.bond(n.face, n.coupon, n.years, n.freq, raw.price ? n.price : NaN, raw.yld ? n.yld : NaN);
        why = {
            face: 'The face value is above 0.',
            coupon: 'The coupon is 0% or more.',
            years: 'Years are above 0.',
            freq: 'Coupons a year are a whole number from 1 to 12.',
            yield: 'The yield a period, the yield a year ÷ coupons a year, is above –100%.',
            price: 'The price is above 0, of a yield a period above –99.99%.',
            long: 'Up to 100000 coupons.'
        }[r.error];
        if (why) return { rows: none, warn: true, note: why };
        return {
            rows: (raw.price ? [{ l: 'Yield %', v: r.yld }, { l: 'Price', v: r.price, places: 2 }] : [{ l: 'Price', v: r.price, places: 2 }, { l: 'Yield %', v: r.yld }])
                .concat([{ l: 'Current yield %', v: r.current }, { l: 'Duration', v: r.duration }, { l: 'Modified duration', v: r.modified }],
                    r.accrued ? [{ l: 'Accrued', v: r.accrued, places: 2 }, { l: 'Dirty price', v: r.dirty, places: 2 }] : []),
            note: 'Duration in years, Macaulay\'s; the modified one is how much the price falls, as a percentage, for each 1% more yield.' +
                (r.accrued ? ' The next coupon is nearer than a whole period: the price is without the interest earned since the last one, the dirty price with it.' : '')
        };
    }

    // what an asset loses each year, by the straight line or the declining balance
    function runDepreciation(n, raw) {
        var none = [{ l: 'First year', v: NaN }, { l: 'A year %', v: NaN }, { l: 'In all', v: NaN }], r, why;
        if (!raw.cost || !raw.life || [n.cost, n.salvage, n.life].some(isNaN)) return { rows: none };
        r = CalcMaths.depreciation(n.cost, n.salvage, n.life, raw.way === '1');
        why = {
            cost: 'The cost is above 0.',
            salvage: 'The salvage value is 0 or more, and no more than the cost.',
            life: 'Years are a whole number from 1 to 1000.'
        }[r.error];
        if (why) return { rows: none, warn: true, note: why };
        return {
            rows: [{ l: 'First year', v: r.first, places: 2 }, { l: 'A year %', v: r.rate }, { l: 'In all', v: CalcMaths.round(n.cost - n.salvage), places: 2 },
                { l: 'Each year', m: r.byYear, head: ['Year', 'Depreciation', 'So far', 'Book value'], places: 2 }],
            note: raw.way === '1' ? 'Each year ' + local(String(r.rate)) + '% of what is left, until the straight line over the years left loses more; never below the salvage value.' :
                'The same each year: the cost less the salvage value, over the years.'
        };
    }

    // how many must be sold to cover the fixed costs and the profit
    function runBreakEven(n, raw) {
        var none = [{ l: 'Units', v: NaN }, { l: 'Sales', v: NaN }, { l: 'Margin each', v: NaN }], r;
        if (!raw.fixed || !raw.price || !raw.cost || [n.fixed, n.price, n.cost, n.profit].some(isNaN)) return { rows: none };
        r = CalcMaths.breakEven(n.fixed, n.price, n.cost, n.profit);
        if (r.error) return { rows: none, warn: true, note: 'The price is above the cost of each one, or no number of them is enough.' };
        return {
            rows: [{ l: 'Units', v: r.units }, { l: 'Sales', v: r.sales, places: 2 }, { l: 'Margin each', v: r.margin, places: 2 }, { l: 'Margin %', v: r.percent }],
            note: r.units > 0 && r.units % 1 ? local(String(Math.ceil(r.units - 1e-9))) + ' whole units cover them.' : ''
        };
    }

    // an amount brought on by inflation, and back
    function runInflation(n, raw) {
        var none = [{ l: 'Costs then', v: NaN }, { l: 'Worth now', v: NaN }, { l: 'Prices ×', v: NaN }], r;
        if (!raw.amount || !raw.rate || !raw.years || [n.amount, n.rate, n.years].some(isNaN)) return { rows: none };
        r = CalcMaths.inflation(n.amount, n.rate, n.years);
        if (r.error) return { rows: none, warn: true, note: 'The rate is above –100%.' };
        return {
            rows: [{ l: 'Costs then', v: r.then, places: 2 }, { l: 'Worth now', v: r.now, places: 2 }, { l: 'Prices ×', v: r.factor }, { l: 'Value lost %', v: r.lost }],
            note: 'What costs the amount now costs Costs then after the years; the amount then is worth Worth now in money of today.'
        };
    }

    // the change from a to b, and as percentages
    function runChange(n, raw) {
        var r;
        if (!raw.a || !raw.b || isNaN(n.a) || isNaN(n.b)) return { rows: [{ l: 'Change', v: NaN }, { l: 'Change %', v: NaN }, { l: 'Margin %', v: NaN }] };
        r = CalcMaths.percentChange(n.a, n.b);
        return {
            rows: [{ l: 'Change', v: r.change }, { l: 'Change %', v: r.percent }, { l: 'Margin %', v: r.margin }, { l: 'To ÷ From', v: r.ratio }],
            note: !n.a ? 'No percentage of a From of 0.' : 'Of a cost and its price, Change % is the markup, and Margin % the profit as a percentage of the price.'
        };
    }

    // APR to APY, or back, of m periods a year, and the rate a period
    function runRates(n, raw) {
        var none = [{ l: 'APR %', v: NaN }, { l: 'APY %', v: NaN }, { l: 'A period %', v: NaN }], apr, apy;
        if (raw.apr && raw.apy) return { rows: none, warn: true, note: 'Leave one of APR and APY empty, the one to work out.' };
        if ((!raw.apr && !raw.apy) || isNaN(n.m) || (raw.apr && isNaN(n.apr)) || (raw.apy && isNaN(n.apy))) return { rows: none };
        if (!(n.m > 0)) return { rows: none, warn: true, note: 'm, the periods a year, is above 0.' };
        apr = raw.apr ? n.apr : CalcMaths.nominalRate(n.apy, n.m);
        apy = raw.apy ? n.apy : CalcMaths.effectiveRate(n.apr, n.m);
        if (isNaN(apr) || isNaN(apy)) return { rows: none, warn: true, note: raw.apr ? 'The rate a period, APR ÷ m, is above –100%.' : 'APY is above –100%.' };
        return {
            rows: [{ l: 'APR %', v: apr }, { l: 'APY %', v: apy }, { l: 'A period %', v: n.m === Infinity ? NaN : CalcMaths.round(apr / n.m) }],
            note: n.m === Infinity ? 'Interest all the time: APY is e to the APR, less 1.' : 'Interest ' + local(String(n.m)) + ' times a year, of APR ÷ m each time.'
        };
    }

    // ---------------- numbers ---------------- //

    // Matrices, complex numbers, whole numbers in bits and their bases, and whole numbers'
    // factors and numbers rounded, a tab each, with cards as the solver has. A matrix has a box
    // for each number, as many as its size says
    var NUMBER_TOOLS = {
        matrix: [
            { id: 'matrix', t: 'A matrix', f: ['det A', 'A<sup>–1</sup>', 'A<sup>T</sup>', 'A<sup>n</sup>'], d: 'Its determinant, rank, inverse, transpose and its power n, a whole number, below 0 of its inverse. Type its size, 3×3 or 2 3, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                fields: function (raw) {
                    return [{ k: 'size', l: 'Size', ph: '2×2', text: true, shape: true }, { k: 'power', l: 'n', ph: '2', def: 2 }].concat(cells('a', 'A', raw.size));
                }, cols: 2, run: runMatrix,
                example: { size: '3×3', power: '2', a11: '4', a12: '7', a13: '2', a21: '3', a22: '6', a23: '1', a31: '2', a32: '5', a33: '3' } },
            { id: 'rref', t: 'Row reduce', f: ['rref A', 'null space'], d: 'Its rows reduced as far as they go, its reduced row echelon form, its rank and the columns of its first 1s, and its null space: a basis of the vectors it takes to 0. Type its size, 3×3 or 2 3, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                fields: function (raw) { return [{ k: 'size', l: 'Size', ph: '3×3', text: true, shape: true }].concat(cells('a', 'A', raw.size || '3')); }, run: runRref,
                example: { size: '3×3', a11: '1', a12: '2', a13: '3', a21: '4', a22: '5', a23: '6', a31: '7', a32: '8', a33: '9' } },
            { id: 'matrices', t: 'Two matrices', f: ['A + B', 'A × B'], d: 'The sum, difference and products of two matrices, where their sizes allow. Type each size, 3×3 or 2 3, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                fields: function (raw) {
                    return [{ k: 'sizeA', l: 'Size of A', ph: '2×2', text: true, shape: true }, { k: 'sizeB', l: 'Size of B', ph: '2×2', text: true, shape: true }]
                        .concat(cells('a', 'A', raw.sizeA, 'sizeA'), cells('b', 'B', raw.sizeB, 'sizeB'));
                }, cols: 2, run: runMatrices,
                example: { sizeA: '2×3', sizeB: '3×2', a11: '1', a12: '2', a13: '3', a21: '4', a22: '5', a23: '6', b11: '7', b12: '8', b21: '9', b22: '10', b31: '11', b32: '12' } },
            { id: 'eigen', t: 'Eigenvalues', f: 'A<b>v</b> = λ<b>v</b>', d: 'The eigenvalues of a square matrix, real or a ± bi, its characteristic polynomial and trace, and the eigenvectors of each real eigenvalue: the v that A only stretches, by λ. Type its size, 3×3 or 3, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                fields: function (raw) { return [{ k: 'size', l: 'Size', ph: '2×2', text: true, shape: true }].concat(cells('a', 'A', raw.size)); }, run: runEigen,
                example: { size: '3×3', a11: '2', a12: '-1', a13: '0', a21: '-1', a22: '2', a23: '-1', a31: '0', a32: '-1', a33: '2' } },
            { id: 'axb', t: 'A x = b', f: 'A<b>x</b> = <b>b</b>', d: 'The unknowns of linear equations, up to ten of them: a row of A for each equation and what it equals in b. As many equations as rows, as many unknowns as columns. Where they have many answers, all of them, x = p + t v; where they have none, the nearest, by least squares. Type the size of A, 3×3 or 3 2, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                fields: function (raw) {
                    var size = sizeOf(raw.size) || [2, 2], out = [{ k: 'size', l: 'Size of A', ph: '2×2', text: true, shape: true }, { head: 'A | b', cols: size[1] + 1 }], i, j;
                    for (i = 1; i <= size[0]; i++) {
                        for (j = 1; j <= size[1]; j++) out.push({ k: 'a' + i + j, ph: '0', def: 0, aria: 'A row ' + i + ' column ' + j, cell: { g: 'ab', s: 'size', i: i, j: j, n: size } });
                        out.push({ k: 'b' + i + '1', ph: '0', def: 0, aria: 'b row ' + i, cls: 'calc-sv-rhs', cell: { g: 'ab', s: 'size', i: i, j: j, n: size } });
                    }
                    return out;
                }, run: runAxb,
                example: { size: '3×3', a11: '1', a12: '1', a13: '1', a21: '0', a22: '2', a23: '5', a31: '2', a32: '5', a33: '-1', b11: '6', b21: '-4', b31: '27' } },
            { id: 'lu', t: 'LU and QR', f: ['P A = L U', 'A = Q R'], d: 'A matrix as products: P A = L U, L below its diagonal with 1s on it and U above it, P the rows changed round; and A = Q R, the columns of Q of length 1 and at right angles, R above its diagonal. Type its size, 3×3 or 3 2, up to 10×10, and a number in each box, or paste a whole matrix into one, from a spreadsheet or as [1 2; 3 4]; an empty one is 0.',
                fields: function (raw) { return [{ k: 'size', l: 'Size', ph: '2×2', text: true, shape: true }].concat(cells('a', 'A', raw.size)); }, run: runLu,
                example: { size: '3×3', a11: '2', a12: '1', a13: '1', a21: '4', a22: '-6', a23: '0', a31: '-2', a32: '7', a33: '2' } },
            { id: 'vectors', t: 'Vectors', f: ['<b>u</b> · <b>v</b>', '<b>u</b> × <b>v</b>'], d: 'Of two vectors of 2, 3 or 4 numbers, typed 1, 2, 3: their dot product, cross product, lengths and the angle between them, the projection of u on v, and u of length 1.',
                fields: [{ k: 'u', l: 'u', ph: '1, 2, 3', fn: true }, { k: 'v', l: 'v', ph: '4, 5, 6', fn: true }], run: runVectors }
        ],
        complex: [
            { id: 'complex', t: 'Complex number', f: ['a + b<i>i</i>', 'r∠θ'], d: 'Work out a complex number: (2 + 3i)(1 – i), sqrt(-4), e^(iπ), or 2∠30 in polar form. Its real and imaginary parts, its length, angle and conjugate, and it as r e^(iθ).',
                fields: [{ k: 'z', ph: '(2 + 3i)(1 - i)', fn: true }], run: runComplex },
            { id: 'croots', t: 'Roots of a complex number', f: 'z<sup>1/n</sup>', d: 'The n n-th roots of a complex number: the cube roots of 1, the fourth roots of -16.',
                fields: [{ k: 'z', ph: '-16', fn: true }, { k: 'n', l: 'n', ph: '4', def: 4 }], run: runRoots },
            { id: 'cpoly', t: 'Polynomial roots', f: 'x<sup>2</sup> + (1 + <i>i</i>)x + 2<i>i</i>', d: 'Every root of a polynomial of complex coefficients, of any power up to 30: typed, x^2 + (1 + i)x + 2i, or its coefficients from the highest power, 1, 1 + i, 2i.',
                fields: [{ k: 'p', ph: 'x^2 + (1 + i)x + 2i', fn: true }], run: runCpoly },
            { id: 'impedance', t: 'AC impedance', f: 'Z = R + <i>i</i>(ωL – 1/ωC)', d: 'The impedance of a resistor, a coil and a capacitor at a frequency, in series or side by side: Z as a + bi, its size and phase, the reactance of the coil and of the capacitor, and the frequency where they cancel. Leave out any of R, L and C; a value may have a prefix, 4.7k, 10m, 100µ or 1e-6.',
                fields: [{ k: 'r', l: 'R, Ω', ph: '100', text: true }, { k: 'l', l: 'L, H', ph: '0.1', text: true }, { k: 'c', l: 'C, F', ph: '10µ', text: true },
                    { k: 'f', l: 'f, Hz', ph: '50', text: true }, { k: 'circuit', l: 'Circuit', choice: ['Series', 'Parallel'] }], cols: 2, run: runImpedance,
                example: { r: '100', l: '0.1', c: '10µ', f: '50' } }
        ],
        computer: [
            { id: 'bits', t: 'Bases', f: '0xFF AND 0b1010', d: 'Whole numbers as a computer keeps them, in 8, 16, 32, 64 or 128 bits: decimal, 0x hexadecimal, 0b binary or 0o octal, with + – × ÷ mod AND OR XOR NOT NAND NOR XNOR, &lt;&lt; &gt;&gt; and ROL ROR, which turn the bits round. Each result in every base, and its bytes big-endian and little-endian, and swapped.',
                fields: [{ k: 'e', ph: '0xFF AND 0b1010', fn: true }, { k: 'bits', l: 'Bits', choice: ['8', '16', '32', '64', '128'], at: 2 }], run: runBits },
            { id: 'bitview', t: 'Bits', f: 'b<sub>7</sub> … b<sub>1</sub> b<sub>0</sub>', d: 'The bits of a whole number, each turned over with a click; how many are 1, the 0s before and after them, and the highest and lowest bit that is 1. Empty, it is 0, to click a number together.',
                fields: [{ k: 'e', ph: '0', fn: true }, { k: 'bits', l: 'Bits', choice: ['8', '16', '32', '64', '128'], at: 2 }], run: runBitView },
            { id: 'float', t: 'IEEE 754', f: '0.1 = 0x3FB999999999999A', d: 'A number as a computer keeps it: a double of 64 bits and a float of 32, in hexadecimal; its sign, exponent and fraction; the number it is, to its last digit, and the gap to the next. Or the bits, 0x3FB999999999999A, for the number.',
                fields: [{ k: 'x', ph: '0.1', fn: true }], run: runFloat },
            { id: 'anybase', t: 'Any base', f: 'FF.8<sub>16</sub> = 11111111.1<sub>2</sub>', d: 'A number in any base from 2 to 36 written in another, the digits after its point as well: 0.1 in base 10 is 0.0(0011) in base 2, the part in brackets coming again and again. A part in brackets may be typed too.',
                fields: [{ k: 'x', ph: '0.1', fn: true }, { k: 'from', l: 'From base', ph: '10', def: 10 }, { k: 'to', l: 'To base', ph: '2', def: 2 }], cols: 2, run: runAnyBase },
            { id: 'codes', t: 'Text and codes', f: 'é = U+00E9 = C3 A9', d: 'The codes of a text: its code points, its bytes in UTF-8 and its units of UTF-16. Or a text from its codes: U+00E9, 0xC3 0xA9 for the bytes of UTF-8, or 233.',
                fields: [{ k: 't', l: 'Text', ph: 'Hé', fn: true }, { k: 'c', l: 'Codes', ph: 'U+0048 U+00E9', fn: true }], spaces: ['t'], run: runCodes },
            { id: 'subnet', t: 'IP subnet', f: ['192.168.1.0/24', '2001:db8::/32'], d: 'The network of an IPv4 address with its prefix, 192.168.1.10/24, or its mask, 192.168.1.10 255.255.255.0: its network and broadcast addresses, its mask, the first and last host and how many hosts it has. Or of an IPv6 address, 2001:db8::1/48: its network, the address in full and written short, its first and last address, how many addresses and /64 networks, its kind and its name for reverse DNS.',
                fields: [{ k: 'ip', ph: '192.168.1.10/24 or 2001:db8::1/48', fn: true }], run: runSubnet },
            { id: 'uuid', t: 'UUID', f: ['Version 4', 'Version 7'], d: 'Five new UUIDs, of RFC 9562: of version 4, all random, or of version 7, the time now and then random, so they sort as they were made. Again for five more; Copy copies one. ' +
                'Or one typed, with hyphens or none, in braces or after urn:uuid: if you like: its version and variant, the time it was made, of versions 1, 6 and 7, and it in hexadecimal, Base64 and as a whole number.',
                fields: [{ k: 'ver', l: 'New', choice: ['Version 4', 'Version 7'] }, { k: 'u', l: 'Read', ph: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', fn: true }], again: true, run: runUuid },
            { id: 'base64', t: 'Base32, 58, 64 and 85', f: 'Hé = SMOp', d: 'A text\'s bytes of UTF-8 written in letters: Base32, of A–Z and 2–7, as the secrets of two-step sign-in are; Base58, as Bitcoin addresses are, no 0, O, I or l; Base64, and that of web addresses and file names, with - and _ and no =; or Base85, Ascii85 as in PDF. Or the text, and the bytes, of what is so written.',
                fields: [{ k: 't', l: 'Text', ph: 'Hé', fn: true }, { k: 'b', l: 'Encoded', ph: 'SMOp', fn: true }, { k: 'enc', l: 'In', choice: ['Base32', 'Base58', 'Base64', 'Base85'], at: 2 }],
                spaces: ['t'], run: runBase64 },
            { id: 'hash', t: 'Hashes', f: 'abc = ba7816bf…', d: 'The hashes of a text\'s bytes of UTF-8, as a download\'s checksum is given: MD5, SHA-1, SHA-256 and SHA-512 in hexadecimal, SHA-256 in Base64 as the integrity of a script on a web page has it, and CRC-32, as zip and PNG have it. A hash pasted to check is matched against them. MD5 and SHA-1 are broken: for checking a file alone, never for passwords.',
                fields: [{ k: 't', l: 'Text', ph: 'abc', fn: true }, { k: 'h', l: 'Check', ph: 'ba7816bf…', fn: true }], spaces: ['t'], run: runHash }
        ],
        whole: [
            { id: 'factors', t: 'Prime factors', f: '360 = 2<sup>3</sup> × 3<sup>2</sup> × 5', d: 'A whole number of up to 20 digits in its prime factors, whether it is prime, and its divisors: how many, their sum, each of them, and how many numbers up to it have none of its factors.',
                fields: [{ k: 'n', ph: '360', fn: true }], run: runFactors },
            { id: 'gcd', t: 'GCD and LCM', f: 'gcd(12, 18, 30)', d: 'The greatest common divisor and least common multiple of two whole numbers or more, typed with commas or spaces between them.',
                fields: [{ k: 'list', ph: '12, 18, 30', fn: true }], run: runGcd },
            { id: 'modular', t: 'Modular arithmetic', f: ['a<sup>b</sup> mod m', 'a<sup>–1</sup>', 'a x ≡ b'], d: 'Of whole numbers a, b and m, of up to 200 digits: a mod m, a to the power b mod m, the inverse of a mod m, and every x of a x ≡ b (mod m).',
                fields: [{ k: 'a', l: 'a', ph: '3', fn: true }, { k: 'b', l: 'b', ph: '4', fn: true }, { k: 'm', l: 'm', ph: '7', fn: true }], run: runModular },
            { id: 'crt', t: 'Chinese remainder', f: ['x ≡ 2 (mod 3)', 'x ≡ 3 (mod 5)'], d: 'The x of x ≡ r (mod m) for each of a list, typed 2 mod 3, 3 mod 5, 2 mod 7, the moduli with a factor in common as well: x and the modulus all of them make.',
                fields: [{ k: 'list', ph: '2 mod 3, 3 mod 5, 2 mod 7', fn: true }], run: runChinese },
            { id: 'exact', t: 'Exactly', f: ['100!', '2<sup>200</sup>', '50 nCr 25'], d: 'A calculation of whole numbers and fractions worked out exactly, to every digit, up to 20000: + – × ÷, ^, n!, nCr and nPr, or C(n, k), P(n, k) and fib(n). A fraction stays one, 1/3 + 1/6 is 1/2.',
                fields: [{ k: 'e', ph: '100!', fn: true }], run: runExact },
            { id: 'primes', t: 'Primes', f: ['p<sub>n</sub>', 'π(n)', 'next and previous'], d: 'Whether a whole number of up to 24 digits is prime, the primes before and after it, and up to 10 million how many primes there are up to it, π(n), and the n-th prime.',
                fields: [{ k: 'n', ph: '100', fn: true }], run: runPrimes },
            { id: 'between', t: 'Primes between', f: 'the primes from a to b', d: 'The primes from a to b, both in: how many and each of them, b up to 10¹⁴ and the two up to 10 million apart.',
                fields: [{ k: 'a', l: 'From', ph: '1', fn: true }, { k: 'b', l: 'To', ph: '100', fn: true }], run: runBetween2 },
            { id: 'fraction', t: 'Fraction and decimal', f: '0.1(6) = 1/6', d: 'A fraction, 22/7, a decimal, 0.125, or one whose last digits come again and again in brackets, 0.1(6): as a fraction, a mixed number, a decimal with the part that comes again in brackets, and a continued fraction. A calculation, pi, as near as its digits tell.',
                fields: [{ k: 'x', ph: '0.1(6)', fn: true }], run: runFraction },
            { id: 'round', t: 'Round', f: ['⌊x⌋', '⌈x⌉', 'x to d places'], d: 'A number rounded to d decimal places, half away from 0, down, up and toward 0; its fraction part, and the number to d significant figures. Places below 0 round to tens, hundreds …',
                fields: [{ k: 'x', l: 'x', ph: '3.14159' }, { k: 'd', l: 'Places', ph: '0', def: 0 }], cols: 2, run: runRound }
        ]
    };

    // the rows and columns of a size typed: 3×3, 2 3, 2x3, 2,3, or 3 for a square; [2, 2] while
    // empty; null for a size that is not one, of more than 10 or fewer than 1
    function sizeOf(text) {
        var m = /^\s*([1-9]|10)\s*(?:[x×*,\s]\s*([1-9]|10))?\s*$/i.exec(text || '');
        if (!String(text || '').trim()) return [2, 2];
        return m ? [+m[1], +(m[2] || m[1])] : null;
    }

    // a box for each number of a matrix of the size typed, its letter and a row and column to
    // each, a11, a12 …, under the head of its name. Each knows where it is, for a matrix pasted
    // in it: cell, the letter, the box of the size (key, or size), its row and column, and the size
    function cells(letter, name, size, key) {
        var s = sizeOf(size) || [2, 2], out = [{ head: name, cols: s[1] }], i, j;
        for (i = 1; i <= s[0]; i++) {
            for (j = 1; j <= s[1]; j++) {
                out.push({ k: letter + i + j, ph: '0', def: 0, aria: name + ' row ' + i + ' column ' + j, cell: { g: letter, s: key || 'size', i: i, j: j, n: s } });
            }
        }
        return out;
    }

    // the matrix of the boxes of a letter, as big as its size
    function matrixOf(n, letter, size) {
        var s = sizeOf(size) || [2, 2], m = [], i, j;
        for (i = 1; i <= s[0]; i++) {
            m.push([]);
            for (j = 1; j <= s[1]; j++) m[i - 1].push(n[letter + i + j]);
        }
        return m;
    }

    function runComplex(n, raw) {
        var z = raw.z ? CalcMaths.complex(raw.z, engine.comma, deg) : null, p, none = [{ l: 'a + b<i>i</i>', v: NaN, wide: true }];
        if (!raw.z) return { rows: none };
        if (!z) return { rows: none, bad: ['z'], warn: true, note: 'Not a complex number yet: 2 + 3i, with i; 2∠30 for a length and an angle.' };
        if (!isFinite(z.re) || !isFinite(z.im)) return { rows: none, warn: true, note: 'No value, as of 1/0.' };
        p = CalcMaths.polar(z, deg);
        return {
            rows: [{ l: 'a + b<i>i</i>', text: complexText(z), wide: true }, { l: 'Real part', v: z.re }, { l: 'Imaginary part', v: z.im },
                { l: 'Length |z|', v: p.r }, { l: 'Angle', v: p.theta }, { l: 'Polar', text: local(String(p.r)) + ' ∠ ' + local(String(p.theta)) + (deg === 1 ? '°' : ''), wide: true },
                { l: 'Exponential', text: exponentialText(p), wide: true },
                { l: 'Conjugate', text: complexText({ re: z.re, im: CalcMaths.round(0 - z.im) }) },
                planeTile([z, { re: z.re, im: -z.im }], 0, 'z and its conjugate')],
            note: 'Angles in ' + ['radians', 'degrees', 'gradians'][deg] + ', the unit in use.'
        };
    }

    // a complex number of its length and angle as r e^(iθ), the angle in the unit in use: 2e^(i·30°), 2e^(–i·0.5)
    function exponentialText(p) {
        if (!p.r) return '0';
        if (!p.theta) return local(String(p.r)); // a positive real: e^(i·0) is 1
        return (p.r === 1 ? '' : local(String(p.r))) + '<i>e</i><sup>' + (p.theta < 0 ? '–' : '') + '<i>i</i>' +
            '·' + local(String(Math.abs(p.theta))) + (deg === 1 ? '°' : '') + '</sup>';
    }

    // A value of a box of R, L, C or f, of a prefix of SI as well: 4.7k or 4.7K, 10m, 100µ or 100u, 1e-6, 2.2 nF;
    // null for an empty box, NaN for one that is not a value
    function siValue(text, unit) {
        var m = new RegExp('^([-+]?(?:\\d+(?:[.,]\\d*)?|[.,]\\d+)(?:e[-+]?\\d+)?)\\s*([pnuµμmkKMG]?)\\s*(?:' + unit + ')?$', 'i').exec(String(text || '').trim()), v;
        if (!String(text || '').trim()) return null;
        if (!m || (m[2] && !/^[pnuµμmkKMG]$/.test(m[2]))) return NaN;
        if (!engine.comma && m[1].indexOf(',') > -1) { // the comma is a thousands mark here: 4,700 is 4700, and 4,7 is no value
            if (!/^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d*)?(?:e[-+]?\d+)?$/i.test(m[1])) return NaN;
            m[1] = m[1].replace(/,/g, '');
        }
        v = parseFloat(m[1].replace(',', '.'));
        return m[2] ? CalcMaths.round(v * { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 }[m[2]]) : v;
    }

    // The impedance of R, L and C at a frequency, in series or side by side: Z, its size and phase,
    // what is in the way of each, and the frequency where the coil and capacitor cancel. Its phase
    // above 0 is of a coil, the current behind the voltage; below 0, of a capacitor, ahead of it
    function runImpedance(n, raw) {
        var v = { r: siValue(raw.r, 'Ω|ohms?'), l: siValue(raw.l, 'h'), c: siValue(raw.c, 'f'), f: raw.f ? siValue(raw.f, 'hz') : 50 },
            bad = Object.keys(v).filter(function (k) { return v[k] !== null && isNaN(v[k]); }), none = [{ l: 'Z', v: NaN, wide: true }], r, p;
        if (bad.length) return { rows: none, bad: bad, warn: true, note: bad.map(function (k) { return k === 'r' ? 'R' : k === 'l' ? 'L' : k === 'c' ? 'C' : 'f'; }).join(' and ') +
            (bad.length > 1 ? ' are' : ' is') + ' not a value: 100, 4.7k, 10m, 100µ or 1e-6.' };
        r = CalcMaths.impedance(v.r, v.l, v.c, v.f, raw.circuit === '1');
        if (r.error === 'none') return { rows: none };
        if (r.error) return { rows: none, warn: true, note: v.c === 0 ? 'C is above 0: a capacitor of 0 F is none.' : 'R, L, C and f are 0 or above.' };
        if (!isFinite(r.z.re) || !isFinite(r.z.im)) return { rows: none, warn: true, note: 'No current goes through: Z is infinite, as of a capacitor in series at 0 Hz, or of L and C side by side at resonance.' };
        p = CalcMaths.polar(r.z, deg);
        return {
            rows: [{ l: 'Z', text: complexText(r.z), wide: true }, { l: '|Z|, Ω', v: p.r }, { l: 'Phase φ', v: p.theta }, { l: 'Resistance, Ω', v: r.z.re },
                { l: 'Reactance, Ω', v: r.z.im }, { l: 'X<sub>L</sub> = ωL', v: isFinite(r.xl) ? r.xl : NaN }, { l: 'X<sub>C</sub> = 1/ωC', v: isFinite(r.xc) ? r.xc : NaN },
                { l: 'Resonance f<sub>0</sub>, Hz', v: r.resonance, wide: true },
                planeTile([r.z], 0, 'Z on the plane')],
            note: (!r.z.im ? 'In phase: as a resistor alone.' : r.z.im > 0 ? 'Of a coil: the current is behind the voltage by φ.' : 'Of a capacitor: the current is ahead of the voltage by |φ|.') +
                ' Angles in ' + ['radians', 'degrees', 'gradians'][deg] + '.' + (raw.f ? '' : ' f is 50 Hz while it is empty.')
        };
    }

    function runRoots(n, raw) {
        var z = raw.z ? CalcMaths.complex(raw.z, engine.comma, deg) : null, roots = z && CalcMaths.croots(z, n.n);
        if (raw.z && !z) return { rows: [{ l: 'Roots', v: NaN, wide: true }], bad: ['z'], warn: true, note: 'Not a complex number yet: -16, 1 + i, with i.' };
        if (!roots) return { rows: [{ l: 'Roots', v: NaN, wide: true }], warn: isFinite(n.n), note: isFinite(n.n) && z ? 'n is a whole number from 1 to 24.' : '' };
        return { rows: roots.map(function (r, i) { return { l: 'z<sub>' + (i + 1) + '</sub>', text: complexText(r), wide: true }; })
            .concat([planeTile(roots, Math.hypot(roots[0].re, roots[0].im))]) };
    }

    function runBits(n, raw) {
        var bits = n.bits, r = raw.e ? CalcMaths.bitwise(raw.e, bits) : null, big, bytes, none = [{ l: 'Decimal', v: NaN }];
        if (raw.e && r && r.error) {
            return { rows: none, bad: r.error === 'expression' ? ['e'] : [], warn: true, note: {
                expression: 'Whole numbers, 255, 0xFF, 0b1010 or 0o17, with + – × ÷ mod AND OR XOR NOT NAND NOR XNOR << >> ROL ROR.',
                zero: 'Division by 0.',
                bits: 'Bits are 8, 16, 32, 64 or 128.'
            }[r.error] };
        }
        if (!r) return { rows: none };
        big = BigInt.asUintN(bits, r.value);
        bytes = CalcMaths.bytesOf(r.value, bits).map(function (b) { return CalcMaths.hexOfBytes([b]).toUpperCase(); });
        return {
            rows: [
                Math.abs(Number(r.value)) <= Number.MAX_SAFE_INTEGER ? { l: 'Decimal', v: Number(r.value) } : { l: 'Decimal', text: String(r.value), wide: bits === 128 },
                big <= BigInt(Number.MAX_SAFE_INTEGER) ? { l: 'Unsigned', v: Number(big) } : { l: 'Unsigned', text: String(big), wide: bits === 128 },
                { l: 'Hexadecimal', text: CalcMaths.inBase(r.value, bits, 16), wide: bits === 128 }, { l: 'Octal', text: CalcMaths.inBase(r.value, bits, 8), wide: bits >= 64, wrap: bits === 128 },
                // of 64 bits and more, 32 to a line
                { l: 'Binary', text: CalcMaths.inBase(r.value, bits, 2).replace(/((?:[01]{4} ){7}[01]{4}) /g, '$1<br>'), wide: true, bits: true }
            ].concat(bits === 8 ? [] : [
                { l: 'Big-endian', text: bytes.join(' '), wide: bits >= 64, wrap: true }, { l: 'Little-endian', text: bytes.slice().reverse().join(' '), wide: bits >= 64, wrap: true },
                { l: 'Bytes swapped', text: '0x' + CalcMaths.inBase(CalcMaths.byteSwap(r.value, bits), bits, 16).padStart(bits / 4, '0'), wide: bits >= 64 }
            ]),
            note: r.wrapped ? 'Out of ' + bits + ' bits: kept to them, as a computer does.' : ''
        };
    }

    // The bits of a whole number to turn over with a click, a row of up to 16 for each, and how
    // many are 1 and where. A bit turned over writes the number again as it was typed, 0x for 0x,
    // or in hexadecimal for a calculation; empty, in binary up to 16 bits
    function runBitView(n, raw) {
        var bits = n.bits, r = raw.e ? CalcMaths.bitwise(raw.e, bits) : [8, 16, 32, 64, 128].indexOf(bits) > -1 ? { value: BigInt(0) } : { error: 'bits' },
            c, none = [{ l: 'Bits', v: NaN, wide: true }];
        if (r.error) {
            return { rows: none, bad: r.error === 'expression' ? ['e'] : [], warn: true, note: {
                expression: 'A whole number, 255, 0xFF, 0b1010 or 0o17, or a calculation of them.',
                zero: 'Division by 0.',
                bits: 'Bits are 8, 16, 32, 64 or 128.'
            }[r.error] };
        }
        c = CalcMaths.bitCount(r.value, bits);
        return {
            rows: [{ l: 'Bits', flip: { v: r.value, n: bits, k: 'e', set: function (b) {
                var v = CalcMaths.flipBit(r.value, bits, b), u = BigInt.asUintN(bits, v), m = /^\s*-?(0x|0b|0o)?[0-9a-f]+\s*$/i.exec(raw.e || ''),
                    how = m ? (m[1] || '').toLowerCase() : raw.e ? '0x' : bits <= 16 ? '0b' : '0x';
                return how === '0x' ? '0x' + u.toString(16).toUpperCase() : how === '0b' ? '0b' + u.toString(2) : how === '0o' ? '0o' + u.toString(8) : String(v);
            } }, wide: true },
                Math.abs(Number(r.value)) <= Number.MAX_SAFE_INTEGER ? { l: 'Decimal', v: Number(r.value) } : { l: 'Decimal', text: String(r.value), wide: bits === 128 },
                { l: 'Hexadecimal', text: CalcMaths.inBase(r.value, bits, 16), wide: bits === 128 },
                { l: 'Ones', v: c.ones }, { l: 'Leading zeros', v: c.leading }, { l: 'Trailing zeros', v: c.trailing },
                { l: 'Highest 1', v: c.high < 0 ? NaN : c.high }, { l: 'Lowest 1', v: c.low < 0 ? NaN : c.low }],
            note: r.wrapped ? 'Out of ' + bits + ' bits: kept to them, as a computer does.' : 'Click a bit to turn it over.'
        };
    }

    // a number as a double and a float, their bits, and what each is to its last digit
    function runFloat(n, raw) {
        var r = raw.x ? CalcMaths.float(raw.x, engine.comma, deg) : null, none = [{ l: 'Double, 64 bits', v: NaN }, { l: 'Float, 32 bits', v: NaN }];
        if (!r) return { rows: none };
        if (r.error) return { rows: none, bad: ['x'], warn: true, note: 'A number, 0.1, pi or 1e-7, inf or nan; or its bits, 0x3FB999999999999A for a double, 0x3DCCCCCD for a float.' };
        return {
            rows: [{ l: 'Number', v: r.x, wide: true }, { l: 'Double, 64 bits', text: '0x' + r.hex64, wide: true },
                { l: 'Kept as a double', text: local(r.exact), wide: true, wrap: true },
                { l: 'Sign', text: r.sign < 0 ? '–' : '+' }, { l: 'Exponent', v: r.exponent }, { l: 'Kind', text: r.kind },
                { l: 'Sign · exponent · fraction', text: r.bits, wide: true, wrap: true, bits: true },
                { l: 'Gap to the next', v: r.ulp, wide: true },
                { l: 'As a float', v: r.float, wide: true }, { l: 'Float, 32 bits', text: '0x' + r.hex32, wide: true },
                { l: 'Kept as a float', text: local(r.exact32), wide: true, wrap: true }],
            note: r.of === 32 ? 'The bits of a float, 32 of them: 16 hexadecimal digits are a double.' : r.kind === 'Subnormal' ? 'Subnormal: smaller than a double keeps to all its digits.' : ''
        };
    }

    // a whole number found, which may be too large to be put in: then read, on a tile of the width
    function wholeTile(l, b) {
        return b === null ? { l: l, v: NaN } : b <= BigInt(Number.MAX_SAFE_INTEGER) && b >= BigInt(-Number.MAX_SAFE_INTEGER) ? { l: l, v: Number(b) } :
            { l: l, text: String(b), wide: true };
    }

    function runFactors(n, raw) {
        var r = raw.n ? CalcMaths.factorize(raw.n, engine.comma, deg, 64) : null, none = [{ l: 'Prime factors', v: NaN, wide: true }], f;
        if (!r) return { rows: none };
        if (r.error) return { rows: none, bad: ['n'], warn: true, note: 'A whole number of up to 20 digits: 360, 2^10, 10!.' };
        f = r.factors.map(function (pe) { return pe[0] + (pe[1] > 1 ? '<sup>' + pe[1] + '</sup>' : ''); }).join(' × ');
        return {
            rows: [{ l: 'Prime factors', text: f ? (r.n < 0 ? '–1 × ' : '') + f : '–', wide: true }, { l: 'Prime', text: r.prime ? 'Yes' : 'No' },
                { l: 'Divisors', v: r.count }, wholeTile('Sum of divisors', r.sum), wholeTile('Totient φ(n)', r.totient),
                { l: 'Each divisor', text: r.divisors ? r.divisors.join(', ') : '–', wide: true, wrap: true }],
            note: r.n === BigInt(0) ? 'Every whole number divides 0.' : r.n === BigInt(1) || r.n === BigInt(-1) ? 'No prime factors.' :
                !r.divisors ? 'Too many divisors to list.' : r.n < 0 ? 'Of its size: the factors of a number below 0 are those of its size, times –1.' : ''
        };
    }

    function runGcd(n, raw) {
        var r = raw.list ? CalcMaths.divisorsOf(raw.list, engine.comma, deg) : null, none = [{ l: 'GCD', v: NaN }, { l: 'LCM', v: NaN }];
        if (!r) return { rows: none };
        if (r.error) return { rows: none, bad: ['list'], warn: true, note: (r.at ? r.at + ' is not' : 'Not') + ' a whole number: 12, 18, 30, ' + (engine.comma ? 'with ; or spaces' : 'with commas or spaces') + ' between them.' };
        return {
            rows: [wholeTile('GCD', r.gcd), wholeTile('LCM', r.lcm), { l: 'Coprime', text: r.n > 1 ? (r.gcd === BigInt(1) ? 'Yes' : 'No') : '–' }],
            note: r.n < 2 ? 'Of two numbers or more.' : r.gcd === BigInt(1) ? 'They have no factor in common.' : ''
        };
    }

    function runRound(n) {
        var x = n.x, d = n.d, ok = isFinite(x) && isFinite(d), bad = ok && (d !== Math.floor(d) || Math.abs(d) > 15);
        function to(how) { return ok && !bad ? CalcMaths.roundTo(x, d, how) : NaN; }
        return {
            rows: [{ l: 'Rounded', v: to('round') }, { l: 'Down ⌊x⌋', v: to('floor') }, { l: 'Up ⌈x⌉', v: to('ceil') }, { l: 'Toward 0', v: to('trunc') },
                { l: 'Fraction part', v: ok ? CalcMaths.round(x - CalcMaths.roundTo(x, 0, 'trunc')) : NaN },
                { l: 'To ' + (ok && d >= 1 && !bad ? d : 'd') + ' figures', v: ok && d >= 1 && !bad ? CalcMaths.significant(x, d) : NaN }],
            note: bad ? 'Places are a whole number from –15 to 15.' : '', warn: bad
        };
    }

    // What is said of a square matrix whose answers are only so near, κ of its condition being
    // large: of about 16 digits, some log₁₀ κ are lost, and fewer than its 10 shown are right. '' where they are
    function trustNote(a) {
        var k = a.every(function (r) { return r.every(isFinite); }) ? CalcMaths.condition(a) : NaN, right;
        if (!(k >= 1e6) || k === Infinity) return '';
        right = Math.max(0, Math.floor(16 - Math.log10(k)));
        return 'Badly conditioned, κ ≈ ' + local(k.toPrecision(2).replace(/e\+?/, 'e')) + ': ' +
            (right ? 'only about ' + right + (right === 1 ? ' digit' : ' digits') : 'none of the digits') + ' of what is worked out of it can be trusted.';
    }

    // a note, and another after it, either of which may be ''
    function notes(a, b) {
        return a && b ? a + ' ' + b : a || b;
    }

    function runMatrix(n, raw) {
        var a = matrixOf(n, 'a', raw.size), square = a.length === a[0].length, inv = square ? CalcMaths.inverse(a) : null,
            bad = sizeOf(raw.size) ? [] : ['size'], power = n.power, whole = isFinite(power) && power === Math.floor(power) && Math.abs(power) <= 1000,
            trust = inv && !bad.length ? trustNote(a) : '';
        return {
            rows: [{ l: 'det A', v: square ? CalcMaths.det(a) : NaN }, { l: 'Rank', v: CalcMaths.rank(a) },
                { l: 'A<sup>–1</sup>', m: inv }, { l: 'A<sup>T</sup>', m: CalcMaths.transpose(a) },
                { l: 'A<sup>' + (whole ? local(String(power)).replace('-', '–') : 'n') + '</sup>', m: square && whole ? CalcMaths.matrixPower(a, power) : null }],
            bad: bad, warn: !!bad.length || (square && !inv) || (isFinite(power) && !whole) || !!trust,
            note: bad.length ? 'A size of rows and columns, each 1 to 10: 3×3, 2 3, or up to 10×10.' : !square ? 'Not square: no determinant, inverse or power.' :
                isFinite(power) && !whole ? 'n is a whole number from –1000 to 1000.' : !inv ? 'No inverse: its determinant is 0' + (power < 0 ? ', so no power below 0.' : '.') : trust
        };
    }

    // a polynomial of λ, its coefficients the highest power first: λ² – 5λ + 6
    function polyText(c) {
        var n = c.length - 1;
        return c.map(function (a, k) {
            var p = n - k, size = Math.abs(a);
            if (!a) return '';
            return (k ? (a < 0 ? ' – ' : ' + ') : a < 0 ? '–' : '') + (size === 1 && p ? '' : local(String(size))) + (p ? 'λ' + (p > 1 ? '<sup>' + p + '</sup>' : '') : '');
        }).join('');
    }

    function runEigen(n, raw) {
        var size = sizeOf(raw.size), a = matrixOf(n, 'a', raw.size), square = a.length === a[0].length, e = size && square ? CalcMaths.eigen(a) : null, rows, trust;
        if (!size) return { rows: [{ l: 'λ', v: NaN }], bad: ['size'], warn: true, note: 'A size of rows and columns, each 1 to 10: 3×3, 3, or up to 10×10.' };
        if (!square) return { rows: [{ l: 'λ', v: NaN }], warn: true, note: 'Not square: an eigenvalue is of a square matrix.' };
        if (!e) return { rows: [{ l: 'λ', v: NaN }] }; // a box that is not a number, marked
        rows = e.values.map(function (z, i) {
            var l = 'λ<sub>' + (i + 1) + '</sub>';
            return z.im ? { l: l, text: complexText(z) } : { l: l, v: z.re };
        });
        rows.push({ l: 'Trace', v: CalcMaths.round(a.reduce(function (s, r, i) { return s + r[i]; }, 0)) }, { l: 'det(λI – A)', text: polyText(e.poly), wide: true });
        e.vectors.forEach(function (v, i) {
            rows.push({ l: 'v<sub>' + (i + 1) + '</sub> of λ = ' + local(String(v.value)), m: [v.v] });
        });
        trust = trustNote(a);
        return { rows: rows, warn: !!trust,
            note: notes(e.values.some(function (z) { return z.im; }) ? 'Its complex eigenvalues have eigenvectors of complex numbers, not shown here.' : '',
                trust && trust.replace(' of what is worked out of it', ' of its eigenvalues near 0, and of their eigenvectors,')) };
    }

    // The unknowns, or where there are many all of them, x = p + t₁v₁ + …, and where there are
    // none the nearest by least squares; and [A | b] with its rows reduced
    function runAxb(n, raw) {
        var size = sizeOf(raw.size), a = matrixOf(n, 'a', raw.size), b = matrixOf(n, 'b', (size || [2, 2])[0] + '×1').map(function (r) { return r[0]; }),
            r = size ? CalcMaths.system(a, b) : null, rows = [], k, x = r && (r.x || r.p || r.least && r.least.x), name, trust;
        name = function (k) { return 'x<sub>' + (k + 1) + '</sub>'; };
        for (k = 0; k < a[0].length; k++) rows.push({ l: name(k), v: x ? x[k] : NaN });
        if (r && r.many) {
            rows.push({ l: 'All of them', text: '<b>x</b> = <b>p</b>' + r.basis.map(function (v, i) { return ' + t<sub>' + (i + 1) + '</sub><b>v</b><sub>' + (i + 1) + '</sub>'; }).join(''), wide: true },
                { l: '<b>p</b>', m: [r.p] });
            r.basis.forEach(function (v, i) { rows.push({ l: '<b>v</b><sub>' + (i + 1) + '</sub>', m: [v] }); });
        }
        if (r && r.none && r.least) rows.push({ l: '|A<b>x</b> – <b>b</b>|', v: r.least.residual });
        if (r) rows.push({ l: '[A | <b>b</b>] reduced', m: r.rref });
        trust = r && r.x && a.length === a[0].length ? trustNote(a) : '';
        return {
            rows: rows, bad: size ? [] : ['size'], warn: !size || !!trust,
            note: !size ? 'A size of rows and columns, each 1 to 10: 3×3, 3 2, or up to 10×10.' : !r ? '' :
                r.none ? 'No answer: the equations cannot all hold. The x above is the nearest, by least squares' + (r.least && r.least.many ? ', one of many as near.' : '.') :
                r.many ? 'Many answers: x is p and any of the v, each times a number t; the x above is p, each t 0.' : trust
        };
    }

    function runRref(n, raw) {
        var size = sizeOf(raw.size || '3'), a = matrixOf(n, 'a', raw.size || '3'), r = size ? CalcMaths.rref(a) : null, rows, trust;
        if (!r) return { rows: [{ l: 'rref A', m: null }], bad: ['size'], warn: true, note: 'A size of rows and columns, each 1 to 10: 3×3, 2 3, or up to 10×10.' };
        rows = [{ l: 'rref A', m: r.m }, { l: 'Rank', v: r.rank }, { l: 'Nullity', v: r.kernel.length },
            { l: 'Columns of its first 1s', text: r.pivots.length ? r.pivots.map(function (c) { return c + 1; }).join(', ') : 'none', wide: true }];
        r.kernel.forEach(function (v, i) { rows.push({ l: 'Null space <b>v</b><sub>' + (i + 1) + '</sub>', m: [v] }); });
        trust = a.length === a[0].length && r.rank === a.length ? trustNote(a) : '';
        return { rows: rows, warn: !!trust, note: notes(r.kernel.length ? 'Its null space: each v, and each sum of them times numbers, A takes to 0.' : 'Only 0 does it take to 0.',
            trust && trust.replace('of what is worked out of it can be trusted.', 'can be trusted: its rank may be less.')) };
    }

    function runLu(n, raw) {
        var size = sizeOf(raw.size), a = matrixOf(n, 'a', raw.size), f = size ? CalcMaths.lu(a) : null, q = size ? CalcMaths.qr(a) : null;
        if (!size) return { rows: [{ l: 'L', m: null }], bad: ['size'], warn: true, note: 'A size of rows and columns, each 1 to 10: 3×3, 3 2, or up to 10×10.' };
        return {
            rows: [{ l: 'P', m: f && f.p }, { l: 'L', m: f && f.l }, { l: 'U', m: f && f.u }, { l: 'Q', m: q.q }, { l: 'R', m: q.r }],
            note: f ? 'P A = L U and A = Q R.' : 'Not square: no L U; A = Q R.'
        };
    }

    function runVectors(n, raw) {
        var u = raw.u ? CalcMaths.vectorOf(raw.u, engine.comma, deg) : null, v = raw.v ? CalcMaths.vectorOf(raw.v, engine.comma, deg) : null, r, bad = [],
            none = [{ l: '<b>u</b> · <b>v</b>', v: NaN }, { l: '<b>u</b> × <b>v</b>', v: NaN }];
        if (raw.u && !u) bad.push('u');
        if (raw.v && !v) bad.push('v');
        if (bad.length) return { rows: none, bad: bad, warn: true, note: 'A vector is 2 to 4 numbers, 1, 2, 3, ' + (engine.comma ? 'with ; or spaces' : 'with commas or spaces') + ' between them.' };
        if (!u || !v) return { rows: none };
        if (u.length !== v.length) return { rows: none, warn: true, note: 'Two vectors of one size.' };
        r = CalcMaths.vectors(u, v, deg);
        return {
            rows: [{ l: '<b>u</b> · <b>v</b>', v: r.dot }, r.cross === null ? { l: '<b>u</b> × <b>v</b>', v: NaN } : typeof r.cross === 'number' ? { l: '<b>u</b> × <b>v</b>', v: r.cross } : { l: '<b>u</b> × <b>v</b>', m: [r.cross] },
                { l: '|<b>u</b>|', v: r.lengths[0] }, { l: '|<b>v</b>|', v: r.lengths[1] }, { l: 'Angle', v: r.angle },
                { l: '<b>u</b> on <b>v</b>', m: r.projection && [r.projection] }, { l: '<b>u</b> of length 1', m: r.unit && [r.unit] }],
            note: (u.length === 2 ? 'Of two of 2, the cross product is the one number of it, out of the plane. ' : u.length === 4 ? 'No cross product of 4. ' : '') +
                'The angle in ' + ['radians', 'degrees', 'gradians'][deg] + ', the unit in use.'
        };
    }

    // Complex numbers drawn on the plane, as a tile: a dot for each, the axes through 0, and a
    // circle about 0 of radius r where given; the second color for the second of two
    function planeTile(points, r, label) {
        var big = Math.max.apply(null, [r || 0].concat(points.map(function (z) { return Math.max(Math.abs(z.re), Math.abs(z.im)); }))) || 1,
            svg = '<svg class="calc-sv-plane" viewBox="-1.3 -1.3 2.6 2.6" aria-hidden="true">' +
                '<line x1="-1.3" y1="0" x2="1.3" y2="0"/><line x1="0" y1="-1.3" x2="0" y2="1.3"/>' +
                (r ? '<circle cx="0" cy="0" r="' + r / big + '" class="calc-sv-ring"/>' : '') +
                points.map(function (z, i) {
                    return '<circle cx="' + (z.re / big).toFixed(4) + '" cy="' + (-z.im / big).toFixed(4) + '" r="0.07" fill="' + GRAPH_CURVES[points.length === 2 && i === 1 ? 1 : 0] + '"/>';
                }).join('') + '</svg>';
        return { l: label || 'On the plane', text: svg, wide: true };
    }

    // a polynomial of complex coefficients written out, the highest power first
    function cpolyHtml(c) {
        var n = c.length - 1, out = '';
        c.forEach(function (z, k) {
            var p = n - k, power = p ? 'x' + (p > 1 ? '<sup>' + p + '</sup>' : '') : '', text;
            if (!z[0] && !z[1]) return;
            if (!z[1] || !z[0]) { // one part: a sign of its own
                text = !z[1] ? (Math.abs(z[0]) === 1 && p ? '' : local(String(Math.abs(z[0])))) : complexText({ re: 0, im: Math.abs(z[1]) });
                out += (out ? ((z[1] || z[0]) < 0 ? ' – ' : ' + ') : (z[1] || z[0]) < 0 ? '–' : '') + text + power;
            } else {
                out += (out ? ' + ' : '') + '(' + complexText({ re: z[0], im: z[1] }) + ')' + power;
            }
        });
        return out || '0';
    }

    function runCpoly(n, raw) {
        var none = [{ l: 'z', v: NaN }], r = raw.p ? CalcMaths.cpolynomial(raw.p, engine.comma, deg) : null, z, why;
        if (!r) return { rows: none };
        why = {
            polynomial: 'Not a polynomial of x yet: x^2 + (1 + i)x + 2i, or its coefficients from the highest power, ' + (engine.comma ? '1; 1 + i; 2i.' : '1, 1 + i, 2i.'),
            letters: 'Only x and i have values here: write the other letters as numbers.',
            power: 'Up to the power 30.'
        }[r.error];
        if (why) return { rows: none, bad: ['p'], warn: true, note: why };
        z = CalcMaths.cpoly(r.c);
        if (!z) return { rows: none, warn: true, note: 'No x left: its coefficients of x are all 0.' };
        return {
            rows: [{ l: 'Multiplied out', text: cpolyHtml(r.c), wide: true, wrap: true }].concat(z.map(function (w, i) {
                return w.im ? { l: rootName(i, z.length, 'z'), text: complexText(w) } : { l: rootName(i, z.length, 'z'), v: w.re };
            }), [planeTile(z)])
        };
    }

    // a text as HTML: its own &, < and > not tags
    function escaped(text) {
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function runAnyBase(n, raw) {
        var none = [{ l: 'In base ' + (isFinite(n.to) ? n.to : 'b'), text: '–', wide: true }], from = n.from, to = n.to, f, out, about, ok = function (b) { return b >= 2 && b <= 36 && b === Math.floor(b); };
        if (!raw.x) return { rows: none };
        if (!ok(from) || !ok(to)) return { rows: none, warn: true, note: 'Bases are whole numbers from 2 to 36.' };
        f = CalcMaths.fromBase(raw.x, from);
        if (!f) return { rows: none, bad: ['x'], warn: true, note: 'Not a number of base ' + from + ': digits 0 to ' + '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(from - 1) + ', a point, and a part in brackets that comes again, 0.(3).' };
        out = CalcMaths.toBase(f[0], f[1], to, 64);
        about = CalcMaths.about(f[0], f[1]);
        return {
            rows: [{ l: 'In base ' + to, text: out, wide: true, wrap: true },
                { l: 'Decimal', v: typeof about === 'number' ? about : NaN },
                { l: 'Fraction', text: f[1] === BigInt(1) ? '–' : String(f[0]).replace('-', '–') + '/' + f[1] }],
            note: /…/.test(out) ? 'It goes on past 64 digits before it comes round.' : ''
        };
    }

    function runCodes(n, raw) {
        var text = raw.t ? raw.t : raw.c ? CalcMaths.fromCodes(raw.c) : null, c, hex = function (v, w) { return v.toString(16).toUpperCase().padStart(w, '0'); },
            none = [{ l: 'Code points', text: '–', wide: true }];
        if (raw.c && !raw.t && text === null) return { rows: none, bad: ['c'], warn: true, note: 'Codes, apart by spaces: U+00E9 for code points, 0xC3 0xA9 for the bytes of UTF-8, or 233.' };
        if (text === null) return { rows: none };
        c = CalcMaths.textCodes(text);
        return {
            rows: [{ l: 'Text', text: escaped(text) || '–', wide: true, wrap: true },
                { l: 'Code points', text: c.points.map(function (v) { return 'U+' + hex(v, 4); }).join(' '), wide: true, wrap: true },
                { l: 'Decimal', text: c.points.join(' '), wide: true, wrap: true },
                { l: 'UTF-8', text: c.utf8.map(function (v) { return hex(v, 2); }).join(' '), wide: true, wrap: true },
                { l: 'UTF-8 in binary', text: c.utf8.map(function (v) { return v.toString(2).padStart(8, '0'); }).join(' '), wide: true, wrap: true, bits: true },
                { l: 'UTF-16', text: c.utf16.map(function (v) { return hex(v, 4); }).join(' '), wide: true, wrap: true },
                { l: 'Characters', v: c.points.length }, { l: 'Bytes of UTF-8', v: c.utf8.length }],
            note: raw.t && raw.c ? 'Of the text: the codes box is read while the text is empty.' : ''
        };
    }

    // A text in Base64, 32, 58 or 85, as its bytes of UTF-8 are; or the text of one, and its bytes, where they are not text
    var ENCODINGS = [ // in the order of their buttons, Base64 the one at first
        { name: 'Base32', to: CalcMaths.toBase32, from: CalcMaths.fromBase32, not: 'Not Base32: of A–Z and 2–7, eight letters for each five bytes, = filling the last eight.' },
        { name: 'Base58', to: CalcMaths.toBase58, from: CalcMaths.fromBase58, not: 'Not Base58: of 1–9, A–Z and a–z but 0, O, I and l.' },
        { name: 'Base64', to: CalcMaths.toBase64, from: CalcMaths.fromBase64, not: 'Not Base64: of A–Z, a–z, 0–9 and + and / or - and _, four letters for each three bytes, = filling the last four.' },
        { name: 'Base85', to: CalcMaths.toBase85, from: CalcMaths.fromBase85, not: 'Not Base85: of ! to u, five letters for each four bytes, z for four 0s, between <~ and ~> if you like.' }
    ];

    function runBase64(n, raw) {
        var how = ENCODINGS[+raw.enc] || ENCODINGS[2], none = [{ l: how.name, text: '–', wide: true }], bytes, text = null, hex, encoded;
        if (raw.t) {
            bytes = Array.from(new TextEncoder().encode(raw.t));
        } else if (raw.b) {
            bytes = how.from(raw.b);
            if (!bytes) return { rows: none, bad: ['b'], warn: true, note: how.not };
            try {
                text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
            } catch (e) { }
        } else {
            return { rows: none };
        }
        hex = CalcMaths.hexOfBytes(bytes, ' ').toUpperCase();
        encoded = raw.t ? how.to(bytes) : '';
        return {
            rows: raw.t ? [{ l: how.name, text: encoded || '–', wide: true, wrap: true }].concat(how.name === 'Base64' ? [{ l: 'For web addresses', text: CalcMaths.toBase64(bytes, true) || '–', wide: true, wrap: true }] : [],
                [{ l: 'Bytes of UTF-8', text: hex || '–', wide: true, wrap: true }, { l: 'Bytes', v: bytes.length }, { l: 'Letters of ' + how.name, v: encoded.length }]) :
                [{ l: 'Text', text: text === null ? '–' : escaped(text) || '–', wide: true, wrap: true }, { l: 'Bytes', text: hex || '–', wide: true, wrap: true }, { l: 'Bytes', v: bytes.length }],
            note: raw.t && raw.b ? 'Of the text: the box of what is encoded is read while the text is empty.' : text === null && !raw.t ? 'Not text of UTF-8: its bytes alone.' : ''
        };
    }

    // The hashes of a text's bytes of UTF-8, each to copy; a hash typed in hexadecimal or Base64 matched against them
    function runHash(n, raw) {
        var none = [{ l: 'SHA-256', text: '–', wide: true }], bytes, rows, want, match;
        if (!raw.t) return { rows: none, note: raw.h ? 'Of a text: type it to check the hash against.' : '' };
        bytes = Array.from(new TextEncoder().encode(raw.t));
        rows = [['MD5', CalcMaths.md5(bytes)], ['SHA-1', CalcMaths.sha1(bytes)], ['SHA-256', CalcMaths.sha256(bytes)], ['SHA-512', CalcMaths.sha512(bytes)]].map(function (h) {
            return { l: h[0], text: CalcMaths.hexOfBytes(h[1]), copy: CalcMaths.hexOfBytes(h[1]), wide: true, wrap: true, b: h[1] };
        });
        rows.push({ l: 'SHA-256 for integrity', text: 'sha256-' + CalcMaths.toBase64(rows[2].b), copy: 'sha256-' + CalcMaths.toBase64(rows[2].b), wide: true, wrap: true, b: rows[2].b });
        rows.push({ l: 'CRC-32', text: CalcMaths.crc32(bytes).toString(16).padStart(8, '0'), copy: CalcMaths.crc32(bytes).toString(16).padStart(8, '0'), wide: true });
        rows.push({ l: 'Bytes', v: bytes.length });
        if (raw.h) {
            want = raw.h.trim().replace(/^sha\d+-/i, '');
            match = rows.filter(function (r) {
                return r.text && (/^[0-9a-f\s:]+$/i.test(want) ? want.replace(/[\s:]/g, '').toLowerCase() === r.text : r.b && CalcMaths.toBase64(r.b).replace(/=+$/, '') === want.replace(/=+$/, ''));
            })[0];
        }
        rows.forEach(function (r) { delete r.b; });
        return {
            rows: rows, bad: raw.h && !match ? ['h'] : undefined, warn: !!(raw.h && !match),
            note: !raw.h ? 'MD5 and SHA-1 are broken: for checking a download alone, never for passwords.' : match ? 'It matches the ' + match.l + '.' : 'It matches none of them.'
        };
    }

    // Five new UUIDs of the version chosen, from the browser's strong random bytes, those of
    // version 7 in order; or one typed read: its version, variant, the time it was made and it in
    // other ways. Each to copy
    var UUID_VERSIONS = {
        1: '1, of the time and a node', 2: '2, DCE security', 3: '3, of a name, MD5', 4: '4, random', 5: '5, of a name, SHA-1',
        6: '6, of the time, in order', 7: '7, of Unix time', 8: '8, of its own kind'
    };

    function runUuid(n, raw) {
        var none = [{ l: 'UUID', text: '–', wide: true }], v, ver, made = [], out = [], bytes, k, at, hex, b64, b64url, whole;
        if (!raw.u) {
            ver = raw.ver === '1' ? 7 : 4;
            at = Date.now();
            for (k = 0; k < 5; k++) {
                bytes = new Uint8Array(16);
                if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
                else bytes = bytes.map(function () { return Math.floor(Math.random() * 256); });
                made.push(CalcMaths.makeUuid(ver, Array.from(bytes), at));
            }
            if (ver === 7) made.sort();
            return { rows: made.map(function (u, i) { return { l: 'UUID ' + (i + 1), text: u, copy: u, wide: true }; }),
                note: ver === 7 ? 'The time now, to the millisecond, then 74 random bits.' : '122 random bits, and 6 of its version and variant.' };
        }
        v = CalcMaths.readUuid(raw.u);
        if (!v) return { rows: none, bad: ['u'], warn: true, note: 'A UUID is 32 hexadecimal digits, 8-4-4-4-12 with hyphens, or none: f81d4fae-7dec-11d0-a765-00a0c91e6bf6.' };
        hex = '0x' + v.text.replace(/-/g, '').toUpperCase();
        out.push({ l: 'UUID', text: v.text, copy: v.text, wide: true });
        out.push({ l: 'Version', text: v.nil ? 'Nil, all 0' : v.max ? 'Max, all 1' : v.version === null ? 'None: not of RFC 9562' : UUID_VERSIONS[v.version] || v.version + ', of none yet', wide: true });
        if (!v.nil && !v.max) out.push({ l: 'Variant', text: { NCS: 'NCS, of the 1980s', RFC: 'RFC 9562', Microsoft: 'Microsoft, of old', Future: 'Kept for the future' }[v.variant], wide: true });
        if (v.time !== null) {
            at = new Date(Math.floor(v.time));
            out.push({ l: 'Made, in UTC', text: at.toISOString().replace('T', ', ').replace('Z', ''), wide: true },
                { l: 'Made, here', text: at.toLocaleString(DATE_LANG, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }), wide: true });
        }
        b64 = CalcMaths.toBase64(v.bytes);
        b64url = CalcMaths.toBase64(v.bytes, true);
        whole = BigInt(hex).toString();
        out.push({ l: 'Hexadecimal', text: hex, copy: hex, wide: true },
            { l: 'Base64', text: b64, copy: b64, wide: true },
            { l: 'For web addresses', text: b64url, copy: b64url, wide: true },
            { l: 'As a whole number', text: whole, copy: whole, wide: true, wrap: true });
        return { rows: out, note: 'Its hexadecimal, pasted into Bits of 128, shows its bits.' };
    }

    // The network of an IPv4 address: its network and broadcast addresses, mask, hosts and kind
    function runSubnet(n, raw) {
        var none = [{ l: 'Network', text: '–', wide: true }], r = raw.ip ? CalcMaths.subnet(raw.ip) : null, ip = CalcMaths.ipText;
        if (!r) return { rows: none };
        if (r.error) return { rows: none, bad: ['ip'], warn: true, note: {
            address: r.v6 ? 'An IPv6 address, up to eight groups of up to four hexadecimal digits with colons between them, :: for a run of 0s, and its prefix: 2001:db8::1/48.' :
                'An IPv4 address, four numbers from 0 to 255 with dots between them, and its prefix or mask: 192.168.1.10/24, or 192.168.1.10 255.255.255.0; or an IPv6 address, 2001:db8::1/48.',
            prefix: 'The prefix is from /0 to /' + (r.v6 ? 128 : 32) + ': how many bits, from the left, are of the network.',
            mask: 'Not a mask: its 1s are all on the left, 255.255.255.0, 255.255.240.0.'
        }[r.error] };
        if (r.v6) return runSubnet6(r);
        return {
            rows: [{ l: 'Network', text: ip(r.network) + '/' + r.prefix, wide: true }, { l: 'Broadcast', text: ip(r.broadcast), wide: true },
                { l: 'Mask', text: ip(r.mask), wide: true }, { l: 'Wildcard', text: ip(r.wildcard), wide: true },
                { l: 'First host', text: ip(r.first), wide: true }, { l: 'Last host', text: ip(r.last), wide: true },
                { l: 'Hosts', v: r.hosts }, { l: 'Addresses', v: r.all }, { l: 'Kind', text: r.kind, wide: true },
                { l: 'Address in binary', text: CalcMaths.inBase(BigInt(r.address), 32, 2).replace(/ /g, '').replace(/(\d{8})(?=\d)/g, '$1.'), wide: true, bits: true },
                { l: 'Mask in binary', text: CalcMaths.inBase(BigInt(r.mask), 32, 2).replace(/ /g, '').replace(/(\d{8})(?=\d)/g, '$1.'), wide: true, bits: true }],
            note: !r.given ? 'Of the address alone, /32: add its prefix, /24, for its network.' : r.prefix === 31 ? 'A /31 links two hosts, both of them given out, by RFC 3021.' :
                r.prefix === 32 ? 'A /32 is one address.' : 'Hosts are all its addresses but the first, the network, and the last, its broadcast.'
        };
    }

    // A count of addresses of IPv6, a power of 2: as a number while it is one exactly, else 2ⁿ and all its digits
    function powerTile(l, count) {
        var bits = count.toString(2).length - 1;
        return count <= BigInt(Number.MAX_SAFE_INTEGER) ? { l: l, v: Number(count) } : { l: l, text: '2<sup>' + bits + '</sup> = ' + count, wide: true, wrap: true };
    }

    // The network of an IPv6 address: no broadcast, mask or hosts kept from it, as IPv4 has; each of its
    // addresses may be given out. Its address in full and as it is written short, and its name for reverse DNS
    function runSubnet6(r) {
        var ip = CalcMaths.ipv6Text;
        return {
            rows: [{ l: 'Network', text: ip(r.network) + '/' + r.prefix, wide: true }, { l: 'Address', text: ip(r.address), wide: true },
                { l: 'In full', text: ip(r.address, true), wide: true, wrap: true },
                { l: 'First address', text: ip(r.network), wide: true }, { l: 'Last address', text: ip(r.last), wide: true, wrap: true },
                powerTile('Addresses', r.all), r.subnets === null ? { l: '/64 networks', text: '–' } : powerTile('/64 networks', r.subnets), { l: 'Kind', text: r.kind, wide: true },
                { l: 'Reverse DNS', text: r.reverse, wide: true, wrap: true }],
            note: !r.given ? 'Of the address alone, /128: add its prefix, /64, for its network.' : r.prefix > 64 ? 'Smaller than a /64, the size of a network of hosts that make their own addresses.' :
                'IPv6 has no broadcast address: each address of the network may be given out.'
        };
    }

    function runModular(n, raw) {
        var none = [{ l: 'a mod m', v: NaN }], r, s;
        if (!raw.a || !raw.m) return { rows: none };
        r = CalcMaths.modular([raw.a, raw.b || '1', raw.m], engine.comma, deg);
        if (r.error) {
            return { rows: none, bad: r.error === 'whole' ? [r.at] : ['m'], warn: true,
                note: r.error === 'whole' ? r.at + ' is a whole number, of up to 200 digits.' : 'm is a whole number above 0.' };
        }
        s = r.solve;
        return {
            rows: [wholeTile('a mod m', r.mod), raw.b ? wholeTile('a<sup>b</sup> mod m', r.power) : { l: 'a<sup>b</sup> mod m', v: NaN }, wholeTile('a<sup>–1</sup> mod m', r.inverse),
                { l: 'a x ≡ b (mod m)', text: !raw.b ? '–' : s ? 'x ≡ ' + s.x + ' (mod ' + s.step + ')' + (s.count > BigInt(1) ? ', ' + s.count + ' of them below m' : '') : 'none', wide: true, wrap: true }],
            note: r.inverse === null ? 'a and m have a factor in common: a has no inverse mod m' + (raw.b && r.power === null ? ', so no power below 0.' : '.') : ''
        };
    }

    function runChinese(n, raw) {
        var none = [{ l: 'x', v: NaN }], r = raw.list ? CalcMaths.chinese(raw.list, engine.comma, deg) : null;
        if (!r) return { rows: none };
        if (r.error) return { rows: none, bad: ['list'], warn: true, note: (r.at ? r.at + ': not' : 'Not') + ' of the form 2 mod 3, ' + (engine.comma ? 'with ; between them.' : 'with commas between them.') };
        if (r.none) return { rows: none, warn: true, note: 'None: they cannot all hold, their moduli having a factor in common.' };
        return { rows: [wholeTile('x', r.x), wholeTile('Modulus', r.m), { l: 'All of them', text: 'x ≡ ' + r.x + ' (mod ' + r.m + ')', wide: true, wrap: true }] };
    }

    function runExact(n, raw) {
        var none = [{ l: 'Exactly', text: '–', wide: true }], r = raw.e ? CalcMaths.exact(raw.e, engine.comma) : null, top, about, digits;
        if (!r) return { rows: none };
        if (r.error) {
            return { rows: none, bad: r.error === 'expression' ? ['e'] : [], warn: true, note: {
                expression: 'Of whole numbers and fractions: + – × ÷, ^, n!, nCr, nPr, C(n' + (engine.comma ? ';' : ',') + ' k), P(n' + (engine.comma ? ';' : ',') + ' k), fib(n).',
                large: 'More than 20000 digits.',
                zero: 'Division by 0.',
                whole: 'n! and a choice of whole numbers up to 5000, fib(n) of one, a power of a whole number.'
            }[r.error] };
        }
        top = String(r.top).replace('-', '–');
        about = CalcMaths.about(r.top, r.bottom);
        digits = String(r.top).replace('-', '').length;
        return {
            rows: [{ l: 'Exactly', text: r.bottom === BigInt(1) ? top : top + '/' + r.bottom, wide: true, wrap: true },
                { l: r.bottom === BigInt(1) ? 'Digits' : 'Digits of the top', v: digits },
                typeof about === 'number' ? { l: 'About', v: about } : { l: 'About', text: about.replace('-', '–').replace(/e(-?)(\d+)$/, function (m, s, e) { return ' × 10<sup>' + (s ? '–' : '') + e + '</sup>'; }) }]
                .concat(r.bottom === BigInt(1) ? [] : [{ l: 'Decimal', text: CalcMaths.toBase(r.top, r.bottom, 10, 60).replace('-', '–'), wide: true, wrap: true }])
        };
    }

    function runPrimes(n, raw) {
        var none = [{ l: 'Prime', text: '–' }], r = raw.n ? CalcMaths.primesNear(raw.n, engine.comma, deg) : null;
        if (!r) return { rows: none };
        if (r.error) return { rows: none, bad: ['n'], warn: true, note: 'A whole number of up to 24 digits.' };
        return {
            rows: [{ l: 'Prime', text: r.prime ? 'Yes' : 'No' }, wholeTile('Previous prime', r.previous), wholeTile('Next prime', r.next),
                { l: 'π(n), primes up to n', v: r.count === null ? NaN : r.count }, { l: 'The n-th prime', v: r.nth === null ? NaN : r.nth }],
            note: r.count === null ? 'π(n) and the n-th prime up to 10 million.' : r.nth === null && r.n > BigInt(0) ? 'The n-th prime while it is up to 10 million.' : ''
        };
    }

    function runBetween2(n, raw) {
        var none = [{ l: 'How many', v: NaN }], r = raw.a && raw.b ? CalcMaths.primesBetween([raw.a, raw.b], engine.comma, deg, 200) : null;
        if (!r) return { rows: none };
        if (r.error) return { rows: none, bad: r.error === 'whole' ? ['a', 'b'] : [], warn: true, note: r.error === 'whole' ? 'Whole numbers.' : 'To up to 10¹⁴, the two up to 10 million apart.' };
        return {
            rows: [{ l: 'How many', v: r.count }, { l: 'The primes', text: r.list.length ? r.list.join(', ') + (r.more ? ' …' : '') : 'none', wide: true, wrap: true }],
            note: r.more ? 'The first 200 of them.' : ''
        };
    }

    function runFraction(n, raw) {
        var none = [{ l: 'Fraction', text: '–' }], r = raw.x ? CalcMaths.fractionOf(raw.x, engine.comma, deg) : null, t, b, whole, rest, cf, f, sign;
        if (!r) return { rows: none };
        if (r.error) return { rows: none, bad: ['x'], warn: true, note: 'A fraction, 22/7, a decimal, 0.125, one with a part in brackets that comes again, 0.1(6), or a calculation.' };
        if (r.value !== undefined) {
            f = CalcEngine.fraction(r.value);
            cf = CalcMaths.continuedOf(r.value, 20);
            return {
                rows: [{ l: 'Fraction', text: f ? String(f[0]).replace('-', '–') + '/' + f[1] : '–' }, { l: 'Value', v: r.value },
                    { l: 'Continued fraction', text: '[' + cf[0] + (cf.length > 1 ? '; ' + cf.slice(1).join(', ') : '') + ']', wide: true, wrap: true }],
                note: 'Of a calculation: as near as its digits tell.' + (f ? '' : ' Not a fraction of up to 10 digits.')
            };
        }
        t = r.top;
        b = r.bottom;
        sign = t < BigInt(0) ? '–' : '';
        whole = (t < BigInt(0) ? -t : t) / b;
        rest = (t < BigInt(0) ? -t : t) % b;
        cf = CalcMaths.continued(t, b, 40);
        return {
            rows: [{ l: 'Fraction', text: sign + (t < BigInt(0) ? -t : t) + (b === BigInt(1) ? '' : '/' + b) },
                { l: 'Mixed', text: b === BigInt(1) || !whole ? '–' : sign + whole + ' ' + rest + '/' + b },
                { l: 'Value', v: CalcMaths.about(t, b) },
                { l: 'Decimal', text: local(CalcMaths.toBase(t, b, 10, 100)).replace('-', '–'), wide: true, wrap: true },
                { l: 'Continued fraction', text: '[' + cf[0] + (cf.length > 1 ? '; ' + cf.slice(1).join(', ') : '') + ']', wide: true, wrap: true }]
        };
    }

    function runMatrices(n, raw) {
        var a = matrixOf(n, 'a', raw.sizeA), b = matrixOf(n, 'b', raw.sizeB), bad = [];
        if (!sizeOf(raw.sizeA)) bad.push('sizeA');
        if (!sizeOf(raw.sizeB)) bad.push('sizeB');
        return {
            rows: [{ l: 'A + B', m: CalcMaths.plus(a, b) }, { l: 'A – B', m: CalcMaths.plus(a, b, true) },
                { l: 'A × B', m: CalcMaths.times(a, b) }, { l: 'B × A', m: CalcMaths.times(b, a) }],
            bad: bad, warn: !!bad.length,
            note: bad.length ? 'A size of rows and columns, each 1 to 10: 3×3, 2 3, or up to 10×10.' :
                'A sum needs one size; a product A × B as many columns of A as rows of B.'
        };
    }

    // ---------------- dates ---------------- //

    // The converter's dates: the time from one date to another, and a date moved on by years,
    // months and days, with cards as the solver has. An empty date is today
    var DATE_TOOLS = {
        dates: [
            { id: 'span', t: 'Time between dates', f: 'years, months, weeks and days', d: 'The time from one date to another: in years, months and days; then the whole years, months and weeks of it, its days, its weekdays, Monday to Friday, both dates in, and its hours, each below 0 where the second date is before the first. An empty date is today.',
                fields: [{ k: 'a', l: 'From', date: true }, { k: 'b', l: 'To', date: true }], run: runSpan },
            { id: 'add', t: 'Add or subtract time', f: 'date ± years, months, days', d: 'A date some years, months and days on, below 0 to go back: the date and its weekday, its day of the year and its week. The years and months go first; a month from 31 January is the last day of February. An empty date is today.',
                fields: [{ k: 'd', l: 'Date', date: true }, { k: 'y', l: 'Years', ph: '0', def: 0, cls: 'calc-sv-dated' },
                    { k: 'm', l: 'Months', ph: '0', def: 0, cls: 'calc-sv-dated' }, { k: 'days', l: 'Days', ph: '0', def: 0, cls: 'calc-sv-dated' }],
                cols: 3, run: runAdd },
            { id: 'unix', t: 'Unix time', f: '1700000000 ↔ 14 Nov 2023 22:13:20', d: 'One way or the other. Unix → Date: the date and time of a Unix timestamp, the seconds from 1 January 1970 in UTC, or of 13 digits its milliseconds, in UTC, here, and in ISO 8601. Date → Unix: the timestamp of a date and time, in UTC or the time here; an empty date is today, an empty time midnight.',
                // the boxes of the way chosen only: a timestamp, or a date, a time and its zone
                fields: function (raw) {
                    var way = [{ k: 'convert', l: 'Convert', choice: ['Unix → Date', 'Date → Unix'] }];
                    return raw.convert === '1' ? way.concat([{ k: 'd', l: 'Date', date: true }, { k: 'time', l: 'Time', ph: '00:00:00', text: true },
                        { k: 'zone', l: 'Time in', choice: ['UTC', 'Time here'] }]) : way.concat([{ k: 'ts', l: 'Unix time', ph: '1700000000' }]);
                }, run: runUnix }
        ]
    };

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
            note: milli ? 'Of 13 digits: milliseconds.' : raw.convert !== '1' ? 'Seconds from 1 January 1970, in UTC.' : 'The date and time in ' + (raw.zone === '1' ? 'the time here.' : 'UTC.')
        };
    }

    // the day of today, here
    function today() {
        var t = new Date();
        return CalcMaths.dayFrom(t.getFullYear(), t.getMonth() + 1, t.getDate());
    }

    // A date is written in numbers as the browser's region writes it: 14/10/2026 in the UK and France,
    // 14.10.2026 in Germany, 10/14/2026 in the US, 2026-10-14 in Sweden; and read so as it is typed.
    // Its words are English, as the calculator's, in the order of the US or the UK. The weeks of the
    // calendar start on the region's first day: Monday, or Sunday in the US
    var DATE_LANG = /^en\b/i.test(navigator.language || '') ? navigator.language : 'en-GB',
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
            return CalcEngine.group(String(p[0]), fmt.group) + ' ' + p[1] + (p[0] === 1 ? '' : 's');
        }).join(', ');
        return text || '0 days';
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
            '<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/></svg>';

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
            chosen = dayOfBox(calBox.value.trim()), now = today(), html = '', i, d;
        for (i = 0; i < 7; i++) html += '<span class="calc-cal-wk">' + dateText(start + i, { weekday: 'short' }).slice(0, 2) + '</span>';
        for (i = 0; i < 42; i++) {
            d = start + i;
            html += d < CAL_FIRST || d > CAL_LAST ? '<span></span>' : '<span class="calc-cal-day' + (CalcMaths.dateOf(d).m !== c.m ? ' calc-cal-out' : '') +
                (d === now ? ' calc-cal-now' : '') + (d === chosen ? ' calc-on' : '') + (d === calLit ? ' calc-lit' : '') + '" data-d="' + d + '">' + CalcMaths.dateOf(d).d + '</span>';
        }
        calendar.innerHTML = '<div class="calc-cal-head"><span class="calc-cal-go" data-go="-12" title="A year back">«</span>' +
            '<span class="calc-cal-go" data-go="-1" title="A month back">‹</span><span class="calc-cal-title">' + dateText(calLit, { month: 'long', year: 'numeric' }) + '</span>' +
            '<span class="calc-cal-go" data-go="1" title="A month on">›</span><span class="calc-cal-go" data-go="12" title="A year on">»</span></div>' +
            '<div class="calc-cal-grid">' + html + '</div><div class="calc-cal-foot"><span class="calc-cal-today">Today</span></div>';
    }

    // under the box, at its right; over it where there is no room below, and inside the panel always
    function placeCalendar() {
        var panel = calendar.parentNode, p = panel.getBoundingClientRect(), b = calBox.parentNode.getBoundingClientRect(),
            k = p.width / panel.offsetWidth || 1, h = calendar.offsetHeight, top = (b.bottom - p.top) / k + 4;
        if (top + h > panel.clientHeight - 4) top = Math.max((b.top - p.top) / k - h - 4, panel.clientHeight - 4 - h);
        calendar.style.top = Math.max(4, top) + 'px';
        calendar.style.left = Math.max(6, (b.right - p.left) / k - calendar.offsetWidth) + 'px';
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
        var tab = Object.keys(tools)[0], openId = '', values = {}, rows = [], pasted = '';

        // the boxes of a tool, as what is typed in it says: a matrix has as many as its size
        function fieldsOf(tool, raw) {
            return typeof tool.fields === 'function' ? tool.fields(raw) : tool.fields;
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

        // the cards of the tab, the one open with its boxes
        function render() {
            var open;
            list.innerHTML = tools[tab].map(function (tool, i) {
                if (tool.id === openId) open = i;
                return '<div class="calc-sv-item" data-i="' + i + '"><div class="calc-sv-row"><span class="calc-sv-col">' +
                    '<span class="calc-sv-name">' + tool.t + '</span><span class="calc-sv-f calc-sv-eq calc-sv-val"><span>' +
                    pills(tool.f) + '</span></span></span>' + collapseButton() + '</div></div>'; // each in a badge, one alone as well
            }).join('');
            list.scrollTop = 0;
            list.style.setProperty('--rows', tools[tab].length);
            list.classList.toggle('calc-side', !!(now.side && now.side())); // beside the list, the card open
            if (open === undefined && (tools[tab].length === 1 || (now.side && now.side()))) open = 0; // beside the list, a card is always open
            if (open !== undefined) openTool(list.children[open], true);
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
            if (!item) return keep();
            hideTip();
            tool = tools[tab][+item.dataset.i];
            openId = tool.id;
            form = item.appendChild(document.createElement('div'));
            form.className = 'calc-sv-form';
            form.innerHTML = (now.side && now.side() ? '<div class="calc-sv-side-head"><span class="calc-sv-side-name">' + tool.t + '</span><span class="calc-sv-f calc-sv-val">' + pills(tool.f) +
                '</span><p class="calc-sv-side-d">' + tool.d + '</p></div>' : '') + // beside the list, its name, formula and what it does at its top
                '<div class="calc-sv-boxes"></div><div class="calc-sv-note"></div>' + (tool.again ? '<span class="calc-sv-again">Again</span>' : '') +
                (tool.example ? '<span class="calc-sv-again calc-sv-example" role="button">Example</span>' : '') +
                '<div class="calc-sv-results">Results</div><div class="calc-sv-grid"></div>';
            item.classList.add('calc-on');
            boxes(tool, item);
            run();
            keep();
            box = form.querySelector('input');
            if (!quiet && focusBox(box)) box.select();
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
            fieldsOf(tool, rawOf(tool)).forEach(function (f) {
                if (f.choice) { // one of a few ways, each a button, as the tabs are: its way at first (at), or the first, while none is chosen
                    html += '<div class="calc-sv-var calc-sv-wide"><span class="calc-sv-sym">' + f.l + '</span><span class="calc-sv-choice" role="radiogroup" aria-label="' +
                        f.l + '" data-k="' + f.k + '">' + f.choice.map(function (c, i) {
                            return '<span class="calc-sv-opt' + (chosen(f, kept[f.k]) === i ? ' calc-on' : '') + '" role="radio" tabindex="0" data-c="' + i + '">' + c + '</span>';
                        }).join('') + '</span></div>';
                    return;
                }
                if (f.area) { // numbers of a list, on lines of their own as well, as a column of a spreadsheet is pasted
                    html += '<label class="calc-sv-var calc-sv-wide calc-sv-areas"><span class="calc-sv-sym">' + f.l + '</span><textarea class="calc-sv-area" rows="3" spellcheck="false" ' +
                        'autocomplete="off" maxlength="20000" placeholder="' + f.ph + '" data-k="' + f.k + '" aria-label="' + f.l + '"></textarea></label>';
                    return;
                }
                if (f.head) { // a matrix: of more than 5 columns, smaller boxes, so up to 11 fit across the card
                    html += '</div><div class="calc-sv-head">' + f.head + '</div><div class="calc-sv-fields calc-sv-cells-in' + (f.cols > 5 ? ' calc-sv-many' : '') +
                        '" style="--cols: ' + f.cols + '">';
                    return;
                }
                html += '<label class="calc-sv-var' + (f.fn ? ' calc-sv-wide' : '') + (f.date ? ' calc-sv-wide calc-sv-dated' : '') + (f.cls ? ' ' + f.cls : '') + '">' + (f.l ? '<span class="calc-sv-sym">' + f.l + '</span>' : '') +
                    (f.date ? '<span class="calc-sv-date">' : '') +
                    '<input type="text"' + (f.fn || f.text || f.date ? '' : ' data-num="1"') + ' spellcheck="false" autocomplete="off" maxlength="' + (f.fn ? 200 : 40) +
                    '" placeholder="' + (f.date ? 'Today' : f.ph) + '" data-k="' + f.k + '" aria-label="' + (f.aria || (f.fn ? tool.t : f.l.replace(/<[^>]*>/g, ''))) + '">' +
                    (f.date ? '<span class="calc-sv-cal" title="Calendar">' + CALENDAR_ICON + '</span></span>' : '') + '</label>';
            });
            item.querySelector('.calc-sv-boxes').innerHTML = html + '</div>';
            [].forEach.call(item.querySelectorAll('.calc-sv-boxes input, .calc-sv-boxes textarea'), function (input) {
                input.value = typeof kept[input.dataset.k] === 'string' ? kept[input.dataset.k] : '';
                if (input.parentNode.classList.contains('calc-sv-date')) dateBoxOf(input);
            });
        }

        // What the open tool gives from its boxes now: each number read, or its default while
        // empty, a box that is not one marked and named in the note; then its tiles, and its note
        function run() {
            var item = list.querySelector('.calc-sv-item.calc-on'), tool, raw, n = {}, out, inputs, fields, bad = [];
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
                if (f.fn || f.text || f.date || f.area) return;
                v = text ? CalcMaths.number(text, engine.comma, deg, f.inf) : f.def !== undefined ? f.def : NaN;
                if (box) box.classList.toggle('calc-bad', !!text && isNaN(v));
                if (box && text && isNaN(v)) bad.push(f.name || f.aria || (f.l || '').replace(/<[^>]*>/g, '')); // name: for a label that does not read in a note
                n[f.k] = v;
            });
            out = tool.run(n, raw);
            if (item.querySelector('.calc-sv-example')) { // Example while the boxes are empty: it would type over what is in them
                item.querySelector('.calc-sv-example').hidden = fields.some(function (f) { return !f.head && !f.choice && raw[f.k]; });
            }
            if (out.warn && !(out.bad || []).length && !fields.some(function (f) { return !f.head && !f.choice && !f.shape && raw[f.k]; })) {
                out.warn = false; // nothing typed yet, only the boxes' defaults, as a matrix of 0s: no error until something is
                out.note = '';
            }
            if (bad.length) { // what is wrong first: the box, or boxes, that are not numbers
                out.note = bad.length > 2 ? bad.length + ' boxes are not numbers.' :
                    bad.length === 2 ? bad[0] + ' and ' + bad[1] + ' are not numbers.' : bad[0] + ' is not a number.';
                out.warn = true;
            }
            inputs.forEach(function (box) {
                if (fields.some(function (f) { return f.k === box.dataset.k && (f.fn || f.text || f.date || f.area); })) box.classList.toggle('calc-bad', (out.bad || []).indexOf(box.dataset.k) > -1);
            });
            rows = out.rows;
            item.querySelector('.calc-sv-results').hidden = !out.rows.length;
            item.querySelector('.calc-sv-grid').style.gridTemplateColumns = out.cols ? 'repeat(' + out.cols + ', 1fr)' : ''; // two, for an x and a y side by side
            item.querySelector('.calc-sv-grid').innerHTML = out.rows.map(tile).join('');
            [].forEach.call(item.querySelectorAll('.calc-sv-tile'), function (el) {
                el.row = out.rows[+el.dataset.r]; // for its tip
            });
            [].forEach.call(item.querySelectorAll('.calc-sv-value, .calc-sv-tile:not(.calc-sv-table) .calc-sv-cell'), function (shown) { // of a matrix of more than 5 columns, kept at 10px
                var value = !shown.classList.contains('calc-sv-cell'), size = value ? 17 : shown.parentNode.classList.contains('calc-sv-many') ? 10 : 15;
                while (size > (value ? 13 : 12) && tooWide(shown)) shown.style.fontSize = --size + 'px'; // a long one gets smaller, as on the display, a little: to 13px, a cell to 12
            });
            [].forEach.call(item.querySelectorAll('.calc-sv-table .calc-sv-cells'), function (table) { // a table all one size, as small as its longest number of each column needs
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
            item.querySelector('.calc-sv-note').textContent = pasted || out.note || '';
            item.querySelector('.calc-sv-note').classList.toggle('calc-sv-warn', !!(pasted || out.warn));
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
                        '" data-b="' + b + '" title="Bit ' + b + '">' + bits.charAt(r.flip.n - 1 - b) + '</span>';
                }
                shown += '</span></span>';
                return '<div class="calc-sv-tile calc-sv-wide calc-sv-flip" data-r="' + i + '"><span class="calc-sv-label">' + r.l + '</span>' + shown + '</div>';
            }
            if (r.m !== undefined) { // of more than 5 columns, smaller, to fit the tile; a table under its heads, scrolling down
                many = r.m && r.m[0].length > 5;
                shown = r.m ? '<span class="calc-sv-cells' + (many ? ' calc-sv-many' : '') + '" style="--cols: ' + r.m[0].length + '">' + (r.head || []).map(function (h) {
                    return '<span class="calc-sv-th">' + h + '</span>';
                }).join('') + r.m.map(function (row, a) {
                    return row.map(function (x, b) { // to 10 digits, so a row of them fits, of more than 5 columns to as many characters as its cell has room for, the whole number in its title; or to its places, as money to the cent, but a table's first column, its years; a click puts it in whole
                        return '<span class="calc-sv-cell" data-a="' + a + '" data-b="' + b + '"' + (many ? ' title="' + local(String(x)) + '"' : '') + '>' +
                            (r.places !== undefined && !(r.head && !b) ? placesValue(x, r.places) : statsValue(many ? fitted(x, r.m[0].length > 8 ? 5 : 7) : +x.toPrecision(10))).html + '</span>';
                    }).join('');
                }).join('') + '</span>' : '<span class="calc-sv-value">–</span>';
            } else {
                shown = '<span class="calc-sv-value">' + (r.text !== undefined ? r.text : known ? (r.places !== undefined ? placesValue(r.v, r.places) : statsValue(r.v)).html : '–') + '</span>';
            }
            return '<div class="calc-sv-tile' + (r.m !== undefined || r.wide ? ' calc-sv-wide' : '') + (r.m ? ' calc-sv-matrix' : r.copy ? ' calc-sv-copies' : '') + (r.bits ? ' calc-sv-bits' : '') + (r.wrap ? ' calc-sv-wrap' : '') +
                (r.head ? ' calc-sv-table' : '') + (known && !r.m ? '' : ' calc-none') + '" data-r="' + i + '"><span class="calc-sv-label">' + r.l +
                (r.m ? r.head ? '<span class="calc-sv-copy" role="button">Copy table</span>' : '</span><span class="calc-sv-copy calc-sv-copy-m" role="button">Copy' :
                    r.copy ? '</span><span class="calc-sv-copy calc-sv-copy-m calc-sv-copy-t" role="button">Copy' : '') + '</span>' + shown + '</div>';
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
            if (row && now.side && now.side() && row.parentNode.classList.contains('calc-on')) return; // beside the list it stays open
            if (row) return openTool(row.parentNode.classList.contains('calc-on') ? null : row.parentNode);
            if (e.target.closest('.calc-sv-example')) return example(e.target.closest('.calc-sv-item'));
            if (e.target.closest('.calc-sv-again')) {
                svAgain = true;
                run();
                svAgain = false;
                return;
            }
            if (e.target.closest('.calc-sv-opt')) return choose(e.target.closest('.calc-sv-opt'));
            r = t && rows[+t.dataset.r];
            if (e.target.closest('.calc-sv-copy') && r && r.m) return copy(tableText(r));
            if (e.target.closest('.calc-sv-copy') && r && r.copy) return copy(r.copy);
            if (bit && r && r.flip) return flip(t, r.flip, +bit.dataset.b);
            v = !r ? NaN : r.m ? (cell ? r.m[+cell.dataset.a][+cell.dataset.b] : NaN) : r.text === undefined ? r.v : NaN;
            if (!isFinite(v) || !engine.put(v)) return;
            keyBoard['AC'].children[0].firstChild.data = 'C';
            now.done();
            refresh();
            saveState();
        }, false);

        // a card's example in its boxes, in place of what was typed, with the decimal mark in use
        function example(item) {
            var tool = tools[tab][+item.dataset.i];
            values[tool.id] = {};
            Object.keys(tool.example).forEach(function (k) { values[tool.id][k] = local(tool.example[k]); });
            boxes(tool, item);
            run();
            keep();
        }

        // one of the ways of a choice chosen: kept as a box's text is, and the results
        function choose(opt) {
            var item = opt.closest('.calc-sv-item'), tool = tools[tab][+item.dataset.i], k = opt.parentNode.dataset.k, again;
            values[tool.id] = values[tool.id] || {};
            values[tool.id][k] = opt.dataset.c;
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
                    'Up to 10×10: from row ' + c.i + ', column ' + c.j + ' this one of ' + got.cells.length + '×' + got.cells[0].length + ' does not fit.';
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
            tab: function () { return tab; },
            setTab: function (t) {
                tab = t;
                render();
                keep();
            },
            // a tool's card, on its tab, to open with these in its boxes, as { eq: 'x^2 = 4' }: it opens as the panel renders.
            // False with no such tool
            put: function (id, kept) {
                var t, found = Object.keys(tools).filter(function (k) {
                    return tools[k].some(function (tool) { return tool.id === id; });
                });
                if (!found.length) return false;
                values[id] = {};
                for (t in kept) values[id][t] = String(kept[t]);
                tab = found[0];
                openId = id;
                keep();
                return true;
            },
            // the first box of the card open, to type in
            focus: function () {
                var box = list.querySelector('.calc-sv-item.calc-on input');
                if (box && focusBox(box)) box.select();
            },
            // the tip of a card, open or not: what it gives; of a way of a choice, of Copy table, of Copy and of Example, what they do
            tip: function (el) {
                var tool;
                if (el.classList.contains('calc-sv-opt')) return CalcTips['choice ' + el.parentNode.dataset.k + ' ' + el.dataset.c] || null;
                if (el.classList.contains('calc-sv-example')) return CalcTips['card example'];
                if (el.classList.contains('calc-sv-copy')) return CalcTips[el.classList.contains('calc-sv-copy-t') ? 'text copy' : el.classList.contains('calc-sv-copy-m') ? 'matrix copy' : 'table copy'];
                if (!el.classList.contains('calc-sv-row')) return null;
                if (el.parentNode.classList.contains('calc-on') && now.side && now.side()) return null; // beside the list, what it does is at the top of its card
                tool = tools[tab][+el.parentNode.dataset.i];
                return { t: tool.t, d: tool.d + (el.parentNode.classList.contains('calc-on') ? ' Click to close it.' : ' Click to open it.'), k: '' };
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
                if (cards.put(id, kept)) show(true);
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

    var solver = toolPanel(solvePanel, solveButton, SOLVE_TOOLS, 'solve', 'solve'),
        numbers = toolPanel(numbersPanel, numbersButton, NUMBER_TOOLS, 'numbers', 'numbers', true),
        toolPanels = [solver, numbers];

    function showSolve(open) {
        solver.show(open);
    }

    function showNumbers(open) {
        numbers.show(open);
    }

    // ---------------- chemistry ---------------- //

    // The periodic table, and the chemistry worked out with it (chem.js), on tabs: a card for each tool, as the
    // solver has. A formula is typed as it is written, CuSO4·5H2O, Ca(OH)2, Fe^3+; an equation with = or →
    var CHEM_PH = ['[H<sup>+</sup>]', '[OH<sup>–</sup>]', 'pH', 'pOH'],
        GAS_R = [0.082057366080960, 8.314462618, 62.363598221529, 0.08314462618], // L·unit/(mol·K): atm, kPa, mmHg, bar
        // of each solvent of the freezing and boiling point, its formula on its button: Kf and Kb in °C·kg/mol, the points
        // it freezes and boils at, °C, and its name
        SOLVENTS = [[1.86, 0.512, 0, 100, 'Water'], [5.12, 2.53, 5.5, 80.1, 'Benzene'], [20.0, 2.79, 6.6, 80.7, 'Cyclohexane']],
        CHEM_TOOLS = {
            mass: [
                { id: 'molar', t: 'Molar mass', f: ['M', '% by mass'], d: 'The molar mass of a formula, in g/mol, and how much of it each element is: CuSO4·5H2O, Ca(OH)2, (NH4)2SO4, K4[Fe(CN)6]. An ion\'s charge after ^, Fe^3+.',
                    fields: [{ k: 'f', l: 'Formula', ph: 'CuSO4·5H2O', fn: true }], run: runMolar, example: { f: 'Ca(OH)2' } },
                { id: 'moles', t: 'Grams and moles', f: ['n = m ÷ M', 'N = n N<sub>A</sub>'], d: 'Mass, moles and particles of a substance: type one, and the others are worked out from its molar mass and the Avogadro constant.',
                    fields: [{ k: 'f', l: 'Formula', ph: 'H2O', fn: true }, { k: 'm', l: 'Mass, g', ph: 'or' }, { k: 'n', l: 'Moles', ph: 'or' }, { k: 'p', l: 'Particles', ph: 'or' }], cols: 3,
                    run: runMoles, example: { f: 'H2O', m: '36' } },
                { id: 'empirical', t: 'Empirical formula', f: ['CH<sub>2</sub>O', 'C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>'], d: 'The simplest formula of a composition, the percent or grams of each element: C 40, H 6.71, O 53.29. With its molar mass, the molecular formula as well.',
                    fields: [{ k: 'c', l: 'Composition', ph: 'C 40, H 6.71, O 53.29', fn: true }, { k: 'M', l: 'Molar mass', ph: 'optional' }], run: runEmpirical,
                    example: { c: 'C 40, H 6.71, O 53.29', M: '180.16' } }
            ],
            reactions: [
                { id: 'balance', t: 'Balance an equation', f: 'Fe + O<sub>2</sub> → Fe<sub>2</sub>O<sub>3</sub>', d: 'The smallest whole numbers in front of each formula, so each element and the charge are the same on both sides; and what kind of reaction it is. ' +
                    'Write = or → between the sides, + between the formulas; ions with their charge, Fe^3+, and e- for an electron.',
                    fields: [{ k: 'eq', ph: 'Fe + O2 = Fe2O3', fn: true }], run: runBalance, example: { eq: 'C3H8 + O2 = CO2 + H2O' } },
                { id: 'stoich', t: 'Amounts and limiting reactant', f: ['g ⇄ mol', 'limiting', '% yield'], d: 'From the amount of one formula, all the others of the reaction. Of two reactants or more, the one that runs out first and what is left of the others; ' +
                    'of a product as well, its percent yield. Amounts in g, or with kg, mg or mol after them: Fe 10, O2 5 g.',
                    fields: [{ k: 'eq', l: 'Equation', ph: 'Fe + O2 = Fe2O3', fn: true }, { k: 'a', l: 'Amounts', ph: 'Fe 10 g, O2 5 g', fn: true }], run: runStoich,
                    example: { eq: 'N2 + H2 = NH3', a: 'N2 28 g, H2 10 g, NH3 25 g' } },
                { id: 'worksheet', t: 'Worksheet', f: ['Practice', 'Answer key'], d: 'Equations to balance, or to name the kind of reaction of, at three levels, with the answers under them to check by. ' +
                    'Again for new ones; Copy for the questions or the answers, to print.',
                    fields: [{ k: 'ex', l: 'Exercise', choice: ['Balance', 'Kind', 'Both'] }, { k: 'lv', l: 'Level', choice: ['Easy', 'Medium', 'Hard'] },
                        { k: 'n', l: 'Questions', choice: ['5', '10', '20'], at: 1 }], again: true, run: runWorksheet },
                { id: 'heat', t: 'Heat', f: 'q = mcΔT', d: 'The heat that warms or cools a mass, as in a calorimeter: leave one of q, m, c and ΔT empty and it is worked out. c of water is 4.184 J/(g·°C).',
                    fields: [{ k: 'q', l: 'q, J', ph: 'or' }, { k: 'm', l: 'm, g', ph: 'or' }, { k: 'c', l: 'c, J/(g·°C)', ph: 'or' }, { k: 't', l: 'ΔT, °C', ph: 'or' }], cols: 2,
                    run: runHeat, example: { m: '100', c: '4.184', t: '25' } },
                { id: 'decay', t: 'Half-life', f: 'N = N<sub>0</sub>(½)<sup>t ÷ t½</sup>', d: 'What is left of a radioactive substance, or of a first-order reaction, after a time: leave one of N₀, N, t and t½ empty. The same unit of time for t and t½.',
                    fields: [{ k: 'n0', l: 'N<sub>0</sub>', name: 'N₀', ph: 'or' }, { k: 'n', l: 'N', ph: 'or' }, { k: 't', l: 't', ph: 'or' }, { k: 'h', l: 't½', ph: 'or' }], cols: 2,
                    run: runDecay, example: { n0: '100', t: '10', h: '5.27' } }
            ],
            solutions: [
                { id: 'molarity', t: 'Molarity', f: 'c = n ÷ V', d: 'The concentration of a solution, in mol/L: leave one of mass, volume and molarity empty. Without a formula, type moles in place of the mass.',
                    fields: [{ k: 'f', l: 'Formula', ph: 'NaCl', fn: true }, { k: 'm', l: 'Mass, g', ph: 'or' }, { k: 'n', l: 'Moles', ph: 'or' }, { k: 'v', l: 'Volume, L', ph: 'or' }, { k: 'c', l: 'mol/L', ph: 'or' }], cols: 2,
                    run: runMolarity, example: { f: 'NaCl', m: '5.844', v: '0.25' } },
                { id: 'dilution', t: 'Dilution', f: 'C<sub>1</sub>V<sub>1</sub> = C<sub>2</sub>V<sub>2</sub>', d: 'A solution made weaker with water: leave one of the four empty and it is worked out. The same units on both sides.',
                    fields: [{ k: 'c1', l: 'C<sub>1</sub>', name: 'C₁', ph: 'or' }, { k: 'v1', l: 'V<sub>1</sub>', name: 'V₁', ph: 'or' }, { k: 'c2', l: 'C<sub>2</sub>', name: 'C₂', ph: 'or' }, { k: 'v2', l: 'V<sub>2</sub>', name: 'V₂', ph: 'or' }], cols: 2,
                    run: runDilution, example: { c1: '2', v1: '50', c2: '0.5' } },
                { id: 'colligative', t: 'Freezing and boiling point', f: 'ΔT = i K m', d: 'How far a solute lowers the freezing point of a solvent and raises its boiling point: from the molality, ' +
                    'or the grams of solute, its formula and the kg of solvent; or back from ΔT<sub>f</sub> or ΔT<sub>b</sub>, with the grams and kg, to the solute\'s molar mass. i is the particles of each formula unit, from the formula, NaCl 2.',
                    fields: function (raw) {
                        return [{ k: 's', l: 'Solvent', choice: ['H<sub>2</sub>O', 'C<sub>6</sub>H<sub>6</sub>', 'C<sub>6</sub>H<sub>12</sub>', 'Other'] }].concat(raw.s === '3' ? [{ k: 'kf', l: 'K<sub>f</sub>', name: 'Kf', ph: '1.86' }, { k: 'kb', l: 'K<sub>b</sub>', name: 'Kb', ph: '0.512' }] : [],
                            [{ k: 'f', l: 'Solute', ph: 'NaCl, optional', fn: true }, { k: 'g', l: 'Solute, g', ph: 'or' }, { k: 'kg', l: 'Solvent, kg', ph: '0.5' },
                                { k: 'm', l: 'm, mol/kg', name: 'm', ph: 'or' }, { k: 'i', l: 'i', ph: 'auto' }, { k: 'tf', l: 'ΔT<sub>f</sub>, °C', name: 'ΔTf', ph: 'or' }, { k: 'tb', l: 'ΔT<sub>b</sub>, °C', name: 'ΔTb', ph: 'or' }]);
                    }, cols: 2, run: runColligative, example: { f: 'NaCl', g: '10', kg: '0.5' } },
                { id: 'ph', t: 'pH', f: CHEM_PH, d: 'pH, pOH, [H⁺] and [OH⁻] from any one of them, in water at 25 °C, where pH + pOH = 14.',
                    fields: [{ k: 'x', l: 'Value', ph: '0.001' }, { k: 'of', l: 'Of', choice: CHEM_PH }], run: runPh },
                { id: 'weak', t: 'Weak acid or base', f: ['K<sub>a</sub>', 'K<sub>b</sub>'], d: 'The pH of a weak acid or base from its K<sub>a</sub> or K<sub>b</sub> and its concentration, by the quadratic, not the ½ log approximation; and how much of it ionizes.',
                    fields: [{ k: 'k', l: 'K', ph: '1.8e-5' }, { k: 'c', l: 'mol/L', ph: '0.1' }, { k: 'is', l: 'It is', choice: ['An acid, K<sub>a</sub>', 'A base, K<sub>b</sub>'] }], cols: 2,
                    run: runWeak, example: { k: '1.8e-5', c: '0.1' } },
                { id: 'buffer', t: 'Buffer', f: 'pH = pK<sub>a</sub> + log([A<sup>–</sup>] ÷ [HA])', d: 'The pH of a buffer, by Henderson–Hasselbalch: its acid HA and its base A⁻. pK<sub>a</sub>, or K<sub>a</sub>, which it takes too.',
                    fields: [{ k: 'pka', l: 'pK<sub>a</sub>', name: 'pKa', ph: '4.76' }, { k: 'a', l: '[A<sup>–</sup>]', name: '[A⁻]', ph: '0.1' }, { k: 'ha', l: '[HA]', ph: '0.1' }], cols: 3,
                    run: runBuffer, example: { pka: '4.76', a: '0.15', ha: '0.1' } },
                { id: 'soluble', t: 'Solubility', f: ['PbI<sub>2</sub>', 'BaSO<sub>4</sub>'], d: 'Whether a salt dissolves in water, by the usual table at 25 °C, and the rule: ' +
                    'the nitrates, acetates, halides, sulfates, carbonates, phosphates, hydroxides and sulfides of 20 common cations, Li⁺ to Pb²⁺.',
                    fields: [{ k: 'f', l: 'Salt', ph: 'PbI2', fn: true }], run: runSoluble, example: { f: 'BaSO4' } }
            ],
            ions: [
                { id: 'ion', t: 'Ions', f: ['NH<sub>4</sub><sup>+</sup>', 'SO<sub>4</sub><sup>2−</sup>', 'Fe<sup>3+</sup>'], d: 'A common ion by its formula or its name, sulfate, ferric, bicarbonate: its charge and molar mass, ' +
                    'its colour in water and the colour it gives a flame. Empty, all of them.',
                    fields: [{ k: 'f', l: 'Ion', ph: 'SO4^2- or sulfate', fn: true }], run: runIon, example: { f: 'MnO4^-' } },
                { id: 'names', t: 'Names and formulas', f: ['Fe<sub>2</sub>O<sub>3</sub>', 'iron(III) oxide'], d: 'The name of a formula, or the formula of a name: salts, a metal of more than one charge ' +
                    'with it in Roman numerals; acids; two nonmetals with Greek prefixes, dinitrogen tetroxide; hydrates, ions, the elements and common names, water, ammonia.',
                    fields: [{ k: 'f', l: 'Formula or name', ph: 'CuSO4·5H2O or sodium carbonate', fn: true }], run: runNames, example: { f: 'Fe2(SO4)3' } },
                { id: 'oxidation', t: 'Oxidation numbers', f: ['KMnO<sub>4</sub>', 'Mn +7'], d: 'The oxidation number of each element of a formula or an ion, by the rules: an element alone 0; F −1; ' +
                    'groups 1 and 2 +1 and +2; H +1, −1 with metals; O −2, −1 in a peroxide; and the rest so they add up to the charge.',
                    fields: [{ k: 'f', l: 'Formula', ph: 'K2Cr2O7 or SO4^2-', fn: true }], run: runOxidation, example: { f: 'K2Cr2O7' } }
            ],
            gases: [
                { id: 'gas', t: 'Ideal gas', f: 'PV = nRT', d: 'A gas as the ideal gas law has it: leave one of P, V, n and T empty and it is worked out. V in litres; with a formula, the mass and density as well.',
                    fields: [{ k: 'p', l: 'P', ph: 'or' }, { k: 'v', l: 'V, L', ph: 'or' }, { k: 'n', l: 'n, mol', ph: 'or' }, { k: 't', l: 'T', ph: 'or' },
                        { k: 'pu', l: 'P in', choice: ['atm', 'kPa', 'mmHg', 'bar'] }, { k: 'tu', l: 'T in', choice: ['K', '°C'] }, { k: 'f', l: 'Formula', ph: 'optional', fn: true }], cols: 2,
                    run: runGas, example: { p: '1', n: '1', t: '273.15' } },
                { id: 'gases', t: 'Combined gas law', f: 'P<sub>1</sub>V<sub>1</sub>/T<sub>1</sub> = P<sub>2</sub>V<sub>2</sub>/T<sub>2</sub>', d: 'A gas whose pressure, volume or temperature changes: leave one of the six empty. Boyle\'s, Charles\'s and Gay-Lussac\'s laws are each of it, the others the same.',
                    fields: [{ k: 'p1', l: 'P<sub>1</sub>', name: 'P₁', ph: 'or' }, { k: 'v1', l: 'V<sub>1</sub>', name: 'V₁', ph: 'or' }, { k: 't1', l: 'T<sub>1</sub>', name: 'T₁', ph: 'or' },
                        { k: 'p2', l: 'P<sub>2</sub>', name: 'P₂', ph: 'or' }, { k: 'v2', l: 'V<sub>2</sub>', name: 'V₂', ph: 'or' }, { k: 't2', l: 'T<sub>2</sub>', name: 'T₂', ph: 'or' },
                        { k: 'tu', l: 'T in', choice: ['K', '°C'] }], cols: 3,
                    run: runGases, example: { p1: '1', v1: '2', t1: '300', p2: '2', t2: '600' } }
            ]
        };

    // a formula in a box: what is wrong with it, to say in the note
    function formulaWhy(r, box) {
        return r.error === 'element' ? r.symbol + ' is no element: symbols start with a capital, Co for cobalt, CO for carbon monoxide.' :
            r.error === 'brackets' ? 'A bracket is not closed, or closed by another kind.' :
                r.error === 'empty' ? '' : (box || 'The formula') + ' is not a formula yet: CuSO4·5H2O, Ca(OH)2, Fe^3+.';
    }

    function runMolar(n, raw) {
        var r, none = [{ l: 'g/mol', v: NaN }];
        if (!raw.f) return { rows: none };
        r = CalcChem.molarMass(raw.f);
        if (r.error) return { rows: none, bad: ['f'], warn: r.error !== 'empty', note: formulaWhy(r) };
        return {
            rows: [{ l: 'g/mol', v: CalcMaths.round(r.mass) }, { l: 'Atoms', v: r.parts.reduce(function (s, p) { return s + p.n; }, 0) },
                { l: 'Formula', text: CalcChem.html(raw.f), copy: CalcChem.plain(raw.f) }].concat(r.parts.map(function (p) {
                return { l: '% ' + p.s + (p.n > 1 ? ' × ' + p.n : ''), v: +p.percent.toFixed(3) };
            })),
            note: (r.electron ? 'An electron\'s mass is left out, as tables of molar mass do. ' : '') + (r.unstable ? 'An element with no stable isotope has the mass number of its longest-lived one.' : '')
        };
    }

    // the molar mass of a box's formula, or the note of why there is none
    function massOf(raw, k) {
        var r = raw[k] ? CalcChem.molarMass(raw[k]) : { error: 'empty' };
        return r.error ? { why: formulaWhy(r), bad: r.error !== 'empty' } : { M: r.mass };
    }

    function runMoles(n, raw) {
        var M = massOf(raw, 'f'), given = ['m', 'n', 'p'].filter(function (k) { return raw[k]; }), mol;
        if (M.why !== undefined) return { rows: [{ l: 'g/mol', v: NaN }], bad: M.bad ? ['f'] : [], warn: M.bad, note: M.why || 'Type a formula, then a mass, moles or particles.' };
        if (given.length > 1) return { rows: [{ l: 'g/mol', v: CalcMaths.round(M.M) }], warn: true, note: 'Type one of mass, moles and particles: the others are worked out.' };
        mol = given[0] === 'm' ? n.m / M.M : given[0] === 'n' ? n.n : given[0] === 'p' ? n.p / CalcChem.avogadro : NaN;
        return { rows: [{ l: 'g/mol', v: CalcMaths.round(M.M) }, { l: 'Mass, g', v: mol * M.M }, { l: 'Moles', v: mol }, { l: 'Particles', v: mol * CalcChem.avogadro }],
            note: given.length ? '' : 'Type a mass, moles or particles.' };
    }

    function runEmpirical(n, raw) {
        var r, none = [{ l: 'Empirical', v: NaN }];
        if (!raw.c) return { rows: none };
        r = CalcChem.empirical(raw.c, engine.comma, raw.M ? n.M : 0);
        if (r.error) {
            return { rows: none, bad: ['c'], warn: true, note: r.error === 'element' ? r.at + ' is no element.' : r.error === 'zero' ? r.at + ' needs an amount above 0.' :
                'Each element and its percent or grams: C 40' + (engine.comma ? '; ' : ', ') + 'H 6.71' + (engine.comma ? '; ' : ', ') + 'O 53.29.' };
        }
        return {
            rows: [{ l: 'Empirical', text: r.html, copy: r.plain }, { l: 'Its g/mol', v: CalcMaths.round(r.M) }]
                .concat(r.molecular ? [{ l: 'Molecular', text: r.molecularHtml, copy: r.molecularPlain }, { l: 'Its g/mol', v: CalcMaths.round(r.M * r.n) }, { l: 'Times', v: r.n }] : []),
            note: r.off ? 'The molar mass is not a whole number of times the empirical formula\'s: the nearest is taken.' : 'Moles of each, divided by the least: ' +
                r.parts.map(function (p, i) { return p.s + ' ' + local(String(+r.ratio[i].toFixed(2))); }).join(', ') + '.'
        };
    }

    // what is wrong with an equation, for the note
    function equationWhy(r) {
        return r.error === 'arrow' ? 'Write = or → between its two sides.' : r.error === 'arrows' ? 'One = or → only, between its two sides.' :
            r.error === 'side' ? 'A formula on each side.' : r.error === 'formula' ? (formulaWhy(r.why, r.formula) || r.formula + ' is not a formula.') :
                r.error === 'one side' ? r.element + ' is on one side only: it cannot be balanced.' :
                    r.error === 'many' ? 'It balances in more than one way: it is two reactions or more. Write each of them.' :
                        'It cannot be balanced as written: a formula may be on the wrong side, or one is missing.';
    }

    function runBalance(n, raw) {
        var r, none = [{ l: 'Balanced', v: NaN, wide: true }], rows, mass = function (side) {
            return side.reduce(function (s, x) { return s + x.k * CalcChem.molarMass(x.t).mass; }, 0);
        };
        if (!raw.eq) return { rows: none };
        r = CalcChem.balance(raw.eq);
        if (r.error) return { rows: none, bad: ['eq'], warn: true, note: equationWhy(r) };
        rows = [{ l: 'Balanced', text: r.html, copy: r.text, wide: true }];
        if (r.kind) rows.push({ l: 'Kind', text: r.kind, wide: true });
        if (r.redox) { // each element whose oxidation number goes up, then down: Cl −1 → 0
            [['oxidized', 'Oxidized'], ['reduced', 'Reduced']].forEach(function (way) {
                if (r.redox[way[0]].length) rows.push({ l: way[1], text: r.redox[way[0]].map(function (x) { return x.s + ' ' + x.from + ' → ' + x.to; }).join(', '), wide: true });
            });
        }
        return { rows: rows.concat(r.left.concat(r.right).map(function (x) { return { l: CalcChem.html(x.t), v: x.k }; }),
            [{ l: 'Reactants, g', v: CalcMaths.round(mass(r.left)) }, { l: 'Products, g', v: CalcMaths.round(mass(r.right)) }]),
            note: r.many ? 'It balances in more than one way: this is one, the sum of the others.' : 'The numbers of each formula, then the mass of each side, which are the same.' };
    }

    function runStoich(n, raw) {
        var b, read, r, none = [{ l: 'Balanced', v: NaN, wide: true }], rows;
        if (!raw.eq) return { rows: none };
        b = CalcChem.balance(raw.eq);
        if (b.error) return { rows: none, bad: ['eq'], warn: true, note: equationWhy(b) };
        rows = [{ l: 'Balanced', text: b.html, copy: b.text, wide: true }];
        if (!raw.a) return { rows: rows, note: 'Type the amount of a formula, or of each reactant: ' + CalcChem.plain(b.left[0].t) + ' 10 g.' };
        read = CalcChem.readAmounts(raw.a, engine.comma);
        if (read.error) return { rows: rows, bad: ['a'], warn: true, note: read.error + ' is not a formula and an amount: Fe 10 g, or O2 0.5 mol.' };
        r = CalcChem.amounts(raw.eq, read.list);
        if (r.error === 'not in') return { rows: rows, bad: ['a'], warn: true, note: r.t + ' is not in the equation.' };
        if (r.error) return { rows: rows, note: 'Type the amount of a formula, or of each reactant.' };
        if (r.limiting) rows.push({ l: 'Limiting reactant', text: CalcChem.html(r.limiting), wide: true });
        if (r.percent !== undefined) rows.push({ l: '% yield of ' + CalcChem.html(r.yieldOf), v: +r.percent.toFixed(2), wide: true });
        r.rows.forEach(function (x) {
            rows.push({ l: CalcChem.html(x.t) + ', g', v: CalcMaths.round(x.g) }, { l: CalcChem.html(x.t) + ', mol', v: CalcMaths.round(x.mol) });
            if (x.left > 1e-12 * x.given) rows.push({ l: CalcChem.html(x.t) + ' left, g', v: CalcMaths.round(x.left * x.M), wide: true });
        });
        return { rows: rows, cols: 2, note: r.limiting ? 'What it takes and makes, until ' + CalcChem.plain(r.limiting) + ' runs out.' : r.percent !== undefined ? 'What the reaction gives, against what was got.' : '' };
    }

    // the one box of a few that is empty, to work out; a note if not one alone is. names: what each is called
    function oneEmpty(raw, keys, names) {
        var empty = keys.filter(function (k) { return !raw[k]; });
        if (empty.length === 1) return { k: empty[0] };
        return { note: (empty.length ? 'Leave only one of ' : 'Leave one of ') + names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' empty, the one to work out.', warn: !empty.length };
    }

    function runHeat(n, raw) {
        var e = oneEmpty(raw, ['q', 'm', 'c', 't'], ['q', 'm', 'c', 'ΔT']), v;
        if (!e.k) return { rows: [{ l: 'q, J', v: NaN }], warn: e.warn, note: e.note };
        v = { q: n.m * n.c * n.t, m: n.q / (n.c * n.t), c: n.q / (n.m * n.t), t: n.q / (n.m * n.c) }[e.k];
        return { rows: [{ l: { q: 'q, J', m: 'm, g', c: 'c, J/(g·°C)', t: 'ΔT, °C' }[e.k], v: v }].concat(e.k === 'q' ? [{ l: 'q, kJ', v: v / 1000 }] : []),
            warn: !isFinite(v), note: !isFinite(v) ? 'None: a box it is divided by is 0.' : e.k === 'q' ? (v < 0 ? 'Below 0: heat given out.' : 'Heat taken in.') : '' };
    }

    function runDecay(n, raw) {
        var e = oneEmpty(raw, ['n0', 'n', 't', 'h'], ['N₀', 'N', 't', 't½']), v, k, bad;
        if (!e.k) return { rows: [{ l: 'N', v: NaN }], warn: e.warn, note: e.note };
        v = { n: n.n0 * Math.pow(0.5, n.t / n.h), n0: n.n / Math.pow(0.5, n.t / n.h), t: n.h * Math.log(n.n0 / n.n) / Math.LN2, h: n.t * Math.LN2 / Math.log(n.n0 / n.n) }[e.k];
        k = Math.LN2 / (e.k === 'h' ? v : n.h);
        bad = !isFinite(v) || ((e.k === 't' || e.k === 'h') && v < 0); // N above N₀ would take a negative time
        return { rows: [{ l: { n: 'N', n0: 'N₀', t: 't', h: 't½' }[e.k], v: v }, { l: 'Decay constant λ', v: k }, { l: '% left', v: CalcMaths.round(100 * (e.k === 'n' ? v / n.n0 : e.k === 'n0' ? n.n / v : n.n / n.n0)) }],
            warn: bad, note: bad ? 'None: N is less than N₀, both above 0, and t½ above 0.' : '' };
    }

    function runMolarity(n, raw) {
        var M = raw.f ? massOf(raw, 'f') : {}, hasMass = !!raw.m, mol, e, v;
        if (M.why) return { rows: [{ l: 'mol/L', v: NaN }], bad: M.bad ? ['f'] : [], warn: true, note: M.why };
        if (raw.m && raw.n) return { rows: [{ l: 'mol/L', v: NaN }], warn: true, note: 'Type the mass or the moles, not both.' };
        if (raw.m && !M.M) return { rows: [{ l: 'mol/L', v: NaN }], warn: true, note: 'A formula to turn the mass into moles, or the moles in place of the mass.' };
        e = oneEmpty({ a: raw.m || raw.n, v: raw.v, c: raw.c }, ['a', 'v', 'c'], [M.M ? 'mass' : 'moles', 'volume', 'molarity']);
        if (!e.k) return { rows: [{ l: 'mol/L', v: NaN }], warn: e.warn, note: e.note };
        mol = hasMass ? n.m / M.M : n.n;
        if (e.k === 'c') v = mol / n.v;
        else if (e.k === 'v') v = mol / n.c;
        else mol = v = n.c * n.v;
        var rows = [{ l: e.k === 'c' ? 'mol/L' : e.k === 'v' ? 'Volume, L' : 'Moles', v: v }];
        if (e.k === 'v') rows.push({ l: 'Volume, mL', v: v * 1000 });
        if (e.k !== 'a') rows.push({ l: 'Moles', v: mol });
        if (M.M) rows.push({ l: 'Mass, g', v: mol * M.M }, { l: 'g/L', v: (e.k === 'c' ? v : n.c) * M.M });
        return { rows: rows, warn: !isFinite(v), note: !isFinite(v) ? 'None: a box it is divided by is 0.' : '' };
    }

    function runDilution(n, raw) {
        var e = oneEmpty(raw, ['c1', 'v1', 'c2', 'v2'], ['C₁', 'V₁', 'C₂', 'V₂']), v;
        if (!e.k) return { rows: [{ l: 'C₂', v: NaN }], warn: e.warn, note: e.note };
        v = { c1: n.c2 * n.v2 / n.v1, v1: n.c2 * n.v2 / n.c1, c2: n.c1 * n.v1 / n.v2, v2: n.c1 * n.v1 / n.c2 }[e.k];
        return { rows: [{ l: { c1: 'C₁', v1: 'V₁', c2: 'C₂', v2: 'V₂' }[e.k], v: v }].concat(e.k === 'v2' ? [{ l: 'Water to add', v: v - n.v1 }] : e.k === 'v1' ? [{ l: 'Water to add', v: n.v2 - v }] : []),
            warn: !isFinite(v), note: !isFinite(v) ? 'None: a box it is divided by is 0.' : '' };
    }

    // pH, pOH, [H⁺] and [OH⁻] of water at 25 °C, and what kind of solution it is
    function phRows(ph) {
        var rows = [{ l: 'pH', v: CalcMaths.round(ph) }, { l: 'pOH', v: CalcMaths.round(14 - ph) }, { l: '[H<sup>+</sup>]', v: Math.pow(10, -ph) }, { l: '[OH<sup>–</sup>]', v: Math.pow(10, ph - 14) }];
        return { rows: rows, cols: 2, note: !isFinite(ph) ? '' : Math.abs(ph - 7) < 1e-9 ? 'Neutral.' : ph < 7 ? 'Acidic: below 7.' : 'Basic: above 7.' };
    }

    function runPh(n, raw) {
        var of = +raw.of, ph;
        if (!raw.x) return phRows(NaN);
        if (of < 2 && !(n.x > 0)) return { rows: phRows(NaN).rows, cols: 2, bad: [], warn: true, note: 'A concentration above 0.' };
        ph = of === 0 ? -Math.log10(n.x) : of === 1 ? 14 + Math.log10(n.x) : of === 2 ? n.x : 14 - n.x;
        return phRows(ph);
    }

    function runWeak(n, raw) {
        var x, out, acid = raw.is !== '1';
        if (!raw.k || !raw.c) return { rows: phRows(NaN).rows, cols: 2, note: 'Type K and the concentration.' };
        if (!(n.k > 0) || !(n.c > 0)) return { rows: phRows(NaN).rows, cols: 2, warn: true, note: 'K and the concentration above 0.' };
        x = (-n.k + Math.sqrt(n.k * n.k + 4 * n.k * n.c)) / 2; // of x² ÷ (c − x) = K
        out = phRows(acid ? -Math.log10(x) : 14 + Math.log10(x));
        out.rows.push({ l: '% ionized', v: CalcMaths.round(100 * x / n.c) }, { l: acid ? 'pK<sub>a</sub>' : 'pK<sub>b</sub>', v: CalcMaths.round(-Math.log10(n.k)) });
        return out;
    }

    function runBuffer(n, raw) {
        var pka = raw.pka && n.pka > 0 && n.pka < 1e-1 && /e|E|^0[.,]/.test(raw.pka) ? -Math.log10(n.pka) : n.pka, ph; // Ka typed in place of pKa
        if (!raw.pka || !raw.a || !raw.ha) return { rows: phRows(NaN).rows.slice(0, 2), cols: 2 };
        if (!(n.a > 0) || !(n.ha > 0)) return { rows: phRows(NaN).rows.slice(0, 2), cols: 2, warn: true, note: '[A⁻] and [HA] above 0.' };
        ph = pka + Math.log10(n.a / n.ha);
        return { rows: phRows(ph).rows.concat([{ l: '[A<sup>–</sup>] ÷ [HA]', v: n.a / n.ha }, { l: 'pK<sub>a</sub>', v: CalcMaths.round(pka) }]), cols: 2,
            note: (pka !== n.pka ? 'K' + 'a was typed: its pKa is taken. ' : '') + (Math.abs(ph - pka) > 1 ? 'More than 1 from pKa: a weak buffer.' : 'Within 1 of pKa: a good buffer.') };
    }

    // The freezing point lowered and the boiling point raised, ΔT = i K m: the molality from one of the molality, the
    // grams of a formula in the kg of solvent, ΔTf and ΔTb; and from a ΔT, with the grams and kg, the solute's molar mass
    function runColligative(n, raw) {
        var other = raw.s === '3', sv = other ? [n.kf, n.kb, NaN, NaN] : SOLVENTS[+raw.s || 0], none = [{ l: 'mol/kg', v: NaN }],
            M = raw.f ? massOf(raw, 'f') : {}, made = raw.f && !M.why ? CalcChem.particles(raw.f) : { i: 1 }, i = raw.i ? n.i : made.i,
            fromMass = !!(raw.g && raw.kg && M.M), given = [raw.m, raw.tf, raw.tb].filter(Boolean).length + (fromMass ? 1 : 0), m, tf, tb, rows;
        if (M.why) return { rows: none, bad: M.bad ? ['f'] : [], warn: true, note: M.why };
        if (other && (!raw.kf || !raw.kb)) return { rows: none, note: 'Type the Kf and Kb of the solvent, in °C·kg/mol.' };
        if (!given) return { rows: none, note: 'Type the molality; or the grams of solute, its formula and the kg of solvent; or ΔTf or ΔTb.' };
        if (given > 1) return { rows: none, warn: true, note: 'Type one of the molality, the grams of solute, ΔTf and ΔTb: the others are worked out.' };
        if (!(i > 0)) return { rows: none, warn: true, note: 'i above 0.' };
        m = raw.m ? n.m : fromMass ? n.g / M.M / n.kg : raw.tf ? n.tf / (i * sv[0]) : n.tb / (i * sv[1]);
        tf = i * sv[0] * m;
        tb = i * sv[1] * m;
        rows = [{ l: 'mol/kg', v: m }, { l: 'i', v: i }, { l: 'ΔT<sub>f</sub>, °C', v: tf }, { l: 'ΔT<sub>b</sub>, °C', v: tb }];
        if (!other) rows.push({ l: 'Freezes at, °C', v: CalcMaths.round(sv[2] - tf) }, { l: 'Boils at, °C', v: CalcMaths.round(sv[3] + tb) });
        if (!fromMass && raw.kg && M.M) rows.push({ l: 'Solute, g', v: m * n.kg * M.M });
        if (!fromMass && raw.kg && raw.g && !raw.f) rows.push({ l: 'Solute, g/mol', v: n.g / (m * n.kg) }); // its molar mass, from how far the point moved
        return { rows: rows, cols: 2, warn: !isFinite(m),
            note: !isFinite(m) ? 'None: a box it is divided by is 0.' : raw.f && !raw.i && made.i > 1 ? 'i = ' + made.i + ': ' + CalcChem.plain(raw.f) + ' gives ' + made.i + ' ions, ideally; the real i is a little less.' :
                (other ? '' : sv[4] + ': ') + 'Kf ' + local(String(sv[0])) + ', Kb ' + local(String(sv[1])) + ' °C·kg/mol.' };
    }

    // The table of solubility, each cell its letter in its colour, the salt typed outlined; its key under it
    function solubleTable(ci, ai) {
        var t = CalcChem.solubilityTable();
        return '<span class="calc-sol" style="--cols: ' + (t.anions.length + 1) + '"><span></span>' + t.anions.map(function (a) {
            return '<span class="calc-sol-head" title="' + a.name + '">' + a.ion.replace('CH₃COO', 'CH₃<br>COO') + '</span>'; // on two lines, to fit the popup
        }).join('') + t.cations.map(function (c, i) {
            return '<span class="calc-sol-head calc-sol-side" title="' + c.name + '">' + c.ion + '</span>' + t.letters[i].split('').map(function (x, j) {
                return '<span class="calc-sol-' + (x === 's' ? 'little' : x) + (i === ci && j === ai ? ' calc-on' : '') + '" title="' + c.name + ' ' + t.anions[j].name + ': ' + t.words[x] + '">' + x + '</span>';
            }).join('');
        }).join('') + '</span><span class="calc-sol-key">' + ['S', 's', 'I', 'R'].map(function (x) {
            return '<span><i class="calc-sol-' + (x === 's' ? 'little' : x) + '">' + x + '</i>' + t.words[x] + '</span>';
        }).join('') + '</span>';
    }

    function runSoluble(n, raw) {
        var none = [{ l: 'Solubility in water at 25 °C', text: solubleTable(-1, -1), wide: true }], r, M;
        if (!raw.f) return { rows: none, note: 'Type a salt, or find it in the table: its cation down the side, its anion across the top.' };
        r = CalcChem.solubility(raw.f);
        if (r.error === 'unknown') return { rows: none, warn: true, note: 'Not in the table: a salt of Li⁺, Na⁺, K⁺, NH₄⁺, Mg²⁺, Ca²⁺, Sr²⁺, Ba²⁺, Al³⁺, Cr³⁺, Mn²⁺, Fe²⁺, Fe³⁺, Co²⁺, Ni²⁺, Cu²⁺, Zn²⁺, Ag⁺, Hg²⁺ or Pb²⁺ ' +
            'with nitrate, acetate, Cl⁻, Br⁻, I⁻, sulfate, carbonate, phosphate, hydroxide or sulfide.' };
        if (r.error) return { rows: none, bad: ['f'], warn: r.error !== 'empty', note: formulaWhy(r) };
        M = CalcChem.molarMass(r.formula);
        return {
            rows: [{ l: 'In water', text: r.word }, { l: 'Name', text: r.name }, { l: 'Formula', text: CalcChem.html(r.formula), copy: CalcChem.plain(r.formula) },
                { l: 'Ions', text: (r.nc > 1 ? r.nc + ' ' : '') + r.cation + ' + ' + (r.na > 1 ? r.na + ' ' : '') + r.anion }, { l: 'g/mol', v: CalcMaths.round(M.mass) },
                { l: 'Solubility in water at 25 °C', text: solubleTable(r.ci, r.ai), wide: true }],
            note: r.rule + (r.hydrate ? ' The water of the hydrate is left out.' : '')
        };
    }

    // The equations of the worksheet, at each level: each balances, and has its kind, the redox ones Redox
    var WORKSHEET = [
        ['H2 + O2 = H2O', 'N2 + H2 = NH3', 'Na + Cl2 = NaCl', 'Mg + O2 = MgO', 'H2O2 = H2O + O2', 'Zn + HCl = ZnCl2 + H2', 'Ca + H2O = Ca(OH)2 + H2',
            'KClO3 = KCl + O2', 'CH4 + O2 = CO2 + H2O', 'HgO = Hg + O2', 'Li + O2 = Li2O', 'Cu + O2 = CuO', 'NaOH + HCl = NaCl + H2O', 'CaCO3 = CaO + CO2',
            'Mg + HCl = MgCl2 + H2', 'K + H2O = KOH + H2', 'AgNO3 + NaCl = AgCl + NaNO3', 'H2 + Cl2 = HCl', 'SO2 + O2 = SO3', 'Fe + S = FeS'],
        ['Al + O2 = Al2O3', 'Fe + O2 = Fe2O3', 'C3H8 + O2 = CO2 + H2O', 'Fe2O3 + CO = Fe + CO2', 'Al + HCl = AlCl3 + H2', 'NaOH + H2SO4 = Na2SO4 + H2O',
            'Ca(OH)2 + HCl = CaCl2 + H2O', 'Pb(NO3)2 + KI = PbI2 + KNO3', 'AgNO3 + CaCl2 = AgCl + Ca(NO3)2', 'Fe + Cl2 = FeCl3', 'NH3 + O2 = NO + H2O',
            'C2H6 + O2 = CO2 + H2O', 'Na + H2O = NaOH + H2', 'N2O5 = NO2 + O2', 'Al + CuSO4 = Al2(SO4)3 + Cu', 'BaCl2 + Na2SO4 = BaSO4 + NaCl', 'P4 + O2 = P2O5',
            'Zn + AgNO3 = Zn(NO3)2 + Ag', 'Mg + N2 = Mg3N2', 'Fe2O3 + H2 = Fe + H2O'],
        ['C6H12O6 + O2 = CO2 + H2O', 'C8H18 + O2 = CO2 + H2O', 'KMnO4 + HCl = KCl + MnCl2 + Cl2 + H2O', 'Cu + HNO3 = Cu(NO3)2 + NO + H2O',
            'Al2(SO4)3 + Ca(OH)2 = Al(OH)3 + CaSO4', 'FeS2 + O2 = Fe2O3 + SO2', 'C2H5OH + O2 = CO2 + H2O', 'Ca3(PO4)2 + SiO2 + C = CaSiO3 + P4 + CO',
            'C4H10 + O2 = CO2 + H2O', 'NH3 + CuO = Cu + N2 + H2O', 'Fe3O4 + Al = Al2O3 + Fe', 'Ca3(PO4)2 + H2SO4 = CaSO4 + H3PO4', 'Al + Fe2O3 = Al2O3 + Fe',
            'C5H12 + O2 = CO2 + H2O', 'K2Cr2O7 + HCl = KCl + CrCl3 + Cl2 + H2O', 'NaHCO3 = Na2CO3 + CO2 + H2O', 'Al4C3 + H2O = Al(OH)3 + CH4',
            'Cu + H2SO4 = CuSO4 + SO2 + H2O', 'PCl5 + H2O = H3PO4 + HCl', 'Fe2(SO4)3 + KOH = K2SO4 + Fe(OH)3']
    ], worksheetKept = { key: '', picked: [] };

    // as it is to be balanced: each formula, + between them and → between the sides
    function unbalanced(eq, html) {
        return eq.split(' = ').map(function (side) {
            return side.split(' + ').map(function (f) { return html ? CalcChem.html(f) : CalcChem.plain(f); }).join(' + ');
        }).join(' → ');
    }

    // Questions picked at random from the level, kept until Again or the choices change; the kind of reaction
    // asked only of those that have one. The questions, then the answers, each to copy as text
    function runWorksheet(n, raw) {
        var ex = +raw.ex || 0, level = +raw.lv || 0, count = n.n || 10, key = ex + ',' + level + ',' + count, pool, list, q, a;
        if (svAgain || worksheetKept.key !== key) {
            pool = WORKSHEET[level].map(function (eq) { return { eq: eq, r: CalcChem.balance(eq) }; }).filter(function (x) { return !x.r.error && (ex !== 1 || x.r.kind); });
            for (var i = pool.length - 1; i > 0; i--) { // shuffled
                var j = Math.floor(Math.random() * (i + 1)), t = pool[i];
                pool[i] = pool[j];
                pool[j] = t;
            }
            worksheetKept = { key: key, picked: pool.slice(0, count) };
        }
        list = worksheetKept.picked;
        q = list.map(function (x) { return ex === 1 ? [x.r.html, x.r.text] : [unbalanced(x.eq, true), unbalanced(x.eq, false)]; });
        a = list.map(function (x) {
            var kind = x.r.kind || 'Redox';
            return ex === 0 ? [x.r.html, x.r.text] : ex === 1 ? [kind, kind] : [x.r.html + ' <i>' + kind + '</i>', x.r.text + '   (' + kind + ')'];
        });
        var ol = function (items, i) {
            return '<ol class="calc-ws">' + items.map(function (x) { return '<li>' + x[i] + '</li>'; }).join('') + '</ol>';
        }, plainList = function (items) {
            return items.map(function (x, k) { return (k + 1) + '. ' + x[1]; }).join('\n');
        };
        return {
            rows: [{ l: ['Balance each', 'Name the kind of each reaction', 'Balance each, and name its kind'][ex], text: ol(q, 0), copy: plainList(q), wide: true },
                { l: 'Answer key', text: ol(a, 0), copy: plainList(a), wide: true }],
            note: list.length < count ? 'Only ' + list.length + ' at this level have a kind to name.' : 'Again for new questions.'
        };
    }

    // An ion's charge as chemists write it: 2−, +
    function chargeText(c) {
        return (Math.abs(c) > 1 ? Math.abs(c) : '') + (c > 0 ? '+' : '−');
    }

    // the ions, cations then anions, each its formula and name
    function ionList() {
        var group = function (cat) {
            return '<span class="calc-ion-list">' + CalcChem.ions.filter(function (i) { return cat ? i.charge > 0 : i.charge < 0; }).map(function (i) {
                return '<span title="' + i.kind + '"><b>' + CalcChem.html(i.formula) + '</b>' + i.name + '</span>';
            }).join('') + '</span>';
        };
        return [{ l: 'Cations', text: group(true), wide: true }, { l: 'Anions', text: group(false), wide: true }];
    }

    function runIon(n, raw) {
        var r, M;
        if (!raw.f) return { rows: ionList(), note: 'Type an ion by its formula or its name.' };
        r = CalcChem.findIon(raw.f);
        if (r.error === 'unknown') return { rows: ionList(), warn: true, note: raw.f + ' is not one of the common ions below.' };
        if (r.error) return { rows: ionList(), bad: ['f'], warn: true, note: formulaWhy(r) };
        M = CalcChem.molarMass(r.formula);
        return {
            rows: [{ l: 'Name', text: r.name + (r.also.length ? ' <i>(' + r.also.join(', ') + ')</i>' : '') }, { l: 'Formula', text: CalcChem.html(r.formula), copy: CalcChem.plain(r.formula) },
                { l: 'Charge', text: chargeText(r.charge) }, { l: 'Kind', text: r.kind }, { l: 'g/mol', v: CalcMaths.round(M.mass) },
                { l: 'In water', text: r.water }].concat(r.charge > 0 ? [{ l: 'Flame test', text: r.flame || 'No colour of its own' }] : []),
            cols: 2,
            note: 'The electrons it gained or lost are left out of its mass, as tables of molar mass do.'
        };
    }

    // a formula's name, or a name's formula; of a salt its ions, of an acid its name in water
    function runNames(n, raw) {
        var r, none = [{ l: 'Name', v: NaN, wide: true }], rows, s;
        if (!raw.f) return { rows: none, note: 'Type a formula for its name, Fe2(SO4)3, or a name for its formula, iron(III) sulfate.' };
        r = CalcChem.names(raw.f);
        if (r.error === 'numeral') {
            return { rows: none, bad: ['f'], warn: true, note: r.element.name + ' has more than one charge: write it in Roman numerals, ' +
                r.element.ox.split(' ').filter(function (x) { return x.charAt(0) === '+'; }).map(function (x) { return r.element.name.toLowerCase() + '(' + ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][+x.slice(1)] + ')'; }).join(' or ') + '.' };
        }
        if (r.error === 'unknown') return { rows: none, warn: true, note: 'Not one it names: salts, acids, ions, two nonmetals, the elements and some common compounds are.' };
        if (r.error) return { rows: none, bad: ['f'], warn: r.error !== 'empty', note: formulaWhy(r) };
        rows = [{ l: 'Name', text: r.name + (r.also.length ? ' <i>(' + r.also.join(', ') + ')</i>' : ''), copy: r.name, wide: true },
            { l: 'Formula', text: CalcChem.html(r.formula), copy: CalcChem.plain(r.formula) }, { l: 'Kind', text: r.kind }];
        if (r.acid) rows.push({ l: 'In water', text: r.acid });
        if ((s = r.salt)) rows.push({ l: 'Ions', text: (s.cation.n > 1 ? s.cation.n + ' ' : '') + CalcChem.plain(s.cation.ion) + ' + ' + (s.anion.n > 1 ? s.anion.n + ' ' : '') + CalcChem.plain(s.anion.ion) });
        rows.push({ l: 'g/mol', v: CalcMaths.round(CalcChem.molarMass(r.formula).mass) });
        return {
            rows: rows, cols: 2,
            note: r.kind === 'Ionic' ? 'The cation, then the anion' + (/\([IVX]+\)/.test(s.cation.name) ? '; a metal of more than one charge has its charge in Roman numerals, as the anions balance it.' : '.') :
                r.kind === 'Acid' ? (r.acid ? 'As a compound, hydrogen and the anion; in water -ide becomes hydro-…-ic acid.' : 'In water, -ate becomes -ic acid and -ite -ous acid.') :
                    r.kind === 'Molecular' ? 'Two nonmetals: a Greek prefix for how many atoms of each, mono- left off the first.' : r.kind === 'Common name' ? 'Known by a name of its own.' : ''
        };
    }

    // the oxidation number of each element of a formula or an ion, of a salt of two ions sharing one each apart
    function runOxidation(n, raw) {
        var r, none = [{ l: 'Oxidation numbers', v: NaN, wide: true }], twice;
        if (!raw.f) return { rows: none, note: 'Type a formula or an ion: K2Cr2O7, SO4^2-.' };
        r = CalcChem.oxidation(raw.f);
        if (r.error === 'electron') return { rows: none, bad: ['f'], warn: true, note: 'An electron has no oxidation number: type a formula or an ion.' };
        if (r.error === 'none') return { rows: none, warn: true, note: 'No oxidation numbers fit it, by the rules and the usual states of its elements.' };
        if (r.error) return { rows: none, bad: ['f'], warn: r.error !== 'empty', note: formulaWhy(r) };
        twice = r.rows.filter(function (x, i) { return r.rows.some(function (y, j) { return j < i && y.s === x.s; }); }).map(function (x) { return x.s; });
        return {
            rows: r.rows.map(function (x) { return { l: x.s + (x.in ? ' in ' + x.in : ''), text: x.text }; }), cols: 2,
            note: r.parts ? 'Each ion on its own, as ' + twice[0] + ' is in both.' :
                r.average.length ? r.average.join(' and ') + ': an average, as its atoms are not all in one state; Fe3O4 is FeO·Fe2O3.' :
                    r.guessed ? 'The rules leave more than one element: each is put in one of its usual states, so they add up to the charge.' :
                        'By the rules; the sum is the charge, ' + (CalcChem.parse(raw.f).charge ? chargeText(CalcChem.parse(raw.f).charge) : '0') + '.'
        };
    }

    function runGas(n, raw) {
        var e = oneEmpty(raw, ['p', 'v', 'n', 't'], ['P', 'V', 'n', 'T']), R = GAS_R[+raw.pu || 0], c = raw.tu === '1' ? 273.15 : 0, T = n.t + c, v, M, rows, mol;
        if (!e.k) return { rows: [{ l: 'P', v: NaN }], warn: e.warn, note: e.note };
        v = { p: n.n * R * T / n.v, v: n.n * R * T / n.p, n: n.p * n.v / (R * T), t: n.p * n.v / (n.n * R) - c }[e.k];
        rows = [{ l: { p: 'P, ' + ['atm', 'kPa', 'mmHg', 'bar'][+raw.pu || 0], v: 'V, L', n: 'n, mol', t: 'T, ' + (c ? '°C' : 'K') }[e.k], v: v }];
        if (e.k === 't') rows.push(c ? { l: 'T, K', v: v + c } : { l: 'T, °C', v: v - 273.15 });
        if (raw.f) {
            M = massOf(raw, 'f');
            if (M.why) return { rows: rows, bad: M.bad ? ['f'] : [], warn: true, note: M.why };
            mol = e.k === 'n' ? v : n.n;
            rows.push({ l: 'Mass, g', v: mol * M.M }, { l: 'Density, g/L', v: mol * M.M / (e.k === 'v' ? v : n.v) });
        }
        return { rows: rows, cols: 2, warn: !isFinite(v) || (e.k !== 't' && T <= 0), note: !isFinite(v) ? 'None: a box it is divided by is 0.' : e.k !== 't' && T <= 0 ? 'T is above absolute zero, 0 K or –273.15 °C.' : 'R = ' + local(String(R)) + ' L·' + ['atm', 'kPa', 'mmHg', 'bar'][+raw.pu || 0] + '/(mol·K).' };
    }

    function runGases(n, raw) {
        var keys = ['p1', 'v1', 't1', 'p2', 'v2', 't2'], e = oneEmpty(raw, keys, ['P₁', 'V₁', 'T₁', 'P₂', 'V₂', 'T₂']), c = raw.tu === '1' ? 273.15 : 0, t1 = n.t1 + c, t2 = n.t2 + c, v;
        if (!e.k) return { rows: [{ l: 'V₂', v: NaN }], warn: e.warn, note: e.note };
        v = {
            p1: n.p2 * n.v2 * t1 / (t2 * n.v1), v1: n.p2 * n.v2 * t1 / (t2 * n.p1), t1: n.p1 * n.v1 * t2 / (n.p2 * n.v2) - c,
            p2: n.p1 * n.v1 * t2 / (t1 * n.v2), v2: n.p1 * n.v1 * t2 / (t1 * n.p2), t2: n.p2 * n.v2 * t1 / (n.p1 * n.v1) - c
        }[e.k];
        return { rows: [{ l: { p1: 'P₁', v1: 'V₁', t1: 'T₁', p2: 'P₂', v2: 'V₂', t2: 'T₂' }[e.k], v: v }], warn: !isFinite(v),
            note: !isFinite(v) ? 'None: a box it is divided by is 0.' : 'The same units of P and of V on both sides' + (c ? '; T in °C, worked out in kelvin.' : '; T in kelvin.') };
    }

    // The panel: the periodic table on its first tab, the tools on the others. The table is coloured
    // by the kind of element, its state, its block or its electronegativity; a click on an element
    // shows all that is known of it, each number of it to put in. Popped out, it is as big as the page,
    // or in a window of its own in the extension
    var chemPanel = root.querySelector('.calc-chem'),
        chemButton = root.querySelector('.calc-chem-btn'),
        chemTable = chemPanel.querySelector('.calc-pt'),
        chemGrid = chemPanel.querySelector('.calc-pt-grid'),
        chemSearch = chemPanel.querySelector('.calc-pt-search'),
        chemClear = chemPanel.querySelector('.calc-pt-clear'), // its ×, while something is typed
        chemModes = chemPanel.querySelector('.calc-pt-modes'),
        chemLegend = chemPanel.querySelector('.calc-pt-legend'),
        chemInfo = chemPanel.querySelector('.calc-pt-info'),
        chemSize = chemPanel.querySelector('.calc-chem-size'),
        chemList = chemPanel.querySelector('.calc-sv-list'),
        chemTab = 'table', // the tab shown: the table, or one of the tools'
        chemBy = 'cat', // what the colours of the table show: cat, state, block, or a number of CHEM_HEAT
        chemByBig = null, // the colour chosen popped out, kept and saved still while popped in shows Kind, the colours having no buttons there
        chemAt = 1, // the element chosen, by its number: hydrogen each time the panel opens
        chemShut = false, // popped out on a wide page, its card at the right closed: the table the whole width
        chemHot = '', // a colour of the legend clicked: only its elements bright
        chemAlone = false, // in a window of its own, in the extension
        CHEM_BY = { cat: 'Kind', state: 'State', block: 'Block', en: 'EN', ie: 'IE', mp: 'Melts', density: 'Density',
            bp: 'Boils', radius: 'Atomic radius', affinity: 'Electron affinity', mass: 'Mass', year: 'Discovered' },
        // the numbers the table can be coloured by, from pale yellow at the least to red at the most: density
        // by its square root, for the metals not to be all red together
        // Each its own colours, [hue, saturation, lightness] from its least to its most, all light enough for
        // the dark letters: electronegativity blue to red, ionization energy green to purple, the melting
        // point cold blue to hot red, density pale sand to brown
        CHEM_HEAT = {
            en: { of: function (e) { return e.en; }, lo: 0.7, hi: 4, label: 'Pauling', ends: [0.7, 3.98], fixed: 2,
                colours: [[212, 70, 76], [168, 48, 68], [50, 78, 70], [14, 70, 63]] },
            ie: { of: function (e) { return e.ie; }, lo: 375, hi: 2373, unit: 'e', ends: [375.7, 2372.3],
                colours: [[130, 45, 76], [185, 50, 70], [225, 58, 75], [275, 45, 71]] },
            mp: { of: function (e) { return e.mp; }, lo: -260, hi: 3550, unit: 't', ends: [-259.16, 3550],
                colours: [[205, 75, 74], [50, 85, 78], [26, 85, 66], [2, 72, 60]] },
            density: { of: function (e) { return e.density === null ? null : Math.sqrt(e.density); }, back: function (v) { return v * v; }, lo: 0, hi: 4.76, unit: 'd', ends: [0, 22.59],
                colours: [[45, 45, 86], [35, 40, 72], [25, 35, 60]] },
            // popped out only, in the table's own pastels: the boiling point as the melting point, cold to hot; the
            // radius aqua to lavender, small to big; the affinity pale yellow to green; the mass peach to coral,
            // light to heavy; the year found sand to violet, ancient to new, those known since ancient times at its start
            bp: { of: function (e) { return e.bp; }, lo: -270, hi: 5930, unit: 't', ends: [-268.93, 5930],
                colours: [[205, 75, 74], [50, 85, 78], [26, 85, 66], [2, 72, 60]] },
            radius: { of: function (e) { return e.radius; }, lo: 120, hi: 348, label: 'pm', ends: [120, 348], fixed: 0,
                colours: [[165, 59, 78], [217, 88, 83], [253, 75, 84]] },
            affinity: { of: function (e) { return e.affinity; }, lo: 0, hi: 349, unit: 'e', ends: [7.6, 349],
                colours: [[50, 90, 84], [86, 58, 76], [142, 44, 69]] },
            mass: { of: function (e) { return e.mass; }, lo: 1, hi: 294, label: 'g/mol', ends: [1.008, 294],
                colours: [[35, 93, 89], [31, 94, 73], [5, 81, 73]] },
            year: { of: function (e) { return e.year === null ? null : Math.max(e.year, 1600); }, lo: 1600, hi: 2010, ends: [1600, 2010], fixed: 0,
                show: function (v) { return v <= 1600 ? 'Ancient' : String(Math.round(v)); },
                colours: [[42, 69, 80], [165, 59, 78], [285, 69, 83]] }
        },
        // the units the numbers of an element are shown in, each changed with a click on it: of temperature,
        // of energy and of density. Each is [its name, from the stored unit, its places]
        CHEM_UNITS = {
            t: { C: ['°C', function (v) { return v; }, 2], F: ['°F', function (v) { return v * 9 / 5 + 32; }, 2], K: ['K', function (v) { return v + 273.15; }, 2] },
            e: { kJ: ['kJ/mol', function (v) { return v; }, 1], eV: ['eV', function (v) { return v / 96.485; }, 3] },
            d: { g: ['g/cm³', function (v) { return v; }, 8], kg: ['kg/m³', function (v) { return v * 1000; }, 5], lb: ['lb/ft³', function (v) { return v * 62.42796; }, 4] },
            // the atomic mass in full, or to 3 places
            m: { full: ['g/mol', function (v) { return v; }, 6], d3: ['g/mol, 3 places', function (v) { return v; }, 3] }
        },
        chemUnit = { t: 'C', e: 'kJ', d: 'g', m: 'full' },
        // the tiles of an element's details, by their labels: the tip of each, 'chem fact …' of tips.js
        CHEM_FACTS = { 'Atomic number': 'z', 'Atomic mass': 'mass', 'Electronegativity': 'en', 'Ionization energy': 'ie', 'Melting point': 'mp', 'Boiling point': 'bp',
            'Density': 'density', 'Group': 'group', 'Period': 'period', 'Protons': 'protons', 'Electrons': 'electrons', 'Neutrons': 'neutrons',
            'Electron configuration': 'config', 'Shells': 'shells', 'Block': 'block', 'Outer-shell electrons': 'outer', 'Unpaired electrons': 'unpaired',
            'Atomic radius': 'radius', 'Electron affinity': 'affinity', 'Common ions': 'ions', 'Oxidation states': 'ox', 'State at 20 °C': 'state',
            'Specific heat': 'heat', 'Discovered': 'year', 'Isotopes': 'isotopes', 'Name': 'story', 'History': 'story', 'Uses': 'uses' },
        chemTemp = 20, // the temperature the table shows the states at, °C: its slider in the State colours
        chemSliding = false, // a knob of the slider dragged: no tips meanwhile
        chemCut = {}, // of each number of CHEM_HEAT, its slider: [from, to] on its scale, the elements outside dimmed, null an open end; none, all bright
        CHEM_STATES = [['solid', 'Solid'], ['liquid', 'Liquid'], ['gas', 'Gas'], ['unknown', 'Unknown']],
        CHEM_BLOCKS = [['s', 's-block'], ['p', 'p-block'], ['d', 'd-block'], ['f', 'f-block']],
        chemCards = toolCards(chemList, CHEM_TOOLS, 'chem', false, {
            open: function () { return chemPanel.classList.contains('calc-open') && chemTab !== 'table'; },
            done: chemDone,
            // big on a wide page, the tools are a list at the left and the one chosen opens beside it (style.css)
            side: function () { return bigSide(chemPanel); }
        });

    // the class of an element's colour, as the table is coloured now
    function chemClass(e) {
        return chemBy === 'cat' ? 'calc-pt-' + e.cat : chemBy === 'state' ? 'calc-pt-' + (chemStateOf(e) || 'unknown') : chemBy === 'block' ? 'calc-pt-' + e.block + 'b' :
            CHEM_HEAT[chemBy].of(e) === null ? 'calc-pt-unknown' : '';
    }

    // Solid, liquid or gas at the temperature of the slider, at 1 atm, from its melting and boiling points. With
    // no melting point it goes from solid straight to gas, as arsenic does, but helium, which is liquid down to 0 K
    function chemStateOf(e) {
        if (e.mp === null && e.bp === null) return e.state;
        if (e.bp !== null && chemTemp >= e.bp) return 'gas';
        if (e.mp === null) return e.z === 2 ? 'liquid' : 'solid';
        return chemTemp < e.mp ? 'solid' : 'liquid';
    }

    // the slider's place, 0 to 1000, and its temperature: kelvin as its square, 0 to 6000 K, for the room
    // from 0 K to the boiling of the gases to be as wide as from there to tungsten's 5555 °C
    function chemTempAt(p) {
        return Math.round(6000 * p * p / 1e6 - 273.15);
    }

    function chemTempPlace(t) {
        return Math.round(Math.sqrt((t + 273.15) * 1e6 / 6000));
    }

    function chemTempText() {
        return local(String(chemIn('t', chemTemp))).replace('-', '−') + ' ' + chemUnitName('t');
    }

    // The slider of a number has two ends, the elements between them bright: each end's place 0 to 1000 along
    // the scale, and back; at the end of the scale an end is open, null, for no element to be left out there
    function chemCutPlaces() {
        var h = CHEM_HEAT[chemBy], c = chemCut[chemBy] || [null, null];
        return c.map(function (v, i) { return v === null ? i * 1000 : Math.round(1000 * (v - h.lo) / (h.hi - h.lo)); });
    }

    function chemCutAt(p, i) {
        var h = CHEM_HEAT[chemBy];
        return p <= 0 && !i || p >= 1000 && i ? null : h.lo + (h.hi - h.lo) * p / 1000;
    }

    // an end of the slider, in the unit chosen: an open one at the least or the most of any element
    function chemCutEnd(i) {
        var h = CHEM_HEAT[chemBy], c = chemCut[chemBy], v = c && c[i] !== null ? (h.back ? h.back(c[i]) : c[i]) : h.ends[i];
        v = Math.max(h.ends[0], Math.min(h.ends[1], v)); // no further than the least and the most of any element
        if (h.show) return h.show(v);
        v = h.unit ? chemIn(h.unit, v) : v;
        return local(h.fixed !== undefined ? v.toFixed(h.fixed) : String(+v.toPrecision(3))).replace('-', '−') + (chemHeatUnit(h) ? ' ' + chemHeatUnit(h) : '');
    }

    // the unit of a number's scale: the one chosen for its kind, or its own
    function chemHeatUnit(h) {
        return h.unit ? chemUnitName(h.unit) : h.label || '';
    }

    // an element dimmed by the slider: outside its ends, or its number not known
    function chemCutOut(e) {
        var c = CHEM_HEAT[chemBy] && chemCut[chemBy], v;
        if (!c) return false;
        v = CHEM_HEAT[chemBy].of(e);
        return v === null || (c[0] !== null && v < c[0]) || (c[1] !== null && v > c[1]);
    }

    // The slider under the key: a knob for the temperature of the states; for a number, its scale of
    // colours with a knob at each end, the number of each end beside it, the colours outside them shaded.
    // Not the browser's, which has one knob only, and is not where it is drawn when the page is zoomed
    function chemSliderHtml() {
        var places = chemSliderPlaces(), heat = chemBy !== 'state', names = heat ? ['From', 'To'] : ['Temperature'];
        // the first number before the line, against it: of the temperature its only one. Each as wide as the
        // longest it can say, three figures and a sign with the unit, for the line not to move and no more room
        var unit = heat ? chemHeatUnit(CHEM_HEAT[chemBy]) : chemUnitName('t'),
            width = 'width: ' + (0.6 * Math.max(heat ? chemCutEnd(0).length : 0, heat ? chemCutEnd(1).length : 0, 6 + unit.length)).toFixed(1) + 'em';
        // the temperature's line in the colours of the states, solid to liquid to gas as it warms (style.css), shaded above it
        return '<span class="calc-pt-temp' + (heat ? ' calc-pt-heat" style="--calc-heat: ' + chemGradient(CHEM_HEAT[chemBy]) + '; ' : '" style="') + '--calc-label: ' + width.slice(7) + '">' +
            '<span class="calc-pt-temp-v calc-pt-from" role="button"></span>' +
            '<span class="calc-pt-range"><span class="calc-pt-range-out"></span>' + (heat ? '<span class="calc-pt-range-out"></span>' : '') +
            places.map(function (p, i) {
                return '<span class="calc-pt-range-knob" data-i="' + i + '" role="slider" tabindex="0" aria-label="' + names[i] + '" aria-valuemin="0" aria-valuemax="1000"></span>';
            }).join('') + '</span>' + (heat ? '<span class="calc-pt-temp-v" role="button"></span>' : '') + '</span>';
    }

    function chemSliderPlaces() {
        return chemBy === 'state' ? [chemTempPlace(chemTemp)] : chemCutPlaces();
    }

    // the knobs where they are, the numbers they are at, and the scale shaded outside them
    function chemSliderDraw(places) {
        var knobs = chemLegend.querySelectorAll('.calc-pt-range-knob'), texts = chemLegend.querySelectorAll('.calc-pt-temp-v'),
            out = chemLegend.querySelectorAll('.calc-pt-range-out');
        if (!knobs.length) return;
        [].forEach.call(texts, function (t, i) { t.textContent = chemBy === 'state' ? chemTempText() : chemCutEnd(i); });
        [].forEach.call(knobs, function (k, i) {
            k.style.left = places[i] / 10 + '%';
            k.setAttribute('aria-valuenow', places[i]);
            k.setAttribute('aria-valuetext', texts[texts.length > 1 ? i : 0].textContent);
        });
        if (out.length > 1) {
            out[0].style.cssText = 'left: 0; width: ' + places[0] / 10 + '%';
            out[1].style.cssText = 'left: ' + places[1] / 10 + '%; right: 0';
        } else out[0].style.cssText = 'left: ' + places[0] / 10 + '%; right: 0';
    }

    // a knob moved to a place: the other knob not passed, the table as it says
    // With both knobs at one place, the one that moves is the one on the side it goes to, for neither to be stuck
    // against the other at an end. The knob moved, to go on with
    function chemSliderSet(i, p) {
        var places = chemSliderPlaces(), knobs;
        p = Math.round(Math.max(0, Math.min(1000, p)));
        if (places.length > 1 && places[0] === places[1] && p !== places[0]) {
            if (i !== (p < places[0] ? 0 : 1)) {
                i = p < places[0] ? 0 : 1;
                knobs = chemLegend.querySelectorAll('.calc-pt-range-knob');
                if (knobs[i]) knobs[i].focus({ preventScroll: true });
            }
        }
        if (places.length > 1) p = i ? Math.max(p, places[0]) : Math.min(p, places[1]);
        places[i] = p;
        if (chemBy === 'state') chemTempTo(chemTempAt(p));
        else {
            chemCut[chemBy] = places.map(chemCutAt);
            if (chemCut[chemBy][0] === null && chemCut[chemBy][1] === null) delete chemCut[chemBy];
            chemDim();
        }
        chemSliderDraw(places);
        return i;
    }

    // a number of an element in the unit chosen for it: t, e or d; null as it is, not known
    function chemIn(kind, v) {
        var u = CHEM_UNITS[kind][chemUnit[kind]], f = Math.pow(10, u[2]);
        return v === null || v === undefined ? null : Math.round(u[1](v) * f) / f;
    }

    function chemUnitName(kind) {
        return CHEM_UNITS[kind][chemUnit[kind]][0];
    }

    // coloured by a number: from pale yellow at its least to red at its most
    function chemHeat(e) {
        var h = CHEM_HEAT[chemBy], v = h && h.of(e);
        if (!h || v === null) return '';
        return 'background: ' + chemColour(h, Math.max(0, Math.min(1, (v - h.lo) / (h.hi - h.lo)))) + '; ';
    }

    // the colour a part t, 0 to 1, along a number's colours: between the two it falls between
    function chemColour(h, t) {
        var c = h.colours, at = t * (c.length - 1), i = Math.min(c.length - 2, Math.floor(at)), f = at - i;
        return 'hsl(' + [0, 1, 2].map(function (k) { return Math.round(c[i][k] + (c[i + 1][k] - c[i][k]) * f) + (k ? '%' : ''); }).join(', ') + ')';
    }

    // the slider's scale: the same colours, from end to end
    function chemGradient(h) {
        return 'linear-gradient(90deg, ' + h.colours.map(function (c, i) { return chemColour(h, i / (h.colours.length - 1)); }).join(', ') + ')';
    }

    // The atom drawn flat, as Bohr drew it: the nucleus with its protons and neutrons, and a ring for
    // each shell, its electrons spaced round it
    function chemAtom(e) {
        var size = 150, mid = size / 2, rings = e.shells.length, gap = (mid - 20) / Math.max(rings, 1), svg, n = Math.round(e.mass) - e.z;
        svg = '<svg class="calc-pt-atom" data-pt="atom" data-full="' + e.z + ' protons, ' + n + ' neutrons; electrons ' + e.shells.join(', ') + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + e.name + ': ' + e.z + ' protons, ' + n + ' neutrons, electrons in shells of ' + e.shells.join(', ') + '">';
        e.shells.forEach(function (count, i) { // each shell with its electrons, which come in one after the other from the middle, then go round
            var r = 18 + gap * (i + 0.75), j, a;
            svg += '<g class="calc-pt-shell" style="--i: ' + i + '"><circle class="calc-pt-ring" cx="' + mid + '" cy="' + mid + '" r="' + r.toFixed(1) + '"/><g class="calc-pt-spin">';
            for (j = 0; j < count; j++) {
                a = 2 * Math.PI * j / count - Math.PI / 2 + i * 0.4;
                svg += '<circle class="calc-pt-e" cx="' + (mid + r * Math.cos(a)).toFixed(1) + '" cy="' + (mid + r * Math.sin(a)).toFixed(1) + '" r="2.3"/>';
            }
            svg += '</g></g>';
        });
        return svg + '<g class="calc-pt-core"><circle class="calc-pt-nucleus" cx="' + mid + '" cy="' + mid + '" r="14"/><text x="' + mid + '" y="' + (mid - 1.5) + '">' + e.z + 'p</text><text x="' + mid + '" y="' + (mid + 7) + '">' + n + 'n</text></g></svg>';
    }

    // the mass as tables write it: of one with no stable isotope, in brackets
    function chemMass(e) {
        return e.unstable ? '[' + e.mass + ']' : local(String(chemIn('m', e.mass)));
    }

    // and on a big tile, with its tip: the mass in full, whatever its places
    function chemMassHtml(e) {
        return '<span class="calc-pt-mass" data-pt="mass" data-full="' + (e.unstable ? '[' + e.mass + ']' : local(String(e.mass)) + ' g/mol') + '">' + chemMass(e) + '</span>';
    }

    // The tip of a part of an element, its data-pt: what it is, its value in full above, as its tile may cut it
    // short; its kind, what the elements of the family are like
    function chemPartTip(el) {
        var k = el.dataset.pt, info = CalcTips[k === 'kind' ? 'chem kind ' + el.dataset.kind : 'chem fact ' + k],
            v = el.hasAttribute('data-full') ? el.dataset.full : el.textContent.trim();
        if (!info) return null;
        return { t: info.t, d: (v && k !== 'kind' ? '<div class="calc-tip-value">' + v + '</div>' : '') + info.d };
    }

    // The tip of a tile of the details, as a result's: what it is, and its value in full with its unit, to copy, a
    // number to put in as well; one in words, whole on its tile already, only what it is
    function chemFactPeek(el) {
        var info = CalcTips['chem fact ' + el.dataset.fact], label = el.querySelector('.calc-sv-label'), value = el.querySelector('.calc-sv-value'),
            unit = label.querySelector('i'), name = label.firstChild.data.trim(), shown = value.textContent.trim(), u;
        if (!info) return null;
        if (el.classList.contains('calc-pt-text') || /^–?$/.test(shown)) return { t: name, d: info.d };
        u = unit && !/^(K L M …|Pauling|mass number)$/.test(unit.textContent) ? ' ' + unit.textContent.replace(', 3 places', '') : '';
        return { t: name, d: info.d, html: value.innerHTML + u, text: el.hasAttribute('data-v') ? local(statsValue(+el.dataset.v).text) : shown, put: el.hasAttribute('data-v') };
    }

    function chemGroupOf(e) {
        return chemBy === 'cat' ? e.cat : chemBy === 'state' ? chemStateOf(e) || 'unknown' : chemBy === 'block' ? e.block : '';
    }

    function renderChemTable() {
        // popped in, by kind alone; not saved, as the table's own window, open as well, would have Kind from it and lose its colour
        if (chemBy !== 'cat' && !chemAlone && !root.classList.contains('calc-chem-big')) {
            chemByBig = chemBy;
            chemBy = 'cat';
        }
        chemGrid.innerHTML = '<div class="calc-pt-gap" aria-live="polite"></div>' +
            '<div class="calc-pt-el calc-pt-series calc-pt-' + (chemBy === 'cat' ? 'lanthanide' : chemBy === 'block' ? 'fb' : 'solid') + '" style="grid-area: 6 / 3" data-from="57" role="button" aria-label="Lanthanides, 57 to 71"><b><span>La–</span><span>Lu</span></b><span class="calc-pt-mass">57–71</span></div>' +
            '<div class="calc-pt-el calc-pt-series calc-pt-' + (chemBy === 'cat' ? 'actinide' : chemBy === 'block' ? 'fb' : 'solid') + '" style="grid-area: 7 / 3" data-from="89" role="button" aria-label="Actinides, 89 to 103"><b><span>Ac–</span><span>Lr</span></b><span class="calc-pt-mass">89–103</span></div>' +
            CalcChem.elements.map(function (e) {
                return '<div class="calc-pt-el ' + chemClass(e) + '" data-z="' + e.z + '" style="' + chemHeat(e) + 'grid-area: ' + e.row + ' / ' + e.col + '"' +
                    ' role="button" aria-label="' + e.name + ', ' + e.z + '"><span class="calc-pt-z">' + e.z + '</span><b>' + e.s + '</b><span class="calc-pt-name">' + e.name +
                    '</span><span class="calc-pt-mass">' + chemMass(e) + '</span></div>';
            }).join('');
        [].forEach.call(chemModes.children, function (m) { m.classList.toggle('calc-on', m.dataset.by === chemBy); });
        chemLegend.innerHTML = CHEM_HEAT[chemBy] ? chemSliderHtml() + '<span class="calc-pt-key calc-pt-unknown"><i></i>Not known</span>' :
            (chemBy === 'cat' ? CalcChem.categories : chemBy === 'state' ? CHEM_STATES : CHEM_BLOCKS).map(function (c) {
                return '<span class="calc-pt-key calc-pt-' + (chemBy === 'block' ? c[0] + 'b' : c[0]) + (chemHot === c[0] ? ' calc-on' : '') + '" data-g="' + c[0] + '" role="button"><i></i>' + c[1] + '</span>';
            }).join('') + (chemBy === 'state' ? '<span class="calc-pt-break"></span>' + chemSliderHtml() : '');
        if (chemBy === 'state' || CHEM_HEAT[chemBy]) chemSliderDraw(chemSliderPlaces());
        chemDim();
        chemShow(chemAt, true);
    }

    // an element of the search, of the legend clicked, or both: the others dimmed
    function chemMatches(e, q) {
        q = q.toLowerCase();
        return !q || e.s.toLowerCase() === q || String(e.z) === q || e.name.toLowerCase().indexOf(q) > -1 || (q.length < 3 && e.s.toLowerCase().indexOf(q) === 0);
    }

    // An element faint: not of what is searched, not of the colour lit, or cut out by the slider
    function chemDimmed(e, q) {
        return !chemMatches(e, q) || (!!chemHot && chemGroupOf(e) !== chemHot) || chemCutOut(e);
    }

    // the big tile above the table as faint as its element in the table
    function chemDimBig() {
        var big = chemGrid.querySelector('.calc-pt-gap .calc-pt-big');
        if (big) big.classList.toggle('calc-pt-dim', chemDimmed(CalcChem.elements[big.dataset.show - 1], chemSearch.value.trim()));
    }

    function chemDim() {
        var q = chemSearch.value.trim();
        chemClear.hidden = !chemSearch.value;
        [].forEach.call(chemGrid.querySelectorAll('.calc-pt-el[data-z]'), function (t) {
            t.classList.toggle('calc-pt-dim', chemDimmed(CalcChem.elements[t.dataset.z - 1], q));
        });
        chemDimBig();
        [].forEach.call(chemGrid.querySelectorAll('.calc-pt-series'), function (t, i) { // bright while one of its row is
            // and always dimmed in the states and the colours of a number, as their elements have no one of them
            t.classList.toggle('calc-pt-dim', !!CHEM_HEAT[chemBy] || chemBy === 'state' || (!!(q || chemHot) && !chemGrid.querySelector('.calc-pt-el[data-z]:not(.calc-pt-dim)[style*="grid-area: ' + (9 + i) + ' /"]')));
        });
    }

    // The electrons alone in their orbitals, by Hund's rule: of each subshell of the configuration not full,
    // as many as it has up to one for each orbital, then fewer as they pair; the core in [ ] is full
    function chemUnpaired(config) {
        var n = 0;
        config.replace(/\[[^\]]*\]/, '').replace(/\d([spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, function (m, l, sup) {
            var orbitals = 2 * 'spdf'.indexOf(l) + 1,
                k = +sup.replace(/./g, function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c); });
            n += k <= orbitals ? k : 2 * orbitals - k;
            return m;
        });
        return n;
    }

    // The element in the space above the transition metals: the one pointed at, or the one chosen. With
    // all, the tiles of what is known of it under the table too, each number to put in
    function chemShow(z, all) {
        var e = CalcChem.elements[z - 1], gap = chemGrid.querySelector('.calc-pt-gap'), cat = CalcChem.categories.filter(function (c) { return c[0] === e.cat; })[0][1], tiles;
        // each part with data-pt, the tip of what it is (chemPartTip), its value in full under it
        gap.innerHTML = '<div class="calc-pt-big calc-pt-el ' + chemClass(e) + '" data-show="' + e.z + '" style="' + chemHeat(e) + '" role="button" aria-label="All of ' + e.name + '"><span class="calc-pt-z" data-pt="z">' + e.z + '</span>' +
            // popped out, the tile has room for more, as on a printed table: the electronegativity and the oxidation
            // states at the top right, the name under the symbol, the configuration at the foot
            '<span class="calc-pt-more calc-pt-en" data-pt="en">' + (e.en === null ? '' : local(String(e.en))) + '</span>' +
            '<span class="calc-pt-more calc-pt-ox" data-pt="ox" data-full="' + (e.ox || '').split(' ').join(', ') + '">' + (e.ox || '').split(' ').join('<br>') + '</span>' +
            '<b data-pt="symbol">' + e.s + '</b><span class="calc-pt-more calc-pt-full" data-pt="name">' + e.name + '</span>' + chemMassHtml(e) +
            '<span class="calc-pt-more calc-pt-conf" data-pt="config">' + e.config + '</span></div>' +
            '<div class="calc-pt-about"><span class="calc-pt-title" data-pt="name">' + e.name + '</span><span data-pt="kind" data-kind="' + e.cat + '">' + cat + '</span><span class="calc-pt-cfg" data-pt="config">' + e.config + '</span>' +
            // and beside it, what the tile has no room for, a label over each value
            '<dl class="calc-pt-facts">' + [
                ['Mass', e.unstable ? e.mass : chemIn('m', e.mass), e.unstable ? 'mass number' : 'g/mol', 'mass'], ['Group', e.group, '', 'group'], ['Period', e.period, '', 'period'], ['Block', e.block, '', 'block'],
                ['Melts', chemIn('t', e.mp), chemUnitName('t'), 'mp'], ['Boils', chemIn('t', e.bp), chemUnitName('t'), 'bp'],
                ['Density', chemIn('d', e.density), chemUnitName('d'), 'density'], ['Ionization', chemIn('e', e.ie), chemUnitName('e'), 'ie'],
                ['State', e.state ? e.state.charAt(0).toUpperCase() + e.state.slice(1) : null, '', 'state'], ['Radius', e.radius, 'pm', 'radius'],
                ['Affinity', chemIn('e', e.affinity), chemUnitName('e'), 'affinity'], ['Ions', e.ions, '', 'ions']
            ].map(function (f) {
                var v = f[1] === null || f[1] === undefined ? '–' : typeof f[1] === 'number' ? local(String(f[1])) : f[1];
                return '<div data-pt="' + f[3] + '" data-full="' + (v === '–' ? '' : v + (f[2] && f[2] !== 'mass number' ? ' ' + f[2] : '')) + '"><dt>' + f[0] + (f[2] ? ' <i>' + f[2] + '</i>' : '') + '</dt><dd>' + v + '</dd></div>';
            }).join('') + '</dl></div>';
        chemDimBig();
        if (!all) return;
        chemAt = z;
        [].forEach.call(chemGrid.querySelectorAll('.calc-pt-el.calc-on'), function (t) { t.classList.remove('calc-on'); });
        if (chemGrid.querySelector('.calc-pt-el[data-z="' + z + '"]')) chemGrid.querySelector('.calc-pt-el[data-z="' + z + '"]').classList.add('calc-on');
        tiles = [
            ['Atomic number', e.z], e.unstable ? ['Atomic mass', e.mass, 'mass number'] : ['Atomic mass', chemIn('m', e.mass), chemUnitName('m'), false, 'm'], ['Electronegativity', e.en, 'Pauling'],
            ['Ionization energy', chemIn('e', e.ie), chemUnitName('e'), false, 'e'], ['Melting point', chemIn('t', e.mp), chemUnitName('t'), false, 't'],
            ['Boiling point', chemIn('t', e.bp), chemUnitName('t'), false, 't'],
            ['Density', chemIn('d', e.density), chemUnitName('d') + (e.state === 'gas' ? ' at 0 °C' : ''), false, 'd'], ['Group', e.group], ['Period', e.period],
            ['Protons', e.z], ['Electrons', e.z], ['Neutrons', Math.round(e.mass) - e.z],
            ['Electron configuration', e.config, '', true], ['Shells', e.shells.join(', '), 'K L M …'], ['Block', e.block],
            ['Outer-shell electrons', e.shells[e.shells.length - 1]], ['Unpaired electrons', chemUnpaired(e.config)],
            ['Atomic radius', e.radius, 'pm'], ['Electron affinity', chemIn('e', e.affinity), chemUnitName('e'), false, 'e'],
            ['Common ions', e.ions || '–', '', true], ['Oxidation states', e.ox || '–', '', true], ['State at 20 °C', e.state ? e.state.charAt(0).toUpperCase() + e.state.slice(1) : 'Not known'], ['Specific heat', e.heat, 'J/(g·K)'],
            // in words, each on its own line: when and by whom it was found, its isotopes, its name, its uses
            ['Discovered', (e.year === 0 ? 'In ancient times' : e.year) + (e.foundBy ? ', by ' + e.foundBy : '') + (e.isolatedBy ? '; isolated by ' + e.isolatedBy : ''), '', true, '', true],
            ['Isotopes', e.isotopes || '–', '', true, '', true],
            [/^The name/.test(e.story || '') ? 'Name' : 'History', e.story || '–', '', true, '', true], ['Uses', e.uses || '–', '', true, '', true]
        ];
        chemInfo.classList.toggle('calc-pt-new', String(z) !== chemInfo.dataset.z); // its details come in with a move, once for each element
        chemInfo.dataset.z = z;
        chemInfo.innerHTML = '<span class="calc-pt-hide" role="button" aria-label="Close the card"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg></span><div class="calc-pt-head"><div class="calc-pt-big calc-pt-el ' + chemClass(e) + '" style="' + chemHeat(e) + '"><span class="calc-pt-z" data-pt="z">' + e.z + '</span><b data-pt="symbol">' + e.s +
            '</b>' + chemMassHtml(e) + '</div><div class="calc-pt-about"><span class="calc-pt-title" data-pt="name">' + e.name + '</span><span data-pt="kind" data-kind="' + e.cat + '">' + cat + '</span><span data-pt="config">' + e.config +
            '</span><span data-pt="shells" data-full="' + e.shells.join(', ') + '">Shells ' + e.shells.join(', ') + '</span></div></div><div class="calc-pt-body">' + chemAtom(e) + '<div class="calc-sv-grid calc-pt-tiles">' + tiles.map(function (t, i) {
            var num = typeof t[1] === 'number' && !(t[0] === 'Found'), known = t[1] !== null && t[1] !== undefined;
            return '<div class="calc-sv-tile' + (num && known ? '' : ' calc-none') + (t[3] ? ' calc-sv-wide' : '') + (t[5] ? ' calc-pt-text' : '') + '" style="--i: ' + i + '" data-fact="' + CHEM_FACTS[t[0]] + '"' + (num && known ? ' data-v="' + t[1] + '"' : '') + '><span class="calc-sv-label">' + t[0] +
                (t[2] ? ' <i' + (t[4] ? ' class="calc-pt-unit" data-unit="' + t[4] + '" role="button"' : '') + '>' + t[2] + '</i>' : '') + '</span><span class="calc-sv-value">' + (!known ? '–' : num ? statsValue(t[1]).html : t[1]) + '</span></div>';
        }).join('') + '</div></div>';
    }

    function chemTabs() {
        [].forEach.call(chemPanel.querySelectorAll('.calc-solve-tab'), function (t) {
            t.classList.toggle('calc-on', t.dataset.tab === chemTab);
        });
        chemTable.hidden = chemTab !== 'table';
        chemList.hidden = chemTab === 'table';
        chemPanel.classList.toggle('calc-chem-cards', chemTab !== 'table');
    }

    // Big beside the list, the tools grow with the room: as they are up to 1200px wide, to half as big again
    function chemFit() {
        var side = root.classList.contains('calc-chem-big') && window.matchMedia('(min-width: 760px)').matches;
        chemList.style.zoom = side ? Math.max(1, Math.min(1.45, chemPanel.clientWidth / 1200)).toFixed(3) : '';
    }

    window.addEventListener('resize', function () {
        chemFit();
        if (chemTab !== 'table' && chemList.classList.contains('calc-side') !== bigSide(chemPanel)) chemCards.render(); // in place again, or beside
    }, false);

    function renderChem() {
        chemTabs();
        chemFit();
        if (chemTab === 'table') renderChemTable();
        else if (chemCards.tab() !== chemTab) chemCards.setTab(chemTab);
        else chemCards.render();
    }

    // Reset all: the table as at first, coloured by kind with hydrogen chosen and nothing searched, and
    // nothing typed in any card
    function clearChem() {
        chemCards.clear();
        chemSearch.value = '';
        chemTab = 'table';
        chemBy = 'cat';
        chemByBig = null;
        chemAt = 1;
        chemTemp = 20;
        chemCut = {};
        chemHot = '';
        if (chemAlone || chemPanel.classList.contains('calc-open')) renderChem();
        saveChem();
    }

    function saveChem() {
        store('chemView', { tab: chemTab, by: chemByBig || chemBy, at: chemAt, units: chemUnit, temp: chemTemp, cut: chemCut, shut: chemShut });
    }

    // the card of the element chosen, at the right popped out, closed or open again
    function chemCard(open) {
        chemShut = !open;
        chemTable.classList.toggle('calc-pt-shut', chemShut);
    }

    function loadChem(saved) {
        if (!saved || typeof saved !== 'object') return;
        if (saved.tab === 'table' || CHEM_TOOLS.hasOwnProperty(saved.tab)) chemTab = saved.tab;
        if (CHEM_BY.hasOwnProperty(saved.by)) {
            chemBy = saved.by;
            chemByBig = null;
        }
        if (saved.at >= 1 && saved.at <= 118 && saved.at === Math.floor(saved.at)) chemAt = saved.at;
        chemCard(saved.shut !== true);
        if (typeof saved.temp === 'number' && saved.temp >= -273 && saved.temp <= 5727) chemTemp = Math.round(saved.temp);
        if (saved.cut && typeof saved.cut === 'object') {
            Object.keys(CHEM_HEAT).forEach(function (k) {
                var c = saved.cut[k], ok = function (v) { return v === null || (typeof v === 'number' && v >= CHEM_HEAT[k].lo && v <= CHEM_HEAT[k].hi); };
                if (Array.isArray(c) && c.length === 2 && ok(c[0]) && ok(c[1]) && (c[0] === null || c[1] === null || c[0] <= c[1])) chemCut[k] = c;
            });
        }
        if (saved.units && typeof saved.units === 'object') {
            Object.keys(CHEM_UNITS).forEach(function (k) {
                if (CHEM_UNITS[k].hasOwnProperty(saved.units[k])) chemUnit[k] = saved.units[k];
            });
        }
    }

    function showChem(open) {
        if (!open && chemAlone) return; // its own window stays, even as a value is put in
        if (!open) chemBig(false);
        if (open) {
            closePanels(chemPanel);
            placePanel(chemPanel);
            if (!chemPanel.classList.contains('calc-open') && !chemAlone) chemAt = 1; // the table opens on hydrogen; its own window on the element popped out
        }
        chemPanel.classList.toggle('calc-open', open);
        chemButton.classList.toggle('calc-on', open);
        if (open) {
            renderChem();
            if (chemTab !== 'table') chemCards.focus();
        } else if (chemPanel.contains(document.activeElement)) {
            document.activeElement.blur(); // the keys are the calculator's again
        }
    }

    // closed by its button or Esc; its own window is closed then
    function closeChem() {
        if (chemAlone) ask('chem-close'); else showChem(false);
    }

    // a value put in: the calculator again, or brought up by the extension from the table's own window
    function chemDone() {
        if (chemAlone) ask('chem-put'); else showChem(false);
    }

    // The table as big as the page, as the graph is: on the website all of its window; the extension, whose
    // popup cannot grow, opens it in a window of its own. True if it changed
    function chemBig(on) {
        if (on === root.classList.contains('calc-chem-big') || (chemAlone && !on)) return false;
        hideTip();
        showMenu(false);
        if (on) {
            saveState();
            saveChem();
            if (!ask('chem-big', { big: true })) return showChem(false), false; // in its own window, and not here as well
            if (!chemPanel.classList.contains('calc-open')) showChem(true);
        }
        root.classList.toggle('calc-chem-big', on);
        root.classList.toggle('calc-panel-big', on); // as every panel popped out
        chemPanel.classList.toggle('calc-big-on', on);
        if (on && chemByBig) { // popped out again: its colour of before
            chemBy = chemByBig;
            chemByBig = null;
            renderChemTable();
        }
        if (!on) ask('chem-big', { big: false });
        if (!on && chemBy !== 'cat') renderChemTable(); // the colours have no buttons popped in: Kind again
        chemFit();
        if (chemTab !== 'table') chemCards.render(); // big, a tool open beside the list
        return true;
    }

    chemButton.addEventListener('click', function () {
        showChem(!chemPanel.classList.contains('calc-open'));
    }, false);

    chemPanel.querySelector('.calc-past-close').addEventListener('click', closeChem, false);

    chemSize.addEventListener('click', function () {
        chemBig(!root.classList.contains('calc-chem-big'));
    }, false);

    chemPanel.querySelector('.calc-solve-tabs').addEventListener('click', function (e) {
        var t = e.target.closest('.calc-solve-tab');
        if (!t) return;
        chemTab = t.dataset.tab;
        renderChem();
        saveChem();
    }, false);

    // the page asks for it: big and alone in the table's own window
    root.addEventListener('calc-chem', function (e) {
        var d = e.detail || {};
        if (d.alone) {
            chemAlone = true;
            root.classList.add('calc-chem-alone');
            chemTab = 'table'; // on the element chosen when it was popped out, which chemBig saved for it
        }
        chemBig(!!d.big);
    }, false);

    chemModes.addEventListener('click', function (e) {
        var m = e.target.closest('[data-by]');
        if (!m || m.dataset.by === chemBy) return;
        chemBy = m.dataset.by;
        chemByBig = null;
        chemHot = '';
        renderChemTable();
        saveChem();
    }, false);

    // the temperature slid: the states at it, each tile coloured again; its number clicked, 20 °C again
    function chemTempTo(t) {
        var big = chemGrid.querySelector('.calc-pt-gap .calc-pt-big'), shown = big ? +big.dataset.show : chemAt;
        chemTemp = t;
        chemLegend.querySelector('.calc-pt-temp-v').textContent = chemTempText();
        [].forEach.call(chemGrid.querySelectorAll('.calc-pt-el[data-z]'), function (el) {
            var e = CalcChem.elements[el.dataset.z - 1];
            el.classList.remove('calc-pt-solid', 'calc-pt-liquid', 'calc-pt-gas', 'calc-pt-unknown');
            el.classList.add(chemClass(e));
        });
        chemDim();
        // the big tiles of the element shown above and of the one chosen below, their colour only
        [[chemGrid.querySelector('.calc-pt-gap .calc-pt-big'), shown], [chemInfo.querySelector('.calc-pt-big'), chemAt]].forEach(function (b) {
            if (b[0]) b[0].className = 'calc-pt-big calc-pt-el ' + chemClass(CalcChem.elements[b[1] - 1]);
        });
    }

    // A knob dragged, or the line pressed: the knob nearest, or the one on the side pressed, comes there
    chemLegend.addEventListener('pointerdown', function (e) {
        var line = e.target.closest('.calc-pt-range'), places, at, i, move, done;
        if (!line || e.button > 0) return;
        e.preventDefault();
        places = chemSliderPlaces();
        at = function (ev) {
            var r = line.getBoundingClientRect();
            return 1000 * (ev.clientX - r.left) / r.width;
        };
        i = e.target.dataset.i !== undefined ? +e.target.dataset.i : places.length < 2 ? 0 :
            Math.abs(at(e) - places[0]) < Math.abs(at(e) - places[1]) || (places[0] === places[1] && at(e) < places[0]) ? 0 : 1;
        line.querySelectorAll('.calc-pt-range-knob')[i].focus({ preventScroll: true });
        chemSliding = true;
        hideTip();
        tipKey = null;
        i = chemSliderSet(i, at(e));
        // followed over the whole window, the pointer off the line as well, until it is let go
        move = function (ev) { if (ev.pointerId === e.pointerId) i = chemSliderSet(i, at(ev)); };
        done = function (ev) {
            if (ev.pointerId !== e.pointerId) return;
            window.removeEventListener('pointermove', move, false);
            window.removeEventListener('pointerup', done, false);
            window.removeEventListener('pointercancel', done, false);
            chemSliding = false;
            saveChem();
        };
        window.addEventListener('pointermove', move, false);
        window.addEventListener('pointerup', done, false);
        window.addEventListener('pointercancel', done, false);
    }, false);

    // a knob with the keys: the arrows a step, with Shift or Page Up and Down ten, Home and End to the ends
    chemLegend.addEventListener('keydown', function (e) {
        var knob = e.target.closest('.calc-pt-range-knob'), i, p, step;
        if (!knob) return;
        i = +knob.dataset.i;
        p = chemSliderPlaces()[i];
        step = e.shiftKey ? 50 : 5;
        p = { ArrowLeft: p - step, ArrowDown: p - step, ArrowRight: p + step, ArrowUp: p + step, PageDown: p - 50, PageUp: p + 50, Home: 0, End: 1000 }[e.key];
        if (p === undefined) return;
        e.preventDefault();
        e.stopPropagation(); // not on the keys of the calculator
        chemSliderSet(i, p);
        saveChem();
    }, false);

    chemLegend.addEventListener('click', function (e) {
        var k = e.target.closest('[data-g]');
        // the number of a slider clicked: 20 °C again, or all the elements
        if (e.target.closest('.calc-pt-temp-v')) {
            if (chemBy === 'state') chemTempTo(20);
            else {
                delete chemCut[chemBy];
                chemDim();
            }
            chemSliderDraw(chemSliderPlaces());
            saveChem();
            return;
        }
        if (!k) return;
        chemHot = chemHot === k.dataset.g ? '' : k.dataset.g;
        [].forEach.call(chemLegend.children, function (c) { c.classList.toggle('calc-on', c.dataset.g === chemHot); });
        chemDim();
    }, false);

    // Pointed at: in the space above. Off every element, in the table's gaps, on the tile above or out of
    // the table, the one chosen again; drawn only when it changes, as the tile under the mouse is redrawn
    function chemPoint(z) {
        var big = chemGrid.querySelector('.calc-pt-gap .calc-pt-big');
        if (z && (!big || +big.dataset.show !== z)) chemShow(z);
    }

    chemGrid.addEventListener('pointerover', function (e) {
        var t = e.target.closest('.calc-pt-el[data-z]');
        if (e.pointerType !== 'touch') chemPoint(t ? +t.dataset.z : chemAt);
    }, false);

    chemGrid.addEventListener('pointerleave', function () {
        chemPoint(chemAt);
    }, false);

    // The details of the element chosen, below the table, scrolled up to: smoothly, in the table's own
    // scroll alone, as the page around the calculator must not move
    function chemToInfo() {
        var by = (chemInfo.getBoundingClientRect().top - chemTable.getBoundingClientRect().top) / scale();
        chemTable.scrollTo({ top: chemTable.scrollTop + by - 4, behavior: 'smooth' });
    }

    // An element clicked is chosen; clicked again, or its big tile above the table, its details below are
    // scrolled to. On a touch screen, with nothing to point at, at once
    chemGrid.addEventListener('click', function (e) {
        var t = e.target.closest('.calc-pt-el[data-z]'), s = e.target.closest('.calc-pt-series'), big = e.target.closest('[data-show]'), again = false;
        if (s) { // La–Lu and Ac–Lr go to their row
            chemShow(+s.dataset.from, true);
        } else if (big) {
            if (+big.dataset.show !== chemAt) chemShow(+big.dataset.show, true);
            again = true;
        } else if (t) {
            again = +t.dataset.z === chemAt;
            if (!again) chemShow(+t.dataset.z, true);
        } else {
            return;
        }
        if (chemShut) chemCard(true); // its card open again
        if (again || touchScreen()) chemToInfo();
        saveChem();
    }, false);

    // the arrow keys go from element to element, as they are placed: across a gap to the next one
    chemGrid.addEventListener('keydown', function (e) {
        var e0 = CalcChem.elements[chemAt - 1], dr = { 38: -1, 40: 1 }[e.which] || 0, dc = { 37: -1, 39: 1 }[e.which] || 0, best = null;
        if (!dr && !dc) return;
        e.preventDefault();
        CalcChem.elements.forEach(function (x) {
            var r = x.row - e0.row, c = x.col - e0.col, d;
            if (dc && (r || c * dc <= 0)) return;
            if (dr && r * dr <= 0) return;
            d = dc ? Math.abs(c) : Math.abs(r) * 100 + Math.abs(c);
            if (!best || d < best.d) best = { d: d, z: x.z };
        });
        if (best) {
            chemShow(best.z, true);
            saveChem();
        }
    }, false);

    chemSearch.addEventListener('input', function () {
        var q = chemSearch.value.trim().toLowerCase(), exact = CalcChem.elements.filter(function (e) {
            return q && (e.s.toLowerCase() === q || String(e.z) === q || e.name.toLowerCase() === q);
        })[0];
        chemDim();
        if (exact) {
            chemShow(exact.z, true);
            saveChem();
        }
    }, false);

    // its × empties it, the box keeping the focus
    chemClear.addEventListener('click', function () {
        chemSearch.value = '';
        chemDim();
        focusBox(chemSearch);
    }, false);

    // Enter chooses the first element found; Esc empties it first, then closes as ever
    chemSearch.addEventListener('keydown', function (e) {
        var q = chemSearch.value.trim(), first;
        if (e.which === 27 && chemSearch.value) {
            e.preventDefault();
            e.stopPropagation();
            chemSearch.value = '';
            chemDim();
            return;
        }
        if (e.which !== 13) return;
        e.preventDefault();
        first = CalcChem.elements.filter(function (x) { return q && chemMatches(x, q); })[0];
        if (first) {
            chemShow(first.z, true);
            saveChem();
        }
    }, false);

    // a number of the element chosen is put in
    chemInfo.addEventListener('click', function (e) {
        var u = e.target.closest('[data-unit]'), t = e.target.closest('.calc-sv-tile[data-v]'), units;
        if (e.target.closest('.calc-pt-hide')) { // closed: the table the whole width
            hideTip();
            chemCard(false);
            saveChem();
            return;
        }
        // popped in, its head, the tile and the name, and its atom scroll the card up to the top of the table
        if (e.target.closest('.calc-pt-head, .calc-pt-atom') && !root.classList.contains('calc-chem-big')) {
            chemToInfo();
            return;
        }
        // its unit, the next one: for every number of its kind, in the table and under it
        if (u) {
            units = Object.keys(CHEM_UNITS[u.dataset.unit]);
            chemUnit[u.dataset.unit] = units[(units.indexOf(chemUnit[u.dataset.unit]) + 1) % units.length];
            renderChemTable();
            saveChem();
            return;
        }
        if (!t || !engine.put(+t.dataset.v)) return;
        keyBoard['AC'].children[0].firstChild.data = 'C';
        refresh();
        saveState();
        chemDone();
    }, false);

    // the tips of the panel: its tabs, its pop out and close, and the cards
    function chemTip(el) {
        if (el === chemSize) return CalcTips[root.classList.contains('calc-chem-big') ? 'chem small' : 'chem big'];
        if (el.classList.contains('calc-past-close')) return CalcTips['chem close'];
        if (el.classList.contains('calc-solve-tab')) return CalcTips['chem tab ' + el.dataset.tab] || null;
        if (el.classList.contains('calc-pt-mode')) return CalcTips['chem by ' + el.dataset.by] || null;
        if (el.classList.contains('calc-pt-unit')) return CalcTips['chem unit'];
        if (el.classList.contains('calc-pt-hide')) return CalcTips['chem card close'];
        if (el.closest('.calc-pt-temp')) return CalcTips[chemBy === 'state' ? 'chem temp' : 'chem cut'];
        if (el.hasAttribute('data-pt')) return chemPartTip(el);
        if (el === chemClear) return CalcTips['chem search clear'];
        return chemCards.tip(el);
    }

    // What else of a web page a card works out (the features of the instant answers in the extension, page/solve.js
    // and the others), in its panel: a card of the solver, of the numbers or of the dates with its boxes filled; a
    // quantity in the converter, its group, unit and value; a list of numbers in the statistics; of the chemistry
    // (page/chemistry.js), a card of the Chemistry panel, or the table at an element. Its numbers are written with points: with the comma as the
    // decimal mark, a box of a number has a comma, and ; between. A formula and a reaction are as they are
    function pageCard(panel, card, fields) {
        var kept = {}, words = { u: 1, t: 1, b: 1, enc: 1, bits: 1, convert: 1, ts: 1, d: 1, g: 1, to: 1 }, // names and codes, as they are
            el = panel === 'chem' && card === 'element' ? CalcChem.bySymbol[fields.s] : null;
        Object.keys(fields).forEach(function (k) {
            var v = String(fields[k]);
            if (k === 'panel' || k === 'card') return;
            kept[k] = engine.comma && !words[k] && panel !== 'dates' && (panel !== 'chem' || k === 'c') ? v.replace(/,/g, ';').replace(/\./g, ',') : v;
        });
        if (panel === 'solve' || panel === 'numbers') {
            if (!(panel === 'solve' ? solveButton : numbersButton).hidden) (panel === 'solve' ? solver : numbers).put(card, kept);
        } else if (panel === 'dates') {
            if (convButton.hidden || !dates.put(card, kept)) return;
            convTab = 'dates';
            showConv(true);
            saveConv();
        } else if (panel === 'units') {
            var g = CalcUnits.units.map(function (group) { return group.c; }).indexOf(kept.g);
            if (convButton.hidden || g < 0) return;
            convTab = 'units';
            convAt.g = g;
            convAt.u[kept.g] = kept.u;
            showConv(true); // which puts in a result of the display: the page's value, after it
            convInput.value = kept.v;
            renderConv(true);
            saveConv();
        } else if (panel === 'stats') {
            if (statsButton.hidden) return;
            if (statsTab !== 'list') {
                statsTexts[statsTab] = statsInput.value;
                statsTab = 'list';
                statsTiles();
            }
            statsInput.value = statsTexts.list = String(fields.list || '').replace(/\./g, engine.comma ? ',' : '.');
            showStats(true);
            saveState();
        } else if (panel === 'chem') {
            if (chemButton.hidden || (card === 'element' ? !el : !chemCards.put(card, kept))) return;
            chemTab = el ? 'table' : chemCards.tab();
            showChem(true);
            if (el) { // its card open, at the right popped out
                chemCard(true);
                chemAt = el.z;
                renderChemTable();
            }
            saveChem();
        }
    }

    // A sum or an equation of a web page, its icon clicked (page/answers.js in the extension): a sum is
    // worked out in the display, from the start; an equation or an inequality of x opens in its card
    // of the solver, as an integral, a sum or a product of terms and a limit in theirs, with their ends;
    // an IP network in its card of the numbers; a formula and a constant in the formulas panel, while
    // they are on. It is written with points, whatever the decimal mark shown
    root.addEventListener('calc-equation', function (e) {
        var d = e.detail || {}, text = String(d.text || ''), fields = d.fields || {}, read,
            cards = { integral: 'integral', series: 'sum', product: 'product', limit: 'limit', derivative: 'derivative', taylor: 'taylor', ode: 'ode' };
        if (d.kind === 'card') {
            pageCard(String(fields.panel || ''), String(fields.card || ''), fields);
            return;
        }
        if (!text) return;
        if (d.kind === 'equation' || d.kind === 'inequality') {
            if (!solveButton.hidden) solver.put(d.kind, { eq: text });
            return;
        }
        if (cards[d.kind]) {
            if (!solveButton.hidden) solver.put(cards[d.kind], fields);
            return;
        }
        if (d.kind === 'subnet' || d.kind === 'matrix') { // a matrix: its size and numbers, as Matrix takes them
            if (!numbersButton.hidden) numbers.put(d.kind, d.kind === 'subnet' ? { ip: text } : fields);
            return;
        }
        if (d.kind === 'graph') {
            if (!graphButton.hidden && fields.f) drawPageCurve(String(fields.f));
            return;
        }
        if (d.kind === 'formula' || d.kind === 'constant') {
            if (!fxButton.hidden) showFxItem(d.kind === 'formula' ? 'formulas' : 'constants', String(fields.name || ''));
            return;
        }
        closePanels();
        unselect();
        if (engine.edit) engine.reset(); // not into the equation being edited, at its cursor
        // a/b as the tip had it: on for a sum written in fractions, its result one; off for one of decimals
        if (fields.frac === '1' ? !fracMode : fields.frac === '0' && fracMode) toggleFraction();
        engine.comma = false;
        read = engine.paste(text + ' =', deg);
        engine.comma = CalcEngine.comma(fmt.group);
        if (!read) return;
        keyBoard['AC'].children[0].firstChild.data = 'C';
        refresh();
        saveState();
    }, false);


    // ---------------- examples of the graph ---------------- //

    // each example, with the words it is found by: its group, its name, what it types and what it is
    CalcFormulas.graphs.forEach(function (group) {
        group.list.forEach(function (ex) {
            graphExItems.push({ c: group.c, ex: ex, words: [group.c, ex.t, ex.f.join(' '), ex.d].join(' ').toLowerCase() });
        });
    });

    graphSearch.addEventListener('input', renderExamples, false);

    // Enter in the search draws the first one found
    graphSearch.addEventListener('keydown', function (e) {
        var item = graphExList.querySelector('.calc-gx-item');
        if (e.which !== 13) return;
        e.preventDefault();
        if (item) putExample(graphExItems[+item.dataset.i].ex);
    }, false);

    graphExList.addEventListener('click', function (e) {
        var row = e.target.closest('.calc-gx-row');
        if (row) putExample(graphExItems[+row.parentNode.dataset.i].ex);
    }, false);

    // what an example types, with the decimal mark in use: 4,1 and ; between with the comma
    function exampleText(text) {
        return engine.comma ? text.replace(/,/g, ';').replace(/\./g, ',') : text;
    }

    // the examples the search finds, under the name of their group, as the constants are:
    // its name, and what it types, a box after another
    function renderExamples() {
        var words = graphSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean), group = null, html = '';
        graphExItems.forEach(function (entry, i) {
            if (!words.every(function (w) { return entry.words.indexOf(w) > -1; })) return;
            if (entry.c !== group) html += '<div class="calc-gx-cat">' + entry.c + '</div>';
            group = entry.c;
            html += '<div class="calc-gx-item" data-i="' + i + '"><div class="calc-gx-row">' +
                '<span class="calc-gx-col"><span class="calc-gx-name">' + entry.ex.t + '</span>' +
                '<span class="calc-gx-f calc-gx-eq calc-gx-val"><span>' + entry.ex.f.map(function (text) {
                    return exampleText(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }).join('<span class="calc-graph-ex-gap"></span>') + '</span></span></span></div></div>';
        });
        graphExList.innerHTML = html || '<div class="calc-gx-none">Nothing found</div>';
        graphExList.scrollTop = 0;
        hideTip();
    }

    // An example drawn in place of the curves there were, as Clear leaves them: its boxes,
    // its sliders at their values, its points with their fit, its colors, in Rad if it needs it, and the
    // view as it starts, or its own. Then the plot shows it, the sliders it plays playing
    function putExample(ex) {
        var w, h, u, v = ex.v;
        stopSliders();
        graphInputs.forEach(function (box, i) { box.value = i < ex.f.length ? exampleText(ex.f[i]) : ''; });
        graphCount = ex.f.length;
        graphHue = (ex.hue || [0, 1, 2, 3, 4, 5, 6]).slice();
        graphOff = graphOff.map(function () { return false; });
        graphDiff = graphDiff.map(function (d, i) { return !i && ex.fit ? ex.fit : false; });
        graphFrom.value = graphBy.value = '';
        graphLines = 0;
        forgetLetters();
        Object.keys(ex.p || {}).forEach(function (k) {
            graphVars[k] = ex.p[k][0];
            graphRange[k] = [ex.p[k][1], ex.p[k][2]];
        });
        if (ex.rad && deg) setUnit(0);
        showCells(-1);
        graphView = null;
        showGraphTab('graph');
        readGraph();
        if (v) { // all of its view shown, as much each way, or with stretch each filling the plot
            w = graphPlot.clientWidth;
            h = graphPlot.clientHeight;
            u = Math.max((v[1] - v[0]) / w, (v[3] - v[2]) / h);
            graphView = { x: (v[0] + v[1]) / 2, y: (v[2] + v[3]) / 2, ux: ex.stretch ? (v[1] - v[0]) / w : u, uy: ex.stretch ? (v[3] - v[2]) / h : u };
            graphRender();
        }
        (ex.play || []).forEach(function (k) { playSlider(k, true); });
        saveState();
    }

    // the tip of an example: what it is, and that a click draws it
    function exampleTip(el) {
        var ex = graphExItems[+el.parentNode.dataset.i].ex;
        return { t: ex.t, d: ex.d + (ex.rad && deg ? ' It is drawn in Rad.' : '') + ' Click to draw it in place of the curves there are.', k: '' };
    }

    // ---------------- converter ---------------- //

    // A value in one unit, and the list of what it is in the other units of its
    // group, worked out as it is typed. A click on one puts it into the
    // calculation, as Ans does. The value can be an equation too: 5*12.
    // Its other tab has the dates, in cards
    var dates = toolCards(conv.querySelector('.calc-sv-list'), DATE_TOOLS, 'dates', true, {
        open: function () { return conv.classList.contains('calc-open') && convTab === 'dates'; },
        done: function () { showConv(false); },
        side: function () { return bigSide(conv); }
    });

    dates.load({ open: 'span' }); // the first card open at first

    conv.querySelector('.calc-solve-tabs').addEventListener('click', function (e) {
        var t = e.target.closest('.calc-solve-tab');
        if (!t || t.dataset.tab === convTab) return;
        convTab = t.dataset.tab;
        convTabs();
        convFocus();
        saveConv();
    }, false);

    // the tab shown, and what is in it
    function convTabs() {
        [].forEach.call(conv.querySelectorAll('.calc-solve-tab'), function (t) {
            t.classList.toggle('calc-on', t.dataset.tab === convTab);
        });
        conv.classList.toggle('calc-conv-dates', convTab === 'dates');
        closeCalendar();
        showPicker(convGroup, false);
        showPicker(convUnit, false);
        if (convTab === 'dates') dates.render();
        else renderConv(true);
    }

    // the value has the focus, or the first box of the card open
    function convFocus() {
        if (convTab === 'dates') dates.focus();
        else if (focusBox(convInput)) convInput.select(); // typing replaces it
    }

    picker(convGroup, function (i) {
        convAt.g = i;
        renderConv(true);
        saveConv();
    });

    picker(convUnit, function (i) {
        convAt.u[CalcUnits.units[convAt.g].c] = convUnitName(i);
        renderConv();
        saveConv();
    });

    convButton.addEventListener('click', function () {
        showConv(!conv.classList.contains('calc-open'));
    }, false);

    conv.querySelector('.calc-past-close').addEventListener('click', function () {
        showConv(false);
    }, false);

    convInput.addEventListener('input', function () {
        onlyNumber(convInput, true); // the degree, minute and second of an angle too
        renderConv();
        saveConv();
    }, false);

    convList.addEventListener('click', function (e) {
        var row = e.target.closest('.calc-conv-row'), value = row && convNow[+row.dataset.i];
        if (!row || !isFinite(value) || !engine.put(+value.toPrecision(15))) return; // 2.54 cm, not 2.5399999999999996
        keyBoard['AC'].children[0].firstChild.data = 'C';
        showConv(false);
        refresh();
        saveState();
    }, false);

    // Enter puts in the first value of the list
    convInput.addEventListener('keydown', function (e) {
        var row = convList.querySelector('.calc-conv-row:not(.calc-none)');
        if (e.which !== 13) return;
        e.preventDefault();
        if (row) row.click();
    }, false);

    // A result in the display starts the value, as in the formulas
    function showConv(open) {
        if (!open && bigShut(conv)) return;
        if (!open) {
            closeCalendar();
            showPicker(convGroup, false);
            showPicker(convUnit, false);
        }
        if (open) {
            closePanels(conv);
            placePanel(conv);
            if (!engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
                convInput.value = local(+(+engine.value).toPrecision(13));
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
            } else {
                return;
            }
            e.preventDefault();
        }, false);

        // a press anywhere else closes it
        document.addEventListener('mousedown', function (e) {
            if (!menu.hidden && !el.contains(e.target)) showPicker(el, false);
        }, true);

        el.pick = pick;
    }

    // its choices, as HTML, and the one chosen
    function setPicker(el, choices, at) {
        el.choices = choices;
        el.at = at;
        el.querySelector('.calc-conv-chosen').innerHTML = choices[at];
    }

    function showPicker(el, open) {
        var menu = el.querySelector('.calc-conv-menu');
        if (open) {
            showPicker(el === convGroup ? convUnit : convGroup, false); // one list at a time
            hideTip();
            menu.innerHTML = el.choices.map(function (c, i) {
                return '<div class="calc-conv-item' + (i === el.at ? ' calc-on' : '') + '" role="option" data-i="' + i + '">' + c + '</div>';
            }).join('');
            lightPicker(el, el.at, true);
        }
        menu.hidden = !open;
        el.classList.toggle('calc-on', open);
        el.setAttribute('aria-expanded', open);
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
        focusBox(el.box || convInput);
    }

    // the unit's name is kept, not its place, so a unit added later does not change the choice
    function convUnitName(i) {
        return CalcUnits.units[convAt.g].list[i].t;
    }

    // The value typed, worked out, in each unit of the group but its own. A new
    // group fills the list of units first
    function renderConv(newGroup) {
        var group = CalcUnits.units[convAt.g], text = boxValue(convInput).trim(), x, from, trial;

        from = group.list.map(function (unit) { return unit.t; }).indexOf(convAt.u[group.c]);
        if (from < 0) from = 0;
        if (newGroup) {
            setPicker(convGroup, CalcUnits.units.map(function (g) { return g.c; }), convAt.g);
        }
        setPicker(convUnit, group.list.map(function (unit) {
            return unit.t + ' <span class="calc-conv-of">(' + unit.s + ')</span>';
        }), from);

        if (/^-?(\d+\.?\d*|\.\d+)$/.test(text)) {
            x = +text;
        } else if (text) { // an equation: worked out as the calculator would
            trial = new CalcEngine();
            x = trial.paste(text, deg, true) && !trial.error && (trial.press('=', deg), !trial.error) ? +trial.value : NaN;
            // 36°52′ is in degrees: for another angle, as 180° for radians, it is turned into that one
            if (group.c === 'Angle' && CalcEngine.angleAlone(text)) x = CalcUnits.convert(convAt.g, 0, from, x);
        }
        convInput.classList.toggle('calc-bad', !!text && !isFinite(x));
        convNote.textContent = !text ? 'Type a value to convert.' : !isFinite(x) ? 'Not a number the calculator can read.' :
            'Click a value to put it into the equation.';

        convNow = group.list.map(function (unit, i) {
            return isFinite(x) ? CalcUnits.convert(convAt.g, from, i, x) : NaN;
        });
        convList.innerHTML = group.list.map(function (unit, i) {
            var known = isFinite(convNow[i]);
            return i === from ? '' : '<div class="calc-conv-row' + (known ? '' : ' calc-none') + '" data-i="' + i + '">' +
                '<span class="calc-conv-col"><span class="calc-conv-sym">' + unit.s + '</span>' +
                '<span class="calc-conv-name">' + unit.t + '</span></span><span class="calc-conv-num">' +
                (known ? unit.dms && local(CalcEngine.dms(convNow[i]) || '') || convValue(convNow[i]) : '–') + '</span>' +
                // insert at the right, as a constant has it
                '<span class="calc-fx-put">' + insertIcon() + '</span></div>';
        }).join('');
        hideTip();
    }

    // 12 digits, grouped as the display does, and very large or small ones as
    // powers of 10: 1.609344 × 10³ is shown 1,609.344, 1 nm 1 × 10⁻⁹ m
    function convValue(v) {
        var a = Math.abs(v), parts = (+v.toPrecision(12)).toExponential().split('e');
        return (a && (a >= 1e15 || a < 1e-6) ? local(parts[0]) + ' × 10<sup>' + +parts[1] + '</sup>' :
            CalcEngine.group(String(+v.toPrecision(12)), fmt.group)).replace(/-/g, '−');
    }

    function saveConv() {
        store('conv', { g: CalcUnits.units[convAt.g].c, u: convAt.u, v: convInput.value, t: convTab });
    }

    // the converter as it was left: its tab, its group, kept by its name, the unit of each group, the value
    function loadConv(s) {
        convTab = s && s.t === 'dates' ? 'dates' : 'units';
        var g = CalcUnits.units.map(function (group) { return group.c; }).indexOf(s && s.g);
        convAt.g = g > -1 ? g : 0;
        convAt.u = s && s.u && typeof s.u === 'object' ? s.u : {};
        convInput.value = s && typeof s.v === 'string' ? s.v : '1';
    }

    // the tip of close, and of what the dates have; a value has the tip of a result (peekOf)
    function convTip(el) {
        if (el.classList.contains('calc-past-close')) return CalcTips['converter close'];
        if (el.closest('.calc-sv-list')) return dates.tip(el);
        return null;
    }

    // what an administrator turned off, which the options cannot turn on: the extension keeps it (policy.js), the website has none
    function policyOff(key) {
        var policy = stored('policy');
        return !!policy && policy[key] === false;
    }

    // the statistics, the formulas, the converter, the graph, the solver and the numbers have their button while they are
    // turned on in the options, and not turned off by an administrator. The graph's own window closes with the graph
    function setPanels(statsOn, fxOn, convOn, graphOn, solveOn, numbersOn, chemOn) {
        statsOn = statsOn && !policyOff('statistics');
        fxOn = fxOn && !policyOff('formulas');
        convOn = convOn && !policyOff('converter');
        graphOn = graphOn && !policyOff('graph');
        solveOn = solveOn && !policyOff('solve');
        numbersOn = numbersOn && !policyOff('numbers');
        chemOn = chemOn && !policyOff('chemistry');
        if (!graphOn && graphAlone) ask('graph-close');
        if (!chemOn && chemAlone) ask('chem-close');
        if (panelAlone && !{ stats: statsOn, fx: fxOn, conv: convOn, solve: solveOn, numbers: numbersOn }[panelAlone]) ask('panel-close');
        statsButton.hidden = !statsOn;
        fxButton.hidden = !fxOn;
        convButton.hidden = !convOn;
        graphButton.hidden = !graphOn;
        solveButton.hidden = !solveOn;
        numbersButton.hidden = !numbersOn;
        chemButton.hidden = !chemOn;
        if (!statsOn) showStats(false);
        if (!fxOn) showFx(false);
        if (!convOn) showConv(false);
        if (!graphOn) showGraph(false);
        if (!solveOn) showSolve(false);
        if (!numbersOn) showNumbers(false);
        if (!chemOn) showChem(false);
        showTools();
    }

    // the panels as the options and the administrator have them now
    function readPanels() {
        setPanels(stored('statsOn') !== false, stored('fxOn') !== false, stored('convOn') !== false, stored('graphOn') !== false,
            stored('solveOn') !== false, stored('numbersOn') !== false, stored('chemOn') !== false);
    }

    // the page tells of a change of the administrator's, which it heard first: it is not a storage event here
    root.addEventListener('calc-policy', readPanels, false);

    // the line above a result starts after the buttons shown at the top left
    function showTools() {
        display.parentNode.style.setProperty('--tools', [].filter.call(tools.children, function (b) {
            return !b.hidden;
        }).length);
    }

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
        box.innerHTML =
            '<span class="calc-past-btn" data-act="insert">' + insertIcon() + '</span>' +
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
            var edge = edgeAt(el, e.clientX), spot, rect, placed;

            if (edge) { // the dots slide the line, and open nothing
                e.stopPropagation();
                return goEdge(el, edge);
            }
            // a drag that selected in one box ends in a click on that box: the selection stays
            if (el === display && e.detail < 2 && !window.getSelection().isCollapsed) return;
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
                if (e.detail >= 3 || (e.detail === 2 && !spot.hasAttribute('data-e'))) {
                    selectRow(spot.hasAttribute('data-e') ? spot.getAttribute('data-e').split('|')[0] : spot.getAttribute('data-r'));
                } else if (e.detail === 2) {
                    pickValue(el, e.clientX, e.clientY);
                }
                return;
            }
            // the second click of two: the first one put the cursor in, and wrote the line again
            if (e.detail === 2 && !slid && el === display) return pickValue(el, e.clientX, e.clientY);
            if (slid || (el === display && !window.getSelection().isCollapsed)) return; // a slide or a selection, not a click
            if (el === logline) { // the equation above a result: a double click opens it, the cursor where it is clicked
                if (engine.edit || !(engine.done || engine.error)) return; // empty: a click on the screen
                e.stopPropagation(); // the screen's click would open it, the cursor at the end
                if (e.detail !== 2) return; // one click leaves the result as it is
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
            { key: 'numbers', panel: numbersPanel, show: showNumbers, render: numbers.render }
        ];

    // a panel, by itself or its name
    function bigOf(panel) {
        return BIG_PANELS.filter(function (p) { return p.panel === panel || p.key === panel; })[0];
    }

    // popped out on a wide page: its list of cards at the left, the card open beside it
    function bigSide(panel) {
        return panel.classList.contains('calc-big-on') && window.matchMedia('(min-width: 760px)').matches;
    }

    // A panel popped out, or in. The page may do it its own way: the extension opens it in a window of its own. True if it changed
    function panelBig(panel, on) {
        var p = bigOf(panel);
        if (!p || on === (bigPanel === panel) || (panelAlone && !on)) return false;
        hideTip();
        showMenu(false);
        if (on) {
            saveState();
            if (!ask('panel-big', { big: true, panel: p.key })) return p.show(false), false; // in its own window, and not here as well
            if (!panel.classList.contains('calc-open')) p.show(true);
        }
        bigPanel = on ? panel : null;
        root.classList.toggle('calc-panel-big', on);
        panel.classList.toggle('calc-big-on', on);
        if (!on) ask('panel-big', { big: false, panel: p.key });
        panelFit();
        p.render();
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
        panelBig(panel, false);
        return false;
    }

    // Popped out, what is under its head grows with the room: as it is 1200px wide, to half as big again
    function panelFit() {
        var z = bigPanel && window.matchMedia('(min-width: 760px)').matches ? Math.max(1, Math.min(1.45, bigPanel.clientWidth / 1200)).toFixed(3) : '';
        BIG_PANELS.forEach(function (p) {
            [].forEach.call(p.panel.children, function (el) {
                if (!el.classList.contains('calc-past-head') && el !== calendar) el.style.zoom = p.panel === bigPanel ? z : '';
            });
        });
    }

    // as narrow as a phone, the cards open in place again; wider, beside the list
    window.addEventListener('resize', function () {
        var list = bigPanel && bigPanel.querySelector('.calc-sv-list:not([hidden]), .calc-fx-list');
        if (!bigPanel) return;
        panelFit();
        if (list && list.classList.contains('calc-side') !== bigSide(bigPanel)) bigOf(bigPanel).render();
    }, false);

    BIG_PANELS.forEach(function (p) {
        p.panel.querySelector('.calc-panel-size').addEventListener('click', function () {
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

    // what a panel's own window saved, or the calculator's while it is open: the same here
    function panelSaved(key) {
        var s;
        if (key === 'solve' || key === 'numbers') {
            (s = key === 'solve' ? solver : numbers).load(stored(key));
            if (s.open()) s.render();
        } else if (key === 'dates' || key === 'conv') {
            if (key === 'dates') dates.load(stored('dates')); else loadConv(stored('conv'));
            if (conv.classList.contains('calc-open')) convTabs();
        } else if (key === 'fxTab') {
            if (/^(vars|formulas|constants)$/.test(stored('fxTab'))) fxTab = stored('fxTab');
            if (fx.classList.contains('calc-open')) renderFx();
        } else {
            s = stored(key);
            if (key === 'stat' && typeof s === 'string') statsTexts.list = s;
            if (key === 'statPairs' && typeof s === 'string') statsTexts.pairs = s;
            if (key === 'statTab') statsTab = s === 'pairs' ? 'pairs' : 'list';
            if (key === 'statBy') setStatsBy(Math.max(0, BY.map(function (by) { return by[0]; }).indexOf(s)));
            if (document.activeElement !== statsInput) statsInput.value = statsTexts[statsTab];
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
        if (!chemAlone && !panelAlone) store('graph', {
            f: graphInputs.slice(0, graphCount).map(function (box) { return box.value; }), c: graphHue.slice(0, graphCount),
            view: graphView, tab: graphTab, side: graphSide, from: graphFrom.value, by: graphBy.value, off: graphOff.slice(0, graphCount), d: graphDiff.slice(0, graphCount),
            p: graphLetters.reduce(function (p, k) {
                if (graphRange[k]) p[k] = [graphVars[k], graphRange[k][0], graphRange[k][1]];
                return p;
            }, {})
        });
        store('calc', engine.save());
        if (!graphAlone && !chemAlone && (!panelAlone || panelAlone === 'stats')) {
            store('stat', statsTexts.list);
            store('statPairs', statsTexts.pairs);
            store('statTab', statsTab);
            store('statBy', BY[statsBy.at][0]);
        }
        if (graphAlone || chemAlone || panelAlone) return;
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
        ['secondActive', 'deg', 'stat', 'statPairs', 'statTab', 'statBy', 'statsOn', 'fxOn', 'fxTab', 'convOn', 'conv', 'dates', 'graphOn', 'graph', 'solveOn', 'solve', 'numbersOn', 'numbers', 'chemOn', 'chem', 'chemView', 'fraction', 'dms', 'format', 'memory', 'calc'].forEach(function (key) {
            s[key] = stored(key);
        });
        if (s.secondActive) {
            keyDown(false, keyBoard['2nd']);
            doKey('2nd', true);
        }
        setUnit(s.deg === true ? 1 : s.deg === 'grad' ? 2 : 0);
        if (typeof s.stat === 'string') statsTexts.list = s.stat;
        if (typeof s.statPairs === 'string') statsTexts.pairs = s.statPairs;
        if (s.statTab === 'pairs') statsTab = 'pairs';
        statsInput.value = statsTexts[statsTab];
        statsTiles();
        setStatsBy(Math.max(0, BY.map(function (by) { return by[0]; }).indexOf(s.statBy)));
        // all on, until changed in the options
        setPanels(s.statsOn !== false, s.fxOn !== false, s.convOn !== false, s.graphOn !== false, s.solveOn !== false, s.numbersOn !== false, s.chemOn !== false);
        loadGraph(s.graph);
        solver.load(s.solve);
        numbers.load(s.numbers);
        chemCards.load(s.chem);
        loadChem(s.chemView);
        if (/^(vars|formulas|constants)$/.test(s.fxTab)) fxTab = s.fxTab;
        loadConv(s.conv);
        dates.load(s.dates);
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
        if (e.newValue !== null && e.newValue === ownSaves[e.key]) return;
        if (e.key === 'graph') {
            ownSaves.graph = e.newValue;
            loadGraph(stored('graph'));
            return readGraph();
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
            if (e.key === 'chem') chemCards.load(stored('chem'));
            else loadChem(stored('chemView'));
            if (chemAlone || chemPanel.classList.contains('calc-open')) renderChem();
            return;
        }
        if (/^(solve|numbers|dates|conv|fxTab|stat|statPairs|statTab|statBy)$/.test(e.key)) { // a panel's own window and the calculator show the same
            ownSaves[e.key] = e.newValue;
            return panelSaved(e.key);
        }
        if (e.key === 'deg') {
            ownSaves.deg = e.newValue;
            return setUnit(stored('deg') === true ? 1 : stored('deg') === 'grad' ? 2 : 0);
        }
        if (/^(statsOn|fxOn|convOn|graphOn|solveOn|numbersOn|chemOn|policy)$/.test(e.key)) return readPanels();
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
            valAbs = Math.abs(+val),
            fontSize = 30,
            displayStyle = display.style,
            displayParentStyle = display.parentNode.style;

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
        keyBoard['a/b'].classList.toggle('calc-lit', fracMode); // a red dot on the key of the mode that is on
        keyBoard['°′″'].classList.toggle('calc-lit', dmsMode);
        pastButton.hidden = !engine.past.length; // shown once there is a history
        pastExport.classList.toggle('calc-off', !engine.past.length); // and its export, which has nothing to export before
        pastExport.setAttribute('aria-disabled', String(!engine.past.length));
        showTools();
        slide(logline, logline.scrollWidth); // after the tools: they take room from the line, and its end must be in view
        if (stats.classList.contains('calc-open')) renderStats(); // the number format or fraction mode may have changed
        if (past.classList.contains('calc-open') && (pastShown.list !== engine.past || pastShown.mode !== shownMode() ||
            pastShown.n !== engine.past.length || pastShown.last !== engine.past[engine.past.length - 1])) {
            renderPast();
        }
    }

    loadState();

    // the lines are measured with the font they are shown in: once it has loaded
    // they are measured again, or their end could be left out of view
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

})(window);


// the name and the ? open the options: the page around the calculator does that
document.querySelectorAll('#calculator .logo, #calculator .calc-help').forEach(function (el) {
    el.addEventListener('click', function () {
        el.dispatchEvent(new CustomEvent('calc-options', { bubbles: true }));
    });
});