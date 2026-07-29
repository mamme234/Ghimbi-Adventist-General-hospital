// ============ Main JavaScript ============

// Load components
document.addEventListener('DOMContentLoaded', function() {
    // Hide loader
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }, 1000);

    // Load header and footer
    loadHeader();
    loadFooter();

    // Initialize features
    initStatsCounter();
    initScrollAnimations();
    initAIAssistant();
    initSmoothScroll();
    initMobileMenu();

    // Load departments
    if (document.getElementById('departmentsGrid')) {
        loadDepartments();
    }

    // Load news
    if (document.getElementById('newsGrid')) {
        loadNews();
    }

    // Load statistics
    if (document.querySelector('.stat-number[data-target]')) {
        loadStatistics();
    }
});

// ============ Load Header ============
function loadHeader() {
    const headerContainer = document.getElementById('header');
    if (!headerContainer) return;

    const isLoggedIn = isAuthenticated();
    const user = getCurrentUser();

    let navLinks = `
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
        <a href="services.html">Services</a>
        <a href="departments.html">Departments</a>
        <a href="doctors.html">Doctors</a>
        <a href="appointments.html">Appointments</a>
        <a href="news.html">News</a>
        <a href="contact.html">Contact</a>
    `;

    let authLinks = '';
    if (isLoggedIn && user) {
        if (user.role === 'patient') {
            authLinks = `
                <a href="patient-dashboard.html" class="nav-link">Dashboard</a>
                <a href="#" onclick="api.logout()" class="nav-link">Logout</a>
            `;
        } else if (user.role === 'admin') {
            authLinks = `
                <a href="admin-dashboard.html" class="nav-link">Admin</a>
                <a href="#" onclick="api.logout()" class="nav-link">Logout</a>
            `;
        } else {
            authLinks = `
                <a href="#" onclick="api.logout()" class="nav-link">Logout</a>
            `;
        }
    } else {
        authLinks = `
            <a href="patient-login.html" class="nav-link">Login</a>
            <a href="patient-login.html?register=true" class="btn btn-primary btn-small">Register</a>
        `;
    }

    headerContainer.innerHTML = `
        <header class="header">
            <div class="container">
                <div class="header-inner">
                    <div class="header-logo">
                        <a href="index.html">
                            <span class="logo-icon">🏥</span>
                            <span class="logo-text">Gimbie Hospital</span>
                        </a>
                    </div>
                    <nav class="header-nav">
                        ${navLinks}
                        ${authLinks}
                    </nav>
                    <button class="mobile-menu-toggle" aria-label="Toggle menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        </header>
    `;
}

