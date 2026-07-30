// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// API ROUTES - COMPLETE FIXED
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
const { limiter, strictLimiter } = require('./middleware');

// Import ALL validation rules
const {
  validate,
  register: registerValidation,
  login: loginValidation,
  passwordReset: passwordResetValidation,
  passwordChange: passwordChangeValidation,
  patient: patientValidation,
  appointment: appointmentValidation,
  prescription: prescriptionValidation,
  medicine: medicineValidation,
  labTest: labTestValidation,
  invoice: invoiceValidation,
  staff: staffValidation,
  ambulance: ambulanceValidation,
  id: idValidation,
  search: searchValidation,
  dateRange: dateRangeValidation,
} = require('./validator');

// ============================================
// AUTH ROUTES (Public)
// ============================================
router.post('/auth/register', validate(registerValidation), register);
router.post('/auth/login', strictLimiter, validate(loginValidation), login);
router.post('/auth/logout', protect, logout);
router.post('/auth/refresh', refreshToken);
router.post('/auth/verify-email', verifyEmail);
router.post('/auth/forgot-password', validate(passwordResetValidation), forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.post('/auth/change-password', protect, validate(passwordChangeValidation), changePassword);
router.post('/auth/qr-login', qrLogin);
router.post('/auth/verify-2fa', verify2FA);
router.get('/auth/me', protect, (req, res) => res.json(req.user));

// ============================================
// PATIENT ROUTES
// ============================================
router.get('/patients', protect, authorize('admin', 'doctor', 'reception'), getPatients);
router.get('/patients/search', protect, validate(searchValidation), searchPatients);
router.get('/patients/mrn/:mrn', protect, getPatientByMRN);
router.get('/patients/qr/:qrCode', protect, getPatientByQR);
router.get('/patients/:id', protect, getPatient);
router.post('/patients', protect, authorize('admin', 'reception'), validate(patientValidation), createPatient);
router.put('/patients/:id', protect, authorize('admin', 'reception'), validate(patientValidation), updatePatient);
router.delete('/patients/:id', protect, authorize('admin'), deletePatient);

// ============================================
// DOCTOR ROUTES
// ============================================
router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctor);
router.post('/doctors', protect, authorize('admin'), validate(staffValidation), createDoctor);
router.put('/doctors/:id', protect, authorize('admin'), validate(staffValidation), updateDoctor);
router.delete('/doctors/:id', protect, authorize('admin'), deleteDoctor);
router.get('/doctors/:id/appointments', protect, getDoctorAppointments);
router.get('/doctors/:id/patients', protect, getDoctorPatients);

// ============================================
// APPOINTMENT ROUTES
// ============================================
router.get('/appointments', protect, getAppointments);
router.get('/appointments/patient/:patientId', protect, getAppointmentsByPatient);
router.get('/appointments/doctor/:doctorId', protect, getAppointmentsByDoctor);
router.get('/appointments/:id', protect, validate(idValidation), getAppointment);
router.post('/appointments', protect, validate(appointmentValidation), createAppointment);
router.put('/appointments/:id', protect, validate(idValidation), validate(appointmentValidation), updateAppointment);
router.patch('/appointments/:id/cancel', protect, validate(idValidation), cancelAppointment);
router.patch('/appointments/:id/confirm', protect, authorize('admin', 'reception'), validate(idValidation), confirmAppointment);
router.patch('/appointments/:id/reschedule', protect, validate(idValidation), rescheduleAppointment);

// ============================================
// PRESCRIPTION ROUTES
// ============================================
router.get('/prescriptions', protect, getPrescriptions);
router.get('/prescriptions/:id', protect, validate(idValidation), getPrescription);
router.post('/prescriptions', protect, authorize('doctor'), validate(prescriptionValidation), createPrescription);
router.put('/prescriptions/:id', protect, authorize('doctor'), validate(idValidation), updatePrescription);
router.patch('/prescriptions/:id/verify', protect, authorize('pharmacist'), validate(idValidation), verifyPrescription);
router.patch('/prescriptions/:id/dispense', protect, authorize('pharmacist'), validate(idValidation), dispensePrescription);

