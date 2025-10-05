// Shared utility functions for MGA Volleyball Tryouts
// This file should be loaded before players.js and group-photos.js

// Wait for authentication - used by both players and group photos pages
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

// Escape HTML - used by both pages for safe string rendering
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Common OCR configuration for consistency across both individual and group photos
const OCR_CONFIG = {
    logger: m => console.log(m),
    tessedit_char_whitelist: '0123456789', // Only detect numbers for pinny detection
    tessedit_pageseg_mode: '6' // Uniform block of text
};

// Generic OCR text detection function
async function detectTextInImage(imageData, config = OCR_CONFIG) {
    try {
        const { data: { text } } = await Tesseract.recognize(imageData, 'eng', config);
        console.log('OCR detected text:', text);
        return text;
    } catch (error) {
        console.error('OCR Error:', error);
        throw error;
    }
}

// Extract numbers from OCR text
function extractNumbers(text) {
    const numbers = text.match(/\d+/g) || [];
    console.log('Extracted numbers:', numbers);
    return numbers;
}

// Get current date string in M/D format (used for check-ins)
function getCurrentDateString() {
    const today = new Date();
    return `${today.getMonth() + 1}/${today.getDate()}`;
}

// Check if a date string represents today
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

// Format player display name consistently
function formatPlayerName(player, format = 'lastFirst') {
    if (!player || !player.first || !player.last) return 'Unknown Player';
    
    switch (format) {
        case 'firstLast':
            return `${player.first} ${player.last}`;
        case 'lastFirst':
        default:
            return `${player.last}, ${player.first}`;
    }
}

// Camera stream management utilities
const CameraUtils = {
    // Stop any active camera stream
    stopStream(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    },
    
    // Standard camera constraints for individual photos
    getIndividualPhotoConstraints(isSelfie = true) {
        return {
            video: {
                width: { ideal: 640 },
                height: { ideal: 640 },
                facingMode: isSelfie ? 'user' : 'environment'
            }
        };
    },
    
    // Standard camera constraints for group photos
    getGroupPhotoConstraints() {
        return {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment'
            }
        };
    }
};

// Common modal utilities
const ModalUtils = {
    // Show a modal by ID
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    },
    
    // Hide a modal by ID
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Hide all modals
    hideAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
};

// Debug logging utility
function debugLog(...args) {
    if (window.DEBUG || window.CONFIG?.debugMode) {
        console.log('[MGA Debug]', ...args);
    }
}

// Export utilities to window for global access
window.waitForAuth = waitForAuth;
window.escapeHtml = escapeHtml;
window.OCR_CONFIG = OCR_CONFIG;
window.detectTextInImage = detectTextInImage;
window.extractNumbers = extractNumbers;
window.getCurrentDateString = getCurrentDateString;
window.isToday = isToday;
window.isPastDate = isPastDate;
window.formatPlayerName = formatPlayerName;
window.CameraUtils = CameraUtils;
window.ModalUtils = ModalUtils;
window.debugLog = debugLog;
