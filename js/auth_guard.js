// js/provider-guard.js

(function providerGuard() {
    const token = localStorage.getItem('access_token');
    let currentPage = window.location.pathname.split('/').pop() || 'provider-auth.html';

    // 1. If they have no token and aren't on the auth page, kick them to auth
    if (!token) {
        if (currentPage !== 'provider-auth.html' && currentPage !== '') {
            window.location.replace('provider-auth.html');
        }
        return;
    }

    try {
        const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        
        // 2. STRICT ROLE CHECK (Patients cannot access this)
        if (payload.role === 'user' || payload.role === 'admin') {
            console.warn("Security Alert: Unauthorized Role.");
            localStorage.removeItem('access_token');
            window.location.replace('../index.html'); // Kick back to main patient site
            return;
        }

        // 3. If they have a token and are on the auth page, push to dashboard
        if (currentPage === 'provider-auth.html' || currentPage === '') {
            window.location.replace('provider-dash.html'); 
        }

    } catch (error) {
        localStorage.removeItem('access_token');
        window.location.replace('provider-auth.html');
    }
})();