import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";
import { PageHeader } from "../components/PageHeader";

export default function AboutAppPage() {
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);

  if (showTerms) {
    return (
      <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
        <PageHeader title="Terms & Conditions" onBack={() => setShowTerms(false)} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div className="px-5 py-5 flex flex-col gap-4">
            {["Acceptance of Terms", "Use of Service", "Reservations & Payments", "Cancellation Policy", "Liability Limitation", "Amendments"].map((title, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: "#0F766E", margin: "0 0 8px" }}>{i + 1}. {title}</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.7 }}>
                  {i === 0 && "By accessing or using ParkingPH, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the service."}
                  {i === 1 && "You may use ParkingPH only for lawful purposes and in accordance with these Terms. You agree not to use the service in any way that violates applicable laws."}
                  {i === 2 && "All reservations are subject to availability. Payment is deferred and collected upon exit. Reservation fees are charged at booking."}
                  {i === 3 && "Cancellations made before QR scan are eligible for a 50% refund of the reservation fee. No-shows result in full reservation fee charge."}
                  {i === 4 && "ParkingPH is not liable for vehicle damage, theft, or loss occurring in parking facilities. Use of the service is at your own risk."}
                  {i === 5 && "ParkingPH reserves the right to modify these Terms at any time. Continued use of the service constitutes acceptance of modified Terms."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <PageHeader title="About the App" />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-5 flex flex-col gap-5">
          {/* App Identity */}
          <div className="flex flex-col items-center py-6 rounded-2xl" style={{ background: "linear-gradient(135deg, #0F766E, #0D9488)" }}>
            <AppLogoStatic height={52} />
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.75)", margin: "12px 0 4px" }}>Version 1.0.0 (Build 100)</p>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.9)", margin: 0 }}>Smart Parking Made Easy</p>
          </div>

          {/* Info rows */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            {[
              { label: "Developer", value: "ParkingPH Inc." },
              { label: "Platform", value: "iOS & Android" },
              { label: "App Version", value: "1.0.0" },
              { label: "Build Number", value: "100" },
              { label: "Release Date", value: "June 16, 2024" },
            ].map((row, i, arr) => (
              <div key={row.label} className="flex justify-between items-center px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>{row.label}</span>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            <button onClick={() => setShowTerms(true)} className="w-full flex items-center justify-between px-4 py-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", cursor: "pointer" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1E293B" }}>Terms & Conditions</span>
              <ChevronRight size={18} style={{ color: "#CBD5E1" }} />
            </button>
            <button onClick={() => navigate("/privacy")} className="w-full flex items-center justify-between px-4 py-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", cursor: "pointer" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1E293B" }}>Privacy Policy</span>
              <ChevronRight size={18} style={{ color: "#CBD5E1" }} />
            </button>
            <button onClick={() => navigate("/contact-support")} className="w-full flex items-center justify-between px-4 py-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", cursor: "pointer" }}>
              <div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1E293B", margin: 0 }}>Contact Support</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: 0 }}>support@parkingph.com</p>
              </div>
              <ChevronRight size={18} style={{ color: "#CBD5E1" }} />
            </button>
          </div>

          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", textAlign: "center", margin: 0 }}>
            © 2024 ParkingPH Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
