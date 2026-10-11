const iframe = document.getElementById('calc-iframe');

// detached mode: the calculator grows and shrinks with its window, within limits
if (new URLSearchParams(location.search).has('detached')) {
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 3;
    const MARGIN = { x: 1, y: 2 }; // room around the calculator at the normal size, as in background.js
    // the calculator with its margin: this is what the window is filled with
    const baseWidth = iframe.offsetWidth + 2 * MARGIN.x;
    const baseHeight = iframe.offsetHeight + 2 * MARGIN.y;
    let lastSize = { width: window.innerWidth, height: window.innerHeight };
    let settled;

    const fitWindow = () => {
        // the largest size that still shows the whole calculator and its margin
        let scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);

        if (Math.abs(scale - 1) < 0.01) scale = 1; // a window opened at the normal size stays sharp
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
        iframe.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };

    // The window keeps the calculator's shape. The browser cannot lock that while the
    // window is dragged, so once a resize settles the side that moved less
    // follows the other one
    const keepShape = () => {
        chrome.windows.getCurrent((win) => {
            if (win.state !== 'normal') return; // maximised or full screen

            const frameWidth = win.width - window.innerWidth; // borders and title bar
            const frameHeight = win.height - window.innerHeight;
            const byWidth = Math.abs(window.innerWidth - lastSize.width) / baseWidth >=
                Math.abs(window.innerHeight - lastSize.height) / baseHeight;
            const room = Math.min((screen.availWidth - frameWidth) / baseWidth,
                (screen.availHeight - frameHeight) / baseHeight);
            let scale = byWidth ? window.innerWidth / baseWidth : window.innerHeight / baseHeight;

            scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, room, scale));
            lastSize = { width: Math.round(baseWidth * scale), height: Math.round(baseHeight * scale) };
            if (Math.abs(lastSize.width - window.innerWidth) > 1 || Math.abs(lastSize.height - window.innerHeight) > 1) {
                chrome.windows.update(win.id, {
                    width: lastSize.width + frameWidth,
                    height: lastSize.height + frameHeight
                });
            }
        });
    };

    document.documentElement.classList.add('detached');
    window.addEventListener('resize', () => {
        fitWindow();
        clearTimeout(settled);
        settled = setTimeout(keepShape, 200);
    });
    fitWindow();
}

// what the calculator keeps in localStorage
const storageKeys = ['secondActive', 'deg', 'memory', 'calc', 'format', 'fraction', 'stat'];

// listen for messages from the iframe
window.addEventListener('message', (event) => {
    if (event.data?.command == 'clear-storage') {
        // Clear localStorage
        localStorage.clear();
    } else if (event.data?.command == 'set-storage') {
        // Set values in localStorage: only the calculator's own keys, and a full
        // or blocked storage must not break the page
        for (const key of storageKeys) {
            if (event.data.storage && Object.prototype.hasOwnProperty.call(event.data.storage, key)) {
                try {
                    localStorage.setItem(key, JSON.stringify(event.data.storage[key]));
                } catch (e) { }
            }
        }
    } else if (event.data?.command == 'open-options') {
        chrome.runtime.openOptionsPage();
    } else if (event.data?.command == 'read-clipboard') {
        pasteFromClipboard();
    }
});

// Paste in the menu of a right click. The calculator cannot read the clipboard,
// so this page does: the browser asks once to allow it, as the permission is optional
// and not given at install. The text goes to the calculator as a paste
const refusePaste = () => iframe.contentWindow.postMessage({ type: 'paste-refused' }, '*');

const readClipboard = () => navigator.clipboard.readText().catch(() => {
    // the older way, which the permission allows as well, while the calculator has the focus
    const box = document.createElement('textarea');
    document.body.appendChild(box);
    box.focus();
    const pasted = document.execCommand('paste');
    const text = box.value;
    box.remove();
    iframe.focus();
    return pasted ? text : Promise.reject();
});

function pasteFromClipboard() {
    try {
        chrome.permissions.request({ permissions: ['clipboardRead'] }, (granted) => {
            if (chrome.runtime.lastError || !granted) {
                refusePaste();
                return;
            }
            readClipboard().then((text) => {
                iframe.contentWindow.postMessage({ type: 'paste', text }, '*');
            }, refusePaste);
        });
    } catch (e) {
        refusePaste(); // asked for outside a click
    }
}


// Pass keyboard events to the iframe
['keydown', 'keyup', 'keypress'].forEach(eventType => {
    document.addEventListener(eventType, function (e) {
        const { key, keyCode, altKey, ctrlKey, shiftKey, metaKey } = e;
        iframe.contentWindow.postMessage({
            type: eventType,
            key,
            keyCode,
            altKey,
            ctrlKey,
            shiftKey,
            metaKey
        }, '*');
    });
});


// pass paste event to the iframe
document.addEventListener('paste', function (e) {
    // Get clipboard data
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    iframe.contentWindow.postMessage({ type: 'paste', text: pastedText }, '*');
});

// pass storage data to the iframe
iframe.addEventListener('load', () => {
    // Get values from localStorage
    const storageData = {};

    storageKeys.forEach(key => {
        try {
            const item = localStorage.getItem(key);
            if (item !== null) {
                storageData[key] = JSON.parse(item);
            }
        } catch (e) { } // a damaged value is left out, the rest is restored
    });

    // Pass data to iframe
    iframe.contentWindow.postMessage({ type: 'storage', text: JSON.stringify(storageData) }, '*');
});

// the number format was changed on the options page while the calculator is open
window.addEventListener('storage', (event) => {
    if (event.key === 'format') {
        iframe.contentWindow.postMessage({ type: 'format', text: event.newValue }, '*');
    }
});
