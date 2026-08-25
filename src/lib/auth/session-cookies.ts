import type { NextRequest } from "next/server";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { Session } from "@supabase/supabase-js";

const SUPABASE_AUTH_COOKIE_PATTERN = /^(sb-.+-auth-token)(?:\.(\d+))?$/;
const BASE64_PREFIX = "base64-";

type ServerCookieStore = Pick<ReadonlyRequestCookies, "getAll">;

export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

/**
 * Detect Supabase auth session cookies on the request.
 * Used when server-side Supabase calls fail (e.g. local SSL issues).
 */
export function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => isSupabaseAuthCookieName(cookie.name));
}

/** Server Component / Route Handler cookie store variant. */
export function hasServerSupabaseSessionCookie(
  cookieStore: ServerCookieStore
): boolean {
  return cookieStore.getAll().some((cookie) => isSupabaseAuthCookieName(cookie.name));
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeSessionCookie(value: string): unknown {
  const decoded = value.startsWith(BASE64_PREFIX)
    ? decodeBase64Url(value.slice(BASE64_PREFIX.length))
    : value;

  return JSON.parse(decoded) as unknown;
}

function isCookieSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Session>;
  return (
    typeof candidate.access_token === "string" &&
    candidate.access_token.length > 0 &&
    !!candidate.user &&
    typeof candidate.user === "object" &&
    typeof candidate.user.id === "string" &&
    candidate.user.id.length > 0
  );
}

/**
 * Read the Supabase session cookie without invoking GoTrue token recovery.
 * Public pages use this to ignore expired or malformed browser sessions
 * instead of surfacing refresh-token errors to anonymous visitors.
 */
export function readServerSupabaseSession(cookieStore: ServerCookieStore): Session | null {
  const cookies = cookieStore.getAll();
  const cookieBases = new Set<string>();

  for (const cookie of cookies) {
    const match = SUPABASE_AUTH_COOKIE_PATTERN.exec(cookie.name);
    if (match?.[1]) cookieBases.add(match[1]);
  }

  for (const baseName of cookieBases) {
    const directValue = cookies.find((cookie) => cookie.name === baseName)?.value;
    let encodedValue = directValue;

    if (!encodedValue) {
      const chunks = cookies
        .map((cookie) => {
          const match = SUPABASE_AUTH_COOKIE_PATTERN.exec(cookie.name);
          if (match?.[1] !== baseName || match[2] === undefined) return null;
          return { index: Number(match[2]), value: cookie.value };
        })
        .filter((chunk): chunk is { index: number; value: string } => chunk !== null)
        .sort((left, right) => left.index - right.index);

      if (chunks.length > 0 && chunks.every((chunk, index) => chunk.index === index)) {
        encodedValue = chunks.map((chunk) => chunk.value).join("");
      }
    }

    if (!encodedValue) continue;

    try {
      const session = decodeSessionCookie(encodedValue);
      if (isCookieSession(session)) return session;
    } catch {
      // A broken or partially removed cookie is an anonymous public session.
    }
  }

  return null;
}
