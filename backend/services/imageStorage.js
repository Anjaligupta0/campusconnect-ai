const crypto = require("crypto");

// Photos go to Cloudinary when these three variables are set (deployment).
// Otherwise they are saved in the local /uploads folder (development).
const cloudEnabled = () =>
    Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

async function uploadToCloudinary(file) {
    const folder = process.env.CLOUDINARY_FOLDER || "campusconnect";
    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary signature: sha1("folder=...&timestamp=..." + api_secret)
    const signature = crypto
        .createHash("sha1")
        .update(`folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`)
        .digest("hex");

    const form = new FormData();
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    form.append("api_key", process.env.CLOUDINARY_API_KEY);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const base = process.env.CLOUDINARY_API_BASE || "https://api.cloudinary.com/v1_1";

    const response = await fetch(
        `${base}/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: form, signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
        throw new Error(`Cloudinary responded with ${response.status}`);
    }

    const data = await response.json();
    if (!data.secure_url) {
        throw new Error("Cloudinary did not return an image URL");
    }
    return data.secure_url;
}

/**
 * Returns the value to store in issue.imageUrl:
 *  - ""                       no file uploaded
 *  - "https://res.cloud..."   stored on Cloudinary
 *  - "/uploads/123.png"       stored on local disk
 */
async function saveImage(file) {
    if (!file) return "";
    if (cloudEnabled()) return uploadToCloudinary(file);
    return `/uploads/${file.filename}`;
}

module.exports = { saveImage, cloudEnabled };