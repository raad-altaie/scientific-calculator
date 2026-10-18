let popupWidth = 379;
let popupHeight = 600;

// The detached window is this much bigger than the sizes above: x at the left
// and right, y at the top and bottom. It opens with the calculator as big as
// the popup draws it, its own 580px, and 2px around it on every side, a pixel
// over so popup.js keeps it at that size, not scaled; popup.js keeps that room
// when the window is resized
const detachedMargin = { x: 2.5, y: 6.5 };

chrome.runtime.getPlatformInfo(function (info) {
    // Output might be 'win', 'mac', 'linux', etc.
    if (info.os === 'win') {
        popupWidth = 394;
        popupHeight = 612;
    } else if (info.os === 'cros') {
        popupWidth = 380;
        popupHeight = 608;
    }
});

// the detached window shows the popup page with this mark, so the page knows
// to follow the window size and the window can be found again
const detachedUrl = chrome.runtime.getURL("popup.html?detached");

// the graph's own window, opened by the big graph button: the same page, with only the graph
const graphUrl = chrome.runtime.getURL("popup.html?graph");

// the popup page in any window, to find them by
const popupPages = chrome.runtime.getURL("popup.html*");

// The place and the size of the detached window are kept here, for the next
// time it opens. A service worker has no localStorage, and chrome.storage.local
// is the page icon's
function detachedBoundsStore(mode, run, failed) {
    const open = indexedDB.open("detached", 1);

    open.onupgradeneeded = () => open.result.createObjectStore("window");
    open.onsuccess = () => run(open.result.transaction("window", mode).objectStore("window"));
    open.onerror = () => failed && failed();
}

// the calculator's under "bounds", the graph's window's under "graphBounds"
function readDetachedBounds(key, done) {
    detachedBoundsStore("readonly", (store) => {
        const read = store.get(key);

        read.onsuccess = () => done(read.result);
        read.onerror = () => done();
    }, done);
}

// The window is moved or resized: its new place is remembered. Firefox does not tell of
// that, so there the window tells it itself, in popup.js
function rememberBounds(win) {
    if (win.type !== "popup" || win.state !== "normal") return; // not maximised or full screen

    chrome.tabs.query({ windowId: win.id }, (tabs) => {
        const tab = tabs.find((t) => t.url && (t.url.startsWith(detachedUrl) || t.url.startsWith(graphUrl)));
        if (!tab) return;

        detachedBoundsStore("readwrite", (store) => {
            store.put({ left: win.left, top: win.top, width: win.width, height: win.height },
                tab.url.startsWith(graphUrl) ? "graphBounds" : "bounds");
        });
    });
}

if (chrome.windows.onBoundsChanged) chrome.windows.onBoundsChanged.addListener(rememberBounds);

// The screens and the room on them. Firefox has no chrome.system.display: there it is
// the screen the background page sees, the main one
function getDisplays(done) {
    if (chrome.system?.display) {
        chrome.system.display.getInfo(done);
        return;
    }
    done([{ workArea: { left: screen.availLeft || 0, top: screen.availTop || 0, width: screen.availWidth, height: screen.availHeight } }]);
}

// The detached window, or with graph the graph's own window, which at first is most of
// the screen
function createPopupWindow(graph) {
    getDisplays((displayInfo) => {
        readDetachedBounds(graph ? "graphBounds" : "bounds", (saved) => {
            const displayWidth = displayInfo[0].workArea.width;
            const displayHeight = displayInfo[0].workArea.height;
            const width = graph ? Math.round(Math.min(1200, displayWidth * 0.8)) : popupWidth + 2 * detachedMargin.x;
            const height = graph ? Math.round(Math.min(900, displayHeight * 0.85)) : popupHeight + 2 * detachedMargin.y;

            // Calculate the centered position
            let bounds = {
                width: width,
                height: height,
                left: Math.round((displayWidth - width) / 2),
                top: Math.round((displayHeight - height) / 2),
            };

            // It opens where it was left, at the size it was left, if a screen
            // still shows that place: its title bar and 100px of its width
            const inView = saved && displayInfo.some(({ workArea: area }) =>
                saved.top >= area.top && saved.top < area.top + area.height - 50 &&
                saved.left + saved.width > area.left + 100 && saved.left < area.left + area.width - 100);

            if (inView) bounds = saved;

            chrome.windows.create({
                type: "popup",
                url: graph ? graphUrl : detachedUrl,
                width: bounds.width,
                height: bounds.height,
                left: bounds.left,
                top: bounds.top,
                focused: true,
            }, (win) => {
                // kept to close it on an update, when its page no longer tells
                // what it is
                detachedBoundsStore("readwrite", (store) => store.put(win.id, graph ? "graphId" : "id"));
            });
        });
    });
}

