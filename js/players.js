// MGA Volleyball Tryouts - Players/Photo Review Functionality (Your Original Design + Auth)

let currentLocation = null;
let currentAge = null;
let currentSort = 'name';
let playersRefreshInterval;
let currentPlayers = [];
let cameraStream = null;
let currentPhotoPlayer = null;

// Initialize players page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    window.debugLog('Players page initializing...');
    
    // Wait for auth before loading data
    // waitForAuth().then(() => {
    console.log('[MGA Debug] Auth wait completed, proceeding with initialization'); // ADD THIS
    
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentLocation = urlParams.get('location');
    currentAge = urlParams.get('age');
    currentSort = urlParams.get('sort') || 'name';
    
    window.debugLog('URL params:', { currentLocation, currentAge, currentSort });
    
    // Update page title
    updatePageTitle();
    
    // Load initial data
    console.log('[MGA Debug] About to load available tabs'); // ADD THIS
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
    //});
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

// Load available tabs/sessions
async function loadAvailableTabs() {
    console.log('[MGA Debug] loadAvailableTabs() called'); // ADD THIS
    try {
        console.log('[MGA Debug] Calling mgaAPI.getAvailableTabs()'); // ADD THIS
        const tabs = await window.mgaAPI.getAvailableTabs();
        console.log('[MGA Debug] Got tabs:', tabs); // ADD THIS
        displayNavigationTabs(tabs);

        if ((!currentLocation || !currentAge) && tabs.length > 0) {
            console.log('[MGA Debug] Auto-selecting first tab:', tabs[0]);
            currentLocation = tabs[0].location;
            currentAge = tabs[0].age;
            updatePageTitle();
            loadPlayers();
            // Update the URL
            const newUrl = `${window.location.pathname}?location=${encodeURIComponent(currentLocation)}&age=${encodeURIComponent(currentAge)}&sort=${currentSort}`;
            window.history.pushState({}, '', newUrl);
        }
    } catch (error) {
        console.error('Error loading tabs:', error);
        document.getElementById('navigation-tabs').innerHTML = 
            '<div class="error">Failed to load sessions</div>';
    }
}

// Display navigation tabs (your original design)
function displayNavigationTabs(tabs) {
    console.log('[MGA Debug] displayNavigationTabs called with:', tabs); // ADD THIS
    if (!Array.isArray(tabs) || tabs.length === 0) {
        console.log('[MGA Debug] No tabs or empty array'); // ADD THIS
        document.getElementById('navigation-tabs').innerHTML = 
            '<span style="color: #666; padding: 10px;">No player data available</span>';
        return;
    }
    
    console.log('[MGA Debug] Processing', tabs.length, 'tabs'); // ADD THIS
    
    const tabsHtml = tabs.map(tab => {
        const isActive = tab.location === currentLocation && tab.age === currentAge;
        const activeClass = isActive ? 'active' : '';
        
        console.log('[MGA Debug] Processing tab:', tab); // ADD THIS
        
        return `<a href="#" class="nav-tab ${activeClass}" 
                   onclick="switchToTab('${tab.location}', '${tab.age}'); return false;">
                   ${tab.label} (${tab.playerCount})
                </a>`;
    }).join('');
    
    console.log('[MGA Debug] Generated HTML:', tabsHtml); // ADD THIS
    
    document.getElementById('navigation-tabs').innerHTML = tabsHtml;
    console.log('[MGA Debug] Set innerHTML complete'); // ADD THIS
}

// Switch to a different tab
function switchToTab(location, age) {
    if (!authManager.requireAuth()) return;
    
    window.debugLog('Switching to tab:', location, age);
    
    // Update current state
    currentLocation = location;
    currentAge = age;
    
    // Update URL without reload
    const newUrl = `${window.location.pathname}?location=${encodeURIComponent(location)}&age=${encodeURIComponent(age)}&sort=${currentSort}`;
    window.history.pushState({}, '', newUrl);
    
    // Update page title
    updatePageTitle();
    
    // Load new data
    loadPlayers();
    
    // Update navigation tabs to show active state
    loadAvailableTabs();
}

// Update page title based on current selection
function updatePageTitle() {
    const titleElement = document.getElementById('page-title');
    if (titleElement && currentLocation && currentAge) {
        const locationName = currentLocation === 'NORTH' ? 'North' : 'South';
        titleElement.textContent = `📷 ${locationName} ${currentAge}`;
    }
}

