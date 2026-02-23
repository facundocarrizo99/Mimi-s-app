"use client";

import { motion } from "framer-motion";

interface HeartPulseProps {
  size?: "sm" | "md" | "lg";
}

export function HeartPulse({ size = "md" }: HeartPulseProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <motion.span
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      className={`inline-block ${sizes[size]}`}
    >
      &#10084;&#65039;
    </motion.span>
  );
}
