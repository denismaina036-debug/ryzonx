import { EMAIL_COLORS, EMAIL_FONTS } from "../tokens";
import { escapeHtml } from "./utils";

export type AlertVariant = "success" | "warning" | "info" | "danger";

const ALERT_STYLES: Record<AlertVariant, { bg: string; border: string; color: string }> = {
  success: { bg: EMAIL_COLORS.successSoft, border: "#a7f3d0", color: EMAIL_COLORS.success },
  warning: { bg: EMAIL_COLORS.warningSoft, border: "#fde68a", color: EMAIL_COLORS.warning },
  info: { bg: EMAIL_COLORS.infoSoft, border: "#bfdbfe", color: EMAIL_COLORS.info },
  danger: { bg: EMAIL_COLORS.dangerSoft, border: "#fecaca", color: EMAIL_COLORS.danger },
};

export function emailAlertBox(text: string, variant: AlertVariant = "info"): string {
  const s = ALERT_STYLES[variant];
  return `
<div style="margin:12px 0;padding:14px 16px;background:${s.bg};border:1px solid ${s.border};border-radius:12px;">
  <p style="margin:0;font-size:14px;line-height:1.6;color:${s.color};font-family:${EMAIL_FONTS.sans};">${escapeHtml(text)}</p>
</div>`.trim();
}

export function emailTimelineBlock(
  items: Array<{ label: string; value: string }>
): string {
  const rows = items
    .map(
      (item, i) => `
    <tr>
      <td valign="top" width="24" style="padding:8px 12px 8px 0;font-size:12px;color:${EMAIL_COLORS.textMuted};">${i + 1}.</td>
      <td valign="top" style="padding:8px 0;border-bottom:1px solid ${EMAIL_COLORS.border};">
        <p style="margin:0 0 2px;font-size:12px;font-weight:600;color:${EMAIL_COLORS.textMuted};">${escapeHtml(item.label)}</p>
        <p style="margin:0;font-size:14px;color:${EMAIL_COLORS.text};">${escapeHtml(item.value)}</p>
      </td>
    </tr>`
    )
    .join("");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0;">
  ${rows}
</table>`.trim();
}
