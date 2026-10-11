// Run with: node test/ui.test.js
// The calculator in a real browser: headless Chrome, driven with real clicks and
// keys over its debugging protocol, so nothing needs to be installed but Chrome.
// Set CHROME_PATH to use another browser; without one it skips.
'use strict';

var http = require('http'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    childProcess = require('child_process'),
    ROOT = path.join(__dirname, '..'),
    failures = 0,
    checks = 0,
    pageErrors = [];

function check(ok, label, detail) {
    checks++;
    if (!ok) {
        failures++;
        console.log('FAIL  ' + label + (detail !== undefined ? '\n      ' + detail : ''));
    }
}

function sleep(ms) {
    return new Promise(function (done) { setTimeout(done, ms); });
}

// ---------- the browser ---------- //

function findChrome() {
    var paths = [process.env.CHROME_PATH,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];
    ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].forEach(function (name) {
        try {
            paths.push(childProcess.execSync('command -v ' + name, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim());
        } catch (e) { }
    });
    return paths.filter(function (p) { return p && fs.existsSync(p); })[0];
}

// the files of the project, and a page that holds the calculator in a frame, as
// the options page and the popup do, so a change in the storage reaches it as an event
function serve() {
    var types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
    return new Promise(function (done) {
        var server = http.createServer(function (req, res) {
            var url = decodeURIComponent(req.url.split('?')[0]), file;
            if (url === '/frame.html') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end('<!DOCTYPE html><iframe id="calc-iframe" src="calc.html" width="388" height="585"></iframe>');
            }
            file = path.join(ROOT, url);
            if (file.indexOf(ROOT) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
                res.writeHead(404);
                return res.end();
            }
            res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        });
        server.listen(0, '127.0.0.1', function () { done(server); });
    });
}

async function launch(chrome) {
    var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calc-ui-')), portFile = path.join(dir, 'DevToolsActivePort'),
        proc = childProcess.spawn(chrome, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir,
            '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' }),
        port, i, tabs;
    for (i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
    port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
    return { proc: proc, dir: dir, ws: tabs.filter(function (t) { return t.type === 'page'; })[0].webSocketDebuggerUrl };
}

// a page of the browser: send its commands, run code in it, click and type in it
function Page(wsUrl) {
    var self = this, id = 0;
    self.pending = {};
    self.ws = new WebSocket(wsUrl);
    self.ws.onmessage = function (m) {
        var d = JSON.parse(m.data);
        if (d.id && self.pending[d.id]) {
            self.pending[d.id](d);
            delete self.pending[d.id];
        }
        if (d.method === 'Runtime.exceptionThrown') pageErrors.push(JSON.stringify(d.params.exceptionDetails.exception &&
            d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text).slice(0, 300));
    };
    self.send = function (method, params) {
        return new Promise(function (done) {
            self.pending[++id] = done;
            self.ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
        });
    };
    self.open = new Promise(function (done) { self.ws.onopen = done; });
}

Page.prototype.ev = async function (code) {
    var r = await this.send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(code + '\n' + JSON.stringify(r.result.exceptionDetails).slice(0, 300));
    return r.result.result.value;
};

// the calculator: in the page, or in the frame of the page when there is one
Page.prototype.calc = function (code) {
    return this.ev('(function (document) { return ' + code + '; })(' +
        '(document.getElementById("calc-iframe") || {}).contentDocument || document)');
};

Page.prototype.go = async function (url, size) {
    await this.send('Emulation.setDeviceMetricsOverride', { width: size ? size[0] : 400, height: size ? size[1] : 620, deviceScaleFactor: 1, mobile: false });
    await this.send('Page.navigate', { url: url });
    await this.until('document.readyState === "complete" && ' +
        '!!((document.getElementById("calc-iframe") || {}).contentDocument || document).querySelector(".calc-tools")');
    await sleep(80);
};

