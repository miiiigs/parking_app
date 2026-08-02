import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Phone } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const digits = phone.replace(/\D/g, "");
  const isValid = digits.length === 10;
  const isTooLong = digits.length > 10;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
  };

  const handleContinue = () => {
    if (!isValid) return;
    navigate("/otp", { state: { phone: `+63 ${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`, dest: "/home" } });
  };

  const borderColor = isTooLong ? "#EF4444" : isValid ? "#0F766E" : "#E2E8F0";
  const shadowColor = isTooLong ? "rgba(239,68,68,0.1)" : isValid ? "rgba(15,118,110,0.08)" : "none";

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/auth")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#1E293B" }}><ChevronLeft size={24} /></button>
          <AppLogoStatic height={28} />
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Log In</span>
      </div>

      <div className="flex flex-col px-6 pt-8 pb-8 gap-8">
        <div className="text-center">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "24px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Welcome back</h2>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B", margin: "6px 0 0" }}>Enter your phone number to continue</p>
        </div>

        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Phone Number</label>
          <div className="flex items-center gap-3 px-4"
            style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${borderColor}`, borderRadius: "14px", boxShadow: `0 0 0 3px ${shadowColor}`, transition: "all 0.2s" }}>
            <div className="flex items-center gap-2 pr-3" style={{ borderRight: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: "18px" }}>🇵🇭</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#64748B" }}>+63</span>
            </div>
            <Phone size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input
              type="tel" inputMode="numeric" placeholder="9XX XXX XXXX"
              value={phone} onChange={handleChange} maxLength={10}
              style={{ flex: 1, border: "none", background: "none", outline: "none", fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#1E293B" }}
            />
          </div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: isTooLong ? "#EF4444" : "#94A3B8", margin: 0 }}>
            {isTooLong ? "Phone number must be exactly 10 digits." : "Enter your 10-digit PH mobile number (e.g. 9171234567)"}
          </p>
        </div>

        <button onClick={handleContinue} disabled={!isValid}
          style={{ height: "52px", borderRadius: "14px", background: isValid ? "#0F766E" : "#E2E8F0", color: isValid ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: isValid ? "pointer" : "not-allowed", boxShadow: isValid ? "0 6px 20px rgba(15,118,110,0.3)" : "none", transition: "all 0.2s" }}>
          Send OTP
        </button>

        <p className="text-center" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: 0 }}>
          Don't have an account?{" "}
          <span onClick={() => navigate("/register")} style={{ color: "#0F766E", fontWeight: 600, cursor: "pointer" }}>Create an Account</span>
        </p>
      </div>
    </div>
  );
}
