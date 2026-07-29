// ============ Main JavaScript ============

// Load components
document.addEventListener('DOMContentLoaded', function() {
    // ============================================================
    // AUTO-REDIRECT TO DASHBOARD IF LOGGED IN
    // ============================================================
    const isLoggedIn = isAuthenticated();
    const user = getCurrentUser();

    if (isLoggedIn && user) {
        // Get the correct dashboard URL based on role
        const roleMap = {
            'patient': 'patient-dashboard.html',
            'doctor': 'doctor-dashboard.html',
            'admin': 'admin-dashboard.html',
            'nurse': 'nurse-dashboard.html',
            'reception': 'reception-dashboard.html',
            'laboratory': 'laboratory-dashboard.html',
            'pharmacy': 'pharmacy-dashboard.html',
            'finance': 'finance-dashboard.html'
        };
        const dashboardUrl = roleMap[user.role] || 'patient-dashboard.html';
        
        // Redirect to dashboard
        window.location.href = dashboardUrl;
        return; // Stop execution
    }

    // Hide loader
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }, 1500);

    // Initialize features
    initStatsCounter();
    initScrollAnimations();
    initAIAssistant();
    initSmoothScroll();
    initMobileMenu();
    initScrollProgress();
    initThemeToggle();
    initGetStarted();
    updateGetStartedAuth();

    // Load dynamic content
    if (document.getElementById('departmentsGrid')) {
        loadDepartments();
    }
    if (document.getElementById('newsGrid')) {
        loadNews();
    }
    if (document.querySelector('.stat-number[data-target]')) {
        loadStatistics();
    }

    // Update auth links
    updateAuthLinks();
});

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
            'finance': 'finance-dashboard.html'
        };
        const dashboardUrl = roleMap[user.role] || 'patient-dashboard.html';
        
        navAuth.innerHTML = `
            <a href="${dashboardUrl}" class="nav-link nav-dashboard">
                <span class="nav-icon">📊</span> Dashboard
            </a>
            <a href="#" onclick="api.logout(); return false;" class="nav-link nav-logout">
                <span class="nav-icon">🚪</span> Logout
            </a>
        `;
    } else {
        navAuth.innerHTML = `
            <a href="patient-login.html" class="nav-login">Login</a>
            <a href="patient-signup.html" class="nav-register">Register</a>
        `;
    }
}

// ============ Update Get Started Auth ============
function updateGetStartedAuth() {
    const isLoggedIn = isAuthenticated();
    const loginBtn = document.querySelector('.get-started-btn.login-btn');
    const registerBtn = document.querySelector('.get-started-btn.register-btn');
    const dashboardBtn = document.getElementById('dashboardQuickLink');
    const getStartedOptions = document.getElementById('getStartedOptions');

    if (!getStartedOptions) return;

    if (isLoggedIn) {
        // Hide login and register buttons
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        
        // Show dashboard button
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
                'finance': 'finance-dashboard.html'
            };
            dashboardBtn.href = roleMap[user?.role] || 'patient-dashboard.html';
            
            // Update text
            const name = user?.firstName || 'Patient';
            const strongEl = dashboardBtn.querySelector('strong');
            const spanEl = dashboardBtn.querySelector('.btn-left span:last-child');
            if (strongEl) strongEl.textContent = `Welcome, ${name}`;
            if (spanEl) spanEl.textContent = 'Go to your dashboard';
        }
    } else {
        // Show login and register buttons
        if (loginBtn) loginBtn.style.display = 'flex';
        if (registerBtn) registerBtn.style.display = 'flex';
        if (dashboardBtn) dashboardBtn.style.display = 'none';
    }
}

// ============ Init Get Started ============
function initGetStarted() {
    // Add click tracking for get started buttons
    const getStartedBtns = document.querySelectorAll('.get-started-btn');
    getStartedBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const label = this.querySelector('strong')?.textContent || 'Get Started';
            console.log(`Get Started: ${label} clicked`);
        });
    });
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
    let start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target.toLocaleString();
        }
    }

    requestAnimationFrame(update);
}

