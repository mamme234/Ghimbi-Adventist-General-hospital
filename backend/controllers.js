const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const config = require('./config');
const {
  User,
  Doctor,
  Consultation,
  LabRequest,
  Prescription,
  Medicine,
  PharmacyDispense,
  Billing,
  Admission,
  Department,
  Appointment,
  News,
  Gallery,
  AuditLog
} = require('./models');
const { generateQRCode } = require('./middleware');

// ============ AUTH CONTROLLERS ============

exports.register = async (req, res) => {
  try {
    const { 
      firstName, lastName, email, password, phone, 
      dateOfBirth, gender, role, address, emergencyContact 
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      role: role || 'patient',
      address,
      emergencyContact
    });

    await user.save();

    // Generate QR Code for patient
    if (user.role === 'patient') {
      const qrData = JSON.stringify({
        patientId: user.patientId,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone
      });
      user.qrCode = await generateQRCode(qrData);
      await user.save();
    }

    // Create doctor profile if role is doctor
    if (user.role === 'doctor') {
      const doctor = new Doctor({
        user: user._id,
        specialization: req.body.specialization || 'General',
        department: req.body.department || 'General',
        licenseNumber: req.body.licenseNumber
      });
      await doctor.save();
    }

    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: config.jwtExpire });
    const refreshToken = jwt.sign({ id: user._id }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpire });

    // Log registration
    await new AuditLog({
      user: user._id,
      action: 'REGISTER',
      entity: 'User',
      entityId: user._id.toString(),
      details: { email, role: user.role, patientId: user.patientId }
    }).save();

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken,
      user: {
        id: user._id,
        patientId: user.patientId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated. Please contact admin.' });
    }

    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: config.jwtExpire });
    const refreshToken = jwt.sign({ id: user._id }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpire });

    user.lastLogin = new Date();
    await user.save();

    // Log login
    await new AuditLog({
      user: user._id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
      details: { email, ip: req.ip, userAgent: req.get('user-agent') }
    }).save();

    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user._id,
        patientId: user.patientId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        qrCode: user.qrCode
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newToken = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: config.jwtExpire });
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    await new AuditLog({
      user: req.user._id,
      action: 'LOGOUT',
      entity: 'User',
      entityId: req.user._id.toString(),
      details: { email: req.user.email }
    }).save();

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findById(req.user._id);
    
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'alternatePhone', 
      'address', 'emergencyContact', 'insurance', 'profileImage'];
    
    allowedUpdates.forEach(key => {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });

    user.updatedAt = new Date();
    await user.save();

    await new AuditLog({
      user: user._id,
      action: 'UPDATE_PROFILE',
      entity: 'User',
      entityId: user._id.toString(),
      details: { updatedFields: Object.keys(updates) }
    }).save();

    res.json({ message: 'Profile updated', user: user.toObject({ getters: true }) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    await new AuditLog({
      user: user._id,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user._id.toString()
    }).save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ PATIENT MANAGEMENT (Reception) ============

exports.registerPatient = async (req, res) => {
  try {
    const { 
      firstName, lastName, phone, dateOfBirth, gender,
      email, alternatePhone, address, emergencyContact, insurance
    } = req.body;

    const existingPatient = await User.findOne({ 
      $or: [{ email: email }, { phone: phone }] 
    });

    if (existingPatient) {
      return res.status(400).json({ 
        error: 'Patient with this email or phone already exists' 
      });
    }

    // Generate temporary password
    const tempPassword = 'Patient@' + Math.floor(1000 + Math.random() * 9000);

    const patient = new User({
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gimbie.patient`,
      password: tempPassword,
      alternatePhone,
      address,
      emergencyContact,
      insurance,
      role: 'patient'
    });

    await patient.save();

    // Generate QR Code
    const qrData = JSON.stringify({
      patientId: patient.patientId,
      name: `${patient.firstName} ${patient.lastName}`,
      phone: patient.phone
    });
    patient.qrCode = await generateQRCode(qrData);
    await patient.save();

    // Log patient registration
    await new AuditLog({
      user: req.user._id,
      action: 'REGISTER_PATIENT',
      entity: 'User',
      entityId: patient._id.toString(),
      details: { 
        patientId: patient.patientId, 
        name: `${patient.firstName} ${patient.lastName}` 
      }
    }).save();

    res.status(201).json({
      message: 'Patient registered successfully',
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        qrCode: patient.qrCode,
        tempPassword: tempPassword
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchPatients = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchRegex = new RegExp(query, 'i');
    const patients = await User.find({
      role: 'patient',
      $or: [
        { patientId: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex }
      ]
    }).select('-password').limit(20);

    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPatientById = async (req, res) => {
  try {
    const patient = await User.findOne({ 
      $or: [
        { _id: req.params.id },
        { patientId: req.params.id }
      ]
    }).select('-password');

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ CONSULTATION CONTROLLERS ============

exports.createConsultation = async (req, res) => {
  try {
    const { 
      patientId, symptoms, vitalSigns, diagnosis, 
      treatmentPlan, notes, followUpDate, isEmergency 
    } = req.body;

    const patient = await User.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const consultation = new Consultation({
      patient: patient._id,
      doctor: req.user._id,
      symptoms,
      vitalSigns,
      diagnosis,
      treatmentPlan,
      notes,
      followUpDate,
      isEmergency: isEmergency || false,
      status: 'completed'
    });

    await consultation.save();

    // Generate QR Code
    const qrData = JSON.stringify({
      consultationId: consultation._id,
      patientId: patient.patientId,
      doctor: `${req.user.firstName} ${req.user.lastName}`,
      date: consultation.date
    });
    consultation.qrCode = await generateQRCode(qrData);
    await consultation.save();

    await new AuditLog({
      user: req.user._id,
      action: 'CREATE_CONSULTATION',
      entity: 'Consultation',
      entityId: consultation._id.toString(),
      details: { patientId: patient.patientId }
    }).save();

    res.status(201).json({
      message: 'Consultation created successfully',
      consultation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getConsultations = async (req, res) => {
  try {
    const { patientId, doctorId } = req.query;
    const filter = {};

    if (patientId) {
      const patient = await User.findOne({ patientId });
      if (patient) filter.patient = patient._id;
    }
    if (doctorId) filter.doctor = doctorId;
    if (req.user.role === 'patient') filter.patient = req.user._id;
    if (req.user.role === 'doctor') filter.doctor = req.user._id;

    const consultations = await Consultation.find(filter)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('doctor', 'firstName lastName specialization')
      .sort({ date: -1 });

    res.json(consultations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getConsultationById = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('patient', 'firstName lastName patientId phone dateOfBirth gender')
      .populate('doctor', 'firstName lastName specialization');

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    res.json(consultation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ LABORATORY CONTROLLERS ============

exports.createLabRequest = async (req, res) => {
  try {
    const { patientId, tests, clinicalNotes, priority } = req.body;

    const patient = await User.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const labRequest = new LabRequest({
      patient: patient._id,
      doctor: req.user._id,
      tests,
      clinicalNotes,
      priority: priority || 'routine',
      status: 'pending'
    });

    await labRequest.save();

    // Generate QR Code
    const qrData = JSON.stringify({
      requestId: labRequest._id,
      patientId: patient.patientId,
      tests: tests.map(t => t.name).join(', ')
    });
    labRequest.qrCode = await generateQRCode(qrData);
    await labRequest.save();

    await new AuditLog({
      user: req.user._id,
      action: 'CREATE_LAB_REQUEST',
      entity: 'LabRequest',
      entityId: labRequest._id.toString(),
      details: { patientId: patient.patientId, testCount: tests.length }
    }).save();

    res.status(201).json({
      message: 'Laboratory request created',
      labRequest
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLabRequests = async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const filter = {};

    if (patientId) {
      const patient = await User.findOne({ patientId });
      if (patient) filter.patient = patient._id;
    }
    if (status) filter.status = status;
    if (req.user.role === 'patient') filter.patient = req.user._id;
    if (req.user.role === 'laboratory') {
      // Lab staff can see all pending and processing requests
    }

    const requests = await LabRequest.find(filter)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('doctor', 'firstName lastName')
      .sort({ requestDate: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLabRequest = async (req, res) => {
  try {
    const { tests, status, completedDate } = req.body;
    const labRequest = await LabRequest.findById(req.params.id);

    if (!labRequest) {
      return res.status(404).json({ error: 'Lab request not found' });
    }

    if (tests) labRequest.tests = tests;
    if (status) {
      labRequest.status = status;
      if (status === 'completed') {
        labRequest.completedDate = completedDate || new Date();
      }
    }
    labRequest.updatedAt = new Date();
    await labRequest.save();

    res.json({ message: 'Lab request updated', labRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ PRESCRIPTION CONTROLLERS ============

exports.createPrescription = async (req, res) => {
  try {
    const { patientId, medicines, diagnosis, notes, consultationId } = req.body;

    const patient = await User.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const prescription = new Prescription({
      patient: patient._id,
      doctor: req.user._id,
      consultation: consultationId,
      medicines,
      diagnosis,
      notes,
      status: 'active'
    });

    await prescription.save();

    // Generate QR Code
    const qrData = JSON.stringify({
      prescriptionId: prescription._id,
      patientId: patient.patientId,
      medicines: medicines.map(m => m.name).join(', ')
    });
    prescription.qrCode = await generateQRCode(qrData);
    await prescription.save();

    await new AuditLog({
      user: req.user._id,
      action: 'CREATE_PRESCRIPTION',
      entity: 'Prescription',
      entityId: prescription._id.toString(),
      details: { patientId: patient.patientId, medicineCount: medicines.length }
    }).save();

    res.status(201).json({
      message: 'Prescription created',
      prescription
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPrescriptions = async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const filter = {};

    if (patientId) {
      const patient = await User.findOne({ patientId });
      if (patient) filter.patient = patient._id;
    }
    if (status) filter.status = status;
    if (req.user.role === 'patient') filter.patient = req.user._id;

    const prescriptions = await Prescription.find(filter)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('doctor', 'firstName lastName specialization')
      .populate('consultation')
      .sort({ date: -1 });

    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('doctor', 'firstName lastName specialization');

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json(prescription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ PHARMACY CONTROLLERS ============

exports.getMedicines = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { genericName: new RegExp(search, 'i') }
      ];
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createMedicine = async (req, res) => {
  try {
    const medicine = new Medicine(req.body);
    await medicine.save();
    res.status(201).json({ message: 'Medicine added', medicine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json({ message: 'Medicine updated', medicine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.dispenseMedicine = async (req, res) => {
  try {
    const { prescriptionId, medicines, notes } = req.body;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Check stock availability
    for (const item of medicines) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({ error: `Medicine ${item.name} not found` });
      }
      if (medicine.quantityInStock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantityInStock}` 
        });
      }
    }

    // Deduct from stock
    for (const item of medicines) {
      const medicine = await Medicine.findById(item.medicine);
      medicine.quantityInStock -= item.quantity;
      await medicine.save();
    }

    const dispense = new PharmacyDispense({
      prescription: prescriptionId,
      patient: prescription.patient,
      pharmacist: req.user._id,
      medicines,
      notes,
      status: 'dispensed'
    });

    await dispense.save();

    // Update prescription status
    prescription.status = 'dispensed';
    await prescription.save();

    await new AuditLog({
      user: req.user._id,
      action: 'DISPENSE_MEDICINE',
      entity: 'PharmacyDispense',
      entityId: dispense._id.toString(),
      details: { prescriptionId, medicineCount: medicines.length }
    }).save();

    res.status(201).json({
      message: 'Medicine dispensed successfully',
      dispense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDispenses = async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const filter = {};

    if (patientId) {
      const patient = await User.findOne({ patientId });
      if (patient) filter.patient = patient._id;
    }
    if (status) filter.status = status;

    const dispenses = await PharmacyDispense.find(filter)
      .populate('patient', 'firstName lastName patientId')
      .populate('pharmacist', 'firstName lastName')
      .populate('prescription')
      .sort({ dispenseDate: -1 });

    res.json(dispenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ BILLING CONTROLLERS ============

exports.createBill = async (req, res) => {
  try {
    const { patientId, items, discount, discountType, tax, paymentMethod } = req.body;

    const patient = await User.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      item.total = item.quantity * item.unitPrice;
      subtotal += item.total;
    }

    let totalAmount = subtotal;
    if (discount) {
      if (discountType === 'percentage') {
        totalAmount = subtotal - (subtotal * discount / 100);
      } else {
        totalAmount = subtotal - discount;
      }
    }
    if (tax) {
      totalAmount += totalAmount * tax / 100;
    }

    // Generate bill number
    const year = new Date().getFullYear();
    const count = await Billing.countDocuments({}) + 1;
    const billNumber = `BILL-${year}-${String(count).padStart(5, '0')}`;

    const bill = new Billing({
      patient: patient._id,
      billNumber,
      items,
      subtotal,
      discount: discount || 0,
      discountType,
      tax: tax || 0,
      totalAmount,
      paymentMethod,
      paymentStatus: 'pending',
      billedBy: req.user._id
    });

    await bill.save();

    await new AuditLog({
      user: req.user._id,
      action: 'CREATE_BILL',
      entity: 'Billing',
      entityId: bill._id.toString(),
      details: { patientId: patient.patientId, amount: totalAmount }
    }).save();

    res.status(201).json({
      message: 'Bill created successfully',
      bill
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBills = async (req, res) => {
  try {
    const { patientId, paymentStatus } = req.query;
    const filter = {};

    if (patientId) {
      const patient = await User.findOne({ patientId });
      if (patient) filter.patient = patient._id;
    }
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const bills = await Billing.find(filter)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('billedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, receiptNumber } = req.body;
    const bill = await Billing.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const newAmountPaid = bill.amountPaid + amount;
    bill.amountPaid = newAmountPaid;
    bill.balance = bill.totalAmount - newAmountPaid;

    if (bill.balance <= 0) {
      bill.paymentStatus = 'paid';
      bill.balance = 0;
    } else if (newAmountPaid > 0) {
      bill.paymentStatus = 'partial';
    }

    bill.paymentMethod = paymentMethod || bill.paymentMethod;
    bill.receiptNumber = receiptNumber || `RCPT-${Date.now()}`;
    bill.updatedAt = new Date();

    await bill.save();

    await new AuditLog({
      user: req.user._id,
      action: 'PROCESS_PAYMENT',
      entity: 'Billing',
      entityId: bill._id.toString(),
      details: { amount, billNumber: bill.billNumber }
    }).save();

    res.json({ message: 'Payment processed successfully', bill });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ ADMISSION CONTROLLERS ============

exports.admitPatient = async (req, res) => {
  try {
    const { 
      patientId, admissionType, ward, roomNumber, 
      bedNumber, diagnosis, attendingDoctorId 
    } = req.body;

    const patient = await User.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const admission = new Admission({
      patient: patient._id,
      admissionType,
      ward,
      roomNumber,
      bedNumber,
      diagnosis,
      attendingDoctor: attendingDoctorId
    });

    await admission.save();

    await new AuditLog({
      user: req.user._id,
      action: 'ADMIT_PATIENT',
      entity: 'Admission',
      entityId: admission._id.toString(),
      details: { patientId: patient.patientId }
    }).save();

    res.status(201).json({
      message: 'Patient admitted successfully',
      admission
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.dischargePatient = async (req, res) => {
  try {
    const { dischargeSummary } = req.body;
    const admission = await Admission.findById(req.params.id);

    if (!admission) {
      return res.status(404).json({ error: 'Admission record not found' });
    }

    admission.status = 'discharged';
    admission.dischargeDate = new Date();
    admission.dischargeSummary = dischargeSummary;
    admission.updatedAt = new Date();
    await admission.save();

    res.json({ message: 'Patient discharged successfully', admission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdmissions = async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const filter = {};

    if (patientId) {
      const patient = await User.findOne({ patientId });
      if (patient) filter.patient = patient._id;
    }
    if (status) filter.status = status;

    const admissions = await Admission.find(filter)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('attendingDoctor', 'firstName lastName specialization')
      .sort({ admissionDate: -1 });

    res.json(admissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ APPOINTMENT CONTROLLERS ============

exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, reason, symptoms } = req.body;
    
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check if time slot is available
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: new Date(date),
      time,
      status: { $nin: ['cancelled', 'completed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ error: 'Time slot already booked' });
    }

    const appointment = new Appointment({
      patient: req.user._id,
      doctor: doctorId,
      date: new Date(date),
      time,
      reason,
      symptoms: symptoms || [],
      status: 'pending'
    });

    await appointment.save();

    await new AuditLog({
      user: req.user._id,
      action: 'CREATE_APPOINTMENT',
      entity: 'Appointment',
      entityId: appointment._id.toString(),
      details: { doctorId, date, time }
    }).save();

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = {};
    
    if (req.user.role === 'patient') {
      filter.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    }

    if (status) filter.status = status;
    if (date) filter.date = new Date(date);

    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('doctor', 'firstName lastName specialization')
      .populate('department', 'name')
      .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (status) appointment.status = status;
    if (notes) appointment.notes = notes;
    appointment.updatedAt = new Date();

    await appointment.save();

    res.json({ message: 'Appointment updated', appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ DEPARTMENT CONTROLLERS ============

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('head', 'firstName lastName email')
      .populate('staff', 'firstName lastName');
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = new Department(req.body);
    await department.save();
    res.status(201).json({ message: 'Department created', department });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json({ message: 'Department updated', department });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ DOCTOR CONTROLLERS ============

exports.getDoctors = async (req, res) => {
  try {
    const { department, specialization } = req.query;
    const filter = { isActive: true };
    
    if (department) filter.department = department;
    if (specialization) filter.specialization = specialization;

    const doctors = await Doctor.find(filter)
      .populate('user', 'firstName lastName email phone profileImage')
      .sort({ rating: -1 });

    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('user', 'firstName lastName email phone profileImage');
    
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ STATISTICS CONTROLLERS ============

exports.getStatistics = async (req, res) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      totalNurses,
      totalStaff,
      totalDepartments,
      totalAppointmentsToday,
      totalBeds,
      occupiedBeds,
      totalMedicines,
      lowStockMedicines
    ] = await Promise.all([
      User.countDocuments({ role: 'patient', isActive: true }),
      User.countDocuments({ role: 'doctor', isActive: true }),
      User.countDocuments({ role: 'nurse', isActive: true }),
      User.countDocuments({ role: { $in: ['doctor', 'nurse', 'reception', 'laboratory', 'pharmacy', 'finance'] }, isActive: true }),
      Department.countDocuments({ isActive: true }),
      Appointment.countDocuments({ 
        date: { $gte: new Date().setHours(0,0,0), $lte: new Date().setHours(23,59,59) },
        status: { $in: ['confirmed', 'pending'] }
      }),
      100, // Placeholder - would come from bed management
      45, // Placeholder - occupied beds
      Medicine.countDocuments({ isActive: true }),
      Medicine.countDocuments({ quantityInStock: { $lt: 10 } })
    ]);

    res.json({
      patients: totalPatients,
      doctors: totalDoctors,
      nurses: totalNurses,
      staff: totalStaff,
      departments: totalDepartments,
      appointmentsToday: totalAppointmentsToday,
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      totalMedicines,
      lowStockMedicines
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ ADMIN CONTROLLERS ============

exports.getUsers = async (req, res) => {
  try {
    const { role, isActive, search } = req.query;
    const filter = {};
    
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { patientId: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await new AuditLog({
      user: req.user._id,
      action: 'UPDATE_USER_STATUS',
      entity: 'User',
      entityId: user._id.toString(),
      details: { isActive }
    }).save();

    res.json({ message: 'User status updated', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { limit = 50, page = 1, user, action } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    
    if (user) filter.user = user;
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .populate('user', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ NEWS CONTROLLERS ============

exports.getNews = async (req, res) => {
  try {
    const { limit = 10, page = 1, category } = req.query;
    const skip = (page - 1) * limit;
    const filter = { isPublished: true };
    if (category) filter.category = category;

    const news = await News.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await News.countDocuments(filter);

    res.json({
      news,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createNews = async (req, res) => {
  try {
    const { title, content, excerpt, category, tags } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const news = new News({
      title,
      slug,
      content,
      excerpt,
      category,
      tags: tags || [],
      author: req.user._id
    });

    await news.save();
    res.status(201).json({ message: 'News published', news });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ GALLERY CONTROLLERS ============

exports.getGallery = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;

    const gallery = await Gallery.find(filter).sort({ createdAt: -1 });
    res.json(gallery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createGallery = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    const gallery = new Gallery({
      title,
      description,
      category,
      images: req.body.images || []
    });

    await gallery.save();
    res.status(201).json({ message: 'Gallery created', gallery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
