import { motion } from "motion/react";
import { ReactNode } from "react";

interface OnboardingScreenProps {
  title: string;
  description: string;
  illustration: ReactNode;
  isActive: boolean;
}

export function OnboardingScreen({ title, description, illustration, isActive }: OnboardingScreenProps) {
  return (
    <motion.div
      className="flex flex-col items-center w-full h-full px-6 pt-8 pb-4"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : 40 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Illustration container */}
      <div className="w-full flex items-center justify-center" style={{ height: "340px", flexShrink: 0 }}>
        {illustration}
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center text-center mt-8 gap-4">
        <h1
          className="text-[#1E293B] leading-tight"
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: "28px", letterSpacing: "-0.3px" }}
        >
          {title}
        </h1>
        <p
          className="text-[#64748B] leading-relaxed max-w-[300px]"
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "15px", lineHeight: "1.65" }}
        >
          {description}
        </p>
      </div>
    </motion.div>
  );
}
