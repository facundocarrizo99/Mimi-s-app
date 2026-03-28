import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET: Get all couples for the logged-in user
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all couples where user is user_1 or user_2
  const { data: couples, error } = await supabase
    .from("couples")
    .select("*")
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Use service client for partner lookups (RLS on users table
  // only allows reading partners via the single couple_id field,
  // which breaks in a multi-couple scenario)
  const serviceClient = await createServiceClient();

  const couplesList = couples || [];
  const partnerIds = couplesList
    .map((couple) =>
      couple.user_1_id === user.id ? couple.user_2_id : couple.user_1_id
    )
    .filter((partnerId): partnerId is string => Boolean(partnerId));

  const partnersById = new Map<string, { id: string; display_name: string; email: string }>();
  if (partnerIds.length > 0) {
    const { data: partners } = await serviceClient
      .from("users")
      .select("id, display_name, email")
      .in("id", partnerIds);

    for (const partner of partners || []) {
      partnersById.set(partner.id, partner);
    }
  }

  const todayByCoupleId = new Map<string, string>();
  const uniqueDates = new Set<string>();
  for (const couple of couplesList) {
    const today = getDateInTimezone(couple.timezone || "America/New_York");
    todayByCoupleId.set(couple.id, today);
    uniqueDates.add(today);
  }

  const coupleIds = couplesList.map((couple) => couple.id);
  let dailyQuestions: { id: string; couple_id: string; question_date: string }[] = [];
  if (coupleIds.length > 0 && uniqueDates.size > 0) {
    const { data } = await serviceClient
      .from("daily_questions")
      .select("id, couple_id, question_date")
      .in("couple_id", coupleIds)
      .in("question_date", Array.from(uniqueDates));
    dailyQuestions = data || [];
  }

  const questionIdsByCoupleId = new Map<string, string[]>();
  for (const question of dailyQuestions) {
    const expectedDate = todayByCoupleId.get(question.couple_id);
    if (!expectedDate || expectedDate !== question.question_date) continue;

    const existing = questionIdsByCoupleId.get(question.couple_id) || [];
    existing.push(question.id);
    questionIdsByCoupleId.set(question.couple_id, existing);
  }

  const allQuestionIds = Array.from(questionIdsByCoupleId.values()).flat();
  const answeredQuestionIds = new Set<string>();

  if (allQuestionIds.length > 0) {
    const { data: myAnswers } = await serviceClient
      .from("answers")
      .select("daily_question_id")
      .eq("user_id", user.id)
      .in("daily_question_id", allQuestionIds);

    for (const answer of myAnswers || []) {
      answeredQuestionIds.add(answer.daily_question_id);
    }
  }

  const couplesWithDetails = couplesList.map((couple) => {
    const partnerId =
      couple.user_1_id === user.id ? couple.user_2_id : couple.user_1_id;

    const questionIds = questionIdsByCoupleId.get(couple.id) || [];
    const answeredCount = questionIds.filter((id) => answeredQuestionIds.has(id)).length;
    const today = todayByCoupleId.get(couple.id) || getDateInTimezone(couple.timezone || "America/New_York");

    return {
      ...couple,
      partner: partnerId ? partnersById.get(partnerId) || null : null,
      today_progress: {
        answered: answeredCount,
        total: questionIds.length,
        date: today,
      },
    };
  });

  return NextResponse.json(
    {
      couples: couplesWithDetails,
      currentUserDisplayName:
        user.user_metadata?.display_name || user.email?.split("@")[0] || "",
    },
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
