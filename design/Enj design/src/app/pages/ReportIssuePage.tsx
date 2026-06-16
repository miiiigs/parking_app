import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Check, Upload } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";

const CATEGORIES = [
  { id: "slot", label: "Slot marked available but occupied", icon: "🅿️" },
  { id: "incident", label: "Damaged vehicle / incident report", icon: "🚗" },
  { id: "payment", label: "Payment issue", icon: "💳" },
  { id: "qr", label: "Entry/exit QR scan issue", icon: "📷" },
  { id: "other", label: "Other concerns", icon: "💬" },
];

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const refNo = `RPT-2024-${Math.floor(Math.random() * 90000) + 10000}`;
  const canSubmit = category && description.trim().length >= 10;

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center px-6 text-center" style={{ height: "100%", background: "#FAFAF9" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #0F766E, #34D399)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(15,118,110,0.3)", marginBottom: "16px" }}>
          <Check size={34} style={{ color: "#FFFFFF", strokeWidth: 2.5 }} />
        </div>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 700, color: "#0F766E", margin: 0 }}>Report Submitted</h2>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B", margin: "10px 0 32px", lineHeight: 1.6 }}>Our team will review your concern and get back to you within 24 hours.</p>
        <div className="w-full rounded-2xl p-4 mb-6" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#0F766E", margin: "0 0 2px" }}>Reference No.</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: "#1E293B", margin: 0 }}>{refNo}</p>
        </div>
        <button onClick={() => navigate("/menu")} style={{ width: "100%", height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>Back to Menu</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/menu")} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "8px", borderRadius: "10px", display: "flex" }}><ChevronLeft size={20} style={{ color: "#1E293B" }} /></button>
          <AppLogoStatic height={28} />
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Report an Issue</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-5 flex flex-col gap-5">
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: "0 0 12px" }}>What type of issue are you reporting?</p>
            <div className="flex flex-col gap-2">
              {CATEGORIES.map(cat => {
                const active = category === cat.id;
                return (
                  <button key={cat.id} onClick={() => setCategory(cat.id)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                    style={{ background: "#FFFFFF", border: `2px solid ${active ? "#0F766E" : "#E2E8F0"}`, cursor: "pointer", boxShadow: active ? "0 0 0 3px rgba(15,118,110,0.08)" : "none", transition: "all 0.15s" }}>
                    <span style={{ fontSize: "20px", flexShrink: 0 }}>{cat.icon}</span>
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: active ? 600 : 400, color: active ? "#0F766E" : "#1E293B", flex: 1 }}>{cat.label}</span>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: active ? "#0F766E" : "#F1F5F9", border: `2px solid ${active ? "#0F766E" : "#CBD5E1"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {active && <Check size={11} style={{ color: "#FFFFFF", strokeWidth: 3 }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>Issue Description</p>
            <textarea placeholder="Please describe the issue in detail..." value={description} onChange={e => setDescription(e.target.value)} rows={4}
              style={{ width: "100%", borderRadius: "14px", padding: "14px", resize: "none", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B", background: "#FFFFFF", border: `2px solid ${description.length >= 10 ? "#0F766E" : "#E2E8F0"}`, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} />
            <div className="flex justify-between mt-1">
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8" }}>Minimum 10 characters</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: description.length > 0 ? "#0F766E" : "#94A3B8" }}>{description.length}/500</span>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>Attach Photo <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span></p>
            <button className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl py-6" style={{ background: "#F8FAFC", border: "2px dashed #CBD5E1", cursor: "pointer" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}><Upload size={20} style={{ color: "#94A3B8" }} /></div>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>Tap to upload a photo</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8" }}>JPG, PNG up to 5MB</span>
            </button>
          </div>
          <button onClick={() => canSubmit && setSubmitted(true)} disabled={!canSubmit}
            style={{ height: "52px", borderRadius: "14px", background: canSubmit ? "#0F766E" : "#E2E8F0", color: canSubmit ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 6px 20px rgba(15,118,110,0.3)" : "none", transition: "all 0.2s" }}>
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
