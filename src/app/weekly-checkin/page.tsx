"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { HeartPulse } from "@/components/ui/HeartPulse";
import { formatDate } from "@/lib/utils";
import type { 
  WeeklyCheckin, 
  WeeklyCheckinAnswer,
  Couple 
} from "@/types/database";

export default function WeeklyCheckinPage() {
  const [checkin, setCheckin] = useState<WeeklyCheckin | null>(null);
  const [answers, setAnswers] = useState<WeeklyCheckinAnswer[]>([]);
  const [myAnswerText, setMyAnswerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [userId, setUserId] = useState("");
  const [weekStartDate, setWeekStartDate] = useState("");
  const [showReveal, setShowReveal] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const coupleId = searchParams.get("couple");
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!coupleId) {
      router.push("/couples");
      return;
    }

    setUserId(user.id);

    // Load couple info
    const { data: coupleDetail } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleId)
      .single();
    
    setCouple(coupleDetail);

    // Load weekly check-in from API
    const res = await fetch(`/api/weekly-checkin?couple_id=${coupleId}`);
    const data = await res.json();

    if (data.checkin) {
      setCheckin(data.checkin);
      setAnswers(data.answers || []);
      setWeekStartDate(data.weekStartDate);
      
      // Pre-fill existing answer
      const myAnswer = data.answers?.find((a: WeeklyCheckinAnswer) => a.user_id === user.id);
      if (myAnswer) {
        setMyAnswerText(myAnswer.answer_text);
      }
    }

    setLoading(false);
  }, [coupleId, router, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit() {
    if (!checkin || !myAnswerText.trim() || !coupleId) return;

    setSubmitting(true);

    const res = await fetch("/api/weekly-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkin_id: checkin.id,
        answer_text: myAnswerText.trim(),
        couple_id: coupleId,
      }),
    });

    const data = await res.json();

    if (data.answer) {
      setAnswers(data.allAnswers || []);
      
      // Check if both answered — trigger reveal animation
      if (data.allAnswers && data.allAnswers.length === 2) {
        setShowReveal(true);
        setTimeout(() => setShowReveal(false), 3000);
      }
    }

    setSubmitting(false);
  }

  if (loading) return <Loading />;

  if (!checkin) {
    return (
      <AppShell streakCount={couple?.streak_count} coupleId={coupleId || undefined}>
        <div className="text-center py-12">
          <p className="text-xl text-textsecondary">
            No weekly check-in available yet.
          </p>
        </div>
      </AppShell>
    );
  }

  const myAnswer = answers.find((a) => a.user_id === userId);
  const partnerAnswer = answers.find((a) => a.user_id !== userId);
  const bothAnswered = answers.length === 2;

  return (
    <AppShell streakCount={couple?.streak_count} coupleId={coupleId || undefined}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--md-sys-color-tertiary-container)] mb-3">
            <span className="text-2xl">📅</span>
            <span className="text-sm font-medium text-textprimary">
              Weekly Check-In
            </span>
          </div>
          <h2 className="text-lg text-textsecondary mb-1">
            Week of {formatDate(weekStartDate)}
          </h2>
          <p className="text-sm text-textsecondary opacity-75">
            A deeper reflection on your week together
          </p>
        </motion.div>

        {/* Heart pulse reveal animation */}
        {showReveal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <HeartPulse size={120} />
            </motion.div>
          </div>
        )}

        {/* Question Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="p-6 space-y-6">
              {/* Question */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">💭</span>
                  <p className="text-xl font-serif text-textprimary leading-relaxed">
                    {checkin.question_text}
                  </p>
                </div>
              </div>

              {/* Answer Input */}
              {!myAnswer && (
                <div className="space-y-3">
                  <textarea
                    value={myAnswerText}
                    onChange={(e) => setMyAnswerText(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="w-full px-4 py-3 bg-white/50 rounded-xl border border-gray-200 focus:border-[var(--md-sys-color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20 text-textprimary placeholder-textsecondary resize-none transition-all"
                    rows={6}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!myAnswerText.trim() || submitting}
                    className="w-full"
                  >
                    {submitting ? "Submitting..." : "Submit Reflection"}
                  </Button>
                </div>
              )}

              {/* My Answer (after submission) */}
              {myAnswer && !bothAnswered && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-textsecondary mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5 text-green-500"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>You answered</span>
                  </div>
                  <div className="p-4 bg-white/30 rounded-xl border border-gray-100">
                    <p className="text-textprimary font-serif leading-relaxed">
                      {myAnswer.answer_text}
                    </p>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-sm text-textsecondary">
                      ⏳ Waiting for your partner...
                    </p>
                  </div>
                </div>
              )}

              {/* Both Answered — Show All Answers */}
              {bothAnswered && (
                <div className="space-y-6">
                  <div className="text-center py-3">
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-3xl mb-2"
                    >
                      💕
                    </motion.p>
                    <p className="text-lg font-medium text-textprimary">
                      Both hearts have spoken
                    </p>
                  </div>

                  {/* My Answer */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-textsecondary">
                        You
                      </span>
                    </div>
                    <div className="p-4 bg-[var(--md-sys-color-primary-container)]/30 rounded-xl border border-[var(--md-sys-color-primary)]/20">
                      <p className="text-textprimary font-serif leading-relaxed">
                        {myAnswer?.answer_text}
                      </p>
                    </div>
                  </motion.div>

                  {/* Partner's Answer */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-textsecondary">
                        Your Partner
                      </span>
                    </div>
                    <div className="p-4 bg-[var(--md-sys-color-secondary-container)]/30 rounded-xl border border-[var(--md-sys-color-secondary)]/20">
                      <p className="text-textprimary font-serif leading-relaxed">
                        {partnerAnswer?.answer_text}
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="p-4 text-center space-y-2">
              <p className="text-sm text-textsecondary">
                💡 Weekly check-ins are available every Sunday
              </p>
              <p className="text-xs text-textsecondary opacity-75">
                Take time each week to reflect on your journey together
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  );
}
