import { sanitizeLegalHtml } from "@/lib/legal/sanitize-html";
import { EMAIL_COLORS, EMAIL_FONTS } from "./tokens";

export function adminMessageHtmlToPlainText(html: string): string {
  const clean = sanitizeLegalHtml(html);
  return clean
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isAdminMessageHtmlEmpty(html: string): boolean {
  return !adminMessageHtmlToPlainText(html);
}

function addTagStyle(tag: string, style: string, html: string): string {
  const pattern = new RegExp(`<${tag}(?![^>]*style=)(\\s[^>]*)?>`, "gi");
  return html.replace(pattern, `<${tag} style="${style}"$1>`);
}

function formatAdminMessageHtmlForEmail(html: string): string {
  const pStyle = `margin:0 0 16px;font-size:15px;line-height:1.65;color:${EMAIL_COLORS.textSecondary};font-family:${EMAIL_FONTS.sans};`;
  const h2Style = `margin:0 0 12px;font-size:20px;line-height:1.35;font-weight:700;color:${EMAIL_COLORS.text};font-family:${EMAIL_FONTS.sans};`;
  const h3Style = `margin:0 0 10px;font-size:17px;line-height:1.4;font-weight:700;color:${EMAIL_COLORS.text};font-family:${EMAIL_FONTS.sans};`;
  const listStyle = `margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:${EMAIL_COLORS.textSecondary};font-family:${EMAIL_FONTS.sans};`;
  const blockquoteStyle = `margin:0 0 16px;padding:12px 16px;border-left:4px solid ${EMAIL_COLORS.border};background:${EMAIL_COLORS.surfaceMuted};font-size:15px;line-height:1.65;color:${EMAIL_COLORS.textSecondary};font-family:${EMAIL_FONTS.sans};`;
  const linkStyle = `color:${EMAIL_COLORS.accent};text-decoration:underline;`;

  let formatted = html;
  formatted = addTagStyle("p", pStyle, formatted);
  formatted = addTagStyle("h2", h2Style, formatted);
  formatted = addTagStyle("h3", h3Style, formatted);
  formatted = addTagStyle("ul", listStyle, formatted);
  formatted = addTagStyle("ol", listStyle, formatted);
  formatted = addTagStyle("blockquote", blockquoteStyle, formatted);
  formatted = formatted.replace(/<a(?![^>]*style=)(\s[^>]*)?>/gi, `<a style="${linkStyle}"$1>`);
  return formatted;
}

export function prepareAdminMessageContent(html: string): { html: string; plainText: string } {
  const sanitized = sanitizeLegalHtml(html);
  const plainText = adminMessageHtmlToPlainText(sanitized);
  return {
    html: formatAdminMessageHtmlForEmail(sanitized),
    plainText,
  };
}
