import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureInvestorBootstrap } from "@/lib/auth/ensure-investor-bootstrap";

/**
 * Server-side safety net after signup — creates profile/portfolio if the DB
 * trigger did not run or partially failed.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await ensureInvestorBootstrap(user);
    return NextResponse.json({ ok: true });
  } catch (bootstrapError) {
    const message =
      bootstrapError instanceof Error
        ? bootstrapError.message
        : "Bootstrap failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
