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
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-[var(--md-sys-color-primary-container)] mx-auto mb-3 grid place-items-center text-xl">
            ♡
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-textprimary mb-2">Ours</h1>
          <p className="text-textsecondary text-sm">
            A little space for two.
          </p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center md3-surface p-8"
          >
            <p className="text-lg text-textprimary mb-2 font-medium">
              Check your inbox
            </p>
            <p className="text-textsecondary text-sm">
              A magic link is on its way to <strong>{email}</strong>.
            </p>
          </motion.div>
        ) : (
          <form
            onSubmit={handleLogin}
            className="md3-surface p-8"
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
              className="w-full px-4 py-3 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/70 text-textprimary placeholder:text-textmuted transition mb-4"
            />

            {error && (
              <p className="text-[var(--status-error)] text-sm mb-3">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Sending..." : "Send magic link"}
            </Button>

            <p className="text-xs text-textmuted text-center mt-3">
              You can add and use passkeys from Settings after signing in.
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
