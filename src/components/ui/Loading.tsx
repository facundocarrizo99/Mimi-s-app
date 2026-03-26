"use client";

import { motion } from "framer-motion";

export function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center md3-surface px-8 py-7 min-w-52"
      >
        <motion.div
          aria-hidden
          className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-[var(--md-sys-color-outline-variant)] border-t-[var(--md-sys-color-primary)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: [0.2, 0, 0, 1] }}
          className="text-base text-textsecondary"
        >
          Loading…
        </motion.div>
      </motion.div>
    </div>
  );
}
