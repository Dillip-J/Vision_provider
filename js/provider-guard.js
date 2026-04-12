// js/provider-guard.js
(function providerGuard() {
    // 🚨 Check for the specific provider token
    const token = localStorage.getItem('provider_token'); 
    const currentUrl = window.location.href;
    
    // Check exactly which page we are on inside the /provider/ folder
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
        // 2. TOKEN EXISTS: Let's check who they are
        const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        
        // If a PATIENT or ADMIN somehow got here, kick them back to the main patient site
        if (payload.role === 'user' || payload.role === 'admin') {
            console.warn("Unauthorized Role: Redirecting to Patient Portal...");
            localStorage.removeItem('provider_token');
            window.location.replace('https://dillip-j.github.io/Vision-24-7/'); 
            return;
        }

        // 3. IF VALID PROVIDER: Push them to the dashboard if they are sitting on the login page
        if (isProviderLogin) {
            window.location.replace('provider-dash.html'); 
        }

    } catch (error) {
        // If token is corrupted, destroy it and kick to login
        console.error("Corrupted token destroyed.");
        localStorage.removeItem('provider_token');
        localStorage.removeItem('currentProvider');
        if (isDashboard) {
            window.location.replace('index.html');
        }
    }
})();