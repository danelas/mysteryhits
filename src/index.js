require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("./db");
const { handleWebhookVerification, handleWebhookEvent } = require("./webhook");
const { uploadPost } = require("./instagram");
const { generateContent } = require("./chat");
const { startScheduler, generateAndPublishDailyPost } = require("./scheduler");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies (for webhook events from Meta)
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// File upload middleware with proper filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = crypto.randomUUID();
    cb(null, `${id}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

// Serve static dashboard files
app.use(express.static(path.join(__dirname, "..", "public")));

// Serve uploaded images with public URLs
app.use("/uploads", express.static(uploadsDir));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "Instagram DM Bot" });
});

// ─── Dashboard ──────────────────────────────────────────────────────────────
app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// ─── Webhook Verification (GET) ─────────────────────────────────────────────
app.get("/webhook", handleWebhookVerification);

// ─── Webhook Events (POST) ──────────────────────────────────────────────────
app.post("/webhook", handleWebhookEvent);

// ─── Upload a Post to Instagram ─────────────────────────────────────────────
// POST /post  { image_url, caption }       — publish from a public image URL
// POST /post  (multipart: file + caption)  — upload a local image file
app.post("/post", upload.single("file"), async (req, res) => {
  try {
    const caption = req.body.caption || "";
    let imageUrl = req.body.image_url;

    if (!imageUrl && !req.file) {
      return res.status(400).json({ error: "Provide image_url or upload a file." });
    }

    // If a file was uploaded, we need a publicly-accessible URL.
    // In production you'd upload to S3/Cloudinary first.
    // For now, if no image_url is given and a file is uploaded, inform the user.
    if (!imageUrl && req.file) {
      return res.status(400).json({
        error:
          "File upload received, but Instagram requires a public URL. " +
          "Upload the image to a public host (S3, Cloudinary, etc.) and pass image_url instead, " +
          "or integrate a cloud storage upload in src/instagram.js.",
      });
    }

    const result = await uploadPost(imageUrl, caption);
    res.json({ success: true, result });
  } catch (err) {
    console.error("Post upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Generate Content (Captions, Comments, Reply Drafts) ────────────────────
// POST /generate  { type: "caption"|"comment"|"reply", prompt: "..." }
app.post("/generate", async (req, res) => {
  try {
    const { type, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Provide a prompt describing what to write." });
    }

    const validTypes = ["caption", "comment", "reply"];
    const contentType = validTypes.includes(type) ? type : "caption";

    const text = await generateContent(contentType, prompt);
    res.json({ success: true, type: contentType, text });
  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Trigger Daily Blog Post Manually ────────────────────────────────────────
// POST /daily-post  — generate and publish a blog post to WordPress right now
app.post("/daily-post", async (_req, res) => {
  try {
    const result = await generateAndPublishDailyPost();
    res.json({ success: true, result });
  } catch (err) {
    console.error("Manual daily post error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Upload Image ──────────────────────────────────────────────────────
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers.host;
    const publicUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    const id = path.parse(req.file.filename).name;

    await db.insertImage.run(id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, publicUrl);
    await db.insertActivity.run("upload", `Uploaded image: ${req.file.originalname}`);

    res.json({ id, original_name: req.file.originalname, filename: req.file.filename, public_url: publicUrl, size: req.file.size });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── API: List Images ───────────────────────────────────────────────────────
app.get("/api/images", async (_req, res) => {
  try {
    res.json(await db.getAllImages.all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Delete Image ──────────────────────────────────────────────────────
app.delete("/api/images/:id", async (req, res) => {
  try {
    const image = await db.getImageById.get(req.params.id);
    if (!image) return res.status(404).json({ error: "Image not found" });

    // Delete file from disk
    const filePath = path.join(uploadsDir, image.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.deleteImage.run(req.params.id);
    await db.insertActivity.run("delete", `Deleted image: ${image.original_name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Publish to Instagram ──────────────────────────────────────────────
app.post("/api/publish", async (req, res) => {
  try {
    const { image_url, image_id, caption } = req.body;
    if (!image_url) return res.status(400).json({ error: "image_url is required" });

    // Create post record
    const postResult = await db.insertPost.run(image_id || null, caption || "");
    const postId = postResult.lastInsertRowid;

    await db.insertActivity.run("post", `Publishing post to Instagram...`);

    // Call the existing uploadPost function
    const result = await uploadPost(image_url, caption || "");

    await db.updatePostStatus.run("published", result.id || null, postId);
    await db.insertActivity.run("post", `Post published to Instagram (ID: ${result.id})`);

    res.json({ success: true, result });
  } catch (err) {
    console.error("Publish error:", err.message);
    await db.insertActivity.run("error", `Post failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Post History ──────────────────────────────────────────────────────
app.get("/api/posts", async (_req, res) => {
  try {
    res.json(await db.getAllPosts.all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Activity Log ──────────────────────────────────────────────────────
app.get("/api/activity", async (_req, res) => {
  try {
    res.json(await db.getRecentActivity.all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Stats ─────────────────────────────────────────────────────────────
app.get("/api/stats", async (_req, res) => {
  try {
    res.json(await db.getStats.get());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ───────────────────────────────────────────────────────────
(async () => {
  // Initialize database before starting
  await db.initDb();

  app.listen(PORT, () => {
    console.log(`🤖 Instagram DM Bot running on port ${PORT}`);

    // Start the daily blog post scheduler
    startScheduler();
  });
})();
