import fetch from "node-fetch";
import fs from "fs";

const BASE_URL = "https://ovrhypd.se";
const CACHE_FILE = "./cache.json";

// Load previous cache
function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return { products: [] };
  }
}

// Save cache
function saveCache(data) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

// Fetch a single page of products
async function fetchPage(page) {
  const url = `${BASE_URL}/collections/energidrycker/products.json?page=${page}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 MonsterSpy" }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.products || [];
}

// Fetch all pages until no more products
async function fetchAllProducts() {
  let allProducts = [];
  let page = 1;

  while (true) {
    const products = await fetchPage(page);
    if (!products || products.length === 0) break;

    allProducts = allProducts.concat(products);
    page++;
  }

  return allProducts;
}

async function run() {
  const allProducts = await fetchAllProducts();

  // Filter Monster Energy products
  const foundProducts = allProducts
    .filter(p => p.handle.includes("monster-energy"))
    .map(p => `${BASE_URL}/products/${p.handle}`);

  const cache = loadCache();
  const previous = cache.products || [];
  const newProducts = foundProducts.filter(url => !previous.includes(url));

  console.log("🧃 MonsterSpy Report");
  console.log("────────────────────");
  console.log("Total Monster Energy products:", foundProducts.length);
  console.log("New products detected:", newProducts.length);
  if (newProducts.length > 0) newProducts.forEach(p => console.log(" 🚨", p));

  saveCache({
    total: foundProducts.length,
    products: foundProducts,
    new: newProducts,
    lastCheck: new Date().toISOString()
  });
}

run();
