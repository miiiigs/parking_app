import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AppLogoStatic } from "../components/AppLogo";
import { Zap } from "lucide-react";

function EntranceQR() {
  const pat = [[1,1,1,1,1,1,1,0,0,1,1,0,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],[1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,0,0,1,1,1,0,1,1,1,0,1],[1,0,0,0,0,0,1,0,1,1,0,0,1,0,0,0,0,0,1],[1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0],[1,1,0,1,0,1,1,0,0,1,0,0,1,1,0,1,0,1,1],[0,1,1,0,1,0,0,1,0,0,1,0,0,1,1,0,1,0,0],[1,0,0,1,0,1,0,0,1,0,1,1,0,0,1,0,1,1,0],[0,1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0,0,1],[1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,0,1,0],[1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,1,1,0,1],[1,0,1,1,1,0,1,1,0,0,1,0,1,0,1,0,0,1,0],[1,0,1,1,1,0,1,0,1,0,0,1,0,1,0,0,1,0,1],[1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0],[1,0,0,0,0,0,1,1,0,0,0,1,0,1,1,0,1,0,1],[1,1,1,1,1,1,1,0,1,1,0,0,1,0,0,1,0,1,1]];
  return (
    <svg width="160" height="160" viewBox="0 0 19 19" style={{ imageRendering: "pixelated" }}>
      {pat.flatMap((row, r) => row.map((cell, c) =>
        cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F766E" /> : null
      ))}
    </svg>
  );
}

export default function WalkInQRPage() {
  const navigate = useNavigate();
  const [secs, setSecs] = useState(5);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!scanned) return;
    if (secs <= 0) { navigate("/session"); return; }
    const t = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [scanned, secs]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <AppLogoStatic height={28} />
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>
          {scanned ? "Starting Session…" : "Walk-In Entrance Pass"}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-5 flex flex-col gap-4">

          {/* Status banner */}
          {scanned ? (
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>QR Scanned — Gate Opening</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.85)", margin: "2px 0 0" }}>
                  Session starts in <strong>{secs}</strong> second{secs !== 1 ? "s" : ""}…
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap size={22} style={{ color: "#FFFFFF" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Entrance Pass Ready</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.85)", margin: "2px 0 0" }}>Present at gate — session starts automatically</p>
              </div>
            </div>
          )}

          {/* QR Card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: "#F0FDFA", borderBottom: "1px solid #CCFBF1" }}>
              <div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#0F766E", margin: 0 }}>Walk-In Entrance QR</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#64748B", margin: "2px 0 0" }}>{dateStr} · {timeStr}</p>
              </div>
              <div className="rounded-lg px-2 py-1" style={{ background: scanned ? "#34D399" : "#0F766E" }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 700, color: scanned ? "#064E3B" : "#FFFFFF" }}>
                  {scanned ? "SCANNED" : "WALK-IN"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center py-6 px-4">
              <div className="p-4 rounded-2xl" style={{ background: "#FAFAF9", border: "1px solid #E2E8F0", opacity: scanned ? 0.4 : 1, transition: "opacity 0.4s" }}>
                <EntranceQR />
              </div>

              {scanned && (
                <div className="mt-4 w-full rounded-xl overflow-hidden" style={{ height: "6px", background: "#E2E8F0" }}>
                  <div style={{ width: `${((5 - secs) / 5) * 100}%`, height: "100%", background: "linear-gradient(to right, #0F766E, #34D399)", transition: "width 1s linear" }} />
                </div>
              )}

              <div className="mt-3 px-4 py-1.5 rounded-full" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 700, color: "#0F766E", margin: 0, letterSpacing: "1px" }}>WI-2024-48291</p>
              </div>
            </div>

            <div style={{ height: "1px", background: "repeating-linear-gradient(to right, #E2E8F0 0, #E2E8F0 8px, transparent 8px, transparent 16px)" }} />

            <div className="px-4 py-3">
              {[
                { label: "Date", value: dateStr },
                { label: "Time", value: timeStr },
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

          {/* Instruction */}
          {!scanned && (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#1D4ED8", margin: 0, lineHeight: 1.6 }}>
                Present this QR at the entrance gate. Your session starts <strong>automatically</strong> once the gate scans the code — no further action needed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Simulate scan button — for demo only */}
      {!scanned && (
        <div className="px-5 pb-6 pt-3" style={{ flexShrink: 0 }}>
          <button
            onClick={() => setScanned(true)}
            className="w-full flex items-center justify-center gap-2"
            style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
            Simulate Gate Scan
          </button>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8", textAlign: "center", margin: "8px 0 0" }}>
            In the real app, scanning happens automatically at the gate
          </p>
        </div>
      )}
    </div>
  );
}
