// The keys of the stores, from .env (never shown), or from the environment, which wins, as in CI
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '.env');

function read() {
    const vars = {};
    if (fs.existsSync(FILE)) {
        for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
            const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
            if (m) vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
        }
    }
    return vars;
}

// the keys asked for, each from the environment or .env; an error naming those missing
function env(keys) {
    const file = read();
    const vars = {};
    const missing = [];
    for (const key of keys) {
        vars[key] = process.env[key] || file[key];
        if (!vars[key]) missing.push(key);
    }
    if (missing.length) throw new Error('.env has no ' + missing.join(', '));
    return vars;
}

module.exports = { env };
