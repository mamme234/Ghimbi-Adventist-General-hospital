// ============ API Configuration ============
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'https://ghimbi-adventist-general-hospital.onrender.com/api';

const API = {
    auth: {
        login: `${API_BASE_URL}/auth/login`,
        register: `${API_BASE_URL}/auth/register`,
        refresh: `${API_BASE_URL}/auth/refresh`,
        logout: `${API_BASE_URL}/auth/logout`,
        me: `${API_BASE_URL}/auth/me`,
        profile: `${API_BASE_URL}/auth/profile`,
        changePassword: `${API_BASE_URL}/auth/change-password`
    },
    patients: {
        register: `${API_BASE_URL}/patients/register`,
        search: `${API_BASE_URL}/patients/search`,
        get: (id) => `${API_BASE_URL}/patients/${id}`
    },
    departments: `${API_BASE_URL}/departments`,
    doctors: `${API_BASE_URL}/doctors`,
    appointments: {
        create: `${API_BASE_URL}/appointments`,
        getAll: `${API_BASE_URL}/appointments`,
        update: (id) => `${API_BASE_URL}/appointments/${id}`
    },
    statistics: `${API_BASE_URL}/statistics`,
    news: `${API_BASE_URL}/news`,
    gallery: `${API_BASE_URL}/gallery`,
    admin: {
        users: `${API_BASE_URL}/admin/users`,
        updateUserStatus: (id) => `${API_BASE_URL}/admin/users/${id}/status`,
        auditLogs: `${API_BASE_URL}/admin/audit-logs`,
        departments: `${API_BASE_URL}/admin/departments`,
        news: `${API_BASE_URL}/admin/news`,
        gallery: `${API_BASE_URL}/admin/gallery`,
        statistics: `${API_BASE_URL}/admin/statistics`,
        dashboard: `${API_BASE_URL}/admin/dashboard`
    },
    dashboard: {
        patient: `${API_BASE_URL}/dashboard/patient`,
        admin: `${API_BASE_URL}/admin/dashboard`,
        doctor: `${API_BASE_URL}/dashboard/doctor`
    }
};

// ============ API Request Helper ============
class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
        this.refreshToken = localStorage.getItem('refreshToken');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers,
            credentials: 'include'
        };

        try {
            const response = await fetch(endpoint, config);
            const data = await response.json();

            if (response.status === 401 && this.refreshToken) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${this.token}`;
                    const retryResponse = await fetch(endpoint, {
                        ...config,
                        headers
                    });
                    return await retryResponse.json();
                }
            }

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch(API.auth.refresh, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
            const data = await response.json();
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', data.token);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    setRefreshToken(refreshToken) {
        this.refreshToken = refreshToken;
        localStorage.setItem('refreshToken', refreshToken);
    }

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }

    // Auth Methods
    async login(email, password) {
        const data = await this.request(API.auth.login, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.token) {
            this.setToken(data.token);
            this.setRefreshToken(data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    }

    async register(userData) {
        return this.request(API.auth.register, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async logout() {
        try {
            await this.request(API.auth.logout, { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        this.clearTokens();
        window.location.href = '/index.html';
    }

    async getMe() {
        return this.request(API.auth.me);
    }

    async updateProfile(data) {
        return this.request(API.auth.profile, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async changePassword(currentPassword, newPassword) {
        return this.request(API.auth.changePassword, {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // Public Methods
    async getDepartments() {
        return this.request(API.departments);
    }

    async getDoctors(params = '') {
        return this.request(`${API.doctors}${params}`);
    }

    async getNews(params = '') {
        return this.request(`${API.news}${params}`);
    }

    async getGallery(params = '') {
        return this.request(`${API.gallery}${params}`);
    }

    async getStatistics() {
        return this.request(API.statistics);
    }
}

// ============ Export ============
const api = new ApiService();
window.api = api;

// ============ Helper Functions ============
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

function isAuthenticated() {
    return !!localStorage.getItem('token');
}

function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

function hasRole(role) {
    return getUserRole() === role;
}

window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.getUserRole = getUserRole;
window.hasRole = hasRole;
