import fetch from "node-fetch";
import fs from "fs";
import { decode } from "html-entities";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── Firebase init ──────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  fs.readFileSync("./serviceAccountKey.json", "utf-8")
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const DOC_REF = db.collection("Monster").doc("cans");

// ─── Config ─────────────────────────────────────────────────────────────────
const OVRHYPD_BASE = "https://ovrhypd.se";
const OVRHYPD_COLLECTION = `${OVRHYPD_BASE}/collections/energidrycker`;
const CANDYPLANET_API = "https://www.candyplanet.se/wp-json/wc/store/products";

// Words that carry no flavor meaning — stripped before comparing
const NOISE_WORDS = new Set([
  "monster", "energy", "drink", "can", "zero", "sugar", "sockerfri",
  "juiced", "punch", "tea", "rehab",
  "ultra", "mega", "hydro", "super", "original", "mix",
  "500ml", "473ml", "355ml", "250ml", "150ml",
  "eu", "uk", "us", "usa", "jp",
  "ovrhypd", "candyplanet",
]);

// ─── Helpers ────────────────────────────────────────────────────────────────
function isRealCan(title) {
  const t = title.toUpperCase();
  if (t.includes("X") && /\d+X\d+/.test(t)) return false;
  if (t.includes("PAKET"))   return false;
  if (t.includes("MIXFLAK")) return false;
  if (t.includes("FLAK"))    return false;
  return true;
}

// Extract meaningful flavor tokens from a product name
function flavorTokens(name) {
  return name
    .toLowerCase()
    .replace(/\d+ml/g, "")
    .replace(/[^a-zåäö0-9\s]/g, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !NOISE_WORDS.has(w));
}

// Jaccard similarity between two sets of tokens (0 = nothing in common, 1 = identical)
function jaccardSimilarity(tokensA, tokensB) {
  const a = new Set(tokensA);
  const b = new Set(tokensB);
  const intersection = [...a].filter(t => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

// Returns true if two product names refer to the same flavor
function isSameFlavor(nameA, nameB, threshold = 0.6) {
  const tokA = flavorTokens(nameA);
  const tokB = flavorTokens(nameB);

  // If either has no tokens after stripping, fall back to exact match
  if (tokA.length === 0 || tokB.length === 0) {
    return nameA.toLowerCase() === nameB.toLowerCase();
  }

  const score = jaccardSimilarity(tokA, tokB);
  return score >= threshold;
}

// ─── Scrapers ────────────────────────────────────────────────────────────────
async function fetchOvrhypdProducts() {
  let allProducts = [];
  let page = 1;

  while (true) {
    const res  = await fetch(`${OVRHYPD_COLLECTION}/products.json?limit=250&page=${page}`);
    const json = await res.json();
    if (!json.products?.length) break;
    allProducts = allProducts.concat(json.products);
    page++;
  }

  return allProducts.map(p => ({
    title:  p.title,
    handle: p.handle,
    image:  p.images?.[0]?.src || "",
    source: "ovrhypd",
  }));
}

async function fetchCandyPlanetProducts() {
  let all  = [];
  let page = 1;

  while (true) {
    const res  = await fetch(`${CANDYPLANET_API}?category=energidryck&per_page=100&page=${page}`);
    const data = await res.json();
    if (!data.length) break;
    all = all.concat(data);
    page++;
  }

  return all.map(p => ({
    title:  decode(p.name),
    handle: p.slug,
    image:  p.images?.[0]?.src || "",
    url:    p.permalink,
    source: "candyplanet",
  }));
}

// ─── Build enriched product list ─────────────────────────────────────────────
function buildProducts(allProducts) {
  const enriched = allProducts
    .filter(p => p.title.toLowerCase().includes("monster") && isRealCan(p.title))
    .map(p => {
      const title = decode(p.title).toUpperCase();

      let tag = "";
      if      (title.includes("473ML") || title.includes("US")) tag = " [US]";
      else if (title.includes("UK"))                             tag = " [UK]";
      else if (title.includes("355ML") && !title.includes("EU")) tag = " [SPECIAL]";
      else if (title.includes("150ML") || title.includes("M3")) tag = " [JP]";
      if (p.source === "candyplanet") tag += " [CANDYPLANET]";
      if (p.source === "ovrhypd")     tag += " [OVRHYPD]";

      const cleanName = title
        .replace(/\d+ML/g, "")
        .replace(/\s\d+$/g, "")
        .replace(/ZERO SUGAR/g, "")
        .replace(/SOCKERFRI/g, "")
        .replace(/SHOT/g, "")
        .replace(/ZERO/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/\s[A-Z]\s*$/g, "")
        .replace(/EU/g, "")
        .replace(/UK/g, "")
        .replace(/USA/g, "")
        .replace(/US/g, "")
        .replace(/JAPAN/g, "")
        .replace(/–/g, "")
        .replace(/\s+/g, " ")
        .trim() + (p.source === "ovrhypd" ? " [OVRHYPD]" : " [CANDYPLANET]");

      const url =
        p.source === "ovrhypd"
          ? `${OVRHYPD_BASE}/products/${p.handle}`
          : p.url;

      let image = p.image || "";
      if (image.startsWith("//")) image = "https:" + image;
      if (!image) image = "https://placehold.co/400x600/1a1a1a/30ff00?text=No+Image";

      return { name: cleanName, url, image, source: p.source };
    });

  // Deduplicate using name similarity — ovrhypd entries are preferred
  const deduped = [];

  for (const product of enriched) {
    const match = deduped.find(existing => isSameFlavor(existing.name, product.name));

    if (!match) {
      deduped.push({ ...product });
    } else {
      // Prefer ovrhypd over candyplanet
      if (product.source === "ovrhypd" && match.source !== "ovrhypd") {
        match.name   = product.name;
        match.url    = product.url;
        match.image  = product.image;
        match.source = product.source;
      }
    }
  }

  return deduped;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
  const [ovrhypdProducts, candyplanetProducts] = await Promise.all([
    fetchOvrhypdProducts(),
    fetchCandyPlanetProducts(),
  ]);

  const allProducts = [...ovrhypdProducts, ...candyplanetProducts];

  // Load previous data to preserve firstSeen timestamps
  const snap = await DOC_REF.get();
  const previousProducts = snap.exists ? (snap.data().products || []) : [];

  const deduped = buildProducts(allProducts);
  const now = new Date().toISOString();

  // Attach firstSeen — carry over from DB using similarity match, or set now for new ones
  const finalProducts = deduped.map(product => {
    const existing = previousProducts.find(p => isSameFlavor(p.name, product.name));
    return { ...product, firstSeen: existing ? existing.firstSeen : now };
  });

  if (!finalProducts.length) {
    console.warn("⚠️  No products found — skipping write.");
    return;
  }

  const result = {
    total:     finalProducts.length,
    products:  finalProducts,
    lastCheck: now,
  };

  await DOC_REF.set(result);
  console.log(`✅ Done! Wrote ${finalProducts.length} unique flavors to Firestore.`);
}

run().catch(err => {
  console.error("❌ monitor.js failed:", err);
  process.exit(1);
});