// js/provider-dash.js

// ==========================================
// CHAPTER 1: SETUP & AUTHENTICATION
// ==========================================
const API_BASE = window.API_BASE || 'https://backend-depolyment-3.onrender.com';
const token = localStorage.getItem('provider_token');
const providerStr = localStorage.getItem('currentProvider');

// If not logged in, kick them back to home page
if (!token || !providerStr) window.location.replace('index.html');

let currentProvider = JSON.parse(providerStr);

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initTabs();
    initThemeToggle();
    initModalsAndForms();
});

// ==========================================
// CHAPTER 2: USER INTERFACE (Header & Sidebar)
// ==========================================
function initUI() {
    // 1. Set Profile Images
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentProvider.name || "Dr")}&background=1E293B&color=fff`;
    const photoUrl = currentProvider.profile_photo_url ? (currentProvider.profile_photo_url.startsWith('http') ? currentProvider.profile_photo_url : `${API_BASE}${currentProvider.profile_photo_url}`) : defaultAvatar;
    
    document.getElementById("header-profile-img").src = photoUrl;
    document.getElementById("settings-preview-img").src = photoUrl;

    // 2. Set Names
    document.getElementById('welcome-message').textContent = `Dr. ${(currentProvider.name || "").replace('Dr. ', '')}`;
    document.getElementById('clinic-name').textContent = `${currentProvider.category || "General"} • Doctor`;

    // 3. Mobile Sidebar Toggle
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => document.getElementById('sidebar').classList.add('mobile-open'));
    document.getElementById('sidebar-close')?.addEventListener('click', () => document.getElementById('sidebar').classList.remove('mobile-open'));
    
    // 4. Logout Button
    document.querySelectorAll('.btn-logout, #mobile-btn-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.replace('index.html');
        });
    });
}

function initThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    if (!themeBtn) return;

    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fa-solid fa-sun';
    }

    themeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.toggleAttribute('data-theme', !isDark);
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
        themeIcon.className = isDark ? 'fa-regular fa-moon' : 'fa-solid fa-sun';
    });
}

// ==========================================
// CHAPTER 3: TAB NAVIGATION
// ==========================================
function initTabs() {
    const tabs = {
        appointments: { btn: 'tab-appointments', view: 'view-appointments', render: loadAppointments },
        schedule: { btn: 'tab-schedule', view: 'view-schedule', render: loadScheduleManager },
        records: { btn: 'tab-records', view: 'view-records', render: renderPatientRecords },
        earnings: { btn: 'tab-earnings', view: 'view-earnings', render: renderEarnings },
        profile: { btn: 'tab-profile', view: 'view-profile', render: loadProfileSettings }
    };

    window.switchTab = (tabKey) => {
        Object.values(tabs).forEach(t => {
            document.getElementById(t.btn)?.classList.remove('active');
            document.getElementById(t.view)?.classList.add('hidden');
            document.getElementById(t.view)?.classList.remove('active');
        });
        
        document.getElementById(tabs[tabKey].btn)?.classList.add('active');
        document.getElementById(tabs[tabKey].view)?.classList.remove('hidden');
        document.getElementById(tabs[tabKey].view)?.classList.add('active');
        
        if(tabs[tabKey].render) tabs[tabKey].render(); // Load data for the clicked tab
    };

    Object.keys(tabs).forEach(key => {
        document.getElementById(tabs[key].btn)?.addEventListener('click', (e) => {
            e.preventDefault(); switchTab(key);
        });
    });

    switchTab('appointments'); // Load default tab
}

// ==========================================
// CHAPTER 4: DATA FETCHING
// ==========================================
async function fetchMyDashboard() {
    try {
        const res = await fetch(`${API_BASE}/providers/dashboard/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 401) { localStorage.clear(); window.location.replace('index.html'); }
        return res.ok ? await res.json() : { items: [] };
    } catch (e) { return { items: [] }; }
}

// ==========================================
// CHAPTER 5: TAB RENDERING LOGIC
// ==========================================

