import { EMAIL_COLORS, EMAIL_FONTS } from "../tokens";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function cellStyle(extra = ""): string {
  return `font-family:${EMAIL_FONTS.sans};${extra}`;
}

export const CARD_STYLE = `
  background:${EMAIL_COLORS.surface};
  border:1px solid ${EMAIL_COLORS.border};
  border-radius:16px;
  box-shadow:0 4px 24px rgba(15,23,42,0.06);
`.replace(/\s+/g, " ");
