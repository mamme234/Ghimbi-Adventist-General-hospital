// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// EMAIL SERVICE - SMTP
// ============================================

const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    logger.error('SMTP connection error:', error);
  } else {
    logger.info('✅ SMTP server ready');
  }
});

// Send email
exports.sendEmail = async ({ to, subject, html, text, attachments }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@gimbiehospital.com',
      to,
      subject,
      html: html || text,
      text: text || html?.replace(/<[^>]*>/g, ''),
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email send error:', error);
    throw error;
  }
};

// Send SMS (placeholder - will use Twilio or other service)
exports.sendSMS = async ({ to, message }) => {
  try {
    logger.info(`SMS sent to ${to}: ${message}`);
    return { success: true, message: 'SMS sent' };
  } catch (error) {
    logger.error('SMS send error:', error);
    throw error;
  }
};

// Send push notification
exports.sendPushNotification = async ({ userId, title, body, data }) => {
  try {
    logger.info(`Push notification sent to ${userId}: ${title}`);
    return { success: true, message: 'Push notification sent' };
  } catch (error) {
    logger.error('Push notification error:', error);
    throw error;
  }
};

// Send appointment confirmation
exports.sendAppointmentConfirmation = async (to, appointmentData) => {
  const { patientName, doctorName, date, time, location } = appointmentData;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a5276; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .button { background: #1a5276; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        table { width: 100%; }
        td { padding: 8px; }
        .label { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Gimbie Adventist General Hospital</h1>
          <h2>Appointment Confirmation</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your appointment has been confirmed.</p>
          <table>
            <tr><td class="label">Doctor:</td><td>${doctorName}</td></tr>
            <tr><td class="label">Date:</td><td>${date}</td></tr>
            <tr><td class="label">Time:</td><td>${time}</td></tr>
            <tr><td class="label">Location:</td><td>${location || 'Gimbie Adventist General Hospital'}</td></tr>
          </table>
          <br>
          <a href="${process.env.FRONTEND_URL}/appointments" class="button">View Appointment</a>
        </div>
        <div class="footer">
          <p>Gimbie Adventist General Hospital | ${process.env.HOSPITAL_PHONE || '+251-XX-XXX-XXXX'}</p>
          <p>${process.env.HOSPITAL_ADDRESS || 'Gimbie, Ethiopia'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return exports.sendEmail({
    to,
    subject: 'Appointment Confirmation - Gimbie Adventist Hospital',
    html,
  });
};

// Send prescription
exports.sendPrescription = async (to, prescriptionData) => {
  const { patientName, doctorName, medicines, date } = prescriptionData;
  
  let medicinesList = medicines.map(m => 
    `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a5276; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f0f0f0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Gimbie Adventist General Hospital</h1>
          <h2>Digital Prescription</h2>
        </div>
        <div class="content">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <h3>Prescribed Medicines</h3>
          <table>
            <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
            ${medicinesList}
          </table>
          <br>
          <a href="${process.env.FRONTEND_URL}/prescriptions" class="button">View Prescription</a>
        </div>
        <div class="footer">
          <p>Gimbie Adventist General Hospital | ${process.env.HOSPITAL_PHONE || '+251-XX-XXX-XXXX'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return exports.sendEmail({
    to,
    subject: 'Your Prescription - Gimbie Adventist Hospital',
    html,
  });
};

// Send lab results
exports.sendLabResults = async (to, labData) => {
  const { patientName, testName, results, date } = labData;
  
  let resultsList = results.map(r => 
    `<tr><td>${r.parameter}</td><td>${r.value}</td><td>${r.unit}</td><td>${r.referenceRange}</td></tr>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a5276; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f0f0f0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Gimbie Adventist General Hospital</h1>
          <h2>Laboratory Results</h2>
        </div>
        <div class="content">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Test:</strong> ${testName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <h3>Results</h3>
          <table>
            <tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Reference Range</th></tr>
            ${resultsList}
          </table>
          <br>
          <a href="${process.env.FRONTEND_URL}/lab-results" class="button">View Full Report</a>
        </div>
        <div class="footer">
          <p>Gimbie Adventist General Hospital | ${process.env.HOSPITAL_PHONE || '+251-XX-XXX-XXXX'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return exports.sendEmail({
    to,
    subject: 'Lab Results - Gimbie Adventist Hospital',
    html,
  });
};

// Send password reset email
exports.sendPasswordReset = async (to, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a5276; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .button { background: #1a5276; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Gimbie Adventist General Hospital</h1>
          <h2>Password Reset</h2>
        </div>
        <div class="content">
          <p>You requested a password reset.</p>
          <p>Click the button below to reset your password:</p>
          <br>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <br><br>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>Gimbie Adventist General Hospital | ${process.env.HOSPITAL_PHONE || '+251-XX-XXX-XXXX'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return exports.sendEmail({
    to,
    subject: 'Password Reset - Gimbie Adventist Hospital',
    html,
  });
};

// Send verification email
exports.sendVerificationEmail = async (to, verifyToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a5276; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .button { background: #1a5276; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Gimbie Adventist General Hospital</h1>
          <h2>Verify Your Email</h2>
        </div>
        <div class="content">
          <p>Welcome to Gimbie Adventist General Hospital!</p>
          <p>Please verify your email address by clicking the button below:</p>
          <br>
          <a href="${verifyUrl}" class="button">Verify Email</a>
          <br><br>
          <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>Gimbie Adventist General Hospital | ${process.env.HOSPITAL_PHONE || '+251-XX-XXX-XXXX'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return exports.sendEmail({
    to,
    subject: 'Verify Your Email - Gimbie Adventist Hospital',
    html,
  });
};