// --- TAB: Patient Requests ---
async function loadAppointments() {
    const listEl = document.getElementById('provider-appointments-list');
    if(!listEl) return;
    listEl.innerHTML = '<div class="empty-state">Loading data...</div>';

    const data = await fetchMyDashboard();
    const bookings = Array.isArray(data) ? data : (data.items || []);
    const active = bookings.filter(b => ['confirmed', 'pending', 'active', 'in_transit'].includes((b.status || b.booking_status || '').toLowerCase()));
    
    // Update Stats
    document.getElementById('provider-stats').innerHTML = `
        <div class="stat-card"><div class="stat-info"><span>Total</span><strong>${bookings.length}</strong></div><div class="stat-icon"><i class="fa-solid fa-users"></i></div></div>
        <div class="stat-card"><div class="stat-info"><span>Active</span><strong class="text-blue">${active.length}</strong></div><div class="stat-icon"><i class="fa-regular fa-calendar-check"></i></div></div>
    `;

    if (active.length === 0) return listEl.innerHTML = `<div class="empty-state">No active requests.</div>`;

    // Render Cards
    listEl.innerHTML = active.map(apt => {
        const isOnline = (apt.visit_type || "").toLowerCase().includes('video');
        const status = (apt.status || apt.booking_status || 'pending').toLowerCase();
        const id = apt.raw_id || apt.booking_id || apt.id;
        
        let btns = status === 'pending' 
            ? `<button class="btn-primary" onclick="updateBookingStatus('${id}', 'confirmed')">Accept</button> <button class="btn-outline red" onclick="updateBookingStatus('${id}', 'rejected')">Reject</button>`
            : `${isOnline ? `<button class="btn-primary green" onclick="joinSecureVideoCall('${id}')">Join Call</button>` : ''} <button class="btn-outline purple" onclick="openUploadModal('${id}', '${apt.client_name}')">Complete</button>`;

        return `
            <div class="apt-card ${status}">
                <div class="apt-header"><h3>${apt.client_name || "Patient"}</h3><span class="status-badge ${status}">${status.toUpperCase()}</span></div>
                <div class="apt-info">ID: ${id} | Phone: ${apt.phone || 'N/A'}</div>
                <div class="apt-meta"><div><i class="fa-regular fa-clock"></i> ${apt.time || 'ASAP'}</div> <div><i class="fa-solid ${isOnline ? 'fa-video' : 'fa-house'}"></i> ${apt.visit_type}</div></div>
                <div class="apt-actions">${btns}</div>
            </div>`;
    }).join('');
}

// --- TAB: Schedule Manager ---
async function loadScheduleManager() {
    const dateCon = document.getElementById('provider-date-container');
    const timeCon = document.getElementById('provider-time-container');
    
    // Generate next 7 days
    dateCon.innerHTML = Array.from({length: 7}).map((_, i) => {
        let d = new Date(); d.setDate(d.getDate() + i);
        return `<button class="btn-day-select ${i===0?'active':''}" data-day="${d.toLocaleDateString('en-US',{weekday:'long'})}" style="padding: 12px 16px;">
                    <strong style="font-size: 1.4rem; display: block;">${d.getDate()}</strong>
                    <span style="font-size: 0.85rem;">${d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}</span>
                </button>`;
    }).join('');

    const renderTimes = async (day) => {
        timeCon.innerHTML = '<div class="empty-state">Loading...</div>';
        let saved = [];
        try {
            const res = await fetch(`${API_BASE}/providers/schedule/${day}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if(res.ok) saved = (await res.json()).slots || [];
        } catch(e){}

        // Generate 45 min slots from 9AM to 7PM
        let timesHtml = '';
        for (let m = 9 * 60; m < 19 * 60; m += 45) {
            let hr = Math.floor(m/60), min = m%60;
            let timeStr = `${hr>12 ? hr-12 : (hr===0?12:hr)}:${min===0?'00':min} ${hr>=12?'PM':'AM'}`;
            let isAvail = saved.includes(timeStr);
            timesHtml += `<button class="btn-time-slot ${isAvail ? 'available' : ''}" data-time="${timeStr}">
                            <i class="fa-solid ${isAvail ? 'fa-check-circle' : 'fa-ban'}"></i> ${timeStr}
                          </button>`;
        }
        timeCon.innerHTML = timesHtml;

        // Click to toggle availability and save to DB
        timeCon.querySelectorAll('.btn-time-slot').forEach(btn => {
            btn.addEventListener('click', async function() {
                this.classList.toggle('available');
                const avail = Array.from(timeCon.querySelectorAll('.available')).map(b => b.getAttribute('data-time'));
                fetch(`${API_BASE}/providers/schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ day, slots: avail }) });
                this.innerHTML = `<i class="fa-solid ${this.classList.contains('available') ? 'fa-check-circle' : 'fa-ban'}"></i> ${this.getAttribute('data-time')}`;
            });
        });
    };

    const dayBtns = dateCon.querySelectorAll('.btn-day-select');
    dayBtns.forEach(btn => btn.addEventListener('click', (e) => {
        dayBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTimes(btn.getAttribute('data-day'));
    }));
    
    renderTimes(dayBtns[0].getAttribute('data-day')); // Load day 1
}

