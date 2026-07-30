// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// CONTROLLERS - COMPLETE BUSINESS LOGIC
// ============================================

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const {
  User,
  Patient,
  Doctor,
  Appointment,
  Prescription,
  Medicine,
  LabTest,
  RadiologyTest,
  Invoice,
  Staff,
  Ambulance,
  AmbulanceTrip,
  AuditLog,
  Notification,
} = require('./models');

// Import mail module (with fallback)
let sendEmail, sendSMS, sendPushNotification;
try {
  const mail = require('./mail');
  sendEmail = mail.sendEmail || mail.sendMail;
  sendSMS = mail.sendSMS || (() => {});
  sendPushNotification = mail.sendPushNotification || (() => {});
} catch (error) {
  console.log('📧 Mail module not available, using mock functions');
  sendEmail = async ({ to, subject, html }) => {
    console.log(`📧 Email to ${to}: ${subject}`);
    return { success: true };
  };
  sendSMS = async ({ to, message }) => {
    console.log(`📱 SMS to ${to}: ${message}`);
    return { success: true };
  };
  sendPushNotification = async ({ userId, title, body }) => {
    console.log(`🔔 Push to ${userId}: ${title}`);
    return { success: true };
  };
}

const logger = require('./logger');
const { generateQR, generateBarcode } = require('./qr');

// ============================================
// AUTH CONTROLLERS
// ============================================

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, password, role, ...rest } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone',
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role: role || 'patient',
      ...rest,
    });

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.verifyEmailToken = verifyToken;
    user.verifyEmailExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - Gimbie Adventist Hospital',
        html: `
          <h1>Welcome to Gimbie Adventist General Hospital</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}">
            Verify Email
          </a>
          <p>This link will expire in 24 hours.</p>
        `,
      });
    } catch (emailError) {
      logger.error('Email send error:', emailError);
    }

    // If role is patient, create patient profile
    if (role === 'patient') {
      const patient = await Patient.create({
        userId: user._id,
        registeredBy: user._id,
        ...rest,
      });
    }

    // If role is doctor, create doctor profile
    if (role === 'doctor') {
      const doctor = await Doctor.create({
        userId: user._id,
        ...rest,
      });
    }

    // Log audit
    await AuditLog.create({
      userId: user._id,
      userRole: role,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user._id,
    });

    // Generate JWT
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      message: 'Registration successful! Please verify your email.',
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        message: `Account locked. Try again after ${new Date(user.lockUntil).toLocaleString()}`,
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000;
      }
      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsLeft: 5 - user.loginAttempts,
      });
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Log audit
    await AuditLog.create({
      userId: user._id,
      userRole: user.role,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Generate JWT
    const token = generateToken(user._id);

    // Get role-specific profile
    let profile = null;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ userId: user._id }).populate('userId', 'fullName email phone profileImage');
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ userId: user._id }).populate('userId', 'fullName email phone profileImage');
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        profile,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      verifyEmailToken: token,
      verifyEmailExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    user.isEmailVerified = true;
    user.isVerified = true;
    user.verifyEmailToken = undefined;
    user.verifyEmailExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message,
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000;
    await user.save();

    // Send reset email
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset - Gimbie Adventist Hospital',
        html: `
          <h1>Reset Your Password</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
    } catch (emailError) {
      logger.error('Password reset email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset email',
      error: error.message,
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message,
    });
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      userRole: user.role,
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: user._id,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: error.message,
    });
  }
};

// @desc    QR Login
// @route   POST /api/auth/qr-login
// @access  Public
exports.qrLogin = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const qrData = JSON.stringify({
      userId: user.userId,
      timestamp: Date.now(),
      token: crypto.randomBytes(32).toString('hex'),
    });

    const qrCode = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      qrCode,
    });
  } catch (error) {
    logger.error('QR login error:', error);
    res.status(500).json({
      success: false,
      message: 'QR generation failed',
      error: error.message,
    });
  }
};

// @desc    Verify 2FA
// @route   POST /api/auth/verify-2fa
// @access  Private
exports.verify2FA = async (req, res) => {
  try {
    const { code } = req.body;

    // Simple verification for now
    if (code === '123456') {
      req.session.twoFactorVerified = true;
      return res.json({
        success: true,
        message: '2FA verified successfully',
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid 2FA code',
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: '2FA verification failed',
      error: error.message,
    });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'USER_LOGOUT',
      resource: 'User',
      resourceId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message,
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    const newToken = generateToken(user._id);

    res.json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      error: error.message,
    });
  }
};

// Helper: Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

// ============================================
// PATIENT CONTROLLERS
// ============================================

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.$or = [
        { 'userId.fullName': { $regex: req.query.search, $options: 'i' } },
        { mrn: { $regex: req.query.search, $options: 'i' } },
        { patientId: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const patients = await Patient.find(query)
      .populate('userId', 'fullName email phone profileImage gender dateOfBirth')
      .populate('registeredBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Patient.countDocuments(query);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients',
      error: error.message,
    });
  }
};

// @desc    Get patient by ID
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id })
      .populate('userId', 'fullName email phone profileImage gender dateOfBirth address')
      .populate('registeredBy', 'fullName');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    logger.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      error: error.message,
    });
  }
};

// @desc    Create patient
// @route   POST /api/patients
// @access  Private
exports.createPatient = async (req, res) => {
  try {
    const { userId, ...patientData } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`;

    const patient = await Patient.create({
      userId,
      mrn,
      registeredBy: req.user._id,
      ...patientData,
    });

    const qrData = JSON.stringify({
      patientId: patient.patientId,
      mrn: patient.mrn,
      name: user.fullName,
    });
    const qrCode = await QRCode.toDataURL(qrData);
    patient.qrCode = qrCode;
    await patient.save();

    await Notification.create({
      userId: user._id,
      type: 'system',
      title: 'Patient Registration Complete',
      message: `Welcome to Gimbie Adventist Hospital! Your MRN is ${mrn}`,
      priority: 'high',
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'PATIENT_CREATED',
      resource: 'Patient',
      resourceId: patient._id,
    });

    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient created successfully',
    });
  } catch (error) {
    logger.error('Create patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create patient',
      error: error.message,
    });
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      patient._id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'PATIENT_UPDATED',
      resource: 'Patient',
      resourceId: patient._id,
    });

    res.json({
      success: true,
      data: updatedPatient,
      message: 'Patient updated successfully',
    });
  } catch (error) {
    logger.error('Update patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update patient',
      error: error.message,
    });
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private (Admin)
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    await patient.deleteOne();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'PATIENT_DELETED',
      resource: 'Patient',
      resourceId: patient._id,
    });

    res.json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    logger.error('Delete patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete patient',
      error: error.message,
    });
  }
};

// @desc    Search patients
// @route   GET /api/patients/search
// @access  Private
exports.searchPatients = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const patients = await Patient.find({
      $or: [
        { 'userId.fullName': { $regex: q, $options: 'i' } },
        { mrn: { $regex: q, $options: 'i' } },
        { patientId: { $regex: q, $options: 'i' } },
        { 'userId.email': { $regex: q, $options: 'i' } },
        { 'userId.phone': { $regex: q, $options: 'i' } },
      ],
    })
      .populate('userId', 'fullName email phone profileImage')
      .limit(20);

    res.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    logger.error('Search patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message,
    });
  }
};

// @desc    Get patient by MRN
// @route   GET /api/patients/mrn/:mrn
// @access  Private
exports.getPatientByMRN = async (req, res) => {
  try {
    const patient = await Patient.findOne({ mrn: req.params.mrn })
      .populate('userId', 'fullName email phone profileImage');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    logger.error('Get patient by MRN error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      error: error.message,
    });
  }
};

