// =============================================================
// routes/admin-houses.js
//
// All routes here are mounted under /api/admin/houses and are
// protected by the requireAuth middleware in server.js, so only
// a logged-in admin can reach them.
//
// UPDATED to use MongoDB Atlas (via the House model) for data,
// and Cloudinary (via config/cloudinary.js) for photos, instead
// of local disk storage. This means listings and photos now
// survive server restarts on free hosting platforms like Render.
//
// Responsibilities:
//   - List all houses (including hidden ones)
//   - Create a new house listing (with photo uploads)
//   - Update an existing house listing
//   - Toggle a house between visible / hidden
//   - Delete individual photos, or set a photo as the cover photo
//   - Delete a whole house listing
// =============================================================

const express = require('express');
const House = require('../models/House');
const { upload, uploadAllToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

// -------------------------------------------------------------
// GET /api/admin/houses
// Returns every house (visible AND hidden) for the admin dashboard.
// -------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const houses = await House.find().sort({ createdAt: -1 });
    res.json(houses);
  } catch (err) {
    res.status(500).json({ error: 'Could not load listings.' });
  }
});

// -------------------------------------------------------------
// GET /api/admin/houses/:id
// Returns a single house (used to pre-fill the edit form).
// -------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ error: 'House not found.' });
    res.json(house);
  } catch (err) {
    res.status(404).json({ error: 'House not found.' });
  }
});

// -------------------------------------------------------------
// POST /api/admin/houses
// Creates a new house listing.
// Expects multipart/form-data with text fields + an "images" field
// containing one or more photo files.
// -------------------------------------------------------------
router.post('/', upload.array('images', 12), async (req, res) => {
  try {
    const body = req.body;

    // Basic validation of required fields
    const requiredFields = ['title', 'category', 'price', 'location'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return res.status(400).json({ error: `"${field}" is required.` });
      }
    }
    if (!['sale', 'rent', 'short-stay'].includes(body.category)) {
      return res.status(400).json({ error: 'Category must be sale, rent, or short-stay.' });
    }

    // Create the house first (without images) so we have a Mongo
    // _id to use as the Cloudinary folder name, then attach images.
    const house = new House({
      title: body.title.trim(),
      category: body.category,
      price: Number(body.price),
      priceUnit: body.priceUnit || '',
      location: body.location.trim(),
      bedrooms: body.bedrooms ? Number(body.bedrooms) : null,
      bathrooms: body.bathrooms ? Number(body.bathrooms) : null,
      size: body.size ? body.size.trim() : '',
      description: body.description ? body.description.trim() : '',
      owner: {
        name: body.ownerName ? body.ownerName.trim() : '',
        phone: body.ownerPhone ? body.ownerPhone.trim() : '',
        email: body.ownerEmail ? body.ownerEmail.trim() : '',
        whatsapp: body.ownerWhatsapp ? body.ownerWhatsapp.trim() : ''
      },
      images: [],
      hidden: false
    });

    // Upload photos to Cloudinary (organised under this house's ID)
    const uploadedImages = await uploadAllToCloudinary(req.files, house._id.toString());
    house.images = uploadedImages; // first image = cover photo

    await house.save();
    res.status(201).json(house);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create listing. Please try again.' });
  }
});

