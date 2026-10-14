import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "cricket_auth";
export const PIN_ENV = "APP_PIN";

// Token is HMAC(PIN, constant) — can't be forged without the PIN, and
// changing the PIN automatically invalidates previously issued cookies.
export function signToken(pin: string): string {
  return createHmac("sha256", pin).update("cricket-auth-v1").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function lockEnabled(): boolean {
  return !!process.env[PIN_ENV];
}

// When no PIN is configured the lock is disabled and everything is open.
export function isAuthed(): boolean {
  const pin = process.env[PIN_ENV];
  if (!pin) return true;
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return false;
  return safeEqual(token, signToken(pin));
}
