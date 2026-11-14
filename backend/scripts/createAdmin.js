// Creates (or promotes) the first admin account.
// Usage:  ADMIN_EMAIL=you@college.edu ADMIN_PASSWORD='StrongPass123' npm run create-admin
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "";
    const name = process.env.ADMIN_NAME || "Administrator";

    if (!email || password.length < 8) {
        console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters).");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    const existing = await User.findOne({ email });
    if (existing) {
        existing.role = "admin";
        await existing.save();
        console.log(`Existing user ${email} is now an admin.`);
    } else {
        await User.create({
            name,
            email,
            password: await bcrypt.hash(password, 10),
            role: "admin"
        });
        console.log(`Admin ${email} created.`);
    }

    await mongoose.disconnect();
})().catch((error) => {
    console.error(error.message);
    process.exit(1);
}); 