// An update takes the page out of the detached window and leaves it blank,
// and its tab no longer gives its address: it is found by the kept id, and
// closed if it is still a popup with nothing else in it. The graph's window too
function closeDetachedWindow() {
    [["id", detachedUrl], ["graphId", graphUrl]].forEach(([key, url]) => {
        detachedBoundsStore("readonly", (store) => {
            const read = store.get(key);

            read.onsuccess = () => {
                if (read.result === undefined) return;

                chrome.windows.get(read.result, { populate: true })
                    .then((win) => {
                        if (win.type === "popup" && win.tabs.every((t) => !t.url || t.url.startsWith(url))) {
                            return chrome.windows.remove(win.id);
                        }
                    })
                    .catch(() => { }); // it was already closed
            };
        });
    });
}

// a window to the front, out of the dock or taskbar if it was minimised
function bringToFront(windowId) {
    chrome.windows.get(windowId, (win) => {
        chrome.windows.update(win.id, win.state === "minimized" ? { state: "normal", focused: true } : { focused: true });
    });
}

// The graph's own window: opened, or to the front if it is open. It reads the
// graph from the storage, as the calculator left it
function openGraphWindow() {
    chrome.tabs.query({ url: popupPages }, (tabs) => {
        const tab = tabs.find((t) => t.url.startsWith(graphUrl));

        if (tab) bringToFront(tab.windowId);
        else createPopupWindow(true);
    });
}

// A window to the front, once the system has put it there: a moment after it is
// asked, or half a second at most
function focusWindow(id) {
    return new Promise((done) => {
        const ready = (focused) => {
            if (focused !== id) return;
            clearTimeout(late);
            chrome.windows.onFocusChanged.removeListener(ready);
            done();
        };
        const late = setTimeout(() => {
            chrome.windows.onFocusChanged.removeListener(ready);
            done();
        }, 500);
        chrome.windows.onFocusChanged.addListener(ready);
        chrome.windows.update(id, { focused: true });
    });
}

// A value put in from the graph's window: the calculator comes up with it, the
// detached window if it is open, else the popup over the browser's window, which
// comes to the front first: the graph's window has the focus, and a popup is
// only shown over the window in front
function showCalculator() {
    chrome.tabs.query({ url: popupPages }, (tabs) => {
        const tab = tabs.find((t) => t.url.startsWith(detachedUrl));

        if (tab) {
            bringToFront(tab.windowId);
            return;
        }
        chrome.windows.getLastFocused({ windowTypes: ["normal"] })
            .then((win) => focusWindow(win.id).then(() => chrome.action.openPopup({ windowId: win.id })))
            .catch(() => unlessOff("detachedMode", openCalculatorInDetachedMode)); // no browser window, or no popup allowed now
    });
}


function openCalculatorInDetachedMode() {
    // The window can be resized, so it is found by its page, not by its size
    chrome.tabs.query({ url: detachedUrl.replace("?detached", "*") }, (tabs) => {
        const tab = tabs.find((t) => t.url.includes("?detached"));
        if (!tab) {
            createPopupWindow();
            return;
        }
        // it is already open: it comes to the front, out of the dock or
        // taskbar if it was minimised
        chrome.windows.get(tab.windowId, (win) => {
            chrome.windows.update(win.id, win.state === "minimized" ? { state: "normal", focused: true } : { focused: true });
        });
    });
}



