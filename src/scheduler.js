const cron = require("node-cron");
const { generateContent } = require("./chat");
const { publishToWordPress } = require("./wordpress");

const DAILY_POST_PROMPT = `Write a blog post for Mystery Hits Factory's website. 

Topic guidelines (rotate between these):
- A collector tip or guide (e.g. "How to spot a good mystery pack", "What to look for in a Pokemon slab")
- A category spotlight (e.g. "Why One Piece TCG is exploding right now")
- A drop teaser or hype builder (e.g. "What's coming in this week's mystery packs")
- A behind-the-scenes look at how packs are curated
- Collector culture content (e.g. "The thrill of the pull — why collectors love mystery packs")

Format:
- Title on the first line (no markdown, no quotes)
- Blank line
- Body: 3-6 short paragraphs, easy to read
- End with a subtle CTA (visit the shop, DM on Instagram, check the latest drop)
- Do not use emojis
- Keep it under 400 words
- Write as Mystery Hits Factory, never mention being AI`;

/**
 * Generate a daily blog post and publish to WordPress.
 */
async function generateAndPublishDailyPost() {
  console.log("📝 Generating daily blog post…");

  try {
    const raw = await generateContent("caption", DAILY_POST_PROMPT);

    // Split title from body (first line = title, rest = body)
    const lines = raw.split("\n").filter((l) => l.trim() !== "");
    const title = lines[0].replace(/^#+\s*/, "").replace(/^\*+/, "").replace(/\*+$/, "").trim();
    const bodyLines = lines.slice(1);

    // Convert body to HTML paragraphs
    const content = bodyLines.map((line) => `<p>${line.trim()}</p>`).join("\n");

    const tags = ["mystery packs", "trading cards", "collector"];

    const result = await publishToWordPress(title, content, "publish", tags);
    console.log(`✅ Daily post published: ${result.link}`);
    return result;
  } catch (err) {
    console.error("❌ Daily post failed:", err.message);
    throw err;
  }
}

/**
 * Start the daily cron job.
 * Default: every day at 10:00 AM UTC (adjust as needed).
 */
function startScheduler() {
  const cronTime = process.env.DAILY_POST_CRON || "0 10 * * *";

  console.log(`⏰ Daily post scheduler started (cron: ${cronTime})`);

  cron.schedule(cronTime, async () => {
    console.log(`⏰ Cron triggered at ${new Date().toISOString()}`);
    try {
      await generateAndPublishDailyPost();
    } catch (err) {
      console.error("Scheduled post error:", err.message);
    }
  });
}

module.exports = { startScheduler, generateAndPublishDailyPost };
