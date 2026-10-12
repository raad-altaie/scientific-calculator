(function (window) {
    'use strict';
    let Calc = document.querySelector('.calc-main'),
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
        fmt = { notation: 'norm', places: 'auto', group: false }, // set on the options page; group: true for commas, 'space'
        fracMode = false, // a/b: divisions drawn as fractions, and results shown as fractions when they are one
        dmsMode = false, // °′″, the 2nd of a/b: results shown in degrees, minutes and seconds
        slid = false, // the pointer moved along a long line, to slide it or select in it, so it was not a click
        hiddenCopy = Calc.querySelector('textarea'),
        menu = document.querySelector('.calc-menu-box'), // the menu of a right click
        pasteBox = null, // the box of a panel the menu's Paste is for; none: the equation
        tip = document.querySelector('.calc-tip'), // what the key under the pointer does
        tipKey = null, // that key
        tipTimer,
        tipGone = 0, // when the last tip went, so the next one comes at once
        copying = null, // text a history button is copying, in place of the main line
        past = document.querySelector('.calc-past:not(.calc-stats):not(.calc-fx):not(.calc-conv)'), // the history, over the keys
        pastList = past.querySelector('.calc-past-list'),
        pastButton = document.querySelector('.calc-hist'),
        pastShown = {}, // the history as the list shows it, so it is only built again after a change
        stats = document.querySelector('.calc-stats'), // statistics of a list of numbers, over the keys
        statsButton = document.querySelector('.calc-stat-btn'),
        statsInput = stats.querySelector('textarea'),
        statsGrid = stats.querySelector('.calc-stats-grid'),
        statsNote = stats.querySelector('.calc-stats-note'),
        statsNow = { n: 0 }, // what the list gives
        STATS = [ // the results in the order shown: the name the engine gives each, and its label
            ['n', 'n'], ['sum', 'Σx'], ['squares', 'Σx<sup>2</sup>'],
            ['mean', '<span class="calc-x-bar">x</span>'], ['sdp', 'σ'], ['sds', 's'],
            ['min', 'min'], ['median', 'median'], ['max', 'max']
        ],
        fx = document.querySelector('.calc-fx'), // formulas and constants, over the keys
        fxButton = document.querySelector('.calc-fx-btn'),
        fxSearch = fx.querySelector('.calc-fx-search'),
        fxList = fx.querySelector('.calc-fx-list'),
        fxTab = 'formulas', // the list shown: formulas or constants
        fxItems = {}, // the entries of each list, with the text a search looks in
        conv = document.querySelector('.calc-conv'), // the converter of units, over the keys
        convButton = document.querySelector('.calc-conv-btn'),
        convGroup = conv.querySelector('.calc-conv-group'),
        convUnit = conv.querySelector('.calc-conv-unit'),
        convInput = conv.querySelector('.calc-conv-value'),
        convNote = conv.querySelector('.calc-conv-note'),
        convList = conv.querySelector('.calc-conv-list'),
        convAt = { g: 0, u: {} }, // the group shown, and the unit chosen in each group, by its name
        convNow = [], // the value in each unit of the group, as the list shows them
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
    keyBoard['Rad'] = keyBoard['Grad'] = keyBoard['Deg'];
    secondKeySet = secondLayer[0].map(function (label) {
        return keyBoard[label.replace(/<\/*\w+>/g, '')];
    });
    for (var n = secondKeySet.length; n--;) {
        keyBoard[secondLayer[1][n].replace(/<\/*\w+>/g, '')] = secondKeySet[n];
    }



    // listen for messages from the parent window popup.html 
    window.addEventListener('message', (event) => {
        const data = event.data || {};

        // listen for paste event from parent
        if (data.type === 'paste') {
            if (!pasteBox) doPaste(data.text);
            else if (pasteBox.offsetParent) typeInto(pasteBox, data.text); // its panel is still open
            pasteBox = null;
        }
        // Paste in the menu: the browser did not allow reading the clipboard
        else if (data.type === 'paste-refused') {
            pasteBox = null;
            notify('Use Ctrl+V');
        }
        // handle key events from parent
        else if (data.type === 'keypress') {
            onKeyPress(data.keyCode);
        } else if (data.type === 'keydown') {
            onKeyDown(data.keyCode, data.shiftKey);
        } else if (data.type === 'keyup') {
            onKeyUp();
        }

    });



    // ---------------- event listeners keys ---------------- //

    // typing in a box of a panel, the list of the statistics, the search, a letter
    // of a formula or a list of units, is typing there, not on the keys
    function field(el) {
        return el === statsInput || el.tagName === 'INPUT' || el.classList.contains('calc-conv-pick');
    }

    document.addEventListener('keypress', function (e) {
        if (!field(e.target)) onKeyPress(e.which);
    }, false);

    document.addEventListener('keydown', function (e) {
        if (field(e.target)) {
            if (e.which === 27 && !menu.hidden) { // Esc closes the menu first
                showMenu(false);
                e.preventDefault();
            } else if (e.which === 27) { // Esc closes the panel, as the history
                showStats(false);
                showFx(false);
                showConv(false);
                e.preventDefault();
            }
            return;
        }
        if (onKeyDown(e.which, e.shiftKey)) e.preventDefault();
    }, false);

    document.addEventListener('keyup', function (e) {
        if (!field(e.target)) onKeyUp();
    }, false);

    document.body.addEventListener('paste', function (e) {
        if (field(e.target)) return; // the box takes it
        doPaste(e.clipboardData.getData("Text"));
        e.preventDefault();
    }, false);

    // keys come from this document or, as messages, from popup.html

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
        if (key === 27 && past.classList.contains('calc-open')) { // Esc closes the history
            showPast(false);
            return true;
        }
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

    // what copy takes: the main line, an equation as plain text
    function copyText() {
        if (engine.edit) return engine.text();
        return engine.error || engine.done || engine.plain() ? resBuffer.replace(/\s/g, '') : engine.text();
    }

    // what copy takes: the text a history button or the menu gives, a part of
    // the display selected with the mouse, or else the main line
    document.body.addEventListener('copy', function (e) {
        if (field(e.target) && copying === null) return; // what is selected in the box
        e.clipboardData.setData('text/plain', copying !== null ? copying : selectedText() || copyText());
        e.preventDefault(); // the text above is copied, not the page's selection as it is drawn
        notify('Copy');
    }, false);

    // Ctrl+X takes what Ctrl+C does, and takes it out
    document.body.addEventListener('cut', function (e) {
        if (field(e.target) || empty()) return; // what is selected in the box; nothing to take
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

    // the part of the equation in the display that is selected, which a paste or
    // a key goes in place of: [from, to] in characters from its start, [] for all
    // of it. Null if none is, or the display has a result, which they replace anyway
    function selectedSpan() {
        var sel = window.getSelection(), all = document.createRange(), range, from, to;

        function chars(node, offset) { // of the equation before this place of the page
            var part = all.cloneRange(), where = all.comparePoint(node, offset);
            if (where < 0) return 0;
            if (!where) part.setEnd(node, offset);
            return part.toString().replace(engine.edit ? '' : /[,\u202F]/g, '').length; // not the commas or spaces between the thousands
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
            frame = calc.getBoundingClientRect(), at = tipKey.getBoundingClientRect(), left, top, below,
            x0 = frame.left + calc.clientLeft, y0 = frame.top + calc.clientTop; // inside the border, where left and top count from

        if (!info) return;
        tip.innerHTML = '<div class="calc-tip-head"><b>' + info.t + '</b>' +
            (secondKey(name) ? '<span class="calc-tip-2nd">2nd</span>' : '') +
            (info.k ? '<kbd>' + info.k + '</kbd>' : '') + '</div><div>' + info.d + '</div>' +
            (info.second && !secondActive ? '<div class="calc-tip-more">With 2nd: ' + info.second + '</div>' : '');
        tip.hidden = false;
        // above the key, in the middle of it; below it where there is no room above
        left = at.left + at.width / 2 - x0 - tip.offsetWidth / 2;
        left = Math.max(6, Math.min(calc.clientWidth - tip.offsetWidth - 6, left));
        top = at.top - y0 - tip.offsetHeight - 10;
        below = top < 4;
        if (below) top = at.bottom - y0 + 10;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
        tip.style.setProperty('--arrow', at.left + at.width / 2 - x0 - left - tip.clientLeft + 'px'); // from inside its border
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
                d: 'The memory holds ' + String(+(+engine.memory).toPrecision(13)) +
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
        var calc = menu.parentNode, frame = calc.getBoundingClientRect(), items = menuItems(e.target);
        e.preventDefault(); // the menu of the browser is never shown
        if (!items) return;
        menu.items = items;
        menu.innerHTML = items.map(function (item, i) {
            return '<div data-i="' + i + '"' + (item[2] === false ? ' class="calc-off"' : '') + '>' + item[0] + '</div>';
        }).join('');
        showMenu(true);
        menu.style.left = Math.min(e.clientX - frame.left - calc.clientLeft, calc.clientWidth - menu.offsetWidth - 4) + 'px';
        menu.style.top = Math.min(e.clientY - frame.top - calc.clientTop, calc.clientHeight - menu.offsetHeight - 4) + 'px';
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
            text = unit.dms && CalcEngine.dms(convNow[i]); // degrees, minutes and seconds have their signs
            return [
                ['Copy', function () { copy(text || String(+convNow[i].toPrecision(15))); }],
                ['Copy with unit', function () { copy(text || +convNow[i].toPrecision(15) + ' ' + plain(unit.s)); }],
                ['Insert', function () { row.click(); }]
            ];
        }
        if (panel === stats && (row = el.closest('.calc-stats-tile')) && statsNow.n && isFinite(statsNow[row.dataset.k])) {
            text = statsValue(statsNow[row.dataset.k]).text;
            return [
                ['Copy', function () { copy(text); }],
                ['Insert', function () { row.click(); }]
            ];
        }
        if (panel === fx && (row = el.closest('.calc-fx-item'))) {
            k = fxItems[fxTab][+row.dataset.i].item;
            if (fxTab === 'constants') {
                return [
                    ['Copy', function () { copy(String(k.v)); }],
                    ['Copy with unit', function () { copy(k.v + ' ' + plain(k.u)); }, !!k.u],
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
        return boxItems(panel === stats ? statsInput : panel === fx ? fxSearch : convInput);
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

    // This page cannot read the clipboard, so for Paste popup.js asks the browser
    // once for that and sends the text back as a paste: into the box, or the equation
    function askPaste(box) {
        pasteBox = box;
        if (box) box.focus();
        window.parent.postMessage({ command: 'read-clipboard' }, '*');
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
        window.parent.postMessage({ command: 'open-options' }, '*');
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
        if (menu.contains(e.target)) return;
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
            copy(whole ? engine.pastLine(i).text.replace(/ =$/, '') : shownResult(engine.past[i], '').text);
        }
    }, false);

    function showPast(open) {
        if (open) {
            showStats(false); // one panel at a time
            showFx(false);
            showConv(false);
            placePanel(past);
            renderPast();
        }
        past.classList.toggle('calc-open', open);
        pastButton.classList.toggle('calc-on', open);
        if (open) pastList.scrollTop = 0;
    }

    // a panel over the keys: just below the display, 1px wider on each side
    function placePanel(panel) {
        var calc = panel.parentNode, shown = display.parentNode.getBoundingClientRect(),
            frame = calc.getBoundingClientRect();
        panel.style.top = shown.bottom - frame.top - calc.clientTop + 7 + 'px';
        panel.style.left = shown.left - frame.left - calc.clientLeft - 1 + 'px';
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
        var s = statsNow = CalcEngine.stats(statsInput.value);
        [].forEach.call(statsGrid.children, function (tile) {
            var value = s[tile.dataset.k], known = s.n > 0 && isFinite(value), shown = tile.lastChild, size = 17;
            tile.classList.toggle('calc-none', !known);
            shown.innerHTML = known ? statsValue(value).html : '–';
            shown.style.fontSize = '';
            while (size > 11 && shown.scrollWidth > shown.clientWidth) { // a long one gets smaller, as on the display
                shown.style.fontSize = --size + 'px';
            }
        });
        statsNote.textContent = !s.n && !s.bad.length ? 'Apart by spaces, commas or new lines; a column from a spreadsheet works too.' :
            s.n + (s.n === 1 ? ' number' : ' numbers') +
            (s.bad.length ? ' · left out: ' + s.bad.slice(0, 3).join(', ') + (s.bad.length > 3 ? ' …' : '') : '');
    }

    function statsValue(value) {
        return shownResult({ value: String(value), frac: fracMode, dms: dmsMode }, String(+(+value).toPrecision(13)));
    }

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
    // marks: the °′″ of an angle
    function onlyNumber(input, marks) {
        var v = input.value, at = input.selectionStart, clean = '', point = false, n, c;
        for (n = 0; n < v.length; n++) {
            c = v.charAt(n);
            if (/\d/.test(c) || (marks && /[°′″]/.test(c)) || (c === '-' && !clean) || (c === '.' && !point && (point = true))) clean += c;
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
                '</span></span></span></div></div>';
        });
        fxList.innerHTML = html || '<div class="calc-fx-none">Nothing found</div>';
        fxList.scrollTop = 0;
        hideTip();
    }

    // 6.6743 × 10⁻¹¹ m³/(kg·s²); a value of a usual size written out, and a whole
    // number up to a trillion too: 299,792,458. Shown to 12 digits; it is put in whole
    function constantValue(k) {
        var a = Math.abs(k.v), parts = (+k.v.toPrecision(12)).toExponential().split('e'),
            shown = a >= (k.v % 1 ? 1e6 : 1e12) || a < 1e-3 ? parts[0] + ' × 10<sup>' + +parts[1] + '</sup>' : CalcEngine.group(String(+k.v.toPrecision(12)), fmt.group);
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
                '<input type="text" inputmode="decimal" pattern="-?[0-9]*\\.?[0-9]*" spellcheck="false" autocomplete="off" maxlength="40" placeholder="' +
                v[2] + '"></label>';
        }).join('') + '<div class="calc-fx-actions"><span class="calc-fx-note">' +
            (f.deg ? 'Angles in ' + ['radians', 'degrees', 'gradians'][deg] + ', the unit in use' : '') +
            '</span><span class="calc-fx-insert">Insert</span></div>';
        item.classList.add('calc-on');
        form.querySelector('.calc-fx-note').dataset.usual = form.querySelector('.calc-fx-note').innerHTML;
        first = form.querySelector('input');
        if (!engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
            first.value = String(+(+engine.value).toPrecision(13));
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
            s = CalcFormulas.fill(f, inputs.map(function (input) { return input.value; }), deg),
            trial = new CalcEngine();

        inputs.forEach(function (input) {
            input.classList.toggle('calc-bad', !input.value.trim());
        });
        trial.fnFirst = engine.fnFirst;
        if (s !== null && trial.paste(s, deg) && (trial.error || (trial.press('=', deg), trial.error))) {
            note.classList.add('calc-fx-warn');
            note.innerHTML = CalcFormulas.why(f, inputs.map(function (input) { return input.value; }));
            return;
        }
        if (s !== null && (engine.edit || !(engine.done || engine.error || engine.plain()))) s = '(' + s + ')';
        if (s !== null && !engine.paste(s, deg)) {
            inputs.forEach(function (input) { // the calculator could not read it: the boxes that are not a plain number
                input.classList.toggle('calc-bad', !/^\s*-?(\d+\.?\d*|\.\d+)\s*$/.test(input.value));
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
            placePanel(conv);
            if (!engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
                convInput.value = String(+(+engine.value).toPrecision(13));
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

    // then the value has the focus, to type in
    function choosePicker(el, i) {
        showPicker(el, false);
        if (i !== el.at) el.pick(i);
        focusBox(convInput);
    }

    // the unit's name is kept, not its place, so a unit added later does not change the choice
    function convUnitName(i) {
        return CalcUnits.units[convAt.g].list[i].t;
    }

    // The value typed, worked out, in each unit of the group but its own. A new
    // group fills the list of units first
    function renderConv(newGroup) {
        var group = CalcUnits.units[convAt.g], text = convInput.value.trim(), x, from, trial;

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
                (known ? unit.dms && CalcEngine.dms(convNow[i]) || convValue(convNow[i]) : '–') + '</span></div>';
        }).join('');
        hideTip();
    }

    // 12 digits, grouped as the display does, and very large or small ones as
    // powers of 10: 1.609344 × 10³ is shown 1,609.344, 1 nm 1 × 10⁻⁹ m
    function convValue(v) {
        var a = Math.abs(v), parts = (+v.toPrecision(12)).toExponential().split('e');
        return (a && (a >= 1e15 || a < 1e-6) ? parts[0] + ' × 10<sup>' + +parts[1] + '</sup>' :
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

    // the statistics, the formulas and the converter have their button while they are turned on in the options
    function setPanels(statsOn, fxOn, convOn) {
        statsButton.hidden = !statsOn;
        fxButton.hidden = !fxOn;
        convButton.hidden = !convOn;
        if (!statsOn) showStats(false);
        if (!fxOn) showFx(false);
        if (!convOn) showConv(false);
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

    // insert and copy, on the left of a line; shown while the pointer is over it
    function pastButtons(part, what) {
        var box = part.appendChild(document.createElement('span'));
        box.className = 'calc-past-btns';
        box.innerHTML =
            '<span class="calc-past-btn" data-act="insert">' +
            '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h5a2 2 0 0 0 2-2V3" /><path d="M7 6l3-3 3 3" /></svg>' +
            '</span>' +
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
            w = parseFloat(st.width) + parseFloat(st.paddingLeft) + parseFloat(st.paddingRight);
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
        picking.edge = x < box.left + 16 ? -1 : x > box.right - 16 ? 1 : 0;
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
        else slide(sliding.el, sliding.left - (e.clientX - sliding.x));
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

    function store(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { }
    }

    // the format is not saved here: the options page keeps it, and saving it could undo a change made there
    function saveState() {
        store('secondActive', secondActive);
        store('deg', deg === 2 ? 'grad' : deg === 1); // true or false for Deg and Rad, as before Grad came
        store('stat', statsInput.value);
        store('fraction', fracMode);
        store('dms', dmsMode);
        store('memory', engine.memory);
        store('calc', engine.save());
    }

    // back as it was left, after the popup is closed or the page reloaded
    function loadState() {
        var s = {};

        // all read first: the keys pressed below must not save over what is still to be read
        ['secondActive', 'deg', 'stat', 'statsOn', 'fxOn', 'fxTab', 'convOn', 'conv', 'fraction', 'dms', 'format', 'fnOrder', 'memory', 'calc'].forEach(function (key) {
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
        // all three on, until changed in the options
        setPanels(s.statsOn !== false, s.fxOn !== false, s.convOn !== false);
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

    // the number format, the order of the function keys or the panels were changed on the options page
    window.addEventListener('storage', function (e) {
        if (e.key === 'statsOn' || e.key === 'fxOn' || e.key === 'convOn') {
            return setPanels(stored('statsOn') !== false, stored('fxOn') !== false, stored('convOn') !== false);
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
    // digits after the point or Auto, and commas or spaces between the thousands
    function setFormat(f) {
        f = f || {};
        fmt = {
            notation: /^(fix|sci|eng)$/.test(f.notation) ? f.notation : 'norm',
            places: Number.isInteger(f.places) ? Math.max(0, Math.min(9, f.places)) : 'auto', // Auto, as the options page starts
            group: f.group === 'space' ? 'space' : !!f.group
        };
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

        if (fmt.group && !engine.edit) eq = CalcEngine.group(eq, fmt.group);
        if (engine.edit) { // the equation with the cursor in it
            view = engine.editView();
            resBuffer = engine.value;
            display.innerHTML = view.parts.map(function (part, i) {
                return (i === view.at ? CURSOR : '') + '<span>' + part + '</span>';
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


document.querySelectorAll('.logo, .calc-help').forEach(function (el) {
    el.addEventListener('click', function () {
        // send msg to to the options page for the extension
        window.parent.postMessage({ command: 'open-options' }, '*');
    });
});