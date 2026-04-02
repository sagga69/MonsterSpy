import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

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

const ONE_WEEK = 14 * 24 * 60 * 60 * 1000;

const BRANDS = {
  monster: {
    label:      "Monster",
    collection: "Monster",
    accent:     "#30ff00",
    emoji:      "🧃",
  },
  redbull: {
    label:      "Red Bull",
    collection: "Redbull",
    accent:     "#e8000d",
    emoji:      "🐂",
  },
};

function HamburgerIcon({ open, color }) {
  const bar = {
    display: "block",
    width: "24px",
    height: "2px",
    background: color,
    borderRadius: "2px",
    transition: "all 0.25s ease",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <span style={{
        ...bar,
        transform: open ? "translateY(7px) rotate(45deg)" : "none",
      }} />
      <span style={{
        ...bar,
        opacity: open ? 0 : 1,
        transform: open ? "scaleX(0)" : "none",
      }} />
      <span style={{
        ...bar,
        transform: open ? "translateY(-7px) rotate(-45deg)" : "none",
      }} />
    </div>
  );
}

function App() {
  const [brand, setBrand]     = useState("monster");
  const [data, setData]       = useState({ total: 0, products: [], lastCheck: "" });
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const accent = BRANDS[brand].accent;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Re-subscribe to Firestore whenever the brand changes
  useEffect(() => {
    setLoading(true);
    setData({ total: 0, products: [], lastCheck: "" });

    const unsubscribe = onSnapshot(
      doc(db, BRANDS[brand].collection, "cans"),
      (snap) => {
        if (snap.exists()) setData(snap.data());
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [brand]);

  const isNew = (product) => {
    if (!product.firstSeen) return false;
    const diff = Date.now() - new Date(product.firstSeen).getTime();
    return diff > 0 && diff < ONE_WEEK;
  };

  const filteredProducts = data.products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const newDrops = data.products.filter(isNew);

  function selectBrand(key) {
    setBrand(key);
    setSearch("");
    setMenuOpen(false);
  }

  return (
    <div className="App">

      {/* ── Top bar ── */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#0a0a0a",
        borderBottom: `1px solid ${accent}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
      }}>
        <h1 style={{ margin: 0, fontSize: "20px", color: accent, letterSpacing: "1px" }}>
          {BRANDS[brand].emoji} {BRANDS[brand].label} Spy
        </h1>

        {/* Hamburger button + dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: "transparent",
              border: `1px solid #111`,
              borderRadius: "8px",
              padding: "8px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HamburgerIcon open={menuOpen} color={accent} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              background: "#111",
              border: `1px solid ${accent}44`,
              borderRadius: "10px",
              overflow: "hidden",
              minWidth: "160px",
              boxShadow: `0 8px 32px #00000088`,
            }}>
              <p style={{
                color: "#555",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                margin: 0,
                padding: "10px 14px 6px",
              }}>Brands</p>
              {Object.entries(BRANDS).map(([key, b]) => (
                <button
                  key={key}
                  onClick={() => selectBrand(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    background: brand === key ? `${b.accent}22` : "transparent",
                    color: brand === key ? b.accent : "#aaa",
                    border: "none",
                    borderLeft: brand === key ? `3px solid ${b.accent}` : "3px solid transparent",
                    padding: "12px 14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: brand === key ? "700" : "400",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <span>{b.emoji}</span>
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: "0 20px" }}>
        <p style={{ color: "#555", fontSize: "13px", margin: "12px 0 0" }}>
          Tracking rare cans
        </p>
        <small style={{ color: "#444" }}>
          {loading
            ? "Loading…"
            : `Last check: ${new Date(data.lastCheck).toLocaleString("sv-SE")}`}
        </small>

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
                border: `1px solid ${accent}`,
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
                <div key={i} className="card" style={{ borderColor: accent }}>
                  <img src={item.image} alt={item.name} />
                  <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;