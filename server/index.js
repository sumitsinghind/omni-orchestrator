import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/database.js";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import generationRoutes from "./routes/generationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js"; // 1. Import the new admin routes

const app = express();
const PORT = process.env.PORT || 5000;

// Trust first proxy for proper IP detection (for express-rate-limit)
app.set("trust proxy", 1);

// CORS setup for allowing frontend access
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Middleware for logging HTTP requests in the console
app.use(morgan("dev"));

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Optional: Secure logging to redact passwords from console output
app.use((req, res, next) => {
  if (["POST", "PUT"].includes(req.method) && req.body?.password) {
    const bodyToLog = { ...req.body };
    bodyToLog.password = "[REDACTED]";
    // console.log(`Body (${req.method} ${req.url}):`, bodyToLog); // Can be noisy, uncomment if needed for debugging
  }
  next();
});

// --- API Routes ---

// Health check route
app.get("/", (req, res) => res.send("OmniOrchestrator API Running"));

// Mount all application routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/generate", generationRoutes);
app.use("/api/admin", adminRoutes); // 2. Mount the new admin routes under the /api/admin prefix

// --- Error Handling ---

// 404 handler for any routes that don't match
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Global error handler for all other errors
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);
  res.status(err.status || 500).json({
    error: err.message || "An unexpected internal server error occurred.",
  });
});

// --- Server Startup ---
const startServer = async () => {
  try {
    await connectDB();
    console.log("MongoDB connected successfully.");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
};

startServer();
