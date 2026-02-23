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
        router.push("/daily");
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
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-4xl"
        >
          &#10084;&#65039;
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
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl mb-6"
        >
          &#10084;&#65039;
        </motion.div>

        <h1 className="font-serif text-4xl text-textprimary mb-3">Ours</h1>

        <p className="text-textsecondary text-lg mb-2 font-serif italic">
          A quiet space for two hearts across distance.
        </p>

        <p className="text-textmuted text-sm mb-8 max-w-xs mx-auto leading-relaxed">
          Seven questions every day. Two people choosing each other.
          A love letter that writes itself, one answer at a time.
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
            Enter your space
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-textmuted text-xs mt-6 italic"
        >
          This space belongs only to you two.
        </motion.p>
      </motion.div>
    </div>
  );
}
