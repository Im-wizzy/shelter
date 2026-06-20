// =============================================================
// scripts/generate-hash.js
//
// Helper script to create a bcrypt hash of your admin password,
// so you never have to store a plain-text password in .env.
//
// Usage:
//   npm run hash -- "YourPasswordHere"
//
// Then copy the printed hash into your .env file as
// ADMIN_PASSWORD_HASH=<the hash>
// =============================================================

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('Usage: npm run hash -- "YourPasswordHere"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

console.log('\nAdd this line to your .env file:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
