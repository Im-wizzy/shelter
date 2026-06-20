// =============================================================
// config/database.js
//
// Connects to MongoDB Atlas (a free cloud database) using
// Mongoose. This REPLACES the old config/db.js, which stored
// everything in a local data/houses.json file - that approach
// didn't survive server restarts on free hosting like Render.
//
// Now, listing data lives permanently in MongoDB Atlas, and
// photos live permanently in Cloudinary (see config/cloudinary.js).
// Neither depends on the hosting platform's local disk.
// =============================================================

const mongoose = require('mongoose');

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI is not set in your .env file. The app cannot start without a database connection.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas.');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

module.exports = { connectToDatabase };
