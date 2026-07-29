// ============ Patient Signup JavaScript ============

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (auth.checkAuth()) {
        const user = auth.getUser();
        if (user) {
            window.location.href = auth.getDashboardUrl();
            return;
        }
    }

    // Setup step navigation
    setupStepNavigation();
    
    // Setup password toggle
    setupPasswordToggle();
    
    // Setup form submission
    setupSignupForm();
    
    // Setup password validation
    setupPasswordValidation();
});

// ============ Step Navigation ============
function setupStepNavigation() {
    const nextBtns = document.querySelectorAll('.btn-next');
    const prevBtns = document.querySelectorAll('.btn-prev');
    const steps = document.querySelectorAll('.signup-step-content');
    const stepIndicators = document.querySelectorAll('.step');

    function goToStep(stepNumber) {
        // Update content
        steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === stepNumber);
        });

        // Update indicators
        stepIndicators.forEach((indicator, index) => {
            const num = index + 1;
            indicator.classList.remove('active', 'completed');
            if (num === stepNumber) {
                indicator.classList.add('active');
            } else if (num < stepNumber) {
                indicator.classList.add('completed');
            }
        });

        // Scroll to top of form
        const form = document.querySelector('.signup-form');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    nextBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const nextStep = parseInt(this.dataset.next);
            // Validate current step before proceeding
            if (validateStep(nextStep - 1)) {
                goToStep(nextStep);
            }
        });
    });

    prevBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const prevStep = parseInt(this.dataset.prev);
            goToStep(prevStep);
        });
    });
}

// ============ Validate Step ============
function validateStep(stepNumber) {
    const stepContent = document.querySelector(`.signup-step-content[data-step="${stepNumber}"]`);
    if (!stepContent) return true;

    const inputs = stepContent.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value || input.value === '') {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
            input.classList.add('success');
        }
    });

    // Special validation for step 3 (password)
    if (stepNumber === 3) {
        const password = document.getElementById('regPassword');
        const confirm = document.getElementById('regConfirmPassword');
        const terms = document.getElementById('regTerms');

        if (password && password.value.length < 8) {
            password.classList.add('error');
            showToast('Password must be at least 8 characters long.', 'error');
            isValid = false;
        }

        if (confirm && password && confirm.value !== password.value) {
            confirm.classList.add('error');
            showToast('Passwords do not match.', 'error');
            isValid = false;
        }

        if (terms && !terms.checked) {
            showToast('Please agree to the Terms of Service and Privacy Policy.', 'warning');
            isValid = false;
        }
    }

    if (!isValid) {
        showToast('Please fill in all required fields correctly.', 'warning');
    }

    return isValid;
}

// ============ Password Toggle ============
function setupPasswordToggle() {
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.closest('.form-group').querySelector('input');
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    this.textContent = '🙈';
                } else {
                    input.type = 'password';
                    this.textContent = '👁️';
                }
            }
        });
    });
}

// ============ Password Validation ============
function setupPasswordValidation() {
    const password = document.getElementById('regPassword');
    const confirm = document.getElementById('regConfirmPassword');

    if (password) {
        password.addEventListener('input', function() {
            validatePasswordStrength(this.value);
        });
    }

    if (confirm) {
        confirm.addEventListener('input', function() {
            const passwordVal = document.getElementById('regPassword')?.value || '';
            if (this.value && this.value !== passwordVal) {
                this.classList.add('error');
                this.classList.remove('success');
            } else if (this.value && this.value === passwordVal) {
                this.classList.remove('error');
                this.classList.add('success');
            }
        });
    }
}

function validatePasswordStrength(password) {
    const input = document.getElementById('regPassword');
    if (!input) return;

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (hasMinLength && hasUppercase && hasLowercase && hasNumber) {
        input.classList.remove('error');
        input.classList.add('success');
        return true;
    } else {
        input.classList.remove('success');
        input.classList.add('error');
        return false;
    }
}

// ============ Signup Form Submission ============
function setupSignupForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate all steps
        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
            return;
        }

        const submitBtn = document.getElementById('signupSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Creating Account...';

        // Collect form data
        const userData = {
            firstName: document.getElementById('regFirstName').value.trim(),
            lastName: document.getElementById('regLastName').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            phone: document.getElementById('regPhone').value.trim(),
            password: document.getElementById('regPassword').value,
            dateOfBirth: document.getElementById('regDob').value,
            gender: document.getElementById('regGender').value,
            bloodGroup: document.getElementById('regBloodGroup').value,
            address: document.getElementById('regAddress').value.trim(),
            emergencyContact: {
                name: document.getElementById('regEmergencyName').value.trim(),
                phone: document.getElementById('regEmergencyPhone').value.trim(),
                relationship: document.getElementById('regRelationship').value.trim()
            },
            role: 'patient'
        };

        try {
            const response = await api.register(userData);
            
            if (response && response.token) {
                showToast('Account created successfully! Welcome to Gimbie Hospital.', 'success');
                
                // Store token and user
                if (response.token) {
                    api.setToken(response.token);
                    api.setRefreshToken(response.refreshToken);
                    localStorage.setItem('user', JSON.stringify(response.user));
                }
                
                setTimeout(() => {
                    window.location.href = '/patient-dashboard.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Signup error:', error);
            showToast(error.message || 'Registration failed. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-icon">📝</span> Create Account';
        }
    });
}

// ============ Toggle Password (global) ============
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
        } else {
            input.type = 'password';
        }
    }
}
window.togglePassword = togglePassword;
