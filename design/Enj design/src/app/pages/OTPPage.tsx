import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { ChevronLeft } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";

export default function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as { phone?: string })?.phone ?? "+63 9XX XXX XXXX";
  const dest = (location.state as { dest?: string })?.dest ?? "/home";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [shake, setShake] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { inputs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);
  const handleChange = (i: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = char; setDigits(next);
    if (char && i < 5) inputs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };
  const handleVerify = () => {
    if (digits.join("").length < 6) { setShake(true); setTimeout(() => setShake(false), 600); return; }
    navigate(dest);
  };
  const handleResend = () => { setTimer(60); setCanResend(false); setDigits(["","","","","",""]); inputs.current[0]?.focus(); };
  const filled = digits.filter(Boolean).length;
  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#1E293B" }}><ChevronLeft size={24} /></button>
          <AppLogoStatic height={28} />
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Verify Phone</span>
      </div>
      <div className="flex flex-col px-6 pt-10 pb-8 gap-8">
        <div className="flex flex-col items-center text-center gap-3">
          <div style={{ width: "68px", height: "68px", borderRadius: "20px", background: "linear-gradient(135deg, #0F766E, #34D399)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(15,118,110,0.3)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.22a2 2 0 0 1 1.99-2.18H6.6a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Enter Verification Code</h2>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B", margin: "8px 0 0", lineHeight: 1.6 }}>We sent a 6-digit code to<br /><strong style={{ color: "#1E293B" }}>{phone}</strong></p>
          </div>
        </div>
        <div className="flex justify-center gap-3" style={{ animation: shake ? "shake 0.5s ease" : "none" }}>
          {digits.map((d, i) => (
            <input key={i} ref={el => { inputs.current[i] = el; }} type="tel" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
              style={{ width: "46px", height: "56px", borderRadius: "14px", textAlign: "center", fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 700, color: "#1E293B", outline: "none", background: d ? "#F0FDFA" : "#FFFFFF", border: `2px solid ${d ? "#0F766E" : "#E2E8F0"}`, boxShadow: d ? "0 0 0 3px rgba(15,118,110,0.1)" : "none", transition: "all 0.15s" }} />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ width: `${(filled / 6) * 100}%`, height: "100%", background: "linear-gradient(to right, #0F766E, #34D399)", borderRadius: "2px", transition: "width 0.2s" }} />
          </div>
          <button onClick={handleVerify} disabled={filled < 6} style={{ height: "52px", borderRadius: "14px", background: filled === 6 ? "#0F766E" : "#E2E8F0", color: filled === 6 ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: filled === 6 ? "pointer" : "not-allowed", boxShadow: filled === 6 ? "0 6px 20px rgba(15,118,110,0.3)" : "none", transition: "all 0.2s" }}>Verify & Continue</button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: 0 }}>Didn't receive a code? Check your SMS inbox.</p>
          {canResend ? (
            <button onClick={handleResend}
              style={{ height: "46px", paddingInline: "28px", borderRadius: "12px", background: "#F0FDFA", border: "2px solid #0F766E", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#0F766E" }}>
              Resend Code
            </button>
          ) : (
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: 0 }}>
              Resend available in{" "}
              <span style={{ fontWeight: 700, color: "#0F766E" }}>
                {String(Math.floor(timer / 60)).padStart(2,"0")}:{String(timer % 60).padStart(2,"0")}
              </span>
            </p>
          )}
        </div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
