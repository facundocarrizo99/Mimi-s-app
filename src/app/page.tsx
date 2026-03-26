"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.push("/couples");
      } else {
        setChecking(false);
      }
    }
    check();
  }, [supabase, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: [0.2, 0, 0, 1] }}
          className="text-2xl font-semibold text-textprimary"
        >
          Ours
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
        className="text-center max-w-md md3-surface p-8"
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--md-sys-color-primary-container)] mx-auto mb-4 grid place-items-center text-2xl">
          ♡
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-textprimary mb-3">Ours</h1>

        <p className="text-textsecondary text-base mb-1">
          A little space for two.
        </p>

        <p className="text-textmuted text-sm mb-8 max-w-xs mx-auto leading-relaxed">
          Seven questions a day, answered together.
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[var(--md-sys-color-primary)] hover:brightness-110 text-[var(--md-sys-color-on-primary)] font-medium shadow-[0_2px_8px_rgba(103,80,164,0.35)] transition-all duration-200"
          >
            Get started
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
