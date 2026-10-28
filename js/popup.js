// The page of the popup and of the detached window: it holds the calculator, and does
// for it what needs the extension: it opens the options and reads the clipboard

const calculator = document.getElementById('calculator');
const params = new URLSearchParams(location.search);

// each panel that pops out into a window of its own, popup.html?panel=solve: its title, and the policy that turns it off
const PANELS = {
    stats: ['Statistics', 'statistics'],
    fx: ['Formulas', 'formulas'],
    conv: ['Converter', 'converter'],
    solve: ['Solve', 'solve'],
    numbers: ['Numbers', 'numbers'],
    phys: ['Physics', 'physics'],
    bio: ['Biology', 'biology'],
};
const panel = Object.hasOwn(PANELS, params.get('panel')) ? params.get('panel') : '';

// An administrator's change (policy.js): the calculator takes its panels out, and the detached
// window or the graph's own window closes when what it shows is turned off. The Calculator tab of a tool's
// window as well, which goes with Detached Mode, as the open mode Advanced does (background.js)
const followPolicy = () => {
    if (((params.has('detached') || params.has('calc')) && CalcPolicy.off('detachedMode')) || (params.has('graph') && CalcPolicy.off('graph')) ||
        (params.has('chem') && CalcPolicy.off('chemistry')) || (panel && CalcPolicy.off(PANELS[panel][1]))) {
        window.close();
        return;
    }
    calculator.dispatchEvent(new CustomEvent('calc-policy'));
};

CalcPolicy.onChange(followPolicy);

