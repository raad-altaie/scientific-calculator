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
        // The calculator is drawn a whole number of pixels wide and tall, with the same
        // whole number of pixels on both sides of it: with a half pixel to share, one side
        // would get more. The change to the scale is under a pixel
        const fit = (room, size) => {
            const drawn = Math.round(size * scale);

            return (room - drawn) % 2 ? drawn + 1 : drawn;
        };
        const width = fit(window.innerWidth, calculator.offsetWidth);
        const height = fit(window.innerHeight, calculator.offsetHeight);
        const x = (window.innerWidth - width) / 2;
        const y = (window.innerHeight - height) / 2;

        calculator.style.transform = `translate(${x}px, ${y}px) scale(${width / calculator.offsetWidth}, ${height / calculator.offsetHeight})`;
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
            const target = { width: Math.round(baseWidth * scale), height: Math.round(baseHeight * scale) };

            // Windows scaled above 100% rounds the window to the pixels of the screen, so it
            // can come out a pixel off what was asked; that is left as it is, the calculator
            // centred in it, or each try would resize the window again, for seconds
            if (Math.abs(target.width - window.innerWidth) <= 3 && Math.abs(target.height - window.innerHeight) <= 3) {
                lastSize = { width: window.innerWidth, height: window.innerHeight };
                return;
            }
            lastSize = target;

            const width = target.width + frameWidth;
            const height = target.height + frameHeight;
            // a window that grows past the bottom or the right of the screen moves up or left, to stay in view
            const screenLeft = screen.availLeft || 0;
            const screenTop = screen.availTop || 0;
            const left = Math.max(screenLeft, Math.min(win.left, screenLeft + screen.availWidth - width));
            const top = Math.max(screenTop, Math.min(win.top, screenTop + screen.availHeight - height));
            const bounds = { width: width, height: height };

            // the place is given only when it changes: given again, Windows may move the window a pixel
            if (left !== win.left) bounds.left = left;
            if (top !== win.top) bounds.top = top;
            chrome.windows.update(win.id, bounds);
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

// The graph's own window, popup.html?graph: only the graph, as big as the window. Its close
// button and Esc close the window; a value put in brings the calculator up, which has it
// through the storage
if (new URLSearchParams(location.search).has('graph')) {
    document.title = 'Graph';
    calculator.dispatchEvent(new CustomEvent('calc-graph', { detail: { big: true, alone: true } }));
    document.addEventListener('calc-graph-close', () => window.close());
    document.addEventListener('calc-graph-put', () => {
        chrome.runtime.sendMessage({ command: 'show-calculator' }).catch(() => { });
    });
} else {
    // the popup and the detached window keep the calculator's size: the big graph opens in that window
    document.addEventListener('calc-big', (event) => {
        if (!event.detail.big) return;
        event.preventDefault();
        chrome.runtime.sendMessage({ command: 'open-graph' }).catch(() => { });
    });
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
