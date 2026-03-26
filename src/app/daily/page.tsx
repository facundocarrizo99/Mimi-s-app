"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { QuestionCard } from "@/components/daily/QuestionCard";
import { MoodSelector } from "@/components/daily/MoodSelector";
import { Loading } from "@/components/ui/Loading";
import { getStreakMessage, formatDate } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor } from "@/lib/questions";
import type {
  DailyQuestionWithDetails,
  Couple,
  QuestionCategory,
} from "@/types/database";

export default function DailyPage() {
  const [questions, setQuestions] = useState<DailyQuestionWithDetails[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [userId, setUserId] = useState("");
  const [currentMood, setCurrentMood] = useState<{
    emoji: string;
    reflection: string | null;
  } | null>(null);

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

    // Couple
    const { data: coupleDetail } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleId)
      .single();
    setCouple(coupleDetail);

    // Questions + answers from API (uses service client, bypasses RLS)
    const res = await fetch(`/api/daily-questions?couple_id=${coupleId}`);
    const data = await res.json();

    if (data.questions) {
      setQuestions(data.questions);
      setDate(data.date);
    }

    // Mood
    if (data.date) {
      const { data: moodRow } = await supabase
        .from("moods")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("mood_date", data.date)
        .eq("user_id", user.id)
        .maybeSingle();

      if (moodRow) {
        setCurrentMood({ emoji: moodRow.emoji, reflection: moodRow.reflection });
      }
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAnswer(dailyQuestionId: string, text: string) {
    // Save answer
    await fetch("/api/daily-questions/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_question_id: dailyQuestionId, text }),
    });

    // Reload everything from API — answers come back via service client
    const res = await fetch(`/api/daily-questions?couple_id=${coupleId}`);
    const data = await res.json();
    if (data.questions) {
      setQuestions(data.questions);
    }

    // Reload couple for streak
    if (coupleId) {
      const { data: coupleDetail } = await supabase
        .from("couples")
        .select("*")
        .eq("id", coupleId)
        .single();
      setCouple(coupleDetail);
    }
  }

  async function handleMood(emoji: string, reflection: string) {
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, reflection, date, couple_id: coupleId }),
    });
    setCurrentMood({ emoji, reflection });
  }

  if (loading) return <Loading />;

  const allMyAnswered =
    questions.length === 7 &&
    questions.every((q) =>
      q.answers.some((a) => a.user_id === userId)
    );

  // Completed view — can't re-answer, just see own answers + link to partner's
  if (allMyAnswered) {
    return (
      <AppShell streakCount={couple?.streak_count} coupleId={coupleId || undefined}>
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-2"
          >
            <h2 className="font-serif text-2xl text-textprimary mb-1">
              {formatDate(date)}
            </h2>
            <p className="text-sm text-textsecondary">
              {getStreakMessage(couple?.streak_count || 0)}
            </p>
          </motion.div>

          {/* Mood selector */}
          <MoodSelector
            date={date}
            currentMood={currentMood || undefined}
            onSubmit={handleMood}
          />

          {/* Completed banner + see partner's answers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.2, 0, 0, 1] }}
            className="text-center py-5 md3-surface"
          >
            <p className="text-3xl mb-3">&#10024;</p>
            <p className="text-xl text-textprimary mb-1 font-medium">
              All done for today
            </p>
            <p className="text-sm text-textsecondary mb-6">
              You answered all 7 questions.
            </p>
            <button
              onClick={() => router.push(`/answers?couple=${coupleId}`)}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[var(--md-sys-color-secondary-container)] hover:brightness-105 text-textprimary font-medium transition-all duration-200"
            >
              <span>💌</span>
              See partner&apos;s answers
            </button>
          </motion.div>

          {/* Read-only answers summary */}
          {questions.map((q, i) => {
            const category = q.question?.category as QuestionCategory;
            const myAnswer = q.answers.find((a) => a.user_id === userId);
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06, ease: [0.2, 0, 0, 1] }}
                className="md3-surface p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getCategoryColor(category)}`}
                  >
                    {getCategoryLabel(category)}
                  </span>
                  <span className="text-textmuted text-xs">{q.position}/7</span>
                </div>
                <p className="text-lg text-textprimary leading-relaxed mb-4 font-medium">
                  {q.question?.text}
                </p>
                <div className="rounded-2xl bg-[var(--md-sys-color-primary-container)]/60 p-4 border border-[var(--md-sys-color-outline-variant)]/40">
                  <p className="text-xs text-textmuted mb-1">You wrote</p>
                  <p className="text-sm text-textprimary leading-relaxed">
                    {myAnswer?.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell streakCount={couple?.streak_count} coupleId={coupleId || undefined}>
      <div className="space-y-5">
        {/* Date & streak */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-2"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-textprimary mb-1">
            {formatDate(date)}
          </h2>
          <p className="text-sm text-textsecondary">
            {getStreakMessage(couple?.streak_count || 0)}
          </p>
        </motion.div>

        {/* Mood selector */}
        <MoodSelector
          date={date}
          currentMood={currentMood || undefined}
          onSubmit={handleMood}
        />

        {/* Questions */}
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            dailyQuestion={q}
            currentUserId={userId}
            index={i}
            onAnswer={handleAnswer}
          />
        ))}
      </div>
    </AppShell>
  );
}
