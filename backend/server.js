// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// BACKEND SERVER - MAIN ENTRY POINT
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIO = require('socket.io');
const connectDB = require('./db');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware');
const logger = require('./logger');

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://ghimbi-adventist-general-hospital.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ============================================
// MIDDLEWARE
// ============================================

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://ghimbi-adventist-general-hospital.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined'));

// Static files
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

// ============================================
// DATABASE CONNECTION
// ============================================

connectDB().catch(err => {
  logger.error('Database connection failed:', err);
  process.exit(1);
});

// ============================================
// SOCKET.IO SETUP
// ============================================

require('./socket')(io);

// ============================================
// ROUTES
// ============================================

app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    hospital: process.env.HOSPITAL_NAME || 'Gimbie Adventist General Hospital',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Gimbie Adventist General Hospital API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api/docs',
    },
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🏥 Hospital: ${process.env.HOSPITAL_NAME || 'Gimbie Adventist General Hospital'}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
  logger.info(`❤️ Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
