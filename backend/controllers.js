// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// CONTROLLERS - ALL BUSINESS LOGIC
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

const { sendEmail, sendSMS, sendPushNotification } = require('./mail');
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
    user.verifyEmailExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send verification email
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
        user.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
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
      profile = await Patient.findOne({ userId: user._id });
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ userId: user._id });
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
    user.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email
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

// @desc    Generate QR login
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
      ];
    }

    const patients = await Patient.find(query)
      .populate('userId', 'fullName email phone profileImage')
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

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate MRN
    const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`;

    const patient = await Patient.create({
      userId,
      mrn,
      registeredBy: req.user._id,
      ...patientData,
    });

    // Generate QR code
    const qrData = JSON.stringify({
      patientId: patient.patientId,
      mrn: patient.mrn,
      name: user.fullName,
    });
    const qrCode = await QRCode.toDataURL(qrData);
    patient.qrCode = qrCode;
    await patient.save();

    // Create notification
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

// @desc    Search patients
// @route   GET /api/patients/search
// @access  Private
exports.searchPatients = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query required',
      });
    }

    const patients = await Patient.find({
      $or: [
        { 'userId.fullName': { $regex: q, $options: 'i' } },
        { mrn: { $regex: q, $options: 'i' } },
        { patientId: { $regex: q, $options: 'i' } },
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

    // Check if doctor already exists
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

    // Update user role to doctor
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

// ============================================
// APPOINTMENT CONTROLLERS
// ============================================

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, startTime, reason, ...appointmentData } = req.body;

    // Check patient exists
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Check doctor exists
    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Check if doctor is available at this time
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

    // Calculate end time (30 min default)
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

    // Send SMS if enabled
    if (user.phone) {
      await sendSMS({
        to: user.phone,
        message: `Gimbie Hospital: Appt confirmed with Dr. ${doctor.userId.fullName} on ${new Date(date).toLocaleDateString()} at ${startTime}.`,
      });
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

// @desc    Get appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
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

// ============================================
// PRESCRIPTION CONTROLLERS
// ============================================

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

    // Process medicines
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
        quantity: med.quantity,
        instructions: med.instructions,
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

    // Notify patient and pharmacy
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

// @desc    Verify prescription (Pharmacy)
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

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor && req.user.role !== 'laboratory') {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found',
      });
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

    // Generate barcode
    labTest.barcode = await generateBarcode(labTest.testId);
    await labTest.save();

    // Notify patient
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

// @desc    Process lab test results
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

      // Notify doctor
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

// ============================================
// RADIOLOGY CONTROLLERS
// ============================================

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

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor && req.user.role !== 'radiologist') {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found',
      });
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

// ============================================
// FINANCE / INVOICE CONTROLLERS
// ============================================

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

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const total = item.quantity * item.unitPrice;
      subtotal += total;
      return { ...item, totalPrice: total };
    });

    const tax = subtotal * 0.15; // 15% VAT
    const totalAmount = subtotal + tax - (invoiceData.discount || 0);

    const invoice = await Invoice.create({
      patient: patient._id,
      patientName: req.body.patientName || patient.userId.fullName,
      items: processedItems,
      subtotal,
      tax,
      discount: invoiceData.discount || 0,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      issuedBy: req.user._id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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

// ============================================
// AMBULANCE CONTROLLERS
// ============================================

// @desc    Create ambulance request
// @route   POST /api/ambulance
// @access  Public
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

      // Notify ambulance team
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

// ============================================
// ADMIN / DASHBOARD CONTROLLERS
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
        occupancyRate: '65%', // Placeholder - would need bed data
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

// ============================================
// AI CONTROLLERS
// ============================================

// @desc    AI Chat assistant
// @route   POST /api/ai/chat
// @access  Private
exports.aiChat = async (req, res) => {
  try {
    const { message } = req.body;

    // Simple AI responses for demo
    const responses = {
      'appointment': 'You can book an appointment through the appointments page. Would you like me to help you schedule one?',
      'emergency': 'For emergencies, please call our emergency hotline or use the ambulance service. I can dispatch an ambulance for you if needed.',
      'medicine': 'Our pharmacy is open 24/7. You can check medicine availability and refill prescriptions online.',
      'doctor': 'Our medical team includes specialists in cardiology, neurology, orthopedics, and more. You can view doctor profiles and book appointments.',
      'lab': 'Our laboratory offers comprehensive testing services including blood work, imaging, and pathology.',
      'insurance': 'We accept most major insurance plans. You can check your coverage in your patient portal.',
    };

    let reply = "I'm here to help! You can ask me about appointments, doctors, medicines, laboratory services, insurance, or emergency services.";

    for (const [key, value] of Object.entries(responses)) {
      if (message.toLowerCase().includes(key)) {
        reply = value;
        break;
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

// @desc    AI Symptom checker
// @route   POST /api/ai/symptom-check
// @access  Public
exports.aiSymptomCheck = async (req, res) => {
  try {
    const { symptoms } = req.body;

    // Simple symptom checker (informational only)
    const commonSymptoms = {
      fever: 'May indicate infection. Please monitor your temperature and consult a doctor if it persists.',
      headache: 'Common causes include stress, dehydration, or tension. Rest and hydration may help.',
      cough: 'Could be due to allergies, cold, or respiratory infection. Seek medical attention if persistent.',
      fatigue: 'Often related to sleep issues, stress, or underlying conditions. Please consult a healthcare provider.',
      'chest pain': '⚠️ URGENT: Please seek immediate medical attention. This could be a sign of a heart condition.',
    };

    let advice = "Based on your symptoms, it's recommended to consult with a doctor for proper diagnosis. This is not medical advice.";

    for (const [key, value] of Object.entries(commonSymptoms)) {
      if (symptoms.toLowerCase().includes(key)) {
        advice = value;
        break;
      }
    }

    res.json({
      success: true,
      data: {
        symptoms,
        advice,
        disclaimer: "This is for informational purposes only and does not constitute medical advice.",
        severity: symptoms.includes('chest pain') ? 'emergency' : 'moderate',
        recommendation: symptoms.includes('chest pain') ? 'seek immediate emergency care' : 'consult a doctor',
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

// ============================================
// SEARCH CONTROLLER
// ============================================

// @desc    Global search
// @route   GET /api/search
// @access  Private
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query required',
      });
    }

    const [patients, doctors, appointments, medicines] = await Promise.all([
      Patient.find({
        $or: [
          { mrn: { $regex: q, $options: 'i' } },
          { patientId: { $regex: q, $options: 'i' } },
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

// ============================================
// PLACEHOLDER CONTROLLERS
// ============================================

// These will be expanded as needed
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.refreshToken = async (req, res) => {
  res.json({ success: true, message: 'Token refreshed' });
};

exports.verify2FA = async (req, res) => {
  res.json({ success: true, message: '2FA verified' });
};

exports.updatePatient = async (req, res) => {
  res.json({ success: true, message: 'Patient updated' });
};

exports.deletePatient = async (req, res) => {
  res.json({ success: true, message: 'Patient deleted' });
};

exports.updateDoctor = async (req, res) => {
  res.json({ success: true, message: 'Doctor updated' });
};

exports.deleteDoctor = async (req, res) => {
  res.json({ success: true, message: 'Doctor deleted' });
};

exports.getAppointment = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updateAppointment = async (req, res) => {
  res.json({ success: true, message: 'Appointment updated' });
};

exports.confirmAppointment = async (req, res) => {
  res.json({ success: true, message: 'Appointment confirmed' });
};

exports.rescheduleAppointment = async (req, res) => {
  res.json({ success: true, message: 'Appointment rescheduled' });
};

exports.getAppointmentsByPatient = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getAppointmentsByDoctor = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getPrescriptions = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getPrescription = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updatePrescription = async (req, res) => {
  res.json({ success: true, message: 'Prescription updated' });
};

exports.dispensePrescription = async (req, res) => {
  res.json({ success: true, message: 'Prescription dispensed' });
};

exports.getLabTests = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getLabTest = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updateLabTest = async (req, res) => {
  res.json({ success: true, message: 'Lab test updated' });
};

exports.getLabResults = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.getRadiologyTests = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getRadiologyTest = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updateRadiologyTest = async (req, res) => {
  res.json({ success: true, message: 'Radiology test updated' });
};

exports.getRadiologyResults = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.getMedicine = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.createMedicine = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updateMedicine = async (req, res) => {
  res.json({ success: true, message: 'Medicine updated' });
};

exports.deleteMedicine = async (req, res) => {
  res.json({ success: true, message: 'Medicine deleted' });
};

exports.getInventory = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.updateInventory = async (req, res) => {
  res.json({ success: true, message: 'Inventory updated' });
};

exports.getInvoices = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getInvoice = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updateInvoice = async (req, res) => {
  res.json({ success: true, message: 'Invoice updated' });
};

exports.getRevenue = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.getStaff = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getStaffMember = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.createStaff = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updateStaff = async (req, res) => {
  res.json({ success: true, message: 'Staff updated' });
};

exports.deleteStaff = async (req, res) => {
  res.json({ success: true, message: 'Staff deleted' });
};

exports.getAttendance = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.markAttendance = async (req, res) => {
  res.json({ success: true, message: 'Attendance marked' });
};

exports.getPayroll = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.getAmbulanceRequests = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getAmbulanceRequest = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updateAmbulanceStatus = async (req, res) => {
  res.json({ success: true, message: 'Ambulance status updated' });
};

exports.dispatchAmbulance = async (req, res) => {
  res.json({ success: true, message: 'Ambulance dispatched' });
};

exports.getAuditLogs = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getSystemSettings = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.updateSystemSettings = async (req, res) => {
  res.json({ success: true, message: 'Settings updated' });
};

exports.backupDatabase = async (req, res) => {
  res.json({ success: true, message: 'Backup created' });
};

exports.restoreDatabase = async (req, res) => {
  res.json({ success: true, message: 'Database restored' });
};

exports.getAnalytics = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.getMetrics = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.aiSummarize = async (req, res) => {
  res.json({ success: true, data: {} });
};

exports.sendMessage = async (req, res) => {
  res.json({ success: true, message: 'Message sent' });
};

exports.getMessages = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.uploadFile = async (req, res) => {
  res.json({ success: true, data: { file: req.file } });
};

exports.deleteFile = async (req, res) => {
  res.json({ success: true, message: 'File deleted' });
};

exports.exportReport = async (req, res) => {
  res.json({ success: true, message: 'Report exported' });
};

exports.getDepartments = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getServices = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getNews = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getGallery = async (req, res) => {
  res.json({ success: true, data: [] });
};