// --- TAB: History / Records ---
async function renderPatientRecords() {
    const tbody = document.getElementById('records-list');
    const data = await fetchMyDashboard();
    const bookings = Array.isArray(data) ? data : (data.items || []);
    const done = bookings.filter(b => ['completed', 'canceled', 'rejected'].includes((b.status || b.booking_status || '').toLowerCase()));

    if(done.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No records found.</td></tr>`;

    tbody.innerHTML = done.map(apt => `
        <tr>
            <td><strong>${apt.client_name || "Patient"}</strong><br><span class="status-badge ${apt.status}">${(apt.status||"").toUpperCase()}</span></td>
            <td>${apt.time || 'ASAP'}</td>
            <td>${apt.visit_type || "Video Consult"}</td>
            <td><div class="note-preview"><strong>Notes:</strong> ${apt.clinical_notes || "None recorded."}</div></td>
        </tr>
    `).join('');
}

// --- TAB: Earnings & Withdrawals ---
async function renderEarnings() {
    const listEl = document.getElementById('transactions-list');
    const data = await fetchMyDashboard();
    const bookings = Array.isArray(data) ? data : (data.items || []);
    const done = bookings.filter(b => (b.status || b.booking_status || '').toLowerCase() === 'completed');

    // Math Engine
    let lifetime = done.reduce((sum, b) => sum + parseFloat(b.price || b.total_amount || 500), 0);
    const pid = currentProvider.provider_id || currentProvider.id;
    let withdrawn = parseFloat(localStorage.getItem(`withdrawn_${pid}`)) || 0;
    let pending = parseFloat(localStorage.getItem(`pending_withdraw_${pid}`)) || 0;
    let balance = lifetime - withdrawn - pending;
    window.currentAvailableBalance = balance;

    const money = (amt) => `₹${new Intl.NumberFormat('en-IN').format(amt || 0)}`;

    document.getElementById('earnings-stats').innerHTML = `
        <div class="stat-card gradient-blue"><div class="stat-info"><span>Available Balance</span><strong style="font-size: 2rem;">${money(balance)}</strong></div></div>
        <div class="stat-card"><div class="stat-info"><span>Total Withdrawn</span><strong class="text-green">${money(withdrawn)}</strong></div>
            <button onclick="window.requestWithdrawal()" class="btn-primary" ${balance <= 0 || pending > 0 ? 'disabled' : ''}>
                ${pending > 0 ? `Processing ${money(pending)}...` : 'Withdraw Funds'}
            </button>
        </div>
    `;

    if(done.length === 0) return listEl.innerHTML = `<div class="empty-state">No earnings yet.</div>`;

    listEl.innerHTML = done.map(b => `
        <div class="tx-card">
            <div class="tx-left"><strong>${b.client_name || "Patient"}</strong><br><small>${b.raw_id || b.booking_id}</small></div>
            <div class="tx-right"><span class="tx-amount text-green">+ ${money(b.price || b.total_amount || 500)}</span></div>
        </div>
    `).join('');
}

// --- TAB: Profile Settings ---
async function loadProfileSettings() {
    try {
        const res = await fetch(`${API_BASE}/providers/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            currentProvider = { ...currentProvider, ...(await res.json()) };
            localStorage.setItem('currentProvider', JSON.stringify(currentProvider));
        }
    } catch(e){}

    const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }
    
    setVal('prof-name', currentProvider.name);
    setVal('prof-phone', currentProvider.phone);
    setVal('prof-email', currentProvider.email);
    setVal('prof-bio', currentProvider.bio);
    setVal('prof-bank-name', currentProvider.bank_name);
    setVal('prof-acc-no', currentProvider.account_number);
    setVal('prof-ifsc', currentProvider.ifsc_code);
    setVal('prof-mci', currentProvider.license_number || 'N/A');
    setVal('prof-category', currentProvider.category || 'General');
}

// ==========================================
// CHAPTER 6: GLOBAL ACTIONS (Forms, Video, Modals)
// ==========================================

// Handle Settings Form Save
document.getElementById('form-provider-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-profile');
    btn.innerHTML = 'Saving...'; btn.disabled = true;

    const payload = {
        name: document.getElementById('prof-name').value,
        phone: document.getElementById('prof-phone').value,
        bio: document.getElementById('prof-bio').value,
        bank_name: document.getElementById('prof-bank-name').value,
        account_number: document.getElementById('prof-acc-no').value,
        ifsc_code: document.getElementById('prof-ifsc').value
    };

    try {
        const res = await fetch(`${API_BASE}/providers/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed to save.");
        alert("Settings Saved!"); loadProfileSettings();
    } catch(err) { alert(err.message); } 
    finally { btn.innerHTML = 'Save Changes'; btn.disabled = false; }
});

// Update Status (Accept/Reject/Cancel)
window.updateBookingStatus = async function(id, status) {
    if (!confirm(`Mark appointment as ${status}?`)) return;
    try {
        await fetch(`${API_BASE}/providers/bookings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status }) });
        loadAppointments(); 
    } catch (e) { alert("Error updating status."); }
};

