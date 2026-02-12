import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [data, setData] = useState({ total: 0, new: [], products: [], lastCheck: "" });
  const [search, setSearch] = useState("");
  const ONE_WEEK = 14 * 24 * 60 * 60 * 1000;

useEffect(() => {
  const load = () => {
    // Generate a unique number (timestamp) to bypass the browser's "disk cache"
    const cacheBuster = new Date().getTime();
    const url = `https://raw.githubusercontent.com/sagga69/MonsterSpy/main/public/cache.json`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Could not load Monster data");
        return res.json();
      })
      .then(setData)
      .catch(err => console.error("Fetch error:", err));
  };

  load();
  // Keep the 5-minute interval so the tab stays fresh if left open
  const id = setInterval(load, 5 * 60 * 1000);
  return () => clearInterval(id);
}, []);

  const filteredProducts = data.products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

    const isNew = (product) => {
      if (!product.firstSeen) return false;
      const now = new Date();
      const firstSeen = new Date(product.firstSeen);
      const diff = now - firstSeen;
      return diff > 0 && diff < ONE_WEEK;
    };

  const newDrops = data.products.filter(isNew);

return (
  <div className="App">
    <header>
      <h1>🧃 MonsterSpy</h1>
      <p>Tracking rare cans on ovrhypd.se</p>
      <small>Last check: {new Date(data.lastCheck).toLocaleString()}</small>
    </header>
    <section>
      <div style={{ margin: "20px 0" }}>
        <input
          type="text"
          placeholder="🔍 Search flavors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "10px",
              width: "100%",
              maxWidth: "400px",
              borderRadius: "8px",
              border: "1px solid #333",
              fontSize: "16px",
              background: "#1e1e1e",
              color: "white",
            }}
        />
      </div>
    </section>

    {!search && newDrops.length > 0 && (
      <section>
        <h2 style={{color: '#ffcc00'}}>🚨 NEW DROPS</h2>
        <div className="flavor-grid">
          {newDrops.map((item, i) => (
            <div key={i} className="card" style={{borderColor: '#ffcc00'}}>
              <span className="new-badge">NEW</span>
              <img src={item.image} alt={item.name} />
              <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
            </div>
          ))}
        </div>
      </section>
    )}

    <section>
      <h2>All Flavors ({filteredProducts.length})</h2>
      <div className="flavor-grid">
        {filteredProducts.map((item, i) => (
          <div key={i} className="card">
            <img src={item.image} alt={item.name} />
            <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
          </div>
        ))}
      </div>
    </section>
  </div>
);
}

export default App;
