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
  let allProducts = [];
  let page = 1;
  let keepFetching = true;

  console.log("🔍 Fetching products from Shopify...");

  while (keepFetching) {
    const res = await fetch(`${COLLECTION_URL}/products.json?limit=250&page=${page}`);
    const json = await res.json();

    if (json.products && json.products.length > 0) {
      allProducts = allProducts.concat(json.products);
      console.log(`Page ${page}: Found ${json.products.length} items...`);
      page++;
    } else {
      keepFetching = false;
    }

    if (page > 10) keepFetching = false;
  }


  const foundProducts = allProducts
    .filter(p => {
      const handle = p.handle.toLowerCase();
      const title = p.title.toLowerCase();
      return handle.includes("monster") || title.includes("monster");
    })
    .map(p => `${BASE_URL}/products/${p.handle}`);

  const cache = loadCache();
  const previous = cache.products || [];
  const newProducts = foundProducts.filter(url => !previous.includes(url));

  console.log("🧃 MonsterSpy Report");
  console.log("────────────────────");
  console.log("Total Energy Drinks scanned:", allProducts.length);
  console.log("Total Monster Energy products:", foundProducts.length);
  console.log("New products detected:", newProducts.length);

  newProducts.forEach(p => console.log(" 🚨", p));

  const result = {
    total: foundProducts.length,
    products: foundProducts,
    new: newProducts,
    lastCheck: new Date().toISOString()
  };

  if (foundProducts.length > 0) {
    saveCache(result);
    fs.writeFileSync("public/cache.json", JSON.stringify(result, null, 2));
    console.log("✅ Cache updated.");
  } else {
    console.log("⚠️ No products found. Cache not updated to prevent data loss.");
  }
}

run();
