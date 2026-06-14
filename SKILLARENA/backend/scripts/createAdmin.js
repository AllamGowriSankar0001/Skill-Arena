const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

async function createAdmin() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || 'admin@skillarena.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const name = process.env.ADMIN_NAME || 'Skill Arena Admin';

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

  const user = await User.create({
    name,
    email,
    password,
    role: 'ADMIN',
    status: 'ACTIVE',
  });

  console.log('Admin account created.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('Change ADMIN_PASSWORD in backend/.env and re-run if needed.');

  await mongoose.disconnect();
}

createAdmin().catch(async (error) => {
  console.error('Create admin failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
