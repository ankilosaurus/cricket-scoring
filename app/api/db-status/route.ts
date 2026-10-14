import { NextResponse } from "next/server";
import { DB_URL_KEYS } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const found = DB_URL_KEYS.filter((k) => !!process.env[k]);
  // Names only, never values — safe diagnostic.
  const storeKeys = Object.keys(process.env).filter((k) => k.includes("STORE"));
  return NextResponse.json({ ok: found.length > 0, found, storeKeys });
}
