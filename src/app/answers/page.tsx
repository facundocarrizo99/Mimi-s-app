"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { getCategoryLabel, getCategoryColor } from "@/lib/questions";
import { formatDate } from "@/lib/utils";
import type {
  DailyQuestionWithDetails,
  QuestionCategory,
  Couple,
} from "@/types/database";

export default function AnswersPage() {
  const [questions, setQuestions] = useState<DailyQuestionWithDetails[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [notReady, setNotReady] = useState(false);

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

    setCurrentUserId(user.id);

    // Get couple details
    const { data: coupleDetail } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleId)
      .single();

    setCouple(coupleDetail);

    // Get partner name
    const coupleRes = await fetch("/api/couples");
    const coupleData = await coupleRes.json();
    const thisCpl = (coupleData.couples || []).find(
      (c: { id: string }) => c.id === coupleId
    );
    if (thisCpl?.partner) {
      setPartnerName(thisCpl.partner.display_name || thisCpl.partner.email);
    }

    // Get today's questions
    const questionsRes = await fetch(
      `/api/daily-questions?couple_id=${coupleId}`
    );
    const questionsData = await questionsRes.json();

    if (questionsData.questions) {
      const qs: DailyQuestionWithDetails[] = questionsData.questions;

      // Check if user has answered all questions
      const myAnswerCount = qs.filter((q) =>
        q.answers.some((a) => a.user_id === user.id)
      ).length;

      if (myAnswerCount < qs.length) {
        setNotReady(true);
        setLoading(false);
        return;
      }

      setQuestions(qs);
      setDate(questionsData.date);
    }

    setLoading(false);
  }, [supabase, coupleId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
                        user_id: currentUserId,
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

  if (notReady) {
    return (
      <AppShell
        streakCount={couple?.streak_count}
        coupleId={coupleId || undefined}
      >
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-3xl mb-4">✏️</p>
            <h2 className="font-serif text-xl text-textprimary mb-2">
              Answer first
            </h2>
            <p className="text-sm text-textsecondary mb-6 max-w-xs">
              You need to answer all 7 questions before you can see your
              partner&apos;s replies.
            </p>
            <button
              onClick={() => router.push(`/daily?couple=${coupleId}`)}
              className="px-6 py-2.5 rounded-xl bg-rose/80 hover:bg-rose text-white text-sm font-medium transition"
            >
              Go answer
            </button>
          </motion.div>
        </div>
      </AppShell>
    );
  }

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
          <h2 className="font-serif text-2xl text-textprimary mb-1">
            {formatDate(date)}
          </h2>
          <p className="text-sm text-textsecondary">
            Your answers &amp; {partnerName ? `${partnerName}'s` : "theirs"}
          </p>
        </motion.div>

        {/* Questions with both answers */}
        {questions.map((q, i) => {
          const category = q.question?.category as QuestionCategory;
          const myAnswer = q.answers.find((a) => a.user_id === currentUserId);
          const partnerAnswer = q.answers.find(
            (a) => a.user_id !== currentUserId
          );
          const isFavorited = q.favorites.length > 0;

          return (
            <Card key={q.id} delay={i * 0.08}>
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
              <p className="font-serif text-lg text-textprimary leading-relaxed mb-4">
                {q.question?.text}
              </p>

              <div className="space-y-3">
                {/* My answer */}
                {myAnswer && (
                  <div className="rounded-xl bg-blush/30 p-4">
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
                    className="rounded-xl bg-lavender/30 p-4"
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
                      Waiting for their answer…
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
            </Card>
          );
        })}

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-4"
        >
          <button
            onClick={() => router.push(`/daily?couple=${coupleId}`)}
            className="text-sm text-textsecondary hover:text-textprimary transition"
          >
            ← Back to today&apos;s questions
          </button>
        </motion.div>
      </div>
    </AppShell>
  );
}
