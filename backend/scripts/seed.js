const { connectDB } = require('../config/db');
const { seedDatabase } = require('../data/seedRunner');
const mongoose = require('mongoose');

async function run() {
  console.log('[Seed Script] Connecting to database...');
  await connectDB();
  console.log('[Seed Script] Seeding data...');
  await seedDatabase();
  console.log('[Seed Script] Completed. Exiting.');
  await mongoose.disconnect();
  process.exit(0);
}

run();
