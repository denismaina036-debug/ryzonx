import { createAdminClient } from "@/lib/supabase/admin";

export interface OutboundEmailConfig {
  from: string;
  replyTo?: string;
}

function formatFromAddress(name: string | undefined, email: string): string {
  const trimmedEmail = email.trim();
  const trimmedName = name?.trim();
  if (trimmedName) {
    return `${trimmedName} <${trimmedEmail}>`;
  }
  return trimmedEmail;
}

/** Resolves sender + reply-to from admin communication settings with env fallbacks. */
export async function getOutboundEmailConfig(): Promise<OutboundEmailConfig> {
  const envFrom =
    process.env.EMAIL_FROM?.trim() ?? "RyvonX <notifications@ryvonx.com>";

  try {
    const db = createAdminClient();
    const { data } = await db
      .from("communication_settings")
      .select("value")
      .eq("key", "sender")
      .maybeSingle();

    const sender = (data as { value?: unknown } | null)?.value as
      | { name?: string; email?: string; reply_to?: string }
      | undefined;

    if (sender?.email?.trim()) {
      return {
        from: formatFromAddress(sender.name, sender.email),
        replyTo: sender.reply_to?.trim() || undefined,
      };
    }
  } catch {
    // Fall back to environment configuration.
  }

  return { from: envFrom };
}
