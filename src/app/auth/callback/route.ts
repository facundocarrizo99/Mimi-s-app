import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/daily";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure user profile exists in public.users (use service client to bypass RLS)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const serviceClient = await createServiceClient();
        await serviceClient
          .from("users")
          .upsert(
            {
              id: user.id,
              email: user.email ?? "",
              display_name:
                user.user_metadata?.display_name ??
                user.email?.split("@")[0] ??
                "",
            },
            { onConflict: "id" }
          );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
