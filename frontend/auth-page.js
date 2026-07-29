// ============ Auth Page JavaScript ============

document.addEventListener('DOMContentLoaded', function() {
    // Setup tab switching
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = {
        login: document.getElementById('loginForm'),
        register: document.getElementById('registerForm')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Update forms
            const tabName = this.dataset.tab;
            Object.keys(forms).forEach(key => {
                forms[key].classList.remove('active');
            });
            forms[tabName].classList.add('active');
        });
    });

    // Check for register param in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('register') === 'true') {
        // Switch to register tab
        const registerTab = document.querySelector('.auth-tab[data-tab="register"]');
        if (registerTab) {
            registerTab.click();
        }
    }

    // Check if user is already logged in
    if (auth.checkAuth()) {
        const user = auth.getUser();
        if (user) {
            window.location.href = auth.getDashboardUrl();
        }
    }
});

// ============ Toggle Password Visibility ============
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
