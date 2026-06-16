import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronDown, Car, Palette, Hash, Check } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";
import { MOCK_USER } from "../constants";

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

export default function EditVehiclePage() {
  const navigate = useNavigate();
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MOCK_USER.vehicle.model);
  const [customModel, setCustomModel] = useState("");
  const [selectedColor, setSelectedColor] = useState(MOCK_USER.vehicle.color);
  const [customColor, setCustomColor] = useState("");
  const [plate, setPlate] = useState(MOCK_USER.vehicle.plate);
  const [saved, setSaved] = useState(false);

  const isOtherModel = selectedModel === "Others";
  const isOtherColor = selectedColor === "Others";
  const displayModel = isOtherModel ? customModel : selectedModel;
  const displayColor = isOtherColor ? customColor : selectedColor;
  const isValid = displayModel.trim().length >= 2 && displayColor.trim().length >= 2 && plate.trim().length >= 3;

  const handleSave = () => {
    if (!isValid) return;
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate("/menu"); }, 1200);
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <ChevronLeft size={20} style={{ color: "#1E293B" }} />
          </button>
          <AppLogoStatic height={28} />
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Vehicle Information</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-6 flex flex-col gap-5">

          {/* Vehicle Model Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Vehicle Model</label>
            <button
              onClick={() => { setModelDropdownOpen(!modelDropdownOpen); setColorDropdownOpen(false); }}
              className="flex items-center justify-between gap-3 px-4"
              style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${selectedModel ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", cursor: "pointer" }}
            >
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

          {/* Vehicle Color Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Vehicle Color</label>
            <button
              onClick={() => { setColorDropdownOpen(!colorDropdownOpen); setModelDropdownOpen(false); }}
              className="flex items-center justify-between gap-3 px-4"
              style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${selectedColor ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", cursor: "pointer" }}
            >
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

          {/* Plate Number */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Plate Number</label>
            <div className="flex items-center gap-3 px-4" style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${plate.trim().length >= 3 ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", transition: "border-color 0.2s" }}>
              <Hash size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
              <input type="text" placeholder="e.g. ABC 1234" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
                style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#1E293B", letterSpacing: "1.5px" }} />
            </div>
          </div>

          {/* Preview */}
          {isValid && (
            <div className="rounded-2xl p-4" style={{ background: "#F0FDFA", border: "1.5px solid #A7F3D0" }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#0F766E", letterSpacing: "0.5px", margin: "0 0 8px" }}>VEHICLE SUMMARY</p>
              {[{ label: "Model", value: displayModel }, { label: "Color", value: displayColor }, { label: "Plate No.", value: plate }].map(row => (
                <div key={row.label} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid rgba(15,118,110,0.1)" }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>{row.label}</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleSave} disabled={!isValid}
            className="w-full flex items-center justify-center gap-2"
            style={{ height: "52px", borderRadius: "14px", background: saved ? "#16A34A" : isValid ? "#0F766E" : "#E2E8F0", color: (saved || isValid) ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: isValid ? "pointer" : "not-allowed", boxShadow: isValid ? `0 6px 20px rgba(${saved ? "22,163,74" : "15,118,110"},0.3)` : "none", transition: "all 0.3s" }}>
            {saved ? <><Check size={18} /> Saved!</> : "Save Vehicle Info"}
          </button>
        </div>
      </div>
    </div>
  );
}
