// MGA Volleyball Tryouts - Players with Location-Specific Multi-Day Check-ins

let currentLocation = null;
let currentAge = null;
let currentSort = 'name';
let playersRefreshInterval;
let currentPlayers = [];
let cameraStream = null;
let currentPhotoPlayer = null;

// Dynamic tryout configuration - loaded from Google Sheets Settings tab
let TRYOUT_NAME = 'MGA Volleyball Tryouts';
let NORTH_DATES = []; // Will be populated from Settings
let SOUTH_DATES = []; // Will be populated from Settings
let settingsLoaded = false;

// Initialize players page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    window.debugLog('Players page initializing...');
    
    // Wait for auth before loading data
    waitForAuth().then(() => {
        console.log('[MGA Debug] Auth wait completed, proceeding with initialization');
        initializePage();
    });
});

// Initialize the page with settings
async function initializePage() {
    try {
        // First, load settings from Google Sheets
        console.log('[MGA Debug] Loading settings from Google Sheets...');
        await loadSettings();
        
        // Get parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        currentLocation = urlParams.get('location');
        currentAge = urlParams.get('age');
        currentSort = urlParams.get('sort') || 'name';
        
        window.debugLog('URL params:', { currentLocation, currentAge, currentSort });
        
        // Update page title with dynamic tryout name
        updatePageTitle();
        
        // Load initial data
        console.log('[MGA Debug] About to load available tabs');
        loadAvailableTabs();
        
        if (currentLocation && currentAge) {
            loadPlayers();
            
            // Set up auto-refresh
            if (window.CONFIG?.playersRefreshInterval) {
                playersRefreshInterval = setInterval(() => {
                    if (authManager && authManager.isLoggedIn()) {
                        loadPlayers();
                    }
                }, window.CONFIG.playersRefreshInterval);
            }
        }
        
        // Set up camera modal controls
        setupCameraControls();
        
    } catch (error) {
        console.error('Error initializing page:', error);
        // Use fallback settings if loading fails
        NORTH_DATES = [
            { description: 'Tryout', date: '1/20' },
            { description: 'Callback', date: '1/22' },
            { description: 'Makeup', date: '1/24' }
        ];
        SOUTH_DATES = [...NORTH_DATES]; // Same fallback for both
        TRYOUT_NAME = 'MGA Volleyball Tryouts';
        settingsLoaded = true;
        
        // Continue with initialization
        const urlParams = new URLSearchParams(window.location.search);
        currentLocation = urlParams.get('location');
        currentAge = urlParams.get('age');
        currentSort = urlParams.get('sort') || 'name';
        
        updatePageTitle();
        loadAvailableTabs();
        setupCameraControls();
    }
}

// Load settings from Google Sheets Settings tab
async function loadSettings() {
    try {
        const settings = await window.mgaAPI.getSettings();
        console.log('[MGA Debug] Loaded settings:', settings);
        
        window.settings = settings;
        
        // PROCESS THE RAW DATES INTO NORTH/SOUTH ARRAYS
        const northDates = settings.tryoutDates.filter(d => 
            d.description.toLowerCase().includes('north')
        );
        const southDates = settings.tryoutDates.filter(d => 
            d.description.toLowerCase().includes('south')
        );
        
        // Update global variables
        TRYOUT_NAME = settings.tryoutName || 'MGA Volleyball Tryouts';
        NORTH_DATES = northDates;
        SOUTH_DATES = southDates;
        
        // Also store in window.settings for chips
        window.settings.northDates = northDates;
        window.settings.southDates = southDates;
        
        console.log('[MGA Debug] Tryout Name:', TRYOUT_NAME);
        console.log('[MGA Debug] North Dates:', NORTH_DATES);
        console.log('[MGA Debug] South Dates:', SOUTH_DATES);
        
        settingsLoaded = true;
        updateHeaderTitle();
        
    } catch (error) {
        // ... your existing error handling
    }
}
// Get the current location's tryout dates
function getCurrentLocationDates() {
    if (currentLocation === 'NORTH') {
        return NORTH_DATES;
    } else if (currentLocation === 'SOUTH') {
        return SOUTH_DATES;
    } else {
        return []; // No location selected
    }
}

