// js/provider-guard.js
(function providerGuard() {
    const token = localStorage.getItem('access_token');
    
    // FIXED: Your login file is index.html
    let currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // 1. If NO token, force them to stay on the login page
    if (!token) {
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.replace('index.html');
        }
        return;
    }

    try {
        const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        
        // 2. STRICT ROLE CHECK (Patients and Admins cannot access this)
        if (payload.role === 'user' || payload.role === 'admin') {
            console.warn("Security Alert: Unauthorized Role.");
            localStorage.removeItem('access_token');
            // FIXED: Using absolute live URL so it never 404s
            window.location.replace('https://dillip-j.github.io/Vision-24-7/'); 
            return;
        }

        // 3. If they are an approved Provider and land on the login page, push to dashboard
        if (currentPage === 'index.html' || currentPage === '') {
            window.location.replace('provider-dash.html'); 
        }

    } catch (error) {
        // If the token is corrupted, destroy it and kick them back to login
        localStorage.removeItem('access_token');
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.replace('index.html');
        }
    }
})();