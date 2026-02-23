import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { daily_question_id, text } = await request.json();

  if (!daily_question_id || !text?.trim()) {
    return NextResponse.json(
      { error: "Missing daily_question_id or text" },
      { status: 400 }
    );
  }

  // Verify user belongs to the couple that owns this question
  const { data: dq } = await supabase
    .from("daily_questions")
    .select("couple_id")
    .eq("id", daily_question_id)
    .single();

  if (!dq) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("id, user_1_id, user_2_id")
    .eq("id", dq.couple_id)
    .single();

  if (
    !couple ||
    (couple.user_1_id !== user.id && couple.user_2_id !== user.id)
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Upsert answer
  const { data: answer, error } = await supabase
    .from("answers")
    .upsert(
      {
        daily_question_id,
        user_id: user.id,
        text: text.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "daily_question_id,user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save answer" },
      { status: 500 }
    );
  }

  // Check if both partners have answered all 7 questions today
  const { data: todayQuestions } = await supabase
    .from("daily_questions")
    .select("id")
    .eq("couple_id", dq.couple_id)
    .eq("question_date", dq.couple_id); // This is just for fetching same-date questions

  // Get today's date from the daily question
  const { data: fullDq } = await supabase
    .from("daily_questions")
    .select("question_date")
    .eq("id", daily_question_id)
    .single();

  if (fullDq) {
    const { data: allTodayQuestions } = await supabase
      .from("daily_questions")
      .select("id")
      .eq("couple_id", dq.couple_id)
      .eq("question_date", fullDq.question_date);

    if (allTodayQuestions) {
      const qIds = allTodayQuestions.map((q) => q.id);

      // Count answers by each user
      const { data: allAnswers } = await supabase
        .from("answers")
        .select("user_id")
        .in("daily_question_id", qIds);

      if (allAnswers) {
        const user1Answers = allAnswers.filter(
          (a) => a.user_id === couple.user_1_id
        ).length;
        const user2Answers = allAnswers.filter(
          (a) => a.user_id === couple.user_2_id
        ).length;

        // If both have answered all 7, update streak
        if (
          user1Answers === 7 &&
          user2Answers === 7 &&
          couple.user_1_id &&
          couple.user_2_id
        ) {
          await supabase.rpc("update_streak", {
            p_couple_id: dq.couple_id,
            p_date: fullDq.question_date,
          });
        }
      }
    }
  }

  return NextResponse.json({ answer });
}
