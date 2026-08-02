import { useNavigate } from "react-router";
import { AppLogo } from "../components/AppLogo";

export default function AuthPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-center" style={{ flex: "0 0 44%", background: "linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 60%, #CCFBF1 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "140px", height: "140px", borderRadius: "50%", background: "rgba(52,211,153,0.15)" }} />
        <div style={{ position: "absolute", bottom: "-30px", left: "-20px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(15,118,110,0.1)" }} />
        <div className="flex flex-col items-center gap-2">
          <AppLogo size={80} showWordmark={true} />
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", marginTop: "2px" }}>Smart Parking Made Easy</span>
        </div>
      </div>
      <div className="flex flex-col px-6 pt-7 pb-6" style={{ flex: 1 }}>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "26px", fontWeight: 600, color: "#1E293B", margin: 0, lineHeight: 1.2 }}>Welcome</h1>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B", marginTop: "6px", marginBottom: "24px", lineHeight: 1.6 }}>Find and reserve parking spaces before you arrive.</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate("/login")} style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>Log In</button>
          <button onClick={() => navigate("/register")} style={{ height: "52px", borderRadius: "14px", background: "#FFFFFF", color: "#0F766E", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "2px solid #0F766E", cursor: "pointer" }}>Register</button>
          <button onClick={() => navigate("/guest")} style={{ height: "52px", borderRadius: "14px", background: "#F1F5F9", color: "#64748B", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer" }}>Continue as Guest</button>
        </div>
        <div className="flex items-start gap-2 mt-4 rounded-xl p-3" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#9A3412", margin: 0, lineHeight: 1.5 }}>Guests can browse parking lots and availability but <strong>cannot reserve</strong> parking slots.</p>
        </div>
      </div>
    </div>
  );
}
