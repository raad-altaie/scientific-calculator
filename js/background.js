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

// the periodic table's own window, opened by its pop out button: the same page, with only the table
const chemUrl = chrome.runtime.getURL("popup.html?chem");

// its least size: an iPad mini's width, and the room of the table's rows high, as in popup.js
const chemMin = { width: 744, height: 700 };

// each other panel's own window, opened by its pop out button: the same page, popup.html?panel=solve, with only
// that panel; by the policy that turns the panel off
const panelPolicies = { stats: "statistics", fx: "formulas", conv: "converter", solve: "solve", numbers: "numbers" };
const panelUrl = (key) => chrome.runtime.getURL("popup.html?panel=" + key);

// their least size: an iPad mini's width, as in popup.js
const panelMin = { width: 744, height: 640 };

// a tool's own window on its Calculator tab, gone to from the bar above the tool or as a value is put in
const homeUrl = chrome.runtime.getURL("popup.html?calc");

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
// that, so there the window tells it itself, in popup.js. The graph's only of the window opened for it (graphId):
// another tool's window gone to the graph keeps its own size, not the graph's
function rememberBounds(win) {
    if (win.type !== "popup" || win.state !== "normal") return; // not maximised or full screen

    chrome.tabs.query({ windowId: win.id }, (tabs) => {
        const tab = tabs.find((t) => t.url && (t.url.startsWith(detachedUrl) || t.url.startsWith(graphUrl)));
        if (!tab) return;

        detachedBoundsStore("readwrite", (store) => {
            const bounds = { left: win.left, top: win.top, width: win.width, height: win.height };

            if (!tab.url.startsWith(graphUrl)) {
                store.put(bounds, "bounds");
                return;
            }
            const read = store.get("graphId");

            read.onsuccess = () => read.result === win.id && store.put(bounds, "graphBounds");
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

// A tool's own window, kept by its id to close it on an update, when its page no longer tells what it is. Every
// one, as each may go to another tool since (goWindow): the last twenty
function keepToolWindow(id) {
    detachedBoundsStore("readwrite", (store) => {
        const read = store.get("toolIds");

        read.onsuccess = () => store.put((read.result || []).filter((other) => other !== id).concat(id).slice(-20), "toolIds");
    });
}

// The detached window, or with graph the graph's own window, which at first is most of
// the screen. Then done, told whether it opened
function createPopupWindow(graph, done) {
    getDisplays((displayInfo) => {
        readDetachedBounds(graph ? "graphBounds" : "bounds", (saved) => {
            const area = displayInfo[0].workArea;
            const displayWidth = area.width;
            const displayHeight = area.height;
            const width = graph ? Math.round(Math.min(1200, displayWidth * 0.8)) : popupWidth + 2 * detachedMargin.x;
            const height = graph ? Math.round(Math.min(900, displayHeight * 0.85)) : popupHeight + 2 * detachedMargin.y;

            // Calculate the centered position
            let bounds = {
                width: width,
                height: height,
                left: Math.round(area.left + (displayWidth - width) / 2),
                top: Math.round(area.top + (displayHeight - height) / 2),
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
                if (chrome.runtime.lastError || !win) return done && done(false);
                // kept to close it on an update, when its page no longer tells
                // what it is, and the graph's for its size
                detachedBoundsStore("readwrite", (store) => store.put(win.id, graph ? "graphId" : "id"));
                if (graph) keepToolWindow(win.id);
                if (done) done(true);
            });
        });
    });
}

// An update takes the page out of the detached window and leaves it blank,
// and its tab no longer gives its address: it is found by the kept id, and
// closed if it is still a popup with nothing else in it. The graph's window too,
// and each tool's, which may have gone to another tool or its Calculator tab since
function closeDetachedWindow() {
    const toolPage = chrome.runtime.getURL("popup.html?");
    const close = (id, url) => {
        chrome.windows.get(id, { populate: true })
            .then((win) => {
                if (win.type === "popup" && win.tabs.every((t) => !t.url || t.url.startsWith(url))) {
                    return chrome.windows.remove(win.id);
                }
            })
            .catch(() => { }); // it was already closed
    };
    // a key for each kind of window, as the detached one is kept and the tools' were before toolIds
    const kept = [["id", detachedUrl], ["graphId", toolPage], ["chemId", toolPage], ["homeId", toolPage]].concat(Object.keys(panelPolicies).map((key) => ["panel-" + key, toolPage]));

    detachedBoundsStore("readonly", (store) => {
        kept.forEach(([key, url]) => {
            const read = store.get(key);

            read.onsuccess = () => read.result !== undefined && close(read.result, url);
        });
        const tools = store.get("toolIds");

        tools.onsuccess = () => (tools.result || []).forEach((id) => close(id, toolPage));
    });
}

// a window to the front, out of the dock or taskbar if it was minimised
function bringToFront(windowId) {
    chrome.windows.get(windowId, (win) => {
        chrome.windows.update(win.id, win.state === "minimized" ? { state: "normal", focused: true } : { focused: true });
    });
}

// The graph's own window: opened, or to the front if it is open. It reads the
// graph from the storage, as the calculator left it. Then done, told whether it is there
function openGraphWindow(done) {
    chrome.tabs.query({ url: popupPages }, (tabs) => {
        const tab = tabs.find((t) => t.url.startsWith(graphUrl));

        if (!tab) return createPopupWindow(true, done);
        bringToFront(tab.windowId);
        done(true);
    });
}

// The screen a window is on, the one with its middle; the first if it is on none, or there is no window
function displayOf(displayInfo, win) {
    const x = win ? win.left + win.width / 2 : NaN;
    const y = win ? win.top + win.height / 2 : NaN;

    return displayInfo.find(({ workArea: a }) => x >= a.left && x < a.left + a.width && y >= a.top && y < a.top + a.height) || displayInfo[0];
}

// The periodic table's own window, and each other panel's (url), opened from a window of the calculator (fromId),
// or from the popup, which is over the browser's window last used. On that window's screen: 85% of it, in its
// middle, no smaller than it needs (min) nor bigger than the screen. Open already, it is put so again and comes to
// the front. Then done, told whether it is there: what it was opened from is left (leave) only once it is, so a
// window that cannot be made leaves the calculator where it was
function openChemWindow(fromId, done) {
    openBigWindow(chemUrl, chemMin, fromId, done);
}

function openPanelWindow(key, fromId, done) {
    openBigWindow(panelUrl(key), panelMin, fromId, done);
}

function openBigWindow(url, min, fromId, done = () => { }) {
    const from = fromId !== undefined ? chrome.windows.get(fromId) : chrome.windows.getLastFocused({ windowTypes: ["normal"] });

    from.catch(() => null).then((win) => getDisplays((displayInfo) => {
        const area = displayOf(displayInfo, win).workArea;
        const width = Math.min(area.width, Math.max(min.width, Math.round(area.width * 0.85)));
        const height = Math.min(area.height, Math.max(min.height, Math.round(area.height * 0.85)));
        const bounds = {
            width: width,
            height: height,
            left: Math.round(area.left + (area.width - width) / 2),
            top: Math.round(area.top + (area.height - height) / 2),
        };

        chrome.tabs.query({ url: popupPages }, (tabs) => {
            const tab = tabs.find((t) => t.url.startsWith(url));

            if (tab) {
                chrome.windows.update(tab.windowId, Object.assign({ state: "normal" }, bounds))
                    .then(() => chrome.windows.update(tab.windowId, { focused: true }))
                    .then(() => done(true), () => done(false));
                return;
            }
            chrome.windows.create(Object.assign({ type: "popup", url: url, focused: true }, bounds), (win) => {
                if (chrome.runtime.lastError || !win) return done(false);
                keepToolWindow(win.id);
                done(true);
            });
        });
    }));
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
    return chrome.tabs.query({ url: popupPages }).then((tabs) => {
        const tab = tabs.find((t) => t.url.startsWith(detachedUrl));

        if (tab) {
            bringToFront(tab.windowId);
            return;
        }
        return chrome.windows.getLastFocused({ windowTypes: ["normal"] })
            .then((win) => focusWindow(win.id).then(() => chrome.action.openPopup({ windowId: win.id })))
            .catch(() => unlessOff("detachedMode", openCalculatorInDetachedMode)); // no browser window, or no popup allowed now
    });
}

// A tool popped out into a window of its own: the calculator it came from is left, only that window open till pop in
// brings the calculator back (popInTo). The detached window closes here; the popup closes itself, in popup.js
function leave(sender) {
    const detached = !!sender.url?.startsWith(detachedUrl) && sender.tab;

    chrome.storage.local.set({ popOutFrom: detached ? "detached" : "popup" }).catch(() => { });
    if (detached) chrome.windows.remove(sender.tab.windowId).catch(() => { });
}

// Pop in: the calculator popped out from comes back, the detached window if it was that, else the popup.
// With the Advanced open mode, which opens the calculator popped out, it always comes back in the detached window
function popInTo() {
    return chrome.storage.local.get(["popOutFrom", "openMode"])
        .catch(() => ({}))
        .then(async ({ popOutFrom, openMode }) => {
            if ((popOutFrom === "detached" || openMode === "advanced") && !await policyOff("detachedMode")) openCalculatorInDetachedMode();
            else return showCalculator();
        });
}

// A tool's own window going to another tool, or to its Calculator tab, from the bar above its head or as a value is
// put in: this window shows it, or the window that shows it already comes to the front and this one closes. The
// Calculator tab goes with Detached Mode, as the open mode Advanced does: turned off, the calculator comes up as
// the popup instead, with the value put in, which it reads from the storage as well
function goWindow(from, to) {
    const url = to === "calc" ? homeUrl : to === "graph" ? graphUrl : to === "chem" ? chemUrl : Object.hasOwn(panelPolicies, to) ? panelUrl(to) : "";
    const go = () => chrome.tabs.query({ url: popupPages }, (tabs) => {
        const open = tabs.find((t) => t.id !== from.id && t.url.startsWith(url));

        if (open) {
            bringToFront(open.windowId);
            chrome.windows.remove(from.windowId).catch(() => { });
        } else {
            chrome.tabs.update(from.id, { url: url });
        }
    });

    if (!url) return;
    if (to === "calc") policyOff("detachedMode").then((off) => off ? showCalculator() : go());
    else unlessOff(to === "graph" ? "graph" : to === "chem" ? "chemistry" : panelPolicies[to], go);
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
        script: { id: "page-maths", js: [], matches: pageSites },
        files: pageMathsFiles,
        off: "remove-page-maths",
        on: (kept) => kept.pageMathsOn === true,
    },
};

// The features of the instant answers, each of a panel of the calculator, by the name of its policy: a file of
// its own, page/*.js, with the data it reads before it, formulas.js the formulas and constants, units.js the
// units of quantities. In this order, as page/reader.js reads them: the lists, quantities and dates selected
// before the numbers, 1700000000 a Unix time before a whole number
const pageFeatures = {
    statistics: ["js/page/statistics.js"],
    converter: ["js/units.js", "js/page/converter.js"],
    numbers: ["js/page/numbers.js"],
    solve: ["js/page/solve.js"],
    graph: ["js/page/graph.js"],
    formulas: ["js/formulas.js", "js/page/formulas.js"],
    chemistry: ["js/page/chemistry.js"],
};

// What the pages get of the instant answers: page/reader.js, which reads the sums, then each feature that is
// on, as options.js keeps them in pageMathsFeatures, each on unless false, and an administrator did not turn its
// panel off, then page/answers.js, which puts the icons in the page
async function pageMathsFiles(kept) {
    const chosen = kept.pageMathsFeatures || {};
    const files = ["js/page/reader.js"];

    for (const [name, list] of Object.entries(pageFeatures)) {
        if (chosen[name] !== false && !await policyOff(name)) files.push(...list);
    }
    return files.concat("js/page/answers.js");
}

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
// updated, so this also runs then. The features of the instant answers chosen again, the open pages
// get them at once, the copy they had giving way to it. One run at a time, as the options page changes
// the choice and the access together
let pageRun = Promise.resolve();

function followPageOptions() {
    pageRun = pageRun.then(async () => {
        const menu = (visible) => {
            ["calc-selection", "calc-site"].forEach((item) => chrome.contextMenus.update(item, { visible: visible }, () => chrome.runtime.lastError));
            if (visible) followFrontTab();
        };
        if (!await chrome.permissions.contains(pageAccess)) return menu(false);
        const kept = await chrome.storage.local.get(["pageButtonOn", "pageMathsOn", "pageMathsFeatures"]).catch(() => ({}));
        const registered = await chrome.scripting.getRegisteredContentScripts().catch(() => []);
        let any = false;

        for (const [key, option] of Object.entries(pageOptions)) {
            const on = option.on(kept) && !await policyOff(key);
            const script = option.files ? { ...option.script, js: await option.files(kept) } : option.script;
            const was = registered.find((other) => other.id === script.id);

            any = any || on;
            if (key === "pageMaths") menu(on); // Calculate "…" goes with the icons
            if (on && !was) {
                await chrome.scripting.registerContentScripts([script])
                    .then(() => addToOpenPages(script.js))
                    .catch((error) => console.log("Failed to put " + key + " on the pages:", error));
            } else if (on) {
                await chrome.scripting.updateContentScripts([script]).catch(() => { }); // its files, as this version has them
                if (String(was.js) !== String(script.js)) addToOpenPages(script.js);
            } else if (was) {
                await chrome.scripting.unregisterContentScripts({ ids: [script.id] }).catch(() => { });
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
    } else if (area === "local" && (changes.pageButtonOn || changes.pageMathsOn || changes.pageMathsFeatures)) {
        followPageOptions(); // chosen on the options page
    } else if (area === "local" && changes.pageMathsOff) {
        followFrontTab(); // a website turned on again on the options page
    }
});

// a policy changed while the browser was closed
chrome.runtime.onStartup.addListener(followPolicy);


// What the toolbar icon and its shortcut open, an option: "fixed", the popup under the
// icon, "detached", the window of its own, or "advanced", the calculator popped out, in the
// big window with the rail of the tools, whose pop in goes to the window of its own (popInTo).
// Fixed unless another is chosen, and while an administrator allows Detached Mode
function openModeOf() {
    return chrome.storage.local.get("openMode")
        .catch(() => ({}))
        .then(async ({ openMode }) => (openMode === "detached" || openMode === "advanced") && !await policyOff("detachedMode") ? openMode : "fixed");
}

// Without a popup the browser tells of a click on the icon, which then opens the window
async function followOpenMode() {
    chrome.action.setPopup({ popup: await openModeOf() === "fixed" ? "popup.html" : "" });
}

// The calculator popped out, the big window on its Calculator tab, as the button beside the ? opens it
function openHomeWindow() {
    openBigWindow(homeUrl, panelMin);
}

// the window of the mode chosen: the big one with Advanced, else the detached one
function openModeWindow(mode) {
    if (mode === "advanced") openHomeWindow();
    else unlessOff("detachedMode", openCalculatorInDetachedMode);
}

// Launch on the options page opens the mode chosen. The popup is given back to the icon
// first, in case the choice of Fixed has only just been made. It opens over the browser's window last used: the
// options over a tool's own window (popup.js) are in a window with no icon, which comes to the front first
function launchOpenMode() {
    openModeOf().then((mode) => {
        if (mode !== "fixed") {
            openModeWindow(mode);
            return;
        }
        chrome.action.setPopup({ popup: "popup.html" })
            .then(() => chrome.windows.getLastFocused({ windowTypes: ["normal"] }))
            .then((win) => (win.focused ? Promise.resolve() : focusWindow(win.id)).then(() => chrome.action.openPopup({ windowId: win.id })))
            .catch(error => {
                console.log("Failed to open popup:", error);
            });
    });
}

chrome.action.onClicked.addListener(() => openModeOf().then(openModeWindow));

// the popup the browser gives the icon from the manifest, at each start
chrome.runtime.onStartup.addListener(followOpenMode);
// and each time the worker starts, as after the extension is turned off and on, which fires neither
followOpenMode();


// Listen for commands
chrome.commands.onCommand.addListener(function (command) {
    if (command === "open_popup") {
        openModeOf().then((mode) => {
            if (mode !== "fixed") {
                openModeWindow(mode);
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

// A tool popped out from the popup or the detached window (popup.js), unless its policy (key) turned it off: its
// window opened, then, once it is there, what it came from left; the popup answered whether it is, to close itself
function popOut(key, sender, answer, open) {
    policyOff(key).then((off) => {
        if (off) return answer(false);
        open((opened) => {
            if (opened) leave(sender);
            answer(opened);
        });
    });
}

// The engine of the calculator, and with maths its solver, put into a page that has maths on it, for
// page/answers.js to work it out: only then, as they are large. With "chem", chem.js, for the chemistry
// of a page, unless an administrator turned the chemistry off. It answers once they are in
function addEngineToPage(tab, frameId, maths, done) {
    (maths === "chem" ? policyOff("chemistry") : Promise.resolve(false)).then((off) => off ? Promise.reject() : chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frameId] },
        files: maths === "chem" ? ["js/chem.js"] : maths ? ["js/engine.js", "js/maths.js"] : ["js/engine.js"],
    }))
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
    // of a panel, its panel and card and their boxes, and of the statistics a list of numbers, which is long. Of the
    // chemistry, page/chemistry.js: a formula or a name f, a reaction eq, a composition c and an element's symbol s
    const boxes = /^(f|a|b|name|size|a\d{2,4}|frac|panel|card|x|n|x0|y0|e|e1|e2|z|u|t|enc|bits|ts|convert|d|y|m|days|loan|rate|years|py|apr|[abcd][1-3]|g|v|to|list|eq|c|s)$/;
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
        addEngineToPage(sender.tab, sender.frameId, message.chem ? "chem" : !!message.maths, answer);
        return true; // it answers later
    } else if (message?.command === "open-page-maths") {
        openPageMaths(message);
    } else if (message?.command === "open-detached") {
        unlessOff("detachedMode", openCalculatorInDetachedMode);
    } else if (message?.command === "launch") {
        launchOpenMode();
    } else if (message?.command === "open-graph") {
        popOut("graph", sender, answer, (done) => openGraphWindow(done));
        return true; // it answers later
    } else if (message?.command === "open-chem") {
        popOut("chemistry", sender, answer, (done) => openChemWindow(sender.tab?.windowId, done));
        return true;
    } else if (message?.command === "open-panel" && Object.hasOwn(panelPolicies, message.panel)) {
        popOut(panelPolicies[message.panel], sender, answer, (done) => openPanelWindow(message.panel, sender.tab?.windowId, done));
        return true;
    } else if (message?.command === "open-home") {
        // the button beside the ? of the popup or the detached window: the big window, on its Calculator tab, while
        // Detached Mode is allowed, as the open mode Advanced is
        popOut("detachedMode", sender, answer, (done) => openBigWindow(homeUrl, panelMin, sender.tab?.windowId, done));
        return true;
    } else if (message?.command === "show-calculator") {
        showCalculator();
    } else if (message?.command === "pop-in" && sender.tab) {
        // a panel's own window, the graph's or the table's popped in: the calculator comes up with it open, then that window closes
        popInTo().then(() => chrome.windows.remove(sender.tab.windowId)).catch(() => { });
    } else if (message?.command === "go-window" && sender.tab) {
        goWindow(sender.tab, message.to);
    } else if (message?.command === "page-window" && sender.tab) {
        // the kind of window a page is in, for its button (page/icon.js): normal, or a popup
        chrome.windows.get(sender.tab.windowId).then((win) => answer(win.type), () => answer());
        return true; // it answers later
    } else if (message?.command === "open-calculator") {
        // the button on a page opens the detached window
        unlessOff("detachedMode", openCalculatorInDetachedMode);
    } else if (message?.command === "window-moved" && sender.tab) {
        // Firefox: the detached or the graph's window was moved or resized
        chrome.windows.get(sender.tab.windowId, rememberBounds);
    }
});


