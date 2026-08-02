export function FindParkingIllustration() {
  return (
    <div className="relative w-full flex items-center justify-center" style={{ height: "340px" }}>
      {/* Map background card */}
      <div
        className="absolute inset-x-4 rounded-3xl overflow-hidden"
        style={{
          top: "10px",
          bottom: "10px",
          background: "linear-gradient(145deg, #E8F5F3 0%, #D1FAE5 50%, #CCFBF1 100%)",
          boxShadow: "0 8px 32px rgba(15, 118, 110, 0.12), 0 2px 8px rgba(15, 118, 110, 0.08)",
        }}
      >
        {/* Grid lines (map texture) */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#0F766E" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Road horizontal */}
        <div className="absolute left-0 right-0 bg-white/60" style={{ top: "52%", height: "18px" }} />
        {/* Road vertical */}
        <div className="absolute top-0 bottom-0 bg-white/60" style={{ left: "42%", width: "18px" }} />

        {/* Building blocks */}
        <div className="absolute rounded-xl bg-white/70" style={{ top: "18%", left: "8%", width: "80px", height: "50px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />
        <div className="absolute rounded-xl bg-white/70" style={{ top: "18%", right: "10%", width: "60px", height: "70px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />
        <div className="absolute rounded-xl bg-white/70" style={{ bottom: "20%", left: "8%", width: "55px", height: "55px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />
        <div className="absolute rounded-xl bg-white/70" style={{ bottom: "16%", right: "8%", width: "75px", height: "45px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />

        {/* Destination pins */}
        {/* Mall pin */}
        <div className="absolute flex flex-col items-center" style={{ top: "12%", left: "14%", transform: "translateX(-50%)" }}>
          <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-md" style={{ boxShadow: "0 2px 10px rgba(15,118,110,0.18)" }}>
            <div className="w-2 h-2 rounded-full bg-[#34D399]" />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 600, color: "#0F766E" }}>Mall</span>
          </div>
          <div className="w-0.5 h-3 bg-[#34D399]" />
        </div>

        {/* Office pin */}
        <div className="absolute flex flex-col items-center" style={{ top: "10%", right: "12%", transform: "translateX(50%)" }}>
          <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-md" style={{ boxShadow: "0 2px 10px rgba(15,118,110,0.18)" }}>
            <div className="w-2 h-2 rounded-full bg-[#0F766E]" />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 600, color: "#0F766E" }}>Office</span>
          </div>
          <div className="w-0.5 h-3 bg-[#0F766E]" />
        </div>

        {/* Current location pulse */}
        <div className="absolute" style={{ top: "50%", left: "42%", transform: "translate(-50%, -50%)" }}>
          <div className="absolute w-10 h-10 rounded-full bg-[#0F766E]/15 animate-ping" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          <div className="absolute w-6 h-6 rounded-full bg-[#0F766E]/25" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          <div className="relative w-4 h-4 rounded-full bg-[#0F766E] border-2 border-white shadow-lg" style={{ boxShadow: "0 0 0 3px rgba(15,118,110,0.25)" }} />
        </div>

        {/* Parking availability card */}
        <div
          className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl p-3"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#1E293B" }}>Nearby Parking</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 500, color: "#34D399" }}>Live</span>
          </div>
          <div className="flex gap-2">
            {[
              { name: "SM North", slots: 24, color: "#34D399" },
              { name: "Ayala", slots: 8, color: "#F59E0B" },
              { name: "BGC Tower", slots: 31, color: "#34D399" },
            ].map((loc) => (
              <div key={loc.name} className="flex-1 rounded-xl p-2 text-center" style={{ background: "#F8FAFC" }}>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: loc.color }}>{loc.slots}</div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "8px", fontWeight: 500, color: "#64748B", marginTop: "1px" }}>{loc.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
