// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// FRONTEND API CLIENT
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://ghimbi-adventist-general-hospital.onrender.com/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'https://ghimbi-adventist-general-hospital.onrender.com';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE;
    this.wsURL = WS_URL;
    this.token = localStorage.getItem('authToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.socket = null;
    this.listeners = {};
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  setRefreshToken(token) {
    this.refreshToken = token;
    if (token) {
      localStorage.setItem('refreshToken', token);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  getFormDataHeaders() {
    const headers = {
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ============================================
  // REQUEST METHODS
  // ============================================

  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = options.isFormData ? this.getFormDataHeaders() : this.getHeaders();
    
    const config = {
      method,
      headers,
      ...options,
    };

    if (data) {
      if (options.isFormData) {
        config.body = data;
      } else {
        config.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(url, config);
      
      // Handle token refresh
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          config.headers['Authorization'] = `Bearer ${this.token}`;
          const retryResponse = await fetch(url, config);
          return this.handleResponse(retryResponse);
        } else {
          // Redirect to login
          this.logout();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.message || 'Something went wrong');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  }

  // ============================================
  // TOKEN REFRESH
  // ============================================

  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.token);
        this.setRefreshToken(data.refreshToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // ============================================
  // AUTH ENDPOINTS
  // ============================================

  async register(userData) {
    return this.request('POST', '/auth/register', userData);
  }

  async login(credentials) {
    const response = await this.request('POST', '/auth/login', credentials);
    if (response.token) {
      this.setToken(response.token);
      this.setRefreshToken(response.refreshToken);
    }
    return response;
  }

  async logout() {
    try {
      await this.request('POST', '/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setToken(null);
      this.setRefreshToken(null);
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    }
  }

  async forgotPassword(email) {
    return this.request('POST', '/auth/forgot-password', { email });
  }

  async resetPassword(token, newPassword) {
    return this.request('POST', '/auth/reset-password', { token, newPassword });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('POST', '/auth/change-password', { currentPassword, newPassword });
  }

  async verifyEmail(token) {
    return this.request('POST', '/auth/verify-email', { token });
  }

  async qrLogin(userId) {
    return this.request('POST', '/auth/qr-login', { userId });
  }

  async verify2FA(code) {
    return this.request('POST', '/auth/verify-2fa', { code });
  }

  async getCurrentUser() {
    return this.request('GET', '/auth/me');
  }

  // ============================================
  // PATIENT ENDPOINTS
  // ============================================

  async getPatients(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/patients?${query}`);
  }

  async getPatient(id) {
    return this.request('GET', `/patients/${id}`);
  }

  async createPatient(data) {
    return this.request('POST', '/patients', data);
  }

  async updatePatient(id, data) {
    return this.request('PUT', `/patients/${id}`, data);
  }

  async deletePatient(id) {
    return this.request('DELETE', `/patients/${id}`);
  }

  async searchPatients(query) {
    return this.request('GET', `/patients/search?q=${encodeURIComponent(query)}`);
  }

  async getPatientByMRN(mrn) {
    return this.request('GET', `/patients/mrn/${mrn}`);
  }

  async getPatientByQR(qrCode) {
    return this.request('GET', `/patients/qr/${qrCode}`);
  }

  // ============================================
  // DOCTOR ENDPOINTS
  // ============================================

  async getDoctors(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/doctors?${query}`);
  }

  async getDoctor(id) {
    return this.request('GET', `/doctors/${id}`);
  }

  async createDoctor(data) {
    return this.request('POST', '/doctors', data);
  }

  async updateDoctor(id, data) {
    return this.request('PUT', `/doctors/${id}`, data);
  }

  async deleteDoctor(id) {
    return this.request('DELETE', `/doctors/${id}`);
  }

  async getDoctorAppointments(doctorId) {
    return this.request('GET', `/doctors/${doctorId}/appointments`);
  }

  async getDoctorPatients(doctorId) {
    return this.request('GET', `/doctors/${doctorId}/patients`);
  }

  // ============================================
  // APPOINTMENT ENDPOINTS
  // ============================================

  async getAppointments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/appointments?${query}`);
  }

  async getAppointment(id) {
    return this.request('GET', `/appointments/${id}`);
  }

  async createAppointment(data) {
    return this.request('POST', '/appointments', data);
  }

  async updateAppointment(id, data) {
    return this.request('PUT', `/appointments/${id}`, data);
  }

  async cancelAppointment(id, reason) {
    return this.request('PATCH', `/appointments/${id}/cancel`, { reason });
  }

  async confirmAppointment(id) {
    return this.request('PATCH', `/appointments/${id}/confirm`);
  }

  async rescheduleAppointment(id, data) {
    return this.request('PATCH', `/appointments/${id}/reschedule`, data);
  }

  async getAppointmentsByPatient(patientId) {
    return this.request('GET', `/appointments/patient/${patientId}`);
  }

  async getAppointmentsByDoctor(doctorId) {
    return this.request('GET', `/appointments/doctor/${doctorId}`);
  }

  // ============================================
  // PRESCRIPTION ENDPOINTS
  // ============================================

  async getPrescriptions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/prescriptions?${query}`);
  }

  async getPrescription(id) {
    return this.request('GET', `/prescriptions/${id}`);
  }

  async createPrescription(data) {
    return this.request('POST', '/prescriptions', data);
  }

  async updatePrescription(id, data) {
    return this.request('PUT', `/prescriptions/${id}`, data);
  }

  async verifyPrescription(id) {
    return this.request('PATCH', `/prescriptions/${id}/verify`);
  }

  async dispensePrescription(id) {
    return this.request('PATCH', `/prescriptions/${id}/dispense`);
  }

  // ============================================
  // MEDICINE ENDPOINTS
  // ============================================

  async getMedicines(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/medicines?${query}`);
  }

  async getMedicine(id) {
    return this.request('GET', `/medicines/${id}`);
  }

  async createMedicine(data) {
    return this.request('POST', '/medicines', data);
  }

  async updateMedicine(id, data) {
    return this.request('PUT', `/medicines/${id}`, data);
  }

  async deleteMedicine(id) {
    return this.request('DELETE', `/medicines/${id}`);
  }

  async getInventory() {
    return this.request('GET', '/inventory');
  }

  async updateInventory(id, data) {
    return this.request('PATCH', `/inventory/${id}`, data);
  }

  async getLowStockMedicines() {
    return this.request('GET', '/inventory/low-stock');
  }

  // ============================================
  // LABORATORY ENDPOINTS
  // ============================================

  async getLabTests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/lab-tests?${query}`);
  }

  async getLabTest(id) {
    return this.request('GET', `/lab-tests/${id}`);
  }

  async createLabTest(data) {
    return this.request('POST', '/lab-tests', data);
  }

  async updateLabTest(id, data) {
    return this.request('PUT', `/lab-tests/${id}`, data);
  }

  async processLabTest(id, data) {
    return this.request('PATCH', `/lab-tests/${id}/process`, data);
  }

  async getLabResults(id) {
    return this.request('GET', `/lab-tests/${id}/results`);
  }

  // ============================================
  // RADIOLOGY ENDPOINTS
  // ============================================

  async getRadiologyTests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/radiology-tests?${query}`);
  }

  async getRadiologyTest(id) {
    return this.request('GET', `/radiology-tests/${id}`);
  }

  async createRadiologyTest(data) {
    return this.request('POST', '/radiology-tests', data);
  }

  async updateRadiologyTest(id, data) {
    return this.request('PUT', `/radiology-tests/${id}`, data);
  }

  async getRadiologyResults(id) {
    return this.request('GET', `/radiology-tests/${id}/results`);
  }

  // ============================================
  // FINANCE ENDPOINTS
  // ============================================

  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/invoices?${query}`);
  }

  async getInvoice(id) {
    return this.request('GET', `/invoices/${id}`);
  }

  async createInvoice(data) {
    return this.request('POST', '/invoices', data);
  }

  async updateInvoice(id, data) {
    return this.request('PUT', `/invoices/${id}`, data);
  }

  async processPayment(data) {
    return this.request('POST', '/payments', data);
  }

  async getRevenue() {
    return this.request('GET', '/revenue');
  }

  // ============================================
  // HR ENDPOINTS
  // ============================================

  async getStaff(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/staff?${query}`);
  }

  async getStaffMember(id) {
    return this.request('GET', `/staff/${id}`);
  }

  async createStaff(data) {
    return this.request('POST', '/staff', data);
  }

  async updateStaff(id, data) {
    return this.request('PUT', `/staff/${id}`, data);
  }

  async deleteStaff(id) {
    return this.request('DELETE', `/staff/${id}`);
  }

  async getAttendance(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/attendance?${query}`);
  }

  async markAttendance(data) {
    return this.request('POST', '/attendance', data);
  }

  async getPayroll() {
    return this.request('GET', '/payroll');
  }

  // ============================================
  // AMBULANCE ENDPOINTS
  // ============================================

  async getAmbulanceRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/ambulance?${query}`);
  }

  async getAmbulanceRequest(id) {
    return this.request('GET', `/ambulance/${id}`);
  }

  async createAmbulanceRequest(data) {
    return this.request('POST', '/ambulance', data);
  }

  async updateAmbulanceStatus(id, status) {
    return this.request('PATCH', `/ambulance/${id}/status`, { status });
  }

  async dispatchAmbulance(id, data) {
    return this.request('PATCH', `/ambulance/${id}/dispatch`, data);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  async getDashboardStats() {
    return this.request('GET', '/admin/stats');
  }

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/admin/audit?${query}`);
  }

  async getSystemSettings() {
    return this.request('GET', '/admin/settings');
  }

  async updateSystemSettings(data) {
    return this.request('PUT', '/admin/settings', data);
  }

  async backupDatabase() {
    return this.request('POST', '/admin/backup');
  }

  async restoreDatabase(data) {
    return this.request('POST', '/admin/restore', data);
  }

  // ============================================
  // REPORT ENDPOINTS
  // ============================================

  async generateReport(data) {
    return this.request('POST', '/reports/generate', data);
  }

  async exportReport(id, format = 'pdf') {
    return this.request('GET', `/reports/export/${id}?format=${format}`);
  }

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================

  async getAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/analytics?${query}`);
  }

  async getMetrics() {
    return this.request('GET', '/analytics/metrics');
  }

  // ============================================
  // AI ENDPOINTS
  // ============================================

  async aiChat(message) {
    return this.request('POST', '/ai/chat', { message });
  }

  async aiSymptomCheck(symptoms) {
    return this.request('POST', '/ai/symptom-check', { symptoms });
  }

  async aiSummarize(data) {
    return this.request('POST', '/ai/summarize', data);
  }

  // ============================================
  // COMMUNICATION ENDPOINTS
  // ============================================

  async sendMessage(data) {
    return this.request('POST', '/messages', data);
  }

  async getMessages(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/messages?${query}`);
  }

  // ============================================
  // UPLOAD ENDPOINTS
  // ============================================

  async uploadFile(file, type = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return this.request('POST', '/upload', formData, { isFormData: true });
  }

  async deleteFile(id) {
    return this.request('DELETE', `/upload/${id}`);
  }

  // ============================================
  // SEARCH ENDPOINTS
  // ============================================

  async globalSearch(query) {
    return this.request('GET', `/search?q=${encodeURIComponent(query)}`);
  }

  // ============================================
  // WEBSITE PUBLIC ENDPOINTS
  // ============================================

  async getWebsiteDoctors(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/website/doctors?${query}`);
  }

  async getWebsiteDepartments() {
    return this.request('GET', '/website/departments');
  }

  async getWebsiteServices() {
    return this.request('GET', '/website/services');
  }

  async getWebsiteNews(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/website/news?${query}`);
  }

  async getWebsiteGallery(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/website/gallery?${query}`);
  }

  // ============================================
  // WEB SOCKET CONNECTION
  // ============================================

  connectWebSocket() {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.wsURL, {
      auth: { token: this.token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.emit('user_connected', { userId: this.getCurrentUserId() });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('notification', (data) => {
      this.trigger('notification', data);
    });

    this.socket.on('message', (data) => {
      this.trigger('message', data);
    });

    this.socket.on('appointment_update', (data) => {
      this.trigger('appointment_update', data);
    });

    this.socket.on('emergency_alert', (data) => {
      this.trigger('emergency_alert', data);
    });

    return this.socket;
  }

  disconnectWebSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getCurrentUserId() {
    const user = this.getCurrentUserFromToken();
    return user ? user.id : null;
  }

  getCurrentUserFromToken() {
    if (!this.token) return null;
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload;
    } catch (error) {
      return null;
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  hasRole(role) {
    const user = this.getCurrentUserFromToken();
    return user && user.role === role;
  }

  hasPermission(permission) {
    // This would need to check permissions from user data
    // For now, we'll use role-based checks
    const user = this.getCurrentUserFromToken();
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super-admin') return true;
    
    // Check role-based permissions
    const rolePermissions = this.getRolePermissions(user.role);
    return rolePermissions.includes(permission);
  }

  getRolePermissions(role) {
    // This would come from the server or a local mapping
    const permissions = {
      'super-admin': ['*'],
      'admin': ['manage_users', 'manage_patients', 'manage_appointments', 'manage_finance', 'view_reports'],
      'doctor': ['view_patients', 'create_prescription', 'view_appointments', 'view_lab_results'],
      'patient': ['view_own_profile', 'view_own_appointments', 'book_appointment'],
      // Add more roles as needed
    };
    return permissions[role] || [];
  }

  // ============================================
  // API HELPER FOR FORMDATA
  // ============================================

  async requestWithFormData(endpoint, formData, method = 'POST') {
    return this.request(method, endpoint, formData, { isFormData: true });
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async bulkCreatePatients(patients) {
    return this.request('POST', '/patients/bulk', { patients });
  }

  async bulkUpdateInventory(items) {
    return this.request('PATCH', '/inventory/bulk', { items });
  }

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  async exportToExcel(reportType, params = {}) {
    return this.request('GET', `/reports/export/${reportType}/excel?${new URLSearchParams(params).toString()}`);
  }

  async exportToPDF(reportType, params = {}) {
    return this.request('GET', `/reports/export/${reportType}/pdf?${new URLSearchParams(params).toString()}`);
  }
}

// ============================================
// CREATE AND EXPORT SINGLETON INSTANCE
// ============================================

const api = new ApiClient();

// Export for use in other files
export default api;

// Also export individual methods for convenience
export const {
  register,
  login,
  logout,
  getPatients,
  createPatient,
  getDoctors,
  getAppointments,
  createAppointment,
  getMedicines,
  createPrescription,
  // ... add more as needed
} = api;
