// ============ Departments JavaScript ============

document.addEventListener('DOMContentLoaded', function() {
    loadDepartments();
});

async function loadDepartments() {
    try {
        const departments = await api.getDepartments();
        const grid = document.getElementById('departmentsGrid');
        
        if (!grid) return;
        
        grid.innerHTML = departments.map(dept => `
            <div class="department-card glass">
                <span class="department-icon">${getDepartmentIcon(dept.name)}</span>
                <h3>${dept.name}</h3>
                <p>${dept.description || 'Comprehensive medical services'}</p>
                ${dept.head ? `<small>Head: Dr. ${dept.head.firstName} ${dept.head.lastName}</small>` : ''}
                <div class="department-actions">
                    <a href="appointments.html?department=${dept._id}" class="btn btn-primary btn-small">Book Appointment</a>
                    <a href="doctors.html?department=${dept.name}" class="btn btn-outline btn-small">View Doctors</a>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading departments:', error);
        showToast('Error loading departments', 'error');
    }
}

function getDepartmentIcon(name) {
    const icons = {
        'Emergency': '🚑',
        'Surgery': '🔪',
        'Pediatrics': '👶',
        'Maternity': '🤱',
        'Internal Medicine': '🫀',
        'Dental': '🦷',
        'Eye Clinic': '👁️',
        'Pharmacy': '💊',
        'Laboratory': '🔬',
        'Radiology': '📷',
        'Cardiology': '❤️',
        'Orthopedics': '🦴'
    };
    return icons[name] || '🏥';
          }
