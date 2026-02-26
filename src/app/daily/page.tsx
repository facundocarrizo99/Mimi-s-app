"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [needsSetup, setNeedsSetup] = useState(false);
  const [currentMood, setCurrentMood] = useState<{
    emoji: string;
    reflection: string | null;
  } | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    // Get profile and couple info
    const coupleRes = await fetch("/api/couple");
    const coupleData = await coupleRes.json();

    if (!coupleData.user?.couple_id) {
      setNeedsSetup(true);
      setProfile(coupleData.user);
      setLoading(false);
      return;
    }

    setNeedsSetup(false);
    setProfile(coupleData.user);

    // Get couple details
    const { data: coupleDetail } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleData.user.couple_id)
      .single();

    setCouple(coupleDetail);

    // Get today's questions
    const questionsRes = await fetch("/api/daily-questions");
    const questionsData = await questionsRes.json();

    if (questionsData.questions) {
      setQuestions(questionsData.questions);
      setDate(questionsData.date);
    }

    // Get today's mood
    if (questionsData.date) {
      const moodRes = await fetch(`/api/mood?date=${questionsData.date}`);
      const moodData = await moodRes.json();
      const myMood = moodData.moods?.find(
        (m: { user_id: string }) => m.user_id === user.id
      );
      if (myMood) {
        setCurrentMood({ emoji: myMood.emoji, reflection: myMood.reflection });
      }
    }

    setLoading(false);
  }, [supabase]);

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
    const questionsRes = await fetch("/api/daily-questions");
    const questionsData = await questionsRes.json();
    if (questionsData.questions) {
      setQuestions(questionsData.questions);
    }
    // Reload couple for streak
    if (profile?.couple_id) {
      const { data: coupleDetail } = await supabase
        .from("couples")
        .select("*")
        .eq("id", profile.couple_id)
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
      body: JSON.stringify({ emoji, reflection, date }),
    });
    setCurrentMood({ emoji, reflection });
  }

  if (loading) return <Loading />;

  if (needsSetup) {
    return <SetupFlow profile={profile} onComplete={loadData} />;
  }

  const allBothAnswered =
    questions.length === 7 &&
    questions.every((q) => q.answers.length >= 2);

  return (
    <AppShell streakCount={couple?.streak_count}>
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

// ============================================================
// Setup Flow — Create or Join a Couple Space
// ============================================================

function SetupFlow({
  profile,
  onComplete,
}: {
  profile: User | null;
  onComplete: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/couple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", display_name: displayName.trim() }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setCreatedCode(data.couple.invite_code);
    setLoading(false);
  }

  async function handleJoin() {
    setLoading(true);
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
      setLoading(false);
      return;
    }

    onComplete();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl text-textprimary mb-1">
            Welcome
          </h1>
          <p className="text-textsecondary text-sm">
            Let&apos;s get you set up.
          </p>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-white/50 space-y-4">
          {/* Display name */}
          <div>
            <label className="block text-sm text-textsecondary mb-1">
              Your name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-textprimary placeholder:text-textmuted focus:outline-none focus:ring-2 focus:ring-rose/30 transition text-sm"
            />
          </div>

          {mode === "choose" && (
            <div className="space-y-3 pt-2">
              <button
                onClick={() => setMode("create")}
                className="w-full text-left p-4 rounded-xl bg-blush/30 hover:bg-blush/50 transition"
              >
                <p className="text-sm font-medium text-textprimary">
                  Create a new space
                </p>
                <p className="text-xs text-textsecondary mt-0.5">
                  Get an invite code to share with your partner
                </p>
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full text-left p-4 rounded-xl bg-lavender/30 hover:bg-lavender/50 transition"
              >
                <p className="text-sm font-medium text-textprimary">
                  Join your partner&apos;s space
                </p>
                <p className="text-xs text-textsecondary mt-0.5">
                  Enter the invite code they shared
                </p>
              </button>
            </div>
          )}

          {mode === "create" && !createdCode && (
            <div className="pt-2">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl bg-rose/80 hover:bg-rose text-white text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create space"}
              </button>
            </div>
          )}

          {mode === "create" && createdCode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center pt-2"
            >
              <p className="text-sm text-textsecondary mb-3">
                Share this code with your partner:
              </p>
              <div className="text-2xl font-mono tracking-widest text-textprimary bg-white/50 rounded-xl p-4 mb-3">
                {createdCode}
              </div>
              <button
                onClick={onComplete}
                className="mt-4 text-sm text-rose-dark hover:text-rose transition"
              >
                They&apos;ve joined &mdash; continue
              </button>
            </motion.div>
          )}

          {mode === "join" && (
            <div className="space-y-3 pt-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
                className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-textprimary placeholder:text-textmuted focus:outline-none focus:ring-2 focus:ring-rose/30 transition text-sm font-mono tracking-wider text-center"
              />
              <button
                onClick={handleJoin}
                disabled={loading || !inviteCode.trim()}
                className="w-full px-4 py-2.5 rounded-xl bg-rose/80 hover:bg-rose text-white text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join"}
              </button>
            </div>
          )}

          {error && (
            <p className="text-rose-dark text-sm text-center">{error}</p>
          )}

          {mode !== "choose" && !createdCode && (
            <button
              onClick={() => setMode("choose")}
              className="text-xs text-textmuted hover:text-textsecondary transition block mx-auto"
            >
              Back
            </button>
          )}
        </div>

        <p className="text-textmuted text-xs text-center mt-4">
          Just you two.
        </p>
      </motion.div>
    </div>
  );
}