// @desc    Get patient by QR code
// @route   GET /api/patients/qr/:qrCode
// @access  Private
exports.getPatientByQR = async (req, res) => {
  try {
    const patient = await Patient.findOne({ qrCode: req.params.qrCode })
      .populate('userId', 'fullName email phone profileImage');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    logger.error('Get patient by QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      error: error.message,
    });
  }
};

// ============================================
// DOCTOR CONTROLLERS
// ============================================

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
exports.getDoctors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.department) {
      query.department = req.query.department;
    }
    if (req.query.isAvailable !== undefined) {
      query.isAvailable = req.query.isAvailable === 'true';
    }
    if (req.query.search) {
      query.$or = [
        { 'userId.fullName': { $regex: req.query.search, $options: 'i' } },
        { specialization: { $regex: req.query.search, $options: 'i' } },
        { doctorId: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const doctors = await Doctor.find(query)
      .populate('userId', 'fullName email phone profileImage')
      .sort({ rating: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      data: doctors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors',
      error: error.message,
    });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id })
      .populate('userId', 'fullName email phone profileImage');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    logger.error('Get doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor',
      error: error.message,
    });
  }
};

// @desc    Create doctor
// @route   POST /api/doctors
// @access  Private (Admin)
exports.createDoctor = async (req, res) => {
  try {
    const { userId, ...doctorData } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const existingDoctor = await Doctor.findOne({ userId });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor already exists for this user',
      });
    }

    const doctor = await Doctor.create({
      userId,
      ...doctorData,
    });

    user.role = 'doctor';
    await user.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'DOCTOR_CREATED',
      resource: 'Doctor',
      resourceId: doctor._id,
    });

    res.status(201).json({
      success: true,
      data: doctor,
      message: 'Doctor created successfully',
    });
  } catch (error) {
    logger.error('Create doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create doctor',
      error: error.message,
    });
  }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
// @access  Private (Admin)
exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctor._id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'DOCTOR_UPDATED',
      resource: 'Doctor',
      resourceId: doctor._id,
    });

    res.json({
      success: true,
      data: updatedDoctor,
      message: 'Doctor updated successfully',
    });
  } catch (error) {
    logger.error('Update doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update doctor',
      error: error.message,
    });
  }
};

// @desc    Delete doctor
// @route   DELETE /api/doctors/:id
// @access  Private (Admin)
exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    await doctor.deleteOne();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'DOCTOR_DELETED',
      resource: 'Doctor',
      resourceId: doctor._id,
    });

    res.json({
      success: true,
      message: 'Doctor deleted successfully',
    });
  } catch (error) {
    logger.error('Delete doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete doctor',
      error: error.message,
    });
  }
};

// @desc    Get doctor appointments
// @route   GET /api/doctors/:id/appointments
// @access  Private
exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const appointments = await Appointment.find({ doctor: doctor._id })
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    logger.error('Get doctor appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
};

// @desc    Get doctor patients
// @route   GET /api/doctors/:id/patients
// @access  Private
exports.getDoctorPatients = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const patients = await Patient.find({
      _id: { $in: doctor.patients || [] },
    }).populate('userId', 'fullName email phone profileImage');

    res.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    logger.error('Get doctor patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients',
      error: error.message,
    });
  }
};

