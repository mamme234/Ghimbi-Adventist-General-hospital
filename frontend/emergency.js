// ============ Emergency JavaScript ============

function callEmergency() {
    // In a real implementation, this would dial the emergency number
    // For web, we'll show a confirmation
    if (confirm('🚨 Calling Emergency Services...\n\nEmergency Hotline: +251-XXX-XXXXXX\n\nClick OK to proceed.')) {
        showToast('🚑 Emergency services notified! Help is on the way.', 'success');
        
        // In a real implementation, this would trigger an SMS or notification
        // For now, we'll simulate an alert
        setTimeout(() => {
            showToast('🚨 Emergency team dispatched to your location.', 'info');
        }, 3000);
    }
}
window.callEmergency = callEmergency;
