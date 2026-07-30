// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// SOCKET.IO CONFIGURATION
// ============================================

const { User, Notification } = require('./models');
const logger = require('./logger');

module.exports = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id;
      socket.userRole = user.role;
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 User connected: ${socket.userId} (${socket.userRole})`);

    // Join user's room
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    // User connected event
    socket.on('user_connected', (data) => {
      logger.info(`User ${socket.userId} connected:`, data);
      socket.broadcast.emit('user_status', {
        userId: socket.userId,
        status: 'online',
        ...data,
      });
    });

    // Appointment events
    socket.on('appointment_booked', async (data) => {
      logger.info(`Appointment booked:`, data);
      io.to(`doctor:${data.doctorId}`).emit('appointment_notification', {
        type: 'new_appointment',
        data,
      });
    });

    socket.on('appointment_cancelled', (data) => {
      logger.info(`Appointment cancelled:`, data);
      io.to(`doctor:${data.doctorId}`).emit('appointment_notification', {
        type: 'cancelled_appointment',
        data,
      });
    });

    socket.on('appointment_confirmed', (data) => {
      logger.info(`Appointment confirmed:`, data);
      io.to(`patient:${data.patientId}`).emit('appointment_notification', {
        type: 'confirmed_appointment',
        data,
      });
    });

    // Prescription events
    socket.on('prescription_created', (data) => {
      logger.info(`Prescription created:`, data);
      io.to(`pharmacist:all`).emit('pharmacy_notification', {
        type: 'new_prescription',
        data,
      });
    });

    // Lab events
    socket.on('lab_test_created', (data) => {
      logger.info(`Lab test created:`, data);
      io.to(`laboratory:all`).emit('lab_notification', {
        type: 'new_lab_test',
        data,
      });
    });

    socket.on('lab_test_processed', (data) => {
      logger.info(`Lab test processed:`, data);
      io.to(`doctor:${data.doctorId}`).emit('lab_notification', {
        type: 'lab_result_ready',
        data,
      });
    });

    // Emergency events
    socket.on('emergency_alert', (data) => {
      logger.info(`🚨 EMERGENCY ALERT:`, data);
      io.to('role:ambulance').emit('emergency', {
        type: 'emergency',
        data,
        timestamp: new Date().toISOString(),
      });
      io.to('role:admin').emit('emergency', {
        type: 'emergency',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Chat events
    socket.on('send_message', (data) => {
      io.to(`user:${data.receiverId}`).emit('new_message', {
        senderId: socket.userId,
        data,
      });
    });

    socket.on('typing', (data) => {
      socket.to(`user:${data.receiverId}`).emit('typing', {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    // Notification events
    socket.on('notification_read', async (data) => {
      try {
        await Notification.findByIdAndUpdate(data.notificationId, {
          isRead: true,
          readAt: new Date(),
        });
      } catch (error) {
        logger.error('Notification read error:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`🔌 User disconnected: ${socket.userId}`);
      socket.broadcast.emit('user_status', {
        userId: socket.userId,
        status: 'offline',
        disconnectedAt: new Date().toISOString(),
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  // Broadcast to all connected clients
  io.broadcastToRole = (role, event, data) => {
    io.to(`role:${role}`).emit(event, data);
  };

  io.broadcastToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  return io;
};
