// ============ News JavaScript ============

let currentPage = 1;
const limit = 6;

document.addEventListener('DOMContentLoaded', function() {
    loadNews();
});

async function loadNews(page = 1) {
    try {
        const response = await api.getNews(`?limit=${limit}&page=${page}`);
        const grid = document.getElementById('newsGridFull');
        
        if (!grid) return;
        
        if (!response.news || response.news.length === 0) {
            grid.innerHTML = `
                <div class="no-results" style="grid-column: 1 / -1;">
                    <span>📰</span>
                    <h3>No news articles found</h3>
                    <p>Check back later for updates.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = response.news.map(news => `
            <div class="news-card-full glass">
                <div class="news-image-full" style="background: linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})">
                    <span class="news-category">${news.category || 'Hospital'}</span>
                </div>
                <div class="news-content-full">
                    <div class="news-meta">
                        <span>📅 ${new Date(news.publishedDate).toLocaleDateString()}</span>
                        ${news.author ? `<span>👤 ${news.author.firstName} ${news.author.lastName}</span>` : ''}
                        <span>👁️ ${news.views || 0} views</span>
                    </div>
                    <h3>${news.title}</h3>
                    <p>${news.excerpt || news.content.substring(0, 200)}...</p>
                    <a href="news-detail.html?id=${news._id}" class="btn btn-outline btn-small">Read More →</a>
                </div>
            </div>
        `).join('');
        
        // Add pagination if needed
        if (response.totalPages > 1) {
            addPagination(response);
        }
    } catch (error) {
        console.error('Error loading news:', error);
        showToast('Error loading news', 'error');
    }
}

function addPagination(response) {
    const grid = document.getElementById('newsGridFull');
    if (!grid) return;
    
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.style.cssText = 'grid-column: 1 / -1; display: flex; justify-content: center; gap: 8px; margin-top: 40px;';
    
    for (let i = 1; i <= response.totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === response.page ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small';
        btn.onclick = () => loadNews(i);
        pagination.appendChild(btn);
    }
    
    grid.appendChild(pagination);
}
