// provider/js/provider-meet.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Grab the secure room name and exact provider name from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room');
    const customName = urlParams.get('name'); 

    // 2. Security Guard: Check if room exists
    if (!roomName) {
        document.getElementById('jitsi-container').innerHTML = `
            <div style="color: white; text-align: center; margin-top: 20vh; font-family: sans-serif;">
                <h2 style="color: #EF4444;">Invalid Meeting Link</h2>
                <p>Please close this tab and click "Join Call" from your dashboard.</p>
            </div>
        `;
        return;
    }

    // 3. Format Provider Name safely
    let participantName = customName || "Provider";
    if (!customName) {
        try { 
            const p = JSON.parse(localStorage.getItem('currentProvider'));
            if (p) participantName = p.type === 'Doctor' ? `Dr. ${p.name.replace('Dr. ', '')}` : p.name; 
        } catch(e) {
            console.warn("Could not parse provider name from local storage.");
        }
    }

    // 4. Initialize the Native Jitsi API
    const domain = 'meet.jit.si';
    const options = {
        roomName: roomName,
        width: '100%', // 🚨 Forces video to take up the container
        height: '100%', // 🚨 Prevents the 0-pixel invisible screen bug
        parentNode: document.querySelector('#jitsi-container'),
        userInfo: {
            displayName: participantName
        },
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            
            // 🚨 FORCES INSTANT JOIN (Tries to skip the "Join Meeting" screen)
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

    // 5. Launch Video
    const api = new JitsiMeetExternalAPI(domain, options);

    // 6. Handle your custom HTML Red "End Consultation" button (if you have one)
    const leaveBtn = document.getElementById('btn-leave-call');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
            if(confirm("Are you sure you want to end this consultation?")) {
                api.dispose(); // Kills the video & audio feed instantly
                window.close(); // Closes the browser tab
            }
        });
    }

    // 7. Automatically close the browser tab when the provider hangs up inside Jitsi!
    api.addListener('videoConferenceLeft', () => {
        window.close();
    });
});