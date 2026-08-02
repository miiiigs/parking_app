import { useState } from "react";
import { useNavigate } from "react-router";
import { Phone } from "lucide-react";
import { PageHeader } from "../components/PageHeader";

export default function ChangePhonePage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const digits = phone.replace(/\D/g, "").slice(0, 10);
  const isValid = digits.length === 10;

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <PageHeader title="Change Phone Number" />

      <div className="px-5 py-6 flex flex-col gap-5">
        {/* Current number */}
        <div className="rounded-2xl p-4" style={{ background: "#F0FDFA", border: "1px solid #A7F3D0" }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", margin: "0 0 3px" }}>Current Number</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: "#0F766E", margin: 0 }}>+63 912 345 6789</p>
        </div>

        {/* New number */}
        <div className="flex flex-col gap-1.5">
          <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>New Phone Number</label>
          <div className="flex items-center gap-3 px-4"
            style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${isValid ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", transition: "border-color 0.2s" }}>
            <div className="flex items-center gap-2 pr-3" style={{ borderRight: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: "18px" }}>🇵🇭</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#64748B" }}>+63</span>
            </div>
            <Phone size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input
              type="tel" inputMode="numeric" placeholder="9XX XXX XXXX"
              value={digits} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10}
              style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#1E293B" }}
            />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: digits.length === 10 ? "#0F766E" : "#CBD5E1", fontWeight: 500 }}>{digits.length}/10</span>
          </div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: 0 }}>A verification OTP will be sent to your new number.</p>
        </div>

        <button
          onClick={() => isValid && navigate("/otp", { state: { phone: `+63 ${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`, dest: "/profile" } })}
          disabled={!isValid}
          style={{ height: "52px", borderRadius: "14px", background: isValid ? "#0F766E" : "#E2E8F0", color: isValid ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: isValid ? "pointer" : "not-allowed", boxShadow: isValid ? "0 6px 20px rgba(15,118,110,0.3)" : "none", transition: "all 0.2s" }}>
          Send Verification Code
        </button>
      </div>
    </div>
  );
}
