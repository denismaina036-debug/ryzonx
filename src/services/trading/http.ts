import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";
export async function tradingIdentity(admin = false) {
  const user = await getCurrentUser();
  if (!user || !user.isActive) return null;
  if (admin && user.role !== "administrator") return null;
  return user;
}
export function apiError(message: string, status = 503) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export function apiData(data: unknown) {
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