// The button on every page and the icons after the maths of the pages are two options, each off
// until it is turned on on the options page. Both need access to the websites, which the browser asks
// the user for when the first is turned on, and not at install; it is given back once both are off.
// Which is on is kept by options.js: pageButtonOn, on unless false, as the button was on while
// the access alone said so, before the icons came; and pageMathsOn, off unless true
const pageSites = ["http://*/*", "https://*/*"];
const pageAccess = { permissions: ["scripting"], origins: pageSites };
const pageOptions = {
    pageButton: {
        script: { id: "page-icon", js: ["js/page/icon.js"], matches: pageSites },
        off: "remove-page-icon",
        on: (kept) => kept.pageButtonOn !== false,
    },
    pageMaths: {
        // formulas.js: the formulas and constants to find; units.js, the units of quantities; picks.js, what else the cards work out
        script: { id: "page-maths", js: ["js/formulas.js", "js/units.js", "js/page/picks.js", "js/page/answers.js"], matches: pageSites },
        off: "remove-page-maths",
        on: (kept) => kept.pageMathsOn === true,
    },
};

// pages that are already open get it without a reload
function addToOpenPages(files) {
    chrome.tabs.query({ discarded: false }, (tabs) => {
        tabs.forEach((tab) => {
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: files })
                .catch(() => { }); // The browser keeps extensions out of some pages
        });
    });
}

// the open pages take it out at once
function tellOpenPages(command) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, { command: command })
                .catch(() => { }); // a page without it
        });
    });
}

// Each of the two on the pages while it is on and an administrator did not turn it off, and the
// access given back with neither. The browser forgets the registered scripts when the extension is
// updated, so this also runs then. One run at a time, as the options page changes the choice and the
// access together
let pageRun = Promise.resolve();

function followPageOptions() {
    pageRun = pageRun.then(async () => {
        const menu = (visible) => {
            ["calc-selection", "calc-site"].forEach((item) => chrome.contextMenus.update(item, { visible: visible }, () => chrome.runtime.lastError));
            if (visible) followFrontTab();
        };
        if (!await chrome.permissions.contains(pageAccess)) return menu(false);
        const kept = await chrome.storage.local.get(["pageButtonOn", "pageMathsOn"]).catch(() => ({}));
        const registered = (await chrome.scripting.getRegisteredContentScripts().catch(() => [])).map((script) => script.id);
        let any = false;

        for (const [key, option] of Object.entries(pageOptions)) {
            const on = option.on(kept) && !await policyOff(key);
            const was = registered.includes(option.script.id);

            any = any || on;
            if (key === "pageMaths") menu(on); // Calculate "…" goes with the icons
            if (on && !was) {
                await chrome.scripting.registerContentScripts([option.script])
                    .then(() => addToOpenPages(option.script.js))
                    .catch((error) => console.log("Failed to put " + key + " on the pages:", error));
            } else if (on) {
                await chrome.scripting.updateContentScripts([option.script]).catch(() => { }); // its files, as this version has them
            } else if (was) {
                await chrome.scripting.unregisterContentScripts({ ids: [option.script.id] }).catch(() => { });
                tellOpenPages(option.off);
            }
        }
        if (!any) await chrome.permissions.remove(pageAccess);
    }).catch(() => { });
}

chrome.permissions.onAdded.addListener(followPageOptions);

// Instant answers on this site, a check in the menu of a right click on a page: unchecked, the icons
// go from that website, kept in pageMathsOff, which page/answers.js reads; the options page lists those
// websites to turn them on again. The browser does not tell when its menu opens, so the check follows
// the tab in front. Each website by its name without www., as in page/answers.js
function siteOf(url) {
    try {
        const page = new URL(url);
        return /^https?:$/.test(page.protocol) ? page.hostname.toLowerCase().replace(/^www\./, "") : "";
    } catch (e) {
        return ""; // no address: the access to the website was not given
    }
}

function followSite(tab) {
    const site = siteOf(tab?.url);
    if (!site) return;
    chrome.storage.local.get("pageMathsOff").catch(() => ({})).then(({ pageMathsOff }) => {
        const on = !(Array.isArray(pageMathsOff) && pageMathsOff.includes(site));
        chrome.contextMenus.update("calc-site", { checked: on }, () => chrome.runtime.lastError);
    });
}

function followFrontTab() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true })
        .then(([tab]) => followSite(tab))
        .catch(() => { });
}

function keepSite(site, on) {
    chrome.storage.local.get("pageMathsOff").catch(() => ({})).then(({ pageMathsOff }) => {
        const off = (Array.isArray(pageMathsOff) ? pageMathsOff : []).filter((name) => name !== site);
        if (!on) off.push(site);
        chrome.storage.local.set({ pageMathsOff: off.sort() });
    });
}

