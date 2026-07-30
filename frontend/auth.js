// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// FRONTEND AUTHENTICATION HELPER
// ============================================

import api from './api.js';

class AuthManager {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = [];
    this.initialized = false;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async init() {
    if (this.initialized) return;
    
    this.initialized = true;
    const token = localStorage.getItem('authToken');
    
    if (token) {
      try {
        this.user = await api.getCurrentUser();
        this.isAuthenticated = true;
        this.notifyListeners();
      } catch (error) {
        console.error('Auth initialization failed:', error);
        this.logout();
      }
    }
  }

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  async login(credentials) {
    try {
      const response = await api.login(credentials);
      this.user = response.user;
      this.isAuthenticated = true;
      this.notifyListeners();
      
      // Store user in localStorage for quick access
      localStorage.setItem('user', JSON.stringify(this.user));
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await api.register(userData);
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.user = null;
      this.isAuthenticated = false;
      localStorage.removeItem('user');
      this.notifyListeners();
    }
  }

  async forgotPassword(email) {
    return api.forgotPassword(email);
  }

  async resetPassword(token, newPassword) {
    return api.resetPassword(token, newPassword);
  }

  async changePassword(currentPassword, newPassword) {
    return api.changePassword(currentPassword, newPassword);
  }

  async verifyEmail(token) {
    return api.verifyEmail(token);
  }

  // ============================================
  // USER INFORMATION
  // ============================================

