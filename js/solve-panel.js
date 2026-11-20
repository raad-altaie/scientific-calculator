// The cards of the solver: equations and calculus, probability and statistics' tests, geometry, and money, with
// their drawings. maths.js and engine.js work them out; this is how the calculator shows them. Made by main.js as
// it starts, CalcSolvePanel(app, shared): app is what the cards take from the rest of the calculator, those values
// that change read as they are now; shared is filled with what the calculator takes from them, before they start
(function (global) {
    'use strict';

    global.CalcSolvePanel = function (app, shared) {
        var angleTyped = app.angleTyped, complexText = app.complexText, countDrawing = app.countDrawing, densityOf = app.densityOf,
            drawnTile = app.drawnTile, engine = app.engine, fix = app.fix, fromRadians = app.fromRadians, graphDrawing = app.graphDrawing,
            local = app.local, placesValue = app.placesValue, planeFit = app.planeFit, planeLabel = app.planeLabel,
            rangeAround = app.rangeAround, rootName = app.rootName, shortNumber = app.shortNumber, sidesOf = app.sidesOf,
            statsValue = app.statsValue, toRadians = app.toRadians, tr = app.tr, trn = app.trn, unitWord = app.unitWord;

        // what the calculator takes from the cards
        Object.defineProperties(shared, Object.getOwnPropertyDescriptors({
            get LEVEL() { return LEVEL; },
            get SOLVE_TOOLS() { return SOLVE_TOOLS; }
        }));

            // ---------------- solve ---------------- //

            // Equations solved for x, calculus and probability, a tab each: a card for each tool, as the
            // formulas have, which opens its boxes. What it gives is worked out as they are typed, in
            // tiles that put a value into the calculation with a click, as the statistics do. A box of
            // a number takes what the calculator reads, pi/4 or sqrt(2), in the unit of angles in use,
            // and an empty one its default, which it shows; a box of a function what the graph reads.
            // Each tool: t its name, f how it is written, d what it gives; fields its boxes, each of a
            // key k, a label l, a placeholder ph, and fn for a function, text for words read as they
            // are, def for the number of an empty one, inf where ∞ is a number, area for a box of lines,
            // a list, choice for ways to choose one of, each a button, which it has as '0', '1' …; cols the
            // columns of the boxes; example, what its Example button types in its boxes, by key; run(numbers, typed) its results: { rows: [{ l, v: a number, text, m: a
            // matrix, head: the heads of its columns, a table with Copy table, places: its number or numbers
            // shown to these decimal places, money to the cent, put in and copied whole, wide }], note, warn, bad: the keys of the boxes that are not what they
            // should be, cols: the columns of the tiles, where not three }
            var MEAN = { k: 'mu', l: 'μ', ph: '0', def: 0 }, // the boxes of a normal distribution
                SPREAD = { k: 'sigma', l: 'σ', ph: '1', def: 1 },
                PROBABILITY = { k: 'p', l: 'p', ph: '0.95', def: 0.95 }, // a chance to find the value of
                LEVEL = { k: 'level', l: 'Level', ph: '0.95', def: 0.95 }, // of a confidence interval
                SOLVE_TOOLS = {
                solve: [
                    { id: 'equation', t: 'Equation', f: 'x<sup>3</sup> = 2x + 1', d: 'Every x where its two sides are equal, or where one side alone is 0; from and to where to look, if you like.',
                        fields: [{ k: 'eq', l: 'Equation', ph: 'x^3 = 2x + 1', fn: true }, { k: 'from', l: 'From', ph: 'optional' }, { k: 'to', l: 'To', ph: 'optional' }], cols: 2,
                        run: runEquation, example: { eq: 'x^3 = 2x + 1' } },
                    { id: 'inequality', t: 'Inequality', f: 'x<sup>2</sup> – 4 &gt; 0', d: 'Every x where it holds, as x &lt; –2 or x &gt; 2 and in intervals: with &lt;, &gt;, &lt;= or &gt;=, or two the same way, 1 &lt; x^2 &lt; 4. From and to where to look, if you like.',
                        fields: [{ k: 'eq', l: 'Inequality', ph: 'x^2 - 4 > 0', fn: true }, { k: 'from', l: 'From', ph: 'optional' }, { k: 'to', l: 'To', ph: 'optional' }], cols: 2,
                        run: runInequality, example: { eq: 'x^2 - 4 > 0' } },
                    { id: 'quadratic', waits: true, t: 'Quadratic', f: 'ax<sup>2</sup> + bx + c = 0', d: 'Its two roots, real or a ± bi, the discriminant b² – 4ac and the vertex of its parabola.',
                        fields: coefficients('abc'), cols: 3, run: function (n) { return runPoly([n.a, n.b, n.c]); }, example: { a: '1', b: '-2', c: '-3' } },
                    { id: 'cubic', waits: true, t: 'Cubic', f: 'ax<sup>3</sup> + bx<sup>2</sup> + cx + d = 0', d: 'Its three roots, real or a ± bi.',
                        fields: coefficients('abcd'), cols: 4, run: function (n) { return runPoly([n.a, n.b, n.c, n.d]); }, example: { a: '1', b: '-6', c: '11', d: '-6' } },
                    { id: 'quartic', waits: true, t: 'Quartic', f: 'ax<sup>4</sup> + bx<sup>3</sup> + cx<sup>2</sup> + dx + e = 0', d: 'Its four roots, real or a ± bi.',
                        fields: coefficients('abcde'), cols: 5, run: function (n) { return runPoly([n.a, n.b, n.c, n.d, n.e]); }, example: { a: '1', b: '0', c: '-5', d: '0', e: '4' } },
                    { id: 'polynomial', t: 'Polynomial', f: 'a<sub>n</sub>x<sup>n</sup> + … + a<sub>0</sub> = 0', d: 'Every root of a polynomial of any power up to 30, real or a ± bi, and it multiplied out: typed, x^5 – 3x + 1 or (x – 1)(x + 2)^2, or its coefficients from the highest power, 1, 0, -2, 1.',
                        fields: [{ k: 'p', l: 'p(x)', ph: 'x^5 - 3x + 1', fn: true }], run: runPolynomial, example: { p: 'x^5 - 3x + 1' } },
                    { id: 'system2', t: 'Two equations', f: 'a<sub>1</sub>x + b<sub>1</sub>y = c<sub>1</sub>', d: 'x and y of two linear equations: a₁x + b₁y = c₁ and a₂x + b₂y = c₂.',
                        fields: system(2), cols: 3, run: function (n) { return runSystem(n, 2); }, example: { a1: '1', b1: '1', c1: '3', a2: '1', b2: '-1', c2: '1' } },
                    { id: 'system3', t: 'Three equations', f: 'a<sub>1</sub>x + b<sub>1</sub>y + c<sub>1</sub>z = d<sub>1</sub>', d: 'x, y and z of three linear equations, each a row: a, b, c and what it equals, d.',
                        fields: system(3), cols: 4, run: function (n) { return runSystem(n, 3); }, example: { a1: '1', b1: '1', c1: '1', d1: '6', a2: '0', b2: '2', c2: '5', d2: '-4', a3: '2', b3: '5', c3: '-1', d3: '27' } },
                    { id: 'curves', t: 'Two curves', f: ['x<sup>2</sup> + y<sup>2</sup> = 25', 'x + y = 7'], d: 'Every x and y where two equations of them hold together, not only lines: where the circle x^2 + y^2 = 25 and the line x + y = 7 cross, or y = x^2 and x + y = 1.',
                        fields: [{ k: 'e1', l: 'Curve 1', ph: 'x^2 + y^2 = 25', fn: true, aria: 'First equation' }, { k: 'e2', l: 'Curve 2', ph: 'x + y = 7', fn: true, aria: 'Second equation' }], run: runCurves, example: { e1: 'x^2 + y^2 = 25', e2: 'x + y = 7' } }
                ],
                calculus: [
                    { id: 'derivative', t: 'Derivative', f: ['f′(x)', 'f″(x)'], d: 'The derivative of a function written out, x^3 sin(x) as 3x² sin(x) + x³ cos(x), and the derivative of that; at x its value, its slope there and the slope of that, and the line that touches it there.',
                        fields: [{ k: 'f', l: 'f(x)', ph: 'x^3', fn: true }, { k: 'x', l: 'x', ph: '2' }], cols: 1, run: runDerivative, example: { f: 'x^3', x: '2' } },
                    { id: 'extrema', t: 'Turning points', f: 'max and min of f(x)', d: 'Where a function is highest or lowest near by, x^3 – 3x at –1 and 1: each x and its value. With From and To, its highest and lowest between them as well, the ends among them.',
                        fields: [{ k: 'f', l: 'f(x)', ph: 'x^3 - 3x', fn: true }, { k: 'from', l: 'From', ph: 'optional' }, { k: 'to', l: 'To', ph: 'optional' }], cols: 2,
                        run: runExtrema, example: { f: 'x^3 - 3x' } },
                    { id: 'concavity', t: 'Curve shape', f: ['f′(x) &gt; 0', 'f″(x) &gt; 0'], d: 'Where a function rises and falls, where it bends up and down, and its inflection points, where the bend changes: x^4 – 4x^3 falls until 3 and bends down from 0 to 2. From and To, where to look, if you like.',
                        fields: [{ k: 'f', l: 'f(x)', ph: 'x^4 - 4x^3', fn: true }, { k: 'from', l: 'From', ph: 'optional' }, { k: 'to', l: 'To', ph: 'optional' }], cols: 2,
                        run: runCurveShape, example: { f: 'x^4 - 4x^3' } },
                    { id: 'integral', t: 'Integral', f: '∫<sub>a</sub><sup>b</sup> f(x) dx', d: 'The integral of a function from a to b, the area under it, its exact form where it has one, √π or 1/3, and the average value of the function there; an end may be ∞, typed inf.',
                        fields: [{ k: 'f', l: 'f(x)', ph: 'x^2', fn: true }, { k: 'a', l: 'From', ph: '0', def: 0, inf: true }, { k: 'b', l: 'To', ph: '1', def: 1, inf: true }], cols: 2,
                        run: runIntegral, example: { f: 'x^2', a: '0', b: '3' } },
                    { id: 'sum', t: 'Sum', f: 'Σ f(n)', d: 'The sum of a function of n, k, i or j, or of x, for each whole number from a to b. b may be ∞, typed inf: 1/n^2 from 1 on is π²/6.',
                        fields: [{ k: 'f', l: 'f(n)', ph: 'n^2', fn: true }, { k: 'a', l: 'From', ph: '1', def: 1 }, { k: 'b', l: 'To', ph: '10', def: 10, inf: true }], cols: 2,
                        run: function (n, raw) { return runSeries(n, raw, false); }, example: { f: '1/n^2', a: '1', b: 'inf' } },
                    { id: 'product', t: 'Product', f: 'Π f(n)', d: 'The product of a function of n, k, i or j, or of x, for each whole number from a to b. b may be ∞, typed inf: 1 – 1/n^2 from 2 on is 1/2.',
                        fields: [{ k: 'f', l: 'f(n)', ph: 'n', fn: true }, { k: 'a', l: 'From', ph: '1', def: 1 }, { k: 'b', l: 'To', ph: '5', def: 5, inf: true }], cols: 2,
                        run: function (n, raw) { return runSeries(n, raw, true); }, example: { f: '1 - 1/n^2', a: '2', b: 'inf' } },
                    { id: 'limit', t: 'Limit', f: 'lim<sub>x→a</sub> f(x)', d: 'What a function comes to as x comes to a, from below, from above and both, or ∞ where it grows without end: sin(x)/x as x comes to 0. a may be ∞, typed inf.',
                        fields: [{ k: 'f', l: 'f(x)', ph: 'sin(x)/x', fn: true }, { k: 'a', l: 'x →', ph: '0', def: 0, inf: true, name: 'The point x goes to' }], cols: 1, run: runLimit, example: { f: 'sin(x)/x', a: '0' } },
                    { id: 'taylor', t: 'Taylor series', f: 'f(a) + f′(a)(x – a) + …', d: 'A function as a polynomial about a, to the power you give, up to 12: sin x is x – x³/6 + x⁵/120 – …, and each coefficient, f⁽ᵏ⁾(a)/k!.',
                        fields: [{ k: 'f', l: 'f(x)', ph: 'sin(x)', fn: true }, { k: 'a', l: 'a', ph: '0', def: 0 }, { k: 'n', l: 'Power', ph: '7', def: 7 }], cols: 2, run: runTaylor, example: { f: 'sin(x)', a: '0', n: '7' } },
                    { id: 'between', t: 'Area between', f: '∫<sub>a</sub><sup>b</sup> |f(x) – g(x)| dx', d: 'The area between two curves from a to b, the parts where g is above as well, the integral of f – g, and where they cross on the way.',
                        fields: [{ k: 'f', l: 'f(x)', ph: 'x', fn: true, aria: 'f(x)' }, { k: 'g', l: 'g(x)', ph: 'x^2', fn: true, aria: 'g(x)' }, { k: 'a', l: 'From', ph: '0', def: 0 }, { k: 'b', l: 'To', ph: '1', def: 1 }], cols: 2,
                        run: runBetween, example: { f: 'x', g: 'x^2', a: '0', b: '1' } },
                    { id: 'arc', t: 'Arc length', f: '∫<sub>a</sub><sup>b</sup> √(1 + f′(x)²) dx', d: 'How long the curve of a function is from a to b, as a string laid along it.',
                        fields: [{ k: 'f', l: 'f(x)', ph: 'x^2', fn: true }, { k: 'a', l: 'From', ph: '0', def: 0 }, { k: 'b', l: 'To', ph: '1', def: 1 }], cols: 2, run: runArc, example: { f: 'x^2', a: '0', b: '1' } },
                    { id: 'ode', t: 'Differential equation', f: 'y′ = f(x, y)', d: 'y at x, where its slope y′ is a function of x and y and it starts at y₀ at x₀: y′ = x + y with y(0) = 1, by the steps of Runge and Kutta.',
                        fields: [{ k: 'f', l: 'y′ =', ph: 'x + y', fn: true }, { k: 'x0', l: 'x<sub>0</sub>', ph: '0', def: 0 }, { k: 'y0', l: 'y<sub>0</sub>', ph: '1', def: 1 }, { k: 'x', l: 'x', ph: '1', def: 1 }],
                        cols: 3, run: runOde, example: { f: 'x + y', x0: '0', y0: '1', x: '1' } }
                ],
                geometry: [
                    { id: 'triangle', t: 'Triangle', f: ['a, b, c', 'A, B, C'], d: 'Any three of its sides and angles, one a side at least, and the rest: each angle A across from its side a. Two sides and an angle not between them may ' +
                        'make two triangles, or none. Its area, perimeter, heights and the radii of its circles inside and round it, and it drawn. Angles in the unit in use, Deg, Rad or Grad.',
                        fields: [{ k: 'a', l: 'a', ph: '' }, { k: 'b', l: 'b', ph: '' }, { k: 'c', l: 'c', ph: '' }, { k: 'A', l: 'A', ph: '' }, { k: 'B', l: 'B', ph: '' }, { k: 'C', l: 'C', ph: '' }],
                        cols: 3, run: runTriangle, example: function () { return { a: '6', b: '8', A: angleTyped(30) }; } },
                    { id: 'shape', t: 'Shapes', f: ['Area', 'Perimeter'], d: 'The area and perimeter of a circle, rectangle, trapezoid, ellipse, sector of a circle or regular polygon, and more of each. Angles in the unit in use.',
                        fields: function (raw) {
                            var way = [{ k: 'shape', l: 'Shape', choice: ['Circle', 'Rectangle', 'Trapezoid', 'Ellipse', 'Sector', 'Polygon'] }];
                            return way.concat([
                                [{ k: 'r', l: 'r', ph: '5', name: 'The radius' }],
                                [{ k: 'w', l: 'Width', ph: '4' }, { k: 'h', l: 'Height', ph: '3' }],
                                [{ k: 'a', l: 'a', ph: '6', name: 'a' }, { k: 'b', l: 'b', ph: '4', name: 'b' }, { k: 'h', l: 'Height', ph: '3' }],
                                [{ k: 'a', l: 'a', ph: '5', name: 'a' }, { k: 'b', l: 'b', ph: '3', name: 'b' }],
                                [{ k: 'r', l: 'r', ph: '5', name: 'The radius' }, { k: 't', l: 'θ', ph: app.deg === 1 ? '60' : app.deg === 2 ? '50' : '1', name: 'θ' }],
                                [{ k: 'n', l: 'Sides', ph: '6' }, { k: 's', l: 'Side', ph: '2' }]
                            ][+raw.shape || 0]);
                        }, cols: 3, run: runShape, example: function (raw) {
                            var ex = [{ r: '5' }, { w: '4', h: '3' }, { a: '6', b: '4', h: '3' }, { a: '5', b: '3' }, { r: '5', t: angleTyped(60) }, { n: '6', s: '2' }][+raw.shape || 0];
                            ex.shape = raw.shape || '0';
                            return ex;
                        } },
                    { id: 'solid', t: 'Solids', f: ['Volume', 'Surface'], d: 'The volume and surface area of a sphere, cylinder, cone, box or square pyramid, and more of each.',
                        fields: function (raw) {
                            var way = [{ k: 'solid', l: 'Solid', choice: ['Sphere', 'Cylinder', 'Cone', 'Box', 'Pyramid'] }];
                            return way.concat([
                                [{ k: 'r', l: 'r', ph: '3', name: 'The radius' }],
                                [{ k: 'r', l: 'r', ph: '3', name: 'The radius' }, { k: 'h', l: 'Height', ph: '5' }],
                                [{ k: 'r', l: 'r', ph: '3', name: 'The radius' }, { k: 'h', l: 'Height', ph: '4' }],
                                [{ k: 'l', l: 'Length', ph: '4' }, { k: 'w', l: 'Width', ph: '3' }, { k: 'h', l: 'Height', ph: '2' }],
                                [{ k: 'a', l: 'Base side', ph: '4' }, { k: 'h', l: 'Height', ph: '6' }]
                            ][+raw.solid || 0]);
                        }, cols: 3, run: runSolid, example: function (raw) {
                            var ex = [{ r: '3' }, { r: '3', h: '5' }, { r: '3', h: '4' }, { l: '4', w: '3', h: '2' }, { a: '4', h: '6' }][+raw.solid || 0];
                            ex.solid = raw.solid || '0';
                            return ex;
                        } },
                    { id: 'points', t: 'Two points', f: ['distance', 'midpoint', 'y = mx + b'], d: 'Of two points, the distance between them, the point halfway, and the line through them: its slope, where it meets the y axis, ' +
                        'its equation and its angle, in the unit in use.',
                        fields: [{ k: 'x1', l: 'x<sub>1</sub>', ph: '1', name: 'x₁' }, { k: 'y1', l: 'y<sub>1</sub>', ph: '2', name: 'y₁' }, { k: 'x2', l: 'x<sub>2</sub>', ph: '4', name: 'x₂' },
                            { k: 'y2', l: 'y<sub>2</sub>', ph: '6', name: 'y₂' }], cols: 2, run: runPoints, example: { x1: '1', y1: '2', x2: '4', y2: '6' } },
                    { id: 'circle3', t: 'Circle through three points', f: '(x – h)<sup>2</sup> + (y – k)<sup>2</sup> = r<sup>2</sup>', d: 'The one circle through three points not on a line: its centre (h, k), radius, equation, area and circumference.',
                        fields: [{ k: 'x1', l: 'x<sub>1</sub>', ph: '0', name: 'x₁' }, { k: 'y1', l: 'y<sub>1</sub>', ph: '0', name: 'y₁' }, { k: 'x2', l: 'x<sub>2</sub>', ph: '4', name: 'x₂' },
                            { k: 'y2', l: 'y<sub>2</sub>', ph: '0', name: 'y₂' }, { k: 'x3', l: 'x<sub>3</sub>', ph: '0', name: 'x₃' }, { k: 'y3', l: 'y<sub>3</sub>', ph: '3', name: 'y₃' }],
                        cols: 2, run: runCircle3, example: { x1: '0', y1: '0', x2: '4', y2: '0', x3: '0', y3: '3' } },
                    { id: 'polygon', t: 'Polygon of points', f: 'A = ½ |Σ (x<sub>i</sub> y<sub>i+1</sub> – x<sub>i+1</sub> y<sub>i</sub>)|', d: 'The area, perimeter and centroid of a polygon of its corners in order, by the shoelace: x and y of a corner on each line.',
                        fields: [{ k: 'p', l: 'Corners', ph: 'x and y of each, in order:\n0 0\n4 0\n4 3', area: true }], cols: 1, run: runPolygon, example: { p: '0 0\n4 0\n4 3\n0 3' } }
                ],
                chance: [
                    { id: 'normal', waits: true, t: 'Normal probability', f: 'P(a ≤ X ≤ b)', d: 'The chance that a normal value of mean μ and standard deviation σ is between a and b; an empty end goes on without end.',
                        fields: [{ k: 'a', l: 'From', ph: '−∞', def: -Infinity, inf: true }, { k: 'b', l: 'To', ph: '∞', def: Infinity, inf: true }, MEAN, SPREAD], cols: 2,
                        example: { a: '-1', b: '1' }, run: function (n) {
                            var p = CalcMaths.normalBetween(n.a, n.b, n.mu, n.sigma);
                            return { rows: [{ l: 'P(a ≤ X ≤ b)', v: p }, { l: 'Outside', v: CalcMaths.round(1 - p) }].concat(isFinite(p) ? drawnTile(bellDrawing(n.mu, n.sigma, n.a, n.b)) : []), note: sigmaNote(n) };
                        } },
                    { id: 'density', t: 'Normal density', f: 'f(x)', d: 'The height of the normal curve of mean μ and standard deviation σ at x.',
                        fields: [{ k: 'x', l: 'x', ph: '0' }, MEAN, SPREAD], cols: 1,
                        example: { x: '1' }, run: function (n) {
                            var y = CalcMaths.normalDensity(n.x, n.mu, n.sigma);
                            return { rows: [{ l: 'f(x)', v: y }].concat(isFinite(y) ? drawnTile(bellDrawing(n.mu, n.sigma, NaN, NaN, n.x)) : []), note: sigmaNote(n) };
                        } },
                    { id: 'inverse', t: 'Inverse normal', f: 'P(X ≤ x) = p', d: 'The x that a normal value is below with the chance p, above with it, and the middle part that holds p.',
                        fields: [{ k: 'p', l: 'p', ph: '0.95' }, MEAN, SPREAD], cols: 1,
                        example: { p: '0.95' }, run: function (n) {
                            var mid = (1 - n.p) / 2, x = CalcMaths.normalInverse(n.p, n.mu, n.sigma);
                            return {
                                rows: [{ l: 'P(X ≤ x)', v: x }, { l: 'P(X ≥ x)', v: CalcMaths.normalInverse(1 - n.p, n.mu, n.sigma) },
                                    { l: 'Middle from', v: CalcMaths.normalInverse(mid, n.mu, n.sigma) }, { l: 'Middle to', v: CalcMaths.normalInverse(1 - mid, n.mu, n.sigma) }]
                                    .concat(isFinite(x) ? drawnTile(bellDrawing(n.mu, n.sigma, -Infinity, x)) : []),
                                note: !isNaN(n.p) && !(n.p > 0 && n.p < 1) ? 'p is a chance between 0 and 1.' : sigmaNote(n), warn: !isNaN(n.p) && !(n.p > 0 && n.p < 1)
                            };
                        } },
                    { id: 'student', waits: true, t: 'Student\'s t', f: 'P(T ≤ t), ν degrees', d: 'The chances of Student\'s t of ν degrees of freedom below and above t, and of a t as far from 0 either way, the two-sided p; and the t it is below with the chance p, and the ±t it is between with it.',
                        fields: [{ k: 't', l: 't', ph: '2' }, { k: 'nu', l: 'ν', ph: '10', def: 10 }, PROBABILITY], cols: 3, run: runStudent, example: { t: '2.228', nu: '10' } },
                    { id: 'chi', waits: true, t: 'Chi-squared', f: 'P(χ² ≤ x), k degrees', d: 'The chances of χ² of k degrees of freedom below and above x, the x it is below with the chance p, its mean and σ.',
                        fields: [{ k: 'x', l: 'x', ph: '3.84' }, { k: 'k', l: 'k', ph: '1', def: 1 }, PROBABILITY], cols: 3, run: runChi, example: { x: '3.84', k: '1' } },
                    { id: 'fisher', waits: true, t: 'F', f: 'P(F ≤ x), d₁ and d₂', d: 'The chances of F of d₁ and d₂ degrees of freedom below and above x, and the x it is below with the chance p.',
                        fields: [{ k: 'x', l: 'x', ph: '3.33' }, { k: 'd1', l: 'd<sub>1</sub>', ph: '5', def: 5 }, { k: 'd2', l: 'd<sub>2</sub>', ph: '10', def: 10 }, PROBABILITY], cols: 4, run: runF, example: { x: '3.33', d1: '5', d2: '10' } },
                    { id: 'binomial', t: 'Binomial', f: 'P(X = k), n tries', d: 'The chance of k of n tries, each with the chance p: exactly k, k or fewer and k or more.',
                        fields: [{ k: 'n', l: 'n', ph: '10' }, { k: 'p', l: 'p', ph: '0.5' }, { k: 'k', l: 'k', ph: '5' }], cols: 3,
                        example: { n: '10', p: '0.5', k: '5' }, run: function (n) {
                            var c = CalcMaths.binomial(n.n, n.p, n.k), bad = !isNaN(n.n) && !isNaN(n.p) && isNaN(c.eq) && !isNaN(n.k);
                            return { rows: chances(c, n.n * n.p, Math.sqrt(n.n * n.p * (1 - n.p)), !isNaN(c.eq)).concat(isNaN(c.eq) ? [] : drawnTile(countDrawing('The chance of each count', Math.max(0, Math.floor(n.n * n.p - 5 * Math.sqrt(n.n * n.p * (1 - n.p)) - 1)),
                                Math.min(n.n, Math.ceil(n.n * n.p + 5 * Math.sqrt(n.n * n.p * (1 - n.p)) + 1)), function (j) { return CalcMaths.binomial(n.n, n.p, j).eq; }, n.k))),
                                note: bad ? 'n is a whole number, p a chance between 0 and 1.' : '', warn: bad };
                        } },
                    { id: 'poisson', t: 'Poisson', f: 'P(X = k), mean λ', d: 'The chance of a count of k, of events that come at random at a mean of λ: exactly k, k or fewer and k or more.',
                        fields: [{ k: 'lambda', l: 'λ', ph: '3' }, { k: 'k', l: 'k', ph: '2' }], cols: 2,
                        example: { lambda: '3', k: '2' }, run: function (n) {
                            var c = CalcMaths.poisson(n.lambda, n.k), bad = !isNaN(n.lambda) && !(n.lambda > 0);
                            return { rows: chances(c, n.lambda, Math.sqrt(n.lambda), !isNaN(c.eq)).concat(isNaN(c.eq) ? [] : drawnTile(countDrawing('The chance of each count', Math.max(0, Math.floor(n.lambda - 5 * Math.sqrt(n.lambda) - 1)),
                                Math.max(n.k, Math.ceil(n.lambda + 5 * Math.sqrt(n.lambda) + 1)), function (j) { return CalcMaths.poisson(n.lambda, j).eq; }, n.k))),
                                note: bad ? 'λ is above 0.' : '', warn: bad };
                        } },
                    { id: 'geometric', t: 'Geometric', f: 'P(X = k), first success', d: 'The chance that the first success is on try k, each with the chance p: exactly then, by then and not before.',
                        fields: [{ k: 'p', l: 'p', ph: '0.2' }, { k: 'k', l: 'k', ph: '3' }], cols: 2,
                        example: { p: '0.2', k: '3' }, run: function (n) {
                            var c = CalcMaths.geometric(n.p, n.k), bad = !isNaN(n.p) && !(n.p > 0 && n.p <= 1);
                            return { rows: chances(c, 1 / n.p, Math.sqrt(1 - n.p) / n.p, !isNaN(c.eq)).concat(isNaN(c.eq) ? [] : drawnTile(countDrawing('The chance of each try being the first', 1,
                                Math.max(n.k, Math.min(150, n.p < 1 ? Math.ceil(Math.log(0.01) / Math.log(1 - n.p)) : 1)), function (j) { return CalcMaths.geometric(n.p, j).eq; }, n.k))),
                                note: bad ? 'p is a chance above 0, up to 1.' : '', warn: bad };
                        } },
                    { id: 'hypergeometric', t: 'Hypergeometric', f: 'P(X = k), drawn without putting back', d: 'The chance of k of n drawn, without putting back, from N of which K count, as cards from a pack: exactly k, k or fewer and k or more.',
                        fields: [{ k: 'N', l: 'N', ph: '52' }, { k: 'K', l: 'K', ph: '13' }, { k: 'n', l: 'n', ph: '5' }, { k: 'k', l: 'k', ph: '2' }], cols: 4,
                        example: { N: '52', K: '13', n: '5', k: '2' }, run: function (n) {
                            var c = CalcMaths.hypergeometric(n.N, n.K, n.n, n.k), known = !isNaN(c.eq), bad = [n.N, n.K, n.n, n.k].every(isFinite) && !known;
                            return { rows: chances(c, n.n * n.K / n.N, Math.sqrt(n.n * n.K / n.N * (n.N - n.K) / n.N * (n.N - n.n) / (n.N - 1)), known).concat(known ? drawnTile(countDrawing('The chance of each count',
                                Math.max(0, n.n + n.K - n.N), Math.min(n.n, n.K), function (j) { return CalcMaths.hypergeometric(n.N, n.K, n.n, j).eq; }, n.k)) : []),
                                note: bad ? 'Whole numbers, K and n no more than N.' : '', warn: bad };
                        } },
                    { id: 'exponential', t: 'Exponential', f: 'P(X ≤ x), rate λ', d: 'The chance that the wait for an event that comes at random at a rate of λ is shorter than x, or longer, and its density there.',
                        fields: [{ k: 'lambda', l: 'λ', ph: '0.5' }, { k: 'x', l: 'x', ph: '2' }], cols: 2,
                        example: { lambda: '0.5', x: '2' }, run: function (n) {
                            var c = CalcMaths.exponential(n.lambda, n.x), bad = !isNaN(n.lambda) && !(n.lambda > 0);
                            return { rows: spread(c, 1 / n.lambda, 1 / n.lambda, !bad && isFinite(n.lambda)).concat(!bad && n.lambda > 0 && n.x >= 0 ? drawnTile(underDrawing(function (x) {
                                return x < 0 ? 0 : n.lambda * Math.exp(-n.lambda * x);
                            }, 0, Math.max(n.x * 1.3, 5 / n.lambda), n.x)) : []), note: bad ? 'λ is above 0.' : '', warn: bad };
                        } },
                    { id: 'uniform', waits: true, t: 'Uniform', f: 'P(X ≤ x), from a to b', d: 'The chance that a value spread evenly from a to b is below x, or above, and its density there.',
                        fields: [{ k: 'a', l: 'From', ph: '0', def: 0 }, { k: 'b', l: 'To', ph: '1', def: 1 }, { k: 'x', l: 'x', ph: '0.25' }], cols: 3,
                        example: { a: '0', b: '1', x: '0.25' }, run: function (n) {
                            var c = CalcMaths.uniform(n.a, n.b, n.x), bad = isFinite(n.a) && isFinite(n.b) && !(n.a < n.b);
                            return { rows: spread(c, (n.a + n.b) / 2, (n.b - n.a) / Math.sqrt(12), !bad && isFinite(n.a) && isFinite(n.b)).concat(n.a < n.b && isFinite(n.x) ? drawnTile(underDrawing(function (x) {
                                return x >= n.a && x <= n.b ? 1 / (n.b - n.a) : 0;
                            }, Math.min(n.a, n.x) - (n.b - n.a) * 0.25, Math.max(n.b, n.x) + (n.b - n.a) * 0.25, n.x)) : []), note: bad ? 'From is less than To.' : '', warn: bad };
                        } },
                    { id: 'meanci', t: 'Confidence interval of a mean', f: 'x̄ ± t s/√n', d: 'Where the mean is, with the chance you give, from a sample of n of mean x̄ and standard deviation s, by Student\'s t.',
                        fields: [{ k: 'mean', l: 'x̄', ph: '50' }, { k: 's', l: 's', ph: '10' }, { k: 'n', l: 'n', ph: '25' }, LEVEL], cols: 4,
                        example: { mean: '50', s: '10', n: '25' }, run: function (n) {
                            var r = CalcMaths.meanInterval(n.mean, n.s, n.n, n.level), bad = [n.mean, n.s, n.n].every(isFinite) && isNaN(r.from);
                            return { rows: [{ l: 'From', v: r.from }, { l: 'To', v: r.to }, { l: '±', v: r.margin }, { l: 't', v: r.t }].concat(r.margin > 0 ? drawnTile(bellDrawing(n.mean, r.margin / r.t, r.from, r.to, NaN,
                                'Where the mean is, its interval shaded')) : []),
                                note: bad ? 'n is a whole number of 2 or more, s 0 or more, the level a chance between 0 and 1.' : '', warn: bad };
                        } },
                    { id: 'propci', t: 'Confidence interval of a proportion', f: 'p̂ ± z √(p̂(1 – p̂)/n)', d: 'Where a chance is, with the chance you give, from x of n: about x/n by the normal distribution, and by Wilson\'s way, which stays between 0 and 1 and is nearer for a small n.',
                        fields: [{ k: 'x', l: 'x', ph: '40' }, { k: 'n', l: 'n', ph: '100' }, LEVEL], cols: 3,
                        example: { x: '40', n: '100' }, run: function (n) {
                            var r = CalcMaths.proportionInterval(n.x, n.n, n.level), bad = [n.x, n.n].every(isFinite) && isNaN(r.p);
                            return { rows: [{ l: 'p̂', v: r.p }, { l: 'From', v: r.from }, { l: 'To', v: r.to }, { l: '±', v: r.margin }, { l: 'Wilson from', v: r.wilson[0] }, { l: 'Wilson to', v: r.wilson[1] }]
                                .concat(r.margin > 0 ? drawnTile(bellDrawing(r.p, Math.sqrt(r.p * (1 - r.p) / n.n), r.from, r.to, NaN, 'Where the chance is, its interval shaded')) : []),
                                note: bad ? 'x and n are whole numbers, x no more than n; the level a chance between 0 and 1.' : '', warn: bad };
                        } },
                    { id: 'random', t: 'Random whole numbers', f: 'from a to b', d: 'Five whole numbers at random, each from a to b, both in, as dice give them. Again for five more.',
                        fields: [{ k: 'a', l: 'From', ph: '1', def: 1 }, { k: 'b', l: 'To', ph: '6', def: 6 }], cols: 2, again: true, fills: true, run: function (n) {
                            var rows = [], k;
                            for (k = 0; k < 5; k++) rows.push({ l: tr('Number {k}', { k: (k + 1) }), v: CalcMaths.randomWhole(n.a, n.b, chance) });
                            return { rows: rows, note: isNaN(rows[0].v) && isFinite(n.a) && isFinite(n.b) ? 'Whole numbers, From the smaller.' : '', warn: isNaN(rows[0].v) };
                        } }
                ],
                finance: [
                    { id: 'schedule', t: 'Loan calculator', f: ['Interest', 'Principal', 'Balance'], d: 'A loan paid back in equal payments at the end of each period: the payment, all the interest, and a table ' +
                        'of each year, or of each payment, of the interest paid, the principal paid and what is left of the loan. Copy table copies it for a spreadsheet.',
                        fields: [{ k: 'loan', l: 'Loan', ph: '', tip: 'The amount borrowed.' }, { k: 'rate', l: 'Rate %', ph: '', tip: 'The interest rate a year, as a percentage: 6 for 6%.' }, { k: 'years', l: 'Years', ph: '', tip: 'How long the loan runs.' }, { k: 'py', l: 'A year', ph: '12', def: 12, aria: 'Payments a year', tip: 'How many payments a year: 12 for monthly, 26 for every two weeks, 52 for weekly. 12 while empty.' },
                            { k: 'by', l: 'Table', choice: ['By year', 'By payment'] }], cols: 2, run: runSchedule, example: { loan: '50000', rate: '6', years: '6', py: '12' } },
                    { id: 'mortgage', t: 'Mortgage', f: ['Loan payment', 'Tax', 'PMI'], d: 'A home bought with a part of its price put down, the rest a loan paid back each month: what is paid each month, ' +
                        'with the property tax and home insurance of a year, PMI and HOA fees a month if you like. PMI, a percentage of the loan a year, while less than 20% is put down, until the loan is down to 78% ' +
                        'of the price. All the interest, all paid, and a table of each year; Copy table copies it for a spreadsheet.',
                        fields: [{ k: 'price', l: 'Price', ph: '', tip: 'What the home costs, before anything is put down.' }, { k: 'down', l: 'Down %', ph: '20', def: 20, tip: 'The part of the price paid at the start, as a percentage: 20 for 20%. The rest is the loan. 20 while empty.' }, { k: 'rate', l: 'Rate %', ph: '', tip: 'The loan\'s interest rate a year, as a percentage: 6.5 for 6.5%.' }, { k: 'years', l: 'Years', ph: '30', def: 30, tip: 'How long the loan runs. 30 while empty.' },
                            { k: 'tax', l: 'Tax', ph: '0', def: 0, aria: 'Property tax a year', tip: 'Property tax for a whole year, as an amount: 4800 is 400 a month. 0 while empty.' }, { k: 'ins', l: 'Insurance', ph: '0', def: 0, aria: 'Home insurance a year', tip: 'Home insurance for a whole year, as an amount: 1200 is 100 a month. 0 while empty.' },
                            { k: 'pmi', l: 'PMI %', ph: '0', def: 0, aria: 'PMI a year, a percentage of the loan', tip: 'Private mortgage insurance, as a percentage of the loan a year: 0.5 for 0.5%. Paid only while less than 20% is put down, until the loan is down to 78% of the price. 0 while empty.' }, { k: 'hoa', l: 'HOA', ph: '0', def: 0, aria: 'HOA fees a month', tip: 'Homeowners association fees, as an amount a month. 0 while empty.' }], cols: 2,
                        run: runMortgage, example: { price: '400000', down: '10', rate: '6.5', years: '30', tax: '4800', ins: '1200', pmi: '0.5', hoa: '150' } },
                    { id: 'payoff', t: 'Credit card payoff', f: ['Months', 'Interest'], d: 'A balance owed at an APR, of interest each month, paid off: in how many months a payment each month pays it, or the payment ' +
                        'that pays it in so many months. Leave one of Payment and Months empty, the one to work out. All the interest, all paid, the last payment, and a table of each year.',
                        fields: [{ k: 'balance', l: 'Balance', ph: '', tip: 'What is owed on the card now.' }, { k: 'apr', l: 'APR %', ph: '', tip: 'The card\'s interest rate a year, as a percentage: 22 for 22%.' }, { k: 'pay', l: 'Payment', ph: '', aria: 'Payment a month', tip: 'What you pay each month. Leave it empty to work out the payment that pays it off in Months.' }, { k: 'months', l: 'Months', ph: '', tip: 'How many months to pay it off in. Leave it empty to work out how long Payment takes.' }], cols: 2,
                        run: runPayoff, example: { balance: '5000', apr: '22', pay: '200' } },
                    { id: 'savings', t: 'Savings growth', f: 'P(1 + r/m)<sup>mt</sup>', d: 'Money saved at a rate a year, of interest m times a year, for years, with an amount added each period if you like, at its end or its start: ' +
                        'what it grows to, all that was put in, the interest, and a table of each year. m may be ∞, typed inf, for interest all the time, with nothing added. Copy table copies it for a spreadsheet.',
                        fields: [{ k: 'start', l: 'Start', ph: '', tip: 'What is in the account at the start.' }, { k: 'rate', l: 'Rate %', ph: '', tip: 'The interest rate a year, as a percentage: 5 for 5%.' }, { k: 'years', l: 'Years', ph: '', tip: 'How long it is saved.' }, { k: 'm', l: 'A year', ph: '12', def: 12, inf: true, aria: 'Periods a year', tip: 'How many times a year interest is added: 12 for monthly, 365 for daily, inf for all the time. Add goes in as often. 12 while empty.' },
                            { k: 'add', l: 'Add', ph: '0', def: 0, aria: 'Added each period', tip: 'An amount put in each period, as often as A year says. 0 while empty.' }, { k: 'due', l: 'Added', choice: ['At the end', 'At the start'] }], cols: 2, run: runSavings, example: { start: '1000', rate: '5', years: '10', m: '12', add: '100' } },
                    { id: 'retire', t: 'Retirement', f: ['At retirement', 'A month to draw'], d: 'Money saved for retirement, with an amount added each month until then, growing at a return a year as prices grow ' +
                        'with inflation: what there is at retirement, and in money of today; the most to draw each month, in money of today, for it to last to an age; and of a draw each month, the age it lasts to. ' +
                        'Drawn: the savings at each age.',
                        fields: [{ k: 'age', l: 'Age', ph: '', tip: 'Your age now.' }, { k: 'retire', l: 'Retire at', ph: '65', def: 65, tip: 'The age you stop working and start to draw on the savings. 65 while empty.' }, { k: 'saved', l: 'Saved', ph: '0', def: 0, tip: 'What is saved for retirement now. 0 while empty.' },
                            { k: 'add', l: 'Add', ph: '0', def: 0, aria: 'Added each month', tip: 'What you put in each month until you retire. 0 while empty.' }, { k: 'ret', l: 'Return %', ph: '', aria: 'Return a year', tip: 'What the savings earn a year, as a percentage, before inflation: 6 for 6%.' }, { k: 'infl', l: 'Inflation %', ph: '2', def: 2, aria: 'Inflation a year', tip: 'How much prices rise a year, as a percentage. In money of today takes it out, so amounts compare with what money buys now. 2 while empty.' },
                            { k: 'until', l: 'To age', ph: '90', def: 90, aria: 'To last to the age', tip: 'The age the money is to last to: Can draw a month is worked out for it. 90 while empty.' }, { k: 'draw', l: 'Draw', ph: '', aria: 'Drawn each month, in money of today', tip: 'What you mean to take out each month once retired, in money of today, so it grows with prices: gives the age it lasts to. Empty for none.' }], cols: 2,
                        run: runRetirement, example: { age: '30', saved: '10000', add: '500', ret: '6' } },
                    { id: 'salary', t: 'Salary and hourly pay', f: 'Hour ↔ Year', d: 'Pay by the hour, day, week, month or year, in each of the others, of the hours and days worked a week and the weeks a year; ' +
                        'with overtime a week at so many times the hourly if you like.',
                        fields: [{ k: 'per', l: 'Pay by', choice: ['Hour', 'Day', 'Week', 'Month', 'Year'] }, { k: 'pay', l: 'Pay', ph: '', tip: 'What you are paid, by the hour, day, week, month or year, as Pay by says.' }, { k: 'hours', l: 'Hours', ph: '40', def: 40, aria: 'Hours a week', tip: 'Hours worked a week, overtime not in them. 40 while empty.' },
                            { k: 'days', l: 'Days', ph: '5', def: 5, aria: 'Days a week', tip: 'Days worked a week. 5 while empty.' }, { k: 'weeks', l: 'Weeks', ph: '52', def: 52, aria: 'Weeks a year', tip: 'Weeks paid a year: 52, or fewer for unpaid time off. 52 while empty.' },
                            { k: 'ot', l: 'Overtime', ph: '0', def: 0, aria: 'Hours of overtime a week', tip: 'Hours of overtime a week, on top of Hours. 0 while empty.' }, { k: 'otx', l: 'Overtime ×', ph: '1.5', def: 1.5, aria: 'Overtime, times the hourly', tip: 'What an hour of overtime pays, as times the hourly: 1.5 for time and a half, 2 for double. 1.5 while empty.' }], cols: 2,
                        run: runSalary, example: { pay: '25' } },
                    { id: 'rates', t: 'Interest rates', f: 'APR ↔ APY', d: 'A nominal rate a year, its APR, as the effective one, its APY, of interest m times a year, and back: type one, ' +
                        'and the other is worked out. m may be ∞, typed inf, for interest all the time.',
                        fields: [{ k: 'apr', l: 'APR %', ph: '', tip: 'The nominal rate a year, as a percentage: what a loan or an account quotes. Leave it empty to work it out from APY.' }, { k: 'apy', l: 'APY %', ph: '', tip: 'The effective rate a year, as a percentage: what it really comes to with interest on interest. Leave it empty to work it out from APR.' }, { k: 'm', l: 'm', ph: '12', def: 12, inf: true, aria: 'Periods a year', tip: 'How many times a year interest is added: 12 for monthly, 365 for daily, inf for all the time. 12 while empty.' }], cols: 3, run: runRates, example: { apr: '6' } },
                    { id: 'breakeven', t: 'Break-even', f: 'Fixed ÷ (Price – Cost)', d: 'How many must be sold to cover the fixed costs, and a profit if you like, at a price and a cost of each one: ' +
                        'the units, what they sell for, and what each one leaves.',
                        fields: [{ k: 'fixed', l: 'Fixed costs', ph: '', tip: 'Costs that stay the same however many are sold: rent, wages, machines.' }, { k: 'price', l: 'Price', ph: '', tip: 'What each one sells for.' }, { k: 'cost', l: 'Cost each', ph: '', tip: 'What each one costs to make or buy.' }, { k: 'profit', l: 'Profit', ph: '0', def: 0, tip: 'A profit to make on top, if you like. 0 while empty.' }], cols: 2,
                        run: runBreakEven, example: { fixed: '10000', price: '25', cost: '15' } },
                    { id: 'inflation', t: 'Inflation', f: 'A(1 + r)<sup>t</sup>', d: 'An amount at inflation of a rate a year for years: what it costs then, what it was worth in money of today, ' +
                        'how many times prices grow, and how much of what money buys is lost.',
                        fields: [{ k: 'amount', l: 'Amount', ph: '', tip: 'An amount of money today.' }, { k: 'rate', l: 'Rate %', ph: '', tip: 'How much prices rise a year, as a percentage: 3 for 3%.' }, { k: 'years', l: 'Years', ph: '', tip: 'How many years on.' }], cols: 3, run: runInflation, example: { amount: '100', rate: '3', years: '10' } },
                    { id: 'depreciation', t: 'Depreciation', f: ['Straight line', 'Declining balance'], d: 'What an asset loses each year of its life, down to what it is worth at the end, its salvage value: the same each year by the straight line, ' +
                        'or twice the straight line\'s rate of what is left by the double declining balance, then the straight line once that loses more. A table of each year; Copy table copies it for a spreadsheet.',
                        fields: [{ k: 'cost', l: 'Cost', ph: '', tip: 'What the asset cost when bought.' }, { k: 'salvage', l: 'Salvage', ph: '0', def: 0, tip: 'What it is worth at the end of its life, sold or scrapped. 0 while empty.' }, { k: 'life', l: 'Years', ph: '', tip: 'How many years it is used for.' },
                            { k: 'way', l: 'Way', choice: ['Straight line', 'Declining balance'] }], cols: 3, run: runDepreciation, example: { cost: '10000', salvage: '1000', life: '5' } },
                    { id: 'tvm', t: 'Time value of money', f: ['N', 'I/Y', 'PV', 'PMT', 'FV'], d: 'Money over time, as a BA II Plus or an HP 12C works it out: leave one of N, I/Y, PV, PMT and FV empty, and it is worked out. ' +
                        'N payments of PMT, at I/Y, a percentage a year, of P/Y payments a year, bring PV at the start to FV at the end; each payment at the end of its period, or at its start. ' +
                        'Money received is above 0 and money paid below 0: a loan of 200000 is PV = 200000, its PMT below 0. With all the money paid, and the interest.',
                        fields: [{ k: 'n', l: 'N', ph: '', tip: 'How many payments in all: 360 for 30 years paid monthly.' }, { k: 'iy', l: 'I/Y %', ph: '', tip: 'The interest rate a year, as a percentage: 6 for 6%.' }, { k: 'pv', l: 'PV', ph: '', tip: 'The money at the start: a loan received above 0, money put in below 0.' }, { k: 'pmt', l: 'PMT', ph: '', tip: 'Each payment: paid out below 0, received above 0.' },
                            { k: 'fv', l: 'FV', ph: '', tip: 'The money at the end: 0 for a loan paid off.' }, { k: 'py', l: 'P/Y', ph: '12', def: 12, tip: 'Payments a year: 12 for monthly. 12 while empty.' },
                            { k: 'due', l: 'Payments', choice: ['At the end', 'At the start'] }], cols: 2, run: runTvm, example: { n: '360', iy: '6', pv: '200000', fv: '0' } },
                    { id: 'npv', t: 'NPV and IRR', f: 'Σ CF<sub>t</sub> / (1 + r)<sup>t</sup>', d: 'Of cash flows, one a period, the first at the start and usually below 0, as it is paid out: their net present value at the rate r, ' +
                        'a percentage a period; their internal rate of return, the rate of an NPV of 0; and how many periods they take to pay back what went out. ' +
                        'Type the flows one to a line, or apart as the statistics list is: -1000, 300, 400, 500.',
                        fields: [{ k: 'r', l: 'Rate %', ph: '10', def: 10, tip: 'The rate a period that brings each cash flow back to the start, as a percentage: 10 for 10%. 10 while empty.' }, { k: 'cf', l: 'Cash flows', ph: '-1000&#10;300&#10;400&#10;500', area: true, tip: 'One cash flow a period, the first at the start: paid out below 0, received above 0.' }], run: runNpv, example: { r: '10', cf: '-1000\n300\n400\n500' } },
                    { id: 'bond', t: 'Bond price and yield', f: 'Σ C / (1 + y)<sup>t</sup> + F / (1 + y)<sup>n</sup>', d: 'A bond of a face value paying its coupon, a percentage of it a year, in parts a number of times a year, for years: ' +
                        'leave one of Price and Yield empty, and it is worked out, the yield a year as a BA II Plus gives it. Years that are not whole coupons bring the next coupon nearer: ' +
                        'the price is then without the interest earned since the last one, the accrued interest, and the dirty price with it. With the current yield and the duration.',
                        fields: [{ k: 'face', l: 'Face', ph: '100', def: 100, tip: 'What the bond pays back at its end, its par value. 100 while empty.' }, { k: 'coupon', l: 'Coupon %', ph: '', tip: 'The interest it pays a year, as a percentage of the face value: 5 for 5%.' }, { k: 'years', l: 'Years', ph: '', tip: 'Years until it ends.' }, { k: 'freq', l: 'A year', ph: '2', def: 2, aria: 'Coupons a year', tip: 'How many coupons a year: 2 for twice a year. 2 while empty.' },
                            { k: 'price', l: 'Price', ph: '', tip: 'What it costs now, without the interest earned since the last coupon. Leave it empty to work it out from Yield.' }, { k: 'yld', l: 'Yield %', ph: '', tip: 'The return a year it gives at its price, as a percentage. Leave it empty to work it out from Price.' }], cols: 2, run: runBond, example: { coupon: '5', years: '10', freq: '2', yld: '6' } },
                    { id: 'change', t: 'Percentage change', f: '(b – a) ÷ a', d: 'The change from one number to another, and as a percentage of the first; of a cost and its price, the first is the markup and the margin ' +
                        'the profit as a percentage of the price.',
                        fields: [{ k: 'a', l: 'From', ph: '', tip: 'The number to start from: the old value, or a cost.' }, { k: 'b', l: 'To', ph: '', tip: 'The number it went to: the new value, or a price.' }], cols: 2, run: runChange, example: { a: '80', b: '100' } },
                    { id: 'tip', t: 'Tip and split', f: ['Tip', 'Each'], d: 'A bill and a tip, a percentage of it: the tip, the total, and what each pays, split among people; rounded up so each pays a whole ' +
                        'amount, or the total is, if you like.',
                        fields: [{ k: 'bill', l: 'Bill', ph: '', tip: 'The bill, before the tip.' }, { k: 'pct', l: 'Tip %', ph: '15', def: 15, tip: 'The tip, as a percentage of the bill: 15 for 15%. 15 while empty.' }, { k: 'people', l: 'People', ph: '1', def: 1, tip: 'How many split it. 1 while empty.' },
                            { k: 'round', l: 'Round up', choice: ['No', 'Each', 'Total'] }], cols: 2, run: runTip, example: { bill: '86.40', pct: '18', people: '3' } },
                    { id: 'fuel', t: 'Fuel cost', f: 'Fuel × Price', d: 'The fuel a trip takes, of a car\'s economy in L/100 km, km a litre or miles a gallon, US or UK, and what it costs at a price of fuel: ' +
                        'a km or a mile as well, there and back, and what each pays, split among people; with the economy the other way.',
                        fields: function (raw) {
                            var unit = +raw.unit || 0;
                            return [{ k: 'unit', l: 'Unit', choice: FUEL_UNITS }, { k: 'd', l: 'Distance', ph: unit > 1 ? 'miles' : 'km', tip: 'How far the trip is: in km, or in miles for MPG.' }, { k: 'e', l: 'Economy', ph: FUEL_UNITS[unit], tip: 'How much fuel the car uses, in the unit picked above: litres for 100 km, km a litre, or miles a gallon.' },
                                { k: 'p', l: 'Price', ph: unit === 2 ? 'a US gallon' : 'a litre', tip: 'What fuel costs: a litre, or a US gallon for MPG US.' }, { k: 'people', l: 'People', ph: '1', def: 1, tip: 'How many split the cost. 1 while empty.' }];
                        }, cols: 2, run: runFuel, example: function (raw) {
                            var ex = [{ d: '500', e: '7', p: '1.80' }, { d: '500', e: '15', p: '1.80' }, { d: '300', e: '30', p: '3.50' }, { d: '300', e: '45', p: '1.45' }][+raw.unit || 0];
                            ex.unit = raw.unit || '0';
                            return ex;
                        } }
                ]
            };

            // ---------------- geometry ---------------- //

            // A triangle of its sides, drawn with A at the left, c along the bottom, each corner and side named
            function triangleDrawing(t) {
                var s = t.s, A = t.t[0], pts = [[0, 0], [s[2], 0], [s[1] * Math.cos(A), s[1] * Math.sin(A)]], x0 = Math.min(0, pts[2][0]), x1 = Math.max(s[2], pts[2][0]),
                    h = pts[2][1], k = Math.min(260 / (x1 - x0), 96 / h), W = 300, H = 120, ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = H - 12 - (96 - h * k) / 2,
                    p = pts.map(function (q) { return [ox + q[0] * k, oy - q[1] * k]; }), mid = function (i, j) { return [(p[i][0] + p[j][0]) / 2, (p[i][1] + p[j][1]) / 2]; },
                    cx = (p[0][0] + p[1][0] + p[2][0]) / 3, cy = (p[0][1] + p[1][1] + p[2][1]) / 3,
                    label = function (q, text, out) { // a name a little away from the middle of the triangle
                        var dx = q[0] - cx, dy = q[1] - cy, d = Math.hypot(dx, dy) || 1;
                        return '<text x="' + (q[0] + dx / d * out).toFixed(1) + '" y="' + (q[1] + dy / d * out + 4).toFixed(1) + '" text-anchor="middle">' + text + '</text>';
                    };
                return '<svg class="calc-sv-shape" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + tr('The triangle') + '"><polygon points="' + p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>' +
                    label(p[0], 'A', 9) + label(p[1], 'B', 9) + label(p[2], 'C', 9) + label(mid(1, 2), '<tspan font-style="italic">a</tspan>', 9) +
                    label(mid(0, 2), '<tspan font-style="italic">b</tspan>', 9) + label(mid(0, 1), '<tspan font-style="italic">c</tspan>', 9) + '</svg>';
            }

            // the svg of a drawing, and its x and y axes where they cross it, faint
            function planeSvg(f, label, body) {
                var ax = f.x(0), ay = f.y(0);
                return '<svg class="calc-sv-shape" viewBox="0 0 ' + f.W + ' ' + f.H + '" role="img" aria-label="' + tr(label) + '">' +
                    (ax > 0 && ax < f.W ? '<path class="calc-sv-axis" d="M' + ax + ' 0V' + f.H + '"/>' : '') + (ay > 0 && ay < f.H ? '<path class="calc-sv-axis" d="M0 ' + ay + 'H' + f.W + '"/>' : '') +
                    body + '</svg>';
            }

            // a dot at a point, and a name by it: away from (cx, cy), or over it, kept in the box
            function planeDot(f, x, y) {
                return '<circle class="calc-sv-dot" cx="' + f.x(x) + '" cy="' + f.y(y) + '" r="2.5"/>';
            }

            // (1, 2), a point as its name
            function pointText(x, y) {
                return '(' + shortNumber(x) + (engine.comma ? '; ' : ', ') + shortNumber(y) + ')';
            }

            // r = 5, a length's name and its value
            function sizeText(letter, v) {
                return '<tspan font-style="italic">' + letter + '</tspan> = ' + shortNumber(v);
            }

            function runTriangle(n) {
                var sides = [n.a, n.b, n.c], angles = [n.A, n.B, n.C].map(toRadians), r = CalcMaths.triangle(sides, angles), t, rows, other;
                if (r.error || !r.list.length) {
                    return { rows: [{ l: 'a', v: NaN }, { l: 'b', v: NaN }, { l: 'c', v: NaN }], cols: 3, warn: r.error !== 'few',
                        note: r.error === 'few' ? 'Type three of the six, one a side at least.' : r.error === 'many' ? 'Three of the six only: leave the rest empty.' :
                            r.error === 'angles' ? 'Three angles make triangles of every size: give a side.' : r.error === 'range' ? 'Sides above 0, and angles above 0 and below a half turn.' :
                                'No triangle has these: a side is too short to meet the others, or the angles add up to a half turn or more.' };
                }
                t = r.list[0];
                rows = t.s.map(function (v, i) { return { l: 'abc'.charAt(i), v: v }; }).concat(t.t.map(function (v, i) { return { l: 'ABC'.charAt(i), v: fromRadians(v) }; }),
                    [{ l: 'Area', v: t.area }, { l: 'Perimeter', v: t.perimeter }, { l: 'Inradius r', v: t.r }, { l: 'Height onto a', v: t.h[0] }, { l: 'onto b', v: t.h[1] }, { l: 'onto c', v: t.h[2] },
                        { l: 'Circumradius R', v: t.R }]);
                if ((other = r.list[1])) {
                    rows.push({ l: 'The other triangle', wide: true, text: 'a ' + statsValue(other.s[0]).html + ', b ' + statsValue(other.s[1]).html + ', c ' + statsValue(other.s[2]).html + '; A ' +
                        statsValue(fromRadians(other.t[0])).html + ', B ' + statsValue(fromRadians(other.t[1])).html + ', C ' + statsValue(fromRadians(other.t[2])).html, wrap: true });
                }
                rows.unshift({ l: 'Drawn', wide: true, text: triangleDrawing(t) });
                return { rows: rows, cols: 3, note: tr('{v}Angles in {unitWord}.', { v: (other ? tr('Two triangles have these; the first is shown. ') : ''), unitWord: unitWord() }) };
            }

            function runShape(n, raw) {
                var shape = +raw.shape || 0, pi = Math.PI, rows, t, e;
                function none(why) { return { rows: [{ l: 'Area', v: NaN }, { l: 'Perimeter', v: NaN }], cols: 2, warn: true, note: why }; }
                if (shape === 0) {
                    if (!raw.r) return { rows: [{ l: 'Area', v: NaN }, { l: 'Circumference', v: NaN }], cols: 2 };
                    if (!(n.r > 0)) return none('The radius is above 0.');
                    rows = [{ l: 'Area', v: pi * n.r * n.r }, { l: 'Circumference', v: 2 * pi * n.r }, { l: 'Diameter', v: 2 * n.r }];
                } else if (shape === 1) {
                    if (!raw.w && !raw.h) return { rows: [{ l: 'Area', v: NaN }, { l: 'Perimeter', v: NaN }], cols: 2 };
                    if (!(n.w > 0 && n.h > 0)) return none('The width and height are above 0.');
                    rows = [{ l: 'Area', v: n.w * n.h }, { l: 'Perimeter', v: 2 * (n.w + n.h) }, { l: 'Diagonal', v: Math.hypot(n.w, n.h) }];
                } else if (shape === 2) {
                    if (!raw.a && !raw.b && !raw.h) return { rows: [{ l: 'Area', v: NaN }, { l: 'Midline', v: NaN }], cols: 2 };
                    if (!(n.a > 0 && n.b > 0 && n.h > 0)) return none('a and b, the two sides that are parallel, and the height between them are above 0.');
                    rows = [{ l: 'Area', v: (n.a + n.b) / 2 * n.h }, { l: 'Midline', v: (n.a + n.b) / 2 }];
                } else if (shape === 3) {
                    if (!raw.a && !raw.b) return { rows: [{ l: 'Area', v: NaN }, { l: 'Perimeter', v: NaN }], cols: 2 };
                    if (!(n.a > 0 && n.b > 0)) return none('a and b, half of each axis, are above 0.');
                    t = Math.pow(n.a - n.b, 2) / Math.pow(n.a + n.b, 2);
                    e = Math.sqrt(1 - Math.pow(Math.min(n.a, n.b) / Math.max(n.a, n.b), 2));
                    rows = [{ l: 'Area', v: pi * n.a * n.b }, { l: 'Perimeter', v: pi * (n.a + n.b) * (1 + 3 * t / (10 + Math.sqrt(4 - 3 * t))) }, { l: 'Eccentricity', v: e }];
                } else if (shape === 4) {
                    if (!raw.r && !raw.t) return { rows: [{ l: 'Area', v: NaN }, { l: 'Arc', v: NaN }], cols: 2 };
                    t = toRadians(n.t);
                    if (!(n.r > 0 && t > 0 && t <= 2 * pi)) return none('The radius is above 0, and θ above 0 and a whole turn at most.');
                    rows = [{ l: 'Area', v: n.r * n.r * t / 2 }, { l: 'Arc', v: n.r * t }, { l: 'Chord', v: 2 * n.r * Math.sin(t / 2) }, { l: 'Perimeter', v: n.r * t + 2 * n.r }];
                } else {
                    if (!raw.n && !raw.s) return { rows: [{ l: 'Area', v: NaN }, { l: 'Perimeter', v: NaN }], cols: 2 };
                    if (!(Number.isInteger(n.n) && n.n >= 3 && n.s > 0)) return none('3 sides or more, a whole number, each of a length above 0.');
                    rows = [{ l: 'Area', v: n.n * n.s * n.s / (4 * Math.tan(pi / n.n)) }, { l: 'Perimeter', v: n.n * n.s }, { l: 'Apothem', v: n.s / (2 * Math.tan(pi / n.n)) },
                        { l: 'Circumradius', v: n.s / (2 * Math.sin(pi / n.n)) }, { l: 'Each angle inside', v: fromRadians(pi - 2 * pi / n.n) }];
                }
                rows.forEach(function (r) { r.v = CalcMaths.round(r.v); });
                rows.unshift({ l: 'Drawn', wide: true, text: shapeDrawing(shape, n) });
                return { rows: rows, cols: 2, note: shape === 3 ? 'The perimeter by Ramanujan\'s second way: to some 10 digits for most.' : shape >= 4 ? tr('Angles in {unitWord}.', { unitWord: unitWord() }) : '' };
            }

            // A shape of its sizes, to scale, each named with its value: a circle and its radius, a rectangle, a trapezoid
            // and its height, an ellipse and its half axes, a sector and its angle, a regular polygon and its side
            function shapeDrawing(shape, n) {
                var W = 300, H = 130, f, body, xs, ys, t, i, pts, R, m, a0, sign = app.deg === 1 ? '°' : '';
                if (shape === 0) {
                    f = planeFit([-n.r, n.r], [-n.r, n.r], W, H);
                    body = '<circle class="calc-sv-fill" cx="' + f.x(0) + '" cy="' + f.y(0) + '" r="' + (n.r * f.k).toFixed(1) + '"/>' +
                        '<path class="calc-sv-guide" d="M' + f.x(0) + ' ' + f.y(0) + 'H' + f.x(n.r) + '"/>' + planeDot(f, 0, 0) +
                        planeLabel(f, (f.x(0) + f.x(n.r)) / 2, f.y(0), sizeText('r', n.r), (f.x(0) + f.x(n.r)) / 2, f.y(0) + 1, 8);
                } else if (shape === 1) {
                    f = planeFit([0, n.w], [0, n.h], W, H);
                    body = '<rect class="calc-sv-fill" x="' + f.x(0) + '" y="' + f.y(n.h) + '" width="' + (n.w * f.k).toFixed(1) + '" height="' + (n.h * f.k).toFixed(1) + '"/>' +
                        planeLabel(f, f.x(n.w / 2), f.y(0), sizeText('w', n.w), f.x(n.w / 2), f.y(n.h / 2), 8) + planeLabel(f, f.x(n.w), f.y(n.h / 2), sizeText('h', n.h), f.x(n.w / 2), f.y(n.h / 2), 8);
                } else if (shape === 2) {
                    pts = [[0, 0], [n.a, 0], [(n.a + n.b) / 2, n.h], [(n.a - n.b) / 2, n.h]];
                    f = planeFit(pts.map(function (q) { return q[0]; }), [0, n.h], W, H);
                    body = '<polygon points="' + pts.map(function (q) { return f.x(q[0]) + ',' + f.y(q[1]); }).join(' ') + '"/>' +
                        '<path class="calc-sv-guide" d="M' + f.x(n.a / 2) + ' ' + f.y(0) + 'V' + f.y(n.h) + '"/>' +
                        planeLabel(f, f.x(n.a / 2), f.y(0), sizeText('a', n.a), f.x(n.a / 2), f.y(n.h / 2), 8) + planeLabel(f, f.x(n.a / 2), f.y(n.h), sizeText('b', n.b), f.x(n.a / 2), f.y(n.h / 2), 8) +
                        '<text x="' + (f.x(n.a / 2) + 5) + '" y="' + (f.y(n.h / 2) + 4) + '">' + sizeText('h', n.h) + '</text>';
                } else if (shape === 3) {
                    f = planeFit([-n.a, n.a], [-n.b, n.b], W, H);
                    body = '<ellipse class="calc-sv-fill" cx="' + f.x(0) + '" cy="' + f.y(0) + '" rx="' + (n.a * f.k).toFixed(1) + '" ry="' + (n.b * f.k).toFixed(1) + '"/>' +
                        '<path class="calc-sv-guide" d="M' + f.x(0) + ' ' + f.y(0) + 'H' + f.x(n.a) + 'M' + f.x(0) + ' ' + f.y(0) + 'V' + f.y(n.b) + '"/>' + planeDot(f, 0, 0) +
                        planeLabel(f, (f.x(0) + f.x(n.a)) / 2, f.y(0), sizeText('a', n.a), (f.x(0) + f.x(n.a)) / 2, f.y(0) - 1, 8) +
                        '<text x="' + (f.x(0) - 5) + '" y="' + ((f.y(0) + f.y(n.b)) / 2 + 4) + '" text-anchor="end">' + sizeText('b', n.b) + '</text>';
                } else if (shape === 4) {
                    t = Math.min(toRadians(n.t), 2 * Math.PI);
                    xs = [0, n.r, n.r * Math.cos(t)];
                    ys = [0, 0, n.r * Math.sin(t)];
                    [0.5, 1, 1.5].forEach(function (q) { if (t > q * Math.PI) { xs.push(n.r * Math.cos(q * Math.PI)); ys.push(n.r * Math.sin(q * Math.PI)); } }); // the arc's ends of each quarter it goes past
                    f = planeFit(xs, ys, W, H);
                    m = t / 2;
                    body = (t >= 2 * Math.PI - 1e-9 ? '<circle class="calc-sv-fill" cx="' + f.x(0) + '" cy="' + f.y(0) + '" r="' + (n.r * f.k).toFixed(1) + '"/>' :
                        '<path class="calc-sv-fill" d="M' + f.x(0) + ' ' + f.y(0) + 'L' + f.x(n.r) + ' ' + f.y(0) + 'A' + (n.r * f.k).toFixed(1) + ' ' + (n.r * f.k).toFixed(1) + ' 0 ' +
                            (t > Math.PI ? 1 : 0) + ' 0 ' + f.x(n.r * Math.cos(t)) + ' ' + f.y(n.r * Math.sin(t)) + 'Z"/>') + planeDot(f, 0, 0) +
                        planeLabel(f, (f.x(0) + f.x(n.r)) / 2, f.y(0), sizeText('r', n.r), (f.x(0) + f.x(n.r)) / 2, f.y(0) - 1, 8) +
                        '<text x="' + (f.x(0) + Math.cos(m) * 16).toFixed(1) + '" y="' + (f.y(0) - Math.sin(m) * 16 + 4).toFixed(1) + '" text-anchor="' + (Math.cos(m) < -0.3 ? 'end' : 'start') + '">' +
                        sizeText('θ', n.t) + sign + '</text>';
                } else {
                    R = n.s / (2 * Math.sin(Math.PI / n.n));
                    a0 = -Math.PI / 2 - Math.PI / n.n; // a side along the bottom
                    pts = [];
                    for (i = 0; i < Math.min(n.n, 400); i++) pts.push([R * Math.cos(a0 + 2 * Math.PI * i / n.n), R * Math.sin(a0 + 2 * Math.PI * i / n.n)]);
                    f = planeFit(pts.map(function (q) { return q[0]; }).concat(-R, R), pts.map(function (q) { return q[1]; }), W, H);
                    body = (n.n > 400 ? '<circle class="calc-sv-fill" cx="' + f.x(0) + '" cy="' + f.y(0) + '" r="' + (R * f.k).toFixed(1) + '"/>' :
                        '<polygon points="' + pts.map(function (q) { return f.x(q[0]) + ',' + f.y(q[1]); }).join(' ') + '"/>') +
                        planeLabel(f, f.x(0), f.y(pts[0][1]), sizeText('s', n.s), f.x(0), f.y(0), 8);
                }
                return '<svg class="calc-sv-shape" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + tr('The shape') + '">' + body + '</svg>';
            }

            function runSolid(n, raw) {
                var solid = +raw.solid || 0, pi = Math.PI, rows, l, need = [['r'], ['r', 'h'], ['r', 'h'], ['l', 'w', 'h'], ['a', 'h']][solid];
                if (need.every(function (k) { return !raw[k]; })) return { rows: [{ l: 'Volume', v: NaN }, { l: 'Surface area', v: NaN }], cols: 2 };
                if (!need.every(function (k) { return n[k] > 0; })) return { rows: [{ l: 'Volume', v: NaN }, { l: 'Surface area', v: NaN }], cols: 2, warn: true, note: 'Each length is above 0.' };
                if (solid === 0) rows = [{ l: 'Volume', v: 4 / 3 * pi * Math.pow(n.r, 3) }, { l: 'Surface area', v: 4 * pi * n.r * n.r }, { l: 'Diameter', v: 2 * n.r }];
                else if (solid === 1) rows = [{ l: 'Volume', v: pi * n.r * n.r * n.h }, { l: 'Surface area', v: 2 * pi * n.r * (n.r + n.h) }, { l: 'Curved surface', v: 2 * pi * n.r * n.h }];
                else if (solid === 2) {
                    l = Math.hypot(n.r, n.h);
                    rows = [{ l: 'Volume', v: pi * n.r * n.r * n.h / 3 }, { l: 'Surface area', v: pi * n.r * (n.r + l) }, { l: 'Curved surface', v: pi * n.r * l }, { l: 'Slant height', v: l }];
                } else if (solid === 3) {
                    rows = [{ l: 'Volume', v: n.l * n.w * n.h }, { l: 'Surface area', v: 2 * (n.l * n.w + n.l * n.h + n.w * n.h) }, { l: 'Diagonal', v: Math.sqrt(n.l * n.l + n.w * n.w + n.h * n.h) }];
                } else {
                    l = Math.hypot(n.h, n.a / 2);
                    rows = [{ l: 'Volume', v: n.a * n.a * n.h / 3 }, { l: 'Surface area', v: n.a * n.a + 2 * n.a * l }, { l: 'Slant height', v: l }, { l: 'Edge', v: Math.hypot(n.h, n.a / Math.SQRT2) }];
                }
                rows.forEach(function (r) { r.v = CalcMaths.round(r.v); });
                rows.unshift({ l: 'Drawn', wide: true, text: solidDrawing(solid, n) });
                return { rows: rows, cols: 2 };
            }

            // A solid of its sizes, to scale, seen a little from above, as the shapes are drawn: a circle as an ellipse a third as high, the depth of a
            // box or pyramid slanting back at half its length, the edges behind dashed, and each size named
            function solidDrawing(solid, n) {
                var W = 300, H = 130, k = 0.3, f, r = n.r, h = n.h, body, dx, dy, c, top, A;
                function at(x, y) { return f.x(x) + ' ' + f.y(y); }
                function arc(x, y, front) { // half an ellipse of radius r at height y, from its left to its right: the front, under, or the back
                    return 'M' + at(-r, y) + 'A' + fix(r * f.k) + ' ' + fix(r * k * f.k) + ' 0 0 ' + (front ? 0 : 1) + ' ' + at(r, y);
                }
                function name(x, y, letter, v, anchor) {
                    return '<text x="' + fix(x) + '" y="' + fix(y) + '" text-anchor="' + (anchor || 'middle') + '">' + sizeText(letter, v) + '</text>';
                }
                if (solid === 0) {
                    f = planeFit([-r, r], [-r, r], W, H);
                    body = '<circle class="calc-sv-fill" cx="' + f.x(0) + '" cy="' + f.y(0) + '" r="' + fix(r * f.k) + '"/><path class="calc-sv-guide" d="' + arc(0, 0, false) + '"/>' +
                        '<path class="calc-sv-seg calc-sv-thin" d="' + arc(0, 0, true) + '"/><path class="calc-sv-guide" d="M' + at(0, 0) + 'L' + at(r, 0) + '"/>' + planeDot(f, 0, 0) +
                        name(f.x(r) + 6, f.y(0) + 4, 'r', r, 'start');
                } else if (solid === 1 || solid === 2) {
                    f = planeFit([-r, r], [-r * k, h + (solid === 1 ? r * k : 0)], W, H);
                    body = '<path class="calc-sv-fill" d="' + arc(0, 0, true) + (solid === 1 ? 'L' + at(r, h) + 'A' + fix(r * f.k) + ' ' + fix(r * k * f.k) + ' 0 0 0 ' + at(-r, h) : 'L' + at(0, h)) + 'Z"/>' +
                        '<path class="calc-sv-guide" d="' + arc(0, 0, false) + 'M' + at(0, 0) + 'L' + at(r, 0) + (solid === 2 ? 'M' + at(0, 0) + 'L' + at(0, h) : '') + '"/>' +
                        (solid === 1 ? '<ellipse class="calc-sv-fill" cx="' + f.x(0) + '" cy="' + f.y(h) + '" rx="' + fix(r * f.k) + '" ry="' + fix(r * k * f.k) + '"/>' : '') +
                        name((f.x(0) + f.x(r)) / 2, f.y(0) - 4, 'r', r) + name(f.x(r) + 6, (f.y(0) + f.y(h)) / 2 + 4, 'h', h, 'start');
                } else if (solid === 3) {
                    dx = 0.433 * n.w;
                    dy = 0.25 * n.w;
                    f = planeFit([0, n.l + dx], [0, h + dy], W, H);
                    body = '<polygon points="' + [at(0, 0), at(n.l, 0), at(n.l, h), at(0, h)].join(' ') + '"/><polygon points="' + [at(0, h), at(n.l, h), at(n.l + dx, h + dy), at(dx, h + dy)].join(' ') + '"/>' +
                        '<polygon points="' + [at(n.l, 0), at(n.l + dx, dy), at(n.l + dx, h + dy), at(n.l, h)].join(' ') + '"/>' +
                        '<path class="calc-sv-guide" d="M' + at(dx, dy) + 'L' + at(0, 0) + 'M' + at(dx, dy) + 'L' + at(n.l + dx, dy) + 'M' + at(dx, dy) + 'L' + at(dx, h + dy) + '"/>' +
                        name(f.x(n.l / 2), f.y(0) + 13, 'l', n.l) + name(f.x(0) - 5, (f.y(0) + f.y(h)) / 2 + 4, 'h', h, 'end') + name(f.x(n.l + dx / 2) + 6, f.y(dy / 2) + 6, 'w', n.w, 'start');
                } else {
                    A = n.a;
                    dx = 0.433 * A;
                    dy = 0.25 * A;
                    c = [(A + dx) / 2, dy / 2];
                    top = [c[0], c[1] + h];
                    f = planeFit([0, A + dx], [0, top[1]], W, H);
                    body = '<polygon points="' + [at(0, 0), at(A, 0), at(top[0], top[1])].join(' ') + '"/><polygon points="' + [at(A, 0), at(A + dx, dy), at(top[0], top[1])].join(' ') + '"/>' +
                        '<path class="calc-sv-guide" d="M' + at(dx, dy) + 'L' + at(0, 0) + 'M' + at(dx, dy) + 'L' + at(A + dx, dy) + 'M' + at(dx, dy) + 'L' + at(top[0], top[1]) +
                        'M' + at(c[0], c[1]) + 'L' + at(top[0], top[1]) + '"/>' + name(f.x(A / 2), f.y(0) + 13, 'a', A) + name(f.x(A + dx) + 6, (f.y(c[1]) + f.y(top[1])) / 2 + 4, 'h', h, 'start');
                }
                return '<svg class="calc-sv-shape" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + tr('The solid') + '">' + body + '</svg>';
            }

            // y = 1.33333x + 0.666667, a number to 6 digits, 0 left out; x = 3 of a line straight up
            function lineText(m, b, x) {
                if (!isFinite(m)) return 'x = ' + shortNumber(x);
                return 'y = ' + (m ? (m === 1 ? '' : m === -1 ? '−' : shortNumber(m)) + 'x' : '') + (b || !m ? (m ? (b < 0 ? ' − ' : ' + ') + shortNumber(Math.abs(b)) : shortNumber(b)) : '');
            }

            function runPoints(n, raw) {
                var dx = n.x2 - n.x1, dy = n.y2 - n.y1, m, b, none = [{ l: 'Distance', v: NaN }, { l: 'Slope', v: NaN }];
                if (!raw.x1 && !raw.y1 && !raw.x2 && !raw.y2) return { rows: none, cols: 2 };
                if (![n.x1, n.y1, n.x2, n.y2].every(isFinite)) return { rows: none, cols: 2, warn: true, note: 'Type both points, x and y of each.' };
                if (!dx && !dy) return { rows: none, cols: 2, warn: true, note: 'The two points are the same: no line goes through them alone.' };
                m = dx ? CalcMaths.round(dy / dx) : NaN;
                b = dx ? CalcMaths.round(n.y1 - dy / dx * n.x1) : NaN;
                return { rows: [{ l: 'Drawn', wide: true, text: pointsDrawing(n) }, { l: 'Distance', v: CalcMaths.round(Math.hypot(dx, dy)) }, { l: 'Slope', v: m }, { l: 'Midpoint x', v: CalcMaths.round((n.x1 + n.x2) / 2) },
                    { l: 'Midpoint y', v: CalcMaths.round((n.y1 + n.y2) / 2) }, { l: 'y-intercept', v: b }, { l: 'Angle', v: fromRadians(Math.atan2(dy, dx)) },
                    { l: 'Line', text: lineText(m, b, n.x1), wide: true }], cols: 2, note: tr('{v}The angle from the x axis, in {unitWord}.', { v: (dx ? '' : tr('Straight up: its slope has no value. ')), unitWord: unitWord() }) };
            }

            // two points, the line through them across the box, dashed, the segment between them and its midpoint
            function pointsDrawing(n) {
                var mx = (n.x1 + n.x2) / 2, my = (n.y1 + n.y2) / 2, f = planeFit([n.x1, n.x2], [n.y1, n.y2], 300, 130),
                    ux = f.x(n.x2) - f.x(n.x1), uy = f.y(n.y2) - f.y(n.y1), d = Math.hypot(ux, uy) || 1, px = uy / d, py = -ux / d;
                if (py > 0) { px = -px; py = -py; } // the names to the side of the line, over it
                ux = ux / d * 1000;
                uy = uy / d * 1000;
                return planeSvg(f, 'The two points', '<path class="calc-sv-guide" d="M' + (f.x(n.x1) - ux).toFixed(1) + ' ' + (f.y(n.y1) - uy).toFixed(1) + 'L' + (f.x(n.x2) + ux).toFixed(1) + ' ' +
                    (f.y(n.y2) + uy).toFixed(1) + '"/><path class="calc-sv-seg" d="M' + f.x(n.x1) + ' ' + f.y(n.y1) + 'L' + f.x(n.x2) + ' ' + f.y(n.y2) + '"/>' +
                    planeDot(f, n.x1, n.y1) + planeDot(f, n.x2, n.y2) + '<circle class="calc-sv-mid" cx="' + f.x(mx) + '" cy="' + f.y(my) + '" r="2.5"/>' +
                    planeLabel(f, f.x(n.x1), f.y(n.y1), pointText(n.x1, n.y1), f.x(n.x1) - px, f.y(n.y1) - py, 9) +
                    planeLabel(f, f.x(n.x2), f.y(n.y2), pointText(n.x2, n.y2), f.x(n.x2) - px, f.y(n.y2) - py, 9));
            }

            // the circle, its three points and its centre, and a radius to the first point, dashed
            function circleDrawing(n, c) {
                var f = planeFit([c.x - c.r, c.x + c.r], [c.y - c.r, c.y + c.r], 300, 150), ps = [[n.x1, n.y1], [n.x2, n.y2], [n.x3, n.y3]];
                return planeSvg(f, 'The circle', '<circle class="calc-sv-fill" cx="' + f.x(c.x) + '" cy="' + f.y(c.y) + '" r="' + (c.r * f.k).toFixed(1) + '"/>' +
                    '<path class="calc-sv-guide" d="M' + f.x(c.x) + ' ' + f.y(c.y) + 'L' + f.x(n.x1) + ' ' + f.y(n.y1) + '"/>' + '<circle class="calc-sv-mid" cx="' + f.x(c.x) + '" cy="' + f.y(c.y) + '" r="2.5"/>' +
                    ps.map(function (q) { return planeDot(f, q[0], q[1]) + planeLabel(f, f.x(q[0]), f.y(q[1]), pointText(q[0], q[1]), f.x(c.x), f.y(c.y), 10); }).join('') +
                    planeLabel(f, f.x(c.x), f.y(c.y), pointText(c.x, c.y), f.x(n.x1), f.y(n.y1), 8)); // the centre's name away from the radius drawn
            }

            // the polygon, its corners numbered in order, up to 20, and its centroid
            function polygonDrawing(xs, ys, r) {
                var f = planeFit(xs, ys, 300, 150);
                return planeSvg(f, 'The polygon', '<polygon points="' + xs.map(function (x, i) { return f.x(x) + ',' + f.y(ys[i]); }).join(' ') + '"/>' +
                    (xs.length > 20 ? '' : xs.map(function (x, i) { return planeDot(f, x, ys[i]) + planeLabel(f, f.x(x), f.y(ys[i]), String(i + 1), f.x(r.x), f.y(r.y), 9); }).join('')) +
                    '<circle class="calc-sv-mid" cx="' + f.x(r.x) + '" cy="' + f.y(r.y) + '" r="2.5"/>');
            }

            function runCircle3(n, raw) {
                var c = CalcMaths.circleOf(n.x1, n.y1, n.x2, n.y2, n.x3, n.y3), none = [{ l: 'Centre h', v: NaN }, { l: 'Centre k', v: NaN }, { l: 'Radius r', v: NaN }];
                if (['x1', 'y1', 'x2', 'y2', 'x3', 'y3'].every(function (k) { return !raw[k]; })) return { rows: none, cols: 3 };
                if (!c) return { rows: none, cols: 3, warn: true, note: [n.x1, n.y1, n.x2, n.y2, n.x3, n.y3].every(isFinite) ? 'The three points are on one line: no circle goes through them.' : 'Type the three points, x and y of each.' };
                return { rows: [{ l: 'Drawn', wide: true, text: circleDrawing(n, c) }, { l: 'Centre h', v: c.x }, { l: 'Centre k', v: c.y }, { l: 'Radius r', v: c.r },
                    { l: 'Equation', wide: true, text: '(x ' + (c.x < 0 ? '+ ' : '− ') + shortNumber(Math.abs(c.x)) + ')² + (y ' + (c.y < 0 ? '+ ' : '− ') + shortNumber(Math.abs(c.y)) + ')² = ' + shortNumber(CalcMaths.round(c.r * c.r)) },
                    { l: 'Area', v: CalcMaths.round(Math.PI * c.r * c.r) }, { l: 'Circumference', v: CalcMaths.round(2 * Math.PI * c.r) }, { l: 'Diameter', v: CalcMaths.round(2 * c.r) }], cols: 3 };
            }

            function runPolygon(n, raw) {
                var p = CalcEngine.pairs(raw.p || '', engine.comma, 'auto'), r = CalcMaths.polygon(p.xs, p.ys), none = [{ l: 'Area', v: NaN }, { l: 'Perimeter', v: NaN }];
                if (!p.n && !p.bad.length) return { rows: none, cols: 2 };
                if (!r) return { rows: none, cols: 2, warn: true, note: 'Three corners or more, x and y of each on its line, in order round the polygon.' };
                return { rows: [{ l: 'Drawn', wide: true, text: polygonDrawing(p.xs, p.ys, r) }, { l: 'Area', v: r.area }, { l: 'Perimeter', v: r.perimeter }, { l: 'Centroid x', v: r.x },
                    { l: 'Centroid y', v: r.y }, { l: 'Corners', v: p.n }], cols: 2,
                    note: tr('{v}Of corners in order; sides that cross make the area less.', { v: (p.bad.length ? tr('Left out: {bad}. ', { bad: p.bad.slice(0, 3).join(', ') }) : '') }), warn: !!p.bad.length };
            }

            // a box for each coefficient, a of 1 and the others of 0 while they are empty
            function coefficients(letters) {
                return letters.split('').map(function (k, i) { return { k: k, l: k, ph: i ? '0' : '1', def: i ? 0 : 1 }; });
            }

            // a row of boxes for each equation: its coefficients and what it equals, each to be typed
            function system(n) {
                var out = [], i, j;
                for (i = 1; i <= n; i++) {
                    for (j = 0; j <= n; j++) out.push({ k: 'abcd'.charAt(j) + i, l: 'abcd'.charAt(j) + '<sub>' + i + '</sub>', ph: '' });
                }
                return out;
            }

            // a random number from 0 to 1, from the browser's strong ones where it has them
            function chance() {
                var a = new Uint32Array(2);
                if (!window.crypto || !window.crypto.getRandomValues) return Math.random();
                window.crypto.getRandomValues(a);
                return (a[0] * 2097152 + (a[1] >>> 11)) / 9007199254740992; // 53 bits
            }

            function sigmaNote(n) {
                return !isNaN(n.sigma) && !(n.sigma > 0) ? 'σ is above 0.' : '';
            }

            // the chances of a count, its mean and standard deviation
            function chances(c, mean, sd, known) {
                return [{ l: 'P(X = k)', v: c.eq }, { l: 'P(X ≤ k)', v: c.le }, { l: 'P(X ≥ k)', v: c.ge },
                    { l: 'Mean', v: known ? CalcMaths.round(mean) : NaN }, { l: 'σ', v: known ? CalcMaths.round(sd) : NaN }];
            }

            // an exact form as it is shown: (1 – √5)/2, –1 + i√2
            function exactHtml(e) {
                return e.replace(/-/g, '–').replace(/√/g, '<span class="calc-sq">√</span>').replace(/i/g, '<i>i</i>');
            }

            // The exact forms of the roots that have one beyond a whole number, [name, form] each, as a
            // tile: x₁ = (1 – √5)/2, x₂ = (1 + √5)/2; none where none has
            function exactTile(forms) {
                var parts = forms.filter(function (f) { return f[1] && /[\/√πe]|ln/.test(f[1]); });
                return parts.length ? [{ l: 'Exact', text: parts.map(function (f) { return f[0] + ' = ' + exactHtml(f[1]); }).join(engine.comma ? '; ' : ', '), wide: true, wrap: true }] : [];
            }

            // What an equation or an inequality of x gives, find solve or inequality, between From and
            // To where both are typed: { r, ends: they were }, or { out: the tiles while there is none,
            // with why, example where it is not one }
            function lookFor(n, raw, find, none, example) {
                var ends = isFinite(n.from) && isFinite(n.to), r;
                if (!raw.eq) return { out: { rows: none } };
                if (ends && n.from >= n.to) return { out: { rows: none, note: 'From is less than To.', warn: true } };
                r = find(raw.eq, engine.comma, app.deg, ends ? n.from : NaN, ends ? n.to : NaN);
                if (r.error) {
                    return { out: { rows: none, bad: ['eq'], warn: true, note: r.error === 'letters' ? 'Only x has a value here: write the other letters as numbers.' : example } };
                }
                return { r: r, ends: ends };
            }

            function runEquation(n, raw) {
                var none = [{ l: 'x', v: NaN }], found = lookFor(n, raw, function (text, comma, deg, from, to) { return CalcMaths.solve(text, comma, deg, from, to, true); }, none,
                        'Not an equation of x yet: x^2 = 2x + 3, or one side alone, which is 0.'),
                    r = found.r, ends = found.ends;
                if (found.out) return found.out;
                if (!r.roots.length) return { rows: none, note: ends ? tr('No root between {from} and {to}.', { from: local(String(n.from)), to: local(String(n.to)) }) : 'No root found.' };
                return {
                    rows: r.roots.map(function (x, i) { return { l: rootName(i, r.roots.length), v: x }; })
                        .concat(exactTile(r.exact.map(function (e, i) { return [rootName(i, r.roots.length), e]; })), drawnTile(equationDrawing(raw.eq, r.roots, n.from, n.to))),
                    note: r.more ? tr('Of its many roots, the {roots} nearest 0: give From and To for others.', { roots: r.roots.length }) : ''
                };
            }

            // a number of an answer, as it is shown, ∞ as well
            function shown(x) {
                return x === Infinity ? '∞' : x === -Infinity ? '–∞' : local(String(x));
            }

            // Where an inequality holds: x < –2 or x > 2, and as intervals, (–∞, –2) ∪ (2, ∞); its ends to put in
            function runInequality(n, raw) {
                var none = [{ l: 'x', v: NaN, wide: true }], found = lookFor(n, raw, CalcMaths.inequality, none, 'Not an inequality of x yet: x^2 - 4 > 0, with <, >, <= or >=.'),
                    r = found.r, ends = found.ends, words, all, far;
                if (found.out) return found.out;
                all = r.parts.length === 1 && r.parts[0].from === -Infinity && r.parts[0].to === Infinity;
                far = local(String(r.within).replace(/^1(0+)$/, function (m, z) { return '1e' + z.length; })); // 1e15
                far = r.within && (!r.parts.length || all) ? tr(' Looked for from –{far} to {far}: give From and To to look farther.', { far: far }) : '';
                words = r.parts.map(function (p) {
                    if (p.from === p.to) return 'x = ' + shown(p.from);
                    if (p.from === -Infinity && p.to === Infinity) return 'every x';
                    if (p.from === -Infinity) return 'x ' + (p.toIn ? '≤' : '&lt;') + ' ' + shown(p.to);
                    if (p.to === Infinity) return 'x ' + (p.fromIn ? '≥' : '&gt;') + ' ' + shown(p.from);
                    return shown(p.from) + ' ' + (p.fromIn ? '≤' : '&lt;') + ' x ' + (p.toIn ? '≤' : '&lt;') + ' ' + shown(p.to);
                });
                return {
                    rows: [{ l: 'x', text: words.length ? words.join(' or ') : 'none', wide: true, wrap: true },
                        { l: 'Intervals', text: intervalsText(r.parts), wide: true, wrap: true }]
                        .concat(r.ends.map(function (x, i) { return { l: tr('End {i}', { i: (i + 1) }), v: x }; }), drawnTile(inequalityDrawing(raw.eq, r, n.from, n.to))),
                    note: !r.parts.length ? tr('It holds for no x{v}.{far}', { v: (ends ? tr(' between {from} and {to}', { from: shown(n.from), to: shown(n.to) }) : ''), far: far }) :
                        r.more ? tr('Of its many ends, the {ends} nearest 0: give From and To for others.', { ends: r.ends.length }) : far.trim()
                };
            }

            // a value of a limit, ∞ as well
            function limitTile(l, v) {
                return isFinite(v) || isNaN(v) ? { l: l, v: v } : { l: l, text: shown(v) };
            }

            function runLimit(n, raw) {
                var f = toolFunction(raw), r = f.c && !isNaN(n.a) ? CalcMaths.limit(f.c, n.a, app.deg) : { left: NaN, right: NaN, value: NaN }, endless = !isFinite(n.a) && !isNaN(n.a);
                return {
                    rows: [limitTile('Limit', r.value)].concat(endless ? [] : [limitTile('From below', r.left), limitTile('From above', r.right)],
                        f.c && isFinite(n.a) ? drawnTile(limitDrawing(f.c, n.a, r)) : []),
                    bad: f.bad, warn: !!f.note,
                    note: f.note || (!f.c || isNaN(n.a) || !isNaN(r.value) ? '' : !isNaN(r.left) && !isNaN(r.right) ? 'No limit: it comes to one value from below and another from above.' :
                        tr('No limit: it does not settle{v}', { v: (endless ? '.' : tr(', or has no values, by a.')) }))
                };
            }

            function runOde(n, raw) {
                var r = raw.f ? CalcMaths.ode(raw.f, engine.comma, app.deg, n.x0, n.y0, n.x) : { y: NaN, slope: NaN },
                    why = { 'function': 'Not a function of x and y yet: x + y, x y, y^2.', letters: tr('Only x and y have values here: write the other letters as numbers.') }[r.error];
                return {
                    rows: [{ l: 'y(x)', v: r.error ? NaN : r.y }, { l: 'y′(x)', v: r.error ? NaN : r.slope }].concat(r.path && isFinite(r.y) ? drawnTile(odeDrawing(r.path)) : []),
                    bad: why ? ['f'] : [], warn: !!why || (raw.f && !r.error && isNaN(r.y) && [n.x0, n.y0, n.x].every(isFinite)),
                    note: why || (raw.f && !r.error && isNaN(r.y) && [n.x0, n.y0, n.x].every(isFinite) ? 'No value: y grows without end, or has none, on the way.' : '')
                };
            }

            function runPoly(c) {
                var z = CalcMaths.poly(c), size = c.length - 1, rows, k;
                if (!z) {
                    rows = [];
                    for (k = 0; k < size; k++) rows.push({ l: rootName(k, size), v: NaN });
                    return { rows: rows, note: c.every(isFinite) ? 'No x left: its coefficients of x are all 0.' : '', warn: c.every(isFinite) };
                }
                rows = z.map(function (r, i) { return r.im ? { l: rootName(i, z.length), text: complexText(r) } : { l: rootName(i, z.length), v: r.re }; });
                rows = rows.concat(exactTile((CalcMaths.exactRoots(c, z) || []).map(function (e, i) { return [rootName(i, z.length), e]; })));
                if (size === 2 && c[0]) {
                    rows.push({ l: 'Discriminant', v: CalcMaths.round(c[1] * c[1] - 4 * c[0] * c[2]) },
                        { l: 'Vertex x', v: CalcMaths.round(-c[1] / (2 * c[0])) }, { l: 'Vertex y', v: CalcMaths.round(c[2] - c[1] * c[1] / (4 * c[0])) });
                }
                rows = rows.concat(drawnTile(polyDrawing(c, z)));
                return { rows: rows, note: z.length < size ? 'With a of 0, it is of a lower power.' : '' };
            }

            // a polynomial written out from its coefficients, the highest power first: x³ – 2x + 1
            function polyHtml(c) {
                var n = c.length - 1, out = '';
                c.forEach(function (a, k) {
                    var p = n - k, size = Math.abs(a);
                    if (!a) return;
                    out += (out ? (a < 0 ? ' – ' : ' + ') : a < 0 ? '–' : '') + (size === 1 && p ? '' : local(String(size))) + (p ? 'x' + (p > 1 ? '<sup>' + p + '</sup>' : '') : '');
                });
                return out || '0';
            }

            function runPolynomial(n, raw) {
                var none = [{ l: 'x', v: NaN }], r = raw.p ? CalcMaths.polynomial(raw.p, engine.comma, app.deg) : null, out, why;
                if (!r) return { rows: none };
                why = {
                    polynomial: tr('Not a polynomial of x yet: x^5 - 3x + 1, (x - 1)(x + 2)^2, or its coefficients from the highest power, 1, 0, -2, 1.'),
                    letters: tr('Only x has a value here: write the other letters as numbers.'),
                    power: tr('Up to the power 30.')
                }[r.error];
                if (why) return { rows: none, bad: ['p'], warn: true, note: why };
                if (r.c.length < 2) return { rows: none, note: 'No x left: its coefficients of x are all 0.', warn: true };
                out = runPoly(r.c);
                out.rows.unshift({ l: 'Multiplied out', text: polyHtml(r.c), wide: true, wrap: true });
                return out;
            }

            // where two curves meet: an x and a y for each point, side by side
            function runCurves(n, raw) {
                var none = [{ l: 'x', v: NaN }, { l: 'y', v: NaN }], r, rows = [], forms = [];
                if (!raw.e1 || !raw.e2) return { rows: none, cols: 2 };
                r = CalcMaths.system2([raw.e1, raw.e2], engine.comma, app.deg, true);
                if (r.error) {
                    return { rows: none, cols: 2, bad: [['e1', 'e2'][r.which]], warn: true,
                        note: r.error === 'letters' ? 'Only x and y have values here: write the other letters as numbers.' : 'Not an equation of x and y yet: x^2 + y^2 = 25, y = 2x + 1.' };
                }
                if (r.many) return { rows: none, cols: 2, note: 'Many answers: the two hold together all along a curve, as one line written twice.' };
                r.points.forEach(function (p, i) {
                    var x = rootName(i, r.points.length), y = rootName(i, r.points.length, 'y');
                    rows.push({ l: x, v: p.x }, { l: y, v: p.y });
                    forms.push([x, p.exact[0]], [y, p.exact[1]]);
                });
                return {
                    rows: rows.length ? rows.concat(exactTile(forms), drawnTile(curvesDrawing([raw.e1, raw.e2], r.points))) : none, cols: 2,
                    note: !rows.length ? 'No point found where both hold.' : r.more ? tr('Of its many points, the {points} nearest 0.', { points: r.points.length }) : ''
                };
            }

            // the turning points, an x and its value side by side; between From and To the highest and lowest as well
            function runExtrema(n, raw) {
                var none = [{ l: 'x', v: NaN }, { l: 'y', v: NaN }], ends = isFinite(n.from) && isFinite(n.to), r, rows = [];
                if (!raw.f) return { rows: none, cols: 2 };
                if (ends && n.from >= n.to) return { rows: none, cols: 2, note: 'From is less than To.', warn: true };
                r = CalcMaths.extrema(raw.f, engine.comma, app.deg, ends ? n.from : NaN, ends ? n.to : NaN);
                if (r.error) {
                    return { rows: none, cols: 2, bad: ['f'], warn: true,
                        note: r.error === 'letters' ? 'Only x has a value here: write the other letters as numbers.' : 'Not a function of x yet: x^3 - 3x, x e^(-x).' };
                }
                r.points.forEach(function (p) {
                    rows.push({ l: (p.max ? 'Max' : 'Min') + ' x', v: p.x }, { l: (p.max ? 'Max' : 'Min') + ' y', v: p.y });
                });
                if (r.top) rows.push({ l: 'Highest x', v: r.top.x }, { l: 'Highest y', v: r.top.y }, { l: 'Lowest x', v: r.bottom.x }, { l: 'Lowest y', v: r.bottom.y });
                if (rows.length) rows = rows.concat(drawnTile(extremaDrawing(raw.f, r, n.from, n.to)));
                return {
                    rows: rows.length ? rows : none, cols: 2,
                    note: !r.points.length ? tr('No turning point {v}.', { v: (ends ? tr('between {from} and {to}', { from: shown(n.from), to: shown(n.to) }) : tr('found')) }) :
                        r.more ? tr('Of its many turning points, the {points} nearest 0: give From and To for others.', { points: r.points.length }) : ''
                };
            }

            function runSystem(n, size) {
                var rows = [], r, k, names = ['x', 'y', 'z'], known = true, i, j;
                for (i = 1; i <= size; i++) {
                    rows.push([]);
                    for (j = 0; j <= size; j++) {
                        rows[i - 1].push(n['abcd'.charAt(j) + i]);
                        known = known && isFinite(n['abcd'.charAt(j) + i]);
                    }
                }
                r = known ? CalcMaths.linear(rows) : null;
                rows = [];
                for (k = 0; k < size; k++) rows.push({ l: names[k], v: r && r.x ? r.x[k] : NaN });
                if (size === 2 && r && r.x) rows = rows.concat(drawnTile(linesDrawing(n, r.x)));
                return { rows: rows, note: !r ? '' : r.none ? 'No answer: the equations cannot all hold.' : r.many ? 'Many answers: the equations do not each say something new.' : '' };
            }

            // the function of a box, marked where it is not one
            function toolFunction(raw) {
                var c = raw.f ? CalcMaths.fn(raw.f, engine.comma) : null;
                return { c: c, bad: raw.f && !c ? ['f'] : [], note: raw.f && !c ? 'Not a function of x yet: write x^2 for x², 2x for 2 × x; no letters but x.' : '' };
            }

            // An integral, with its exact form, as near as its 10 digits, and the average value of the
            // function between ends that are numbers
            function runIntegral(n, raw) {
                var f = toolFunction(raw), v = f.c ? CalcMaths.integral(f.c, n.a, n.b, app.deg) : NaN, ends = isFinite(n.a) && isFinite(n.b) && n.a !== n.b;
                return { rows: [{ l: '∫', v: v }, { l: 'Average', v: ends ? CalcMaths.round(v / (n.b - n.a)) : NaN }]
                        .concat(exactTile([['∫', CalcMaths.exactOf(v, 1e-9, 'constants', 0, function () { return true; })]]), ends && isFinite(v) ? drawnTile(integralDrawing(f.c, n.a, n.b)) : []),
                    bad: f.bad, warn: !!f.note || (f.c && isNaN(v) && !isNaN(n.a) && !isNaN(n.b)),
                    note: f.note || (f.c && isNaN(v) && !isNaN(n.a) && !isNaN(n.b) ? 'No value: the function has none on the way, or it does not settle.' : '') };
            }

            // y = m x + b, a line as it is shown, its numbers to 10 digits
            function tangentText(m, b) {
                var num = function (v) { return local(String(+Math.abs(v).toPrecision(10))); };
                m = +m.toPrecision(10) + 0;
                b = +b.toPrecision(10) + 0;
                if (!m) return 'y = ' + (b < 0 ? '–' : '') + num(b);
                return 'y = ' + (m < 0 ? '–' : '') + (Math.abs(m) === 1 ? '' : num(m)) + 'x' + (b ? (b < 0 ? ' – ' : ' + ') + num(b) : '');
            }

            // The derivative written out and the derivative of that; at x the value of the function, its
            // slope there and the slope of that, of those formulas where it has them, else by steps, and the
            // line that touches it there
            function runDerivative(n, raw) {
                var f = toolFunction(raw), d = f.c ? CalcMaths.derivatives(raw.f, engine.comma, app.deg, local) : null, forms = d && d.forms,
                    y = f.c && isFinite(n.x) ? f.c.at(n.x, app.deg, true) : NaN, s = [NaN, NaN], none = d && d.error === 'none';
                if (isFinite(y)) s = forms ? d.at(n.x) : CalcMaths.slopes(f.c, n.x, app.deg); // none at a corner or a jump, as |x| at 0
                return { rows: [{ l: 'Derivative', text: forms ? 'f′(x) = ' + forms[0].html : '–', wide: true, wrap: true },
                        { l: 'Second derivative', text: forms ? 'f″(x) = ' + forms[1].html : '–', wide: true, wrap: true },
                        { l: 'f(x)', v: y }, { l: 'f′(x)', v: s[0] }, { l: 'f″(x)', v: s[1] },
                        { l: 'Tangent', text: isFinite(y) && isFinite(s[0]) ? tangentText(s[0], y - s[0] * n.x) : '–', wide: true }].concat(isFinite(y) && isFinite(s[0]) ? drawnTile(tangentDrawing(f.c, n.x, y, s[0])) : []),
                    bad: f.bad, note: f.note || (none ? 'No formula of its slope: it has x!, mod or the like, whose slopes are not written out here.' : ''), warn: !!f.note };
            }

            // parts of x as intervals, (–∞, –2) ∪ (2, ∞); ∅ of none
            function intervalsText(parts) {
                var gap = engine.comma ? '; ' : ', ';
                return parts.length ? parts.map(function (p) {
                    return p.from === p.to ? '{' + shown(p.from) + '}' : (p.fromIn ? '[' : '(') + shown(p.from) + gap + shown(p.to) + (p.toIn ? ']' : ')');
                }).join(' ∪ ') : '∅';
            }

            // where a function rises and falls and bends up and down, as intervals, and its inflection points, an x and its value side by side
            function runCurveShape(n, raw) {
                var none = [{ l: 'Increasing', text: '–', wide: true }, { l: 'Decreasing', text: '–', wide: true }, { l: 'Concave up', text: '–', wide: true }, { l: 'Concave down', text: '–', wide: true }],
                    ends = isFinite(n.from) && isFinite(n.to), r, rows;
                if (!raw.f) return { rows: none, cols: 2 };
                if (ends && n.from >= n.to) return { rows: none, cols: 2, note: 'From is less than To.', warn: true };
                r = CalcMaths.shape(raw.f, engine.comma, app.deg, ends ? n.from : NaN, ends ? n.to : NaN);
                if (r.error) {
                    return { rows: none, cols: 2, bad: r.error === 'none' ? [] : ['f'], warn: true,
                        note: r.error === 'letters' ? 'Only x has a value here: write the other letters as numbers.' : r.error === 'none' ? 'No formula of its slope: it has x!, mod or the like, whose slopes are not written out here.' :
                            'Not a function of x yet: x^3 - 3x, x e^(-x).' };
                }
                rows = [{ l: 'Increasing', text: intervalsText(r.rising), wide: true, wrap: true }, { l: 'Decreasing', text: intervalsText(r.falling), wide: true, wrap: true },
                    { l: 'Concave up', text: intervalsText(r.up), wide: true, wrap: true }, { l: 'Concave down', text: intervalsText(r.down), wide: true, wrap: true }];
                r.points.forEach(function (p) {
                    rows.push({ l: 'Inflection x', v: p.x }, { l: 'Inflection y', v: p.y });
                });
                return {
                    rows: rows.concat(drawnTile(curveShapeDrawing(raw.f, r, n.from, n.to))), cols: 2,
                    note: r.more ? 'It changes too often to list each time: give From and To for the rest.' : r.flat ? 'It is flat: its slope is 0 everywhere.' : !r.rising.length && !r.falling.length ? 'It goes up or down only in jumps: its slope is 0 between them.' : ''
                };
            }

            // a Taylor series written out: x – x³/6 + x⁵/120, of (x – a) about a, each coefficient a
            // fraction where it is one
            function seriesHtml(coefs, a) {
                var base = a ? '(x ' + (a > 0 ? '– ' : '+ ') + local(String(Math.abs(a))) + ')' : 'x', out = '';
                coefs.forEach(function (c, k) {
                    var f = CalcEngine.fraction(c), top = f ? Math.abs(f[0]) : Math.abs(c), power = k ? base + (k > 1 ? '<sup>' + k + '</sup>' : '') : '';
                    if (!c) return;
                    out += (out ? (c < 0 ? ' – ' : ' + ') : c < 0 ? '–' : '') + (top === 1 && k ? '' : local(String(top))) + power + (f ? '/' + f[1] : '');
                });
                return out || '0';
            }

            function runTaylor(n, raw) {
                var none = [{ l: 'Series', text: '–', wide: true }], r, why, rows;
                if (!raw.f) return { rows: none };
                r = CalcMaths.taylor(raw.f, engine.comma, app.deg, n.a, n.n);
                why = {
                    'function': 'Not a function of x yet: sin(x), e^x, 1/(1 - x).',
                    letters: tr('Only x has a value here: write the other letters as numbers.'),
                    none: tr('No series about a: it is not smooth there, as sqrt(x) at 0, or has no complex values, as abs(x) or floor(x).')
                }[r.error];
                if (why) return { rows: none, bad: r.error === 'none' ? [] : ['f'], warn: true, note: why };
                if (!r.coefs) return { rows: none, note: isFinite(n.a) ? 'The power is a whole number from 0 to 12.' : '', warn: isFinite(n.a) };
                rows = [{ l: 'Series', text: seriesHtml(r.coefs, n.a), wide: true, wrap: true }];
                r.coefs.forEach(function (c, k) { rows.push({ l: 'c<sub>' + k + '</sub>', v: c }); });
                return { rows: rows.concat(drawnTile(taylorDrawing(raw.f, r.coefs, n.a))) };
            }

            function runBetween(n, raw) {
                var none = [{ l: 'Area', v: NaN }, { l: '∫(f – g)', v: NaN }], r;
                if (!raw.f || !raw.g) return { rows: none };
                r = CalcMaths.between([raw.f, raw.g], engine.comma, app.deg, n.a, n.b);
                if (r.error) {
                    return { rows: none, bad: [['f', 'g'][r.which]], warn: true,
                        note: r.error === 'letters' ? 'Only x has a value here: write the other letters as numbers.' : 'Not a function of x yet: x^2, sin(x).' };
                }
                return {
                    rows: [{ l: 'Area', v: r.area }, { l: '∫(f – g)', v: r.net }].concat(r.crossings.map(function (x, i) { return { l: tr('Crossing {i}', { i: (i + 1) }), v: x }; }),
                        isFinite(r.area) ? drawnTile(betweenDrawing(raw.f, raw.g, n.a, n.b, r.crossings)) : []),
                    warn: isNaN(r.area) && isFinite(n.a) && isFinite(n.b),
                    note: isNaN(r.area) && isFinite(n.a) && isFinite(n.b) ? 'No value: a function has none on the way, or it does not settle.' : ''
                };
            }

            function runArc(n, raw) {
                var r = raw.f ? CalcMaths.arcLength(raw.f, engine.comma, app.deg, n.a, n.b) : { length: NaN }, why = {
                    'function': 'Not a function of x yet: x^2, sin(x).',
                    letters: tr('Only x has a value here: write the other letters as numbers.')
                }[r.error];
                if (why) return { rows: [{ l: 'Length', v: NaN }], bad: ['f'], warn: true, note: why };
                return { rows: [{ l: 'Length', v: r.length }].concat(isFinite(r.length) ? drawnTile(arcDrawing(raw.f, n.a, n.b)) : []), warn: raw.f && isNaN(r.length) && isFinite(n.a) && isFinite(n.b),
                    note: raw.f && isNaN(r.length) && isFinite(n.a) && isFinite(n.b) ? 'No value: it stands upright, or has a corner or no value, on the way.' : '' };
            }

            // the chances of a value below and above x, its density there, mean and standard deviation
            function spread(c, mean, sd, known) {
                return [{ l: 'P(X ≤ x)', v: c.lo }, { l: 'P(X ≥ x)', v: c.hi }, { l: 'f(x)', v: c.density },
                    { l: 'Mean', v: known ? CalcMaths.round(mean) : NaN }, { l: 'σ', v: known ? CalcMaths.round(sd) : NaN }];
            }

            // what is wrong with degrees of freedom and a chance p, or ''
            function freedomNote(dfs, p) {
                if (dfs.some(function (d) { return !isNaN(d) && !(d > 0); })) return 'Degrees of freedom are above 0.';
                return !isNaN(p) && !(p > 0 && p < 1) ? 'p is a chance between 0 and 1.' : '';
            }

            function runStudent(n) {
                var c = CalcMaths.tDist(n.t, n.nu), why = freedomNote([n.nu], n.p);
                return { rows: [{ l: 'P(T ≤ t)', v: c.lo }, { l: 'P(T ≥ t)', v: c.hi }, { l: 'P(|T| ≥ |t|)', v: c.two },
                    { l: 't for p', v: CalcMaths.tInverse(n.p, n.nu) }, { l: '±t for p', v: CalcMaths.tInverse(1 - (1 - n.p) / 2, n.nu) }].concat(isFinite(c.lo) ? drawnTile(underDrawing(densityOf(function (x) {
                        return CalcMaths.tDist(x, n.nu).lo;
                    }, 1), -Math.max(4, Math.abs(n.t) * 1.2), Math.max(4, Math.abs(n.t) * 1.2), n.t)) : []), note: why, warn: !!why };
            }

            function runChi(n) {
                var c = CalcMaths.chiDist(n.x, n.k), why = freedomNote([n.k], n.p), known = n.k > 0;
                return { rows: [{ l: 'P(X ≤ x)', v: c.lo }, { l: 'P(X ≥ x)', v: c.hi }, { l: 'x for p', v: CalcMaths.chiInverse(n.p, n.k) },
                    { l: 'Mean', v: known ? n.k : NaN }, { l: 'σ', v: known ? CalcMaths.round(Math.sqrt(2 * n.k)) : NaN }].concat(known && isFinite(c.lo) ? drawnTile(underDrawing(densityOf(function (x) {
                        return x <= 0 ? 0 : CalcMaths.chiDist(x, n.k).lo;
                    }, Math.max(1, n.k)), 0, Math.max(n.x * 1.3, n.k + 4 * Math.sqrt(2 * n.k)), n.x)) : []), note: why, warn: !!why };
            }

            function runF(n) {
                var c = CalcMaths.fDist(n.x, n.d1, n.d2), why = freedomNote([n.d1, n.d2], n.p);
                return { rows: [{ l: 'P(X ≤ x)', v: c.lo }, { l: 'P(X ≥ x)', v: c.hi }, { l: 'x for p', v: CalcMaths.fInverse(n.p, n.d1, n.d2) }].concat(isFinite(c.lo) ? drawnTile(underDrawing(densityOf(function (x) {
                        return x <= 0 ? 0 : CalcMaths.fDist(x, n.d1, n.d2).lo;
                    }, 1), 0, Math.max(n.x * 1.3, Math.min(CalcMaths.fInverse(0.98, n.d1, n.d2), 10) || 5), n.x)) : []), note: why, warn: !!why };
            }

            // A sum or a product, on to ∞ as well, with its exact form, π²/6, and what it does where it
            // has no value
            function runSeries(n, raw, product) {
                var r = raw.f ? CalcMaths.series(raw.f, engine.comma, app.deg, n.a, n.b, product) : { value: NaN }, name = product ? 'Π' : 'Σ', why = {
                    'function': 'Not a function yet: write n^2 for n², 1/k! for 1 ÷ k!.',
                    letters: tr('Of one letter: n, k, i or j, or x.'),
                    ends: tr('From and To are whole numbers, From the smaller; To may be inf.'),
                    many: tr('Up to a million terms, or To inf.')
                }[r.error], endless = n.b === Infinity && raw.f && !r.error;
                if (endless && !isFinite(r.value)) {
                    why = isNaN(r.value) ? 'No value: it does not settle, as its terms go on back and forth or shrink too slowly to tell.' : 'It grows without end.';
                }
                return { rows: [limitTile(name, r.error ? NaN : r.value)].concat(exactTile([[name, r.exact]]), raw.f && !r.error ? drawnTile(termsDrawing(raw.f, n.a, n.b, product)) : []),
                    bad: r.error === 'function' || r.error === 'letters' ? ['f'] : [], note: why || '', warn: !!why && !(endless && Math.abs(r.value) === Infinity) };
            }

            // ----- the solver's graphs ----- //

            // the bell of the normal distribution of mean mu and deviation sigma, four σ each way: shaded from a to b, a dot at x
            function bellDrawing(mu, sigma, a, b, x, label) {
                var f = function (t) { return CalcMaths.normalDensity(t, mu, sigma); };
                if (!(sigma > 0) || !isFinite(mu)) return '';
                return graphDrawing(label || 'The bell of the normal distribution', mu - 4 * sigma, mu + 4 * sigma, { fs: [f], fill: isNaN(a) ? null : [f, null, Math.max(a, mu - 5 * sigma), Math.min(b, mu + 5 * sigma)],
                    dots: isFinite(x) ? [[x, f(x)]] : [] });
            }

            // a density from x0 to x1, shaded below x, as P(X ≤ x) is
            function underDrawing(f, x0, x1, x) {
                return isFinite(x) ? graphDrawing('Its density, shaded below x', x0, x1, { fs: [f], fill: [f, null, x0, Math.min(x, x1)] }) : '';
            }

            // an equation's two sides, or its one side and 0, and the roots where they meet
            function equationDrawing(text, roots, from, to) {
                var fs = sidesOf(text, '='), x = rangeAround(roots, from, to);
                if (!fs) return '';
                return graphDrawing('Its two sides, and where they meet', x[0], x[1], { fs: fs, fit: 1, yfrom: isFinite(from) && isFinite(to) ? null : rootsSpan(roots),
                    dots: roots.map(function (r) { return [r, fs.length > 1 ? fs[0](r) : 0]; }) });
            }

            // an inequality's sides, shaded where it holds
            function inequalityDrawing(text, r, from, to) {
                var fs = sidesOf(text, /<=|>=|=<|=>|[<>≤≥]/), x = rangeAround(r.ends, from, to);
                if (!fs) return '';
                return graphDrawing('Its sides, shaded where it holds', x[0], x[1], { fs: fs, bands: r.parts.map(function (p) { return [p.from, p.to]; }) });
            }

            // the curve, shaded where it bends up, its inflection points dots
            function curveShapeDrawing(text, r, from, to) {
                var fs = sidesOf(text), xs = r.points.map(function (p) { return p.x; }), x;
                ['rising', 'falling', 'up', 'down'].forEach(function (k) { r[k].forEach(function (p) { xs.push(p.from, p.to); }); });
                x = rangeAround(xs, from, to);
                if (!fs) return '';
                return graphDrawing('The curve, shaded where it bends up, and its inflection points', x[0], x[1], { fs: fs, fit: 1,
                    bands: r.up.map(function (p) { return [p.from, p.to]; }), dots: r.points.map(function (p) { return [p.x, p.y]; }) });
            }

            function extremaDrawing(text, r, from, to) {
                var fs = sidesOf(text), pts = r.points.concat(r.top ? [r.top, r.bottom] : []), x = rangeAround(pts.map(function (p) { return p.x; }), from, to);
                if (!fs) return '';
                return graphDrawing('The curve, and its turning points', x[0], x[1], { fs: fs, dots: pts.map(function (p) { return [p.x, p.y]; }) });
            }

            // x from the first root to the last, to fit a graph's height to, not to its far ends that climb away; of one, round it
            function rootsSpan(xs) {
                var lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs);
                return hi > lo ? [lo, hi] : [lo - Math.max(1, Math.abs(lo) * 0.25), lo + Math.max(1, Math.abs(lo) * 0.25)];
            }

            // a polynomial of its coefficients, the highest power first, round all its roots, the real ones dots
            function polyDrawing(c, z) {
                var xs = z.map(function (w) { return w.re; }), x;
                if (c.length === 3 && c[0]) xs.push(-c[1] / (2 * c[0])); // the vertex, of roots a ± bi as well
                x = rangeAround(xs);
                return graphDrawing('The curve, and its real roots', x[0], x[1], { fs: [function (t) { return c.reduce(function (s, a) { return s * t + a; }, 0); }], yfrom: rootsSpan(xs),
                    dots: z.filter(function (w) { return !w.im; }).map(function (w) { return [w.re, 0]; }) });
            }

            // an equation of x and y as a function that is 0 where it holds: its left side less its right, of y = f(x) y less f; null of none
            function planeEquation(text) {
                var r = CalcEngine.relation(text, engine.comma, {}), c;
                if (r) return !r.letters.length && r.op === '=' ? function (x, y) { return r.at(x, y, app.deg); } : null;
                c = CalcEngine.graph(text, engine.comma, {});
                return c && !c.letters.length ? function (x, y) { return y - c.at(x, app.deg); } : null;
            }

            // two curves of x and y, at one scale both ways, round where they cross and the origin
            function curvesDrawing(texts, points) {
                var gs = texts.map(planeEquation), wide = 280 / 96, xs = [0], ys = [0], x, y, sx, sy, R;
                if (!gs.every(Boolean) || !points.length) return '';
                points.forEach(function (p) { xs.push(p.x); ys.push(p.y); });
                R = 4 * Math.max(1, Math.max.apply(null, xs.concat(ys).map(Math.abs)));
                gs.forEach(function (g) { // a curve that closes within 4 times as far, as a circle, all in; a line goes on, and is not
                    var box = closedBox(g, R);
                    if (box) {
                        xs.push(box[0], box[1]);
                        ys.push(box[2], box[3]);
                    }
                });
                x = [Math.min.apply(null, xs), Math.max.apply(null, xs)];
                y = [Math.min.apply(null, ys), Math.max.apply(null, ys)];
                sy = Math.max(y[1] - y[0], (x[1] - x[0]) / wide) * 1.25 + 0.5;
                sx = sy * wide;
                x = (x[0] + x[1]) / 2;
                y = (y[0] + y[1]) / 2;
                return graphDrawing('The two curves, and where they cross', x - sx / 2, x + sx / 2, { y: [y - sy / 2, y + sy / 2], rels: gs, dots: points.map(function (p) { return [p.x, p.y]; }) });
            }

            // where g(x, y) is 0 within R of the origin, from a grid: the least and most x and y of it, or null where it goes to the edge, as a line does
            function closedBox(g, R) {
                var n = 60, v = [], box = [Infinity, -Infinity, Infinity, -Infinity], i, j, x, y;
                for (j = 0; j <= n; j++) {
                    v.push([]);
                    for (i = 0; i <= n; i++) v[j].push(g(-R + 2 * R * i / n, -R + 2 * R * j / n));
                }
                for (j = 0; j < n; j++) {
                    for (i = 0; i < n; i++) {
                        var c = [v[j][i], v[j][i + 1], v[j + 1][i], v[j + 1][i + 1]];
                        if (!c.every(isFinite) || Math.min.apply(null, c) > 0 || Math.max.apply(null, c) < 0) continue;
                        if (!i || !j || i === n - 1 || j === n - 1) return null;
                        x = -R + 2 * R * (i + 0.5) / n;
                        y = -R + 2 * R * (j + 0.5) / n;
                        box = [Math.min(box[0], x), Math.max(box[1], x), Math.min(box[2], y), Math.max(box[3], y)];
                    }
                }
                return box[0] <= box[1] ? [box[0] - R / n, box[1] + R / n, box[2] - R / n, box[3] + R / n] : null;
            }

            // two lines of a₁x + b₁y = c₁, at much the same scale both ways, round where they cross
            function linesDrawing(n, xy) {
                var pad = Math.max(2, Math.abs(xy[0]) * 0.5, Math.abs(xy[1]) * 0.5), y = [xy[1] - pad * 0.8, xy[1] + pad * 0.8], fs = [], lines = [];
                [1, 2].forEach(function (i) {
                    var a = n['a' + i], b = n['b' + i], c = n['c' + i];
                    if (b) fs.push(function (x) { return (c - a * x) / b; });
                    else if (a) lines.push([c / a, y[0], c / a, y[1]]); // upright, of x alone
                });
                return graphDrawing('The two lines, and where they cross', xy[0] - pad * 2.3, xy[0] + pad * 2.3, { fs: fs, lines: lines, y: y, dots: [xy] });
            }

            // a function near a, and what it comes to there, hollow, as it may have no value at a
            function limitDrawing(c, a, r) {
                var s = 2 * Math.max(1, Math.abs(a) * 0.5), to = isFinite(r.value) ? [[a, r.value]] : [[a, r.left], [a, r.right]];
                return graphDrawing('Near a, and what it comes to', a - s, a + s, { fs: [function (x) { return c.at(x, app.deg); }], fit: 1, marks: [[a, 'a']],
                    open: to.filter(function (p) { return isFinite(p[1]); }) });
            }

            // the way y goes from x₀ to x, of the steps of Runge and Kutta
            function odeDrawing(path) {
                var m = path.length - 1, a = path[0][0], b = path[m][0];
                if (m < 2 || a === b) return '';
                return graphDrawing('y from x₀ to x', Math.min(a, b), Math.max(a, b), { fs: [function (x) { // between the steps, a line
                    var t = Math.max(0, Math.min(m, (x - a) / (b - a) * m)), k = Math.min(m - 1, Math.floor(t));
                    return path[k][1] + (path[k + 1][1] - path[k][1]) * (t - k);
                }], dots: [path[0], path[m]] });
            }

            function integralDrawing(c, a, b) {
                var f = function (x) { return c.at(x, app.deg); }, s = Math.abs(b - a) * 0.25;
                return graphDrawing('The area under it, from a to b', Math.min(a, b) - s, Math.max(a, b) + s, { fs: [f], fill: [f, null, a, b], marks: [[a, 'a'], [b, 'b']] });
            }

            function tangentDrawing(c, x, y, m) {
                var s = 2 * Math.max(1, Math.abs(x) * 0.5);
                return graphDrawing('The curve, and the line that touches it at x', x - s, x + s, { fs: [function (t) { return c.at(t, app.deg); }, function (t) { return y + m * (t - x); }], fit: 1, dots: [[x, y]] });
            }

            function taylorDrawing(text, coefs, a) {
                var fs = sidesOf(text), s = 3 * Math.max(1, Math.abs(a) * 0.3);
                if (!fs) return '';
                return graphDrawing('The function, and its series about a', a - s, a + s, { fs: [fs[0], function (x) {
                    return coefs.reduceRight(function (t, c) { return t * (x - a) + c; }, 0);
                }], fit: 1, dots: [[a, fs[0](a)]] });
            }

            // f and g of their boxes, the y = or f(x) = before them left out, and the area between them shaded
            function betweenDrawing(tf, tg, a, b, cuts) {
                var cut = function (t) { return t.replace(/^\s*(y|[fg]\s*\(\s*x\s*\))\s*=/i, ''); }, f = sidesOf(cut(tf)), g = sidesOf(cut(tg)), s = Math.abs(b - a) * 0.2;
                if (!f || !g) return '';
                return graphDrawing('The area between f and g', Math.min(a, b) - s, Math.max(a, b) + s, { fs: [f[0], g[0]], fill: [f[0], g[0], a, b], dots: cuts.map(function (x) { return [x, f[0](x)]; }) });
            }

            // the curve from a to b, its ends dots, and on past them thin
            function arcDrawing(text, a, b) {
                var fs = sidesOf(text), lo = Math.min(a, b), hi = Math.max(a, b), s = (hi - lo) * 0.2;
                if (!fs || !(hi > lo)) return '';
                return graphDrawing('The curve from a to b', lo - s, hi + s, { fs: [function (x) { return x >= lo && x <= hi ? fs[0](x) : NaN; }, function (x) { return x <= lo || x >= hi ? fs[0](x) : NaN; }],
                    dots: [[lo, fs[0](lo)], [hi, fs[0](hi)]] });
            }

            // each term of a sum, or factor of a product, a bar: the first 60, or 30 of one on to ∞
            function termsDrawing(text, a, b, product) {
                var vars = {}, c = CalcEngine.graph(text, engine.comma, vars), key, last, bars = [], k;
                if (!c || !isFinite(a)) return '';
                key = c.letters[0];
                last = Math.min(isFinite(b) ? b : a + 29, a + 59);
                for (k = a; k <= last; k++) {
                    if (key) vars[key] = k;
                    bars.push([k, key ? c.at(0, app.deg) : c.at(k, app.deg)]);
                }
                return bars.length ? graphDrawing(product ? 'Each factor' : 'Each term', a - 0.7, last + 0.7, { bars: bars }) : '';
            }

            // ----- the money's graphs ----- //

            // a line through points, x in order: its y at any x between the first and the last
            function through(pts) {
                return function (x) {
                    var k = 0;
                    if (!(x >= pts[0][0] && x <= pts[pts.length - 1][0])) return NaN;
                    while (k < pts.length - 2 && pts[k + 1][0] < x) k++;
                    return pts[k][1] + (pts[k + 1][1] - pts[k][1]) * (x - pts[k][0]) / (pts[k + 1][0] - pts[k][0] || 1);
                };
            }

            // a value at the end of each year, from where it starts, the area under it shaded
            function yearsDrawing(label, pts) {
                var f = through(pts), end = pts[pts.length - 1][0];
                return pts.length > 1 ? graphDrawing(label, 0, end, { fs: [f], fill: [f, null, 0, end] }) : '';
            }

            // the balance at the end of each year, and under it all that was put in: the interest between them
            function savingsDrawing(start, byYear) {
                var put = start, pts = [[0, start]], ins = [[0, start]], f, g, end;
                byYear.forEach(function (y) {
                    put += y[1];
                    pts.push([y[0], y[3]]);
                    ins.push([y[0], put]);
                });
                f = through(pts);
                g = through(ins);
                end = pts[pts.length - 1][0];
                return pts.length > 1 ? graphDrawing('The balance, and all that was put in', 0, end, { fs: [f, g], fill: [f, g, 0, end] }) : '';
            }

            // Time value of money: the balance from PV, each period's interest on it and its payment, to FV, which it is less, at the end;
            // of up to 1000 periods, the one worked out, find, of its value
            function tvmDrawing(n, find, value, start) {
                var t = { n: n.n, iy: n.iy, pv: n.pv, pmt: n.pmt, fv: n.fv }, i, b, pts = [], k, N;
                t[find] = value;
                i = t.iy / 100 / n.py;
                N = Math.ceil(t.n - 1e-9);
                if (!(N > 0 && N <= 1000) || ![i, t.pv, t.pmt].every(isFinite)) return '';
                b = t.pv;
                pts.push([0, b]);
                for (k = 1; k <= N; k++) {
                    b = start ? (b + t.pmt) * (1 + i) : b * (1 + i) + t.pmt;
                    pts.push([k, b]);
                }
                return yearsDrawing(tr('The balance, period by period'), pts);
            }

            // ---------------- money ---------------- //

            function signs() { return tr('Money received is above 0, money paid below 0: a loan of 200000 is PV = 200000, its PMT below 0.'); }

            // Time value of money: the one of N, I/Y, PV, PMT and FV left empty, its tile first, then all
            // the money paid and the interest, paid or earned; or what is wrong, said
            function runTvm(n, raw) {
                var keys = ['n', 'iy', 'pv', 'pmt', 'fv'], names = { n: 'N', iy: 'I/Y %', pv: 'PV', pmt: 'PMT', fv: 'FV' },
                    empty = keys.filter(function (k) { return !raw[k]; }), none = [{ l: empty.length === 1 ? names[empty[0]] : 'N, I/Y, PV, PMT or FV', v: NaN, wide: empty.length !== 1 }], r, why, part;
                if (keys.some(function (k) { return raw[k] && isNaN(n[k]); }) || (raw.py && isNaN(n.py))) return { rows: none }; // its box is marked
                if (empty.length !== 1) {
                    return { rows: none, warn: !empty.length,
                        note: (empty.length ? tr('Leave only one of N, I/Y, PV, PMT and FV empty, the one to work out. ') : tr('Leave one of N, I/Y, PV, PMT and FV empty, the one to work out. ')) + signs() };
                }
                r = CalcMaths.tvm({ n: n.n, iy: n.iy, pv: n.pv, pmt: n.pmt, fv: n.fv, py: n.py, start: raw.due === '1' });
                why = {
                    py: tr('P/Y, the payments a year, is above 0.'),
                    rate: tr('The rate a period, I/Y ÷ P/Y, is above –100%.'),
                    n: tr('N, the payments, is above 0.'),
                    none: (empty[0] === 'n' ? tr('No {names} makes the money balance: the payments never bring PV to FV at this rate. {signs}', { names: names[empty[0]], signs: signs() }) : tr('No {names} makes the money balance: money received and money paid need opposite signs. {signs}', { names: names[empty[0]], signs: signs() })),
                    large: tr('Too large a number to show.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                part = (empty[0] === 'n' ? r.n : n.n) % 1;
                return {
                    rows: [{ l: names[r.find], v: r.value, places: /^(pv|pmt|fv)$/.test(r.find) ? 2 : undefined, dp: 2 }, { l: 'Total paid', v: r.paid, places: 2 },
                        { l: r.net < 0 ? 'Interest paid' : r.net > 0 ? 'Interest earned' : 'Interest', v: CalcMaths.round(Math.abs(r.net)), places: 2 }]
                        .concat(drawnTile(tvmDrawing(n, r.find, r.value, raw.due === '1'))),
                    note: signs() + (part > 1e-9 && part < 1 - 1e-9 ? tr(' N is not a whole number of payments: a last, smaller one makes up the part.') : '')
                };
            }

            // NPV at the rate, IRR and the payback of cash flows typed as a list is
            function runNpv(n, raw) {
                var read = raw.cf ? CalcEngine.numbers(raw.cf, engine.comma, 'auto') : { values: [], bad: [] }, flows = read.values,
                    none = [{ l: 'NPV', v: NaN }, { l: 'IRR %', v: NaN }, { l: 'Payback', v: NaN }], r, back, notes = [];
                if (read.bad.length) return { rows: none, bad: ['cf'], warn: true, note: (engine.comma ? tr('{bad} is not a number: type the cash flows one to a line, or apart by spaces or semicolons.', { bad: read.bad[0] }) : tr('{bad} is not a number: type the cash flows one to a line, or apart by spaces or commas.', { bad: read.bad[0] })) };
                if (flows.length < 2) return { rows: none, note: raw.cf ? 'Two cash flows or more: the first at the start, then one a period.' : '' };
                if (flows.length > 1000) return { rows: none, bad: ['cf'], warn: true, note: 'Up to 1000 cash flows.' };
                r = CalcMaths.irr(flows);
                back = CalcMaths.payback(flows);
                if (isFinite(n.r) && !(n.r > -100)) notes.push(tr('The rate is above –100%.'));
                if (!r.changes) notes.push(tr('No IRR: the flows never change sign, so no rate makes their NPV 0.'));
                else if (isNaN(r.irr)) notes.push(tr('No IRR found from –99.99% to 1000000%.'));
                else if (r.changes > 1) notes.push(tr('The flows change sign {changes} times, so there may be more than one IRR{v}', { changes: r.changes, v: (r.others.length ? (r.others.length > 1 ? tr(': this one is the nearest 10%, and {others} are others.', { others: r.others.map(function (x) { return local(String(x)) + '%'; }).join(', ') }) : tr(': this one is the nearest 10%, and {others} is another.', { others: r.others.map(function (x) { return local(String(x)) + '%'; }).join(', ') })) : tr('; this one is the nearest 10%.')) }));
                if (isNaN(back) && flows[0] < 0) notes.push(tr('They never pay back what went out.'));
                return {
                    rows: [{ l: 'NPV', v: CalcMaths.npv(n.r, flows), places: 2 }, { l: 'IRR %', v: r.irr, dp: 2 }, { l: 'Payback', v: back, dp: 2 }].concat(flows.length <= 200 ? drawnTile(graphDrawing('Each cash flow, what went out red',
                        -0.7, flows.length - 0.3, { bars: flows.map(function (v, t) { return [t, v, v < 0]; }) })) : []),
                    warn: !!notes.length && (!(n.r > -100) || !r.changes), note: notes.join(' ')
                };
            }

            var SCHEDULE_ROWS = 600; // a table of more payments shows the first of them

            // a loan's payment, its interest and a table of its years or of its payments
            function runSchedule(n, raw) {
                var none = [{ l: 'Payment', v: NaN }, { l: 'Total interest', v: NaN }, { l: 'Total paid', v: NaN }], by = raw.by === '1', r, why;
                if (!raw.loan || !raw.rate || !raw.years || [n.loan, n.rate, n.years, n.py].some(isNaN)) {
                    return { rows: none, warn: raw.loan && n.loan <= 0, note: raw.loan && n.loan <= 0 ? 'The loan is above 0.' : '' };
                }
                r = CalcMaths.amortize(n.loan, n.rate, n.years, n.py, SCHEDULE_ROWS);
                why = {
                    loan: tr('The loan is above 0.'),
                    years: tr('Years are above 0.'),
                    py: tr('Payments a year are above 0.'),
                    rate: tr('The rate a period, the rate a year ÷ payments a year, is above –100%.'),
                    whole: tr('Years × payments a year is a whole number of payments.'),
                    long: tr('Up to 100000 payments.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                return {
                    rows: [{ l: 'Payment', v: r.payment, places: 2 }, { l: 'Total interest', v: r.interest, places: 2 }, { l: 'Total paid', v: CalcMaths.round(n.loan + r.interest), places: 2 },
                        { l: by ? 'Each payment' : 'Each year', m: by ? r.byPayment : r.byYear, head: [by ? 'No.' : 'Year', 'Interest', 'Principal', 'Balance'], places: 2 }],
                    note: tr('{v}, each at the end of its period.{v2}', { v: (r.n === 1 ? tr('1 payment') : tr('{n} payments', { n: r.n })), v2: (r.more ? (by ? tr(' The table has the first {rows} payments: By year has them all.', { rows: SCHEDULE_ROWS }) : tr(' The table has the first {rows} years.', { rows: SCHEDULE_ROWS })) : '') })
                };
            }

            // money saved: what it grows to, all put in, the interest and a table of its years
            function runSavings(n, raw) {
                var none = [{ l: 'Balance', v: NaN }, { l: 'Put in', v: NaN }, { l: 'Interest', v: NaN }], r, why;
                if (!raw.start || !raw.rate || !raw.years || [n.start, n.rate, n.years, n.m, n.add].some(isNaN)) return { rows: none };
                r = CalcMaths.savings(n.start, n.rate, n.years, n.m, n.add, raw.due === '1', SCHEDULE_ROWS);
                why = {
                    money: tr('Start and Add are 0 or more.'),
                    years: tr('Years are above 0.'),
                    m: tr('m, the periods a year, is above 0.'),
                    add: tr('Nothing is added with interest all the time: m is a number for that.'),
                    rate: tr('The rate a period, the rate a year ÷ m, is above –100%.'),
                    whole: tr('Years × m is a whole number of periods.'),
                    long: tr('Up to 100000 periods.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                return {
                    rows: [{ l: 'Balance', v: r.balance, places: 2 }, { l: 'Put in', v: r.added, places: 2 }, { l: 'Interest', v: r.interest, places: 2 }, { l: 'APY %', v: r.apy, dp: 2 },
                        { l: 'Each year', m: r.byYear, head: ['Year', 'Put in', 'Interest', 'Balance'], places: 2 }].concat(drawnTile(savingsDrawing(n.start, r.byYear))),
                    note: (n.m === Infinity ? 'Interest all the time.' : tr('Interest {m} times a year{v}', { m: local(String(n.m)), v: (n.add ? (raw.due === '1' ? tr(', {add} added at the start of each period.', { add: local(String(n.add)) }) : tr(', {add} added at the end of each period.', { add: local(String(n.add)) })) : '.') })) +
                        (r.more ? tr(' The table has the first {rows} years.', { rows: SCHEDULE_ROWS }) : '')
                };
            }

            // money to the cent, in a note, as its tile shows it
            function cents(x) {
                return placesValue(x, 2).text;
            }

            // a home's payment each month, with its tax, insurance, PMI and HOA fees, and a table of its years
            function runMortgage(n, raw) {
                var none = [{ l: 'Each month', v: NaN }, { l: 'Loan', v: NaN }, { l: 'Total interest', v: NaN }], r, why;
                if (!raw.price || !raw.rate || [n.price, n.down, n.rate, n.years, n.tax, n.ins, n.pmi, n.hoa].some(isNaN)) return { rows: none };
                r = CalcMaths.mortgage(n.price, n.down, n.rate, n.years, n.tax, n.ins, n.pmi, n.hoa, SCHEDULE_ROWS);
                why = {
                    price: tr('The price is above 0.'),
                    down: tr('Down is 0% or more, and below 100%, so there is a loan.'),
                    costs: tr('Tax, insurance, PMI and HOA are 0 or more.'),
                    years: tr('Years are above 0.'),
                    rate: tr('The rate a month, the rate a year ÷ 12, is above –100%.'),
                    whole: tr('Years × 12 is a whole number of payments.'),
                    long: tr('Up to 100000 payments.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                return {
                    rows: [{ l: 'Each month', v: r.each, places: 2 }, { l: 'Loan payment', v: r.payment, places: 2 }]
                        .concat([['Tax', r.tax], ['Insurance', r.insurance], ['PMI', r.pmi], ['HOA', r.hoa]].filter(function (c) { return c[1]; }).map(function (c) { return { l: c[0], v: c[1], places: 2 }; }),
                            [{ l: 'Loan', v: r.loan, places: 2 }, { l: 'Down payment', v: r.down, places: 2 }, { l: 'Total interest', v: r.interest, places: 2 }, { l: 'Total paid', v: r.total, places: 2 },
                                { l: 'Each year', m: r.byYear, head: ['Year', 'Interest', 'Principal', 'Balance'], places: 2 }]),
                    note: tr('{n} payments, each at the end of its month; Total paid is all of them, with the tax, insurance, PMI and HOA, the down payment not in it.{v}{v2}', { n: r.n, v: (r.pmiMonths ? tr(' PMI for the first {v}, until the loan is down to 78% of the price.', { v: (r.pmiMonths === 1 ? tr('payment') : tr('{pmiMonths} payments', { pmiMonths: r.pmiMonths })) }) :
                            n.pmi ? tr(' No PMI: 20% or more is put down.') : ''), v2: (r.more ? tr(' The table has the first {rows} years.', { rows: SCHEDULE_ROWS }) : '') })
                };
            }

            // a balance owed paid off: the months a payment takes, or the payment that takes so many months
            function runPayoff(n, raw) {
                var find = raw.pay && !raw.months ? 'months' : 'payment', none = [{ l: find === 'months' ? 'Months' : 'Payment', v: NaN }, { l: 'Total interest', v: NaN }, { l: 'Total paid', v: NaN }], r, why, y;
                if (raw.pay && raw.months) return { rows: none, warn: true, note: 'Leave one of Payment and Months empty, the one to work out.' };
                if (!raw.balance || !raw.apr || (!raw.pay && !raw.months) || isNaN(n.balance) || isNaN(n.apr) || (raw.pay && isNaN(n.pay)) || (raw.months && isNaN(n.months))) return { rows: none };
                r = CalcMaths.cardPayoff(n.balance, n.apr, raw.pay ? n.pay : NaN, raw.months ? n.months : NaN, SCHEDULE_ROWS);
                why = {
                    balance: tr('The balance is above 0.'),
                    rate: tr('APR is 0% or more.'),
                    payment: tr('The payment is above 0.'),
                    months: tr('Months are a whole number above 0.'),
                    small: tr('The payment never pays it off: it is no more than the first month\'s interest, {balance}.', { balance: cents(n.balance * n.apr / 1200) }),
                    long: tr('Up to 12000 months.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                y = Math.floor(r.months / 12);
                return {
                    rows: (find === 'months' ? [{ l: 'Months', v: r.months }] : [{ l: 'Payment', v: r.payment, places: 2 }]).concat([{ l: 'Total interest', v: r.interest, places: 2 },
                        { l: 'Total paid', v: r.paid, places: 2 }, { l: 'Last payment', v: r.last, places: 2 }, { l: 'Each year', m: r.byYear, head: ['Year', 'Interest', 'Principal', 'Balance'], places: 2 }]),
                    note: tr('Paid off in {v}{v2}, with nothing more spent on it; interest each month of APR ÷ 12.{v3}', { v: (y ? trn(y, '{n} year', '{n} years') + (r.months % 12 ? tr(' and ') : '') : ''), v2: (r.months % 12 ? trn(r.months % 12, '{n} month', '{n} months') : ''), v3: (r.more ? tr(' The table has the first {rows} years.', { rows: SCHEDULE_ROWS }) : '') })
                };
            }

            // money saved for retirement: what there is then, the most to draw each month, and how long a draw lasts
            function runRetirement(n, raw) {
                var none = [{ l: 'At retirement', v: NaN }, { l: 'In money of today', v: NaN }, { l: 'Can draw a month', v: NaN }], r, why, f, end, drawn = !!raw.draw;
                if (!raw.age || !raw.ret || [n.age, n.retire, n.until, n.saved, n.add, n.ret, n.infl].some(isNaN) || (drawn && isNaN(n.draw))) return { rows: none };
                r = CalcMaths.retirement(n.age, n.retire, n.until, n.saved, n.add, n.ret, n.infl, drawn ? n.draw : NaN);
                why = {
                    age: tr('The ages in order: Age, then Retire at, then To age above it, up to 150.'),
                    money: tr('Saved, Add and Draw are 0 or more.'),
                    rate: tr('Return and inflation are above –100%.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                f = through(r.path);
                end = r.path[r.path.length - 1][0];
                return {
                    rows: [{ l: 'At retirement', v: r.atRetire, places: 2 }, { l: 'In money of today', v: r.real, places: 2 }, { l: 'Put in', v: r.putIn, places: 2 }, { l: 'Growth', v: r.growth, places: 2 },
                        { l: 'Can draw a month', v: r.can, places: 2 }].concat(drawn ? [r.lasts === Infinity ? { l: 'Lasts to age', text: '∞' } : r.lasts === 150 ? { l: 'Lasts to age', text: '150+' } : { l: 'Lasts to age', v: r.lasts, dp: 1 },
                            { l: tr('Left at {until}', { until: local(String(n.until)) }), v: r.left, places: 2 }] : [],
                        r.real > 0 && end > n.age ? drawnTile(graphDrawing('The savings at each age, in money of today', n.age, end, { fs: [f], fill: [f, null, n.age, end],
                            marks: n.retire > n.age ? [[n.retire, tr('Retire')]] : [] })) : []),
                    note: tr('Add goes in at the end of each month until retiring; then a draw at the start of each month, growing with prices. Can draw a month is the most, in money of today, for it to last to {until}.{v}', { until: local(String(n.until)), v: (!drawn ? '' : r.lasts === Infinity ? tr(' A draw of {draw} never uses it up: what it earns over prices is more.', { draw: cents(n.draw) }) :
                            r.lasts < n.until ? tr(' A draw of {draw} uses it up before {until}.', { draw: cents(n.draw), until: local(String(n.until)) }) : '') })
                };
            }

            // pay by the hour, day, week, month or year, in each of the others
            function runSalary(n, raw) {
                var none = [{ l: 'Hourly', v: NaN }, { l: 'Monthly', v: NaN }, { l: 'Yearly', v: NaN }], r, why;
                if (!raw.pay || [n.pay, n.hours, n.days, n.weeks, n.ot, n.otx].some(isNaN)) return { rows: none };
                r = CalcMaths.salary(n.pay, +raw.per, n.hours, n.days, n.weeks, n.ot, n.otx);
                why = {
                    pay: tr('The pay is 0 or more.'),
                    ot: tr('Overtime and its times are 0 or more.'),
                    hours: tr('Hours a week are above 0, and no more than 168 with the overtime.'),
                    days: tr('Days a week are above 0, and no more than 7.'),
                    weeks: tr('Weeks a year are above 0, and no more than 53.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                return {
                    rows: [[tr('Hourly'), r.hourly], [tr('Daily'), r.daily], [tr('Weekly'), r.weekly], [tr('Every 2 weeks'), r.fortnight], [tr('Twice a month'), r.half], ['Monthly', r.monthly], ['Yearly', r.yearly]]
                        .map(function (p) { return { l: p[0], v: p[1], places: 2 }; }),
                    note: tr('{hours} hours over {days} days a week, {weeks} weeks a year{v}', { hours: local(String(n.hours)), days: local(String(n.days)), weeks: local(String(n.weeks)), v: (n.ot ? tr('; each but Hourly with {ot} hours of overtime a week, at {otx} × the hourly.', { ot: local(String(n.ot)), otx: local(String(n.otx)) }) : '.') })
                };
            }

            // a bill with its tip, split among people, rounded up if you like
            function runTip(n, raw) {
                var none = [{ l: 'Tip', v: NaN }, { l: 'Total', v: NaN }, { l: 'Each', v: NaN }], r, why, way = +raw.round;
                if (!raw.bill || [n.bill, n.pct, n.people].some(isNaN)) return { rows: none };
                r = CalcMaths.tip(n.bill, n.pct, n.people, way);
                why = { bill: tr('The bill is 0 or more.'), tip: tr('The tip is 0% or more.'), people: tr('People are a whole number from 1 to 10000.') }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                return {
                    rows: [{ l: 'Tip', v: r.tip, places: 2 }, { l: 'Total', v: r.total, places: 2 }].concat(n.people > 1 ? [{ l: 'Each', v: r.each, places: 2 }, { l: 'Tip each', v: r.tipEach, places: 2 }] : [],
                        way ? [{ l: 'Tip %', v: r.percent, dp: 2 }] : []),
                    note: r.more ? trn(r.more, '{each} each comes a cent short: one pays {more}.', '{each} each comes {n} cents short: {n} pay {more}.', { each: cents(r.cents), more: cents(r.cents + 0.01) }) :
                        way ? (way === 1 ? tr('Rounded up so each pays a whole amount: Tip % is the tip then.') : tr('Rounded up so the total is a whole amount: Tip % is the tip then.')) : ''
                };
            }

            var FUEL_UNITS = ['L/100 km', 'km/L', 'MPG US', 'MPG UK'];

            // the fuel a trip takes and what it costs, split among people
            function runFuel(n, raw) {
                var unit = +raw.unit, mi = unit > 1, none = [{ l: 'Fuel', v: NaN }, { l: 'Cost', v: NaN }, { l: 'Each', v: NaN }], r, why;
                if (!raw.d || !raw.e || !raw.p || [n.d, n.e, n.p, n.people].some(isNaN)) return { rows: none };
                r = CalcMaths.fuel(n.d, n.e, n.p, unit, n.people);
                why = { distance: tr('The distance is 0 or more.'), economy: tr('The economy is above 0.'), price: tr('The price is 0 or more.'), people: tr('People are a whole number from 1 to 10000.') }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                return {
                    rows: [{ l: unit === 2 ? 'Fuel, gal' : 'Fuel, L', v: r.fuel, dp: 2 }, { l: 'Cost', v: r.cost, places: 2 }, { l: mi ? 'A mile' : 'A km', v: r.per, places: 3 }, { l: 'There and back', v: CalcMaths.round(2 * r.cost), places: 2 }]
                        .concat(n.people > 1 ? [{ l: 'Each', v: r.each, places: 2 }] : [], unit ? [{ l: 'L/100 km', v: r.l100, dp: 1 }] : [{ l: 'MPG US', v: r.mpg, dp: 1 }]),
                    note: unit === 3 ? tr('A UK gallon is {l} L; the price a litre, as it is sold.', { l: local('4.54609') }) : unit === 2 ? tr('A US gallon is {l} L.', { l: local('3.785411784') }) : ''
                };
            }

            // a bond's price of its yield, or its yield of its price, with what more it has
            function runBond(n, raw) {
                var none = [{ l: raw.price && !raw.yld ? 'Yield %' : 'Price', v: NaN }], r, why;
                if (raw.price && raw.yld) return { rows: none, warn: true, note: 'Leave one of Price and Yield empty, the one to work out.' };
                if (!raw.coupon || !raw.years || (!raw.price && !raw.yld) || [n.face, n.coupon, n.years, n.freq].some(isNaN) || (raw.price && isNaN(n.price)) || (raw.yld && isNaN(n.yld))) {
                    return { rows: none };
                }
                r = CalcMaths.bond(n.face, n.coupon, n.years, n.freq, raw.price ? n.price : NaN, raw.yld ? n.yld : NaN);
                why = {
                    face: tr('The face value is above 0.'),
                    coupon: tr('The coupon is 0% or more.'),
                    years: tr('Years are above 0.'),
                    freq: tr('Coupons a year are a whole number from 1 to 12.'),
                    yield: tr('The yield a period, the yield a year ÷ coupons a year, is above –100%.'),
                    price: tr('The price is above 0, of a yield a period above –99.99%.'),
                    long: tr('Up to 100000 coupons.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                return {
                    rows: (raw.price ? [{ l: 'Yield %', v: r.yld, dp: 2 }, { l: 'Price', v: r.price, places: 2 }] : [{ l: 'Price', v: r.price, places: 2 }, { l: 'Yield %', v: r.yld, dp: 2 }])
                        .concat([{ l: 'Current yield %', v: r.current, dp: 2 }, { l: 'Duration', v: r.duration, dp: 2 }, { l: 'Modified duration', v: r.modified, dp: 2 }],
                            r.accrued ? [{ l: 'Accrued', v: r.accrued, places: 2 }, { l: 'Dirty price', v: r.dirty, places: 2 }] : [],
                            n.years * n.freq <= 2000 && r.yld > -50 ? drawnTile(graphDrawing('Its price at each yield', r.yld < 0 ? 2 * r.yld : 0, Math.max(2 * r.yld, r.yld + 4, 2 * n.coupon), {
                                fs: [function (y) { return CalcMaths.bond(n.face, n.coupon, n.years, n.freq, NaN, y).price; }], dots: [[r.yld, r.price]], marks: [[n.coupon, tr('Coupon')]] })) : []),
                    note: tr('Duration in years, Macaulay\'s; the modified one is how much the price falls, as a percentage, for each 1% more yield.{v}', { v: (r.accrued ? tr(' The next coupon is nearer than a whole period: the price is without the interest earned since the last one, the dirty price with it.') : '') })
                };
            }

            // what an asset loses each year, by the straight line or the declining balance
            function runDepreciation(n, raw) {
                var none = [{ l: tr('First year'), v: NaN }, { l: tr('A year %'), v: NaN }, { l: tr('In all'), v: NaN }], r, why;
                if (!raw.cost || !raw.life || [n.cost, n.salvage, n.life].some(isNaN)) return { rows: none };
                r = CalcMaths.depreciation(n.cost, n.salvage, n.life, raw.way === '1');
                why = {
                    cost: tr('The cost is above 0.'),
                    salvage: tr('The salvage value is 0 or more, and no more than the cost.'),
                    life: tr('Years are a whole number from 1 to 1000.')
                }[r.error];
                if (why) return { rows: none, warn: true, note: why };
                return {
                    rows: [{ l: tr('First year'), v: r.first, places: 2 }, { l: tr('A year %'), v: r.rate, dp: 2 }, { l: tr('In all'), v: CalcMaths.round(n.cost - n.salvage), places: 2 },
                        { l: tr('Each year'), m: r.byYear, head: [tr('Year'), tr('Depreciation'), tr('So far'), tr('Book value')], places: 2 }],
                    note: raw.way === '1' ? tr('Each year {rate}% of what is left, until the straight line over the years left loses more; never below the salvage value.', { rate: local(String(r.rate)) }) :
                        tr('The same each year: the cost less the salvage value, over the years.')
                };
            }

            // how many must be sold to cover the fixed costs and the profit
            function runBreakEven(n, raw) {
                var none = [{ l: 'Units', v: NaN }, { l: 'Sales', v: NaN }, { l: 'Margin each', v: NaN }], r;
                if (!raw.fixed || !raw.price || !raw.cost || [n.fixed, n.price, n.cost, n.profit].some(isNaN)) return { rows: none };
                r = CalcMaths.breakEven(n.fixed, n.price, n.cost, n.profit);
                if (r.error) return { rows: none, warn: true, note: 'The price is above the cost of each one, or no number of them is enough.' };
                return {
                    rows: [{ l: 'Units', v: r.units, dp: 2 }, { l: 'Sales', v: r.sales, places: 2 }, { l: 'Margin each', v: r.margin, places: 2 }, { l: 'Margin %', v: r.percent, dp: 2 }]
                        .concat(r.units > 0 ? drawnTile(graphDrawing('What they sell for, and what they cost', 0, 2 * r.units, { fs: [function (q) { return n.price * q; }, function (q) { return n.fixed + n.cost * q; }],
                            dots: [[r.units, r.sales]] })) : []),
                    note: r.units > 0 && r.units % 1 ? tr('{units} whole units cover them.', { units: local(String(Math.ceil(r.units - 1e-9))) }) : ''
                };
            }

            // an amount brought on by inflation, and back
            function runInflation(n, raw) {
                var none = [{ l: 'Costs then', v: NaN }, { l: 'Worth now', v: NaN }, { l: 'Prices ×', v: NaN }], r;
                if (!raw.amount || !raw.rate || !raw.years || [n.amount, n.rate, n.years].some(isNaN)) return { rows: none };
                r = CalcMaths.inflation(n.amount, n.rate, n.years);
                if (r.error) return { rows: none, warn: true, note: 'The rate is above –100%.' };
                return {
                    rows: [{ l: 'Costs then', v: r.then, places: 2 }, { l: 'Worth now', v: r.now, places: 2 }, { l: 'Prices ×', v: r.factor, sig: 4 }, { l: 'Value lost %', v: r.lost, dp: 2 }]
                        .concat(n.years > 0 ? drawnTile(graphDrawing('What it costs, and what it is worth, over the years', 0, n.years, { fs: [function (t) { return n.amount * Math.pow(1 + n.rate / 100, t); },
                            function (t) { return n.amount / Math.pow(1 + n.rate / 100, t); }] })) : []),
                    note: 'What costs the amount now costs Costs then after the years; the amount then is worth Worth now in money of today.'
                };
            }

            // the change from a to b, and as percentages
            function runChange(n, raw) {
                var r;
                if (!raw.a || !raw.b || isNaN(n.a) || isNaN(n.b)) return { rows: [{ l: 'Change', v: NaN }, { l: 'Change %', v: NaN }, { l: 'Margin %', v: NaN }] };
                r = CalcMaths.percentChange(n.a, n.b);
                return {
                    rows: [{ l: 'Change', v: r.change }, { l: 'Change %', v: r.percent, dp: 2 }, { l: 'Margin %', v: r.margin, dp: 2 }, { l: 'To ÷ From', v: r.ratio, sig: 4 }],
                    note: !n.a ? 'No percentage of a From of 0.' : 'Of a cost and its price, Change % is the markup, and Margin % the profit as a percentage of the price.'
                };
            }

            // APR to APY, or back, of m periods a year, and the rate a period
            function runRates(n, raw) {
                var none = [{ l: 'APR %', v: NaN }, { l: 'APY %', v: NaN }, { l: 'A period %', v: NaN }], apr, apy;
                if (raw.apr && raw.apy) return { rows: none, warn: true, note: 'Leave one of APR and APY empty, the one to work out.' };
                if ((!raw.apr && !raw.apy) || isNaN(n.m) || (raw.apr && isNaN(n.apr)) || (raw.apy && isNaN(n.apy))) return { rows: none };
                if (!(n.m > 0)) return { rows: none, warn: true, note: 'm, the periods a year, is above 0.' };
                apr = raw.apr ? n.apr : CalcMaths.nominalRate(n.apy, n.m);
                apy = raw.apy ? n.apy : CalcMaths.effectiveRate(n.apr, n.m);
                if (isNaN(apr) || isNaN(apy)) return { rows: none, warn: true, note: raw.apr ? 'The rate a period, APR ÷ m, is above –100%.' : 'APY is above –100%.' };
                return {
                    rows: drawnTile(apr > -100 && apr ? graphDrawing('APY against how often a year, by its log; all the time thin', 0, Math.log10(365), {
                        fs: [function (x) { return CalcMaths.effectiveRate(apr, Math.pow(10, x)); }, function () { return CalcMaths.effectiveRate(apr, Infinity); }],
                        y: CalcMaths.effectiveRate(apr, Infinity) > apr ? [apr - 0.15 * (CalcMaths.effectiveRate(apr, Infinity) - apr), CalcMaths.effectiveRate(apr, Infinity) + 0.6 * (CalcMaths.effectiveRate(apr, Infinity) - apr)] : undefined, marks: [[Math.log10(12), '12'], [Math.log10(365), '365']], dots: n.m === Infinity ? [] : [[Math.log10(Math.min(365, n.m)), apy]],
                        names: ['', 'APY %'] }) : '', 'APY and how often').concat([{ l: 'APR %', v: apr, dp: 2 }, { l: 'APY %', v: apy, dp: 2 }, { l: 'A period %', v: n.m === Infinity ? NaN : CalcMaths.round(apr / n.m), sig: 4 }]),
                    note: n.m === Infinity ? 'Interest all the time: APY is e to the APR, less 1.' : tr('Interest {m} times a year, of APR ÷ m each time.', { m: local(String(n.m)) })
                };
            }

    };
})(typeof window !== 'undefined' ? window : this);
