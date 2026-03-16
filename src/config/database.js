const mongoose = require('mongoose');
const logger = require("../utils/logger");

// mongoose.set("strictQuery", true); // Only schema-defined fields in queries
mongoose.set("sanitizeFilter", true); // Prevent query selector injection

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });

    logger.info(`MongoDB Connected`, { host: conn.connection.host });

    // Sync indexes ONLY in development
    if (process.env.NODE_ENV !== "production") {
      for (const name of mongoose.modelNames()) {
        await mongoose.model(name).syncIndexes();
        logger.info(`Indexes synced`, { model: name });
      }
    }

    return conn;

  } catch (error) {
    logger.error('MongoDB connection failed', { message: error.message });
    process.exit(1); // Exit process on failure
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  mongoose.connection.close(false, () => {
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);   // Ctrl+C
process.on('SIGTERM', gracefulShutdown);  // Docker/Heroku termination
module.exports = connectDB;
