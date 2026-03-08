import fetch from "node-fetch";
import fs from "fs";
import { decode } from "html-entities";

const OVRHYPD_BASE = "https://ovrhypd.se";
const OVRHYPD_COLLECTION = `${OVRHYPD_BASE}/collections/energidrycker`;
const CANDYPLANET_API = "https://www.candyplanet.se/wp-json/wc/store/products";

const CACHE_FILE = "monitor/cache.json";

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return { products: [] };
  }
}

function saveCache(data) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

// ------------------------
// Filter out packs / bundles
// ------------------------
function isRealCan(title) {
  const t = title.toUpperCase();
  if (t.includes("X") && /\d+X\d+/.test(t)) return false; // 10x473ml
  if (t.includes("PAKET")) return false;
  if (t.includes("MIXFLAK")) return false;
  if (t.includes("FLAK")) return false;
  return true;
}

// ------------------------
// Generate canonical key from URL
// ------------------------
function flavorKeyFromUrl(url) {
  return url
    .toLowerCase()
    .replace(/https?:\/\/[^/]+\//, "")
    .replace(/products\//, "")
    .replace(/produkt\//, "")
    .replace(/monster-energy/g, "")
    .replace(/monster/g, "")
    .replace(/\d+ml/g, "")
    .replace(/zero-sugar/g, "")
    .replace(/sockerfri/g, "")
    .replace(/juiced/g, "")
    .replace(/punch/g, "")
    .replace(/tea/g, "")
    .replace(/rehab/g, "")
    .replace(/java/g, "")
    .replace(/killer-brew/g, "")
    .replace(/usa/g, "")
    .replace(/eu/g, "")
    .replace(/uk/g, "")
    .replace(/-/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// ------------------------
// Fetch Ovrhypd products
// ------------------------
async function fetchOvrhypdProducts() {
  let allProducts = [];
  let page = 1;
  let keepFetching = true;

  while (keepFetching) {
    const res = await fetch(`${OVRHYPD_COLLECTION}/products.json?limit=250&page=${page}`);
    const json = await res.json();
    if (json.products && json.products.length > 0) {
      allProducts = allProducts.concat(json.products);
      page++;
    } else {
      keepFetching = false;
    }
  }

  return allProducts.map(p => ({
    title: p.title,
    handle: p.handle,
    image: p.images?.[0]?.src || "",
    source: "ovrhypd"
  }));
}

// ------------------------
// Fetch CandyPlanet products
// ------------------------
async function fetchCandyPlanetProducts() {
  let page = 1;
  let all = [];

  while (true) {
    const res = await fetch(`${CANDYPLANET_API}?category=energidryck&per_page=100&page=${page}`);
    const data = await res.json();
    if (!data.length) break;
    all = all.concat(data);
    page++;
  }

  return all.map(p => ({
    title: decode(p.name),
    handle: p.slug,
    image: p.images?.[0]?.src || "",
    url: p.permalink,
    source: "candyplanet"
  }));
}

// ------------------------
// Main run
// ------------------------
async function run() {
  const ovrhypdProducts = await fetchOvrhypdProducts();
  const candyplanetProducts = await fetchCandyPlanetProducts();

  const allProducts = [...ovrhypdProducts, ...candyplanetProducts];

  const cache = loadCache();
  const previousProducts = cache.products || [];
  const uniqueFlavors = new Map();

  allProducts
    .filter(p => p.title.toLowerCase().includes("monster") && isRealCan(p.title))
    .forEach(p => {
      const title = decode(p.title).toUpperCase();

      let tag = "";
      if (title.includes("473ML") || title.includes("US")) tag = " [US]";
      else if (title.includes("UK")) tag = " [UK]";
      else if (title.includes("355ML") && !title.includes("EU")) tag = " [SPECIAL]";
      else if (title.includes("150ML") || title.includes("M3")) tag = " [JP]";
      if (p.source === "candyplanet") tag += " [CANDYPLANET]";
      if (p.source === "ovrhypd") tag += " [OVRHYPD]";

      let cleanName = title
        .replace(/MONSTER ENERGY/g, "")
        .replace(/MONSTER/g, "")
        .replace(/\d+ML/g, "")
        .replace(/\s\d+$/g, "")
        .replace(/ZERO SUGAR/g, "")
        .replace(/EU/g, "")
        .replace(/UK/g, "")
        .replace(/–/g, "")
        .trim() + tag;

      const url =
        p.source === "ovrhypd"
          ? `${OVRHYPD_BASE}/products/${p.handle}`
          : p.url;

      let image = p.image || "";
      if (image.startsWith("//")) image = "https:" + image;
      if (!image) image = "https://placehold.co/400x600/1a1a1a/30ff00?text=No+Image";

      const key = flavorKeyFromUrl(url);

      if (!uniqueFlavors.has(key)) {
        uniqueFlavors.set(key, {
          name: cleanName,
          url,
          image
        });
      } else {
        const existing = uniqueFlavors.get(key);
        if (p.source === "ovrhypd" || cleanName.length < existing.name.length) {
          existing.name = cleanName;
          existing.url = url;
          existing.image = image;
        }
      }
    });

  const now = new Date().toISOString();

  const finalProducts = Array.from(uniqueFlavors.values()).map(product => {
    const existing = previousProducts.find(p => p.url === product.url);
    return { ...product, firstSeen: existing ? existing.firstSeen : now };
  });

  const result = {
    total: finalProducts.length,
    products: finalProducts,
    lastCheck: now
  };

  if (finalProducts.length > 0) {
    saveCache(result);
    fs.writeFileSync("public/cache.json", JSON.stringify(result, null, 2));
    console.log(`✅ Done! Found ${finalProducts.length} unique flavors.`);
  }
}

run();