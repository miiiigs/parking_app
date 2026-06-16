import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, MapPin, Car, ChevronRight, Menu, X, Zap, User, CreditCard, Settings, Info, AlertTriangle } from "lucide-react";
import { PARKING_LOTS } from "../constants";
import { AppLogoStatic } from "../components/AppLogo";

const BUILDING_TYPES = ["All", "Mall", "Commercial", "Office"];

export default function HomePage({ isGuest = false }: { isGuest?: boolean }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const filtered = PARKING_LOTS.filter(lot => {
    const matchQuery = lot.name.toLowerCase().includes(query.toLowerCase()) || lot.address.toLowerCase().includes(query.toLowerCase());
    return matchQuery && (activeType === "All" || lot.type === activeType);
  });

  const availColor = (a: number, t: number) => a / t > 0.5 ? "#16A34A" : a / t > 0.2 ? "#D97706" : "#DC2626";

  return (
    <div className="flex flex-col" style={{ minHeight: "100%", background: "#FAFAF9" }}>
      <div className="px-5 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AppLogoStatic height={32} />
            {isGuest && <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#F97316", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "6px", padding: "2px 8px" }}>Guest</span>}
          </div>
          <button onClick={() => setShowDrawer(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1E293B", padding: "4px" }}><Menu size={22} /></button>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-3 px-4 flex-1" style={{ height: "46px", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: "12px" }}>
            <Search size={17} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search parking locations"
              style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#1E293B" }} />
            {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 0 }}><X size={15} /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} style={{ width: "46px", height: "46px", borderRadius: "12px", background: showFilters ? "#0F766E" : "#FFFFFF", border: `1.5px solid ${showFilters ? "#0F766E" : "#E2E8F0"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <SlidersHorizontal size={17} style={{ color: showFilters ? "#FFFFFF" : "#64748B" }} />
          </button>
        </div>
        {showFilters && (
          <div className="mt-3">
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.6px", marginBottom: "8px" }}>BUILDING TYPE</p>
            <div className="flex gap-2 flex-wrap">
              {BUILDING_TYPES.map(t => (
                <button key={t} onClick={() => setActiveType(t)} style={{ height: "30px", paddingInline: "14px", borderRadius: "20px", fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, background: activeType === t ? "#0F766E" : "#F1F5F9", color: activeType === t ? "#FFFFFF" : "#64748B", border: "none", cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isGuest && (
        <div className="px-5 pt-4">
          <button onClick={() => navigate("/walkin-confirm")} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(15,118,110,0.25)" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Zap size={20} style={{ color: "#FFFFFF" }} /></div>
            <div className="flex-1 text-left">
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Walk-In Parking</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.8)", margin: 0 }}>Already at the facility? Pay & park instantly</p>
            </div>
            <ChevronRight size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
          </button>
        </div>
      )}

      <div className="px-5 pt-4 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: 0 }}><strong style={{ color: "#1E293B" }}>{filtered.length}</strong> parking {filtered.length === 1 ? "lot" : "lots"} found</p>
          <div className="flex items-center gap-1"><MapPin size={12} style={{ color: "#0F766E" }} /><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#0F766E", fontWeight: 500 }}>Near You</span></div>
        </div>
        {filtered.map(lot => (
          <div key={lot.id} className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ height: "4px", background: "linear-gradient(to right, #0F766E, #34D399)" }} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B", margin: 0, lineHeight: 1.3 }}>{lot.name}</p>
                  <div className="flex items-center gap-1 mt-1"><MapPin size={10} style={{ color: "#94A3B8" }} /><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#64748B" }}>{lot.address}</span></div>
                </div>
                <div style={{ background: "#F0FDF4", borderRadius: "8px", padding: "4px 8px", flexShrink: 0 }}><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#16A34A" }}>{lot.distance}</span></div>
              </div>
              <div className="flex gap-3 mb-3">
                <div className="flex-1 rounded-xl p-2.5" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <div className="flex items-center gap-1 mb-0.5"><Car size={11} style={{ color: "#94A3B8" }} /><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8" }}>Available</span></div>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: availColor(lot.available, lot.total) }}>{lot.available}</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8" }}>/{lot.total}</span>
                </div>
                <div className="flex-1 rounded-xl p-2.5" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8", marginBottom: "2px" }}>Starting at</div>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: "#0F766E" }}>₱{lot.price}</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8" }}>/hr</span>
                </div>
              </div>
              <button onClick={() => { if (isGuest) setShowGuestModal(true); else navigate(`/parking/${lot.id}`); }}
                className="w-full flex items-center justify-center gap-1"
                style={{ height: "40px", borderRadius: "10px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer" }}>
                View Details <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Hamburger Drawer */}
      {showDrawer && (
        <div className="absolute inset-0 flex items-end" style={{ background: "rgba(0,0,0,0.45)", zIndex: 60 }} onClick={() => setShowDrawer(false)}>
          <div className="w-full rounded-t-3xl" style={{ background: "#FFFFFF" }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#E2E8F0" }} /></div>
            <div className="px-5 pb-6 pt-2 flex flex-col gap-2">
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.6px", margin: "8px 0 6px" }}>QUICK ACCESS</p>
              {[
                { icon: User, label: "My Profile", sub: "Edit name, photo", path: "/edit-profile" },
                { icon: CreditCard, label: "Payment Methods", sub: "Cards, GCash, Maya", path: "/payment-methods" },
                { icon: Settings, label: "Settings", sub: "Notifications, privacy", path: "/menu" },
                { icon: AlertTriangle, label: "Report an Issue", sub: "Help & support", path: "/report-issue" },
                { icon: Info, label: "About ParkingPH", sub: "Version, terms, contact", path: "/about" },
              ].map(({ icon: Icon, label, sub, path }) => (
                <button key={label} onClick={() => { setShowDrawer(false); navigate(path); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left w-full"
                  style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: "pointer" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} style={{ color: "#0F766E" }} />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: 0 }}>{label}</p>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", margin: 0 }}>{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showGuestModal && (
        <div className="absolute inset-0 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}>
          <div className="w-full rounded-t-3xl p-6" style={{ background: "#FFFFFF" }}>
            <div className="flex flex-col items-center gap-2 mb-6 text-center">
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "17px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Sign In Required</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: 0 }}>Sign in to reserve a parking space.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate("/login")} style={{ height: "48px", borderRadius: "12px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, border: "none", cursor: "pointer" }}>Log In</button>
              <button onClick={() => navigate("/register")} style={{ height: "48px", borderRadius: "12px", background: "#FFFFFF", color: "#0F766E", fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, border: "2px solid #0F766E", cursor: "pointer" }}>Register</button>
              <button onClick={() => setShowGuestModal(false)} style={{ height: "40px", borderRadius: "12px", background: "none", color: "#64748B", fontFamily: "'Poppins', sans-serif", fontSize: "13px", border: "none", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
