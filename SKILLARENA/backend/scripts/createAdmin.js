const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const MIN_PASSWORD_LENGTH = 12;

async function createAdmin() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Skill Arena Admin').trim();

  if (!email) {
    console.error('ADMIN_EMAIL is required.');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `ADMIN_PASSWORD is required and must be at least ${MIN_PASSWORD_LENGTH} characters. `
        + 'Set it in backend/.env — it will never be printed.',
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      existing.role = 'ADMIN';
      existing.status = 'ACTIVE';
      await existing.save();
      console.log(`Updated existing user to ADMIN: ${email}`);
    } else {
      console.log(`Admin already exists: ${email}`);
    }
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name,
    email,
    password,
    role: 'ADMIN',
    status: 'ACTIVE',
  });

  console.log('Admin account created.');
  console.log(`Email: ${email}`);
  console.log('Password was set from ADMIN_PASSWORD (not displayed).');

  await mongoose.disconnect();
}

createAdmin().catch(async (error) => {
  console.error('Create admin failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
