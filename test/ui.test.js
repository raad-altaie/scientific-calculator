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

// the files of the project, and a page that holds the calculator in a frame: another
// page, as the options page is to the popup, so a change in the storage reaches it as an event
function serve() {
    var types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
    return new Promise(function (done) {
        var server = http.createServer(function (req, res) {
            var url = decodeURIComponent(req.url.split('?')[0]), file;
            if (url === '/frame.html') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end('<!DOCTYPE html><iframe id="calc-iframe" src="popup.html" width="395" height="600"></iframe>');
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
    // the popup draws the calculator a little bigger, to fill its height: the checks measure it at its own size
    await this.calc('document.getElementById("calculator").style.transform = "none"');
    await sleep(80);
};

// a new calculator: the storage emptied, then these values in it before it starts
Page.prototype.fresh = async function (url, storage, size) {
    await this.go(this.base + '/popup.html');
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

Page.prototype.click = async function (selector, hold) {
    var p = await this.at(selector), self = this;
    check(!!p, 'there is ' + selector + ' to click');
    if (!p) return;
    for (var type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        if (type === 'mouseReleased' && hold) await sleep(hold); // pressed a while, as a hand does
        await self.send('Input.dispatchMouseEvent', { type: type, x: p[0], y: p[1], button: 'left', clickCount: 1 });
    }
    await sleep(60);
};

// a right click, which opens the menu
Page.prototype.rightClick = async function (selector) {
    var p = await this.at(selector);
    check(!!p, 'there is ' + selector + ' to right click');
    if (!p) return;
    for (var type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await this.send('Input.dispatchMouseEvent', { type: type, x: p[0], y: p[1], button: 'right', clickCount: 1 });
    }
    await sleep(60);
};

Page.prototype.hover = async function (selector) {
    var p = await this.at(selector);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0] - 3, y: p[1] });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] });
};

// the pointer over the plot of the graph at x and y, as the plot starts: x -10 to 10, 0 in the middle
Page.prototype.hoverAt = async function (selector, x, y) {
    var p = await this.at(selector), w = await this.calc('document.querySelector(' + JSON.stringify(selector) + ').clientWidth'),
        k = await this.calc('(function (c) { return c.getBoundingClientRect().width / c.offsetWidth; })(document.getElementById("calculator"))'),
        px = p[0] + x * w / 20 * k, py = p[1] - y * w / 20 * k;
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px - 2, y: py });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px, y: py });
};

// a click on the plot of the graph at x and y, as the plot starts
Page.prototype.clickAt = async function (selector, x, y) {
    var p = await this.at(selector), w = await this.calc('document.querySelector(' + JSON.stringify(selector) + ').clientWidth'),
        k = await this.calc('(function (c) { return c.getBoundingClientRect().width / c.offsetWidth; })(document.getElementById("calculator"))'),
        px = p[0] + x * w / 20 * k, py = p[1] - y * w / 20 * k;
    for (var type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await this.send('Input.dispatchMouseEvent', { type: type, x: px, y: py, button: 'left', clickCount: 1 });
    }
    await sleep(60);
};

// a drag on the plot of the graph from x0 and y0 to x1 and y1, as the plot starts, in ten steps
Page.prototype.dragAt = async function (selector, x0, y0, x1, y1) {
    var p = await this.at(selector), w = await this.calc('document.querySelector(' + JSON.stringify(selector) + ').clientWidth'),
        k = await this.calc('(function (c) { return c.getBoundingClientRect().width / c.offsetWidth; })(document.getElementById("calculator"))'),
        u = w / 20 * k, i;
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0] + x0 * u, y: p[1] - y0 * u });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p[0] + x0 * u, y: p[1] - y0 * u, button: 'left', clickCount: 1 });
    for (i = 1; i <= 10; i++) {
        await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0] + (x0 + (x1 - x0) * i / 10) * u,
            y: p[1] - (y0 + (y1 - y0) * i / 10) * u, button: 'left', buttons: 1 });
    }
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p[0] + x1 * u, y: p[1] - y1 * u, button: 'left', clickCount: 1 });
    await sleep(60);
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

    // the formulas, the converter, the statistics and the graph are on at first, in the order of their options
    await page.fresh(at, {});
    check(await buttons(page) === 'calc-fx-btn calc-conv-btn calc-graph-btn calc-solve-btn calc-stat-btn calc-numbers-btn', t + 'all of them at first', await buttons(page));
    check(await page.calc('document.getElementById("display-box").style.getPropertyValue("--tools")') === '6',
        t + 'the line above a result clears them');
    await page.fresh(at, { fxOn: false, convOn: false, statsOn: false, graphOn: false, solveOn: false, numbersOn: false });
    check(await buttons(page) === '', t + 'no buttons with all of them off', await buttons(page));
    check(await page.calc('document.getElementById("display-box").style.getPropertyValue("--tools")') === '0',
        t + 'the line above a result starts at the left');

    // what an administrator turned off, as the extension keeps it: on in the options does not bring it
    await page.fresh(at, { statsOn: true, policy: { statistics: false, formulas: false } });
    check(await buttons(page) === 'calc-conv-btn calc-graph-btn calc-solve-btn calc-numbers-btn', t + 'the statistics and f(x) turned off by an administrator', await buttons(page));
    await page.fresh(at, { solveOn: true, policy: { solve: false, numbers: false } });
    check(await buttons(page) === 'calc-fx-btn calc-conv-btn calc-graph-btn calc-stat-btn', t + 'and the solver and the numbers', await buttons(page));
    await page.fresh(at, { convOn: false });
    check(await buttons(page) === 'calc-fx-btn calc-graph-btn calc-solve-btn calc-stat-btn calc-numbers-btn', t + 'three buttons with the converter off', await buttons(page));

    // the ? beside the name has a tip of the calculator's own, below it, in place of a title
    await page.hover('.calc-help');
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500), t + 'resting on the ? shows its tip');
    note = await page.calc('document.querySelector(".calc-tip").textContent');
    check(/^Options and guide/.test(note), t + 'the tip says it is the options and the guide', note);
    check(await page.calc('document.querySelector(".calc-tip").classList.contains("calc-tip-below") && ' +
        '!document.querySelector(".calc-help").title'), t + 'it is below the ?, which has no title');
    // put away by a key, it comes again as the pointer moves on the ?, without going out and back in
    await page.key('Shift', 16);
    check(await page.calc('document.querySelector(".calc-tip").hidden'), t + 'a key puts the tip away');
    const help = await page.at('.calc-help');
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: help[0] + 1, y: help[1] });
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500), t + 'and moving on the ? brings it back');
    await page.hover('#box');
    check(await page.until('document.querySelector(".calc-tip").hidden', 2500), t + 'the tip goes as the pointer leaves the ?');

    // the keys still work, and the history adds its clock
    await page.type('2+3\r');
    check(await shown(page) === '5', t + '2 + 3 = 5', await shown(page));
    check(await buttons(page) === 'calc-hist calc-fx-btn calc-graph-btn calc-solve-btn calc-stat-btn calc-numbers-btn', t + 'the clock comes with a history', await buttons(page));
    check(await page.calc('document.getElementById("display-box").style.getPropertyValue("--tools")') === '6',
        t + 'the line above a result clears the buttons');

    // the panel: the search has the keys, the result in the display starts the first box
    await page.click('.calc-fx-btn');
    check(await open(page, '.calc-fx'), t + 'f(x) opens the panel');
    check(await page.calc('document.querySelector(".calc-fx-tab.calc-on").dataset.tab') === 'vars' &&
        await page.calc('document.querySelectorAll(".calc-var").length') === 10, t + 'it opens on Variables at first');
    await page.click('.calc-fx-tab[data-tab="formulas"]');
    check(await page.calc('document.activeElement.className') === 'calc-fx-search', t + 'the search has the focus');
    // the formulas are even: one height, each at the same place of its card, clear of its name
    found = await page.calc('(function () { var bad = [], high = {}, mid = [];' +
        ' [].forEach.call(document.querySelectorAll(".calc-fx-item"), function (item) {' +
        ' var name = item.querySelector(".calc-fx-name"), eq = item.querySelector(".calc-fx-eq > span"), r = document.createRange(), n, e, c;' +
        ' r.selectNodeContents(name); n = r.getBoundingClientRect(); e = eq.getBoundingClientRect(); c = item.getBoundingClientRect();' +
        ' high[Math.round(c.height)] = 1;' +
        ' mid.push((e.top + e.bottom - c.top - c.bottom) / 2);' +
        ' if (eq.scrollWidth > eq.clientWidth) bad.push(name.textContent);' +
        ' [].forEach.call(eq.querySelectorAll(".calc-fr"), function (fr) { var f = fr.getBoundingClientRect();' +
        ' if (f.left < n.right + 2 && f.top < n.bottom - 2) bad.push(name.textContent); }); });' +
        ' return Object.keys(high).length + "|" + (Math.max.apply(null, mid) - Math.min.apply(null, mid) <= 1) + "|" + bad.join(", "); })()');
    check(found === '1|true|', t + 'every formula has the same height, at the same place of its card, clear of its name', found);
    await page.type('circle');
    check(await shown(page) === '5', t + 'typing in the search presses no keys', await shown(page));
    found = await page.calc('[].map.call(document.querySelectorAll(".calc-fx-item .calc-fx-name"), function (n) { return n.textContent; }).join("|")');
    check(/^Area of a circle\|Circumference of a circle\|/.test(found) && found.indexOf('Pythagorean') < 0,
        t + 'the search finds the circles, and only formulas about them', found);
    await page.type('\r');
    check(await page.calc('document.activeElement.value') === '5', t + 'the first box starts with the result, 5');
    await page.type('\r');
    check(!await open(page, '.calc-fx'), t + 'Insert closes the panel');
    check(/^π × 52$/.test(await shown(page)), t + 'the equation of the circle is in the display, π as π', await shown(page));
    await page.type('\r');
    check(near(await value(page), 78.53981633974), t + 'and = gives 78.5398…', await shown(page));

    // into an equation being typed it goes in brackets, as one part
    await page.key('Escape', 27);
    await page.type('2*');
    await page.click('.calc-fx-btn');
    await page.type('pythag\r3\r4\r');
    check(await shown(page) === '2 × (32 + 42)' && await page.calc('!!document.querySelector("#box .calc-root")'),
        t + 'into 2 × it goes in brackets, its root drawn with its bar', await shown(page));
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
    await page.hover('.calc-fx-row');
    check(await page.until('!document.querySelector(".calc-peek").hidden && /^Speed of light/.test(document.querySelector(".calc-peek").textContent)', 2500) &&
        /^299,792,458/.test(await page.calc('document.querySelector(".calc-peek .calc-peek-value").textContent')) &&
        await page.calc('document.querySelectorAll(".calc-peek .calc-peek-act").length') === 2 && await page.calc('document.querySelector(".calc-tip:not(.calc-peek)").hidden'),
        t + 'a constant has the tip of a value: what it is, its value, Insert and Copy, and no other tip',
        await page.calc('document.querySelector(".calc-peek").textContent'));
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
    // what is between the numbers: found by itself, or the one chosen, kept after a reload
    var count = 'document.querySelector(".calc-stats-tile[data-k=n] .calc-stats-value").textContent',
        by = 'document.querySelector(".calc-stats-by .calc-conv-chosen").textContent';
    await page.calc('(function (i) { i.value = "1,234.5\\n1 000\\n$2"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-stats-input"))');
    check(await page.calc('document.querySelector(".calc-stats-by").previousElementSibling.textContent') === 'Separator', t + 'the list of what is between the numbers has its label');
    check(await page.calc(by) === 'Auto' && await page.calc(count) === '4', t + 'by itself 1,234.5 and 1 000 are two numbers each',
        await page.calc(by) + ' ' + await page.calc(count));
    await page.click('.calc-stats-by');
    check(await page.calc('[].map.call(document.querySelectorAll(".calc-stats-by .calc-conv-item"), function (i) { return i.textContent; }).join("|")') ===
        'Auto|New line|Tab|Space|Comma ,|Semicolon ;|Pipe ||Colon :', t + 'the choices of what is between the numbers');
    await page.click('.calc-stats-by .calc-conv-item[data-i="1"]');
    check(await page.calc(by) === 'New line' && await page.calc(count) === '3' &&
        await page.calc('document.querySelector(".calc-stats-tile[data-k=sum] .calc-stats-value").textContent') === '2236.5',
        t + 'apart by new lines they are one each, and $2 is 2', await page.calc(by) + ' ' + await page.calc(count));
    check(await page.calc('document.activeElement.className') === 'calc-stats-input', t + 'the list has the focus again');
    await page.go(page.base + at);
    await page.click('.calc-stat-btn');
    check(await page.calc(by) === 'New line' && await page.calc(count) === '3', t + 'the choice is kept after a reload',
        await page.calc(by) + ' ' + await page.calc(count));
    await page.calc('(function (i) { i.value = "1,5|1 000|3"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-stats-input"))');
    await page.click('.calc-stats-by');
    await page.click('.calc-stats-by .calc-conv-item[data-i="6"]');
    check(await page.calc(by) === 'Pipe |' && await page.calc(count) === '3' &&
        await page.calc('document.querySelector(".calc-stats-tile[data-k=sum] .calc-stats-value").textContent') === '1004.5',
        t + 'apart by pipes', await page.calc(by) + ' ' + await page.calc(count));
    check(await page.calc('document.querySelector(".calc-stats-by .calc-conv-menu").hidden'), t + 'its list closes after the choice');
    await page.click('.calc-stats-by');
    check(await page.calc('(function (m, p) { m = m.getBoundingClientRect(); p = p.getBoundingClientRect(); return m.bottom <= p.bottom && m.height > 100; })' +
        '(document.querySelector(".calc-stats-by .calc-conv-menu"), document.querySelector(".calc-stats"))'), t + 'the open list fits inside the panel');
    await page.click('.calc-stats-by .calc-conv-item[data-i="0"]');
    await page.calc('(function (i) { i.value = "4 8 15 16 23 42"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-stats-input"))');
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

    // a touch screen: no box is given the focus, so its keyboard stays down until one is touched
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await page.click('.calc-fx-btn');
    check(await open(page, '.calc-fx') && await page.calc('document.activeElement.tagName') === 'BODY',
        t + 'on a touch screen the search is left without the focus', await page.calc('document.activeElement.tagName'));
    await page.click('.calc-fx-tab[data-tab="constants"]');
    await page.click('.calc-fx-tab[data-tab="formulas"]');
    check(await page.calc('document.activeElement.tagName') === 'BODY', t + 'and after another tab too');
    await page.click('.calc-fx-row');
    check(await page.calc('!!document.querySelector(".calc-fx-item.calc-on input") && document.activeElement.tagName') === 'BODY',
        t + 'the boxes of a formula are left too');
    await page.click('.calc-fx-search');
    check(await page.calc('document.activeElement.className') === 'calc-fx-search', t + 'a touch on a box gives it the focus');
    await page.type('sector\r');
    check(await page.calc('!!document.activeElement.closest(".calc-fx-var")'), t + 'and with the keyboard up, the focus goes on to the next box');
    await page.click('.calc-stat-btn');
    check(await open(page, '.calc-stats') && await page.calc('document.activeElement.tagName') === 'BODY',
        t + 'the list of the statistics is left without the focus');
    await page.click('.calc-stats .calc-past-clear');
    check(await page.calc('document.activeElement.tagName') === 'BODY', t + 'and after it is cleared');
    await page.click('#box');
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
}

