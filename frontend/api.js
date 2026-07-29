// ============ API Configuration ============
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'https://ghimbi-adventist-general-hospital.onrender.com/api';

const API = {
    // Auth
    auth: {
        login: `${API_BASE_URL}/auth/login`,
        register: `${API_BASE_URL}/auth/register`,
        refresh: `${API_BASE_URL}/auth/refresh`,
        logout: `${API_BASE_URL}/auth/logout`,
        me: `${API_BASE_URL}/auth/me`,
        profile: `${API_BASE_URL}/auth/profile`,
        changePassword: `${API_BASE_URL}/auth/change-password`
    },
    
    // Patients
    patients: {
        register: `${API_BASE_URL}/patients/register`,
        search: `${API_BASE_URL}/patients/search`,
        get: (id) => `${API_BASE_URL}/patients/${id}`
    },
    
    // Consultations
    consultations: {
        create: `${API_BASE_URL}/consultations`,
        getAll: `${API_BASE_URL}/consultations`,
        get: (id) => `${API_BASE_URL}/consultations/${id}`
    },
    
    // Laboratory
    laboratory: {
        create: `${API_BASE_URL}/laboratory`,
        getAll: `${API_BASE_URL}/laboratory`,
        update: (id) => `${API_BASE_URL}/laboratory/${id}`
    },
    
    // Prescriptions
    prescriptions: {
        create: `${API_BASE_URL}/prescriptions`,
        getAll: `${API_BASE_URL}/prescriptions`,
        get: (id) => `${API_BASE_URL}/prescriptions/${id}`
    },
    
    // Pharmacy
    pharmacy: {
        medicines: `${API_BASE_URL}/medicines`,
        createMedicine: `${API_BASE_URL}/medicines`,
        updateMedicine: (id) => `${API_BASE_URL}/medicines/${id}`,
        dispense: `${API_BASE_URL}/pharmacy/dispense`,
        dispenses: `${API_BASE_URL}/pharmacy/dispenses`
    },
    
    // Billing
    billing: {
        create: `${API_BASE_URL}/billing`,
        getAll: `${API_BASE_URL}/billing`,
        processPayment: (id) => `${API_BASE_URL}/billing/${id}/payment`
    },
    
    // Admissions
    admissions: {
        create: `${API_BASE_URL}/admissions`,
        getAll: `${API_BASE_URL}/admissions`,
        discharge: (id) => `${API_BASE_URL}/admissions/${id}/discharge`
    },
    
    // Appointments
    appointments: {
        create: `${API_BASE_URL}/appointments`,
        getAll: `${API_BASE_URL}/appointments`,
        update: (id) => `${API_BASE_URL}/appointments/${id}`
    },
    
    // Departments
    departments: `${API_BASE_URL}/departments`,
    
    // Doctors
    doctors: `${API_BASE_URL}/doctors`,
    
    // News
    news: `${API_BASE_URL}/news`,
    
    // Gallery
    gallery: `${API_BASE_URL}/gallery`,
    
    // Statistics
    statistics: `${API_BASE_URL}/statistics`,
    
    // Admin
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
    
    // Dashboard
    dashboard: {
        patient: `${API_BASE_URL}/dashboard/patient`,
        admin: `${API_BASE_URL}/admin/dashboard`
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
                // Try to refresh token
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry the request with new token
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

    // ============ Auth Methods ============
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

    // ============ Patient Methods ============
    async registerPatient(data) {
        return this.request(API.patients.register, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async searchPatients(query) {
        return this.request(`${API.patients.search}?query=${encodeURIComponent(query)}`);
    }

    async getPatient(id) {
        return this.request(API.patients.get(id));
    }

    // ============ Consultation Methods ============
    async createConsultation(data) {
        return this.request(API.consultations.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getConsultations(params = '') {
        return this.request(`${API.consultations.getAll}${params}`);
    }

    async getConsultation(id) {
        return this.request(API.consultations.get(id));
    }

    // ============ Laboratory Methods ============
    async createLabRequest(data) {
        return this.request(API.laboratory.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getLabRequests(params = '') {
        return this.request(`${API.laboratory.getAll}${params}`);
    }

    async updateLabRequest(id, data) {
        return this.request(API.laboratory.update(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // ============ Prescription Methods ============
    async createPrescription(data) {
        return this.request(API.prescriptions.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getPrescriptions(params = '') {
        return this.request(`${API.prescriptions.getAll}${params}`);
    }

    async getPrescription(id) {
        return this.request(API.prescriptions.get(id));
    }

    // ============ Pharmacy Methods ============
    async getMedicines(params = '') {
        return this.request(`${API.pharmacy.medicines}${params}`);
    }

    async createMedicine(data) {
        return this.request(API.pharmacy.createMedicine, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateMedicine(id, data) {
        return this.request(API.pharmacy.updateMedicine(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async dispenseMedicine(data) {
        return this.request(API.pharmacy.dispense, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getDispenses(params = '') {
        return this.request(`${API.pharmacy.dispenses}${params}`);
    }

    // ============ Billing Methods ============
    async createBill(data) {
        return this.request(API.billing.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getBills(params = '') {
        return this.request(`${API.billing.getAll}${params}`);
    }

    async processPayment(id, data) {
        return this.request(API.billing.processPayment(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // ============ Admission Methods ============
    async admitPatient(data) {
        return this.request(API.admissions.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getAdmissions(params = '') {
        return this.request(`${API.admissions.getAll}${params}`);
    }

    async dischargePatient(id, data) {
        return this.request(API.admissions.discharge(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // ============ Appointment Methods ============
    async createAppointment(data) {
        return this.request(API.appointments.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getAppointments(params = '') {
        return this.request(`${API.appointments.getAll}${params}`);
    }

    async updateAppointment(id, data) {
        return this.request(API.appointments.update(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // ============ Public Methods ============
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

    // ============ Admin Methods ============
    async getUsers(params = '') {
        return this.request(`${API.admin.users}${params}`);
    }

    async updateUserStatus(id, data) {
        return this.request(API.admin.updateUserStatus(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getAuditLogs(params = '') {
        return this.request(`${API.admin.auditLogs}${params}`);
    }

    async createDepartment(data) {
        return this.request(API.admin.departments, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateDepartment(id, data) {
        return this.request(`${API.admin.departments}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async createNews(data) {
        return this.request(API.admin.news, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async createGallery(data) {
        return this.request(API.admin.gallery, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getAdminDashboard() {
        return this.request(API.dashboard.admin);
    }

    async getPatientDashboard() {
        return this.request(API.dashboard.patient);
    }
}

// ============ Export ============
const api = new ApiService();

// Make api globally available
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

function isAdmin() {
    return hasRole('admin');
}

function isDoctor() {
    return hasRole('doctor');
}

function isPatient() {
    return hasRole('patient');
}

function isReception() {
    return hasRole('reception');
}

function isLaboratory() {
    return hasRole('laboratory');
}

function isPharmacy() {
    return hasRole('pharmacy');
}

function isFinance() {
    return hasRole('finance');
}

function isNurse() {
    return hasRole('nurse');
}

// ============ Export Helper Functions ============
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.getUserRole = getUserRole;
window.hasRole = hasRole;
window.isAdmin = isAdmin;
window.isDoctor = isDoctor;
window.isPatient = isPatient;
window.isReception = isReception;
window.isLaboratory = isLaboratory;
window.isPharmacy = isPharmacy;
window.isFinance = isFinance;
window.isNurse = isNurse;