chrome.tabs.onActivated.addListener(followFrontTab);
chrome.windows.onFocusChanged.addListener(followFrontTab);
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (change.url && tab.active) followSite(tab);
});


// What the administrator of a school or a company turned off for everyone they manage,
// as managed_schema.json describes; the pages read it through policy.js. Each feature is
// on unless its policy is false. The button on every page and the icons after the maths of the pages
// open Detached Mode, so they go with it
function policyOff(key) {
    return chrome.storage.managed.get(null)
        .catch(() => ({})) // no policy can be read: nothing is turned off
        .then((policy) => policy[key] === false || ((key === "pageButton" || key === "pageMaths") && policy.detachedMode === false));
}

// The menu of the toolbar icon has Detached Mode while it is allowed, and the button and the icons
// on the pages go when they are not. The open windows close themselves, in popup.js
async function followPolicy() {
    chrome.contextMenus.update("open-popup", { visible: !await policyOff("detachedMode") }, () => chrome.runtime.lastError);
    followPageOptions();
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "managed") {
        followPolicy();
        followOpenMode();
    } else if (area === "local" && changes.openMode) {
        followOpenMode();
    } else if (area === "local" && (changes.pageButtonOn || changes.pageMathsOn)) {
        followPageOptions(); // chosen on the options page
    } else if (area === "local" && changes.pageMathsOff) {
        followFrontTab(); // a website turned on again on the options page
    }
});

// a policy changed while the browser was closed
chrome.runtime.onStartup.addListener(followPolicy);


// What the toolbar icon and its shortcut open, an option: "fixed", the popup under the
// icon, or "detached", the window of its own. Fixed unless Detached is chosen, and while
// an administrator allows Detached Mode
function opensDetached() {
    return chrome.storage.local.get("openMode")
        .catch(() => ({}))
        .then(async ({ openMode }) => openMode === "detached" && !await policyOff("detachedMode"));
}

// Without a popup the browser tells of a click on the icon, which then opens the window
async function followOpenMode() {
    chrome.action.setPopup({ popup: await opensDetached() ? "" : "popup.html" });
}

// Launch on the options page opens the mode chosen. The popup is given back to the icon
// first, in case the choice of Fixed has only just been made
function launchOpenMode() {
    opensDetached().then((detached) => {
        if (detached) {
            openCalculatorInDetachedMode();
            return;
        }
        chrome.action.setPopup({ popup: "popup.html" })
            .then(() => chrome.action.openPopup())
            .catch(error => {
                console.log("Failed to open popup:", error);
            });
    });
}

chrome.action.onClicked.addListener(() => unlessOff("detachedMode", openCalculatorInDetachedMode));

// the popup the browser gives the icon from the manifest, at each start
chrome.runtime.onStartup.addListener(followOpenMode);
// and each time the worker starts, as after the extension is turned off and on, which fires neither
followOpenMode();


// Listen for commands
chrome.commands.onCommand.addListener(function (command) {
    if (command === "open_popup") {
        opensDetached().then((detached) => {
            if (detached) {
                openCalculatorInDetachedMode();
                return;
            }
            chrome.action.openPopup()
                .catch(error => {
                    console.log("Failed to open popup:", error);
                });
        });
    }
});


// Listen for the extension being installed
chrome.runtime.onInstalled.addListener((details) => {
    // check if it's new install
    if (details.reason == "install") {
        // Open the options page when the extension is installed
        chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    }


    // The detached window left open by the old version is blank: it is closed
    if (details.reason == "update") {
        closeDetachedWindow();
    }

    // Create "Open as Popup Window" menu item
    // removeAll first: the menu can already exist after a browser update
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "open-popup",
            title: "Detached Mode",
            contexts: ["action"] // This will make it appear when clicking the extension icon
        }, followPolicy);
        // text selected on a page, into the calculator: shown while the instant answers are on
        chrome.contextMenus.create({
            id: "calc-selection",
            title: "Calculate \u201c%s\u201d",
            contexts: ["selection"],
            documentUrlPatterns: pageSites,
            visible: false
        }, followPageOptions);
        chrome.contextMenus.create({
            id: "calc-site",
            title: "Instant answers on this site",
            type: "checkbox",
            checked: true,
            contexts: ["page"],
            documentUrlPatterns: pageSites,
            visible: false
        }, followPageOptions);
    });

    followPageOptions();
    followOpenMode();
});


