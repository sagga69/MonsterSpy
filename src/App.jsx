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
      <p>Total Monster Energy products: {data.total}</p>
      <p>New products detected: {data.new.length}</p>

      {data.new.length > 0 && (
        <>
          <h2>🚨 New products:</h2>
          <ul>
            {data.new.map(url => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url.split("/products/")[1].replace(/-/g, " ").toUpperCase()}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>All Monster Energy products:</h2>
      <ul>
        {data.products.map(url => (
          <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url.split("/products/")[1].replace(/-/g, " ").toUpperCase()}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
