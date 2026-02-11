import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [data, setData] = useState({ total: 0, new: [], products: [], lastCheck: "" });

useEffect(() => {
  const load = () => {
    // Generate a unique number (timestamp) to bypass the browser's "disk cache"
    const cacheBuster = new Date().getTime();
    const url = `https://raw.githubusercontent.com/sagga69/MonsterSpy/main/public/cache.json?t=${cacheBuster}`;

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
    <h1>🧃 MonsterSpy</h1>
    <p>Last checked: {new Date(data.lastCheck).toLocaleString()}</p>
    
    {data.new && data.new.length > 0 && (
      <div className="new-alerts">
        <h2>🚨 NEW DROPS DETECTED:</h2>
        <ul>
          {data.new.map((item, i) => (
            <li key={i} className="new-item">
              <a href={item.url} target="_blank" rel="noreferrer">✨ {item.name}</a>
            </li>
          ))}
        </ul>
      </div>
    )}

    <h2>All Current Flavors:</h2>
    <ul className="flavor-list">
      {data.products.map((item, i) => (
        <li key={i}>
          <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
        </li>
      ))}
    </ul>
  </div>
);
}

export default App;
