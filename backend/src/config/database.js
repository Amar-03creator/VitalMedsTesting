const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB with connection pooling and error handling.
 * Reuses existing connection in Lambda/serverless environments.
 */
const connectDB = async () => {
  if (isConnected) {
    console.log('MongoDB: reusing existing connection');
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    isConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting reconnect...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      isConnected = true;
    });
  } catch (error) {
    console.error('MongoDB initial connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;
