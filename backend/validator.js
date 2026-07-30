// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// VALIDATOR - Input Validation
// ============================================

const { body, param, query, validationResult } = require('express-validator');

// ============================================
// VALIDATION RULES
// ============================================

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// ============================================
// AUTH VALIDATION
// ============================================

exports.registerValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[0-9]{8,15}$/).withMessage('Please provide a valid phone number'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['patient', 'doctor', 'nurse', 'receptionist', 'pharmacist', 
           'laboratory', 'radiologist', 'finance', 'hr', 'ambulance', 
           'admin', 'super-admin']).withMessage('Invalid role selected'),
];

exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
];

exports.passwordResetValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
];

exports.passwordChangeValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

// ============================================
// PATIENT VALIDATION
// ============================================

exports.patientValidation = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),
  
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Emergency contact name must be at least 2 characters'),
  
  body('emergencyContact.phone')
    .optional()
    .matches(/^\+?[0-9]{8,15}$/).withMessage('Invalid emergency contact phone number'),
  
  body('insurance.provider')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Insurance provider name must be at least 2 characters'),
  
  body('insurance.policyNumber')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Policy number is required'),
];

// ============================================
// APPOINTMENT VALIDATION
// ============================================

exports.appointmentValidation = [
  body('patientId')
    .notEmpty().withMessage('Patient ID is required'),
  
  body('doctorId')
    .notEmpty().withMessage('Doctor ID is required'),
  
  body('date')
    .notEmpty().withMessage('Appointment date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      if (date < new Date()) {
        throw new Error('Appointment date must be in the future');
      }
      return true;
    }),
  
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  
  body('reason')
    .trim()
    .notEmpty().withMessage('Reason for appointment is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters'),
  
  body('type')
    .optional()
    .isIn(['in-person', 'telemedicine', 'follow-up', 'emergency']).withMessage('Invalid appointment type'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level'),
];

// ============================================
// PRESCRIPTION VALIDATION
// ============================================

exports.prescriptionValidation = [
  body('patientId')
    .notEmpty().withMessage('Patient ID is required'),
  
  body('medicines')
    .isArray({ min: 1 }).withMessage('At least one medicine is required'),
  
  body('medicines.*.name')
    .trim()
    .notEmpty().withMessage('Medicine name is required'),
  
  body('medicines.*.dosage')
    .trim()
    .notEmpty().withMessage('Dosage is required'),
  
  body('medicines.*.frequency')
    .trim()
    .notEmpty().withMessage('Frequency is required'),
  
  body('medicines.*.duration')
    .trim()
    .notEmpty().withMessage('Duration is required'),
  
  body('validUntil')
    .notEmpty().withMessage('Valid until date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      if (date < new Date()) {
        throw new Error('Valid until date must be in the future');
      }
      return true;
    }),
  
  body('diagnosis')
    .trim()
    .notEmpty().withMessage('Diagnosis is required')
    .isLength({ min: 3 }).withMessage('Diagnosis must be at least 3 characters'),
];

// ============================================
// MEDICINE VALIDATION
// ============================================

exports.medicineValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Medicine name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Medicine name must be between 2 and 100 characters'),
  
  body('form')
    .notEmpty().withMessage('Medicine form is required')
    .isIn(['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'cream', 'drops', 'inhaler', 'suppository', 'other'])
    .withMessage('Invalid medicine form'),
  
  body('unitPrice')
    .notEmpty().withMessage('Unit price is required')
    .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  
  body('sellingPrice')
    .notEmpty().withMessage('Selling price is required')
    .isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  
  body('quantityInStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity in stock must be a positive integer'),
  
  body('reorderLevel')
    .optional()
    .isInt({ min: 0 }).withMessage('Reorder level must be a positive integer'),
];

// ============================================
// LAB TEST VALIDATION
// ============================================

exports.labTestValidation = [
  body('patientId')
    .notEmpty().withMessage('Patient ID is required'),
  
  body('testName')
    .trim()
    .notEmpty().withMessage('Test name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Test name must be between 2 and 200 characters'),
  
  body('testCategory')
    .notEmpty().withMessage('Test category is required')
    .isIn(['blood', 'urine', 'stool', 'imaging', 'microbiology', 'pathology', 'genetic', 'other'])
    .withMessage('Invalid test category'),
  
  body('priority')
    .optional()
    .isIn(['routine', 'urgent', 'stat']).withMessage('Invalid priority level'),
];

// ============================================
// INVOICE VALIDATION
// ============================================

exports.invoiceValidation = [
  body('patientId')
    .notEmpty().withMessage('Patient ID is required'),
  
  body('items')
    .isArray({ min: 1 }).withMessage('At least one invoice item is required'),
  
  body('items.*.description')
    .trim()
    .notEmpty().withMessage('Item description is required'),
  
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  
  body('items.*.unitPrice')
    .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'insurance', 'bank-transfer', 'mobile-money', 'other'])
    .withMessage('Invalid payment method'),
];

// ============================================
// STAFF VALIDATION
// ============================================

exports.staffValidation = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('employeeNumber')
    .trim()
    .notEmpty().withMessage('Employee number is required'),
  
  body('jobTitle')
    .trim()
    .notEmpty().withMessage('Job title is required')
    .isLength({ min: 2, max: 100 }).withMessage('Job title must be between 2 and 100 characters'),
  
  body('employmentType')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'intern', 'volunteer'])
    .withMessage('Invalid employment type'),
  
  body('salary.amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Salary amount must be a positive number'),
];

// ============================================
// AMBULANCE VALIDATION
// ============================================

exports.ambulanceValidation = [
  body('patientName')
    .trim()
    .notEmpty().withMessage('Patient name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Patient name must be between 2 and 100 characters'),
  
  body('patientPhone')
    .trim()
    .notEmpty().withMessage('Patient phone is required')
    .matches(/^\+?[0-9]{8,15}$/).withMessage('Invalid phone number'),
  
  body('pickupLocation.address')
    .trim()
    .notEmpty().withMessage('Pickup location address is required'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority level'),
];

// ============================================
// ID VALIDATION
// ============================================

exports.idValidation = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isMongoId().withMessage('Invalid ID format'),
];

// ============================================
// SEARCH VALIDATION
// ============================================

exports.searchValidation = [
  query('q')
    .trim()
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters'),
];

// ============================================
// DATE RANGE VALIDATION
// ============================================

exports.dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
];

// ============================================
// EXPORT ALL VALIDATIONS
// ============================================

module.exports = {
  validate: exports.validate,
  register: exports.registerValidation,
  login: exports.loginValidation,
  passwordReset: exports.passwordResetValidation,
  passwordChange: exports.passwordChangeValidation,
  patient: exports.patientValidation,
  appointment: exports.appointmentValidation,
  prescription: exports.prescriptionValidation,
  medicine: exports.medicineValidation,
  labTest: exports.labTestValidation,
  invoice: exports.invoiceValidation,
  staff: exports.staffValidation,
  ambulance: exports.ambulanceValidation,
  id: exports.idValidation,
  search: exports.searchValidation,
  dateRange: exports.dateRangeValidation,
};
