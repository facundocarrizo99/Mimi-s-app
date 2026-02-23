import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Cron endpoint for daily maintenance tasks.
 * Called via Vercel Cron or external cron service.
 *
 * Set up in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 *
 * Runs every hour to handle timezone-aware resets.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Check for broken streaks (couples who missed yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

  // Find couples whose last streak date is older than yesterday
  const { data: staleStreaks } = await supabase
    .from("couples")
    .select("id, last_streak_date, streak_count")
    .gt("streak_count", 0)
    .lt("last_streak_date", yesterdayStr);

  if (staleStreaks) {
    for (const couple of staleStreaks) {
      // Reset streak if they missed a day
      if (
        couple.last_streak_date &&
        couple.last_streak_date < twoDaysAgoStr
      ) {
        await supabase
          .from("couples")
          .update({ streak_count: 0 })
          .eq("id", couple.id);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: staleStreaks?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
