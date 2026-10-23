// The elements of the periodic table, and the chemistry worked out with them: the molar mass of a
// formula, an equation balanced and what it oxidizes and reduces, amounts of a reaction and its limiting
// reactant, the empirical formula of a composition, oxidation numbers, and the name of a formula and the
// formula of a name. Of the Chemistry panel; no page is needed, so it runs in the tests too.
// An element: [symbol, name, standard atomic weight (IUPAC; of one with no stable isotope, the mass
// number of its longest-lived), Pauling electronegativity, melting point °C, boiling point °C,
// density g/cm³ (of a gas at 0 °C and 1 atm), common oxidation states, year found (0 known since
// ancient times), first ionization energy kJ/mol]. null where it is not known. Of the heaviest, the values
// Wikipedia gives as predicted, each marked so in PREDICTED
(function (root) {
    'use strict';

    var E = [
        ['H', 'Hydrogen', 1.008, 2.20, -259.16, -252.88, 0.00008988, '+1 −1', 1766, 1312.0],
        ['He', 'Helium', 4.0026, null, null, -268.93, 0.0001785, '0', 1868, 2372.3],
        ['Li', 'Lithium', 6.94, 0.98, 180.50, 1330, 0.534, '+1', 1817, 520.2],
        ['Be', 'Beryllium', 9.0122, 1.57, 1287, 2469, 1.85, '+2', 1798, 899.5],
        ['B', 'Boron', 10.81, 2.04, 2076, 3927, 2.34, '+3', 1808, 800.6],
        ['C', 'Carbon', 12.011, 2.55, 3550, 4027, 2.267, '−4 +2 +4', 0, 1086.5],
        ['N', 'Nitrogen', 14.007, 3.04, -210.00, -195.79, 0.0012506, '−3 +3 +5', 1772, 1402.3],
        ['O', 'Oxygen', 15.999, 3.44, -218.79, -182.96, 0.001429, '−2', 1774, 1313.9],
        ['F', 'Fluorine', 18.998, 3.98, -219.67, -188.11, 0.001696, '−1', 1886, 1681.0],
        ['Ne', 'Neon', 20.180, null, -248.59, -246.05, 0.0008999, '0', 1898, 2080.7],
        ['Na', 'Sodium', 22.990, 0.93, 97.79, 882.94, 0.968, '+1', 1807, 495.8],
        ['Mg', 'Magnesium', 24.305, 1.31, 650, 1090, 1.738, '+2', 1755, 737.7],
        ['Al', 'Aluminium', 26.982, 1.61, 660.32, 2470, 2.70, '+3', 1825, 577.5],
        ['Si', 'Silicon', 28.085, 1.90, 1414, 3265, 2.329, '−4 +4', 1824, 786.5],
        ['P', 'Phosphorus', 30.974, 2.19, 44.15, 280.5, 1.823, '−3 +3 +5', 1669, 1011.8],
        ['S', 'Sulfur', 32.06, 2.58, 115.21, 444.6, 2.07, '−2 +4 +6', 0, 999.6],
        ['Cl', 'Chlorine', 35.45, 3.16, -101.5, -34.04, 0.003214, '−1 +1 +3 +5 +7', 1774, 1251.2],
        ['Ar', 'Argon', 39.95, null, -189.34, -185.85, 0.0017837, '0', 1894, 1520.6],
        ['K', 'Potassium', 39.098, 0.82, 63.5, 759, 0.862, '+1', 1807, 418.8],
        ['Ca', 'Calcium', 40.078, 1.00, 842, 1484, 1.54, '+2', 1808, 589.8],
        ['Sc', 'Scandium', 44.956, 1.36, 1541, 2836, 2.985, '+3', 1879, 633.1],
        ['Ti', 'Titanium', 47.867, 1.54, 1668, 3287, 4.506, '+2 +3 +4', 1791, 658.8],
        ['V', 'Vanadium', 50.942, 1.63, 1910, 3407, 6.0, '+2 +3 +4 +5', 1801, 650.9],
        ['Cr', 'Chromium', 51.996, 1.66, 1907, 2671, 7.19, '+2 +3 +6', 1797, 652.9],
        ['Mn', 'Manganese', 54.938, 1.55, 1246, 2061, 7.21, '+2 +4 +7', 1774, 717.3],
        ['Fe', 'Iron', 55.845, 1.83, 1538, 2862, 7.874, '+2 +3', 0, 762.5],
        ['Co', 'Cobalt', 58.933, 1.88, 1495, 2927, 8.90, '+2 +3', 1735, 760.4],
        ['Ni', 'Nickel', 58.693, 1.91, 1455, 2730, 8.908, '+2', 1751, 737.1],
        ['Cu', 'Copper', 63.546, 1.90, 1084.62, 2562, 8.96, '+1 +2', 0, 745.5],
        ['Zn', 'Zinc', 65.38, 1.65, 419.53, 907, 7.14, '+2', 1746, 906.4],
        ['Ga', 'Gallium', 69.723, 1.81, 29.76, 2400, 5.91, '+3', 1875, 578.8],
        ['Ge', 'Germanium', 72.630, 2.01, 938.25, 2833, 5.323, '−4 +2 +4', 1886, 762.0],
        ['As', 'Arsenic', 74.922, 2.18, null, 615, 5.727, '−3 +3 +5', 1250, 947.0],
        ['Se', 'Selenium', 78.971, 2.55, 221, 685, 4.81, '−2 +4 +6', 1817, 941.0],
        ['Br', 'Bromine', 79.904, 2.96, -7.2, 58.8, 3.1028, '−1 +1 +3 +5', 1826, 1139.9],
        ['Kr', 'Krypton', 83.798, 3.00, -157.37, -153.42, 0.003733, '0 +2', 1898, 1350.8],
        ['Rb', 'Rubidium', 85.468, 0.82, 39.30, 688, 1.532, '+1', 1861, 403.0],
        ['Sr', 'Strontium', 87.62, 0.95, 777, 1377, 2.64, '+2', 1790, 549.5],
        ['Y', 'Yttrium', 88.906, 1.22, 1526, 2930, 4.472, '+3', 1794, 600.0],
        ['Zr', 'Zirconium', 91.224, 1.33, 1855, 4409, 6.52, '+4', 1789, 640.1],
        ['Nb', 'Niobium', 92.906, 1.6, 2477, 4744, 8.57, '+3 +5', 1801, 652.1],
        ['Mo', 'Molybdenum', 95.95, 2.16, 2623, 4639, 10.28, '+4 +6', 1778, 684.3],
        ['Tc', 'Technetium', 98, 1.9, 2157, 4265, 11, '+4 +7', 1937, 702],
        ['Ru', 'Ruthenium', 101.07, 2.2, 2334, 4150, 12.45, '+3 +4', 1844, 710.2],
        ['Rh', 'Rhodium', 102.91, 2.28, 1964, 3695, 12.41, '+3', 1803, 719.7],
        ['Pd', 'Palladium', 106.42, 2.20, 1554.9, 2963, 12.023, '+2 +4', 1803, 804.4],
        ['Ag', 'Silver', 107.87, 1.93, 961.78, 2162, 10.49, '+1', 0, 731.0],
        ['Cd', 'Cadmium', 112.41, 1.69, 321.07, 767, 8.65, '+2', 1817, 867.8],
        ['In', 'Indium', 114.82, 1.78, 156.6, 2072, 7.31, '+1 +3', 1863, 558.3],
        ['Sn', 'Tin', 118.71, 1.96, 231.93, 2602, 7.265, '+2 +4', 0, 708.6],
        ['Sb', 'Antimony', 121.76, 2.05, 630.63, 1587, 6.697, '−3 +3 +5', 0, 834],
        ['Te', 'Tellurium', 127.60, 2.1, 449.51, 988, 6.24, '−2 +4 +6', 1782, 869.3],
        ['I', 'Iodine', 126.90, 2.66, 113.7, 184.3, 4.933, '−1 +1 +5 +7', 1811, 1008.4],
        ['Xe', 'Xenon', 131.29, 2.60, -111.75, -108.1, 0.005887, '0 +2 +4 +6', 1898, 1170.4],
        ['Cs', 'Caesium', 132.91, 0.79, 28.44, 671, 1.93, '+1', 1860, 375.7],
        ['Ba', 'Barium', 137.33, 0.89, 727, 1845, 3.51, '+2', 1772, 502.9],
        ['La', 'Lanthanum', 138.91, 1.10, 920, 3464, 6.162, '+3', 1839, 538.1],
        ['Ce', 'Cerium', 140.12, 1.12, 795, 3443, 6.770, '+3 +4', 1803, 534.4],
        ['Pr', 'Praseodymium', 140.91, 1.13, 935, 3520, 6.77, '+3', 1885, 527],
        ['Nd', 'Neodymium', 144.24, 1.14, 1024, 3074, 7.01, '+3', 1885, 533.1],
        ['Pm', 'Promethium', 145, 1.13, 1042, 3000, 7.26, '+3', 1945, 540],
        ['Sm', 'Samarium', 150.36, 1.17, 1072, 1794, 7.52, '+2 +3', 1879, 544.5],
        ['Eu', 'Europium', 151.96, 1.2, 826, 1529, 5.264, '+2 +3', 1901, 547.1],
        ['Gd', 'Gadolinium', 157.25, 1.2, 1312, 3273, 7.90, '+3', 1880, 593.4],
        ['Tb', 'Terbium', 158.93, 1.1, 1356, 3230, 8.23, '+3 +4', 1843, 565.8],
        ['Dy', 'Dysprosium', 162.50, 1.22, 1407, 2567, 8.540, '+3', 1886, 573.0],
        ['Ho', 'Holmium', 164.93, 1.23, 1461, 2720, 8.79, '+3', 1878, 581.0],
        ['Er', 'Erbium', 167.26, 1.24, 1529, 2868, 9.066, '+3', 1843, 589.3],
        ['Tm', 'Thulium', 168.93, 1.25, 1545, 1950, 9.32, '+3', 1879, 596.7],
        ['Yb', 'Ytterbium', 173.05, 1.1, 824, 1196, 6.90, '+2 +3', 1878, 603.4],
        ['Lu', 'Lutetium', 174.97, 1.27, 1652, 3402, 9.841, '+3', 1907, 523.5],
        ['Hf', 'Hafnium', 178.49, 1.3, 2233, 4603, 13.31, '+4', 1923, 658.5],
        ['Ta', 'Tantalum', 180.95, 1.5, 3017, 5458, 16.69, '+5', 1802, 761],
        ['W', 'Tungsten', 183.84, 2.36, 3422, 5930, 19.25, '+4 +6', 1783, 770],
        ['Re', 'Rhenium', 186.21, 1.9, 3186, 5596, 21.02, '+4 +7', 1925, 760],
        ['Os', 'Osmium', 190.23, 2.2, 3033, 5012, 22.59, '+4 +8', 1803, 840],
        ['Ir', 'Iridium', 192.22, 2.20, 2446, 4428, 22.56, '+3 +4', 1803, 880],
        ['Pt', 'Platinum', 195.08, 2.28, 1768.3, 3825, 21.45, '+2 +4', 1735, 870],
        ['Au', 'Gold', 196.97, 2.54, 1064.18, 2856, 19.3, '+1 +3', 0, 890.1],
        ['Hg', 'Mercury', 200.59, 2.00, -38.83, 356.73, 13.534, '+1 +2', 0, 1007.1],
        ['Tl', 'Thallium', 204.38, 1.62, 304, 1473, 11.85, '+1 +3', 1861, 589.4],
        ['Pb', 'Lead', 207.2, 2.33, 327.46, 1749, 11.34, '+2 +4', 0, 715.6],
        ['Bi', 'Bismuth', 208.98, 2.02, 271.4, 1564, 9.78, '+3 +5', 1753, 703],
        ['Po', 'Polonium', 209, 2.0, 254, 962, 9.196, '+2 +4', 1898, 812.1],
        ['At', 'Astatine', 210, 2.2, 302, null, 8.93, '−1 +1', 1940, 899.0],
        ['Rn', 'Radon', 222, 2.2, -71, -61.7, 0.00973, '0 +2', 1899, 1037],
        ['Fr', 'Francium', 223, 0.79, 27, null, 2.458, '+1', 1939, 393],
        ['Ra', 'Radium', 226, 0.9, 700, 1737, 5.5, '+2', 1898, 509.3],
        ['Ac', 'Actinium', 227, 1.1, 1050, 3198, 10.07, '+3', 1899, 499],
        ['Th', 'Thorium', 232.04, 1.3, 1750, 4788, 11.7, '+4', 1829, 587],
        ['Pa', 'Protactinium', 231.04, 1.5, 1572, 4027, 15.37, '+5', 1913, 568],
        ['U', 'Uranium', 238.03, 1.38, 1132.2, 4131, 19.1, '+3 +4 +5 +6', 1789, 597.6],
        ['Np', 'Neptunium', 237, 1.36, 644, 3902, 20.45, '+3 +4 +5 +6', 1940, 604.5],
        ['Pu', 'Plutonium', 244, 1.28, 639.4, 3228, 19.816, '+3 +4 +5 +6', 1940, 584.7],
        ['Am', 'Americium', 243, 1.13, 1176, 2607, 12, '+3', 1944, 578],
        ['Cm', 'Curium', 247, 1.28, 1340, 3110, 13.51, '+3', 1944, 581],
        ['Bk', 'Berkelium', 247, 1.3, 986, 2627, 14.78, '+3 +4', 1949, 601],
        ['Cf', 'Californium', 251, 1.3, 900, 1470, 15.1, '+3', 1950, 608],
        ['Es', 'Einsteinium', 252, 1.3, 860, 996, 8.84, '+3', 1952, 619],
        ['Fm', 'Fermium', 257, 1.3, 1500, null, 9.7, '+3', 1952, 627],
        ['Md', 'Mendelevium', 258, 1.3, 800, null, 10.3, '+2 +3', 1955, 635],
        ['No', 'Nobelium', 259, 1.3, 800, null, 9.9, '+2 +3', 1958, 642],
        ['Lr', 'Lawrencium', 266, 1.3, 1600, null, 14.4, '+3', 1961, 478.6],
        ['Rf', 'Rutherfordium', 267, null, 2100, 5500, 17, '+4', 1964, 580],
        ['Db', 'Dubnium', 268, null, null, null, 21.6, '+5', 1968, 665],
        ['Sg', 'Seaborgium', 269, null, null, null, 23.5, '+6', 1974, 757],
        ['Bh', 'Bohrium', 270, null, null, null, 26.5, '+7', 1981, 740],
        ['Hs', 'Hassium', 269, null, null, null, 28, '+8', 1984, 730],
        ['Mt', 'Meitnerium', 278, null, null, null, 27.5, '+1 +3 +6', 1982, 800],
        ['Ds', 'Darmstadtium', 281, null, null, null, 26.5, '0 +2 +4', 1994, 960],
        ['Rg', 'Roentgenium', 282, null, null, null, 23, '+3', 1994, 1020],
        ['Cn', 'Copernicium', 285, null, 10, 67, 14, '0 +2', 1996, 1155],
        ['Nh', 'Nihonium', 286, null, 430, 1130, 16, '+1 +3', 2004, 704.9],
        ['Fl', 'Flerovium', 289, null, 11, null, 11.4, '+2', 1998, 832.2],
        ['Mc', 'Moscovium', 290, null, 400, 1100, 13.5, '+1 +3', 2003, 538.3],
        ['Lv', 'Livermorium', 293, null, 435, 812, 12.9, '+2', 2000, 663.9],
        ['Ts', 'Tennessine', 294, null, 450, 610, 7.2, '+1 +3', 2010, 742.9],
        ['Og', 'Oganesson', 294, null, 52, 177, 7.2, '+2 +4', 2002, 860.1]
    ];

    // Of each element in its order, from PubChem's periodic table: its van der Waals radius in pm (of Fm to Lr, Wikipedia's),
    // and its electron affinity in kJ/mol (PubChem's eV × 96.485; where PubChem has none, or an older value since
    // measured again, Wikipedia's data page: below 0 where the ion it would make falls apart). null where it is not known
    var RADIUS = [
        120, 140, 182, 153, 192, 170, 155, 152, 135, 154, 227, 173, 184, 210, 180, 180, 175, 188, 275, 231,
        211, 187, 179, 189, 197, 194, 192, 163, 140, 139, 187, 211, 185, 190, 183, 202, 303, 249, 219, 186,
        207, 209, 209, 207, 195, 202, 172, 158, 193, 217, 206, 206, 198, 216, 343, 268, 240, 235, 239, 229,
        236, 229, 233, 237, 221, 229, 216, 235, 227, 242, 221, 212, 217, 210, 217, 216, 202, 209, 166, 209,
        196, 202, 207, 197, 202, 220, 348, 283, 260, 237, 243, 240, 221, 243, 244, 245, 244, 245, 245, 245,
        246, 246, 246, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
    ];

    var AFFINITY = [
        72.7, -48, 59.6, -48, 26.7, 121.9, -6.8, 141, 328.16, -116, 52.9, -40, 42.5, 133.6,
        72, 200.4, 349, -96, 48.3, 2.37, 18.1, 7.6, 50.7, 64.3, -50, 15.7, 63.8, 111.5,
        118.5, -58, 28.9, 118.94, 78.2, 195, 324.7, -96, 45.2, 5.02, 29.6, 41.1, 86.2, 72,
        53.1, 101.3, 109.7, 53.7, 125.6, -68, 28.9, 107.3, 103.2, 190.2, 295.1, -77, 45.5, 13.95,
        53.8, 57.91, 10.54, 9.41, 12.45, 15.63, 11.2, 20.5, 12.67, 1.45, 32.61, 30.1, 99, -1.93,
        23.04, 17.18, 31.1, 78.6, 5.83, 106.1, 151, 205.3, 222.8, -48, 30.88, 34.7, 91.3, 136,
        233.09, -68, 45.3, 9.65, 33.77, 58.63, 53.03, 30.39, 45.85, -48.33, 9.93, 27.17, -165.24, -97.31,
        -28.6, 33.96, 93.91, -223.22, -30.04, null, null, null, null, null, null, null, 151, null,
        66.6, null, 35.3, 74.9, 165.9, 7.72
    ];

    // Of each element in its order, from its Wikipedia infobox (which cites the CRC Handbook and others): its crystal
    // structure, its covalent radius in pm (Cordero's; for the heaviest, Pyykkö's), its magnetism, its Mohs hardness, its
    // heats of fusion and of vaporization in kJ/mol, its thermal conductivity in W/(m·K), its electrical resistivity in
    // Ω·m at 20 °C, and its appearance and CAS number; and its abundance in the Earth's crust in mg/kg (Wikipedia's data
    // page, from the CRC Handbook). A range or a note in words where one number does not say it. null where it is not known
    var PROPS = [
        ['Hexagonal', 31, 'Diamagnetic', null, 0.117, 0.904, 0.1805, null, 1400, 'Colourless gas', '1333-74-0'],
        ['Hexagonal close-packed', 28, 'Diamagnetic', null, 0.0138, 0.0829, 0.1513, null, 0.008, 'Colourless gas; glows grey in an electric field', '7440-59-7'],
        ['Body-centred cubic', 128, 'Paramagnetic', 0.6, 3, 136, 84.8, 9.28e-8, 20, 'Silvery-white metal', '7439-93-2'],
        ['Hexagonal close-packed', 96, 'Diamagnetic', 6, 12.2, 292, 200, 3.6e-8, 2.8, 'White-grey metal', '7440-41-7'],
        ['Rhombohedral', 84, 'Diamagnetic', 9.5, 50.2, 508, 27.4, 1000000, 10, 'Black-brown', '7440-42-8'],
        ['Graphite: simple hexagonal; diamond: diamond cubic', 76, 'Diamagnetic', '1–2 (graphite); 10 (diamond)', 117, null, '119–165 (graphite)', 7.837e-6, 200, 'Graphite: black, metallic-looking; diamond: clear', '7440-44-0'],
        ['Hexagonal', 71, 'Diamagnetic', null, 0.72, 5.57, 0.02583, null, 19, 'Colourless gas', '7727-37-9'],
        ['Cubic', 66, 'Paramagnetic', null, 0.444, 6.82, 0.02658, null, 461000, 'Colourless gas; pale blue as a liquid and a solid', '7782-44-7'],
        ['Cubic', 64, 'Diamagnetic', null, 0.51, 6.51, 0.02591, null, 585, 'Very pale yellow gas; bright yellow liquid', '7782-41-4'],
        ['Face-centred cubic', 58, 'Diamagnetic', null, 0.335, 1.71, 0.0491, null, 0.005, 'Colourless gas; glows orange-red in an electric field', '7440-01-9'],
        ['Body-centred cubic', 166, 'Paramagnetic', 0.5, 2.6, 97.42, 142, 4.77e-8, 23600, 'Silvery-white metal', '7440-23-5'],
        ['Hexagonal close-packed', 141, 'Paramagnetic', '1–2.5', 8.48, 128, 156, 4.39e-8, 23300, 'Shiny grey metal', '7439-95-4'],
        ['Face-centred cubic', 121, 'Paramagnetic', 2.75, 10.71, 284, 237, 2.65e-8, 82300, 'Silvery-grey metal', '7429-90-5'],
        ['Diamond cubic', 111, 'Diamagnetic', 6.5, 50.21, 383, 149, 2300, 282000, 'Crystalline, reflective, with bluish faces', '7440-21-3'],
        ['White (α): body-centred cubic', 107, 'Diamagnetic', 0.5, 0.66, 51.9, 0.236, null, 1050, 'White, red and violet waxy; black metallic-looking', '7723-14-0'],
        ['α-S₈: orthorhombic', 105, 'Diamagnetic', 2, 1.727, 45, 0.205, 2e15, 350, 'Lemon-yellow solid', '7704-34-9'],
        ['Orthorhombic', 102, 'Diamagnetic', null, 6.406, 20.41, 0.0089, null, 145, 'Pale yellow-green gas', '7782-50-5'],
        ['Face-centred cubic', 106, 'Diamagnetic', null, 1.18, 6.53, 0.01772, null, 3.5, 'Colourless gas; glows lilac in an electric field', '7440-37-1'],
        ['Body-centred cubic', 203, 'Paramagnetic', 0.4, 2.33, 76.9, 102.5, 7.2e-8, 20900, 'Silvery-white metal', '7440-09-7'],
        ['Face-centred cubic', 176, 'Diamagnetic', 1.75, 8.54, 154.7, 201, 3.36e-8, 41500, 'Dull grey-silver metal, a pale yellow tint', '7440-70-2'],
        ['Hexagonal close-packed', 170, 'Paramagnetic', null, 14.1, 332.7, 15.8, 5.62e-7, 22, 'Silvery-white metal', '7440-20-2'],
        ['Hexagonal close-packed', 160, 'Paramagnetic', 6, 14.15, 425, 21.9, 4.2e-7, 5650, 'Silvery grey-white metal', '7440-32-6'],
        ['Body-centred cubic', 153, 'Paramagnetic', 6.7, 21.5, 444, 30.7, 1.97e-7, 120, 'Blue-silver-grey metal', '7440-62-2'],
        ['Body-centred cubic', 139, 'Antiferromagnetic', 8.5, 21, 347, 93.9, 1.25e-7, 102, 'Silvery metal', '7440-47-3'],
        ['α-Mn: body-centred cubic', '139 low spin, 161 high spin', 'Paramagnetic', 6, 12.91, 221, 7.81, 1.44e-6, 950, 'Silvery metal', '7439-96-5'],
        ['α-Fe: body-centred cubic', '132 low spin, 152 high spin', 'Ferromagnetic', 4, 13.81, 340, 80.4, 9.61e-8, 56300, 'Lustrous metal, a greyish tinge', '7439-89-6'],
        ['Hexagonal close-packed', '126 low spin, 150 high spin', 'Ferromagnetic', 5, 16.06, 377, 100, 6.24e-8, 25, 'Hard, lustrous bluish-grey metal', '7440-48-4'],
        ['Face-centred cubic', 124, 'Ferromagnetic', 4, 17.48, 379, 90.9, 6.93e-8, 84, 'Lustrous silvery metal, a gold tinge', '7440-02-0'],
        ['Face-centred cubic', 132, 'Diamagnetic', 3, 13.26, 300.4, 401, 1.678e-8, 60, 'Red-orange metal', '7440-50-8'],
        ['Hexagonal close-packed', 122, 'Diamagnetic', 2.5, 7.32, 115, 116, 5.9e-8, 70, 'Silver-grey metal', '7440-66-6'],
        ['Base-centred orthorhombic', 122, 'Diamagnetic', 1.5, 5.59, 256, 40.6, 2.7e-7, 19, 'Silvery-blue metal', '7440-55-3'],
        ['Diamond cubic', 122, 'Diamagnetic', 6, 36.94, 334, 60.2, 1, 1.5, 'Greyish-white', '7440-56-4'],
        ['Grey: rhombohedral', 119, 'Diamagnetic', 3.5, 24.44, 34.76, 50.2, 3.33e-7, 1.8, 'Metallic grey', '7440-38-2'],
        ['Grey: hexagonal', 120, 'Diamagnetic', 2, 6.69, 95.48, 0.519, null, 0.05, 'Grey and metallic-looking, red, or vitreous black', '7782-49-2'],
        ['Orthorhombic', 120, 'Diamagnetic', null, 10.571, 29.96, 0.122, 78000000000, 2.4, 'Red-brown liquid', '7726-95-6'],
        ['Face-centred cubic', 116, 'Diamagnetic', null, 1.64, 9.08, 0.00943, null, 0.0001, 'Colourless gas; glows whitish in an electric field', '7439-90-9'],
        ['Body-centred cubic', 220, 'Paramagnetic', 0.3, 2.19, 69, 58.2, 1.28e-7, 90, 'Grey-white metal', '7440-17-7'],
        ['Face-centred cubic', 195, 'Paramagnetic', 1.5, 7.43, 141, 35.4, 1.32e-7, 370, 'Silvery-white metal, a pale yellow tint', '7440-24-6'],
        ['Hexagonal close-packed', 190, 'Paramagnetic', null, 11.42, 363, 17.2, 5.96e-7, 33, 'Silvery-white metal', '7440-65-5'],
        ['Hexagonal close-packed', 175, 'Paramagnetic', 5, 14, 591, 22.6, 4.21e-7, 165, 'Silvery-white metal', '7440-67-7'],
        ['Body-centred cubic', 164, 'Paramagnetic', 6, 30, 689.9, 53.7, 1.52e-7, 20, 'Grey metal, bluish when oxidized', '7440-03-1'],
        ['Body-centred cubic', 154, 'Paramagnetic', 5.5, 37.48, 598, 138, 5.34e-8, 1.2, 'Grey metal', '7439-98-7'],
        ['Hexagonal close-packed', 147, 'Paramagnetic', null, 33.29, 585.2, 50.6, 2e-7, 'Traces only', 'Shiny grey metal', '7440-26-8'],
        ['Hexagonal close-packed', 146, 'Paramagnetic', 6.5, 38.59, 619, 117, 7.1e-8, 0.001, 'Silvery-white metal', '7440-18-8'],
        ['Face-centred cubic', 142, 'Paramagnetic', 6, 26.59, 493, 150, 4.33e-8, 0.001, 'Silvery-white metal', '7440-16-6'],
        ['Face-centred cubic', 139, 'Paramagnetic', 4.75, 16.74, 358, 71.8, 1.054e-7, 0.015, 'Silvery-white metal', '7440-05-3'],
        ['Face-centred cubic', 145, 'Diamagnetic', 2.5, 11.28, 254, 429, 1.587e-8, 0.075, 'Lustrous white metal', '7440-22-4'],
        ['Hexagonal close-packed', 144, 'Diamagnetic', 2, 6.21, 99.87, 96.6, 7.27e-8, 0.15, 'Silvery bluish-grey metal', '7440-43-9'],
        ['Body-centred tetragonal', 142, 'Diamagnetic', 1.2, 3.281, 231.8, 81.8, 8.37e-8, 0.25, 'Silvery lustrous grey metal', '7440-74-6'],
        ['White (β): body-centred tetragonal; grey (α): diamond cubic', 139, 'White tin paramagnetic; grey tin diamagnetic', 1.5, 7.03, 296.1, 66.8, 1.15e-7, 2.3, 'Silvery-white (white tin); grey (grey tin)', '7440-31-5'],
        ['Rhombohedral', 139, 'Diamagnetic', 3, 19.79, 193.43, 24.4, 4.17e-7, 0.2, 'Silvery lustrous grey', '7440-36-0'],
        ['Hexagonal', 138, 'Diamagnetic', 2.25, 17.49, 114.1, '1.97–3.38', null, 0.001, 'Silvery lustrous grey; brown-black as a powder', '13494-80-9'],
        ['Base-centred orthorhombic', 139, 'Diamagnetic', null, 15.52, 41.57, 0.449, 13000000, 0.45, 'Lustrous grey-black solid; violet gas', '7553-56-2'],
        ['Face-centred cubic', 140, 'Diamagnetic', null, 2.27, 12.64, 0.00565, null, 3e-5, 'Colourless gas; glows blue in an electric field', '7440-63-3'],
        ['Body-centred cubic', 244, 'Paramagnetic', 0.2, 2.09, 63.9, 35.9, 2.05e-7, 3, 'Pale gold metal', '7440-46-2'],
        ['Body-centred cubic', 215, 'Paramagnetic', 1.25, 7.12, 142, 18.4, 3.32e-7, 425, 'Silvery-grey metal, a pale yellow tint', '7440-39-3'],
        ['α: double hexagonal close-packed', 207, 'Paramagnetic', 2.5, 6.2, 400, 13.4, 6.15e-7, 39, 'Silvery-white metal', '7439-91-0'],
        ['β: double hexagonal close-packed', 204, 'Paramagnetic', 2.5, 5.46, 398, 11.3, 8.28e-7, 66.5, 'Silvery-white metal', '7440-45-1'],
        ['Double hexagonal close-packed', 203, 'Paramagnetic', null, 6.89, 331, 12.5, 7e-7, 9.2, 'Greyish-white metal', '7440-10-0'],
        ['Double hexagonal close-packed', 201, 'Paramagnetic; antiferromagnetic below 20 K', null, 7.14, 289, 16.5, 6.43e-7, 41.5, 'Silvery-white metal', '7440-00-8'],
        ['Double hexagonal close-packed', 199, 'Paramagnetic', null, 7.13, 289, 17.9, 7.5e-7, 'Traces only', 'Metallic', '7440-12-2'],
        ['Rhombohedral', 198, 'Paramagnetic', null, 8.62, 192, 13.3, 9.4e-7, 7.05, 'Silvery-white metal', '7440-19-9'],
        ['Body-centred cubic', 198, 'Paramagnetic', null, 9.21, 176, 13.9, 9e-7, 2, 'Silvery-white metal, a pale yellow tint', '7440-53-1'],
        ['Hexagonal close-packed', 196, 'Ferromagnetic below 293 K (20 °C), paramagnetic above', null, 10.05, 301.3, 10.6, 1.31e-6, 6.2, 'Silvery-white metal', '7440-54-2'],
        ['Hexagonal close-packed', 194, 'Paramagnetic at room temperature', null, 10.15, 391, 11.1, 1.15e-6, 1.2, 'Silvery-white metal', '7440-27-9'],
        ['Hexagonal close-packed', 192, 'Paramagnetic at room temperature', null, 11.06, 280, 10.7, 9.26e-7, 5.2, 'Silvery-white metal', '7429-91-6'],
        ['Hexagonal close-packed', 192, 'Paramagnetic', null, 17, 251, 16.2, 8.14e-7, 1.3, 'Silvery-white metal', '7440-60-0'],
        ['Hexagonal close-packed', 189, 'Paramagnetic at room temperature', null, 19.9, 280, 14.5, 8.6e-7, 3.5, 'Silvery-white metal', '7440-52-0'],
        ['Hexagonal close-packed', 190, 'Paramagnetic', null, 16.84, 191, 16.9, 6.76e-7, 0.52, 'Silvery-grey metal', '7440-30-4'],
        ['Face-centred cubic', 187, 'Paramagnetic', null, 7.66, 129, 38.5, 2.5e-7, 3.2, 'Silvery-white metal, a pale yellow tint', '7440-64-4'],
        ['Hexagonal close-packed', 187, 'Paramagnetic', null, 22, 414, 16.4, 5.82e-7, 0.8, 'Silvery-white metal', '7439-94-3'],
        ['Hexagonal close-packed', 175, 'Paramagnetic', 5.5, 27.2, 648, 23, 3.31e-7, 3, 'Steel-grey metal', '7440-58-6'],
        ['Body-centred cubic', 170, 'Paramagnetic', 6.5, 36.57, 753, 57.5, 1.31e-7, 2, 'Grey-blue metal', '7440-25-7'],
        ['Body-centred cubic', 162, 'Paramagnetic', 7.5, 52.31, 774, 173, 5.28e-8, 1.25, 'Lustrous greyish-white metal', '7440-33-7'],
        ['Hexagonal close-packed', 151, 'Paramagnetic', 7, 60.43, 704, 48, 1.93e-7, 0.0007, 'Silvery-grey metal', '7440-15-5'],
        ['Hexagonal close-packed', 144, 'Paramagnetic', 7, 57.851, 378, 87.6, 8.12e-8, 0.0015, 'Silvery metal, a blue cast', '7440-04-2'],
        ['Face-centred cubic', 141, 'Paramagnetic', 6.5, 41.12, 564, 147, 4.71e-8, 0.001, 'Silvery-white metal', '7439-88-5'],
        ['Face-centred cubic', 136, 'Paramagnetic', 3.5, 22.17, 510, 71.6, 1.05e-7, 0.005, 'Silvery-white metal', '7440-06-4'],
        ['Face-centred cubic', 136, 'Diamagnetic', 2.5, 12.55, 342, 318, 2.214e-8, 0.004, 'Metallic yellow', '7440-57-5'],
        ['Rhombohedral', 132, 'Diamagnetic', null, 2.29, 59.11, 8.3, 9.61e-7, 0.085, 'Shiny silvery liquid', '7439-97-6'],
        ['Hexagonal close-packed', 145, 'Diamagnetic', 1.2, 4.14, 165, 46.1, 1.8e-7, 0.85, 'Silvery-white metal', '7440-28-0'],
        ['Face-centred cubic', 146, 'Diamagnetic', 1.5, 4.77, 179.5, 35.3, 2.08e-7, 14, 'Metallic grey', '7439-92-1'],
        ['Rhombohedral', 148, 'Diamagnetic', 2.25, 11.3, 179, 7.97, 1.29e-6, 0.0085, 'Lustrous brownish-silver metal', '7440-69-9'],
        ['α-Po: simple cubic', 140, 'Nonmagnetic', null, 13, 102.91, 20, 4e-7, 2e-10, 'Silvery metal', '7440-08-6'],
        ['Face-centred cubic', 150, null, null, null, null, null, null, 'Traces only', 'Probably metallic', '7440-68-8'],
        ['Face-centred cubic', 150, 'Nonmagnetic', null, 3.247, 18.1, 0.00361, null, 4e-13, 'Colourless gas', '10043-92-2'],
        ['Body-centred cubic', 260, 'Paramagnetic', null, null, null, 15, 3e-6, 'Traces only', null, '7440-73-5'],
        ['Body-centred cubic', 221, 'Nonmagnetic', null, 8.5, 113, 18.6, 1e-6, 9e-7, 'Silvery-white metal', '7440-14-4'],
        ['Face-centred cubic', 215, null, null, 14, 400, 12, null, 5.5e-10, 'Silvery-white metal, glowing pale blue in the dark', '7440-34-8'],
        ['Face-centred cubic', 206, 'Paramagnetic', 3, 13.81, 514, 54, 1.57e-7, 9.6, 'Silvery metal', '7440-29-1'],
        ['Body-centred tetragonal', 200, 'Paramagnetic', null, 12.34, 481, 47, 1.77e-7, 1.4e-6, 'Bright silvery metal', '7440-13-3'],
        ['Orthorhombic', 196, 'Paramagnetic', null, 9.14, 417.1, 27.5, 2.8e-7, 2.7, 'Silvery-grey metal, a black oxide forming in air', '7440-61-1'],
        ['Orthorhombic', 190, 'Paramagnetic', null, 5.19, 336, 6.3, 1.22e-6, 'Traces only', 'Silvery metal', '7439-99-8'],
        ['Monoclinic', 187, 'Paramagnetic', null, 2.82, 333.5, 6.74, 1.46e-6, 'Traces only', 'Silvery-white metal, dark grey as it tarnishes', '7440-07-5'],
        ['Double hexagonal close-packed', 180, 'Paramagnetic', null, 14.39, null, 10, 6.9e-7, 'None: synthetic', 'Silvery-white metal', '7440-35-9'],
        ['Double hexagonal close-packed', 169, 'Antiferromagnetic below 52 K, paramagnetic above', null, 13.85, null, null, 1.25e-6, 'None: synthetic', 'Silvery metal, glowing purple in the dark', '7440-51-9'],
        ['Double hexagonal close-packed', 168, 'Paramagnetic', null, 7.92, null, 10, null, 'None: synthetic', 'Silvery metal', '7440-40-6'],
        ['Double hexagonal close-packed', 168, null, '3–4', null, null, null, null, 'None: synthetic', 'Silvery metal', '7440-71-3'],
        ['Face-centred cubic', 165, 'Paramagnetic', null, null, null, null, null, 'None: synthetic', 'Silvery metal, glowing blue in the dark', '7429-92-7'],
        ['Face-centred cubic', 167, null, null, null, null, null, null, 'None: synthetic', null, '7440-72-4'],
        ['Face-centred cubic', 173, null, null, null, null, null, null, 'None: synthetic', null, '7440-11-1'],
        ['Face-centred cubic', 176, null, null, null, null, null, null, 'None: synthetic', null, '10028-14-5'],
        ['Hexagonal close-packed', 161, null, null, null, null, null, null, 'None: synthetic', 'Silvery', '22537-19-5'],
        ['Hexagonal close-packed', 157, null, null, null, null, null, null, 'None: synthetic', null, '53850-36-5'],
        ['Body-centred cubic', 149, null, null, null, null, null, null, 'None: synthetic', null, '53850-35-4'],
        ['Body-centred cubic', 143, null, null, null, null, null, null, 'None: synthetic', null, '54038-81-2'],
        ['Hexagonal close-packed', 141, null, null, null, null, null, null, 'None: synthetic', null, '54037-14-8'],
        ['Hexagonal close-packed', 134, null, null, null, null, null, null, 'None: synthetic', null, '54037-57-9'],
        ['Face-centred cubic', 129, 'Paramagnetic', null, null, null, null, null, 'None: synthetic', null, '54038-01-6'],
        ['Body-centred cubic', 128, null, null, null, null, null, null, 'None: synthetic', null, '54083-77-1'],
        ['Body-centred cubic', 121, null, null, null, null, null, null, 'None: synthetic', null, '54386-24-2'],
        ['Hexagonal close-packed', 122, null, null, null, null, null, null, 'None: synthetic', null, '54084-26-3'],
        ['Hexagonal close-packed', '172–180', null, null, 7.61, 130, null, null, 'None: synthetic', null, '54084-70-7'],
        [null, '171–177', null, null, null, 38, null, null, 'None: synthetic', null, '54085-16-4'],
        [null, '156–158', null, null, 5.94, 138, null, null, 'None: synthetic', null, '54085-64-2'],
        [null, '162–166', null, null, 7.61, 42, null, null, 'None: synthetic', null, '54100-71-9'],
        [null, '156–157', null, null, null, null, null, null, 'None: synthetic', 'Semimetallic', '54101-14-3'],
        ['Face-centred cubic', 157, null, null, null, null, null, null, 'None: synthetic', 'Metallic', '54144-19-3']
    ];

    // the values that are predicted, or estimated, not measured: of the heaviest elements, made a few atoms at a time, and of
    // some others, as Wikipedia marks them; and the electron affinities of the atoms whose ion falls apart, below 0
    var PREDICTED = {
        At: 'mp density crystal appearance', Rn: 'crystal affinity',
        Fr: 'mp density heat covalent crystal conductivity resistivity affinity', Ra: 'affinity', Ac: 'bp affinity', Pa: 'affinity',
        Np: 'bp affinity', Pu: 'affinity', Am: 'bp affinity', Cm: 'affinity', Bk: 'fusion affinity', Cf: 'bp affinity', Es: 'bp affinity',
        Fm: 'mp density crystal affinity', Md: 'mp density crystal affinity', No: 'mp density en crystal affinity',
        Lr: 'mp density en crystal appearance affinity', Rf: 'mp bp density ie covalent crystal', Db: 'density ie covalent crystal',
        Sg: 'density ie covalent crystal', Bh: 'density ie covalent crystal', Hs: 'density ie covalent crystal',
        Mt: 'density ox ie covalent crystal magnetic', Ds: 'density ox ie covalent crystal', Rg: 'density ox ie covalent crystal affinity',
        Cn: 'mp bp density ie covalent crystal', Nh: 'mp bp density ox ie covalent crystal fusion vaporization affinity',
        Fl: 'mp density ox ie covalent vaporization', Mc: 'mp bp density ox ie covalent fusion vaporization affinity',
        Lv: 'mp bp density ox ie covalent fusion vaporization affinity', Ts: 'mp bp density ox ie covalent appearance affinity',
        Og: 'mp bp density ox ie covalent crystal appearance affinity', He: 'affinity', Be: 'affinity', N: 'affinity', Ne: 'affinity',
        Mg: 'affinity', Ar: 'affinity', Mn: 'affinity', Zn: 'affinity', Kr: 'affinity', Cd: 'affinity', Xe: 'affinity', Yb: 'affinity',
        Hg: 'affinity', Po: 'affinity', Pm: 'resistivity', Eu: 'conductivity'
    };

    // Of each element in its order: what it is used for and where its name, or its making, comes from (PubChem, from
    // the Jefferson Lab and the CRC Handbook); its specific heat in J/(g·K) (Wikipedia, from the CRC Handbook; of Tc, Po, Fr, Np,
    // Pu and Am, the molar heat capacity Wikipedia gives ÷ its mass); who
    // observed it first and who isolated it, where not the same (Wikipedia's timeline of the discoveries); and its
    // isotopes: the stable ones, most abundant first, or its longest-lived (Wikipedia, from the NUBASE table).
    // null where it is not known
    var MORE = [
        ['Hydrogen is a commercially important element. Large amounts of hydrogen are combined with nitrogen from the air to produce ammonia (NH3) through a process called the Haber process.', 'The name derives from the Greek hydro for "water" and genes for "forming" because it burned in air to form water.', 14.304, 'Robert Boyle', null, '2 stable: ¹H, ²H'],
        ['Helium is commercially recovered from natural gas deposits, mostly from Texas, Oklahoma and Kansas. Helium gas is used to inflate blimps, scientific balloons and party balloons.', 'The name derives from the Greek helios for "sun".', 5.193, 'Joseph Norman Lockyer', 'William Ramsay, Per Theodor Cleve, and Nils Langlet', '2 stable: ⁴He, ³He'],
        ['Many uses have been found for lithium and its compounds. Lithium has the highest specific heat of any solid element and is used in heat transfer applications.', 'The name derives from the Latin lithos for "stone" because lithium was thought to exist only in minerals at that time.', 3.582, 'Johan August Arfwedson', 'William Thomas Brande', '2 stable: ⁷Li, ⁶Li'],
        ['Beryllium is relatively transparent to X-rays and is used to make windows for X-ray tubes.', 'The name derives from the Greek word beryllos for "beryl", a gemstone in which it is found (3BeO×Al2O3×6SiO2).', 1.825, 'Louis Nicolas Vauquelin', 'Friedrich Wöhler and Antoine Bussy', '1 stable: ⁹Be'],
        ['Boron is used in pyrotechnics and flares to produce a green color. Boron has also been used in some rockets as an ignition source.', 'The name derives from the Arabic buraq for "white".', 1.026, 'Louis-Bernard Guyton de Morveau, Antoine Lavoisier, Claude Louis Berthollet, and Antoine François, comte de Fourcroy', 'Humphry Davy', '2 stable: ¹¹B, ¹⁰B'],
        ['Amorphous carbon is formed when a material containing carbon is burned without enough oxygen for it to burn completely.', 'The name derives from the Latin carbo for "charcoal". It was known in prehistoric times in the form of charcoal and soot.', 0.709, 'Earliest humans', null, '2 stable: ¹²C, ¹³C'],
        ['The largest use of nitrogen is for the production of ammonia (NH3). Large amounts of nitrogen are combined with hydrogen to produce ammonia in a method known as the Haber process.', 'The name derives from the Latin nitrum and Greek nitron for "native soda" and genes for "forming".', 1.04, 'Daniel Rutherford', null, '2 stable: ¹⁴N, ¹⁵N'],
        ['Oxygen is a highly reactive element and is capable of combining with most other elements. It is required by most living organisms and for most forms of combustion.', 'The name derives from the Greek oxys for "acid" and genes for "forming" because the French chemist Antoine-Laurent Lavoisier once thought that oxygen was integral to all acids.', 0.918, 'Carl Wilhelm Scheele', null, '3 stable: ¹⁶O, ¹⁸O, ¹⁷O'],
        ['Fluorine is added to city water supplies in the proportion of about one part per million to help prevent tooth decay.', 'The name derives from the Latin fluere for "flow" or "flux" because fluorite (CaF2) was used as a flux in metallurgy owing to its low melting point.', 0.824, 'Carl Wilhelm Scheele', 'Henri Moissan', '1 stable: ¹⁹F'],
        ['The largest use for neon gas is in advertising signs. Neon is also used to make high voltage indicators and is combined with helium to make helium-neon lasers.', 'The name derives from the Greek neos for "new".', 1.03, 'William Ramsay and Morris W. Travers', null, '3 stable: ²⁰Ne, ²²Ne, ²¹Ne'],
        ['Sodium is used in the production of titanium, sodamide, sodium cyanide, sodium peroxide, and sodium hydride. Liquid sodium has been used as a coolant for nuclear reactors.', 'The name derives from the English soda and Latin sodanum for "headache remedy". The symbol Na derives from the Latin natrium for "natron" (soda in English).', 1.228, 'Georg Ernst Stahl', 'Humphry Davy', '1 stable: ²³Na'],
        ['Magnesium burns with a brilliant white light and is used in pyrotechnics, flares and photographic flashbulbs.', 'The name derives from Magnesia, a district in the north-eastern region of Greece called Thessalia.', 1.023, 'Joseph Black', 'Humphry Davy', '3 stable: ²⁴Mg, ²⁶Mg, ²⁵Mg'],
        ['Two important developments in the 1880s greatly increased the availability of aluminum. The first was the invention of a new process for obtaining aluminum from aluminum oxide.', 'The name derives from the Latin, alum and alumen for "stringent" because the early Romans called any substance with a stringent taste alum.', 0.897, 'Johann Heinrich Pott', 'H.C.Ørsted', '1 stable: ²⁷Al'],
        ['Two allotropes of silicon exist at room temperature: amorphous and crystalline. Amorphous appears as a brown powder while crystalline silicon has a metallic luster and a grayish color.', 'The name derives from the Latin silex and silicis for "flint". Amorphous silicon was discovered by the Swedish chemist Jöns Jacob Berzelius in 1824.', 0.705, 'Johann Heinrich Pott', 'Jöns Jakob Berzelius', '3 stable: ²⁸Si, ²⁹Si, ³⁰Si'],
        ['Phosphorus has three main allotropes: white, red and black. White phosphorus is poisonous and can spontaneously ignite when it comes in contact with air.', 'The name derives from the Greek phosphoros for "bringing light" because it has the property of glowing in the dark.', 0.769, 'Hennig Brand', null, '1 stable: ³¹P'],
        ['Most of the sulfur that is produced is used in the manufacture of sulfuric acid (H2SO4).', 'The name derives from the Latin sulphurium and the Sanskrit sulveri. Sulfur was known as brenne stone for "combustible stone" from which brim-stone is derived.', 0.71, 'Middle East', null, '4 stable: ³²S, ³⁴S, ³³S, ³⁶S'],
        ['Chlorine is commonly used as an antiseptic and is used to make drinking water safe and to treat swimming pools.', 'The name derives from the Greek chloros for "pale green" or "greenish yellow" colour of the element.', 0.479, 'Carl Wilhelm Scheele', null, '2 stable: ³⁵Cl, ³⁷Cl'],
        ['Argon is frequently used when an inert atmosphere is needed. It is used to fill incandescent and fluorescent light bulbs to prevent oxygen from corroding the hot filament.', 'The name derives from the Greek argos for "lazy" or "inactive" because it does not combine with other elements.', 0.52, 'Lord Rayleigh and William Ramsay', null, '3 stable: ⁴⁰Ar, ³⁶Ar, ³⁸Ar'],
        ['Potassium forms an alloy with sodium (NaK) that is used as a heat transfer medium in some types of nuclear reactors.', 'The name derives from the English "potash" or "pot ashes" because it is found in caustic potash (KOH).', 0.757, 'Georg Ernst Stahl', 'Humphry Davy', '2 stable: ³⁹K, ⁴¹K; in nature also radioactive ⁴⁰K'],
        ['Due to its high reactivity with common materials, there is very little demand for metallic calcium. It is used in some chemical processes to refine thorium, uranium and zirconium.', 'The name derives from the Latin calx for "lime" (CaO) or "limestone" (CaCO3) in which it was found.', 0.647, 'Johann Heinrich Pott', 'Humphry Davy', '5 stable: ⁴⁰Ca, ⁴⁴Ca, ⁴²Ca, ⁴³Ca, ⁴⁶Ca; in nature also radioactive ⁴⁸Ca'],
        ['Alloys of scandium and aluminum are used in some kinds of athletic equipment, such as aluminum baseball bats, bicycle frames and lacrosse sticks.', 'The name derives from the Latin scandia for Scandinavia, where the mineral was found.', 0.568, 'Lars Fredrik Nilson', 'W. Fischer, K. Brünger, H. Grieneisen', '1 stable: ⁴⁵Sc'],
        ['Titanium is a strong, light metal. It is as strong as steel and twice as strong as aluminum, but is 45% lighter than steel and only 60% heavier than aluminum.', 'The name derives from the Latin titans, who were the mythological "first sons of the earth".', 0.523, 'William Gregor', 'D. K. Kirillov', '5 stable: ⁴⁸Ti, ⁴⁶Ti, ⁴⁷Ti, ⁴⁹Ti, ⁵⁰Ti'],
        ['Vanadium is corrosion resistant and is sometimes used to make special tubes and pipes for the chemical industry.', 'The name derives from the Scandinavian goddess of love and beauty, Freyja Vanadis, because of its many beautiful multi-coloured compounds.', 0.489, 'Andrés Manuel del Río', 'Henry Enfield Roscoe', '1 stable: ⁵¹V; in nature also radioactive ⁵⁰V'],
        ['Chromium is a blue-white metal that is hard, brittle and very corrosion resistant.', 'The name derives from the Greek chroma for "colour", from the many coloured compounds of chromium.', 0.449, 'Louis Nicolas Vauquelin', null, '4 stable: ⁵²Cr, ⁵³Cr, ⁵⁰Cr, ⁵⁴Cr'],
        ['Nearly 90% of all of the manganese produced each year is used in the production of steel.', 'The name derives from the Latin magnes for "magnet" since pyrolusite (MnO2) has magnetic properties.', 0.479, 'Torbern Olof Bergman', 'Johan Gottlieb Gahn', '1 stable: ⁵⁵Mn'],
        ['Huge amounts of iron are used to make steel, an alloy of iron and carbon. Steel typically contains between 0.3% and 1.5% carbon, depending on the desired characteristics.', 'The name derives from the Anglo-Saxon iron of unknown origin. The element has been known from prehistoric times.', 0.449, 'Middle East', null, '4 stable: ⁵⁶Fe, ⁵⁴Fe, ⁵⁷Fe, ⁵⁸Fe'],
        ['Although cobalt is used in electroplating to give objects an attractive surface that resists oxidation, it is more widely used to form alloys.', 'The name derives from the German Kobold for "evil spirits" or "goblins", who were superstitiously thought to cause trouble for miners because the mineral…', 0.421, 'Georg Brandt', null, '1 stable: ⁵⁹Co'],
        ['Nickel is a hard, corrosion resistant metal. It can be electroplated onto other metals to form a protective coating.', 'The name derives from the German Nickel for "deceptive little spirit" because miners called mineral niccolite (NiAs) by the name Kupfernickel (false copper) because it resembled copper ores in appearance, but no copper was found in the ore.', 0.444, 'Axel Fredrik Cronstedt', null, '5 stable: ⁵⁸Ni, ⁶⁰Ni, ⁶²Ni, ⁶¹Ni, ⁶⁴Ni'],
        ['Used in large amounts by the electrical industry in the form of wire, copper is second only to silver in electrical conductance.', 'The name derives from the Latin cuprum for Cyprus, the island where the Romans first obtained copper. The symbol Cu also comes from the Latin cuprum.', 0.385, 'Middle East', null, '2 stable: ⁶³Cu, ⁶⁵Cu'],
        ['Roughly one third of all metallic zinc produced today is used in a process known as galvanization.', 'The name derives from the German zink of unknown origin.', 0.388, 'Indian metallurgists', null, '5 stable: ⁶⁴Zn, ⁶⁶Zn, ⁶⁸Zn, ⁶⁷Zn, ⁷⁰Zn'],
        ['Gallium melts near room temperature and has one of the largest liquid ranges of any metal, so it has found use in high temperature thermometers.', 'The name derives from the Latin gallia for France. It was discovered in zinc blende by the French chemist Paul-Emile Lecoq de Boisbaudran in 1875.', 0.371, 'Paul Emile Lecoq de Boisbaudran', 'Paul Emile Lecoq de Boisbaudran and Emil Jungfleisch', '2 stable: ⁶⁹Ga, ⁷¹Ga'],
        ['The largest use of germanium is in the semiconductor industry.', 'The name derives from the Latin germania for Germany.', 0.32, 'Clemens Winkler', null, '4 stable: ⁷⁴Ge, ⁷²Ge, ⁷⁰Ge, ⁷³Ge; in nature also radioactive ⁷⁶Ge'],
        ['Arsenic and its compounds are poisonous. They have been used to make rat poison and some insecticides. Small amounts of arsenic are added to germanium to make transistors.', 'The name derives from the Latin arsenicium and the Greek arsenikos for "masculine" or "male" because the ancients thought that metals were different sexes.', 0.329, 'Egyptians', null, '1 stable: ⁷⁵As'],
        ['Selenium\'s resistance to the flow of electricity is greatly affected by the amount of light shining on it. The brighter the light, the better selenium conducts electricity.', 'The name derives from the Greek Selene, who was the Greek goddess of the Moon because the element is chemically found with tellurium (Tellus was the Roman goddess of the Earth).', 0.321, 'Jöns Jakob Berzelius and Johann Gottlieb Gahn', null, '5 stable: ⁸⁰Se, ⁷⁸Se, ⁷⁶Se, ⁷⁷Se, ⁷⁴Se; in nature also radioactive ⁸²Se'],
        ['Elemental bromine is a hazardous material. It causes severe burns when it comes in contact with the skin and its vapor irritates the eyes, nose and throat.', 'The name derives from the Greek bromos for "bad stench" or "bad odour".', 0.474, 'Antoine Jérôme Balard and Carl Jacob Löwig', null, '2 stable: ⁷⁹Br, ⁸¹Br'],
        ['The high cost of obtaining krypton from the air has limited its practical applications. Krypton is used in some types of photographic flashes used in high speed photography.', 'The name derives from the Greek kryptos for "concealed" or "hidden".', 0.248, 'William Ramsay and Morris W. Travers', null, '5 stable: ⁸⁴Kr, ⁸⁶Kr, ⁸²Kr, ⁸³Kr, ⁸⁰Kr; in nature also radioactive ⁷⁸Kr'],
        ['Rubidium is used in vacuum tubes as a getter, a material that combines with and removes trace gases from vacuum tubes. It is also used in the manufacture of photocells and in special glasses.', 'The name derives from the Latin rubidus for "deepest red" because of the two deep red lines in its spectra.', 0.363, 'Gustav Kirchhoff and Robert Bunsen', 'Robert Bunsen', '1 stable: ⁸⁵Rb; in nature also radioactive ⁸⁷Rb'],
        ['Most of the strontium produced today is used in the manufacture of color television picture tubes. It is also used to refine zinc and is combined with iron to make magnets.', 'The name derives from Strontian, a town in Scotland. The mineral strontianite is found in mines in Strontian.', 0.301, 'Adair Crawford', 'Humphry Davy', '4 stable: ⁸⁸Sr, ⁸⁶Sr, ⁸⁷Sr, ⁸⁴Sr'],
        ['Although metallic yttrium is not widely used, several of its compounds are.', 'The name derives from the Swedish village of Ytterby where the mineral gadolinite was found.', 0.298, 'Johan Gadolin', 'Heinrich Rose', '1 stable: ⁸⁹Y'],
        ['Zirconium is a corrosion resistant metal that is used in high performance pumps and valves. Since it also does not easily absorb neutrons, zirconium is widely used in nuclear reactors.', 'The name derives from the Arabic zargun for "gold-like". It was discovered in zirconia by the German chemist Martin-Heinrich Klaproth in 1789.', 0.278, 'Martin Heinrich Klaproth', 'Jöns Jakob Berzelius', '4 stable: ⁹⁰Zr, ⁹⁴Zr, ⁹²Zr, ⁹¹Zr; in nature also radioactive ⁹⁶Zr'],
        ['Niobium is used as an alloying agent and for jewelry, but perhaps its most interesting applications are in the field of superconductivity.', 'The name derives from the Greek mythological character Niobe, who was the daughter of Tantalus, because the elements niobium and tantalum were originally thought to be identical.', 0.265, 'Charles Hatchett', 'Christian Wilhelm Blomstrand', '1 stable: ⁹³Nb'],
        ['Molybdenum has a high melting point and is used to make the electrodes of electrically heated glass furnaces. Some electrical filaments are also made from molybdenum.', 'The name derives from the Greek molybdos for "lead". The ancients used the term "lead" for any black mineral that leaves a mark on paper.', 0.251, 'Carl Wilhelm Scheele', 'Peter Jacob Hjelm', '6 stable: ⁹⁸Mo, ⁹⁶Mo, ⁹⁵Mo, ⁹²Mo, ⁹⁷Mo, ⁹⁴Mo; in nature also radioactive ¹⁰⁰Mo'],
        ['Small amounts of technetium can retard the corrosion of steel, although this protection can only be applied to closed systems due to technetium\'s radioactivity.', 'Technetium was the first artificially produced element. It was isolated by Carlo Perrier and Emilio Segrè in 1937.', 0.248, 'Carlo Perrier and Emilio Segrè', 'S. Fried', 'None stable; longest-lived ⁹⁷Tc, half-life 4.21×10⁶ years'],
        ['Ruthenium is primarily used as an alloying agent. Adding 0.1% ruthenium to titanium makes titanium 100 times more resistant to corrosion.', 'The name derives from the Latin ruthenia for the old name of Russia.', 0.238, 'Karl Ernst Claus', null, '7 stable: ¹⁰²Ru, ¹⁰⁴Ru, ¹⁰¹Ru, ⁹⁹Ru, ¹⁰⁰Ru, ⁹⁶Ru, ⁹⁸Ru'],
        ['Rhodium is used to make electrical contacts, as jewelry and in catalytic converters, but is most frequently used as an alloying agent in other materials, such as platinum and palladium.', 'The name derives from the Greek rhodon for rose because of the rose color of dilute solutions of its salts.', 0.243, 'William Hyde Wollaston', null, '1 stable: ¹⁰³Rh'],
        ['Palladium is used to make springs for watches, surgical instruments, electrical contacts and dental fillings and crowns.', 'The name derives from the second largest asteroid of the solar system Pallas (named after the goddess of wisdom and arts—Pallas Athene).', 0.244, 'William Hyde Wollaston', null, '6 stable: ¹⁰⁶Pd, ¹⁰⁸Pd, ¹⁰⁵Pd, ¹¹⁰Pd, ¹⁰⁴Pd, ¹⁰²Pd'],
        ['Silver and silver compounds have many uses.', 'The name derives from the Anglo-Saxon seofor and siolfur, which is of unknown origin.', 0.235, 'Asia Minor', null, '2 stable: ¹⁰⁷Ag, ¹⁰⁹Ag'],
        ['Cadmium is a poisonous metal and its use is somewhat limited for this reason. Like zinc, cadmium can be electroplated to other materials to protect them from corrosion.', 'The name derives from Greek kadmeia for "calamine" (zinc carbonate), with which it was found as an impurity in nature.', 0.232, 'Karl Samuel Leberecht Hermann, Friedrich Stromeyer, and J.C.H. Roloff', 'Karl Samuel Leberecht Hermann,  Friedrich Stromeyer, and J.C.H. Roloff', '6 stable: ¹¹⁴Cd, ¹¹²Cd, ¹¹¹Cd, ¹¹⁰Cd, ¹⁰⁶Cd, ¹⁰⁸Cd; in nature also radioactive ¹¹³Cd, ¹¹⁶Cd'],
        ['Indium is used to coat the bearings of high speed motors since it allows for the even distribution of lubricating oil. Indium is used to dope germanium to make transistors.', 'The name derives from the term "indigo" for the indigo-blue line in the element\'s spark spectrum.', 0.233, 'Ferdinand Reich and Hieronymous Theodor Richter', 'Hieronymous Theodor Richter', '1 stable: ¹¹³In; in nature also radioactive ¹¹⁵In'],
        ['Tin resists corrosion and is used as a protective coating on other metals. Tin cans are probably the most familiar example of this application. A tin can is actually made from steel.', 'The name derives from the Anglo-Saxon tin of unknown origin. The symbol Sn is derived from Latin stannum for alloys containing lead.', 0.228, 'Asia Minor', null, '10 stable: ¹²⁰Sn, ¹¹⁸Sn, ¹¹⁶Sn, ¹¹⁹Sn, ¹¹⁷Sn, ¹²⁴Sn, ¹²²Sn, ¹¹²Sn, ¹¹⁴Sn, ¹¹⁵Sn'],
        ['Antimony is a brittle metal and is a poor conductor of heat and electricity. Very pure antimony is used to make certain types of semiconductor devices, such as diodes and infrared detectors.', 'The name derives from the Greek, anti + monos for "not alone" or "not one" because it was found in many compounds.', 0.207, 'Sumerians', null, '2 stable: ¹²¹Sb, ¹²³Sb'],
        ['Tellurium is a semiconductor and is frequently doped with copper, tin, gold or silver. Tellurium is also used to color glass and ceramics and is one of the primary ingredients in blasting caps.', 'The name derives from the Latin Tellus, who was the Roman goddess of the Earth.', 0.202, 'Franz-Joseph Müller von Reichenstein', 'Martin Heinrich Klaproth', '6 stable: ¹²⁶Te, ¹²⁵Te, ¹²⁴Te, ¹²²Te, ¹²³Te, ¹²⁰Te; in nature also radioactive ¹³⁰Te, ¹²⁸Te'],
        ['Iodine is used as a test for starch and turns a deep blue when it comes in contact with it.', 'The name derives from the Greek iodes for "violet" because of its violet vapours.', 0.214, 'Bernard Courtois', null, '1 stable: ¹²⁷I'],
        ['Xenon produces a brilliant white flash of light when it is excited electrically and is widely used in strobe lights.', 'The name derives from the Greek xenos for "the stranger".', 0.158, 'William Ramsay and Morris W. Travers', null, '7 stable: ¹³²Xe, ¹²⁹Xe, ¹³¹Xe, ¹³⁴Xe, ¹³⁰Xe, ¹²⁸Xe, ¹²⁶Xe; in nature also radioactive ¹³⁶Xe, ¹²⁴Xe'],
        ['Cesium has the second lowest melting point of all metallic elements, which limits its uses.', 'The name derives from the Latin caesius for "sky blue", which was the colour of the caesium line in the spectroscope.', 0.242, 'Gustav Kirchhoff and Robert Bunsen', 'Carl Setterberg', '1 stable: ¹³³Cs'],
        ['Barium is used as a getter, a material that combines with and removes trace gases from vacuum tubes.', 'Barium was first isolated by Sir Humphry Davy, an English chemist, in 1808 through the electrolysis of molten baryta (BaO).', 0.204, 'Carl Wilhelm Scheele', 'Humphry Davy', '6 stable: ¹³⁸Ba, ¹³⁷Ba, ¹³⁶Ba, ¹³⁵Ba, ¹³⁴Ba, ¹³²Ba; in nature also radioactive ¹³⁰Ba'],
        ['Lanthanum is one of the rare earth elements used to make carbon arc lights which are used in the motion picture industry for studio lighting and projector lights.', 'The name derives from the Greek lanthanein for "to be hidden" or "to escape notice" because it hid in cerium ore and was difficult to separate from that rare earth mineral.', 0.195, 'Carl Gustaf Mosander', 'W. Muthmann, L. Weiss', '1 stable: ¹³⁹La; in nature also radioactive ¹³⁸La'],
        ['Pure cerium will ignite if it is scratched with a sharp object, but can be safely used if combined with other materials.', 'The name derives from the planetoid Ceres, which was discovered by the Italian astronomer Giuseppe Piazzi in 1801 and named for Ceres, the Roman goddess of agriculture and harvest.', 0.192, 'Martin Heinrich Klaproth, Wilhelm Hisinger, and Jöns Jakob Berzelius', 'William Francis Hillebrand and T. H. Norton', '4 stable: ¹⁴⁰Ce, ¹⁴²Ce, ¹³⁸Ce, ¹³⁶Ce'],
        ['Praseodymium\'s primary use is as an alloying agent with magnesium to create high-strength metals that are used in aircraft engines.', 'The name derives from the Greek prasios for "green" and didymos for "twin" because of the pale green salts it forms.', 0.193, 'Carl Auer von Welsbach', 'W. Muthmann, L. Weiss', '1 stable: ¹⁴¹Pr'],
        ['Neodymium makes up about 18% of Misch metal, a material that is used to make flints for lighters.', 'The name derives from the Greek neos for "new" and didymos for "twin".', 0.19, 'Carl Gustaf Mosander', 'W. Muthmann, H. Hofer, L. Weiss', '5 stable: ¹⁴²Nd, ¹⁴⁶Nd, ¹⁴³Nd, ¹⁴⁵Nd, ¹⁴⁸Nd; in nature also radioactive ¹⁴⁴Nd, ¹⁵⁰Nd'],
        ['Promethium could be used to make a nuclear powered battery. This type of battery would use the beta particles emitted by the decay of promethium to make a phosphor give off light.', 'The existence of promethium was predicted by Bohuslav Brauner, a Czech chemist, in 1902.', null, 'Jacob A. Marinsky, Lawrence E. Glendenin, and Charles D. Coryell', 'F. Weigel', 'None stable; longest-lived ¹⁴⁵Pm, half-life 17.7 years'],
        ['Samarium is one of the rare earth elements used to make carbon arc lights which are used in the motion picture industry for studio lighting and projector lights.', 'The name derives from the mineral samarskite, in which it was found and that had been named for Colonel Samarski, a Russian mine official.', 0.197, 'P.E.L. de Boisbaudran', 'W. Muthmann', '5 stable: ¹⁵²Sm, ¹⁵⁴Sm, ¹⁴⁹Sm, ¹⁵⁰Sm, ¹⁴⁴Sm; in nature also radioactive ¹⁴⁷Sm, ¹⁴⁸Sm'],
        ['Europium is the most reactive of the rare earth elements. There are no commercial applications for europium metal, although it has been used to dope some types of plastics to make lasers.', 'The name derives from the continent of Europe.', 0.182, 'Eugène-Anatole Demarçay', 'Wilhelm Klemm and H. Bommer', '1 stable: ¹⁵³Eu; in nature also radioactive ¹⁵¹Eu'],
        ['Gadolinium has the greatest ability to capture thermal neutrons of all known elements and can be used as control rods for nuclear reactors.', 'The name derives from the mineral gadolinite, in which it was found, and that had been named for the Finnish rare earth chemist Johan Gadolin.', 0.236, 'J. C. G. de Marignac', 'Félix Trombe', '6 stable: ¹⁵⁸Gd, ¹⁶⁰Gd, ¹⁵⁶Gd, ¹⁵⁷Gd, ¹⁵⁵Gd, ¹⁵⁴Gd; in nature also radioactive ¹⁵²Gd'],
        ['Terbium is used to dope some types of solid-state devices and along with zirconium dioxide (ZrO2), as a crystal stabilizer in fuel cells that operate at high temperatures.', 'The name derives from the village of Ytterby in Sweden, where the mineral ytterbite (the source of terbium) was first found.', 0.182, 'Carl Gustaf Mosander', 'Wilhelm Klemm and H. Bommer', '1 stable: ¹⁵⁹Tb'],
        ['There are no commercial applications for dysprosium. Since it easily absorbs neutrons and has a high melting point, dysprosium might be alloyed with steel for use in nuclear reactors.', 'The name derives from the Greek dysprositos for "hard to get at", owing to the difficulty in separating this rare earth element from a holmium mineral in which it was found.', 0.17, 'P.E.L. de Boisbaudran', 'Wilhelm Klemm and H. Bommer', '7 stable: ¹⁶⁴Dy, ¹⁶²Dy, ¹⁶³Dy, ¹⁶¹Dy, ¹⁶⁰Dy, ¹⁵⁸Dy, ¹⁵⁶Dy'],
        ['Holmium has the greatest magnetic strength of any element, so it is used in the pole pieces of the strongest static magnets. It is also used in holmium lasers, in medicine and dentistry, and to absorb neutrons in nuclear reactors.', 'The name derives from the Latin holmia for Stockholm.', 0.165, 'Jacques-Louis Soret and Marc Delafontaine', 'H. Bommer', '1 stable: ¹⁶⁵Ho'],
        ['Erbium is alloyed with vanadium to make it softer and easier to shape. Erbium is added to fiber optic cables as a doping agent where it is used as a signal amplifier.', 'The name derives from the Swedish town of Ytterby, where the ore gadolinite (in which it was found) was first mined.', 0.168, 'Carl Gustaf Mosander', 'Wilhelm Klemm and H. Bommer', '6 stable: ¹⁶⁶Er, ¹⁶⁸Er, ¹⁶⁷Er, ¹⁷⁰Er, ¹⁶⁴Er, ¹⁶²Er'],
        ['Thulium is the least abundant of the naturally occurring rare earth elements. Metallic thulium is relatively expensive and has only recently become available.', 'The name derives from Thule, the earliest name for the northernmost part of the civilized world—Scandinavia.', 0.16, 'Per Theodor Cleve', 'Wilhelm Klemm and H. Bommer', '1 stable: ¹⁶⁹Tm'],
        ['Ytterbium has few uses. It can be alloyed with stainless steel to improve some of its mechanical properties and used as a doping agent in fiber optic cable where it can be used as an amplifier.', 'The name derives from the Swedish village of Ytterby where the mineral ytterbite (the source of ytterbium) was originally found.', 0.155, 'Jean Charles Galissard de Marignac', 'Wilhelm Klemm and H. Bommer', '7 stable: ¹⁷⁴Yb, ¹⁷²Yb, ¹⁷³Yb, ¹⁷¹Yb, ¹⁷⁶Yb, ¹⁷⁰Yb, ¹⁶⁸Yb'],
        ['Lutetium is one of the most difficult elements to prepare and has no large scale practical uses, although some of its radioactive isotopes can be used as a catalyst in the cracking of petroleum products and a catalyst in some hydrogenation and polymerization processes.', 'The name derives from Lutetia, the ancient name for the city of Paris.', 0.154, 'Carl Auer von Welsbach and Georges Urbain', 'Wilhelm Klemm and H. Bommer', '1 stable: ¹⁷⁵Lu; in nature also radioactive ¹⁷⁶Lu'],
        ['Hafnium is a good absorber of neutrons and is used in the control rods of nuclear reactors.', 'The name derives from the Latin hafnia for Copenhagen.', 0.144, 'Dirk Coster and Georg von Hevesy', 'Anton Eduard van Arkel and Jan Hendrik de Boer', '5 stable: ¹⁸⁰Hf, ¹⁷⁸Hf, ¹⁷⁷Hf, ¹⁷⁹Hf, ¹⁷⁶Hf; in nature also radioactive ¹⁷⁴Hf'],
        ['Tantalum is a strong, ductile metal that is nearly immune to chemical attack at room temperatures. It can be drawn into a fine wire that is used to evaporate metals, such as aluminum.', 'The name derives from the Greek mythological character Tantalus who was banished to Hades, the region of lost souls where he was placed up to his chin in…', 0.14, 'Anders Gustaf Ekeberg', 'Jean Charles Galissard de Marignac', '2 stable: ¹⁸¹Ta, ¹⁸⁰Ta'],
        ['Pure tungsten is a light gray or whitish metal that is soft enough to be cut with a hacksaw and ductile enough to be drawn into wire or extruded into various shapes.', 'The name derives from the Swedish tungsten for "heavy stone".', 0.132, 'Carl Wilhelm Scheele', 'J. and Fausto Elhuyar', '4 stable: ¹⁸⁴W, ¹⁸⁶W, ¹⁸²W, ¹⁸³W; in nature also radioactive ¹⁸⁰W'],
        ['Rhenium is used in flash lamps for photography and for filaments in mass spectrographs and ion gages, but is most frequently used as an alloying agent in tungsten and molybdenum and as a catalyst for performing certain reactions to a type of hydrocarbon known as an olefin.', 'The name derives from the Latin rhenus for the Rhine river in Germany.', 0.137, 'Masataka Ogawa', null, '1 stable: ¹⁸⁵Re; in nature also radioactive ¹⁸⁷Re'],
        ['Metallic osmium is hard, brittle and very difficult to make. Powdered osmium is easier to make but emits osmium tetroxide (OsO4) when it is exposed to the air.', 'The name derives from the Greek osme for "smell" because of the sharp odor of its volatile oxide.', 0.13, 'Smithson Tennant', null, '5 stable: ¹⁹²Os, ¹⁹⁰Os, ¹⁸⁹Os, ¹⁸⁸Os, ¹⁸⁷Os; in nature also radioactive ¹⁸⁶Os, ¹⁸⁴Os'],
        ['Pure iridium is very brittle and is nearly impossible to machine. It is primarily used as a hardening agent for platinum.', 'The name derives from the Latin Iris, the Greek goddess of rainbows, because of the variety of colours in the element\'s salt solutions.', 0.131, 'Smithson Tennant and Hippolyte-Victor Collet-Descotils', 'Smithson Tennant', '2 stable: ¹⁹³Ir, ¹⁹¹Ir'],
        ['Platinum is a soft, dense, ductile metal that is very resistant to corrosion. It is used to make jewelry, wire, electrical contacts and laboratory vessels.', 'The name derives from the Spanish platina for "silver". In 1735, the Spanish astronomer Antonio de Ulloa found platinum in Peru, South America.', 0.133, 'Pre-Columbian South Americans', null, '5 stable: ¹⁹⁵Pt, ¹⁹⁴Pt, ¹⁹⁶Pt, ¹⁹⁸Pt, ¹⁹²Pt; in nature also radioactive ¹⁹⁰Pt'],
        ['Gold is the most malleable and ductile of all known metals. A single ounce of gold can be beaten into a sheet measuring roughly 5 meters on a side.', 'The name derives from the Sanskrit jval for "shine", the Teutonic word gulth for "shining metal", and the Anglo-Saxon gold of unknown origin.', 0.129, 'Earliest humans', null, '1 stable: ¹⁹⁷Au'],
        ['Mercury can be used to make thermometers, barometers and other scientific instruments. Mercury conducts electricity and is used to make silent, position dependent switches.', 'The name derives from the Roman god Mercury, the nimble messenger of the gods, because the ancients used that name for the element known from prehistoric times.', 0.14, 'Egyptians', null, '7 stable: ²⁰²Hg, ²⁰⁰Hg, ¹⁹⁹Hg, ²⁰¹Hg, ¹⁹⁸Hg, ²⁰⁴Hg, ¹⁹⁶Hg'],
        ['There are no uses for metallic thallium since pure thallium quickly combines with oxygen and water vapor from the atmosphere, forming a black, powdery substance.', 'The name derives from the Greek thallos for "green shoot" or "twig" because of the bright green line in its spectrum.', 0.129, 'William Crookes', 'Claude-Auguste Lamy', '2 stable: ²⁰⁵Tl, ²⁰³Tl'],
        ['Lead is a soft, malleable and corrosion resistant material. The ancient Romans used lead to make water pipes, some of which are still in use today.', 'The name derives from the Anglo-Saxon lead, which is of unknown origin. The element was known from prehistoric times.', 0.129, 'Asia Minor', null, '4 stable: ²⁰⁸Pb, ²⁰⁶Pb, ²⁰⁷Pb, ²⁰⁴Pb'],
        ['Pure bismuth is a white, brittle metal with a slight pink color. Bismuth is usually mixed with other metals, such as lead, tin, iron or cadmium to form low-melting alloys.', 'The name derives from the German weisse masse for "white mass" from the colour of its oxides. The ancients did not distinguish bismuth from lead.', 0.122, 'European alchemists and Inca civilisation', null, 'None stable; found in nature as ²⁰⁹Bi'],
        ['Polonium can be used to eliminate static electricity in machinery that is caused by processes such as the rolling of paper, wire or sheet metal, although other materials which emit beta particles are more commonly used for this purpose.', 'Polonium was discovered by Marie Sklodowska Curie, a Polish chemist, in 1898.', 0.126, 'P. and Marie Curie', 'W. H. Beamer and C. R. Maxwell', 'None stable; longest-lived ²⁰⁹Po, half-life 124 years'],
        ['Due to the small amounts produced and its short half-life, there are currently no uses for astatine outside of basic scientific research.', 'Astatine was produced by Dale R. Carson, K.R. MacKenzie and Emilio Segrè by bombarding an isotope of bismuth, bismuth-209, with alpha particles that had been accelerated in a device called a cyclotron.', null, 'Dale R. Corson, Kenneth Ross MacKenzie and Emilio Segrè', null, 'None stable; longest-lived ²¹⁰At, half-life 8.1 hours'],
        ['Small amounts of radon are sometimes used by hospitals to treat some forms of cancer. Radon fluoride (RnF) is the only confirmed compound of radon.', 'Radon was discovered by Friedrich Ernst Dorn, a German chemist, in 1900 while studying radium\'s decay chain.', 0.094, 'Ernest Rutherford and Robert B. Owens', 'William Ramsay and Robert Whytlaw-Gray', 'None stable; longest-lived ²²²Rn, half-life 3.823 days'],
        ['Due to the small amounts produced and its short half-life, there are currently no uses for francium outside of basic scientific research.', 'Francium was discovered by Marguerite Catherine Perey, a French chemist, in 1939 while analyzing actinium\'s decay sequence.', 0.143, 'Marguerite Perey', null, 'None stable; longest-lived ²²³Fr, half-life 22 minutes'],
        ['The Curie, a unit used to describe the activity of a radioactive substance, is based on radium-226.', 'Radium was discovered by Marie Sklodowska Curie, a Polish chemist, and Pierre Curie, a French chemist, in 1898.', null, 'P. and Marie Curie', 'Marie Curie and André-Louis Debierne', 'None stable; longest-lived ²²⁶Ra, half-life 1.6×10³ years'],
        ['Actinium has no significant commercial applications, although it is used in the production of neutrons.', 'Actinium was discovered in 1899 by André-Louis Debierne, a French chemist, while experimenting with new methods of separating rare earth oxides.', 0.12, 'Friedrich Oskar Giesel', 'Joseph G. Stites, Murrell L. Salutsky, Bob D. Stone', 'None stable; longest-lived ²²⁷Ac, half-life 21.772 years'],
        ['Thorium is used as an alloying agent to improve magnesium\'s strength at high temperatures. Thorium is also used to coat tungsten filaments used in electronic devices, such at television sets.', 'The name derives from Thor, the Scandinavian god of thunder.', 0.113, 'Jöns Jakob Berzelius', 'D. Lely, Jr. and L. Hamburger', 'None stable; found in nature as ²³²Th'],
        ['Due to its scarcity, high radioactivity and toxicity, there are currently no uses for protactinium outside of basic scientific research.', 'The name derives from the Greek protos (first) for preceding the element actinium, because its most common isotope (231Pa) decays to 227Ac by loss of an alpha particle.', null, 'Kasimir Fajans and Oswald Helmuth Göhring', 'Aristid von Grosse', 'None stable; longest-lived ²³¹Pa, half-life 3.27×10⁴ years'],
        ['Since it is naturally radioactive, uranium, usually in the form of uranium dioxide (UO2), is most commonly used in the nuclear power industry to generate electricity.', 'The name derives from the planet Uranus, which in Roman mythology was "Father Heaven".', 0.116, 'Martin Heinrich Klaproth', 'Eugène-Melchior Péligot', 'None stable; found in nature as ²³⁸U, ²³⁵U'],
        ['Neptunium\'s most stable isotope, neptunium-237, has a half-life of about 2,144,000 years. It decays into protactinium-233 through alpha decay.', 'Neptunium was first produced by Edwin M. McMillian and Philip H. Abelson, working at the University of California, Berkeley, in 1940.', 0.124, 'Edwin McMillan and Philip H. Abelson', 'S. Fried', 'None stable; longest-lived ²³⁷Np, half-life 2.14×10⁶ years'],
        ['Only two of plutonium\'s isotopes, plutonium-238 and plutonium-239, have found uses outside of basic research.', 'Plutonium was first produced by Glenn T. Seaborg, Joseph W. Kennedy, Edward M. McMillan and Arthur C. Wohl by bombarding an isotope of uranium, uranium-238, with deuterons that had been accelerated in a device called a cyclotron.', 0.145, 'Glenn T. Seaborg, Arthur Wahl, Joseph W. Kennedy and Edwin McMillan', 'H. L. Baumbach, S. Fried, P. L. Kirk and R. S. Rosenfels', 'None stable; longest-lived ²⁴⁴Pu, half-life 8.13×10⁷ years'],
        ['Americium can be produced in kilogram quantities and has a few practical uses. It is used in smoke detectors and can be used as a portable source of gamma rays.', 'Americium was discovered in 1944 by the American scientists Glenn T. Seaborg, Ralph A. James, Leon O. Morgan and Albert Ghiorso.', 0.115, 'G. T. Seaborg, R. A. James, Leon O. Morgan and A. Ghiorso', 'Edgar F. Westrum Jr. and LeRoy Eyring', 'None stable; longest-lived ²⁴³Am, half-life 7.35×10³ years'],
        ['Since only milligram amounts of curium have ever been produced, there are currently no commercial applications for it, although it might be used in radioisotope thermoelectric generators in the future.', 'Curium was first produced by Glenn T. Seaborg, Ralph A. James and Albert Ghiorso, working at the University of California, Berkeley, in 1944.', null, 'Glenn T. Seaborg, Ralph A. James and Albert Ghiorso', 'J. C. Wallmann, W. W. T. Crane and B. B. Cunningham', 'None stable; longest-lived ²⁴⁷Cm, half-life 1.56×10⁷ years'],
        ['Since only small amounts of berkelium have ever been made, it has no uses outside of basic scientific research. It is the target from which heavier elements are made: tennessine was first made from berkelium-249 in 2009.', 'Berkelium was first produced by Stanley G. Thompson, Glenn T. Seaborg, Kenneth Street, Jr. and Albert Ghiorso working at the University of California, Berkeley, in December, 1949.', null, 'Stanley G. Thompson, A. Ghiorso and G. T. Seaborg (University of California, Berkeley)', 'J. R. Peterson, J. A. Fahey, and R. D. Baybarz', 'None stable; longest-lived ²⁴⁷Bk, half-life 1.38×10³ years'],
        ['Californium-252, an isotope with a half-life of about 2.6 years, is a very strong neutron source. One microgram (0.000001 grams) of californium-252 produces 170,000,000 neutrons per minute.', 'Californium was first produced by Stanley G. Thompson, Glenn T. Seaborg, Kenneth Street, Jr. and Albert Ghiorso working at the University of California, Berkeley, in 1950.', null, 'S. G. Thompson, Kenneth Street, Jr., A. Ghiorso and G. T. Seaborg (University of California, Berkeley)', 'R. G. Haire and R. D. Baybarz', 'None stable; longest-lived ²⁵¹Cf, half-life 900 years'],
        ['Since only small amounts of einsteinium have ever been produced, it currently has no uses outside of basic scientific research.', 'Einsteinium was discovered by a team of scientists led by Albert Ghiorso in 1952 while studying the radioactive debris produced by the detonation of the first hydrogen bomb.', null, 'A. Ghiorso et al. (Argonne Laboratory, Los Alamos Laboratory and University of California, Berkeley)', 'R. G. Haire and R. D. Baybarz', 'None stable; longest-lived ²⁵²Es, half-life 1.293 years'],
        ['Due to the small amounts produced and its short half-life, there are currently no uses for fermium outside of basic scientific research.', 'Fermium was discovered by a team of scientists led by Albert Ghiorso in 1952 while studying the radioactive debris produced by the detonation of the first hydrogen bomb.', null, 'A. Ghiorso et al. (Argonne Laboratory, Los Alamos Laboratory and University of California, Berkeley)', null, 'None stable; longest-lived ²⁵⁷Fm, half-life 100.5 days'],
        ['Since only small amounts of mendelevium have ever been produced, it currently has no uses outside of basic scientific research.', 'Mendelevium was first produced by Stanley G. Thompson, Glenn T. Seaborg, Bernard G. Harvey, Gregory R. Choppin and Albert Ghiorso working at the University of California, Berkeley, in 1955.', null, 'A. Ghiorso, Bernard G. Harvey, Gregory R. Choppin, S. G. Thompson and G. T. Seaborg (Berkeley Radiation Laboratory)', null, 'None stable; longest-lived ²⁵⁸Md, half-life 51.6 days'],
        ['Since only tiny amounts of nobelium have ever been produced, there are currently no uses for it outside of basic scientific research.', 'In 1957, a group of scientists working at the Nobel Institute of Physics in Stockhlom, Sweden, announced the discovery of a new element.', null, 'E. D. Donets, V. A. Shchegolev and V. A. Ermakov (JINR in Dubna)', null, 'None stable; longest-lived ²⁵⁹No'],
        ['Since only tiny amounts of lawrencium have ever been produced, there are currently no uses for it outside of basic scientific research.', 'Lawrencium was created by four American scientists, Albert Ghiorso, Torbjørn Sikkeland Almon E. Larsh and Robert M. Latimer, in March, 1961.', null, 'A. Ghiorso, Torbjørn Sikkeland Almon E. Larsh and Robert M. Latimer (Berkeley Radiation Laboratory)', null, 'None stable; longest-lived ²⁶⁶Lr, half-life 11 hours'],
        ['Due to the small amounts produced and its short half-life, there are currently no uses for rutherfordium outside of basic scientific research.', 'Scientists working at the Joint Institute for Nuclear Research in Dubna, Russia, first reported the production of rutherfordium in 1964.', null, 'A. Ghiorso et al. (Berkeley Radiation Laboratory) and I. Zvara et al. (JINR in Dubna)', null, 'None stable; longest-lived ²⁶⁷Rf, half-life 48 minutes'],
        ['Due to the small amounts produced and its short half-life, there are currently no uses for dubnium outside of basic scientific research.', 'Scientists working at the Joint Institute for Nuclear Research in Dubna, Russia, first reported the production of dubnium in 1967.', null, 'A. Ghiorso et al. (Berkeley Radiation Laboratory) and V. A. Druin et al. (JINR in Dubna)', null, 'None stable; longest-lived ²⁶⁸Db, half-life 16 hours'],
        ['Since only a few atoms of seaborgium have ever been made, there are currently no uses for seaborgium outside of basic scientific research.', 'Seaborgium was first produced by a team of scientists led by Albert Ghiorso working at the Lawrence Berkeley Laboratory in Berkeley, California, in 1974.', null, 'A. Ghiorso et al. (Berkeley Radiation Laboratory)', null, 'None stable; longest-lived ²⁶⁹Sg, half-life 14 minutes'],
        ['Since only a few atoms of bohrium have ever been made, there are currently no uses for bohrium outside of basic scientific research.', 'First produced in 1976 by scientists working at the Joint Institute for Nuclear Research in Dubna, Russia, and later confirmed in 1981 by Peter Armbruster,…', null, 'G.Münzenberg et al. (GSI in Darmstadt)', null, 'None stable; longest-lived ²⁷⁰Bh, half-life 2.4 minutes'],
        ['Since only small amounts of hassium have ever been produced, it currently has no uses outside of basic scientific research.', 'Hassium was first produced by Peter Armbruster, Gottfried Münzenber and their team working at the Gesellschaft für Schwerionenforschung in Darmstadt, Germany in 1984.', null, 'G. Münzenberg, Peter Armbruster et al. (GSI in Darmstadt)', null, 'None stable; longest-lived ²⁶⁹Hs, half-life 16 s'],
        ['Since only small amounts of meitnerium have ever been produced, it currently has no uses outside of basic scientific research.', 'Meitnerium was first produced by Peter Armbruster, Gottfried Münzenber and their team working at the Gesellschaft für Schwerionenforschung in Darmstadt, Germany in 1982.', null, 'G. Münzenberg, Peter Armbruster et al. (GSI in Darmstadt)', null, 'None stable; longest-lived ²⁷⁸Mt, half-life 4.5 s'],
        ['Since only a few atoms of darmstadtium have ever been produced, it currently has no uses outside of basic scientific research.', 'Darmstadtium was first produced by Peter Armbruster, Gottfried Münzenber and their team working at the Gesellschaft für Schwerionenforschung in Darmstadt, Germany on November 9th, 1994.', null, 'Sigurd Hofmann et al. (GSI in Darmstadt)', null, 'None stable; longest-lived ²⁸¹Ds, half-life 12.7 s'],
        ['Since only a few atoms of roentgenium have ever been produced, it currently has no uses outside of basic scientific research.', 'Roentgenium was first produced by Peter Armbruster, Gottfried Münzenber and their team working at the Gesellschaft für Schwerionenforschung in Darmstadt, Germany in late 1994.', null, 'Sigurd Hofmann et al. (GSI in Darmstadt)', null, 'None stable; longest-lived ²⁸²Rg, half-life 1.7 minutes'],
        ['Since only a few atoms of copernicium have ever been produced, it currently has no uses outside of basic scientific research.', 'Copernicium was first produced by Peter Armbruster, Gottfried Münzenber and their team working at the Gesellschaft für Schwerionenforschung in Darmstadt, Germany on February 9, 1996.', null, 'Sigurd Hofmann et al. (GSI in Darmstadt)', null, 'None stable; longest-lived ²⁸⁵Cn, half-life 28 s'],
        ['Since only a few atoms of nihonium have ever been produced, it currently has no uses outside of basic scientific research.', 'On July 23, 2004, scientists working at the RIKEN Nishina Center for Accelerator-based Science in Wako, Japan, created the first two atoms of the element…', null, 'Yuri Oganessian et al. (JINR in Dubna) and K. Morita et al. (RIKEN in Wako, Japan)', null, 'None stable; longest-lived ²⁸⁶Nh, half-life 9.5 s'],
        ['Since only a few atoms of flerovium have ever been produced, it currently has no uses outside of basic scientific research.', 'Flerovium was first produced by scientists working at the Joint Institute for Nuclear Research in Dubna, Russia in 1998.', null, 'Yuri Oganessian et al. (JINR in Dubna)', null, 'None stable; longest-lived ²⁸⁹Fl, half-life 1.9 s'],
        ['Since only a few atoms of moscovium have ever been produced, it currently has no uses outside of basic scientific research.', 'On February 2, 2004, scientists working at the Joint Institute for Nuclear Research in Dubna, Russia, along with scientists from the U.S. Department of…', null, 'Yuri Oganessian et al. (JINR in Dubna)', null, 'None stable; longest-lived ²⁹⁰Mc, half-life 650 ms'],
        ['Since only a few atoms of livermorium have ever been produced, it currently has no uses outside of basic scientific research.', 'On December 6, 2000, scientists working at the Joint Institute for Nuclear Research in Dubna, Russia, along with scientists from the U.S. Department of Energy\'s Lawrence Livermore National Laboratory, announced the creation of livermorium.', null, 'Yuri Oganessian et al. (JINR in Dubna)', null, 'None stable; longest-lived ²⁹³Lv, half-life 57 ms'],
        ['Since only a few atoms of tennessine have ever been produced, it currently has no uses outside of basic scientific research.', 'On April 5, 2010, scientists working at the Joint Institute for Nuclear Research in Dubna, Russia, along with scientists from the U.S. Department of Energy\'s…', null, 'Yuri Oganessian et al. (JINR in Dubna)', null, 'None stable; longest-lived ²⁹⁴Ts, half-life 51 ms'],
        ['Since only a few atoms of oganesson have ever been produced, it currently has no uses outside of basic scientific research.', 'On October 16, 2006, scientists working at the Joint Institute for Nuclear Research in Dubna, Russia, along with scientists from the U.S. Department of Energy\'s Lawrence Livermore National Laboratory, announced the creation of oganesson.', null, 'Yuri Oganessian et al. (JINR in Dubna)', null, 'None stable; longest-lived ²⁹⁴Og, half-life 690 μs']
    ];

    // the ions it is most often found as, in water and in salts; none for most that only share their electrons
    var IONS = {
        H: 'H⁺ H⁻', Li: 'Li⁺', Be: 'Be²⁺', N: 'N³⁻', O: 'O²⁻', F: 'F⁻', Na: 'Na⁺', Mg: 'Mg²⁺',
        Al: 'Al³⁺', P: 'P³⁻', S: 'S²⁻', Cl: 'Cl⁻', K: 'K⁺', Ca: 'Ca²⁺', Sc: 'Sc³⁺', Ti: 'Ti³⁺ Ti⁴⁺',
        V: 'V²⁺ V³⁺', Cr: 'Cr²⁺ Cr³⁺', Mn: 'Mn²⁺', Fe: 'Fe²⁺ Fe³⁺', Co: 'Co²⁺ Co³⁺', Ni: 'Ni²⁺', Cu: 'Cu⁺ Cu²⁺', Zn: 'Zn²⁺',
        Ga: 'Ga³⁺', As: 'As³⁻', Se: 'Se²⁻', Br: 'Br⁻', Rb: 'Rb⁺', Sr: 'Sr²⁺', Y: 'Y³⁺', Zr: 'Zr⁴⁺',
        Pd: 'Pd²⁺', Ag: 'Ag⁺', Cd: 'Cd²⁺', In: 'In³⁺', Sn: 'Sn²⁺ Sn⁴⁺', Sb: 'Sb³⁺', Te: 'Te²⁻', I: 'I⁻',
        Cs: 'Cs⁺', Ba: 'Ba²⁺', La: 'La³⁺', Ce: 'Ce³⁺ Ce⁴⁺', Pr: 'Pr³⁺', Nd: 'Nd³⁺', Pm: 'Pm³⁺', Sm: 'Sm²⁺ Sm³⁺',
        Eu: 'Eu²⁺ Eu³⁺', Gd: 'Gd³⁺', Tb: 'Tb³⁺', Dy: 'Dy³⁺', Ho: 'Ho³⁺', Er: 'Er³⁺', Tm: 'Tm³⁺', Yb: 'Yb²⁺ Yb³⁺',
        Lu: 'Lu³⁺', Pt: 'Pt²⁺ Pt⁴⁺', Au: 'Au⁺ Au³⁺', Hg: 'Hg₂²⁺ Hg²⁺', Tl: 'Tl⁺ Tl³⁺', Pb: 'Pb²⁺ Pb⁴⁺', Bi: 'Bi³⁺', Fr: 'Fr⁺',
        Ra: 'Ra²⁺', Ac: 'Ac³⁺', Th: 'Th⁴⁺', U: 'U⁴⁺ UO₂²⁺', Pu: 'Pu⁴⁺',
        Ge: 'Ge⁴⁺', Nb: 'Nb⁵⁺', Mo: 'MoO₄²⁻', Tc: 'TcO₄⁻', Ru: 'Ru³⁺', Rh: 'Rh³⁺', Hf: 'Hf⁴⁺', Ta: 'Ta⁵⁺', W: 'WO₄²⁻', Re: 'ReO₄⁻',
        Os: 'Os⁴⁺', Ir: 'Ir³⁺', Po: 'Po²⁺ Po⁴⁺', At: 'At⁻', Pa: 'Pa⁵⁺', Np: 'Np⁴⁺ NpO₂⁺', Am: 'Am³⁺', Cm: 'Cm³⁺', Bk: 'Bk³⁺ Bk⁴⁺', Cf: 'Cf³⁺',
        Es: 'Es³⁺', Fm: 'Fm³⁺', Md: 'Md²⁺ Md³⁺', No: 'No²⁺', Lr: 'Lr³⁺'
    };

    // the groups of the elements, each with its colour on the table
    var CATEGORIES = [
        ['alkali', 'Alkali metal'], ['alkaline', 'Alkaline earth metal'], ['transition', 'Transition metal'],
        ['post', 'Post-transition metal'], ['metalloid', 'Metalloid'], ['nonmetal', 'Nonmetal'], ['halogen', 'Halogen'],
        ['noble', 'Noble gas'], ['lanthanide', 'Lanthanide'], ['actinide', 'Actinide']
    ];

    var GASES = [1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86], LIQUIDS = [35, 80],
        NOBLE = [2, 10, 18, 36, 54, 86, 118],
        MADELUNG = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'],
        ROOM = { s: 2, p: 6, d: 10, f: 14 },
        // the ground states that are not filled in the order above, each subshell as it is
        ODD = {
            24: { '3d': 5, '4s': 1 }, 29: { '3d': 10, '4s': 1 }, 41: { '4d': 4, '5s': 1 }, 42: { '4d': 5, '5s': 1 },
            44: { '4d': 7, '5s': 1 }, 45: { '4d': 8, '5s': 1 }, 46: { '4d': 10, '5s': 0 }, 47: { '4d': 10, '5s': 1 },
            57: { '4f': 0, '5d': 1 }, 58: { '4f': 1, '5d': 1 }, 64: { '4f': 7, '5d': 1 }, 78: { '5d': 9, '6s': 1 },
            79: { '5d': 10, '6s': 1 }, 89: { '5f': 0, '6d': 1 }, 90: { '5f': 0, '6d': 2 }, 91: { '5f': 2, '6d': 1 },
            92: { '5f': 3, '6d': 1 }, 93: { '5f': 4, '6d': 1 }, 96: { '5f': 7, '6d': 1 }, 103: { '6d': 0, '7p': 1 }
        },
        SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' },
        SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' },
        AVOGADRO = 6.02214076e23;

    // its period, and its group: none for a lanthanide or an actinide but Lu and Lr, which are in group 3 under Y
    function place(z) {
        var starts = [1, 3, 11, 19, 37, 55, 87, 119], p = 0, i;
        while (z >= starts[p + 1]) p++;
        i = z - starts[p]; // how far along its period
        if (p === 0) return { period: 1, group: z === 1 ? 1 : 18 };
        if (p < 3) return { period: p + 1, group: i < 2 ? i + 1 : i + 11 };
        if (p < 5) return { period: p + 1, group: i + 1 };
        if (i < 2) return { period: p + 1, group: i + 1 };
        if (i < 17) return { period: p + 1, group: i === 16 ? 3 : null, f: true }; // La to Lu, Ac to Lr
        return { period: p + 1, group: i - 13 };
    }

    function categoryOf(z, at) {
        if (z >= 57 && z <= 71) return 'lanthanide';
        if (z >= 89 && z <= 103) return 'actinide';
        if (NOBLE.indexOf(z) > -1) return 'noble';
        if (at.group === 1 && z > 1) return 'alkali';
        if (at.group === 2) return 'alkaline';
        if (at.group >= 3 && at.group <= 12) return 'transition';
        if (at.group === 17) return 'halogen';
        if ([5, 14, 32, 33, 51, 52].indexOf(z) > -1) return 'metalloid';
        if ([1, 6, 7, 8, 15, 16, 34].indexOf(z) > -1) return 'nonmetal';
        return 'post';
    }

    // the electrons in each subshell, as found in the ground state
    function subshells(z) {
        var left = z, filled = {}, odd = ODD[z] || {};
        MADELUNG.forEach(function (s) {
            var n = Math.min(left, ROOM[s.charAt(1)]);
            if (n > 0) filled[s] = n;
            left -= n;
        });
        Object.keys(odd).forEach(function (s) {
            if (odd[s]) filled[s] = odd[s]; else delete filled[s];
        });
        return filled;
    }

    // in order of shell, then of s, p, d, f
    function ordered(filled) {
        return Object.keys(filled).sort(function (a, b) {
            return a.charAt(0) - b.charAt(0) || 'spdf'.indexOf(a.charAt(1)) - 'spdf'.indexOf(b.charAt(1));
        });
    }

    function sup(n) {
        return String(n).replace(/\d/g, function (d) { return SUP[d]; });
    }

    // as written, after the noble gas before it: [Ne] 3s² 3p⁴
    function configOf(z) {
        var filled = subshells(z), core = 0, inner, keys;
        NOBLE.forEach(function (g) { if (g < z) core = g; });
        inner = core ? subshells(core) : {};
        keys = ordered(filled).filter(function (s) { return filled[s] !== inner[s]; });
        return (core ? '[' + E[core - 1][0] + '] ' : '') + keys.map(function (s) { return s + sup(filled[s]); }).join(' ');
    }

    // the electrons in each shell, K, L, M …: 2, 8, 6
    function shellsOf(z) {
        var filled = subshells(z), shells = [];
        Object.keys(filled).forEach(function (s) {
            var n = +s.charAt(0);
            while (shells.length < n) shells.push(0);
            shells[n - 1] += filled[s];
        });
        return shells;
    }

    var elements = E.map(function (e, i) {
        var z = i + 1, at = place(z);
        return {
            z: z, s: e[0], name: e[1], mass: e[2], en: e[3], mp: e[4], bp: e[5], density: e[6], ox: e[7], year: e[8], ie: e[9],
            period: at.period, group: at.group,
            // its place on the table: a column 1 to 18 and a row 1 to 7; the lanthanides and actinides in rows
            // 9 and 10 of their own, from column 3, group 3 of periods 6 and 7 pointing to them
            col: at.f ? z - (z < 89 ? 57 : 89) + 3 : at.group,
            row: at.f ? at.period + 3 : at.period,
            block: at.f ? (at.group ? 'd' : 'f') : at.group <= 2 || z === 2 ? 's' : at.group >= 13 ? 'p' : 'd',
            cat: categoryOf(z, at),
            state: z >= 104 ? null : GASES.indexOf(z) > -1 ? 'gas' : LIQUIDS.indexOf(z) > -1 ? 'liquid' : 'solid',
            // no standard atomic weight, as it has no stable isotope: its mass is the mass number of its longest-lived,
            // shown in brackets. Th, Pa and U have none stable either, but enough of them in nature to have a weight
            unstable: z === 43 || z === 61 || (z >= 84 && (z < 90 || z > 92)),
            config: configOf(z),
            shells: shellsOf(z),
            radius: RADIUS[i], affinity: AFFINITY[i], ions: IONS[e[0]] || null,
            uses: MORE[i][0], story: MORE[i][1], heat: MORE[i][2], foundBy: MORE[i][3], isolatedBy: MORE[i][4], isotopes: MORE[i][5],
            crystal: PROPS[i][0], covalent: PROPS[i][1], magnetic: PROPS[i][2], mohs: PROPS[i][3], fusion: PROPS[i][4], vaporization: PROPS[i][5],
            conductivity: PROPS[i][6], resistivity: PROPS[i][7], abundance: PROPS[i][8], appearance: PROPS[i][9], cas: PROPS[i][10],
            // the fields whose values are predicted, each true
            predicted: (PREDICTED[e[0]] || '').split(' ').reduce(function (o, k) { if (k) o[k] = true; return o; }, {})
        };
    });

    var bySymbol = {};
    elements.forEach(function (e) { bySymbol[e.s] = e; });

    // ---------------- formulas ---------------- //

    // A formula read: the atoms of each element, and its charge. Ca(OH)2, CuSO4·5H2O, [Fe(CN)6]3−,
    // Fe^3+, SO4^2-, NH4+. A state after it, (aq), is left out; e- and e⁻ are an electron.
    // { atoms: { Ca: 1, O: 2, H: 2 }, charge: 0, order: the elements as they come } or { error }
    function parse(text) {
        var s = String(text).replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/[⁺]/g, '+').replace(/[⁻]/g, '-')
                .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d); })
                .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, function (d) { return '₀₁₂₃₄₅₆₇₈₉'.indexOf(d); }),
            charge = 0, m, parts, atoms = {}, order = [];
        if (!s) return { error: 'empty' };
        s = s.replace(/\((aq|s|l|g)\)$/i, '');
        if (/^e-?$/.test(s) || s === 'e^-') return { atoms: {}, charge: -1, order: [], electron: true };
        // the charge: after ^ or in braces, 3+ or +3; else at its end, + or −, with the digit before it
        if ((m = s.match(/(\^|\{)(\d*)([+-])(\d*)\}?$/))) {
            charge = (m[3] === '-' ? -1 : 1) * (+(m[2] || m[4]) || 1);
            s = s.slice(0, m.index);
        } else if ((m = s.match(/(\d*)([+-]+)$/))) {
            var digits = m[1], before = s.slice(0, m.index), signs = m[2], n;
            if (/^[+]+$|^[-]+$/.test(signs) && signs.length > 1) { // Fe+++, SO4--
                n = signs.length;
            } else if (digits.length > 1) { // SO42-: the last digit is the charge
                n = +digits.slice(-1);
                before += digits.slice(0, -1);
            } else if (digits && (/^[A-Z][a-z]?$/.test(before) || /[\]}]$/.test(before))) { // Fe2+, an ion of one atom; [Fe(CN)6]3-, a complex
                n = +digits;
            } else { // NH4+, MnO4-: the digit counts the atoms
                before += digits;
                n = 1;
            }
            charge = (signs.charAt(0) === '-' ? -1 : 1) * n;
            s = before;
        }
        if (!s) return { error: 'empty' };
        parts = s.split(/[·•*.]/);
        for (var p = 0; p < parts.length; p++) {
            var part = parts[p], k = 1, got;
            if (!part) return { error: 'syntax' };
            if ((m = part.match(/^(\d+)(?=[A-Z([{])/))) { // 5H2O after the dot
                k = +m[1];
                part = part.slice(m[1].length);
            }
            got = group(part);
            if (got.error) return got;
            Object.keys(got.atoms).forEach(function (el) {
                if (!atoms[el]) order.push(el);
                atoms[el] = (atoms[el] || 0) + got.atoms[el] * k;
            });
        }
        return { atoms: atoms, charge: charge, order: order };
    }

    // what is inside brackets, or a formula with no dots: elements and brackets, each with its count
    function group(s) {
        var stack = [{ atoms: {}, order: [] }], i = 0, m, el, n, top, inner, close = { '(': ')', '[': ']', '{': '}' }, opens = [];
        function add(to, el, n) {
            if (!to.atoms[el]) to.order.push(el);
            to.atoms[el] = (to.atoms[el] || 0) + n;
        }
        while (i < s.length) {
            var c = s.charAt(i);
            if (close[c]) {
                stack.push({ atoms: {}, order: [] });
                opens.push(close[c]);
                i++;
            } else if (c === ')' || c === ']' || c === '}') {
                if (opens.pop() !== c) return { error: 'brackets' };
                inner = stack.pop();
                m = s.slice(i + 1).match(/^\d*/)[0];
                n = m ? +m : 1;
                i += 1 + m.length;
                top = stack[stack.length - 1];
                inner.order.forEach(function (e) { add(top, e, inner.atoms[e] * n); });
            } else if ((m = s.slice(i).match(/^([A-Z][a-z]?)(\d*)/))) {
                el = m[1];
                if (!bySymbol[el]) {
                    // Co is cobalt; CO carbon and oxygen, but a two letter symbol that is no element may be two
                    return { error: 'element', symbol: el };
                }
                add(stack[stack.length - 1], el, m[2] ? +m[2] : 1);
                i += m[0].length;
            } else {
                return { error: 'syntax', at: c };
            }
        }
        if (opens.length) return { error: 'brackets' };
        if (!stack[0].order.length) return { error: 'empty' };
        return stack[0];
    }

    // its molar mass, g/mol, and each element's part of it
    function molarMass(text) {
        var f = parse(text), total = 0, parts;
        if (f.error) return f;
        parts = f.order.map(function (s) {
            var mass = bySymbol[s].mass * f.atoms[s];
            total += mass;
            return { s: s, n: f.atoms[s], mass: mass };
        });
        parts.forEach(function (p) { p.percent = total ? p.mass / total * 100 : 0; });
        return { mass: total, parts: parts, atoms: f.atoms, charge: f.charge, electron: !!f.electron, unstable: f.order.some(function (s) { return bySymbol[s].unstable; }) };
    }

    // a formula written with its small numbers as subscripts and its charge above, as HTML: SO<sub>4</sub><sup>2−</sup>
    function html(text) {
        var f = parse(text), s = String(text).replace(/\s+/g, ''), body, charge = '';
        if (f.error) return s.replace(/[&<>"]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
        if (f.electron) return 'e<sup>−</sup>';
        s = s.replace(/[−–—]/g, '-').replace(/\((aq|s|l|g)\)$/i, '');
        body = s.replace(/(\^|\{)?\d*[+-]+\d*\}?$/, '');
        if (f.charge) {
            // the digits taken as the charge, put back if they were the count
            var bare = body, want = JSON.stringify(f.atoms);
            while (bare && JSON.stringify(parse(bare).atoms) !== want && /\d$/.test(s.slice(0, bare.length + 1))) bare = s.slice(0, bare.length + 1);
            body = bare;
            charge = '<sup>' + (Math.abs(f.charge) > 1 ? Math.abs(f.charge) : '') + (f.charge < 0 ? '−' : '+') + '</sup>';
        }
        return body.replace(/[·•*.]/g, '·').replace(/(^|·)(\d+)/g, '$1<b>$2</b>').replace(/(\D)(\d+)/g, function (all, a, d) {
            return a === '>' ? all : a + '<sub>' + d + '</sub>';
        }).replace(/<b>(\d+)<\/b>/g, '$1') + charge;
    }

    // as plain text with subscripts: CuSO₄·5H₂O
    function plain(text) {
        return html(text).replace(/<sub>(\d+)<\/sub>/g, function (a, d) {
            return d.replace(/\d/g, function (x) { return SUB[x]; });
        }).replace(/<sup>([^<]*)<\/sup>/g, function (a, d) {
            return d.replace(/\d/g, function (x) { return SUP[x]; }).replace('+', '⁺').replace('−', '⁻');
        }).replace(/<[^>]*>/g, '');
    }

    // ---------------- equations ---------------- //

    // fractions of BigInts, for the null space worked out exactly
    function gcd(a, b) {
        a = a < 0n ? -a : a;
        b = b < 0n ? -b : b;
        while (b) {
            var t = a % b;
            a = b;
            b = t;
        }
        return a;
    }

    function frac(n, d) {
        var g;
        if (d === undefined) d = 1n;
        if (d < 0n) {
            n = -n;
            d = -d;
        }
        g = gcd(n, d) || 1n;
        return [n / g, d / g];
    }

    function sub(a, b) { return frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]); }
    function mul(a, b) { return frac(a[0] * b[0], a[1] * b[1]); }
    function div(a, b) { return frac(a[0] * b[1], a[1] * b[0]); }

    // the vectors x with M x = 0, from M in reduced row echelon form
    function nullSpace(rows, cols) {
        var m = rows.map(function (r) { return r.map(function (x) { return frac(BigInt(x)); }); }),
            pivots = [], r = 0, c, i, j, p, f, basis = [];
        for (c = 0; c < cols && r < m.length; c++) {
            p = -1;
            for (i = r; i < m.length; i++) if (m[i][c][0] !== 0n) { p = i; break; }
            if (p < 0) continue;
            f = m[p];
            m[p] = m[r];
            m[r] = f;
            f = m[r][c];
            m[r] = m[r].map(function (x) { return div(x, f); });
            for (i = 0; i < m.length; i++) {
                if (i === r || m[i][c][0] === 0n) continue;
                f = m[i][c];
                for (j = 0; j < cols; j++) m[i][j] = sub(m[i][j], mul(f, m[r][j]));
            }
            pivots.push(c);
            r++;
        }
        for (c = 0; c < cols; c++) {
            if (pivots.indexOf(c) > -1) continue;
            var v = [];
            for (j = 0; j < cols; j++) v.push(frac(j === c ? 1n : 0n));
            pivots.forEach(function (pc, k) { v[pc] = frac(-m[k][c][0], m[k][c][1]); });
            basis.push(v);
        }
        return basis;
    }

    // a vector of fractions as the smallest whole numbers in the same ratio
    function whole(v) {
        var l = v.reduce(function (acc, x) { return acc * x[1] / gcd(acc, x[1]); }, 1n), ints = v.map(function (x) { return x[0] * (l / x[1]); }),
            g = ints.reduce(function (acc, x) { return gcd(acc, x); }, 0n) || 1n;
        return ints.map(function (x) { return x / g; });
    }

    // the two sides of an equation, and the formulas on each: Fe + O2 = Fe2O3, with =, → or ->, or ⇌
    function sides(text) {
        var s = String(text).replace(/[−–—]/g, '-'), m = s.split(/<=+>|<-+>|⇌|⇄|↔|=+>|-+>|→|⟶|=/);
        if (m.length !== 2) return { error: m.length < 2 ? 'arrow' : 'arrows' };
        function species(side) {
            // + between formulas has spaces round it, or follows a letter, a digit or a bracket and comes before a letter, a digit or a bracket
            return side.trim() ? side.split(/\s+\+\s+|(?<=[A-Za-z0-9)\]}])\+(?=[A-Z0-9([{])/).map(function (t) { return t.trim(); }) : [];
        }
        return { left: species(m[0]), right: species(m[1]) };
    }

    // its number in front, 2H2O, taken off: what is balanced again
    function bare(t) {
        var m = t.match(/^(\d+(?:\.\d+)?)\s*(?=[A-Z([{e])/);
        return m ? t.slice(m[0].length) : t;
    }

    // An equation balanced: the smallest whole numbers in front of each formula, so each element, and
    // the charge, is the same on both sides. { left, right: [{ t: formula, k: its number, f: parsed }],
    // text, html, kind } or { error }
    function balance(text) {
        var sd = sides(text), list, names = [], rows, basis, k, i, bad;
        if (sd.error) return sd;
        if (!sd.left.length || !sd.right.length) return { error: 'side' };
        list = sd.left.map(function (t) { return { t: bare(t), side: 1 }; }).concat(sd.right.map(function (t) { return { t: bare(t), side: -1 }; }));
        for (i = 0; i < list.length; i++) {
            if (!list[i].t) return { error: 'side' };
            list[i].f = parse(list[i].t);
            if (list[i].f.error) return { error: 'formula', formula: list[i].t, why: list[i].f };
        }
        list.forEach(function (x) {
            Object.keys(x.f.atoms).forEach(function (el) { if (names.indexOf(el) < 0) names.push(el); });
        });
        bad = names.filter(function (el) {
            return !list.some(function (x) { return x.side > 0 && x.f.atoms[el]; }) || !list.some(function (x) { return x.side < 0 && x.f.atoms[el]; });
        });
        if (bad.length) return { error: 'one side', element: bad[0] };
        rows = names.map(function (el) {
            return list.map(function (x) { return (x.f.atoms[el] || 0) * x.side; });
        });
        if (list.some(function (x) { return x.f.charge; })) rows.push(list.map(function (x) { return x.f.charge * x.side; }));
        basis = nullSpace(rows, list.length);
        if (!basis.length) return { error: 'none' };
        // more than one way: the sum of them all, if it is all above 0
        k = whole(basis.length === 1 ? basis[0] : basis.reduce(function (acc, v) {
            return acc.map(function (x, j) { return frac(x[0] * v[j][1] + v[j][0] * x[1], x[1] * v[j][1]); });
        }));
        if (k.every(function (x) { return x < 0n; })) k = k.map(function (x) { return -x; });
        if (k.some(function (x) { return x <= 0n; })) return { error: basis.length > 1 ? 'many' : 'sign' };
        list.forEach(function (x, j) { x.k = Number(k[j]); });
        var left = list.filter(function (x) { return x.side > 0; }), right = list.filter(function (x) { return x.side < 0; }),
            write = function (side, f) { return side.map(function (x) { return (x.k > 1 ? x.k : '') + f(x.t); }).join(' + '); },
            redox = redoxOf(left, right), kind = kindOf(left, right);
        return {
            left: left, right: right, many: basis.length > 1,
            text: write(left, plain) + ' → ' + write(right, plain),
            html: write(left, html) + ' → ' + write(right, html),
            kind: redox && (!kind || kind === 'Ionic') ? 'Redox' : kind,
            redox: redox
        };
    }

    // what kind of reaction it is, as a class names them
    function kindOf(left, right) {
        var single = function (x) { return Object.keys(x.f.atoms).length === 1 && !x.f.charge; },
            has = function (side, t) { return side.some(function (x) { return JSON.stringify(x.f.atoms) === JSON.stringify(parse(t).atoms) && !x.f.charge; }); };
        if (left.concat(right).some(function (x) { return x.f.electron; })) return 'Half-reaction';
        if (has(left, 'O2') && has(right, 'CO2') && has(right, 'H2O')) return 'Combustion';
        if (has(left, 'O2') && has(right, 'H2O') && right.length === 1 && left.length === 2 && has(left, 'H2')) return 'Synthesis, combustion';
        if (right.length === 1 && left.length > 1) return 'Synthesis';
        if (left.length === 1 && right.length > 1) return 'Decomposition';
        if (left.length === 2 && right.length === 2) {
            if (left.filter(single).length === 1 && right.filter(single).length === 1) return 'Single replacement';
            if (!left.some(single) && !right.some(single)) {
                return has(right, 'H2O') && left.some(function (x) { return /OH/.test(x.t); }) && left.some(function (x) { return /^H[A-Z0-9(]/.test(x.t) || x.t === 'H+'; }) ?
                    'Double replacement, neutralization' : 'Double replacement';
            }
        }
        return left.concat(right).some(function (x) { return x.f.charge; }) ? 'Ionic' : '';
    }

    // ---------------- amounts ---------------- //

    // The amounts of a reaction from those given, as 'Fe 10 g, O2 5 g' or 'H2 2 mol': of one reactant,
    // all that it gives; of more, the one that runs out first, and what is left of the others; of a product
    // as well, its yield against what the reaction gives.
    // { rows: [{ t, k, mol, g, left (of a reactant), role }], limiting, percent, error }
    function amounts(eq, given) {
        var b = balance(eq), list, got = [], i, limit = null, scale, out, kept;
        if (b.error) return { error: 'equation', why: b };
        list = b.left.concat(b.right);
        list.forEach(function (x) { x.M = molarMass(x.t).mass; });
        for (i = 0; i < given.length; i++) {
            var g = given[i], who = list.filter(function (x) { return sameFormula(x.t, g.t); })[0];
            if (!who) return { error: 'not in', t: g.t };
            got.push({ x: who, mol: g.unit === 'mol' ? g.v : g.unit === 'kg' ? g.v * 1000 / who.M : g.unit === 'mg' ? g.v / 1000 / who.M : g.v / who.M });
        }
        var reactants = got.filter(function (g) { return g.x.side > 0; }), products = got.filter(function (g) { return g.x.side < 0; });
        if (reactants.length) {
            reactants.forEach(function (g) {
                var s = g.mol / g.x.k;
                if (!limit || s < limit.s) limit = { s: s, x: g.x };
            });
            scale = limit.s;
        } else if (products.length) {
            scale = products[0].mol / products[0].x.k; // what it takes to make this much
        } else {
            return { error: 'nothing' };
        }
        out = list.map(function (x) {
            var mol = scale * x.k, row = { t: x.t, k: x.k, M: x.M, mol: mol, g: mol * x.M, side: x.side };
            kept = reactants.filter(function (g) { return g.x === x; })[0];
            if (kept) {
                row.given = kept.mol;
                row.left = kept.mol - mol;
            }
            return row;
        });
        var res = { rows: out, equation: b, limiting: reactants.length > 1 ? limit.x.t : null };
        if (reactants.length && products.length) { // a yield got, against what the reaction gives
            res.yieldOf = products[0].x.t;
            res.percent = products[0].mol / (scale * products[0].x.k) * 100;
        }
        return res;
    }

    function sameFormula(a, b) {
        var fa = parse(a), fb = parse(b);
        return !fa.error && !fb.error && JSON.stringify(sorted(fa.atoms)) === JSON.stringify(sorted(fb.atoms)) && fa.charge === fb.charge;
    }

    function sorted(atoms) {
        var o = {};
        Object.keys(atoms).sort().forEach(function (k) { o[k] = atoms[k]; });
        return o;
    }

    // what is typed of the amounts: a formula, a number and its unit, g, kg, mg or mol, apart by
    // commas, semicolons or new lines. With a decimal comma, by semicolons or new lines only. litres: L and mL as well, of a gas
    function readAmounts(text, comma, litres) {
        var items = String(text).split(comma ? /[;\n]+/ : /[,;\n]+/), list = [], bad = null;
        items.forEach(function (it) {
            var s = it.trim(), m;
            if (!s || bad) return;
            m = s.match(litres ? /^(.+?)\s*[=:]?\s+(-?\d*[.,]?\d+(?:e[+-]?\d+)?)\s*(g|kg|mg|mol|ml|l)?$/i : /^(.+?)\s*[=:]?\s+(-?\d*[.,]?\d+(?:e[+-]?\d+)?)\s*(g|kg|mg|mol)?$/i);
            if (!m) {
                bad = s;
                return;
            }
            list.push({ t: m[1].trim(), v: +m[2].replace(',', '.'), unit: (m[3] || 'g').toLowerCase() });
        });
        return bad ? { error: bad } : { list: list };
    }

    // The empirical formula of a composition, the masses or percents of its elements: 'C 40, H 6.71,
    // O 53.29'. With a molar mass, the molecular formula too. { formula, html, ratio, M, molecular, n } or { error }
    function empirical(text, comma, molar) {
        var items = String(text).split(comma ? /[;\n]+/ : /[,;\n]+/), parts = [], i, least, k, ratio, formula;
        for (i = 0; i < items.length; i++) {
            var s = items[i].trim(), m;
            if (!s) continue;
            m = s.match(/^([A-Z][a-z]?)\s*[=:]?\s*(\d*[.,]?\d+)\s*%?$/) || s.match(/^(\d*[.,]?\d+)\s*%?\s*([A-Z][a-z]?)$/);
            if (!m) return { error: 'read', at: s };
            var sym = /^[A-Z]/.test(m[1]) ? m[1] : m[2], v = +(/^[A-Z]/.test(m[1]) ? m[2] : m[1]).replace(',', '.');
            if (!bySymbol[sym]) return { error: 'element', at: sym };
            if (!(v > 0)) return { error: 'zero', at: sym };
            parts.push({ s: sym, mol: v / bySymbol[sym].mass });
        }
        if (parts.length < 1) return { error: 'empty' };
        least = Math.min.apply(null, parts.map(function (p) { return p.mol; }));
        ratio = parts.map(function (p) { return p.mol / least; });
        // the smallest whole number that makes every ratio whole, near enough for what was measured
        for (k = 1; k <= 12; k++) {
            if (ratio.every(function (r) { return Math.abs(r * k - Math.round(r * k)) < 0.1 * Math.max(1, k / 4); })) break;
        }
        if (k > 12) k = 1;
        parts.forEach(function (p, j) { p.n = Math.max(1, Math.round(ratio[j] * k)); });
        formula = parts.map(function (p) { return p.s + (p.n > 1 ? p.n : ''); }).join('');
        var out = { formula: formula, html: html(formula), plain: plain(formula), M: molarMass(formula).mass, ratio: ratio, parts: parts };
        if (molar > 0) {
            out.n = Math.max(1, Math.round(molar / out.M));
            out.molecular = parts.map(function (p) { return p.s + (p.n * out.n > 1 ? p.n * out.n : ''); }).join('');
            out.molecularHtml = html(out.molecular);
            out.molecularPlain = plain(out.molecular);
            out.off = Math.abs(molar / out.M - out.n) > 0.1;
        }
        return out;
    }

    // ---------------- solubility in water ---------------- //

    // The usual table of solubility in water at 25 °C: of each cation, a letter for each anion in the order of
    // ANIONS. S dissolves, s a little (under about 10 g/L), I does not, R reacts with water and does not stay
    var CATIONS = [
            ['Li', 'Li⁺', 1, 'Lithium', 'SSSSSSssSS'], ['Na', 'Na⁺', 1, 'Sodium', 'SSSSSSSSSS'], ['K', 'K⁺', 1, 'Potassium', 'SSSSSSSSSS'],
            ['NH4', 'NH₄⁺', 1, 'Ammonium', 'SSSSSSSSSS'], ['Mg', 'Mg²⁺', 2, 'Magnesium', 'SSSSSSsIIR'], ['Ca', 'Ca²⁺', 2, 'Calcium', 'SSSSSsIIsR'],
            ['Sr', 'Sr²⁺', 2, 'Strontium', 'SSSSSIIIsR'], ['Ba', 'Ba²⁺', 2, 'Barium', 'SSSSSIIISS'], ['Al', 'Al³⁺', 3, 'Aluminium', 'SSSSSSRIIR'],
            ['Cr', 'Cr³⁺', 3, 'Chromium(III)', 'SSSSSSRIIR'], ['Mn', 'Mn²⁺', 2, 'Manganese(II)', 'SSSSSSIIII'], ['Fe', 'Fe²⁺', 2, 'Iron(II)', 'SSSSSSIIII'],
            ['Fe', 'Fe³⁺', 3, 'Iron(III)', 'SSSSRSRIIR'], ['Co', 'Co²⁺', 2, 'Cobalt(II)', 'SSSSSSIIII'], ['Ni', 'Ni²⁺', 2, 'Nickel(II)', 'SSSSSSIIII'],
            ['Cu', 'Cu²⁺', 2, 'Copper(II)', 'SSSSRSIIII'], ['Zn', 'Zn²⁺', 2, 'Zinc', 'SSSSSSIIII'], ['Ag', 'Ag⁺', 1, 'Silver', 'SsIIIsIIRI'],
            ['Hg', 'Hg²⁺', 2, 'Mercury(II)', 'SSSsIRIIRI'], ['Pb', 'Pb²⁺', 2, 'Lead(II)', 'SSssIIIIII']
        ],
        ANIONS = [
            ['NO3', 'NO₃⁻', 1, 'nitrate'], ['CH3COO', 'CH₃COO⁻', 1, 'acetate'], ['Cl', 'Cl⁻', 1, 'chloride'], ['Br', 'Br⁻', 1, 'bromide'],
            ['I', 'I⁻', 1, 'iodide'], ['SO4', 'SO₄²⁻', 2, 'sulfate'], ['CO3', 'CO₃²⁻', 2, 'carbonate'], ['PO4', 'PO₄³⁻', 3, 'phosphate'],
            ['OH', 'OH⁻', 1, 'hydroxide'], ['S', 'S²⁻', 2, 'sulfide']
        ],
        // the rule of each anion, and of each salt that reacts, why
        SOLUBLE_RULES = {
            NO3: 'Every nitrate dissolves.',
            CH3COO: 'Acetates dissolve; silver acetate only a little.',
            Cl: 'Chlorides dissolve, but silver\'s, and mercury(I)\'s; lead\'s only a little, more in hot water.',
            Br: 'Bromides dissolve, but silver\'s, and mercury(I)\'s; lead\'s and mercury(II)\'s only a little.',
            I: 'Iodides dissolve, but those of silver, lead and mercury.',
            SO4: 'Sulfates dissolve, but those of barium, strontium and lead; calcium\'s and silver\'s only a little.',
            CO3: 'Carbonates do not dissolve, but those of the alkali metals and ammonium; lithium\'s and magnesium\'s a little.',
            PO4: 'Phosphates do not dissolve, but those of the alkali metals and ammonium; lithium\'s a little.',
            OH: 'Hydroxides do not dissolve, but those of the alkali metals, ammonium and barium; calcium\'s and strontium\'s a little.',
            S: 'Sulfides do not dissolve, but those of the alkali metals, ammonium and barium.'
        },
        REACTS = {
            CO3: 'In water it does not stay: the metal ion and carbonate give its hydroxide and CO₂.',
            S: 'In water it does not stay: it gives its hydroxide and H₂S.',
            I: 'In water it does not stay: the metal ion oxidizes iodide to iodine.',
            OH: 'It does not stay as a hydroxide: its oxide forms, as Ag₂O or HgO.',
            SO4: 'In water it gives a basic sulfate.'
        },
        SOLUBLE_WORDS = { S: 'Soluble', s: 'Slightly soluble', I: 'Insoluble', R: 'Reacts with water' };

    // The solubility of a salt from its formula, PbI2, Fe2(SO4)3, CH3COONa: the cation and anion whose atoms,
    // in the numbers their charges ask for, are those of the formula. Water of a hydrate, ·5H2O, is left out.
    // { error } of a formula not read, 'unknown' of one not in the table; else of it
    function solubility(text) {
        var hydrate = /[·*.]\s*\d*\s*H2O\s*$/i.test(text || ''),
            f = parse((text || '').replace(/[·*.]\s*\d*\s*H2O\s*$/i, '')),
            found = null;
        if (f.error) return f;
        CATIONS.forEach(function (c, ci) {
            ANIONS.forEach(function (a, ai) {
                var g = c[2] === a[2] ? c[2] : 1, nc = a[2] / g, na = c[2] / g, want = {}, keys; // charges of 1 to 3: alike, or no factor in common
                [[c[0], nc], [a[0], na]].forEach(function (part) {
                    var atoms = parse(part[0]).atoms;
                    Object.keys(atoms).forEach(function (k) { want[k] = (want[k] || 0) + atoms[k] * part[1]; });
                });
                keys = Object.keys(want);
                if (!found && f.charge === 0 && keys.length === Object.keys(f.atoms).length && keys.every(function (k) { return f.atoms[k] === want[k]; })) {
                    found = { c: c, a: a, nc: nc, na: na, ci: ci, ai: ai };
                }
            });
        });
        if (!found) return { error: 'unknown' };
        var c = found.c, a = found.a, letter = c[4].charAt(found.ai),
            poly = function (s, n) { return n > 1 ? (/[A-Z].*[A-Z0-9]/.test(s) ? '(' + s + ')' + n : s + n) : s; };
        return {
            formula: poly(c[0], found.nc) + poly(a[0], found.na),
            name: c[3] + ' ' + a[3],
            cation: c[1], anion: a[1], nc: found.nc, na: found.na, ci: found.ci, ai: found.ai,
            letter: letter, word: SOLUBLE_WORDS[letter],
            rule: letter === 'R' ? REACTS[a[0]] : SOLUBLE_RULES[a[0]],
            hydrate: hydrate
        };
    }

    // ---------------- ions ---------------- //

    // Common ions: the formula with its charge, the name, the colour in water where it has one, and the colour
    // a cation gives a flame. Other names it goes by after a |
    var ION_LIST = [
        ['H^+', 'Hydrogen|proton', '', ''], ['Li^+', 'Lithium', '', 'Crimson red'], ['Na^+', 'Sodium', '', 'Yellow-orange'],
        ['K^+', 'Potassium', '', 'Lilac'], ['Rb^+', 'Rubidium', '', 'Red-violet'], ['Cs^+', 'Caesium|cesium', '', 'Blue-violet'],
        ['Ag^+', 'Silver', '', ''], ['Cu^+', 'Copper(I)|cuprous', '', ''], ['NH4^+', 'Ammonium', '', ''], ['H3O^+', 'Hydronium|oxonium', '', ''],
        ['Mg^2+', 'Magnesium', '', ''], ['Ca^2+', 'Calcium', '', 'Orange-red'], ['Sr^2+', 'Strontium', '', 'Crimson'],
        ['Ba^2+', 'Barium', '', 'Pale green'], ['Zn^2+', 'Zinc', '', ''], ['Fe^2+', 'Iron(II)|ferrous', 'Pale green', ''],
        ['Fe^3+', 'Iron(III)|ferric', 'Yellow-brown', ''], ['Cu^2+', 'Copper(II)|cupric', 'Blue', 'Blue-green'],
        ['Ni^2+', 'Nickel(II)', 'Green', ''], ['Co^2+', 'Cobalt(II)', 'Pink', ''], ['Mn^2+', 'Manganese(II)', 'Very pale pink', ''],
        ['Pb^2+', 'Lead(II)', '', ''], ['Sn^2+', 'Tin(II)|stannous', '', ''], ['Hg^2+', 'Mercury(II)|mercuric', '', ''],
        ['Hg2^2+', 'Mercury(I)|mercurous', '', ''], ['Cr^3+', 'Chromium(III)', 'Green to violet', ''], ['Al^3+', 'Aluminium|aluminum', '', ''],
        ['H^-', 'Hydride', '', ''], ['F^-', 'Fluoride', '', ''], ['Cl^-', 'Chloride', '', ''], ['Br^-', 'Bromide', '', ''], ['I^-', 'Iodide', '', ''],
        ['O^2-', 'Oxide', '', ''], ['S^2-', 'Sulfide|sulphide', '', ''], ['N^3-', 'Nitride', '', ''], ['P^3-', 'Phosphide', '', ''],
        ['OH^-', 'Hydroxide', '', ''], ['CN^-', 'Cyanide', '', ''], ['SCN^-', 'Thiocyanate', '', ''], ['NO3^-', 'Nitrate', '', ''],
        ['NO2^-', 'Nitrite', '', ''], ['CH3COO^-', 'Acetate|ethanoate', '', ''], ['HCO3^-', 'Hydrogen carbonate|bicarbonate', '', ''],
        ['HSO4^-', 'Hydrogen sulfate|bisulfate', '', ''], ['H2PO4^-', 'Dihydrogen phosphate', '', ''], ['MnO4^-', 'Permanganate', 'Purple', ''],
        ['ClO^-', 'Hypochlorite', '', ''], ['ClO2^-', 'Chlorite', '', ''], ['ClO3^-', 'Chlorate', '', ''], ['ClO4^-', 'Perchlorate', '', ''],
        ['SO4^2-', 'Sulfate|sulphate', '', ''], ['SO3^2-', 'Sulfite|sulphite', '', ''], ['CO3^2-', 'Carbonate', '', ''],
        ['HPO4^2-', 'Hydrogen phosphate', '', ''], ['C2O4^2-', 'Oxalate', '', ''], ['S2O3^2-', 'Thiosulfate', '', ''],
        ['CrO4^2-', 'Chromate', 'Yellow', ''], ['Cr2O7^2-', 'Dichromate', 'Orange', ''], ['O2^2-', 'Peroxide', '', ''], ['S2^2-', 'Disulfide', '', ''],
        ['SiO3^2-', 'Silicate', '', ''], ['PO4^3-', 'Phosphate', '', ''], ['BO3^3-', 'Borate', '', '']
    ];

    var ions = ION_LIST.map(function (x) {
        var f = parse(x[0]), names = x[1].split('|'), atoms = Object.keys(f.atoms), count = atoms.reduce(function (n, k) { return n + f.atoms[k]; }, 0);
        return {
            formula: x[0], name: names[0], also: names.slice(1), charge: f.charge, atoms: f.atoms,
            kind: (count > 1 ? 'Polyatomic ' : 'Monatomic ') + (f.charge > 0 ? 'cation' : 'anion'),
            water: x[2] || 'Colourless', flame: x[3] || null
        };
    });

    // An ion from what is typed: its formula with or without its charge, SO4^2-, SO4, or a name of it, sulfate
    function findIon(text) {
        var t = (text || '').trim(), low = t.toLowerCase(), f, same;
        if (!t) return { error: 'empty' };
        same = ions.filter(function (ion) {
            return ion.name.toLowerCase() === low || ion.also.some(function (a) { return a.toLowerCase() === low; }) ||
                ion.name.toLowerCase() + ' ion' === low;
        })[0];
        if (same) return same;
        f = parse(t);
        if (!f.error) {
            same = ions.filter(function (ion) {
                var a = Object.keys(ion.atoms), b = Object.keys(f.atoms);
                return a.length === b.length && a.every(function (k) { return ion.atoms[k] === f.atoms[k]; }) && (f.charge === 0 || f.charge === ion.charge);
            });
            if (same.length) return same[0];
        }
        same = ions.filter(function (ion) { // a name begun: ferr, sulf
            return low.length > 2 && [ion.name].concat(ion.also).some(function (n) { return n.toLowerCase().indexOf(low) === 0; });
        });
        return same.length ? same[0] : { error: f.error && !/[a-z]{3}/i.test(t) ? f.error : 'unknown' };
    }

    // the whole table: the cations down, the anions across, a letter in each cell
    function solubilityTable() {
        return {
            cations: CATIONS.map(function (c) { return { ion: c[1], name: c[3], formula: c[0], charge: c[2] }; }),
            anions: ANIONS.map(function (a) { return { ion: a[1], name: a[3], formula: a[0], charge: a[2] }; }),
            letters: CATIONS.map(function (c) { return c[4]; }),
            words: SOLUBLE_WORDS
        };
    }

    // ---------------- oxidation numbers ---------------- //

    function gcdOf(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) {
            var t = a % b;
            a = b;
            b = t;
        }
        return a || 1;
    }

    // a number as a fraction [n, d], as small as it goes, d above 0
    function ratioOf(n, d) {
        var g = gcdOf(n, d) * (d < 0 ? -1 : 1);
        return [n / g, d / g];
    }

    // an oxidation number as chemists write it: +3, −2, 0, +8/3
    function signed(v) {
        return (v[0] > 0 ? '+' : v[0] < 0 ? '−' : '') + Math.abs(v[0]) + (v[1] > 1 ? '/' + v[1] : '');
    }

    // the oxidation states an element is commonly found in, as numbers: −3, 3, 5 of N
    function statesOf(s) {
        return String(bySymbol[s].ox || '').replace(/−/g, '-').split(/\s+/).filter(Boolean).map(Number);
    }

    function isMetal(s) {
        return ['nonmetal', 'halogen', 'noble', 'metalloid'].indexOf(bySymbol[s].cat) < 0;
    }

    // one atom of an element, as parse counts them
    function single(s) {
        var atoms = {};
        atoms[s] = 1;
        return atoms;
    }

    // The oxidation number of each element of these atoms with this charge, by the rules in their order: an
    // element alone its charge shared out; F −1; the metals of groups 1 and 2 +1 and +2, Al +3; H +1, −1 with metals
    // alone; O −2; the most electronegative halogen −1; and the one left, so they add up to the charge. Rules that do
    // not add up are dropped, the last first: O of a peroxide, Cl of ClO⁻. With more than one left, the most
    // electronegative first, each in its usual states, till the last comes out one of its own; else, loose, any
    // { ox: { Fe: [3, 1] }, guessed } or { error: 'none' }
    function solveOx(atoms, charge) {
        var els = Object.keys(atoms), fixed = {}, rank = {}, ox = {}, free, total, halogen, found = null, loose;
        if (els.length === 1) {
            ox[els[0]] = ratioOf(charge, atoms[els[0]]);
            return { ox: ox };
        }
        halogen = els.filter(function (s) { return bySymbol[s].cat === 'halogen'; }).sort(function (a, b) { return bySymbol[b].en - bySymbol[a].en; })[0];
        els.forEach(function (s) {
            var cat = bySymbol[s].cat, rule = s === 'F' ? [-1, 5] : cat === 'alkali' ? [1, 4] : cat === 'alkaline' ? [2, 4] : s === 'Al' ? [3, 4] :
                s === 'H' ? [els.every(function (t) { return t === 'H' || isMetal(t); }) ? -1 : 1, 3] : s === 'O' ? [-2, 2] : s === halogen ? [-1, 1] : null;
            if (rule) {
                fixed[s] = rule[0];
                rank[s] = rule[1];
            }
        });
        for (;;) {
            free = els.filter(function (s) { return !fixed.hasOwnProperty(s); });
            total = els.reduce(function (t, s) { return t + (fixed.hasOwnProperty(s) ? fixed[s] * atoms[s] : 0); }, 0);
            if (free.length || total === charge) break;
            delete fixed[Object.keys(fixed).sort(function (a, b) { return rank[a] - rank[b]; })[0]];
        }
        Object.keys(fixed).forEach(function (s) { ox[s] = [fixed[s], 1]; });
        if (!free.length) return { ox: ox };
        if (free.length === 1) {
            ox[free[0]] = ratioOf(charge - total, atoms[free[0]]);
            return { ox: ox };
        }
        free.sort(function (a, b) { return (bySymbol[b].en || 0) - (bySymbol[a].en || 0); });
        // the state of each in turn, and what is left for the last
        function each(i, left, got) {
            var s = free[i], states = statesOf(s), v, r;
            if (i === free.length - 1) {
                v = left / atoms[s];
                if (loose ? Math.abs(v) > 8 : states.indexOf(v) < 0) return null;
                return got.concat([ratioOf(left, atoms[s])]);
            }
            for (var k = 0; k < (states.length || 1); k++) {
                v = states.length ? states[k] : 0;
                if ((r = each(i + 1, left - v * atoms[s], got.concat([[v, 1]])))) return r;
            }
            return null;
        }
        for (loose = false; !found; loose = true) {
            found = each(0, charge - total, []);
            if (loose) break;
        }
        if (!found) return { error: 'none' };
        free.forEach(function (s, i) { ox[s] = found[i]; });
        return { ox: ox, guessed: true };
    }

    // The oxidation number of each element of a formula: Fe2(SO4)3, Cr2O7^2−, NH4NO3. A salt has each of its ions
    // worked out alone, the water of a hydrate as water; one whose cation and anion share an element shows them
    // apart, as N is −3 in NH₄⁺ and +5 in NO₃⁻
    // { rows: [{ s, ox: [n, d], text, in: the ion it is in }], parts, guessed, average: the elements of a fraction } or { error }
    function oxidation(text) {
        var f = parse(text), dry, salt, rows = [], got = { ox: {} }, shared, bad = null, guessed = false;
        if (f.error) return f;
        if (f.electron) return { error: 'electron' };
        dry = parse(String(text).replace(/[·•*.]\s*\d*\s*H2O\s*$/, ''));
        if (!f.charge && !dry.error && (salt = saltOf(dry.atoms))) {
            shared = salt.cation.poly && Object.keys(salt.cation.atoms).some(function (s) { return salt.anion.atoms[s]; });
            [salt.cation, salt.anion].forEach(function (p) {
                var r = solveOx(p.atoms, p.charge);
                if (r.error) return (bad = r);
                guessed = guessed || !!r.guessed;
                Object.keys(p.atoms).forEach(function (s) {
                    got.ox[s] = r.ox[s];
                    if (shared) rows.push({ s: s, ox: r.ox[s], text: signed(r.ox[s]), in: plain(p.ion) });
                });
            });
            if (bad) return bad;
            if (shared) return { rows: rows, parts: true, guessed: guessed, average: [] };
            if (!got.ox.H && f.atoms.H) got.ox.H = [1, 1]; // the water of a hydrate
            if (!got.ox.O && f.atoms.O) got.ox.O = [-2, 1];
        } else {
            got = solveOx(f.atoms, f.charge);
            if (got.error) return got;
            guessed = !!got.guessed;
        }
        rows = f.order.map(function (s) { return { s: s, ox: got.ox[s], text: signed(got.ox[s]) }; });
        return { rows: rows, parts: false, guessed: guessed, average: rows.filter(function (r) { return r.ox[1] > 1; }).map(function (r) { return r.s; }) };
    }

    // of each element on a side of an equation, the oxidation numbers it has there, each once; null if one is not known
    function oxSide(side) {
        var got = {};
        for (var i = 0; i < side.length; i++) {
            if (side[i].f.electron) continue;
            var r = oxidation(side[i].t);
            if (r.error) return null;
            r.rows.forEach(function (row) {
                var list = got[row.s] = got[row.s] || [];
                if (!list.some(function (x) { return x.text === row.text; })) list.push({ v: row.ox[0] / row.ox[1], text: row.text });
            });
        }
        return got;
    }

    // What is oxidized and what is reduced in a reaction: each element whose oxidation numbers change, from those it
    // has only before to those it has only after, up or down: Cl −1 → 0, of HCl to KCl and Cl2; of Cl2 to Cl⁻ and
    // ClO3⁻, both, 0 → +5 and 0 → −1. { oxidized: [{ s, from, to }], reduced } or null, of none
    function redoxOf(left, right) {
        var l = oxSide(left), r = oxSide(right), out = { oxidized: [], reduced: [] },
            list = function (xs) { return xs.slice().sort(function (a, b) { return a.v - b.v; }).map(function (x) { return x.text; }).join(', '); },
            only = function (xs, ys) { // those of xs not in ys, else all of xs
                var o = xs.filter(function (x) { return !ys.some(function (y) { return y.text === x.text; }); });
                return o.length ? o : xs;
            },
            least = function (xs) { return Math.min.apply(null, xs.map(function (x) { return x.v; })); },
            most = function (xs) { return Math.max.apply(null, xs.map(function (x) { return x.v; })); };
        if (!l || !r) return null;
        Object.keys(l).forEach(function (s) {
            var a = l[s], b = r[s] || [];
            if (!b.length || (a.length === b.length && a.every(function (x) { return b.some(function (y) { return y.text === x.text; }); }))) return;
            a = only(l[s], b);
            b = only(b, l[s]);
            if (least(a) < most(b)) {
                out.oxidized.push({ s: s, from: list(a.filter(function (x) { return x.v < most(b); })), to: list(b.filter(function (y) { return y.v > least(a); })) });
            }
            if (most(a) > least(b)) {
                out.reduced.push({ s: s, from: list(a.filter(function (x) { return x.v > least(b); })), to: list(b.filter(function (y) { return y.v < most(a); })) });
            }
        });
        return out.oxidized.length || out.reduced.length ? out : null;
    }

    // ---------------- names ---------------- //

    var PREFIX = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'],
        ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
        // the anion of an element alone, its name and charge
        IDE = {
            H: ['hydride', -1], B: ['boride', -3], C: ['carbide', -4], N: ['nitride', -3], O: ['oxide', -2], F: ['fluoride', -1], Si: ['silicide', -4],
            P: ['phosphide', -3], S: ['sulfide', -2], Cl: ['chloride', -1], As: ['arsenide', -3], Se: ['selenide', -2], Br: ['bromide', -1],
            Te: ['telluride', -2], I: ['iodide', -1]
        },
        // the anions of an element alone that make an acid with hydrogen: HCl, H2S
        ACID_IDE = ['F', 'Cl', 'Br', 'I', 'S', 'Se', 'Te'],
        // the acids that ionize all the way in water
        STRONG = ['HCl', 'HBr', 'HI', 'HNO3', 'H2SO4', 'HClO4', 'HClO3'],
        // compounds known by a name of their own, its other names after a |
        COMMON = [
            ['H2O', 'Water'], ['H2O2', 'Hydrogen peroxide'], ['NH3', 'Ammonia'], ['CH4', 'Methane'], ['C2H6', 'Ethane'], ['C3H8', 'Propane'],
            ['C4H10', 'Butane'], ['C8H18', 'Octane'], ['C2H4', 'Ethene|ethylene'], ['C2H2', 'Ethyne|acetylene'], ['C6H6', 'Benzene'],
            ['CH3OH', 'Methanol|methyl alcohol'], ['C2H5OH', 'Ethanol|ethyl alcohol|alcohol'], ['CH3COOH', 'Acetic acid|ethanoic acid'],
            ['HCOOH', 'Formic acid|methanoic acid'], ['C6H12O6', 'Glucose'], ['C12H22O11', 'Sucrose|sugar|table sugar'], ['O3', 'Ozone'],
            ['N2H4', 'Hydrazine'], ['PH3', 'Phosphine'], ['SiH4', 'Silane'], ['Fe3O4', 'Iron(II,III) oxide|magnetite'], ['FeS2', 'Iron(II) disulfide|pyrite'],
            ['CaC2', 'Calcium carbide']
        ],
        DIATOMIC = ['H', 'N', 'O', 'F', 'Cl', 'Br', 'I'];

    function capital(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function sameAtoms(a, b) {
        var ka = Object.keys(a), kb = Object.keys(b);
        return ka.length === kb.length && ka.every(function (k) { return a[k] === b[k]; });
    }

    function atomCount(atoms) {
        return Object.keys(atoms).reduce(function (n, k) { return n + atoms[k]; }, 0);
    }

    // an ion's formula as the list of ions has it, its charge after ^: SO4^2-
    function ionText(base, charge) {
        return base + '^' + (Math.abs(charge) > 1 ? Math.abs(charge) : '') + (charge > 0 ? '+' : '-');
    }

    // the name of a cation of an element alone: as the list of ions has it, Iron(III), Sodium; else its element's,
    // its charge in Roman numerals if it has more than one, Tin(IV)
    function cationName(s, q) {
        var listed = ions.filter(function (i) { return i.charge === q && sameAtoms(i.atoms, single(s)); })[0], states = statesOf(s).filter(function (x) { return x > 0; });
        if (listed) return listed.name;
        return bySymbol[s].name + (states.length === 1 && states[0] === q ? '' : '(' + ROMAN[q] + ')');
    }

    // A neutral formula as a salt: its cation, a common polyatomic one or an element alone, a metal or hydrogen; its
    // anion, a common one or an element alone; and how many of each. The anions with the most atoms are tried first,
    // so NaHCO3 is of hydrogen carbonate, not carbonate; but those of one element, peroxide and disulfide, last, so
    // SnS2 is tin(IV) sulfide and FeS2 iron(II) disulfide. A metal's charge one of its usual states; else, loose, of a
    // transition metal any from 1 to 8. { cation: { base, ion, charge, n, name, atoms, poly }, anion } or null
    function saltOf(atoms) {
        var cations = ions.filter(function (c) { return c.charge > 0 && atomCount(c.atoms) > 1; }),
            poly = ions.filter(function (a) { return a.charge < 0 && atomCount(a.atoms) > 1; }).sort(function (a, b) { return atomCount(b.atoms) - atomCount(a.atoms); })
                .map(function (a) { return { base: a.formula.split('^')[0], ion: a.formula, charge: a.charge, name: a.name.toLowerCase(), atoms: a.atoms, poly: true }; }),
            alone = function (a) { return Object.keys(a.atoms).length === 1; },
            anions = poly.filter(function (a) { return !alone(a); }).concat(Object.keys(atoms).filter(function (s) { return IDE[s]; }).map(function (s) {
                return { base: s, ion: ionText(s, IDE[s][1]), charge: IDE[s][1], name: IDE[s][0], atoms: single(s), poly: false };
            }), poly.filter(alone)),
            A, loose, i, k, rest, keys, neg, s, q, m;
        function less(times) { // the atoms with so many of the anion taken out; null if there are not as many
            var out = {}, ok = true;
            Object.keys(atoms).forEach(function (e) {
                var left = atoms[e] - (A.atoms[e] || 0) * times;
                if (left < 0) ok = false;
                else if (left) out[e] = left;
            });
            return ok && Object.keys(A.atoms).every(function (e) { return atoms[e]; }) ? out : null;
        }
        function salt(cation) {
            return { cation: cation, anion: { base: A.base, ion: A.ion, charge: A.charge, n: k, name: A.name, atoms: A.atoms, poly: A.poly } };
        }
        for (loose = 0; loose < 2; loose++) {
            for (i = 0; i < anions.length; i++) {
                A = anions[i];
                for (k = 1; k <= 12 && (rest = less(k)); k++) {
                    keys = Object.keys(rest);
                    if (!keys.length) break;
                    neg = -k * A.charge;
                    for (var c = 0; c < cations.length; c++) { // NH4+, H3O+, Hg2^2+: so many of it, with the charge to balance
                        var P = cations[c], first = Object.keys(P.atoms)[0];
                        m = rest[first] / P.atoms[first];
                        if (m === Math.floor(m) && sameAtoms(rest, Object.keys(P.atoms).reduce(function (o, e) { o[e] = P.atoms[e] * m; return o; }, {})) && m * P.charge === neg) {
                            return salt({ base: P.formula.split('^')[0], ion: P.formula, charge: P.charge, n: m, name: P.name, atoms: P.atoms, poly: true });
                        }
                    }
                    if (keys.length !== 1) continue;
                    s = keys[0];
                    q = neg / rest[s];
                    if (q !== Math.floor(q) || q < 1 || q > 8) continue;
                    // hydrogen of an acid: HCl, H2SO4; a metal in one of its states, a peroxide of groups 1 and 2 alone
                    if (s === 'H' ? q === 1 && !A.atoms.H && ['O2', 'S2'].indexOf(A.base) < 0 && (A.poly || ACID_IDE.indexOf(A.base) > -1) :
                        isMetal(s) && (A.base !== 'O2' || /^alkal/.test(bySymbol[s].cat)) &&
                        (statesOf(s).indexOf(q) > -1 || (loose && /transition|post|lanthanide|actinide/.test(bySymbol[s].cat)))) {
                        return salt({ base: s, ion: ionText(s, q), charge: q, n: rest[s], name: s === 'H' ? 'Hydrogen' : cationName(s, q), atoms: single(s), poly: false });
                    }
                }
            }
        }
        return null;
    }

    // an anion's acid: chloride hydrochloric acid, sulfate sulfuric acid, nitrite nitrous acid
    function acidName(anion) {
        var a = anion.toLowerCase(), stem = a.slice(0, -3).replace(/sulf$/, 'sulfur').replace(/phosph$/, 'phosphor');
        return /ide$/.test(a) ? 'hydro' + stem + 'ic acid' : /ate$/.test(a) ? stem + 'ic acid' : /ite$/.test(a) ? stem + 'ous acid' : null;
    }

    // so many atoms of what a word names, as a Greek prefix says it: monoxide, tetroxide, not monooxide
    function counted(n, word, first) {
        var p = n === 1 && first ? '' : PREFIX[n];
        if (/^[ao]/.test(word) && /[ao]$/.test(p)) p = p.slice(0, -1);
        return p + word;
    }

    // The name of a formula, the water of a hydrate after it: a common name; an element's; an ion's; a salt's, its
    // cation then its anion, a metal of more than one charge with it in Roman numerals; an acid's; and two
    // nonmetals', a Greek prefix for how many of each. { name, also, kind, acid, salt, formula } or { error }
    function nameOf(text) {
        var t = String(text || '').trim(), water = 0, m, f, keys, out;
        if ((m = t.match(/[·•*.]\s*(\d*)\s*H2O$/))) {
            water = +m[1] || 1;
            t = t.slice(0, m.index).trim();
        }
        f = parse(t);
        if (f.error) return f;
        if (f.electron) return { error: 'unknown' };
        keys = f.order;
        out = (function () {
            var common = COMMON.filter(function (c) { return !f.charge && sameAtoms(parse(c[0]).atoms, f.atoms); })[0], ion, salt, s;
            if (common) return { name: common[1].split('|')[0], also: common[1].split('|').slice(1), kind: 'Common name' };
            if (keys.length === 1 && !f.charge) return { name: bySymbol[keys[0]].name, also: [], kind: 'Element' };
            if (f.charge) {
                ion = ions.filter(function (i) { return i.charge === f.charge && sameAtoms(i.atoms, f.atoms); })[0];
                if (ion) return { name: ion.name + ' ion', also: ion.also, kind: ion.kind };
                s = keys[0];
                if (keys.length === 1 && f.atoms[s] === 1) {
                    if (f.charge > 0 && isMetal(s) && f.charge <= 8) return { name: cationName(s, f.charge) + ' ion', also: [], kind: 'Monatomic cation' };
                    if (f.charge < 0 && IDE[s] && IDE[s][1] === f.charge) return { name: capital(IDE[s][0]) + ' ion', also: [], kind: 'Monatomic anion' };
                }
                return { error: 'unknown' };
            }
            if ((salt = saltOf(f.atoms))) {
                if (salt.cation.base === 'H') { // an oxyacid by its acid name; HCl, HCN and H2S as hydrogen's, their acid in water
                    return salt.anion.poly && !/ide$/.test(salt.anion.name) ? { name: capital(acidName(salt.anion.name)), also: [], kind: 'Acid', salt: salt } :
                        { name: 'Hydrogen ' + salt.anion.name, also: [], kind: 'Acid', acid: capital(acidName(salt.anion.name)), salt: salt };
                }
                return { name: salt.cation.name + ' ' + salt.anion.name, also: [], kind: 'Ionic', salt: salt };
            }
            if (keys.length === 2 && keys.every(function (k) { return !isMetal(k); }) && IDE[keys[1]] && f.atoms[keys[0]] <= 10 && f.atoms[keys[1]] <= 10) {
                return { name: capital(counted(f.atoms[keys[0]], bySymbol[keys[0]].name.toLowerCase(), true) + ' ' + counted(f.atoms[keys[1]], IDE[keys[1]][0])), also: [], kind: 'Molecular' };
            }
            return { error: 'unknown' };
        })();
        if (out.error) return out;
        if (water) out.name += ' ' + (water <= 10 ? PREFIX[water] : water + '-') + 'hydrate';
        out.formula = t + (water ? '·' + (water > 1 ? water : '') + 'H2O' : '');
        return out;
    }

    // what names are read as: the elements, the cations, the anions, the acids and the common names, each by its
    // names in lower case, other spellings too
    var NAMED = (function () {
        var by = { element: {}, cation: {}, anion: {}, acid: {}, common: {} };
        elements.forEach(function (e) { by.element[e.name.toLowerCase()] = e.s; });
        by.element.aluminum = 'Al';
        by.element.cesium = 'Cs';
        by.element.sulphur = 'S';
        ions.forEach(function (i) {
            var to = i.charge > 0 ? by.cation : by.anion, it = { base: i.formula.split('^')[0], charge: Math.abs(i.charge), poly: atomCount(i.atoms) > 1, ion: i.formula };
            [i.name].concat(i.also).forEach(function (n) { to[n.toLowerCase()] = it; });
            if (i.charge < 0 && !i.atoms.H && ['O', 'O2', 'S2'].indexOf(it.base) < 0 && (it.poly || ACID_IDE.indexOf(it.base) > -1)) by.acid[acidName(i.name)] = it;
        });
        Object.keys(IDE).forEach(function (s) {
            var it = { base: s, charge: -IDE[s][1], poly: false, ion: ionText(s, IDE[s][1]) };
            by.anion[IDE[s][0]] = it;
            if (ACID_IDE.indexOf(s) > -1) by.acid[acidName(IDE[s][0])] = it;
        });
        COMMON.forEach(function (c) {
            c[1].split('|').forEach(function (n) { by.common[n.toLowerCase()] = c[0]; });
        });
        return by;
    })();

    // so many of a part of a formula: (NO3)2, Cl3
    function times(base, n, poly) {
        return n > 1 ? (poly ? '(' + base + ')' + n : base + n) : base;
    }

    // a word with a Greek prefix, dinitrogen, tetroxide: how many, and what the rest of it is in the table
    function prefixed(word, table) {
        if (table[word]) return { n: 1, x: table[word] };
        for (var n = 1; n < PREFIX.length; n++) {
            var cut = [PREFIX[n], PREFIX[n].slice(0, -1)];
            for (var j = 0; j < 2; j++) {
                if (word.indexOf(cut[j]) === 0 && table[word.slice(cut[j].length)]) return { n: n, x: table[word.slice(cut[j].length)] };
            }
        }
        return null;
    }

    // The formula of a name: iron(III) sulfate, sodium hydrogen carbonate, sulfuric acid, dinitrogen tetroxide,
    // copper(II) sulfate pentahydrate, ammonia, sulfate. A metal of more than one charge needs it, in Roman numerals.
    // { formula } or { error, element }
    function formulaOf(text) {
        var s = String(text || '').toLowerCase().replace(/[‐-―]/g, '-').trim().replace(/\s+/g, ' ')
                .replace(/\s*\(\s*([ivx]+|\d)\s*\+?\s*\)/g, function (all, r) { return '(' + (/\d/.test(r) ? ROMAN[+r].toLowerCase() : r) + ')'; })
                .replace(/ ions?$/, ''),
            words, water = 0, m, out = null, i, cation, anion, need = null, a, b, g;
        if (!s) return { error: 'empty' };
        words = s.split(' ');
        if (words.length > 1 && (m = words[words.length - 1].match(/^(mono|di|tri|tetra|penta|hexa|hepta|octa|nona|deca)?-?hydrate$/))) {
            water = m[1] ? PREFIX.indexOf(m[1]) : 1;
            words.pop();
            s = words.join(' ');
        }
        // a cation by its name: of the list of ions, or an element with its charge in Roman numerals, or a metal of one charge
        function cationOf(w) {
            var e, states, r = w.match(/^([a-z]+)\(([ivx]+)\)$/);
            if (NAMED.cation[w]) return NAMED.cation[w];
            if (r && NAMED.element[r[1]] && isMetal(NAMED.element[r[1]]) && ROMAN.indexOf(r[2].toUpperCase()) > 0) {
                return { base: NAMED.element[r[1]], charge: ROMAN.indexOf(r[2].toUpperCase()), poly: false };
            }
            e = NAMED.element[w];
            if (!e || !isMetal(e)) return null;
            states = statesOf(e).filter(function (x) { return x > 0; });
            if (states.length === 1) return { base: e, charge: states[0], poly: false };
            need = need || bySymbol[e];
            return null;
        }
        if (NAMED.common[s]) out = NAMED.common[s];
        else if (NAMED.acid[s]) out = 'H' + (NAMED.acid[s].charge > 1 ? NAMED.acid[s].charge : '') + NAMED.acid[s].base;
        else if (NAMED.element[s]) out = NAMED.element[s] + (DIATOMIC.indexOf(NAMED.element[s]) > -1 ? '2' : '');
        else if (NAMED.anion[s]) out = NAMED.anion[s].ion;
        else if ((cation = /\(/.test(s) || NAMED.cation[s] ? cationOf(s) : null)) out = cation.ion || ionText(cation.base, cation.charge);
        for (i = 1; !out && i < words.length; i++) { // a salt: its cation, then its anion
            anion = NAMED.anion[words.slice(i).join(' ')];
            if (anion && (cation = cationOf(words.slice(0, i).join(' ')))) {
                g = gcdOf(cation.charge, anion.charge);
                out = times(cation.base, anion.charge / g, cation.poly) + times(anion.base, cation.charge / g, anion.poly);
            }
        }
        if (!out && words.length === 2) { // two nonmetals, each with its prefix
            a = prefixed(words[0], NAMED.element);
            b = prefixed(words[1], Object.keys(IDE).reduce(function (o, e) { o[IDE[e][0]] = e; return o; }, {}));
            if (a && b && !isMetal(a.x)) out = a.x + (a.n > 1 ? a.n : '') + b.x + (b.n > 1 ? b.n : '');
        }
        if (!out) return need ? { error: 'numeral', element: need } : { error: 'unknown' };
        return { formula: out + (water ? '·' + (water > 1 ? water : '') + 'H2O' : '') };
    }

    // A formula's name, or a name's formula, as what is typed reads: what reads as a formula is one
    // { name, also, kind, acid, salt, formula, from: 'formula' or 'name' } or { error }
    function names(text) {
        var t = String(text || '').trim(), f, r;
        if (!t) return { error: 'empty' };
        f = parse(t.replace(/[·•*.]\s*\d*\s*H2O$/, ''));
        if (!f.error) {
            r = nameOf(t);
            r.from = 'formula';
            return r;
        }
        r = formulaOf(t);
        if (r.error) return r.error === 'unknown' && /^[A-Z][a-z]?\d/.test(t) ? f : r; // Xx2O: a formula, of no such element
        f = nameOf(r.formula);
        if (f.error) return { error: 'unknown' };
        f.from = 'name';
        return f;
    }

    // The particles a formula makes in water, its van 't Hoff factor at most: of a salt its ions, of a strong
    // acid its H⁺ and its anion, of anything else 1. { i, salt, strong } or { error }
    function particles(text) {
        var f = parse(String(text || '').replace(/[·•*.]\s*\d*\s*H2O\s*$/, '')), salt, strong;
        if (f.error) return f;
        if (f.charge || COMMON.some(function (c) { return sameAtoms(parse(c[0]).atoms, f.atoms); }) || !(salt = saltOf(f.atoms))) return { i: 1 };
        strong = STRONG.some(function (a) { return sameAtoms(parse(a).atoms, f.atoms); });
        return salt.cation.base === 'H' && !strong ? { i: 1, salt: salt } : { i: salt.cation.n + salt.anion.n, salt: salt, strong: strong };
    }

    // ---------- gases ---------- //

    // Gases at room temperature and 1 atm, each its ratio of heat capacities γ, Cp/Cv, at about 20 °C; 0 where
    // it is not kept, to be worked out from its atoms
    var GAS_TABLE = [['H2', 1.41], ['He', 1.667], ['N2', 1.4], ['O2', 1.395], ['F2', 0], ['Ne', 1.667], ['Cl2', 1.34], ['Ar', 1.667],
        ['Kr', 1.667], ['Xe', 1.667], ['Rn', 1.667], ['O3', 0], ['CO', 1.4], ['CO2', 1.289], ['NO', 1.386], ['NO2', 0], ['N2O', 1.31],
        ['NH3', 1.31], ['CH4', 1.304], ['C2H6', 1.19], ['C2H4', 1.24], ['C2H2', 1.23], ['C3H8', 1.13], ['C4H10', 1.1], ['H2S', 1.32],
        ['SO2', 1.29], ['HCl', 1.41], ['HF', 0], ['HBr', 0], ['HI', 0], ['PH3', 0], ['SiH4', 0]],
        AIR = { M: 28.965, gamma: 1.4 },
        // Antoine's equation of water, log₁₀ P = A − B ÷ (C + t), P in mmHg and t in °C: from 1 °C to 100 °C, and above it to 374 °C
        ANTOINE = [8.07131, 1730.63, 233.426], ANTOINE_HOT = [8.14019, 1810.94, 244.485];

    // gases and a number of each, apart by commas, semicolons or new lines, or with a decimal comma by semicolons or new
    // lines only: N2 0.78, O2 0.21, Ar 1%. { list: [{ t, v }] } or { error: what is not read, '' of nothing }
    function readGases(text, comma) {
        var items = String(text).split(comma ? /[;\n]+/ : /[,;\n]+/), list = [], bad = null;
        items.forEach(function (it) {
            var s = it.trim(), m;
            if (!s || bad !== null) return;
            m = s.match(/^(.+?)\s*[=:]?\s+(\d*[.,]?\d+(?:e[+-]?\d+)?)\s*(%?)$/i);
            if (!m) {
                bad = s;
                return;
            }
            list.push({ t: m[1].trim(), v: +m[2].replace(',', '.') / (m[3] ? 100 : 1) });
        });
        return bad !== null ? { error: bad } : list.length ? { list: list } : { error: '' };
    }

    // the pressure of water's vapour at t °C, mmHg, as tables of it give within some 0.5%; NaN where water is not liquid at 1 atm
    function waterVapour(t) {
        return t >= 0 && t <= 100 ? Math.pow(10, ANTOINE[0] - ANTOINE[1] / (ANTOINE[2] + t)) : NaN;
    }

    // the temperature water boils at under p mmHg, °C; NaN where the equations do not hold: below 0 °C, some 4.6 mmHg, and
    // above the critical point, 374 °C
    function waterBoils(p) {
        var k = p > 760 ? ANTOINE_HOT : ANTOINE, d, t;
        if (!(p > 0)) return NaN;
        d = k[0] - Math.log10(p);
        if (!(d > 0)) return NaN;
        t = k[1] / d - k[2];
        return t >= 0 && t <= 374 ? t : NaN;
    }

    // whether a formula is a gas at t °C and about 1 atm: as its state says, H2(g), else if it is one of the gases
    // known, or water at 100 °C and above
    function isGas(text, t) {
        var s = String(text).replace(/\s+/g, ''), m = s.match(/\((aq|s|l|g)\)$/i);
        if (m) return m[1].toLowerCase() === 'g';
        if (sameFormula(s, 'H2O')) return t >= 100;
        return GAS_TABLE.some(function (g) { return sameFormula(s, g[0]); });
    }

    // A gas by its formula, or air: its molar mass and γ; of one whose γ is not kept, 5/3 of an atom, 7/5 of two
    // and 4/3 of more, guessed. { M, gamma, guessed, air } or { error }
    function gasOf(text) {
        var f, kept, atoms;
        if (/^\s*air\s*$/i.test(text)) return { M: AIR.M, gamma: AIR.gamma, air: true };
        f = molarMass(text);
        if (f.error) return f;
        kept = GAS_TABLE.filter(function (g) { return sameFormula(text, g[0]); })[0];
        if (kept && kept[1]) return { M: f.mass, gamma: kept[1] };
        atoms = Object.keys(f.atoms).reduce(function (s, k) { return s + f.atoms[k]; }, 0);
        return { M: f.mass, gamma: atoms === 1 ? 5 / 3 : atoms === 2 ? 1.4 : 4 / 3, guessed: true };
    }

    // the gases known, and air, whose molar mass is within a part tol of M, the nearest first: [{ t, M }]
    function gasesNear(M, tol) {
        return GAS_TABLE.map(function (g) { return { t: g[0], M: molarMass(g[0]).mass }; }).concat([{ t: 'air', M: AIR.M }]).filter(function (g) {
            return Math.abs(g.M - M) <= tol * M;
        }).sort(function (a, b) { return Math.abs(a.M - M) - Math.abs(b.M - M); });
    }

    // ---------- spectra ---------- //

    // The strongest lines of the light of an element's atoms as a gas, where they are seen, 380 to 750 nm, from
    // NIST's tables of strong lines (Handbook of Basic Atomic Spectroscopic Data): each its wavelength in air, nm,
    // then how strong, 3 of half the strongest's intensity or more, 2 of 15%, 1 of 5%; those weaker left out, and
    // those within 0.05 nm of each other as one. Of the neutral atom, and of calcium, strontium and barium their
    // ions' lines as well, which a flame and the Sun show; of one whose atom has no line here, its ion's, marked
    // '+ ', and of francium, whose lines have no intensity, each as strong. Astatine has none here: UNSEEN
    var SPECTRA = {
        H: '410.17 1, 434.05 2, 486.14 2, 656.29 3',
        He: '388.86 3, 402.62 1, 447.15 2, 471.31 1, 501.57 2, 587.56 3, 667.82 2, 706.52 2, 728.13 1',
        Li: '610.37 2, 670.79 3',
        Be: '381.35 3, 457.27 3, 698.27 3, 720.91 3',
        B: '+ 412.19 3, 419.48 2, 447.21 2, 447.29 2, 494.04 2, 608.04 2',
        C: '538.03 3, 601.32 3',
        N: '496.40 2, 575.25 3, 648.27 2, 742.36 3, 744.23 3, 746.83 3',
        O: '394.73 2, 615.60 3, 615.68 3, 615.82 3, 645.60 3, 700.22 3, 725.44 3',
        F: '623.97 2, 634.85 2, 641.37 2, 677.40 1, 683.43 2, 685.60 3, 687.02 2, 690.25 2, 690.98 1, 696.63 1, 703.75 3, 712.79 3, 720.24 2, ' +
            '731.10 2, 733.20 1, 739.87 2, 742.56 1, 748.92 1',
        Ne: '453.78 1, 470.44 2, 470.89 1, 471.01 1, 471.21 2, 471.53 2, 475.27 1, 478.89 1, 479.02 1, 482.73 1, 488.49 1, 500.52 1, 503.78 1, ' +
            '514.49 1, 533.08 1, 534.11 1, 534.33 1, 540.06 2, 556.28 1, 565.67 1, 571.92 1, 574.83 1, 576.44 1, 580.44 1, 582.02 1, 585.25 2, ' +
            '587.28 1, 588.19 1, 594.48 1, 596.55 1, 597.46 1, 597.55 1, 603.00 1, 607.43 1, 614.31 1, 616.36 1, 621.73 1, 626.65 1, 633.44 1, ' +
            '638.30 1, 640.22 2, 650.65 2, 659.90 1, 667.83 1, 692.95 3, 702.41 2, 703.24 3, 705.91 1, 717.39 3, 724.52 3, 748.89 2',
        Na: '589.00 3, 589.59 3',
        Mg: '382.94 2, 383.23 3, 383.83 3, 457.11 1, 516.73 2, 517.27 3, 518.36 3, 571.11 1',
        Al: '394.40 3, 396.15 3',
        Si: '390.55 3, 568.45 2, 570.84 2, 594.85 2, 615.51 2, 623.73 2, 624.38 2, 624.45 2, 625.42 2, 700.36 2, 700.59 2, 703.49 2, 716.55 2, ' +
            '725.06 2, 727.53 2, 728.92 3, 740.58 2, 740.91 2, 741.59 2, 742.35 3',
        P: '619.90 3',
        S: '469.41 3, 675.72 3',
        Cl: '725.66 3, 741.41 3',
        Ar: '696.54 3, 706.72 3, 714.70 1, 727.29 2, 738.40 3',
        K: '404.41 3, 404.72 3, 464.19 3, 474.09 2, 474.44 2, 475.39 2, 475.74 2, 478.65 2, 479.11 2, 479.98 2, 480.44 2, 484.99 2, 485.61 2, ' +
            '486.35 2, 486.98 3, 494.20 2, 495.08 3, 495.61 3, 496.50 3, 508.42 3, 509.72 3, 509.92 3, 511.23 3, 532.33 3, 533.97 3, 534.30 3, ' +
            '535.96 3, 578.24 3, 580.17 3, 581.21 3, 583.19 3, 691.11 3, 693.63 3, 693.88 3, 696.47 3',
        Ca: '393.37 3, 396.85 3, 422.67 3, 430.25 3, 430.77 3, 442.54 3, 443.50 3, 443.57 3, 445.48 3, 445.59 3, 445.66 2, 487.81 3, 502.00 2, ' +
            '518.88 3, 526.56 3, 527.03 3, 534.95 3, 558.20 3, 558.88 3, 559.01 3, 559.45 3, 559.85 3, 585.75 3, 610.27 3, 612.22 3, 616.22 3, ' +
            '616.91 3, 616.96 3, 643.91 3, 644.98 3, 645.69 2, 646.26 3, 647.17 3, 649.38 3, 649.96 3, 657.28 3, 671.77 3, 714.81 3, 720.22 3, ' +
            '732.61 3',
        Sc: '390.75 3, 391.18 3, 393.34 2, 399.66 2, 402.04 3, 402.37 3, 404.78 1, 405.45 2, 408.24 2, 416.52 1, 474.38 1, 508.16 1, 508.37 1, ' +
            '508.55 1, 567.18 1, 568.69 1, 570.02 1',
        Ti: '388.29 1, 390.48 2, 391.43 1, 392.45 1, 392.99 1, 394.78 1, 394.87 3, 395.63 3, 395.82 3, 396.29 1, 396.43 1, 398.18 3, 398.25 1, ' +
            '398.98 3, 399.86 3, 400.89 1, 402.46 2, 406.03 1, 407.85 1, 418.61 1, 428.60 1, 428.74 1, 428.91 1, 429.09 1, 429.57 1, 429.87 2, ' +
            '430.06 2, 430.11 3, 430.59 3, 431.48 2, 431.86 1, 442.71 1, 444.91 1, 445.09 1, 445.33 1, 445.53 1, 445.74 1, 448.13 1, 451.27 1, ' +
            '451.80 1, 452.28 1, 452.73 1, 453.32 3, 453.48 3, 453.56 2, 454.47 1, 454.88 1, 455.25 1, 455.55 1, 461.73 1, 462.31 1, 465.65 1, ' +
            '466.76 1, 468.19 1, 484.09 1, 488.51 1, 489.99 1, 498.17 3, 499.11 3, 499.95 3, 500.72 3, 501.42 2, 501.62 1, 502.00 1, 502.29 1, ' +
            '502.48 1, 503.59 2, 503.65 1, 503.84 1, 504.00 2, 506.47 2, 517.37 1, 519.30 2, 521.04 2, 586.64 1, 625.81 1, 625.87 1',
        V: '380.35 1, 381.35 1, 381.82 1, 382.20 1, 382.86 1, 384.07 2, 385.58 2, 386.49 1, 387.51 1, 387.61 1, 389.02 1, 390.23 2, 390.99 1, ' +
            '409.06 1, 409.27 2, 409.55 1, 409.98 2, 410.22 1, 410.52 2, 410.98 2, 411.18 3, 411.52 2, 411.65 2, 412.35 2, 412.81 2, 413.20 2, ' +
            '413.45 2, 426.86 1, 434.10 1, 435.29 1, 437.92 3, 438.47 3, 439.00 2, 439.52 2, 440.06 1, 440.66 2, 440.76 2, 440.85 2, 441.65 1, ' +
            '442.16 1, 443.78 1, 444.17 1, 444.42 1, 445.20 1, 445.98 1, 446.03 2, 446.24 1, 458.04 1, 458.64 1, 459.41 1, 487.55 1, 488.16 1, ' +
            '569.85 1, 570.36 1, 570.70 1, 572.70 1, 609.02 1, 611.95 1, 624.31 1',
        Cr: '390.88 1, 391.92 1, 396.37 1, 396.97 1, 397.67 1, 398.39 1, 399.11 1, 425.43 3, 427.48 3, 428.97 3, 433.94 1, 434.45 1, 435.18 1, ' +
            '464.62 1, 520.45 2, 520.60 2, 520.84 3, 540.98 1',
        Mn: '380.67 1, 382.35 1, 383.44 1, 401.81 1, 403.08 3, 403.31 3, 403.45 2, 403.57 1, 404.14 2, 405.55 1',
        Fe: '381.30 1, 381.58 2, 382.04 3, 382.44 3, 382.59 2, 382.78 2, 383.42 2, 384.04 1, 384.10 2, 385.64 3, 385.99 3, 387.86 2, 388.63 3, ' +
            '388.85 1, 389.57 2, 389.97 2, 390.29 1, 392.03 1, 392.29 2, 392.79 2, 393.03 2, 400.52 1, 404.58 3, 406.36 2, 407.17 2, 413.21 1, ' +
            '414.39 2, 420.20 1, 421.62 1, 425.08 1, 426.05 2, 427.18 2, 428.24 2, 430.79 2, 432.58 2, 437.59 2, 438.35 2, 440.48 2, 441.51 1, ' +
            '442.73 1, 446.17 1, 492.05 1, 495.76 2, 516.75 3, 517.16 1, 522.72 2, 526.95 2, 527.04 2, 532.80 2, 534.10 1, 537.15 1, 539.71 1',
        Co: '384.55 3, 387.31 3, 387.40 2, 389.41 3, 399.53 3, 411.88 2, 412.13 3',
        Ni: '380.71 3, 385.83 3',
        Cu: '406.26 3, 465.11 3, 510.55 3, 515.32 3, 521.82 3, 529.25 3, 570.02 3, 578.21 3',
        Zn: '468.01 2, 472.22 3, 481.05 3, 636.23 1',
        Ga: '403.30 3, 417.20 3, 639.66 1, 641.35 1',
        Ge: '+ 474.18 3, 481.46 3, 589.34 3, 602.10 3',
        As: '+ 419.01 3, 445.85 3, 446.63 3, 449.42 3, 450.77 3, 454.35 3, 617.03 3',
        Se: '473.08 3, 473.90 3, 474.23 3, 706.21 3',
        Br: '444.17 2, 447.26 2, 447.77 2, 452.56 2, 614.86 3, 635.07 3, 654.46 2, 655.98 3, 658.22 2, 663.16 3, 668.23 2, 669.21 2, 700.52 2, ' +
            '734.85 2',
        Kr: '427.40 2, 431.86 1, 431.96 2, 436.26 2, 437.61 2, 440.00 1, 445.39 2, 446.37 2, 450.24 2, 556.22 2, 557.03 3, 587.09 3, 645.63 1',
        Rb: '420.18 3, 421.55 3, 543.15 1, 572.41 1, 607.08 1, 620.63 1, 629.83 1, 728.00 1, 740.82 2',
        Sr: '407.77 3, 421.55 3, 460.73 3, 472.23 1, 481.19 1, 483.21 1, 487.25 1, 496.23 1, 525.69 1, 548.08 1, 550.42 1, 640.85 1, 650.40 1, ' +
            '661.73 1, 687.84 1, 707.01 1',
        Y: '403.98 1, 404.76 2, 407.74 3, 408.37 2, 410.24 3, 412.83 3, 414.28 3, 416.75 2, 417.41 2, 423.59 2, 425.12 1, 450.59 1, 452.72 1, ' +
            '464.37 2, 467.48 2, 483.99 1, 484.57 1, 546.65 1, 552.76 1, 558.19 1, 563.01 1, 602.43 1, 619.17 1, 643.50 1',
        Zr: '382.24 2, 383.60 3, 384.70 2, 384.93 2, 386.39 3, 387.76 2, 387.90 1, 388.54 3, 389.03 3, 389.14 3, 390.05 1, 392.18 2, 392.95 2, ' +
            '396.67 2, 396.83 2, 397.35 2, 397.53 1, 400.76 1, 402.40 1, 402.49 2, 402.72 2, 402.89 1, 403.00 2, 403.59 1, 404.22 1, 404.36 2, ' +
            '404.46 2, 405.05 1, 405.50 2, 405.57 2, 406.15 1, 406.42 3, 407.27 3, 407.49 1, 407.65 1, 407.83 1, 408.12 3, 410.84 1, 415.26 1, ' +
            '416.64 1, 418.76 2, 419.48 1, 420.15 2, 421.39 1, 422.77 3, 423.61 1, 423.93 3, 424.03 2, 424.17 2, 426.80 1, 428.22 2, 429.48 2, ' +
            '430.29 1, 434.11 2, 434.79 2, 436.08 1, 450.71 2, 453.57 2, 455.30 1, 455.51 1, 457.55 2, 463.40 2, 468.78 3, 468.84 2, 471.01 3, ' +
            '473.95 3, 477.23 2, 478.49 1, 480.59 1, 481.56 2, 482.43 1, 485.14 1, 504.66 1, 506.49 1, 507.83 2, 612.75 2, 614.32 2, 709.77 2, ' +
            '710.29 1, 716.91 2',
        Nb: '380.29 2, 387.88 1, 388.54 1, 396.61 1, 403.25 1, 405.89 3, 407.97 3, 410.09 2, 412.38 2, 412.99 1, 413.71 1, 413.97 2, 415.01 1, ' +
            '415.26 2, 416.37 2, 416.47 2, 416.81 2, 419.09 1, 419.21 1, 419.51 1, 419.57 1, 420.53 1, 426.21 1, 460.68 1, 507.90 1',
        Mo: '383.37 1, 386.41 3, 390.30 3, 406.21 1, 406.99 1, 414.36 1, 418.83 1, 423.26 1, 428.86 1, 438.16 1, 441.17 1, 550.65 2, 553.30 2, ' +
            '557.04 1',
        Tc: '383.28 1, 383.76 2, 384.13 1, 384.60 1, 386.82 1, 388.07 1, 389.98 1, 394.66 2, 394.71 2, 398.50 3, 399.45 1, 401.20 1, 402.08 1, ' +
            '403.16 3, 403.93 1, 404.91 3, 408.87 3, 409.57 3, 411.02 1, 411.51 3, 412.42 2, 412.83 1, 414.50 2, 416.56 3, 416.97 1, 417.03 2, ' +
            '417.25 2, 417.63 1, 423.82 3, 426.23 3, 429.71 3, 448.71 1, 452.28 2, 453.95 1, 456.45 1, 463.75 1, 464.83 1, 466.02 1, 466.93 1, ' +
            '471.78 1, 471.93 2, 474.06 2, 477.15 2, 482.07 2, 485.36 3, 486.67 2, 489.19 2, 490.96 1, 497.63 2, 509.63 2, 516.18 2, 517.48 2, ' +
            '527.55 1, 528.51 1, 532.02 1, 558.90 2, 562.04 2, 564.21 2, 564.49 1, 572.53 1, 592.45 1, 593.19 1, 608.52 1, 612.07 1, 613.08 1, ' +
            '619.27 1, 624.42 1, 645.59 1, 646.19 1, 745.25 1',
        Ru: '381.27 1, 381.73 1, 381.90 1, 382.21 1, 382.49 1, 383.18 1, 383.97 1, 384.67 1, 385.04 1, 385.65 1, 385.76 2, 386.27 1, 386.78 2, ' +
            '389.22 1, 390.91 1, 392.35 2, 392.59 2, 393.18 1, 394.56 1, 395.02 1, 397.84 1, 397.94 1, 398.49 1, 402.22 2, 402.38 1, 405.14 2, ' +
            '405.41 1, 406.84 1, 407.67 1, 408.06 3, 409.78 1, 411.27 2, 414.42 2, 414.57 1, 416.75 1, 419.76 1, 419.89 1, 419.99 3, 420.60 2, ' +
            '421.21 3, 421.44 1, 421.73 1, 423.03 1, 424.11 1, 424.31 1, 428.43 1, 429.59 1, 429.77 2, 430.76 1, 431.99 1, 434.21 1, 435.41 1, ' +
            '436.12 1, 437.22 2, 438.56 2, 439.04 2, 441.00 2, 443.97 1, 444.93 1, 446.00 1, 455.45 3, 458.44 2, 464.76 1, 470.95 2, 475.78 1, ' +
            '486.92 1, 490.31 1, 505.73 1, 513.66 1, 515.51 1, 517.10 1',
        Rh: '380.59 1, 380.68 2, 381.50 1, 381.65 1, 381.82 2, 382.23 3, 382.85 2, 383.39 2, 385.65 3, 387.00 1, 387.73 1, 393.42 2, 394.27 1, ' +
            '395.89 3, 397.53 1, 399.62 1, 408.28 1, 412.17 2, 412.89 2, 413.53 2, 419.65 1, 421.11 3, 428.87 2, 437.48 3',
        Pd: '389.42 3, 421.30 3',
        Ag: '381.09 2, 384.07 1, 398.16 1, 405.55 1, 421.10 1, 421.28 1, 466.85 1, 487.41 1, 520.91 3, 546.55 3, 547.16 1, 566.73 1',
        Cd: '467.81 1, 479.99 2, 508.58 3, 609.91 2, 643.85 3, 734.57 3',
        In: '410.18 3, 451.13 3',
        Sn: '380.10 3, 452.47 3, 563.17 2, 605.47 2, 606.91 2, 614.96 2, 615.44 1',
        Sb: '+ 471.17 2, 556.81 3, 563.98 2, 600.56 3, 607.97 2, 613.00 3',
        Te: '+ 400.65 2, 416.98 3, 426.11 3, 436.40 3, 447.86 3, 455.78 3, 464.11 3, 465.44 3, 468.69 3, 469.64 3, 470.65 3, 476.61 3, 478.49 3, ' +
            '482.71 3, 483.13 3, 484.29 3, 486.51 3, 486.62 3, 557.63 3, 564.93 3, 566.62 3, 570.81 3, 575.59 3, 597.47 3',
        I: '511.93 3, 661.97 3, 740.21 3, 746.90 3',
        Xe: '473.42 3, 479.26 2, 480.70 3, 482.97 3, 484.33 3, 491.65 3, 492.32 3, 502.83 2, 539.28 2, 556.66 2, 569.58 2, 582.39 3, 582.48 2, ' +
            '587.50 2, 589.50 2, 593.42 2, 617.83 2, 617.97 2, 618.24 3, 619.83 2, 628.60 2, 631.81 3, 646.97 3, 647.28 2, 648.78 2, 649.87 2, ' +
            '650.42 2, 653.32 2, 659.56 2, 666.89 2, 672.80 2, 682.73 2, 687.21 2, 688.22 3, 692.55 2, 697.62 2, 711.96 3, 738.60 2, 739.38 2',
        Cs: '387.62 2, 388.86 1, 455.53 2, 459.32 1, 584.51 1, 601.05 1, 621.31 2, 635.46 1, 658.65 1, 672.33 3, 687.04 1, 697.33 3, 698.35 2, ' +
            '722.85 2, 728.00 2',
        Ba: '455.40 3, 493.41 2, 553.55 3, 577.76 1, 599.71 1, 611.08 2, 614.17 2, 649.69 2, 649.88 2, 652.73 1, 659.53 1, 667.53 1, 669.38 1, ' +
            '705.99 2, 728.03 2',
        La: '392.76 2, 401.54 2, 406.03 2, 408.96 2, 418.73 2, 428.03 2, 442.39 2, 456.79 2, 457.00 2, 494.98 3, 505.06 2, 505.65 2, 510.62 2, ' +
            '514.54 3, 515.87 2, 517.73 3, 521.19 3, 523.43 3, 525.35 3, 527.12 3, 545.51 3, 550.13 3, 564.83 2, 574.07 2, 576.93 3, 578.92 2, ' +
            '579.13 3, 593.06 2, 624.99 3, 639.42 3, 641.10 2, 645.60 2, 654.32 2, 657.85 2, 733.42 2',
        Ce: '400.52 2, 405.58 2, 450.64 2, 463.23 3, 465.05 2, 482.25 2, 484.78 2, 494.34 2, 499.46 2, 500.91 3, 504.08 2, 507.18 2, 511.27 2, ' +
            '512.96 3, 515.00 2, 515.97 3, 516.15 3, 517.46 3, 521.19 3, 522.35 3, 522.97 3, 524.59 3, 529.66 2, 532.81 2, 539.76 2, 542.04 2, ' +
            '544.92 2, 555.63 2, 556.50 3, 556.60 2, 559.59 2, 560.13 3, 565.51 3, 567.00 3, 567.78 2, 569.29 2, 569.70 3, 569.92 3, 571.90 3, ' +
            '577.31 2, 578.81 2, 581.29 2, 586.25 2, 592.63 2, 592.83 2, 593.77 2, 594.09 3, 600.19 2, 600.59 2, 600.68 2, 601.34 2, 602.42 2, ' +
            '604.74 2, 605.80 1, 606.95 1, 607.20 1, 609.32 1, 612.37 1, 618.62 1, 620.90 1, 622.89 1, 629.56 1, 631.00 1, 643.01 1, 645.80 1, ' +
            '655.56 1, 670.43 1, 692.48 1, 698.60 1, 725.27 1, 739.78 1',
        Pr: '395.94 3, 463.23 2, 463.57 2, 463.96 3, 468.78 3, 469.58 3, 470.95 2, 473.07 3, 473.67 3, 474.42 2, 490.70 2, 491.40 2, 492.46 3, ' +
            '493.60 2, 493.97 3, 494.03 2, 495.14 3, 497.57 2, 501.86 2, 501.98 3, 502.70 3, 503.34 2, 504.38 2, 504.55 3, 505.34 2, 508.71 3, ' +
            '513.34 3, 513.98 2, 519.44 2, 522.80 2, 553.12 1, 556.21 1, 566.16 1, 566.85 2, 570.76 2, 577.93 2, 583.51 1, 587.47 1, 587.81 1, ' +
            '587.90 1, 588.47 1, 592.08 1, 598.61 1, 598.71 1, 604.93 1, 605.51 2, 614.82 2, 632.24 1, 635.90 1, 639.32 1, 641.12 1, 648.65 1, ' +
            '649.17 1, 661.67 1, 674.71 1, 679.86 1',
        Nd: '452.73 2, 455.97 2, 458.66 2, 460.38 2, 460.99 2, 462.19 3, 462.80 2, 463.42 3, 464.11 3, 464.64 2, 464.97 3, 465.47 2, 468.34 3, ' +
            '468.40 2, 469.04 2, 469.64 2, 470.70 2, 471.90 3, 473.18 2, 477.95 2, 486.67 2, 488.38 3, 489.11 3, 489.69 3, 490.18 2, 491.34 2, ' +
            '492.45 3, 494.48 3, 495.48 3, 521.32 2, 529.17 2, 562.05 2, 567.60 2, 572.93 2',
        Pm: '436.96 2, 438.85 2, 441.25 1, 448.16 2, 452.77 2, 457.53 2, 459.75 1, 460.02 1, 460.57 2, 460.99 1, 461.70 2, 461.98 1, 462.16 1, ' +
            '462.37 2, 462.44 1, 462.53 2, 463.34 2, 464.34 2, 464.70 1, 465.34 2, 466.08 1, 466.35 2, 466.52 2, 467.12 2, 467.81 2, 468.29 2, ' +
            '469.68 1, 472.84 2, 473.43 2, 474.51 2, 475.77 2, 475.90 3, 476.26 3, 477.35 2, 478.13 2, 479.90 3, 480.14 3, 480.95 2, 481.19 2, ' +
            '483.77 2, 486.07 3, 486.57 2, 487.24 2, 488.70 1, 489.25 2, 493.30 2, 495.95 3, 499.71 3, 505.83 3, 509.48 2, 510.08 2, 512.73 3, ' +
            '514.63 3, 595.64 2, 604.34 1, 606.91 1, 610.02 2, 615.18 2, 622.96 1, 628.61 1, 630.83 1, 632.38 1, 639.03 1, 643.19 3, 651.73 1, ' +
            '652.04 2, 654.22 1, 659.81 2, 659.87 1, 660.64 1, 662.52 1, 664.98 1, 666.17 1, 666.75 1, 667.75 1, 668.56 1, 670.03 1, 671.47 1, ' +
            '671.73 1, 672.07 1, 672.75 1, 674.37 1, 674.99 1, 675.05 1, 683.33 1',
        Sm: '383.45 2, 385.33 2, 385.46 2, 385.87 2, 395.19 2, 397.47 2, 399.00 2, 428.22 2, 428.28 2, 429.67 3, 431.95 2, 433.00 2, 433.61 3, ' +
            '436.29 2, 438.04 2, 439.73 2, 440.12 2, 440.31 2, 441.16 2, 441.93 2, 442.97 2, 444.18 2, 444.52 2, 447.09 3, 449.91 2, 453.38 2, ' +
            '458.17 2, 464.54 2, 464.95 2, 466.36 2, 467.07 2, 468.87 2, 471.61 3, 472.84 3, 476.03 3, 478.31 2, 478.59 2, 484.17 3, 488.40 3, ' +
            '491.04 2, 491.90 2, 504.43 2, 507.12 2, 511.72 2, 512.21 2, 517.54 2, 527.14 2',
        Eu: '459.40 3, 462.72 3, 466.19 3, 521.51 1, 535.76 1, 583.10 1',
        Gd: '384.33 2, 386.70 2, 390.56 1, 393.48 2, 394.18 1, 394.26 1, 394.55 2, 395.34 1, 396.63 1, 396.90 2, 397.27 1, 397.93 2, 398.78 1, ' +
            '399.27 1, 400.83 1, 401.77 1, 402.31 2, 402.81 2, 403.09 2, 403.35 2, 403.54 1, 404.37 1, 404.50 2, 405.36 3, 405.47 2, 405.82 3, ' +
            '405.99 1, 406.83 1, 407.87 3, 408.37 1, 409.04 1, 409.27 2, 410.03 1, 413.42 2, 417.55 3, 419.08 3, 419.16 2, 422.50 1, 422.59 3, ' +
            '426.01 2, 426.21 2, 426.66 1, 428.58 1, 429.93 1, 430.63 2, 431.38 2, 431.44 1, 432.05 1, 432.12 1, 432.57 2, 432.71 2, 432.96 1, ' +
            '434.65 3, 437.38 2, 440.19 2, 440.31 1, 441.12 1, 441.42 2, 441.47 2, 442.24 2, 443.06 2, 446.71 1, 447.41 2, 447.61 2, 449.71 1, ' +
            '450.62 1, 451.97 2, 453.78 2, 458.13 1, 458.31 1, 459.89 1, 461.45 1, 463.66 1, 465.35 1, 468.33 1, 469.43 2, 469.74 1, 474.36 1, ' +
            '475.87 1, 476.72 1, 482.17 1, 501.50 2, 510.34 2, 515.58 2, 519.78 1, 525.12 1, 569.62 1, 611.41 1',
        Tb: '383.03 3, 390.13 3, 403.23 2, 406.16 2, 420.37 2, 426.63 2, 431.88 3, 432.22 2, 432.65 3, 433.21 2, 433.65 2, 433.76 2, 433.84 3, ' +
            '434.06 2, 435.68 2, 449.31 1, 478.68 1, 535.49 1',
        Dy: '386.88 1, 404.60 3, 410.39 1, 414.61 1, 416.80 2, 418.37 1, 418.68 3, 419.16 1, 419.48 2, 419.80 1, 421.17 3, 421.32 1, 421.52 2, ' +
            '421.81 2, 422.11 2, 422.52 2, 458.94 1, 461.23 1',
        Ho: '381.19 1, 386.26 1, 389.04 1, 395.57 1, 395.97 1, 404.08 2, 405.39 3, 406.81 1, 410.38 3, 410.86 2, 412.02 2, 412.56 2, 412.72 3, ' +
            '413.62 2, 416.30 3, 417.32 2, 419.44 1, 422.71 2, 425.44 2, 426.41 1, 435.07 2',
        Er: '381.03 1, 385.59 1, 386.29 3, 389.27 2, 390.54 1, 393.70 2, 394.44 2, 397.30 2, 397.36 2, 397.70 1, 398.23 1, 398.77 1, 400.80 3, ' +
            '401.25 1, 402.05 2, 404.70 1, 408.76 2, 409.81 1, 415.11 3, 419.07 1, 421.84 1, 428.66 1, 440.93 1, 460.66 1',
        Tm: '380.77 1, 388.31 3, 388.73 3, 391.65 2, 394.93 2, 409.42 3, 410.58 3, 413.83 1, 418.76 3, 420.37 3, 435.99 2, 438.64 1, 473.33 1, ' +
            '530.71 1, 567.58 1',
        Yb: '398.80 3, 399.09 1, 555.65 1',
        Lu: '384.12 3, 396.85 2, 405.44 2, 412.47 3, 415.41 2, 451.86 3, 465.80 2, 490.49 2, 500.11 2, 513.51 3, 540.26 2, 573.65 2, 600.45 3, ' +
            '605.50 2',
        Hf: '380.04 3, 381.18 2, 382.07 3, 383.00 2, 384.92 3, 385.83 2, 386.09 2, 389.99 3, 393.14 2, 395.18 2, 406.28 2, 417.43 3, 429.48 2, ' +
            '435.63 2, 456.59 2, 459.88 2, 462.09 2, 480.05 2, 518.19 2, 555.06 2, 555.21 2, 713.18 2, 723.71 3, 724.09 2',
        Ta: '406.14 3, 406.79 3, 420.59 3, 451.10 3, 457.43 3, 461.95 3, 468.19 3, 515.66 3, 587.74 3, 594.40 3, 604.54 3, 643.08 3, 645.04 3, ' +
            '648.54 3, 686.62 3',
        W: '381.75 2, 383.51 1, 384.62 1, 386.80 2, 388.14 1, 400.88 3, 401.52 1, 404.56 1, 407.00 1, 407.44 3, 410.27 1, 413.75 1, 417.12 1, ' +
            '424.44 1, 426.94 2, 429.46 3, 430.21 2, 448.42 1, 465.99 1, 468.05 1, 484.38 1, 505.33 1, 522.47 1',
        Re: '392.99 1, 413.64 2, 414.44 2, 422.11 2, 422.75 3, 435.87 1, 451.33 3, 452.27 1, 488.91 3, 527.10 2, 527.56 2, 583.43 1',
        Os: '387.68 2, 396.36 2, 397.72 2, 406.67 2, 411.20 2, 413.58 3, 417.32 2, 417.56 1, 421.19 2, 426.09 3, 429.39 1, 431.14 1, 439.49 1, ' +
            '442.05 3, 455.04 1, 479.40 2, 520.26 1, 552.35 1',
        Ir: '380.01 3, 397.63 2, 426.81 1, 431.15 1',
        Pt: '380.11 1, 381.87 3, 386.84 1, 387.57 1, 389.87 1, 390.07 1, 391.09 1, 392.30 2, 392.53 1, 396.64 2, 409.23 1, 411.87 2, 416.45 2, ' +
            '419.24 1, 444.25 2, 449.88 1, 455.24 1, 505.95 1, 522.77 1, 530.10 1, 584.01 1, 676.00 1, 684.26 2, 711.37 1',
        Au: '389.79 3, 390.94 2, 404.09 3, 406.51 3, 431.51 2, 443.73 1, 448.83 2, 460.75 3, 479.26 3, 523.03 2, 583.74 2, 595.70 2, 627.82 3, ' +
            '656.27 1',
        Hg: '404.66 2, 433.92 1, 434.75 1, 435.83 3, 546.07 3, 576.96 1, 579.07 1',
        Tl: '535.05 3',
        Pb: '405.78 3',
        Bi: '472.25 3',
        Po: '417.05 3, 449.32 3',
        Rn: '430.78 2, 434.96 2, 445.93 2, 450.85 2, 457.77 2, 460.94 2, 472.18 1, 662.72 1, 675.18 1, 705.54 3, 726.81 2, 729.10 1, 745.00 3',
        Fr: '422.57 3, 432.54 3, 717.99 3',
        Ra: '482.59 3, 540.02 2, 540.68 2, 555.59 2, 566.08 3, 620.03 2, 644.62 2, 648.73 2, 698.02 2, 711.85 2, 714.12 3, 722.52 2',
        Ac: '388.56 2, 403.46 2, 406.31 2, 418.00 3, 418.31 3, 419.44 2, 438.45 2, 439.67 2, 446.27 2, 461.39 2, 470.58 2, 471.66 3, 525.82 2, ' +
            '556.93 2, 635.99 2, 669.13 2, 729.04 2',
        Th: '380.31 3, 382.51 1, 382.84 3, 383.66 1, 384.69 2, 385.21 1, 386.97 2, 387.54 2, 387.96 2, 388.69 2, 389.54 3, 390.31 2, 391.19 1, ' +
            '391.90 2, 392.51 2, 393.29 2, 395.93 2, 396.74 3, 397.22 2, 398.01 2, 399.17 2, 400.82 2, 400.91 2, 401.25 3, 402.70 2, 403.08 2, ' +
            '403.60 2, 404.83 1, 405.09 2, 405.93 2, 406.34 2, 406.95 2, 407.55 1, 408.14 2, 408.54 1, 408.87 1, 410.03 2, 411.28 2, 411.58 3, ' +
            '412.74 2, 413.10 2, 413.41 2, 415.85 2, 416.58 2, 419.30 2, 421.09 2, 422.01 1, 422.74 1, 423.55 1, 425.35 2, 425.63 1, 426.03 2, ' +
            '429.73 1, 429.98 1, 430.72 2, 431.53 1, 431.84 2, 433.73 2, 434.91 1, 435.45 1, 435.94 1, 436.59 1, 437.41 1, 439.30 1, 440.16 1, ' +
            '440.89 1, 445.80 1, 448.22 1, 449.89 2, 450.52 1, 452.12 1, 455.58 1, 457.10 1, 459.54 1, 467.61 1, 472.34 2, 506.80 2, 515.86 1, ' +
            '516.07 1, 519.92 2, 523.12 2, 534.36 1, 558.70 1, 576.06 1, 616.98 1, 618.26 1, 645.73 1, 646.26 1, 653.13 1, 698.97 1, 716.89 1, ' +
            '720.80 1',
        Pa: '387.33 2, 393.18 2, 398.22 3, 411.76 2, 440.08 2, 443.61 2, 462.82 2, 482.03 2, 486.15 2, 603.58 2, 616.26 2, 621.63 2, 635.86 2, ' +
            '637.92 2, 643.90 2, 679.27 2, 694.57 3, 696.01 2, 696.18 2, 699.27 2, 707.63 2, 710.09 2, 711.49 3, 717.15 2, 722.71 2, 731.88 2, ' +
            '736.83 3, 747.19 2, 749.31 3',
        U: '380.89 2, 381.20 3, 383.96 3, 385.42 2, 387.10 3, 389.41 2, 390.65 2, 392.62 2, 392.67 2, 394.38 3, 396.42 2, 400.52 2, 404.27 3, ' +
            '404.76 2, 415.40 3, 415.66 2, 422.24 2, 435.57 2, 436.21 2, 439.36 2, 475.68 1, 502.74 1, 591.54 1, 682.69 1',
        Np: '398.69 2, 504.47 2, 587.80 2, 693.03 2, 697.21 3',
        Pu: '380.59 3, 381.14 3, 383.55 3, 385.10 3, 385.18 2, 387.85 3, 389.59 2, 413.30 3, 414.00 3, 415.11 3, 420.65 3, 420.82 3, 426.19 3, ' +
            '440.49 3, 571.24 3, 619.28 3, 630.47 3, 644.97 3, 648.67 3, 648.89 3, 653.53 3, 654.42 3, 660.89 3, 688.77 3, 725.80 3',
        Am: '426.56 1, 428.93 3, 466.28 3, 468.17 2, 470.68 1, 540.26 1, 542.47 1, 559.81 1, 605.46 3, 640.51 1, 654.42 1, 695.56 1',
        Cm: '381.63 3, 382.51 3, 383.33 3, 383.76 3, 384.20 3, 384.99 3, 385.41 3, 390.03 3, 393.67 3, 394.20 3, 394.41 3, 394.87 3, 395.34 3, ' +
            '396.48 3, 399.51 3, 401.62 3, 403.18 3, 404.83 3, 404.97 3, 411.33 3, 412.97 3, 421.16 3, 426.64 3, 429.30 3, 433.08 3, 434.57 3, ' +
            '444.78 3, 445.92 3, 460.84 3, 584.61 3, 595.24 3, 605.89 3, 624.34 3, 637.67 3, 655.44 3, 664.02 3, 668.69 3, 670.69 3, 672.67 3, ' +
            '679.31 3, 716.27 3',
        Bk: '380.23 3, 382.52 3, 383.35 3, 384.22 3, 384.66 3, 384.76 3, 385.50 3, 388.01 3, 388.26 3, 392.14 3, 432.96 3, 435.15 3, 436.36 3, ' +
            '442.30 3, 446.65 3, 476.54 3, 511.82 3, 517.06 3, 519.75 3, 521.25 3, 527.19 3, 539.20 3, 539.42 3, 544.96 3, 546.75 3, 548.46 3, ' +
            '553.79 3, 555.68 3, 558.12 3, 565.65 3, 565.90 3, 570.22 3, 591.07 3, 704.09 3, 710.79 3, 725.25 3, 730.69 3, 739.43 3',
        Cf: '403.54 3, 409.91 3, 424.24 3, 432.90 3, 433.52 3, 517.40 3, 517.91 3, 521.92 3, 527.90 3, 532.01 3, 533.91 3, 540.89 3, 572.61 3, ' +
            '662.28 3, 663.13 3, 667.79 3, 689.46 3, 707.45 3, 730.79 3',
        Es: '380.15 3, 393.08 2, 417.69 1, 516.17 3, 520.44 3, 561.55 2'
    };

    // of an element with no line where they are seen, its strongest, nm, ultraviolet: astatine's, the only two NIST has
    var UNSEEN = { At: [216.225, 224.401] };

    // the lines of an element by its symbol, [{ nm, k }] from violet to red, k how strong, 1 to 3, and .ion true of its
    // ion's; of one with none seen, [] with .unseen its strongest elsewhere; null of one with none known
    function spectrum(s) {
        var lines;
        if (UNSEEN.hasOwnProperty(s)) return Object.assign([], { unseen: UNSEEN[s].slice() });
        if (!SPECTRA.hasOwnProperty(s)) return null;
        lines = SPECTRA[s].replace(/^\+ /, '').split(', ').map(function (l) {
            l = l.split(' ');
            return { nm: +l[0], k: +l[1] };
        });
        lines.ion = /^\+ /.test(SPECTRA[s]);
        return lines;
    }

    root.CalcChem = {
        elements: elements, bySymbol: bySymbol, categories: CATEGORIES, avogadro: AVOGADRO,
        parse: parse, molarMass: molarMass, html: html, plain: plain,
        balance: balance, amounts: amounts, readAmounts: readAmounts, empirical: empirical, solubility: solubility, solubilityTable: solubilityTable, ions: ions, findIon: findIon,
        oxidation: oxidation, names: names, particles: particles, spectrum: spectrum,
        readGases: readGases, waterVapour: waterVapour, waterBoils: waterBoils, isGas: isGas, gasOf: gasOf, gasesNear: gasesNear
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcChem;
    }
})(typeof window !== 'undefined' ? window : this);
