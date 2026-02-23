"use client";

import { motion } from "framer-motion";
import { getPoeticsLoadingMessage } from "@/lib/utils";
import { useState, useEffect } from "react";

export function Loading() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(getPoeticsLoadingMessage());
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-4xl mb-6"
        >
          &#10084;
        </motion.div>
        <p className="text-textsecondary font-serif italic text-lg">
          {message}
        </p>
      </motion.div>
    </div>
  );
}
