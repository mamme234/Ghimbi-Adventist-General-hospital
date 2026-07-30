// ============ Main JavaScript ============

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in - redirect immediately
    const isLoggedIn = isAuthenticated();
    const user = getCurrentUser();

    if (isLoggedIn && user) {
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
        window.location.href = roleMap[user.role] || 'patient-dashboard.html';
        return;
    }

    // Hide loader quickly
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }, 300);

    // Initialize features
    initStatsCounter();
    initScrollAnimations();
    initAIAssistant();
    initSmoothScroll();
    initMobileMenu();
    initScrollProgress();
    initThemeToggle();
    initAuthTabs();
    initLoginForm();
    initSignupForm();

    // Load dynamic content
    if (document.getElementById('departmentsGrid')) {
        loadDepartments();
    }
    if (document.getElementById('doctorsGrid')) {
        loadDoctors();
    }

    updateAuthLinks();
    updateGetStartedAuth();
});

// ============ Auth Tabs ============
function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = {
        login: document.getElementById('loginForm'),
        signup: document.getElementById('signupForm')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabName = this.dataset.tab;
            Object.keys(forms).forEach(key => {
                forms[key].classList.remove('active');
            });
            forms[tabName].classList.add('active');
        });
    });
}

// ============ Login Form ============
function initLoginForm() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;

    loginBtn.addEventListener('click', async function() {
        const identifier = document.getElementById('loginIdentifier').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!identifier || !password) {
            showToast('Please enter your login credentials.', 'warning');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="btn-icon">⏳</span> Signing In...';

        try {
            const response = await api.login(identifier, password);

            if (response && response.token) {
                showToast('Welcome back! Redirecting to your dashboard...', 'success');
                setTimeout(() => {
                    const user = getCurrentUser();
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
                    window.location.href = roleMap[user?.role] || 'patient-dashboard.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast(error.message || 'Login failed. Please check your credentials.', 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span class="btn-icon">🔑</span> Sign In';
        }
    });

    // Allow Enter key on login form
    document.querySelectorAll('#loginForm input').forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
    });
}

// ============ Signup Form ============
function initSignupForm() {
    const signupBtn = document.getElementById('signupBtn');
    if (!signupBtn) return;

    signupBtn.addEventListener('click', async function() {
        const firstName = document.getElementById('regFirstName').value.trim();
        const lastName = document.getElementById('regLastName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const dob = document.getElementById('regDob').value;
        const gender = document.getElementById('regGender').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const terms = document.getElementById('regTerms').checked;

        // Validation
        if (!firstName || !lastName || !email || !phone || !dob || !gender || !password) {
            showToast('Please fill in all required fields.', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        if (password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }

        if (!terms) {
            showToast('Please agree to the Terms of Service.', 'warning');
            return;
        }

        signupBtn.disabled = true;
        signupBtn.innerHTML = '<span class="btn-icon">⏳</span> Creating Account...';

        try {
            const userData = {
                firstName,
                lastName,
                email,
                phone,
                password,
                dateOfBirth: dob,
                gender,
                role: 'patient'
            };

            const response = await api.register(userData);

            if (response && response.token) {
                showToast('Account created successfully! Welcome to Gimbie Hospital.', 'success');
                setTimeout(() => {
                    window.location.href = '/patient-dashboard.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Signup error:', error);
            showToast(error.message || 'Registration failed. Please try again.', 'error');
            signupBtn.disabled = false;
            signupBtn.innerHTML = '<span class="btn-icon">📝</span> Create Account';
        }
    });

    // Allow Enter key on signup form
    document.querySelectorAll('#signupForm input').forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                signupBtn.click();
            }
        });
    });
}

// ============ Toggle Password ============
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

