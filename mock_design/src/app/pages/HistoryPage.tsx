import { useNavigate } from "react-router";
import { MapPin, Clock, LayoutList } from "lucide-react";

interface Session {
  id: string;
  lot: string;
  slot: string;
  date: string;
  duration: string;
  total: string;
  type: "reservation" | "walkin";
}

const HISTORY: Session[] = [
  { id: "1", lot: "SM Mall of Asia", slot: "B-4 · Level 2", date: "Today, Jun 16", duration: "3h 12m", total: "₱200.00", type: "reservation" },
  { id: "2", lot: "Ayala Malls Manila Bay", slot: "C-2 · Level 1", date: "Jun 14", duration: "1h 45m", total: "₱105.00", type: "walkin" },
  { id: "3", lot: "BGC High Street", slot: "A-7 · Level 3", date: "Jun 10", duration: "4h 00m", total: "₱280.00", type: "reservation" },
  { id: "4", lot: "Greenbelt 5", slot: "D-1 · Level 2", date: "Jun 5", duration: "2h 20m", total: "₱210.00", type: "walkin" },
  { id: "5", lot: "Robinsons Place Manila", slot: "B-6 · Level 1", date: "May 30", duration: "1h 05m", total: "₱80.00", type: "walkin" },
];

export default function HistoryPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100%", background: "#F4F6F9", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", padding: "18px 16px 16px", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "20px", fontWeight: 700, color: "#0F172A", margin: 0 }}>History</p>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: "4px 0 0" }}>Your past parking sessions</p>
      </div>

      {HISTORY.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <LayoutList size={26} style={{ color: "#94A3B8" }} />
          </div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 600, color: "#0F172A", margin: 0 }}>No sessions yet</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#94A3B8", margin: "8px 0 0", lineHeight: 1.6 }}>
            Your completed parking sessions will appear here.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {HISTORY.map(session => (
            <div
              key={session.id}
              style={{ background: "#FFFFFF", borderRadius: "14px", padding: "16px", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#0F172A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {session.lot}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                    <MapPin size={10} style={{ color: "#94A3B8" }} />
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8" }}>{session.slot}</span>
                  </div>
                </div>
                <span style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: session.type === "reservation" ? "#0F766E" : "#6B7280",
                  background: session.type === "reservation" ? "#F0FDFA" : "#F8FAFC",
                  borderRadius: "20px",
                  padding: "3px 9px",
                  flexShrink: 0,
                }}>
                  {session.type === "reservation" ? "Reserved" : "Walk-In"}
                </span>
              </div>

              {/* Bottom row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid rgba(15,23,42,0.05)" }}>
                <div style={{ display: "flex", items: "center", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Clock size={12} style={{ color: "#94A3B8" }} />
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>{session.duration}</span>
                  </div>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", marginLeft: "12px" }}>{session.date}</span>
                </div>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{session.total}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
