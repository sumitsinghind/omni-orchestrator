import User from "../models/User.js";
import Chat from "../models/Chat.js"; // Import Chat model
import jwt from "jsonwebtoken";

// --- generateToken, registerUser, loginUser, protect, getUserProfile are unchanged ---

/**
 * 🔑 Helper: Generate JWT token valid for 30 days
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

/**
 * 🆕 Register a new user
 * POST /api/auth/register
 * Body: { fullName, username, email, password, dob, gender, securityQuestion, securityAnswer }
 */
export const registerUser = async (req, res) => {
  const {
    fullName,
    username,
    email,
    password,
    dob,
    gender,
    securityQuestion,
    securityAnswer,
  } = req.body;

  // ⚠️ Validate required fields
  if (
    !fullName ||
    !username ||
    !email ||
    !password ||
    !dob ||
    !gender ||
    !securityQuestion ||
    !securityAnswer
  ) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ error: "Email is already registered." });
      }
      if (existingUser.username === username) {
        return res.status(409).json({ error: "Username is already taken." });
      }
    }

    const newUser = await User.create({
      fullName,
      username,
      email,
      password,
      dob: new Date(dob),
      gender,
      securityQuestion,
      securityAnswer,
    });

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      username: newUser.username,
      email: newUser.email,
      token: generateToken(newUser._id),
    });
  } catch (error) {
    console.error("❌ REGISTRATION ERROR:", error);
    res
      .status(500)
      .json({ error: error.message || "Server error during registration." });
  }
};

/**
 * 🔐 Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: "Invalid email or password." });
    }
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res.status(500).json({ error: "Server error during login." });
  }
};

/**
 * 🛡️ Protect routes middleware
 * Verifies JWT and attaches user to req.user
 */
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select(
        "-password -securityAnswer"
      );
      if (!req.user) {
        return res.status(401).json({ error: "User not found." });
      }
      next();
    } catch (error) {
      console.error("❌ TOKEN ERROR:", error);
      return res.status(401).json({ error: "Not authorized, token failed." });
    }
  } else {
    return res.status(401).json({ error: "Not authorized, no token." });
  }
};

/**
 * 👤 Get current user profile
 * GET /api/auth/me
 */
export const getUserProfile = async (req, res) => {
  res.status(200).json(req.user);
};

/**
 * ✏️ Update user profile
 * PUT /api/auth/me
 * Body: { fullName?, username?, email?, profilePicture? }
 */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Update fields if provided
    user.fullName = req.body.fullName || user.fullName;
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    // Allow updating or clearing the profile picture
    if (req.body.profilePicture !== undefined) {
      user.profilePicture = req.body.profilePicture;
    }

    // Note: Password changes should be a separate, more secure endpoint.
    // We are not handling password updates here for simplicity.

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      username: updatedUser.username,
      email: updatedUser.email,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    console.error("❌ PROFILE UPDATE ERROR:", error);
    res.status(500).json({ error: "Server error while updating profile." });
  }
};

// --- Secure Password Reset Flow is unchanged ---
// ... (getSecurityQuestion, resetPasswordWithAnswer) ...
export const getSecurityQuestion = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const user = await User.findOne({ email });
    if (user) {
      res.status(200).json({ securityQuestion: user.securityQuestion });
    } else {
      res.status(404).json({ error: "No account found with this email." });
    }
  } catch (error) {
    console.error("❌ GET SECURITY QUESTION ERROR:", error);
    res.status(500).json({ error: "Server error." });
  }
};

export const resetPasswordWithAnswer = async (req, res) => {
  const { email, securityAnswer, newPassword } = req.body;
  if (!email || !securityAnswer || !newPassword) {
    return res
      .status(400)
      .json({
        error: "Email, security answer, and new password are required.",
      });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters long." });
  }
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchSecurityAnswer(securityAnswer))) {
      user.password = newPassword;
      await user.save();
      res
        .status(200)
        .json({ message: "Password has been reset successfully." });
    } else {
      res.status(401).json({ error: "Invalid email or incorrect answer." });
    }
  } catch (error) {
    console.error("❌ PASSWORD RESET ERROR:", error);
    res.status(500).json({ error: "Server error during password reset." });
  }
};

/**
 * 🗑️ Delete user account
 * DELETE /api/auth/me
 * Body: { password }
 */
export const deleteAccount = async (req, res) => {
  const { password } = req.body;
  const userId = req.user._id;

  if (!password) {
    return res
      .status(400)
      .json({ error: "Password is required for deletion." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    // If password is correct, proceed with deletion
    // 1. Delete all user's chats
    await Chat.deleteMany({ user: userId });

    // 2. Delete the user
    await User.findByIdAndDelete(userId);

    res
      .status(200)
      .json({
        message: "Account and all associated data deleted successfully.",
      });
  } catch (error) {
    console.error("❌ ACCOUNT DELETION ERROR:", error);
    res.status(500).json({ error: "Server error during account deletion." });
  }
};
