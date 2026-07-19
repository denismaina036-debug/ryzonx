import { Webhook } from "standardwebhooks";
import { getRegistryTemplate } from "@/domain/communication/template-registry";
import { appUrl, getAuthCallbackUrl } from "@/lib/app-url";
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

function resolveHookSecret(): string | null {
  const raw = process.env.SEND_EMAIL_HOOK_SECRET?.trim();
  if (!raw) return null;
  return raw.replace(/^v1,whsec_/, "");
}

export function verifySupabaseSendEmailRequest(
  payload: string,
  headers: Record<string, string>
): SupabaseSendEmailPayload {
  const secret = resolveHookSecret();
  if (!secret) {
    throw new Error("SEND_EMAIL_HOOK_SECRET is not configured.");
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

export function buildSupabaseVerifyUrl(
  emailData: SupabaseSendEmailPayload["email_data"],
  options?: { tokenHash?: string; type?: string; redirectTo?: string }
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  const tokenHash = options?.tokenHash ?? emailData.token_hash;
  const type = options?.type ?? emailData.email_action_type;
  const redirectTo =
    options?.redirectTo ||
    emailData.redirect_to ||
    getAuthCallbackUrl();

  const params = new URLSearchParams({
    token: tokenHash,
    type,
    redirect_to: redirectTo,
  });

  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`;
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
    const currentLink = buildSupabaseVerifyUrl(emailData, {
      tokenHash: emailData.token_hash_new ?? emailData.token_hash,
      type: "email_change",
    });
    const newLink = buildSupabaseVerifyUrl(emailData, {
      tokenHash: emailData.token_hash,
      type: "email_change",
      redirectTo: emailData.redirect_to || getAuthCallbackUrl(),
    });

    await sendAuthEmail(user.email, currentLink);
    await sendAuthEmail(user.new_email, newLink);
    return;
  }

  const verificationLink = buildSupabaseVerifyUrl(emailData);
  await sendAuthEmail(user.email, verificationLink);
}
