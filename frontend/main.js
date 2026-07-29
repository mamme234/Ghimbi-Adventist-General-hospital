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
            'finance': 'finance-dashboard.html'
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
                'finance': 'finance-dashboard.html'
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

// ============ Init Get Started ============
function initGetStarted() {
    document.querySelectorAll('.get-started-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Get Started clicked:', this.querySelector('strong')?.textContent);
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
    const elements = document.querySelectorAll('.glass, .stat-card, .department-card, .testimonial-card, .news-card');
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
            return `We have Emergency, Surgery, Pediatrics, Maternity, Internal Medicine, Dental, Eye Clinic, Pharmacy, Laboratory, Radiology, Cardiology, and Orthopedics.<br><a href="departments.html">View all departments →</a>`;
        }
        if (lower.includes('appointment') || lower.includes('book')) {
            return `To book an appointment:<br>1. Visit <a href="appointments.html">Appointments page</a><br>2. Choose department and doctor<br>3. Select date and time<br>4. Confirm booking`;
        }
        if (lower.includes('doctor')) {
            return `View all our doctors on the <a href="doctors.html">Doctors page</a>`;
        }
        if (lower.includes('login') || lower.includes('sign up') || lower.includes('register')) {
            return `🔑 <strong>Patient Portal</strong><br><br>
                <a href="patient-login.html" class="btn btn-primary btn-small">Login</a>
                <a href="patient-signup.html" class="btn btn-outline btn-small">Sign Up</a>`;
        }
        return `I'm here to help! You can ask me about:<br>
            • Departments<br>
            • Appointments<br>
            • Doctors<br>
            • Login/Sign up<br>
            • Emergency services`;
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
            grid.innerHTML = `<div class="news-card glass"><div class="news-content"><h3>No news available</h3><p>Check back later for updates.</p></div></div>`;
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
                    'doctors': 'doctors', 'nurses': 'nurses', 'staff': 'staff',
                    'departments': 'departments', 'beds': 'beds', 'patients served': 'patients',
                    'surgeries': 'surgeries', 'ambulances': 'ambulances',
                    'lab tests': 'labTests', 'years of service': 'yearsOfService'
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
    setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => { toast.remove(); }, 300);
    }, duration);
}
window.showToast = showToast;
