// js/provider-auth.js
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // --- 0. GLOBAL ROUTING ENGINE ---
    // ==========================================
    document.querySelectorAll('[data-nav]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault(); 
            const targetPage = element.getAttribute('data-nav');
            window.location.assign(targetPage);
        });
    });

    // --- 1. Theme Toggling ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    if (themeToggleBtn && themeIcon) {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fa-solid fa-sun';
        }
        themeToggleBtn.addEventListener('click', () => {
            if (document.documentElement.getAttribute('data-theme') === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeIcon.className = 'fa-regular fa-moon';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.className = 'fa-solid fa-sun';
            }
        });
    }

    // --- 2. Tab Switching ---
    const tabLogin = document.getElementById('tab-provider-login');
    const tabSignup = document.getElementById('tab-provider-signup');
    const formLogin = document.getElementById('form-provider-login');
    const formSignup = document.getElementById('form-provider-signup');

    function switchTab(showLogin) {
        if (showLogin) {
            tabLogin.classList.add('active'); tabSignup.classList.remove('active');
            formLogin.classList.add('active-form'); formSignup.classList.remove('active-form');
        } else {
            tabSignup.classList.add('active'); tabLogin.classList.remove('active');
            formSignup.classList.add('active-form'); formLogin.classList.remove('active-form');
        }
    }
    
    if (tabLogin && tabSignup) {
        tabLogin.addEventListener('click', () => switchTab(true));
        tabSignup.addEventListener('click', () => switchTab(false));
    }

    // ==========================================
    // --- 3. Registration Logic (Doctor Only MVP) ---
    // ==========================================
    [formLogin, formSignup].forEach(form => {
        if (!form) return;
        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    form.querySelector('button[type="submit"]').click();
                }
            });
        });
    });

    if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = formSignup.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Fetching Location & Submitting...";
            submitBtn.disabled = true;

            const getProviderLocation = () => {
                return new Promise((resolve) => {
                    if (!navigator.geolocation) {
                        resolve({ lat: null, lon: null });
                    } else {
                        navigator.geolocation.getCurrentPosition(
                            (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
                            (error) => resolve({ lat: null, lon: null }),
                            { timeout: 10000 } 
                        );
                    }
                });
            };

            try {
                const gps = await getProviderLocation();
                const formData = new FormData();
                
                // Hardcoded to Doctor logic for MVP
                formData.append("name", document.getElementById('dynamic-name-input').value);
                formData.append("email", document.getElementById('provider-signup-email').value.toLowerCase());
                formData.append("phone", document.getElementById('provider-signup-phone').value);
                formData.append("password", document.getElementById('provider-signup-password').value);
                formData.append("provider_type", "Doctor"); // Strict MVP lock
                formData.append("category", document.getElementById('dynamic-category-select').value);

                if (gps.lat && gps.lon) {
                    formData.append("latitude", gps.lat);
                    formData.append("longitude", gps.lon);
                }
                
                // 🚨 FILE UPLOAD CAPTURE LOGIC
                const fileInput = document.getElementById('provider-signup-license-file');
                if (fileInput && fileInput.files.length > 0) {
                    formData.append("license_document", fileInput.files[0]);
                    console.log("✅ File attached to payload:", fileInput.files[0].name);
                } else {
                    console.warn("⚠️ No file found! Check if your HTML input ID is exactly 'provider-signup-license-file'");
                }

                const response = await fetch(`${API_BASE}/providers/register`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    if (errorData.detail && typeof errorData.detail === 'string' && errorData.detail.toLowerCase().includes('already')) {
                        alert("Account already exists on this email.");
                    } else {
                        alert(`Signup Failed: ${errorData.detail}`);
                    }
                    return;
                }

                alert(`Registration Success! Your profile is pending Admin approval. You can now log in.`);
                switchTab(true); 
                formSignup.reset();

            } catch (err) {
                console.error(err);
                alert("Server connection failed. Make sure your local uvicorn server is running.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // --- 4. Login Logic ---
    // ==========================================
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const loginEmail = document.getElementById('provider-login-email').value.toLowerCase();
            const loginPassword = document.getElementById('provider-login-password').value;

            const submitBtn = formLogin.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Authenticating...";
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE}/providers/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: loginEmail, password: loginPassword })
                });

                if (response.status === 403) {
                    alert("Your account is still pending Admin approval.");
                    return;
                }

                if (!response.ok) {
                    alert("Invalid email or password.");
                    return;
                }

                const data = await response.json();

                localStorage.setItem('provider_token', data.access_token);
                localStorage.setItem('currentProvider', JSON.stringify(data.provider));

                window.location.replace('provider-dash.html');

            } catch (err) {
                console.error(err);
                alert("Server connection failed. Make sure your local uvicorn server is running.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}); 

// ==========================================
// --- Password Visibility Toggle ---
// ==========================================
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const inputField = document.getElementById(targetId);
        
        if (inputField) {
            const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
            inputField.setAttribute('type', type);
            
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        }
    });
});