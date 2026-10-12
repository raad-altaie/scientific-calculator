let popupWidth = 387;
let popupHeight = 613;

// the detached window leaves this much room around the popup's size: x at the
// left and right, y at the top and bottom. Both take room away: the popup has
// more around the calculator than the window, which keeps 2px on every side;
// popup.js keeps that room when the window is resized
const detachedMargin = { x: -2, y: -0.5 };

chrome.runtime.getPlatformInfo(function (info) {
    // Output might be 'win', 'mac', 'linux', etc.
    if (info.os === 'win') {
        popupWidth = 402;
        popupHeight = 625;
    } else if (info.os === 'cros') {
        popupWidth = 388;
        popupHeight = 621;
    }
});

// the detached window shows the popup page with this mark, so the page knows
// to follow the window size and the window can be found again
const detachedUrl = chrome.runtime.getURL("popup.html?detached");

function createPopupWindow() {
    chrome.system.display.getInfo((displayInfo) => {
        const displayWidth = displayInfo[0].workArea.width;
        const displayHeight = displayInfo[0].workArea.height;
        const width = popupWidth + 2 * detachedMargin.x;
        const height = popupHeight + 2 * detachedMargin.y;

        // Calculate the centered position
        const left = Math.round((displayWidth - width) / 2);
        const top = Math.round((displayHeight - height) / 2);

        // Create the centered popup window
        chrome.windows.create({
            type: "popup",
            url: detachedUrl,
            width: width,
            height: height,
            left: left,
            top: top,
            focused: true,
        });
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
const pageIconAccess = { permissions: ["scripting", "storage"], origins: pageIconSites };
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

// Puts the icon on the pages, if the option is on. The browser forgets the
// registered script when the extension is updated, so this also runs then
function showPageIcon() {
    chrome.permissions.contains(pageIconAccess, (granted) => {
        if (!granted) return;

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


// Listen for commands
chrome.commands.onCommand.addListener(function (command) {
    if (command === "open_popup") {
        chrome.action.openPopup()
            .catch(error => {
                console.log("Failed to open popup:", error);
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


    // Create "Open as Popup Window" menu item
    // removeAll first: the menu can already exist after a browser update
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "open-popup",
            title: "Detached Mode",
            contexts: ["action"] // This will make it appear when clicking the extension icon
        });
    });

    showPageIcon();
});


// Listen for clicks on the context menu items
chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "open-popup") {
        openCalculatorInDetachedMode();
    }
});


// Listen for the options page and for the icon on the pages
chrome.runtime.onMessage.addListener((message) => {
    if (message?.command === "open-detached") {
        openCalculatorInDetachedMode();
    } else if (message?.command === "open-calculator") {
        // the button on a page opens the detached window
        openCalculatorInDetachedMode();
    } else if (message?.command === "turn-off-page-icon") {
        removePageIcon();
    }
});