// Start Premium 8x8 Video
window.joinSecureVideoCall = function(bookingId) {
    const safeRoom = "VisionApt_" + bookingId.replace(/[^a-zA-Z0-9]/g, "");
    const docName = encodeURIComponent(currentProvider.name.replace('Dr. ', ''));
    const jwt = "eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtMzg2MDE4ZjRkNmJmNDVjZDliY2YyOGI1N2Y4ZDRkZTkvMzc0ODhkLVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImlzcyI6ImNoYXQiLCJpYXQiOjE3NzgwNTg1OTEsImV4cCI6MTc3ODA2NTc5MSwibmJmIjoxNzc4MDU4NTg2LCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtMzg2MDE4ZjRkNmJmNDVjZDliY2YyOGI1N2Y4ZDRkZTkiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOmZhbHNlLCJmaWxlLXVwbG9hZCI6ZmFsc2UsIm91dGJvdW5kLWNhbGwiOmZhbHNlLCJzaXAtb3V0Ym91bmQtY2FsbCI6ZmFsc2UsInRyYW5zY3JpcHRpb24iOmZhbHNlLCJsaXN0LXZpc2l0b3JzIjpmYWxzZSwicmVjb3JkaW5nIjpmYWxzZSwiZmxpcCI6ZmFsc2V9LCJ1c2VyIjp7ImhpZGRlbi1mcm9tLXJlY29yZGVyIjpmYWxzZSwibW9kZXJhdG9yIjp0cnVlLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWQiOiJnb29nbGUtb2F1dGgyfDEwNzc4NTI3OTU4MjI5NjQ4Njc5NCIsImF2YXRhciI6IiIsImVtYWlsIjoidGVzdC51c2VyQGNvbXBhbnkuY29tIn19LCJyb29tIjoiKiJ9.ngW7lAbtGQJNEzcxggbgNHFi_g-UENQvsnvT0h1o2iLrmfQVuMk-X1I6YpX_xWWbtERgdWxZh243jrW1_UvZBc2wYqP3iTiXVXVi0VG48X4q2hu_IP5So3wms8j2NKnir1HXwTYpmccJuZGnTQ-7cmeD9PR3uj_rhazzAlnJFX9KOH3nfi1JEXJFe1siU0ANb5M8-kIw8GbipPvlwEnb8KdBYOsE5JojHQKN7BxGUfl9koWyi3aJFfi6cxQKUCDcbbvCxolgHAdD9kf3HPumES-Gse_TE0VRK0jri3Ibv9-OlPiDNZcuB9cwwH0yErZ3xWQ9gVHCQk9Kb2DUon9FJw";
    window.open(`https://8x8.vc/vpaas-magic-cookie-386018f4d6bf45cd9bcf28b57f8d4de9/${safeRoom}?jwt=${jwt}#config.prejoinPageEnabled=false&userInfo.displayName="Dr.%20${docName}"`, '_blank');
};

// Process Withdrawal
window.requestWithdrawal = function() {
    if (!currentProvider.account_number || !currentProvider.ifsc_code) return alert("Please complete banking details in Settings first.");
    const amt = window.currentAvailableBalance || 0;
    if (amt <= 0) return alert("No funds available.");
    
    const pid = currentProvider.provider_id || currentProvider.id;
    localStorage.setItem(`pending_withdraw_${pid}`, amt);
    alert(`Withdrawal of ₹${amt} initiated! Funds will arrive in 24 hours.`);
    renderEarnings();

    // Simulate bank processing
    setTimeout(() => {
        let withdrawn = parseFloat(localStorage.getItem(`withdrawn_${pid}`)) || 0;
        let pending = parseFloat(localStorage.getItem(`pending_withdraw_${pid}`)) || 0;
        localStorage.setItem(`withdrawn_${pid}`, withdrawn + pending);
        localStorage.removeItem(`pending_withdraw_${pid}`);
        alert(`Success! ₹${pending} credited to your bank account.`);
        if(document.getElementById('view-earnings').classList.contains('active')) renderEarnings();
    }, 8000); 
};

// Modal Logic (Complete Consultation)
function initModalsAndForms() {
    const modal = document.getElementById('upload-modal');
    window.openUploadModal = (id, name) => {
        document.getElementById('record-booking-id').value = id;
        document.getElementById('record-notes').value = '';
        modal.classList.remove('hidden');
    };
    
    document.getElementById('close-upload-btn')?.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('hidden'); });

    document.getElementById('form-upload-record')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('record-booking-id').value;
        const notes = document.getElementById('record-notes').value;
        const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerHTML = "Saving...";

        try {
            await fetch(`${API_BASE}/providers/bookings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status: 'completed', notes }) });
            modal.classList.add('hidden'); loadAppointments(); 
        } catch(e) { alert("Error completing appointment."); } 
        finally { btn.innerHTML = "Submit"; btn.disabled = false; }
    });
}