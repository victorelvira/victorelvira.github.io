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
    // Por defecto SIEMPRE claro (ignora prefers-color-scheme del navegador);
    // solo se usa oscuro si el usuario lo eligió antes con el toggle.
    if (t !== 'light' && t !== 'dark') t = 'light';
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
    // Por defecto SIEMPRE inglés (ignora el idioma del navegador); el español
    // sale solo si el usuario lo eligió antes con el toggle EN·ES.
    if (l !== 'es' && l !== 'en') l = 'en';
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
    // Aviso para páginas con contenido generado por JS (p. ej. los chips de
    // filtro de personal_projects) que necesitan re-etiquetarse al cambiar idioma.
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

// Version compartida para cache-busting de la navbar/footer (súbela al cambiar nav/footer).
const __ASSET_VER = 'i18n16';
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
// --- Idiomas de cada proyecto: FUENTE ÚNICA = data-flang ------------------
// Cada tarjeta [data-flang] con un .lang-badge muestra sus códigos en mayúscula,
// en el orden del atributo: data-flang="es en" -> "ES · EN". El texto del badge
// NO se escribe a mano (así nunca puede contradecir a data-flang, que es lo que
// usan también los filtros). Para cambiar los idiomas de un proyecto, edita solo
// su data-flang.
function renderLangBadges(root) {
    (root || document).querySelectorAll('[data-flang] .lang-badge').forEach(function (badge) {
        var card = badge.closest('[data-flang]');
        if (!card) return;
        var codes = (card.getAttribute('data-flang') || '').split(/\s+/).filter(Boolean);
        badge.textContent = codes.map(function (c) { return c.toUpperCase(); }).join(' · ');
    });
}

// --- Escaparate de la portada: FUENTE ÚNICA = personal_projects.html -------
// La home no duplica las tarjetas: clona en caliente las marcadas data-featured
// en personal_projects.html (ordenadas por ese número) dentro de #featured-grid.
// Así editas cada proyecto UNA sola vez (allí) y la portada se actualiza sola.
// Idioma y badges se re-aplican sobre las tarjetas clonadas; applyLang re-traduce
// todo el documento al cambiar EN/ES, por lo que no hace falta re-enganchar nada.
function loadFeaturedProjects(gridId, source) {
    var grid = document.getElementById(gridId || 'featured-grid');
    if (!grid) return;
    fetch((source || '/personal_projects.html') + '?v=' + __ASSET_VER)
        .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error('projects ' + r.status)); })
        .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var cards = Array.prototype.slice.call(doc.querySelectorAll('[data-featured]'));
            cards.sort(function (a, b) {
                return (parseInt(a.getAttribute('data-featured'), 10) || 0) -
                       (parseInt(b.getAttribute('data-featured'), 10) || 0);
            });
            if (!cards.length) return;
            grid.innerHTML = '';
            cards.forEach(function (card) { grid.appendChild(document.importNode(card, true)); });
            translateTree(grid, window.__lang);
            renderLangBadges(grid);
        })
        .catch(function (e) { console.error('Featured projects:', e); });
}

