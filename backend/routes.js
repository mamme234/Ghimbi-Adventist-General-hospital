const express = require('express');
const router = express.Router();
const controllers = require('./controllers');
const { auth, authorize, limiter } = require('./middleware');

// ============ PUBLIC ROUTES ============

// Auth
router.post('/api/auth/register', limiter, controllers.register);
router.post('/api/auth/login', limiter, controllers.login);
router.post('/api/auth/refresh', controllers.refreshToken);
router.post('/api/auth/logout', auth, controllers.logout);
router.get('/api/auth/me', auth, controllers.getMe);
router.put('/api/auth/profile', auth, controllers.updateProfile);
router.put('/api/auth/change-password', auth, controllers.changePassword);

// Public - Statistics
router.get('/api/statistics', controllers.getStatistics);

// Public - Departments
router.get('/api/departments', controllers.getDepartments);

// Public - Doctors
router.get('/api/doctors', controllers.getDoctors);
router.get('/api/doctors/:id', controllers.getDoctorById);

// Public - News
router.get('/api/news', controllers.getNews);

// Public - Gallery
router.get('/api/gallery', controllers.getGallery);

// ============ PATIENT/STAFF ROUTES (Require Auth) ============

// Patient Management (Reception)
router.post('/api/patients/register', auth, authorize('reception', 'admin'), controllers.registerPatient);
router.get('/api/patients/search', auth, authorize('reception', 'doctor', 'nurse', 'laboratory', 'pharmacy', 'finance', 'admin'), controllers.searchPatients);
router.get('/api/patients/:id', auth, authorize('reception', 'doctor', 'nurse', 'laboratory', 'pharmacy', 'finance', 'admin'), controllers.getPatientById);

// Consultations (Doctor)
router.post('/api/consultations', auth, authorize('doctor', 'admin'), controllers.createConsultation);
router.get('/api/consultations', auth, controllers.getConsultations);
router.get('/api/consultations/:id', auth, controllers.getConsultationById);

// Laboratory
router.post('/api/laboratory', auth, authorize('doctor', 'admin'), controllers.createLabRequest);
router.get('/api/laboratory', auth, controllers.getLabRequests);
router.put('/api/laboratory/:id', auth, authorize('laboratory', 'admin'), controllers.updateLabRequest);

// Prescriptions (Doctor)
router.post('/api/prescriptions', auth, authorize('doctor', 'admin'), controllers.createPrescription);
router.get('/api/prescriptions', auth, controllers.getPrescriptions);
router.get('/api/prescriptions/:id', auth, controllers.getPrescriptionById);

// Pharmacy
router.get('/api/medicines', auth, controllers.getMedicines);
router.post('/api/medicines', auth, authorize('pharmacy', 'admin'), controllers.createMedicine);
router.put('/api/medicines/:id', auth, authorize('pharmacy', 'admin'), controllers.updateMedicine);
router.post('/api/pharmacy/dispense', auth, authorize('pharmacy', 'admin'), controllers.dispenseMedicine);
router.get('/api/pharmacy/dispenses', auth, controllers.getDispenses);

// Billing
router.post('/api/billing', auth, authorize('finance', 'admin'), controllers.createBill);
router.get('/api/billing', auth, controllers.getBills);
router.put('/api/billing/:id/payment', auth, authorize('finance', 'admin'), controllers.processPayment);

// Admissions
router.post('/api/admissions', auth, authorize('doctor', 'nurse', 'admin'), controllers.admitPatient);
router.put('/api/admissions/:id/discharge', auth, authorize('doctor', 'admin'), controllers.dischargePatient);
router.get('/api/admissions', auth, controllers.getAdmissions);

// Appointments
router.post('/api/appointments', auth, controllers.createAppointment);
router.get('/api/appointments', auth, controllers.getAppointments);
router.put('/api/appointments/:id', auth, controllers.updateAppointment);

// ============ ADMIN ROUTES ============

router.get('/api/admin/users', auth, authorize('admin'), controllers.getUsers);
router.put('/api/admin/users/:id/status', auth, authorize('admin'), controllers.updateUserStatus);
router.get('/api/admin/audit-logs', auth, authorize('admin'), controllers.getAuditLogs);

// Admin - Departments
router.post('/api/admin/departments', auth, authorize('admin'), controllers.createDepartment);
router.put('/api/admin/departments/:id', auth, authorize('admin'), controllers.updateDepartment);

// Admin - News
router.post('/api/admin/news', auth, authorize('admin'), controllers.createNews);

// Admin - Gallery
router.post('/api/admin/gallery', auth, authorize('admin'), controllers.createGallery);

// Admin - Statistics
router.get('/api/admin/statistics', auth, authorize('admin'), controllers.getStatistics);

// ============ SPECIALTY ROUTES ============

// Doctor's own appointments
router.get('/api/doctor/appointments', auth, authorize('doctor'), controllers.getAppointments);

// Nurse routes
router.get('/api/nurse/patients', auth, authorize('nurse'), controllers.getUsers);

module.exports = router;
