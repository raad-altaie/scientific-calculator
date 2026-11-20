// ESLint: a check of the code, run with `npm run lint`. It changes nothing; it points out what is
// likely a mistake: a name used that is never made (a typo), one made and never used, a name made
// twice, code that can never run. web/js holds copies of js/ (scripts/sync-web.sh), so only app.js
// of it is checked, and the languages' files are words only
import js from '@eslint/js';
import globals from 'globals';

// what each file of the calculator makes for the others, as root.CalcEngine = …
const calc = Object.fromEntries([
    'CalcEngine', 'CalcLang', 'CalcTips', 'CalcFormulas', 'CalcMaths', 'CalcUnits', 'CalcIcons',
    'CalcChem', 'CalcPhysics', 'CalcBiology', 'CalcPolicy', 'CalcGraph', 'CalcChemPanel', 'CalcPhysPanel', 'CalcBioPanel', 'CalcNumbersPanel', 'CalcSolvePanel',
    'CalcPageReader', 'CalcChemPage', 'CalcPhysPage', 'CalcBioPage',
    'CalcPageStatistics', 'CalcPageSolve', 'CalcPageNumbers', 'CalcPageGraph', 'CalcPageFormulas', 'CalcPageConverter'
].map((name) => [name, 'readonly']));

export default [
    {
        ignores: ['node_modules/', 'dist/', 'js/lang/', 'web/js/lang/', 'web/js/*.js', '!web/js/app.js', '!web/js/options.js', 'listing/']
    },
    js.configs.recommended,
    {
        // the extension's and the website's pages, and the scripts put into web pages (web/js/options.js is the
        // website's own, not a copy)
        files: ['js/**/*.js', 'web/js/app.js', 'web/js/options.js'],
        ignores: ['js/background.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            // module and require: each file is also loaded by the tests under Node, where it checks for them first
            globals: { ...globals.browser, ...globals.webextensions, ...calc, module: 'readonly', require: 'readonly' }
        },
        rules: {
            // names of the window that read as a variable of one's own: a name the code meant to make, or to take from
            // main.js, and missed, would be taken for them and pass
            'no-restricted-globals': ['error', ...['name', 'status', 'open', 'close', 'closed', 'find', 'event', 'length', 'stop',
                'print', 'blur', 'focus', 'scroll', 'parent', 'top', 'self', 'opener', 'origin', 'external', 'frames']
                .map((n) => ({ name: n, message: 'a global of the window: window.' + n + ' if it is meant' }))]
        }
    },
    {
        // the two service workers: the extension's background (MV3) and the website's offline copy
        files: ['js/background.js', 'web/sw.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            // and screen: Firefox runs the background as a page, and getDisplays reads it only there
            globals: { ...globals.serviceworker, ...globals.webextensions, screen: 'readonly' }
        }
    },
    {
        // popup.js runs after opening.js, in the same page, and uses what it made
        files: ['js/popup.js'],
        languageOptions: { globals: { DETACHED: 'readonly', detachedFit: 'readonly' } }
    },
    {
        // the tests and the scripts of a release, under Node
        files: ['test/**/*.js', 'scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node }
        }
    },
    {
        rules: {
            // an empty catch is how a failed localStorage is let go, on purpose
            'no-empty': ['error', { allowEmptyCatch: true }],
            // a handler's arguments are kept in order though only the last is used; an error caught is often not looked at
            'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
            // var n in two loops of one function is the style of the older files
            'no-redeclare': 'off',
            // the engine's regular expressions of symbols escape more than they must, for clarity
            'no-useless-escape': 'off',
            // the constants of the gamma function and the like are written to more digits than a number keeps, as published
            'no-loss-of-precision': 'off',
            // the objects asked with hasOwnProperty are the code's own tables, never made without a prototype
            'no-prototype-builtins': 'off',
            // \x00 to \x7f in a regular expression is how a key of ASCII is told from one that is not
            'no-control-regex': 'off'
        }
    }
];
