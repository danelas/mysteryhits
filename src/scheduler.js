const cron = require("node-cron");
const OpenAI = require("openai");
const db = require("./db");
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
  const lines = history.map((h) => `- ${h.title}`);
  return `Recent articles already published:
${lines.join("\n")}
Do NOT repeat these angles, keywords, or titles.`;
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

async function pickNextCategory(recentHistory) {
  const recentKeys = recentHistory
    .filter((h) => h.category && h.category !== "custom")
    .slice(0, 3)
    .map((h) => h.category);

  const fallback = TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)];
  const candidate = TOPIC_CATEGORIES.find((cat) => !recentKeys.includes(cat.key));
  return candidate || fallback;
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
    const nextCategory = await pickNextCategory(recentHistory);
    category = nextCategory.key;
    userPrompt = buildPromptForCategory(nextCategory, historyNote);
  }

  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: BLOG_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
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

  return { title, content, tags, category };
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
