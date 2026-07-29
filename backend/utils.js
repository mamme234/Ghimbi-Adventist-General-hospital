const crypto = require('crypto');

// Generate unique ID
const generateId = (prefix, length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix + '-';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate random token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate OTP
const generateOTP = (length = 6) => {
  return Math.floor(100000 + Math.random() * 900000).toString().slice(0, length);
};

// Format date
const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
};

// Calculate age
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-]{8,15}$/;
  return phoneRegex.test(phone);
};

// Slugify string
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// Truncate text
const truncateText = (text, length = 150) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Get time slots
const getTimeSlots = (startTime, endTime, interval = 30) => {
  const slots = [];
  let start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);

  while (start < end) {
    const timeStr = start.toTimeString().slice(0, 5);
    slots.push(timeStr);
    start.setMinutes(start.getMinutes() + interval);
  }

  return slots;
};

// Mask sensitive data
const maskData = (data) => {
  if (typeof data === 'string') {
    if (data.includes('@')) {
      const [local, domain] = data.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    if (data.length > 4) {
      return data.slice(0, -4).replace(/./g, '*') + data.slice(-4);
    }
    return data;
  }
  return data;
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Sleep function
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry function
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
};

// Parse CSV
const parseCSV = (text) => {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const values = lines[i].split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    results.push(obj);
  }

  return results;
};

// Convert to CSV
const toCSV = (data) => {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  let csv = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(h => {
      const value = row[h] || '';
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    });
    csv += values.join(',') + '\n';
  });

  return csv;
};

module.exports = {
  generateId,
  generateToken,
  generateOTP,
  formatDate,
  calculateAge,
  isValidEmail,
  isValidPhone,
  slugify,
  truncateText,
  getTimeSlots,
  maskData,
  deepClone,
  sleep,
  retry,
  parseCSV,
  toCSV
};