// ============ Load Footer ============
function loadFooter() {
    const footerContainer = document.getElementById('footer');
    if (!footerContainer) return;

    footerContainer.innerHTML = `
        <footer class="footer">
            <div class="container">
                <div class="footer-grid">
                    <div class="footer-section">
                        <h3>🏥 Gimbie Adventist Hospital</h3>
                        <p>Providing quality healthcare with compassion and excellence since 1960.</p>
                        <div class="footer-social">
                            <a href="#" aria-label="Facebook">📘</a>
                            <a href="#" aria-label="Twitter">🐦</a>
                            <a href="#" aria-label="Instagram">📸</a>
                            <a href="#" aria-label="YouTube">▶️</a>
                        </div>
                    </div>
                    <div class="footer-section">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><a href="about.html">About Us</a></li>
                            <li><a href="services.html">Services</a></li>
                            <li><a href="doctors.html">Doctors</a></li>
                            <li><a href="appointments.html">Appointments</a></li>
                            <li><a href="careers.html">Careers</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h4>Contact</h4>
                        <ul>
                            <li>📞 +251-XXX-XXXXXX</li>
                            <li>📧 info@gimbiehospital.org</li>
                            <li>📍 Gimbie, Ethiopia</li>
                            <li>🕐 24/7 Emergency Service</li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h4>Emergency</h4>
                        <div class="footer-emergency">
                            <span class="emergency-number">🚑 911</span>
                            <p>For emergencies, call our 24/7 emergency hotline.</p>
                            <a href="emergency.html" class="btn btn-emergency btn-small">Get Help Now</a>
                        </div>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; ${new Date().getFullYear()} Gimbie Adventist General Hospital. All rights reserved.</p>
                </div>
            </div>
        </footer>
    `;
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

        // Add user message
        addMessage(message, 'user');
        chatInput.value = '';

        // Show typing indicator
        const typingId = addTypingIndicator();

        // Get AI response
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
        
        // Department related
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
        
        // Appointment related
        if (lower.includes('appointment') || lower.includes('book') || lower.includes('schedule')) {
            return `To book an appointment:<br><br>
                1. Visit our <a href="appointments.html">Appointments page</a><br>
                2. Choose your department and doctor<br>
                3. Select a date and time<br>
                4. Confirm your booking<br><br>
                You can also call us at ${document.querySelector('.footer-section ul li')?.textContent || '+251-XXX-XXXXXX'} for assistance.`;
        }
        
        // Doctor related
        if (lower.includes('doctor') || lower.includes('physician') || lower.includes('specialist')) {
            return `Our hospital has highly qualified doctors across all specialties.<br><br>
                You can:<br>
                • View all doctors on our <a href="doctors.html">Doctors page</a><br>
                • Filter by department or specialization<br>
                • View doctor profiles and availability<br>
                • Book appointments directly with your chosen doctor`;
        }
        
        // Visiting hours
        if (lower.includes('visiting') || lower.includes('hour') || lower.includes('time') || lower.includes('when')) {
            return `Visiting Hours:<br>
                • General Wards: 10:00 AM - 12:00 PM & 4:00 PM - 6:00 PM<br>
                • ICU: 11:00 AM - 12:00 PM & 5:00 PM - 6:00 PM<br>
                • Maternity: 10:00 AM - 11:00 AM & 4:00 PM - 5:00 PM<br>
                • Emergency: 24/7 for emergencies<br><br>
                Please check with the ward for any special visiting guidelines.`;
        }
        
        // Emergency
        if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('help') || lower.includes('ambulance')) {
            return `🚑 <strong>Emergency Services</strong><br><br>
                For immediate medical assistance:<br>
                • Call our emergency hotline: ${document.querySelector('.emergency-number')?.textContent || '911'}<br>
                • Visit our 24/7 Emergency Department<br>
                • Ambulance service available<br><br>
                <a href="emergency.html" class="btn btn-emergency btn-small">Get Emergency Help</a>`;
        }
        
        // Laboratory
        if (lower.includes('lab') || lower.includes('test') || lower.includes('result')) {
            return `🔬 <strong>Laboratory Services</strong><br><br>
                Our laboratory offers:<br>
                • Blood tests (CBC, Blood Sugar, etc.)<br>
                • Urine and stool analysis<br>
                • Microbiology tests<br>
                • Pathology services<br>
                • COVID-19 testing<br>
                • And more...<br><br>
                Results are typically available within 24-48 hours.`;
        }
        
        // Pharmacy
        if (lower.includes('pharmacy') || lower.includes('medicine') || lower.includes('drug') || lower.includes('prescription')) {
            return `💊 <strong>Pharmacy Services</strong><br><br>
                Our hospital pharmacy provides:<br>
                • Prescription dispensing<br>
                • Medicine availability check<br>
                • Refill requests<br>
                • Medication counseling<br><br>
                The pharmacy is open 8:00 AM - 8:00 PM daily.`;
        }
        
        // Insurance
        if (lower.includes('insurance') || lower.includes('payment') || lower.includes('cost') || lower.includes('price')) {
            return `💳 <strong>Insurance & Payments</strong><br><br>
                We accept:<br>
                • Most major insurance providers<br>
                • Cash payments<br>
                • Credit/Debit cards<br>
                • Mobile money<br><br>
                Please visit our billing office or <a href="contact.html">contact us</a> for more information.`;
        }
        
        // Careers
        if (lower.includes('job') || lower.includes('career') || lower.includes('apply') || lower.includes('work')) {
            return `💼 <strong>Careers at Gimbie Hospital</strong><br><br>
                We're always looking for talented professionals to join our team.<br><br>
                Current openings:<br>
                • Doctors (Various Specialties)<br>
                • Nurses<br>
                • Laboratory Technicians<br>
                • Pharmacists<br>
                • Administrative Staff<br><br>
                Visit our <a href="careers.html">Careers page</a> to view all openings and apply.`;
        }
        
        // Hospital info
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
        
        // Default response
        return `Thank you for your question! I'm here to help.<br><br>
            I can assist you with information about:<br>
            • Departments and services<br>
            • Booking appointments<br>
            • Doctors and specialists<br>
            • Visiting hours<br>
            • Laboratory and pharmacy services<br>
            • Insurance and billing<br>
            • Career opportunities<br>
            • Emergency services<br><br>
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
        
        grid.innerHTML = departments.map(dept => `
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
            const key = el.closest('.stat-item')?.querySelector('.stat-label')?.textContent?.toLowerCase();
            if (key) {
                const value = stats[key.replace(/\s/g, '')] || stats[key] || 0;
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
        font-family: var(--font-secondary);
        font-weight: 500;
        z-index: 9999;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        background: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff6b6b' : type === 'warning' ? '#f7b731' : '#4a9eff'};
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
