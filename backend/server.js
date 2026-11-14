require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const issueRoutes = require("./routes/issueRoutes");
const commentRoutes = require("./routes/commentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const protect = require("./middleware/authMiddleware");

// Fail fast if the server is misconfigured
for (const name of ["MONGO_URI", "JWT_SECRET"]) {
    if (!process.env[name]) {
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
}

const app = express();

// Needed on Render/Railway so rate limiting sees the real client IP
app.set("trust proxy", 1);

// Security headers (images are loaded cross-origin by the frontend)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS: comma-separated list of allowed frontend URLs
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // allow tools without an Origin header (curl, Postman)
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        }
    })
);

app.use(express.json({ limit: "100kb" }));
app.use("/uploads", express.static("uploads"));

// Rate limiting
const limiter = (windowMinutes, max, message) =>
    rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        limit: max,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message }
    });

app.use("/api", limiter(15, 300, "Too many requests. Please try again later."));
app.use("/api/auth", limiter(15, 20, "Too many login attempts. Please try again later."));
app.use("/api/ai", limiter(15, 30, "Too many AI requests. Please slow down."));

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
    res.json({ message: "CampusConnect AI Backend is running!" });
});

// Used by hosting platforms for health checks
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        database:
            mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
});

app.get("/api/protected", protect, (req, res) => {
    res.json({ message: "You accessed a protected route!", user: req.user });
});

// 404 for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    if (error.message === "Not allowed by CORS") {
        return res.status(403).json({ message: "Origin not allowed" });
    }
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON body" });
    }
    console.error("Unhandled error:", error);
    res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    mongoose
        .connect(process.env.MONGO_URI)
        .then(() => {
            console.log("MongoDB connected successfully!");
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        })
        .catch((error) => {
            console.error("MongoDB connection failed:", error.message);
            process.exit(1);
        });
}

module.exports = app; 