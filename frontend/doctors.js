// ============ Doctors JavaScript ============

let allDoctors = [];
let currentPage = 1;
const limit = 9;
let filteredDoctors = [];
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    loadDoctors();
    loadDepartments();
    setupFilters();
    setupLoadMore();
});

// ============ Load Doctors ============
async function loadDoctors(page = 1) {
    try {
        isLoading = true;
        const params = new URLSearchParams({ limit: limit, page: page });
        const doctors = await api.getDoctors(`?${params.toString()}`);
        
        if (page === 1) {
            allDoctors = doctors || [];
        } else {
            allDoctors = [...allDoctors, ...(doctors || [])];
        }
        
        filteredDoctors = allDoctors;
        renderDoctors(filteredDoctors, page === 1);
        isLoading = false;
        
    } catch (error) {
        console.error('Error loading doctors:', error);
        showToast('Error loading doctors', 'error');
        isLoading = false;
    }
}

// ============ Render Doctors ============
function renderDoctors(doctors, replace = true) {
    const grid = document.getElementById('doctorsGrid');
    if (!grid) return;

    if (!doctors || doctors.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <span class="no-results-icon">🔍</span>
                <h3>No doctors found</h3>
                <p>Try adjusting your filters or search criteria.</p>
            </div>
        `;
        return;
    }

    const cards = doctors.map(doctor => {
        const user = doctor.user || {};
        const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
        const stars = getStars(doctor.rating || 0);
        const hasPhoto = user.profileImage && user.profileImage !== '';
        
        return `
            <div class="doctor-card glass" data-doctor-id="${doctor._id}">
                <div class="doctor-card-top">
                    <div class="doctor-avatar-wrapper">
                        ${hasPhoto ? 
                            `<img src="${user.profileImage}" alt="${user.firstName} ${user.lastName}" class="doctor-avatar" />` :
                            `<div class="doctor-avatar-placeholder">${initials || '👨‍⚕️'}</div>`
                        }
                        <span class="doctor-status-badge ${getStatus(doctor)}"></span>
                    </div>
                    <div class="doctor-info">
                        <div class="doctor-name">Dr. ${user.firstName || ''} ${user.lastName || ''}</div>
                        <div class="doctor-title">${doctor.specialization || 'General Practitioner'}</div>
                        <div class="doctor-specialty">${doctor.department || ''}</div>
                        <div class="doctor-rating">
                            <span class="doctor-stars">${stars}</span>
                            <span class="doctor-rating-text">(${doctor.totalReviews || 0} reviews)</span>
                        </div>
                    </div>
                </div>

                <div class="doctor-card-body">
                    ${doctor.qualifications && doctor.qualifications.length > 0 ? `
                        <div class="doctor-expertise">
                            ${doctor.qualifications.slice(0, 4).map(q => 
                                `<span class="doctor-tag">${q}</span>`
                            ).join('')}
                            ${doctor.qualifications.length > 4 ? 
                                `<span class="doctor-tag">+${doctor.qualifications.length - 4} more</span>` : ''
                            }
                        </div>
                    ` : ''}

                    <div class="doctor-details-grid">
                        <span class="detail-item">
                            <span class="detail-icon">💼</span>
                            ${doctor.experience || 0} years experience
                        </span>
                        <span class="detail-item">
                            <span class="detail-icon">🗣️</span>
                            ${doctor.languages && doctor.languages.length > 0 ? 
                                doctor.languages.slice(0, 2).join(', ') : 'English'
                            }
                            ${doctor.languages && doctor.languages.length > 2 ? 
                                ` +${doctor.languages.length - 2}` : ''
                            }
                        </span>
                        ${doctor.consultationFee ? `
                            <span class="detail-item">
                                <span class="detail-icon">💰</span>
                                $${doctor.consultationFee} consultation fee
                            </span>
                        ` : ''}
                        <span class="detail-item">
                            <span class="detail-icon">📋</span>
                            ${doctor.licenseNumber || 'License verified'}
                        </span>
                    </div>

                    ${doctor.bio ? `
                        <div class="doctor-bio">${doctor.bio}</div>
                    ` : ''}
                </div>

                <div class="doctor-card-footer">
                    <a href="doctor.html?id=${doctor._id}" class="btn btn-view">
                        <span class="btn-icon">👤</span> View Profile
                    </a>
                    <a href="appointments.html?doctor=${doctor._id}" class="btn btn-book">
                        <span class="btn-icon">📅</span> Book Appointment
                    </a>
                </div>
            </div>
        `;
    }).join('');

    if (replace) {
        grid.innerHTML = cards;
    } else {
        grid.insertAdjacentHTML('beforeend', cards);
    }

    // Update load more visibility
    updateLoadMore(doctors);
}

// ============ Helper Functions ============
function getStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function getStatus(doctor) {
    // Simulate status - in real app, this would come from the backend
    const statuses = ['online', 'online', 'online', 'away', 'offline'];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

// ============ Load Departments ============
async function loadDepartments() {
    try {
        const departments = await api.getDepartments();
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
    const filters = [
        'filterDepartment',
        'filterSpecialization',
        'filterGender',
        'filterLanguage'
    ];

    filters.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });

    const searchInput = document.getElementById('filterSearch');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(applyFilters, 300);
        });
    }
}

function applyFilters() {
    const filters = {
        department: document.getElementById('filterDepartment')?.value || '',
        specialization: document.getElementById('filterSpecialization')?.value || '',
        gender: document.getElementById('filterGender')?.value || '',
        language: document.getElementById('filterLanguage')?.value || '',
        search: document.getElementById('filterSearch')?.value.trim().toLowerCase() || ''
    };

    let filtered = allDoctors;

    if (filters.department) {
        filtered = filtered.filter(d => 
            d.department && d.department.toLowerCase() === filters.department.toLowerCase()
        );
    }

    if (filters.specialization) {
        filtered = filtered.filter(d => 
            d.specialization && d.specialization.toLowerCase() === filters.specialization.toLowerCase()
        );
    }

    if (filters.gender) {
        filtered = filtered.filter(d => 
            d.user && d.user.gender === filters.gender
        );
    }

    if (filters.language) {
        filtered = filtered.filter(d => 
            d.languages && d.languages.some(l => 
                l.toLowerCase() === filters.language.toLowerCase()
            )
        );
    }

    if (filters.search) {
        filtered = filtered.filter(d => {
            const user = d.user || {};
            const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            const spec = (d.specialization || '').toLowerCase();
            const dept = (d.department || '').toLowerCase();
            return name.includes(filters.search) || 
                   spec.includes(filters.search) || 
                   dept.includes(filters.search);
        });
    }

    filteredDoctors = filtered;
    currentPage = 1;
    renderDoctors(filtered, true);
}

// ============ Setup Load More ============
function setupLoadMore() {
    const btn = document.getElementById('loadMoreBtn');
    if (btn) {
        btn.addEventListener('click', function() {
            if (!isLoading) {
                currentPage++;
                loadDoctors(currentPage);
            }
        });
    }
}

function updateLoadMore(doctors) {
    const container = document.getElementById('loadMoreContainer');
    if (!container) return;

    if (doctors.length < limit) {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
    }
}

// ============ Export Functions ============
window.applyFilters = applyFilters;
