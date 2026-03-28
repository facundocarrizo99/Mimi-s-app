import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter"); // "favorites", "all", category
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: profile } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", user.id)
    .single();

  if (!profile?.couple_id) {
    return NextResponse.json({ error: "No couple found" }, { status: 404 });
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("id, timezone, streak_count")
    .eq("id", profile.couple_id)
    .single();

  // Base query: get daily questions with answers from past days
  let query = supabase
    .from("daily_questions")
    .select(
      "*, question:questions(*), answers(*), favorites!left(*)",
      { count: "exact" }
    )
    .eq("couple_id", profile.couple_id)
    .order("question_date", { ascending: false })
    .order("position")
    .range(offset, offset + limit - 1);

  // Filter by favorites
  if (filter === "favorites") {
    // Get favorited question IDs first
    const { data: favs } = await supabase
      .from("favorites")
      .select("daily_question_id")
      .eq("user_id", user.id);

    if (favs && favs.length > 0) {
      query = query.in(
        "id",
        favs.map((f) => f.daily_question_id)
      );
    } else {
      return NextResponse.json({
        entries: {},
        total: 0,
        onThisDay: [],
        couple,
        currentUserId: user.id,
        page,
      });
    }
  }

  // Filter by category
  if (
    filter &&
    ["deep", "romantic", "playful", "future", "memory", "wildcard"].includes(
      filter
    )
  ) {
    // Need to filter by question category - fetch question IDs first
    const { data: catQuestions } = await supabase
      .from("questions")
      .select("id")
      .eq("category", filter);

    if (catQuestions) {
      const categoryQuestionIds = catQuestions.map((q) => q.id);
      if (categoryQuestionIds.length === 0) {
        return NextResponse.json({
          entries: {},
          total: 0,
          onThisDay: [],
          couple,
          currentUserId: user.id,
          page,
        });
      }

      query = query.in("question_id", categoryQuestionIds);
    }
  }

  const { data: entries, count } = await query;

  // If search is provided, filter in-memory (for simplicity)
  let results = entries || [];
  if (search) {
    const searchLower = search.toLowerCase();
    results = results.filter(
      (entry) =>
        entry.question?.text?.toLowerCase().includes(searchLower) ||
        entry.answers?.some((a: { text: string }) =>
          a.text.toLowerCase().includes(searchLower)
        )
    );
  }

  // Group by date
  const grouped: Record<string, typeof results> = {};
  for (const entry of results) {
    const date = entry.question_date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  }

  // Check "on this day" — same month/day from previous years
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const thisYear = today.getFullYear();

  let onThisDay: unknown[] = [];
  if (!search && (!filter || filter === "all") && page === 1) {
    const { data } = await supabase
      .from("daily_questions")
      .select("*, question:questions(*), answers(*)")
      .eq("couple_id", profile.couple_id)
      .like("question_date", `%-${month}-${day}`)
      .neq("question_date", `${thisYear}-${month}-${day}`)
      .order("question_date", { ascending: false });
    onThisDay = data || [];
  }

  return NextResponse.json({
    entries: grouped,
    total: count || 0,
    onThisDay,
    couple,
    currentUserId: user.id,
    page,
  });
}
