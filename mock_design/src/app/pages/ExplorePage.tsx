import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, X, MapPin, Car, SlidersHorizontal } from "lucide-react";
import { PARKING_LOTS } from "../constants";

const FILTERS = ["All", "Mall", "Commercial", "Office"];

const availColor = (a: number, t: number) =>
  a / t > 0.5 ? "#16A34A" : a / t > 0.2 ? "#D97706" : "#DC2626";

const availBg = (a: number, t: number) =>
  a / t > 0.5 ? "#F0FDF4" : a / t > 0.2 ? "#FFFBEB" : "#FEF2F2";

export default function ExplorePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const results = PARKING_LOTS.filter(lot => {
    const q = query.toLowerCase();
    return (
      (lot.name.toLowerCase().includes(q) || lot.address.toLowerCase().includes(q)) &&
      (filter === "All" || lot.type === filter)
    );
  });

  return (
    <div style={{ minHeight: "100%", background: "#F4F6F9", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", padding: "18px 16px 14px", borderBottom: "1px solid rgba(15,23,42,0.07)", flexShrink: 0 }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: 700, color: "#0F172A", margin: "0 0 14px" }}>Find Parking</p>

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "#F8FAFC", borderRadius: "12px", padding: "0 14px", height: "44px", border: "1px solid rgba(15,23,42,0.08)" }}>
            <Search size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search locations..."
              style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#0F172A" }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#94A3B8", display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{ width: "44px", height: "44px", borderRadius: "12px", background: showFilters ? "#0F766E" : "#F8FAFC", border: `1px solid ${showFilters ? "#0F766E" : "rgba(15,23,42,0.08)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <SlidersHorizontal size={16} style={{ color: showFilters ? "#FFFFFF" : "#64748B" }} />
          </button>
        </div>

        {showFilters && (
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ height: "30px", paddingInline: "14px", borderRadius: "20px", fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, background: filter === f ? "#0F766E" : "#F1F5F9", color: filter === f ? "#FFFFFF" : "#64748B", border: "none", cursor: "pointer" }}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: "0 0 12px" }}>
          <strong style={{ color: "#0F172A" }}>{results.length}</strong> {results.length === 1 ? "result" : "results"} near you
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {results.map(lot => (
            <button
              key={lot.id}
              onClick={() => navigate(`/parking/${lot.id}`)}
              style={{ width: "100%", background: "#FFFFFF", borderRadius: "14px", padding: "16px", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer", textAlign: "left" }}
            >
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#0F172A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                    <MapPin size={10} style={{ color: "#94A3B8", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.address}</span>
                  </div>
                </div>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#0F766E", background: "#F0FDFA", borderRadius: "20px", padding: "3px 9px", flexShrink: 0 }}>{lot.distance}</span>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div style={{ background: availBg(lot.available, lot.total), borderRadius: "10px", padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                    <Car size={10} style={{ color: "#64748B" }} />
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", color: "#64748B" }}>Available</span>
                  </div>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: availColor(lot.available, lot.total) }}>{lot.available}</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", color: "#94A3B8" }}>/{lot.total}</span>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "8px 10px" }}>
                  <div style={{ marginBottom: "2px" }}><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", color: "#64748B" }}>Rate</span></div>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: "#0F766E" }}>₱{lot.price}</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", color: "#94A3B8" }}>/hr</span>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "8px 10px" }}>
                  <div style={{ marginBottom: "2px" }}><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", color: "#64748B" }}>Type</span></div>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{lot.type}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {results.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Search size={22} style={{ color: "#94A3B8" }} />
            </div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#0F172A", margin: 0 }}>No results found</p>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#94A3B8", margin: "6px 0 0" }}>Try a different search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