// the graph: a function of x drawn on x and y axes, the point under the pointer,
// its y put into the calculation, and the view zoomed and kept
async function graphPanel(page, at) {
    var t = at + ': ', note = 'document.querySelector(".calc-graph-note").textContent', ink, cross, plain, dashes, shade, traced, red, i, found = [],
        diff = 'document.querySelector(".calc-graph-diff").textContent', cells = 'document.querySelectorAll(".calc-graph-pair input")',
        pop = '(function (p) { var c = p.cloneNode(true), b = p.querySelectorAll("input");' +
            ' c.querySelectorAll("input").forEach(function (i, n) { i.replaceWith(b[n].value); });' +
            ' return c.textContent.replace(/\\s+/g, " ").trim(); })(document.querySelector(".calc-graph-pop"))';

    // the pixels of the curve's color in the plot
    ink = '(function () { var c = document.querySelector(".calc-graph-plot canvas"), n = 0, i,' +
        ' d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;' +
        ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x22) < 24 && Math.abs(d[i + 1] - 0x47) < 24 &&' +
        ' Math.abs(d[i + 2] - 0x6a) < 24 && d[i + 3] > 200) n++; return n; })()';

    // the pixels of the ink of the axes around x = -5, y = 5, as the plot starts: the cross drawn there
    cross = '(function () { var c = document.querySelector(".calc-graph-plot canvas"), k = c.width / c.clientWidth, w = c.clientWidth,' +
        ' x = Math.round((w / 2 - w / 4) * k), y = Math.round((c.clientHeight / 2 - w / 4) * k), n = 0, i,' +
        ' d = c.getContext("2d").getImageData(x - 7 * k, y - 7 * k, 14 * k, 14 * k).data;' +
        ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x33) < 20 && Math.abs(d[i + 1] - 0x44) < 20 && Math.abs(d[i + 2] - 0x3b) < 20) n++;' +
        ' return n; })()';

    // the pixels of the curve's color near x and y of the plot as it starts: its tangent drawn there
    dashes = function (x, y) {
        return '(function () { var c = document.querySelector(".calc-graph-plot canvas"), k = c.width / c.clientWidth, w = c.clientWidth,' +
            ' x = Math.round((w / 2 + ' + x + ' * w / 20) * k), y = Math.round((c.clientHeight / 2 - ' + y + ' * w / 20) * k), n = 0, i,' +
            ' d = c.getContext("2d").getImageData(x - 4 * k, y - 4 * k, 8 * k, 8 * k).data;' +
            ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x22) < 30 && Math.abs(d[i + 1] - 0x47) < 30 &&' +
            ' Math.abs(d[i + 2] - 0x6a) < 30 && d[i + 3] > 100) n++; return n; })()';
    };

    // the pixels about x and y of the plot as it starts with the curve's color, faint: its area shaded there;
    // of the first curve, navy, unless another color is given
    shade = function (x, y, c) {
        c = c || [0x22, 0x47, 0x6a];
        return '(function () { var c = document.querySelector(".calc-graph-plot canvas"), k = c.width / c.clientWidth, w = c.clientWidth,' +
            ' x = Math.round((w / 2 + ' + x + ' * w / 20) * k), y = Math.round((c.clientHeight / 2 - ' + y + ' * w / 20) * k), n = 0, i,' +
            ' d = c.getContext("2d").getImageData(x - 3 * k, y - 3 * k, 6 * k, 6 * k).data;' +
            ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - ' + c[0] + ') < 30 && Math.abs(d[i + 1] - ' + c[1] + ') < 30 &&' +
            ' Math.abs(d[i + 2] - ' + c[2] + ') < 30 && d[i + 3] > 50 && d[i + 3] < 110) n++; return n; })()';
    };

    await page.fresh(at, {});
    await page.click('.calc-graph-btn');
    check(await open(page, '.calc-graph'), t + 'the curve opens the graph');
    check(await page.calc('document.activeElement.className') === 'calc-graph-input', t + 'its box has the focus');
    check(/^Type a function of x/.test(await page.calc(note)), t + 'an empty box says what to type', await page.calc(note));
    check(await page.calc(ink) === 0, t + 'and there is no curve yet');
    await page.type('x^2-3');
    check(await page.calc(ink) > 200, t + 'x^2 – 3 is drawn', await page.calc(ink));
    check(/^Point at the graph/.test(await page.calc(note)), t + 'the note says how to read it', await page.calc(note));
    check(await page.calc('document.querySelectorAll(".calc-graph-fn:not([hidden])").length') === 1 &&
        !await page.calc('document.querySelector(".calc-graph-del").offsetWidth'), t + 'one box, without a × while it is the only one');
    await page.click('.calc-graph-add');
    check(await page.calc('document.querySelectorAll(".calc-graph-fn:not([hidden])").length') === 2 &&
        await page.calc('document.activeElement === document.querySelectorAll(".calc-graph-input")[1]'), t + 'the + adds a box for another curve, to type in');

    // the pointer a little off x = 2 is at 2, a round number, and y = 1; farther off, at what a pixel tells
    await page.hoverAt('.calc-graph-plot', 2.06, 1.2);
    check(/^On the curve\s*x = 2\s*y = 1$/.test((await page.calc(note)).trim()), t + 'near x = 2: at 2, not 2.06', await page.calc(note));
    await page.hoverAt('.calc-graph-plot', 2.3, 2.3);
    check(/^On the curve\s*x = 2\.\d+\s*y = /.test(await page.calc(note)), t + 'away from a round number: as near as a pixel', await page.calc(note));

    // the pointer at the lowest point, x = 0 and y = -3, shows what it is; a click opens its popup
    await page.hoverAt('.calc-graph-plot', 0, -3);
    check(/^Min, y-intercept\s*x = 0\s*y = -3/.test(await page.calc(note)), t + 'the point under the pointer: the low at x = 0, y = -3',
        await page.calc(note));
    await page.clickAt('.calc-graph-plot', 0, -3);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden') && /^Min, y-intercept\s*x = 0\s*y = -3\s*Slope = 0$/.test(await page.calc(pop)),
        t + 'a click on it opens its popup, with the slope there', await page.calc(pop));
    check(await page.calc('!document.querySelector(".calc-graph-pop").classList.contains("calc-graph-pop-below")'), t + 'over the point');
    await page.hover('.calc-graph-fn');
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden') && /^Point at the graph/.test(await page.calc(note)),
        t + 'the popup stays a while after the pointer leaves, and the line says what to do again', await page.calc(note));

    // the mouse on the popup keeps it; off it three and a half seconds, it goes
    await page.hover('.calc-graph-pop');
    await sleep(3800);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden'), t + 'the mouse on the popup keeps it');
    await page.hover('.calc-graph-fn');
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden'), t + 'the mouse off it: it stays a moment');
    await sleep(3800);
    check(await page.calc('document.querySelector(".calc-graph-pop").hidden'), t + 'and goes after three and a half seconds');
    await page.clickAt('.calc-graph-plot', 0, -3);
    await sleep(3800);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden'), t + 'after a click, the mouse left on the point, it stays');
    await page.hoverAt('.calc-graph-plot', 0.3, -3); // a few pixels: still there
    await sleep(3800);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden'), t + 'and when the mouse only trembles');
    await page.hoverAt('.calc-graph-plot', 2, -3);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden'), t + 'the mouse moved off the point: it stays a moment');
    await sleep(3800);
    check(await page.calc('document.querySelector(".calc-graph-pop").hidden'), t + 'and goes after three and a half seconds, as off the popup');
    await page.clickAt('.calc-graph-plot', 0, -3);
    await page.clickAt('.calc-graph-plot', 0, -3);
    check(await page.calc('document.querySelector(".calc-graph-pop").hidden'), t + 'a click on the point again closes it');

    // a zoom, by a button or the wheel, closes it at once
    await page.clickAt('.calc-graph-plot', 0, -3);
    await page.click('.calc-graph-zoom [data-zoom="in"]');
    check(await page.calc('document.querySelector(".calc-graph-pop").hidden'), t + 'zoom in closes it');
    await page.click('.calc-graph-zoom [data-zoom="home"]');
    await page.clickAt('.calc-graph-plot', 0, -3);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden'), t + 'open again');
    await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: (await page.at('.calc-graph-plot'))[0] - 100, y: (await page.at('.calc-graph-plot'))[1] + 60,
        deltaX: 0, deltaY: -100 }); // off the popup, which is over the middle
    await sleep(100);
    check(await page.calc('document.querySelector(".calc-graph-pop").hidden'), t + 'the wheel closes it');
    await page.click('.calc-graph-zoom [data-zoom="home"]');
    await page.clickAt('.calc-graph-plot', 0, -3); // the popup back, then the point away with its tangent
    await page.clickAt('.calc-graph-plot', 0, -3);
    check(await page.calc('document.querySelector(".calc-graph-pop").hidden'), t + 'a second click takes the point away');

    // at its root √3, x² – 3 has the slope 2√3; the tangent is dashed through the root, and below the curve at 0.8
    plain = await page.calc(dashes(0.8, 2 * Math.sqrt(3) * (0.8 - Math.sqrt(3))));
    await page.clickAt('.calc-graph-plot', Math.sqrt(3), 0);
    check(/^Root\s*x = 1\.732050807569\s*y = 0\s*Slope = 3\.464101615$/.test(await page.calc(pop)), t + 'the slope at the root', await page.calc(pop));
    check(plain === 0 && await page.calc(dashes(0.8, 2 * Math.sqrt(3) * (0.8 - Math.sqrt(3)))) > 0, t + 'and the tangent there',
        plain + ' / ' + await page.calc(dashes(0.8, 2 * Math.sqrt(3) * (0.8 - Math.sqrt(3)))));
    await page.hover('.calc-graph-fn');
    await sleep(3800);
    check(await page.calc('document.querySelector(".calc-graph-pop").hidden') &&
        await page.calc(dashes(0.8, 2 * Math.sqrt(3) * (0.8 - Math.sqrt(3)))) > 0, t + 'the popup goes, the tangent stays');
    await page.clickAt('.calc-graph-plot', Math.sqrt(3), 0);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden'), t + 'a click on the point brings the popup back');
    await page.hover('.calc-graph-pop-row[data-put="m"]');
    check(await page.until('/^Insert the slope/.test(document.querySelector(".calc-tip").textContent)', 2000), t + 'the slope has its tip');
    await page.click('.calc-graph-pop-row[data-put="m"]');
    check(!await open(page, '.calc-graph') && Math.abs(await value(page) - 3.464101615) < 1e-9, t + 'a click on it puts it into the display',
        await shown(page));
    await page.click('.calc-graph-btn');
    check(await page.calc(dashes(0.8, 2 * Math.sqrt(3) * (0.8 - Math.sqrt(3)))) === 0, t + 'no tangent once the point goes');

    // ∫, then a drag along x² – 3 from near its root -√3 to near √3: the ends go to the roots, the area
    // between, -4√3, is shaded, and its popup opens as the drag ends; the view has not moved
    await page.hover('.calc-graph-zoom [data-zoom="area"]');
    check(await page.until('/^Area under a curve/.test(document.querySelector(".calc-tip").textContent)', 2000), t + 'the ∫ button has its tip');
    await page.click('.calc-graph-zoom [data-zoom="area"]');
    check(await page.calc('document.querySelector("[data-zoom=area]").classList.contains("calc-on")') &&
        /^Drag along a curve/.test(await page.calc(note)), t + '∫ pressed, the line says to drag', await page.calc(note));
    check(await page.calc(shade(0, -1.5)) === 0, t + 'no area yet');
    await page.dragAt('.calc-graph-plot', -1.75, -0.5, 1.7, 0.5);
    check(/^Area under the curve\s*From x = -1\.732050807569\s*To x = 1\.732050807569\s*Area = -6\.92820323$/.test(await page.calc(pop)),
        t + 'a drag from root to root: the area under x² – 3, -4√3', await page.calc(pop));
    check(await page.calc(shade(0, -1.5)) > 10 && await page.calc(shade(-2.5, 1)) === 0, t + 'shaded between the roots, and not past them',
        await page.calc(shade(0, -1.5)) + ' / ' + await page.calc(shade(-2.5, 1)));
    check(await page.calc('document.querySelector("[data-zoom=area]").classList.contains("calc-on")') &&
        await page.calc('JSON.parse(localStorage.getItem("graph")).view') === null, t + 'the ∫ button stays pressed, for another, and the view did not move');
    await page.hover('.calc-graph-fn');
    await sleep(3800);
    check(await page.calc('document.querySelector(".calc-graph-pop").hidden') && await page.calc(shade(0, -1.5)) > 10,
        t + 'the popup goes, the area stays');
    await page.clickAt('.calc-graph-plot', 0, -1.5);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden'), t + 'a click on the area brings its popup back');

    // the box of an end has a tip of its own, to type it
    await page.hover('.calc-graph-pop-end[data-end="a"]');
    check(await page.until('/^Type the start/.test(document.querySelector(".calc-tip").textContent)', 2000), t + 'the box of an end has its tip',
        await page.calc('JSON.stringify([document.querySelector(".calc-tip").textContent, document.querySelector(".calc-tip").hidden, !!document.querySelector(".calc-graph-pop-end[data-end=a]"), document.querySelector(".calc-graph-pop").hidden, document.activeElement && document.activeElement.className])'));

    // its ends typed: from 0 to 1, -8/3; an end not past the other is marked and not taken; Esc
    // goes back to the plot, the popup staying with the ends as they are
    await page.click('.calc-graph-pop-end[data-end="a"]');
    await page.calc('(function (b) { b.value = "0"; b.dispatchEvent(new Event("input", { bubbles: true })); })(document.querySelector(".calc-graph-pop-end[data-end=a]"))');
    await page.calc('(function (b) { b.focus(); b.value = "1"; b.dispatchEvent(new Event("input", { bubbles: true })); })(document.querySelector(".calc-graph-pop-end[data-end=b]"))');
    await sleep(100);
    check(/^Area under the curve\s*From x = 0\s*To x = 1\s*Area = -2\.666666667$/.test(await page.calc(pop)) &&
        await page.calc(shade(0.5, -1.5)) > 10 && await page.calc(shade(-0.5, -1.5)) === 0 && await open(page, '.calc-graph'),
        t + 'the ends typed: the area from 0 to 1', await page.calc(pop) + ' / ' + await page.calc(shade(-0.5, -1.5)));
    await page.calc('(function (b) { b.value = "-1"; b.dispatchEvent(new Event("input", { bubbles: true })); })(document.activeElement)');
    check(await page.calc('document.activeElement.classList.contains("calc-bad")') && /Area = -2\.666666667$/.test(await page.calc(pop)),
        t + 'an end not past the other is marked, and not taken');
    await page.key('Escape', 27);
    await sleep(100);
    check(await page.calc('!document.querySelector(".calc-graph-pop").hidden && document.activeElement.tagName !== "INPUT"') &&
        /To x = 1\s*Area/.test(await page.calc(pop)), t + 'Esc goes back to the plot, the ends as they are', await page.calc(pop));

    // Esc lets ∫ go, and Esc again takes the area away
    await page.key('Escape', 27);
    check(!await page.calc('document.querySelector("[data-zoom=area]").classList.contains("calc-on")') && await page.calc(shade(0.5, -1.5)) > 10,
        t + 'Esc lets the ∫ button go, the area staying');
    await page.key('Escape', 27);
    check(await page.calc(shade(0.5, -1.5)) === 0, t + 'and Esc again takes the area away');

    // a drag from near 0.5 to near -1 ends at 0.5 and -1, round numbers, not where the pointer was to a pixel
    await page.click('.calc-graph-zoom [data-zoom="area"]');
    await page.hoverAt('.calc-graph-plot', 0.53, -1);
    check(/^From x = 0\.5\s*Drag to where it ends$/.test((await page.calc(note)).trim()), t + 'pointed at with ∫ pressed: where the area would start, 0.5',
        await page.calc(note));
    await page.dragAt('.calc-graph-plot', 0.53, -1, -0.97, -0.5);
    check(/From x = -1\s*To x = 0\.5\s*Area = -4\.125$/.test(await page.calc(pop)), t + 'the ends of a drag are round numbers', await page.calc(pop));
    await page.click('.calc-graph-pop-row[data-put="s"] svg');
    check(!await open(page, '.calc-graph') && Math.abs(await value(page) + 4.125) < 1e-8, t + 'the area goes into the display',
        await shown(page));
    await page.click('.calc-graph-btn');
    check(await page.calc(shade(0, -1.5)) === 0, t + 'no area once it is put in');

    // without ∫ a drag moves the view, as before
    await page.dragAt('.calc-graph-plot', 0, -1.5, 2, -1.5);
    check(await page.calc(shade(2, -1.5)) === 0 && await page.calc('!!JSON.parse(localStorage.getItem("graph")).view'), t + 'a drag without ∫ moves the view');
    await page.click('.calc-graph-zoom [data-zoom="home"]');

    // the arrow keys trace the point clicked: → along the curve, ← back stops at the low on the way
    await page.clickAt('.calc-graph-plot', 0, -3);
    plain = await page.calc('document.querySelector(".calc-display").textContent');
    await page.key('ArrowRight', 39);
    await page.key('ArrowRight', 39);
    check(/^On the curve\s*x = 0\.\d+\s*y = -2\.9\d*\s*Slope = 0\.\d+$/.test(await page.calc(pop)), t + '→ moves the point along the curve',
        await page.calc(pop));
    check(await page.calc('document.querySelector(".calc-display").textContent') === plain, t + 'and not the cursor of the display');
    for (var press = 0; press < 2; press++) await page.key('ArrowLeft', 37);
    check(/^Min, y-intercept\s*x = 0\s*y = -3/.test(await page.calc(pop)), t + '← back stops at the low', await page.calc(pop));
    await page.key('ArrowUp', 38);
    check(/^Min, y-intercept/.test(await page.calc(pop)), t + '↑ with no curve above stays');
    for (press = 0; press < 12; press++) {
        await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, modifiers: 8 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, modifiers: 8 });
    }
    await sleep(500);
    check(/^(On the curve|Root)\s*x = (\d+\.\d+)/.test(await page.calc(pop)) && await page.calc('!document.querySelector(".calc-graph-pop").hidden') &&
        await page.calc('!!JSON.parse(localStorage.getItem("graph")).view'), t + 'Shift goes farther, the view moving to keep the point in', await page.calc(pop));
    await page.key('Escape', 27); // the popup off the buttons first
    await page.click('.calc-graph-zoom [data-zoom="home"]');

    // a second curve, in its own color; where the two cross is marked: x² – 3 = x + 3 at 3, where y = 6
    // (and at -2, where y = 1)
    await page.click('.calc-graph-fn:nth-child(2) input');
    await page.type('x+3');
    check(await page.calc('(function (c) { var d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, n = 0, i;' +
        ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0xb0) < 24 && Math.abs(d[i + 1] - 0x41) < 24 && Math.abs(d[i + 2] - 0x4d) < 24) n++;' +
        ' return n; })(document.querySelector(".calc-graph-plot canvas"))') > 200, t + 'the second curve is drawn in red');
    await page.hoverAt('.calc-graph-plot', 3, 6);
    check(/^Crossing\s*x = 3\s*y = 6/.test(await page.calc(note)), t + 'pointing near their crossing shows it', await page.calc(note));
    await page.clickAt('.calc-graph-plot', 3, 6);
    check(/^Crossing\s*x = 3\s*y = 6$/.test(await page.calc(pop)), t + 'and a click, its popup', await page.calc(pop));
    await page.key('ArrowLeft', 37);
    check(/^On the curve\s*x = 2\.\d+\s*y = 5\.\d+/.test(await page.calc(pop)), t + 'from a crossing ← goes on along one of its curves', await page.calc(pop));
    traced = 'parseFloat(/x = ([\\d.]+)/.exec(' + pop + ')[1])';
    await page.key('ArrowUp', 38);
    check(/^On the curve/.test(await page.calc(pop)) && await page.calc('(function (x) { return Math.abs(/y = ([\\d.]+)/.exec(' + pop + ')[1] - (x + 3)) < 1e-9; })(' + traced + ')'),
        t + '↑ goes to the curve above at the same x, x + 3', await page.calc(pop));
    await page.key('ArrowDown', 40);
    check(await page.calc('(function (x) { return Math.abs(/y = ([\\d.]+)/.exec(' + pop + ')[1] - (x * x - 3)) < 1e-3; })(' + traced + ')'),
        t + 'and ↓ back to x² – 3', await page.calc(pop));

    // ∫ and a drag between them, from near one crossing to the other: the area between, 125/6
    await page.key('Escape', 27);
    await page.click('.calc-graph-zoom [data-zoom="area"]');
    await page.dragAt('.calc-graph-plot', -1.9, 0.85, 2.95, 5.5);
    check(/^Area between the curves\s*From x = -2\s*To x = 3\s*Area = 20\.83333333$/.test(await page.calc(pop)) &&
        await page.calc('document.querySelectorAll(".calc-graph-pop .calc-graph-swatch").length') === 2,
        t + 'a drag between two curves: the area between them', await page.calc(pop));
    red = [0xb0, 0x41, 0x4d]; // the color of the curve above where the drag began
    check(await page.calc(shade(0, 1, red)) > 10 && await page.calc(shade(0, -2.5, red)) > 10 && await page.calc(shade(0, 4, red)) === 0,
        t + 'shaded from one curve to the other, across the axis', await page.calc(shade(0, 1, red)) + ' / ' + await page.calc(shade(0, 4, red)));
    await page.key('Escape', 27); // ∫ let go
    await page.key('Escape', 27); // the area away
    await page.clickAt('.calc-graph-plot', 3, 6);
    await page.click('.calc-graph-pop-row[data-put="y"]');
    check(!await open(page, '.calc-graph') && await value(page) === 6, t + 'a click on its y puts it into the display', await shown(page));

    // away from the curves the pointer is the system's cross, and the plot draws none of its own;
    // a click is on the place itself: its x and y, to a pixel, and the plot's cross there
    await page.click('.calc-graph-btn');
    plain = await page.calc(cross); // what is there before
    await page.hoverAt('.calc-graph-plot', -5, 5);
    check(await page.calc('getComputedStyle(document.querySelector(".calc-graph-plot canvas")).cursor') === 'crosshair' &&
        await page.calc(cross) === plain, t + 'pointing off the curves: the crosshair pointer, no cross drawn', plain + ' / ' + await page.calc(cross));
    await page.clickAt('.calc-graph-plot', -5, 5);
    check(await page.calc(cross) > plain + 10, t + 'a click there draws the cross', plain + ' / ' + await page.calc(cross));
    check(/^Point\s*x = -(5|4\.9\d|5\.0\d)\s*y = (5|4\.9\d|5\.0\d)$/.test(await page.calc(pop)), t + 'a click off the curves: the place', await page.calc(pop));
    await page.key('Escape', 27);
    check(await open(page, '.calc-graph') && await page.calc('document.querySelector(".calc-graph-pop").hidden'),
        t + 'Esc closes the popup first, the graph stays open');
    await page.clickAt('.calc-graph-plot', -5, 5);
    await page.click('.calc-graph-pop-row[data-put="x"]');
    check(Math.abs(await value(page) + 5) < 0.05, t + 'its x goes into the display', await shown(page));

    // the function and the zoom are kept; home goes back to the start
    await page.click('.calc-graph-btn');
    await page.click('.calc-graph-zoom [data-zoom="in"]');
    check(await page.calc('Math.round(JSON.parse(localStorage.getItem("graph")).view.ux * ' +
        'document.querySelector(".calc-graph-plot").clientWidth)') === 10, t + 'zoomed in, x is 10 wide');
    await page.go(page.base + at);
    await page.click('.calc-graph-btn');
    check(await page.calc('document.querySelector(".calc-graph-input").value') === 'x^2-3' &&
        await page.calc('document.querySelectorAll(".calc-graph-input")[1].value') === 'x+3' &&
        await page.calc('!!JSON.parse(localStorage.getItem("graph")).view'), t + 'the function and the view are kept');
    await page.click('.calc-graph-zoom [data-zoom="home"]');
    check(await page.calc('JSON.parse(localStorage.getItem("graph")).view') === null, t + 'home goes back to the start');

    // the view typed: its boxes show the view, and set it as they are typed in; a pair the wrong way is marked
    var ends = 'Array.prototype.map.call(document.querySelectorAll(".calc-graph-window input"), function (b) { return b.value; }).join(" ")';
    await page.click('.calc-graph-zoom [data-zoom="window"]');
    check(await page.calc('!document.querySelector(".calc-graph-window").hidden') && /^-10 10 -\d+(\.\d+)? \d+(\.\d+)?$/.test(await page.calc(ends)) &&
        await page.calc('document.activeElement.className') === 'calc-graph-x0', t + 'the frame opens the view typed, as it is, x from -10 to 10', await page.calc(ends));
    await page.type('0');
    await page.click('.calc-graph-x1');
    await page.calc('document.querySelector(".calc-graph-x1").select()');
    await page.type('5');
    await page.click('.calc-graph-y0');
    await page.calc('document.querySelector(".calc-graph-y0").select()');
    await page.type('-1');
    await page.click('.calc-graph-y1');
    await page.calc('document.querySelector(".calc-graph-y1").select()');
    await page.type('2');
    await sleep(400);
    check(await page.calc('(function (v, p) { return Math.abs(v.x - 2.5) < 1e-9 && Math.abs(v.ux * p.clientWidth - 5) < 1e-9 &&' +
        ' Math.abs(v.y - 0.5) < 1e-9 && Math.abs(v.uy * p.clientHeight - 3) < 1e-9; })(JSON.parse(localStorage.getItem("graph")).view,' +
        ' document.querySelector(".calc-graph-plot"))'), t + 'x from 0 to 5 and y from -1 to 2 set the view, and it is kept');
    await page.click('.calc-graph-x1');
    await page.calc('document.querySelector(".calc-graph-x1").select()');
    await page.type('-3');
    check(await page.calc('document.querySelector(".calc-graph-x0").parentNode.classList.contains("calc-bad")') &&
        await page.calc('Math.abs(JSON.parse(localStorage.getItem("graph")).view.x - 2.5) < 1e-9'), t + 'x to below x from is marked, the view stays');
    await page.key('Escape', 27);
    check(await open(page, '.calc-graph') && await page.calc('document.querySelector(".calc-graph-window").hidden'), t + 'Esc closes the boxes, not the graph');
    await page.click('.calc-graph-zoom [data-zoom="window"]');
    check(await page.calc(ends) === '0 5 -1 2', t + 'open again, they show the view, the wrong pair as it was', await page.calc(ends));
    await page.key('Enter', 13);
    check(await page.calc('document.querySelector(".calc-graph-window").hidden'), t + 'Enter closes them');
    await page.click('.calc-graph-zoom [data-zoom="window"]');
    await page.click('.calc-graph-zoom [data-zoom="in"]');
    check(await page.calc(ends) === '1.25 3.75 -0.25 1.25', t + 'they follow a zoom', await page.calc(ends));
    await page.click('.calc-graph-zoom [data-zoom="window"]');
    await page.click('.calc-graph-zoom [data-zoom="home"]');

    // Esc, with the focus off the boxes, closes the view's boxes and lets go of the area button before the graph
    await page.click('.calc-graph-zoom [data-zoom="window"]');
    await page.click('.calc-graph-zoom [data-zoom="area"]');
    await page.click('.calc-graph-note');
    await page.key('Escape', 27);
    check(await open(page, '.calc-graph') && await page.calc('document.querySelector(".calc-graph-window").hidden') &&
        await page.calc('document.querySelector("[data-zoom=area]").classList.contains("calc-on")'), t + 'Esc closes the boxes of the view first');
    await page.key('Escape', 27);
    check(await open(page, '.calc-graph') && !await page.calc('document.querySelector("[data-zoom=area]").classList.contains("calc-on")'),
        t + 'then lets go of the area button');

    // y′ draws the slope of a curve, dashed: 2x for x² – 3, through x = 1, y = 2; kept, and taken away again
    check(await page.calc(dashes(1, 2)) === 0 && await page.calc('getComputedStyle(document.querySelector(".calc-graph-fn:nth-child(3) .calc-graph-diff")).display') === 'none',
        t + 'no slope drawn, and no y′ for an empty box');
    await page.hover('.calc-graph-diff');
    check(await page.until('/^Draw the slope/.test(document.querySelector(".calc-tip").textContent)', 2000), t + 'y′ has its tip');
    await page.click('.calc-graph-diff');
    check(await page.calc(dashes(1, 2)) > 0 && await page.calc(dashes(-2, -4)) > 0 &&
        await page.calc('document.querySelector(".calc-graph-diff").classList.contains("calc-on")'), t + 'y′ draws the slope of x² – 3, 2x');
    check(await page.calc('JSON.parse(localStorage.getItem("graph")).d.join()') === 'true,false', t + 'and it is kept');
    await page.click('.calc-graph-diff');
    check(await page.calc(dashes(1, 2)) === 0, t + 'a click again takes it away');

    // d/dx before a function draws its slope, 2x for x², without a slider for d
    await page.click('.calc-graph .calc-past-clear');
    await page.calc('(function (b) { b.value = "d/dx(x^2)"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelector(".calc-graph-input"))'); // as pasted: ( typed here is the key code of ↓
    await sleep(900);
    check(await page.calc('document.querySelector(".calc-graph-sliders").hidden') && await page.calc(dashes(1, 2)) > 0 &&
        await page.calc(dashes(1, -2)) === 0, t + 'd/dx(x^2) is drawn as 2x, with no slider', await page.calc(note));

    // an equation of x and y is drawn where its two sides are equal: the circle x² + y² = 25 through
    // (3, 4) and (0, -5), and not at the middle; x = 3 upright through (3, -6)
    await page.click('.calc-graph .calc-past-clear');
    await page.calc('(function (b) { b.value = "x^2+y^2=25"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelector(".calc-graph-input"))');
    await sleep(300);
    check(!await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")') &&
        await page.calc(dashes(3, 4)) > 0 && await page.calc(dashes(0, -5)) > 0 && await page.calc(dashes(0, 0)) === 0 &&
        await page.calc('getComputedStyle(document.querySelector(".calc-graph-fn .calc-graph-diff")).display') === 'none',
        t + 'x² + y² = 25 is drawn, a circle, without a y′', await page.calc(note));
    await page.calc('(function (b) { b.value = "x=3"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelector(".calc-graph-input"))');
    await sleep(300);
    check(await page.calc(dashes(3, -6)) > 0 && await page.calc(dashes(3, 6)) > 0 && await page.calc(dashes(1, 0)) === 0, t + 'x = 3 is an upright line');
    await page.calc('(function (b) { b.value = "x^2+y^2=r^2"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelector(".calc-graph-input"))');
    await sleep(900);
    check(await page.calc('!!document.querySelector(".calc-graph-slider[data-k=r]")'), t + 'its letters have sliders');

    // pointed at and clicked as a curve is: where it meets the axes marked, a place on it with its
    // slope, -3/4 at (3, 4), traced by → round the circle, and x = 3 straight up, with no slope
    await page.calc('(function (b) { b.value = "x^2+y^2=25"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelector(".calc-graph-input"))');
    await sleep(300);
    await page.hoverAt('.calc-graph-plot', 5.05, 0.1);
    check(/^x-intercept\s*x = 5\s*y = 0$/.test((await page.calc(note)).trim()), t + 'where the circle meets the x axis is marked', await page.calc(note));
    await page.hoverAt('.calc-graph-plot', 0.1, -5.05);
    check(/^y-intercept\s*x = 0\s*y = -5$/.test((await page.calc(note)).trim()), t + 'and the y axis', await page.calc(note));
    await page.hoverAt('.calc-graph-plot', -2.9, 4.2);
    check(await page.calc('(function (m) { return !!m && Math.abs(m[1] * m[1] + m[2] * m[2] - 25) < 1e-9; })(/On the curve\\s*x = (\\S+)\\s*y = (\\S+)/' +
        '.exec(document.querySelector(".calc-graph-note").textContent.replace(/\u2013|\u2212/g, "-")))'), t + 'pointed at: a place on the circle', await page.calc(note));
    await page.clickAt('.calc-graph-plot', 3, 4);
    check(/^On the curve\s*x = 3\s*y = 4\s*Slope = -0\.75$/.test(await page.calc(pop)), t + 'clicked: (3, 4), its slope -3/4', await page.calc(pop));
    await page.key('ArrowRight', 39);
    check(await page.calc('(function (m) { return !!m && +m[1] > 3 && +m[2] < 4 && Math.abs(m[1] * m[1] + m[2] * m[2] - 25) < 1e-9; })(/x = ([-\\d.]+)\\s*y = ([-\\d.]+)/' +
        '.exec(document.querySelector(".calc-graph-pop").textContent.replace(/\u2013|\u2212/g, "-")))'), t + '→ traces it round the circle', await page.calc(pop));
    for (i = 0; i < 40 && !/x-intercept/.test(await page.calc(pop)); i++) await page.key('ArrowRight', 39);
    check(/^x-intercept\s*x = 5\s*y = 0/.test(await page.calc(pop)), t + 'and stops where it meets the x axis', await page.calc(pop));
    await page.key('ArrowRight', 39);
    await page.key('ArrowRight', 39);
    check(/x = 4\.\d+\s*y = [-–−]0\.\d+/.test(await page.calc(pop)), t + 'then goes on round below it, not back up', await page.calc(pop));
    await page.key('Escape', 27);
    await page.calc('(function (b) { b.value = "x=3"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelector(".calc-graph-input"))');
    await sleep(300);
    await page.clickAt('.calc-graph-plot', 3.05, 2);
    check(/^On the curve\s*x = 3\s*y = 2$/.test(await page.calc(pop)), t + 'x = 3 clicked: straight up, no slope', await page.calc(pop));
    await page.key('ArrowRight', 39);
    check(/x = 3\s*y = 2\.\d+$/.test(await page.calc(pop)), t + '→ goes up it', await page.calc(pop));
    await page.key('Escape', 27);

    // an inequality is shaded where it is true: y < x² – 3 below the curve, not above it; x² + y² ≤ 9 inside
    await page.calc('(function (b) { b.value = "y<x^2-3"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelector(".calc-graph-input"))');
    await sleep(300);
    check(!await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")') &&
        await page.calc(shade(0, -5)) > 10 && await page.calc(shade(6, 0)) > 10 && await page.calc(shade(0, 0)) === 0,
        t + 'y < x² – 3 is shaded below its curve', await page.calc(shade(0, -5)) + ' / ' + await page.calc(shade(0, 0)));
    await page.calc('(function (b) { b.value = "x^2+y^2<=9"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelector(".calc-graph-input"))');
    await sleep(300);
    check(await page.calc(shade(0, 0)) > 10 && await page.calc(shade(1, -1.5)) > 10 && await page.calc(shade(4, 4)) === 0 &&
        await page.calc(dashes(3, 0)) > 0, t + 'x² + y² ≤ 9 is shaded inside its circle, and the circle drawn');

    // a polar curve, drawn and pointed at, its θ in the popup; a parametric one, where it meets an
    // axis marked and → tracing it on; points, with their best fit; two inequalities at once; two
    // equations crossing; and the area of a region inside an equation
    function typeIn(text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
            '(document.querySelector(".calc-graph-input"))');
    }
    await typeIn('r=2sin(3θ)');
    await sleep(300);
    check(!await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")') && await page.calc(dashes(Math.sqrt(3), 1)) > 0,
        t + 'r = 2sin(3θ) is drawn, through (√3, 1)');
    await page.clickAt('.calc-graph-plot', Math.sqrt(3), 1);
    check(/^On the curve\s*θ = 0\.52\d*\s*x = 1\.73\d*\s*y = (1|0\.99\d*|1\.00\d*)\s*Slope = /.test(await page.calc(pop)), t + 'clicked: its θ, x, y and slope', await page.calc(pop));
    await page.key('Escape', 27);
    await typeIn('(6cos(t),3sin(t))');
    await sleep(300);
    check(await page.calc(dashes(6, 0)) > 0 && await page.calc(dashes(0, 3)) > 0 && await page.calc(dashes(0, 0)) === 0, t + '(6cos t, 3sin t) is an ellipse');
    await page.hoverAt('.calc-graph-plot', 6.05, 0.1);
    check(/^x-intercept\s*x = 6\s*y = 0$/.test((await page.calc(note)).trim()), t + 'where it meets the x axis is marked', await page.calc(note));
    await page.clickAt('.calc-graph-plot', 0, 3);
    await page.key('ArrowRight', 39);
    check(/t = 1\.\d+\s*x = -0\.\d+\s*y = 2\.99\d*/.test(await page.calc(pop)), t + '→ traces it on, t growing', await page.calc(pop));
    await page.key('Escape', 27);
    await typeIn('(1,2),(2,4.1),(3,5.9)');
    await sleep(300);
    check(await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-graph-data") && ' +
        'document.querySelector(".calc-graph-diff").textContent === "fit"'), t + 'points: fit in place of y′');
    await page.hoverAt('.calc-graph-plot', 2.05, 4.05);
    check(/^Data point\s*x = 2\s*y = 4\.1$/.test((await page.calc(note)).trim()), t + 'a point pointed at', await page.calc(note));
    check(await page.calc(dashes(0, 0.1)) === 0, t + 'no line until fit');
    await page.click('.calc-graph-diff');
    check(await page.calc(dashes(-3, -5.75)) > 0 && await page.calc('JSON.parse(localStorage.getItem("graph")).d[0]') === 'lin',
        t + 'fit draws the line nearest them, y = 1.95x + 0.1, and is kept');
    await page.hoverAt('.calc-graph-plot', -3, -5.75);
    check(/^Best fit, r² = 0\.998\s*x = /.test((await page.calc(note)).trim()), t + 'the line pointed at: its r²', await page.calc(note));
    await page.clickAt('.calc-graph-plot', 1, 2);
    await page.key('ArrowRight', 39);
    check(/^Data point\s*x = 2\s*y = 4\.1/.test(await page.calc(pop)), t + '→ goes to the next point', await page.calc(pop));
    await page.key('Escape', 27);
    await page.click('.calc-graph-diff');
    check(await page.calc(diff) === 'quad' && await page.calc('JSON.parse(localStorage.getItem("graph")).d[0]') === 'quad' &&
        await page.calc(dashes(-1, -3.1)) > 0 && await page.calc(dashes(-1, -1.85)) === 0, t + 'fit again: the parabola through them, not the line');
    for (i of ['exp', 'pow', 'log', 'fit']) await page.click('.calc-graph-diff'), found.push(await page.calc(diff));
    check(found.join() === 'exp,pow,log,fit' && await page.calc('JSON.parse(localStorage.getItem("graph")).d[0]') === false &&
        await page.calc(dashes(-1, -3.1)) === 0, t + 'then aˣ, a power, ln x and none', found.join());
    await typeIn('(1,-1),(2,3)');
    await page.click('.calc-graph-diff');
    await page.click('.calc-graph-diff');
    check(await page.calc(note) === 'No quadratic fit: it needs three x or more.' &&
        await page.calc('document.querySelector(".calc-graph-diff").classList.contains("calc-bad")'), t + 'a fit the points cannot have says so', await page.calc(note));
    await typeIn('1<x<=3');
    await sleep(300);
    check(await page.calc(shade(2, 0)) > 10 && await page.calc(shade(4, 0)) === 0 && await page.calc(shade(0, 0)) === 0, t + '1 < x ≤ 3 is shaded between');
    await typeIn('x^2+y^2=25');
    await page.click('.calc-graph-add');
    await page.calc('(function (b) { b.value = "x^2-y^2=7"; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
        '(document.querySelectorAll(".calc-graph-input")[1])');
    await sleep(300);
    await page.hoverAt('.calc-graph-plot', 4.05, 3.05);
    check(/^Crossing\s*x = 4\s*y = 3$/.test((await page.calc(note)).trim()), t + 'two equations cross: marked', await page.calc(note));
    await page.click('.calc-graph-zoom [data-zoom="area"]');
    await page.dragAt('.calc-graph-plot', -4.97, 0.5, 4.97, 0.5);
    check(/^Area of the region\s*From x = -5\s*To x = 5\s*Area = 78\.53981634$/.test(await page.calc(pop)) && await page.calc(shade(0, -4)) > 10,
        t + 'the area inside the circle, 25π', await page.calc(pop));
    await page.key('Escape', 27);
    await page.click('.calc-graph-fn:nth-child(2) .calc-graph-del');

    // a function named, and others using it: f′(x) in another box; a box using one below it; a name given twice
    function setBox(n, text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
            '(document.querySelectorAll(".calc-graph-input")[' + n + '])');
    }
    await typeIn('f(x)=x^2-3');
    await page.click('.calc-graph-add');
    await setBox(1, "f'(x)");
    await sleep(300);
    check(await page.calc('getComputedStyle(document.querySelector(".calc-graph-fn > span:not([class])")).display') === 'none' &&
        await page.calc(dashes(2, 1)) > 0 && !await page.calc('document.querySelector(".calc-graph-fn.calc-bad")'),
        t + 'f(x) = x² – 3 is drawn, without y = before it');
    await page.hoverAt('.calc-graph-plot', 1, 2.05);
    check(/^On the curve\s*x = 1\s*y = 2$/.test((await page.calc(note)).trim()), t + "f′(x) in another box is 2x", await page.calc(note));
    await typeIn('g(x)+1');
    await setBox(1, 'g(x)=x/2');
    await sleep(300);
    await page.hoverAt('.calc-graph-plot', 2, 2.05);
    check(!await page.calc('document.querySelector(".calc-graph-fn.calc-bad")') && /^On the curve\s*x = 2\s*y = 2$/.test((await page.calc(note)).trim()),
        t + 'g(x) + 1 above g(x) = x/2', await page.calc(note));
    await typeIn('g(x)=2x');
    await sleep(300);
    check(await page.calc(note) === 'g(x) is named twice: give each function its own letter.', t + 'a name twice says so', await page.calc(note));
    await page.click('.calc-graph-fn:nth-child(2) .calc-graph-del');

    // kept to where inequalities hold, and in pieces; where a curve bends the other way
    await typeIn('x^2 {0<x<2}');
    await sleep(300);
    check(await page.calc(dashes(1, 1)) > 0 && await page.calc(dashes(-1, 1)) === 0, t + 'x² {0 < x < 2} only there');
    await typeIn('{x<0: -x, x^2}');
    await sleep(300);
    check(await page.calc(dashes(-2, 2)) > 0 && await page.calc(dashes(2, 4)) > 0 && await page.calc(dashes(-2, 4)) === 0,
        t + '{x < 0: –x, x²} in two pieces');
    await typeIn('x^3-3x^2');
    await sleep(300);
    await page.hoverAt('.calc-graph-plot', 1.05, -2.05);
    check(/^Inflection point\s*x = 1\s*y = -2$/.test((await page.calc(note)).trim()), t + 'x³ – 3x² bends the other way at (1, –2)', await page.calc(note));

    // points typed in a table: the box is written as they are, a row more each time
    await typeIn('');
    await page.click('.calc-graph-points');
    check(await page.calc('!document.querySelector(".calc-graph-cells").hidden && document.activeElement === ' + cells + '[0]'),
        t + 'an empty box opens a table of points');
    await page.type('1');
    await page.calc(cells + '[1].focus()');
    await page.type('2\r4');
    await page.calc(cells + '[2].focus()');
    await page.type('3');
    await sleep(300);
    check(await page.calc('document.querySelector(".calc-graph-input").value') === '(1, 2), (3, 4)' && await page.calc(cells + '.length') === 6 &&
        await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-graph-data")') && await page.calc(dashes(3, 4)) > 0,
        t + 'the points typed are written in the box and drawn', await page.calc('document.querySelector(".calc-graph-input").value'));
    await page.key('Escape', 27);
    check(await page.calc('document.querySelector(".calc-graph-cells").hidden && document.activeElement.className === "calc-graph-input"') &&
        await open(page, '.calc-graph'), t + 'Esc puts the table away, back to the box');
    await page.click('.calc-graph-points');
    check(await page.calc('[].map.call(' + cells + ', function (c) { return c.value; }).join()') === '1,2,3,4,,', t + 'opened again, with its points');
    await page.key('Escape', 27);

    // the examples: a tab of them by group, found by a search, each drawn after the boxes typed,
    // with its sliders; in place of them all when there is not room
    function boxes() {
        return page.calc('[].map.call(document.querySelectorAll(".calc-graph-fn:not([hidden]) .calc-graph-input"), function (b) { return b.value; }).join(" | ")');
    }
    await page.click('.calc-graph-tab[data-tab="examples"]');
    check(await page.calc('!document.querySelector(".calc-graph-examples").hidden && !document.querySelector(".calc-graph-plot").offsetWidth && ' +
        'getComputedStyle(document.querySelector(".calc-graph-fns")).display === "none" && document.activeElement.classList.contains("calc-graph-search")') &&
        await page.calc('document.querySelectorAll(".calc-graph-ex-list .calc-gx-cat").length') >= 9, t + 'examples: a tab of them, by group, with a search');
    await page.type('cardioid');
    check(await page.calc('document.querySelectorAll(".calc-graph-ex-list .calc-gx-item").length') === 1, t + 'examples: the search finds one');
    await page.type('\r');
    await sleep(300);
    await page.hoverAt('.calc-graph-plot', 4.05, 0.05);
    check(await boxes() === 'r = 2 + 2cos(θ)' && await page.calc('document.querySelector(".calc-graph-plot").offsetWidth') &&
        /^x-intercept\s*x = 4\s*y = 0$/.test((await page.calc(note)).trim()), t + 'examples: Enter draws it in place of the points', await boxes());
    await page.click('.calc-graph-tab[data-tab="examples"]');
    await page.type('vertex\r');
    await sleep(300);
    check(await boxes() === 'a(x - h)^2 + k' &&
        await page.calc('document.querySelector(".calc-graph-slider[data-k=h] .calc-graph-val input").value') === '2',
        t + 'examples: with its sliders set', await boxes());
    await page.click('.calc-graph-tab[data-tab="examples"]');
    await page.type('stretched');
    await page.click('.calc-graph-ex-list .calc-gx-row');
    await sleep(300);
    check(await boxes() === 'g(x) = sin(x) | g(2x) | 2g(x)' && !await page.calc('document.querySelector(".calc-graph-slider")'),
        t + 'examples: a click draws one, its boxes only, the sliders before gone', await boxes());

    // what is not a function says so, and draws nothing
    await page.click('.calc-graph .calc-past-clear');
    await page.click('.calc-graph-zoom [data-zoom="in"]');
    await page.click('.calc-graph .calc-past-clear');
    check(await page.calc('document.querySelectorAll(".calc-graph-fn:not([hidden])").length') === 1 &&
        await page.calc('JSON.parse(localStorage.getItem("graph")).view') === null, t + 'Clear leaves one box, and the view as at first');
    await page.type('x+');
    check(/^Not a function of x/.test(await page.calc(note)) && await page.calc(ink) === 0 &&
        await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")'), t + 'x + is not a function yet',
        await page.calc(note));
    await page.key('Escape', 27);
    check(!await open(page, '.calc-graph'), t + 'Esc closes the graph');
}

