// ============ API Configuration ============

// ✅ USE THIS URL - Your Render backend is working!
const API_BASE_URL = 'https://ghimbi-adventist-general-hospital.onrender.com/api';

// ❌ DO NOT use localhost in production
// const API_BASE_URL = 'http://localhost:5000/api';

console.log('📡 API Base URL:', API_BASE_URL);

// ============ REST OF YOUR API CONFIGURATION ============
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
    departments: `${API_BASE_URL}/departments`,
    doctors: `${API_BASE_URL}/doctors`,
    statistics: `${API_BASE_URL}/statistics`,
    news: `${API_BASE_URL}/news`,
    gallery: `${API_BASE_URL}/gallery`,
    patients: {
        register: `${API_BASE_URL}/patients/register`,
        search: `${API_BASE_URL}/patients/search`,
        get: (id) => `${API_BASE_URL}/patients/${id}`
    },
    appointments: {
        create: `${API_BASE_URL}/appointments`,
        getAll: `${API_BASE_URL}/appointments`,
        update: (id) => `${API_BASE_URL}/appointments/${id}`
    },
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
    },
    laboratory: {
        create: `${API_BASE_URL}/laboratory`,
        getAll: `${API_BASE_URL}/laboratory`,
        update: (id) => `${API_BASE_URL}/laboratory/${id}`
    },
    pharmacy: {
        medicines: `${API_BASE_URL}/medicines`,
        createMedicine: `${API_BASE_URL}/medicines`,
        updateMedicine: (id) => `${API_BASE_URL}/medicines/${id}`,
        dispense: `${API_BASE_URL}/pharmacy/dispense`,
        dispenses: `${API_BASE_URL}/pharmacy/dispenses`
    },
    billing: {
        create: `${API_BASE_URL}/billing`,
        getAll: `${API_BASE_URL}/billing`,
        processPayment: (id) => `${API_BASE_URL}/billing/${id}/payment`
    },
    admissions: {
        create: `${API_BASE_URL}/admissions`,
        getAll: `${API_BASE_URL}/admissions`,
        discharge: (id) => `${API_BASE_URL}/admissions/${id}/discharge`
    },
    prescriptions: {
        create: `${API_BASE_URL}/prescriptions`,
        getAll: `${API_BASE_URL}/prescriptions`,
        get: (id) => `${API_BASE_URL}/prescriptions/${id}`
    },
    consultations: {
        create: `${API_BASE_URL}/consultations`,
        getAll: `${API_BASE_URL}/consultations`,
        get: (id) => `${API_BASE_URL}/consultations/${id}`
    },
    careers: {
        getAll: `${API_BASE_URL}/careers`,
        create: `${API_BASE_URL}/careers`,
        apply: (id) => `${API_BASE_URL}/careers/${id}/apply`
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
            console.log('📡 API Request:', endpoint);
            const response = await fetch(endpoint, config);
            
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            throw error;
        }
    }

    // ============ Auth Methods ============
    async login(identifier, password) {
        try {
            console.log('🔑 Attempting login for:', identifier);
            const data = await this.request(API.auth.login, {
                method: 'POST',
                body: JSON.stringify({ email: identifier, password })
            });
            if (data.token) {
                this.token = data.token;
                localStorage.setItem('token', data.token);
                if (data.refreshToken) {
                    this.refreshToken = data.refreshToken;
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('✅ Login successful');
            }
            return data;
        } catch (error) {
            console.error('❌ Login error:', error.message);
            throw error;
        }
    }

    async register(userData) {
        try {
            console.log('📝 Attempting registration for:', userData.email);
            const data = await this.request(API.auth.register, {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            if (data.token) {
                this.token = data.token;
                localStorage.setItem('token', data.token);
                if (data.refreshToken) {
                    this.refreshToken = data.refreshToken;
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('✅ Registration successful');
            }
            return data;
        } catch (error) {
            console.error('❌ Registration error:', error.message);
            throw error;
        }
    }

    async logout() {
        try {
            await this.request(API.auth.logout, { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        this.token = null;
        this.refreshToken = null;
        window.location.href = '/index.html';
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

    // ============ Career Methods ============
    async getCareers(params = '') {
        return this.request(`${API.careers.getAll}${params}`);
    }

    async createCareer(data) {
        return this.request(API.careers.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async applyForJob(id, data) {
        return this.request(API.careers.apply(id), {
            method: 'POST',
            body: JSON.stringify(data)
        });
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