// ============================================
// APPOINTMENT CONTROLLERS
// ============================================

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.date) {
      const start = new Date(req.query.date);
      const end = new Date(req.query.date);
      end.setHours(23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }
    if (req.query.patientId) {
      const patient = await Patient.findOne({ patientId: req.query.patientId });
      if (patient) query.patient = patient._id;
    }
    if (req.query.doctorId) {
      const doctor = await Doctor.findOne({ doctorId: req.query.doctorId });
      if (doctor) query.doctor = doctor._id;
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment',
      error: error.message,
    });
  }
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, startTime, reason, ...appointmentData } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Check if doctor is available
    const existingAppointment = await Appointment.findOne({
      doctor: doctor._id,
      date: new Date(date),
      startTime,
      status: { $nin: ['cancelled', 'completed'] },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not available at this time',
      });
    }

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = minutes + (appointmentData.duration || 30);
    const endHours = hours + Math.floor(endMinutes / 60);
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      date: new Date(date),
      startTime,
      endTime,
      reason,
      createdBy: req.user._id,
      ...appointmentData,
    });

    // Send notification to patient
    const user = await User.findById(patient.userId);
    await Notification.create({
      userId: user._id,
      type: 'appointment',
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${doctor.userId.fullName} on ${new Date(date).toLocaleDateString()} at ${startTime} has been confirmed.`,
      priority: 'high',
    });

    // Send email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Appointment Confirmation - Gimbie Adventist Hospital',
        html: `
          <h1>Appointment Confirmed</h1>
          <p>Dear ${user.fullName},</p>
          <p>Your appointment has been confirmed:</p>
          <ul>
            <li><strong>Doctor:</strong> Dr. ${doctor.userId.fullName}</li>
            <li><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${startTime}</li>
          </ul>
          <p>Please arrive 15 minutes early.</p>
          <a href="${process.env.FRONTEND_URL}/appointments">View Appointment</a>
        `,
      });
    } catch (emailError) {
      logger.error('Appointment email error:', emailError);
    }

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'APPOINTMENT_CREATED',
      resource: 'Appointment',
      resourceId: appointment._id,
    });

    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment created successfully',
    });
  } catch (error) {
    logger.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: error.message,
    });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'APPOINTMENT_UPDATED',
      resource: 'Appointment',
      resourceId: appointment._id,
    });

    res.json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment updated successfully',
    });
  } catch (error) {
    logger.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error.message,
    });
  }
};

// @desc    Cancel appointment
// @route   PATCH /api/appointments/:id/cancel
// @access  Private
exports.cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user._id;
    appointment.cancellationReason = reason || 'Cancelled by user';
    await appointment.save();

    // Notify patient
    const patient = await Patient.findById(appointment.patient);
    const user = await User.findById(patient.userId);
    await Notification.create({
      userId: user._id,
      type: 'alert',
      title: 'Appointment Cancelled',
      message: `Your appointment has been cancelled. Reason: ${appointment.cancellationReason}`,
      priority: 'high',
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'APPOINTMENT_CANCELLED',
      resource: 'Appointment',
      resourceId: appointment._id,
    });

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment cancelled successfully',
    });
  } catch (error) {
    logger.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message,
    });
  }
};

// @desc    Confirm appointment
// @route   PATCH /api/appointments/:id/confirm
// @access  Private
exports.confirmAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    appointment.status = 'confirmed';
    appointment.confirmedAt = new Date();
    await appointment.save();

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment confirmed successfully',
    });
  } catch (error) {
    logger.error('Confirm appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm appointment',
      error: error.message,
    });
  }
};

// @desc    Reschedule appointment
// @route   PATCH /api/appointments/:id/reschedule
// @access  Private
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { date, startTime } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const oldDate = appointment.date;
    const oldTime = appointment.startTime;

    appointment.date = new Date(date);
    appointment.startTime = startTime;
    appointment.status = 'rescheduled';
    appointment.rescheduledFrom = appointment._id;
    await appointment.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'APPOINTMENT_RESCHEDULED',
      resource: 'Appointment',
      resourceId: appointment._id,
      details: { oldDate, oldTime, newDate: date, newTime: startTime },
    });

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment rescheduled successfully',
    });
  } catch (error) {
    logger.error('Reschedule appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment',
      error: error.message,
    });
  }
};

// @desc    Get appointments by patient
// @route   GET /api/appointments/patient/:patientId
// @access  Private
exports.getAppointmentsByPatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const appointments = await Appointment.find({ patient: patient._id })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .sort({ date: -1, startTime: -1 });

    res.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    logger.error('Get appointments by patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
};

// @desc    Get appointments by doctor
// @route   GET /api/appointments/doctor/:doctorId
// @access  Private
exports.getAppointmentsByDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const appointments = await Appointment.find({ doctor: doctor._id })
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .sort({ date: -1, startTime: -1 });

    res.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    logger.error('Get appointments by doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
};

// ============================================
// PRESCRIPTION CONTROLLERS
// ============================================

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.patientId) {
      const patient = await Patient.findOne({ patientId: req.query.patientId });
      if (patient) query.patient = patient._id;
    }
    if (req.query.status) query.status = req.query.status;

    const prescriptions = await Prescription.find(query)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Prescription.countDocuments(query);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message,
    });
  }
};

// @desc    Get prescription by ID
// @route   GET /api/prescriptions/:id
// @access  Private
exports.getPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    res.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    logger.error('Get prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription',
      error: error.message,
    });
  }
};

// @desc    Create prescription
// @route   POST /api/prescriptions
// @access  Private (Doctor)
exports.createPrescription = async (req, res) => {
  try {
    const { patientId, medicines, diagnosis, notes, validUntil, ...prescriptionData } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found',
      });
    }

    const processedMedicines = [];
    for (const med of medicines) {
      let medicine = null;
      if (med.medicineId) {
        medicine = await Medicine.findOne({ medicineId: med.medicineId });
      }
      processedMedicines.push({
        medicine: medicine ? medicine._id : null,
        name: medicine ? medicine.name : med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity: med.quantity || 1,
        instructions: med.instructions || '',
        isGeneric: med.isGeneric || false,
        substituteAllowed: med.substituteAllowed !== undefined ? med.substituteAllowed : true,
      });
    }

    const prescription = await Prescription.create({
      patient: patient._id,
      doctor: doctor._id,
      medicines: processedMedicines,
      diagnosis,
      notes,
      validUntil: new Date(validUntil),
      ...prescriptionData,
    });

    // Generate QR and barcode
    const qrData = JSON.stringify({
      prescriptionId: prescription.prescriptionId,
      patient: patient.patientId,
      doctor: doctor.doctorId,
    });
    prescription.qrCode = await QRCode.toDataURL(qrData);
    prescription.barcode = await generateBarcode(prescription.prescriptionId);
    await prescription.save();

    // Notify patient
    const user = await User.findById(patient.userId);
    await Notification.create({
      userId: user._id,
      type: 'system',
      title: 'New Prescription',
      message: `Dr. ${req.user.fullName} has issued a new prescription.`,
      priority: 'high',
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'PRESCRIPTION_CREATED',
      resource: 'Prescription',
      resourceId: prescription._id,
    });

    res.status(201).json({
      success: true,
      data: prescription,
      message: 'Prescription created successfully',
    });
  } catch (error) {
    logger.error('Create prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create prescription',
      error: error.message,
    });
  }
};

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
// @access  Private (Doctor)
exports.updatePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    const updatedPrescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'PRESCRIPTION_UPDATED',
      resource: 'Prescription',
      resourceId: prescription._id,
    });

    res.json({
      success: true,
      data: updatedPrescription,
      message: 'Prescription updated successfully',
    });
  } catch (error) {
    logger.error('Update prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prescription',
      error: error.message,
    });
  }
};

// @desc    Verify prescription
// @route   PATCH /api/prescriptions/:id/verify
// @access  Private (Pharmacist)
exports.verifyPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    prescription.status = 'dispensed';
    prescription.dispensedBy = req.user._id;
    prescription.dispensedAt = new Date();
    await prescription.save();

    // Update inventory
    for (const med of prescription.medicines) {
      if (med.medicine) {
        const medicine = await Medicine.findById(med.medicine);
        if (medicine) {
          medicine.quantityInStock -= med.quantity || 1;
          await medicine.save();
        }
      }
    }

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'PRESCRIPTION_VERIFIED',
      resource: 'Prescription',
      resourceId: prescription._id,
    });

    res.json({
      success: true,
      data: prescription,
      message: 'Prescription verified and dispensed',
    });
  } catch (error) {
    logger.error('Verify prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify prescription',
      error: error.message,
    });
  }
};

// @desc    Dispense prescription
// @route   PATCH /api/prescriptions/:id/dispense
// @access  Private (Pharmacist)
exports.dispensePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    prescription.status = 'dispensed';
    prescription.dispensedBy = req.user._id;
    prescription.dispensedAt = new Date();
    await prescription.save();

    res.json({
      success: true,
      data: prescription,
      message: 'Prescription dispensed successfully',
    });
  } catch (error) {
    logger.error('Dispense prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dispense prescription',
      error: error.message,
    });
  }
};

// ============================================
// MEDICINE CONTROLLERS (Pharmacy)
// ============================================

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Public
exports.getMedicines = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = { isActive: true };
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { genericName: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.category) {
      query.category = req.query.category;
    }

    const medicines = await Medicine.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Medicine.countDocuments(query);

    res.json({
      success: true,
      data: medicines,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get medicines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medicines',
      error: error.message,
    });
  }
};

// @desc    Get medicine by ID
// @route   GET /api/medicines/:id
// @access  Public
exports.getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ medicineId: req.params.id });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    res.json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    logger.error('Get medicine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medicine',
      error: error.message,
    });
  }
};

// @desc    Create medicine
// @route   POST /api/medicines
// @access  Private (Admin/Pharmacist)
exports.createMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'MEDICINE_CREATED',
      resource: 'Medicine',
      resourceId: medicine._id,
    });

    res.status(201).json({
      success: true,
      data: medicine,
      message: 'Medicine created successfully',
    });
  } catch (error) {
    logger.error('Create medicine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create medicine',
      error: error.message,
    });
  }
};

// @desc    Update medicine
// @route   PUT /api/medicines/:id
// @access  Private (Admin/Pharmacist)
exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ medicineId: req.params.id });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    const updatedMedicine = await Medicine.findByIdAndUpdate(
      medicine._id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'MEDICINE_UPDATED',
      resource: 'Medicine',
      resourceId: medicine._id,
    });

    res.json({
      success: true,
      data: updatedMedicine,
      message: 'Medicine updated successfully',
    });
  } catch (error) {
    logger.error('Update medicine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medicine',
      error: error.message,
    });
  }
};

// @desc    Delete medicine
// @route   DELETE /api/medicines/:id
// @access  Private (Admin)
exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ medicineId: req.params.id });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    medicine.isActive = false;
    await medicine.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'MEDICINE_DELETED',
      resource: 'Medicine',
      resourceId: medicine._id,
    });

    res.json({
      success: true,
      message: 'Medicine deleted successfully',
    });
  } catch (error) {
    logger.error('Delete medicine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medicine',
      error: error.message,
    });
  }
};

// @desc    Get inventory
// @route   GET /api/inventory
// @access  Private (Pharmacist)
exports.getInventory = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true })
      .select('name genericName quantityInStock reorderLevel unitPrice sellingPrice expiryDate')
      .sort({ quantityInStock: 1 });

    const stats = {
      total: medicines.length,
      lowStock: medicines.filter(m => m.quantityInStock <= m.reorderLevel).length,
      outOfStock: medicines.filter(m => m.quantityInStock === 0).length,
      expiringSoon: medicines.filter(m => {
        if (!m.expiryDate) return false;
        const days = (new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
        return days <= 30 && days > 0;
      }).length,
    };

    res.json({
      success: true,
      data: medicines,
      stats,
    });
  } catch (error) {
    logger.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
  }
};

// @desc    Update inventory
// @route   PATCH /api/inventory/:id
// @access  Private (Pharmacist)
exports.updateInventory = async (req, res) => {
  try {
    const { quantity } = req.body;

    const medicine = await Medicine.findOne({ medicineId: req.params.id });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    medicine.quantityInStock = quantity;
    await medicine.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'INVENTORY_UPDATED',
      resource: 'Medicine',
      resourceId: medicine._id,
      details: { oldQuantity: medicine.quantityInStock, newQuantity: quantity },
    });

    res.json({
      success: true,
      data: medicine,
      message: 'Inventory updated successfully',
    });
  } catch (error) {
    logger.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory',
      error: error.message,
    });
  }
};

// @desc    Get low stock medicines
// @route   GET /api/inventory/low-stock
// @access  Private (Pharmacist)
exports.getLowStock = async (req, res) => {
  try {
    const medicines = await Medicine.find({
      quantityInStock: { $lte: '$reorderLevel' },
      isActive: true,
    }).sort({ quantityInStock: 1 });

    res.json({
      success: true,
      data: medicines,
    });
  } catch (error) {
    logger.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock medicines',
      error: error.message,
    });
  }
};

// ============================================
// LABORATORY CONTROLLERS
// ============================================

// @desc    Get all lab tests
// @route   GET /api/lab-tests
// @access  Private
exports.getLabTests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.patientId) {
      const patient = await Patient.findOne({ patientId: req.query.patientId });
      if (patient) query.patient = patient._id;
    }
    if (req.query.status) query.status = req.query.status;
    if (req.query.testCategory) query.testCategory = req.query.testCategory;

    const labTests = await LabTest.find(query)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LabTest.countDocuments(query);

    res.json({
      success: true,
      data: labTests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get lab tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab tests',
      error: error.message,
    });
  }
};

// @desc    Get lab test by ID
// @route   GET /api/lab-tests/:id
// @access  Private
exports.getLabTest = async (req, res) => {
  try {
    const labTest = await LabTest.findById(req.params.id)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      });

    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found',
      });
    }

    res.json({
      success: true,
      data: labTest,
    });
  } catch (error) {
    logger.error('Get lab test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab test',
      error: error.message,
    });
  }
};

// @desc    Create lab test
// @route   POST /api/lab-tests
// @access  Private
exports.createLabTest = async (req, res) => {
  try {
    const { patientId, testName, testCategory, specimenType, priority, ...testData } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id });
    }

    const labTest = await LabTest.create({
      patient: patient._id,
      doctor: doctor ? doctor._id : null,
      testName,
      testCategory,
      specimenType,
      priority: priority || 'routine',
      ...testData,
    });

    labTest.barcode = await generateBarcode(labTest.testId);
    await labTest.save();

    const user = await User.findById(patient.userId);
    await Notification.create({
      userId: user._id,
      type: 'system',
      title: 'Lab Test Ordered',
      message: `A lab test "${testName}" has been ordered. Please visit the laboratory.`,
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'LAB_TEST_CREATED',
      resource: 'LabTest',
      resourceId: labTest._id,
    });

    res.status(201).json({
      success: true,
      data: labTest,
      message: 'Lab test created successfully',
    });
  } catch (error) {
    logger.error('Create lab test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lab test',
      error: error.message,
    });
  }
};

// @desc    Update lab test
// @route   PUT /api/lab-tests/:id
// @access  Private
exports.updateLabTest = async (req, res) => {
  try {
    const labTest = await LabTest.findById(req.params.id);
    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found',
      });
    }

    const updatedLabTest = await LabTest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'LAB_TEST_UPDATED',
      resource: 'LabTest',
      resourceId: labTest._id,
    });

    res.json({
      success: true,
      data: updatedLabTest,
      message: 'Lab test updated successfully',
    });
  } catch (error) {
    logger.error('Update lab test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lab test',
      error: error.message,
    });
  }
};

// @desc    Process lab test
// @route   PATCH /api/lab-tests/:id/process
// @access  Private (Laboratory)
exports.processLabTest = async (req, res) => {
  try {
    const { results, interpretation, comments } = req.body;

    const labTest = await LabTest.findById(req.params.id);
    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found',
      });
    }

    labTest.results = results || [];
    labTest.interpretation = interpretation;
    labTest.comments = comments;
    labTest.status = 'completed';
    labTest.reviewedAt = new Date();
    labTest.reviewedBy = req.user._id;

    // Check for critical values
    const criticalResults = labTest.results.filter(r => r.isAbnormal);
    if (criticalResults.length > 0) {
      labTest.isCritical = true;
      labTest.criticalAlertSent = true;

      if (labTest.doctor) {
        const doctor = await Doctor.findById(labTest.doctor);
        const doctorUser = await User.findById(doctor.userId);
        await Notification.create({
          userId: doctorUser._id,
          type: 'alert',
          title: 'Critical Lab Result',
          message: `Critical result for patient ${labTest.patient}. Please review immediately.`,
          priority: 'urgent',
        });
      }
    }

    await labTest.save();

    // Notify patient
    const patient = await Patient.findById(labTest.patient);
    const user = await User.findById(patient.userId);
    await Notification.create({
      userId: user._id,
      type: 'system',
      title: 'Lab Results Ready',
      message: `Your ${labTest.testName} results are ready. Please check your patient portal.`,
      priority: 'high',
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'LAB_TEST_PROCESSED',
      resource: 'LabTest',
      resourceId: labTest._id,
    });

    res.json({
      success: true,
      data: labTest,
      message: 'Lab test processed successfully',
    });
  } catch (error) {
    logger.error('Process lab test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process lab test',
      error: error.message,
    });
  }
};

// @desc    Get lab results
// @route   GET /api/lab-tests/:id/results
// @access  Private
exports.getLabResults = async (req, res) => {
  try {
    const labTest = await LabTest.findById(req.params.id);
    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found',
      });
    }

    res.json({
      success: true,
      data: labTest.results,
    });
  } catch (error) {
    logger.error('Get lab results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab results',
      error: error.message,
    });
  }
};

// ============================================
// RADIOLOGY CONTROLLERS
// ============================================

// @desc    Get all radiology tests
// @route   GET /api/radiology-tests
// @access  Private
exports.getRadiologyTests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.patientId) {
      const patient = await Patient.findOne({ patientId: req.query.patientId });
      if (patient) query.patient = patient._id;
    }
    if (req.query.status) query.status = req.query.status;
    if (req.query.testType) query.testType = req.query.testType;

    const radiologyTests = await RadiologyTest.find(query)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await RadiologyTest.countDocuments(query);

    res.json({
      success: true,
      data: radiologyTests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get radiology tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch radiology tests',
      error: error.message,
    });
  }
};

// @desc    Get radiology test by ID
// @route   GET /api/radiology-tests/:id
// @access  Private
exports.getRadiologyTest = async (req, res) => {
  try {
    const radiologyTest = await RadiologyTest.findById(req.params.id)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .populate('doctor', 'doctorId')
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      });

    if (!radiologyTest) {
      return res.status(404).json({
        success: false,
        message: 'Radiology test not found',
      });
    }

    res.json({
      success: true,
      data: radiologyTest,
    });
  } catch (error) {
    logger.error('Get radiology test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch radiology test',
      error: error.message,
    });
  }
};

// @desc    Create radiology test
// @route   POST /api/radiology-tests
// @access  Private
exports.createRadiologyTest = async (req, res) => {
  try {
    const { patientId, testType, bodyPart, reason, priority, ...testData } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id });
    }

    const radiologyTest = await RadiologyTest.create({
      patient: patient._id,
      doctor: doctor ? doctor._id : null,
      testType,
      bodyPart,
      reason,
      priority: priority || 'routine',
      ...testData,
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'RADIOLOGY_TEST_CREATED',
      resource: 'RadiologyTest',
      resourceId: radiologyTest._id,
    });

    res.status(201).json({
      success: true,
      data: radiologyTest,
      message: 'Radiology test created successfully',
    });
  } catch (error) {
    logger.error('Create radiology test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create radiology test',
      error: error.message,
    });
  }
};

// @desc    Update radiology test
// @route   PUT /api/radiology-tests/:id
// @access  Private
exports.updateRadiologyTest = async (req, res) => {
  try {
    const radiologyTest = await RadiologyTest.findById(req.params.id);
    if (!radiologyTest) {
      return res.status(404).json({
        success: false,
        message: 'Radiology test not found',
      });
    }

    const updatedRadiologyTest = await RadiologyTest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'RADIOLOGY_TEST_UPDATED',
      resource: 'RadiologyTest',
      resourceId: radiologyTest._id,
    });

    res.json({
      success: true,
      data: updatedRadiologyTest,
      message: 'Radiology test updated successfully',
    });
  } catch (error) {
    logger.error('Update radiology test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update radiology test',
      error: error.message,
    });
  }
};

// @desc    Get radiology results
// @route   GET /api/radiology-tests/:id/results
// @access  Private
exports.getRadiologyResults = async (req, res) => {
  try {
    const radiologyTest = await RadiologyTest.findById(req.params.id);
    if (!radiologyTest) {
      return res.status(404).json({
        success: false,
        message: 'Radiology test not found',
      });
    }

    res.json({
      success: true,
      data: {
        findings: radiologyTest.findings,
        impression: radiologyTest.impression,
        recommendations: radiologyTest.recommendations,
        images: radiologyTest.images,
      },
    });
  } catch (error) {
    logger.error('Get radiology results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch radiology results',
      error: error.message,
    });
  }
};

// ============================================
// FINANCE / INVOICE CONTROLLERS
// ============================================

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.patientId) {
      const patient = await Patient.findOne({ patientId: req.query.patientId });
      if (patient) query.patient = patient._id;
    }
    if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;

    const invoices = await Invoice.find(query)
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .populate('issuedBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message,
    });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceId: req.params.id })
      .populate('patient', 'patientId mrn')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'fullName',
        },
      })
      .populate('issuedBy', 'fullName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message,
    });
  }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const { patientId, items, paymentMethod, notes, ...invoiceData } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    let subtotal = 0;
    const processedItems = items.map(item => {
      const total = item.quantity * item.unitPrice;
      subtotal += total;
      return { ...item, totalPrice: total };
    });

    const tax = subtotal * 0.15;
    const discount = invoiceData.discount || 0;
    const totalAmount = subtotal + tax - discount;

    const invoice = await Invoice.create({
      patient: patient._id,
      patientName: req.body.patientName || (patient.userId ? patient.userId.fullName : 'Unknown'),
      items: processedItems,
      subtotal,
      tax,
      discount,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      issuedBy: req.user._id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes,
      ...invoiceData,
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'INVOICE_CREATED',
      resource: 'Invoice',
      resourceId: invoice._id,
    });

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message,
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private (Finance)
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceId: req.params.id });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoice._id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'INVOICE_UPDATED',
      resource: 'Invoice',
      resourceId: invoice._id,
    });

    res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully',
    });
  } catch (error) {
    logger.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message,
    });
  }
};

// @desc    Process payment
// @route   POST /api/payments
// @access  Private
exports.processPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, transactionId } = req.body;

    const invoice = await Invoice.findOne({ invoiceId });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const newAmountPaid = invoice.amountPaid + amount;
    invoice.amountPaid = newAmountPaid;
    invoice.balanceDue = invoice.totalAmount - newAmountPaid;

    if (invoice.balanceDue <= 0) {
      invoice.paymentStatus = 'paid';
      invoice.balanceDue = 0;
    } else {
      invoice.paymentStatus = 'partially-paid';
    }

    invoice.paymentMethod = paymentMethod;
    invoice.paymentDate = new Date();
    invoice.transactionId = transactionId;
    await invoice.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'PAYMENT_PROCESSED',
      resource: 'Invoice',
      resourceId: invoice._id,
      details: { amount, paymentMethod, transactionId },
    });

    res.json({
      success: true,
      data: invoice,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message,
    });
  }
};

// @desc    Get revenue
// @route   GET /api/revenue
// @access  Private (Finance/Admin)
exports.getRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = { paymentStatus: 'paid' };
    if (startDate && endDate) {
      match.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const revenue = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          average: { $avg: '$totalAmount' },
        },
      },
    ]);

    const dailyRevenue = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        total: revenue[0]?.total || 0,
        count: revenue[0]?.count || 0,
        average: revenue[0]?.average || 0,
        daily: dailyRevenue,
      },
    });
  } catch (error) {
    logger.error('Get revenue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue',
      error: error.message,
    });
  }
};

// ============================================
// ADMIN CONTROLLERS
// ============================================

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      totalStaff,
      todayAppointments,
      totalAppointments,
      pendingAppointments,
      totalRevenue,
      todayRevenue,
      activePatients,
      totalInvoices,
      unpaidInvoices,
      totalMedicines,
      lowStockMedicines,
    ] = await Promise.all([
      Patient.countDocuments({ isActive: true }),
      Doctor.countDocuments(),
      Staff.countDocuments({ isActive: true }),
      Appointment.countDocuments({
        date: { $gte: new Date().setHours(0, 0, 0, 0), $lte: new Date().setHours(23, 59, 59, 999) },
        status: { $ne: 'cancelled' },
      }),
      Appointment.countDocuments({ status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ status: 'pending' }),
      Invoice.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Invoice.aggregate([
        {
          $match: {
            paymentDate: {
              $gte: new Date().setHours(0, 0, 0, 0),
              $lte: new Date().setHours(23, 59, 59, 999),
            },
            paymentStatus: 'paid',
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Patient.countDocuments({ isActive: true }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ paymentStatus: 'unpaid' }),
      Medicine.countDocuments({ isActive: true }),
      Medicine.countDocuments({
        quantityInStock: { $lte: '$reorderLevel' },
        isActive: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        patients: totalPatients,
        doctors: totalDoctors,
        staff: totalStaff,
        todayAppointments,
        totalAppointments,
        pendingAppointments,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        activePatients,
        totalInvoices,
        unpaidInvoices,
        totalMedicines,
        lowStockMedicines,
        occupancyRate: '65%',
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message,
    });
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit
// @access  Private (Super Admin)
exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.action) query.action = req.query.action;
    if (req.query.resource) query.resource = req.query.resource;

    const logs = await AuditLog.find(query)
      .populate('userId', 'fullName email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message,
    });
  }
};

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
exports.getSystemSettings = async (req, res) => {
  try {
    // Placeholder - implement settings model
    const settings = {
      hospitalName: process.env.HOSPITAL_NAME || 'Gimbie Adventist General Hospital',
      hospitalPhone: process.env.HOSPITAL_PHONE || '+251-XX-XXX-XXXX',
      hospitalEmail: process.env.HOSPITAL_EMAIL || 'info@gimbiehospital.com',
      hospitalAddress: process.env.HOSPITAL_ADDRESS || 'Gimbie, Ethiopia',
      maintenanceMode: false,
      appointmentDuration: 30,
      maxAppointmentsPerDay: 50,
      consultationFee: 500,
      currency: 'ETB',
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings',
      error: error.message,
    });
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private (Super Admin)
exports.updateSystemSettings = async (req, res) => {
  try {
    // Placeholder - implement settings model
    const settings = req.body;
    
    // Update environment variables or settings collection
    if (settings.maintenanceMode !== undefined) {
      const { setMaintenanceMode } = require('./middleware');
      setMaintenanceMode(settings.maintenanceMode);
    }

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'SYSTEM_SETTINGS_UPDATED',
      resource: 'Settings',
      details: settings,
    });

    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    });
  } catch (error) {
    logger.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system settings',
      error: error.message,
    });
  }
};

// @desc    Backup database
// @route   POST /api/admin/backup
// @access  Private (Super Admin)
exports.backupDatabase = async (req, res) => {
  try {
    const { backupDatabase } = require('./backup');
    const result = await backupDatabase();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'DATABASE_BACKUP',
      resource: 'Database',
      details: result,
    });

    res.json({
      success: true,
      data: result,
      message: 'Database backup created successfully',
    });
  } catch (error) {
    logger.error('Backup database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backup database',
      error: error.message,
    });
  }
};

// @desc    Restore database
// @route   POST /api/admin/restore
// @access  Private (Super Admin)
exports.restoreDatabase = async (req, res) => {
  try {
    const { backupFile } = req.body;
    const { restoreDatabase } = require('./backup');
    const result = await restoreDatabase(backupFile);

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'DATABASE_RESTORE',
      resource: 'Database',
      details: result,
    });

    res.json({
      success: true,
      data: result,
      message: 'Database restored successfully',
    });
  } catch (error) {
    logger.error('Restore database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore database',
      error: error.message,
    });
  }
};

// ============================================
// STAFF / HR CONTROLLERS
// ============================================

// @desc    Get all staff
// @route   GET /api/staff
// @access  Private (Admin/HR)
exports.getStaff = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';

    const staff = await Staff.find(query)
      .populate('userId', 'fullName email phone profileImage')
      .populate('supervisor', 'userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Staff.countDocuments(query);

    res.json({
      success: true,
      data: staff,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff',
      error: error.message,
    });
  }
};

// @desc    Get staff member
// @route   GET /api/staff/:id
// @access  Private (Admin/HR)
exports.getStaffMember = async (req, res) => {
  try {
    const staff = await Staff.findOne({ staffId: req.params.id })
      .populate('userId', 'fullName email phone profileImage')
      .populate('supervisor', 'userId');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    logger.error('Get staff member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff member',
      error: error.message,
    });
  }
};

// @desc    Create staff
// @route   POST /api/staff
// @access  Private (Admin/HR)
exports.createStaff = async (req, res) => {
  try {
    const { userId, ...staffData } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const staff = await Staff.create({
      userId,
      ...staffData,
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'STAFF_CREATED',
      resource: 'Staff',
      resourceId: staff._id,
    });

    res.status(201).json({
      success: true,
      data: staff,
      message: 'Staff member created successfully',
    });
  } catch (error) {
    logger.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create staff member',
      error: error.message,
    });
  }
};

// @desc    Update staff
// @route   PUT /api/staff/:id
// @access  Private (Admin/HR)
exports.updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findOne({ staffId: req.params.id });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    const updatedStaff = await Staff.findByIdAndUpdate(
      staff._id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'STAFF_UPDATED',
      resource: 'Staff',
      resourceId: staff._id,
    });

    res.json({
      success: true,
      data: updatedStaff,
      message: 'Staff member updated successfully',
    });
  } catch (error) {
    logger.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff member',
      error: error.message,
    });
  }
};

// @desc    Delete staff
// @route   DELETE /api/staff/:id
// @access  Private (Admin)
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findOne({ staffId: req.params.id });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    staff.isActive = false;
    await staff.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'STAFF_DELETED',
      resource: 'Staff',
      resourceId: staff._id,
    });

    res.json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  } catch (error) {
    logger.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff member',
      error: error.message,
    });
  }
};

// @desc    Get attendance
// @route   GET /api/attendance
// @access  Private (Admin/HR)
exports.getAttendance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const staff = await Staff.find(query)
      .populate('userId', 'fullName')
      .select('attendance');

    const attendance = staff.map(s => ({
      staffId: s.staffId,
      name: s.userId.fullName,
      records: s.attendance || [],
    }));

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    logger.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message,
    });
  }
};

// @desc    Mark attendance
// @route   POST /api/attendance
// @access  Private (HR)
exports.markAttendance = async (req, res) => {
  try {
    const { staffId, date, checkIn, checkOut, status, notes } = req.body;

    const staff = await Staff.findOne({ staffId });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    const attendanceRecord = {
      date: new Date(date),
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      status: status || 'present',
      notes,
    };

    staff.attendance.push(attendanceRecord);
    await staff.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'ATTENDANCE_MARKED',
      resource: 'Staff',
      resourceId: staff._id,
    });

    res.json({
      success: true,
      data: attendanceRecord,
      message: 'Attendance marked successfully',
    });
  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message,
    });
  }
};

// @desc    Get payroll
// @route   GET /api/payroll
// @access  Private (Admin/HR)
exports.getPayroll = async (req, res) => {
  try {
    const staff = await Staff.find({ isActive: true })
      .populate('userId', 'fullName');

    const payroll = staff.map(s => ({
      staffId: s.staffId,
      name: s.userId.fullName,
      salary: s.salary || { amount: 0, currency: 'ETB' },
      department: s.department,
      employmentType: s.employmentType,
      isActive: s.isActive,
    }));

    res.json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    logger.error('Get payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll',
      error: error.message,
    });
  }
};

// ============================================
// AMBULANCE CONTROLLERS
// ============================================

// @desc    Get ambulance requests
// @route   GET /api/ambulance
// @access  Private
exports.getAmbulanceRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const requests = await AmbulanceTrip.find(query)
      .populate('ambulance', 'ambulanceId vehicleNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AmbulanceTrip.countDocuments(query);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get ambulance requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ambulance requests',
      error: error.message,
    });
  }
};

// @desc    Get ambulance request
// @route   GET /api/ambulance/:id
// @access  Private
exports.getAmbulanceRequest = async (req, res) => {
  try {
    const request = await AmbulanceTrip.findOne({ tripId: req.params.id })
      .populate('ambulance', 'ambulanceId vehicleNumber')
      .populate('crew', 'userId');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Ambulance request not found',
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    logger.error('Get ambulance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ambulance request',
      error: error.message,
    });
  }
};

// @desc    Create ambulance request
// @route   POST /api/ambulance
// @access  Public/Private
exports.createAmbulanceRequest = async (req, res) => {
  try {
    const { patientName, patientPhone, pickupLocation, priority, ...tripData } = req.body;

    const ambulanceTrip = await AmbulanceTrip.create({
      patientName,
      patientPhone,
      pickupLocation,
      priority: priority || 'medium',
      status: 'pending',
      ...tripData,
    });

    // Find available ambulance
    const availableAmbulance = await Ambulance.findOne({ status: 'available' });
    if (availableAmbulance) {
      ambulanceTrip.ambulance = availableAmbulance._id;
      ambulanceTrip.status = 'dispatched';
      ambulanceTrip.dispatchedAt = new Date();
      await ambulanceTrip.save();

      availableAmbulance.status = 'on-call';
      availableAmbulance.currentTrip = ambulanceTrip._id;
      await availableAmbulance.save();

      await Notification.create({
        userId: availableAmbulance.driver,
        type: 'alert',
        title: 'Emergency Dispatch',
        message: `Emergency request for ${patientName} at ${pickupLocation.address}`,
        priority: 'urgent',
      });
    }

    await AuditLog.create({
      userId: req.user ? req.user._id : null,
      userRole: req.user ? req.user.role : 'public',
      action: 'AMBULANCE_REQUESTED',
      resource: 'AmbulanceTrip',
      resourceId: ambulanceTrip._id,
    });

    res.status(201).json({
      success: true,
      data: ambulanceTrip,
      message: 'Ambulance request submitted successfully',
    });
  } catch (error) {
    logger.error('Create ambulance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit ambulance request',
      error: error.message,
    });
  }
};

// @desc    Update ambulance status
// @route   PATCH /api/ambulance/:id/status
// @access  Private (Ambulance)
exports.updateAmbulanceStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const trip = await AmbulanceTrip.findOne({ tripId: req.params.id });
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Ambulance trip not found',
      });
    }

    trip.status = status;
    if (status === 'arrived') {
      trip.arrivedAtDestination = new Date();
    }
    if (status === 'completed') {
      trip.completedAt = new Date();
    }
    await trip.save();

    // Update ambulance status if trip is completed
    if (status === 'completed' && trip.ambulance) {
      const ambulance = await Ambulance.findById(trip.ambulance);
      if (ambulance) {
        ambulance.status = 'available';
        ambulance.currentTrip = null;
        await ambulance.save();
      }
    }

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'AMBULANCE_STATUS_UPDATED',
      resource: 'AmbulanceTrip',
      resourceId: trip._id,
      details: { status },
    });

    res.json({
      success: true,
      data: trip,
      message: 'Ambulance status updated successfully',
    });
  } catch (error) {
    logger.error('Update ambulance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ambulance status',
      error: error.message,
    });
  }
};

// @desc    Dispatch ambulance
// @route   PATCH /api/ambulance/:id/dispatch
// @access  Private (Ambulance)
exports.dispatchAmbulance = async (req, res) => {
  try {
    const { ambulanceId, crew } = req.body;

    const trip = await AmbulanceTrip.findOne({ tripId: req.params.id });
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Ambulance trip not found',
      });
    }

    const ambulance = await Ambulance.findOne({ ambulanceId });
    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message: 'Ambulance not found',
      });
    }

    trip.ambulance = ambulance._id;
    trip.crew = crew || [];
    trip.status = 'dispatched';
    trip.dispatchedAt = new Date();
    await trip.save();

    ambulance.status = 'on-call';
    ambulance.currentTrip = trip._id;
    await ambulance.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'AMBULANCE_DISPATCHED',
      resource: 'AmbulanceTrip',
      resourceId: trip._id,
    });

    res.json({
      success: true,
      data: trip,
      message: 'Ambulance dispatched successfully',
    });
  } catch (error) {
    logger.error('Dispatch ambulance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch ambulance',
      error: error.message,
    });
  }
};

// ============================================
// COMMUNICATION CONTROLLERS
// ============================================

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { to, subject, content, type } = req.body;

    const message = {
      from: req.user._id,
      to,
      subject,
      content,
      type: type || 'chat',
      sentAt: new Date(),
      isRead: false,
    };

    // Store in database (would need a Message model)
    // For now, just create notification
    await Notification.create({
      userId: to,
      type: 'message',
      title: subject || 'New Message',
      message: content,
      priority: 'medium',
    });

    // Emit via socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${to}`).emit('new_message', message);
    }

    res.json({
      success: true,
      data: message,
      message: 'Message sent successfully',
    });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

