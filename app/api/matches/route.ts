import { NextResponse } from "next/server";
import { db, ensureSchema, isDbConfigured } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, matches: [] });
  await ensureSchema();
  const sql = db();
  const rows = (await sql`
    SELECT id, team_a AS "teamA", team_b AS "teamB", winner, status,
           batting_first AS "battingFirst",
           (data->'innings'->0->>'runs')::int AS "r1",
           (data->'innings'->0->>'wickets')::int AS "w1",
           (data->'innings'->0->>'balls')::int AS "b1",
           (data->'innings'->1->>'runs')::int AS "r2",
           (data->'innings'->1->>'wickets')::int AS "w2",
           (data->'innings'->1->>'balls')::int AS "b2",
           updated_at AS "updatedAt"
    FROM matches ORDER BY updated_at DESC LIMIT 50
  `) as Record<string, any>[];
  const matches = rows.map((r) => ({
    id: r.id, teamA: r.teamA, teamB: r.teamB, winner: r.winner ?? undefined,
    status: r.status, updatedAt: r.updatedAt, battingFirst: r.battingFirst,
    inns1: { runs: r.r1 ?? 0, wickets: r.w1 ?? 0, balls: r.b1 ?? 0 },
    inns2: { runs: r.r2 ?? 0, wickets: r.w2 ?? 0, balls: r.b2 ?? 0 },
  }));
  return NextResponse.json({ ok: true, matches });
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isDbConfigured())
    return NextResponse.json({ ok: false, skipped: true });
  const m = (await req.json()) as Match;
  if (!m || !m.id)
    return NextResponse.json({ ok: false, error: "bad match" }, { status: 400 });
  await ensureSchema();
  const sql = db();

  const queries: ReturnType<typeof sql>[] = [];
  queries.push(sql`
    INSERT INTO matches (id, team_a, team_b, overs, batting_first, status, winner, current_innings, data)
    VALUES (${m.id}, ${m.teamA}, ${m.teamB}, ${m.overs}, ${m.battingFirst}, ${m.status},
            ${m.winner ?? null}, ${m.currentInnings}, ${JSON.stringify(m)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      team_a = EXCLUDED.team_a, team_b = EXCLUDED.team_b, overs = EXCLUDED.overs,
      batting_first = EXCLUDED.batting_first, status = EXCLUDED.status,
      winner = EXCLUDED.winner, current_innings = EXCLUDED.current_innings,
      data = EXCLUDED.data, updated_at = now()
  `);
  queries.push(sql`DELETE FROM players WHERE match_id = ${m.id}`);
  const allPlayers = [
    ...m.playersA.map((p) => ({ ...p, team: "A" })),
    ...m.playersB.map((p) => ({ ...p, team: "B" })),
  ];
  for (const p of allPlayers) {
    queries.push(sql`
      INSERT INTO players (match_id, player_id, team, name, runs, balls, fours, sixes,
                           "out", balls_bowled, runs_conceded, wickets)
      VALUES (${m.id}, ${p.id}, ${p.team}, ${p.name}, ${p.runs}, ${p.balls}, ${p.fours},
              ${p.sixes}, ${p.out}, ${p.ballsBowled}, ${p.runsConceded}, ${p.wickets})
    `);
  }
  queries.push(sql`DELETE FROM ball_events WHERE match_id = ${m.id}`);
  m.innings.forEach((inn, ni) => {
    inn.events.forEach((e, seq) => {
      queries.push(sql`
        INSERT INTO ball_events (match_id, innings_no, seq, type, runs, label,
                                 striker_id, non_striker_id, bowler_id)
        VALUES (${m.id}, ${ni}, ${seq}, ${e.type}, ${e.runs}, ${e.label},
                ${e.strikerId ?? null}, ${e.nonStrikerId ?? null}, ${e.bowlerId ?? null})
      `);
    });
  });

  await sql.transaction(queries);
  return NextResponse.json({ ok: true });
}
