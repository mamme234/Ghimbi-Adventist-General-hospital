// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// AUTHENTICATION - JWT & ROLE-BASED ACCESS
// ============================================

const jwt = require('jsonwebtoken');
const { User } = require('./models');
const logger = require('./logger');

// ============================================
// JWT TOKEN GENERATION
// ============================================

exports.generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

exports.generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d' }
  );
};

// ============================================
// VERIFY TOKEN
// ============================================

exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

// ============================================
// PROTECT MIDDLEWARE - Require Authentication
// ============================================

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.',
      });
    }

    // Verify token
    const decoded = exports.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please login again.',
      });
    }

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};

// ============================================
// AUTHORIZE MIDDLEWARE - Role-Based Access
// ============================================

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized for this action.`,
        requiredRoles: roles,
        yourRole: req.user.role,
      });
    }

    next();
  };
};

// ============================================
// PERMISSION CHECK - Fine-grained permissions
// ============================================

const permissions = {
  // Patient permissions
  patient: {
    can: ['view_own_profile', 'view_own_appointments', 'view_own_prescriptions', 
          'view_own_lab_results', 'view_own_invoices', 'book_appointment',
          'cancel_own_appointment', 'send_message_to_doctor', 'view_health_articles'],
    cannot: ['view_all_patients', 'manage_users', 'view_all_appointments']
  },
  
  // Doctor permissions
  doctor: {
    can: ['view_all_patients', 'view_patient_records', 'create_prescription',
          'view_lab_results', 'request_lab_tests', 'view_radiology_tests',
          'request_radiology_tests', 'schedule_surgery', 'view_own_appointments',
          'manage_own_appointments', 'view_patient_history', 'write_consultation_notes',
          'telemedicine_consultation', 'create_medical_certificates'],
    cannot: ['manage_users', 'manage_finance', 'manage_pharmacy_inventory']
  },
  
  // Nurse permissions
  nurse: {
    can: ['view_patient_records', 'record_vital_signs', 'view_medications',
          'administer_medications', 'view_shift_schedule', 'write_nursing_notes',
          'view_care_plans', 'monitor_patients', 'view_ward_patients'],
    cannot: ['manage_users', 'manage_finance', 'create_prescription']
  },
  
  // Pharmacist permissions
  pharmacist: {
    can: ['view_prescriptions', 'verify_prescriptions', 'dispense_medications',
          'manage_inventory', 'view_medicines', 'add_medicines', 'update_medicines',
          'view_suppliers', 'manage_purchase_orders', 'view_expiry_tracking',
          'generate_pharmacy_reports', 'view_low_stock_alerts'],
    cannot: ['manage_users', 'view_patient_medical_history', 'create_prescription']
  },
  
  // Laboratory permissions
  laboratory: {
    can: ['view_lab_requests', 'process_lab_tests', 'enter_lab_results',
          'view_lab_inventory', 'manage_equipment', 'view_quality_controls',
          'generate_lab_reports', 'view_critical_alerts', 'view_patient_lab_history'],
    cannot: ['manage_users', 'manage_finance', 'create_prescription']
  },
  
  // Radiologist permissions
  radiologist: {
    can: ['view_radiology_requests', 'perform_imaging', 'view_imaging_results',
          'upload_images', 'view_pacs', 'view_dicom_files', 'write_radiology_reports',
          'generate_radiology_reports'],
    cannot: ['manage_users', 'manage_finance']
  },
  
  // Receptionist permissions
  receptionist: {
    can: ['register_patients', 'search_patients', 'print_patient_cards',
          'book_appointments', 'check_in_patients', 'manage_queue',
          'register_visitors', 'view_patient_basic_info'],
    cannot: ['view_medical_records', 'manage_users', 'manage_finance']
  },
  
  // Finance permissions
  finance: {
    can: ['view_invoices', 'create_invoices', 'process_payments',
          'view_revenue', 'generate_financial_reports', 'manage_insurance_claims',
          'view_payment_history', 'manage_installment_plans', 'export_financial_data'],
    cannot: ['view_medical_records', 'manage_users', 'create_prescription']
  },
  
  // HR permissions
  hr: {
    can: ['view_staff_profiles', 'manage_staff', 'view_attendance',
          'manage_payroll', 'view_leave_requests', 'process_leave_requests',
          'manage_performance_reviews', 'view_training_records', 'manage_shift_schedules'],
    cannot: ['view_patient_records', 'manage_finance', 'create_prescription']
  },
  
  // Ambulance permissions
  ambulance: {
    can: ['view_emergency_requests', 'dispatch_ambulance', 'view_trip_history',
          'manage_drivers', 'update_ambulance_status', 'view_fuel_records',
          'manage_maintenance_schedule', 'view_ambulance_location'],
    cannot: ['view_patient_records', 'manage_users', 'manage_finance']
  },
  
  // Admin permissions
  admin: {
    can: ['manage_all_users', 'manage_staff', 'manage_departments',
          'manage_beds', 'manage_wards', 'manage_equipment',
          'manage_inventory', 'view_all_reports', 'view_analytics',
          'manage_system_settings', 'view_audit_logs', 'manage_notifications',
          'manage_website_content', 'manage_news', 'manage_gallery',
          'manage_careers', 'backup_database'],
    cannot: []
  },
  
  // Super Admin permissions
  'super-admin': {
    can: ['all_permissions', 'manage_admins', 'system_configuration',
          'disaster_recovery', 'manage_security_settings', 'view_all_audit_logs',
          'manage_subscriptions', 'manage_branches', 'full_system_access'],
    cannot: []
  }
};

// ============================================
// CHECK PERMISSION MIDDLEWARE
// ============================================

exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login.',
      });
    }

    const userPermissions = permissions[req.user.role];
    if (!userPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Role not recognized.',
      });
    }

    // Super admin has all permissions
    if (req.user.role === 'super-admin' || userPermissions.can.includes('all_permissions')) {
      return next();
    }

    if (!userPermissions.can.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. You do not have the '${permission}' permission.`,
        requiredPermission: permission,
        yourRole: req.user.role,
      });
    }

    next();
  };
};

