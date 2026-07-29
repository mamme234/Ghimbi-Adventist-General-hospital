const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { User, Department, Medicine } = require('./models');

const seedDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Medicine.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash(config.adminPassword, 12);
    const admin = new User({
      firstName: 'System',
      lastName: 'Administrator',
      email: config.adminEmail,
      password: adminPassword,
      phone: '+251-900-000000',
      role: 'admin',
      isActive: true
    });
    await admin.save();
    console.log('Admin created');

    // Create departments
    const departments = [
      { name: 'Emergency', description: '24/7 Emergency Services' },
      { name: 'Surgery', description: 'General and Specialized Surgery' },
      { name: 'Pediatrics', description: 'Children\'s Healthcare' },
      { name: 'Maternity', description: 'Maternal and Newborn Care' },
      { name: 'Internal Medicine', description: 'Internal Medicine Department' },
      { name: 'Dental', description: 'Dental Care Services' },
      { name: 'Eye Clinic', description: 'Ophthalmology Services' },
      { name: 'Pharmacy', description: 'Hospital Pharmacy' },
      { name: 'Laboratory', description: 'Clinical Laboratory Services' },
      { name: 'Radiology', description: 'Medical Imaging Services' },
      { name: 'Cardiology', description: 'Heart Health Services' },
      { name: 'Orthopedics', description: 'Bone and Joint Services' }
    ];

    for (const dept of departments) {
      const department = new Department({
        ...dept,
        isActive: true
      });
      await department.save();
    }
    console.log('Departments created');

    // Sample medicines
    const medicines = [
      { name: 'Paracetamol 500mg', category: 'Analgesic', price: 2.50, quantityInStock: 1000, reorderLevel: 100 },
      { name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 5.00, quantityInStock: 500, reorderLevel: 50 },
      { name: 'Ibuprofen 400mg', category: 'Anti-inflammatory', price: 3.00, quantityInStock: 800, reorderLevel: 80 },
      { name: 'Omeprazole 20mg', category: 'Antacid', price: 4.00, quantityInStock: 600, reorderLevel: 60 },
      { name: 'Metformin 500mg', category: 'Antidiabetic', price: 3.50, quantityInStock: 400, reorderLevel: 40 },
      { name: 'Atorvastatin 10mg', category: 'Cholesterol', price: 6.00, quantityInStock: 300, reorderLevel: 30 },
      { name: 'Amlodipine 5mg', category: 'Antihypertensive', price: 4.50, quantityInStock: 500, reorderLevel: 50 },
      { name: 'Azithromycin 250mg', category: 'Antibiotic', price: 7.00, quantityInStock: 300, reorderLevel: 30 },
      { name: 'Ciprofloxacin 500mg', category: 'Antibiotic', price: 5.50, quantityInStock: 400, reorderLevel: 40 },
      { name: 'Diclofenac 50mg', category: 'Anti-inflammatory', price: 2.00, quantityInStock: 600, reorderLevel: 60 }
    ];

    for (const med of medicines) {
      const medicine = new Medicine({
        ...med,
        dosageForm: 'Tablet',
        unit: 'Tablet',
        requiresPrescription: true,
        isActive: true
      });
      await medicine.save();
    }
    console.log('Medicines created');

    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