// a new calculator: the storage emptied, then these values in it before it starts
Page.prototype.fresh = async function (url, storage, size) {
    await this.go(this.base + '/calc.html');
    await this.ev('localStorage.clear();' + Object.keys(storage || {}).map(function (k) {
        return 'localStorage.setItem(' + JSON.stringify(k) + ',' + JSON.stringify(JSON.stringify(storage[k])) + ');';
    }).join(''));
    await this.go(this.base + url, size);
};

Page.prototype.until = async function (code, ms) {
    for (var end = Date.now() + (ms || 3000); Date.now() < end; await sleep(30)) {
        try {
            if (await this.ev(code)) return true;
        } catch (e) { }
    }
    return false;
};

// the middle of an element, in the page: in the calculator's frame, else in the page itself
Page.prototype.at = function (selector) {
    return this.ev('(function () { var f = document.getElementById("calc-iframe"), s = ' + JSON.stringify(selector) + ',' +
        'e = f && f.contentDocument.querySelector(s), o = e ? f.getBoundingClientRect() : { left: 0, top: 0 }, b;' +
        'e = e || document.querySelector(s);' +
        'if (!e) return null; e.scrollIntoView({ block: "nearest" }); b = e.getBoundingClientRect();' +
        'return [o.left + b.left + b.width / 2, o.top + b.top + b.height / 2]; })()');
};

Page.prototype.click = async function (selector) {
    var p = await this.at(selector), self = this;
    check(!!p, 'there is ' + selector + ' to click');
    if (!p) return;
    for (var type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await self.send('Input.dispatchMouseEvent', { type: type, x: p[0], y: p[1], button: 'left', clickCount: 1 });
    }
    await sleep(60);
};

Page.prototype.hover = async function (selector) {
    var p = await this.at(selector);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0] - 3, y: p[1] });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] });
};

// typed text, as keys of the keyboard: Enter is \r
Page.prototype.type = async function (text) {
    for (var ch of text) {
        var enter = ch === '\r', code = enter ? 13 : ch.toUpperCase().charCodeAt(0);
        await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key: enter ? 'Enter' : ch, text: ch, windowsVirtualKeyCode: code });
        await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: enter ? 'Enter' : ch, windowsVirtualKeyCode: code });
    }
    await sleep(60);
};

Page.prototype.key = async function (name, code) {
    await this.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: name, code: name, windowsVirtualKeyCode: code });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code });
    await sleep(60);
};

// ---------- what is read from the calculator ---------- //

function shown(page) {
    return page.calc('document.getElementById("box").textContent.replace(/\\s+/g, " ").trim()');
}

function open(page, panel) {
    return page.calc('document.querySelector(' + JSON.stringify(panel) + ').classList.contains("calc-open")');
}

function buttons(page) { // the buttons at the top left that are shown
    return page.calc('[].filter.call(document.querySelector(".calc-tools").children, function (b) { return !b.hidden; })' +
        '.map(function (b) { return b.className.split(" ")[0]; }).join(" ")');
}

function value(page) {
    return page.calc('+document.getElementById("box").textContent.replace(/[\\s,]/g, "")');
}

function near(a, b) {
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
}

// ---------- the checks ---------- //

