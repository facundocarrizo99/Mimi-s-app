"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";

interface CoupleWithPartner {
  id: string;
  user_1_id: string;
  user_2_id: string | null;
  invite_code: string;
  timezone: string;
  streak_count: number;
  last_streak_date: string | null;
  created_at: string;
  partner: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  today_progress: {
    answered: number;
    total: number;
    date: string;
  };
}

export default function CouplesPage() {
  const [couples, setCouples] = useState<CoupleWithPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function loadCouples() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Get user profile for display name
    const { data: profileData } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setDisplayName(profileData.display_name || "");
    }

    const res = await fetch("/api/couples", { cache: "no-store" });
    const data = await res.json();
    const fetchedCouples: CoupleWithPartner[] = data.couples || [];

    // If user has exactly 1 complete couple, auto-redirect to daily
    const completeCouples = fetchedCouples.filter((c) => c.partner);
    if (completeCouples.length === 1 && fetchedCouples.length === 1) {
      router.push(`/daily?couple=${completeCouples[0].id}`);
      return;
    }

    setCouples(fetchedCouples);
    setLoading(false);
  }

  useEffect(() => {
    loadCouples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    setActionLoading(true);
    setError("");

    const res = await fetch("/api/couple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        display_name: displayName.trim(),
      }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setActionLoading(false);
      return;
    }

    setCreatedCode(data.couple.invite_code);
    setActionLoading(false);
  }

  async function handleJoin() {
    setActionLoading(true);
    setError("");

    const res = await fetch("/api/couple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "join",
        invite_code: inviteCode.trim(),
        display_name: displayName.trim(),
      }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setActionLoading(false);
      return;
    }

    setShowJoin(false);
    setInviteCode("");
    setActionLoading(false);
    loadCouples();
  }

  function handleContinueAfterCreate() {
    setShowCreate(false);
    setCreatedCode("");
    loadCouples();
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--md-sys-color-surface)]/85 border-b border-[var(--md-sys-color-outline-variant)]/45">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-textprimary inline-flex items-center gap-2">
            <span className="inline-grid place-items-center w-8 h-8 rounded-full bg-[var(--md-sys-color-primary-container)] text-base">
              ♡
            </span>
            Ours
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto w-full px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-2"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-textprimary mb-1">
            Your Spaces
          </h2>
          <p className="text-sm text-textsecondary">
            Choose a space to see today&apos;s questions.
          </p>
        </motion.div>

        {/* Couple Cards */}
        {couples.map((couple, i) => (
          <motion.div
            key={couple.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            {couple.partner ? (
              <button
                onClick={() =>
                  router.push(`/daily?couple=${couple.id}`)
                }
                className="w-full text-left"
              >
                <div className="md3-surface p-6 hover:brightness-[1.02] transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">💕</span>
                        <h3 className="text-lg font-medium text-textprimary">
                          {couple.partner.display_name ||
                            couple.partner.email}
                        </h3>
                      </div>

                      {couple.streak_count > 0 && (
                        <p className="text-sm text-textsecondary flex items-center gap-1.5 mt-1">
                          🔥 {couple.streak_count} day
                          {couple.streak_count !== 1 ? "s" : ""} streak
                        </p>
                      )}

                      {couple.today_progress.total > 0 ? (
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[var(--md-sys-color-surface-container-high)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--md-sys-color-primary)] rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    (couple.today_progress.answered /
                                      couple.today_progress.total) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-textmuted">
                              {couple.today_progress.answered}/
                              {couple.today_progress.total}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-textmuted mt-3">
                          No questions yet today — tap to start ✨
                        </p>
                      )}
                    </div>

                    <span className="text-textmuted text-lg mt-1">→</span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="md3-surface p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⏳</span>
                  <h3 className="text-lg font-medium text-textprimary">
                    Waiting for partner...
                  </h3>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-textsecondary mb-2">
                    Share this invite code:
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm tracking-widest text-textprimary bg-[var(--md-sys-color-surface-container-high)] rounded-lg px-3 py-1.5">
                      {couple.invite_code}
                    </div>
                    <button
                      onClick={() => copyCode(couple.invite_code)}
                      className="text-xs px-2 py-1 rounded-lg bg-[var(--md-sys-color-secondary-container)] hover:brightness-105 text-textsecondary transition"
                    >
                      {copied === couple.invite_code ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Empty state */}
        {couples.length === 0 && !showCreate && !showJoin && (
          <Card>
            <div className="text-center py-4">
              <p className="text-2xl mb-3">💫</p>
              <p className="text-lg font-medium text-textprimary mb-1">
                No spaces yet
              </p>
              <p className="text-sm text-textsecondary">
                Create a space or join your partner&apos;s.
              </p>
            </div>
          </Card>
        )}

        {/* Action buttons */}
        {!showCreate && !showJoin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: couples.length * 0.1 + 0.2 }}
            className="flex gap-3"
          >
            <button
              onClick={() => {
                setShowCreate(true);
                setShowJoin(false);
                setError("");
              }}
              className="flex-1 p-4 rounded-2xl bg-[var(--md-sys-color-primary-container)]/70 hover:brightness-105 transition text-center border border-[var(--md-sys-color-outline-variant)]/40"
            >
              <p className="text-sm font-medium text-textprimary">
                New space
              </p>
              <p className="text-xs text-textsecondary mt-0.5">
                Create &amp; invite
              </p>
            </button>
            <button
              onClick={() => {
                setShowJoin(true);
                setShowCreate(false);
                setError("");
              }}
              className="flex-1 p-4 rounded-2xl bg-[var(--md-sys-color-secondary-container)]/70 hover:brightness-105 transition text-center border border-[var(--md-sys-color-outline-variant)]/40"
            >
              <p className="text-sm font-medium text-textprimary">Join</p>
              <p className="text-xs text-textsecondary mt-0.5">
                Enter invite code
              </p>
            </button>
          </motion.div>
        )}

        {/* Create flow */}
        {showCreate && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-textprimary text-center">
                Create a new space
              </h3>

              {!createdCode ? (
                <>
                  <div>
                    <label className="block text-sm text-textsecondary mb-1">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/70 text-textprimary placeholder:text-textmuted transition text-sm"
                    />
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={actionLoading}
                    className="w-full px-4 py-2.5 rounded-full bg-[var(--md-sys-color-primary)] hover:brightness-110 text-white text-sm font-medium transition disabled:opacity-50"
                  >
                    {actionLoading ? "Creating..." : "Create space"}
                  </button>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <p className="text-sm text-textsecondary mb-3">
                    Share this code with your partner:
                  </p>
                   <div className="text-2xl font-mono tracking-widest text-textprimary bg-[var(--md-sys-color-surface-container-high)] rounded-2xl p-4 mb-3">
                    {createdCode}
                  </div>
                  <button
                    onClick={() => copyCode(createdCode)}
                    className="text-sm text-textsecondary hover:text-textprimary transition mb-3 block mx-auto"
                  >
                    {copied === createdCode ? "Copied!" : "Copy code"}
                  </button>
                  <button
                    onClick={handleContinueAfterCreate}
                     className="text-sm text-[var(--md-sys-color-primary)] hover:brightness-110 transition"
                  >
                    Done
                  </button>
                </motion.div>
              )}

              {error && (
                <p className="text-[var(--status-error)] text-sm text-center">{error}</p>
              )}

              {!createdCode && (
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                  className="text-xs text-textmuted hover:text-textsecondary transition block mx-auto"
                >
                  Cancel
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Join flow */}
        {showJoin && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-textprimary text-center">
                Join a space
              </h3>
              <div>
                <label className="block text-sm text-textsecondary mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/70 text-textprimary placeholder:text-textmuted transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-textsecondary mb-1">
                  Invite code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/70 text-textprimary placeholder:text-textmuted transition text-sm font-mono tracking-wider text-center"
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={actionLoading || !inviteCode.trim()}
                className="w-full px-4 py-2.5 rounded-full bg-[var(--md-sys-color-primary)] hover:brightness-110 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {actionLoading ? "Joining..." : "Join"}
              </button>

              {error && (
                <p className="text-[var(--status-error)] text-sm text-center">{error}</p>
              )}

              <button
                onClick={() => {
                  setShowJoin(false);
                  setError("");
                }}
                className="text-xs text-textmuted hover:text-textsecondary transition block mx-auto"
              >
                Cancel
              </button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
