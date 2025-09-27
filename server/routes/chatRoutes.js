import express from "express";
import {
  getAllChats,
  getChatById,
  createChat,
  deleteChat,
  renameChat,
  addMessageToChat,
} from "../controllers/chatController.js";
import { protect } from "../controllers/authController.js";

const router = express.Router();

/**
 * 🛡️ Protect all chat routes
 * All routes below require a valid JWT token
 */
router.use(protect);

/**
 * 📥 Get all chats for the logged-in user
 * GET /api/chats
 */
router.get("/", getAllChats);

/**
 * 🆕 Create a new chat with an initial prompt
 * POST /api/chats
 * Body: { initialPrompt: string, mode?: "text"|"image"|"audio"|"video" }
 */
router.post("/", createChat);

/**
 * 📂 Get a single chat by ID
 * GET /api/chats/:id
 */
router.get("/:id", getChatById);

/**
 * ✏️ Rename a chat
 * PATCH /api/chats/:id/rename
 * Body: { title: string }
 */
router.patch("/:id/rename", renameChat);

/**
 * 🗑️ Delete a chat by ID
 * DELETE /api/chats/:id
 */
router.delete("/:id", deleteChat);

/**
 * ➕ Add a new message to an existing chat
 * POST /api/chats/:id/message
 * Body: { content: string, mode?: "text"|"image"|"audio"|"video" }
 */
router.post("/:id/message", addMessageToChat);

export default router;
