// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// DATABASE BACKUP
// ============================================

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('./logger');

// Ensure backup directory exists
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Backup database
exports.backupDatabase = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};
    
    for (const collection of collections) {
      const name = collection.name;
      const data = await mongoose.connection.db.collection(name).find({}).toArray();
      backupData[name] = data;
    }
    
    // Write to file
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    logger.info(`Database backup created: ${backupPath}`);
    
    return {
      success: true,
      path: backupPath,
      timestamp,
      collections: Object.keys(backupData),
    };
  } catch (error) {
    logger.error('Database backup error:', error);
    throw error;
  }
};

// Restore database
exports.restoreDatabase = async (backupFile) => {
  try {
    const backupPath = path.join(backupDir, backupFile);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    for (const [collectionName, data] of Object.entries(backupData)) {
      const collection = mongoose.connection.db.collection(collectionName);
      
      // Clear existing data
      await collection.deleteMany({});
      
      // Insert backup data
      if (data.length > 0) {
        await collection.insertMany(data);
      }
    }
    
    logger.info(`Database restored from: ${backupFile}`);
    return {
      success: true,
      restoredFrom: backupFile,
      collections: Object.keys(backupData),
    };
  } catch (error) {
    logger.error('Database restore error:', error);
    throw error;
  }
};

// List backups
exports.listBackups = () => {
  try {
    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        filename: f,
        path: path.join(backupDir, f),
        size: fs.statSync(path.join(backupDir, f)).size,
        createdAt: fs.statSync(path.join(backupDir, f)).birthtime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    
    return backups;
  } catch (error) {
    logger.error('List backups error:', error);
    return [];
  }
};

// Delete backup
exports.deleteBackup = (filename) => {
  try {
    const backupPath = path.join(backupDir, filename);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      logger.info(`Backup deleted: ${filename}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Delete backup error:', error);
    return false;
  }
};

// Auto backup schedule (to be called by scheduler)
exports.autoBackup = async () => {
  try {
    const result = await exports.backupDatabase();
    
    // Keep only last 30 backups
    const backups = exports.listBackups();
    if (backups.length > 30) {
      const toDelete = backups.slice(30);
      for (const backup of toDelete) {
        exports.deleteBackup(backup.filename);
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Auto backup error:', error);
    throw error;
  }
};
