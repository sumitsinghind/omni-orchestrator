import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";

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
    await Chat.deleteMany({ user: id });
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

// --- Reports ---

/**
 * 📊 Generate Users Report
 * GET /api/admin/reports/users
 * Query params: format (json/excel) - optional, defaults to json
 */
export const generateUsersReport = async (req, res) => {
  const { format = "json", from, to } = req.query;

  console.log("📊 Generating users report, format:", format);
  console.log("📅 Date range: from", from, "to", to);

  try {
    // Build query with date filtering if provided
    let query = {};

    if (from || to) {
      query.createdAt = {};
      if (from) {
        query.createdAt.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const users = await User.find(query).select("-password -securityAnswer");
    console.log(`✅ Found ${users.length} users`);

    if (format === "excel") {
      console.log("📝 Creating Excel workbook...");

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Admin Panel";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Users Report");

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };

      worksheet.columns = [
        { header: "Full Name", key: "fullName", width: 30 },
        { header: "Email", key: "email", width: 35 },
        { header: "Role", key: "role", width: 15 },
        { header: "Created At", key: "createdAt", width: 25 },
        { header: "Updated At", key: "updatedAt", width: 25 },
      ];

      console.log("📝 Adding rows to worksheet...");
      users.forEach((user) => {
        worksheet.addRow({
          fullName: user.fullName || "N/A",
          email: user.email || "N/A",
          role: user.role || "N/A",
          createdAt: user.createdAt
            ? new Date(user.createdAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : "N/A",
          updatedAt: user.updatedAt
            ? new Date(user.updatedAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : "N/A",
        });
      });

      // ✅ Use the date range in filename if provided
      const dateRange =
        from && to
          ? `_${from}_to_${to}`
          : `_${new Date().toISOString().split("T")[0]}`;
      const filename = `users_report${dateRange}.xlsx`;

      console.log("📤 Preparing to send Excel file:", filename);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      console.log("✍️ Writing Excel file to response stream...");

      await workbook.xlsx.write(res);

      console.log("✅ Excel file sent successfully");
      res.end();
    } else {
      const report = {
        totalUsers: users.length,
        dateRange: from && to ? { from, to } : null,
        usersByRole: users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}),
        users: users.map((user) => ({
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        generatedAt: new Date(),
      };

      console.log("✅ Sending JSON report");
      res.status(200).json(report);
    }
  } catch (error) {
    console.error("❌ USERS REPORT ERROR:", error);
    console.error("Error stack:", error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error generating users report." });
    }
  }
};

/**
 * 📊 Generate AI Activity Report
 * GET /api/admin/reports/activity
 * Query params: from (ISO date), to (ISO date), type (text, image, audio)
 */
export const generateActivityReport = async (req, res) => {
  const { from, to, type } = req.query;

  if (!from || !to || !type) {
    return res
      .status(400)
      .json({ error: "Please provide 'from', 'to', and 'type' parameters." });
  }

  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // 1. Find chats containing messages that match the criteria
    const chats = await Chat.find({
      "messages.type": type,
      "messages.role": "assistant",
      "messages.timestamp": { $gte: fromDate, $lte: toDate },
    }).populate("user", "fullName email");

    // 2. Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${type} Activity`);

    // --- UPDATED COLUMNS ---
    worksheet.columns = [
      { header: "User Name", key: "user", width: 25 },
      { header: "User Email", key: "email", width: 30 },
      { header: "Type", key: "type", width: 10 },
      { header: "Timestamp", key: "timestamp", width: 22 },
      { header: "Gen Time (s)", key: "duration", width: 15 }, // ✅ NEW COLUMN
      { header: "Content (or Prompt)", key: "content", width: 50 },
    ];

    // 3. Process data and add rows
    for (const chat of chats) {
      if (!chat.user) continue;

      for (let i = 0; i < chat.messages.length; i++) {
        const msg = chat.messages[i];

        // Find matching assistant messages
        if (
          msg.role === "assistant" &&
          msg.type === type &&
          msg.timestamp >= fromDate &&
          msg.timestamp <= toDate
        ) {
          // Find the user prompt that immediately preceded this AI response
          const promptMsg = chat.messages[i - 1];

          let prompt = "N/A";
          let duration = "N/A";

          if (promptMsg && promptMsg.role === "user") {
            prompt = promptMsg.content;

            // ✅ CALCULATE GENERATION TIME
            // AI Response Time - User Prompt Time = Generation Duration
            const startTime = new Date(promptMsg.timestamp).getTime();
            const endTime = new Date(msg.timestamp).getTime();
            const diffSeconds = (endTime - startTime) / 1000;

            // Only show reasonable times (e.g., ignore if it says 0s or negative)
            if (diffSeconds > 0) {
              duration = `${diffSeconds.toFixed(1)}s`;
            }
          }

          worksheet.addRow({
            user: chat.user.fullName,
            email: chat.user.email,
            type: msg.type,
            timestamp: msg.timestamp.toLocaleString("en-IN"),
            duration: duration, // ✅ ADD DATA TO ROW
            content:
              type === "text" ? msg.content.substring(0, 100) + "..." : prompt,
          });
        }
      }
    }

    // 4. Set headers and send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${type}_report_${from}_to_${to}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("❌ ACTIVITY REPORT ERROR:", error);
    res.status(500).json({ error: "Server error generating activity report." });
  }
};
