// manifest.json's version sent to the stores, one after another: Edge and Firefox (Chrome is uploaded by hand). One that fails does not
// stop the others; it is named at the end, to send again alone. The zips in dist/ are sent as they are: npm run zip
// makes them first.
//
//   npm run release                          sent to both
//   npm run release -- edge                  only to Edge
//   npm run release -- --notes "What's new"  with notes: Firefox's release notes, Edge's notes for its reviewers
const path = require('path');
const { spawnSync } = require('child_process');

const STORES = { edge: 'edge-upload.js', firefox: 'amo-upload.js' };

const args = process.argv.slice(2);
const at = args.indexOf('--notes');
const notes = at >= 0 ? args[at + 1] : undefined;
const named = args.filter((a, i) => at < 0 || (i !== at && i !== at + 1));
const unknown = named.filter((a) => !STORES[a]);
if (unknown.length) {
    console.error('Not a store:', unknown.join(', '), '(edge or firefox)');
    process.exit(1);
}

const version = require('../manifest.json').version;
const failed = [];
for (const store of named.length ? named : Object.keys(STORES)) {
    console.log('\n— ' + store + ', ' + version);
    const run = spawnSync(process.execPath, [path.join(__dirname, STORES[store])].concat(notes ? [notes] : []), { stdio: 'inherit' });
    if (run.status !== 0) failed.push(store);
}

console.log('');
if (failed.length) {
    console.error('✗ not sent to ' + failed.join(', ') + ': node scripts/publish.js ' + failed.join(' '));
    process.exit(1);
}
console.log('✓ ' + version + ' sent to ' + (named.length ? named : Object.keys(STORES)).join(', '));
