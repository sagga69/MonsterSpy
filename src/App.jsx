import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [data, setData] = useState({ total: 0, new: [], products: [], lastCheck: "" });

useEffect(() => {
  const load = () => {
    // Generate a unique number (timestamp) to bypass the browser's "disk cache"
    const cacheBuster = new Date().getTime();
    const url = `/cache.json?t=${cacheBuster}`;

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

return (
  <div className="App">
    <header>
      <h1>🧃 MonsterSpy</h1>
      <p>Tracking rare cans on ovrhypd.se</p>
      <small>Last check: {new Date(data.lastCheck).toLocaleString()}</small>
    </header>

    {data.new && data.new.length > 0 && (
      <section>
        <h2 style={{color: '#ffcc00'}}>🚨 NEW DROPS</h2>
        <div className="flavor-grid">
          {data.new.map((item, i) => (
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
      <h2>All Flavors ({data.total})</h2>
      <div className="flavor-grid">
        {data.products.map((item, i) => (
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
