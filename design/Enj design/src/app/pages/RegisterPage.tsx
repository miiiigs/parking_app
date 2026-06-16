import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, User, Phone } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const digits = phone.replace(/\D/g, "");
  const isValid = name.trim().length >= 2 && digits.length === 10;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
  };

  const handleContinue = () => {
    if (!isValid) return;
    navigate("/otp", { state: { phone: `+63 ${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`, dest: "/home" } });
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/auth")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#1E293B" }}><ChevronLeft size={24} /></button>
          <AppLogoStatic height={28} />
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Create Account</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="flex flex-col px-6 pt-8 pb-8 gap-6">
          <div className="text-center">
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "24px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Create your account</h2>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B", margin: "6px 0 0" }}>Start parking smarter today</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Full Name</label>
              <div className="flex items-center gap-3 px-4"
                style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${name.trim().length >= 2 ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", transition: "border-color 0.2s" }}>
                <User size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                <input type="text" placeholder="Juan dela Cruz" value={name} onChange={e => setName(e.target.value)}
                  style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#1E293B" }} />
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Phone Number</label>
              <div className="flex items-center gap-3 px-4"
                style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${digits.length === 10 ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", transition: "border-color 0.2s" }}>
                <div className="flex items-center gap-2 pr-3" style={{ borderRight: "1px solid #E2E8F0" }}>
                  <span style={{ fontSize: "18px" }}>🇵🇭</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#64748B" }}>+63</span>
                </div>
                <Phone size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                <input type="tel" inputMode="numeric" placeholder="9XX XXX XXXX" value={phone}
                  onChange={handlePhoneChange} maxLength={10}
                  style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#1E293B" }} />
              </div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: 0 }}>Enter your 10-digit PH mobile number (e.g. 9171234567)</p>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: "#F0FDFA", border: "1px solid #A7F3D0" }}>
            <div className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#0F766E", margin: 0 }}>Vehicle details added later</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#0F766E", margin: "3px 0 0", lineHeight: 1.5, opacity: 0.8 }}>Add your vehicle model, color, and plate number in your Profile after signing up.</p>
              </div>
            </div>
          </div>

          <button onClick={handleContinue} disabled={!isValid}
            style={{ height: "52px", borderRadius: "14px", background: isValid ? "#0F766E" : "#E2E8F0", color: isValid ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: isValid ? "pointer" : "not-allowed", boxShadow: isValid ? "0 6px 20px rgba(15,118,110,0.3)" : "none", transition: "all 0.2s" }}>
            Send OTP to Verify
          </button>

          <p className="text-center" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: 0 }}>
            Already have an account?{" "}
            <span onClick={() => navigate("/login")} style={{ color: "#0F766E", fontWeight: 600, cursor: "pointer" }}>Log In</span>
          </p>
        </div>
      </div>
    </div>
  );
}
