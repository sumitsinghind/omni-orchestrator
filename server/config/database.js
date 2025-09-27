import mongoose from "mongoose";

/**
 * 🔗 Connects to MongoDB using Mongoose
 * Handles connection events, errors, and graceful shutdown
 */
const connectDB = async () => {
  try {
    // ✅ Attempt to connect to MongoDB using the URI from environment variables
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // 🌐 Log connection info (skip logging in production)
    if (process.env.NODE_ENV !== "production") {
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    }

    // ⚠️ Event: Connection error
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    // ⚠️ Event: Connection disconnected
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
      // Optional: Implement reconnection logic here if needed
    });

    // 🛑 Handle process termination and close DB gracefully
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("🛑 MongoDB connection closed due to app termination");
      process.exit(0);
    });
  } catch (err) {
    // ❌ Failed initial connection – exit process
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

export default connectDB;
