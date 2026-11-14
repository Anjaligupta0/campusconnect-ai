const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { cloudEnabled } = require("../services/imageStorage");

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

let storage;

if (cloudEnabled()) {
    // Deployment: keep the file in memory and send it to Cloudinary
    storage = multer.memoryStorage();
} else {
    // Development: save to the local uploads folder
    const uploadDir = path.join(__dirname, "..", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });

    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const extension = path.extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
        }
    });
}

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },

    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if (
            allowedMimeTypes.has(file.mimetype) &&
            allowedExtensions.has(extension)
        ) {
            return cb(null, true);
        }

        cb(new Error("Only JPG, JPEG, PNG, and WebP images are allowed."));
    }
});

module.exports = upload; 