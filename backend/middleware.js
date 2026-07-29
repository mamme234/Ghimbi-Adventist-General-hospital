const jwt = require('jsonwebtoken');
const { User } = require('./models');
const config = require('./config');

// Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based Authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Rate Limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: config.rateLimitWindow * 60 * 1000,
  max: config.rateLimitMax,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// File Upload Validation
const validateFile = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const file = req.files.file;
  const maxSize = config.maxFileSize;

  if (file.size > maxSize) {
    return res.status(400).json({ error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` });
  }

  if (!config.allowedFileTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'File type not allowed' });
  }

  next();
};

// Error Handling Middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  if (err.code === 11000) {
    return res.status(400).json({ error: 'Duplicate entry' });
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
};

// Logging Middleware
const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
};

// Generate QR Code Middleware
const generateQR = require('qrcode');

const generateQRCode = async (data) => {
  try {
    return await generateQR.toDataURL(data);
  } catch (error) {
    console.error('QR Generation Error:', error);
    return null;
  }
};

module.exports = {
  auth,
  authorize,
  limiter,
  validateFile,
  errorHandler,
  logger,
  generateQRCode
};
