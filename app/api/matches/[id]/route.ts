import { NextResponse } from "next/server";
import { db, ensureSchema, isDbConfigured } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isDbConfigured())
    return NextResponse.json({ ok: false }, { status: 503 });
  await ensureSchema();
  const sql = db();
  const rows = (await sql`SELECT data FROM matches WHERE id = ${ctx.params.id} LIMIT 1`) as {
    data: Match;
  }[];
  if (!rows.length)
    return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, match: rows[0].data });
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } }
) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isDbConfigured())
    return NextResponse.json({ ok: false }, { status: 503 });
  await ensureSchema();
  const sql = db();
  await sql`DELETE FROM matches WHERE id = ${ctx.params.id}`;
  return NextResponse.json({ ok: true });
}
