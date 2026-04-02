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

const MONSTER_REF  = db.collection("Monster").doc("cans");
const REDBULL_REF  = db.collection("Redbull").doc("cans");

// ─── Config ─────────────────────────────────────────────────────────────────
const OVRHYPD_BASE = "https://ovrhypd.se";
const OVRHYPD_COLLECTION = `${OVRHYPD_BASE}/collections/energidrycker`;
const CANDYPLANET_API = "https://www.candyplanet.se/wp-json/wc/store/products";

// ─── Noise words ─────────────────────────────────────────────────────────────
const MONSTER_NOISE = new Set([
  "monster", "energy", "drink", "can", "zero", "sugar", "sockerfri",
  "juiced", "punch", "tea", "rehab", "mix",
  "ultra", "mega", "hydro", "super", "original",
  "500ml", "473ml", "355ml", "250ml", "150ml",
  "eu", "uk", "us", "usa", "jp",
  "ovrhypd", "candyplanet",
]);

const REDBULL_NOISE = new Set([
  "red", "bull", "redbull", "energy", "drink", "can", "zero", "sugar",
  "sockerfri", "edition", "mix",
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

function flavorTokens(name, noiseWords) {
  return name
    .toLowerCase()
    .replace(/\d+ml/g, "")
    .replace(/[^a-zåäö0-9\s]/g, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !noiseWords.has(w));
}

function jaccardSimilarity(tokensA, tokensB) {
  const a = new Set(tokensA);
  const b = new Set(tokensB);
  const intersection = [...a].filter(t => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

function isSameFlavor(nameA, nameB, noiseWords, threshold = 0.6) {
  const tokA = flavorTokens(nameA, noiseWords);
  const tokB = flavorTokens(nameB, noiseWords);
  if (tokA.length === 0 || tokB.length === 0) {
    return nameA.toLowerCase() === nameB.toLowerCase();
  }
  return jaccardSimilarity(tokA, tokB) >= threshold;
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

// ─── Build product list for a given brand ────────────────────────────────────
function buildProducts(allProducts, brand) {
  const isMonster = brand === "monster";
  const keyword   = isMonster ? "monster" : "red bull";
  const noise     = isMonster ? MONSTER_NOISE : REDBULL_NOISE;

  const enriched = allProducts
    .filter(p => p.title.toLowerCase().includes(keyword) && isRealCan(p.title))
    .map(p => {
      const title = decode(p.title).toUpperCase();


      const tag = p.source === "ovrhypd" ? " [OVRHYPD]" : " [CANDYPLANET]";

      const cleanName = title
        .replace(isMonster ? /MONSTER ENERGY/g : /RED BULL/g, "")
        .replace(isMonster ? /MONSTER/g : /REDBULL/g, "")
        .replace(/\d+ML/g, "")
        .replace(/\s\d+$/g, "")
        .replace(/ZERO SUGAR/g, "")
        .replace(/SOCKERFRI/g, "")
        .replace(/SHOT/g, "")
        .replace(/ZERO/g, "")
        .replace(/ALUMINIUMFLASKA/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/\s[A-Z]\s*$/g, "")
        .replace(/EU/g, "")
        .replace(/UK/g, "")
        .replace(/USA/g, "")
        .replace(/US/g, "")
        .replace(/JAPAN/g, "")
        .replace(/–/g, "")
        .replace(/\s+/g, " ")
        .trim() + tag;

      const url =
        p.source === "ovrhypd"
          ? `${OVRHYPD_BASE}/products/${p.handle}`
          : p.url;

      let image = p.image || "";
      if (image.startsWith("//")) image = "https:" + image;
      if (!image) image = "https://placehold.co/400x600/1a1a1a/30ff00?text=No+Image";

      return { name: cleanName, url, image, source: p.source };
    });

  // Deduplicate — ovrhypd preferred
  const deduped = [];
  for (const product of enriched) {
    const match = deduped.find(e => isSameFlavor(e.name, product.name, noise));
    if (!match) {
      deduped.push({ ...product });
    } else if (product.source === "ovrhypd" && match.source !== "ovrhypd") {
      match.name   = product.name;
      match.url    = product.url;
      match.image  = product.image;
      match.source = product.source;
    }
  }

  return deduped;
}

// ─── Write brand to Firestore ─────────────────────────────────────────────────
async function syncBrand(allProducts, brand, docRef) {
  const snap = await docRef.get();
  const previousProducts = snap.exists ? (snap.data().products || []) : [];
  const noise = brand === "monster" ? MONSTER_NOISE : REDBULL_NOISE;

  const deduped = buildProducts(allProducts, brand);
  const now = new Date().toISOString();

  const finalProducts = deduped.map(product => {
    const existing = previousProducts.find(p => isSameFlavor(p.name, product.name, noise));
    return { ...product, firstSeen: existing ? existing.firstSeen : now };
  });

  if (!finalProducts.length) {
    console.warn(`⚠️  No ${brand} products found — skipping write.`);
    return;
  }

  await docRef.set({ total: finalProducts.length, products: finalProducts, lastCheck: now });
  console.log(`✅ ${brand}: wrote ${finalProducts.length} unique flavors to Firestore.`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
  const [ovrhypdProducts, candyplanetProducts] = await Promise.all([
    fetchOvrhypdProducts(),
    fetchCandyPlanetProducts(),
  ]);

  const allProducts = [...ovrhypdProducts, ...candyplanetProducts];

  await Promise.all([
    syncBrand(allProducts, "monster", MONSTER_REF),
    syncBrand(allProducts, "redbull", REDBULL_REF),
  ]);
}

run().catch(err => {
  console.error("❌ monitor.js failed:", err);
  process.exit(1);
});