// detached mode: the calculator grows and shrinks with its window, within limits
if (params.has('detached')) {
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

// Firefox does not tell the extension when a window is moved or resized: the detached
// window and the graph's tell it themselves, for the place to be remembered. Not where
// there are no windows to move, as the page opened outside the extension in the tests
if ((params.has('detached') || params.has('graph')) && chrome.windows && !chrome.windows.onBoundsChanged) {
    let place = '';

    setInterval(() => {
        const now = [window.screenX, window.screenY, window.outerWidth, window.outerHeight].join();

        if (now === place) return;
        place = now;
        chrome.runtime.sendMessage({ command: 'window-moved' }).catch(() => { });
    }, 1000);
}

// A window of its own made no smaller than min, nor bigger than the screen: put back once the resize stops. Each
// tool's no narrower than an iPad mini, as in background.js
const MIN_WIDTH = 744;

function keepAtLeast(min) {
    let settling;

    window.addEventListener('resize', () => {
        clearTimeout(settling);
        settling = setTimeout(() => {
            const width = Math.min(screen.availWidth, Math.max(min.width, window.outerWidth));
            const height = Math.min(screen.availHeight, Math.max(min.height, window.outerHeight));

            if (width === window.outerWidth && height === window.outerHeight) return;
            chrome.windows.getCurrent((win) => {
                if (win.state === 'normal') chrome.windows.update(win.id, { width, height });
            });
        }, 300);
    });
}

// A tool's own window going to another tool, or to its Calculator tab (popup.html?calc), as the bar above it does
const goWindow = (to) => {
    chrome.runtime.sendMessage({ command: 'go-window', to: to }).catch(() => { });
};

// The graph's own window, popup.html?graph: only the graph, as big as the window. Its close
// button and Esc close the window; a value put in goes to its Calculator tab, which has it
// through the storage
if (params.has('graph')) {
    document.title = 'Graph | Scientific Calculator';
    calculator.dispatchEvent(new CustomEvent('calc-graph', { detail: { big: true, alone: true } }));
    keepAtLeast({ width: MIN_WIDTH, height: 640 });
    document.addEventListener('calc-graph-close', () => window.close());
    document.addEventListener('calc-graph-put', () => goWindow('calc'));
} else if (params.has('chem')) {
    // The periodic table's own window, popup.html?chem: only the table, as big as the window, the same way
    document.title = 'Chemistry | Scientific Calculator';
    calculator.dispatchEvent(new CustomEvent('calc-chem', { detail: { big: true, alone: true } }));
    // no smaller than an iPad mini is wide, and the room of the table's rows high, as in background.js
    keepAtLeast({ width: MIN_WIDTH, height: 700 });
    document.addEventListener('calc-chem-close', () => window.close());
    document.addEventListener('calc-chem-put', () => goWindow('calc'));
} else if (panel) {
    // Any other panel's own window, popup.html?panel=solve: only the panel, as big as the window, the same way
    document.title = PANELS[panel][0] + ' | Scientific Calculator';
    calculator.dispatchEvent(new CustomEvent('calc-panel', { detail: { panel } }));
    // no smaller than an iPad mini is wide, as in background.js
    keepAtLeast({ width: MIN_WIDTH, height: 640 });
    document.addEventListener('calc-panel-close', () => window.close());
    document.addEventListener('calc-panel-put', () => goWindow('calc'));
} else if (params.has('calc')) {
    // A tool's own window on its Calculator tab, popup.html?calc: the calculator fills the room beside the rail of
    // the tools, as the website's fills its pane (web/js/app.js): 4px of
    // room round it, its margin of 3px and 4px, no bigger than 1.4 times, the normal size kept sharp, and in the
    // middle. A tool popped out from it is shown in this window, as the bar shows it
    const bar = document.querySelector('.calc-go');
    const acts = document.querySelector('.calc-home-acts');
    const MAX_SCALE = 1.4;
    const fitHome = () => {
        const rail = bar.getBoundingClientRect(); // zoomed as the window is big (main.js, popScale)
        const across = rail.width > rail.height; // a bar across the top, on a narrow window (style.css)
        const left = across ? 0 : rail.width;
        const top = across ? rail.height : 0;
        // pop in and close under the bar: the calculator in the middle of the room under the bar, kept clear of them
        const clear = across ? acts.getBoundingClientRect().height : 0;
        const room = { width: window.innerWidth - left - 8, height: window.innerHeight - top - 8 };
        const size = { width: calculator.offsetWidth + 8, height: calculator.offsetHeight + 6 };
        let scale = Math.min(room.width / size.width, (room.height - clear) / size.height, MAX_SCALE);

        if (!(scale > 0)) return;
        if (Math.abs(scale - 1) < 0.01) scale = 1;
        const x = Math.round(left + 4 + (room.width - size.width * scale) / 2 + 4 * scale);
        const y = Math.round(top + 4 + Math.max(clear, (room.height - size.height * scale) / 2) + 3 * scale);

        calculator.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    };

    document.title = 'Calculator | Scientific Calculator';
    document.documentElement.classList.add('home');
    calculator.dispatchEvent(new CustomEvent('calc-home'));
    // no smaller than the panels' windows, as the window it opens in (background.js), for going from tab to tab
    keepAtLeast({ width: MIN_WIDTH, height: 640 });
    document.addEventListener('calc-home-close', () => window.close());
    window.addEventListener('resize', fitHome);
    fitHome();
    [['calc-big', () => 'graph'], ['calc-chem-big', () => 'chem'], ['calc-panel-big', (detail) => detail.panel]].forEach(([name, tool]) => {
        document.addEventListener(name, (event) => {
            if (!event.detail.big) return;
            event.preventDefault();
            goWindow(tool(event.detail));
        });
    });
} else {
    // The popup and the detached window keep the calculator's size: the big graph, the big table and each panel
    // open in windows of their own, and the calculator is left, only that window open till pop in brings it back.
    // The detached window is closed by background.js, once the tool's window is open; the popup closes here, then,
    // as background.js answers. Nothing opened, as the tool is turned off or the window could not be made, it stays
    const popOut = (message) => {
        chrome.runtime.sendMessage(message)
            .catch(() => false)
            .then((opened) => {
                if (opened && !params.has('detached')) window.close();
            });
    };

    document.addEventListener('calc-big', (event) => {
        if (!event.detail.big) return;
        event.preventDefault();
        popOut({ command: 'open-graph' });
    });
    document.addEventListener('calc-chem-big', (event) => {
        if (!event.detail.big) return;
        event.preventDefault();
        popOut({ command: 'open-chem' });
    });
    document.addEventListener('calc-panel-big', (event) => {
        if (!event.detail.big) return;
        event.preventDefault();
        popOut({ command: 'open-panel', panel: event.detail.panel });
    });
    // and the calculator itself, by the button after its name, in the detached window, not the small popup, and
    // only while the open mode is Advanced (options.js): in the big window, on its Calculator tab
    const openBig = calculator.querySelector('.calc-open-big');
    const showOpenBig = (mode) => {
        openBig.hidden = !params.has('detached') || mode !== 'advanced';
    };

    showOpenBig();
    // not where the page is opened outside the extension, as in the tests
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('openMode').then(({ openMode }) => showOpenBig(openMode)).catch(() => { });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.openMode) showOpenBig(changes.openMode.newValue);
        });
    }
    document.addEventListener('calc-open-big', () => popOut({ command: 'open-home' }));
}

