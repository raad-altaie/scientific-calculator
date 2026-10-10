(function (window) {
    'use strict';
    let storage = {}
    let Calc = document.querySelector('.calc-main'),
        display = Calc.querySelector('.calc-display span'),
        logline = Calc.querySelector('.calc-log'),
        notification = Calc.querySelector(".notification"),
        noticeTimer, // fades the notification out
        mem = Calc.querySelector('.calc-mem'), // 'M' while the memory holds a number
        radDeg = Calc.querySelector('.calc-rad'),
        fullTurn = Calc.querySelector('.sign'), // a full turn in the current unit: 2π or 360º
        hold = Calc.querySelector('.calc-hold'),
        secondKeySet = [].slice.call(Calc.querySelector('.calc-left').children, 12, 20),
        hiddenCopy = Calc.querySelector('textarea'),
        pressedKey,
        sliding, // long line being slid: its element and where the slide started
        secondActive = false, // 2nd key active?
        engine = new CalcEngine(), // the calculation and its equation line
        deg = false, // Deg mode or Rad
        resBuffer = '0',
        keyBoard = {},
        secondLayer = [
            ['sin', 'cos', 'tan', 'ln', 'sinh', 'cosh', 'tanh', 'e<sup>x</sup>'],
            [
                'sin<sup>-1</sup>', 'cos<sup>-1</sup>', 'tan<sup>-1</sup>', 'log<sub>2</sub>',
                'sinh<sup>-1</sup>', 'cosh<sup>-1</sup>', 'tanh<sup>-1</sup>', '2<sup>x</sup>'
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
    for (var m = secondLayer[0], n = m.length; n--;) {
        keyBoard[secondLayer[1][n].replace(/<\/*\w+>/g, '')] = keyBoard[m[n]];
    }
    keyBoard['2x'] = keyBoard['ex'];



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
                if (eval(storageMs['deg'])) doKey('Deg', true);
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

    document.addEventListener('keypress', function (e) {
        onKeyPress(e.which);
    }, false);

    document.addEventListener('keydown', function (e) {
        if (onKeyDown(e.which, e.shiftKey)) e.preventDefault();
    }, false);

    document.addEventListener('keyup', onKeyUp, false);

    document.body.addEventListener('paste', function (e) {
        doPaste(e.clipboardData.getData("Text"));
        e.preventDefault();
    }, false);

    // keys come from this document or, as messages, from popup.html

    function onKeyPress(key) {
        var holdKey = hold.textContent,
            keyMatch = (',|.|-|–|/|÷|*|×|#|+/–|x|x!|E|EE|e|ex| |2nd|r|x√y|R|√|p|π|^|yx|\'|yx|"|yx|m|mr|v|mc|b|m+|n|m-|' +
                's|sin|c|cos|t|tan|S|sin-1|C|cos-1|T|tan-1|d|Deg|°|Deg|l|ln|L|log|\\|1/x|X|2x').split('|'),
            keyMatchHold = ('sin|sinh|cos|cosh|tan|tanh|m-|Rand|Deg|Rand|sin-1|sinh-1|cos-1|cosh-1|tan-1|tanh-1|' +
                '1|1/x|2|x2|3|x3|x√y|√|ln|log2|ex|2x').split('|');

        if (key === 13) key = 61;
        key = String.fromCharCode(key);
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
        if ((key.match(/-1$|log2$|2x$/) && !secondActive) || (key.match(/h$|n$|cos$|ex$/) && secondActive)) {
            keyDown(false, keyBoard['2nd']);
            doKey('2nd', true);
        }
        keyDown(false, keyBoard[key]);
        doKey(key, true);
    }

    function onKeyDown(key, shiftKey) { // true if the key was handled here
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
        return engine.error || engine.done || engine.plain() ? resBuffer.replace(/\s/g, '') : engine.text();
    }

    document.body.addEventListener('copy', function (e) {
        e.clipboardData.setData('text/plain', copyText());
        e.preventDefault(); // the text above is copied, not the page's selection
        notify('Copy');
    }, false);

    // the browser only runs a copy asked for by a script while something is
    // selected, so the hidden box is selected for a moment; the copy listener
    // above still supplies the text
    display.addEventListener("dblclick", function () {
        hiddenCopy.value = copyText();
        hiddenCopy.select();
        document.execCommand('copy');
        hiddenCopy.blur(); // typing must not land in the box
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

    // ---------------- event listeners mouse --------------- //

    Calc.onmousedown = function (e) {
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
            if (el.scrollWidth > el.clientWidth) sliding = { el: el, x: e.clientX, left: el.scrollLeft };
        }, false);
    });

    document.addEventListener('pointermove', function (e) {
        if (sliding) slide(sliding.el, sliding.left - (e.clientX - sliding.x));
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
        storage['memory'] = engine.memory;
        storage['calc'] = engine.save();
        window.parent.postMessage({ command: 'set-storage', storage }, '*');
    }

    function render(val, inp) {
        var hasComma = val.match(/\./),
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
        }
        display.textContent = tmp;
        fit();
    }

    // the font only gets smaller once the line reaches the edge of the screen;
    // at the smallest size a longer line slides instead
    function fit() {
        var size = 34;

        display.classList.remove('calc-more-left', 'calc-more-right');
        display.style.fontSize = size + 'px';
        while (size > 18 && display.scrollWidth > display.clientWidth) {
            display.style.fontSize = --size + 'px';
        }
        slide(display, display.scrollWidth); // keeps the end of a long equation visible
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
        } else if (text.match(/^[\d|\.|π]$/)) {
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
        if (key === 'DEL') {
            engine.del(); // takes back the last key of this calculation
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
        var eq = engine.equation();

        if (engine.error) {
            render('Error');
            resBuffer = '0';
        } else if (engine.done || engine.plain()) { // a number alone keeps the usual formatting
            render(engine.value, engine.entry === 'typing'); // a typed number shows as typed
        } else {
            resBuffer = engine.value;
            display.innerHTML = eq;
            fit();
        }
        logline.innerHTML = engine.error || engine.done ? eq : '';
        slide(logline, logline.scrollWidth);
        keyBoard['('].classList.toggle('calc-active', engine.levels.length > 1);
        mem.textContent = engine.memory ? 'M' : '';
    }

})(window);

// window.parent.postMessage({ command: 'clear-storage' }, '*');


document.querySelectorAll('.logo, .calc-help').forEach(function (el) {
    el.addEventListener('click', function () {
        // send msg to to the options page for the extension
        window.parent.postMessage({ command: 'open-options' }, '*');
    });
});