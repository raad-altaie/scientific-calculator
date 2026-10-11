// the copyright line always shows the current year
document.querySelectorAll('.year').forEach((el) => {
    el.textContent = new Date().getFullYear();
});

// The number format of the results. It is kept where the calculator reads it when
// it opens, and the calculator's frame gets a storage event, so it changes at once
const notation = document.getElementById('format-notation');
const places = document.getElementById('format-places');
const group = document.getElementById('format-group');
const icon = document.getElementById('format-icon');

for (let n = 0; n <= 9; n++) {
    places.add(new Option(n + (n === 1 ? ' decimal place' : ' decimal places'), n));
}

const readFormat = () => {
    try {
        return JSON.parse(localStorage.getItem('format')) || {};
    } catch (e) {
        return {};
    }
};

const shown1500 = (f) => {
    const s = CalcEngine.format(1500, f) || '1500';

    return f.group ? CalcEngine.group(s) : s;
};

const showFormat = () => {
    const f = { notation: notation.value, places: +places.value, group: group.checked };
    places.disabled = f.notation === 'norm';
    // the icon shows 1,500 the way the chosen format writes it
    icon.textContent = shown1500(f);
    return f;
};

const format = readFormat();
notation.value = /^(fix|sci|eng)$/.test(format.notation) ? format.notation : 'norm';
places.value = Number.isInteger(format.places) ? format.places : 2;
group.checked = !!format.group;
showFormat();

[notation, places, group].forEach((el) => {
    el.addEventListener('change', () => {
        try {
            localStorage.setItem('format', JSON.stringify(showFormat()));
        } catch (e) { }
    });
});
