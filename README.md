# Scientific Calculator

A scientific calculator for your browser: light, fast and it works offline. It runs as a Chrome extension (open it with the toolbar icon or `Alt+S`) and as a website version in `web/`.

<div align="center"><img src="screenshot.png" alt="Scientific Calculator" height="700" /></div>

# <p align="left"> <b>[check it out](https://goo.gl/dvrvUY) · [try the web version](https://raad.dev/calculator/) </b></p>

## What it does

**Calculating**
- Real scientific-calculator order of operations (PEMDAS): `1+2×3 = 7`, and `1×(2+3) = 5`, then `= 25`.
- The display shows the whole equation while you type it; after `=` it shows the result with the finished equation on a small line above.
- Parentheses nested up to 29 levels deep; no need to close them before `=`.
- `DEL` (or Backspace) takes back the last key; `C` clears the number; the cursor keys or a click fix a number or operator in the middle of an equation.
- Select part of an equation, then type or paste to replace it, or `DEL` to remove it.
- History of past calculations: insert or copy the equation or the result, or delete one.
- Memory keys (`mc`, `m+`, `m-`, `mr`) and `Ans` for the last answer.
- Everything is remembered when you close it, including the equation, memory and settings.

**Functions**
- Powers and roots: `x²`, `x³`, `yˣ`, `√`, `ˣ√y`, `1/x`, `abs`, `x!`.
- Trigonometry: `sin`, `cos`, `tan`, their inverses, and the hyperbolic `sinh`, `cosh`, `tanh` and inverses.
- Logarithms and exponentials: `log`, `ln`, `log₂`, log to any base, `eˣ`, `2ˣ`, `10ˣ`; constants `π` and `e`.
- Combinatorics and number theory: `nCr`, `nPr`, `gcd`, `lcm`, `mod`, `%`, `Rand`, `EE` for scientific entry.
- Angle units: Deg, Rad and Grad. `°′″` shows results as degrees, minutes and seconds, and `12°30′15″` can be pasted.
- Fraction mode (`a/b`) draws each division as a fraction and shows results like 0.75 as 3/4.
- Number format: Fix, Sci or Eng notation, Auto or 0 to 9 decimal places, and thousands separators.
- Function keys can go before the number (`√ 9`) or after it (`9 √`).

**Panels** (each can be turned on or off in the options)
- **Formulas and constants** (`fx`): search well-known formulas of algebra, geometry, trigonometry, physics, electricity, chemistry, statistics, money and everyday life, fill in the letters and the equation goes into the display. Constants of math and science (CODATA 2022) go in with a click.
- **Converter**: length, area, volume, mass, temperature, speed, time, data, pressure, energy, power, angle and fuel economy; the value is shown in every other unit of its kind.
- **Statistics**: type or paste a list (a spreadsheet column works too) for count, sum, sum of squares, mean, standard deviation (σ and s), minimum, median and maximum.

**Keyboard, copy and paste**
- Full keyboard support for every button; a `h` hold key gives the second function (`h`, `s` = `sinh`).
- Ctrl+C / Ctrl+V and a right-click menu per area. You can paste a whole equation such as `2 + 3 × sin(30)` or `sqrt(16) + 2^3`; `1,234.5`, `1.234,5` and `1 234,5` are all read as 1234.5, and a currency is left out: `$1,200` or `5 USD` is the number alone.

**The extension**
- Opens from the toolbar icon or `Alt+S`.
- **Detached Mode**: the calculator in its own window that stays open and resizes with it.
- **Calculator on every page** (optional): a small button on the side of every page that opens Detached Mode. It asks for website access only when turned on, and reads nothing from the pages.
- No permission is needed to read your browser data.

**Precision**: about 15 significant digits (IEEE 754 doubles), shown to 13 so that `0.1 + 0.2` is `0.3`.

# License

MIT License

Copyright (c) Raad Altaie

## Website version

`web/` is a standalone copy of the calculator for the web: the calculator on the left, the options on the right. On a screen narrower than 1100px (phones and iPads) the options stay hidden until you click the `?` on the calculator. Host the folder as-is on any static host, or run `python3 -m http.server` inside it. It does not need the extension.

After changing the calculator in the extension, run `scripts/sync-web.sh` to copy it into `web/`. What the web changes (base font size, shadow) is kept in `web/css/calc-overrides.css`, so the copy never needs hand edits.
