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
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-2xl font-serif text-textprimary"
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
        transition={{ duration: 0.8 }}
        className="text-center max-w-md"
      >
        <h1 className="font-serif text-4xl text-textprimary mb-3">Ours</h1>

        <p className="text-textsecondary text-lg mb-2 font-serif italic">
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
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-rose/80 hover:bg-rose text-white font-medium shadow-sm hover:shadow transition-all duration-200"
          >
            Get started
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
