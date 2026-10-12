// The page of the popup and of the detached window: it holds the calculator, and does
// for it what needs the extension: it opens the options and reads the clipboard

const calculator = document.getElementById('calculator');

// detached mode: the calculator grows and shrinks with its window, within limits
if (new URLSearchParams(location.search).has('detached')) {
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 3;
    // room around the calculator at the normal size, the same on every side, as in background.js
    const MARGIN = 2;
    // the calculator with its margin: this is what the window is filled with
    const baseWidth = calculator.offsetWidth + 2 * MARGIN;
    const baseHeight = calculator.offsetHeight + 2 * MARGIN;
    let lastSize = { width: window.innerWidth, height: window.innerHeight };
    let settled;

    const fitWindow = () => {
        // the largest size that still shows the whole calculator and its margin
        let scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);

        if (scale > 1 && scale < 1.01) scale = 1; // a window opened at the normal size stays sharp; never bigger than fits
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
        calculator.style.transform = `translate(-50%, -50%) scale(${scale})`;
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
                const width = lastSize.width + frameWidth;
                const height = lastSize.height + frameHeight;
                // a window that grows past the bottom or the right of the screen moves up or left, to stay in view
                const left = screen.availLeft || 0;
                const top = screen.availTop || 0;

                chrome.windows.update(win.id, {
                    width: width,
                    height: height,
                    left: Math.max(left, Math.min(win.left, left + screen.availWidth - width)),
                    top: Math.max(top, Math.min(win.top, top + screen.availHeight - height))
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
    // the title bar is not as tall in every system: a window opened a little off the shape is put right
    keepShape();
}

// the name, the ? and the FIX mark of the calculator open the options page
document.addEventListener('calc-options', () => {
    chrome.runtime.openOptionsPage();
});

// Paste in the menu of a right click: the browser asks once to allow reading the
// clipboard, as the permission is optional and not given at install. The calculator
// gets the text, or is told that there is none
const readClipboard = () => navigator.clipboard.readText().catch(() => {
    // the older way, which the permission allows as well
    const box = document.createElement('textarea');
    document.body.appendChild(box);
    box.focus();
    const pasted = document.execCommand('paste');
    const text = box.value;
    box.remove();
    return pasted ? text : Promise.reject();
});

document.addEventListener('calc-paste', (event) => {
    const { text, refused } = event.detail;

    try {
        chrome.permissions.request({ permissions: ['clipboardRead'] }, (granted) => {
            if (chrome.runtime.lastError || !granted) {
                refused();
                return;
            }
            readClipboard().then(text, refused);
        });
    } catch (e) {
        refused(); // asked for outside a click
    }
});
