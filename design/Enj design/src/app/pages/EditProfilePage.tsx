import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, User, Phone, Check } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";
import { MOCK_USER } from "../constants";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [name, setName] = useState(MOCK_USER.name);
  const [phone, setPhone] = useState(MOCK_USER.mobile);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
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
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Edit Profile</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-6 flex flex-col gap-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: "76px", height: "76px", borderRadius: "24px", background: "linear-gradient(135deg, #0F766E, #34D399)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(15,118,110,0.25)" }}>
              <User size={36} style={{ color: "#FFFFFF" }} />
            </div>
            <button style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#0F766E", background: "none", border: "none", cursor: "pointer" }}>
              Change Photo
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Full Name</label>
              <div className="flex items-center gap-3 px-4" style={{ height: "52px", background: "#FFFFFF", border: "2px solid #E2E8F0", borderRadius: "14px" }}>
                <User size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#1E293B" }} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Phone Number</label>
              <div className="flex items-center gap-3 px-4" style={{ height: "52px", background: "#F8FAFC", border: "2px solid #E2E8F0", borderRadius: "14px" }}>
                <Phone size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#94A3B8" }} disabled />
              </div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", margin: 0 }}>Phone number cannot be changed here. Use "Change Phone Number" in menu settings.</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2"
            style={{ height: "52px", borderRadius: "14px", background: saved ? "#16A34A" : "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: `0 6px 20px rgba(${saved ? "22,163,74" : "15,118,110"},0.3)`, transition: "background 0.3s" }}
          >
            {saved ? <><Check size={18} /> Saved!</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
