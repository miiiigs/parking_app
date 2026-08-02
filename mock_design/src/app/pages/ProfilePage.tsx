import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Bell, MapPin, LogOut, Car, Shield } from "lucide-react";
import { MOCK_USER } from "../constants";

interface RowProps { label: string; sub?: string; onPress: () => void; }
const Row = ({ label, sub, onPress }: RowProps) => (
  <button
    onClick={onPress}
    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid rgba(15,23,42,0.05)", textAlign: "left" }}
  >
    <div>
      <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#0F172A", margin: 0 }}>{label}</p>
      {sub && <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", margin: "1px 0 0" }}>{sub}</p>}
    </div>
    <ChevronRight size={15} style={{ color: "#CBD5E1", flexShrink: 0 }} />
  </button>
);

interface ToggleRowProps { label: string; icon: React.ElementType; value: boolean; onToggle: () => void; last?: boolean; }
const ToggleRow = ({ label, icon: Icon, value, onToggle, last }: ToggleRowProps) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: last ? "none" : "1px solid rgba(15,23,42,0.05)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <Icon size={15} style={{ color: "#64748B" }} />
      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{label}</span>
    </div>
    <button onClick={onToggle} style={{ border: "none", cursor: "pointer", padding: 0, background: "none" }}>
      <div style={{ width: "40px", height: "22px", borderRadius: "11px", background: value ? "#0F766E" : "#CBD5E1", position: "relative", transition: "background 0.2s" }}>
        <div style={{ width: "16px", height: "16px", borderRadius: "8px", background: "#FFFFFF", position: "absolute", top: "3px", left: value ? "21px" : "3px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
      </div>
    </button>
  </div>
);

const SectionHeader = ({ label }: { label: string }) => (
  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.8px", margin: "20px 0 6px 4px" }}>{label}</p>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "#FFFFFF", borderRadius: "14px", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
    {children}
  </div>
);

export default function ProfilePage() {
  const navigate = useNavigate();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [locationOn, setLocationOn] = useState(true);

  return (
    <div style={{ minHeight: "100%", background: "#F4F6F9", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", padding: "18px 16px 16px", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Profile</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* Profile card */}
        <div style={{ background: "#0F766E", borderRadius: "16px", padding: "20px 16px", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 700, color: "#FFFFFF" }}>
                {MOCK_USER.name.charAt(0)}
              </span>
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>{MOCK_USER.name}</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "3px 0 0" }}>{MOCK_USER.mobile}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            {[
              { icon: Car, text: MOCK_USER.vehicle.model },
              { icon: Shield, text: MOCK_USER.vehicle.plate },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.12)", borderRadius: "8px", padding: "6px 10px" }}>
                <Icon size={11} style={{ color: "rgba(255,255,255,0.8)" }} />
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Account */}
        <SectionHeader label="ACCOUNT" />
        <Card>
          <Row label="Edit Profile" sub="Name, photo" onPress={() => navigate("/edit-profile")} />
          <Row label="Change Phone Number" onPress={() => navigate("/change-phone")} />
          <Row label="Vehicle Information" sub={`${MOCK_USER.vehicle.model} · ${MOCK_USER.vehicle.plate}`} onPress={() => navigate("/edit-vehicle")} />
        </Card>

        {/* Payments */}
        <SectionHeader label="PAYMENTS" />
        <Card>
          <Row label="Payment Methods" sub="GCash, Maya, Cards" onPress={() => navigate("/payment-methods")} />
        </Card>

        {/* Preferences */}
        <SectionHeader label="PREFERENCES" />
        <Card>
          <ToggleRow label="Notifications" icon={Bell} value={notificationsOn} onToggle={() => setNotificationsOn(v => !v)} />
          <ToggleRow label="Location Services" icon={MapPin} value={locationOn} onToggle={() => setLocationOn(v => !v)} last />
        </Card>

        {/* Support */}
        <SectionHeader label="SUPPORT & INFO" />
        <Card>
          <Row label="Report an Issue" onPress={() => navigate("/report-issue")} />
          <Row label="Contact Support" sub="support@parkingph.com" onPress={() => navigate("/contact-support")} />
          <Row label="Privacy Policy" onPress={() => navigate("/privacy")} />
          <Row label="About the App" sub="v1.0.0" onPress={() => navigate("/about")} />
        </Card>

        {/* Log Out */}
        <button
          onClick={() => navigate("/auth")}
          style={{ width: "100%", marginTop: "20px", height: "48px", borderRadius: "12px", background: "#FFFFFF", color: "#DC2626", fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, border: "1px solid rgba(220,38,38,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <LogOut size={16} style={{ color: "#DC2626" }} />
          Log Out
        </button>

        <div style={{ height: "16px" }} />
      </div>
    </div>
  );
}
