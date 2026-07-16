import { EMAIL_COLORS, EMAIL_FONTS } from "../tokens";
import { cellStyle, escapeHtml } from "./utils";

export function emailGreeting(firstName: string, timeGreeting?: string): string {
  const prefix = timeGreeting?.trim() || "Hello";
  const name = firstName.trim() || "there";
  return `
<tr>
  <td style="padding:8px 24px 0;${cellStyle()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr>
        <td style="padding:0 8px 16px;font-size:16px;line-height:1.6;color:${EMAIL_COLORS.textSecondary};font-family:${EMAIL_FONTS.sans};">
          ${escapeHtml(prefix)} ${escapeHtml(name)},
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}
