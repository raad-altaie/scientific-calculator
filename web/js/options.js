// the copyright line always shows the current year
document.querySelectorAll('.year').forEach((el) => {
    el.textContent = new Date().getFullYear();
});

// Two tabs: the options, and the guide to the calculator. The page opens on the one
// last chosen
const tabs = document.querySelectorAll('.tab');
const showTab = (name) => {
    tabs.forEach((tab) => tab.setAttribute('aria-selected', tab.dataset.tabFor === name));
    document.querySelector('.tabs').parentElement.dataset.show = name;
};

try {
    showTab(localStorage.getItem('optionsTab') === 'guide' ? 'guide' : 'options');
} catch (e) {
    showTab('options');
}
tabs.forEach((tab) => tab.addEventListener('click', () => {
    showTab(tab.dataset.tabFor);
    try {
        localStorage.setItem('optionsTab', tab.dataset.tabFor);
    } catch (e) { }
}));

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

// The order of the function keys: √ 9, or 9 √. Without a choice yet it is the
// one the calculator starts with: √ 9, or 9 √ for who used it before the option came
const fnOrder = document.getElementById('fn-order');
const orderIcon = document.getElementById('order-icon');

const readOrder = () => {
    try {
        const order = JSON.parse(localStorage.getItem('fnOrder'));
        return order === 'first' || order === 'after' ? order : localStorage.getItem('calc') ? 'after' : 'first';
    } catch (e) {
        return 'first';
    }
};

// the icon shows the order chosen, its √ drawn as the calculator draws it
const showOrder = () => {
    const root = '<span class="root-sign">√</span>';

    orderIcon.innerHTML = fnOrder.value === 'first' ? root + '9' : '9' + root;
};

fnOrder.value = readOrder();
showOrder();
fnOrder.addEventListener('change', () => {
    showOrder();
    try {
        localStorage.setItem('fnOrder', JSON.stringify(fnOrder.value));
    } catch (e) { }
});

// The statistics and the formulas: a button on the display for each while it is
// turned on. The formulas start on, the statistics off; an open calculator gets the
// change as a storage event
[['panel-stats', 'statsOn', false], ['panel-fx', 'fxOn', true]].forEach(([id, key, on]) => {
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
});
