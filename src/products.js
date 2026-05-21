// Canonical product catalog mirrored from the mysteryhitsfactory.com store.
// Keep in sync with the store's src/data/themed-packs.ts and src/data/bundles.ts.
// Edit this file when products are added, renamed, repriced, or retired —
// every brand prompt and any product-spotlight posts read from here.
//
// IMPORTANT — Meta/Google ad-policy split:
//   `subtitle` is the AD-SAFE one-liner (no dollar amounts) — used by
//   caption / spotlight / writer prompts that may surface inside paid ads.
//   `price` and `minimumValue` are kept on the data so the DM bot can
//   answer "how much" questions, but those fields must NEVER be injected
//   into ad / caption / spotlight copy.

const STORE_BASE_URL = process.env.STORE_BASE_URL || "https://mysteryhitsfactory.com";
const STORE_IMAGE_BASE_URL = process.env.STORE_IMAGE_BASE_URL || STORE_BASE_URL;

function url(path) {
  return `${STORE_BASE_URL}${path}`;
}

function imageUrl(path) {
  return `${STORE_IMAGE_BASE_URL}${path}`;
}

const THEMED_PACKS = [
  {
    slug: "mew",
    character: "Mew",
    tier: "standard",
    name: "Mew Mystery Pack",
    price: "$29.99",
    minimumValue: "$15+",
    subtitle: "Character-focused 5-card pull · Vintage to modern · Holo guaranteed",
    productUrl: url("/pokemon/mew"),
    imageUrl: imageUrl("/images/packs/mew.jpg"),
  },
  {
    slug: "mew-79",
    character: "Mew",
    tier: "elite",
    name: "Mew Elite Mystery Pack",
    price: "$79.99",
    minimumValue: "$40+",
    subtitle: "Upgrade tier · Guaranteed holo or better · Documented value floor",
    productUrl: url("/pokemon/mew-79"),
    imageUrl: imageUrl("/images/packs/mew-79.jpg"),
  },
  {
    slug: "charizard",
    character: "Charizard",
    tier: "standard",
    name: "Charizard Mystery Pack",
    price: "$29.99",
    minimumValue: "$15+",
    subtitle: "Character-focused 5-card pull · Vintage to modern · Holo guaranteed",
    productUrl: url("/pokemon/charizard"),
    imageUrl: imageUrl("/images/packs/charizard.jpg"),
  },
  {
    slug: "charizard-79",
    character: "Charizard",
    tier: "elite",
    name: "Charizard Elite Mystery Pack",
    price: "$79.99",
    minimumValue: "$40+",
    subtitle: "Upgrade tier · Guaranteed holo or better · Documented value floor",
    productUrl: url("/pokemon/charizard-79"),
    imageUrl: imageUrl("/images/packs/charizard-79.jpg"),
  },
  {
    slug: "gengar",
    character: "Gengar",
    tier: "standard",
    name: "Gengar Mystery Pack",
    price: "$29.99",
    minimumValue: "$15+",
    subtitle: "Character-focused 5-card pull · Vintage to modern · Holo guaranteed",
    productUrl: url("/pokemon/gengar"),
    imageUrl: imageUrl("/images/packs/gengar.jpg"),
  },
  {
    slug: "gengar-79",
    character: "Gengar",
    tier: "elite",
    name: "Gengar Elite Mystery Pack",
    price: "$79.99",
    minimumValue: "$40+",
    subtitle: "Upgrade tier · Guaranteed holo or better · Documented value floor",
    productUrl: url("/pokemon/gengar-79"),
    imageUrl: imageUrl("/images/packs/gengar-79.jpg"),
  },
  {
    slug: "japanese-pack",
    character: "Japanese",
    tier: "limited-drop",
    name: "Japanese Mystery Pack (Limited Drop)",
    price: "$79",
    minimumValue: "$40+",
    subtitle: "Limited 2-week drop · 100% Japanese cards · Holo guaranteed · Documented value floor",
    productUrl: url("/pokemon/japanese-pack"),
    imageUrl: imageUrl("/images/packs/japanese-pack.jpg"),
  },
  {
    slug: "first-edition-pack",
    character: "1st Edition",
    tier: "limited-drop",
    name: "1st Edition Mystery Pack (Limited Drop)",
    price: "$250",
    minimumValue: "$160+",
    subtitle: "Limited 2-week drop · 5 vintage 1st edition cards · 1 guaranteed 1st ed holo · Light Play+ or better · Documented value floor",
    productUrl: url("/pokemon/first-edition-pack"),
    imageUrl: imageUrl("/images/packs/first-edition-pack.jpg"),
  },
];

