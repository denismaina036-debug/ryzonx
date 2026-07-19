import { NextResponse } from "next/server";
import {
  handleSupabaseSendEmailHook,
  verifySupabaseSendEmailRequest,
} from "@/lib/auth/supabase-send-email-hook";

export const runtime = "nodejs";

/**
 * Supabase Auth Send Email hook.
 * Receives auth email events, renders RyvonX templates, sends via Resend.
 * @see https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  try {
    const verified = verifySupabaseSendEmailRequest(payload, headers);
    await handleSupabaseSendEmailHook(verified);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send email hook failed";
    console.error("[auth/send-email]", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
