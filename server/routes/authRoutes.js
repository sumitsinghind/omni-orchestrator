import express from "express";
import rateLimit from "express-rate-limit";
import {
  registerUser,
  loginUser,
  protect,
  getUserProfile,
  updateUserProfile,
  getSecurityQuestion,
  resetPasswordWithAnswer,
  deleteAccount, // Import new controller
} from "../controllers/authController.js";

const router = express.Router();

// --- Rate Limiters ---
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Please try again later." },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many registration attempts. Please try again later." },
});

// --- Public Routes ---
router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/get-security-question", getSecurityQuestion);
router.post("/reset-password-with-answer", resetPasswordWithAnswer);

// --- Protected Routes ---
router.get("/me", protect, getUserProfile);
router.put("/me", protect, updateUserProfile);
router.delete("/me", protect, deleteAccount); // Add new DELETE route

export default router;
