import { Webhook, WebhookVerificationError } from "standardwebhooks";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getRegistryTemplate } from "@/domain/communication/template-registry";
import { appUrl } from "@/lib/app-url";
import { renderTemplateWithPremium } from "@/services/communication/email/catalog-bridge";
import { sendResendEmail, isResendConfigured } from "@/services/communication/email/resend.service";

export interface SupabaseSendEmailPayload {
  user: {
    email: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    old_email?: string;
  };
}

const ACTION_TEMPLATE_SLUG: Record<string, string> = {
  signup: "email_verification",
  invite: "welcome",
  magiclink: "email_verification",
  recovery: "security_password_reset",
  email_change: "security_alert",
  reauthentication: "security_alert",
  password_changed_notification: "password_changed",
  email_changed_notification: "profile_updated",
};

const STANDARD_WEBHOOK_HEADERS = {
  "webhook-id": ["webhook-id", "svix-id"],
  "webhook-timestamp": ["webhook-timestamp", "svix-timestamp"],
  "webhook-signature": ["webhook-signature", "svix-signature"],
} as const;

function getHeaderValue(
  headers: Headers,
  names: readonly string[]
): string | null {
  for (const name of names) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Normalize incoming Standard Webhooks headers for verification.
 * Supabase Auth hooks use webhook-* names; some providers use svix-* aliases.
 */
export function collectStandardWebhookHeaders(
  headers: Headers
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [canonical, aliases] of Object.entries(STANDARD_WEBHOOK_HEADERS)) {
    const value = getHeaderValue(headers, aliases);
    if (value) {
      normalized[canonical] = value;
    }
  }

  return normalized;
}

/** Logs header names only — never values or secrets. */
export function logIncomingWebhookHeaderNames(headers: Headers): void {
  const names = [...headers.keys()].sort();
  const normalized = collectStandardWebhookHeaders(headers);
  const present = Object.keys(normalized).sort();
  const missing = Object.keys(STANDARD_WEBHOOK_HEADERS).filter(
    (name) => !normalized[name]
  );

  console.info(
    "[auth/send-email] incoming header names:",
    names.length > 0 ? names.join(", ") : "(none)"
  );
  console.info(
    "[auth/send-email] standard webhook headers present:",
    present.length > 0 ? present.join(", ") : "(none)"
  );
  if (missing.length > 0) {
    console.info(
      "[auth/send-email] standard webhook headers missing:",
      missing.join(", ")
    );
  }
}

