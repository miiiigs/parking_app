import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { AppLogoStatic } from "../components/AppLogo";
import { MapPin, Clock, X } from "lucide-react";
import { startSession } from "../store";

type Stage = "qr" | "grace";

function ReservationQR() {
  const pat = [[1,1,1,1,1,1,1,0,0,1,0,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],[1,0,1,1,1,0,1,0,0,1,0,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,0,1,0,0,1,0,1,1,1,0,1],[1,0,0,0,0,0,1,0,1,1,1,0,1,0,0,0,0,0,1],[1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],[1,0,1,1,0,1,0,1,0,0,1,0,1,0,0,1,1,0,1],[0,1,0,0,1,0,1,0,1,0,0,1,0,1,1,0,0,1,0],[1,0,1,0,1,1,0,0,0,1,1,0,1,0,1,0,1,0,1],[0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,0],[1,1,1,1,1,1,1,0,0,1,0,0,1,0,1,1,0,1,1],[1,0,0,0,0,0,1,0,1,0,1,0,0,1,0,0,1,0,0],[1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,1],[1,0,1,1,1,0,1,0,1,0,1,0,0,1,0,1,0,0,1],[1,0,1,1,1,0,1,0,0,1,1,0,1,1,0,0,1,1,0],[1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,0,1,1],[1,1,1,1,1,1,1,0,0,1,1,0,1,0,0,1,1,0,0]];
  return (
    <svg width="140" height="140" viewBox="0 0 19 19" style={{ imageRendering: "pixelated" }}>
      {pat.flatMap((row, r) => row.map((cell, c) => cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#1E293B" /> : null))}
    </svg>
  );
}

function GracePeriodScreen({ onParked }: { onParked: () => void }) {
  const navigate = useNavigate();
  const [secs, setSecs] = useState(600);

  const goToSession = () => { startSession(); navigate("/session"); };

  useEffect(() => {
    if (secs <= 0) { goToSession(); return; }
    const t = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [secs]);
  const mins = Math.floor(secs / 60);
  const seconds = secs % 60;
  const isUrgent = secs <= 120;
  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <AppLogoStatic height={28} />
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Grace Period</span>
      </div>
      <div className="flex flex-col px-5 py-5 gap-4" style={{ flex: 1, overflowY: "auto" }}>
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", boxShadow: "0 6px 20px rgba(15,118,110,0.25)" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>QR Scanned Successfully</p>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>Entrance gate access granted</p>
          </div>
        </div>
        <div className="rounded-2xl p-5 flex flex-col items-center" style={{ background: "#FFFFFF", border: `2px solid ${isUrgent ? "#FECACA" : "#E2E8F0"}`, transition: "border-color 0.3s" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} style={{ color: isUrgent ? "#DC2626" : "#0F766E" }} />
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: isUrgent ? "#DC2626" : "#0F766E", margin: 0, letterSpacing: "0.5px" }}>TIME TO OCCUPY SLOT</p>
          </div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "52px", fontWeight: 700, color: isUrgent ? "#DC2626" : "#0F766E", margin: 0, letterSpacing: "3px", lineHeight: 1 }}>
            {String(mins).padStart(2,"0")}:{String(seconds).padStart(2,"0")}
          </p>
          <div className="w-full mt-4 rounded-full overflow-hidden" style={{ height: "8px", background: "#F1F5F9" }}>
            <div style={{ width: `${((600 - secs) / 600) * 100}%`, height: "100%", background: isUrgent ? "#EF4444" : "linear-gradient(to right, #0F766E, #34D399)", borderRadius: "4px", transition: "width 1s linear, background 0.3s" }} />
          </div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", margin: "12px 0 0", textAlign: "center", lineHeight: 1.6 }}>
            Please proceed to your assigned parking slot.<br />Session activates automatically when timer ends.
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div className="flex items-center gap-3">
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#0F766E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>B4</span>
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Slot B4 · Level 2</p>
              <div className="flex items-center gap-1 mt-0.5"><MapPin size={11} style={{ color: "#94A3B8" }} /><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>SM Mall of Asia</span></div>
            </div>
            <div className="ml-auto rounded-lg px-2 py-1" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#0F766E" }}>RESERVED</span>
            </div>
          </div>
        </div>
        {isUrgent && (
          <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#DC2626", margin: 0, lineHeight: 1.55 }}>
              Time is running out. If you don't park, your reservation fee will still be charged and the slot will be released.
            </p>
          </div>
        )}
      </div>
      <div className="px-5 pb-6 pt-3" style={{ flexShrink: 0 }}>
        <button onClick={() => { startSession(); onParked(); }} className="w-full flex items-center justify-center gap-2"
          style={{ height: "56px", borderRadius: "16px", background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "17px", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(15,118,110,0.35)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="16" r="1"/></svg>
          I am Parked
        </button>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", textAlign: "center", margin: "10px 0 0" }}>Session auto-activates when the timer reaches 00:00</p>
      </div>
    </div>
  );
}

export default function ReservationConfirmPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("qr");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  if (cancelled) {
    return (
      <div className="flex flex-col items-center justify-center px-6 text-center" style={{ height: "100%", background: "#FAFAF9" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#FEF2F2", border: "2px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <X size={32} style={{ color: "#DC2626" }} />
        </div>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 700, color: "#1E293B", margin: 0 }}>Reservation Cancelled</h2>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B", margin: "10px 0 24px", lineHeight: 1.6 }}>
          Your reservation has been cancelled. A <strong style={{ color: "#DC2626" }}>50% cancellation fee of ₱25.00</strong> has been charged. The remaining ₱25.00 has been released.
        </p>

        {/* Payment breakdown */}
        <div className="w-full rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #E2E8F0" }}>
          <div className="flex justify-between items-center px-4 py-3" style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>Reservation Fee (held)</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>₱50.00</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3" style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#DC2626" }}>Cancellation fee (50%)</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>− ₱25.00 charged</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3" style={{ background: "#F0FDF4" }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#16A34A" }}>Released (50%)</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#16A34A" }}>₱25.00 released</span>
          </div>
        </div>

        <button onClick={() => navigate("/home")} style={{ width: "100%", height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>Back to Home</button>
      </div>
    );
  }

  if (stage === "grace") return <GracePeriodScreen onParked={() => navigate("/session")} />;

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9", overflowY: "auto" }}>
      <div className="flex flex-col items-center pt-6 pb-5"
        style={{ background: "linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 100%)", borderBottom: "1px solid #A7F3D0", flexShrink: 0 }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, #0F766E, #34D399)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(15,118,110,0.35)", marginBottom: "10px" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: 700, color: "#0F766E", margin: 0 }}>Reservation Confirmed</p>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", margin: "4px 0 0" }}>Your slot is secured — payment collected on exit</p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        {/* QR Code */}
        <div className="rounded-2xl p-5 flex flex-col items-center" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div className="p-3 rounded-2xl" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}><ReservationQR /></div>
          <div className="mt-3 px-4 py-1.5 rounded-full" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#0F766E", margin: 0 }}>RES-2024-00847</p>
          </div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#64748B", marginTop: "8px", textAlign: "center", lineHeight: 1.6 }}>Scan this QR code at the parking entrance to activate your session.</p>
        </div>

        {/* Reservation details */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          {[
            { label: "Parking Lot", value: "SM Mall of Asia" },
            { label: "Parking Slot", value: "B4 · Level 2" },
            { label: "Reservation Window", value: "1 Hour" },
            { label: "Start Time", value: "3:00 PM" },
            { label: "Expiration", value: "4:00 PM" },
            { label: "Reservation Fee", value: "₱50.00 (held)" },
          ].map((row, i, arr) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>{row.label}</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: row.label === "Reservation Fee" ? "#0F766E" : "#1E293B" }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Payment deferred notice */}
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#065F46", margin: 0, lineHeight: 1.6 }}>
            <strong>No payment charged now.</strong> Total fee (reservation + parking time) will be collected automatically when you exit the facility.
          </p>
        </div>

        {/* Grace period info */}
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#9A3412", margin: 0, lineHeight: 1.6 }}>
            After scanning, you have <strong>10 minutes</strong> to occupy your slot. If you don't show, the reservation fee is still charged and the slot is released.
          </p>
        </div>

        <button onClick={() => setStage("grace")}
          style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>
          I Have Arrived — Scan QR
        </button>

        {/* Cancel reservation */}
        <button onClick={() => setShowCancelModal(true)}
          style={{ height: "46px", borderRadius: "14px", background: "#FEF2F2", color: "#DC2626", fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, border: "1.5px solid #FECACA", cursor: "pointer" }}>
          Cancel Reservation
        </button>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="absolute inset-0 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}>
          <div className="w-full rounded-t-3xl p-6" style={{ background: "#FFFFFF" }}>
            <div className="flex flex-col items-center text-center gap-2 mb-5">
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={24} style={{ color: "#DC2626" }} />
              </div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "17px", fontWeight: 700, color: "#1E293B", margin: 0 }}>Cancel Reservation?</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.6 }}>
                Since payment is on hold, a <strong style={{ color: "#DC2626" }}>50% cancellation fee (₱25.00)</strong> will be pushed through. The remaining ₱25.00 will be released.
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden mb-5" style={{ border: "1px solid #E2E8F0" }}>
              <div className="flex justify-between px-4 py-2.5" style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>Reservation Fee (on hold)</span>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>₱50.00</span>
              </div>
              <div className="flex justify-between px-4 py-2.5" style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#DC2626" }}>Cancellation fee charged (50%)</span>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>₱25.00</span>
              </div>
              <div className="flex justify-between px-4 py-2.5" style={{ background: "#F0FDF4" }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#16A34A" }}>Released</span>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 700, color: "#16A34A" }}>₱25.00</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowCancelModal(false); setCancelled(true); }}
                style={{ height: "50px", borderRadius: "12px", background: "#DC2626", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, border: "none", cursor: "pointer" }}>
                Yes, Cancel Reservation
              </button>
              <button onClick={() => setShowCancelModal(false)}
                style={{ height: "50px", borderRadius: "12px", background: "#F1F5F9", color: "#64748B", fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, border: "none", cursor: "pointer" }}>
                Keep My Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
