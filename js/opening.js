// Run in the head of popup.html, before the calculator is drawn. A tool's own window, popup.html?graph, ?chem or
// ?panel=solve, and its Calculator tab, ?calc, are hidden till popup.js has made them what they are to be: going
// from tab to tab opens the page again, and the popup's calculator would show for a moment first. A tool's window
// has the tools' blue at once, not the grey of the calculator

// The detached window's calculator: scaled within these, with this room round it at its own size (popup.js)
const DETACHED = { min: 0.5, max: 3, margin: 2 };

// The detached window's calculator, of a width and height, scaled to the window now: the largest size that still
// shows the whole calculator and its margin, in the middle of it
function detachedFit(width, height) {
    let scale = Math.min(window.innerWidth / (width + 2 * DETACHED.margin), window.innerHeight / (height + 2 * DETACHED.margin));

    if (scale > 1 && scale < 1.01) scale = 1; // a window opened at the normal size stays sharp; never bigger than fits
    scale = Math.max(DETACHED.min, Math.min(DETACHED.max, scale));
    // The calculator is drawn a whole number of pixels wide and tall, with the same
    // whole number of pixels on both sides of it: with a half pixel to share, one side
    // would get more. The change to the scale is under a pixel
    const fit = (room, size) => {
        const drawn = Math.round(size * scale);

        return (room - drawn) % 2 ? drawn + 1 : drawn;
    };
    const fitWidth = fit(window.innerWidth, width);
    const fitHeight = fit(window.innerHeight, height);

    return `translate(${(window.innerWidth - fitWidth) / 2}px, ${(window.innerHeight - fitHeight) / 2}px) scale(${fitWidth / width}, ${fitHeight / height})`;
}

{
    const search = new URLSearchParams(location.search);
    const page = document.documentElement;
    const hide = () => {
        const show = () => page.classList.remove('opening');

        page.classList.add('opening');
        // shown however popup.js ends: an error on the way, or nothing heard from it in two seconds
        window.addEventListener('error', show);
        setTimeout(show, 2000);
    };

    if (['graph', 'chem', 'panel', 'calc'].some((key) => search.has(key))) hide();
    if (['graph', 'chem', 'panel'].some((key) => search.has(key))) page.classList.add('tool-page');
    if (search.has('calc')) page.classList.add('home'); // in the popup's grey from the first, as popup.js has it
    // The detached window at the size it was left: the calculator filling it from the first, of its own size, 380 by 580
    // (style.css), not at that size in the corner till the scripts have run. Of a window not yet of a size, hidden till then
    if (search.has('detached')) {
        page.classList.add('detached');
        if (window.innerWidth && window.innerHeight) page.style.setProperty('--calc-fit', detachedFit(380, 580));
        else hide();
    }
}
