import { useState } from "react";
import { useNavigate } from "react-router";
import { User, CreditCard, Settings, Info, LogOut, ChevronRight, ChevronDown, Bell, Shield, MapPin, Car, AlertTriangle } from "lucide-react";
import { MOCK_USER } from "../constants";
import { AppLogoStatic } from "../components/AppLogo";

export default function MenuPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [locationOn, setLocationOn] = useState(true);
  const toggle = (key: string) => setExpanded(e => e === key ? null : key);

  const Section = ({ label, icon: Icon, id, children }: { label: string; icon: React.ElementType; id: string; children: React.ReactNode }) => (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-4" style={{ background: "none", border: "none", cursor: "pointer" }}>
        <div className="flex items-center gap-3">
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={18} style={{ color: "#0F766E" }} />
          </div>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1E293B" }}>{label}</span>
        </div>
        {expanded === id ? <ChevronDown size={18} style={{ color: "#94A3B8" }} /> : <ChevronRight size={18} style={{ color: "#94A3B8" }} />}
      </button>
      {expanded === id && <div style={{ borderTop: "1px solid #F1F5F9" }}>{children}</div>}
    </div>
  );

  const NavItem = ({ label, sub, onPress }: { label: string; sub?: string; onPress?: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #F8FAFC", cursor: "pointer" }} onClick={onPress}>
      <div>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#1E293B", margin: 0 }}>{label}</p>
        {sub && <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", margin: 0 }}>{sub}</p>}
      </div>
      <ChevronRight size={16} style={{ color: "#CBD5E1" }} />
    </div>
  );

  const ToggleRow = ({ label, icon: Icon, value, onToggle }: { label: string; icon: React.ElementType; value: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #F8FAFC" }}>
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: "#64748B" }} />
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#1E293B" }}>{label}</span>
      </div>
      <button onClick={onToggle} style={{ border: "none", cursor: "pointer", padding: 0 }}>
        <div style={{ width: "42px", height: "24px", borderRadius: "12px", background: value ? "#0F766E" : "#CBD5E1", position: "relative", transition: "background 0.25s" }}>
          <div style={{ width: "18px", height: "18px", borderRadius: "9px", background: "#FFFFFF", position: "absolute", top: "3px", left: value ? "21px" : "3px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.25s" }} />
        </div>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ minHeight: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center px-5 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
        <AppLogoStatic height={30} />
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        {/* Profile card */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", boxShadow: "0 6px 20px rgba(15,118,110,0.25)" }}>
          <div className="flex items-center gap-3">
            <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={26} style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 600, color: "#FFFFFF", margin: 0 }}>{MOCK_USER.name}</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>{MOCK_USER.mobile}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3 pt-3 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
            {[{ icon: Car, text: MOCK_USER.vehicle.model }, { icon: Shield, text: MOCK_USER.vehicle.plate }, { text: MOCK_USER.vehicle.color }].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(255,255,255,0.15)" }}>
                {Icon && <Icon size={11} style={{ color: "rgba(255,255,255,0.9)" }} />}
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <Section label="User Profile" icon={User} id="profile">
          <NavItem label="Edit Profile" sub="Name, photo" onPress={() => navigate("/edit-profile")} />
          <NavItem label="Change Phone Number" onPress={() => navigate("/change-phone")} />
          <NavItem label="Vehicle Information" sub={`${MOCK_USER.vehicle.model} · ${MOCK_USER.vehicle.plate}`} onPress={() => navigate("/edit-vehicle")} />
        </Section>

        {/* Payment Wallet */}
        <Section label="Payment Wallet" icon={CreditCard} id="wallet">
          <NavItem label="Payment Methods" sub="Cards, GCash, Maya" onPress={() => navigate("/payment-methods")} />
        </Section>

        {/* Settings */}
        <Section label="Settings" icon={Settings} id="settings">
          <ToggleRow label="Notifications" icon={Bell} value={notificationsOn} onToggle={() => setNotificationsOn(v => !v)} />
          <ToggleRow label="Location Services" icon={MapPin} value={locationOn} onToggle={() => setLocationOn(v => !v)} />
        </Section>

        {/* Report an Issue */}
        <button onClick={() => navigate("/report-issue")} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #FED7AA", cursor: "pointer" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={18} style={{ color: "#F97316" }} />
          </div>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#EA580C", flex: 1, textAlign: "left" }}>Report an Issue</span>
          <ChevronRight size={18} style={{ color: "#FED7AA" }} />
        </button>

        {/* About */}
        <Section label="About the App" icon={Info} id="about">
          <NavItem label="App Version" sub="v1.0.0 (Build 100)" onPress={() => navigate("/about")} />
          <NavItem label="Terms & Conditions" onPress={() => navigate("/about")} />
          <NavItem label="Privacy Policy" onPress={() => navigate("/privacy")} />
          <NavItem label="Contact Support" sub="support@parkingph.com" onPress={() => navigate("/contact-support")} />
        </Section>

        <button onClick={() => navigate("/auth")} className="w-full flex items-center justify-center gap-2 rounded-2xl" style={{ height: "50px", background: "#FEF2F2", border: "1.5px solid #FECACA", cursor: "pointer" }}>
          <LogOut size={18} style={{ color: "#DC2626" }} />
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 500, color: "#DC2626" }}>Log Out</span>
        </button>
      </div>
    </div>
  );
}