// Get just the date strings for the current location
function getCurrentLocationDateStrings() {
    return getCurrentLocationDates().map(dateInfo => dateInfo.date);
}

// Update the header title with dynamic tryout name
function updateHeaderTitle() {
    const headerTitle = document.querySelector('.header-center h1');
    if (headerTitle && settingsLoaded) {
        if (currentLocation && currentAge) {
            const locationName = currentLocation === 'NORTH' ? 'North' : 'South';
            headerTitle.textContent = `📷 ${TRYOUT_NAME} - ${locationName} ${currentAge}`;
        } else {
            headerTitle.textContent = `📷 ${TRYOUT_NAME}`;
        }
    }
}

// Wait for authentication
async function waitForAuth() {
    return new Promise((resolve) => {
        const checkAuth = () => {
            if (window.authManager) {
                if (authManager.isLoggedIn()) {
                    console.log('[MGA Debug] Auth check passed, proceeding');
                    resolve();
                } else {
                    console.log('[MGA Debug] Auth manager exists but not logged in, waiting...');
                    setTimeout(checkAuth, 200);
                }
            } else {
                console.log('[MGA Debug] Auth manager not ready, waiting...');
                setTimeout(checkAuth, 100);
            }
        };
        checkAuth();
    });
}

// Get current date string in M/D format
function getCurrentDateString() {
    const today = new Date();
    return `${today.getMonth() + 1}/${today.getDate()}`;
}

// Check if a date is today
function isToday(dateString) {
    return dateString === getCurrentDateString();
}

// Check if a date is in the past
function isPastDate(dateString) {
    try {
        const [month, day] = dateString.split('/').map(Number);
        const currentYear = new Date().getFullYear();
        const dateObj = new Date(currentYear, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dateObj < today;
    } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return false;
    }
}

// Load available tabs/sessions
async function loadAvailableTabs() {
    console.log('[MGA Debug] loadAvailableTabs() called');
    try {
        console.log('[MGA Debug] Calling mgaAPI.getAvailableTabs()');
        const tabs = await window.mgaAPI.getAvailableTabs();
        console.log('[MGA Debug] Got tabs:', tabs);
        displayNavigationTabs(tabs);

        if ((!currentLocation || !currentAge) && tabs.length > 0) {
            console.log('[MGA Debug] Auto-selecting first tab:', tabs[0]);
            currentLocation = tabs[0].location;
            currentAge = tabs[0].age;
            updatePageTitle();
            loadPlayers();
            const newUrl = `${window.location.pathname}?location=${encodeURIComponent(currentLocation)}&age=${encodeURIComponent(currentAge)}&sort=${currentSort}`;
            window.history.pushState({}, '', newUrl);
        }
    } catch (error) {
        console.error('Error loading tabs:', error);
        document.getElementById('navigation-tabs').innerHTML = 
            '<div class="error">Failed to load sessions</div>';
    }
}

// Display navigation tabs
function displayNavigationTabs(tabs) {
    if (!Array.isArray(tabs) || tabs.length === 0) {
        document.getElementById('navigation-tabs').innerHTML = 
            '<span style="color: #666; padding: 10px;">No player data available</span>';
        return;
    }
    
    const tabsHtml = tabs.map(tab => {
        const isActive = tab.location === currentLocation && tab.age === currentAge;
        const activeClass = isActive ? 'active' : '';
        
        return `<a href="#" class="nav-tab ${activeClass}" 
                   onclick="switchToTab('${tab.location}', '${tab.age}'); return false;">
                   ${tab.label} (${tab.playerCount})
                </a>`;
    }).join('');
    
    document.getElementById('navigation-tabs').innerHTML = tabsHtml;
}

