// The page around the calculator. calc.html runs in an iframe, as in the extension's
// popup.js, and keeps its own state: this page passes it the keyboard and the clipboard,
// scales it to its pane, and shows or hides the options when the ? is clicked.

const iframe = document.getElementById('calc-iframe');
const stage = document.getElementById('stage');
const pane = document.getElementById('calc-pane');
const optionsPane = document.getElementById('options-pane');

const CALC_WIDTH = 388;
const CALC_HEIGHT = 585;
const MAX_SCALE = 1.4; // bigger than the popup on a big screen, but not huge

const toCalc = (message) => iframe.contentWindow.postMessage(message, '*');

// ---- size: the calculator fits its pane, whatever the screen ----
const fit = () => {
    const style = getComputedStyle(pane);
    const room = {
        width: pane.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: pane.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    };
    let scale = Math.min(room.width / CALC_WIDTH, room.height / CALC_HEIGHT, MAX_SCALE);

    if (!(scale > 0)) return;
    if (Math.abs(scale - 1) < 0.02) scale = 1; // the normal size stays sharp
    stage.style.width = Math.round(CALC_WIDTH * scale) + 'px';
    stage.style.height = Math.round(CALC_HEIGHT * scale) + 'px';
    iframe.style.transform = `scale(${scale})`;
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

const showOptions = (open) => {
    document.body.classList.toggle('options-open', open);
    if (open) {
        optionsPane.scrollTop = 0;
        optionsPane.focus({ preventScroll: true });
    } else {
        iframe.focus();
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
wide.addEventListener('change', () => document.body.classList.remove('options-open'));

// ---- messages from the calculator ----
window.addEventListener('message', (event) => {
    if (event.source !== iframe.contentWindow) return;

    const data = event.data || {};

    if (data.command === 'open-options') {
        // the ? and the name: on a wide screen hide the panel, so the calculator
        // is in the middle, or show it again; on a small one open it over the calculator
        if (wide.matches) {
            toggleWide();
        } else {
            showOptions(!document.body.classList.contains('options-open'));
        }
    } else if (data.command === 'read-clipboard') {
        // the menu's Paste: the browser may ask once for permission to read it
        const refuse = () => toCalc({ type: 'paste-refused' });

        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then((text) => toCalc({ type: 'paste', text }), refuse);
        } else {
            refuse();
        }
    }
});

iframe.addEventListener('load', fit);

// ---- keyboard and paste: passed on, unless the user is typing in the options ----
const inOptions = (e) => optionsPane.contains(e.target) &&
    /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName);

['keydown', 'keyup', 'keypress'].forEach((type) => {
    document.addEventListener(type, (e) => {
        if (inOptions(e) || document.body.classList.contains('options-open') && !wide.matches) return;

        const { key, keyCode, altKey, ctrlKey, shiftKey, metaKey } = e;

        toCalc({ type, key, keyCode, altKey, ctrlKey, shiftKey, metaKey });
    });
});

document.addEventListener('paste', (e) => {
    if (inOptions(e)) return;
    toCalc({ type: 'paste', text: (e.clipboardData || window.clipboardData).getData('text/plain') });
});
