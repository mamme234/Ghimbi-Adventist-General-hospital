// ============ Gallery JavaScript ============

let allGalleryItems = [];

document.addEventListener('DOMContentLoaded', function() {
    loadGallery();
    setupFilters();
});

async function loadGallery() {
    try {
        const gallery = await api.getGallery();
        allGalleryItems = gallery || [];
        renderGallery(allGalleryItems);
    } catch (error) {
        console.error('Error loading gallery:', error);
        showToast('Error loading gallery', 'error');
    }
}

function renderGallery(items) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    
    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1;">
                <span>🖼️</span>
                <h3>No images found</h3>
                <p>Check back later for new photos.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = items.map(item => `
        <div class="gallery-item" onclick="openLightbox('${item._id}')">
            <div class="gallery-image" style="background: linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})">
                ${item.images && item.images.length > 0 ? `<img src="${item.images[0].url}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;" />` : '📸'}
            </div>
            <div class="gallery-item-content">
                <h4>${item.title}</h4>
                <p>${item.description || ''}</p>
                <span style="font-size:12px;color:#aaa;">${item.category || ''}</span>
            </div>
        </div>
    `).join('');
}

function setupFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', function() {
            filters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            if (filter === 'all') {
                renderGallery(allGalleryItems);
            } else {
                const filtered = allGalleryItems.filter(item => item.category === filter);
                renderGallery(filtered);
            }
        });
    });
}

function openLightbox(itemId) {
    const item = allGalleryItems.find(i => i._id === itemId);
    if (!item || !item.images || item.images.length === 0) return;
    
    const lightbox = document.getElementById('lightbox') || createLightbox();
    const img = lightbox.querySelector('.lightbox-content img');
    const caption = lightbox.querySelector('.lightbox-caption');
    
    img.src = item.images[0].url;
    caption.textContent = item.title;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function createLightbox() {
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <span class="lightbox-close" onclick="closeLightbox()">×</span>
        <div class="lightbox-content">
            <img src="" alt="Gallery image" />
        </div>
        <div class="lightbox-caption"></div>
    `;
    lightbox.addEventListener('click', function(e) {
        if (e.target === this) closeLightbox();
    });
    document.body.appendChild(lightbox);
    return lightbox;
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
