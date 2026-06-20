// =============================================================
// config/cloudinary.js
//
// Connects to Cloudinary (a free image hosting/CDN service) and
// provides a multer storage engine that uploads photos directly
// to Cloudinary instead of saving them to local disk.
//
// This REPLACES the old disk-based multer storage in
// routes/admin-houses.js, which lost all photos whenever the
// hosting platform restarted the server (e.g. Render's free tier).
// =============================================================

const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Keep uploaded files in memory (not on disk) just long enough to
// forward them to Cloudinary. Render's disk is temporary, but RAM
// during a single request is fine since we never need the file
// again after it's been sent to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

// Uploads a single in-memory file buffer to Cloudinary.
// Returns { url, publicId } on success.
function uploadBufferToCloudinary(fileBuffer, houseId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `shelter/houses/${houseId}`, // keeps each house's photos organised in Cloudinary
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

// Uploads every file in req.files (set by multer) to Cloudinary
// and returns an array of { url, publicId } objects.
async function uploadAllToCloudinary(files, houseId) {
  const uploaded = [];
  for (const file of files || []) {
    const result = await uploadBufferToCloudinary(file.buffer, houseId);
    uploaded.push(result);
  }
  return uploaded;
}

// Deletes a single image from Cloudinary by its publicId.
// Errors are logged but not thrown - if an image is already gone,
// we still want the rest of the delete/update operation to succeed.
async function deleteFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Could not delete image from Cloudinary:', publicId, err.message);
  }
}

module.exports = {
  upload,
  uploadAllToCloudinary,
  deleteFromCloudinary
};
