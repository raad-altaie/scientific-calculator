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



// The icon on every page is an option, off until it is turned on on the options
// page. The option is on while the extension holds this access, which the browser
// asks the user for at that moment and not at install
const pageIconSites = ["http://*/*", "https://*/*"];
const pageIconAccess = { permissions: ["scripting"], origins: pageIconSites };
const pageIconScript = { id: "page-icon", js: ["js/page-icon.js"], matches: pageIconSites };

// pages that are already open get the icon without a reload
function addPageIconToOpenPages() {
    chrome.tabs.query({ discarded: false }, (tabs) => {
        tabs.forEach((tab) => {
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: pageIconScript.js })
                .catch(() => { }); // The browser keeps extensions out of some pages
        });
    });
}

// Puts the icon on the pages, if the option is on and an administrator did not turn
// it off. The browser forgets the registered script when the extension is updated, so
// this also runs then
function showPageIcon() {
    chrome.permissions.contains(pageIconAccess, async (granted) => {
        if (!granted) return;
        if (await policyOff("pageButton")) {
            removePageIcon();
            return;
        }

        chrome.scripting.getRegisteredContentScripts({ ids: [pageIconScript.id] })
            .then((scripts) => scripts.length || chrome.scripting.registerContentScripts([pageIconScript]))
            .then(addPageIconToOpenPages)
            .catch((error) => {
                console.log("Failed to show the page icon:", error);
            });
    });
}

// Takes the icon off the pages and gives the access back to the browser
function removePageIcon() {
    chrome.permissions.contains(pageIconAccess, (granted) => {
        if (!granted) return;

        chrome.scripting.unregisterContentScripts({ ids: [pageIconScript.id] })
            .catch(() => { }) // it was not registered
            .then(() => {
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        chrome.tabs.sendMessage(tab.id, { command: "remove-page-icon" })
                            .catch(() => { }); // a page without the icon
                    });
                });
                chrome.permissions.remove(pageIconAccess);
            });
    });
}

chrome.permissions.onAdded.addListener(showPageIcon);


// What the administrator of a school or a company turned off for everyone they manage,
// as managed_schema.json describes; the pages read it through policy.js. Each feature is
// on unless its policy is false. The button on every page opens Detached Mode, so it goes with it
function policyOff(key) {
    return chrome.storage.managed.get(null)
        .catch(() => ({})) // no policy can be read: nothing is turned off
        .then((policy) => policy[key] === false || (key === "pageButton" && policy.detachedMode === false));
}

// The menu of the toolbar icon has Detached Mode while it is allowed, and the button on
// the pages goes when it is not. The open windows close themselves, in popup.js
async function followPolicy() {
    chrome.contextMenus.update("open-popup", { visible: !await policyOff("detachedMode") }, () => chrome.runtime.lastError);
    if (await policyOff("pageButton")) removePageIcon();
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "managed") {
        followPolicy();
        followOpenMode();
    } else if (area === "local" && changes.openMode) {
        followOpenMode();
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
    });

    showPageIcon();
    followOpenMode();
});


// Listen for clicks on the context menu items
chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "open-popup") {
        unlessOff("detachedMode", openCalculatorInDetachedMode);
    }
});


// Listen for the options page and for the icon on the pages. A window an administrator
// turned off does not open
function unlessOff(key, open) {
    policyOff(key).then((off) => off || open());
}

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message?.command === "open-detached") {
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
    } else if (message?.command === "turn-off-page-icon") {
        removePageIcon();
    } else if (message?.command === "window-moved" && sender.tab) {
        // Firefox: the detached or the graph's window was moved or resized
        chrome.windows.get(sender.tab.windowId, rememberBounds);
    }
});


