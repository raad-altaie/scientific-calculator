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
    // the website fits the calculator to the window: this wide, it is drawn at its own size
    if (!size && url.indexOf('/web/') > -1) size = [384, 620];
    await this.send('Emulation.setDeviceMetricsOverride', { width: size ? size[0] : 400, height: size ? size[1] : 620, deviceScaleFactor: 1, mobile: false });
    await this.send('Page.navigate', { url: url });
    await this.until('document.readyState === "complete" && ' +
        '!!((document.getElementById("calc-iframe") || {}).contentDocument || document).querySelector(".calc-tools")');
    // the popup draws the calculator a little bigger, to fill its height: the checks measure it at its own size
    if (url.indexOf('/web/') < 0) await this.calc('document.getElementById("calculator").style.transform = "none"');
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
    check(await page.until('/^Type the start/.test(document.querySelector(".calc-tip").textContent)', 2000), t + 'the box of an end has its tip');

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

// The big graph: on the website the calculator fills the window with it, not the screen; Esc,
// its button or a value put in make it small. In the extension it has a window of
// its own, popup.html?graph, with only the graph, which keeps up with the calculator
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
    check(await open(page, '.calc-solve') && await page.calc('document.querySelectorAll(".calc-solve .calc-solve-tab").length') === 3 &&
        await page.calc('document.querySelectorAll(".calc-solve .calc-sv-item").length') === 10, t + 'its button opens it: three tabs, ten cards on the first');
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

    await page.click('.calc-solve-tab[data-tab="calculus"]');
    await card('Integral');
    await set(0, 'x^2');
    await set(2, '3');
    check(await page.calc(tiles) === '∫=9', t + 'the integral of x² from 0 to 3', await page.calc(tiles));
    await set(0, 'e^(-x)');
    await set(2, 'inf');
    check(await page.calc(tiles) === '∫=1', t + 'of e^-x to ∞', await page.calc(tiles));
    await card('Sum');
    await set(0, 'n^2');
    check(await page.calc(tiles) === 'Σ=385', t + 'the sum of n² from 1 to 10, its ends while empty', await page.calc(tiles));
    await card('Limit');
    await set(0, 'sin(x)/x');
    check(await page.calc(tiles) === 'Limit=1 | From below=1 | From above=1', t + 'sin(x)/x comes to 1 at 0, in Rad', await page.calc(tiles));
    await set(0, '1/x');
    check(await page.calc(tiles) === 'Limit=– | From below=–∞ | From above=∞' && /^No limit/.test(await page.calc(note)), t + '1/x goes to –∞ and ∞', await page.calc(tiles));
    await set(1, 'abc');
    check(await page.calc(note) === '', t + 'a limit at what is not a number blames not the function', await page.calc(note));
    await set(0, '(1+1/x)^x');
    await set(1, 'inf');
    check(await page.calc(tiles) === 'Limit=2.71828182846', t + '(1 + 1/x)^x comes to e at ∞, one side only', await page.calc(tiles));
    await card('Differential equation');
    await set(0, 'y');
    check(await page.calc(tiles) === 'y(x)=2.718281828 | y′(x)=2.718281828', t + 'y′ = y from y(0) = 1 is e at 1', await page.calc(tiles));
    await set(0, 'a y');
    check(/^Only x and y/.test(await page.calc(note)), t + 'a letter of its own says so', await page.calc(note));

    await page.click('.calc-solve-tab[data-tab="chance"]');
    await card('Normal probability');
    await set(0, '-1');
    await set(1, '1');
    check(await page.calc(tiles) === 'P(a ≤ X ≤ b)=0.682689492137 | Outside=0.317310507863', t + 'within one σ of the mean', await page.calc(tiles));
    await page.click(on + ' .calc-sv-tile');
    check(!await open(page, '.calc-solve') && near(await value(page), 0.682689492137), t + 'a click on a result puts it in', await value(page));
    await page.click('.calc-solve-btn');
    check(await page.calc('document.querySelector(".calc-solve-tab.calc-on").dataset.tab') === 'chance' &&
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
    await set(0, 'x + i');
    check(/^Not a complex number/.test(await page.calc(note)), t + 'x has no value here', await page.calc(note));
    await card('Roots of a complex number');
    await set(0, '-16');
    check(await page.calc(tiles) === 'z1=1.41421356237 + 1.41421356237i | z2=-1.41421356237 + 1.41421356237i | z3=-1.41421356237 – 1.41421356237i | ' +
        'z4=1.41421356237 – 1.41421356237i', t + 'the four fourth roots of -16', await page.calc(tiles));

    await page.click('.calc-numbers .calc-solve-tab[data-tab="base"]');
    check(await page.calc('document.querySelectorAll(".calc-numbers .calc-sv-item").length') === 3, t + 'three cards of bases');
    await card('Bases');
    await set(0, '0xFF AND 0b1010');
    check(await page.calc(tiles) === 'Decimal=10 | Unsigned=10 | Hexadecimal=A | Octal=12 | Binary=0000 0000 0000 0000 0000 0000 0000 1010',
        t + '0xFF AND 0b1010 in every base', await page.calc(tiles));
    await set(0, '-1');
    await set(1, '8');
    check(await page.calc(tiles) === 'Decimal=-1 | Unsigned=255 | Hexadecimal=FF | Octal=377 | Binary=1111 1111', t + '-1 in 8 bits', await page.calc(tiles));
    await set(0, '0x81 rol 1');
    check((await page.calc(tiles)).indexOf('Decimal=3 | ') === 0, t + 'ROL turns the bits round', await page.calc(tiles));
    await set(0, '0x81 rol');
    check(/ROL ROR\.$/.test(await page.calc(note)), t + 'what is not one says ROL and ROR as well', await page.calc(note));
    await card('Bits');
    await set(1, '8');
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
    await card('IEEE 754');
    await set(0, '0.1');
    got = await page.calc(tiles);
    check(got.indexOf('Number=0.1 | Double, 64 bits=0x3FB999999999999A | Kept as a double=0.1000000000000000055511151231257827021181583404541015625 | Sign=+ | Exponent=-4 | Kind=Normal') === 0 &&
        got.indexOf('Float, 32 bits=0x3DCCCCCD | Kept as a float=0.100000001490116119384765625') > 0,
        t + '0.1 as a double and a float, to its last digit', got);
    await set(0, '0x3DCCCCCD');
    check(/^The bits of a float/.test(await page.calc(note)) && (await page.calc(tiles)).indexOf('Double, 64 bits=0x3FB99999A0000000') > 0, t + 'the bits of a float for the number', await page.calc(tiles));

    await page.click('.calc-numbers .calc-solve-tab[data-tab="matrix"]');
    await card('A matrix');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 5, t + 'a matrix of 2×2 at first, its size and four boxes');
    for (const [n, v] of [[1, '1'], [2, '2'], [3, '3'], [4, '4']]) await set(n, v);
    got = await page.calc(tiles);
    check(got.indexOf('det A=-2 | Rank=2 | A–1=-211.5-0.5 | AT=1324') === 0, t + 'det, rank and inverse of [1 2; 3 4]', got);
    await set(0, '3');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 10 &&
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
    await set(1, 'a1b.5.c-');
    check(await page.calc('document.querySelectorAll("' + on + ' input")[1].value') === '1.5', t + 'a box of a number keeps only a number, as the formulas\' do',
        await page.calc('document.querySelectorAll("' + on + ' input")[1].value'));
    await set(0, '2a×b2');
    check(await page.calc('document.querySelector("' + on + ' input").value') === '2×2', t + 'and its size only a size', await page.calc('document.querySelector("' + on + ' input").value'));
    await set(0, '5');
    check(/^A size/.test(await page.calc(note)) && await page.calc(tiles) === 'λ=–', t + 'eigenvalues: a size that is not one is said so', await page.calc(note));
    await card('A x = b');
    check(await page.calc('document.querySelectorAll("' + on + ' input").length') === 7 && await page.calc('document.querySelectorAll("' + on + ' .calc-sv-rhs").length') === 2,
        t + 'A x = b: a size, and a row of A and of b for each equation');
    for (const [n, v] of [[1, '1'], [2, '1'], [3, '3'], [4, '1'], [5, '-1'], [6, '1']]) await set(n, v);
    check(await page.calc(tiles) === 'x1=2 | x2=1', t + 'x + y = 3 and x – y = 1', await page.calc(tiles));
    await set(0, '3 2');
    for (const [n, v] of [[1, '1'], [2, '0'], [3, '1'], [4, '0'], [5, '1'], [6, '2'], [7, '1'], [8, '1'], [9, '4']]) await set(n, v);
    check(/^No answer/.test(await page.calc(note)), t + 'three equations of two unknowns that cannot all hold', await page.calc(note));

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

