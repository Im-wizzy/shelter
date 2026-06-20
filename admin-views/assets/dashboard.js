// =============================================================
// admin-views/assets/dashboard.js
//
// Powers the admin dashboard:
//  - loads all listings from /api/admin/houses
//  - shows quick stats (totals per category + hidden count)
//  - lets the admin filter by category / hidden status
//  - lets the admin hide/show, edit, or delete a listing
// =============================================================

// ---- CONFIG ---------------------------------------------------
// Change this to match your currency (e.g. "$", "GH\u20B5", "\u20A6")
const CURRENCY_SYMBOL = 'GH\u20B5';

// ---- Element references ----------------------------------------
const listingsGrid = document.getElementById('listingsGrid');
const emptyState = document.getElementById('emptyState');
const statsRow = document.getElementById('statsRow');
const filterTabs = document.getElementById('filterTabs');
const dashboardAlert = document.getElementById('dashboardAlert');
const logoutBtn = document.getElementById('logoutBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

let allHouses = [];          // every listing returned from the API
let activeFilter = 'all';     // current filter tab

// ---- Helpers ------------------------------------------------------

// Human friendly category label
const CATEGORY_LABELS = {
  sale: 'For Sale',
  rent: 'For Rent',
  'short-stay': 'Short Stay'
};

function formatPrice(house) {
  const amount = Number(house.price || 0).toLocaleString();
  const unit = house.priceUnit ? ` <span class="unit">/ ${escapeHtml(house.priceUnit)}</span>` : '';
  return `${CURRENCY_SYMBOL}${amount}${unit}`;
}

// Basic HTML-escaping so user-entered text can't break the page layout
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showAlert(message, type = 'error') {
  dashboardAlert.textContent = message;
  dashboardAlert.className = `alert alert-${type}`;
  dashboardAlert.classList.remove('hidden');
  setTimeout(() => dashboardAlert.classList.add('hidden'), 4000);
}

// ---- Data loading --------------------------------------------------

async function loadHouses() {
  try {
    const res = await fetch('/api/admin/houses');
    if (res.status === 401) {
      // Session expired - send the admin back to the login page
      window.location.href = '/login.html';
      return;
    }
    if (!res.ok) throw new Error('Failed to load listings.');
    allHouses = await res.json();
    renderStats();
    renderListings();
  } catch (err) {
    listingsGrid.innerHTML = '';
    showAlert(err.message || 'Something went wrong loading listings.');
  }
}

// ---- Rendering -------------------------------------------------------

function renderStats() {
  const total = allHouses.length;
  const sale = allHouses.filter(h => h.category === 'sale').length;
  const rent = allHouses.filter(h => h.category === 'rent').length;
  const shortStay = allHouses.filter(h => h.category === 'short-stay').length;
  const hidden = allHouses.filter(h => h.hidden).length;

  const stats = [
    { label: 'Total listings', value: total },
    { label: 'For sale', value: sale },
    { label: 'For rent', value: rent },
    { label: 'Short stay', value: shortStay },
    { label: 'Hidden', value: hidden }
  ];

  statsRow.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="value">${s.value}</div>
      <div class="label">${s.label}</div>
    </div>
  `).join('');
}

function getFilteredHouses() {
  if (activeFilter === 'all') return allHouses;
  if (activeFilter === 'hidden') return allHouses.filter(h => h.hidden);
  return allHouses.filter(h => h.category === activeFilter);
}

function renderListings() {
  const houses = getFilteredHouses();

  if (houses.length === 0) {
    listingsGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  listingsGrid.innerHTML = houses.map(house => {
    const cover = house.images && house.images.length > 0
      ? `<img src="${house.images[0].url}" alt="${escapeHtml(house.title)}" />`
      : `<div class="no-image">No photo yet</div>`;

    const categoryClass = `badge-${house.category}`;
    const categoryLabel = CATEGORY_LABELS[house.category] || house.category;

    return `
      <div class="listing-card ${house.hidden ? 'is-hidden' : ''}">
        <div class="thumb">
          ${cover}
          <span class="badge ${categoryClass}">${categoryLabel}</span>
          ${house.hidden ? '<span class="badge badge-hidden">Hidden</span>' : ''}
        </div>
        <div class="body">
          <h3>${escapeHtml(house.title)}</h3>
          <div class="location">${escapeHtml(house.location)}</div>
          <div class="price">${formatPrice(house)}</div>
          <div class="actions">
            <a class="btn btn-outline btn-sm" href="/admin/listings/${house.id}/edit">Edit</a>
            <button class="btn btn-outline btn-sm" data-action="toggle" data-id="${house.id}">
              ${house.hidden ? 'Show' : 'Hide'}
            </button>
            <button class="btn btn-danger-outline btn-sm" data-action="delete" data-id="${house.id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Event handlers ----------------------------------------------------

// Filter tab clicks
filterTabs.addEventListener('click', (event) => {
  const btn = event.target.closest('.filter-tab');
  if (!btn) return;

  filterTabs.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  activeFilter = btn.dataset.filter;
  renderListings();
});

// Hide/Show and Delete buttons (event delegation since cards are re-rendered)
listingsGrid.addEventListener('click', async (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'toggle') {
    btn.disabled = true;
    try {
      const res = await fetch(`/api/admin/houses/${id}/visibility`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Could not update visibility.');
      const updated = await res.json();
      // Update our local copy and re-render
      const idx = allHouses.findIndex(h => h.id === id);
      if (idx !== -1) allHouses[idx] = updated;
      renderStats();
      renderListings();
    } catch (err) {
      showAlert(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  if (action === 'delete') {
    const house = allHouses.find(h => h.id === id);
    const confirmed = confirm(`Delete "${house ? house.title : 'this listing'}"? This cannot be undone.`);
    if (!confirmed) return;

    btn.disabled = true;
    try {
      const res = await fetch(`/api/admin/houses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete listing.');
      allHouses = allHouses.filter(h => h.id !== id);
      renderStats();
      renderListings();
    } catch (err) {
      showAlert(err.message);
      btn.disabled = false;
    }
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// ---- Init -----------------------------------------------------------
loadHouses();
