"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { getCategoryLabel, getCategoryColor } from "@/lib/questions";
import type { Couple } from "@/types/database";

interface MonthlySummaryData {
  month: string;
  stats: {
    totalAnswers: number;
    totalPossibleAnswers: number;
    completionRate: number;
    daysCompleted: number;
    streakCount: number;
    weeklyCheckinsCompleted: number;
  };
  favoriteMoments: Array<{
    question: string;
    category: string;
    date: string;
    answers: Array<{ user_id: string; text: string }>;
  }>;
  moodTrends: {
    topMoods: Array<{ emoji: string; count: number }>;
    dailyMoods: Array<{ emoji: string; mood_date: string; user_id: string }>;
  };
  categoryDistribution: Array<{ category: string; count: number }>;
}

export default function MonthlySummaryPage() {
  const [summary, setSummary] = useState<MonthlySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const coupleId = searchParams.get("couple");
  const monthParam = searchParams.get("month");

  const loadData = useCallback(async () => {
    const supabase = createClient();
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

    // Load couple info
    const { data: coupleDetail } = await supabase
      .from("couples")
      .select("*")
      .eq("id", coupleId)
      .single();
    
    setCouple(coupleDetail);

    // Determine which month to show (default to current month)
    const month = monthParam || getCurrentMonth();
    setSelectedMonth(month);

    // Generate available months (last 12 months)
    const months = generateAvailableMonths(12);
    setAvailableMonths(months);

    // Load summary data
    const res = await fetch(`/api/monthly-summary?couple_id=${coupleId}&month=${month}`);
    
    if (!res.ok) {
      console.error("Failed to load summary:", res.status);
      setLoading(false);
      return;
    }

    const data = await res.json();

    if (!data.error) {
      setSummary(data);
    }

    setLoading(false);
  }, [coupleId, monthParam, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleMonthChange(newMonth: string) {
    router.push(`/monthly-summary?couple=${coupleId}&month=${newMonth}`);
  }

  if (loading) return <Loading />;

  if (!summary) {
    return (
      <AppShell streakCount={couple?.streak_count} coupleId={coupleId || undefined}>
        <div className="text-center py-12">
          <p className="text-xl text-textsecondary">
            No data available for this month.
          </p>
        </div>
      </AppShell>
    );
  }

  const { stats, favoriteMoments, moodTrends, categoryDistribution } = summary;

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
            <span className="text-2xl">📊</span>
            <span className="text-sm font-medium text-textprimary">
              Monthly Summary
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-textprimary mb-2">
            {formatMonthName(selectedMonth)}
          </h1>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/50 border border-gray-200 text-textprimary text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={() => router.push(`/daily?couple=${coupleId}`)}
              className="px-4 py-2 rounded-lg bg-[var(--md-sys-color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Today's Questions
            </button>
            <button
              onClick={() => router.push(`/past-days?couple=${coupleId}`)}
              className="px-4 py-2 rounded-lg bg-[var(--md-sys-color-secondary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Past Days
            </button>
          </div>
        </motion.div>

        {/* Key Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <Card>
            <div className="p-5 text-center space-y-1">
              <p className="text-3xl font-bold text-[var(--md-sys-color-primary)]">
                {stats.completionRate}%
              </p>
              <p className="text-xs text-textsecondary">Completion Rate</p>
              <p className="text-xs text-textsecondary opacity-60">
                {stats.totalAnswers} / {stats.totalPossibleAnswers} answers
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-5 text-center space-y-1">
              <p className="text-3xl font-bold text-[var(--md-sys-color-secondary)]">
                {stats.daysCompleted}
              </p>
              <p className="text-xs text-textsecondary">Days Completed</p>
              <p className="text-xs text-textsecondary opacity-60">
                Both answered all 7
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-5 text-center space-y-1">
              <p className="text-3xl">🔥</p>
              <p className="text-lg font-semibold text-textprimary">
                {stats.streakCount} days
              </p>
              <p className="text-xs text-textsecondary">Current Streak</p>
            </div>
          </Card>

          <Card>
            <div className="p-5 text-center space-y-1">
              <p className="text-3xl">📅</p>
              <p className="text-lg font-semibold text-textprimary">
                {stats.weeklyCheckinsCompleted}
              </p>
              <p className="text-xs text-textsecondary">Weekly Check-Ins</p>
            </div>
          </Card>
        </motion.div>

        {/* Mood Trends */}
        {moodTrends.topMoods.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-textprimary flex items-center gap-2">
                  <span>💭</span>
                  Mood Trends
                </h3>
                <div className="space-y-3">
                  {moodTrends.topMoods.map(({ emoji, count }, idx) => {
                    const totalMoods = moodTrends.dailyMoods.length || 1;
                    const percentage = (count / totalMoods) * 100;
                    
                    return (
                      <div key={emoji} className="flex items-center gap-3">
                        <span className="text-2xl">{emoji}</span>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + idx * 0.1 }}
                              className="h-full bg-[var(--md-sys-color-primary)]"
                            />
                          </div>
                        </div>
                        <span className="text-sm text-textsecondary font-medium">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Category Distribution */}
        {categoryDistribution.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-textprimary flex items-center gap-2">
                  <span>🎯</span>
                  Most Discussed Topics
                </h3>
                <div className="space-y-3">
                  {categoryDistribution.slice(0, 5).map(({ category, count }, idx) => (
                    <div key={category} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(category as any) }}
                      />
                      <span className="text-sm font-medium text-textprimary flex-1">
                        {getCategoryLabel(category as any)}
                      </span>
                      <span className="text-sm text-textsecondary">
                        {count} answers
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Favorite Moments */}
        {favoriteMoments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-textprimary flex items-center gap-2">
                  <span>💖</span>
                  Favorite Moments
                </h3>
                <div className="space-y-4">
                  {favoriteMoments.map((moment, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-sm font-serif text-textprimary">
                        {moment.question}
                      </p>
                      <p className="text-xs text-textsecondary">
                        {formatDate(moment.date)} • {getCategoryLabel(moment.category as any)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Celebration Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <div className="p-6 text-center space-y-3">
              <p className="text-4xl">✨</p>
              <p className="text-lg font-serif text-textprimary">
                {getCelebrationMessage(stats.completionRate, stats.daysCompleted)}
              </p>
              <p className="text-sm text-textsecondary">
                Keep nurturing your connection, one question at a time.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  );
}

// Helper functions
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function generateAvailableMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  
  return months;
}

function formatMonthName(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric"
  });
}

function getCelebrationMessage(completionRate: number, daysCompleted: number): string {
  if (completionRate >= 90) {
    return "Outstanding! You've shown incredible dedication to your relationship this month.";
  }
  if (completionRate >= 70) {
    return "Wonderful! You're building something beautiful together.";
  }
  if (completionRate >= 50) {
    return "Great progress! Every answer brings you closer.";
  }
  if (daysCompleted >= 5) {
    return "You're making meaningful strides in staying connected.";
  }
  return "Every moment counts. Here's to more connection next month.";
}
