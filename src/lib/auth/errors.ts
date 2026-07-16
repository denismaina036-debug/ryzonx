import type { AuthError } from "@supabase/supabase-js";

const AUTH_CODE_MESSAGES: Record<string, string> = {
  user_already_exists:
    "An account with this email already exists. Try signing in instead.",
  email_exists:
    "An account with this email already exists. Try signing in instead.",
  email_address_invalid: "Please enter a valid email address.",
  weak_password:
    "Password is too weak. Use at least 8 characters with uppercase, lowercase, and a number.",
  signup_disabled: "Registration is currently disabled.",
  unexpected_failure:
    "We could not finish creating your account. Please try again in a moment.",
  over_email_send_rate_limit:
    "Too many signup attempts. Please wait a few minutes and try again.",
  validation_failed: "Please check your details and try again.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid signup details. Please review the form and try again.",
  422: "Invalid signup details. Please review the form and try again.",
  429: "Too many attempts. Please wait a few minutes and try again.",
  500: "Server error while creating your account. Please try again shortly.",
  503: "The authentication service is temporarily unavailable. Please try again.",
};

function isEmptyJsonMessage(message: string | undefined): boolean {
  if (!message) return true;
  const trimmed = message.trim();
  return trimmed === "{}" || trimmed === "[]" || trimmed === "[object Object]";
}

/**
 * User-friendly message for Supabase auth failures.
 */
export function getAuthErrorMessage(error: AuthError | Error): string {
  const authError = error as AuthError;
  const code =
    typeof authError.code === "string" ? authError.code : undefined;
  const status =
    "status" in authError && typeof authError.status === "number"
      ? authError.status
      : undefined;

  if (code && AUTH_CODE_MESSAGES[code]) {
    return AUTH_CODE_MESSAGES[code];
  }

  const message = error.message?.trim();
  if (message?.includes("Database error saving new user")) {
    return "Account setup failed in the database. Run the latest Supabase migration, or try a different email.";
  }

  if (message && !isEmptyJsonMessage(message) && message !== "0") {
    return message;
  }

  if (status === 0 || message === "0") {
    return "Unable to reach the server. Check your connection and Supabase configuration.";
  }

  if (
    message?.includes("fetch failed") ||
    message?.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE")
  ) {
    return "Could not connect to Supabase. Check your internet connection and try again.";
  }

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  if (code === "unexpected_failure" || status === 500) {
    return "Account setup failed on the server. If this keeps happening, contact support.";
  }

  return "Something went wrong during registration. Please try again.";
}