// The big graph: in the extension it has a window of its own, popup.html?graph,
// with only the graph, which keeps up with the calculator
// The solver: a tab each of tools for equations, calculus and probability, a card for each; a
// card opens its boxes, worked out as they are typed; a result goes in with a click. What was
// typed is there the next time
async function solver(page, at) {
    var t = at + ': solve: ', on = '.calc-sv-item.calc-on',
        tiles = '[].map.call(document.querySelectorAll(".calc-sv-item.calc-on .calc-sv-tile"), function (e) {' +
            ' return e.querySelector(".calc-sv-label").textContent + "=" + e.querySelector(".calc-sv-value").textContent; }).join(" | ")',
        note = 'document.querySelector(".calc-sv-item.calc-on .calc-sv-note").textContent', got;

    // a box of the card open, typed in
    function set(n, text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
            '(document.querySelectorAll(".calc-sv-item.calc-on input")[' + n + '])');
    }
    async function card(name) {
        await page.calc('[].filter.call(document.querySelectorAll(".calc-sv-name"), function (n) { return n.textContent === ' + JSON.stringify(name) +
            '; })[0].parentNode.parentNode.click()');
        await sleep(60);
    }

    await page.fresh(at, {});
    await page.click('.calc-solve-btn');
    check(await open(page, '.calc-solve') && await page.calc('[].map.call(document.querySelectorAll(".calc-solve .calc-solve-tab"), function (t) { return t.dataset.tab; }).join()') === 'solve,calculus,chance,finance' &&
        await page.calc('document.querySelectorAll(".calc-solve .calc-sv-item").length') === 10, t + 'its button opens it: four tabs, Finance after Probability, ten cards on the first');
    await page.click('.calc-sv-item:nth-child(1) .calc-sv-row');
    check(await page.calc('document.activeElement === document.querySelector("' + on + ' input")'), t + 'a card opens its boxes, the first to type in');
    await page.type('x^2=2x+3');
    check(await page.calc(tiles) === 'x1=-1 | x2=3', t + 'x² = 2x + 3 is solved as it is typed', await page.calc(tiles));
    await set(0, 'x^2=2');
    check((await page.calc(tiles)).indexOf(' | Exact=x1 = –√2, x2 = √2') > 0, t + 'x² = 2 in exact form as well', await page.calc(tiles));
    await set(0, 'a x = 1');
    check(/^Only x/.test(await page.calc(note)) && await page.calc('document.querySelector("' + on + ' input").classList.contains("calc-bad")'),
        t + 'a letter of its own says so', await page.calc(note));
    await card('Inequality');
    await set(0, 'x^2-4>0');
    check(await page.calc(tiles) === 'x=x < -2 or x > 2 | Intervals=(–∞, -2) ∪ (2, ∞) | End 1=-2 | End 2=2', t + 'x² – 4 > 0 where it holds', await page.calc(tiles));
    await set(0, 'sqrt(x)<=3');
    check((await page.calc(tiles)).indexOf('x=0 ≤ x ≤ 9 | Intervals=[0, 9]') === 0, t + 'sqrt(x) ≤ 3 from where it has values', await page.calc(tiles));
    await set(0, 'x^2+1<0');
    check(/^It holds for no x/.test(await page.calc(note)) && (await page.calc(tiles)).indexOf('x=none') === 0, t + 'x² + 1 < 0 holds for none', await page.calc(note));
    check(/Looked for from –1e15 to 1e15/.test(await page.calc(note)), t + 'none, where it was looked for only so far, says how far', await page.calc(note));
    await set(0, 'x<2e9');
    check((await page.calc(tiles)).indexOf('x=x < 2000000000 | ') === 0, t + 'an end past 1e8', await page.calc(tiles));
    await card('Quadratic');
    await set(1, '2');
    await set(2, '5');
    got = await page.calc(tiles);
    check(got.indexOf('x1=-1 + 2i | x2=-1 – 2i') === 0 && got.indexOf('Discriminant=-16') > 0, t + 'x² + 2x + 5: its roots -1 ± 2i, a of 1 while empty', got);
    await card('Two equations');
    for (const [n, v] of [[0, '1'], [1, '1'], [2, '3'], [3, '1'], [4, '-1'], [5, '1']]) await set(n, v);
    check(await page.calc(tiles) === 'x=2 | y=1', t + 'x + y = 3 and x – y = 1', await page.calc(tiles));
    await set(3, '2');
    await set(4, '2');
    await set(5, '6');
    check(/^Many answers/.test(await page.calc(note)) && await page.calc(tiles) === 'x=– | y=–', t + 'the same line twice has many answers', await page.calc(note));
    await card('Two curves');
    await set(0, 'x^2+y^2=25');
    await set(1, 'x+y=7');
    check(await page.calc(tiles) === 'x1=3 | y1=4 | x2=4 | y2=3', t + 'where a circle and a line cross', await page.calc(tiles));
    await card('Polynomial');
    await set(0, '(x-1)(x^2-x-1)');
    got = await page.calc(tiles);
    check(got.indexOf('Multiplied out=x3 – 2x2 + 1 | ') === 0 && got.indexOf('Exact=x1 = (1 – √5)/2, x3 = (1 + √5)/2') > 0, t + 'a polynomial typed, multiplied out and solved', got);
    await card('Turning points');
    await set(0, 'x^3-3x');
    check(await page.calc(tiles) === 'Max x=-1 | Max y=2 | Min x=1 | Min y=-2', t + 'the turning points of x³ – 3x', await page.calc(tiles));

    await page.click('.calc-solve .calc-solve-tab[data-tab="calculus"]');
    await card('Integral');
    await set(0, 'x^2');
    await set(2, '3');
    check(await page.calc(tiles) === '∫=9 | Average=3', t + 'the integral of x² from 0 to 3, and its average', await page.calc(tiles));
    await set(0, 'e^(-x)');
    await set(2, 'inf');
    check(await page.calc(tiles) === '∫=1 | Average=–', t + 'of e^-x to ∞, of no average', await page.calc(tiles));
    await set(0, 'e^(-x^2)');
    await set(1, '-inf');
    check(await page.calc(tiles) === '∫=1.772453851 | Average=– | Exact=∫ = √π', t + 'of e^-x² over all of it, √π', await page.calc(tiles));
    await card('Sum');
    await set(0, 'n^2');
    check(await page.calc(tiles) === 'Σ=385', t + 'the sum of n² from 1 to 10, its ends while empty', await page.calc(tiles));
    await set(0, '1/n^2');
    await set(2, 'inf');
    check(await page.calc(tiles) === 'Σ=1.64493406685 | Exact=Σ = π²/6', t + 'the sum of 1/n² on to ∞ is π²/6', await page.calc(tiles));
    await set(0, '1/n');
    check(await page.calc(tiles) === 'Σ=∞' && /grows without end/.test(await page.calc(note)), t + '1/n grows without end', await page.calc(tiles));
    await card('Taylor series');
    await set(0, 'sin(x)');
    check((await page.calc(tiles)).indexOf('Series=x – x3/6 + x5/120 – x7/5040 | c0=0 | c1=1') === 0, t + 'the Taylor series of sin x', await page.calc(tiles));
    await card('Limit');
    await set(0, 'sin(x)/x');
    check(await page.calc(tiles) === 'Limit=1 | From below=1 | From above=1', t + 'sin(x)/x comes to 1 at 0, in Rad', await page.calc(tiles));
    await set(0, '1/x');
    check(await page.calc(tiles) === 'Limit=– | From below=–∞ | From above=∞' && /^No limit/.test(await page.calc(note)), t + '1/x goes to –∞ and ∞', await page.calc(tiles));
    await set(1, 'abc');
    check(await page.calc(note) === 'The point x goes to is not a number.', t + 'a limit at what is not a number blames not the function, but the point', await page.calc(note));
    await set(0, '(1+1/x)^x');
    await set(1, 'inf');
    check(await page.calc(tiles) === 'Limit=2.71828182846', t + '(1 + 1/x)^x comes to e at ∞, one side only', await page.calc(tiles));
    await card('Differential equation');
    await set(0, 'y');
    check(await page.calc(tiles) === 'y(x)=2.718281828 | y′(x)=2.718281828', t + 'y′ = y from y(0) = 1 is e at 1', await page.calc(tiles));
    await set(0, 'a y');
    check(/^Only x and y/.test(await page.calc(note)), t + 'a letter of its own says so', await page.calc(note));

    await page.click('.calc-solve .calc-solve-tab[data-tab="chance"]');
    await card('Normal probability');
    await set(0, '-1');
    await set(1, '1');
    check(await page.calc(tiles) === 'P(a ≤ X ≤ b)=0.682689492137 | Outside=0.317310507863', t + 'within one σ of the mean', await page.calc(tiles));
    await card('Student\'s t');
    await set(0, '2.228');
    got = await page.calc(tiles);
    check(got.indexOf('P(|T| ≥ |t|)=0.0500117718171') > 0 && got.indexOf('±t for p=2.228138852') > 0, t + 't of 10 degrees: its p-value and the t of 95%', got);
    await card('Normal probability');
    await page.click(on + ' .calc-sv-tile');
    check(!await open(page, '.calc-solve') && near(await value(page), 0.682689492137), t + 'a click on a result puts it in', await value(page));
    await page.click('.calc-solve-btn');
    check(await page.calc('document.querySelector(".calc-solve .calc-solve-tab.calc-on").dataset.tab') === 'chance' &&
        await page.calc('[].map.call(document.querySelectorAll("' + on + ' input"), function (b) { return b.value; }).join()') === '-1,1,,',
        t + 'opened again, as it was left');
    await page.key('Escape', 27);
    check(!await open(page, '.calc-solve'), t + 'Esc closes it');
}

// The numbers: complex numbers worked out, whole numbers in bits in every base, a matrix and two;
// a number of a matrix found goes in with a click
async function numbersPanel(page, at) {
    var t = at + ': numbers: ', on = '.calc-numbers .calc-sv-item.calc-on',
        tiles = '[].map.call(document.querySelectorAll(".calc-numbers .calc-sv-item.calc-on .calc-sv-tile"), function (e) {' +
            ' return e.querySelector(".calc-sv-label").textContent + "=" + e.lastChild.textContent; }).join(" | ")',
        note = 'document.querySelector(".calc-numbers .calc-sv-item.calc-on .calc-sv-note").textContent', got;

    function set(n, text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
            '(document.querySelectorAll("' + on + ' input")[' + n + '])');
    }
    async function card(name) {
        await page.calc('[].filter.call(document.querySelectorAll(".calc-numbers .calc-sv-name"), function (n) { return n.textContent === ' + JSON.stringify(name) +
            '; })[0].parentNode.parentNode.click()');
        await sleep(60);
    }

    await page.fresh(at, {});
    await page.click('.calc-numbers-btn');
    check(await open(page, '.calc-numbers') && await page.calc('document.querySelectorAll(".calc-numbers .calc-solve-tab").length') === 4,
        t + 'its button opens it, with four tabs');
    check(await page.calc('document.querySelector(".calc-numbers .calc-solve-tab.calc-on").dataset.tab') === 'matrix' &&
        await page.calc('document.querySelector(".calc-numbers .calc-solve-tab").dataset.tab') === 'matrix', t + 'Matrix the first tab, open at first');
    await page.click('.calc-numbers .calc-solve-tab[data-tab="complex"]');
    await page.click('.calc-numbers .calc-sv-item:nth-child(1) .calc-sv-row');
    check(await page.calc('document.activeElement === document.querySelector("' + on + ' input")'), t + 'a card opens with its box to type in');
    await set(0, '(2+3i)(1-i)'); // the harness types ( as the arrow down
    got = await page.calc(tiles);
    check(got.indexOf('a + bi=5 + i | Real part=5 | Imaginary part=1 | Length |z|=5.09901951359') === 0 && got.indexOf('Conjugate=5 – i') > 0,
        t + '(2 + 3i)(1 – i) is 5 + i, its length and conjugate', got);
    await set(0, 'e^(i pi)');
    check((await page.calc(tiles)).indexOf('a + bi=-1 | ') === 0 && (await page.calc(tiles)).indexOf('Conjugate=-1') > 0, t + 'e^(iπ) is -1', await page.calc(tiles));
    check(/ \| Exponential=ei·(3\.14159265359|180°|200) \| /.test(await page.calc(tiles)), t + 'and as r e^(iθ), of length 1 e^(iπ) again', await page.calc(tiles));
    await set(0, '5');
    check(/ \| Exponential=5 \| /.test(await page.calc(tiles)), t + 'a positive real is its length alone as r e^(iθ), not 5ei', await page.calc(tiles));
    await set(0, '2∠1');
    check(/ \| Exponential=2(\.0*1)?ei·1 \| /.test(await page.calc(tiles)), t + 'and an angle is written in it', await page.calc(tiles));
    check(await page.calc('document.querySelectorAll(".calc-numbers .calc-sv-item:nth-child(1) .calc-sv-pill").length') === 2, t + 'a card\'s subtitle: a badge for each of its two');
    await set(0, 'x + i');
    check(/^Not a complex number/.test(await page.calc(note)), t + 'x has no value here', await page.calc(note));
    await card('Roots of a complex number');
    await set(0, '-16');
    check(await page.calc(tiles) === 'z1=1.41421356237 + 1.41421356237i | z2=-1.41421356237 + 1.41421356237i | z3=-1.41421356237 – 1.41421356237i | ' +
        'z4=1.41421356237 – 1.41421356237i | On the plane=', t + 'the four fourth roots of -16, drawn on the plane', await page.calc(tiles));
    check(await page.calc('document.querySelectorAll("' + on + ' .calc-sv-plane circle").length') === 5, t + 'the plane: a dot for each root, and their circle');
    await card('Polynomial roots');
    await set(0, 'x^2+1');
    check(await page.calc(tiles) === 'Multiplied out=x2 + 1 | z1=–i | z2=i | On the plane=', t + 'x² + 1 has the roots ±i', await page.calc(tiles));
    await set(0, 'x^2 + (1+i)x + 2i');
    check((await page.calc(tiles)).indexOf('Multiplied out=x2 + (1 + i)x + 2i | z1=-1.36602540378 + 0.366025403784i | ') === 0, t + 'a polynomial of complex coefficients', await page.calc(tiles));
    await card('AC impedance');
    for (const [n, v] of [[0, '100'], [1, '0.1'], [2, '10µ'], [3, '50']]) await set(n, v);
    got = await page.calc(tiles);
    check(got.indexOf('Z=100 – 286.893959648i | |Z|, Ω=303.822553611 | ') === 0 && got.indexOf('XL = ωL=31.4159265359 | XC = 1/ωC=318.309886184 | Resonance f0, Hz=159.154943092 | Z on the plane=') > 0 &&
        /^Of a capacitor/.test(await page.calc(note)), t + 'R, L and C in series at 50 Hz, a capacitor\'s', got);
    await page.click(on + ' .calc-sv-opt[data-c="1"]');
    check((await page.calc(tiles)).indexOf('Z=10.8332803128 + 31.0800268492i | ') === 0 && /^Of a coil/.test(await page.calc(note)), t + 'and side by side, a coil\'s', await page.calc(tiles));
    await set(2, '');
    await set(1, '10mH');
    check(/^Z=0\.09859873096\d* \+ 3\.13849508\d*i \| /.test(await page.calc(tiles)), t + 'a prefix and a unit, 10mH: 10 mH and 100 Ω side by side', await page.calc(tiles));
    await set(1, '10 mm');
    check(/^L is not a value/.test(await page.calc(note)) && await page.calc('document.querySelectorAll("' + on + ' input")[1].classList.contains("calc-bad")'), t + 'what is not a value of L', await page.calc(note));
    await set(1, '');
    await set(0, '4,700');
    check(/\|Z\|, Ω=4700 \| /.test(await page.calc(tiles)), t + 'a comma is a thousands mark here: 4,700 Ω is 4700', await page.calc(tiles));
    await set(0, '4,7');
    check(/^R is not a value/.test(await page.calc(note)), t + 'and 4,7 is no value, not 4.7', await page.calc(note));

    await page.click('.calc-numbers .calc-solve-tab[data-tab="computer"]');
    check(await page.calc('document.querySelectorAll(".calc-numbers .calc-sv-item").length') === 8, t + 'eight cards of bases');
    await card('Bases');
    await set(0, '0xFF AND 0b1010');
    check(await page.calc(tiles) === 'Decimal=10 | Unsigned=10 | Hexadecimal=A | Octal=12 | Binary=0000 0000 0000 0000 0000 0000 0000 1010 | ' +
        'Big-endian=00 00 00 0A | Little-endian=0A 00 00 00 | Bytes swapped=0x0A000000', t + '0xFF AND 0b1010 in every base, and its bytes either way round', await page.calc(tiles));
    await set(0, '1 << 100');
    await page.click(on + ' .calc-sv-opt[data-c="4"]');
    got = await page.calc(tiles);
    check(got.indexOf('Decimal=1267650600228229401496703205376 | Unsigned=1267650600228229401496703205376 | Hexadecimal=10000000000000000000000000 | ') === 0 &&
        await page.calc('document.querySelectorAll("' + on + ' .calc-sv-tile br").length') === 3, t + '128 bits: 2¹⁰⁰, its binary on four lines', got);
    await set(0, '-1');
    check(await page.calc('[].map.call(document.querySelectorAll("' + on + ' .calc-sv-opt"), function (o) { return o.textContent; }).join()') === '8,16,32,64,128',
        t + 'Bits: 8, 16, 32, 64 or 128, a button each');
    await page.click(on + ' .calc-sv-opt[data-c="0"]');
    check(await page.calc(tiles) === 'Decimal=-1 | Unsigned=255 | Hexadecimal=FF | Octal=377 | Binary=1111 1111', t + '-1 in 8 bits', await page.calc(tiles));
    await set(0, '0x81 rol 1');
    check((await page.calc(tiles)).indexOf('Decimal=3 | ') === 0, t + 'ROL turns the bits round', await page.calc(tiles));
    await set(0, '0x81 rol');
    check(/ROL ROR\.$/.test(await page.calc(note)), t + 'what is not one says ROL and ROR as well', await page.calc(note));
    await card('Bits');
    await page.click(on + ' .calc-sv-opt[data-c="0"]');
    check(await page.calc('document.querySelectorAll("' + on + ' .calc-sv-bit").length') === 8 && await page.calc('document.querySelectorAll("' + on + ' .calc-sv-bit.calc-on").length') === 0,
        t + 'bits: empty is 0, eight bits to click');
    await page.click(on + ' .calc-sv-bit[data-b="7"]');
    await page.click(on + ' .calc-sv-bit[data-b="0"]');
    got = await page.calc(tiles);
    check(await page.calc('document.querySelector("' + on + ' input").value') === '0b10000001' && got.indexOf('Decimal=-127 | Hexadecimal=81 | Ones=2 | Leading zeros=0 | Trailing zeros=0 | Highest 1=7 | Lowest 1=0') > 0,
        t + 'bits: two clicked, written in binary in its box', got);
    await set(0, '0xF0');
    await page.click(on + ' .calc-sv-bit[data-b="0"]');
    check(await page.calc('document.querySelector("' + on + ' input").value') === '0xF1' && await open(page, '.calc-numbers'), t + 'bits: a click writes 0x as it was typed, and puts nothing in');
    check(await page.calc('document.querySelectorAll("' + on + ' .calc-sv-pill").length') === 1, t + 'a card\'s subtitle of one thing: one badge');
    await page.click(on + ' .calc-sv-opt[data-c="4"]');
    await set(0, '1 << 100');
    check(await page.calc('[].filter.call(document.querySelectorAll("' + on + ' .calc-sv-tile"), function (e) { return /^(Decimal|Hexadecimal)/.test(e.querySelector(".calc-sv-label").textContent); })' +
        '.map(function (e) { return e.classList.contains("calc-sv-wide"); }).join()') === 'true,true', t + 'bits: at 128, the decimal and the hexadecimal in wide tiles', await page.calc(tiles));
    await card('IEEE 754');
    await set(0, '0.1');
    got = await page.calc(tiles);
    check(got.indexOf('Number=0.1 | Double, 64 bits=0x3FB999999999999A | Kept as a double=0.1000000000000000055511151231257827021181583404541015625 | Sign=+ | Exponent=-4 | Kind=Normal') === 0 &&
        got.indexOf('Float, 32 bits=0x3DCCCCCD | Kept as a float=0.100000001490116119384765625') > 0,
        t + '0.1 as a double and a float, to its last digit', got);
    await set(0, '0x3DCCCCCD');
    check(/^The bits of a float/.test(await page.calc(note)) && (await page.calc(tiles)).indexOf('Double, 64 bits=0x3FB99999A0000000') > 0, t + 'the bits of a float for the number', await page.calc(tiles));
    await card('Any base');
    await set(0, '0.1');
    check(await page.calc(tiles) === 'In base 2=0.0(0011) | Decimal=0.1 | Fraction=1/10', t + '0.1 in base 2 comes round', await page.calc(tiles));
    await set(0, 'FF.8');
    await set(1, '16');
    await set(2, '10');
    check(await page.calc(tiles) === 'In base 10=255.5 | Decimal=255.5 | Fraction=511/2', t + 'FF.8 of base 16 in base 10', await page.calc(tiles));
    await card('Text and codes');
    await set(0, 'Hé');
    check((await page.calc(tiles)).indexOf('Text=Hé | Code points=U+0048 U+00E9 | Decimal=72 233 | UTF-8=48 C3 A9 | ') === 0, t + 'the codes of a text', await page.calc(tiles));
    await set(0, '');
    await set(1, '0xC3 0xA9');
    check((await page.calc(tiles)).indexOf('Text=é | ') === 0, t + 'a text of the bytes of UTF-8', await page.calc(tiles));
    await card('Base32, 58, 64 and 85');
    check(await page.calc('[].map.call(document.querySelectorAll("' + on + ' .calc-sv-opt"), function (o) { return o.textContent; }).join()') === 'Base32,Base58,Base64,Base85' &&
        await page.calc('document.querySelector("' + on + ' .calc-sv-opt.calc-on").textContent') === 'Base64', t + 'Base32, 58, 64 and 85, a button each, Base64 at first');
    await set(0, 'Hé');
    check(await page.calc(tiles) === 'Base64=SMOp | For web addresses=SMOp | Bytes of UTF-8=48 C3 A9 | Bytes=3 | Letters of Base64=4', t + 'a text in Base64', await page.calc(tiles));
    await page.click(on + ' .calc-sv-opt[data-c="0"]');
    check(await page.calc(tiles) === 'Base32=JDB2S=== | Bytes of UTF-8=48 C3 A9 | Bytes=3 | Letters of Base32=8', t + 'in Base32', await page.calc(tiles));
    await set(0, 'Hello World!');
    await page.click(on + ' .calc-sv-opt[data-c="1"]');
    check((await page.calc(tiles)).indexOf('Base58=2NEpo7TZRRrLZSi2U | ') === 0, t + 'in Base58, as Bitcoin writes it', await page.calc(tiles));
    await page.click(on + ' .calc-sv-opt[data-c="3"]');
    check((await page.calc(tiles)).indexOf('Base85=87cURD]i,"Ebo80 | ') === 0, t + 'in Base85', await page.calc(tiles));
    await set(0, '');
    await set(1, '<~87cURD]i,"Ebo80~>');
    check((await page.calc(tiles)).indexOf('Text=Hello World! | ') === 0, t + 'and read back', await page.calc(tiles));
    await page.click(on + ' .calc-sv-opt[data-c="2"]');
    await set(1, 'SGk=');
    check(await page.calc(tiles) === 'Text=Hi | Bytes=48 69 | Bytes=2', t + 'the text of Base64', await page.calc(tiles));
    await set(1, '/w==');
    check(/^Not text of UTF-8/.test(await page.calc(note)) && (await page.calc(tiles)).indexOf('Bytes=FF') > 0, t + 'bytes that are not text', await page.calc(tiles));
    await set(1, 'SGk!');
    check(/^Not Base64/.test(await page.calc(note)), t + 'nor what is not Base64', await page.calc(note));
    await card('IP subnet');
    await set(0, '192.168.1.10/24');
    got = await page.calc(tiles);
    check(got.indexOf('Network=192.168.1.0/24 | Broadcast=192.168.1.255 | Mask=255.255.255.0 | Wildcard=0.0.0.255 | First host=192.168.1.1 | Last host=192.168.1.254 | ' +
        'Hosts=254 | Addresses=256 | Kind=Private | Address in binary=11000000.10101000.00000001.00001010') === 0, t + 'the network of 192.168.1.10/24', got);
    await set(0, '10.20.30.40 255.255.240.0');
    check((await page.calc(tiles)).indexOf('Network=10.20.16.0/20 | Broadcast=10.20.31.255 | ') === 0, t + 'and of an address with its mask', await page.calc(tiles));
    await set(0, '10.20.30.40/33');
    check(/^The prefix is from \/0 to \/32/.test(await page.calc(note)), t + 'no prefix past /32', await page.calc(note));
    await set(0, '2001:DB8:abcd:0012:0000::1/48');
    got = await page.calc(tiles);
    check(got === 'Network=2001:db8:abcd::/48 | Address=2001:db8:abcd:12::1 | In full=2001:0db8:abcd:0012:0000:0000:0000:0001 | First address=2001:db8:abcd:: | ' +
        'Last address=2001:db8:abcd:ffff:ffff:ffff:ffff:ffff | Addresses=280 = 1208925819614629174706176 | /64 networks=65536 | Kind=Documentation | ' +
        'Reverse DNS=1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.2.1.0.0.d.c.b.a.8.b.d.0.1.0.0.2.ip6.arpa', t + 'the network of an IPv6 address, written short and in full', got);
    await set(0, 'fe80::1::2');
    check(/^An IPv6 address/.test(await page.calc(note)), t + 'no IPv6 address of two ::', await page.calc(note));
    await card('UUID');
    got = (await page.calc(tiles)).split(' | ');
    check(got.length === 5 && got.every(function (u, i) { return new RegExp('^UUID ' + (i + 1) + '=[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$').test(u); }) &&
        await page.calc('document.querySelectorAll("' + on + ' .calc-sv-copy-t").length') === 5, t + 'five new UUIDs of version 4, each to copy', got.join(' | '));
    await page.click(on + ' .calc-sv-again');
    check((await page.calc(tiles)).split(' | ')[0] !== got[0], t + 'Again for five more', await page.calc(tiles));
    await page.click(on + ' .calc-sv-opt[data-c="1"]');
    got = (await page.calc(tiles)).split(' | ').map(function (u) { return u.split('=')[1]; });
    check(got.length === 5 && got.every(function (u) { return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab]/.test(u); }) && got.slice().sort().join() === got.join() &&
        Math.abs(parseInt(got[0].replace('-', '').slice(0, 12), 16) - Date.now()) < 60000, t + 'of version 7, of the time now, in order', got.join(' | '));
    await page.calc('document.addEventListener("copy", function (e) { window.copied = e.clipboardData.getData("text/plain"); })');
    await page.calc('document.querySelectorAll("' + on + ' .calc-sv-copy-t")[1].click()');
    check(await page.calc('window.copied') === got[1], t + 'Copy copies one', await page.calc('window.copied'));
    await set(0, '{C232AB00-9414-11EC-B3C8-9F6BDECED846}');
    got = await page.calc(tiles);
    check(got.indexOf('UUID=c232ab00-9414-11ec-b3c8-9f6bdeced846 | Version=1, of the time and a node | Variant=RFC 9562 | Made, in UTC=2022-02-22, 19:22:22.000 | Made, here=') === 0 &&
        got.indexOf(' | Hexadecimal=0xC232AB00941411ECB3C89F6BDECED846 | Base64=wjKrAJQUEeyzyJ9r3s7YRg== | For web addresses=wjKrAJQUEeyzyJ9r3s7YRg | As a whole number=258133314363070689776975542038781941830') > 0,
        t + 'one read: its version, variant, the time it was made, and it written other ways', got);
    await set(0, '00000000-0000-0000-0000-000000000000');
    check((await page.calc(tiles)).indexOf('UUID=00000000-0000-0000-0000-000000000000 | Version=Nil, all 0 | Hexadecimal=') === 0, t + 'the nil UUID', await page.calc(tiles));
    await set(0, 'c232ab00-9414-11ec-b3c8');
    check(/^A UUID is 32 hexadecimal digits/.test(await page.calc(note)), t + 'nor what is not a UUID', await page.calc(note));

    await page.click('.calc-numbers .calc-solve-tab[data-tab="matrix"]');
    await card('A matrix');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 6, t + 'a matrix of 2×2 at first, its size, its power and four boxes');
    for (const [n, v] of [[2, '1'], [3, '2'], [4, '3'], [5, '4']]) await set(n, v);
    got = await page.calc(tiles);
    check(got === 'det A=-2 | Rank=2 | A–1=-211.5-0.5 | AT=1324 | A2=7101522', t + 'det, rank, inverse and square of [1 2; 3 4]', got);
    await set(1, '-1');
    check((await page.calc(tiles)).indexOf('A–1=-211.5-0.5') > 0 && / \| A–1=-211\.5-0\.5$/.test(await page.calc(tiles)), t + 'its power -1 is its inverse', await page.calc(tiles));
    await set(1, '');
    await set(0, '3');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 11 &&
        await page.calc('document.activeElement === document.querySelector("' + on + ' input")'), t + 'a size of 3 makes nine boxes, the size keeping the focus');
    await set(0, '2');
    await page.click(on + ' .calc-sv-matrix .calc-sv-cell:nth-child(2)');
    check(!await open(page, '.calc-numbers') && await value(page) === 1, t + 'a number of the inverse goes in with a click', await value(page));
    await page.click('.calc-numbers-btn');
    await card('Two matrices');
    await set(0, '1x2');
    check(/Size of A/.test(await page.calc('document.querySelector("' + on + '").textContent')) &&
        (await page.calc(tiles)).indexOf('A + B=– | A – B=– | A × B=00') === 0, t + 'two matrices: a sum of sizes that differ has none', await page.calc(tiles));
    await card('Eigenvalues');
    for (const [n, v] of [[1, '2'], [2, '1'], [3, '1'], [4, '2']]) await set(n, v);
    check(await page.calc(tiles) === 'λ1=1 | λ2=3 | Trace=4 | det(λI – A)=λ2 – 4λ + 3 | v1 of λ = 1=-11 | v2 of λ = 3=11', t + 'the eigenvalues and vectors of [2 1; 1 2]', await page.calc(tiles));
    for (const [n, v] of [[1, '0'], [2, '-1'], [3, '1'], [4, '0']]) await set(n, v);
    check(await page.calc(tiles) === 'λ1=i | λ2=–i | Trace=0 | det(λI – A)=λ2 + 1' && /^Its complex eigenvalues/.test(await page.calc(note)), t + 'a turn has eigenvalues ±i', await page.calc(tiles));
    await set(1, 'k1x.5.z-');
    check(await page.calc('document.querySelectorAll("' + on + ' input")[1].value') === '1.5', t + 'a box of a number keeps only a number and A to J, as the formulas\' do',
        await page.calc('document.querySelectorAll("' + on + ' input")[1].value'));
    await set(0, '2a×b2');
    check(await page.calc('document.querySelector("' + on + ' input").value') === '2×2', t + 'and its size only a size', await page.calc('document.querySelector("' + on + ' input").value'));
    await set(0, '11');
    check(/^A size of rows and columns, each 1 to 10/.test(await page.calc(note)) && await page.calc(tiles) === 'λ=–', t + 'eigenvalues: a size that is not one is said so', await page.calc(note));
    await card('A x = b');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 7 && await page.calc('document.querySelectorAll("' + on + ' .calc-sv-rhs").length') === 2,
        t + 'A x = b: a size, and a row of A and of b for each equation');
    for (const [n, v] of [[1, '1'], [2, '1'], [3, '3'], [4, '1'], [5, '-1'], [6, '1']]) await set(n, v);
    check((await page.calc(tiles)).indexOf('x1=2 | x2=1 | [A | b] reduced=102011') === 0, t + 'x + y = 3 and x – y = 1, and [A | b] reduced', await page.calc(tiles));
    for (const [n, v] of [[4, '2'], [5, '2'], [6, '6']]) await set(n, v);
    check((await page.calc(tiles)).indexOf('x1=3 | x2=0 | All of them=x = p + t1v1 | p=30 | v1=-11') === 0 && /^Many answers/.test(await page.calc(note)),
        t + 'the same line twice: all of its answers', await page.calc(tiles));
    await set(0, '3 2');
    for (const [n, v] of [[1, '1'], [2, '0'], [3, '1'], [4, '0'], [5, '1'], [6, '2'], [7, '1'], [8, '1'], [9, '4']]) await set(n, v);
    check(/^No answer/.test(await page.calc(note)) && /least squares/.test(await page.calc(note)) && (await page.calc(tiles)).indexOf('|Ax – b|=') > 0,
        t + 'three equations of two unknowns that cannot all hold: the nearest by least squares', await page.calc(note));
    await card('Row reduce');
    for (let n = 1; n <= 9; n++) await set(n, String(n));
    check(await page.calc(tiles) === 'rref A=10-1012000 | Rank=2 | Nullity=1 | Columns of its first 1s=1, 2 | Null space v1=1-21', t + 'row reduce [1 2 3; 4 5 6; 7 8 9], and its null space', await page.calc(tiles));
    await card('Vectors');
    await set(0, '1, 2, 3');
    await set(1, '4, 5, 6');
    check((await page.calc(tiles)).indexOf('u · v=32 | u × v=-36-3 | |u|=3.74165738677 | |v|=8.77496438739 | ') === 0, t + 'the dot and cross products of two vectors', await page.calc(tiles));
    await set(1, '4, 5');
    check(/^Two vectors of one size/.test(await page.calc(note)), t + 'vectors of two sizes', await page.calc(note));

    await page.click('.calc-numbers .calc-solve-tab[data-tab="whole"]');
    await card('Prime factors');
    await set(0, '360');
    got = await page.calc(tiles);
    check(got.indexOf('Prime factors=23 × 32 × 5 | Prime=No | Divisors=24 | ') === 0 && /Each divisor=1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180, 360$/.test(got),
        t + '360 in its prime factors, with its divisors', got);
    await set(0, '1000000016000000063');
    check((await page.calc(tiles)).indexOf('Prime factors=1000000007 × 1000000009 | Prime=No') === 0, t + 'a number of 19 digits factored', await page.calc(tiles));
    await set(0, '1.5');
    check(/^A whole number/.test(await page.calc(note)), t + '1.5 is not whole', await page.calc(note));
    await card('GCD and LCM');
    await set(0, '12, 18, 30');
    check(await page.calc(tiles) === 'GCD=6 | LCM=180 | Coprime=No', t + 'the GCD and LCM of 12, 18 and 30', await page.calc(tiles));
    await card('Modular arithmetic');
    await set(0, '3');
    await set(1, '4');
    await set(2, '7');
    check(await page.calc(tiles) === 'a mod m=3 | ab mod m=4 | a–1 mod m=5 | a x ≡ b (mod m)=x ≡ 6 (mod 7)', t + '3, 4 and 7 mod 7', await page.calc(tiles));
    await card('Chinese remainder');
    await set(0, '2 mod 3, 3 mod 5, 2 mod 7');
    check(await page.calc(tiles) === 'x=23 | Modulus=105 | All of them=x ≡ 23 (mod 105)', t + 'the Chinese remainder theorem', await page.calc(tiles));
    await card('Exactly');
    await set(0, '50 nCr 25');
    check((await page.calc(tiles)).indexOf('Exactly=126410606437752 | Digits=15 | ') === 0, t + '50 nCr 25 to every digit', await page.calc(tiles));
    await set(0, '1/3 + 1/6');
    check((await page.calc(tiles)).indexOf('Exactly=1/2 | ') === 0, t + 'fractions stay fractions', await page.calc(tiles));
    await card('Primes');
    await set(0, '100');
    check(await page.calc(tiles) === 'Prime=No | Previous prime=97 | Next prime=101 | π(n), primes up to n=25 | The n-th prime=541', t + 'the primes about 100', await page.calc(tiles));
    await card('Primes between');
    await set(0, '10');
    await set(1, '30');
    check(await page.calc(tiles) === 'How many=6 | The primes=11, 13, 17, 19, 23, 29', t + 'the primes from 10 to 30', await page.calc(tiles));
    await card('Fraction and decimal');
    await set(0, '0.1(6)');
    check((await page.calc(tiles)).indexOf('Fraction=1/6 | Mixed=– | ') === 0 && (await page.calc(tiles)).indexOf('Decimal=0.1(6) | Continued fraction=[0; 6]') > 0,
        t + '0.1(6) is 1/6', await page.calc(tiles));
    await card('Round');
    await set(0, '-2.5');
    check((await page.calc(tiles)).indexOf('Rounded=-3 | Down ⌊x⌋=-3 | Up ⌈x⌉=-2 | Toward 0=-2 | Fraction part=-0.5') === 0,
        t + '-2.5 rounded half away from 0, down, up and toward 0', await page.calc(tiles));
    await set(0, '1.005');
    await set(1, '2');
    check((await page.calc(tiles)).indexOf('Rounded=1.01 | Down ⌊x⌋=1 | Up ⌈x⌉=1.01 | Toward 0=1 | Fraction part=0.005 | To 2 figures=1') === 0,
        t + '1.005 to 2 places is 1.01, as it reads', await page.calc(tiles));
    await page.click(on + ' .calc-sv-tile:nth-child(1)');
    check(!await open(page, '.calc-numbers') && await value(page) === 1.01, t + 'a number rounded goes in with a click', await value(page));
    await page.click('.calc-numbers-btn');
    await page.key('Escape', 27);
    check(!await open(page, '.calc-numbers'), t + 'Esc closes it');
}

