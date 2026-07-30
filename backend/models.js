// ============================================
// GIMBIE ADVENTIST GENERAL HOSPITAL
// DATABASE MODELS - ALL SCHEMAS
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ============================================
// USER MODEL (Base for all roles)
// ============================================
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    default: () => `USR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: [
      'patient',
      'doctor',
      'nurse',
      'receptionist',
      'pharmacist',
      'laboratory',
      'radiologist',
      'finance',
      'hr',
      'ambulance',
      'admin',
      'super-admin',
    ],
    required: true,
  },
  profileImage: {
    type: String,
    default: null,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  dateOfBirth: {
    type: Date,
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  lastLogin: {
    type: Date,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verifyEmailToken: String,
  verifyEmailExpires: Date,
  qrCode: {
    type: String,
  },
  preferences: {
    language: {
      type: String,
      enum: ['en', 'om', 'am'],
      default: 'en',
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate user ID
userSchema.pre('save', function(next) {
  if (!this.userId) {
    const prefix = this.role === 'patient' ? 'PAT' :
                   this.role === 'doctor' ? 'DOC' :
                   this.role === 'nurse' ? 'NUR' : 'USR';
    this.userId = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  next();
});

const User = mongoose.model('User', userSchema);

// ============================================
// PATIENT MODEL
// ============================================
const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    default: () => `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  mrn: { // Medical Record Number
    type: String,
    unique: true,
    required: true,
    default: () => `MRN-${Date.now().toString(36).toUpperCase()}`,
  },
  qrCode: {
    type: String,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  allergies: [{
    allergen: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
    },
    reaction: String,
    diagnosedAt: Date,
  }],
  medicalHistory: [{
    condition: String,
    diagnosedAt: Date,
    treatedAt: Date,
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    notes: String,
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic'],
      default: 'active',
    },
  }],
  surgeries: [{
    name: String,
    date: Date,
    hospital: String,
    surgeon: String,
    notes: String,
  }],
  vaccinations: [{
    name: String,
    date: Date,
    administeredBy: String,
    nextDose: Date,
    batchNo: String,
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    prescribedAt: Date,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'discontinued'],
      default: 'active',
    },
  }],
  vitalSigns: [{
    date: Date,
    bloodPressure: {
      systolic: Number,
      diastolic: Number,
    },
    heartRate: Number,
    respiratoryRate: Number,
    temperature: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
    bmi: Number,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  }],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String,
    address: String,
  },
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    validFrom: Date,
    validTo: Date,
    coverage: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  familyMembers: [{
    name: String,
    relationship: String,
    phone: String,
    isEmergencyContact: {
      type: Boolean,
      default: false,
    },
  }],
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastVisit: Date,
  nextAppointment: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Generate QR code before saving
patientSchema.pre('save', function(next) {
  if (!this.qrCode) {
    this.qrCode = `QR-${this.mrn}-${Date.now().toString(36)}`;
  }
  next();
});

const Patient = mongoose.model('Patient', patientSchema);

