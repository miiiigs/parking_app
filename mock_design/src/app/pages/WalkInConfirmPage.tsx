import { useState } from "react";
import { useNavigate } from "react-router";
import { CreditCard, Car, Zap, ChevronRight, Check, ChevronDown, Palette, Hash, Edit2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { getVehicle, saveVehicle, getPayment, savePayment } from "../store";

const PAYMENT_METHODS = ["Credit / Debit Card", "GCash", "Maya"];

const VEHICLE_MODELS = [
  "Toyota Vios","Toyota Innova","Toyota Fortuner","Toyota Hilux",
  "Honda Civic","Honda City","Honda CR-V","Honda BR-V",
  "Mitsubishi Xpander","Mitsubishi Montero Sport","Mitsubishi Mirage",
  "Hyundai Tucson","Hyundai Accent","Hyundai Santa Fe",
  "Ford Everest","Ford Ranger","Ford EcoSport",
  "Suzuki Ertiga","Suzuki Swift","Suzuki Jimny",
  "Nissan Navara","Nissan Terra","Nissan Almera",
  "Kia Seltos","Kia Stonic","Kia Carnival","Others",
];
const COLORS = ["Pearl White","Metallic Silver","Jet Black","Midnight Blue","Red","Gray","Beige / Cream","Orange","Green","Brown","Others"];

export default function WalkInConfirmPage() {
  const navigate = useNavigate();
  const saved = getVehicle();

  const [paymentMethod, setPaymentMethod] = useState<string | null>(getPayment());
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const handleSelectPayment = (m: string) => {
    savePayment(m);
    setPaymentMethod(m);
    setShowPaymentSheet(false);
  };
  const [editingVehicle, setEditingVehicle] = useState(!saved);

  // Form state
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(saved?.model ?? "");
  const [customModel, setCustomModel] = useState("");
  const [selectedColor, setSelectedColor] = useState(saved?.color ?? "");
  const [customColor, setCustomColor] = useState("");
  const [plate, setPlate] = useState(saved?.plate ?? "");

  const isOtherModel = selectedModel === "Others";
  const isOtherColor = selectedColor === "Others";
  const displayModel = isOtherModel ? customModel : selectedModel;
  const displayColor = isOtherColor ? customColor : selectedColor;
  const vehicleFormValid = displayModel.trim().length >= 2 && displayColor.trim().length >= 2 && plate.trim().length >= 3;

  // Can proceed only when both payment and vehicle are set
  const canProceed = !!paymentMethod && (!editingVehicle || vehicleFormValid);

  const handleGenerate = () => {
    if (!canProceed) return;
    if (editingVehicle && vehicleFormValid) {
      saveVehicle({ model: displayModel, color: displayColor, plate });
    }
    navigate("/walkin-qr");
  };

  const vehicleDisplay = editingVehicle
    ? null
    : { model: saved!.model, color: saved!.color, plate: saved!.plate };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <PageHeader title="Walk-In Parking" />

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-6 flex flex-col gap-5">

          {/* Hero */}
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", boxShadow: "0 6px 20px rgba(15,118,110,0.25)" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={24} style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Already at the facility?</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.85)", margin: "3px 0 0", lineHeight: 1.5 }}>
                Get your entrance QR instantly. Find any available slot once inside.
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.6px", margin: "0 0 10px" }}>PAYMENT METHOD</p>
            <button onClick={() => setShowPaymentSheet(true)}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl"
              style={{ background: "#FFFFFF", border: `1.5px solid ${paymentMethod ? "#A7F3D0" : "#FED7AA"}`, cursor: "pointer" }}>
              <div className="flex items-center gap-3">
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: paymentMethod ? "#0F766E" : "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CreditCard size={18} style={{ color: paymentMethod ? "#FFFFFF" : "#F97316" }} />
                </div>
                <div className="text-left">
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", margin: 0 }}>
                    {paymentMethod ? "Selected Payment" : "Payment Required"}
                  </p>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: paymentMethod ? "#1E293B" : "#F97316", margin: 0 }}>
                    {paymentMethod ?? "Tap to select"}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: "#94A3B8" }} />
            </button>
          </div>

          {/* Vehicle Information */}
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.6px", margin: "0 0 10px" }}>
              VEHICLE INFORMATION
              {!saved && <span style={{ color: "#EF4444", marginLeft: "4px" }}>*</span>}
            </p>

            {/* Read-only saved vehicle */}
            {!editingVehicle && vehicleDisplay && (
              <div className="flex flex-col gap-2">
                <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1.5px solid #A7F3D0" }}>
                  {[
                    { label: "Model", value: vehicleDisplay.model },
                    { label: "Color", value: vehicleDisplay.color },
                    { label: "Plate", value: vehicleDisplay.plate },
                  ].map((row, i, arr) => (
                    <div key={row.label} className="flex justify-between items-center px-4 py-3"
                      style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0FDFA" : "none" }}>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8" }}>{row.label}</span>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setEditingVehicle(true)}
                  className="flex items-center justify-center gap-2"
                  style={{ height: "38px", borderRadius: "10px", background: "none", border: "1.5px solid #E2E8F0", cursor: "pointer" }}>
                  <Edit2 size={13} style={{ color: "#64748B" }} />
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", fontWeight: 500 }}>Use a different vehicle</span>
                </button>
              </div>
            )}

            {/* Form — new user or editing */}
            {editingVehicle && (
              <div className="flex flex-col gap-3">
                {!saved && (
                  <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#9A3412", margin: 0, lineHeight: 1.5 }}>
                      No vehicle on file. Please add your vehicle details to continue. This will be saved to your profile.
                    </p>
                  </div>
                )}

                {/* Model */}
                <button onClick={() => { setModelDropdownOpen(!modelDropdownOpen); setColorDropdownOpen(false); }}
                  className="flex items-center justify-between gap-3 px-4"
                  style={{ height: "50px", background: "#FFFFFF", border: `2px solid ${selectedModel ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", cursor: "pointer" }}>
                  <div className="flex items-center gap-3">
                    <Car size={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: selectedModel ? "#1E293B" : "#94A3B8" }}>{selectedModel || "Select vehicle model"}</span>
                  </div>
                  <ChevronDown size={15} style={{ color: "#64748B", transform: modelDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {modelDropdownOpen && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1.5px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: "200px", overflowY: "auto" }}>
                    {VEHICLE_MODELS.map(m => (
                      <button key={m} onClick={() => { setSelectedModel(m); setModelDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5"
                        style={{ background: selectedModel === m ? "#F0FDFA" : "#FFFFFF", border: "none", borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: selectedModel === m ? "#0F766E" : "#1E293B", fontWeight: selectedModel === m ? 600 : 400 }}>{m}</span>
                        {selectedModel === m && <Check size={13} style={{ color: "#0F766E" }} />}
                      </button>
                    ))}
                  </div>
                )}
                {isOtherModel && (
                  <div className="flex items-center gap-3 px-4" style={{ height: "48px", background: "#FFFFFF", border: "2px solid #0F766E", borderRadius: "14px" }}>
                    <Car size={15} style={{ color: "#94A3B8" }} />
                    <input type="text" placeholder="Enter vehicle model" value={customModel} onChange={e => setCustomModel(e.target.value)}
                      style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B" }} autoFocus />
                  </div>
                )}

                {/* Color */}
                <button onClick={() => { setColorDropdownOpen(!colorDropdownOpen); setModelDropdownOpen(false); }}
                  className="flex items-center justify-between gap-3 px-4"
                  style={{ height: "50px", background: "#FFFFFF", border: `2px solid ${selectedColor ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", cursor: "pointer" }}>
                  <div className="flex items-center gap-3">
                    <Palette size={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: selectedColor ? "#1E293B" : "#94A3B8" }}>{selectedColor || "Select vehicle color"}</span>
                  </div>
                  <ChevronDown size={15} style={{ color: "#64748B", transform: colorDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {colorDropdownOpen && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1.5px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: "180px", overflowY: "auto" }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => { setSelectedColor(c); setColorDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5"
                        style={{ background: selectedColor === c ? "#F0FDFA" : "#FFFFFF", border: "none", borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: selectedColor === c ? "#0F766E" : "#1E293B", fontWeight: selectedColor === c ? 600 : 400 }}>{c}</span>
                        {selectedColor === c && <Check size={13} style={{ color: "#0F766E" }} />}
                      </button>
                    ))}
                  </div>
                )}
                {isOtherColor && (
                  <div className="flex items-center gap-3 px-4" style={{ height: "48px", background: "#FFFFFF", border: "2px solid #0F766E", borderRadius: "14px" }}>
                    <Palette size={15} style={{ color: "#94A3B8" }} />
                    <input type="text" placeholder="Enter vehicle color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                      style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B" }} autoFocus />
                  </div>
                )}

                {/* Plate */}
                <div className="flex items-center gap-3 px-4"
                  style={{ height: "50px", background: "#FFFFFF", border: `2px solid ${plate.trim().length >= 3 ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", transition: "border-color 0.2s" }}>
                  <Hash size={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
                  <input type="text" placeholder="Plate number (e.g. ABC 1234)" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
                    style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B", letterSpacing: "1px" }} />
                </div>

                {saved && (
                  <button onClick={() => setEditingVehicle(false)}
                    style={{ height: "36px", borderRadius: "10px", background: "none", border: "1.5px solid #E2E8F0", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>
                    Cancel — use saved vehicle
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Billing note */}
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#065F46", margin: 0, lineHeight: 1.6 }}>
              <strong>Metered billing.</strong> Payment collected on exit via {paymentMethod}.
            </p>
          </div>

          {/* CTA */}
          <button onClick={handleGenerate} disabled={!canProceed}
            className="w-full flex items-center justify-center gap-2"
            style={{ height: "54px", borderRadius: "14px", background: canProceed ? "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)" : "#E2E8F0", color: canProceed ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 600, border: "none", cursor: canProceed ? "pointer" : "not-allowed", boxShadow: canProceed ? "0 8px 24px rgba(15,118,110,0.35)" : "none", transition: "all 0.2s" }}>
            <Zap size={18} />
            Generate Entrance QR
          </button>
        </div>
      </div>

      {/* Payment method sheet */}
      {showPaymentSheet && (
        <div className="absolute inset-0 flex items-end" style={{ background: "rgba(0,0,0,0.45)", zIndex: 40 }} onClick={() => setShowPaymentSheet(false)}>
          <div className="w-full rounded-t-3xl p-5" style={{ background: "#FFFFFF" }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-4"><div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#E2E8F0" }} /></div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B", margin: "0 0 14px" }}>Select Payment Method</p>
            <div className="flex flex-col gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m} onClick={() => handleSelectPayment(m)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background: paymentMethod === m ? "#F0FDFA" : "#F8FAFC", border: `2px solid ${paymentMethod === m ? "#0F766E" : "#E2E8F0"}`, cursor: "pointer" }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: paymentMethod === m ? 600 : 400, color: paymentMethod === m ? "#0F766E" : "#1E293B" }}>{m}</span>
                  {paymentMethod === m && (
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0F766E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={12} style={{ color: "#FFFFFF", strokeWidth: 3 }} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
