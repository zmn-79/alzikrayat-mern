const mongoose = require('mongoose');

/**
 * Opens the MongoDB connection. Kept separate from routes/controllers so the
 * data layer can be configured (or swapped for a test database) in one place.
 */
async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is not defined. Copy .env.example to .env and set it.');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
