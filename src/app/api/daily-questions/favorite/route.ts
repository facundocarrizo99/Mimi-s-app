import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { daily_question_id } = await request.json();

  // Check if already favorited
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("daily_question_id", daily_question_id)
    .maybeSingle();

  if (existing) {
    // Remove favorite
    await supabase.from("favorites").delete().eq("id", existing.id);
    return NextResponse.json({ favorited: false });
  } else {
    // Add favorite
    await supabase.from("favorites").insert({
      user_id: user.id,
      daily_question_id,
    });
    return NextResponse.json({ favorited: true });
  }
}
