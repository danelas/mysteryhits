const cron = require("node-cron");
const OpenAI = require("openai");
const db = require("./db");
const { publishToWordPress } = require("./wordpress");

let _openai = null;
function getOpenAIClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const BLOG_SYSTEM_PROMPT = `You are the SEO blog writer for Mystery Hits Factory, a structured collectible brand for trading card collectors (Pokemon, One Piece, sports TCGs).

Every article must:
- Rank for collectible search terms
- Reinforce trust and transparency
- Educate collectors
- Build anticipation for releases
- Position Mystery Hits Factory as a structured collectible brand
- Drive to product pages naturally (not salesy)

The tone must be:
- Structured
- Transparent
- Authoritative
- Collector-first
- Never “gambling” language
- Never hype-without-proof

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

AVOID:
- “Insane pulls”
- “Crazy value”
- “You won’t believe”
- Overhype

USE:
- Structured
- Curated
- Documented
- Series-based
- Limited release
- Value floor clarity

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
- Primary keyword in title and first paragraph
- Include secondary related keywords naturally
- 6-10 sections, each with a clear subheading (use ## for H2, ### for H3)
- Each section: 3-5 substantive paragraphs
- Include an FAQ section at the bottom with 3-5 questions and answers
- Final section: conclusion with CTA
- Total length: 1,000–1,800 words
- Write in a way that Google will rank this for the target keyword

OUTPUT FORMAT (after the article content):
---
META DESCRIPTION: [155-160 character description]
SLUG: [url-friendly slug]
INTERNAL LINKS: [suggest 2-3 internal pages to link to]
SCHEMA FAQ:
Q: [Question 1]
A: [Answer 1]
Q: [Question 2]
A: [Answer 2]
Q: [Question 3]
A: [Answer 3]
---

CTA RULES
- End every article with TWO call-to-action buttons in this exact HTML format:
<div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;"><a href="https://mysteryhitsfactory.com/pokemon-franchise-page/" style="display:inline-block;padding:12px 24px;background:#7e22ce;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Shop Pokemon Packs</a><a href="https://mysteryhitsfactory.com/one-piece-franchise-page/" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Shop One Piece Packs</a></div>
- If the article is Pokemon-focused, make the Pokemon button primary (listed first)
- If the article is One Piece-focused, make the One Piece button primary (listed first)
- Always include BOTH buttons regardless of topic`;

const TOPIC_CATEGORIES = [
  {
    key: "set_spotlight",
    label: "Set Spotlight",
    instructions: `CATEGORY: SET SPOTLIGHT
Pick one specific Pokemon or One Piece TCG set (e.g., Pokemon 151, Obsidian Flames, OP-05 Awakening of the New Era).
- Explain the release context, which chase cards matter, and why collectors still care today.
- Reference at least two specific cards or rarity tiers from that set.
- Explain how Mystery Hits Factory sources that set for our Standard/Premium/Deluxe tiers.
- Target a keyword like "[Set Name] cards worth collecting" in the title.`,
  },
  {
    key: "collector_guide",
    label: "Collector Guide",
    instructions: `CATEGORY: COLLECTOR GUIDE
Teach collectors a practical skill (grading, storage, budgeting, pack selection, etc.).
- Provide a step-by-step framework or checklist.
- Reference real sets/eras when giving examples.
- Tie the advice back to how curated mystery packs can help.`,
  },
  {
    key: "mystery_pack_education",
    label: "Mystery Pack Education",
    instructions: `CATEGORY: MYSTERY PACK EDUCATION
Explain how curated mystery packs should be evaluated.
- Contrast Mystery Hits Factory standards (balanced rarity, sleeved hits, tier differences) with junk packs.
- Reference actual Pokemon/One Piece sets used in each tier.
- Target keywords like "best mystery packs for Pokemon cards" or "are mystery packs worth it".`,
  },
  {
    key: "market_trends",
    label: "Market & Trends",
    instructions: `CATEGORY: MARKET & TREND ANALYSIS
Cover what's trending in the TCG hobby right now.
- Reference recent releases or upcoming sets (Pokemon Scarlet & Violet blocks, OP-08, etc.).
- Mention price/demand signals collectors care about.
- Explain how Mystery Hits Factory adjusts pack curation accordingly.`,
  },
  {
    key: "tier_comparison",
    label: "Tier Comparison",
    instructions: `CATEGORY: TIER COMPARISON
Compare Standard vs Premium vs Deluxe packs (and optionally Pokemon vs One Piece or sealed boxes).
- Explain which collectors should pick each tier.
- Reference example hits/sets that appear in each tier.
- Help the reader choose the right budget/experience.`,
  },
];

