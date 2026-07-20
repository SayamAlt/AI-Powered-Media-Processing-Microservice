const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is missing. Please set MONGODB_URI in your environment settings (e.g. MongoDB Atlas URI).');
  }
  await mongoose.connect(uri);
  console.log('Worker MongoDB connected');
}

module.exports = { connectDB };