// ============================================
// LABORATORY ROUTES
// ============================================
router.get('/lab-tests', protect, getLabTests);
router.get('/lab-tests/:id', protect, validate(idValidation), getLabTest);
router.post('/lab-tests', protect, authorize('doctor', 'lab'), validate(labTestValidation), createLabTest);
router.put('/lab-tests/:id', protect, authorize('lab'), validate(idValidation), updateLabTest);
router.patch('/lab-tests/:id/process', protect, authorize('lab'), validate(idValidation), processLabTest);
router.get('/lab-tests/:id/results', protect, validate(idValidation), getLabResults);

// ============================================
// RADIOLOGY ROUTES
// ============================================
router.get('/radiology-tests', protect, getRadiologyTests);
router.get('/radiology-tests/:id', protect, validate(idValidation), getRadiologyTest);
router.post('/radiology-tests', protect, authorize('doctor', 'radiologist'), createRadiologyTest);
router.put('/radiology-tests/:id', protect, authorize('radiologist'), validate(idValidation), updateRadiologyTest);
router.get('/radiology-tests/:id/results', protect, validate(idValidation), getRadiologyResults);

// ============================================
// PHARMACY ROUTES
// ============================================
router.get('/medicines', getMedicines);
router.get('/medicines/:id', getMedicine);
router.post('/medicines', protect, authorize('admin', 'pharmacist'), validate(medicineValidation), createMedicine);
router.put('/medicines/:id', protect, authorize('admin', 'pharmacist'), validate(idValidation), validate(medicineValidation), updateMedicine);
router.delete('/medicines/:id', protect, authorize('admin'), validate(idValidation), deleteMedicine);
router.get('/inventory', protect, authorize('pharmacist'), getInventory);
router.patch('/inventory/:id', protect, authorize('pharmacist'), validate(idValidation), updateInventory);
router.get('/inventory/low-stock', protect, authorize('pharmacist'), getLowStock);

// ============================================
// FINANCE ROUTES
// ============================================
router.get('/invoices', protect, getInvoices);
router.get('/invoices/:id', protect, getInvoice);
router.post('/invoices', protect, authorize('admin', 'finance'), validate(invoiceValidation), createInvoice);
router.put('/invoices/:id', protect, authorize('finance'), validate(idValidation), updateInvoice);
router.post('/payments', protect, processPayment);
router.get('/revenue', protect, authorize('admin', 'finance'), getRevenue);

// ============================================
// HR ROUTES
// ============================================
router.get('/staff', protect, authorize('admin', 'hr'), getStaff);
router.get('/staff/:id', protect, authorize('admin', 'hr'), getStaffMember);
router.post('/staff', protect, authorize('admin', 'hr'), validate(staffValidation), createStaff);
router.put('/staff/:id', protect, authorize('admin', 'hr'), validate(idValidation), updateStaff);
router.delete('/staff/:id', protect, authorize('admin'), validate(idValidation), deleteStaff);
router.get('/attendance', protect, authorize('admin', 'hr'), getAttendance);
router.post('/attendance', protect, authorize('hr'), markAttendance);
router.get('/payroll', protect, authorize('admin', 'hr'), getPayroll);

// ============================================
// AMBULANCE ROUTES
// ============================================
router.get('/ambulance', protect, getAmbulanceRequests);
router.get('/ambulance/:id', protect, getAmbulanceRequest);
router.post('/ambulance', createAmbulanceRequest);
router.patch('/ambulance/:id/status', protect, authorize('ambulance'), validate(idValidation), updateAmbulanceStatus);
router.patch('/ambulance/:id/dispatch', protect, authorize('ambulance'), validate(idValidation), dispatchAmbulance);

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
router.get('/search', protect, validate(searchValidation), globalSearch);

// ============================================
// WEBSITE PUBLIC ROUTES
// ============================================
router.get('/website/doctors', getDoctors);
router.get('/website/departments', getDepartments);
router.get('/website/services', getServices);
router.get('/website/news', getNews);
router.get('/website/gallery', getGallery);

module.exports = router;
