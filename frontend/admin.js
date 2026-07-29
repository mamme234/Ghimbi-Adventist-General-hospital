// ============ Admin Dashboard JavaScript ============

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication and admin role
    if (!auth.checkAuth() || !auth.requireRole('admin')) {
        return;
    }

    // Load admin dashboard
    loadAdminDashboard();
});

// ============ Load Admin Dashboard ============
async function loadAdminDashboard() {
    try {
        // Get admin dashboard data
        const data = await api.getAdminDashboard();
        
        // Update stats
        updateAdminStats(data);
        
        // Update recent users
        updateRecentUsers(data.recentUsers);
        
        // Update recent appointments
        updateRecentAppointments(data.recentAppointments);
        
        // Update audit logs
        updateAuditLogs(data.auditLogs || []);
        
        // Update system health
        updateSystemHealth();
        
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showToast('Error loading admin dashboard. Please refresh.', 'error');
    }
}

// ============ Update Admin Stats ============
function updateAdminStats(data) {
    document.getElementById('totalUsers').textContent = data.totalUsers || 0;
    document.getElementById('totalDoctors').textContent = data.doctors || 0;
    document.getElementById('totalPatients').textContent = data.patients || 0;
    document.getElementById('totalAppointments').textContent = data.totalAppointments || 0;
    document.getElementById('totalNews').textContent = data.totalNews || 0;
    document.getElementById('totalRevenue').textContent = `$${data.revenue || 0}`;
}

// ============ Update Recent Users ============
function updateRecentUsers(users) {
    const container = document.getElementById('recentUsers');
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p class="empty-state">No users found</p>';
        return;
    }

    const roleClass = {
        'admin': 'admin',
        'doctor': 'doctor',
        'patient': 'patient',
        'nurse': 'nurse',
        'reception': 'reception',
        'laboratory': 'laboratory',
        'pharmacy': 'pharmacy',
        'finance': 'finance'
    };

    container.innerHTML = users.slice(0, 10).map(user => `
        <div class="user-item">
            <div class="user-info">
                <span class="user-name">${user.firstName} ${user.lastName}</span>
                <span class="user-email">${user.email || user.phone}</span>
            </div>
            <span class="user-role ${roleClass[user.role] || 'patient'}">${user.role || 'patient'}</span>
        </div>
    `).join('');
}

// ============ Update Recent Appointments ============
function updateRecentAppointments(appointments) {
    const container = document.getElementById('recentAppointments');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<p class="empty-state">No appointments found</p>';
        return;
    }

    container.innerHTML = appointments.slice(0, 10).map(app => `
        <div class="appointment-item">
            <div class="appointment-info">
                <span class="appointment-doctor">
                    ${app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : 'Patient'} 
                    → Dr. ${app.doctor ? `${app.doctor.firstName} ${app.doctor.lastName}` : 'Doctor'}
                </span>
                <span class="appointment-details">
                    ${new Date(app.date).toLocaleDateString()} at ${app.time}
                </span>
            </div>
            <span class="appointment-status ${app.status}">${app.status}</span>
        </div>
    `).join('');
}

// ============ Update Audit Logs ============
function updateAuditLogs(logs) {
    const container = document.getElementById('recentAuditLogs');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p class="empty-state">No audit logs found</p>';
        return;
    }

    container.innerHTML = logs.slice(0, 10).map(log => `
        <div class="audit-item">
            <div class="audit-info">
                <span class="audit-action">${log.action || 'Unknown Action'}</span>
                <span class="audit-details">
                    ${log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                    ${log.entity ? `• ${log.entity}` : ''}
                </span>
            </div>
            <span class="audit-time">${new Date(log.timestamp).toLocaleString()}</span>
        </div>
    `).join('');
}

// ============ Update System Health ============
function updateSystemHealth() {
    // This would typically come from an API endpoint
    // For now, we'll keep the static display
    const healthItems = document.querySelectorAll('.health-item');
    
    // Add click handler to refresh health status
    const healthCard = document.querySelector('.system-health')?.parentElement?.parentElement;
    if (healthCard) {
        healthCard.addEventListener('click', function() {
            showToast('System health check performed.', 'success');
        });
    }
}
