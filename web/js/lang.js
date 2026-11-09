// The calculator in the language chosen on the options page, or in the browser's own while none is chosen.
// Run in the head of each page, before the rest: the words of the language are read from js/lang/<code>.js,
// loaded here, before the page is drawn.
//
// The code asks in English: CalcLang.t('Clear') gives the word for Clear in the language in use, and Clear itself
// where it has none yet, so a new card shows in English till it is translated. A text with a value in it names it
// in braces, t('{n} of {all}', { n: 3, all: 10 }), as the order of the words differs from language to language;
// one of a number has a form for each number, n(3, '{n} day', '{n} days'), as a language has them (Intl.PluralRules).
//
// Each text has a short name: js/lang/en.js has the English of each, { clear: 'Clear', … }, and each language its
// words by the same names, { clear: 'Borrar', … }; the name stays when the English changes a little, so the words
// do too. Both files are made by node scripts/lang.js, which finds the English in the code. A language added:
// node scripts/lang.js add es Español, its words then filled in. A language of a country, pt-BR, has what it does
// not have itself from pt where there is one. The pseudo-language qps, chosen with localStorage.lang = '"qps"',
// makes every word that goes through here [Ŵîţĥ åççéñţš ~~], longer, so what is still in plain English is
// what is not yet translated, and what is cut short has too little room for a longer language
(function (root) {
    'use strict';

    // the languages it has, each by its own name, in the order of the options' list: by how many speak it, most first, Spanish second
    var LANGS = {
            en: 'English',
            es: 'Español',
            "zh-CN": '简体中文',
            hi: 'हिन्दी',
            ar: 'العربية',
            fr: 'Français',
            bn: 'বাংলা',
            pt: 'Português',
            ru: 'Русский',
            id: 'Bahasa Indonesia',
            ur: 'اردو',
            de: 'Deutsch',
            ja: '日本語',
            tr: 'Türkçe',
            fa: 'فارسی'
        },
        RTL = /^(ar|fa|he|ur)$/, // written right to left: the class lang-rtl, the layout as it is
        tables = {}, // the words of each language loaded, by name; en's the English of each
        names = null, // the English → its name, made from en's words as first asked
        chain = [], // the language in use, then the one of its country's language, pt-BR then pt
        chosen = 'auto', // as the options page keeps it, in localStorage.lang: a language, or auto for the browser's
        code = 'en',
        plural = null, // Intl.PluralRules of the language in use
        debug = false, // localStorage.langDebug: the English asked for that the language has no word for, in CalcLang.missing
        missing = {},
        PSEUDO = 'qps',
        ACCENT = { a: 'å', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'î', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ', n: 'ñ', o: 'ö', p: 'þ', q: 'ǫ',
            r: 'ŕ', s: 'š', t: 'ţ', u: 'û', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž', A: 'Å', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Î',
            J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ṁ', N: 'Ñ', O: 'Ö', P: 'Þ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Û', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž' },
        ATTRS = ['title', 'placeholder', 'aria-label', 'alt'], // of an element of the page, translated with its text
        SKIP = /^(SCRIPT|STYLE|svg|CODE|KBD|TEXTAREA)$/; // never translated: a key's name, typed text, a drawing

    function read(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    }

    // the language of the browser this has, of its list of them: pt-BR as pt-BR where there is one, else as pt
    function browserLang() {
        var nav = typeof navigator !== 'undefined' ? navigator : {},
            asked = nav.languages && nav.languages.length ? nav.languages : [nav.language || 'en'], i, whole;
        for (i = 0; i < asked.length; i++) {
            whole = String(asked[i]);
            if (LANGS[whole]) return whole;
            if (LANGS[whole.split('-')[0]]) return whole.split('-')[0];
        }
        return 'en';
    }

    // The language to use: the one chosen, while it is still one of them, else the browser's
    function pick() {
        var kept = read('lang');
        chosen = typeof kept === 'string' && (LANGS[kept] || kept === PSEUDO) ? kept : 'auto';
        debug = read('langDebug') === true;
        return chosen === 'auto' ? browserLang() : chosen;
    }

    // a text in the pseudo-language: its letters accented, a third longer, in brackets to show where it ends; its
    // tags, its entities and the names of its values, {n}, as they are
    function pseudo(text) {
        var letters = 0, out;
        if (!/[A-Za-z]{2}/.test(String(text).replace(/<[^>]*>|&[#\w]+;|\{\w+\}/g, ' '))) return text; // a letter alone, as x or r, is maths
        out = String(text).replace(/(<[^>]*>|&[#\w]+;|\{\w+\})|[A-Za-z]/g, function (m, kept) {
            if (kept) return kept;
            letters++;
            return ACCENT[m];
        });
        return letters ? '[' + out + ' ' + new Array(Math.ceil(letters / 3) + 1).join('~') + ']' : out;
    }

    // the values put into a text by their names: {n} the value of n; a name with none stays as it is
    function fill(text, values) {
        if (!values) return text;
        return text.replace(/\{(\w+)\}/g, function (m, name) {
            return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : m;
        });
    }

    // the English of a text of en.js, as the code asks for it: the text, the other of a number's forms, or a text
    // of a context, 'state' and the text with \u0004 between
    function englishOf(entry) {
        return typeof entry === 'string' ? entry : entry.other !== undefined ? entry.other : entry.context + '\u0004' + entry.text;
    }

    // The words of the language in use for an English text: a text, or the forms of a number; of its country's
    // language where it has none itself; undefined where neither has them yet
    function wordsOf(text) {
        var name, i, table, value;
        if (!names) {
            names = Object.create(null);
            Object.keys(tables.en || {}).forEach(function (n) { names[englishOf(tables.en[n])] = n; });
        }
        name = names[text];
        for (i = 0; name && i < chain.length; i++) {
            table = tables[chain[i]];
            value = table && Object.prototype.hasOwnProperty.call(table, name) ? table[name] : null;
            if (value && (typeof value === 'string' || value.other)) return value;
        }
    }

    // the words of the language in use for the English text, or the English while it has none
    function word(text) {
        var found;
        if (code === 'en' || typeof text !== 'string' || !text) return text;
        if (code === PSEUDO) return pseudo(text);
        found = wordsOf(text);
        if (typeof found === 'string') return found;
        if (debug) missing[text] = true;
        return text;
    }

    // The text in the language in use, its values put in
    function t(text, values) {
        var own = word(text);
        return fill(typeof own === 'string' ? own : text, values);
    }

    // A text that means more than one thing, Solid of a line or of a state of matter: kept under its context too, as
    // gettext's pgettext keeps it, 'state' and the text with \u0004 between; English, or none yet, the text alone
    function c(context, text, values) {
        var key = context + '\u0004' + text, own = code === 'en' || code === PSEUDO ? word(text) : word(key);
        return fill(own === key ? text : own, values);
    }

    // Of a number n: one, the English with one, as '{n} day', and other with any other, '{n} days', the key of the
    // language's forms: { one: …, few: …, many: …, other: … }, each as many as the language has. {n} is n
    function n(count, one, other, values) {
        var forms = code !== 'en' && code !== PSEUDO && wordsOf(other), form, all = { n: count };
        if (values) Object.keys(values).forEach(function (k) { all[k] = values[k]; });
        if (code === PSEUDO) return fill(pseudo(count === 1 ? one : other), all);
        if (forms && typeof forms === 'object') {
            form = forms[plural ? plural.select(count) : 'other'] || forms.other;
            if (form) return fill(form, all);
        }
        // a language of one form may give it as a text
        if (typeof forms === 'string') return fill(forms, all);
        if (debug && code !== 'en' && !forms) missing[other] = true;
        return fill(count === 1 ? one : other, all);
    }

    // a text of the page as the key it is kept under: its spaces and line breaks as one space
    function keyOf(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    // The words of the page, of el and all in it, in the language in use: each text, and its title, placeholder,
    // aria-label and alt. An element marked data-t is one text with its tags, as a paragraph with a word in bold;
    // one marked translate="no", as the keys, stays as it is, with all in it
    function dom(el) {
        if (code === 'en' || !el) return;
        (function walk(node) {
            var child, key, own;
            if (node.nodeType === 3) {
                key = keyOf(node.data);
                own = key && word(key);
                if (own && own !== key) node.data = node.data.replace(/^(\s*)[\s\S]*?(\s*)$/, function (m, before, after) { return before + own + after; });
                return;
            }
            if (node.nodeType !== 1 || SKIP.test(node.nodeName) || node.getAttribute('translate') === 'no') return;
            ATTRS.forEach(function (name) {
                var value = node.getAttribute(name);
                if (value && (own = word(keyOf(value))) !== keyOf(value)) node.setAttribute(name, own);
            });
            if (node.hasAttribute('data-t')) {
                key = keyOf(node.innerHTML);
                own = word(key);
                if (own !== key) node.innerHTML = own;
                return;
            }
            for (child = node.firstChild; child; child = child.nextSibling) walk(child);
        })(el);
    }

    // a language's words, from its file; en's, the English of each name. What a file has to check after it, the
    // names translated from an earlier English, is for scripts/lang.js
    function add(lang, table) {
        tables[lang] = table;
        if (lang === 'en') names = null;
    }

    code = pick();
    chain = [code];
    if (code.indexOf('-') > 0 && LANGS[code.split('-')[0]]) chain.push(code.split('-')[0]);
    try {
        plural = new Intl.PluralRules(code === PSEUDO ? 'en' : code);
    } catch (e) { }
    // its words loaded before the page is drawn: written into the page as it is read, after this script, so it is run
    // before those after it. Only from the head, where the page is still being read
    if (typeof document !== 'undefined') { // not in the tests, under Node
        if (code !== 'en' && code !== PSEUDO && document.currentScript && document.readyState === 'loading') {
            // the English of each name, then the language of its country, then its own
            ['en'].concat(chain.slice(1), code).forEach(function (file) {
                document.write('<script src="' + document.currentScript.src.replace(/lang\.js(\?.*)?$/, 'lang/' + file + '.js') + '"><\/script>');
            });
        }
        document.documentElement.lang = code === PSEUDO ? 'en' : code;
        // written right to left: the page laid out as it is, each text read from the right (style.css, options.css)
        if (RTL.test(code)) document.documentElement.classList.add('lang-rtl');
    }

    root.CalcLang = {
        code: code, // the language in use
        locale: code === PSEUDO ? 'en' : code, // and as Intl and toLocaleString take it
        rtl: RTL.test(code), // written right to left: the class lang-rtl on the page
        chosen: function () { return chosen; }, // as chosen: a language, or auto
        names: LANGS,
        browser: browserLang, // the language the browser asks for, of these
        t: t,
        n: n,
        c: c,
        dom: dom,
        add: add,
        missing: missing // with langDebug on, the English asked for that has no word yet in the language in use
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = root.CalcLang;
    }
})(typeof window !== 'undefined' ? window : this);
