// MGA Volleyball Tryouts - Configuration
// Replace YOUR_SCRIPT_ID with your actual Google Apps Script web app URL

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbxWuiY30VHxCqXtJEYy1jKF0lfNnvDM6kvD11wbN-05y4IqxxuqzQjqfNihWemDiY_9tg/exec';

const CONFIG = {
    // Refresh intervals (in milliseconds)
    dashboardRefreshInterval: 60000, // 1 min
    playersRefreshInterval: 180000000,   // 3 min
    
    // Debug mode - set to false for production
    DEBUG: true,
    
    // API endpoints
    endpoints: {
        dashboard: `${API_BASE_URL}?action=getDashboard`,
        players: `${API_BASE_URL}?action=getPlayers`,
        availableTabs: `${API_BASE_URL}?action=getAvailableTabs`,
        checkIn: `${API_BASE_URL}?action=checkIn`
    },
    
    // UI settings
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    
    // Photo capture settings
    photoQuality: 0.8,
    maxPhotoSize: 5 * 1024 * 1024 // 5MB
};

// Logging helper
function debugLog(...args) {
    if (CONFIG.DEBUG) {
        console.log('[MGA Debug]', ...args);
    }
}

// Export for other modules
window.CONFIG = CONFIG;
window.API_BASE_URL = API_BASE_URL;
window.debugLog = debugLog;