// @desc    Get messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    // Get messages from database
    // For now, return empty array
    res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message,
    });
  }
};

// ============================================
// AI CONTROLLERS
// ============================================

// @desc    AI Chat
// @route   POST /api/ai/chat
// @access  Private
exports.aiChat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Try to use Gemini AI
    let reply = "I'm here to help! You can ask me about appointments, doctors, medicines, laboratory services, insurance, or emergency services.";

    try {
      const { aiChat } = require('./ai');
      reply = await aiChat(message, { userId: req.user._id, role: req.user.role });
    } catch (aiError) {
      logger.error('AI chat error:', aiError);
      
      // Fallback responses
      const responses = {
        'appointment': 'You can book an appointment through the appointments page. Would you like me to help you schedule one?',
        'emergency': 'For emergencies, please call our emergency hotline or use the ambulance service. I can dispatch an ambulance for you if needed.',
        'medicine': 'Our pharmacy is open 24/7. You can check medicine availability and refill prescriptions online.',
        'doctor': 'Our medical team includes specialists in cardiology, neurology, orthopedics, and more. You can view doctor profiles and book appointments.',
        'lab': 'Our laboratory offers comprehensive testing services including blood work, imaging, and pathology.',
        'insurance': 'We accept most major insurance plans. You can check your coverage in your patient portal.',
      };

      for (const [key, value] of Object.entries(responses)) {
        if (message.toLowerCase().includes(key)) {
          reply = value;
          break;
        }
      }
    }

    res.json({
      success: true,
      data: {
        message: reply,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: 'AI service temporarily unavailable',
      error: error.message,
    });
  }
};