async function calculator(page, at) {
    var t = at + ': ', note, found;

    // the formulas, the converter and the statistics are on at first, in the order of their options
    await page.fresh(at, {});
    check(await buttons(page) === 'calc-fx-btn calc-conv-btn calc-stat-btn', t + 'all three at first', await buttons(page));
    check(await page.calc('document.getElementById("display-box").style.getPropertyValue("--tools")') === '3',
        t + 'the line above a result clears them');
    await page.fresh(at, { fxOn: false, convOn: false, statsOn: false });
    check(await buttons(page) === '', t + 'no buttons with all three off', await buttons(page));
    check(await page.calc('document.getElementById("display-box").style.getPropertyValue("--tools")') === '0',
        t + 'the line above a result starts at the left');

    await page.fresh(at, { convOn: false });
    check(await buttons(page) === 'calc-fx-btn calc-stat-btn', t + 'two buttons with the converter off', await buttons(page));

    // the keys still work, and the history adds its clock
    await page.type('2+3\r');
    check(await shown(page) === '5', t + '2 + 3 = 5', await shown(page));
    check(await buttons(page) === 'calc-hist calc-fx-btn calc-stat-btn', t + 'the clock comes with a history', await buttons(page));
    check(await page.calc('document.getElementById("display-box").style.getPropertyValue("--tools")') === '3',
        t + 'the line above a result clears the three buttons');

    // the panel: the search has the keys, the result in the display starts the first box
    await page.click('.calc-fx-btn');
    check(await open(page, '.calc-fx'), t + 'f(x) opens the panel');
    check(await page.calc('document.activeElement.className') === 'calc-fx-search', t + 'the search has the focus');
    await page.type('circle');
    check(await shown(page) === '5', t + 'typing in the search presses no keys', await shown(page));
    found = await page.calc('[].map.call(document.querySelectorAll(".calc-fx-item .calc-fx-name"), function (n) { return n.textContent; }).join("|")');
    check(/^Area of a circle\|Circumference of a circle\|/.test(found) && found.indexOf('Pythagorean') < 0,
        t + 'the search finds the circles, and only formulas about them', found);
    await page.type('\r');
    check(await page.calc('document.activeElement.value') === '5', t + 'the first box starts with the result, 5');
    await page.type('\r');
    check(!await open(page, '.calc-fx'), t + 'Insert closes the panel');
    check(/^3\.14159265359 × 52$/.test(await shown(page)), t + 'the equation of the circle is in the display', await shown(page));
    await page.type('\r');
    check(near(await value(page), 78.53981633974), t + 'and = gives 78.5398…', await shown(page));

    // into an equation being typed it goes in brackets, as one part
    await page.key('Escape', 27);
    await page.type('2*');
    await page.click('.calc-fx-btn');
    await page.type('pythag\r3\r4\r');
    check(await shown(page) === '2 × (√(32 + 42))', t + 'into 2 × it goes in brackets', await shown(page));
    await page.type('\r');
    check(await shown(page) === '10', t + '2 × √(3² + 4²) = 10', await shown(page));

    // an empty box, then values with no answer: a note, and nothing goes in
    await page.click('.calc-fx-btn');
    await page.type('quadratic\r');
    await page.calc('document.activeElement.value = ""');
    await page.type('\r');
    check(await page.calc('document.querySelectorAll(".calc-fx-var input.calc-bad").length') === 3, t + 'the empty boxes are marked');
    await page.type('2\r1\r4\r');
    note = await page.calc('document.querySelector(".calc-fx-note").textContent');
    check(/No real roots/.test(note), t + 'no real roots: the note says so', note);
    check(await open(page, '.calc-fx') && await shown(page) === '10', t + 'and nothing goes in', await shown(page));
    await page.calc('(function (i) { i.focus(); i.select(); })(document.querySelectorAll(".calc-fx-var input")[2])');
    await page.type('-4');
    check(await page.calc('document.querySelector(".calc-fx-note").textContent') === '', t + 'a new value takes the note away');
    await page.type('\r\r');
    check(near(await value(page), (-1 + Math.sqrt(33)) / 4), t + 'with c = −4 it goes in: x = 1.186…', await shown(page));

    // a note names the letter at fault
    await page.click('.calc-fx-btn');
    await page.calc('(function (s) { s.value = ""; })(document.querySelector(".calc-fx-search"))');
    await page.type('speed\r');
    await page.type('3\r0\r');
    note = await page.calc('document.querySelector(".calc-fx-note").textContent');
    check(note === 't (time) cannot be 0.', t + 'speed with t = 0: the note names t', note);
    await page.key('Escape', 27);
    check(!await open(page, '.calc-fx'), t + 'Esc closes the panel');

    // the tip of a formula: what it gives, its letters and an example
    await page.click('.calc-fx-btn');
    await page.calc('(function (s) { s.value = ""; s.dispatchEvent(new Event("input")); })(document.querySelector(".calc-fx-search"))');
    await page.hover('.calc-fx-row');
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500),
        t + 'resting on a formula shows its tip');
    note = await page.calc('document.querySelector(".calc-tip").textContent');
    check(/Quadratic formula/.test(note) && /For example/.test(note), t + 'the tip names it and has an example', note);

    // the constants: the search is for one list; a click puts one in
    await page.type('xyz');
    await page.click('.calc-fx-tab[data-tab="constants"]');
    check(await page.calc('document.querySelector(".calc-fx-search").value') === '', t + 'another tab clears the search');
    await page.type('light');
    await page.click('.calc-fx-row');
    check(!await open(page, '.calc-fx') && await shown(page) === '299792458', t + 'a click puts c in', await shown(page));
    await page.go(page.base + at);
    await page.click('.calc-fx-btn');
    check(await page.calc('document.querySelector(".calc-fx-tab.calc-on").dataset.tab') === 'constants', t + 'the tab is kept');

    // a press outside closes it; the statistics and the formulas are one at a time
    await page.click('#box');
    check(!await open(page, '.calc-fx'), t + 'a press outside closes the panel');
    await page.click('.calc-stat-btn');
    await page.type('4 8 15 16 23 42');
    check(await page.calc('document.querySelector(".calc-stats-tile[data-k=mean] .calc-stats-value").textContent') === '18',
        t + 'the statistics: the mean of 4 8 15 16 23 42 is 18');
    await page.click('.calc-fx-btn');
    check(await open(page, '.calc-fx') && !await open(page, '.calc-stats'), t + 'f(x) closes the statistics');

    // Deg: an angle the formula takes in radians is turned into them
    await page.key('Escape', 27);
    await page.type('d');
    await page.click('.calc-fx-btn');
    await page.click('.calc-fx-tab[data-tab="formulas"]');
    await page.type('sector\r');
    check(/degrees/.test(await page.calc('document.querySelector(".calc-fx-note").textContent')), t + 'the note says the angles are in degrees');
    await page.type('2\r90\r\r');
    check(near(await value(page), Math.PI), t + 'a sector of 90° with r = 2 is π', await shown(page));
}

