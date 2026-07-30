const express = require('express');
const router = express.Router();
const controllers = require('./controllers');
const { auth, authorize, limiter, validateFile } = require('./middleware');

// ============ HEALTH CHECK ROUTE ============
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============ AUTH ROUTES ============
router.post('/auth/register', limiter, controllers.register);
router.post('/auth/login', limiter, controllers.login);
router.post('/auth/refresh', controllers.refreshToken);
router.post('/auth/logout', auth, controllers.logout);
router.get('/auth/me', auth, controllers.getMe);
router.put('/auth/profile', auth, controllers.updateProfile);
router.put('/auth/change-password', auth, controllers.changePassword);

// ============ PUBLIC ROUTES ============
router.get('/departments', controllers.getDepartments);
router.get('/doctors', controllers.getDoctors);
router.get('/doctors/:id', controllers.getDoctorById);
router.get('/statistics', controllers.getStatistics);
router.get('/news', controllers.getNews);
router.get('/news/:id', controllers.getNewsById);
router.get('/gallery', controllers.getGallery);

// ============ PATIENT ROUTES ============
router.post('/patients/register', auth, authorize('reception', 'admin'), controllers.registerPatient);
router.get('/patients/search', auth, controllers.searchPatients);
router.get('/patients/:id', auth, controllers.getPatientById);

// ============ APPOINTMENT ROUTES ============
router.post('/appointments', auth, controllers.createAppointment);
router.get('/appointments', auth, controllers.getAppointments);
router.put('/appointments/:id', auth, controllers.updateAppointment);
router.delete('/appointments/:id', auth, controllers.cancelAppointment);

// ============ CONSULTATION ROUTES ============
router.post('/consultations', auth, authorize('doctor', 'admin'), controllers.createConsultation);
router.get('/consultations', auth, controllers.getConsultations);
router.get('/consultations/:id', auth, controllers.getConsultationById);

// ============ LABORATORY ROUTES ============
router.post('/laboratory', auth, authorize('doctor', 'admin'), controllers.createLabRequest);
router.get('/laboratory', auth, controllers.getLabRequests);
router.put('/laboratory/:id', auth, authorize('laboratory', 'admin'), controllers.updateLabRequest);

// ============ PRESCRIPTION ROUTES ============
router.post('/prescriptions', auth, authorize('doctor', 'admin'), controllers.createPrescription);
router.get('/prescriptions', auth, controllers.getPrescriptions);
router.get('/prescriptions/:id', auth, controllers.getPrescriptionById);

// ============ PHARMACY ROUTES ============
router.get('/medicines', auth, controllers.getMedicines);
router.post('/medicines', auth, authorize('pharmacy', 'admin'), controllers.createMedicine);
router.put('/medicines/:id', auth, authorize('pharmacy', 'admin'), controllers.updateMedicine);
router.post('/pharmacy/dispense', auth, authorize('pharmacy', 'admin'), controllers.dispenseMedicine);
router.get('/pharmacy/dispenses', auth, controllers.getDispenses);

// ============ BILLING ROUTES ============
router.post('/billing', auth, authorize('finance', 'admin'), controllers.createBill);
router.get('/billing', auth, controllers.getBills);
router.put('/billing/:id/payment', auth, authorize('finance', 'admin'), controllers.processPayment);

// ============ ADMISSION ROUTES ============
router.post('/admissions', auth, authorize('doctor', 'nurse', 'admin'), controllers.admitPatient);
router.put('/admissions/:id/discharge', auth, authorize('doctor', 'admin'), controllers.dischargePatient);
router.get('/admissions', auth, controllers.getAdmissions);

// ============ CAREER ROUTES ============
router.get('/careers', controllers.getCareers);
router.post('/careers', auth, authorize('admin'), controllers.createCareer);
router.post('/careers/:id/apply', limiter, controllers.applyForJob);

// ============ ADMIN ROUTES ============
router.get('/admin/users', auth, authorize('admin'), controllers.getUsers);
router.put('/admin/users/:id/status', auth, authorize('admin'), controllers.updateUserStatus);
router.get('/admin/audit-logs', auth, authorize('admin'), controllers.getAuditLogs);
router.post('/admin/departments', auth, authorize('admin'), controllers.createDepartment);
router.put('/admin/departments/:id', auth, authorize('admin'), controllers.updateDepartment);
router.post('/admin/news', auth, authorize('admin'), controllers.createNews);
router.put('/admin/news/:id', auth, authorize('admin'), controllers.updateNews);
router.delete('/admin/news/:id', auth, authorize('admin'), controllers.deleteNews);
router.post('/admin/gallery', auth, authorize('admin'), controllers.createGallery);
router.get('/admin/dashboard', auth, authorize('admin'), controllers.getAdminDashboard);
router.get('/admin/statistics', auth, authorize('admin'), controllers.getStatistics);

// ============ DASHBOARD ROUTES ============
router.get('/dashboard/patient', auth, authorize('patient'), controllers.getPatientDashboard);
router.get('/dashboard/doctor', auth, authorize('doctor'), controllers.getDoctorDashboard);

module.exports = router;
