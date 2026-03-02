import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/past-days?couple_id=...
 *   → returns list of all past dates with question counts and user's answer counts
 *
 * GET /api/past-days?couple_id=...&date=2025-03-01
 *   → returns full questions + answers for a specific date
 */
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
  const dateParam = searchParams.get("date");

  const { data: profile } = await supabase
    .from("users")
    .select("couple_id, timezone")
    .eq("id", user.id)
    .single();

  const couple_id = coupleIdParam || profile?.couple_id;

  if (!couple_id) {
    return NextResponse.json({ error: "No couple found" }, { status: 404 });
  }

  // Verify user belongs to this couple
  const { data: coupleCheck } = await supabase
    .from("couples")
    .select("id, timezone")
    .eq("id", couple_id)
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .single();

  if (!coupleCheck) {
    return NextResponse.json(
      { error: "Not authorized for this couple" },
      { status: 403 }
    );
  }

  const timezone =
    coupleCheck.timezone || profile?.timezone || "America/New_York";

  // Get today's date in the couple's timezone
  const today = getDateInTimezone(timezone);

  // If a specific date is requested, return full questions + answers for that date
  if (dateParam) {
    return getQuestionsForDate(supabase, couple_id, dateParam, user.id);
  }

  // Otherwise, return the list of all past dates
  return getPastDatesList(supabase, couple_id, today, user.id);
}

async function getPastDatesList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coupleId: string,
  today: string,
  userId: string
) {
  const serviceClient = await createServiceClient();

  // Get all distinct dates that have daily questions for this couple
  const { data: allQuestions } = await serviceClient
    .from("daily_questions")
    .select("id, question_date")
    .eq("couple_id", coupleId)
    .order("question_date", { ascending: false });

  if (!allQuestions || allQuestions.length === 0) {
    return NextResponse.json({ dates: [] }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  // Group question IDs by date
  const dateMap: Record<string, string[]> = {};
  for (const q of allQuestions) {
    if (!dateMap[q.question_date]) dateMap[q.question_date] = [];
    dateMap[q.question_date].push(q.id);
  }

  // Get all answers for these questions by the current user
  const allQuestionIds = allQuestions.map((q) => q.id);
  const { data: myAnswers } = await serviceClient
    .from("answers")
    .select("daily_question_id")
    .eq("user_id", userId)
    .in("daily_question_id", allQuestionIds);

  const myAnsweredIds = new Set(
    (myAnswers || []).map((a) => a.daily_question_id)
  );

  // Also get partner's answer counts per date
  const { data: partnerAnswers } = await serviceClient
    .from("answers")
    .select("daily_question_id")
    .neq("user_id", userId)
    .in("daily_question_id", allQuestionIds);

  const partnerAnsweredIds = new Set(
    (partnerAnswers || []).map((a) => a.daily_question_id)
  );

  // Build the date list
  const dates = Object.entries(dateMap)
    .map(([date, questionIds]) => {
      const totalQuestions = questionIds.length;
      const myAnswerCount = questionIds.filter((id) =>
        myAnsweredIds.has(id)
      ).length;
      const partnerAnswerCount = questionIds.filter((id) =>
        partnerAnsweredIds.has(id)
      ).length;

      return {
        date,
        totalQuestions,
        myAnswerCount,
        partnerAnswerCount,
        isToday: date === today,
        isComplete: myAnswerCount === totalQuestions,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json(
    { dates },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

async function getQuestionsForDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coupleId: string,
  date: string,
  userId: string
) {
  const serviceClient = await createServiceClient();

  // Get daily questions for this specific date
  const { data: questions } = await supabase
    .from("daily_questions")
    .select("*, question:questions(*)")
    .eq("couple_id", coupleId)
    .eq("question_date", date)
    .order("position");

  if (!questions || questions.length === 0) {
    return NextResponse.json(
      { questions: [], date },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  // Load answers using service client to bypass RLS
  const questionIds = questions.map((dq) => dq.id);

  const { data: answers } = await serviceClient
    .from("answers")
    .select("*")
    .in("daily_question_id", questionIds);

  const { data: favorites } = await serviceClient
    .from("favorites")
    .select("*")
    .in("daily_question_id", questionIds)
    .eq("user_id", userId);

  const withDetails = questions.map((dq) => ({
    ...dq,
    answers: (answers || []).filter((a) => a.daily_question_id === dq.id),
    favorites: (favorites || []).filter((f) => f.daily_question_id === dq.id),
  }));

  return NextResponse.json(
    { questions: withDetails, date },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

function getDateInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}
