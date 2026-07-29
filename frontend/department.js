// ============ Department Pages JavaScript ============

// ============ Load Department Doctors ============
async function loadDepartmentDoctors(department, containerId) {
    try {
        const doctors = await api.getDoctors(`?department=${encodeURIComponent(department)}`);
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        if (!doctors || doctors.length === 0) {
            container.innerHTML = `
                <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <span style="font-size: 48px; display: block; margin-bottom: 12px;">👨‍⚕️</span>
                    <h3>No doctors found</h3>
                    <p style="color: rgba(var(--black-rgb), 0.4);">Check back later for our team members.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = doctors.slice(0, 6).map(doctor => {
            const user = doctor.user || {};
            const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
            
            return `
                <div class="team-member glass">
                    <div class="team-avatar">${initials || '👨‍⚕️'}</div>
                    <h4>Dr. ${user.firstName || ''} ${user.lastName || ''}</h4>
                    <p>${doctor.specialization || 'General'}</p>
                    <p style="font-size: 12px; color: rgba(var(--black-rgb), 0.3);">${doctor.experience || 0} years experience</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

// ============ Load Medicines ============
async function loadMedicines() {
    try {
        const medicines = await api.getMedicines();
        const grid = document.getElementById('medicinesGrid');
        
        if (!grid) return;
        
        if (!medicines || medicines.length === 0) {
            grid.innerHTML = `
                <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <span style="font-size: 48px; display: block; margin-bottom: 12px;">💊</span>
                    <h3>No medicines available</h3>
                    <p style="color: rgba(var(--black-rgb), 0.4);">Check back later for our medicine inventory.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = medicines.slice(0, 12).map(med => `
            <div class="medicine-item glass">
                <h4>${med.name}</h4>
                <p>${med.category || 'General'}</p>
                <p style="font-size: 12px; color: rgba(var(--black-rgb), 0.3);">${med.dosageForm || 'Tablet'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading medicines:', error);
    }
}

// ============ Load Tests ============
async function loadTests() {
    try {
        // This would typically come from an API endpoint
        // For now, we'll show sample tests
        const tests = [
            { name: 'Complete Blood Count (CBC)', category: 'Hematology' },
            { name: 'Blood Sugar (Fasting)', category: 'Clinical Chemistry' },
            { name: 'Blood Sugar (Random)', category: 'Clinical Chemistry' },
            { name: 'Cholesterol (Total)', category: 'Clinical Chemistry' },
            { name: 'Kidney Function Test', category: 'Clinical Chemistry' },
            { name: 'Liver Function Test', category: 'Clinical Chemistry' },
            { name: 'Urinalysis', category: 'Urinalysis' },
            { name: 'Stool Analysis', category: 'Microbiology' },
            { name: 'COVID-19 PCR Test', category: 'Molecular Testing' },
            { name: 'HIV Test', category: 'Immunology' },
            { name: 'Hepatitis B Test', category: 'Immunology' },
            { name: 'Thyroid Function Test', category: 'Endocrinology' }
        ];
        
        const grid = document.getElementById('testsGrid');
        
        if (!grid) return;
        
        grid.innerHTML = tests.map(test => `
            <div class="test-item glass">
                <h4>${test.name}</h4>
                <p>${test.category}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading tests:', error);
    }
}

// ============ Search Medicines ============
function searchMedicines() {
    const searchInput = document.getElementById('medicineSearch');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    const items = document.querySelectorAll('.medicine-item');
    
    items.forEach(item => {
        const name = item.querySelector('h4')?.textContent?.toLowerCase() || '';
        const category = item.querySelector('p')?.textContent?.toLowerCase() || '';
        
        if (name.includes(query) || category.includes(query)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// ============ Search Tests ============
function searchTests() {
    const searchInput = document.getElementById('testSearch');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    const items = document.querySelectorAll('.test-item');
    
    items.forEach(item => {
        const name = item.querySelector('h4')?.textContent?.toLowerCase() || '';
        const category = item.querySelector('p')?.textContent?.toLowerCase() || '';
        
        if (name.includes(query) || category.includes(query)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// ============ FAQ Toggle ============
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            const isActive = item.classList.contains('active');
            
            // Close all
            faqItems.forEach(i => i.classList.remove('active'));
            
            // Open this one if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ============ Export Functions ============
window.loadDepartmentDoctors = loadDepartmentDoctors;
window.loadMedicines = loadMedicines;
window.loadTests = loadTests;
window.searchMedicines = searchMedicines;
window.searchTests = searchTests;
window.initFAQ = initFAQ;