// a choice in a list of the converter, by the start of its text: the list opened
// with a click, and the choice clicked
// 10^x, e and log_y on the 2nd layer of log, π and y^x, by click and by the keyboard
async function secondKeys(page, at) {
    var t = at + ': ', KEYS = '.calc-left > :nth-child(', LOG = KEYS + '22)', PI = KEYS + '21)', YX = KEYS + '10)';

    function label(key) {
        return page.calc('document.querySelector(' + JSON.stringify(key) + ').textContent.replace(/\\s+/g, "")');
    }

    await page.fresh(at, {});
    await page.click(KEYS + '1)'); // 2nd
    check(await label(LOG) === '10x' && await label(PI) === 'e' && await label(YX) === 'logy', t + '2nd turns log, π and yˣ',
        await label(LOG) + ' ' + await label(PI) + ' ' + await label(YX));
    await page.click(LOG);
    await page.type('3\r');
    check(await shown(page) === '1000', t + 'a click on 10ˣ, then 3 = is 1000', await shown(page));
    await page.click(PI);
    check(near(await value(page), Math.E), t + 'a click on e puts it in', await shown(page));
    await page.type('8');
    await page.click(YX);
    await page.type('2\r');
    check(await shown(page) === '3', t + '8 logᵧ 2 = 3', await shown(page));
    await page.click(KEYS + '1)');
    check(await label(LOG) === 'log' && await label(PI) === 'π' && await label(YX) === 'yx', t + '2nd again turns them back',
        await label(LOG) + ' ' + await label(PI) + ' ' + await label(YX));

    await page.type('hL2\r');
    check(await shown(page) === '100', t + 'h, Shift+L is 10ˣ', await shown(page));
    await page.type('81h^3\r');
    check(await shown(page) === '4', t + 'h, ^ is logᵧ', await shown(page));
    await page.type('hp');
    check(near(await value(page), Math.E), t + 'h, p is e', await shown(page));
}

