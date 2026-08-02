import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { OnboardingScreen } from "../components/OnboardingScreen";
import { FindParkingIllustration } from "../components/illustrations/FindParkingIllustration";
import { ReserveIllustration } from "../components/illustrations/ReserveIllustration";
import { ParkSmarterIllustration } from "../components/illustrations/ParkSmarterIllustration";

const screens = [
  {
    title: "Find Parking Before You Arrive",
    description: "Search nearby malls, offices, and establishments to view real-time parking availability and avoid unnecessary circling.",
    illustration: <FindParkingIllustration />,
  },
  {
    title: "Reserve in Advance",
    description: "Select your preferred parking area, choose an available slot, and secure your space before leaving for your destination.",
    illustration: <ReserveIllustration />,
  },
  {
    title: "Park Smarter, Save Time",
    description: "Navigate directly to your reserved parking slot and enjoy a smoother parking experience with less waiting and congestion.",
    illustration: <ParkSmarterIllustration />,
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const navigate = useNavigate();

  const goTo = (idx: number) => {
    if (idx === current) return;
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const next = () => {
    if (current < screens.length - 1) goTo(current + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && current < screens.length - 1) goTo(current + 1);
      else if (diff < 0 && current > 0) goTo(current - 1);
    }
    touchStartX.current = null;
  };

  const isLast = current === screens.length - 1;

  return (
    <div
      className="flex flex-col"
      style={{ height: "100%", background: "#FAFAF9" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isLast && (
        <div className="flex justify-end px-6 pt-4 pb-0" style={{ flexShrink: 0 }}>
          <button
            onClick={() => navigate("/auth")}
            style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#64748B", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
          >
            Skip
          </button>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ x: direction >= 0 ? "60%" : "-60%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction >= 0 ? "-60%" : "60%", opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          >
            <OnboardingScreen
              title={screens[current].title}
              description={screens[current].description}
              illustration={screens[current].illustration}
              isActive={true}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8 pt-2 flex flex-col items-center gap-5" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2.5">
          {screens.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goTo(i)}
              animate={{ width: i === current ? 28 : 8, background: i === current ? "#0F766E" : "#CBD5E1" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ height: "8px", borderRadius: "4px", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {isLast ? (
            <motion.button
              key="get-started"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3 }}
              className="w-full flex items-center justify-center gap-2"
              onClick={() => navigate("/auth")}
              style={{ height: "54px", borderRadius: "16px", background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(15,118,110,0.35)", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, color: "#FFFFFF" }}
            >
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </motion.button>
          ) : (
            <motion.button
              key="next"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              onClick={next}
              className="w-full flex items-center justify-center gap-2"
              style={{ height: "54px", borderRadius: "16px", background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(15,118,110,0.30)", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, color: "#FFFFFF" }}
            >
              Next
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </motion.button>
          )}
        </AnimatePresence>

        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 400, color: "#64748B", margin: 0 }}>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")} style={{ color: "#0F766E", fontWeight: 600, cursor: "pointer" }}>Sign In</span>
        </p>
      </div>
    </div>
  );
}
