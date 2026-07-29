const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ============ USER & STAFF MODELS ============

const UserSchema = new mongoose.Schema({
  patientId: { type: String, unique: true, sparse: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, lowercase: true, sparse: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  alternatePhone: { type: String },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] },
  role: { 
    type: String, 
    enum: ['patient', 'doctor', 'nurse', 'reception', 'laboratory', 'pharmacy', 'finance', 'admin'], 
    default: 'patient' 
  },
  profileImage: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Ethiopia' }
  },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  },
  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date,
    type: { type: String, enum: ['Private', 'Government', 'None'], default: 'None' }
  },
  qrCode: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = Date.now();
  if (!this.patientId && this.role === 'patient') {
    const year = new Date().getFullYear();
    const count = await mongoose.model('User').countDocuments({ role: 'patient' }) + 1;
    this.patientId = `PAT-${year}-${String(count).padStart(5, '0')}`;
  }
  next();
});

UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// ============ DOCTOR MODELS ============

const DoctorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialization: { type: String, required: true },
  department: { type: String, required: true },
  qualifications: [String],
  experience: { type: Number, default: 0 },
  bio: { type: String },
  languages: [String],
  consultationFee: { type: Number, default: 0 },
  licenseNumber: { type: String },
  availability: [{
    day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    startTime: String,
    endTime: String,
    isAvailable: { type: Boolean, default: true }
  }],
  rating: { type: Number, min: 0, max: 5, default: 0 },
  totalReviews: { type: Number, default: 0 },
  signature: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// ============ CONSULTATION MODELS ============

const ConsultationSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  symptoms: [String],
  vitalSigns: {
    bloodPressure: String,
    heartRate: Number,
    respiratoryRate: Number,
    temperature: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
    bmi: Number
  },
  diagnosis: { type: String },
  treatmentPlan: { type: String },
  notes: { type: String },
  followUpDate: { type: Date },
  isEmergency: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'follow-up', 'referred'], 
    default: 'pending' 
  },
  referral: {
    to: String,
    reason: String,
    date: Date
  },
  printed: { type: Boolean, default: false },
  qrCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============ LABORATORY MODELS ============

const LabRequestSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestDate: { type: Date, default: Date.now },
  tests: [{
    name: { type: String, required: true },
    category: { type: String },
    notes: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'in-progress', 'completed', 'cancelled'], 
      default: 'pending' 
    },
    result: {
      value: String,
      unit: String,
      referenceRange: String,
      isAbnormal: Boolean,
      notes: String
    }
  }],
  clinicalNotes: { type: String },
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  completedDate: { type: Date },
  printed: { type: Boolean, default: false },
  qrCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============ PRESCRIPTION MODELS ============

const PrescriptionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  date: { type: Date, default: Date.now },
  medicines: [{
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    quantity: { type: Number },
    instructions: { type: String },
    notes: { type: String }
  }],
  diagnosis: { type: String },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'dispensed', 'completed', 'cancelled'], 
    default: 'active' 
  },
  printed: { type: Boolean, default: false },
  qrCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============ PHARMACY MODELS ============

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String },
  category: { type: String },
  dosageForm: { type: String },
  strength: { type: String },
  unit: { type: String },
  price: { type: Number, required: true },
  quantityInStock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  location: { type: String },
  supplier: { type: String },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  requiresPrescription: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PharmacyDispenseSchema = new mongoose.Schema({
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicines: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    name: String,
    quantity: Number,
    batchNumber: String,
    expiryDate: Date
  }],
  dispenseDate: { type: Date, default: Date.now },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'dispensed', 'partially-dispensed', 'cancelled'], 
    default: 'pending' 
  },
  printed: { type: Boolean, default: false },
  receiptNumber: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// ============ BILLING MODELS ============

const BillingSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billNumber: { type: String, unique: true },
  items: [{
    type: { type: String, enum: ['consultation', 'laboratory', 'pharmacy', 'procedure', 'other'] },
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
    reference: { type: String }
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percentage', 'fixed'] },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'insurance', 'mobile-money', 'other'] 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'paid', 'insurance', 'overdue'], 
    default: 'pending' 
  },
  insuranceClaim: {
    claimNumber: String,
    submittedDate: Date,
    approvedAmount: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] }
  },
  billedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  printed: { type: Boolean, default: false },
  receiptNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============ ADMISSION MODELS ============

const AdmissionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admissionDate: { type: Date, default: Date.now },
  admissionType: { type: String, enum: ['emergency', 'elective', 'transfer'] },
  ward: { type: String },
  roomNumber: { type: String },
  bedNumber: { type: String },
  diagnosis: { type: String },
  attendingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['admitted', 'discharged', 'transferred'], 
    default: 'admitted' 
  },
  dischargeDate: { type: Date },
  dischargeSummary: { type: String },
  printed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============ DEPARTMENT MODELS ============

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  services: [String],
  location: { type: String },
  phone: { type: String },
  email: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// ============ NEWS & GALLERY MODELS ============

const NewsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String },
  content: { type: String, required: true },
  category: { type: String, enum: ['Health', 'Hospital', 'Community', 'Events'] },
  image: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [String],
  isPublished: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  publishedDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const GallerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  images: [{
    url: String,
    caption: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  category: { type: String, enum: ['Hospital', 'Events', 'Doctors', 'Facilities', 'Patient Care'] },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// ============ APPOINTMENT MODELS ============

const AppointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  reason: { type: String },
  symptoms: [String],
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no-show'], 
    default: 'pending' 
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============ AUDIT LOG ============

const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  entity: { type: String },
  entityId: { type: String },
  details: { type: Object },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// Export Models
module.exports = {
  User: mongoose.model('User', UserSchema),
  Doctor: mongoose.model('Doctor', DoctorSchema),
  Consultation: mongoose.model('Consultation', ConsultationSchema),
  LabRequest: mongoose.model('LabRequest', LabRequestSchema),
  Prescription: mongoose.model('Prescription', PrescriptionSchema),
  Medicine: mongoose.model('Medicine', MedicineSchema),
  PharmacyDispense: mongoose.model('PharmacyDispense', PharmacyDispenseSchema),
  Billing: mongoose.model('Billing', BillingSchema),
  Admission: mongoose.model('Admission', AdmissionSchema),
  Department: mongoose.model('Department', DepartmentSchema),
  Appointment: mongoose.model('Appointment', AppointmentSchema),
  News: mongoose.model('News', NewsSchema),
  Gallery: mongoose.model('Gallery', GallerySchema),
  AuditLog: mongoose.model('AuditLog', AuditLogSchema)
};
