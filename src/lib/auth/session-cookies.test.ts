import { describe, expect, it } from "vitest";
import { readServerSupabaseSession } from "@/lib/auth/session-cookies";

function cookieStore(cookies: Array<{ name: string; value: string }>) {
  return { getAll: () => cookies };
}

function sessionJson() {
  return JSON.stringify({
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: { id: "user-1", aud: "authenticated", role: "authenticated" },
  });
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

describe("readServerSupabaseSession", () => {
  it("reads an unchunked base64url Supabase session", () => {
    const session = readServerSupabaseSession(
      cookieStore([
        {
          name: "sb-project-auth-token",
          value: `base64-${base64Url(sessionJson())}`,
        },
      ])
    );

    expect(session?.user.id).toBe("user-1");
    expect(session?.access_token).toBe("access-token");
  });

  it("combines ordered session-cookie chunks", () => {
    const encoded = `base64-${base64Url(sessionJson())}`;
    const splitAt = Math.floor(encoded.length / 2);
    const session = readServerSupabaseSession(
      cookieStore([
        { name: "sb-project-auth-token.0", value: encoded.slice(0, splitAt) },
        { name: "sb-project-auth-token.1", value: encoded.slice(splitAt) },
      ])
    );

    expect(session?.user.id).toBe("user-1");
  });

  it("treats malformed and incomplete sessions as anonymous", () => {
    expect(
      readServerSupabaseSession(
        cookieStore([{ name: "sb-project-auth-token", value: "base64-not-valid" }])
      )
    ).toBeNull();

    expect(
      readServerSupabaseSession(
        cookieStore([{ name: "sb-project-auth-token", value: JSON.stringify({ user: {} }) }])
      )
    ).toBeNull();
  });
});
