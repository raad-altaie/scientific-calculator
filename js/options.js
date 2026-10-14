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

// the launch button opens the detached window, like the list of the toolbar icon does
document.getElementById('launch-detached').addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'open-detached' });
});

// The button on every page is on while the extension holds this access, as in
// background.js. The browser asks for it when the switch is turned on; background.js then
// puts the button on the pages, and gives the access back when the switch is turned off
const pageIcon = document.getElementById('page-icon');
const pageIconAccess = { permissions: ['scripting', 'storage'], origins: ['http://*/*', 'https://*/*'] };

// The browser does not put the button on its own pages, so this page adds it itself
const pageIconId = 'scientific-calculator-page-icon'; // as in page-icon.js

const showPageIconOption = () => {
    chrome.permissions.contains(pageIconAccess, (granted) => {
        const button = document.getElementById(pageIconId);

        pageIcon.checked = granted;
        if (granted && !button) {
            const script = document.createElement('script');

            script.src = 'js/page-icon.js';
            script.addEventListener('load', () => script.remove());
            document.body.appendChild(script);
        } else if (!granted && button) {
            button.remove();
        }
    });
};

pageIcon.addEventListener('change', () => {
    if (pageIcon.checked) {
        // the answer can be no: the switch then shows that
        chrome.permissions.request(pageIconAccess, showPageIconOption);
    } else {
        chrome.runtime.sendMessage({ command: 'turn-off-page-icon' });
    }
});

// the access can also be changed in the settings of the browser
chrome.permissions.onAdded.addListener(showPageIconOption);
chrome.permissions.onRemoved.addListener(showPageIconOption);
showPageIconOption();

// The number format of the results. It is kept where the calculator reads it
// when it opens; an open calculator gets the change as a storage event
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
        localStorage.setItem('format', JSON.stringify(showFormat()));
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
    localStorage.setItem('fnOrder', JSON.stringify(fnOrder.value));
});

// The formulas, the converter, the statistics, the graph and the solver: a button on the display for each
// while it is turned on. All of them start on; an open calculator gets the change as a
// storage event
[['panel-fx', 'fxOn', true], ['panel-conv', 'convOn', true], ['panel-stats', 'statsOn', true], ['panel-graph', 'graphOn', true],
    ['panel-solve', 'solveOn', true]].forEach(([id, key, on]) => {
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
