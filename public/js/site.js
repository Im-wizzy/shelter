// =============================================================
// public/js/site.js
//
// Powers the public Shelter homepage:
//  - Hamburger nav that collapses/expands on mobile
//  - Loads visible listings from /api/houses
//  - Category tabs + location filter
//  - House card grid
//  - Full detail modal:
//      - Smooth slide-up on mobile, pop-in on desktop
//      - Photo gallery with thumbnail strip + photo counter
//      - Stats pills (bed / bath / size)
//      - Collapsible description (show more / less)
//      - Owner contact buttons (Call / WhatsApp / Email)
//      - Swipe down to close on mobile
// =============================================================

const CURRENCY_SYMBOL = 'GH\u20B5'; // Ghanaian Cedi — change if needed

const CATEGORY_LABELS = {
  sale: 'For Sale',
  rent: 'For Rent',
  'short-stay': 'Short Stay'
};

const SECTION_TITLES = {
  all: 'All listings',
  sale: 'Houses for sale',
  rent: 'Houses for rent',
  'short-stay': 'Short stay homes'
};

// ---- Element references ----------------------------------------
const navToggle      = document.getElementById('navToggle');
const headerNav      = document.getElementById('headerNav');
const categoryNav    = document.getElementById('categoryNav');
const locationFilter = document.getElementById('locationFilter');
const clearFiltersBtn= document.getElementById('clearFiltersBtn');
const houseGrid      = document.getElementById('houseGrid');
const emptyState     = document.getElementById('emptyState');
const resultsTitle   = document.getElementById('resultsTitle');
const resultsCount   = document.getElementById('resultsCount');

const detailModal       = document.getElementById('detailModal');
const modalCard         = document.getElementById('modalCard');
const modalClose        = document.getElementById('modalClose');
const modalMainImageWrap= document.getElementById('modalMainImageWrap');
const modalThumbs       = document.getElementById('modalThumbs');
const modalCategory     = document.getElementById('modalCategory');
const modalTitle        = document.getElementById('modalTitle');
const modalLocation     = document.getElementById('modalLocation');
const modalPrice        = document.getElementById('modalPrice');
const modalStats        = document.getElementById('modalStats');
const modalDescWrap     = document.getElementById('modalDescriptionWrap');
const modalDescription  = document.getElementById('modalDescription');
const showMoreBtn       = document.getElementById('showMoreBtn');
const modalOwner        = document.getElementById('modalOwner');

// ---- State -----------------------------------------------------
let allHouses      = [];
let activeCategory = 'all';
let activeLocation = '';
let descExpanded   = false;