// ============================================
// GET USER PERMISSIONS
// ============================================

exports.getUserPermissions = (role) => {
  const userPermissions = permissions[role];
  if (!userPermissions) {
    return { can: [], cannot: [] };
  }
  return userPermissions;
};

// ============================================
// OWNER CHECK - Check if user owns the resource
// ============================================

exports.isOwner = (model, idField = '_id') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
        });
      }

      // Check if user owns the resource
      const userId = req.user._id;
      const resourceUserId = resource.userId || resource.user || resource.createdBy;

      if (resourceUserId && resourceUserId.toString() === userId.toString()) {
        req.resource = resource;
        return next();
      }

      // Check if user has admin role
      if (['admin', 'super-admin'].includes(req.user.role)) {
        req.resource = resource;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    } catch (error) {
      logger.error('Owner check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error.message,
      });
    }
  };
};

// ============================================
// RATE LIMITING BY ROLE
// ============================================

exports.rateLimitByRole = (limits) => {
  const defaultLimit = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  };

  return (req, res, next) => {
    const role = req.user ? req.user.role : 'public';
    const limit = limits[role] || defaultLimit;

    // This is a simplified version - in production, use a proper rate limiter
    // like express-rate-limit with Redis store
    req.rateLimit = limit;
    next();
  };
};

// ============================================
// SESSION MANAGEMENT
// ============================================

exports.sessionManager = async (req, res, next) => {
  try {
    if (req.user) {
      // Update last activity
      await User.findByIdAndUpdate(req.user._id, {
        lastLogin: new Date(),
      });

      // Check for concurrent sessions (optional)
      // This would require a session store like Redis
    }
    next();
  } catch (error) {
    logger.error('Session management error:', error);
    next();
  }
};

// ============================================
// TWO-FACTOR AUTHENTICATION
// ============================================

exports.require2FA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (req.user.twoFactorEnabled && !req.session.twoFactorVerified) {
      return res.status(403).json({
        success: false,
        message: 'Two-factor authentication required',
        requires2FA: true,
      });
    }

    next();
  } catch (error) {
    logger.error('2FA middleware error:', error);
    return res.status(500).json({
      success: false,
      message: '2FA verification failed',
      error: error.message,
    });
  }
};

// ============================================
// LOG REQUEST MIDDLEWARE
// ============================================

exports.logRequest = (req, res, next) => {
  const start = Date.now();
  
  // Log after response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user ? req.user._id : 'anonymous',
      role: req.user ? req.user.role : 'public',
    };
    
    if (res.statusCode >= 400) {
      logger.warn('Request error:', logData);
    } else {
      logger.info('Request completed:', logData);
    }
  });

  next();
};

// ============================================
// VALIDATE SESSION
// ============================================

exports.validateSession = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.decode(token);
    if (!decoded) {
      return next();
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Session invalid. Please login again.',
      });
    }

    // Check if token is expired
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
        tokenExpired: true,
      });
    }

    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    next();
  }
};
