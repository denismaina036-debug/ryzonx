import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { env } from "@/lib/env";

/**
 * Supabase client for browser/client components.
 * Uses the anon key — RLS policies enforce access control.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
