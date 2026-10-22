// What the administrator of a school or a company turned off for everyone they manage: set
// in the Google Admin Console, or in a policy of Windows, macOS or Linux, as
// managed_schema.json describes, and read by the browser into chrome.storage.managed. Each
// feature is on unless its policy is false, and an option cannot turn it on again.
// It is kept in localStorage too, as "policy": the calculator reads it there as it opens,
// before the browser has answered, and the other open pages hear a change as a storage event
const CalcPolicy = (() => {
    const keys = ['formulas', 'converter', 'graph', 'statistics', 'solve', 'numbers', 'chemistry', 'physics', 'biology', 'detachedMode', 'pageButton', 'pageMaths'];
    const listeners = [];

    const read = () => {
        try {
            return JSON.parse(localStorage.getItem('policy')) || {};
        } catch (e) {
            return {};
        }
    };

    const keep = (managed) => {
        const policy = {};

        keys.forEach((key) => {
            if (managed[key] === false) policy[key] = false;
        });
        // the button on every page and the icons after the maths of the pages open Detached Mode:
        // without it they have nothing to open
        if (policy.detachedMode === false) {
            policy.pageButton = false;
            policy.pageMaths = false;
        }
        try {
            if (localStorage.getItem('policy') !== JSON.stringify(policy)) localStorage.setItem('policy', JSON.stringify(policy));
        } catch (e) { }
        listeners.forEach((listener) => listener());
    };

    // the browser cannot read the policy: what was kept last stays
    const load = () => chrome.storage.managed.get(null, (managed) => {
        if (!chrome.runtime.lastError) keep(managed || {});
    });

    // the page can be open outside the extension, where there is no policy
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.managed) {
        load();
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'managed') load();
        });
    }

    return {
        off: (key) => read()[key] === false,
        // run on each answer of the browser, changed or not
        onChange: (listener) => listeners.push(listener),
    };
})();
