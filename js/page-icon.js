// The button on every page. Pages only get this script after the option was
// turned on, on the options page. It adds the button and reads nothing from the page.
(() => {
    const id = 'scientific-calculator-page-icon';
    const logoSize = 30;
    // The tab that holds the logo, in pixels: its width and height on the left and
    // right sides, and on the top and bottom, and the round of its outer corners. The
    // logo has the same room towards the page and along the side, and less towards
    // the side of the window: edge is how far its box is from that side. The logo
    // has a little clear space at its left and right, so the sides need less
    const size = {
        upright: { width: 36, height: 42, edge: 2.5 },
        flat: { width: 37, height: 40, edge: 4 },
        round: 10
    };
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
        const upright = place.side === 'left' || place.side === 'right';
        const box = upright ? size.upright : size.flat;
        const length = upright ? box.height : box.width; // along the side
        const depth = upright ? box.width : box.height; // out of it
        const along = `clamp(${gap}px, calc(${place.at}% - ${length / 2}px), calc(100% - ${length + gap}px))`;
        const farSide = `calc(100% - ${depth}px)`;

        if (upright) {
            show(place.side === 'left' ? '0px' : farSide, along);
        } else {
            show(along, place.side === 'top' ? '0px' : farSide);
        }
        button.className = place.side;
        drawShape();
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
        /* the tab is attached to the side of the window */
        button {
            all: initial;
            position: relative;
            display: block;
            width: ${size.upright.width}px;
            height: ${size.upright.height}px;
            cursor: pointer;
            touch-action: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        .top,
        .bottom {
            width: ${size.flat.width}px;
            height: ${size.flat.height}px;
        }

        svg {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
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
            filter: drop-shadow(0.5px 0 0 var(--ring)) drop-shadow(-0.5px 0 0 var(--ring)) drop-shadow(0 0.5px 0 var(--ring)) drop-shadow(0 -0.5px 0 var(--ring))
                drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45));
        }

        /* the grey around the calculator in the popup, a little lighter */
        button {
            --ring: #555555;
        }

        .fill {
            fill: #cfcfcf;
            transition: fill 0.2s;
        }

        .line {
            fill: none;
            stroke: #b0b0b0;
            stroke-width: 1;
        }

        button:hover .fill {
            fill: #dadada;
        }

        /* darker when the browser is in its dark theme, as the popup, and darker still */
        @media (prefers-color-scheme: dark) {
            button {
                --ring: #9a9a9a;
            }

            .fill {
                fill: #232323;
            }

            .line {
                stroke: #383838;
            }

            button:hover .fill {
                fill: #2e2e2e;
            }
        }

        .moving {
            cursor: grabbing;
        }

        /* the logo in the tab, near the side of the window, with a thin line round
           its shape that sets it apart from the grey */
        img {
            position: absolute;
            filter: drop-shadow(0.5px 0 0 var(--ring)) drop-shadow(-0.5px 0 0 var(--ring)) drop-shadow(0 0.5px 0 var(--ring)) drop-shadow(0 -0.5px 0 var(--ring));
            width: ${logoSize}px;
            height: ${logoSize}px;
            pointer-events: none;
        }

        .left img {
            left: ${size.upright.edge}px;
            top: ${(size.upright.height - logoSize) / 2}px;
        }

        .right img {
            right: ${size.upright.edge}px;
            top: ${(size.upright.height - logoSize) / 2}px;
        }

        .top img {
            top: ${size.flat.edge}px;
            left: ${(size.flat.width - logoSize) / 2}px;
        }

        .bottom img {
            bottom: ${size.flat.edge}px;
            left: ${(size.flat.width - logoSize) / 2}px;
        }

        /* the whole tab grows a tiny bit, out from the side of the window it is on */
        button {
            transition: transform 0.25s ease-out;
        }

        .left {
            transform-origin: left center;
        }

        .right {
            transform-origin: right center;
        }

        .top {
            transform-origin: center top;
        }

        .bottom {
            transform-origin: center bottom;
        }

        button:hover:not(.moving) {
            transform: scale(1.04);
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

    // The tab: straight out of the side of the window and round at the two corners
    // towards the page, and the line around it, but not along the side
    const r = size.round;
    const outlines = {
        bottom: (w, h) => `M0 ${h} L0 ${r} A${r} ${r} 0 0 1 ${r} 0 L${w - r} 0 A${r} ${r} 0 0 1 ${w} ${r} L${w} ${h}`,
        top: (w, h) => `M0 0 L0 ${h - r} A${r} ${r} 0 0 0 ${r} ${h} L${w - r} ${h} A${r} ${r} 0 0 0 ${w} ${h - r} L${w} 0`,
        left: (w, h) => `M0 0 L${w - r} 0 A${r} ${r} 0 0 1 ${w} ${r} L${w} ${h - r} A${r} ${r} 0 0 1 ${w - r} ${h} L0 ${h}`,
        right: (w, h) => `M${w} 0 L${r} 0 A${r} ${r} 0 0 0 0 ${r} L0 ${h - r} A${r} ${r} 0 0 0 ${r} ${h} L${w} ${h}`
    };
    const fill = document.createElementNS(svgNS, 'path');
    const line = document.createElementNS(svgNS, 'path');

    function drawShape() {
        const { width, height } = place.side === 'left' || place.side === 'right' ? size.upright : size.flat;
        const outline = outlines[place.side](width, height);

        shape.setAttribute('viewBox', `0 0 ${width} ${height}`);
        fill.setAttribute('d', outline + ' Z');
        line.setAttribute('d', outline);
    }

    fill.setAttribute('class', 'fill');
    line.setAttribute('class', 'line');
    shape.append(fill, line);

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
