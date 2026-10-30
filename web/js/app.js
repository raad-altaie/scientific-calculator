// The page around the calculator. It scales the calculator to its pane, shows or hides
// the options when the ? is clicked, and reads the clipboard for it, as popup.js does
// in the extension.

const calculator = document.getElementById('calculator');
const stage = document.getElementById('stage');
const pane = document.getElementById('calc-pane');
const optionsPane = document.getElementById('options-pane');

const MAX_SCALE = 1.4; // bigger than the popup on a big screen, but not huge

// the calculator with the room around it, which site.css gives it as its margin: as in
// the popup of the extension, with less at the sides on a small screen
const whole = () => {
    const style = getComputedStyle(calculator);

    return {
        width: calculator.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight),
        height: calculator.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
    };
};

// a tool popped out: the calculator fills the page, unscaled (style.css), and is no measure of itself
const poppedOut = () => calculator.matches('.calc-big, .calc-panel-big');

// ---- size: the calculator fits its pane, whatever the screen ----
const fit = () => {
    if (poppedOut()) return; // fitted again as it pops in, to the window as it is then
    const style = getComputedStyle(pane);
    const room = {
        width: pane.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: pane.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    };
    const size = whole();
    let scale = Math.min(room.width / size.width, room.height / size.height, MAX_SCALE);

    if (!(scale > 0)) return;
    if (Math.abs(scale - 1) < 0.01) scale = 1; // the normal size stays sharp
    stage.style.width = Math.round(size.width * scale) + 'px';
    stage.style.height = Math.round(size.height * scale) + 'px';
    calculator.style.transform = `scale(${scale})`;
};

new ResizeObserver(fit).observe(pane);
window.addEventListener('resize', fit);
// popped in, its size again: the window may have changed while a tool was popped out
new MutationObserver(fit).observe(calculator, { attributes: true, attributeFilter: ['class'] });
fit();

// ---- the options ----
const wide = window.matchMedia('(min-width: 1100px)');
const closeButton = document.getElementById('close-options');

// on a wide screen the options can be hidden with the ?; it is kept like the other options
const hideKey = 'optionsHidden';

try {
    document.documentElement.classList.toggle('options-hidden', localStorage.getItem(hideKey) === 'true');
} catch (e) { }

// The options over the calculator, open or not: on a small screen, and in Advanced mode at every width, beside the
// rail. Else beside it, shown or hidden with the ?
const isHome = () => document.documentElement.classList.contains('home');
const isOpen = () => document.body.classList.contains('options-open');
const over = () => isHome() || !wide.matches;
const optionsShown = () => (over() ? isOpen() : !document.documentElement.classList.contains('options-hidden'));

// Advanced: open, Options or Guide is the one marked on the rail, as the tab shown (site.css)
const goBar = document.querySelector('.calc-go');
const optionsWrapper = optionsPane.querySelector('.wrapper');

const markRail = () => {
    const open = isHome() && isOpen();

    document.documentElement.classList.toggle('options-shown', open);
    goBar.querySelectorAll('.calc-go-opt').forEach((item) => item.classList.toggle('calc-opt-on', open && item.dataset.tab === optionsWrapper.dataset.show));
};

// on a small screen the options open over the calculator, which is out of use meanwhile:
// what is typed is not for its keys. In Advanced mode the rail stays in use, to close them or go to a tool
const themeColor = document.querySelector('meta[name="theme-color"]');

const showOptions = (open) => {
    const was = isOpen();

    document.body.classList.toggle('options-open', open);
    // the bar of the installed app: the calculator's grey, the options' navy while they are open
    if (themeColor) themeColor.content = open ? '#39576f' : '#a8a8a8';
    pane.inert = open && !isHome();
    calculator.inert = open && isHome();
    markRail();
    if (open === was) return;
    if (open) {
        optionsPane.scrollTop = 0;
        optionsPane.focus({ preventScroll: true });
    } else {
        optionsPane.blur();
    }
};

// beside it on a wide screen: shown, or hidden
const showWide = (shown) => {
    if (shown !== document.documentElement.classList.contains('options-hidden')) return;
    document.documentElement.classList.toggle('options-hidden', !shown);
    try {
        localStorage.setItem(hideKey, !shown);
    } catch (e) { }
    // a tool popped out is half the page now, or all of it: what the calculator measures as the window is resized
    // (its cards beside their list or not, the periodic table's fit, the graph) is measured again
    window.dispatchEvent(new Event('resize'));
};

const setShown = (shown) => (over() ? showOptions(shown) : showWide(shown));

closeButton.addEventListener('click', () => setShown(false));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) showOptions(false);
});
// the panel is always there on a wide screen; in Advanced mode they stay over the calculator, open or not
wide.addEventListener('change', () => {
    if (!isHome()) showOptions(false);
});