async function graphBig(page, at) {
    var t = at + ': big: ', big = 'document.getElementById("calculator").classList.contains("calc-big")',
        note = 'document.querySelector(".calc-graph-note").textContent',
        plot = 'document.querySelector(".calc-graph-plot")',
        sent = 'JSON.stringify(document.defaultView.sent)',
        // what popup.js asks of the extension, kept to be read; window.chrome cannot be set over
        unit, stub = 'window.sent = []; window.close = function () { window.sent.push("close"); };' +
            ' Object.defineProperty(window, "chrome", { configurable: true, value:' +
            ' { runtime: { sendMessage: function (m) { window.sent.push(m); return Promise.resolve(); } } } });',
        script, width, ends, on,
        // the line between the columns dragged by dx pixels: dragAt goes in twentieths of its 12px
        split = function (dx) { return page.dragAt('.calc-graph-split', 0, 0, dx * 20 / 12, 0); };

    if (at.indexOf('/web/') < 0) {
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
        return;
    }

    await page.fresh(at, { graph: { f: ['a x^2-3', '', ''], view: null } }, [900, 700]); // a = 1, with its slider
    await page.click('.calc-graph-btn');
    check(await page.calc(plot + '.clientWidth') < 400, t + 'the graph is small at first', await page.calc(plot + '.clientWidth'));
    await page.hover('.calc-graph-size');
    check(await page.until('/^Pop out/.test(document.querySelector(".calc-tip").textContent)', 2000), t + 'the button has its tip');
    await page.click('.calc-graph-size');
    check(await page.calc(big) && await page.calc(plot + '.clientWidth') > 500 && await page.calc(plot + '.clientHeight') > 600,
        t + 'big, the plot has most of the page', await page.calc(plot + '.clientWidth + "x" + ' + plot + '.clientHeight'));
    check(await page.calc('(function (q) { var p = q(".calc-graph-plot").getBoundingClientRect(); return p.top < 40 && ' +
        '[".calc-graph-tabs", ".calc-past-clear", ".calc-graph-fns"].every(function (s) { return q(s).getBoundingClientRect().right < p.left; }) && ' +
        'q(".calc-graph-size").getBoundingClientRect().left > p.right - 40 && q(".calc-graph-size").getBoundingClientRect().bottom <= p.top; })' +
        '(function (s) { return document.querySelector(".calc-graph " + s); })'),
        t + 'big: the tabs, Clear and the boxes at the left of the plot, pop in above its right corner');
    width = await page.calc(plot + '.clientWidth');
    await split(50);
    check(await page.calc(plot + '.clientWidth') === width - 50 && await page.calc('document.querySelector(".calc-graph-plot canvas").width') === width - 50,
        t + 'big: the line between the columns makes the left one wider, and the plot is drawn again', await page.calc(plot + '.clientWidth'));
    await split(-800);
    check((await page.calc('getComputedStyle(document.querySelector(".calc-graph")).gridTemplateColumns')).split(' ')[0] === '270px',
        t + 'big: the left column is never narrower than 270px', await page.calc('getComputedStyle(document.querySelector(".calc-graph")).gridTemplateColumns'));
    check(await page.calc('(function (q) { var h = q(".calc-past-head"), left = q(".calc-graph-plot").getBoundingClientRect().left; ' +
        'return h.scrollWidth <= h.clientWidth && [].every.call(h.querySelectorAll(".calc-graph-tab"), function (b) { return b.scrollWidth <= b.clientWidth; }) && ' +
        '[".calc-past-clear", ".calc-graph-sliders"].every(function (s) { return q(s).getBoundingClientRect().right < left && q(s).scrollWidth <= q(s).clientWidth; }); })' +
        '(function (s) { return document.querySelector(".calc-graph " + s); })'),
        t + 'big: that narrow, the tabs, Clear and a slider fit in it, whole, short of the plot');
    await split(2000);
    check(await page.calc('(function (g) { return parseFloat(getComputedStyle(g).gridTemplateColumns) <= (g.clientWidth - 320) * 0.7 + 1; })' +
        '(document.querySelector(".calc-graph"))'), t + 'big: nor wider than 0.7 of the room that leaves the plot 320px',
        await page.calc('getComputedStyle(document.querySelector(".calc-graph")).gridTemplateColumns'));
    await page.calc('document.querySelector(".calc-graph-split").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))');
    check(await page.calc(plot + '.clientWidth') === width && JSON.parse(await page.ev('localStorage.getItem("graph")')).side === 0,
        t + 'big: a double click puts it back', await page.calc(plot + '.clientWidth'));
    check(await page.calc('document.querySelector(".calc-graph-plot canvas").width') === await page.calc(plot + '.clientWidth'),
        t + 'its canvas is drawn at that size');
    check(await page.calc('(function (b) { return b.left === 0 && b.top === 0 && b.width === innerWidth; })' +
        '(document.getElementById("calculator").getBoundingClientRect())'), t + 'the calculator fills the page, unscaled');
    await page.hoverAt('.calc-graph-plot', 0, -3);
    check(/^Min/.test(await page.calc(note)), t + 'the points are found on the big plot too', await page.calc(note));
    await page.clickAt('.calc-graph-plot', 0, -3);
    check(await page.calc('(function (p, c) { return Math.abs(p.left + p.width / 2 - (c.left + c.width / 2)) < 2; })' +
        '(document.querySelector(".calc-graph-pop").getBoundingClientRect(), document.querySelector(".calc-graph-plot").getBoundingClientRect())'),
        t + 'big: the popup of the point clicked is over the point', await page.calc('JSON.stringify(document.querySelector(".calc-graph-pop").getBoundingClientRect())'));
    await page.key('Escape', 27); // the point goes
    await page.key('Escape', 27);
    check(!await page.calc(big) && await open(page, '.calc-graph') && await page.calc(plot + '.clientWidth') < 400,
        t + 'Esc makes it small, the graph stays open');
    await page.click('.calc-graph-size');
    await page.click('.calc-graph-input');
    await page.key('Escape', 27);
    check(!await page.calc(big) && await open(page, '.calc-graph'), t + 'Esc while typing in a box makes it small too, not closed');

    // the window, not the screen; the button makes it small again
    await page.click('.calc-graph-size');
    check(await page.calc(big) && await page.ev('!document.fullscreenElement'), t + 'it is not full screen');
    await page.click('.calc-graph-size');
    check(!await page.calc(big) && await open(page, '.calc-graph'), t + 'the button makes it small again');

    // a value put in from the big graph: the calculator again
    await page.click('.calc-graph-size');
    await page.clickAt('.calc-graph-plot', 0, -3);
    await page.click('.calc-graph-pop-row[data-put="y"]');
    check(!await page.calc(big) && !await open(page, '.calc-graph') && await value(page) === -3, t + 'y put in: the calculator, small',
        await shown(page));
    await page.click('.calc-graph-btn');
    check(!await page.calc(big), t + 'the graph opens small the next time');
    await page.click('.calc-graph-size');
    check(!await page.calc('document.querySelector(".calc-graph .calc-past-close").offsetWidth'), t + 'big, it has no close button');
    await page.click('.calc-graph-size');
    check(await page.calc('document.querySelector(".calc-graph .calc-past-close").offsetWidth') > 0, t + 'small, it has it again');

    // With ∫ pressed a drag never moves the view: begun left of √x, where it has no value, the
    // area starts where the drag first reaches it
    await page.fresh(at, { graph: { f: ['sqrt(x)', '', ''], view: null } }, [900, 700]);
    await page.click('.calc-graph-btn');
    await page.click('.calc-graph-zoom [data-zoom="area"]');
    await page.dragAt('.calc-graph-plot', -3, 1, 2, 1);
    ends = 'document.querySelector(".calc-graph-pop-end[data-end=a]").value + " to " + document.querySelector(".calc-graph-pop-end[data-end=b]").value';
    check(await page.calc('JSON.parse(localStorage.getItem("graph")).view') === null && /^0\.?\d* to 2$/.test(await page.calc(ends)),
        t + 'a drag with ∫ begun where no curve is: an area from where it reaches √x, the view still', await page.calc(ends));

    // a button of the view lets ∫ go: closer, farther, the start, the view typed; not save
    on = 'document.querySelector("[data-zoom=area]").classList.contains("calc-on")';
    for (var z of ['in', 'out', 'home', 'window']) {
        if (!await page.calc(on)) await page.click('.calc-graph-zoom [data-zoom="area"]');
        await page.click('.calc-graph-zoom [data-zoom="' + z + '"]');
        check(!await page.calc(on), t + 'the button ' + z + ' lets ∫ go');
    }
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
    check(await menu(page) === 'Copy|Insert', t + 'a value has Copy and Insert', await menu(page));
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
    // a part selected in it is where a key writes: the spaces between the thousands are not counted
    await page.calc('(function () { var box = document.getElementById("box"), walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), ' +
        'last, node, range = document.createRange(); while ((node = walk.nextNode())) if (/\\d/.test(node.data)) last = node; ' +
        'range.setStart(last, last.data.length - 2); range.setEnd(last, last.data.length); ' +
        'getSelection().removeAllRanges(); getSelection().addRange(range); })()');
    await page.type('5');
    check(await page.calc(raw) === '1\u2009234\u2009567 + 5', t + 'a key over the selected 89 replaces it', await page.calc(raw));

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
    await page.calc('(function (i) { i.value = "-1.2,3-4e5"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-conv-value"))');
    check(await page.calc('document.querySelector(".calc-conv-value").value') === '-1,2345', t + 'a number box: one comma, a point typed is it',
        await page.calc('document.querySelector(".calc-conv-value").value'));
    // a letter of a formula: typed with the comma, and 1,234 for it is 1.234 in the equation, not 1234
    await page.type('\x1b');
    await page.click('.calc-fx-btn');
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

    // floor and ceil on the 2nd layer of abs and x!, side by side, and round on that of Rand
    await page.fresh(at, {});
    await page.click(KEYS + '1)');
    check(await label(KEYS + '25)') === 'floor' && await label(KEYS + '26)') === 'ceil' && await label(KEYS + '30)') === 'round',
        t + '2nd turns abs, x! and Rand into floor, ceil and round', await label(KEYS + '25)') + ' ' + await label(KEYS + '26)') + ' ' + await label(KEYS + '30)'));
    for (const [key, want] of [['25', 3], ['26', 4], ['30', 4]]) {
        await page.click(KEYS + key + ')');
        await page.type('7/2\r');
        check(await value(page) === want, t + '7/2 ' + await label(KEYS + key + ')') + ' = ' + want, await shown(page));
    }
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
    await page.type('s100\r');
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
    await page.type('a*+#');
    check(await page.calc('document.querySelector(".calc-conv-value").value') === '6', t + 'letters and signs are not taken',
        await page.calc('document.querySelector(".calc-conv-value").value'));
    await page.calc('(function (i) { i.value = "-1.2.3-4e5"; i.dispatchEvent(new Event("input")); })(document.querySelector(".calc-conv-value"))');
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

// the lines of the open menu, the ones that cannot be chosen in brackets; '' while it is closed
function menu(page) {
    return page.calc('(function (m) { return m.hidden ? "" : [].map.call(m.children, function (d) {' +
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
    await page.click('.calc-menu-box > div:nth-child(' + (i + 1) + ')');
}

// the menu of a right click: on the display, in the boxes and on the values of the panels
async function menus(page, at) {
    var t = at + ': ', box = 'document.querySelector(".calc-conv-value")';

    await page.fresh(at, {});
    await page.rightClick('#box');
    check(await menu(page) === '(Cut)|Copy|Paste|Reset all', t + 'the menu of the display; nothing to cut yet', await menu(page));
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
    check(await menu(page) === 'Copy|Copy with unit|Insert', t + 'a value has Copy, Copy with unit and Insert', await menu(page));
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
    check(await menu(page) === 'Copy|Insert', t + 'a result of the statistics has Copy and Insert', await menu(page));
    await pick(page, 'Insert');
    check(await value(page) === 6, t + 'Insert puts the mean in', await shown(page));
    await page.click('.calc-fx-btn');
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
    check(await menu(page) === 'Copy|(Copy with unit)|Insert', t + 'π has no unit to copy', await menu(page));
    await page.key('Escape', 27);
    check(await menu(page) === '' && await open(page, '.calc-fx'), t + 'Esc closes the menu first, the panel stays');
    await page.key('Escape', 27);

    // the history
    await page.type('1+2\r3+4\r');
    await page.click('.calc-hist');
    await page.rightClick('.calc-past-res');
    check(await menu(page) === 'Copy|Insert|Delete', t + 'a line of the history has Copy, Insert and Delete', await menu(page));
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
    check(await menu(page) === 'Cut|Copy|Paste|Reset all', t + 'the display has Cut once something is entered', await menu(page));
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
    check(await above() !== '' && !await page.calc('!!document.querySelector("#box .calc-cursor")'), t + 'one click does not open it');
    await sleep(500);
    await press('.calc-log', 0, 2);
    check(await above() === '' && await page.calc('!!document.querySelector("#box .calc-cursor")') &&
        (await shown(page)).replace(/\s/g, '') === '123456789+123456789+123456789+123456789+123456789' && await selected() === '',
        t + 'a double click on it opens the equation in the display, with the cursor in it', await shown(page) + ' | ' + await selected());
    await page.type('\r1+2\r');
    await page.calc('document.getSelection().selectAllChildren(document.getElementById("box"))');
    await press('.calc-log', 0, 2);
    check(await above() === '' && await shown(page) === '1 + 2' && await selected() === '', t + 'with the result selected as well',
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

    // the website: its switches
    t = 'web/index.html: ';
    await page.fresh('/web/index.html', {}, [1300, 900]);
    check(await page.ev('document.getElementById("panel-stats").checked && document.getElementById("panel-fx").checked && ' +
        'document.getElementById("panel-conv").checked && document.getElementById("panel-graph").checked'), t + 'at first all four on');
    check(await page.until('!document.querySelector(".calc-conv-btn").hidden'),
        t + 'and their buttons in the calculator');
    await page.ev('document.getElementById("panel-fx").scrollIntoView({ block: "center" })');
    await page.click('#panel-stats');
    check(await page.until('document.querySelector(".calc-stat-btn").hidden'),
        t + 'its switch takes the statistics out of the calculator');
    await page.click('#panel-fx');
    check(await page.until('document.querySelector(".calc-fx-btn").hidden'),
        t + 'and f(x)');
    await page.click('#panel-stats');
    check(await page.until('!document.querySelector(".calc-stat-btn").hidden'),
        t + 'and puts the statistics back');
    await page.go(page.base + '/web/index.html', [1300, 900]);
    check(await page.ev('document.getElementById("panel-stats").checked && !document.getElementById("panel-fx").checked && ' +
        'document.getElementById("panel-conv").checked'), t + 'the switches are kept');

    // MODE in the calculator: the number format here follows it
    await page.click('.calc-left > :nth-child(7)');
    check(await page.until('document.getElementById("format-notation").value === "fix"'), t + 'MODE turns the format here to Fix',
        await page.ev('document.getElementById("format-notation").value'));
    check(await page.ev('document.getElementById("format-places").value') === 'auto' &&
        await page.ev('document.getElementById("format-icon").textContent') === '1500', t + 'and its icon, with Auto places',
        await page.ev('document.getElementById("format-icon").textContent'));

    // the separators of the thousands: none, commas or spaces
    async function separators(value) {
        await page.ev('(function () { var g = document.getElementById("format-group"); g.value = ' + JSON.stringify(value) +
            '; g.dispatchEvent(new Event("change")); })()');
        return JSON.stringify(await page.ev('JSON.parse(localStorage.getItem("format")).group')) + ' ' +
            await page.ev('document.getElementById("format-icon").textContent');
    }
    check(await page.ev('document.getElementById("format-group").value') === '', t + 'no separators at first');
    check(await separators('space') === '"space" 1\u2009500', t + 'separators: spaces, kept and in the icon', await separators('space'));
    check(await separators('comma') === 'true 1,500', t + 'commas, kept as before there was a choice', await separators('comma'));
    check(await separators('dot') === '"dot" 1.500', t + 'dots, with a decimal comma', await separators('dot'));
    check(await separators('spacecomma') === '"spacecomma" 1\u2009500', t + 'spaces, with a decimal comma', await separators('spacecomma'));
    check(await page.ev('[].map.call(document.getElementById("format-group").options, function (o) { return o.textContent; }).join("|")') ===
        'No separators: 1234.5|Comma: 1,234.5|Space: 1 234.5|Dot, decimal comma: 1.234,5|Space, decimal comma: 1 234,5',
        t + 'each choice shows a number written so, with its decimal mark');
    check(await separators('') === 'false 1500', t + 'and none', await separators(''));
    await page.ev('localStorage.setItem("format", JSON.stringify({ notation: "norm", places: "auto", group: true }))');
    await page.go(page.base + '/web/index.html', [1300, 900]);
    check(await page.ev('document.getElementById("format-group").value') === 'comma', t + 'separators turned on before the choice came are commas',
        await page.ev('document.getElementById("format-group").value'));
}

// the website: the calculator and its options on one page, the calculator drawn to fit its room
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
    check(await page.ev('document.getElementById("launch-detached").disabled && document.getElementById("page-icon").disabled'),
        t + 'Detached Mode cannot be launched, nor the button on the pages turned on');
    check(await page.ev('!document.getElementById("panel-fx").disabled && document.getElementById("panel-fx").checked && ' +
        '!document.querySelector("#panel-fx").closest(".option").querySelector(".managed-note")'), t + 'f(x) is as it was');
    await change({ solve: false, numbers: false });
    check(await page.until('document.getElementById("panel-solve").disabled') && await page.ev('document.getElementById("panel-numbers").disabled && ' +
        '!document.getElementById("panel-solve").checked && !document.getElementById("panel-graph").disabled'), t + 'the switches of the solver and the numbers are locked too');
    await change({});
    check(await page.until('!document.getElementById("panel-graph").disabled') && await page.ev('document.getElementById("panel-graph").checked') &&
        !await page.ev('document.querySelector(".managed-note")') && !await page.ev('document.getElementById("launch-detached").disabled'),
        t + 'turned on again, the switches are as they were kept');

    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
}

async function website(page) {
    var t = 'web/index.html: ', calc = 'document.getElementById("calculator")', k, at, box;

    // is this event left to the browser, there
    function left(type, selector) {
        return page.ev('(function (e) { document.querySelector(' + JSON.stringify(selector) + ').dispatchEvent(e); ' +
            'return !e.defaultPrevented; })(new ' + (type === 'copy' ? 'ClipboardEvent("copy", { clipboardData: new DataTransfer(), ' :
                'MouseEvent("contextmenu", { ') + 'bubbles: true, cancelable: true }))');
    }

    // where a box is on the screen, from the top left of another
    function from(selector, other) {
        return page.ev('(function (a, b) { a = a.getBoundingClientRect(); b = b.getBoundingClientRect(); ' +
            'return { left: a.left - b.left, top: a.top - b.top, mid: a.left + a.width / 2 - b.left - b.width / 2, ' +
            'above: b.top - a.bottom, below: a.top - b.bottom }; })' +
            '(document.querySelector(' + JSON.stringify(selector) + '), document.querySelector(' + JSON.stringify(other) + '))');
    }

    // on a big screen the calculator is drawn bigger: what goes by the pointer or by a key is still there
    await page.fresh('/web/index.html', {}, [1300, 900]);
    k = await page.ev('(function (c) { return c.getBoundingClientRect().width / c.offsetWidth; })(' + calc + ')');
    check(k > 1.3, t + 'on a big screen the calculator is drawn bigger', k);
    await page.type('12+34');
    check(await shown(page) === '12 + 34', t + 'the keyboard types on it', await shown(page));
    at = await page.at('#box');
    await page.rightClick('#box');
    box = await page.ev('(function (m) { m = m.getBoundingClientRect(); return [m.left, m.top]; })(document.querySelector(".calc-menu-box"))');
    check(Math.abs(box[0] - at[0]) < 2 && Math.abs(box[1] - at[1]) < 2, t + 'the menu opens at the pointer', box + ' | ' + at);
    await page.key('Escape', 27);
    await page.click('.calc-stat-btn');
    box = await from('.calc-stats.calc-open', '#display-box');
    check(Math.abs(box.left + k) < 1 && Math.abs(box.below - 7 * k) < 1, t + 'a panel is just below the display', JSON.stringify(box));
    await page.click('.calc-stat-btn');
    await page.hover('.calc-left > :nth-child(3)');
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500), t + 'resting on a key shows its tip');
    await sleep(300); // it has come up into its place
    box = await from('.calc-tip', '.calc-left > :nth-child(3)');
    check(Math.abs(box.mid) < 2 && Math.abs(box.above - 10 * k) < 2, t + 'the tip is above its key, in the middle of it', JSON.stringify(box));
    await page.hover('#box');

    // the options beside it are a page of their own: its boxes, its menu and its text
    await page.ev('document.getElementById("format-notation").focus()');
    await page.type('5');
    check(await shown(page) === '12 + 34', t + 'typing in a box of the options is not typing on the keys', await shown(page));
    await page.click('.calc-right > :first-child');
    check(await page.ev('document.activeElement === document.body') && await shown(page) === '12 + 347',
        t + 'a press on a key takes the keyboard back', await shown(page));
    await page.type('5');
    check(await shown(page) === '12 + 3475', t + 'and the keyboard types on the calculator again', await shown(page));
    check(await left('contextmenu', '.options-pane .logo') && !await left('contextmenu', '#box'),
        t + 'the options have the menu of the browser, the calculator its own');
    await page.key('Escape', 27);
    check(await left('copy', '.options-pane .logo') && !await left('copy', '#box'),
        t + 'text of the options is copied as the browser does, the calculator gives its own');
    await page.click('.calc-stat-btn');
    await page.click('#panel-fx');
    check(await open(page, '.calc-stats'), t + 'a click in the options leaves a panel of the calculator open');
    await page.click('#panel-fx');
    await page.click('.calc-stat-btn');

    // the ? hides the options there, and shows them again
    await page.click('.calc-help');
    check(await page.ev('document.documentElement.classList.contains("options-hidden") && !document.getElementById("options-pane").offsetWidth'),
        t + 'the ? hides the options');
    await page.click('.calc-help');
    check(await page.ev('!document.documentElement.classList.contains("options-hidden") && document.getElementById("options-pane").offsetWidth > 0'),
        t + 'and shows them again');

    // on a small screen the options open over the calculator, which is out of use meanwhile
    await page.fresh('/web/index.html', {}, [390, 800]);
    check(await page.ev('getComputedStyle(document.getElementById("options-pane")).visibility') === 'hidden', t + 'on a phone the options are out of view');
    box = await page.ev('(function (c) { c = c.getBoundingClientRect(); return [c.left, innerWidth - c.right]; })(' + calc + ')');
    check(box[0] > 1 && box[0] < 3 && Math.abs(box[0] - box[1]) < 0.5, t + 'and the calculator goes almost from side to side', box);
    await page.type('7');
    await page.click('.calc-help');
    check(await page.ev('document.body.classList.contains("options-open")'), t + 'the ? opens them over the calculator');
    await page.type('8');
    check(await shown(page) === '7', t + 'what is typed then is not for the keys', await shown(page));
    await page.key('Escape', 27);
    check(await page.ev('!document.body.classList.contains("options-open")'), t + 'Esc closes them');
    await page.type('9');
    check(await shown(page) === '79', t + 'and the keys work again', await shown(page));
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
        await calculator(page, '/web/index.html');
        await secondKeys(page, '/popup.html');
        await secondKeys(page, '/web/index.html');
        await degreesMinutes(page, '/popup.html');
        await degreesMinutes(page, '/web/index.html');
        await angleUnits(page, '/popup.html');
        await angleUnits(page, '/web/index.html');
        await modeKey(page, '/popup.html');
        await modeKey(page, '/web/index.html');
        await converter(page, '/popup.html');
        await converter(page, '/web/index.html');
        await solver(page, '/popup.html');
        await solver(page, '/web/index.html');
        await numbersPanel(page, '/popup.html');
        await numbersPanel(page, '/web/index.html');
        await graphPanel(page, '/popup.html');
        await graphPanel(page, '/web/index.html');
        await graphTable(page, '/popup.html');
        await graphTable(page, '/web/index.html');
        await graphHide(page, '/popup.html');
        await graphHide(page, '/web/index.html');
        await graphMany(page, '/popup.html');
        await graphMany(page, '/web/index.html');
        await graphSlide(page, '/popup.html');
        await graphSlide(page, '/web/index.html');
        await graphBig(page, '/popup.html');
        await graphBig(page, '/web/index.html');
        await menus(page, '/popup.html');
        await menus(page, '/web/index.html');
        await options(page);
        await adminPolicy(page);
        await website(page);
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
