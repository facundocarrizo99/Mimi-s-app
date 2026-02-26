import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET: Get couple info
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // If user has a couple, get partner info
  let partner = null;
  if (profile.couple_id) {
    const { data: couple } = await supabase
      .from("couples")
      .select("*")
      .eq("id", profile.couple_id)
      .single();

    if (couple) {
      const partnerId = couple.user_1_id === user.id ? couple.user_2_id : couple.user_1_id;
      if (partnerId) {
        const serviceClient = await createServiceClient();
        const { data: partnerData } = await serviceClient
          .from("users")
          .select("id, display_name, email")
          .eq("id", partnerId)
          .single();
        partner = partnerData;
      }
    }
  }

  return NextResponse.json({ user: profile, partner });
}

// POST: Create couple or join via invite code
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, invite_code, timezone, display_name } = await request.json();

  if (action === "create") {
    // Ensure user profile exists in public.users before creating couple
    // Use service client to bypass RLS
    const serviceClient = await createServiceClient();
    const { error: upsertError } = await serviceClient
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          display_name:
            display_name ||
            (user.user_metadata?.display_name ??
            user.email?.split("@")[0] ??
            ""),
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("Failed to upsert user profile:", upsertError);
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
    }

    // Create a new couple space
    const { data: couple, error } = await supabase
      .from("couples")
      .insert({
        user_1_id: user.id,
        timezone: timezone || "America/New_York",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update user's couple_id
    await supabase
      .from("users")
      .update({ couple_id: couple.id })
      .eq("id", user.id);

    return NextResponse.json({ couple });
  }

  if (action === "join") {
    if (!invite_code) {
      return NextResponse.json({ error: "Invite code required" }, { status: 400 });
    }

    // Use service client to bypass RLS — user 2 isn't a couple member yet
    const serviceClient = await createServiceClient();

    // Ensure user 2 profile exists with display name
    await serviceClient
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          display_name:
            display_name ||
            (user.user_metadata?.display_name ??
            user.email?.split("@")[0] ??
            ""),
        },
        { onConflict: "id" }
      );

    // Find couple by invite code
    const { data: couple } = await serviceClient
      .from("couples")
      .select("*")
      .eq("invite_code", invite_code)
      .single();

    if (!couple) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    if (couple.user_2_id) {
      return NextResponse.json({ error: "This space already has two people" }, { status: 400 });
    }

    if (couple.user_1_id === user.id) {
      return NextResponse.json({ error: "You can't join your own space" }, { status: 400 });
    }

    // Join the couple
    const { error } = await serviceClient
      .from("couples")
      .update({ user_2_id: user.id })
      .eq("id", couple.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update user's couple_id
    await serviceClient
      .from("users")
      .update({ couple_id: couple.id })
      .eq("id", user.id);

    return NextResponse.json({ couple: { ...couple, user_2_id: user.id } });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
