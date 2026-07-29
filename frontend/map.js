// ============ Map Functions ============

// Copy GPS Coordinates
function copyCoordinates() {
    const coords = '9°42\'36.0"N, 35°50\'24.0"E';
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(coords).then(() => {
            showCopyToast('📍 Coordinates copied to clipboard!');
        }).catch(() => {
            fallbackCopy(coords);
        });
    } else {
        fallbackCopy(coords);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showCopyToast('📍 Coordinates copied to clipboard!');
    } catch (err) {
        showCopyToast('📋 Please copy the coordinates manually: ' + text);
    }
    
    document.body.removeChild(textarea);
}

function showCopyToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast-copy');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-copy';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Open Google Maps with directions
function getDirections() {
    const url = 'https://www.google.com/maps/dir/?api=1&destination=Gimbie+Adventist+General+Hospital,+Gimbie,+Ethiopia';
    window.open(url, '_blank');
}

// Open in Google Maps
function openInGoogleMaps() {
    const url = 'https://www.google.com/maps/place/Gimbie+Adventist+General+Hospital,+Gimbie,+Ethiopia';
    window.open(url, '_blank');
}

// Scroll to map section
function scrollToMap() {
    const mapSection = document.querySelector('.map-section');
    if (mapSection) {
        mapSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📍 Map section initialized');
    
    // Add click listeners for direction buttons
    const directionBtns = document.querySelectorAll('[data-action="directions"]');
    directionBtns.forEach(btn => {
        btn.addEventListener('click', getDirections);
    });
    
    // Add click listeners for copy buttons
    const copyBtns = document.querySelectorAll('[data-action="copy-coords"]');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', copyCoordinates);
    });
});

// Export functions for use in HTML
window.copyCoordinates = copyCoordinates;
window.getDirections = getDirections;
window.openInGoogleMaps = openInGoogleMaps;
window.scrollToMap = scrollToMap;
