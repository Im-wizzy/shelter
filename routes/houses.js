// =============================================================
// routes/houses.js
//
// PUBLIC API - no login required.
// Used by the public-facing site to list and view houses.
// Only houses where hidden === false are ever returned here.
//
// UPDATED to read from MongoDB Atlas (via the House model)
// instead of the local data/houses.json file.
// =============================================================

const express = require('express');
const House = require('../models/House');

const router = express.Router();

// GET /api/houses
// Optional query params:
//   ?category=sale | rent | short-stay | all
//   ?location=<text to search for in the location field>
router.get('/', async (req, res) => {
  try {
    const { category, location } = req.query;

    const filter = { hidden: false };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (location) {
      // Case-insensitive partial match, same behaviour as before
      filter.location = { $regex: location, $options: 'i' };
    }

    const houses = await House.find(filter).sort({ createdAt: -1 });
    res.json(houses);
  } catch (err) {
    res.status(500).json({ error: 'Could not load listings.' });
  }
});

// GET /api/houses/:id
// Returns full details for a single visible house.
router.get('/:id', async (req, res) => {
  try {
    const house = await House.findOne({ _id: req.params.id, hidden: false });
    if (!house) return res.status(404).json({ error: 'House not found.' });
    res.json(house);
  } catch (err) {
    res.status(404).json({ error: 'House not found.' });
  }
});

module.exports = router;
