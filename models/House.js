// =============================================================
// models/House.js
//
// Defines the shape of a "house" document stored in MongoDB.
// This replaces the plain JSON objects that used to live in
// data/houses.json.
//
// Each image is stored as an object with both:
//   - url: the full Cloudinary URL (used directly in <img src="">)
//   - publicId: Cloudinary's internal ID (needed to delete the
//     image from Cloudinary later)
// =============================================================

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true }
}, { _id: false });

const houseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['sale', 'rent', 'short-stay'] },
  price: { type: Number, required: true },
  priceUnit: { type: String, default: '' },
  location: { type: String, required: true, trim: true },
  bedrooms: { type: Number, default: null },
  bathrooms: { type: Number, default: null },
  size: { type: String, default: '' },
  description: { type: String, default: '' },
  owner: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  },
  images: { type: [imageSchema], default: [] }, // first image = cover photo
  hidden: { type: Boolean, default: false }
}, {
  timestamps: true // automatically adds createdAt and updatedAt
});

// Shape the JSON sent to the front-end so it still uses "id"
// (matching what the existing front-end JavaScript expects)
// instead of Mongoose's default "_id".
houseSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});
houseSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

module.exports = mongoose.model('House', houseSchema);
