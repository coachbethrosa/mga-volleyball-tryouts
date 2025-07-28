// Group Photos - Complete functionality
// This file is loaded only on group-photos.html

let groupPhotoState = {
    location: null,
    age: null,
    position: null,
    allPlayers: [],
    selectedPlayers: [],
    cameraStream: null,
    capturedPhoto: null,
    detectedNumbers: [],
    confirmedPlayers: [],
    photoCount: 1
};

let uploadState = {
    photoData: null,
    photoType: null,
    selectedPlayers: [],
    allPlayers: []
};

// Initialize group photos page
document.addEventListener('DOMContentLoaded', function() {
    debugLog('Group Photos page loaded');
    
    // Wait for auth
    waitForAuth().then(() => {
        debugLog('Group Photos auth complete');
        updatePageTitle();
        setupEventListeners();
    });
});

// Setup event listeners
function setupEventListeners() {
    const startGroupCameraBtn = document.getElementById('start-group-camera-btn');
    const takeGroupPhotoBtn = document.getElementById('take-group-photo-btn');
    const retakeGroupBtn = document.getElementById('retake-group-btn');
    const analyzeGroupBtn = document.getElementById('analyze-group-btn');
    
    if (startGroupCameraBtn) startGroupCameraBtn.addEventListener('click', startGroupCamera);
    if (takeGroupPhotoBtn) takeGroupPhotoBtn.addEventListener('click', takeGroupPhoto);
    if (retakeGroupBtn) retakeGroupBtn.addEventListener('click', retakeGroupPhoto);
    if (analyzeGroupBtn) analyzeGroupBtn.addEventListener('click', analyzeGroupPhoto);
}

// Update page title
function updatePageTitle() {
    const titleElement = document.getElementById('page-title');
    if (titleElement) {
        titleElement.textContent = '👥 Group Photos';
    }
}

// Open group photo modal
function openGroupPhotoModal() {
    if (!authManager.requireAuth()) return;
    
    const modal = document.getElementById('group-photo-modal');
    modal.style.display = 'block';
    resetGroupPhotoState();
    showGroupPhotoStep('filters');
}

// Close group photo modal
function closeGroupPhotoModal() {
    const modal = document.getElementById('group-photo-modal');
    modal.style.display = 'none';
    stopGroupCameraStream();
    resetGroupPhotoState();
}

// Reset group photo state
function resetGroupPhotoState() {
    groupPhotoState = {
        location: null,
        age: null,
        position: null,
        allPlayers: [],
        selectedPlayers: [],
        cameraStream: null,
        capturedPhoto: null,
        detectedNumbers: [],
        confirmedPlayers: [],
        photoCount: 1
    };
    
    // Reset form
    document.getElementById('group-location').value = '';
    document.getElementById('group-age').value = '';
    document.getElementById('group-position').value = '';
}

// Show specific step in group photo workflow
function showGroupPhotoStep(step) {
    const steps = ['filters', 'checklist', 'camera', 'confirm', 'results'];
    steps.forEach(s => {
        const element = document.getElementById(`group-photo-${s}`);
        if (element) {
            element.style.display = s === step ? 'block' : 'none';
        }
    });
}

// Load players for selected position
async function loadPositionPlayers() {
    const location = document.getElementById('group-location').value;
    const age = document.getElementById('group-age').value;
    const position = document.getElementById('group-position').value;
    
    console.log('=== GROUP PHOTOS DEBUG ===');
    console.log('Form values:', { location, age, position });
    
    if (!location || !age || !position) {
        alert('Please select location, age, and position');
        return;
    }
    
    try {
        groupPhotoState.location = location;
        groupPhotoState.age = age;
        groupPhotoState.position = position;
        
        console.log(`Loading players for ${location} ${age} ${position}`);
        
        // Get all players for this location/age
        console.log('Calling mgaAPI.getPlayers with:', { location, age, sort: 'pinny' });
        const data = await window.mgaAPI.getPlayers(location, age, 'pinny');
        console.log('Raw API response:', data);
        
        if (!data || !data.players) {
            console.log('ERROR: API returned no data or no players array');
            alert(`No data returned from API for ${location} ${age}`);
            return;
        }
        
        console.log(`Received ${data.players.length} total players for ${location} ${age}`);
        
        if (data.players.length === 0) {
            console.log('ERROR: Zero players returned from API');
            alert(`No players found for ${location} ${age}. Please check your data.`);
            return;
        }
        
        // Debug: Log first few players to see data structure
        console.log('Sample player data (first 3):');
        data.players.slice(0, 3).forEach((player, i) => {
            console.log(`Player ${i+1}:`, {
                name: `${player.first} ${player.last}`,
                position: player.position,
                pinny: player.pinny,
                location: player.location,
                age: player.age
            });
        });
        
        // Debug: Log all unique positions found
        const allPositions = [...new Set(data.players.map(p => p.position).filter(p => p))];
        console.log('All positions found in data:', allPositions);
        
        // Debug: Show position matching logic
        console.log(`Looking for players with position containing: "${position}"`);
        
        // Filter by position - be more flexible with matching
        const positionPlayers = data.players.filter(player => {
            const playerPosition = player.position || '';
            const positionLower = position.toLowerCase();
            const playerPositionLower = playerPosition.toLowerCase();
            
            // Try multiple matching strategies
            const exactMatch = playerPositionLower === positionLower;
            const playerContainsPosition = playerPositionLower.includes(positionLower);
            const positionContainsPlayer = positionLower.includes(playerPositionLower);
            
            const hasMatchingPosition = exactMatch || playerContainsPosition || positionContainsPlayer;
            const hasPinny = player.pinny && player.pinny !== 'N/A' && player.pinny.toString().trim() !== '';
            
            if (hasMatchingPosition || playerPosition) {
                console.log(`Player: ${player.first} ${player.last}`);
                console.log(`  Position: "${playerPosition}" vs looking for "${position}"`);
                console.log(`  Exact match: ${exactMatch}`);
                console.log(`  Player contains position: ${playerContainsPosition}`);
                console.log(`  Position contains player: ${positionContainsPlayer}`);
                console.log(`  Has valid pinny: ${hasPinny} (pinny: "${player.pinny}")`);
                console.log(`  INCLUDED: ${hasMatchingPosition && hasPinny}`);
                console.log('---');
            }
            
            return hasMatchingPosition && hasPinny;
        });
        
        console.log(`RESULT: Found ${positionPlayers.length} players matching position "${position}" with valid pinnies`);
        
        if (positionPlayers.length === 0) {
            // Show helpful error message
            const playersWithPosition = data.players.filter(player => {
                const playerPosition = player.position || '';
                const positionLower = position.toLowerCase();
                const playerPositionLower = playerPosition.toLowerCase();
                return playerPositionLower === positionLower || 
                       playerPositionLower.includes(positionLower) || 
                       positionLower.includes(playerPositionLower);
            });
            
            console.log(`Players with matching position (regardless of pinny): ${playersWithPosition.length}`);
            
            if (playersWithPosition.length > 0) {
                const playersWithoutPinnies = playersWithPosition.filter(p => !p.pinny || p.pinny === 'N/A' || p.pinny.toString().trim() === '');
                console.log('Players with position but no pinny:', playersWithoutPinnies);
                alert(`Found ${playersWithPosition.length} ${position} players, but ${playersWithoutPinnies.length} don't have pinny numbers assigned. Please assign pinny numbers first.`);
            } else {
                console.log('No players found with matching position at all');
                alert(`No ${position} players found for ${location} ${age}. Available positions: ${allPositions.join(', ')}`);
            }
            return;
        }
        
        groupPhotoState.allPlayers = positionPlayers;
        groupPhotoState.selectedPlayers = [...positionPlayers]; // Default: select all
        
        displayPlayersChecklist(positionPlayers);
        updatePositionTitle();
        showGroupPhotoStep('checklist');
        
    } catch (error) {
        console.error('ERROR loading position players:', error);
        console.log('Full error details:', error);
        alert(`Error loading players: ${error.message}`);
    }
}

