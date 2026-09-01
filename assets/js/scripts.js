// Automatic year
// document.getElementById('currentYear').textContent = new Date().getFullYear();

// Load the navbar from nav.html into the placeholder
function loadNavbar() {
    console.log("Attempting to fetch the navbar...");
    fetch('/nav.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            console.log("Navbar successfully fetched!");
            document.getElementById('navbar-placeholder').innerHTML = data;
        })
        .catch(error => {
            console.error("Error fetching the navbar:", error);
        });
}

window.onload = loadNavbar;



// Load the footer from footer.html into the placeholder
function loadFooter() {
    fetch('/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
            // Update the year once the footer is loaded
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
        .catch(error => console.error("Error loading footer:", error));
}

document.addEventListener("DOMContentLoaded", () => {
    loadNavbar();
    loadFooter();
});
