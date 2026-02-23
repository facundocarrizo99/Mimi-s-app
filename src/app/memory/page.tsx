"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { getCategoryLabel, getCategoryColor } from "@/lib/questions";
import { formatDate } from "@/lib/utils";
import type { QuestionCategory, Couple, Answer } from "@/types/database";

interface MemoryEntry {
  id: string;
  question_date: string;
  position: number;
  question: { text: string; category: QuestionCategory };
  answers: Answer[];
  favorites: { id: string; user_id: string }[];
}

type FilterType = "all" | "favorites" | QuestionCategory;

export default function MemoryPage() {
  const [entries, setEntries] = useState<Record<string, MemoryEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [couple, setCouple] = useState<Couple | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [onThisDay, setOnThisDay] = useState<MemoryEntry[]>([]);

  const supabase = createClient();

  const loadMemories = useCallback(
    async (filterVal: FilterType = "all", searchVal: string = "") => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("couple_id")
        .eq("id", user.id)
        .single();

      if (profile?.couple_id) {
        const { data: coupleData } = await supabase
          .from("couples")
          .select("*")
          .eq("id", profile.couple_id)
          .single();
        setCouple(coupleData);
      }

      const params = new URLSearchParams();
      if (filterVal !== "all") params.set("filter", filterVal);
      if (searchVal) params.set("search", searchVal);

      const res = await fetch(`/api/memory?${params.toString()}`);
      const data = await res.json();

      setEntries(data.entries || {});
      setOnThisDay(data.onThisDay || []);
      setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  function handleFilterChange(f: FilterType) {
    setFilter(f);
    setLoading(true);
    loadMemories(f, search);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    loadMemories(filter, search);
  }

  async function handleFavorite(dailyQuestionId: string) {
    await fetch("/api/daily-questions/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_question_id: dailyQuestionId }),
    });
    loadMemories(filter, search);
  }

  if (loading) return <Loading />;

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "favorites", label: "Favorites" },
    { value: "deep", label: "Deep" },
    { value: "romantic", label: "Romantic" },
    { value: "playful", label: "Playful" },
    { value: "future", label: "Future" },
    { value: "memory", label: "Memory" },
    { value: "wildcard", label: "Wildcard" },
  ];

  const dates = Object.keys(entries).sort((a, b) => b.localeCompare(a));

  return (
    <AppShell streakCount={couple?.streak_count}>
      <div className="space-y-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-2"
        >
          <h2 className="font-serif text-2xl text-textprimary mb-1">
            Memory Book
          </h2>
          <p className="text-sm text-textsecondary">
            Every word, kept safe.
          </p>
        </motion.div>

        {/* Search */}
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your memories..."
            className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-sm text-textprimary placeholder:text-textmuted focus:outline-none focus:ring-2 focus:ring-rose/30 transition"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f.value
                  ? "bg-rose/70 text-white"
                  : "bg-white/50 text-textsecondary hover:bg-white/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* On This Day */}
        {onThisDay.length > 0 && (
          <Card className="border-l-4 border-l-lavender-dark">
            <p className="text-sm font-medium text-textprimary mb-2">
              On this day...
            </p>
            {onThisDay.slice(0, 3).map((entry) => (
              <div key={entry.id} className="mb-3 last:mb-0">
                <p className="text-xs text-textmuted mb-1">
                  {formatDate(entry.question_date)}
                </p>
                <p className="text-sm text-textsecondary italic font-serif">
                  &ldquo;{entry.question?.text}&rdquo;
                </p>
                {entry.answers?.map((a: Answer) => (
                  <p
                    key={a.id}
                    className="text-xs text-textmuted mt-1 pl-3 border-l-2 border-blush-dark/30"
                  >
                    {a.text}
                  </p>
                ))}
              </div>
            ))}
          </Card>
        )}

        {/* Timeline */}
        <AnimatePresence>
          {dates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-textsecondary font-serif italic">
                Your story is just beginning.
              </p>
            </motion.div>
          ) : (
            dates.map((date) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-medium text-textsecondary sticky top-14 bg-transparent backdrop-blur-sm py-1 z-10">
                  {formatDate(date)}
                </h3>

                {entries[date].map((entry) => (
                  <MemoryCard
                    key={entry.id}
                    entry={entry}
                    currentUserId={currentUserId}
                    onFavorite={handleFavorite}
                  />
                ))}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

function MemoryCard({
  entry,
  currentUserId,
  onFavorite,
}: {
  entry: MemoryEntry;
  currentUserId: string;
  onFavorite: (id: string) => void;
}) {
  const category = entry.question?.category as QuestionCategory;
  const myAnswer = entry.answers?.find((a) => a.user_id === currentUserId);
  const partnerAnswer = entry.answers?.find(
    (a) => a.user_id !== currentUserId
  );
  const isFavorited = entry.favorites?.some(
    (f) => f.user_id === currentUserId
  );

  return (
    <div className="rounded-2xl bg-white/60 backdrop-blur-sm p-5 border border-white/40 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(category)}`}
        >
          {getCategoryLabel(category)}
        </span>
        <button
          onClick={() => onFavorite(entry.id)}
          className="text-lg transition-transform hover:scale-110"
        >
          <span
            dangerouslySetInnerHTML={{
              __html: isFavorited ? "&#10084;&#65039;" : "&#9825;",
            }}
          />
        </button>
      </div>

      <p className="font-serif text-base text-textprimary mb-4 leading-relaxed">
        {entry.question?.text}
      </p>

      <div className="space-y-2">
        {myAnswer && (
          <div className="rounded-xl bg-blush/20 p-3">
            <p className="text-xs text-textmuted mb-0.5">You</p>
            <p className="text-sm text-textprimary">{myAnswer.text}</p>
          </div>
        )}
        {partnerAnswer && (
          <div className="rounded-xl bg-lavender/20 p-3">
            <p className="text-xs text-textmuted mb-0.5">Your love</p>
            <p className="text-sm text-textprimary">{partnerAnswer.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
