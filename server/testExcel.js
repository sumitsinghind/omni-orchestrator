import mongoose from "mongoose";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import User from "./models/User.js";
import connectDB from "./config/database.js";

dotenv.config();

const testExcel = async () => {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    const users = await User.find({})
      .select("-password -securityAnswer")
      .limit(10);
    console.log(`✅ Found ${users.length} users`);

    if (users.length === 0) {
      console.log("⚠️  No users found in database");
      process.exit(0);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Admin Panel";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Test Report");

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
    ];

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
      });
    });

    console.log("📝 Writing file to disk...");
    await workbook.xlsx.writeFile("test_output.xlsx");
    console.log("✅ Excel file saved as test_output.xlsx");
    console.log("📂 Location: " + process.cwd() + "/test_output.xlsx");
    console.log("🔍 Try opening this file with Excel/Google Sheets!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
};

testExcel();