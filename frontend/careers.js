// ============ Careers JavaScript ============

document.addEventListener('DOMContentLoaded', function() {
    loadCareers();
});

async function loadCareers() {
    try {
        const careers = await api.getCareers();
        const grid = document.getElementById('careersGrid');
        
        if (!grid) return;
        
        if (!careers || careers.length === 0) {
            grid.innerHTML = `
                <div class="no-results" style="grid-column: 1 / -1;">
                    <span>💼</span>
                    <h3>No current openings</h3>
                    <p>Please check back later for new opportunities.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = careers.map(job => `
            <div class="job-card glass">
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <span class="job-type ${job.type?.toLowerCase()}">${job.type || 'Full-time'}</span>
                </div>
                <div class="job-details">
                    <span>🏛️ ${job.department || 'General'}</span>
                    <span>📍 ${job.location || 'Gimbie, Ethiopia'}</span>
                </div>
                <p>${job.description || ''}</p>
                <div class="job-requirements">
                    <strong>Requirements:</strong>
                    <ul>
                        ${job.requirements?.map(req => `<li>${req}</li>`).join('') || '<li>No specific requirements listed</li>'}
                    </ul>
                </div>
                ${job.salary ? `<div class="job-salary">💰 ${job.salary}</div>` : ''}
                <button class="btn btn-primary btn-small" onclick="applyForJob('${job._id}')">
                    Apply Now
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading careers:', error);
        showToast('Error loading job listings', 'error');
    }
}

function applyForJob(jobId) {
    if (!auth.checkAuth()) {
        showToast('Please login to apply for this position', 'warning');
        window.location.href = `/patient-login.html?redirect=/careers.html&job=${jobId}`;
        return;
    }
    
    // Show application form
    const job = document.querySelector(`[data-job-id="${jobId}"]`);
    if (job) {
        // Create modal for application
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content glass" style="max-width:500px;">
                <div class="modal-header">
                    <h3>📝 Apply for Position</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="applicationForm">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" id="appName" required />
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="appEmail" required />
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" id="appPhone" required />
                        </div>
                        <div class="form-group">
                            <label>Cover Letter</label>
                            <textarea id="appCoverLetter" rows="4" placeholder="Tell us why you're the right fit..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary btn-full">Submit Application</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const form = modal.querySelector('#applicationForm');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            showToast('✅ Application submitted successfully! We\'ll contact you soon.', 'success');
            modal.remove();
        });
    }
}
window.applyForJob = applyForJob;
