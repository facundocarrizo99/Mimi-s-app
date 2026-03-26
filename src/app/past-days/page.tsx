"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Loading } from "@/components/ui/Loading";
import { formatDate } from "@/lib/utils";
import type { Couple } from "@/types/database";

interface PastDate {
  date: string;
  totalQuestions: number;
  myAnswerCount: number;
  partnerAnswerCount: number;
  isToday: boolean;
  isComplete: boolean;
}

export default function PastDaysPage() {
  const [dates, setDates] = useState<PastDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);

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

    // Couple info for streak
    const { data: coupleDetail } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleId)
      .single();
    setCouple(coupleDetail);

    // Fetch past dates
    const res = await fetch(`/api/past-days?couple_id=${coupleId}`);
    const data = await res.json();

    if (data.dates) {
      setDates(data.dates);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loading />;

  const pastDates = dates.filter((d) => !d.isToday);
  const unansweredDates = pastDates.filter((d) => !d.isComplete);
  const completedDates = pastDates.filter((d) => d.isComplete);

  return (
    <AppShell
      streakCount={couple?.streak_count}
      coupleId={coupleId || undefined}
    >
      <div className="space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-2"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-textprimary mb-1">
            Past Days
          </h2>
          <p className="text-sm text-textsecondary">
            Revisit your questions and fill in what you missed.
          </p>
        </motion.div>

        {/* Unanswered section */}
        {unansweredDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium text-rose-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose/70 animate-pulse" />
              Waiting for your words
            </h3>

            {unansweredDates.map((d, i) => (
              <motion.button
                key={d.date}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                onClick={() =>
                  router.push(
                    `/past-days/${d.date}?couple=${coupleId}`
                  )
                }
                className="w-full text-left md3-surface p-5 hover:brightness-[1.02] transition-all duration-200 group border-[var(--md-sys-color-primary)]/25"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium text-textprimary group-hover:text-rose-dark transition-colors">
                      {formatDate(d.date)}
                    </p>
                    <p className="text-xs text-textsecondary mt-1">
                      {d.myAnswerCount} of {d.totalQuestions} answered
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Progress indicator */}
                    <div className="flex gap-1">
                      {Array.from({ length: d.totalQuestions }).map((_, qi) => (
                        <div
                          key={qi}
                          className={`w-1.5 h-1.5 rounded-full ${
                            qi < d.myAnswerCount
                              ? "bg-[var(--md-sys-color-primary)]"
                              : "bg-[var(--md-sys-color-outline-variant)]/50"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-textsecondary group-hover:text-rose-dark transition-colors text-sm">
                      &rarr;
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Completed section */}
        {completedDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium text-textsecondary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Completed
            </h3>

            {completedDates.map((d, i) => (
              <motion.button
                key={d.date}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                onClick={() =>
                  router.push(
                    `/past-days/${d.date}?couple=${coupleId}`
                  )
                }
                className="w-full text-left md3-surface p-5 hover:brightness-[1.02] transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium text-textprimary">
                      {formatDate(d.date)}
                    </p>
                    <p className="text-xs text-textmuted mt-1">
                      All {d.totalQuestions} answered
                      {d.partnerAnswerCount === d.totalQuestions
                        ? " — both of you"
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {Array.from({ length: d.totalQuestions }).map((_, qi) => (
                        <div
                          key={qi}
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400/70"
                        />
                      ))}
                    </div>
                    <span className="text-textmuted group-hover:text-textsecondary transition-colors text-sm">
                      &rarr;
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {pastDates.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-3xl mb-3">&#128220;</p>
              <p className="text-lg font-medium text-textprimary mb-1">
                No past days yet
              </p>
            <p className="text-sm text-textsecondary">
              Come back tomorrow to see today&apos;s questions here.
            </p>
          </motion.div>
        )}

        {/* Back to today */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-4"
        >
          <button
            onClick={() => router.push(`/daily?couple=${coupleId}`)}
            className="text-sm text-textsecondary hover:text-textprimary transition"
          >
            &larr; Back to today
          </button>
        </motion.div>
      </div>
    </AppShell>
  );
}
