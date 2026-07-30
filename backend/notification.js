// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// NOTIFICATION SERVICE
// ============================================

const { Notification } = require('./models');
const { sendEmail, sendSMS } = require('./mail');
const logger = require('./logger');

// Create notification
exports.createNotification = async ({ userId, type, title, message, data, priority, channel }) => {
  try {
    const notification = await Notification.create({
      userId,
      type: type || 'system',
      title,
      message,
      data,
      priority: priority || 'medium',
      channel: channel || 'in-app',
    });
    
    // Send via email if requested
    if (channel === 'email' || channel === 'both') {
      await sendEmail({
        to: userId.email,
        subject: title,
        html: `<h3>${title}</h3><p>${message}</p>`,
      });
    }
    
    // Send via SMS if requested
    if (channel === 'sms' || channel === 'both') {
      await sendSMS({
        to: userId.phone,
        message: `${title}: ${message}`,
      });
    }
    
    return notification;
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
};

// Send appointment reminder
exports.sendAppointmentReminder = async (appointment) => {
  try {
    const { patient, doctor, date, startTime } = appointment;
    const user = await User.findById(patient.userId);
    
    const notification = await exports.createNotification({
      userId: user._id,
      type: 'appointment',
      title: 'Appointment Reminder',
      message: `Reminder: Your appointment with Dr. ${doctor.userId.fullName} is on ${new Date(date).toLocaleDateString()} at ${startTime}.`,
      priority: 'high',
      channel: 'both',
    });
    
    return notification;
  } catch (error) {
    logger.error('Appointment reminder error:', error);
    throw error;
  }
};

// Send prescription notification
exports.sendPrescriptionNotification = async (prescription) => {
  try {
    const { patient, doctor } = prescription;
    const user = await User.findById(patient.userId);
    
    const notification = await exports.createNotification({
      userId: user._id,
      type: 'system',
      title: 'New Prescription',
      message: `Dr. ${doctor.userId.fullName} has issued a new prescription for you.`,
      priority: 'medium',
      channel: 'email',
    });
    
    return notification;
  } catch (error) {
    logger.error('Prescription notification error:', error);
    throw error;
  }
};

// Send lab result notification
exports.sendLabResultNotification = async (labTest) => {
  try {
    const { patient } = labTest;
    const user = await User.findById(patient.userId);
    
    const notification = await exports.createNotification({
      userId: user._id,
      type: 'system',
      title: 'Lab Results Ready',
      message: `Your ${labTest.testName} results are ready. Please check your patient portal.`,
      priority: 'high',
      channel: 'both',
    });
    
    return notification;
  } catch (error) {
    logger.error('Lab result notification error:', error);
    throw error;
  }
};

// Send emergency alert
exports.sendEmergencyAlert = async (emergencyData) => {
  try {
    const notification = await exports.createNotification({
      userId: emergencyData.userId,
      type: 'alert',
      title: '🚨 EMERGENCY ALERT',
      message: emergencyData.message,
      priority: 'urgent',
      channel: 'sms',
    });
    
    return notification;
  } catch (error) {
    logger.error('Emergency alert error:', error);
    throw error;
  }
};

// Send appointment reminders (bulk)
exports.sendAppointmentReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appointments = await Appointment.find({
      date: {
        $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
        $lte: new Date(tomorrow.setHours(23, 59, 59, 999)),
      },
      status: { $in: ['confirmed', 'pending'] },
      reminderSent: false,
    }).populate('patient doctor');
    
    for (const appointment of appointments) {
      await exports.sendAppointmentReminder(appointment);
      appointment.reminderSent = true;
      await appointment.save();
    }
    
    return { sent: appointments.length };
  } catch (error) {
    logger.error('Bulk appointment reminders error:', error);
    throw error;
  }
};
