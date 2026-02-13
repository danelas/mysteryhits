const cron = require("node-cron");
const OpenAI = require("openai");
const { publishToWordPress } = require("./wordpress");

let _openai = null;
function getOpenAIClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const BLOG_SYSTEM_PROMPT = `You are the SEO blog writer for Mystery Hits Factory, a premium curated mystery pack brand for trading card collectors (Pokemon, One Piece, sports TCGs).

You write like a knowledgeable collector running a real brand — not a generic content mill.

BRAND FACTS (use these naturally)
- Mystery Hits Factory offers three pack tiers: Standard, Premium, and Deluxe
- Standard tier: ideal for casual collectors and newcomers
- Premium tier: higher-value inserts and limited packs
- Deluxe tier: top-end pulls, slabs, and chase cards
- Every pack uses authentic sealed cards, sleeved and protected hits, balanced rarity distribution, no bulk filler
- We do NOT guarantee specific cards, but every pack meets internal quality standards
- Franchises: Pokemon, One Piece, sports cards
- Website: https://mysteryhitsfactory.com
- Pokemon page: https://mysteryhitsfactory.com/pokemon-franchise-page/
- One Piece page: https://mysteryhitsfactory.com/one-piece-franchise-page/
- Packs page (tier comparison): https://mysteryhitsfactory.com/shop/
- Instagram: @mysteryhitsfactory

POKEMON SET REFERENCES (use where relevant)
- Modern: Scarlet & Violet, Paldea Evolved, Obsidian Flames, 151, Paradox Rift, Temporal Forces, Shrouded Fable, Prismatic Evolutions
- Vintage/Classic: Base Set, Jungle, Fossil, Team Rocket, Neo Genesis, EX-era (Ruby & Sapphire, FireRed & LeafGreen), Diamond & Pearl, HeartGold & SoulSilver
- Popular chase: Charizard, Pikachu, Mewtwo, Umbreon, Rayquaza

ONE PIECE SET REFERENCES (use where relevant)
- Sets: OP-01 Romance Dawn, OP-02, OP-03, OP-04, OP-05 Awakening of the New Era, OP-06 Wings of the Captain, OP-07, OP-08
- Popular chase: Luffy, Shanks, Nami, alternate art leaders

WRITING RULES
- Every article MUST target a real search term collectors would Google
- Use specific set names, card names, and era references — never be vague
- Show brand authority: reference curation process, quality standards, tier differences
- Educate the reader — teach them something useful
- Include natural internal links to Mystery Hits Factory pages (Pokemon page, One Piece page, Packs page)
- No emojis
- Never mention being AI
- Never promise specific pulls, odds, ROI, or profits
- Never claim affiliation with Pokemon/Nintendo/Bandai/Toei
- Avoid generic filler phrases like "hidden gem", "good stuff", "exciting", "thrilling"
- Sound like a real collector who runs a business, not a school essay or a dropshipper

ARTICLE STRUCTURE
- SEO-optimized title on the first line (no markdown, no quotes)
- Blank line
- 4-7 sections, each with a clear subheading (use ## for H2)
- Each section: 2-4 concise paragraphs with real substance
- Final section: conclusion with CTA
- Total length: 500-800 words
- Write in a way that Google would rank this for the target keyword

CTA RULES
- End every article with TWO call-to-action buttons in this exact HTML format:
<div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;"><a href="https://mysteryhitsfactory.com/pokemon-franchise-page/" style="display:inline-block;padding:12px 24px;background:#7e22ce;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Shop Pokemon Packs</a><a href="https://mysteryhitsfactory.com/one-piece-franchise-page/" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Shop One Piece Packs</a></div>
- If the article is Pokemon-focused, make the Pokemon button primary (listed first)
- If the article is One Piece-focused, make the One Piece button primary (listed first)
- Always include BOTH buttons regardless of topic`;

const DAILY_POST_PROMPT = `Write a blog article for Mystery Hits Factory's website.

Pick ONE of these topic categories (rotate — do not repeat the same category two days in a row):

1) SET SPOTLIGHT: Deep-dive into a specific Pokemon or One Piece TCG set. Cover what makes it collectible, key chase cards, market relevance, and why it might appear in our mystery packs. Target keyword: "[Set Name] cards worth collecting" or similar.

2) COLLECTOR GUIDE: Practical advice for collectors. Examples: "How to grade your first Pokemon card", "Best One Piece cards to invest in 2025", "What to look for in a sealed mystery pack". Target a how-to or best-of keyword.

3) MYSTERY PACK EDUCATION: Explain how curated mystery packs work, what separates quality packs from junk, how our tiers differ, why rarity distribution matters. Target keywords like "best mystery packs for Pokemon cards" or "are mystery packs worth it".

4) MARKET & TREND ANALYSIS: Cover what is trending in the TCG hobby right now. Reference specific sets, recent releases, price movements, or community buzz. Target keywords like "Pokemon TCG trends 2025" or "One Piece TCG popularity".

5) COMPARISON & TIER GUIDE: Compare our Standard vs Premium vs Deluxe tiers, or compare mystery packs vs booster boxes, or compare Pokemon vs One Piece collecting. Target comparison keywords.

IMPORTANT:
- The title must contain a real searchable keyword phrase
- Reference at least 2-3 specific set names or card names in the body
- Include at least one internal link naturally in the text (to our Pokemon page, One Piece page, or Packs page)
- End with the CTA buttons as specified in your instructions
- Write with authority — you ARE the brand, not a guest blogger`;

/**
 * Generate a blog post (title, HTML content, tags) without publishing.
 * Returns { title, content, tags } for preview.
 */
async function generateBlogPost(customPrompt) {
  console.log("📝 Generating blog post…");

  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: BLOG_SYSTEM_PROMPT },
      { role: "user", content: customPrompt || DAILY_POST_PROMPT },
    ],
    max_tokens: 2000,
    temperature: 0.75,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty response from OpenAI");

  // Split title from body (first line = title, rest = body)
  const lines = raw.split("\n");
  const titleLine = lines.find((l) => l.trim() !== "");
  const title = titleLine.replace(/^#+\s*/, "").replace(/^\*+/, "").replace(/\*+$/, "").trim();
  const bodyRaw = lines.slice(lines.indexOf(titleLine) + 1).join("\n").trim();

  // Convert markdown-style body to HTML
  let content = bodyRaw
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Wrap plain text lines in <p> tags (skip lines that are already HTML)
  content = content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<h") || trimmed.startsWith("<div") || trimmed.startsWith("<a ") || trimmed.startsWith("<ul") || trimmed.startsWith("<li") || trimmed.startsWith("<p")) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .filter((l) => l)
    .join("\n");

  // Extract tags from the title and content for better SEO
  const tagPool = ["mystery packs", "trading cards", "collector", "pokemon", "one piece", "tcg"];
  const lowerContent = (title + " " + bodyRaw).toLowerCase();
  const tags = tagPool.filter((t) => lowerContent.includes(t));
  if (tags.length === 0) tags.push("mystery packs", "trading cards");

  return { title, content, tags };
}

/**
 * Generate a daily blog post and publish to WordPress.
 */
async function generateAndPublishDailyPost() {
  try {
    const { title, content, tags } = await generateBlogPost();
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

module.exports = { startScheduler, generateAndPublishDailyPost, generateBlogPost, publishToWordPress };
