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

    // --- 1. Session Guard ---
    const activeProviderSession = localStorage.getItem('currentProvider');
    if (activeProviderSession) {
        window.location.replace('provider-dash.html');
        return; 
    }

    // --- 2. Theme Toggling ---
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

    // --- 3. Tab Switching ---
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

    // --- 4. Dynamic Form Shape-Shifting ---
    const typeSelect = document.getElementById('provider-type-select');
    const nameLabel = document.getElementById('dynamic-name-label');
    const nameInput = document.getElementById('dynamic-name-input');
    const licenseLabel = document.getElementById('dynamic-license-label');
    const licenseInput = document.getElementById('dynamic-license-input');
    const uploadLabel = document.getElementById('dynamic-upload-label');
    const catLabel = document.getElementById('dynamic-category-label');
    const catSelect = document.getElementById('dynamic-category-select');
    const brandIcon = document.getElementById('dynamic-brand-icon');

    const updateFormUI = () => {
        const val = typeSelect.value;
        catSelect.innerHTML = ''; // Clear options

        if (val === 'Pharmacy') {
            brandIcon.className = 'fa-solid fa-pills';
            nameLabel.textContent = 'Medical Shop Name *';
            nameInput.placeholder = 'e.g. City Care Pharmacy';
            licenseLabel.textContent = 'Pharmacy / Drug License No. *';
            licenseInput.placeholder = 'e.g. DL-12345678';
            uploadLabel.textContent = 'Upload Pharmacy License & Shop Registration (PDF)';
            catLabel.textContent = 'Primary Service *';
            catSelect.innerHTML = `<option value="Medicines">Medicines & Prescription Delivery</option><option value="Medical Equipment">Medical Equipment Sales</option>`;
        } 
        else if (val === 'Lab') {
            brandIcon.className = 'fa-solid fa-flask';
            nameLabel.textContent = 'Diagnostic Lab Name *';
            nameInput.placeholder = 'e.g. Precision Diagnostics';
            licenseLabel.textContent = 'NABL / Clinical Establishment No. *';
            licenseInput.placeholder = 'e.g. NABL-98765';
            uploadLabel.textContent = 'Upload Lab Accreditation Certificate (PDF)';
            catLabel.textContent = 'Test Category *';
            catSelect.innerHTML = `<option value="Blood Tests">Blood & Pathology Tests</option><option value="Radiology">Radiology (X-Ray/MRI)</option><option value="Full Body">Full Body Checkups</option>`;
        } 
        else {
            brandIcon.className = 'fa-solid fa-user-doctor';
            nameLabel.textContent = 'Doctor Full Name *';
            nameInput.placeholder = 'Dr. John Doe';
            licenseLabel.textContent = 'Medical Council License No. *';
            licenseInput.placeholder = 'e.g. MCI-12345';
            uploadLabel.textContent = 'Upload Medical Degree & License (PDF)';
            catLabel.textContent = 'Specialization *';
            catSelect.innerHTML = `
                <option value="General Physician">General Physician</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="Orthopedic">Orthopedic</option>
                <option value="Pediatrician">Pediatrician</option>
                <option value="Dermatologist">Dermatologist</option>
            `;
        }
    };

    if (typeSelect) {
        typeSelect.addEventListener('change', updateFormUI);
        updateFormUI(); 
    }

   // ==========================================
    // --- 5. Registration Logic (BULLETPROOF) ---
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
            
            // 🚨 SECURITY FIX: Targeting by ID, not by Array Index!
            // Note: Make sure your HTML inputs actually have these ID attributes!
            const name = document.getElementById('dynamic-name-input').value;
            const email = document.getElementById('provider-signup-email').value.toLowerCase();
            const phone = document.getElementById('provider-signup-phone').value;
            const password = document.getElementById('provider-signup-password').value;
            const license = document.getElementById('dynamic-license-input').value; 

            const providerData = {
                name: name,
                email: email,
                password: password,
                phone: phone,
                provider_type: typeSelect.value, 
                address: "", 
                latitude: null,
                longitude: null,
                profile_photo_url: null,
                license_document_url: null
            };

            const submitBtn = formSignup.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Submitting...";
            submitBtn.disabled = true;

            try {
                // Config.js provides API_BASE globally!
                const response = await fetch(`${API_BASE}/providers/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(providerData)
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

                alert(`Success! Your ${typeSelect.value} application has been sent to the Admin for verification.`);
                switchTab(true); 
                formSignup.reset();
                updateFormUI();

            } catch (err) {
                console.error(err);
                alert("Server connection failed. The server is currently disconnected.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // --- 6. Login Logic (REAL API CONNECTED) ---
    // ==========================================
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 🚨 SECURITY FIX: Targeting by ID!
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
                    body: JSON.stringify({
                        email: loginEmail,
                        password: loginPassword
                    })
                });

                if (response.status === 403) {
                    alert("Your account is still pending Admin approval. Please check back later.");
                    return;
                }

                if (!response.ok) {
                    alert("Invalid email or password.");
                    return;
                }

                const data = await response.json();

                // SECURITY: Save the Provider JWT Token!
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('currentProvider', JSON.stringify(data.provider));

                window.location.replace('provider-dash.html');

            } catch (err) {
                console.error(err);
                alert("Server connection failed. The server is currently disconnected.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});