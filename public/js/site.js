// =============================================================
// public/js/site.js
//
// Powers the public Shelter homepage:
//  - loads visible listings from /api/houses
//  - lets visitors switch between All / For Sale / For Rent / Short Stay
//  - lets visitors filter by location
//  - renders house cards (cover photo, price, location, category)
//  - opens a detail view with the full photo gallery, description,
//    and the owner's contact information
//
// No login is required for any of this - it's all public data.
// =============================================================

// ---- CONFIG ---------------------------------------------------
// Keep this in sync with admin-views/assets/dashboard.js
const CURRENCY_SYMBOL = 'GH\u20B5';

const CATEGORY_LABELS = {
  sale: 'For Sale',
  rent: 'For Rent',
  'short-stay': 'Short Stay'
};

// ---- Element references ----------------------------------------
const categoryNav = document.getElementById('categoryNav');
const locationFilter = document.getElementById('locationFilter');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const houseGrid = document.getElementById('houseGrid');
const emptyState = document.getElementById('emptyState');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');

const detailModal = document.getElementById('detailModal');
const modalClose = document.getElementById('modalClose');
const modalMainImageWrap = document.getElementById('modalMainImageWrap');
const modalThumbs = document.getElementById('modalThumbs');
const modalCategory = document.getElementById('modalCategory');
const modalTitle = document.getElementById('modalTitle');
const modalLocation = document.getElementById('modalLocation');
const modalPrice = document.getElementById('modalPrice');
const modalMeta = document.getElementById('modalMeta');
const modalDescription = document.getElementById('modalDescription');
const modalOwner = document.getElementById('modalOwner');

// ---- State -----------------------------------------------------
let allHouses = [];        // every visible house from the API
let activeCategory = 'all'; // 'all' | 'sale' | 'rent' | 'short-stay'
let activeLocation = '';    // '' = all locations

// ---- Helpers ------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(house) {
  const amount = Number(house.price || 0).toLocaleString();
  const unit = house.priceUnit ? ` <span class="unit">/ ${escapeHtml(house.priceUnit)}</span>` : '';
  return `${CURRENCY_SYMBOL}${amount}${unit}`;
}

// Images are now Cloudinary objects: { url, publicId }.
// The url is already a full, permanent link, so we can use it directly.

// ---- Data loading --------------------------------------------------

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