// ================================================================
// HAMBURGER NAV
// ================================================================
navToggle.addEventListener('click', () => {
  const isOpen = headerNav.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close nav when a category tab is tapped on mobile
categoryNav.addEventListener('click', () => {
  if (window.innerWidth < 768) {
    headerNav.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

// ================================================================
// HELPERS
// ================================================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(house) {
  const amount = Number(house.price || 0).toLocaleString();
  const unit   = house.priceUnit
    ? ` <span class="unit">/ ${escapeHtml(house.priceUnit)}</span>`
    : '';
  return `${CURRENCY_SYMBOL}${amount}${unit}`;
}

// ================================================================
// DATA LOADING
// ================================================================
async function loadHouses() {
  try {
    const res = await fetch('/api/houses');
    if (!res.ok) throw new Error('Failed to load listings.');
    allHouses = await res.json();
    buildLocationOptions();
    renderHouses();
  } catch (err) {
    houseGrid.innerHTML = `<p class="text-muted">Could not load listings right now. Please try again later.</p>`;
  }
}

function buildLocationOptions() {
  const locations = [...new Set(allHouses.map(h => h.location).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  locationFilter.innerHTML =
    '<option value="">All locations</option>' +
    locations.map(loc => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`).join('');
}

// ================================================================
// FILTERING & RENDERING CARDS
// ================================================================
function getFilteredHouses() {
  return allHouses.filter(h => {
    const matchCat = activeCategory === 'all' || h.category === activeCategory;
    const matchLoc = !activeLocation || h.location === activeLocation;
    return matchCat && matchLoc;
  });
}

function renderHouses() {
  const houses = getFilteredHouses();

  resultsTitle.textContent = SECTION_TITLES[activeCategory] || 'Listings';
  resultsCount.textContent = houses.length === 1 ? '1 result' : `${houses.length} results`;

  if (houses.length === 0) {
    houseGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  houseGrid.innerHTML = houses.map(house => {
    const cover = house.images && house.images.length > 0
      ? `<img src="${house.images[0].url}" alt="${escapeHtml(house.title)}" loading="lazy" />`
      : `<div class="no-image">No photo available</div>`;

    const categoryLabel = CATEGORY_LABELS[house.category] || house.category;

    const metaParts = [];
    if (house.bedrooms)  metaParts.push(`🛏 ${house.bedrooms}`);
    if (house.bathrooms) metaParts.push(`🚿 ${house.bathrooms}`);
    if (house.size)      metaParts.push(escapeHtml(house.size));

    return `
      <button type="button" class="house-card" data-id="${house.id}">
        <div class="thumb">
          ${cover}
          <span class="badge badge-${house.category}">${categoryLabel}</span>
        </div>
        <div class="body">
          <h3>${escapeHtml(house.title)}</h3>
          <div class="location">${escapeHtml(house.location)}</div>
          <div class="price">${formatPrice(house)}</div>
          ${metaParts.length ? `<div class="meta">${metaParts.join(' &nbsp;·&nbsp; ')}</div>` : ''}
        </div>
      </button>
    `;
  }).join('');
}

// ================================================================
// DETAIL MODAL
// ================================================================

// ---- Gallery -------------------------------------------------------
let currentImages = [];
let currentImageIndex = 0;

function renderGallery(house) {
  currentImages = house.images || [];
  currentImageIndex = 0;

  if (currentImages.length === 0) {
    modalMainImageWrap.innerHTML = '<div class="no-image">No photos available</div>';
    modalThumbs.innerHTML = '';
    return;
  }

  showGalleryImage(0);

  // Thumbnail strip
  modalThumbs.innerHTML = currentImages.map((img, i) => `
    <img
      src="${img.url}"
      alt="Photo ${i + 1}"
      class="${i === 0 ? 'active' : ''}"
      data-index="${i}"
    />
  `).join('');
}

function showGalleryImage(index) {
  currentImageIndex = index;
  const img = currentImages[index];

  // Fade transition: fade out, swap src, fade in
  const existing = modalMainImageWrap.querySelector('img');
  if (existing) existing.style.opacity = '0';

  setTimeout(() => {
    modalMainImageWrap.innerHTML = `
      <img src="${img.url}" alt="Photo ${index + 1}" style="opacity:0;transition:opacity 0.2s ease;" />
      ${currentImages.length > 1
        ? `<span class="photo-count">${index + 1} / ${currentImages.length}</span>`
        : ''}
    `;
    const newImg = modalMainImageWrap.querySelector('img');
    // Trigger fade-in after paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { newImg.style.opacity = '1'; });
    });
  }, existing ? 150 : 0);

  // Sync active thumbnail
  modalThumbs.querySelectorAll('img').forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });

  // Scroll active thumbnail into view
  const activeTile = modalThumbs.querySelector('img.active');
  if (activeTile) activeTile.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// Thumbnail click → show that image
modalThumbs.addEventListener('click', (e) => {
  const thumb = e.target.closest('img[data-index]');
  if (!thumb) return;
  showGalleryImage(Number(thumb.dataset.index));
});

// Swipe left/right on the main image to navigate photos
let touchStartX = 0;
modalMainImageWrap.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

modalMainImageWrap.addEventListener('touchend', (e) => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) < 40) return; // too small — ignore
  if (diff > 0 && currentImageIndex < currentImages.length - 1) {
    showGalleryImage(currentImageIndex + 1); // swipe left → next
  } else if (diff < 0 && currentImageIndex > 0) {
    showGalleryImage(currentImageIndex - 1); // swipe right → prev
  }
}, { passive: true });

// ---- Open modal ----------------------------------------------------
function openModal(house) {
  // Category badge
  modalCategory.textContent = CATEGORY_LABELS[house.category] || house.category;
  modalCategory.className   = `badge badge-${house.category}`;

  // Title, location, price
  modalTitle.textContent    = house.title;
  modalLocation.textContent = house.location;
  modalPrice.innerHTML      = formatPrice(house);

  // Stats pills
  const stats = [];
  if (house.bedrooms)  stats.push(`<div class="stat-pill"><span class="stat-icon">🛏</span> ${house.bedrooms} Bed${house.bedrooms > 1 ? 's' : ''}</div>`);
  if (house.bathrooms) stats.push(`<div class="stat-pill"><span class="stat-icon">🚿</span> ${house.bathrooms} Bath${house.bathrooms > 1 ? 's' : ''}</div>`);
  if (house.size)      stats.push(`<div class="stat-pill"><span class="stat-icon">📐</span> ${escapeHtml(house.size)}</div>`);
  modalStats.innerHTML = stats.join('');
  modalStats.style.display = stats.length ? 'flex' : 'none';

  // Description with show-more toggle
  const desc = (house.description || '').trim();
  if (desc) {
    modalDescWrap.classList.remove('hidden');
    modalDescription.textContent = desc;
    descExpanded = false;
    modalDescription.classList.add('clamped');

    // Only show "Show more" button if the text is actually clamped
    // (i.e. longer than the 3-line limit). We check after a paint.
    showMoreBtn.classList.add('hidden');
    showMoreBtn.textContent = 'Show more ↓';
    requestAnimationFrame(() => {
      if (modalDescription.scrollHeight > modalDescription.clientHeight + 4) {
        showMoreBtn.classList.remove('hidden');
      }
    });
  } else {
    modalDescWrap.classList.add('hidden');
  }

  // Gallery
  renderGallery(house);

  // Owner contact
  renderOwnerContact(house.owner);

  // Show the modal
  detailModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Scroll modal info back to top (in case it was scrolled from a
  // previous opening)
  const info = modalCard.querySelector('.modal-info');
  if (info) info.scrollTop = 0;
  modalCard.scrollTop = 0;
}

// ---- Description show more / less ----------------------------------
showMoreBtn.addEventListener('click', () => {
  descExpanded = !descExpanded;
  modalDescription.classList.toggle('clamped', !descExpanded);
  showMoreBtn.textContent = descExpanded ? 'Show less ↑' : 'Show more ↓';
});

// ---- Owner contact -------------------------------------------------
function renderOwnerContact(owner) {
  if (!owner || (!owner.name && !owner.phone && !owner.email && !owner.whatsapp)) {
    modalOwner.innerHTML = '<p class="text-muted" style="margin:0">No contact information provided.</p>';
    return;
  }

  const links = [];

  if (owner.phone) {
    links.push(`<a class="btn btn-primary btn-sm" href="tel:${escapeHtml(owner.phone.replace(/\s+/g, ''))}">📞 Call</a>`);
  }
  if (owner.whatsapp) {
    const digits = owner.whatsapp.replace(/[^0-9]/g, '');
    links.push(`<a class="btn btn-accent btn-sm" href="https://wa.me/${digits}" target="_blank" rel="noopener">💬 WhatsApp</a>`);
  }
  if (owner.email) {
    links.push(`<a class="btn btn-outline btn-sm" href="mailto:${escapeHtml(owner.email)}">✉️ Email</a>`);
  }

  modalOwner.innerHTML = `
    ${owner.name ? `<div class="owner-name">${escapeHtml(owner.name)}</div>` : ''}
    <div class="owner-actions">${links.join('')}</div>
  `;
}

// ---- Close modal ---------------------------------------------------
function closeModal() {
  detailModal.classList.add('hidden');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);

// Click outside the card to close
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) closeModal();
});

// Keyboard: Escape to close, arrow keys to navigate photos
document.addEventListener('keydown', (e) => {
  if (detailModal.classList.contains('hidden')) return;

  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowRight' && currentImageIndex < currentImages.length - 1) {
    showGalleryImage(currentImageIndex + 1);
  }
  if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
    showGalleryImage(currentImageIndex - 1);
  }
});

// Swipe DOWN to close the modal on mobile
let modalTouchStartY = 0;
modalCard.addEventListener('touchstart', (e) => {
  modalTouchStartY = e.touches[0].clientY;
}, { passive: true });

modalCard.addEventListener('touchend', (e) => {
  const diff = e.changedTouches[0].clientY - modalTouchStartY;
  // Only close if swiped down by 80px+ AND the card is scrolled to the top
  if (diff > 80 && modalCard.scrollTop === 0) {
    closeModal();
  }
}, { passive: true });

// ================================================================
// FILTER EVENT LISTENERS
// ================================================================

// Category tabs
categoryNav.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-category]');
  if (!btn) return;

  categoryNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeCategory = btn.dataset.category;
  renderHouses();
});

// Location dropdown
locationFilter.addEventListener('change', () => {
  activeLocation = locationFilter.value;
  renderHouses();
});

// Clear filters
clearFiltersBtn.addEventListener('click', () => {
  activeCategory = 'all';
  activeLocation = '';
  locationFilter.value = '';
  categoryNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  categoryNav.querySelector('[data-category="all"]').classList.add('active');
  renderHouses();
});

// Open detail modal when a card is clicked
houseGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.house-card');
  if (!card) return;
  const house = allHouses.find(h => h.id === card.dataset.id);
  if (house) openModal(house);
});

// ================================================================
// INIT
// ================================================================
document.getElementById('year').textContent = new Date().getFullYear();
loadHouses();
