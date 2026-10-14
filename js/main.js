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
        fmtMark = Calc.querySelector('.calc-fmt'), // FIX 2, SCI 3 or ENG while that notation is on; no number for Auto places
        fracMark = Calc.querySelector('.calc-frac'), // FRAC while fraction mode is on, DMS while °′″ is
        secondKeySet, // the keys the 2nd key changes, found by their names below
        CURSOR = '<span class="calc-cursor"></span>',
        fmt = { notation: 'norm', places: 'auto', group: false }, // set on the options page; group: true for 1,234.5, 'space', 'dot' 1.234,5, 'spacecomma'
        fracMode = false, // a/b: divisions drawn as fractions, and results shown as fractions when they are one
        dmsMode = false, // °′″, the 2nd of a/b: results shown in degrees, minutes and seconds
        slid = false, // the pointer moved along a long line, to slide it or select in it, so it was not a click
        hiddenCopy = Calc.querySelector('textarea'),
        menu = root.querySelector('.calc-menu-box'), // the menu of a right click
        tip = root.querySelector('.calc-tip'), // what the key under the pointer does
        tipKey = null, // that key
        tipTimer,
        tipGone = 0, // when the last tip went, so the next one comes at once
        copying = null, // text a history button is copying, in place of the main line
        past = root.querySelector('.calc-past:not(.calc-stats):not(.calc-fx):not(.calc-conv):not(.calc-graph)'), // the history, over the keys
        pastList = past.querySelector('.calc-past-list'),
        pastButton = root.querySelector('.calc-hist'),
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
        STATS = [ // the results in the order shown: the name the engine gives each, and its label
            ['n', 'n'], ['sum', 'Σx'], ['squares', 'Σx<sup>2</sup>'],
            ['mean', '<span class="calc-x-bar">x</span>'], ['sdp', 'σ'], ['sds', 's'],
            ['min', 'min'], ['median', 'median'], ['max', 'max']
        ],
        fx = root.querySelector('.calc-fx'), // formulas and constants, over the keys
        fxButton = root.querySelector('.calc-fx-btn'),
        fxSearch = fx.querySelector('.calc-fx-search'),
        fxList = fx.querySelector('.calc-fx-list'),
        fxTab = 'formulas', // the list shown: formulas or constants
        fxItems = {}, // the entries of each list, with the text a search looks in
        conv = root.querySelector('.calc-conv'), // the converter of units, over the keys
        convButton = root.querySelector('.calc-conv-btn'),
        convGroup = conv.querySelector('.calc-conv-group'),
        convUnit = conv.querySelector('.calc-conv-unit'),
        convInput = conv.querySelector('.calc-conv-value'),
        convNote = conv.querySelector('.calc-conv-note'),
        convList = conv.querySelector('.calc-conv-list'),
        convAt = { g: 0, u: {} }, // the group shown, and the unit chosen in each group, by its name
        convNow = [], // the value in each unit of the group, as the list shows them
        graph = root.querySelector('.calc-graph'), // the graph of a function of x, over the keys
        graphButton = root.querySelector('.calc-graph-btn'),
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
        graphPinned = null, // the point clicked, which has the popup
        tools = Calc.querySelector('.calc-tools'), // the buttons at the top left of the display
        pressedKey,
        sliding, // long line being slid: its element and where the slide started
        opened = -1e9, // when the line above a result was last clicked: twice in a row opens it
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
                'log', 'π', 'y<sup>x</sup>'
            ],
            [
                'sin<sup>-1</sup>', 'cos<sup>-1</sup>', 'tan<sup>-1</sup>', 'log<sub>2</sub>',
                'sinh<sup>-1</sup>', 'cosh<sup>-1</sup>', 'tanh<sup>-1</sup>', '2<sup>x</sup>', 'mod', 'gcd', 'lcm',
                '10<sup>x</sup>', 'e', 'log<sub>y</sub>'
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
        return el === statsInput || el.tagName === 'INPUT' || el.classList.contains('calc-conv-pick');
    }

    document.addEventListener('keypress', function (e) {
        if (!elsewhere(e.target) && !field(e.target)) onKeyPress(e.which);
    }, false);

    document.addEventListener('keydown', function (e) {
        if (elsewhere(e.target)) return;
        if (field(e.target)) {
            if (e.which === 27 && !menu.hidden) { // Esc closes the menu first
                showMenu(false);
                e.preventDefault();
            } else if (e.which === 27 && graphUnpin()) { // Esc closes the point clicked on the graph first
                e.preventDefault();
            } else if (e.which === 27 && graph.contains(e.target) && graphBig(false)) { // then makes the big graph small
                e.preventDefault();
            } else if (e.which === 27) { // Esc closes the panel, as the history
                showStats(false);
                showFx(false);
                showConv(false);
                closeGraph();
                e.preventDefault();
            }
            return;
        }
        if (onKeyDown(e.which, e.shiftKey)) e.preventDefault();
    }, false);

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
            keyMatch = (',|.|-|–|/|÷|*|×|#|+/–|x|x!|E|EE|e|ex| |2nd|r|x√y|R|√|p|π|^|yx|\'|yx|"|yx|m|mr|v|mc|b|m+|n|m-|a|Ans|' +
                's|sin|c|cos|t|tan|S|sin-1|C|cos-1|T|tan-1|d|Deg|°|Deg|l|ln|L|log|\\|1/x|X|2x|N|nCr|P|nPr|f|a/b|M|mod|G|gcd|K|lcm|' +
                'o|MODE').split('|'),
            keyMatchHold = ('sin|sinh|cos|cosh|tan|tanh|m-|Rand|Deg|Rand|sin-1|sinh-1|cos-1|cosh-1|tan-1|tanh-1|' +
                '1|1/x|2|x2|3|x3|x√y|√|ln|log2|ex|2x|log|10x|π|e|yx|logy|a/b|°′″').split('|');

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
        if ((key === 'h' || key === 'H') && !holdKey) hold.textContent = 'hold';
        if (!keyBoard[key]) return;
        if ((key.match(/-1$|log2$|2x$|^(mod|gcd|lcm|10x|e|logy)$/) && !secondActive) ||
            (key.match(/h$|n$|cos$|ex$|^(%|nCr|nPr|log|π|yx)$/) && secondActive)) {
            keyDown(false, keyBoard['2nd']);
            doKey('2nd', true);
        }
        keyDown(false, keyBoard[key]);
        doKey(key, true);
    }

    function onKeyDown(key, shiftKey) { // true if the key was handled here
        if (key === 27 && !menu.hidden) { // Esc closes the menu
            showMenu(false);
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
        if (key === 27 && graph.classList.contains('calc-open')) { // and the graph, after the point clicked on it and its big view
            if (!graphUnpin() && !graphBig(false)) closeGraph();
            return true;
        }
        if (key === 27 && past.classList.contains('calc-open')) { // Esc closes the history
            showPast(false);
            return true;
        }
        if (key >= 37 && key <= 40 && graphTrace(key, shiftKey)) return true; // or the point clicked on the graph
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
        var sel = window.getSelection(), range, box, where;
        if (!sel.rangeCount || sel.isCollapsed) return '';
        range = sel.getRangeAt(0);
        where = range.commonAncestorContainer;
        if (!display.contains(where)) return '';
        box = document.createElement('div');
        box.appendChild(range.cloneContents());
        [].slice.call(box.querySelectorAll('.calc-fr')).reverse().forEach(function (fr) { // the innermost first
            fr.replaceWith([].slice.call(fr.children).map(function (part) {
                var t = part.textContent.trim();
                return /[ +–×÷/]/.test(t) ? '(' + t + ')' : t;
            }).join('/'));
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
        var sel = window.getSelection(), all = document.createRange(), range, from, to;

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
        if (from >= to) return null;
        if (!from && to === chars(all.endContainer, all.endOffset)) return [];
        // a drawn fraction is not written as the equation is typed: only all of it can be told
        return engine.edit || !display.querySelector('.calc-fr') ? [from, to] : null;
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

    // what is drawn, HTML or an element, as text: raised and lowered numbers as ² and ₂
    function plain(what) {
        var box = what;
        if (typeof what === 'string') {
            box = document.createElement('div');
            box.innerHTML = what;
        }
        [].slice.call(box.querySelectorAll('sup, sub')).forEach(function (s) {
            var chars = s.tagName === 'SUP' ? '⁰¹²³⁴⁵⁶⁷⁸⁹⁻ˣʸ' : '₀₁₂₃₄₅₆₇₈₉₋ₓᵧ';
            s.replaceWith(s.textContent.replace(/[\d\-xy]/g, function (c) {
                return chars.charAt('0123456789-xy'.indexOf(c));
            }));
        });
        return box.textContent.trim();
    }

    // the browser only runs a copy asked for by a script while something is
    // selected, so the hidden box is selected for a moment; the copy listener
    // above supplies the text: the given one, else the main line's
    function copy(text) {
        copying = text === undefined ? null : text;
        hiddenCopy.value = copying !== null ? copying : copyText();
        hiddenCopy.select();
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
        var key = e.target.closest('.calc-left > *, .calc-right > .del-ac, .calc-rad, .calc-mem, .calc-frac, .calc-fmt, .calc-hold, ' +
            '.calc-stat-btn, .calc-stats-tile, .calc-fx-btn, .calc-fx-row, .calc-conv-btn, .calc-conv-row, ' +
            '.calc-graph-btn, .calc-graph-size, .calc-graph-add, .calc-graph-del, .calc-graph-zoom > span, .calc-graph-pop-row, .calc-graph-play, ' +
            '.calc-graph-fn > .calc-graph-swatch, ' +
            '.calc-hist, .calc-past-clear, .calc-past-close, .calc-past-btn, .calc-past-del, .calc-past-unit, .calc-help');
        if (key === tipKey) return;
        hideTip();
        tipKey = key;
        if (key) tipTimer = setTimeout(showTip, Date.now() - tipGone < 400 ? 0 : 1000); // after a second of rest; from key to key at once
    }, false);

    pastList.addEventListener('scroll', hideTip, false);
    fxList.addEventListener('scroll', hideTip, false);
    convList.addEventListener('scroll', hideTip, false);

    tip.parentNode.addEventListener('mouseleave', function () {
        hideTip();
        tipKey = null;
    }, false);

    // a press, a key or the menu puts it away
    ['mousedown', 'keydown', 'contextmenu'].forEach(function (type) {
        document.addEventListener(type, hideTip, true);
    });

    function showTip() {
        var name = tipKey.textContent.replace(/\s*/g, ''), info = tipOf(tipKey, name), calc = tip.parentNode,
            at = inside(tipKey.getBoundingClientRect()), left, top, below;

        if (!info) return;
        tip.innerHTML = '<div class="calc-tip-head"><b>' + info.t + '</b>' +
            (secondKey(name) ? '<span class="calc-tip-2nd">2nd</span>' : '') +
            (info.k ? '<kbd>' + info.k + '</kbd>' : '') + '</div><div>' + info.d + '</div>' +
            (info.second && !secondActive ? '<div class="calc-tip-more">With 2nd: ' + info.second + '</div>' : '');
        tip.hidden = false;
        // above the key, in the middle of it; below it where there is no room above
        left = at.left + at.width / 2 - tip.offsetWidth / 2;
        left = Math.max(6, Math.min(calc.clientWidth - tip.offsetWidth - 6, left));
        top = at.top - tip.offsetHeight - 10;
        below = top < 4;
        if (below) top = at.bottom + 10;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
        tip.style.setProperty('--arrow', at.left + at.width / 2 - left - tip.clientLeft + 'px'); // from inside its border
        tip.classList.toggle('calc-tip-below', below);
    }

    function hideTip() {
        clearTimeout(tipTimer);
        if (!tip.hidden) tipGone = Date.now();
        tip.hidden = true;
    }

    // the tip of a key, or of a mark in the display; a function key and the unit say
    // how they are used now, tan 45 or 45 tan
    function tipOf(el, name) {
        var info = tipFor(el, name);
        return info && info.first && engine.fnFirst ? { t: info.t, d: info.first, k: info.k, second: info.second } : info;
    }

    // the memory and the number format say what they hold now
    function tipFor(el, name) {
        var places = fmt.places === 'auto' ? 'as many digits as each one needs' :
            fmt.places + (fmt.places === 1 ? ' decimal place' : ' decimal places'), info, value;
        if (el.classList.contains('calc-help')) return CalcTips['help'];
        if (el === radDeg) return CalcTips['unit ' + radDeg.firstChild.data];
        if (el === fxButton) return CalcTips[fx.classList.contains('calc-open') ? 'formulas close' : 'formulas'];
        if (fx.contains(el)) return fxTip(el);
        if (el === convButton) return CalcTips[conv.classList.contains('calc-open') ? 'converter close' : 'converter'];
        if (conv.contains(el)) return convTip(el);
        if (el === statsButton) return CalcTips[stats.classList.contains('calc-open') ? 'stats close' : 'stats'];
        if (stats.contains(el)) {
            if (el.classList.contains('calc-past-clear')) return CalcTips['stats clear'];
            if (el.classList.contains('calc-past-close')) return CalcTips['stats close'];
            info = CalcTips['stats ' + el.dataset.k];
            value = statsNow[el.dataset.k];
            return {
                t: info.t,
                d: info.d + (statsNow.n && isFinite(value) ? ' Now ' + statsValue(value).html + '; click to put it in.' : ''),
                k: ''
            };
        }
        if (el === graphButton) return CalcTips[graph.classList.contains('calc-open') ? 'graph close' : 'graph'];
        if (graph.contains(el)) {
            if (el.classList.contains('calc-past-clear')) return CalcTips['graph clear'];
            if (el.classList.contains('calc-past-close')) {
                info = CalcTips['graph close'];
                return root.classList.contains('calc-big') && !graphAlone ? { t: info.t, d: info.d, k: '' } : info; // Esc makes it small first
            }
            if (el === graphSize) return CalcTips[root.classList.contains('calc-big') ? 'graph small' : 'graph big'];
            if (el === graphAdd) return CalcTips['graph add'];
            if (el.classList.contains('calc-graph-del')) return CalcTips['graph remove'];
            if (el.classList.contains('calc-graph-pop-row')) return CalcTips['graph put ' + el.dataset.put];
            if (el.classList.contains('calc-graph-play')) return CalcTips[graphPlay[el.parentNode.dataset.k] ? 'graph pause' : 'graph play'];
            if (el.classList.contains('calc-graph-swatch')) {
                value = graphRows.indexOf(el.parentNode);
                return graphInputs[value].value.trim() ? CalcTips[graphOff[value] ? 'graph show' : 'graph hide'] : null;
            }
            return CalcTips['graph ' + el.dataset.zoom];
        }
        if (el === pastButton) return CalcTips[past.classList.contains('calc-open') ? 'history close' : 'history'];
        if (el.classList.contains('calc-past-clear')) return CalcTips['history clear'];
        if (el.classList.contains('calc-past-close')) return CalcTips['history close'];
        if (el.classList.contains('calc-past-del')) return CalcTips['history delete'];
        if (el.classList.contains('calc-past-unit')) return CalcTips['history unit ' + (UNITS.indexOf(name) > -1 ? name : 'mixed')];
        if (el.classList.contains('calc-past-btn')) {
            return CalcTips['history ' + el.dataset.act + (el.closest('.calc-past-eq') ? ' equation' : ' result')];
        }
        if (el === fracMark) return CalcTips[dmsMode ? 'DMS' : 'FRAC'];
        if (el === hold) return CalcTips['hold'];
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
    // (everything but the history and the statistics). In a box of a panel: Cut, Copy,
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
        var calc = menu.parentNode, at = inside({ left: e.clientX, top: e.clientY }), items;
        if (!root.contains(e.target)) return; // the rest of the page has the menu of the browser
        items = menuItems(e.target);
        e.preventDefault(); // in the calculator the menu of the browser is never shown
        if (!items) return;
        menu.items = items;
        menu.innerHTML = items.map(function (item, i) {
            return '<div data-i="' + i + '"' + (item[2] === false ? ' class="calc-off"' : '') + '>' + item[0] + '</div>';
        }).join('');
        showMenu(true);
        menu.style.left = Math.min(at.left, calc.clientWidth - menu.offsetWidth - 4) + 'px';
        menu.style.top = Math.min(at.top, calc.clientHeight - menu.offsetHeight - 4) + 'px';
    }, false);

    document.addEventListener('mousedown', function (e) {
        // a selection stays for Copy, and a box of a panel keeps the focus
        if (e.button === 2 && e.target.closest('.calc-display, .calc-past') && !e.target.closest('textarea, input')) e.preventDefault();
        if (!menu.hidden && !menu.contains(e.target)) showMenu(false);
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
        var box = el.closest('textarea, input'), panel = el.closest('.calc-past'), text, span, row, part, i, unit, k;

        if (el.closest('.calc-display')) {
            text = selectedText(); // taken now, as it is selected
            span = selectedSpan();
            return [
                ['Cut', function () { copy(text || copyText()); cutOut(span); }, !empty()],
                ['Copy', function () { copy(text || copyText()); }],
                ['Paste', function () { askPaste(null); }],
                ['Reset all', resetAll]
            ];
        }
        if (!panel) return null; // the keys
        if (box) return boxItems(box);

        if (panel === conv && (row = el.closest('.calc-conv-row')) && isFinite(convNow[i = +row.dataset.i])) {
            unit = CalcUnits.units[convAt.g].list[i];
            text = unit.dms && local(CalcEngine.dms(convNow[i])); // degrees, minutes and seconds have their signs
            return [
                ['Copy', function () { copy(text || local(+convNow[i].toPrecision(15))); }],
                ['Copy with unit', function () { copy(text || local(+convNow[i].toPrecision(15)) + ' ' + plain(unit.s)); }],
                ['Insert', function () { row.click(); }]
            ];
        }
        if (panel === stats && (row = el.closest('.calc-stats-tile')) && statsNow.n && isFinite(statsNow[row.dataset.k])) {
            text = local(statsValue(statsNow[row.dataset.k]).text);
            return [
                ['Copy', function () { copy(text); }],
                ['Insert', function () { row.click(); }]
            ];
        }
        if (panel === fx && (row = el.closest('.calc-fx-item'))) {
            k = fxItems[fxTab][+row.dataset.i].item;
            if (fxTab === 'constants') {
                return [
                    ['Copy', function () { copy(local(k.v)); }],
                    ['Copy with unit', function () { copy(local(k.v) + ' ' + plain(k.u)); }, !!k.u],
                    ['Insert', function () { putConstant(k); }]
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
            return ['copy', 'insert'].map(function (act) {
                return [act === 'copy' ? 'Copy' : 'Insert', function () { part.querySelector('[data-act="' + act + '"]').click(); }];
            }).concat([['Delete', function () { row.querySelector('.calc-past-del').click(); }]]);
        }
        if (panel === graph && (row = el.closest('.calc-graph-cell')) && isFinite(k = graphValues[row.dataset.r][row.dataset.c])) {
            text = local(+row.dataset.c ? statsValue(k).text : String(k));
            return [
                ['Copy', function () { copy(text); }],
                ['Insert', function () { row.click(); }]
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
                ['Insert', function () { row.click(); }]
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
        engine.reset(); // the equation too; the history and the statistics stay
        hold.textContent = '';
        keyBoard['AC'].children[0].firstChild.data = 'AC';
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
    // The menu is over the panel it was opened in
    document.addEventListener('pointerdown', function (e) {
        if (menu.contains(e.target) || !root.contains(e.target)) return; // not a press in the rest of the page
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

    function showPast(open) {
        if (open) {
            showStats(false); // one panel at a time
            showFx(false);
            showConv(false);
            showGraph(false);
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

    // A box of a panel gets the focus, to type in. A touch screen brings its keyboard
    // up over the panel at that, so there the box is left until it is touched,
    // unless the keyboard is up already for another box
    function focusBox(box) {
        if (window.matchMedia('(hover: none)').matches && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return false;
        box.focus();
        return true;
    }

    // ---------------- statistics ---------------- //

    // A list of numbers, typed or pasted, and what it gives: n, the sums, the
    // mean, the standard deviations, min, median and max, worked out as it is
    // typed. A click on a result puts it into the calculation, as Ans does
    statsGrid.innerHTML = STATS.map(function (s) {
        return '<div class="calc-stats-tile" data-k="' + s[0] + '"><span class="calc-stats-label">' + s[1] +
            '</span><span class="calc-stats-value"></span></div>';
    }).join('');

    statsButton.addEventListener('click', function () {
        showStats(!stats.classList.contains('calc-open'));
    }, false);

    stats.querySelector('.calc-past-close').addEventListener('click', function () {
        showStats(false);
    }, false);

    stats.querySelector('.calc-past-clear').addEventListener('click', function () {
        statsInput.value = '';
        renderStats();
        saveState();
        focusBox(statsInput);
    }, false);

    statsInput.addEventListener('input', function () {
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
        if (open) {
            showPast(false);
            showFx(false);
            showConv(false);
            showGraph(false);
            placePanel(stats);
            renderStats();
        }
        stats.classList.toggle('calc-open', open);
        statsButton.classList.toggle('calc-on', open);
        if (open) {
            if (focusBox(statsInput)) statsInput.setSelectionRange(statsInput.value.length, statsInput.value.length);
        } else if (document.activeElement === statsInput) {
            statsInput.blur(); // the keys are the calculator's again
        }
    }

    // the results as the display shows numbers: in the number format, and as
    // fractions in fraction mode
    function renderStats() {
        var s = statsNow = CalcEngine.stats(statsInput.value, engine.comma, BY[statsBy.at][0]);
        [].forEach.call(statsGrid.children, function (tile) {
            var value = s[tile.dataset.k], known = s.n > 0 && isFinite(value), shown = tile.lastChild, size = 17;
            tile.classList.toggle('calc-none', !known);
            shown.innerHTML = known ? statsValue(value).html : '–';
            shown.style.fontSize = '';
            while (size > 11 && shown.scrollWidth > shown.clientWidth) { // a long one gets smaller, as on the display
                shown.style.fontSize = --size + 'px';
            }
        });
        statsNote.textContent = !s.n && !s.bad.length ? (statsBy.at ? 'Only ' + BY[statsBy.at][2] + (statsBy.at > 1 ? ' and new lines' : '') + ' are between two numbers.' :
            'Apart by spaces, ' + (engine.comma ? 'semicolons' : 'commas') + ' or new lines; a column from a spreadsheet works too.') :
            s.n + (s.n === 1 ? ' number' : ' numbers') +
            (s.bad.length ? ' · left out: ' + s.bad.slice(0, 3).join(', ') + (s.bad.length > 3 ? ' …' : '') : '');
    }

    function statsValue(value) {
        return shownResult({ value: String(value), frac: fracMode, dms: dmsMode }, String(+(+value).toPrecision(13)));
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
        GRAPH_NAMES = { root: 'Root', min: 'Min', max: 'Max', yint: 'y-intercept', cross: 'Crossing' },
        // the rows of the popup: of a point, x, y and the slope; of an area, where it starts and ends, and how much
        GRAPH_ROWS = { x: '<i>x</i>', y: '<i>y</i>', m: 'Slope', a: 'From <i>x</i>', b: 'To <i>x</i>', s: 'Area' },
        graphTouch = {}, // the pointers pressed on the plot, where each is now
        graphStart = null, // where they were when the last one went down or up, and the view then
        graphMoved = false, // the press became a drag or a pinch, so it is not a click
        graphSaving, // saves the view once the wheel stops
        graphOff = [false, false, false, false, false, false, false], // the curves hidden by a click on their dot: kept, not drawn
        graphSharp = 0, // pixels of the canvas to each of the plot at least: 2 while a picture is made
        graphPop = graphPlot.querySelector('.calc-graph-pop'), // the point clicked: its x and y, each to insert
        GRAPH_POP_WAIT = 2000, // the popup opened with the mouse goes this many ms after the mouse is off it
        graphHiding, // that wait
        graphPopShut = false, // the popup put away, the point clicked and its tangent still drawn
        GRAPH_TRACE = 2, // ← and → move the point clicked this many pixels along its curve, ten times as far with Shift
        graphTracing = -1, // the curve traced last: of the two at a crossing, the one to go on along
        graphShading = false, // the ∫ button pressed: a drag along a curve shades its area, and does not move the view
        graphAreaButton = graphPlot.querySelector('[data-zoom="area"]'),
        graphSize = graph.querySelector('.calc-graph-size'), // the graph as big as the page, and back
        graphAlone = false; // the page is the graph's own window, in the extension: only the graph, always big

    // A click on the dot of a curve hides it, and shows it again: it stays typed, but is not
    // drawn, marked or in the table. Its × removes it
    graphRows.forEach(function (row, i) {
        var dot = row.querySelector('.calc-graph-swatch');
        row.querySelector('.calc-graph-del').addEventListener('click', function (e) {
            e.preventDefault(); // not the label's focus of the box
            removeCurve(i);
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
        box.value = '';
        graphCount++;
        freeHues();
        readGraph();
        saveState();
        box.focus();
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
            if (!ask('big', { big: true })) return false;
            if (!graph.classList.contains('calc-open')) showGraph(true);
        }
        root.classList.toggle('calc-big', on);
        if (!on) ask('big', { big: false });
        graphRender();
        return true;
    }

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
        graphInputs.forEach(function (box) { box.value = ''; });
        graphFrom.value = graphBy.value = '';
        graphCount = 1;
        graphHue = [0, 1, 2, 3, 4, 5, 6];
        graphOff = graphOff.map(function () { return false; });
        forgetLetters();
        graphView = null;
        graphLines = 0;
        readGraph();
        saveState();
        focusBox(graphInputs[0]);
    }, false);

    graphInputs.forEach(function (box, i) {
        box.addEventListener('input', function () {
            readGraph(true);
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
        if (open) {
            showPast(false);
            showStats(false);
            showFx(false);
            showConv(false);
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
        graphOff = graphOff.map(function (off, i) { return !!(saved && Array.isArray(saved.off) && saved.off[i] === true); });
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
    // -10 to 10 at first; while a function is typed, the sliders wait until the typing stops
    function readGraph(typing) {
        var letters = [];
        graphFns = graphInputs.map(function (box, i) {
            var text = i < graphCount ? box.value.trim() : '', fn = text ? CalcEngine.graph(text, engine.comma, graphVars) : null,
                row = graphRows[i];
            if (fn) {
                fn.letters.forEach(function (k) {
                    if (letters.indexOf(k) < 0) letters.push(k);
                });
            }
            if (!text) graphOff[i] = false; // what is typed next is shown
            row.hidden = i >= graphCount;
            row.classList.toggle('calc-bad', !!text && !fn);
            row.classList.toggle('calc-graph-off', graphOff[i]);
            row.classList.toggle('calc-graph-empty', !text);
            row.querySelector('.calc-graph-swatch').style.setProperty('--c', curveColor(i));
            return graphOff[i] ? null : fn;
        });
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
                var box = ' type="text" inputmode="decimal" spellcheck="false" autocomplete="off" maxlength="16"';
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
            n = +boxValue(el);
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
            if (stopSliders()) saveState();
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

    // the tab shown, drawn as it is now
    function graphRender() {
        if (graphTab === 'table') renderTable(); else drawGraph();
    }

    // true if a curve has a function of an angle, so its x follows Deg or Rad
    function graphAngles() {
        return graphFns.some(function (fn) { return fn && fn.angles; });
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

    function drawGraph() {
        var w = graphPlot.clientWidth, h = graphPlot.clientHeight, r = Math.max(graphSharp, (window.devicePixelRatio || 1) * scale()),
            ctx = graphCanvas.getContext('2d'), v;
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
        });
        graphTangent(ctx, v, w + h, graphPinned);
        graphMarks = graphBusy(CalcEngine.keyPoints(graphFns, { x0: graphX(v, 0), x1: graphX(v, w), y0: graphY(v, h), y1: graphY(v, 0) }, deg));
        graphMarks.forEach(function (p) {
            graphDot(ctx, v, p, 3.5, GRAPH_INK.paper, curveColor(p.i));
        });
        [graphAt, graphPinned].forEach(function (p, at) {
            if (!p || p.area || (at && p === graphAt)) return;
            if (!p.t && !p.spot && graphFns[p.i]) p.y = graphFns[p.i].at(p.x, deg, true); // on the curve as the unit is now
            if (!isFinite(p.y) || Math.abs(plotY(v, p.y)) > 1e6) return;
            if (p.spot) {
                if (p === graphPinned) graphCross(ctx, v, p); // the pointer is cross enough until a click
            } else graphDot(ctx, v, p, 4.5, curveColor(p.i), GRAPH_INK.paper);
        });
        graphShown();
        placePop(v);
    }

    // The slope of the point clicked on a curve, for its popup, and its tangent, dashed in
    // the curve's color across the plot, as long as the plot is wide and high (far). None
    // for a place off the curves, where two cross, or where the curve has no slope
    function graphTangent(ctx, v, far, p) {
        var fn = p && !p.spot && !p.area && p.j === undefined && graphFns[p.i], x, y, k;
        if (!p) return;
        p.m = NaN;
        if (!fn) return;
        if (!p.t) p.y = fn.at(p.x, deg, true); // on the curve as the unit and the letters are now
        p.m = CalcEngine.slope(fn, p.x, deg);
        if (!isFinite(p.m) || !isFinite(p.y)) return;
        x = plotX(v, p.x);
        y = plotY(v, p.y);
        k = -p.m * v.ux / v.uy; // its slope in pixels, down the plot
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

    // The area of a curve from a to b, shaded in its color down to the x axis, and its value,
    // as the letters are now; the popup is in the middle of what is in the view. Where the
    // curve has no value it is not shaded, and the area is none
    function graphShade(ctx, v, w, h, p) {
        var fn = graphFns[p.i], x0 = Math.max(0, plotX(v, p.a)), x1 = Math.min(w, plotX(v, p.b)),
            axis = Math.max(-h, Math.min(2 * h, plotY(v, 0))), at = [x0], last = null, k, x;
        p.s = fn ? CalcEngine.area(fn, p.a, p.b, deg) : NaN;
        x = graphX(v, (x0 + x1) / 2);
        p.x = x;
        p.y = fn && isFinite(fn.at(x, deg)) ? fn.at(x, deg) / 2 : 0;
        if (!fn || x1 <= x0) return;
        for (k = Math.ceil(x0 * 2); k <= x1 * 2; k++) at.push(k / 2);
        at.push(x1);
        ctx.beginPath();
        at.forEach(function (px) {
            var y = fn.at(graphX(v, px), deg);
            if (!isFinite(y)) {
                if (last !== null) ctx.lineTo(last, axis);
                last = null;
                return;
            }
            if (last === null) ctx.moveTo(px, axis);
            ctx.lineTo(px, Math.max(-h, Math.min(2 * h, plotY(v, y))));
            last = px;
        });
        if (last !== null) ctx.lineTo(last, axis);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = curveColor(p.i);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // the curve nearest above or below a place, with a value at its x; -1 for none
    function nearestCurve(at) {
        var v = viewNow(), x = graphX(v, at.x), best = -1, near = Infinity;
        graphFns.forEach(function (fn, i) {
            var y = fn ? fn.at(x, deg) : NaN, d = Math.abs(plotY(v, y) - at.y);
            if (isFinite(y) && d < near) {
                near = d;
                best = i;
            }
        });
        return best;
    }

    // an end of an area, at px of the plot: the x of a dot of the curve within reach, a root
    // or a crossing, else the x there, rounded to what a pixel tells apart
    function areaEnd(v, i, px) {
        var best = null;
        graphMarks.forEach(function (p) {
            var d = Math.abs(plotX(v, p.x) - px);
            if ((p.i === i || p.j === i) && d <= 8 && (!best || d < best.d)) best = { d: d, x: p.x };
        });
        return best ? best.x : graphRound(graphX(v, px), v.ux);
    }

    // the drag with ∫ pressed: the area of the curve where it began, from there to the pointer.
    // Its popup waits for the drag to end. False where no curve has a value there
    function graphAreaTo(s, at) {
        var v = viewNow(), a, b;
        if (s.i === undefined) s.i = nearestCurve(s.p[0]);
        if (s.i < 0) return false;
        a = areaEnd(v, s.i, s.p[0].x);
        b = areaEnd(v, s.i, at.x);
        graphPinned = { area: true, i: s.i, a: Math.min(a, b), b: Math.max(a, b) };
        graphAt = null;
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
        if (!p || p.spot || p.area || !graph.classList.contains('calc-open') || graphTab !== 'graph') return false;
        i = p.j !== undefined && p.j === graphTracing ? p.j : p.i;
        if (!graphFns[i]) return false;
        if (key === 38 || key === 40) {
            graphFns.forEach(function (fn, k) {
                var y = fn && k !== i ? fn.at(p.x, deg, true) : NaN;
                if (isFinite(y) && (y - p.y) * dir > 0 && (!next || Math.abs(y - p.y) < Math.abs(next.y - p.y))) next = { i: k, x: p.x, y: y };
            });
            if (!next) return true;
        } else {
            x = graphRound(p.x + dir * GRAPH_TRACE * (shift ? 10 : 1) * v.ux, v.ux);
            graphMarks.forEach(function (m) {
                if ((m.i === i || m.j === i) && (m.x - p.x) * dir > 0 && (m.x - x) * dir <= 0 &&
                    (!next || Math.abs(m.x - p.x) < Math.abs(next.x - p.x))) next = m;
            });
            if (!next) next = { i: i, x: x, y: graphFns[i].at(x, deg, true) };
        }
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

    // a place on the area shaded, or by its edge
    function onArea(v, p, at) {
        var x = graphX(v, at.x), fn = graphFns[p.i], top = plotY(v, fn ? fn.at(x, deg) : NaN), axis = plotY(v, 0);
        return x >= p.a && x <= p.b && at.y >= Math.min(top, axis) - 4 && at.y <= Math.max(top, axis) + 4;
    }

    // The ∫ button, pressed or let go: pressed, the next drag along a curve shades its area
    function areaOn(on) {
        graphShading = on;
        graphAreaButton.classList.toggle('calc-on', on);
        graphPlot.classList.toggle('calc-graph-shading', on);
        if (graph.classList.contains('calc-open')) graphShown();
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

    // A curve, from two values of each pixel across. It breaks where there is no
    // value, and where it leaves by one edge and comes back by the other, as tan x
    // does at 90°, unless the value between the two is between them too: a steep line
    function drawCurve(ctx, v, w, h, fn, color) {
        var n = Math.ceil(w * 2), i, x, y, py, last = null, mid;
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
            if (last) ctx.lineTo(i / 2, Math.max(-h, Math.min(2 * h, py)));
            else ctx.moveTo(i / 2, Math.max(-h, Math.min(2 * h, py)));
            last = { x: x, y: y, py: py };
        }
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    // The point at a place of the plot: a mark within reach of it, the nearest; else the
    // curve within reach above or below it, the nearest, at its x; else the place itself,
    // its x and y rounded to what a pixel tells apart (spot)
    function graphPoint(at, reach) {
        var v = viewNow(), x = graphRound(graphX(v, at.x), v.ux), best = null;
        graphMarks.forEach(function (p) {
            var d = Math.hypot(plotX(v, p.x) - at.x, plotY(v, p.y) - at.y);
            if (d <= reach && (!best || d < best.d)) best = { d: d, p: p };
        });
        if (best) return best.p;
        graphFns.forEach(function (fn, i) {
            var y = fn ? fn.at(x, deg, true) : NaN, d = Math.abs(plotY(v, y) - at.y);
            if (isFinite(y) && d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, x: x, y: y } };
        });
        return best ? best.p : { x: x, y: graphRound(graphY(v, at.y), v.uy), spot: true };
    }

    // what a point is, and its x and y, as the line above the plot and the popup show them
    function graphName(p) {
        return p.spot ? 'Point' : p.area ? 'Area under the curve' : p.t ? p.t.map(function (t) { return GRAPH_NAMES[t]; }).join(', ') : 'On the curve';
    }

    // to 13 digits, as the display shows a result: 1.732050807569. What is inserted is the whole number
    function graphValue(p, k) {
        var n = String(+p[k].toPrecision(13));
        return p.spot || k === 'x' || k === 'a' || k === 'b' ? shownResult({ value: n }, n).html : statsValue(p[k]).html;
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
        var unit = graphAngles() ? UNITS[deg] : '', p = graphAt;
        if (graphRows.some(function (row) { return row.classList.contains('calc-bad'); })) {
            graphNote.textContent = 'Not a function of x yet: write x^2 for x², 2x for 2 × x.';
        } else if (!graphFns.some(Boolean) && graphOff.some(Boolean)) {
            graphNote.textContent = 'Every curve is hidden: click its dot to show it.';
        } else if (graphTab === 'table') {
            graphNote.textContent = !graphFns.some(Boolean) ? 'Type a function of x for its values.' :
                graphTable.querySelector('.calc-bad') ? 'Start and step are numbers, the step above 0.' :
                    'Click a value to put it in the equation.' + (unit ? ' · ' + unit : '');
        } else if (graphShading && graphFns.some(Boolean)) {
            graphNote.textContent = 'Drag along a curve for the area under it; an end near a dot goes to it.';
        } else if (p) {
            graphNote.innerHTML = graphSwatches(p) + '<em>' + graphName(p) + '</em>' +
                '<span><i>x</i> = ' + graphValue(p, 'x') + '</span>' +
                '<span><i>y</i> = ' + (isFinite(p.y) ? graphValue(p, 'y') : 'none') + '</span>';
        } else if (!graphInputs.some(function (box) { return box.value.trim(); })) {
            graphNote.textContent = 'Type a function of x. Drag to move, scroll or pinch to zoom.';
        } else {
            graphNote.textContent = 'Point at the graph for values; click to insert.' + (unit ? ' · ' + unit : '');
        }
    }

    // The popup of the point clicked, over it, or under it where there is no room above;
    // its x and y, and the slope of its curve there, each go into the calculation with a
    // click. It goes with the point as the view moves, and hides while the point is out of the view
    function placePop(v) {
        var p = graphPinned, w = graphPlot.clientWidth, h = graphPlot.clientHeight, px, py, html, left, top, below;
        px = p && plotX(v, p.x);
        py = p && plotY(v, p.y);
        if (!p || graphPopShut || !isFinite(p.y) || px < 0 || px > w || py < 0 || py > h) {
            graphPop.hidden = true;
            return;
        }
        html = '<div class="calc-graph-pop-head">' + graphSwatches(p) + '<b>' + graphName(p) + '</b></div>' +
            (p.area ? ['a', 'b', 's'] : ['x', 'y', 'm']).map(function (k) {
                if (k === 'm' && !isFinite(p.m)) return '';
                if (k === 's' && !isFinite(p.s)) return '<div class="calc-graph-pop-none">Area = none</div>';
                return '<div class="calc-graph-pop-row" data-put="' + k + '"><span>' + GRAPH_ROWS[k] + ' = ' +
                    graphValue(p, k) + '</span>' + insertIcon() + '</div>';
            }).join('');
        if (graphPop.innerHTML !== html) graphPop.innerHTML = html;
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

    // the point clicked goes, and its popup; false if there was none
    function graphUnpin() {
        popLater(false);
        if (!graphPinned || !graph.classList.contains('calc-open') || graphTab !== 'graph') return false;
        graphPinned = null;
        drawGraph();
        return true;
    }

    // A popup opened with the mouse goes a while after the mouse is off it, so the graph can be
    // seen again; back on it in time, it stays. Not while the menu of a right click on it is open.
    // One opened by a touch stays, as no pointer rests on it
    function popLater(on) {
        clearTimeout(graphHiding);
        if (!on) return;
        graphHiding = setTimeout(function () {
            if (!menu.hidden) popLater(true); else popShut();
        }, GRAPH_POP_WAIT);
    }

    // The popup goes, after that wait or at once on a zoom, by the wheel, a pinch or the buttons;
    // the point and its tangent stay, and a click on the point brings the popup back
    function popShut() {
        popLater(false);
        graphPopShut = true;
        graphPop.hidden = true;
    }

    graphPop.addEventListener('pointerenter', function () {
        popLater(false);
    }, false);

    graphPop.addEventListener('pointerleave', function (e) {
        popLater(e.pointerType === 'mouse' && !!graphPinned);
    }, false);

    // x or y of the point clicked goes into the calculation, as a result of the statistics does
    graphPop.addEventListener('click', function (e) {
        var row = e.target.closest('.calc-graph-pop-row'), n = row && graphPinned && graphPinned[row.dataset.put];
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
            if (e.pointerType === 'mouse') {
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
            if (!graphShading || s.p.length !== 1 || !graphAreaTo(s, at)) graphMove(s.view, s.p[0], at, 1);
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
    // area opens its popup as it ends, and the ∫ button is let go
    function graphUp(e) {
        var at = graphTouch[e.pointerId], v = viewNow(), p = graphPinned, mouse = e.pointerType === 'mouse', s = graphStart;
        if (!at) return;
        delete graphTouch[e.pointerId];
        if (graphMoved && graphShading && s && s.i >= 0 && !graphPointers().length) {
            areaOn(false);
            graphPopShut = false;
            popLater(mouse);
            drawGraph();
        } else if (e.type === 'pointerup' && !graphMoved && !graphPointers().length) {
            if (p && (p.area ? onArea(v, p, at) : Math.hypot(plotX(v, p.x) - at.x, plotY(v, p.y) - at.y) <= (mouse ? 8 : 16))) {
                if (graphPopShut) graphPopShut = false; else graphPinned = null;
            } else {
                graphPinned = graphPoint(at, mouse ? 10 : 18);
                graphPopShut = false;
                if (mouse) graphAt = graphPinned;
            }
            popLater(mouse && !!graphPinned); // the mouse is on the point, off the popup
            drawGraph();
        }
        graphBegin();
        if (graphMoved && !graphPointers().length) saveState();
    }

    graphCanvas.addEventListener('pointerup', graphUp, false);
    graphCanvas.addEventListener('pointercancel', graphUp, false);

    // the pointer leaves: the line above says what to do again; the popup stays
    graphCanvas.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse' || graphTouch[e.pointerId]) return;
        graphAt = null;
        drawGraph();
    }, false);

    // the wheel zooms about the pointer
    graphCanvas.addEventListener('wheel', function (e) {
        var at = onPlot(e), dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
        e.preventDefault();
        popShut();
        graphMove(viewNow(), at, at, Math.pow(1.002, Math.max(-300, Math.min(300, dy))));
        clearTimeout(graphSaving);
        graphSaving = setTimeout(saveState, 300);
    }, { passive: false });

    // the buttons: twice as close, twice as far, about the middle; the start again; ∫ for an
    // area; and the picture, in the corner below
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
        popShut();
        if (b.dataset.zoom === 'home') {
            graphView = null;
            drawGraph();
        } else {
            graphMove(viewNow(), mid, mid, b.dataset.zoom === 'in' ? 0.5 : 2);
        }
        saveState();
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

        lines = graphFns.map(function (fn, i) {
            return fn && { i: i, text: 'y = ' + graphInputs[i].value.trim() };
        }).filter(Boolean);
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
            ctx.lineCap = 'round';
            ctx.strokeStyle = curveColor(l.i);
            ctx.stroke();
            ctx.fillText(l.text, 42, y);
        });
        return pic;
    }

    // saved as a file, graph.png
    function saveGraph() {
        graphPicture().toBlob(function (blob) {
            var a = document.createElement('a'), url = URL.createObjectURL(blob);
            a.href = url;
            a.download = 'graph.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
        }, 'image/png');
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
        saveState();
    }, false);

    function showGraphTab(tab) {
        graphTab = tab === 'table' ? 'table' : 'graph';
        [].forEach.call(graph.querySelectorAll('.calc-graph-tab'), function (t) {
            t.classList.toggle('calc-on', t.dataset.tab === graphTab);
        });
        graphPlot.hidden = graphTab !== 'graph';
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
    // holds no number, or a step that is not above 0, is marked, and goes by the view
    function tableSteps() {
        var v = viewNow(), w = plotWidth(), want = w * v.ux / 20, p = Math.pow(10, Math.floor(Math.log10(want))), m = want / p,
            by = graphAngles() && deg === 1 && want > 3 && want <= 180 ?
                [5, 10, 15, 30, 45, 90, 180].filter(function (d) { return d >= want; })[0] :
                p * (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10),
            from, typed;
        by = +by.toPrecision(12);
        graphBy.placeholder = local(String(by));
        typed = +boxValue(graphBy);
        graphBy.parentNode.classList.toggle('calc-bad', !!graphBy.value && !(typed > 0 && isFinite(typed)));
        if (graphBy.value && typed > 0 && isFinite(typed)) by = typed;
        from = +(Math.ceil((v.x - w / 2 * v.ux) / by) * by).toPrecision(12);
        graphFrom.placeholder = local(String(from));
        typed = +boxValue(graphFrom);
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
            row = [x].concat(shown.map(function (i) { return graphFns[i].at(x, deg, true); }));
            graphValues[k] = row;
            html += '<div class="calc-graph-line">' + row.map(function (n, c) {
                var text = !isFinite(n) ? '–' : c ? tableValue(n, room) : graphValue({ x: n }, 'x');
                return '<span class="calc-graph-cell' + (isFinite(n) ? '' : ' calc-none') + '" data-r="' + k + '" data-c="' + c + '">' +
                    text + '</span>';
            }).join('') + '</div>';
        }
        return html;
    }

    // the curves shown in the table, by their number
    function tableCurves() {
        return graphFns.map(function (fn, i) { return fn ? i : -1; }).filter(function (i) { return i > -1; });
    }

    function renderTable() {
        var shown = tableCurves(), s;
        if (!graph.classList.contains('calc-open') || graphTab !== 'table') return;
        s = tableSteps();
        graphLines = Math.max(graphLines, 60);
        graphValues = [];
        graphList.style.setProperty('--cols', shown.length + 1);
        graphList.innerHTML = '<div class="calc-graph-line calc-graph-names"><span><i>x</i></span>' + shown.map(function (i) {
            return '<span>' + graphSwatch(i) + '<i>y</i></span>';
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

    // a formula opens its letters, or closes them; a constant is put in
    fxList.addEventListener('click', function (e) {
        var row = e.target.closest('.calc-fx-row'), item = row && row.parentNode;
        if (!item) {
            if (e.target.closest('.calc-fx-insert')) insertFormula(e.target.closest('.calc-fx-item'));
            return;
        }
        if (fxTab === 'constants') putConstant(fxItems.constants[+item.dataset.i].item);
        else openFormula(item.classList.contains('calc-on') ? null : item);
    }, false);

    // a number box keeps only what a number is made of: digits, one point, a minus first;
    // marks: the °′″ of an angle. The point is a comma while that is the decimal mark, whichever is typed
    function onlyNumber(input, marks) {
        var v = input.value, at = input.selectionStart, clean = '', point = false, mark = engine.comma ? ',' : '.', n, c;
        for (n = 0; n < v.length; n++) {
            c = v.charAt(n);
            if (engine.comma && c === '.') c = ',';
            if (/\d/.test(c) || (marks && /[°′″]/.test(c)) || (c === '-' && !clean) || (c === mark && !point && (point = true))) clean += c;
            else if (n < at) at--;
        }
        if (clean !== v) {
            input.value = clean;
            input.setSelectionRange(at, at);
        }
    }

    fxList.addEventListener('input', function (e) {
        onlyNumber(e.target);
        var note = e.target.closest('.calc-fx-form').querySelector('.calc-fx-note');
        e.target.classList.remove('calc-bad');
        note.classList.remove('calc-fx-warn'); // a value changed: the usual note again
        note.innerHTML = note.dataset.usual;
    }, false);

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

    function showFx(open) {
        if (open) {
            showPast(false);
            showStats(false);
            showConv(false);
            showGraph(false);
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
                '</span></span></div></div>';
        });
        fxList.innerHTML = html || '<div class="calc-fx-none">Nothing found</div>';
        fxList.scrollTop = 0;
        hideTip();
    }

    // 6.6743 × 10⁻¹¹ m³/(kg·s²); a value of a usual size written out, and a whole
    // number up to a trillion too: 299,792,458. Shown to 12 digits; it is put in whole
    function constantValue(k) {
        var a = Math.abs(k.v), parts = (+k.v.toPrecision(12)).toExponential().split('e'),
            shown = a >= (k.v % 1 ? 1e6 : 1e12) || a < 1e-3 ? local(parts[0]) + ' × 10<sup>' + +parts[1] + '</sup>' : CalcEngine.group(String(+k.v.toPrecision(12)), fmt.group);
        return shown.replace(/-/g, '−') + (k.u ? '<span class="calc-fx-unit">' + k.u + '</span>' : '');
    }

    // A box for each letter of the formula, and Insert. A result in the display
    // is put in the first one, to start from; a formula with angles says their unit
    function openFormula(item) {
        var open = fxList.querySelector('.calc-fx-item.calc-on'), f, form, first;

        if (open) {
            open.classList.remove('calc-on');
            open.removeChild(open.querySelector('.calc-fx-form'));
        }
        if (!item) return;
        hideTip();
        f = fxItems.formulas[+item.dataset.i].item;
        form = item.appendChild(document.createElement('div'));
        form.className = 'calc-fx-form';
        form.innerHTML = f.v.map(function (v) {
            return '<label class="calc-fx-var"><span class="calc-fx-sym">' + v[1] + '</span>' +
                '<input type="text" inputmode="decimal" pattern="-?[0-9]*[.,]?[0-9]*" spellcheck="false" autocomplete="off" maxlength="40" placeholder="' +
                v[2] + '"></label>';
        }).join('') + '<div class="calc-fx-actions"><span class="calc-fx-note">' +
            (f.deg ? 'Angles in ' + ['radians', 'degrees', 'gradians'][deg] + ', the unit in use' : '') +
            '</span><span class="calc-fx-insert">Insert' + insertIcon() + '</span></div>';
        item.classList.add('calc-on');
        form.querySelector('.calc-fx-note').dataset.usual = form.querySelector('.calc-fx-note').innerHTML;
        first = form.querySelector('input');
        if (!engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
            first.value = local(+(+engine.value).toPrecision(13));
        }
        if (focusBox(first)) first.select();
        item.scrollIntoView({ block: 'nearest' });
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
        trial.fnFirst = engine.fnFirst;
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

    // the tip of a formula: what it gives, its letters and an example; of a constant, what it is
    function fxTip(el) {
        var item = el.parentNode, it;
        if (el.classList.contains('calc-past-close')) return CalcTips['formulas close'];
        if (!el.classList.contains('calc-fx-row') || item.classList.contains('calc-on')) return null;
        it = fxItems[fxTab][+item.dataset.i].item;
        if (fxTab === 'constants') {
            return { t: it.t, d: (it.d ? it.d + ' ' : '') + 'Click to put it into the equation.', k: '' };
        }
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

    // ---------------- converter ---------------- //

    // A value in one unit, and the list of what it is in the other units of its
    // group, worked out as it is typed. A click on one puts it into the
    // calculation, as Ans does. The value can be an equation too: 5*12
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
        if (open) {
            showPast(false);
            showStats(false);
            showFx(false);
            showGraph(false);
            placePanel(conv);
            if (!engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
                convInput.value = local(+(+engine.value).toPrecision(13));
            }
            renderConv(true);
        }
        conv.classList.toggle('calc-open', open);
        convButton.classList.toggle('calc-on', open);
        showPicker(convGroup, false);
        showPicker(convUnit, false);
        if (open) {
            if (focusBox(convInput)) convInput.select(); // typing replaces it
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
            trial.fnFirst = engine.fnFirst;
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
        store('conv', { g: CalcUnits.units[convAt.g].c, u: convAt.u, v: convInput.value });
    }

    // the converter as it was left: its group, kept by its name, the unit of each group, the value
    function loadConv(s) {
        var g = CalcUnits.units.map(function (group) { return group.c; }).indexOf(s && s.g);
        convAt.g = g > -1 ? g : 0;
        convAt.u = s && s.u && typeof s.u === 'object' ? s.u : {};
        convInput.value = s && typeof s.v === 'string' ? s.v : '1';
    }

    // the tip of a value: what it is, and that a click puts it in
    function convTip(el) {
        var group = CalcUnits.units[convAt.g], unit;
        if (el.classList.contains('calc-past-close')) return CalcTips['converter close'];
        if (!el.classList.contains('calc-conv-row') || el.classList.contains('calc-none')) return null;
        unit = group.list[+el.dataset.i];
        return { t: unit.t.charAt(0).toUpperCase() + unit.t.slice(1), d: 'Click to put it into the equation.', k: '' };
    }

    // the statistics, the formulas, the converter and the graph have their button while they are turned on in the options
    function setPanels(statsOn, fxOn, convOn, graphOn) {
        statsButton.hidden = !statsOn;
        fxButton.hidden = !fxOn;
        convButton.hidden = !convOn;
        graphButton.hidden = !graphOn;
        if (!statsOn) showStats(false);
        if (!fxOn) showFx(false);
        if (!convOn) showConv(false);
        if (!graphOn) showGraph(false);
        showTools();
    }

    // the line above a result starts after the buttons shown at the top left
    function showTools() {
        display.parentNode.style.setProperty('--tools', [].filter.call(tools.children, function (b) {
            return !b.hidden;
        }).length);
    }

    // newest first
    function renderPast() {
        var n = engine.past.length, i, p, row, eq, line, res, unit, del;

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

    // the arrow of insert: up into the display; the Insert of the formulas shows it too
    function insertIcon() {
        return '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round"><path d="M13 13h-5a2 2 0 0 1-2-2V3" /><path d="M9 6l-3-3-3 3" /></svg>';
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
            var again, edge = edgeAt(el, e.clientX);

            if (edge) return goEdge(el, edge);
            // the second click of two: the first one put the cursor in, and wrote the line again
            if (e.detail === 2 && !slid && el === display) return pickValue(el, e.clientX, e.clientY);
            if (slid || (el === display && !window.getSelection().isCollapsed)) return; // a slide or a selection, not a click
            if (el === logline) { // the second click of two, or tap, opens it
                again = e.detail === 2 || e.timeStamp - opened < 400;
                opened = e.timeStamp;
                if (!again) return;
            }
            if (el === logline ? engine.edit || !(engine.done || engine.error) :
                !engine.edit && (engine.done || engine.error)) return; // a result: nothing to put a cursor in
            if (engine.point(textAt(el, e.clientX).n, deg)) {
                unselect(); // of the result, as the equation takes its place
                refresh();
                saveState();
            }
        }, false);
    });

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
        store('graph', {
            f: graphInputs.slice(0, graphCount).map(function (box) { return box.value; }), c: graphHue.slice(0, graphCount),
            view: graphView, tab: graphTab, from: graphFrom.value, by: graphBy.value, off: graphOff.slice(0, graphCount),
            p: graphLetters.reduce(function (p, k) {
                if (graphRange[k]) p[k] = [graphVars[k], graphRange[k][0], graphRange[k][1]];
                return p;
            }, {})
        });
        store('calc', engine.save());
        if (graphAlone) return;
        store('secondActive', secondActive);
        store('deg', deg === 2 ? 'grad' : deg === 1); // true or false for Deg and Rad, as before Grad came
        store('stat', statsInput.value);
        store('statBy', BY[statsBy.at][0]);
        store('fraction', fracMode);
        store('dms', dmsMode);
        store('memory', engine.memory);
    }

    // back as it was left, after the popup is closed or the page reloaded
    function loadState() {
        var s = {};

        // all read first: the keys pressed below must not save over what is still to be read
        ['secondActive', 'deg', 'stat', 'statBy', 'statsOn', 'fxOn', 'fxTab', 'convOn', 'conv', 'graphOn', 'graph', 'fraction', 'dms', 'format', 'fnOrder', 'memory', 'calc'].forEach(function (key) {
            s[key] = stored(key);
        });
        // functions go before their number, tan 45; who used the calculator before this
        // option came keeps 45 tan, until it is changed on the options page
        if (s.fnOrder !== 'first' && s.fnOrder !== 'after') store('fnOrder', s.fnOrder = s.calc ? 'after' : 'first');
        engine.fnFirst = s.fnOrder === 'first';
        if (s.secondActive) {
            keyDown(false, keyBoard['2nd']);
            doKey('2nd', true);
        }
        setUnit(s.deg === true ? 1 : s.deg === 'grad' ? 2 : 0);
        if (typeof s.stat === 'string') statsInput.value = s.stat;
        setStatsBy(Math.max(0, BY.map(function (by) { return by[0]; }).indexOf(s.statBy)));
        // all four on, until changed in the options
        setPanels(s.statsOn !== false, s.fxOn !== false, s.convOn !== false, s.graphOn !== false);
        loadGraph(s.graph);
        if (s.fxTab === 'constants') fxTab = s.fxTab;
        loadConv(s.conv);
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

    // The number format, the order of the function keys or the panels were changed on the options page.
    // The graph, the calculation and the angle unit follow another page of the calculator: the graph's
    // own window and the popup or the detached window show the same ones. Not what this page saved
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
            return refresh();
        }
        if (e.key === 'deg') {
            ownSaves.deg = e.newValue;
            return setUnit(stored('deg') === true ? 1 : stored('deg') === 'grad' ? 2 : 0);
        }
        if (e.key === 'statsOn' || e.key === 'fxOn' || e.key === 'convOn' || e.key === 'graphOn') {
            return setPanels(stored('statsOn') !== false, stored('fxOn') !== false, stored('convOn') !== false, stored('graphOn') !== false);
        }
        if (e.key === 'format') setFormat(stored('format'));
        else if (e.key === 'fnOrder') engine.fnFirst = stored('fnOrder') !== 'after';
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
            at = focus.offsetLeft - left;
            if (at < (left > 1 ? 24 : 2) || at > display.clientWidth - (left < display.scrollWidth - display.clientWidth - 1 ? 24 : 2)) {
                left = focus.offsetLeft - display.clientWidth / 2;
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
        fracMode = engine.fraction = !fracMode;
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
        if (dmsMode) fracMode = engine.fraction = false;
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
    function refresh() {
        var eq = engine.equation(fracMode), view;

        graphRender(); // a curve of sin x follows the unit, and the plot's and the table's numbers the format

        if (fmt.group && !engine.edit) eq = CalcEngine.group(eq, fmt.group);
        if (engine.edit) { // the equation with the cursor in it
            view = engine.editView();
            resBuffer = engine.value;
            display.innerHTML = view.parts.map(function (part, i) {
                return (i === view.at ? CURSOR : '') + '<span>' + CalcEngine.decimal(part, fmt.group) + '</span>';
            }).join('') + (view.at === view.parts.length ? CURSOR : '');
            fit(display.querySelector('.calc-cursor'));
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