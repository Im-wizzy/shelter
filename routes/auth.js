// =============================================================
// routes/auth.js
//
// Handles the admin login/logout flow.
// There is only ONE admin account, defined entirely by the
// ADMIN_USERNAME and ADMIN_PASSWORD_HASH values in your .env file.
// =============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// POST /api/auth/login
// Body: { username, password }
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash) {
    // The site owner hasn't configured the .env file yet.
    return res.status(500).json({
      success: false,
      message: 'Admin account is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH in .env.'
    });
  }

  const usernameMatches = username === expectedUsername;
  const passwordMatches = await bcrypt.compare(password, expectedHash);

  if (usernameMatches && passwordMatches) {
    // Mark this browser session as an authenticated admin session.
    req.session.isAdmin = true;
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: 'Invalid username or password.' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/auth/status
// Lets front-end JS check whether the current visitor is logged in.
router.get('/status', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

module.exports = router;