// ============ Update Auth Links ============
function updateAuthLinks() {
    const navAuth = document.getElementById('navAuth');
    if (!navAuth) return;

    const isLoggedIn = isAuthenticated();
    const user = getCurrentUser();

    if (isLoggedIn && user) {
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
            <a href="${roleMap[user.role] || 'patient-dashboard.html'}" class="nav-dashboard">📊 Dashboard</a>
            <a href="#" onclick="api.logout(); return false;" class="nav-logout">🚪 Logout</a>
        `;
    } else {
        navAuth.innerHTML = `
            <a href="#loginForm" class="nav-login">Login</a>
            <a href="#signupForm" class="nav-register">Register</a>
        `;
    }
}

// ============ Update Get Started Auth ============
function updateGetStartedAuth() {
    const isLoggedIn = isAuthenticated();
    const loginBtn = document.querySelector('.get-started-btn.login-btn');
    const registerBtn = document.querySelector('.get-started-btn.register-btn');
    const dashboardBtn = document.getElementById('dashboardQuickLink');

    if (isLoggedIn) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (dashboardBtn) {
            dashboardBtn.style.display = 'flex';
            const user = getCurrentUser();
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
            dashboardBtn.href = roleMap[user?.role] || 'patient-dashboard.html';
            const name = user?.firstName || 'Patient';
            const strongEl = dashboardBtn.querySelector('strong');
            if (strongEl) strongEl.textContent = `Welcome, ${name}`;
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'flex';
        if (registerBtn) registerBtn.style.display = 'flex';
        if (dashboardBtn) dashboardBtn.style.display = 'none';
    }
}

// ============ Load Departments ============
async function loadDepartments() {
    try {
        const departments = await api.getDepartments();
        const grid = document.getElementById('departmentsGrid');
        if (!grid) return;
        grid.innerHTML = departments.slice(0, 6).map(dept => `
            <div class="department-card glass" onclick="window.location.href='departments.html?dept=${encodeURIComponent(dept.name)}'">
                <span class="department-icon">${getDepartmentIcon(dept.name)}</span>
                <h3>${dept.name}</h3>
                <p>${dept.description || 'Comprehensive medical services'}</p>
                ${dept.head ? `<small>Head: Dr. ${dept.head.firstName} ${dept.head.lastName}</small>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

function getDepartmentIcon(name) {
    const icons = {
        'Emergency': '🚑', 'Surgery': '🔪', 'Pediatrics': '👶', 'Maternity': '🤱',
        'Internal Medicine': '🫀', 'Dental': '🦷', 'Eye Clinic': '👁️', 'Pharmacy': '💊',
        'Laboratory': '🔬', 'Radiology': '📷', 'Cardiology': '❤️', 'Orthopedics': '🦴'
    };
    return icons[name] || '🏥';
}

// ============ Load Doctors ============
async function loadDoctors() {
    try {
        const doctors = await api.getDoctors('?limit=6');
        const grid = document.getElementById('doctorsGrid');
        if (!grid) return;
        if (!doctors || doctors.length === 0) {
            grid.innerHTML = `<div class="no-results">No doctors available</div>`;
            return;
        }
        grid.innerHTML = doctors.map(doctor => {
            const user = doctor.user || {};
            const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
            return `
                <div class="doctor-card glass">
                    <div class="doctor-avatar">${initials || '👨‍⚕️'}</div>
                    <h4>Dr. ${user.firstName || ''} ${user.lastName || ''}</h4>
                    <p>${doctor.specialization || 'General'}</p>
                    <small>${doctor.experience || 0} years experience</small>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

// ============ Stats Counter ============
function initStatsCounter() {
    const statElements = document.querySelectorAll('.stat-number[data-target]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const target = parseInt(element.dataset.target);
                animateNumber(element, target);
                observer.unobserve(element);
            }
        });
    }, { threshold: 0.5 });
    statElements.forEach(el => observer.observe(el));
}

function animateNumber(element, target, duration = 2000) {
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);
        element.textContent = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
        else element.textContent = target.toLocaleString();
    }
    requestAnimationFrame(update);
}

// ============ Scroll Animations ============
function initScrollAnimations() {
    const elements = document.querySelectorAll('.glass, .stat-card, .department-card, .testimonial-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ============ Smooth Scroll ============
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ============ Mobile Menu ============
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.header-nav');
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }
}

// ============ Scroll Progress ============
function initScrollProgress() {
    const progressBar = document.getElementById('scrollProgress');
    if (!progressBar) return;
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = (scrollTop / docHeight * 100) + '%';
    });
}

// ============ Theme Toggle ============
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ============ AI Assistant ============
function initAIAssistant() {
    const aiBtn = document.getElementById('aiAssistantBtn');
    const modal = document.getElementById('aiAssistantModal');
    const closeBtn = document.getElementById('closeAiModal');
    const sendBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    if (!aiBtn || !modal) return;

    aiBtn.addEventListener('click', () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    if (closeBtn) closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        addMessage(message, 'user');
        chatInput.value = '';
        const typingId = addTypingIndicator();
        setTimeout(() => {
            removeTypingIndicator(typingId);
            addMessage(getAIResponse(message), 'bot');
        }, 500 + Math.random() * 1000);
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = text;
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'chat-message bot';
        div.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) element.remove();
    }

    function getAIResponse(message) {
        const lower = message.toLowerCase();
        if (lower.includes('department')) {
            return `We have Emergency, Surgery, Pediatrics, Maternity, Internal Medicine, Dental, Eye Clinic, Pharmacy, Laboratory, Radiology, Cardiology, and Orthopedics.`;
        }
        if (lower.includes('appointment') || lower.includes('book')) {
            return `To book an appointment, click the "Book Appointment" button above.`;
        }
        if (lower.includes('doctor')) {
            return `View our featured doctors below in the "Featured Doctors" section.`;
        }
        if (lower.includes('login') || lower.includes('sign')) {
            return `You can login or create an account in the "Get Started" section above.`;
        }
        return `I'm here to help! You can ask me about:<br>
            • Departments<br>
            • Appointments<br>
            • Doctors<br>
            • Login/Sign up<br>
            • Emergency services`;
    }
}

// ============ Toast Notification ============
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: var(--font-body);
        font-weight: 500;
        z-index: 9999;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
        color: white;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => { toast.remove(); }, 300);
    }, duration);
}
window.showToast = showToast;
