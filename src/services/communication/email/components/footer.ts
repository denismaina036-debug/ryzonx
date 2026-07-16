import { EMAIL_BRAND, EMAIL_COLORS, EMAIL_FONTS } from "../tokens";
import { cellStyle, escapeHtml } from "./utils";

export function emailSupportSection(): string {
  return `
<tr>
  <td style="padding:8px 24px 24px;${cellStyle()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr>
        <td style="padding:16px 20px;background:${EMAIL_COLORS.surfaceMuted};border-radius:12px;border:1px solid ${EMAIL_COLORS.border};">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${EMAIL_COLORS.text};font-family:${EMAIL_FONTS.sans};">Need help?</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:${EMAIL_COLORS.textSecondary};font-family:${EMAIL_FONTS.sans};">
            Our support team is here for you. Email
            <a href="mailto:${EMAIL_BRAND.supportEmail}" style="color:${EMAIL_COLORS.accent};text-decoration:none;font-weight:600;">${EMAIL_BRAND.supportEmail}</a>
            or visit your dashboard.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}

export function emailFooter(vars: {
  preferencesUrl?: string;
  unsubscribeUrl?: string;
  showUnsubscribe?: boolean;
}): string {
  const year = new Date().getFullYear();
  const prefs = vars.preferencesUrl ?? `${EMAIL_BRAND.websiteUrl}/dashboard/settings`;
  const unsub = vars.showUnsubscribe
    ? `<p style="margin:12px 0 0;font-size:11px;color:${EMAIL_COLORS.textMuted};"><a href="${escapeHtml(vars.unsubscribeUrl ?? prefs)}" style="color:${EMAIL_COLORS.textMuted};text-decoration:underline;">Unsubscribe</a> from marketing emails</p>`
    : "";

  return `
<tr>
  <td style="padding:16px 24px 40px;${cellStyle()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;border-top:1px solid ${EMAIL_COLORS.border};">
      <tr>
        <td align="center" style="padding:28px 8px 0;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${EMAIL_COLORS.text};font-family:${EMAIL_FONTS.sans};">${escapeHtml(EMAIL_BRAND.name)}</p>
          <p style="margin:0 0 16px;font-size:12px;color:${EMAIL_COLORS.textMuted};font-family:${EMAIL_FONTS.sans};">
            <a href="mailto:${EMAIL_BRAND.supportEmail}" style="color:${EMAIL_COLORS.textSecondary};text-decoration:none;">${EMAIL_BRAND.supportEmail}</a>
            &nbsp;·&nbsp;
            <a href="${EMAIL_BRAND.websiteUrl}" style="color:${EMAIL_COLORS.textSecondary};text-decoration:none;">${EMAIL_BRAND.websiteUrl.replace("https://", "")}</a>
          </p>
          <p style="margin:0;font-size:11px;line-height:1.6;color:${EMAIL_COLORS.textMuted};font-family:${EMAIL_FONTS.sans};">
            © ${year} ${escapeHtml(EMAIL_BRAND.name)}. All rights reserved.<br />
            Investing involves risk. Past performance does not guarantee future results.<br />
            <a href="${EMAIL_BRAND.privacyUrl}" style="color:${EMAIL_COLORS.textMuted};text-decoration:underline;">Privacy Policy</a>
            &nbsp;·&nbsp;
            <a href="${EMAIL_BRAND.termsUrl}" style="color:${EMAIL_COLORS.textMuted};text-decoration:underline;">Terms of Service</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(prefs)}" style="color:${EMAIL_COLORS.textMuted};text-decoration:underline;">Notification Preferences</a>
          </p>
          ${unsub}
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}
