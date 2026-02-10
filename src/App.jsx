import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [data, setData] = useState({
    total: 0,
    new: [],
    products: [],
    lastCheck: "",
  });

  useEffect(() => {
    fetch("./cache.json")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(console.error);
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
            {data.new.map((url) => (
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
        {data.products.map((url) => (
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
