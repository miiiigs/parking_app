import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AppLogoAnimated } from "../components/AppLogo";

export default function SplashPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = Date.now(), duration = 2600;
    let raf: number;
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick); else navigate("/onboarding");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center" style={{ height: "100%", background: "#FFFFFF" }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }} className="flex flex-col items-center">
        <AppLogoAnimated size={110} />
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }} className="flex flex-col items-center mt-4 gap-1">
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "26px", fontWeight: 700, color: "#0F766E", letterSpacing: "-0.4px" }}>ParkingPH</span>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 400, color: "#94A3B8" }}>Smart Parking Made Easy</span>
        </motion.div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} style={{ position: "absolute", bottom: "72px", left: "48px", right: "48px" }}>
        <div style={{ height: "3px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(to right, #0F766E, #34D399)", borderRadius: "2px", transition: "width 0.08s linear" }} />
        </div>
      </motion.div>
    </div>
  );
}
