// The manifest of the Firefox build, made from manifest.json by zip.sh. Firefox runs the
// background as a page, not a service worker, asks for the add-on's id and what data it
// collects, and does not know the keys taken out
const fs = require('fs');
const [from, to] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(from, 'utf8'));

manifest.background = { scripts: [manifest.background.service_worker] };
manifest.browser_specific_settings = {
    gecko: {
        id: 'scientific-calculator@raad.dev',
        strict_min_version: '128.0',
        data_collection_permissions: { required: ['none'] },
    },
};
manifest.icons = { 128: 'imgs/icon128.png' }; // Firefox wants the size it is told
manifest.permissions =manifest.permissions.filter((permission) => permission !== 'system.display');
delete manifest.options_page; // options_ui is the one Firefox reads
delete manifest.storage; // the policy comes from Firefox's policies.json instead
delete manifest.commands.open_popup.suggested_key.chromeos;

fs.writeFileSync(to, JSON.stringify(manifest, null, 4) + '\n');