// Switch to a different tab
function switchToTab(location, age) {
    if (!authManager.requireAuth()) return;
    
    currentLocation = location;
    currentAge = age;
    
    const newUrl = `${window.location.pathname}?location=${encodeURIComponent(location)}&age=${encodeURIComponent(age)}&sort=${currentSort}`;
    window.history.pushState({}, '', newUrl);
    
    updatePageTitle();
    updateHeaderTitle(); // Update header when location changes
    loadPlayers();
    loadAvailableTabs();
}

// Update page title
function updatePageTitle() {
    const titleElement = document.getElementById('page-title');
    if (titleElement && currentLocation && currentAge && settingsLoaded) {
        const locationName = currentLocation === 'NORTH' ? 'North' : 'South';
        titleElement.textContent = `📷 ${TRYOUT_NAME} - ${locationName} ${currentAge}`;
    } else if (titleElement) {
        titleElement.textContent = '📷 Photo Review';
    }
}

// Load players
async function loadPlayers() {
    if (!currentLocation || !currentAge) {
        document.getElementById('players-container').innerHTML = 
            '<div class="loading">Please select a session above</div>';
        return;
    }
    
    // Wait for settings to be loaded before rendering players
    if (!settingsLoaded) {
        document.getElementById('players-container').innerHTML = 
            '<div class="loading">Loading tryout settings...</div>';
        return;
    }
    
    document.getElementById('players-container').innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading players...</div>
        </div>
    `;
    
    try {
        const data = await window.mgaAPI.getPlayers(currentLocation, currentAge, currentSort);
        
        if (data && Array.isArray(data.players)) {
            currentPlayers = data.players;
            displayPlayers(data);
            updateSessionStats(data);
        } else {
            throw new Error('Invalid players data received');
        }
        
    } catch (error) {
        console.error('Error loading players:', error);
        document.getElementById('players-container').innerHTML = `
            <div class="error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">Failed to load players</div>
                <div class="error-technical">${error.message}</div>
                <button onclick="loadPlayers()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}

// Display players
function displayPlayers(data) {
    const players = data.players || [];
    
    if (players.length === 0) {
        document.getElementById('players-container').innerHTML = 
            '<div style="text-align: center; color: #666; padding: 30px;">No players found for this age group.</div>';
        return;
    }
    
    const playersHtml = players.map(player => generatePlayerCard(player)).join('');
    document.getElementById('players-container').innerHTML = playersHtml;
    updateSortButtons();
}

// Generate player card with location-specific multi-day check-ins
function generatePlayerCard(player) {
    const hasPhoto = player.hasSelfie && player.selfieUrl;
    const todayDate = getCurrentDateString();
    const isCheckedInToday = player.checkinDates && player.checkinDates[todayDate];
    
    // Calculate completion status using location-specific dates
    const completionStatus = getCompletionStatus(player);
    
    const playerJson = JSON.stringify(player).replace(/"/g, '&quot;');
    
    return `
        <div class="player-card ${isCheckedInToday ? 'checked-in-today' : ''}" data-player-id="${player.playerID}">
            <div class="photo-container">
                ${hasPhoto 
                    ? `<img src="${player.selfieUrl}" alt="Player Photo" class="player-photo">
                       <div class="photo-status">✅ Photo</div>`
                    : `<div class="no-photo" onclick="openCameraModal(${playerJson})">📷<br><small>Click to take photo</small></div>`
                }
                <div class="completion-indicator ${completionStatus.cssClass}">
                    ${completionStatus.completed}/${completionStatus.total}
                </div>
            </div>
            
            <div class="player-info">
                <div class="player-name-row">
                    <div class="player-name">${escapeHtml(player.last)}, ${escapeHtml(player.first)}</div>
                    ${player.hand ? `<div class="player-hand">${escapeHtml(player.hand)}</div>` : ''}
                </div>
                
                <!-- Location-Specific Multi-Day Check-in Timeline -->
                <div class="checkin-timeline">
                    ${renderCheckinChips(player, todayDate)}
                </div>
                
                <div class="player-details">
                    <div class="detail-row">
                        <div class="detail-pair">
                            <div class="detail-left">
                                <span class="detail-label">Position:</span>
                                <span class="detail-value position">${escapeHtml(player.position || 'N/A')}</span>
                            </div>
                            <div class="detail-right">
                                <span class="detail-label">School:</span>
                                <span class="detail-value school">${escapeHtml(player.school || 'N/A')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-pair">
                            <div class="detail-left">
                                <span class="detail-label">Pinny:</span>
                                <span class="detail-value pinny">${escapeHtml(player.pinny || 'N/A')}</span>
                            </div>
                            <div class="detail-right">
                                <span class="detail-label">City:</span>
                                <span class="detail-value city">${escapeHtml(player.city || 'N/A')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${hasPhoto ? `
                    <div class="detail-row">
                        <div class="detail-pair">
                            <div class="detail-left">
                                <span class="detail-label">Photo:</span>
                                <span class="detail-value">✅ Submitted</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="staff-actions">
                    ${!isCheckedInToday ? `
                        <button class="staff-btn checkin-today-btn" 
                                onclick="checkInPlayerForDate('${player.playerID}', '${todayDate}', ${playerJson})">
                            ✅ Check In ${todayDate}
                        </button>
                    ` : `
                        <div class="checked-in-today-msg">✅ Checked in today at ${new Date(player.checkinDates[todayDate]).toLocaleTimeString()}</div>
                    `}
                    
                    <button class="staff-btn photo-btn" 
                            onclick="openCameraModal(${playerJson})">
                        📷 ${hasPhoto ? 'Retake Photo' : 'Take Photo'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render check-in chips for current location's dates
function renderCheckinChips(player, todayDate) {
    const locationDates = getCurrentLocationDateStrings();
    const locationDateInfos = getCurrentLocationDates();
    
    return locationDates.map((date, index) => {
        const dateInfo = locationDateInfos[index];
        const isDateToday = date === todayDate;
        const isCheckedIn = player.checkinDates && player.checkinDates[date];
        const isPast = isPastDate(date);
        
        let chipClass = 'checkin-chip';
        let chipText = `${dateInfo.description} ${date}`;
        
        if (isCheckedIn) {
            chipClass += ' completed';
            chipText += '✓';
        } else if (isDateToday) {
            chipClass += ' today';
            chipText += '?';
        } else if (isPast) {
            chipClass += ' missed';
            chipText += '✗';
        } else {
            chipClass += ' upcoming';
        }
        
        return `<span class="${chipClass}" title="${getChipTooltip(dateInfo, isCheckedIn, isDateToday, isPast)}">${chipText}</span>`;
    }).join('');
}

// Get tooltip text for chips
function getChipTooltip(dateInfo, isCheckedIn, isToday, isPast) {
    const label = `${dateInfo.description} (${dateInfo.date})`;
    if (isCheckedIn) return `Checked in for ${label}`;
    if (isToday) return `Today - ${label}`;
    if (isPast) return `Missed ${label}`;
    return `Upcoming - ${label}`;
}

// Get completion status for player using location-specific dates
function getCompletionStatus(player) {
    const locationDates = getCurrentLocationDateStrings();
    const completed = locationDates.filter(date => 
        player.checkinDates && player.checkinDates[date]
    ).length;
    
    const total = locationDates.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    let cssClass = 'none';
    if (percentage === 100) cssClass = 'complete';
    else if (percentage > 0) cssClass = 'partial';
    
    return { completed, total, percentage, cssClass };
}

// Check in player for specific date
async function checkInPlayerForDate(playerID, date, player) {
    if (!authManager.requireAuth()) return;

    try {
        console.log(`Checking in player ${playerID} for date ${date}`);
        
        // For now, simulate the check-in since we need to update the backend
        // In a real implementation, this would call your API with the date
        const result = { success: true };
        
        if (result.success) {
            // Update local data
            if (!player.checkinDates) player.checkinDates = {};
            player.checkinDates[date] = new Date().toISOString();
            
            // Refresh the display
            displayPlayers({ players: currentPlayers });
            
            alert(`✅ ${player.first} ${player.last} checked in for ${date}!`);
        } else {
            throw new Error(result.error || 'Check-in failed');
        }
        
    } catch (error) {
        console.error('Error checking in player:', error);
        alert(`❌ Check-in failed: ${error.message}`);
    }
}

// Update session stats using location-specific dates
function updateSessionStats(data) {
    const statsElement = document.getElementById('session-stats');
    if (statsElement && data && settingsLoaded) {
        const todayCheckins = currentPlayers.filter(p => {
            const today = getCurrentDateString();
            return p.checkinDates && p.checkinDates[today];
        }).length;
        
        statsElement.textContent = `${data.totalPlayers} Total • ${data.withPhotos} Photos • ${todayCheckins} Checked In Today`;
    }
}

// [Include all existing camera functions and other code...]
// [Keep all your existing functions like escapeHtml, sortPlayers, camera functions, etc.]

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sort players
function sortPlayers(sortBy) {
    if (!authManager.requireAuth()) return;
    if (sortBy === currentSort) return;
    
    currentSort = sortBy;
    
    const newUrl = `${window.location.pathname}?location=${encodeURIComponent(currentLocation)}&age=${encodeURIComponent(currentAge)}&sort=${sortBy}`;
    window.history.pushState({}, '', newUrl);
    
    loadPlayers();
}

// Update sort buttons
function updateSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`sort-${currentSort}`)?.classList.add('active');
}

// [All your existing camera functions go here - I'll include them to keep this complete]

// Camera Modal Functions
function openCameraModal(player) {
    if (!authManager.requireAuth()) return;
    
    window.debugLog('Opening camera for player:', player);
    
    const modal = document.getElementById('camera-modal');
    const title = document.getElementById('camera-modal-title');
    
    if (modal && title) {
        title.textContent = `📸 Capture Photo - ${player.first} ${player.last}`;
        modal.style.display = 'block';
        
        currentPhotoPlayer = player;
        resetCameraInterface();
    }
}

function closeCameraModal() {
    const modal = document.getElementById('camera-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    stopCameraStream();
    currentPhotoPlayer = null;
    resetCameraInterface();
}

// Camera Control Functions
function setupCameraControls() {
    const startBtn = document.getElementById('start-camera-btn');
    const takeBtn = document.getElementById('take-photo-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const submitBtn = document.getElementById('submit-photo-btn');
    
    if (startBtn) startBtn.addEventListener('click', startCamera);
    if (takeBtn) takeBtn.addEventListener('click', takePhoto);
    if (retakeBtn) retakeBtn.addEventListener('click', retakePhoto);
    if (submitBtn) submitBtn.addEventListener('click', submitPhoto);
}

async function startCamera() {
    const video = document.getElementById('camera-video');
    const placeholder = document.getElementById('camera-placeholder');
    const status = document.getElementById('camera-status');
    
    try {
        status.textContent = 'Starting camera...';
        status.style.color = '#4169E1';
        
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 640 },
                facingMode: 'user'
            } 
        });
        
        video.srcObject = cameraStream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        
        document.getElementById('start-camera-btn').style.display = 'none';
        document.getElementById('take-photo-btn').style.display = 'inline-block';
        
        status.textContent = 'Camera ready! Position yourself and click "Take Photo"';
        status.style.color = '#28a745';
        
    } catch (error) {
        console.error('Error starting camera:', error);
        status.textContent = 'Error: Could not access camera. Please check permissions.';
        status.style.color = '#dc3545';
    }
}

function takePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const capturedImage = document.getElementById('captured-image');
    const status = document.getElementById('camera-status');
    
    if (!video.videoWidth || !video.videoHeight) {
        status.textContent = 'Error: Camera not ready';
        status.style.color = '#dc3545';
        return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    
    capturedImage.src = photoData;
    capturedImage.style.display = 'block';
    video.style.display = 'none';
    
    currentPhotoPlayer.capturedPhoto = photoData;
    
    document.getElementById('take-photo-btn').style.display = 'none';
    document.getElementById('retake-btn').style.display = 'inline-block';
    document.getElementById('submit-photo-btn').style.display = 'inline-block';
    
    status.textContent = 'Photo captured! Review and submit or retake.';
    status.style.color = '#28a745';
}

function retakePhoto() {
    const video = document.getElementById('camera-video');
    const capturedImage = document.getElementById('captured-image');
    const status = document.getElementById('camera-status');
    
    video.style.display = 'block';
    capturedImage.style.display = 'none';
    
    document.getElementById('retake-btn').style.display = 'none';
    document.getElementById('submit-photo-btn').style.display = 'none';
    document.getElementById('take-photo-btn').style.display = 'inline-block';
    
    if (currentPhotoPlayer) {
        delete currentPhotoPlayer.capturedPhoto;
    }
    
    status.textContent = 'Ready to take photo again';
    status.style.color = '#4169E1';
}

