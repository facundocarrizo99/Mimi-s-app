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
  const weekStartDate = normalizeDateToISO(getWeekStartDate(timezone));

  // Check if weekly check-in exists for this week
  const { data: existingCheckin } = await supabase
    .from("weekly_checkins")
    .select("*")
    .eq("couple_id", couple_id)
    .eq("week_start_date", weekStartDate)
    .single();

  if (existingCheckin) {
    // Load answers using authenticated client (RLS handles authorization)
    const { data: answers } = await supabase
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

  // Create new weekly check-in using service client after authorization checks.
  // This avoids runtime failures if RPC/function permissions drift.
  const questionText = selectWeeklyQuestion(couple_id, weekStartDate);
  const serviceClient = await createServiceClient();

  const { data: insertedCheckin, error: insertError } = await serviceClient
    .from("weekly_checkins")
    .insert({
      couple_id,
      week_start_date: weekStartDate,
      question_text: questionText,
      status: "active",
    })
    .select("*")
    .single();

  let newCheckin = insertedCheckin;

  // If the row already exists (unique couple_id + week_start_date), fetch existing.
  if (!newCheckin && insertError?.code === "23505") {
    const { data: existingAfterConflict } = await serviceClient
      .from("weekly_checkins")
      .select("*")
      .eq("couple_id", couple_id)
      .eq("week_start_date", weekStartDate)
      .single();

    newCheckin = existingAfterConflict;
  }

  // Fallback path: try RPC using authenticated client when service insert fails.
  if (!newCheckin) {
    const { data: checkinIdResult, error: rpcError } = await supabase.rpc(
      "create_or_get_weekly_checkin",
      {
        p_couple_id: couple_id,
        p_week_start_date: weekStartDate,
        p_question_text: questionText,
      }
    );

    if (checkinIdResult) {
      const { data: rpcCheckin } = await supabase
        .from("weekly_checkins")
        .select("*")
        .eq("id", checkinIdResult)
        .single();

      if (rpcCheckin) {
        newCheckin = rpcCheckin;
      }
    }

    if (!newCheckin) {
      return NextResponse.json(
        {
          error: "Failed to create weekly check-in",
          details: {
            insert_code: insertError?.code || null,
            insert_message: insertError?.message || null,
            rpc_code: rpcError?.code || null,
            rpc_message: rpcError?.message || null,
          },
        },
        { status: 500 }
      );
    }
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
  const { data: allAnswers } = await supabase
    .from("weekly_checkin_answers")
    .select("*")
    .eq("checkin_id", checkin_id);

  if (allAnswers && allAnswers.length === 2) {
    // Mark check-in as completed
    await supabase
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
  // Get current date/time in the target timezone using Intl.DateTimeFormat
  const now = new Date();
  
  // Get parts in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "");
  const day = parseInt(parts.find(p => p.type === "day")?.value || "");
  const weekday = parts.find(p => p.type === "weekday")?.value || "";
  
  // Map weekday to number (0 = Sunday, 6 = Saturday)
  const weekdayMap: { [key: string]: number } = {
    "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3,
    "Thursday": 4, "Friday": 5, "Saturday": 6
  };
  const dayOfWeek = weekdayMap[weekday] || 0;
  
  // Create date and subtract days to get to Sunday
  const currentDate = new Date(year, month - 1, day);
  currentDate.setDate(currentDate.getDate() - dayOfWeek);
  
  // Format as YYYY-MM-DD
  const sundayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  return sundayFormatter.format(currentDate);
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

function normalizeDateToISO(value: string): string {
  const clean = value.trim();
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return clean;

  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${String(Number(slashMatch[1])).padStart(2, "0")}-${String(
      Number(slashMatch[2])
    ).padStart(2, "0")}`;
  }

  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return clean;
}