// °′″ on the 2nd layer of a/b: results in degrees, minutes and seconds, kept in the
// history and after a reload; the converter has them among its angles
async function degreesMinutes(page, at) {
    var t = at + ': ', AB = '.calc-left > :nth-child(5)';

    function mark() {
        return page.calc('document.querySelector(".calc-frac").textContent');
    }

    function input(text) {
        return page.calc('(function (i) { i.value = ' + JSON.stringify(text) + '; i.dispatchEvent(new Event("input")); })' +
            '(document.querySelector(".calc-conv-value"))');
    }

    await page.fresh(at, {});
    await page.click('.calc-left > :nth-child(1)'); // 2nd
    check(await page.calc('document.querySelector(' + JSON.stringify(AB) + ').textContent.trim()') === '°′″',
        t + '2nd turns a/b into °′″');
    await page.click(AB);
    check(await mark() === 'DMS', t + 'DMS shows it is on', await mark());
    check(await page.calc('document.querySelector(' + JSON.stringify(AB) + ').classList.contains("calc-lit")'), t + 'its key has its dot');
    await page.type('11/4\r'); // the type above sends '.' as Delete, so no decimals are typed here
    check(await shown(page) === '2°45′0″', t + '11 ÷ 4 = 2°45′0″', await shown(page));
    await page.type('3');
    check(await shown(page) === '3', t + 'a number being typed shows as typed', await shown(page));
    await page.type('/2\r');
    check(await shown(page) === '1°30′0″', t + 'and its result in degrees, minutes and seconds', await shown(page));

    // the history keeps it; the mark turns it off
    await page.click('.calc-frac');
    check(await shown(page) === '1.5' && await mark() === '', t + 'a click on DMS turns it off', await shown(page) + ' ' + await mark());
    await page.type('1+1\r');
    await page.click('.calc-hist');
    check(await page.calc('[].map.call(document.querySelectorAll(".calc-past-res"), function (r) { return r.textContent.trim(); }).join(" ")') ===
        '2 1°30′0″ 2°45′0″', t + 'the history shows each result as it was done',
        await page.calc('[].map.call(document.querySelectorAll(".calc-past-res"), function (r) { return r.textContent.trim(); }).join(" ")'));
    await page.key('Escape', 27);

    // with fraction mode: one or the other
    await page.type('hf');
    check(await mark() === 'DMS', t + 'h, f turns it on', await mark());
    await page.type('f');
    check(await mark() === 'FRAC', t + 'fraction mode turns it off', await mark());
    await page.type('hf');
    check(await mark() === 'DMS', t + 'and it turns fraction mode off', await mark());
    await page.go(page.base + at);
    check(await mark() === 'DMS' && await shown(page) === '2°0′0″', t + 'on after a reload', await mark() + ' ' + await shown(page));

    // the converter: degrees, minutes and seconds among the angles; typed so, in degrees in Rad as well
    await page.click('.calc-conv-btn');
    await choose(page, '.calc-conv-group', 'Angle');
    await choose(page, '.calc-conv-unit', 'degrees');
    await input('36.86989764584');
    check(await converted(page, 'degrees, minutes, seconds') === '36°52′11.63″', t + 'the converter shows 36°52′11.63″',
        await converted(page, 'degrees, minutes, seconds'));
    await choose(page, '.calc-conv-unit', 'degrees, minutes, seconds');
    await input('12°30′');
    check(await converted(page, 'degrees') === '12.5', t + '12°30′ is 12.5° in Rad', await converted(page, 'degrees'));
    await choose(page, '.calc-conv-unit', 'radians');
    await input('180°');
    check(await converted(page, 'degrees') === '180', t + '180° typed for radians is π radians', await converted(page, 'degrees'));
    await page.key('Escape', 27);
}

