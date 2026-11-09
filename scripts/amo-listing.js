// The add-on's description on addons.mozilla.org in each language, from listing/<language>.txt, sent by AMO's API with
// the key of .env (FIREFOX_EXT_API_KEY, the JWT issuer, and FIREFOX_EXT_API_SECRET), never shown.
//
//   node scripts/amo-listing.js check        the key works, and the languages the listing has now
//   node scripts/amo-listing.js send         every language's description sent, all in one request: an edit counts
//                                            as a submission, 3 a minute, 10 an hour and 24 a day, and one stopped
//                                            by one of those still counts for the others
//   node scripts/amo-listing.js send fa ru   only these
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ADDON = 'scientific-calculator@raad.dev'; // its id, as scripts/firefox-manifest.js gives it
const API = 'https://addons.mozilla.org/api/v5/';
// a file's language as AMO names it, where the name differs: _locales' es and pt_BR are es-ES and pt-BR
const AMO = { en: 'en-US', es: 'es-ES', pt_BR: 'pt-BR', zh_CN: 'zh-CN' };
// the languages AMO takes, PROD_LANGUAGES of addons-server's src/olympia/core/languages.py; not ar, bn, hi, id or ur
const TAKEN = new Set(['cs', 'de', 'dsb', 'el', 'en-CA', 'en-GB', 'en-US', 'es-AR', 'es-CL', 'es-ES', 'es-MX', 'fa', 'fi', 'fr', 'fur', 'fy-NL', 'he', 'hr', 'hsb', 'hu', 'ia', 'it', 'ja', 'ka', 'kab', 'ko', 'nb-NO', 'nl', 'nn-NO', 'pl', 'pt-BR', 'pt-PT', 'ro', 'ru', 'sk', 'sl', 'sq', 'sr', 'sv-SE', 'tr', 'uk', 'vi', 'zh-CN', 'zh-TW']);

function env() {
    const file = path.join(ROOT, '.env');
    const vars = {};
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
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

async function call(vars, method, url, data) {
    const res = await fetch(API + url, {
        method,
        headers: { Authorization: 'JWT ' + token(vars), 'Content-Type': 'application/json' },
        body: data && JSON.stringify(data),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(res.status + ' ' + text.slice(0, 400));
    return JSON.parse(text);
}

async function main() {
    const [what, ...only] = process.argv.slice(2);
    const vars = env();
    const addon = 'addons/addon/' + encodeURIComponent(ADDON) + '/';
    if (what === 'check') {
        const me = await call(vars, 'GET', 'accounts/profile/');
        const listing = await call(vars, 'GET', addon + '?lang=en-US&wrap_outgoing_links=false');
        console.log('The key is of', me.name || me.username + ';', 'the add-on', listing.slug);
        const seen = [];
        for (const code of ['de', 'en-US', 'es-ES', 'fa', 'fr', 'ja', 'pt-BR', 'ru', 'tr', 'zh-CN']) {
            const one = await call(vars, 'GET', addon + '?lang=' + code + '&wrap_outgoing_links=false');
            const d = one.description;
            const text = d && typeof d === 'object' ? d[code] || Object.values(d)[0] : d;
            const pick = (v) => (v && typeof v === 'object' ? v[code] || Object.values(v)[0] : v) || '';
            seen.push(code + ' ' + (text ? [...text].length : 0) + ' | ' + pick(one.name) + ' | ' + pick(one.summary).slice(0, 40));
        }
        console.log('Language, description characters, name, summary:\n' + seen.join('\n'));
        return;
    }
    if (what !== 'send') return console.log('node scripts/amo-listing.js check | send [languages]');
    const files = fs.readdirSync(path.join(ROOT, 'listing')).filter((f) => f.endsWith('.txt')).map((f) => f.slice(0, -4));
    const description = {}, name = {}, summary = {};
    for (const lang of files.filter((l) => !only.length || only.includes(l))) {
        const code = AMO[lang] || lang;
        if (!TAKEN.has(code)) console.log('–', code, 'not a language of AMO, left out');
        else {
            description[code] = fs.readFileSync(path.join(ROOT, 'listing', lang + '.txt'), 'utf8').trim();
            // the name and the summary are the extension's own, from _locales; the listing takes them by language too
            const messages = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales', lang, 'messages.json'), 'utf8'));
            name[code] = messages.name.message;
            summary[code] = messages.description.message;
        }
    }
    await call(vars, 'PATCH', addon, { name, summary, description });
    console.log('✓', Object.keys(description).join(', '));
}

main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
});
