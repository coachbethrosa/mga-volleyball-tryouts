// MGA Volleyball Tryouts - Dashboard Functionality (Your Original Design + Auth)

let dashboardRefreshInterval;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.debugLog('Dashboard initializing...');
    
    // Wait for auth before loading data
    // waitForAuth().then(() => {
        loadDashboardData();
        loadFirstActiveSession();
        
        // Set up auto-refresh
        if (window.CONFIG?.dashboardRefreshInterval) {
            dashboardRefreshInterval = setInterval(() => {
                // if (authManager && authManager.isLoggedIn()) {
                    loadDashboardData();
                // }
            }, window.CONFIG.dashboardRefreshInterval);
        }
//    });
});

// Wait for authentication
async function waitForAuth() {
    return new Promise((resolve) => {
        const checkAuth = () => {
            if (window.authManager && authManager.isLoggedIn()) {
                resolve();
            } else if (window.authManager) {
                // Auth manager exists but not logged in, wait for login
                const checkLogin = setInterval(() => {
                    if (authManager.isLoggedIn()) {
                        clearInterval(checkLogin);
                        resolve();
                    }
                }, 100);
            } else {
                // Auth manager not ready yet
                setTimeout(checkAuth, 100);
            }
        };
        checkAuth();
    });
}

// Load main dashboard statistics
async function loadDashboardData() {
    console.log('[MGA Debug] loadDashboardData() called'); // ADD THIS
    try {
        window.debugLog('Loading dashboard data...');
        console.log('[MGA Debug] About to call mgaAPI.getDashboardData()'); // ADD THIS
        const data = await window.mgaAPI.getDashboardData();
        console.log('[MGA Debug] Dashboard API response:', data); // ADD THIS
        
        if (data && data.totals) {
            console.log('[MGA Debug] Data has totals, displaying stats'); // ADD THIS
            displayDashboardStats(data);
            displayLocationSections(data.byLocation);
            updateLastUpdated();
        } else {
            console.log('[MGA Debug] Data missing totals:', data); // ADD THIS
            throw new Error('Invalid dashboard data received');
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showDashboardError(error.message);
    }
}

// Load first active session for "View Players" button
async function loadFirstActiveSession() {
    try {
        const sessions = await window.mgaAPI.getAvailableTabs();
        
        if (Array.isArray(sessions) && sessions.length > 0) {
            const firstSession = sessions[0];
            const viewPlayersLink = document.getElementById('view-players-link');
            if (viewPlayersLink) {
                viewPlayersLink.href = `players.html?location=${encodeURIComponent(firstSession.location)}&age=${encodeURIComponent(firstSession.age)}`;
            }
        }
        
    } catch (error) {
        console.error('Error loading first active session:', error);
    }
}

// Display dashboard statistics (your original design)
function displayDashboardStats(data) {
    console.log('[MGA Debug] displayDashboardStats called with:', data); // ADD THIS
    const totals = data.totals;
    console.log('[MGA Debug] Totals object:', totals); // ADD THIS
    
    // Update stat cards
    document.getElementById('total-expected').textContent = totals.expected;
    document.getElementById('checked-in-count').textContent = totals.checkedIn;
    // ... rest of function
}

// Display location sections (your original design)
function displayLocationSections(byLocation) {
    const container = document.getElementById('location-sections');
    
    let html = '';
    
    Object.keys(byLocation).forEach(location => {
        const locationData = byLocation[location];
        const locationName = location === 'NORTH' ? 'North' : 'South';
        
        html += `
            <div class="location-section">
                <div class="location-header">${locationName} Location (${locationData.total} players)</div>
                <div class="age-groups">
                    ${generateLocationAgeRows(locationData.ages)}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Generate age group rows for a location (your original design)
function generateLocationAgeRows(ages) {
    let html = '';
    
    Object.keys(ages).forEach(age => {
        const ageData = ages[age];
        
        if (ageData.expected > 0) {
            const progressWidth = Math.max(ageData.checkinPercent, 2); // Minimum 2% for visibility
            const progressClass = getProgressClass(ageData.checkinPercent);
            
            html += `
                <div class="age-row">
                    <div class="age-label">${age}</div>
                    <div class="progress-container">
                        <div class="progress-bar progress-${progressClass}" style="width: ${progressWidth}%"></div>
                    </div>
                    <div class="count">${ageData.checkedIn}/${ageData.expected}</div>
                    <div class="selfie-count">${ageData.selfies}</div>
                    <div class="status-indicator status-${ageData.status}"></div>
                </div>
            `;
        }
    });
    
    return html || '<div style="text-align: center; color: #666; padding: 20px;">No active age groups</div>';
}

// Get progress bar CSS class based on percentage (your original logic)
function getProgressClass(percentage) {
    if (percentage >= 80) return 'good';
    if (percentage >= 50) return 'warning';
    return 'critical';
}

// Show dashboard error
function showDashboardError(message) {
    const container = document.getElementById('location-sections');
    container.innerHTML = `
        <div class="error">
            <div class="error-icon">⚠️</div>
            <div class="error-message">Failed to load dashboard data</div>
            <div class="error-technical">${message}</div>
            <button onclick="refreshDashboard()" class="retry-btn">Retry</button>
        </div>
    `;
    
    // Also update stats to show error state
    document.getElementById('total-expected').textContent = '—';
    document.getElementById('checked-in-count').textContent = '—';
    document.getElementById('checkin-percentage').textContent = '—';
    document.getElementById('selfies-count').textContent = '—';
    document.getElementById('selfie-percentage').textContent = '—';
    document.getElementById('missing-count').textContent = '—';
}

// Manual refresh function
function refreshDashboard() {
    if (!authManager.requireAuth()) return;
    
    window.debugLog('Manual dashboard refresh triggered');
    
    // Show loading state
    document.getElementById('location-sections').innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Refreshing dashboard...</div>
        </div>
    `;
    
    // Load data
    loadDashboardData();
    loadFirstActiveSession();
}

// Update last updated timestamp (your original format)
function updateLastUpdated() {
    const now = new Date();
    const timestamp = now.toLocaleString();
    
    const lastUpdatedElement = document.getElementById('last-updated-time');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = timestamp;
    }
}

// Stop auto-refresh when leaving page
window.addEventListener('beforeunload', function() {
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
    }
});

// Export functions for global access
window.refreshDashboard = refreshDashboard;
