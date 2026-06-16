import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AppLogoStatic } from "../components/AppLogo";
import { Zap, Car, Clock } from "lucide-react";
import { startSession } from "../store";

function EntranceQR() {
  const pat = [[1,1,1,1,1,1,1,0,0,1,1,0,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],[1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,0,0,1,1,1,0,1,1,1,0,1],[1,0,0,0,0,0,1,0,1,1,0,0,1,0,0,0,0,0,1],[1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0],[1,1,0,1,0,1,1,0,0,1,0,0,1,1,0,1,0,1,1],[0,1,1,0,1,0,0,1,0,0,1,0,0,1,1,0,1,0,0],[1,0,0,1,0,1,0,0,1,0,1,1,0,0,1,0,1,1,0],[0,1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0,0,1],[1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,0,1,0],[1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,1,1,0,1],[1,0,1,1,1,0,1,1,0,0,1,0,1,0,1,0,0,1,0],[1,0,1,1,1,0,1,0,1,0,0,1,0,1,0,0,1,0,1],[1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0],[1,0,0,0,0,0,1,1,0,0,0,1,0,1,1,0,1,0,1],[1,1,1,1,1,1,1,0,1,1,0,0,1,0,0,1,0,1,1]];
  return (
    <svg width="150" height="150" viewBox="0 0 19 19" style={{ imageRendering: "pixelated" }}>
      {pat.flatMap((row, r) => row.map((cell, c) =>
        cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F766E" /> : null
      ))}
    </svg>
  );
}

export default function WalkInQRPage() {
  const navigate = useNavigate();
  const [secs, setSecs] = useState(600); // 10 minutes

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

  const isUrgent = secs <= 120;
  const mins = Math.floor(secs / 60);
  const seconds = secs % 60;
  const pct = ((600 - secs) / 600) * 100;

  useEffect(() => {
    if (secs <= 0) {
      startSession("walkin");
      navigate("/session");
      return;
    }
    const t = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [secs]);

  const handleParked = () => {
    startSession("walkin");
    navigate("/session");
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <AppLogoStatic height={28} />
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Walk-In Entrance Pass</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-5 flex flex-col gap-4">

          {/* Gate scanned banner */}
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={22} style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Gate Access Granted</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.85)", margin: "2px 0 0" }}>Find any available slot and park your vehicle</p>
            </div>
          </div>

          {/* 10-minute countdown */}
          <div className="rounded-2xl p-5 flex flex-col items-center"
            style={{ background: "#FFFFFF", border: `2px solid ${isUrgent ? "#FECACA" : "#E2E8F0"}`, transition: "border-color 0.3s" }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} style={{ color: isUrgent ? "#DC2626" : "#0F766E" }} />
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: isUrgent ? "#DC2626" : "#0F766E", margin: 0, letterSpacing: "0.5px" }}>
                TIME TO FIND A SLOT
              </p>
            </div>

            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "52px", fontWeight: 700, color: isUrgent ? "#DC2626" : "#0F766E", margin: 0, letterSpacing: "3px", lineHeight: 1 }}>
              {String(mins).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </p>

            <div className="w-full mt-4 rounded-full overflow-hidden" style={{ height: "8px", background: "#F1F5F9" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: isUrgent ? "#EF4444" : "linear-gradient(to right, #0F766E, #34D399)", borderRadius: "4px", transition: "width 1s linear, background 0.3s" }} />
            </div>

            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", margin: "12px 0 0", textAlign: "center", lineHeight: 1.6 }}>
              Session starts automatically when timer ends.
            </p>
          </div>

          {/* QR Card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: "#F0FDFA", borderBottom: "1px solid #CCFBF1" }}>
              <div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#0F766E", margin: 0 }}>Walk-In Entrance QR</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#64748B", margin: "2px 0 0" }}>{dateStr} · {timeStr}</p>
              </div>
              <div className="rounded-lg px-2 py-1" style={{ background: "#34D399" }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 700, color: "#064E3B" }}>SCANNED ✓</span>
              </div>
            </div>

            <div className="flex flex-col items-center py-5 px-4">
              <div className="p-3 rounded-2xl" style={{ background: "#FAFAF9", border: "1px solid #E2E8F0", opacity: 0.45 }}>
                <EntranceQR />
              </div>
              <div className="mt-3 px-4 py-1.5 rounded-full" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 700, color: "#0F766E", margin: 0, letterSpacing: "1px" }}>WI-2024-48291</p>
              </div>
            </div>

            <div style={{ height: "1px", background: "repeating-linear-gradient(to right, #E2E8F0 0, #E2E8F0 8px, transparent 8px, transparent 16px)" }} />

            <div className="px-4 py-3">
              {[
                { label: "Slot", value: "Any Available Slot" },
                { label: "Billing", value: "Metered — paid on exit" },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid #F8FAFC" }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>{row.label}</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {isUrgent && (
            <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#DC2626", margin: 0, lineHeight: 1.55 }}>
                Running low on time. Please find a slot and park immediately.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-6 pt-3" style={{ flexShrink: 0, background: "#FAFAF9" }}>
        <button
          onClick={handleParked}
          className="w-full flex items-center justify-center gap-2"
          style={{ height: "54px", borderRadius: "14px", background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "17px", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(15,118,110,0.35)" }}
        >
          <Car size={20} />
          I Have Parked
        </button>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", textAlign: "center", margin: "8px 0 0" }}>
          Session activates automatically when the timer reaches 00:00
        </p>
      </div>
    </div>
  );
}
