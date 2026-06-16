export function ParkSmarterIllustration() {
  return (
    <div className="relative w-full flex items-center justify-center" style={{ height: "340px" }}>
      <div
        className="absolute inset-x-4 rounded-3xl overflow-hidden flex flex-col"
        style={{
          top: "10px",
          bottom: "10px",
          background: "#FFFFFF",
          boxShadow: "0 8px 32px rgba(15, 118, 110, 0.12), 0 2px 8px rgba(15, 118, 110, 0.08)",
        }}
      >
        {/* Success header */}
        <div
          className="flex flex-col items-center pt-5 pb-4 px-4"
          style={{ background: "linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 100%)" }}
        >
          <div
            className="flex items-center justify-center w-14 h-14 rounded-full mb-3"
            style={{ background: "linear-gradient(135deg, #0F766E 0%, #34D399 100%)", boxShadow: "0 6px 20px rgba(15,118,110,0.35)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 700, color: "#0F766E" }}>Reservation Confirmed!</div>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 400, color: "#64748B", marginTop: "2px" }}>Your slot is secured and ready</div>
        </div>

        {/* Reservation details */}
        <div className="flex-1 px-4 py-3 flex flex-col gap-2">
          {/* Slot badge */}
          <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: "#F0FDFA", border: "1.5px solid #99F6E4" }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#0F766E" }}
              >
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>B2</span>
              </div>
              <div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>Slot B2 · Level 2</div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 400, color: "#64748B" }}>SM North EDSA · Section B</div>
              </div>
            </div>
            <div className="rounded-lg px-2 py-1" style={{ background: "#34D399" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "8px", fontWeight: 700, color: "#064E3B" }}>ACTIVE</span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "🕐", label: "Check-in", value: "2:30 PM" },
              { icon: "⏱", label: "Duration", value: "2 Hours" },
              { icon: "🚗", label: "Plate No.", value: "ABC 1234" },
              { icon: "💳", label: "Amount", value: "₱60.00" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-2.5" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "13px" }}>{item.icon}</div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 500, color: "#94A3B8", marginTop: "2px" }}>{item.label}</div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#1E293B", marginTop: "1px" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Access barrier */}
          <div className="rounded-2xl p-3" style={{ background: "#F0FDFA", border: "1.5px solid #99F6E4" }}>
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#0F766E" }}>Access Granted</span>
            </div>
            {/* Barrier visual */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: "#0F766E" }}>
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              {/* Barrier arm — open */}
              <div className="relative flex items-center">
                <div className="h-2.5 rounded-full" style={{ width: "90px", background: "repeating-linear-gradient(to right, #0F766E 0, #0F766E 14px, #34D399 14px, #34D399 22px)", borderRadius: "4px", transform: "rotate(-8deg)", transformOrigin: "left center" }} />
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 400, color: "#64748B", marginTop: "4px" }}>Barrier opens automatically on arrival</div>
          </div>
        </div>
      </div>
    </div>
  );
}
