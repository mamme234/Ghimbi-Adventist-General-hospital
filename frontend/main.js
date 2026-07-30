// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// FRONTEND MAIN APPLICATION
// ============================================

import api from './api.js';
import auth from './auth.js';
import ui from './ui.js';
import notifications from './notifications.js';
import theme from './theme.js';
import search from './search.js';

class App {
  constructor() {
    this.initialized = false;
    this.currentPage = this.getCurrentPage();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async init() {
    if (this.initialized) return;

    try {
      // Initialize auth
      await auth.init();
      
      // Initialize UI
      ui.init();
      
      // Initialize theme
      theme.init();
      
      // Initialize notifications
      notifications.init();
      
      // Initialize search
      search.init();
      
      // Setup WebSocket connection
      this.setupWebSocket();
      
      // Setup page-specific logic
      this.setupPageLogic();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('App initialized successfully');
      
      // Dispatch event
      document.dispatchEvent(new CustomEvent('app:ready'));
    } catch (error) {
      console.error('App initialization failed:', error);
      ui.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  // ============================================
  // WEB SOCKET SETUP
  // ============================================

  setupWebSocket() {
    if (!auth.isAuthenticated()) return;
    
    const socket = api.connectWebSocket();
    
    // Handle notifications
    api.on('notification', (data) => {
      notifications.show(data);
    });
    
    // Handle messages
    api.on('message', (data) => {
      notifications.showMessage(data);
    });
    
    // Handle appointment updates
    api.on('appointment_update', (data) => {
      ui.updateAppointment(data);
      notifications.show({
        title: 'Appointment Update',
        message: data.message,
        type: 'info',
      });
    });
    
    // Handle emergency alerts
    api.on('emergency_alert', (data) => {
      notifications.showEmergencyAlert(data);
    });
  }

  // ============================================
  // PAGE LOGIC
  // ============================================

  getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    return page.replace('.html', '');
  }

  setupPageLogic() {
    const page = this.currentPage;
    
    switch (page) {
      case 'index':
      case 'home':
        this.setupHomePage();
        break;
      case 'patient-dashboard':
        this.setupPatientDashboard();
        break;
      case 'doctor-dashboard':
        this.setupDoctorDashboard();
        break;
      case 'admin-dashboard':
        this.setupAdminDashboard();
        break;
      case 'appointments':
        this.setupAppointmentsPage();
        break;
      case 'patients':
        this.setupPatientsPage();
        break;
      case 'doctors':
        this.setupDoctorsPage();
        break;
      case 'pharmacy':
        this.setupPharmacyPage();
        break;
      case 'laboratory':
        this.setupLaboratoryPage();
        break;
      case 'radiology':
        this.setupRadiologyPage();
        break;
      case 'finance':
        this.setupFinancePage();
        break;
      case 'hr':
        this.setupHRPage();
        break;
      case 'ambulance':
        this.setupAmbulancePage();
        break;
      default:
        // Generic page setup
        break;
    }
  }

  // ============================================
  // PAGE SETUP FUNCTIONS
  // ============================================

  setupHomePage() {
    // Load featured doctors
    this.loadFeaturedDoctors();
    
    // Load latest news
    this.loadLatestNews();
    
    // Load departments
    this.loadDepartments();
  }

  async loadFeaturedDoctors() {
    try {
      const response = await api.getDoctors({ limit: 6, isAvailable: true });
      const doctors = response.data;
      const container = document.getElementById('featured-doctors');
      if (container) {
        container.innerHTML = doctors.map(doctor => `
          <div class="doctor-card">
            <img src="${doctor.userId?.profileImage || '/assets/default-doctor.png'}" alt="${doctor.userId?.fullName}">
            <h3>${doctor.userId?.fullName}</h3>
            <p>${doctor.specialization}</p>
            <div class="rating">⭐ ${doctor.rating || 0}/5</div>
            <a href="/doctor.html?id=${doctor.doctorId}" class="btn btn-primary">View Profile</a>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load featured doctors:', error);
    }
  }

  async loadLatestNews() {
    try {
      const response = await api.getWebsiteNews({ limit: 3 });
      const news = response.data;
      const container = document.getElementById('latest-news');
      if (container) {
        container.innerHTML = news.map(item => `
          <div class="news-card">
            <h4>${item.title}</h4>
            <p>${item.summary}</p>
            <span class="date">${new Date(item.createdAt).toLocaleDateString()}</span>
            <a href="/article.html?id=${item.id}">Read More</a>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load latest news:', error);
    }
  }

  async loadDepartments() {
    try {
      const response = await api.getWebsiteDepartments();
      const departments = response.data;
      const container = document.getElementById('departments');
      if (container) {
        container.innerHTML = departments.map(dept => `
          <div class="department-card">
            <div class="icon">${dept.icon}</div>
            <h4>${dept.name}</h4>
            <p>${dept.description}</p>
            <a href="/department.html?id=${dept.id}">Learn More</a>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  }

  // ============================================
  // DASHBOARD SETUP
  // ============================================

  async setupPatientDashboard() {
    if (!auth.isPatient()) {
      window.location.href = '/login.html';
      return;
    }

    try {
      // Load patient profile
      const user = auth.getUser();
      const patient = await api.getPatientByMRN(user.mrn);
      
      // Load appointments
      const appointments = await api.getAppointmentsByPatient(patient.data._id);
      
      // Load prescriptions
      const prescriptions = await api.getPrescriptions({ patientId: patient.data._id });
      
      // Load lab results
      const labResults = await api.getLabTests({ patientId: patient.data._id });
      
      // Update dashboard UI
      this.updatePatientDashboard(patient.data, appointments.data, prescriptions.data, labResults.data);
    } catch (error) {
      console.error('Failed to load patient dashboard:', error);
      ui.showError('Failed to load dashboard data');
    }
  }

  updatePatientDashboard(patient, appointments, prescriptions, labResults) {
    // Update stats
    document.getElementById('total-appointments').textContent = appointments.length;
    document.getElementById('upcoming-appointments').textContent = 
      appointments.filter(a => a.status === 'confirmed').length;
    document.getElementById('total-prescriptions').textContent = prescriptions.length;
    document.getElementById('lab-results').textContent = labResults.length;
    
    // Update appointments list
    const appointmentsContainer = document.getElementById('recent-appointments');
    if (appointmentsContainer) {
      appointmentsContainer.innerHTML = appointments.slice(0, 5).map(app => `
        <tr>
          <td>${new Date(app.date).toLocaleDateString()}</td>
          <td>${app.startTime}</td>
          <td>Dr. ${app.doctor.userId.fullName}</td>
          <td><span class="status ${app.status}">${app.status}</span></td>
          <td>
            <button onclick="viewAppointment('${app._id}')" class="btn btn-sm">View</button>
          </td>
        </tr>
      `).join('');
    }
  }

  async setupDoctorDashboard() {
    if (!auth.isDoctor()) {
      window.location.href = '/login.html';
      return;
    }

    try {
      const user = auth.getUser();
      const doctor = await api.getDoctor(user.doctorId);
      const appointments = await api.getDoctorAppointments(doctor.data.doctorId);
      
      this.updateDoctorDashboard(doctor.data, appointments.data);
    } catch (error) {
      console.error('Failed to load doctor dashboard:', error);
      ui.showError('Failed to load dashboard data');
    }
  }

  updateDoctorDashboard(doctor, appointments) {
    // Update stats
    document.getElementById('today-appointments').textContent = 
      appointments.filter(a => {
        const today = new Date().toDateString();
        return new Date(a.date).toDateString() === today;
      }).length;
    document.getElementById('pending-appointments').textContent = 
      appointments.filter(a => a.status === 'pending').length;
    document.getElementById('total-patients').textContent = doctor.patients?.length || 0;
    document.getElementById('total-appointments').textContent = appointments.length;
    
    // Update appointments list
    const appointmentsContainer = document.getElementById('todays-appointments');
    if (appointmentsContainer) {
      const today = new Date().toDateString();
      const todayApps = appointments.filter(a => 
        new Date(a.date).toDateString() === today && a.status !== 'cancelled'
      );
      
      appointmentsContainer.innerHTML = todayApps.map(app => `
        <tr>
          <td>${app.patient.userId.fullName}</td>
          <td>${app.startTime}</td>
          <td><span class="status ${app.status}">${app.status}</span></td>
          <td>
            <button onclick="viewPatient('${app.patient._id}')" class="btn btn-sm">View</button>
            <button onclick="startConsultation('${app._id}')" class="btn btn-sm btn-primary">Start</button>
          </td>
        </tr>
      `).join('');
    }
  }

  async setupAdminDashboard() {
    if (!auth.isAdmin()) {
      window.location.href = '/login.html';
      return;
    }

    try {
      const stats = await api.getDashboardStats();
      this.updateAdminDashboard(stats.data);
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      ui.showError('Failed to load dashboard data');
    }
  }

  updateAdminDashboard(stats) {
    // Update stats cards
    document.getElementById('total-patients').textContent = stats.patients;
    document.getElementById('total-doctors').textContent = stats.doctors;
    document.getElementById('total-staff').textContent = stats.staff;
    document.getElementById('total-appointments').textContent = stats.totalAppointments;
    document.getElementById('today-appointments').textContent = stats.todayAppointments;
    document.getElementById('pending-appointments').textContent = stats.pendingAppointments;
    document.getElementById('total-revenue').textContent = `ETB ${stats.totalRevenue.toLocaleString()}`;
    document.getElementById('today-revenue').textContent = `ETB ${stats.todayRevenue.toLocaleString()}`;
    document.getElementById('total-invoices').textContent = stats.totalInvoices;
    document.getElementById('unpaid-invoices').textContent = stats.unpaidInvoices;
    document.getElementById('total-medicines').textContent = stats.totalMedicines;
    document.getElementById('low-stock').textContent = stats.lowStockMedicines;
    
    // Update charts (using Chart.js or similar)
    this.renderAdminCharts(stats);
  }

  renderAdminCharts(stats) {
    // This would use Chart.js or another charting library
    // For now, we'll just log
    console.log('Rendering admin charts with stats:', stats);
  }

  // ============================================
  // PAGE SETUP - APPOINTMENTS
  // ============================================

  setupAppointmentsPage() {
    // Load appointments
    this.loadAppointments();
    
    // Setup booking form
    this.setupAppointmentBooking();
  }

  async loadAppointments() {
    try {
      const params = new URLSearchParams(window.location.search);
      const patientId = params.get('patient');
      const doctorId = params.get('doctor');
      
      let response;
      if (patientId) {
        response = await api.getAppointmentsByPatient(patientId);
      } else if (doctorId) {
        response = await api.getAppointmentsByDoctor(doctorId);
      } else {
        response = await api.getAppointments();
      }
      
      this.renderAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      ui.showError('Failed to load appointments');
    }
  }

  renderAppointments(appointments) {
    const container = document.getElementById('appointments-list');
    if (!container) return;
    
    container.innerHTML = appointments.map(app => `
      <tr>
        <td>${new Date(app.date).toLocaleDateString()}</td>
        <td>${app.startTime} - ${app.endTime}</td>
        <td>${app.patient?.userId?.fullName || 'N/A'}</td>
        <td>Dr. ${app.doctor?.userId?.fullName || 'N/A'}</td>
        <td><span class="status ${app.status}">${app.status}</span></td>
        <td>
          ${this.getAppointmentActions(app)}
        </td>
      </tr>
    `).join('');
  }

  getAppointmentActions(app) {
    const actions = [];
    if (app.status === 'pending') {
      actions.push(`<button onclick="confirmAppointment('${app._id}')" class="btn btn-sm btn-success">Confirm</button>`);
    }
    if (app.status !== 'cancelled' && app.status !== 'completed') {
      actions.push(`<button onclick="cancelAppointment('${app._id}')" class="btn btn-sm btn-danger">Cancel</button>`);
    }
    actions.push(`<button onclick="viewAppointment('${app._id}')" class="btn btn-sm">View</button>`);
    return actions.join(' ');
  }

  setupAppointmentBooking() {
    const form = document.getElementById('appointment-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = {
        patientId: formData.get('patientId'),
        doctorId: formData.get('doctorId'),
        date: formData.get('date'),
        startTime: formData.get('startTime'),
        reason: formData.get('reason'),
        type: formData.get('type') || 'in-person',
        priority: formData.get('priority') || 'medium',
      };
      
      try {
        await api.createAppointment(data);
        ui.showSuccess('Appointment booked successfully!');
        form.reset();
        this.loadAppointments();
      } catch (error) {
        console.error('Failed to book appointment:', error);
        ui.showError('Failed to book appointment');
      }
    });
  }

  // ============================================
  // PAGE SETUP - PATIENTS
  // ============================================

  setupPatientsPage() {
    this.loadPatients();
    this.setupPatientSearch();
    this.setupPatientForm();
  }

  async loadPatients() {
    try {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      
      let response;
      if (search) {
        response = await api.searchPatients(search);
      } else {
        response = await api.getPatients();
      }
      
      this.renderPatients(response.data);
    } catch (error) {
      console.error('Failed to load patients:', error);
      ui.showError('Failed to load patients');
    }
  }

  renderPatients(patients) {
    const container = document.getElementById('patients-list');
    if (!container) return;
    
    container.innerHTML = patients.map(patient => `
      <tr>
        <td>${patient.patientId}</td>
        <td>${patient.userId?.fullName || 'N/A'}</td>
        <td>${patient.mrn}</td>
        <td>${patient.userId?.email || 'N/A'}</td>
        <td>${patient.userId?.phone || 'N/A'}</td>
        <td>
          <button onclick="viewPatient('${patient._id}')" class="btn btn-sm">View</button>
          <button onclick="editPatient('${patient._id}')" class="btn btn-sm btn-primary">Edit</button>
        </td>
      </tr>
    `).join('');
  }

  setupPatientSearch() {
    const searchInput = document.getElementById('patient-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce((e) => {
      const query = e.target.value;
      if (query.length >= 2) {
        window.history.pushState({}, '', `?search=${encodeURIComponent(query)}`);
        this.loadPatients();
      } else if (query.length === 0) {
        window.history.pushState({}, '', window.location.pathname);
        this.loadPatients();
      }
    }, 300));
  }

  setupPatientForm() {
    const form = document.getElementById('patient-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = {
        userId: formData.get('userId'),
        bloodGroup: formData.get('bloodGroup'),
        emergencyContact: {
          name: formData.get('emergencyName'),
          relationship: formData.get('emergencyRelationship'),
          phone: formData.get('emergencyPhone'),
        },
        insurance: {
          provider: formData.get('insuranceProvider'),
          policyNumber: formData.get('policyNumber'),
        },
      };
      
      try {
        await api.createPatient(data);
        ui.showSuccess('Patient registered successfully!');
        form.reset();
        this.loadPatients();
        // Close modal if open
        ui.closeModal('patient-modal');
      } catch (error) {
        console.error('Failed to register patient:', error);
        ui.showError('Failed to register patient');
      }
    });
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  setupEventListeners() {
    // Global event listeners
    document.addEventListener('click', (e) => {
      // Handle logout
      if (e.target.closest('#logout-btn')) {
        e.preventDefault();
        this.handleLogout();
      }
      
      // Handle toggle sidebar
      if (e.target.closest('#sidebar-toggle')) {
        ui.toggleSidebar();
      }
      
      // Handle theme toggle
      if (e.target.closest('#theme-toggle')) {
        theme.toggle();
      }
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+L = Logout
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.handleLogout();
      }
      
      // Escape = Close modals
      if (e.key === 'Escape') {
        ui.closeAllModals();
      }
    });
  }

  // ============================================
  // ACTION HANDLERS
  // ============================================

  async handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      await auth.logout();
      window.location.href = '/index.html';
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// ============================================
// CREATE AND EXPORT SINGLETON INSTANCE
// ============================================

const app = new App();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
}

// Make app available globally for inline event handlers
window.app = app;
window.auth = auth;
window.api = api;
window.ui = ui;

export default app;

// ============================================
// GLOBAL FUNCTION EXPORTS FOR INLINE HTML
// ============================================

window.viewPatient = (id) => {
  window.location.href = `/patient.html?id=${id}`;
};

window.viewDoctor = (id) => {
  window.location.href = `/doctor.html?id=${id}`;
};

window.viewAppointment = (id) => {
  window.location.href = `/appointment.html?id=${id}`;
};

window.confirmAppointment = async (id) => {
  if (confirm('Confirm this appointment?')) {
    try {
      await api.confirmAppointment(id);
      ui.showSuccess('Appointment confirmed!');
      app.loadAppointments();
    } catch (error) {
      ui.showError('Failed to confirm appointment');
    }
  }
};

window.cancelAppointment = async (id) => {
  const reason = prompt('Reason for cancellation:');
  if (reason !== null) {
    try {
      await api.cancelAppointment(id, reason);
      ui.showSuccess('Appointment cancelled');
      app.loadAppointments();
    } catch (error) {
      ui.showError('Failed to cancel appointment');
    }
  }
};

window.startConsultation = (id) => {
  window.location.href = `/consultation.html?appointment=${id}`;
};

window.editPatient = (id) => {
  window.location.href = `/patient-edit.html?id=${id}`;
};

window.printPatientCard = (id) => {
  window.location.href = `/print-card.html?id=${id}`;
};

// ============================================
// HOSPITAL INFO (for all pages)
// ============================================

window.HOSPITAL_INFO = {
  name: 'Gimbie Adventist General Hospital',
  phone: '+251-XX-XXX-XXXX',
  email: 'info@gimbiehospital.com',
  address: 'Gimbie, Ethiopia',
  emergency: '911',
  ambulance: '+251-XX-XXX-XXXX',
  hours: '24/7',
  social: {
    facebook: 'https://facebook.com/gimbiehospital',
    twitter: 'https://twitter.com/gimbiehospital',
    youtube: 'https://youtube.com/gimbiehospital',
    instagram: 'https://instagram.com/gimbiehospital',
  },
};
