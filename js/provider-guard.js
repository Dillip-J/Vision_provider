// js/provider-guard.js
(function providerGuard() {
    // 🚨 THE FIX: Providers now use their own exclusive token memory!
    const token = localStorage.getItem('provider_token'); 
    const currentUrl = window.location.href;
    
    const isDashboard = currentUrl.includes('provider-dash.html');
    const isProviderLogin = currentUrl.includes('/provider/index.html') || 
                            (currentUrl.endsWith('/provider/') && !isDashboard);

    // 1. IF NO TOKEN: Kick them out of the dashboard
    if (!token) {
        if (isDashboard) {
            console.warn("No Provider Token: Redirecting to Provider Login...");
            window.location.replace('index.html');
        }
        return; 
    }

    try {
        const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        
        // If a PATIENT somehow got here (which they shouldn't anymore), kick them
        if (payload.role === 'user' || payload.role === 'admin') {
            localStorage.removeItem('provider_token');
            window.location.replace('https://dillip-j.github.io/Vision-24-7/'); 
            return;
        }

        // 3. IF VALID PROVIDER: Push them to the dashboard if they are on the login page
        if (isProviderLogin) {
            window.location.replace('provider-dash.html'); 
        }

    } catch (error) {
        localStorage.removeItem('provider_token');
        localStorage.removeItem('currentProvider');
        if (isDashboard) {
            window.location.replace('index.html');
        }
    }
})();