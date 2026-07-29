// ============ Doctors JavaScript ============

let allDoctors = [];
let departments = [];

document.addEventListener('DOMContentLoaded', function() {
    loadDoctors();
    loadDepartments();
    setupFilters();
});

// ============ Load Doctors ============
async function loadDoctors(filters = {}) {
    try {
        const params = new URLSearchParams(filters).toString();
        const doctors = await api.getDoctors(params ? `?${params}` : '');
        allDoctors = doctors || [];
        renderDoctors(allDoctors);
    } catch (error) {
        console.error('Error loading doctors:', error);
        showToast('Error loading doctors', 'error');
    }
}

// ============ Render Doctors ============
function renderDoctors(doctors) {
    const grid = document.getElementById('doctorsGrid');
    if (!grid) return;
    
    if (!doctors || doctors.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <span>🔍</span>
                <h3>No doctors found</h3>
                <p>Try adjusting your filters or search criteria.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = doctors.map(doctor => {
        const user = doctor.user || {};
        const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
        const stars = '★'.repeat(Math.round(doctor.rating || 0)) + '☆'.repeat(5 - Math.round(doctor.rating || 0));
        
        return `
            <div class="doctor-card glass">
                <div class="doctor-card-header">
                    <div class="doctor-avatar">${initials || '👨‍⚕️'}</div>
                    <div class="doctor-info">
                        <div class="doctor-name">Dr. ${user.firstName || ''} ${user.lastName || ''}</div>
                        <div class="doctor-specialization">${doctor.specialization || 'General'}</div>
                        <div class="doctor-department">${doctor.department || ''}</div>
                    </div>
                </div>
                <div class="doctor-card-body">
                    <div class="doctor-expertise">
                        ${doctor.qualifications?.map(q => `<span class="doctor-tag">${q}</span>`).join('') || ''}
                    </div>
                    ${doctor.bio ? `<p style="font-size:14px;color:#666;margin-bottom:8px;">${doctor.bio}</p>` : ''}
                    <div class="doctor-experience">${doctor.experience || 0} years of experience</div>
                    <div class="doctor-rating">
                        <span class="doctor-stars">${stars}</span>
                        <span class="doctor-rating-value">${doctor.rating || 0}</span>
                        <span class="doctor-rating-count">(${doctor.totalReviews || 0} reviews)</span>
                    </div>
                    ${doctor.consultationFee ? `<div style="font-size:14px;color:#888;">Consultation Fee: $${doctor.consultationFee}</div>` : ''}
                </div>
                <div class="doctor-card-footer">
                    <a href="doctor.html?id=${doctor._id}" class="btn btn-outline">View Profile</a>
                    <a href="appointments.html?doctor=${doctor._id}" class="btn btn-primary">Book Appointment</a>
                </div>
            </div>
        `;
    }).join('');
}

// ============ Load Departments ============
async function loadDepartments() {
    try {
        departments = await api.getDepartments();
        const filterSelect = document.getElementById('filterDepartment');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">All Departments</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.name;
                option.textContent = dept.name;
                filterSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// ============ Setup Filters ============
function setupFilters() {
    const departmentFilter = document.getElementById('filterDepartment');
    const specializationFilter = document.getElementById('filterSpecialization');
    const searchFilter = document.getElementById('filterSearch');
    
    if (departmentFilter) {
        departmentFilter.addEventListener('change', applyFilters);
    }
    
    if (specializationFilter) {
        specializationFilter.addEventListener('change', applyFilters);
    }
    
    if (searchFilter) {
        let timeout;
        searchFilter.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(applyFilters, 300);
        });
    }
}

function applyFilters() {
    const filters = {};
    
    const department = document.getElementById('filterDepartment')?.value;
    if (department) filters.department = department;
    
    const specialization = document.getElementById('filterSpecialization')?.value;
    if (specialization) filters.specialization = specialization;
    
    const search = document.getElementById('filterSearch')?.value.trim();
    if (search) filters.search = search;
    
    // Filter locally
    let filtered = allDoctors;
    
    if (filters.department) {
        filtered = filtered.filter(d => d.department === filters.department);
    }
    
    if (filters.specialization) {
        filtered = filtered.filter(d => d.specialization === filters.specialization);
    }
    
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(d => {
            const user = d.user || {};
            const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            const spec = (d.specialization || '').toLowerCase();
            const dept = (d.department || '').toLowerCase();
            return name.includes(searchLower) || spec.includes(searchLower) || dept.includes(searchLower);
        });
    }
    
    renderDoctors(filtered);
                          }
