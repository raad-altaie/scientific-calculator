(function (window) {
    'use strict';
    let Calc = document.querySelector('.calc-main'),
        display = Calc.querySelector('.calc-display span'),
        logline = Calc.querySelector('.calc-log'),
        notification = Calc.querySelector(".notification"),
        noticeTimer, // fades the notification out
        mem = Calc.querySelector('.calc-mem'), // 'M' while the memory holds a number
        radDeg = Calc.querySelector('.calc-rad'), // the unit: its text, then a full turn in it, 2π or 360°
        fullTurn = radDeg.querySelector('.sign'),
        hold = Calc.querySelector('.calc-hold'),
        fmtMark = Calc.querySelector('.calc-fmt'), // FIX 2, SCI 3 or ENG 2 while that notation is on
        fracMark = Calc.querySelector('.calc-frac'), // FRAC while fraction mode is on, DMS while °′″ is
        secondKeySet, // the keys the 2nd key changes, found by their names below
        CURSOR = '<span class="calc-cursor"></span>',
        fmt = { notation: 'norm', places: 2, group: false }, // set on the options page
        fracMode = false, // a/b: divisions drawn as fractions, and results shown as fractions when they are one
        dmsMode = false, // °′″, the 2nd of a/b: results shown in degrees, minutes and seconds
        slid = false, // the pointer slid a long line, so it was not a click
        hiddenCopy = Calc.querySelector('textarea'),
        menu = document.querySelector('.calc-menu-box'), // the menu of a right click
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
        secondActive = false, // 2nd key active?
        engine = new CalcEngine(), // the calculation and its equation line
        deg = false, // Deg mode or Rad
        resBuffer = '0',
        keyBoard = {},
        secondLayer = [
            [
                'sin', 'cos', 'tan', 'ln', 'sinh', 'cosh', 'tanh', 'e<sup>x</sup>', '%', '<i>n</i>C<i>r</i>', '<i>n</i>P<i>r</i>',
                'log', 'π', 'y<sup>x</sup>', 'a/b'
            ],
            [
                'sin<sup>-1</sup>', 'cos<sup>-1</sup>', 'tan<sup>-1</sup>', 'log<sub>2</sub>',
                'sinh<sup>-1</sup>', 'cosh<sup>-1</sup>', 'tanh<sup>-1</sup>', '2<sup>x</sup>', 'mod', 'gcd', 'lcm',
                '10<sup>x</sup>', 'e', 'log<sub>y</sub>', '°′″'
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
    keyBoard['Rad'] = keyBoard['Deg'];
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
            doPaste(data.text);
        }
        // Paste in the menu: the browser did not allow reading the clipboard
        else if (data.type === 'paste-refused') {
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
            if (e.which === 27) { // Esc closes the panel, as the history
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
                's|sin|c|cos|t|tan|S|sin-1|C|cos-1|T|tan-1|d|Deg|°|Deg|l|ln|L|log|\\|1/x|X|2x|N|nCr|P|nPr|f|a/b|M|mod|G|gcd|K|lcm').split('|'),
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
        if ((key.match(/-1$|log2$|2x$|^(mod|gcd|lcm|10x|e|logy|°′″)$/) && !secondActive) ||
            (key.match(/h$|n$|cos$|ex$|^(%|nCr|nPr|log|π|yx|a\/b)$/) && secondActive)) {
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
        if (key === 37 || key === 39) { // the arrow keys move the cursor, as its keys do
            keyDown(false, keyBoard[key === 37 ? '◀' : '▶']);
            doKey(key === 37 ? '◀' : '▶', true);
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
        if (!engine.paste(text, deg)) return;
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

    // the part of the display or of the line above it that is selected, as
    // text: raised numbers as ², a drawn fraction as 3/4; '' if none is
    function selectedText() {
        var sel = window.getSelection(), range, box, where;
        if (!sel.rangeCount || sel.isCollapsed) return '';
        range = sel.getRangeAt(0);
        where = range.commonAncestorContainer;
        if (!display.contains(where) && !logline.contains(where)) return '';
        box = document.createElement('div');
        box.appendChild(range.cloneContents());
        [].slice.call(box.querySelectorAll('.calc-fr')).reverse().forEach(function (fr) { // the innermost first
            fr.replaceWith([].slice.call(fr.children).map(function (part) {
                var t = part.textContent.trim();
                return /[ +–×÷/]/.test(t) ? '(' + t + ')' : t;
            }).join('/'));
        });
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
    // function 2nd gives the key. The marks in the display and the history
    // have tips as well
    tip.parentNode.addEventListener('mouseover', function (e) {
        var key = e.target.closest('.calc-left > *, .calc-right > .del-ac, .calc-rad, .calc-mem, .calc-frac, .calc-fmt, .calc-hold, ' +
            '.calc-stat-btn, .calc-stats-tile, .calc-fx-btn, .calc-fx-row, .calc-conv-btn, .calc-conv-row, ' +
            '.calc-hist, .calc-past-clear, .calc-past-close, .calc-past-btn, .calc-past-del, .calc-past-unit');
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
        var places = fmt.places + (fmt.places === 1 ? ' decimal place' : ' decimal places'), info, value;
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
        if (el.classList.contains('calc-past-unit')) return CalcTips['history unit ' + name];
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
                d: (fmt.notation === 'fix' ? 'Results are rounded to ' + places + '.' :
                    'Results are shown in ' + (fmt.notation === 'sci' ? 'scientific notation, 1.23e+4,' :
                        'engineering notation, powers of ten in steps of three, 12.3e+3,') + ' with ' + places + '.') +
                    ' Click to change it on the options page.',
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

    // Copy, Paste, and Reset (everything but the history and the statistics). Copy takes the selected part of the display, else
    // what Ctrl+C takes. This page cannot read the clipboard, so for Paste
    // popup.js asks the browser once for that and sends the text back as a paste
    menu.addEventListener('click', function (e) {
        var item = e.target.closest('[data-act]');
        if (!item) return;
        showMenu(false);
        if (item.dataset.act === 'copy') {
            copy(menu.text || copyText());
        } else if (item.dataset.act === 'reset') {
            if (secondActive) {
                keyDown(false, keyBoard['2nd']);
                doKey('2nd', true);
            }
            if (deg) doKey('Deg', true);
            if (fracMode) toggleFraction();
            if (dmsMode) toggleDms();
            engine.memory = 0;
            engine.reset(); // the equation too; the history and the statistics stay
            hold.textContent = '';
            keyBoard['AC'].children[0].firstChild.data = 'AC';
            refresh();
            saveState();
        } else {
            window.parent.postMessage({ command: 'read-clipboard' }, '*');
        }
    }, false);

    document.addEventListener('contextmenu', function (e) {
        var calc = menu.parentNode, frame = calc.getBoundingClientRect();
        if (field(e.target)) return; // a box has the menu of the browser, to edit it
        e.preventDefault();
        if (!e.target.closest('.calc-display')) return; // only the display has the menu: right click does nothing elsewhere
        menu.text = selectedText(); // taken now: a click in the menu ends the selection
        showMenu(true);
        menu.style.left = Math.min(e.clientX - frame.left - calc.clientLeft, calc.clientWidth - menu.offsetWidth - 4) + 'px';
        menu.style.top = Math.min(e.clientY - frame.top - calc.clientTop, calc.clientHeight - menu.offsetHeight - 4) + 'px';
    }, false);

    document.addEventListener('mousedown', function (e) {
        if (e.button === 2 && e.target.closest('.calc-display')) e.preventDefault(); // a selection stays for Copy
        if (!menu.hidden && !menu.contains(e.target)) showMenu(false);
    }, true);

    window.addEventListener('blur', function () {
        showMenu(false);
    }, false);

    function showMenu(open) {
        menu.hidden = !open;
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

    // any press outside the history closes it; the button toggles it itself
    document.addEventListener('pointerdown', function (e) {
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
        statsInput.focus();
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
            statsInput.focus();
            statsInput.setSelectionRange(statsInput.value.length, statsInput.value.length);
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
        fxSearch.focus();
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

    fxList.addEventListener('input', function (e) {
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
            fxSearch.focus();
            fxSearch.select(); // typing replaces the last search
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
            html += '<div class="calc-fx-item" data-i="' + i + '"><div class="calc-fx-row">' +
                (fxTab === 'constants' ? '<span class="calc-fx-sym">' + it.s + '</span>' : '') +
                '<span class="calc-fx-col"><span class="calc-fx-name">' + it.t + '</span><span class="calc-fx-f">' +
                (fxTab === 'constants' ? constantValue(it) : it.f) + '</span></span></div></div>';
        });
        fxList.innerHTML = html || '<div class="calc-fx-none">Nothing found</div>';
        fxList.scrollTop = 0;
        hideTip();
    }

    // 6.6743 × 10⁻¹¹ m³/(kg·s²); a value of a usual size written out, and a whole
    // number up to a trillion too: 299,792,458. Shown to 12 digits; it is put in whole
    function constantValue(k) {
        var a = Math.abs(k.v), parts = (+k.v.toPrecision(12)).toExponential().split('e'),
            shown = a >= (k.v % 1 ? 1e6 : 1e12) || a < 1e-3 ? parts[0] + ' × 10<sup>' + +parts[1] + '</sup>' : CalcEngine.group(String(+k.v.toPrecision(12)));
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
                '<input type="text" inputmode="decimal" spellcheck="false" autocomplete="off" maxlength="40" placeholder="' +
                v[2] + '"></label>';
        }).join('') + '<div class="calc-fx-actions"><span class="calc-fx-note">' +
            (f.deg ? 'Angles in ' + (deg ? 'degrees' : 'radians') + ', the unit in use' : '') +
            '</span><span class="calc-fx-insert">Insert</span></div>';
        item.classList.add('calc-on');
        form.querySelector('.calc-fx-note').dataset.usual = form.querySelector('.calc-fx-note').innerHTML;
        first = form.querySelector('input');
        if (!engine.edit && !engine.error && (engine.done || engine.plain()) && +engine.value) {
            first.value = String(+(+engine.value).toPrecision(13));
        }
        first.focus();
        first.select();
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
            (item.querySelector('.calc-bad') || inputs[0]).focus();
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
            convInput.focus();
            convInput.select(); // typing replaces it
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
        convInput.focus();
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
            CalcEngine.group(String(+v.toPrecision(12)))).replace(/-/g, '−');
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
            line.innerHTML = fmt.group ? CalcEngine.group(p.line) : p.line; // made by the engine, like the equation in the display
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
            del.innerHTML = '<svg viewBox="0 0 16 16" width="8" height="8" fill="none" stroke="currentColor" ' +
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
        if (s) return { html: fmt.group ? CalcEngine.group(s) : s, text: s };
        if (f) {
            parts = [String(Math.abs(f[0])), String(f[1])].map(function (part) {
                return fmt.group ? CalcEngine.group(part) : part;
            });
            return { html: (f[0] < 0 ? '-' : '') + CalcEngine.stack(parts[0], parts[1]), text: f[0] + '/' + f[1] };
        }
        s = CalcEngine.format(x, fmt) || usual;
        return { html: fmt.group ? CalcEngine.group(s) : s, text: value };
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
            'stroke-linecap="round" stroke-linejoin="round"><path d="M13 3v5a2 2 0 0 1-2 2H3" /><path d="M6 7l-3 3 3 3" /></svg>' +
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
        if (whole && /^(Deg|Rad)$/.test(unit) && (unit === 'Deg') !== deg) doKey('Deg', true); // shows its unit
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
        if (line) return line.scrollWidth <= line.clientWidth; // text can be selected; a longer line slides instead
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

    // hold and slide a long equation to see the rest of it
    [display, logline].forEach(function (el) {
        el.addEventListener('pointerdown', function (e) {
            slid = false;
            if (el.scrollWidth > el.clientWidth) sliding = { el: el, x: e.clientX, left: el.scrollLeft };
        }, false);

        // a click in the equation puts the cursor there; on the line above a
        // result it puts the cursor into that finished equation
        el.addEventListener('click', function (e) {
            if (slid || !window.getSelection().isCollapsed) return; // a slide or a selection, not a click
            if (el === logline ? engine.edit || !(engine.done || engine.error) :
                !engine.edit && (engine.done || engine.error)) return; // a result: nothing to put a cursor in
            if (engine.point(charsBefore(el, e.clientX), deg)) {
                refresh();
                saveState();
            }
        }, false);
    });

    // how many characters of the line are left of x
    function charsBefore(el, x) {
        var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), range = document.createRange(),
            n = 0, node, i, r;
        while ((node = walk.nextNode())) {
            for (i = 0; i < node.length; i++) {
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                r = range.getBoundingClientRect();
                if (r.width && x < r.left + r.width / 2) return n;
                n++;
            }
        }
        return n;
    }

    document.addEventListener('pointermove', function (e) {
        if (!sliding) return;
        if (Math.abs(e.clientX - sliding.x) > 3) slid = true;
        slide(sliding.el, sliding.left - (e.clientX - sliding.x));
    }, false);

    ['pointerup', 'pointercancel'].forEach(function (type) {
        document.addEventListener(type, function () {
            sliding = null;
        }, false);
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
        store('deg', deg);
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
        if (s.deg === true) doKey('Deg', true);
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
                    return fmt.group ? CalcEngine.group(part) : part;
                });
                drawn = (frac[0] < 0 ? '-' : '') + CalcEngine.stack(tmp[0], tmp[1]);
            } else if (angle) { // and copied so
                resBuffer = tmp = angle;
            } else if (!inp) {
                tmp = CalcEngine.format(x, fmt) || tmp;
            }
            if (fmt.group && !frac) tmp = CalcEngine.group(tmp);
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
            room = screen.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

        display.classList.remove('calc-more-left', 'calc-more-right');
        display.style.fontSize = size + 'px';
        while (size > 18 && (display.scrollWidth > display.clientWidth || display.offsetHeight > room)) {
            display.style.fontSize = --size + 'px';
        }
        slide(display, focus ? focus.offsetLeft - display.clientWidth / 2 : display.scrollWidth);
    }

    // the number format from the options page: Norm, Fix, Sci or Eng, the
    // digits after the point, and commas between the thousands
    function setFormat(f) {
        f = f || {};
        fmt = {
            notation: /^(fix|sci|eng)$/.test(f.notation) ? f.notation : 'norm',
            places: Math.max(0, Math.min(9, f.places | 0)),
            group: !!f.group
        };
        fmtMark.textContent = fmt.notation === 'norm' ? '' : fmt.notation.toUpperCase() + ' ' + fmt.places;
    }

    // a/b turns fraction mode on and off: each division is drawn as a fraction
    // while it is typed, and a result is shown as a fraction when it is one.
    // A number with no such fraction (π, √2) stays a decimal
    function toggleFraction() {
        fracMode = engine.fraction = !fracMode;
        if (fracMode) dmsMode = engine.dms = false; // one or the other
        refresh();
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
        } else if (text.match(/Deg|Rad/)) {
            radDeg.firstChild.data = deg ? 'Rad' : 'Deg';
            key.children[0].firstChild.data = deg ? 'Deg' : 'Rad';
            deg = !deg
            fullTurn.innerHTML = deg ? '360°' : '2<span class="sign-pi">π</span>';
        } else if (text.match(/^mr$/) && engine.memory) {
            keyBoard['AC'].children[0].firstChild.data = 'C';
        }

        evalKey(text);

        if (!alt) {
            keyUp();
        }
    }

    function evalKey(key) {
        if (key === 'a/b') return toggleFraction();
        if (key === '°′″') return toggleDms();
        if (key === '◀' || key === '▶') {
            engine.move(key === '◀' ? 'left' : 'right', deg);
        } else if (key === 'DEL') {
            engine.del(); // takes back the last key of this calculation, or the piece before the cursor
        } else {
            engine.press(key, deg);
        }
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

        if (fmt.group && !engine.edit) eq = CalcEngine.group(eq);
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
        slide(logline, logline.scrollWidth);
        mem.textContent = engine.memory ? 'M' : '';
        fracMark.textContent = fracMode ? 'FRAC' : dmsMode ? 'DMS' : '';
        keyBoard['a/b'].classList.toggle('calc-lit', secondActive ? dmsMode : fracMode); // a red dot on its key, for the mode it shows
        pastButton.hidden = !engine.past.length; // shown once there is a history
        showTools();
        if (stats.classList.contains('calc-open')) renderStats(); // the number format or fraction mode may have changed
        if (past.classList.contains('calc-open') && (pastShown.list !== engine.past || pastShown.mode !== shownMode() ||
            pastShown.n !== engine.past.length || pastShown.last !== engine.past[engine.past.length - 1])) {
            renderPast();
        }
    }

    loadState();

})(window);


document.querySelectorAll('.logo, .calc-help').forEach(function (el) {
    el.addEventListener('click', function () {
        // send msg to to the options page for the extension
        window.parent.postMessage({ command: 'open-options' }, '*');
    });
});