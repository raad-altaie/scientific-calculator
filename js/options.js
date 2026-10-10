// the copyright line always shows the current year
document.querySelectorAll('.year').forEach((el) => {
    el.textContent = new Date().getFullYear();
});

// the launch button opens the detached window, like the list of the toolbar icon does
document.getElementById('launch-detached').addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'open-detached' });
});

// The button on every page is on while the extension holds this access, as in
// background.js. Chrome asks for it when the switch is turned on; background.js then
// puts the button on the pages, and gives the access back when the switch is turned off
const pageIcon = document.getElementById('page-icon');
const pageIconAccess = { permissions: ['scripting', 'storage'], origins: ['http://*/*', 'https://*/*'] };

// Chrome does not put the button on its own pages, so this page adds it itself
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

// the access can also be changed in the settings of Chrome
chrome.permissions.onAdded.addListener(showPageIconOption);
chrome.permissions.onRemoved.addListener(showPageIconOption);
showPageIconOption();
