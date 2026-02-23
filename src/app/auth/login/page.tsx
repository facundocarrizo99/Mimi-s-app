"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl mb-4"
          >
            &#10084;&#65039;
          </motion.div>
          <h1 className="font-serif text-3xl text-textprimary mb-2">Ours</h1>
          <p className="text-textsecondary text-sm">
            A quiet space for two hearts across distance.
          </p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center rounded-2xl bg-white/70 backdrop-blur-sm p-8 shadow-sm border border-white/50"
          >
            <p className="text-lg text-textprimary mb-2 font-serif">
              Check your inbox
            </p>
            <p className="text-textsecondary text-sm">
              A magic link is on its way to <strong>{email}</strong>.
            </p>
            <p className="text-textmuted text-xs mt-4 italic">
              Your words are safe here.
            </p>
          </motion.div>
        ) : (
          <form
            onSubmit={handleLogin}
            className="rounded-2xl bg-white/70 backdrop-blur-sm p-8 shadow-sm border border-white/50"
          >
            <label className="block mb-1 text-sm text-textsecondary">
              Your email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@example.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 text-textprimary placeholder:text-textmuted focus:outline-none focus:ring-2 focus:ring-rose/30 transition mb-4"
            />

            {error && (
              <p className="text-rose-dark text-sm mb-3">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Sending..." : "Send magic link"}
            </Button>

            <p className="text-textmuted text-xs mt-4 text-center italic">
              This space belongs only to you two.
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