function resolveHookSecret(): string | null {
  const raw = process.env.SEND_EMAIL_HOOK_SECRET?.trim().replace(/^["']|["']$/g, "");
  if (!raw) return null;
  return raw.replace(/^v1,whsec_/, "");
}

export function getSendEmailHookConfigStatus(): {
  hookSecretConfigured: boolean;
  resendConfigured: boolean;
  emailFrom: string;
} {
  return {
    hookSecretConfigured: Boolean(resolveHookSecret()),
    resendConfigured: isResendConfigured(),
    emailFrom:
      process.env.EMAIL_FROM?.trim() ?? "RyvonX <notifications@ryvonx.com>",
  };
}

export function verifySupabaseSendEmailRequest(
  payload: string,
  requestHeaders: Headers
): SupabaseSendEmailPayload {
  const secret = resolveHookSecret();
  if (!secret) {
    throw new Error("SEND_EMAIL_HOOK_SECRET is not configured.");
  }

  const headers = collectStandardWebhookHeaders(requestHeaders);
  const missing = Object.keys(STANDARD_WEBHOOK_HEADERS).filter(
    (name) => !headers[name]
  );
  if (missing.length > 0) {
    throw new WebhookVerificationError(
      `Missing required headers: ${missing.join(", ")}`
    );
  }

  const wh = new Webhook(secret);
  return wh.verify(payload, headers) as SupabaseSendEmailPayload;
}

function firstNameFromUser(user: SupabaseSendEmailPayload["user"]): string {
  const meta = user.user_metadata ?? {};
  const first =
    (typeof meta.first_name === "string" && meta.first_name) ||
    (typeof meta.full_name === "string" && meta.full_name.split(/\s+/)[0]) ||
    "there";
  return first;
}

export function mapEmailActionToVerifyOtpType(actionType: string): EmailOtpType {
  switch (actionType) {
    case "recovery":
      return "recovery";
    case "invite":
      return "invite";
    case "email_change":
      return "email_change";
    case "magiclink":
      return "magiclink";
    case "signup":
    default:
      return "email";
  }
}

function resolveConfirmNextPath(
  emailData: SupabaseSendEmailPayload["email_data"],
  actionType: string
): string {
  if (actionType === "recovery") {
    return "/reset-password";
  }

  const redirectTo = emailData.redirect_to?.trim();
  if (redirectTo) {
    try {
      const url = new URL(redirectTo);
      if (url.pathname === "/auth/callback") {
        return "/dashboard";
      }
      const path = `${url.pathname}${url.search}`;
      if (path.startsWith("/")) {
        return path;
      }
    } catch {
      if (redirectTo.startsWith("/")) {
        return redirectTo;
      }
    }
  }

  return "/dashboard";
}

/**
 * Build PKCE-compatible confirmation URL handled by /auth/confirm.
 * Do not link to Supabase /auth/v1/verify when using SSR + @supabase/ssr.
 */
export function buildAuthConfirmUrl(
  emailData: SupabaseSendEmailPayload["email_data"],
  options?: { tokenHash?: string; type?: string; next?: string }
): string {
  const tokenHash = options?.tokenHash ?? emailData.token_hash;
  const actionType = options?.type ?? emailData.email_action_type;
  const otpType = mapEmailActionToVerifyOtpType(actionType);
  const next = options?.next ?? resolveConfirmNextPath(emailData, actionType);

  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: otpType,
    next,
  });

  return appUrl(`/auth/confirm?${params.toString()}`);
}

function templateSlugForAction(actionType: string): string {
  return ACTION_TEMPLATE_SLUG[actionType] ?? "security_alert";
}

function buildTemplateVariables(
  user: SupabaseSendEmailPayload["user"],
  emailData: SupabaseSendEmailPayload["email_data"],
  verificationLink: string
): Record<string, string> {
  const firstName = firstNameFromUser(user);
  return {
    first_name: firstName,
    last_name:
      typeof user.user_metadata?.last_name === "string"
        ? user.user_metadata.last_name
        : "",
    fullName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : firstName,
    dashboard_link: appUrl("/dashboard"),
    preferences_url: appUrl("/dashboard/settings"),
    unsubscribe_url: appUrl("/dashboard/settings"),
    verification_link: verificationLink,
    alert_message:
      emailData.email_action_type === "email_change"
        ? "Confirm the email change request for your RyvonX account."
        : "Review recent activity on your RyvonX account.",
  };
}

export async function handleSupabaseSendEmailHook(
  payload: SupabaseSendEmailPayload
): Promise<void> {
  if (!isResendConfigured()) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const { user, email_data: emailData } = payload;
  const slug = templateSlugForAction(emailData.email_action_type);
  const template = getRegistryTemplate(slug);
  if (!template) {
    throw new Error(`Auth email template not found: ${slug}`);
  }
  const authTemplate = template;

  async function sendAuthEmail(to: string, verificationLink: string) {
    const variables = buildTemplateVariables(user, emailData, verificationLink);
    const rendered = renderTemplateWithPremium(authTemplate, variables);
    await sendResendEmail({
      to,
      subject: rendered.subject ?? "RyvonX",
      html: rendered.html ?? `<pre>${rendered.body}</pre>`,
      text: rendered.plainText ?? rendered.body,
    });
  }

  if (emailData.email_action_type === "email_change" && user.new_email) {
    const currentLink = buildAuthConfirmUrl(emailData, {
      tokenHash: emailData.token_hash_new ?? emailData.token_hash,
      type: "email_change",
    });
    const newLink = buildAuthConfirmUrl(emailData, {
      tokenHash: emailData.token_hash,
      type: "email_change",
    });

    await sendAuthEmail(user.email, currentLink);
    await sendAuthEmail(user.new_email, newLink);
    return;
  }

  const verificationLink = buildAuthConfirmUrl(emailData);
  await sendAuthEmail(user.email, verificationLink);
}