// Matrices up to 10×10: their boxes smaller, scrolling across inside the card and never the page; the
// results as big; the eigenvalues of a larger one; and a note where a matrix is too badly conditioned to trust
async function matrixTen(page, at) {
    var t = at + ': matrix 10×10: ', on = '.calc-numbers .calc-sv-item.calc-on',
        note = 'document.querySelector(".calc-numbers .calc-sv-item.calc-on .calc-sv-note").textContent', i, j, got;
    function set(n, text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
            '(document.querySelectorAll("' + on + ' input")[' + n + '])');
    }
    async function card(name) {
        await page.calc('[].filter.call(document.querySelectorAll(".calc-numbers .calc-sv-name"), function (n) { return n.textContent === ' + JSON.stringify(name) +
            '; })[0].parentNode.parentNode.click()');
        await sleep(60);
    }
    // the page, and the panel's list, as wide as they are: nothing scrolls across but the matrices
    var wide = '[document.documentElement.scrollWidth - document.documentElement.clientWidth, document.querySelector(".calc-numbers .calc-sv-list").scrollWidth - ' +
        'document.querySelector(".calc-numbers .calc-sv-list").clientWidth].join()';

    await page.fresh(at, {});
    await page.click('.calc-numbers-btn');
    await card('A matrix');
    await set(0, '10');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 102 && await page.calc('document.querySelector("' + on + ' .calc-sv-cells-in").classList.contains("calc-sv-many")') &&
        await page.calc('(function (g) { return g.scrollWidth <= g.clientWidth && document.querySelector("' + on + ' .calc-sv-cells-in input").offsetWidth >= 24; })(document.querySelector("' + on + ' .calc-sv-cells-in"))'),
        t + 'a size of 10 makes 100 boxes, smaller, that fit across the card');
    check(await page.calc(wide) === '0,0', t + 'the page and the panel do not scroll across', await page.calc(wide));
    for (i = 1; i <= 10; i++) for (j = 1; j <= 10; j++) await set(1 + (i - 1) * 10 + j, String(1 / (i + j - 1)));
    got = await page.calc('[].map.call(document.querySelectorAll("' + on + ' .calc-sv-matrix")[0].querySelectorAll(".calc-sv-cell"), function (c) { return c.textContent; })');
    check(got.length === 100 && got[0] === '100' && got[1] === '-4950' && /^99\.99/.test(await page.calc('document.querySelector("' + on + ' .calc-sv-matrix .calc-sv-cell").title')) &&
        await page.calc('(function (c) { return c.scrollWidth <= c.clientWidth + 1; })(document.querySelector("' + on + ' .calc-sv-matrix .calc-sv-cell"))') &&
        await page.calc('(function (m) { return m.scrollWidth <= m.clientWidth; })(document.querySelector("' + on + ' .calc-sv-matrix .calc-sv-cells"))'),
        t + 'the inverse of the Hilbert matrix, 10×10, fits its tile, each number to as many digits as fit, the whole in its title', got.slice(0, 3).join(' '));
    check(/^Badly conditioned, κ ≈ 3,5e13|^Badly conditioned, κ ≈ 3\.5e13: only about 2 digits/.test(await page.calc(note)) && await page.calc('document.querySelector("' + on + ' .calc-sv-note").classList.contains("calc-sv-warn")'),
        t + 'its note says how few of its digits can be trusted', await page.calc(note));
    check(await page.calc(wide) === '0,0', t + 'nor with the results', await page.calc(wide));
    await card('Eigenvalues');
    await set(0, '10');
    for (i = 1; i <= 10; i++) for (j = 1; j <= 10; j++) await set((i - 1) * 10 + j, i === j ? String(i) : i < j ? '1' : '0');
    got = await page.calc('[].map.call(document.querySelectorAll("' + on + ' .calc-sv-tile"), function (e) { return e.querySelector(".calc-sv-label").textContent + "=" + e.lastChild.textContent; }).slice(0, 11).join(" | ")');
    check(got === 'λ1=1 | λ2=2 | λ3=3 | λ4=4 | λ5=5 | λ6=6 | λ7=7 | λ8=8 | λ9=9 | λ10=10 | Trace=55', t + 'eigenvalues of a 10×10', got);
    await card('A x = b');
    await set(0, '10');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 111 && await page.calc('document.querySelectorAll("' + on + ' .calc-sv-rhs").length') === 10,
        t + 'A x = b of ten equations: a row of A and of b for each');
    for (i = 1; i <= 10; i++) await set(1 + (i - 1) * 11 + i - 1, '2'); // 2 on the diagonal
    for (i = 1; i <= 10; i++) await set(i * 11, String(2 * i));
    got = await page.calc('[].map.call(document.querySelectorAll("' + on + ' .calc-sv-tile"), function (e) { return e.querySelector(".calc-sv-label").textContent + "=" + e.lastChild.textContent; }).slice(0, 10).join(" | ")');
    check(got === 'x1=1 | x2=2 | x3=3 | x4=4 | x5=5 | x6=6 | x7=7 | x8=8 | x9=9 | x10=10', t + 'its ten unknowns', got);
    await card('LU and QR');
    await set(0, '10');
    check(await page.calc('document.querySelectorAll("' + on + ' .calc-sv-matrix").length') === 5 &&
        await page.calc('document.querySelectorAll("' + on + ' .calc-sv-matrix")[0].querySelectorAll(".calc-sv-cell").length') === 100, t + 'LU and QR of a 10×10');
}

// A matrix pasted into a box of one: a block of a spreadsheet, [1 2; 3 4] or [[1, 2], [3, 4]],
// the matrix made bigger where it needs to be, up to 10×10; into B of two matrices, and into
// A | b; one number pasted as ever. A result's Copy, pasted back. With the decimal comma
async function matrixPaste(page, at) {
    var t = at + ': matrix paste: ', on = '.calc-numbers .calc-sv-item.calc-on',
        note = 'document.querySelector(".calc-numbers .calc-sv-item.calc-on .calc-sv-note")', got;
    function set(n, text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
            '(document.querySelectorAll("' + on + ' input")[' + n + '])');
    }
    // the paste, and whether it was taken from the box, not pasted in it as text
    function paste(n, text) {
        return page.calc('(function (b) { var e = Object.assign(new Event("paste", { bubbles: true, cancelable: true }), ' +
            '{ clipboardData: { getData: function () { return ' + JSON.stringify(text) + '; } } }); b.focus(); b.dispatchEvent(e); return e.defaultPrevented; })' +
            '(document.querySelectorAll("' + on + ' input")[' + n + '])');
    }
    function boxes() {
        return page.calc('[].map.call(document.querySelectorAll("' + on + ' input"), function (b) { return b.value; }).join("|")');
    }
    function tiles() {
        return page.calc('[].map.call(document.querySelectorAll("' + on + ' .calc-sv-tile"), function (e) { return e.querySelector(".calc-sv-label").textContent + "=" + e.lastChild.textContent; }).join(" | ")');
    }
    async function card(name) {
        await page.calc('[].filter.call(document.querySelectorAll(".calc-numbers .calc-sv-name"), function (n) { return n.textContent === ' + JSON.stringify(name) +
            '; })[0].parentNode.parentNode.click()');
        await sleep(60);
    }

    await page.fresh(at, {});
    await page.click('.calc-numbers-btn');
    await card('A matrix');
    check(await paste(2, '4\t1\t2\r\n1\t5\t3\r\n2\t3\t6\r\n') && await boxes() === '3×3||4|1|2|1|5|3|2|3|6' && /^det A=70 \| Rank=3/.test(await tiles()),
        t + 'a block of a spreadsheet pasted in a11 of 2×2 makes it 3×3, a number in each box', await boxes());
    check(await page.calc('document.activeElement.dataset.k') === 'a11', t + 'the box pasted in keeps the focus');
    check(await paste(2, '[1 2; 3 4]') && await boxes() === '3×3||1|2|2|3|4|3|2|3|6', t + '[1 2; 3 4] fills the 2×2 at its top left, the rest as it was', await boxes());
    check(!(await paste(2, '5')) && !(await paste(2, '2 + 3')), t + 'one number, or what is not a matrix, pastes in the box as ever');
    check(await paste(10, '1 2\n3 4') && await boxes() === '4×4||1|2|2||3|4|3||2|3|1|2|||3|4',
        t + 'pasted in a33, the matrix grows to 4×4', await boxes());
    check(await paste(2, '1 2 3 4 5 6 7 8 9 10 11 12') && /^A matrix of up to 10×10: this one is 1×12\.$/.test(await page.calc(note + '.textContent')) &&
        await page.calc(note + '.classList.contains("calc-sv-warn")') && /^4×4\|/.test(await boxes()), t + 'one of 12 columns does not go in, and its note says why', await page.calc(note + '.textContent'));
    await set(0, '10');
    check(await paste(101, '1 2\n3 4') && /^Up to 10×10: from row 10, column 10/.test(await page.calc(note + '.textContent')) && /^10\|/.test(await boxes()),
        t + 'one that would go past 10×10 from where it is pasted does not either', await page.calc(note + '.textContent'));
    await set(0, '11');
    check(/up to 10×10\.$/.test(await page.calc(note + '.textContent')), t + 'a size of more than 10 says up to 10×10', await page.calc(note + '.textContent'));

    // the result's Copy: its numbers apart by tabs, which paste back in
    await set(0, '2');
    await set(2, '4'); await set(3, '7'); await set(4, '2'); await set(5, '6');
    await page.calc('document.addEventListener("copy", function (e) { window.copied = e.clipboardData.getData("text/plain"); })');
    await page.calc('document.querySelectorAll("' + on + ' .calc-sv-matrix")[0].querySelector(".calc-sv-copy-m").click()');
    got = await page.calc('window.copied');
    check(got === '0.6\t-0.7\n-0.2\t0.4\n' && await page.calc('document.querySelectorAll("' + on + ' .calc-sv-copy-m").length') >= 2,
        t + 'Copy of A⁻¹ copies it apart by tabs, a line of each row', JSON.stringify(got));
    check(await paste(2, got) && await boxes() === '2||0.6|-0.7|-0.2|0.4' &&
        await page.calc('[].map.call(document.querySelectorAll("' + on + ' .calc-sv-matrix")[0].querySelectorAll(".calc-sv-cell"), function (c) { return c.textContent; }).join()') === '4,7,2,6',
        t + 'and pastes back in: the inverse of the inverse', await boxes());

    // into B of two matrices, A as it was
    await card('Two matrices');
    check(await paste(6, '[[1,2,3],[4,5,6]]') && await boxes() === '|2×3|||||1|2|3|4|5|6', t + '[[1, 2, 3], [4, 5, 6]] in B makes B 2×3, A as it was', await boxes());

    // A | b: its last column is b
    await card('A x = b');
    check(await paste(1, '2 0 4\n0 2 6') && await boxes() === '|2|0|4|0|2|6' && /^x1=2 \| x2=3/.test(await tiles()), t + 'A | b pasted whole: its last column in b', await tiles());
    check(await paste(3, '1 2') && /^b is one column/.test(await page.calc(note + '.textContent')), t + 'a row pasted in b does not go in', await page.calc(note + '.textContent'));
    check(await paste(3, '7\n8\n9') && await boxes() === '3×2|2|0|7|0|2|8|||9', t + 'a column in b goes down it, one more equation', await boxes());

    // the decimal comma: a comma of a number, a ; or a space between them
    await page.fresh(at, { format: { notation: 'norm', places: 'auto', group: 'dot' } });
    await page.click('.calc-numbers-btn');
    await card('Eigenvalues');
    check(await paste(1, '1,5\t0\n0\t2,5') && await boxes() === '|1,5|0|0|2,5' && /^λ1=1,5 \| λ2=2,5/.test(await tiles()), t + 'decimal comma: a block of a spreadsheet', await tiles());
    check(await paste(1, '[[2,5; 0]; [0; 4]]') && await boxes() === '|2,5|0|0|4', t + 'decimal comma: [[2,5; 0]; [0; 4]]', await boxes());
    check(await paste(1, '[1/3 0; 0 1]') && await boxes() === '|0,3333333333333333|0|0|1', t + 'one worked out goes in as its value', await boxes());

    // each card's Example: only while its boxes are empty, as it types over them; its boxes typed, and what they give
    var example = 'document.querySelector("' + on + ' .calc-sv-example").hidden';
    function empty() { // every box of the card open emptied, as typed, one at a time: a size emptied makes its boxes again
        return page.calc('(function () { var b; while ((b = [].filter.call(document.querySelectorAll("' + on + ' .calc-sv-boxes input"), function (x) { return x.value; })[0])) {' +
            ' b.value = ""; b.dispatchEvent(new Event("input", { bubbles: true })); } })()');
    }
    check(await page.calc(example), t + 'no Example once something is typed');
    await empty();
    check(!await page.calc(example), t + 'Example again with the boxes empty');
    await page.click(on + ' .calc-sv-example');
    check(await boxes() === '3×3|2|-1|0|-1|2|-1|0|-1|2' && /^λ1=0,58578643762\d* \| λ2=2 \| λ3=3,41421356237/.test(await tiles()), t + 'Example of eigenvalues', await tiles());
    check(await page.calc(example), t + 'no Example once it has typed its own');
    await card('A x = b');
    await empty();
    await page.click(on + ' .calc-sv-example');
    check(/^x1=5 \| x2=3 \| x3=-2/.test(await tiles()), t + 'Example of A x = b: three equations, their answers', await tiles());
    await card('Two matrices');
    await empty();
    await page.hover(on + ' .calc-sv-example');
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500) && /^Example/.test(await page.calc('document.querySelector(".calc-tip").textContent')),
        t + 'Example has a tip', await page.calc('document.querySelector(".calc-tip").textContent'));
    await page.click(on + ' .calc-sv-example');
    check(/A × B=5864139154/.test(await tiles()), t + 'Example of two matrices: A × B of a 2×3 and a 3×2', await tiles());
}

// The Finance tab of the solver: money over time as a BA II Plus works it out, NPV and IRR, a
// payment schedule as a table to copy, and APR and APY. With the decimal comma and fraction mode
async function finance(page, at) {
    var t = at + ': finance: ', on = '.calc-solve .calc-sv-item.calc-on',
        tiles = '[].map.call(document.querySelectorAll(".calc-solve .calc-sv-item.calc-on .calc-sv-tile:not(.calc-sv-table)"), function (e) {' +
            ' return e.querySelector(".calc-sv-label").textContent + "=" + e.querySelector(".calc-sv-value").textContent; }).join(" | ")',
        note = 'document.querySelector(".calc-solve .calc-sv-item.calc-on .calc-sv-note").textContent',
        rows = 'document.querySelectorAll(".calc-solve .calc-sv-table .calc-sv-cell").length / 4', got;

    // a box of the card open, typed in: one of a line, or of lines
    function set(n, text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
            '(document.querySelectorAll("' + on + ' input, ' + on + ' textarea")[' + n + '])');
    }
    async function card(name) {
        await page.calc('[].filter.call(document.querySelectorAll(".calc-solve .calc-sv-name"), function (n) { return n.textContent === ' + JSON.stringify(name) +
            '; })[0].parentNode.parentNode.click()');
        await sleep(60);
    }

    await page.fresh(at, {});
    await page.click('.calc-solve-btn');
    await page.click('.calc-solve .calc-solve-tab[data-tab="finance"]');
    check(await page.calc('[].map.call(document.querySelectorAll(".calc-solve .calc-sv-name"), function (n) { return n.textContent; }).join()') ===
        'Loan calculator,Savings growth,Interest rates,Break-even,Inflation,Depreciation,Time value of money,NPV and IRR,Bond price and yield,Percentage change',
        t + 'ten cards, the loan calculator and savings first');

    // time value of money: the one left empty is found; received above 0, paid below
    await card('Time value of money');
    check(/^Leave only one of N, I\/Y, PV, PMT and FV empty/.test(await page.calc(note)) && /Money received is above 0, money paid below 0/.test(await page.calc(note)),
        t + 'tvm: empty, it says to leave one empty, and which way the money goes', await page.calc(note));
    for (const [n, v] of [[0, '360'], [1, '6'], [2, '200000'], [4, '0']]) await set(n, v);
    check(await page.calc(tiles) === 'PMT=-1199.10 | Total paid=431676.38 | Interest paid=231676.38' && /^Money received is above 0/.test(await page.calc(note)),
        t + 'tvm: the payment of a loan, PMT left empty, below 0 as it is paid; money to the cent', await page.calc(tiles));
    await page.click(on + ' .calc-sv-opt[data-c="1"]');
    check((await page.calc(tiles)).indexOf('PMT=-1193.14 | ') === 0 && await page.calc('document.querySelector("' + on + ' .calc-sv-opt[data-c=\\"1\\"]").classList.contains("calc-on")'),
        t + 'tvm: paid at the start of each month, a little less', await page.calc(tiles));
    await page.click(on + ' .calc-sv-opt[data-c="0"]');
    await set(3, '-1500');
    await set(0, '');
    check((await page.calc(tiles)).indexOf('N=220.271307264 | ') === 0 && /N is not a whole number/.test(await page.calc(note)), t + 'tvm: N found, not a whole number', await page.calc(note));
    await set(3, '1500');
    check(/^No N makes the money balance/.test(await page.calc(note)) && await page.calc('document.querySelector("' + on + ' .calc-sv-note").classList.contains("calc-sv-warn")') &&
        await page.calc(tiles) === 'N=–', t + 'tvm: money received both ways cannot balance: said, not a wrong number', await page.calc(note));
    await set(0, '10');
    await set(3, '');
    await set(1, '-1300');
    check(/^The rate a period, I\/Y ÷ P\/Y, is above –100%/.test(await page.calc(note)) && await page.calc(tiles) === 'PMT=–', t + 'tvm: a rate a period below –100%', await page.calc(note));
    await set(1, '0');
    check((await page.calc(tiles)).indexOf('PMT=-20000.00 | ') === 0, t + 'tvm: at 0%, PV in equal parts', await page.calc(tiles));
    await set(0, '1000000');
    await set(1, '6');
    check((await page.calc(tiles)).indexOf('PMT=-1000.00 | ') === 0, t + 'tvm: a very long term: the interest alone', await page.calc(tiles));
    // a result has the tip of a result: Insert and Copy
    await page.hover(on + ' .calc-sv-tile');
    await page.until('!document.querySelector(".calc-peek").hidden', 2000);
    check(await page.calc('!document.querySelector(".calc-peek").hidden && !!document.querySelector(".calc-peek [data-act=insert]") && !!document.querySelector(".calc-peek [data-act=copy]")'),
        t + 'tvm: a result has its tip, with Insert and Copy');
    await set(0, '360');
    await page.click(on + ' .calc-sv-tile');
    check(!await open(page, '.calc-solve') && await value(page) === -1199.10105031, t + 'tvm: a click puts it in with every digit, shown to the cent', await value(page));
    await page.click('.calc-solve-btn');

    // NPV and IRR of cash flows, one to a line: Enter there is a new line
    await card('NPV and IRR');
    await page.click(on + ' textarea');
    await page.type('-1000\r300\r400\r500');
    check(await page.calc('document.querySelector("' + on + ' textarea").value') === '-1000\n300\n400\n500' &&
        await page.calc(tiles) === 'NPV=-21.04 | IRR %=8.89633946933 | Payback=2.6', t + 'npv: of flows typed one to a line, at 10%', await page.calc(tiles));
    await set(1, '-100, 230, -132');
    check(await page.calc(tiles) === 'NPV=0.00 | IRR %=10 | Payback=0.434782608696' && /more than one IRR: this one is the nearest 10%, and 20% is another/.test(await page.calc(note)),
        t + 'npv: flows that change sign twice: maybe more than one IRR', await page.calc(note));
    await set(1, '100 200');
    check(/^No IRR: the flows never change sign/.test(await page.calc(note)) && (await page.calc(tiles)).indexOf('IRR %=– | ') > 0, t + 'npv: none of flows that never change sign', await page.calc(note));
    await set(1, '-100, abc');
    check(/^abc is not a number/.test(await page.calc(note)) && await page.calc('document.querySelector("' + on + ' textarea").classList.contains("calc-bad")'),
        t + 'npv: what is not a number is marked', await page.calc(note));

    // a payment schedule: a table by year, or by payment, to copy for a spreadsheet
    await card('Loan calculator');
    for (const [n, v] of [[0, '100000'], [1, '6'], [2, '30']]) await set(n, v);
    check(await page.calc(tiles) === 'Payment=599.55 | Total interest=115838.19 | Total paid=215838.19' && await page.calc(rows) === 30 &&
        await page.calc('[].map.call(document.querySelectorAll(".calc-solve .calc-sv-th"), function (h) { return h.textContent; }).join()') === 'Year,Interest,Principal,Balance',
        t + 'schedule: the payment, the interest, and a row of each year', await page.calc(tiles));
    check(await page.calc('[].slice.call(document.querySelectorAll(".calc-solve .calc-sv-table .calc-sv-cell"), 116).map(function (c) { return c.textContent; }).join()') === '30,228.47,6966.14,0.00',
        t + 'schedule: its last year, nothing left; to the cent');
    await page.click(on + ' .calc-sv-opt[data-c="1"]');
    check(await page.calc(rows) === 360 && await page.calc('(function (c) { return c.scrollHeight > c.clientHeight; })(document.querySelector(".calc-solve .calc-sv-table .calc-sv-cells"))'),
        t + 'schedule: by payment, 360 rows, scrolling inside the card');
    await page.calc('document.addEventListener("copy", function (e) { window.copied = e.clipboardData.getData("text/plain"); })');
    await page.click(on + ' .calc-sv-copy');
    got = (await page.calc('window.copied') || '').split('\n');
    check(got.length === 362 && got[0] === 'No.\tInterest\tPrincipal\tBalance' && got[1] === '1\t500\t99.5505251528\t99900.4494748' && got[360].split('\t')[3] === '0' &&
        await open(page, '.calc-solve'), t + 'schedule: Copy table copies it apart by tabs, every digit, for a spreadsheet', got.slice(0, 2).join(' / '));
    await set(2, '100');
    check(await page.calc(rows) === 600 && /The table has the first 600 payments/.test(await page.calc(note)), t + 'schedule: a long term, up to 600 rows', await page.calc(note));
    await set(2, '2.31');
    check(/^Years × payments a year is a whole number/.test(await page.calc(note)), t + 'schedule: payments that are not whole', await page.calc(note));
    await set(2, '1');
    await set(0, '-5');
    check(await page.calc(note) === 'The loan is above 0.' && await page.calc(rows) === 0, t + 'schedule: a loan below 0', await page.calc(note));
    await set(0, '1200');
    await set(1, '0');
    check((await page.calc(tiles)).indexOf('Payment=100.00 | Total interest=0.00 | ') === 0, t + 'schedule: at 0%', await page.calc(tiles));

    // APR and APY, each of the other
    await card('Interest rates');
    await set(0, '12');
    check(await page.calc(tiles) === 'APR %=12 | APY %=12.6825030132 | A period %=1', t + 'rates: APR to APY', await page.calc(tiles));
    await set(0, '');
    await set(1, '12.6825030132');
    check((await page.calc(tiles)).indexOf('APR %=12 | ') === 0, t + 'rates: and back', await page.calc(tiles));
    await set(0, '10');
    await set(1, '');
    await set(2, 'inf');
    check((await page.calc(tiles)).indexOf('APR %=10 | APY %=10.5170918076 | ') === 0 && /all the time/.test(await page.calc(note)), t + 'rates: of interest all the time', await page.calc(tiles));

    // savings: what money grows to, with a table of each year
    await card('Savings growth');
    for (const [n, v] of [[0, '1000'], [1, '5'], [2, '10'], [4, '100']]) await set(n, v);
    check(await page.calc(tiles) === 'Balance=17175.24 | Put in=13000.00 | Interest=4175.24 | APY %=5.11618978817' && await page.calc(rows) === 10,
        t + 'savings: 100 added each month, and a row of each year', await page.calc(tiles));
    await page.click(on + ' .calc-sv-opt[data-c="1"]');
    check((await page.calc(tiles)).indexOf('Balance=17239.94 | ') === 0 && /added at the start/.test(await page.calc(note)), t + 'savings: added at the start of each month', await page.calc(tiles));
    await set(3, 'inf');
    check(/^Nothing is added with interest all the time/.test(await page.calc(note)) && await page.calc(rows) === 0, t + 'savings: nothing added all the time', await page.calc(note));

    // a bond: its price of a yield, and its yield of a price
    await card('Bond price and yield');
    for (const [n, v] of [[0, '1000'], [1, '5'], [2, '10'], [5, '6']]) await set(n, v);
    check((await page.calc(tiles)).indexOf('Price=925.61 | Yield %=6 | ') === 0, t + 'bond: the price of a yield', await page.calc(tiles));
    await set(4, '925.61');
    check(/^Leave one of Price and Yield empty/.test(await page.calc(note)), t + 'bond: both typed, said', await page.calc(note));
    await set(5, '');
    check((await page.calc(tiles)).indexOf('Yield %=6.0000370085 | Price=925.61 | ') === 0, t + 'bond: the yield of a price, worked out first', await page.calc(tiles));
    await set(2, '9.75');
    check(/Accrued=12.50 \| Dirty price=/.test(await page.calc(tiles)) && /nearer than a whole period/.test(await page.calc(note)), t + 'bond: part of a period, its accrued interest', await page.calc(tiles));

    // depreciation, by the straight line and the declining balance
    await card('Depreciation');
    for (const [n, v] of [[0, '10000'], [1, '1000'], [2, '5']]) await set(n, v);
    check(await page.calc(tiles) === 'First year=1800.00 | A year %=20 | In all=9000.00' && await page.calc(rows) === 5, t + 'depreciation: the straight line', await page.calc(tiles));
    await page.click(on + ' .calc-sv-opt[data-c="1"]');
    check((await page.calc(tiles)).indexOf('First year=4000.00 | A year %=40 | ') === 0 &&
        await page.calc('[].slice.call(document.querySelectorAll(".calc-solve .calc-sv-table .calc-sv-cell"), 16).map(function (c) { return c.textContent; }).join()') === '5,296.00,9000.00,1000.00',
        t + 'depreciation: the declining balance, down to the salvage value', await page.calc(tiles));
    await set(1, '20000');
    check(/^The salvage value is 0 or more/.test(await page.calc(note)), t + 'depreciation: a salvage above the cost', await page.calc(note));

    // break-even, inflation and percentage change
    await card('Break-even');
    for (const [n, v] of [[0, '10000'], [1, '30'], [2, '17']]) await set(n, v);
    check(await page.calc(tiles) === 'Units=769.230769231 | Sales=23076.92 | Margin each=13.00 | Margin %=43.3333333333' && /^770 whole units/.test(await page.calc(note)),
        t + 'break-even: the units, and the whole ones', await page.calc(tiles));
    await set(2, '40');
    check(/^The price is above the cost/.test(await page.calc(note)), t + 'break-even: a price below the cost', await page.calc(note));
    await card('Inflation');
    for (const [n, v] of [[0, '100'], [1, '3'], [2, '10']]) await set(n, v);
    check(await page.calc(tiles) === 'Costs then=134.39 | Worth now=74.41 | Prices ×=1.34391637934 | Value lost %=25.5906085103', t + 'inflation: on and back', await page.calc(tiles));
    await card('Percentage change');
    for (const [n, v] of [[0, '80'], [1, '100']]) await set(n, v);
    check(await page.calc(tiles) === 'Change=20 | Change %=25 | Margin %=20 | To ÷ From=1.25', t + 'percentage change: markup and margin', await page.calc(tiles));

    // the decimal comma, as in the other results; fraction mode, in its results as well
    await page.fresh(at, { format: { notation: 'norm', places: 'auto', group: 'dot' } });
    await page.click('.calc-solve-btn');
    await page.click('.calc-solve .calc-solve-tab[data-tab="finance"]');
    await card('NPV and IRR');
    await set(1, '-1000; 300,5; 400; 500');
    check(await page.calc(tiles) === 'NPV=-20,58 | IRR %=8,92002068437 | Payback=2,599', t + 'npv: with the decimal comma, and ; between', await page.calc(tiles));
    await card('Time value of money');
    for (const [n, v] of [[0, '12'], [1, '6'], [2, '1000'], [4, '0']]) await set(n, v);
    check((await page.calc(tiles)).indexOf('PMT=-86,07 | ') === 0, t + 'tvm: with the decimal comma', await page.calc(tiles));
    await page.fresh(at, { fraction: true });
    await page.click('.calc-solve-btn');
    await page.click('.calc-solve .calc-solve-tab[data-tab="finance"]');
    await card('NPV and IRR');
    await set(1, '-1000, 300, 400, 500');
    check(await page.calc('!!document.querySelectorAll(".calc-solve .calc-sv-item.calc-on .calc-sv-value")[2].querySelector(".calc-fr")'),
        t + 'npv: a payback of 2.6 as 13/5 in fraction mode', await page.calc('document.querySelectorAll(".calc-solve .calc-sv-item.calc-on .calc-sv-value")[2].innerHTML'));
}

