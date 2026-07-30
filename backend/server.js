require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const path = require('path');
const connectDB = require('./db');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, limiter, logger } = require('./middleware');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS - Allow all origins for testing
app.use(cors({
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: config.maxFileSize || 5242880 },
  abortOnLimit: true,
  responseOnLimit: 'File size exceeds limit'
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
app.use('/api', limiter);

// Custom logger
app.use(logger);

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: config.nodeEnv || 'development',
    hospital: config.hospitalName || 'Gimbie Adventist General Hospital'
  });
});

// ============ ROOT ============
app.get('/', (req, res) => {
  res.json({
    message: 'Gimbie Adventist General Hospital API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      departments: '/api/departments',
      doctors: '/api/doctors',
      patients: '/api/patients',
      appointments: '/api/appointments'
    }
  });
});

// ============ API ROUTES ============
app.use('/api', routes);

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    message: 'The requested endpoint does not exist'
  });
});

// ============ ERROR HANDLER ============
app.use(errorHandler);

// ============ START SERVER ============
const PORT = config.port || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 ${config.hospitalName || 'Gimbie Adventist General Hospital'}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${config.nodeEnv || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
