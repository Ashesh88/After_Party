const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true, // Build indexes
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    mongoose.connection.on('error', err => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to ${process.env.MONGODB_URI || 'mongodb'}: ${error.message}`);
    console.warn('[MongoDB] Server will stay alive. Please start MongoDB or provide a valid MONGODB_URI in .env to persist data.');
  }
};

module.exports = connectDB;