// --- Artículos seleccionados en la portada: FUENTE ÚNICA = el .bib ----------
// No se duplican los datos del paper: la home lee data/publications/all_publications.bib
// (lo mismo que publications.html) y pinta solo las bibkeys de data-keys, EN ESE ORDEN.
// Para cambiar qué papers salen, edita data-keys en #featured-papers-list (index.html).
function __decodeAccents(s) {
    if (!s) return s || '';
    var acc = {
        "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ń', c: 'ć', y: 'ý', s: 'ś', z: 'ź', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' },
        '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù' },
        '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' },
        '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û' },
        '~': { n: 'ñ', a: 'ã', o: 'õ', N: 'Ñ' }
    };
    // Formas LaTeX: {\'\i}, {\'i}, \'{i}, \'i  (con \i / \j sin punto)
    s = s.replace(/\{?\\(['`"^~])\s*\\?\{?\\?([a-zA-Z])\}?\}?/g, function (m, a, l) {
        return (acc[a] && acc[a][l]) || (a + l);
    });
    s = s.replace(/\\i\b/g, 'i').replace(/\\j\b/g, 'j');
    return s.replace(/[{}]/g, '').replace(/\\([a-zA-Z])/g, '$1');
}
function __bibEntry(bib, key) {
    var re = new RegExp('@(\\w+)\\s*\\{\\s*' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,', 'i');
    var m = re.exec(bib);
    if (!m) return null;
    var open = bib.indexOf('{', m.index), depth = 0, end = -1;
    for (var j = open; j < bib.length; j++) {
        var c = bib[j];
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end < 0) return null;
    var body = bib.slice(open + 1, end), fields = {};
    var i = body.indexOf(','); i = (i < 0) ? 0 : i + 1;
    var n = body.length;
    while (i < n) {
        while (i < n && /[\s,]/.test(body[i])) i++;
        var s = i;
        while (i < n && /[A-Za-z0-9_\-]/.test(body[i])) i++;
        var name = body.slice(s, i).toLowerCase();
        if (!name) break;
        while (i < n && /\s/.test(body[i])) i++;
        if (body[i] !== '=') break;
        i++;
        while (i < n && /\s/.test(body[i])) i++;
        var val = '';
        if (body[i] === '{') {
            var d = 0;
            for (; i < n; i++) { var ch = body[i]; if (ch === '{') { d++; if (d === 1) continue; } else if (ch === '}') { d--; if (d === 0) { i++; break; } } val += ch; }
        } else if (body[i] === '"') {
            for (i++; i < n; i++) { if (body[i] === '"') { i++; break; } val += body[i]; }
        } else {
            for (; i < n; i++) { if (body[i] === ',' || body[i] === '\n') break; val += body[i]; }
        }
        fields[name] = val.trim();
    }
    return { type: m[1].toLowerCase(), key: key, fields: fields };
}
function __formatAuthors(a) {
    if (!a) return 'Unknown';
    return a.split(/\s+and\s+/).map(function (one) {
        one = __decodeAccents(one.trim());
        if (one.indexOf(',') >= 0) { var p = one.split(','); return (p[1] ? p[1].trim() + ' ' : '') + p[0].trim(); }
        return one;
    }).join(', ');
}
// --- MOTOR COMPARTIDO de "chips" de papers (lo usan publications.html Y la portada) ---
// buildPaperChips arma los botones (arXiv/URL/DOI/PDF/Cite/Abstract) EXACTAMENTE igual
// en las dos páginas, para que no haya dos versiones que se desincronicen. El modal de
// Cite y el desplegable de Abstract los gestiona initPubChips() más abajo, también
// compartido. pdfKeys/abstracts son opcionales: si no se pasan, usa los globales window.*.
function buildPaperChips(o, pdfKeys, abstracts) {
    o = o || {};
    if (pdfKeys === undefined) pdfKeys = window.__PDF_KEYS__;
    if (abstracts === undefined) abstracts = window.__ABSTRACTS__;
    var key = (o.key || '').toString().trim();
    var kl = key.toLowerCase();
    var absKey = (o.abstractKey != null ? o.abstractKey : key).toString();
    var arxiv = (o.arxiv || '').toString().trim();
    var url = (o.url || '').toString().trim();
    var doi = (o.doi || '').toString().trim();
    var b = '';
    if (arxiv) b += ' <a class="btn btn-mini btn-success" target="_blank" rel="noopener" href="' + arxiv + '">arXiv</a>';
    if (url) b += ' <a class="btn btn-mini btn-info" target="_blank" rel="noopener" href="' + url + '">URL</a>';
    if (doi) {
        var rawDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
        var doiLink = /^https?:/i.test(doi) ? doi : 'https://doi.org/' + rawDoi;
        var escA = function (s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
        b += ' <button type="button" class="btn btn-mini btn-primary doi-btn" data-doi="' + escA(rawDoi) + '" data-doi-url="' + escA(doiLink) + '">DOI</button>';
    }
    if (kl) {
        if (!pdfKeys || pdfKeys.has(kl)) {
            b += ' <a class="btn btn-mini btn-danger" target="_blank" rel="noopener" href="assets/papers/' + encodeURIComponent(kl) + '_pre.pdf">PDF</a>';
        }
        b += ' <button type="button" class="btn btn-mini btn-secondary cite-btn" data-bibkey="' + kl + '" data-biburl="assets/bib/' + encodeURIComponent(kl) + '.bib"><span data-lang="en">Cite</span><span data-lang="es" hidden>Citar</span></button>';
    }
    if (abstracts && abstracts[absKey]) {
        b += ' <button type="button" class="btn btn-mini btn-outline-secondary abs-btn" data-bibkey="' + absKey + '"><span data-lang="en">Abstract</span><span data-lang="es" hidden>Resumen</span></button>';
    }
    return b;
}

// Carga (una vez) el manifest de PDFs y los abstracts, a los mismos globales que usa
// publications.html (window.__PDF_KEYS__ / window.__ABSTRACTS__).
var __pubMetaPromise = null;
function __loadPubMeta() {
    if (__pubMetaPromise) return __pubMetaPromise;
    var man = fetch('/data/publications/pdf_manifest.json?v=' + __ASSET_VER)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (keys) { if (Array.isArray(keys)) window.__PDF_KEYS__ = new Set(keys.map(function (k) { return String(k).toLowerCase(); })); })
        .catch(function () {});
    var abs = fetch('/data/publications/abstracts.json?v=' + __ASSET_VER)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (obj) { if (obj && typeof obj === 'object') window.__ABSTRACTS__ = obj; })
        .catch(function () {});
    __pubMetaPromise = Promise.all([man, abs]);
    return __pubMetaPromise;
}

// Inyecta el modal de Cite (si la página no lo trae ya) y engancha, a nivel de documento,
// los clics en .cite-btn / .abs-btn y el copiar. Compartido por las dos páginas.
function injectCiteModal() {
    if (document.getElementById('citeModal')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
        '<div class="modal fade" id="citeModal" tabindex="-1" aria-labelledby="citeModalLabel" aria-hidden="true">' +
          '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">' +
            '<div class="modal-header"><h5 class="modal-title" id="citeModalLabel"><span data-lang="en">Cite</span><span data-lang="es" hidden>Citar</span></h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
            '<div class="modal-body"><pre id="citeText" class="cite-box">Loading…</pre></div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" id="citeCopyBtn"><i class="fa-regular fa-copy"></i> <span data-lang="en">Copy</span><span data-lang="es" hidden>Copiar</span></button>' +
              '<a class="btn btn-primary" id="citeDownloadBtn" download><i class="fa-solid fa-download"></i> <span data-lang="en">Download .bib</span><span data-lang="es" hidden>Descargar .bib</span></a>' +
            '</div>' +
          '</div></div>' +
        '</div>';
    document.body.appendChild(wrap.firstChild);
}
// Modal del DOI: muestra el identificador, con "Copiar DOI" e "Ir a la página".
function injectDoiModal() {
    if (document.getElementById('doiModal')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
        '<div class="modal fade" id="doiModal" tabindex="-1" aria-labelledby="doiModalLabel" aria-hidden="true">' +
          '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
            '<div class="modal-header"><h5 class="modal-title" id="doiModalLabel">DOI</h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
            '<div class="modal-body"><code id="doiText" class="doi-box">—</code></div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" id="doiCopyBtn"><i class="fa-regular fa-copy"></i> <span data-lang="en">Copy DOI</span><span data-lang="es" hidden>Copiar DOI</span></button>' +
              '<a class="btn btn-primary" id="doiGoBtn" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span data-lang="en">Open page</span><span data-lang="es" hidden>Ir a la página</span></a>' +
            '</div>' +
          '</div></div>' +
        '</div>';
    document.body.appendChild(wrap.firstChild);
}
function initPubChips() {
    if (window.__pubChipsInit) return;
    window.__pubChipsInit = true;
    injectCiteModal();
    injectDoiModal();
    var modalEl = document.getElementById('citeModal');
    var modal = (window.bootstrap && modalEl) ? new bootstrap.Modal(modalEl) : null;
    var preEl = document.getElementById('citeText');
    var dlBtn = document.getElementById('citeDownloadBtn');
    var copyBtn = document.getElementById('citeCopyBtn');
    var cache = {}, curText = '';
    var doiModalEl = document.getElementById('doiModal');
    var doiModal = (window.bootstrap && doiModalEl) ? new bootstrap.Modal(doiModalEl) : null;
    var doiTextEl = document.getElementById('doiText');
    var doiGoBtn = document.getElementById('doiGoBtn');
    var doiCopyBtn = document.getElementById('doiCopyBtn');
    var curDoi = '';
    function openDoi(raw, url) {
        curDoi = raw || '';
        if (doiTextEl) doiTextEl.textContent = raw || '—';
        if (doiGoBtn) { if (url) doiGoBtn.href = url; else doiGoBtn.removeAttribute('href'); }
        if (doiModal) doiModal.show();
        else if (url) window.open(url, '_blank', 'noopener');
    }
    function openCite(key, url) {
        curText = '';
        if (preEl) preEl.textContent = 'Loading…';
        if (dlBtn) dlBtn.removeAttribute('href');
        if (modal) modal.show();
        Promise.resolve().then(function () {
            if (url in cache) return cache[url];
            return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('not found'); return r.text(); }).then(function (t) { cache[url] = t.trim(); return cache[url]; });
        }).then(function (text) {
            curText = text;
            if (preEl) preEl.textContent = text;
            if (dlBtn) { var blob = new Blob([text], { type: 'application/x-bibtex' }); dlBtn.href = URL.createObjectURL(blob); dlBtn.setAttribute('download', key + '.bib'); }
        }).catch(function () { if (preEl) preEl.textContent = 'Could not load the BibTeX entry.'; });
    }
    function escHtml(s) { return (s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function highlightAbs(text, query) {
        var html = escHtml(text);
        (query || '').trim().split(/\s+/).filter(function (t) { return t.length >= 2; }).forEach(function (t) {
            var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            html = html.replace(re, '<mark>$1</mark>');
        });
        return html;
    }
    document.addEventListener('click', function (ev) {
        var t = ev.target;
        if (!t || !t.closest) return;
        var cite = t.closest('.cite-btn');
        if (cite) { openCite(cite.getAttribute('data-bibkey'), cite.getAttribute('data-biburl')); return; }
        var dbtn = t.closest('.doi-btn');
        if (dbtn) { openDoi(dbtn.getAttribute('data-doi'), dbtn.getAttribute('data-doi-url')); return; }
        var ab = t.closest('.abs-btn');
        if (ab) {
            var li = ab.closest('li.pub-item');
            var box = li && li.querySelector('.abs-box');
            if (!box) return;
            var opening = box.hidden;
            if (opening) {
                var src = document.getElementById('pub-search');
                var txt = (window.__ABSTRACTS__ && window.__ABSTRACTS__[ab.getAttribute('data-bibkey')]) || '';
                box.innerHTML = highlightAbs(txt, src ? src.value : '');
            }
            box.hidden = !opening;
            ab.classList.toggle('active', opening);
        }
    });
    if (copyBtn) copyBtn.addEventListener('click', function () {
        if (!curText) return;
        var done = function () { var old = copyBtn.innerHTML; copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied'; setTimeout(function () { copyBtn.innerHTML = old; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(curText).then(done).catch(done); }
        else { var ta = document.createElement('textarea'); ta.value = curText; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); done(); }
    });
    if (doiCopyBtn) doiCopyBtn.addEventListener('click', function () {
        if (!curDoi) return;
        var old = doiCopyBtn.innerHTML;
        var done = function () { doiCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied</span>'; setTimeout(function () { doiCopyBtn.innerHTML = old; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(curDoi).then(done).catch(done); }
        else { var ta = document.createElement('textarea'); ta.value = curDoi; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); done(); }
    });
}

function __renderPaperLI(e) {
    var f = e.fields;
    var title = __decodeAccents(f.title || 'Untitled');
    var year = (f.year || '').trim();
    var authors = __formatAuthors(f.author || '');
    var venue = f.journal ? ('<em>' + __decodeAccents(f.journal) + '</em>')
              : (f.booktitle ? ('<em>' + __decodeAccents(f.booktitle) + '</em>') : '');
    var doi = (f.doi || '').trim();
    var doiURL = !doi ? '' : (doi.indexOf('http') === 0 ? doi : (doi.indexOf('10.') === 0 ? 'https://doi.org/' + doi : doi));
    var etype = f.journal ? 'article' : (f.booktitle ? 'inproceedings' : 'misc');
    var chips = buildPaperChips({ key: e.key, arxiv: (f.arxiv || f.eprint || ''), url: f.url, doi: doiURL });
    var hasAbs = !!(window.__ABSTRACTS__ && window.__ABSTRACTS__[e.key]);
    var safeId = (e.key || 'nokey').replace(/[^a-z0-9_-]/gi, '_');
    return '<li id="pub_' + safeId + '" class="pub-item" data-entrytype="' + etype + '" data-bibkey="' + e.key + '">' +
           '<em>' + authors + '</em>, <strong>"' + title + ',"</strong> ' +
           venue + (year ? (venue ? ', ' : '') + year : '') + '.' +
           '<div class="mt-1 btns">' + chips + '</div>' +
           (hasAbs ? '<div class="abs-box" hidden></div>' : '') +
           '</li>';
}
function loadFeaturedPapers(listId, source) {
    var list = document.getElementById(listId || 'featured-papers-list');
    if (!list) return;
    var keys = (list.getAttribute('data-keys') || '').split(',').map(function (k) { return k.trim(); }).filter(Boolean);
    if (!keys.length) return;
    Promise.all([
        fetch((source || '/data/publications/all_publications.bib') + '?v=' + __ASSET_VER)
            .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error('bib ' + r.status)); }),
        __loadPubMeta()
    ]).then(function (res) {
        var bib = res[0];
        var html = keys.map(function (k) { var e = __bibEntry(bib, k); return e ? __renderPaperLI(e) : ''; }).filter(Boolean).join('');
        if (!html) return;
        list.innerHTML = html;
        translateTree(list, window.__lang);
    }).catch(function (e) { console.error('Featured papers:', e); });
}

function injectBackToTop() {
    if (document.getElementById('to-top')) return;
    var b = document.createElement('button');
    b.id = 'to-top'; b.type = 'button';
    b.setAttribute('aria-label', 'Back to top');
    b.innerHTML = '<i class="fas fa-arrow-up"></i>';
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(b);
    var onScroll = function () {
        var show = (window.scrollY || document.documentElement.scrollTop || 0) > 400;
        b.style.opacity = show ? '0.92' : '0';
        b.style.pointerEvents = show ? 'auto' : 'none';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

function __onReady() {
    injectNavbar();
    injectFooter();
    injectBackToTop();
    // Traducir el contenido propio de la página (la navbar/footer se traducen al inyectarse)
    document.documentElement.setAttribute('lang', window.__lang);
    translateTree(document, window.__lang);
    renderLangBadges(document);          // badges de idioma desde data-flang
    loadFeaturedProjects('featured-grid'); // escaparate de la home (si existe #featured-grid)
    initPubChips();                        // motor compartido de Cite/Abstract (home + publications)
    loadFeaturedPapers('featured-papers-list'); // artículos seleccionados (si existe #featured-papers-list)
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __onReady);
} else {
    __onReady();
}
