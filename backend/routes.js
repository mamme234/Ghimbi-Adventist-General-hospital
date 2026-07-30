// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// API ROUTES - Updated
// ============================================

const express = require('express');
const router = express.Router();

// Import controllers
const {
  register, login, logout, refreshToken, verifyEmail, 
  forgotPassword, resetPassword, changePassword,
  qrLogin, verify2FA,
  getPatients, getPatient, createPatient, updatePatient, deletePatient,
  searchPatients, getPatientByMRN, getPatientByQR,
  getDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor,
  getDoctorAppointments, getDoctorPatients,
  getAppointments, getAppointment, createAppointment, updateAppointment, 
  cancelAppointment, confirmAppointment, rescheduleAppointment,
  getAppointmentsByPatient, getAppointmentsByDoctor,
  getPrescriptions, getPrescription, createPrescription, updatePrescription,
  verifyPrescription, dispensePrescription,
  getLabTests, getLabTest, createLabTest, updateLabTest,
  processLabTest, getLabResults,
  getRadiologyTests, getRadiologyTest, createRadiologyTest,
  updateRadiologyTest, getRadiologyResults,
  getMedicines, getMedicine, createMedicine, updateMedicine, deleteMedicine,
  getInventory, updateInventory, getLowStock,
  getInvoices, getInvoice, createInvoice, updateInvoice,
  processPayment, getRevenue,
  getStaff, getStaffMember, createStaff, updateStaff, deleteStaff,
  getAttendance, markAttendance, getPayroll,
  getAmbulanceRequests, getAmbulanceRequest, createAmbulanceRequest,
  updateAmbulanceStatus, dispatchAmbulance,
  getDashboardStats, getAuditLogs, getSystemSettings,
  updateSystemSettings, backupDatabase, restoreDatabase,
  generateReport, exportReport,
  getAnalytics, getMetrics,
  aiChat, aiSymptomCheck, aiSummarize,
  sendMessage, getMessages,
  uploadFile, deleteFile,
  globalSearch,
  getDepartments, getServices, getNews, getGallery,
} = require('./controllers');

// Import middleware
const { protect, authorize } = require('./auth');
const { validate } = require('./validator');
const { limiter, strictLimiter } = require('./middleware');

// ============================================
// AUTH ROUTES (Public)
// ============================================
router.post('/auth/register', validate(register), register);
router.post('/auth/login', strictLimiter, validate(login), login);
router.post('/auth/logout', protect, logout);
router.post('/auth/refresh', refreshToken);
router.post('/auth/verify-email', verifyEmail);
router.post('/auth/forgot-password', validate(passwordReset), forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.post('/auth/change-password', protect, validate(passwordChange), changePassword);
router.post('/auth/qr-login', qrLogin);
router.post('/auth/verify-2fa', verify2FA);
router.get('/auth/me', protect, (req, res) => res.json(req.user));

// ============================================
// PATIENT ROUTES
// ============================================
router.get('/patients', protect, authorize('admin', 'doctor', 'reception'), getPatients);
router.get('/patients/search', protect, validate(search), searchPatients);
router.get('/patients/mrn/:mrn', protect, getPatientByMRN);
router.get('/patients/qr/:qrCode', protect, getPatientByQR);
router.get('/patients/:id', protect, getPatient);
router.post('/patients', protect, authorize('admin', 'reception'), validate(patient), createPatient);
router.put('/patients/:id', protect, authorize('admin', 'reception'), validate(patient), updatePatient);
router.delete('/patients/:id', protect, authorize('admin'), deletePatient);

// ============================================
// DOCTOR ROUTES
// ============================================
router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctor);
router.post('/doctors', protect, authorize('admin'), validate(staff), createDoctor);
router.put('/doctors/:id', protect, authorize('admin'), validate(staff), updateDoctor);
router.delete('/doctors/:id', protect, authorize('admin'), deleteDoctor);
router.get('/doctors/:id/appointments', protect, getDoctorAppointments);
router.get('/doctors/:id/patients', protect, getDoctorPatients);

// ============================================
// APPOINTMENT ROUTES
// ============================================
router.get('/appointments', protect, getAppointments);
router.get('/appointments/patient/:patientId', protect, getAppointmentsByPatient);
router.get('/appointments/doctor/:doctorId', protect, getAppointmentsByDoctor);
router.get('/appointments/:id', protect, validate(id), getAppointment);
router.post('/appointments', protect, validate(appointment), createAppointment);
router.put('/appointments/:id', protect, validate(id), validate(appointment), updateAppointment);
router.patch('/appointments/:id/cancel', protect, validate(id), cancelAppointment);
router.patch('/appointments/:id/confirm', protect, authorize('admin', 'reception'), validate(id), confirmAppointment);
router.patch('/appointments/:id/reschedule', protect, validate(id), rescheduleAppointment);

// ============================================
// PRESCRIPTION ROUTES
// ============================================
router.get('/prescriptions', protect, getPrescriptions);
router.get('/prescriptions/:id', protect, validate(id), getPrescription);
router.post('/prescriptions', protect, authorize('doctor'), validate(prescription), createPrescription);
router.put('/prescriptions/:id', protect, authorize('doctor'), validate(id), updatePrescription);
router.patch('/prescriptions/:id/verify', protect, authorize('pharmacist'), validate(id), verifyPrescription);
router.patch('/prescriptions/:id/dispense', protect, authorize('pharmacist'), validate(id), dispensePrescription);

