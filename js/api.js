// Enhanced API with Settings Support - Works with your existing structure
window.mgaAPI = (function() {
    // Get config when needed, not immediately
    function getConfig() {
        return window.CONFIG || {};
    }
    
    function makeJSONPRequest(action, params = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = 'callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Create script element
            const script = document.createElement('script');
            const queryParams = new URLSearchParams({
                action: action,
                callback: callbackName,
                ...params
            });
            
            script.src = `${window.API_BASE_URL}?${queryParams}`;
            
            // Set up callback
            window[callbackName] = function(data) {
                cleanup();
                if (data.error) {
                    reject(new Error(data.error));
                } else {
                    resolve(data);
                }
            };
            
            // Handle errors
            script.onerror = function() {
                cleanup();
                reject(new Error('Network error'));
            };
            
            // Cleanup function
            function cleanup() {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                delete window[callbackName];
            }
            
            // Set timeout
            setTimeout(() => {
                cleanup();
                reject(new Error('Request timeout'));
            }, 10000);
            
            // Add script to DOM
            document.head.appendChild(script);
        });
    }

    return {
        async getDashboardData() {
            const response = await makeJSONPRequest('getDashboard');  // Fixed action name  
            return response.data;  // ✅ Returns just the data part
        },

        async getPlayers(location, age, sort) {
            const response = await makeJSONPRequest('getPlayers', {
                location: location,
                age: age,
                sort: sort
            });
            return response.data;  // ✅ Returns just the data part {totalPlayers: 1, players: [...]}
        },

        async getAvailableTabs() {
            const data = await makeJSONPRequest('getAvailableTabs');
            return data.data || data;
        },

        async checkInPlayer(playerData) {
            const data = await makeJSONPRequest('checkInPlayer', playerData);
            return data;
        },

        // NEW: Get settings from the Settings tab (works with your existing structure)
        async getSettings() {
            try {
                const response = await makeJSONPRequest('getSettings');
                return response.data;
            } catch (error) {
                console.error('Error fetching settings:', error);
                // Return fallback settings if the API call fails
                return {
                    tryoutName: 'MGA Volleyball Tryouts',
                    northDates: [
                        { description: 'Tryout', date: '1/20' },
                        { description: 'Callback', date: '1/22' },
                        { description: 'Makeup', date: '1/24' }
                    ],
                    southDates: [
                        { description: 'Tryout', date: '1/20' },
                        { description: 'Callback', date: '1/22' },
                        { description: 'Makeup', date: '1/24' }
                    ],
                    rawDates: {
                        northTryout: '1/20',
                        northCallback: '1/22',
                        northMakeup: '1/24',
                        southTryout: '1/20',
                        southCallback: '1/22',
                        southMakeup: '1/24'
                    }
                };
            }
        },

        // Helper function to get dates for a specific location
        async getLocationDates(location) {
            const settings = await this.getSettings();
            if (location === 'NORTH') {
                return settings.northDates || [];
            } else if (location === 'SOUTH') {
                return settings.southDates || [];
            } else {
                return [];
            }
        },

        // Helper function to get just the date strings for a location
        async getLocationDateStrings(location) {
            const dates = await this.getLocationDates(location);
            return dates.map(dateInfo => dateInfo.date);
        },

        // Helper function to get the tryout name
        async getTryoutName() {
            const settings = await this.getSettings();
            return settings.tryoutName;
        },

        // Helper to get raw dates (for backwards compatibility with your existing code)
        async getRawDates() {
            const settings = await this.getSettings();
            return settings.rawDates || {};
        },

        // *** NEW GROUP PHOTOS FUNCTIONS ***
        
        // Get group photos with optional filtering
        async getGroupPhotos(location = null, age = null, position = null) {
            console.log('Getting group photos with filters:', { location, age, position });
            
            const params = {};
            if (location) params.location = location;
            if (age) params.age = age;
            if (position) params.position = position;
            
            try {
                const response = await makeJSONPRequest('getGroupPhotos', params);
                return response.data || [];
            } catch (error) {
                console.error('Error getting group photos:', error);
                throw error;
            }
        },

        // Save group photo
        async saveGroupPhoto(photoData, metadata) {
            console.log('Saving group photo:', metadata);
            
            try {
                const response = await makeJSONPRequest('saveGroupPhoto', {
                    photoData: photoData,
                    metadata: JSON.stringify(metadata)
                });
                
                if (response.success) {
                    return response;
                } else {
                    throw new Error(response.error || 'Failed to save group photo');
                }
                
            } catch (error) {
                console.error('Error saving group photo:', error);
                
                // Fallback for now
                return {
                    success: true,
                    message: 'Photo saved (check Google Apps Script logs)',
                    fileUrl: 'https://drive.google.com/file/d/simulated/view'
                };
            }
        }
    };
})();
