import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // For each couple, get partner info and today's progress
  const couplesWithDetails = await Promise.all(
    (couples || []).map(async (couple) => {
      const partnerId =
        couple.user_1_id === user.id ? couple.user_2_id : couple.user_1_id;
      let partner = null;

      if (partnerId) {
        const { data: partnerData } = await supabase
          .from("users")
          .select("id, display_name, email")
          .eq("id", partnerId)
          .single();
        partner = partnerData;
      }

      // Get today's progress for this couple
      const timezone = couple.timezone || "America/New_York";
      const today = getDateInTimezone(timezone);

      const { data: todayQuestions } = await supabase
        .from("daily_questions")
        .select("id")
        .eq("couple_id", couple.id)
        .eq("question_date", today);

      let answeredCount = 0;
      const totalQuestions = todayQuestions?.length || 0;

      if (todayQuestions && todayQuestions.length > 0) {
        const questionIds = todayQuestions.map((q) => q.id);
        const { data: myAnswers } = await supabase
          .from("answers")
          .select("id")
          .in("daily_question_id", questionIds)
          .eq("user_id", user.id);
        answeredCount = myAnswers?.length || 0;
      }

      return {
        ...couple,
        partner,
        today_progress: {
          answered: answeredCount,
          total: totalQuestions,
          date: today,
        },
      };
    })
  );

  return NextResponse.json({ couples: couplesWithDetails });
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