// @desc    AI Symptom Check
// @route   POST /api/ai/symptom-check
// @access  Public
exports.aiSymptomCheck = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({
        success: false,
        message: 'Symptoms description is required',
      });
    }

    let advice = "Based on your symptoms, it's recommended to consult with a doctor for proper diagnosis. This is not medical advice.";
    let severity = 'moderate';
    let recommendation = 'consult a doctor';

    try {
      const { symptomCheck } = require('./ai');
      advice = await symptomCheck(symptoms);
    } catch (aiError) {
      logger.error('AI symptom check error:', aiError);
      
      // Fallback
      const commonSymptoms = {
        fever: 'May indicate infection. Please monitor your temperature and consult a doctor if it persists.',
        headache: 'Common causes include stress, dehydration, or tension. Rest and hydration may help.',
        cough: 'Could be due to allergies, cold, or respiratory infection. Seek medical attention if persistent.',
        fatigue: 'Often related to sleep issues, stress, or underlying conditions. Please consult a healthcare provider.',
        'chest pain': '⚠️ URGENT: Please seek immediate medical attention. This could be a sign of a heart condition.',
      };

      for (const [key, value] of Object.entries(commonSymptoms)) {
        if (symptoms.toLowerCase().includes(key)) {
          advice = value;
          break;
        }
      }
    }

    if (symptoms.toLowerCase().includes('chest pain')) {
      severity = 'emergency';
      recommendation = 'seek immediate emergency care';
    }

    res.json({
      success: true,
      data: {
        symptoms,
        advice,
        disclaimer: "This is for informational purposes only and does not constitute medical advice.",
        severity,
        recommendation,
      },
    });
  } catch (error) {
    logger.error('AI symptom check error:', error);
    res.status(500).json({
      success: false,
      message: 'Symptom check failed',
      error: error.message,
    });
  }
};

