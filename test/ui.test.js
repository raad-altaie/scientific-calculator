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
                return res.end('<!DOCTYPE html><iframe id="calc-iframe" src="popup.html" width="388" height="585"></iframe>');
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

Page.prototype.click = async function (selector) {
    var p = await this.at(selector), self = this;
    check(!!p, 'there is ' + selector + ' to click');
    if (!p) return;
    for (var type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
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

    // the ? beside the name has a tip of the calculator's own, below it, in place of a title
    await page.hover('.calc-help');
    check(await page.until('!document.querySelector(".calc-tip").hidden', 2500), t + 'resting on the ? shows its tip');
    note = await page.calc('document.querySelector(".calc-tip").textContent');
    check(/^Help and options/.test(note), t + 'the tip says it is the help and the options', note);
    check(await page.calc('document.querySelector(".calc-tip").classList.contains("calc-tip-below") && ' +
        '!document.querySelector(".calc-help").title'), t + 'it is below the ?, which has no title');
    await page.hover('#box');
    check(await page.until('document.querySelector(".calc-tip").hidden', 2500), t + 'the tip goes as the pointer leaves the ?');

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
    await page.rightClick('.calc-past:not(.calc-stats):not(.calc-fx):not(.calc-conv) .calc-past-head span');
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
        await menus(page, '/popup.html');
        await menus(page, '/web/index.html');
        await options(page);
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
