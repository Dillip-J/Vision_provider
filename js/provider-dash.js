// provider-dash.js

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // --- 1. BULLETPROOF JWT AUTH GUARD ---
    // ==========================================
    const token = localStorage.getItem('access_token');
    const currentProviderString = localStorage.getItem('currentProvider'); // Stored during login

    if (!token || !currentProviderString) { 
        window.location.href = 'index.html'; 
        return; 
    }

    let currentProvider;
    try { 
        currentProvider = JSON.parse(currentProviderString); 
    } catch (error) {
        localStorage.removeItem('currentProvider');
        localStorage.removeItem('access_token');
        window.location.href = 'index.html'; 
        return;
    }

    const providerId = currentProvider.provider_id;
    const providerName = currentProvider.name || "Provider";
    const providerType = currentProvider.type || "Doctor"; 

    // --- INITIALIZE DASHBOARD ---
    // We update the profile photo immediately from local storage if available
    const profileImgElement = document.getElementById("provider-profile-img");
    if (profileImgElement && currentProvider.profile_photo_url) {
        profileImgElement.src = `${API_BASE}${currentProvider.profile_photo_url}`;
    }
    
    setupDocumentUpload();

    // ==========================================
    // --- 2. DYNAMIC UI ADAPTATION ---
    // ==========================================
    const welcomeEl = document.getElementById('welcome-message');
    const clinicEl = document.getElementById('clinic-name');
    const initialsEl = document.getElementById('header-initials');

    if(welcomeEl) welcomeEl.textContent = providerType === 'Doctor' ? `Dr. ${providerName.replace('Dr. ', '')}` : providerName;
    if(clinicEl) clinicEl.textContent = `${currentProvider.category || "General"} • ${providerType}`;
    
    if(initialsEl) {
        const parts = providerName.replace('Dr. ', '').trim().split(' ');
        initialsEl.textContent = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : `${parts[0][0]}X`.toUpperCase();
    }

    // --- Transform Tab Names based on Business Type ---
    const tabApt = document.getElementById('tab-appointments');
    const tabRec = document.getElementById('tab-records');
    const tabSched = document.getElementById('tab-schedule');
    const pendingTitle = document.getElementById('pending-title');

    if (providerType === 'Lab') {
        if(tabApt) tabApt.innerHTML = '<i class="fa-solid fa-flask"></i> Lab Test Orders';
        if(tabRec) tabRec.innerHTML = '<i class="fa-solid fa-file-waveform"></i> Uploaded Results';
        if(pendingTitle) pendingTitle.textContent = "Pending Sample Collections";
    } else if (providerType === 'Pharmacy') {
        if(tabApt) tabApt.innerHTML = '<i class="fa-solid fa-pills"></i> Medicine Orders';
        if(tabRec) tabRec.innerHTML = '<i class="fa-solid fa-receipt"></i> Delivery History';
        if(pendingTitle) pendingTitle.textContent = "Pending Medicine Deliveries";
        if(tabSched) tabSched.style.display = 'none'; // Pharmacies don't need hourly slots
    } else {
        if(tabApt) tabApt.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Patient Consults';
    }

    // ==========================================
    // --- 3. THEME TOGGLING ---
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    if (themeToggleBtn && themeIcon) {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fa-solid fa-sun';
        }

        themeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
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

    // ==========================================
    // --- 4. VIEW TOGGLING LOGIC ---
    // ==========================================
    const tabs = {
        appointments: { btn: tabApt, view: document.getElementById('view-appointments'), render: loadAppointments },
        schedule: { btn: tabSched, view: document.getElementById('view-schedule'), render: loadScheduleManager },
        records: { btn: tabRec, view: document.getElementById('view-records'), render: renderPatientRecords },
        earnings: { btn: document.getElementById('tab-earnings'), view: document.getElementById('view-earnings'), render: renderEarnings }
    };

    function switchTab(tabKey) {
        Object.values(tabs).forEach(tab => {
            if(tab.btn) tab.btn.classList.remove('active');
            if(tab.view) tab.view.style.display = 'none';
        });
        if(tabs[tabKey].btn) tabs[tabKey].btn.classList.add('active');
        if(tabs[tabKey].view) tabs[tabKey].view.style.display = 'block';
        if(tabs[tabKey].render) tabs[tabKey].render(); 
    }

    if(tabs.appointments.btn) tabs.appointments.btn.addEventListener('click', (e) => { e.preventDefault(); switchTab('appointments'); });
    if(tabs.schedule.btn) tabs.schedule.btn.addEventListener('click', (e) => { e.preventDefault(); switchTab('schedule'); });
    if(tabs.records.btn) tabs.records.btn.addEventListener('click', (e) => { e.preventDefault(); switchTab('records'); });
    if(tabs.earnings.btn) tabs.earnings.btn.addEventListener('click', (e) => { e.preventDefault(); switchTab('earnings'); });

    // ==========================================
    // --- 5. SECURE API FETCHERS ---
    // ==========================================
    async function fetchMyDashboard() {
        try {
            const response = await fetch(`${API_BASE}/providers/dashboard/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if(response.status === 401) {
                    alert("Session expired. Please log in again.");
                    localStorage.removeItem('access_token');
                    window.location.href = 'index.html'; 
                }
                throw new Error("Failed to fetch dashboard data");
            }
            return await response.json(); 
        } catch (error) {
            console.error("Fetch Dashboard Error:", error);
            return { items: [] }; 
        }
    }

    // ==========================================
    // --- 6. VIEW: APPOINTMENTS / ORDERS ---
    // ==========================================
    async function loadAppointments() {
        const listEl = document.getElementById('provider-appointments-list');
        if(listEl) listEl.innerHTML = '<div style="text-align:center; padding: 20px;">Loading securely from server...</div>';

        const dashboardData = await fetchMyDashboard();
        const myBookings = dashboardData.items || []; 
        
        const upcomingBookings = myBookings.filter(b => b.status === 'pending' || b.status === 'confirmed');
        const completedBookings = myBookings.filter(b => b.status === 'completed');

        const statsContainer = document.getElementById('provider-stats');
        if(statsContainer) {
            const labelStr = providerType === 'Pharmacy' ? 'Orders' : (providerType === 'Lab' ? 'Tests' : 'Patients');
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-info"><span>Total ${labelStr}</span><strong>${myBookings.length}</strong></div>
                    <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info"><span>Pending</span><strong class="text-blue">${upcomingBookings.length}</strong></div>
                    <div class="stat-icon"><i class="fa-regular fa-calendar-check"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info"><span>Completed</span><strong class="text-green">${completedBookings.length}</strong></div>
                    <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: var(--success-green);"><i class="fa-solid fa-check-double"></i></div>
                </div>
            `;
        }

        if(!listEl) return;
        listEl.innerHTML = '';

        if (upcomingBookings.length === 0) {
            listEl.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 12px;">No pending requests at the moment.</div>`;
            return;
        }

        upcomingBookings.forEach(apt => {
            const clientLabel = apt.client_name || "Patient";
            const shortId = apt.booking_id ? apt.booking_id.split('-')[0] : "N/A"; 
            
            // ONLINE CONNECTION LOGIC
            const isOnline = apt.service_name.toLowerCase().includes('video') || 
                             apt.service_name.toLowerCase().includes('online') ||
                             apt.address === "Not Provided" || apt.address === null; 
            
            let actionButtons = '';
            
            if (isOnline && providerType === 'Doctor') {
                actionButtons += `
                    <button class="btn-primary" style="background-color: #10B981; margin-right: 10px;" onclick="window.open('video-room.html?room=${apt.booking_id}', '_blank')">
                        <i class="fa-solid fa-video"></i> Join Call
                    </button>
                `;
            }

            actionButtons += `
                <button class="btn-upload" onclick="openUploadModal('${apt.booking_id}', '${clientLabel}')">
                    <i class="fa-solid fa-check"></i> Process
                </button>
            `;

            listEl.innerHTML += `
                <div class="provider-apt-card">
                    <div class="apt-details">
                        <h3>${clientLabel}</h3>
                        <div class="text-secondary" style="font-size: 0.9rem;">ID: ${shortId} • ${apt.service_name}</div>
                        <div class="apt-meta">
                            <div><i class="fa-regular fa-clock text-blue"></i> ${apt.time}</div>
                            ${isOnline ? '<div style="color: #10B981;"><i class="fa-solid fa-wifi"></i> Online Consult</div>' : `<div><i class="fa-solid fa-location-dot"></i> ${apt.address}</div>`}
                        </div>
                    </div>
                    <div style="display: flex;">
                        ${actionButtons}
                    </div>
                </div>
            `;
        });
    }

    // ==========================================
    // --- 7. DYNAMIC UPLOAD MODAL ---
    // ==========================================
    const modal = document.getElementById('upload-modal');
    window.openUploadModal = function(bookingId, patientName) {
        const idInput = document.getElementById('record-booking-id');
        const displayId = document.getElementById('record-display-id');
        const patName = document.getElementById('record-patient-name');
        
        if (idInput) idInput.value = bookingId;
        if (displayId) displayId.textContent = bookingId.split('-')[0];
        if (patName) patName.textContent = patientName;
        
        const noteLabel = document.getElementById('modal-notes-label');
        const uploadLabel = document.getElementById('modal-upload-label');
        const notesInput = document.getElementById('record-notes');
        const titleEl = document.getElementById('modal-dynamic-title');
        
        if (notesInput) notesInput.value = '';
        
        if (titleEl && noteLabel && notesInput && uploadLabel) {
            if(providerType === 'Lab') {
                titleEl.textContent = "Upload Lab Results";
                noteLabel.textContent = "Test Result Summary *";
                notesInput.placeholder = "Enter key parameter findings...";
                uploadLabel.textContent = "Upload Final Lab Report (PDF/IMG)";
            } else if (providerType === 'Pharmacy') {
                titleEl.textContent = "Confirm Delivery";
                noteLabel.textContent = "Delivery Remarks *";
                notesInput.placeholder = "E.g. Handed to patient, payment collected...";
                uploadLabel.textContent = "Upload Pharmacy Invoice (Optional)";
            } else {
                titleEl.textContent = "Complete Consultation";
                noteLabel.textContent = "Clinical Notes / Diagnosis *";
                notesInput.placeholder = "Enter treatment provided...";
                uploadLabel.textContent = "Upload E-Prescription (Optional)";
            }
        }

        if (modal) modal.style.display = 'flex';
    };

    const closeBtn = document.getElementById('close-upload-btn');
    if(closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); if (modal) modal.style.display = 'none'; });

    const uploadForm = document.getElementById('form-upload-record');
    if(uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileEl = document.getElementById('record-file');
            const fileInput = fileEl ? fileEl.files[0] : null;
            const bookingId = document.getElementById('record-booking-id')?.value;
            const notes = document.getElementById('record-notes')?.value || "No notes provided";

            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.textContent = "Processing..."; submitBtn.disabled = true; }

            // 1. First API Call: Upload Document (if exists)
            let uploadedFileUrl = null;
            try {
                if (fileInput) {
                    const formData = new FormData();
                    formData.append('file', fileInput); 
                    
                    const uploadRes = await fetch(`${API_BASE}/files/medical-report/${bookingId}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }, // NO Content-Type for FormData
                        body: formData
                    });
                    
                    if (uploadRes.ok) {
                        const fileData = await uploadRes.json();
                        uploadedFileUrl = fileData.url;
                    }
                }

                alert("Processed successfully!");
                if (modal) modal.style.display = 'none';
                loadAppointments(); 

            } catch (error) {
                console.error("Completion Error:", error);
                alert("Network error occurred.");
            } finally {
                if (submitBtn) { submitBtn.textContent = "Save & Complete"; submitBtn.disabled = false; }
            }
        });
    }

    // ==========================================
    // --- 8. VIEW: PATIENT RECORDS / HISTORY ---
    // ==========================================
    async function renderPatientRecords() {
        const tbody = document.getElementById('records-list');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';

        const dashboardData = await fetchMyDashboard();
        const completedBookings = (dashboardData.items || []).filter(b => b.status === 'completed' || b.status === 'canceled');

        if(completedBookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 40px;">No completed records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        completedBookings.forEach(apt => {
            const btnClass = 'btn-download disabled';
            const btnText = `No File`;
            
            let dateStr = apt.time;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${apt.client_name || "Patient"}</strong></td>
                    <td>${dateStr}</td>
                    <td>${apt.service_name}</td>
                    <td><div class="note-preview" title="${apt.notes}">${apt.notes || "N/A"}</div></td>
                    <td><button class="${btnClass}">${btnText}</button></td>
                </tr>
            `;
        });
    }

    // ==========================================
    // --- 9. VIEW: EARNINGS ---
    // ==========================================
    async function renderEarnings() {
        const txList = document.getElementById('transactions-list');
        if(!txList) return;
        txList.innerHTML = '<div style="text-align:center;">Calculating earnings...</div>';

        const dashboardData = await fetchMyDashboard();
        const completedBookings = (dashboardData.items || []).filter(b => b.status === 'completed');
        
        let totalEarnings = completedBookings.length * 500; // Mock calculation since booking list doesn't return raw price yet

        const formattedTotal = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        }).format(totalEarnings);

        const statsEl = document.getElementById('earnings-stats');
        if(statsEl) {
            statsEl.innerHTML = `
                <div class="stat-card">
                    <div class="stat-info"><span>Total Net Earnings</span><strong style="color: var(--success-green);">₹${formattedTotal}</strong></div>
                    <div class="stat-icon" style="background: #ECFDF5; color: #10B981;"><i class="fa-solid fa-sack-dollar"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info"><span>Processed Orders</span><strong>${completedBookings.length}</strong></div>
                    <div class="stat-icon"><i class="fa-solid fa-hand-holding-medical"></i></div>
                </div>
            `;
        }

        txList.innerHTML = '';
        if(completedBookings.length === 0) {
            txList.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 12px;">No earnings generated yet.</div>`;
            return;
        }
    }

    // ==========================================
    // --- 10. SCHEDULE MANAGER (PURE JS INJECTION) ---
    // ==========================================
    async function loadScheduleManager() {
        if (providerType === 'Pharmacy') return; 

        // Target your existing HTML containers
        const dateContainer = document.getElementById('provider-date-container');
        const timeContainer = document.getElementById('provider-time-container');
        if(!dateContainer || !timeContainer) return;

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const standardTimes = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

        // 1. Inject Dynamic CSS (So you don't have to edit your CSS files)
        if(!document.getElementById('dynamic-schedule-styles')) {
            const style = document.createElement('style');
            style.id = 'dynamic-schedule-styles';
            style.innerHTML = `
                .date-scroll-container { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; }
                .btn-day-select { flex: 0 0 auto; padding: 10px 20px; border: 1px solid var(--border-color, #ccc); background: transparent; color: var(--text-primary, #fff); border-radius: 8px; cursor: pointer; white-space: nowrap; transition: 0.2s; font-family: 'Inter', sans-serif;}
                .btn-day-select.active-day { background: rgba(59, 130, 246, 0.1); border-color: var(--primary-color, #3b82f6); color: var(--primary-color, #3b82f6); font-weight: bold; }
                .time-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-bottom: 20px; }
                .btn-time-slot { padding: 12px; border: 1px solid var(--border-color, #ccc); background: transparent; color: var(--text-primary, #fff); border-radius: 8px; cursor: pointer; transition: 0.2s; text-align: center; font-family: 'Inter', sans-serif;}
                .btn-time-slot.selected-slot { background: var(--primary-color, #3b82f6); color: white; border-color: var(--primary-color, #3b82f6); }
            `;
            document.head.appendChild(style);
        }

        // 2. Render Day Buttons
        dateContainer.innerHTML = days.map(day => 
            `<button class="btn-day-select" data-day="${day}">${day}</button>`
        ).join('');

        // 3. Render Times Engine (Runs when a day is clicked)
        const renderTimes = (day) => {
            timeContainer.innerHTML = standardTimes.map(time => 
                `<button class="btn-time-slot" onclick="this.classList.toggle('selected-slot')">${time}</button>`
            ).join('');

            // Dynamically create the Save Button below the grid if it doesn't exist
            let saveBtnContainer = document.getElementById('save-schedule-container');
            if (!saveBtnContainer) {
                saveBtnContainer = document.createElement('div');
                saveBtnContainer.id = 'save-schedule-container';
                saveBtnContainer.style.marginTop = '20px';
                saveBtnContainer.innerHTML = `<button id="btn-save-schedule" class="btn-primary w-100" style="padding: 12px; border-radius: 8px; cursor: pointer;"><i class="fa-solid fa-floppy-disk"></i> Save Availability</button>`;
                timeContainer.parentElement.appendChild(saveBtnContainer);

                // Add the save logic
                document.getElementById('btn-save-schedule').onclick = () => {
                    const activeDay = document.querySelector('.btn-day-select.active-day').getAttribute('data-day');
                    const selectedSlots = Array.from(document.querySelectorAll('.selected-slot')).map(btn => btn.textContent.trim());
                    alert(`Saved ${selectedSlots.length} slots for ${activeDay}!\n(Backend Database hook required for Phase 2)`);
                };
            }
        };

        // 4. Attach Click Listeners to Days
        const dayBtns = dateContainer.querySelectorAll('.btn-day-select');
        dayBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                dayBtns.forEach(b => b.classList.remove('active-day'));
                e.currentTarget.classList.add('active-day');
                renderTimes(e.currentTarget.getAttribute('data-day'));
            });
        });

        // 5. Auto-click the first day to initialize the view
        if(dayBtns.length > 0) dayBtns[0].click();
    }

    // ==========================================
    // --- 11. PROFILE & UPLOAD DYNAMICS ---
    // ==========================================
    function setupDocumentUpload() {
        const uploadForm = document.getElementById("document-upload-form");
        if (!uploadForm) return;

        uploadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById("upload-btn");
            if (submitBtn) { submitBtn.textContent = "Uploading..."; submitBtn.disabled = true; }

            const photoEl = document.getElementById("profile-photo-input");
            const photoInput = photoEl ? photoEl.files[0] : null;

            if (!photoInput) {
                alert("Please select a photo.");
                if (submitBtn) { submitBtn.textContent = "Save Documents"; submitBtn.disabled = false; }
                return;
            }

            const formData = new FormData();
            formData.append("file", photoInput); 

            try {
                const response = await fetch(`${API_BASE}/files/provider/profile-photo`, {
                    method: "POST",
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData 
                });

                if (response.ok) {
                    const data = await response.json();
                    alert("Documents uploaded successfully!");
                    const profileImgElement = document.getElementById("provider-profile-img");
                    if (profileImgElement) profileImgElement.src = `${API_BASE}${data.url}`;
                    
                    currentProvider.profile_photo_url = data.url;
                    localStorage.setItem('currentProvider', JSON.stringify(currentProvider));

                } else {
                    const result = await response.json();
                    alert(`Upload failed: ${result.detail}`);
                }
            } catch (error) {
                console.error("Upload error:", error);
                alert("A network error occurred during upload.");
            } finally {
                if (submitBtn) { submitBtn.textContent = "Save Documents"; submitBtn.disabled = false; }
                uploadForm.reset();
            }
        });
    }

    // ==========================================
    // --- 12. PROVIDER SCOPED SEARCH ---
    // ==========================================
    const providerSearchInput = document.getElementById('provider-search');
    if (providerSearchInput) {
        providerSearchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) return;

            try {
                const response = await fetch(`${API_BASE}/providers/search-my-records?q=${query}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if(response.ok) {
                    const data = await response.json();
                    console.log("Secure Search results:", data);
                }
            } catch (err) {
                console.error("Provider Search Error:", err);
            }
        });
    }

    // ==========================================
    // --- 13. LOGOUT ---
    // ==========================================
    const doLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem('currentProvider');
        localStorage.removeItem('access_token');
        window.location.href = 'index.html'; 
    };

    const logoutBtn = document.getElementById('btn-logout');
    const mobileLogoutBtn = document.getElementById('mobile-btn-logout');
    
    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', doLogout);

    // Initial load
    switchTab('appointments');

});

// document.addEventListener('DOMContentLoaded', () => {

//     // --- 1. Session Authorization ---
//     const currentProvider = JSON.parse(localStorage.getItem('currentProvider'));
//     if (!currentProvider) { window.location.href = 'provider-auth.html'; return; }

//     const providerName = currentProvider.name || "Doctor";
//     document.getElementById('welcome-message').textContent = `Dr. ${providerName.replace('Dr. ', '')}`;
//     document.getElementById('clinic-name').textContent = `${currentProvider.category || "Healthcare"} • ${currentProvider.type || "Provider"}`;
    
//     const parts = providerName.replace('Dr. ', '').trim().split(' ');
//     document.getElementById('header-initials').textContent = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0][0].toUpperCase();

//     // --- 2. View Toggling Logic (SPA Routing) ---
//     const tabs = {
//         appointments: { btn: document.getElementById('tab-appointments'), view: document.getElementById('view-appointments'), render: loadAppointments },
//         schedule: { btn: document.getElementById('tab-schedule'), view: document.getElementById('view-schedule'), render: loadScheduleManager },
//         records: { btn: document.getElementById('tab-records'), view: document.getElementById('view-records'), render: renderPatientRecords },
//         earnings: { btn: document.getElementById('tab-earnings'), view: document.getElementById('view-earnings'), render: renderEarnings }
//     };

//     function switchTab(tabKey) {
//         Object.values(tabs).forEach(tab => {
//             if(tab.btn) tab.btn.classList.remove('active');
//             if(tab.view) tab.view.style.display = 'none';
//         });
//         if(tabs[tabKey].btn) tabs[tabKey].btn.classList.add('active');
//         if(tabs[tabKey].view) tabs[tabKey].view.style.display = 'block';
//         if(tabs[tabKey].render) tabs[tabKey].render();
//     }

//     if(tabs.appointments.btn) tabs.appointments.btn.addEventListener('click', (e) => { e.preventDefault(); switchTab('appointments'); });
//     if(tabs.schedule.btn) tabs.schedule.btn.addEventListener('click', (e) => { e.preventDefault(); switchTab('schedule'); });
//     if(tabs.records.btn) tabs.records.btn.addEventListener('click', (e) => { e.preventDefault(); switchTab('records'); });
//     if(tabs.earnings.btn) tabs.earnings.btn.addEventListener('click', (e) => { e.preventDefault(); switchTab('earnings'); });

//     // --- DB Helper ---
//     function getMyBookings() {
//         const allBookings = JSON.parse(localStorage.getItem('bookedAppointments')) || [];
//         return allBookings.filter(b => b.doctorName === providerName);
//     }

//     // --- 3. View 1: Appointments ---
//     function loadAppointments() {
//         const myBookings = getMyBookings();
//         const upcomingBookings = myBookings.filter(b => b.status === 'upcoming');
//         const completedBookings = myBookings.filter(b => b.status === 'completed');

//         const statsContainer = document.getElementById('provider-stats');
//         if(statsContainer) {
//             statsContainer.innerHTML = `
//                 <div class="stat-card">
//                     <div class="stat-info"><span>Total Patients</span><strong>${myBookings.length}</strong></div>
//                     <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
//                 </div>
//                 <div class="stat-card">
//                     <div class="stat-info"><span>Upcoming</span><strong class="text-blue">${upcomingBookings.length}</strong></div>
//                     <div class="stat-icon"><i class="fa-regular fa-calendar-check"></i></div>
//                 </div>
//                 <div class="stat-card">
//                     <div class="stat-info"><span>Completed</span><strong class="text-green">${completedBookings.length}</strong></div>
//                     <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: var(--success-green);"><i class="fa-solid fa-check-double"></i></div>
//                 </div>
//             `;
//         }

//         const listEl = document.getElementById('provider-appointments-list');
//         if(!listEl) return;
//         listEl.innerHTML = '';

//         if (upcomingBookings.length === 0) {
//             listEl.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 12px;">No upcoming appointments.</div>`;
//             return;
//         }

//         upcomingBookings.forEach(apt => {
//             listEl.innerHTML += `
//                 <div class="provider-apt-card">
//                     <div class="apt-details">
//                         <h3>${apt.patientName || "Guest Patient"}</h3>
//                         <div class="text-secondary" style="font-size: 0.9rem;">Booking ID: ${apt.bookingId} • ${apt.visitType}</div>
//                         <div class="apt-meta">
//                             <div><i class="fa-regular fa-calendar text-blue"></i> ${apt.date}</div>
//                             <div><i class="fa-regular fa-clock text-blue"></i> ${apt.time}</div>
//                         </div>
//                     </div>
//                     <button class="btn-upload" onclick="openUploadModal('${apt.bookingId}', '${apt.patientName}')">
//                         <i class="fa-solid fa-check"></i> Complete
//                     </button>
//                 </div>
//             `;
//         });
//     }

//     // --- 4. Upload Modal Logic ---
//     const modal = document.getElementById('upload-modal');
//     window.openUploadModal = function(bookingId, patientName) {
//         document.getElementById('record-booking-id').value = bookingId;
//         document.getElementById('record-display-id').textContent = bookingId;
//         document.getElementById('record-patient-name').textContent = patientName || "Guest Patient";
//         document.getElementById('record-notes').value = '';
//         modal.style.display = 'flex';
//     };

//     document.getElementById('close-upload-btn').addEventListener('click', () => modal.style.display = 'none');
//     document.getElementById('form-upload-record').addEventListener('submit', (e) => {
//         e.preventDefault();
//         const bookingId = document.getElementById('record-booking-id').value;
//         const notes = document.getElementById('record-notes').value;
//         const fileInput = document.getElementById('record-file');

//         let allBookings = JSON.parse(localStorage.getItem('bookedAppointments')) || [];
//         const index = allBookings.findIndex(b => b.bookingId === bookingId);
        
//         if (index !== -1) {
//             allBookings[index].status = "completed";
//             allBookings[index].clinicalNotes = notes;
//             allBookings[index].completedAt = new Date().toLocaleDateString();
//             if(fileInput.files.length > 0) {
//                 allBookings[index].hasReport = true;
//                 allBookings[index].reportName = fileInput.files[0].name;
//             }
            
//             localStorage.setItem('bookedAppointments', JSON.stringify(allBookings));
//             alert("Record securely saved!");
//             modal.style.display = 'none';
//             loadAppointments(); 
//         }
//     });

//     // --- 5. View: Patient Records ---
//     function renderPatientRecords() {
//         const completedBookings = getMyBookings().filter(b => b.status === 'completed');
//         const tbody = document.getElementById('records-list');
//         tbody.innerHTML = '';

//         if(completedBookings.length === 0) {
//             tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 40px;">No patient records available yet. Complete an appointment first.</td></tr>`;
//             return;
//         }

//         completedBookings.forEach(apt => {
//             const hasReport = apt.hasReport;
//             const btnClass = hasReport ? 'btn-download' : 'btn-download disabled';
//             const btnText = hasReport ? `<i class="fa-solid fa-download"></i> Download` : `No File`;
//             const clickAction = hasReport ? `onclick="alert('Downloading ${apt.reportName} securely...')"` : ``;

//             tbody.innerHTML += `
//                 <tr>
//                     <td><strong>${apt.patientName || "Guest Patient"}</strong></td>
//                     <td>${apt.date}</td>
//                     <td>${apt.visitType}</td>
//                     <td><div class="note-preview" title="${apt.clinicalNotes}">${apt.clinicalNotes || "No notes provided."}</div></td>
//                     <td><button class="${btnClass}" ${clickAction}>${btnText}</button></td>
//                 </tr>
//             `;
//         });
//     }

//     // --- 6. View: Earnings ---
//     function renderEarnings() {
//         const completedBookings = getMyBookings().filter(b => b.status === 'completed');
        
//         // Mathematically calculate earnings (Consultation Fee + Visit Charge, assuming platform keeps the "platform fee")
//         let totalEarnings = 0;
//         completedBookings.forEach(b => {
//             let consult = parseFloat(b.consultationFee) || 0;
//             let visit = parseFloat(b.visitCharge) || 0;
//             totalEarnings += (consult + visit);
//         });

//         // Dashboard Stats
//         document.getElementById('earnings-stats').innerHTML = `
//             <div class="stat-card">
//                 <div class="stat-info"><span>Total Net Earnings</span><strong style="color: var(--success-green);">$${totalEarnings.toFixed(2)}</strong></div>
//                 <div class="stat-icon" style="background: #ECFDF5; color: #10B981;"><i class="fa-solid fa-sack-dollar"></i></div>
//             </div>
//             <div class="stat-card">
//                 <div class="stat-info"><span>Completed Sessions</span><strong>${completedBookings.length}</strong></div>
//                 <div class="stat-icon"><i class="fa-solid fa-hand-holding-medical"></i></div>
//             </div>
//             <div class="stat-card">
//                 <div class="stat-info"><span>Next Payout</span><strong>$0.00</strong></div>
//                 <div class="stat-icon" style="background: #F3E8FF; color: #9333EA;"><i class="fa-solid fa-building-columns"></i></div>
//             </div>
//         `;

//         // Transactions List
//         const txList = document.getElementById('transactions-list');
//         txList.innerHTML = '';

//         if(completedBookings.length === 0) {
//             txList.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 12px;">No earnings generated yet.</div>`;
//             return;
//         }

//         // Show transactions (newest first)
//         [...completedBookings].reverse().forEach(apt => {
//             let amount = (parseFloat(apt.consultationFee) || 0) + (parseFloat(apt.visitCharge) || 0);
//             txList.innerHTML += `
//                 <div class="transaction-item">
//                     <div class="tx-left">
//                         <div class="tx-icon"><i class="fa-solid fa-money-bill-transfer"></i></div>
//                         <div class="tx-info">
//                             <h3>Consultation: ${apt.patientName || "Guest Patient"}</h3>
//                             <p>${apt.date} • ${apt.visitType} • ID: ${apt.bookingId}</p>
//                         </div>
//                     </div>
//                     <div class="tx-amount">
//                         +$${amount.toFixed(2)}
//                         <span class="tx-status">Cleared</span>
//                     </div>
//                 </div>
//             `;
//         });
//     }

//     // --- 7. Schedule Manager (Fully Restored & Dynamic) ---
//     function loadScheduleManager() {
//         const dateContainer = document.getElementById('provider-date-container');
//         const timeContainer = document.getElementById('provider-time-container');
//         if(!dateContainer || !timeContainer) return;

//         let scheduleCurrentDate = "";

//         // Function to mathematically generate 30-min slots from 9AM to 6:30PM
//         function generateTimeSlots() {
//             const slots = [];
//             let startTime = new Date(); startTime.setHours(9, 0, 0, 0); 
//             let endTime = new Date(); endTime.setHours(18, 30, 0, 0); 

//             while (startTime <= endTime) {
//                 let hours = startTime.getHours();
//                 let mins = startTime.getMinutes();
//                 let ampm = hours >= 12 ? 'PM' : 'AM';
//                 hours = hours % 12; hours = hours ? hours : 12; 
//                 let timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
//                 slots.push(timeStr);
//                 startTime.setMinutes(startTime.getMinutes() + 30);
//             }
//             return slots;
//         }

//         const dynamicTimeSlots = generateTimeSlots();

//         function renderScheduleTimes(dateString) {
//             timeContainer.innerHTML = '';
            
//             // Check patient bookings to lock slots that are already paid for
//             const allBookings = JSON.parse(localStorage.getItem('bookedAppointments')) || [];
//             const patientBookings = allBookings.filter(b => b.doctorName === providerName && b.date === dateString).map(b => b.time);

//             // Check provider's own blocked slots
//             let allBlocks = JSON.parse(localStorage.getItem('providerBlockedSlots')) || [];
//             const myBlocks = allBlocks.filter(b => b.providerEmail === currentProvider.email && b.date === dateString).map(b => b.time);

//             dynamicTimeSlots.forEach(time => {
//                 const btn = document.createElement('button');
//                 btn.className = 'time-slot';
//                 btn.textContent = time;

//                 if (patientBookings.includes(time)) {
//                     // Patient already booked this
//                     btn.style.backgroundColor = '#F3E8FF'; btn.style.color = '#9333EA'; btn.style.borderColor = '#D8B4FE';
//                     btn.style.opacity = '0.7'; btn.style.cursor = 'not-allowed';
//                     btn.title = "Booked by a patient";
//                     btn.dataset.status = "patient_booked";
//                 } else if (myBlocks.includes(time)) {
//                     // Doctor blocked this
//                     btn.style.backgroundColor = '#FEF2F2'; btn.style.color = '#EF4444'; btn.style.borderColor = '#FCA5A5';
//                     btn.dataset.status = "blocked";
//                 } else {
//                     // Available
//                     btn.dataset.status = "available";
//                 }

//                 // Click Event to Block/Unblock
//                 if (btn.dataset.status !== "patient_booked") {
//                     btn.addEventListener('click', (e) => {
//                         e.preventDefault();
//                         allBlocks = JSON.parse(localStorage.getItem('providerBlockedSlots')) || [];

//                         if (btn.dataset.status === "available") {
//                             // Block it
//                             btn.style.backgroundColor = '#FEF2F2'; btn.style.color = '#EF4444'; btn.style.borderColor = '#FCA5A5';
//                             btn.dataset.status = "blocked";
//                             allBlocks.push({ providerEmail: currentProvider.email, doctorName: providerName, date: dateString, time: time });
//                         } else {
//                             // Unblock it
//                             btn.style.backgroundColor = ''; btn.style.color = ''; btn.style.borderColor = '';
//                             btn.dataset.status = "available";
//                             allBlocks = allBlocks.filter(b => !(b.providerEmail === currentProvider.email && b.date === dateString && b.time === time));
//                         }
                        
//                         // Save to database instantly
//                         localStorage.setItem('providerBlockedSlots', JSON.stringify(allBlocks));
//                     });
//                 }
//                 timeContainer.appendChild(btn);
//             });
//         }

//         // Generate the 7-day calendar strip dynamically
//         dateContainer.innerHTML = '';
//         const today = new Date();
//         for (let i = 0; i < 7; i++) {
//             const d = new Date(today); d.setDate(today.getDate() + i);
//             const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
//             const month = d.toLocaleDateString('en-US', { month: 'short' });
//             const dayNum = d.toLocaleDateString('en-US', { day: 'numeric' });
//             const fullStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            
//             const btn = document.createElement('button');
//             btn.className = `date-card ${i === 0 ? 'active' : ''}`;
//             btn.innerHTML = `<span>${dayName}</span><strong>${month}<br>${dayNum}</strong>`;
            
//             if(i === 0) scheduleCurrentDate = fullStr;

//             btn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 dateContainer.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
//                 btn.classList.add('active');
//                 scheduleCurrentDate = fullStr;
//                 renderScheduleTimes(scheduleCurrentDate); // Load times for clicked date
//             });
//             dateContainer.appendChild(btn);
//         }
        
//         // Initial render for today
//         renderScheduleTimes(scheduleCurrentDate);
//     }
//     // --- Initialize Default View on Page Load ---
//     loadAppointments();

//     // --- Logout Logic ---
//     document.getElementById('btn-logout').addEventListener('click', () => {
//         localStorage.removeItem('currentProvider');
//         window.location.href = 'provider-auth.html';
//     });

// }); // <--- THIS IS THE MAGIC BRACKET THAT CLOSES THE ENTIRE SCRIPT!