// @desc    AI Summarize
// @route   POST /api/ai/summarize
// @access  Private
exports.aiSummarize = async (req, res) => {
  try {
    const { text, type } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text to summarize is required',
      });
    }

    let summary = "Unable to generate summary at this time.";

    try {
      const { summarizeReport } = require('./ai');
      summary = await summarizeReport(text, type || 'general');
    } catch (aiError) {
      logger.error('AI summarize error:', aiError);
      summary = text.substring(0, 200) + '...';
    }

    res.json({
      success: true,
      data: {
        summary,
        originalLength: text.length,
        summaryLength: summary.length,
      },
    });
  } catch (error) {
    logger.error('AI summarize error:', error);
    res.status(500).json({
      success: false,
      message: 'Summarization failed',
      error: error.message,
    });
  }
};

// ============================================
// UPLOAD CONTROLLERS
// ============================================

// @desc    Upload file
// @route   POST /api/upload
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'FILE_UPLOADED',
      resource: 'File',
      details: {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        url: fileUrl,
      },
      message: 'File uploaded successfully',
    });
  } catch (error) {
    logger.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message,
    });
  }
};

// @desc    Delete file
// @route   DELETE /api/upload/:id
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const { deleteFile } = require('./upload');
    const filePath = req.params.id;
    
    const deleted = deleteFile(filePath);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'FILE_DELETED',
      resource: 'File',
      details: { filePath },
    });

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'File deletion failed',
      error: error.message,
    });
  }
};

