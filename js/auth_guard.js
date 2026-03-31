// js/provider/provider-guard.js

(function providerGuard() {
    const token = localStorage.getItem('access_token');
    let currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (!token) {
        if (currentPage !== 'index.html') {
            window.location.replace('index.html');
        }
        return;
    }

    try {
        const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        
        // STRICT ROLE CHECK (Must NOT be user or admin)
        if (payload.role === 'user' || payload.role === 'admin') {
            console.warn("Security Alert: Unauthorized Role.");
            window.location.replace('../patient/index.html'); 
            return;
        }

        if (currentPage === 'index.html') {
            window.location.replace('provider-dash.html'); 
        }

    } catch (error) {
        localStorage.removeItem('access_token');
        window.location.replace('index.html');
    }
})();