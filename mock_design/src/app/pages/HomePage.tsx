import { useNavigate } from "react-router";
import { Zap, MapPin, ChevronRight, TrendingUp, Clock } from "lucide-react";
import { PARKING_LOTS, MOCK_USER } from "../constants";
import { AppLogoStatic } from "../components/AppLogo";
import { getActiveSession } from "../store";

const availColor = (a: number, t: number) =>
  a / t > 0.5 ? "#16A34A" : a / t > 0.2 ? "#D97706" : "#DC2626";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const dateStr = new Date().toLocaleDateString("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const STATS = [
  { label: "Sessions", value: "12", icon: TrendingUp },
  { label: "Hours Parked", value: "34h", icon: Clock },
  { label: "Saved", value: "₱0", icon: Zap },
];

export default function HomePage({ isGuest = false }: { isGuest?: boolean }) {
  const navigate = useNavigate();
  const hasSession = getActiveSession();
  const nearby = PARKING_LOTS.slice(0, 3);

  return (
    <div style={{ minHeight: "100%", background: "#F4F6F9" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", padding: "18px 20px 16px", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <AppLogoStatic height={28} />
          {isGuest && (
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#F97316", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "20px", padding: "3px 10px" }}>
              Guest
            </span>
          )}
        </div>

        <div style={{ marginTop: "14px" }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: 700, color: "#0F172A", margin: 0, lineHeight: 1.25 }}>
            {greeting()},<br />
            {isGuest ? "Guest" : MOCK_USER.name.split(" ")[0]} 👋
          </p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: "4px 0 0" }}>{dateStr}</p>
        </div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Active session banner */}
        {hasSession && (
          <button onClick={() => navigate("/session")} style={{ width: "100%", borderRadius: "14px", background: "linear-gradient(135deg, #0F766E, #0D9488)", padding: "14px 16px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 16px rgba(15,118,110,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34D399", animation: "pulse 2s infinite" }} />
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>Session in progress — tap to view</span>
            </div>
            <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.7)" }} />
          </button>
        )}

        {/* Walk-In CTA */}
        {!isGuest && !hasSession && (
          <button
            onClick={() => navigate("/walkin-confirm")}
            style={{ width: "100%", borderRadius: "14px", background: "#0F766E", padding: "16px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 4px 20px rgba(15,118,110,0.18)", textAlign: "left" }}
          >
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={22} style={{ color: "#FFFFFF" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Walk-In Parking</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.75)", margin: "2px 0 0" }}>Already at the facility? Get your QR instantly</p>
            </div>
            <ChevronRight size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
          </button>
        )}

        {/* Stats row — for logged in users */}
        {!isGuest && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ background: "#FFFFFF", borderRadius: "12px", padding: "14px 10px", textAlign: "center", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <Icon size={16} style={{ color: "#0F766E", marginBottom: "6px" }} />
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "17px", fontWeight: 700, color: "#0F172A", margin: 0 }}>{value}</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8", margin: "2px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Nearby section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#0F172A", margin: 0 }}>Nearby Parking</p>
            <button
              onClick={() => navigate("/explore")}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, color: "#0F766E", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
            >
              See all <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {nearby.map(lot => (
              <button
                key={lot.id}
                onClick={() => isGuest ? navigate("/auth") : navigate(`/parking/${lot.id}`)}
                style={{ width: "100%", background: "#FFFFFF", borderRadius: "14px", padding: "14px 16px", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}
              >
                <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MapPin size={18} style={{ color: "#0F766E" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#0F172A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.name}</p>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", margin: "2px 0 0" }}>{lot.distance} · ₱{lot.price}/hr</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: availColor(lot.available, lot.total) }}>{lot.available}</span>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8", margin: "1px 0 0" }}>slots free</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
