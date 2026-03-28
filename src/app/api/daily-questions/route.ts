import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { DAILY_STRUCTURE } from "@/lib/questions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read couple_id from query params, fall back to profile
  const { searchParams } = new URL(request.url);
  const coupleIdParam = searchParams.get("couple_id");

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
    .select("id, timezone, streak_count, user_1_id, user_2_id")
    .eq("id", couple_id)
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .single();

  if (!coupleCheck) {
    return NextResponse.json({ error: "Not authorized for this couple" }, { status: 403 });
  }

  const timezone = coupleCheck.timezone || profile?.timezone || "America/New_York";

  // Get today's date in the couple's timezone
  const today = getDateInTimezone(timezone);

  const serviceClient = await createServiceClient();

  const partnerId =
    coupleCheck.user_1_id === user.id
      ? coupleCheck.user_2_id
      : coupleCheck.user_1_id;
  let partnerName = "";
  if (partnerId) {
    const { data: partnerProfile } = await serviceClient
      .from("users")
      .select("display_name, email")
      .eq("id", partnerId)
      .maybeSingle();
    partnerName =
      partnerProfile?.display_name ||
      partnerProfile?.email ||
      "";
  }

  const [moodResult, existingResult] = await Promise.all([
    serviceClient
      .from("moods")
      .select("emoji, reflection")
      .eq("couple_id", couple_id)
      .eq("mood_date", today)
      .eq("user_id", user.id)
      .maybeSingle(),
    serviceClient
      .from("daily_questions")
      .select("*, question:questions(*), answers(*)")
      .eq("couple_id", couple_id)
      .eq("question_date", today)
      .order("position"),
  ]);

  const moodRow = moodResult.data;

  // Check if daily questions already exist for today
  const existing = existingResult.data;

  if (existing && existing.length === 7) {
    // Load favorites for these questions using service client.
    // Answers are already included in the query above.
    const questionIds = existing.map((dq) => dq.id);

    const { data: favorites } = await serviceClient
      .from("favorites")
      .select("*")
      .in("daily_question_id", questionIds)
      .eq("user_id", user.id);

    const withDetails = existing.map((dq) => ({
      ...dq,
      answers: dq.answers || [],
      favorites: (favorites || []).filter((f) => f.daily_question_id === dq.id),
    }));

    return NextResponse.json(
      {
        questions: withDetails,
        date: today,
        couple: coupleCheck,
        currentUserId: user.id,
        partnerName,
        currentMood: moodRow ? { emoji: moodRow.emoji, reflection: moodRow.reflection } : null,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  // Generate new daily questions
  // Get already-used question IDs for this couple (last 60 days to avoid repeats)
  const { data: recentQuestions } = await serviceClient
    .from("daily_questions")
    .select("question_id")
    .eq("couple_id", couple_id)
    .gte("question_date", getDateNDaysAgo(60, timezone));

  const usedIds = new Set((recentQuestions || []).map((q) => q.question_id));

  const uniqueCategories = Array.from(new Set(DAILY_STRUCTURE));
  const { data: allCategoryQuestions } = await serviceClient
    .from("questions")
    .select("id, category")
    .in("category", uniqueCategories);

  const questionsByCategory = new Map<string, { id: string }[]>();
  for (const category of uniqueCategories) {
    questionsByCategory.set(category, []);
  }
  for (const question of allCategoryQuestions || []) {
    const bucket = questionsByCategory.get(question.category as string) || [];
    bucket.push({ id: question.id });
    questionsByCategory.set(question.category as string, bucket);
  }

  const newDailyQuestions = [];

  for (let i = 0; i < DAILY_STRUCTURE.length; i++) {
    const category = DAILY_STRUCTURE[i];

    const available = questionsByCategory.get(category) || [];
    if (available.length === 0) continue;

    const unused = available.filter((q) => !usedIds.has(q.id));
    const pickPool = unused.length > 0 ? unused : available;
    const pick = pickPool[Math.floor(Math.random() * pickPool.length)];

    newDailyQuestions.push({
      couple_id,
      question_id: pick.id,
      question_date: today,
      position: i + 1,
    });
    usedIds.add(pick.id);
  }

  // Insert daily questions (use service client — no INSERT RLS policy on daily_questions)
  const { error: insertError } = await serviceClient
    .from("daily_questions")
    .insert(newDailyQuestions);

  if (insertError) {
    // Might be a race condition — try fetching again
    const { data: retryExisting } = await serviceClient
      .from("daily_questions")
      .select("*, question:questions(*)")
      .eq("couple_id", couple_id)
      .eq("question_date", today)
      .order("position");

    if (retryExisting && retryExisting.length > 0) {
      const retryWithDetails = retryExisting.map((dq) => ({
        ...dq,
        answers: [],
        favorites: [],
      }));

      return NextResponse.json(
        {
          questions: retryWithDetails,
          date: today,
          couple: coupleCheck,
          currentUserId: user.id,
          partnerName,
          currentMood: moodRow ? { emoji: moodRow.emoji, reflection: moodRow.reflection } : null,
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }

  // Fetch the newly created questions with full details
  const { data: created } = await serviceClient
    .from("daily_questions")
    .select("*, question:questions(*)")
    .eq("couple_id", couple_id)
    .eq("question_date", today)
    .order("position");

  const withDetails = (created || []).map((dq) => ({
    ...dq,
    answers: [],
    favorites: [],
  }));

  return NextResponse.json(
    {
      questions: withDetails,
      date: today,
      couple: coupleCheck,
      currentUserId: user.id,
      partnerName,
      currentMood: moodRow ? { emoji: moodRow.emoji, reflection: moodRow.reflection } : null,
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

function getDateNDaysAgo(n: number, timezone: string): string {
  const now = new Date();
  now.setDate(now.getDate() - n);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}
