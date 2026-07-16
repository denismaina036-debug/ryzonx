import { EMAIL_COLORS, EMAIL_FONTS } from "../tokens";
import { CARD_STYLE, cellStyle, escapeHtml } from "./utils";

export function emailPrimaryButton(label: string, href: string): string {
  return `
<tr>
  <td align="center" style="padding:8px 24px 24px;${cellStyle()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr>
        <td align="center" style="padding:0 8px;">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,${EMAIL_COLORS.accent} 0%,${EMAIL_COLORS.accentDark} 100%);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;font-family:${EMAIL_FONTS.sans};box-shadow:0 4px 14px rgba(37,99,235,0.35);">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}

export function emailSecondaryButton(label: string, href: string): string {
  return `
<tr>
  <td align="center" style="padding:0 24px 16px;${cellStyle()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr>
        <td align="center" style="padding:0 8px;">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;background:${EMAIL_COLORS.surfaceMuted};color:${EMAIL_COLORS.text};font-size:13px;font-weight:600;text-decoration:none;border-radius:12px;border:1px solid ${EMAIL_COLORS.border};font-family:${EMAIL_FONTS.sans};">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}

export function emailIntro(text: string): string {
  return `
<tr>
  <td style="padding:0 24px;${cellStyle()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr>
        <td style="padding:0 8px 20px;font-size:15px;line-height:1.65;color:${EMAIL_COLORS.textSecondary};font-family:${EMAIL_FONTS.sans};">
          ${escapeHtml(text)}
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}

export function emailContentCard(innerHtml: string): string {
  return `
<tr>
  <td style="padding:0 24px 16px;${cellStyle()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;${CARD_STYLE}">
      <tr>
        <td style="padding:24px 28px;font-family:${EMAIL_FONTS.sans};">
          ${innerHtml}
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${EMAIL_COLORS.textSecondary};">${escapeHtml(text)}</p>`;
}

export function emailInfoCard(label: string, value: string): string {
  return `
<div style="margin-bottom:12px;padding:14px 16px;background:${EMAIL_COLORS.surfaceMuted};border-radius:12px;border:1px solid ${EMAIL_COLORS.border};">
  <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.textMuted};">${escapeHtml(label)}</p>
  <p style="margin:0;font-size:16px;font-weight:600;color:${EMAIL_COLORS.text};font-family:${EMAIL_FONTS.mono};">${escapeHtml(value)}</p>
</div>`.trim();
}

export function emailMetricRow(items: Array<{ label: string; value: string }>): string {
  const cells = items
    .map(
      (item) => `
    <td width="${Math.floor(100 / items.length)}%" valign="top" style="padding:8px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.textMuted};">${escapeHtml(item.label)}</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:${EMAIL_COLORS.text};font-family:${EMAIL_FONTS.mono};">${escapeHtml(item.value)}</p>
    </td>`
    )
    .join("");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 4px;">
  <tr>${cells}</tr>
</table>`.trim();
}

export function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${EMAIL_COLORS.border};margin:20px 0;" />`;
}