// Pop in, in a window of its own: the calculator comes up with it, opened if it was closed, and this window closes
document.addEventListener('calc-pop-in', () => {
    chrome.runtime.sendMessage({ command: 'pop-in' }).catch(() => { });
});

// the bar above the head, in a window of its own: the window goes to the tool chosen, or to its Calculator tab
document.addEventListener('calc-go', (event) => goWindow(event.detail.to));

// as it was kept last, until the browser answers
followPolicy();

// The maths of the pages (page/answers.js): its results are worked out in the calculator's unit of
// angles, which the pages cannot read here, so it is kept where they can. And a sum or an equation
// whose icon was clicked comes into Detached Mode, which background.js opened for it: as the window
// opens, or at once if it was open. It is taken once; one older than a minute is of a window that
// never opened. Not where the page is opened outside the extension, as in the tests
const pageStore = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

if (pageStore) {
    const shareUnit = (deg) => {
        pageStore.get('angleUnit')
            .then(({ angleUnit }) => angleUnit === deg || pageStore.set({ angleUnit: deg }))
            .catch(() => { });
    };
    let kept = null;

    try {
        kept = JSON.parse(localStorage.getItem('deg'));
    } catch (e) { }
    shareUnit(kept === true ? 1 : kept === 'grad' ? 2 : 0); // as main.js reads it
    document.addEventListener('calc-unit', (event) => shareUnit(event.detail.deg));

    // The features of the panels turned off in the options, as panelsOff, for background.js to leave out of
    // the instant answers, as options.js keeps them: here too, for panels turned off before it kept them
    const panelsOff = Object.entries({ formulas: 'fxOn', converter: 'convOn', graph: 'graphOn', statistics: 'statsOn', solve: 'solveOn', numbers: 'numbersOn', chemistry: 'chemOn', physics: 'physOn', biology: 'bioOn' })
        .filter(([, key]) => {
            try {
                return JSON.parse(localStorage.getItem(key)) === false;
            } catch (e) {
                return false;
            }
        })
        .map(([name]) => name);

    pageStore.get('panelsOff')
        .then((kept) => String(kept.panelsOff || []) === String(panelsOff) || pageStore.set({ panelsOff: panelsOff }))
        .catch(() => { });
}

if (pageStore && params.has('detached')) {
    const takePageMaths = (maths) => {
        if (!maths || !(Date.now() - maths.at < 60000)) return;
        pageStore.remove('pageMaths').catch(() => { });
        calculator.dispatchEvent(new CustomEvent('calc-equation', { detail: { text: maths.text, kind: maths.kind, fields: maths.fields } }));
    };

    pageStore.get('pageMaths').then(({ pageMaths }) => takePageMaths(pageMaths)).catch(() => { });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.pageMaths) takePageMaths(changes.pageMaths.newValue);
    });
}

