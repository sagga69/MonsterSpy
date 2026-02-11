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

  while (keepFetching) {
    const res = await fetch(`${COLLECTION_URL}/products.json?limit=250&page=${page}`);
    const json = await res.json();
    if (json.products && json.products.length > 0) {
      allProducts = allProducts.concat(json.products);
      page++;
    } else {
      keepFetching = false;
    }
  }

  const cache = loadCache();
  const previousUrls = (cache.products || []).map(p => p.url);
  const uniqueFlavors = new Map();

  allProducts
    .filter(p => p.title.toLowerCase().includes("monster"))
    .forEach(p => {
      const title = p.title.toUpperCase();
      
      // Determine Tag
      let tag = "";
      if (title.includes("473ML") || title.includes("US")) tag = " [🇺🇸 US IMPORT]";
      else if (title.includes("UK")) tag = " [🇬🇧 UK]";
      else if (title.includes("355ML") && !title.includes("EU")) tag = " [🇺🇸 US/SPECIAL]";
      else if (title.includes("150ML") || title.includes("M3")) tag = " [🇯🇵 JP]";

      // Clean Name
      let cleanName = title
        .replace(/MONSTER ENERGY/g, "")
        .replace(/MONSTER/g, "")
        .replace(/\d+ML/g, "")
        .replace(/\s\d+$/g, "")
        .replace(/ZERO SUGAR/g, "")
        .replace(/EU/g, "")
        .replace(/UK/g, "")
        .trim() + tag;

      const url = `${BASE_URL}/products/${p.handle}`;

      const rawImage = p.images && p.images.length > 0 ? p.images[0].src : "";

      let image = rawImage;
      if (image.startsWith('//')) {
          image = 'https:' + image;
      }

      if (!image) {
        image = "https://placehold.co/400x600/1a1a1a/30ff00?text=No+Image";
      }

      if (!uniqueFlavors.has(cleanName)) {
        uniqueFlavors.set(cleanName, { 
        name: cleanName, 
        url: url,
        image: image
      });
      }
    });

  const finalProducts = Array.from(uniqueFlavors.values());
  
  const newProducts = finalProducts.filter(p => !previousUrls.includes(p.url));

  const result = {
    total: finalProducts.length,
    products: finalProducts,
    new: newProducts,
    lastCheck: new Date().toISOString()
  };

  if (finalProducts.length > 0) {
    saveCache(result);
    fs.writeFileSync("public/cache.json", JSON.stringify(result, null, 2));
    console.log(`✅ Done! Found ${finalProducts.length} unique flavors.`);
  }
}

run();
