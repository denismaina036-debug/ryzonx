import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { env } from "@/lib/env";

/** Preserves full Supabase schema typing from createServerClient. */
function createServerSupabaseClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // setAll called from Server Component — safe to ignore
            // when middleware handles session refresh.
          }
        },
      },
    }
  );
}

export type ServerSupabaseClient = ReturnType<typeof createServerSupabaseClient>;

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads auth session from cookies.
 */
export async function createClient(): Promise<ServerSupabaseClient> {
  const cookieStore = await cookies();
  return createServerSupabaseClient(cookieStore);
}
