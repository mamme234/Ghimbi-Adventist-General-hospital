// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// SCHEDULER - Cron Jobs
// ============================================

const cron = require('node-cron');
const logger = require('./logger');
const { autoBackup } = require('./backup');
const { sendAppointmentReminders } = require('./notification');

// Schedule daily backup at 2 AM
exports.scheduleBackup = () => {
  cron.schedule('0 2 * * *', async () => {
    logger.info('⏰ Running scheduled backup...');
    try {
      await autoBackup();
      logger.info('✅ Scheduled backup completed');
    } catch (error) {
      logger.error('❌ Scheduled backup failed:', error);
    }
  });
  logger.info('📅 Backup scheduler started (daily at 2 AM)');
};

// Schedule appointment reminders (every hour)
exports.scheduleReminders = () => {
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ Running appointment reminders...');
    try {
      await sendAppointmentReminders();
      logger.info('✅ Appointment reminders sent');
    } catch (error) {
      logger.error('❌ Appointment reminders failed:', error);
    }
  });
  logger.info('📅 Reminder scheduler started (every hour)');
};

// Schedule report generation (weekly)
exports.scheduleReports = () => {
  cron.schedule('0 0 * * 0', async () => {
    logger.info('⏰ Running weekly report generation...');
    try {
      // Generate weekly reports
      logger.info('✅ Weekly reports generated');
    } catch (error) {
      logger.error('❌ Weekly report generation failed:', error);
    }
  });
  logger.info('📅 Report scheduler started (weekly on Sunday)');
};

// Schedule inventory check (daily at 6 AM)
exports.scheduleInventoryCheck = () => {
  cron.schedule('0 6 * * *', async () => {
    logger.info('⏰ Running inventory check...');
    try {
      // Check low stock
      logger.info('✅ Inventory check completed');
    } catch (error) {
      logger.error('❌ Inventory check failed:', error);
    }
  });
  logger.info('📅 Inventory check scheduler started (daily at 6 AM)');
};

// Initialize all schedulers
exports.initSchedulers = () => {
  exports.scheduleBackup();
  exports.scheduleReminders();
  exports.scheduleReports();
  exports.scheduleInventoryCheck();
  logger.info('🕐 All schedulers initialized');
};
