import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthCallbackUrl } from "@/lib/app-url";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import {
  buildAuthConfirmUrl,
  sendAuthTemplateEmail,
} from "@/lib/auth/supabase-send-email-hook";
import { isResendConfigured } from "@/services/communication/email/resend.service";

export type RegisterWithEmailResult =
  | { needsVerification: true; user: Pick<User, "id" | "email"> }
  | { needsVerification: false; user: User };

/**
 * Register via Admin API + Resend verification email.
 * Bypasses Supabase built-in mailer rate limits and the Send Email hook for signup.
 */
export async function registerUserWithVerificationEmail(input: {
  email: string;
  password: string;
  metadata: Record<string, string>;
}): Promise<RegisterWithEmailResult> {
  if (!isResendConfigured()) {
    throw new Error(
      "RESEND_API_KEY is not configured. Auth emails cannot be sent in production."
    );
  }

  const admin = createAdminClient();
  const redirectTo = getAuthCallbackUrl();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: {
      data: input.metadata,
      redirectTo,
    },
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }

  const user = data.user;
  if (!user?.id) {
    throw new Error("Account creation failed. Please try again.");
  }

  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error("Verification token was not generated. Please try again.");
  }

  const verificationLink = buildAuthConfirmUrl(
    {
      token: "",
      token_hash: hashedToken,
      redirect_to: redirectTo,
      email_action_type: "signup",
      site_url: redirectTo,
    },
    { tokenHash: hashedToken, type: "signup", next: "/dashboard" }
  );

  await sendAuthTemplateEmail({
    to: input.email,
    actionType: "signup",
    user: {
      email: input.email,
      user_metadata: input.metadata,
    },
    verificationLink,
  });

  if (user.email_confirmed_at) {
    return { needsVerification: false, user };
  }

  return {
    needsVerification: true,
    user: { id: user.id, email: user.email ?? input.email },
  };
}
