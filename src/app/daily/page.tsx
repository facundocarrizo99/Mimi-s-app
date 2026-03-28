"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  const inFlightKeyRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    if (!coupleId) {
      router.push("/couples");
      setLoading(false);
      return;
    }

    if (inFlightKeyRef.current === coupleId) {
      return;
    }

    inFlightKeyRef.current = coupleId;
    setLoading(true);

    try {
      const questionsResponse = await fetch(`/api/daily-questions?couple_id=${coupleId}`, {
        cache: "no-store",
      });

      if (questionsResponse.status === 401) {
        router.push("/auth/login");
        return;
      }

      if (questionsResponse.status === 403 || questionsResponse.status === 404) {
        router.push("/couples");
        return;
      }

      if (!questionsResponse.ok) {
        console.error("Failed to load daily questions", {
          status: questionsResponse.status,
          statusText: questionsResponse.statusText,
        });
        return;
      }

      const data = await questionsResponse.json();
      if (!data || data.error) {
        console.error("Daily questions API returned an invalid payload", data);
        return;
      }

      setUserId(data.currentUserId || "");
      setCouple(data.couple ?? null);

      if (data.questions) {
        setQuestions(data.questions);
        setDate(data.date);
      }
      setCurrentMood(data.currentMood ?? null);
    } catch (error) {
      console.error("Failed to load daily page data", error);
    } finally {
      if (inFlightKeyRef.current === coupleId) {
        inFlightKeyRef.current = null;
      }
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAnswer(dailyQuestionId: string, text: string) {
    // Save answer
    const saveResponse = await fetch("/api/daily-questions/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_question_id: dailyQuestionId, text }),
    });

    if (!saveResponse.ok) {
      console.error("Failed to save answer", {
        status: saveResponse.status,
        statusText: saveResponse.statusText,
      });
      return;
    }

    if (coupleId) {
      try {
        const questionsResponse = await fetch(`/api/daily-questions?couple_id=${coupleId}`, {
          cache: "no-store",
        });

        if (questionsResponse.status === 401) {
          router.push("/auth/login");
          return;
        }

        if (questionsResponse.status === 403 || questionsResponse.status === 404) {
          router.push("/couples");
          return;
        }

        if (questionsResponse.ok) {
          const data = await questionsResponse.json();
          if (data?.questions) {
            setQuestions(data.questions);
          }
          if (data?.couple) {
            setCouple(data.couple);
          }
          if (data?.currentMood !== undefined) {
            setCurrentMood(data.currentMood ?? null);
          }
          if (data?.currentUserId) {
            setUserId(data.currentUserId);
          }
          if (data?.date) {
            setDate(data.date);
          }
        } else {
          console.error("Failed to refresh daily questions", {
            status: questionsResponse.status,
            statusText: questionsResponse.statusText,
          });
        }
      } catch (error) {
        console.error("Failed to refresh daily page after answer", error);
      }
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                className="w-5 h-5"
                fill="currentColor"
                aria-hidden
              >
                <path d="M480-388q51-47 82.5-77.5T611-518q17-22 23-38.5t6-35.5q0-36-26-62t-62-26q-21 0-40.5 8.5T480-648q-12-15-31-23.5t-41-8.5q-36 0-62 26t-26 62q0 19 5.5 35t22.5 38q17 22 48 52.5t84 78.5ZM200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z" />
              </svg>
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
