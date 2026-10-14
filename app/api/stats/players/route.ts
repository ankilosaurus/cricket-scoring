import { NextResponse } from "next/server";
import { db, ensureSchema, isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

// Career aggregates per player name across all saved matches.
export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ ok: false, players: [] });
  await ensureSchema();
  const sql = db();
  const rows = (await sql`
    SELECT name,
           COUNT(DISTINCT match_id)::int AS matches,
           COALESCE(SUM(runs), 0)::int AS runs,
           COALESCE(SUM(balls), 0)::int AS balls,
           COALESCE(SUM(fours), 0)::int AS fours,
           COALESCE(SUM(sixes), 0)::int AS sixes,
           COALESCE(SUM(CASE WHEN "out" THEN 1 ELSE 0 END), 0)::int AS dismissals,
           COALESCE(SUM(balls_bowled), 0)::int AS "ballsBowled",
           COALESCE(SUM(runs_conceded), 0)::int AS "runsConceded",
           COALESCE(SUM(wickets), 0)::int AS wickets
    FROM players
    GROUP BY name
  `) as Record<string, any>[];
  return NextResponse.json({ ok: true, players: rows });
}
