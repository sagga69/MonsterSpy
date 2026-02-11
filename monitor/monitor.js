import fetch from "node-fetch";
import fs from "fs";

const BASE_URL = "https://ovrhypd.se";
const COLLECTION_URL = `${BASE_URL}/collections/energidrycker`;
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

async function run() {
  const res = await fetch(`${COLLECTION_URL}/products.json`);
  const json = await res.json();

  const foundProducts = json.products
    .filter(p => p.handle.startsWith("monster-energy"))
    .map(p => `${BASE_URL}/products/${p.handle}`);

  const cache = loadCache();
  const previous = cache.products || [];

  const newProducts = foundProducts.filter(url => !previous.includes(url));

  console.log("🧃 MonsterSpy Report");
  console.log("────────────────────");
  console.log("Total Monster Energy products:", foundProducts.length);
  console.log("New products detected:", newProducts.length);

  newProducts.forEach(p => console.log(" 🚨", p));

  const result = {
    total: foundProducts.length,
    products: foundProducts,
    new: newProducts,
    lastCheck: new Date().toISOString()
  };

  saveCache(result);

  fs.writeFileSync("public/cache.json", JSON.stringify(result, null, 2));
}

run();
