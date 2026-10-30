// The icons before the names of the cards: a drawing of what each works with, a ruler for a length, a resistor for
// Ohm's law, in a box of 16 × 16 in lines of the colour of the text. shapes: the drawings, by name; cards: the
// drawing of each card, by its panel and its id, or of a formula or a constant by its name. A formula of a card of
// a panel has that card's; a card with none, where no drawing would say what it is, has no icon
(function (root) {
    'use strict';

    var shapes = {
        ruler: '<rect x="1.5" y="5" width="13" height="6" rx="1"/><path d="M4.5 5v2.5M7.5 5v3.5M10.5 5v2.5"/>',
        area: '<rect x="2" y="2" width="12" height="12" rx="1"/><path d="M2 8l6-6M2 14L14 2M8 14l6-6"/>',
        cube: '<path d="M8 1.5l6 3.25v6.5L8 14.5l-6-3.25v-6.5z M2 4.75l6 3.25 6-3.25M8 8v6.5"/>',
        weight: '<circle cx="8" cy="3.5" r="2"/><path d="M3.5 6h9l2 8h-13z"/>',
        thermometer: '<path d="M6 9.5V3a2 2 0 0 1 4 0v6.5a3.5 3.5 0 1 1-4 0z"/><path d="M8 6v5"/>',
        gauge: '<path d="M2.5 12.5a6 6 0 1 1 11 0"/><path d="M8 10.5l3-4"/>',
        clock: '<circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.5 1.5"/>',
        data: '<ellipse cx="8" cy="3.5" rx="5.5" ry="2"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9' +
            'M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/>',
        press: '<path d="M2 13.5h12M5 2v7M3 7l2 2 2-2M11 2v7M9 7l2 2 2-2"/>',
        bolt: '<path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z"/>',
        power: '<path d="M8 1.5v6"/><path d="M4.5 4a5.5 5.5 0 1 0 7 0"/>',
        angle: '<path d="M2 13.5h12M2 13.5L11 3"/><path d="M7 13.5A5 5 0 0 0 5.25 9.7"/>',
        pump: '<path d="M3 14V3a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v11M2 14h9M3 7h7M10 6l2.5 2v4a1 1 0 0 0 2 0V5.5l-2-2"/>',
        push: '<rect x="9" y="5" width="5.5" height="6" rx=".5"/><path d="M1.5 8h6M5 5.5L7.5 8 5 10.5"/>',
        turn: '<circle cx="8" cy="8" r="1.2"/><path d="M14 8a6 6 0 1 1-1.76-4.24"/><path d="M12.6 1.2l-.4 2.6-2.6-.4"/>',
        dense: '<rect x="2" y="2" width="12" height="12" rx="1"/><path stroke-width="2.2" d="M5 5h0M8 5h0M11 5h0M5 8h0M8 8h0M11 8h0' +
            'M5 11h0M8 11h0M11 11h0"/>',
        sine: '<path d="M1 8Q2.75 1 4.5 8T8 8T11.5 8T15 8"/>',
        faster: '<path d="M3 3l5 5-5 5M8.5 3l5 5-5 5"/>',
        tap: '<path d="M1.5 4h7.5a3 3 0 0 1 3 3v1.5M1.5 2v4"/><path d="' +
            'M12 11c-.8 1.2-1.2 2-1.2 2.5a1.2 1.2 0 0 0 2.4 0c0-.5-.4-1.3-1.2-2.5z"/>',
        ammeter: '<circle cx="8" cy="8" r="6.5"/><path d="M5.5 11l2.5-6 2.5 6M6.5 9h3"/>',
        voltmeter: '<circle cx="8" cy="8" r="6.5"/><path d="M5.5 5l2.5 6 2.5-6"/>',
        charges: '<circle cx="3.7" cy="8" r="3"/><circle cx="12.3" cy="8" r="3"/><path d="M2.2 8h3M3.7 6.5v3M10.8 8h3"/>',
        coulomb: '<circle cx="3.2" cy="8" r="2.7"/><circle cx="12.8" cy="8" r="2.7"/><path d="M1.9 8h2.6M3.2 6.7v2.6M11.5 8h2.6"/>' +
            '<path stroke-dasharray="0.8 1.4" d="M6.9 8h2.2"/>',
        ion: '<circle cx="6.8" cy="9.3" r="5.5"/><circle cx="6.8" cy="9.3" r="1.5" fill="currentColor" stroke="none"/><path d="' +
            'M13 1v4M11 3h4"/>',
        resistor: '<path d="M1 8h2.5l1-3 2 6 2-6 2 6 1-3H15"/>',
        capacitor: '<path d="M1 8h5M10 8h5M6 3v10M10 3v10"/>',
        coil: '<path d="M1 10h1a2 2.5 0 0 1 4 0a2 2.5 0 0 1 4 0a2 2.5 0 0 1 4 0h1"/>',
        magnet: '<path d="M2.5 2v6.5a5.5 5.5 0 0 0 11 0V2H10v6.5a2 2 0 0 1-4 0V2z"/><path d="M2.5 5H6M10 5h3.5"/>',
        momentum: '<circle cx="11" cy="8" r="3.5"/><path d="M1.5 5.5h4M1 8h5M1.5 10.5h4"/>',
        trefoil: '<circle cx="8" cy="8" r="1.3"/><path fill="currentColor" stroke="none" d="M9.3 5.75L11.25 2.37A6.5 6.5 0 0 1 14.5 8' +
            'L10.6 8A2.6 2.6 0 0 0 9.3 5.75zM9.3 10.25L11.25 13.63A6.5 6.5 0 0 1 4.75 13.63L6.7 10.25A2.6 2.6 0 0 0 9.3 10.25zM5.4 8' +
            'L1.5 8A6.5 6.5 0 0 1 4.75 2.37L6.7 5.75A2.6 2.6 0 0 0 5.4 8z"/>',
        rays: '<rect x="8.5" y="2.5" width="6" height="11" rx="1"/><path d="M1.5 4l4 2.5M1.5 8h5M1.5 12l4-2.5"/>',
        person: '<circle cx="8" cy="4.5" r="2.5"/><path d="M3 14.5a5 5 0 0 1 10 0"/>',
        flask: '<path d="M5.5 1.5h5M6.5 1.5v4.5L2.5 13a1 1 0 0 0 .9 1.5h9.2a1 1 0 0 0 .9-1.5L9.5 6V1.5M4.2 10h7.6"/>',
        beaker: '<path d="M2.5 2h11M3.5 2v11a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V2M3.5 8h9"/>',
        pile: '<circle cx="3.6" cy="12.4" r="2.1"/><circle cx="8" cy="12.4" r="2.1"/><circle cx="12.4" cy="12.4" r="2.1"/>' +
            '<circle cx="5.8" cy="8.4" r="2.1"/><circle cx="10.2" cy="8.4" r="2.1"/><circle cx="8" cy="4.4" r="2.1"/>',
        molecule: '<circle cx="4" cy="11.5" r="2.3"/><circle cx="12" cy="11.5" r="2.3"/><circle cx="8" cy="4.5" r="2.3"/><path d="' +
            'M5.1 9.5l1.8-3M10.9 9.5l-1.8-3"/>',
        helix: '<path d="M4 1.5C4 6 12 10 12 14.5M12 1.5C12 6 4 10 4 14.5M5 4h6M5 12h6"/>',
        enzyme: '<path d="M13 4.5A6 6 0 1 0 13 11.5L8 8z"/><circle cx="13.5" cy="8" r="1.3"/>',
        grid: '<rect x="2" y="2" width="12" height="12" rx="1"/><path d="M2 6h12M2 10h12M6 2v12M10 2v12"/>',
        span: '<rect x="1.5" y="3" width="13" height="11.5" rx="1.5"/><path d="M1.5 6.5h13M5 1.5v3M11 1.5v3"/><path d="M4.5 10.5h7' +
            'M6 9l-1.5 1.5L6 12M10 9l1.5 1.5L10 12"/>',
        dateadd: '<rect x="1.5" y="3" width="13" height="11.5" rx="1.5"/><path d="M1.5 6.5h13M5 1.5v3M11 1.5v3"/><path d="M8 8.5v4' +
            'M6 10.5h4"/>',
        globe: '<circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c-2.2 2-2.2 11 0 13M8 1.5c2.2 2 2.2 11 0 13"/>',
        prompt: '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M4.5 6l2 2-2 2M8 10.5h3.5"/>',
        equation: '<path d="M2 5l5 6M7 5l-5 6M9.5 6.5h5M9.5 9.5h5"/>',
        inequality: '<path d="M2 5l5 6M7 5l-5 6M14 3.5L9.5 7l4.5 3.5M9.5 12.5h4.5"/>',
        extrema: '<path d="M1.5 12Q4.75 -1 8 8T14.5 4"/><circle cx="5.34" cy="4.32" r="1.3" fill="currentColor" stroke="none"/>' +
            '<circle cx="10.65" cy="11.68" r="1.3" fill="currentColor" stroke="none"/>',
        parabola: '<path d="M2 2.5Q8 20 14 2.5"/>',
        cubic: '<path d="M1.5 14C5 -4 11 20 14.5 2"/>',
        quartic: '<path d="M1.5 3C2.5 14 6 14 8 7C10 14 13.5 14 14.5 3"/>',
        roots: '<path d="M1 9h14"/><path d="M1.5 14C3 1 6 1 7.5 9S12 15 14.5 2"/>',
        lines2: '<path d="M1.5 13L14.5 3M1.5 4l13 8"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/>',
        lines3: '<path d="M1.5 13L14.5 3M1.5 4l13 8M8 1.5v13"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/>',
        meet: '<path d="M2 2Q8 22 14 2"/><path d="M1.5 6.5h13"/>',
        integral: '<path d="M10.5 2.5C9.5 1 7.5 1.5 7.5 4v8c0 2.5-2 3-3 1.5"/>',
        tangent: '<path d="M1.5 14.5Q8 2 14.5 14.5"/><path d="M6.28 5.58L14.68 12.69"/>' +
            '<circle cx="10.86" cy="9.46" r="1.3" fill="currentColor" stroke="none"/>',
        sigma: '<path d="M12 3H4l4.5 5L4 13h8"/>',
        pi: '<path d="M3 3h10M5 3v10.5M11 3v10.5"/>',
        limit: '<path d="M1.5 8h9M8 5l3 3-3 3M13.5 2v12"/>',
        between: '<path d="M1.5 4Q8 0 14.5 4M1.5 12Q8 16 14.5 12M4.5 3v9.5M8 2v12M11.5 3v9.5"/>',
        arc: '<path d="M2 12Q8 0 14 12"/><circle cx="2" cy="12" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="14" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
        field: '<path d="M2 4l2-2M7 3.5l2-1M12 3h2M2 9l2-2M7 8.5l2-1M12 8h2M2 14l2-2M7 13.5l2-1M12 13h2"/>',
        triangle: '<path d="M8 2L14.5 13.5h-13z"/>',
        shapes: '<rect x="1.5" y="6" width="7" height="7" rx=".5"/><circle cx="11" cy="5.5" r="3.5"/>',
        cone: '<ellipse cx="8" cy="12.5" rx="5.5" ry="2"/><path d="M2.5 12.5L8 1.5l5.5 11"/>',
        points: '<circle cx="3.5" cy="12.5" r="1.5"/><circle cx="12.5" cy="3.5" r="1.5"/><path d="M4.6 11.4l6.8-6.8"/>',
        circle3: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="2" r="1.6" fill="currentColor" stroke="none"/>' +
            '<circle cx="2.8" cy="11" r="1.6" fill="currentColor" stroke="none"/>' +
            '<circle cx="13.2" cy="11" r="1.6" fill="currentColor" stroke="none"/>',
        polygon: '<path d="M3 4l6-2.5 5.5 5-3 7H3.5L1.5 9z"/>',
        bell: '<path d="M1 13.5h14"/><path d="M1.5 12.7L2 12.5L2.5 12.2L3 11.8L3.5 11.2L4 10.4L4.5 9.4L5 8.2L5.5 6.9L6 5.6L6.5 4.4' +
            'L7 3.4L7.5 2.7L8 2.5L8.5 2.7L9 3.4L9.5 4.4L10 5.6L10.5 6.9L11 8.2L11.5 9.4L12 10.4L12.5 11.2L13 11.8L13.5 12.2L14 12.5' +
            'L14.5 12.7"/>',
        bellmid: '<path d="M1 13.5h14"/><path d="M1.5 12.7L2 12.5L2.5 12.2L3 11.8L3.5 11.2L4 10.4L4.5 9.4L5 8.2L5.5 6.9L6 5.6L6.5 4.4' +
            'L7 3.4L7.5 2.7L8 2.5L8.5 2.7L9 3.4L9.5 4.4L10 5.6L10.5 6.9L11 8.2L11.5 9.4L12 10.4L12.5 11.2L13 11.8L13.5 12.2L14 12.5' +
            'L14.5 12.7"/><path fill="currentColor" fill-opacity=".35" stroke="none" d="M5.6 13.5L5.6 6.6L6 5.6L6.4 4.6L6.8 3.7' +
            'L7.2 3.1L7.6 2.6L8 2.5L8.4 2.6L8.8 3.1L9.2 3.7L9.6 4.6L10 5.6L10.4 6.6L10.4 13.5z"/>',
        bellat: '<path d="M1 13.5h14"/><path d="M1.5 12.7L2 12.5L2.5 12.2L3 11.8L3.5 11.2L4 10.4L4.5 9.4L5 8.2L5.5 6.9L6 5.6L6.5 4.4' +
            'L7 3.4L7.5 2.7L8 2.5L8.5 2.7L9 3.4L9.5 4.4L10 5.6L10.5 6.9L11 8.2L11.5 9.4L12 10.4L12.5 11.2L13 11.8L13.5 12.2L14 12.5' +
            'L14.5 12.7"/><path d="M10.5 13.5V6.9"/><circle cx="10.5" cy="6.9" r="1.2" fill="currentColor" stroke="none"/>',
        belltail: '<path d="M1 13.5h14"/><path d="M1.5 12.7L2 12.5L2.5 12.2L3 11.8L3.5 11.2L4 10.4L4.5 9.4L5 8.2L5.5 6.9L6 5.6' +
            'L6.5 4.4L7 3.4L7.5 2.7L8 2.5L8.5 2.7L9 3.4L9.5 4.4L10 5.6L10.5 6.9L11 8.2L11.5 9.4L12 10.4L12.5 11.2L13 11.8L13.5 12.2' +
            'L14 12.5L14.5 12.7"/><path fill="currentColor" fill-opacity=".35" stroke="none" d="M1.5 13.5L1.5 12.7L1.9 12.6L2.3 12.4' +
            'L2.6 12.1L3 11.8L3.4 11.4L3.8 10.8L4.1 10.1L4.5 9.4L4.9 8.5L5.3 7.6L5.6 6.6L6 5.6L6 13.5z"/>',
        belltails: '<path d="M1 13.5h14"/><path d="M1.5 12.7L2 12.5L2.5 12.2L3 11.8L3.5 11.2L4 10.4L4.5 9.4L5 8.2L5.5 6.9L6 5.6' +
            'L6.5 4.4L7 3.4L7.5 2.7L8 2.5L8.5 2.7L9 3.4L9.5 4.4L10 5.6L10.5 6.9L11 8.2L11.5 9.4L12 10.4L12.5 11.2L13 11.8L13.5 12.2' +
            'L14 12.5L14.5 12.7"/><path fill="currentColor" fill-opacity=".35" stroke="none" d="M1.5 13.5L1.5 12.7L1.8 12.6L2 12.5' +
            'L2.3 12.4L2.6 12.2L2.9 11.9L3.1 11.6L3.4 11.3L3.7 10.9L4 10.4L4.3 9.9L4.5 9.3L4.8 8.7L4.8 13.5z"/>' +
            '<path fill="currentColor" fill-opacity=".35" stroke="none" d="M11.2 13.5L11.2 8.7L11.5 9.3L11.8 9.9L12 10.4L12.3 10.9' +
            'L12.6 11.3L12.8 11.6L13.1 11.9L13.4 12.2L13.7 12.4L13.9 12.5L14.2 12.6L14.5 12.7L14.5 13.5z"/>',
        bell2: '<path d="M1 13.5h14"/><path d="M1 12.7L1.6 12.3L2.2 11.7L2.8 10.7L3.4 9.3L4 7.5L4.6 5.8L5.2 4.3L5.8 3.6L6.4 3.7L7 4.7' +
            'L7.6 6.3L8.2 8.1L8.8 9.8L9.4 11.1L10 12L10.6 12.5L11.2 12.8L11.8 12.9L12.4 13L13 13"/><path d="M3 13L3.6 13L4.2 12.9' +
            'L4.8 12.8L5.4 12.5L6 12L6.6 11.1L7.2 9.8L7.8 8.1L8.4 6.3L9 4.7L9.6 3.7L10.2 3.6L10.8 4.3L11.4 5.8L12 7.5L12.6 9.3' +
            'L13.2 10.7L13.8 11.7L14.4 12.3L15 12.7"/>',
        student: '<path d="M1 13.5h14"/><path d="M1 12.8L1.5 12.7L2.1 12.6L2.6 12.5L3.2 12.3L3.7 12L4.2 11.6L4.8 11L5.3 10.2L5.8 9' +
            'L6.4 7.4L6.9 5.6L7.5 4.1L8 3.5L8.5 4.1L9.1 5.6L9.6 7.4L10.2 9L10.7 10.2L11.2 11L11.8 11.6L12.3 12L12.8 12.3L13.4 12.5' +
            'L13.9 12.6L14.5 12.7L15 12.8"/>',
        chi: '<path d="M1 13.5h14"/><path d="M1.5 13L2 8.6L2.6 5.6L3.1 3.9L3.7 2.9L4.2 2.5L4.8 2.6L5.3 2.9L5.8 3.4L6.4 4.1L6.9 4.8' +
            'L7.5 5.5L8 6.2L8.5 6.9L9.1 7.6L9.6 8.2L10.2 8.7L10.7 9.2L11.3 9.7L11.8 10.1L12.3 10.5L12.9 10.8L13.4 11.1L14 11.4' +
            'L14.5 11.6"/>',
        fdist: '<path d="M1 13.5h14"/><path d="M1.5 13L2 3.8L2.6 2.5L3.1 3.2L3.7 4.5L4.2 6L4.8 7.4L5.3 8.6L5.8 9.6L6.4 10.4L6.9 11' +
            'L7.5 11.5L8 11.9L8.5 12.2L9.1 12.4L9.6 12.5L10.2 12.7L10.7 12.8L11.3 12.8L11.8 12.9L12.3 12.9L12.9 12.9L13.4 12.9L14 13' +
            'L14.5 13"/>',
        binomial: '<path d="M1.5 13.5h13"/><path stroke-width="1.8" d="M3 13.5V11M5.5 13.5V7.5M8 13.5V4M10.5 13.5V7.5M13 13.5V11"/>',
        poisson: '<path d="M1.5 13.5h13"/><path stroke-width="1.8" d="M3 13.5V7.5M5.5 13.5V3.5M8 13.5V6.5M10.5 13.5V9.5M13 13.5V12"/>',
        geometric: '<path d="M1.5 13.5h13"/><path stroke-width="1.8" d="M3 13.5V3M5.5 13.5V6M8 13.5V8.5M10.5 13.5V10.5M13 13.5V12"/>',
        urn: '<path d="M4 2.5h8M5 2.5v2L3 7v6a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V7l-2-2.5v-2"/>' +
            '<circle cx="6" cy="11.5" r="1.3"/><circle cx="10" cy="11.5" r="1.3"/>' +
            '<circle cx="8" cy="8.5" r="1.3" fill="currentColor" stroke="none"/>',
        decay: '<path d="M1.5 1.5v13h13"/><path d="M3 2.5C4.5 10 8 12 14 12.3"/>',
        uniform: '<path d="M1.5 13.5h13M4 13.5V5h8v8.5"/>',
        interval: '<path d="M2 8h12M2 5v6M14 5v6"/><circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none"/>',
        pie: '<circle cx="8" cy="8" r="6.5"/><path d="M8 1.5V8l5.6 3.3"/>',
        pies: '<circle cx="4.5" cy="8" r="3.3"/><circle cx="11.5" cy="8" r="3.3"/><path d="M4.5 4.7V8h3.3M11.5 4.7V8l-2.3 2.3"/>',
        dice: '<rect x="2" y="2" width="12" height="12" rx="2.5"/><circle cx="5" cy="5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="11" cy="5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="5" cy="11" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="11" cy="11" r="1.1" fill="currentColor" stroke="none"/>',
        pairs: '<path d="M3 4l10 3M3 8.5l10-2.5M3 12.5l10-1.5"/><circle cx="3" cy="4" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="13" cy="7" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="3" cy="8.5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="13" cy="6" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="3" cy="12.5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="13" cy="11" r="1.1" fill="currentColor" stroke="none"/>',
        fit: '<path d="M1.5 13.5h13"/><path stroke-width="1.8" d="M3 13.5V8.5M5.5 13.5V5M8 13.5V7M10.5 13.5V10M13 13.5V11.5"/>' +
            '<circle cx="3" cy="6.5" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="5.5" cy="3" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="8" cy="5" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="10.5" cy="8" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="13" cy="10" r="1" fill="currentColor" stroke="none"/>',
        table: '<rect x="1.5" y="2.5" width="13" height="11" rx="1"/><path d="M1.5 6h13M1.5 9.75h13M6 2.5v11M10.25 2.5v11"/>',
        boxes: '<rect x="2" y="5" width="3" height="5" rx=".3"/><rect x="6.5" y="3" width="3" height="5" rx=".3"/>' +
            '<rect x="11" y="7" width="3" height="5" rx=".3"/><path d="M3.5 3v2M3.5 10v2.5M8 1.5V3M8 8v2.5M12.5 5.5V7M12.5 12v2"/>',
        scatter: '<path d="M2 13.5L14 2.5"/><circle cx="3" cy="10.5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="5.5" cy="10" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="6.5" cy="6.5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="9.5" cy="7" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="11" cy="4" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="13" cy="5" r="1.1" fill="currentColor" stroke="none"/>',
        bank: '<path d="M1.5 6L8 2l6.5 4M2.5 6h11M3.5 6v6M6.5 6v6M9.5 6v6M12.5 6v6M1.5 13.5h13"/>',
        house: '<path d="M2 7.5L8 2.5l6 5M3.5 6.5v7.5h9V6.5M6.5 14v-4h3v4"/>',
        card: '<rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M1.5 6.5h13M4 10h3"/>',
        coins: '<ellipse cx="6" cy="4.5" rx="4.5" ry="1.8"/><path d="M1.5 4.5v8c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8v-8' +
            'M1.5 8.5c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8"/><path d="M13.5 13.5L13.5 3M14.78 4.79L13.5 3L12.22 4.79"/>',
        sunset: '<path d="M1.5 12h13M4 12a4 4 0 0 1 8 0M8 3v2M3 6l1.4 1.4M13 6l-1.4 1.4M5 14.5h6"/>',
        briefcase: '<rect x="1.5" y="5" width="13" height="9" rx="1.5"/><path d="M5.5 5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V5' +
            'M1.5 9h13"/>',
        percent: '<path d="M3 13L13 3"/><circle cx="4.5" cy="4.5" r="2"/><circle cx="11.5" cy="11.5" r="2"/>',
        breakeven: '<path d="M1.5 1.5v13h13M3 12l11-9M3 7.5l11 3"/>' +
            '<circle cx="7.85" cy="8.6" r="1.3" fill="currentColor" stroke="none"/>',
        rising: '<path d="M1.5 1.5v13h13M4 11l3-3 2 2 4.5-5"/><path d="M13.23 7.38L13.5 5L11.16 5.52"/>',
        falling: '<path d="M1.5 1.5v13h13M4 4l3 3 2-2 4.5 5"/><path d="M11.16 9.48L13.5 10L13.23 7.62"/>',
        hourglass: '<path d="M3.5 1.5h9M3.5 14.5h9M5 1.5c0 3.5 3 4.5 3 6.5s-3 3-3 6.5M11 1.5c0 3.5-3 4.5-3 6.5s3 3 3 6.5"/>',
        flows: '<path d="M1.5 8h13"/><path stroke-width="1.8" d="M3.5 8v5M6.5 8V5M9.5 8V4M12.5 8V3"/>',
        bond: '<rect x="2.5" y="1.5" width="11" height="13" rx="1"/><path d="M5 5h6M5 8h6M5 11h3"/>' +
            '<circle cx="11" cy="11.5" r="1.4"/>',
        updown: '<path d="M5 13.5L5 2.5M6.39 4.45L5 2.5L3.61 4.45"/><path d="M11 2.5L11 13.5M9.61 11.55L11 13.5L12.39 11.55"/>',
        receipt: '<path d="M3 1.5h10v13l-1.7-1.2-1.6 1.2L8 13.3l-1.7 1.2-1.6-1.2L3 14.5zM5.5 5h5M5.5 8h5M5.5 11h2.5"/>',
        matrix: '<path d="M4 2H2.5v12H4M12 2h1.5v12H12"/><path stroke-width="2.4" d="M6 5.5h0M10 5.5h0M6 10.5h0M10 10.5h0"/>',
        stairs: '<path d="M4 2H2.5v12H4M12 2h1.5v12H12"/><path d="M5 4.5h2v3h2v3h2"/>',
        matrices: '<path d="M3 3.5H1.5v9H3M5 3.5h1.5v9H5M11 3.5H9.5v9H11M13 3.5h1.5v9H13"/><path stroke-width="2.4" d="M4 8h0' +
            'M12 8h0"/>',
        lambda: '<path d="M4 2.5c2 0 3 1 4 3.5l4 8.5M8.3 6.5L4 13.5"/>',
        lu: '<path fill="currentColor" fill-opacity=".35" stroke="none" d="M2 2.5v11h6z"/><path d="M2 2.5v11h6zM8 2.5h6v11z"/>',
        vectors: '<path d="M2 13L14 13M11.88 14.51L14 13L11.88 11.49"/><path d="M2 13L10 3M9.86 5.6L10 3L7.5 3.71"/>',
        argand: '<path d="M1.5 8h13M8 1.5v13"/><path d="M8 8l4.5-4.5"/>' +
            '<circle cx="12.5" cy="3.5" r="1.4" fill="currentColor" stroke="none"/>',
        unity: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="2" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="13.2" cy="5" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="13.2" cy="11" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="8" cy="14" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="2.8" cy="11" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="2.8" cy="5" r="1.4" fill="currentColor" stroke="none"/>',
        ac: '<circle cx="8" cy="8" r="6.5"/><path d="M4.5 8Q6.25 4.5 8 8T11.5 8"/>',
        binary: '<path d="M2.5 4.5L4.5 3v10"/><ellipse cx="10.5" cy="8" rx="3" ry="5"/>',
        bitcells: '<path d="M4 2.5l1.5-1v5M10 10.5l1.5-1v5"/><ellipse cx="11" cy="4" rx="2" ry="2.5"/>' +
            '<ellipse cx="5" cy="12" rx="2" ry="2.5"/>',
        truthtable: '<path d="M10 1v14"/><circle cx="2.5" cy="3" r="1.4"/>' +
            '<circle cx="6.5" cy="3" r="1.4" fill="currentColor" stroke="none"/><circle cx="13.5" cy="3" r="1.4"/>' +
            '<circle cx="2.5" cy="8" r="1.4" fill="currentColor" stroke="none"/><circle cx="6.5" cy="8" r="1.4"/>' +
            '<circle cx="13.5" cy="8" r="1.4"/><circle cx="2.5" cy="13" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="6.5" cy="13" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="13.5" cy="13" r="1.4" fill="currentColor" stroke="none"/>',
        float: '<rect x="1" y="5" width="14" height="6" rx=".5"/><path d="M3.5 5v6M8 5v6"/>',
        abacus: '<path d="M2 2v12M14 2v12M2 5h12M2 8h12M2 11h12"/><circle cx="4.5" cy="5" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="6.5" cy="5" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="11.5" cy="5" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="4.5" cy="8" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="9.5" cy="8" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="11.5" cy="8" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="6.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>',
        code: '<path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4"/>',
        network: '<rect x="6" y="1.5" width="4" height="3.5" rx=".5"/><rect x="1.5" y="11" width="4" height="3.5" rx=".5"/>' +
            '<rect x="10.5" y="11" width="4" height="3.5" rx=".5"/><path d="M8 5v3M3.5 8h9M3.5 8v3M12.5 8v3"/>',
        idtag: '<rect x="1" y="2.5" width="14" height="11" rx="2"/><path d="M4.5 5.5v5M7.5 5.5v5h1.2a2.6 2.5 0 0 0 0-5z"/>',
        fingerprint: '<path d="M2.5 10V7.5a5.5 5.5 0 0 1 9.4-3.9M13.4 6a5.5 5.5 0 0 1 .1 1.5v2' +
            'M5 14V7.5a3 3 0 0 1 6 0V10c0 1.6-.5 3-1.4 4M8 7.5v3.5c0 1.3-.4 2.5-1.1 3.5M13.4 12c-.2.9-.5 1.7-.9 2.4"/>',
        factors: '<path d="M8 4.5L4.5 9.5M8 4.5l3.5 5M4.5 9.5l-2 3.5M4.5 9.5l2 3.5"/>' +
            '<circle cx="8" cy="3.5" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="4.5" cy="9.5" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="11.5" cy="10" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="2.5" cy="13" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="6.5" cy="13" r="1.4" fill="currentColor" stroke="none"/>',
        venn: '<circle cx="6" cy="8" r="4.5"/><circle cx="10" cy="8" r="4.5"/>',
        dial: '<circle cx="8" cy="8" r="6.5"/><path d="M8 1.5v2M14.5 8h-2M8 14.5v-2M1.5 8h2M8 8l2.5-2.5"/>',
        half: '<circle cx="8" cy="8" r="6.5"/><path fill="currentColor" stroke="none" d="M8 1.5a6.5 6.5 0 0 1 0 13z"/>',
        approx: '<path d="M2.5 6.5c2-2 4-2 5.5 0s3.5 2 5.5 0M2.5 10.5c2-2 4-2 5.5 0s3.5 2 5.5 0"/>',
        colourbands: '<path d="' +
            'M2.5 6a2 2 0 0 1 2-2h1.2c.6 0 .8.8 1.4.8h1.8c.6 0 .8-.8 1.4-.8h1.2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1.2c-.6 0-.8-.8-1.4-.8H7.1c-.6 0-.8.8-1.4.8H4.5a2 2 0 0 1-2-2z"/>' +
            '<path d="M1 8h1.5M13.5 8H15"/><path stroke-width="1.2" d="M4.6 4.2v7.6M6.8 4.9v6.2M8.6 4.9v6.2M11.4 4.2v7.6"/>',
        smd: '<rect x="2" y="5" width="12" height="6" rx=".5"/><path d="M4.5 5v6M11.5 5v6"/>',
        parallel: '<path d="M1 8h2M13 8h2M3 4.5v7M13 4.5v7M3 4.5h2.5M10.5 4.5H13M3 11.5h2.5M10.5 11.5H13"/>' +
            '<rect x="5.5" y="3.25" width="5" height="2.5" rx=".5"/><rect x="5.5" y="10.25" width="5" height="2.5" rx=".5"/>',
        ohm: '<path d="M2.5 13.5H6V12a5 5 0 1 1 4 0v1.5h3.5"/>',
        wire: '<ellipse cx="3.5" cy="8" rx="1.5" ry="3"/><path d="M3.5 5H13M3.5 11H13M13 5a1.5 3 0 0 1 0 6"/>',
        divider: '<rect x="6" y="2.5" width="4" height="4" rx=".5"/><rect x="6" y="9.5" width="4" height="4" rx=".5"/><path d="' +
            'M8 1v1.5M8 6.5v3M8 13.5V15M8 8h5"/>',
        bridge: '<path d="M8 2l6 6-6 6-6-6zM2 8h4M10 8h4"/><circle cx="8" cy="8" r="2"/>',
        led: '<path d="M1 8h3.5M11 8H15M4.5 4L11 8l-6.5 4zM11 4v8"/><path d="M9 3.5L11.5 1M11.24 2.58L11.5 1L9.92 1.26"/><path d="' +
            'M11.5 4.5L14 2M13.74 3.58L14 2L12.42 2.26"/>',
        rc: '<path d="M1 8h1.5l.75-2 1.5 4 1.5-4 1.5 4 .75-2H10M10 4.5v7M12 4.5v7M12 8h3"/>',
        rl: '<path d="M1 8h1.5l.75-2 1.5 4 1.5-4 1.5 4 .75-2H9a1.5 2.2 0 0 1 3 0a1.5 2.2 0 0 1 3 0"/>',
        lowpass: '<path d="M1.5 1.5v13h13M3 5h5c2 0 3 5 6 7.5"/>',
        plates: '<path d="M2 3h12M2 13h12"/><path d="M4.5 5L4.5 11M3.45 9.54L4.5 11L5.55 9.54"/><path d="M8 5L8 11M6.95 9.54L8 11' +
            'L9.05 9.54"/><path d="M11.5 5L11.5 11M10.45 9.54L11.5 11L12.55 9.54"/>',
        transformer: '<path d="M3 2v1.5a2 1.5 0 0 1 0 3a2 1.5 0 0 1 0 3a2 1.5 0 0 1 0 3V14' +
            'M13 2v1.5a2 1.5 0 0 0 0 3a2 1.5 0 0 0 0 3a2 1.5 0 0 0 0 3V14M7.2 2v12M8.8 2v12"/>',
        threephase: '<circle cx="8" cy="2" r="1.5" fill="currentColor" stroke="none"/>' +
            '<circle cx="2.8" cy="11" r="1.5" fill="currentColor" stroke="none"/>' +
            '<circle cx="13.2" cy="11" r="1.5" fill="currentColor" stroke="none"/><path d="M8 8V2M8 8l-5.2 3M8 8l5.2 3"/>' +
            '<circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>',
        resonance: '<path d="M1.5 13.5h13"/><path d="M2 12.5C6 12 7.3 2 8 2s2 10 6 10.5"/>',
        plug: '<path d="M5.5 1.5v3M10.5 1.5v3M3.5 4.5h9v3a4.5 4.5 0 0 1-9 0zM8 12v2.5"/>',
        battery: '<rect x="1.5" y="4.5" width="11.5" height="7" rx="1"/><path d="M14.5 6.5v3M4 7v2M6.5 7v2"/>',
        diode: '<path d="M1 8h3.5M11 8H15M4.5 4L11 8l-6.5 4zM11 4v8"/>',
        rectified: '<path d="M1.5 12Q3.67 2 5.83 12Q8 2 10.17 12Q12.33 2 14.5 12"/>',
        transistor: '<circle cx="8.5" cy="8" r="6"/><path d="M1.5 8h5M6.5 4.5v7M6.5 6l4-3M6.5 10l4 3"/><path d="M8.7 12.9L10.5 13' +
            'L10.01 11.27"/>',
        mosfet: '<path d="M1.5 11.5h4V4.5M7.5 3.5v9M7.5 5H12V1.5M7.5 11H12v3.5"/>',
        zener: '<path d="M1 8h3.5M11 8H15M4.5 4L11 8l-6.5 4zM9.5 3l1.5 1v8l1.5 1"/>',
        regulator: '<rect x="3" y="2" width="10" height="7" rx="1"/><path d="M5 9v5.5M8 9v5.5M11 9v5.5"/>',
        chip: '<rect x="4" y="2" width="8" height="12" rx="1"/><path d="M2 4.5h2M2 8h2M2 11.5h2M12 4.5h2M12 8h2M12 11.5h2"/>',
        opamp: '<path d="M3.5 2.5v11L14 8zM1 5.5h2.5M1 10.5h2.5M5.2 5.5h1.8M6.1 4.6v1.8M5.2 10.5h1.8"/>',
        log: '<path d="M1.5 1.5v13h13"/><path d="M3 13.5C3.5 7 7 4 14 3"/>',
        car: '<path d="M1.5 11V8.5l2-3.5h7l2.5 3.5h1.5V11z"/><circle cx="4.5" cy="11.5" r="1.6"/>' +
            '<circle cx="11.5" cy="11.5" r="1.6"/>',
        projectile: '<path d="M1 14.5h14"/><path stroke-dasharray="1.6 1.8" d="M2 14Q7.5 -3 13 14"/>' +
            '<circle cx="7.5" cy="5.5" r="1.6" fill="currentColor" stroke="none"/>',
        relative: '<path d="M1.5 5L11.5 5M9.55 6.39L11.5 5L9.55 3.61"/><path d="M14.5 11L4.5 11M6.45 9.61L4.5 11L6.45 12.39"/>',
        circular: '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="13.5" cy="8" r="1.6" fill="currentColor" stroke="none"/><path d="M13.5 8L13.5 2M14.55 3.46L13.5 2' +
            'L12.45 3.46"/>',
        orbit: '<ellipse cx="8" cy="8" rx="7" ry="3.5"/><circle cx="8" cy="8" r="2.5"/>' +
            '<circle cx="13.3" cy="10.25" r="1.2" fill="currentColor" stroke="none"/>',
        rocket: '<path d="M8 1.5c2.5 2 3.5 5 3 9H5c-.5-4 .5-7 3-9zM5 10.5l-2 2.5v1.5l2.3-1M11 10.5l2 2.5v1.5l-2.3-1' +
            'M7 13.5l1 1.5 1-1.5"/><circle cx="8" cy="6" r="1.2"/>',
        pendulum: '<path d="M3 1.5h10M8 1.5l2.7 8.1"/><circle cx="11.3" cy="11.5" r="2"/>',
        centre: '<circle cx="8" cy="8" r="6"/><path fill="currentColor" stroke="none" d="M8 8V2a6 6 0 0 1 6 6z' +
            'M8 8v6a6 6 0 0 1-6-6z"/>',
        incline: '<path d="M1.5 13.5h13V5z"/><path d="M6.5 10.2L9.9 8 8 5.1 4.6 7.3z"/>',
        pulley: '<circle cx="8" cy="4" r="3"/><circle cx="8" cy="4" r="0.8" fill="currentColor" stroke="none"/><path d="M5 4v7.5' +
            'M11 4v4"/><rect x="3.5" y="11.5" width="3" height="3" rx=".4"/><rect x="9.5" y="8" width="3" height="3" rx=".4"/>',
        collision: '<circle cx="5" cy="9.5" r="3"/><circle cx="11" cy="9.5" r="3"/><path d="M8 1.5V4M5 2.5L6.2 4.2M11 2.5L9.8 4.2"/>',
        lever: '<path d="M1.5 8.5l13-3M8 7L5.5 13.5h5z"/>',
        masses: '<circle cx="4.5" cy="8" r="3"/><circle cx="12.5" cy="8" r="2"/><path stroke-dasharray="1 1.5" d="M7.5 8h3"/>',
        spring: '<path d="M8 1.5V3l4 1.25-8 2.5 8 2.5-8 2.5 4 1.25v1.5"/>',
        parachute: '<path d="M2 7.5a6 5.5 0 0 1 12 0M2 7.5l6 6.5 6-6.5M5.5 7.5L8 14M10.5 7.5L8 14"/>',
        wirefield: '<circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="4"/>' +
            '<circle cx="8" cy="8" r="6.5"/>',
        standing: '<path d="M1.5 8Q4.75 1 8 8T14.5 8M1.5 8Q4.75 15 8 8T14.5 8"/>',
        beats: '<path d="M1 8L1.3 7.6L1.6 6.7L1.9 5.7L2.2 5.4L2.5 6.2L2.8 8L3 10.4L3.3 12.5L3.6 13.5L3.9 13L4.2 11L4.5 8L4.8 5L5.1 3' +
            'L5.4 2.5L5.7 3.5L6 5.6L6.3 8L6.5 9.8L6.8 10.6L7.1 10.3L7.4 9.3L7.7 8.4L8 8L8.3 8.4L8.6 9.3L8.9 10.3L9.2 10.6L9.5 9.8' +
            'L9.8 8L10 5.6L10.3 3.5L10.6 2.5L10.9 3L11.2 5L11.5 8L11.8 11L12.1 13L12.4 13.5L12.7 12.5L13 10.4L13.3 8L13.5 6.2' +
            'L13.8 5.4L14.1 5.7L14.4 6.7L14.7 7.6L15 8"/>',
        lens: '<path d="M8 1.5c2 2 2 11 0 13-2-2-2-11 0-13zM1 4.5h7l6 3.5M1 11.5h7l6-3.5"/>',
        lensaxis: '<path d="M8 1.5c2.5 2.5 2.5 10.5 0 13-2.5-2.5-2.5-10.5 0-13zM1 8h14"/>',
        refraction: '<rect x="1" y="8" width="14" height="6.5" fill="currentColor" fill-opacity=".35" stroke="none"/><path d="M1 8h14' +
            'M3 1.5L8 8l2.2 6.5"/>',
        slits: '<path d="M5 1.5v4M5 7v2M5 10.5v4M5 2.25a4 4 0 0 1 0 8M5 5.75a4 4 0 0 1 0 8"/>',
        slit: '<path d="M5 1.5v5.5M5 9v5.5M5 5a3 3 0 0 1 0 6M5 2a6 6 0 0 1 0 12"/>',
        polariser: '<circle cx="8" cy="8" r="6.5"/><path d="M5 2.5v11M8 1.5v13M11 2.5v11"/>',
        doppler: '<circle cx="9.5" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8.5" cy="8" r="3.2"/>' +
            '<circle cx="7" cy="8" r="6"/>',
        photon: '<path d="M1 8L1.4 6.7L1.9 5.9L2.4 5.9L2.8 6.7L3.3 8L3.7 9.3L4.2 10.1L4.6 10.1L5 9.3L5.5 8L6 6.7L6.4 5.9L6.8 5.9' +
            'L7.3 6.7L7.8 8L8.2 9.3L8.7 10.1L9.1 10.1L9.6 9.3L10 8"/><path d="M10 8L14.5 8M12.55 9.39L14.5 8L12.55 6.61"/>',
        speaker: '<path d="M2 6h3l4-3.5v11L5 10H2z"/><path d="M11.5 5.5a3.5 3.5 0 0 1 0 5M13 3.5a6 6 0 0 1 0 9"/>',
        flame: '<path d="M8 1.5c.5 3 4.5 4.5 4.5 8.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5.5 2.5 1.5 3C7.5 7 7 4 8 1.5z"/>',
        melt: '<rect x="1.5" y="6.5" width="6" height="6" rx="1"/><path d="' +
            'M11.5 4c-1.3 1.9-2 3-2 3.8a2 2 0 0 0 4 0c0-.8-.7-1.9-2-3.8z"/>',
        merge: '<path d="M2 3l5 5M2 13l5-5M7 8h6.5"/><path d="M12.05 9.39L14 8L12.05 6.61"/>',
        expand: '<rect x="5" y="5" width="6" height="6" rx=".5"/><path d="M3.5 8L1 8M2.46 6.95L1 8L2.46 9.05"/><path d="M12.5 8L15 8' +
            'M13.54 9.05L15 8L13.54 6.95"/>',
        rod: '<rect x="1.5" y="7" width="13" height="4" rx=".5"/><path d="M3.5 4L12.5 4M10.87 5.16L12.5 4L10.87 2.84"/>',
        sun: '<circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4' +
            'L13 3"/>',
        cup: '<path d="M2.5 6.5h9v4a3.5 3.5 0 0 1-3.5 3.5h-2a3.5 3.5 0 0 1-3.5-3.5zM11.5 7.5h1a1.5 1.5 0 0 1 0 3h-1' +
            'M5 1.5c-.6.8.6 1.7 0 2.5M8.5 1.5c-.6.8.6 1.7 0 2.5"/>',
        drop: '<path d="M8 1.5C5 6 3.5 8.5 3.5 10.5a4.5 4.5 0 0 0 9 0C12.5 8.5 11 6 8 1.5z"/>',
        blood: '<path fill="currentColor" stroke="none" d="M8 1.5C5 6 3.5 8.5 3.5 10.5a4.5 4.5 0 0 0 9 0C12.5 8.5 11 6 8 1.5z"/>',
        gasbox: '<rect x="1.5" y="1.5" width="13" height="13" rx="1"/><circle cx="5" cy="5.5" r="1.3"/>' +
            '<circle cx="10.5" cy="7" r="1.3"/><circle cx="6.5" cy="11" r="1.3"/><path d="M7 5l1.5-.5M12.3 7.8l1-.2M8.3 11.3l1 .5"/>',
        gasmix: '<rect x="1.5" y="1.5" width="13" height="13" rx="1"/><circle cx="5" cy="5" r="1.3"/>' +
            '<circle cx="10.5" cy="10.5" r="1.3"/><circle cx="10.5" cy="4.5" r="1.3" fill="currentColor" stroke="none"/>' +
            '<circle cx="5" cy="10.5" r="1.3" fill="currentColor" stroke="none"/>' +
            '<circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none"/>',
        piston: '<path d="M3 2v12.5h10V2M3 6h10M8 6V1"/>',
        gear: '<path d="M12.9 6.5L14.7 6.8L14.7 9.2L12.9 9.5L12.5 10.4L13.6 11.9L11.9 13.6L10.4 12.5L9.5 12.9L9.2 14.7L6.8 14.7' +
            'L6.5 12.9L5.6 12.5L4.1 13.6L2.4 11.9L3.5 10.4L3.1 9.5L1.3 9.2L1.3 6.8L3.1 6.5L3.5 5.6L2.4 4.1L4.1 2.4L5.6 3.5L6.5 3.1' +
            'L6.8 1.3L9.2 1.3L9.5 3.1L10.4 3.5L11.9 2.4L13.6 4.1L12.5 5.6z"/><circle cx="8" cy="8" r="2"/>',
        specimen: '<path d="M1.5 5h3v2h7V5h3v6h-3V9h-7v2h-3z"/>',
        depth: '<path d="M1 3q1.75-1.5 3.5 0t3.5 0 3.5 0 3.5 0"/><path d="M8 6L8 14M6.61 12.05L8 14L9.39 12.05"/>',
        buoy: '<path d="M1 9q1.75-1.5 3.5 0t3.5 0 3.5 0 3.5 0"/><rect x="5" y="5.5" width="6" height="6.5" rx=".5"/>',
        pipe: '<path d="M1.5 4.5h13M1.5 11.5h13"/><path d="M3.5 8L11.5 8M9.55 9.39L11.5 8L9.55 6.61"/>',
        turbulent: '<path d="M1.5 5h5q1.25-1.5 2.5 0t2.5 0 2.5 0M1.5 8h5q1.25 1.5 2.5 0t2.5 0 2.5 0' +
            'M1.5 11h5q1.25-1.5 2.5 0t2.5 0 2.5 0"/>',
        sinking: '<circle cx="8" cy="6" r="3"/><path d="M8 10L8 14.5M6.84 12.87L8 14.5L9.16 12.87"/><path d="M8 1v1.5"/>',
        split: '<circle cx="4" cy="8" r="2.8"/><circle cx="13" cy="4.5" r="1.8"/><circle cx="13" cy="11.5" r="1.8"/><path d="M7.5 8' +
            'L10.5 8M9.04 9.05L10.5 8L9.04 6.95"/>',
        nucleus: '<circle cx="6" cy="6" r="2.3"/><circle cx="10" cy="6" r="2.3"/><circle cx="6" cy="10" r="2.3"/>' +
            '<circle cx="10" cy="10" r="2.3"/><circle cx="6" cy="6" r="2.3" fill="currentColor" stroke="none"/>' +
            '<circle cx="10" cy="10" r="2.3" fill="currentColor" stroke="none"/>',
        photoelectric: '<rect x="12" y="2" width="2" height="12" fill="currentColor" stroke="none"/><path d="M1 5L1.4 3.9L1.8 3.4' +
            'L2.1 3.9L2.5 5L2.9 6.1L3.3 6.6L3.6 6.1L4 5L4.4 3.9L4.8 3.4L5.1 3.9L5.5 5L5.9 6.1L6.3 6.6L6.6 6.1L7 5"/><path d="M7 5' +
            'L10.5 5M8.87 6.16L10.5 5L8.87 3.84"/><path d="M10.5 11L4.5 11M6.13 9.84L4.5 11L6.13 12.16"/>' +
            '<circle cx="3" cy="11" r="1.3" fill="currentColor" stroke="none"/>',
        packet: '<path d="M1 8L1.3 8L1.5 8L1.8 8L2 8L2.3 7.9L2.5 7.9L2.8 7.9L3 7.9L3.3 8.1L3.5 8.4L3.8 8.6L4 8.7L4.3 8.5L4.5 8' +
            'L4.8 7.2L5 6.3L5.3 5.7L5.5 5.9L5.8 7L6 8.8L6.3 10.9L6.5 12.4L6.8 12.6L7 11.3L7.3 8.6L7.5 5.5L7.8 3L8 2L8.3 3L8.5 5.5' +
            'L8.8 8.6L9 11.3L9.3 12.6L9.5 12.4L9.8 10.9L10 8.8L10.3 7L10.5 5.9L10.8 5.7L11 6.3L11.3 7.2L11.5 8L11.8 8.5L12 8.7' +
            'L12.3 8.6L12.5 8.4L12.8 8.1L13 7.9L13.3 7.9L13.5 7.9L13.8 7.9L14 8L14.3 8L14.5 8L14.8 8L15 8"/>',
        inbox: '<path d="M2 2.5v11.5h12V2.5"/><path d="M2 10Q5 2 8 10T14 10"/>',
        tunnel: '<rect x="7" y="2" width="2.5" height="12" fill="currentColor" fill-opacity=".35" stroke="none"/><path d="M1 8' +
            'L1.4 5.8L1.8 4.3L2.1 4.1L2.5 5.2L2.9 7.2L3.3 9.5L3.6 11.3L4 12L4.4 11.3L4.8 9.5L5.1 7.2L5.5 5.2L5.9 4.1L6.3 4.3L6.6 5.8' +
            'L7 8"/><path d="M9.5 8L9.9 7.1L10.3 6.6L10.7 6.6L11.1 7.1L11.5 8L11.9 8.9L12.3 9.4L12.6 9.4L13 8.9L13.4 8L13.8 7.1' +
            'L14.2 6.6L14.6 6.6L15 7.1"/>',
        bohr: '<circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="3.8"/>' +
            '<circle cx="8" cy="8" r="6.5"/><circle cx="11.8" cy="8" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="3.4" cy="3.4" r="1.1" fill="currentColor" stroke="none"/>',
        punnett: '<rect x="2" y="2" width="12" height="12" rx="1"/><path d="M8 2v12M2 8h12"/>',
        chromosome: '<path stroke-width="2.6" d="M4.5 2.5l7 11M11.5 2.5l-7 11"/>',
        hardy: '<rect x="2" y="2" width="12" height="12" rx="1"/><path d="M10 2v12M2 10h12"/>',
        chromobands: '<rect x="1.5" y="6" width="13" height="4" rx="2"/><path d="M4.5 6v4M9 6v4M12 6v4"/>',
        family: '<circle cx="4.5" cy="4" r="2"/><circle cx="11.5" cy="4" r="2"/><circle cx="8" cy="9" r="1.5"/><path d="' +
            'M1.5 12a3 3 0 0 1 6 0M8.5 12a3 3 0 0 1 6 0M5.8 14a2.2 2.2 0 0 1 4.4 0"/>',
        pedigree: '<rect x="1.5" y="2" width="4.5" height="4.5"/><circle cx="12.25" cy="4.25" r="2.25"/><path d="M6 4.25h4' +
            'M8 4.25V9.5"/><rect x="5.75" y="9.5" width="4.5" height="4.5" fill="currentColor" stroke="none"/>',
        codons: '<circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="4"/><circle cx="8" cy="8" r="1.5"/><path d="M8 1.5v2.5' +
            'M8 12v2.5M1.5 8H4M12 8h2.5M3.4 3.4l1.8 1.8M10.8 10.8l1.8 1.8M3.4 12.6l1.8-1.8M10.8 5.2l1.8-1.8"/>',
        primer: '<path d="M1.5 11h13M3 6h7"/><path d="M9.37 7.16L11 6L9.37 4.84"/><path stroke-width="1" d="M4 7.2v2.6M6.5 7.2v2.6' +
            'M9 7.2v2.6"/>',
        cuvette: '<rect x="5.5" y="2" width="5" height="12" rx=".5"/><path d="M1 9h14"/><path d="M13.21 10.28L15 9L13.21 7.72"/>',
        ligation: '<path d="M1.5 6.5h6M1.5 9.5h4M8.5 6.5h6M6.5 9.5h8"/>',
        scissors: '<circle cx="4" cy="11.5" r="2.2"/><circle cx="4" cy="4.5" r="2.2"/><path d="M5.8 5.8L14 12.5M5.8 10.2L14 3.5"/>',
        doubling: '<path d="M1.5 8H4l3-4h2M4 8l3 4h2M9 4l3-2h2M9 4l3 2h2M9 12l3-2h2M9 12l3 2h2"/>',
        align: '<path d="M1.5 5h5M8.5 5h6M1.5 11h13M3 6.5v3M5 6.5v3M10 6.5v3M13 6.5v3"/>',
        target: '<circle cx="8" cy="8" r="5"/><path d="M8 1v4M8 11v4M1 8h4M11 8h4"/>' +
            '<circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>',
        search: '<circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4.5 4.5"/>',
        pair: '<rect x="3" y="1.5" width="4" height="13" rx="2"/><rect x="9" y="1.5" width="4" height="13" rx="2"/><path d="M3 8h4' +
            'M9 8h4"/>',
        beads: '<path d="M2.5 11.5L6 8l4 1.5 3.5-3.5"/><circle cx="2.5" cy="11.5" r="1.6"/><circle cx="6" cy="8" r="1.6"/>' +
            '<circle cx="10" cy="9.5" r="1.6"/><circle cx="13.5" cy="6" r="1.6"/>',
        saturation: '<path d="M1.5 1.5v13h13"/><path d="M2.5 13.5C4 6 7 4 14.5 3.5"/><path stroke-dasharray="1.2 1.5" d="M2.5 3h12"/>',
        sigmoid: '<path d="M1.5 1.5v13h13"/><path d="M2.5 12.9L3.2 12.9L3.8 12.8L4.5 12.7L5.2 12.4L5.8 11.9L6.5 11.1L7.2 9.9L7.8 8.4' +
            'L8.5 6.8L9.2 5.5L9.8 4.5L10.5 3.9L11.2 3.5L11.8 3.3L12.5 3.1L13.2 3.1L13.8 3L14.5 3"/>',
        sigmoiddown: '<path d="M1.5 1.5v13h13"/><path d="M2.5 3.1L3.2 3.1L3.8 3.2L4.5 3.3L5.2 3.6L5.8 4.1L6.5 4.9L7.2 6.1L7.8 7.6' +
            'L8.5 9.2L9.2 10.5L9.8 11.5L10.5 12.1L11.2 12.5L11.8 12.7L12.5 12.9L13.2 12.9L13.8 13L14.5 13"/>' +
            '<circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>',
        amplification: '<path d="M1.5 1.5v13h13"/><path d="M2.5 12.9L3.2 12.8L3.8 12.5L4.5 12L5.2 11.1L5.8 9.8L6.5 8L7.2 6.2L7.8 4.9' +
            'L8.5 4L9.2 3.5L9.8 3.2L10.5 3.1L11.2 3.1L11.8 3L12.5 3L13.2 3L13.8 3L14.5 3"/><path d="M2.5 13L3.2 13L3.8 13L4.5 13' +
            'L5.2 13L5.8 12.9L6.5 12.8L7.2 12.6L7.8 12.2L8.5 11.4L9.2 10.1L9.8 8.5L10.5 6.7L11.2 5.2L11.8 4.2L12.5 3.6L13.2 3.3' +
            'L13.8 3.1L14.5 3.1"/><path stroke-dasharray="1.2 1.5" d="M2 9.5h12.5"/>',
        funnel: '<path d="M2 2.5h12L9.5 8v5l-3 1.5V8z"/>',
        dropper: '<path d="M3.5 6v7a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V6M3.5 10h9"/><path d="' +
            'M8 1c-1 1.4-1.5 2.2-1.5 2.8a1.5 1.5 0 0 0 3 0C9.5 3.2 9 2.4 8 1z"/>',
        tubes: '<path d="M2.5 3v9a1.5 1.5 0 0 0 3 0V3M7 3v9a1.5 1.5 0 0 0 3 0V3M11.5 3v9a1.5 1.5 0 0 0 3 0V3M2.5 6h3M7 8.5h3' +
            'M11.5 11h3"/>',
        growth: '<path d="M1.5 1.5v13h13"/><path d="M2.5 13C8 13 11 10 14 2.5"/>',
        dish: '<circle cx="8" cy="8" r="6.5"/><circle cx="5.5" cy="5.5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="10" cy="4.5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="8" cy="8.5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="11" cy="10" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="5" cy="10.5" r="1.1" fill="currentColor" stroke="none"/>' +
            '<circle cx="7.5" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
        rotor: '<circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="10.69" cy="10.69" r="1.3"/><circle cx="5.31" cy="10.69" r="1.3"/><circle cx="5.31" cy="5.31" r="1.3"/>' +
            '<circle cx="10.69" cy="5.31" r="1.3"/>',
        eppendorf: '<path d="M4.5 2.5h7M5.5 2.5v5.5L8 14.5 10.5 8V2.5M5.5 7h5"/>',
        errorbars: '<rect x="2.5" y="7.5" width="4" height="6.5" rx=".3"/><rect x="9.5" y="5.5" width="4" height="8.5" rx=".3"/>' +
            '<path d="M4.5 4.5v6M3.5 4.5h2M11.5 2v7M10.5 2h2"/>',
        tlc: '<rect x="4" y="1.5" width="8" height="13" rx=".5"/><path d="M4 12h8"/>' +
            '<circle cx="6.3" cy="9" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="9.7" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="6.3" cy="4" r="1.2" fill="currentColor" stroke="none"/>',
        microscope: '<path d="M3 14.5h10M12 14.5V9a4 4 0 0 0-4-4M3 10.5h6M5.5 2l2.8 1.4-2.6 5.4-2.8-1.4z"/>',
        gel: '<rect x="1.5" y="1.5" width="13" height="13" rx="1"/><path stroke-width="1.6" d="M4 4.5h2.5M4 7h2.5M4 10h2.5' +
            'M9.5 5.5h2.5M9.5 11h2.5"/>',
        plasmid: '<circle cx="8" cy="8" r="5.5"/><path stroke-width="2.6" d="M8 2.5a5.5 5.5 0 0 1 5.2 3.7"/>',
        plate: '<rect x="1.5" y="3" width="13" height="10" rx="1"/><circle cx="4.5" cy="6.2" r="1.4"/>' +
            '<circle cx="4.5" cy="9.8" r="1.4"/><circle cx="8" cy="6.2" r="1.4"/><circle cx="8" cy="9.8" r="1.4"/>' +
            '<circle cx="11.5" cy="6.2" r="1.4"/><circle cx="11.5" cy="9.8" r="1.4"/>',
        virus: '<circle cx="8" cy="8" r="3.5"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.4 3.4l2.1 2.1M10.5 10.5l2.1 2.1' +
            'M3.4 12.6l2.1-2.1M10.5 5.5l2.1-2.1"/>',
        scale: '<path d="M8 2v12.5M4.5 14.5h7M2.5 4h11M2.5 4L1 8.5h3zM13.5 4L12 8.5h3z"/>',
        cell: '<circle cx="8" cy="8" r="6"/><circle cx="9.5" cy="6.5" r="2"/>',
        diffusion: '<path d="M8 1.5v3M8 6.5v3M8 11.5v3"/><circle cx="2.5" cy="3.5" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="5" cy="5" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="3" cy="7.5" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="5.5" cy="9.5" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="2.5" cy="12" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="5" cy="12.5" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="11.5" cy="5" r="1" fill="currentColor" stroke="none"/>' +
            '<circle cx="12" cy="11" r="1" fill="currentColor" stroke="none"/>',
        membrane: '<circle cx="3" cy="3" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="6.3" cy="3" r="1.3"/>' +
            '<circle cx="6.3" cy="13" r="1.3"/><circle cx="9.7" cy="3" r="1.3"/><circle cx="9.7" cy="13" r="1.3"/>' +
            '<circle cx="13" cy="3" r="1.3"/><circle cx="13" cy="13" r="1.3"/><path d="M3 4.3v3.2M6.3 4.3v3.2M9.7 4.3v3.2M13 4.3v3.2' +
            'M3 8.5v3.2M6.3 8.5v3.2M9.7 8.5v3.2M13 8.5v3.2"/>',
        energyhill: '<path d="M1.5 1.5v13h13"/><path d="M3 7h1.5c2 0 2.5-4.5 4.5-4.5s2.5 9 4.5 9h1"/>',
        heart: '<path d="M8 14S1.5 10 1.5 5.5A3.25 3.25 0 0 1 8 4a3.25 3.25 0 0 1 6.5 1.5C14.5 10 8 14 8 14z"/>',
        lungs: '<path d="M8 1.5v5M8 6c-1 1-2 1.5-2 3v3.5c0 1-1 1.5-2 1.5s-2.5-.5-2.5-3S2.5 4 5 4c.8 0 1 .5 1 1.5' +
            'M8 6c1 1 2 1.5 2 3v3.5c0 1 1 1.5 2 1.5s2.5-.5 2.5-3S13.5 4 11 4c-.8 0-1 .5-1 1.5"/>',
        cross: '<path d="M6 2h4v4h4v4h-4v4H6v-4H2V6h4z"/>',
        warning: '<path d="M8 2L14.5 13.5h-13zM8 6.5V10M8 11.9v0"/>',
        bubbles: '<circle cx="6" cy="9.5" r="4"/><circle cx="12" cy="4.5" r="2.5"/>',
        spike: '<path d="M1 11h4l1.5-8.5 2 10.5 1.5-2h6"/>',
        kidney: '<path d="M9 2.5c-3.5-1.5-7 1-7 5.5s3.5 7 7 5.5c1.5-.7 1.5-2.5.5-3.5-.8-.8-.8-1.2 0-2 1-1 1-2.8-.5-3.5z' +
            'M9.5 8h2c1 0 1.5.5 1.5 1.5v5"/>',
        pill: '<path d="M3.3 9.2l6-6a2.83 2.83 0 0 1 4 4l-6 6a2.83 2.83 0 0 1-4-4zM6.3 6.2l4 4"/>',
        cycles: '<path d="M1 8L1.5 6.5L1.9 5.2L2.4 4L2.9 3.1L3.3 2.6L3.8 2.5L4.3 2.8L4.7 3.5L5.2 4.5L5.7 5.8L6.1 7.2L6.6 8.7L7.1 10.1' +
            'L7.5 11.4L8 12.4L8.5 13.2L8.9 13.5L9.4 13.4L9.9 12.9L10.3 12.1L10.8 10.9L11.3 9.6L11.7 8.1L12.2 6.6L12.7 5.3L13.1 4.1' +
            'L13.6 3.2L14.1 2.6L14.5 2.5L15 2.8"/><path stroke-dasharray="1.6 1.4" d="M1 11.4L1.5 11.2L1.9 10.6L2.4 9.9L2.9 9.1' +
            'L3.3 8.1L3.8 7.2L4.3 6.3L4.7 5.5L5.2 5L5.7 4.6L6.1 4.5L6.6 4.7L7.1 5.1L7.5 5.7L8 6.5L8.5 7.4L8.9 8.3L9.4 9.2L9.9 10.1' +
            'L10.3 10.7L10.8 11.2L11.3 11.5L11.7 11.5L12.2 11.2L12.7 10.7L13.1 10L13.6 9.1L14.1 8.2L14.5 7.3L15 6.4"/>',
        tag: '<path d="M8.5 1.5H14V7l-7 7-5.5-5.5z"/><circle cx="11.5" cy="4" r="1"/>',
        diversity: '<circle cx="4" cy="4.5" r="2.5"/><rect x="9.5" y="2" width="5" height="5" rx=".5"/><path d="M8 9l3.5 5.5h-7z"/>',
        survival: '<path d="M1.5 1.5v13h13M2 3h3v2h3v3h3v4h3"/>',
        pyramid: '<path d="M8 2l6.5 12h-13zM5.3 7h5.4M3.4 10.5h9.2"/>',
        sprout: '<path d="M8 14.5V8M8 8C8 5 6 3 2.5 2.5 2.5 6 4.5 8 8 8zM8 10c0-3 2-5 5.5-5 0 3.5-2 5-5.5 5z"/>',
        walk: '<path d="M1.5 8l2-2 2 3 2-4 2 5 2-3 2.5 1"/>',
        tree: '<path d="M1.5 8h3M4.5 4v8M4.5 4h4M4.5 12h10M8.5 2v4M8.5 2h6M8.5 6h6"/>',
        reaction: '<circle cx="3" cy="8" r="1.8"/><circle cx="7" cy="8" r="1.8"/><path d="M9.5 8L14.5 8M12.87 9.16L14.5 8' +
            'L12.87 6.84"/>',
        clipboard: '<rect x="2.5" y="2.5" width="11" height="12" rx="1"/><path d="M6 1.5h4v2H6zM5 7h6M5 10h6"/>',
        strip: '<rect x="5.5" y="1.5" width="5" height="13" rx=".5"/><path d="M5.5 5h5M5.5 8.5h5M5.5 12h5"/>' +
            '<path fill="currentColor" fill-opacity=".35" stroke="none" d="M5.5 8.5h5V12h-5z"/>',
        crystals: '<path d="M2.5 2h11M3.5 2v11a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V2M3.5 6h9"/>' +
            '<path fill="currentColor" stroke="none" d="M5 12.5l1-1.5 1 1.5zM8 12.5l1-1.5 1 1.5zM9.5 10.5l1-1.5 1 1.5z"/>',
        plusminus: '<path d="M8 2v7M4.5 5.5h7M4.5 13h7"/>',
        overwater: '<path d="M1 9q1.75-1.5 3.5 0t3.5 0 3.5 0 3.5 0"/><path d="M6 14V4a2 2 0 0 1 4 0v10"/>',
        balloon: '<path d="M8 1.5a4.5 5 0 0 1 4.5 5c0 3-2.5 5-4.5 5.5-2-.5-4.5-2.5-4.5-5.5a4.5 5 0 0 1 4.5-5zM8 12l-1 1h2z' +
            'M8 13c0 1 1 1 0 2.5"/>',
        effusion: '<path d="M11 6.5V2.5H2v11h9v-4"/><circle cx="5" cy="6" r="1.3"/><circle cx="7.5" cy="10.5" r="1.3"/>' +
            '<circle cx="8.5" cy="5" r="1.3"/><circle cx="13.8" cy="8" r="1.3" fill="currentColor" stroke="none"/>',
        mountain: '<path d="M1 13.5l5-8 3 4.5 2-3 4 6.5z"/>',
        moon: '<path d="M12.5 10.5A6 6 0 1 1 6 2.5a5 5 0 0 0 6.5 8z"/>',
        planet: '<circle cx="8" cy="8" r="4.5"/><path d="' +
            'M3.8 6.6C1 7.6.6 9 1.5 9.8c1.5 1.3 6.6.3 10.3-1.8s5-4 4.3-4.7c-.5-.6-1.5-.6-2.8-.1"/>',
        earth: '<circle cx="8" cy="8" r="6.5"/><path d="M4 4c1 1.5 3 1.5 3 3s-2 1.5-2 3.5 1 2 1 3.5' +
            'M9.5 1.8c-.5 1.5.5 2.5 2 2.5s1.5 2 .5 3-1 2.5 0 3.5"/>',
        star: '<path d="M8 1.5l1.9 4.3 4.6.4-3.5 3 1.1 4.6L8 11.4l-4.1 2.4 1.1-4.6-3.5-3 4.6-.4z"/>',
        galaxy: '<path d="M8 8c0-1.5 2-1.5 2 0 0 2.5-4 2.5-4 0 0-4 6-4 6 0 0 5-8 5-8 0 0-6 10-6 10 0"/>',
        down: '<circle cx="8" cy="12" r="2.5"/><path d="M8 1.5L8 8M6.61 6.05L8 8L9.39 6.05"/>',
        snow: '<path d="M8 1.5v13M2.4 4.75l11.2 6.5M2.4 11.25l11.2-6.5M6.5 2.5L8 4l1.5-1.5M6.5 13.5L8 12l1.5 1.5"/>',
        circle: '<circle cx="8" cy="8" r="6.5"/><path d="M8 8h6.5"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>',
        trapezoid: '<path d="M5 3.5h6l3.5 9h-13z"/>',
        ellipse: '<ellipse cx="8" cy="8" rx="6.5" ry="4"/><path stroke-dasharray="1.2 1.3" d="M8 8h6.5M8 8V4"/>',
        sphere: '<circle cx="8" cy="8" r="6.5"/><path d="M1.5 8c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5"/>',
        cylinder: '<ellipse cx="8" cy="3.5" rx="5" ry="2"/><path d="M3 3.5v9c0 1.1 2.2 2 5 2s5-.9 5-2v-9"/>',
        squarepyramid: '<path d="M8 1.5l6 9-4 3.5-8-3.5zM8 1.5l2 12.5"/>',
        sector: '<path d="M2.5 13.5V2.5a11 11 0 0 1 11 11z"/>',
        taylor: '<path d="M1 7.8L1.5 8.9L2 10L2.5 11L3 11.8L3.5 12.4L4 12.8L4.5 13L5 12.9L5.5 12.5L6 11.9L6.5 11.2L7 10.2L7.5 9.1L8 8' +
            'L8.5 6.9L9 5.8L9.5 4.8L10 4.1L10.5 3.5L11 3.1L11.5 3L12 3.2L12.5 3.6L13 4.2L13.5 5L14 6L14.5 7.1L15 8.2"/>' +
            '<path stroke-dasharray="1.4 1.6" d="M2.4 7L3 9.4L3.5 11.1L4.1 12.2L4.6 12.7L5.2 12.6L5.8 12.2L6.3 11.4L6.9 10.4L7.4 9.3' +
            'L8 8L8.6 6.7L9.1 5.6L9.7 4.6L10.2 3.8L10.8 3.4L11.4 3.3L11.9 3.8L12.5 4.9L13 6.6L13.6 9"/>',
        cplane: '<path d="M1.5 8h13M8 1.5v13"/><circle cx="4" cy="4.5" r="1.3" fill="currentColor" stroke="none"/>' +
            '<circle cx="11.5" cy="5" r="1.3" fill="currentColor" stroke="none"/>' +
            '<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
        graycode: '<rect x="1.2" y="3" width="2.6" height="3.4" rx=".4" fill="currentColor" stroke="none"/>' +
            '<rect x="4.9" y="3" width="2.6" height="3.4" rx=".4" fill="currentColor" stroke="none"/>' +
            '<rect x="8.6" y="3" width="2.6" height="3.4" rx=".4"/>' +
            '<rect x="12.3" y="3" width="2.6" height="3.4" rx=".4" fill="currentColor" stroke="none"/>' +
            '<rect x="1.2" y="9.6" width="2.6" height="3.4" rx=".4" fill="currentColor" stroke="none"/>' +
            '<rect x="4.9" y="9.6" width="2.6" height="3.4" rx=".4" fill="currentColor" stroke="none"/>' +
            '<rect x="8.6" y="9.6" width="2.6" height="3.4" rx=".4" fill="currentColor" stroke="none"/>' +
            '<rect x="12.3" y="9.6" width="2.6" height="3.4" rx=".4" fill="currentColor" stroke="none"/>',
        sixtyfour: '<path d="M7 2.5C4.5 2.5 3 4.5 3 8.5v2.75"/><circle cx="5.25" cy="11.25" r="2.25"/><path d="M12.5 13.5V2.5' +
            'L8.5 10h6"/>',
        yu: '<path d="M8 1.5L1.8 6.8M8 1.5l6.2 5.3M5 7.2h6M2.5 9.8h11M8 7.2v7.3l-1.3-.9M5.6 11.4L3 14M10.4 11.4L13 13.8"/>',
        radical: '<path d="M1.5 9l2-1 2.5 5.5L9.5 2.5h5"/>',
        sieve: '<circle cx="3.5" cy="3.5" r="1.5"/><circle cx="8" cy="3.5" r="1.6" fill="currentColor" stroke="none"/>' +
            '<circle cx="12.5" cy="3.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="3.5" cy="8" r="1.5"/>' +
            '<circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.5"/>' +
            '<circle cx="3.5" cy="12.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="8" cy="12.5" r="1.5"/>' +
            '<circle cx="12.5" cy="12.5" r="1.5"/>',
        primerange: '<path d="M1.5 10h13M3.5 6.5v7M12.5 6.5v7"/><circle cx="5.75" cy="10" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none"/>' +
            '<circle cx="10.25" cy="10" r="1.2" fill="currentColor" stroke="none"/>',
        atom: '<ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(0 8 8)"/>' +
            '<ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(60 8 8)"/>' +
            '<ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(120 8 8)"/>' +
            '<circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none"/>',
        tradeoff: '<path d="M1 13.5h14"/><path d="M3 13L3.5 13L4 13L4.5 12.9L5 12.7L5.5 12.2L6 11L6.5 8.9L7 6.1L7.5 3.5L8 2.5L8.5 3.5' +
            'L9 6.1L9.5 8.9L10 11L10.5 12.2L11 12.7L11.5 12.9L12 13L12.5 13L13 13"/><path stroke-dasharray="1.4 1.6" d="M1 12.6' +
            'L1.7 12.4L2.4 12L3.1 11.6L3.8 11.1L4.5 10.5L5.2 9.9L5.9 9.4L6.6 8.9L7.3 8.6L8 8.5L8.7 8.6L9.4 8.9L10.1 9.4L10.8 9.9' +
            'L11.5 10.5L12.2 11.1L12.9 11.6L13.6 12L14.3 12.4L15 12.6"/>',
        compton: '<path d="M1 8L1.3 8.7L1.7 9L2 8.7L2.4 8L2.7 7.3L3.1 7L3.4 7.3L3.8 8L4.1 8.7L4.4 9L4.8 8.7L5.1 8L5.5 7.3L5.8 7' +
            'L6.2 7.3L6.5 8"/><circle cx="8.3" cy="8" r="1.4" fill="currentColor" stroke="none"/><path d="M9.6 6.7L10.4 6.7L10.9 6.5' +
            'L11.1 5.9L11.1 5.1L11 4.4L11.2 3.8L11.8 3.6L12.5 3.6L13.3 3.6L13.9 3.3L14 2.8L14 2"/><path d="M9.6 9.3L13.5 13.2' +
            'M11.53 12.87L13.5 13.2L13.17 11.23"/>',
        movingclock: '<circle cx="10" cy="8" r="4.8"/><path d="M10 5.5V8l1.8 1.2M1.5 5.5h2.5M1 8h3M1.5 10.5h2.5"/>',
        inherit: '<circle cx="4" cy="4.5" r="2"/><circle cx="12.5" cy="7.5" r="1.5"/><path d="M1 12.5a3 3 0 0 1 6 0' +
            'M10.3 12.5a2.2 2.2 0 0 1 4.4 0"/><path d="M7 4.5L10.5 6M8.74 6.38L10.5 6L9.57 4.46"/>',
        epistasis: '<circle cx="3.5" cy="8" r="2"/><circle cx="13.3" cy="8" r="1.8"/><path d="M5.5 8h4.5M10 5v6"/>',
        translate: '<path d="M1.5 13h13M4 11.5v3M8 11.5v3M12 11.5v3"/><path d="M3 4.5l3.3 2 3.4-2 3.3 2"/>' +
            '<circle cx="3" cy="4.5" r="1.2"/><circle cx="6.3" cy="6.5" r="1.2"/><circle cx="9.7" cy="4.5" r="1.2"/>' +
            '<circle cx="13" cy="6.5" r="1.2"/><path d="M8 10L8 8.5M8.81 9.64L8 8.5L7.19 9.64"/>',
        aminoacid: '<circle cx="8" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="2.7" cy="7" r="1.7"/>' +
            '<circle cx="13.3" cy="7" r="1.7"/><circle cx="8" cy="1.9" r="1.4"/><rect x="6" y="11.5" width="4" height="3.5" rx=".5"/>' +
            '<path d="M4.4 7h2M9.6 7h2M8 3.3v2.1M8 8.6v2.9"/>',
        mutation: '<path d="M1.5 4.5h13M1.5 11.5h13M3.5 4.5v7M6 4.5v7M12.5 4.5v7M8 6.5l2.5 3M10.5 6.5l-2.5 3"/>',
        shift: '<path d="M1 13.5h14"/><path d="M1 12.6L1.6 12.2L2.1 11.6L2.7 10.5L3.2 9.2L3.8 7.6L4.3 6.1L4.9 5L5.4 4.5L6 4.8L6.6 5.8' +
            'L7.1 7.3L7.7 8.9L8.2 10.3L8.8 11.4L9.3 12.1L9.9 12.6L10.4 12.8L11 12.9"/><path stroke-dasharray="1.4 1.6" d="M5 12.9' +
            'L5.6 12.8L6.1 12.6L6.7 12.1L7.2 11.4L7.8 10.3L8.3 8.9L8.9 7.3L9.4 5.8L10 4.8L10.6 4.5L11.1 5L11.7 6.1L12.2 7.6L12.8 9.2' +
            'L13.3 10.5L13.9 11.6L14.4 12.2L15 12.6"/><path d="M5.5 2L10 2M8.54 3.05L10 2L8.54 0.95"/>',
        formula: '<circle cx="8" cy="9.5" r="2.4"/><circle cx="8" cy="3" r="1.6"/><circle cx="2.8" cy="12.5" r="1.6"/>' +
            '<circle cx="13.2" cy="12.5" r="1.6"/><path d="M8 7.1V4.6M5.9 10.7l-1.7 1M10.1 10.7l1.7 1"/>',
        equilibrium: '<path d="M2 6h12l-3-2.5M14 10H2l3 2.5"/>',
        naming: '<rect x="1.5" y="3" width="13" height="10" rx="1.5"/><path d="M7.8 5.9A2.6 2.6 0 1 0 7.8 9.6M10 6.5h2.5' +
            'M10 9.5h2.5"/>',
        vapour: '<path d="M3 7v6a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V7M3 10.5h10"/><path d="M6 9L6 2M7.05 3.46L6 2' +
            'L4.95 3.46"/><path d="M10 9L10 2M11.05 3.46L10 2L8.95 3.46"/>',
        piletter: '<path d="M2.5 5.5c.8-1.3 1.8-2 3.5-2h8M6.5 3.5c0 4.5-1 7.5-3 10M11 3.5v8c0 1.5 1 2 2.5 1.5"/>',
        eletter: '<path d="M3 8.5h10A5 5 0 1 0 11.54 12.04"/>',
        slope: '<path d="M2 13.5L14 2.5"/><path stroke-width=".9" stroke-dasharray="1.2 1.2" d="M4.5 11.2H11.5V4.8"/>' +
            '<circle cx="4.5" cy="11.2" r="1.4" fill="currentColor" stroke="none"/>' +
            '<circle cx="11.5" cy="4.8" r="1.4" fill="currentColor" stroke="none"/>',
        golden: '<path stroke-width=".8" stroke-opacity=".55" d="M1.5 4h13v8h-13zM9.5 4v8M9.5 9h5M11.5 9v3"/><path d="' +
            'M1.5 12A8 8 0 0 1 9.5 4A5 5 0 0 1 14.5 9A3 3 0 0 1 11.5 12A2 2 0 0 1 9.5 10A1 1 0 0 1 10.5 9"/>',
        electron: '<circle cx="8" cy="8" r="5.5"/><path d="M5.5 8h5"/>',
        proton: '<circle cx="8" cy="8" r="5.5"/><path d="M5.5 8h5M8 5.5v5"/>',
        neutron: '<circle cx="8" cy="8" r="5.5" fill="currentColor" fill-opacity=".35" stroke="none"/><circle cx="8" cy="8" r="5.5"/>',
        roller: '<path d="M1 13.5h14M1.5 5.5C6 5.5 8 13.5 14.5 13.5"/><circle cx="3.2" cy="3.6" r="1.8"/>',
        work: '<rect x="8.5" y="3" width="5.5" height="5.5" rx=".5"/><path d="M7 8.5h8"/><path d="M1.5 5.75L7 5.75M5.37 6.91L7 5.75' +
            'L5.37 4.59"/><path d="M3 12.5h10"/><path d="M4.46 11.45L3 12.5L4.46 13.55"/><path d="M11.54 13.55L13 12.5L11.54 11.45"/>',
        blackhole: '<circle cx="8" cy="8" r="3" fill="currentColor" stroke="none"/><ellipse cx="8" cy="8" rx="7" ry="2.4"/>'
    };

    var cards = {
        // the converter's groups of units
        convUnits: {
            'units-length': 'ruler', 'units-area': 'area', 'units-volume': 'cube', 'units-mass': 'weight',
            'units-temperature': 'thermometer', 'units-speed': 'gauge', 'units-time': 'clock', 'units-data': 'data',
            'units-pressure': 'press', 'units-energy': 'bolt', 'units-power': 'power', 'units-angle': 'angle',
            'units-fuel-economy': 'pump', 'units-force': 'push', 'units-torque': 'turn', 'units-density': 'dense',
            'units-frequency': 'sine', 'units-acceleration': 'faster', 'units-flow-rate': 'tap',
            'units-electric-current': 'ammeter', 'units-voltage': 'voltmeter', 'units-electric-charge': 'charges',
            'units-resistance': 'resistor', 'units-capacitance': 'capacitor', 'units-inductance': 'coil',
            'units-magnetic-field': 'magnet', 'units-momentum': 'momentum', 'units-radioactivity': 'trefoil',
            'units-absorbed-dose': 'rays', 'units-equivalent-dose': 'person', 'units-molarity': 'flask',
            'units-mass-concentration': 'beaker', 'units-amount-of-substance': 'pile', 'units-molecular-mass': 'molecule',
            'units-sequence-length': 'helix', 'units-enzyme-activity': 'enzyme', 'units-count-per-volume': 'grid'
        },
        // the converter's dates
        dates: {
            span: 'span', add: 'dateadd', zones: 'globe', unix: 'prompt'
        },
        // the solver
        solve: {
            equation: 'equation', inequality: 'inequality', extrema: 'extrema', quadratic: 'parabola', cubic: 'cubic',
            quartic: 'quartic', polynomial: 'roots', system2: 'lines2', system3: 'lines3', curves: 'meet', integral: 'integral',
            derivative: 'tangent', sum: 'sigma', product: 'pi', limit: 'limit', between: 'between', arc: 'arc', ode: 'field',
            taylor: 'taylor', triangle: 'triangle', shape: 'shapes', solid: 'cone', points: 'points', circle3: 'circle3',
            polygon: 'polygon', normal: 'bellmid', density: 'bellat', inverse: 'belltail', student: 'student', chi: 'chi',
            fisher: 'fdist', binomial: 'binomial', poisson: 'poisson', geometric: 'geometric', hypergeometric: 'urn',
            exponential: 'decay', uniform: 'uniform', meanci: 'interval', propci: 'pie', random: 'dice', schedule: 'bank',
            mortgage: 'house', payoff: 'card', savings: 'coins', retire: 'sunset', salary: 'briefcase', rates: 'percent',
            breakeven: 'breakeven', inflation: 'rising', depreciation: 'falling', tvm: 'hourglass', npv: 'flows', bond: 'bond',
            change: 'updown', tip: 'receipt', fuel: 'pump'
        },
        // the numbers
        numbers: {
            matrix: 'matrix', rref: 'stairs', matrices: 'matrices', eigen: 'lambda', axb: 'lines2', lu: 'lu', vectors: 'vectors',
            complex: 'argand', croots: 'unity', cpoly: 'cplane', impedance: 'ac', bits: 'binary', bitview: 'bitcells',
            logic: 'truthtable', gray: 'graycode', float: 'float', anybase: 'abacus', codes: 'code', base64: 'sixtyfour',
            subnet: 'network', uuid: 'idtag', hash: 'fingerprint', factors: 'factors', gcd: 'venn', modular: 'dial', crt: 'yu',
            exact: 'radical', primes: 'sieve', between: 'primerange', fraction: 'half', round: 'approx'
        },
        // the statistics' tests
        statTests: {
            ttest: 'student', ttest2: 'bell2', paired: 'pairs', ztest: 'belltails', prop: 'pie', prop2: 'pies', gof: 'fit',
            indep: 'table', anova: 'boxes', corr: 'scatter'
        },
        // physics
        phys: {
            colours: 'colourbands', smd: 'smd', network: 'parallel', ohm: 'ohm', wire: 'wire', divider: 'divider',
            bridge: 'bridge', led: 'led', capacitor: 'capacitor', rc: 'rc', rl: 'rl', filter: 'lowpass', plates: 'plates',
            ac: 'transformer', threephase: 'threephase', rlc: 'resonance', cost: 'plug', battery: 'battery', diode: 'diode',
            rectifier: 'rectified', bjt: 'transistor', bjtbias: 'transistor', mosfet: 'mosfet', zener: 'zener',
            lm317: 'regulator', opamp: 'opamp', timer: 'chip', decibels: 'log', suvat: 'car', projectile: 'projectile',
            relative: 'relative', circular: 'circular', orbit: 'orbit', rocket: 'rocket', oscillator: 'pendulum',
            rotation: 'turn', centre: 'centre', newton: 'push', incline: 'incline', atwood: 'pulley', collision: 'collision',
            impulse: 'momentum', energy: 'roller', work: 'work', torque: 'lever', gravity: 'masses', spring: 'spring',
            drag: 'parachute', coulomb: 'coulomb', magnetic: 'magnet', field: 'wirefield', induction: 'coil', wave: 'sine',
            standing: 'standing', beats: 'beats', lens: 'lens', lensmaker: 'lensaxis', snell: 'refraction', interference: 'slits',
            slit: 'slit', polarise: 'polariser', doppler: 'doppler', photon: 'photon', decibel: 'speaker', heatcap: 'flame',
            latent: 'melt', mixing: 'merge', expansion: 'expand', conduction: 'rod', radiation: 'sun', cooling: 'cup',
            dew: 'drop', molecules: 'gasbox', gasprocess: 'piston', engine: 'gear', stress: 'specimen', density: 'dense',
            pressure: 'press', depth: 'depth', buoyancy: 'buoy', flow: 'pipe', reynolds: 'turbulent', stokes: 'sinking',
            massenergy: 'atom', binding: 'nucleus', qvalue: 'split', photoelectric: 'photoelectric', debroglie: 'packet',
            uncertainty: 'tradeoff', box: 'inbox', compton: 'compton', tunnel: 'tunnel', relativity: 'movingclock',
            hydrogen: 'bohr', decay: 'trefoil'
        },
        // biology
        bio: {
            punnett: 'punnett', xlinked: 'chromosome', hardy: 'hardy', chicross: 'chi', linkage: 'chromobands',
            children: 'family', heritability: 'inherit', epistasis: 'epistasis', counsel: 'pedigree', blood: 'blood',
            sequence: 'helix', translate: 'translate', code: 'codons', primer: 'primer', a260: 'cuvette', moles: 'molecule',
            ligation: 'ligation', digest: 'scissors', pcr: 'doubling', align: 'align', crispr: 'target', motif: 'search',
            mutagenesis: 'mutation', genome: 'pair', protein: 'beads', amino: 'aminoacid', proteinconc: 'cuvette',
            kinetics: 'saturation', hill: 'sigmoid', dose: 'sigmoiddown', purify: 'funnel', dilute: 'dropper', serial: 'tubes',
            solution: 'flask', cells: 'grid', growth: 'growth', cfu: 'dish', rcf: 'rotor', pcrmix: 'eppendorf',
            qpcr: 'amplification', stdcurve: 'scatter', errorbars: 'errorbars', chromatography: 'tlc', microscope: 'microscope',
            gelsize: 'gel', transform: 'plasmid', seeding: 'plate', moi: 'virus', isotope: 'trefoil', buffer: 'beaker',
            water: 'drop', tonicity: 'cell', sav: 'cube', q10: 'thermometer', fick: 'diffusion', membrane: 'membrane',
            gibbs: 'energyhill', heart: 'heart', respiration: 'lungs', diagnostic: 'cross', odds: 'warning', epidemic: 'virus',
            oxygen: 'bubbles', action: 'spike', kidney: 'kidney', body: 'person', drug: 'pill', popgrowth: 'sigmoid',
            predator: 'cycles', recapture: 'tag', diversity: 'diversity', lifetable: 'survival', pyramid: 'pyramid',
            productivity: 'sprout', selection: 'shift', drift: 'walk', leslie: 'matrix', competition: 'venn',
            species: 'saturation', tree: 'tree', clock: 'clock'
        },
        // chemistry
        chem: {
            molar: 'molecule', moles: 'weight', empirical: 'formula', balance: 'scale', stoich: 'reaction',
            worksheet: 'clipboard', heat: 'flame', decay: 'decay', molarity: 'flask', dilution: 'dropper',
            colligative: 'thermometer', ph: 'strip', weak: 'equilibrium', buffer: 'beaker', soluble: 'crystals', ion: 'ion',
            names: 'naming', oxidation: 'plusminus', gas: 'piston', gases: 'gasbox', dalton: 'gasmix', wet: 'overwater',
            gasvol: 'balloon', effusion: 'effusion', air: 'mountain', sound: 'speaker'
        },
        // the formulas with no card of a panel, by name
        formulas: {
            'Quadratic formula (+)': 'parabola', 'Quadratic formula (−)': 'parabola', 'Pythagorean theorem': 'triangle',
            'Distance between two points': 'points', 'Slope of a line': 'slope', 'Percentage change': 'updown',
            'Arithmetic series': 'sigma', 'Geometric series': 'sigma', 'Logarithm to any base': 'log',
            'Exponential growth': 'growth', 'Area of a circle': 'circle', 'Circumference of a circle': 'circle',
            'Area of a triangle': 'triangle', 'Heron\'s formula': 'triangle', 'Area of a trapezoid': 'trapezoid',
            'Area of an ellipse': 'ellipse', 'Volume of a sphere': 'sphere', 'Surface of a sphere': 'sphere',
            'Volume of a cylinder': 'cylinder', 'Volume of a cone': 'cone', 'Surface of a cylinder': 'cylinder',
            'Volume of a pyramid': 'squarepyramid', 'Area of a sector': 'sector', 'Arc length': 'sector',
            'Law of cosines': 'triangle', 'Law of sines': 'triangle', 'Area from two sides': 'triangle',
            'Degrees to radians': 'angle', 'Radians to degrees': 'angle', 'Polar to rectangular: x': 'argand',
            'Polar to rectangular: y': 'argand', 'Rectangular to polar: r': 'argand', 'Rectangular to polar: θ': 'argand',
            Speed: 'gauge', Weight: 'weight', Power: 'power', 'Ideal gas law': 'piston', Period: 'sine',
            'Relativistic Doppler': 'doppler', Charge: 'charges', pH: 'strip', 'Amount of substance': 'pile', Molarity: 'flask',
            Dilution: 'dropper', pOH: 'strip', '[H⁺] from pH': 'strip', 'Henderson–Hasselbalch': 'beaker',
            'Combined gas law': 'gasbox', Molality: 'beaker', 'Boiling point elevation': 'thermometer',
            'Freezing point depression': 'snow', 'Osmotic pressure': 'cell', 'Gibbs free energy': 'energyhill',
            'Free energy and K': 'energyhill', 'Arrhenius equation': 'energyhill', 'Nernst equation': 'battery',
            'First-order decay': 'decay', 'Beer–Lambert law': 'cuvette', 'Graham\'s law': 'effusion', Electrolysis: 'battery',
            Particles: 'pile', 'Recombination frequency': 'chromobands', 'Doubling time': 'growth', Generations: 'growth',
            'Wallace rule': 'primer', 'Fold change by ΔΔCt': 'amplification', Magnification: 'microscope',
            'Specific activity': 'enzyme', 'Transformation efficiency': 'plasmid', 'Divergence time': 'tree',
            'Number needed to treat': 'cross', 'Drug elimination': 'pill', 'z-score': 'bell', 'Standard error': 'interval',
            'Simple interest': 'percent', 'Present value': 'hourglass', 'Growth rate per year': 'rising',
            'Rule of 72': 'hourglass', 'Percent of a number': 'percent', 'Price after discount': 'tag',
            'Price with tax': 'receipt', 'Celsius to Fahrenheit': 'thermometer', 'Fahrenheit to Celsius': 'thermometer',
            'Celsius to kelvin': 'thermometer', 'Kelvin to Celsius': 'thermometer', 'Body mass index': 'person',
            'Fuel use': 'pump', Pace: 'clock', 'Raoult\'s law': 'vapour', 'Percent yield': 'percent', 'Free-fall time': 'down',
            'Escape velocity': 'rocket', 'Orbital speed': 'orbit', 'Schwarzschild radius': 'blackhole', 'Electric power': 'power',
            'Power in a resistance': 'resistor', 'Capacitors in series': 'capacitor', 'Resonant frequency': 'resonance',
            'Population growth, exponential': 'growth', 'SA:V of a sphere': 'sphere', 'Jukes–Cantor distance': 'align',
            'Herd immunity': 'family'
        },
        // the constants, by name
        constants: {
            'Speed of light': 'photon', 'Planck constant': 'photon', 'Reduced Planck constant': 'photon',
            'Coulomb constant': 'coulomb', 'Gravitational constant': 'masses', 'Elementary charge': 'electron',
            'Bohr radius': 'bohr', 'Rydberg constant': 'bohr', 'Compton wavelength': 'compton', 'Bohr magneton': 'magnet',
            'Nuclear magneton': 'magnet', 'Alpha particle mass': 'nucleus', 'Avogadro constant': 'pile', 'Gas constant': 'piston',
            'Faraday constant': 'battery', 'Stefan–Boltzmann constant': 'sun', 'Wien\'s constant': 'sun',
            'Molar volume of a gas': 'balloon', 'Absolute zero': 'snow', '0 °C in kelvin': 'thermometer',
            'Density of water': 'drop', 'Specific heat of water': 'flame', 'Latent heat of melting ice': 'melt',
            'Latent heat of boiling water': 'cup', 'Standard gravity': 'down', 'Standard atmosphere': 'press', Bar: 'press',
            'Speed of sound': 'speaker', 'Speed of sound in water': 'speaker', 'Mass of the Earth': 'earth',
            'Radius of the Earth': 'earth', 'Escape velocity from the Earth': 'rocket',
            'Distance from the Earth to the Sun': 'orbit', 'Mass of the Moon': 'moon', 'Gravity on the Moon': 'moon',
            'Distance to the Moon': 'moon', 'Mass of Mars': 'planet', 'Radius of Mars': 'planet', 'Gravity on Mars': 'planet',
            'Day on Mars': 'planet', 'Distance from Mars to the Sun': 'orbit', 'Mass of the Sun': 'sun',
            'Radius of the Sun': 'sun', 'Luminosity of the Sun': 'sun', 'Temperature of the Sun': 'sun', 'Solar constant': 'sun',
            'Hubble constant': 'galaxy', 'Astronomical unit': 'orbit', 'Light-year': 'star', Parsec: 'star',
            'Mass of a base pair': 'helix', 'Mass of a nucleotide': 'helix', 'Mass of an amino acid': 'beads',
            'dsDNA of an A260 of 1': 'cuvette', 'E. coli of an OD600 of 1': 'cuvette', 'A haemocytometer\'s large square': 'grid',
            'Human genome': 'pair', 'Body temperature': 'thermometer', 'O₂ a gram of haemoglobin holds': 'bubbles',
            Pi: 'piletter', 'Euler\'s number': 'eletter', 'Golden ratio': 'golden', 'Square root of 2': 'radical',
            'Square root of 3': 'radical', 'Natural log of 2': 'log', 'Natural log of 10': 'log',
            'Euler–Mascheroni constant': 'sigma', 'Vacuum permittivity': 'plates', 'Vacuum permeability': 'wirefield',
            'Planck length': 'ruler', 'Planck time': 'clock', 'Planck mass': 'weight', 'Planck temperature': 'thermometer',
            'Impedance of free space': 'ohm', 'Electron mass': 'electron', 'Proton mass': 'proton', 'Neutron mass': 'neutron',
            'Atomic mass unit': 'nucleus', 'Fine-structure constant': 'bohr', Electronvolt: 'bolt', 'Muon mass': 'electron',
            'Classical electron radius': 'electron', 'Magnetic flux quantum': 'wirefield', 'Conductance quantum': 'resistor',
            'Josephson constant': 'ac', 'Von Klitzing constant': 'ohm', 'Boltzmann constant': 'gasbox', 'ATP to ADP': 'bolt',
            'RT at 37 °C': 'thermometer', 'RT/F at 37 °C': 'membrane'
        }
    };

    // the icon of a card as an <svg>, or '' where it has none: drawn on 16 by 16, a unit of room round it so no stroke at an edge is cut
    function card(panel, id) {
        var shape = (cards[panel] || {})[id];
        return shape ? '<svg class="calc-icon" viewBox="-1 -1 18 18" fill="none" stroke="currentColor" stroke-width="1.4" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + shapes[shape] + '</svg>' : '';
    }

    root.CalcIcons = { card: card };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcIcons;
    }
})(typeof window !== 'undefined' ? window : this);
