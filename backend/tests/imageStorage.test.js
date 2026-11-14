const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");

const { saveImage, cloudEnabled } = require("../services/imageStorage");

const fakeFile = {
    originalname: "fan.png",
    mimetype: "image/png",
    buffer: Buffer.from("fake-image-bytes"),
    filename: "123-abc.png"
};

const clearCloudEnv = () => {
    for (const k of [
        "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET", "CLOUDINARY_API_BASE", "CLOUDINARY_FOLDER"
    ]) delete process.env[k];
};

test("no file means an empty image URL", async () => {
    clearCloudEnv();
    assert.equal(await saveImage(undefined), "");
});

test("without Cloudinary keys the local uploads path is used", async () => {
    clearCloudEnv();
    assert.equal(cloudEnabled(), false);
    assert.equal(await saveImage(fakeFile), "/uploads/123-abc.png");
});

test("with Cloudinary keys the file is uploaded with a valid signature", async () => {
    let seen;
    const server = http.createServer((req, res) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
            seen = { url: req.url, type: req.headers["content-type"], body: Buffer.concat(chunks).toString("latin1") };
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ secure_url: "https://res.cloudinary.com/demo/image/upload/fan.png" }));
        });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));

    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "key123";
    process.env.CLOUDINARY_API_SECRET = "secret456";
    process.env.CLOUDINARY_API_BASE = `http://127.0.0.1:${server.address().port}`;

    assert.equal(cloudEnabled(), true);
    const url = await saveImage(fakeFile);
    server.close();

    assert.equal(url, "https://res.cloudinary.com/demo/image/upload/fan.png");
    assert.equal(seen.url, "/demo/image/upload");
    assert.match(seen.type, /^multipart\/form-data/);
    assert.match(seen.body, /fake-image-bytes/);
    assert.match(seen.body, /name="api_key"\r\n\r\nkey123/);

    // The signature must equal sha1("folder=campusconnect&timestamp=<ts>" + secret)
    const ts = /name="timestamp"\r\n\r\n(\d+)/.exec(seen.body)[1];
    const sig = /name="signature"\r\n\r\n([0-9a-f]+)/.exec(seen.body)[1];
    const expected = crypto.createHash("sha1")
        .update(`folder=campusconnect&timestamp=${ts}secret456`).digest("hex");
    assert.equal(sig, expected);
    clearCloudEnv();
});

test("a failed Cloudinary upload throws so the route can report it", async () => {
    const server = http.createServer((req, res) => { res.statusCode = 401; res.end("{}"); });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "bad";
    process.env.CLOUDINARY_API_SECRET = "bad";
    process.env.CLOUDINARY_API_BASE = `http://127.0.0.1:${server.address().port}`;

    await assert.rejects(() => saveImage(fakeFile), /Cloudinary responded with 401/);
    server.close();
    clearCloudEnv();
}); 