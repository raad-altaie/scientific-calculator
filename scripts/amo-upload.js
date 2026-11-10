// A new version of the add-on sent to addons.mozilla.org by AMO's API, with the key of .env (FIREFOX_EXT_API_KEY,
// the JWT issuer, and FIREFOX_EXT_API_SECRET), never shown: the Firefox zip of manifest.json's version, made by
// scripts/zip.sh, uploaded, checked by AMO, and made a listed version, to be reviewed as every version is.
//
//   node scripts/amo-upload.js               dist/scientific-calculator-<version>-firefox.zip sent
//   node scripts/amo-upload.js "notes"       with these release notes, in English
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ADDON = 'scientific-calculator@raad.dev'; // its id, as scripts/firefox-manifest.js gives it
const API = 'https://addons.mozilla.org/api/v5/';

function env() {
    const vars = {};
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
        if (m) vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
    if (!vars.FIREFOX_EXT_API_KEY || !vars.FIREFOX_EXT_API_SECRET) throw new Error('.env has no FIREFOX_EXT_API_KEY or FIREFOX_EXT_API_SECRET');
    return vars;
}

// a JWT of HS256, as AMO asks, good for a minute
function token({ FIREFOX_EXT_API_KEY: iss, FIREFOX_EXT_API_SECRET: secret }) {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const body = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ iss, jti: crypto.randomUUID(), iat: now, exp: now + 60 });
    return body + '.' + crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

async function call(vars, method, url, body) {
    const json = body && !(body instanceof FormData);
    const res = await fetch(API + url, {
        method,
        headers: Object.assign({ Authorization: 'JWT ' + token(vars) }, json ? { 'Content-Type': 'application/json' } : {}),
        body: json ? JSON.stringify(body) : body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(method + ' ' + url + ': ' + res.status + ' ' + text.slice(0, 600));
    return JSON.parse(text);
}

async function main() {
    const notes = process.argv[2];
    const vars = env();
    const version = require(path.join(ROOT, 'manifest.json')).version;
    const zip = path.join(ROOT, 'dist', 'scientific-calculator-' + version + '-firefox.zip');
    if (!fs.existsSync(zip)) throw new Error('no ' + path.relative(ROOT, zip) + ': sh scripts/zip.sh first');
    const addon = 'addons/addon/' + encodeURIComponent(ADDON) + '/';
    const have = await call(vars, 'GET', addon + 'versions/?filter=all_with_unlisted&page_size=50');
    if (have.results.some((v) => v.version === version)) throw new Error(version + ' is on AMO already: a new version number first');

    const form = new FormData();
    form.append('upload', new Blob([fs.readFileSync(zip)]), path.basename(zip));
    form.append('channel', 'listed');
    let up = await call(vars, 'POST', 'addons/upload/', form);
    console.log('Uploaded', path.basename(zip) + ', checking…');
    // AMO's checks, a few seconds to a minute or two
    for (let i = 0; !up.processed; i++) {
        if (i > 90) throw new Error('not checked after three minutes: upload ' + up.uuid);
        await new Promise((r) => setTimeout(r, 2000));
        up = await call(vars, 'GET', 'addons/upload/' + up.uuid + '/');
    }
    const v = up.validation || {};
    console.log('Checked:', (v.errors || 0) + ' errors, ' + (v.warnings || 0) + ' warnings, ' + (v.notices || 0) + ' notices');
    if (!up.valid) {
        for (const m of (v.messages || []).filter((m) => m.type === 'error')) console.log('–', m.message, m.file || '');
        throw new Error('AMO did not take it');
    }
    const made = await call(vars, 'POST', addon + 'versions/', Object.assign({ upload: up.uuid }, notes ? { release_notes: { 'en-US': notes } } : {}));
    console.log('Version', made.version, 'made:', made.file && made.file.status, '(' + (made.edit_url || '') + ')');
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
