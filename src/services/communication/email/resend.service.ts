import { env } from "@/lib/env";

export interface SendResendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendResendEmailResult {
  id: string;
}

function getResendConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ?? "RyvonX <notifications@ryvonx.com>";
  if (!apiKey) return null;
  return { apiKey, from };
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendResendEmail(
  input: SendResendEmailInput
): Promise<SendResendEmailResult> {
  const config = getResendConfig();
  if (!config) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  void env;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.message ?? `Resend API error (${response.status})`);
  }

  if (!body.id) {
    throw new Error("Resend did not return a message id.");
  }

  return { id: body.id };
}