// -------------------------------------------------------------
// PUT /api/admin/houses/:id
// Updates an existing house's text fields, and (optionally)
// appends any newly uploaded photos to the existing photo list.
// -------------------------------------------------------------
router.put('/:id', upload.array('images', 12), async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ error: 'House not found.' });

    const body = req.body;

    if (body.category && !['sale', 'rent', 'short-stay'].includes(body.category)) {
      return res.status(400).json({ error: 'Category must be sale, rent, or short-stay.' });
    }

    // Only overwrite fields that were actually sent
    if (body.title !== undefined) house.title = body.title.trim();
    if (body.category !== undefined) house.category = body.category;
    if (body.price !== undefined) house.price = Number(body.price);
    if (body.priceUnit !== undefined) house.priceUnit = body.priceUnit;
    if (body.location !== undefined) house.location = body.location.trim();
    if (body.bedrooms !== undefined) house.bedrooms = body.bedrooms ? Number(body.bedrooms) : null;
    if (body.bathrooms !== undefined) house.bathrooms = body.bathrooms ? Number(body.bathrooms) : null;
    if (body.size !== undefined) house.size = body.size.trim();
    if (body.description !== undefined) house.description = body.description.trim();

    house.owner = {
      name: body.ownerName !== undefined ? body.ownerName.trim() : house.owner.name,
      phone: body.ownerPhone !== undefined ? body.ownerPhone.trim() : house.owner.phone,
      email: body.ownerEmail !== undefined ? body.ownerEmail.trim() : house.owner.email,
      whatsapp: body.ownerWhatsapp !== undefined ? body.ownerWhatsapp.trim() : house.owner.whatsapp
    };

    // Any newly uploaded photos get uploaded to Cloudinary and
    // added to the end of the list
    if (req.files && req.files.length) {
      const uploadedImages = await uploadAllToCloudinary(req.files, house._id.toString());
      house.images.push(...uploadedImages);
    }

    await house.save();
    res.json(house);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update listing. Please try again.' });
  }
});

// -------------------------------------------------------------
// PATCH /api/admin/houses/:id/visibility
// Toggles a house between visible and hidden.
// Hidden houses still exist (and keep their photos) but will NOT
// appear on the public site.
// -------------------------------------------------------------
router.patch('/:id/visibility', async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ error: 'House not found.' });

    house.hidden = !house.hidden;
    await house.save();
    res.json(house);
  } catch (err) {
    res.status(500).json({ error: 'Could not update visibility.' });
  }
});

// -------------------------------------------------------------
// PATCH /api/admin/houses/:id/images/cover
// Moves the given image to the front of the images array so it
// becomes the new cover photo on the listing card.
// Body: { publicId }
// -------------------------------------------------------------
router.patch('/:id/images/cover', async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ error: 'House not found.' });

    const { publicId } = req.body;
    const match = house.images.find(img => img.publicId === publicId);
    if (!match) {
      return res.status(400).json({ error: 'That image does not belong to this house.' });
    }

    house.images = [match, ...house.images.filter(img => img.publicId !== publicId)];
    await house.save();
    res.json(house);
  } catch (err) {
    res.status(500).json({ error: 'Could not update the cover photo.' });
  }
});

// -------------------------------------------------------------
// DELETE /api/admin/houses/:id/images/:encodedPublicId
// Removes a single photo from a house (both from MongoDB and
// from Cloudinary). Since Cloudinary public IDs contain slashes
// (e.g. "shelter/houses/abc123/xyz"), the publicId is sent as a
// base64-encoded URL parameter to avoid breaking the route path.
// -------------------------------------------------------------
router.delete('/:id/images/:encodedPublicId', async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ error: 'House not found.' });

    // URL-safe base64: convert back to standard base64 before decoding
    // (the front-end encodes using the matching URL-safe scheme)
    const standardBase64 = req.params.encodedPublicId.replace(/-/g, '+').replace(/_/g, '/');
    const publicId = Buffer.from(standardBase64, 'base64').toString('utf-8');

    const before = house.images.length;
    house.images = house.images.filter(img => img.publicId !== publicId);

    if (house.images.length === before) {
      return res.status(404).json({ error: 'Image not found on this house.' });
    }

    await deleteFromCloudinary(publicId);
    await house.save();
    res.json(house);
  } catch (err) {
    res.status(500).json({ error: 'Could not delete image.' });
  }
});

// -------------------------------------------------------------
// DELETE /api/admin/houses/:id
// Permanently deletes a house listing and all of its photos.
// -------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ error: 'House not found.' });

    // Remove every photo from Cloudinary first
    for (const img of house.images) {
      await deleteFromCloudinary(img.publicId);
    }

    await House.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete listing.' });
  }
});

module.exports = router;
