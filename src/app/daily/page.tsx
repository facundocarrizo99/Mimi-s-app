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
import type { DailyQuestionWithDetails, Couple, User } from "@/types/database";

export default function DailyPage() {
  const [questions, setQuestions] = useState<DailyQuestionWithDetails[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
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

    // Get profile info
    const coupleRes = await fetch("/api/couple");
    const coupleData = await coupleRes.json();
    setProfile(coupleData.user);

    // Get couple details
    const { data: coupleDetail } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleId)
      .single();

    setCouple(coupleDetail);

    // Get today's questions for this couple
    const questionsRes = await fetch(`/api/daily-questions?couple_id=${coupleId}`);
    const questionsData = await questionsRes.json();

    if (questionsData.questions) {
      setQuestions(questionsData.questions);
      setDate(questionsData.date);
    }

    // Get today's mood
    if (questionsData.date) {
      const moodRes = await fetch(`/api/mood?date=${questionsData.date}&couple_id=${coupleId}`);
      const moodData = await moodRes.json();
      const myMood = moodData.moods?.find(
        (m: { user_id: string }) => m.user_id === user.id
      );
      if (myMood) {
        setCurrentMood({ emoji: myMood.emoji, reflection: myMood.reflection });
      }
    }

    setLoading(false);
  }, [supabase, coupleId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAnswer(dailyQuestionId: string, text: string) {
    await fetch("/api/daily-questions/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_question_id: dailyQuestionId, text }),
    });
    // Reload to get updated answers
    const questionsRes = await fetch(`/api/daily-questions?couple_id=${coupleId}`);
    const questionsData = await questionsRes.json();
    if (questionsData.questions) {
      setQuestions(questionsData.questions);
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

  async function handleFavorite(dailyQuestionId: string) {
    await fetch("/api/daily-questions/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_question_id: dailyQuestionId }),
    });
    // Update local state
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
                        user_id: profile?.id || "",
                        daily_question_id: dailyQuestionId,
                        created_at: new Date().toISOString(),
                      },
                    ],
            }
          : q
      )
    );
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

  const allBothAnswered =
    questions.length === 7 &&
    questions.every((q) => q.answers.length >= 2);

  return (
    <AppShell streakCount={couple?.streak_count} coupleId={coupleId || undefined}>
      <div className="space-y-5">
        {/* Date & streak */}
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

        {/* Questions */}
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            dailyQuestion={q}
            currentUserId={profile?.id || ""}
            index={i}
            onAnswer={handleAnswer}
            onFavorite={handleFavorite}
          />
        ))}

        {/* Completion message */}
        {allBothAnswered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center py-8"
          >
            <p className="text-2xl mb-3">&#10024;</p>
            <p className="font-serif text-lg text-textprimary">
              All done for today.
            </p>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
