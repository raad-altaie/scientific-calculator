// What the keys above the digits do, for the tips shown while the pointer is
// over one. Keyed by a key's name as main.js reads it from its label, so a
// key turned by 2nd has the tip of its second function.
// t: name, d: what it does (HTML),
// k: keyboard shortcut, second: the function 2nd gives it
(function (root) {
    'use strict';

    root.CalcTips = {
        '2nd': {
            t: '2nd',
            d: 'Switches sin, cos, tan, sinh, cosh, tanh, ln, e<sup>x</sup>, log, π and y<sup>x</sup> to their ' +
                'second functions: sin<sup>-1</sup> …, log<sub>2</sub>, 2<sup>x</sup>, 10<sup>x</sup>, e and ' +
                'log<sub>y</sub>. Click again to switch back.',
            k: 'Space'
        },
        'Deg': {
            t: 'Degrees',
            d: 'Works angles out in degrees: sin 30 = 0.5. The display shows the unit in use at its bottom left; ' +
                'click it there to switch as well.',
            k: 'd'
        },
        'Rad': {
            t: 'Radians',
            d: 'Works angles out in radians: sin π ÷ 6 = 0.5. The display shows the unit in use at its bottom ' +
                'left; click it there to switch as well.',
            k: 'd'
        },
        'Grad': {
            t: 'Gradians',
            d: 'Works angles out in gradians, 400 to a full turn: sin 100 = 1. The display shows the unit in use ' +
                'at its bottom left; click it there to switch as well.',
            k: 'd'
        },
        // the unit at the bottom left of the display
        'unit Rad': {
            t: 'Radians',
            d: 'Angles are in radians: a full turn is 2π (6.283…), so sin π ÷ 2 = 1. Click to switch to ' +
                'degrees, where a full turn is 360°.',
            k: 'd'
        },
        'unit Deg': {
            t: 'Degrees',
            d: 'Angles are in degrees: a full turn is 360°, so sin 90 = 1. Click to switch to gradians, where a ' +
                'full turn is 400.',
            k: 'd'
        },
        'unit Grad': {
            t: 'Gradians',
            d: 'Angles are in gradians: a full turn is 400, a right angle 100, so sin 100 = 1. Click to switch to ' +
                'radians, where a full turn is 2π.',
            k: 'd'
        },
        // the other marks in the display
        'FRAC': {
            t: 'Fraction mode is on',
            d: 'Each ÷ is drawn as a fraction and results are shown as fractions. Click to turn it off, as the ' +
                'a/b key does.',
            k: 'f'
        },
        'DMS': {
            t: 'Degrees, minutes and seconds are on',
            d: 'Results are shown as 36°52′11.63″. Click to turn it off, as the °′″ key does.',
            k: 'h, f'
        },
        'hold': {
            t: 'Hold',
            d: 'The next key gives its other function: s gives sinh, 2 gives x<sup>2</sup>, l gives ' +
                'log<sub>2</sub>. Click to let it go.',
            k: 'h'
        },
        // DEL and AC: they work by keys, not by characters
        'DEL': {
            t: 'Take back',
            d: 'Takes back the last key you pressed, a digit, operator, bracket or function, up to 50 keys. ' +
                'With the cursor in the equation, it removes what is before the cursor.',
            k: 'Backspace'
        },
        'C': {
            t: 'Clear the number',
            d: 'Clears only the number you are typing, to type it again; the rest of the equation stays. Then ' +
                'the key turns into AC.',
            k: 'Delete'
        },
        'AC': {
            t: 'All clear',
            d: 'Clears the whole calculation, to start again. Ans, the memory and the history stay.',
            k: 'Delete'
        },

        // the ? beside the name
        'open big': {
            t: 'Open big',
            d: 'The calculator in a big window of its own, with every tool a click away down its left side. ' +
                'This one closes.',
            k: ''
        },
        // the same on the website (app.js), in Advanced mode
        'open advanced': {
            t: 'Advanced',
            d: 'The calculator with every tool a click away down its left side, as Advanced mode opens it.',
            k: ''
        },
        'help': {
            t: 'Options and guide',
            d: 'The options: the panels and the number format, and a guide ' +
                'to what each key does and its keyboard shortcut.',
            k: ''
        },

        // the formulas and constants
        'formulas': {
            t: 'Formulas and constants',
            d: 'Well-known formulas: fill in their letters to put the equation into the display, where you can still change it before =. ' +
                'Constants of math and science, to put in as a number. Search to find one.',
            k: ''
        },
        'STO': {
            t: 'Store',
            d: 'A letter, A to J, now takes the result: the line is worked out as = does, 5 + 3 → A. ' +
                'Alt+A does it in one. Any other key, or a click here, lets it go.',
            k: 'Esc'
        },
        'letters clear': {
            t: 'Clear the variables',
            d: 'Every letter, A to J, back to 0.',
            k: ''
        },
        'formulas close': {
            t: 'Close the formulas',
            d: 'The search stays for the next time.',
            k: 'Esc'
        },

        // the converter
        'converter': {
            t: 'Converter',
            d: 'Length, area, volume, mass, temperature, speed, time, data, pressure, energy, power, angles and ' +
                'fuel economy. The result shown is the value to start from; click a converted value to put it in. ' +
                'Its Dates tab counts the days between two dates and moves a date on.',
            k: ''
        },
        'converter close': {
            t: 'Close the converter',
            d: 'The value, the units and the dates stay for the next time.',
            k: 'Esc'
        },

        // the solver
        'solve': {
            t: 'Solve',
            d: 'Equations and inequalities solved for x, in exact form as well, as (1 + √5)/2; polynomials, linear equations and where ' +
                'two curves meet; integrals, slopes, sums, limits and Taylor series; the normal, binomial and other distributions, and ' +
                'confidence intervals; and loans, savings, bonds, NPV and IRR. Click a result to put it in.',
            k: ''
        },
        'solve close': {
            t: 'Close the solver',
            d: 'What you typed stays for the next time.',
            k: 'Esc'
        },
        'solve tab solve': {
            t: 'Solve',
            d: 'Equations and inequalities of x, turning points, polynomials, linear equations and two curves.',
            k: ''
        },
        'solve tab calculus': {
            t: 'Calculus',
            d: 'Integrals, slopes, sums and products, limits, Taylor series, areas between curves, arc lengths and differential equations.',
            k: ''
        },
        'solve tab finance': {
            t: 'Finance',
            d: 'Money over time, as a BA II Plus works it out: N, I/Y, PV, PMT and FV, the one left empty found; NPV, IRR and payback of ' +
                'cash flows; a loan\'s payment schedule, by year or by payment; savings growth; APR and APY, each of the other; a bond\'s price or ' +
                'yield; depreciation; break-even; inflation; and percentage change and markup.',
            k: ''
        },
        'solve tab geometry': {
            t: 'Geometry',
            d: 'A triangle of any three of its sides and angles, the area and perimeter of shapes, the volume and surface of solids, two points and ' +
                'the line through them, the circle through three points, and the area of a polygon of its corners.',
            k: ''
        },
        'solve tab chance': {
            t: 'Probability',
            d: 'The normal, t, χ², F, binomial, Poisson and other distributions, confidence intervals and random whole numbers.',
            k: ''
        },
        'choice due 0': {
            t: 'At the end',
            d: 'Each payment at the end of its period, as a loan is paid, or a saving added: END on a BA II Plus.',
            k: ''
        },
        'choice due 1': {
            t: 'At the start',
            d: 'Each payment at the start of its period, as rent is paid or a saving put in: BGN on a BA II Plus.',
            k: ''
        },
        'choice way 0': {
            t: 'Straight line',
            d: 'The same each year: the cost less the salvage value, over the years.',
            k: ''
        },
        'choice way 1': {
            t: 'Declining balance',
            d: 'Double declining: twice the straight line\'s rate of what is left each year, more at first, then the straight line once that loses more, down to the salvage value.',
            k: ''
        },
        'choice by 0': {
            t: 'By year',
            d: 'A row of each year: the interest and the principal paid in it, and what is left of the loan at its end.',
            k: ''
        },
        'choice by 1': {
            t: 'By payment',
            d: 'A row of each payment, up to 600 of them: the interest and the principal of it, and what is left after it.',
            k: ''
        },
        'choice circuit 0': {
            t: 'Series',
            d: 'R, L and C one after another, the same current through each: their impedances added, Z = R + i(ωL – 1/ωC).',
            k: ''
        },
        'choice circuit 1': {
            t: 'Parallel',
            d: 'R, L and C side by side, the same voltage across each: 1/Z = 1/R + 1/(iωL) + iωC.',
            k: ''
        },
        'choice enc 2': {
            t: 'Base64',
            d: 'Of A–Z, a–z, 0–9, + and /: four letters for each three bytes, as email attachments and data: addresses have them. And of web addresses, - and _ for + and /.',
            k: ''
        },
        'choice enc 0': {
            t: 'Base32',
            d: 'Of A–Z and 2–7, by RFC 4648: eight letters for each five bytes, as the secret keys of two-step sign-in apps are.',
            k: ''
        },
        'choice enc 1': {
            t: 'Base58',
            d: 'As Bitcoin addresses and IPFS are written: no 0, O, I or l, which look alike, and no + or /.',
            k: ''
        },
        'choice enc 3': {
            t: 'Base85',
            d: 'Ascii85, as PDF and PostScript have it: five letters, ! to u, for each four bytes, z for four 0s.',
            k: ''
        },
        'choice do 0': {
            t: 'Make',
            d: 'Five new UUIDs, of the version chosen under it.',
            k: ''
        },
        'choice do 1': {
            t: 'Read',
            d: 'A UUID typed or pasted: its version and variant, the time it was made, and it written other ways.',
            k: ''
        },
        'choice ver 0': {
            t: 'Version 4',
            d: 'Five UUIDs all random but for 6 bits of their version and variant: 122 random bits, as most UUIDs are. Click it again for five more.',
            k: ''
        },
        'choice ver 1': {
            t: 'Version 7',
            d: 'Five UUIDs of the Unix time now, to the millisecond, then random bits: they sort in the order they were made, as keys of a database are best. Click it again for five more.',
            k: ''
        },
        'choice convert 0': {
            t: 'Unix → Date',
            d: 'A Unix timestamp, the seconds from 1 January 1970 in UTC, for its date and time.',
            k: ''
        },
        'choice convert 1': {
            t: 'Date → Unix',
            d: 'A date and a time for its Unix timestamp.',
            k: ''
        },
        'choice zone 0': {
            t: 'UTC',
            d: 'The date and time typed are in UTC, as a timestamp is counted.',
            k: ''
        },
        'choice zone 1': {
            t: 'Time here',
            d: 'The date and time typed are in the time of this computer\'s time zone, summer time as well.',
            k: ''
        },
        'choice ha 0': {
            t: 'Not equal, ≠',
            d: 'The alternative is that it differs either way: the p-value counts both tails.',
            k: ''
        },
        'choice ha 1': {
            t: 'Less, <',
            d: 'The alternative is that it is below what H₀ says: the p-value is of the tail below.',
            k: ''
        },
        'choice ha 2': {
            t: 'Greater, >',
            d: 'The alternative is that it is above what H₀ says: the p-value is of the tail above.',
            k: ''
        },
        'choice input 0': {
            t: 'Data',
            d: 'The numbers of the sample, typed or pasted, a column of a spreadsheet as well.',
            k: ''
        },
        'choice input 1': {
            t: 'Summary',
            d: 'The mean, standard deviation and size of the sample, as a book gives them.',
            k: ''
        },
        'choice pool 0': {
            t: 'Welch',
            d: 'The spreads of the two samples may differ: its degrees of freedom by Welch and Satterthwaite. The usual choice.',
            k: ''
        },
        'choice pool 1': {
            t: 'Pooled',
            d: 'The two samples are taken to have the same spread: one standard deviation of both, n₁ + n₂ – 2 degrees of freedom.',
            k: ''
        },
        'table copy': {
            t: 'Copy table',
            d: 'Copies the table with its heads, a tab between the numbers, all their digits: it pastes into a spreadsheet, a number in each cell.',
            k: ''
        },
        'card reset': {
            t: 'Reset',
            d: 'Empties every box of the card, to start again. What is chosen stays as it is.',
            k: ''
        },
        'card example': {
            t: 'Example',
            d: 'Types an example in the boxes, in place of what is there, to see what the card does: then change any number of it.',
            k: ''
        },
        'formula copy': {
            t: 'Copy',
            d: 'Copies the formula as text, to paste anywhere: a power as ² where there is such a character, else as ^(…), a fraction as a ÷ b.',
            k: ''
        },
        'text copy': {
            t: 'Copy',
            d: 'Copies it, as it is written here, to paste anywhere.',
            k: ''
        },
        'matrix copy': {
            t: 'Copy',
            d: 'Copies the matrix, a tab between its numbers and a line for each row, all their digits: it pastes into a spreadsheet, or into the first box of a matrix here, for the next step.',
            k: ''
        },

        // the numbers
        'numbers': {
            t: 'Matrices, complex numbers and bases',
            d: 'Matrices up to 10 × 10, their determinant, inverse, eigenvalues and A x = b, pasted from a spreadsheet or typed as [1 2; 3 4]; ' +
                'vectors; complex numbers, (2 + 3i)(1 – i); whole numbers in any base, with their bits, and Gray code; truth tables made smallest, AB + A\'C, with their Karnaugh map; ' +
                'and prime factors, GCD and LCM, primes and fractions. ' +
                'Click a result to put it in.',
            k: ''
        },
        'numbers close': {
            t: 'Close the numbers',
            d: 'What you typed stays for the next time.',
            k: 'Esc'
        },

        // chemistry
        'chem': {
            t: 'Chemistry',
            d: 'The periodic table, each element with its mass, electrons, its atom drawn and more; molar mass, equations balanced, ' +
                'amounts and the limiting reactant, empirical formulas, molarity, dilution, pH and buffers, the gas laws, heat and half-life. ' +
                'Click a number to put it in.',
            k: ''
        },
        'chem close': {
            t: 'Close the chemistry',
            d: 'What you typed, and the element chosen, stay for the next time.',
            k: 'Esc'
        },
        'phys': {
            t: 'Physics',
            d: 'Electronics, from the resistor colour code to transistors and the 555; motion and rotation; forces, energy and fields; ' +
                'waves, light and sound; heat and fluids; and modern physics, from E = mc² to decay. ' +
                'Click a number to put it in.',
            k: ''
        },
        'phys close': {
            t: 'Close the physics',
            d: 'What you typed stays for the next time.',
            k: 'Esc'
        },
        'phys tab motion': {
            t: 'Motion',
            d: 'Steady acceleration from any three of s, u, v, a and t, its speed drawn; a projectile\'s flight, drawn; relative velocity, and a boat ' +
                'crossing a river; circular motion; orbits by Kepler\'s third law, an ellipse drawn; the rocket equation; pendulums and springs; rotation, the moment of ' +
                'inertia of a shape, its spin and its roll; and the centre of mass of up to four masses.',
            k: ''
        },
        'phys tab forces': {
            t: 'Forces',
            d: 'F = ma, the inclined plane with friction, masses over a pulley, collisions, impulse, kinetic and potential energy, work and power, torque and levers, ' +
                'gravitation and the Schwarzschild radius, springs, drag and terminal velocity, Coulomb\'s law, the magnetic force, the field of a wire, a solenoid or a loop, ' +
                'and induction.',
            k: ''
        },
        'phys tab circuits': {
            t: 'Electronics',
            d: 'The resistor colour code both ways, SMD codes and EIA-96, parts in series and parallel, Ohm\'s law, a wire\'s resistance and its AWG, the divider and Thévenin, the Wheatstone bridge, LED resistors, ' +
                'capacitors, RC and RL, filters of the first and second order, parallel plates, transformers and AC, three-phase power, impedance and resonance of R, L and C, the cost of electricity, battery life; ' +
                'diodes and rectifiers with their ripple; transistors switching and biased, MOSFETs, Zeners, the LM317, op-amps and the 555; dBm, dBV and dBµV, and gains in dB. ' +
                'A part\'s value as it is written: 4.7k, 4k7, 100n; a resistor to buy, of E12.',
            k: ''
        },
        'phys tab waves': {
            t: 'Waves',
            d: 'v = fλ, standing waves of strings and pipes, beats, lenses and mirrors, the lensmaker\'s equation, refraction and the critical angle, interference through two slits ' +
                'or a grating, one slit and the resolution of a lens, polarisation, the Doppler effect of sound and of light, light and photons, and sound in decibels.',
            k: ''
        },
        'phys tab matter': {
            t: 'Matter',
            d: 'Heat: Q = mcΔT from any three, latent heat, mixing, thermal expansion, conduction, radiation, Newton\'s cooling, the dew point, the speeds of gas molecules, ' +
                'an ideal gas isothermal, isobaric, isochoric or adiabatic, and heat engines. Solids: stress and strain. Fluids: density, pressure, ' +
                'the pressure at a depth, buoyancy, flow in a pipe, the Reynolds number with the friction of a pipe, and Stokes\' law.',
            k: ''
        },
        'phys tab modern': {
            t: 'Modern',
            d: 'E = mc², binding energy, the Q-value of a reaction, the photoelectric effect, de Broglie wavelengths, the uncertainty principle, a particle in a box, Compton scattering, ' +
                'tunnelling, special relativity, hydrogen\'s lines and Bohr\'s orbits, and radioactive decay.',
            k: ''
        },
        // biology
        'bio': {
            t: 'Biology',
            d: 'Genetics, from Punnett squares to gene maps and genetic risk; DNA and RNA, translated, aligned, with primers, CRISPR guides and gels; ' +
                'proteins and enzymes; the lab\'s dilutions, counts and qPCR; cells; health; and ecology and evolution. Click a number to put it in.',
            k: ''
        },
        'bio close': {
            t: 'Close the biology',
            d: 'What you typed stays for the next time.',
            k: 'Esc'
        },
        'bio tab genetics': {
            t: 'Genetics',
            d: 'Punnett squares of up to six genes, drawn, and of the X; Hardy–Weinberg, of p, of counts with its χ² test, or of the recessive trait; χ² of a cross; ' +
                'gene maps of two genes or three, the chromosome drawn; the chances of offspring; heritability, by the breeder\'s equation; epistasis and which ratio fits; ' +
                'genetic risk, the family drawn as a pedigree; and blood groups.',
            k: ''
        },
        'bio tab dna': {
            t: 'DNA',
            d: 'A sequence\'s length, bases, GC along it and mass, with its complement and reverse complement; translation in six frames and the open reading frames, drawn; ' +
                'the codon wheel; primer T<sub>m</sub> by nearest neighbours, their melting drawn; DNA and RNA by A<sub>260</sub> and their purity; mass, moles and copies; ligation, the plasmid drawn; ' +
                'restriction digests run on a gel; PCR\'s copies, cycle by cycle; alignments, global and local, with a dot plot; CRISPR guides; motifs of IUPAC\'s codes; ' +
                'primers for mutagenesis and Gibson assembly; and genomes and their copies.',
            k: ''
        },
        'bio tab protein': {
            t: 'Protein',
            d: 'A protein\'s mass, pI, charge, extinction and hydropathy, drawn; the twenty amino acids, each\'s titration drawn; protein concentration by A<sub>280</sub> or a standard curve; ' +
                'enzyme kinetics, of V<sub>max</sub> and K<sub>m</sub> or fitted to points, with inhibitors and the Lineweaver–Burk plot; binding by Hill; dose–response, its IC<sub>50</sub> fitted; ' +
                'and a purification table.',
            k: ''
        },
        'bio tab lab': {
            t: 'Lab',
            d: 'C₁V₁ = C₂V₂ and serial dilutions, their tubes drawn; making a solution, of its molarity, formula, percent or a stock; counting cells; growth and doubling, and OD<sub>600</sub>; ' +
                'colonies and CFU/mL; the centrifuge\'s RPM and g; a PCR master mix; qPCR by ΔΔCt and its standard curve; the mean ± 2 SE with error bars; R<sub>f</sub> of chromatography; the microscope; ' +
                'sizes from a gel; transformation efficiency; seeding plates; MOI; radioisotopes; and buffers.',
            k: ''
        },
        'bio tab cells': {
            t: 'Cells',
            d: 'Water potential, osmolarity and tonicity, a red blood cell drawn; surface area to volume; Q₁₀; diffusion by Fick; membrane potentials by Nernst and by Goldman; ' +
                'free energy; the heart\'s output and blood pressure, drawn; and respiration, its ATP and the respiratory quotient.',
            k: ''
        },
        'bio tab health': {
            t: 'Health',
            d: 'Diagnostic tests, their sensitivity, specificity and predictive values, a thousand people drawn; risk and odds ratios with their intervals, and the number needed to treat; ' +
                'an epidemic by SIR and herd immunity; oxygen and haemoglobin, the Bohr shift drawn; an action potential by Hodgkin and Huxley; the kidneys, eGFR and clearance; ' +
                'BMI and energy; and a drug\'s levels over its doses. For learning, not for care.',
            k: ''
        },
        'bio tab ecology': {
            t: 'Ecology',
            d: 'Population growth, exponential and logistic; predators and prey by Lotka and Volterra; mark and recapture; diversity by Simpson and Shannon; life tables and survivorship; ' +
                'energy pyramids; primary productivity; natural selection and genetic drift, generation by generation; Leslie matrices; competition; species, area and rarefaction; ' +
                'trees by UPGMA and neighbour joining; and the molecular clock.',
            k: ''
        },
        'formula physics': {
            t: 'In Physics',
            d: 'Opens the card of the Physics panel that works this out, with what you typed in it: there, any of its letters from the others.',
            k: ''
        },
        'formula finance': {
            t: 'In Finance',
            d: 'Opens the card of the Finance tab of Solve that works this out, with what you typed in it, and what more it gives.',
            k: ''
        },
        'formula biology': {
            t: 'In Biology',
            d: 'Opens the card of the Biology panel that works this out, with what you typed in it, and draws it.',
            k: ''
        },
        'choice stick 0': {
            t: 'Elastic',
            d: 'They bounce apart, as billiard balls do, and no kinetic energy is lost.',
            k: ''
        },
        'choice stick 1': {
            t: 'Stick together',
            d: 'They go on as one: momentum is kept, and as much kinetic energy as can be is lost.',
            k: ''
        },
        'panel big': {
            t: 'Pop out',
            d: 'The panel as big as the page, its cards in a list with the one open beside it; in the extension, in a window of its own.',
            k: ''
        },
        'panel small': {
            t: 'Pop in',
            d: 'The panel back in the calculator.',
            k: 'Esc'
        },
        'chem big': {
            t: 'Pop out',
            d: 'The periodic table as big as the page, each element with its number, name and mass; in the extension, in a window of its own.',
            k: ''
        },
        'chem card close': {
            t: 'Close the card',
            d: 'The table the whole width. Click an element to open it again.',
            k: ''
        },
        'chem small': {
            t: 'Pop in',
            d: 'The table back in the calculator.',
            k: 'Esc'
        },
        'chem tab table': {
            t: 'Periodic table',
            d: 'All 118 elements. Point at one to see it above the table, click it for all that is known of it and its atom; the arrow keys go from one to the next.',
            k: ''
        },
        'chem tab mass': {
            t: 'Mass',
            d: 'The molar mass of a formula and each element\'s part of it; grams, moles and particles; and the empirical and molecular formula of a composition.',
            k: ''
        },
        'chem tab reactions': {
            t: 'Reactions',
            d: 'An equation balanced, with its kind and what it oxidizes and reduces; the amounts of a reaction, its limiting reactant and percent yield; a worksheet; heat, q = mcΔT; and half-life.',
            k: ''
        },
        'chem tab solutions': {
            t: 'Solutions',
            d: 'Molarity, dilution, the freezing and boiling point of a solution, pH, pOH, [H⁺] and [OH⁻], weak acids and bases, buffers, and what dissolves in water.',
            k: ''
        },
        'chem tab ions': {
            t: 'Ions',
            d: 'The common ions, monatomic and polyatomic: the charge and molar mass of each, its colour in water and in a flame; the name of a formula and the formula of a name; and oxidation numbers.',
            k: ''
        },
        'chem tab gases': {
            t: 'Gases',
            d: 'The ideal gas law, PV = nRT, with the mass and density of a gas; the combined gas law; partial pressures; a gas collected over water; ' +
                'the volumes of the gases of a reaction; effusion; the air with height; and the speed of sound.',
            k: ''
        },
        'chem search clear': {
            t: 'Clear the search',
            d: 'Every element bright again.',
            k: 'Esc'
        },
        'chem by cat': {
            t: 'Kind',
            d: 'Each kind of element its colour: alkali metals, transition metals, halogens, noble gases … Click one below the table to light only its elements.',
            k: ''
        },
        'chem by state': {
            t: 'State',
            d: 'Solid, liquid or gas at 20 °C.',
            k: ''
        },
        'chem by block': {
            t: 'Block',
            d: 'The subshell its last electrons go in: s, p, d or f.',
            k: ''
        },
        'chem by en': {
            t: 'Electronegativity',
            d: 'How strongly it pulls electrons in a bond, on Pauling\'s scale: blue for little, red for much. Fluorine pulls most, 3.98.',
            k: ''
        },
        'chem temp': {
            t: 'Temperature',
            d: 'Slide it and each element is solid, liquid or gas as it is at that temperature, at 1 atm, from its melting and boiling points. Click the temperature for 20 °C again.',
            k: ''
        },
        'chem cut': {
            t: 'From – to',
            d: 'Drag either end of the scale and the elements outside it are dimmed, to see which are between two numbers. Click a number for all of them again.',
            k: ''
        },
        'chem by bp': {
            t: 'Boiling point',
            d: 'Where it boils, in °C: blue for low, red for high. Helium boils lowest, −269 °C; tungsten highest, near 5930 °C.',
            k: ''
        },
        'chem by radius': {
            t: 'Atomic radius',
            d: 'How big its atom is, its van der Waals radius in pm: aqua for small, lavender for big. It grows down a group and shrinks across a period.',
            k: ''
        },
        'chem by affinity': {
            t: 'Electron affinity',
            d: 'The energy given off as its atom takes an electron, in kJ/mol: pale for little, green for much. Chlorine gives off most, 349; the noble gases take none.',
            k: ''
        },
        'chem by mass': {
            t: 'Atomic mass',
            d: 'The mass of its atoms, in g/mol: peach for light, coral for heavy.',
            k: ''
        },
        'chem by year': {
            t: 'Discovered',
            d: 'The year it was found: sand for the elements known since ancient times, violet for the newest, made in labs.',
            k: ''
        },
        'chem unit': {
            t: 'Change the unit',
            d: 'The next unit, for every number of its kind: °C, °F and K; kJ/mol and eV; g/cm³, kg/m³ and lb/ft³; the atomic mass in full or to 3 places.',
            k: ''
        },
        'chem by ie': {
            t: 'Ionization energy',
            d: 'The energy to take one electron from each atom of a mole of it, in kJ/mol: green for little, purple for much. Helium holds on hardest, 2372.',
            k: ''
        },
        'chem by mp': {
            t: 'Melting point',
            d: 'Where it melts, in °C: blue for low, red for high. Carbon melts highest, near 3550 °C.',
            k: ''
        },
        'chem by density': {
            t: 'Density',
            d: 'Its mass in each cm³: pale for light, brown for heavy. Osmium is the heaviest, 22.6 g/cm³; the gases are all near 0.',
            k: ''
        },

        // what each number and word of an element is: on its big tile, beside it and in its details
        'chem fact z': { t: 'Atomic number', d: 'The protons in the nucleus of each atom, which make it this element; as many electrons round it in the neutral atom. The table is in its order.' },
        'chem fact symbol': { t: 'Symbol', d: 'Its one or two letters, as formulas write it: some from its Latin name, Fe from ferrum, Na from natrium.' },
        'chem fact name': { t: 'Name', d: 'Its name, as IUPAC spells it.' },
        'chem fact mass': { t: 'Atomic mass', d: 'The mean mass of its atoms, as found in nature, in g/mol: a mole of it weighs that many grams. In [ ], an element with no stable isotope: the mass number of its longest-lived one.' },
        'chem fact en': { t: 'Electronegativity', d: 'How strongly its atom pulls the electrons of a bond, on Pauling\'s scale, from caesium\'s 0.79 to fluorine\'s 3.98. The noble gases with few bonds have none.' },
        'chem fact ox': { t: 'Oxidation states', d: 'The charges its atom takes in its compounds, as if each bond were ionic: the most common ones.' },
        'chem fact config': { t: 'Electron configuration', d: 'How its electrons fill the subshells, s, p, d and f, from the lowest energy up; in [ ], the noble gas before it, whose subshells are full.' },
        'chem fact kind': { t: 'Kind', d: 'The family of elements it is in, alike in how they react.' },
        'chem fact shells': { t: 'Shells', d: 'Its electrons in each shell, from the nucleus out: K, L, M, N, O, P and Q.' },
        'chem fact atom': { t: 'Its atom', d: 'The Bohr model: the protons and neutrons in the nucleus, and the electrons in their shells round it.' },
        'chem fact group': { t: 'Group', d: 'Its column, 1 to 18: the elements of a group have as many outer electrons, and react alike. The lanthanides and actinides have none.' },
        'chem fact period': { t: 'Period', d: 'Its row, 1 to 7: the shells its electrons fill.' },
        'chem fact block': { t: 'Block', d: 'The subshell its last electrons go in: s, p, d or f.' },
        'chem fact mp': { t: 'Melting point', d: 'Where it turns from solid to liquid, at 1 atm.' },
        'chem fact bp': { t: 'Boiling point', d: 'Where it turns from liquid to gas, at 1 atm.' },
        'chem fact density': { t: 'Density', d: 'Its mass in each cm³ at 20 °C; a gas\'s at 0 °C and 1 atm.' },
        'chem fact ie': { t: 'Ionization energy', d: 'The energy to take the outermost electron from each atom of a mole of it, as a gas: the first ionization energy.' },
        'chem fact state': { t: 'State', d: 'Solid, liquid or gas at 20 °C and 1 atm.' },
        'chem fact radius': { t: 'Atomic radius', d: 'How big its atom is: its van der Waals radius, in picometres, 10⁻¹² m.' },
        'chem fact affinity': { t: 'Electron affinity', d: 'The energy given off as each atom of a mole of it, as a gas, takes an electron. Below 0, the ion it would make falls apart: an estimate.' },
        'chem fact ions': { t: 'Common ions', d: 'The ions it most often forms, with their charges.' },
        'chem fact protons': { t: 'Protons', d: 'In the nucleus, as many as the atomic number.' },
        'chem fact electrons': { t: 'Electrons', d: 'Round the nucleus of the neutral atom, as many as its protons.' },
        'chem fact neutrons': { t: 'Neutrons', d: 'In the nucleus of its commonest isotope: the mass number less the protons.' },
        'chem fact outer': { t: 'Outer-shell electrons', d: 'Its electrons in the shell furthest out, the valence shell, which take part in bonds.' },
        'chem fact unpaired': { t: 'Unpaired electrons', d: 'Its electrons alone in their orbitals, by Hund\'s rule: what makes an atom magnetic.' },
        'chem fact heat': { t: 'Specific heat', d: 'The energy to warm a gram of it by 1 K, at 25 °C: q = mcΔT. Not measured for most radioactive elements.' },
        'chem fact year': { t: 'Discovered', d: 'When it was found, by whom, and who first made it pure.' },
        'chem fact isotopes': { t: 'Isotopes', d: 'Its stable isotopes, the commonest first; with none stable, those found in nature, or its longest-lived one and its half-life.' },
        'chem fact story': { t: 'Name', d: 'Where its name comes from, and how it was found.' },
        'chem fact uses': { t: 'Uses', d: 'What it is used for.' },
        'chem fact covalent': { t: 'Covalent radius', d: 'Half the length of a single bond between two of its atoms, in picometres: how big its atom is in a molecule, smaller than its van der Waals radius.' },
        'chem fact fusion': { t: 'Heat of fusion', d: 'The energy to melt a mole of it at its melting point, with no change of temperature.' },
        'chem fact vaporization': { t: 'Heat of vaporization', d: 'The energy to boil a mole of it at its boiling point, with no change of temperature.' },
        'chem fact conductivity': { t: 'Thermal conductivity', d: 'How well heat flows through it: watts through a metre of it for each kelvin between its ends, across a square metre. Silver and copper the most, the gases the least.' },
        'chem fact resistivity': { t: 'Electrical resistivity', d: 'How much it resists a current, at 20 °C: R = ρL/A. Small for metals, silver\'s 1.6 × 10⁻⁸ Ω·m the least; huge for an insulator such as sulfur.' },
        'chem fact mohs': { t: 'Mohs hardness', d: 'How hard it is, by what it scratches and is scratched by, from talc\'s 1 to diamond\'s 10.' },
        'chem fact cas': { t: 'CAS number', d: 'Its number in the Chemical Abstracts Service\'s registry, which names each substance once: to look it up anywhere.' },
        'chem fact magnetic': { t: 'Magnetism', d: 'How it acts in a magnetic field: ferromagnetic, as iron, a magnet itself; paramagnetic, drawn in weakly; diamagnetic, pushed out weakly; antiferromagnetic, its atoms\' magnetism cancelling.' },
        'chem fact crystal': { t: 'Crystal structure', d: 'How its atoms are packed in the solid, at room temperature. Drawn under it, its unit cell, the smallest box that repeats, or of a hexagonal one a prism of 3; its atoms counted by their share: one at a corner is shared by 8 boxes, or 6 prisms, on a face by 2. Grey balls: only its lattice, many atoms at each point.' },
        'chem fact abundance': { t: 'Abundance in the crust', d: 'How much of the Earth\'s crust it is, in mg/kg, parts per million by mass: oxygen nearly half, then silicon. Traces only: a few atoms at a time, made in uranium and thorium ores; synthetic: made only in the laboratory.' },
        'chem fact appearance': { t: 'Appearance', d: 'What it looks like, pure, at room temperature.' },
        'chem fact spectrum': { t: 'Spectrum', d: 'The light of its atoms as a gas, from violet at 380 nm to red at 750: absorption, white light shone through it, ' +
            'dark lines across the rainbow where it takes colours out; emission, heated or in a spark, those same colours alone, bright on black. ' +
            'Each element has lines of its own, as a fingerprint: so helium was found in the Sun before on Earth. Its strongest lines, as NIST lists them, ' +
            'the stronger the wider; of an element whose atom has none here, its ion\'s. Click: the other one.' },
        // its kind, pointed at: what the elements of each family are like
        'chem kind alkali': { t: 'Alkali metal', d: 'Group 1 but hydrogen: soft metals that react hard with water, giving hydroxides and hydrogen. One outer electron, lost as a 1+ ion.' },
        'chem kind alkaline': { t: 'Alkaline earth metal', d: 'Group 2: reactive metals, less than the alkali metals. Two outer electrons, lost as a 2+ ion.' },
        'chem kind transition': { t: 'Transition metal', d: 'Groups 3 to 12, filling d subshells: hard metals, with many oxidation states and coloured compounds; good catalysts.' },
        'chem kind post': { t: 'Post-transition metal', d: 'The metals after the transition metals: softer, melting lower, some with oxides that are both acidic and basic.' },
        'chem kind metalloid': { t: 'Metalloid', d: 'Between the metals and the nonmetals: semiconductors, as silicon and germanium.' },
        'chem kind nonmetal': { t: 'Nonmetal', d: 'Poor conductors of heat and electricity, gases or brittle solids, that take or share electrons in their compounds.' },
        'chem kind halogen': { t: 'Halogen', d: 'Group 17: reactive nonmetals, one electron short of a full shell, taken as a 1− ion; with metals they make salts.' },
        'chem kind noble': { t: 'Noble gas', d: 'Group 18: their shells full, they hardly react; gases of single atoms.' },
        'chem kind lanthanide': { t: 'Lanthanide', d: 'Lanthanum to lutetium, filling the 4f subshell: the rare earth metals, much alike, most often 3+.' },
        'chem kind actinide': { t: 'Actinide', d: 'Actinium to lawrencium, filling the 5f subshell: all radioactive; only thorium and uranium are common in nature.' },

        // the graph
        'graph': {
            t: 'Graph',
            d: 'Draws up to seven functions of x, with a slider for any other letter, as a in a x^2 + b: x^2 – 3, 2sin(x); sequences, a(n) = a(n – 1) + 2 {a(1) = 1}; ' +
                'and slope fields, dy/dx = x – y {y(0) = 1}, a click adding a solution. Marks roots, highs, lows and crossings. ' +
                'Drag to move, scroll or pinch to zoom; point at a curve for its values, click for its tangent. The Table tab lists them.',
            k: ''
        },
        'graph close': {
            t: 'Close the graph',
            d: 'The functions and the view stay for the next time.',
            k: 'Esc'
        },
        'graph clear': {
            t: 'Clear the functions',
            d: 'Removes every curve, the start and step of the table, and puts the view back to the start.',
            k: ''
        },
        'graph in': {
            t: 'Zoom in',
            d: 'Twice as close, about the middle. The wheel zooms about where it points, bringing that toward the middle; a pinch zooms about where it is.',
            k: ''
        },
        'graph out': {
            t: 'Zoom out',
            d: 'Twice as far, about the middle.',
            k: ''
        },
        'graph home': {
            t: 'Back to the start',
            d: 'x from -10 to 10 with 0 in the middle; for a function of an angle in Deg, a full turn either way.',
            k: ''
        },
        'graph big': {
            t: 'Pop out',
            d: 'The graph fills the page, to see more of the curves: all of the window on the website, ' +
                'and in a window of its own beside the calculator in the extension.',
            k: ''
        },
        'graph small': {
            t: 'Pop in',
            d: 'The graph is small again, over the keys.',
            k: 'Esc'
        },

        'graph save': {
            t: 'Save the graph',
            d: 'Saves the graph as a picture, graph.png, with the function of each curve. ' +
                'Right-click the graph to copy it instead.',
            k: ''
        },
        'graph add': {
            t: 'Add a curve',
            d: 'A box for another function, in its own color: up to seven curves.',
            k: ''
        },
        'graph remove': {
            t: 'Remove the curve',
            d: 'Takes this curve away. The ones below it move up, each with its color.',
            k: ''
        },
        'graph fit lin': {
            t: 'Draw the best fit',
            d: 'Draws the straight line nearest these points, by least squares; point at it for its r². ' +
                'Click again for a quadratic, an exponential, a power and a logarithmic fit.',
            k: ''
        },
        'graph fit quad': {
            t: 'Fit a parabola',
            d: 'Draws y = ax² + bx + c nearest these points instead. It needs three x or more.',
            k: ''
        },
        'graph fit exp': {
            t: 'Fit an exponential',
            d: 'Draws y = a · bˣ nearest these points instead, from the line of ln y, as calculators fit it. Every y must be above 0.',
            k: ''
        },
        'graph fit pow': {
            t: 'Fit a power',
            d: 'Draws y = a · xᵇ nearest these points instead, from the line of ln y and ln x. Every x and y must be above 0.',
            k: ''
        },
        'graph fit log': {
            t: 'Fit a logarithm',
            d: 'Draws y = a + b ln x nearest these points instead. Every x must be above 0.',
            k: ''
        },
        'graph fit off': {
            t: 'Hide the best fit',
            d: 'Takes the curve of the best fit away.',
            k: ''
        },
        'graph points': {
            t: 'Points as a table',
            d: 'Type the points in rows of x and y; the box is written as you type, (1, 2), (2, 4.1). Enter goes to the row below.',
            k: ''
        },
        'graph points off': {
            t: 'Put the table away',
            d: 'The points stay in the box.',
            k: 'Esc'
        },
        'graph slope on': {
            t: 'Draw the slope',
            d: 'Draws the slope of this curve as well, its derivative dy/dx, dashed in its color.',
            k: ''
        },
        'graph slope off': {
            t: 'Hide the slope',
            d: 'Takes the dashed curve of the slope away.',
            k: ''
        },
        'graph hide': {
            t: 'Hide the curve',
            d: 'Hides this curve and its points, and leaves it out of the table. What is typed stays.',
            k: ''
        },
        'graph show': {
            t: 'Show the curve',
            d: 'Draws this curve again.',
            k: ''
        },
        'graph put u': {
            t: 'Insert t',
            d: 'Puts the parameter of this point, t or θ, into the equation, as Ans does. ← and → move the point along its curve.',
            k: ''
        },
        'graph put term u': {
            t: 'Insert n',
            d: 'Puts the n of this term of the sequence into the equation, as Ans does. ← and → go to the term before and the one after, ' +
                'Shift ten terms on.',
            k: ''
        },
        'graph put term y': {
            t: 'Insert the term',
            d: 'Puts this term of the sequence, its value at n, into the equation, as Ans does.',
            k: ''
        },
        'graph put x': {
            t: 'Insert x',
            d: 'Puts the x of this point into the equation, as Ans does. ← and → move the point along its curve, ' +
                'Shift farther, ↑ and ↓ to the curve above or below.',
            k: ''
        },
        'graph put y': {
            t: 'Insert y',
            d: 'Puts the y of this point into the equation, as Ans does.',
            k: ''
        },
        'graph put m': {
            t: 'Insert the slope',
            d: 'Puts the slope of the curve at this point, dy/dx, into the equation, as Ans does. ' +
                'The dashed line is its tangent.',
            k: ''
        },
        'graph window': {
            t: 'Set the view',
            d: 'Type where x goes from and to across the graph, and y up it. Enter or Esc goes back to the graph.',
            k: ''
        },
        'graph area': {
            t: 'Area under a curve',
            d: 'Press, then drag along a curve from one x to another: the area between it and the x axis is shaded, ' +
                'above the axis counted up and below it down. Pressed between two curves, the area between them, ' +
                'the upper one less the lower. An end near a root or a crossing goes to it; held at a side, the view slides on for more. It stays pressed for another, ' +
                'until it is pressed again, a double click on the plot, Esc, or a button of the view.',
            k: ''
        },
        'graph end a': {
            t: 'Type the start',
            d: 'Type the x the area starts from, any number below where it ends: the area follows as you type. Enter or Esc goes back to the graph.',
            k: ''
        },
        'graph end b': {
            t: 'Type the end',
            d: 'Type the x the area goes to, any number past where it starts: the area follows as you type. Enter or Esc goes back to the graph.',
            k: ''
        },
        'graph put a': {
            t: 'Insert the start',
            d: 'Puts the x the area starts from into the equation, as Ans does.',
            k: ''
        },
        'graph put b': {
            t: 'Insert the end',
            d: 'Puts the x the area goes to into the equation, as Ans does.',
            k: ''
        },
        'graph put s': {
            t: 'Insert the area',
            d: 'Puts the area into the equation, as Ans does: the integral of the curve from the start to the end.',
            k: ''
        },
        'graph play': {
            t: 'Play',
            d: 'Moves the value from one end of the slider to the other and back, over and over, and the curves with it.',
            k: ''
        },
        'graph pause': {
            t: 'Pause',
            d: 'Stops the value where it is. Dragging the slider or typing a value stops it too.',
            k: ''
        },

        // the statistics
        'stats': {
            t: 'Statistics',
            d: 'Type or paste a list of numbers, a column from a spreadsheet as well, for its mean, standard ' +
                'deviation, sum, quartiles, median and more, with a histogram and a box plot. The Pairs tab takes x and y ' +
                'on each line, for the curve of best fit and the correlation; the Tests tab tests hypotheses.',
            k: ''
        },
        'stats tab list': {
            t: 'List',
            d: 'A list of numbers: its count, sum, mean, standard deviations, quartiles, median and more, with a histogram and a box plot.',
            k: ''
        },
        'stats tab pairs': {
            t: 'Pairs',
            d: 'x and y on each line: their means, deviations and sums, the correlation, and the curve of best fit of the kind chosen, drawn through them.',
            k: ''
        },
        'stats tab tests': {
            t: 'Tests',
            d: 'Tests of hypotheses, as a TI-84\'s STAT TESTS: t and z of one sample or two, paired t, proportions, χ² of goodness of fit and of ' +
                'independence, ANOVA and correlation, each with its p-value and whether to reject H₀.',
            k: ''
        },
        'stats fit': {
            t: 'Fit',
            d: 'The curve fitted to the pairs by least squares: a line, y = a + bx; quadratic; cubic; exponential, y = a · bˣ; power, y = a · xᵇ; ' +
                'logarithmic, y = a + b ln x; or logistic, y = c / (1 + a e^(–bx)). Exponential, power and logarithmic are fitted as a line of their ' +
                'logarithms, as calculators fit them.',
            k: ''
        },
        'stats close': {
            t: 'Close the statistics',
            d: 'The list and the pairs stay for the next time.',
            k: 'Esc'
        },
        'stats clear': {
            t: 'Clear the list',
            d: 'Removes all the numbers of this tab, to start a new list.',
            k: ''
        },
        'stats n': {
            t: 'Count, n',
            d: 'How many numbers the list has.'
        },
        'stats sum': {
            t: 'Sum, Σx',
            d: 'All the numbers added up.'
        },
        'stats squares': {
            t: 'Sum of squares, Σx<sup>2</sup>',
            d: 'Each number squared, then added up.'
        },
        'stats mean': {
            t: 'Mean, <span class="calc-x-bar">x</span>',
            d: 'The average: the sum divided by n.'
        },
        'stats sdp': {
            t: 'Standard deviation, σ',
            d: 'How far the numbers spread from the mean, when the list is the whole population: divided by n.'
        },
        'stats sds': {
            t: 'Sample standard deviation, s',
            d: 'How far the numbers spread from the mean, when the list is a sample of a larger group: divided ' +
                'by n − 1. It needs two numbers at least.'
        },
        'stats min': {
            t: 'Minimum',
            d: 'The smallest number of the list.'
        },
        'stats median': {
            t: 'Median',
            d: 'The middle number once the list is in order; with an even count, the mean of the middle two.'
        },
        'stats max': {
            t: 'Maximum',
            d: 'The largest number of the list.'
        },
        'stats q1': {
            t: 'First quartile, Q<sub>1</sub>',
            d: 'The median of the lower half of the list, the median itself left out of both halves, as a TI-84 ' +
                'finds it. A quarter of the numbers are below it.'
        },
        'stats q3': {
            t: 'Third quartile, Q<sub>3</sub>',
            d: 'The median of the upper half of the list, the median itself left out of both halves. A quarter of ' +
                'the numbers are above it.'
        },
        'stats iqr': {
            t: 'Interquartile range, IQR',
            d: 'Q<sub>3</sub> − Q<sub>1</sub>: how far apart the middle half of the numbers are.'
        },
        'stats range': {
            t: 'Range',
            d: 'max − min: how far apart the largest and smallest numbers are.'
        },
        'stats mode': {
            t: 'Mode',
            d: 'The number that comes most often. None where no number comes twice, or where two or more come most often.'
        },
        'stats vars': {
            t: 'Sample variance, s<sup>2</sup>',
            d: 'The square of s: the squares of how far each number is from the mean, added up and divided by n − 1. ' +
                'For the whole population, square σ.'
        },
        'stats chart': {
            t: 'Histogram and box plot',
            d: 'Each bar counts the numbers in its part of the range, the parts all as wide. Under them the box goes ' +
                'from Q<sub>1</sub> to Q<sub>3</sub> with the median across it, and its lines out to the smallest and the largest.'
        },

        // the statistics of pairs, x and y on each line
        'pairs n': {
            t: 'Count, n',
            d: 'How many pairs there are.'
        },
        'pairs xmean': {
            t: 'Mean of x, <span class="calc-x-bar">x</span>',
            d: 'The average of the x values.'
        },
        'pairs ymean': {
            t: 'Mean of y, <span class="calc-x-bar">y</span>',
            d: 'The average of the y values.'
        },
        'pairs sx': {
            t: 'Sample standard deviation of x, s<sub>x</sub>',
            d: 'How far the x values spread from their mean, as a sample: divided by n − 1.'
        },
        'pairs sy': {
            t: 'Sample standard deviation of y, s<sub>y</sub>',
            d: 'How far the y values spread from their mean, as a sample: divided by n − 1.'
        },
        'pairs r': {
            t: 'Correlation, r',
            d: 'How near the pairs are to a straight line, from −1 to 1: 1 on a line going up, −1 on one going down, ' +
                'near 0 on none.'
        },
        'pairs b': {
            t: 'Slope, b',
            d: 'The slope of the line of best fit, y = a + bx, by least squares: how much y goes up for each 1 of x.'
        },
        'pairs a': {
            t: 'Intercept, a',
            d: 'Where the line of best fit, y = a + bx, meets the y axis: its y at x = 0.'
        },
        'pairs r2': {
            t: 'Coefficient of determination, r<sup>2</sup>',
            d: 'The square of r: the share of how y varies that the line accounts for, from 0 to 1.'
        },
        'pairs sdpx': {
            t: 'Standard deviation of x, σ<sub>x</sub>',
            d: 'How far the x values spread from their mean, as the whole population: divided by n.'
        },
        'pairs sdpy': {
            t: 'Standard deviation of y, σ<sub>y</sub>',
            d: 'How far the y values spread from their mean, as the whole population: divided by n.'
        },
        'pairs cov': {
            t: 'Sample covariance',
            d: 'How x and y vary together: each x less its mean times each y less its mean, added up and divided by n − 1.'
        },
        'pairs sumx': {
            t: 'Sum of x, Σx',
            d: 'All the x values added up.'
        },
        'pairs sumy': {
            t: 'Sum of y, Σy',
            d: 'All the y values added up.'
        },
        'pairs sumxy': {
            t: 'Sum of products, Σxy',
            d: 'Each x times its y, then added up.'
        },
        'pairs sumx2': {
            t: 'Sum of squares of x, Σx<sup>2</sup>',
            d: 'Each x squared, then added up.'
        },
        'pairs chart': {
            t: 'Scatter plot',
            d: 'Each pair as a dot, x across and y up, with the curve of best fit through them.'
        },
        'pairs sumy2': {
            t: 'Sum of squares of y, Σy<sup>2</sup>',
            d: 'Each y squared, then added up.'
        },
        'pairs rho': {
            t: 'Spearman\'s ρ',
            d: 'The correlation of the ranks of x and of y, from −1 to 1: how far y goes up, or down, as x goes up, in a line or not.'
        },
        'pairs fa': {
            t: 'a',
            d: 'The number a of the curve fitted, in its equation above the results.'
        },
        'pairs fb': {
            t: 'b',
            d: 'The number b of the curve fitted, in its equation above the results.'
        },
        'pairs fc': {
            t: 'c',
            d: 'The number c of the curve fitted, in its equation above the results.'
        },
        'pairs fd': {
            t: 'd',
            d: 'The number d of the curve fitted, in its equation above the results.'
        },
        'pairs fr2': {
            t: 'Coefficient of determination, r<sup>2</sup>',
            d: 'The share of how y varies that the curve accounts for, from 0 to 1; of an exponential, power or logarithmic curve, that of the line of its logarithms.'
        },

        // the history
        'history': {
            t: 'History and variables',
            d: 'The calculations you finished with\u00a0=, newest first. Point at a line for its buttons: insert ' +
                'and copy; the x at the corner of a calculation deletes it. Its Variables tab has the letters A to J, each holding a value to use in the equation.',
            k: ''
        },
        'history close': {
            t: 'Close the history',
            d: 'A click anywhere outside it closes it as well.',
            k: 'Esc'
        },
        'search': {
            t: 'Search',
            d: 'Every tool: its tabs and cards, the formulas and constants, the examples of the graph, the elements and the units, ' +
                'by their names and their tips. Enter or a click opens the one found.',
            k: 'Ctrl+K'
        },
        'search clear': {
            t: 'Clear the search',
            d: 'All of the list shown again.'
        },
        'search close': {
            t: 'Close the search',
            d: 'A click anywhere outside it closes it as well.',
            k: 'Esc'
        },
        'search big': {
            t: 'Pop out',
            d: 'The search in the big window, beside the rail of the tools, with what you typed.',
            k: ''
        },
        'history export': {
            t: 'Export the history',
            d: 'Every calculation in it, the oldest first: copied as text, a line of each, 1 + 2 = 3; saved as a CSV file of ' +
                'each equation and its result, for a spreadsheet; or saved as a text file of the lines copied.',
            k: ''
        },
        'history clear': {
            t: 'Clear the history',
            d: 'Removes all the calculations in it. Ans and the memory stay.',
            k: ''
        },
        'history delete': {
            t: 'Delete this calculation',
            d: 'Removes the equation and its result from the history. Ans and the memory stay.',
            k: ''
        },
        'history insert equation': {
            t: 'Insert the equation',
            d: 'Enters it again without its =, to change it or finish it. It takes the place of what you are ' +
                'entering, in the unit and the fraction mode it was done in.',
            k: ''
        },
        'history insert result': {
            t: 'Insert the result',
            d: 'Puts the number into the equation you are entering, as Ans does, with all its digits.',
            k: ''
        },
        'history copy equation': {
            t: 'Copy the equation',
            d: 'As text, such as 1 ÷ 2 + 1 ÷ 3. Ctrl+V pastes it back, worked out the same.',
            k: ''
        },
        'history copy result': {
            t: 'Copy the result',
            d: 'As the line shows it: 0.75, or 3/4 for a calculation done in fraction mode.',
            k: ''
        },
        'history unit Deg': {
            t: 'Done in degrees',
            d: 'Its angles were worked out in degrees, and are again when you insert it, whatever the unit then.',
            k: ''
        },
        'history unit Rad': {
            t: 'Done in radians',
            d: 'Its angles were worked out in radians, and are again when you insert it, whatever the unit then.',
            k: ''
        },
        'history unit Grad': {
            t: 'Done in gradians',
            d: 'Its angles were worked out in gradians, and are again when you insert it, whatever the unit then.',
            k: ''
        },
        'history unit mixed': {
            t: 'Done in more than one unit',
            d: 'Its angles were worked out in different units, as it shows; each is again when you insert it.',
            k: ''
        },
        'MODE': {
            t: 'Number format',
            d: 'Steps through the ways of showing results: Normal, Fix (1500.00), Sci (1.50e+3) and Eng (powers ' +
                'in steps of three). The decimal places are set on the options page.',
            k: 'o'
        },
        'a/b': {
            t: 'Fraction mode',
            d: 'Draws each ÷ as a fraction while you type, and shows results as fractions: ' +
                '1 ÷ 2 + 1 ÷ 3 = 5/6. FRAC in the display shows it is on. Click again for decimals.',
            k: 'f'
        },
        '°′″': {
            t: 'Degrees, minutes, seconds',
            d: 'Shows results as degrees, minutes and seconds: sin<sup>-1</sup> 0.6 = 36°52′11.63″ in Deg. ' +
                'DMS in the display shows it is on. Click again for decimals. Hours work too: 2.75 is 2°45′0″, ' +
                '2 h 45 min. To enter an angle so, paste it: 12°30′15″ shows as written.',
            k: 'h, f'
        },
        '(': {
            t: 'Open bracket',
            d: 'A number before it is multiplied: 5\u00a0(\u00a02\u00a0+\u00a03\u00a0) is 5\u00a0×\u00a0(2\u00a0+\u00a03). Brackets still open close at =.',
            k: '('
        },
        ')': {
            t: 'Close bracket',
            d: 'Closes the last open bracket: (\u00a02\u00a0+\u00a03\u00a0)\u00a0×\u00a04\u00a0=\u00a020.',
            k: ')'
        },
        'x2': {
            t: 'Square',
            d: 'After the number, or before it: 5 x<sup>2</sup> = 25, and x<sup>2</sup> 5 = 25.',
            k: 'h, 2'
        },
        'x3': {
            t: 'Cube',
            d: 'After the number, or before it: 2 x<sup>3</sup> = 8, and x<sup>3</sup> 2 = 8.',
            k: 'h, 3'
        },
        'yx': {
            t: 'Power',
            d: 'Between two numbers: 2 y<sup>x</sup> 10 = 1024. Pressed first, it comes as two boxes to fill: Enter goes to the next one, the arrows and Tab go between them, or click one.',
            k: '^',
            second: 'log<sub>y</sub>'
        },
        'logy': {
            t: 'Logarithm, any base',
            d: 'The number first, then the base: 8 log<sub>y</sub> 2 = 3, as 2<sup>3</sup> = 8. ' +
                'The base is a positive number other than 1. Pressed first, it comes as two boxes to fill: Enter goes to the next one, the arrows and Tab go between them, or click one.',
            k: 'h, ^'
        },
        '1/x': {
            t: 'Reciprocal',
            d: 'One divided by the number, after it or before it: 4 1/x = 0.25, and 1/x 4 = 0.25.',
            k: '\\'
        },
        '√': {
            t: 'Square root',
            d: 'Before the number: √ 16 = 4. Enter, → or Tab closes it, as √(16); = works it out.',
            k: 'Shift+R'
        },
        'x√y': {
            t: 'Root',
            d: 'The root first, then the number, as it is written: 4 <sup>x</sup>√y 81 = 3, the 4th root of 81. ' +
                'Pressed first, a root with two empty boxes comes: type the root, Enter goes to the next box; the ' +
                'arrows and Tab go between them, or click a box to type there. ' +
                'Odd roots of negative numbers work: 3 <sup>x</sup>√y –8 = –2.',
            k: 'r'
        },
        'EE': {
            t: 'Exponent',
            d: 'Times ten to the power of the next number: 5 EE 3 = 5000, 5 × 10<sup>3</sup>. Pressed first, it comes as two boxes to fill: Enter goes to the next one, the arrows and Tab go between them, or click one.',
            k: 'Shift+W'
        },
        'sin': {
            t: 'Sine',
            d: 'Before the angle: sin 30 = 0.5 in Deg. Enter, → or Tab closes it, as sin(30); = works it out.',
            k: 's',
            second: 'sin<sup>-1</sup>'
        },
        'cos': {
            t: 'Cosine',
            d: 'Before the angle: cos 60 = 0.5 in Deg. Enter, → or Tab closes it, as cos(60); = works it out.',
            k: 'c',
            second: 'cos<sup>-1</sup>'
        },
        'tan': {
            t: 'Tangent',
            d: 'Before the angle: tan 45 = 1 in Deg. Enter, → or Tab closes it, as tan(45); = works it out.',
            k: 't',
            second: 'tan<sup>-1</sup>'
        },
        'sinh': {
            t: 'Hyperbolic sine',
            d: 'sinh 1 = 1.175201193644.',
            k: 'h, s',
            second: 'sinh<sup>-1</sup>'
        },
        'cosh': {
            t: 'Hyperbolic cosine',
            d: 'cosh 1 = 1.543080634815.',
            k: 'h, c',
            second: 'cosh<sup>-1</sup>'
        },
        'tanh': {
            t: 'Hyperbolic tangent',
            d: 'tanh 1 = 0.7615941559558.',
            k: 'h, t',
            second: 'tanh<sup>-1</sup>'
        },
        'sin-1': {
            t: 'Inverse sine',
            d: 'The angle with this sine: sin<sup>-1</sup> 0.5 = 30 in Deg.',
            k: 'Shift+S'
        },
        'cos-1': {
            t: 'Inverse cosine',
            d: 'The angle with this cosine: cos<sup>-1</sup> 0.5 = 60 in Deg.',
            k: 'Shift+V'
        },
        'tan-1': {
            t: 'Inverse tangent',
            d: 'The angle with this tangent: tan<sup>-1</sup> 1 = 45 in Deg.',
            k: 'Shift+T'
        },
        'sinh-1': {
            t: 'Inverse hyperbolic sine',
            d: 'sinh<sup>-1</sup> 1 = 0.8813735870195.',
            k: 'h, Shift+S'
        },
        'cosh-1': {
            t: 'Inverse hyperbolic cosine',
            d: 'For numbers from 1 up: cosh<sup>-1</sup> 2 = 1.316957896925.',
            k: 'h, Shift+V'
        },
        'tanh-1': {
            t: 'Inverse hyperbolic tangent',
            d: 'For numbers between -1 and 1: tanh<sup>-1</sup> 0.5 = 0.5493061443341.',
            k: 'h, Shift+T'
        },
        'π': {
            t: 'Pi',
            d: '3.14159265359…, the half turn in radians. After a number it is times it: 2 π = 6.28318530718.',
            k: 'p',
            second: 'e'
        },
        'e': {
            t: 'Euler\'s number',
            d: '2.718281828459…, the base of the natural logarithm: ln e = 1. After a number it is times it: 2 e = 5.43656365692.',
            k: 'h, p'
        },
        'log': {
            t: 'Logarithm, base 10',
            d: 'The power of 10 that gives the number: log 1000 = 3.',
            k: 'Shift+L',
            second: '10<sup>x</sup>'
        },
        'ln': {
            t: 'Natural logarithm',
            d: 'The logarithm to base e: ln 1 = 0, ln e = 1.',
            k: 'l',
            second: 'log<sub>2</sub>'
        },
        'log2': {
            t: 'Logarithm, base 2',
            d: 'The power of 2 that gives the number: log<sub>2</sub> 8 = 3.',
            k: 'h, l'
        },
        'ex': {
            t: 'e to the power',
            d: 'e (2.718281828459…) to the power of the number: e<sup>x</sup> 1 = 2.718281828459.',
            k: 'e',
            second: '2<sup>x</sup>'
        },
        '2x': {
            t: '2 to the power',
            d: '2 to the power of the number: 2<sup>x</sup> 10 = 1024.',
            k: 'Shift+X'
        },
        '10x': {
            t: '10 to the power',
            d: '10 to the power of the number: 10<sup>x</sup> 3 = 1000. It undoes log.',
            k: 'h, Shift+L'
        },
        'abs': {
            t: 'Absolute value',
            d: 'The number without its sign: abs – 3 = 3.',
            k: '|',
            second: 'floor'
        },
        'round': {
            t: 'Round',
            d: 'The nearest whole number, half away from 0: round 2.5 = 3, round 2.4 = 2. For d places, the Integer tab of the numbers.',
            k: 'Shift+O'
        },
        'floor': {
            t: 'Floor',
            d: 'The whole number at or below the number: floor 2.7 = 2, and of -2.7, -3.',
            k: 'Shift+Y'
        },
        'ceil': {
            t: 'Ceiling',
            d: 'The whole number at or above the number: ceil 2.1 = 3, and of -2.1, -2.',
            k: 'Shift+U'
        },
        'x!': {
            t: 'Factorial',
            d: '5 x! = 120, 1 × 2 × 3 × 4 × 5, and x! 5 = 120 as well. Decimals work: 2.5 x! = 3.323350970448.',
            k: 'x',
            second: 'ceil'
        },
        'nCr': {
            t: 'Combinations',
            d: 'The ways to choose r of n things: 10 nCr 3 = 120. Pressed first, it comes as two boxes to fill: Enter goes to the next one, the arrows and Tab go between them, or click one.',
            k: 'Shift+N',
            second: 'gcd'
        },
        'nPr': {
            t: 'Permutations',
            d: 'The ways to arrange r of n things in order: 5 nPr 2 = 20. Pressed first, it comes as two boxes to fill: Enter goes to the next one, the arrows and Tab go between them, or click one.',
            k: 'Shift+P',
            second: 'lcm'
        },
        'gcd': {
            t: 'Greatest common divisor',
            d: 'The largest whole number that divides both: 12 gcd 18 = 6. Whole numbers only. Pressed first, it comes as two boxes to fill: Enter goes to the next one, the arrows and Tab go between them, or click one.',
            k: 'Shift+Q'
        },
        'lcm': {
            t: 'Least common multiple',
            d: 'The smallest number both divide: 4 lcm 6 = 12. Whole numbers only. Pressed first, it comes as two boxes to fill: Enter goes to the next one, the arrows and Tab go between them, or click one.',
            k: 'Shift+K'
        },
        'mod': {
            t: 'Remainder (modulo)',
            d: 'What is left after dividing: 17 mod 5 = 2. It takes the sign of the second number, ' +
                'so -7 mod 3 = 2; decimals work too: 7.5 mod 2 = 1.5. Pressed first, it comes as two boxes to fill: Enter goes to the next one, the arrows and Tab go between them, or click one.',
            k: 'Shift+M'
        },
        '%': {
            t: 'Percent',
            d: 'On its own it divides by 100: 8 % = 0.08, and % 8 = 0.08. After + or –, it is a share of the number before: ' +
                '500 + 8 % = 540, and 500 + % 8 = 540.',
            k: '%',
            second: 'mod'
        },
        'Rand': {
            t: 'Random number',
            d: 'A new random number between 0 and 1 each time.',
            k: 'h, n',
            second: 'round'
        },
        'Ans': {
            t: 'Last answer',
            d: 'The last result, to use in a new equation: 5 × Ans. It stays after C and AC.',
            k: 'a'
        },
        'mc': {
            t: 'Memory clear',
            d: 'Empties the memory; the M in the display goes.',
            k: 'v'
        },
        'm+': {
            t: 'Memory add',
            d: 'Adds the number in the display to the memory. The display shows M while it holds a number.',
            k: 'b'
        },
        'm-': {
            t: 'Memory subtract',
            d: 'Subtracts the number in the display from the memory.',
            k: 'n'
        },
        'mr': {
            t: 'Memory recall',
            d: 'Puts the number in the memory into the equation.',
            k: 'm'
        }
    };
})(window);