// Sequences in the graph: a(n) of the terms before, or of n alone, with the first terms and the range of n
// in braces, as a polar curve has its range: dots at each whole n, n and a(n) under the pointer and
// along with the arrow keys, a column of the table, an example, and what stops them said
async function graphSequence(page, at) {
    var t = at + ': sequences: ', note = 'document.querySelector(".calc-graph-note").textContent',
        pop = 'document.querySelector(".calc-graph-pop").textContent.replace(/\\s+/g, " ").trim()',
        dots = '(function () { var c = document.querySelector(".calc-graph-plot canvas"), k = c.width / c.clientWidth, w = c.clientWidth, n = 0, i, x, d;' +
            ' for (x = -5; x <= 4; x++) { d = c.getContext("2d").getImageData(Math.round((w / 2 + x * w / 20) * k) - 1, Math.round((c.clientHeight / 2 - x * w / 20) * k) - 1, 3, 3).data;' +
            ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x22) < 30 && Math.abs(d[i + 1] - 0x47) < 30 && Math.abs(d[i + 2] - 0x6a) < 30) { n++; break; } } return n; })()',
        between = '(function () { var c = document.querySelector(".calc-graph-plot canvas"), k = c.width / c.clientWidth, w = c.clientWidth,' +
            ' d = c.getContext("2d").getImageData(Math.round((w / 2 - 2.5 * w / 20) * k) - 1, Math.round((c.clientHeight / 2 + 2.5 * w / 20) * k) - 1, 3, 3).data, i, n = 0;' +
            ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x22) < 30 && Math.abs(d[i + 1] - 0x47) < 30) n++; return n; })()', got;

    // a(n) = n – 5 from n = 0 to 9: a dot at x = n, y = n – 5
    await page.fresh(at, { graph: { f: ['a(n) = n - 5 {0, 9}', ''], view: null } });
    await page.click('.calc-graph-btn');
    await sleep(100);
    check(!await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")') &&
        await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-graph-rel")'), t + 'a sequence is read, with no y = before it');
    await page.hoverAt('.calc-graph-plot', 3.1, -2.1);
    check(/^Term\s*n = 3\s*a\(n\) = -2$/.test((await page.calc(note)).trim()), t + 'the pointer near a term shows its n and a(n)', await page.calc(note));
    await page.clickAt('.calc-graph-plot', 3, -2);
    check(/^Term\s*n = 3\s*a\(n\) = -2$/.test(await page.calc(pop)), t + 'a click keeps it, its popup n and a(n), no slope', await page.calc(pop));
    await page.key('ArrowRight', 39);
    check(/^Term\s*n = 4\s*a\(n\) = -1$/.test(await page.calc(pop)), t + '→ goes to the next term', await page.calc(pop));
    await page.key('ArrowLeft', 37);
    await page.key('ArrowLeft', 37);
    check(/^Term\s*n = 2\s*a\(n\) = -3$/.test(await page.calc(pop)), t + '← back', await page.calc(pop));
    for (let i = 0; i < 4; i++) await page.key('ArrowLeft', 37);
    check(/^Term\s*n = 0\s*a\(n\) = -5$/.test(await page.calc(pop)), t + 'and no farther than the first', await page.calc(pop));
    await page.click('.calc-graph-pop-row[data-put="y"]');
    check(!await open(page, '.calc-graph') && await value(page) === -5, t + 'a(n) goes in with a click', await value(page));
    await page.click('.calc-graph-btn');

    // drawn as dots at whole n, and nothing between them
    await page.calc('(function (b) { b.value = "a(n) = n {-5, 4}"; b.dispatchEvent(new Event("input", { bubbles: true })); })(document.querySelector(".calc-graph-input"))');
    await sleep(100);
    check(await page.calc(dots) === 10 && await page.calc(between) === 0, t + 'a dot in its color at each whole n, nothing between', await page.calc(dots) + ' ' + await page.calc(between));

    // what stops it, said
    await page.calc('(function (b) { b.value = "a(n) = a(n - 1) + a(n - 2) {a(1) = 1}"; b.dispatchEvent(new Event("input", { bubbles: true })); })(document.querySelector(".calc-graph-input"))');
    await sleep(100);
    check(await page.calc(note) === 'a(2) is of a(0), before its first term: give that one too, {a(0) = …}.', t + 'a term before the first is said, not a crash', await page.calc(note));
    await page.calc('(function (b) { b.value = "a(n) = 2^n {1, 5000}"; b.dispatchEvent(new Event("input", { bubbles: true })); })(document.querySelector(".calc-graph-input"))');
    await sleep(100);
    check(await page.calc(note) === 'a(1024) is too large to draw: the sequence stops there.', t + 'a term too large stops it, said', await page.calc(note));

    // the table: n and a(n), from its first n by 1
    await page.calc('(function (b) { b.value = "a(n) = a(n - 1) + a(n - 2) {a(1) = 1, a(2) = 1}"; b.dispatchEvent(new Event("input", { bubbles: true })); })(document.querySelector(".calc-graph-input"))');
    await page.click('.calc-graph-tab[data-tab="table"]');
    got = await page.calc('[].slice.call(document.querySelectorAll(".calc-graph-line"), 0, 8).map(function (l) { return [].map.call(l.children, function (c) { return c.textContent; }).join(" "); }).join(" | ")');
    check(got === 'n a(n) | 1 1 | 2 1 | 3 2 | 4 3 | 5 5 | 6 8 | 7 13', t + 'the table lists n and a(n)', got);
    await page.click('.calc-graph-tab[data-tab="graph"]');

    // an example
    await page.click('.calc-graph-tab[data-tab="examples"]');
    await page.type('fibonacci\r');
    await sleep(200);
    check(await page.calc('document.querySelector(".calc-graph-input").value') === 'a(n) = a(n - 1) + a(n - 2) {a(1) = 1, a(2) = 1} {1, 15}' &&
        !await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")'), t + 'an example of them, drawn',
        await page.calc('document.querySelector(".calc-graph-input").value'));
}

// Slope fields: dy/dx = x – y, a short line at each place at its slope, and the solution through
// each start; pointed at, clicked and traced as a curve; a click off the curves adding one to the
// braces; what stops one, said; with the decimal comma; an example
async function graphSlopeField(page, at) {
    var t = at + ': slope fields: ', note = 'document.querySelector(".calc-graph-note").textContent',
        pop = 'document.querySelector(".calc-graph-pop").textContent.replace(/\\s+/g, " ").trim()', box = 'document.querySelector(".calc-graph-input").value',
        // the pixels of the first curve's color about x, y, within 2 pixels of it
        inked = function (x, y) {
            return '(function () { var c = document.querySelector(".calc-graph-plot canvas"), k = c.width / c.clientWidth, w = c.clientWidth, n = 0, i,' +
                ' d = c.getContext("2d").getImageData(Math.round((w / 2 + ' + x + ' * w / 20) * k) - 2, Math.round((c.clientHeight / 2 - ' + y + ' * w / 20) * k) - 2, 5, 5).data;' +
                ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x22) < 30 && Math.abs(d[i + 1] - 0x47) < 30 && Math.abs(d[i + 2] - 0x6a) < 30) n++; return n; })()';
        },
        // the pixels darker than the paper in a square of 22 pixels about x, y: the lines of the field there
        lines = function (x, y) {
            return '(function () { var c = document.querySelector(".calc-graph-plot canvas"), k = c.width / c.clientWidth, w = c.clientWidth, n = 0, i,' +
                ' d = c.getContext("2d").getImageData(Math.round((w / 2 + ' + x + ' * w / 20 - 11) * k), Math.round((c.clientHeight / 2 - ' + y + ' * w / 20 - 11) * k), Math.round(22 * k), Math.round(22 * k)).data;' +
                ' for (i = 0; i < d.length; i += 4) if (d[i] < 150 && d[i + 2] > d[i]) n++; return n; })()';
        };
    function type(text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })(document.querySelector(".calc-graph-input"))');
    }

    await page.fresh(at, { graph: { f: ['dy/dx = x - y {y(0) = 1}', ''], view: null } });
    await page.click('.calc-graph-btn');
    await sleep(100);
    check(!await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")') &&
        await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-graph-rel")'), t + 'dy/dx = x – y is read, not as an equation of d, with no y′ of its own');
    check(await page.calc(inked(2, 1 + 2 * Math.exp(-2))) > 0 && await page.calc(inked(0, 1)) > 0 && await page.calc(inked(-4, 4)) === 0,
        t + 'its solution through (0, 1) is drawn, x – 1 + 2e^(–x), and nothing of its color off it');
    check(await page.calc(lines(-6, -6)) > 4 && await page.calc(lines(6, 6)) > 4, t + 'and a line of the field at each place', await page.calc(lines(-6, -6)));
    check(await page.calc(note) === 'Point for values; click off the curves for a solution there.', t + 'the note says what a click does', await page.calc(note));
    await page.hoverAt('.calc-graph-plot', 2, 1.3);
    check(/^Solution through \(0, 1\)\s*x = 2\s*y = 1\.27067/.test((await page.calc(note)).trim()), t + 'pointed at, a solution: where it starts, x and y', await page.calc(note));
    await page.clickAt('.calc-graph-plot', 2, 1.27);
    check(/^Solution through \(0, 1\)\s*x = 2\s*y = 1\.27067\d*\s*Slope = 0\.72932/.test(await page.calc(pop)), t + 'clicked, its popup: x, y and the slope of the field there', await page.calc(pop));
    await page.key('ArrowRight', 39);
    check(/^Solution through \(0, 1\)\s*x = 2\.\d+\s*y = 1\.\d+\s*Slope = /.test(await page.calc(pop)), t + '→ goes along it', await page.calc(pop));
    await page.click('.calc-graph-pop-row[data-put="m"]');
    check(!await open(page, '.calc-graph') && await value(page) > 0.7 && await value(page) < 0.8, t + 'its slope goes in with a click', await value(page));
    await page.click('.calc-graph-btn');

    // a click off the curves: the solution through there, its start in the braces
    await page.clickAt('.calc-graph-plot', -6, 6);
    check(await page.calc(box) === 'dy/dx = x - y {y(0) = 1, y(-6) = 6}' && /^Solution through \(-6, 6\)\s*x = -6\s*y = 6\s*Slope = -12/.test(await page.calc(pop)) &&
        await page.calc(inked(-6, 6)) > 0, t + 'a click off the curves adds the solution through there, its popup open', await page.calc(box) + ' / ' + await page.calc(pop));
    await type('dy/dx = x - y');
    await sleep(100);
    check(await page.calc(inked(0, 1)) === 0, t + 'taken out of the braces, it is gone');

    // what stops one, said
    await type('dy/dx = -x/y {y(0) = 3}');
    await sleep(100);
    check(await page.calc(note) === 'The solution through (0, 3) stops at x = -3: it goes straight up or down there.', t + 'one that goes straight down stops, said', await page.calc(note));
    await type('dy/dx = sqrt(x) {y(1) = 0}');
    await sleep(100);
    check(await page.calc(note) === 'The solution through (1, 0) stops at x = 0: its slope has no value there.', t + 'one of no slope past 0 stops, said', await page.calc(note));
    await type('dy/dx = sqrt(-1 - x^2)');
    await sleep(100);
    check(await page.calc(note) === 'The slope has no value anywhere in the view.' && await page.calc(lines(-6, -6)) === 0, t + 'a field of no value anywhere, said', await page.calc(note));

    // with the decimal comma: ; between the starts
    await page.fresh(at, { format: { notation: 'norm', places: 'auto', group: 'dot' }, graph: { f: ['dy/dx = x - y {y(0) = 0,5}', ''], view: null } });
    await page.click('.calc-graph-btn');
    await sleep(100);
    check(await page.calc(inked(0, 0.5)) > 0, t + 'decimal comma: its start 0,5');
    await page.clickAt('.calc-graph-plot', -6, 6);
    check(await page.calc(box) === 'dy/dx = x - y {y(0) = 0,5; y(-6) = 6}', t + 'decimal comma: a start added after a ;', await page.calc(box));

    // an example
    await page.click('.calc-graph-tab[data-tab="examples"]');
    await page.type('circles\r');
    await sleep(200);
    check(await page.calc(box) === 'dy/dx = -x/y {y(0) = 3}' && !await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")'),
        t + 'an example of them, drawn', await page.calc(box));
}

// The history exported: a menu below its button, as the right click's, to copy it as text or save
// it as a CSV file or a text file. The CSV of RFC 4180, apart by ; with the decimal comma, and a
// cell a spreadsheet would read as a formula made text
async function historyExport(page, at) {
    var t = at + ': history export: ', items = '[].map.call(document.querySelectorAll(".calc-menu-box > div"), function (d) { return d.textContent; }).join("|")',
        saved = 'JSON.stringify(window.saved)', got;
    // what a save gives: its name and its text, from the link it clicks
    function stub() {
        return page.calc('(function (w) { w.saved = []; w.HTMLAnchorElement.prototype.click = function () { var a = this;' +
            ' fetch(a.href).then(function (r) { return r.arrayBuffer(); }).then(function (b) {' +
            ' w.saved.push({ name: a.download, text: new TextDecoder("utf-8", { ignoreBOM: true }).decode(b) }); }); }; })(document.defaultView)');
    }
    await page.fresh(at, {});
    check(await page.calc('document.querySelector(".calc-past-export").classList.contains("calc-off")'), t + 'with no history, its button is off');
    await page.type('1+2\r');
    await page.type('5-8\r');
    await page.type('2*0.5\r');
    await page.click('.calc-hist');
    check(!await page.calc('document.querySelector(".calc-past-export").classList.contains("calc-off")'), t + 'with a history, it is on');
    await page.click('.calc-past-export');
    check(await page.calc(items) === 'Copy as text|Save as CSV|Save as text' && await page.calc('!document.querySelector(".calc-menu-box").hidden'), t + 'its menu', await page.calc(items));
    await page.click('.calc-past-export');
    check(await page.calc('document.querySelector(".calc-menu-box").hidden'), t + 'its button again shuts it');
    await page.calc('document.addEventListener("copy", function (e) { window.copied = e.clipboardData.getData("text/plain"); })');
    await page.click('.calc-past-export');
    await page.click('.calc-menu-box > div:nth-child(1)');
    check(await page.calc('window.copied') === '1 + 2 = 3\n5 − 8 = -3\n2 × 0.5 = 1\n' || await page.calc('window.copied') === '1 + 2 = 3\n5 – 8 = -3\n2 × 0.5 = 1\n',
        t + 'copied as text, a line of each, the oldest first', JSON.stringify(await page.calc('window.copied')));
    await stub();
    await page.click('.calc-past-export');
    await page.click('.calc-menu-box > div:nth-child(2)');
    await page.until('window.saved.length === 1');
    got = JSON.parse(await page.calc(saved))[0];
    check(/^calculator-history-\d{4}-\d\d-\d\d\.csv$/.test(got.name) && got.name.indexOf(await page.ev('new Date().getFullYear()')) > 0, t + 'saved as calculator-history-YYYY-MM-DD.csv', got.name);
    check(/^\ufeffexpression,result\r\n1 \+ 2,3\r\n5 . 8,-3\r\n2 × 0\.5,1\r\n$/.test(got.text), t + 'the CSV: its heads, an equation and its result each line, -3 a number', JSON.stringify(got.text));
    await page.click('.calc-past-export');
    await page.click('.calc-menu-box > div:nth-child(3)');
    await page.until('window.saved.length === 2');
    got = JSON.parse(await page.calc(saved))[1];
    check(/\.txt$/.test(got.name) && /^1 \+ 2 = 3\n/.test(got.text), t + 'saved as a text file of the lines', JSON.stringify(got));

    // quoted as RFC 4180 has it, and apart by ; with the decimal comma; a formula made text
    await page.fresh(at, { format: { notation: 'norm', places: 'auto', group: 'dot' } });
    await page.type('1,5+1\r');
    await page.key('Delete', 46); // AC: a new calculation, not one from Ans
    await page.calc('document.body.dispatchEvent(Object.assign(new Event("paste", { bubbles: true }), { clipboardData: { getData: function () { return "-2-1"; } } }))');
    await page.type('\r');
    await page.click('.calc-hist');
    await stub();
    await page.click('.calc-past-export');
    await page.click('.calc-menu-box > div:nth-child(2)');
    await page.until('window.saved.length === 1');
    got = JSON.parse(await page.calc(saved))[0].text.replace(/^\ufeff/, '');
    check(/^expression;result\r\n1,5 \+ 1;2,5\r\n/.test(got) && /\r\n.2 . 1;-3\r\n$/.test(got), t + 'the CSV with the decimal comma: apart by ;, -2 – 1 not made text', JSON.stringify(got));

    // empty again: the history closes, its button off
    await page.click('.calc-past-export ~ .calc-past-clear');
    check(await page.calc('document.querySelector(".calc-past-export").classList.contains("calc-off")') && !await page.calc('document.querySelector(".calc-past-export").closest(".calc-past").classList.contains("calc-open")'),
        t + 'cleared, its button is off again');
}

async function graphBig(page, at) {
    var t = at + ': big: ', big = 'document.getElementById("calculator").classList.contains("calc-big")',
        plot = 'document.querySelector(".calc-graph-plot")',
        sent = 'JSON.stringify(document.defaultView.sent)',
        // what popup.js asks of the extension, kept to be read; window.chrome cannot be set over
        unit, stub = 'window.sent = []; window.close = function () { window.sent.push("close"); };' +
            ' Object.defineProperty(window, "chrome", { configurable: true, value:' +
            ' { runtime: { sendMessage: function (m) { window.sent.push(m); return Promise.resolve(); } } } });',
        script;

    // the popup asks for the graph's window, and stays as it is
    await page.fresh(at, { graph: { f: ['x^2-3', '', ''], view: null } });
    await page.calc('(function (w) { w.sent = []; Object.defineProperty(w, "chrome", { configurable: true, value:' +
        ' { runtime: { sendMessage: function (m) { w.sent.push(m); return Promise.resolve(); } } } }); })(document.defaultView)');
    await page.click('.calc-graph-btn');
    await page.click('.calc-graph-size');
    check(await page.calc(sent) === '[{"command":"open-graph"}]' && !await page.calc(big) && await open(page, '.calc-graph'),
        t + 'the popup asks for the graph\'s own window', await page.calc(sent));

    // the graph's window: only the graph, big, without pop in or a close button
    await page.send('Page.enable'); // for the script before the page's own
    script = (await page.send('Page.addScriptToEvaluateOnNewDocument', { source: stub })).result.identifier;
    await page.go(page.base + '/popup.html?graph', [700, 500]);
    check(await page.calc(big) && await open(page, '.calc-graph') && await page.calc(plot + '.clientWidth') > 350 &&
        await page.ev('document.title') === 'Graph' && !await page.calc('document.querySelector(".calc-graph .calc-past-close").offsetWidth'),
        !await page.calc('document.querySelector(".calc-graph-size").offsetWidth'),
        t + 'its window has only the graph, big, without pop in or a close button', await page.calc(plot + '.clientWidth'));
    check(await page.calc('document.querySelector(".calc-graph-input").value') === 'x^2-3', t + 'with the functions of the calculator');

    // a value put in: the calculation has it, the calculator is asked to come up, the window stays
    await page.ev('localStorage.setItem("stat", JSON.stringify("1 2 3"))'); // as the calculator changed it meanwhile
    await page.clickAt('.calc-graph-plot', 0, -3);
    await page.click('.calc-graph-pop-row[data-put="y"]');
    check(await page.calc(big) && await open(page, '.calc-graph') && /"show-calculator"/.test(await page.calc(sent)) &&
        /-3/.test(await page.ev('localStorage.getItem("calc")')), t + 'y put in: saved for the calculator, which is asked for; the graph stays',
        await page.calc(sent));
    check(await page.ev('localStorage.getItem("stat")') === '"1 2 3"', t + 'only the graph and the calculation are saved, not what it had of the rest');

    // the calculator changes the graph: the window follows it
    await page.ev('(function (v) { localStorage.setItem("graph", v); dispatchEvent(new StorageEvent("storage", { key: "graph", newValue: v })); })' +
        '(JSON.stringify({ f: ["x+1", "", ""], view: null }))');
    check(await page.calc('document.querySelector(".calc-graph-input").value') === 'x+1', t + 'a graph changed in the calculator shows here');
    unit = await page.calc('document.querySelector(".calc-rad").textContent');
    await page.ev('(function (v) { localStorage.setItem("deg", v); dispatchEvent(new StorageEvent("storage", { key: "deg", newValue: v })); })' +
        '(localStorage.getItem("deg") === "true" ? "false" : "true")');
    check(await page.calc('document.querySelector(".calc-rad").textContent') !== unit, t + 'and its angle unit',
        unit + ' / ' + await page.calc('document.querySelector(".calc-rad").textContent'));

    // Esc closes the window
    await page.key('Escape', 27);
    check(/"close"/.test(await page.calc(sent)) && await page.calc(big), t + 'Esc closes the window; never small in it', await page.calc(sent));
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
}

// A slider for each letter of the functions but x: at 1 from -10 to 10, it moves the curves
// as it is dragged; its value and its ends can be typed. They wait for the typing of a
// function to stop, so sin is not s, i and n; they are kept with the graph
async function graphSlide(page, at) {
    var t = at + ': sliders: ', note = 'document.querySelector(".calc-graph-note").textContent',
        letters = '[].map.call(document.querySelectorAll(".calc-graph-slider"), function (r) { return r.dataset.k; }).join()',
        saved = 'JSON.stringify(JSON.parse(localStorage.getItem("graph")).p)',
        b = 'document.querySelector(".calc-graph-slider[data-k=b] .calc-graph-val input").value',
        playing = 'document.querySelector(".calc-graph-slider[data-k=b] .calc-graph-play").classList.contains("calc-on")', n,
        set = function (selector, v) { // a value put in a box or the slider, as typing or dragging does
            return page.calc('(function (i) { i.focus(); i.value = ' + JSON.stringify(v) + '; i.dispatchEvent(new Event("input", { bubbles: true }));' +
                ' i.dispatchEvent(new Event("change", { bubbles: true })); })(document.querySelector(' + JSON.stringify(selector) + '))');
        };

    await page.fresh(at, {});
    await page.click('.calc-graph-btn');
    await page.type('sin(x)');
    check(await page.calc(letters) === '', t + 'sin typed is not s, i and n');
    await page.calc('(function (i) { i.value = ""; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-graph-input"))');
    await page.type('a x^2 + b');
    check(await page.calc(letters) === '', t + 'while a function is typed, no sliders yet');
    check(await page.until('document.querySelectorAll(".calc-graph-slider").length === 2', 2000) && await page.calc(letters) === 'a,b',
        t + 'once the typing stops, one for a and one for b', await page.calc(letters));
    check(await page.calc('document.querySelector(".calc-graph-slider[data-k=b] .calc-graph-val input").value') === '1' &&
        await page.calc('[].map.call(document.querySelectorAll(".calc-graph-slider[data-k=a] .calc-graph-end"), function (e) { return e.value; }).join()') ===
        '-10,10', t + 'each at 1, from -10 to 10');
    await page.hoverAt('.calc-graph-plot', 0, 1);
    check(/^Min, y-intercept\s*x = 0\s*y = 1/.test(await page.calc(note)), t + 'a x² + b with both 1: its low at 0, 1', await page.calc(note));

    // dragged, the curve follows; a value typed, too
    await set('.calc-graph-slider[data-k=b] .calc-graph-range', '-3');
    check(await page.calc('document.querySelector(".calc-graph-slider[data-k=b] .calc-graph-val input").value') === '-3', t + 'the slider shows its value');
    await page.hoverAt('.calc-graph-plot', 0, -3);
    check(/^Min, y-intercept\s*x = 0\s*y = -3/.test(await page.calc(note)), t + 'b dragged to -3: the low is at -3', await page.calc(note));
    await set('.calc-graph-slider[data-k=a] .calc-graph-val input', '-');
    check(!await page.calc('document.querySelector(".calc-graph-slider[data-k=a] .calc-graph-val").classList.contains("calc-bad")'),
        t + 'a minus sign just typed is not marked');
    await set('.calc-graph-slider[data-k=a] .calc-graph-val input', '25');
    check(await page.calc('document.querySelectorAll(".calc-graph-slider[data-k=a] .calc-graph-end")[1].value') === '25' &&
        await page.calc('document.querySelector(".calc-graph-slider[data-k=a] .calc-graph-range").max') === '25',
        t + 'a value typed beyond the end takes the end there');
    await set('.calc-graph-slider[data-k=a] .calc-graph-end', '30');
    check(await page.calc('document.querySelector(".calc-graph-slider[data-k=a] .calc-graph-end").classList.contains("calc-bad")') &&
        await page.calc('document.querySelector(".calc-graph-slider[data-k=a] .calc-graph-range").min') === '-10',
        t + 'a start past the end is marked, and not taken');
    await page.calc('document.activeElement.blur()');
    check(await page.until('document.querySelector(".calc-graph-slider[data-k=a] .calc-graph-end").value === "-10"', 1000),
        t + 'left, it shows the start again');
    await set('.calc-graph-slider[data-k=b] .calc-graph-end', '-5');
    check(await page.calc('document.querySelector(".calc-graph-slider[data-k=b] .calc-graph-range").step') === '0.1',
        t + 'the step suits the ends');
    check(await page.calc(saved) === '{"a":[25,-10,25],"b":[-3,-5,10]}', t + 'the values and the ends are saved with the graph', await page.calc(saved));

    // ▶ plays b: up from -3, the curve with it; paused, it stops at a value of its step and is kept
    await page.calc('document.activeElement.blur()');
    await page.hover('.calc-graph-slider[data-k=b] .calc-graph-play');
    check(await page.until('/^Play/.test(document.querySelector(".calc-tip").textContent)', 2000), t + 'play has its tip');
    await page.click('.calc-graph-slider[data-k=b] .calc-graph-play');
    check(await page.calc(playing) && await page.until('+' + b + ' > -2.5', 2000) && await page.calc(b) !== '-3', t + 'play: b goes up', await page.calc(b));
    await page.click('.calc-graph-slider[data-k=b] .calc-graph-play');
    n = await page.calc(b);
    await sleep(200);
    check(!await page.calc(playing) && /^-?\d+(\.\d)?$/.test(n) && await page.calc(b) === n &&
        await page.calc('JSON.parse(localStorage.getItem("graph")).p.b[0]') === +n, t + 'paused: it stays, at a tenth, and is kept', n);
    await set('.calc-graph-slider[data-k=b] .calc-graph-val input', '10');
    await page.calc('document.activeElement.blur()');
    await page.click('.calc-graph-slider[data-k=b] .calc-graph-play');
    check(await page.until('+' + b + ' < 9.5', 2000), t + 'from the top end it goes down', await page.calc(b));
    await set('.calc-graph-slider[data-k=b] .calc-graph-range', '-3');
    await sleep(200);
    check(!await page.calc(playing) && await page.calc(b) === '-3', t + 'dragged, it stops', await page.calc(b));

    // the popup of a point clicked moves with it while b plays: the pointer on it stops b, and its y goes in
    await page.clickAt('.calc-graph-plot', 0.3, -0.75);
    check(/^On the curve/.test(await page.calc('document.querySelector(".calc-graph-pop").textContent.trim()')), t + 'a point on the curve');
    await page.click('.calc-graph-slider[data-k=b] .calc-graph-play');
    check(await page.until('+' + b + ' > -2', 2000), t + 'played, b goes up', await page.calc(b));
    await page.hover('.calc-graph-pop-row[data-put="y"]');
    check(!await page.calc(playing), t + 'the pointer on the popup stops b');
    await page.click('.calc-graph-pop-row[data-put="y"]', 150);
    check(!await page.calc(playing) && !await open(page, '.calc-graph') && await value(page) > -0.2, t + 'its y pressed: b stops and the y goes in',
        await shown(page));
    await page.click('.calc-graph-btn');
    await page.click('.calc-graph-slider[data-k=b] .calc-graph-play');
    await page.key('Escape', 27);
    check(!await open(page, '.calc-graph') && !await page.calc(playing), t + 'closed, it stops');
    await page.click('.calc-graph-btn');
    await set('.calc-graph-slider[data-k=b] .calc-graph-range', '-3');

    // the table follows the letters too
    await page.click('.calc-graph-tab[data-tab="table"]');
    await page.calc('(function (i) { i.value = "0"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-graph-from"))');
    check(await page.calc('[].map.call(document.querySelectorAll(".calc-graph-line:nth-child(2) > span"), function (c) { return c.textContent; }).join(" | ")') ===
        '0 | -3',
        t + 'the table has their values');
    await page.click('.calc-graph-tab[data-tab="graph"]');

    // kept: the sliders are there as soon as the graph opens
    await page.go(page.base + at);
    await page.click('.calc-graph-btn');
    check(await page.calc(letters) === 'a,b' && await page.calc('document.querySelector(".calc-graph-slider[data-k=a] .calc-graph-val input").value') === '25',
        t + 'kept, and shown at once when the graph opens');

    // a letter no longer in the functions: its slider goes; Clear: no sliders
    await page.calc('(function (i) { i.value = "a x"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-graph-input"))');
    check(await page.until('document.querySelectorAll(".calc-graph-slider").length === 1', 2000) && await page.calc(letters) === 'a',
        t + 'b gone from the function: its slider goes');
    await page.click('.calc-graph .calc-past-clear');
    check(await page.calc('document.querySelector(".calc-graph-sliders").hidden') && await page.calc(saved) === '{}', t + 'Clear: no sliders');
}

