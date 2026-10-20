// Run in the head of popup.html, before the calculator is drawn. A tool's own window, popup.html?graph, ?chem or
// ?panel=solve, and its Calculator tab, ?calc, are hidden till popup.js has made them what they are to be: going
// from tab to tab opens the page again, and the popup's calculator would show for a moment first. A tool's window
// has the tools' blue at once, not the grey of the calculator
{
    const search = new URLSearchParams(location.search);
    const page = document.documentElement;

    if (['graph', 'chem', 'panel', 'calc'].some((key) => search.has(key))) {
        const show = () => page.classList.remove('opening');

        page.classList.add('opening');
        // shown however popup.js ends: an error on the way, or nothing heard from it in two seconds
        window.addEventListener('error', show);
        setTimeout(show, 2000);
    }
    if (['graph', 'chem', 'panel'].some((key) => search.has(key))) page.classList.add('tool-page');
    if (search.has('calc')) page.classList.add('home'); // in the popup's grey from the first, as popup.js has it
}
