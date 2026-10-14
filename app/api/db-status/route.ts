import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: isDbConfigured() });
}