// ============================================
// LABORATORY ROUTES
// ============================================
router.get('/lab-tests', protect, getLabTests);
router.get('/lab-tests/:id', protect, validate(id), getLabTest);
router.post('/lab-tests', protect, authorize('doctor', 'lab'), validate(labTest), createLabTest);
router.put('/lab-tests/:id', protect, authorize('lab'), validate(id), updateLabTest);
router.patch('/lab-tests/:id/process', protect, authorize('lab'), validate(id), processLabTest);
router.get('/lab-tests/:id/results', protect, validate(id), getLabResults);

// ============================================
// RADIOLOGY ROUTES
// ============================================
router.get('/radiology-tests', protect, getRadiologyTests);
router.get('/radiology-tests/:id', protect, validate(id), getRadiologyTest);
router.post('/radiology-tests', protect, authorize('doctor', 'radiologist'), createRadiologyTest);
router.put('/radiology-tests/:id', protect, authorize('radiologist'), validate(id), updateRadiologyTest);
router.get('/radiology-tests/:id/results', protect, validate(id), getRadiologyResults);

// ============================================
// PHARMACY ROUTES
// ============================================
router.get('/medicines', getMedicines);
router.get('/medicines/:id', getMedicine);
router.post('/medicines', protect, authorize('admin', 'pharmacist'), validate(medicine), createMedicine);
router.put('/medicines/:id', protect, authorize('admin', 'pharmacist'), validate(id), validate(medicine), updateMedicine);
router.delete('/medicines/:id', protect, authorize('admin'), validate(id), deleteMedicine);
router.get('/inventory', protect, authorize('pharmacist'), getInventory);
router.patch('/inventory/:id', protect, authorize('pharmacist'), validate(id), updateInventory);
router.get('/inventory/low-stock', protect, authorize('pharmacist'), getLowStock);

// ============================================
// FINANCE ROUTES
// ============================================
router.get('/invoices', protect, getInvoices);
router.get('/invoices/:id', protect, getInvoice);
router.post('/invoices', protect, authorize('admin', 'finance'), validate(invoice), createInvoice);
router.put('/invoices/:id', protect, authorize('finance'), validate(id), updateInvoice);
router.post('/payments', protect, processPayment);
router.get('/revenue', protect, authorize('admin', 'finance'), getRevenue);

// ============================================
// HR ROUTES
// ============================================
router.get('/staff', protect, authorize('admin', 'hr'), getStaff);
router.get('/staff/:id', protect, authorize('admin', 'hr'), getStaffMember);
router.post('/staff', protect, authorize('admin', 'hr'), validate(staff), createStaff);
router.put('/staff/:id', protect, authorize('admin', 'hr'), validate(id), updateStaff);
router.delete('/staff/:id', protect, authorize('admin'), validate(id), deleteStaff);
router.get('/attendance', protect, authorize('admin', 'hr'), getAttendance);
router.post('/attendance', protect, authorize('hr'), markAttendance);
router.get('/payroll', protect, authorize('admin', 'hr'), getPayroll);

// ============================================
// AMBULANCE ROUTES
// ============================================
router.get('/ambulance', protect, getAmbulanceRequests);
router.get('/ambulance/:id', protect, getAmbulanceRequest);
router.post('/ambulance', createAmbulanceRequest);
router.patch('/ambulance/:id/status', protect, authorize('ambulance'), validate(id), updateAmbulanceStatus);
router.patch('/ambulance/:id/dispatch', protect, authorize('ambulance'), validate(id), dispatchAmbulance);

// ============================================
// ADMIN ROUTES
// ============================================
router.get('/admin/stats', protect, authorize('admin', 'super-admin'), getDashboardStats);
router.get('/admin/audit', protect, authorize('super-admin'), getAuditLogs);
router.get('/admin/settings', protect, authorize('admin', 'super-admin'), getSystemSettings);
router.put('/admin/settings', protect, authorize('super-admin'), updateSystemSettings);
router.post('/admin/backup', protect, authorize('super-admin'), backupDatabase);
router.post('/admin/restore', protect, authorize('super-admin'), restoreDatabase);

// ============================================
// REPORT ROUTES
// ============================================
router.post('/reports/generate', protect, generateReport);
router.get('/reports/export/:id', protect, exportReport);

// ============================================
// ANALYTICS ROUTES
// ============================================
router.get('/analytics', protect, authorize('admin', 'super-admin'), getAnalytics);
router.get('/analytics/metrics', protect, getMetrics);

// ============================================
// AI ROUTES
// ============================================
router.post('/ai/chat', protect, aiChat);
router.post('/ai/symptom-check', aiSymptomCheck);
router.post('/ai/summarize', protect, aiSummarize);

// ============================================
// COMMUNICATION ROUTES
// ============================================
router.post('/messages', protect, sendMessage);
router.get('/messages', protect, getMessages);

// ============================================
// UPLOAD ROUTES
// ============================================
router.post('/upload', protect, uploadFile);
router.delete('/upload/:id', protect, deleteFile);

// ============================================
// SEARCH ROUTES
// ============================================
router.get('/search', protect, validate(search), globalSearch);

// ============================================
// WEBSITE PUBLIC ROUTES
// ============================================
router.get('/website/doctors', getDoctors);
router.get('/website/departments', getDepartments);
router.get('/website/services', getServices);
router.get('/website/news', getNews);
router.get('/website/gallery', getGallery);

module.exports = router;
