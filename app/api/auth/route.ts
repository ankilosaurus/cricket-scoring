import { NextResponse } from "next/server";
import { AUTH_COOKIE, isAuthed, lockEnabled, safeEqual, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Session check: is this browser already unlocked? Is the lock even on?
export async function GET() {
  return NextResponse.json({ ok: isAuthed(), lockEnabled: lockEnabled() });
}

export async function POST(req: Request) {
  const pin = process.env.APP_PIN;
  if (!pin) return NextResponse.json({ ok: true, lockEnabled: false });

  let attempt = "";
  try {
    attempt = (await req.json())?.pin ?? "";
  } catch {
    attempt = "";
  }
  if (typeof attempt !== "string" || !attempt || !safeEqual(attempt, pin)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, lockEnabled: true });
  res.cookies.set(AUTH_COOKIE, signToken(pin), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
