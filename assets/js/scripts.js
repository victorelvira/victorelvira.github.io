// Automatic year
// document.getElementById('currentYear').textContent = new Date().getFullYear();

// Load the navbar from nav.html into the placeholder
function loadNavbar() {
    console.log("Attempting to fetch the navbar...");
    fetch('nav.html')
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
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
            // Update the year once the footer is loaded
            const currentYearElement = document.getElementById('currentYear');
            if (currentYearElement) {
                currentYearElement.textContent = new Date().getFullYear();
            }
            // const currentYearElement = document.getElementById('currentDate');
            // if (currentYearElement) {
            //     currentYearElement.textContent = new Date().getSeconds();
            // }
        })
        .catch(error => console.error("Error loading footer:", error));
}

window.onload = function() {
    loadNavbar();
    loadFooter();
};