// A tool's own window, or its Calculator tab: Options and Guide of the rail open the options page over the window
// beside the rail, in a frame, on that tab, as the website opens them over a tool popped out, that one marked on the
// rail. Escape or a tool of the rail closes it, and the calculator is out of use meanwhile (main.js
// types nothing under an inert one)
const optionsOver = document.querySelector('.options-over');
const optionsFrame = optionsOver.querySelector('iframe');
const goBar = document.querySelector('.calc-go');
const toolWindow = ['graph', 'chem', 'panel', 'calc'].some((key) => params.has(key));

const showOptionsOver = (open, tab) => {
    optionsOver.hidden = !open;
    calculator.inert = open;
    document.querySelector('.calc-home-acts').inert = open;
    document.documentElement.classList.toggle('options-shown', open);
    goBar.querySelectorAll('.calc-go-opt').forEach((item) => item.classList.toggle('calc-opt-on', open && item.dataset.tab === tab));
    if (open) optionsFrame.focus();
};

// a tool of the rail: the options close, and it is gone to (main.js), or shown again if it is the one under them
const goneFromRail = (e) => {
    if (!optionsOver.hidden && e.target.closest('.calc-go-item[data-go]')) showOptionsOver(false);
};

goBar.addEventListener('click', goneFromRail, true);
// Search of the rail opens over the window: the options close under it
document.addEventListener('calc-find', () => {
    if (!optionsOver.hidden) showOptionsOver(false);
});
goBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') goneFromRail(e);
}, true);

// the tab last asked for: one asked for while the page is still loading is shown as it loads
let optionsTab = '';
let optionsLoaded = false;

const showOptionsTab = () => {
    const shown = optionsFrame.contentDocument?.querySelector(`.tab[data-tab-for="${optionsTab}"]`);

    if (!shown) return;
    shown.click(); // on that tab, at its top
    optionsFrame.contentWindow.scrollTo(0, 0);
};

const openOptionsOver = (tab) => {
    optionsTab = tab;
    if (optionsLoaded) showOptionsTab(); // open already once
    else if (!optionsFrame.getAttribute('src')) optionsFrame.src = 'options.html#' + tab;
    showOptionsOver(true, tab);
};

optionsFrame.addEventListener('load', () => {
    optionsLoaded = true;
    showOptionsTab();
    optionsFrame.contentDocument.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') showOptionsOver(false);
    });
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !optionsOver.hidden) showOptionsOver(false);
});

// the ? and the FIX mark of the calculator open the options page; Options and Guide of the rail of a tool
// popped out open it on that tab, its mark after the # (options.js), open already or as it opens; over the
// window, in a tool's own window. On its Calculator tab, the ? and the FIX mark as well, as the website's
// Advanced mode has them (web/js/app.js)
document.addEventListener('calc-options', (event) => {
    const tab = event.detail?.tab;
    const page = chrome.runtime.getURL('options.html');

    if (toolWindow && (event.detail?.over || params.has('calc'))) {
        openOptionsOver(tab || 'options');
        return;
    }
    chrome.runtime.openOptionsPage()
        .then(() => tab && chrome.tabs.query({ url: page + '*' }))
        .then((tabs) => tabs && tabs[0] && chrome.tabs.update(tabs[0].id, { url: page + '#' + tab }))
        .catch(() => { });
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

// whether the clipboard holds text, for the menu to show Paste: read only where the permission
// is given already, never asked for here, as a right click is no request to read it
document.addEventListener('calc-clipboard', (event) => {
    const { text } = event.detail;

    event.preventDefault(); // it answers
    try {
        chrome.permissions.contains({ permissions: ['clipboardRead'] }, (has) => {
            if (chrome.runtime.lastError || !has) text(null);
            else navigator.clipboard.readText().then(text, () => text(null));
        });
    } catch (e) {
        text(null);
    }
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

// a tool's own window or its Calculator tab, made what it is to be: shown (js/opening.js), on the frame after
if (document.documentElement.classList.contains('opening')) {
    requestAnimationFrame(() => document.documentElement.classList.remove('opening'));
}