// ============================================
// DOCTOR MODEL
// ============================================
const doctorSchema = new mongoose.Schema({
  doctorId: {
    type: String,
    unique: true,
    default: () => `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  specialization: {
    type: String,
    required: true,
  },
  subSpecializations: [String],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    country: String,
  }],
  certifications: [{
    name: String,
    issuingAuthority: String,
    dateIssued: Date,
    expiryDate: Date,
    certificationNumber: String,
  }],
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
  },
  licenseExpiry: Date,
  experience: {
    years: Number,
    details: [{
      hospital: String,
      position: String,
      from: Date,
      to: Date,
    }],
  },
  department: {
    type: String,
    enum: [
      'cardiology',
      'neurology',
      'orthopedics',
      'pediatrics',
      'gynecology',
      'ophthalmology',
      'dermatology',
      'psychiatry',
      'radiology',
      'pathology',
      'anesthesiology',
      'emergency',
      'surgery',
      'internal_medicine',
      'family_medicine',
      'dentistry',
      'physiotherapy',
      'other',
    ],
    required: true,
  },
  consultationFee: {
    type: Number,
    default: 0,
  },
  workingHours: {
    monday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    thursday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    friday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    saturday: { start: String, end: String, isWorking: { type: Boolean, default: false } },
    sunday: { start: String, end: String, isWorking: { type: Boolean, default: false } },
  },
  rooms: [{
    number: String,
    floor: Number,
    building: String,
  }],
  patients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
  }],
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isOnDuty: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reviews: [{
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    rating: Number,
    comment: String,
    date: {
      type: Date,
      default: Date.now,
    },
  }],
  languages: [{
    type: String,
    enum: ['en', 'om', 'am', 'ar', 'fr', 'other'],
  }],
  biography: String,
  achievements: [String],
  publications: [{
    title: String,
    journal: String,
    year: Number,
    link: String,
  }],
}, {
  timestamps: true,
});

const Doctor = mongoose.model('Doctor', doctorSchema);

// ============================================
// APPOINTMENT MODEL
// ============================================
const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    unique: true,
    default: () => `APT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    default: 30,
  },
  type: {
    type: String,
    enum: ['in-person', 'telemedicine', 'follow-up', 'emergency'],
    default: 'in-person',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'pending',
  },
  reason: {
    type: String,
    required: true,
  },
  symptoms: [String],
  notes: String,
  isEmergency: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  reminderScheduled: {
    type: Date,
  },
  confirmedAt: Date,
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  cancellationReason: String,
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  telemedicineLink: String,
  meetLink: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// ============================================
// PRESCRIPTION MODEL
// ============================================
const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    unique: true,
    default: () => `PRX-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  qrCode: {
    type: String,
    unique: true,
  },
  barcode: {
    type: String,
    unique: true,
  },
  medicines: [{
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
    },
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    quantity: Number,
    instructions: String,
    isGeneric: {
      type: Boolean,
      default: false,
    },
    substituteAllowed: {
      type: Boolean,
      default: true,
    },
  }],
  diagnosis: String,
  notes: String,
  specialInstructions: String,
  isOpioid: {
    type: Boolean,
    default: false,
  },
  isControlled: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'dispensed', 'partially-dispensed', 'expired', 'cancelled'],
    default: 'active',
  },
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
    required: true,
  },
  refillCount: {
    type: Number,
    default: 0,
  },
  refillLimit: {
    type: Number,
    default: 1,
  },
  dispensedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  dispensedAt: Date,
  totalCost: Number,
  insuranceClaim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Insurance',
  },
  isUrgent: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

prescriptionSchema.pre('save', function(next) {
  if (!this.qrCode) {
    this.qrCode = `QR-${this.prescriptionId}`;
  }
  if (!this.barcode) {
    this.barcode = `BAR-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }
  next();
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

// ============================================
// MEDICINE MODEL
// ============================================
const medicineSchema = new mongoose.Schema({
  medicineId: {
    type: String,
    unique: true,
    default: () => `MED-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  name: {
    type: String,
    required: true,
    index: true,
  },
  genericName: String,
  category: {
    type: String,
    enum: [
      'analgesic',
      'antibiotic',
      'antiviral',
      'antifungal',
      'antihistamine',
      'antidepressant',
      'antidiabetic',
      'antihypertensive',
      'anticoagulant',
      'diuretic',
      'steroid',
      'vitamin',
      'supplement',
      'vaccine',
      'other',
    ],
  },
  form: {
    type: String,
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'cream', 'drops', 'inhaler', 'suppository', 'other'],
    required: true,
  },
  strength: String,
  dosage: String,
  manufacturer: String,
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  batchNumber: String,
  expiryDate: Date,
  quantityInStock: {
    type: Number,
    default: 0,
  },
  reorderLevel: {
    type: Number,
    default: 10,
  },
  maximumStock: {
    type: Number,
    default: 100,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  sellingPrice: {
    type: Number,
    required: true,
  },
  isPrescriptionRequired: {
    type: Boolean,
    default: true,
  },
  isControlled: {
    type: Boolean,
    default: false,
  },
  sideEffects: [String],
  contraindications: [String],
  interactions: [String],
  storageInstructions: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  barcode: {
    type: String,
    unique: true,
  },
}, {
  timestamps: true,
});

const Medicine = mongoose.model('Medicine', medicineSchema);

// ============================================
// LABORATORY TEST MODEL
// ============================================
const labTestSchema = new mongoose.Schema({
  testId: {
    type: String,
    unique: true,
    default: () => `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  testName: {
    type: String,
    required: true,
  },
  testCategory: {
    type: String,
    enum: ['blood', 'urine', 'stool', 'imaging', 'microbiology', 'pathology', 'genetic', 'other'],
    required: true,
  },
  specimenType: String,
  specimenCollectedAt: Date,
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine',
  },
  status: {
    type: String,
    enum: ['ordered', 'collected', 'processing', 'completed', 'cancelled', 'critical'],
    default: 'ordered',
  },
  results: [{
    parameter: String,
    value: String,
    unit: String,
    referenceRange: String,
    isAbnormal: {
      type: Boolean,
      default: false,
    },
  }],
  interpretation: String,
  comments: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
  },
  reviewedAt: Date,
  isCritical: {
    type: Boolean,
    default: false,
  },
  criticalAlertSent: {
    type: Boolean,
    default: false,
  },
  barcode: {
    type: String,
    unique: true,
  },
  attachments: [{
    name: String,
    url: String,
    uploadedAt: Date,
  }],
  notes: String,
}, {
  timestamps: true,
});