// ---- the mode: Standard, or Advanced, as the extension's Advanced mode opens the calculator ----

// Advanced: the calculator on its Calculator tab, the rail of the tools down its left (main.js). The options over
// it, beside the rail, at every width, open or not as they were when the mode changed. Chosen in the options
// (options.js), and left only there: the website has no pop in at the top right (site.css)
const openBig = calculator.querySelector('.calc-open-big');
const modeKey = 'openMode';

// there, the options in the colours of the tools popped out, the guide in a box of its own, as the extension has
// them over its window (options.js, options.css .embedded)
const guideParts = optionsWrapper.querySelectorAll(':scope > [data-tab="guide"]');
const guideBox = document.createElement('div');

guideBox.className = 'guide-box';
guideBox.dataset.tab = 'guide';

const embed = (on) => {
    document.documentElement.classList.toggle('embedded', on);
    if (on && !guideBox.isConnected) {
        guideParts[0].before(guideBox);
        guideBox.append(...guideParts);
    } else if (!on && guideBox.isConnected) {
        guideBox.replaceWith(...guideParts);
    }
};

const advanced = () => {
    try {
        return localStorage.getItem(modeKey) === 'advanced';
    } catch (e) {
        return false;
    }
};

const showHome = (on) => {
    const shown = optionsShown();

    document.documentElement.classList.toggle('home', on);
    embed(on);
    calculator.dispatchEvent(new CustomEvent('calc-home', { detail: { page: true, on } }));
    openBig.hidden = on || !advanced();
    // the options shown still, or hidden still, in the way of the mode now
    if (!over()) showOptions(false);
    setShown(shown);
    fit();
};

openBig.dataset.tip = 'open advanced'; // its tip, not of a window of its own (tips.js)
showHome(document.documentElement.classList.contains('home'));
document.addEventListener('calc-pop-in', () => showHome(false));
document.addEventListener('calc-open-big', () => showHome(true));
window.addEventListener('storage', (e) => {
    if (e.key === modeKey) showHome(advanced());
});

// ---- what the calculator asks of its page ----

// The ?, and Options or Guide on the rail: the options shown, on that tab, or hidden again if shown on it already.
// In Advanced mode the ? is for the options tab, as in the extension
document.addEventListener('calc-options', (event) => {
    const shown = optionsShown();
    const name = event.detail?.tab || (isHome() ? 'options' : '');
    const tab = name && document.querySelector(`.options-pane .tab[data-tab-for="${name}"]`);
    const open = !shown || Boolean(tab && tab.getAttribute('aria-selected') !== 'true');

    if (tab && open) tab.click();
    setShown(open);
});

// Search of the rail opens over the page: the options open over it close
document.addEventListener('calc-find', () => {
    if (isOpen()) showOptions(false);
});

// Advanced: a tool of the rail closes them, and it is gone to (main.js), or shown again if it is the one under them
const goneFromRail = (e) => {
    if (isOpen() && e.target.closest('.calc-go-item[data-go]')) showOptions(false);
};

goBar.addEventListener('click', goneFromRail, true);
goBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') goneFromRail(e);
}, true);

// whether the clipboard holds text, for the menu to show Paste: read only where the browser
// allows it already; asked for nothing, it cannot tell, and the calculator shows Paste
document.addEventListener('calc-clipboard', (event) => {
    const { text } = event.detail;

    event.preventDefault(); // it answers
    if (!navigator.permissions || !navigator.clipboard || !navigator.clipboard.readText) {
        text(null);
        return;
    }
    navigator.permissions.query({ name: 'clipboard-read' }).then((state) => {
        if (state.state !== 'granted') text(null);
        else navigator.clipboard.readText().then(text, () => text(null));
    }, () => text(null)); // a browser with no such permission
});

// the menu's Paste: the browser may ask once for permission to read the clipboard
document.addEventListener('calc-paste', (event) => {
    const { text, refused } = event.detail;

    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text, refused);
    } else {
        refused();
    }
});

// ---- one page, one storage ----

// The options and the calculator tell each other of a change through the storage. The
// browser sends its storage event to the other pages only, and here both are on this
// one, so the page sends it to itself
const setItem = Storage.prototype.setItem;

Storage.prototype.setItem = function (key, value) {
    const before = this.getItem(key);

    setItem.call(this, key, value);
    if (this === localStorage && before !== String(value)) {
        window.dispatchEvent(new StorageEvent('storage', {
            key: key, oldValue: before, newValue: String(value), storageArea: this, url: location.href
        }));
    }
};

// ---- offline: the service worker keeps the calculator for use without a connection ----
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
