// the copyright line always shows the current year
document.querySelectorAll('.year').forEach((el) => {
    el.textContent = new Date().getFullYear();
});

// Two tabs: the options, and the guide to the calculator. The page always opens on
// the options
const tabs = document.querySelectorAll('.tab');
const showTab = (name) => {
    tabs.forEach((tab) => tab.setAttribute('aria-selected', tab.dataset.tabFor === name));
    document.querySelector('.tabs').parentElement.dataset.show = name;
};

showTab('options');
tabs.forEach((tab) => tab.addEventListener('click', () => showTab(tab.dataset.tabFor)));

// The number format of the results. It is kept where the calculator reads it when
// it opens, and the calculator gets a storage event, which app.js sends within this
// page, so it changes at once
const notation = document.getElementById('format-notation');
const places = document.getElementById('format-places');
const group = document.getElementById('format-group');
const icon = document.getElementById('format-icon');

// Auto: as many digits as each result needs, as a TI's Float
places.add(new Option('Auto', 'auto'));
for (let n = 0; n <= 9; n++) {
    places.add(new Option(n + (n === 1 ? ' decimal place' : ' decimal places'), n));
}

// kept as the calculator reads it: true for commas, as it was while they were the only ones
const groupOf = { '': false, comma: true, space: 'space', dot: 'dot', spacecomma: 'spacecomma' };
const groupIn = (f) => (/^(space|dot|spacecomma)$/.test(f.group) ? f.group : f.group ? 'comma' : '');

const placesOf = (f) => (Number.isInteger(f.places) && f.places >= 0 && f.places <= 9 ? String(f.places) : 'auto');

const readFormat = () => {
    try {
        return JSON.parse(localStorage.getItem('format')) || {};
    } catch (e) {
        return {};
    }
};

const shown1500 = (f) => {
    const s = CalcEngine.format(1500, f) || '1500';

    return f.group ? CalcEngine.group(s, f.group) : s;
};

const showFormat = () => {
    const f = { notation: notation.value, places: places.value === 'auto' ? 'auto' : +places.value, group: groupOf[group.value] };
    places.disabled = f.notation === 'norm';
    // the icon shows 1,500 the way the chosen format writes it
    icon.textContent = shown1500(f);
    return f;
};

const format = readFormat();
notation.value = /^(fix|sci|eng)$/.test(format.notation) ? format.notation : 'norm';
places.value = placesOf(format);
group.value = groupIn(format);
showFormat();

[notation, places, group].forEach((el) => {
    el.addEventListener('change', () => {
        try {
            localStorage.setItem('format', JSON.stringify(showFormat()));
        } catch (e) { }
    });
});

// MODE on the calculator goes on to the next notation: the choice here follows it
window.addEventListener('storage', (e) => {
    if (e.key !== 'format') return;
    const f = readFormat();
    notation.value = /^(fix|sci|eng)$/.test(f.notation) ? f.notation : 'norm';
    places.value = placesOf(f);
    group.value = groupIn(f);
    showFormat();
});

// A row of choices, as the tabs: the one chosen, and choosing one
const chosen = (group) => group.querySelector('input:checked').value;
const choose = (group, value) => {
    group.querySelector(`input[value="${value}"]`).checked = true;
};

// The mode, Standard or Advanced: kept where app.js reads it, which follows it at once, as it does a change in
// another tab of the website. Standard until Advanced is chosen
const openMode = document.getElementById('open-mode');
const readMode = () => {
    try {
        return localStorage.getItem('openMode') === 'advanced' ? 'advanced' : 'standard';
    } catch (e) {
        return 'standard';
    }
};

choose(openMode, readMode());
openMode.addEventListener('change', () => {
    try {
        localStorage.setItem('openMode', chosen(openMode));
    } catch (e) { }
});
window.addEventListener('storage', (e) => {
    if (e.key === 'openMode') choose(openMode, readMode());
});

// The formulas, the converter, the statistics, the graph, the solver, the numbers, the chemistry and the physics: a button on the display for each
// while it is turned on. All of them start on; an open calculator gets the change as a
// storage event
[['panel-fx', 'fxOn', true], ['panel-conv', 'convOn', true], ['panel-stats', 'statsOn', true], ['panel-graph', 'graphOn', true],
    ['panel-solve', 'solveOn', true], ['panel-numbers', 'numbersOn', true], ['panel-chem', 'chemOn', true], ['panel-phys', 'physOn', true]].forEach(([id, key, on]) => {
    const box = document.getElementById(id);

    box.checked = on;
    try {
        const stored = JSON.parse(localStorage.getItem(key));
        if (typeof stored === 'boolean') box.checked = stored;
    } catch (e) { }
    box.addEventListener('change', () => {
        try {
            localStorage.setItem(key, JSON.stringify(box.checked));
        } catch (e) { }
    });
    // turned on or off in another tab of the website
    window.addEventListener('storage', (e) => {
        if (e.key !== key) return;
        try {
            const stored = JSON.parse(e.newValue);
            box.checked = typeof stored === 'boolean' ? stored : on;
        } catch (e) { }
    });
});