async function choose(page, list, text) {
    var i;
    await page.click(list + ' .calc-conv-chosen');
    i = await page.calc('[].map.call(document.querySelectorAll(' + JSON.stringify(list + ' .calc-conv-item') + '), function (c) {' +
        ' return c.textContent; }).findIndex(function (c) { return c.indexOf(' + JSON.stringify(text) + ') === 0; })');
    check(i > -1, 'the list ' + list + ' has ' + text);
    await page.click(list + ' .calc-conv-item[data-i="' + i + '"]');
}

function chosen(page, list) {
    return page.calc('document.querySelector(' + JSON.stringify(list + ' .calc-conv-chosen') + ').textContent');
}

function converted(page, name) { // the value shown for a unit, by its name
    return page.calc('(function (r) { return r ? r.querySelector(".calc-conv-num").textContent : null; })(' +
        '[].filter.call(document.querySelectorAll(".calc-conv-row"), function (r) { return r.querySelector(".calc-conv-name").textContent === ' +
        JSON.stringify(name) + '; })[0])');
}

async function converter(page, at) {
    var t = at + ': ', note;

    // its button comes after f(x), as its option does
    await page.fresh(at, {});
    check(await buttons(page) === 'calc-fx-btn calc-conv-btn calc-stat-btn', t + 'the converter between f(x) and the statistics',
        await buttons(page));

    // the result shown is the value to start from
    await page.type('5\r');
    await page.click('.calc-conv-btn');
    check(await open(page, '.calc-conv'), t + 'the arrows open the converter');
    check(await page.calc('document.activeElement.className') === 'calc-conv-value', t + 'the value has the focus');
    check(await page.calc('document.activeElement.value') === '5', t + 'and starts with the result, 5');
    await choose(page, '.calc-conv-group', 'Length');
    await choose(page, '.calc-conv-unit', 'kilometers');
    check(await converted(page, 'miles') === '3.10685596119', t + '5 km is 3.10685596119 mi', await converted(page, 'miles'));
    check(await converted(page, 'kilometers') === null, t + 'its own unit is not in the list');

    // an equation is worked out; typing in it presses no keys
    await page.calc('document.querySelector(".calc-conv-value").select()');
    await page.type('2*3');
    check(await shown(page) === '5', t + 'typing in the value presses no keys', await shown(page));
    check(await converted(page, 'meters') === '6,000', t + '2*3 km is 6,000 m', await converted(page, 'meters'));
    // 2*3# is not read as 2, the number it starts with
    await page.calc('(function (i) { i.value = "2*3#"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-conv-value"))');
    note = await page.calc('document.querySelector(".calc-conv-note").textContent');
    check(/Not a number/.test(note) && await page.calc('document.querySelector(".calc-conv-value").classList.contains("calc-bad")'),
        t + 'a value it cannot read is marked', note);
    check(await converted(page, 'meters') === '–', t + 'and has no values');
    await page.key('Backspace', 8);
    check(await converted(page, 'meters') === '6,000', t + 'without it, 6,000 m again', await converted(page, 'meters'));

    // Enter puts in the first value, the meters
    await page.type('\r');
    check(!await open(page, '.calc-conv') && await shown(page) === '6000', t + 'Enter puts in 6000 m', await shown(page));
    check(await page.calc('document.querySelector(".calc-log").textContent.trim()') === '', t + 'and presses no = after it',
        await page.calc('document.querySelector(".calc-log").textContent'));

    // the units of a group are its own; a click puts a value in
    await page.click('.calc-conv-btn');
    check(await page.calc('document.querySelector(".calc-conv-value").value') === '6000', t + 'the new result starts it', await page.calc('document.querySelector(".calc-conv-value").value') + ' / ' + await shown(page));
    await choose(page, '.calc-conv-group', 'Temperature');
    await choose(page, '.calc-conv-unit', 'Fahrenheit');
    await page.calc('(function (i) { i.value = "212"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-conv-value"))');
    check(await converted(page, 'Celsius') === '100', t + '212 °F is 100 °C', await converted(page, 'Celsius'));
    await page.click('.calc-conv-row[data-i="0"]');
    check(!await open(page, '.calc-conv') && await shown(page) === '100', t + 'a click puts 100 in', await shown(page));

    // kept for the next time: the group, its unit, and the unit of the other groups
    await page.go(page.base + at);
    await page.click('.calc-conv-btn');
    check(await chosen(page, '.calc-conv-group') === 'Temperature' && /^Fahrenheit/.test(await chosen(page, '.calc-conv-unit')),
        t + 'the group and unit are kept');
    await choose(page, '.calc-conv-group', 'Length');
    check(/^kilometers/.test(await chosen(page, '.calc-conv-unit')), t + 'and the unit of Length too');

    // the lists by the keys: an arrow opens one and goes along it, Enter chooses,
    // Esc closes the list and not the panel; typing in it presses no keys
    await page.calc('document.querySelector(".calc-conv-unit").focus()');
    await page.key('ArrowDown', 40);
    check(!await page.calc('document.querySelector(".calc-conv-unit .calc-conv-menu").hidden'), t + 'an arrow opens the list');
    await page.key('ArrowDown', 40);
    await page.key('Enter', 13);
    check(/^inches/.test(await chosen(page, '.calc-conv-unit')), t + 'the next one, inches, is chosen', await chosen(page, '.calc-conv-unit'));
    check(await page.calc('document.activeElement.className') === 'calc-conv-value', t + 'and the value has the focus again');
    await page.calc('document.querySelector(".calc-conv-group").focus()');
    await page.key('Enter', 13);
    await page.key('Escape', 27);
    check(await page.calc('document.querySelector(".calc-conv-group .calc-conv-menu").hidden') && await open(page, '.calc-conv'),
        t + 'Esc closes the list, and the panel stays');
    await page.type('7');
    check(await shown(page) === '100', t + 'a key on a list presses none of the calculator', await shown(page));
    await page.click('.calc-conv-group .calc-conv-chosen');
    await page.click('.calc-conv-note');
    check(await page.calc('document.querySelector(".calc-conv-group .calc-conv-menu").hidden'), t + 'a press beside the list closes it');

    // no value: 0 L/100 km has no km/L
    await choose(page, '.calc-conv-group', 'Fuel economy');
    await choose(page, '.calc-conv-unit', 'liters per 100 km');
    await page.calc('(function (i) { i.value = "0"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-conv-value"))');
    check(await converted(page, 'kilometers per liter') === '–', t + '0 L/100 km has no km/L');
    await page.click('.calc-conv-row[data-i="0"]');
    check(await open(page, '.calc-conv'), t + 'and a click on it puts nothing in');

    // one panel at a time; Esc closes it
    await page.click('.calc-fx-btn');
    check(await open(page, '.calc-fx') && !await open(page, '.calc-conv'), t + 'f(x) closes the converter');
    await page.click('.calc-conv-btn');
    await page.key('Escape', 27);
    check(!await open(page, '.calc-conv'), t + 'Esc closes the converter');
}

