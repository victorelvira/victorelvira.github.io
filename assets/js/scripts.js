// Carga la navbar (nav.html) y el footer (footer.html) compartidos y los inyecta
// en sus placeholders. Para que la navbar NO tarde en aparecer:
//   1) Las descargas arrancan cuanto antes: en cuanto se evalúa este script (en el
//      <head>), en paralelo con el parseo del HTML. No se espera a window.onload
//      (que es lo más tardío: aguarda imágenes, fuentes, etc. -> causaba el retraso).
//   2) La inyección se hace en DOMContentLoaded, cuando ya existen los placeholders.

// --- Tema claro/oscuro: fijar ANTES de pintar para evitar el flash blanco.
// Este script va en el <head> y es sincrono, asi que corre antes de renderizar.
(function () {
    var t;
    try { t = localStorage.getItem('theme'); } catch (e) {}
    if (t !== 'light' && t !== 'dark') {
        t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-bs-theme', t);
})();

function updateThemeToggle(t) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var icon = btn.querySelector('i');
    if (icon) icon.className = (t === 'dark') ? 'fas fa-sun' : 'fas fa-moon';
    btn.setAttribute('aria-label', (t === 'dark') ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', (t === 'dark') ? 'Light mode' : 'Dark mode');
}

function applyTheme(t) {
    document.documentElement.setAttribute('data-bs-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
    updateThemeToggle(t);
}

// --- Idioma EN/ES (global) ------------------------------------------------
// Patrón "dos bloques hermanos": el inglés y el español conviven en el HTML,
// cada uno con data-lang="en" / data-lang="es"; el motor muestra el del idioma
// activo y oculta el otro. Los data-lang="es" llevan `hidden` en el HTML para
// que por defecto (antes del JS) se vea el inglés.
//   <p data-lang="en">About me</p>
//   <p data-lang="es" hidden>Sobre mí</p>
// Para traducir un ATRIBUTO (p. ej. placeholder) usa:
//   data-i18n-es-attr="placeholder|<español>".
// Lo no marcado (anglicismos, nombres propios, títulos de papers) queda intacto.
(function () {
    var l;
    try { l = localStorage.getItem('lang'); } catch (e) {}
    if (l !== 'es' && l !== 'en') l = /^es/i.test(navigator.language || '') ? 'es' : 'en';
    window.__lang = l;
})();

function translateTree(root, lang) {
    (root || document).querySelectorAll('[data-lang]').forEach(function (el) {
        el.hidden = (el.getAttribute('data-lang') !== lang);
    });
    (root || document).querySelectorAll('[data-i18n-es-attr]').forEach(function (el) {
        var spec = el.getAttribute('data-i18n-es-attr');
        var i = spec.indexOf('|'); if (i < 0) return;
        var attr = spec.slice(0, i), es = spec.slice(i + 1);
        var key = 'i18nEnAttr-' + attr;
        if (el.getAttribute('data-' + key) === null) el.setAttribute('data-' + key, el.getAttribute(attr) || '');
        el.setAttribute(attr, (lang === 'es') ? es : el.getAttribute('data-' + key));
    });
}

function updateLangToggle(lang) {
    var en = document.getElementById('lang-en-btn'), es = document.getElementById('lang-es-btn');
    if (en) en.classList.toggle('active', lang === 'en');
    if (es) es.classList.toggle('active', lang === 'es');
}

function applyLang(lang) {
    window.__lang = lang;
    document.documentElement.setAttribute('lang', lang);
    try { localStorage.setItem('lang', lang); } catch (e) {}
    translateTree(document, lang);
    updateLangToggle(lang);
}

// Version compartida para cache-busting de la navbar/footer (súbela al cambiar nav/footer).
const __ASSET_VER = 'i18n2';
const __navbarPromise = fetch('/nav.html?v=' + __ASSET_VER).then(r => r.ok ? r.text() : Promise.reject(new Error('nav.html ' + r.status)));
const __footerPromise = fetch('/footer.html?v=' + __ASSET_VER).then(r => r.ok ? r.text() : Promise.reject(new Error('footer.html ' + r.status)));

function injectNavbar() {
    __navbarPromise
        .then(html => {
            const el = document.getElementById('navbar-placeholder');
            if (el) el.innerHTML = html;
            // Cablear el toggle de tema (vive en nav.html)
            const tbtn = document.getElementById('theme-toggle');
            if (tbtn) {
                updateThemeToggle(document.documentElement.getAttribute('data-bs-theme') || 'light');
                tbtn.addEventListener('click', function () {
                    var cur = document.documentElement.getAttribute('data-bs-theme');
                    applyTheme(cur === 'dark' ? 'light' : 'dark');
                });
            }
            // Idioma: traducir la navbar y cablear el toggle EN/ES
            translateTree(el, window.__lang);
            updateLangToggle(window.__lang);
            var enB = document.getElementById('lang-en-btn'), esB = document.getElementById('lang-es-btn');
            if (enB) enB.addEventListener('click', function (e) { e.preventDefault(); applyLang('en'); });
            if (esB) esB.addEventListener('click', function (e) { e.preventDefault(); applyLang('es'); });
        })
        .catch(error => console.error('Error loading navbar:', error));
}

function injectFooter() {
    __footerPromise
        .then(html => {
            const el = document.getElementById('footer-placeholder');
            if (!el) return;
            el.innerHTML = html;

            // Año del copyright
            const currentYearElement = document.getElementById('currentYear');
            if (currentYearElement) {
                currentYearElement.textContent = new Date().getFullYear();
            }

            // "Last updated": fecha del último commit del repo (se actualiza solo).
            // Si la API de GitHub falla, no se muestra nada (fallback silencioso).
            const lastUpdateElement = document.getElementById('lastUpdate');
            if (lastUpdateElement) {
                fetch('https://api.github.com/repos/victorelvira/victorelvira.github.io/commits?per_page=1')
                    .then(r => r.ok ? r.json() : Promise.reject())
                    .then(commits => {
                        const d = new Date(commits[0].commit.committer.date);
                        const es = window.__lang === 'es';
                        lastUpdateElement.textContent = (es ? 'Última actualización: ' : 'Last updated: ') +
                            d.toLocaleString(es ? 'es-ES' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit' });
                    })
                    .catch(() => {});
            }
            translateTree(el, window.__lang);
        })
        .catch(error => console.error('Error loading footer:', error));
}

// Inyecta en cuanto el DOM esté listo (los placeholders ya existen). Si el script
// se cargara tarde (DOM ya parseado), inyecta de inmediato.
function __onReady() {
    injectNavbar();
    injectFooter();
    // Traducir el contenido propio de la página (la navbar/footer se traducen al inyectarse)
    document.documentElement.setAttribute('lang', window.__lang);
    translateTree(document, window.__lang);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __onReady);
} else {
    __onReady();
}