const CATEGORY_LABELS = TOPIC_CATEGORIES.reduce(
  (map, cat) => {
    map[cat.key] = cat.label;
    return map;
  },
  { custom: "Custom" }
);

function buildHistoryNote(history) {
  if (!history?.length) return "";
  const titles = history.map((h) => `- ${h.title}`).join("\n");
  const keywords = [...new Set(history.flatMap((h) => (h.title || "").toLowerCase().split(/\s+/)))].join(", ");
  return `=== DUPLICATE PREVENTION ===
Recent articles already published (last 7 days):
${titles}

Keywords/phrases already used: ${keywords}

CRITICAL: Do NOT repeat these titles or any of these keywords/phrases. Choose a completely different angle, set, or topic. If the last article was about "mystery packs", do NOT write another about mystery packs. If the last was about "151", do NOT write about 151 again. Ensure your title and content are distinct from all of the above.`;
}

function buildPromptForCategory(category, historyNote) {
  return `${category.instructions}

${historyNote}`.trim();
}

function buildPromptForCustom(customPrompt, historyNote) {
  return `CUSTOM TOPIC REQUEST:
${customPrompt}

${historyNote}

Ensure the article aligns with all brand rules and SEO targets above.`.trim();
}

const CONTENT_PLAN_30_DAYS = [
  // WEEK 1 – TRUST & EDUCATION
  "What Is a Pokémon Mystery Pack and How Do They Work?",
  "Are Mystery Packs Worth It? A Transparent Breakdown",
  "How Value Floors Protect Collectors in Curated Packs",
  "Understanding Rarity in Pokémon and One Piece TCG",
  "How Graded Cards Add Structure to Mystery Packs",
  "What Makes a High-Trust Collectible Brand?",
  "Behind the Scenes: How Mystery Hits Factory Packs Are Structured",
  // WEEK 2 – SEO TRAFFIC DRIVERS
  "Best Pokémon Sets to Collect in 2025",
  "Most Valuable One Piece TCG Cards Right Now",
  "PSA vs CGC vs BGS: Which Grading Is Best?",
  "How to Store and Protect Trading Cards Properly",
  "Pokémon OP-01 Through Current Waves Explained",
  "What Is a Manga Rare in One Piece?",
  "Vintage vs Modern Pokémon Cards: Investment Differences",
  // WEEK 3 – AUTHORITY & DIFFERENTIATION
  "Mystery Packs vs Booster Boxes: What’s the Difference?",
  "How Limited Series Drops Create Collectible Structure",
  "What Separates Premium Mystery Packs from Repacked Bulk?",
  "The Psychology of the Unboxing Experience",
  "Why Transparency Matters in the Mystery Pack Industry",
  "How to Identify Fair Odds in Collectible Products",
  "Building a Documented Pull Archive: Why It Matters",
  // WEEK 4 – CONVERSION & BRAND BUILDING
  "Introducing Series 01: Origins (Brand Drop Article)",
  "How We Structure Standard, Premium, and Deluxe Tiers",
  "What to Expect from a Graded Vault Release",
  "Featured Pulls From Our Latest Drop",
  "How We Source Cards for Curated Releases",
  "Why Batch Size Matters in Collectible Drops",
  "How to Evaluate the Value of a Mystery Pack",
  "Frequently Asked Questions About Mystery Hits Factory",
  "The Future of Structured Collectible Releases"
];