// the options turn the buttons on and off in an open calculator, by the storage
async function options(page) {
    var t;

    await page.fresh('/frame.html', {});
    t = 'in a frame: ';
    check(await buttons(page) === 'calc-fx-btn calc-conv-btn calc-stat-btn', t + 'all three buttons');
    await page.click('.calc-fx-btn');
    await page.ev('localStorage.setItem("fxOn", "false")');
    check(await page.until('!(document.getElementById("calc-iframe").contentDocument.querySelector(".calc-fx-btn").offsetWidth)'),
        t + 'turned off, its button goes');
    check(!await open(page, '.calc-fx'), t + 'and its open panel closes');
    await page.ev('localStorage.setItem("statsOn", "false")');
    check(await page.until('document.getElementById("calc-iframe").contentDocument.querySelector(".calc-stat-btn").hidden'),
        t + 'the statistics go too');
    await page.ev('localStorage.setItem("convOn", "false")');
    check(await page.until('document.getElementById("calc-iframe").contentDocument.querySelector(".calc-conv-btn").hidden'),
        t + 'and the converter');
    await page.ev('localStorage.setItem("convOn", "true")');
    check(await page.until('!document.getElementById("calc-iframe").contentDocument.querySelector(".calc-conv-btn").hidden'),
        t + 'turned on again, it comes back');

    // the website: its switches
    t = 'web/index.html: ';
    await page.fresh('/web/index.html', {}, [1300, 900]);
    check(await page.ev('document.getElementById("panel-stats").checked && document.getElementById("panel-fx").checked && ' +
        'document.getElementById("panel-conv").checked'), t + 'at first all three on');
    check(await page.until('!document.getElementById("calc-iframe").contentDocument.querySelector(".calc-conv-btn").hidden'),
        t + 'and their buttons in the calculator');
    await page.ev('document.getElementById("panel-fx").scrollIntoView({ block: "center" })');
    await page.click('#panel-stats');
    check(await page.until('document.getElementById("calc-iframe").contentDocument.querySelector(".calc-stat-btn").hidden'),
        t + 'its switch takes the statistics out of the calculator');
    await page.click('#panel-fx');
    check(await page.until('document.getElementById("calc-iframe").contentDocument.querySelector(".calc-fx-btn").hidden'),
        t + 'and f(x)');
    await page.click('#panel-stats');
    check(await page.until('!document.getElementById("calc-iframe").contentDocument.querySelector(".calc-stat-btn").hidden'),
        t + 'and puts the statistics back');
    await page.go(page.base + '/web/index.html', [1300, 900]);
    check(await page.ev('document.getElementById("panel-stats").checked && !document.getElementById("panel-fx").checked && ' +
        'document.getElementById("panel-conv").checked'), t + 'the switches are kept');
}

