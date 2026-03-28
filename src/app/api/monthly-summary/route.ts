import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MONTHLY_SUMMARY_CACHE_TTL_MS = 120_000;
const MONTHLY_SUMMARY_MAX_CACHE_ENTRIES = 200;
const monthlySummaryCache = new Map<string, { expiresAt: number; payload: any }>();

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const coupleIdParam = searchParams.get("couple_id");
  const monthParam = searchParams.get("month");

  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json(
      { error: "Invalid month format. Use YYYY-MM" },
      { status: 400 }
    );
  }

  let profile: { couple_id: string | null } | null = null;
  if (!coupleIdParam) {
    const { data } = await supabase
      .from("users")
      .select("couple_id")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const couple_id = coupleIdParam || profile?.couple_id;

  if (!couple_id) {
    return NextResponse.json({ error: "No couple found" }, { status: 404 });
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("id, streak_count")
    .eq("id", couple_id)
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .single();

  if (!couple) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const [year, month] = monthParam.split("-");
  const startDate = `${year}-${month}-01`;
  const endDate = getEndOfMonth(year, month);

  const cacheKey = `${user.id}:${couple_id}:${monthParam}`;
  const now = Date.now();
  const cached = monthlySummaryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  const serviceClient = await createServiceClient();

  const [moodsResult, weeklyCheckinsResult] = await Promise.all([
    serviceClient
      .from("moods")
      .select("emoji, mood_date, user_id")
      .eq("couple_id", couple_id)
      .gte("mood_date", startDate)
      .lte("mood_date", endDate)
      .order("mood_date"),
    serviceClient
      .from("weekly_checkins")
      .select("id", { count: "exact", head: true })
      .eq("couple_id", couple_id)
      .eq("status", "completed")
      .gte("week_start_date", startDate)
      .lte("week_start_date", endDate),
  ]);

  const { data: dailyQuestionsInMonth } = await serviceClient
    .from("daily_questions")
    .select("id")
    .eq("couple_id", couple_id)
    .gte("question_date", startDate)
    .lte("question_date", endDate);

  const questionIds = (dailyQuestionsInMonth || []).map((q) => q.id);

  let totalAnswers = 0;
  let totalPossibleAnswers = 0;
  let favoriteMoments: Array<{
    question: string;
    category: string;
    date: string;
    answers: Array<{ user_id: string; text: string }>;
  }> = [];
  let topCategories: Array<{ category: string; count: number }> = [];
  let daysCompleted = 0;

  if (questionIds.length > 0) {
    const [favoritedQuestionsResult, allAnswersInMonthResult] = await Promise.all([
      serviceClient
        .from("favorites")
        .select(
          "daily_question_id, daily_questions!inner(id, question_date, question:questions(text, category), answers(user_id, text))"
        )
        .eq("user_id", user.id)
        .in("daily_question_id", questionIds)
        .order("created_at", { ascending: false })
        .limit(5),
      serviceClient
        .from("answers")
        .select(
          "user_id, daily_question_id, daily_questions!inner(question_date, question:questions(category))"
        )
        .in("daily_question_id", questionIds),
    ]);

    const allAnswersInMonth = allAnswersInMonthResult.data || [];
    totalAnswers = allAnswersInMonth.length;
    totalPossibleAnswers = questionIds.length * 2;

    const favoritedQuestions = favoritedQuestionsResult.data || [];
    favoriteMoments = favoritedQuestions.map((fav: any) => {
      const dq = fav.daily_questions;
      return {
        question: dq?.question?.text || "",
        category: dq?.question?.category || "",
        date: dq?.question_date || "",
        answers: dq?.answers || [],
      };
    });

    const categoryCount: Record<string, number> = {};
    const dateUserAnswerCount: Record<string, Record<string, number>> = {};

    for (const answer of allAnswersInMonth as any[]) {
      const category = answer.daily_questions?.question?.category;
      const questionDate = answer.daily_questions?.question_date;
      const answerUserId = answer.user_id;

      if (category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }

      if (questionDate && answerUserId) {
        if (!dateUserAnswerCount[questionDate]) {
          dateUserAnswerCount[questionDate] = {};
        }
        dateUserAnswerCount[questionDate][answerUserId] =
          (dateUserAnswerCount[questionDate][answerUserId] || 0) + 1;
      }
    }

    topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    daysCompleted = Object.values(dateUserAnswerCount).filter((userCounts) => {
      const users = Object.values(userCounts);
      return users.length === 2 && users.every((count) => count === 7);
    }).length;
  }

  const moods = moodsResult.data || [];
  const moodFrequency: Record<string, number> = {};
  for (const mood of moods) {
    moodFrequency[mood.emoji] = (moodFrequency[mood.emoji] || 0) + 1;
  }

  const topMoods = Object.entries(moodFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji, count]) => ({ emoji, count }));

  const streakAtMonthEnd = couple.streak_count || 0;

  const payload = {
    month: monthParam,
    couple,
    stats: {
      totalAnswers,
      totalPossibleAnswers,
      completionRate:
        totalPossibleAnswers > 0
          ? Math.round((totalAnswers / totalPossibleAnswers) * 100)
          : 0,
      daysCompleted,
      streakCount: streakAtMonthEnd,
      weeklyCheckinsCompleted: weeklyCheckinsResult.count || 0,
    },
    favoriteMoments,
    moodTrends: {
      topMoods,
      dailyMoods: moods,
    },
    categoryDistribution: topCategories,
  };

  if (monthlySummaryCache.size >= MONTHLY_SUMMARY_MAX_CACHE_ENTRIES) {
    const oldestKey = monthlySummaryCache.keys().next().value;
    if (oldestKey) {
      monthlySummaryCache.delete(oldestKey);
    }
  }

  monthlySummaryCache.set(cacheKey, {
    expiresAt: now + MONTHLY_SUMMARY_CACHE_TTL_MS,
    payload,
  });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

function getEndOfMonth(year: string, month: string): string {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const lastDay = new Date(y, m, 0).getDate();
  return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
}