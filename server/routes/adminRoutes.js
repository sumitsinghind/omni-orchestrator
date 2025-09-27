import express from "express";
import {
  loginAdmin,
  protectAdmin,
  getAllUsers,
  deleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

// --- Public Admin Route ---
router.post("/login", loginAdmin);

// --- Protected Admin Routes (require admin token) ---
router.get("/users", protectAdmin, getAllUsers);
router.delete("/users/:id", protectAdmin, deleteUser);

export default router;
