// Canonical product catalog mirrored from the mysteryhitsfactory.com store.
// Keep in sync with the store's src/data/themed-packs.ts and src/data/bundles.ts.
// Edit this file when products are added, renamed, repriced, or retired —
// every brand prompt and any product-spotlight posts read from here.

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
    subtitle: "Upgrade tier · $40+ guaranteed value · Holo or better guaranteed",
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
    subtitle: "Upgrade tier · $40+ guaranteed value · Holo or better guaranteed",
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
    subtitle: "Upgrade tier · $40+ guaranteed value · Holo or better guaranteed",
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
    subtitle: "Limited 2-week drop · 100% Japanese cards · $40+ guaranteed value · ends 2026-06-01",
    productUrl: url("/pokemon/japanese-pack"),
    imageUrl: imageUrl("/images/packs/japanese-pack.jpg"),
  },
];

const BUNDLES = [
  {
    slug: "collector-bundle",
    tierNumber: 1,
    name: "Collector Bundle — Tier 1",
    price: "$79.99",
    minimumValue: "$55+",
    subtitle: "Graded PSA 8–10 · Sealed booster · Rare raw hit · $55+ value",
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
    subtitle: "PSA 8–10 · 3 sealed packs · Stronger raw hit · Possible JPN · $140+ value",
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
    subtitle: "Centerpiece slab · Premium sealed · High-end raw · Possible vintage sealed · $350+ value",
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

function catalogSummary() {
  const themedLines = THEMED_PACKS.map(
    (p) =>
      `- ${p.name} · ${p.price} · min ${p.minimumValue} value · ${p.productUrl}`
  ).join("\n");
  const bundleLines = BUNDLES.map(
    (b) =>
      `- ${b.name} · ${b.price} · min ${b.minimumValue} value · ${b.subtitle} · ${b.productUrl}`
  ).join("\n");
  return `CHARACTER-FOCUSED THEMED PACKS (each ships in a $29.99 standard tier and a $79.99 Elite tier)
${themedLines}

3-TIER MYSTERY BUNDLE LADDER (graded + sealed + raw mixes)
${bundleLines}`;
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
  pickProductOfTheWeek,
};
