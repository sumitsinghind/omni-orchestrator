import express from "express";
import {
  loginAdmin,
  protectAdmin,
  getAllUsers,
  deleteUser,
  generateUsersReport,
  generateActivityReport,
} from "../controllers/adminController.js";

const router = express.Router();

// Public Admin Route
router.post("/login", loginAdmin);

// Protected Admin Routes
router.get("/users", protectAdmin, getAllUsers);
router.delete("/users/:id", protectAdmin, deleteUser);

// Report Routes
router.get("/reports/users", protectAdmin, generateUsersReport);
router.get("/reports/activity", protectAdmin, generateActivityReport);

export default router;
