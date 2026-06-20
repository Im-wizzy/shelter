// =============================================================
// admin-views/assets/listing-form.js
//
// Powers the "Add new listing" / "Edit listing" page.
//
// The page works in two modes, detected from the URL:
//   /admin/listings/new        -> CREATE mode
//   /admin/listings/<id>/edit  -> EDIT mode (pre-fills the form
//                                  and shows existing photos)
// =============================================================

// ---- Element references ------------------------------------------
const form = document.getElementById('listingForm');
const formAlert = document.getElementById('formAlert');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const submitBtn = document.getElementById('submitBtn');
const navAddNew = document.getElementById('navAddNew');

const dropzone = document.getElementById('dropzone');
const imageInput = document.getElementById('imageInput');
const existingImagesGrid = document.getElementById('existingImages');
const newImagePreviewsGrid = document.getElementById('newImagePreviews');

const logoutBtn = document.getElementById('logoutBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

// ---- Work out which mode we're in ---------------------------------
// Matches "/admin/listings/<id>/edit" and captures <id>
const editMatch = window.location.pathname.match(/^\/admin\/listings\/([^/]+)\/edit\/?$/);
const houseId = editMatch ? editMatch[1] : null;
const isEditMode = !!houseId;

// Files the admin has newly selected (kept in a plain array so we
// can add/remove individual files before submitting, since
// <input type="file"> file lists can't be edited directly).
let newFiles = [];

// ---- Helpers --------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showAlert(message, type = 'error') {
  formAlert.textContent = message;
  formAlert.className = `alert alert-${type}`;
  formAlert.classList.remove('hidden');
}

function clearAlert() {
  formAlert.classList.add('hidden');
}

// ---- Set up page for edit mode --------------------------------------

async function loadHouseForEdit() {
  formTitle.textContent = 'Edit listing';
  formSubtitle.textContent = 'Update the details, manage photos, or change the category below.';
  submitBtn.textContent = 'Save changes';
  navAddNew.classList.remove('active'); // "Add new listing" isn't the active page when editing

  try {
    const res = await fetch(`/api/admin/houses/${houseId}`);
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    if (!res.ok) throw new Error('Could not load this listing.');
    const house = await res.json();
    populateForm(house);
    renderExistingImages(house);
  } catch (err) {
    showAlert(err.message);
  }
}

function populateForm(house) {
  document.getElementById('title').value = house.title || '';
  document.getElementById('category').value = house.category || '';
  document.getElementById('location').value = house.location || '';
  document.getElementById('price').value = house.price ?? '';
  document.getElementById('priceUnit').value = house.priceUnit || '';
  document.getElementById('bedrooms').value = house.bedrooms ?? '';
  document.getElementById('bathrooms').value = house.bathrooms ?? '';
  document.getElementById('size').value = house.size || '';
  document.getElementById('description').value = house.description || '';

  const owner = house.owner || {};
  document.getElementById('ownerName').value = owner.name || '';
  document.getElementById('ownerPhone').value = owner.phone || '';
  document.getElementById('ownerEmail').value = owner.email || '';
  document.getElementById('ownerWhatsapp').value = owner.whatsapp || '';
}

// Renders the photos already saved on this house, each with
// "make cover" and "delete" controls that call the API immediately.
// Each image is an object: { url, publicId } (from Cloudinary).
function renderExistingImages(house) {
  if (!house.images || house.images.length === 0) {
    existingImagesGrid.innerHTML = '';
    return;
  }

  existingImagesGrid.innerHTML = house.images.map((image, index) => `
    <div class="image-tile" data-public-id="${escapeHtml(image.publicId)}">
      <img src="${image.url}" alt="House photo" />
      ${index === 0 ? '<span class="cover-label">Cover</span>' : `
        <button type="button" class="set-cover-btn" data-action="set-cover" data-public-id="${escapeHtml(image.publicId)}">
          Make cover
        </button>
      `}
      <div class="tile-actions">
        <button type="button" data-action="delete-image" data-public-id="${escapeHtml(image.publicId)}" title="Delete photo">&times;</button>
      </div>
    </div>
  `).join('');
}

