import { NextResponse } from "next/server";
import { DB_URL_KEYS } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const found = DB_URL_KEYS.filter((k) => !!process.env[k]);
  // Names only, never values — safe diagnostic.
  const storeKeys = Object.keys(process.env).filter((k) => k.includes("STORE"));
  return NextResponse.json({ ok: found.length > 0, found, storeKeys });
}
