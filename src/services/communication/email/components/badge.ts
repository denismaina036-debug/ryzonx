import { EMAIL_COLORS, EMAIL_FONTS } from "../tokens";
import { escapeHtml } from "./utils";

export type EmailBadgeVariant =
  | "pending"
  | "approved"
  | "completed"
  | "rejected"
  | "under_review"
  | "action_required"
  | "verified"
  | "healthy"
  | "warning"
  | "suspended"
  | "info";

const BADGE_STYLES: Record<EmailBadgeVariant, { bg: string; color: string }> = {
  pending: { bg: EMAIL_COLORS.warningSoft, color: EMAIL_COLORS.warning },
  approved: { bg: EMAIL_COLORS.successSoft, color: EMAIL_COLORS.success },
  completed: { bg: EMAIL_COLORS.successSoft, color: EMAIL_COLORS.success },
  rejected: { bg: EMAIL_COLORS.dangerSoft, color: EMAIL_COLORS.danger },
  under_review: { bg: EMAIL_COLORS.infoSoft, color: EMAIL_COLORS.info },
  action_required: { bg: EMAIL_COLORS.warningSoft, color: EMAIL_COLORS.warning },
  verified: { bg: EMAIL_COLORS.successSoft, color: EMAIL_COLORS.success },
  healthy: { bg: EMAIL_COLORS.successSoft, color: EMAIL_COLORS.success },
  warning: { bg: EMAIL_COLORS.warningSoft, color: EMAIL_COLORS.warning },
  suspended: { bg: EMAIL_COLORS.dangerSoft, color: EMAIL_COLORS.danger },
  info: { bg: EMAIL_COLORS.infoSoft, color: EMAIL_COLORS.info },
};

export function emailStatusBadge(label: string, variant: EmailBadgeVariant): string {
  const style = BADGE_STYLES[variant] ?? BADGE_STYLES.info;
  return `
<span style="display:inline-block;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:${style.bg};color:${style.color};font-family:${EMAIL_FONTS.sans};">
  ${escapeHtml(label)}
</span>`.trim();
}
