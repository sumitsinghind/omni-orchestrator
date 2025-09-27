import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },
    securityQuestion: {
      type: String,
      required: true,
    },
    securityAnswer: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String, // Will store base64 Data URI
      default: "",
    },
  },
  { timestamps: true }
);

// Middleware to hash password and security answer before saving
userSchema.pre("save", async function (next) {
  // Hash password if it's modified
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  // Hash security answer if it's modified
  if (this.isModified("securityAnswer")) {
    // FIX: Explicitly normalize the answer to lowercase before hashing
    const normalizedAnswer = this.securityAnswer.toLowerCase().trim();
    this.securityAnswer = await bcrypt.hash(normalizedAnswer, 12);
  }

  next();
});

// Password comparison method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Security answer comparison method
userSchema.methods.matchSecurityAnswer = async function (enteredAnswer) {
  // Normalize the user's input for comparison
  const normalizedEnteredAnswer = enteredAnswer.toLowerCase().trim();
  return await bcrypt.compare(normalizedEnteredAnswer, this.securityAnswer);
};

const User = mongoose.model("User", userSchema);
export default User;
