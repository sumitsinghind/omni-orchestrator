import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import jwt from "jsonwebtoken";

// --- Admin Authentication ---

/**
 * 🔐 Login for Admin users
 * POST /api/admin/login
 */
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (admin && (await admin.matchPassword(password))) {
      res.json({
        _id: admin._id,
        email: admin.email,
        // Use a different secret or token name for admins if desired, but for simplicity we reuse
        token: jwt.sign(
          { id: admin._id, isAdmin: true },
          process.env.JWT_SECRET,
          {
            expiresIn: "8h",
          }
        ),
      });
    } else {
      res.status(401).json({ error: "Invalid admin credentials." });
    }
  } catch (error) {
    console.error("❌ ADMIN LOGIN ERROR:", error);
    res.status(500).json({ error: "Server error during admin login." });
  }
};

/**
 * 🛡️ Admin Protect Middleware
 * Verifies JWT is for an admin user
 */
export const protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Crucial Check: Ensure the token belongs to an admin
      if (!decoded.isAdmin) {
        return res
          .status(403)
          .json({ error: "Not authorized. User token provided." });
      }

      req.admin = await Admin.findById(decoded.id).select("-password");
      if (!req.admin) {
        return res.status(401).json({ error: "Admin not found." });
      }
      next();
    } catch (error) {
      return res.status(401).json({ error: "Not authorized, token failed." });
    }
  } else {
    return res.status(401).json({ error: "Not authorized, no token." });
  }
};

// --- User Management by Admin ---

/**
 * 📄 Get all users
 * GET /api/admin/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password -securityAnswer");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

/**
 * 🗑️ Delete a user and their chats
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Step 1: Delete all chats associated with the user
    await Chat.deleteMany({ user: id });

    // Step 2: Delete the user
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res
      .status(200)
      .json({ message: "User and all their chats have been deleted." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user." });
  }
};