const LabTest = mongoose.model('LabTest', labTestSchema);

// ============================================
// RADIOLOGY TEST MODEL
// ============================================
const radiologyTestSchema = new mongoose.Schema({
  radiologyId: {
    type: String,
    unique: true,
    default: () => `RAD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  testType: {
    type: String,
    enum: ['x-ray', 'ct-scan', 'mri', 'ultrasound', 'mammogram', 'bone-density', 'fluoroscopy', 'pet-scan', 'other'],
    required: true,
  },
  bodyPart: String,
  reason: String,
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'emergency'],
    default: 'routine',
  },
  status: {
    type: String,
    enum: ['ordered', 'scheduled', 'performed', 'reading', 'completed', 'cancelled'],
    default: 'ordered',
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  performedAt: Date,
  images: [{
    filename: String,
    url: String,
    dicomData: Object,
    uploadedAt: Date,
  }],
  findings: String,
  impression: String,
  recommendations: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
  },
  reviewedAt: Date,
  isUrgent: {
    type: Boolean,
    default: false,
  },
  contrastUsed: {
    type: Boolean,
    default: false,
  },
  radiationDose: String,
  notes: String,
}, {
  timestamps: true,
});

const RadiologyTest = mongoose.model('RadiologyTest', radiologyTestSchema);

// ============================================
// INVOICE MODEL
// ============================================
const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    unique: true,
    default: () => `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  patientName: String,
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
  },
  items: [{
    description: String,
    type: {
      type: String,
      enum: ['consultation', 'procedure', 'test', 'medicine', 'room', 'surgery', 'other'],
    },
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    code: String,
  }],
  subtotal: {
    type: Number,
    required: true,
  },
  tax: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  insuranceDiscount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  balanceDue: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially-paid', 'paid', 'insurance', 'write-off'],
    default: 'unpaid',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'insurance', 'bank-transfer', 'mobile-money', 'other'],
  },
  paymentDate: Date,
  transactionId: String,
  insuranceClaim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Insurance',
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  issuedDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: Date,
  notes: String,
  isAdmission: {
    type: Boolean,
    default: false,
  },
  admissionId: String,
}, {
  timestamps: true,
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// ============================================
// STAFF MODEL (For HR)
// ============================================
const staffSchema = new mongoose.Schema({
  staffId: {
    type: String,
    unique: true,
    default: () => `STF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employeeNumber: {
    type: String,
    unique: true,
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  department: String,
  division: String,
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'intern', 'volunteer'],
    default: 'full-time',
  },
  contractStart: Date,
  contractEnd: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  salary: {
    amount: Number,
    currency: {
      type: String,
      default: 'ETB',
    },
    frequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly', 'hourly'],
      default: 'monthly',
    },
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
  },
  attendance: [{
    date: Date,
    checkIn: Date,
    checkOut: Date,
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'leave', 'holiday'],
    },
    notes: String,
  }],
  leaves: [{
    type: {
      type: String,
      enum: ['annual', 'sick', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other'],
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    reason: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
  }],
  training: [{
    name: String,
    provider: String,
    date: Date,
    certificate: String,
    expiryDate: Date,
  }],
  performanceReviews: [{
    reviewDate: Date,
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    rating: Number,
    comments: String,
    goals: String,
    areasForImprovement: String,
  }],
}, {
  timestamps: true,
});

const Staff = mongoose.model('Staff', staffSchema);

// ============================================
// AMBULANCE MODEL
// ============================================
const ambulanceSchema = new mongoose.Schema({
  ambulanceId: {
    type: String,
    unique: true,
    default: () => `AMB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['basic', 'advanced', 'critical-care', 'neonatal', 'helicopter'],
    default: 'basic',
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  crew: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  }],
  status: {
    type: String,
    enum: ['available', 'on-call', 'en-route', 'at-scene', 'transporting', 'maintenance', 'out-of-service'],
    default: 'available',
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  currentTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AmbulanceTrip',
  },
  fuelLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },
  mileage: Number,
  lastMaintenance: Date,
  nextMaintenance: Date,
  equipment: [{
    name: String,
    status: {
      type: String,
      enum: ['functional', 'needs-repair', 'damaged'],
    },
    lastChecked: Date,
  }],
  tripHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AmbulanceTrip',
  }],
}, {
  timestamps: true,
});

