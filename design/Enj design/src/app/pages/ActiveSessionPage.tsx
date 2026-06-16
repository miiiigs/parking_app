import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { MapPin, Clock, Car, X, Search } from "lucide-react";
import { MOCK_SESSION } from "../constants";
import { AppLogoStatic } from "../components/AppLogo";

// Set to true when a session is active (driven by navigation from reservation/walk-in flow)
const HAS_ACTIVE_SESSION = false;

export default function ActiveSessionPage() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!HAS_ACTIVE_SESSION) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Empty state ─────────────────────────────────────────────────
  if (!HAS_ACTIVE_SESSION) {
    return (
      <div className="flex flex-col" style={{ minHeight: "100%", background: "#FAFAF9" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
          <AppLogoStatic height={28} />
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "17px", fontWeight: 600, color: "#1E293B" }}>Active Session</span>
        </div>

        {/* Empty state content */}
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center" style={{ paddingBottom: "60px" }}>
          {/* Illustration circle */}
          <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#F0FDFA", border: "2px solid #CCFBF1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
            <Car size={44} style={{ color: "#A7F3D0" }} />
          </div>

          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: 700, color: "#1E293B", margin: 0 }}>
            No Active Session
          </h2>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B", margin: "10px 0 32px", lineHeight: 1.7 }}>
            You don't have a parking session in progress. Reserve a slot or use Walk-In Parking to get started.
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => navigate("/home")}
              className="w-full flex items-center justify-center gap-2"
              style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}
            >
              <Search size={17} />
              Find Parking
            </button>
            <button
              onClick={() => navigate("/walkin-confirm")}
              className="w-full flex items-center justify-center gap-2"
              style={{ height: "52px", borderRadius: "14px", background: "#FFFFFF", color: "#0F766E", fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, border: "2px solid #0F766E", cursor: "pointer" }}
            >
              <Car size={17} />
              Walk-In Parking
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const fee = Math.ceil(seconds / 3600) * MOCK_SESSION.ratePerHour;

  return (
    <div className="flex flex-col" style={{ minHeight: "100%", background: "#FAFAF9" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34D399" }} className="animate-pulse" />
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, color: "#34D399" }}>ACTIVE SESSION</span>
        </div>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Active Parking Session</h1>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        {/* Live timer card */}
        <div
          className="rounded-2xl p-5 flex flex-col items-center"
          style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", boxShadow: "0 8px 24px rgba(15,118,110,0.3)" }}
        >
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.75)", letterSpacing: "0.5px" }}>PARKING DURATION</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "40px", fontWeight: 700, color: "#FFFFFF", margin: "8px 0 4px", letterSpacing: "2px" }}>{fmt(seconds)}</p>
          <div className="flex items-center gap-1.5">
            <Clock size={13} style={{ color: "rgba(255,255,255,0.7)" }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>Started at {MOCK_SESSION.startTime}</span>
          </div>
          <div className="mt-3 px-4 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>Running fee: ₱{fee.toFixed(2)}</span>
          </div>
        </div>

        {/* Location card */}
        <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} style={{ color: "#0F766E" }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#0F766E" }}>Location</span>
          </div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B", margin: 0 }}>{MOCK_SESSION.lot}</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", margin: "2px 0 0" }}>{MOCK_SESSION.level} · Slot {MOCK_SESSION.slot}</p>
        </div>

        {/* Vehicle card */}
        <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Car size={16} style={{ color: "#0F766E" }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#0F766E" }}>Vehicle</span>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Car size={22} style={{ color: "#0F766E" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1E293B", margin: 0 }}>{MOCK_SESSION.vehicle}</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", margin: "2px 0 0" }}>{MOCK_SESSION.color} · {MOCK_SESSION.plate}</p>
            </div>
          </div>
        </div>

        {/* Fees summary */}
        <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: "0 0 10px" }}>Fee Summary</p>
          {[
            { label: "Reservation Fee", amount: `₱${MOCK_SESSION.reservationFee}.00` },
            { label: "Parking Fee (running)", amount: `₱${fee}.00` },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>{row.label}</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#1E293B" }}>{row.amount}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1">
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1E293B" }}>Estimated Total</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: "#0F766E" }}>₱{(fee + MOCK_SESSION.reservationFee).toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{ height: "52px", borderRadius: "14px", background: "#EF4444", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}
        >
          End Session & Pay
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="absolute inset-0 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}>
          <div className="w-full rounded-t-3xl p-6" style={{ background: "#FFFFFF" }}>
            <div className="flex justify-between items-start mb-4">
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "18px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Ready to End Your Session?</p>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}><X size={20} /></button>
            </div>
            <div className="rounded-xl p-3 mb-5" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#9A3412", margin: 0, lineHeight: 1.6 }}>
                After ending your session, payment must be completed within <strong>5 minutes</strong>. You will then have an additional <strong>10 minutes</strong> to safely exit the parking facility.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowModal(false); navigate("/payment"); }} style={{ height: "50px", borderRadius: "12px", background: "#EF4444", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, border: "none", cursor: "pointer" }}>Continue</button>
              <button onClick={() => setShowModal(false)} style={{ height: "50px", borderRadius: "12px", background: "#F1F5F9", color: "#64748B", fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, border: "none", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
