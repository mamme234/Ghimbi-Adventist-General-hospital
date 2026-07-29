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
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:5000", "https://api.gimbiehospital.org"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'https://gimbie-hospital.vercel.app'],
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
  limits: { fileSize: config.maxFileSize },
  abortOnLimit: true,
  responseOnLimit: 'File size exceeds limit'
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
app.use('/api', limiter);

// Custom logger
app.use(logger);

// Routes
app.use('/', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: config.nodeEnv,
    hospital: config.hospitalName
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🏥 ${config.hospitalName}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  process.exit(0);
});

module.exports = app;
