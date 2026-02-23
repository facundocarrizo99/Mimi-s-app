import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { emoji, reflection, date } = await request.json();

  const { data: profile } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", user.id)
    .single();

  if (!profile?.couple_id) {
    return NextResponse.json({ error: "No couple found" }, { status: 404 });
  }

  const { data: mood, error } = await supabase
    .from("moods")
    .upsert(
      {
        user_id: user.id,
        couple_id: profile.couple_id,
        mood_date: date,
        emoji,
        reflection: reflection || null,
      },
      { onConflict: "user_id,mood_date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mood });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const { data: profile } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", user.id)
    .single();

  if (!profile?.couple_id) {
    return NextResponse.json({ error: "No couple found" }, { status: 404 });
  }

  let query = supabase
    .from("moods")
    .select("*")
    .eq("couple_id", profile.couple_id)
    .order("mood_date", { ascending: false });

  if (date) {
    query = query.eq("mood_date", date);
  } else {
    query = query.limit(30);
  }

  const { data: moods } = await query;
  return NextResponse.json({ moods: moods || [] });
}