// Load players for current location and age
async function loadPlayers() {
    if (!currentLocation || !currentAge) {
        document.getElementById('players-container').innerHTML = 
            '<div class="loading">Please select a session above</div>';
        return;
    }
    
    // Show loading state
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

// Display players using your original card design
function displayPlayers(data) {
    const players = data.players || [];
    
    if (players.length === 0) {
        document.getElementById('players-container').innerHTML = 
            '<div style="text-align: center; color: #666; padding: 30px;">No players found for this age group.</div>';
        return;
    }
    
    const playersHtml = players.map(player => generatePlayerCard(player)).join('');
    document.getElementById('players-container').innerHTML = playersHtml;
    
    // Update sort button states
    updateSortButtons();
}

// Generate individual player card (your original design)
function generatePlayerCard(player) {
    const hasPhoto = player.hasSelfie && player.selfieUrl;
    const isCheckedIn = player.hasCheckedIn;
    const cardClass = `player-card ${isCheckedIn ? 'checked-in' : ''}`;
    
    const playerJson = JSON.stringify(player).replace(/"/g, '&quot;');
    
    return `
        <div class="${cardClass}">
            <div class="photo-container">
                ${hasPhoto 
                    ? `<img src="${player.selfieUrl}" alt="Player Photo" class="player-photo">
                       <div class="photo-status">✅ Photo</div>`
                    : `<div class="no-photo" onclick="openCameraModal(${playerJson})">📷<br><small>Click to take photo</small></div>`
                }
            </div>
            
            <div class="player-info">
                <div class="player-name-row">
                    <div class="player-name">${escapeHtml(player.last)}, ${escapeHtml(player.first)}</div>
                    ${player.hand ? `<div class="player-hand">${escapeHtml(player.hand)}</div>` : ''}
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
                
                <div class="staff-actions">
                    <button class="staff-btn checkin-btn ${isCheckedIn ? 'disabled' : ''}" 
                            onclick="checkInPlayer(${playerJson})"
                            ${isCheckedIn ? 'disabled' : ''}>
                        ${isCheckedIn ? '✅ Checked In' : '📝 Check In'}
                    </button>
                    <button class="staff-btn photo-btn" 
                            onclick="openCameraModal(${playerJson})">
                        📷 Photo
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sort players
function sortPlayers(sortBy) {
    if (!authManager.requireAuth()) return;
    if (sortBy === currentSort) return; // Already sorted this way
    
    currentSort = sortBy;
    
    // Update URL
    const newUrl = `${window.location.pathname}?location=${encodeURIComponent(currentLocation)}&age=${encodeURIComponent(currentAge)}&sort=${sortBy}`;
    window.history.pushState({}, '', newUrl);
    
    // Reload players with new sort
    loadPlayers();
}

// Update sort button states
function updateSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`sort-${currentSort}`)?.classList.add('active');
}

// Update session stats (your original format)
function updateSessionStats(data) {
    const statsElement = document.getElementById('session-stats');
    if (statsElement && data) {
        statsElement.textContent = `${data.totalPlayers} Total • ${data.withPhotos} Photos • ${data.totalPlayers - data.withPhotos} Missing`;
    }
}

// Check in a player
async function checkInPlayer(player) {
    if (!authManager.requireAuth()) return;
    
    if (player.hasCheckedIn) {
        alert('Player is already checked in');
        return;
    }
    
    try {
        window.debugLog('Checking in player:', player);
        
        const result = await window.mgaAPI.checkInPlayer({
            playerID: player.playerID,
            first: player.first,
            last: player.last,
            location: currentLocation,
            age: currentAge
        });
        
        if (result.success) {
            alert(`✅ ${player.first} ${player.last} checked in successfully!`);
            loadPlayers(); // Refresh the list
        } else {
            throw new Error(result.error || 'Check-in failed');
        }
        
    } catch (error) {
        console.error('Check-in error:', error);
        alert(`❌ Check-in failed: ${error.message}`);
    }
}

// Camera Modal Functions
function openCameraModal(player) {
    if (!authManager.requireAuth()) return;
    
    window.debugLog('Opening camera for player:', player);
    
    const modal = document.getElementById('camera-modal');
    const title = document.getElementById('camera-modal-title');
    
    if (modal && title) {
        title.textContent = `📸 Capture Photo - ${player.first} ${player.last}`;
        modal.style.display = 'block';
        
        // Store current player
        currentPhotoPlayer = player;
        
        // Reset camera interface
        resetCameraInterface();
    }
}

function closeCameraModal() {
    const modal = document.getElementById('camera-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Stop camera stream
    stopCameraStream();
    
    // Reset state
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
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    
    // Convert to data URL
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Show captured image
    capturedImage.src = photoData;
    capturedImage.style.display = 'block';
    video.style.display = 'none';
    
    // Store photo data
    currentPhotoPlayer.capturedPhoto = photoData;
    
    // Update controls
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
    
    // Show video, hide image
    video.style.display = 'block';
    capturedImage.style.display = 'none';
    
    // Update controls
    document.getElementById('retake-btn').style.display = 'none';
    document.getElementById('submit-photo-btn').style.display = 'none';
    document.getElementById('take-photo-btn').style.display = 'inline-block';
    
    // Clear stored photo
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
        
        // Call the API to process photo submission
        const result = await submitPhotoToAPI(currentPhotoPlayer.capturedPhoto, currentPhotoPlayer);
        
        if (result.success) {
            status.textContent = '✅ Photo submitted successfully!';
            status.style.color = '#28a745';
            
            // Close modal after short delay
            setTimeout(() => {
                closeCameraModal();
                loadPlayers(); // Refresh player list
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

// API call for photo submission (placeholder - needs implementation)
async function submitPhotoToAPI(photoData, player) {
    // This would call your Apps Script API to process the photo
    console.log('Photo submission for player:', player.playerID);
    console.log('Photo data size:', photoData.length);
    
    // Simulate API call
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
    
    // Hide video and image, show placeholder
    if (video) video.style.display = 'none';
    if (capturedImage) capturedImage.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    
    // Reset controls
    document.getElementById('start-camera-btn').style.display = 'inline-block';
    document.getElementById('take-photo-btn').style.display = 'none';
    document.getElementById('retake-btn').style.display = 'none';
    document.getElementById('submit-photo-btn').style.display = 'none';
    
    // Clear status
    if (status) {
        status.textContent = '';
        status.style.color = '#333';
    }
    
    // Enable submit button
    const submitBtn = document.getElementById('submit-photo-btn');
    if (submitBtn) submitBtn.disabled = false;
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