// Display players checklist
function displayPlayersChecklist(players) {
    const container = document.getElementById('players-checklist');
    const totalElement = document.getElementById('players-total');
    
    if (players.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666;">No players found for this position.</div>';
        totalElement.textContent = '0';
        return;
    }
    
    const html = players.map(player => `
        <div class="player-checkbox-item">
            <input type="checkbox" 
                   id="player-${player.playerID}" 
                   checked 
                   onchange="togglePlayerSelection('${player.playerID}')">
            <label for="player-${player.playerID}">
                <span class="player-pinny">#${escapeHtml(player.pinny)}</span>
                <span class="player-name">${escapeHtml(formatPlayerName(player))}</span>
                <span class="player-school">${escapeHtml(player.school || 'N/A')}</span>
            </label>
        </div>
    `).join('');
    
    container.innerHTML = html;
    totalElement.textContent = players.length;
    updateSelectedCount();
}

// Toggle player selection
function togglePlayerSelection(playerID) {
    const player = groupPhotoState.allPlayers.find(p => p.playerID === playerID);
    if (!player) return;
    
    const index = groupPhotoState.selectedPlayers.findIndex(p => p.playerID === playerID);
    if (index > -1) {
        groupPhotoState.selectedPlayers.splice(index, 1);
    } else {
        groupPhotoState.selectedPlayers.push(player);
    }
    
    updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
    const selectedElement = document.getElementById('players-selected');
    selectedElement.textContent = groupPhotoState.selectedPlayers.length;
}

// Select all players
function selectAllPlayers() {
    groupPhotoState.selectedPlayers = [...groupPhotoState.allPlayers];
    
    groupPhotoState.allPlayers.forEach(player => {
        const checkbox = document.getElementById(`player-${player.playerID}`);
        if (checkbox) checkbox.checked = true;
    });
    
    updateSelectedCount();
}

// Clear all players
function clearAllPlayers() {
    groupPhotoState.selectedPlayers = [];
    
    groupPhotoState.allPlayers.forEach(player => {
        const checkbox = document.getElementById(`player-${player.playerID}`);
        if (checkbox) checkbox.checked = false;
    });
    
    updateSelectedCount();
}

// Update position title
function updatePositionTitle() {
    const titleElement = document.getElementById('position-title');
    const locationName = groupPhotoState.location === 'NORTH' ? 'North' : 'South';
    titleElement.textContent = `${locationName} ${groupPhotoState.age} ${groupPhotoState.position}`;
}

// Start group photo
function startGroupPhoto() {
    if (groupPhotoState.selectedPlayers.length === 0) {
        alert('Please select at least one player');
        return;
    }
    
    displayExpectedPlayers();
    showGroupPhotoStep('camera');
    resetGroupCameraInterface();
}

// Display expected players
function displayExpectedPlayers() {
    const container = document.getElementById('expected-players-list');
    
    const html = groupPhotoState.selectedPlayers
        .sort((a, b) => parseInt(a.pinny) - parseInt(b.pinny))
        .map(player => `
            <span class="expected-player-chip">#${player.pinny} ${player.first} ${player.last}</span>
        `).join('');
    
    container.innerHTML = html;
}

// Start group camera
async function startGroupCamera() {
    const previewContainer = document.getElementById('group-camera-preview');
    const video = document.getElementById('group-camera-video');
    const placeholder = document.getElementById('group-camera-placeholder');
    const status = document.getElementById('group-camera-status');
    
    try {
        status.textContent = 'Starting camera...';
        status.style.color = '#4169E1';
        
        // Use shared camera constraints for group photos
        groupPhotoState.cameraStream = await navigator.mediaDevices.getUserMedia(CameraUtils.getGroupPhotoConstraints());
        
        video.srcObject = groupPhotoState.cameraStream;
        previewContainer.style.display = 'block';
        placeholder.style.display = 'none';
        
        document.getElementById('start-group-camera-btn').style.display = 'none';
        document.getElementById('take-group-photo-btn').style.display = 'inline-block';
        
        status.textContent = 'Camera ready! Position players and take photo';
        status.style.color = '#28a745';
        
    } catch (error) {
        console.error('Error starting group camera:', error);
        status.textContent = 'Error: Could not access camera. Please check permissions.';
        status.style.color = '#dc3545';
    }
}

