import { EMAIL_BRAND, EMAIL_COLORS, EMAIL_FONTS } from "../tokens";
import { cellStyle, escapeHtml } from "./utils";

export function emailHeader(title: string): string {
  return `
<tr>
  <td align="center" style="padding:40px 24px 8px;${cellStyle()}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <div style="display:inline-block;font-size:22px;font-weight:700;letter-spacing:-0.03em;color:${EMAIL_COLORS.text};font-family:${EMAIL_FONTS.sans};">
            ${escapeHtml(EMAIL_BRAND.name)}
          </div>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:0 8px;">
          <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${EMAIL_COLORS.text};font-family:${EMAIL_FONTS.sans};">
            ${escapeHtml(title)}
          </h1>
        </td>
      </tr>
    </table>
  </td>
</tr>`.trim();
}
