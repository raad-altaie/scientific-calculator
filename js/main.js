(function (window) {
    'use strict';
    let storage = {}
    let Calc = document.querySelector('.calc-main'),
        display = Calc.querySelector('.calc-display span'),
        logline = Calc.querySelector('.calc-log'),
        notification = Calc.querySelector(".notification"),
        noticeTimer, // fades the notification out
        mem = Calc.querySelector('.calc-mem'), // 'M' while the memory holds a number
        radDeg = Calc.querySelector('.calc-rad'), // the unit: its text, then a full turn in it, 2π or 360º
        fullTurn = radDeg.querySelector('.sign'),
        hold = Calc.querySelector('.calc-hold'),
        fmtMark = Calc.querySelector('.calc-fmt'), // FIX 2, SCI 3 or ENG 2 while that notation is on
        fracMark = Calc.querySelector('.calc-frac'), // FRAC while fraction mode is on
        secondKeySet, // the keys the 2nd key changes, found by their names below
        CURSOR = '<span class="calc-cursor"></span>',
        fmt = { notation: 'norm', places: 2, group: false }, // set on the options page
        fracMode = false, // a/b: divisions drawn as fractions, and results shown as fractions when they are one
        slid = false, // the pointer slid a long line, so it was not a click
        hiddenCopy = Calc.querySelector('textarea'),
        menu = document.querySelector('.calc-menu-box'), // the menu of a right click
        tip = document.querySelector('.calc-tip'), // what the key under the pointer does
        tipKey = null, // that key
        tipTimer,
        tipGone = 0, // when the last tip went, so the next one comes at once
        copying = null, // text a history button is copying, in place of the main line
        past = document.querySelector('.calc-past:not(.calc-stats)'), // the history, over the keys
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
        pressedKey,
        sliding, // long line being slid: its element and where the slide started
        secondActive = false, // 2nd key active?
        engine = new CalcEngine(), // the calculation and its equation line
        deg = false, // Deg mode or Rad
        resBuffer = '0',
        keyBoard = {},
        secondLayer = [
            ['sin', 'cos', 'tan', 'ln', 'sinh', 'cosh', 'tanh', 'e<sup>x</sup>', '%', '<i>n</i>C<i>r</i>', '<i>n</i>P<i>r</i>'],
            [
                'sin<sup>-1</sup>', 'cos<sup>-1</sup>', 'tan<sup>-1</sup>', 'log<sub>2</sub>',
                'sinh<sup>-1</sup>', 'cosh<sup>-1</sup>', 'tanh<sup>-1</sup>', '2<sup>x</sup>', 'mod', 'gcd', 'lcm'
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

            // handle storage data from parent
        } else if (data.type === 'storage') {

            try {
                // recover after reload or crash...
                const storageMs = JSON.parse(data.text);

                if (!storageMs) {
                    return; // for the very first run or after fatal crash
                }

                if (storageMs['secondActive']) {
                    keyDown(false, keyBoard['2nd']);
                    doKey('2nd', true);
                }
                if (storageMs['deg'] === true) doKey('Deg', true);
                if (typeof storageMs['stat'] === 'string') statsInput.value = storageMs['stat'];
                fracMode = engine.fraction = !!storageMs['fraction'];
                if (storageMs['format']) setFormat(storageMs['format']);
                delete storageMs['format']; // the options page keeps it; saving it here could undo a change made there
                engine.memory = +storageMs['memory'] || 0;
                try {
                    if (storageMs['calc']) engine.load(storageMs['calc']);
                } catch (e) {
                    console.log('error', e)
                    engine.reset();
                }
                if (engine.entry === 'typing') keyBoard['AC'].children[0].firstChild.data = 'C';
                refresh();

                storage = storageMs
            } catch (e) {
                console.log('error', e)
            }
        }
        // the number format was changed on the options page
        else if (data.type === 'format') {
            try {
                setFormat(JSON.parse(data.text));
            } catch (e) {
                setFormat({});
            }
            refresh();
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

    // typing in the list of the statistics is typing there, not on the keys
    document.addEventListener('keypress', function (e) {
        if (e.target !== statsInput) onKeyPress(e.which);
    }, false);

    document.addEventListener('keydown', function (e) {
        if (e.target === statsInput) {
            if (e.which === 27) showStats(false); // Esc closes it, as the history
            return;
        }
        if (onKeyDown(e.which, e.shiftKey)) e.preventDefault();
    }, false);

    document.addEventListener('keyup', function (e) {
        if (e.target !== statsInput) onKeyUp();
    }, false);

    document.body.addEventListener('paste', function (e) {
        if (e.target === statsInput) return; // the list takes it
        doPaste(e.clipboardData.getData("Text"));
        e.preventDefault();
    }, false);

    // keys come from this document or, as messages, from popup.html

    function onKeyPress(key) {
        var holdKey = hold.textContent,
            keyMatch = (',|.|-|–|/|÷|*|×|#|+/–|x|x!|E|EE|e|ex| |2nd|r|x√y|R|√|p|π|^|yx|\'|yx|"|yx|m|mr|v|mc|b|m+|n|m-|a|Ans|' +
                's|sin|c|cos|t|tan|S|sin-1|C|cos-1|T|tan-1|d|Deg|°|Deg|l|ln|L|log|\\|1/x|X|2x|N|nCr|P|nPr|f|a/b|M|mod|G|gcd|K|lcm').split('|'),
            keyMatchHold = ('sin|sinh|cos|cosh|tan|tanh|m-|Rand|Deg|Rand|sin-1|sinh-1|cos-1|cosh-1|tan-1|tanh-1|' +
                '1|1/x|2|x2|3|x3|x√y|√|ln|log2|ex|2x').split('|');

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
        if ((key.match(/-1$|log2$|2x$|^(mod|gcd|lcm)$/) && !secondActive) ||
            (key.match(/h$|n$|cos$|ex$|^(%|nCr|nPr)$/) && secondActive)) {
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
        if (e.target === statsInput && copying === null) return; // what is selected in the list
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
            var chars = s.tagName === 'SUP' ? '⁰¹²³⁴⁵⁶⁷⁸⁹⁻ˣ' : '₀₁₂₃₄₅₆₇₈₉₋ₓ';
            s.replaceWith(s.textContent.replace(/[\d\-x]/g, function (c) {
                return chars.charAt('0123456789-x'.indexOf(c));
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
            '.calc-stat-btn, .calc-stats-tile, ' +
            '.calc-hist, .calc-past-clear, .calc-past-close, .calc-past-btn, .calc-past-unit');
        if (key === tipKey) return;
        hideTip();
        tipKey = key;
        if (key) tipTimer = setTimeout(showTip, Date.now() - tipGone < 400 ? 0 : 1000); // after a second of rest; from key to key at once
    }, false);

    pastList.addEventListener('scroll', hideTip, false);

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

    // the tip of a key, or of a mark in the display; the memory and the number
    // format say what they hold now
    function tipOf(el, name) {
        var places = fmt.places + (fmt.places === 1 ? ' decimal place' : ' decimal places'), info, value;
        if (el === radDeg) return CalcTips['unit ' + radDeg.firstChild.data];
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
        if (el.classList.contains('calc-past-unit')) return CalcTips['history unit ' + name];
        if (el.classList.contains('calc-past-btn')) {
            return CalcTips['history ' + el.dataset.act + (el.closest('.calc-past-eq') ? ' equation' : ' result')];
        }
        if (el === fracMark) return CalcTips['FRAC'];
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
        if (e.target === statsInput) return; // the list has the menu of the browser, to edit it
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
    // FRAC turns fraction mode off and M recalls the memory, as their keys do;
    // FIX opens the options, where the number format is set; hold is let go
    [[radDeg, 'Deg'], [fracMark, 'a/b'], [mem, 'mr']].forEach(function (mark) {
        mark[0].addEventListener('click', function () {
            keyDown(false, keyBoard[mark[1]]);
            doKey(mark[1]);
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
        return shownResult({ value: String(value), frac: fracMode }, String(+(+value).toPrecision(13)));
    }

    // newest first
    function renderPast() {
        var n = engine.past.length, i, p, row, eq, line, res, unit;

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
            pastList.appendChild(row);
        }
    }

    // A result in the history: as a fraction if it was done in fraction mode,
    // as each calculation keeps its unit; else in the number format of the
    // options, with separators if they are on.
    // text: what its copy button takes, as Ctrl+C would from the display
    function shownResult(entry, usual) {
        var value = entry.value, x = +value, f = entry.frac && CalcEngine.fraction(x), parts, s;
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

    function saveState() {
        storage['secondActive'] = secondActive;
        storage['deg'] = deg;
        storage['stat'] = statsInput.value;
        storage['fraction'] = fracMode;
        storage['memory'] = engine.memory;
        storage['calc'] = engine.save();
        window.parent.postMessage({ command: 'set-storage', storage }, '*');
    }

    function render(val, inp) {
        var hasComma = val.match(/\./),
            x = +val,
            frac = fracMode && !inp && CalcEngine.fraction(x), // a typed number shows as typed
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
            } else if (!inp) {
                tmp = CalcEngine.format(x, fmt) || tmp;
            }
            if (fmt.group && !frac) tmp = CalcEngine.group(tmp);
        }
        if (drawn) display.innerHTML = drawn;
        else display.textContent = tmp;
        fit();
    }

    // the font only gets smaller once the line reaches the edge of the screen;
    // at the smallest size a longer line slides instead. focus: the cursor,
    // kept in view; else the end of a long equation is
    function fit(focus) {
        var size = 34;

        display.classList.remove('calc-more-left', 'calc-more-right');
        display.style.fontSize = size + 'px';
        while (size > 18 && display.scrollWidth > display.clientWidth) {
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
        } else if (text.match(/^[\d|\.|π]$/) || text === 'Ans') {
            keyBoard['AC'].children[0].firstChild.data = 'C';
        } else if (text === 'C') {
            key.children[0].firstChild.data = 'AC';
        } else if (text.match(/Deg|Rad/)) {
            radDeg.firstChild.data = deg ? 'Rad' : 'Deg';
            key.children[0].firstChild.data = deg ? 'Deg' : 'Rad';
            deg = !deg
            fullTurn.textContent = deg ? '360º' : '2π';
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
            render(engine.value, engine.entry === 'typing'); // a typed number shows as typed
        } else {
            resBuffer = engine.value;
            display.innerHTML = eq;
            fit();
        }
        logline.innerHTML = !engine.edit && (engine.error || engine.done) ? eq : '';
        slide(logline, logline.scrollWidth);
        mem.textContent = engine.memory ? 'M' : '';
        fracMark.textContent = fracMode ? 'FRAC' : '';
        keyBoard['a/b'].classList.toggle('calc-lit', fracMode); // its label lit, like an active 2nd key
        pastButton.hidden = !engine.past.length; // shown once there is a history
        if (stats.classList.contains('calc-open')) renderStats(); // the number format or fraction mode may have changed
        if (past.classList.contains('calc-open') && (pastShown.list !== engine.past || pastShown.mode !== shownMode() ||
            pastShown.n !== engine.past.length || pastShown.last !== engine.past[engine.past.length - 1])) {
            renderPast();
        }
    }

})(window);

// window.parent.postMessage({ command: 'clear-storage' }, '*');


document.querySelectorAll('.logo, .calc-help').forEach(function (el) {
    el.addEventListener('click', function () {
        // send msg to to the options page for the extension
        window.parent.postMessage({ command: 'open-options' }, '*');
    });
});