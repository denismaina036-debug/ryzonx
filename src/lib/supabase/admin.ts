import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { env } from "@/lib/env";
import { getServerEnv } from "@/lib/env";

/**
 * Supabase admin client with service role key.
 * BYPASSES Row Level Security — use only in trusted server contexts.
 *
 * Use cases:
 *   - Admin operations (approve deposits, publish trades)
 *   - Background jobs and cron tasks
 *   - Audit logging
 */
export function createAdminClient() {
  const serverEnv = getServerEnv();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
