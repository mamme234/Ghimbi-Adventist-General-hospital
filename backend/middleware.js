// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// MIDDLEWARE - General Middleware Functions
// ============================================

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const logger = require('./logger');
const { AuditLog } = require('./models');

// ============================================
// RATE LIMITING
// ============================================

exports.limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000 || 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for trusted IPs or roles
    if (req.user && ['admin', 'super-admin'].includes(req.user.role)) {
      return true;
    }
    return false;
  },
});

// ============================================
// STRICT RATE LIMITER (for auth endpoints)
// ============================================

exports.strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 5 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// CORS CONFIGURATION
// ============================================

exports.corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://ghimbi-adventist-general-hospital.vercel.app',
      process.env.FRONTEND_DEV_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5000',
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
};

// ============================================
// ERROR HANDLER
// ============================================

exports.errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user ? req.user._id : 'anonymous',
  });

  // Log to audit
  if (req.user) {
    AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'ERROR',
      resource: 'API',
      details: {
        message: err.message,
        method: req.method,
        url: req.url,
        statusCode: err.statusCode || 500,
      },
      status: 'failure',
    }).catch((logError) => {
      logger.error('Failed to log error to audit:', logError);
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}. Please use a unique value.`,
      field: field,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please login again.',
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// ============================================
// NOT FOUND HANDLER
// ============================================

exports.notFound = (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
};

// ============================================
// SANITIZE MIDDLEWARE
// ============================================

exports.sanitize = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

// ============================================
// REQUEST LOGGER
// ============================================

exports.requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user ? req.user._id : 'anonymous',
    role: req.user ? req.user.role : 'public',
  });
  next();
};

// ============================================
// RESPONSE TIME TRACKER
// ============================================

exports.responseTimeTracker = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 5000) {
      logger.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  next();
};

// ============================================
// SECURITY HEADERS
// ============================================

exports.securityHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

// ============================================
// COMPRESS RESPONSE
// ============================================

exports.compress = compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});

// ============================================
// HEALTH CHECK MIDDLEWARE
// ============================================

exports.healthCheck = (req, res) => {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
    hospital: 'Gimbie Adventist General Hospital',
    services: {
      database: 'connected',
      server: 'running',
      websocket: 'active',
    },
  };
  res.json(healthInfo);
};

// ============================================
// MAINTENANCE MODE
// ============================================

let isMaintenanceMode = false;

exports.maintenanceMode = (req, res, next) => {
  if (isMaintenanceMode) {
    // Allow admin and super-admin during maintenance
    if (req.user && ['admin', 'super-admin'].includes(req.user.role)) {
      return next();
    }
    return res.status(503).json({
      success: false,
      message: 'System is under maintenance. Please check back later.',
      estimatedTime: '30 minutes',
    });
  }
  next();
};

// Set maintenance mode
exports.setMaintenanceMode = (mode) => {
  isMaintenanceMode = mode;
  logger.info(`Maintenance mode ${mode ? 'enabled' : 'disabled'}`);
};

// ============================================
// API VERSIONING
// ============================================

exports.apiVersion = (version) => {
  return (req, res, next) => {
    req.apiVersion = version;
    res.setHeader('X-API-Version', version);
    next();
  };
};

// ============================================
// CACHE CONTROL
// ============================================

exports.cacheControl = (duration) => {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${duration}`);
    next();
  };
};

// ============================================
// NO CACHE (for dynamic content)
// ============================================

exports.noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// ============================================
// CONTENT SECURITY POLICY
// ============================================

exports.csp = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:", "http:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'", "https://api.openai.com", "https://maps.googleapis.com"],
    frameSrc: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
});

// ============================================
// EXPORT ALL MIDDLEWARE
// ============================================

module.exports = {
  limiter: exports.limiter,
  strictLimiter: exports.strictLimiter,
  corsOptions: exports.corsOptions,
  errorHandler: exports.errorHandler,
  notFound: exports.notFound,
  sanitize: exports.sanitize,
  requestLogger: exports.requestLogger,
  responseTimeTracker: exports.responseTimeTracker,
  securityHeaders: exports.securityHeaders,
  compress: exports.compress,
  healthCheck: exports.healthCheck,
  maintenanceMode: exports.maintenanceMode,
  setMaintenanceMode: exports.setMaintenanceMode,
  apiVersion: exports.apiVersion,
  cacheControl: exports.cacheControl,
  noCache: exports.noCache,
  csp: exports.csp,
};
