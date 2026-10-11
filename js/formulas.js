// The formulas and constants of the f(x) panel.
// A formula: t its name, f how it is written (HTML), d what it gives, v its letters
// ([key, as written, what it stands for]), x the equation it puts into the calculator,
// a {key} for each letter, and ex an example: the letters' values and what they give.
// deg: its angles are in degrees in the example; they go in the unit in use. rad: the
// letters it takes in radians, turned into them from degrees while Deg is in use.
// no: why values can give no answer, said in place of the calculator's Error; before it, the
// letters that cannot be 0 (zero), must be above 0 (pos) or cannot be below 0 (neg) are checked;
// a letter with its own words is [letter, what to say].
// A constant: s its symbol, t its name, v its value, u its unit, d a note.
// Constants of physics: CODATA 2022 (physics.nist.gov/constants)
(function (root) {
    'use strict';

    var formulas = [
        {
            c: 'Algebra', list: [
                {
                    t: 'Quadratic formula (+)', f: 'x = (−b + √(b<sup>2</sup> − 4ac)) ÷ 2a',
                    d: 'One root of ax<sup>2</sup> + bx + c = 0. The other root has − before the √.',
                    v: [['a', 'a', 'x² coefficient'], ['b', 'b', 'x coefficient'], ['c', 'c', 'constant']],
                    x: '(-{b}+sqrt({b}²-4*{a}*{c}))/(2*{a})', ex: [[1, -3, -4], 4],
                    no: 'No real roots: b² − 4ac is below 0.',
                    zero: ['a']
                },
                {
                    t: 'Quadratic formula (−)', f: 'x = (−b − √(b<sup>2</sup> − 4ac)) ÷ 2a',
                    d: 'The other root of ax<sup>2</sup> + bx + c = 0.',
                    v: [['a', 'a', 'x² coefficient'], ['b', 'b', 'x coefficient'], ['c', 'c', 'constant']],
                    x: '(-{b}-sqrt({b}²-4*{a}*{c}))/(2*{a})', ex: [[1, -3, -4], -1],
                    no: 'No real roots: b² − 4ac is below 0.',
                    zero: ['a']
                },
                {
                    t: 'Pythagorean theorem', f: 'c = √(a<sup>2</sup> + b<sup>2</sup>)',
                    d: 'The longest side of a right triangle, from the two sides at the right angle.',
                    v: [['a', 'a', 'side'], ['b', 'b', 'side']],
                    x: 'sqrt({a}²+{b}²)', ex: [[3, 4], 5]
                },
                {
                    t: 'Distance between two points', f: 'd = √((x<sub>2</sub> − x<sub>1</sub>)<sup>2</sup> + (y<sub>2</sub> − y<sub>1</sub>)<sup>2</sup>)',
                    d: 'The straight distance from point (x<sub>1</sub>, y<sub>1</sub>) to point (x<sub>2</sub>, y<sub>2</sub>).',
                    v: [['x1', 'x<sub>1</sub>', 'first point x'], ['y1', 'y<sub>1</sub>', 'first point y'],
                        ['x2', 'x<sub>2</sub>', 'second point x'], ['y2', 'y<sub>2</sub>', 'second point y']],
                    x: 'sqrt(({x2}-{x1})²+({y2}-{y1})²)', ex: [[1, 2, 4, 6], 5]
                },
                {
                    t: 'Slope of a line', f: 'm = (y<sub>2</sub> − y<sub>1</sub>) ÷ (x<sub>2</sub> − x<sub>1</sub>)',
                    d: 'How steep the line through two points is: how much y grows for each step of x.',
                    v: [['x1', 'x<sub>1</sub>', 'first point x'], ['y1', 'y<sub>1</sub>', 'first point y'],
                        ['x2', 'x<sub>2</sub>', 'second point x'], ['y2', 'y<sub>2</sub>', 'second point y']],
                    x: '({y2}-{y1})/({x2}-{x1})', ex: [[1, 2, 4, 6], 1.333333333],
                    no: 'The line is upright, x₁ = x₂: its slope has no value.'
                },
                {
                    t: 'Percentage change', f: '% = (new − old) ÷ old × 100',
                    d: 'How much a value grew, in percent; below 0 when it fell.',
                    v: [['o', 'old', 'value before'], ['n', 'new', 'value after']],
                    x: '({n}-{o})/{o}*100', ex: [[80, 100], 25],
                    no: 'The old value cannot be 0.',
                    zero: ['o']
                },
                {
                    t: 'Arithmetic series', f: 'S = n ÷ 2 × (2a + (n − 1)d)',
                    d: 'The sum of n terms that grow by the same step: a, a + d, a + 2d …',
                    v: [['n', 'n', 'number of terms'], ['a', 'a', 'first term'], ['d', 'd', 'step']],
                    x: '{n}/2*(2*{a}+({n}-1)*{d})', ex: [[10, 1, 1], 55]
                },
                {
                    t: 'Geometric series', f: 'S = a(1 − r<sup>n</sup>) ÷ (1 − r)',
                    d: 'The sum of n terms that grow by the same factor: a, ar, ar<sup>2</sup> …',
                    v: [['a', 'a', 'first term'], ['r', 'r', 'factor, not 1'], ['n', 'n', 'number of terms']],
                    x: '{a}*(1-{r}^{n})/(1-{r})', ex: [[1, 2, 10], 1023],
                    no: 'r cannot be 1: then the sum is a × n.'
                },
                {
                    t: 'Logarithm to any base', f: 'log<sub>b</sub> x = ln x ÷ ln b',
                    d: 'The power b must be raised to, to give x.',
                    v: [['x', 'x', 'number'], ['b', 'b', 'base']],
                    x: 'ln({x})/ln({b})', ex: [[8, 2], 3],
                    no: 'x and b must be above 0, and b cannot be 1.',
                    pos: ['x', 'b']
                },
                {
                    t: 'Exponential growth', f: 'N = N<sub>0</sub>(1 + r ÷ 100)<sup>t</sup>',
                    d: 'An amount that grows by the same percent each period.',
                    v: [['N0', 'N<sub>0</sub>', 'starting amount'], ['r', 'r', 'growth per period, in %'], ['t', 't', 'periods']],
                    x: '{N0}*(1+{r}/100)^{t}', ex: [[100, 10, 2], 121]
                },
                {
                    t: 'Half-life decay', f: 'N = N<sub>0</sub> × ½<sup>t ÷ T</sup>',
                    d: 'What is left of an amount that halves every T, after a time t.',
                    v: [['N0', 'N<sub>0</sub>', 'starting amount'], ['t', 't', 'time passed'], ['T', 'T', 'half-life, in the unit of t']],
                    x: '{N0}*0.5^({t}/{T})', ex: [[100, 10, 5], 25],
                    zero: ['T']
                }
            ]
        },
        {
            c: 'Geometry', list: [
                {
                    t: 'Area of a circle', f: 'A = πr<sup>2</sup>',
                    d: 'The area inside a circle.',
                    v: [['r', 'r', 'radius']],
                    x: 'pi*{r}²', ex: [[5], 78.53981634]
                },
                {
                    t: 'Circumference of a circle', f: 'C = 2πr',
                    d: 'The length around a circle.',
                    v: [['r', 'r', 'radius']],
                    x: '2*pi*{r}', ex: [[5], 31.41592654]
                },
                {
                    t: 'Area of a triangle', f: 'A = ½bh',
                    d: 'From a side and the height on it.',
                    v: [['b', 'b', 'base'], ['h', 'h', 'height']],
                    x: '0.5*{b}*{h}', ex: [[6, 4], 12]
                },
                {
                    t: 'Heron\'s formula', f: 'A = √(s(s − a)(s − b)(s − c))',
                    d: 'The area of a triangle from its three sides; s is half the perimeter.',
                    v: [['a', 'a', 'side'], ['b', 'b', 'side'], ['c', 'c', 'side']],
                    x: '0.25*sqrt(({a}+{b}+{c})*(-{a}+{b}+{c})*({a}-{b}+{c})*({a}+{b}-{c}))', ex: [[3, 4, 5], 6],
                    no: 'These sides make no triangle: each must be shorter than the other two together.'
                },
                {
                    t: 'Area of a trapezoid', f: 'A = ½(a + b)h',
                    d: 'From its two parallel sides and the height between them.',
                    v: [['a', 'a', 'parallel side'], ['b', 'b', 'parallel side'], ['h', 'h', 'height']],
                    x: '0.5*({a}+{b})*{h}', ex: [[3, 5, 4], 16]
                },
                {
                    t: 'Area of an ellipse', f: 'A = πab',
                    d: 'From its two half axes.',
                    v: [['a', 'a', 'half the long axis'], ['b', 'b', 'half the short axis']],
                    x: 'pi*{a}*{b}', ex: [[3, 2], 18.84955592]
                },
                {
                    t: 'Volume of a sphere', f: 'V = 4/3 πr<sup>3</sup>',
                    d: 'The space inside a ball.',
                    v: [['r', 'r', 'radius']],
                    x: '4/3*pi*{r}³', ex: [[3], 113.0973355]
                },
                {
                    t: 'Surface of a sphere', f: 'A = 4πr<sup>2</sup>',
                    d: 'The area of the outside of a ball.',
                    v: [['r', 'r', 'radius']],
                    x: '4*pi*{r}²', ex: [[3], 113.0973355]
                },
                {
                    t: 'Volume of a cylinder', f: 'V = πr<sup>2</sup>h',
                    d: 'The space inside a can.',
                    v: [['r', 'r', 'radius'], ['h', 'h', 'height']],
                    x: 'pi*{r}²*{h}', ex: [[2, 5], 62.83185307]
                },
                {
                    t: 'Volume of a cone', f: 'V = ⅓πr<sup>2</sup>h',
                    d: 'A third of the cylinder with the same base and height.',
                    v: [['r', 'r', 'radius'], ['h', 'h', 'height']],
                    x: '1/3*pi*{r}²*{h}', ex: [[3, 4], 37.69911184]
                },
                {
                    t: 'Surface of a cylinder', f: 'A = 2πr(r + h)',
                    d: 'The area of the outside of a can, its top and bottom included.',
                    v: [['r', 'r', 'radius'], ['h', 'h', 'height']],
                    x: '2*pi*{r}*({r}+{h})', ex: [[2, 5], 87.9645943]
                },
                {
                    t: 'Volume of a pyramid', f: 'V = ⅓Bh',
                    d: 'A third of the prism with the same base and height; any shape of base.',
                    v: [['B', 'B', 'base area'], ['h', 'h', 'height']],
                    x: '1/3*{B}*{h}', ex: [[9, 4], 12]
                },
                {
                    t: 'Area of a sector', f: 'A = ½r<sup>2</sup>θ',
                    d: 'The area of a slice of a circle, θ the angle of the slice.',
                    v: [['r', 'r', 'radius'], ['q', 'θ', 'angle of the slice']],
                    x: '0.5*{r}²*{q}', ex: [[2, 90], 3.141592654], deg: true, rad: ['q']
                },
                {
                    t: 'Arc length', f: 's = rθ',
                    d: 'The length of a piece of a circle, θ the angle it spans.',
                    v: [['r', 'r', 'radius'], ['q', 'θ', 'angle it spans']],
                    x: '{r}*{q}', ex: [[2, 90], 3.141592654], deg: true, rad: ['q']
                }
            ]
        },
        {
            c: 'Trigonometry', list: [
                {
                    t: 'Law of cosines', f: 'c = √(a<sup>2</sup> + b<sup>2</sup> − 2ab cos C)',
                    d: 'The third side of any triangle, from two sides and the angle between them.',
                    v: [['a', 'a', 'side'], ['b', 'b', 'side'], ['C', 'C', 'angle between them']],
                    x: 'sqrt({a}²+{b}²-2*{a}*{b}*cos({C}))', ex: [[3, 4, 90], 5], deg: true
                },
                {
                    t: 'Law of sines', f: 'a = b sin A ÷ sin B',
                    d: 'A side of any triangle, from another side and the angles across from the two.',
                    v: [['b', 'b', 'known side'], ['A', 'A', 'angle across from a'], ['B', 'B', 'angle across from b']],
                    x: '{b}*sin({A})/sin({B})', ex: [[10, 30, 90], 5], deg: true,
                    no: 'Angle B cannot be 0 or 180°.'
                },
                {
                    t: 'Area from two sides', f: 'A = ½ab sin C',
                    d: 'The area of a triangle from two sides and the angle between them.',
                    v: [['a', 'a', 'side'], ['b', 'b', 'side'], ['C', 'C', 'angle between them']],
                    x: '0.5*{a}*{b}*sin({C})', ex: [[3, 4, 30], 3], deg: true
                },
                {
                    t: 'Degrees to radians', f: 'rad = deg × π ÷ 180',
                    d: 'An angle in degrees, in radians.',
                    v: [['d', 'deg', 'angle in degrees']],
                    x: '{d}*pi/180', ex: [[180], 3.141592654]
                },
                {
                    t: 'Radians to degrees', f: 'deg = rad × 180 ÷ π',
                    d: 'An angle in radians, in degrees.',
                    v: [['r', 'rad', 'angle in radians']],
                    x: '{r}*180/pi', ex: [[1], 57.29577951]
                },
                {
                    t: 'Polar to rectangular: x', f: 'x = r cos θ',
                    d: 'How far right a point is, from its distance r to the origin and its angle θ.',
                    v: [['r', 'r', 'distance to the origin'], ['q', 'θ', 'angle from the x axis']],
                    x: '{r}*cos({q})', ex: [[2, 60], 1], deg: true
                },
                {
                    t: 'Polar to rectangular: y', f: 'y = r sin θ',
                    d: 'How far up a point is, from its distance r to the origin and its angle θ.',
                    v: [['r', 'r', 'distance to the origin'], ['q', 'θ', 'angle from the x axis']],
                    x: '{r}*sin({q})', ex: [[2, 30], 1], deg: true
                },
                {
                    t: 'Rectangular to polar: r', f: 'r = √(x<sup>2</sup> + y<sup>2</sup>)',
                    d: 'The distance of point (x, y) to the origin.',
                    v: [['x', 'x', 'x of the point'], ['y', 'y', 'y of the point']],
                    x: 'sqrt({x}²+{y}²)', ex: [[3, 4], 5]
                },
                {
                    t: 'Rectangular to polar: θ', f: 'θ = tan<sup>−1</sup>(y ÷ x)',
                    d: 'The angle of point (x, y) from the x axis, in the unit in use; for a point right of the y axis (x &gt; 0).',
                    v: [['x', 'x', 'x of the point'], ['y', 'y', 'y of the point']],
                    x: 'atan({y}/{x})', ex: [[1, 1], 45], deg: true,
                    no: 'x cannot be 0: the point is straight above or below the origin, at 90° or −90°.',
                    zero: ['x']
                }
            ]
        },
        {
            c: 'Motion and forces', list: [
                {
                    t: 'Speed', f: 'v = d ÷ t',
                    d: 'The distance covered in each unit of time.',
                    v: [['d', 'd', 'distance (m)'], ['t', 't', 'time (s)']],
                    x: '{d}/{t}', ex: [[100, 8], 12.5],
                    zero: ['t']
                },
                {
                    t: 'Final velocity', f: 'v = u + at',
                    d: 'The speed after speeding up evenly for a time.',
                    v: [['u', 'u', 'starting speed (m/s)'], ['a', 'a', 'acceleration (m/s²)'], ['t', 't', 'time (s)']],
                    x: '{u}+{a}*{t}', ex: [[2, 3, 4], 14]
                },
                {
                    t: 'Distance under acceleration', f: 's = ut + ½at<sup>2</sup>',
                    d: 'How far it goes while speeding up evenly.',
                    v: [['u', 'u', 'starting speed (m/s)'], ['a', 'a', 'acceleration (m/s²)'], ['t', 't', 'time (s)']],
                    x: '{u}*{t}+0.5*{a}*{t}²', ex: [[2, 3, 4], 32]
                },
                {
                    t: 'Velocity after a distance', f: 'v = √(u<sup>2</sup> + 2as)',
                    d: 'The speed after speeding up evenly over a distance.',
                    v: [['u', 'u', 'starting speed (m/s)'], ['a', 'a', 'acceleration (m/s²)'], ['s', 's', 'distance (m)']],
                    x: 'sqrt({u}²+2*{a}*{s})', ex: [[0, 9.8, 10], 14],
                    no: 'It stops before that distance: u² + 2as is below 0.'
                },
                {
                    t: 'Newton\'s second law', f: 'F = ma',
                    d: 'The force it takes to give a mass an acceleration.',
                    v: [['m', 'm', 'mass (kg)'], ['a', 'a', 'acceleration (m/s²)']],
                    x: '{m}*{a}', ex: [[10, 9.8], 98]
                },
                {
                    t: 'Weight', f: 'W = mg',
                    d: 'The force of gravity on a mass on Earth, in newtons; g = 9.80665 m/s².',
                    v: [['m', 'm', 'mass (kg)']],
                    x: '{m}*9.80665', ex: [[10], 98.0665]
                },
                {
                    t: 'Momentum', f: 'p = mv',
                    d: 'Mass times velocity.',
                    v: [['m', 'm', 'mass (kg)'], ['v', 'v', 'speed (m/s)']],
                    x: '{m}*{v}', ex: [[2, 3], 6]
                },
                {
                    t: 'Kinetic energy', f: 'E = ½mv<sup>2</sup>',
                    d: 'The energy of a moving mass, in joules.',
                    v: [['m', 'm', 'mass (kg)'], ['v', 'v', 'speed (m/s)']],
                    x: '0.5*{m}*{v}²', ex: [[2, 3], 9]
                },
                {
                    t: 'Potential energy', f: 'E = mgh',
                    d: 'The energy of a mass lifted to a height, in joules; g = 9.80665 m/s².',
                    v: [['m', 'm', 'mass (kg)'], ['h', 'h', 'height (m)']],
                    x: '{m}*9.80665*{h}', ex: [[2, 10], 196.133]
                },
                {
                    t: 'Work', f: 'W = Fd cos θ',
                    d: 'The energy a force gives over a distance, θ between the force and the way it moves.',
                    v: [['F', 'F', 'force (N)'], ['d', 'd', 'distance (m)'], ['q', 'θ', 'angle']],
                    x: '{F}*{d}*cos({q})', ex: [[10, 5, 60], 25], deg: true
                },
                {
                    t: 'Power', f: 'P = W ÷ t',
                    d: 'Work done in each second, in watts.',
                    v: [['W', 'W', 'work (J)'], ['t', 't', 'time (s)']],
                    x: '{W}/{t}', ex: [[100, 4], 25],
                    zero: ['t']
                },
                {
                    t: 'Centripetal force', f: 'F = mv<sup>2</sup> ÷ r',
                    d: 'The force that keeps a mass on a circle.',
                    v: [['m', 'm', 'mass (kg)'], ['v', 'v', 'speed (m/s)'], ['r', 'r', 'radius (m)']],
                    x: '{m}*{v}²/{r}', ex: [[2, 3, 1.5], 12],
                    zero: ['r']
                },
                {
                    t: 'Hooke\'s law', f: 'F = kx',
                    d: 'The force of a spring stretched or pressed by x.',
                    v: [['k', 'k', 'spring constant (N/m)'], ['x', 'x', 'stretch (m)']],
                    x: '{k}*{x}', ex: [[200, 0.1], 20]
                },
                {
                    t: 'Pendulum period', f: 'T = 2π√(L ÷ g)',
                    d: 'The time of one swing back and forth, for small swings; g = 9.80665 m/s².',
                    v: [['L', 'L', 'length (m)']],
                    x: '2*pi*sqrt({L}/9.80665)', ex: [[1], 2.006409],
                    neg: ['L']
                },
                {
                    t: 'Universal gravitation', f: 'F = Gm<sub>1</sub>m<sub>2</sub> ÷ r<sup>2</sup>',
                    d: 'The pull between two masses; G = 6.6743 × 10<sup>−11</sup>.',
                    v: [['m1', 'm<sub>1</sub>', 'mass (kg)'], ['m2', 'm<sub>2</sub>', 'mass (kg)'], ['r', 'r', 'distance (m)']],
                    x: '6.6743E-11*{m1}*{m2}/{r}²', ex: [[5.9722e24, 1, 6.371e6], 9.820302293],
                    zero: ['r']
                },
                {
                    t: 'Free-fall time', f: 't = √(2h ÷ g)',
                    d: 'How long a drop from a height takes, without air; g = 9.80665 m/s².',
                    v: [['h', 'h', 'height (m)']],
                    x: 'sqrt(2*{h}/9.80665)', ex: [[20], 2.019619977],
                    neg: ['h']
                },
                {
                    t: 'Projectile range', f: 'R = v<sup>2</sup> sin 2θ ÷ g',
                    d: 'How far a throw goes on flat ground, without air; g = 9.80665 m/s².',
                    v: [['v', 'v', 'launch speed (m/s)'], ['q', 'θ', 'launch angle']],
                    x: '{v}²*sin(2*{q})/9.80665', ex: [[20, 45], 40.78864852], deg: true
                },
                {
                    t: 'Escape velocity', f: 'v = √(2GM ÷ r)',
                    d: 'The speed it takes to leave a planet or star for good; G = 6.6743 × 10<sup>−11</sup>.',
                    v: [['M', 'M', 'its mass (kg)'], ['r', 'r', 'distance from its center (m)']],
                    x: 'sqrt(2*6.6743E-11*{M}/{r})', ex: [[5.9722e24, 6.371e6], 11186.1652],
                    zero: ['r'], pos: ['M', 'r']
                },
                {
                    t: 'Orbital speed', f: 'v = √(GM ÷ r)',
                    d: 'The speed of a circular orbit; G = 6.6743 × 10<sup>−11</sup>.',
                    v: [['M', 'M', 'mass orbited (kg)'], ['r', 'r', 'distance from its center (m)']],
                    x: 'sqrt(6.6743E-11*{M}/{r})', ex: [[5.9722e24, 6.771e6], 7672.618887],
                    zero: ['r'], pos: ['M', 'r']
                }
            ]
        },
        {
            c: 'Matter and energy', list: [
                {
                    t: 'Mass–energy', f: 'E = mc<sup>2</sup>',
                    d: 'The energy in a mass, in joules; c = 299,792,458 m/s.',
                    v: [['m', 'm', 'mass (kg)']],
                    x: '{m}*299792458²', ex: [[1], 8.987551787e16]
                },
                {
                    t: 'Density', f: 'ρ = m ÷ V',
                    d: 'Mass in each unit of volume.',
                    v: [['m', 'm', 'mass (kg)'], ['V', 'V', 'volume (m³)']],
                    x: '{m}/{V}', ex: [[10, 2], 5],
                    zero: ['V']
                },
                {
                    t: 'Pressure', f: 'P = F ÷ A',
                    d: 'Force on each unit of area, in pascals.',
                    v: [['F', 'F', 'force (N)'], ['A', 'A', 'area (m²)']],
                    x: '{F}/{A}', ex: [[100, 0.5], 200],
                    zero: ['A']
                },
                {
                    t: 'Pressure under water', f: 'P = ρgh',
                    d: 'The pressure of a liquid at a depth, in pascals, the air above not included; g = 9.80665 m/s².',
                    v: [['p', 'ρ', 'density (kg/m³), 1000 for water'], ['h', 'h', 'depth (m)']],
                    x: '{p}*9.80665*{h}', ex: [[1000, 10], 98066.5]
                },
                {
                    t: 'Buoyancy', f: 'F = ρVg',
                    d: 'The upward push of a liquid on what is in it: the weight of the liquid pushed aside.',
                    v: [['p', 'ρ', 'density (kg/m³), 1000 for water'], ['V', 'V', 'volume under the surface (m³)']],
                    x: '{p}*{V}*9.80665', ex: [[1000, 0.002], 19.6133]
                },
                {
                    t: 'Ideal gas law', f: 'P = nRT ÷ V',
                    d: 'The pressure of a gas, in pascals; R = 8.314462618 J/(mol·K).',
                    v: [['n', 'n', 'amount (mol)'], ['T', 'T', 'temperature (K)'], ['V', 'V', 'volume (m³)']],
                    x: '{n}*8.314462618*{T}/{V}', ex: [[1, 273.15, 0.0224], 101388.1904],
                    zero: ['V']
                },
                {
                    t: 'Heat energy', f: 'Q = mcΔT',
                    d: 'The heat it takes to warm a mass; c is 4186 for water.',
                    v: [['m', 'm', 'mass (kg)'], ['c', 'c', 'specific heat (J/(kg·K))'], ['T', 'ΔT', 'temperature rise (K)']],
                    x: '{m}*{c}*{T}', ex: [[2, 4186, 10], 83720]
                }
            ]
        },
        {
            c: 'Waves and light', list: [
                {
                    t: 'Wave speed', f: 'v = fλ',
                    d: 'How fast a wave travels, from its frequency and wavelength.',
                    v: [['f', 'f', 'frequency (Hz)'], ['l', 'λ', 'wavelength (m)']],
                    x: '{f}*{l}', ex: [[440, 0.78], 343.2]
                },
                {
                    t: 'Period', f: 'T = 1 ÷ f',
                    d: 'The time of one cycle, from the frequency.',
                    v: [['f', 'f', 'frequency (Hz)']],
                    x: '1/{f}', ex: [[50], 0.02],
                    zero: ['f']
                },
                {
                    t: 'Photon energy', f: 'E = hf',
                    d: 'The energy of one photon, in joules; h = 6.62607015 × 10<sup>−34</sup>.',
                    v: [['f', 'f', 'frequency (Hz)']],
                    x: '6.62607015E-34*{f}', ex: [[5e14], 3.313035075e-19]
                },
                {
                    t: 'Snell\'s law', f: 'θ<sub>2</sub> = sin<sup>−1</sup>(n<sub>1</sub> sin θ<sub>1</sub> ÷ n<sub>2</sub>)',
                    d: 'The angle light bends to, going from one material into another.',
                    v: [['n1', 'n<sub>1</sub>', 'index it comes from, 1 for air'], ['q', 'θ<sub>1</sub>', 'angle of incidence'],
                        ['n2', 'n<sub>2</sub>', 'index it goes into, 1.33 for water']],
                    x: 'asin({n1}*sin({q})/{n2})', ex: [[1, 30, 1.5], 19.47122063], deg: true,
                    no: 'The light does not go through: it is all reflected back (total internal reflection).'
                },
                {
                    t: 'Thin lens', f: 'd<sub>i</sub> = 1 ÷ (1/f − 1/d<sub>o</sub>)',
                    d: 'Where a lens makes the image, from 1/f = 1/d<sub>o</sub> + 1/d<sub>i</sub>.',
                    v: [['f', 'f', 'focal length'], ['d', 'd<sub>o</sub>', 'distance of the object']],
                    x: '1/(1/{f}-1/{d})', ex: [[10, 30], 15],
                    no: 'The object is at the focal point, d = f: no image forms.',
                    zero: ['f', 'd']
                },
                {
                    t: 'Sound level', f: 'L = 10 log(I ÷ I<sub>0</sub>)',
                    d: 'Loudness in decibels; I<sub>0</sub> = 10<sup>−12</sup> W/m², the quietest sound heard.',
                    v: [['I', 'I', 'intensity (W/m²)']],
                    x: '10*log({I}/1E-12)', ex: [[1e-6], 60],
                    pos: ['I']
                },
                {
                    t: 'Wien\'s law', f: 'λ = b ÷ T',
                    d: 'The wavelength a hot body shines brightest at; b = 2.897771955 × 10<sup>−3</sup> m·K.',
                    v: [['T', 'T', 'temperature (K)']],
                    x: '2.897771955E-3/{T}', ex: [[5772], 5.020394932e-7],
                    zero: ['T']
                }
            ]
        },
        {
            c: 'Electricity', list: [
                {
                    t: 'Ohm\'s law', f: 'V = IR',
                    d: 'The voltage across a resistance.',
                    v: [['I', 'I', 'current (A)'], ['R', 'R', 'resistance (Ω)']],
                    x: '{I}*{R}', ex: [[2, 10], 20]
                },
                {
                    t: 'Electric power', f: 'P = VI',
                    d: 'Power in watts, from voltage and current.',
                    v: [['V', 'V', 'voltage (V)'], ['I', 'I', 'current (A)']],
                    x: '{V}*{I}', ex: [[230, 2], 460]
                },
                {
                    t: 'Power in a resistance', f: 'P = I<sup>2</sup>R',
                    d: 'The power a resistance turns into heat.',
                    v: [['I', 'I', 'current (A)'], ['R', 'R', 'resistance (Ω)']],
                    x: '{I}²*{R}', ex: [[2, 10], 40]
                },
                {
                    t: 'Resistors in parallel', f: 'R = R<sub>1</sub>R<sub>2</sub> ÷ (R<sub>1</sub> + R<sub>2</sub>)',
                    d: 'The resistance of two resistors side by side.',
                    v: [['a', 'R<sub>1</sub>', 'resistance (Ω)'], ['b', 'R<sub>2</sub>', 'resistance (Ω)']],
                    x: '{a}*{b}/({a}+{b})', ex: [[6, 3], 2],
                    no: 'R₁ + R₂ cannot be 0.'
                },
                {
                    t: 'Capacitors in series', f: 'C = C<sub>1</sub>C<sub>2</sub> ÷ (C<sub>1</sub> + C<sub>2</sub>)',
                    d: 'The capacitance of two capacitors one after the other.',
                    v: [['a', 'C<sub>1</sub>', 'capacitance'], ['b', 'C<sub>2</sub>', 'capacitance']],
                    x: '{a}*{b}/({a}+{b})', ex: [[6, 3], 2],
                    no: 'C₁ + C₂ cannot be 0.'
                },
                {
                    t: 'Charge', f: 'Q = It',
                    d: 'The charge a current carries in a time, in coulombs.',
                    v: [['I', 'I', 'current (A)'], ['t', 't', 'time (s)']],
                    x: '{I}*{t}', ex: [[2, 30], 60]
                },
                {
                    t: 'RC time constant', f: 'τ = RC',
                    d: 'The time a capacitor takes to charge to 63% through a resistance.',
                    v: [['R', 'R', 'resistance (Ω)'], ['C', 'C', 'capacitance (F)']],
                    x: '{R}*{C}', ex: [[1000, 0.001], 1]
                },
                {
                    t: 'Resonant frequency', f: 'f = 1 ÷ (2π√(LC))',
                    d: 'The frequency an LC circuit rings at, in hertz.',
                    v: [['L', 'L', 'inductance (H)'], ['C', 'C', 'capacitance (F)']],
                    x: '1/(2*pi*sqrt({L}*{C}))', ex: [[0.001, 1e-6], 5032.92121],
                    pos: ['L', 'C']
                },
                {
                    t: 'Coulomb\'s law', f: 'F = kq<sub>1</sub>q<sub>2</sub> ÷ r<sup>2</sup>',
                    d: 'The force between two charges; k = 8.9875517862 × 10<sup>9</sup>.',
                    v: [['q1', 'q<sub>1</sub>', 'charge (C)'], ['q2', 'q<sub>2</sub>', 'charge (C)'], ['r', 'r', 'distance (m)']],
                    x: '8.9875517862E9*{q1}*{q2}/{r}²', ex: [[1e-6, 2e-6, 0.1], 1.797510357],
                    zero: ['r']
                },
                {
                    t: 'Energy in a capacitor', f: 'E = ½CV<sup>2</sup>',
                    d: 'The energy a charged capacitor holds, in joules.',
                    v: [['C', 'C', 'capacitance (F)'], ['V', 'V', 'voltage (V)']],
                    x: '0.5*{C}*{V}²', ex: [[0.001, 10], 0.05]
                }
            ]
        },
        {
            c: 'Chemistry', list: [
                {
                    t: 'pH', f: 'pH = −log[H<sup>+</sup>]',
                    d: 'How acid a solution is: below 7 acid, above 7 basic.',
                    v: [['H', '[H<sup>+</sup>]', 'concentration (mol/L)']],
                    x: '-log({H})', ex: [[1e-7], 7],
                    pos: ['H']
                },
                {
                    t: 'Amount of substance', f: 'n = m ÷ M',
                    d: 'Moles in a mass of a substance.',
                    v: [['m', 'm', 'mass (g)'], ['M', 'M', 'molar mass (g/mol)']],
                    x: '{m}/{M}', ex: [[36, 18], 2],
                    zero: ['M']
                },
                {
                    t: 'Molarity', f: 'c = n ÷ V',
                    d: 'The concentration of a solution, in mol/L.',
                    v: [['n', 'n', 'amount (mol)'], ['V', 'V', 'volume (L)']],
                    x: '{n}/{V}', ex: [[0.5, 2], 0.25],
                    zero: ['V']
                },
                {
                    t: 'Dilution', f: 'C<sub>2</sub> = C<sub>1</sub>V<sub>1</sub> ÷ V<sub>2</sub>',
                    d: 'The concentration after adding water, from C<sub>1</sub>V<sub>1</sub> = C<sub>2</sub>V<sub>2</sub>.',
                    v: [['c1', 'C<sub>1</sub>', 'concentration before'], ['v1', 'V<sub>1</sub>', 'volume before'],
                        ['v2', 'V<sub>2</sub>', 'volume after']],
                    x: '{c1}*{v1}/{v2}', ex: [[2, 0.5, 2], 0.5],
                    zero: ['v2']
                }
            ]
        },
        {
            c: 'Statistics', list: [
                {
                    t: 'z-score', f: 'z = (x − μ) ÷ σ',
                    d: 'How many standard deviations a value is above the mean.',
                    v: [['x', 'x', 'value'], ['m', 'μ', 'mean'], ['s', 'σ', 'standard deviation']],
                    x: '({x}-{m})/{s}', ex: [[85, 70, 10], 1.5],
                    zero: ['s']
                },
                {
                    t: 'Standard error', f: 'SE = σ ÷ √n',
                    d: 'How far the mean of a sample of n is likely off the true mean.',
                    v: [['s', 'σ', 'standard deviation'], ['n', 'n', 'sample size']],
                    x: '{s}/sqrt({n})', ex: [[10, 25], 2],
                    pos: ['n']
                }
            ]
        },
        {
            c: 'Money', list: [
                {
                    t: 'Simple interest', f: 'I = Prt',
                    d: 'The interest on an amount, without interest on the interest.',
                    v: [['P', 'P', 'amount'], ['r', 'r', 'rate per year, in %'], ['t', 't', 'years']],
                    x: '{P}*{r}/100*{t}', ex: [[1000, 5, 3], 150]
                },
                {
                    t: 'Compound interest', f: 'A = P(1 + r ÷ n)<sup>nt</sup>',
                    d: 'What an amount grows to when the interest is added n times a year.',
                    v: [['P', 'P', 'amount'], ['r', 'r', 'rate per year, in %'], ['n', 'n', 'times a year'], ['t', 't', 'years']],
                    x: '{P}*(1+{r}/100/{n})^({n}*{t})', ex: [[1000, 5, 12, 10], 1647.009498],
                    zero: ['n']
                },
                {
                    t: 'Continuous compounding', f: 'A = Pe<sup>rt</sup>',
                    d: 'What an amount grows to when the interest is added all the time.',
                    v: [['P', 'P', 'amount'], ['r', 'r', 'rate per year, in %'], ['t', 't', 'years']],
                    x: '{P}*e^({r}/100*{t})', ex: [[1000, 5, 10], 1648.721271]
                },
                {
                    t: 'Loan payment', f: 'M = Pi ÷ (1 − (1 + i)<sup>−n</sup>)',
                    d: 'The monthly payment of a loan; i is the rate per month, n the number of months.',
                    v: [['P', 'P', 'loan'], ['r', 'r', 'rate per year, in %'], ['y', 'y', 'years']],
                    x: '{P}*{r}/1200/(1-(1+{r}/1200)^(-12*{y}))', ex: [[200000, 6, 30], 1199.101050],
                    zero: [['r', 'At 0% there is no interest: the payment is the loan ÷ the months, P ÷ (12 × y).'], 'y']
                },
                {
                    t: 'Present value', f: 'PV = FV ÷ (1 + r)<sup>t</sup>',
                    d: 'What an amount in the future is worth today.',
                    v: [['F', 'FV', 'future amount'], ['r', 'r', 'rate per year, in %'], ['t', 't', 'years']],
                    x: '{F}/(1+{r}/100)^{t}', ex: [[1000, 5, 10], 613.9132535],
                    no: 'The rate cannot be −100%.'
                },
                {
                    t: 'Regular savings', f: 'FV = M((1 + i)<sup>n</sup> − 1) ÷ i',
                    d: 'What a deposit each month grows to; i is the rate per month, n the number of months.',
                    v: [['M', 'M', 'deposit each month'], ['r', 'r', 'rate per year, in %'], ['y', 'y', 'years']],
                    x: '{M}*((1+{r}/1200)^(12*{y})-1)/({r}/1200)', ex: [[100, 6, 10], 16387.93468],
                    zero: [['r', 'At 0% there is no interest: the savings are M × 12 × y.'], 'y']
                },
                {
                    t: 'Growth rate per year (CAGR)', f: 'CAGR = ((end ÷ start)<sup>1/t</sup> − 1) × 100',
                    d: 'The even yearly growth, in %, that takes start to end in t years.',
                    v: [['s', 'start', 'value at the start'], ['e', 'end', 'value at the end'], ['t', 't', 'years']],
                    x: '(({e}/{s})^(1/{t})-1)*100', ex: [[1000, 2000, 5], 14.8698355],
                    no: 'Start and end must be above 0.',
                    zero: ['s', 't']
                },
                {
                    t: 'Rule of 72', f: 'years ≈ 72 ÷ r',
                    d: 'About how many years an amount takes to double.',
                    v: [['r', 'r', 'rate per year, in %']],
                    x: '72/{r}', ex: [[6], 12],
                    zero: ['r']
                }
            ]
        },
        {
            c: 'Everyday', list: [
                {
                    t: 'Percent of a number', f: 'x% of y = x ÷ 100 × y',
                    d: 'A part of a number, in percent.',
                    v: [['x', 'x', 'percent'], ['y', 'y', 'number']],
                    x: '{x}/100*{y}', ex: [[15, 80], 12]
                },
                {
                    t: 'Price after discount', f: 'P × (1 − d ÷ 100)',
                    d: 'A price with a discount in percent taken off.',
                    v: [['P', 'P', 'price'], ['d', 'd', 'discount, in %']],
                    x: '{P}*(1-{d}/100)', ex: [[80, 25], 60]
                },
                {
                    t: 'Price with tax', f: 'P × (1 + t ÷ 100)',
                    d: 'A price with a tax or markup in percent added.',
                    v: [['P', 'P', 'price'], ['t', 't', 'tax, in %']],
                    x: '{P}*(1+{t}/100)', ex: [[100, 20], 120]
                },
                {
                    t: 'Celsius to Fahrenheit', f: '°F = °C × 9 ÷ 5 + 32',
                    d: 'A temperature in °C, in °F.',
                    v: [['c', '°C', 'temperature']],
                    x: '{c}*9/5+32', ex: [[100], 212]
                },
                {
                    t: 'Fahrenheit to Celsius', f: '°C = (°F − 32) × 5 ÷ 9',
                    d: 'A temperature in °F, in °C.',
                    v: [['f', '°F', 'temperature']],
                    x: '({f}-32)*5/9', ex: [[212], 100]
                },
                {
                    t: 'Celsius to kelvin', f: 'K = °C + 273.15',
                    d: 'A temperature in °C, in kelvin.',
                    v: [['c', '°C', 'temperature']],
                    x: '{c}+273.15', ex: [[25], 298.15]
                },
                {
                    t: 'Kelvin to Celsius', f: '°C = K − 273.15',
                    d: 'A temperature in kelvin, in °C.',
                    v: [['k', 'K', 'temperature']],
                    x: '{k}-273.15', ex: [[300], 26.85]
                },
                {
                    t: 'Body mass index', f: 'BMI = m ÷ h<sup>2</sup>',
                    d: 'Weight for height; 18.5 to 25 is the usual range for adults.',
                    v: [['m', 'm', 'weight (kg)'], ['h', 'h', 'height (m)']],
                    x: '{m}/{h}²', ex: [[70, 1.75], 22.85714286],
                    zero: ['h']
                },
                {
                    t: 'Fuel use', f: 'L/100 km = L ÷ km × 100',
                    d: 'Liters used for every 100 km driven.',
                    v: [['l', 'L', 'liters used'], ['k', 'km', 'distance driven']],
                    x: '{l}/{k}*100', ex: [[45, 600], 7.5],
                    zero: ['k']
                },
                {
                    t: 'Pace', f: 'pace = minutes ÷ km',
                    d: 'Minutes for each kilometer; 5.5 is 5 minutes 30 seconds.',
                    v: [['t', 'min', 'time, in minutes'], ['d', 'km', 'distance']],
                    x: '{t}/{d}', ex: [[50, 10], 5],
                    zero: ['d']
                },
                {
                    t: 'Split a bill', f: 'each = bill × (1 + tip ÷ 100) ÷ people',
                    d: 'What each person pays, the tip included.',
                    v: [['b', 'bill', 'the bill'], ['t', 'tip', 'tip, in %'], ['n', 'people', 'how many pay']],
                    x: '{b}*(1+{t}/100)/{n}', ex: [[120, 15, 4], 34.5],
                    zero: ['n']
                }
            ]
        }
    ];

    var constants = [
        {
            c: 'Mathematics', list: [
                { s: 'π', t: 'Pi', v: Math.PI, u: '', d: 'A circle\'s length around, over its width.' },
                { s: 'e', t: 'Euler\'s number', v: Math.E, u: '', d: 'The base of the natural logarithm, ln.' },
                { s: 'φ', t: 'Golden ratio', v: 1.618033988749895, u: '', d: '(1 + √5) ÷ 2.' },
                { s: '√2', t: 'Square root of 2', v: Math.SQRT2, u: '', d: 'The diagonal of a square with sides of 1.' },
                { s: '√3', t: 'Square root of 3', v: 1.7320508075688772, u: '', d: 'The diagonal of a cube with sides of 1.' },
                { s: 'ln 2', t: 'Natural log of 2', v: Math.LN2, u: '', d: 'In doubling and half-life times: t = ln 2 ÷ rate.' },
                { s: 'ln 10', t: 'Natural log of 10', v: Math.LN10, u: '', d: 'ln x = log x × ln 10.' },
                { s: 'γ', t: 'Euler–Mascheroni constant', v: 0.5772156649015329, u: '', d: 'How far the sum 1 + ½ + ⅓ … + 1/n stays above ln n.' }
            ]
        },
        {
            c: 'Universal', list: [
                { s: 'c', t: 'Speed of light', v: 299792458, u: 'm/s', d: 'In a vacuum. Exact.' },
                { s: 'G', t: 'Gravitational constant', v: 6.6743e-11, u: 'm<sup>3</sup>/(kg·s<sup>2</sup>)', d: 'In Newton\'s law of gravitation.' },
                { s: 'h', t: 'Planck constant', v: 6.62607015e-34, u: 'J·s', d: 'The energy of a photon over its frequency. Exact.' },
                { s: 'ħ', t: 'Reduced Planck constant', v: 1.0545718176461565e-34, u: 'J·s', d: 'h ÷ 2π. Exact.' },
                { s: 'ε<sub>0</sub>', t: 'Vacuum permittivity', v: 8.8541878188e-12, u: 'F/m', d: 'The electric constant.' },
                { s: 'μ<sub>0</sub>', t: 'Vacuum permeability', v: 1.25663706127e-6, u: 'N/A<sup>2</sup>', d: 'The magnetic constant.' },
                { s: 'k<sub>e</sub>', t: 'Coulomb constant', v: 8.9875517862e9, u: 'N·m<sup>2</sup>/C<sup>2</sup>', d: '1 ÷ 4πε<sub>0</sub>, in Coulomb\'s law.' }
            ]
        },
        {
            c: 'Atoms and particles', list: [
                { s: 'e', t: 'Elementary charge', v: 1.602176634e-19, u: 'C', d: 'The charge of a proton. Exact.' },
                { s: 'm<sub>e</sub>', t: 'Electron mass', v: 9.1093837139e-31, u: 'kg', d: '' },
                { s: 'm<sub>p</sub>', t: 'Proton mass', v: 1.67262192595e-27, u: 'kg', d: '' },
                { s: 'm<sub>n</sub>', t: 'Neutron mass', v: 1.67492750056e-27, u: 'kg', d: '' },
                { s: 'u', t: 'Atomic mass unit', v: 1.66053906892e-27, u: 'kg', d: 'A twelfth of the mass of a carbon-12 atom.' },
                { s: 'a<sub>0</sub>', t: 'Bohr radius', v: 5.29177210544e-11, u: 'm', d: 'The size of a hydrogen atom.' },
                { s: 'α', t: 'Fine-structure constant', v: 7.2973525643e-3, u: '', d: 'About 1/137: the strength of electromagnetism.' },
                { s: 'R<sub>∞</sub>', t: 'Rydberg constant', v: 10973731.568157, u: '1/m', d: 'For the spectral lines of hydrogen.' },
                { s: 'eV', t: 'Electronvolt', v: 1.602176634e-19, u: 'J', d: 'The energy an electron gains across 1 volt. Exact.' }
            ]
        },
        {
            c: 'Heat and chemistry', list: [
                { s: 'N<sub>A</sub>', t: 'Avogadro constant', v: 6.02214076e23, u: '1/mol', d: 'The number of particles in a mole. Exact.' },
                { s: 'k<sub>B</sub>', t: 'Boltzmann constant', v: 1.380649e-23, u: 'J/K', d: 'Energy for each kelvin of temperature, per particle. Exact.' },
                { s: 'R', t: 'Gas constant', v: 8.31446261815324, u: 'J/(mol·K)', d: 'In the ideal gas law, PV = nRT. Exact.' },
                { s: 'F', t: 'Faraday constant', v: 96485.33212331001, u: 'C/mol', d: 'The charge of a mole of electrons. Exact.' },
                { s: 'σ', t: 'Stefan–Boltzmann constant', v: 5.6703744191844314e-8, u: 'W/(m<sup>2</sup>·K<sup>4</sup>)', d: 'How much a hot body radiates. Exact.' },
                { s: 'b', t: 'Wien\'s constant', v: 2.8977719551851722e-3, u: 'm·K', d: 'In Wien\'s law: the wavelength a hot body shines brightest at is b ÷ T.' },
                { s: 'V<sub>m</sub>', t: 'Molar volume of a gas', v: 22.413969545014137, u: 'L/mol', d: 'An ideal gas at 0 °C and 1 atm. Exact.' },
                { s: 'T<sub>0</sub>', t: 'Absolute zero', v: -273.15, u: '°C', d: '0 K, the coldest there is.' },
                { s: 'K', t: '0 °C in kelvin', v: 273.15, u: 'K', d: 'Where water freezes. Exact.' },
                { s: 'ρ<sub>w</sub>', t: 'Density of water', v: 1000, u: 'kg/m<sup>3</sup>', d: 'About; 998 at 20 °C.' },
                { s: 'c<sub>w</sub>', t: 'Specific heat of water', v: 4186, u: 'J/(kg·K)', d: 'About: the heat to warm 1 kg of water by 1 °C.' }
            ]
        },
        {
            c: 'Earth and space', list: [
                { s: 'g', t: 'Standard gravity', v: 9.80665, u: 'm/s<sup>2</sup>', d: 'The acceleration of a fall on Earth. Exact by definition.' },
                { s: 'atm', t: 'Standard atmosphere', v: 101325, u: 'Pa', d: 'Air pressure at sea level. Exact by definition.' },
                { s: 'v<sub>s</sub>', t: 'Speed of sound', v: 343, u: 'm/s', d: 'In dry air at 20 °C, about.' },
                { s: 'M<sub>⊕</sub>', t: 'Mass of the Earth', v: 5.9722e24, u: 'kg', d: '' },
                { s: 'R<sub>⊕</sub>', t: 'Radius of the Earth', v: 6.371e6, u: 'm', d: 'The mean radius.' },
                { s: 'M<sub>☾</sub>', t: 'Mass of the Moon', v: 7.346e22, u: 'kg', d: '' },
                { s: 'g<sub>☾</sub>', t: 'Gravity on the Moon', v: 1.62, u: 'm/s<sup>2</sup>', d: 'About a sixth of the Earth\'s.' },
                { s: 'd<sub>☾</sub>', t: 'Distance to the Moon', v: 3.844e8, u: 'm', d: 'The mean distance, 384,400 km.' },
                { s: 'M<sub>☉</sub>', t: 'Mass of the Sun', v: 1.9884e30, u: 'kg', d: '' },
                { s: 'L<sub>☉</sub>', t: 'Luminosity of the Sun', v: 3.828e26, u: 'W', d: 'The power the Sun gives off.' },
                { s: 'au', t: 'Astronomical unit', v: 149597870700, u: 'm', d: 'About the distance from the Earth to the Sun. Exact by definition.' },
                { s: 'ly', t: 'Light-year', v: 9.4607304725808e15, u: 'm', d: 'The distance light travels in a year.' },
                { s: 'pc', t: 'Parsec', v: 3.0856775814913673e16, u: 'm', d: 'About 3.26 light-years.' }
            ]
        }
    ];

    // The equation of a formula with these values, as text the calculator takes in,
    // or null while a value is missing. A value that is not a plain number (-3,
    // 1.5e6, 2/3) goes in brackets, so it stays one number in the equation: -3² is 9.
    // deg: angles are in degrees (true) or gradians (2); an angle the formula takes in radians (rad) is turned into them
    function fill(f, values, deg) {
        var missing = false, s = f.x.replace(/\{(\w+)\}/g, function (all, key) {
            var i = f.v.map(function (v) { return v[0]; }).indexOf(key),
                value = String(values[i] === undefined ? '' : values[i]).trim();
            if (!value) missing = true;
            value = /^(\d+\.?\d*|\.\d+)$/.test(value) ? value : '(' + value + ')';
            return deg && f.rad && f.rad.indexOf(key) > -1 ? '(' + value + '*pi/' + (deg === 2 ? 200 : 180) + ')' : value;
        });
        return missing ? null : s;
    }

    // Why these values give no answer: the first letter that breaks a rule of the
    // formula, else its note, else what can give none. Only plain numbers are checked
    function why(f, values) {
        var num = values.map(function (v) {
                v = String(v).trim().replace(',', '.');
                return /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(v) ? +v : NaN;
            }),
            rules = [['zero', ' cannot be 0.', function (x) { return x === 0; }],
                ['pos', ' must be above 0.', function (x) { return x <= 0; }],
                ['neg', ' cannot be below 0.', function (x) { return x < 0; }]],
            r, k, i, rule;
        for (r = 0; r < rules.length; r++) {
            for (k = 0; f[rules[r][0]] && k < f[rules[r][0]].length; k++) {
                rule = [].concat(f[rules[r][0]][k]);
                i = f.v.map(function (v) { return v[0]; }).indexOf(rule[0]);
                if (rules[r][2](num[i])) {
                    return rule[1] || '<i>' + f.v[i][1] + '</i> (' + f.v[i][2].replace(/\s*\(.*\)$/, '') + ')' + rules[r][1];
                }
            }
        }
        return f.no || 'No answer for these values: a division by 0, the root of a negative number, or a result too large to show.';
    }

    root.CalcFormulas = { formulas: formulas, constants: constants, fill: fill, why: why };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcFormulas;
    }
})(typeof window !== 'undefined' ? window : this);
