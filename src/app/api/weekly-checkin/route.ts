import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Curated weekly reflection questions
const WEEKLY_QUESTIONS = [
  "What made you feel most connected to each other this week?",
  "What challenge did you face this week, and how did you support each other?",
  "What's one thing you learned about your partner this week?",
  "What moment from this week do you want to remember forever?",
  "How did you grow individually or as a couple this week?",
  "What made you laugh together this week?",
  "What's something you're grateful for in your relationship this week?",
  "What was the most meaningful conversation you had this week?",
  "What's one thing you want to do differently next week?",
  "How did you show love to each other this week?",
  "What surprised you about your partner this week?",
  "What's a small victory you celebrated together this week?",
  "What did you do this week to prioritize your relationship?",
  "What emotion did you feel most strongly this week, and why?",
  "What's something you want to tell your partner about this week?",
  "How did distance feel this week (easier, harder, or the same)?",
  "What's a memory from this week you'd want to relive?",
  "What brought you comfort or peace this week?",
  "What's one thing that strengthened your bond this week?",
  "What hope or dream felt more real to you this week?"
];

// GET: Fetch current week's check-in
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const coupleIdParam = searchParams.get("couple_id");

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
  const { data: couple } = await supabase
    .from("couples")
    .select("id, timezone")
    .eq("id", couple_id)
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .single();

  if (!couple) {
    return NextResponse.json({ error: "Not authorized for this couple" }, { status: 403 });
  }

  const timezone = couple.timezone || profile?.timezone || "America/New_York";
  
  // Calculate the start of the current week (Sunday)
  const weekStartDate = getWeekStartDate(timezone);

  // Check if weekly check-in exists for this week
  const { data: existingCheckin } = await supabase
    .from("weekly_checkins")
    .select("*")
    .eq("couple_id", couple_id)
    .eq("week_start_date", weekStartDate)
    .single();

  if (existingCheckin) {
    // Load answers using service client
    const serviceClient = await createServiceClient();
    const { data: answers } = await serviceClient
      .from("weekly_checkin_answers")
      .select("*")
      .eq("checkin_id", existingCheckin.id);

    return NextResponse.json(
      { 
        checkin: existingCheckin,
        answers: answers || [],
        weekStartDate 
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  // Create new weekly check-in
  const questionText = selectWeeklyQuestion(couple_id, weekStartDate);
  
  const serviceClient = await createServiceClient();
  const { data: newCheckin, error: insertError } = await serviceClient
    .from("weekly_checkins")
    .insert({
      couple_id,
      week_start_date: weekStartDate,
      question_text: questionText,
      status: 'active'
    })
    .select()
    .single();

  if (insertError || !newCheckin) {
    // Race condition — try fetching again
    const { data: retryCheckin } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("couple_id", couple_id)
      .eq("week_start_date", weekStartDate)
      .single();

    if (retryCheckin) {
      return NextResponse.json(
        { 
          checkin: retryCheckin,
          answers: [],
          weekStartDate 
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    return NextResponse.json(
      { error: "Failed to create weekly check-in" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { 
      checkin: newCheckin,
      answers: [],
      weekStartDate 
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

// POST: Submit answer to weekly check-in
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { checkin_id, answer_text, couple_id } = body;

  if (!checkin_id || !answer_text || !couple_id) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Verify user belongs to this couple
  const { data: couple } = await supabase
    .from("couples")
    .select("id")
    .eq("id", couple_id)
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .single();

  if (!couple) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Verify check-in belongs to this couple
  const { data: checkin } = await supabase
    .from("weekly_checkins")
    .select("couple_id")
    .eq("id", checkin_id)
    .single();

  if (!checkin || checkin.couple_id !== couple_id) {
    return NextResponse.json({ error: "Invalid check-in" }, { status: 404 });
  }

  // Insert or update answer
  const { data: answer, error: answerError } = await supabase
    .from("weekly_checkin_answers")
    .upsert({
      checkin_id,
      user_id: user.id,
      answer_text,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'checkin_id,user_id'
    })
    .select()
    .single();

  if (answerError) {
    return NextResponse.json(
      { error: "Failed to save answer" },
      { status: 500 }
    );
  }

  // Check if both partners have answered
  const serviceClient = await createServiceClient();
  const { data: allAnswers } = await serviceClient
    .from("weekly_checkin_answers")
    .select("*")
    .eq("checkin_id", checkin_id);

  if (allAnswers && allAnswers.length === 2) {
    // Mark check-in as completed
    await serviceClient
      .from("weekly_checkins")
      .update({ status: 'completed' })
      .eq("id", checkin_id);
  }

  return NextResponse.json(
    { answer, allAnswers: allAnswers || [] },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

// Helper: Get Sunday of current week in timezone
function getWeekStartDate(timezone: string): string {
  const now = new Date();
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = localTime.getDay();
  
  // Calculate days to subtract to get to Sunday
  const daysToSunday = dayOfWeek;
  
  const sunday = new Date(localTime);
  sunday.setDate(sunday.getDate() - daysToSunday);
  
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  return formatter.format(sunday);
}

// Helper: Select a weekly question based on week rotation
function selectWeeklyQuestion(coupleId: string, weekStartDate: string): string {
  // Use couple_id and date to generate a consistent but pseudo-random index
  const hash = simpleHash(coupleId + weekStartDate);
  const index = hash % WEEKLY_QUESTIONS.length;
  return WEEKLY_QUESTIONS[index];
}

// Simple hash function for consistent question selection
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
