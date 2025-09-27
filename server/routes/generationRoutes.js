import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../controllers/authController.js";
import {
  generateText,
  generateImage,
  generateAudio,
  generateVideo,
} from "../services/geminiService.js";

// 🔹 Initialize router
const router = express.Router();

// 🔹 Protect all routes
router.use(protect);

// 🔹 Rate limiter
const generationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: "Too many generation requests. Please try again later.",
});
router.use(generationLimiter);

// 🔹 Helper for handling generation
const handleGeneration =
  (fn, fieldName = "prompt") =>
  async (req, res) => {
    const value = req.body[fieldName];
    if (!value)
      return res.status(400).json({ error: `${fieldName} is required` });

    try {
      const result = await fn(value);
      res.json({ data: result });
    } catch (error) {
      console.error(`GENERATION ERROR [${fieldName}]:`, error);
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  };

// 🔹 Routes
router.post("/text", handleGeneration(generateText));
router.post("/image", handleGeneration(generateImage));
router.post("/audio", handleGeneration(generateAudio));
router.post("/video", handleGeneration(generateVideo));

// 🔹 Export router
export default router;
