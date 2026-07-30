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
const { errorHandler } = require('./middleware');
const logger = require('./logger');

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://ghimbi-adventist-general-hospital.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://ghimbi-adventist-general-hospital.vercel.app',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));

// Static files
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

// ============================================
// DATABASE CONNECTION
// ============================================
connectDB();

// ============================================
// SOCKET.IO SETUP
// ============================================
require('./socket')(io);

// ============================================
// ROUTES
// ============================================
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    hospital: 'Gimbie Adventist General Hospital',
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Gimbie Adventist General Hospital API',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/health',
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🏥 Hospital: Gimbie Adventist General Hospital`);
});
