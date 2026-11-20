// The graph of up to twenty-five functions of x, and its table: what main.js shows over the keys, or in a
// window of its own. Made by main.js as it starts, CalcGraph(app, shared): app is what the graph takes from the
// rest of the calculator, its words, its unit of angles and the like, read as they are now; shared is
// filled with what the calculator takes from the graph, before the graph starts, as it calls back while it does
(function (global) {
    'use strict';

    global.CalcGraph = function (app, shared) {
        var UNITS = app.UNITS, ask = app.ask, boxNumber = app.boxNumber, closePanels = app.closePanels, copy = app.copy,
            engine = app.engine, escaped = app.escaped, fitMenu = app.fitMenu, focusBox = app.focusBox, goTo = app.goTo, graph = app.graph,
            graphButton = app.graphButton, graphInputs = app.graphInputs, graphRows = app.graphRows, hideTip = app.hideTip,
            insertIcon = app.insertIcon, inside = app.inside, keyBoard = app.keyBoard, local = app.local, menu = app.menu,
            notify = app.notify, onDouble = app.onDouble, onlyNumber = app.onlyNumber, openMenu = app.openMenu,
            placePanel = app.placePanel, popIn = app.popIn, refresh = app.refresh, root = app.root,
            rtlDraw = app.rtlDraw, saveState = app.saveState, scale = app.scale, setUnit = app.setUnit, showMenu = app.showMenu,
            shownResult = app.shownResult, statsValue = app.statsValue, tr = app.tr, trc = app.trc, trn = app.trn;
        // the unit of angles, kept here as the Deg key changes it (unitChanged, main.js): read at every point drawn, so not
        // through a getter of main.js each time
        var deg = app.deg;

        // the graph's state, kept here
        let graphFnList = graph.querySelector('.calc-graph-fns'),
            graphAdd = graph.querySelector('.calc-graph-add'),
            graphSliders = graph.querySelector('.calc-graph-sliders'),
            graphFits = graph.querySelector('.calc-graph-fits'), // below them, of each model fitted, y ~ a x² + b: its values and r²
            graphNote = graph.querySelector('.calc-graph-note'),
            graphSay = graph.querySelector('.calc-graph-say'), // the point traced, for a screen reader to say
            graphPlot = graph.querySelector('.calc-graph-plot'),
            graphCanvas = graphPlot.querySelector('canvas'),
            graphTable = graph.querySelector('.calc-graph-table'), // the table of the curves' values, in place of the plot
            graphFrom = graphTable.querySelector('.calc-graph-from'), // its first x, and the step to the next: empty, from the view
            graphBy = graphTable.querySelector('.calc-graph-by'),
            graphList = graphTable.querySelector('.calc-graph-list'),
            graphTab = 'graph', // the tab shown: the graph, or the table
            graphWidth = 0, // the plot's width when it was last drawn, for the view while the table hides it
            graphValues = [], // the rows of the table as shown: x, then y of each curve shown
            graphLines = 0, // how many rows the table has: more come as it is scrolled to its end
            graphFns = [], // the function each box holds, as the engine reads it; null if it holds none
            graphView = null, // what the plot shows: x and y at its middle, and the units of x and y in a pixel; null for the start
            graphMarks = [], // the points of the curves in the view worth marking: roots, highs and lows, crossings
            graphAt = null, // the point under the pointer: { i: its curve, x, y, t: what it is if it is a mark, spot: true off the curves }
            graphEdge = null, // with ∫ pressed, where an area would start from the pointer: { x, i, j: its curves }
            graphStep = null, // the way the arrow keys last moved a point along an equation: { p: the point, x, y in pixels, dir }
            graphPinned = null; // the point clicked, which has the popup

        // what the calculator takes from the graph
        Object.defineProperties(shared, Object.getOwnPropertyDescriptors({
            unitChanged: unitChanged,
            exampleText: exampleText,
            exampleTip: exampleTip,
            putExample: putExample,
            clearGraph: clearGraph,
            closeGraph: closeGraph,
            exportItems: exportItems,
            get graphAdd() { return graphAdd; },
            get graphAlone() { return graphAlone; },
            graphBig: graphBig,
            get graphBy() { return graphBy; },
            get graphCellsRow() { return graphCellsRow; },
            get graphCount() { return graphCount; },
            get graphDiff() { return graphDiff; },
            get graphEnds() { return graphEnds; },
            get graphExItems() { return graphExItems; },
            get graphFrom() { return graphFrom; },
            get graphHue() { return graphHue; },
            get graphLetters() { return graphLetters; },
            get graphLook() { return graphLook; },
            get graphOff() { return graphOff; },
            get graphPinned() { return graphPinned; },
            get graphPlay() { return graphPlay; },
            get graphPop() { return graphPop; },
            get graphRange() { return graphRange; },
            graphRender: graphRender,
            get graphReset() { return graphReset; },
            get graphSearch() { return graphSearch; },
            get graphSide() { return graphSide; },
            get graphSize() { return graphSize; },
            get graphStyle() { return graphStyle; },
            get graphTab() { return graphTab; },
            graphTrace: graphTrace,
            graphUnpin: graphUnpin,
            get graphValues() { return graphValues; },
            get graphVars() { return graphVars; },
            get graphView() { return graphView; },
            get graphWindow() { return graphWindow; },
            get linkWaits() { return linkWaits; },
            loadGraph: loadGraph,
            logScale: logScale,
            nextFit: nextFit,
            readGraph: readGraph,
            saveBlob: saveBlob,
            seqOf: seqOf,
            showGraph: showGraph,
            showGraphTab: showGraphTab,
            showLink: showLink,
            showWindow: showWindow,
            stopSliders: stopSliders,
            styleItems: styleItems,
            takeLink: takeLink
        }));

            // ---------------- graph ---------------- //

            // Up to twenty-five functions of x, typed as they would be pasted: x^2 – 3, 2sin(x), 1/x.
            // Their curves are drawn over a grid, in the unit of angles in use, each in its color;
            // a drag moves the view, and the wheel, a pinch or the buttons zoom it. The roots,
            // highs and lows of each, where it meets the y axis and where two cross are marked
            // with dots. The point under the pointer shows its x and y, on the nearest curve or
            // dot; a click keeps it there, with the tangent of the curve, and its x, y or slope can
            // be put into the calculation, as Ans is
            var GRAPH_WIDTH = 20, // the x the plot starts with: -10 to 10, or a full turn either way in degrees
                GRAPH_DECADES = 4, // on a log scale, the powers of ten across it at the start: 0.01 to 100
                GRAPH_LOG_SPAN = 600, // and the most across it, as numbers go from 10^-307 to 10^308
                GRAPH_DRAW_TIME = 300, // milliseconds all the curves of a drawing are traced in, as it is dragged
                GRAPH_STILL = 250, // and how long it is still before those traced roughly are traced in full
                GRAPH_INK = { grid: 'rgba(51, 68, 59, 0.16)', minor: 'rgba(51, 68, 59, 0.07)', axis: '#33443b', text: '#33443b', paper: '#b6d1c2' },
                // the colors of the curves, one for each box, each as far from the others as the green lets them be: navy, red,
                // green, purple, orange, teal, plum, gold, fuchsia, olive brown, azure, rust, lime, scarlet, blue, sea green, moss,
                // ochre, ultramarine, cerulean, pine, crimson, violet, steel and olive; none near black, as the axes are, and one pink
                GRAPH_CURVES = ['#22476a', '#b0414d', '#3d8b4f', '#6d3fa6', '#c2621a', '#127a85', '#8c2f6b',
                    '#c99a00', '#f91ff9', '#63551d', '#1f85f9', '#7c3403', '#829504', '#f90617', '#0657f9', '#2e9e8f', '#3d631d',
                    '#9c7016', '#0606f9', '#1d9bc9', '#10705c', '#950417', '#a21ff9', '#16709c', '#7c7403'],
                graphCount = 1, // the boxes shown
                graphHue = allHues(), // the color of each box, which stays with its curve as one above is removed
                graphVars = {}, // the value of each letter of the functions but x, as its slider sets it: a and b in a x² + b
                graphRange = {}, // the ends of each slider, [from, to]
                graphLetters = [], // the letters that have a slider now
                graphSliding, // the sliders wait until the typing stops: sin is not s, i and n while it is typed
                GRAPH_PLAY = 4000, // a slider played goes from one end to the other in this many ms
                graphPlay = {}, // the sliders playing: the way each goes, 1 up or -1 down
                graphFrame = 0, // the frame asked for while one plays
                graphLast = 0, // the time of the frame before
                GRAPH_NAMES = { root: 'Root', xint: 'x-intercept', min: 'Min', max: 'Max', infl: 'Inflection point', yint: 'y-intercept', cross: 'Crossing', data: 'Data point' },
                // the best fits of points, one after the other on their button: a line, a parabola, aˣ, a power and ln x
                GRAPH_FITS = ['lin', 'quad', 'exp', 'pow', 'log'],
                GRAPH_FIT_NAMES = { lin: 'linear', quad: 'quadratic', exp: 'exponential', pow: 'power', log: 'logarithmic' },
                // what each needs of the points, said when they do not have it
                GRAPH_FIT_NEEDS = { lin: 'two x or more', quad: 'three x or more', exp: 'every y above 0', pow: 'every x and y above 0', log: 'every x above 0' },
                // the rows of the popup: of a point, x, y and the slope; of an area, where it starts and ends, and how much
                GRAPH_ROWS = { u: '<i>t</i>', x: '<i>x</i>', y: '<i>y</i>', m: 'Slope', a: 'From <i>x</i>', b: 'To <i>x</i>', s: 'Area' },
                graphTouch = {}, // the pointers pressed on the plot, where each is now
                graphStart = null, // where they were when the last one went down or up, and the view then
                graphMoved = false, // the press became a drag or a pinch, so it is not a click
                graphSaving, // saves the view once the wheel stops
                graphSliding = 0, // the next frame of the view sliding under an area dragged to the side, or 0
                graphClickLast = null, // the point or area clicked, and its popup put away, before the last click
                graphClickWas = null, // and before the click before it, the first of two
                GRAPH_SLIDE_EDGE = 28, // an area dragged this many pixels from the left or right slides the view that way
                GRAPH_SLIDE_SPEED = 300, // at the side or past it, this many pixels a second; slower farther in
                GRAPH_ZOOM_REACH = 24, // the wheel this near a dot or a curve zooms about it, so it stays where it is
                GRAPH_ZOOM_SNAP = 16, // else this near an axis, about the axis
                GRAPH_CLICK_NICE = 10, // a click on a curve puts its point where x and y are roundest this many pixels away, (2, 4) and not (1.97, 3.8809)
                graphOff = GRAPH_CURVES.map(function () { return false; }), // the curves hidden by a click on their dot: kept, not drawn
                graphDiff = GRAPH_CURVES.map(function () { return false; }), // the curves whose slope is drawn too, by their y′; of points, the kind of their fit
                // the line of each curve, as the menu of its dot sets it: d 0 solid, 1 dashed, 2 dotted; w 0 thin, 1 as it starts,
                // 2 thick; l, of points, each with its x and y beside it
                GRAPH_STYLE = { d: 0, w: 1, l: false, c: null }, // c: a color chosen, #rrggbb, else that of its box
                graphStyle = GRAPH_CURVES.map(function () { return Object.assign({}, GRAPH_STYLE); }),
                GRAPH_WIDTHS = [1.25, 2, 3.5],
                graphTwice = '', // a name two boxes give their functions, f of f(x) = …: the second is none
                graphCells = graph.querySelector('.calc-graph-cells'), // the points of a box as a table of x and y, to type in
                graphCellsRow = -1, // the box that table is of
                graphCellsName = '', // and the name of its point, A of A = (2, 4), kept while it is one
                graphExamples = graph.querySelector('.calc-graph-examples'), // the Examples tab: a search, and examples to draw by group
                graphSearch = graphExamples.querySelector('.calc-graph-search'),
                graphExList = graphExamples.querySelector('.calc-graph-ex-list'),
                graphExItems = [], // each example with its group, and the words it is found by
                graphRels = [], // the boxes with an equation or an inequality of x and y in place of a function of x, x² + y² = 25
                graphPlanes = [], // the boxes with a curve of a parameter, polar, r = 2sin(3θ), or parametric, (cos t, sin t)
                graphData = [], // the boxes with points, (1, 2), (2, 4.1): their { x, y }; the function of such a box is its best fit, if on
                graphModels = [], // the boxes of a model to fit to points, y ~ a x² + b: { fn, keys, of: the box of the points, fit: its values and r² }
                graphVersion = 0, // goes up as the boxes are read again, so the marks found are found again
                graphMarksKept = null, // the marks found, while the view, the unit, the letters and the boxes stay
                graphSharp = 0, // pixels of the canvas to each of the plot at least: 2 while a picture is made
                graphPop = graphPlot.querySelector('.calc-graph-pop'), // the point clicked: its x and y, each to insert
                GRAPH_SITE = 'https://raad.dev/calculator/', // where a link of the graph opens, from the extension too
                graphDrawTo = null, // the SVG the graph is drawn into in place of its canvas, while it is saved as one
                graphUntil = 0, // when the time of this drawing is up, its curves after it traced roughly; 0 for none, as once it is still
                graphRough = false, // a curve or its marks traced roughly, out of time: all traced again once the view is still
                graphFine = 0, // the timer of that
                GRAPH_POP_WAIT = 3500, // the popup opened with the mouse goes this many ms after the mouse is off it
                graphHiding, // that wait
                graphPopFrom = null, // where the mouse was as it opened the popup: the wait starts once it is moved off there
                GRAPH_POP_STILL = 8, // this many pixels of the plot
                graphPopShut = false, // the popup put away, the point clicked and its tangent still drawn
                GRAPH_TRACE = 2, // ← and → move the point clicked this many pixels along its curve, ten times as far with Shift
                FIELD_STARTS = 20, // solutions of a slope field a click adds, the first going past them
                graphTracing = -1, // the curve traced last: of the two at a crossing, the one to go on along
                graphDragging = null, // a point typed, as it is dragged: its box i and place j, and how far from it it was taken
                graphShutting = false, // the press on the plot closed the settings: as a click it does nothing more
                GRAPH_DRAG_REACH = 8, // a press this near a point typed drags it, a finger twice as far
                graphWindow = graphPlot.querySelector('.calc-graph-window'), // the view typed: x from and to, y from and to
                graphEnds = [].slice.call(graphWindow.querySelectorAll('.calc-graph-x0, .calc-graph-x1, .calc-graph-y0, .calc-graph-y1')),
                graphWindowButton = graphPlot.querySelector('[data-zoom="window"]'),
                graphLooks = [].slice.call(graphWindow.querySelectorAll('[data-look]')), // under them, a switch for each way the graph is drawn
                graphNames = [].slice.call(graphWindow.querySelectorAll('.calc-graph-xname, .calc-graph-yname')), // and the names of the axes
                graphSteps = [].slice.call(graphWindow.querySelectorAll('.calc-graph-xstep, .calc-graph-ystep')), // the step of each, beside its ends
                graphReset = graphWindow.querySelector('.calc-graph-reset'), // all of them as they start, beside their title
                graphArrows = [].slice.call(graphWindow.querySelectorAll('[data-arrows]')), // the arrows: none, at one end, at both
                // How the graph is drawn, as its settings have it. square: a unit of x as long as one of y, however
                // the view is zoomed; grid: its lines, else a short mark on each axis where its numbers are; minor:
                // fainter lines between them; polar: circles about 0 and rays from it in place of the lines; xaxis
                // and yaxis: the line of each, with its numbers and name; xnum and ynum: those numbers; arrows: 1 a
                // head at the end of each axis that goes up, 2 at both ends; lock: no drag, wheel or pinch moves the
                // view, nor the buttons, which go; xname and yname: the names, at the ends of the axes; xstep and
                // ystep: the step of the grid typed, 0.5 or π/2, else one that suits the view; logx and logy: each
                // on a log scale, 1, 10, 100 as far apart, the view keeping its power of ten, with no same scale or polar grid
                GRAPH_LOOK = { square: false, grid: true, minor: true, polar: false, xaxis: true, yaxis: true, xnum: true, ynum: true, arrows: 0, lock: false,
                    xname: '', yname: '', xstep: '', ystep: '', logx: false, logy: false },
                graphLook = Object.assign({}, GRAPH_LOOK),
                graphShading = false, // the ∫ button pressed: a drag along a curve shades its area, and does not move the view
                graphAreaButton = graphPlot.querySelector('[data-zoom="area"]'),
                graphSize = graph.querySelector('.calc-graph-size'), // the graph as big as the page, and back
                graphSplit = graph.querySelector('.calc-graph-split'), // big, the line between its two columns, to drag
                graphSide = 0, // the width that line gives the left column; 0: as style.css has it
                graphSplitFrom = null, // where it was taken: the pointer's x, and the column's width then
                GRAPH_SIDE_MIN = 270, // the left column is never narrower: its tabs, + and Clear fit
                GRAPH_PLOT_MIN = 320, // nor so wide that the plot is narrower than this
                GRAPH_SIDE_MAX = 0.7, // nor wider than this much of the room the plot leaves
                graphAlone = false; // the page is the graph's own window, in the extension: only the graph, always big

            // A click on the dot of a curve hides it, and shows it again: it stays typed, but is not
            // drawn, marked or in the table. Its y′ draws its slope as well, and its × removes it
            graphRows.forEach(function (row, i) {
                var dot = row.querySelector('.calc-graph-swatch');
                row.querySelector('.calc-graph-diff').addEventListener('click', function (e) {
                    e.preventDefault(); // not the label's focus of the box
                    if (!graphInputs[i].value.trim()) return;
                    graphDiff[i] = row.classList.contains('calc-graph-data') ? nextFit(graphDiff[i]) : !graphDiff[i];
                    hideTip();
                    readGraph();
                    saveState();
                }, false);
                row.querySelector('.calc-graph-del').addEventListener('click', function (e) {
                    e.preventDefault(); // not the label's focus of the box
                    removeCurve(i);
                }, false);
                row.querySelector('.calc-graph-points').addEventListener('click', function (e) {
                    e.preventDefault(); // not the label's focus of the box
                    showCells(graphCellsRow === i ? -1 : i);
                    hideTip();
                }, false);
                dot.addEventListener('click', function (e) {
                    e.preventDefault(); // not the label's focus of the box
                    if (!graphInputs[i].value.trim()) return;
                    graphOff[i] = !graphOff[i];
                    hideTip();
                    readGraph();
                    saveState();
                }, false);
                // its ▾, the menu a right click on the dot opens, below it, or beside it where there is no room below, so
                // it is not over it; pressed again, shut
                row.querySelector('.calc-graph-style').addEventListener('click', function (e) {
                    var b = e.currentTarget, items = styleItems(i), at;
                    e.preventDefault(); // not the label's focus of the box
                    hideTip();
                    if (b.shut || !items) {
                        b.shut = false;
                        return;
                    }
                    at = inside(b.getBoundingClientRect());
                    openMenu(items, { left: at.left - 4, top: at.bottom + 4 }, b);
                    if (at.bottom + 4 + menu.offsetHeight > menu.parentNode.clientHeight - 4) {
                        menu.at = { left: at.right + 4, top: at.top - 8 };
                        fitMenu();
                    }
                }, false);
            });

            // The menu of a curve's dot, a right click or a finger held on it: its line solid, dashed or dotted,
            // thin, as it starts or thick, the one it is ticked; of points, their x and y beside them; and to
            // hide or show it, as a click does. Of an empty box, its color and line, for what is typed in it
            function styleItems(i) {
                var st = graphStyle[i];
                function item(name, on, set) {
                    return ['<span class="calc-menu-tick">' + (on ? '✓' : '') + '</span>' + name, function () {
                        set();
                        graphRender();
                        saveState();
                    }];
                }
                if (i < 0) return null;
                return [
                    ['<div class="calc-menu-picker"></div>', null, true, function (el) { colorPart(el, i); }],
                    null,
                    item(trc('line', 'Solid'), st.d === 0, function () { st.d = 0; }),
                    item(tr('Dashed'), st.d === 1, function () { st.d = 1; }),
                    item(tr('Dotted'), st.d === 2, function () { st.d = 2; }),
                    null,
                    item(tr('Thin'), st.w === 0, function () { st.w = 0; }),
                    item(tr('Normal'), st.w === 1, function () { st.w = 1; }),
                    item(tr('Thick'), st.w === 2, function () { st.w = 2; }),
                    null,
                    graphData[i] && item(tr('Label points'), st.l, function () { st.l = !st.l; }),
                    graphData[i] && null,
                    !!graphInputs[i].value.trim() && [tr(graphOff[i] ? 'Show' : 'Hide'), function () { graphRows[i].querySelector('.calc-graph-swatch').click(); }]
                ].filter(function (x) { return x !== undefined && x !== false; });
            }

            // The color of curve i in its menu: a square of the shade and a strip of the hue to drag in, and its hex
            // to type, the curve as it is chosen; Auto, its box's own color again, dim while it has it
            function colorPart(el, i) {
                var st = graphStyle[i], hsv = hexHsv(curveColor(i)), shade, hue, hex, auto;
                el.querySelector('.calc-menu-picker').innerHTML = '<div class="calc-menu-shade"><i></i></div><div class="calc-menu-hue"><i></i></div>' +
                    '<div class="calc-menu-hexrow"><label class="calc-menu-hex">#<input type="text" maxlength="7" spellcheck="false" autocomplete="off" aria-label="' + tr('Hex color') + '"></label>' +
                    '<span class="calc-menu-auto" role="button" tabindex="0">' + tr('Auto') + '</span></div>';
                shade = el.querySelector('.calc-menu-shade');
                hue = el.querySelector('.calc-menu-hue');
                hex = el.querySelector('input');
                auto = el.querySelector('.calc-menu-auto');

                function show() {
                    var c = curveColor(i);
                    shade.style.setProperty('--h', hsv[0]);
                    shade.firstChild.style.left = hsv[1] * 100 + '%';
                    shade.firstChild.style.top = (1 - hsv[2]) * 100 + '%';
                    shade.firstChild.style.background = c;
                    hue.firstChild.style.left = hsv[0] / 360 * 100 + '%';
                    auto.classList.toggle('calc-off', !st.c);
                    if (document.activeElement !== hex) hex.value = c.slice(1);
                }
                function set(c, done) {
                    st.c = c === GRAPH_CURVES[graphHue[i]] ? null : c; // its own color: as none chosen
                    graphRows[i].querySelector('.calc-graph-swatch').style.setProperty('--c', curveColor(i));
                    if (graphCellsRow === i) graphCells.style.setProperty('--c', curveColor(i)); // its table and its model in it too
                    if (graphModels[i]) showFits();
                    show();
                    graphRender();
                    if (done) saveState();
                }
                function drag(part, at) {
                    function move(e) {
                        var r = part.getBoundingClientRect(), x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                            y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
                        at(x, y);
                        set(hsvHex(hsv), e.type === 'pointerup');
                    }
                    part.addEventListener('pointerdown', function (e) {
                        if (e.button) return;
                        e.preventDefault();
                        part.setPointerCapture(e.pointerId);
                        move(e);
                        part.onpointermove = move;
                        part.onpointerup = part.onpointercancel = function (e) {
                            part.onpointermove = part.onpointerup = part.onpointercancel = null;
                            if (e.type === 'pointerup') move(e);
                            else set(hsvHex(hsv), true); // cut off: kept where it was last
                        };
                    }, false);
                }

                drag(shade, function (x, y) { hsv = [hsv[0], x, 1 - y]; });
                drag(hue, function (x) { hsv = [Math.min(359.9, x * 360), hsv[1], hsv[2]]; });
                hex.addEventListener('input', function () {
                    var m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.value.trim());
                    if (!m) return;
                    m = '#' + (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]).toLowerCase();
                    hsv = hexHsv(m);
                    set(m, true);
                }, false);
                hex.addEventListener('keydown', function (e) {
                    if (e.which === 13) showMenu(false);
                }, false);
                function back(e) {
                    if (e.type === 'keydown' && e.which !== 13 && e.which !== 32) return;
                    e.preventDefault();
                    if (!st.c) return;
                    hsv = hexHsv(GRAPH_CURVES[graphHue[i]]);
                    hex.blur();
                    set(GRAPH_CURVES[graphHue[i]], true);
                }
                auto.addEventListener('click', back, false);
                auto.addEventListener('keydown', back, false);
                show();
            }

            // a color #rrggbb as its hue, 0 to 360, saturation and value, 0 to 1; and back
            function hexHsv(c) {
                var r = parseInt(c.slice(1, 3), 16) / 255, g = parseInt(c.slice(3, 5), 16) / 255, b = parseInt(c.slice(5, 7), 16) / 255,
                    max = Math.max(r, g, b), d = max - Math.min(r, g, b),
                    h = !d ? 0 : max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
                return [(h * 60 + 360) % 360, max ? d / max : 0, max];
            }

            function hsvHex(hsv) {
                function part(n) {
                    var k = (n + hsv[0] / 60) % 6;
                    return ('0' + Math.round(255 * (hsv[2] - hsv[2] * hsv[1] * Math.max(0, Math.min(k, 4 - k, 1)))).toString(16)).slice(-2);
                }
                return '#' + part(5) + part(3) + part(1);
            }

            // the fit after this one on its button, from none to a line and on to none again
            function nextFit(kind) {
                var at = kind === true ? 0 : GRAPH_FITS.indexOf(kind);
                return kind === false ? GRAPH_FITS[0] : GRAPH_FITS[at + 1] || false;
            }

            // the kind of fit a box of points has on, or none
            function fitKind(i) {
                return graphDiff[i] === true ? 'lin' : graphDiff[i] || '';
            }

            // The points of a box as a table: a row of x and y for each, and an empty one below to add
            // another, the box written again as they are typed, (1, 2), (2, 4.1), with the pairs of
            // numbers only. Shown right under its own box, in the list of boxes, which may scroll, with the color
            // of its box; i of -1 puts it away
            function showCells(i) {
                var pts = i > -1 && CalcEngine.points(graphInputs[i].value.trim(), engine.comma) || [], moved = graphCells.hidden || graphCellsRow !== i;
                graphCellsRow = i;
                graphCellsName = pts.name || '';
                graphRows.forEach(function (row, k) { row.querySelector('.calc-graph-points').classList.toggle('calc-on', k === i); });
                graphCells.hidden = i < 0;
                graphFnList.classList.toggle('calc-graph-celled', i > -1);
                if (i < 0) return;
                if (graphRows[i].nextSibling !== graphCells) graphFnList.insertBefore(graphCells, graphRows[i].nextSibling);
                graphCells.style.setProperty('--c', curveColor(i));
                graphCells.innerHTML = '<div class="calc-graph-cells-head"><i>x</i><i>y</i></div>';
                pts.forEach(function (p) { addCell(local(String(p.x)), local(String(p.y))); });
                addCell('', '');
                if (moved) { // as it opens, or moves to another box; not again as its box is typed in
                    graphCells.scrollIntoView({ block: 'nearest' });
                    graphRows[i].scrollIntoView({ block: 'nearest' }); // the box over it in sight first, as the list scrolls
                }
                focusBox(graphCells.querySelector('input'));
            }

            // a row of the table, with its x and y
            function addCell(x, y) {
                var row = document.createElement('div'), box = ' type="text" spellcheck="false" autocomplete="off" maxlength="20"';
                row.className = 'calc-graph-pair';
                row.innerHTML = '<input' + box + ' data-c="x" aria-label="x"><input' + box + ' data-c="y" aria-label="y">';
                row.children[0].value = x;
                row.children[1].value = y;
                graphCells.appendChild(row);
                return row;
            }

            // a number typed in the table: the box is written again with the rows of two numbers, and
            // the last row typed in has an empty one after it
            graphCells.addEventListener('input', function (e) {
                var rows = [].slice.call(graphCells.querySelectorAll('.calc-graph-pair')), box = graphInputs[graphCellsRow], pts;
                if (e.target.tagName !== 'INPUT' || !box) return;
                onlyNumber(e.target);
                pts = rows.map(function (row) {
                    var x = boxNumber(row.children[0]), y = boxNumber(row.children[1]);
                    return row.children[0].value.trim() && row.children[1].value.trim() && isFinite(x) && isFinite(y) ? { x: x, y: y } : null;
                }).filter(Boolean);
                box.value = (graphCellsName && pts.length === 1 ? graphCellsName + ' = ' : '') + pairsText(pts);
                if (rows[rows.length - 1].children[0].value || rows[rows.length - 1].children[1].value) addCell('', '');
                readGraph(true);
                saveState();
            }, false);

            // points as a box has them: (1, 2), (2, 4.1), or with the comma in use (1,5; 2); (2; 4,1)
            function pairsText(pts) {
                return pts.map(function (q) {
                    return '(' + local(String(q.x)) + (engine.comma ? '; ' : ', ') + local(String(q.y)) + ')';
                }).join(engine.comma ? '; ' : ', ');
            }

            // Enter goes down to the row below, Shift+Enter up; Esc puts the table away
            graphCells.addEventListener('keydown', function (e) {
                var cell = e.target, row = cell.parentNode, to;
                if (cell.tagName !== 'INPUT') return;
                if (e.which === 27) {
                    e.preventDefault();
                    e.stopPropagation();
                    to = graphInputs[graphCellsRow];
                    showCells(-1);
                    if (to) to.focus();
                } else if (e.which === 13) {
                    e.preventDefault();
                    to = e.shiftKey ? row.previousElementSibling : row.nextElementSibling;
                    if (to && to.classList.contains('calc-graph-pair')) to.children[cell.dataset.c === 'x' ? 0 : 1].focus();
                }
            }, false);

            graphButton.addEventListener('click', function () {
                showGraph(!graph.classList.contains('calc-open'));
            }, false);

            // the colors in their first order, one for each box
            function allHues() {
                return GRAPH_CURVES.map(function (c, i) { return i; });
            }

            // the color of the curve of box i
            function curveColor(i) {
                return graphStyle[i].c || GRAPH_CURVES[graphHue[i]];
            }

            // The boxes after the shown ones hold the colors not in use, first to last: the next box
            // gets the first of them
            function freeHues() {
                graphHue = graphHue.slice(0, graphCount).concat(graphHue.slice(graphCount).sort(function (a, b) { return a - b; }));
            }

            // a box for another curve, at the end, to type in
            graphAdd.addEventListener('click', function () {
                addCurve();
            }, false);

            function addCurve() {
                var box = graphInputs[graphCount];
                if (graphCount >= graphRows.length) return;
                if (graphTab === 'examples') showGraphTab('graph');
                box.value = '';
                graphCount++;
                freeHues();
                readGraph();
                saveState();
                focusBox(box);
                graphRows[graphCount - 1].scrollIntoView({ block: 'nearest' });
            }

            // a curve taken away: the ones below move up, with what is typed, hidden and their colors
            function removeCurve(i) {
                var j, hue = graphHue[i], focused = graphInputs.indexOf(document.activeElement);
                if (graphCount < 2) return;
                for (j = i; j < graphCount - 1; j++) graphInputs[j].value = graphInputs[j + 1].value;
                graphInputs[graphCount - 1].value = '';
                graphOff.splice(i, 1);
                graphOff.push(false);
                graphDiff.splice(i, 1);
                graphDiff.push(false);
                graphStyle.splice(i, 1);
                graphStyle.push(Object.assign({}, GRAPH_STYLE));
                showCells(-1);
                graphHue.splice(i, 1);
                graphHue.splice(graphCount - 1, 0, hue);
                graphCount--;
                freeHues();
                hideTip();
                readGraph();
                saveState();
                if (focused > -1) graphInputs[Math.min(focused, graphCount - 1)].focus(); // the box in its place
            }

            graph.querySelector('.calc-past-close').addEventListener('click', closeGraph, false);

            // closed by its button or Esc; the graph's own window is closed then
            function closeGraph() {
                if (graphAlone) ask('graph-close'); else showGraph(false);
            }

            // pop out and pop in
            graphSize.addEventListener('click', function () {
                if (graphAlone) return popIn('graph');
                graphBig(!root.classList.contains('calc-big'));
            }, false);

            // The graph as big as the page: the calculator fills it and shows only the graph, with
            // more of the curves: on the website all of its window. The page may do it its own way:
            // the extension, whose popup cannot grow, opens the graph in a window of its own. True if it changed
            function graphBig(on) {
                if (on === root.classList.contains('calc-big') || (graphAlone && !on)) return false;
                hideTip();
                showMenu(false);
                if (on) {
                    saveState(); // all of it, for the window that opens with it
                    if (!ask('big', { big: true })) return showGraph(false), false; // in its own window, and not here as well
                    if (!graph.classList.contains('calc-open')) showGraph(true);
                }
                root.classList.toggle('calc-big', on);
                if (!on) ask('big', { big: false });
                graphRender();
                return true;
            }

            // Big on a wide page, the line between the two columns: dragged, the left one is wider or
            // narrower, from GRAPH_SIDE_MIN to GRAPH_SIDE_MAX of what leaves the plot GRAPH_PLOT_MIN; a double click
            // puts it back as it was at first
            function setSide(w) {
                graphSide = w;
                if (w) graph.style.setProperty('--calc-graph-side', w + 'px'); else graph.style.removeProperty('--calc-graph-side');
            }

            graphSplit.addEventListener('pointerdown', function (e) {
                if (e.button) return;
                e.preventDefault();
                graphSplit.setPointerCapture(e.pointerId);
                graphSplit.classList.add('calc-on');
                graphSplitFrom = { x: e.clientX, w: parseFloat(getComputedStyle(graph).gridTemplateColumns) };
            }, false);

            graphSplit.addEventListener('pointermove', function (e) {
                var cs = getComputedStyle(graph),
                    room = (graph.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - GRAPH_PLOT_MIN) * GRAPH_SIDE_MAX,
                    rtl = CalcLang.rtl; // right to left, the boxes at the right (style.css): dragged left, wider
                if (!graphSplitFrom || !graphSplit.hasPointerCapture(e.pointerId)) return;
                setSide(Math.round(Math.max(GRAPH_SIDE_MIN * app.popZoom, Math.min(room, graphSplitFrom.w + (e.clientX - graphSplitFrom.x) * (rtl ? -1 : 1)))));
                drawGraph();
            }, false);

            graphSplit.addEventListener('lostpointercapture', function () {
                graphSplitFrom = null;
                graphSplit.classList.remove('calc-on');
                saveState();
            }, false);

            onDouble(graphSplit, function () {
                setSide(0);
                drawGraph();
                saveState();
            }, false);

            // the page asks for it: big and alone in the graph's own window
            root.addEventListener('calc-graph', function (e) {
                var d = e.detail || {};
                if (d.alone) {
                    graphAlone = true;
                    root.classList.add('calc-alone');
                }
                graphBig(!!d.big);
            }, false);

            // Clear starts again: no curves, and the view as at first
            graph.querySelector('.calc-past-clear').addEventListener('click', function () {
                clearGraph();
                saveState();
                focusBox(graphInputs[0]);
            }, false);

            function clearGraph() {
                graphInputs.forEach(function (box) { box.value = ''; });
                graphFrom.value = graphBy.value = '';
                graphCount = 1;
                graphHue = allHues();
                graphOff = graphOff.map(function () { return false; });
                graphDiff = graphDiff.map(function () { return false; });
                graphStyle = graphStyle.map(function () { return Object.assign({}, GRAPH_STYLE); });
                showCells(-1);
                forgetLetters();
                graphView = null;
                graphLines = 0;
                readGraph();
            }

            graphInputs.forEach(function (box, i) {
                box.addEventListener('input', function () {
                    readGraph(true);
                    if (graphCellsRow === i) showCells(i), box.focus();
                    saveState();
                }, false);
                // Enter goes on to the box of the next curve; after the last one, to a new box
                box.addEventListener('keydown', function (e) {
                    if (e.which !== 13) return;
                    e.preventDefault();
                    if (i + 1 < graphCount) graphInputs[i + 1].focus();
                    else if (box.value.trim()) addCurve();
                }, false);
                box.addEventListener('focus', drawGraph, false); // a busy graph shows the dots of this curve
            });

            function showGraph(open) {
                var box;
                if (!open && graphAlone) return; // its own window stays, even as a value is put in
                if (!open) graphBig(false); // a value put in from the big graph: the calculator again
                if (!open && stopSliders()) saveState(); // the sliders played stop where they are
                if (!open) areaOn(false);
                if (!open) showWindow(false);
                if (open) {
                    closePanels(graph);
                    placePanel(graph);
                }
                graph.classList.toggle('calc-open', open);
                graphButton.classList.toggle('calc-on', open);
                if (open) {
                    readGraph();
                    box = graphInputs[0];
                    if (focusBox(box)) box.setSelectionRange(box.value.length, box.value.length);
                } else if (graphInputs.indexOf(document.activeElement) > -1) {
                    document.activeElement.blur(); // the keys are the calculator's again
                }
            }

            // The functions and the view saved last time; one function, as the graph first kept it. The
            // boxes are as many as were saved with their colors; three without them, as the graph had,
            // up to the last one filled
            function loadGraph(saved) {
                var v = saved && saved.view, f = saved && (typeof saved.f === 'string' ? [saved.f] : saved.f),
                    c = saved && saved.c, n = graphRows.length;
                if (Array.isArray(f)) {
                    f = f.slice(0, n);
                    graphInputs.forEach(function (box, i) { box.value = typeof f[i] === 'string' ? f[i] : ''; });
                }
                graphCount = 1;
                graphInputs.forEach(function (box, i) { if (box.value.trim()) graphCount = i + 1; });
                graphHue = allHues();
                if (Array.isArray(c) && c.length >= graphCount && c.length <= n && c.every(function (h, i) {
                    return h === Math.floor(h) && h >= 0 && h < n && c.indexOf(h) === i;
                })) {
                    graphCount = c.length;
                    graphHue = c.concat(graphHue.filter(function (h) { return c.indexOf(h) < 0; }));
                }
                graphView = v && [v.x, v.y, v.ux, v.uy].every(isFinite) && v.ux > 0 && v.uy > 0 ? { x: v.x, y: v.y, ux: v.ux, uy: v.uy } : null;
                graphLook = Object.keys(GRAPH_LOOK).reduce(function (o, k) {
                    var was = saved && saved.look && saved.look[k];
                    o[k] = typeof was !== typeof GRAPH_LOOK[k] ? GRAPH_LOOK[k] : typeof was === 'string' ? was.slice(0, 16) : was;
                    return o;
                }, {});
                if (saved && saved.sq === true) graphLook.square = true; // as they were kept before the settings
                if (saved && saved.grid === false) graphLook.grid = false;
                if (saved && saved.look && saved.look.arrows === true) graphLook.arrows = 1; // one end, as arrows were first
                if (saved && saved.look && saved.look.axes === false) graphLook.xaxis = graphLook.yaxis = false; // both, as one switch had them
                if (saved && saved.look && saved.look.numbers === false) graphLook.xnum = graphLook.ynum = false;
                if ([0, 1, 2].indexOf(graphLook.arrows) < 0) graphLook.arrows = 0;
                showLooks();
                setSide(saved && typeof saved.side === 'number' && saved.side >= GRAPH_SIDE_MIN && saved.side < 10000 ? Math.round(saved.side) : 0);
                graphOff = graphOff.map(function (off, i) { return !!(saved && Array.isArray(saved.off) && saved.off[i] === true); });
                graphDiff = graphDiff.map(function (on, i) {
                    var d = saved && Array.isArray(saved.d) ? saved.d[i] : false;
                    return d === true || GRAPH_FITS.indexOf(d) > -1 ? d : false;
                });
                graphStyle = graphStyle.map(function (st, i) { // each as kept, else as it starts
                    var was = saved && Array.isArray(saved.s) && saved.s[i] || {};
                    return {
                        d: [0, 1, 2].indexOf(was.d) > -1 ? was.d : 0, w: [0, 1, 2].indexOf(was.w) > -1 ? was.w : 1, l: was.l === true,
                        c: typeof was.c === 'string' && /^#[0-9a-f]{6}$/.test(was.c) ? was.c : null
                    };
                });
                showCells(-1);
                graphFrom.value = saved && typeof saved.from === 'string' ? saved.from : '';
                graphBy.value = saved && typeof saved.by === 'string' ? saved.by : '';
                // the sliders: { a: [its value, from, to] }
                forgetLetters();
                if (saved && saved.p && typeof saved.p === 'object') {
                    Object.keys(saved.p).forEach(function (k) {
                        var q = saved.p[k];
                        if (/^[a-df-wz]$/.test(k) && Array.isArray(q) && q.length === 3 && q.every(function (n) {
                            return typeof n === 'number' && isFinite(n);
                        }) && q[1] < q[2]) {
                            graphVars[k] = q[0];
                            graphRange[k] = [q[1], q[2]];
                        }
                    });
                }
                showGraphTab(saved && saved.tab);
            }

            // no values of letters: the functions read them from this same object, so it is emptied, not replaced
            function forgetLetters() {
                Object.keys(graphVars).forEach(function (k) { delete graphVars[k]; });
                graphRange = {};
            }

            // The functions are read again: a box that is not one yet is marked. A hidden curve has
            // none. The point kept on the old curves goes. Each letter but x has a slider, at 1 from
            // -10 to 10 at first; while a function is typed, the sliders wait until the typing stops.
            // A function named, f(x) = x^2, is made before the boxes that use it, f(x) + 1, f′(x),
            // wherever they are: each time round, the boxes that can be read now; what is left at the
            // end uses a name not made, or one made of itself. A name given twice is of the first box
            function readGraph(typing) {
                var letters = [], texts = graphInputs.map(function (box, i) { return i < graphCount ? box.value.trim() : ''; }),
                    names = texts.map(CalcEngine.named), defs = {}, read = [], left = [], more = true;
                graphRels = [];
                graphPlanes = [];
                graphData = [];
                graphModels = [];
                graphTwice = '';
                graphVersion++;
                names.forEach(function (k, i) {
                    if (!k) return;
                    if (defs.hasOwnProperty(k)) {
                        graphTwice = k;
                        names[i] = false;
                    } else {
                        defs[k] = null;
                    }
                });
                texts.forEach(function (text, i) { if (text && names[i] !== false) left.push(i); });
                while (more) {
                    more = false;
                    left = left.filter(function (i) {
                        var r = readBox(texts[i], defs);
                        if (!r) return true;
                        read[i] = r;
                        if (names[i] && r.fn) defs[names[i]] = r.fn;
                        more = true;
                        return false;
                    });
                }
                graphFns = graphInputs.map(function (box, i) {
                    var text = texts[i], r = read[i] || {}, fn = r.fn || r.model || null, rel = r.rel || null, plane = r.plane || null,
                        data = r.data || null, fit, row = graphRows[i];
                    ((fn || rel || plane || data || {}).letters || []).forEach(function (k) {
                        if (letters.indexOf(k) < 0) letters.push(k);
                    });
                    if (r.model && !graphOff[i]) graphModels[i] = { fn: r.model, keys: r.model.letters };
                    graphRels[i] = graphOff[i] ? null : rel;
                    graphPlanes[i] = graphOff[i] ? null : plane;
                    graphData[i] = graphOff[i] ? null : data;
                    if (!text || rel || plane) graphDiff[i] = false; // an equation has no slope of its own to draw
                    if (!data && graphDiff[i]) graphDiff[i] = true; // the fit of points is the slope of a function typed in their place
                    if (!text) graphOff[i] = false; // what is typed next is shown, without its slope
                    fit = data && graphDiff[i] && CalcEngine.fit(data.filter(finitePoint), fitKind(i)); // the y′ of points is their best fit
                    row.hidden = i >= graphCount;
                    row.classList.toggle('calc-bad', !!text && !fn && !rel && !plane && !data);
                    row.classList.toggle('calc-graph-model', !!r.model);
                    row.classList.toggle('calc-graph-rel', !!(rel || plane));
                    row.classList.toggle('calc-graph-data', !!data);
                    row.classList.toggle('calc-graph-live', !!(data && data.update)); // of letters: no table of numbers to type
                    row.classList.toggle('calc-graph-named', !!CalcEngine.named(text));
                    row.classList.toggle('calc-graph-off', graphOff[i]);
                    row.querySelector('.calc-graph-diff').classList.toggle('calc-on', !!graphDiff[i]);
                    row.querySelector('.calc-graph-diff').classList.toggle('calc-bad', !!(data && graphDiff[i] && !fit));
                    row.querySelector('.calc-graph-diff').textContent = data ? (graphDiff[i] ? fitKind(i) : 'fit') : 'y′';
                    row.classList.toggle('calc-graph-empty', !text);
                    row.querySelector('.calc-graph-swatch').style.setProperty('--c', curveColor(i));
                    return graphOff[i] ? null : data ? fit && fitCurve(fit) : fn;
                });
                fitModels();
                graphModels.forEach(function (m) { // its letters found, not slid
                    letters = letters.filter(function (k) { return m.keys.indexOf(k) < 0; });
                });
                graphRows.forEach(function (row, i) {
                    if (graphModels[i]) row.classList.toggle('calc-bad', !graphModels[i].fit);
                });
                if (graphCellsRow > -1 && (graphCellsRow >= graphCount || !(graphData[graphCellsRow] || !texts[graphCellsRow] ||
                    CalcEngine.points(texts[graphCellsRow], engine.comma)))) showCells(-1); // its box is not of points now
                graphFnList.classList.toggle('calc-graph-single', graphCount < 2);
                graphFnList.classList.toggle('calc-graph-many', graphCount > 3);
                graphAdd.hidden = graphCount >= graphRows.length;
                letters.forEach(function (k) {
                    if (typeof graphVars[k] !== 'number') graphVars[k] = 1;
                    if (!graphRange[k]) graphRange[k] = [-10, 10];
                });
                clearTimeout(graphSliding);
                if (typing && letters.join() !== graphLetters.join()) {
                    graphSliding = setTimeout(function () {
                        showSliders(letters);
                        graphRender(); // the plot has less room, or more
                        saveState();
                    }, 700);
                } else {
                    showSliders(letters);
                }
                graphAt = graphPinned = null;
                graphRender();
            }

            // A slider for each letter: ▶ to play it, its value, to type as well, then where it goes
            // from, the slider and where it goes to, and in the big window Animate and its letter on its
            // border. A value typed beyond the ends takes the end there
            function showSliders(letters) {
                if (letters.join() !== graphLetters.join()) {
                    graphLetters = letters;
                    Object.keys(graphPlay).forEach(function (k) {
                        if (letters.indexOf(k) < 0) delete graphPlay[k]; // its slider goes, as it played
                    });
                    graphSliders.innerHTML = letters.map(function (k) {
                        var box = ' type="text" spellcheck="false" autocomplete="off" maxlength="16"';
                        return '<div class="calc-graph-slider" data-k="' + k + '">' +
                            '<span class="calc-graph-play" role="button" aria-label="' + tr('Play {k}', { k: k }) + '"><svg viewBox="0 0 16 16" width="11" height="11">' +
                            '<path class="calc-graph-go" d="M4.5 2.8v10.4L13 8z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />' +
                            '<path class="calc-graph-stop" d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg></span>' +
                            '<label class="calc-graph-val"><i>' + k + '</i><span>=</span><input' + box + ' aria-label="' + k + ' ="></label>' +
                            '<input class="calc-graph-end"' + box + ' data-end="0" aria-label="' + k + ' from">' +
                            '<input class="calc-graph-range" type="range" aria-label="' + k + '">' +
                            '<input class="calc-graph-end"' + box + ' data-end="1" aria-label="' + k + ' to">' +
                            '<span class="calc-graph-legend" aria-hidden="true">Animate <b>' + k + '</b></span>' +
                            '</div>';
                    }).join('');
                    graphSliders.hidden = !letters.length;
                    graphSliders.classList.toggle('calc-graph-many', letters.length > 2);
                }
                [].forEach.call(graphSliders.children, setSlider);
            }

            // A slider as its letter is now: playing or not, its value, its ends and a step that suits
            // them, 0.1 from -10 to 10. Not a box being typed in, nor one marked as it cannot be
            function setSlider(row) {
                var k = row.dataset.k, r = graphRange[k], step = sliderStep(r), range = row.querySelector('.calc-graph-range'),
                    val = row.querySelector('.calc-graph-val input');
                playButton(row);
                range.max = r[1];
                range.min = r[0];
                range.step = step;
                range.value = graphVars[k];
                if (document.activeElement !== val) {
                    val.value = sliderText(graphVars[k], step);
                    val.parentNode.classList.remove('calc-bad');
                }
                [].forEach.call(row.querySelectorAll('.calc-graph-end'), function (end) {
                    if (document.activeElement === end) return;
                    end.value = local(String(r[end.dataset.end]));
                    end.classList.remove('calc-bad');
                });
            }

            // its button: play, or pause while it plays
            function playButton(row) {
                var k = row.dataset.k, play = row.querySelector('.calc-graph-play');
                play.classList.toggle('calc-on', !!graphPlay[k]);
                play.setAttribute('aria-label', (graphPlay[k] ? 'Pause ' : 'Play ') + k);
            }

            // a hundredth of the slider, or less, as a power of ten
            function sliderStep(r) {
                return Math.pow(10, Math.floor(Math.log10((r[1] - r[0]) / 100)));
            }

            // a value of a slider, to its step: 1.5, not 1.5000000000000002
            function sliderText(v, step) {
                return local(String(+v.toFixed(Math.max(0, Math.min(12, -Math.round(Math.log10(step)))))));
            }

            // a slider dragged, a value or an end typed: the curves follow. It stops playing, there
            graphSliders.addEventListener('input', function (e) {
                var el = e.target, row = el.closest('.calc-graph-slider'), k = row && row.dataset.k, r = k && graphRange[k], n, ok;
                if (!row) return;
                delete graphPlay[k];
                playButton(row);
                if (el.classList.contains('calc-graph-range')) {
                    graphVars[k] = +(+el.value).toPrecision(12);
                    setSlider(row);
                } else {
                    onlyNumber(el);
                    n = boxNumber(el);
                    if (/^-?[.,]?$/.test(el.value)) { // empty, or a number only begun: -, -. — waited for, not marked
                        (el.classList.contains('calc-graph-end') ? el : el.parentNode).classList.remove('calc-bad');
                        return;
                    }
                    ok = isFinite(n);
                    if (el.classList.contains('calc-graph-end')) {
                        ok = ok && (el.dataset.end === '0' ? n < r[1] : n > r[0]);
                        el.classList.toggle('calc-bad', !ok);
                        if (!ok) return;
                        r[el.dataset.end] = n;
                        graphVars[k] = Math.min(r[1], Math.max(r[0], graphVars[k])); // within the ends
                    } else {
                        el.parentNode.classList.toggle('calc-bad', !ok);
                        if (!ok) return;
                        graphVars[k] = n;
                        r[0] = Math.min(r[0], n);
                        r[1] = Math.max(r[1], n);
                    }
                    setSlider(row);
                    saveState();
                }
                graphAt = null; // its points have moved; an area stays, with its curve
                if (graphPinned && !graphPinned.area) graphPinned = null;
                graphRender();
            }, false);

            // ▶ plays a slider, and pauses it
            graphSliders.addEventListener('click', function (e) {
                var play = e.target.closest('.calc-graph-play'), k = play && play.parentNode.dataset.k;
                if (!play) return;
                playSlider(k, !graphPlay[k]);
                if (graphPlay[k]) return;
                graphRender();
                saveState();
            }, false);

            // Played, a slider's value goes to one end and back, over and over, and the curves with
            // it, until it is paused, moved or typed in, or the graph closes; at the top end it starts
            // down. Paused, it stops at a value of its step, as dragging would
            function playSlider(k, on) {
                var row = graphSliders.querySelector('[data-k="' + k + '"]'), step;
                if (on === !!graphPlay[k]) return;
                if (on) {
                    graphPlay[k] = graphVars[k] >= graphRange[k][1] ? -1 : 1;
                    if (!graphFrame) {
                        graphLast = 0;
                        graphFrame = requestAnimationFrame(playFrame);
                    }
                } else {
                    delete graphPlay[k];
                    step = sliderStep(graphRange[k]);
                    graphVars[k] = +(Math.round(graphVars[k] / step) * step).toPrecision(12);
                }
                if (row) setSlider(row);
            }

            // Each slider played a step on, as far as the time since the frame before. A mark moves
            // with its curve, so the one pointed at or clicked goes
            function playFrame(time) {
                var gone = graphLast ? Math.min(100, time - graphLast) : 0;
                graphFrame = 0;
                graphLast = time;
                Object.keys(graphPlay).forEach(function (k) {
                    var r = graphRange[k], v;
                    v = graphVars[k] + graphPlay[k] * (r[1] - r[0]) * gone / GRAPH_PLAY;
                    if (v >= r[1]) graphPlay[k] = -1;
                    if (v <= r[0]) graphPlay[k] = 1;
                    graphVars[k] = Math.min(r[1], Math.max(r[0], v));
                });
                if (!Object.keys(graphPlay).length) return;
                [].forEach.call(graphSliders.children, setSlider);
                if (graphAt && graphAt.t) graphAt = null;
                if (graphPinned && graphPinned.t) graphPinned = null;
                graphRender();
                graphFrame = requestAnimationFrame(playFrame);
            }

            // every slider stops; true if one played
            function stopSliders() {
                var some = Object.keys(graphPlay);
                some.forEach(function (k) { playSlider(k, false); });
                return some.length > 0;
            }

            // The sliders stop for a value to be taken: as the pointer comes onto the popup, which
            // moves with its point while they play, and as a value of the table is pressed, so it is
            // the one pressed that a click takes, and not drawn again under the pointer before the click
            [[graphPop, 'pointerenter'], [graphList, 'pointerdown']].forEach(function (on) {
                on[0].addEventListener(on[1], function () {
                    if (!stopSliders()) return;
                    if (graphTab !== 'table') drawGraph(); // with its marks again; the table is not drawn again under the pointer
                    saveState();
                }, false);
            });

            // let go of: kept
            graphSliders.addEventListener('change', function (e) {
                if (e.target.classList.contains('calc-graph-range')) saveState();
            }, false);

            // a box left as it cannot be shows what the slider has again
            graphSliders.addEventListener('focusout', function (e) {
                var row = e.target.closest('.calc-graph-slider');
                if (row) setTimeout(function () { if (row.parentNode) setSlider(row); }, 0);
            }, false);

            // the tab shown, drawn as it is now; the examples stay as they are, and the plot beside
            // them, big, is drawn too: hidden, it is not
            function graphRender() {
                if (graphTab === 'table') renderTable(); else drawGraph();
            }

            // What a box is: a function of x, an equation or an inequality, a curve of a parameter,
            // points, or a model to fit to them, as { fn }, { rel }, { plane }, { data } or { model }; null if none. A sequence, a(n) = 2n + 1,
            // is a plane too, of its kind seq: it has its range and its extra boxes as a polar curve has;
            // and a slope field, dy/dx = x – y, of its kind field, read before an equation would take it
            // as one of d, y and x. defs: the functions named
            function readBox(text, defs) {
                var m = /^(?:y\s*)?~\s*([\s\S]+)$/.exec(text),
                    r = m ? CalcEngine.graph(m[1], engine.comma, graphVars, defs) : null;
                if (m) return r && r.letters.length ? { model: r } : null; // y ~ a x² + b: a model of letters to fit
                r = CalcEngine.slopeField(text, engine.comma, graphVars, defs) || CalcEngine.sequence(text, engine.comma, graphVars, defs);
                if (r) return { plane: r };
                r = CalcEngine.graph(text, engine.comma, graphVars, defs);
                if (r) return { fn: r };
                if ((r = CalcEngine.relation(text, engine.comma, graphVars, defs))) return { rel: r };
                if ((r = CalcEngine.plane(text, engine.comma, graphVars, defs))) return { plane: r };
                return ((r = CalcEngine.points(text, engine.comma, graphVars, defs))) ? { data: r.update ? r.update(deg) : r } : null;
            }

            // The points of sliders' letters, (a, b), worked out again as the letters and the unit are now, and
            // the best fit of each such box with them; the point pointed at or clicked moves with its own
            function livePoints() {
                var key = JSON.stringify(graphVars) + deg, moved = false;
                graphData.forEach(function (list, i) {
                    var fit;
                    if (!list || !list.update || list.seen === key) return;
                    moved = true;
                    list.seen = key;
                    list.update(deg);
                    fit = graphDiff[i] && CalcEngine.fit(list.filter(finitePoint), fitKind(i));
                    graphFns[i] = fit ? fitCurve(fit) : null;
                    graphRows[i].querySelector('.calc-graph-diff').classList.toggle('calc-bad', !!(graphDiff[i] && !fit));
                    [graphAt, graphPinned].forEach(function (p) {
                        if (p && p.data && p.i === i && list[p.j]) {
                            p.x = list[p.j].x;
                            p.y = list[p.j].y;
                        }
                    });
                });
                if (moved && graphModels.some(Boolean)) { // the models fitted to them again, the key as they leave the letters
                    fitModels();
                    graphData.forEach(function (list) { if (list && list.update) list.seen = JSON.stringify(graphVars) + deg; });
                }
            }

            // Each model fitted to the points of the nearest box of points above it, else below it: its
            // letters set to the values that bring it nearest them, and those shown below the sliders
            function fitModels() {
                graphModels.forEach(function (m, i) {
                    var j, of = -1;
                    for (j = i - 1; j >= 0 && of < 0; j--) if (graphData[j]) of = j;
                    for (j = i + 1; j < graphData.length && of < 0; j++) if (graphData[j]) of = j;
                    m.of = of;
                    m.fit = of > -1 ? CalcEngine.fitModel(graphData[of].filter(finitePoint), m.fn, m.keys, graphVars, deg) : null;
                });
                showFits();
            }

            // below the sliders, a line of each model, in its color: its values, each to put into the
            // calculation with a click, and r²; or why it has none
            function showFits() {
                var lines = [];
                graphModels.forEach(function (m, i) {
                    lines.push('<div class="calc-graph-fit" style="--c: ' + curveColor(i) + '">' + (!m.fit ?
                        '<span class="calc-graph-fit-none">' + (m.of < 0 ? 'No points to fit: type them in a box above it.' :
                            (graphData[m.of].length < m.keys.length ? tr('No fit: more points than letters are needed.') : tr('No fit: it comes near none of them.'))) + '</span>' :
                        m.keys.map(function (k) {
                            return '<span class="calc-graph-fit-val" data-k="' + k + '"><i>' + k + '</i> = ' + local(String(+m.fit.values[k].toPrecision(6))) + '</span>';
                        }).join('') + '<span class="calc-graph-fit-r2"><i>r</i>² = ' + local(String(+m.fit.r2.toPrecision(6))) + '</span>') + '</div>');
                });
                graphFits.innerHTML = lines.join('');
                graphFits.hidden = !lines.length;
            }

            // a value of a fit clicked goes into the calculation, as a value of the table does
            graphFits.addEventListener('click', function (e) {
                var val = e.target.closest('.calc-graph-fit-val'), n = val && graphVars[val.dataset.k];
                if (!val || !isFinite(n) || !engine.put(n)) return;
                keyBoard['AC'].children[0].firstChild.data = 'C';
                showGraph(false);
                refresh();
                saveState();
                if (graphAlone) ask('graph-put');
            }, false);

            // a point with an x and a y: (sqrt(a), 1) has none while a is below 0
            function finitePoint(q) {
                return isFinite(q.x) && isFinite(q.y);
            }

            // the best fit of points as a curve, with fit: its kind, numbers and r²
            function fitCurve(fit) {
                return { at: fit.at, angles: false, letters: [], fit: fit };
            }

            // y = 1.95x + 0.1, r² = 0.998, as the picture names a best fit; a number of 0 leaves its part out
            function fitText(f) {
                var k = f.k, terms = {
                    lin: [[k[0], 'x'], [k[1], '']],
                    quad: [[k[0], 'x²'], [k[1], 'x'], [k[2], '']],
                    exp: [[k[0], ' · ' + local(String(k[1])) + 'ˣ']],
                    pow: [[k[0], 'x^' + local(String(k[1]))]],
                    log: [[k[0], ''], [k[1], ' ln x']]
                }[f.kind].filter(function (t, i, all) { return t[0] || (i === all.length - 1 && all.every(function (u) { return !u[0]; })); });
                return 'y = ' + terms.map(function (t, i) {
                    return (t[0] < 0 ? (i ? ' – ' : '–') : i ? ' + ' : '') + local(String(Math.abs(t[0]))) + t[1];
                }).join('') + ',  r² = ' + local(String(+f.r2.toPrecision(4)));
            }

            // the line of an equation that a point is on: the equation, or of an inequality of two, its part k
            function relPart(p) {
                var r = graphRels[p.i];
                return r && (r.parts ? r.parts[p.k || 0] : r);
            }

            // how far into a region a place is, as the engine has it: of an inequality where it holds,
            // of an equation on the side of it where its difference has the sign side
            function regionInto(rel, side) {
                return function (x, y) { return CalcEngine.within(rel, x, y, deg, side); };
            }

            // true if a curve has a function of an angle, so its x follows Deg or Rad
            function graphAngles() {
                return graphFns.concat(graphRels).some(function (fn) { return fn && fn.angles; });
            }

            // What the plot shows. Until it is moved or zoomed it is the start: x from -10 to 10 with
            // y as much each pixel, or for a function of an angle in degrees, x a turn either way
            // With same scale, its y as long a unit as its x, about the same middle
            // On a log scale, x from 0.01 to 100 at the start, its powers of ten as far apart as y's, the view
            // keeping x as its power of ten
            function viewNow() {
                var u = GRAPH_WIDTH / plotWidth(),
                    v = graphView || { x: 0, y: 0, ux: graphAngles() && deg ? u * (deg === 2 ? 40 : 36) : u, uy: u };
                if (!graphView && graphLook.logx) v = { x: 0, y: v.y, ux: GRAPH_DECADES / plotWidth(), uy: v.uy };
                if (!graphView && graphLook.logy) v = { x: v.x, y: 0, ux: v.ux, uy: GRAPH_DECADES / plotWidth() };
                if (graphLook.logx) v = { x: logWithin(v.x, graphPlot.clientWidth / 2 * v.ux), y: v.y, ux: v.ux, uy: v.uy };
                if (graphLook.logy) v = { x: v.x, y: logWithin(v.y, graphPlot.clientHeight / 2 * v.uy), ux: v.ux, uy: v.uy };
                return squareOn() && v.uy !== v.ux / squareRatio() ? { x: v.x, y: v.y, ux: v.ux, uy: v.ux / squareRatio() } : v;
            }

            // the middle of a log scale, its power of ten, moved so the view half either way of it stays
            // where numbers reach, 10^-307 to 10^308: past them they are 0 or Infinity, and what is drawn
            // of them leaps to an edge
            function logWithin(s, half) {
                var lo = Math.log10(2.2250738585072014e-308) + half, hi = Math.log10(Number.MAX_VALUE) - half;
                return lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, s));
            }

            // same scale, unless an axis is on a log scale
            function squareOn() {
                return graphLook.square && !graphLook.logx && !graphLook.logy;
            }

            // a value as where the view has it, its power of ten on a log scale, none at 0 or below; and back
            function scaleX(x) {
                return graphLook.logx ? Math.log10(x) : x;
            }

            function scaleY(y) {
                return graphLook.logy ? Math.log10(y) : y;
            }

            function valueX(s) {
                return graphLook.logx ? Math.pow(10, s) : s;
            }

            function valueY(s) {
                return graphLook.logy ? Math.pow(10, s) : s;
            }

            // what a pixel is at x, or y: on a log scale more as it is farther from 0
            function pixelX(v, x) {
                return graphLook.logx ? Math.abs(x) * Math.LN10 * v.ux : v.ux;
            }

            function pixelY(v, y) {
                return graphLook.logy ? Math.abs(y) * Math.LN10 * v.uy : v.uy;
            }

            // how many units of x are as long as one of y with same scale: one, or of a curve of an angle in Deg
            // or Grad, as many as a radian, so sin x has the shape it has in Rad and its slope at 0 is at 45°
            function squareRatio() {
                return graphAngles() && deg ? (deg === 2 ? 200 : 180) / Math.PI : 1;
            }

            // the plot's width, as it was last drawn while the table hides it
            function plotWidth() {
                return graphPlot.clientWidth || graphWidth || 340;
            }

            // the x and y of a place on the plot, in its pixels, and back
            function graphX(v, px) {
                return valueX(v.x + (px - graphPlot.clientWidth / 2) * v.ux);
            }

            function graphY(v, py) {
                return valueY(v.y - (py - graphPlot.clientHeight / 2) * v.uy);
            }

            function plotX(v, x) {
                return graphPlot.clientWidth / 2 + (scaleX(x) - v.x) / v.ux;
            }

            function plotY(v, y) {
                return graphPlot.clientHeight / 2 - (scaleY(y) - v.y) / v.uy;
            }

            // the space between lines of the grid: 1, 2 or 5 times a power of ten, some 50 pixels
            // or more. Degrees go by 15, 30, 45, 90 and 180, as angles are drawn; radians by π/4, π/2,
            // π, 2π, 5π, 10π and 20π. angles: what gridAngles gives
            function gridStep(u, angles) {
                var want = u * 50, p = Math.pow(10, Math.floor(Math.log10(want))), m = want / p;
                if (angles === 'deg' && want > 10 && want <= 180) return [15, 30, 45, 90, 180].filter(function (d) { return d >= want; })[0];
                if (angles === 'rad' && want > Math.PI / 8 && want <= 20 * Math.PI) {
                    return Math.PI * [0.25, 0.5, 1, 2, 5, 10, 20].filter(function (d) { return d * Math.PI >= want; })[0];
                }
                return p * (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10);
            }

            // the unit the grid of x goes by: 'deg' or 'rad' for a curve of an angle in Deg or Rad, else false;
            // in Rad with same scale none, its lines as far apart as those of y, so its squares are square
            function gridAngles() {
                return graphAngles() && (deg === 1 ? 'deg' : deg === 0 && !squareOn() ? 'rad' : false);
            }

            // a number of the grid, as short as its step lets it be: 0.5, 20, 1e+8, with the decimal mark
            // in use; with as many digits as tell it from the next, 9.240000005e+13 far out. Of a step of
            // π, so many parts of π, as short as they go: π/4, π/2, 3π/2, 2π, -5π, 2π/3
            function gridLabel(n, step) {
                var a = Math.abs(n), d = piParts(step), q, g;
                if (a < step / 2) return '0';
                if (d) {
                    q = Math.round(n / Math.PI * d);
                    for (g = d; Math.abs(q) % g || d % g; g--); // what both are a whole number of
                    return (q < 0 ? '-' : '') + (Math.abs(q) === g ? '' : Math.abs(q) / g) + 'π' + (g === d ? '' : '/' + d / g);
                }
                if (a >= 1e6 || a < 1e-4) return local(n.toExponential(Math.min(14, Math.max(2, Math.ceil(Math.log10(a / step))))).replace(/\.?0+e/, 'e'));
                return local(String(+n.toFixed(Math.max(0, 1 - Math.floor(Math.log10(step))))));
            }

            // The lines of an axis on a log scale, n pixels long: { major, minor, labels: the values of each, and even: of
            // less than a power of ten, the step of it as a straight scale has it from a pixel half way, else 0 }. Each
            // power of ten, or every 2nd, 3rd, 5th, 10th… to be 40 pixels apart or more (28 up y), the others minor; with
            // room, 2 to 9 times each minor too, and 2 and 5 named. Kept for each axis while its view stays, as the
            // grid and the axes are drawn apart; none past the powers of ten numbers reach, 10^-323 to 10^308
            var logKept = [];
            function logTicks(v, y, n) {
                var u = y ? v.uy : v.ux, c = y ? v.y : v.x, s0 = c - n / 2 * u, s1 = c + n / 2 * u, d = 1 / u, key = [c, u, n].join(),
                    lo = Math.pow(10, s0), hi = Math.pow(10, s1), out = { major: [], minor: [], labels: [], even: 0 }, every, e, m, at, step, fine, k;
                if (logKept[+y] && logKept[+y].key === key) return logKept[+y].out;
                logKept[+y] = { key: key, out: out };
                if (s1 - s0 < 1) {
                    step = out.even = gridStep((hi - lo) / n, false);
                    fine = minorStep(step, false);
                    k = Math.round(step / fine);
                    for (e = Math.ceil(lo / step); e * step <= hi; e++) out.major.push(+(e * step).toPrecision(12));
                    for (e = Math.ceil(lo / fine); fine / (hi * Math.LN10 * u) >= 6 && e * fine <= hi; e++) if (e % k) out.minor.push(e * fine);
                    out.labels = out.major;
                    return out;
                }
                for (every = 1; every * d < (y ? 28 : 40); every = every < 3 ? every + 1 : every < 5 ? 5 : every * 2);
                for (e = Math.max(-323, Math.floor(s0)); e <= Math.min(308, Math.ceil(s1)); e++) {
                    at = Math.pow(10, e);
                    if (at >= lo && at <= hi) out[e % every ? 'minor' : 'major'].push(at);
                    for (m = 2; every === 1 && d >= 45 && m <= 9; m++) {
                        if (m * at < lo || m * at > hi) continue;
                        out.minor.push(m * at);
                        if (d >= 120 && (m === 2 || m === 5) && Math.abs(e) <= 4) out.labels.push(m * at);
                    }
                }
                if (every > 1 && d < 6) out.minor = [];
                out.labels = out.labels.concat(out.major).sort(function (a, b) { return a - b; });
                return out;
            }

            // a number of a log scale: 0.001 to 10000 as they are, else 10⁵, 2×10⁻⁶
            function logLabel(n) {
                var e = Math.floor(Math.log10(n) + 1e-9), m = Math.round(n / Math.pow(10, e));
                if (e >= -4 && e <= 4) return local(String(+n.toPrecision(12)));
                return (m > 1 ? m + '×' : '') + '10' + String(e).replace(/./g, function (c) { return '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]; });
            }

            // The parts of π a step of the grid is a whole number of, the fewest up to 12: 4 of π/4, 2 of 3π/2,
            // 3 of 2π/3 typed, 1 of 2π; 0 if none, as of 10^-10, as near as it is to none of them
            function piParts(step) {
                var d, q;
                for (d = 1; d <= 12; d++) {
                    q = step / Math.PI * d;
                    if (Math.round(q) >= 1 && Math.abs(q - Math.round(q)) < 1e-9) return d;
                }
                return 0;
            }

            // A step typed for the grid: 0.5, 2, π, π/2, 2π/3, pi/4, with the decimal mark in use; 0 for
            // none, NaN if it is not one
            function stepOf(text) {
                var t = String(text).trim(), m = /^([0-9]*(?:[.,][0-9]*)?(?:e[-+]?[0-9]+)?)\s*(π|pi)?\s*(?:\/\s*([0-9]+(?:[.,][0-9]+)?))?$/i.exec(t), n;
                if (!t) return 0;
                if (!m || !m[1] && !m[2]) return NaN;
                n = (m[1] ? +m[1].replace(',', '.') : 1) * (m[2] ? Math.PI : 1) / (m[3] ? +m[3].replace(',', '.') : 1);
                return n > 0 && isFinite(n) ? n : NaN;
            }

            // the step of the grid typed, doubled as often as its lines would be closer than 12 pixels; 0 if none
            function typedStep(text, u) {
                var step = stepOf(text), k;
                if (!(step > 0)) return 0;
                for (k = 0; step / u < 12 && k < 80; k++) step *= 2;
                return step;
            }

            // an x of the pointer, rounded to what a pixel tells apart: 1.53, not 1.5327869
            function graphRound(x, u) {
                var q = Math.pow(10, Math.floor(Math.log10(u)));
                return +(Math.round(x / q) * q).toPrecision(12);
            }

            // x or y of a place pointed at or clicked, a pixel being u: a round number within 3 pixels, or
            // near of them, the roundest, of 1, 2 or 5 times a power of ten no closer than 10 pixels apart:
            // 2 and not 2.04; else as graphRound has it
            function graphNice(x, u, near) {
                var s = gridStep(u, false), r, m;
                while (s >= 10 * u * (1 - 1e-9)) {
                    r = Math.round(x / s) * s;
                    if (Math.abs(r - x) <= (near || 3) * u) return +r.toPrecision(12);
                    m = Math.round(s / Math.pow(10, Math.floor(Math.log10(s)) ));
                    s = m === 5 ? s * 0.4 : s / 2;
                }
                return graphRound(x, u);
            }

            // how round n is, a pixel being u: the coarsest 1, 2 or 5 times a power of ten it is a whole
            // number of, in pixels; 0 if that is under 10 of them, as graphNice, and no end to it for 0
            function graphRoundness(n, u) {
                var s, m;
                if (!n) return Infinity;
                for (s = Math.pow(10, Math.ceil(Math.log10(Math.abs(n)))); s >= 10 * u * (1 - 1e-9); s = m === 5 ? s * 0.4 : s / 2) {
                    if (Math.abs(n / s - Math.round(n / s)) < 1e-6) return s / u;
                    m = Math.round(s / Math.pow(10, Math.floor(Math.log10(s))));
                }
                return 0;
            }

            function drawGraph() {
                var w = graphPlot.clientWidth, h = graphPlot.clientHeight, r = Math.max(graphSharp, (window.devicePixelRatio || 1) * scale()),
                    ctx = graphDrawTo || graphCanvas.getContext('2d', { willReadFrequently: true }), v, key;
                if (!graph.classList.contains('calc-open') || !w || !h) return;
                graphWidth = w;
                v = viewNow();
                clearTimeout(graphFine);
                graphUntil = graphDrawTo || graphRough === 'fine' ? 0 : Date.now() + GRAPH_DRAW_TIME; // saved as a picture, all of it in full
                graphRough = false;
                livePoints();
                if (!graphDrawTo && (graphCanvas.width !== Math.round(w * r) || graphCanvas.height !== Math.round(h * r))) {
                    graphCanvas.width = Math.round(w * r); // as sharp as the screen, however the page scales the calculator
                    graphCanvas.height = Math.round(h * r);
                }
                ctx.setTransform(r, 0, 0, r, 0, 0);
                ctx.clearRect(0, 0, w, h);
                drawGrid(ctx, v, w, h, false);
                if (graphPinned && graphPinned.area) graphShade(ctx, v, w, h, graphPinned);
                graphFns.forEach(function (fn, i) {
                    (fn ? fn.family || [fn] : []).forEach(function (c) { // of a list, each of its curves
                        drawCurve(ctx, v, w, h, c, curveColor(i), false, graphStyle[i]);
                        if (graphDiff[i] && !graphData[i]) drawCurve(ctx, v, w, h, slopeCurve(c), curveColor(i), true, graphStyle[i]);
                    });
                    if (graphRels[i]) drawRelation(ctx, v, w, h, graphRels[i], curveColor(i), graphStyle[i]);
                    if (graphPlanes[i]) ({ seq: drawSequence, field: drawField }[graphPlanes[i].kind] || drawPlane)(ctx, v, w, h, graphPlanes[i], curveColor(i), graphStyle[i]);
                });
                graphTangent(ctx, v, w + h, graphPinned);
                drawGrid(ctx, v, w, h, true);
                key = [graphVersion, v.x, v.y, v.ux, v.uy, w, h, deg, JSON.stringify(graphVars), graphLook.logx, graphLook.logy].join();
                if (Object.keys(graphPlay).length) { // while sliders play the marks wait, found again as they stop: finding them each frame is too slow
                    graphMarks = dataMarks();
                } else {
                    if (!graphMarksKept || graphMarksKept.key !== key || graphMarksKept.rough && !graphUntil) {
                        graphMarksKept = { key: key, rough: false };
                        graphMarksKept.marks = graphLayers().reduce(function (all, fns, f) { // of a list, of each of its curves, f its place
                            var found = CalcEngine.keyPoints(fns, { x0: graphX(v, 0), x1: graphX(v, w), y0: graphY(v, h), y1: graphY(v, 0), logx: graphLook.logx, until: graphUntil },
                                deg, f ? [] : graphRels, f ? [] : graphPlanes);
                            if (found.rough) graphMarksKept.rough = true;
                            return all.concat(found.map(function (m) { if (f) m.f = f; return m; }));
                        }, []);
                    }
                    if (graphMarksKept.rough) graphRough = true;
                    graphMarks = graphBusy(graphMarksKept.marks).concat(dataMarks());
                }
                graphMarks.forEach(function (p) {
                    if (p.data) graphDot(ctx, v, p, 3.5, curveColor(p.i), curveColor(p.i)); // a point typed: full
                    else graphDot(ctx, v, p, 3.5, GRAPH_INK.paper, curveColor(p.i));
                });
                pointLabels(ctx, v);
                if (graphShading && graphEdge) graphEdgeLine(ctx, v, h, graphEdge);
                [graphAt, graphPinned].forEach(function (p, at) {
                    if (!p || p.area || (at && p === graphAt)) return;
                    if (!p.t && !p.spot && p.sol !== undefined && graphPlanes[p.i]) p.y = solutionAt(graphPlanes[p.i], p.sol, p.x); // on its solution as the letters are now
                    else if (!p.t && !p.spot && p.u !== undefined && graphPlanes[p.i]) onPlane(p);
                    else if (!p.t && !p.spot && graphFns[p.i]) p.y = curveAt(p).at(p.x, deg, true); // on the curve as the unit is now
                    else if (!p.t && !p.spot && graphRels[p.i]) onEquation(v, p);
                    if (!isFinite(p.y) || Math.abs(plotY(v, p.y)) > 1e6) return;
                    if (p.spot) {
                        if (p === graphPinned) graphCross(ctx, v, p); // the pointer is cross enough until a click
                    } else graphDot(ctx, v, p, 4.5, curveColor(p.i), GRAPH_INK.paper);
                });
                graphShown();
                placePop(v);
                fillWindow(v, w, h);
                if (graphRough && graphUntil) graphFine = setTimeout(function () { // still a moment: all of it in full
                    graphRough = 'fine';
                    drawGraph();
                }, GRAPH_STILL);
            }

            // Of a box of points whose menu labels them, each point's x and y beside it, up and to the right,
            // in its color on a rim of the paper, as the numbers of the axes are; a point named, its name, before them
            function pointLabels(ctx, v) {
                var f = root.classList.contains('calc-big') ? app.popZoom : 1;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.lineWidth = 3;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = GRAPH_INK.paper;
                graphData.forEach(function (list, i) {
                    if (!list || !graphStyle[i].l && !list.name) return;
                    ctx.fillStyle = curveColor(i);
                    list.filter(finitePoint).forEach(function (q) {
                        var text = graphStyle[i].l ? '(' + local(String(+q.x.toPrecision(6))) + (engine.comma ? '; ' : ', ') + local(String(+q.y.toPrecision(6))) + ')' : '',
                            x = plotX(v, q.x) + 5 * f, y = plotY(v, q.y) - 4 * f;
                        if (list.name) { // a little bigger
                            ctx.font = 13 * f + 'px Play, sans-serif';
                            ctx.strokeText(list.name, x, y);
                            ctx.fillText(list.name, x, y);
                            x += ctx.measureText(list.name + ' ').width;
                        }
                        ctx.font = 11 * f + 'px Play, sans-serif';
                        ctx.strokeText(text, x, y);
                        ctx.fillText(text, x, y);
                    });
                });
            }

            // the points typed in the boxes, as marks to point at and click
            function dataMarks() {
                var out = [];
                graphData.forEach(function (list, i) {
                    (list || []).forEach(function (q, j) { if (finitePoint(q)) out.push({ t: ['data'], x: q.x, y: q.y, i: i, j: j, data: true }); });
                });
                return out;
            }

            // a point on a curve of a parameter, at its parameter as the letters are now
            function onPlane(p) {
                var q = graphPlanes[p.i].at(p.u, deg);
                p.x = q[0];
                p.y = q[1];
            }

            // a point on an equation, on it again as the letters and the view are now: where it was if
            // it is not
            function onEquation(v, p) {
                var q = CalcEngine.onRelation(relPart(p), p.x, p.y, pixelX(v, p.x), pixelY(v, p.y), deg);
                if (q) {
                    p.x = q.x;
                    p.y = q.y;
                }
            }

            // The slope of the point clicked on a curve, for its popup, and its tangent, dashed in
            // the curve's color across the plot, as long as the plot is wide and high (far); on an
            // equation, upright where it goes straight up, with no slope in the popup. None for a
            // place off the curves, where two cross, or where the curve has no slope
            function graphTangent(ctx, v, far, p) {
                var one = p && !p.spot && !p.area && !p.data && p.j === undefined, plane = one && p.u !== undefined && graphPlanes[p.i],
                    field = one && p.sol !== undefined && graphPlanes[p.i], fn = one && !plane && !field && curveAt(p), rel = one && !fn && !plane && !field && relPart(p), x, y, k;
                if (!p) return;
                p.m = NaN;
                if ((!fn && !rel && !plane && !field) || (plane && plane.kind === 'seq')) return; // a sequence is of dots, with no slope
                if (fn && !p.t) p.y = fn.at(p.x, deg, true); // on the curve as the unit and the letters are now
                p.m = field ? field.at(p.x, p.y, deg) : fn ? CalcEngine.slope(fn, p.x, deg) : rel ? CalcEngine.relationSlope(rel, p.x, p.y, deg) : planeSlope(plane, p.u); // of a solution, its field's slope there
                if (isNaN(p.m) || !isFinite(p.y)) return;
                x = plotX(v, p.x);
                y = plotY(v, p.y);
                k = isFinite(p.m) ? -p.m * v.ux / v.uy : 0; // its slope in pixels, down the plot
                if (isFinite(p.m) && logOn()) { // on a log scale a curve, drawn as one
                    ctx.beginPath();
                    CalcEngine.trace(logCurve({
                        at: function (t) { return p.y + p.m * (t - p.x); },
                        reach: function (a, b) {
                            var ya = p.y + p.m * (a - p.x), yb = p.y + p.m * (b - p.x);
                            return [Math.min(ya, yb), Math.max(ya, yb), true];
                        }
                    }), drawBox(v, graphPlot.clientWidth, graphPlot.clientHeight), deg).forEach(function (line) {
                        ctx.moveTo(line[0], line[1]);
                        for (k = 2; k < line.length; k += 2) ctx.lineTo(line[k], line[k + 1]);
                    });
                    ctx.setLineDash([5, 4]);
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = curveColor(p.i);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    return;
                }
                if (!isFinite(p.m)) { // straight up
                    ctx.beginPath();
                    ctx.moveTo(x, y - far);
                    ctx.lineTo(x, y + far);
                    ctx.setLineDash([5, 4]);
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = curveColor(p.i);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    return;
                }
                far /= Math.sqrt(1 + k * k);
                ctx.beginPath();
                ctx.moveTo(x - far, y - k * far);
                ctx.lineTo(x + far, y + k * far);
                ctx.setLineDash([5, 4]);
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = curveColor(p.i);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // the slope of a curve of a parameter at u, dy/dx: how y goes with it over how x goes;
            // Infinity where x stands still, none where both do
            function planeSlope(c, u) {
                var span = c.range(deg), h = 1e-6 * Math.max(1, Math.abs(span[1] - span[0])), a = c.at(u - h, deg), b = c.at(u + h, deg),
                    dx = b[0] - a[0], dy = b[1] - a[1], m;
                if (!isFinite(dx) || !isFinite(dy) || (!dx && !dy)) return NaN;
                if (Math.abs(dx) <= 1e-9 * Math.abs(dy)) return Infinity;
                m = dy / dx;
                return Math.abs(m) <= 1e-9 ? 0 : +m.toPrecision(8);
            }

            // A curve of a parameter, from places evenly along it as the parameter goes from its start
            // to its end, 2000, or one each quarter of a radian of it up to 50000, so no turn is lost
            // between two: r = θ/2 to 7720π goes round 3860 times. Between them as the engine traces it,
            // as a curve of x is: on until it is a curve and not lines too long to draw, broken where it
            // jumps, on to the edge where it has no end, as r = 1/cos θ at 90° however far it is zoomed.
            // The places along it are kept while the unit and its letters stay; those on the plot while the view does too
            // What the engine draws in: the view from x at its left to its right, and y at its bottom to its top, w by h pixels;
            // on a log scale their powers of ten, and the curves as the engine sees them there (logCurve, logPlane, logRelation)
            function drawBox(v, w, h) {
                return { x0: v.x - graphPlot.clientWidth / 2 * v.ux, x1: v.x + (w - graphPlot.clientWidth / 2) * v.ux,
                    y0: v.y - (h - graphPlot.clientHeight / 2) * v.uy, y1: v.y + graphPlot.clientHeight / 2 * v.uy, w: w, h: h, until: graphUntil };
            }

            function logOn() {
                return graphLook.logx || graphLook.logy;
            }

            // what a value reaches, [low, high, whole], as its power of ten: nothing of it at 0 or below, all the
            // way down where it reaches 0
            function logReach(r, on) {
                if (!on || !r || isNaN(r[0])) return r;
                if (!(r[1] > 0)) return [NaN, NaN, false];
                return [r[0] > 0 ? Math.log10(r[0]) : -Infinity, Math.log10(r[1]), r[2]];
            }

            // an x of its power of ten, none past what numbers reach: above 10^308 it is Infinity and below
            // 10^-323 it is 0, so log x there would leap to the top or the bottom
            function logX(s) {
                var x = valueX(s);
                return !graphLook.logx || x > 0 && x < Infinity ? x : NaN;
            }

            function logY(t) {
                var y = valueY(t);
                return !graphLook.logy || y > 0 && y < Infinity ? y : NaN;
            }

            // a curve of x on log scales: of x's power of ten, its value's; nothing past what numbers reach
            function logCurve(c) {
                if (!logOn()) return c;
                return {
                    at: function (s, d, exact) { return scaleY(c.at(logX(s), d, exact)); },
                    reach: c.reach && function (a, b, d) {
                        var x0 = valueX(a), x1 = valueX(b), r;
                        if (!graphLook.logx) return logReach(c.reach(x0, x1, d), graphLook.logy);
                        if (!(x1 > 0 && x0 < Infinity)) return [NaN, NaN, false];
                        r = c.reach(Math.max(x0, Number.MIN_VALUE), Math.min(x1, Number.MAX_VALUE), d);
                        if (r && (x0 === 0 || x1 === Infinity)) r = [r[0], r[1], false]; // not all of it a number
                        return logReach(r, graphLook.logy);
                    },
                    piece: c.piece && function (s, d) { return c.piece(logX(s), d); }
                };
            }

            // a curve of a parameter on log scales: its x and y each as its power of ten on its own
            function logPlane(c) {
                if (!logOn()) return c;
                return {
                    at: function (u, d) { var q = c.at(u, d); return [scaleX(q[0]), scaleY(q[1])]; },
                    reach: c.reach && function (a, b, d) {
                        var r = c.reach(a, b, d);
                        return r && [logReach(r[0], graphLook.logx), logReach(r[1], graphLook.logy)];
                    }
                };
            }

            // an equation or inequality of x and y on log scales: of their powers of ten
            function logRelation(rel) {
                function part(p) {
                    return {
                        op: p.op,
                        at: function (s, t, d) { return p.at(logX(s), logY(t), d); },
                        reach: p.reach && function (s0, s1, t0, t1, d) { return p.reach(valueX(s0), valueX(s1), valueY(t0), valueY(t1), d); }
                    };
                }
                if (!logOn()) return rel;
                return rel.parts ? { op: rel.op, parts: rel.parts.map(part) } : part(rel);
            }

            function drawPlane(ctx, v, w, h, c, color, style) {
                var at = [deg].concat(c.letters.map(function (k) { return graphVars[k]; })).join(),
                    key = [v.x, v.y, v.ux, v.uy, w, h, at, graphLook.logx, graphLook.logy].join();
                if (!c.along || c.along.key !== at) {
                    (function () {
                        var ends = c.range(deg), turn = [2 * Math.PI, 360, 400][deg] / (2 * Math.PI),
                            n = Math.min(50000, Math.max(2000, Math.ceil((ends[1] - ends[0]) / turn / 0.25))), us = [], qs = [], k;
                        for (k = 0; k <= n; k++) {
                            us.push(ends[0] + (ends[1] - ends[0]) * k / n);
                            qs.push(c.at(us[k], deg));
                        }
                        c.along = { key: at, us: us, qs: qs };
                    })();
                }
                if (!c.kept || c.kept.key !== key) {
                    c.kept = CalcEngine.traceAlong(logPlane(c), drawBox(v, w, h), deg, c.along.us, logOn() ? c.along.qs.map(function (q) { return [scaleX(q[0]), scaleY(q[1])]; }) : c.along.qs);
                    c.kept.key = key;
                }
                ctx.beginPath();
                c.kept.lines.forEach(function (line) {
                    var k;
                    ctx.moveTo(line[0], line[1]);
                    for (k = 2; k < line.length; k += 2) ctx.lineTo(line[k], line[k + 1]);
                });
                ctx.strokeStyle = color;
                strokeAs(ctx, style, false);
            }

            // A sequence, a dot in its color at each of its terms in the view, at each whole n: smaller
            // where they are close together, so they stay apart
            function drawSequence(ctx, v, w, h, c, color) {
                var r = c.terms(deg), size = Math.min(3, Math.max(1.2, 0.35 / pixelX(v, graphX(v, w / 2)))), n, px, py,
                    last = Math.min(r.from + r.list.length - 1, Math.floor(graphX(v, w + 4)));
                ctx.beginPath();
                for (n = Math.max(r.from, Math.ceil(graphX(v, -4))); n <= last; n++) {
                    py = plotY(v, r.list[n - r.from]);
                    if (!(py > -4 && py < h + 4)) continue; // out of the view, or of no value
                    px = plotX(v, n);
                    ctx.moveTo(px + size, py);
                    ctx.arc(px, py, size, 0, 2 * Math.PI);
                }
                ctx.fillStyle = color;
                ctx.fill();
            }

            // the next term of a sequence from the point p on it, step on that way, past those of no
            // value, as far as its last; null where there is none
            function traceSequence(p, i, dir, step) {
                var r = graphPlanes[i].terms(deg), last = r.from + r.list.length - 1, n = Math.max(r.from, Math.min(last, p.u + dir * step));
                while (n >= r.from && n <= last && n !== p.u && isNaN(r.list[n - r.from])) n += dir;
                if (n < r.from || n > last || n === p.u) return null;
                return { i: i, u: n, x: n, y: r.list[n - r.from] };
            }

            // What stops a sequence drawn, said, of the first one stopped: '' where none is. bad: of one
            // whose term is of one before its first, which it cannot be; else of one too large to draw
            // on, or of no value, or of more than 10000 terms
            function sequenceNote(bad) {
                var out = '';
                graphPlanes.some(function (c) {
                    var s = c && c.kind === 'seq' && c.terms(deg).stop, a = c && c.name;
                    if (!s || (s.why === 'before') !== bad) return false;
                    out = s.why === 'before' ? a + '(' + s.n + ') is of ' + a + '(' + s.need + '), before its first term: give that one too, {' + a + '(' + s.need + ') = …}.' :
                        s.why === 'large' ? tr('{a}({n}) is too large to draw: the sequence stops there.', { a: a, n: s.n }) :
                            s.why === 'none' ? tr('{a}({n}) has no value, so the terms after it have none: the sequence stops there.', { a: a, n: s.n }) :
                                tr('The first 10000 terms of {a}: n up to {n}.', { a: a, n: (s.n - 1) });
                    return true;
                });
                return out;
            }

            // A slope field: a short line across each place of a grid, 22 pixels apart, at the slope
            // there, fainter in its color, none where it has no slope and upright where it goes straight
            // up; the places at the middles of the grid's squares, so that none is on an axis, and fixed
            // to the plane as it moves. Then the solution through each start given, in its color and its
            // line, a dot where it starts
            function drawField(ctx, v, w, h, c, color, style) {
                var gap = 22, half = gap * 0.31, sx = gap * v.ux, sy = gap * v.uy, box = drawBox(v, w, h), i, j, x, y, px, py, m, k, dx, dy, shown = 0;
                ctx.beginPath();
                for (i = Math.floor(box.x0 / sx); (i + 0.5) * sx <= box.x1; i++) { // as the view keeps x and y: on a log scale, their powers of ten
                    for (j = Math.floor(box.y0 / sy); (j + 0.5) * sy <= box.y1; j++) {
                        x = valueX((i + 0.5) * sx);
                        y = valueY((j + 0.5) * sy);
                        m = c.at(x, y, deg);
                        if (isNaN(m)) continue;
                        shown++;
                        px = plotX(v, x);
                        py = plotY(v, y);
                        k = -m * pixelX(v, x) / pixelY(v, y); // its slope in pixels, down the plot
                        dx = isFinite(k) ? half / Math.sqrt(1 + k * k) : 0;
                        dy = isFinite(k) ? k * dx : half;
                        ctx.moveTo(px - dx, py - dy);
                        ctx.lineTo(px + dx, py + dy);
                    }
                }
                c.none = !shown; // of no slope anywhere in the view, for the note
                ctx.lineWidth = 1.2;
                ctx.lineCap = 'round';
                ctx.globalAlpha = 0.55;
                ctx.strokeStyle = color;
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.lineCap = 'butt';
                fieldSolutions(c, v, w, h).forEach(function (s) {
                    var on = false;
                    ctx.beginPath();
                    s.pts.forEach(function (q) {
                        var a = plotX(v, q[0]), b = plotY(v, q[1]), ok = Math.abs(b) < 1e5;
                        if (ok && on) ctx.lineTo(a, b); else if (ok) ctx.moveTo(a, b);
                        on = ok;
                    });
                    ctx.strokeStyle = color;
                    strokeAs(ctx, style, false);
                    if (isFinite(s.y0) && Math.abs(plotY(v, s.y0)) < 1e5) {
                        ctx.beginPath();
                        ctx.arc(plotX(v, s.x0), plotY(v, s.y0), 3, 0, 2 * Math.PI);
                        ctx.fillStyle = color;
                        ctx.fill();
                    }
                });
            }

            // The solutions of a slope field through its starts, across the view and 40 pixels past it
            // each way, a step a pixel and y to move no more than 4 pixels in one, as far as y stays
            // within 20 heights of the view or comes back to it: kept while the view, the unit and the
            // sliders stay. Out of the view the steps grow with how far out they are, so one that starts
            // far from a view zoomed in comes to it in a few thousand steps, not millions
            function fieldSolutions(c, v, w, h) {
                var key = [v.x, v.y, v.ux, v.uy, w, h, deg, graphLook.logx, graphLook.logy].concat(c.letters.map(function (k) { return graphVars[k]; })).join(),
                    top = graphY(v, 0), bottom = graphY(v, h), big = Math.max(Math.abs(top), Math.abs(bottom)) + 20 * (top - bottom),
                    left = graphX(v, -40),
                    hx = function (x) { // a pixel where it is, on a log scale
                        var at = graphLook.logx ? Math.max(x, left) : x;
                        return pixelX(v, at) * far(plotX(v, at), w);
                    },
                    dy = function (y) {
                        var at = graphLook.logy ? Math.max(Math.abs(y), bottom) : y;
                        return 4 * pixelY(v, at) * far(plotY(v, at), h);
                    };
                if (c.kept && c.kept.key === key) return c.kept.sols;
                c.kept = { key: key, sols: c.starts(deg).map(function (q) {
                    var r = q.every(isFinite) ? CalcEngine.solveField(c, q[0], q[1], left, graphX(v, w + 40), deg, hx, dy, big) :
                        { pts: [], back: null, ahead: null };
                    r.x0 = q[0];
                    r.y0 = q[1];
                    return r;
                }) };
                return c.kept.sols;

                // how many times a step there is as long as one in the view: 1 within 40 pixels of it,
                // and one more for each 200 pixels past that
                function far(px, size) {
                    var d = Math.max(0, -px - 40, px - size - 40) / 200;
                    return isFinite(d) ? 1 + d : 1;
                }
            }

            // y at x of the solution k of the slope field c, between the two steps about x; NaN out of it
            function solutionY(c, k, x) {
                var pts = c.kept && c.kept.sols[k] ? c.kept.sols[k].pts : [], lo = 0, hi = pts.length - 1, mid, t;
                if (!pts.length || x < pts[0][0] || x > pts[hi][0]) return NaN;
                while (hi - lo > 1) {
                    mid = (lo + hi) >> 1;
                    if (pts[mid][0] <= x) lo = mid; else hi = mid;
                }
                t = pts[hi][0] === pts[lo][0] ? 0 : (x - pts[lo][0]) / (pts[hi][0] - pts[lo][0]);
                return pts[lo][1] + t * (pts[hi][1] - pts[lo][1]);
            }

            // y at x of the solution k of the slope field c, to all the digits shown: from its start in 4096
            // steps of Runge and Kutta, as far as it is drawn; as it is drawn where they cannot follow it,
            // or come out more than a pixel off it, as far out; NaN out of it
            function solutionAt(c, k, x) {
                var s = c.kept && c.kept.sols[k], drawn = solutionY(c, k, x), r, at;
                if (!s || !isFinite(drawn)) return NaN;
                if (x === s.x0) return s.y0;
                r = CalcEngine.solveField(c, s.x0, s.y0, Math.min(x, s.x0), Math.max(x, s.x0), deg, Math.abs(x - s.x0) / 4096);
                at = r.back || r.ahead ? NaN : r.pts[x < s.x0 ? 0 : r.pts.length - 1][1];
                return Math.abs(at - drawn) <= viewNow().uy ? at : drawn;
            }

            // where a solution starts, as the point is written: (0, 1), or (0; 1) with the decimal comma
            function startText(s) {
                return '(' + local(String(+s.x0.toPrecision(6))) + (engine.comma ? '; ' : ', ') + local(String(+s.y0.toPrecision(6))) + ')';
            }

            // What stops a solution of a slope field in the view, said, of the first one stopped; else
            // of a slope field of no slope anywhere in the view; else, with a slope field, what a click
            // does; '' where there is none. One gone far out of the view, up or down, stops unsaid
            function fieldNote() {
                var v = viewNow(), from = graphX(v, 0), to = graphX(v, graphWidth || graphPlot.clientWidth), top = graphY(v, 0), bottom = graphY(v, graphPlot.clientHeight), out = '',
                    fields = graphPlanes.filter(function (c) { return c && c.kind === 'field'; });
                fields.some(function (c) {
                    if (c.none) {
                        out = 'The slope has no value anywhere in the view.';
                        return true;
                    }
                    return (c.kept ? c.kept.sols : []).some(function (s) {
                        var stop = [s.back, s.ahead].filter(function (q) { return q && q.x >= from && q.x <= to && q.y >= bottom && q.y <= top; })[0];
                        if (!stop) return false;
                        out = tr('The solution through {s} stops at x = {x}: {v}', { s: startText(s), x: local(String(graphNice(stop.x, pixelX(v, stop.x)))), v: {
                            none: tr('its slope has no value there.'),
                            large: tr('it grows too large to draw.'),
                            steep: tr('it goes straight up or down there.'),
                            many: tr('it takes too many steps.')
                        }[stop.why] });
                        return true;
                    });
                });
                return out || (fields.length ? 'Point for values; click off the curves for a solution there.' : '');
            }

            // A click off the curves with a slope field shown: the solution through the place clicked,
            // its start written in the braces of the field's box, the last of them shown, so it is kept
            // with the box and taken out as any text is. The point on it clicked, or null with no field.
            // Up to FIELD_STARTS of them: past that the first one goes, so the box stays short enough to read
            function addStart(p) {
                var i = graphPlanes.length - 1, c, sep = engine.comma ? '; ' : ', ', given;
                while (i >= 0 && !(graphPlanes[i] && graphPlanes[i].kind === 'field')) i--;
                if (i < 0) return null;
                c = graphPlanes[i];
                given = c.given.concat('y(' + local(String(p.x)) + ') = ' + local(String(p.y))).slice(-FIELD_STARTS);
                graphInputs[i].value = c.text + ' {' + given.join(sep) + '}';
                readGraph();
                saveState();
                return { i: i, sol: given.length - 1, x: p.x, y: p.y };
            }

            // The area of a curve from a to b, shaded in its color down to the x axis, or to the curve
            // below it (j), and its value, as the letters are now: the integral of the curve, or of the
            // one less the other; the popup is in the middle of what is in the view. Where a curve has
            // no value it is not shaded, and the area is none. Where it jumps or turns up and down more
            // than the pixels show, as tan x does at 90° or from far away, a column is shaded over all
            // it reaches
            function graphShade(ctx, v, w, h, p) {
                if (p.rel) return shadeRegion(ctx, v, w, h, p);
                var fn = graphFns[p.i], low = p.j !== undefined ? graphFns[p.j] : null, x0 = Math.max(0, plotX(v, p.a)),
                    x1 = Math.min(w, plotX(v, p.b)), at = [x0], run = [], last = null, k, x;
                function edge(y) {
                    return Math.max(-h, Math.min(2 * h, plotY(v, y)));
                }
                function bottom(x) {
                    return p.j === undefined ? 0 : low ? low.at(x, deg) : NaN;
                }
                // the shading of the values in a row, along the curve and back along what is below it
                function fill() {
                    if (run.length) {
                        ctx.moveTo(run[0].px, run[0].top);
                        run.forEach(function (q) { ctx.lineTo(q.px, q.top); });
                        run.reverse().forEach(function (q) { ctx.lineTo(q.px, q.low); });
                        ctx.closePath();
                    }
                    run = [];
                }
                // what the curve and what is below it reach from place a to b, lowest to highest, where
                // either does more than go plainly from one to the other; null where both do, or where
                // their reach cannot be told
                function wide(a, b) {
                    var r = fn.reach ? fn.reach(a.x, b.x, deg) : null, s = p.j === undefined ? [0, 0, true] : low.reach ? low.reach(a.x, b.x, deg) : null;
                    function plain(r, ya, yb) {
                        return r[2] && Math.abs(edge(r[1]) - edge(r[0])) <= 2 * Math.abs(edge(ya) - edge(yb)) + 2;
                    }
                    if (!r || !s || isNaN(r[0]) || isNaN(s[0]) || (plain(r, a.y, b.y) && plain(s, a.y0, b.y0))) return null;
                    return [Math.min(r[0], s[0]), Math.max(r[1], s[1])];
                }
                p.s = fn && (p.j === undefined || low) ? CalcEngine.area(p.j === undefined ? fn : {
                    at: function (x, deg) { return fn.at(x, deg) - low.at(x, deg); }
                }, p.a, p.b, deg) : NaN;
                x = graphX(v, (x0 + x1) / 2);
                p.x = x;
                p.y = fn && isFinite(fn.at(x, deg) + bottom(x)) ? (fn.at(x, deg) + bottom(x)) / 2 : 0;
                if (!fn || x1 <= x0) return;
                for (k = Math.ceil(x0 * 2); k <= x1 * 2; k++) at.push(k / 2);
                at.push(x1);
                ctx.beginPath();
                at.forEach(function (px) {
                    var x = graphX(v, px), q = { px: px, x: x, y: fn.at(x, deg), y0: bottom(x) }, r = last && (p.j === undefined || low) && wide(last, q);
                    if (r) {
                        fill();
                        ctx.rect(last.px, edge(r[1]), px - last.px, edge(r[0]) - edge(r[1]));
                    }
                    if (isFinite(q.y) && isFinite(q.y0)) run.push({ px: px, top: edge(q.y), low: edge(q.y0) });
                    else fill();
                    last = q;
                });
                fill();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = curveColor(p.i);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // The area of a region from a to b: of an inequality where it holds, or inside an equation on
            // the side the drag began, shaded in its color a column of pixels at a time, and its value,
            // found once the drag ends: none where it goes on past five views high (lo to hi). The
            // columns are kept while the view and its letters stay, and the value while its ends stay
            function shadeRegion(ctx, v, w, h, p) {
                var rel = graphRels[p.i], into = rel && regionInto(rel, p.side), x0 = Math.max(0, plotX(v, p.a)), x1 = Math.min(w, plotX(v, p.b)),
                    letters = rel ? rel.letters.map(function (k) { return graphVars[k]; }).join() : '', key, px, mid;
                p.x = graphX(v, (x0 + x1) / 2);
                p.y = (graphY(v, 0) + graphY(v, h)) / 2;
                if (!rel) {
                    p.s = NaN;
                    return;
                }
                key = [p.a, p.b, p.side, p.lo, p.hi, deg, letters].join();
                if (!(graphStart && graphShading) && p.sKey !== key) { // not while it is dragged
                    p.s = CalcEngine.regionArea(into, p.a, p.b, p.lo, p.hi, deg);
                    p.sKey = key;
                }
                if (p.sKey !== key) p.s = NaN;
                if (x1 <= x0) return;
                key = [v.x, v.y, v.ux, v.uy, w, h, x0, x1, graphLook.logx, graphLook.logy, key].join();
                if (!p.cols || p.cols.key !== key) {
                    p.cols = { key: key, at: [] };
                    for (px = Math.floor(x0); px < Math.ceil(x1); px++) p.cols.at.push({ px: px, s: CalcEngine.spans(into, graphX(v, px + 0.5), p.lo, p.hi) });
                }
                ctx.beginPath();
                p.cols.at.forEach(function (col) {
                    col.s.forEach(function (s) {
                        var top = Math.max(-1, plotY(v, s[1])), bottom = Math.min(h + 1, plotY(v, s[0]));
                        if (bottom > top) ctx.rect(col.px, top, 1, bottom - top);
                    });
                });
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = curveColor(p.i);
                ctx.fill();
                ctx.globalAlpha = 1;
                mid = p.cols.at[Math.floor(p.cols.at.length / 2)];
                mid = mid && mid.s.filter(function (s) { return s[1] > graphY(v, h) && s[0] < graphY(v, 0); })[0];
                if (mid) p.y = (Math.max(mid[0], graphY(v, h)) + Math.min(mid[1], graphY(v, 0))) / 2;
            }

            // The region a place is in, for its area: inside an inequality where it holds, or inside an
            // equation, x² + y² = 25, the smallest in y there that ends both ways; else between the curve
            // just above it and the one just below at its x; else, over or under every curve, the nearest
            // one down or up to the x axis; else an inequality that goes on without end, whose area is
            // none. Null where no curve has a value there
            function areaRegion(at) {
                var v = viewNow(), x = graphX(v, at.x), y = graphY(v, at.y), above = null, below = null, near = null, open = null, inner = null,
                    tall = graphY(v, 0) - graphY(v, graphPlot.clientHeight), lo = graphY(v, graphPlot.clientHeight) - 2 * tall, hi = graphY(v, 0) + 2 * tall;
                graphRels.forEach(function (rel, i) {
                    var side = rel && rel.op === '=' ? (rel.at(x, y, deg) < 0 ? -1 : 1) : 0, s;
                    if (!rel || !(CalcEngine.within(rel, x, y, deg, side) > 0)) return;
                    s = CalcEngine.spans(regionInto(rel, side), x, lo, hi).filter(function (q) { return q[0] <= y && y <= q[1]; })[0];
                    if (!s) return;
                    if (!isFinite(s[1] - s[0])) {
                        if (rel.op !== '=' && !open) open = { i: i, rel: true, side: side, lo: lo, hi: hi };
                        return;
                    }
                    if (!inner || s[1] - s[0] < inner.len) inner = { i: i, rel: true, side: side, lo: lo, hi: hi, len: s[1] - s[0] };
                });
                if (inner) return inner;
                graphFns.forEach(function (fn, i) {
                    var fy = fn ? fn.at(x, deg) : NaN, d = Math.abs(plotY(v, fy) - at.y);
                    if (!isFinite(fy)) return;
                    if (fy >= y && (!above || fy < above.y)) above = { i: i, y: fy };
                    if (fy < y && (!below || fy > below.y)) below = { i: i, y: fy };
                    if (!near || d < near.d) near = { i: i, d: d };
                });
                if (above && below) return { i: above.i, j: below.i };
                return near ? { i: near.i } : open;
            }

            // an end of an area, at px of the plot: the x of a dot within reach of a curve of it, a
            // root or a crossing, else of a line of the grid within reach, else the x there to a round
            // step some 5 pixels wide, 1, 2 or 5 times a power of ten: 2 and not 2.04
            function areaEnd(v, r, px) {
                var best = null, x = graphX(v, px), grid = gridStep(pixelX(v, x), !graphLook.logx && gridAngles()), fine = gridStep(pixelX(v, x) / 10, false);
                function of(i) {
                    return i !== undefined && (i === r.i || i === r.j);
                }
                graphMarks.forEach(function (p) {
                    var d = Math.abs(plotX(v, p.x) - px);
                    if ((of(p.i) || of(p.j)) && d <= 8 && (!best || d < best.d)) best = { d: d, x: p.x };
                });
                if (best) return best.x;
                if (Math.abs(plotX(v, Math.round(x / grid) * grid) - px) <= 6) return +(Math.round(x / grid) * grid).toPrecision(12);
                return +(Math.round(x / fine) * fine).toPrecision(12);
            }

            // the drag with ∫ pressed: the area of the region where it began, from there to the pointer;
            // begun where no curve has a value, from the first place on the way that has one. Its popup
            // waits for the drag to end. False until there is such a place
            function graphAreaTo(s, at) {
                var v = viewNow(), a, b;
                at = { x: Math.max(0, Math.min(graphPlot.clientWidth, at.x)), y: at.y }; // past the side, the area ends at it
                if (!s.r) {
                    s.from = s.p[0];
                    s.r = areaRegion(s.from);
                    if (!s.r) {
                        s.from = at;
                        s.r = areaRegion(at);
                    }
                    s.i = s.r ? s.r.i : -1;
                    if (s.r) s.a = areaEnd(v, s.r, s.from.x); // its x, kept, as the wheel may zoom on the way
                }
                if (s.i < 0) return false;
                a = s.a;
                b = areaEnd(v, s.r, at.x);
                graphPinned = { area: true, i: s.r.i, j: s.r.j, a: Math.min(a, b), b: Math.max(a, b) };
                if (s.r.rel) {
                    graphPinned.rel = true;
                    graphPinned.side = s.r.side;
                    graphPinned.lo = s.r.lo;
                    graphPinned.hi = s.r.hi;
                }
                graphAt = graphEdge = null;
                popShut();
                drawGraph();
                return true;
            }

            // x n pixels on from x, to what a pixel tells apart there
            function traceX(v, x, n) {
                x = valueX(scaleX(x) + n * v.ux);
                return graphRound(x, pixelX(v, x));
            }

            // The point clicked on a curve, traced by the arrow keys: ← and → move it along the curve,
            // stopping at a dot on the way, a root or a crossing; ↑ and ↓ take it to the curve above or
            // below at its x. The view moves to keep it in, and its popup shows. False where there is
            // no such point, for the keys to do what they do in the calculator. The plot tabbed to with
            // none clicked, the first press puts one on the first curve at the middle of the view, or its dot there
            function graphTrace(key, shift) {
                var p = graphPinned, v = viewNow(), w = graphPlot.clientWidth, h = graphPlot.clientHeight,
                    dir = key === 39 || key === 38 ? 1 : -1, i, x, next = null, px, py, dx = 0, dy = 0;
                if (!p && document.activeElement === graphPlot && graphPlot.offsetWidth) {
                    x = graphX(v, w / 2);
                    i = graphFns.findIndex(function (fn) { return fn && isFinite(fn.at(x, deg, true)); });
                    if (i < 0) return false;
                    graphPinned = graphAt = graphMarks.filter(function (m) { return m.i === i && !m.f && Math.abs(plotX(v, m.x) - w / 2) < 6; })[0] || // a dot there, as it is named
                        { i: i, x: x, y: graphFns[i].at(x, deg, true) };
                    graphTracing = i;
                    graphPopShut = false;
                    popLater(false);
                    drawGraph();
                    sayTraced();
                    return true;
                }
                if (!p || p.spot || p.area || !graph.classList.contains('calc-open') || !graphPlot.offsetWidth) return false;
                i = p.j !== undefined && p.j === graphTracing ? p.j : p.i;
                if (!graphFns[i] && !graphRels[i] && !graphPlanes[i] && !graphData[i]) return false;
                if (p.data && (key === 37 || key === 39)) {
                    next = graphMarks.filter(function (m) { return m.data && m.i === p.i && (m.x - p.x) * dir > 0; }).sort(function (a, b) {
                        return (a.x - b.x) * dir;
                    })[0];
                    if (!next) return true;
                } else if (graphPlanes[i] && p.u !== undefined && (key === 37 || key === 39)) {
                    next = graphPlanes[i].kind === 'seq' ? traceSequence(p, i, dir, shift ? 10 : 1) : tracePlane(v, p, i, dir, GRAPH_TRACE * (shift ? 10 : 1));
                    if (!next) return true;
                } else if (graphPlanes[i] && p.sol !== undefined && (key === 37 || key === 39)) { // along a solution of a slope field, as along a curve
                    x = traceX(v, p.x, dir * GRAPH_TRACE * (shift ? 10 : 1));
                    next = { i: i, sol: p.sol, x: x, y: solutionAt(graphPlanes[i], p.sol, x) };
                    if (!isFinite(next.y)) return true;
                } else if (graphRels[i] && (key === 37 || key === 39)) {
                    next = traceEquation(v, p, i, dir, GRAPH_TRACE * (shift ? 10 : 1));
                    if (!next) return true;
                } else if (!graphFns[i] && (key === 37 || key === 39)) {
                    return true;
                } else
                if (key === 38 || key === 40) {
                    graphFns.forEach(function (fn, k) {
                        (fn ? fn.family || [fn] : []).forEach(function (c, f) { // the other curves of a list as well
                            var y = k !== i || f !== (p.f || 0) ? c.at(p.x, deg, true) : NaN;
                            if (isFinite(y) && (y - p.y) * dir > 0 && (!next || Math.abs(y - p.y) < Math.abs(next.y - p.y))) next = { i: k, f: f, x: p.x, y: y };
                        });
                    });
                    if (!next) return true;
                } else {
                    x = traceX(v, p.x, dir * GRAPH_TRACE * (shift ? 10 : 1));
                    graphMarks.forEach(function (m) {
                        if ((m.i === i || m.j === i) && (m.f || 0) === (p.f || 0) && (m.x - p.x) * dir > pixelX(v, p.x) / 2 && (m.x - x) * dir <= 0 && // not the one it is on, found again
                            (!next || Math.abs(m.x - p.x) < Math.abs(next.x - p.x))) next = m;
                    });
                    if (!next) next = { i: i, f: p.f, x: x, y: curveAt(p).at(x, deg, true) };
                }
                if (graphStep && graphStep.p !== next) graphStep = null;
                graphTracing = next.i === i || next.j === i ? i : next.i;
                graphPinned = graphAt = next;
                graphPopShut = false;
                popLater(false);
                px = plotX(v, next.x);
                py = plotY(v, next.y);
                if (px < 20 || px > w - 20) dx = px < 20 ? px - 20 : px - (w - 20);
                if (isFinite(py) && (py < 20 || py > h - 20)) dy = py < 20 ? py - 20 : py - (h - 20);
                if (dx || dy) {
                    graphView = { x: v.x + dx * v.ux, y: v.y - dy * v.uy, ux: v.ux, uy: v.uy };
                    clearTimeout(graphSaving);
                    graphSaving = setTimeout(saveState, 300);
                }
                drawGraph();
                sayTraced();
                return true;
            }

            // the point traced, as the line above the plot shows it, and its curve: Root, x = 2, y = 0, x^2 - 4
            function sayTraced() {
                var box = graphInputs[graphTracing];
                graphSay.textContent = [].map.call(graphNote.children, function (el) { return el.textContent; }).filter(Boolean)
                    .concat(box && box.value.trim() ? [box.value.trim()] : []).join(', ');
            }

            // The point after p along equation i, s pixels on, or the dot before that: → the way that
            // goes right, or up where it goes straight up, and on from there the way the last press
            // went, round a circle and not back at its side; ← back. Null where it has no more
            function traceEquation(v, p, i, dir, s) {
                var rel = relPart(p), a = plotX(v, p.x), b = plotY(v, p.y), last = graphStep && graphStep.p === p ? graphStep : null,
                    fx = rel.at(graphX(v, a + 0.5), p.y, deg) - rel.at(graphX(v, a - 0.5), p.y, deg),
                    fy = rel.at(p.x, graphY(v, b + 0.5), deg) - rel.at(p.x, graphY(v, b - 0.5), deg),
                    n = Math.hypot(fx, fy), t, near = null, q, d;
                if (!isFinite(n) || !n) return null;
                t = { x: fy / n, y: -fx / n }; // along it, in pixels down the plot
                if (last ? (t.x * last.x + t.y * last.y) * last.dir * dir < 0 : Math.abs(t.x) > 1e-3 ? t.x * dir < 0 : t.y * dir > 0) {
                    t.x = -t.x;
                    t.y = -t.y;
                }
                graphMarks.forEach(function (m) {
                    var dx = plotX(v, m.x) - a, dy = plotY(v, m.y) - b, on = dx * t.x + dy * t.y;
                    if ((m.i === i || m.j === i) && on > 0.5 && on <= s + 0.5 && Math.abs(dx * t.y - dy * t.x) < 3 && (!near || on < near.on)) near = { on: on, m: m };
                });
                q = near ? near.m : CalcEngine.onRelation(rel, graphX(v, a + t.x * s), graphY(v, b + t.y * s), pixelX(v, p.x), pixelY(v, p.y), deg);
                if (!q) return null;
                if (!near && graphRels[i].parts && !CalcEngine.holds(graphRels[i], q.x, q.y, deg)) return null; // past a corner
                if (!near) q = { i: i, x: q.x, y: q.y, k: p.k };
                d = Math.hypot(plotX(v, q.x) - a, plotY(v, q.y) - b);
                if (d > 3 * s + 3) return null; // found on another part of it, not the next place along
                graphStep = { p: q, x: d ? (plotX(v, q.x) - a) / d : t.x, y: d ? (plotY(v, q.y) - b) / d : t.y, dir: dir };
                return q;
            }

            // The point after p along curve i of a parameter, s pixels on, or the dot before that: →
            // the way the parameter grows, ← back, as far as its ends
            function tracePlane(v, p, i, dir, s) {
                var c = graphPlanes[i], ends = c.range(deg), h = (ends[1] - ends[0]) * 1e-5, a = c.at(p.u - h, deg), b = c.at(p.u + h, deg),
                    speed = Math.hypot(plotX(v, b[0]) - plotX(v, a[0]), plotY(v, b[1]) - plotY(v, a[1])) / (2 * h),
                    u = p.u + dir * (speed > 0 && isFinite(speed) ? s / speed : (ends[1] - ends[0]) / 2000), near = null, q;
                u = Math.max(ends[0], Math.min(ends[1], u));
                if (u === p.u) return null;
                graphMarks.forEach(function (m) {
                    if ((m.i === i || m.j === i) && m.u !== undefined && (m.u - p.u) * dir > 1e-12 && (m.u - u) * dir <= 0 &&
                        (!near || Math.abs(m.u - p.u) < Math.abs(near.u - p.u))) near = m;
                });
                if (near) return near;
                q = c.at(u, deg);
                return { i: i, u: u, x: q[0], y: q[1] };
            }

            // a place on the area shaded, or by its edge
            function onArea(v, p, at) {
                if (p.rel) return graphX(v, at.x) >= p.a && graphX(v, at.x) <= p.b && !!graphRels[p.i] &&
                    CalcEngine.within(graphRels[p.i], graphX(v, at.x), graphY(v, at.y), deg, p.side) > 0;
                var x = graphX(v, at.x), fn = graphFns[p.i], low = p.j === undefined ? null : graphFns[p.j],
                    top = plotY(v, fn ? fn.at(x, deg) : NaN), bottom = plotY(v, p.j === undefined ? 0 : low ? low.at(x, deg) : NaN);
                return x >= p.a && x <= p.b && at.y >= Math.min(top, bottom) - 4 && at.y <= Math.max(top, bottom) + 4;
            }

            // The ∫ button, pressed or let go: pressed, the next drag along a curve shades its area
            function areaOn(on) {
                graphShading = on;
                graphEdge = null;
                graphAreaButton.classList.toggle('calc-on', on);
                graphPlot.classList.toggle('calc-graph-shading', on);
                if (graph.classList.contains('calc-open')) graphShown();
            }

            // where an area would start from the pointer, with ∫ pressed: an upright line at its x, and
            // a dot on its curve there, or on both it would be between
            function graphEdgeLine(ctx, v, h, e) {
                var x = Math.round(plotX(v, e.x)) + 0.5;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.lineWidth = 1;
                ctx.strokeStyle = curveColor(e.i);
                ctx.setLineDash([4, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
                [e.i, e.j].forEach(function (i) {
                    var y = i !== undefined && graphFns[i] ? graphFns[i].at(e.x, deg) : NaN;
                    if (isFinite(y) && Math.abs(plotY(v, y)) < 1e6) graphDot(ctx, v, { x: e.x, y: y }, 4.5, curveColor(i), GRAPH_INK.paper);
                });
            }

            // a place away from the curves, clicked: a cross
            function graphCross(ctx, v, p) {
                var x = Math.round(plotX(v, p.x)) + 0.5, y = Math.round(plotY(v, p.y)) + 0.5;
                ctx.beginPath();
                ctx.moveTo(x - 5, y);
                ctx.lineTo(x + 5, y);
                ctx.moveTo(x, y - 5);
                ctx.lineTo(x, y + 5);
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = GRAPH_INK.axis;
                ctx.stroke();
            }

            // Too many dots cannot be read: then only those of one curve are shown, and its crossings.
            // The curve is the one pointed at, else the one whose box is being typed in, else the first
            function graphBusy(marks) {
                var box = graphInputs.indexOf(document.activeElement),
                    one = graphAt && !graphAt.spot ? graphAt.i : graphPinned && !graphPinned.spot ? graphPinned.i : box > -1 ? box : 0;
                if (marks.length <= 24) return marks;
                return marks.filter(function (p) { return p.i === one || p.j === one; });
            }

            // a point of a curve: a hollow dot for a mark, a full one for the point shown
            function graphDot(ctx, v, p, size, fill, ring) {
                ctx.beginPath();
                ctx.arc(plotX(v, p.x), plotY(v, p.y), size, 0, 2 * Math.PI);
                ctx.fillStyle = fill;
                ctx.strokeStyle = ring;
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
            }

            // The lines of the grid, the minor ones between them, or the circles and rays of a polar grid, or
            // with it off a mark on each axis at each number; over: the axes, their arrows, the numbers along
            // them and their names instead, drawn over the curves, so they show however much of the plot a
            // curve fills, as tan x does from far away. Each as the settings have it, at the step typed for
            // it. An axis out of the view leaves its numbers and its name at the nearest edge. Big, the
            // numbers as big as the words beside the plot (popScale)
            function drawGrid(ctx, v, w, h, over) {
                var f = root.classList.contains('calc-big') ? app.popZoom : 1, angles = gridAngles(), look = graphLook,
                    lx = look.logx && logTicks(v, false, w), ly = look.logy && logTicks(v, true, h), // the lines of an axis on a log scale
                    sx = typedStep(look.xstep, v.ux) || gridStep(v.ux, angles), sy = typedStep(look.ystep, v.uy) || gridStep(v.uy, false),
                    mx = minorStep(sx, angles), my = minorStep(sy, false),
                    ax = Math.max(1, Math.min(w - 1, Math.round(plotX(v, 0)))) + 0.5, // where the axes are drawn, on whole pixels
                    ay = Math.max(1, Math.min(h - 1, Math.round(plotY(v, 0)))) + 0.5,
                    xIn = plotY(v, 0) >= 0 && plotY(v, 0) <= h, yIn = plotX(v, 0) >= 0 && plotX(v, 0) <= w, // the x axis in view, the y axis
                    labelY = Math.min(h - 4 * f, ay + 13 * f), onLeft = ax > w - 40 * f, past = -Infinity, k, p, end;

                // a line across the plot at each step of x, and of y, from what is put at each place. Of the
                // grid, where it falls and not on a whole pixel, so its lines are evenly apart and its squares
                // square however the graph is zoomed; none under an axis, drawn on its whole pixel, and the minor
                // ones none where a line of the grid is. The marks on the axes on whole pixels, as sharp as they are
                function lines(ink, stepX, stepY, x, y, minor) {
                    var nx = minor ? Math.round(sx / stepX) : 0, ny = minor ? Math.round(sy / stepY) : 0, marks = x || y;
                    function across(at) {
                        p = marks ? Math.round(plotX(v, at)) + 0.5 : plotX(v, at);
                        ctx.moveTo(p, x ? ay - x : 0);
                        ctx.lineTo(p, x ? ay + x : h);
                    }
                    function up(at) {
                        p = marks ? Math.round(plotY(v, at)) + 0.5 : plotY(v, at);
                        ctx.moveTo(y ? ax - y : 0, p);
                        ctx.lineTo(y ? ax + y : w, p);
                    }
                    ctx.strokeStyle = ink;
                    ctx.beginPath();
                    if (lx) {
                        if (stepX) lx[minor ? 'minor' : 'major'].forEach(across);
                    } else {
                        for (k = Math.ceil(graphX(v, 0) / stepX); stepX && k * stepX <= graphX(v, w); k++) {
                            if (!(nx && !(k % nx) || !marks && !k && look.yaxis)) across(k * stepX);
                        }
                    }
                    if (ly) {
                        if (stepY) ly[minor ? 'minor' : 'major'].forEach(up);
                    } else {
                        for (k = Math.ceil(graphY(v, h) / stepY); stepY && k * stepY <= graphY(v, 0); k++) {
                            if (!(ny && !(k % ny) || !marks && !k && look.xaxis)) up(k * stepY);
                        }
                    }
                    ctx.stroke();
                }

                // circles about 0 a step apart, from the nearest of the view to its farthest corner, and rays
                // from 0 every so many degrees, as far; about 0 where the axes are drawn, on its whole pixel, as they are
                function rings(ink, step, every) {
                    var x0 = graphX(v, 0), x1 = graphX(v, w), y0 = graphY(v, h), y1 = graphY(v, 0), cx = Math.round(plotX(v, 0)) + 0.5, cy = Math.round(plotY(v, 0)) + 0.5,
                        far = Math.max(Math.hypot(x0, y0), Math.hypot(x0, y1), Math.hypot(x1, y0), Math.hypot(x1, y1)),
                        near = Math.hypot(Math.max(x0, 0, -x1), Math.max(y0, 0, -y1)), t;
                    ctx.strokeStyle = ink;
                    ctx.beginPath();
                    for (k = Math.max(1, Math.ceil(near / step)); step && k * step <= far && k < 1e4; k++) {
                        ctx.moveTo(cx + k * step / v.ux, cy);
                        ctx.ellipse(cx, cy, k * step / v.ux, k * step / v.uy, 0, 0, 2 * Math.PI);
                    }
                    for (t = 0; every && t < 360; t += every) {
                        ctx.moveTo(cx, cy);
                        ctx.lineTo(cx + far * Math.cos(t * Math.PI / 180) / v.ux, cy - far * Math.sin(t * Math.PI / 180) / v.uy);
                    }
                    ctx.stroke();
                }

                // an axis and its arrows over the curves, a darker shade of each where it crosses them and not a gap; where
                // they cover a quarter of it or more, as tan x from far away, in the paper's color, as dark would not show on
                // them. Then in its ink under them
                function axisLine(across) {
                    var c = ctx.canvas, r = c && c.width / w, d, n = 0, i, far;
                    function head(x, y, dx, dy) { // an arrow at x, y, pointing along dx, dy
                        ctx.moveTo(x, y);
                        ctx.lineTo(x - 8 * f * dx - 4 * f * dy, y - 8 * f * dy - 4 * f * dx);
                        ctx.lineTo(x - 8 * f * dx + 4 * f * dy, y - 8 * f * dy + 4 * f * dx);
                    }
                    function paint(ink) {
                        ctx.strokeStyle = ctx.fillStyle = ink;
                        ctx.beginPath();
                        ctx.moveTo(across ? 0 : ax, across ? ay : 0);
                        ctx.lineTo(across ? w : ax, across ? ay : h);
                        ctx.stroke();
                        if (!graphLook.arrows) return;
                        ctx.beginPath();
                        if (across) head(w, ay, 1, 0);
                        else head(ax, 0, 0, -1);
                        if (graphLook.arrows > 1) { // and at the other end
                            if (across) head(0, ay, -1, 0);
                            else head(ax, h, 0, 1);
                        }
                        ctx.fill();
                    }
                    if (ctx.getImageData && r) {
                        d = across ? ctx.getImageData(0, Math.floor(ay * r), c.width, 1).data : ctx.getImageData(Math.floor(ax * r), 0, 1, c.height).data;
                        for (i = 3; i < d.length; i += 4) if (d[i] > 128) n++; // a curve, and not the faint grid
                        far = n * 16 >= d.length;
                    }
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.globalAlpha = far ? 0.8 : 0.5;
                    paint(far ? GRAPH_INK.paper : GRAPH_INK.axis);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'destination-over';
                    paint(GRAPH_INK.axis);
                    ctx.globalCompositeOperation = 'source-over';
                }

                ctx.lineWidth = 1;
                if (!over) {
                    if (look.grid && look.polar && !lx && !ly) { // its circles as far apart as the lines of x would be, of a step typed for x too
                        p = typedStep(look.xstep, Math.max(v.ux, v.uy)) || gridStep(Math.max(v.ux, v.uy), false);
                        if (look.minor) rings(GRAPH_INK.minor, minorStep(p, false) / Math.max(v.ux, v.uy) >= 6 && minorStep(p, false), 15);
                        rings(GRAPH_INK.grid, p, 30);
                    } else if (look.grid) {
                        if (look.minor) lines(GRAPH_INK.minor, (lx || mx / v.ux >= 6) && mx, (ly || my / v.uy >= 6) && my, 0, 0, true); // none closer than 6 pixels
                        lines(GRAPH_INK.grid, sx, sy);
                    } else if (look.xaxis || look.yaxis) {
                        lines(GRAPH_INK.axis, look.xaxis && xIn && sx, look.yaxis && yIn && sy, 3 * f, 3 * f);
                    }
                    return;
                }
                xIn = xIn && look.xaxis; // each axis drawn as it is switched, with its arrows, name and numbers
                yIn = yIn && look.yaxis;
                if (!look.xaxis && !look.yaxis) return;

                if (xIn) axisLine(true);
                if (yIn) axisLine(false);

                ctx.font = 10 * f + 'px Play, sans-serif';
                ctx.fillStyle = GRAPH_INK.text;
                ctx.strokeStyle = GRAPH_INK.paper; // a rim of the paper, so a number reads over a line
                ctx.lineWidth = 3;
                ctx.lineJoin = 'round';
                end = (graphLook.arrows ? 12 : 4) * f; // the names short of the arrows
                if (graphLook.xname && look.xaxis) { // the name of x at its right end, above the axis, below it at the top
                    ctx.font = 'italic ' + 12 * f + 'px Play, sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = ay < 18 * f ? 'top' : 'bottom';
                    ctx.strokeText(graphLook.xname, w - end, ay < 18 * f ? ay + 6 * f : ay - 5 * f);
                    ctx.fillText(graphLook.xname, w - end, ay < 18 * f ? ay + 6 * f : ay - 5 * f);
                    past = w - end - ctx.measureText(graphLook.xname).width; // no number under it
                }
                if (graphLook.yname && look.yaxis) { // and of y at its top, beside the axis, as its numbers are
                    ctx.font = 'italic ' + 12 * f + 'px Play, sans-serif';
                    ctx.textAlign = onLeft ? 'right' : 'left';
                    ctx.textBaseline = 'top';
                    ctx.strokeText(graphLook.yname, onLeft ? ax - 6 * f : ax + 6 * f, end - 2 * f);
                    ctx.fillText(graphLook.yname, onLeft ? ax - 6 * f : ax + 6 * f, end - 2 * f);
                }
                ctx.font = 10 * f + 'px Play, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'alphabetic';
                end = past;
                past = -Infinity;
                function xLabel(at, text) {
                    p = plotX(v, at);
                    if (p < 10 * f || p > w - 10 * f) return;
                    if (p - ctx.measureText(text).width / 2 < past + 6 * f) return; // too long to fit beside the last, as far out
                    if (graphLook.xname && (ay < 18 * f || labelY < ay + 13 * f) && p + ctx.measureText(text).width / 2 > end - 4 * f) return; // the name on their side of the axis
                    past = p + ctx.measureText(text).width / 2;
                    ctx.strokeText(text, p, labelY);
                    ctx.fillText(text, p, labelY);
                }
                function yLabel(at, text) {
                    p = plotY(v, at);
                    if (p < 8 * f || p > h - 8 * f || graphLook.yname && p < 24 * f || p > past - 12 * f) return; // not over the name of y, nor the last
                    past = p;
                    ctx.strokeText(text, onLeft ? ax - 4 * f : ax + 4 * f, p);
                    ctx.fillText(text, onLeft ? ax - 4 * f : ax + 4 * f, p);
                }
                if (look.xaxis && look.xnum && lx) lx.labels.forEach(function (at) { xLabel(at, lx.even ? gridLabel(at, lx.even) : logLabel(at)); });
                for (k = Math.ceil(graphX(v, 0) / sx); !lx && look.xaxis && look.xnum && k * sx <= graphX(v, w); k++) {
                    if (k || ly) xLabel(k * sx, gridLabel(k * sx, sx)); // 0 where the y axis is not, on a log scale
                }
                ctx.textAlign = onLeft ? 'right' : 'left';
                ctx.textBaseline = 'middle';
                past = Infinity; // up from the bottom
                if (look.yaxis && look.ynum && ly) ly.labels.forEach(function (at) { yLabel(at, ly.even ? gridLabel(at, ly.even) : logLabel(at)); });
                for (k = Math.ceil(graphY(v, h) / sy); !ly && look.yaxis && look.ynum && k * sy <= graphY(v, 0); k++) {
                    if (k || lx) yLabel(k * sy, gridLabel(k * sy, sy));
                }
            }

            // the step of the minor lines of the grid between those step apart: a fifth of 1 or 5 times a power of
            // ten, a quarter of 2; a third of 15° to 180°, and a quarter of a step of π
            function minorStep(step, angles) {
                var lead = Math.round(step / Math.pow(10, Math.floor(Math.log10(step))));
                if (angles === 'deg' && [15, 30, 45, 90, 180].indexOf(step) > -1) return step / 3;
                if (angles === 'rad' && piParts(step)) return step / 4;
                return step / (lead === 2 ? 4 : 5);
            }

            // An equation of x and y, drawn where its two sides are equal, as the engine's contour finds
            // it from what they reach; else, of a function whose reach it cannot tell, as here: their
            // difference is found at the corners of square cells 3 pixels wide, and each cell where it changes sign is crossed
            // by a line between the places on its edges where it is 0, as near as the corners tell, or
            // a line across each quarter of it where the values half way along its edges change sign more
            // often; filled where they change sign at six places or more around it, as sin x = cos y
            // does seen from far away, its line turning more often than the pixels show. Not where it
            // only jumps from one sign to the other, as x y = 1 does across x = 0: there the middle of
            // the cell is farther from 0 than its corners. An inequality, y < x², is
            // shaded where it is true, a cell at a time, or the part of a cell on its side of the line;
            // its line is dashed where the line itself is not in it, for < and >. Of two, 1 < x < 3,
            // where both are, each line drawn where the other holds. The values and the lines are kept
            // while the view, the unit and the letters stay, as the pointer moving draws it again
            function drawRelation(ctx, v, w, h, rel, color, style) {
                var c = 3, nx = Math.ceil(w / c), ny = Math.ceil(h / c), parts = rel.parts || [rel], grids, drawn, i, j, run,
                    key = [v.x, v.y, v.ux, v.uy, w, h, deg, graphLook.logx, graphLook.logy].concat(rel.letters.map(function (k) { return graphVars[k]; })).join();
                function corners(g, i, j) {
                    return [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]];
                }
                function strict(part) {
                    return part.op === '<' || part.op === '>';
                }
                function inside(part, k) {
                    return k * (part.op === '<' || part.op === '≤' ? -1 : 1) > 0 || (k === 0 && !strict(part));
                }
                if (rel.kept && rel.kept.key === key) {
                    grids = rel.kept.grids;
                    drawn = rel.kept.drawn;
                } else {
                    drawn = CalcEngine.contour(logRelation(rel), drawBox(v, w, h), deg);
                    grids = drawn ? null : parts.map(function (part) {
                        var grid = [];
                        for (j = 0; j <= ny; j++) {
                            grid.push([]);
                            for (i = 0; i <= nx; i++) grid[j].push(part.at(graphX(v, i * c), graphY(v, j * c), deg));
                        }
                        return grid;
                    });
                    drawn = drawn || { shade: null, parts: parts.map(function (part, k) {
                        var out = { lines: [], fills: [] };
                        for (j = 0; j < ny; j++) {
                            for (i = 0; i < nx; i++) cell(i * c, j * c, corners(grids[k], i, j), part, out);
                        }
                        if (parts.length > 1) { // where the other holds
                            out.lines = out.lines.filter(function (l) { return others(k, (l[0][0] + l[1][0]) / 2, (l[0][1] + l[1][1]) / 2); });
                            out.fills = out.fills.filter(function (f) { return others(k, f[0] + c / 2, f[1] + c / 2); });
                        }
                        return out;
                    }) };
                    drawn.parts.forEach(function (out, k) { if (strict(parts[k])) out.lines = chains(out.lines); });
                    rel.kept = { key: key, grids: grids, drawn: drawn };
                }
                if (rel.op !== '=') {
                    ctx.beginPath();
                    (drawn.shade || []).forEach(function (poly) {
                        ctx.moveTo(poly[0], poly[1]);
                        for (i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]);
                        ctx.closePath();
                    });
                    for (j = 0; grids && j < ny; j++) {
                        run = -1; // the first of the cells in a row wholly in it, drawn as one
                        for (i = 0; i <= nx; i++) {
                            if (i < nx && parts.every(function (part, k) { return corners(grids[k], i, j).every(function (n) { return inside(part, n); }); })) {
                                if (run < 0) run = i;
                                continue;
                            }
                            if (run >= 0) ctx.rect(run * c, j * c, (i - run) * c, c);
                            run = -1;
                            if (i < nx) piece(i * c, j * c, i, j);
                        }
                    }
                    ctx.globalAlpha = 0.22;
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
                parts.forEach(function (part, k) {
                    if (drawn.parts[k].fills.length) {
                        ctx.beginPath();
                        drawn.parts[k].fills.forEach(function (f) { ctx.rect(f[0], f[1], f[2], f[2]); });
                        ctx.fillStyle = color;
                        ctx.fill();
                    }
                    ctx.beginPath();
                    drawn.parts[k].lines.forEach(function (line) {
                        ctx.moveTo(line[0][0], line[0][1]);
                        line.slice(1).forEach(function (p) { ctx.lineTo(p[0], p[1]); });
                    });
                    ctx.strokeStyle = color;
                    strokeAs(ctx, style, strict(part), !strict(part));
                });

                // true if each part but k holds at px, py
                function others(k, px, py) {
                    var x = graphX(v, px), y = graphY(v, py);
                    return parts.every(function (other, m) { return m === k || inside(other, other.at(x, y, deg)); });
                }

                // where edge e of a cell s wide from px, py crosses 0, its corners k: found from its left
                // or top end, so the cell beside it finds the same place
                function edge(px, py, k, e, s) {
                    var corner = [[0, 0], [s, 0], [s, s], [0, s]], p = corner[e], q = corner[(e + 1) % 4], a = k[e], b = k[(e + 1) % 4], t;
                    if (e > 1) {
                        p = q;
                        q = corner[e];
                        a = b;
                        b = k[e];
                    }
                    t = isFinite(a) && isFinite(b) ? a / (a - b) : 0.5; // half way to where it has no value
                    return [px + p[0] + (q[0] - p[0]) * t, py + p[1] + (q[1] - p[1]) * t];
                }

                // the part of cell i, j from px, py that is in it: the square cut by each line in turn, a
                // corner kept where it is in, and a place put where an edge crosses out, its values there
                // as they go along the edge
                function piece(px, py, i, j) {
                    var corner = [[0, 0], [c, 0], [c, c], [0, c]], poly = corner.map(function (q, e) {
                        return { x: px + q[0], y: py + q[1], v: parts.map(function (part, k) { return corners(grids[k], i, j)[e]; }) };
                    });
                    parts.forEach(function (part, k) {
                        var out = [];
                        poly.forEach(function (a, e) {
                            var b = poly[(e + 1) % poly.length], inA = inside(part, a.v[k]), t;
                            if (inA) out.push(a);
                            if (inA !== inside(part, b.v[k])) {
                                t = isFinite(a.v[k]) && isFinite(b.v[k]) ? a.v[k] / (a.v[k] - b.v[k]) : 0.5;
                                out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, v: a.v.map(function (n, m) { return n + (b.v[m] - n) * t; }) });
                            }
                        });
                        poly = out;
                    });
                    if (poly.length < 3) return;
                    ctx.moveTo(poly[0].x, poly[0].y);
                    poly.slice(1).forEach(function (q) { ctx.lineTo(q.x, q.y); });
                    ctx.closePath();
                }

                // how many times values around a ring change sign
                function turns(ring) {
                    return ring.filter(function (n, e) { return (n > 0) !== (ring[(e + 1) % ring.length] > 0); }).length;
                }

                // the line of part across a cell from px, py, into out: its corners k top left, top right,
                // bottom right and bottom left
                function cell(px, py, k, part, out) {
                    var half = c / 2, mid, ring, n;
                    function at(dx, dy) {
                        return part.at(graphX(v, px + dx), graphY(v, py + dy), deg);
                    }
                    if (!k.every(isFinite) || !turns(k)) return;
                    mid = at(half, half);
                    if (!(Math.abs(mid) <= 2 * Math.max.apply(null, k.map(Math.abs)))) return; // a jump, not a 0
                    ring = [k[0], at(half, 0), k[1], at(c, half), k[2], at(half, c), k[3], at(0, half)];
                    n = ring.every(isFinite) ? turns(ring) : turns(k);
                    if (n >= 6) return out.fills.push([px, py, c]);
                    if (n === turns(k)) return across(px, py, c, k, out.lines);
                    across(px, py, half, [k[0], ring[1], mid, ring[7]], out.lines);
                    across(px + half, py, half, [ring[1], k[1], ring[3], mid], out.lines);
                    across(px + half, py + half, half, [mid, ring[3], k[2], ring[5]], out.lines);
                    across(px, py + half, half, [ring[7], mid, ring[5], k[3]], out.lines);
                }

                // the line across a square s wide from px, py, its corners k, as they tell
                function across(px, py, s, k, lines) {
                    var at = [], e;
                    for (e = 0; e < 4; e++) {
                        if ((k[e] > 0) !== (k[(e + 1) % 4] > 0)) at.push(edge(px, py, k, e, s));
                    }
                    if (at.length < 2) return;
                    lines.push([at[0], at[1]]);
                    if (at.length === 4) lines.push([at[2], at[3]]);
                }
            }

            // the pieces of a line joined end to end where they meet, so its dashes run on along it
            function chains(pieces) {
                var ends = {}, used = [], out = [];
                function key(p) {
                    return Math.round(p[0] * 64) + ',' + Math.round(p[1] * 64);
                }
                pieces.forEach(function (s, n) {
                    s.forEach(function (p) { (ends[key(p)] = ends[key(p)] || []).push(n); });
                });
                pieces.forEach(function (s, n) {
                    var line;
                    if (used[n]) return;
                    used[n] = true;
                    line = [s[0], s[1]];
                    [true, false].forEach(function (last) { // on from its end, then back from its start
                        var end, next, far;
                        for (;;) {
                            end = last ? line[line.length - 1] : line[0];
                            next = (ends[key(end)] || []).filter(function (m) { return !used[m]; })[0];
                            if (next === undefined) break;
                            used[next] = true;
                            far = key(pieces[next][0]) === key(end) ? pieces[next][1] : pieces[next][0];
                            if (last) line.push(far); else line.unshift(far);
                        }
                    });
                    out.push(line);
                });
                return out;
            }

            // the slope of a curve as a curve of its own, dy/dx at each x: none where it has none,
            // at a corner or a break. One for each curve, so its lines are kept as the curve's are
            // the curve of its box a point is on: of a list, the one of its curves p.f names
            function curveAt(p) {
                var fn = graphFns[p.i];
                return fn && fn.family && p.f ? fn.family[p.f] || fn : fn;
            }

            // the curves of the boxes by their place in a list: the first of each box, then the second of each list, …
            function graphLayers() {
                var n = Math.max.apply(null, graphFns.map(function (fn) { return fn && fn.family ? fn.family.length : 1; }).concat(1)), out = [], f;
                for (f = 0; f < n; f++) out.push(graphFns.map(function (fn) { return !fn ? null : !f ? fn : fn.family ? fn.family[f] || null : null; }));
                return out;
            }

            function slopeCurve(fn) {
                if (!fn.slopeOf) fn.slopeOf = { at: function (x, deg) { return CalcEngine.slope(fn, x, deg); }, reach: fn.slopeReach, letters: fn.letters || [] };
                return fn.slopeOf;
            }

            // A curve, dashed for the slope of one, as the engine traces it: broken at its jumps, on to
            // the edge where it has no end, and a solid stroke where it goes up and down faster than a
            // pixel shows, as tan x far out does. Its lines are kept while the view, the unit and its letters stay,
            // unless they were traced roughly, out of the drawing's time, and it is now still
            function drawCurve(ctx, v, w, h, fn, color, dashed, style) {
                var key = [v.x, v.y, v.ux, v.uy, w, h, deg, graphLook.logx, graphLook.logy].concat((fn.letters || []).map(function (k) { return graphVars[k]; })).join();
                if (!fn.traced || fn.traced.key !== key || fn.traced.lines.rough && !graphUntil) {
                    fn.traced = { key: key, lines: CalcEngine.trace(logCurve(fn), drawBox(v, w, h), deg) };
                }
                if (fn.traced.lines.rough) graphRough = true;
                ctx.beginPath();
                fn.traced.lines.forEach(function (line) {
                    var k;
                    ctx.moveTo(line[0], line[1]);
                    for (k = 2; k < line.length; k += 2) ctx.lineTo(line[k], line[k + 1]);
                });
                ctx.strokeStyle = color;
                strokeAs(ctx, style, dashed);
            }

            // a line stroked as the style of its curve has it: its width, and dashed or dotted, the dashes as
            // long as it is wide; dashed: the slope of a curve, or a line not in an inequality, dashed whatever it
            // is; round: its ends round, as an equation's pieces join
            function strokeAs(ctx, style, dashed, round) {
                var w = GRAPH_WIDTHS[style ? style.w : 1], k = w / 2, d = style ? style.d : 0;
                ctx.lineWidth = w;
                ctx.lineJoin = 'round';
                ctx.lineCap = d === 2 && !dashed || round && d === 0 ? 'round' : 'butt';
                ctx.setLineDash(dashed || d === 1 ? [7 * k, 4 * k] : d === 2 ? [0.01, 3.5 * k + 2] : []);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.lineCap = 'butt';
            }

            // The point at a place of the plot: a mark within reach of it, the nearest; else the curve within
            // reach above or below it, the nearest, at its x, a round one within near pixels (graphNice); else
            // a mark within markReach; else the place itself, its x and y rounded to what a pixel tells apart (spot)
            function graphPoint(at, reach, markReach, near) {
                var v = viewNow(), x = graphNice(graphX(v, at.x), pixelX(v, graphX(v, at.x)), near), best = null, far;
                function nice(n, u) {
                    return graphNice(n, u, near);
                }
                graphMarks.forEach(function (p) {
                    var d = Math.hypot(plotX(v, p.x) - at.x, plotY(v, p.y) - at.y);
                    if (d <= (markReach || reach) && (!best || d < best.d)) best = { d: d, p: p };
                });
                if (best && best.d <= reach) return best.p;
                far = best; // a mark a little farther, unless a curve is there: a click on x² – 3 below its root is on the curve
                best = null;
                graphFns.forEach(function (fn, i) {
                    (fn ? fn.family || [fn] : []).forEach(function (c, f) { // of a list, the nearest of its curves
                        var y = c.at(graphX(v, at.x), deg, true), d = Math.abs(plotY(v, y) - at.y);
                        if (isFinite(y) && d <= reach * 1.2 && (!best || d < best.d)) { // on it at the pointer's x, then the likeliest point near that
                            best = { d: d, p: likelyPoint(c, v, at, near || 3) || { x: x } }; // else a round x near it, as graphNice has it
                            if (best.p.y === undefined) best.p.y = c.at(best.p.x, deg, true);
                            best.p.i = i;
                            if (f) best.p.f = f;
                        }
                    });
                });
                graphRels.forEach(function (rel, i) { // an equation: the place on it nearest; of an inequality of two, on either line where the other holds
                    (rel ? rel.parts || [rel] : []).forEach(function (part, k) {
                        var q = CalcEngine.onRelation(part, graphX(v, at.x), graphY(v, at.y), pixelX(v, graphX(v, at.x)), pixelY(v, graphY(v, at.y)), deg, nice),
                            d = q && (!rel.parts || CalcEngine.holds(rel, q.x, q.y, deg)) ? Math.hypot(plotX(v, q.x) - at.x, plotY(v, q.y) - at.y) : Infinity;
                        if (d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, x: q.x, y: q.y } };
                        if (best && best.d === d && k) best.p.k = k;
                    });
                });
                graphPlanes.forEach(function (c, i) { // a curve of a parameter: the nearest of its places drawn, then nearer between them
                    var pts = c && c.kept && c.kept.pts, close = null, hi, k, d, r;
                    function off(u) {
                        var q = c.at(u, deg);
                        return Math.hypot(plotX(v, q[0]) - at.x, plotY(v, q[1]) - at.y);
                    }
                    function dist(q) {
                        return Math.hypot(q.px - at.x, q.py - at.y);
                    }
                    if (c && c.kind === 'field') { // a slope field: its solution within reach above or below, at its x
                        (c.kept ? c.kept.sols : []).forEach(function (s, k) {
                            var y = solutionY(c, k, x), d = Math.abs(plotY(v, y) - at.y);
                            if (isFinite(y) && d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, sol: k, x: x, y: y, near: true } };
                        });
                        if (best && best.p.near) { // the one found, to all its digits
                            delete best.p.near;
                            best.p.y = solutionAt(c, best.p.sol, x);
                        }
                        return;
                    }
                    if (c && c.kind === 'seq') { // a sequence: the nearest of its terms by the pointer
                        r = c.terms(deg);
                        hi = Math.min(r.from + r.list.length - 1, graphX(v, at.x + reach * 1.2));
                        for (k = Math.max(r.from, Math.ceil(graphX(v, at.x - reach * 1.2))); k <= hi; k++) {
                            d = Math.hypot(plotX(v, k) - at.x, plotY(v, r.list[k - r.from]) - at.y);
                            if (d <= reach * 1.2 && (!best || d < best.d)) best = { d: d, p: { i: i, u: k, x: k, y: r.list[k - r.from] } };
                        }
                        return;
                    }
                    if (!pts) return;
                    // each place nearer than those beside it, then nearer between them: of two as near, within half a
                    // pixel, the first traced, as θ = π/6 of r = 2sin 3θ and not 7π/6, where it passes again
                    pts.forEach(function (q, k) {
                        var d = dist(q), lo, hi, m1, m2, n;
                        if (!(d <= reach * 2) || k && d > dist(pts[k - 1]) || k < pts.length - 1 && d >= dist(pts[k + 1])) return;
                        lo = pts[Math.max(0, k - 1)].u;
                        hi = pts[Math.min(pts.length - 1, k + 1)].u;
                        for (n = 0; n < 50; n++) {
                            m1 = lo + (hi - lo) / 3;
                            m2 = hi - (hi - lo) / 3;
                            if (off(m1) <= off(m2)) hi = m2; else lo = m1;
                        }
                        d = off((lo + hi) / 2);
                        if (isNaN(d)) return; // no value there
                        if (!close || d < close.d - 0.5) close = { d: d, k: k, u: (lo + hi) / 2 };
                    });
                    if (!close || !(close.d <= reach * 1.2) || best && close.d >= best.d) return;
                    r = likelyAlong(c, v, close.u, pts, close.k, near || 3);
                    if (!r) {
                        d = c.at(close.u, deg);
                        r = { u: close.u, x: d[0], y: d[1] };
                    }
                    best = { d: close.d, p: { i: i, u: r.u, x: r.x, y: r.y } };
                });
                return best ? best.p : far ? far.p : { x: x, y: graphNice(graphY(v, at.y), pixelY(v, graphY(v, at.y)), near), spot: true };
            }

            // The point of a curve y = f(x) a click near it most likely means, within near pixels of where the
            // click's x meets it: the one whose x and y are both roundest, (2, 4) on x², else the one whose x
            // is, or where it is steep its y; the nearer of two as round. Null if none is round
            function likelyPoint(fn, v, at, near) {
                var x0 = graphX(v, at.x), y0 = fn.at(x0, deg, true), ux = pixelX(v, x0), uy = pixelY(v, y0), // a pixel there, on a log scale too
                    steep = Math.abs(fn.at(x0 + ux, deg, true) - fn.at(x0 - ux, deg, true)) / (2 * uy) > 1,
                    q = Math.pow(10, Math.floor(Math.log10(ux))), p = Math.pow(10, Math.ceil(Math.log10(uy))), best = null, k, m, a, b, ya, yb;
                function consider(x, y) {
                    var d = Math.hypot(plotX(v, x) - at.x, plotY(v, y) - plotY(v, y0)), s;
                    if (!isFinite(y) || d > near) return;
                    s = roundScore(v, x, y, d, steep);
                    if (rounder(s, best)) best = { s: s, x: x, y: y };
                }
                if (!isFinite(y0) || !(ux > 0) || !(uy > 0)) return null;
                for (k = Math.ceil((x0 - near * ux) / q); k * q <= x0 + near * ux; k++) { // round x, a tenth of a pixel or more apart
                    m = +(k * q).toPrecision(12);
                    consider(m, fn.at(m, deg, true));
                }
                for (k = -near; k < near; k++) { // round y, a pixel or more apart, where the curve crosses it
                    a = x0 + k * ux;
                    b = a + ux;
                    ya = fn.at(a, deg, true);
                    yb = fn.at(b, deg, true);
                    if (!isFinite(ya) || !isFinite(yb)) continue;
                    for (m = Math.ceil(Math.max(Math.min(ya, yb), y0 - near * uy) / p) * p; m <= Math.min(Math.max(ya, yb), y0 + near * uy); m += p) {
                        consider(crossing(fn, a, b, ya, +m.toPrecision(12)), +m.toPrecision(12));
                    }
                }
                return best && (best.s[0] || best.s[1]) ? { x: best.x, y: best.y } : null;
            }

            // The point of a curve of a parameter a click near it most likely means, within near pixels of its
            // place nearest the click, at u0, which the place k0 it traced is by: where its x or its y is
            // roundest, as likelyPoint has it, y = 1 and not 0.9999995. Null if none is round
            function likelyAlong(c, v, u0, pts, k0, near) {
                var p0 = c.at(u0, deg), x0 = plotX(v, p0[0]), y0 = plotY(v, p0[1]), h = Math.abs(u0) * 1e-7 || 1e-7,
                    a = c.at(u0 - h, deg), b = c.at(u0 + h, deg), steep = Math.abs((b[1] - a[1]) / pixelY(v, p0[1])) > Math.abs((b[0] - a[0]) / pixelX(v, p0[0])),
                    lo = k0, hi = k0, n = 64, best = null, k, u1, u2;
                function away(k) {
                    return Math.hypot(pts[k].px - x0, pts[k].py - y0);
                }
                function cross(j, ua, ub, m) { // where x, or y for j = 1, is m between ua and ub, by halving
                    var fa = c.at(ua, deg)[j] - m, k, uc, fc;
                    for (k = 0; k < 50; k++) {
                        uc = (ua + ub) / 2;
                        fc = c.at(uc, deg)[j] - m;
                        if (fc * fa > 0) {
                            ua = uc;
                            fa = fc;
                        } else {
                            ub = uc;
                        }
                    }
                    return (ua + ub) / 2;
                }
                if (!isFinite(y0) || !isFinite(x0)) return null;
                while (lo > 0 && away(lo) <= near) lo--; // the places traced within reach, and one past them each way
                while (hi < pts.length - 1 && away(hi) <= near) hi++;
                for (k = 0; k < n; k++) { // round x and y, a pixel or more apart, where it crosses them
                    u1 = pts[lo].u + (pts[hi].u - pts[lo].u) * k / n;
                    u2 = pts[lo].u + (pts[hi].u - pts[lo].u) * (k + 1) / n;
                    a = c.at(u1, deg);
                    b = c.at(u2, deg);
                    [pixelX(v, p0[0]), pixelY(v, p0[1])].forEach(function (u, j) {
                        var q = Math.pow(10, Math.ceil(Math.log10(u))), m, w, p, d, s;
                        if (!isFinite(a[j]) || !isFinite(b[j])) return;
                        for (m = Math.ceil(Math.max(Math.min(a[j], b[j]), p0[j] - near * u) / q) * q; m <= Math.min(Math.max(a[j], b[j]), p0[j] + near * u); m += q) {
                            w = cross(j, u1, u2, +m.toPrecision(12));
                            p = c.at(w, deg).slice();
                            p[j] = +m.toPrecision(12);
                            d = Math.hypot(plotX(v, p[0]) - x0, plotY(v, p[1]) - y0);
                            if (!isFinite(p[1 - j]) || d > near) continue;
                            s = roundScore(v, p[0], p[1], d, steep);
                            if (rounder(s, best)) best = { s: s, u: w, x: p[0], y: p[1] };
                        }
                    });
                }
                return best && (best.s[0] || best.s[1]) ? { u: best.u, x: best.x, y: best.y } : null;
            }

            // how round a point is, a pixel being v.ux by v.uy, to choose the likeliest of a few: the rounder of
            // its x and y, then its x, or where the curve is steep its y, then the nearer, d pixels away
            function roundScore(v, x, y, d, steep) {
                var rx = graphRoundness(x, pixelX(v, x)), ry = graphRoundness(y, pixelY(v, y));
                return [Math.min(rx, ry), steep ? ry : rx, -d];
            }

            // whether score s of roundScore is higher than that of the best so far, or there is none
            function rounder(s, best) {
                return !best || s[0] > best.s[0] || s[0] === best.s[0] && (s[1] > best.s[1] || s[1] === best.s[1] && s[2] > best.s[2]);
            }

            // where f(x) = y between a and b, f(a) being ya, by halving
            function crossing(fn, a, b, ya, y) {
                var k, c, yc;
                for (k = 0; k < 60; k++) {
                    c = (a + b) / 2;
                    yc = fn.at(c, deg, true);
                    if ((yc - y) * (ya - y) > 0) {
                        a = c;
                        ya = yc;
                    } else {
                        b = c;
                    }
                }
                return (a + b) / 2;
            }

            // the sequence a point is a term of, or null
            function seqOf(p) {
                var c = p && !p.spot && !p.area && p.u !== undefined && graphPlanes[p.i];
                return c && c.kind === 'seq' ? c : null;
            }

            // what a point is, and its x and y, as the line above the plot and the popup show them
            function graphName(p) {
                var fit = !p.spot && !p.area && !p.t && graphData[p.i] && graphFns[p.i] && graphFns[p.i].fit;
                if (fit) return tr('Best fit, r² = {v}', { v: local(String(+fit.r2.toPrecision(4))) });
                if (seqOf(p)) return tr('Term');
                if (p.data && graphData[p.i] && graphData[p.i].name) return graphData[p.i].name;
                if (!p.spot && !p.area && p.sol !== undefined && graphPlanes[p.i]) {
                    return graphPlanes[p.i].kept && graphPlanes[p.i].kept.sols[p.sol] ? tr('Solution through {graphPlanes}', { graphPlanes: startText(graphPlanes[p.i].kept.sols[p.sol]) }) : tr('Solution');
                }
                return tr(p.spot ? 'Point' : p.area ? (p.rel ? 'Area of the region' : p.j === undefined ? 'Area under the curve' : 'Area between the curves') :
                    p.t ? null : 'On the curve') || p.t.map(function (t) { return tr(GRAPH_NAMES[t]); }).join(tr(', '));
            }

            // to 13 digits, as the display shows a result: 1.732050807569; with u, a pixel, to what one tells
            // apart, 0.9992 and not 0.999167945271, a fraction or degrees as tableValue has them. What is
            // inserted is the whole number
            function graphValue(p, k, u) {
                var n = String(+p[k].toPrecision(13));
                if (u && !(k === 'y' && !p.spot && ((app.fracMode && CalcEngine.fraction(p[k])) || (app.dmsMode && CalcEngine.dms(p[k]))))) n = String(graphRound(p[k], u));
                return p.spot || k === 'x' || k === 'a' || k === 'b' ? shownResult({ value: n }, n).html : statsValue(p[k]).html;
            }

            // an end of an area as its box shows it, to 13 digits, which can be typed over
            function endValue(p, k) {
                return local(String(+p[k].toPrecision(13)));
            }

            // a dot of the curve's color, or of both curves that cross
            function graphSwatch(i) {
                return '<b class="calc-graph-swatch" style="background:' + curveColor(i) + '"></b>';
            }

            // the colors of a point's curves: one, two where they cross, none for a place off them
            function graphSwatches(p) {
                return p.spot ? '' : graphSwatch(p.i) + (p.j !== undefined ? graphSwatch(p.j) : '');
            }

            // the line above the plot: the point under the pointer, what it is and its x and y; else what to do
            function graphShown() {
                var unit = graphAngles() ? UNITS[deg] : '', p = graphAt, kind, seq = seqOf(p), v = viewNow(), near = p && !p.t && !seq; // a place along a curve, not a mark, to its pixel
                if (graphTwice) {
                    graphNote.textContent = tr('{graphTwice}(x) is named twice: give each function its own letter.', { graphTwice: graphTwice });
                } else if (graphRows.some(function (row) { return row.classList.contains('calc-bad'); })) {
                    graphNote.textContent = 'Not a function of x yet: write x^2 for x², 2x for 2 × x.';
                } else if (sequenceNote(true)) {
                    graphNote.textContent = sequenceNote(true);
                } else if (graphRows.some(function (row, i) { return graphData[i] && graphDiff[i] && !graphFns[i]; })) {
                    kind = fitKind(graphRows.findIndex(function (row, i) { return graphData[i] && graphDiff[i] && !graphFns[i]; }));
                    graphNote.textContent = 'No ' + GRAPH_FIT_NAMES[kind] + ' fit: it needs ' + GRAPH_FIT_NEEDS[kind] + '.';
                } else if (!graphFns.concat(graphRels, graphPlanes, graphData).some(Boolean) && graphOff.some(Boolean)) {
                    graphNote.textContent = tr('Every curve is hidden: click its dot to show it.');
                } else if (graphTab === 'table') {
                    graphNote.textContent = !tableCurves().length ? tr('Type a function of x for its values.') :
                        graphTable.querySelector('.calc-bad') ? tr('Start and step are numbers, the step above 0.') :
                            tr('Click a value to put it in the equation.{v}', { v: (unit ? ' · ' + unit : '') });
                } else if (graphShading && graphFns.concat(graphRels).some(Boolean) && graphStart && graphPinned && graphPinned.area) {
                    graphNote.innerHTML = graphSwatches(graphPinned) + '<span>' + tr('From <i>x</i> = {v}', { v: graphValue(graphPinned, 'a') }) + '</span>' +
                        '<span>' + tr('to <i>x</i> = {v}', { v: graphValue(graphPinned, 'b') }) + '</span>';
                } else if (graphShading && graphEdge) {
                    graphNote.innerHTML = graphSwatches(graphEdge) + '<span>' + tr('From <i>x</i> = {v}', { v: graphValue(graphEdge, 'x') }) + '</span>' +
                        '<span>' + tr('Drag to where it ends') + '</span>';
                } else if (graphShading && graphFns.concat(graphRels).some(Boolean)) {
                    graphNote.textContent = tr('Drag along a curve for the area under it, between two for the area between, in a region for its area.');
                } else if (p) { // of a term of a sequence, its n and a(n)
                    graphNote.innerHTML = graphSwatches(p) + '<em>' + graphName(p) + '</em>' +
                        '<span>' + (seq ? '<i>n</i>' : '<i>x</i>') + ' = ' + graphValue(p, 'x', near && pixelX(v, p.x)) + '</span>' +
                        '<span>' + (seq ? '<i>' + seq.name + '</i>(<i>n</i>)' : '<i>y</i>') + ' = ' + (isFinite(p.y) ? graphValue(p, 'y', near && pixelY(v, p.y)) : 'none') + '</span>';
                } else if (!graphInputs.some(function (box) { return box.value.trim(); })) {
                    graphNote.textContent = tr('Type a function of x. Drag to move, scroll or pinch to zoom.');
                } else if (sequenceNote(false)) {
                    graphNote.textContent = sequenceNote(false);
                } else if (fieldNote()) {
                    graphNote.textContent = fieldNote();
                } else {
                    graphNote.textContent = tr('Point at the graph for values; click to insert.{v}', { v: (unit ? ' · ' + unit : '') });
                }
                rtlDraw(graphNote);
            }

            // The popup of the point clicked, over it, or under it where there is no room above;
            // its x and y, and the slope of its curve there, each go into the calculation with a
            // click. It goes with the point as the view moves, and hides while the point is out of the view,
            // unless an end of its area is being typed: then it stays at the edge, and that box is kept
            function placePop(v) {
                var p = graphPinned, w = graphPlot.clientWidth, h = graphPlot.clientHeight, typing = graphPop.contains(document.activeElement),
                    px, py, html, left, top, below, rows, seq;
                px = p && plotX(v, p.x);
                py = p && plotY(v, p.y);
                if (p && p.area && typing) {
                    px = Math.max(0, Math.min(w, px));
                    py = isFinite(py) ? Math.max(0, Math.min(h, py)) : h / 2;
                }
                if (!p || graphPopShut || !isFinite(py) || px < 0 || px > w || py < 0 || py > h) {
                    graphPop.hidden = true;
                    return;
                }
                seq = seqOf(p);
                html = '<div class="calc-graph-pop-head">' + graphSwatches(p) + '<b>' + graphName(p) + '</b></div>' +
                    (p.area ? ['a', 'b', 's'] : seq ? ['u', 'y'] : p.u !== undefined ? ['u', 'x', 'y', 'm'] : ['x', 'y', 'm']).map(function (k) {
                        if (k === 'm' && !isFinite(p.m)) return '';
                        if (k === 's' && !isFinite(p.s)) return '<div class="calc-graph-pop-none">Area = none</div>';
                        return '<div class="calc-graph-pop-row" data-put="' + k + '"><span>' + (seq ? (k === 'u' ? '<i>n</i>' : '<i>' + seq.name + '</i>(<i>n</i>)') :
                            k === 'u' && graphPlanes[p.i] && graphPlanes[p.i].kind === 'polar' ? 'θ' : GRAPH_ROWS[k]) + ' = ' +
                            (k === 'a' || k === 'b' ? '<input class="calc-graph-pop-end" data-end="' + k + '" value="' + endValue(p, k) +
                                '" aria-label="' + (k === 'a' ? 'From x' : 'To x') + '">' : graphValue(p, k)) + '</span>' + insertIcon() + '</div>';
                    }).join('');
                if (p.area && typing) { // all but the row of the box typed in
                    rows = document.createElement('div');
                    rows.innerHTML = html;
                    [].slice.call(rows.children).forEach(function (row, n) {
                        var now = graphPop.children[n];
                        if (!now.contains(document.activeElement) && now.outerHTML !== row.outerHTML) graphPop.replaceChild(row.cloneNode(true), now);
                    });
                } else if (graphPop.innerHTML !== html) {
                    graphPop.innerHTML = html;
                }
                graphPop.hidden = false;
                left = Math.max(4, Math.min(w - graphPop.offsetWidth - 4, px - graphPop.offsetWidth / 2));
                top = py - graphPop.offsetHeight - 10;
                below = top < 4;
                if (below) top = py + 10;
                graphPop.style.left = left + 'px';
                graphPop.style.top = top + 'px';
                graphPop.style.setProperty('--arrow', px - left - graphPop.clientLeft + 'px');
                graphPop.classList.toggle('calc-graph-pop-below', below);
            }

            // What Esc does on the graph before it closes: the view's boxes close, the area button is
            // let go, else the point clicked goes, and its popup; false if there was none of them
            function graphUnpin() {
                popLater(false);
                if (!graph.classList.contains('calc-open') || !graphPlot.offsetWidth) return false;
                if (!graphWindow.hidden) {
                    showWindow(false);
                    return true;
                }
                if (graphShading) {
                    areaOn(false);
                    return true;
                }
                if (!graphPinned) return false;
                graphPinned = null;
                drawGraph();
                return true;
            }

            // A popup opened with the mouse goes a while after the mouse is off it, so the graph can be
            // seen again; back on it in time, it stays. Not while the menu of a right click on it is open.
            // One opened by a touch stays, as no pointer rests on it
            function popLater(on) {
                if (on) graphPopFrom = null;
                clearTimeout(graphHiding);
                if (!on) return;
                graphHiding = setTimeout(function () {
                    if (!menu.hidden || graphPop.contains(document.activeElement)) popLater(true); else popShut();
                }, GRAPH_POP_WAIT);
            }

            // The popup goes, after that wait or at once on a zoom, by the wheel, a pinch or the buttons;
            // the point and its tangent stay, and a click on the point brings the popup back
            function popShut() {
                popLater(false);
                graphPopShut = true;
                graphPop.hidden = true;
            }

            // A click, or the drag of an area, opens the popup with the mouse at at: it stays while the
            // mouse stays there, and its wait starts once the mouse is moved off, or off the plot
            function popWhenMoved(at) {
                popLater(false);
                graphPopFrom = at || null;
            }

            graphPop.addEventListener('pointerenter', function () {
                popLater(false);
                graphPopFrom = null;
            }, false);

            graphPop.addEventListener('pointerleave', function (e) {
                popLater(e.pointerType === 'mouse' && !!graphPinned);
            }, false);

            // An end of an area typed, as its x is hard to drag to: the area from there, as it is typed,
            // where the other end is past it. One that is not is marked; Enter or Esc goes back to the
            // plot, and the box shows the end as it is again
            graphPop.addEventListener('input', function (e) {
                var box = e.target, p = graphPinned, n, a, b;
                if (!box.classList.contains('calc-graph-pop-end') || !p || !p.area) return;
                onlyNumber(box);
                n = boxNumber(box);
                a = box.dataset.end === 'a' ? n : p.a;
                b = box.dataset.end === 'b' ? n : p.b;
                box.classList.toggle('calc-bad', !(isFinite(n) && a < b));
                if (!(isFinite(n) && a < b)) return;
                p.a = a;
                p.b = b;
                drawGraph();
            }, false);

            graphPop.addEventListener('keydown', function (e) {
                if (e.which !== 13 || !e.target.classList.contains('calc-graph-pop-end')) return;
                e.preventDefault();
                e.target.blur();
            }, false);

            graphPop.addEventListener('focusout', function () {
                setTimeout(drawGraph, 0);
            }, false);

            // x or y of the point clicked goes into the calculation: each row is an Insert button of its own, its icon on it, so a click
            // puts it in on any screen, not only a touch screen as a result of a card or the statistics
            graphPop.addEventListener('click', function (e) {
                var row = e.target.closest('.calc-graph-pop-row'), n = row && graphPinned && graphPinned[row.dataset.put];
                if (e.target.classList.contains('calc-graph-pop-end')) return; // typed in, not put in
                if (!row || !isFinite(n) || !engine.put(n)) return;
                keyBoard['AC'].children[0].firstChild.data = 'C';
                showGraph(false);
                refresh();
                saveState();
                if (graphAlone) ask('graph-put'); // the calculator comes up with it
            }, false);

            // where a pointer is on the plot, in its pixels
            function onPlot(e) {
                var box = graphPlot.getBoundingClientRect(), k = scale();
                return { x: (e.clientX - box.left) / k - graphPlot.clientLeft, y: (e.clientY - box.top) / k - graphPlot.clientTop };
            }

            // the view with the point at p0 of the plot moved to p1, and the scale times k
            function graphMove(start, p0, p1, k) {
                var x = start.x + (p0.x - graphPlot.clientWidth / 2) * start.ux, y = start.y - (p0.y - graphPlot.clientHeight / 2) * start.uy, // as the view keeps them
                    ux = start.ux * k, uy = start.uy * k,
                    v = { x: x - (p1.x - graphPlot.clientWidth / 2) * ux, y: y + (p1.y - graphPlot.clientHeight / 2) * uy, ux: ux, uy: uy };
                if (!(ux < 1e12 && uy < 1e12) || (k < 1 && !sharp(v))) return; // no closer or farther than numbers stay sharp
                if (k > 1 && (graphLook.logx && ux * graphPlot.clientWidth > GRAPH_LOG_SPAN || graphLook.logy && uy * graphPlot.clientHeight > GRAPH_LOG_SPAN)) return; // nor than they reach on a log scale
                graphView = v;
                drawGraph();
            }

            // true if a view is no closer than numbers stay sharp: a pixel more than 10^-12, and more than
            // 10^-11 of how far it is from 0, as far out the machine's numbers are farther apart: at x = 10^14
            // as far as 0.016, so tan x drawn closer than that has pixels of the same x
            function sharp(v) {
                var w = graphPlot.clientWidth / 2, h = graphPlot.clientHeight / 2;
                return v.ux > Math.max(1e-12, (Math.abs(v.x) + w * v.ux) * 1e-11) && v.uy > Math.max(1e-12, (Math.abs(v.y) + h * v.uy) * 1e-11);
            }

            // An area dragged near the left or right of the plot, or past it, slides the view that way
            // for as long as it is held there, faster nearer the side, and the area grows with it: its
            // start stays at its x, its end at the side. It stops as the pointer comes away or lets go
            function areaSlide() {
                var last = 0;
                function step(t) {
                    var s = graphStart, p = graphPointers(), w = graphPlot.clientWidth, v, d;
                    graphSliding = 0;
                    if (!graphShading || !graphMoved || !s || !(s.i >= 0) || p.length !== 1) return;
                    d = p[0].x < GRAPH_SLIDE_EDGE ? p[0].x - GRAPH_SLIDE_EDGE : p[0].x > w - GRAPH_SLIDE_EDGE ? p[0].x - w + GRAPH_SLIDE_EDGE : 0;
                    if (!d) return;
                    if (last) {
                        v = viewNow();
                        d = Math.max(-1, Math.min(1, d / GRAPH_SLIDE_EDGE)) * GRAPH_SLIDE_SPEED * Math.min(t - last, 50) / 1000; // after a slow frame, no leap
                        graphView = { x: v.x + d * v.ux, y: v.y, ux: v.ux, uy: v.uy };
                        graphAreaTo(s, p[0]);
                    }
                    last = t;
                    graphSliding = requestAnimationFrame(step);
                }
                if (!graphSliding) graphSliding = requestAnimationFrame(step);
            }

            // the pointers down now: one moves the view, two pinch it
            function graphPointers() {
                return Object.keys(graphTouch).map(function (id) { return graphTouch[id]; });
            }

            // a pointer went down or up: what follows moves from here
            function graphBegin() {
                var p = graphPointers();
                graphStart = p.length ? { view: viewNow(), p: p.map(function (q) { return { x: q.x, y: q.y }; }) } : null;
            }

            graphCanvas.addEventListener('pointerdown', function (e) {
                if (e.button) return;
                graphCanvas.setPointerCapture(e.pointerId);
                if (!graphPointers().length) graphMoved = false;
                graphShutting = !graphWindow.hidden; // the settings close, as a press anywhere on the plot closes them
                if (graphShutting) showWindow(false);
                graphTouch[e.pointerId] = onPlot(e);
                graphDragging = graphPointers().length === 1 && !graphShading ? pointToDrag(graphTouch[e.pointerId], GRAPH_DRAG_REACH * (e.pointerType === 'mouse' ? 1 : 2)) : null; // a second finger pinches instead
                graphBegin();
            }, false);

            // A point typed that a press at this place of the plot would drag: the nearest within reach of
            // those of numbers, or with a letter alone to move, (1, 2) or (a, 2), and not (2a, a²); null if none
            function pointToDrag(at, reach) {
                var v = viewNow(), best = null;
                graphData.forEach(function (list, i) {
                    (list || []).forEach(function (q, j) {
                        var d = Math.hypot(plotX(v, q.x) - at.x, plotY(v, q.y) - at.y);
                        if (d <= reach && (!best || d < best.d) && (!q.letter || q.letter[0] || q.letter[1] || q.letter[0] === '' && q.letter[1] === '')) {
                            best = { d: d, i: i, j: j, dx: at.x - plotX(v, q.x), dy: at.y - plotY(v, q.y) };
                        }
                    });
                });
                return best;
            }

            // A point dragged to here, to round numbers near it as a click has them. Of numbers only, the
            // box is written again with it, or among points of letters its numbers put in place of the ones
            // there; else the letter that is its x or y alone is set, as its slider would be: a point of
            // letters moves as they let it, (a, 2) only across. A table of the box shows it
            function dragPoint(d, at) {
                var v = viewNow(), list = graphData[d.i], q = list && list[d.j], box = graphInputs[d.i], text = box.value.trim(),
                    n = [graphNice(graphX(v, at.x - d.dx), pixelX(v, graphX(v, at.x - d.dx))), graphNice(graphY(v, at.y - d.dy), pixelY(v, graphY(v, at.y - d.dy)))], row;
                if (!q) return;
                if (!q.letter) {
                    q.x = n[0];
                    q.y = n[1];
                    text = (list.name ? list.name + ' = ' : '') + pairsText(list);
                    row = graphCellsRow === d.i && graphCells.querySelectorAll('.calc-graph-pair')[d.j];
                    if (row) {
                        row.children[0].value = local(String(n[0]));
                        row.children[1].value = local(String(n[1]));
                    }
                } else {
                    [1, 0].forEach(function (c) { // the y first, so the place of the x before it stays
                        var k = q.letter[c], r = graphRange[k], slider = k && graphSliders.querySelector('[data-k="' + k + '"]');
                        if (q.letter[0] === '' && q.letter[1] === '') text = text.slice(0, q.at[c][0]) + local(String(n[c])) + text.slice(q.at[c][1]);
                        if (!k || !r) return;
                        delete graphPlay[k];
                        graphVars[k] = n[c];
                        r[0] = Math.min(r[0], n[c]);
                        r[1] = Math.max(r[1], n[c]);
                        if (slider) setSlider(slider);
                    });
                }
                graphAt = graphPinned = null;
                if (text !== box.value.trim()) {
                    box.value = text;
                    readGraph();
                } else {
                    graphRender();
                }
            }

            graphCanvas.addEventListener('pointermove', function (e) {
                var at = onPlot(e), s = graphStart, p, d0, d1;
                if (!graphTouch[e.pointerId]) { // the mouse over the plot: the point under it
                    if (graphPopFrom && Math.hypot(at.x - graphPopFrom.x, at.y - graphPopFrom.y) > GRAPH_POP_STILL) popLater(!graphPop.hidden);
                    graphPlot.classList.toggle('calc-graph-grab', e.pointerType === 'mouse' && !graphShading && !!pointToDrag(at, GRAPH_DRAG_REACH));
                    if (e.pointerType === 'mouse' && graphShading) { // where an area would start, as a drag from here takes it
                        p = areaRegion(at);
                        graphAt = null;
                        graphEdge = p && { x: areaEnd(viewNow(), p, at.x), i: p.i, j: p.j };
                        drawGraph();
                    } else if (e.pointerType === 'mouse') {
                        graphAt = graphPoint(at, 10);
                        drawGraph();
                    }
                    return;
                }
                graphTouch[e.pointerId] = at;
                p = graphPointers();
                if (!s) return;
                if (p.length === 1) {
                    if (!graphMoved && Math.abs(at.x - s.p[0].x) + Math.abs(at.y - s.p[0].y) < 4) return; // a click shakes a little
                    graphMoved = true;
                    if (graphDragging) {
                        dragPoint(graphDragging, at);
                    } else if (graphShading && s.p.length === 1) { // with ∫ pressed, the view only as the area reaches a side
                        graphAreaTo(s, at);
                        areaSlide();
                    } else if (!graphLook.lock) {
                        graphMove(s.view, s.p[0], at, 1);
                    }
                } else if (p.length === 2 && s.p.length === 2) {
                    graphMoved = true;
                    popShut();
                    d0 = Math.hypot(s.p[0].x - s.p[1].x, s.p[0].y - s.p[1].y);
                    d1 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
                    if (d0 > 10 && d1 > 10 && !graphLook.lock) {
                        graphMove(s.view, { x: (s.p[0].x + s.p[1].x) / 2, y: (s.p[0].y + s.p[1].y) / 2 },
                            { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }, d0 / d1);
                    }
                }
            }, false);

            // A click opens the popup of the point there; a finger reaches a dot or a curve from
            // farther. A click on the point that has it open takes the point away; one on the point
            // whose popup went brings it back; an area shaded is the same. The drag that shades an
            // area opens its popup as it ends; the ∫ button stays pressed, for another, until it is
            // pressed again or Esc lets it go
            function graphUp(e) {
                var at = graphTouch[e.pointerId], v = viewNow(), p = graphPinned, mouse = e.pointerType === 'mouse', s = graphStart;
                if (!at) return;
                delete graphTouch[e.pointerId];
                graphDragging = null;
                if (graphMoved && graphShading && s && s.i >= 0 && !graphPointers().length) {
                    graphEdge = null;
                    graphPopShut = false;
                    popWhenMoved(mouse && at);
                    drawGraph();
                } else if (e.type === 'pointerup' && !graphMoved && !graphPointers().length && !graphShutting) {
                    // a double click puts back what was before its first click, however long the system lets it take
                    graphClickWas = graphClickLast;
                    graphClickLast = { pinned: p, shut: graphPopShut };
                    if (p && (p.area ? onArea(v, p, at) : Math.hypot(plotX(v, p.x) - at.x, plotY(v, p.y) - at.y) <= (mouse ? 8 : 16))) {
                        if (graphPopShut) graphPopShut = false; else graphPinned = null;
                    } else {
                        graphPinned = graphPoint(at, mouse ? 10 : 18, mouse ? 20 : 28, GRAPH_CLICK_NICE); // a mark a little farther, and a rounder x
                        if (graphPinned.spot && !graphShading) graphPinned = addStart(graphPinned) || graphPinned; // off the curves, with a slope field: its solution through there
                        graphPopShut = false;
                        if (mouse) graphAt = graphPinned;
                    }
                    popWhenMoved(mouse && !!graphPinned && at); // the mouse is on the point, off the popup
                    drawGraph();
                }
                graphBegin();
                if (graphMoved && !graphPointers().length) saveState();
            }

            graphCanvas.addEventListener('pointerup', graphUp, false);
            graphCanvas.addEventListener('pointercancel', graphUp, false);

            // a double click lets ∫ go, the area or point as it was before its first click
            onDouble(graphCanvas, function () {
                if (!graphShading) return;
                areaOn(false);
                if (graphClickWas) {
                    graphPinned = graphClickWas.pinned;
                    graphPopShut = graphClickWas.shut;
                }
                drawGraph();
                saveState();
            }, false);

            // the pointer leaves: the line above says what to do again; the popup stays
            graphCanvas.addEventListener('pointerleave', function (e) {
                if (e.pointerType !== 'mouse' || graphTouch[e.pointerId]) return;
                if (graphPopFrom) popLater(!graphPop.hidden);
                graphPlot.classList.remove('calc-graph-grab');
                graphAt = graphEdge = null;
                drawGraph();
            }, false);

            // the wheel zooms about what it is pointed at, which stays where it is: a dot or a root, a top or
            // where curves cross, near it; else a curve, at the pointer's x; else an axis, or 0 near both; else
            // the place under the pointer. The same however the turns are cut up: what it zooms about found
            // as a turn begins, and kept while the turns go on with the pointer still, as it stays where it is
            var graphWheel = null;
            graphCanvas.addEventListener('wheel', function (e) {
                var at = onPlot(e), v = viewNow(), dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1),
                    k = Math.pow(1.002, Math.max(-300, Math.min(300, dy))), p, x0 = plotX(v, 0), y0 = plotY(v, 0), w = graphWheel;
                e.preventDefault();
                if (graphLook.lock) return; // the view stays, and the page does not scroll under the plot
                p = w && e.timeStamp - w.t < 300 && Math.hypot(at.x - w.at.x, at.y - w.at.y) <= 2 ? w.p : graphPoint(at, GRAPH_ZOOM_REACH);
                graphWheel = { t: e.timeStamp, at: at, p: p };
                popShut();
                if (!p.spot) {
                    at = { x: plotX(v, p.x), y: plotY(v, p.y) };
                } else {
                    if (Math.abs(at.x - x0) <= GRAPH_ZOOM_SNAP) at.x = x0;
                    if (Math.abs(at.y - y0) <= GRAPH_ZOOM_SNAP) at.y = y0;
                }
                graphMove(v, at, at, k);
                if (graphStart && !graphShading) graphBegin(); // a drag goes on from the view zoomed, not back to the one it began with
                clearTimeout(graphSaving);
                graphSaving = setTimeout(saveState, 300);
            }, { passive: false });

            // the buttons: twice as close, twice as far, about the middle; the start again; the view
            // typed; ∫ for an area; and the picture, in the corner below. A button of the view lets ∫ go
            graphPlot.addEventListener('click', function (e) {
                var b = e.target.closest('[data-zoom]'), mid = { x: graphPlot.clientWidth / 2, y: graphPlot.clientHeight / 2 }, at;
                if (!b) return;
                if (b.dataset.zoom === 'save') { // its menu, above it, as the history's Export has one
                    at = inside(b.getBoundingClientRect());
                    if (b.shut) {
                        b.shut = false;
                        return;
                    }
                    openMenu(exportItems(), { left: at.right, top: at.top, alignRight: true }, b);
                    menu.style.top = Math.max(4, at.top - 4 - menu.offsetHeight) + 'px';
                    return;
                }
                if (b.dataset.zoom === 'area') {
                    areaOn(!graphShading);
                    return;
                }
                if (graphShading) areaOn(false);
                if (b.dataset.zoom === 'window') {
                    showWindow(graphWindow.hidden);
                    return;
                }
                popShut();
                if (b.dataset.zoom === 'home') {
                    graphView = null;
                    drawGraph();
                } else {
                    graphMove(viewNow(), mid, mid, b.dataset.zoom === 'in' ? 0.5 : 2);
                }
                saveState();
            }, false);

            // The view typed: where x goes from and to across the plot, and y up it. Its boxes show the
            // view as it is, each to what a pixel tells apart, and set it as they are typed in, once
            // both ends of x or y are numbers, the first below the second; a pair that is not is
            // marked. Enter or Esc goes back to the plot
            function showWindow(open) {
                graphWindow.hidden = !open;
                graphWindowButton.classList.toggle('calc-on', open);
                if (!open) {
                    if (graphWindow.contains(document.activeElement)) document.activeElement.blur();
                    return;
                }
                graphEnds.forEach(function (box) { box.parentNode.classList.remove('calc-bad'); });
                drawGraph();
                if (focusBox(graphEnds[0])) graphEnds[0].select();
            }

            // the boxes as the view is, unless one is being typed in; with same scale the other two are, as they
            // follow it. Reset dim while all is as it starts
            function fillWindow(v, w, h) {
                var typing = graphEnds.indexOf(document.activeElement);
                if (!graphWindow.hidden) graphReset.classList.toggle('calc-off', !graphView && JSON.stringify(graphLook) === JSON.stringify(GRAPH_LOOK));
                if (graphWindow.hidden || typing > -1 && !squareOn()) return;
                [graphX(v, 0), graphX(v, w), graphY(v, h), graphY(v, 0)].forEach(function (n, k) {
                    if (typing > -1 && (k < 2) === (typing < 2)) return;
                    graphEnds[k].value = local(String(graphRound(n, k < 2 ? pixelX(v, n) : pixelY(v, n))));
                    graphEnds[k].parentNode.classList.remove('calc-bad');
                });
            }

            graphEnds.forEach(function (box) {
                box.addEventListener('input', function () {
                    var w = graphPlot.clientWidth, h = graphPlot.clientHeight, v = viewNow(), n, x, y;
                    onlyNumber(box);
                    n = graphEnds.map(boxNumber);
                    n = [scaleX(n[0]), scaleX(n[1]), scaleY(n[2]), scaleY(n[3])]; // on a log scale, their powers of ten: above 0
                    x = n[0] < n[1] && isFinite(n[0]) && isFinite(n[1]) && (n[1] - n[0]) / w > Math.max(1e-12, Math.max(Math.abs(n[0]), Math.abs(n[1])) * 1e-11) && (n[1] - n[0]) / w < 1e12;
                    y = n[2] < n[3] && isFinite(n[2]) && isFinite(n[3]) && (n[3] - n[2]) / h > Math.max(1e-12, Math.max(Math.abs(n[2]), Math.abs(n[3])) * 1e-11) && (n[3] - n[2]) / h < 1e12;
                    graphEnds[0].parentNode.classList.toggle('calc-bad', !x);
                    graphEnds[2].parentNode.classList.toggle('calc-bad', !y);
                    if (squareOn()) { // the pair typed in, the other as long a unit
                        if (graphEnds.indexOf(box) < 2) y = false;
                        else x = false;
                    }
                    if (!x && !y) return;
                    graphView = {
                        x: x ? (n[0] + n[1]) / 2 : v.x,
                        y: y ? (n[2] + n[3]) / 2 : v.y,
                        ux: x ? (n[1] - n[0]) / w : squareOn() ? (n[3] - n[2]) / h * squareRatio() : v.ux,
                        uy: y ? (n[3] - n[2]) / h : v.uy
                    };
                    drawGraph();
                    clearTimeout(graphSaving);
                    graphSaving = setTimeout(saveState, 300);
                }, false);
                box.addEventListener('keydown', function (e) {
                    if (e.which !== 13) return;
                    e.preventDefault();
                    showWindow(false);
                }, false);
            });

            // The switches of the settings, under the view's boxes: a click, Space or Enter turns each on or
            // off, and of the arrows, picks None, One end or Both; a click leaving the focus where it was. The
            // names of the axes drawn as they are typed
            graphLooks.concat(graphArrows).forEach(function (b) {
                function flip() {
                    if (b.dataset.arrows) graphLook.arrows = +b.dataset.arrows;
                    else if (/^log/.test(b.dataset.look)) logScale(b.dataset.look, !graphLook[b.dataset.look]);
                    else graphLook[b.dataset.look] = !graphLook[b.dataset.look];
                    showLooks();
                    popShut();
                    drawGraph();
                    saveState();
                }
                b.addEventListener('mousedown', function (e) { e.preventDefault(); }, false);
                b.addEventListener('click', flip, false);
                b.addEventListener('keydown', function (e) {
                    if (e.which !== 13 && e.which !== 32) return;
                    e.preventDefault();
                    flip();
                }, false);
            });

            // An axis on a log scale, or off it, as much of it seen as was: from 0.01 to 100 where all of it was
            // 0 or below, else from where it was above 0 to its end, at least four powers of ten
            function logScale(k, on) {
                var v = viewNow(), x = k === 'logx', n = x ? plotWidth() : graphPlot.clientHeight || plotWidth(),
                    lo = x ? graphX(v, 0) : graphY(v, n), hi = x ? graphX(v, n) : graphY(v, 0), c, u;
                if (on && !(hi > 0)) {
                    c = 0;
                    u = GRAPH_DECADES / n;
                } else if (on) {
                    lo = Math.log10(Math.min(lo > 0 ? lo : Infinity, hi / Math.pow(10, GRAPH_DECADES)));
                    c = (lo + Math.log10(hi)) / 2;
                    u = (Math.log10(hi) - lo) / n;
                } else {
                    c = (lo + hi) / 2;
                    u = (hi - lo) / n;
                }
                if (!isFinite(c) || !(u > 0) || !isFinite(u)) { // past what numbers reach: that axis as it starts
                    c = 0;
                    u = on ? GRAPH_DECADES / n : GRAPH_WIDTH / plotWidth();
                }
                graphLook[k] = on;
                graphView = x ? { x: c, y: v.y, ux: u, uy: v.uy } : { x: v.x, y: c, ux: v.ux, uy: u };
                if (on && graphPinned && !(x ? (graphPinned.area ? graphPinned.a : graphPinned.x) > 0 : graphPinned.area || graphPinned.y > 0)) graphAt = graphPinned = null; // a point the scale has not
            }

            // Reset: every setting as it starts, and the view, and the settings shut, back to the plot
            function resetLooks() {
                graphLook = Object.assign({}, GRAPH_LOOK);
                graphView = null;
                showWindow(false);
                showLooks();
                popShut();
                drawGraph();
                saveState();
            }

            graphReset.addEventListener('mousedown', function (e) { e.preventDefault(); }, false);
            graphReset.addEventListener('click', resetLooks, false);
            graphReset.addEventListener('keydown', function (e) {
                if (e.which !== 13 && e.which !== 32) return;
                e.preventDefault();
                resetLooks();
            }, false);

            // a step typed: drawn at once, or marked if it is not one, 0.5 or π/2
            graphSteps.forEach(function (box, i) {
                box.addEventListener('input', function () {
                    box.classList.toggle('calc-bad', isNaN(stepOf(box.value)));
                    if (isNaN(stepOf(box.value))) return;
                    graphLook[i ? 'ystep' : 'xstep'] = box.value.trim();
                    drawGraph();
                    clearTimeout(graphSaving);
                    graphSaving = setTimeout(saveState, 300);
                }, false);
                box.addEventListener('keydown', function (e) {
                    if (e.which !== 13) return;
                    e.preventDefault();
                    showWindow(false);
                }, false);
            });

            graphNames.forEach(function (box, i) {
                box.addEventListener('input', function () {
                    graphLook[i ? 'yname' : 'xname'] = box.value.trim();
                    drawGraph();
                    clearTimeout(graphSaving);
                    graphSaving = setTimeout(saveState, 300);
                }, false);
                box.addEventListener('keydown', function (e) {
                    if (e.which !== 13) return;
                    e.preventDefault();
                    showWindow(false);
                }, false);
            });

            // the switches, names and steps as they are: minor lines and a polar grid only with the grid, the
            // numbers of an axis only with it, and arrows with one; locked, the plot has no buttons to move the view
            function showLooks() {
                graphLooks.forEach(function (b) {
                    var on = !!graphLook[b.dataset.look];
                    b.classList.toggle('calc-on', on);
                    b.classList.toggle('calc-off', /^(minor|polar)$/.test(b.dataset.look) && !graphLook.grid || b.dataset.look === 'xnum' && !graphLook.xaxis ||
                        b.dataset.look === 'ynum' && !graphLook.yaxis || /^(square|polar)$/.test(b.dataset.look) && (graphLook.logx || graphLook.logy));
                    b.setAttribute('aria-checked', String(on));
                });
                graphArrows.forEach(function (b) {
                    b.classList.toggle('calc-on', +b.dataset.arrows === graphLook.arrows);
                    b.setAttribute('aria-checked', String(+b.dataset.arrows === graphLook.arrows));
                });
                graphArrows[0].parentNode.parentNode.classList.toggle('calc-off', !graphLook.xaxis && !graphLook.yaxis);
                graphNames.forEach(function (box, i) {
                    if (document.activeElement !== box) box.value = graphLook[i ? 'yname' : 'xname'];
                });
                graphSteps.forEach(function (box, i) {
                    if (document.activeElement === box) return;
                    box.value = graphLook[i ? 'ystep' : 'xstep'];
                    box.classList.remove('calc-bad');
                });
                graphPlot.classList.toggle('calc-graph-locked', graphLook.lock);
            }

            // the boxes left: as the view is again, a pair that was not one too
            graphWindow.addEventListener('focusout', function (e) {
                if (!graphWindow.contains(e.relatedTarget)) setTimeout(drawGraph, 0);
            }, false);

            // a window that changes its size can draw the calculator at another scale
            window.addEventListener('resize', drawGraph, false);

            // The graph as a picture, for notes or homework: the plot on its paper, twice as sharp at
            // least, without the point pointed at, and in its top left the function of each curve shown,
            // and an area shaded, from where to where and how much
            function graphPicture() {
                var at = graphAt, pinned = graphPinned, pic = document.createElement('canvas'), ctx = pic.getContext('2d'), r;
                graphAt = null;
                graphPinned = pinned && pinned.area ? pinned : null;
                graphSharp = 2;
                drawGraph();
                r = graphCanvas.width / graphPlot.clientWidth;
                pic.width = graphCanvas.width;
                pic.height = graphCanvas.height;
                ctx.fillStyle = GRAPH_INK.paper;
                ctx.fillRect(0, 0, pic.width, pic.height);
                ctx.drawImage(graphCanvas, 0, 0);
                graphAt = at;
                graphPinned = pinned;
                graphSharp = 0;
                drawGraph();
                ctx.setTransform(r, 0, 0, r, 0, 0);
                graphLegend(ctx, pinned);
                return pic;
            }

            // In the top left of a picture of the graph, the function of each curve shown, its points and
            // their fit, an area shaded, from where to where and how much, and the values of the letters
            function graphLegend(ctx, pinned) {
                var lines = [], wide;
                graphFns.forEach(function (fn, i) {
                    if (graphData[i] && !graphOff[i]) {
                        lines.push({ i: i, text: trn(graphData[i].length, '{n} point', '{n} points') });
                        if (fn) lines.push({ i: i, text: tr('Best fit {fit}', { fit: fitText(fn.fit) }) });
                        return;
                    }
                    if (fn && graphModels[i]) {
                        lines.push({ i: i, text: graphInputs[i].value.trim() + (graphModels[i].fit ? ':  ' + graphModels[i].keys.map(function (k) {
                            return k + ' = ' + local(String(+graphModels[i].fit.values[k].toPrecision(6)));
                        }).join(', ') + ',  r² = ' + local(String(+graphModels[i].fit.r2.toPrecision(6))) : '') });
                    } else if (fn) {
                        lines.push({ i: i, text: CalcEngine.named(graphInputs[i].value) ? graphInputs[i].value.trim() :
                            'y = ' + graphInputs[i].value.trim().replace(/^y\s*=\s*/i, '') });
                    }
                    if (graphRels[i] || graphPlanes[i]) lines.push({ i: i, text: graphInputs[i].value.trim() });
                    if (fn && graphDiff[i]) lines.push({ i: i, text: 'y′ of ' + graphInputs[i].value.trim(), dashed: true });
                });
                if (!lines.length) return;
                if (pinned && pinned.area) {
                    lines.push({
                        i: pinned.i,
                        text: tr('Area from {a} to {b} = {v}', { a: local(String(pinned.a)), b: local(String(pinned.b)), v: (isFinite(pinned.s) ? statsValue(pinned.s).text : tr('none')) })
                    });
                }
                if (graphLetters.length) { // and the values of its letters, without a color
                    lines.push({
                        text: graphLetters.map(function (k) { return k + ' = ' + sliderText(graphVars[k], sliderStep(graphRange[k])); }).join(',  ')
                    });
                }
                // a light box over the plot, lifted off it a little, so it reads apart from the curves
                ctx.font = '13px Play, sans-serif';
                wide = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l.text).width + (l.i === undefined ? 17 : 42); }));
                ctx.beginPath();
                ctx.roundRect(8, 8, wide + 2, lines.length * 20 + 12, 6);
                ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
                ctx.shadowBlur = 6 * ctx.getTransform().a;
                ctx.shadowOffsetY = ctx.getTransform().a;
                ctx.fillStyle = 'rgba(236, 244, 239, 0.95)';
                ctx.fill();
                ctx.shadowColor = 'transparent';
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(51, 68, 59, 0.3)';
                ctx.stroke();
                ctx.textBaseline = 'middle';
                lines.forEach(function (l, k) {
                    var y = 8 + 6 + 10 + k * 20;
                    ctx.fillStyle = GRAPH_INK.text;
                    if (l.i === undefined) {
                        ctx.fillText(l.text, 17, y);
                        return;
                    }
                    ctx.beginPath();
                    ctx.moveTo(17, y);
                    ctx.lineTo(35, y);
                    ctx.strokeStyle = curveColor(l.i);
                    strokeAs(ctx, { d: graphStyle[l.i].d, w: Math.min(2, graphStyle[l.i].w + 1) }, l.dashed); // a little thicker, to show its color
                    ctx.fillText(l.text, 42, y);
                });
            }

            // saved as a file, graph.png
            function saveGraph() {
                graphPicture().toBlob(function (blob) { saveBlob(blob, 'graph.png'); }, 'image/png');
            }

            // A file saved, as the browser saves what a link to it downloads, with no permission of its
            // own: the picture of the graph, the history
            function saveBlob(blob, name) {
                var a = document.createElement('a'), url = URL.createObjectURL(blob);
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
            }

            // copied, to paste into a document or a message
            function copyGraph() {
                var png = new Promise(function (done) { graphPicture().toBlob(done, 'image/png'); });
                try {
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).catch(saveGraph);
                } catch (e) {
                    saveGraph(); // no copying of pictures here: the file
                }
            }

            // The graph as SVG, to scale without blur in a paper or slides: drawn as on its canvas, without the
            // point pointed at, into an SvgDraw in its place, the paper under it and its functions over it
            function graphSvg() {
                var at = graphAt, pinned = graphPinned, svg = new SvgDraw(graphPlot.clientWidth, graphPlot.clientHeight);
                graphAt = null;
                graphPinned = pinned && pinned.area ? pinned : null;
                graphDrawTo = svg;
                try {
                    drawGraph();
                    graphLegend(svg, pinned);
                } finally {
                    graphDrawTo = null;
                    graphAt = at;
                    graphPinned = pinned;
                    drawGraph();
                }
                return svg.text(GRAPH_INK.paper);
            }

            function saveSvg() {
                saveBlob(new Blob([graphSvg()], { type: 'image/svg+xml;charset=utf-8' }), 'graph.svg');
            }

            // What the graph draws with, written as SVG: each path stroked or filled an element of its own, and
            // each text, in the plot's own pixels. What is put under the rest (destination-over) goes first; the
            // paper's rim the axes have over the curves (source-atop) is left out, as it only lets them show
            // through a curve that fills the plot
            function SvgDraw(w, h) {
                this.w = w;
                this.h = h;
                this.parts = [];
                this.d = '';
                this.dash = [];
                this.at = null;
                this.measure = document.createElement('canvas').getContext('2d');
                this.strokeStyle = this.fillStyle = '#000';
                this.lineWidth = 1;
                this.lineCap = 'butt';
                this.lineJoin = 'miter';
                this.globalAlpha = 1;
                this.globalCompositeOperation = 'source-over';
                this.font = '10px sans-serif';
                this.textAlign = 'start';
                this.textBaseline = 'alphabetic';
            }

            SvgDraw.prototype = {
                n: function (x) { return String(Math.round(x * 100) / 100); },
                esc: function (t) { return escaped(t); }, // main.js
                setTransform: function () { }, // in the plot's pixels, however sharp the canvas is
                getTransform: function () { return { a: 1 }; },
                clearRect: function () { },
                beginPath: function () {
                    this.d = '';
                    this.at = null;
                },
                moveTo: function (x, y) {
                    this.d += 'M' + this.n(x) + ' ' + this.n(y);
                    this.at = [x, y];
                },
                lineTo: function (x, y) {
                    if (!this.at) return this.moveTo(x, y);
                    this.d += 'L' + this.n(x) + ' ' + this.n(y);
                    this.at = [x, y];
                },
                closePath: function () {
                    this.d += 'Z';
                },
                rect: function (x, y, w, h) {
                    this.moveTo(x, y);
                    this.d += 'h' + this.n(w) + 'v' + this.n(h) + 'h' + this.n(-w) + 'Z';
                },
                roundRect: function (x, y, w, h, r) {
                    this.moveTo(x + r, y);
                    this.d += 'H' + this.n(x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + this.n(x + w) + ' ' + this.n(y + r) + 'V' + this.n(y + h - r) +
                        'A' + r + ' ' + r + ' 0 0 1 ' + this.n(x + w - r) + ' ' + this.n(y + h) + 'H' + this.n(x + r) +
                        'A' + r + ' ' + r + ' 0 0 1 ' + this.n(x) + ' ' + this.n(y + h - r) + 'V' + this.n(y + r) +
                        'A' + r + ' ' + r + ' 0 0 1 ' + this.n(x + r) + ' ' + this.n(y) + 'Z';
                },
                arc: function (x, y, r, a0, a1, back) {
                    this.ellipse(x, y, r, r, 0, a0, a1, back);
                },
                // from where it starts on, a line to it first as the canvas draws one; a whole turn as two halves
                ellipse: function (x, y, rx, ry, turn, a0, a1, back) {
                    var span = back ? a0 - a1 : a1 - a0, sweep = back ? 0 : 1, mid;
                    if (span >= 2 * Math.PI - 1e-9) {
                        mid = a0 + (back ? -Math.PI : Math.PI);
                        this.ellipse(x, y, rx, ry, turn, a0, mid, back);
                        return this.ellipse(x, y, rx, ry, turn, mid, a0 + (back ? -2 : 2) * Math.PI, back);
                    }
                    span = ((span % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                    this.lineTo(x + rx * Math.cos(a0), y + ry * Math.sin(a0));
                    this.d += 'A' + this.n(rx) + ' ' + this.n(ry) + ' 0 ' + (span > Math.PI ? 1 : 0) + ' ' + sweep + ' ' +
                        this.n(x + rx * Math.cos(a1)) + ' ' + this.n(y + ry * Math.sin(a1));
                    this.at = [x + rx * Math.cos(a1), y + ry * Math.sin(a1)];
                },
                setLineDash: function (dash) {
                    this.dash = dash || [];
                },
                // an element, under the rest or over it as the canvas would put it; none where it only shows the axes through
                put: function (el) {
                    if (this.globalCompositeOperation === 'source-atop') return;
                    if (this.globalCompositeOperation === 'destination-over') this.parts.unshift(el);
                    else this.parts.push(el);
                },
                alpha: function () {
                    return this.globalAlpha < 1 ? ' opacity="' + this.globalAlpha + '"' : '';
                },
                stroke: function () {
                    if (!this.d) return;
                    this.put('<path d="' + this.d + '" fill="none" stroke="' + this.esc(this.strokeStyle) + '" stroke-width="' + this.n(this.lineWidth) + '"' +
                        (this.lineCap !== 'butt' ? ' stroke-linecap="' + this.lineCap + '"' : '') + (this.lineJoin !== 'miter' ? ' stroke-linejoin="' + this.lineJoin + '"' : '') +
                        (this.dash.length ? ' stroke-dasharray="' + this.dash.join(' ') + '"' : '') + this.alpha() + '/>');
                },
                fill: function () {
                    if (!this.d) return;
                    this.put('<path d="' + this.d + '" fill="' + this.esc(this.fillStyle) + '"' + this.alpha() + '/>');
                },
                fillRect: function (x, y, w, h) {
                    this.put('<rect x="' + this.n(x) + '" y="' + this.n(y) + '" width="' + this.n(w) + '" height="' + this.n(h) + '" fill="' + this.esc(this.fillStyle) + '"' + this.alpha() + '/>');
                },
                measureText: function (t) {
                    this.measure.font = this.font;
                    return this.measure.measureText(t);
                },
                words: function (t, x, y, paint) {
                    this.put('<text x="' + this.n(x) + '" y="' + this.n(y) + '" style="font: ' + this.esc(this.font) + '"' +
                        ({ center: ' text-anchor="middle"', right: ' text-anchor="end"', end: ' text-anchor="end"' }[this.textAlign] || '') +
                        ({ middle: ' dominant-baseline="central"', top: ' dominant-baseline="hanging"', bottom: ' dominant-baseline="text-after-edge"' }[this.textBaseline] || '') +
                        paint + this.alpha() + '>' + this.esc(t) + '</text>');
                },
                fillText: function (t, x, y) {
                    this.words(t, x, y, ' fill="' + this.esc(this.fillStyle) + '"');
                },
                strokeText: function (t, x, y) {
                    this.words(t, x, y, ' fill="none" stroke="' + this.esc(this.strokeStyle) + '" stroke-width="' + this.n(this.lineWidth) + '" stroke-linejoin="round"');
                },
                // the whole of it, on the paper, cut to the plot as the canvas is
                text: function (paper) {
                    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + this.w + '" height="' + this.h +
                        '" viewBox="0 0 ' + this.w + ' ' + this.h + '"><defs><clipPath id="plot"><rect width="' + this.w + '" height="' + this.h + '"/></clipPath></defs>' +
                        '<rect width="' + this.w + '" height="' + this.h + '" fill="' + paper + '"/><g clip-path="url(#plot)">\n' + this.parts.join('\n') + '\n</g></svg>\n';
                }
            };

            // The table as CSV, for a spreadsheet: x, or n of sequences, and each curve's y, as many rows as
            // the Table tab has, 60 at least; apart by commas, or semicolons where the decimal mark is a comma
            function tableCsv() {
                var shown = tableCurves(), s = tableSteps(), mark = engine.comma ? ';' : ',', rows = [], k;
                function cell(t) {
                    if (/^[=+@\t\r]/.test(t) || /^-(?!\d)/.test(t)) t = "'" + t;
                    return t.indexOf(mark) > -1 || /["\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
                }
                rows.push([tableSeqs() ? 'n' : 'x'].concat(shown.map(function (i) { return graphInputs[i].value.trim(); })));
                for (k = 0; k < Math.max(graphLines, 60); k++) {
                    rows.push(tableRow(s, shown, k).map(function (y, c) {
                        return !c ? local(String(y)) : isFinite(y) ? local(String(+y.toPrecision(15))) : '';
                    }));
                }
                return '\ufeff' + rows.map(function (row) { return row.map(cell).join(mark); }).join('\r\n') + '\r\n';
            }

            function saveTable() {
                livePoints();
                saveBlob(new Blob([tableCsv()], { type: 'text/csv;charset=utf-8' }), 'graph-table.csv');
            }

            // The graph as a link: its boxes, their colors, what is hidden and fitted, the sliders, the view,
            // the settings that are not as they start, and the unit of angles, as JSON in base64url after #g=,
            // of the website's page, or of this one where it is the website. Nothing is sent anywhere: the
            // browser keeps what is after # to itself
            function graphLink() {
                var g = { f: graphInputs.slice(0, graphCount).map(function (box) { return box.value; }), u: deg }, look = {}, bytes, bin = '';
                if (graphHue.slice(0, graphCount).some(function (h, i) { return h !== i; })) g.c = graphHue.slice(0, graphCount);
                if (graphView) g.view = graphView;
                if (graphOff.slice(0, graphCount).some(Boolean)) g.off = graphOff.slice(0, graphCount);
                if (graphDiff.slice(0, graphCount).some(Boolean)) g.d = graphDiff.slice(0, graphCount);
                if (graphStyle.slice(0, graphCount).some(function (st) { return st.d || st.w !== 1 || st.l || st.c; })) g.s = graphStyle.slice(0, graphCount);
                if (graphLetters.length) g.p = graphLetters.reduce(function (p, k) {
                    if (graphRange[k]) p[k] = [graphVars[k], graphRange[k][0], graphRange[k][1]];
                    return p;
                }, {});
                Object.keys(GRAPH_LOOK).forEach(function (k) { if (graphLook[k] !== GRAPH_LOOK[k]) look[k] = graphLook[k]; });
                if (Object.keys(look).length) g.look = look;
                bytes = new TextEncoder().encode(JSON.stringify(g));
                bytes.forEach(function (b) { bin += String.fromCharCode(b); });
                return (/^https?:$/.test(location.protocol) ? location.href.split('#')[0] : GRAPH_SITE) + '#g=' +
                    btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            }

            // a graph of a link, as graphLink writes it, in the form saveState keeps one; null if it is not one
            function linkedGraph(hash) {
                var m = /^#g=([A-Za-z0-9_-]{1,40000})$/.exec(hash), g, bin;
                if (!m) return null;
                try {
                    bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
                    g = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); })));
                } catch (e) {
                    return null;
                }
                if (!g || !Array.isArray(g.f) || !g.f.every(function (t) { return typeof t === 'string'; })) return null;
                return {
                    f: g.f.map(function (t) { return t.slice(0, 2000); }), c: g.c, view: g.view || null, off: g.off, d: g.d, p: g.p, s: g.s,
                    look: Object.assign({}, GRAPH_LOOK, g.look && typeof g.look === 'object' ? g.look : {}), u: [0, 1, 2].indexOf(g.u) > -1 ? g.u : deg
                };
            }

            // A page opened from a link of a graph shows that graph in place of one's own. The link goes from the
            // address, so a reload does not open it again. The website opens
            // it in Advanced mode (index.html), the graph popped out beside the rail once the page has said so
            // (app.js, its calc-home), and not as a panel over the keys before it: app.js may come in later than
            // a moment after this, its file still loading
            var linkWaits = false;

            function showLink() {
                linkWaits = false;
                if (app.home) goTo('graph'); else showGraph(true);
            }

            function takeLink() {
                var g = linkedGraph(location.hash);
                if (g) {
                    try {
                        history.replaceState(null, '', location.href.split('#')[0]);
                    } catch (e) { }
                    loadGraph(g);
                    setUnit(g.u);
                    readGraph(); // its letters known, for their sliders to be kept
                    saveState();
                    if (document.documentElement.classList.contains('home') && !app.home) {
                        linkWaits = true; // till calc-home; shown as the page has loaded at the latest, if app.js never says
                        window.addEventListener('load', function () { if (linkWaits) showLink(); }, false);
                    } else {
                        showLink();
                    }
                }
            }

            // its menu: a link of it, the picture copied or saved as PNG, saved as SVG, and the table as CSV
            function exportItems() {
                return [
                    [tr('Copy link'), function () {
                        copy(graphLink());
                        notify('Link copied');
                    }],
                    null,
                    [tr('Copy picture'), copyGraph],
                    [tr('Save as PNG'), saveGraph],
                    [tr('Save as SVG'), saveSvg],
                    null,
                    [tr('Save table as CSV'), saveTable, tableCurves().length > 0]
                ];
            }

            // ---------- the table of the graph ---------- //

            // The values of the curves in rows: x from a start, by a step, and y of each curve, in
            // its color. An empty box goes by the view of the graph: from its left edge, by a step
            // that gives some 20 rows across it, 15, 30 or 45 in degrees. A click on a value puts
            // it into the calculation; scrolled to its end, the table goes on
            graph.querySelector('.calc-graph-tabs').addEventListener('click', function (e) {
                var tab = e.target.closest('.calc-graph-tab');
                if (!tab) return;
                showGraphTab(tab.dataset.tab);
                if (graphTab === 'examples' && focusBox(graphSearch)) graphSearch.select(); // typing replaces the last search
                saveState();
            }, false);

            // the plot, the table, or the examples in place of the boxes, the sliders and the plot;
            // big on a wide page, the plot stays beside the examples (style.css)
            function showGraphTab(tab) {
                graphTab = tab === 'table' || tab === 'examples' ? tab : 'graph';
                [].forEach.call(graph.querySelectorAll('.calc-graph-tab'), function (t) {
                    t.classList.toggle('calc-on', t.dataset.tab === graphTab);
                });
                graph.classList.toggle('calc-graph-browse', graphTab === 'examples');
                graph.classList.toggle('calc-graph-other-tab', graphTab !== 'graph'); // undo and redo only on the graph's tab (style.css)
                graphExamples.hidden = graphTab !== 'examples';
                if (graphTab === 'examples') renderExamples();
                graphPlot.hidden = graphTab === 'table';
                graphTable.hidden = graphTab !== 'table';
                graphAt = null;
                graphLines = 0; // the table from its start again
                graphList.scrollTop = 0;
                graphRender();
            }

            [graphFrom, graphBy].forEach(function (box) {
                box.addEventListener('input', function () {
                    onlyNumber(box);
                    graphLines = 0;
                    graphList.scrollTop = 0;
                    renderTable();
                    saveState();
                }, false);
            });

            // the first x and the step: as the boxes hold them, else from the view. A box that
            // holds no number, or a step that is not above 0, is marked, and goes by the view. Of
            // sequences alone, n from the first of them, by 1
            function tableSteps() {
                var v = viewNow(), w = plotWidth(), left = valueX(v.x - w / 2 * v.ux), want = (valueX(v.x + w / 2 * v.ux) - left) / 20, // on a log scale too, the view's ends
                    p = Math.pow(10, Math.floor(Math.log10(want))), m = want / p,
                    by = graphAngles() && deg === 1 && want > 3 && want <= 180 ?
                        [5, 10, 15, 30, 45, 90, 180].filter(function (d) { return d >= want; })[0] :
                        p * (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10),
                    seqs = tableSeqs(), from, typed;
                by = seqs ? 1 : +by.toPrecision(12);
                graphBy.placeholder = local(String(by));
                typed = boxNumber(graphBy);
                graphBy.parentNode.classList.toggle('calc-bad', !!graphBy.value && !(typed > 0 && isFinite(typed)));
                if (graphBy.value && typed > 0 && isFinite(typed)) by = typed;
                from = seqs ? Math.min.apply(null, seqs.map(function (i) { return graphPlanes[i].range(deg)[0]; })) :
                    +(Math.ceil(left / by) * by).toPrecision(12);
                graphFrom.placeholder = local(String(from));
                typed = boxNumber(graphFrom);
                graphFrom.parentNode.classList.toggle('calc-bad', !!graphFrom.value && !isFinite(typed));
                if (graphFrom.value && isFinite(typed)) from = typed;
                return { from: from, by: by };
            }

            // A value of the table, rounded to as many digits as its column has room for, up to 13:
            // -0.7071068, not -0.70710678… cut off. A fraction, or degrees, minutes and seconds, in
            // those modes. What is put in or copied is the whole number
            function tableValue(n, room) {
                var d = 13, r;
                do {
                    r = String(+n.toPrecision(d));
                } while (r.length > room && --d > 2);
                return (app.fracMode && CalcEngine.fraction(n)) || (app.dmsMode && CalcEngine.dms(n)) ? statsValue(n).html : shownResult({ value: r }, r).html;
            }

            // how many characters a column of values has room for, measured in the font of the table
            function tableRoom() {
                var cell = graphList.querySelector('.calc-graph-names > span:nth-child(2)'), ctx = graphCanvas.getContext('2d', { willReadFrequently: true }), wide;
                if (!cell) return 13;
                ctx.font = '13px Play, sans-serif';
                wide = ctx.measureText('-0.123456789').width / 12;
                return Math.max(4, Math.floor((cell.clientWidth - 16) / wide)); // its padding, and 2px to spare
            }

            // the rows from..to of the table, as HTML; their values go into graphValues
            function tableRows(s, shown, from, to) {
                var html = '', room = tableRoom(), k, row;
                for (k = from; k < to; k++) {
                    row = graphValues[k] = tableRow(s, shown, k);
                    html += '<div class="calc-graph-line">' + row.map(function (n, c) {
                        var text = !isFinite(n) ? '–' : c ? tableValue(n, room) : graphValue({ x: n }, 'x');
                        return '<span class="calc-graph-cell' + (isFinite(n) ? '' : ' calc-none') + '" data-r="' + k + '" data-c="' + c + '">' +
                            text + '</span>';
                    }).join('') + '</div>';
                }
                return html;
            }

            // row k of the table, as the tab and its CSV have it: its x, then the value of each curve shown there
            function tableRow(s, shown, k) {
                var x = +(s.from + k * s.by).toPrecision(12); // 0.3, not 0.30000000000000004
                return [x].concat(shown.map(function (i) { return graphFns[i] ? graphFns[i].at(x, deg, true) : graphPlanes[i].at(x, deg)[1]; }));
            }

            // the curves shown in the table, by their number: the functions, and the sequences, each a(n) at a whole x it has
            function tableCurves() {
                return graphFns.map(function (fn, i) { return fn || (graphPlanes[i] && graphPlanes[i].kind === 'seq') ? i : -1; }).filter(function (i) { return i > -1; });
            }

            // the curves of the table where they are all sequences, its x being their n; else null
            function tableSeqs() {
                var shown = tableCurves();
                return shown.length && shown.every(function (i) { return !graphFns[i]; }) ? shown : null;
            }

            function renderTable() {
                var shown = tableCurves(), s;
                if (!graph.classList.contains('calc-open') || graphTab !== 'table') return;
                livePoints();
                s = tableSteps();
                graphLines = Math.max(graphLines, 60);
                graphValues = [];
                graphList.style.setProperty('--cols', shown.length + 1);
                graphList.innerHTML = '<div class="calc-graph-line calc-graph-names"><span><i>' + (tableSeqs() ? 'n' : 'x') + '</i></span>' + shown.map(function (i) {
                    return '<span>' + graphSwatch(i) + (graphFns[i] ? '<i>y</i>' : '<i>' + graphPlanes[i].name + '</i>(<i>n</i>)') + '</span>';
                }).join('') + '</div>'; // first, so the room of a column can be measured
                if (shown.length) graphList.insertAdjacentHTML('beforeend', tableRows(s, shown, 0, graphLines));
                graphShown();
            }

            // near the end, 60 more rows, up to 2000
            graphList.addEventListener('scroll', function () {
                var shown = tableCurves();
                hideTip();
                if (!shown.length || graphLines >= 2000 || graphList.scrollTop + graphList.clientHeight < graphList.scrollHeight - 60) return;
                graphList.insertAdjacentHTML('beforeend', tableRows(tableSteps(), shown, graphLines, graphLines + 60));
                graphLines += 60;
            }, false);

            // a value goes into the calculation on any click: with no tip of its own to Insert it from, as a result of a card or the
            // statistics has, a click is the way in, as a value of a fit's is
            graphList.addEventListener('click', function (e) {
                var cell = e.target.closest('.calc-graph-cell'), n = cell && graphValues[cell.dataset.r][cell.dataset.c];
                if (!cell || !isFinite(n) || !engine.put(n)) return;
                keyBoard['AC'].children[0].firstChild.data = 'C';
                showGraph(false);
                refresh();
                saveState();
                if (graphAlone) ask('graph-put');
            }, false);

        // -------- examples of the graph -------- //

        // each example, with the words it is found by: its group, its name, what it types and what it is
        CalcFormulas.graphs.forEach(function (group) {
            group.list.forEach(function (ex) {
                graphExItems.push({ c: group.c, ex: ex, words: [group.c, ex.t, ex.f.join(' '), ex.d, tr(group.c), tr(ex.t), tr(ex.d)].join(' ').toLowerCase() }); // in English and the language in use
            });
        });

        graphSearch.addEventListener('input', renderExamples, false);

        // Enter in the search draws the first one found
        graphSearch.addEventListener('keydown', function (e) {
            var item = graphExList.querySelector('.calc-gx-item');
            if (e.which !== 13) return;
            e.preventDefault();
            if (item) putExample(graphExItems[+item.dataset.i].ex);
        }, false);

        graphExList.addEventListener('click', function (e) {
            var row = e.target.closest('.calc-gx-row');
            if (row) putExample(graphExItems[+row.parentNode.dataset.i].ex);
        }, false);

        // what an example types, with the decimal mark in use: 4,1 and ; between with the comma
        function exampleText(text) {
            return engine.comma ? text.replace(/,/g, ';').replace(/\./g, ',') : text;
        }

        // the examples the search finds, under the name of their group, as the constants are:
        // its name, and what it types, a box after another
        function renderExamples() {
            var words = graphSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean), group = null, html = '';
            graphExItems.forEach(function (entry, i) {
                if (!words.every(function (w) { return entry.words.indexOf(w) > -1; })) return;
                if (entry.c !== group) html += '<div class="calc-gx-cat">' + tr(entry.c) + '</div>';
                group = entry.c;
                html += '<div class="calc-gx-item" data-i="' + i + '"><div class="calc-gx-row">' +
                    '<span class="calc-gx-col"><span class="calc-gx-name">' + tr(entry.ex.t) + '</span>' +
                    '<span class="calc-gx-f calc-gx-eq calc-gx-val"><span>' + entry.ex.f.map(function (text) {
                        return escaped(exampleText(text));
                    }).join('<span class="calc-graph-ex-gap"></span>') + '</span></span></span></div></div>';
            });
            graphExList.innerHTML = html || '<div class="calc-gx-none">' + tr('Nothing found') + '</div>';
            graphExList.scrollTop = 0;
            hideTip();
        }

        // An example drawn in place of the curves there were, as Clear leaves them: its boxes,
        // its sliders at their values, its points with their fit, its colors, in Rad if it needs it, and the
        // view as it starts, or its own. Then the plot shows it, the sliders it plays playing
        function putExample(ex) {
            var w, h, u, fill, v = ex.v;
            stopSliders();
            graphInputs.forEach(function (box, i) { box.value = i < ex.f.length ? exampleText(ex.f[i]) : ''; });
            graphCount = ex.f.length;
            graphHue = (ex.hue || []).concat(allHues().filter(function (h) { return !ex.hue || ex.hue.indexOf(h) < 0; }));
            graphOff = graphOff.map(function () { return false; });
            graphDiff = graphDiff.map(function (d, i) { return !i && ex.fit ? ex.fit : false; });
            graphStyle = graphStyle.map(function () { return Object.assign({}, GRAPH_STYLE); });
            graphFrom.value = graphBy.value = '';
            graphLines = 0;
            forgetLetters();
            Object.keys(ex.p || {}).forEach(function (k) {
                graphVars[k] = ex.p[k][0];
                graphRange[k] = [ex.p[k][1], ex.p[k][2]];
            });
            if (ex.rad && deg) setUnit(0);
            showCells(-1);
            graphView = null;
            graphLook.logx = !!ex.logx; // drawn as it is made, on straight scales unless it is for a log one
            graphLook.logy = !!ex.logy;
            showLooks();
            showGraphTab('graph');
            readGraph();
            if (v) { // all of its view shown, as much each way, or with stretch or a log scale each filling the plot
                w = graphPlot.clientWidth;
                h = graphPlot.clientHeight;
                v = v.map(function (n, i) { return (i < 2 ? ex.logx : ex.logy) ? Math.log10(n) : n; });
                u = Math.max((v[1] - v[0]) / w, (v[3] - v[2]) / h);
                fill = ex.stretch || ex.logx || ex.logy;
                graphView = { x: (v[0] + v[1]) / 2, y: (v[2] + v[3]) / 2, ux: fill ? (v[1] - v[0]) / w : u, uy: fill ? (v[3] - v[2]) / h : u };
                if (ex.stretch) graphLook.square = false;
                if (ex.square) graphLook.square = true;
                showLooks();
                graphRender();
            }
            (ex.play || []).forEach(function (k) { playSlider(k, true); });
            saveState();
        }

        // the tip of an example: what it is, and that a click draws it
        function exampleTip(el) {
            var ex = graphExItems[+el.parentNode.dataset.i].ex;
            return { t: ex.t, d: tr('{d} Click to draw it in place of the curves there are.', { d: tr(ex.d) + (ex.rad && deg ? tr(' It is drawn in Rad.') : '') }), k: '' };
        }


        // the Deg key pressed (main.js): Rad, Deg or Grad
        function unitChanged(u) {
            deg = u;
        }
    };
})(typeof window !== 'undefined' ? window : this);
