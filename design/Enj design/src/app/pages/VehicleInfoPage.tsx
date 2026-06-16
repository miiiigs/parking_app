import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronDown, Car, Palette, Hash, Check, Edit2 } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";
import { getVehicle, saveVehicle } from "../store";

const VEHICLE_MODELS = [
  "Toyota Vios", "Toyota Innova", "Toyota Fortuner", "Toyota Hilux",
  "Honda Civic", "Honda City", "Honda CR-V", "Honda BR-V",
  "Mitsubishi Xpander", "Mitsubishi Montero Sport", "Mitsubishi Mirage",
  "Hyundai Tucson", "Hyundai Accent", "Hyundai Santa Fe",
  "Ford Everest", "Ford Ranger", "Ford EcoSport",
  "Suzuki Ertiga", "Suzuki Swift", "Suzuki Jimny",
  "Nissan Navara", "Nissan Terra", "Nissan Almera",
  "Kia Seltos", "Kia Stonic", "Kia Carnival",
  "Others",
];

const COLORS = ["Pearl White", "Metallic Silver", "Jet Black", "Midnight Blue", "Red", "Gray", "Beige / Cream", "Orange", "Green", "Brown", "Others"];

export default function VehicleInfoPage() {
  const navigate = useNavigate();
  const saved = getVehicle();

  // If vehicle data already exists, show read-only confirmation
  const [editing, setEditing] = useState(!saved);

  // Form state (only used when no saved data or user chooses to edit)
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
  const isValid = displayModel.trim().length >= 2 && displayColor.trim().length >= 2 && plate.trim().length >= 3;

  const handleConfirm = () => {
    if (editing) {
      if (!isValid) return;
      saveVehicle({ model: displayModel, color: displayColor, plate });
    }
    navigate("/confirm");
  };

  /* ── READ-ONLY VIEW (returning user) ─────────────────────────── */
  if (!editing) {
    return (
      <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
        <div className="flex items-center justify-between px-4 pt-5 pb-4"
          style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "8px", borderRadius: "10px", display: "flex" }}>
              <ChevronLeft size={20} style={{ color: "#1E293B" }} />
            </button>
            <AppLogoStatic height={28} />
          </div>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Vehicle Details</span>
        </div>

        <div className="px-5 py-6 flex flex-col gap-5">
          {/* Confirmation banner */}
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", boxShadow: "0 6px 20px rgba(15,118,110,0.25)" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Car size={22} style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Vehicle on file</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.85)", margin: "2px 0 0" }}>Using your saved profile vehicle</p>
            </div>
          </div>

          {/* Read-only vehicle card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1.5px solid #A7F3D0" }}>
            {[
              { icon: Car, label: "Vehicle Model", value: saved!.model },
              { icon: Palette, label: "Color", value: saved!.color },
              { icon: Hash, label: "Plate Number", value: saved!.plate },
            ].map(({ icon: Icon, label, value }, i, arr) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0FDFA" : "none" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} style={{ color: "#0F766E" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", margin: 0 }}>{label}</p>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1E293B", margin: 0 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Change vehicle link */}
          <button onClick={() => setEditing(true)}
            className="flex items-center justify-center gap-2"
            style={{ height: "40px", borderRadius: "12px", background: "none", border: "1.5px solid #E2E8F0", cursor: "pointer" }}>
            <Edit2 size={14} style={{ color: "#64748B" }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", fontWeight: 500 }}>Use a different vehicle</span>
          </button>

          <button onClick={handleConfirm}
            style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>
            Confirm & Reserve Slot
          </button>
        </div>
      </div>
    );
  }

  /* ── FORM VIEW (new user or editing) ─────────────────────────── */
  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-4"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => saved ? setEditing(false) : navigate(-1)}
            style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <ChevronLeft size={20} style={{ color: "#1E293B" }} />
          </button>
          <AppLogoStatic height={28} />
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>
          {saved ? "Change Vehicle" : "Vehicle Details"}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-6 flex flex-col gap-5">
          {!saved && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Car size={22} style={{ color: "#FFFFFF" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>One-time setup</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.85)", margin: "2px 0 0" }}>Saved to your profile — auto-filled next time</p>
              </div>
            </div>
          )}

          {/* Model dropdown */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Vehicle Model</label>
            <button onClick={() => { setModelDropdownOpen(!modelDropdownOpen); setColorDropdownOpen(false); }}
              className="flex items-center justify-between gap-3 px-4"
              style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${selectedModel ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", cursor: "pointer" }}>
              <div className="flex items-center gap-3">
                <Car size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: selectedModel ? "#1E293B" : "#94A3B8" }}>
                  {selectedModel || "Select vehicle model"}
                </span>
              </div>
              <ChevronDown size={16} style={{ color: "#64748B", transform: modelDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {modelDropdownOpen && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1.5px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: "220px", overflowY: "auto" }}>
                {VEHICLE_MODELS.map(m => (
                  <button key={m} onClick={() => { setSelectedModel(m); setModelDropdownOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-3"
                    style={{ background: selectedModel === m ? "#F0FDFA" : "#FFFFFF", border: "none", borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: selectedModel === m ? "#0F766E" : "#1E293B", fontWeight: selectedModel === m ? 600 : 400 }}>{m}</span>
                    {selectedModel === m && <Check size={15} style={{ color: "#0F766E" }} />}
                  </button>
                ))}
              </div>
            )}
            {isOtherModel && (
              <div className="flex items-center gap-3 px-4 mt-1" style={{ height: "50px", background: "#FFFFFF", border: "2px solid #0F766E", borderRadius: "14px" }}>
                <Car size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                <input type="text" placeholder="Enter vehicle model" value={customModel} onChange={e => setCustomModel(e.target.value)}
                  style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B" }} autoFocus />
              </div>
            )}
          </div>

          {/* Color dropdown */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Vehicle Color</label>
            <button onClick={() => { setColorDropdownOpen(!colorDropdownOpen); setModelDropdownOpen(false); }}
              className="flex items-center justify-between gap-3 px-4"
              style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${selectedColor ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", cursor: "pointer" }}>
              <div className="flex items-center gap-3">
                <Palette size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: selectedColor ? "#1E293B" : "#94A3B8" }}>
                  {selectedColor || "Select vehicle color"}
                </span>
              </div>
              <ChevronDown size={16} style={{ color: "#64748B", transform: colorDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {colorDropdownOpen && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1.5px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: "200px", overflowY: "auto" }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => { setSelectedColor(c); setColorDropdownOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-3"
                    style={{ background: selectedColor === c ? "#F0FDFA" : "#FFFFFF", border: "none", borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: selectedColor === c ? "#0F766E" : "#1E293B", fontWeight: selectedColor === c ? 600 : 400 }}>{c}</span>
                    {selectedColor === c && <Check size={15} style={{ color: "#0F766E" }} />}
                  </button>
                ))}
              </div>
            )}
            {isOtherColor && (
              <div className="flex items-center gap-3 px-4 mt-1" style={{ height: "50px", background: "#FFFFFF", border: "2px solid #0F766E", borderRadius: "14px" }}>
                <Palette size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                <input type="text" placeholder="Enter vehicle color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                  style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B" }} autoFocus />
              </div>
            )}
          </div>

          {/* Plate */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Plate Number</label>
            <div className="flex items-center gap-3 px-4"
              style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${plate.trim().length >= 3 ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", transition: "border-color 0.2s" }}>
              <Hash size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
              <input type="text" placeholder="e.g. ABC 1234" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
                style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#1E293B", letterSpacing: "1.5px" }} />
            </div>
          </div>

          {isValid && (
            <div className="rounded-2xl p-4" style={{ background: "#F0FDFA", border: "1.5px solid #A7F3D0" }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#0F766E", letterSpacing: "0.5px", margin: "0 0 8px" }}>VEHICLE SUMMARY</p>
              {[{ label: "Model", value: displayModel }, { label: "Color", value: displayColor }, { label: "Plate", value: plate }].map(row => (
                <div key={row.label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid rgba(15,118,110,0.1)" }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>{row.label}</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {!saved && (
            <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#64748B", margin: 0, lineHeight: 1.55 }}>
                This will be saved to your profile and auto-filled for all future reservations.
              </p>
            </div>
          )}

          <button onClick={handleConfirm} disabled={!isValid}
            style={{ height: "52px", borderRadius: "14px", background: isValid ? "#0F766E" : "#E2E8F0", color: isValid ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: isValid ? "pointer" : "not-allowed", boxShadow: isValid ? "0 6px 20px rgba(15,118,110,0.3)" : "none", transition: "all 0.2s" }}>
            Confirm & Reserve Slot
          </button>
        </div>
      </div>
    </div>
  );
}
