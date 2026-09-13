const mongoose = require('mongoose');
require('dotenv').config();

async function connectMongo() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('⚠️ MONGO_URI not defined in environment.');
      return false;
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
    return true;
  } catch (err) {
    console.error('⚠️ MongoDB connection warning:', err.message);
    console.error('👉 Make sure MongoDB is running on port 27017 or point MONGO_URI to MongoDB Atlas');
    if (process.env.STRICT_DB === 'true') {
      process.exit(1);
    }
    return false;
  }
}

module.exports = { connectMongo };
