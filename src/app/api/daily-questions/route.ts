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
    .select("id, timezone")
    .eq("id", couple_id)
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .single();

  if (!coupleCheck) {
    return NextResponse.json({ error: "Not authorized for this couple" }, { status: 403 });
  }

  const timezone = coupleCheck.timezone || profile?.timezone || "America/New_York";

  // Get today's date in the couple's timezone
  const today = getDateInTimezone(timezone);

  // Check if daily questions already exist for today
  const { data: existing } = await supabase
    .from("daily_questions")
    .select("*, question:questions(*)")
    .eq("couple_id", couple_id)
    .eq("question_date", today)
    .order("position");

  if (existing && existing.length === 7) {
    // Load answers for these questions
    // Use service client to bypass RLS — we already verified couple membership above
    const serviceClient = await createServiceClient();
    const questionIds = existing.map((dq) => dq.id);
    
    const { data: answers, error: answersError } = await serviceClient
      .from("answers")
      .select("*")
      .in("daily_question_id", questionIds);

    const { data: favorites } = await serviceClient
      .from("favorites")
      .select("*")
      .in("daily_question_id", questionIds)
      .eq("user_id", user.id);

    const withDetails = existing.map((dq) => ({
      ...dq,
      answers: (answers || []).filter((a) => a.daily_question_id === dq.id),
      favorites: (favorites || []).filter((f) => f.daily_question_id === dq.id),
    }));

    console.log("[daily-questions] answers attached:", withDetails.reduce((sum, q) => sum + q.answers.length, 0));

    return NextResponse.json(
      { questions: withDetails, date: today },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  // Generate new daily questions
  // Get already-used question IDs for this couple (last 60 days to avoid repeats)
  const { data: recentQuestions } = await supabase
    .from("daily_questions")
    .select("question_id")
    .eq("couple_id", couple_id)
    .gte("question_date", getDateNDaysAgo(60, timezone));

  const usedIds = new Set((recentQuestions || []).map((q) => q.question_id));

  const newDailyQuestions = [];

  for (let i = 0; i < DAILY_STRUCTURE.length; i++) {
    const category = DAILY_STRUCTURE[i];

    // Get a random unused question from this category
    let query = supabase
      .from("questions")
      .select("id")
      .eq("category", category);

    if (usedIds.size > 0) {
      // Filter out used questions by fetching all and filtering client-side
      const { data: available } = await query;
      const filtered = (available || []).filter((q) => !usedIds.has(q.id));

      if (filtered.length === 0) {
        // All questions used — reset and pick any
        const { data: any } = await supabase
          .from("questions")
          .select("id")
          .eq("category", category);
        if (!any || any.length === 0) continue;
        const pick = any[Math.floor(Math.random() * any.length)];
        newDailyQuestions.push({
          couple_id,
          question_id: pick.id,
          question_date: today,
          position: i + 1,
        });
        usedIds.add(pick.id);
      } else {
        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        newDailyQuestions.push({
          couple_id,
          question_id: pick.id,
          question_date: today,
          position: i + 1,
        });
        usedIds.add(pick.id);
      }
    } else {
      const { data: available } = await query;
      if (!available || available.length === 0) continue;
      const pick =
        available[Math.floor(Math.random() * available.length)];
      newDailyQuestions.push({
        couple_id,
        question_id: pick.id,
        question_date: today,
        position: i + 1,
      });
      usedIds.add(pick.id);
    }
  }

  // Insert daily questions (use service client — no INSERT RLS policy on daily_questions)
  const serviceClient = await createServiceClient();
  const { error: insertError } = await serviceClient
    .from("daily_questions")
    .insert(newDailyQuestions);

  if (insertError) {
    // Might be a race condition — try fetching again
    const { data: retryExisting } = await supabase
      .from("daily_questions")
      .select("*, question:questions(*)")
      .eq("couple_id", couple_id)
      .eq("question_date", today)
      .order("position");

    if (retryExisting && retryExisting.length > 0) {
      return NextResponse.json(
        { questions: retryExisting, date: today },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }

  // Fetch the newly created questions with full details
  const { data: created } = await supabase
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
    { questions: withDetails, date: today },
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
