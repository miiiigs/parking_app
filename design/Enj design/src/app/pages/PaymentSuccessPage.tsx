import { useNavigate } from "react-router";

function ExitQR() {
  const pat = [
    [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,0,1,0,0,1,0,1,0,0,1,1],
    [0,1,0,0,1,0,1,0,1,0,0,0,0,1,1,0,0],
    [1,1,0,0,1,1,0,0,0,1,1,0,1,0,1,1,0],
    [0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,0,0,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,0,1,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,0,1,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,0,1],
  ];
  return (
    <svg width="130" height="130" viewBox="0 0 17 17" style={{ imageRendering: "pixelated" }}>
      {pat.flatMap((row, r) => row.map((cell, c) =>
        cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F766E" /> : null
      ))}
    </svg>
  );
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9", overflowY: "auto" }}>
      {/* Success header */}
      <div
        className="flex flex-col items-center pt-8 pb-6"
        style={{ background: "linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 100%)", borderBottom: "1px solid #A7F3D0" }}
      >
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #0F766E, #34D399)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(15,118,110,0.35)", marginBottom: "12px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 700, color: "#0F766E", margin: 0 }}>Payment Successful</p>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: "6px 0 0" }}>Your parking session is now complete</p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        {/* Exit QR */}
        <div className="rounded-2xl p-5 flex flex-col items-center" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div className="p-3 rounded-2xl" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <ExitQR />
          </div>
          <div className="mt-3 px-4 py-1.5 rounded-full" style={{ background: "#F0FDFA", border: "1px solid #99F6E4" }}>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#0F766E", margin: 0 }}>EXIT-2024-00847</p>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#1D4ED8", margin: 0 }}>Present this QR code at the exit gate.</p>
          </div>
        </div>

        {/* Ticket summary */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #F1F5F9" }}>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Parking Ticket</p>
          </div>
          {[
            { label: "Parking Lot", value: "SM Mall of Asia" },
            { label: "Slot Number", value: "B-4 · Level 2" },
            { label: "Total Paid", value: "₱200.00", bold: true, teal: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #F8FAFC" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>{row.label}</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: row.bold ? 700 : 500, color: row.teal ? "#0F766E" : "#1E293B" }}>{row.value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/receipt")}
          style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}
        >
          View Receipt
        </button>
      </div>
    </div>
  );
}
