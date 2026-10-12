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

const showOptions = (open) => {
    document.body.classList.toggle('options-open', open);
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

// the ? and the name do the same on a wide screen: hide the panel, or show it again
const toggleWide = () => {
    const hidden = document.documentElement.classList.toggle('options-hidden');

    try {
        localStorage.setItem(hideKey, hidden);
    } catch (e) { }
};

closeButton.addEventListener('click', () => (wide.matches ? toggleWide() : showOptions(false)));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('options-open')) showOptions(false);
});
// the panel is always there on a wide screen
wide.addEventListener('change', () => showOptions(false));

// ---- what the calculator asks of its page ----

// the ? and the name: on a wide screen hide the panel, so the calculator
// is in the middle, or show it again; on a small one open it over the calculator
document.addEventListener('calc-options', () => {
    if (wide.matches) {
        toggleWide();
    } else {
        showOptions(!document.body.classList.contains('options-open'));
    }
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
