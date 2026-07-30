// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// FILE UPLOAD HANDLER
// ============================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/patients', 'uploads/doctors', 'uploads/prescriptions', 'uploads/lab', 'uploads/radiology', 'uploads/profile', 'uploads/temp'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine folder based on file type
    if (file.fieldname === 'profileImage') {
      uploadPath = 'uploads/profile/';
    } else if (file.fieldname === 'prescription') {
      uploadPath = 'uploads/prescriptions/';
    } else if (file.fieldname === 'labResult') {
      uploadPath = 'uploads/lab/';
    } else if (file.fieldname === 'radiologyImage') {
      uploadPath = 'uploads/radiology/';
    } else if (file.fieldname === 'patientDocument') {
      uploadPath = 'uploads/patients/';
    } else if (file.fieldname === 'doctorDocument') {
      uploadPath = 'uploads/doctors/';
    } else {
      uploadPath = 'uploads/';
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  }
});

// Single file upload
exports.uploadSingle = upload.single('file');

// Multiple files upload
exports.uploadMultiple = upload.array('files', 10);

// Upload with specific field
exports.uploadField = (fieldName) => upload.single(fieldName);

// Upload multiple fields
exports.uploadFields = (fields) => upload.fields(fields);

// Delete file
exports.deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('File deletion error:', error);
    return false;
  }
};

// Get file info
exports.getFileInfo = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        name: path.basename(filePath),
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        path: filePath,
        ext: path.extname(filePath),
      };
    }
    return null;
  } catch (error) {
    logger.error('Get file info error:', error);
    return null;
  }
};

// Upload handler middleware
exports.handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    } else if (err) {
      // Other error
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

// Export multer instance
exports.multer = multer;

// Export configured upload
exports.upload = upload;
