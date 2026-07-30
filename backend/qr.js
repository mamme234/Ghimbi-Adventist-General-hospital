// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// QR CODE GENERATOR
// ============================================

const QRCode = require('qrcode');
const logger = require('./logger');

// Generate QR code as Data URL
exports.generateQR = async (data) => {
  try {
    const qrData = typeof data === 'string' ? data : JSON.stringify(data);
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
    });
    return qrCode;
  } catch (error) {
    logger.error('QR generation error:', error);
    throw error;
  }
};

// Generate QR code as Buffer
exports.generateQRBuffer = async (data) => {
  try {
    const qrData = typeof data === 'string' ? data : JSON.stringify(data);
    const qrBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
    });
    return qrBuffer;
  } catch (error) {
    logger.error('QR buffer generation error:', error);
    throw error;
  }
};

// Generate QR code as File
exports.generateQRFile = async (data, filePath) => {
  try {
    const qrData = typeof data === 'string' ? data : JSON.stringify(data);
    await QRCode.toFile(filePath, qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
    });
    return filePath;
  } catch (error) {
    logger.error('QR file generation error:', error);
    throw error;
  }
};

// Generate QR code for patient
exports.generatePatientQR = async (patient) => {
  try {
    const qrData = {
      patientId: patient.patientId,
      mrn: patient.mrn,
      name: patient.userId?.fullName || patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      bloodGroup: patient.bloodGroup,
      hospital: process.env.HOSPITAL_NAME || 'Gimbie Adventist General Hospital',
    };
    return await exports.generateQR(qrData);
  } catch (error) {
    logger.error('Patient QR generation error:', error);
    throw error;
  }
};

// Generate QR code for prescription
exports.generatePrescriptionQR = async (prescription) => {
  try {
    const qrData = {
      prescriptionId: prescription.prescriptionId,
      patientId: prescription.patient?.patientId || prescription.patientId,
      doctorId: prescription.doctor?.doctorId || prescription.doctorId,
      date: prescription.createdAt,
      hospital: process.env.HOSPITAL_NAME || 'Gimbie Adventist General Hospital',
    };
    return await exports.generateQR(qrData);
  } catch (error) {
    logger.error('Prescription QR generation error:', error);
    throw error;
  }
};

// Generate QR code for appointment
exports.generateAppointmentQR = async (appointment) => {
  try {
    const qrData = {
      appointmentId: appointment.appointmentId,
      patientId: appointment.patient?.patientId || appointment.patientId,
      doctorId: appointment.doctor?.doctorId || appointment.doctorId,
      date: appointment.date,
      time: appointment.startTime,
      hospital: process.env.HOSPITAL_NAME || 'Gimbie Adventist General Hospital',
    };
    return await exports.generateQR(qrData);
  } catch (error) {
    logger.error('Appointment QR generation error:', error);
    throw error;
  }
};

// Generate barcode
exports.generateBarcode = async (data) => {
  try {
    // Simple barcode generation (placeholder)
    // In production, use a library like 'bwip-js' or 'jsbarcode'
    const barcode = `BAR-${Date.now()}-${data.substring(0, 6)}`;
    return barcode;
  } catch (error) {
    logger.error('Barcode generation error:', error);
    throw error;
  }
};