(async function () {
    var chrome = findChrome(), server, browser, page;

    if (!chrome) {
        console.log('skipped: no Chrome found (set CHROME_PATH to run the browser checks)');
        return;
    }
    if (typeof WebSocket === 'undefined') {
        console.log('skipped: this Node has no WebSocket (Node 22 or later runs the browser checks)');
        return;
    }
    server = await serve();
    browser = await launch(chrome);
    try {
        page = new Page(browser.ws);
        await page.open;
        page.base = 'http://127.0.0.1:' + server.address().port;
        await page.send('Runtime.enable');
        await page.send('Network.enable');
        await page.send('Network.setCacheDisabled', { cacheDisabled: true });
        await calculator(page, '/calc.html');
        await calculator(page, '/web/calc.html');
        await secondKeys(page, '/calc.html');
        await secondKeys(page, '/web/calc.html');
        await degreesMinutes(page, '/calc.html');
        await degreesMinutes(page, '/web/calc.html');
        await converter(page, '/calc.html');
        await converter(page, '/web/calc.html');
        await options(page);
        check(!pageErrors.length, 'no errors in the pages', pageErrors.join('\n      '));
    } catch (e) {
        check(false, 'the browser checks ran to the end', e.stack);
    } finally {
        page && page.ws.close();
        browser.proc.kill();
        server.close();
        setTimeout(function () { fs.rmSync(browser.dir, { recursive: true, force: true }); }, 300);
    }
    console.log(failures ? failures + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
    process.exitCode = failures ? 1 : 0;
})();
