// The formulas and constants of the f(x) panel, and the examples of the graph.
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
                    t: 'Quadratic formula (+)', f: 'x = {{−b + [[b<sup>2</sup> − 4ac]]|2a}}',
                    d: 'One root of ax<sup>2</sup> + bx + c = 0. The other root has − before the √.',
                    v: [['a', 'a', 'x² coefficient'], ['b', 'b', 'x coefficient'], ['c', 'c', 'constant']],
                    x: '(-{b}+sqrt({b}²-4*{a}*{c}))/(2*{a})', ex: [[1, -3, -4], 4],
                    no: 'No real roots: b² − 4ac is below 0.',
                    zero: ['a']
                },
                {
                    t: 'Quadratic formula (−)', f: 'x = {{−b − [[b<sup>2</sup> − 4ac]]|2a}}',
                    d: 'The other root of ax<sup>2</sup> + bx + c = 0.',
                    v: [['a', 'a', 'x² coefficient'], ['b', 'b', 'x coefficient'], ['c', 'c', 'constant']],
                    x: '(-{b}-sqrt({b}²-4*{a}*{c}))/(2*{a})', ex: [[1, -3, -4], -1],
                    no: 'No real roots: b² − 4ac is below 0.',
                    zero: ['a']
                },
                {
                    t: 'Pythagorean theorem', f: 'c = [[a<sup>2</sup> + b<sup>2</sup>]]',
                    d: 'The longest side of a right triangle, from the two sides at the right angle.',
                    v: [['a', 'a', 'side'], ['b', 'b', 'side']],
                    x: 'sqrt({a}²+{b}²)', ex: [[3, 4], 5]
                },
                {
                    t: 'Distance between two points', f: 'd = [[(x<sub>2</sub> − x<sub>1</sub>)<sup>2</sup> + (y<sub>2</sub> − y<sub>1</sub>)<sup>2</sup>]]',
                    d: 'The straight distance from point (x<sub>1</sub>, y<sub>1</sub>) to point (x<sub>2</sub>, y<sub>2</sub>).',
                    v: [['x1', 'x<sub>1</sub>', 'first point x'], ['y1', 'y<sub>1</sub>', 'first point y'],
                        ['x2', 'x<sub>2</sub>', 'second point x'], ['y2', 'y<sub>2</sub>', 'second point y']],
                    x: 'sqrt(({x2}-{x1})²+({y2}-{y1})²)', ex: [[1, 2, 4, 6], 5]
                },
                {
                    t: 'Slope of a line', f: 'm = {{y<sub>2</sub> − y<sub>1</sub>|x<sub>2</sub> − x<sub>1</sub>}}',
                    d: 'How steep the line through two points is: how much y grows for each step of x.',
                    v: [['x1', 'x<sub>1</sub>', 'first point x'], ['y1', 'y<sub>1</sub>', 'first point y'],
                        ['x2', 'x<sub>2</sub>', 'second point x'], ['y2', 'y<sub>2</sub>', 'second point y']],
                    x: '({y2}-{y1})/({x2}-{x1})', ex: [[1, 2, 4, 6], 1.333333333],
                    no: 'The line is upright, x₁ = x₂: its slope has no value.'
                },
                {
                    t: 'Percentage change', f: '% = {{new − old|old}} × 100',
                    d: 'How much a value grew, in percent; below 0 when it fell.',
                    v: [['o', 'old', 'value before'], ['n', 'new', 'value after']],
                    x: '({n}-{o})/{o}*100', ex: [[80, 100], 25],
                    no: 'The old value cannot be 0.',
                    zero: ['o']
                },
                {
                    t: 'Arithmetic series', f: 'S = {{n|2}} × (2a + (n − 1)d)',
                    d: 'The sum of n terms that grow by the same step: a, a + d, a + 2d …',
                    v: [['n', 'n', 'number of terms'], ['a', 'a', 'first term'], ['d', 'd', 'step']],
                    x: '{n}/2*(2*{a}+({n}-1)*{d})', ex: [[10, 1, 1], 55]
                },
                {
                    t: 'Geometric series', f: 'S = {{a(1 − r<sup>n</sup>)|1 − r}}',
                    d: 'The sum of n terms that grow by the same factor: a, ar, ar<sup>2</sup> …',
                    v: [['a', 'a', 'first term'], ['r', 'r', 'factor, not 1'], ['n', 'n', 'number of terms']],
                    x: '{a}*(1-{r}^{n})/(1-{r})', ex: [[1, 2, 10], 1023],
                    no: 'r cannot be 1: then the sum is a × n.'
                },
                {
                    t: 'Logarithm to any base', f: 'log<sub>b</sub> x = {{ln x|ln b}}',
                    d: 'The power b must be raised to, to give x.',
                    v: [['x', 'x', 'number'], ['b', 'b', 'base']],
                    x: 'ln({x})/ln({b})', ex: [[8, 2], 3],
                    no: 'x and b must be above 0, and b cannot be 1.',
                    pos: ['x', 'b']
                },
                {
                    t: 'Exponential growth', f: 'N = N<sub>0</sub>(1 + {{r|100}})<sup>t</sup>',
                    d: 'An amount that grows by the same percent each period.',
                    v: [['N0', 'N<sub>0</sub>', 'starting amount'], ['r', 'r', 'growth per period, in %'], ['t', 't', 'periods']],
                    x: '{N0}*(1+{r}/100)^{t}', ex: [[100, 10, 2], 121]
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
                    t: 'Heron\'s formula', f: 'A = [[s(s − a)(s − b)(s − c)]]',
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
                    t: 'Law of cosines', f: 'c = [[a<sup>2</sup> + b<sup>2</sup> − 2ab cos C]]',
                    d: 'The third side of any triangle, from two sides and the angle between them.',
                    v: [['a', 'a', 'side'], ['b', 'b', 'side'], ['C', 'C', 'angle between them']],
                    x: 'sqrt({a}²+{b}²-2*{a}*{b}*cos({C}))', ex: [[3, 4, 90], 5], deg: true
                },
                {
                    t: 'Law of sines', f: 'a = {{b sin A|sin B}}',
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
                    t: 'Degrees to radians', f: 'rad = {{deg × π|180}}',
                    d: 'An angle in degrees, in radians.',
                    v: [['d', 'deg', 'angle in degrees']],
                    x: '{d}*pi/180', ex: [[180], 3.141592654]
                },
                {
                    t: 'Radians to degrees', f: 'deg = {{rad × 180|π}}',
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
                    t: 'Rectangular to polar: r', f: 'r = [[x<sup>2</sup> + y<sup>2</sup>]]',
                    d: 'The distance of point (x, y) to the origin.',
                    v: [['x', 'x', 'x of the point'], ['y', 'y', 'y of the point']],
                    x: 'sqrt({x}²+{y}²)', ex: [[3, 4], 5]
                },
                {
                    t: 'Rectangular to polar: θ', f: 'θ = tan<sup>−1</sup>({{y|x}})',
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
                    t: 'Speed', f: 'v = {{d|t}}',
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
                    t: 'Velocity after a distance', f: 'v = [[u<sup>2</sup> + 2as]]',
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
                    t: 'Power', f: 'P = {{W|t}}',
                    d: 'Work done in each second, in watts.',
                    v: [['W', 'W', 'work (J)'], ['t', 't', 'time (s)']],
                    x: '{W}/{t}', ex: [[100, 4], 25],
                    zero: ['t']
                },
                {
                    t: 'Centripetal force', f: 'F = {{mv<sup>2</sup>|r}}',
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
                    t: 'Pendulum period', f: 'T = 2π[[{{L|g}}]]',
                    d: 'The time of one swing back and forth, for small swings; g = 9.80665 m/s².',
                    v: [['L', 'L', 'length (m)']],
                    x: '2*pi*sqrt({L}/9.80665)', ex: [[1], 2.006409],
                    neg: ['L']
                },
                {
                    t: 'Universal gravitation', f: 'F = {{Gm<sub>1</sub>m<sub>2</sub>|r<sup>2</sup>}}',
                    d: 'The pull between two masses; G = 6.6743 × 10<sup>−11</sup>.',
                    v: [['m1', 'm<sub>1</sub>', 'mass (kg)'], ['m2', 'm<sub>2</sub>', 'mass (kg)'], ['r', 'r', 'distance (m)']],
                    x: '6.6743E-11*{m1}*{m2}/{r}²', ex: [[5.9722e24, 1, 6.371e6], 9.820302293],
                    zero: ['r']
                },
                {
                    t: 'Free-fall time', f: 't = [[{{2h|g}}]]',
                    d: 'How long a drop from a height takes, without air; g = 9.80665 m/s².',
                    v: [['h', 'h', 'height (m)']],
                    x: 'sqrt(2*{h}/9.80665)', ex: [[20], 2.019619977],
                    neg: ['h']
                },
                {
                    t: 'Projectile range', f: 'R = {{v<sup>2</sup> sin 2θ|g}}',
                    d: 'How far a throw goes on flat ground, without air; g = 9.80665 m/s².',
                    v: [['v', 'v', 'launch speed (m/s)'], ['q', 'θ', 'launch angle']],
                    x: '{v}²*sin(2*{q})/9.80665', ex: [[20, 45], 40.78864852], deg: true
                },
                {
                    t: 'Escape velocity', f: 'v = [[{{2GM|r}}]]',
                    d: 'The speed it takes to leave a planet or star for good; G = 6.6743 × 10<sup>−11</sup>.',
                    v: [['M', 'M', 'its mass (kg)'], ['r', 'r', 'distance from its center (m)']],
                    x: 'sqrt(2*6.6743E-11*{M}/{r})', ex: [[5.9722e24, 6.371e6], 11186.1652],
                    zero: ['r'], pos: ['M', 'r']
                },
                {
                    t: 'Orbital speed', f: 'v = [[{{GM|r}}]]',
                    d: 'The speed of a circular orbit; G = 6.6743 × 10<sup>−11</sup>.',
                    v: [['M', 'M', 'mass orbited (kg)'], ['r', 'r', 'distance from its center (m)']],
                    x: 'sqrt(6.6743E-11*{M}/{r})', ex: [[5.9722e24, 6.771e6], 7672.618887],
                    zero: ['r'], pos: ['M', 'r']
                },
                {
                    t: 'Kepler\'s third law', f: 'T = 2π[[{{a<sup>3</sup>|GM}}]]',
                    d: 'The period of an orbit, in seconds, of an orbit of semi-major axis a, half its longest width; G = 6.6743 × 10<sup>−11</sup>.',
                    v: [['a', 'a', 'size of its orbit (m)'], ['M', 'M', 'mass orbited (kg)']],
                    x: '2*pi*sqrt({a}^3/(6.6743E-11*{M}))', ex: [[6.771e6, 5.9722e24], 5544.84047],
                    zero: ['M'], pos: ['a', 'M']
                },
                {
                    t: 'Rocket equation', f: 'Δv = v<sub>e</sub> ln{{m<sub>0</sub>|m<sub>f</sub>}}',
                    d: 'The speed a rocket gains burning its fuel, by Tsiolkovsky.',
                    v: [['v', 'v<sub>e</sub>', 'exhaust speed (m/s)'], ['m0', 'm<sub>0</sub>', 'mass full (kg)'], ['mf', 'm<sub>f</sub>', 'mass empty (kg)']],
                    x: '{v}*ln({m0}/{mf})', ex: [[3000, 1000, 300], 3611.918413],
                    zero: ['mf'], pos: ['m0', 'mf']
                },
                {
                    t: 'Atwood machine', f: 'a = {{(m<sub>1</sub> − m<sub>2</sub>)g|m<sub>1</sub> + m<sub>2</sub>}}',
                    d: 'The acceleration of two masses hanging over a pulley; g = 9.80665 m/s².',
                    v: [['m1', 'm<sub>1</sub>', 'mass (kg)'], ['m2', 'm<sub>2</sub>', 'mass (kg)']],
                    x: '({m1}-{m2})*9.80665/({m1}+{m2})', ex: [[3, 2], 1.96133],
                    no: 'm₁ + m₂ cannot be 0.'
                },
                {
                    t: 'Schwarzschild radius', f: 'r = {{2GM|c<sup>2</sup>}}',
                    d: 'The radius a mass would be a black hole within, in metres; G = 6.6743 × 10<sup>−11</sup>, c = 299,792,458 m/s.',
                    v: [['M', 'M', 'its mass (kg)']],
                    x: '2*6.6743E-11*{M}/299792458²', ex: [[1.98847e30], 2953.339382]
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
                    t: 'Density', f: 'ρ = {{m|V}}',
                    d: 'Mass in each unit of volume.',
                    v: [['m', 'm', 'mass (kg)'], ['V', 'V', 'volume (m³)']],
                    x: '{m}/{V}', ex: [[10, 2], 5],
                    zero: ['V']
                },
                {
                    t: 'Pressure', f: 'P = {{F|A}}',
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
                    t: 'Ideal gas law', f: 'P = {{nRT|V}}',
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
                },
                {
                    t: 'Newton\'s law of cooling', f: 'T = T<sub>a</sub> + (T<sub>0</sub> − T<sub>a</sub>)e<sup>−kt</sup>',
                    d: 'The temperature of a thing cooling, or warming, in air at T<sub>a</sub>.',
                    v: [['T0', 'T<sub>0</sub>', 'temperature at first'], ['a', 'T<sub>a</sub>', 'temperature of the air'], ['k', 'k', 'rate, a minute'], ['t', 't', 'time (min)']],
                    x: '{a}+({T0}-{a})*e^(-{k}*{t})', ex: [[90, 20, 0.03, 30], 48.45987618]
                },
                {
                    t: 'Reynolds number', f: 'Re = {{ρvd|μ}}',
                    d: 'Whether a flow in a pipe is smooth, laminar, below some 2300, or turbulent, above some 4000.',
                    v: [['p', 'ρ', 'density (kg/m³), 998 for water'], ['v', 'v', 'speed (m/s)'], ['d', 'd', 'width of the pipe (m)'], ['u', 'μ', 'viscosity (Pa·s), 1.002e-3 for water']],
                    x: '{p}*{v}*{d}/{u}', ex: [[998, 2, 0.05, 1.002e-3], 99600.7984],
                    zero: ['u']
                },
                {
                    t: 'Stokes\' law', f: 'v = {{2(ρ<sub>s</sub> − ρ<sub>f</sub>)gr<sup>2</sup>|9μ}}',
                    d: 'The speed a small ball falls no faster than through a fluid, slowly; g = 9.80665 m/s².',
                    v: [['s', 'ρ<sub>s</sub>', 'density of the ball (kg/m³)'], ['p', 'ρ<sub>f</sub>', 'density of the fluid (kg/m³), 998 for water'], ['r', 'r', 'radius of the ball (m)'],
                        ['u', 'μ', 'viscosity (Pa·s), 1.002e-3 for water']],
                    x: '2*({s}-{p})*9.80665*{r}²/(9*{u})', ex: [[7800, 1260, 1e-3, 1.41], 0.01010803641],
                    zero: ['u']
                },
                {
                    t: 'Dew point', f: 'T<sub>d</sub> = {{cγ|b − γ}}',
                    d: 'Where air at T °C and a humidity RH is full, and water comes out of it, in °C: γ = ln(RH/100) + bT/(c + T), b = 17.625, c = 243.04 °C.',
                    v: [['T', 'T', 'temperature (°C)'], ['h', 'RH', 'relative humidity (%)']],
                    x: '243.04*(ln({h}/100)+17.625*{T}/(243.04+{T}))/(17.625-ln({h}/100)-17.625*{T}/(243.04+{T}))', ex: [[25, 60], 16.69766352],
                    pos: ['h']
                },
                {
                    t: 'Q-value', f: 'Q = (m<sub>before</sub> − m<sub>after</sub>) × 931.494',
                    d: 'The energy a nuclear reaction or a decay gives off, in MeV, of the masses before and after; 1 u is 931.49410372 MeV.',
                    v: [['a', 'm<sub>before</sub>', 'mass before (u)'], ['b', 'm<sub>after</sub>', 'mass after (u)']],
                    x: '({a}-{b})*931.49410372', ex: [[238.050788, 238.046203], 4.270900466]
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
                    t: 'Period', f: 'T = {{1|f}}',
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
                    t: 'Snell\'s law', f: 'θ<sub>2</sub> = sin<sup>−1</sup>({{n<sub>1</sub> sin θ<sub>1</sub>|n<sub>2</sub>}})',
                    d: 'The angle light bends to, going from one material into another.',
                    v: [['n1', 'n<sub>1</sub>', 'index it comes from, 1 for air'], ['q', 'θ<sub>1</sub>', 'angle of incidence'],
                        ['n2', 'n<sub>2</sub>', 'index it goes into, 1.33 for water']],
                    x: 'asin({n1}*sin({q})/{n2})', ex: [[1, 30, 1.5], 19.47122063], deg: true,
                    no: 'The light does not go through: it is all reflected back (total internal reflection).'
                },
                {
                    t: 'Thin lens', f: 'd<sub>i</sub> = {{1|{{1|f}} − {{1|d<sub>o</sub>}}}}',
                    d: 'Where a lens makes the image, from 1/f = 1/d<sub>o</sub> + 1/d<sub>i</sub>.',
                    v: [['f', 'f', 'focal length'], ['d', 'd<sub>o</sub>', 'distance of the object']],
                    x: '1/(1/{f}-1/{d})', ex: [[10, 30], 15],
                    no: 'The object is at the focal point, d = f: no image forms.',
                    zero: ['f', 'd']
                },
                {
                    t: 'Sound level', f: 'L = 10 log({{I|I<sub>0</sub>}})',
                    d: 'Loudness in decibels; I<sub>0</sub> = 10<sup>−12</sup> W/m², the quietest sound heard.',
                    v: [['I', 'I', 'intensity (W/m²)']],
                    x: '10*log({I}/1E-12)', ex: [[1e-6], 60],
                    pos: ['I']
                },
                {
                    t: 'Wien\'s law', f: 'λ = {{b|T}}',
                    d: 'The wavelength a hot body shines brightest at; b = 2.897771955 × 10<sup>−3</sup> m·K.',
                    v: [['T', 'T', 'temperature (K)']],
                    x: '2.897771955E-3/{T}', ex: [[5772], 5.020394932e-7],
                    zero: ['T']
                },
                {
                    t: 'Single-slit minimum', f: 'θ = sin<sup>−1</sup>({{mλ|a}})',
                    d: 'The angle of the m-th dark fringe of light through a slit of width a.',
                    v: [['m', 'm', 'order, 1, 2 …'], ['l', 'λ', 'wavelength (nm)'], ['a', 'a', 'width of the slit (m)']],
                    x: 'asin({m}*{l}*1E-9/{a})', ex: [[1, 633, 1e-4], 0.3626847064], deg: true,
                    no: 'mλ is wider than the slit: it has no such dark fringe.',
                    zero: ['a']
                },
                {
                    t: 'Rayleigh criterion', f: 'θ = {{1.22λ|D}}',
                    d: 'The smallest angle, in radians, between two points a lens or a round hole of width D tells apart.',
                    v: [['l', 'λ', 'wavelength (nm)'], ['D', 'D', 'width of the hole (m)']],
                    x: '1.22*{l}*1E-9/{D}', ex: [[550, 5e-3], 1.342e-4],
                    zero: ['D']
                },
                {
                    t: 'Beat frequency', f: 'f = |f<sub>1</sub> − f<sub>2</sub>|',
                    d: 'How many times a second two notes sounded together grow loud and soft.',
                    v: [['a', 'f<sub>1</sub>', 'frequency (Hz)'], ['b', 'f<sub>2</sub>', 'frequency (Hz)']],
                    x: 'abs({a}-{b})', ex: [[440, 444], 4]
                },
                {
                    t: 'Lensmaker\'s equation', f: 'f = {{1|(n − 1)({{1|R<sub>1</sub>}} − {{1|R<sub>2</sub>}})}}',
                    d: 'The focal length of a thin lens in air of its index and the radii of its faces, above 0 where a face\'s centre is past it.',
                    v: [['n', 'n', 'index, 1.5 for glass'], ['a', 'R<sub>1</sub>', 'radius of the first face'], ['b', 'R<sub>2</sub>', 'radius of the second face']],
                    x: '1/(({n}-1)*(1/{a}-1/{b}))', ex: [[1.5, 0.2, -0.3], 0.24],
                    zero: ['a', 'b'], no: 'It has no power: n is 1, or its faces are alike.'
                },
                {
                    t: 'Relativistic Doppler', f: 'λ′ = λ[[{{1 + β|1 − β}}]]',
                    d: 'The wavelength seen of light from a source going away at β, a part of the speed of light, below 0 coming nearer.',
                    v: [['l', 'λ', 'wavelength (nm)'], ['b', 'β', 'speed away, v/c']],
                    x: '{l}*sqrt((1+{b})/(1-{b}))', ex: [[656.3, 0.1], 725.56695],
                    no: 'β is from −1 to 1, slower than light.'
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
                    t: 'Resistors in parallel', f: 'R = {{R<sub>1</sub>R<sub>2</sub>|R<sub>1</sub> + R<sub>2</sub>}}',
                    d: 'The resistance of two resistors side by side.',
                    v: [['a', 'R<sub>1</sub>', 'resistance (Ω)'], ['b', 'R<sub>2</sub>', 'resistance (Ω)']],
                    x: '{a}*{b}/({a}+{b})', ex: [[6, 3], 2],
                    no: 'R₁ + R₂ cannot be 0.'
                },
                {
                    t: 'Capacitors in series', f: 'C = {{C<sub>1</sub>C<sub>2</sub>|C<sub>1</sub> + C<sub>2</sub>}}',
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
                    t: 'Resonant frequency', f: 'f = {{1|2π[[LC]]}}',
                    d: 'The frequency an LC circuit rings at, in hertz.',
                    v: [['L', 'L', 'inductance (H)'], ['C', 'C', 'capacitance (F)']],
                    x: '1/(2*pi*sqrt({L}*{C}))', ex: [[0.001, 1e-6], 5032.92121],
                    pos: ['L', 'C']
                },
                {
                    t: 'Coulomb\'s law', f: 'F = {{kq<sub>1</sub>q<sub>2</sub>|r<sup>2</sup>}}',
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
                },
                {
                    t: 'Impedance of RLC', f: 'Z = [[R<sup>2</sup> + (2πfL − {{1|2πfC}})<sup>2</sup>]]',
                    d: 'The impedance of a resistor, a coil and a capacitor in series at a frequency, in ohms.',
                    v: [['R', 'R', 'resistance (Ω)'], ['L', 'L', 'inductance (H)'], ['C', 'C', 'capacitance (F)'], ['f', 'f', 'frequency (Hz)']],
                    x: 'sqrt({R}²+(2*pi*{f}*{L}-1/(2*pi*{f}*{C}))²)', ex: [[100, 0.01, 1e-6, 1000], 138.8457334],
                    zero: ['C', 'f']
                },
                {
                    t: 'LM317 output', f: 'V = 1.25(1 + {{R<sub>2</sub>|R<sub>1</sub>}})',
                    d: 'The voltage an LM317 regulator gives, set by two resistors; the 50 µA out of its ADJ pin left out.',
                    v: [['a', 'R<sub>1</sub>', 'from OUT to ADJ (Ω), 240'], ['b', 'R<sub>2</sub>', 'from ADJ to 0 V (Ω)']],
                    x: '1.25*(1+{b}/{a})', ex: [[240, 720], 5],
                    zero: ['a']
                },
                {
                    t: 'Wheatstone bridge', f: 'R<sub>x</sub> = {{R<sub>2</sub>R<sub>3</sub>|R<sub>1</sub>}}',
                    d: 'The resistance that balances a bridge, no voltage between its middles: R<sub>1</sub> over R<sub>2</sub> on one side, R<sub>3</sub> over R<sub>x</sub> on the other.',
                    v: [['a', 'R<sub>1</sub>', 'resistance (Ω)'], ['b', 'R<sub>2</sub>', 'resistance (Ω)'], ['c', 'R<sub>3</sub>', 'resistance (Ω)']],
                    x: '{b}*{c}/{a}', ex: [[1000, 470, 2200], 1034],
                    zero: ['a']
                },
                {
                    t: 'Three-phase power', f: 'P = [[3]] VI cos φ',
                    d: 'The real power of three phases, in watts, in star or in delta.',
                    v: [['V', 'V', 'voltage between lines (V)'], ['I', 'I', 'current in a line (A)'], ['p', 'cos φ', 'power factor, 1 for a heater']],
                    x: 'sqrt(3)*{V}*{I}*{p}', ex: [[400, 16, 0.85], 9422.356393]
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
                    t: 'Amount of substance', f: 'n = {{m|M}}',
                    d: 'Moles in a mass of a substance.',
                    v: [['m', 'm', 'mass (g)'], ['M', 'M', 'molar mass (g/mol)']],
                    x: '{m}/{M}', ex: [[36, 18], 2],
                    zero: ['M']
                },
                {
                    t: 'Molarity', f: 'c = {{n|V}}',
                    d: 'The concentration of a solution, in mol/L.',
                    v: [['n', 'n', 'amount (mol)'], ['V', 'V', 'volume (L)']],
                    x: '{n}/{V}', ex: [[0.5, 2], 0.25],
                    zero: ['V']
                },
                {
                    t: 'Dilution', f: 'C<sub>2</sub> = {{C<sub>1</sub>V<sub>1</sub>|V<sub>2</sub>}}',
                    d: 'The concentration after adding water, from C<sub>1</sub>V<sub>1</sub> = C<sub>2</sub>V<sub>2</sub>.',
                    v: [['c1', 'C<sub>1</sub>', 'concentration before'], ['v1', 'V<sub>1</sub>', 'volume before'],
                        ['v2', 'V<sub>2</sub>', 'volume after']],
                    x: '{c1}*{v1}/{v2}', ex: [[2, 0.5, 2], 0.5],
                    zero: ['v2']
                },
                {
                    t: 'pOH', f: 'pOH = −log[OH<sup>−</sup>]',
                    d: 'How basic a solution is; at 25 °C, pH = 14 − pOH.',
                    v: [['OH', '[OH<sup>−</sup>]', 'concentration (mol/L)']],
                    x: '-log({OH})', ex: [[0.001], 3],
                    pos: ['OH']
                },
                {
                    t: '[H⁺] from pH', f: '[H<sup>+</sup>] = 10<sup>−pH</sup>',
                    d: 'The concentration of hydrogen ions, in mol/L, of a pH.',
                    v: [['p', 'pH', 'pH']],
                    x: '10^(-{p})', ex: [[3], 0.001]
                },
                {
                    t: 'Henderson–Hasselbalch', f: 'pH = pK<sub>a</sub> + log{{[A<sup>−</sup>]|[HA]}}',
                    d: 'The pH of a buffer of a weak acid HA and its base A<sup>−</sup>.',
                    v: [['k', 'pK<sub>a</sub>', 'of the acid'], ['a', '[A<sup>−</sup>]', 'base (mol/L)'], ['h', '[HA]', 'acid (mol/L)']],
                    x: '{k}+log({a}/{h})', ex: [[4.76, 0.1, 0.1], 4.76],
                    pos: ['a', 'h']
                },
                {
                    t: 'Combined gas law', f: 'V<sub>2</sub> = {{P<sub>1</sub>V<sub>1</sub>T<sub>2</sub>|T<sub>1</sub>P<sub>2</sub>}}',
                    d: 'The volume of a gas after its pressure and temperature change; T in kelvin.',
                    v: [['p1', 'P<sub>1</sub>', 'pressure before'], ['v1', 'V<sub>1</sub>', 'volume before'], ['t1', 'T<sub>1</sub>', 'temperature before (K)'],
                        ['p2', 'P<sub>2</sub>', 'pressure after'], ['t2', 'T<sub>2</sub>', 'temperature after (K)']],
                    x: '{p1}*{v1}*{t2}/({t1}*{p2})', ex: [[1, 2, 300, 2, 600], 2],
                    zero: ['t1', 'p2']
                },
                {
                    t: 'Molality', f: 'b = {{n|m}}',
                    d: 'Moles of solute in each kilogram of solvent, mol/kg.',
                    v: [['n', 'n', 'solute (mol)'], ['m', 'm', 'solvent (kg)']],
                    x: '{n}/{m}', ex: [[0.5, 0.25], 2],
                    zero: ['m']
                },
                {
                    t: 'Boiling point elevation', f: 'ΔT = iK<sub>b</sub>b',
                    d: 'How much higher a solution boils than its solvent. K<sub>b</sub> of water is 0.512 °C·kg/mol.',
                    v: [['i', 'i', 'van \'t Hoff factor'], ['k', 'K<sub>b</sub>', 'constant (°C·kg/mol)'], ['b', 'b', 'molality (mol/kg)']],
                    x: '{i}*{k}*{b}', ex: [[2, 0.512, 1], 1.024]
                },
                {
                    t: 'Freezing point depression', f: 'ΔT = iK<sub>f</sub>b',
                    d: 'How much lower a solution freezes than its solvent. K<sub>f</sub> of water is 1.86 °C·kg/mol.',
                    v: [['i', 'i', 'van \'t Hoff factor'], ['k', 'K<sub>f</sub>', 'constant (°C·kg/mol)'], ['b', 'b', 'molality (mol/kg)']],
                    x: '{i}*{k}*{b}', ex: [[2, 1.86, 0.5], 1.86]
                },
                {
                    t: 'Osmotic pressure', f: 'Π = iMRT',
                    d: 'The pressure of osmosis of a solution, in atm.',
                    v: [['i', 'i', 'van \'t Hoff factor'], ['M', 'M', 'molarity (mol/L)'], ['T', 'T', 'temperature (K)']],
                    x: '{i}*{M}*0.08205736608096*{T}', ex: [[1, 0.1, 298], 2.445309509212608]
                },
                {
                    t: 'Raoult\'s law', f: 'P = x P°',
                    d: 'The vapour pressure of a solvent in a solution, from its mole fraction and its vapour pressure alone.',
                    v: [['x', 'x', 'mole fraction'], ['p', 'P°', 'pure vapour pressure']],
                    x: '{x}*{p}', ex: [[0.9, 23.8], 21.42]
                },
                {
                    t: 'Gibbs free energy', f: 'ΔG = ΔH − TΔS',
                    d: 'Below 0, the reaction goes by itself. ΔH and ΔS in the same unit of energy: kJ and kJ/K.',
                    v: [['h', 'ΔH', 'enthalpy (kJ/mol)'], ['T', 'T', 'temperature (K)'], ['s', 'ΔS', 'entropy (kJ/(mol·K))']],
                    x: '{h}-{T}*{s}', ex: [[-92.2, 298, -0.1987], -32.9874]
                },
                {
                    t: 'Free energy and K', f: 'ΔG° = −RT ln K',
                    d: 'The standard free energy of a reaction, in J/mol, from its equilibrium constant.',
                    v: [['T', 'T', 'temperature (K)'], ['K', 'K', 'equilibrium constant']],
                    x: '-8.314462618*{T}*ln({K})', ex: [[298, 10], -5705.137788777988],
                    pos: ['K']
                },
                {
                    t: 'Nernst equation', f: 'E = E° − {{RT|nF}} ln Q',
                    d: 'The voltage of a cell away from standard conditions, in V.',
                    v: [['e', 'E°', 'standard voltage (V)'], ['T', 'T', 'temperature (K)'], ['n', 'n', 'electrons moved'], ['Q', 'Q', 'reaction quotient']],
                    x: '{e}-8.314462618*{T}/({n}*96485.33212331001)*ln({Q})', ex: [[1.1, 298.15, 2, 0.01], 1.159159349683692],
                    zero: ['n'], pos: ['Q']
                },
                {
                    t: 'Arrhenius equation', f: 'k = Ae<sup>−E<sub>a</sub>/RT</sup>',
                    d: 'The rate constant of a reaction at a temperature; E<sub>a</sub> in J/mol.',
                    v: [['A', 'A', 'pre-exponential factor'], ['E', 'E<sub>a</sub>', 'activation energy (J/mol)'], ['T', 'T', 'temperature (K)']],
                    x: '{A}*e^(-{E}/(8.314462618*{T}))', ex: [[1000, 20000, 300], 0.32942659591539336],
                    zero: ['T']
                },
                {
                    t: 'First-order decay', f: '[A] = [A]<sub>0</sub>e<sup>−kt</sup>',
                    d: 'What is left of a reactant that goes at a rate k.',
                    v: [['a', '[A]<sub>0</sub>', 'at first'], ['k', 'k', 'rate constant'], ['t', 't', 'time']],
                    x: '{a}*e^(-{k}*{t})', ex: [[1, 0.1, 10], 0.36787944117144233]
                },
                {
                    t: 'Half-life', f: 'N = N<sub>0</sub>(½)<sup>t/t½</sup>',
                    d: 'What is left of a radioactive substance after a time t; t and t½ in the same unit.',
                    v: [['N', 'N<sub>0</sub>', 'at first'], ['t', 't', 'time'], ['h', 't½', 'half-life']],
                    x: '{N}*0.5^({t}/{h})', ex: [[100, 10, 5], 25],
                    zero: ['h']
                },
                {
                    t: 'Beer–Lambert law', f: 'A = εlc',
                    d: 'How much light a solution absorbs.',
                    v: [['e', 'ε', 'molar absorptivity (L/(mol·cm))'], ['l', 'l', 'path length (cm)'], ['c', 'c', 'concentration (mol/L)']],
                    x: '{e}*{l}*{c}', ex: [[100, 1, 0.01], 1]
                },
                {
                    t: 'Graham\'s law', f: '{{r<sub>1</sub>|r<sub>2</sub>}} = [[{{M<sub>2</sub>|M<sub>1</sub>}}]]',
                    d: 'How many times faster the first gas effuses than the second.',
                    v: [['a', 'M<sub>1</sub>', 'molar mass of the first'], ['b', 'M<sub>2</sub>', 'molar mass of the second']],
                    x: 'sqrt({b}/{a})', ex: [[4, 16], 2],
                    pos: ['a', 'b']
                },
                {
                    t: 'Electrolysis', f: 'm = {{ItM|nF}}',
                    d: 'The mass made at an electrode, in g, by a current over a time, Faraday\'s law.',
                    v: [['I', 'I', 'current (A)'], ['t', 't', 'time (s)'], ['M', 'M', 'molar mass (g/mol)'], ['n', 'n', 'electrons per ion']],
                    x: '{I}*{t}*{M}/({n}*96485.33212331001)', ex: [[2, 3600, 63.546, 2], 2.37098836647661],
                    zero: ['n']
                },
                {
                    t: 'Percent yield', f: '% = {{actual|theoretical}} × 100',
                    d: 'How much of what a reaction could give it gave.',
                    v: [['a', 'actual', 'yield got'], ['t', 'theoretical', 'yield possible']],
                    x: '{a}/{t}*100', ex: [[8, 10], 80],
                    zero: ['t']
                },
                {
                    t: 'Particles', f: 'N = nN<sub>A</sub>',
                    d: 'The number of atoms or molecules in an amount of substance.',
                    v: [['n', 'n', 'amount (mol)']],
                    x: '{n}*6.02214076*10^23', ex: [[2], 1.204428152e24]
                }
            ]
        },
        {
            c: 'Biology', list: [
                {
                    t: 'Hardy–Weinberg carriers', f: '2pq = 2p(1 − p)',
                    d: 'The part of a population that is heterozygous, of p, the frequency of the dominant allele.',
                    v: [['p', 'p', 'frequency of the dominant allele']],
                    x: '2*{p}*(1-{p})', ex: [[0.7], 0.42]
                },
                {
                    t: 'Recessive allele frequency', f: 'q = [[q<sup>2</sup>]]',
                    d: 'q of the part of a population that shows the recessive trait, as 1/2500.',
                    v: [['a', 'q<sup>2</sup>', 'part showing the recessive trait']],
                    x: 'sqrt({a})', ex: [[0.0004], 0.02],
                    neg: ['a']
                },
                {
                    t: 'Recombination frequency', f: 'RF = {{recombinants|total}} × 100',
                    d: 'The distance between two genes, in map units (cM), from a test cross.',
                    v: [['r', 'recombinants', 'recombinant offspring'], ['n', 'total', 'all the offspring']],
                    x: '{r}/{n}*100', ex: [[170, 1000], 17],
                    zero: ['n']
                },
                {
                    t: 'Population growth, exponential', f: 'N = N<sub>0</sub>e<sup>rt</sup>',
                    d: 'A population growing without limit, at the rate r.',
                    v: [['N', 'N<sub>0</sub>', 'size at first'], ['r', 'r', 'growth rate'], ['t', 't', 'time']],
                    x: '{N}*e^({r}*{t})', ex: [[50, 0.3, 20], 20171.43967]
                },
                {
                    t: 'Population growth, logistic', f: 'N = {{K|1 + {{K − N<sub>0</sub>|N<sub>0</sub>}}e<sup>−rt</sup>}}',
                    d: 'A population growing more slowly as it nears its carrying capacity K.',
                    v: [['N', 'N<sub>0</sub>', 'size at first'], ['r', 'r', 'growth rate'], ['t', 't', 'time'], ['K', 'K', 'carrying capacity']],
                    x: '{K}/(1+({K}-{N})/{N}*e^(-{r}*{t}))', ex: [[50, 0.3, 20, 1000], 955.0220054],
                    zero: ['N']
                },
                {
                    t: 'Doubling time', f: 't<sub>d</sub> = {{ln 2|r}}',
                    d: 'How long a population, or a culture, growing at the rate r takes to double.',
                    v: [['r', 'r', 'growth rate']],
                    x: 'ln(2)/{r}', ex: [[0.1], 6.931471806],
                    zero: ['r']
                },
                {
                    t: 'Generations', f: 'n = {{log N − log N<sub>0</sub>|log 2}}',
                    d: 'How many times cells divided to grow from N<sub>0</sub> to N.',
                    v: [['N', 'N', 'cells at the end'], ['M', 'N<sub>0</sub>', 'cells at first']],
                    x: '(log({N})-log({M}))/log(2)', ex: [[64000, 1000], 6],
                    pos: ['N', 'M']
                },
                {
                    t: 'Mark and recapture', f: 'N = {{MC|R}}',
                    d: 'The size of a population by Lincoln and Petersen: M marked, C caught later, R of them marked.',
                    v: [['M', 'M', 'marked'], ['C', 'C', 'caught the second time'], ['R', 'R', 'recaptured, marked']],
                    x: '{M}*{C}/{R}', ex: [[50, 60, 12], 250],
                    zero: ['R']
                },
                {
                    t: 'Solute potential', f: 'Ψ<sub>S</sub> = −iCRT',
                    d: 'The water potential of a solution, in bars: i particles of each molecule, C in mol/L, at T in °C.',
                    v: [['i', 'i', 'particles of each, 1 of sucrose'], ['C', 'C', 'molarity (mol/L)'], ['T', 'T', 'temperature (°C)']],
                    x: '-{i}*{C}*0.0831446*({T}+273.15)', ex: [[1, 0.3, 22], -7.362038607]
                },
                {
                    t: 'Q10', f: 'Q<sub>10</sub> = ({{R<sub>2</sub>|R<sub>1</sub>}})<sup>10/(T<sub>2</sub> − T<sub>1</sub>)</sup>',
                    d: 'How many times faster a rate goes 10 °C warmer.',
                    v: [['a', 'R<sub>1</sub>', 'rate at T₁'], ['b', 'R<sub>2</sub>', 'rate at T₂'], ['t', 'T<sub>1</sub>', 'temperature 1 (°C)'], ['s', 'T<sub>2</sub>', 'temperature 2 (°C)']],
                    x: '({b}/{a})^(10/({s}-{t}))', ex: [[12, 30, 20, 30], 2.5],
                    pos: ['a', 'b'], no: 'The two temperatures cannot be the same.'
                },
                {
                    t: 'Nernst potential', f: 'E = {{RT|zF}} ln {{[out]|[in]}}',
                    d: 'The voltage across a membrane at which an ion is at balance, in mV.',
                    v: [['z', 'z', 'charge of the ion'], ['o', '[out]', 'concentration outside'], ['i', '[in]', 'concentration inside'], ['T', 'T', 'temperature (°C)']],
                    x: '8.314462618*({T}+273.15)/({z}*96485.33212)*ln({o}/{i})*1000', ex: [[1, 5, 140, 37], -89.05869404],
                    zero: ['z'], pos: ['o', 'i']
                },
                {
                    t: 'Michaelis–Menten', f: 'v = {{V<sub>max</sub>[S]|K<sub>m</sub> + [S]}}',
                    d: 'The rate of an enzyme\'s reaction at a concentration of its substrate.',
                    v: [['V', 'V<sub>max</sub>', 'the fastest rate'], ['K', 'K<sub>m</sub>', '[S] of half V<sub>max</sub>'], ['S', '[S]', 'substrate concentration']],
                    x: '{V}*{S}/({K}+{S})', ex: [[10, 2, 4], 6.666666667]
                },
                {
                    t: 'Hill equation', f: 'θ = {{[L]<sup>n</sup>|K<sup>n</sup> + [L]<sup>n</sup>}}',
                    d: 'The part of a protein with its ligand bound, n its cooperativity, as haemoglobin\'s 2.8.',
                    v: [['L', '[L]', 'ligand concentration'], ['K', 'K', '[L] half bound'], ['n', 'n', 'Hill coefficient']],
                    x: '{L}^{n}/({K}^{n}+{L}^{n})', ex: [[40, 26, 2.8], 0.7696245032],
                    pos: ['L', 'K']
                },
                {
                    t: 'Beer–Lambert', f: 'c = {{A|εl}}',
                    d: 'A concentration in mol/L from its absorbance, of ε in M⁻¹cm⁻¹ and the path l in cm.',
                    v: [['A', 'A', 'absorbance'], ['e', 'ε', 'extinction coefficient (M⁻¹cm⁻¹)'], ['l', 'l', 'path (cm)']],
                    x: '{A}/({e}*{l})', ex: [[0.5, 6220, 1], 8.038585209e-5],
                    zero: ['e', 'l']
                },
                {
                    t: 'DNA by A260', f: 'c = A<sub>260</sub> × 50 × dilution',
                    d: 'The concentration of double-stranded DNA, in µg/mL; of RNA 40, of single-stranded DNA 33 in place of 50.',
                    v: [['A', 'A<sub>260</sub>', 'absorbance at 260 nm'], ['d', 'dilution', 'times diluted']],
                    x: '{A}*50*{d}', ex: [[0.75, 10], 375]
                },
                {
                    t: 'Wallace rule', f: 'T<sub>m</sub> = 2(A + T) + 4(G + C)',
                    d: 'The melting point of a short primer, in °C, of the count of each base.',
                    v: [['w', 'A + T', 'count of A and T'], ['s', 'G + C', 'count of G and C']],
                    x: '2*{w}+4*{s}', ex: [[10, 10], 60]
                },
                {
                    t: 'PCR copies', f: 'N = N<sub>0</sub>(1 + E)<sup>n</sup>',
                    d: 'The copies after n cycles of PCR, E its efficiency in %, 100 doubling each cycle.',
                    v: [['N', 'N<sub>0</sub>', 'copies at first'], ['E', 'E', 'efficiency (%)'], ['n', 'n', 'cycles']],
                    x: '{N}*(1+{E}/100)^{n}', ex: [[1000, 100, 30], 1073741824000]
                },
                {
                    t: 'Fold change by ΔΔCt', f: 'fold = 2<sup>−ΔΔCt</sup>',
                    d: 'The change in a gene\'s expression by Livak\'s method, of ΔΔCt.',
                    v: [['d', 'ΔΔCt', 'ΔCt treated − ΔCt control']],
                    x: '2^(-{d})', ex: [[-2.5], 5.656854249]
                },
                {
                    t: 'Centrifuge force', f: 'RCF = 1.118 × 10<sup>−5</sup> r × RPM<sup>2</sup>',
                    d: 'The force of a centrifuge in g, of the rotor\'s radius in cm.',
                    v: [['r', 'r', 'radius (cm)'], ['N', 'RPM', 'revolutions a minute']],
                    x: '1.118E-5*{r}*{N}²', ex: [[8.4, 13000], 15871.128]
                },
                {
                    t: 'Magnification', f: 'M = {{image|actual}}',
                    d: 'How many times bigger an image is than the real thing, both in one unit.',
                    v: [['i', 'image', 'size of the image'], ['a', 'actual', 'real size']],
                    x: '{i}/{a}', ex: [[5, 0.01], 500],
                    zero: ['a']
                },
                {
                    t: 'Specific activity', f: 'SA = {{units|mg}}',
                    d: 'An enzyme\'s activity for each mg of protein: the higher, the purer.',
                    v: [['u', 'units', 'activity (U)'], ['m', 'mg', 'protein (mg)']],
                    x: '{u}/{m}', ex: [[3000, 1500], 2],
                    zero: ['m']
                },
                {
                    t: 'Transformation efficiency', f: 'T = {{colonies|µg plated}}',
                    d: 'The transformants a µg of DNA, of the colonies and the µg of DNA in what was spread.',
                    v: [['n', 'colonies', 'colonies on the plate'], ['u', 'µg', 'DNA plated (µg)']],
                    x: '{n}/{u}', ex: [[150, 1E-6], 150000000],
                    zero: ['u']
                },
                {
                    t: 'Jukes–Cantor distance', f: 'd = −¾ ln(1 − {{4|3}}p)',
                    d: 'The substitutions a site between two sequences, of p, the part of the sites that differ.',
                    v: [['p', 'p', 'part that differ']],
                    x: '-3/4*ln(1-4/3*{p})', ex: [[0.1], 0.1073256327],
                    no: 'p must be below 0.75.'
                },
                {
                    t: 'Divergence time', f: 'T = {{d|2r}}',
                    d: 'How long ago two lineages split, of d substitutions a site and r a site a year.',
                    v: [['d', 'd', 'substitutions a site'], ['r', 'r', 'rate a site a year']],
                    x: '{d}/(2*{r})', ex: [[0.1, 1E-9], 50000000],
                    zero: ['r']
                },
                {
                    t: 'SA:V of a sphere', f: 'SA:V = {{3|r}}',
                    d: 'A round cell\'s surface for each of its volume: smaller cells have more.',
                    v: [['r', 'r', 'radius']],
                    x: '3/{r}', ex: [[2], 1.5],
                    zero: ['r']
                },
                {
                    t: 'Fick\'s law', f: 'J = {{DAΔC|d}}',
                    d: 'The rate a substance diffuses across a membrane, in mol/s, of SI units.',
                    v: [['D', 'D', 'diffusion coefficient (m²/s)'], ['A', 'A', 'area (m²)'], ['c', 'ΔC', 'difference (mol/m³)'], ['d', 'd', 'thickness (m)']],
                    x: '{D}*{A}*{c}/{d}', ex: [[2E-9, 1E-6, 0.1, 1E-6], 2E-10],
                    zero: ['d']
                },
                {
                    t: 'Free energy of a reaction', f: 'ΔG = ΔG°′ + RT ln Q',
                    d: 'Whether a reaction goes forward, below 0, at Q of its products over its reactants, in kJ/mol.',
                    v: [['g', 'ΔG°′', 'standard (kJ/mol)'], ['q', 'Q', 'reaction quotient'], ['T', 'T', 'temperature (°C)']],
                    x: '{g}+8.314462618E-3*({T}+273.15)*ln({q})', ex: [[-30.5, 0.001, 37], -48.31323978],
                    pos: ['q']
                }
            ]
        },
        {
            c: 'Health', list: [
                {
                    t: 'Basal metabolic rate, men', f: 'BMR = 10m + 6.25h − 5a + 5',
                    d: 'The energy of a man at rest, kcal a day, by Mifflin and St Jeor.',
                    v: [['m', 'm', 'weight (kg)'], ['h', 'h', 'height (cm)'], ['a', 'a', 'age (years)']],
                    x: '10*{m}+6.25*{h}-5*{a}+5', ex: [[70, 175, 30], 1648.75]
                },
                {
                    t: 'Basal metabolic rate, women', f: 'BMR = 10m + 6.25h − 5a − 161',
                    d: 'The energy of a woman at rest, kcal a day, by Mifflin and St Jeor.',
                    v: [['m', 'm', 'weight (kg)'], ['h', 'h', 'height (cm)'], ['a', 'a', 'age (years)']],
                    x: '10*{m}+6.25*{h}-5*{a}-161', ex: [[60, 165, 30], 1320.25]
                },
                {
                    t: 'Cardiac output', f: 'CO = HR × SV',
                    d: 'The blood the heart pumps, in L/min, of the heart rate and the stroke volume in mL.',
                    v: [['h', 'HR', 'heart rate (bpm)'], ['s', 'SV', 'stroke volume (mL)']],
                    x: '{h}*{s}/1000', ex: [[70, 70], 4.9]
                },
                {
                    t: 'Mean arterial pressure', f: 'MAP = DBP + {{SBP − DBP|3}}',
                    d: 'The mean pressure in the arteries over a beat, in mmHg.',
                    v: [['s', 'SBP', 'systolic (mmHg)'], ['d', 'DBP', 'diastolic (mmHg)']],
                    x: '{d}+({s}-{d})/3', ex: [[120, 80], 93.33333333]
                },
                {
                    t: 'Herd immunity', f: 'p = 1 − {{1|R<sub>0</sub>}}',
                    d: 'The part of a population to make immune for an infection to die out.',
                    v: [['R', 'R<sub>0</sub>', 'basic reproduction number']],
                    x: '1-1/{R}', ex: [[3], 0.6666666667],
                    zero: ['R']
                },
                {
                    t: 'Sensitivity', f: 'sensitivity = {{TP|TP + FN}}',
                    d: 'The part of those with an illness a test finds.',
                    v: [['a', 'TP', 'true positives'], ['b', 'FN', 'false negatives']],
                    x: '{a}/({a}+{b})', ex: [[90, 10], 0.9]
                },
                {
                    t: 'Specificity', f: 'specificity = {{TN|TN + FP}}',
                    d: 'The part of those without an illness a test clears.',
                    v: [['a', 'TN', 'true negatives'], ['b', 'FP', 'false positives']],
                    x: '{a}/({a}+{b})', ex: [[855, 45], 0.95]
                },
                {
                    t: 'Positive predictive value', f: 'PPV = {{TP|TP + FP}}',
                    d: 'The part of those a test flags who have the illness.',
                    v: [['a', 'TP', 'true positives'], ['b', 'FP', 'false positives']],
                    x: '{a}/({a}+{b})', ex: [[90, 45], 0.6666666667]
                },
                {
                    t: 'Odds ratio', f: 'OR = {{ad|bc}}',
                    d: 'Of a 2 × 2 table: a and b exposed, with the outcome and without; c and d not exposed.',
                    v: [['a', 'a', 'exposed, with it'], ['b', 'b', 'exposed, without'], ['c', 'c', 'not, with it'], ['d', 'd', 'not, without']],
                    x: '{a}*{d}/({b}*{c})', ex: [[15, 85, 30, 70], 0.4117647059],
                    zero: ['b', 'c']
                },
                {
                    t: 'Relative risk', f: 'RR = {{a ÷ (a + b)|c ÷ (c + d)}}',
                    d: 'The risk of the exposed over the risk of those not.',
                    v: [['a', 'a', 'exposed, with it'], ['b', 'b', 'exposed, without'], ['c', 'c', 'not, with it'], ['d', 'd', 'not, without']],
                    x: '({a}/({a}+{b}))/({c}/({c}+{d}))', ex: [[15, 85, 30, 70], 0.5],
                    zero: ['c']
                },
                {
                    t: 'Number needed to treat', f: 'NNT = {{1|ARR}}',
                    d: 'How many to treat for one fewer with the outcome, of the absolute risk reduction, a part of 1.',
                    v: [['r', 'ARR', 'risk reduction']],
                    x: '1/{r}', ex: [[0.15], 6.666666667],
                    zero: ['r']
                },
                {
                    t: 'Drug elimination', f: 'C = C<sub>0</sub>(½)<sup>t/t½</sup>',
                    d: 'A drug\'s concentration after a time, falling by half each half-life.',
                    v: [['C', 'C<sub>0</sub>', 'concentration at first'], ['t', 't', 'time'], ['h', 't½', 'half-life']],
                    x: '{C}*0.5^({t}/{h})', ex: [[10, 6, 3], 2.5],
                    zero: ['h']
                },
                {
                    t: 'Renal clearance', f: 'C = {{UV|P}}',
                    d: 'The plasma cleared of a substance each minute, mL/min, of its concentration in urine and plasma.',
                    v: [['U', 'U', 'concentration in urine'], ['V', 'V', 'urine flow (mL/min)'], ['P', 'P', 'concentration in plasma']],
                    x: '{U}*{V}/{P}', ex: [[120, 1, 1], 120],
                    zero: ['P']
                },
                {
                    t: 'Plasma osmolality', f: 'osmolality = 2Na + glucose + urea',
                    d: 'The plasma\'s osmolality, in mOsm/kg, of each in mmol/L.',
                    v: [['n', 'Na', 'sodium (mmol/L)'], ['g', 'glucose', 'glucose (mmol/L)'], ['u', 'urea', 'urea (mmol/L)']],
                    x: '2*{n}+{g}+{u}', ex: [[140, 5, 5], 290]
                },
                {
                    t: 'Cells infected', f: 'infected = 1 − e<sup>−MOI</sup>',
                    d: 'The part of cells a virus infects at a multiplicity of infection, by Poisson.',
                    v: [['m', 'MOI', 'multiplicity of infection']],
                    x: '1-e^(-{m})', ex: [[1], 0.6321205588]
                }
            ]
        },
        {
            c: 'Statistics', list: [
                {
                    t: 'z-score', f: 'z = {{x − μ|σ}}',
                    d: 'How many standard deviations a value is above the mean.',
                    v: [['x', 'x', 'value'], ['m', 'μ', 'mean'], ['s', 'σ', 'standard deviation']],
                    x: '({x}-{m})/{s}', ex: [[85, 70, 10], 1.5],
                    zero: ['s']
                },
                {
                    t: 'Standard error', f: 'SE = {{σ|[[n]]}}',
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
                    t: 'Compound interest', f: 'A = P(1 + {{r|n}})<sup>nt</sup>',
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
                    t: 'Loan payment', f: 'M = {{Pi|1 − (1 + i)<sup>−n</sup>}}',
                    d: 'The monthly payment of a loan; i is the rate per month, n the number of months.',
                    v: [['P', 'P', 'loan'], ['r', 'r', 'rate per year, in %'], ['y', 'y', 'years']],
                    x: '{P}*{r}/1200/(1-(1+{r}/1200)^(-12*{y}))', ex: [[200000, 6, 30], 1199.101050],
                    zero: [['r', 'At 0% there is no interest: the payment is the loan ÷ the months, P ÷ (12 × y).'], 'y']
                },
                {
                    t: 'Present value', f: 'PV = {{FV|(1 + r)<sup>t</sup>}}',
                    d: 'What an amount in the future is worth today.',
                    v: [['F', 'FV', 'future amount'], ['r', 'r', 'rate per year, in %'], ['t', 't', 'years']],
                    x: '{F}/(1+{r}/100)^{t}', ex: [[1000, 5, 10], 613.9132535],
                    no: 'The rate cannot be −100%.'
                },
                {
                    t: 'Regular savings', f: 'FV = {{M((1 + i)<sup>n</sup> − 1)|i}}',
                    d: 'What a deposit each month grows to; i is the rate per month, n the number of months.',
                    v: [['M', 'M', 'deposit each month'], ['r', 'r', 'rate per year, in %'], ['y', 'y', 'years']],
                    x: '{M}*((1+{r}/1200)^(12*{y})-1)/({r}/1200)', ex: [[100, 6, 10], 16387.93468],
                    zero: [['r', 'At 0% there is no interest: the savings are M × 12 × y.'], 'y']
                },
                {
                    t: 'Growth rate per year', f: 'CAGR = (({{end|start}})<sup>1/t</sup> − 1) × 100',
                    d: 'The even yearly growth, in %, that takes start to end in t years.',
                    v: [['s', 'start', 'value at the start'], ['e', 'end', 'value at the end'], ['t', 't', 'years']],
                    x: '(({e}/{s})^(1/{t})-1)*100', ex: [[1000, 2000, 5], 14.8698355],
                    no: 'Start and end must be above 0.',
                    zero: ['s', 't']
                },
                {
                    t: 'Rule of 72', f: 'years ≈ {{72|r}}',
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
                    t: 'Percent of a number', f: 'x% of y = {{x|100}} × y',
                    d: 'A part of a number, in percent.',
                    v: [['x', 'x', 'percent'], ['y', 'y', 'number']],
                    x: '{x}/100*{y}', ex: [[15, 80], 12]
                },
                {
                    t: 'Price after discount', f: 'P × (1 − {{d|100}})',
                    d: 'A price with a discount in percent taken off.',
                    v: [['P', 'P', 'price'], ['d', 'd', 'discount, in %']],
                    x: '{P}*(1-{d}/100)', ex: [[80, 25], 60]
                },
                {
                    t: 'Price with tax', f: 'P × (1 + {{t|100}})',
                    d: 'A price with a tax or markup in percent added.',
                    v: [['P', 'P', 'price'], ['t', 't', 'tax, in %']],
                    x: '{P}*(1+{t}/100)', ex: [[100, 20], 120]
                },
                {
                    t: 'Celsius to Fahrenheit', f: '°F = °C × {{9|5}} + 32',
                    d: 'A temperature in °C, in °F.',
                    v: [['c', '°C', 'temperature']],
                    x: '{c}*9/5+32', ex: [[100], 212]
                },
                {
                    t: 'Fahrenheit to Celsius', f: '°C = (°F − 32) × {{5|9}}',
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
                    t: 'Body mass index', f: 'BMI = {{m|h<sup>2</sup>}}',
                    d: 'Weight for height; 18.5 to 25 is the usual range for adults.',
                    v: [['m', 'm', 'weight (kg)'], ['h', 'h', 'height (m)']],
                    x: '{m}/{h}²', ex: [[70, 1.75], 22.85714286],
                    zero: ['h']
                },
                {
                    t: 'Fuel use', f: 'L/100 km = {{L|km}} × 100',
                    d: 'Liters used for every 100 km driven.',
                    v: [['l', 'L', 'liters used'], ['k', 'km', 'distance driven']],
                    x: '{l}/{k}*100', ex: [[45, 600], 7.5],
                    zero: ['k']
                },
                {
                    t: 'Pace', f: 'pace = {{minutes|km}}',
                    d: 'Minutes for each kilometer; 5.5 is 5 minutes 30 seconds.',
                    v: [['t', 'min', 'time, in minutes'], ['d', 'km', 'distance']],
                    x: '{t}/{d}', ex: [[50, 10], 5],
                    zero: ['d']
                },
                {
                    t: 'Split a bill', f: 'each = {{bill × (1 + {{tip|100}})|people}}',
                    d: 'What each person pays, the tip included.',
                    v: [['b', 'bill', 'the bill'], ['t', 'tip', 'tip, in %'], ['n', 'people', 'how many pay']],
                    x: '{b}*(1+{t}/100)/{n}', ex: [[120, 15, 4], 34.5],
                    zero: ['n']
                }
            ]
        }
    ];

    // The card of the Physics panel a formula is worked out in as well, by the formula's name: [the card, its boxes
    // of the formula's letters, { letter: box }, and what else its boxes have]; a box of '+' or '||' takes the letters
    // joined so, of a network in series or in parallel. Each formula gets it as p
    var inPhysics = {
        'Final velocity': ['suvat', { u: 'u', a: 'a', t: 't' }],
        'Distance under acceleration': ['suvat', { u: 'u', a: 'a', t: 't' }],
        'Velocity after a distance': ['suvat', { u: 'u', a: 'a', s: 's' }],
        'Newton\'s second law': ['newton', { m: 'm', a: 'a' }],
        'Momentum': ['impulse', { m: 'm', v: 'v' }],
        'Kinetic energy': ['energy', { m: 'm', v: 'v' }],
        'Potential energy': ['energy', { m: 'm', h: 'h' }],
        'Work': ['work', { F: 'F', d: 'd', q: 'a' }],
        'Centripetal force': ['circular', { m: 'm', v: 'x', r: 'r' }, { given: '0' }],
        'Hooke\'s law': ['spring', { k: 'k', x: 'x' }],
        'Pendulum period': ['oscillator', { L: 'L' }, { kind: '0' }],
        'Universal gravitation': ['gravity', { m1: 'm1', m2: 'm2', r: 'r' }],
        'Free-fall time': ['suvat', { h: 's' }, { u: '0', a: '9.80665' }],
        'Projectile range': ['projectile', { v: 'v', q: 'a' }],
        'Escape velocity': ['gravity', { M: 'm1', r: 'r' }],
        'Orbital speed': ['gravity', { M: 'm1', r: 'r' }],
        'Kepler\'s third law': ['orbit', { a: 'h', M: 'M' }, { given: '0', R: '0' }],
        'Rocket equation': ['rocket', { v: 've', m0: 'm0', mf: 'mf' }, { by: '0' }],
        'Atwood machine': ['atwood', { m1: 'm1', m2: 'm2' }, { kind: '0' }],
        'Newton\'s law of cooling': ['cooling', { T0: 'T0', a: 'Ta', k: 'k', t: 't' }, { by: '1' }],
        'Reynolds number': ['reynolds', { p: 'rho', v: 'v', d: 'd', u: 'mu' }],
        'Single-slit minimum': ['slit', { m: 'm', l: 'w', a: 'a' }, { kind: '0' }],
        'Rayleigh criterion': ['slit', { l: 'w', D: 'D' }, { kind: '1' }],
        'Impedance of RLC': ['rlc', { R: 'R', L: 'L', C: 'C', f: 'f' }, { kind: '0' }],
        'LM317 output': ['lm317', { a: 'R1', b: 'R2' }, { kind: '1' }],
        'Wheatstone bridge': ['bridge', { a: 'R1', b: 'R2', c: 'R3' }],
        'Three-phase power': ['threephase', { V: 'V', I: 'I', p: 'pf' }, { kind: '0' }],
        'Schwarzschild radius': ['gravity', { M: 'm1' }],
        'Stokes\' law': ['stokes', { s: 'rs', p: 'rf', r: 'r', u: 'mu' }],
        'Dew point': ['dew', { T: 'T', h: 'rh' }, { by: '0' }],
        'Q-value': ['qvalue', { a: 'a', b: 'b' }],
        'Beat frequency': ['beats', { a: 'f1', b: 'f2' }],
        'Lensmaker\'s equation': ['lensmaker', { n: 'n', a: 'r1', b: 'r2' }],
        'Mass–energy': ['massenergy', { m: 'x' }, { of: '0' }],
        'Density': ['density', { m: 'm', V: 'V' }],
        'Pressure': ['pressure', { F: 'F', A: 'A' }],
        'Pressure under water': ['depth', { p: 'rho', h: 'h' }],
        'Buoyancy': ['buoyancy', { p: 'rho', V: 'V' }],
        'Heat energy': ['heatcap', { m: 'm', c: 'c', T: 'dT' }],
        'Wave speed': ['wave', { f: 'f', l: 'w' }],
        'Photon energy': ['photon', { f: 'x' }, { light: '1' }],
        'Snell\'s law': ['snell', { n1: 'n1', q: 'a', n2: 'n2' }],
        'Thin lens': ['lens', { f: 'f', d: 'o' }],
        'Sound level': ['decibel', { I: 'x' }, { sound: '0' }],
        'Wien\'s law': ['radiation', { T: 'T' }],
        'Ohm\'s law': ['ohm', { I: 'I', R: 'R' }],
        'Electric power': ['ohm', { V: 'V', I: 'I' }],
        'Power in a resistance': ['ohm', { I: 'I', R: 'R' }],
        'Resistors in parallel': ['network', { a: '||', b: '||' }, { part: '0' }],
        'Capacitors in series': ['network', { a: '+', b: '+' }, { part: '1' }],
        'RC time constant': ['rc', { R: 'R', C: 'C' }],
        'Resonant frequency': ['ac', { L: 'L', C: 'C' }, { kind: '2' }],
        'Coulomb\'s law': ['coulomb', { q1: 'q1', q2: 'q2', r: 'r' }],
        'Energy in a capacitor': ['capacitor', { C: 'C', V: 'V' }],
        'Half-life': ['decay', { N: 'N', t: 't', h: 'T' }]
    };

    // The card of the Biology panel a formula is worked out in, as of the Physics panel's: each formula gets it as b
    var inBiology = {
        'Hardy–Weinberg carriers': ['hardy', { p: 'p' }, { by: '0' }],
        'Recessive allele frequency': ['hardy', { a: 'q2' }, { by: '2' }],
        'Population growth, exponential': ['popgrowth', { N: 'N0', r: 'r', t: 't' }, { by: '0' }],
        'Population growth, logistic': ['popgrowth', { N: 'N0', r: 'r', t: 't', K: 'K' }, { by: '1' }],
        'Mark and recapture': ['recapture', { M: 'M', C: 'C', R: 'R' }],
        'Solute potential': ['water', { i: 'i', C: 'C', T: 'T' }],
        'Q10': ['q10', { a: 'r1', b: 'r2', t: 't1', s: 't2' }, { by: '0' }],
        'Nernst potential': ['membrane', { z: 'z', o: 'o', i: 'ins', T: 'T' }, { by: '0', ion: '4' }],
        'Michaelis–Menten': ['kinetics', { V: 'vmax', K: 'km', S: 's' }, { by: '0', inh: '0' }],
        'Hill equation': ['hill', { L: 'L', K: 'K', n: 'n' }],
        'Beer–Lambert': ['proteinconc', { A: 'a', e: 'eps', l: 'l' }, { by: '0' }],
        'DNA by A260': ['a260', { A: 'a', d: 'dil' }, { kind: '0' }],
        'PCR copies': ['pcr', { N: 'N', E: 'E', n: 'n' }],
        'Centrifuge force': ['rcf', { r: 'r', N: 'x' }, { by: '0' }],
        'Jukes–Cantor distance': ['clock', { p: 'p' }, { by: '0' }],
        'SA:V of a sphere': ['sav', { r: 'r' }, { shape: '1' }],
        'Fick\'s law': ['fick', { D: 'D', A: 'A', c: 'dC', d: 'd' }, { by: '0' }],
        'Free energy of a reaction': ['gibbs', { g: 'g', q: 'q', T: 'T' }],
        'Basal metabolic rate, men': ['body', { m: 'w', h: 'h', a: 'age' }, { sex: '1' }],
        'Basal metabolic rate, women': ['body', { m: 'w', h: 'h', a: 'age' }, { sex: '0' }],
        'Cardiac output': ['heart', { h: 'hr', s: 'sv' }],
        'Mean arterial pressure': ['heart', { s: 'sbp', d: 'dbp' }],
        'Herd immunity': ['epidemic', { R: 'R0' }],
        'Sensitivity': ['diagnostic', { a: 'tp', b: 'fn' }, { by: '0' }],
        'Specificity': ['diagnostic', { a: 'tn', b: 'fp' }, { by: '0' }],
        'Positive predictive value': ['diagnostic', { a: 'tp', b: 'fp' }, { by: '0' }],
        'Odds ratio': ['odds', { a: 'a', b: 'b', c: 'c', d: 'd' }],
        'Relative risk': ['odds', { a: 'a', b: 'b', c: 'c', d: 'd' }],
        'Renal clearance': ['kidney', { U: 'U', V: 'V', P: 'P' }, { by: '1' }],
        'Plasma osmolality': ['kidney', { n: 'na', g: 'glu', u: 'urea' }, { by: '2' }],
        'Cells infected': ['moi', { m: 'moi' }]
    };

    // the formulas of money that a card of the solver's Finance tab works out, as inPhysics has them; each gets it as fin
    var inFinance = {
        'Compound interest': ['savings', { P: 'start', r: 'rate', n: 'm', t: 'years' }],
        'Continuous compounding': ['savings', { P: 'start', r: 'rate', t: 'years' }, { m: 'inf' }],
        'Loan payment': ['schedule', { P: 'loan', r: 'rate', y: 'years' }],
        'Regular savings': ['savings', { M: 'add', r: 'rate', y: 'years' }, { start: '0' }],
        'Split a bill': ['tip', { b: 'bill', t: 'pct', n: 'people' }]
    };

    formulas.forEach(function (group) {
        group.list.forEach(function (f) {
            if (inPhysics[f.t]) f.p = inPhysics[f.t];
            if (inBiology[f.t]) f.b = inBiology[f.t];
            if (inFinance[f.t]) f.fin = inFinance[f.t];
        });
    });

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
                { s: 'k<sub>e</sub>', t: 'Coulomb constant', v: 8.9875517862e9, u: 'N·m<sup>2</sup>/C<sup>2</sup>', d: '1 ÷ 4πε<sub>0</sub>, in Coulomb\'s law.' },
                { s: 'l<sub>P</sub>', t: 'Planck length', v: 1.616255e-35, u: 'm', d: 'The scale where gravity and quantum physics meet: √(ħG ÷ c³).' },
                { s: 't<sub>P</sub>', t: 'Planck time', v: 5.391247e-44, u: 's', d: 'The time light takes to cross a Planck length.' },
                { s: 'm<sub>P</sub>', t: 'Planck mass', v: 2.176434e-8, u: 'kg', d: '√(ħc ÷ G).' },
                { s: 'T<sub>P</sub>', t: 'Planck temperature', v: 1.416784e32, u: 'K', d: 'm<sub>P</sub>c<sup>2</sup> ÷ k<sub>B</sub>: the hottest that physics as known can tell of.' },
                { s: 'Z<sub>0</sub>', t: 'Impedance of free space', v: 376.730313412, u: 'Ω', d: 'μ<sub>0</sub>c: of a radio wave in a vacuum, its electric field over its magnetic.' }
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
                { s: 'eV', t: 'Electronvolt', v: 1.602176634e-19, u: 'J', d: 'The energy an electron gains across 1 volt. Exact.' },
                { s: 'm<sub>μ</sub>', t: 'Muon mass', v: 1.883531627e-28, u: 'kg', d: 'About 207 times the electron\'s.' },
                { s: 'm<sub>α</sub>', t: 'Alpha particle mass', v: 6.644657345e-27, u: 'kg', d: 'A helium-4 nucleus.' },
                { s: 'r<sub>e</sub>', t: 'Classical electron radius', v: 2.8179403205e-15, u: 'm', d: '' },
                { s: 'λ<sub>C</sub>', t: 'Compton wavelength', v: 2.42631023538e-12, u: 'm', d: 'Of an electron: h ÷ m<sub>e</sub>c.' },
                { s: 'μ<sub>B</sub>', t: 'Bohr magneton', v: 9.2740100657e-24, u: 'J/T', d: 'About the magnetic moment of an electron.' },
                { s: 'μ<sub>N</sub>', t: 'Nuclear magneton', v: 5.0507837393e-27, u: 'J/T', d: 'The Bohr magneton of a proton.' },
                { s: 'Φ<sub>0</sub>', t: 'Magnetic flux quantum', v: 2.067833848461929e-15, u: 'Wb', d: 'h ÷ 2e, in superconductors. Exact.' },
                { s: 'G<sub>0</sub>', t: 'Conductance quantum', v: 7.748091729863649e-5, u: 'S', d: '2e<sup>2</sup> ÷ h. Exact.' },
                { s: 'K<sub>J</sub>', t: 'Josephson constant', v: 483597.8484169836e9, u: 'Hz/V', d: '2e ÷ h, of the standard of the volt. Exact.' },
                { s: 'R<sub>K</sub>', t: 'Von Klitzing constant', v: 25812.80745930451, u: 'Ω', d: 'h ÷ e<sup>2</sup>, of the standard of the ohm. Exact.' }
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
                { s: 'c<sub>w</sub>', t: 'Specific heat of water', v: 4186, u: 'J/(kg·K)', d: 'About: the heat to warm 1 kg of water by 1 °C.' },
                { s: 'L<sub>f</sub>', t: 'Latent heat of melting ice', v: 334000, u: 'J/kg', d: 'About: the heat to melt 1 kg of ice at 0 °C.' },
                { s: 'L<sub>v</sub>', t: 'Latent heat of boiling water', v: 2.26e6, u: 'J/kg', d: 'About: the heat to boil away 1 kg of water at 100 °C.' }
            ]
        },
        {
            c: 'Earth and space', list: [
                { s: 'g', t: 'Standard gravity', v: 9.80665, u: 'm/s<sup>2</sup>', d: 'The acceleration of a fall on Earth. Exact by definition.' },
                { s: 'atm', t: 'Standard atmosphere', v: 101325, u: 'Pa', d: 'Air pressure at sea level. Exact by definition.' },
                { s: 'bar', t: 'Bar', v: 100000, u: 'Pa', d: 'Close to the air pressure at sea level. Exact by definition.' },
                { s: 'v<sub>s</sub>', t: 'Speed of sound', v: 343, u: 'm/s', d: 'In dry air at 20 °C, about.' },
                { s: 'v<sub>w</sub>', t: 'Speed of sound in water', v: 1481, u: 'm/s', d: 'In fresh water at 20 °C, about.' },
                { s: 'M<sub>⊕</sub>', t: 'Mass of the Earth', v: 5.9722e24, u: 'kg', d: '' },
                { s: 'R<sub>⊕</sub>', t: 'Radius of the Earth', v: 6.371e6, u: 'm', d: 'The mean radius.' },
                { s: 'v<sub>esc</sub>', t: 'Escape velocity from the Earth', v: 11186, u: 'm/s', d: 'About; from the surface, √(2GM ÷ R). Enough to leave for good.' },
                { s: 'd<sub>⊕</sub>', t: 'Distance from the Earth to the Sun', v: 1.49598e11, u: 'm', d: 'The mean distance, about 1 au.' },
                { s: 'M<sub>☾</sub>', t: 'Mass of the Moon', v: 7.346e22, u: 'kg', d: '' },
                { s: 'g<sub>☾</sub>', t: 'Gravity on the Moon', v: 1.62, u: 'm/s<sup>2</sup>', d: 'About a sixth of the Earth\'s.' },
                { s: 'd<sub>☾</sub>', t: 'Distance to the Moon', v: 3.844e8, u: 'm', d: 'The mean distance, 384,400 km.' },
                { s: 'M<sub>♂</sub>', t: 'Mass of Mars', v: 6.4169e23, u: 'kg', d: 'About a ninth of the Earth\'s.' },
                { s: 'R<sub>♂</sub>', t: 'Radius of Mars', v: 3.3895e6, u: 'm', d: 'The mean radius, about half the Earth\'s.' },
                { s: 'g<sub>♂</sub>', t: 'Gravity on Mars', v: 3.73, u: 'm/s<sup>2</sup>', d: 'About 38% of the Earth\'s.' },
                { s: 'sol', t: 'Day on Mars', v: 88775.244, u: 's', d: 'A sol: 24 h 39 min 35 s.' },
                { s: 'd<sub>♂</sub>', t: 'Distance from Mars to the Sun', v: 2.2794e11, u: 'm', d: 'The mean distance, about 1.52 au.' },
                { s: 'M<sub>☉</sub>', t: 'Mass of the Sun', v: 1.9884e30, u: 'kg', d: '' },
                { s: 'R<sub>☉</sub>', t: 'Radius of the Sun', v: 6.957e8, u: 'm', d: 'The nominal value, about 109 Earth radii.' },
                { s: 'L<sub>☉</sub>', t: 'Luminosity of the Sun', v: 3.828e26, u: 'W', d: 'The power the Sun gives off.' },
                { s: 'T<sub>☉</sub>', t: 'Temperature of the Sun', v: 5772, u: 'K', d: 'Of its surface, the nominal value.' },
                { s: 'S<sub>0</sub>', t: 'Solar constant', v: 1361, u: 'W/m<sup>2</sup>', d: 'The sunlight on 1 m² above the air, at the Earth\'s distance.' },
                { s: 'H<sub>0</sub>', t: 'Hubble constant', v: 70, u: 'km/(s·Mpc)', d: 'About; measures give 67 to 73: how fast the universe grows.' },
                { s: 'au', t: 'Astronomical unit', v: 149597870700, u: 'm', d: 'About the distance from the Earth to the Sun. Exact by definition.' },
                { s: 'ly', t: 'Light-year', v: 9.4607304725808e15, u: 'm', d: 'The distance light travels in a year.' },
                { s: 'pc', t: 'Parsec', v: 3.0856775814913673e16, u: 'm', d: 'About 3.26 light-years.' }
            ]
        },
        {
            c: 'Biology', list: [
                { s: 'bp', t: 'Mass of a base pair', v: 617.96, u: 'g/mol', d: 'Of double-stranded DNA, as NEB has it; some 650 with its sodium.' },
                { s: 'nt', t: 'Mass of a nucleotide', v: 308.97, u: 'g/mol', d: 'Of single-stranded DNA; of RNA some 321.5.' },
                { s: 'aa', t: 'Mass of an amino acid', v: 110, u: 'Da', d: 'The mean in a protein, about: a protein of 300 is some 33 kDa.' },
                { s: 'A<sub>260</sub>', t: 'dsDNA of an A260 of 1', v: 50, u: 'µg/mL', d: 'Of RNA 40, of single-stranded DNA 33.' },
                { s: 'OD<sub>600</sub>', t: 'E. coli of an OD600 of 1', v: 8e8, u: 'cells/mL', d: 'About; it differs with the spectrophotometer.' },
                { s: 'h<sub>c</sub>', t: 'A haemocytometer\'s large square', v: 1e-4, u: 'mL', d: '1 mm by 1 mm, 0.1 mm deep: count × 10⁴ is cells/mL.' },
                { s: 'G<sub>human</sub>', t: 'Human genome', v: 3.1e9, u: 'bp', d: 'Haploid, about; some 3.3 pg of DNA, and 20,000 genes coding for proteins.' },
                { s: 'ΔG<sub>ATP</sub>', t: 'ATP to ADP', v: -30.5, u: 'kJ/mol', d: 'ΔG°′ of its hydrolysis; in a cell some −50.' },
                { s: 'RT<sub>37</sub>', t: 'RT at 37 °C', v: 2.5787, u: 'kJ/mol', d: 'Of the body\'s temperature, 310.15 K.' },
                { s: 'RT/F', t: 'RT/F at 37 °C', v: 26.73, u: 'mV', d: 'Of Nernst\'s equation: × ln 10, 61.5 mV each tenfold of a monovalent ion.' },
                { s: 'T<sub>body</sub>', t: 'Body temperature', v: 37, u: '°C', d: 'Of people, about: 36.1 to 37.2.' },
                { s: 'Hb', t: 'O₂ a gram of haemoglobin holds', v: 1.34, u: 'mL', d: 'Hüfner\'s number, as used in the clinic: 1.34 to 1.39.' }
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

    // [[under]] in how a formula is written is drawn as a root, and {{top|bottom}} as a fraction,
    // one part over the other; one inside another is drawn by the same rule
    function draw(text) {
        var out = text, prev;
        do {
            prev = out;
            out = out.replace(/\[\[((?:(?!\[\[|\]\])[\s\S])*)\]\]/g, function (m, inner) {
                return '<span class="calc-root">' + inner + '</span>'; // the √ and its bar, drawn by the style
            });
            out = out.replace(/\{\{((?:(?!\{\{|\}\})[^|])*)\|((?:(?!\{\{|\}\}).)*)\}\}/g, function (m, top, bottom) {
                return '<span class="calc-fr"><span>' + top + '</span><span>' + bottom + '</span></span>';
            });
        } while (out !== prev);
        return out;
    }
    formulas.forEach(function (group) {
        group.list.forEach(function (item) { item.f = draw(item.f); });
    });

    // Examples of the graph, by group: t its name, f what it types, a box for each; d what it
    // is. p: the values of its sliders, [value, from, to]; fit: the best fit of its points;
    // v: the view, [x from, to, y from, to], all of it shown, and with stretch each of them
    // filling the plot, x and y apart; rad: drawn in Rad, its t or x being a number and not an angle;
    // play: the sliders that play as it is drawn; hue: the colors of its boxes, in place of the first ones
    var graphs = [
        {
            c: 'Functions', list: [
                { t: 'Line', f: ['y = 2x + 1'], d: 'A slope of 2, meeting the y axis at 1.' },
                { t: 'Parabola', f: ['x^2 - 4'], d: 'Its low at (0, –4) and its roots at ±2.' },
                { t: 'Cubic', f: ['x^3 - 3x'], d: 'A high, a low, and where it bends the other way between them.' },
                { t: 'Sine and cosine', f: ['sin(x)', 'cos(x)'], d: 'The two waves, a quarter of a turn apart. They follow Deg, Rad or Grad.' },
                { t: 'Tangent', f: ['tan(x)'], d: 'Going off at each quarter turn, and again from below.' },
                { t: 'Growth and decay', f: ['2^x', '(1/2)^x'], d: 'Doubling and halving at each step of x, both through (0, 1).' },
                { t: 'Logarithms', f: ['ln(x)', 'log(x)'], d: 'The natural logarithm and the one to the base 10, both through (1, 0).' },
                { t: 'Square root', f: ['sqrt(x)'], d: 'Only where x is 0 or more.' },
                { t: 'Absolute value', f: ['abs(x)'], d: 'A V, with its corner at 0.' },
                { t: 'Reciprocal', f: ['1/x'], d: 'Two branches, nearing the axes without meeting them.' },
                { t: 'Bell curve', f: ['e^(-x^2/2)'], d: 'The normal curve, highest at 0 and bending at ±1.' },
                { t: 'Sinc', f: ['sin(x)/x'], d: 'A wave that dies away, 1 at 0.', rad: true }
            ]
        },
        {
            c: 'Sliders', list: [
                { t: 'Wave', f: ['a sin(bx + c)'], d: 'a stretches it up, b squeezes it across, c moves it along. Drag them or press ▶.',
                    p: { a: [2, -5, 5], b: [1, 0, 5], c: [0, -5, 5] }, rad: true },
                { t: 'Vertex form', f: ['a(x - h)^2 + k'], d: 'A parabola with its turn at (h, k).', p: { a: [1, -3, 3], h: [2, -8, 8], k: [-3, -8, 8] } },
                { t: 'Slope and intercept', f: ['m x + b'], d: 'A line of slope m meeting the y axis at b.', p: { m: [2, -5, 5], b: [1, -8, 8] } },
                { t: 'Exponential', f: ['a e^(k x)'], d: 'Growing for k above 0, dying away below it.', p: { a: [1, -5, 5], k: [0.5, -2, 2] } }
            ]
        },
        {
            c: 'Equations', list: [
                { t: 'Circle', f: ['x^2 + y^2 = 25'], d: 'All the places 5 from the middle.' },
                { t: 'Ellipse', f: ['x^2/16 + y^2/9 = 1'], d: '4 across each way, 3 up and down.' },
                { t: 'Hyperbola', f: ['x^2 - y^2 = 4'], d: 'Two branches, opening left and right.' },
                { t: 'Parabola on its side', f: ['x = y^2 - 4'], d: 'x as a function of y.' },
                { t: 'Heart', f: ['(x^2 + y^2 - 1)^3 = x^2 y^3'], d: 'A heart, as an equation of x and y.', v: [-2, 2, -1.6, 1.8] },
                { t: 'Folium of Descartes', f: ['x^3 + y^3 = 6x y'], d: 'A loop and two arms going off along y = –x – 2.' }
            ]
        },
        {
            c: 'Inequalities', list: [
                { t: 'Under a curve', f: ['y < x^2 - 4'], d: 'Shaded where it holds; its edge is dashed, not in it.' },
                { t: 'Disc', f: ['x^2 + y^2 <= 9'], d: 'Inside the circle, the circle too.' },
                { t: 'Band', f: ['-2 < y < 2'], d: 'Two inequalities at once, between the lines.' },
                { t: 'Between two curves', f: ['x^2 < y < 4'], d: 'Above the parabola and under y = 4. The area button finds 32/3.' },
                { t: 'Overlap', f: ['y >= x', 'y <= 6 - x'], d: 'Each shaded in its color, darker where both hold.' }
            ]
        },
        {
            c: 'Polar', list: [
                { t: 'Rose', f: ['r = 4cos(2θ)'], d: 'Four petals; with 3θ, three.' },
                { t: 'Cardioid', f: ['r = 2 + 2cos(θ)'], d: 'The heart drawn by a point of a circle rolling round another.' },
                { t: 'Limaçon', f: ['r = 1 + 2cos(θ)'], d: 'A loop within a loop.' },
                { t: 'Spiral', f: ['r = θ/2 {0, 6π}'], d: 'Going out as it goes round, three times.', rad: true },
                { t: 'Lemniscate', f: ['r = sqrt(16cos(2θ))'], d: 'A figure of eight, where cos 2θ is 0 or more.' },
                { t: 'Butterfly', f: ['r = e^(sin θ) - 2cos(4θ)'], d: 'Wings drawn by one curve of θ.' }
            ]
        },
        {
            c: 'Parametric', list: [
                { t: 'Circle of t', f: ['(3cos t, 3sin t)'], d: 'x and y each a function of t, going once round.' },
                { t: 'Lissajous', f: ['(4sin(3t), 4sin(2t))'], d: 'Two waves across each other, 3 to 2.' },
                { t: 'Astroid', f: ['(4cos(t)^3, 4sin(t)^3)'], d: 'A star of four points.' },
                { t: 'Epicycloid', f: ['(5cos t - cos(5t), 5sin t - sin(5t))'], d: 'A point of a circle rolling round another, four times its size.' },
                { t: 'Cycloid', f: ['(t - sin t, 1 - cos t) {0, 6π}'], d: 'A point of a wheel rolling along the x axis.', rad: true }
            ]
        },
        {
            c: 'Sequences', list: [
                { t: 'Compound growth', f: ['a(n) = 1.05a(n - 1) {a(1) = 100}'], d: '100 growing by 5% a step, each term of the one before: a dot at each whole n.',
                    v: [-3, 53, -100, 1300], stretch: true },
                { t: 'Fibonacci', f: ['a(n) = a(n - 1) + a(n - 2) {a(1) = 1, a(2) = 1} {1, 15}'], d: 'Each term the sum of the two before it, from 1 and 1, for 15 terms.',
                    v: [-1, 16, -40, 660], stretch: true },
                { t: 'Odd numbers', f: ['a(n) = 2n + 1 {0, 20}'], d: 'A term of n alone, from n = 0 to 20.', v: [-2, 22, -4, 45], stretch: true },
                { t: 'Halving', f: ['a(n) = a(n - 1)/2 + 1 {a(0) = 10}'], d: 'Each term half the one before, and 1: it settles at 2.', v: [-2, 22, -1, 11], stretch: true }
            ]
        },
        {
            c: 'Slope fields', list: [
                { t: 'Toward a line', f: ['dy/dx = x - y {y(0) = 1, y(0) = -2}'], d: 'The slope at each place, and two solutions: every one comes to the line y = x – 1. Click for more.',
                    v: [-5, 5, -5, 5] },
                { t: 'k times itself', f: ['dy/dx = k y {y(0) = 1}'], d: 'y growing as fast as k times itself: drag k, above 0 it grows, below 0 it dies away.',
                    p: { k: [0.5, -1, 1] }, v: [-4, 5, -1, 10], stretch: true },
                { t: 'Cooling', f: ['dy/dx = -0.2(y - 20) {y(0) = 90, y(0) = 5}'], d: 'Newton\'s cooling: tea at 90° and a drink at 5°, both settling at a room\'s 20°.',
                    v: [-2, 25, -5, 100], stretch: true },
                { t: 'Logistic', f: ['dy/dx = 0.8y(1 - y/10) {y(0) = 0.5}'], d: 'Growth that slows as it nears 10, all there is room for.', v: [-3, 12, -2, 12], stretch: true },
                { t: 'Circles', f: ['dy/dx = -x/y {y(0) = 3}'], d: 'Each solution part of a circle about 0: it stops where it goes straight down.', v: [-5, 5, -5, 5] }
            ]
        },
        {
            c: 'Pieces and parts', list: [
                { t: 'In two pieces', f: ['{x < 0: -x, x^2}'], d: '–x left of 0, x² from there: the first piece that holds.' },
                { t: 'Sign', f: ['{x < 0: -1, x > 0: 1}'], d: '–1 or 1, with nothing at 0.' },
                { t: 'Steps', f: ['{x < 1: 0, x < 2: 1, x < 3: 2, 3}'], d: 'A staircase: the last piece is where none before holds.' },
                { t: 'Part of a curve', f: ['x^2 {0 < x < 3}'], d: 'x² only between 0 and 3.' },
                { t: 'Top of a circle', f: ['x^2 + y^2 = 16 {y > 0}'], d: 'An equation kept to where y is above 0.' },
                { t: 'Humps', f: ['sin(x) {y > 0}'], d: 'A wave kept to where its value is above 0.' }
            ]
        },
        {
            c: 'Functions named', list: [
                { t: 'A function and its slope', f: ['f(x) = x^3 - 3x', "f'(x)"], d: 'f′ is 0 where f is highest and lowest.' },
                { t: 'Sine, its slope and the next', f: ['f(x) = sin(x)', "f'(x)", "f''(x)"], d: 'Each slope is the one before a quarter of a turn on.', rad: true },
                { t: 'Moved', f: ['f(x) = x^2', 'f(x - 3) + 1'], d: 'f moved 3 right and 1 up.' },
                { t: 'Stretched', f: ['g(x) = sin(x)', 'g(2x)', '2g(x)'], d: 'Squeezed across, and stretched up.', rad: true }
            ]
        },
        {
            c: 'Points', list: [
                { t: 'Along a line', f: ['(1, 2), (2, 4.1), (3, 5.9), (4, 8.2), (5, 9.8)'], d: 'With the line nearest them; point at it for r².', fit: 'lin' },
                { t: 'Thrown up', f: ['(0, 0), (1, 4.2), (2, 6.1), (3, 6.3), (4, 3.9), (5, 0.2)'], d: 'Heights of a ball, with the parabola nearest them.', fit: 'quad' },
                { t: 'Doubling', f: ['(0, 1), (1, 1.9), (2, 4.2), (3, 7.8), (4, 16.5)'], d: 'Growth, with the exponential nearest it.', fit: 'exp', v: [-1, 6, -2, 18] }
            ]
        },
        {
            c: 'Fun', list: [
                { t: 'Standing wave', f: ['sin(x - p)', 'sin(x + p)', 'sin(x - p) + sin(x + p)'],
                    d: 'Two waves going opposite ways, and their sum, which only grows and shrinks: it is 0 at the same places always.', p: { p: [0, 0, 6.28] }, play: ['p'], v: [-7, 7, -3, 3], rad: true },
                { t: 'Bouncing ball', f: ['0.4 + 4e^(-(x + 9)/8)abs(sin(x)) {-9 < x < b}', '(b + 0.4cos(t), 0.4 + 4e^(-(b + 9)/8)abs(sin(b)) + 0.4sin(t))'],
                    d: 'A ball at b, a little lower each bounce, and the path it leaves behind it.', p: { b: [-9, -9, 9] }, play: ['b'], v: [-10, 10, -2, 6], rad: true },
                { t: 'Sun, Earth and Moon', f: ['x^2 + y^2 = 25', '(5cos(t) + cos(12t), 5sin(t) + sin(12t))', '(5cos(a) + 0.55cos(t), 5sin(a) + 0.55sin(t))',
                    '(5cos(a) + cos(12a) + 0.22cos(t), 5sin(a) + sin(12a) + 0.22sin(t))', 'x^2 + y^2 <= 1'],
                    d: 'The Earth going once round the Sun as a goes to 2π, the Moon twelve times round it, along the loops it draws.', p: { a: [0, 0, 6.28] }, play: ['a'], v: [-7, 7, -7, 7], rad: true },
                { t: 'Golden spiral', f: ['r = ((1 + √5)/2)^(2(θ + w)/π) {-8π, 2π}', 'r = -((1 + √5)/2)^(2(θ + w)/π) {-8π, 2π}'],
                    d: 'Two arms growing by the golden ratio, (1 + √5)/2, each quarter turn. Turned by w it is the same spiral, only bigger: it seems to come at you.',
                    p: { w: [0, 0, 3.14] }, play: ['w'], v: [-8, 8, -8, 8], rad: true },
                { t: 'Heart curve', f: ['(16sin(t)^3, 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t))'], d: 'A heart, x and y each a sum of waves of t.',
                    hue: [1, 0, 2, 3, 4, 5, 6], v: [-20, 20, -20, 15] },
                { t: 'Atom', f: ['x^2 + y^2 <= 0.5', '(5cos(t), 1.8sin(t))', '(2.5cos(t) - 1.56sin(t), 4.33cos(t) + 0.9sin(t))', '(-2.5cos(t) - 1.56sin(t), 4.33cos(t) - 0.9sin(t))',
                    '(5cos(a) + 0.35cos(t), 1.8sin(a) + 0.35sin(t))', '(2.5cos(a + 2) - 1.56sin(a + 2) + 0.35cos(t), 4.33cos(a + 2) + 0.9sin(a + 2) + 0.35sin(t))',
                    '(-2.5cos(a + 4) - 1.56sin(a + 4) + 0.35cos(t), 4.33cos(a + 4) - 0.9sin(a + 4) + 0.35sin(t))'],
                    d: 'A nucleus, three orbits, each an ellipse turned 60° on from the one before, and an electron going round each as a plays: all seven boxes.',
                    p: { a: [0, 0, 6.28] }, play: ['a'], v: [-6, 6, -6, 6], rad: true },
                { t: 'Phases of the Moon', f: ['x^2 + y^2 <= 9 {x > k sqrt(9 - y^2)}', 'x^2 + y^2 = 9'],
                    d: 'Lit where x is more than k√(9 – y²): new at k = 1, half at 0, full at –1.', p: { k: [0, -1, 1] }, play: ['k'], v: [-4, 4, -4, 4] },
                { t: 'Spirograph', f: ['(2cos(t) + d cos(2t/3), 2sin(t) - d sin(2t/3)) {0, 6π}', '(6cos(t) - d cos(6t), 6sin(t) - d sin(6t))'],
                    d: 'A pen in a wheel rolling inside a ring, and in one rolling round it; d is how far the pen is from the middle of its wheel.', p: { d: [1, 0, 3] }, play: ['d'], v: [-9, 9, -9, 9], rad: true },
                { t: 'Pendulum', f: ['(t sin(a), -t cos(a)) {0, 4}', '(4sin(a) + 0.45cos(t), -4cos(a) + 0.45sin(t))', '(4sin(t), -4cos(t)) {-0.7, 0.7}', '0 {-1 < x < 1}'],
                    d: 'A rod, the bob at its end and the arc it swings on, a its angle.', p: { a: [0.7, -0.7, 0.7] }, play: ['a'], v: [-5, 5, -5.5, 1], rad: true }
            ]
        }
    ];

    root.CalcFormulas = { formulas: formulas, constants: constants, graphs: graphs, fill: fill, why: why };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcFormulas;
    }
})(typeof window !== 'undefined' ? window : this);
