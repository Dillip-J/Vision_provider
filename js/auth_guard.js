// js/provider-guard.js
(function providerGuard() {
    const token = localStorage.getItem('access_token');
    const path = window.location.pathname;
    
    // Check if we are currently on the login page
    // This works better for GitHub Pages subfolders
    const isLoginPage = path.endsWith('/provider/') || path.endsWith('/provider/index.html');
    const isDashboard = path.includes('provider-dash.html');

    // 1. If NO token, and trying to access dashboard, kick to provider login
    if (!token) {
        if (isDashboard) {
            console.log("No token found, redirecting to provider login...");
            window.location.replace('index.html');
        }
        return;
    }

    try {
        // Decode the JWT
        const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        
        // 2. STRICT ROLE CHECK 
        // If a Patient (user) tries to enter the Provider area, send them to the main Patient site
        if (payload.role === 'user') {
            console.warn("Patient attempting to access Provider portal. Redirecting...");
            window.location.replace('https://dillip-j.github.io/Vision-24-7/'); 
            return;
        }

        // 3. If they ARE a provider and are sitting on the login page, push them to dashboard
        if (isLoginPage) {
            window.location.replace('provider-dash.html'); 
        }

    } catch (error) {
        // If the token is invalid/expired, clear it
        localStorage.removeItem('access_token');
        if (isDashboard) {
            window.location.replace('index.html');
        }
    }
})();