async function pickNextCategory(recentHistory) {
  const recentKeys = recentHistory
    .filter((h) => h.category && h.category !== "custom")
    .slice(0, 3)
    .map((h) => h.category);

  const fallback = TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)];
  const candidate = TOPIC_CATEGORIES.find((cat) => !recentKeys.includes(cat.key));
  return candidate || fallback;
}

function getPlannedTopicForDay() {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const index = daysSinceEpoch % CONTENT_PLAN_30_DAYS.length;
  return CONTENT_PLAN_30_DAYS[index];
}

/**
 * Generate a blog post (title, HTML content, tags) without publishing.
 * Returns { title, content, tags } for preview.
 */
async function generateBlogPost(options = {}) {
  console.log("📝 Generating blog post…");

  const recentHistory = await db.getRecentBlogHistory.all(5);
  const historyNote = buildHistoryNote(recentHistory);

  let category = "custom";
  let userPrompt;

  if (options.customPrompt && options.customPrompt.trim()) {
    userPrompt = buildPromptForCustom(options.customPrompt.trim(), historyNote);
  } else {
    const plannedTitle = getPlannedTopicForDay();
    userPrompt = `Write a blog article using this exact title: "${plannedTitle}"

${historyNote}

Follow all brand rules, structure, and SEO requirements. Use the title as-is on the first line.`;
    category = "planned";
  }

  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: BLOG_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 3500,
    temperature: 0.75,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty response from OpenAI");

  // Split structured metadata from article body
  const parts = raw.split("---");
  const articlePart = parts[0]?.trim() || "";
  const metaPart = parts[1]?.trim() || "";

  // Parse article: first line = title, rest = body
  const articleLines = articlePart.split("\n");
  const titleLine = articleLines.find((l) => l.trim() !== "");
  const title = titleLine.replace(/^#+\s*/, "").replace(/^\*+/, "").replace(/\*+$/, "").trim();
  const bodyRaw = articleLines.slice(articleLines.indexOf(titleLine) + 1).join("\n").trim();

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

  // Parse metadata block
  let metaDescription = "";
  let slug = "";
  let internalLinks = [];
  let schemaFAQ = [];
  if (metaPart) {
    const lines = metaPart.split("\n");
    let currentKey = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("META DESCRIPTION:")) {
        metaDescription = trimmed.replace(/^META DESCRIPTION:\s*/, "");
      } else if (trimmed.startsWith("SLUG:")) {
        slug = trimmed.replace(/^SLUG:\s*/, "");
      } else if (trimmed.startsWith("INTERNAL LINKS:")) {
        internalLinks = trimmed.replace(/^INTERNAL LINKS:\s*/, "").split(",").map(s => s.trim()).filter(Boolean);
      } else if (trimmed === "SCHEMA FAQ:") {
        currentKey = "faq";
      } else if (currentKey === "faq" && trimmed.startsWith("Q:")) {
        schemaFAQ.push({ q: trimmed.replace(/^Q:\s*/, ""), a: "" });
      } else if (currentKey === "faq" && trimmed.startsWith("A:") && schemaFAQ.length) {
        schemaFAQ[schemaFAQ.length - 1].a = trimmed.replace(/^A:\s*/, "");
      }
    }
  }

  // Extract tags from the title and content for better SEO
  const tagPool = ["mystery packs", "trading cards", "collector", "pokemon", "one piece", "tcg"];
  const lowerContent = (title + " " + bodyRaw).toLowerCase();
  const tags = tagPool.filter((t) => lowerContent.includes(t));
  if (tags.length === 0) tags.push("mystery packs", "trading cards");

  return { title, content, tags, category, metaDescription, slug, internalLinks, schemaFAQ };
}

/**
 * Generate a daily blog post and publish to WordPress.
 */
async function generateAndPublishDailyPost() {
  try {
    const { title, content, tags, category } = await generateBlogPost();
    const result = await publishToWordPress(title, content, "publish", tags);
    await db.insertBlogHistory.run(title, category);
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
