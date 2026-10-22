// in a frame over a tool's own window (popup.js): laid out as the website has the options over a tool (options.css)
if (window.top !== window) {
    document.documentElement.classList.add('embedded');
    // the guide in one box, as the options are in theirs: shown and hidden as its parts were (data-tab)
    const guideParts = document.querySelectorAll('.wrapper > [data-tab="guide"]');
    const guideBox = document.createElement('div');

    guideBox.className = 'guide-box';
    guideBox.dataset.tab = 'guide';
    guideParts[0].before(guideBox);
    guideBox.append(...guideParts);
}

// the copyright line always shows the current year
document.querySelectorAll('.year').forEach((el) => {
    el.textContent = new Date().getFullYear();
});

// Two tabs: the options, and the guide to the calculator. The page opens on the options,
// or on the guide with #guide after it, as Guide on the rail of a tool popped out opens it (popup.js)
const tabs = document.querySelectorAll('.tab');
const showTab = (name) => {
    tabs.forEach((tab) => tab.setAttribute('aria-selected', tab.dataset.tabFor === name));
    document.querySelector('.tabs').parentElement.dataset.show = name;
};

const showHashTab = () => showTab(location.hash === '#guide' ? 'guide' : 'options');

showHashTab();
window.addEventListener('hashchange', showHashTab);
tabs.forEach((tab) => tab.addEventListener('click', () => showTab(tab.dataset.tabFor)));

// the launch button opens the mode chosen: the popup, or the detached window
document.getElementById('launch-detached').addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'launch' });
});

// A row of choices, as the tabs: the one chosen, and choosing one
const chosen = (group) => group.querySelector('input:checked').value;
const choose = (group, value) => {
    group.querySelector(`input[value="${value}"]`).checked = true;
};

// What the toolbar icon opens, the popup or the detached window, or with Advanced the calculator popped
// out in the big window, whose pop in goes to the detached window: kept in chrome.storage.local, where background.js reads it
// and changes what the icon does. Fixed until another is chosen
const openMode = document.getElementById('open-mode');
const modeStore = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

const showOpenMode = () => {
    if (!modeStore) return;
    modeStore.get('openMode', ({ openMode: mode } = {}) => {
        // an administrator who turns Detached Mode off leaves the popup
        choose(openMode, (mode === 'detached' || mode === 'advanced') && !CalcPolicy.off('detachedMode') ? mode : 'fixed');
    });
};

choose(openMode, 'fixed');
openMode.addEventListener('change', () => {
    if (modeStore) modeStore.set({ openMode: chosen(openMode) });
});
showOpenMode();
// chosen on another options page, as the one over a tool's own window (popup.js), or in the toolbar icon's menu
if (modeStore) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.openMode) showOpenMode();
    });
}

// The button on every page and the icons after the maths of the pages, two options: each is on while
// the extension holds this access and it is chosen, as background.js reads them. The browser asks for
// the access when the first is turned on; background.js then puts it on the pages, and gives the
// access back once both are off. The button is on unless kept off, as it was on with the access alone
// before the icons came; the icons are off until they are turned on
const pageIcon = document.getElementById('page-icon');
const pageMaths = document.getElementById('page-maths');
const pageAccess = { permissions: ['scripting'], origins: ['http://*/*', 'https://*/*'] };

// The browser does not put the button on its own pages, so this page adds it itself; not in the frame over a
// tool's own window, which is the calculator already
const pageIconId = 'scientific-calculator-page-icon'; // as in page/icon.js

const showPageOptions = () => {
    const show = (kept) => {
        const button = document.getElementById(pageIconId);
        const buttonOn = !!kept && kept.pageButtonOn !== false && !CalcPolicy.off('pageButton');

        pageIcon.checked = buttonOn;
        pageMaths.checked = !!kept && kept.pageMathsOn === true && !CalcPolicy.off('pageMaths');
        showKinds();
        showSites();
        if (buttonOn && !button && window.top === window) {
            const script = document.createElement('script');

            script.src = 'js/page/icon.js';
            script.addEventListener('load', () => script.remove());
            document.body.appendChild(script);
        } else if (!buttonOn && button) {
            button.remove();
        }
    };

    // without the access both are off, whatever was chosen
    chrome.permissions.contains(pageAccess, (granted) => {
        if (granted) chrome.storage.local.get(['pageButtonOn', 'pageMathsOn'], (kept) => show(kept || {}));
        else show(null);
    });
};

// What the instant answers are for, besides the sums: each feature, a panel of the calculator, on unless kept
// off in pageMathsFeatures, where background.js reads which to put into the pages. Listed while the instant
// answers are on; one an administrator turned off with its panel cannot be chosen, and says why
const kindList = document.getElementById('page-maths-kinds');
const kindBoxes = kindList.querySelectorAll('input:not(.always)'); // the sums are always on

function showKinds() {
    kindList.hidden = !pageMaths.checked;
    if (kindList.hidden) return;
    chrome.storage.local.get('pageMathsFeatures', (kept) => {
        const chosen = kept?.pageMathsFeatures || {};

        kindBoxes.forEach((box) => {
            const label = box.parentElement;
            const off = CalcPolicy.off(box.value);

            label.dataset.about = label.dataset.about || label.title;
            label.title = label.dataset.about + (off ? '. Turned off by your administrator.' : '');
            box.disabled = off;
            box.checked = !off && chosen[box.value] !== false;
        });
    });
}