// Take group photo
async function takeGroupPhoto() {
    const video = document.getElementById('group-camera-video');
    const canvas = document.getElementById('group-camera-canvas');
    const capturedImage = document.getElementById('group-captured-image');
    const status = document.getElementById('group-camera-status');
    
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
    groupPhotoState.capturedPhoto = photoData;
    
    capturedImage.src = photoData;
    capturedImage.style.display = 'block';
    document.getElementById('group-camera-preview').style.display = 'none';
    
    document.getElementById('take-group-photo-btn').style.display = 'none';
    document.getElementById('retake-group-btn').style.display = 'inline-block';
    document.getElementById('analyze-group-btn').style.display = 'inline-block';
    
    status.textContent = 'Photo captured! Click "Detect Players" to analyze.';
    status.style.color = '#28a745';
}

// Retake group photo
function retakeGroupPhoto() {
    const previewContainer = document.getElementById('group-camera-preview');
    const capturedImage = document.getElementById('group-captured-image');
    const status = document.getElementById('group-camera-status');
    
    previewContainer.style.display = 'block';
    capturedImage.style.display = 'none';
    
    document.getElementById('retake-group-btn').style.display = 'none';
    document.getElementById('analyze-group-btn').style.display = 'none';
    document.getElementById('take-group-photo-btn').style.display = 'inline-block';
    
    groupPhotoState.capturedPhoto = null;
    groupPhotoState.detectedNumbers = [];
    
    status.textContent = 'Ready to take photo again';
    status.style.color = '#4169E1';
}

// Analyze group photo for pinny numbers
async function analyzeGroupPhoto() {
    if (!groupPhotoState.capturedPhoto) {
        alert('No photo to analyze');
        return;
    }
    
    const status = document.getElementById('group-camera-status');
    
    try {
        status.textContent = 'Analyzing photo for pinny numbers...';
        status.style.color = '#4169E1';
        
        // Use shared OCR functions
        const text = await detectTextInImage(groupPhotoState.capturedPhoto);
        const allNumbers = extractNumbers(text);
        
        // Filter to only include numbers that match expected pinny numbers
        const expectedPinnies = groupPhotoState.selectedPlayers.map(p => p.pinny);
        const detectedPinnies = allNumbers.filter(num => expectedPinnies.includes(num));
        
        groupPhotoState.detectedNumbers = [...new Set(detectedPinnies)]; // Remove duplicates
        
        debugLog('Expected pinnies:', expectedPinnies);
        debugLog('Detected pinnies:', groupPhotoState.detectedNumbers);
        
        // Initialize confirmed players based on detected numbers
        groupPhotoState.confirmedPlayers = groupPhotoState.selectedPlayers.filter(player => 
            groupPhotoState.detectedNumbers.includes(player.pinny)
        );
        
        displayConfirmationScreen();
        showGroupPhotoStep('confirm');
        
    } catch (error) {
        console.error('OCR Error:', error);
        status.textContent = 'Could not analyze photo. Please confirm players manually.';
        status.style.color = '#666';
        
        // Fallback: show all selected players for manual confirmation
        groupPhotoState.detectedNumbers = [];
        groupPhotoState.confirmedPlayers = [...groupPhotoState.selectedPlayers];
        displayConfirmationScreen();
        showGroupPhotoStep('confirm');
    }
}

// Display confirmation screen
function displayConfirmationScreen() {
    displayDetectedNumbers();
    displayConfirmationChecklist();
}

// Display detected numbers
function displayDetectedNumbers() {
    const container = document.getElementById('detected-numbers-list');
    const expectedPinnies = groupPhotoState.selectedPlayers.map(p => p.pinny);
    
    if (groupPhotoState.detectedNumbers.length === 0) {
        container.innerHTML = '<div style="color: #666;">No pinny numbers detected automatically. Please confirm manually below.</div>';
        return;
    }
    
    const html = groupPhotoState.detectedNumbers.map(num => {
        const expected = expectedPinnies.includes(num);
        const cssClass = expected ? 'found' : 'unexpected';
        return `<span class="detected-number-chip ${cssClass}">#${num}</span>`;
    }).join('');
    
    // Add missing numbers
    const missing = expectedPinnies.filter(pinny => !groupPhotoState.detectedNumbers.includes(pinny));
    const missingHtml = missing.map(num => 
        `<span class="detected-number-chip missing">#${num} (missing)</span>`
    ).join('');
    
    container.innerHTML = html + missingHtml;
}

