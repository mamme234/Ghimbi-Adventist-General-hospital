// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// SMS SERVICE
// ============================================

const logger = require('./logger');

// Send SMS (placeholder - integrate with actual SMS provider)
exports.sendSMS = async ({ to, message }) => {
  try {
    // In production, use Twilio, AfricasTalking, or other SMS provider
    logger.info(`SMS sent to ${to}: ${message}`);
    return {
      success: true,
      messageId: `SMS-${Date.now()}`,
      to,
      message,
    };
  } catch (error) {
    logger.error('SMS send error:', error);
    throw error;
  }
};

// Send appointment reminder SMS
exports.sendAppointmentReminder = async (to, appointmentData) => {
  const { patientName, doctorName, date, time } = appointmentData;
  const message = `Gimbie Hospital Reminder: ${patientName}, your appointment with Dr. ${doctorName} is on ${date} at ${time}. Please arrive 15 minutes early.`;
  return exports.sendSMS({ to, message });
};

// Send prescription ready SMS
exports.sendPrescriptionReady = async (to, prescriptionData) => {
  const { patientName, prescriptionId } = prescriptionData;
  const message = `Gimbie Hospital: ${patientName}, your prescription #${prescriptionId} is ready for pickup at the pharmacy.`;
  return exports.sendSMS({ to, message });
};

// Send lab result SMS
exports.sendLabResultReady = async (to, labData) => {
  const { patientName, testName } = labData;
  const message = `Gimbie Hospital: ${patientName}, your ${testName} lab results are ready. Please check your patient portal.`;
  return exports.sendSMS({ to, message });
};

// Send emergency alert SMS
exports.sendEmergencyAlert = async (to, emergencyData) => {
  const { patientName, location, priority } = emergencyData;
  const message = `🚨 Gimbie Hospital EMERGENCY: ${patientName} at ${location}. Priority: ${priority}. Please respond immediately.`;
  return exports.sendSMS({ to, message });
};

// Send OTP SMS
exports.sendOTP = async (to, otp) => {
  const message = `Gimbie Hospital: Your OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`;
  return exports.sendSMS({ to, message });
};

// Send welcome SMS
exports.sendWelcomeSMS = async (to, patientName) => {
  const message = `Welcome to Gimbie Adventist General Hospital, ${patientName}! We're here to provide you with quality healthcare. Visit our website at ${process.env.FRONTEND_URL} to manage your health.`;
  return exports.sendSMS({ to, message });
};