// Up to seven curves: the + adds a box, its × removes one and the curves below move up with
// their colors; more than three boxes scroll in the small panel, and the table across
async function graphMany(page, at) {
    var t = at + ': seven: ', shown = 'document.querySelectorAll(".calc-graph-fn:not([hidden])").length',
        colors = '[].map.call(document.querySelectorAll(".calc-graph-fn:not([hidden]) .calc-graph-swatch"),' +
            ' function (d) { return d.style.getPropertyValue("--c"); }).join(" ")',
        values = '[].map.call(document.querySelectorAll(".calc-graph-input"), function (b) { return b.value; }).slice(0, 6).join()',
        first, rest, n;

    await page.fresh(at, {});
    await page.click('.calc-graph-btn');
    await page.type('x\r'); // Enter after the last box with a function: a new box
    check(await page.calc(shown) === 2 && await page.calc('document.activeElement === document.querySelectorAll(".calc-graph-input")[1]'),
        t + 'Enter after the last function adds a box');
    await page.key('Enter', 13);
    check(await page.calc(shown) === 2, t + 'not after an empty one');
    await page.type('x+1');
    for (n = 2; n < 7; n++) {
        await page.click('.calc-graph-add');
        await page.type('x+' + n);
    }
    check(await page.calc(shown) === 7 && await page.calc('document.querySelector(".calc-graph-add").hidden'), t + 'seven boxes, and then no +');
    first = await page.calc(colors);
    check(new Set(first.split(' ')).size === 7, t + 'each curve in its own color', first);
    check(await page.calc('(function (l) { return l.classList.contains("calc-graph-many") && l.scrollHeight > l.clientHeight + 20 &&' +
        ' l.clientHeight < 100; })(document.querySelector(".calc-graph-fns"))') &&
        await page.calc('document.querySelector(".calc-graph-plot").clientHeight') > 150, t + 'the boxes scroll, the plot keeps its room',
        await page.calc('document.querySelector(".calc-graph-plot").clientHeight'));

    // the third removed: the ones below move up with their colors, the + is back
    await page.click('.calc-graph-fn:nth-child(3) .calc-graph-del');
    rest = first.split(' ').filter(function (c, i) { return i !== 2; }).join(' ');
    check(await page.calc(values) === 'x,x+1,x+3,x+4,x+5,x+6' && await page.calc(shown) === 6 &&
        !await page.calc('document.querySelector(".calc-graph-add").hidden'), t + 'the × removes its curve; the ones below move up',
        await page.calc(values));
    check(await page.calc(colors) === rest, t + 'each keeps its color', await page.calc(colors));
    await page.click('.calc-graph-add');
    check((await page.calc(colors)).split(' ')[6] === first.split(' ')[2], t + 'the new box gets the color that is free');
    await page.click('.calc-graph-fn:nth-child(7) .calc-graph-del');

    // the table: a column for each, scrolled across in the small panel
    await page.click('.calc-graph-tab[data-tab="table"]');
    check(await page.calc('(function (l) { return l.scrollWidth > l.clientWidth + 50; })(document.querySelector(".calc-graph-list"))'),
        t + 'six columns are wider than the panel: the table scrolls across');
    check(/^-?\d/.test(await page.calc('document.querySelector(".calc-graph-line:nth-child(2) > span:nth-child(7)").textContent')),
        t + 'with room for each value', await page.calc('document.querySelector(".calc-graph-line:nth-child(2) > span:nth-child(7)").textContent'));
    await page.click('.calc-graph-tab[data-tab="graph"]');

    // kept: the boxes and their colors
    await page.go(page.base + at);
    await page.click('.calc-graph-btn');
    check(await page.calc(shown) === 6 && await page.calc(colors) === rest, t + 'the boxes and their colors are kept', await page.calc(colors));

    // a graph saved as the three boxes were: up to the last one filled
    await page.fresh(at, { graph: { f: ['x', 'x^2', ''], view: null } });
    await page.click('.calc-graph-btn');
    check(await page.calc(shown) === 2 && /^#22476a #b0414d$/i.test(await page.calc(colors)), t + 'an old graph opens with its curves',
        await page.calc(colors));
}

// a curve hidden and shown by a click on its dot; the graph saved or copied as a picture
async function graphHide(page, at) {
    var t = at + ': hide: ', note = 'document.querySelector(".calc-graph-note").textContent',
        navy = '(function (c) { var d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, n = 0, i;' +
            ' for (i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x22) < 24 && Math.abs(d[i + 1] - 0x47) < 24 &&' +
            ' Math.abs(d[i + 2] - 0x6a) < 24 && d[i + 3] > 200) n++; return n; })(document.querySelector(".calc-graph-plot canvas"))',
        saved = 'JSON.stringify(JSON.parse(localStorage.getItem("graph")).off)';

    await page.fresh(at, { graph: { f: ['x^2-3', '1/x', ''], view: null } });
    await page.click('.calc-graph-btn');
    check(await page.calc(navy) > 200, t + 'the first curve is drawn');
    await page.click('.calc-graph-fn:nth-child(1) .calc-graph-swatch');
    check(await page.calc(navy) === 0 && await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-graph-off")') &&
        await page.calc('document.querySelector(".calc-graph-input").value') === 'x^2-3', t + 'a click on its dot hides it; what is typed stays');
    check(await page.calc(saved) === '[true,false]', t + 'hidden, kept', await page.calc(saved));
    await page.hoverAt('.calc-graph-plot', 0, -3);
    check(!/^Min/.test(await page.calc(note)), t + 'its points are gone too', await page.calc(note));

    await page.click('.calc-graph-fn:nth-child(2) .calc-graph-swatch');
    check(/^Every curve is hidden/.test(await page.calc(note)), t + 'with both hidden the line says how to show one', await page.calc(note));
    await page.click('.calc-graph-add');
    await page.click('.calc-graph-fn:nth-child(3) .calc-graph-swatch');
    check(!await page.calc('document.querySelectorAll(".calc-graph-fn")[2].classList.contains("calc-graph-off")'), t + 'the dot of an empty box does nothing');
    await page.click('.calc-graph-fn:nth-child(3) .calc-graph-del');

    // the table leaves a hidden curve out
    await page.click('.calc-graph-fn:nth-child(2) .calc-graph-swatch');
    await page.click('.calc-graph-tab[data-tab="table"]');
    check(await page.calc('document.querySelectorAll(".calc-graph-names .calc-graph-swatch").length') === 1, t + 'the table has only the curve shown');
    await page.click('.calc-graph-tab[data-tab="graph"]');

    // kept after closing; the picture: the menu of the plot, and the button saves graph.png
    await page.go(page.base + at);
    await page.click('.calc-graph-btn');
    check(await page.calc(navy) === 0 && await page.calc(saved) === '[true,false]', t + 'still hidden when opened again', await page.calc(saved));
    await page.rightClick('.calc-graph-plot');
    check(await menu(page) === 'Copy picture|Save picture', t + 'the plot has Copy picture and Save picture', await menu(page));
    await page.click('.calc-graph-note'); // the menu goes; Esc would close the graph too
    check(await open(page, '.calc-graph') && await page.calc('document.querySelector(".calc-menu-box").hidden'), t + 'a click away closes the menu');
    await page.calc('(function (w) { w.saved = null; var make = w.URL.createObjectURL;' + // in the calculator's window, an iframe in the popup
        ' w.URL.createObjectURL = function (b) { w.saved = { size: b.size, type: b.type }; return make.call(w.URL, b); };' +
        ' w.HTMLAnchorElement.prototype.click = function () { w.saved.name = this.download; }; })(document.defaultView)');
    await page.click('.calc-graph-zoom [data-zoom="save"]');
    for (var wait = 0; wait < 60 && !await page.calc('!!(document.defaultView.saved && document.defaultView.saved.name)'); wait++) await sleep(100); // the picture is made apart
    check(await page.calc('(function (s) { return JSON.stringify(s && [s.name, s.type, s.size > 2000]); })(document.defaultView.saved)') ===
        '["graph.png","image/png",true]', t + 'the button saves the picture as graph.png', await page.calc('JSON.stringify(document.defaultView.saved)'));

    // Clear shows every curve again
    await page.click('.calc-graph .calc-past-clear');
    check(await page.calc(saved) === '[false]', t + 'Clear shows them all again, in one box', await page.calc(saved));
}

// the table of the graph: x by a step and y of each curve, its values put in with a click
async function graphTable(page, at) {
    var t = at + ': table: ', note = 'document.querySelector(".calc-graph-note").textContent',
        row = function (n) { // the texts of a row of values, the first row 1
            return page.calc('[].map.call(document.querySelectorAll(".calc-graph-line:nth-child(' + (n + 1) + ') > span"),' +
                ' function (c) { return c.textContent; }).join(" | ")');
        },
        rows = 'document.querySelectorAll(".calc-graph-line:not(.calc-graph-names)").length';

    await page.fresh(at, { graph: { f: ['x^2-3', '1/x', ''], view: null } });
    await page.click('.calc-graph-btn');
    await page.click('.calc-graph-tab[data-tab="table"]');
    check(await page.calc('document.querySelector(".calc-graph-plot").hidden && !document.querySelector(".calc-graph-table").hidden'),
        t + 'the tab shows the table in place of the plot');
    check(await row(1) === '-10 | 97 | -0.1', t + 'from the left of the view, x = -10: 97 and -0.1', await row(1));
    check(await page.calc('document.querySelector(".calc-graph-from").placeholder + " " + document.querySelector(".calc-graph-by").placeholder') === '-10 1',
        t + 'the empty boxes say what they go by');
    check(await page.calc('document.querySelectorAll(".calc-graph-names .calc-graph-swatch").length') === 2, t + 'a column for each curve, in its color');
    check(/^Click a value/.test(await page.calc(note)), t + 'the line says what a click does', await page.calc(note));

    // a start and a step of one's own; where a curve has no value, a dash
    await page.click('.calc-graph-from');
    await page.type('0');
    await page.calc('(function (i) { i.value = "0.5"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-graph-by"))');
    check(await row(1) === '0 | -3 | –' && await row(2) === '0.5 | -2.75 | 2', t + 'from 0 by 0.5; 1/x has no value at 0', await row(1) + ' / ' + await row(2));
    check(await page.calc(rows) === 60, t + '60 rows at first', await page.calc(rows));
    await page.calc('(function (l) { l.scrollTop = l.scrollHeight; l.dispatchEvent(new Event("scroll")); })(document.querySelector(".calc-graph-list"))');
    check(await page.calc(rows) === 120, t + 'scrolled to the end, 60 more', await page.calc(rows));
    await page.calc('document.querySelector(".calc-graph-list").scrollTop = 0');

    // a value: its menu, and a click puts it in
    await page.rightClick('.calc-graph-line:nth-child(3) > .calc-graph-cell[data-c="1"]');
    check(await menu(page) === 'Copy|Insert|Store in Var', t + 'a value has Copy, Insert and Store in Var', await menu(page));
    await page.key('Escape', 27);
    await page.click('.calc-graph-line:nth-child(3) > .calc-graph-cell[data-c="1"]');
    check(!await open(page, '.calc-graph') && await value(page) === -2.75, t + 'a click puts the value into the display', await shown(page));

    // kept: the tab, the start and the step
    await page.go(page.base + at);
    await page.click('.calc-graph-btn');
    check(!await page.calc('document.querySelector(".calc-graph-table").hidden') &&
        await page.calc('document.querySelector(".calc-graph-from").value + " " + document.querySelector(".calc-graph-by").value') === '0 0.5',
        t + 'the tab, the start and the step are kept');

    // a step that is not above 0 is marked, and the view goes on
    await page.calc('(function (i) { i.value = "-1"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-graph-by"))');
    check(await page.calc('document.querySelector(".calc-graph-by").parentNode.classList.contains("calc-bad")') &&
        /^Start and step/.test(await page.calc(note)) && await row(2) === '1 | -2 | 1', t + 'a step of -1 is marked, the step of the view is used',
        await page.calc(note) + ' / ' + await row(2));

    // Clear empties the boxes too; the graph's tab shows the plot again
    await page.click('.calc-graph .calc-past-clear');
    check(await page.calc('document.querySelector(".calc-graph-from").value + document.querySelector(".calc-graph-by").value') === '' &&
        await page.calc(rows) === 0 && /^Type a function/.test(await page.calc(note)), t + 'Clear empties the start, the step and the table');
    await page.click('.calc-graph-tab[data-tab="graph"]');
    check(!await page.calc('document.querySelector(".calc-graph-plot").hidden'), t + 'the graph tab shows the plot again');
}

// a choice in a list of the converter, by the start of its text: the list opened
// with a click, and the choice clicked
// MODE goes Normal, Fix, Sci, Eng and Normal again; the options page follows it.
// The places start at Auto, so Fix is as Normal; a number of places shows in the mark
async function modeKey(page, at) {
    var t = at + ': ', MODE = '.calc-left > :nth-child(7)'; // the corner of the top row

    function mark() {
        return page.calc('document.querySelector(".calc-fmt").textContent');
    }

    await page.fresh(at, {});
    check(await page.calc('document.querySelector(' + JSON.stringify(MODE) + ').textContent.trim()') === 'MODE', t + 'MODE is there');
    check(await page.calc('document.querySelector(".calc-left > :nth-child(6)").textContent.trim()') === ')', t + 'MODE is after the brackets');
    await page.type('1500\r');
    // its label keeps its size while the key is held down, and no notice fades out after it
    var size = 'getComputedStyle(document.querySelector(' + JSON.stringify(MODE + ' > div') + ')).fontSize', before = await page.calc(size),
        p = await page.at(MODE);
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] });
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p[0], y: p[1], button: 'left', clickCount: 1 });
    check(await page.calc(size) === before, t + 'MODE held down keeps the size of its label', before + ' → ' + await page.calc(size));
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p[0], y: p[1], button: 'left', clickCount: 1 });
    await sleep(60);
    check(await page.calc('document.querySelector(".notification").textContent') === '', t + 'MODE shows no notice',
        await page.calc('document.querySelector(".notification").textContent'));
    check(await mark() === 'FIX' && await shown(page) === '1500', t + 'MODE: Fix, with Auto places', await mark() + ' ' + await shown(page));
    await page.click(MODE);
    check(await mark() === 'SCI' && await shown(page) === '1.5e+3', t + 'then Sci', await mark() + ' ' + await shown(page));
    await page.type('o');
    check(await mark() === 'ENG' && await shown(page) === '1.5e+3', t + 'o, then Eng', await mark() + ' ' + await shown(page));
    await page.click(MODE);
    check(await mark() === '' && await shown(page) === '1500', t + 'and Normal again', await mark() + ' ' + await shown(page));
    await page.click(MODE);
    await page.go(page.base + at);
    check(await mark() === 'FIX', t + 'kept after a reload', await mark());
    await page.fresh(at, { format: { notation: 'norm', places: 2, group: false } });
    await page.type('1500\r');
    await page.click(MODE);
    check(await mark() === 'FIX 2' && await shown(page) === '1500.00', t + 'Fix 2', await mark() + ' ' + await shown(page));
    await page.click(MODE);
    check(await mark() === 'SCI 2' && await shown(page) === '1.50e+3', t + 'and Sci 2', await mark() + ' ' + await shown(page));
    // the thousands apart by commas, or by thin spaces
    var raw = 'document.getElementById("box").textContent.trim()';
    await page.fresh(at, { format: { notation: 'norm', places: 'auto', group: true } });
    await page.type('1234567\r');
    check(await page.calc(raw) === '1,234,567', t + 'separators: commas', await page.calc(raw));
    await page.fresh(at, { format: { notation: 'norm', places: 'auto', group: 'space' } });
    await page.type('1234567\r');
    check(await page.calc(raw) === '1\u2009234\u2009567', t + 'separators: thin spaces', await page.calc(raw));
    await page.type('\x1b1234567+89');
    check(await page.calc(raw) === '1\u2009234\u2009567 + 89', t + 'in the equation as it is typed too', await page.calc(raw));
    // a part selected in it is where a key writes: the spaces between the thousands are not counted.
    // Each digit is a piece of its own: the 89 is the last two
    await page.calc('(function () { var box = document.getElementById("box"), walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), ' +
        'digits = [], node, range = document.createRange(); while ((node = walk.nextNode())) if (/\\d/.test(node.data)) digits.push(node); ' +
        'range.setStart(digits[digits.length - 2], 0); range.setEnd(digits[digits.length - 1], digits[digits.length - 1].data.length); ' +
        'getSelection().removeAllRanges(); getSelection().addRange(range); })()');
    await page.type('5');
    check(await page.calc(raw) === '1234567 + 5', t + 'a key over the selected 89 replaces it, the line then edited: the thousands together', await page.calc(raw));

    // a comma as the decimal mark, with dots between the thousands: typed, shown, edited, copied and pasted so
    var pointKey = '[].filter.call(document.querySelectorAll(".calc-right > *"), function (k) { return /^[.,]$/.test(k.textContent.trim()); })[0]',
        copied = '(function () { var t; document.body.dispatchEvent(Object.assign(new Event("copy", { bubbles: true, cancelable: true }), ' +
            '{ clipboardData: { setData: function (type, text) { t = text; } } })); return t; })()';
    function pasted(text) {
        return page.calc('document.body.dispatchEvent(Object.assign(new Event("paste", { bubbles: true }), ' +
            '{ clipboardData: { getData: function () { return ' + JSON.stringify(text) + '; } } }))');
    }
    await page.fresh(at, {});
    check(await page.calc(pointKey + '.textContent.trim()') === '.', t + 'the point key is a point');
    await page.fresh(at, { format: { notation: 'norm', places: 'auto', group: 'dot' } });
    check(await page.calc(pointKey + '.textContent.trim()') === ',', t + 'decimal comma: the point key is a comma');
    await page.type('1234567,');
    check(await page.calc(raw) === '1.234.567,', t + 'the comma typed, the thousands apart by dots', await page.calc(raw));
    await page.calc('(function (k) { ["mousedown", "mouseup"].forEach(function (type) { k.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 })); }); })(' +
        pointKey + '.firstElementChild)');
    await page.type('5');
    check(await page.calc(raw) === '1.234.567,5', t + 'a second comma from its key is not taken', await page.calc(raw));
    await page.type('\r');
    check(await page.calc(raw) === '1.234.567,5', t + 'the result so too', await page.calc(raw));
    check(await page.calc(copied) === '1234567,5', t + 'copied with the comma', await page.calc(copied));
    await page.type('\x1b1234,5+0,25');
    check(await page.calc(raw) === '1.234,5 + 0,25', t + 'the equation as it is typed', await page.calc(raw));
    check(await page.calc(copied) === '1234,5 + 0,25', t + 'and its copy', await page.calc(copied));
    await page.key('ArrowLeft', 37);
    check(await page.calc(raw) === '1234,5 + 0,25', t + 'with the cursor in it: the comma, the thousands together', await page.calc(raw));
    await page.type('\r');
    check(await page.calc(raw) === '1.234,75', t + 'worked out', await page.calc(raw));
    await page.type('\x1b');
    await pasted('1.234');
    check(await page.calc(raw) === '1.234' && await page.calc(copied) === '1234', t + 'a pasted 1.234 is 1234', await page.calc(copied));
    await page.type('\x1b');
    await pasted('1,234');
    check(await page.calc(raw) === '1,234' && await page.calc(copied) === '1,234', t + 'and a pasted 1,234 is 1.234', await page.calc(copied));
    await page.type('\x1b');
    await pasted('2.500,5 + 1.250 =');
    check(await page.calc(raw) === '3.750,5', t + 'a pasted equation written so', await page.calc(raw));
    await page.calc('(function (i) { i.value = "-1.2,3-4k5"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-conv-value"))');
    check(await page.calc('document.querySelector(".calc-conv-value").value') === '-1,2345', t + 'a number box: one comma, a point typed is it',
        await page.calc('document.querySelector(".calc-conv-value").value'));
    // a letter of a formula: typed with the comma, and 1,234 for it is 1.234 in the equation, not 1234
    await page.type('\x1b');
    await page.click('.calc-fx-btn');
    await page.click('.calc-fx-tab[data-tab="formulas"]');
    await page.type('pythag\r1,234\r');
    check(await page.calc('document.querySelector(".calc-fx-var input").value') === '1,234', t + 'a letter of a formula takes the comma',
        await page.calc('document.querySelector(".calc-fx-var input").value'));
    await page.type('0\r');
    check(!await open(page, '.calc-fx') && /1,234/.test(await page.calc(raw)) && !/1\.234/.test(await page.calc(raw)),
        t + 'the formula goes in with 1,234', await page.calc(raw));
    await page.type('\r');
    check(await page.calc(raw) === '1,234', t + 'and gives 1,234: the root of 1,234 squared', await page.calc(raw));
    await page.fresh(at, { format: { notation: 'fix', places: 2, group: 'spacecomma' } });
    await page.type('1234567,5\r');
    check(await page.calc(raw) === '1\u2009234\u2009567,50', t + 'thin spaces and a comma, in Fix 2', await page.calc(raw));
    await page.fresh(at, {});
    check(await page.calc('[].some.call(document.querySelectorAll(".calc-left > *"), function (k) { return /[◀▶]/.test(k.textContent); })') === false,
        t + 'no cursor keys');
    await page.type('2+3');
    await page.key('ArrowLeft', 37);
    check(await page.calc('!!document.querySelector("#box .calc-cursor")'), t + 'the arrow keys still move the cursor');
}

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
    check(await shown(page) === '103', t + 'a click on 10ˣ, then 3 and Enter closes its box: 10³', await shown(page));
    await page.type('\r');
    check(await shown(page) === '1000', t + 'and Enter again is 1000', await shown(page));
    await page.click(PI);
    check(near(await value(page), Math.E), t + 'a click on e puts it in', await shown(page));
    await page.click('.calc-right > .del-ac'); // a digit after e is times it: C first
    await page.type('8');
    await page.click(YX);
    await page.type('2\r\r');
    check(await shown(page) === '3', t + '8 logᵧ 2 = 3', await shown(page));
    await page.click(KEYS + '1)');
    check(await label(LOG) === 'log' && await label(PI) === 'π' && await label(YX) === 'yx', t + '2nd again turns them back',
        await label(LOG) + ' ' + await label(PI) + ' ' + await label(YX));

    await page.type('hL2\r\r');
    check(await shown(page) === '100', t + 'h, Shift+L is 10ˣ', await shown(page));
    await page.type('81h^3\r\r');
    check(await shown(page) === '4', t + 'h, ^ is logᵧ', await shown(page));
    await page.type('hp');
    check(near(await value(page), Math.E), t + 'h, p is e', await shown(page));

    // floor and ceil on the 2nd layer of abs and x!, side by side, and round on that of Rand
    await page.fresh(at, {});
    await page.click(KEYS + '1)');
    check(await label(KEYS + '25)') === 'floor' && await label(KEYS + '26)') === 'ceil' && await label(KEYS + '30)') === 'round',
        t + '2nd turns abs, x! and Rand into floor, ceil and round', await label(KEYS + '25)') + ' ' + await label(KEYS + '26)') + ' ' + await label(KEYS + '30)'));
    for (const [key, want] of [['25', 3], ['26', 4], ['30', 4]]) {
        await page.click(KEYS + key + ')');
        await page.type('7/2\r\r');
        check(await value(page) === want, t + '7/2 ' + await label(KEYS + key + ')') + ' = ' + want, await shown(page));
    }
}

// the letters A to J: > is STO→, Shift+A puts A in, the keys they had are elsewhere; the Variables tab of
// the formulas, Store in Var of the menu, the history, a graph with a capital, kept after a reload
async function letters(page, at) {
    var t = at + ': ', log = 'document.querySelector(".calc-log").textContent.replace(/\\s+/g, " ").trim()',
        sto = 'document.querySelector(".calc-sto").textContent',
        held = function (k) { return page.ev('JSON.parse(localStorage.getItem("calc")).vars.' + k); },
        box = function (k) { return page.calc('document.querySelector(".calc-var[data-k=' + k + '] input").value'); },
        setGraph = function (text) {
            return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
                '(document.querySelector(".calc-graph-input"))');
        },
        near6 = function (a, b) { return Math.abs(a - b) < 1e-6; };

    await page.fresh(at, {});
    await page.type('5+3>');
    check(await page.calc(sto) === 'STO→', t + '> shows STO→ till a letter comes', await page.calc(sto));
    await page.type('A');
    check(await shown(page) === '8' && await page.calc(log) === '5 + 3 → A' && await page.calc(sto) === '',
        t + '5 + 3 > A works it out into A, the line saying so', await shown(page) + ' | ' + await page.calc(log));
    check(await held('A') === 8, t + 'and A is saved', await held('A'));
    await page.type('2A=');
    check(await shown(page) === '16', t + 'Shift+A puts A in, 2A = 16', await shown(page));
    await page.type('>');
    await page.key('Escape', 27);
    check(await page.calc(sto) === '' && await shown(page) === '16', t + 'Esc lets STO→ go, the result staying');
    await page.type('>3');
    check(await page.calc(sto) === '' && await shown(page) === '3', t + 'a key that is no letter lets it go, and does what it does', await shown(page));
    await page.type('*4');
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ç', code: 'KeyC', windowsVirtualKeyCode: 67, modifiers: 1 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ç', code: 'KeyC', windowsVirtualKeyCode: 67, modifiers: 1 });
    await sleep(60);
    check(await held('C') === 12 && await page.calc(log) === '3 × 4 → C', t + 'Alt+C stores 3 × 4 in C at once', await held('C') + ' | ' + await page.calc(log));

    // the keys Shift+C, E, F and G had are on V, W, Y and Q; hold is h alone
    await page.fresh(at, {});
    await page.type('V0\r\r');
    check(near6(await value(page), Math.PI / 2), t + 'Shift+V is cos⁻¹', await shown(page));
    await page.type('2W3\r');
    check(await value(page) === 2000, t + 'Shift+W is EE, drawn ᴇ', await shown(page));
    check(await page.calc(log) === '2ᴇ3 =', t + 'the line has 2ᴇ3', await page.calc(log));
    await page.type('Y7/2\r\r');
    check(await value(page) === 3, t + 'Shift+Y is floor', await shown(page));
    await page.type('12Q18\r');
    check(await value(page) === 6, t + 'Shift+Q is gcd', await shown(page));
    await page.type('H');
    check(await page.calc('document.querySelector(".calc-hold").textContent') === '', t + 'Shift+H is the letter H, not hold');

    // the Variables tab: each letter to type over, STO and insert
    await page.fresh(at, {});
    await page.type('5+3>A');
    await page.click('.calc-fx-btn');
    await page.click('.calc-fx-tab[data-tab="vars"]');
    check(await page.calc('document.querySelectorAll(".calc-var").length') === 10 && await box('A') === '8' && await box('B') === '0' &&
        await page.calc('document.querySelector(".calc-fx-search").hidden'), t + 'the Variables tab lists A to J, A holding 8, and no search', await box('A'));
    await page.click('.calc-var[data-k="B"] input');
    await page.calc('document.querySelector(".calc-var[data-k=B] input").select()');
    await page.type('3\r');
    check(await held('B') === 3, t + 'a value typed in B is kept', await held('B'));
    await page.click('.calc-var[data-k="C"] .calc-var-btn[data-act="store"]');
    check(await held('C') === 8 && await box('C') === '8', t + 'STO on C keeps the result in it', await held('C'));
    await page.click('.calc-var[data-k="B"] .calc-var-btn[data-act="insert"]');
    check(!await open(page, '.calc-fx'), t + 'insert puts B in, the panel closing');
    await page.type('*2=');
    check(await shown(page) === '6', t + 'B × 2 = 6', await shown(page));

    // Store in Var of the menu: of the display, and of a line of the history
    await page.rightClick('#box');
    await pick(page, 'Store in Var');
    check((await menu(page)).split('|').length === 10 && (await menu(page)).indexOf('A8') === 0, t + 'Store in Var lists the letters with what they hold',
        await menu(page));
    await pick(page, 'D0');
    check(await held('D') === 6, t + 'and D takes the result', await held('D'));
    await page.click('.calc-hist');
    check(await page.calc('document.querySelector(".calc-past-row .calc-past-letters").textContent') === 'B = 3',
        t + 'the history says what B held', await page.calc('document.querySelector(".calc-past-row").textContent'));
    await page.rightClick('.calc-past-row:nth-child(2) .calc-past-res');
    await pick(page, 'Store in Var');
    await pick(page, 'E0');
    check(await held('E') === 8, t + 'Store in Var of a line of the history keeps its result', await held('E'));
    await page.key('Escape', 27);
    await page.rightClick('#box');
    await pick(page, 'Insert Var');
    await pick(page, 'D6');
    await page.type('+1=');
    check(await shown(page) === '7', t + 'Insert Var of the menu puts D in: D + 1 = 7', await shown(page));


    // a graph takes a capital as the value stored in it, with no slider; drawn again as it changes
    await page.click('.calc-graph-btn');
    await setGraph('x + A');
    await sleep(900);
    check(!await page.calc('document.querySelector(".calc-graph-slider")') &&
        !await page.calc('document.querySelector(".calc-graph-fn").classList.contains("calc-bad")'), t + 'x + A has no slider');
    await page.key('Escape', 27);
    await page.key('Delete', 46);
    await page.type('-5>A');
    check(await held('A') === -5, t + 'A is now -5', await held('A'));
    await page.click('.calc-graph-btn');
    await sleep(300);
    check(await page.calc('JSON.parse(localStorage.getItem("graph")).f[0]') === 'x + A', t + 'the graph keeps x + A');
    await page.key('Escape', 27);

    // a formula's box takes a letter: c typed is C, as a = C
    await page.key('Delete', 46);
    await page.type('3>C');
    await page.click('.calc-fx-btn');
    await page.click('.calc-fx-tab[data-tab="formulas"]');
    await page.type('pythagorean\r');
    await page.type('c');
    check(await page.calc('document.querySelector(".calc-fx-item.calc-on input").value') === 'C', t + 'c in a box of a formula is C',
        await page.calc('document.querySelector(".calc-fx-item.calc-on input").value'));
    await page.hover('.calc-fx-item.calc-on input');
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500) &&
        await page.calc('document.querySelector(".calc-tip").textContent') === 'Variable CC = 3', t + 'resting on the box shows what C holds',
        await page.calc('document.querySelector(".calc-tip").textContent'));
    await page.type('\r4\r');
    check(!await open(page, '.calc-fx') && /C/.test(await shown(page)), t + 'Insert puts the formula in with C', await shown(page));
    await page.type('=');
    check(await shown(page) === '5', t + 'a = C, b = 4 gives 5', await shown(page));
    await page.click('.calc-fx-btn');
    await page.click('.calc-fx-tab[data-tab="vars"]');
    await page.key('Escape', 27);

    // the converter takes a letter as its value: a typed is A, -5 m in feet
    await page.click('.calc-conv-btn');
    await page.calc('(function (i) { i.value = ""; i.focus(); })(document.querySelector(".calc-conv-value"))');
    await page.type('a');
    check(await page.calc('document.querySelector(".calc-conv-value").value') === 'A' &&
        !await page.calc('document.querySelector(".calc-conv-value").classList.contains("calc-bad")'), t + 'a in the converter is A, a value it reads',
        await page.calc('document.querySelector(".calc-conv-value").value'));
    await page.key('Escape', 27);

    // and so does a number box of the graph: the table's step b typed is B, 3; a word is not a number
    await page.click('.calc-graph-btn');
    await page.click('.calc-graph-tab[data-tab="table"]');
    await page.calc('(function (i) { i.value = ""; i.focus(); })(document.querySelector(".calc-graph-by"))');
    await page.type('bk+');
    check(await page.calc('document.querySelector(".calc-graph-by").value') === 'B' &&
        !await page.calc('document.querySelector(".calc-graph-by").parentNode.classList.contains("calc-bad")'),
        t + 'the step of the table takes B, other letters and signs left out', await page.calc('document.querySelector(".calc-graph-by").value'));
    await page.calc('(function (i) { i.value = ""; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-graph-by"))');
    await page.key('Escape', 27);

    // a reload keeps them; Reset all puts them back to 0
    await page.go(page.base + at);
    await page.click('.calc-fx-btn');
    check(await page.calc('document.querySelector(".calc-fx-tab.calc-on").dataset.tab') === 'vars' && await box('A') === '-5' && await box('B') === '3',
        t + 'after a reload the Variables tab and the letters are as they were', await box('A'));
    await page.key('Escape', 27);
    await page.rightClick('#box');
    await pick(page, 'Reset all');
    check(await held('A') === 0 && await held('B') === 0, t + 'Reset all puts every letter back to 0', await held('A'));

    // a letter in the equation has a tip of what it holds, in the display and while the line is edited
    await page.fresh(at, {});
    await page.type('7>G');
    await page.key('Delete', 46);
    await page.type('2G');
    await page.calc('[].filter.call(document.querySelectorAll("#box [data-e]"), function (s) { return s.textContent.trim() === "G"; })[0].id = "tipG"');
    await page.hover('#tipG');
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500) &&
        /^Variable G.*G = 7/.test(await page.calc('document.querySelector(".calc-tip").textContent')), t + 'resting on G in the equation shows G = 7',
        await page.calc('document.querySelector(".calc-tip").textContent'));
    await page.key('ArrowLeft', 37);
    await page.key('ArrowRight', 39);
    await page.calc('[].filter.call(document.querySelectorAll("#box [data-e]"), function (s) { return s.textContent.trim() === "G"; })[0].id = "tipG2"');
    await page.hover('#tipG2');
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500) &&
        /G = 7/.test(await page.calc('document.querySelector(".calc-tip").textContent')), t + 'and while the line is edited too',
        await page.calc('document.querySelector(".calc-tip").textContent'));

    // a letter holding 0 shows as the letter, not as 0; and its value is kept in the line
    await page.fresh(at, {});
    await page.rightClick('#box');
    await pick(page, 'Insert Var');
    await pick(page, 'B0');
    check(await shown(page) === 'B', t + 'Insert Var of a letter holding 0 shows B, not 0', await shown(page));
    await page.type('+1=');
    check(await shown(page) === '1', t + 'and B + 1 = 1', await shown(page));

    // STO→ armed, a click on a letter of the Variables tab stores in it, not puts it in the equation
    await page.fresh(at, {});
    await page.type('5+3>');
    await page.click('.calc-fx-btn');
    await page.click('.calc-fx-tab[data-tab="vars"]');
    await page.click('.calc-var[data-k="E"] .calc-var-k');
    check(await held('E') === 8 && await page.calc(sto) === '', t + 'STO→ then a click on E stores 8 in E', await held('E') + ' | ' + await page.calc(sto));
    check(await box('E') === '8', t + 'and its box shows it', await box('E'));

    // a paste with → A stores in A, and the Variables tab shows it when it is opened again: a right click on the
    // display puts the panel away first, as a click on the equation does
    await page.fresh(at, {});
    await page.click('.calc-fx-btn');
    await page.click('.calc-fx-tab[data-tab="vars"]');
    await page.rightClick('#box');
    await paste(page, '5 + 3 → F');
    await page.click('.calc-fx-btn');
    check(await held('F') === 8 && await box('F') === '8', t + 'pasting 5 + 3 → F stores 8 in F, its box showing it',
        await held('F') + ' | ' + await box('F') + ' | open: ' + await open(page, '.calc-fx'));
}