// Listen for clicks on the context menu items
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-popup") {
        unlessOff("detachedMode", openCalculatorInDetachedMode);
    } else if (info.menuItemId === "calc-selection" && info.selectionText) {
        // the page reads what it is, as its icons do; a frame without page/answers.js has it put in as it is
        const asItIs = () => openPageMaths({ text: info.selectionText, kind: "sum" });
        if (!tab) return asItIs();
        chrome.tabs.sendMessage(tab.id, { command: "page-maths-selection", text: info.selectionText }, { frameId: info.frameId || 0 })
            .then((read) => read || asItIs())
            .catch(asItIs);
    } else if (info.menuItemId === "calc-site") {
        const site = siteOf(info.pageUrl || tab?.url);
        if (site) keepSite(site, info.checked);
    }
});


// Listen for the options page and for the icon on the pages. A window an administrator
// turned off does not open
function unlessOff(key, open) {
    policyOff(key).then((off) => off || open());
}

// The engine of the calculator, and with maths its solver, put into a page that has maths on it, for
// page/answers.js to work it out: only then, as they are large. It answers once they are in
function addEngineToPage(tab, frameId, maths, done) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frameId] },
        files: maths ? ["js/engine.js", "js/maths.js"] : ["js/engine.js"],
    })
        .then(() => done(true))
        .catch(() => done(false));
}

// The icon after a sum or an equation of a page was clicked: it is kept for the calculator, which
// takes it as it opens, or at once if it is open (popup.js). Detached Mode opens, as from the button
function openPageMaths(message) {
    const kinds = ["sum", "equation", "inequality", "subnet", "integral", "series", "product", "limit", "formula", "constant", "graph", "matrix",
        "derivative", "taylor", "ode", "card"];
    // the boxes of a card: f, a and b of the solver's, a function to draw, a matrix's size and numbers, a11 to
    // a1010; or the name of a formula or a constant; frac: a sum written in fractions, shown in them. Of a card
    // of picks.js, its panel and card and their boxes, and of the statistics a list of numbers, which is long
    const boxes = /^(f|a|b|name|size|a\d{2,4}|frac|panel|card|x|n|x0|y0|e|e1|e2|z|u|t|enc|bits|ts|convert|d|y|m|days|loan|rate|years|py|apr|[abcd][1-3]|g|v|to|list)$/;
    const fields = {};

    if (typeof message.text !== "string" || !kinds.includes(message.kind)) return;
    Object.keys(message.fields || {}).slice(0, 110).forEach((key) => {
        if (boxes.test(key) && typeof message.fields[key] === "string") fields[key] = message.fields[key].slice(0, key === "list" ? 100000 : 200);
    });
    chrome.storage.local.set({ pageMaths: { text: message.text.slice(0, 500), kind: message.kind, fields: fields, at: Date.now() } })
        .then(() => unlessOff("detachedMode", openCalculatorInDetachedMode));
}

chrome.runtime.onMessage.addListener((message, sender, answer) => {
    if (message?.command === "page-maths-engine" && sender.tab) {
        addEngineToPage(sender.tab, sender.frameId, !!message.maths, answer);
        return true; // it answers later
    } else if (message?.command === "open-page-maths") {
        openPageMaths(message);
    } else if (message?.command === "open-detached") {
        unlessOff("detachedMode", openCalculatorInDetachedMode);
    } else if (message?.command === "launch") {
        launchOpenMode();
    } else if (message?.command === "open-graph") {
        unlessOff("graph", openGraphWindow);
    } else if (message?.command === "show-calculator") {
        showCalculator();
    } else if (message?.command === "open-calculator") {
        // the button on a page opens the detached window
        unlessOff("detachedMode", openCalculatorInDetachedMode);
    } else if (message?.command === "window-moved" && sender.tab) {
        // Firefox: the detached or the graph's window was moved or resized
        chrome.windows.get(sender.tab.windowId, rememberBounds);
    }
});


