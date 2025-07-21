// MGA Volleyball Tryouts - Authentication System
class AuthManager {
    constructor() {
        this.STAFF_PASSWORD = 'MGA4ever'; // Change this to your preferred password
        this.SESSION_KEY = 'mga_volleyball_staff_auth';
        this.init();
    }

    init() {
        // Check if already logged in
        if (!this.isLoggedIn()) {
            this.showLoginModal();
        }
    }

    isLoggedIn() {
        const session = sessionStorage.getItem(this.SESSION_KEY);
        return session === 'authenticated';
    }

    showLoginModal() {
        // Create modal HTML with volleyball theme
        const modalHTML = `
            <div id="loginModal" class="login-modal">
                <div class="login-modal-content">
                    <h2>🏐 Staff Login Required</h2>
                    <p>Enter the staff password to access the MGA volleyball tryout management system:</p>
                    <div class="login-form">
                        <input type="password" id="passwordInput" placeholder="Enter staff password" autofocus>
                        <button onclick="authManager.attemptLogin()" id="loginBtn">Login</button>
                    </div>
                    <div id="loginError" class="login-error" style="display: none;">
                        ❌ Incorrect password. Please try again.
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add enter key support
        document.getElementById('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.attemptLogin();
            }
        });

        // Focus on input
        setTimeout(() => {
            document.getElementById('passwordInput').focus();
        }, 100);
    }

    attemptLogin() {
        const password = document.getElementById('passwordInput').value;
        const errorDiv = document.getElementById('loginError');
        const loginBtn = document.getElementById('loginBtn');

        if (password === this.STAFF_PASSWORD) {
            // Success
            sessionStorage.setItem(this.SESSION_KEY, 'authenticated');
            document.getElementById('loginModal').remove();
            
            // Show success message briefly
            this.showSuccessMessage();
        } else {
            // Error
            errorDiv.style.display = 'block';
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
            
            // Shake animation
            loginBtn.style.animation = 'shake 0.5s';
            setTimeout(() => {
                loginBtn.style.animation = '';
            }, 500);
        }
    }

    showSuccessMessage() {
        const successDiv = document.createElement('div');
        successDiv.className = 'auth-success';
        successDiv.innerHTML = '✅ Login successful! Welcome to MGA Volleyball tryouts.';
        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        location.reload();
    }

    // Call this before any sensitive operations
    requireAuth() {
        if (!this.isLoggedIn()) {
            this.showLoginModal();
            return false;
        }
        return true;
    }
}

// Initialize auth manager on page load
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

// Add logout function to window for easy access
window.logout = () => authManager.logout();
