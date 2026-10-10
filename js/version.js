// The version is written once, in manifest.json. Pages show its first two
// numbers only: 2.0.1 is shown as "v 2.0".
const shownVersion = 'v ' + chrome.runtime.getManifest().version.split('.').slice(0, 2).join('.');

document.querySelectorAll('.v').forEach((el) => {
    el.textContent = shownVersion;
});