// ============ Scroll Animations ============
function initScrollAnimations() {
    const elements = document.querySelectorAll('.glass, .stat-card, .highlight-card, .department-card, .testimonial-card, .news-card');
    
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

// ============ Scroll Progress ============
function initScrollProgress() {
    const progressBar = document.getElementById('scrollProgress');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = progress + '%';
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
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
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

    if (closeBtn) {
        closeBtn.addEventListener('click', closeAI);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAI();
        }
    });

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    function closeAI() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        chatInput.value = '';

        const typingId = addTypingIndicator();

        setTimeout(() => {
            removeTypingIndicator(typingId);
            const response = getAIResponse(message);
            addMessage(response, 'bot');
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
                <span class="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
            </div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    function getAIResponse(message) {
        const lower = message.toLowerCase();
        
        if (lower.includes('department') || lower.includes('service') || lower.includes('where')) {
            return `We have the following departments:<br>
                • Emergency (24/7)<br>
                • Surgery<br>
                • Pediatrics<br>
                • Maternity<br>
                • Internal Medicine<br>
                • Dental Clinic<br>
                • Eye Clinic<br>
                • Pharmacy<br>
                • Laboratory<br>
                • Radiology<br>
                • Cardiology<br>
                • Orthopedics<br><br>
                Visit our <a href="departments.html">Departments page</a> for more details.`;
        }
        
        if (lower.includes('appointment') || lower.includes('book') || lower.includes('schedule')) {
            return `To book an appointment:<br><br>
                1. Visit our <a href="appointments.html">Appointments page</a><br>
                2. Choose your department and doctor<br>
                3. Select a date and time<br>
                4. Confirm your booking<br><br>
                You can also call us at +251-XXX-XXXXXX for assistance.`;
        }
        
        if (lower.includes('doctor') || lower.includes('physician') || lower.includes('specialist')) {
            return `Our hospital has highly qualified doctors across all specialties.<br><br>
                You can:<br>
                • View all doctors on our <a href="doctors.html">Doctors page</a><br>
                • Filter by department or specialization<br>
                • View doctor profiles and availability<br>
                • Book appointments directly with your chosen doctor`;
        }
        
        if (lower.includes('login') || lower.includes('sign up') || lower.includes('register') || lower.includes('account')) {
            return `🔑 <strong>Patient Portal Access</strong><br><br>
                <strong>Login</strong><br>
                • Use your Patient ID or Email<br>
                • Enter your password<br>
                • Access your health records<br><br>
                <strong>New Patient?</strong><br>
                • <a href="patient-signup.html">Sign up here</a><br>
                • Create your account in minutes<br>
                • Start managing your health online<br><br>
                <a href="patient-login.html" class="btn btn-primary btn-small">Go to Login</a>`;
        }
        
        if (lower.includes('about') || lower.includes('history') || lower.includes('mission')) {
            return `🏥 <strong>About Gimbie Adventist General Hospital</strong><br><br>
                Founded in 1960, Gimbie Adventist Hospital has been serving the community with excellence in healthcare for over 60 years.<br><br>
                <strong>Our Mission:</strong><br>
                To provide quality, compassionate healthcare to all, regardless of their background or ability to pay.<br><br>
                <strong>Our Values:</strong><br>
                • Excellence in Patient Care<br>
                • Compassion and Respect<br>
                • Community Service<br>
                • Medical Excellence<br>
                • Innovation and Technology<br><br>
                <a href="about.html">Learn more about us →</a>`;
        }
        
        return `Thank you for your question! I'm here to help.<br><br>
            I can assist you with information about:<br>
            • Departments and services<br>
            • Booking appointments<br>
            • Doctors and specialists<br>
            • Visiting hours<br>
            • Laboratory and pharmacy services<br>
            • Insurance and billing<br>
            • Career opportunities<br>
            • Emergency services<br>
            • Patient portal login and registration<br><br>
            Please ask your specific question and I'll do my best to assist you. 🙏`;
    }
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
        'Emergency': '🚑',
        'Surgery': '🔪',
        'Pediatrics': '👶',
        'Maternity': '🤱',
        'Internal Medicine': '🫀',
        'Dental': '🦷',
        'Eye Clinic': '👁️',
        'Pharmacy': '💊',
        'Laboratory': '🔬',
        'Radiology': '📷',
        'Cardiology': '❤️',
        'Orthopedics': '🦴'
    };
    return icons[name] || '🏥';
}

// ============ Load News ============
async function loadNews() {
    try {
        const response = await api.getNews('?limit=3');
        const grid = document.getElementById('newsGrid');
        
        if (!grid) return;
        
        if (response.news && response.news.length > 0) {
            grid.innerHTML = response.news.map(news => `
                <div class="news-card glass">
                    <div class="news-image" style="background: linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})"></div>
                    <div class="news-content">
                        <span class="news-tag">${news.category || 'Hospital'}</span>
                        <h3 class="news-title">${news.title}</h3>
                        <p class="news-excerpt">${news.excerpt || news.content.substring(0, 150) + '...'}</p>
                        <small>${new Date(news.publishedDate).toLocaleDateString()}</small>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = `
                <div class="news-card glass">
                    <div class="news-content">
                        <h3>No news available</h3>
                        <p>Check back later for updates.</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading news:', error);
    }
}

// ============ Load Statistics ============
async function loadStatistics() {
    try {
        const stats = await api.getStatistics();
        const statElements = document.querySelectorAll('.stat-number[data-target]');
        
        statElements.forEach(el => {
            const parent = el.closest('.stat-item');
            const label = parent?.querySelector('.stat-label')?.textContent?.toLowerCase();
            if (label) {
                const keyMap = {
                    'doctors': 'doctors',
                    'nurses': 'nurses',
                    'staff': 'staff',
                    'departments': 'departments',
                    'beds': 'beds',
                    'patients served': 'patients',
                    'surgeries': 'surgeries',
                    'ambulances': 'ambulances',
                    'lab tests': 'labTests',
                    'years of service': 'yearsOfService'
                };
                const key = keyMap[label] || label.replace(/\s/g, '');
                const value = stats[key] || 0;
                animateNumber(el, value);
            }
        });
    } catch (error) {
        console.error('Error loading statistics:', error);
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
    
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

window.showToast = showToast;