// Cloudinary public IDs contain slashes (e.g. "shelter/houses/abc/xyz"),
// which would break a normal URL path segment. We base64-encode them
// (using a URL-safe variant, since standard base64 can itself contain
// "/" or "+") before putting them in the DELETE request's URL.
function encodePublicId(publicId) {
  return btoa(publicId).replace(/\+/g, '-').replace(/\//g, '_');
}

// Handle clicks on existing-image controls (set cover / delete)
existingImagesGrid.addEventListener('click', async (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;

  const publicId = btn.dataset.publicId;
  const action = btn.dataset.action;

  try {
    if (action === 'delete-image') {
      const confirmed = confirm('Remove this photo from the listing?');
      if (!confirmed) return;

      const res = await fetch(`/api/admin/houses/${houseId}/images/${encodePublicId(publicId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Could not delete this photo.');
      const updatedHouse = await res.json();
      renderExistingImages(updatedHouse);
    }

    if (action === 'set-cover') {
      const res = await fetch(`/api/admin/houses/${houseId}/images/cover`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId })
      });
      if (!res.ok) throw new Error('Could not update the cover photo.');
      const updatedHouse = await res.json();
      renderExistingImages(updatedHouse);
    }
  } catch (err) {
    showAlert(err.message);
  }
});

// ---- New photo selection (file input + drag & drop) -------------------

function addNewFiles(fileList) {
  for (const file of fileList) {
    if (file.type.startsWith('image/')) {
      newFiles.push(file);
    }
  }
  renderNewImagePreviews();
}

function renderNewImagePreviews() {
  newImagePreviewsGrid.innerHTML = '';

  newFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const tile = document.createElement('div');
    tile.className = 'image-tile';
    tile.innerHTML = `
      <img src="${url}" alt="New photo preview" />
      <div class="tile-actions">
        <button type="button" data-index="${index}" title="Remove">&times;</button>
      </div>
      ${(!isEditMode && index === 0) ? '<span class="cover-label">Cover</span>' : ''}
    `;
    newImagePreviewsGrid.appendChild(tile);
  });
}

// Remove a newly-selected (not yet uploaded) photo
newImagePreviewsGrid.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-index]');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  newFiles.splice(index, 1);
  renderNewImagePreviews();
});

// File input change
imageInput.addEventListener('change', () => {
  addNewFiles(imageInput.files);
  imageInput.value = ''; // reset so the same file can be re-selected if removed
});

// Drag & drop support on the dropzone
['dragenter', 'dragover'].forEach(eventName => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (event) => {
  if (event.dataTransfer && event.dataTransfer.files) {
    addNewFiles(event.dataTransfer.files);
  }
});

// ---- Form submission --------------------------------------------------

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert();

  submitBtn.disabled = true;
  submitBtn.textContent = isEditMode ? 'Saving...' : 'Creating...';

  // Build a FormData object containing all text fields plus any
  // newly selected photo files.
  const formData = new FormData();
  formData.append('title', document.getElementById('title').value.trim());
  formData.append('category', document.getElementById('category').value);
  formData.append('location', document.getElementById('location').value.trim());
  formData.append('price', document.getElementById('price').value);
  formData.append('priceUnit', document.getElementById('priceUnit').value);
  formData.append('bedrooms', document.getElementById('bedrooms').value);
  formData.append('bathrooms', document.getElementById('bathrooms').value);
  formData.append('size', document.getElementById('size').value.trim());
  formData.append('description', document.getElementById('description').value.trim());
  formData.append('ownerName', document.getElementById('ownerName').value.trim());
  formData.append('ownerPhone', document.getElementById('ownerPhone').value.trim());
  formData.append('ownerEmail', document.getElementById('ownerEmail').value.trim());
  formData.append('ownerWhatsapp', document.getElementById('ownerWhatsapp').value.trim());

  newFiles.forEach(file => formData.append('images', file));

  // In CREATE mode, at least one photo is required so listing cards
  // always have a cover image.
  if (!isEditMode && newFiles.length === 0) {
    showAlert('Please add at least one photo of the house.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save listing';
    return;
  }

  try {
    const url = isEditMode ? `/api/admin/houses/${houseId}` : '/api/admin/houses';
    const method = isEditMode ? 'PUT' : 'POST';

    const res = await fetch(url, { method, body: formData });

    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Could not save this listing.');
    }

    // Success - go back to the dashboard
    window.location.href = '/admin';
  } catch (err) {
    showAlert(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = isEditMode ? 'Save changes' : 'Save listing';
  }
});

// ---- Logout & mobile menu (shared with dashboard) -----------------------

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// ---- Init --------------------------------------------------------------
if (isEditMode) {
  loadHouseForEdit();
}
