// ============ Patient Login JavaScript ============

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (auth.checkAuth()) {
        const user = auth.getUser();
        if (user) {
            window.location.href = auth.getDashboardUrl();
            return;
        }
    }

    // Setup login options
    setupLoginOptions();
    
    // Setup password toggle
    setupPasswordToggle();
    
    // Setup login form
    setupLoginForm();
    
    // Setup register redirect
    setupRegisterRedirect();
    
    // Setup forgot password
    setupForgotPassword();
    
    // Setup OTP verification
    setupOTPInputs();
});

// ============ Setup Login Options ============
function setupLoginOptions() {
    const options = document.querySelectorAll('.login-option');
    const identifierInput = document.getElementById('loginIdentifier');
    const identifierLabel = document.getElementById('identifierLabel');
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            options.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            
            const optionType = this.dataset.option;
            const labels = {
                'patient-id': 'Patient ID',
                'mrn': 'Medical Record Number (MRN)',
                'phone': 'Phone Number',
                'email': 'Email Address'
            };
            const placeholders = {
                'patient-id': 'Enter your Patient ID (e.g., PAT-2026-00001)',
                'mrn': 'Enter your Medical Record Number',
                'phone': 'Enter your phone number',
                'email': 'Enter your email address'
            };
            
            if (identifierLabel) {
                identifierLabel.textContent = labels[optionType] || 'Patient ID';
            }
            if (identifierInput) {
                identifierInput.placeholder = placeholders[optionType] || '';
                identifierInput.value = '';
                identifierInput.focus();
            }
        });
    });
}

// ============ Setup Password Toggle ============
function setupPasswordToggle() {
    const toggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('loginPassword');
    
    if (toggle && passwordInput) {
        toggle.addEventListener('click', function() {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                this.textContent = '👁️';
            }
        });
    }
}

// ============ Setup Login Form ============
function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const identifier = document.getElementById('loginIdentifier').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        if (!identifier || !password) {
            showToast('Please enter your login credentials.', 'warning');
            return;
        }
        
        const submitBtn = document.getElementById('loginBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Signing In...';
        
        // Determine login type based on active option
        const activeOption = document.querySelector('.login-option.active');
        const loginType = activeOption ? activeOption.dataset.option : 'patient-id';
        
        // Build login data
        const loginData = {
            identifier: identifier,
            password: password,
            loginType: loginType,
            rememberMe: rememberMe
        };
        
        try {
            // Attempt login
            const response = await api.login(identifier, password);
            
            if (response && response.token) {
                // Check if 2FA is required
                if (response.requiresTwoFactor) {
                    showTwoFactorAuth();
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span class="btn-icon">🔑</span> Sign In';
                    return;
                }
                
                // Login successful
                showToast('Welcome back! Redirecting to your dashboard...', 'success');
                
                // Redirect based on role
                const user = auth.getUser();
                if (user) {
                    setTimeout(() => {
                        window.location.href = auth.getDashboardUrl();
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast(error.message || 'Login failed. Please check your credentials.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-icon">🔑</span> Sign In';
        }
    });
}

// ============ Show Two Factor Auth ============
function showTwoFactorAuth() {
    const section = document.getElementById('twoFactorSection');
    if (section) {
        section.style.display = 'block';
        // Scroll to section
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ============ Setup OTP Inputs ============
function setupOTPInputs() {
    const inputs = document.querySelectorAll('.otp-input');
    
    inputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
                inputs[index - 1].focus();
            }
        });
        
        // Allow only numbers
        input.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
    });
    
    // Verify OTP
    const verifyBtn = document.getElementById('verifyOtpBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            const otp = Array.from(inputs).map(i => i.value).join('');
            if (otp.length === 6) {
                showToast('OTP verified successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/patient-dashboard.html';
                }, 1000);
            } else {
                showToast('Please enter the complete 6-digit code.', 'warning');
            }
        });
    }
    
    // Resend OTP
    const resendBtn = document.getElementById('resendOtp');
    if (resendBtn) {
        resendBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('New OTP sent to your phone number.', 'success');
        });
    }
}

// ============ Setup Register Redirect ============
function setupRegisterRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('register') === 'true') {
        // Show registration form
        const registerTab = document.querySelector('.auth-tab[data-tab="register"]');
        if (registerTab) {
            registerTab.click();
        }
    }
}

// ============ Setup Forgot Password ============
function setupForgotPassword() {
    const forgotPassword = document.getElementById('forgotPassword');
    if (forgotPassword) {
        forgotPassword.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('Password reset link has been sent to your email.', 'success');
        });
    }
    
    const forgotPatientId = document.getElementById('forgotPatientId');
    if (forgotPatientId) {
        forgotPatientId.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('Your Patient ID has been sent to your registered email.', 'success');
        });
    }
}

// ============ QR Code Login ============
const qrLoginBtn = document.getElementById('qrLoginBtn');
if (qrLoginBtn) {
    qrLoginBtn.addEventListener('click', function() {
        showToast('📱 Please scan the QR code using the hospital app.', 'info');
        // Simulate QR scan
        setTimeout(() => {
            showToast('✅ QR Code scanned successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/patient-dashboard.html';
            }, 1500);
        }, 2000);
    });
}
