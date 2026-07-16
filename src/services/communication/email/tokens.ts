/** RyvonX premium email design tokens — inline-safe for email clients */

export const EMAIL_BRAND = {
  name: "RyvonX",
  tagline: "Transparent pool trading · Professional wealth management",
  supportEmail: "support@ryvonx.com",
  websiteUrl: "https://ryvonx.com",
  privacyUrl: "https://ryvonx.com/privacy",
  termsUrl: "https://ryvonx.com/terms",
  logoUrl: "https://ryvonx.com/email/logo.png",
  logoAlt: "RyvonX",
} as const;

export const EMAIL_COLORS = {
  background: "#f4f6f9",
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  border: "#e2e8f0",
  accent: "#2563eb",
  accentDark: "#1d4ed8",
  accentSoft: "#eff6ff",
  success: "#059669",
  successSoft: "#ecfdf5",
  warning: "#d97706",
  warningSoft: "#fffbeb",
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  info: "#2563eb",
  infoSoft: "#eff6ff",
} as const;

export const EMAIL_FONTS = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;