  getUser() {
    if (this.user) return this.user;
    
    // Try to get from localStorage
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        this.user = JSON.parse(stored);
        return this.user;
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
      }
    }
    return null;
  }

  getUserId() {
    const user = this.getUser();
    return user ? user.id : null;
  }

  getUserRole() {
    const user = this.getUser();
    return user ? user.role : null;
  }

  getUserFullName() {
    const user = this.getUser();
    return user ? user.fullName : null;
  }

  getUserEmail() {
    const user = this.getUser();
    return user ? user.email : null;
  }

  getUserPhone() {
    const user = this.getUser();
    return user ? user.phone : null;
  }

  getProfileImage() {
    const user = this.getUser();
    return user ? user.profileImage : null;
  }

  // ============================================
  // PERMISSION CHECKS
  // ============================================

  isAuthenticated() {
    return this.isAuthenticated && !!this.getUser();
  }

  hasRole(role) {
    const userRole = this.getUserRole();
    if (!userRole) return false;
    return userRole === role;
  }

  hasAnyRole(roles) {
    const userRole = this.getUserRole();
    if (!userRole) return false;
    return roles.includes(userRole);
  }

  isSuperAdmin() {
    return this.hasRole('super-admin');
  }

  isAdmin() {
    return this.hasAnyRole(['admin', 'super-admin']);
  }

  isDoctor() {
    return this.hasRole('doctor');
  }

  isPatient() {
    return this.hasRole('patient');
  }

  isNurse() {
    return this.hasRole('nurse');
  }

  isPharmacist() {
    return this.hasRole('pharmacist');
  }

  isLaboratory() {
    return this.hasRole('laboratory');
  }

  isRadiologist() {
    return this.hasRole('radiologist');
  }

  isReceptionist() {
    return this.hasRole('receptionist');
  }

  isFinance() {
    return this.hasRole('finance');
  }

  isHR() {
    return this.hasRole('hr');
  }

  isAmbulance() {
    return this.hasRole('ambulance');
  }

  // ============================================
  // PERMISSION-BASED ACCESS
  // ============================================

  can(permission) {
    const user = this.getUser();
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super-admin') return true;
    
    // Check role-based permissions
    const rolePermissions = this.getRolePermissions(user.role);
    return rolePermissions.includes(permission) || rolePermissions.includes('*');
  }

  getRolePermissions(role) {
    const permissions = {
      'super-admin': ['*'],
      'admin': [
        'manage_users', 'manage_patients', 'manage_appointments', 
        'manage_finance', 'view_reports', 'manage_settings',
        'manage_staff', 'manage_inventory', 'manage_website'
      ],
      'doctor': [
        'view_patients', 'create_prescription', 'view_appointments',
        'view_lab_results', 'request_lab_tests', 'view_patient_history'
      ],
      'nurse': [
        'view_patients', 'record_vitals', 'view_medications',
        'administer_medications', 'view_nursing_notes'
      ],
      'pharmacist': [
        'view_prescriptions', 'verify_prescriptions', 'dispense_medications',
        'manage_inventory', 'view_medicines'
      ],
      'laboratory': [
        'view_lab_requests', 'process_lab_tests', 'enter_lab_results',
        'view_equipment', 'view_quality_controls'
      ],
      'radiologist': [
        'view_radiology_requests', 'perform_imaging', 'view_pacs',
        'write_radiology_reports'
      ],
      'receptionist': [
        'register_patients', 'book_appointments', 'check_in_patients',
        'manage_queue', 'print_patient_cards'
      ],
      'finance': [
        'view_invoices', 'create_invoices', 'process_payments',
        'view_revenue', 'generate_financial_reports'
      ],
      'hr': [
        'view_staff', 'manage_staff', 'view_attendance',
        'manage_payroll', 'process_leave_requests'
      ],
      'ambulance': [
        'view_emergency_requests', 'dispatch_ambulance', 'view_trip_history',
        'update_ambulance_status'
      ],
      'patient': [
        'view_own_profile', 'view_own_appointments', 'book_appointment',
        'view_own_prescriptions', 'view_own_lab_results', 'view_own_invoices'
      ]
    };
    return permissions[role] || [];
  }

  // ============================================
  // UI HELPERS
  // ============================================

  getDashboardRoute() {
    const role = this.getUserRole();
    const routes = {
      'super-admin': '/super-admin-dashboard.html',
      'admin': '/admin-dashboard.html',
      'doctor': '/doctor-dashboard.html',
      'nurse': '/nurse-dashboard.html',
      'pharmacist': '/pharmacist-dashboard.html',
      'laboratory': '/laboratory-dashboard.html',
      'radiologist': '/radiology-dashboard.html',
      'receptionist': '/receptionist-dashboard.html',
      'finance': '/finance-dashboard.html',
      'hr': '/hr-dashboard.html',
      'ambulance': '/ambulance-dashboard.html',
      'patient': '/patient-dashboard.html'
    };
    return routes[role] || '/index.html';
  }

  getLoginRoute() {
    const role = this.getUserRole();
    const routes = {
      'super-admin': '/super-admin-login.html',
      'admin': '/admin-login.html',
      'doctor': '/doctor-login.html',
      'nurse': '/nurse-login.html',
      'pharmacist': '/pharmacist-login.html',
      'laboratory': '/laboratory-login.html',
      'radiologist': '/radiology-login.html',
      'receptionist': '/receptionist-login.html',
      'finance': '/finance-login.html',
      'hr': '/hr-login.html',
      'ambulance': '/ambulance-login.html',
      'patient': '/patient-login.html'
    };
    return routes[role] || '/patient-login.html';
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.user, this.isAuthenticated);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  // ============================================
  // REDIRECT HELPERS
  // ============================================

  redirectToDashboard() {
    const route = this.getDashboardRoute();
    window.location.href = route;
  }

  redirectToLogin() {
    const route = this.getLoginRoute();
    window.location.href = route;
  }

  redirectToHome() {
    window.location.href = '/index.html';
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  checkSession() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.logout();
      return false;
    }
    
    // Check token expiry
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token check failed:', error);
      this.logout();
      return false;
    }
    
    return true;
  }

  refreshUser() {
    return api.getCurrentUser()
      .then(user => {
        this.user = user;
        this.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(user));
        this.notifyListeners();
        return user;
      })
      .catch(error => {
        console.error('Failed to refresh user:', error);
        this.logout();
        throw error;
      });
  }
}

// ============================================
// CREATE SINGLETON INSTANCE
// ============================================

const auth = new AuthManager();

// Initialize on load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    auth.init();
  });
}

export default auth;