// Display confirmation checklist
function displayConfirmationChecklist() {
    const container = document.getElementById('confirm-players-list');
    
    const html = groupPhotoState.selectedPlayers.map(player => {
        const isConfirmed = groupPhotoState.confirmedPlayers.some(p => p.playerID === player.playerID);
        return `
            <div class="confirm-player-item">
                <input type="checkbox" 
                       id="confirm-${player.playerID}" 
                       ${isConfirmed ? 'checked' : ''}
                       onchange="toggleConfirmedPlayer('${player.playerID}')">
                <label for="confirm-${player.playerID}">
                    <span class="player-pinny">#${player.pinny}</span>
                    <span class="player-name">${player.first} ${player.last}</span>
                </label>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Toggle confirmed player
function toggleConfirmedPlayer(playerID) {
    const player = groupPhotoState.selectedPlayers.find(p => p.playerID === playerID);
    if (!player) return;
    
    const index = groupPhotoState.confirmedPlayers.findIndex(p => p.playerID === playerID);
    if (index > -1) {
        groupPhotoState.confirmedPlayers.splice(index, 1);
    } else {
        groupPhotoState.confirmedPlayers.push(player);
    }
}

// Go back to camera
function goBackToCamera() {
    showGroupPhotoStep('camera');
}

// Save group photo
async function saveGroupPhoto() {
    if (groupPhotoState.confirmedPlayers.length === 0) {
        alert('Please select at least one player in the photo');
        return;
    }
    
    if (!groupPhotoState.capturedPhoto) {
        alert('No photo to save');
        return;
    }
    
    try {
        const status = document.getElementById('group-camera-status');
        if (status) {
            status.textContent = 'Saving group photo...';
            status.style.color = '#4169E1';
        }
        
        // Create photo metadata
        const photoMetadata = {
            type: 'group',
            location: groupPhotoState.location,
            age: groupPhotoState.age,
            position: groupPhotoState.position,
            players: groupPhotoState.confirmedPlayers.map(p => ({
                playerID: p.playerID,
                pinny: p.pinny,
                name: `${p.first} ${p.last}`
            })),
            photoNumber: groupPhotoState.photoCount,
            timestamp: new Date().toISOString()
        };
        
        console.log('=== SAVING GROUP PHOTO ===');
        console.log('Photo metadata:', photoMetadata);
        console.log('Photo data size:', groupPhotoState.capturedPhoto.length);
        
        // Call the real API
        const result = await window.mgaAPI.saveGroupPhoto(groupPhotoState.capturedPhoto, photoMetadata);
        
        console.log('API response:', result);
        
        if (result.success) {
            console.log('✅ Group photo saved successfully');
            
            if (status) {
                status.textContent = '✅ Photo saved successfully!';
                status.style.color = '#28a745';
            }
            
            displayResults();
            showGroupPhotoStep('results');
        } else {
            throw new Error(result.error || 'Failed to save photo');
        }
        
    } catch (error) {
        console.error('❌ Error saving group photo:', error);
        
        const status = document.getElementById('group-camera-status');
        if (status) {
            status.textContent = `❌ Error: ${error.message}`;
            status.style.color = '#dc3545';
        }
        
        // Show user-friendly error
        alert(`Error saving photo: ${error.message}\n\nPlease try again or contact support if the problem persists.`);
    }
}

// Display results
function displayResults() {
    const messageElement = document.getElementById('results-message');
    const remainingElement = document.getElementById('remaining-players');
    const anotherBtn = document.querySelector('button[onclick="takeAnotherGroupPhoto()"]');
    
    const confirmedCount = groupPhotoState.confirmedPlayers.length;
    
    messageElement.innerHTML = `
        <h5>✅ Photo ${groupPhotoState.photoCount} saved successfully!</h5>
        <p>Captured ${confirmedCount} players in this photo.</p>
    `;
    
    // Check if there are remaining players
    const remaining = groupPhotoState.selectedPlayers.filter(selected => 
        !groupPhotoState.confirmedPlayers.some(confirmed => confirmed.playerID === selected.playerID)
    );
    
    if (remaining.length > 0) {
        remainingElement.innerHTML = `
            <h6>Remaining players (${remaining.length}):</h6>
            <div>${remaining.map(p => `<span class="expected-player-chip">#${p.pinny} ${p.first} ${p.last}</span>`).join('')}</div>
        `;
        anotherBtn.style.display = 'inline-block';
    } else {
        remainingElement.innerHTML = '<h6>✅ All players captured!</h6>';
        anotherBtn.style.display = 'none';
    }
}

// Take another group photo
function takeAnotherGroupPhoto() {
    groupPhotoState.photoCount++;
    
    // Remove confirmed players from selected players
    groupPhotoState.selectedPlayers = groupPhotoState.selectedPlayers.filter(selected => 
        !groupPhotoState.confirmedPlayers.some(confirmed => confirmed.playerID === selected.playerID)
    );
    
    // Reset for next photo
    groupPhotoState.confirmedPlayers = [];
    groupPhotoState.capturedPhoto = null;
    groupPhotoState.detectedNumbers = [];
    
    displayExpectedPlayers();
    showGroupPhotoStep('camera');
    resetGroupCameraInterface();
}

// Finish group photos
function finishGroupPhotos() {
    closeGroupPhotoModal();
}

// Start new position
function startNewPosition() {
    resetGroupPhotoState();
    showGroupPhotoStep('filters');
}

// Reset group camera interface
function resetGroupCameraInterface() {
    const previewContainer = document.getElementById('group-camera-preview');
    const capturedImage = document.getElementById('group-captured-image');
    const placeholder = document.getElementById('group-camera-placeholder');
    const status = document.getElementById('group-camera-status');
    
    if (previewContainer) previewContainer.style.display = 'none';
    if (capturedImage) capturedImage.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    
    document.getElementById('start-group-camera-btn').style.display = 'inline-block';
    document.getElementById('take-group-photo-btn').style.display = 'none';
    document.getElementById('retake-group-btn').style.display = 'none';
    document.getElementById('analyze-group-btn').style.display = 'none';
    
    if (status) {
        status.textContent = '';
        status.style.color = '#333';
    }
}

// Stop group camera stream
function stopGroupCameraStream() {
    CameraUtils.stopStream(groupPhotoState.cameraStream);
    groupPhotoState.cameraStream = null;
}

// View group photos - UPDATED WITH FULL GALLERY
async function viewGroupPhotos() {
    if (!authManager.requireAuth()) return;
    
    try {
        // Hide the main actions menu and show gallery
        document.querySelector('.group-actions-menu').style.display = 'none';
        
        // Create or show gallery container
        let galleryContainer = document.getElementById('group-photos-gallery');
        if (!galleryContainer) {
            galleryContainer = document.createElement('div');
            galleryContainer.id = 'group-photos-gallery';
            galleryContainer.className = 'group-photos-gallery';
            document.querySelector('.container').appendChild(galleryContainer);
        }
        
        // Show loading state
        galleryContainer.innerHTML = `
            <div class="gallery-header">
                <h2>📸 Group Photos Gallery</h2>
                <button class="staff-btn secondary-btn" onclick="closeGallery()">← Back to Menu</button>
            </div>
            <div class="loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading group photos...</div>
            </div>
        `;
        galleryContainer.style.display = 'block';
        
        // Load photos
        const photos = await window.mgaAPI.getGroupPhotos();
        displayGroupPhotosGallery(photos);
        
    } catch (error) {
        console.error('Error loading group photos:', error);
        document.getElementById('group-photos-gallery').innerHTML = `
            <div class="gallery-header">
                <h2>📸 Group Photos Gallery</h2>
                <button class="staff-btn secondary-btn" onclick="closeGallery()">← Back to Menu</button>
            </div>
            <div class="error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">Failed to load group photos</div>
                <div class="error-technical">${error.message}</div>
                <button onclick="viewGroupPhotos()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}

function displayGroupPhotosGallery(photos) {
    const galleryContainer = document.getElementById('group-photos-gallery');
    
    if (!photos || photos.length === 0) {
        galleryContainer.innerHTML = `
            <div class="gallery-header">
                <h2>📸 Group Photos Gallery</h2>
                <button class="staff-btn secondary-btn" onclick="closeGallery()">← Back to Menu</button>
            </div>
            <div class="empty-gallery">
                <div class="empty-icon">📷</div>
                <h3>No Group Photos Yet</h3>
                <p>Group photos will appear here once you start taking them.</p>
                <button class="staff-btn checkin-btn" onclick="closeGallery(); openGroupPhotoModal();">Take First Group Photo</button>
            </div>
        `;
        return;
    }
    
    // Group photos by location and age
    const groupedPhotos = photos.reduce((acc, photo) => {
        const key = `${photo.location}_${photo.age}`;
        if (!acc[key]) {
            acc[key] = {
                location: photo.location,
                age: photo.age,
                photos: []
            };
        }
        acc[key].photos.push(photo);
        return acc;
    }, {});
    
    const galleryHTML = `
        <div class="gallery-header">
            <h2>📸 Group Photos Gallery (${photos.length} photos)</h2>
            <div class="gallery-actions">
                <button class="staff-btn photo-btn" onclick="openGroupPhotoModal()">📸 Take More Photos</button>
                <button class="staff-btn secondary-btn" onclick="closeGallery()">← Back to Menu</button>
            </div>
        </div>
        
        <div class="gallery-filters">
            <div class="filter-tabs">
                <button class="filter-tab active" onclick="filterGallery('all')">All Photos</button>
                ${Object.keys(groupedPhotos).map(key => {
                    const group = groupedPhotos[key];
                    const locationName = group.location === 'NORTH' ? 'North' : 'South';
                    return `<button class="filter-tab" onclick="filterGallery('${key}')">${locationName} ${group.age} (${group.photos.length})</button>`;
                }).join('')}
            </div>
        </div>
        
        <div class="gallery-grid" id="gallery-grid">
            ${photos.map(photo => createPhotoCard(photo)).join('')}
        </div>
    `;
    
    galleryContainer.innerHTML = galleryHTML;
}

function createPhotoCard(photo) {
    const locationName = photo.location === 'NORTH' ? 'North' : 'South';
    const playerCount = photo.playerNames.split(',').length;
    
    return `
        <div class="photo-card" data-location="${photo.location}" data-age="${photo.age}">
            <div class="photo-image-container">
                ${photo.displayUrl ? 
                    `<img src="${photo.displayUrl}" alt="Group Photo" class="gallery-photo" onclick="openPhotoModal('${photo.fileUrl}', '${escapeHtml(photo.playerNames)}', '${photo.formattedDate}')">` :
                    `<div class="photo-placeholder">📷<br><small>Photo not available</small></div>`
                }
            </div>
            <div class="photo-info">
                <div class="photo-header">
                    <span class="photo-location">${locationName} ${photo.age}</span>
                    <span class="photo-date">${photo.formattedDate}</span>
                </div>
                <div class="photo-position">${photo.position}</div>
                <div class="photo-players">
                    <span class="player-count">${playerCount} players:</span>
                    <div class="player-names">${photo.playerNames}</div>
                </div>
                <div class="photo-actions">
                    <button class="staff-btn photo-btn" onclick="openPhotoModal('${photo.fileUrl}', '${escapeHtml(photo.playerNames)}', '${photo.formattedDate}')">🔍 View Full Size</button>
                    <a href="${photo.fileUrl}" target="_blank" class="staff-btn secondary-btn">📁 Open in Drive</a>
                </div>
            </div>
        </div>
    `;
}

function filterGallery(filterKey) {
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide photos
    const photoCards = document.querySelectorAll('.photo-card');
    photoCards.forEach(card => {
        if (filterKey === 'all') {
            card.style.display = 'block';
        } else {
            const [location, age] = filterKey.split('_');
            const cardLocation = card.dataset.location;
            const cardAge = card.dataset.age;
            
            if (cardLocation === location && cardAge === age) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

function openPhotoModal(fileUrl, playerNames, date) {
    const modal = document.createElement('div');
    modal.className = 'modal photo-viewer-modal';
    modal.innerHTML = `
        <div class="modal-content photo-viewer">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div class="photo-viewer-header">
                <h3>📸 Group Photo - ${date}</h3>
            </div>
            <div class="photo-viewer-content">
                <img src="${convertDriveUrlForDisplay(fileUrl)}" alt="Group Photo" class="full-size-photo">
                <div class="photo-details">
                    <h4>Players in this photo:</h4>
                    <p>${playerNames}</p>
                    <div class="photo-viewer-actions">
                        <a href="${fileUrl}" target="_blank" class="staff-btn photo-btn">📁 Open Original in Drive</a>
                        <button class="staff-btn secondary-btn" onclick="this.closest('.modal').remove()">✕ Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Close on background click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function closeGallery() {
    const galleryContainer = document.getElementById('group-photos-gallery');
    if (galleryContainer) {
        galleryContainer.style.display = 'none';
    }
    document.querySelector('.group-actions-menu').style.display = 'block';
}

function convertDriveUrlForDisplay(driveUrl) {
    if (!driveUrl || driveUrl.trim() === '') {
        return '';
    }
    
    try {
        let fileId = null;
        
        const viewMatch = driveUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        if (viewMatch) {
            fileId = viewMatch[1];
        }
        
        const openMatch = driveUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
        if (openMatch) {
            fileId = openMatch[1];
        }
        
        if (fileId) {
            return `https://lh3.googleusercontent.com/d/${fileId}=w600`;
        }
        
        return driveUrl;
        
    } catch (error) {
        console.error('Error converting Drive URL:', error);
        return driveUrl;
    }
}

// Photo Upload Functions
function openUploadModal() {
    if (!authManager.requireAuth()) return;
    
    const modal = document.getElementById('upload-photo-modal');
    modal.style.display = 'block';
    resetUploadState();
}

function closeUploadModal() {
    const modal = document.getElementById('upload-photo-modal');
    modal.style.display = 'none';
    resetUploadState();
}

function resetUploadState() {
    uploadState = {
        photoData: null,
        photoType: null,
        selectedPlayers: [],
        allPlayers: []
    };
    
    document.getElementById('upload-preview').style.display = 'none';
    document.getElementById('upload-detection').style.display = 'none';
    document.getElementById('upload-individual').style.display = 'none';
    document.getElementById('upload-group').style.display = 'none';
    document.getElementById('upload-group-players').style.display = 'none';
    document.getElementById('photo-upload-input').value = '';
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadState.photoData = e.target.result;
        
        const preview = document.getElementById('upload-preview-image');
        preview.src = uploadState.photoData;
        document.getElementById('upload-preview').style.display = 'block';
        document.getElementById('upload-detection').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function setUploadType(type) {
    uploadState.photoType = type;
    
    if (type === 'individual') {
        document.getElementById('upload-individual').style.display = 'block';
        document.getElementById('upload-group').style.display = 'none';
    } else {
        document.getElementById('upload-individual').style.display = 'none';
        document.getElementById('upload-group').style.display = 'block';
    }
}

// FIXED UPLOAD FUNCTIONS

// Load players for individual photo upload
async function loadUploadPlayers() {
    const location = document.getElementById('upload-location').value;
    const age = document.getElementById('upload-age').value;
    const playerSelect = document.getElementById('upload-player');
    
    // Clear existing options
    playerSelect.innerHTML = '<option value="">Choose Player</option>';
    
    if (!location || !age) {
        return;
    }
    
    try {
        const data = await window.mgaAPI.getPlayers(location, age, 'name');
        
        if (data && data.players) {
            data.players.forEach(player => {
                const option = document.createElement('option');
                option.value = JSON.stringify(player);
                option.textContent = `${player.last}, ${player.first} (${player.pinny || 'No Pinny'})`;
                playerSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading upload players:', error);
        document.getElementById('upload-status').textContent = 'Error loading players';
        document.getElementById('upload-status').style.color = '#dc3545';
    }
}

// Load players for group photo upload - FIXED VERSION
// REPLACE the loadUploadGroupPlayers function with this FIXED version:

async function loadUploadGroupPlayers() {
    const location = document.getElementById('upload-group-location').value;
    const age = document.getElementById('upload-group-age').value;
    const position = document.getElementById('upload-group-position').value;
    
    console.log('=== LOADING GROUP UPLOAD PLAYERS ===');
    console.log('Location:', location);
    console.log('Age:', age);
    console.log('Position filter:', `"${position}"`);
    console.log('Position is empty?', position === '' || !position);
    
    if (!location || !age) {
        document.getElementById('upload-group-players').style.display = 'none';
        return;
    }
    
    try {
        const data = await window.mgaAPI.getPlayers(location, age, 'pinny');
        console.log('Raw player data:', data);
        
        if (data && data.players) {
            let filteredPlayers = data.players;
            console.log(`Total players before filtering: ${filteredPlayers.length}`);
            
            // Log all player positions to debug
            console.log('All player positions:');
            filteredPlayers.forEach((p, index) => {
                console.log(`  ${index + 1}. ${p.first} ${p.last}: "${p.position}"`);
            });
            
            // FIXED: Only filter if a position is actually selected
            if (position && position.trim() !== '' && position !== 'All Positions') {
                console.log(`\n=== FILTERING BY POSITION: "${position}" ===`);
                const originalCount = filteredPlayers.length;
                
                filteredPlayers = data.players.filter(player => {
                    const playerPosition = (player.position || '').toString().trim();
                    const selectedPosition = position.toString().trim();
                    
                    console.log(`\nChecking player ${player.first} ${player.last}:`);
                    console.log(`  Player position: "${playerPosition}"`);
                    console.log(`  Looking for: "${selectedPosition}"`);
                    
                    if (!playerPosition) {
                        console.log(`  ❌ Player has no position data`);
                        return false;
                    }
                    
                    // Multiple matching strategies
                    const exactMatch = playerPosition.toLowerCase() === selectedPosition.toLowerCase();
                    console.log(`  Exact match: ${exactMatch}`);
                    
                    const playerContainsSelected = playerPosition.toLowerCase().includes(selectedPosition.toLowerCase());
                    console.log(`  Player contains selected: ${playerContainsSelected}`);
                    
                    const selectedContainsPlayer = selectedPosition.toLowerCase().includes(playerPosition.toLowerCase());
                    console.log(`  Selected contains player: ${selectedContainsPlayer}`);
                    
                    // Special cases for common abbreviations
                    const abbreviationMatch = checkAbbreviationMatch(selectedPosition, playerPosition);
                    console.log(`  Abbreviation match: ${abbreviationMatch}`);
                    
                    const isMatch = exactMatch || playerContainsSelected || selectedContainsPlayer || abbreviationMatch;
                    console.log(`  🎯 FINAL RESULT: ${isMatch ? 'INCLUDED' : 'EXCLUDED'}`);
                    
                    return isMatch;
                });
                
                console.log(`\n📊 FILTERING RESULTS:`);
                console.log(`  Before: ${originalCount} players`);
                console.log(`  After: ${filteredPlayers.length} players`);
                console.log(`  Filtered out: ${originalCount - filteredPlayers.length} players`);
                
                if (filteredPlayers.length === 0) {
                    // Show helpful message
                    const allPositions = [...new Set(data.players.map(p => p.position).filter(p => p))];
                    console.log('❌ No matches found!');
                    console.log('Available positions:', allPositions);
                    
                    document.getElementById('upload-status').innerHTML = `
                        ⚠️ No players found for position "${position}"<br>
                        <small>Available positions: ${allPositions.join(', ')}</small>
                    `;
                    document.getElementById('upload-status').style.color = '#f39c12';
                } else {
                    console.log('✅ Found matches:');
                    filteredPlayers.forEach(p => {
                        console.log(`  - ${p.first} ${p.last} (${p.position})`);
                    });
                }
            } else {
                console.log('⏭️ No position filter applied - showing all players');
            }
            
            // Store for upload
            uploadState.allPlayers = filteredPlayers;
            uploadState.selectedPlayers = []; // Reset selections
            
            // Display players checklist
            displayUploadGroupChecklist(filteredPlayers);
            document.getElementById('upload-group-players').style.display = 'block';
            
            // Clear any previous status messages if we have players
            if (filteredPlayers.length > 0 && (!position || position.trim() === '' || position === 'All Positions')) {
                document.getElementById('upload-status').textContent = '';
            }
        }
    } catch (error) {
        console.error('Error loading group upload players:', error);
        document.getElementById('upload-status').textContent = 'Error loading players';
        document.getElementById('upload-status').style.color = '#dc3545';
    }
}

// Helper function for abbreviation matching
function checkAbbreviationMatch(selectedPosition, playerPosition) {
    const selected = selectedPosition.toLowerCase();
    const player = playerPosition.toLowerCase();
    
    // Common volleyball position abbreviations
    const abbreviations = {
        'outside hitter': ['oh', 'outside'],
        'middle blocker': ['mb', 'middle'],
        'right side': ['rs', 'right', 'right side hitter'],
        'opposite': ['opp', 'opposite hitter'],
        'setter': ['s', 'set'],
        'libero': ['lib', 'l'],
        'defensive specialist': ['ds', 'defensive']
    };
    
    // Check if selected position matches any abbreviations
    for (const [fullPosition, abbrevs] of Object.entries(abbreviations)) {
        if (selected === fullPosition || abbrevs.includes(selected)) {
            // Check if player position matches this category
            if (player === fullPosition || abbrevs.includes(player) || 
                fullPosition.includes(player) || player.includes(fullPosition)) {
                return true;
            }
        }
    }
    
    return false;
}
// Display group players checklist for upload
function displayUploadGroupChecklist(players) {
    const container = document.getElementById('upload-group-checklist');
    
    if (players.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666;">No players found.</div>';
        return;
    }
    
    const html = players.map(player => `
        <div class="player-checkbox-item">
            <input type="checkbox" 
                   id="upload-player-${player.playerID}" 
                   onchange="toggleUploadPlayer('${escapeHtml(player.playerID)}')">
            <label for="upload-player-${player.playerID}">
                <span class="player-pinny">#${escapeHtml(player.pinny || 'N/A')}</span>
                <span class="player-name">${escapeHtml(formatPlayerName(player))}</span>
                <span class="player-position">${escapeHtml(player.position || 'N/A')}</span>
            </label>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Toggle player selection for upload
function toggleUploadPlayer(playerID) {
    const player = uploadState.allPlayers.find(p => p.playerID === playerID);
    if (!player) {
        console.log('Player not found:', playerID);
        return;
    }
    
    const index = uploadState.selectedPlayers.findIndex(p => p.playerID === playerID);
    if (index > -1) {
        uploadState.selectedPlayers.splice(index, 1);
        console.log('Removed player:', player.first, player.last);
    } else {
        uploadState.selectedPlayers.push(player);
        console.log('Added player:', player.first, player.last);
    }
    
    console.log('Currently selected players:', uploadState.selectedPlayers.length);
}

// Save individual photo upload
async function saveIndividualUpload() {
    if (!uploadState.photoData) {
        alert('Please select a photo first');
        return;
    }
    
    const playerSelect = document.getElementById('upload-player');
    const selectedPlayerJson = playerSelect.value;
    
    if (!selectedPlayerJson) {
        alert('Please select a player');
        return;
    }
    
    try {
        const player = JSON.parse(selectedPlayerJson);
        const status = document.getElementById('upload-status');
        
        status.textContent = 'Saving individual photo...';
        status.style.color = '#4169E1';
        
        // Use the existing photo submission API
        const result = await window.mgaAPI.submitPhoto(uploadState.photoData, player.playerID);
        
        if (result.success) {
            status.textContent = '✅ Individual photo saved successfully!';
            status.style.color = '#28a745';
            
            setTimeout(() => {
                closeUploadModal();
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to save photo');
        }
        
    } catch (error) {
        console.error('Error saving individual upload:', error);
        document.getElementById('upload-status').textContent = `❌ Error: ${error.message}`;
        document.getElementById('upload-status').style.color = '#dc3545';
    }
}

// Save group photo upload
async function saveGroupUpload() {
    if (!uploadState.photoData) {
        alert('Please select a photo first');
        return;
    }
    
    if (uploadState.selectedPlayers.length === 0) {
        alert('Please select at least one player');
        return;
    }
    
    try {
        const location = document.getElementById('upload-group-location').value;
        const age = document.getElementById('upload-group-age').value;
        const position = document.getElementById('upload-group-position').value || 'Mixed';
        
        const status = document.getElementById('upload-status');
        status.textContent = 'Saving group photo...';
        status.style.color = '#4169E1';
        
        // Create metadata for group photo
        const metadata = {
            type: 'group',
            location: location,
            age: age,
            position: position,
            players: uploadState.selectedPlayers.map(p => ({
                playerID: p.playerID,
                pinny: p.pinny,
                name: `${p.first} ${p.last}`
            })),
            photoNumber: 1, // For uploads, always 1
            timestamp: new Date().toISOString(),
            source: 'upload'
        };
        
        console.log('Saving group upload with metadata:', metadata);
        
        const result = await window.mgaAPI.saveGroupPhoto(uploadState.photoData, metadata);
        
        if (result.success) {
            status.textContent = `✅ Group photo saved with ${uploadState.selectedPlayers.length} players!`;
            status.style.color = '#28a745';
            
            setTimeout(() => {
                closeUploadModal();
                // Refresh gallery if it's open
                if (document.getElementById('group-photos-gallery') && 
                    document.getElementById('group-photos-gallery').style.display !== 'none') {
                    viewGroupPhotos();
                }
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to save group photo');
        }
        
    } catch (error) {
        console.error('Error saving group upload:', error);
        document.getElementById('upload-status').textContent = `❌ Error: ${error.message}`;
        document.getElementById('upload-status').style.color = '#dc3545';
    }
}

// FIXED: Analyze uploaded photo for pinny numbers with better OCR functions
async function analyzeUploadedPhoto() {
    if (!uploadState.photoData) {
        alert('Please select a photo first');
        return;
    }
    
    const status = document.getElementById('upload-status');
    
    try {
        status.textContent = 'Analyzing photo for pinny numbers...';
        status.style.color = '#4169E1';
        
        console.log('=== STARTING OCR ANALYSIS ===');
        console.log('Photo data length:', uploadState.photoData.length);
        
        // Use Tesseract.js directly (since it's loaded in the page)
        if (typeof Tesseract === 'undefined') {
            throw new Error('OCR library not available');
        }
        
        console.log('Tesseract library found, starting recognition...');
        
        const { data: { text } } = await Tesseract.recognize(
            uploadState.photoData,
            'eng',
            {
                logger: m => console.log('OCR Progress:', m)
            }
        );
        
        console.log('OCR Raw text:', text);
        
        // Extract numbers from the text
        const numbers = text.match(/\d+/g) || [];
        console.log('All numbers found:', numbers);
        
        // Get expected pinny numbers from available players
        const expectedPinnies = uploadState.allPlayers
            .map(p => p.pinny)
            .filter(p => p && p !== 'N/A' && p.toString().trim() !== '')
            .map(p => p.toString());
        
        console.log('Expected pinny numbers:', expectedPinnies);
        
        // Find matches
        const detectedPinnies = numbers.filter(num => expectedPinnies.includes(num));
        console.log('Detected pinny matches:', detectedPinnies);
        
        if (detectedPinnies.length > 0) {
            // Auto-select players based on detected pinny numbers
            uploadState.selectedPlayers = uploadState.allPlayers.filter(player => 
                detectedPinnies.includes(player.pinny.toString())
            );
            
            console.log('Auto-selected players:', uploadState.selectedPlayers.map(p => `${p.first} ${p.last} (#${p.pinny})`));
            
            // Update checkboxes
            uploadState.allPlayers.forEach(player => {
                const checkbox = document.getElementById(`upload-player-${player.playerID}`);
                if (checkbox) {
                    checkbox.checked = uploadState.selectedPlayers.some(p => p.playerID === player.playerID);
                }
            });
            
            status.textContent = `✅ Found ${detectedPinnies.length} pinny numbers: ${detectedPinnies.join(', ')}`;
            status.style.color = '#28a745';
        } else if (numbers.length > 0) {
            status.textContent = `⚠️ Found numbers (${numbers.slice(0, 10).join(', ')}) but none match expected pinnies`;
            status.style.color = '#f39c12';
        } else {
            status.textContent = '⚠️ No numbers detected in photo. Please select players manually.';
            status.style.color = '#f39c12';
        }
        
    } catch (error) {
        console.error('=== OCR ERROR ===', error);
        status.textContent = `❌ OCR failed: ${error.message}. Please select players manually.`;
        status.style.color = '#dc3545';
    }
}

// Helper function to format player name
function formatPlayerName(player) {
    return `${player.first} ${player.last}`;
}

// Export functions for global access
window.openGroupPhotoModal = openGroupPhotoModal;
window.closeGroupPhotoModal = closeGroupPhotoModal;
window.loadPositionPlayers = loadPositionPlayers;
window.togglePlayerSelection = togglePlayerSelection;
window.selectAllPlayers = selectAllPlayers;
window.clearAllPlayers = clearAllPlayers;
window.startGroupPhoto = startGroupPhoto;
window.toggleConfirmedPlayer = toggleConfirmedPlayer;
window.goBackToCamera = goBackToCamera;
window.saveGroupPhoto = saveGroupPhoto;
window.takeAnotherGroupPhoto = takeAnotherGroupPhoto;
window.finishGroupPhotos = finishGroupPhotos;
window.startNewPosition = startNewPosition;
window.viewGroupPhotos = viewGroupPhotos;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.handlePhotoUpload = handlePhotoUpload;
window.setUploadType = setUploadType;
window.loadUploadPlayers = loadUploadPlayers;
window.loadUploadGroupPlayers = loadUploadGroupPlayers;
window.toggleUploadPlayer = toggleUploadPlayer;
window.saveIndividualUpload = saveIndividualUpload;
window.saveGroupUpload = saveGroupUpload;
window.analyzeUploadedPhoto = analyzeUploadedPhoto;
window.closeGallery = closeGallery;
window.filterGallery = filterGallery;
window.openPhotoModal = openPhotoModal;
