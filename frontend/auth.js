// ============ Authentication Module ============

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        // Check for existing session
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            this.isAuthenticated = true;
            this.updateUI();
        }

        // Setup login form if it exists
        this.setupLoginForm();
        this.setupRegisterForm();
        this.setupLogoutButtons();
    }

    // ============ Login ============
    async login(email, password) {
        try {
            const response = await api.login(email, password);
            
            if (response.token) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                this.updateUI();
                this.redirectAfterLogin(response.user.role);
                showToast('Login successful! Welcome back.', 'success');
                return true;
            }
            return false;
        } catch (error) {
            showToast(error.message || 'Login failed. Please try again.', 'error');
            return false;
        }
    }

    // ============ Register ============
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

    // ============ Logout ============
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

    // ============ Setup Login Form ============
    setupLoginForm() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            
            if (!email || !password) {
                showToast('Please fill in all fields.', 'warning');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            const success = await this.login(email, password);
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
            
            if (!success) {
                // Reset password field
                const passwordField = document.getElementById('loginPassword');
                if (passwordField) passwordField.value = '';
            }
        });
    }

    // ============ Setup Register Form ============
    setupRegisterForm() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('regFirstName')?.value;
            const lastName = document.getElementById('regLastName')?.value;
            const email = document.getElementById('regEmail')?.value;
            const phone = document.getElementById('regPhone')?.value;
            const password = document.getElementById('regPassword')?.value;
            const confirmPassword = document.getElementById('regConfirmPassword')?.value;
            const dateOfBirth = document.getElementById('regDob')?.value;
            const gender = document.getElementById('regGender')?.value;

            // Validation
            if (!firstName || !lastName || !email || !phone || !password || !dateOfBirth || !gender) {
                showToast('Please fill in all required fields.', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            if (password.length < 8) {
                showToast('Password must be at least 8 characters long.', 'error');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registering...';

            const userData = {
                firstName,
                lastName,
                email,
                phone,
                password,
                dateOfBirth,
                gender,
                role: 'patient'
            };

            // Add optional fields
            const address = document.getElementById('regAddress')?.value;
            const emergencyContact = document.getElementById('regEmergencyContact')?.value;
            const emergencyPhone = document.getElementById('regEmergencyPhone')?.value;

            if (address) userData.address = { street: address };
            if (emergencyContact && emergencyPhone) {
                userData.emergencyContact = {
                    name: emergencyContact,
                    phone: emergencyPhone
                };
            }

            const success = await this.register(userData);
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
            
            if (success) {
                // Redirect to patient dashboard after registration
                window.location.href = '/patient-dashboard.html';
            }
        });
    }

    // ============ Setup Logout Buttons ============
    setupLogoutButtons() {
        document.querySelectorAll('.logout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }

    // ============ Redirect After Login ============
    redirectAfterLogin(role) {
        const redirectMap = {
            'admin': '/admin-dashboard.html',
            'doctor': '/doctor-dashboard.html',
            'nurse': '/nurse-dashboard.html',
            'reception': '/reception-dashboard.html',
            'laboratory': '/laboratory-dashboard.html',
            'pharmacy': '/pharmacy-dashboard.html',
            'finance': '/finance-dashboard.html',
            'patient': '/patient-dashboard.html'
        };

        const redirectUrl = redirectMap[role] || '/patient-dashboard.html';
        
        // Get redirect parameter from URL
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        
        if (redirect) {
            window.location.href = redirect;
        } else {
            window.location.href = redirectUrl;
        }
    }

    // ============ Update UI ============
    updateUI() {
        // Update header if authenticated
        const header = document.querySelector('header');
        if (header && this.isAuthenticated) {
            const nav = header.querySelector('.header-nav');
            if (nav) {
                // Remove login/register links
                const loginLink = nav.querySelector('a[href="patient-login.html"]');
                const registerLink = nav.querySelector('a[href*="register"]');
                if (loginLink) loginLink.remove();
                if (registerLink) registerLink.remove();

                // Add dashboard link
                const dashboardLink = document.createElement('a');
                dashboardLink.href = this.getDashboardUrl();
                dashboardLink.className = 'nav-link';
                dashboardLink.textContent = 'Dashboard';
                nav.appendChild(dashboardLink);

                // Add logout link
                const logoutLink = document.createElement('a');
                logoutLink.href = '#';
                logoutLink.className = 'nav-link';
                logoutLink.textContent = 'Logout';
                logoutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
                nav.appendChild(logoutLink);
            }
        }

        // Update user name display
        const userDisplay = document.querySelector('.user-display');
        if (userDisplay && this.currentUser) {
            userDisplay.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }

        // Hide/show auth elements
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = this.isAuthenticated ? 'block' : 'none';
        });
        
        document.querySelectorAll('.auth-hidden').forEach(el => {
            el.style.display = this.isAuthenticated ? 'none' : 'block';
        });
    }

    // ============ Get Dashboard URL ============
    getDashboardUrl() {
        const role = this.currentUser?.role || 'patient';
        const map = {
            'admin': '/admin-dashboard.html',
            'doctor': '/doctor-dashboard.html',
            'nurse': '/nurse-dashboard.html',
            'reception': '/reception-dashboard.html',
            'laboratory': '/laboratory-dashboard.html',
            'pharmacy': '/pharmacy-dashboard.html',
            'finance': '/finance-dashboard.html',
            'patient': '/patient-dashboard.html'
        };
        return map[role] || '/patient-dashboard.html';
    }

    // ============ Check Role Access ============
    requireRole(role) {
        if (!this.isAuthenticated) {
            window.location.href = `/patient-login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
            return false;
        }

        const userRole = this.currentUser?.role;
        if (Array.isArray(role)) {
            if (!role.includes(userRole)) {
                showToast('You do not have permission to access this page.', 'error');
                window.location.href = '/index.html';
                return false;
            }
        } else {
            if (userRole !== role && role !== 'any') {
                showToast('You do not have permission to access this page.', 'error');
                window.location.href = '/index.html';
                return false;
            }
        }
        return true;
    }

    // ============ Get Current User ============
    getUser() {
        return this.currentUser;
    }

    // ============ Check Authentication Status ============
    checkAuth() {
        return this.isAuthenticated;
    }

    // ============ Protected Route Check ============
    protectRoute(allowedRoles = null) {
        if (!this.isAuthenticated) {
            window.location.href = `/patient-login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
            return false;
        }

        if (allowedRoles && !allowedRoles.includes(this.currentUser.role)) {
            showToast('Access denied. Insufficient permissions.', 'error');
            window.location.href = '/index.html';
            return false;
        }

        return true;
    }
}

// ============ Initialize Auth Manager ============
const auth = new AuthManager();

// Make auth globally available
window.auth = auth;

// ============ Auto-protect pages ============
document.addEventListener('DOMContentLoaded', function() {
    // Check if page requires authentication
    const page = window.location.pathname;
    
    // Admin pages
    if (page.includes('admin-dashboard') || page.includes('admin-')) {
        auth.protectRoute(['admin']);
    }
    
    // Doctor pages
    if (page.includes('doctor-dashboard') || page.includes('doctor-')) {
        auth.protectRoute(['doctor', 'admin']);
    }
    
    // Patient pages
    if (page.includes('patient-dashboard') || page.includes('patient-')) {
        auth.protectRoute(['patient', 'admin']);
    }
    
    // Staff pages
    if (page.includes('reception-dashboard') || page.includes('nurse-dashboard') || 
        page.includes('laboratory-dashboard') || page.includes('pharmacy-dashboard') || 
        page.includes('finance-dashboard')) {
        auth.protectRoute(['reception', 'nurse', 'laboratory', 'pharmacy', 'finance', 'admin']);
    }
});
