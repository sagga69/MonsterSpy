import React, { useEffect, useState } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

// ─── Firebase config (from Firebase console → Project settings → Your apps) ──
const firebaseConfig = {
  apiKey: "AIzaSyBjXVQM4eTp9feVmxhBKa7ZxlqQWA5mK4s",
  authDomain: "monsterspy-43375.firebaseapp.com",
  databaseURL: "https://monsterspy-43375-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "monsterspy-43375",
  storageBucket: "monsterspy-43375.firebasestorage.app",
  messagingSenderId: "66038337195",
  appId: "1:66038337195:web:bf802cafadc2bf6ed571ee",
  measurementId: "G-SC3T3HGLMP"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── Component ────────────────────────────────────────────────────────────────
const FOUR_WEEK = 28 * 24 * 60 * 60 * 1000;

function App() {
  const [data, setData]     = useState({ total: 0, products: [], lastCheck: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onSnapshot gives a real-time listener — the UI updates automatically
    // whenever monitor.js writes a new run to Firestore.
    const unsubscribe = onSnapshot(
      doc(db, "Monster", "cans"),
      (snap) => {
        if (snap.exists()) setData(snap.data());
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe(); // cleanup on unmount
  }, []);

  const isNew = (product) => {
    if (!product.firstSeen) return false;
    const diff = Date.now() - new Date(product.firstSeen).getTime();
    return diff > 0 && diff < FOUR_WEEK;
  };

  const filteredProducts = data.products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const newDrops = data.products.filter(isNew);

  return (
    <div className="App">
      <header>
        <h1>🧃 MonsterSpy</h1>
        <p>Tracking rare cans</p>
        <small>
          {loading
            ? "Loading…"
            : `Last check: ${new Date(data.lastCheck).toLocaleString()}`}
        </small>
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
          <h2 style={{ color: "#ffcc00" }}>🚨 NEW DROPS</h2>
          <div className="flavor-grid">
            {newDrops.map((item, i) => (
              <div key={i} className="card" style={{ borderColor: "#ffcc00" }}>
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
        {loading ? (
          <p>Loading flavors…</p>
        ) : (
          <div className="flavor-grid">
            {filteredProducts.map((item, i) => (
              <div key={i} className="card">
                <img src={item.image} alt={item.name} />
                <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;