import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, MapPin, X, Zap, CreditCard, Car } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PARKING_LOTS, SLOT_STATES } from "../constants";
import { AppLogoStatic } from "../components/AppLogo";
import { getPayment, savePayment } from "../store";

type SlotStatus = "available" | "occupied" | "reserved" | "selected";
type Mode = "reserve" | "walkin";

const ROWS = ["A", "B", "C", "D"];
const COLS = [1, 2, 3, 4, 5, 6];
const WINDOWS = [
  { label: "30 min", minutes: 30, fee: 30 },
  { label: "1 Hour", minutes: 60, fee: 50 },
  { label: "2 Hours", minutes: 120, fee: 90 },
];
const slotStyle: Record<SlotStatus, { bg: string; border: string; text: string }> = {
  available: { bg: "#DCFCE7", border: "#86EFAC", text: "#15803D" },
  occupied:  { bg: "#FEE2E2", border: "#FCA5A5", text: "#DC2626" },
  reserved:  { bg: "#FEF9C3", border: "#FDE047", text: "#854D0E" },
  selected:  { bg: "#0F766E", border: "#0F766E", text: "#FFFFFF" },
};

export default function ParkingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lot = PARKING_LOTS.find(l => l.id === id) ?? PARKING_LOTS[0];
  const [mode, setMode] = useState<Mode>("reserve");
  const [slotStates, setSlotStates] = useState<Record<string, SlotStatus>>({ ...SLOT_STATES } as Record<string, SlotStatus>);
  const [selected, setSelected] = useState<string | null>(null);
  const [windowIdx, setWindowIdx] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(getPayment());
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const PAYMENT_METHODS = ["Credit / Debit Card", "GCash", "Maya"];

  const handleSelectPayment = (m: string) => {
    savePayment(m);
    setPaymentMethod(m);
    setShowPaymentSheet(false);
  };

  const handleSlotClick = (slotId: string) => {
    if (slotStates[slotId] !== "available" && slotStates[slotId] !== "selected") return;
    if (selected) setSlotStates(s => ({ ...s, [selected]: "available" }));
    if (selected === slotId) setSelected(null);
    else { setSlotStates(s => ({ ...s, [slotId]: "selected" })); setSelected(slotId); }
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    if (selected) { setSlotStates(s => ({ ...s, [selected]: "available" })); setSelected(null); }
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9", position: "relative" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "8px", borderRadius: "10px", display: "flex" }}><ChevronLeft size={20} style={{ color: "#1E293B" }} /></button>
        <AppLogoStatic height={26} />
        <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#1E293B", margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.name}</p>
          <div className="flex items-center justify-center gap-1"><MapPin size={9} style={{ color: "#94A3B8", flexShrink: 0 }} /><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.address}</span></div>
        </div>
      </div>

      <div className="px-4 py-3" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex p-1 rounded-xl gap-1" style={{ background: "#F1F5F9" }}>
          <button onClick={() => switchMode("reserve")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg"
            style={{ background: mode === "reserve" ? "#FFFFFF" : "transparent", border: "none", cursor: "pointer", boxShadow: mode === "reserve" ? "0 2px 8px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: mode === "reserve" ? 600 : 400, color: mode === "reserve" ? "#0F766E" : "#64748B" }}>Reserve in Advance</span>
          </button>
          <button onClick={() => navigate("/walkin-confirm")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg"
            style={{ background: "transparent", border: "none", cursor: "pointer", transition: "all 0.2s" }}>
            <Zap size={12} style={{ color: "#64748B" }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 400, color: "#64748B" }}>Walk-In Parking</span>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="flex flex-col" style={{ background: "#F0FDFA", borderBottom: "1px solid #CCFBF1" }}>
          {/* Total + Available */}
          <div className="flex px-4 pt-3 pb-2 gap-2">
            {[{ label: "Total Slots", value: `${lot.total}` }, { label: "Available", value: `${lot.available}`, color: "#16A34A" }].map(item => (
              <div key={item.label} className="flex-1 flex flex-col items-center">
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: item.color ?? "#1E293B" }}>{item.value}</span>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#64748B" }}>{item.label}</span>
              </div>
            ))}
          </div>
          {/* Operating hours — full width single line */}
          <div className="flex items-center gap-1.5 px-4 pb-2.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#64748B", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 600, color: "#1E293B" }}>Hours: </span>{lot.hours}
            </span>
          </div>
        </div>
        <div className="flex gap-3 px-4 pt-3 pb-2">
          {(["available", "occupied", "reserved"] as SlotStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: slotStyle[s].bg, border: `1.5px solid ${slotStyle[s].border}` }} />
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#64748B", textTransform: "capitalize" }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-32">
          <div className="rounded-2xl p-3" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 5px, transparent 5px, transparent 10px)" }} />
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "8px", color: "#94A3B8" }}>ENTRANCE →</span>
              <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 5px, transparent 5px, transparent 10px)" }} />
            </div>
            {ROWS.map(row => (
              <div key={row} className="flex items-center gap-1.5 mb-2">
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#94A3B8", width: "12px" }}>{row}</span>
                {COLS.map(col => {
                  const slotId = `${row}${col}`;
                  const status = slotStates[slotId] ?? "available";
                  const s = slotStyle[status];
                  return (
                    <button key={slotId} onClick={() => handleSlotClick(slotId)}
                      style={{ flex: 1, height: "44px", borderRadius: "8px", background: s.bg, border: `1.5px solid ${s.border}`, cursor: (status === "occupied" || status === "reserved") ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transform: status === "selected" ? "scale(1.05)" : "scale(1)", transition: "all 0.15s", boxShadow: status === "selected" ? "0 3px 10px rgba(15,118,110,0.3)" : "none" }}>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 700, color: s.text }}>{slotId}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 5px, transparent 5px, transparent 10px)" }} />
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "8px", color: "#94A3B8" }}>EXIT →</span>
              <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 5px, transparent 5px, transparent 10px)" }} />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute left-0 right-0 bottom-0 rounded-t-3xl" style={{ background: "#FFFFFF", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)", zIndex: 30 }}>
            <div className="flex justify-center pt-3 pb-1"><div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#E2E8F0" }} /></div>
            <div className="px-5 pb-6 pt-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: 0 }}>Selected Slot</p>
                  <div className="flex items-center gap-2">
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 700, color: "#0F766E", margin: 0 }}>{selected}</p>
                    {mode === "walkin" && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}><Zap size={10} style={{ color: "#0F766E" }} /><span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#0F766E" }}>Walk-In</span></span>}
                  </div>
                </div>
                <button onClick={() => { setSlotStates(s => ({ ...s, [selected!]: "available" })); setSelected(null); }} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "8px", borderRadius: "10px" }}><X size={18} style={{ color: "#64748B" }} /></button>
              </div>
              {/* Payment Method + Vehicle Info selectors */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setShowPaymentSheet(true)} className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: paymentMethod ? "#F0FDFA" : "#FFF7ED", border: `1.5px solid ${paymentMethod ? "#A7F3D0" : "#FED7AA"}`, cursor: "pointer" }}>
                  <CreditCard size={14} style={{ color: paymentMethod ? "#0F766E" : "#F97316", flexShrink: 0 }} />
                  <div className="text-left overflow-hidden">
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", color: "#64748B", margin: 0 }}>Payment</p>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: paymentMethod ? "#0F766E" : "#F97316", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {paymentMethod ?? "Tap to set"}
                    </p>
                  </div>
                </button>
                <button onClick={() => navigate("/vehicle-info")} className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "#F0FDFA", border: "1.5px solid #A7F3D0", cursor: "pointer" }}>
                  <Car size={14} style={{ color: "#0F766E", flexShrink: 0 }} />
                  <div className="text-left overflow-hidden">
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", color: "#64748B", margin: 0 }}>Vehicle</p>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#0F766E", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>ABC 1234</p>
                  </div>
                </button>
              </div>

              {mode === "reserve" ? (
                <>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#64748B", letterSpacing: "0.5px", margin: "0 0 10px" }}>RESERVATION WINDOW</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {WINDOWS.map((w, i) => (
                      <button key={i} onClick={() => setWindowIdx(i)} style={{ padding: "12px 0", borderRadius: "12px", cursor: "pointer", border: "none", background: windowIdx === i ? "#0F766E" : "#F1F5F9", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: windowIdx === i ? "#FFFFFF" : "#1E293B" }}>{w.label}</span>
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: windowIdx === i ? "rgba(255,255,255,0.8)" : "#64748B" }}>₱{w.fee}</span>
                      </button>
                    ))}
                  </div>
                  {!paymentMethod && (
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#F97316", textAlign: "center", margin: "0 0 8px" }}>
                      ⚠ Please select a payment method above before reserving.
                    </p>
                  )}
                  <button onClick={() => paymentMethod && navigate("/vehicle-info")} disabled={!paymentMethod}
                    style={{ width: "100%", height: "52px", borderRadius: "14px", background: paymentMethod ? "#0F766E" : "#E2E8F0", color: paymentMethod ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: paymentMethod ? "pointer" : "not-allowed", boxShadow: paymentMethod ? "0 6px 20px rgba(15,118,110,0.3)" : "none", transition: "all 0.2s" }}>
                    Reserve Slot — ₱{WINDOWS[windowIdx].fee}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl p-3 mb-4" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div className="flex justify-between py-1.5" style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>Parking Rate</span>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#1E293B" }}>₱{lot.price}/hr</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>Billed on exit</span>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>Metered billing</span>
                    </div>
                  </div>
                  <button onClick={() => navigate("/walkin-confirm")} className="w-full flex items-center justify-center gap-2"
                    style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>
                    <Zap size={18} />Get Entrance QR Code
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment method bottom sheet */}
      {showPaymentSheet && (
        <div className="absolute inset-0 flex items-end" style={{ background: "rgba(0,0,0,0.45)", zIndex: 40 }} onClick={() => setShowPaymentSheet(false)}>
          <div className="w-full rounded-t-3xl p-5" style={{ background: "#FFFFFF" }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-4"><div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#E2E8F0" }} /></div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B", margin: "0 0 14px" }}>Payment Method</p>
            <div className="flex flex-col gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m} onClick={() => handleSelectPayment(m)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background: paymentMethod === m ? "#F0FDFA" : "#F8FAFC", border: `2px solid ${paymentMethod === m ? "#0F766E" : "#E2E8F0"}`, cursor: "pointer" }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: paymentMethod === m ? 600 : 400, color: paymentMethod === m ? "#0F766E" : "#1E293B" }}>{m}</span>
                  {paymentMethod === m && <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0F766E", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
