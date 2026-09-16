/**
 * One-time cleanup: remove plaintext originalPassword from all user documents.
 * Does NOT delete users, change roles, or modify bcrypt password hashes.
 *
 * Usage: node scripts/removeOriginalPasswords.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

async function removeOriginalPasswords() {
  await connectDB();

  const users = mongoose.connection.collection('users');
  const result = await users.updateMany(
    { originalPassword: { $exists: true } },
    { $unset: { originalPassword: '' } },
  );

  console.log(
    `Removed originalPassword from ${result.modifiedCount} user document(s) `
      + `(matched ${result.matchedCount}).`,
  );

  await mongoose.disconnect();
}

removeOriginalPasswords().catch(async (error) => {
  console.error('Cleanup failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