// ============================================
// AMBULANCE TRIP MODEL
// ============================================
const ambulanceTripSchema = new mongoose.Schema({
  tripId: {
    type: String,
    unique: true,
    default: () => `TRP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  ambulance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ambulance',
    required: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
  },
  patientName: String,
  patientPhone: String,
  emergencyContact: {
    name: String,
    phone: String,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  pickupLocation: {
    address: String,
    latitude: Number,
    longitude: Number,
    landmark: String,
  },
  destination: {
    address: String,
    latitude: Number,
    longitude: Number,
    type: {
      type: String,
      enum: ['hospital', 'clinic', 'other'],
      default: 'hospital',
    },
  },
  dispatchedAt: Date,
  arrivedAtScene: Date,
  departedScene: Date,
  arrivedAtDestination: Date,
  completedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'dispatched', 'en-route', 'at-scene', 'transporting', 'arrived', 'completed', 'cancelled'],
    default: 'pending',
  },
  distanceTraveled: Number,
  duration: Number,
  crew: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  }],
  medicalNotes: String,
  vitalsRecorded: [{
    time: Date,
    bloodPressure: String,
    heartRate: Number,
    oxygenSaturation: Number,
    consciousnessLevel: String,
  }],
  treatmentsGiven: [String],
  medicationsAdministered: [String],
  incidentReport: String,
  cancellationReason: String,
}, {
  timestamps: true,
});

const Ambulance = mongoose.model('Ambulance', ambulanceSchema);
const AmbulanceTrip = mongoose.model('AmbulanceTrip', ambulanceTripSchema);

// ============================================
// AUDIT LOG MODEL
// ============================================
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userRole: String,
  action: {
    type: String,
    required: true,
  },
  resource: String,
  resourceId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success',
  },
}, {
  timestamps: true,
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// ============================================
// NOTIFICATION MODEL
// ============================================
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['appointment', 'reminder', 'alert', 'message', 'system', 'promotion'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: mongoose.Schema.Types.Mixed,
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'in-app'],
    default: 'in-app',
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);

// ============================================
// EXPORT ALL MODELS
// ============================================
module.exports = {
  User,
  Patient,
  Doctor,
  Appointment,
  Prescription,
  Medicine,
  LabTest,
  RadiologyTest,
  Invoice,
  Staff,
  Ambulance,
  AmbulanceTrip,
  AuditLog,
  Notification,
};