kindBoxes.forEach((box) => box.addEventListener('change', () => {
    chrome.storage.local.get('pageMathsFeatures', (kept) => {
        chrome.storage.local.set({ pageMathsFeatures: Object.assign({}, kept?.pageMathsFeatures, { [box.value]: box.checked }) });
    });
}));
CalcPolicy.onChange(showKinds);

// The websites the instant answers are turned off on, with the menu of a right click on a page
// (background.js): listed under the option while it is on, each with a button that turns them on again
const siteList = document.getElementById('page-maths-sites');
const siteItems = document.getElementById('page-maths-off');

function showSites() {
    if (!pageMaths.checked) {
        siteList.hidden = true;
        return;
    }
    chrome.storage.local.get('pageMathsOff', (kept) => {
        const sites = Array.isArray(kept?.pageMathsOff) ? kept.pageMathsOff : [];

        siteItems.replaceChildren(...sites.map((site) => {
            const item = document.createElement('li');
            const name = document.createElement('span');
            const on = document.createElement('button');

            name.textContent = site;
            on.type = 'button';
            on.textContent = 'Turn on';
            on.title = 'Instant answers on ' + site;
            on.addEventListener('click', () => chrome.storage.local.set({ pageMathsOff: sites.filter((other) => other !== site) }));
            item.append(name, on);
            return item;
        }));
        siteList.hidden = !pageMaths.checked || !sites.length;
    });
}

// both as the switches show them, for background.js
const keepPageOptions = () => chrome.storage.local.set({ pageButtonOn: pageIcon.checked, pageMathsOn: pageMaths.checked });

[pageIcon, pageMaths].forEach((box) => {
    box.addEventListener('change', () => {
        keepPageOptions();
        if (!box.checked) return showPageOptions();
        // the answer can be no: the switch then shows that
        chrome.permissions.request(pageAccess, (granted) => {
            if (!granted) {
                box.checked = false;
                keepPageOptions();
            }
            showPageOptions();
        });
    });
});

// the access can also be changed in the settings of the browser, and the choice on another options page
chrome.permissions.onAdded.addListener(showPageOptions);
chrome.permissions.onRemoved.addListener(showPageOptions);
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.pageButtonOn || changes.pageMathsOn)) showPageOptions();
    else if (area === 'local' && changes.pageMathsOff) showSites();
    else if (area === 'local' && changes.pageMathsFeatures) showKinds();
});
showPageOptions();

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

// The formulas, the converter, the statistics, the graph, the solver, the numbers, the chemistry, the physics and the biology: a button on the display for each
// while it is turned on. All of them start on; an open calculator gets the change as a
// storage event
[['panel-fx', 'fxOn', true], ['panel-conv', 'convOn', true], ['panel-stats', 'statsOn', true], ['panel-graph', 'graphOn', true],
    ['panel-solve', 'solveOn', true], ['panel-numbers', 'numbersOn', true], ['panel-chem', 'chemOn', true], ['panel-phys', 'physOn', true], ['panel-bio', 'bioOn', true]].forEach(([id, key, on]) => {
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
    // turned on or off on another options page, as the one over a tool's own window (popup.js); one an
    // administrator turned off stays off
    window.addEventListener('storage', (e) => {
        if (e.key !== key || box.disabled) return;
        try {
            const stored = JSON.parse(e.newValue);
            box.checked = typeof stored === 'boolean' ? stored : on;
        } catch (e) { }
    });
});

// What an administrator turned off (policy.js): its switch or button cannot be used, and
// says why. Turned on again, the switch shows the choice that was kept
const managed = [['panel-fx', 'formulas', 'fxOn'], ['panel-conv', 'converter', 'convOn'], ['panel-graph', 'graph', 'graphOn'],
    ['panel-stats', 'statistics', 'statsOn'], ['panel-solve', 'solve', 'solveOn'], ['panel-numbers', 'numbers', 'numbersOn'], ['panel-chem', 'chemistry', 'chemOn'], ['panel-phys', 'physics', 'physOn'], ['panel-bio', 'biology', 'bioOn'],
    ['open-mode', 'detachedMode'], ['page-icon', 'pageButton'], ['page-maths', 'pageMaths']];

const showPolicy = () => {
    managed.forEach(([id, key, kept]) => {
        const control = document.getElementById(id);
        const option = control.closest('.option');
        const off = CalcPolicy.off(key);

        if (off === control.disabled) return;
        control.disabled = off;
        option.classList.toggle('managed', off);
        if (off) {
            const note = option.querySelector('.option-text').appendChild(document.createElement('p'));

            note.className = 'option-note managed-note';
            note.textContent = 'Turned off by your administrator.';
        } else {
            option.querySelector('.managed-note').remove();
        }
        if (id === 'page-icon' || id === 'page-maths') {
            showPageOptions();
        } else if (id === 'open-mode') {
            showOpenMode();
        } else if (kept) {
            try {
                control.checked = !off && JSON.parse(localStorage.getItem(kept)) !== false;
            } catch (e) {
                control.checked = !off;
            }
        }
    });
};

CalcPolicy.onChange(showPolicy);
showPolicy();
