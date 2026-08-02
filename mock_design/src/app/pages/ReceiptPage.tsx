import { useNavigate } from "react-router";
import { Printer } from "lucide-react";
import { getSessionType } from "../store";
import { PageHeader } from "../components/PageHeader";

export default function ReceiptPage() {
  const navigate = useNavigate();
  const isWalkIn = getSessionType() === "walkin";
  const totalPaid = isWalkIn ? "₱150.00" : "₱200.00";

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9", overflowY: "auto" }}>
      <PageHeader
        title="Official Receipt"
        right={
          <button style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#F0FDFA", border: "1px solid #A7F3D0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Printer size={17} style={{ color: "#0F766E" }} />
          </button>
        }
      />

      <div className="px-5 py-5 flex flex-col gap-4">
        {/* Receipt card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          {/* Receipt header */}
          <div className="flex flex-col items-center py-5 px-4" style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>P</span>
            </div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>ParkingPH</p>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.75)", margin: "2px 0 0" }}>Official Parking Receipt</p>
          </div>

          {/* Dashed divider */}
          <div style={{ height: "1px", background: "repeating-linear-gradient(to right, #E2E8F0 0, #E2E8F0 8px, transparent 8px, transparent 16px)" }} />

          <div className="px-5 py-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8", margin: 0 }}>RECEIPT NO.</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: "#1E293B", margin: 0 }}>PH-2024-847</p>
              </div>
              <div className="text-right">
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", color: "#94A3B8", margin: 0 }}>DATE & TIME</p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Jun 16, 2024 · 5:45 PM</p>
              </div>
            </div>

            {[
              { label: "Parking Lot", value: "SM Mall of Asia" },
              { label: "Slot Number", value: "B-4 · Level 2" },
              { label: "Parking Duration", value: "3 hrs 12 mins" },
              { label: "Start Time", value: "2:30 PM" },
              { label: "End Time", value: "5:42 PM" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid #F8FAFC" }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>{row.label}</span>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, color: "#1E293B" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Dashed divider */}
          <div style={{ height: "1px", background: "repeating-linear-gradient(to right, #E2E8F0 0, #E2E8F0 8px, transparent 8px, transparent 16px)" }} />

          <div className="px-5 py-4">
            {[
              ...(!isWalkIn ? [{ label: "Reservation Fee", amount: "₱50.00" }] : []),
              { label: "Parking Fee (3 hrs)", amount: "₱150.00" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-1.5">
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>{row.label}</span>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#1E293B" }}>{row.amount}</span>
              </div>
            ))}
            <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: "2px solid #E2E8F0" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 700, color: "#1E293B" }}>Total Paid</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "18px", fontWeight: 700, color: "#0F766E" }}>{totalPaid}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B" }}>Payment Method</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, color: "#1E293B" }}>GCash</span>
            </div>
          </div>

          {/* Dashed divider */}
          <div style={{ height: "1px", background: "repeating-linear-gradient(to right, #E2E8F0 0, #E2E8F0 8px, transparent 8px, transparent 16px)" }} />

          <div className="flex flex-col items-center px-5 py-5 text-center">
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>
              Thank you for using our parking platform.<br />We hope to serve you again soon.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/home")}
          style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
