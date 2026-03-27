import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const coupleIdParam = searchParams.get("couple_id");
  const monthParam = searchParams.get("month"); // Format: YYYY-MM

  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json(
      { error: "Invalid month format. Use YYYY-MM" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", user.id)
    .single();

  const couple_id = coupleIdParam || profile?.couple_id;

  if (!couple_id) {
    return NextResponse.json({ error: "No couple found" }, { status: 404 });
  }

  // Verify user belongs to this couple
  const { data: couple } = await supabase
    .from("couples")
    .select("*")
    .eq("id", couple_id)
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .single();

  if (!couple) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Calculate date range for the month
  const [year, month] = monthParam.split("-");
  const startDate = `${year}-${month}-01`;
  const endDate = getEndOfMonth(year, month);

  // 1. Total questions answered
  const { data: dailyQuestionsInMonth } = await supabase
    .from("daily_questions")
    .select("id")
    .eq("couple_id", couple_id)
    .gte("question_date", startDate)
    .lte("question_date", endDate);

  const questionIds = (dailyQuestionsInMonth || []).map(q => q.id);
  
  let totalAnswers = 0;
  let totalPossibleAnswers = 0;
  
  if (questionIds.length > 0) {
    const { count: answersCount } = await supabase
      .from("answers")
      .select("*", { count: "exact", head: true })
      .in("daily_question_id", questionIds);
    
    totalAnswers = answersCount || 0;
    totalPossibleAnswers = questionIds.length * 2; // Both partners
  }

  // 2. Favorite moments (most favorited answers)
  const { data: favoritedQuestions } = await supabase
    .from("favorites")
    .select(`
      daily_question_id,
      daily_questions!inner(
        id,
        question_date,
        question:questions(text, category)
      )
    `)
    .eq("user_id", user.id)
    .in("daily_question_id", questionIds)
    .limit(5);

  const favoriteMoments = await Promise.all(
    (favoritedQuestions || []).map(async (fav) => {
      const dq = fav.daily_questions;
      const { data: answers } = await supabase
        .from("answers")
        .select("*")
        .eq("daily_question_id", dq.id);

      return {
        question: dq.question?.text,
        category: dq.question?.category,
        date: dq.question_date,
        answers: answers || []
      };
    })
  );

  // 3. Mood trends
  const { data: moods } = await supabase
    .from("moods")
    .select("emoji, mood_date, user_id")
    .eq("couple_id", couple_id)
    .gte("mood_date", startDate)
    .lte("mood_date", endDate)
    .order("mood_date");

  // Count mood frequency
  const moodFrequency: { [emoji: string]: number } = {};
  (moods || []).forEach(m => {
    moodFrequency[m.emoji] = (moodFrequency[m.emoji] || 0) + 1;
  });

  const topMoods = Object.entries(moodFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji, count]) => ({ emoji, count }));

  // 4. Category distribution
  const { data: allAnswersInMonth } = await supabase
    .from("answers")
    .select(`
      daily_question_id,
      daily_questions!inner(
        question:questions(category)
      )
    `)
    .in("daily_question_id", questionIds);

  const categoryCount: { [key: string]: number } = {};
  (allAnswersInMonth || []).forEach(a => {
    const category = a.daily_questions?.question?.category;
    if (category) {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }
  });

  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // 5. Streak info during the month
  const streakAtMonthEnd = couple.streak_count || 0;

  // 6. Days both answered
  const { data: daysWithAnswers } = await supabase
    .from("daily_questions")
    .select(`
      question_date,
      answers!inner(user_id)
    `)
    .eq("couple_id", couple_id)
    .gte("question_date", startDate)
    .lte("question_date", endDate);

  // Count days where both partners answered all 7 questions
  const dateMap: { [date: string]: Set<string> } = {};
  (daysWithAnswers || []).forEach(dq => {
    if (!dateMap[dq.question_date]) {
      dateMap[dq.question_date] = new Set();
    }
    dq.answers.forEach((a: { user_id: string }) => {
      dateMap[dq.question_date].add(a.user_id);
    });
  });

  const daysCompleted = Object.values(dateMap).filter(
    userSet => userSet.size === 2
  ).length;

  // 7. Weekly check-ins completed
  const { count: weeklyCheckinsCompleted } = await supabase
    .from("weekly_checkins")
    .select("*", { count: "exact", head: true })
    .eq("couple_id", couple_id)
    .eq("status", "completed")
    .gte("week_start_date", startDate)
    .lte("week_start_date", endDate);

  return NextResponse.json({
    month: monthParam,
    stats: {
      totalAnswers,
      totalPossibleAnswers,
      completionRate: totalPossibleAnswers > 0 
        ? Math.round((totalAnswers / totalPossibleAnswers) * 100) 
        : 0,
      daysCompleted,
      streakCount: streakAtMonthEnd,
      weeklyCheckinsCompleted: weeklyCheckinsCompleted || 0,
    },
    favoriteMoments,
    moodTrends: {
      topMoods,
      dailyMoods: moods || []
    },
    categoryDistribution: topCategories,
  }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
  });
}

// Helper: Get last day of month
function getEndOfMonth(year: string, month: string): string {
  const y = parseInt(year);
  const m = parseInt(month);
  const lastDay = new Date(y, m, 0).getDate(); // Day 0 of next month = last day of current month
  return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
}