// a layout with no Latin letters, Arabic's: the keys are the keys of their place, 7 for ٧ of the digit row, x! for ء of
// the X key, > for the Period key with Shift, and Shift+A for ش, so the same keys work on any layout
async function otherLayouts(page, at) {
    var t = at + ': ',
        held = function (k) { return page.ev('JSON.parse(localStorage.getItem("calc")).vars.' + k); };

    // a key of its place, with the character the layout gives it
    async function physical(code, key, vk, shift) {
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: key, code: code, text: key, windowsVirtualKeyCode: vk, modifiers: shift ? 8 : 0 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: key, code: code, windowsVirtualKeyCode: vk, modifiers: shift ? 8 : 0 });
        await sleep(60);
    }

    await page.fresh(at, {});
    await physical('Digit7', '٧', 55);
    check(await shown(page) === '7', t + 'the digit key of ٧ types 7', await shown(page));
    await physical('KeyX', 'ء', 88);
    check(await shown(page) === '7!', t + 'ء on the X key is x!', await shown(page));
    await page.type('\r');
    check(await shown(page) === '5040', t + '7! = 5040', await shown(page));
    await page.key('Delete', 46);
    await physical('Digit1', '١', 49);
    await physical('Period', 'و', 190);
    await physical('Digit5', '٥', 53);
    check(await shown(page) === '1.5', t + 'the Period key of و is the point', await shown(page));
    await page.key('Delete', 46);
    await physical('Digit4', '٤', 52);
    await physical('Digit9', '٩', 57);
    await physical('Period', 'ؤ', 190, true);
    check(await page.calc('document.querySelector(".calc-sto").textContent') === 'STO→', t + 'Shift and the Period key is >, STO→',
        await page.calc('document.querySelector(".calc-sto").textContent'));
    await physical('KeyA', 'ش', 65, true);
    check(await held('A') === 49, t + 'then Shift+A, ش, stores 49 in A', await held('A'));
    await physical('Digit3', '٣', 51);
    await physical('KeyA', 'ش', 65, true);
    check(/3.*A|A/.test(await page.calc('document.getElementById("box").textContent')) && await shown(page) !== '3',
        t + 'Shift+A puts A in on this layout too', await shown(page));

    // the boxes of the panels too: ٥ of the digit row types 5 in the converter, ش with Shift types A, and a pasted ٣٫٥ reads 3.5
    await page.fresh(at, {});
    await page.click('.calc-conv-btn');
    await page.calc('(function (i) { i.value = ""; i.focus(); })(document.querySelector(".calc-conv-value"))');
    await physical('Digit5', '٥', 53);
    await physical('KeyA', 'ش', 65, true);
    check(await page.calc('document.querySelector(".calc-conv-value").value') === '5A', t + 'in the converter ٥ types 5 and Shift+ش types A',
        await page.calc('document.querySelector(".calc-conv-value").value'));
    await page.calc('(function (i) { i.value = "٣٫٥"; i.dispatchEvent(new Event("input", { bubbles: true })); })(document.querySelector(".calc-conv-value"))');
    check(await page.calc('document.querySelector(".calc-conv-value").value') === '3.5', t + 'and the digits and point of ٣٫٥ are read as 3.5',
        await page.calc('document.querySelector(".calc-conv-value").value'));
    await page.key('Escape', 27);

    // a script with two cases, Russian's, has its case for the letter: И with Shift on the B key is B
    await page.fresh(at, {});
    await physical('KeyB', 'И', 66, true);
    check(/B/.test(await shown(page)), t + 'И with Shift on the B key puts in B', await shown(page));
}

