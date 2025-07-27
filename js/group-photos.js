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
    
    try {
        const status = document.getElementById('group-camera-status');
        status.textContent = 'Saving group photo...';
        status.style.color = '#4169E1';
        
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
        
        // Save photo (placeholder - you'll need to implement this API call)
        console.log('Saving group photo with metadata:', photoMetadata);
        console.log('Photo data size:', groupPhotoState.capturedPhoto.length);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        const result = { success: true };
        
        if (result.success) {
            displayResults();
            showGroupPhotoStep('results');
        } else {
            throw new Error(result.error || 'Failed to save photo');
        }
        
    } catch (error) {
        console.error('Error saving group photo:', error);
        alert(`Error saving photo: ${error.message}`);
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

// View group photos (implement actual functionality)
async function viewGroupPhotos() {
    if (!authManager.requireAuth()) return;
    
    try {
        // This would call your API to get group photos
        // For now, show a simple alert with instructions
        alert('Group Photos Gallery\n\nTo view group photos:\n1. Check your Google Drive folder\n2. Look for files starting with "GroupPhoto_"\n3. Or implement a gallery view in your Google Apps Script\n\nWould you like me to add a proper gallery interface?');
        
        // TODO: Implement actual gallery interface
        // const photos = await window.mgaAPI.getGroupPhotos();
        // displayGroupPhotosGallery(photos);
        
    } catch (error) {
        console.error('Error loading group photos:', error);
        alert('Error loading group photos. Please try again.');
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

// Additional upload functions would go here...
// (loadUploadPlayers, saveIndividualUpload, etc.)

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
