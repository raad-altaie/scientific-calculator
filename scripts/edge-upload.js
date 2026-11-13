// A new version of the extension sent to Microsoft Edge Add-ons by its API (v1.1), with the keys of .env, never
// shown: the zip of manifest.json's version, the same zip Chrome takes, made by scripts/zip.sh, uploaded into the draft,
// checked by the store, then published, to be reviewed as every version is.
//
//   node scripts/edge-upload.js              dist/scientific-calculator-<version>.zip sent
//   node scripts/edge-upload.js "notes"      with these notes for the reviewers
//
// .env, all three from Partner Center:
//   EDGE_CLIENT_ID, EDGE_API_KEY             Microsoft Edge, Publish API (the key expires: a new one there)
//   EDGE_PRODUCT_ID                          the extension's overview page, Product ID
const fs = require('fs');
const path = require('path');
const { env } = require('./env');

const ROOT = path.join(__dirname, '..');

async function call(vars, method, url, body, type) {
    const res = await fetch('https://api.addons.microsoftedge.microsoft.com/v1/products/' + vars.EDGE_PRODUCT_ID + '/submissions' + url, {
        method,
        headers: Object.assign({ Authorization: 'ApiKey ' + vars.EDGE_API_KEY, 'X-ClientID': vars.EDGE_CLIENT_ID }, type ? { 'Content-Type': type } : {}),
        body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(method + ' ' + (url || '/') + ': ' + res.status + ' ' + text.slice(0, 600));
    // an upload or a publish answers 202 and where to ask how it went, the operation's id last
    const location = res.headers.get('location');
    return { operation: location && location.split('/').pop(), json: text ? JSON.parse(text) : {} };
}

// the operation asked about until it is done, a few seconds to a few minutes
async function wait(vars, url, what) {
    for (let i = 0; ; i++) {
        const { json } = await call(vars, 'GET', url);
        if (json.status === 'Succeeded') return json;
        if (json.status === 'Failed') {
            const errors = (json.errors || []).map((e) => '– ' + (e.message || JSON.stringify(e))).join('\n');
            throw new Error(what + ' failed: ' + (json.message || json.errorCode || '') + (errors ? '\n' + errors : ''));
        }
        if (i > 100) throw new Error(what + ' not done after five minutes: ' + url);
        await new Promise((r) => setTimeout(r, 3000));
    }
}

async function main() {
    const notes = process.argv[2];
    const vars = env(['EDGE_CLIENT_ID', 'EDGE_API_KEY', 'EDGE_PRODUCT_ID']);
    const version = require(path.join(ROOT, 'manifest.json')).version;
    const zip = path.join(ROOT, 'dist', 'scientific-calculator-' + version + '.zip');
    if (!fs.existsSync(zip)) throw new Error('no ' + path.relative(ROOT, zip) + ': sh scripts/zip.sh first');

    const up = await call(vars, 'POST', '/draft/package', fs.readFileSync(zip), 'application/zip');
    console.log('Uploaded', path.basename(zip) + ', checking…');
    await wait(vars, '/draft/package/operations/' + up.operation, 'The upload');
    console.log('Checked');

    const made = await call(vars, 'POST', '', JSON.stringify({ notes: notes || 'Version ' + version }), 'application/json');
    const done = await wait(vars, '/operations/' + made.operation, 'Publishing');
    console.log('Version', version, 'submitted:', done.message || 'in review');
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
