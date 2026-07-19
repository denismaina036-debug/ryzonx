import { NextResponse } from "next/server";
import { WebhookVerificationError } from "standardwebhooks";
import {
  getSendEmailHookConfigStatus,
  handleSupabaseSendEmailHook,
  logIncomingWebhookHeaderNames,
  verifySupabaseSendEmailRequest,
} from "@/lib/auth/supabase-send-email-hook";

export const runtime = "nodejs";

/**
 * Supabase Auth Send Email hook.
 * Receives auth email events, renders RyvonX templates, sends via Resend.
 * @see https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 */
export async function GET() {
  const status = getSendEmailHookConfigStatus();
  const ready = status.hookSecretConfigured && status.resendConfigured;

  return NextResponse.json(
    {
      ok: ready,
      ...status,
      endpoint: "POST only for Supabase hook calls",
    },
    { status: ready ? 200 : 503 }
  );
}

export async function POST(request: Request) {
  logIncomingWebhookHeaderNames(request.headers);

  const payload = await request.text();

  try {
    const verified = verifySupabaseSendEmailRequest(payload, request.headers);
    await handleSupabaseSendEmailHook(verified);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send email hook failed";
    console.error("[auth/send-email]", message, error);

    const status =
      error instanceof WebhookVerificationError ||
      message.includes("Missing required headers")
        ? 401
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