// the °′″ key: results in degrees, minutes and seconds, kept in the
// history and after a reload; the converter has them among its angles
async function degreesMinutes(page, at) {
    var t = at + ': ', AB = '.calc-left > :nth-child(4)'; // °′″

    function mark() {
        return page.calc('document.querySelector(".calc-frac").textContent');
    }

    function input(text) {
        return page.calc('(function (i) { i.value = ' + JSON.stringify(text) + '; i.dispatchEvent(new Event("input")); })' +
            '(document.querySelector(".calc-conv-value"))');
    }

    await page.fresh(at, {});
    check(await page.calc('document.querySelector(' + JSON.stringify(AB) + ').textContent.trim()') === '°′″',
        t + 'the °′″ key is next to a/b');
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

    // an angle pasted alone shows as written, and turns the mode on
    await page.click('.calc-frac');
    await page.ev('(function (d) { d.body.dispatchEvent(Object.assign(new Event("paste", { bubbles: true }), ' +
        '{ clipboardData: { getData: function () { return "12°30′15″"; } } })); })' +
        '((document.getElementById("calc-iframe") || {}).contentDocument || document)');
    check(await shown(page) === '12°30′15″' && await mark() === 'DMS', t + 'a pasted 12°30′15″ shows as written',
        await shown(page) + ' ' + await mark());

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

// the Deg key goes from Rad to Deg to Grad and back; the display shows the unit and its full turn
async function angleUnits(page, at) {
    var t = at + ': ';

    function units() { // the unit shown, its full turn, and the name on the key
        return page.calc('[document.querySelector(".calc-rad").firstChild.data, document.querySelector(".calc-rad .sign").textContent, ' +
            'document.getElementById("rad").textContent.trim()].join(" ")');
    }

    await page.fresh(at, {});
    check(await units() === 'Rad 2π Deg', t + 'Rad at first, the key names Deg', await units());
    await page.click('#rad');
    check(await units() === 'Deg 360° Grad', t + 'then Deg, the key names Grad', await units());
    await page.click('#rad');
    check(await units() === 'Grad 400g Rad', t + 'then Grad, 400 to a full turn', await units());
    await page.type('s100\r\r');
    check(await shown(page) === '1', t + 'sin 100 = 1 in Grad', await shown(page));
    await page.go(page.base + at);
    check(await units() === 'Grad 400g Rad', t + 'Grad after a reload', await units());
    await page.click('.calc-rad');
    check(await units() === 'Rad 2π Deg', t + 'a click on the unit in the display goes on to Rad', await units());
    await page.click('.calc-hist');
    check(await page.calc('document.querySelector(".calc-past-unit").textContent') === 'Grad', t + 'the history marks Grad');
    await page.hover('.calc-past-eq'); // its buttons show under the pointer
    await page.click('.calc-past-eq .calc-past-btn[data-act="insert"]');
    check(await units() === 'Grad 400g Rad', t + 'inserting it goes back to Grad', await units());
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
    check(await buttons(page) === 'calc-fx-btn calc-conv-btn calc-graph-btn calc-solve-btn calc-stat-btn calc-numbers-btn', t + 'the converter between f(x) and the graph',
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

    // only a number can be typed in it, and typing in it presses no keys
    await page.calc('document.querySelector(".calc-conv-value").select()');
    await page.type('6');
    check(await shown(page) === '5', t + 'typing in the value presses no keys', await shown(page));
    check(await converted(page, 'meters') === '6,000', t + '6 km is 6,000 m', await converted(page, 'meters'));
    await page.type('k*+#');
    check(await page.calc('document.querySelector(".calc-conv-value").value') === '6', t + 'letters beyond A to J and signs are not taken',
        await page.calc('document.querySelector(".calc-conv-value").value'));
    await page.calc('(function (i) { i.value = "-1.2.3-4k5"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-conv-value"))');
    check(await page.calc('document.querySelector(".calc-conv-value").value') === '-1.2345', t + 'one point and a minus first only',
        await page.calc('document.querySelector(".calc-conv-value").value'));
    await page.calc('(function (i) { i.value = "6"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-conv-value"))');

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
    await page.hover('.calc-conv-row[data-i="0"]');
    check(await page.until('!document.querySelector(".calc-peek").hidden && /^Celsius/.test(document.querySelector(".calc-peek").textContent)', 2500) &&
        await page.calc('document.querySelector(".calc-peek .calc-peek-value").textContent') === '100' &&
        await page.calc('document.querySelectorAll(".calc-peek .calc-peek-act").length') === 2, t + 'a value has its tip: its unit, the value, Insert and Copy');
    await page.click('.calc-peek .calc-peek-act[data-act="insert"]');
    check(!await open(page, '.calc-conv') && await shown(page) === '100' && await page.calc('document.querySelector(".calc-peek").hidden'),
        t + 'Insert of the tip puts 100 in', await shown(page));

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
    await page.hover('.calc-conv-note'); // a click puts a tip away till the pointer leaves
    await page.hover('.calc-conv-row.calc-none');
    check(await page.until('!document.querySelector(".calc-peek").hidden && /^Kilometers per literNo value/.test(document.querySelector(".calc-peek").textContent)', 2500) &&
        await page.calc('document.querySelectorAll(".calc-peek .calc-peek-act").length') === 0,
        t + 'its tip still says what it is, and that it has no value, with no buttons');

    // one panel at a time; Esc closes it
    await page.click('.calc-fx-btn');
    check(await open(page, '.calc-fx') && !await open(page, '.calc-conv'), t + 'f(x) closes the converter');
    await page.click('.calc-conv-btn');
    await page.key('Escape', 27);
    check(!await open(page, '.calc-conv'), t + 'Esc closes the converter');

    // a touch screen: the value is not given the focus, so its keyboard stays down
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await page.click('.calc-conv-btn');
    check(await open(page, '.calc-conv') && await page.calc('document.activeElement.tagName') === 'BODY',
        t + 'on a touch screen the value is left without the focus', await page.calc('document.activeElement.tagName'));
    await page.click('.calc-conv-value');
    check(await page.calc('document.activeElement.className') === 'calc-conv-value', t + 'a touch on it gives it the focus');
    await page.key('Escape', 27);
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
}

// The converter's dates: a tab beside the units, its cards as the solver's; the time between two
// dates and a date moved on, a value put in with a click; the tab and the dates kept
async function convDates(page, at) {
    var t = at + ': dates: ', on = '.calc-conv .calc-sv-item.calc-on',
        tiles = '[].map.call(document.querySelectorAll("' + on + ' .calc-sv-tile"), function (e) {' +
            ' return e.querySelector(".calc-sv-label").textContent + "=" + e.lastChild.textContent; }).join(" | ")',
        note = 'document.querySelector("' + on + ' .calc-sv-note").textContent',
        seen = function (s) { return page.calc('getComputedStyle(document.querySelector(' + JSON.stringify(s) + ')).display !== "none"'); }, got;

    function set(n, text) {
        return page.calc('(function (b) { b.value = ' + JSON.stringify(text) + '; b.dispatchEvent(new Event("input", { bubbles: true })); })' +
            '(document.querySelectorAll("' + on + ' input")[' + n + '])');
    }

    await page.fresh(at, {});
    await page.click('.calc-conv-btn');
    check(await page.calc('[].map.call(document.querySelectorAll(".calc-conv .calc-solve-tab"), function (e) { return e.textContent; }).join(" ")') === 'Units Dates' &&
        await page.calc('document.querySelector(".calc-conv .calc-solve-tab.calc-on").dataset.tab') === 'units', t + 'two tabs, Units on at first');
    check(await seen('.calc-conv-list') && !await seen('.calc-conv .calc-sv-list'), t + 'the units shown, the dates not');
    await page.click('.calc-conv .calc-solve-tab[data-tab="dates"]');
    check(!await seen('.calc-conv-list') && !await seen('.calc-conv-group') && await seen('.calc-conv .calc-sv-list'), t + 'Dates shows its cards in place of the units');
    check(await page.calc('document.querySelector("' + on + ' .calc-sv-name").textContent') === 'Time between dates' &&
        await page.calc('document.querySelectorAll("' + on + ' .calc-sv-date input").length') === 2, t + 'Time between dates open at first, with two dates');
    check(await page.calc('(function (i) { return i.value === "" && i.placeholder === "Today"; })(document.querySelector("' + on + ' input"))') &&
        /^Years, months and days=0 days \| Years=0 \| Months=0 \| Weeks=0 \| Days=0 \| Weekdays=[01] \| Hours=0$/.test(await page.calc(tiles)), t + 'both are today at first', await page.calc(tiles));
    check(await page.calc('document.activeElement === document.querySelector("' + on + ' input")'), t + 'the first date has the focus');

    await set(0, '2000-02-29');
    await set(1, '2026-10-14');
    check(await page.calc(tiles) === 'Years, months and days=26 years, 7 months, 15 days | Years=26 | Months=319 | Weeks=1389 | Days=9724 | Weekdays=6947 | Hours=233376',
        t + '29 February 2000 to 14 October 2026', await page.calc(tiles));

    // the tip of a result: in full, with Copy; with Insert as well for a number
    var acts = '[].map.call(document.querySelectorAll(".calc-peek .calc-peek-act"), function (a) { return a.dataset.act; }).join()';
    await page.hover(on + ' .calc-sv-tile[data-r="0"]');
    check(await page.until('!document.querySelector(".calc-peek").hidden', 2500) &&
        await page.calc('document.querySelector(".calc-peek .calc-peek-value").textContent') === '26 years, 7 months, 15 days' && await page.calc(acts) === 'copy',
        t + 'the tip of a text: in full, to copy', await page.calc(acts));
    await page.hover(on + ' .calc-sv-tile[data-r="4"]');
    check(await page.until('!document.querySelector(".calc-peek").hidden && document.querySelector(".calc-peek .calc-peek-value").textContent === "9724"', 2500) &&
        await page.calc(acts) === 'insert,copy', t + 'of a number: Insert and Copy', await page.calc(acts));
    await page.hover('.calc-conv .calc-past-head');
    check(await page.until('document.querySelector(".calc-peek").hidden', 1500), t + 'the tip goes as the pointer leaves');
    await set(1, '14 Oct 2026');
    check(/ \| Days=9724 \| /.test(await page.calc(tiles)), t + '14 Oct 2026 typed', await page.calc(tiles));
    await set(1, '10/14/2026'); // the browser here writes the month first
    check(/ \| Days=9724 \| /.test(await page.calc(tiles)), t + '10/14/2026 typed', await page.calc(tiles));
    await set(1, '14 Octopus 2026');
    check(/^A date, as /.test(await page.calc(note)) && await page.calc('document.querySelectorAll("' + on + ' input")[1].classList.contains("calc-bad")'),
        t + 'what is no date is marked', await page.calc(note));
    await set(1, '2026-10-14');

    // the calendar, drawn as the calculator draws: the month of the date in the box, that day chosen;
    // a day by the arrows and Enter, or a click; a month and a year on; Esc closes it and not the panel
    var cal = 'document.querySelector(".calc-cal")', title = 'document.querySelector(".calc-cal-title").textContent';
    await page.click(on + ' .calc-sv-var:nth-child(2) .calc-sv-cal');
    check(!await page.calc(cal + '.hidden') && await page.calc(title) === 'October 2026' && await page.calc('document.querySelector(".calc-cal-day.calc-on").textContent') === '14',
        t + 'its button opens the calendar at October 2026, the 14th chosen', await page.calc(title));
    check(await page.calc('(function (c, p) { c = c.getBoundingClientRect(); p = p.getBoundingClientRect(); return c.top >= p.top && c.bottom <= p.bottom && c.left >= p.left && c.right <= p.right; })' +
        '(' + cal + ', document.querySelector(".calc-conv"))'), t + 'inside the panel');
    await page.key('ArrowRight', 39);
    await page.key('Enter', 13);
    check(await page.calc(cal + '.hidden') && /^(10\/15\/2026|15\/10\/2026)$/.test(await page.calc('document.querySelectorAll("' + on + ' input")[1].value')) &&
        / \| Days=9725 \| /.test(await page.calc(tiles)), t + 'the arrow and Enter choose the 15th, written in the box', await page.calc('document.querySelectorAll("' + on + ' input")[1].value'));
    check(await page.calc('document.activeElement === document.querySelectorAll("' + on + ' input")[1]'), t + 'and the box keeps the focus');
    await page.key('ArrowDown', 40);
    check(!await page.calc(cal + '.hidden'), t + 'the arrow down opens it again');
    await page.key('PageUp', 33);
    check(await page.calc(title) === 'September 2026', t + 'Page Up goes a month back', await page.calc(title));
    await page.click('.calc-cal-go[data-go="12"]');
    check(await page.calc(title) === 'September 2027', t + '» a year on', await page.calc(title));
    await page.click('.calc-cal-day[data-d]:not(.calc-cal-out)');
    check(await page.calc(cal + '.hidden') && /^(09\/01\/2027|01\/09\/2027)$/.test(await page.calc('document.querySelectorAll("' + on + ' input")[1].value')),
        t + 'a click on the 1st chooses it', await page.calc('document.querySelectorAll("' + on + ' input")[1].value'));
    await page.click(on + ' .calc-sv-var:nth-child(2) .calc-sv-cal');
    await page.key('Escape', 27);
    check(await page.calc(cal + '.hidden') && await open(page, '.calc-conv'), t + 'Esc closes the calendar, and the panel stays');
    await page.click(on + ' .calc-sv-var:nth-child(2) input');
    check(!await page.calc(cal + '.hidden'), t + 'a click in the box opens it too');
    await page.click('.calc-conv .calc-past-head');
    check(await page.calc(cal + '.hidden'), t + 'a press beside it closes it');
    await set(1, '2026-10-14');
    await set(0, '2026-10-21');
    check(/ \| Years=0 \| Months=0 \| Weeks=-1 \| Days=-7 \| Weekdays=-6 \| Hours=-168$/.test(await page.calc(tiles)) && /before the first/.test(await page.calc(note)), t + 'a week back is -7 days', await page.calc(tiles));
    await set(0, '2026-10-12');
    await set(1, '2026-10-16');
    check(/ \| Days=4 \| Weekdays=5 \| /.test(await page.calc(tiles)), t + 'Monday to Friday: 4 days on, 5 weekdays', await page.calc(tiles));
    await page.click(on + ' .calc-sv-tile[data-r="5"]');
    check(!await open(page, '.calc-conv') && await shown(page) === '5', t + 'a click puts the 5 weekdays in', await shown(page));

    // the tab and the dates kept for the next time
    await page.go(page.base + at);
    await page.click('.calc-conv-btn');
    check(await page.calc('document.querySelector(".calc-conv .calc-solve-tab.calc-on").dataset.tab') === 'dates' &&
        await page.calc('document.querySelector("' + on + ' input").value') === '2026-10-12', t + 'the tab and the dates are kept');

    // a date moved on: a month from 31 January 2024 is 29 February
    await page.click('.calc-conv .calc-sv-item:nth-child(2) .calc-sv-row');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 4, t + 'Add or subtract time: a date and years, months and days');
    await set(0, '2024-01-31');
    await set(2, '1');
    check(/^Date=(02\/29\/2024|29\/02\/2024) \| Weekday=Thursday \| Days on=29 \| Day of the year=60 \| Week=9$/.test(await page.calc(tiles)),
        t + 'a month from 31 January 2024 is Thursday 29 February', await page.calc(tiles));
    await set(2, '-1');
    await set(3, '-1');
    check(/^Date=(12\/30\/2023|30\/12\/2023) \| Weekday=Saturday \| Days on=-32 \| /.test(await page.calc(tiles)), t + 'and back a month and a day', await page.calc(tiles));
    await set(1, '1.5');
    check(/^Date=– \| /.test(await page.calc(tiles)) && /^Whole years/.test(await page.calc(note)), t + 'half a year is none', await page.calc(note));
    await set(1, '8000');
    check(/^Before the year 1 or after 9999/.test(await page.calc(note)), t + 'nor past 9999', await page.calc(note));

    // Unix time: a timestamp's date and time, of milliseconds too, and the timestamp of a date
    await page.click('.calc-conv .calc-sv-item:nth-child(3) .calc-sv-row');
    check(await page.calc('[].map.call(document.querySelectorAll("' + on + ' input"), function (i) { return i.dataset.k; }).join()') === 'ts',
        t + 'Unix time: Unix → Date at first, a box of the timestamp alone');
    await set(0, '1700000000');
    got = await page.calc(tiles);
    check(/^Unix time=1700000000 \| Milliseconds=1700000000000 \| UTC=Tuesday, (14 November|November 14), 2023, 22:13:20 \| Time here=.+ \| ISO 8601=2023-11-14T22:13:20Z$/.test(got),
        t + 'Unix time: 1700000000 is 14 November 2023, 22:13:20 UTC', got);
    await set(0, '1700000000123');
    check(/^Of 13 digits/.test(await page.calc(note)) && / \| ISO 8601=2023-11-14T22:13:20\.123Z$/.test(await page.calc(tiles)), t + 'of 13 digits, milliseconds', await page.calc(tiles));
    await set(0, '1.9996');
    check(/^Unix time=2 \| Milliseconds=2000 \| UTC=.*, 00:00:02 \| .* \| ISO 8601=1970-01-01T00:00:02Z$/.test(await page.calc(tiles)),
        t + 'Unix time: a fraction of a millisecond rounds first, so the rows agree', await page.calc(tiles));
    await set(0, '1700000000123');
    await page.click(on + ' .calc-sv-choice[data-k="convert"] .calc-sv-opt[data-c="1"]');
    check(await page.calc('[].map.call(document.querySelectorAll("' + on + ' input"), function (i) { return i.dataset.k; }).join()') === 'd,time',
        t + 'Date → Unix: a date and a time in place of the timestamp');
    await set(0, '2000-01-01');
    await set(1, '12:00');
    check((await page.calc(tiles)).indexOf('Unix time=946728000 | ') === 0, t + 'the timestamp of noon on 1 January 2000, UTC', await page.calc(tiles));
    await set(1, '23:59:59.9996');
    got = await page.calc(tiles);
    check(got.indexOf('Unix time=946771200 | ') === 0 && /UTC=.*2000, 00:00:00 \|/.test(got) && / \| ISO 8601=2000-01-02T00:00:00Z$/.test(got),
        t + 'Date → Unix: 23:59:59.9996 rounds to the next day in every row', got);
    await page.click(on + ' .calc-sv-choice[data-k="convert"] .calc-sv-opt[data-c="0"]');
    check(await page.calc('document.querySelector("' + on + ' input").value') === '1700000000123' && /^Unix time=1700000000\.123 \| Milliseconds=1700000000123 \| /.test(await page.calc(tiles)),
        t + 'Unix → Date again, its timestamp kept', await page.calc(tiles));
    await page.click(on + ' .calc-sv-choice[data-k="convert"] .calc-sv-opt[data-c="1"]');
    await set(1, '25:00');
    check(/^A time/.test(await page.calc(note)), t + 'no hour 25', await page.calc(note));

    // the units again, the value with the focus; Esc closes it
    await page.click('.calc-conv .calc-solve-tab[data-tab="units"]');
    check(await seen('.calc-conv-list') && !await seen('.calc-conv .calc-sv-list') && await page.calc('document.activeElement.className') === 'calc-conv-value',
        t + 'Units again, the value with the focus');
    await page.key('Escape', 27);
    check(!await open(page, '.calc-conv'), t + 'Esc closes it');

    // Reset all empties the dates, which are today again, no card open
    await page.rightClick('.calc-display');
    await pick(page, 'Reset all');
    await page.click('.calc-conv-btn');
    check(await page.calc('document.querySelector(".calc-conv .calc-solve-tab.calc-on").dataset.tab') === 'units', t + 'Reset all shows Units again');
    await page.click('.calc-conv .calc-solve-tab[data-tab="dates"]');
    check(!await page.calc('document.querySelector(".calc-conv .calc-sv-item.calc-on")'), t + 'Reset all closes the card of the dates open');
    await page.click('.calc-conv .calc-sv-item:nth-child(1) .calc-sv-row');
    check(/ \| Days=0 \| /.test(await page.calc(tiles)), t + 'Reset all puts the dates back to today', await page.calc(tiles));
    await page.key('Escape', 27);
}

// The statistics: the quartiles, ranges, mode and s² of a list, with its histogram and box plot;
// the Pairs tab and its line of best fit, drawn through them; each tab keeping what is typed in it
async function statsMore(page, at) {
    var t = at + ': statistics: ',
        tile = function (k) { return page.calc('document.querySelector(".calc-stats-tile[data-k=' + k + '] .calc-stats-value").textContent'); },
        note = function () { return page.calc('document.querySelector(".calc-stats-note").textContent'); },
        typed = function (text) {
            return page.calc('(function (i) { i.value = ' + JSON.stringify(text) + '; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-stats-input"))');
        }, got;

    await page.fresh(at, {});
    await page.click('.calc-stat-btn');
    check(await page.calc('[].map.call(document.querySelectorAll(".calc-stats .calc-solve-tab"), function (e) { return e.textContent; }).join(" ")') === 'List Pairs' &&
        await page.calc('document.querySelector(".calc-stats .calc-solve-tab.calc-on").dataset.tab') === 'list', t + 'two tabs, List on at first');
    check(await page.calc('document.querySelector(".calc-stats-chart").childElementCount') === 0, t + 'no chart without numbers');
    await page.hover('.calc-stats-tile[data-k="q1"]');
    check(await page.until('!document.querySelector(".calc-peek").hidden && /^First quartile/.test(document.querySelector(".calc-peek").textContent)', 2500) &&
        await page.calc('document.querySelectorAll(".calc-peek .calc-peek-value, .calc-peek .calc-peek-act").length') === 0,
        t + 'with no numbers a result still says what it is, with no value and no buttons');
    await page.hover('.calc-stats .calc-past-head');
    await page.until('document.querySelector(".calc-peek").hidden', 1500);
    await typed('2 4 4 4 5 5 7 9');
    got = [await tile('q1'), await tile('median'), await tile('q3'), await tile('iqr'), await tile('range'), await tile('mode'), await tile('vars')].join(' ');
    check(got === '4 4.5 6 2 7 4 4.571428571429', t + 'Q1 4, Q3 6, IQR 2, range 7, mode 4, s² 32/7', got);
    check(await page.calc('document.querySelectorAll(".calc-stats-chart .calc-stats-bar").length') > 1 &&
        await page.calc('!!document.querySelector(".calc-stats-chart .calc-stats-box")'), t + 'a histogram and a box plot');
    await page.at('.calc-stats-chart');
    await sleep(200);
    await page.hover('.calc-stats-chart');
    check(await page.until('!document.querySelector(".calc-tip:not(.calc-peek)").hidden && /^Histogram and box plot/.test(document.querySelector(".calc-tip:not(.calc-peek)").textContent)', 2500),
        t + 'the chart has its tip, of what it is');
    await page.hover('.calc-stats-tile[data-k="q1"]');
    check(await page.until('!document.querySelector(".calc-peek").hidden && /^First quartile/.test(document.querySelector(".calc-peek").textContent)', 2500) &&
        await page.calc('document.querySelector(".calc-peek .calc-peek-value").textContent') === '4' &&
        await page.calc('document.querySelectorAll(".calc-peek .calc-peek-act").length') === 2, t + 'Q1 has its tip: what it is, its value, Insert and Copy');
    await page.hover('.calc-stats-tile[data-k="q3"]'); // passed over on the way to the tip's buttons
    await page.hover('.calc-peek .calc-peek-value');
    await sleep(500);
    check(!await page.calc('document.querySelector(".calc-peek").hidden') && /^First quartile/.test(await page.calc('document.querySelector(".calc-peek").textContent')),
        t + 'another result passed over on the way to the tip leaves it as it is');
    await page.click('.calc-peek .calc-peek-act[data-act="copy"]');
    check(await open(page, '.calc-stats') && await page.calc('document.querySelector(".calc-peek").hidden'), t + 'Copy closes the tip, and leaves the panel open');
    await sleep(800);
    check(await page.calc('document.querySelector(".calc-peek").hidden'), t + 'and no other tip comes up under the pointer standing still');
    await page.at('.calc-stats-tile[data-k="vars"]'); // scrolled to first: a scroll puts a tip away
    await sleep(200);
    await page.hover('.calc-stats-tile[data-k="vars"]');
    check(await page.until('!document.querySelector(".calc-peek").hidden && /^Sample variance/.test(document.querySelector(".calc-peek").textContent)', 2500),
        t + 'from result to result, the tip of the next');
    await page.click('.calc-peek .calc-peek-act[data-act="insert"]');
    check(!await open(page, '.calc-stats') && await shown(page) === '4.571428571429' && await page.calc('document.querySelector(".calc-peek").hidden'),
        t + 'Insert of the tip puts s² in', await shown(page));
    await page.click('.calc-stat-btn');

    // the pairs, and the list kept apart
    await page.click('.calc-stats .calc-solve-tab[data-tab="pairs"]');
    check(await page.calc('document.querySelector(".calc-stats-input").value') === '' && /^Type or paste pairs/.test(await page.calc('document.querySelector(".calc-stats-input").placeholder')) &&
        await page.calc('document.activeElement.className') === 'calc-stats-input', t + 'Pairs: empty, with its own placeholder and the focus');
    await typed('1 2\n2 4.1\n3 5.9\n4 8.2\n5 9.9\nabc');
    check(await note() === '5 pairs · y = 0.05 + 1.99x · left out: abc', t + 'five pairs and their line', await note());
    got = [await tile('n'), await tile('xmean'), await tile('ymean'), await tile('b'), await tile('a'), await tile('cov'), await tile('sumxy')].join(' ');
    check(got === '5 3 6.02 1.99 0.05 4.975 110.2', t + 'their means, slope, intercept, covariance and Σxy', got);
    check(/^0\.99915513367/.test(await tile('r')), t + 'r', await tile('r'));
    check(await page.calc('document.querySelectorAll(".calc-stats-chart .calc-stats-dot").length') === 5 && await page.calc('!!document.querySelector(".calc-stats-chart .calc-stats-fit")'),
        t + 'a dot for each pair, and the line');
    await page.at('.calc-stats-chart');
    await sleep(200);
    await page.hover('.calc-stats-chart');
    check(await page.until('!document.querySelector(".calc-tip:not(.calc-peek)").hidden && /^Scatter plot/.test(document.querySelector(".calc-tip:not(.calc-peek)").textContent)', 2500),
        t + 'and its chart its own tip');
    await page.click('.calc-stats .calc-solve-tab[data-tab="list"]');
    check(await page.calc('document.querySelector(".calc-stats-input").value') === '2 4 4 4 5 5 7 9' && await tile('q3') === '6', t + 'the list is as it was');
    await page.click('.calc-stats .calc-solve-tab[data-tab="pairs"]');
    await page.click('.calc-stats-tile[data-k="b"]');
    check(!await open(page, '.calc-stats') && await shown(page) === '1.99', t + 'a click puts the slope in', await shown(page));

    // kept for the next time: the tab, and what is typed in each
    await page.go(page.base + at);
    await page.click('.calc-stat-btn');
    check(await page.calc('document.querySelector(".calc-stats .calc-solve-tab.calc-on").dataset.tab') === 'pairs' && await tile('n') === '5', t + 'the tab and the pairs are kept');
    await page.click('.calc-stats .calc-past-clear');
    check(await tile('n') === '–' && /^x and y on each line/.test(await note()), t + 'Clear empties the pairs', await note());
    await page.click('.calc-stats .calc-solve-tab[data-tab="list"]');
    check(await tile('n') === '8', t + 'and not the list');
    await page.key('Escape', 27);
}

// the lines of the open menu, the ones that cannot be chosen in brackets; '' while it is closed
function menu(page) {
    return page.calc('(function (m) { return m.hidden ? "" : [].map.call(m.querySelectorAll(":scope > div"), function (d) {' +
        ' return d.classList.contains("calc-off") ? "(" + d.textContent + ")" : d.textContent; }).join("|"); })' +
        '(document.querySelector(".calc-menu-box"))');
}

// Paste of the menu. The page around the calculator reads the clipboard for it and gives the
// text back; here the check stands in for the page, with this text as what the clipboard holds
async function paste(page, text) {
    await page.calc('document.defaultView.addEventListener("calc-paste", function (e) { e.stopImmediatePropagation(); ' +
        'e.detail.text(' + JSON.stringify(text) + '); }, { capture: true, once: true })');
    await pick(page, 'Paste');
}

async function pick(page, name) {
    var i = (await menu(page)).split('|').indexOf(name);
    check(i > -1, 'the menu has ' + name, await menu(page));
    await page.click('.calc-menu-box > div:nth-of-type(' + (i + 1) + ')'); // not the lines between them
}

// the menu of a right click: on the display, in the boxes and on the values of the panels
async function menus(page, at) {
    var t = at + ': ', box = 'document.querySelector(".calc-conv-value")';

    await page.fresh(at, {});
    await page.rightClick('#box');
    check(await menu(page) === 'Paste|Insert Var|Reset all', t + 'the menu of the display: nothing to cut, copy or store yet', await menu(page));
    await page.key('Escape', 27);
    check(await menu(page) === '', t + 'Esc closes it');
    await page.rightClick('.calc-right > :first-child');
    check(await menu(page) === '', t + 'no menu on the keys');

    // a box of a panel: the menu of the calculator, not the browser's
    await page.click('.calc-conv-btn');
    await page.calc('(function (i) { i.value = "12"; i.dispatchEvent(new Event("input")); i.select(); })(' + box + ')');
    await page.calc('window.shown = null, document.addEventListener("contextmenu", function (e) {' +
        ' setTimeout(function () { window.shown = !e.defaultPrevented; }); })');
    await page.rightClick('.calc-conv-value');
    check(await page.calc('window.shown') === false, t + 'in a box the menu of the browser stays away');
    check(/^Cut\|Copy\|Paste\|Select all$/.test(await menu(page)), t + 'a box with its text selected has Cut, Copy, Paste and Select all',
        await menu(page));
    await pick(page, 'Cut');
    check(await page.calc(box + '.value') === '' && await open(page, '.calc-conv'), t + 'Cut takes what is selected; the panel stays open',
        await page.calc(box + '.value'));
    check(await converted(page, 'feet') === '–', t + 'and the list follows');
    await page.rightClick('.calc-conv-value');
    check(await menu(page) === '(Cut)|(Copy)|Paste|(Select all)', t + 'an empty box only has Paste', await menu(page));
    await page.click('.calc-menu-box > .calc-off');
    check(await menu(page) !== '', t + 'a line that cannot be done does nothing');

    // Paste: the page around the calculator reads the clipboard and gives the text back
    await paste(page, '3\n');
    check(await page.until('((document.getElementById("calc-iframe") || {}).contentDocument || document)' +
        '.querySelector(".calc-conv-value").value === "3"'), t + 'Paste goes into the box', await page.calc(box + '.value'));
    check(await shown(page) === '0' && await converted(page, 'feet') !== '–', t + 'not into the equation; the list follows');
    await page.rightClick('.calc-past.calc-conv .calc-past-head span');
    check(await menu(page) === '(Cut)|(Copy)|Paste|Select all', t + 'beside the box, the menu of the box', await menu(page));
    await pick(page, 'Select all');
    check(await page.calc(box + '.selectionEnd - ' + box + '.selectionStart') === 1 &&
        await page.calc('document.activeElement === ' + box), t + 'Select all selects the box');

    // a value of the converter
    await page.calc('document.addEventListener("copy", function (e) { window.copied = e.clipboardData.getData("text/plain"); })');
    await page.rightClick('.calc-conv-row[data-i="2"] .calc-conv-num');
    check(await menu(page) === 'Copy|Copy with unit|Insert|Store in Var', t + 'a value has Copy, Copy with unit and Insert', await menu(page));
    await pick(page, 'Copy with unit');
    check(await page.calc('window.copied') === '300 cm' && await open(page, '.calc-conv'), t + 'Copy with unit takes 300 cm',
        await page.calc('window.copied'));
    await page.rightClick('.calc-conv-row[data-i="2"]');
    await pick(page, 'Copy');
    check(await page.calc('window.copied') === '300', t + 'Copy the number alone', await page.calc('window.copied'));
    await page.rightClick('.calc-conv-row[data-i="2"]');
    await pick(page, 'Insert');
    check(!await open(page, '.calc-conv') && await value(page) === 300, t + 'Insert puts 3 m in as 300 cm', await shown(page));

    // the statistics, a constant and a formula
    await page.click('.calc-stat-btn');
    await page.type('4 8');
    await page.rightClick('.calc-stats-tile[data-k="mean"]');
    check(await menu(page) === 'Copy|Insert|Store in Var', t + 'a result of the statistics has Copy and Insert', await menu(page));
    await pick(page, 'Insert');
    check(await value(page) === 6, t + 'Insert puts the mean in', await shown(page));
    await page.click('.calc-fx-btn');
    await page.click('.calc-fx-tab[data-tab="formulas"]');
    await page.rightClick('.calc-fx-row');
    check(await menu(page) === 'Copy|Open', t + 'a formula has Copy and Open', await menu(page));
    await pick(page, 'Copy');
    check(await page.calc('window.copied') === 'x = (−b + √(b² − 4ac)) ÷ 2a', t + 'Copy takes the formula as text',
        await page.calc('window.copied'));
    await page.rightClick('.calc-fx-row');
    await pick(page, 'Open');
    check(await page.calc('!!document.querySelector(".calc-fx-item.calc-on input")'), t + 'Open opens its letters');
    await page.click('.calc-fx-tab[data-tab="constants"]');
    await page.rightClick('.calc-fx-row');
    check(await menu(page) === 'Copy|(Copy with unit)|Insert|Store in Var', t + 'π has no unit to copy', await menu(page));
    await page.key('Escape', 27);
    check(await menu(page) === '' && await open(page, '.calc-fx'), t + 'Esc closes the menu first, the panel stays');
    await page.key('Escape', 27);

    // the history
    await page.type('1+2\r3+4\r');
    await page.click('.calc-hist');
    await page.rightClick('.calc-past-res');
    check(await menu(page) === 'Copy|Insert|Store in Var|Delete', t + 'a line of the history has Copy, Insert and Delete', await menu(page));
    await pick(page, 'Copy');
    check(await page.calc('window.copied') === '7' &&
        await page.calc('document.querySelector(".calc-past-list").parentNode.classList.contains("calc-open")'), t + 'Copy takes the result of the line',
        await page.calc('window.copied'));
    await page.rightClick('.calc-past-res');
    await pick(page, 'Delete');
    check(await page.calc('document.querySelectorAll(".calc-past-row").length') === 1, t + 'Delete takes the line out');
    await page.rightClick('.calc-past:not(.calc-stats):not(.calc-fx):not(.calc-conv):not(.calc-graph):not(.calc-solve):not(.calc-numbers) .calc-past-head span');
    check(await menu(page) === 'Clear history', t + 'above the lines, Clear history', await menu(page));
    await pick(page, 'Clear history');
    check(await page.calc('document.querySelector(".calc-hist").hidden'), t + 'which empties it');

    // what is selected has the shade of the calculator, in a box as in the display
    check(await page.calc('[document.getElementById("box"), document.querySelector(".calc-conv-value"), ' +
        'document.querySelector(".calc-stats-input"), document.querySelector(".calc-fx-search")].every(function (el) {' +
        ' return getComputedStyle(el, "::selection").backgroundColor === "rgba(31, 51, 60, 0.16)"; })'),
        t + 'selected text has the same shade everywhere');

    // Paste goes in place of what is selected in the display: all of the equation, with or without the cursor in it
    await page.fresh(at, {});
    await page.type('12+34');
    await page.calc('document.getSelection().selectAllChildren(document.body)'); // as Ctrl+A
    await page.rightClick('#box');
    await paste(page, '7');
    await sleep(60);
    check(await shown(page) === '7', t + 'Paste replaces the equation when all of it is selected', await shown(page));
    await page.type('23'); // a new number after the pasted one
    await page.click('#box');
    check(await page.calc('!!document.querySelector("#box .calc-cursor")'), t + 'a click in 23 puts the cursor in it');
    await page.calc('document.getSelection().selectAllChildren(document.body)');
    await page.rightClick('#box');
    await paste(page, '45+6');
    await sleep(60);
    check(await shown(page) === '45 + 6', t + 'and with the cursor in it, not at the cursor', await shown(page));

    // a part of it, with Ctrl+V
    await page.click('#box');
    await page.calc('(function (s, r) { r.selectNodeContents(document.querySelector("#box > span:not(.calc-cursor)"));' +
        ' s.removeAllRanges(); s.addRange(r); })(document.getSelection(), document.createRange())');
    await page.calc('document.body.dispatchEvent(Object.assign(new Event("paste", { bubbles: true }), ' +
        '{ clipboardData: { getData: function () { return "9"; } } }))');
    check(await shown(page) === '95 + 6', t + 'a paste over the 4 of 45 + 6 leaves 95 + 6', await shown(page));
    await page.type('\r');
    check(await value(page) === 101, t + 'which = works out', await shown(page));

    // and so does a key: a digit starts a new number in place of all of it, an operator goes on, DEL clears it
    await page.fresh(at, {});
    await page.type('123');
    await page.calc('document.getSelection().selectAllChildren(document.body)');
    await page.type('5');
    check(await shown(page) === '5', t + 'a digit typed over a selected number replaces it', await shown(page));
    await page.type('6');
    check(await shown(page) === '56', t + 'and the next one follows it: nothing stays selected', await shown(page));
    await page.calc('document.getSelection().selectAllChildren(document.body)');
    await page.type('+4');
    check(await shown(page) === '56 + 4', t + 'an operator over all of it goes on from it', await shown(page));
    await page.calc('document.getSelection().selectAllChildren(document.body)');
    await page.key('Backspace', 8);
    check(await shown(page) === '0', t + 'DEL over all of it clears the display', await shown(page));

    // a part of it: the key is written in its place
    await page.type('12+34');
    await page.click('#box');
    await page.calc('(function (s, r) { r.selectNodeContents(document.querySelector("#box > span:not(.calc-cursor)"));' +
        ' s.removeAllRanges(); s.addRange(r); })(document.getSelection(), document.createRange())');
    await page.type('9');
    check(await shown(page) === '92 + 34', t + 'a 9 over the 1 of 12 + 34 leaves 92 + 34', await shown(page));
    await page.calc('(function (s, r) { r.selectNodeContents(document.querySelector("#box > span:not(.calc-cursor)"));' +
        ' s.removeAllRanges(); s.addRange(r); })(document.getSelection(), document.createRange())');
    await page.key('Backspace', 8);
    check(await shown(page) === '2 + 34', t + 'and DEL takes the 9 out', await shown(page));
    await page.type('\r');
    check(await value(page) === 36, t + 'which = works out', await shown(page));

    // a result is replaced by a digit anyway, and what Ctrl+A selected does not take in the next key
    await page.calc('document.getSelection().selectAllChildren(document.body)');
    await page.type('78');
    check(await shown(page) === '78', t + 'two digits over a selected result are one number', await shown(page));

    // the keys of the calculator do the same as the keyboard
    await page.calc('document.getSelection().selectAllChildren(document.body)');
    await page.click('.calc-right > :first-child');
    check(await shown(page) === '7', t + 'a click on 7 over a selected number replaces it', await shown(page));
    await page.type('5');
    await page.calc('document.getSelection().selectAllChildren(document.body)');
    await page.click('#del');
    check(await shown(page) === '0', t + 'and a click on DEL clears it', await shown(page));

    // a line too long for the display: a drag selects in it, as in a short one; held still for a moment first, it slides
    async function drag(dx, hold, stay) { // from the middle of the display
        var p = await page.at('#box');
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] });
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p[0], y: p[1], button: 'left', buttons: 1, clickCount: 1 });
        await sleep(hold);
        for (var i = 1; i <= 4; i++) {
            await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0] + dx * i / 4, y: p[1], button: 'left', buttons: 1 });
        }
        await sleep(stay || 0);
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p[0] + dx, y: p[1], button: 'left', clickCount: 1 });
        await sleep(60);
    }
    function slidTo() {
        return page.calc('document.getElementById("box").scrollLeft');
    }
    function selected() {
        return page.calc('document.getSelection().toString()');
    }
    var end, text, part;

    await page.type('123456789+123456789+123456789+123456789+123456789');
    text = await shown(page);
    end = await slidTo();
    check(end > 0 && await page.calc('document.getElementById("box").classList.contains("calc-slide")'), t + 'a long equation does not fit', end);
    check(await page.calc('(function (box, style) { return parseFloat(style.lineHeight) < 1.5 * parseFloat(style.fontSize) && box.offsetHeight === 46; })' +
        '(document.getElementById("box"), getComputedStyle(document.getElementById("box")))'),
        t + 'in its small font the line is less tall, and the shade of selected text with it; the display is as tall as ever');
    await drag(-60, 0);
    part = await selected();
    check(await slidTo() === end && part.length > 2 && text.indexOf(part) > -1, t + 'a drag selects in it and the line stays', part);
    check(await shown(page) === text, t + 'and no cursor goes in', await shown(page));
    await page.key('Backspace', 8);
    check((await shown(page)).length === text.length - part.length, t + 'DEL takes out what was selected so', await shown(page));
    await page.type('\r');
    await page.type('123456789+123456789+123456789+123456789+123456789');
    end = await slidTo();
    await drag(80, 600);
    check(await slidTo() === end - 80 && await selected() === '', t + 'held still first, it slides to show more, and selects nothing',
        await slidTo() + ' ' + await selected());
    check(!await page.calc('document.getElementById("box").classList.contains("calc-grab")'), t + 'and the hand is gone once it is let go');
    await drag(-400, 0, 500); // out over the left edge
    check(await slidTo() < end - 120 && (await selected()).length > 12, t + 'at the edge the line moves along under the selection',
        await slidTo() + ' ' + await selected());
    await page.click('#box');
    check(await selected() === '' && await page.calc('!!document.querySelector("#box .calc-cursor")'),
        t + 'a click drops the selection and puts the cursor in');

    // a finger slides it at once, as it scrolls a page
    end = await slidTo();
    await page.calc('(function (box, at) {' +
        ' box.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", clientX: at, bubbles: true }));' +
        ' document.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: at - 50, bubbles: true }));' +
        ' document.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", clientX: at - 50, bubbles: true }));' +
        ' })(document.getElementById("box"), 200)');
    check(await slidTo() === end + 50 && await selected() === '', t + 'a finger slides the line at once', await slidTo() + ' ' + end);

    // a double click selects the whole number under it, between its operators
    async function doubleClick(n) { // on the n-th character of the display
        var p = await page.calc('(function (walk, r, n, node) { while ((node = walk.nextNode())) {' +
            ' if (n < node.length) { r.setStart(node, n); r.setEnd(node, n + 1); r = r.getBoundingClientRect();' +
            ' return [r.left + r.width / 2, r.top + r.height / 2]; } n -= node.length; } })' +
            '(document.createTreeWalker(document.getElementById("box"), NodeFilter.SHOW_TEXT), document.createRange(), ' + n + ')');
        for (var count = 1; count < 3; count++) {
            for (var type of ['mousePressed', 'mouseReleased']) {
                await page.send('Input.dispatchMouseEvent', { type: type, x: p[0], y: p[1], button: 'left', clickCount: count });
            }
        }
        await sleep(60);
    }
    await page.type('\r');
    await page.type('123456789+123456789+123456789+123456789+123456789');
    await doubleClick(56); // its last digit, at the end of the display
    check(await selected() === '123456789', t + 'a double click in a long equation selects the number under it', await selected());
    await page.fresh(at, {});
    await page.type('12+345+6');
    await doubleClick(6); // the 4
    check(await selected() === '345' && await page.calc('!!document.querySelector("#box .calc-cursor")'),
        t + 'a double click on the 4 of 12 + 345 + 6 selects 345, around the cursor the first click put in it', await selected());
    await page.type('9');
    check(await shown(page) === '12 + 9 + 6', t + 'and a digit goes in its place', await shown(page));
    await doubleClick(3); // the +
    check(await selected() === '+', t + 'on an operator it selects the operator', await selected());
    await page.type('*');
    check(await shown(page) === '12 × 9 + 6', t + 'which another one replaces', await shown(page));
    await page.type('\r');
    check(await value(page) === 114, t + 'which = works out', await shown(page));
    await doubleClick(0);
    check(await selected() === '114', t + 'a result is selected whole', await selected());
    await page.type('5h2');
    await doubleClick(0);
    check(await selected() === '5', t + 'not the power above a number with it', await selected() + ' of ' + await shown(page));

    // Cut in the menu of the display, and Ctrl+X: what Copy takes, and it is taken out
    await page.fresh(at, {});
    await page.calc('document.addEventListener("copy", function (e) { window.copied = e.clipboardData.getData("text/plain"); })');
    await page.type('12+345+6');
    await doubleClick(6);
    await page.rightClick('#box');
    check(await menu(page) === 'Cut|Copy|Paste|Insert Var|Store in Var|Reset all', t + 'the display has Cut, Copy and Store in Var once something is entered', await menu(page));
    await pick(page, 'Cut');
    check(await page.calc('window.copied') === '345' && await shown(page) === '12 + + 6', t + 'Cut takes the selected 345 out of 12 + 345 + 6',
        await page.calc('window.copied') + ' | ' + await shown(page));
    await page.type('7');
    check(await shown(page) === '12 + 7 + 6', t + 'and the cursor is where it was', await shown(page));
    await page.rightClick('#box');
    await pick(page, 'Cut');
    check(await page.calc('window.copied') === '12 + 7 + 6' && await shown(page) === '0', t + 'with nothing selected Cut takes the whole equation',
        await page.calc('window.copied') + ' | ' + await shown(page));
    await page.type('8+9');
    await page.calc('document.getSelection().selectAllChildren(document.body)');
    await page.calc('(function (data) { document.body.dispatchEvent(Object.assign(new Event("cut", { bubbles: true, cancelable: true }), ' +
        '{ clipboardData: { setData: function (type, text) { window.cutText = text; } } })); })()');
    check(await page.calc('window.cutText') === '8 + 9' && await shown(page) === '0', t + 'Ctrl+X cuts what is selected',
        await page.calc('window.cutText') + ' | ' + await shown(page));

    // the line above a result is not selected: a drag slides it, and a double click opens it in the display again
    async function press(selector, dx, count) { // a press on it that goes dx along before it lets go
        var p = await page.at(selector);
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] });
        for (var n = 1; n <= (count || 1); n++) {
            await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p[0], y: p[1], button: 'left', buttons: 1, clickCount: n });
            if (dx) await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0] + dx, y: p[1], button: 'left', buttons: 1 });
            await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p[0] + dx, y: p[1], button: 'left', clickCount: n });
        }
        await sleep(60);
    }
    function above() {
        return page.calc('document.querySelector(".calc-log").textContent.trim()');
    }
    await page.type('123456789+123456789+123456789+123456789+123456789\r');
    end = await page.calc('document.querySelector(".calc-log").scrollLeft');
    check(end > 0 && await page.calc('getComputedStyle(document.querySelector(".calc-log")).userSelect') === 'none',
        t + 'the text of the line above a result is not selected', end);
    await press('.calc-log', 60);
    check(await page.calc('document.querySelector(".calc-log").scrollLeft') === end - 60 && await selected() === '' && await above() !== '',
        t + 'a drag slides it at once, selects nothing in it and does not open it',
        await page.calc('document.querySelector(".calc-log").scrollLeft') + ' ' + await selected());
    await sleep(500);
    await press('.calc-log', 0);
    check(await above() === '' && await page.calc('!!document.querySelector("#box .calc-cursor")') &&
        (await shown(page)).replace(/\s/g, '') === '123456789+123456789+123456789+123456789+123456789' && await selected() === '',
        t + 'one click on it opens the equation in the display, with the cursor in it', await shown(page) + ' | ' + await selected());
    await page.type('\r');
    await sleep(500);
    await press('.calc-log', 0, 2);
    check(await above() === '' && await page.calc('!!document.querySelector("#box .calc-cursor")') && await selected() === '123456789',
        t + 'a double click opens it with the number under it selected', await shown(page) + ' | ' + await selected());
    await page.type('\r1+2\r');
    await page.calc('document.getSelection().selectAllChildren(document.getElementById("box"))');
    await press('.calc-log', 0, 2);
    check(await above() === '' && await shown(page) === '1 + 2' && await selected() !== '3', t + 'with the result selected as well',
        await shown(page) + ' | ' + await selected());
}

// the options turn the buttons on and off in an open calculator, by the storage
async function options(page) {
    var t;

    await page.fresh('/frame.html', {});
    t = 'in a frame: ';
    check(await buttons(page) === 'calc-fx-btn calc-conv-btn calc-graph-btn calc-solve-btn calc-stat-btn calc-numbers-btn', t + 'all four buttons');
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
    await page.ev('localStorage.setItem("policy", JSON.stringify({ converter: false }))');
    check(await page.until('document.getElementById("calc-iframe").contentDocument.querySelector(".calc-conv-btn").hidden'),
        t + 'turned off by an administrator, it goes');
    await page.ev('localStorage.setItem("policy", "{}")');
    check(await page.until('!document.getElementById("calc-iframe").contentDocument.querySelector(".calc-conv-btn").hidden'),
        t + 'and comes back when the administrator turns it on');
}

// An administrator's policy, which policy.js reads from chrome.storage.managed: the browser
// is a stub here, with the policy it holds and the listeners told of a change of it
async function adminPolicy(page) {
    var t = 'policy: ', script, shut = 'document.defaultView.shut.length',
        stub = 'window.managed = { graph: false, detachedMode: false }; window.changed = []; window.shut = [];' +
            ' window.close = function () { window.shut.push(1); };' +
            ' Object.defineProperty(window, "chrome", { configurable: true, value: {' +
            ' runtime: { sendMessage: function () { return Promise.resolve(); }, getManifest: function () { return { version: "0" }; } }, windows: { getCurrent: function () { } },' +
            ' permissions: { contains: function (a, done) { done(false); }, request: function () { },' +
            ' onAdded: { addListener: function () { } }, onRemoved: { addListener: function () { } } },' +
            ' storage: { managed: { get: function (k, done) { setTimeout(function () { done(JSON.parse(JSON.stringify(window.managed))); }); } },' +
            ' onChanged: { addListener: function (f) { window.changed.push(f); } } } } });',
        change = function (policy) {
            return page.ev('window.managed = ' + JSON.stringify(policy) + '; window.changed.forEach(function (f) { f({}, "managed"); })');
        },
        // the options page has no calculator to wait for
        options = async function () {
            await page.send('Page.navigate', { url: page.base + '/options.html' });
            await page.until('document.readyState === "complete" && !!document.getElementById("panel-graph")');
            await sleep(80);
        };

    await page.send('Page.enable');
    script = (await page.send('Page.addScriptToEvaluateOnNewDocument', { source: stub })).result.identifier;

    // the popup: the graph goes, kept for the next time it opens
    await page.fresh('/popup.html', {});
    check(await page.until('document.querySelector(".calc-graph-btn").hidden'), t + 'the graph turned off goes from the popup');
    check(await buttons(page) === 'calc-fx-btn calc-conv-btn calc-solve-btn calc-stat-btn calc-numbers-btn', t + 'the rest stays', await buttons(page));
    check(await page.ev('localStorage.getItem("policy")') === '{"graph":false,"detachedMode":false,"pageButton":false}',
        t + 'kept, with the button on the pages, which opens Detached Mode', await page.ev('localStorage.getItem("policy")'));
    await change({});
    check(await page.until('!document.querySelector(".calc-graph-btn").hidden'), t + 'turned on again, it comes back');

    // the windows of what is turned off close
    await change({ graph: false, detachedMode: false });
    await page.go(page.base + '/popup.html?detached');
    check(await page.until(shut + ' > 0'), t + 'the detached window closes');
    await page.go(page.base + '/popup.html?graph', [700, 500]);
    check(await page.until(shut + ' > 0'), t + 'and the graph\'s own window');

    // the options page: what is turned off cannot be turned on, and says why
    await options();
    check(await page.until('document.getElementById("panel-graph").disabled') && !await page.ev('document.getElementById("panel-graph").checked') &&
        /administrator/.test(await page.ev('document.getElementById("panel-graph").closest(".option").textContent')),
        t + 'the graph\'s switch is off and locked, and says it is the administrator\'s');
    check(await page.ev('document.getElementById("open-mode").disabled && document.querySelector("#open-mode input[value=fixed]").checked && ' +
        '!document.getElementById("launch-detached").disabled && document.getElementById("page-icon").disabled'),
        t + 'Detached cannot be chosen, Launch opens the popup, and the button on the pages cannot be turned on');
    check(await page.ev('!document.getElementById("panel-fx").disabled && document.getElementById("panel-fx").checked && ' +
        '!document.querySelector("#panel-fx").closest(".option").querySelector(".managed-note")'), t + 'f(x) is as it was');
    await change({ solve: false, numbers: false });
    check(await page.until('document.getElementById("panel-solve").disabled') && await page.ev('document.getElementById("panel-numbers").disabled && ' +
        '!document.getElementById("panel-solve").checked && !document.getElementById("panel-graph").disabled'), t + 'the switches of the solver and the numbers are locked too');
    await change({});
    check(await page.until('!document.getElementById("panel-graph").disabled') && await page.ev('document.getElementById("panel-graph").checked') &&
        !await page.ev('document.querySelector(".managed-note")') && !await page.ev('document.getElementById("open-mode").disabled'),
        t + 'turned on again, the switches are as they were kept');

    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
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
        await calculator(page, '/popup.html');
        await secondKeys(page, '/popup.html');
        await letters(page, '/popup.html');
        await otherLayouts(page, '/popup.html');
        await degreesMinutes(page, '/popup.html');
        await angleUnits(page, '/popup.html');
        await modeKey(page, '/popup.html');
        await converter(page, '/popup.html');
        await convDates(page, '/popup.html');
        await statsMore(page, '/popup.html');
        await solver(page, '/popup.html');
        await numbersPanel(page, '/popup.html');
        await matrixTen(page, '/popup.html');
        await matrixPaste(page, '/popup.html');
        await finance(page, '/popup.html');
        await graphSequence(page, '/popup.html');
        await graphSlopeField(page, '/popup.html');
        await historyExport(page, '/popup.html');
        await graphPanel(page, '/popup.html');
        await graphTable(page, '/popup.html');
        await graphHide(page, '/popup.html');
        await graphMany(page, '/popup.html');
        await graphSlide(page, '/popup.html');
        await graphBig(page, '/popup.html');
        await menus(page, '/popup.html');
        await options(page);
        await adminPolicy(page);
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
