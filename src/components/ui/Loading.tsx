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
        <div className="text-2xl mb-2" aria-hidden>
          💗
        </div>
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
