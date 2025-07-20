// MGA Volleyball Tryouts - API Communication Module

class MGA_API {
    constructor() {
        this.baseUrl = window.API_BASE_URL;
        this.retryCount = 0;
        this.maxRetries = window.CONFIG?.maxRetries || 3;
    }

    // Generic API call with error handling and retries
    async makeRequest(url, options = {}) {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        try {
            window.debugLog('API Request:', url);
            
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                throw new Error(data.error || 'API returned error');
            }
            
            window.debugLog('API Response:', data);
            this.retryCount = 0; // Reset retry count on success
            
            return data;
            
        } catch (error) {
            window.debugLog('API Error:', error);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                window.debugLog(`Retrying... (${this.retryCount}/${this.maxRetries})`);
                
                await this.delay(window.CONFIG?.retryDelay || 2000);
                return this.makeRequest(url, options);
            }
            
            throw error;
        }
    }

    // Get dashboard data
    async getDashboardData() {
        const url = `${this.baseUrl}?action=getDashboard`;
        const response = await this.makeRequest(url);
        return response.data;
    }

    // Get players for specific location and age
    async getPlayers(location, age, sortBy = 'name') {
        const url = `${this.baseUrl}?action=getPlayers&location=${encodeURIComponent(location)}&age=${encodeURIComponent(age)}&sort=${encodeURIComponent(sortBy)}`;
        const response = await this.makeRequest(url);
        return response.data;
    }

    // Get available tabs/sessions
    async getAvailableTabs() {
        const url = `${this.baseUrl}?action=getAvailableTabs`;
        const response = await this.makeRequest(url);
        return response.data;
    }

    // Check in a player
    async checkInPlayer(playerData) {
        const params = new URLSearchParams({
            action: 'checkIn',
            playerID: playerData.playerID || '',
            firstName: playerData.first || '',
            lastName: playerData.last || '',
            location: playerData.location || '',
            age: playerData.age || ''
        });

        const url = `${this.baseUrl}?${params.toString()}`;
        const response = await this.makeRequest(url);
        return response;
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Handle connection errors gracefully
    handleConnectionError(error) {
        console.error('Connection error:', error);
        
        const errorMessages = {
            'Failed to fetch': 'Unable to connect to server. Please check your internet connection.',
            'NetworkError': 'Network error. Please try again.',
            'TimeoutError': 'Request timed out. Please try again.'
        };

        const message = errorMessages[error.name] || 
                       errorMessages[error.message] || 
                       `Connection error: ${error.message}`;

        return {
            success: false,
            error: message,
            technical: error.message
        };
    }
}

// Create global API instance
window.mgaAPI = new MGA_API();

// Utility functions for UI updates
window.showLoading = function(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
    }
};

window.showError = function(containerId, message, technical = '') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                ${technical ? `<div class="error-technical">${technical}</div>` : ''}
                <button onclick="location.reload()" class="retry-btn">Retry</button>
            </div>
        `;
    }
};

// Format timestamp for display
window.formatTimestamp = function(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleString();
    } catch (error) {
        return 'Unknown';
    }
};
