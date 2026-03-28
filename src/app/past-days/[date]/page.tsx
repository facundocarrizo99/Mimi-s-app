"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { QuestionCard } from "@/components/daily/QuestionCard";
import { Loading } from "@/components/ui/Loading";
import { formatDate } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor } from "@/lib/questions";
import type {
  DailyQuestionWithDetails,
  Couple,
  QuestionCategory,
} from "@/types/database";

export default function PastDayDetailPage() {
  const [questions, setQuestions] = useState<DailyQuestionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [userId, setUserId] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const date = params.date as string;
  const coupleId = searchParams.get("couple");

  const loadData = useCallback(async () => {
    setLoading(true);

    if (!coupleId) {
      router.push("/couples");
      return;
    }

    const res = await fetch(
      `/api/past-days?couple_id=${coupleId}&date=${date}`,
      { cache: "no-store" }
    );

    if (res.status === 401) {
      router.push("/auth/login");
      return;
    }

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const data = await res.json();

    setUserId(data.currentUserId || "");
    setCouple(data.couple || null);
    setPartnerName(data.partnerName || "");

    if (data.questions) {
      setQuestions(data.questions);
    }

    setLoading(false);
  }, [coupleId, date, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAnswer(dailyQuestionId: string, text: string) {
    const saveRes = await fetch("/api/daily-questions/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_question_id: dailyQuestionId, text }),
    });

    if (!saveRes.ok) return;

    await loadData();
  }

  async function handleFavorite(dailyQuestionId: string) {
    await fetch("/api/daily-questions/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_question_id: dailyQuestionId }),
    });
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === dailyQuestionId
          ? {
              ...q,
              favorites:
                q.favorites.length > 0
                  ? []
                  : [
                      {
                        id: "temp",
                        user_id: userId,
                        daily_question_id: dailyQuestionId,
                        created_at: new Date().toISOString(),
                      },
                    ],
            }
          : q
      )
    );
  }

  if (loading) return <Loading />;

  const allMyAnswered =
    questions.length > 0 &&
    questions.every((q) => q.answers.some((a) => a.user_id === userId));

  const unansweredQuestions = questions.filter(
    (q) => !q.answers.some((a) => a.user_id === userId)
  );
  const answeredQuestions = questions.filter((q) =>
    q.answers.some((a) => a.user_id === userId)
  );

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
            {formatDate(date)}
          </h2>
          {allMyAnswered ? (
            <p className="text-sm text-[var(--status-success)]">
              All questions answered
            </p>
          ) : (
            <p className="text-sm text-textsecondary">
              {unansweredQuestions.length} question
              {unansweredQuestions.length !== 1 ? "s" : ""} waiting for you
            </p>
          )}
        </motion.div>

        {/* Unanswered questions — show answer forms */}
        {unansweredQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-[var(--status-error)]/70 animate-pulse" />
              <p className="text-sm font-medium text-[var(--status-error)]">
                Unanswered
              </p>
            </div>

            {unansweredQuestions.map((q, i) => (
              <QuestionCard
                key={q.id}
                dailyQuestion={q}
                currentUserId={userId}
                index={i}
                onAnswer={handleAnswer}
              />
            ))}
          </motion.div>
        )}

        {/* Divider between unanswered and answered */}
        {unansweredQuestions.length > 0 && answeredQuestions.length > 0 && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-[var(--md-sys-color-outline-variant)]/55" />
            <p className="text-xs text-textmuted">Answered</p>
            <div className="flex-1 h-px bg-[var(--md-sys-color-outline-variant)]/55" />
          </div>
        )}

        {/* Answered questions — show both answers */}
        {answeredQuestions.map((q, i) => {
          const category = q.question?.category as QuestionCategory;
          const myAnswer = q.answers.find((a) => a.user_id === userId);
          const partnerAnswer = q.answers.find(
            (a) => a.user_id !== userId
          );
          const isFavorited = q.favorites.length > 0;

          return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: (unansweredQuestions.length + i) * 0.06,
                  ease: [0.2, 0, 0, 1],
                }}
                className="md3-surface p-6"
              >
              {/* Category badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${getCategoryColor(category)}`}
                >
                  {getCategoryLabel(category)}
                </span>
                <span className="text-textmuted text-xs">
                  {q.position}/7
                </span>
              </div>

              {/* Question */}
              <p className="text-lg font-medium text-textprimary leading-relaxed mb-4">
                {q.question?.text}
              </p>

              <div className="space-y-3">
                {/* My answer */}
                {myAnswer && (
                  <div className="rounded-2xl bg-[var(--md-sys-color-primary-container)]/60 p-4 border border-[var(--md-sys-color-outline-variant)]/40">
                    <p className="text-xs text-textmuted mb-1">You</p>
                    <p className="text-sm text-textprimary leading-relaxed">
                      {myAnswer.text}
                    </p>
                  </div>
                )}

                {/* Partner's answer */}
                {partnerAnswer ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 + 0.2 }}
                      className="rounded-2xl bg-[var(--md-sys-color-secondary-container)]/65 p-4 border border-[var(--md-sys-color-outline-variant)]/40"
                  >
                    <p className="text-xs text-textmuted mb-1">
                      {partnerName || "Them"}
                    </p>
                    <p className="text-sm text-textprimary leading-relaxed">
                      {partnerAnswer.text}
                    </p>
                  </motion.div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-textmuted italic">
                      Waiting for their answer...
                    </p>
                  </div>
                )}

                {/* Favorite button */}
                <div className="flex justify-center pt-1">
                  <button
                    onClick={() => handleFavorite(q.id)}
                    className="text-2xl transition-transform hover:scale-110 active:scale-95"
                    title={
                      isFavorited
                        ? "Remove from favorites"
                        : "Save to favorites"
                    }
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: isFavorited
                          ? "&#10084;&#65039;"
                          : "&#9825;",
                      }}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* All done banner */}
        {allMyAnswered && questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-4"
          >
            <p className="text-2xl mb-2">&#10024;</p>
            <p className="text-sm text-textsecondary">
              You chose each other that day too.
            </p>
          </motion.div>
        )}

        {/* Empty state */}
        {questions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-3xl mb-3">&#128220;</p>
              <p className="text-lg font-medium text-textprimary mb-1">
                No questions for this day
              </p>
            <p className="text-sm text-textsecondary">
              Questions weren&apos;t generated for this date.
            </p>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-4"
        >
          <button
            onClick={() =>
              router.push(`/past-days?couple=${coupleId}`)
            }
            className="text-sm text-textsecondary hover:text-textprimary transition"
          >
            &larr; All past days
          </button>
        </motion.div>
      </div>
    </AppShell>
  );
}