// Build the "Location" dropdown from whatever locations actually
// appear in the current listings, so it never offers empty results.
function buildLocationOptions() {
  const locations = [...new Set(allHouses.map(h => h.location).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  // Keep the "All locations" option, then add one per unique location
  locationFilter.innerHTML = '<option value="">All locations</option>' +
    locations.map(loc => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`).join('');
}

// ---- Filtering & rendering ------------------------------------------

function getFilteredHouses() {
  return allHouses.filter(house => {
    const matchesCategory = activeCategory === 'all' || house.category === activeCategory;
    const matchesLocation = !activeLocation || house.location === activeLocation;
    return matchesCategory && matchesLocation;
  });
}

const SECTION_TITLES = {
  all: 'All listings',
  sale: 'Houses for sale',
  rent: 'Houses for rent',
  'short-stay': 'Short stay homes'
};

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

    const categoryClass = `badge-${house.category}`;
    const categoryLabel = CATEGORY_LABELS[house.category] || house.category;

    const metaParts = [];
    if (house.bedrooms) metaParts.push(`${house.bedrooms} bed`);
    if (house.bathrooms) metaParts.push(`${house.bathrooms} bath`);
    if (house.size) metaParts.push(escapeHtml(house.size));

    return `
      <button type="button" class="house-card" data-id="${house.id}">
        <div class="thumb">
          ${cover}
          <span class="badge ${categoryClass}">${categoryLabel}</span>
        </div>
        <div class="body">
          <h3>${escapeHtml(house.title)}</h3>
          <div class="location">${escapeHtml(house.location)}</div>
          <div class="price">${formatPrice(house)}</div>
          ${metaParts.length ? `<div class="meta">${metaParts.join(' &middot; ')}</div>` : ''}
        </div>
      </button>
    `;
  }).join('');
}

// ---- Detail modal -----------------------------------------------------

function openModal(house) {
  modalCategory.textContent = CATEGORY_LABELS[house.category] || house.category;
  modalCategory.className = `badge badge-${house.category}`;

  modalTitle.textContent = house.title;
  modalLocation.textContent = house.location;
  modalPrice.innerHTML = formatPrice(house);

  // Bedrooms / bathrooms / size summary
  const metaParts = [];
  if (house.bedrooms) metaParts.push(`<span><strong>${house.bedrooms}</strong> Bedrooms</span>`);
  if (house.bathrooms) metaParts.push(`<span><strong>${house.bathrooms}</strong> Bathrooms</span>`);
  if (house.size) metaParts.push(`<span><strong>${escapeHtml(house.size)}</strong></span>`);
  modalMeta.innerHTML = metaParts.join('');
  modalMeta.style.display = metaParts.length ? 'flex' : 'none';

  modalDescription.textContent = house.description || 'No description provided.';

  // ---- Photo gallery ----
  renderGallery(house);

  // ---- Owner contact info ----
  renderOwnerContact(house.owner);

  detailModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // prevent background scroll
}

function renderGallery(house) {
  const images = house.images || [];

  if (images.length === 0) {
    modalMainImageWrap.innerHTML = '<div class="no-image">No photos available</div>';
    modalThumbs.innerHTML = '';
    return;
  }

  // Show the first image as the main image initially
  modalMainImageWrap.innerHTML = `<img id="modalMainImage" src="${images[0].url}" alt="${escapeHtml(house.title)}" />`;

  modalThumbs.innerHTML = images.map((image, index) => `
    <img
      src="${image.url}"
      alt="Photo ${index + 1} of ${escapeHtml(house.title)}"
      class="${index === 0 ? 'active' : ''}"
      data-index="${index}"
    />
  `).join('');

  // Clicking a thumbnail swaps the main image
  modalThumbs.querySelectorAll('img').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const index = Number(thumb.dataset.index);
      const mainImg = modalMainImageWrap.querySelector('img');
      if (mainImg) mainImg.src = images[index].url;

      modalThumbs.querySelectorAll('img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });
}

function renderOwnerContact(owner) {
  if (!owner || (!owner.name && !owner.phone && !owner.email && !owner.whatsapp)) {
    modalOwner.innerHTML = '<p class="text-muted">No contact information provided.</p>';
    return;
  }

  const links = [];

  if (owner.phone) {
    links.push(`<a class="btn btn-primary btn-sm" href="tel:${escapeHtml(owner.phone.replace(/\s+/g, ''))}">Call</a>`);
  }
  if (owner.whatsapp) {
    // wa.me links need digits only (no spaces, dashes, or plus signs)
    const digitsOnly = owner.whatsapp.replace(/[^0-9]/g, '');
    links.push(`<a class="btn btn-accent btn-sm" href="https://wa.me/${digitsOnly}" target="_blank" rel="noopener">WhatsApp</a>`);
  }
  if (owner.email) {
    links.push(`<a class="btn btn-outline btn-sm" href="mailto:${escapeHtml(owner.email)}">Email</a>`);
  }

  modalOwner.innerHTML = `
    ${owner.name ? `<div class="owner-name">${escapeHtml(owner.name)}</div>` : ''}
    <div class="owner-actions">${links.join('')}</div>
  `;
}

function closeModal() {
  detailModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ---- Event listeners ---------------------------------------------------

// Category tabs
categoryNav.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-category]');
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

// Open a house's detail view when its card is clicked
houseGrid.addEventListener('click', (event) => {
  const card = event.target.closest('.house-card');
  if (!card) return;

  const house = allHouses.find(h => h.id === card.dataset.id);
  if (house) openModal(house);
});

// Close the modal (button, clicking the overlay, or pressing Escape)
modalClose.addEventListener('click', closeModal);

detailModal.addEventListener('click', (event) => {
  if (event.target === detailModal) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !detailModal.classList.contains('hidden')) {
    closeModal();
  }
});

// ---- Init -----------------------------------------------------------
document.getElementById('year').textContent = new Date().getFullYear();
loadHouses();
