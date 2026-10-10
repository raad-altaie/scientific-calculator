// The button on every page. Pages only get this script after the option was
// turned on, on the options page. It adds the button and reads nothing from the page.
(() => {
    const id = 'scientific-calculator-page-icon';
    const logoSize = 30;
    // the tab that holds the logo, in pixels: its length along the side of the
    // window, how far it comes out of it, the round of its outer corners, and how
    // far the curves that join it to the side reach along the side and up the tab
    const size = { length: 78, depth: 37, round: 10, foot: { along: 20, up: 16 } };
    const gap = 6; // kept free at both ends of a side
    const svgNS = 'http://www.w3.org/2000/svg';
    const sides = ['left', 'right', 'top', 'bottom'];

    // an XML file opened in a tab has no place for the button
    if (!(document.documentElement instanceof HTMLElement)) return;

    // a button left by an older copy of this script (the extension was updated)
    // no longer works, so this one takes its place
    document.getElementById(id)?.remove();

    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'closed' });
    const sheet = new CSSStyleSheet();
    const button = document.createElement('button');
    const shape = document.createElementNS(svgNS, 'svg');
    const logo = document.createElement('img');

    // the side of the page the button is attached to, and how far along that
    // side its middle is, in percent. Saved for all pages, tabs and windows
    let place = { side: 'right', at: 75 };
    let drag = null; // set while the button is held
    let dragged = false; // the click after a move does not open the calculator

    // the styles of the page must not move or change the button, so the
    // position is always written together with the rest
    const show = (left, top, moving) => {
        host.style.cssText = 'all: initial !important; position: fixed !important; ' +
            'z-index: 2147483647 !important; ' +
            `left: ${left} !important; top: ${top} !important; ` +
            (moving ? '' : 'transition: left 0.2s, top 0.2s !important;');
    };

    // percent and not pixels, so the button keeps its place in a window of any size
    const attach = () => {
        const along = `clamp(${gap}px, calc(${place.at}% - ${size.length / 2}px), calc(100% - ${size.length + gap}px))`;
        const farSide = `calc(100% - ${size.depth}px)`;

        if (place.side === 'left' || place.side === 'right') {
            show(place.side === 'left' ? '0px' : farSide, along);
        } else {
            show(along, place.side === 'top' ? '0px' : farSide);
        }
        button.className = place.side;
    };

    const usePlace = (saved) => {
        if (sides.includes(saved?.side) && saved.at >= 0 && saved.at <= 100) {
            place = { side: saved.side, at: saved.at };
        }
        attach();
    };

    host.id = id;

    // a style sheet made here is not stopped by the security rules of the page
    sheet.replaceSync(`
        /* the tab is attached to the side of the window; it is drawn standing on
           the bottom side and turned for the others */
        button {
            all: initial;
            position: relative;
            display: block;
            width: ${size.length}px;
            height: ${size.depth}px;
            cursor: pointer;
            touch-action: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        .left,
        .right {
            width: ${size.depth}px;
            height: ${size.length}px;
        }

        svg {
            position: absolute;
            left: 50%;
            top: 50%;
            width: ${size.length}px;
            height: ${size.depth}px;
            overflow: visible;
            transform: translate(-50%, -50%);
            filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.3));
            pointer-events: none;
            transition: opacity 0.2s;
        }

        /* while it is dragged only the logo moves; the tab shows again where
           it is dropped */
        .moving svg {
            opacity: 0;
            transition: none;
        }

        .moving img {
            filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45));
        }

        .top svg {
            transform: translate(-50%, -50%) rotate(180deg);
        }

        .left svg {
            transform: translate(-50%, -50%) rotate(90deg);
        }

        .right svg {
            transform: translate(-50%, -50%) rotate(-90deg);
        }

        /* the grey around the calculator in the popup */
        .fill {
            fill: #bebebe;
            transition: fill 0.2s;
        }

        .line {
            fill: none;
            stroke: #9a9a9a;
            stroke-width: 1;
        }

        button:hover .fill {
            fill: #c8c8c8;
        }

        .moving {
            cursor: grabbing;
        }

        /* the logo in the tab */
        img {
            position: absolute;
            width: ${logoSize}px;
            height: ${logoSize}px;
            pointer-events: none;
            transition: transform 0.25s ease-out;
        }

        .bottom img {
            left: calc(50% - ${logoSize / 2}px);
            bottom: ${(size.depth - logoSize) / 2}px;
        }

        .top img {
            left: calc(50% - ${logoSize / 2}px);
            top: ${(size.depth - logoSize) / 2}px;
        }

        .left img {
            top: calc(50% - ${logoSize / 2}px);
            left: ${(size.depth - logoSize) / 2}px;
        }

        .right img {
            top: calc(50% - ${logoSize / 2}px);
            right: ${(size.depth - logoSize) / 2}px;
        }

        button:hover img {
            transform: scale(1.08);
        }

        button:focus-visible .line {
            stroke: #c86e78;
            stroke-width: 2;
        }

        @media print {
            button {
                display: none;
            }
        }
    `);
    root.adoptedStyleSheets = [sheet];

    // the tab: it curves softly out of the side of the window and is round
    // towards the page, and the line around it, but not along the side
    const { length: l, depth: d, round: r, foot: { along: f, up: u } } = size;
    const outline = `M0 ${d} A${f} ${u} 0 0 0 ${f} ${d - u} L${f} ${r} A${r} ${r} 0 0 1 ${f + r} 0 ` +
        `L${l - f - r} 0 A${r} ${r} 0 0 1 ${l - f} ${r} L${l - f} ${d - u} A${f} ${u} 0 0 0 ${l} ${d}`;

    shape.setAttribute('viewBox', `0 0 ${l} ${d}`);
    [['fill', outline + ' Z'], ['line', outline]].forEach(([name, path]) => {
        const line = document.createElementNS(svgNS, 'path');

        line.setAttribute('class', name);
        line.setAttribute('d', path);
        shape.appendChild(line);
    });

    // the logo of the extension, the same file as the toolbar icon
    logo.src = chrome.runtime.getURL('imgs/icon128.png');
    logo.alt = '';
    logo.draggable = false;

    button.type = 'button';
    button.title = 'Scientific Calculator (drag to move)';
    button.setAttribute('aria-label', 'Open Scientific Calculator');

    button.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;

        const box = host.getBoundingClientRect();

        dragged = false;
        // the point of the button that is held stays under the pointer
        drag = {
            holdX: event.clientX - box.left,
            holdY: event.clientY - box.top,
            width: box.width,
            height: box.height,
            startX: event.clientX,
            startY: event.clientY,
            moving: false
        };
        button.setPointerCapture(event.pointerId);
    });

    button.addEventListener('pointermove', (event) => {
        if (!drag) return;
        // a hand is never fully still: a few pixels are still a click
        if (!drag.moving && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;

        drag.moving = true;
        button.className = place.side + ' moving';
        show(Math.max(0, Math.min(window.innerWidth - drag.width, event.clientX - drag.holdX)) + 'px',
            Math.max(0, Math.min(window.innerHeight - drag.height, event.clientY - drag.holdY)) + 'px', true);
    });

    // the button is dropped: it goes to the nearest side and stays there
    button.addEventListener('pointerup', () => {
        if (drag?.moving) {
            const box = host.getBoundingClientRect();
            const x = box.left + box.width / 2;
            const y = box.top + box.height / 2;
            const distance = { left: x, right: window.innerWidth - x, top: y, bottom: window.innerHeight - y };
            const side = sides.reduce((nearest, next) => (distance[next] < distance[nearest] ? next : nearest));
            const along = side === 'left' || side === 'right' ? y / window.innerHeight : x / window.innerWidth;

            place = { side: side, at: Math.round(along * 1000) / 10 };
            dragged = true;
            try {
                chrome.storage.local.set({ pageIconPlace: place });
            } catch (error) {
                // the place is not saved; the button still moves on this page
            }
        }
        drag = null;
        attach();
    });

    button.addEventListener('pointercancel', () => {
        drag = null;
        attach();
    });

    button.addEventListener('click', () => {
        if (dragged) {
            dragged = false;
            return;
        }
        try {
            chrome.runtime.sendMessage({ command: 'open-calculator' });
        } catch (error) {
            // the extension was updated or turned off after this page was opened
            host.remove();
        }
    });

    // the option was turned off: open pages lose the button right away
    chrome.runtime.onMessage.addListener((message) => {
        if (message?.command === 'remove-page-icon') {
            host.remove();
        }
    });

    // the button was moved on another page: it moves here as well
    chrome.storage?.onChanged.addListener((changes) => {
        if (changes.pageIconPlace && !drag) {
            usePlace(changes.pageIconPlace.newValue);
        }
    });

    button.append(shape, logo);
    root.appendChild(button);

    // the button appears at its saved place, not at the first place and then the saved one
    const start = (items) => {
        usePlace(items?.pageIconPlace);
        document.documentElement.appendChild(host);
    };

    if (chrome.storage) {
        chrome.storage.local.get('pageIconPlace', start);
    } else {
        start();
    }
})();