// ============================================
// SEARCH CONTROLLER
// ============================================

// @desc    Global search
// @route   GET /api/search
// @access  Private
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const [patients, doctors, appointments, medicines] = await Promise.all([
      Patient.find({
        $or: [
          { mrn: { $regex: q, $options: 'i' } },
          { patientId: { $regex: q, $options: 'i' } },
          { 'userId.fullName': { $regex: q, $options: 'i' } },
        ],
      })
        .populate('userId', 'fullName email phone')
        .limit(5),

      Doctor.find({
        $or: [
          { doctorId: { $regex: q, $options: 'i' } },
          { specialization: { $regex: q, $options: 'i' } },
          { 'userId.fullName': { $regex: q, $options: 'i' } },
        ],
      })
        .populate('userId', 'fullName email phone')
        .limit(5),

      Appointment.find({
        $or: [
          { appointmentId: { $regex: q, $options: 'i' } },
          { reason: { $regex: q, $options: 'i' } },
        ],
      })
        .populate('patient', 'patientId')
        .populate('doctor', 'doctorId')
        .limit(5),

      Medicine.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { genericName: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
        ],
      }).limit(5),
    ]);

    res.json({
      success: true,
      data: {
        patients,
        doctors,
        appointments,
        medicines,
      },
    });
  } catch (error) {
    logger.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message,
    });
  }
};

