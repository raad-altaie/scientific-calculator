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

// ---- size: the calculator fits its pane, whatever the screen ----
const fit = () => {
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
fit();

// ---- the options ----
const wide = window.matchMedia('(min-width: 1100px)');
const closeButton = document.getElementById('close-options');

// on a wide screen the options can be hidden with the ?; it is kept like the other options
const hideKey = 'optionsHidden';

try {
    document.documentElement.classList.toggle('options-hidden', localStorage.getItem(hideKey) === 'true');
} catch (e) { }

// on a small screen the options open over the calculator, which is out of use meanwhile:
// what is typed is not for its keys
const themeColor = document.querySelector('meta[name="theme-color"]');

const showOptions = (open, over) => {
    document.body.classList.toggle('options-open', open);
    // from the rail of a tool popped out: over it, on a wide screen as well
    document.documentElement.classList.toggle('options-over', !!(open && over));
    // the bar of the installed app: the calculator's grey, the options' navy while they are open
    if (themeColor) themeColor.content = open ? '#39576f' : '#a8a8a8';
    pane.inert = open;
    if (open) {
        optionsPane.scrollTop = 0;
        optionsPane.focus({ preventScroll: true });
    } else {
        optionsPane.blur();
    }
};

// the ? does the same on a wide screen: hide the panel, or show it again
const toggleWide = () => {
    const hidden = document.documentElement.classList.toggle('options-hidden');

    try {
        localStorage.setItem(hideKey, hidden);
    } catch (e) { }
};

closeButton.addEventListener('click', () => (wide.matches && !document.documentElement.classList.contains('options-over') ? toggleWide() : showOptions(false)));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('options-open')) showOptions(false);
});
// the panel is always there on a wide screen
wide.addEventListener('change', () => showOptions(false));

// ---- the mode: Standard, or Advanced, as the extension's Advanced mode opens the calculator ----

// Advanced: the calculator on its Calculator tab, the rail of the tools down its left (main.js), and the options not
// beside it but over it, from the ? or the rail. Chosen in the options (options.js); pop in at the top right shows
// Standard till the page opens again, and the button beside the ? goes back, as in the extension's detached window
const openBig = calculator.querySelector('.calc-open-big');
const modeKey = 'openMode';

const advanced = () => {
    try {
        return localStorage.getItem(modeKey) === 'advanced';
    } catch (e) {
        return false;
    }
};

const showHome = (on) => {
    // the options open over the calculator on a small screen stay open, over it
    if (on && document.body.classList.contains('options-open')) document.documentElement.classList.add('options-over');
    document.documentElement.classList.toggle('home', on);
    calculator.dispatchEvent(new CustomEvent('calc-home', { detail: { page: true, on } }));
    openBig.hidden = on || !advanced();
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

// the ?: on a wide screen hide the panel, so the calculator
// is in the middle, or show it again; on a small one open it over the calculator.
// The ? of the rail of a tool popped out opens it over the tool, at every width
document.addEventListener('calc-options', (event) => {
    // in Advanced mode, the ? as well: the options are not beside the calculator there
    if (event.detail?.over || document.documentElement.classList.contains('home')) {
        document.querySelector(`.options-pane .tab[data-tab-for="${event.detail?.tab || 'options'}"]`)?.click();
        showOptions(true, true);
    } else if (wide.matches) {
        toggleWide();
    } else {
        showOptions(!document.body.classList.contains('options-open'));
    }
});

// Search of the rail opens over the page: the options open over it close
document.addEventListener('calc-find', () => {
    if (document.body.classList.contains('options-open')) showOptions(false);
});

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
