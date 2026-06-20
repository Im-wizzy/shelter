// =============================================================
// middleware/auth.js
//
// Protects admin-only pages and API routes.
// A user is considered "logged in" once req.session.isAdmin === true.
// That flag is set inside routes/auth.js after a successful login.
// =============================================================

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next(); // logged in - continue to the requested route
  }

  // If this was an API call, respond with JSON (the front-end JS
  // can read this and redirect to the login page itself).
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  // Otherwise this was a request for an admin HTML page -
  // send the visitor straight to the login page.
  return res.redirect('/login.html');
}

module.exports = { requireAuth };