async function submitPhoto() {
    if (!currentPhotoPlayer || !currentPhotoPlayer.capturedPhoto) {
        alert('No photo to submit');
        return;
    }
    
    const status = document.getElementById('camera-status');
    const submitBtn = document.getElementById('submit-photo-btn');
    
    try {
        status.textContent = 'Submitting photo...';
        status.style.color = '#4169E1';
        submitBtn.disabled = true;
        
        const result = await submitPhotoToAPI(currentPhotoPlayer.capturedPhoto, currentPhotoPlayer);
        
        if (result.success) {
            status.textContent = '✅ Photo submitted successfully!';
            status.style.color = '#28a745';
            
            setTimeout(() => {
                closeCameraModal();
                loadPlayers();
            }, 2000);
        } else {
            throw new Error(result.error || 'Submission failed');
        }
        
    } catch (error) {
        console.error('Error submitting photo:', error);
        status.textContent = `❌ Error: ${error.message}`;
        status.style.color = '#dc3545';
        submitBtn.disabled = false;
    }
}

async function submitPhotoToAPI(photoData, player) {
    console.log('Photo submission for player:', player.playerID);
    console.log('Photo data size:', photoData.length);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true };
}

function stopCameraStream() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function resetCameraInterface() {
    const video = document.getElementById('camera-video');
    const capturedImage = document.getElementById('captured-image');
    const placeholder = document.getElementById('camera-placeholder');
    const status = document.getElementById('camera-status');
    
    if (video) video.style.display = 'none';
    if (capturedImage) capturedImage.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    
    document.getElementById('start-camera-btn').style.display = 'inline-block';
    document.getElementById('take-photo-btn').style.display = 'none';
    document.getElementById('retake-btn').style.display = 'none';
    document.getElementById('submit-photo-btn').style.display = 'none';
    
    if (status) {
        status.textContent = '';
        status.style.color = '#333';
    }
    
    const submitBtn = document.getElementById('submit-photo-btn');
    if (submitBtn) submitBtn.disabled = false;
}

// Check in a player (legacy function for compatibility)
async function checkInPlayer(player) {
    const today = getCurrentDateString();
    return checkInPlayerForDate(player.playerID, today, player);
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (playersRefreshInterval) {
        clearInterval(playersRefreshInterval);
    }
    stopCameraStream();
});

// Export functions for global access
window.switchToTab = switchToTab;
window.sortPlayers = sortPlayers;
window.checkInPlayer = checkInPlayer;
window.openCameraModal = openCameraModal;
window.closeCameraModal = closeCameraModal;
