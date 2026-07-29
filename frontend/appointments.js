// ============ Appointments JavaScript ============

let currentUser = null;
let allAppointments = [];

document.addEventListener('DOMContentLoaded', function() {
    currentUser = auth.getUser();
    
    // Load departments
    loadDepartments();
    
    // Load user's appointments
    loadAppointments();
    
    // Setup form submission
    setupAppointmentForm();
    
    // Setup filters
    setupFilters();
});

// ============ Load Departments ============
async function loadDepartments() {
    try {
        const departments = await api.getDepartments();
        const select = document.getElementById('appointmentDepartment');
        
        if (select) {
            select.innerHTML = '<option value="">Select Department</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept._id;
                option.textContent = dept.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
        showToast('Error loading departments', 'error');
    }
}

// ============ Load Doctors by Department ============
async function loadDoctors(departmentId) {
    try {
        const doctors = await api.getDoctors(`?department=${departmentId}`);
        const select = document.getElementById('appointmentDoctor');
        
        if (select) {
            select.innerHTML = '<option value="">Select Doctor</option>';
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.user._id;
                option.textContent = `Dr. ${doctor.user.firstName} ${doctor.user.lastName} - ${doctor.specialization}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        showToast('Error loading doctors', 'error');
    }
}

// ============ Load Available Times ============
function loadAvailableTimes() {
    const select = document.getElementById('appointmentTime');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Time</option>';
    
    // Generate time slots from 8:00 AM to 5:00 PM
    for (let hour = 8; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = time;
            
            // Format display time
            const displayHour = hour > 12 ? hour - 12 : hour;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            option.textContent = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
            select.appendChild(option);
        }
    }
}

// ============ Setup Appointment Form ============
function setupAppointmentForm() {
    const form = document.getElementById('appointmentForm');
    if (!form) return;
    
    // Load available times
    loadAvailableTimes();
    
    // Department change handler
    const departmentSelect = document.getElementById('appointmentDepartment');
    if (departmentSelect) {
        departmentSelect.addEventListener('change', function() {
            if (this.value) {
                loadDoctors(this.value);
            } else {
                const doctorSelect = document.getElementById('appointmentDoctor');
                if (doctorSelect) {
                    doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
                }
            }
        });
    }
    
    // Set min date to today
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }
    
    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Check if user is logged in
        if (!auth.checkAuth()) {
            showToast('Please login to book an appointment', 'warning');
            window.location.href = '/patient-login.html?redirect=/appointments.html';
            return;
        }
        
        const departmentId = document.getElementById('appointmentDepartment').value;
        const doctorId = document.getElementById('appointmentDoctor').value;
        const date = document.getElementById('appointmentDate').value;
        const time = document.getElementById('appointmentTime').value;
        const reason = document.getElementById('appointmentReason').value;
        const symptoms = document.getElementById('appointmentSymptoms').value;
        const terms = document.getElementById('appointmentTerms').checked;
        
        if (!departmentId || !doctorId || !date || !time) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }
        
        if (!terms) {
            showToast('Please agree to the terms and conditions', 'warning');
            return;
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Booking...';
        
        try {
            const appointmentData = {
                doctorId,
                date,
                time,
                reason,
                symptoms: symptoms ? symptoms.split(',').map(s => s.trim()) : []
            };
            
            const response = await api.createAppointment(appointmentData);
            
            if (response.appointment) {
                showToast('Appointment booked successfully!', 'success');
                form.reset();
                // Reload appointments
                loadAppointments();
                
                // Reset date to today
                const dateInput = document.getElementById('appointmentDate');
                if (dateInput) {
                    const today = new Date().toISOString().split('T')[0];
                    dateInput.value = today;
                }
            }
        } catch (error) {
            console.error('Error booking appointment:', error);
            showToast(error.message || 'Failed to book appointment. Please try again.', 'error');
        }
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Book Appointment';
    });
}

// ============ Load Appointments ============
async function loadAppointments() {
    try {
        const response = await api.getAppointments();
        allAppointments = response || [];
        renderAppointments(allAppointments);
    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('Error loading appointments', 'error');
    }
}

// ============ Render Appointments ============
function renderAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    if (!container) return;
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 48px; display: block; margin-bottom: 12px;">📅</span>
                <p>No appointments found</p>
                <p style="font-size: 14px; color: #aaa;">Book your first appointment using the form above.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appointments.map(app => `
        <div class="appointment-card">
            <div class="appointment-card-header">
                <span class="appointment-card-doctor">
                    Dr. ${app.doctor?.firstName || ''} ${app.doctor?.lastName || ''}
                    ${app.doctor?.specialization ? `(${app.doctor.specialization})` : ''}
                </span>
                <span class="appointment-card-status ${app.status}">${app.status}</span>
            </div>
            <div class="appointment-card-details">
                <span>📅 ${new Date(app.date).toLocaleDateString()}</span>
                <span>🕐 ${app.time}</span>
                ${app.reason ? `<span>📝 ${app.reason}</span>` : ''}
            </div>
            ${app.status === 'pending' || app.status === 'confirmed' ? `
                <div class="appointment-card-actions">
                    <button class="btn btn-small btn-reschedule" onclick="rescheduleAppointment('${app._id}')">
                        🔄 Reschedule
                    </button>
                    <button class="btn btn-small btn-cancel" onclick="cancelAppointment('${app._id}')">
                        ✕ Cancel
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// ============ Setup Filters ============
function setupFilters() {
    const filterSelect = document.getElementById('appointmentFilter');
    if (!filterSelect) return;
    
    filterSelect.addEventListener('change', function() {
        const filter = this.value;
        if (filter === 'all') {
            renderAppointments(allAppointments);
        } else {
            const filtered = allAppointments.filter(app => app.status === filter);
            renderAppointments(filtered);
        }
    });
}

// ============ Cancel Appointment ============
async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    try {
        await api.updateAppointment(appointmentId, { status: 'cancelled' });
        showToast('Appointment cancelled successfully', 'success');
        loadAppointments();
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showToast('Failed to cancel appointment', 'error');
    }
}
window.cancelAppointment = cancelAppointment;

// ============ Reschedule Appointment ============
function rescheduleAppointment(appointmentId) {
    // Open a modal or navigate to reschedule page
    showToast('Reschedule feature coming soon. Please contact reception.', 'info');
}
window.rescheduleAppointment = rescheduleAppointment;
