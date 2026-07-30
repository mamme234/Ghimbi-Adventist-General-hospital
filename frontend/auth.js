// ============ Authentication Module ============

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            this.isAuthenticated = true;
            this.updateUI();
        }
    }

    async login(email, password) {
        try {
            const response = await api.login(email, password);
            if (response.token) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                this.updateUI();
                showToast('Login successful! Welcome back.', 'success');
                return true;
            }
            return false;
        } catch (error) {
            showToast(error.message || 'Login failed. Please try again.', 'error');
            return false;
        }
    }

    async register(userData) {
        try {
            const response = await api.register(userData);
            if (response.token) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                this.updateUI();
                showToast('Registration successful! Welcome to Gimbie Hospital.', 'success');
                return true;
            }
            return false;
        } catch (error) {
            showToast(error.message || 'Registration failed. Please try again.', 'error');
            return false;
        }
    }

    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        this.currentUser = null;
        this.isAuthenticated = false;
        this.updateUI();
        window.location.href = '/index.html';
    }

    updateUI() {
        // Update navigation auth links
        const navAuth = document.getElementById('navAuth');
        if (navAuth) {
            if (this.isAuthenticated && this.currentUser) {
                const roleMap = {
                    'patient': 'patient-dashboard.html',
                    'doctor': 'doctor-dashboard.html',
                    'admin': 'admin-dashboard.html',
                    'nurse': 'nurse-dashboard.html',
                    'reception': 'reception-dashboard.html',
                    'laboratory': 'laboratory-dashboard.html',
                    'pharmacy': 'pharmacy-dashboard.html',
                    'finance': 'finance-dashboard.html',
                    'superadmin': 'super-admin-dashboard.html',
                    'radiologist': 'radiology-dashboard.html',
                    'hr': 'hr-dashboard.html',
                    'ambulance': 'ambulance-dashboard.html'
                };
                navAuth.innerHTML = `
                    <a href="${roleMap[this.currentUser.role] || 'patient-dashboard.html'}" class="nav-dashboard">📊 Dashboard</a>
                    <a href="#" onclick="auth.logout(); return false;" class="nav-logout">🚪 Logout</a>
                `;
            } else {
                navAuth.innerHTML = `
                    <a href="#loginForm" class="nav-login">Login</a>
                    <a href="#signupForm" class="nav-register">Register</a>
                `;
            }
        }
    }

    getUser() {
        return this.currentUser;
    }

    checkAuth() {
        return this.isAuthenticated;
    }

    requireRole(role) {
        if (!this.isAuthenticated) {
            window.location.href = '/index.html#loginForm';
            return false;
        }
        if (Array.isArray(role)) {
            if (!role.includes(this.currentUser?.role)) {
                showToast('You do not have permission to access this page.', 'error');
                window.location.href = '/index.html';
                return false;
            }
        } else {
            if (this.currentUser?.role !== role && role !== 'any') {
                showToast('You do not have permission to access this page.', 'error');
                window.location.href = '/index.html';
                return false;
            }
        }
        return true;
    }
}

// ============ Initialize Auth Manager ============
const auth = new AuthManager();
window.auth = auth;
