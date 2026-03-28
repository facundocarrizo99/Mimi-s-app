import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DATES_PER_PAGE = 30;
const IN_BATCH_SIZE = 200;

/**
 * GET /api/past-days?couple_id=...&page=1
 *   → returns paginated list of past dates with answer counts
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
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  let profile: { couple_id: string | null; timezone: string | null } | null = null;
  if (!coupleIdParam) {
    const { data } = await supabase
      .from("users")
      .select("couple_id, timezone")
      .eq("id", user.id)
      .single();
    profile = data;
  }

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
  const today = getDateInTimezone(timezone);

  if (dateParam) {
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
    return getQuestionsForDate(couple_id, dateParam, user.id);
  }

  return getPastDatesList(couple_id, today, user.id, page);
}

async function getPastDatesList(
  coupleId: string,
  today: string,
  userId: string,
  page: number
) {
  const serviceClient = await createServiceClient();

  // Get distinct dates that have daily questions, paginated.
  // Supabase doesn't support DISTINCT on a column directly,
  // so we fetch questions scoped to a date range via ordering + limit.
  // Instead, query all question_date values and deduplicate in JS.
  // This is efficient because we only select (id, question_date) — small rows.
  const { data: allQuestions } = await serviceClient
    .from("daily_questions")
    .select("id, question_date")
    .eq("couple_id", coupleId)
    .order("question_date", { ascending: false });

  if (!allQuestions || allQuestions.length === 0) {
    return jsonResponse({ dates: [], page, hasMore: false });
  }

  // Group question IDs by date
  const dateMap: Record<string, string[]> = {};
  for (const q of allQuestions) {
    if (!dateMap[q.question_date]) dateMap[q.question_date] = [];
    dateMap[q.question_date].push(q.id);
  }

  // Sort dates descending and paginate
  const allDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
  const start = (page - 1) * DATES_PER_PAGE;
  const paginatedDates = allDates.slice(start, start + DATES_PER_PAGE);
  const hasMore = start + DATES_PER_PAGE < allDates.length;

  if (paginatedDates.length === 0) {
    return jsonResponse({ dates: [], page, hasMore: false });
  }

  // Collect question IDs only for the paginated dates
  const questionIdsForPage: string[] = [];
  for (const d of paginatedDates) {
    questionIdsForPage.push(...dateMap[d]);
  }

  // Batch .in() queries to stay under PostgREST limits
  const myAnsweredIds = new Set<string>();
  const partnerAnsweredIds = new Set<string>();

  for (let i = 0; i < questionIdsForPage.length; i += IN_BATCH_SIZE) {
    const batch = questionIdsForPage.slice(i, i + IN_BATCH_SIZE);

    const [myRes, partnerRes] = await Promise.all([
      serviceClient
        .from("answers")
        .select("daily_question_id")
        .eq("user_id", userId)
        .in("daily_question_id", batch),
      serviceClient
        .from("answers")
        .select("daily_question_id")
        .neq("user_id", userId)
        .in("daily_question_id", batch),
    ]);

    for (const a of myRes.data || []) myAnsweredIds.add(a.daily_question_id);
    for (const a of partnerRes.data || [])
      partnerAnsweredIds.add(a.daily_question_id);
  }

  // Build the date list
  const todayKey = normalizeDateKey(today);

  const dates = paginatedDates.map((date) => {
    const dateKey = normalizeDateKey(date);
    const [yearPart, monthPart, dayPart] = dateKey.split("-");
    const monthKey = `${yearPart}-${monthPart}`;
    const dayOfMonth = Number(dayPart);
    const questionIds = dateMap[date];
    const totalQuestions = questionIds.length;
    const myAnswerCount = questionIds.filter((id) =>
      myAnsweredIds.has(id)
    ).length;
    const partnerAnswerCount = questionIds.filter((id) =>
      partnerAnsweredIds.has(id)
    ).length;

    return {
      date,
      date_key: dateKey,
      month_key: monthKey,
      day_of_month: Number.isFinite(dayOfMonth) ? dayOfMonth : null,
      totalQuestions,
      myAnswerCount,
      partnerAnswerCount,
      isToday: dateKey === todayKey,
      isComplete: myAnswerCount === totalQuestions,
    };
  });

  return jsonResponse({ dates, page, hasMore });
}

async function getQuestionsForDate(
  coupleId: string,
  date: string,
  userId: string
) {
  const serviceClient = await createServiceClient();

  // Use service client for everything — consistent, bypasses RLS
  const { data: questions } = await serviceClient
    .from("daily_questions")
    .select("*, question:questions(*)")
    .eq("couple_id", coupleId)
    .eq("question_date", date)
    .order("position");

  if (!questions || questions.length === 0) {
    return jsonResponse({ questions: [], date });
  }

  const questionIds = questions.map((dq) => dq.id);

  // Answers and favorites — small batch, max 7 IDs per date
  const [answersRes, favoritesRes] = await Promise.all([
    serviceClient
      .from("answers")
      .select("*")
      .in("daily_question_id", questionIds),
    serviceClient
      .from("favorites")
      .select("*")
      .in("daily_question_id", questionIds)
      .eq("user_id", userId),
  ]);

  const answers = answersRes.data || [];
  const favorites = favoritesRes.data || [];

  const withDetails = questions.map((dq) => ({
    ...dq,
    answers: answers.filter((a) => a.daily_question_id === dq.id),
    favorites: favorites.filter((f) => f.daily_question_id === dq.id),
  }));

  return jsonResponse({ questions: withDetails, date });
}

function jsonResponse(data: Record<string, unknown>) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
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

function normalizeDateKey(value: string): string {
  const trimmed = String(value).trim();

  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  const slashDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    return `${slashDate[3]}-${String(Number(slashDate[1])).padStart(2, "0")}-${String(
      Number(slashDate[2])
    ).padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed;
}
