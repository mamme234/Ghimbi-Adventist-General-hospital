require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gimbie-hospital',
  jwtSecret: process.env.JWT_SECRET || 'gimbie_hospital_2027_super_secret_key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'gimbie_hospital_2027_refresh_secret',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  emailUser: process.env.EMAIL_USER || 'hospital@gimbie.org',
  emailPass: process.env.EMAIL_PASS || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@gimbie.org',
  adminPassword: process.env.ADMIN_PASSWORD || 'Gimbie@2027',
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,image/gif,pdf/doc/docx').split(','),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  hospitalName: process.env.HOSPITAL_NAME || 'Gimbie Adventist General Hospital',
  hospitalPhone: process.env.HOSPITAL_PHONE || '+251-XXX-XXXXXX',
  hospitalEmail: process.env.HOSPITAL_EMAIL || 'info@gimbiehospital.org',
  hospitalAddress: process.env.HOSPITAL_ADDRESS || 'Gimbie, Ethiopia',
  hospitalLogo: process.env.HOSPITAL_LOGO || '/uploads/logo.png'
};
