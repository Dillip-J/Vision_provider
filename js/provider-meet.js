// js/provider-meet.js
document.addEventListener('DOMContentLoaded', () => {
    
    const urlParams = new URLSearchParams(window.location.search);
    const rawRoom = urlParams.get('room');
    const customName = urlParams.get('name'); 

    if (!rawRoom) {
        document.getElementById('jitsi-container').innerHTML = `
            <div style="color: white; text-align: center; margin-top: 20vh; font-family: sans-serif;">
                <h2 style="color: #EF4444;">Invalid Meeting Link</h2>
                <p>Please close this tab and click "Join Call" from your dashboard.</p>
            </div>
        `;
        return;
    }

    // 🚨 FIX: Strict Room Name Sanitization to ensure exact match with Patient
    const safeRoomName = "VisionApt_" + rawRoom.replace(/[^a-zA-Z0-9]/g, "");

    let participantName = customName || "Provider";
    if (!customName) {
        try { 
            const p = JSON.parse(localStorage.getItem('currentProvider'));
            if (p) participantName = p.type === 'Doctor' ? `Dr. ${p.name.replace('Dr. ', '')}` : p.name; 
        } catch(e) {}
    }

    const domain = 'meet.jit.si';
    const options = {
        roomName: safeRoomName,
        width: '100%', 
        height: '100%', 
        parentNode: document.querySelector('#jitsi-container'),
        userInfo: { displayName: participantName },
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false, 
            requireDisplayName: false,
            disableDeepLinking: true   
        },
        interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'chat', 'settings',
                'videoquality', 'tileview'
            ]
        }
    };

    const api = new JitsiMeetExternalAPI(domain, options);

    const leaveBtn = document.getElementById('btn-leave-call');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
            if(confirm("Are you sure you want to end this consultation?")) {
                api.dispose(); 
                window.close(); 
            }
        });
    }

    api.addListener('videoConferenceLeft', () => {
        window.close();
    });
});