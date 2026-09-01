// Carga la navbar (nav.html) y el footer (footer.html) compartidos y los inyecta
// en sus placeholders. Para que la navbar NO tarde en aparecer:
//   1) Las descargas arrancan cuanto antes: en cuanto se evalúa este script (en el
//      <head>), en paralelo con el parseo del HTML. No se espera a window.onload
//      (que es lo más tardío: aguarda imágenes, fuentes, etc. -> causaba el retraso).
//   2) La inyección se hace en DOMContentLoaded, cuando ya existen los placeholders.

const __navbarPromise = fetch('/nav.html').then(r => r.ok ? r.text() : Promise.reject(new Error('nav.html ' + r.status)));
const __footerPromise = fetch('/footer.html').then(r => r.ok ? r.text() : Promise.reject(new Error('footer.html ' + r.status)));

function injectNavbar() {
    __navbarPromise
        .then(html => {
            const el = document.getElementById('navbar-placeholder');
            if (el) el.innerHTML = html;
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
                        lastUpdateElement.textContent = 'Last updated: ' +
                            d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
                    })
                    .catch(() => {});
            }
        })
        .catch(error => console.error('Error loading footer:', error));
}

// Inyecta en cuanto el DOM esté listo (los placeholders ya existen). Si el script
// se cargara tarde (DOM ya parseado), inyecta de inmediato.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectNavbar(); injectFooter(); });
} else {
    injectNavbar();
    injectFooter();
}