// ============================================
// REPORT CONTROLLERS
// ============================================

// @desc    Generate report
// @route   POST /api/reports/generate
// @access  Private
exports.generateReport = async (req, res) => {
  try {
    const { type, startDate, endDate, format } = req.body;

    let data = [];
    let reportName = '';

    switch (type) {
      case 'patients':
        data = await Patient.find({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        }).populate('userId', 'fullName');
        reportName = 'Patient Report';
        break;

      case 'appointments':
        data = await Appointment.find({
          date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        })
          .populate('patient', 'patientId')
          .populate('doctor', 'doctorId');
        reportName = 'Appointment Report';
        break;

      case 'revenue':
        data = await Invoice.find({
          issuedDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
          paymentStatus: 'paid',
        });
        reportName = 'Revenue Report';
        break;

      case 'pharmacy':
        data = await Prescription.find({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        })
          .populate('patient', 'patientId')
          .populate('doctor', 'doctorId');
        reportName = 'Pharmacy Report';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type',
        });
    }

    res.json({
      success: true,
      data: {
        name: reportName,
        type,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        total: data.length,
        data,
      },
      message: 'Report generated successfully',
    });
  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message,
    });
  }
};

// @desc    Export report
// @route   GET /api/reports/export/:id
// @access  Private
exports.exportReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    // Get report data
    // For now, return JSON
    const report = {
      id,
      format: format || 'json',
      generatedAt: new Date().toISOString(),
      data: {},
    };

    res.json({
      success: true,
      data: report,
      message: 'Report exported successfully',
    });
  } catch (error) {
    logger.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message,
    });
  }
};

// ============================================
// WEBSITE PUBLIC CONTROLLERS
// ============================================

// @desc    Get departments
// @route   GET /api/website/departments
// @access  Public
exports.getDepartments = async (req, res) => {
  try {
    const departments = [
      { id: '1', name: 'Emergency', icon: '🚨', description: '24/7 emergency care' },
      { id: '2', name: 'Cardiology', icon: '❤️', description: 'Heart care' },
      { id: '3', name: 'Neurology', icon: '🧠', description: 'Brain and nervous system' },
      { id: '4', name: 'Orthopedics', icon: '🦴', description: 'Bone and joint care' },
      { id: '5', name: 'Pediatrics', icon: '👶', description: 'Child care' },
      { id: '6', name: 'Gynecology', icon: '👩', description: 'Women\'s health' },
    ];

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    logger.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message,
    });
  }
};

// @desc    Get services
// @route   GET /api/website/services
// @access  Public
exports.getServices = async (req, res) => {
  try {
    const services = [
      { id: '1', name: 'Emergency Services', description: '24/7 emergency care' },
      { id: '2', name: 'Laboratory', description: 'Comprehensive lab testing' },
      { id: '3', name: 'Pharmacy', description: '24/7 pharmacy services' },
      { id: '4', name: 'Radiology', description: 'X-ray, CT, MRI, Ultrasound' },
      { id: '5', name: 'Ambulance', description: 'Emergency transportation' },
      { id: '6', name: 'Surgery', description: 'Modern surgical services' },
    ];

    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    logger.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message,
    });
  }
};

// @desc    Get news
// @route   GET /api/website/news
// @access  Public
exports.getNews = async (req, res) => {
  try {
    const news = [
      { 
        id: '1', 
        title: 'New MRI Machine Installed', 
        summary: 'We are proud to announce...',
        createdAt: new Date().toISOString(),
      },
      { 
        id: '2', 
        title: 'Community Health Camp', 
        summary: 'Free health checkup camp...',
        createdAt: new Date().toISOString(),
      },
    ];

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    logger.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news',
      error: error.message,
    });
  }
};

// @desc    Get gallery
// @route   GET /api/website/gallery
// @access  Public
exports.getGallery = async (req, res) => {
  try {
    const gallery = [
      { id: '1', title: 'Hospital Building', image: '/assets/gallery/hospital.jpg' },
      { id: '2', title: 'Emergency Ward', image: '/assets/gallery/emergency.jpg' },
    ];

    res.json({
      success: true,
      data: gallery,
    });
  } catch (error) {
    logger.error('Get gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery',
      error: error.message,
    });
  }
};

// ============================================
// ANALYTICS CONTROLLERS
// ============================================

// @desc    Get analytics
// @route   GET /api/analytics
// @access  Private (Admin)
exports.getAnalytics = async (req, res) => {
  try {
    const analytics = {
      patientStats: {
        total: await Patient.countDocuments(),
        newThisMonth: await Patient.countDocuments({
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        }),
        active: await Patient.countDocuments({ isActive: true }),
      },
      appointmentStats: {
        total: await Appointment.countDocuments(),
        today: await Appointment.countDocuments({
          date: { $gte: new Date().setHours(0, 0, 0, 0), $lte: new Date().setHours(23, 59, 59, 999) },
        }),
        pending: await Appointment.countDocuments({ status: 'pending' }),
      },
      revenueStats: {
        total: (await Invoice.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]))[0]?.total || 0,
        thisMonth: (await Invoice.aggregate([
          {
            $match: {
              paymentStatus: 'paid',
              paymentDate: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]))[0]?.total || 0,
      },
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
};

// @desc    Get metrics
// @route   GET /api/analytics/metrics
// @access  Private
exports.getMetrics = async (req, res) => {
  try {
    const metrics = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      },
      database: {
        connected: mongoose.connection.readyState === 1,
        name: mongoose.connection.name,
        collections: (await mongoose.connection.db.listCollections().toArray()).length,
      },
    };

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message,
    });
  }
};
