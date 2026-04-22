// js/provider-dash.js

document.addEventListener('DOMContentLoaded', () => {
  
    // =========================================================================
    // --- 1. AUTHENTICATION & SESSION CHECK ---
    // Protects the dashboard. If no token exists, boots user to login screen.
    // =========================================================================
    const token = localStorage.getItem('provider_token');
    const currentProviderString = localStorage.getItem('currentProvider'); 

    if (!token || !currentProviderString) { 
        window.location.replace('index.html'); 
        return; 
    }

    let currentProvider;
    try { 
        currentProvider = JSON.parse(currentProviderString); 
    } catch (e) { 
        localStorage.clear(); 
        window.location.replace('index.html'); 
        return; 
    }

    const providerType = currentProvider.type || "Doctor"; 
    const providerName = currentProvider.name || "Provider";


    // =========================================================================
    // --- 2. HEADER & UI INITIALIZATION (BULLETPROOF IMAGES) ---
    // Ensures profile images load whether they are absolute URLs or local paths.
    // =========================================================================
    const headerImg = document.getElementById("header-profile-img");
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(providerName)}&background=1E293B&color=fff&size=128`;

    if (currentProvider.profile_photo_url) {
        const photoUrl = currentProvider.profile_photo_url;
        if (photoUrl.startsWith('http')) {
            if (headerImg) headerImg.src = photoUrl;
        } else {
            if (headerImg) headerImg.src = `${API_BASE}${photoUrl}`;
        }
    } else {
        if (headerImg) headerImg.src = defaultAvatar;
    }
    
    setupDocumentUpload();

    const welcomeEl = document.getElementById('welcome-message');
    const clinicEl = document.getElementById('clinic-name');
    if(welcomeEl) welcomeEl.textContent = providerType === 'Doctor' ? `Dr. ${providerName.replace('Dr. ', '')}` : providerName;
    if(clinicEl) clinicEl.textContent = `${currentProvider.category || "General"} • ${providerType}`;


    // =========================================================================
    // --- 3. DYNAMIC DASHBOARD CONFIGURATION ---
    // Changes terminology depending on if the user is a Lab, Pharmacy, or Doctor.
    // =========================================================================
    const tabApt = document.getElementById('tab-appointments');
    const tabRec = document.getElementById('tab-records');
    const tabSched = document.getElementById('tab-schedule');
    const tabProf = document.getElementById('tab-profile');
    const tabCat = document.getElementById('tab-catalog');
    const pendingTitle = document.getElementById('pending-title');

    const catTitle = document.getElementById('catalog-title');
    const catSubtitle = document.getElementById('catalog-subtitle');
    const catModalTitle = document.getElementById('catalog-modal-title');
    const catNameLabel = document.getElementById('cat-name-label');
    const catDescLabel = document.getElementById('cat-desc-label');

    if (providerType === 'Lab') {
        if(tabApt) tabApt.innerHTML = '<i class="fa-solid fa-flask"></i> Lab Test Orders';
        if(tabRec) tabRec.innerHTML = '<i class="fa-solid fa-file-waveform"></i> Uploaded Results';
        if(pendingTitle) pendingTitle.textContent = "Active Lab Orders";
        if(catTitle) catTitle.textContent = "Lab Tests";
        if(catSubtitle) catSubtitle.textContent = "Manage the tests you can perform.";
        if(catModalTitle) catModalTitle.textContent = "Add Lab Test";
        if(catNameLabel) catNameLabel.textContent = "Test Name (e.g. Complete Blood Count)";
        if(catDescLabel) catDescLabel.textContent = "Preparation Rules (e.g. Fasting required)";
        const homeColGroup = document.getElementById('home-col-checkbox-group');
        if(homeColGroup) homeColGroup.classList.remove('hidden');

    } else if (providerType === 'Pharmacy') {
        if(tabApt) tabApt.innerHTML = '<i class="fa-solid fa-pills"></i> Medicine Orders';
        if(tabRec) tabRec.innerHTML = '<i class="fa-solid fa-receipt"></i> Delivery History';
        if(pendingTitle) pendingTitle.textContent = "Active Deliveries";
        if(tabSched) tabSched.classList.add('hidden'); 
        if(catTitle) catTitle.textContent = "Medicine Inventory";
        if(catSubtitle) catSubtitle.textContent = "Manage the drugs and items you sell.";
        if(catModalTitle) catModalTitle.textContent = "Add Medicine";
        if(catNameLabel) catNameLabel.textContent = "Medicine / Item Name";
        const rxGroup = document.getElementById('rx-checkbox-group');
        if(rxGroup) rxGroup.classList.remove('hidden');

    } else {
        if(catTitle) catTitle.textContent = "Consultation Types";
        if(catSubtitle) catSubtitle.textContent = "Manage the specific consultations you offer.";
        if(catModalTitle) catModalTitle.textContent = "Add Consultation";
        if(catNameLabel) catNameLabel.textContent = "Consultation Name (e.g. Video Follow-up)";
    }

    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    if (themeBtn) {
        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fa-solid fa-sun';
        }
        themeBtn.addEventListener('click', (e) => {
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

    // =========================================================================
    // --- 4. TAB NAVIGATION LOGIC ---
    // Manages hiding/showing views when sidebar buttons are clicked.
    // =========================================================================
    const tabs = {
        appointments: { btn: tabApt, view: document.getElementById('view-appointments'), render: loadAppointments },
        schedule: { btn: tabSched, view: document.getElementById('view-schedule'), render: loadScheduleManager },
        records: { btn: tabRec, view: document.getElementById('view-records'), render: renderPatientRecords },
        earnings: { btn: document.getElementById('tab-earnings'), view: document.getElementById('view-earnings'), render: renderEarnings },
        profile: { btn: tabProf, view: document.getElementById('view-profile'), render: loadProfileSettings },
        catalog: { btn: tabCat, view: document.getElementById('view-catalog'), render: loadCatalog }
    };

    function switchTab(tabKey) {
        Object.values(tabs).forEach(tab => {
            if(tab.btn) tab.btn.classList.remove('active');
            if(tab.view) {
                tab.view.classList.remove('active');
                tab.view.classList.add('hidden');
            }
        });
        
        if(tabs[tabKey].btn) tabs[tabKey].btn.classList.add('active');
        if(tabs[tabKey].view) {
            tabs[tabKey].view.classList.add('active');
            tabs[tabKey].view.classList.remove('hidden'); 
        }
        
        if(tabs[tabKey].render) tabs[tabKey].render(); 
    }
    
    Object.keys(tabs).forEach(key => {
        if(tabs[key].btn) tabs[key].btn.addEventListener('click', (e) => { e.preventDefault(); switchTab(key); });
    });


    // =========================================================================
    // --- 5. MASTER DASHBOARD DATA FETCHER ---
    // Pulls all appointments and provider data from FastAPI.
    // =========================================================================
    async function fetchMyDashboard() {
        try {
            const res = await fetch(`${API_BASE}/providers/dashboard/me`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            if (res.status === 401) {
                localStorage.clear();
                window.location.replace('index.html');
                return { items: [], financials: { lifetime_earnings: 0, this_month_earnings: 0 } };
            }
            if (!res.ok) throw new Error("Fetch failed");
            return await res.json(); 
        } catch (e) { 
            return { items: [], financials: { lifetime_earnings: 0, this_month_earnings: 0 } }; 
        }
    }


    // =========================================================================
    // --- 6. APPOINTMENTS / ORDERS VIEW LOGIC ---
    // Generates the pending and active booking cards.
    // =========================================================================
    async function loadAppointments() {
        const listEl = document.getElementById('provider-appointments-list');
        if(!listEl) return;
        listEl.innerHTML = '<div class="empty-state">Loading data...</div>';

        const dashboardData = await fetchMyDashboard();
        
        let myBookings = [];
        if (Array.isArray(dashboardData)) {
            myBookings = dashboardData;
        } else if (dashboardData && dashboardData.items) {
            myBookings = dashboardData.items;
        }

        const activeBookings = myBookings.filter(b => {
            const stat = (b.status || b.booking_status || '').toLowerCase();
            return stat === 'confirmed' || stat === 'pending' || stat === 'active' || stat === 'in_transit';
        });
        
        const completedBookings = myBookings.filter(b => {
            const stat = (b.status || b.booking_status || '').toLowerCase();
            return stat === 'completed';
        });

        const statsEl = document.getElementById('provider-stats');
        if(statsEl) {
            let metricName = providerType === 'Pharmacy' ? 'Orders' : (providerType === 'Lab' ? 'Tests' : 'Patients');
            statsEl.innerHTML = `
                <div class="stat-card">
                    <div class="stat-info"><span>Total ${metricName}</span><strong>${myBookings.length}</strong></div>
                    <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info"><span>Active</span><strong class="text-blue">${activeBookings.length}</strong></div>
                    <div class="stat-icon"><i class="fa-regular fa-calendar-check"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info"><span>Completed</span><strong class="text-green">${completedBookings.length}</strong></div>
                    <div class="stat-icon green"><i class="fa-solid fa-check-double"></i></div>
                </div>
            `;
        }

        if (activeBookings.length === 0) {
            listEl.innerHTML = `<div class="empty-state">No active requests at the moment.</div>`;
            return;
        }

        listEl.innerHTML = activeBookings.map(apt => {
            const patientName = apt.client_name || apt.patient_name || apt.user_name || "Unknown Patient";
            const bookingId = apt.raw_id || apt.booking_id || apt.id;
            const visitType = apt.visit_type || "Video Consult";
            const isOnline = visitType.toLowerCase().includes('video');
            const aptStatus = (apt.status || apt.booking_status || 'pending').toLowerCase();
            const aptSymptoms = apt.symptoms || apt.clinical_notes || apt.order_notes || "No details provided.";
            const aptPhone = apt.client_phone || apt.patient_phone || apt.phone || 'N/A';

            let btns = '';
            
            if (aptStatus === 'pending') {
                btns += `<button class="btn-primary" onclick="updateBookingStatus('${bookingId}', 'confirmed')"><i class="fa-solid fa-thumbs-up"></i> Accept</button>`;
                btns += `<button class="btn-outline red" onclick="updateBookingStatus('${bookingId}', 'rejected')"><i class="fa-solid fa-xmark"></i> Reject</button>`;
            } else {
                if (isOnline && providerType === 'Doctor') {
                    btns += `<button class="btn-primary green" onclick="joinSecureVideoCall('${bookingId}')"><i class="fa-solid fa-video"></i> Join Call</button>`;
                }
                btns += `<button class="btn-outline purple" onclick="openUploadModal('${bookingId}', '${patientName}')"><i class="fa-solid fa-check-double"></i> Complete</button>`;
                btns += `<button class="btn-outline red" onclick="updateBookingStatus('${bookingId}', 'canceled')"><i class="fa-solid fa-triangle-exclamation"></i> Cancel</button>`;
            }

            let notesLabel = providerType === 'Pharmacy' ? "Order Details" : (providerType === 'Lab' ? "Lab Tests" : "Symptoms");
            let displayStatus = aptStatus === 'pending' ? 'NEEDS APPROVAL' : 'CONFIRMED';
            let statusClass = aptStatus === 'pending' ? 'pending' : 'completed';

            return `
                <div class="apt-card ${statusClass}">
                    <div class="apt-header">
                        <h3>${patientName} <span>(${apt.age || '--'}y, ${apt.gender || 'N/A'})</span></h3>
                        <span class="status-badge ${statusClass}">${displayStatus}</span>
                    </div>
                    <div class="apt-info"><strong>ID:</strong> ${bookingId} | <i class="fa-solid fa-phone"></i> ${aptPhone}</div>
                    <div class="apt-symptoms"><strong><i class="fa-solid fa-notes-medical"></i> ${notesLabel}:</strong> ${aptSymptoms}</div>
                    <div class="apt-meta">
                        <div><i class="fa-regular fa-clock text-blue"></i> ${apt.time || apt.scheduled_time || 'ASAP'}</div>
                        <div><i class="fa-solid ${isOnline ? 'fa-video' : (providerType === 'Pharmacy' ? 'fa-motorcycle' : 'fa-location-dot')}"></i> ${visitType} ${!isOnline ? `(${apt.address || apt.delivery_address || 'Clinic'})` : ''}</div>
                    </div>
                    <div class="apt-actions">${btns}</div>
                </div>
            `;
        }).join('');
    }


    // =========================================================================
    // --- 7. SCHEDULE MANAGER LOGIC (THE 30-MIN/1-HOUR FIX) ---
    // Generates correct intervals and forces exact string matching with DB.
    // =========================================================================
    async function loadScheduleManager() {
        if (providerType === 'Pharmacy') return;

        const dateCon = document.getElementById('provider-date-container');
        const timeCon = document.getElementById('provider-time-container');
        if (!dateCon || !timeCon) return;

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        dateCon.innerHTML = days.map(d => `<button class="btn-day-select" data-day="${d}">${d}</button>`).join('');

        const renderTimes = async (day) => {
            timeCon.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Loading slots...</div>';
            let saved = [];
            try {
                const res = await fetch(`${API_BASE}/providers/schedule/${day}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if(res.ok) { const data = await res.json(); saved = data.slots || []; }
            } catch (err) {}

            const durationSelect = document.getElementById('slot-duration-select');
            const duration = durationSelect ? parseInt(durationSelect.value) : 60;
            
            const times = [];
            for (let h = 9; h <= 17; h++) {
                for (let m = 0; m < 60; m += duration) {
                    if (h === 17 && m > 0) break; 
                    let hr = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                    const timeString = `${hr < 10 ? '0'+hr : hr}:${m === 0 ? '00' : m} ${h >= 12 ? 'PM' : 'AM'}`;
                    times.push(timeString);
                }
            }

            timeCon.innerHTML = times.map(t => {
                // 🚨 FIX 1: If in 1-Hour mode, check if BOTH halves are in the DB!
                let isAvail = false;
                if (duration === 60) {
                    const halfHour = t.replace(':00', ':30'); // Converts "03:00 PM" to "03:30 PM"
                    isAvail = saved.includes(t) && saved.includes(halfHour);
                } else {
                    isAvail = saved.includes(t);
                }

                return `<button class="btn-time-slot ${isAvail ? 'available' : ''}" data-time="${t}">
                            ${isAvail ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-ban"></i>'} ${t}
                        </button>`;
            }).join('');

            timeCon.querySelectorAll('.btn-time-slot').forEach(btn => {
                btn.addEventListener('click', async function() {
                    this.classList.toggle('available');
                    
                    let avail = Array.from(timeCon.querySelectorAll('.available')).map(b => b.getAttribute('data-time'));
                    
                    // 🚨 FIX 2: If saving in 1-Hour mode, secretly inject the 30-min blocks to the DB!
                    if (duration === 60) {
                        const expandedAvail = new Set();
                        avail.forEach(timeStr => {
                            expandedAvail.add(timeStr);
                            expandedAvail.add(timeStr.replace(':00', ':30'));
                        });
                        avail = Array.from(expandedAvail);
                    }
                    
                    try {
                        await fetch(`${API_BASE}/providers/schedule`, { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                            body: JSON.stringify({ day: day, slots: avail }) 
                        });
                        
                        this.innerHTML = this.classList.contains('available') 
                            ? `<i class="fa-solid fa-check-circle"></i> ${this.getAttribute('data-time')}` 
                            : `<i class="fa-solid fa-ban"></i> ${this.getAttribute('data-time')}`;
                    } catch (e) { 
                        this.classList.toggle('available'); 
                    } 
                });
            });
        };

        let activeDay = 'Monday';
        const dayBtns = dateCon.querySelectorAll('.btn-day-select');
        dayBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                dayBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                activeDay = e.currentTarget.getAttribute('data-day');
                renderTimes(activeDay);
            });
        });

        const durSelect = document.getElementById('slot-duration-select');
        if(durSelect) durSelect.addEventListener('change', () => renderTimes(activeDay));
        
        if(dayBtns.length > 0) { dayBtns[0].classList.add('active'); renderTimes('Monday'); }
    }

    // =========================================================================
    // --- 8. PATIENT RECORDS / HISTORY LOGIC ---
    // =========================================================================
    async function renderPatientRecords() {
        const tbody = document.getElementById('records-list');
        if(!tbody) return;
        
        const dashboardData = await fetchMyDashboard();
        
        let myBookings = [];
        if (Array.isArray(dashboardData)) {
            myBookings = dashboardData;
        } else if (dashboardData && dashboardData.items) {
            myBookings = dashboardData.items;
        }

        const done = myBookings.filter(b => {
            const stat = (b.status || b.booking_status || '').toLowerCase();
            return stat === 'completed' || stat === 'canceled' || stat === 'rejected';
        });

        if(done.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No records found.</td></tr>`; return; }

        let notesHeader = providerType === 'Pharmacy' ? 'Delivery Remarks' : 'Clinical Notes';
        const thNotes = document.querySelector('.records-table th:nth-child(4)');
        if(thNotes) thNotes.textContent = notesHeader;

        tbody.innerHTML = done.map(apt => {
            const patientName = apt.client_name || apt.patient_name || apt.user_name || "Unknown Patient";
            const aptStatus = (apt.status || apt.booking_status || 'completed').toLowerCase();
            const aptSymptoms = apt.symptoms || apt.clinical_notes || apt.order_notes || "No details provided.";
            const visitType = apt.visit_type || "Video Consult";
            const time = apt.time || (apt.scheduled_time ? new Date(apt.scheduled_time).toLocaleString() : 'ASAP');

            return `
            <tr>
                <td><strong>${patientName}</strong><br><span class="status-badge ${aptStatus}">${aptStatus.toUpperCase()}</span></td>
                <td>${time}</td>
                <td>${visitType}</td>
                <td><div class="note-preview">${aptSymptoms}</div></td>
            </tr>
            `;
        }).join('');
    }


    // =========================================================================
    // --- 9. EARNINGS & TRANSACTIONS LOGIC ---
    // =========================================================================
    async function renderEarnings() {
        const listEl = document.getElementById('transactions-list');
        if(!listEl) return;

        const dashboardData = await fetchMyDashboard();
        
        let myBookings = [];
        if (Array.isArray(dashboardData)) {
            myBookings = dashboardData;
        } else if (dashboardData && dashboardData.items) {
            myBookings = dashboardData.items;
        }
        
        const completedBookings = myBookings.filter(b => {
            const stat = (b.status || b.booking_status || '').toLowerCase();
            return stat === 'completed';
        });
        
        let realLifetimeEarnings = 0;
        completedBookings.forEach(b => {
            realLifetimeEarnings += (b.price || b.total_amount || 500); 
        });

        const financials = { 
            lifetime_earnings: realLifetimeEarnings, 
            this_month_earnings: realLifetimeEarnings, 
            current_month_name: (dashboardData.financials && dashboardData.financials.current_month_name) ? dashboardData.financials.current_month_name : "This Month" 
        };
        
        const formatMoney = (amount) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

        const statsEl = document.getElementById('earnings-stats');
        if(statsEl) {
            statsEl.innerHTML = `
                <div class="stat-card gradient-blue">
                    <div class="stat-info">
                        <span>Earnings in ${financials.current_month_name}</span>
                        <strong>₹${formatMoney(financials.this_month_earnings)}</strong>
                    </div>
                    <div class="stat-icon"><i class="fa-solid fa-chart-line"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <span>Lifetime Earnings</span>
                        <strong>₹${formatMoney(financials.lifetime_earnings)}</strong>
                    </div>
                    <div class="stat-icon green"><i class="fa-solid fa-sack-dollar"></i></div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <span>Total Processed</span>
                        <strong>${completedBookings.length}</strong>
                    </div>
                    <div class="stat-icon"><i class="fa-solid fa-hand-holding-medical"></i></div>
                </div>
            `;
        }

        if(completedBookings.length === 0) { listEl.innerHTML = `<div class="empty-state">No earnings yet.</div>`; return; }

        listEl.innerHTML = completedBookings.map(b => {
            const patientName = b.client_name || b.patient_name || b.user_name || "Patient";
            const bookingId = b.raw_id || b.booking_id || b.id;
            return `
            <div class="tx-card">
                <div class="tx-left">
                    <div class="tx-icon"><i class="fa-solid fa-indian-rupee-sign"></i></div>
                    <div><span class="tx-name">${patientName}</span><span class="tx-detail">${bookingId}</span></div>
                </div>
                <div class="tx-right">
                    <span class="tx-amount">+ ₹${formatMoney(b.price || b.total_amount || 500)}</span>
                    <br>
                    <span class="status-badge completed" style="display: inline-block; margin-top: 4px;">PAID ONLINE</span>
                </div>
            </div>
            `;
        }).join('');
    }


    // =========================================================================
    // --- 10. PROFILE SETTINGS LOGIC (REAL-TIME INPUT VALIDATION) ---
    // Protects database from bad characters and enforces length limits.
    // =========================================================================
    function loadProfileSettings() {
        const nameEl = document.getElementById('prof-name');
        const phoneEl = document.getElementById('prof-phone');
        const bioEl = document.getElementById('prof-bio');
        const bankNameEl = document.getElementById('prof-bank-name');
        const accNoEl = document.getElementById('prof-acc-no');
        const ifscEl = document.getElementById('prof-ifsc');

        if(nameEl) nameEl.value = currentProvider.name || '';
        if(phoneEl) phoneEl.value = currentProvider.phone || '';
        if(bioEl) bioEl.value = currentProvider.bio || '';
        if(bankNameEl) bankNameEl.value = currentProvider.bank_name || '';
        
        if(accNoEl) {
            accNoEl.placeholder = "Enter Account Number (9-18 Digits)";
            accNoEl.value = currentProvider.account_number || '';
            
            // Instantly destroy any letters/symbols and limit to 18 digits max
            accNoEl.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '').slice(0, 18);
            });
        }
        
        if(ifscEl) {
            ifscEl.placeholder = "Enter IFSC Code (e.g. SBIN0001234)";
            ifscEl.value = currentProvider.ifsc_code || '';
            
            // Instantly force uppercase, destroy special chars, and limit to 11 chars
            ifscEl.addEventListener('input', function() {
                this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11);
            });
        }
    }

    const profileForm = document.getElementById('form-provider-profile');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {};
            
            const nameVal = document.getElementById('prof-name')?.value;
            if(nameVal) payload.name = nameVal;
            const phoneVal = document.getElementById('prof-phone')?.value;
            if(phoneVal) payload.phone = phoneVal;
            const bioVal = document.getElementById('prof-bio')?.value;
            if(bioVal) payload.bio = bioVal;
            const bankNameVal = document.getElementById('prof-bank-name')?.value;
            if(bankNameVal) payload.bank_name = bankNameVal;

            // Pre-Flight Validation Checks before hitting the database
            const accVal = document.getElementById('prof-acc-no')?.value;
            if(accVal) {
                if (accVal.length < 9) {
                    alert("Account Number must be at least 9 digits long.");
                    return; 
                }
                payload.account_number = accVal;
            }
            
            const ifscVal = document.getElementById('prof-ifsc')?.value;
            if(ifscVal) {
                const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                if (!ifscRegex.test(ifscVal)) {
                    alert("Invalid IFSC Code format. Must be 11 characters (e.g., HDFC0123456) with a zero as the 5th character.");
                    return; 
                }
                payload.ifsc_code = ifscVal;
            }

            const submitBtn = document.getElementById('btn-save-profile');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE}/providers/me`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.detail || "Failed to update settings");

                const updatedProvider = { ...currentProvider, ...result.provider };
                localStorage.setItem('currentProvider', JSON.stringify(updatedProvider));
                currentProvider = updatedProvider;
                
                if(document.getElementById('welcome-message')) {
                    document.getElementById('welcome-message').textContent = providerType === 'Doctor' ? `Dr. ${currentProvider.name.replace('Dr. ', '')}` : currentProvider.name;
                }
                
                alert("Details saved successfully!");
                loadProfileSettings(); 

            } catch (error) {
                alert(`Error: ${error.message}`);
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }


    // =========================================================================
    // --- 11. SERVICES CATALOG LOGIC (WITH DELETION FIX) ---
    // Grabs items from API and dynamically generates the trash can buttons.
    // =========================================================================
    async function loadCatalog() {
        const listEl = document.getElementById('catalog-list');
        if(!listEl) return;
        listEl.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Loading catalog...</div>';

        try {
            const res = await fetch(`${API_BASE}/providers/services/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            
            if (res.status === 401) {
                localStorage.clear();
                window.location.replace('index.html');
                return;
            }
            if (!res.ok) throw new Error("Failed to load catalog");
            const items = await res.json();

            if (items.length === 0) {
                listEl.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">Your catalog is empty. Add items to start receiving specific orders.</div>`;
                return;
            }

            listEl.innerHTML = items.map(item => {
                let name = item.service_name || item.test_name || (item.medicine ? item.medicine.medicine_name : "Unknown Item");
                let price = item.price;
                let desc = item.description || item.preparation_rules || item.custom_description || (item.medicine ? item.medicine.description : "No description");
                
                // Extract proper ID to allow deletion
                let itemId = item.service_id || item.test_id || item.inventory_id || item.offering_id || item.id;
                
                let extraTag = '';
                if(providerType === 'Pharmacy' && item.medicine && item.medicine.requires_prescription) {
                    extraTag = `<span class="status-badge pending" style="color: #EF4444; background: #FEE2E2;">RX Required</span>`;
                }
                if(providerType === 'Lab' && item.home_collection_available) {
                    extraTag = `<span class="status-badge completed">Home Collection</span>`;
                }

                return `
                    <div class="dash-card">
                        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 12px;">
                            <h3 style="margin:0; font-size:1.1rem; color:var(--brand-blue);">${name}</h3>
                            <strong style="color:var(--success-green); font-size:1.1rem;">₹${price}</strong>
                        </div>
                        <p style="font-size:0.9rem; color:var(--text-secondary); margin-top:0;">${desc || "No description provided."}</p>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 10px;">
                            <div>${extraTag}</div>
                            <button onclick="deleteCatalogItem(${itemId})" style="color: #EF4444; background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 5px;">
                                <i class="fa-solid fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            listEl.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; color: #EF4444;">Error loading catalog.</div>`;
        }
    }

    const catalogForm = document.getElementById('form-catalog-add');
    if (catalogForm) {
        catalogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            let payload = { price: document.getElementById('cat-price').value };

            if (providerType === 'Doctor') {
                payload.service_name = document.getElementById('cat-name').value;
                payload.description = document.getElementById('cat-desc').value;
            } else if (providerType === 'Pharmacy') {
                payload.medicine_name = document.getElementById('cat-name').value;
                payload.description = document.getElementById('cat-desc').value;
                const rxCheck = document.getElementById('cat-rx-required');
                if(rxCheck) payload.requires_prescription = rxCheck.checked;
            } else if (providerType === 'Lab') {
                payload.test_name = document.getElementById('cat-name').value;
                payload.description = document.getElementById('cat-desc').value; 
                const homeColCheck = document.getElementById('cat-home-col');
                if(homeColCheck) payload.home_collection_available = homeColCheck.checked;
            }

            try {
                const res = await fetch(`${API_BASE}/providers/services`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || "Failed to add item");
                }

                const catModal = document.getElementById('catalog-modal');
                if(catModal) catModal.classList.add('hidden');
                
                catalogForm.reset();
                loadCatalog(); 

            } catch (err) {
                alert(err.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    const openCatBtn = document.getElementById('open-catalog-btn');
    const closeCatBtn = document.getElementById('close-catalog-btn');
    const catModal = document.getElementById('catalog-modal');

    if (openCatBtn && catModal) {
        openCatBtn.addEventListener('click', () => catModal.classList.remove('hidden'));
    }
    if (closeCatBtn && catModal) {
        closeCatBtn.addEventListener('click', () => catModal.classList.add('hidden'));
    }


    // =========================================================================
    // --- 12. GLOBAL ACTIONS ---
    // =========================================================================
    window.updateBookingStatus = async function(id, status) {
        const confirmMsg = status === 'canceled' ? "Cancel this due to an emergency?" : `Mark as ${status}?`;
        if (!confirm(confirmMsg)) return;
        try {
            await fetch(`${API_BASE}/providers/bookings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status }) });
            loadAppointments(); 
        } catch (e) { alert(e.message); }
    };

    window.joinSecureVideoCall = async function(bookingId) {
        alert("Video consultations are currently disabled.");
    };


    // =========================================================================
    // --- 13. UPLOAD/COMPLETION MODAL LOGIC (FILE UPLOAD PIPELINE) ---
    // Handles the two-step process: Uploads the file, gets the URL, then 
    // updates the booking status with the notes AND the URL.
    // =========================================================================
    const modal = document.getElementById('upload-modal');
    window.openUploadModal = function(id, name) {
        const idEl = document.getElementById('record-booking-id');
        const nameEl = document.getElementById('record-patient-name');
        const notesEl = document.getElementById('record-notes');
        
        if(idEl) idEl.value = id;
        if(nameEl) nameEl.textContent = name;
        if(notesEl) notesEl.value = '';
        
        const noteLabel = document.getElementById('modal-notes-label');
        const titleEl = document.getElementById('modal-dynamic-title');
        
        if (titleEl && noteLabel) {
            if(providerType === 'Lab') {
                titleEl.textContent = "Upload Lab Results";
                noteLabel.textContent = "Test Result Summary *";
            } else if (providerType === 'Pharmacy') {
                titleEl.textContent = "Confirm Delivery";
                noteLabel.textContent = "Delivery Remarks *";
            } else {
                titleEl.textContent = "Complete Consultation";
                noteLabel.textContent = "Clinical Notes / Diagnosis *";
            }
        }
        if(modal) modal.classList.remove('hidden');
    };

    const closeUploadBtn = document.getElementById('close-upload-btn');
    if(closeUploadBtn) {
        closeUploadBtn.addEventListener('click', (e) => { 
            e.preventDefault(); 
            if(modal) modal.classList.add('hidden'); 
        });
    }

    const uploadForm = document.getElementById('form-upload-record');
    if(uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('record-booking-id').value;
            const notes = document.getElementById('record-notes').value;
            const fileInput = document.getElementById('record-file'); 
            
            const btn = e.target.querySelector('button');
            btn.textContent = "Processing..."; btn.disabled = true;

            try {
                let finalReportUrl = null;

                // Step 1: Upload the file if one was selected
                if (fileInput && fileInput.files.length > 0) {
                    const fd = new FormData();
                    fd.append("file", fileInput.files[0]);
                    
                    const fileRes = await fetch(`${API_BASE}/files/booking/report`, {
                        method: "POST",
                        headers: { 'Authorization': `Bearer ${token}` }, // Note: No Content-Type header for FormData!
                        body: fd
                    });
                    
                    if (!fileRes.ok) throw new Error("File upload failed.");
                    const fileData = await fileRes.json();
                    finalReportUrl = fileData.url;
                }

                // Step 2: Push the text notes and the file link to the database
                await fetch(`${API_BASE}/providers/bookings/${id}/status`, { 
                    method: 'PATCH', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                    body: JSON.stringify({ 
                        status: 'completed', 
                        notes: notes,
                        report_url: finalReportUrl 
                    }) 
                });

                if(modal) modal.classList.add('hidden'); 
                if(fileInput) fileInput.value = ''; 
                loadAppointments(); 

            } catch(error) {
                alert("Error: " + error.message);
            } finally { 
                btn.textContent = "Mark Completed"; 
                btn.disabled = false; 
            }
        });
    }
    

    // =========================================================================
    // --- 14. PROFILE PHOTO UPLOAD LOGIC ---
    // Uses a hidden file input to instantly upload profile photos.
    // =========================================================================
    function setupDocumentUpload() {
        const fileInput = document.getElementById("profile-photo-input");
        const triggerBtn = document.getElementById("btn-trigger-upload");

        if (triggerBtn && fileInput) {
            triggerBtn.addEventListener("click", () => fileInput.click());
            
            fileInput.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const fd = new FormData(); 
                fd.append("file", file); 
                
                const originalText = triggerBtn.innerHTML;
                triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
                triggerBtn.disabled = true;

                try {
                    const res = await fetch(`${API_BASE}/files/provider/profile-photo`, { 
                        method: "POST", 
                        headers: { 'Authorization': `Bearer ${token}` }, 
                        body: fd 
                    });
                    
                    if (!res.ok) throw new Error("Upload failed.");
                    
                    const data = await res.json();
                    
                    let fullUrl = data.url;
                    if (!fullUrl.startsWith('http')) {
                        fullUrl = `${API_BASE}${data.url}`;
                    }
                    
                    const headerImg = document.getElementById("header-profile-img");
                    if(headerImg) headerImg.src = fullUrl;
                    
                    currentProvider.profile_photo_url = data.url; 
                    localStorage.setItem('currentProvider', JSON.stringify(currentProvider));
                    
                } catch (error) {
                    alert("Error uploading image. Please try again.");
                } finally {
                    triggerBtn.innerHTML = originalText;
                    triggerBtn.disabled = false;
                    fileInput.value = ''; 
                }
            });
        }
    }


    // =========================================================================
    // --- 15. LOGOUT AND INITIALIZATION ---
    // =========================================================================
    const logout = (e) => { 
        e.preventDefault(); 
        localStorage.clear(); 
        window.location.replace('index.html'); 
    };
    
    const btnLogout = document.getElementById('btn-logout');
    const mobileLogout = document.getElementById('mobile-btn-logout');
    if(btnLogout) btnLogout.addEventListener('click', logout);
    if(mobileLogout) mobileLogout.addEventListener('click', logout);

    switchTab('appointments');


    // =========================================================================
    // --- 16. GLOBAL DELETE CATALOG ITEM ---
    // Attached to window so the inline onclick="deleteCatalogItem()" works.
    // =========================================================================
    window.deleteCatalogItem = async function(itemId) {
        if (!confirm("Are you sure you want to delete this service?")) return;
        
        try {
            const res = await fetch(`${API_BASE}/providers/services/${itemId}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            if (!res.ok) throw new Error("Failed to delete item.");
            loadCatalog(); 
        } catch (e) {
            alert(e.message);
        }
    };
});