const BUNDLES = [
  {
    slug: "collector-bundle",
    tierNumber: 1,
    name: "Collector Bundle — Tier 1",
    price: "$79.99",
    minimumValue: "$55+",
    subtitle: "Graded PSA 8–10 · Sealed booster · Rare raw hit · Documented value floor",
    contents: [
      "1 PSA-graded Pokémon card (PSA 8–10)",
      "1 sealed Pokémon booster pack",
      "1 rare raw Pokémon hit",
    ],
    productUrl: url("/pokemon/bundles/collector-bundle"),
    imageUrl: imageUrl("/images/bundles/collector-bundle.jpg"),
  },
  {
    slug: "elite-bundle",
    tierNumber: 2,
    name: "Elite Bundle — Tier 2",
    price: "$199.99",
    minimumValue: "$140+",
    subtitle: "PSA 8–10 graded · 3 sealed packs · Stronger raw hit · Possible Japanese inclusion",
    contents: [
      "1 PSA-graded Pokémon card (PSA 8–10)",
      "3 sealed Pokémon booster packs",
      "1 stronger raw Pokémon hit",
      "Possible Japanese card inclusion",
    ],
    productUrl: url("/pokemon/bundles/elite-bundle"),
    imageUrl: imageUrl("/images/bundles/elite-bundle.jpg"),
  },
  {
    slug: "vault-bundle",
    tierNumber: 3,
    name: "Vault Bundle — Tier 3",
    price: "$499.99",
    minimumValue: "$350+",
    subtitle: "Centerpiece slab · Premium sealed · High-end raw · Possible vintage sealed",
    contents: [
      "Centerpiece graded Pokémon slab",
      "Premium sealed Pokémon product",
      "High-end raw Pokémon hit",
      "Possible vintage sealed inclusion",
    ],
    productUrl: url("/pokemon/bundles/vault-bundle"),
    imageUrl: imageUrl("/images/bundles/vault-bundle.jpg"),
  },
];

// Full catalog summary — INCLUDES pricing. Use for the DM bot (chat.js
// generateReply) so it can answer "how much" questions. NEVER use for
// caption / spotlight / writer prompts that surface in paid ads.
function catalogSummary() {
  const themedLines = THEMED_PACKS.map(
    (p) =>
      `- ${p.name} · ${p.price} · min ${p.minimumValue} value · ${p.productUrl}`
  ).join("\n");
  const bundleLines = BUNDLES.map(
    (b) =>
      `- ${b.name} · ${b.price} · min ${b.minimumValue} value · ${b.subtitle} · ${b.productUrl}`
  ).join("\n");
  return `CHARACTER-FOCUSED THEMED PACKS (Standard tier and Elite tier per character)
${themedLines}

3-TIER MYSTERY BUNDLE LADDER (graded + sealed + raw mixes)
${bundleLines}`;
}

// Ad-safe catalog summary — NO dollar amounts. Use for writer / caption /
// product-spotlight prompts so generated copy never embeds prices (Meta &
// Google ad policies prohibit prices in ad text — prices must come from
// the product feed).
function catalogSummaryAdSafe() {
  const themedLines = THEMED_PACKS.map(
    (p) => `- ${p.name} · ${p.subtitle} · ${p.productUrl}`
  ).join("\n");
  const bundleLines = BUNDLES.map(
    (b) => `- ${b.name} · ${b.subtitle} · ${b.productUrl}`
  ).join("\n");
  return `CHARACTER-FOCUSED THEMED PACKS (Standard tier and Elite tier per character)
${themedLines}

3-TIER MYSTERY BUNDLE LADDER (graded + sealed + raw mixes)
${bundleLines}

AD COPY RULE: Never include dollar amounts, prices, sale prices, or value-floor figures in captions or ad text. Refer to "documented value floor" or "value floor disclosed on product page" instead. Pricing lives on the product pages.`;
}

function pickProductOfTheWeek(date = new Date()) {
  const all = [...THEMED_PACKS, ...BUNDLES];
  const week = Math.floor(date.getTime() / (1000 * 60 * 60 * 24 * 7));
  return all[week % all.length];
}

module.exports = {
  STORE_BASE_URL,
  THEMED_PACKS,
  BUNDLES,
  catalogSummary,
  catalogSummaryAdSafe,
  pickProductOfTheWeek,
};
