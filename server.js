// =============================================================
// server.js
//
// Entry point for the Shelter website backend.
// Run with:  npm start
// =============================================================

require('dotenv').config();

// -------------------------------------------------------------
// DNS fix for restrictive networks (e.g. some phone hotspots)
// MongoDB Atlas connection strings (mongodb+srv://) require a
// special type of DNS lookup (an "SRV" record). Some networks -
// especially phone hotspots - block this lookup for apps, even
// though the operating system itself can still do it. Forcing
// Node.js to use Google's public DNS servers for its own lookups
// fixes this without changing any of the computer's network
// settings.
// -------------------------------------------------------------
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const adminHouseRoutes = require('./routes/admin-houses');
const publicHouseRoutes = require('./routes/houses');
const { requireAuth } = require('./middleware/auth');
const { connectToDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------------
// Body parsers - let us read form data and JSON sent by the browser
// -------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------------
// Sessions - used to remember that the admin is logged in.
// The session cookie lasts 8 hours, then the admin must log in again.
// -------------------------------------------------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'shelter-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// -------------------------------------------------------------
// Public static files
//   - public/css        -> shared styling
//   - public/login.html + login.js -> the admin login page
//     (the page itself is public; what's BEHIND it is protected)
//   - public/index.html + site.js -> the public-facing site
//
//   NOTE: house photos are no longer served from here. They live
//   on Cloudinary and are linked to directly by URL, so they
//   persist even when the server restarts (see config/cloudinary.js).
// -------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// API routes
// -------------------------------------------------------------
app.use('/api/auth', authRoutes);

// Public read-only API for the (future) user-facing site
app.use('/api/houses', publicHouseRoutes);

// Admin API - every route inside admin-houses.js requires login
app.use('/api/admin/houses', requireAuth, adminHouseRoutes);

// -------------------------------------------------------------
// Protected admin pages
// These HTML files live OUTSIDE the "public" folder (in
// "admin-views") specifically so they cannot be opened by
// just typing their URL - the requireAuth middleware below
// must pass first.
// -------------------------------------------------------------
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-views', 'dashboard.html'));
});

app.get('/admin/listings/new', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-views', 'listing-form.html'));
});

app.get('/admin/listings/:id/edit', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-views', 'listing-form.html'));
});

// CSS/JS used by the protected admin pages above.
// These files themselves aren't sensitive (just styling/scripts),
// so it's fine to serve them statically.
app.use('/admin-assets', express.static(path.join(__dirname, 'admin-views', 'assets')));

// -------------------------------------------------------------
// Start the server
// Connects to MongoDB first, then starts listening for requests.
// If the database connection fails, the app exits rather than
// running in a broken state (see config/database.js).
// -------------------------------------------------------------
connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Shelter server running at http://localhost:${PORT}`);
    console.log(`Admin login: http://localhost:${PORT}/login.html`);
  });
});
