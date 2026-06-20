// =============================================================
// public/admin/js/login.js
//
// Handles the admin login form:
//  - sends username/password to /api/auth/login
//  - on success, redirects to the admin dashboard
//  - on failure, shows an error message
// =============================================================

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the browser from doing a normal form submit

  // Hide any previous error message
  loginError.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Login succeeded - go to the dashboard
      window.location.href = '/admin';
    } else {
      loginError.textContent = data.message || 'Could not log in. Please try again.';
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    loginError.textContent = 'Network error. Please check your connection and try again.';
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log in';
  }
});
